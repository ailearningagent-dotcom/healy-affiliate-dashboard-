import { BaseAgent } from "./base-agent";
import { callLLM } from "@/lib/llm/call-llm";
import { fillPrompt, resolveBusinessProfile } from "@/lib/business-profile";
import type { AgentResult, CEOBrief, CEOPlan, CEOSubAgent, BusinessProfile } from "./types";
import type { LLMProvider } from "@/lib/llm/call-llm";

const CEO_SYSTEM_PROMPT = `You are the CEO of an AI-powered marketing company specializing in {businessName} {industry}. Your role is to:

- Set the strategic vision for the marketing team
- Break down high-level business goals into actionable department tasks
- Prioritize initiatives based on business impact and resources
- Coordinate between departments (Content, Research, Design, Sales, Finance)
- Review performance data and adjust strategy accordingly
- Think like a top-tier startup CEO — ambitious, resourceful, and data-driven

Your team consists of:
1. Content Team - Creates blog posts, social content, emails, landing pages
2. Research Team - Finds and qualifies prospects, analyzes competitors, researches keywords
3. Design Team - Creates posters, video concepts, brand assets
4. Sales Team - Generates outreach, qualifies leads, books consultations
5. Finance Team - Tracks budgets, ROI, cost per lead

Always provide clear, actionable direction with measurable outcomes.`;

const SUB_AGENT_PROMPTS: Record<CEOSubAgent, string> = {
  "task-prioritizer": `You are the CEO's Task Prioritization Officer. Analyze the business goal and:

1. Break the goal into 5-8 specific, actionable tasks
2. Assign each task to the correct department (Content, Research, Design, Sales, Finance)
3. Set priority level: critical, high, medium, or low
4. Estimate timeframes for each task
5. Identify task dependencies (which tasks must be completed first)
6. Suggest which tasks can be run in parallel
7. Identify quick wins (tasks with high impact, low effort)

Output as structured JSON.`,

  "department-coordinator": `You are the CEO's Department Coordinator. Based on the current strategy:

1. Create a detailed resource allocation plan across departments
2. Identify potential bottlenecks or resource conflicts
3. Suggest cross-department collaborations (e.g., Content + Design for social assets)
4. Create a phased timeline with clear milestones
5. Define success criteria for each phase
6. Recommend weekly check-in cadences between departments

Output as structured JSON.`,

  "performance-reviewer": `You are the CEO's Performance Reviewer. Analyze the provided metrics and:

1. Rate each department's performance (0-100)
2. Identify top-performing initiatives and why they worked
3. Flag underperforming areas with root cause analysis
4. Suggest specific course corrections for each department
5. Highlight key wins and lessons learned
6. Recommend reallocation of resources if needed
7. Set targets for the next review period

Output as structured JSON.`,
};

export class CEOAgent extends BaseAgent {
  async execute(input: string, context?: Record<string, unknown>): Promise<AgentResult> {
    try {
      this.setApiKey(context?.apiKey as string | undefined);
      const subAgent = (context?.subAgent as CEOSubAgent) ?? "task-prioritizer";
      const brief: CEOBrief = JSON.parse(input);
      const profile: BusinessProfile = resolveBusinessProfile(context);

      const rawSystemPrompt = SUB_AGENT_PROMPTS[subAgent] ?? CEO_SYSTEM_PROMPT;
      const systemPrompt = fillPrompt(rawSystemPrompt, profile);
      const userPrompt = this.buildPrompt(brief, subAgent, profile, context);

      const modelOutput = await callLLM(systemPrompt, userPrompt, {
        model: (context?.model as string) || this.config.model,
        temperature: subAgent === "performance-reviewer" ? 0.3 : 0.6,
        maxTokens: this.config.maxTokens,
        apiKey: this.apiKey,
        provider: ((context?.provider as string) || this.config.provider || "gemini") as LLMProvider,
      });

      let plan: CEOPlan;
      try {
        plan = JSON.parse(modelOutput) as CEOPlan;
      } catch {
        plan = {
          executiveSummary: modelOutput.slice(0, 500),
          prioritizedTasks: [],
          resourceAllocation: [],
          timeline: [],
          riskAssessment: [],
          kpis: [],
          departments: [],
        };
      }

      return this.createResult("ceo", JSON.stringify(plan), {
        subAgent,
        goal: brief.goal,
        label: this.getSubAgentLabel(subAgent),
      });
    } catch (error) {
      return this.createErrorResult(
        "ceo",
        error instanceof Error ? error.message : "Unknown CEO strategy error"
      );
    }
  }

  private getSubAgentLabel(subAgent: CEOSubAgent): string {
    const labels: Record<CEOSubAgent, string> = {
      "task-prioritizer": "Task Prioritization",
      "department-coordinator": "Department Coordination",
      "performance-reviewer": "Performance Review",
    };
    return labels[subAgent];
  }

  private buildPrompt(brief: CEOBrief, _subAgent: CEOSubAgent, profile: BusinessProfile, context?: Record<string, unknown>): string {
    const sections = [
      `Business Goal: ${brief.goal}`,
      `Timeframe: ${brief.timeframe}`,
      `Target Outcome: ${brief.targetOutcome}`,
      `Priority Level: ${brief.priority}`,
    ];

    if (brief.budget) sections.push(`Budget: ${brief.budget}`);
    if (context?.departmentMetrics) {
      sections.push(`\nCurrent Department Metrics:\n${JSON.stringify(context.departmentMetrics, null, 2)}`);
    }
    if (context?.pastPerformance) {
      sections.push(`\nPast Performance Data:\n${JSON.stringify(context.pastPerformance, null, 2)}`);
    }

    sections.push(`\nBusiness Context: This is for ${profile.businessName} ${profile.industry} - ${profile.productDescription}. Target audience includes ${profile.targetAudience}. Key selling points: ${profile.keySellingPoints}. Brand voice: ${profile.brandVoice}.`);

    return sections.join("\n\n");
  }
}
