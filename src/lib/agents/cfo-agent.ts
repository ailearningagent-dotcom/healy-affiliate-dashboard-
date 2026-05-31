import { BaseAgent } from "./base-agent";
import { callLLM } from "@/lib/llm/call-llm";
import { fillPrompt, resolveBusinessProfile } from "@/lib/business-profile";
import type { AgentResult, CFOBrief, FinancialReport, CFOSubAgent, BusinessProfile } from "./types";
import type { LLMProvider } from "@/lib/llm/call-llm";

const CFO_SYSTEM_PROMPT = `You are the CFO of an AI-powered marketing company specializing in {businessName} {industry}. Your responsibilities:

- Budget planning and allocation across marketing channels
- ROI analysis for campaigns and lead generation activities
- Cost per lead and cost per acquisition tracking
- Financial projections and breakeven analysis
- Channel optimization recommendations based on financial data
- Balance growth targets with budget constraints

Think like a world-class venture-backed CFO — data-driven, strategic, and focused on unit economics. Every recommendation must be grounded in metrics.`;

const SUB_AGENT_PROMPTS: Record<CFOSubAgent, string> = {
  "budget-planner": `You are the CFO's Budget Planning Officer. Analyze the campaign brief and:

1. Allocate budget across key channels (outreach, email campaigns, content creation, design assets, lead gen tools)
2. Recommend optimal channel mix based on typical industry benchmarks
3. Suggest budget phasing (weekly/monthly spend)
4. Identify cost-saving opportunities without sacrificing quality
5. Include contingency allocation (typically 10-15%)
6. Project expected lead volume per channel based on budget

Industry benchmarks:
- Cost per lead: $5-15 for warm leads
- Cost per appointment: $20-50
- Direct outreach: very low cost, high engagement
- Content marketing: moderate cost, high long-term ROI

Output as structured JSON.`,

  "roi-analyst": `You are the CFO's ROI Analysis Officer. Based on the campaign data:

1. Calculate projected ROI across 30, 60, and 90-day timeframes
2. Breakeven analysis — how many appointments needed to recoup investment
3. Compare channel efficiency (cost per outcome vs. conversion rate)
4. Lifetime value projection per customer type
5. Identify highest-leverage opportunities for scaling spend
6. Risk-adjusted return projections
7. Provide confidence levels for each projection

Output as structured JSON.`,

  "cost-tracker": `You are the CFO's Cost Tracking Analyst. Based on the provided data:

1. Break down costs by category and campaign
2. Calculate accurate cost per lead (CPL) and cost per acquisition (CPA)
3. Identify cost outliers or inefficiencies
4. Compare actual spend vs. budget with variance analysis
5. Recommend optimizations to reduce CPL/CPA
6. Track burn rate and runway
7. Provide department-level cost summaries
8. Flag any budget overruns or underspend

Output as structured JSON.`,
};

export class CFOAgent extends BaseAgent {    async execute(input: string, context?: Record<string, unknown>): Promise<AgentResult> {
    try {
      this.setApiKey(context?.apiKey as string | undefined);
      const subAgent = (context?.subAgent as CFOSubAgent) ?? "budget-planner";
      const brief: CFOBrief = JSON.parse(input);
      const profile: BusinessProfile = resolveBusinessProfile(context);

      const rawSystemPrompt = SUB_AGENT_PROMPTS[subAgent] ?? CFO_SYSTEM_PROMPT;
      const systemPrompt = fillPrompt(rawSystemPrompt, profile);
      const userPrompt = this.buildPrompt(brief, subAgent, profile, context);

      const modelOutput = await callLLM(systemPrompt, userPrompt, {
        model: (context?.model as string) || this.config.model,
        temperature: 0.3, // CFO needs precision
        maxTokens: this.config.maxTokens,
        apiKey: this.apiKey,
        provider: ((context?.provider as string) || this.config.provider || "gemini") as LLMProvider,
      });

      let report: FinancialReport;
      try {
        report = JSON.parse(modelOutput) as FinancialReport;
      } catch {
        report = {
          budgetAllocation: [],
          costPerLead: [],
          roiProjection: [],
          breakevenAnalysis: { breakevenPoint: "", timelineDays: 0, notes: "" },
          recommendations: [],
        };
      }

      return this.createResult("cfo", JSON.stringify(report), {
        subAgent,
        campaignName: brief.campaignName,
        label: this.getSubAgentLabel(subAgent),
      });
    } catch (error) {
      return this.createErrorResult(
        "cfo",
        error instanceof Error ? error.message : "Unknown financial analysis error"
      );
    }
  }

  private getSubAgentLabel(subAgent: CFOSubAgent): string {
    const labels: Record<CFOSubAgent, string> = {
      "budget-planner": "Budget Planning",
      "roi-analyst": "ROI Analysis",
      "cost-tracker": "Cost Tracking",
    };
    return labels[subAgent];
  }

  private buildPrompt(brief: CFOBrief, _subAgent: CFOSubAgent, profile: BusinessProfile, context?: Record<string, unknown>): string {
    const sections = [
      `Campaign: ${brief.campaignName}`,
      `Total Budget: $${brief.budget.toLocaleString()}`,
      `Projected Leads: ${brief.projectedLeads}`,
      `Projected Appointments: ${brief.projectedAppointments}`,
      `Duration: ${brief.durationDays} days`,
      `Channels: ${brief.channels.join(", ")}`,
    ];

    if (context?.existingMetrics) {
      sections.push(`\nExisting Campaign Metrics:\n${JSON.stringify(context.existingMetrics, null, 2)}`);
    }
    if (context?.pastCampaigns) {
      sections.push(`\nPast Campaign Data:\n${JSON.stringify(context.pastCampaigns, null, 2)}`);
    }

    sections.push(`\nBusiness Context: This is a campaign for ${profile.businessName} (${profile.industry}) - ${profile.productDescription}. Target audience: ${profile.targetAudience}. Key selling points: ${profile.keySellingPoints}. Lead quality matters more than quantity.`);

    return sections.join("\n\n");
  }
}
