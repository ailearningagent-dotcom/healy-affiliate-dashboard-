import { BaseAgent } from "./base-agent";
import { ContentAgent } from "./content-agent";
import { ResearchAgent } from "./research-agent";
import { OutreachAgent } from "./outreach-agent";
import { SalesAgent } from "./sales-agent";
import { ScraperAgent } from "./scraper-agent";
import type {
  AgentConfig,
  AgentResult,
  AgentType,
  AgentStatus,
  DashboardMetrics,
  Lead,
  Appointment,
  ActivityItem,
  ContentResult,
} from "./types";
import {
  seedIfEmpty,
  upsertLead,
  upsertAppointment,
  upsertContent,
  upsertResult,
  getRecentResults,
  listContent,
  dbGet,
  dbList,
  dbCount,
  dbUpdate,
} from "@/lib/db";
import { estimateCost } from "@/lib/llm/call-llm";

const DEFAULT_CONFIGS: Record<AgentType, AgentConfig> = {
  content: {
    type: "content",
    name: "AI Content Creator",
    description: "Create blog posts, social content, nurture emails, and landing pages for your business",
    model: "gemini-2.0-flash",
    temperature: 0.7,
    maxTokens: 2048,
    provider: "gemini",
  },
  research: {
    type: "research",
    name: "Prospect Researcher",
    description: "Research and analyze prospects for fit and partnership potential",
    model: "gemini-2.0-flash",
    temperature: 0.4,
    maxTokens: 2048,
    provider: "gemini",
  },
  outreach: {
    type: "outreach",
    name: "Consultation Booker",
    description: "Generate personalized outreach messages, qualify leads, and schedule appointments",
    model: "gemini-2.0-flash",
    temperature: 0.6,
    maxTokens: 2048,
    provider: "gemini",
  },
  scraper: {
    type: "scraper",
    name: "Lead Scraper",
    description: "Scrape directories and sources for high-quality prospect leads",
    model: "gemini-2.0-flash",
    temperature: 0.3,
    maxTokens: 2048,
    provider: "gemini",
  },
  sales: {
    type: "sales",
    name: "AI Sales Team",
    description: "Lead qualification, message personalization, appointment scheduling, follow-up cadences",
    model: "gemini-2.0-flash",
    temperature: 0.5,
    maxTokens: 2048,
    provider: "gemini",
  },
};

export class AgentManager {
  private agents: Map<AgentType, BaseAgent> = new Map();
  private status: Map<AgentType, AgentStatus> = new Map();
  private seeded = false;

  constructor() {
    this.initializeAgents();
  }

  /** Ensure DB is seeded exactly once */
  private async ensureSeeded(): Promise<void> {
    if (!this.seeded) {
      await seedIfEmpty();
      this.seeded = true;
    }
  }

  private initializeAgents(): void {
    this.registerAgent("content", new ContentAgent(DEFAULT_CONFIGS.content));
    this.registerAgent("research", new ResearchAgent(DEFAULT_CONFIGS.research));
    this.registerAgent("outreach", new OutreachAgent(DEFAULT_CONFIGS.outreach));
    this.registerAgent("sales", new SalesAgent(DEFAULT_CONFIGS.sales));
    this.registerAgent("scraper", new ScraperAgent(DEFAULT_CONFIGS.scraper));
  }

  private registerAgent(type: AgentType, agent: BaseAgent): void {
    this.agents.set(type, agent);
    this.status.set(type, "idle");
  }

  getAgent(type: AgentType): BaseAgent | undefined {
    return this.agents.get(type);
  }

  getAgentStatus(type: AgentType): AgentStatus {
    return this.status.get(type) ?? "idle";
  }

  getAgentConfig(type: AgentType): AgentConfig | undefined {
    return DEFAULT_CONFIGS[type];
  }

  getAllAgents(): { config: AgentConfig; status: AgentStatus }[] {
    return Object.values(DEFAULT_CONFIGS).map((config) => ({
      config,
      status: this.status.get(config.type) ?? "idle",
    }));
  }

  // Department teams removed — only core agents remain

  async executeAgent(
    type: AgentType,
    input: string,
    context?: Record<string, unknown>
  ): Promise<AgentResult> {
    await this.ensureSeeded();
    const agent = this.agents.get(type);
    if (!agent) {
      return {
        id: crypto.randomUUID(),
        agentType: type,
        status: "error",
        output: "",
        error: `Agent type '${type}' not found`,
        createdAt: new Date(),
      };
    }

    this.status.set(type, "running");
    try {
      const result = await agent.execute(input, context);
      this.status.set(type, result.status);

      // Track estimated cost
      const config = DEFAULT_CONFIGS[type];
      if (result.output && config) {
        const usage = estimateCost(result.output, config.model, config.provider ?? "openai");
        result.metadata = {
          ...result.metadata,
          cost: usage.totalCost,
          model: usage.model,
          provider: usage.provider,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
        };
      }

      // Persist result to DB
      await upsertResult(result);

      // Store content results for the library
      if (type === "content" && result.status === "completed") {
        try {
          const content = JSON.parse(result.output) as ContentResult;
          await upsertContent(content);
        } catch {
          // Ignore parsing errors
        }
      }

      return result;
    } catch (error) {
      this.status.set(type, "error");
      const errorResult: AgentResult = {
        id: crypto.randomUUID(),
        agentType: type,
        status: "error",
        output: "",
        error: error instanceof Error ? error.message : "Unknown error",
        createdAt: new Date(),
      };
      await upsertResult(errorResult);
      return errorResult;
    }
  }

  // ============ LEAD MANAGEMENT (DB-backed) ============

  async addLead(lead: Omit<Lead, "id" | "createdAt">): Promise<Lead> {
    await this.ensureSeeded();
    const newLead: Lead = {
      ...lead,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    return upsertLead(newLead);
  }

  async updateLead(id: string, updates: Partial<Lead>): Promise<Lead | null> {
    await this.ensureSeeded();
    return dbUpdate<Lead>("leads", id, updates);
  }

  async getLeads(): Promise<Lead[]> {
    await this.ensureSeeded();
    return dbList<Lead>("leads");
  }

  async getLead(id: string): Promise<Lead | null> {
    await this.ensureSeeded();
    return dbGet<Lead>("leads", id);
  }

  // ============ APPOINTMENT MANAGEMENT (DB-backed) ============

  async addAppointment(appointment: Omit<Appointment, "id">): Promise<Appointment> {
    await this.ensureSeeded();
    const newAppointment: Appointment = {
      ...appointment,
      id: crypto.randomUUID(),
    };
    return upsertAppointment(newAppointment);
  }

  async updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment | null> {
    await this.ensureSeeded();
    return dbUpdate<Appointment>("appointments", id, updates);
  }

  async getAppointments(): Promise<Appointment[]> {
    await this.ensureSeeded();
    return dbList<Appointment>("appointments");
  }

  // ============ CONTENT MANAGEMENT (DB-backed) ============

  async getContentLibrary(): Promise<ContentResult[]> {
    await this.ensureSeeded();
    return listContent();
  }

  // ============ RESULTS HISTORY (DB-backed) ============

  async getRecentResults(count: number = 10): Promise<AgentResult[]> {
    await this.ensureSeeded();
    return getRecentResults(count);
  }

  async getResultsByType(type: AgentType): Promise<AgentResult[]> {
    await this.ensureSeeded();
    const results = await getRecentResults(100);
    return results.filter((r) => r.agentType === type);
  }

  // ============ DASHBOARD (DB-backed) ============

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    await this.ensureSeeded();
    const leadsList = await dbList<Lead>("leads");
    const appointmentsList = await dbList<Appointment>("appointments");
    const contentCount = await dbCount("content_library");
    const recentResultsList = await getRecentResults(30);

    const recentActivity: ActivityItem[] = recentResultsList.slice(0, 30).map((result) => {
      const typeLabelMap: Record<string, string> = {
        content: "Content", research: "Research", outreach: "Outreach",
        sales: "Sales", scraper: "Scraper",
      };
      const typeLabel = typeLabelMap[result.agentType] ?? result.agentType;
      const status = result.status === "completed" ? "Completed" : "Failed";
      const metadata = result.metadata ?? {};
      const descSuffix =
        (metadata.topic as string) ??
        (metadata.targetName as string) ??
        (metadata.leadName as string) ??
        (metadata.goal as string) ??
        (metadata.label as string) ??
        (metadata.campaignName as string) ??
        typeLabel;

      return {
        id: result.id,
        type: result.agentType as ActivityItem["type"],
        description: `${typeLabel} ${status}: ${descSuffix}`,
        timestamp: result.createdAt,
        status: result.status,
      };
    });

    const qualifiedLeads = leadsList.filter(
      (l) => l.status === "qualified" || l.status === "appointment_scheduled"
    );
    const appointmentLeads = leadsList.filter((l) => l.status === "appointment_scheduled");

    // Temperature breakdown
    const coldLeads = leadsList.filter((l) => (l.temperature ?? "cold") === "cold").length;
    const warmLeads = leadsList.filter((l) => l.temperature === "warm").length;
    const hotLeads = leadsList.filter((l) => l.temperature === "hot").length;

    return {
      totalLeads: leadsList.length,
      qualifiedLeads: qualifiedLeads.length,
      appointmentsScheduled: appointmentsList.filter((a) => a.status === "scheduled").length,
      appointmentsCompleted: appointmentsList.filter((a) => a.status === "completed").length,
      contentGenerated: contentCount,
      outreachSent: recentResultsList.filter((r) => r.agentType === "outreach" || r.agentType === "sales").length,
      leadsSourcedThisWeek: recentResultsList.filter((r) => r.agentType === "scraper" || r.agentType === "research").length,
      activeNurtureSequences: 0,
      coldLeads,
      warmLeads,
      hotLeads,
      conversionRate: leadsList.length > 0
        ? Math.round((appointmentLeads.length / leadsList.length) * 100)
        : 0,
      recentActivity: recentActivity.slice(0, 10),
    };
  }
}

// Singleton instance (agents are stateless — only the DB has state)
let managerInstance: AgentManager | null = null;

export function getAgentManager(): AgentManager {
  if (!managerInstance) {
    managerInstance = new AgentManager();
  }
  return managerInstance;
}
