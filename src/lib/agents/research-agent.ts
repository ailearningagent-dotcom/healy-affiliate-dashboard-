import { BaseAgent } from "./base-agent";
import { callLLM } from "@/lib/llm/call-llm";
import { fillPrompt, resolveBusinessProfile } from "@/lib/business-profile";
import type { AgentResult, ResearchTarget, ResearchResult, BusinessProfile } from "./types";
import type { LLMProvider } from "@/lib/llm/call-llm";

const RESEARCH_TYPES: Record<string, string> = {
  "wellness-seeker": `You are a sales intelligence researcher for {businessName}, a company in the {industry} space. Your task is to analyze the prospect and determine their fit for {productDescription}.

Research the prospect and provide:
- Current challenges and pain points
- Previous approaches tried
- Openness to solutions like {productDescription}
- Budget range
- Decision-making style (research-heavy vs. referral-driven)
- Social media presence in relevant communities
- Best approach for initial outreach (education vs. results-focused)
- Likely objections`,
  practitioner: `You are a practitioner/partner researcher for {businessName}, a company in the {industry} space. Your task is to analyze a professional and assess partnership potential.

Research the practitioner/professional and provide:
- Type of practice/business
- Current tools and modalities they use
- Client/customer base size and demographics
- Business model
- Openness to adding new offerings to their practice
- Current recommendations they make to clients
- Pain points in their business (retention, revenue, differentiation)
- How {productDescription} could complement their existing offerings
- Possible partnership model (referral partner, reseller, affiliate)
- Recommended outreach angle`,
  biohacker: `You are an enthusiast/early-adopter researcher for {businessName} ({industry}). Research the prospect and provide:

- Current stack and protocols they use
- Areas of optimization focus
- Level of tech-savviness and adoption
- Budget for tools and subscriptions
- Social media presence in relevant communities
- Influencers or thought leaders they follow
- Openness to emerging technologies
- Previous experience with similar products/solutions
- Competing products they may already use
- Best angle for outreach`,
  "business-builder": `You are a business opportunity researcher for {businessName} ({industry}). Research the prospect for the business/partnership angle.

Research the prospect and provide:
- Current occupation and professional background
- Previous entrepreneurial or partnership experience
- Current side hustles or business activities
- Social media following and influence level
- Existing network in relevant space
- Motivations for seeking a business opportunity
- Budget for starting
- Risk tolerance and commitment level
- Key decision factors
- Recommended positioning`,
};

export class ResearchAgent extends BaseAgent {    async execute(input: string, context?: Record<string, unknown>): Promise<AgentResult> {
    try {
      this.setApiKey(context?.apiKey as string | undefined);
      const target: ResearchTarget = JSON.parse(input);
      const researchType = (context?.researchType as string) ?? "wellness-seeker";
      const profile: BusinessProfile = resolveBusinessProfile(context);
      const systemPrompt = fillPrompt(RESEARCH_TYPES[researchType] ?? RESEARCH_TYPES["wellness-seeker"], profile);

      const userPrompt = this.buildResearchPrompt(target, researchType, profile);
      const modelOutput = await callLLM(systemPrompt, userPrompt, {
        model: (context?.model as string) || this.config.model,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        apiKey: this.apiKey,
        provider: ((context?.provider as string) || this.config.provider || "gemini") as LLMProvider,
      });

      const result: ResearchResult = {
        targetName: target.companyName ?? target.role ?? "Research Target",
        summary: this.extractSummary(modelOutput),
        painPoints: this.extractListItems(modelOutput, "pain", "challenge", "problem", "struggle"),
        opportunities: this.extractListItems(modelOutput, "opportunity", "gap", "potential", "angle"),
        keyInsights: this.extractListItems(modelOutput, "insight", "recommend", "finding", "approach"),
      };

      return this.createResult("research", JSON.stringify(result), {
        researchType,
        targetName: result.targetName,
      });
    } catch (error) {
      return this.createErrorResult(
        "research",
        error instanceof Error ? error.message : "Unknown error during research"
      );
    }
  }

  private buildResearchPrompt(target: ResearchTarget, type: string, profile: BusinessProfile): string {
    const sections: string[] = [];

    if (target.companyName) sections.push(`Name / Company: ${target.companyName}`);
    if (target.industry) sections.push(`Industry / Niche: ${target.industry}`);
    if (target.role) sections.push(`Role / Title: ${target.role}`);
    if (target.location) sections.push(`Location: ${target.location}`);
    if (target.website) sections.push(`Website / Social: ${target.website}`);

    return `Conduct a ${type} research analysis for the following prospect:

${sections.join("\n")}

Provide a comprehensive analysis with specific, actionable insights for ${profile.businessName} (${profile.productDescription}). Key selling points: ${profile.keySellingPoints}. Format your response with clear section headings.`;
  }

  private extractSummary(output: string): string {
    const lines = output.split("\n").filter((l) => l.trim());
    return lines.slice(0, 5).join(" ").replace(/#{1,6}\s/g, "").slice(0, 500);
  }

  private extractListItems(output: string, ...keywords: string[]): string[] {
    const items: string[] = [];
    const lines = output.split("\n");

    let capturing = false;
    for (const line of lines) {
      const trimmed = line.trim().toLowerCase();

      if (keywords.some((kw) => trimmed.includes(kw))) {
        capturing = true;
        continue;
      }

      if (capturing) {
        if (trimmed.match(/^\d+[.)]/) || trimmed.startsWith("-") || trimmed.startsWith("•")) {
          const clean = trimmed.replace(/^[\d.)\s•-]+/, "").trim();
          if (clean.length > 10) items.push(clean);
        } else if (trimmed === "" || trimmed.startsWith("#")) {
          if (items.length > 0) break;
        }
      }
    }

    return items.slice(0, 10);
  }
}
