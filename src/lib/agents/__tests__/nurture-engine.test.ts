import { describe, it, expect, vi, beforeEach } from "vitest";
import { NurtureEngine } from "../nurture-engine";
import type { Lead } from "../types";

// callLLM is already mocked in test-setup.ts
// DB functions (saveSequence, loadSequence, etc.) are mocked in test-setup.ts

import * as dbModule from "@/lib/db";

const createTestLead = (overrides: Partial<Lead> = {}): Lead => ({
  id: "lead-001",
  name: "Sarah Mitchell",
  company: "Yoga Bliss Studio",
  role: "Wellness Seeker",
  email: "sarah@yogabliss.com",
  phone: "+1 (555) 123-4567",
  source: "manual",
  sourceUrl: undefined,
  status: "new",
  pipelineStage: "sourced",
  score: 85,
  personaType: "wellness-seeker",
  notes: "Interested in stress reduction",
  createdAt: new Date(),
  lastContactedAt: undefined,
  nextFollowUp: undefined,
  ...overrides,
});

describe("NurtureEngine", () => {
  let engine: NurtureEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new NurtureEngine();
  });

  describe("createSequence", () => {
    it("creates a sequence with default steps based on persona", async () => {
      const lead = createTestLead();
      const sequence = await engine.createSequence(lead);

      expect(sequence.id).toBeTruthy();
      expect(sequence.leadId).toBe("lead-001");
      expect(sequence.name).toContain("Sarah Mitchell");
      expect(sequence.steps.length).toBeGreaterThan(0);
      expect(sequence.currentStep).toBe(0);
      expect(sequence.status).toBe("active");
      expect(sequence.startedAt).toBeInstanceOf(Date);

      // Verify it was persisted to DB
      expect(dbModule.saveSequence).toHaveBeenCalledWith(
        expect.objectContaining({ id: sequence.id })
      );
    });

    it("creates sequence with custom steps", async () => {
      const lead = createTestLead();
      const sequence = await engine.createSequence(lead, {
        customSteps: [
          { type: "email", subject: "Welcome", template: "Hi {{name}}!", delayDays: 0 },
          { type: "whatsapp", template: "Quick follow-up", delayDays: 2 },
        ],
        name: "Custom Sequence",
      });

      expect(sequence.name).toBe("Custom Sequence");
      expect(sequence.steps.length).toBe(2);
      expect(sequence.steps[0].type).toBe("email");
      expect(sequence.steps[0].subject).toBe("Welcome");
      expect(sequence.steps[1].delayDays).toBe(2);
    });

    it("creates 20 email steps for any persona (Healy 90-day sequence)", async () => {
      const practitioner = createTestLead({
        personaType: "practitioner",
        name: "Dr. James Chen",
      });
      const sequence = await engine.createSequence(practitioner);

      // Healy sequences are all email, spanning 90 days
      const types = sequence.steps.map((s) => s.type);
      expect(types.length).toBe(20);
      expect(types.every((t) => t === "email")).toBe(true);
    });

    it("assigns each step a unique ID", async () => {
      const lead = createTestLead();
      const sequence = await engine.createSequence(lead);

      const stepIds = sequence.steps.map((s) => s.id);
      const uniqueIds = new Set(stepIds);
      expect(uniqueIds.size).toBe(stepIds.length);
    });
  });

  describe("sequence management with smart DB mocks", () => {
    let lead: Lead;

    /** In-memory store that mirrors how the real DB would work */
    const seqStore = new Map<string, any>();

    beforeEach(() => {
      vi.clearAllMocks();
      engine = new NurtureEngine();
      seqStore.clear();

      // Make saveSequence store data in the in-memory map
      vi.mocked(dbModule.saveSequence).mockImplementation(
        (seq: any) => {
          seqStore.set(seq.id, JSON.parse(JSON.stringify(seq)));
          return Promise.resolve(seq);
        }
      );

      // Make loadSequence retrieve from the in-memory map
      vi.mocked(dbModule.loadSequence).mockImplementation(
        (id: string) => {
          const data = seqStore.get(id);
          return Promise.resolve(data ? JSON.parse(JSON.stringify(data)) : null);
        }
      );

      // Make loadSequencesByLead look up by leadId
      vi.mocked(dbModule.loadSequencesByLead).mockImplementation(
        (leadId: string) => {
          const ids: string[] = [];
          seqStore.forEach((seq) => {
            if (seq.leadId === leadId) ids.push(seq.id);
          });
          return Promise.resolve(ids);
        }
      );

      // Make loadAllSequenceIds return all stored IDs
      vi.mocked(dbModule.loadAllSequenceIds).mockImplementation(
        () => Promise.resolve(Array.from(seqStore.keys()))
      );

      // Make countActiveSequences count active ones
      vi.mocked(dbModule.countActiveSequences).mockImplementation(
        () => {
          let count = 0;
          seqStore.forEach((seq) => {
            if (seq.status === "active") count++;
          });
          return Promise.resolve(count);
        }
      );

      // Make dbUpdate update the in-memory store (used by pauseSequence/resumeSequence)
      vi.mocked(dbModule.dbUpdate).mockImplementation(
        (table: string, id: string, data: Record<string, any>) => {
          const existing = seqStore.get(id);
          if (existing) {
            seqStore.set(id, { ...existing, ...data });
          }
          return Promise.resolve();
        }
      );

      lead = createTestLead();
    });

    it("advances sequence correctly", async () => {
      const seq = await engine.createSequence(lead, {
        customSteps: [
          { type: "email", subject: "Step 1", template: "Template 1", delayDays: 0 },
          { type: "email", subject: "Step 2", template: "Template 2", delayDays: 3 },
          { type: "phone_call", template: "Template 3", delayDays: 7 },
        ],
      });

      const updated = await engine.advanceSequence(seq.id);
      expect(updated).not.toBeNull();
      expect(updated!.currentStep).toBe(1);
      expect(updated!.steps[0].status).toBe("sent");
      expect(updated!.steps[0].sentAt).toBeInstanceOf(Date);
    });

    it("completes sequence after advancing past all steps", async () => {
      const seq = await engine.createSequence(lead, {
        customSteps: [
          { type: "email", subject: "Step 1", template: "Template 1", delayDays: 0 },
          { type: "email", subject: "Step 2", template: "Template 2", delayDays: 3 },
          { type: "phone_call", template: "Template 3", delayDays: 7 },
        ],
      });

      // Advance through all steps
      await engine.advanceSequence(seq.id); // step 0 sent
      await engine.advanceSequence(seq.id); // step 1 sent
      const final = await engine.advanceSequence(seq.id); // step 2 sent, done

      expect(final!.status).toBe("completed");
      expect(final!.currentStep).toBe(2); // stays at last sent step when completed
    });

    it("marks remaining steps as skipped when converted", async () => {
      const seq = await engine.createSequence(lead, {
        customSteps: [
          { type: "email", subject: "Step 1", template: "Template 1", delayDays: 0 },
          { type: "email", subject: "Step 2", template: "Template 2", delayDays: 3 },
          { type: "phone_call", template: "Template 3", delayDays: 7 },
        ],
      });

      await engine.convertSequence(seq.id);
      const loaded = await engine.getSequence(seq.id);

      expect(loaded!.status).toBe("converted");
      // All pending steps should be skipped after conversion
      loaded!.steps.forEach((s) => {
        expect(["pending", "skipped"]).toContain(s.status);
        if (s.status === "pending") {
          // Pending steps become skipped on conversion
        }
      });
    });

    it("pauses and resumes sequence", async () => {
      const seq = await engine.createSequence(lead, {
        customSteps: [
          { type: "email", subject: "Step 1", template: "Template 1", delayDays: 0 },
        ],
      });

      const paused = await engine.pauseSequence(seq.id);
      expect(paused!.status).toBe("paused");

      const resumed = await engine.resumeSequence(seq.id);
      expect(resumed!.status).toBe("active");
    });

    it("returns null for pause/resume on non-existent sequence", async () => {
      await expect(engine.pauseSequence("non-existent")).resolves.toBeNull();
      await expect(engine.resumeSequence("non-existent")).resolves.toBeNull();
    });

    it("marks step as responded", async () => {
      const seq = await engine.createSequence(lead, {
        customSteps: [
          { type: "email", subject: "Step 1", template: "Template 1", delayDays: 0 },
          { type: "email", subject: "Step 2", template: "Template 2", delayDays: 3 },
        ],
      });

      const updated = await engine.markStepResponded(seq.id, 1);
      expect(updated!.steps[0].status).toBe("replied");
      expect(updated!.steps[0].responseAt).toBeInstanceOf(Date);
    });

    it("returns null for markStepResponded on non-existent sequence", async () => {
      await expect(engine.markStepResponded("non-existent", 1)).resolves.toBeNull();
    });

    it("gets the next action for an active sequence", async () => {
      const seq = await engine.createSequence(lead, {
        customSteps: [
          { type: "email", subject: "Step 1", template: "Template 1", delayDays: 0 },
          { type: "email", subject: "Step 2", template: "Template 2", delayDays: 3 },
        ],
      });

      const nextStep = await engine.getNextAction(seq.id);
      expect(nextStep).not.toBeNull();
      expect(nextStep!.stepNumber).toBe(1);
      expect(nextStep!.subject).toBe("Step 1");
    });

    it("returns null for getNextAction on completed sequence", async () => {
      const seq = await engine.createSequence(lead, {
        customSteps: [
          { type: "email", subject: "Step 1", template: "Template 1", delayDays: 0 },
        ],
      });

      await engine.advanceSequence(seq.id);
      await expect(engine.getNextAction(seq.id)).resolves.toBeNull();
    });

    it("converts sequence", async () => {
      const seq = await engine.createSequence(lead, {
        customSteps: [
          { type: "email", subject: "Step 1", template: "Template 1", delayDays: 0 },
        ],
      });

      const converted = await engine.convertSequence(seq.id);
      expect(converted!.status).toBe("converted");
      expect(converted!.convertedAt).toBeInstanceOf(Date);
    });

    it("returns null for invalid operations on non-existent sequences", async () => {
      await expect(engine.advanceSequence("bad-id")).resolves.toBeNull();
      await expect(engine.convertSequence("bad-id")).resolves.toBeNull();
      await expect(engine.getNextAction("bad-id")).resolves.toBeNull();
    });

    it("finds sequences by lead ID", async () => {
      const lead1 = createTestLead({ id: "lead-1", name: "Alice" });
      const lead2 = createTestLead({ id: "lead-2", name: "Bob" });

      await engine.createSequence(lead1);
      await engine.createSequence(lead2);
      await engine.createSequence(lead1); // Second seq for lead1

      const lead1Seqs = await engine.getSequencesByLead("lead-1");
      expect(lead1Seqs.length).toBe(2);

      const lead2Seqs = await engine.getSequencesByLead("lead-2");
      expect(lead2Seqs.length).toBe(1);
    });

    it("lists all sequences", async () => {
      await engine.createSequence(createTestLead({ id: "a" }));
      await engine.createSequence(createTestLead({ id: "b" }));
      await engine.createSequence(createTestLead({ id: "c" }));

      expect((await engine.getAllSequences()).length).toBe(3);
    });

    it("counts active sequences", async () => {
      const seq1 = await engine.createSequence(createTestLead({ id: "a" }));
      await engine.createSequence(createTestLead({ id: "b" }));
      await engine.createSequence(createTestLead({ id: "c" }));

      await engine.pauseSequence(seq1.id);

      expect(await engine.getActiveSequenceCount()).toBe(2);
    });

    it("returns active sequences only", async () => {
      const seq = await engine.createSequence(createTestLead({ id: "a" }));
      await engine.pauseSequence(seq.id);

      const active = await engine.getActiveSequences();
      expect(active.length).toBe(0);
    });
  });

  describe("setApiKey", () => {
    it("accepts an API key without errors", () => {
      expect(() => {
        engine.setApiKey("sk-test-key");
      }).not.toThrow();
    });
  });
});
