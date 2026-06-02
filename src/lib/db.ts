import path from "path";
import fs from "fs";
import { createClient as createTursoClient, type InArgs } from "@libsql/client";
import { logger } from "@/lib/logger";
import type {
  AgentResult,
  Lead,
  Appointment,
  ContentResult,
  Client,
} from "@/lib/agents/types";

// ============ DB CONNECTION ============

/** Whitelist of allowed table names to prevent SQL injection */
const ALLOWED_TABLES = new Set([
  "agent_results", "leads", "appointments", "content_library",
  "department_reports", "settings", "nurture_sequences",
  "nurture_steps", "clients",
]);

function validateTableName(table: string): void {
  if (!ALLOWED_TABLES.has(table)) {
    throw new Error(`Invalid table name: ${table}`);
  }
}

function getUrl(): string {
  return process.env.DATABASE_URL ?? "file:./data/marketai.db";
}

function getAuthToken(): string | undefined {
  return process.env.DATABASE_AUTH_TOKEN ?? undefined;
}

let _client: ReturnType<typeof createTursoClient> | null = null;
let _migrated: Promise<void> | null = null;

/** Track migration failures to allow retry */
let _migrationFailed = false;

async function migrate(client: ReturnType<typeof createTursoClient>): Promise<void> {
  await client.execute({
    sql: `CREATE TABLE IF NOT EXISTS agent_results (
      id TEXT PRIMARY KEY,
      agent_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed',
      output TEXT NOT NULL DEFAULT '',
      error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      metadata TEXT
    )`,
    args: [],
  });

  await client.execute({
    sql: `CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      company TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      phone TEXT,
      source TEXT NOT NULL DEFAULT 'manual',
      source_url TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      pipeline_stage TEXT NOT NULL DEFAULT 'sourced',
      score INTEGER NOT NULL DEFAULT 50,
      persona_type TEXT NOT NULL DEFAULT 'customer',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_contacted_at TEXT,
      next_follow_up TEXT
    )`,
    args: [],
  });

  await client.execute({
    sql: `CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      lead_name TEXT NOT NULL,
      lead_company TEXT NOT NULL DEFAULT '',
      date_time TEXT NOT NULL,
      duration INTEGER NOT NULL DEFAULT 30,
      type TEXT NOT NULL DEFAULT 'discovery',
      status TEXT NOT NULL DEFAULT 'scheduled',
      notes TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL DEFAULT 'AI Agent',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    args: [],
  });

  await client.execute({
    sql: `CREATE TABLE IF NOT EXISTS content_library (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      excerpt TEXT NOT NULL DEFAULT '',
      seo_keywords TEXT,
      content_type TEXT NOT NULL DEFAULT 'blog',
      estimated_read_time INTEGER,
      generated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    args: [],
  });

  await client.execute({
    sql: `CREATE TABLE IF NOT EXISTS department_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      department TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'operational',
      active_tasks INTEGER NOT NULL DEFAULT 0,
      completed_today INTEGER NOT NULL DEFAULT 0,
      performance INTEGER NOT NULL DEFAULT 85,
      issues TEXT,
      metrics TEXT,
      last_activity TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    args: [],
  });

  await client.execute({
    sql: `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`,
    args: [],
  });

  await client.execute({
    sql: `CREATE TABLE IF NOT EXISTS nurture_sequences (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      name TEXT NOT NULL,
      current_step INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      started_at TEXT NOT NULL,
      last_action_at TEXT,
      converted_at TEXT
    )`,
    args: [],
  });

  await client.execute({
    sql: `CREATE TABLE IF NOT EXISTS nurture_steps (
      id TEXT PRIMARY KEY,
      sequence_id TEXT NOT NULL,
      step_number INTEGER NOT NULL,
      type TEXT NOT NULL,
      subject TEXT,
      template TEXT NOT NULL DEFAULT '',
      delay_days INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      sent_at TEXT,
      response_at TEXT,
      notes TEXT
    )`,
    args: [],
  });

  // ============ CLIENTS TABLE (multi-tenant) ============
  await client.execute({
    sql: `CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL DEFAULT '',
      company TEXT NOT NULL DEFAULT '',
      logo_url TEXT,
      primary_color TEXT NOT NULL DEFAULT '#6366f1',
      is_active INTEGER NOT NULL DEFAULT 1,
      settings TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    args: [],
  });

  // Add client_id columns to existing tables (safe migration)
  try {
    await client.execute({ sql: `ALTER TABLE leads ADD COLUMN client_id TEXT NOT NULL DEFAULT 'default'`, args: [] });
  } catch {}
  try {
    await client.execute({ sql: `ALTER TABLE appointments ADD COLUMN client_id TEXT NOT NULL DEFAULT 'default'`, args: [] });
  } catch {}
  try {
    await client.execute({ sql: `ALTER TABLE settings ADD COLUMN client_id TEXT NOT NULL DEFAULT 'default'`, args: [] });
  } catch {}
  try {
    await client.execute({ sql: `ALTER TABLE agent_results ADD COLUMN client_id TEXT NOT NULL DEFAULT 'default'`, args: [] });
  } catch {}

  // Add temperature column to leads for cold/warm/hot classification
  try {
    await client.execute({ sql: `ALTER TABLE leads ADD COLUMN temperature TEXT DEFAULT 'cold'`, args: [] });
  } catch {}

  // Add country/region/language columns for international targeting
  try {
    await client.execute({ sql: `ALTER TABLE leads ADD COLUMN country TEXT DEFAULT ''`, args: [] });
  } catch {}
  try {
    await client.execute({ sql: `ALTER TABLE leads ADD COLUMN region TEXT DEFAULT ''`, args: [] });
  } catch {}
  try {
    await client.execute({ sql: `ALTER TABLE leads ADD COLUMN language TEXT DEFAULT ''`, args: [] });
  } catch {}

  // Seed default client if none exists
  const existingClient = await client.execute({
    sql: "SELECT COUNT(*) as count FROM clients",
    args: [],
  });
  const clientCount = Number((existingClient.rows[0] as Record<string, unknown>).count ?? 0);
  if (clientCount === 0) {
    await client.execute({
      sql: `INSERT INTO clients (id, name, slug, email, company, primary_color, is_active)
            VALUES ('default', 'My Business', 'default', 'admin@mybusiness.com', 'My Business', '#6366f1', 1)`,
      args: [],
    });
  }
}

function getDbClient() {
  if (!_client) {
    const url = getUrl();
    // For local file: URLs, ensure the directory exists
    if (url.startsWith("file:")) {
      const filePath = url.replace("file:", "");
      const resolved = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
      const dir = path.dirname(resolved);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    _client = createTursoClient({
      url,
      authToken: getAuthToken(),
    });

    _migrated = migrate(_client).catch((err) => {
      logger.error("db", "Migration failed", { error: String(err) });
      _migrationFailed = true;
      // Reset so next call retries migration
      _migrated = null;
      _client = null;
    });
  }
  return _client;
}

/** Ensure migrations have completed before running any query */
async function ensureMigrated(): Promise<void> {
  if (_migrationFailed) {
    // If migration previously failed, force re-initialization
    _migrated = null;
    _client = null;
    _migrationFailed = false;
  }
  if (_migrated) {
    await _migrated;
  }
}

// ============ GENERIC HELPERS ============

export async function dbGet<T>(table: string, id: string): Promise<T | null> {
  await ensureMigrated();
  validateTableName(table);
  const client = getDbClient();
  const result = await client.execute({
    sql: `SELECT * FROM ${table} WHERE id = ?`,
    args: [id],
  });
  if (result.rows.length === 0) return null;
  return hydrateRow<T>(table, result.rows[0] as Record<string, unknown>);
}

/** Only allow safe ORDER BY expressions (column name + optional ASC/DESC) */
function sanitizeOrderBy(orderBy: string): string {
  // Only allow: alphanumeric, underscores, spaces, commas, dots (for table.column), and ASC/DESC
  if (!/^[a-zA-Z_][a-zA-Z0-9_.,\s]*(ASC|DESC)?$/i.test(orderBy.replace(/\s/g, " "))) {
    return "created_at DESC";
  }
  return orderBy;
}

export async function dbList<T>(table: string, orderBy = "created_at DESC"): Promise<T[]> {
  await ensureMigrated();
  validateTableName(table);
  const client = getDbClient();
  const safeOrderBy = sanitizeOrderBy(orderBy);
  const result = await client.execute({
    sql: `SELECT * FROM ${table} ORDER BY ${safeOrderBy}`,
    args: [],
  });
  return result.rows.map((r) => hydrateRow<T>(table, r as Record<string, unknown>));
}

export async function dbInsert<T>(table: string, id: string, data: Record<string, unknown>): Promise<T> {
  await ensureMigrated();
  validateTableName(table);
  const client = getDbClient();
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map(() => "?").join(", ");
  await client.execute({
    sql: `INSERT OR REPLACE INTO ${table} (${keys.join(", ")}) VALUES (${placeholders})`,
    args: values as InArgs,
  });
  return (await dbGet<T>(table, id)) as T;
}

export async function dbUpdate<T>(table: string, id: string, updates: Record<string, unknown>): Promise<T | null> {
  await ensureMigrated();
  validateTableName(table);
  const client = getDbClient();
  const existing = await dbGet<Record<string, unknown>>(table, id);
  if (!existing) return null;
  const setClauses = Object.keys(updates).map((k) => `${k} = ?`).join(", ");
  const values = Object.values(updates);
  await client.execute({
    sql: `UPDATE ${table} SET ${setClauses} WHERE id = ?`,
    args: [...values, id] as InArgs,
  });
  return dbGet<T>(table, id);
}

export async function dbDelete(table: string, id: string): Promise<void> {
  await ensureMigrated();
  validateTableName(table);
  const client = getDbClient();
  await client.execute({
    sql: `DELETE FROM ${table} WHERE id = ?`,
    args: [id],
  });
}

export async function dbCount(table: string, where = "1=1"): Promise<number> {
  await ensureMigrated();
  validateTableName(table);
  const client = getDbClient();
  const result = await client.execute({
    sql: `SELECT COUNT(*) as count FROM ${table} WHERE ${where}`,
    args: [],
  });
  return Number((result.rows[0] as Record<string, unknown>).count ?? 0);
}

// ============ HYDRATION HELPERS ============

function hydrateRow<T>(_table: string, row: Record<string, unknown>): T {
  const map: Record<string, string> = {
    agent_type: "agentType",
    created_at: "createdAt",
    pipeline_stage: "pipelineStage",
    persona_type: "personaType",
    temperature: "temperature",
    source_url: "sourceUrl",
    last_contacted_at: "lastContactedAt",
    next_follow_up: "nextFollowUp",
    lead_id: "leadId",
    lead_name: "leadName",
    lead_company: "leadCompany",
    date_time: "dateTime",
    created_by: "createdBy",
    content_type: "contentType",
    estimated_read_time: "estimatedReadTime",
    seo_keywords: "seoKeywords",
  };

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(row)) {
    const newKey = map[key] || key;
    // Parse JSON fields
    if (["metadata", "issues", "metrics"].includes(key) && typeof val === "string") {
      try { result[newKey] = JSON.parse(val); } catch { result[newKey] = val; }
    } else {
      result[newKey] = val;
    }
  }

  // Parse dates
  for (const dateField of ["createdAt", "lastContactedAt", "nextFollowUp", "generatedAt", "dateTime", "lastActivity"]) {
    if (result[dateField] && typeof result[dateField] === "string") {
      result[dateField] = new Date(result[dateField] as string);
    }
  }

  return result as T;
}

// ============ SPECIFIC CRUD ============

export async function upsertLead(lead: Lead): Promise<Lead> {
  await ensureMigrated();
  return dbInsert<Lead>("leads", lead.id, {
    id: lead.id,
    name: lead.name,
    company: lead.company,
    role: lead.role,
    email: lead.email,
    phone: lead.phone ?? null,
    source: lead.source,
    source_url: lead.sourceUrl ?? null,
    status: lead.status,
    pipeline_stage: lead.pipelineStage,
    temperature: lead.temperature ?? 'cold',
    score: lead.score,
    persona_type: lead.personaType,
    notes: lead.notes,
    created_at: lead.createdAt?.toISOString() ?? new Date().toISOString(),
    last_contacted_at: lead.lastContactedAt?.toISOString() ?? null,
    next_follow_up: lead.nextFollowUp?.toISOString() ?? null,
    country: lead.country ?? '',
    region: lead.region ?? '',
    language: lead.language ?? '',
  });
}

export async function upsertAppointment(appointment: Appointment): Promise<Appointment> {
  await ensureMigrated();
  return dbInsert<Appointment>("appointments", appointment.id, {
    id: appointment.id,
    lead_id: appointment.leadId,
    lead_name: appointment.leadName,
    lead_company: appointment.leadCompany,
    date_time: appointment.dateTime?.toISOString() ?? new Date().toISOString(),
    duration: appointment.duration,
    type: appointment.type,
    status: appointment.status,
    notes: appointment.notes,
    created_by: appointment.createdBy,
  });
}

export async function upsertContent(content: ContentResult): Promise<void> {
  await ensureMigrated();
  const client = getDbClient();
  await client.execute({
    sql: `INSERT INTO content_library (title, body, excerpt, seo_keywords, content_type, estimated_read_time, generated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      content.title,
      content.body,
      content.excerpt,
      JSON.stringify(content.seoKeywords ?? []),
      content.contentType,
      content.estimatedReadTime ?? null,
      content.generatedAt?.toISOString() ?? new Date().toISOString(),
    ],
  });
}

export async function listContent(): Promise<ContentResult[]> {
  await ensureMigrated();
  const client = getDbClient();
  const result = await client.execute({
    sql: "SELECT * FROM content_library ORDER BY generated_at DESC",
    args: [],
  });
  return result.rows.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      title: row.title as string,
      body: row.body as string,
      excerpt: row.excerpt as string,
      seoKeywords: (() => { try { return JSON.parse(row.seo_keywords as string); } catch { return []; } })(),
      contentType: row.content_type as ContentResult["contentType"],
      estimatedReadTime: row.estimated_read_time as number | undefined,
      generatedAt: new Date(row.generated_at as string),
    } as ContentResult;
  });
}

export async function upsertResult(result: AgentResult): Promise<void> {
  await ensureMigrated();
  await dbInsert<AgentResult>("agent_results", result.id, {
    id: result.id,
    agent_type: result.agentType,
    status: result.status,
    output: result.output,
    error: result.error ?? null,
    created_at: result.createdAt?.toISOString() ?? new Date().toISOString(),
    metadata: result.metadata ? JSON.stringify(result.metadata) : null,
  });
}

export async function getRecentResults(count = 20): Promise<AgentResult[]> {
  await ensureMigrated();
  const client = getDbClient();
  const result = await client.execute({
    sql: "SELECT * FROM agent_results ORDER BY created_at DESC LIMIT ?",
    args: [count],
  });
  return result.rows.map((r) => hydrateRow<AgentResult>("agent_results", r as Record<string, unknown>));
}

// ============ SEED DATA ============

export async function seedIfEmpty(): Promise<void> {
  await ensureMigrated();
  const client = getDbClient();
  const countResult = await client.execute({
    sql: "SELECT COUNT(*) as count FROM leads",
    args: [],
  });
  const count = Number((countResult.rows[0] as Record<string, unknown>).count ?? 0);
  if (count > 0) return;

  const now = new Date();
  const demoLeads: Lead[] = [
    {
      id: crypto.randomUUID(), name: "Sarah Mitchell", company: "Yoga Bliss Studio",
      role: "Wellness Seeker - Chronic Stress", email: "sarah@yogabliss.com",
      phone: "+1 (555) 123-4567", status: "qualified", score: 85,
      personaType: "customer", source: "manual", pipelineStage: "sourced",
      notes: "Interested in stress reduction solutions. Open to holistic technology approaches.",
      createdAt: now,
    },
    {
      id: crypto.randomUUID(), name: "Dr. James Chen", company: "Holistic Health Associates",
      role: "Acupuncturist / Practitioner", email: "james@holistichealth.com",
      status: "appointment_scheduled", score: 92, personaType: "practitioner",
      source: "manual", pipelineStage: "sourced",
      notes: "Doctor interested in adding complementary technology to practice. Wants a demo.",
      createdAt: now,
    },
    {
      id: crypto.randomUUID(), name: "Mike Torres", company: "Biohack Labs",
      role: "Biohacker / Optimization", email: "mike@biohacklabs.io",
      phone: "+1 (555) 987-6543", status: "new", score: 72,
      personaType: "customer", source: "manual", pipelineStage: "sourced",
      notes: "Biohacker with full supplement stack. Interested in cutting-edge wellness tech.",
      createdAt: now,
    },
    {
      id: crypto.randomUUID(), name: "Lisa Reynolds", company: "Self-employed",
      role: "Business Builder", email: "lisa.reynolds@gmail.com",
      status: "contacted", score: 78, personaType: "customer",
      source: "manual", pipelineStage: "contacted",
      notes: "Network marketing experience. Looking for a wellness business opportunity.",
      createdAt: now,
    },
    {
      id: crypto.randomUUID(), name: "Amanda Foster", company: "Foster Family Wellness",
      role: "Wellness Seeker - Sleep Issues", email: "amanda@fosterwellness.com",
      phone: "+1 (555) 234-5678", status: "new", score: 65,
      personaType: "customer", source: "manual", pipelineStage: "sourced",
      notes: "Chronic insomnia. Looking for natural, non-pharmaceutical solutions.",
      createdAt: now,
    },
    {
      id: crypto.randomUUID(), name: "David Park", company: "Peak Performance Coaching",
      role: "Biohacker / Life Coach", email: "david@peakcoaching.com",
      status: "qualified", score: 88, personaType: "customer",
      source: "manual", pipelineStage: "sourced",
      notes: "Life coach for executives. Interested in mental clarity and focus technology.",
      createdAt: now,
    },
  ];

  for (const lead of demoLeads) {
    await upsertLead(lead);
  }

  if (demoLeads[1]) {
    await upsertAppointment({
      id: crypto.randomUUID(), leadId: demoLeads[1].id,
      leadName: "Dr. James Chen", leadCompany: "Holistic Health Associates",
      dateTime: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      duration: 45, type: "demo", status: "scheduled",
      notes: "Product demo for practitioner. Prepare full overview.",
      createdBy: "AI Sales Team",
    });
  }
  if (demoLeads[0]) {
    await upsertAppointment({
      id: crypto.randomUUID(), leadId: demoLeads[0].id,
      leadName: "Sarah Mitchell", leadCompany: "Yoga Bliss Studio",
      dateTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      duration: 30, type: "discovery", status: "scheduled",
      notes: "Free consultation. Focus on stress reduction programs.",
      createdBy: "AI Sales Team",
    });
  }

  const demoContent: ContentResult[] = [
    {
      title: "5 Natural Ways to Manage Stress Without Medication",
      body: "# 5 Natural Ways to Manage Stress Without Medication\n\nStress has become an epidemic in modern life...\n\n## 1. Mindful Meditation\nRegular meditation practice has been shown to reduce cortisol levels...\n\n## 2. Regular Exercise\nPhysical activity releases endorphins and helps regulate stress hormones.\n\n## 3. Quality Sleep\nPrioritizing sleep hygiene can dramatically improve your body's ability to handle stress.\n\n## 4. Nutritional Support\nA balanced diet rich in magnesium, B-vitamins, and omega-3s supports your nervous system.\n\n## 5. Natural Therapies\nExplore holistic approaches like frequency technology, acupuncture, and breathwork.\n\nReady to explore natural wellness solutions? Book a free consultation today.",
      excerpt: "Discover natural, non-invasive approaches to managing daily stress including meditation, lifestyle changes, and holistic therapies.",
      seoKeywords: ["natural stress relief", "holistic stress management", "wellness"],
      contentType: "blog", estimatedReadTime: 5, generatedAt: now,
    },
    {
      title: "What Is Frequency Therapy? A Beginner's Guide",
      body: "# What Is Frequency Therapy? A Beginner's Guide\n\nIf you've been exploring holistic wellness options...",
      excerpt: "Learn how personalized microcurrent frequency technology works and how it can support your body's natural balance.",
      seoKeywords: ["frequency therapy", "microcurrent", "bioenergetic wellness"],
      contentType: "blog", estimatedReadTime: 7, generatedAt: now,
    },
  ];
  for (const c of demoContent) {
    await upsertContent(c);
  }

  const deptReports = [
    { department: "Executive Office", status: "operational", activeTasks: 2, completedToday: 3, performance: 92, issues: "[]", metrics: JSON.stringify({ activeStrategies: 2, departmentsManaged: 5 }) },
    { department: "Finance Department", status: "operational", activeTasks: 1, completedToday: 4, performance: 88, issues: "[]", metrics: JSON.stringify({ budgetUtilized: "67%", avgCPL: "$8.50" }) },
    { department: "Data & Research", status: "operational", activeTasks: 3, completedToday: 6, performance: 85, issues: "[]", metrics: JSON.stringify({ leadsDiscovered: 24, sourcesScanned: 8 }) },
    { department: "Creative Studio", status: "operational", activeTasks: 2, completedToday: 2, performance: 78, issues: "[]", metrics: JSON.stringify({ conceptsCreated: 6, inProduction: 2 }) },
    { department: "Sales Development", status: "busy", activeTasks: 4, completedToday: 8, performance: 91, issues: "[]", metrics: JSON.stringify({ qualifiedToday: 5, appointmentsBooked: 2 }) },
  ];
  for (const d of deptReports) {
    await client.execute({
      sql: `INSERT OR REPLACE INTO department_reports (department, status, active_tasks, completed_today, performance, issues, metrics)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [d.department, d.status, d.activeTasks, d.completedToday, d.performance, d.issues, d.metrics],
    });
  }
}

export async function getDepartmentReports(): Promise<Array<{ department: string; status: string; activeTasks: number; completedToday: number; performance: number; issues: string[]; lastActivity: Date; metrics: Record<string, unknown> }>> {
  await ensureMigrated();
  const client = getDbClient();
  const result = await client.execute({
    sql: "SELECT * FROM department_reports ORDER BY department",
    args: [],
  });
  return result.rows.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      department: row.department as string,
      status: row.status as string,
      activeTasks: row.active_tasks as number,
      completedToday: row.completed_today as number,
      performance: row.performance as number,
      issues: (() => { try { return JSON.parse(row.issues as string); } catch { return []; } })(),
      lastActivity: new Date(row.last_activity as string),
      metrics: (() => { try { return JSON.parse(row.metrics as string); } catch { return {}; } })(),
    };
  });
}

export async function incrementDepartmentCompleted(department: string): Promise<void> {
  await ensureMigrated();
  const client = getDbClient();
  await client.execute({
    sql: `UPDATE department_reports SET completed_today = completed_today + 1, last_activity = datetime('now') WHERE department = ?`,
    args: [department],
  });
}

export async function getSetting(key: string): Promise<string | undefined> {
  await ensureMigrated();
  const client = getDbClient();
  const result = await client.execute({
    sql: "SELECT value FROM settings WHERE key = ?",
    args: [key],
  });
  const row = result.rows[0] as Record<string, unknown> | undefined;
  return row?.value as string | undefined;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await ensureMigrated();
  const client = getDbClient();
  await client.execute({
    sql: "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
    args: [key, value],
  });
}

// ============ CLIENTS CRUD (multi-tenant) ============

export async function listClients(): Promise<Client[]> {
  await ensureMigrated();
  const client = getDbClient();
  const result = await client.execute({
    sql: "SELECT * FROM clients ORDER BY created_at DESC",
    args: [],
  });
  return result.rows.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: row.id as string,
      name: row.name as string,
      slug: row.slug as string,
      email: row.email as string,
      company: row.company as string,
      logoUrl: row.logo_url as string | undefined,
      primaryColor: row.primary_color as string,
      isActive: (row.is_active as number) === 1,
      settings: (() => { try { return JSON.parse(row.settings as string); } catch { return undefined; } })(),
      createdAt: new Date(row.created_at as string),
    } as Client;
  });
}

export async function getClient(id: string): Promise<Client | null> {
  await ensureMigrated();
  const client = getDbClient();
  const result = await client.execute({
    sql: "SELECT * FROM clients WHERE id = ?",
    args: [id],
  });
  if (result.rows.length === 0) return null;
  const row = result.rows[0] as Record<string, unknown>;
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    email: row.email as string,
    company: row.company as string,
    logoUrl: row.logo_url as string | undefined,
    primaryColor: row.primary_color as string,
    isActive: (row.is_active as number) === 1,
    settings: (() => { try { return JSON.parse(row.settings as string); } catch { return undefined; } })(),
    createdAt: new Date(row.created_at as string),
  } as Client;
}

export async function getClientBySlug(slug: string): Promise<Client | null> {
  await ensureMigrated();
  const client = getDbClient();
  const result = await client.execute({
    sql: "SELECT * FROM clients WHERE slug = ?",
    args: [slug],
  });
  if (result.rows.length === 0) return null;
  const row = result.rows[0] as Record<string, unknown>;
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    email: row.email as string,
    company: row.company as string,
    logoUrl: row.logo_url as string | undefined,
    primaryColor: row.primary_color as string,
    isActive: (row.is_active as number) === 1,
    settings: (() => { try { return JSON.parse(row.settings as string); } catch { return undefined; } })(),
    createdAt: new Date(row.created_at as string),
  } as Client;
}

export async function createClient(data: {
  name: string;
  slug: string;
  email?: string;
  company?: string;
  primaryColor?: string;
}): Promise<Client> {
  await ensureMigrated();
  const client = getDbClient();
  const id = crypto.randomUUID();
  await client.execute({
    sql: `INSERT INTO clients (id, name, slug, email, company, primary_color, is_active)
          VALUES (?, ?, ?, ?, ?, ?, 1)`,
    args: [
      id,
      data.name,
      data.slug,
      data.email ?? '',
      data.company ?? '',
      data.primaryColor ?? '#6366f1',
    ],
  });
  const created = await getClient(id);
  return created as Client;
}

export async function updateClient(id: string, updates: Partial<{
  name: string;
  slug: string;
  email: string;
  company: string;
  logoUrl: string;
  primaryColor: string;
  isActive: boolean;
}>): Promise<Client | null> {
  await ensureMigrated();
  const existing = await getClient(id);
  if (!existing) return null;
  const client = getDbClient();
  
  const setClauses: string[] = [];
  const values: unknown[] = [];
  
  if (updates.name !== undefined) { setClauses.push("name = ?"); values.push(updates.name); }
  if (updates.slug !== undefined) { setClauses.push("slug = ?"); values.push(updates.slug); }
  if (updates.email !== undefined) { setClauses.push("email = ?"); values.push(updates.email); }
  if (updates.company !== undefined) { setClauses.push("company = ?"); values.push(updates.company); }
  if (updates.logoUrl !== undefined) { setClauses.push("logo_url = ?"); values.push(updates.logoUrl); }
  if (updates.primaryColor !== undefined) { setClauses.push("primary_color = ?"); values.push(updates.primaryColor); }
  if (updates.isActive !== undefined) { setClauses.push("is_active = ?"); values.push(updates.isActive ? 1 : 0); }
  
  if (setClauses.length === 0) return existing;
  
  await client.execute({
    sql: `UPDATE clients SET ${setClauses.join(", ")} WHERE id = ?`,
    args: [...values, id] as InArgs,
  });
  return getClient(id);
}

export async function deleteClient(id: string): Promise<void> {
  await ensureMigrated();
  const client = getDbClient();
  await client.execute({ sql: "DELETE FROM clients WHERE id = ?", args: [id] });
}

export async function getClientLeads(clientId: string): Promise<Lead[]> {
  await ensureMigrated();
  const client = getDbClient();
  const result = await client.execute({
    sql: "SELECT * FROM leads WHERE client_id = ? ORDER BY created_at DESC",
    args: [clientId],
  });
  return result.rows.map((r) => hydrateRow<Lead>("leads", r as Record<string, unknown>));
}

export async function getClientAppointments(clientId: string): Promise<Appointment[]> {
  await ensureMigrated();
  const client = getDbClient();
  const result = await client.execute({
    sql: "SELECT * FROM appointments WHERE client_id = ? ORDER BY date_time DESC",
    args: [clientId],
  });
  return result.rows.map((r) => hydrateRow<Appointment>("appointments", r as Record<string, unknown>));
}

export async function getClientMetrics(clientId: string): Promise<{
  totalLeads: number;
  appointmentsScheduled: number;
  appointmentsCompleted: number;
}> {
  await ensureMigrated();
  const client = getDbClient();
  
  const leadCount = await client.execute({
    sql: "SELECT COUNT(*) as count FROM leads WHERE client_id = ?",
    args: [clientId],
  });
  const apptScheduled = await client.execute({
    sql: "SELECT COUNT(*) as count FROM appointments WHERE client_id = ? AND status = 'scheduled'",
    args: [clientId],
  });
  const apptCompleted = await client.execute({
    sql: "SELECT COUNT(*) as count FROM appointments WHERE client_id = ? AND status = 'completed'",
    args: [clientId],
  });
  return {
    totalLeads: Number((leadCount.rows[0] as Record<string, unknown>).count ?? 0),
    appointmentsScheduled: Number((apptScheduled.rows[0] as Record<string, unknown>).count ?? 0),
    appointmentsCompleted: Number((apptCompleted.rows[0] as Record<string, unknown>).count ?? 0),
  };
}

// ============ NURTURE SEQUENCES (DB-backed) ============

export async function saveSequence(seq: {
  id: string;
  leadId: string;
  name: string;
  currentStep: number;
  status: string;
  startedAt: Date;
  lastActionAt?: Date;
  convertedAt?: Date;
  steps: {
    id: string;
    sequenceId: string;
    stepNumber: number;
    type: string;
    subject?: string;
    template: string;
    delayDays: number;
    status: string;
    sentAt?: Date;
    responseAt?: Date;
    notes?: string;
  }[];
}): Promise<void> {
  await ensureMigrated();
  const client = getDbClient();

  await client.execute({
    sql: `INSERT OR REPLACE INTO nurture_sequences (id, lead_id, name, current_step, status, started_at, last_action_at, converted_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      seq.id,
      seq.leadId,
      seq.name,
      seq.currentStep,
      seq.status,
      seq.startedAt.toISOString(),
      seq.lastActionAt?.toISOString() ?? null,
      seq.convertedAt?.toISOString() ?? null,
    ],
  });

  for (const step of seq.steps) {
    await client.execute({
      sql: `INSERT OR REPLACE INTO nurture_steps (id, sequence_id, step_number, type, subject, template, delay_days, status, sent_at, response_at, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        step.id,
        step.sequenceId,
        step.stepNumber,
        step.type,
        step.subject ?? null,
        step.template,
        step.delayDays,
        step.status,
        step.sentAt?.toISOString() ?? null,
        step.responseAt?.toISOString() ?? null,
        step.notes ?? null,
      ],
    });
  }
}

export async function loadSequence(id: string): Promise<{
  id: string;
  leadId: string;
  name: string;
  currentStep: number;
  status: string;
  startedAt: Date;
  lastActionAt?: Date;
  convertedAt?: Date;
  steps: {
    id: string;
    sequenceId: string;
    stepNumber: number;
    type: string;
    subject?: string;
    template: string;
    delayDays: number;
    status: string;
    sentAt?: Date;
    responseAt?: Date;
    notes?: string;
  }[];
} | null> {
  await ensureMigrated();
  const client = getDbClient();

  const seqResult = await client.execute({
    sql: "SELECT * FROM nurture_sequences WHERE id = ?",
    args: [id],
  });
  if (seqResult.rows.length === 0) return null;

  const row = seqResult.rows[0] as Record<string, unknown>;

  const stepsResult = await client.execute({
    sql: "SELECT * FROM nurture_steps WHERE sequence_id = ? ORDER BY step_number",
    args: [id],
  });

  const steps = stepsResult.rows.map((s) => {
    const sr = s as Record<string, unknown>;
    return {
      id: sr.id as string,
      sequenceId: sr.sequence_id as string,
      stepNumber: sr.step_number as number,
      type: sr.type as string,
      subject: sr.subject as string | undefined,
      template: sr.template as string,
      delayDays: sr.delay_days as number,
      status: sr.status as string,
      sentAt: sr.sent_at ? new Date(sr.sent_at as string) : undefined,
      responseAt: sr.response_at ? new Date(sr.response_at as string) : undefined,
      notes: sr.notes as string | undefined,
    };
  });

  return {
    id: row.id as string,
    leadId: row.lead_id as string,
    name: row.name as string,
    currentStep: row.current_step as number,
    status: row.status as string,
    startedAt: new Date(row.started_at as string),
    lastActionAt: row.last_action_at ? new Date(row.last_action_at as string) : undefined,
    convertedAt: row.converted_at ? new Date(row.converted_at as string) : undefined,
    steps,
  };
}

export async function loadSequencesByLead(leadId: string): Promise<string[]> {
  await ensureMigrated();
  const client = getDbClient();
  const result = await client.execute({
    sql: "SELECT id FROM nurture_sequences WHERE lead_id = ? ORDER BY started_at DESC",
    args: [leadId],
  });
  return result.rows.map((r) => (r as Record<string, unknown>).id as string);
}

export async function loadAllSequenceIds(): Promise<string[]> {
  await ensureMigrated();
  const client = getDbClient();
  const result = await client.execute({
    sql: "SELECT id FROM nurture_sequences ORDER BY started_at DESC",
    args: [],
  });
  return result.rows.map((r) => (r as Record<string, unknown>).id as string);
}

export async function deleteSequence(id: string): Promise<void> {
  await ensureMigrated();
  const client = getDbClient();
  await client.execute({ sql: "DELETE FROM nurture_steps WHERE sequence_id = ?", args: [id] });
  await client.execute({ sql: "DELETE FROM nurture_sequences WHERE id = ?", args: [id] });
}

// ============ CLEAR DATA ============

export async function clearAllData(): Promise<void> {
  await ensureMigrated();
  const client = getDbClient();
  // Delete in dependency-safe order (child tables first, then parents)
  await client.execute({ sql: "DELETE FROM nurture_steps", args: [] });
  await client.execute({ sql: "DELETE FROM nurture_sequences", args: [] });
  await client.execute({ sql: "DELETE FROM appointments", args: [] });
  await client.execute({ sql: "DELETE FROM agent_results", args: [] });
  await client.execute({ sql: "DELETE FROM leads", args: [] });
}

export async function countActiveSequences(): Promise<number> {
  await ensureMigrated();
  const client = getDbClient();
  const result = await client.execute({
    sql: "SELECT COUNT(*) as count FROM nurture_sequences WHERE status = 'active'",
    args: [],
  });
  return Number((result.rows[0] as Record<string, unknown>).count ?? 0);
}


