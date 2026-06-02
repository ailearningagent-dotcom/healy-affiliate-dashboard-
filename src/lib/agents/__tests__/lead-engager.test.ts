import { describe, it, expect, vi, beforeEach } from "vitest";
import { engageLead, engageLeads } from "../lead-engager";
import { NurtureEngine } from "../nurture-engine";
import { callLLM } from "@/lib/llm/call-llm";
import * as dbModule from "@/lib/db";
import type { Lead, NurtureSequence } from "../types";

// Mock email and WhatsApp modules directly (not in test-setup.ts)
vi.mock("@/lib/email/email-sender", () => ({
  sendEmail: vi.fn().mockResolvedValue({
    success: true,
    provider: "gmail_smtp",
    messageId: "mock-msg-001",
  }),
  buildNurtureEmail: vi.fn().mockReturnValue({
    subject: "Mock Subject",
    html: "<p>Mock HTML</p>",
    text: "Mock text",
  }),
  buildAppointmentEmail: vi.fn().mockReturnValue({
    subject: "Mock Subject",
    html: "<p>Mock HTML</p>",
    text: "Mock text",
  }),
  buildEmailHtml: vi.fn().mockReturnValue("<p>Mock HTML</p>"),
  sendViaGmailSmtp: vi.fn(),
  sendViaResend: vi.fn(),
  sendViaSendGrid: vi.fn(),
}));

vi.mock("@/lib/whatsapp/whatsapp-web", () => ({
  sendWhatsAppMessage: vi.fn().mockResolvedValue({
    success: true,
  }),
  isWhatsAppConnected: vi.fn().mockResolvedValue(false),
  getWhatsAppStatus: vi.fn().mockReturnValue({
    status: "disconnected",
    qrDataUrl: null,
    phoneNumber: null,
    error: null,
  }),
  connectWhatsApp: vi.fn(),
  disconnectWhatsApp: vi.fn(),
}));

// All DB calls, callLLM, sendEmail, sendWhatsAppMessage, and isWhatsAppConnected
// are mocked in test-setup.ts

const createTestLead = (overrides: Partial<Lead> = {}): Lead => ({
  id: "lead-engage-001",
  name: "Alice Johnson",
  company: "Wellness Co",
  role: "Wellness Seeker",
  email: "alice@wellness.com",
  phone: "+1 (555) 987-6543",
  source: "manual",
  sourceUrl: undefined,
  status: "new",
  pipelineStage: "sourced",
  score: 65,
  personaType: "wellness-seeker",
  notes: "Interested in holistic health solutions",
  createdAt: new Date(),
  lastContactedAt: undefined,
  nextFollowUp: undefined,
  ...overrides,
});

describe("LeadEngager", () => {
  /** In-memory store for nurture sequences (simulates the real DB) */
  const seqStore = new Map<string, any>();
  let engine: NurtureEngine;

  beforeEach(async () => {
    vi.clearAllMocks();
    engine = new NurtureEngine();
    seqStore.clear();

    // Mock NurtureEngine methods to use our in-memory store
    vi.mocked(dbModule.saveSequence).mockImplementation((seq: any) => {
      seqStore.set(seq.id, JSON.parse(JSON.stringify(seq)));
      return Promise.resolve(seq);
    });
    vi.mocked(dbModule.loadSequence).mockImplementation((id: string) => {
      const data = seqStore.get(id);
      return Promise.resolve(data ? JSON.parse(JSON.stringify(data)) : null);
    });
    vi.mocked(dbModule.loadSequencesByLead).mockImplementation((leadId: string) => {
      const ids: string[] = [];
      seqStore.forEach((seq) => {
        if (seq.leadId === leadId) ids.push(seq.id);
      });
      return Promise.resolve(ids);
    });
    vi.mocked(dbModule.loadAllSequenceIds).mockImplementation(() =>
      Promise.resolve(Array.from(seqStore.keys()))
    );
    vi.mocked(dbModule.dbUpdate).mockImplementation((table: string, id: string, data: Record<string, any>) => {
      const existing = seqStore.get(id);
      if (existing) {
        seqStore.set(id, { ...existing, ...data });
      }
      return Promise.resolve();
    });
    vi.mocked(dbModule.countActiveSequences).mockImplementation(() => {
      let count = 0;
      seqStore.forEach((seq) => {
        if (seq.status === "active") count++;
      });
      return Promise.resolve(count);
    });

    // Reset mocks to defaults
    const { sendEmail } = await import("@/lib/email/email-sender");
    vi.mocked(sendEmail).mockResolvedValue({
      success: true,
      provider: "gmail_smtp",
      messageId: "mock-msg-001",
    });

    const { isWhatsAppConnected } = await import("@/lib/whatsapp/whatsapp-web");
    vi.mocked(isWhatsAppConnected).mockResolvedValue(false);
  });

  describe("engageLead", () => {
    it("engages a lead with email (Healy 90-day sequences are email-only)", async () => {
      const { sendEmail } = await import("@/lib/email/email-sender");

      const lead = createTestLead();
      const result = await engageLead(lead);

      expect(result.leadId).toBe(lead.id);
      expect(result.leadName).toBe("Alice Johnson");
      expect(result.sequenceCreated).toBe(true);
      expect(result.emailSent).toBe(true);
      expect(result.emailError).toBeUndefined();
      // WhatsApp is not sent in Healy email-only sequences
      expect(result.whatsappSent).toBe(false);
    });

    it("creates a nurture sequence when none exists", async () => {
      const lead = createTestLead();

      // Before engagement, no sequences should exist
      const beforeSeqs = await engine.getSequencesByLead(lead.id);
      expect(beforeSeqs.length).toBe(0);

      await engageLead(lead);

      // After engagement, a sequence should have been created
      const afterSeqs = await engine.getSequencesByLead(lead.id);
      expect(afterSeqs.length).toBeGreaterThan(0);
      expect(afterSeqs[0].leadId).toBe(lead.id);
      expect(afterSeqs[0].status).toBe("active");
    });

    it("does not create a duplicate sequence if one already exists", async () => {
      const lead = createTestLead();

      // Pre-create a sequence for this lead
      const existingSeq = await engine.createSequence(lead, {
        name: `Pre-existing: ${lead.name}`,
        customSteps: [
          { type: "email", subject: "Existing", template: "Hello!", delayDays: 0 },
        ],
      });

      await engageLead(lead);

      // Should still only have 1 sequence (the pre-existing one)
      const seqs = await engine.getSequencesByLead(lead.id);
      expect(seqs.length).toBe(1);
      expect(seqs[0].id).toBe(existingSeq.id);
    });

    it("sends an email when lead has an email address", async () => {
      const { sendEmail } = await import("@/lib/email/email-sender");

      const lead = createTestLead({ email: "test@example.com" });

      await engageLead(lead);

      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "test@example.com",
          subject: expect.any(String),
          body: expect.any(String),
          textBody: expect.any(String),
        })
      );
    });

    it("skips email when lead has no email address", async () => {
      const { sendEmail } = await import("@/lib/email/email-sender");

      const lead = createTestLead({ email: "" });

      const result = await engageLead(lead);

      expect(result.emailSent).toBe(false);
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it("skips WhatsApp when lead has no phone number", async () => {
      const lead = createTestLead({ phone: "" });

      const result = await engageLead(lead);

      expect(result.whatsappSent).toBe(false);
    });

    it("skips WhatsApp when not connected", async () => {
      const { isWhatsAppConnected } = await import("@/lib/whatsapp/whatsapp-web");
      vi.mocked(isWhatsAppConnected).mockResolvedValue(false);
      const lead = createTestLead({ phone: "+1 (555) 123-4567" });

      const result = await engageLead(lead);

      expect(result.whatsappSent).toBe(false);
      expect(result.whatsappError).toContain("whatsapp_unavailable");
    });

    it("does not send WhatsApp by default — Healy 90-day sequences are email-only", async () => {
      const { isWhatsAppConnected, sendWhatsAppMessage } = await import("@/lib/whatsapp/whatsapp-web");
      vi.mocked(isWhatsAppConnected).mockResolvedValue(true);
      vi.mocked(sendWhatsAppMessage).mockResolvedValue({ success: true });
      const lead = createTestLead({ phone: "+1 (555) 123-4567" });

      const result = await engageLead(lead);

      // Healy sequences only have email steps, no WhatsApp
      expect(result.whatsappSent).toBe(false);
      expect(result.whatsappError).toContain("No WhatsApp step");
    });

    it("updates lead status to contacted after successful engagement", async () => {
      const lead = createTestLead();

      await engageLead(lead);

      // upsertLead should have been called with status "contacted"
      const upsertCalls = vi.mocked(dbModule.upsertLead).mock.calls;
      const lastUpsert = upsertCalls[upsertCalls.length - 1]?.[0];
      expect(lastUpsert).toBeDefined();
      expect(lastUpsert!.status).toBe("contacted");
      expect(lastUpsert!.pipelineStage).toBe("contacted");
    });

    it("does not change status if no channel succeeded", async () => {
      const lead = createTestLead({ email: "", phone: "" });

      await engageLead(lead);

      // upsertLead should NOT have been called with status "contacted"
      const upsertCalls = vi.mocked(dbModule.upsertLead).mock.calls;
      const lastUpsert = upsertCalls[upsertCalls.length - 1]?.[0];
      // The last upsert should still be the sequence creation (status stays "new")
      // Or if the lead was not upserted again, expect the original
      if (lastUpsert) {
        expect(lastUpsert.status).toBe("new");
      }
    });

    it("handles email send failure gracefully", async () => {
      const { sendEmail } = await import("@/lib/email/email-sender");
      vi.mocked(sendEmail).mockResolvedValue({
        success: false,
        provider: "gmail_smtp",
        error: "SMTP connection refused",
      });

      const lead = createTestLead();

      const result = await engageLead(lead);

      expect(result.emailSent).toBe(false);
      expect(result.emailError).toBe("SMTP connection refused");
    });

    it("handles WhatsApp send failure gracefully (Healy sequences are email-only — no WhatsApp step)", async () => {
      const { isWhatsAppConnected, sendWhatsAppMessage } = await import("@/lib/whatsapp/whatsapp-web");
      vi.mocked(isWhatsAppConnected).mockResolvedValue(true);
      vi.mocked(sendWhatsAppMessage).mockResolvedValue({
        success: false,
        error: "Invalid phone number",
      });

      const lead = createTestLead({ phone: "invalid" });

      const result = await engageLead(lead);

      // Healy 90-day sequences are email-only, so WhatsApp won't be sent
      expect(result.whatsappSent).toBe(false);
      expect(result.whatsappError).toContain("No WhatsApp step");
    });

    it("handles unexpected errors without crashing", async () => {
      vi.mocked(dbModule.saveSequence).mockRejectedValueOnce(new Error("DB unavailable"));

      const lead = createTestLead();

      // Should not throw — errors are caught internally
      const result = await engageLead(lead);

      expect(result.sequenceCreated).toBe(false);
      expect(result.emailSent).toBe(false);
      expect(result.whatsappSent).toBe(false);
    });

    it("returns cost tracking in the result", async () => {
      const lead = createTestLead();

      const result = await engageLead(lead);

      expect(typeof result.cost).toBe("number");
      expect(result.cost).toBeGreaterThanOrEqual(0);
    });

    it("records an agent result for historical tracking", async () => {
      const lead = createTestLead();

      await engageLead(lead);

      expect(dbModule.upsertResult).toHaveBeenCalledWith(
        expect.objectContaining({
          agentType: "sales",
          status: "completed",
          metadata: expect.objectContaining({
            label: expect.stringContaining("Alice Johnson"),
          }),
        })
      );
    });
  });

  describe("engageLeads (batch)", () => {
    it("engages multiple leads and returns results for each", async () => {
      const lead1 = createTestLead({ id: "batch-1", name: "Lead One", email: "one@test.com" });
      const lead2 = createTestLead({ id: "batch-2", name: "Lead Two", email: "two@test.com" });

      const results = await engageLeads([lead1, lead2]);

      expect(results.length).toBe(2);
      expect(results[0].leadId).toBe("batch-1");
      expect(results[1].leadId).toBe("batch-2");
    });

    it("handles all leads even if some fail", async () => {
      const { sendEmail } = await import("@/lib/email/email-sender");

      const lead1 = createTestLead({ id: "batch-fail-1", name: "Good Lead", email: "good@test.com" });
      const lead2 = createTestLead({ id: "batch-fail-2", name: "Bad Lead", email: "" });

      // Make sendEmail fail for lead1
      vi.mocked(sendEmail).mockResolvedValueOnce({
        success: false,
        provider: "gmail_smtp",
        error: "Failed",
      });

      const results = await engageLeads([lead1, lead2]);

      expect(results.length).toBe(2);
      // Both should complete without throwing
      expect(results[0].leadId).toBe("batch-fail-1");
      expect(results[1].leadId).toBe("batch-fail-2");
    });
  });
});
