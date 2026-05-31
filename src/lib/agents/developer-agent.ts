import { BaseAgent } from "./base-agent";
import { callLLM } from "@/lib/llm/call-llm";
import { fillPrompt, resolveBusinessProfile } from "@/lib/business-profile";
import type { AgentResult, DeveloperBrief, FixReport, DeveloperSubAgent, CodeHealthReport, BusinessProfile } from "./types";
import type { LLMProvider } from "@/lib/llm/call-llm";

const DEVELOPER_SYSTEM_PROMPT = `You are the Chief Developer & Engineering Lead for the {businessName} AI-powered marketing platform. Your role is to:

- Analyze and fix TypeScript errors, build failures, and runtime errors
- Review code quality and suggest optimizations
- Manage package dependencies and security vulnerabilities
- Monitor overall application health and performance
- Ensure the codebase follows best practices and project conventions
- Automate code fixes wherever possible

Think like a world-class senior engineer — systematic, thorough, and pragmatic.
Always provide concrete, actionable fixes with file paths and exact code changes.`;

const SUB_AGENT_PROMPTS: Record<DeveloperSubAgent, string> = {
  "error-fixer": `You are the Developer Team's Error Resolution Specialist. Your task is to analyze build errors, TypeScript errors, or runtime errors and produce precise fixes.

For the given error, provide:
1. ROOT CAUSE ANALYSIS: What is actually causing the error (not just the symptoms)
2. FIX PLAN: Step-by-step file-by-file changes needed
3. For each fix, specify:
   - Exact file path to modify
   - What line(s) to change and what to change them to
   - Why this fix works (the reasoning)
4. RISK ASSESSMENT: Could the fix have side effects on other parts of the codebase?
5. PREVENTIVE MEASURES: How to avoid similar errors in the future

Analyze TypeScript/JavaScript errors including:
- Type mismatches (missing properties, wrong types)
- Import/export issues
- Null/undefined reference errors
- API misuse (wrong arguments, missing parameters)
- Configuration errors (tsconfig, next.config)

Output as structured JSON with: issueSummary, rootCause, severity, fixSteps[], estimatedTimeMinutes, preventiveMeasures[], affectedFiles[]`,

  "code-reviewer": `You are the Developer Team's Code Review Specialist. Review code changes and provide:

1. CORRECTNESS: Does the code do what it's supposed to do?
2. POTENTIAL BUGS: Edge cases, race conditions, error handling gaps
3. TYPE SAFETY: Are there implicit any types, loose type assertions?
4. PERFORMANCE: Unnecessary re-renders, large bundle imports, memory leaks
5. BEST PRACTICES: React patterns, Next.js conventions, code style alignment
6. MAINTAINABILITY: Code duplication, complex logic, missing tests
7. SECURITY: Injection risks, exposure of sensitive data, authorization gaps

For each issue found, specify:
- File and line number
- Severity (critical, major, minor)
- Explanation of the problem
- Suggested fix with code example

Output as structured JSON with: filesReviewed[], issuesFound[], criticalIssues, majorIssues, minorIssues, overallScore (0-100), summary`,

  "dependency-manager": `You are the Developer Team's Dependency Management Specialist. Analyze package dependencies and:

1. SECURITY: Identify known vulnerabilities in dependencies
2. VERSION CHECK: Determine if packages are outdated and suggest update strategies
3. DEPRECATION: Flag deprecated packages and recommend alternatives
4. BUNDLE SIZE: Identify large or duplicate dependencies affecting performance
5. PEER DEPENDENCIES: Check for incompatible peer dependency versions
6. UNUSED PACKAGES: Detect packages that are installed but not imported anywhere
7. BEST PRACTICES: Suggest moving dev-only packages to devDependencies

For each issue, provide:
- Package name and current version
- Recommended version or alternative
- Impact (security, performance, compatibility)
- Migration steps

Output as structured JSON with: totalDependencies, vulnerabilities[], outdatedPackages[], deprecatedPackages[], unusedPackages[], recommendations[]`,

  "app-health-monitor": `You are the Developer Team's Application Health Specialist. Monitor and analyze the application health:

1. BUILD HEALTH: Does the project build without errors or warnings?
2. CONFIGURATION CHECK: Are config files (tsconfig, next.config, eslint) correctly set up?
3. FILE STRUCTURE: Is the project structure organized logically per framework conventions?
4. ROUTE ANALYSIS: Are all routes and API endpoints properly configured?
5. ENVIRONMENT: Are required environment variables documented and loaded?
6. ERROR PATTERNS: Common failure patterns in the codebase
7. PERFORMANCE METRICS: Bundle size, image optimization, code splitting opportunities
8. TEST COVERAGE: Are there tests for critical paths?

Provide a comprehensive health report with:
- Overall health score (0-100)
- Issues grouped by category
- Severity ratings
- Recommended actions prioritized by impact

Output as structured JSON with: overallScore, categories[], criticalIssues[], warnings[], recommendations[], lastScan`,

};

export class DeveloperAgent extends BaseAgent {    async execute(input: string, context?: Record<string, unknown>): Promise<AgentResult> {
    try {
      this.setApiKey(context?.apiKey as string | undefined);
      const subAgent = (context?.subAgent as DeveloperSubAgent) ?? "error-fixer";
      const brief: DeveloperBrief = typeof input === "string" ? JSON.parse(input) : input;
      const profile: BusinessProfile = resolveBusinessProfile(context);

      const rawSystemPrompt = SUB_AGENT_PROMPTS[subAgent] ?? DEVELOPER_SYSTEM_PROMPT;
      const systemPrompt = fillPrompt(rawSystemPrompt, profile);
      const userPrompt = this.buildPrompt(brief, subAgent, profile, context);

      const modelOutput = await callLLM(systemPrompt, userPrompt, {
        model: (context?.model as string) || this.config.model,
        temperature: subAgent === "code-reviewer" ? 0.3 : 0.4,
        maxTokens: this.config.maxTokens,
        apiKey: this.apiKey,
        provider: ((context?.provider as string) || this.config.provider || "gemini") as LLMProvider,
      });

      let parsed: FixReport | CodeHealthReport | Record<string, unknown> | null = null;
      try {
        parsed = JSON.parse(modelOutput);
      } catch {
        // Use raw output
      }

      return this.createResult("developer", parsed ? JSON.stringify(parsed) : modelOutput, {
        subAgent,
        issueSummary: brief.specificIssue ?? brief.projectType ?? "Developer analysis",
        label: this.getSubAgentLabel(subAgent),
        severity: (parsed as FixReport)?.severity ?? "medium",
      });
    } catch (error) {
      return this.createErrorResult(
        "developer",
        error instanceof Error ? error.message : "Unknown developer agent error"
      );
    }
  }

  private getSubAgentLabel(subAgent: DeveloperSubAgent): string {
    const labels: Record<DeveloperSubAgent, string> = {
      "error-fixer": "Error Auto-Fixer",
      "code-reviewer": "Code Review",
      "dependency-manager": "Dependency Manager",
      "app-health-monitor": "App Health Monitor",
    };
    return labels[subAgent];
  }

  private buildPrompt(brief: DeveloperBrief, subAgent: DeveloperSubAgent, profile: BusinessProfile, context?: Record<string, unknown>): string {
    const sections: string[] = [];

    if (brief.projectType) sections.push(`Project Type: ${brief.projectType}`);
    if (brief.specificIssue) sections.push(`Specific Issue: ${brief.specificIssue}`);
    if (brief.errorLogs) sections.push(`Error Logs:\n\`\`\`\n${brief.errorLogs}\n\`\`\``);
    if (brief.filePaths && brief.filePaths.length > 0) {
      sections.push(`Affected Files:\n${brief.filePaths.join("\n")}`);
    }
    if (brief.recentChanges) {
      sections.push(`Recent Changes:\n${brief.recentChanges}`);
    }

    // Add context from the parent
    if (context?.buildOutput) {
      sections.push(`\nBuild Output:\n\`\`\`\n${context.buildOutput}\n\`\`\``);
    }
    if (context?.dependencyList) {
      sections.push(`\nDependency List:\n${context.dependencyList}`);
    }

    if (subAgent === "error-fixer") {
      sections.push(`\nProject Context: This is a Next.js 15+ TypeScript project with React, Tailwind CSS. The app is an AI-powered marketing agent platform for ${profile.businessName} (${profile.industry}).`);
    } else if (subAgent === "dependency-manager") {
      sections.push(`\nTech Stack: Next.js, React, TypeScript, Tailwind CSS`);
    } else if (subAgent === "app-health-monitor") {
      sections.push(`\nFramework: Next.js 15+ with App Router, API routes, server components. Styling: Tailwind CSS. AI: Multi-provider LLM integration.`);
    }

    return sections.join("\n\n");
  }
}
