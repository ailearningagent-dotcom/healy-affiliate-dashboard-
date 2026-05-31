import { describe, it, expect, vi, beforeEach } from "vitest";
import { CEOAgent } from "../ceo-agent";
import { CFOAgent } from "../cfo-agent";
import { AnalystAgent } from "../analyst-agent";
import { DesignAgent } from "../design-agent";
import { SalesAgent } from "../sales-agent";
import { DeveloperAgent } from "../developer-agent";
import type { AgentConfig } from "../types";

// callLLM is already mocked in test-setup.ts
import { callLLM } from "@/lib/llm/call-llm";

const baseConfig: AgentConfig = {
  type: "ceo" as const,
  name: "Test Agent",
  description: "Test",
  model: "gpt-4o-mini",
  temperature: 0.5,
  maxTokens: 2048,
  provider: "openai",
};

const defaultProfile = {
  businessName: "Healy",
  industry: "frequency wellness technology",
  targetAudience: "Wellness seekers",
  productDescription: "Personalized microcurrent frequency wellness devices",
  keySellingPoints: "Non-invasive, drug-free, wearable",
  brandVoice: "Warm, educational, holistic",
};

// ============================================================
// CEOAgent Tests
// ============================================================
describe("CEOAgent", () => {
  let agent: CEOAgent;

  beforeEach(() => {
    agent = new CEOAgent(baseConfig);
    vi.clearAllMocks();
  });

  it("generates a strategy plan", async () => {
    const mockPlan = JSON.stringify({
      executiveSummary: "Launch Q3 campaign for Healy frequency devices",
      prioritizedTasks: [
        { task: "Create educational content", department: "Content", priority: "high", deadline: "Week 1" },
        { task: "Research prospect list", department: "Research", priority: "high", deadline: "Week 1" },
      ],
      resourceAllocation: [
        { department: "Content", budget: "$2000", hours: "40" },
      ],
      timeline: [
        { phase: "Preparation", duration: "1 week", deliverables: "Content assets" },
      ],
      riskAssessment: [
        { risk: "Low response rate", likelihood: "Medium", mitigation: "A/B test messaging" },
      ],
      kpis: [
        { metric: "Leads generated", target: "100", measurement: "Weekly" },
      ],
      departments: [
        { name: "Content", primaryGoal: "Create assets", subTasks: ["Blog posts", "Social content"] },
      ],
    });

    vi.mocked(callLLM).mockResolvedValueOnce(mockPlan);

    const input = JSON.stringify({
      goal: "Launch Q3 campaign for frequency devices",
      timeframe: "This Quarter",
      targetOutcome: "Generate 100 qualified leads",
      priority: "high",
      budget: "$5000",
    });

    const result = await agent.execute(input, {
      subAgent: "task-prioritizer",
      businessProfile: defaultProfile,
    });

    expect(result.status).toBe("completed");
    expect(result.agentType).toBe("ceo");

    const parsed = JSON.parse(result.output);
    expect(parsed.executiveSummary).toContain("Q3 campaign");
    expect(parsed.prioritizedTasks.length).toBe(2);
    expect(parsed.kpis.length).toBe(1);
  });

  it("handles sub-agents: department-coordinator", async () => {
    vi.mocked(callLLM).mockResolvedValueOnce(JSON.stringify({
      executiveSummary: "Coordinate departments",
      prioritizedTasks: [],
      resourceAllocation: [],
      timeline: [{ phase: "Phase 1", duration: "2 weeks", deliverables: "Coordination plan" }],
      riskAssessment: [],
      kpis: [],
      departments: [],
    }));

    const input = JSON.stringify({
      goal: "Coordinate Q3 efforts",
      timeframe: "This Month",
      targetOutcome: "Smooth execution",
      priority: "high",
    });

    const result = await agent.execute(input, {
      subAgent: "department-coordinator",
      businessProfile: defaultProfile,
    });

    expect(result.status).toBe("completed");
  });

  it("falls back when LLM returns non-JSON", async () => {
    vi.mocked(callLLM).mockResolvedValueOnce("Plain text strategy output without JSON");

    const input = JSON.stringify({
      goal: "Test",
      timeframe: "This Week",
      targetOutcome: "Test",
      priority: "low",
    });

    const result = await agent.execute(input, {
      businessProfile: defaultProfile,
    });

    expect(result.status).toBe("completed");
    const parsed = JSON.parse(result.output);
    // Should have fallback structure
    expect(parsed.executiveSummary).toBeDefined();
    expect(Array.isArray(parsed.prioritizedTasks)).toBe(true);
  });

  it("handles API errors", async () => {
    vi.mocked(callLLM).mockRejectedValueOnce(new Error("Strategy engine timeout"));

    const input = JSON.stringify({
      goal: "Test",
      timeframe: "This Week",
      targetOutcome: "Test",
      priority: "low",
    });

    const result = await agent.execute(input);
    expect(result.status).toBe("error");
    expect(result.error).toContain("Strategy engine timeout");
  });
});

// ============================================================
// CFOAgent Tests
// ============================================================
describe("CFOAgent", () => {
  let agent: CFOAgent;

  beforeEach(() => {
    agent = new CFOAgent({ ...baseConfig, type: "cfo", temperature: 0.3 });
    vi.clearAllMocks();
  });

  it("generates a financial report", async () => {
    const mockReport = JSON.stringify({
      budgetAllocation: [
        { category: "Outreach", amount: 3000, percentage: 30 },
        { category: "Content", amount: 2000, percentage: 20 },
      ],
      costPerLead: [
        { channel: "email", costPerLead: 8, projectedLeads: 125 },
      ],
      roiProjection: [
        { metric: "ROI 30-day", value: "150%", confidence: "Medium" },
      ],
      breakevenAnalysis: {
        breakevenPoint: "15 appointments",
        timelineDays: 45,
        notes: "Conservative estimate",
      },
      recommendations: ["Focus on email outreach for best ROI"],
    });

    vi.mocked(callLLM).mockResolvedValueOnce(mockReport);

    const input = JSON.stringify({
      campaignName: "Q3 Wellness Campaign",
      budget: 10000,
      projectedLeads: 200,
      projectedAppointments: 40,
      durationDays: 90,
      channels: ["email", "whatsapp", "linkedin"],
    });

    const result = await agent.execute(input, {
      subAgent: "budget-planner",
      businessProfile: defaultProfile,
    });

    expect(result.status).toBe("completed");
    expect(result.agentType).toBe("cfo");

    const parsed = JSON.parse(result.output);
    expect(parsed.budgetAllocation.length).toBe(2);
    expect(parsed.roiProjection.length).toBe(1);
    expect(parsed.recommendations.length).toBeGreaterThan(0);
  });

  it("handles non-JSON fallback", async () => {
    vi.mocked(callLLM).mockResolvedValueOnce("Plain text financial analysis");

    const input = JSON.stringify({
      campaignName: "Test",
      budget: 1000,
      projectedLeads: 50,
      projectedAppointments: 10,
      durationDays: 30,
      channels: ["email"],
    });

    const result = await agent.execute(input, {
      businessProfile: defaultProfile,
    });

    expect(result.status).toBe("completed");
    const parsed = JSON.parse(result.output);
    expect(Array.isArray(parsed.budgetAllocation)).toBe(true);
    expect(Array.isArray(parsed.recommendations)).toBe(true);
  });
});

// ============================================================
// AnalystAgent Tests
// ============================================================
describe("AnalystAgent", () => {
  let agent: AnalystAgent;

  beforeEach(() => {
    agent = new AnalystAgent({ ...baseConfig, type: "analyst" });
    vi.clearAllMocks();
  });

  it("runs market analysis", async () => {
    const mockAnalysis = JSON.stringify({
      trends: [
        { trend: "Rise of biohacking", impact: "High", actionItem: "Create biohacker content" },
      ],
      competitorAnalysis: [
        { competitor: "Competitor A", strengths: "Brand recognition", weaknesses: "Expensive", gap: "Price point" },
      ],
      keywordOpportunities: [
        { keyword: "frequency therapy", volume: "5K/mo", difficulty: "Low", opportunity: "High" },
      ],
      audienceInsights: [
        { segment: "Biohackers", painPoints: "Optimization", channelPreference: "Instagram", messageAngle: "Data-driven" },
      ],
    });

    vi.mocked(callLLM).mockResolvedValueOnce(mockAnalysis);

    const input = JSON.stringify({
      targetMarket: "Biohackers",
      industry: "wellness technology",
      location: "US",
      roles: ["biohacker", "health coach"],
      maxLeads: 10,
      sources: ["directory", "web"],
    });

    const result = await agent.execute(input, {
      subAgent: "market-analyst",
      businessProfile: defaultProfile,
    });

    expect(result.status).toBe("completed");
    const parsed = JSON.parse(result.output);
    expect(parsed.trends).toBeDefined();
    expect(parsed.competitorAnalysis).toBeDefined();
  });

  it("runs web scraper sub-agent", async () => {
    const mockScrape = JSON.stringify({
      prospects: [
        { name: "Dr. Smith", company: "Wellness Center", role: "Director", email: "smith@wellness.com", score: 85, source: "directory" },
      ],
      sources: [{ url: "https://example.com/directory", query: "wellness practitioners" }],
    });

    vi.mocked(callLLM).mockResolvedValueOnce(mockScrape);

    const input = JSON.stringify({
      targetMarket: "Practitioners",
      industry: "holistic health",
      location: "California",
      roles: ["naturopath", "acupuncturist"],
      maxLeads: 5,
      sources: ["directory"],
    });

    const result = await agent.execute(input, {
      subAgent: "web-scraper",
      businessProfile: defaultProfile,
    });

    expect(result.status).toBe("completed");
    const parsed = JSON.parse(result.output);
    expect(parsed.prospects).toBeDefined();
  });
});

// ============================================================
// DesignAgent Tests
// ============================================================
describe("DesignAgent", () => {
  let agent: DesignAgent;

  beforeEach(() => {
    agent = new DesignAgent({ ...baseConfig, type: "design", temperature: 0.8, maxTokens: 3072 });
    vi.clearAllMocks();
  });

  it("creates poster concepts", async () => {
    const mockDesign = JSON.stringify({
      concepts: [
        {
          title: "Natural Wellness Poster",
          headline: "Feel the Frequency",
          subheadline: "Natural pain relief through microcurrent technology",
          visualDescription: "Abstract energy waves in blue and green",
          colorPalette: { primary: "#2563EB", secondary: "#16A34A", accent: "#F59E0B", background: "#FFFFFF" },
          layout: "Centered headline with wave pattern background",
          cta: "Discover Your Frequency",
          dimensions: "1080x1080",
        },
      ],
    });

    vi.mocked(callLLM).mockResolvedValueOnce(mockDesign);

    const input = JSON.stringify({
      campaignName: "Wellness Awareness",
      topic: "Frequency Technology",
      targetAudience: "Wellness seekers",
      platforms: ["instagram", "facebook"],
      brandColors: ["#2563EB", "#16A34A"],
      vibe: "educational",
      includeLogos: true,
    });

    const result = await agent.execute(input, {
      subAgent: "poster-creator",
      businessProfile: defaultProfile,
    });

    expect(result.status).toBe("completed");
    const parsed = JSON.parse(result.output);
    expect(parsed.concepts).toBeDefined();
    expect(parsed.concepts.length).toBeGreaterThan(0);
  });
});

// ============================================================
// SalesAgent Tests
// ============================================================
describe("SalesAgent", () => {
  let agent: SalesAgent;

  beforeEach(() => {
    agent = new SalesAgent({ ...baseConfig, type: "sales" });
    vi.clearAllMocks();
  });

  it("qualifies a lead", async () => {
    const mockScoring = JSON.stringify({
      overallScore: 85,
      category: "gold",
      criteria: [
        { criterion: "Budget", score: 8, weight: 25, notes: "Has budget for investment" },
      ],
      bantScore: { budget: 8, authority: 7, need: 9, timeline: 6 },
      recommendedAction: "Schedule demo",
      nextBestStep: "Send educational video",
    });

    vi.mocked(callLLM).mockResolvedValueOnce(mockScoring);

    const input = JSON.stringify({
      leadName: "Sarah Mitchell",
      leadCompany: "Yoga Bliss Studio",
      leadRole: "Wellness Seeker - Chronic Stress",
      personaType: "wellness-seeker",
      channel: "email",
      urgency: "warm",
    });

    const result = await agent.execute(input, {
      subAgent: "lead-qualifier",
      businessProfile: defaultProfile,
    });

    expect(result.status).toBe("completed");
    const parsed = JSON.parse(result.output);
    expect(parsed.overallScore).toBe(85);
    expect(parsed.category).toBe("gold");
  });

  it("generates a sales cadence", async () => {
    vi.mocked(callLLM).mockResolvedValueOnce(JSON.stringify({
      cadence: {
        steps: [
          { day: 1, action: "Initial outreach", channel: "email", template: "Welcome message", goal: "Start conversation" },
        ],
        totalDays: 30,
        touchpoints: 6,
      },
    }));

    const input = JSON.stringify({
      leadName: "Test Lead",
      leadCompany: "Test Co",
      leadRole: "Manager",
      personaType: "business-builder",
      channel: "linkedin",
      urgency: "cold",
    });

    const result = await agent.execute(input, {
      subAgent: "followup-manager",
      businessProfile: defaultProfile,
    });

    expect(result.status).toBe("completed");
    const parsed = JSON.parse(result.output);
    expect(parsed.cadence).toBeDefined();
  });
});

// ============================================================
// DeveloperAgent Tests
// ============================================================
describe("DeveloperAgent", () => {
  let agent: DeveloperAgent;

  beforeEach(() => {
    agent = new DeveloperAgent({ ...baseConfig, type: "developer", temperature: 0.4 });
    vi.clearAllMocks();
  });

  it("analyzes errors and provides fixes", async () => {
    const mockFix = JSON.stringify({
      issueSummary: "TypeScript error in app.tsx",
      rootCause: "Missing type definition for props",
      severity: "high",
      fixSteps: [
        { file: "src/app.tsx", change: "Add interface for Props", reasoning: "Type safety" },
      ],
      estimatedTimeMinutes: 15,
      preventiveMeasures: ["Add strict type checking"],
      affectedFiles: ["src/app.tsx"],
    });

    vi.mocked(callLLM).mockResolvedValueOnce(mockFix);

    const input = JSON.stringify({
      projectType: "Next.js + TypeScript",
      errorLogs: "Type 'undefined' is not assignable to type 'string'.",
      filePaths: ["src/app.tsx"],
      specificIssue: "Type error in component props",
    });

    const result = await agent.execute(input, {
      subAgent: "error-fixer",
      businessProfile: defaultProfile,
    });

    expect(result.status).toBe("completed");
    const parsed = JSON.parse(result.output);
    expect(parsed.issueSummary).toBeDefined();
    expect(parsed.fixSteps.length).toBeGreaterThan(0);
    expect(parsed.severity).toBe("high");
  });

  it("reviews code quality", async () => {
    vi.mocked(callLLM).mockResolvedValueOnce(JSON.stringify({
      filesReviewed: ["src/components/AgentPage.tsx"],
      issuesFound: [
        { file: "src/components/AgentPage.tsx", line: 45, severity: "minor", problem: "Unused import", suggestion: "Remove import" },
      ],
      criticalIssues: 0,
      majorIssues: 0,
      minorIssues: 1,
      overallScore: 92,
      summary: "Code is generally clean with minor issues",
    }));

    const input = JSON.stringify({
      projectType: "Next.js + TypeScript",
      specificIssue: "Code review of AgentsPage",
    });

    const result = await agent.execute(input, {
      subAgent: "code-reviewer",
      businessProfile: defaultProfile,
    });

    expect(result.status).toBe("completed");
    const parsed = JSON.parse(result.output);
    expect(parsed.overallScore).toBeGreaterThan(0);
    expect(parsed.filesReviewed.length).toBeGreaterThan(0);
  });

  it("handles errors gracefully", async () => {
    vi.mocked(callLLM).mockRejectedValueOnce(new Error("Dev agent error"));

    const input = JSON.stringify({
      projectType: "Next.js",
      specificIssue: "Test",
    });

    const result = await agent.execute(input);
    expect(result.status).toBe("error");
    expect(result.error).toContain("Dev agent error");
  });
});
