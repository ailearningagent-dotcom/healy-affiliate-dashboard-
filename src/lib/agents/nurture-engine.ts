import { callLLM } from "@/lib/llm/call-llm";
import { fillPrompt, resolveBusinessProfile } from "@/lib/business-profile";
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
  BusinessProfile,
} from "./types";
import type { LLMProvider } from "@/lib/llm/call-llm";

const NURTURE_SYSTEM_PROMPT = `You are a lead nurture and follow-up specialist for {businessName} ({industry}). Your role is to create effective nurture sequences that convert prospects into customers.

For each sequence, design steps that:
- Build trust through education about {productDescription}
- Address specific pain points of the prospect
- Provide value at every touchpoint
- Gradually introduce {businessName}'s solutions
- Use the right channel for each prospect
- Include social proof (testimonials, case studies)
- Create urgency without pressure
- End each step with a low-friction invitation to engage
- Follow a proven cadence: educate → engage → convert
- Brand voice: {brandVoice}
- Key selling points: {keySellingPoints}
- Target audience: {targetAudience}`;

const NURTURE_DEFAULTS: Record<string, NurtureStepType[]> = {
  "wellness-seeker": ["email", "whatsapp", "email", "phone_call", "email", "whatsapp"],
  practitioner: ["email", "linkedin_message", "email", "phone_call", "whatsapp", "email"],
  biohacker: ["email", "linkedin_message", "email", "whatsapp", "email", "phone_call"],
  "business-builder": ["whatsapp", "email", "phone_call", "whatsapp", "email", "phone_call"],
};

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
    const defaultStepTypes = NURTURE_DEFAULTS[personaType] ?? NURTURE_DEFAULTS["wellness-seeker"];

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
      const templates = this.getDefaultTemplates(personaType, lead);
      defaultStepTypes.forEach((type, i) => {
        const step: NurtureStep = {
          id: crypto.randomUUID(),
          sequenceId,
          stepNumber: i + 1,
          type,
          subject: this.getDefaultSubject(type, i, lead),
          template: templates[i] ?? `Follow up with ${lead.name} about their wellness journey and Healy frequency technology.`,
          delayDays: this.getDefaultDelay(i),
          status: "pending",
        };
        steps.push(step);
      });
    }

    const sequence: NurtureSequence = {
      id: sequenceId,
      leadId: lead.id,
      name: options?.name ?? `${lead.name} - ${personaType} nurture sequence`,
      steps,
      currentStep: 0,
      status: "active",
      startedAt: new Date(),
    };

    // Persist to DB
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

    // Mark current step as sent in DB
    if (nextStepIndex < dbSeq.steps.length) {
      dbSeq.steps[nextStepIndex].status = "sent";
      dbSeq.steps[nextStepIndex].sentAt = new Date();
    }

    // Move to next step or complete
    if (nextStepIndex + 1 >= dbSeq.steps.length) {
      dbSeq.status = "completed";
      dbSeq.steps.forEach((s) => {
        if (s.status === "pending") s.status = "skipped";
      });
    } else {
      dbSeq.currentStep = nextStepIndex + 1;
    }

    dbSeq.lastActionAt = new Date();

    // Persist to DB
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

  async generateAISequence(
    lead: Lead,
    context?: Record<string, unknown>
  ): Promise<NurtureSequence> {
    const profile: BusinessProfile = resolveBusinessProfile(context);
    const systemPrompt = fillPrompt(NURTURE_SYSTEM_PROMPT, profile);

    const userPrompt = `Create a personalized 6-step nurture sequence for this prospect:

Lead Name: ${lead.name}
Role / Interest: ${lead.role}
Company: ${lead.company}
Persona: ${lead.personaType}
Score: ${lead.score}
Notes: ${lead.notes}

${context?.painPoints ? `Known Pain Points: ${context.painPoints}` : ""}
${context?.goals ? `Goals: ${context.goals}` : ""}

Business: ${profile.businessName} (${profile.industry})
Product: ${profile.productDescription}
Target Audience: ${profile.targetAudience}

Generate a sequence with 6 steps that will nurture this prospect from initial contact to conversion.
For each step provide:
1. Channel (email, whatsapp, phone_call, linkedin_message)
2. Subject line (if applicable)
3. Brief content template (2-3 sentences)
4. Delay in days from previous step

Format as JSON array of { type: string, subject?: string, template: string, delayDays: number }`;

    try {
      const output = await callLLM(systemPrompt, userPrompt, {
        model: (context?.model as string) || "gemini-2.0-flash",
        temperature: 0.7,
        maxTokens: 2048,
        apiKey: this.apiKey,
        provider: ((context?.provider as string) || "gemini") as LLMProvider,
      });

      let customSteps: { type: NurtureStepType; subject?: string; template: string; delayDays: number }[];
      try {
        const cleaned = output.trim();
        const json = cleaned.startsWith("[") ? cleaned : cleaned.slice(cleaned.indexOf("["));
        customSteps = JSON.parse(json);
      } catch {
        // Fall back to default sequence
        customSteps = [];
      }

      return this.createSequence(lead, {
        customSteps: customSteps.length > 0 ? customSteps : undefined,
        name: `AI-Nurture: ${lead.name}`,
      });
    } catch {
      return this.createSequence(lead);
    }
  }

  private getDefaultSubject(type: NurtureStepType, stepIndex: number, lead: Lead): string {
    const subjects: Record<string, string[]> = {
      email: [
        `Welcome to Healy frequency wellness, ${lead.name}! 🌿`,
        `Natural approaches to ${lead.role?.includes("stress") ? "managing daily stress" : lead.role?.includes("sleep") ? "better sleep" : "your wellness journey"}`,
        `Real results: See what others are saying about frequency technology`,
        `${lead.name}, have you considered this approach?`,
        `Your personalized frequency report is ready!`,
        `One last thing before you go...`,
      ],
      whatsapp: [
        `Hi ${lead.name}! Thanks for your interest in frequency wellness 🎯`,
        `Quick question about your wellness goals!`,
        `Thought you might find this interesting ✨`,
        `How's your wellness journey going?`,
        `Special invitation for you! 🎉`,
        `Last chance to book your free consultation!`,
      ],
      linkedin_message: [
        `Enjoyed your post about holistic health!`,
        `Thought you might be interested in this wellness tech`,
        `Love what you're doing in the wellness space!`,
        `Would this fit your practice?`,
        `Your network might enjoy this!`,
      ],
      phone_call: [
        "Wellness check-in call",
        "Quick discovery chat",
        "Follow-up on your frequency report",
        "Schedule your free consultation",
      ],
      sms: [
        `Hi ${lead.name}, quick wellness tip for you today! 💚`,
        `Your free report is awaiting! Claim now.`,
        `Limited time: Free wellness consultation this week!`,
      ],
      social_engagement: [
        "Engage with their content",
        "Share relevant wellness article",
        "Comment on their post",
      ],
    };

    const typeSubjects = subjects[type] ?? subjects.email;
    return typeSubjects[Math.min(stepIndex, typeSubjects.length - 1)];
  }

  private getDefaultDelay(stepIndex: number): number {
    const delays = [0, 2, 5, 10, 14, 21];
    return delays[Math.min(stepIndex, delays.length - 1)];
  }

  private getDefaultTemplates(personaType: string, lead: Lead): string[] {
    const templates: Record<string, string[]> = {
      "wellness-seeker": [
        `Welcome ${lead.name}! Thank you for your interest in frequency wellness. I'd love to learn more about your specific wellness goals. Would you be open to a quick chat?`,
        `Hi ${lead.name}! Just checking in. Many people find that Healy's personalized frequencies help with exactly the concerns you mentioned. Have you had a chance to look at the information I sent?`,
        `Here's a quick success story: Sarah, a yoga instructor like many of our users, found significant stress relief using Healy's personalized programs. Everyone's journey is unique!`,
        `I'd love to offer you a free 15-minute wellness consultation to discuss how frequency technology might support your goals. No obligation - just a conversation.`,
        `As a follow-up to our conversation, I wanted to share that Healy comes with a 90-day satisfaction guarantee. You can try it completely risk-free.`,
        `This is my last message for now, but the door is always open! Whenever you're ready to explore frequency wellness, just reply here. Your free consultation is always available.`,
      ],
      practitioner: [
        `Dr. ${lead.name.split(" ").pop()}, I came across your practice and thought you might be interested in how Healy frequency technology could complement your existing treatments.`,
        `Many practitioners are adding Healy to their offerings as a non-invasive option for patients. It's CE-certified for pain management and requires minimal training.`,
        `I'd love to show you how Healy works in a quick 20-minute demo. No commitment - just a chance to see the technology in action.`,
        `Practitioners using Healy report high patient satisfaction and a new revenue stream. Several have integrated it as a paid add-on service.`,
        `We offer special practitioner pricing and wholesale options. Would you like to see our partnership proposal?`,
        `I'd be happy to set up a demo unit for you to try with staff first. Let me know if that interests you!`,
      ],
      biohacker: [
        `${lead.name}, based on your interest in optimization, I think you'll find Healy's technology fascinating. It uses individualized microcurrent frequencies - think of it as precision tuning for your body's energy field.`,
        `What if you could track your recovery, sleep quality, and focus with a wearable that costs less than many supplements? That's exactly what Healy users report.`,
        `Check out this data on how microcurrent frequency therapy affects HRV and recovery times. The early adopters in the biohacking community are seeing impressive results.`,
        `Would you be interested in a no-obligation trial? I can set up a demo for you to test the technology yourself.`,
        `Several biohackers I work with have replaced their morning stack with Healy sessions. It's worth a conversation.`,
        `Let me know if you want to dive deeper. Happy to share research papers and user experiences from the biohacking community.`,
      ],
      "business-builder": [
        `Hi ${lead.name}! I see you have experience in network marketing. Healy is growing rapidly in the wellness space and I think you'd be a great fit for our team.`,
        `The wellness industry is projected to reach $7T by 2025. Healy is positioned at the intersection of tech and holistic health - a unique opportunity.`,
        `Let me share some numbers: top Healy distributors are earning $10K+/month within their first year. The compensation plan rewards both product sales and team building.`,
        `Would you be open to a 20-minute call to discuss the Healy business opportunity? No pressure - just information.`,
        `Our team provides full training, marketing materials, and mentorship. You don't need a tech or wellness background to succeed.`,
        `The timing is perfect - Healy is expanding in North America and early adopters have a significant advantage. Want to learn more?`,
      ],
    };

    return templates[personaType] ?? templates["wellness-seeker"];
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
