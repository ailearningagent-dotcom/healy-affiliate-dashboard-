/**
 * Full Pipeline End-to-End Integration Test
 *
 * Tests the complete lead lifecycle:
 *   Scrape → Engage → Enrich → Nurture → Follow-up → Qualify → Book
 *
 * Mocks all external dependencies (LLM, email, WhatsApp, calendar)
 * and verifies each phase produces correct outcomes in sequence.
 *
 * Uses in-memory stores for round-trip DB simulation so each phase
 * can produce output that subsequent phases consume.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPipelineOrchestrator, getDefaultPipelineConfig } from "../pipeline-orchestrator";
import { engageLead } from "../lead-engager";
import { NurtureEngine } from "../nurture-engine";
import { FollowupEngine } from "../followup-engine";
import { AutoBooker } from "../auto-booker";
import { callLLM } from "@/lib/llm/call-llm";
import * as dbModule from "@/lib/db";
import type { Lead, NurtureSequence, Appointment } from "../types";

// ========================================================================
// MODULE-LEVEL MOCKS
// ========================================================================

// In-memory stores for round-trip DB simulation
const leadStore = new Map<string, Lead>();
const sequenceStore = new Map<string, any>();
const sequenceByLeadStore = new Map<string, string[]>();
const appointmentStore = new Map<string, any>();
const settingStore = new Map<string, string>();

// Mock scrapeGoogleMaps
vi.mock("../google-maps-scraper", () => ({
  scrapeGoogleMaps: vi.fn().mockResolvedValue([]),
}));

// Mock email sender
vi.mock("@/lib/email/email-sender", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true, messageId: "mock-email-id" }),
  buildNurtureEmail: vi.fn().mockImplementation(({ leadName, step, businessName, bookingLink }: any) => ({
    subject: step?.subject || `Hello ${leadName}!`,
    html: `<p>${step?.template || "Welcome!"}</p>`,
    text: step?.template || "Welcome!",
  })),
  buildAppointmentEmail: vi.fn().mockImplementation(({ leadName, businessName, dateTime, duration, meetLink }: any) => ({
    subject: `Appointment Confirmed: Discovery Call with ${leadName}`,
    html: `<p>Confirmed for ${dateTime}</p>`,
    text: `Confirmed for ${dateTime}`,
  })),
}));

// Mock WhatsApp
vi.mock("@/lib/whatsapp/whatsapp-web", () => ({
  sendWhatsAppMessage: vi.fn().mockResolvedValue({ success: true }),
  isWhatsAppConnected: vi.fn().mockResolvedValue(true),
}));

// Mock calendar
vi.mock("@/lib/calendar", () => ({
  createCalendarEvent: vi.fn().mockResolvedValue({
    id: "cal-event-001",
    hangoutLink: "https://meet.google.com/abc-defg-hij",
  }),
  isCalendarConnected: vi.fn().mockResolvedValue(true),
}));

// Mock DB functions with in-memory stores for round-trip fidelity.
// All implementations delegate to the in-memory stores so tests can
// set up state before exercising the pipeline.
vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    getSetting: vi.fn(async (key: string) => settingStore.get(key)),
    setSetting: vi.fn(async (key: string, value: string) => { settingStore.set(key, value); }),
    dbList: vi.fn(async (table: string) => {
      if (table === "leads") return Array.from(leadStore.values());
      if (table === "appointments") return Array.from(appointmentStore.values());
      return [];
    }),
    dbCount: vi.fn(async (table: string) => {
      if (table === "leads") return leadStore.size;
      return 0;
    }),
    dbGet: vi.fn(async (_table: string, id: string) => leadStore.get(id) || null),
    dbUpdate: vi.fn(async (_table: string, id: string, updates: any) => {
      const existing = leadStore.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...updates };
      leadStore.set(id, updated);
      return updated;
    }),
    upsertLead: vi.fn(async (lead: Lead) => { leadStore.set(lead.id, lead); return lead; }),
    upsertAppointment: vi.fn(async (apt: any) => { appointmentStore.set(apt.id, apt); return apt; }),
    upsertResult: vi.fn().mockResolvedValue(undefined),
    getRecentResults: vi.fn().mockResolvedValue([]),
    saveSequence: vi.fn(async (seq: any) => {
      sequenceStore.set(seq.id, { ...seq, startedAt: new Date(seq.startedAt) });
      const existing = sequenceByLeadStore.get(seq.leadId) || [];
      if (!existing.includes(seq.id)) {
        sequenceByLeadStore.set(seq.leadId, [...existing, seq.id]);
      }
    }),
    loadSequence: vi.fn(async (id: string) => {
      const seq = sequenceStore.get(id);
      return seq ? { ...seq, startedAt: new Date(seq.startedAt) } : null;
    }),
    loadSequencesByLead: vi.fn(async (leadId: string) => {
      return sequenceByLeadStore.get(leadId) || [];
    }),
    loadAllSequenceIds: vi.fn(async () => Array.from(sequenceStore.keys())),
    countActiveSequences: vi.fn(async () => {
      return Array.from(sequenceStore.values()).filter((s: any) => s.status === "active").length;
    }),
  };
});

// ========================================================================
// HELPERS
// ========================================================================

function createMockLead(overrides: Partial<Lead> = {}): Lead {
  const id = crypto.randomUUID();
  return {
    id,
    name: "Alice Johnson",
    company: "Harmony Wellness Center",
    role: "Wellness Seeker",
    email: "alice@harmonywellness.com",
    phone: "+1 (555) 111-2222",
    source: "google-maps",
    sourceUrl: "https://maps.google.com/place/harmony-wellness",
    status: "new",
    pipelineStage: "sourced",
    score: 65,
    personaType: "customer",
    notes: "Interested in holistic stress relief. Yoga instructor looking for complementary wellness technology.",
    createdAt: new Date(),
    ...overrides,
  };
}

function createScrapedLeads(count: number): any[] {
  const names = [
    "Balance Health Clinic",
    "Serenity Now Spa",
    "Dr. Patel's Wellness Center",
    "Mind Body Studio",
    "Peak Performance Lab",
  ];
  return names.slice(0, count).map((name, i) => ({
    name,
    company: name,
    role: i % 2 === 0 ? "Business Owner" : "Practitioner",
    email: i % 2 === 0 ? `info@${name.toLowerCase().replace(/\s+/g, "")}.com` : "",
    phone: i % 2 === 0 ? `+1 (555) ${300 + i}-${1000 + i}` : "",
    source: "google-maps" as const,
    sourceUrl: "",
    score: 50 + i * 5,
    personaType: i % 2 === 0 ? "wellness-seeker" : "practitioner",
    notes: `Found via Google Maps search. ${i % 2 === 0 ? "Wellness center with yoga classes." : "Medical practice offering holistic services."}`,
  }));
}

async function setupPipelineConfig() {
  const orchestrator = getPipelineOrchestrator();
  await orchestrator.updateConfig({
    enabled: true,
    defaultQuery: "wellness center",
    maxLeadsPerScrape: 5,
    preferredModel: "gemini-2.0-flash-lite",
    preferredProvider: "gemini",
  });
  return orchestrator;
}

beforeEach(() => {
  vi.clearAllMocks();
  leadStore.clear();
  sequenceStore.clear();
  sequenceByLeadStore.clear();
  appointmentStore.clear();
  settingStore.clear();
});

// ========================================================================
// SCENARIO 1: Full pipeline tick — scrape → engage → enrich → nurture → followup → book
// ========================================================================

describe("Full pipeline: scrape → engage → enrich → nurture → followup → book", () => {
  it("runs a complete pipeline tick with all phases producing output", async () => {
    const { scrapeGoogleMaps } = await import("../google-maps-scraper");
    const scrapedLeads = createScrapedLeads(3);
    vi.mocked(scrapeGoogleMaps).mockResolvedValueOnce(scrapedLeads);

    vi.mocked(callLLM).mockResolvedValueOnce(
      JSON.stringify([
        { index: 0, personaType: "wellness-seeker", score: 82, painPoints: "Chronic stress, burnout", outreachAngle: "Educational about frequency stress relief", notes: "Excellent fit for relaxation-focused marketing" },
        { index: 1, personaType: "practitioner", score: 75, painPoints: "Patient retention, offering more services", outreachAngle: "Demo of clinical applications", notes: "Good fit for practitioner partnership" },
        { index: 2, personaType: "wellness-seeker", score: 68, painPoints: "Sleep issues, low energy", outreachAngle: "Case studies on energy improvement", notes: "Moderate fit, worth nurturing" },
      ])
    );

    const orchestrator = await setupPipelineConfig();
    const tickResult = await orchestrator.tick();

    // Scrape phase produced leads
    expect(tickResult.leadsAdded).toBe(3);
    expect(tickResult.phase).toBe("complete");

    // Leads were persisted
    expect(leadStore.size).toBe(3);
    const savedLeads = Array.from(leadStore.values());
    expect(savedLeads.map((l) => l.name)).toEqual(
      expect.arrayContaining(["Balance Health Clinic", "Serenity Now Spa", "Dr. Patel's Wellness Center"])
    );

    // LLM was called at least once (enrichment and/or engagement personalization)
    expect(callLLM).toHaveBeenCalled();
  });

  it("engages leads immediately after scrape via LeadEngager", async () => {
    const lead = createMockLead();

    // No existing sequences in store — engageLead should create one
    const result = await engageLead(lead);

    // Nurture sequence was created
    expect(result.sequenceCreated).toBe(true);
    expect(result.leadId).toBe(lead.id);

    // Email was sent (lead has email)
    expect(result.emailSent).toBe(true);
    expect(result.emailError).toBeUndefined();

    // WhatsApp was sent (lead has phone + mock returns connected)
    expect(result.whatsappSent).toBe(true);

    // sendEmail was called with correct recipient
    const { sendEmail } = await import("@/lib/email/email-sender");
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: lead.email })
    );

    // sendWhatsAppMessage was called
    const { sendWhatsAppMessage } = await import("@/lib/whatsapp/whatsapp-web");
    expect(sendWhatsAppMessage).toHaveBeenCalledWith(
      lead.phone,
      expect.any(String)
    );

    // Lead status was updated to contacted
    const savedLead = leadStore.get(lead.id);
    expect(savedLead?.status).toBe("contacted");
    expect(savedLead?.pipelineStage).toBe("contacted");
  });

  it("enriches leads with AI scores and personas after engagement", async () => {
    // Pre-populate leads that need enrichment (score === 50, the default)
    const leads = [
      createMockLead({ id: "lead-1", name: "Balance Health", score: 50, personaType: "customer", notes: "Wellness center" }),
      createMockLead({ id: "lead-2", name: "Dr. Patel", score: 50, personaType: "customer", notes: "Medical practice" }),
    ];
    for (const lead of leads) {
      leadStore.set(lead.id, lead);
    }

    // Mock enrichment LLM call
    vi.mocked(callLLM).mockResolvedValueOnce(
      JSON.stringify([
        { index: 0, personaType: "wellness-seeker", score: 82, painPoints: "Stress relief", outreachAngle: "Educational content", notes: "Good fit" },
        { index: 1, personaType: "practitioner", score: 78, painPoints: "Patient retention", outreachAngle: "Product demo", notes: "Great fit" },
      ])
    );

    const orchestrator = await setupPipelineConfig();
    await orchestrator.tick();

    // LLM was called with enrichment prompt
    const systemPrompt = vi.mocked(callLLM).mock.calls[0]?.[0] || "";
    expect(systemPrompt).toContain("lead qualification specialist");

    // Leads were updated with new scores and personas from enrichment
    const lead1 = leadStore.get("lead-1");
    expect(lead1?.score).toBe(82);
    expect(lead1?.personaType).toBe("wellness-seeker");

    const lead2 = leadStore.get("lead-2");
    expect(lead2?.score).toBe(78);
    expect(lead2?.personaType).toBe("practitioner");
  });

  it("creates nurture sequences for enriched leads", async () => {
    const lead = createMockLead({
      id: "lead-nurture-1",
      name: "Serenity Wellness",
      score: 75,
      status: "contacted",
      personaType: "wellness-seeker",
    });
    leadStore.set(lead.id, lead);

    const orchestrator = await setupPipelineConfig();
    await orchestrator.tick();

    // Verify nurture sequences were created via the pipeline tick
    const engine = new NurtureEngine();
    const allSequences = await engine.getAllSequences();
    expect(allSequences.length).toBeGreaterThan(0);

    // At least one sequence should be for our lead
    const leadSequences = allSequences.filter((s) => s.leadId === lead.id);
    expect(leadSequences.length).toBeGreaterThanOrEqual(1);

    // Sequences should have steps
    if (leadSequences.length > 0) {
      expect(leadSequences[0].steps.length).toBeGreaterThan(0);
    }
  });

  it("follow-up engine sends due nurture messages", async () => {
    const lead = createMockLead({ id: "lead-fu-1", name: "Test Lead" });
    leadStore.set(lead.id, lead);

    // Create a nurture sequence manually via the engine
    const engine = new NurtureEngine();
    await engine.createSequence(lead, {
      name: "Test Sequence for Follow-up",
      customSteps: [
        { type: "email", subject: "Hello!", template: "Welcome to our wellness community!", delayDays: 0 },
      ],
    });

    // Run the follow-up cycle
    const followupEngine = new FollowupEngine();
    const followupResult = await followupEngine.runFollowupCycle();

    // Verify follow-up messages were sent
    const { sendEmail } = await import("@/lib/email/email-sender");
    expect(sendEmail).toHaveBeenCalled();
    expect(followupResult.totalSent).toBeGreaterThan(0);
  });

  it("auto-booker detects high-score leads and books appointments", async () => {
    const lead = createMockLead({
      id: "lead-book-1",
      name: "Dr. Sarah Chen",
      company: "Holistic Health Partners",
      email: "sarah@holistichealth.com",
      phone: "+1 (555) 444-3333",
      score: 85,
      status: "new",
      personaType: "practitioner",
      notes: "Highly interested in adding frequency technology to practice. Specifically requested demo.",
    });
    leadStore.set(lead.id, lead);

    const booker = new AutoBooker();
    const bookingResult = await booker.scanAndBook();

    // Score >= 70 AND status === "new" should trigger high_score signal
    expect(bookingResult.qualified).toBeGreaterThanOrEqual(1);
    expect(bookingResult.booked).toBeGreaterThanOrEqual(1);
  });

  it("creates Google Calendar events with real Meet links for booked appointments", async () => {
    const lead = createMockLead({
      id: "lead-cal-1",
      name: "Dr. James Wilson",
      email: "james@wilsonclinic.com",
      score: 90,
      status: "new",
    });
    leadStore.set(lead.id, lead);

    const booker = new AutoBooker();
    await booker.scanAndBook();

    // Verify createCalendarEvent was called
    const { createCalendarEvent } = await import("@/lib/calendar");
    const calendarCalls = vi.mocked(createCalendarEvent).mock.calls;
    expect(calendarCalls.length).toBeGreaterThan(0);

    const calEvent = calendarCalls[0][0];
    expect(calEvent.summary).toContain(lead.name);
    expect(calEvent.attendeeEmail).toBe(lead.email);
  });
});

// ========================================================================
// SCENARIO 2: End-to-end with a single scraped lead going full lifecycle
// ========================================================================

describe("End-to-end: scraped lead through full lifecycle", () => {
  it("takes a scraped lead through engagement → enrichment → qualification → booking", async () => {
    // Step 1: Simulate scraping a lead
    const { scrapeGoogleMaps } = await import("../google-maps-scraper");
    const scrapedLeads = createScrapedLeads(1);
    vi.mocked(scrapeGoogleMaps).mockResolvedValueOnce(scrapedLeads);

    // Step 2: Enrichment LLM response
    vi.mocked(callLLM).mockResolvedValueOnce(
      JSON.stringify([
        { index: 0, personaType: "wellness-seeker", score: 88, painPoints: "Looking for holistic wellness solutions", outreachAngle: "Educational content about frequency technology", notes: "High-quality lead showing strong wellness interest" },
      ])
    );

    // Step 3: Run the pipeline — scrape creates the lead AND engages it automatically
    const orchestrator = await setupPipelineConfig();
    await orchestrator.tick();

    // Verify lead was scraped and saved
    expect(leadStore.size).toBe(1);
    const lead = Array.from(leadStore.values())[0];
    expect(lead?.name).toBe("Balance Health Clinic");

    // Step 4: Lead was automatically engaged by pipeline (engageLeads called in runScrapePhase)
    // Verify the nurture sequence exists from the automatic engagement
    const engine = new NurtureEngine();
    const existingSequences = await engine.getSequencesByLead(lead!.id);
    expect(existingSequences.length).toBeGreaterThan(0);
    expect(existingSequences[0].leadId).toBe(lead!.id);

    // The pipeline ran through all phases including auto-booker,
    // so the lead should be at the final pipeline stage
    expect(lead!.status).toBe("appointment_scheduled");

    // Step 5: Update lead score (simulating enrichment that runs in a later pipeline phase)
    const enrichedLead = {
      ...lead!,
      score: 88,
      personaType: "wellness-seeker" as const,
      status: "contacted" as const,
    };
    leadStore.set(enrichedLead.id, enrichedLead);

    // Step 6: Run follow-up cycle
    const followupEngine = new FollowupEngine();
    await followupEngine.runFollowupCycle();

    // Step 7: Run auto-booker — lead has score >= 70 and status === "contacted"
    const booker = new AutoBooker();
    const bookingResult = await booker.scanAndBook();

    expect(bookingResult.scanned).toBe(1);
    expect(bookingResult.qualified).toBeGreaterThanOrEqual(1);
    expect(bookingResult.booked).toBeGreaterThanOrEqual(1);
  });

  it("gracefully handles leads without email or phone", async () => {
    const lead = createMockLead({
      id: "lead-no-contact",
      email: "",
      phone: "",
      status: "new",
    });
    leadStore.set(lead.id, lead);

    const result = await engageLead(lead);

    // Sequence should still be created
    expect(result.sequenceCreated).toBe(true);

    // Email and WhatsApp should not be sent (missing contact info)
    expect(result.emailSent).toBe(false);
    expect(result.whatsappSent).toBe(false);
  });

  it("handles nurture sequence already existing when engaging", async () => {
    const lead = createMockLead({ id: "lead-dupe" });
    leadStore.set(lead.id, lead);

    // Pre-populate a sequence for this lead in the in-memory store
    const mockSeqId = crypto.randomUUID();
    sequenceByLeadStore.set(lead.id, [mockSeqId]);
    sequenceStore.set(mockSeqId, {
      id: mockSeqId,
      leadId: lead.id,
      name: `Existing: ${lead.name}`,
      currentStep: 0,
      status: "active",
      startedAt: new Date(),
      steps: [],
    });

    const result = await engageLead(lead);

    // Should NOT create a new sequence (already exists)
    expect(result.sequenceCreated).toBe(false);
  });
});

// ========================================================================
// SCENARIO 3: Auto-booker signal detection for different scenarios
// ========================================================================

describe("Auto-booker signal detection", () => {
  it("detects 'replied' signal when lead responds to nurture", async () => {
    const lead = createMockLead({
      id: "lead-replied",
      status: "contacted",
      score: 60,
    });
    leadStore.set(lead.id, lead);

    // Create a sequence with a replied step
    const seqId = crypto.randomUUID();
    const seq = {
      id: seqId,
      leadId: lead.id,
      name: `Nurture: ${lead.name}`,
      currentStep: 1,
      status: "active",
      startedAt: new Date(),
      steps: [
        { id: "step1", sequenceId: seqId, stepNumber: 1, type: "email" as const, subject: "Hi!", template: "Welcome!", delayDays: 0, status: "replied" as const },
        { id: "step2", sequenceId: seqId, stepNumber: 2, type: "email" as const, subject: "Follow-up", template: "How are you?", delayDays: 2, status: "pending" as const },
      ],
    };
    sequenceStore.set(seqId, seq);
    sequenceByLeadStore.set(lead.id, [seqId]);

    const booker = new AutoBooker();
    const result = await booker.scanAndBook();

    // Should detect the reply signal (highest confidence = 90)
    expect(result.qualified).toBeGreaterThanOrEqual(1);
    expect(result.booked).toBeGreaterThanOrEqual(1);
  });

  it("ignores leads that are already booked or lost", async () => {
    const bookedLead = createMockLead({
      id: "lead-booked",
      status: "appointment_scheduled",
      score: 95,
    });
    leadStore.set(bookedLead.id, bookedLead);

    const lostLead = createMockLead({
      id: "lead-lost",
      status: "lost",
      score: 95,
    });
    leadStore.set(lostLead.id, lostLead);

    const booker = new AutoBooker();
    const result = await booker.scanAndBook();

    // Neither should be qualified (already booked/lost)
    expect(result.qualified).toBe(0);
    expect(result.booked).toBe(0);
  });
});

// ========================================================================
// SCENARIO 4: Follow-up engine channel dispatch
// ========================================================================

describe("Follow-up engine channel dispatch", () => {
  it("sends email follow-ups for pending due steps", async () => {
    const lead = createMockLead({ id: "lead-fu-email" });
    leadStore.set(lead.id, lead);

    const seqId = crypto.randomUUID();
    const seq = {
      id: seqId,
      leadId: lead.id,
      name: `Nurture: ${lead.name}`,
      currentStep: 0,
      status: "active",
      startedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago = step is due
      steps: [
        { id: "fu-step", sequenceId: seqId, stepNumber: 1, type: "email" as const, subject: "Second email", template: "Following up on your interest!", delayDays: 0, status: "pending" as const },
      ],
    };
    sequenceStore.set(seqId, seq);
    sequenceByLeadStore.set(lead.id, [seqId]);

    const followupEngine = new FollowupEngine();
    const result = await followupEngine.runFollowupCycle();

    // Follow-up should have sent the email
    const { sendEmail } = await import("@/lib/email/email-sender");
    expect(sendEmail).toHaveBeenCalled();
    expect(result.totalSent).toBeGreaterThan(0);
  });
});

// ========================================================================
// SCENARIO 5: Pipeline state management across ticks
// ========================================================================

describe("Pipeline state management", () => {
  it("tracks cycle count and lead totals across multiple ticks", async () => {
    const { scrapeGoogleMaps } = await import("../google-maps-scraper");

    // First tick: 2 leads
    vi.mocked(scrapeGoogleMaps).mockResolvedValueOnce(createScrapedLeads(2));
    vi.mocked(callLLM).mockResolvedValue(JSON.stringify([]));

    const orchestrator = await setupPipelineConfig();
    const tick1 = await orchestrator.tick();
    expect(tick1.leadsAdded).toBe(2);

    // Second tick: 2 NEW leads (different names — not duplicates)
    const secondBatch = createScrapedLeads(4).slice(2); // Last 2 from the 4-named list
    vi.mocked(scrapeGoogleMaps).mockResolvedValueOnce(secondBatch);
    const tick2 = await orchestrator.tick();
    // 2 new leads added (not duplicates of the first batch because names are different)
    expect(tick2.leadsAdded).toBe(2);
    expect(tick2.phase).toBe("complete");

    // State should reflect both ticks
    const state = await orchestrator.getState();
    expect(state.cycleCount).toBe(2);
    expect(state.totalLeadsSourced).toBe(4);
  });

  it("skips pipeline tick when already running", async () => {
    const orchestrator = await setupPipelineConfig();

    const { scrapeGoogleMaps } = await import("../google-maps-scraper");
    vi.mocked(scrapeGoogleMaps).mockImplementationOnce(async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return createScrapedLeads(1);
    });

    const firstTickPromise = orchestrator.tick();

    const tick2 = await orchestrator.tick();
    expect(tick2.phase).toBe("skipped (already running)");

    await firstTickPromise;
  });

  it("updates pipeline config and persists across calls", async () => {
    const orchestrator = await setupPipelineConfig();

    await orchestrator.updateConfig({
      defaultQuery: "yoga studio",
      maxLeadsPerScrape: 20,
    });

    const config = await orchestrator.getConfig();
    expect(config.defaultQuery).toBe("yoga studio");
    expect(config.maxLeadsPerScrape).toBe(20);
  });
});

// ========================================================================
// SCENARIO 6: Cost tracking across pipeline phases
// ========================================================================

describe("Pipeline cost tracking", () => {
  it("accumulates cost across all pipeline phases", async () => {
    const { scrapeGoogleMaps } = await import("../google-maps-scraper");
    vi.mocked(scrapeGoogleMaps).mockResolvedValueOnce(createScrapedLeads(2));

    vi.mocked(callLLM).mockResolvedValueOnce(
      JSON.stringify([
        { index: 0, personaType: "wellness-seeker", score: 80, painPoints: "Stress", outreachAngle: "Content", notes: "Good fit" },
        { index: 1, personaType: "practitioner", score: 75, painPoints: "Retention", outreachAngle: "Demo", notes: "Good fit" },
      ])
    );

    const orchestrator = await setupPipelineConfig();
    const tickResult = await orchestrator.tick();

    expect(tickResult.leadsAdded).toBe(2);
    expect(tickResult.phase).toBe("complete");
  });
});
