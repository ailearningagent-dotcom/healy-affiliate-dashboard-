import { BaseAgent } from "./base-agent";
import { callLLM } from "@/lib/llm/call-llm";
import { fillPrompt, resolveBusinessProfile } from "@/lib/business-profile";
import type { AgentResult, SalesBrief, LeadScoring, SalesCadence, SalesSubAgent, Lead, BusinessProfile } from "./types";
import type { LLMProvider } from "@/lib/llm/call-llm";

const SALES_SYSTEM_PROMPT = `You are the Head of Sales for {businessName}, a company in the {industry} space. You lead a team of AI sales development specialists. Your approach:

- Warm, consultative selling — never pushy or aggressive
- Educate first, sell second — build trust through value
- Personalize every interaction based on prospect research
- Focus on qualifying efficiently so the human consultant's time is maximized
- Multi-channel outreach
- Nurture leads who aren't ready yet — don't discard them

Your sales philosophy: "We're not selling a product, we're offering a solution."

Key selling points:
- {keySellingPoints}
- {productDescription}
- Brand voice: {brandVoice}
- Target audience: {targetAudience}`;

const SUB_AGENT_PROMPTS: Record<SalesSubAgent, string> = {
  "lead-qualifier": `You are the Sales Team's Lead Qualification Specialist. Analyze the lead against the BANT+ framework:

BUDGET (0-10):
- Can they afford the investment?
- Have they spent similar amounts on related products/services before?
- Are they a professional who can write it off as a business expense?

AUTHORITY (0-10):
- Are they the decision-maker for their own purchases?
- If a professional: do they make purchasing decisions for their business?
- If a partner: do they have the resources to start?

NEED (0-10):
- How severe is their pain point?
- Have they tried other solutions without success?
- Is our offering logically aligned with their needs?

TIMELINE (0-10):
- Are they actively seeking solutions or just curious?
- Do they have a specific event/deadline driving urgency?
- Are they in "research mode" or "decision mode"?

Also assess:
- Persona fit
- Channel preference
- Likely objections
- Referral potential
- Best next action

Calculate overall score (0-100) and categorize: Platinum (80+), Gold (65-79), Silver (50-64), Bronze (<50)

Output as structured JSON with detailed scoring and recommendations.`,

  "message-personalizer": `You are the Sales Team's Message Personalization Specialist. Create personalized outreach:

Based on the lead profile and research, craft messages that:
1. OPEN with genuine empathy — show you understand their specific situation
2. EDUCATE with a relevant insight
3. CONNECT their pain point to a benefit of {productDescription}
4. OFFER a specific, low-friction next step
5. KEEP IT CONCISE — short for social messaging, longer for email
6. INCLUDE social proof when relevant
7. END with an open question, not a hard ask

For each message variant, specify:
- Channel the message is optimized for
- Exact text with personalization markers
- Best time to send
- Expected response likelihood (0-100)
- Follow-up if no response in 48 hours

Create 2 variants: one warm/educational, one results-focused.

Output as structured JSON.`,

  "appointment-scheduler": `You are the Sales Team's Appointment Scheduling Specialist. Based on the lead engagement:

1. Determine the right type of consultation:
   - DISCOVERY CALL (15min): For new, unqualified leads — learn about them, offer a free resource
   - ASSESSMENT (30min): For warm leads — deeper dive, demo
   - PRODUCT DEMO (45min): For hot leads — hands-on demo, answer questions, pricing
   - FOLLOW-UP (20min): For past consultations — check in, address objections, close

2. Suggest:
   - Optimal meeting duration based on engagement signals
   - Agenda and talking points
   - What to prepare beforehand (videos, testimonials, FAQs)
   - Expected outcome and next step after the meeting
   - Best time slots based on persona patterns

3. Preparation materials to send:
   - Introduction video link
   - Free resource (if not sent already)
   - FAQ sheet
   - Testimonial from similar prospect

Output as structured JSON.`,

  "followup-manager": `You are the Sales Team's Follow-up & Nurture Manager. Create a full nurture cadence:

Design a multi-step follow-up sequence based on lead engagement level:

For WARM leads (engaged, interested):
- Day 1: Thank you + free resource
- Day 3: Educational insight
- Day 7: Testimonial from similar customer
- Day 14: Check-in with a question
- Day 21: Invitation to next step
- Day 30: Final gentle reminder + open door

For COLD leads (initial outreach, no response):
- Day 1: Initial personalized message
- Day 3: Value-add follow-up (new insight, article)
- Day 7: Social proof (testimonial)
- Day 14: Different angle follow-up
- Day 21: Breakup message — "We'll be here when you're ready"
- Day 60: Re-engagement with new offer

For each step specify:
- Day number, action type, channel, template text, goal
- A/B test variants for subject lines/hooks
- Escalation triggers (reply, click, book)

Output as structured JSON with a "cadence" object containing ordered steps.`,
};

export class SalesAgent extends BaseAgent {    async execute(input: string, context?: Record<string, unknown>): Promise<AgentResult> {
    try {
      this.setApiKey(context?.apiKey as string | undefined);
      const subAgent = (context?.subAgent as SalesSubAgent) ?? "lead-qualifier";
      const brief: SalesBrief = JSON.parse(input);
      const profile: BusinessProfile = resolveBusinessProfile(context);

      const rawSystemPrompt = SUB_AGENT_PROMPTS[subAgent] ?? SALES_SYSTEM_PROMPT;
      const systemPrompt = fillPrompt(rawSystemPrompt, profile);
      const userPrompt = this.buildPrompt(brief, subAgent, profile, context);

      const modelOutput = await callLLM(systemPrompt, userPrompt, {
        model: (context?.model as string) || this.config.model,
        temperature: subAgent === "message-personalizer" ? 0.7 : 0.4,
        maxTokens: this.config.maxTokens,
        apiKey: this.apiKey,
        provider: ((context?.provider as string) || this.config.provider || "gemini") as LLMProvider,
      });

      let parsed: LeadScoring | SalesCadence | Record<string, unknown> | null = null;
      try {
        parsed = JSON.parse(modelOutput);
      } catch {
        // Use raw output
      }

      return this.createResult("sales", parsed ? JSON.stringify(parsed) : modelOutput, {
        subAgent,
        leadName: brief.leadName,
        personaType: brief.personaType,
        channel: brief.channel,
        label: this.getSubAgentLabel(subAgent),
      });
    } catch (error) {
      return this.createErrorResult(
        "sales",
        error instanceof Error ? error.message : "Unknown sales agent error"
      );
    }
  }

  private getSubAgentLabel(subAgent: SalesSubAgent): string {
    const labels: Record<SalesSubAgent, string> = {
      "lead-qualifier": "Lead Qualification",
      "message-personalizer": "Message Personalization",
      "appointment-scheduler": "Appointment Scheduling",
      "followup-manager": "Follow-up Management",
    };
    return labels[subAgent];
  }

  private buildPrompt(brief: SalesBrief, subAgent: SalesSubAgent, profile: BusinessProfile, context?: Record<string, unknown>): string {
    const sections = [
      `Lead: ${brief.leadName}`,
      `Company: ${brief.leadCompany}`,
      `Role: ${brief.leadRole}`,
      `Persona: ${brief.personaType}`,
      `Channel: ${brief.channel}`,
      `Urgency: ${brief.urgency}`,
    ];

    if (brief.researchSummary) {
      sections.push(`\nResearch Summary:\n${brief.researchSummary}`);
    }
    if (brief.previousInteractions) {
      sections.push(`\nPrevious Interactions:\n${brief.previousInteractions}`);
    }
    if (context?.currentLeadScore) {
      sections.push(`\nCurrent Lead Score: ${context.currentLeadScore}`);
    }

    sections.push(`\nBusiness Context: This is for ${profile.businessName} (${profile.industry}) - ${profile.productDescription}. Key selling points: ${profile.keySellingPoints}. Consultative, warm sales approach. No high-pressure tactics. Focus on education and value.`);

    return sections.join("\n\n");
  }
}
