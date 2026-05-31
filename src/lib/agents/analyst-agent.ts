import { BaseAgent } from "./base-agent";
import { callLLM } from "@/lib/llm/call-llm";
import { fillPrompt, resolveBusinessProfile } from "@/lib/business-profile";
import type { AgentResult, AnalystBrief, ScrapedLeadData, MarketIntelligence, AnalystSubAgent, BusinessProfile } from "./types";
import type { LLMProvider } from "@/lib/llm/call-llm";

const ANALYST_SYSTEM_PROMPT = `You are the Chief Data Analyst for an AI-powered marketing company specializing in {businessName} {industry}. Your role:

- Research and identify high-quality prospects across relevant communities
- Analyze market trends in {industry} and related fields
- Enrich lead data with insights from public sources
- Generate actionable market intelligence for the sales team
- Find lead sources: industry directories, practitioner listings, online communities

You're a blend of world-class data scientist and market researcher — systematic, thorough, and insight-driven.`;

const SUB_AGENT_PROMPTS: Record<AnalystSubAgent, string> = {
  "web-scraper": `You are the Data Analyst's Web Scraping Specialist. Based on the target criteria:

1. Identify specific places to find prospects:
   - Industry-specific directories and listings
   - Relevant online communities and forums
   - Social media professionals in the space
   - Business directories relevant to {targetAudience}

2. For each source, specify:
   - URL / platform
   - Search query to use
   - Expected profile data available
   - Estimated lead quality (1-10)
   - Scraping difficulty (easy, medium, hard)
   - Number of prospects available

3. Create a list of actual prospect profiles with:
   - Name (realistic), company/studio name, role/title
   - Estimated email format / contact discovery method
   - Interest alignment with {businessName}
   - Lead score (0-100)
   - Best outreach angle

Output as structured JSON with a "prospects" array and "sources" array.`,

  "lead-enricher": `You are the Data Analyst's Lead Enrichment Specialist. Enrich a prospect profile:

1. Infer likely:
   - Pain points based on their role/industry
   - Budget for products/services in this space
   - Decision-making authority
   - Existing routines and products used
   - Social media presence
   - Professional network size
   - Openness to {productDescription}

2. Suggest:
   - The best angle for {businessName} for this specific prospect
   - Personalized outreach hook
   - Likely objections and how to address them
   - Best time and channel to reach them
   - Related prospects in their network (lookalikes)

Output as structured JSON with enriched profile data.`,

  "market-analyst": `You are the Data Analyst's Market Intelligence Specialist. Research and provide:

1. Current trends in {industry}
2. Competitor landscape:
   - Other solutions in this space
   - Related products and services
3. Keyword opportunities for content marketing
4. Audience insights for each persona type
5. Emerging sub-markets
6. Regulatory landscape and compliance considerations
7. Partnership opportunities

Output as structured JSON.`,
};

export class AnalystAgent extends BaseAgent {    async execute(input: string, context?: Record<string, unknown>): Promise<AgentResult> {
    try {
      this.setApiKey(context?.apiKey as string | undefined);
      const subAgent = (context?.subAgent as AnalystSubAgent) ?? "market-analyst";
      const brief: AnalystBrief = JSON.parse(input);
      const profile: BusinessProfile = resolveBusinessProfile(context);

      const rawSystemPrompt = SUB_AGENT_PROMPTS[subAgent] ?? ANALYST_SYSTEM_PROMPT;
      const systemPrompt = fillPrompt(rawSystemPrompt, profile);
      const userPrompt = this.buildPrompt(brief, subAgent, profile, context);

      const modelOutput = await callLLM(systemPrompt, userPrompt, {
        model: (context?.model as string) || this.config.model,
        temperature: subAgent === "web-scraper" ? 0.4 : 0.5,
        maxTokens: this.config.maxTokens,
        apiKey: this.apiKey,
        provider: ((context?.provider as string) || this.config.provider || "gemini") as LLMProvider,
      });

      // Try to parse as structured data
      let scraped: { prospects?: ScrapedLeadData[]; sources?: Record<string, unknown>[] } | null = null;
      let intelligence: MarketIntelligence | null = null;

      try {
        const parsed = JSON.parse(modelOutput);
        if (parsed.prospects || parsed.sources) {
          scraped = parsed;
        } else if (parsed.trends || parsed.competitorAnalysis) {
          intelligence = parsed as MarketIntelligence;
        }
      } catch {
        // Not JSON, return raw output
      }

      return this.createResult("analyst", JSON.stringify(scraped ?? intelligence ?? { raw: modelOutput }), {
        subAgent,
        targetMarket: brief.targetMarket,
        label: this.getSubAgentLabel(subAgent),
      });
    } catch (error) {
      return this.createErrorResult(
        "analyst",
        error instanceof Error ? error.message : "Unknown analyst error"
      );
    }
  }

  private getSubAgentLabel(subAgent: AnalystSubAgent): string {
    const labels: Record<AnalystSubAgent, string> = {
      "web-scraper": "Web Lead Scraper",
      "lead-enricher": "Lead Enrichment",
      "market-analyst": "Market Intelligence",
    };
    return labels[subAgent];
  }

  private buildPrompt(brief: AnalystBrief, subAgent: AnalystSubAgent, profile: BusinessProfile, context?: Record<string, unknown>): string {
    const sections = [
      `Target Market: ${brief.targetMarket}`,
      `Industry: ${brief.industry}`,
      `Location: ${brief.location}`,
      `Roles to Target: ${brief.roles.join(", ")}`,
      `Max Leads: ${brief.maxLeads}`,
      `Sources: ${brief.sources.join(", ")}`,
    ];

    if (context?.existingLeads) {
      sections.push(`\nExisting Lead Data for Reference:\n${JSON.stringify(context.existingLeads, null, 2)}`);
    }
    if (context?.competitorNames) {
      sections.push(`\nKnown Competitors: ${context.competitorNames}`);
    }

    sections.push(`\nBusiness Context: This is for ${profile.businessName} in the ${profile.industry} space. ${profile.productDescription}. Target audience: ${profile.targetAudience}.`);

    return sections.join("\n\n");
  }
}
