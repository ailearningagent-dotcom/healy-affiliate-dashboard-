/**
 * NurtureEngine — 90-Day Healy Email Nurture Sequences
 *
 * Uses the comprehensive Healy email sequences defined in healy-email-sequences.ts.
 * Spans 90+ days with 20 emails across 6 psychological phases:
 *   Phase 1: Foundation & Education (Days 1-14)
 *   Phase 2: Deep Benefits (Days 15-30)
 *   Phase 3: Social Proof (Days 31-45)
 *   Phase 4: Overcoming Objections (Days 46-60)
 *   Phase 5: Personal Path Forward (Days 61-75)
 *   Phase 6: Final Engagement (Days 76-90)
 *
 * Each email provides genuine value, asks for the prospect's phone number,
 * references the official Healy website, and includes CTA to healycommunity.com.
 */

import {
  saveSequence as dbSaveSequence,
  loadSequence as dbLoadSequence,
  loadSequencesByLead as dbLoadSequencesByLead,
  loadAllSequenceIds as dbLoadAllSequenceIds,
  countActiveSequences as dbCountActiveSequences,
  dbUpdate,
} from "@/lib/db";
import type {
  NurtureSequence,
  NurtureStep,
  NurtureStepType,
  Lead,
} from "./types";
import {
  getHealyEmailTemplates,
  HEALY_EMAIL_SUBJECTS,
  HEALY_EMAIL_DELAYS,
} from "./healy-email-sequences";
import { injectLeadData } from "./email-personalizer";

const NURTURE_SYSTEM_PROMPT = `You are a warm, professional wellness advisor for Healy (healyworld.net), a German-engineered frequency wellness technology company. Your role is to nurture prospects with genuine value, education, and warmth — never pushy sales tactics.

PHILOSOPHY:
- Give value FIRST. Every interaction should leave the prospect better informed.
- Build trust through education about frequency wellness and bioelectrical medicine.
- Address specific pain points: sleep, stress, energy, focus, recovery, chronic discomfort.
- Use the psychology of giving: provide useful information before asking for anything.
- Social proof matters: reference the 500,000+ users across 60+ countries.
- The CTA is ALWAYS https://www.healycommunity.com for a free consultation.
- Ask for their phone number naturally — so a real person can reach out personally.

NURTURE FLOW (90 days, 20 emails):
- Days 1-14 (Phase 1): Provide educational value about frequency wellness, microcurrent technology
- Days 15-30 (Phase 2): Share specific health benefits — sleep, stress, energy, focus
- Days 31-45 (Phase 3): Share real stories, practitioner endorsements, community
- Days 46-60 (Phase 4): Address objections, skepticism, cost concerns with empathy
- Days 61-75 (Phase 5): Personalization, family wellness, individual consultation
- Days 76-90 (Phase 6): Final invitations, exclusive community, graceful exit

Brand voice: Warm, professional, genuine, educational, never pushy.
Key selling points: German engineering, 300+ programs, personalized AI, CE-certified, 500K+ users
Target audience: Wellness seekers, holistic practitioners, biohackers, business builders`;

export class NurtureEngine {
  private apiKey: string | undefined;

  setApiKey(key?: string): void {
    this.apiKey = key;
  }

  async createSequence(
    lead: Lead,
    options?: {
      customSteps?: { type: NurtureStepType; subject?: string; template: string; delayDays: number }[];
      name?: string;
    }
  ): Promise<NurtureSequence> {
    const sequenceId = crypto.randomUUID();
    const personaType = lead.personaType || "wellness-seeker";

    const steps: NurtureStep[] = [];

    if (options?.customSteps && options.customSteps.length > 0) {
      options.customSteps.forEach((step, i) => {
        steps.push({
          id: crypto.randomUUID(),
          sequenceId,
          stepNumber: i + 1,
          type: step.type,
          subject: step.subject,
          template: step.template,
          delayDays: step.delayDays,
          status: "pending",
        });
      });
    } else {
      // Use the Healy 90-day email sequences (20 emails)
      const templates = getHealyEmailTemplates(personaType);
      const delays = HEALY_EMAIL_DELAYS;
      const subjects = HEALY_EMAIL_SUBJECTS;

      for (let i = 0; i < templates.length; i++) {
        const step: NurtureStep = {
          id: crypto.randomUUID(),
          sequenceId,
          stepNumber: i + 1,
          type: "email",
          subject: subjects[i] || `Healy Wellness — ${i + 1}`,
          template: injectLeadData(templates[i]!, lead).replace(/\{name\}/g, lead.name),
          delayDays: delays[i] || 3,
          status: "pending",
        };
        steps.push(step);
      }
    }

    const sequence: NurtureSequence = {
      id: sequenceId,
      leadId: lead.id,
      name: options?.name ?? `${lead.name} — Healy 90-Day Wellness Journey`,
      steps,
      currentStep: 0,
      status: "active",
      startedAt: new Date(),
    };

    await dbSaveSequence(sequence);
    return sequence;
  }

  async getSequence(id: string): Promise<NurtureSequence | undefined> {
    const loaded = await dbLoadSequence(id);
    if (!loaded) return undefined;
    return this.toNurtureSequence(loaded);
  }

  async getSequencesByLead(leadId: string): Promise<NurtureSequence[]> {
    const ids = await dbLoadSequencesByLead(leadId);
    const sequences: NurtureSequence[] = [];
    for (const seqId of ids) {
      const seq = await dbLoadSequence(seqId);
      if (seq) sequences.push(this.toNurtureSequence(seq));
    }
    return sequences;
  }

  async getAllSequences(): Promise<NurtureSequence[]> {
    const ids = await dbLoadAllSequenceIds();
    const sequences: NurtureSequence[] = [];
    for (const seqId of ids) {
      const seq = await dbLoadSequence(seqId);
      if (seq) sequences.push(this.toNurtureSequence(seq));
    }
    return sequences;
  }

  async getActiveSequences(): Promise<NurtureSequence[]> {
    const all = await this.getAllSequences();
    return all.filter((s) => s.status === "active");
  }

  async getActiveSequenceCount(): Promise<number> {
    return dbCountActiveSequences();
  }

  async advanceSequence(sequenceId: string): Promise<NurtureSequence | null> {
    const dbSeq = await dbLoadSequence(sequenceId);
    if (!dbSeq || dbSeq.status !== "active") return null;

    const nextStepIndex = dbSeq.currentStep;

    if (nextStepIndex < dbSeq.steps.length) {
      dbSeq.steps[nextStepIndex].status = "sent";
      dbSeq.steps[nextStepIndex].sentAt = new Date();
    }

    if (nextStepIndex + 1 >= dbSeq.steps.length) {
      dbSeq.status = "completed";
      dbSeq.steps.forEach((s) => {
        if (s.status === "pending") s.status = "skipped";
      });
    } else {
      dbSeq.currentStep = nextStepIndex + 1;
    }

    dbSeq.lastActionAt = new Date();
    await dbSaveSequence(dbSeq);
    return this.toNurtureSequence(dbSeq);
  }

  async markStepResponded(sequenceId: string, stepNumber: number): Promise<NurtureSequence | null> {
    const dbSeq = await dbLoadSequence(sequenceId);
    if (!dbSeq) return null;

    const step = dbSeq.steps.find((s) => s.stepNumber === stepNumber);
    if (step) {
      step.status = "replied";
      step.responseAt = new Date();
    }

    dbSeq.lastActionAt = new Date();
    await dbSaveSequence(dbSeq);
    return this.toNurtureSequence(dbSeq);
  }

  async convertSequence(sequenceId: string): Promise<NurtureSequence | null> {
    const dbSeq = await dbLoadSequence(sequenceId);
    if (!dbSeq) return null;

    dbSeq.status = "converted";
    dbSeq.convertedAt = new Date();
    dbSeq.lastActionAt = new Date();

    dbSeq.steps.forEach((s) => {
      if (s.status === "pending") s.status = "skipped";
    });

    await dbSaveSequence(dbSeq);
    return this.toNurtureSequence(dbSeq);
  }

  async pauseSequence(sequenceId: string): Promise<NurtureSequence | null> {
    await dbUpdate("nurture_sequences", sequenceId, { status: "paused" });
    const dbSeq = await dbLoadSequence(sequenceId);
    return dbSeq ? this.toNurtureSequence(dbSeq) : null;
  }

  async resumeSequence(sequenceId: string): Promise<NurtureSequence | null> {
    await dbUpdate("nurture_sequences", sequenceId, { status: "active" });
    const dbSeq = await dbLoadSequence(sequenceId);
    return dbSeq ? this.toNurtureSequence(dbSeq) : null;
  }

  async getNextAction(sequenceId: string): Promise<NurtureStep | null> {
    const dbSeq = await dbLoadSequence(sequenceId);
    if (!dbSeq || dbSeq.status !== "active") return null;

    const stepIndex = dbSeq.currentStep;
    if (stepIndex >= dbSeq.steps.length) return null;

    return dbSeq.steps[stepIndex] as unknown as NurtureStep;
  }

  private toNurtureSequence(dbSeq: NonNullable<Awaited<ReturnType<typeof dbLoadSequence>>>): NurtureSequence {
    return {
      id: dbSeq.id,
      leadId: dbSeq.leadId,
      name: dbSeq.name,
      currentStep: dbSeq.currentStep,
      status: dbSeq.status as NurtureSequence["status"],
      startedAt: dbSeq.startedAt,
      lastActionAt: dbSeq.lastActionAt,
      convertedAt: dbSeq.convertedAt,
      steps: dbSeq.steps.map((s) => ({
        id: s.id,
        sequenceId: s.sequenceId,
        stepNumber: s.stepNumber,
        type: s.type as NurtureStepType,
        subject: s.subject,
        template: s.template,
        delayDays: s.delayDays,
        status: s.status as NurtureStep["status"],
        sentAt: s.sentAt,
        responseAt: s.responseAt,
        notes: s.notes,
      })),
    };
  }
}

// Singleton
let nurtureInstance: NurtureEngine | null = null;

export function getNurtureEngine(): NurtureEngine {
  if (!nurtureInstance) {
    nurtureInstance = new NurtureEngine();
  }
  return nurtureInstance;
}
