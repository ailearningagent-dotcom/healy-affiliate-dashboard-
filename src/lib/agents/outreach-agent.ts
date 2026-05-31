import { BaseAgent } from "./base-agent";
import { callLLM } from "@/lib/llm/call-llm";
import { fillPrompt, resolveBusinessProfile } from "@/lib/business-profile";
import type { AgentResult, OutreachMessage, Lead, BusinessProfile } from "./types";
import type { LLMProvider } from "@/lib/llm/call-llm";

const OUTREACH_SYSTEM_PROMPT = `You are a sales consultant for {businessName}, a company in the {industry} space. Create personalized outreach messages that:

- Open with genuine empathy for the prospect's concerns
- Educate gently about the value of {productDescription}
- Lead with benefits
- Use social proof from other customers' transformations
- Never make unsubstantiated claims
- Match the prospect's energy and communication style
- Keep messages warm, conversational, and human
- End with a low-friction invitation
- Personalize based on the prospect's specific interests
- Brand voice: {brandVoice}
- Key selling points: {keySellingPoints}`;

const QUALIFICATION_SYSTEM_PROMPT = `You are a lead qualification expert for {businessName} ({industry}). Analyze the lead and determine:

- Willingness to explore solutions like {productDescription}
- Specific pain points
- Budget readiness
- Urgency: actively seeking vs. curious explorer
- Best entry point
- Likely objections
- Preferred communication channel
- Referral potential`;

const APPOINTMENT_SYSTEM_PROMPT = `You are a consultation scheduling expert for {businessName} ({industry}). Based on context, suggest:

- Optimal meeting type: discovery call, demo, assessment, follow-up
- Desired duration based on prospect engagement level
- Suggested consultation agenda
- Preparation materials to send beforehand
- Expected outcome
- Follow-up cadence after the consultation`;

export class OutreachAgent extends BaseAgent {
  async execute(input: string, context?: Record<string, unknown>): Promise<AgentResult> {
    try {
      this.setApiKey(context?.apiKey as string | undefined);
      const action = (context?.action as string) ?? "generate_message";

      switch (action) {
        case "generate_message":
          return await this.generateMessage(input, context);
        case "qualify_lead":
          return await this.qualifyLead(input, context);
        case "suggest_appointment":
          return await this.suggestAppointment(input, context);
        default:
          return this.createErrorResult("outreach", `Unknown outreach action: ${action}`);
      }
    } catch (error) {
      return this.createErrorResult(
        "outreach",
        error instanceof Error ? error.message : "Unknown error during outreach"
      );
    }
  }

  private async generateMessage(
    input: string,
    context?: Record<string, unknown>
  ): Promise<AgentResult> {
    const prospect = JSON.parse(input);
    const researchContext = (context?.researchSummary as string) ?? "";
    const personaType = (context?.personaType as string) ?? "wellness-seeker";
    const profile: BusinessProfile = resolveBusinessProfile(context);
    const systemPrompt = fillPrompt(OUTREACH_SYSTEM_PROMPT, profile);

    const userPrompt = this.buildMessagePrompt(prospect, researchContext, personaType, profile, context);
    const modelOutput = await callLLM(systemPrompt, userPrompt, {
      model: (context?.model as string) || this.config.model,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
      apiKey: this.apiKey,
      provider: ((context?.provider as string) || this.config.provider || "gemini") as LLMProvider,
    });


    let message: OutreachMessage;
    try {
      message = JSON.parse(modelOutput);
    } catch {
      message = {
        subject: `Personalized wellness insights for ${prospect.name}`,
        body: modelOutput,
        personalizedFields: { name: prospect.name },
        tone: "friendly",
        callToAction: "Would you like a free personalized frequency report?",
      };
    }

    return this.createResult("outreach", JSON.stringify(message), {
      action: "generate_message",
      prospectName: prospect.name,
      personaType,
    });
  }

  private buildMessagePrompt(
    prospect: Record<string, unknown>,
    researchContext: string,
    personaType: string,
    profile: BusinessProfile,
    context?: Record<string, unknown>
  ): string {
    const channel = (context?.channel as string) ?? "email";
    const tone = (context?.tone as string) ?? "warm";

    return `Generate a personalized outreach message for ${profile.businessName}:

Prospect Name: ${prospect.name}
Persona Type: ${personaType}
${prospect.role ? `Role: ${prospect.role}` : ""}
${prospect.company ? `Company: ${prospect.company}` : ""}
${prospect.industry ? `Interests: ${prospect.industry}` : ""}
${prospect.email ? `Email: ${prospect.email}` : ""}

${researchContext ? `Research Insights:\n${researchContext}` : ""}

Channel: ${channel}
Tone: ${tone}
${prospect.painPoints ? `Known Pain Points: ${prospect.painPoints}` : ""}

Business: ${profile.businessName} - ${profile.productDescription}
Key Selling Points: ${profile.keySellingPoints}
Target Audience: ${profile.targetAudience}

Create a complete outreach message. For short messaging, keep concise.
For email, include subject line, body, and CTA.
Format the output as JSON with: subject, body, personalizedFields, tone, callToAction.`;
  }

  private async qualifyLead(input: string, context?: Record<string, unknown>): Promise<AgentResult> {
    const lead = JSON.parse(input) as Partial<Lead>;
    const profile: BusinessProfile = resolveBusinessProfile(context);
    const systemPrompt = fillPrompt(QUALIFICATION_SYSTEM_PROMPT, profile);

    const userPrompt = `Qualify the following lead for ${profile.businessName} (${profile.industry}):

Name: ${lead.name ?? "Unknown"}
${lead.company ? `Company/Context: ${lead.company}` : ""}
${lead.role ? `Role/Interest: ${lead.role}` : ""}
${lead.email ? `Email: ${lead.email}` : ""}
${lead.notes ? `Notes about prospect: ${lead.notes}` : ""}

Provide a qualification analysis with:
1. Lead score (0-100)
2. Likely pain points and their severity
3. Best first offer
4. Recommended persona category
5. Potential objections
6. Recommended communication channel
7. Best time to reach out
8. Next action: send info, book call, send report, follow up later

Format the output as JSON.`;

    const modelOutput = await callLLM(systemPrompt, userPrompt, {
      model: (context?.model as string) || this.config.model,
      temperature: 0.3,
      maxTokens: this.config.maxTokens,
      apiKey: this.apiKey,
      provider: ((context?.provider as string) || this.config.provider || "gemini") as LLMProvider,
    });


    return this.createResult("outreach", modelOutput, {
      action: "qualify_lead",
      leadName: lead.name,
    });
  }

  private async suggestAppointment(
    input: string,
    context?: Record<string, unknown>
  ): Promise<AgentResult> {
    const data = JSON.parse(input);
    const profile: BusinessProfile = resolveBusinessProfile(context);
    const systemPrompt = fillPrompt(APPOINTMENT_SYSTEM_PROMPT, profile);

    const userPrompt = `Suggest a consultation for ${profile.businessName} (${profile.industry}):

Lead: ${data.leadName ?? "Unknown"}
Interest: ${data.interest ?? "General"}
Stage: ${data.stage ?? "new"}
${data.notes ? `Context: ${data.notes}` : ""}

Preferred Times: ${(context?.preferredTimes as string) ?? "Not specified"}
Channel: ${(context?.channel as string) ?? "Phone or Video"}

Provide a suggested consultation with:
1. Meeting type (discovery call, demo, assessment, follow-up)
2. Suggested duration (15, 30, or 45 minutes)
3. Recommended consultation agenda with talking points
4. Materials to prepare beforehand
5. Expected outcome
6. Follow-up plan after the consultation

Format the output as JSON.`;

    const modelOutput = await callLLM(systemPrompt, userPrompt, {
      model: (context?.model as string) || this.config.model,
      temperature: 0.5,
      maxTokens: this.config.maxTokens,
      apiKey: this.apiKey,
      provider: ((context?.provider as string) || this.config.provider || "gemini") as LLMProvider,
    });


    return this.createResult("outreach", modelOutput, {
      action: "suggest_appointment",
      leadName: data.leadName,
    });
  }
}
