import { describe, it, expect, vi, beforeEach } from "vitest";
import { AgentManager, getAgentManager } from "../agent-manager";
import { ResearchAgent } from "../research-agent";
import { OutreachAgent } from "../outreach-agent";

// All mocks from test-setup.ts are active:
//   - callLLM (mocked to return JSON.stringify({ mock: true, message: "Mocked LLM response" }))
//   - DB functions (upsertResult, upsertContent, seedIfEmpty, etc.)
//   - crypto.randomUUID (predictable)

import { callLLM } from "@/lib/llm/call-llm";
import * as dbModule from "@/lib/db";

const defaultProfile = {
  businessName: "Healy",
  industry: "frequency wellness technology",
  targetAudience: "Wellness seekers",
  productDescription: "Personalized microcurrent frequency wellness devices",
  keySellingPoints: "Non-invasive, drug-free, wearable",
  brandVoice: "Warm, educational, holistic",
};

// ====================================================================
// 1. AgentManager → Agent Execution → DB Persistence Pipeline
// ====================================================================

describe("AgentManager execution → DB persistence pipeline", () => {
  let manager: AgentManager;

  beforeEach(() => {
    vi.clearAllMocks();
    // Avoid singleton state bleeding between tests
    manager = new AgentManager();
  });

  it("executes a content agent and persists the result to DB", async () => {
    const mockBlogOutput = `# Natural Stress Relief\n\nBody of the blog post.\n\n## Benefits\n- Reduces cortisol\n- Improves sleep`;
    vi.mocked(callLLM).mockResolvedValueOnce(mockBlogOutput);

    const result = await manager.executeAgent(
      "content",
      JSON.stringify({
        topic: "Natural Stress Relief",
        contentType: "blog",
        targetAudience: "Wellness seekers",
        keyPoints: ["Meditation benefits", "Exercise for stress"],
      })
    );

    // Agent executed successfully
    expect(result.status).toBe("completed");
    expect(result.agentType).toBe("content");

    // Result was persisted to DB via upsertResult
    expect(dbModule.upsertResult).toHaveBeenCalledWith(
      expect.objectContaining({
        id: result.id,
        agentType: "content",
        status: "completed",
      })
    );

    // Content was persisted to content_library via upsertContent
    expect(dbModule.upsertContent).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Natural Stress Relief",
        contentType: "blog",
      })
    );
  });

  it("persists content result and makes it retrievable via getRecentResults", async () => {
    // Mock getRecentResults to simulate DB returning persisted data
    const simulatedTimestamp = new Date();
    vi.mocked(dbModule.getRecentResults).mockResolvedValueOnce([
      {
        id: "00000000-0000-4000-8000-000000000003",
        agentType: "content",
        status: "completed",
        output: JSON.stringify({
          title: "Wellness Tips",
          body: "Some body content",
          excerpt: "Wellness excerpt",
          seoKeywords: ["wellness"],
          contentType: "blog",
          estimatedReadTime: 3,
          generatedAt: simulatedTimestamp,
        }),
        createdAt: simulatedTimestamp,
        metadata: { contentType: "blog", topic: "Wellness Tips" },
      },
    ]);

    // Verify the agent manager delegates correctly
    const results = await manager.getRecentResults(10);
    expect(results).toHaveLength(1);
    expect(results[0].agentType).toBe("content");
    expect(results[0].status).toBe("completed");
  });

  it("tracks agent status through execution lifecycle", async () => {
    vi.mocked(callLLM).mockResolvedValueOnce("# Blog\n\nContent");

    // Status starts as idle
    expect(manager.getAgentStatus("content")).toBe("idle");

    await manager.executeAgent("content", JSON.stringify({
      topic: "Test",
      contentType: "blog",
      targetAudience: "Everyone",
      keyPoints: ["Point"],
    }));

    // Status becomes completed after success
    expect(manager.getAgentStatus("content")).toBe("completed");
  });

  it("sets status to error and persists error result when agent fails", async () => {
    vi.mocked(callLLM).mockRejectedValueOnce(new Error("LLM provider unavailable"));

    const result = await manager.executeAgent("outreach", JSON.stringify({
      name: "Test User",
      role: "Tester",
    }));

    expect(result.status).toBe("error");
    expect(result.error).toContain("LLM provider unavailable");

    // Error result was persisted
    expect(dbModule.upsertResult).toHaveBeenCalledWith(
      expect.objectContaining({
        agentType: "outreach",
        status: "error",
        error: "LLM provider unavailable",
      })
    );

    expect(manager.getAgentStatus("outreach")).toBe("error");
  });

  it("returns error result for unknown agent type without calling DB", async () => {
    const result = await manager.executeAgent("unknown" as any, "{}");

    expect(result.status).toBe("error");
    expect(result.error).toContain("not found");

    // Should not have attempted to persist
    expect(dbModule.upsertResult).not.toHaveBeenCalled();
  });
});

// ====================================================================
// 2. Research → Outreach Cross-Agent Flow
// ====================================================================

describe("Research → Outreach cross-agent pipeline", () => {
  let manager: AgentManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new AgentManager();
  });

  it("research agent output can feed into outreach agent input", async () => {
    // Step 1: Research a prospect
    // Use keyword headings that match ResearchAgent.extractListItems (singular keywords)
    vi.mocked(callLLM).mockResolvedValueOnce(`
Prospect Analysis for Sarah Mitchell:
Sarah is a wellness seeker experiencing chronic stress.

Pain Points:
1. High stress levels from demanding job
2. Poor sleep quality

Opportunity:
- Educational content about frequency-based stress reduction
- Free stress assessment report

Key Insights:
- Budget range suggests mid-tier product
- Prefers holistic over pharmaceutical approaches
    `);

    const researchResult = await manager.executeAgent(
      "research",
      JSON.stringify({
        companyName: "Sarah Mitchell",
        industry: "wellness",
        role: "Wellness Seeker - Stress Relief",
        location: "California",
      }),
      { researchType: "wellness-seeker", businessProfile: defaultProfile }
    );

    expect(researchResult.status).toBe("completed");

    // Parse the research output
    const researchData = JSON.parse(researchResult.output);
    expect(researchData.targetName).toBe("Sarah Mitchell");
    expect(researchData.painPoints.length).toBeGreaterThan(0);
    expect(researchData.opportunities.length).toBeGreaterThan(0);

    // Step 2: Use research insights to craft an outreach message
    vi.mocked(callLLM).mockResolvedValueOnce(
      JSON.stringify({
        subject: "A natural approach to managing stress, Sarah",
        body: "Hi Sarah, based on your interest in holistic health...",
        personalizedFields: { name: "Sarah" },
        tone: "friendly",
        callToAction: "Would you like a free stress assessment?",
      })
    );

    const outreachResult = await manager.executeAgent(
      "outreach",
      JSON.stringify({
        name: "Sarah Mitchell",
        role: "Wellness Seeker - Stress Relief",
        company: "Self-employed",
        painPoints: researchData.painPoints,
      }),
      {
        action: "generate_message",
        channel: "email",
        tone: "warm",
        personaType: "wellness-seeker",
        researchSummary: researchData.summary,
        businessProfile: defaultProfile,
      }
    );

    expect(outreachResult.status).toBe("completed");

    const message = JSON.parse(outreachResult.output);
    expect(message.subject).toContain("stress");
    expect(message.personalizedFields.name).toBe("Sarah");
    expect(message.callToAction).toBeTruthy();

    // Both results persisted to DB
    expect(dbModule.upsertResult).toHaveBeenCalledTimes(2);
  });

  it("outreach agent qualifies a lead researched by research agent", async () => {
    // Step 1: Research
    vi.mocked(callLLM).mockResolvedValueOnce(`
Research on Dr. Chen:
Dr. Chen is a practitioner interested in complementary technologies.
    `);

    await manager.executeAgent(
      "research",
      JSON.stringify({
        companyName: "Dr. James Chen",
        industry: "holistic health",
        role: "Acupuncturist",
        location: "Los Angeles",
      }),
      { researchType: "practitioner", businessProfile: defaultProfile }
    );

    // Step 2: Qualify the lead
    vi.mocked(callLLM).mockResolvedValueOnce(
      JSON.stringify({
        score: 90,
        painPoints: ["Wants to offer more services", "Losing patients to competitors"],
        recommendedAction: "Book a demo",
        category: "gold",
      })
    );

    const qualifyResult = await manager.executeAgent(
      "outreach",
      JSON.stringify({
        name: "Dr. James Chen",
        role: "Acupuncturist",
        email: "james@holistic.com",
        notes: "Practitioner interested in complementary frequency technology",
      }),
      { action: "qualify_lead", businessProfile: defaultProfile }
    );

    expect(qualifyResult.status).toBe("completed");
    expect(qualifyResult.agentType).toBe("outreach");

    // Both executions recorded
    expect(dbModule.upsertResult).toHaveBeenCalledTimes(2);
  });
});

// ====================================================================
// 3. CEO Strategy → Department Execution → Dashboard
// ====================================================================

describe("CEO → Department pipeline with dashboard metrics", () => {
  let manager: AgentManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new AgentManager();
  });

  it("CEO strategy execution triggers department report updates", async () => {
    vi.mocked(callLLM).mockResolvedValueOnce(
      JSON.stringify({
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
      })
    );

    const ceoResult = await manager.executeAgent(
      "ceo",
      JSON.stringify({
        goal: "Launch Q3 campaign for frequency devices",
        timeframe: "This Quarter",
        targetOutcome: "Generate 100 qualified leads",
        priority: "high",
        budget: "$5000",
      }),
      { subAgent: "task-prioritizer", businessProfile: defaultProfile }
    );

    expect(ceoResult.status).toBe("completed");
    expect(ceoResult.agentType).toBe("ceo");

    const ceoPlan = JSON.parse(ceoResult.output);
    expect(ceoPlan.executiveSummary).toContain("Q3 campaign");

    // CEO execution should increment department report
    expect(dbModule.incrementDepartmentCompleted).toHaveBeenCalledWith("Executive Office");
  });

  it("sales agent execution updates sales department metrics", async () => {
    vi.mocked(callLLM).mockResolvedValueOnce(
      JSON.stringify({
        overallScore: 85,
        category: "gold",
        criteria: [
          { criterion: "Budget", score: 8, weight: 25, notes: "Has budget" },
        ],
        bantScore: { budget: 8, authority: 7, need: 9, timeline: 6 },
        recommendedAction: "Schedule demo",
        nextBestStep: "Send educational video",
      })
    );

    await manager.executeAgent(
      "sales",
      JSON.stringify({
        leadName: "Sarah Mitchell",
        leadCompany: "Yoga Bliss Studio",
        leadRole: "Wellness Seeker",
        personaType: "wellness-seeker",
        channel: "email",
        urgency: "warm",
      }),
      { subAgent: "lead-qualifier", businessProfile: defaultProfile }
    );

    // Sales department should be incremented
    expect(dbModule.incrementDepartmentCompleted).toHaveBeenCalledWith("Sales Development");
  });

  it("dashboard metrics reflect agent executions", async () => {
    // Mock getRecentResults to return some simulated activity
    const now = new Date();
    vi.mocked(dbModule.getRecentResults).mockResolvedValue([
      {
        id: "r1", agentType: "content", status: "completed",
        output: "{}", createdAt: now,
        metadata: { topic: "Stress Relief Blog" },
      },
      {
        id: "r2", agentType: "research", status: "completed",
        output: "{}", createdAt: new Date(now.getTime() - 1000),
        metadata: { targetName: "Dr. Chen" },
      },
      {
        id: "r3", agentType: "outreach", status: "completed",
        output: "{}", createdAt: new Date(now.getTime() - 2000),
        metadata: { action: "generate_message", prospectName: "Sarah" },
      },
    ]);

    // Ensure dbList calls return empty data
    vi.mocked(dbModule.dbList).mockResolvedValue([]);
    vi.mocked(dbModule.dbCount).mockResolvedValue(0);

    const metrics = await manager.getDashboardMetrics();

    // Dashboard should reflect the simulated data
    expect(metrics.recentActivity.length).toBeGreaterThan(0);
    expect(metrics.leadsSourcedThisWeek).toBeGreaterThan(0);

    // Recent activity should include content + research + outreach
    const activityTypes = metrics.recentActivity.map((a) => a.type);
    expect(activityTypes).toContain("content");
    expect(activityTypes).toContain("research");
  });

  it("multiple department agents update their respective department reports", async () => {
    // Run analysts + sales + CEO
    vi.mocked(callLLM).mockResolvedValue(JSON.stringify({
      trends: [], competitorAnalysis: [], keywordOpportunities: [], audienceInsights: [],
    }));

    await manager.executeAgent(
      "analyst",
      JSON.stringify({
        targetMarket: "Practitioners",
        industry: "wellness",
        location: "CA",
        roles: ["naturopath"],
        maxLeads: 5,
        sources: ["directory"],
      }),
      { subAgent: "market-analyst", businessProfile: defaultProfile }
    );

    // Analyst should update "Data & Research" department
    expect(dbModule.incrementDepartmentCompleted).toHaveBeenCalledWith("Data & Research");
  });
});

// ====================================================================
// 4. Lead Lifecycle Pipeline
// ====================================================================

describe("Lead lifecycle: create → qualify → appointment", () => {
  let manager: AgentManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new AgentManager();
  });

  it("adds a lead via AgentManager and makes it retrievable", async () => {
    vi.mocked(dbModule.dbList).mockResolvedValue([
      {
        id: "lead-1", name: "John Doe", company: "Test Co",
        role: "Manager", email: "john@test.com",
        source: "manual", status: "new", pipelineStage: "sourced",
        score: 50, personaType: "customer", notes: "",
        createdAt: new Date(),
      },
    ]);

    const lead = await manager.addLead({
      name: "John Doe",
      company: "Test Co",
      role: "Manager",
      email: "john@test.com",
      status: "new",
      score: 50,
      notes: "Test lead",
      personaType: "customer",
      source: "manual",
      pipelineStage: "sourced",
    });

    expect(lead.name).toBe("John Doe");
    expect(lead.id).toBeTruthy();

    // Lead should appear in getLeads
    const leads = await manager.getLeads();
    expect(leads).toHaveLength(1);
    expect(leads[0].name).toBe("John Doe");
  });

  it("qualifies a lead then schedules an appointment", async () => {
    // Add a lead
    const lead = await manager.addLead({
      name: "Dr. Sarah Chen",
      company: "Harmony Health",
      role: "Naturopath",
      email: "sarah@harmony.com",
      status: "new",
      score: 60,
      notes: "Interested in frequency technology",
      personaType: "practitioner",
      source: "manual",
      pipelineStage: "sourced",
    });

    // Qualify the lead via the sales agent
    vi.mocked(callLLM).mockResolvedValueOnce(
      JSON.stringify({
        overallScore: 92,
        category: "gold",
        criteria: [
          { criterion: "Budget", score: 9, weight: 25, notes: "Has budget" },
        ],
        bantScore: { budget: 9, authority: 8, need: 9, timeline: 7 },
        recommendedAction: "Schedule demo immediately",
        nextBestStep: "Send case studies",
      })
    );

    const qualifyResult = await manager.executeAgent(
      "sales",
      JSON.stringify({
        leadName: lead.name,
        leadCompany: lead.company,
        leadRole: lead.role,
        personaType: "practitioner",
        channel: "email",
        urgency: "hot",
      }),
      { subAgent: "lead-qualifier", businessProfile: defaultProfile }
    );

    expect(qualifyResult.status).toBe("completed");
    const scoring = JSON.parse(qualifyResult.output);
    expect(scoring.overallScore).toBe(92);
    expect(scoring.category).toBe("gold");

    // Schedule an appointment for the qualified lead
    const appointment = await manager.addAppointment({
      leadId: lead.id,
      leadName: lead.name,
      leadCompany: lead.company,
      dateTime: new Date(Date.now() + 86400000),
      duration: 45,
      type: "demo",
      status: "scheduled",
      notes: "Full product demo requested",
      createdBy: "AI Sales Team",
    });

    expect(appointment.leadId).toBe(lead.id);
    expect(appointment.type).toBe("demo");
    expect(appointment.status).toBe("scheduled");

    // Verify appointments are retrievable
    vi.mocked(dbModule.dbList).mockResolvedValueOnce([appointment]);
    const appointments = await manager.getAppointments();
    expect(appointments).toHaveLength(1);
    expect(appointments[0].leadName).toBe("Dr. Sarah Chen");
  });
});

// ====================================================================
// 5. Error Propagation Through Full Stack
// ====================================================================

describe("Full-stack error propagation", () => {
  let manager: AgentManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new AgentManager();
  });

  it("LLM failure → agent catches → AgentManager stores error result", async () => {
    vi.mocked(callLLM).mockRejectedValueOnce(new Error("API rate limit exceeded"));

    const result = await manager.executeAgent(
      "content",
      JSON.stringify({
        topic: "Test",
        contentType: "blog",
        targetAudience: "Everyone",
        keyPoints: ["Point"],
      })
    );

    // Error propagated correctly
    expect(result.status).toBe("error");
    expect(result.error).toContain("API rate limit exceeded");

    // Error result persisted to DB
    expect(dbModule.upsertResult).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "error",
        agentType: "content",
        error: "API rate limit exceeded",
        output: "",
      })
    );

    // Status tracked
    expect(manager.getAgentStatus("content")).toBe("error");
  });

  it("invalid JSON input → agent returns error result", async () => {
    const result = await manager.executeAgent("content", "not valid json{{{" );

    expect(result.status).toBe("error");
    expect(result.error).toBeTruthy();

    // Error persisted
    expect(dbModule.upsertResult).toHaveBeenCalledWith(
      expect.objectContaining({ status: "error" })
    );
  });

  it("AgentManager error handling wraps uncaught agent errors", async () => {
    vi.mocked(callLLM).mockImplementation(() => {
      throw new Error("Synchronous failure in LLM call");
    });

    const result = await manager.executeAgent(
      "research",
      JSON.stringify({ companyName: "Test", industry: "test" })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Synchronous failure");

    // DB persisted the error
    expect(dbModule.upsertResult).toHaveBeenCalled();
  });
});

// ====================================================================
// 6. Multi-Execution Ordering and State Isolation
// ====================================================================

describe("Multi-execution pipeline ordering and isolation", () => {
  let manager: AgentManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new AgentManager();
  });

  it("executes multiple agents in sequence, each with independent state", async () => {
    // Mock 3 LLM calls — one per agent execution
    vi.mocked(callLLM)
      .mockResolvedValueOnce("# Blog post content")
      .mockResolvedValueOnce("Research output for prospect")
      .mockResolvedValueOnce(
        JSON.stringify({
          subject: "Personalized message",
          body: "Hi there!",
          personalizedFields: { name: "Test" },
          tone: "friendly",
          callToAction: "Book now",
        })
      );

    // Execute content, research, outreach in sequence
    const contentResult = await manager.executeAgent("content", JSON.stringify({
      topic: "T1", contentType: "blog", targetAudience: "A", keyPoints: ["P1"],
    }));
    expect(contentResult.status).toBe("completed");
    expect(contentResult.agentType).toBe("content");

    const researchResult = await manager.executeAgent("research", JSON.stringify({
      companyName: "Test Co", industry: "test",
    }));
    expect(researchResult.status).toBe("completed");
    expect(researchResult.agentType).toBe("research");

    const outreachResult = await manager.executeAgent("outreach", JSON.stringify({
      name: "Test User", role: "Tester",
    }), { action: "generate_message", businessProfile: defaultProfile });
    expect(outreachResult.status).toBe("completed");
    expect(outreachResult.agentType).toBe("outreach");

    // All 3 results persisted to DB
    expect(dbModule.upsertResult).toHaveBeenCalledTimes(3);

    // Each agent has correct final status
    expect(manager.getAgentStatus("content")).toBe("completed");
    expect(manager.getAgentStatus("research")).toBe("completed");
    expect(manager.getAgentStatus("outreach")).toBe("completed");
  });

  it("mixed success/failure executions don't affect each other", async () => {
    // First call succeeds, second fails
    vi.mocked(callLLM)
      .mockResolvedValueOnce("# Blog post")
      .mockRejectedValueOnce(new Error("Random outage"));

    // Successful content execution
    const successResult = await manager.executeAgent("content", JSON.stringify({
      topic: "Success", contentType: "blog", targetAudience: "A", keyPoints: ["P1"],
    }));
    expect(successResult.status).toBe("completed");

    // Failed research execution
    const failResult = await manager.executeAgent("research", JSON.stringify({
      companyName: "Fail Co", industry: "test",
    }));
    expect(failResult.status).toBe("error");

    // Both persisted
    expect(dbModule.upsertResult).toHaveBeenCalledTimes(2);

    // Status tracking is independent per agent
    expect(manager.getAgentStatus("content")).toBe("completed");
    expect(manager.getAgentStatus("research")).toBe("error");
  });

  it("executes agents with different context (business profile, apiKey)", async () => {
    vi.mocked(callLLM).mockResolvedValue("# Test content");

    const customContext = {
      businessProfile: {
        businessName: "Custom Biz",
        industry: "custom",
        targetAudience: "custom audience",
        productDescription: "custom product",
        keySellingPoints: "custom points",
        brandVoice: "custom voice",
      },
      apiKey: "sk-custom-key",
      provider: "openai",
    };

    const result = await manager.executeAgent(
      "content",
      JSON.stringify({
        topic: "Custom Topic",
        contentType: "blog",
        targetAudience: "Custom",
        keyPoints: ["Custom point"],
      }),
      customContext
    );

    expect(result.status).toBe("completed");

    // Custom context was passed through to the LLM call
    const systemPrompt = vi.mocked(callLLM).mock.calls[0][0];
    expect(systemPrompt).toContain("Custom Biz");
    expect(systemPrompt).toContain("custom product");
  });

  it("getRecentResults returns most recent results first", async () => {
    // Simulate DB returning results in order
    const now = new Date();
    const results = [
      { id: "r3", agentType: "outreach" as const, status: "completed" as const, output: '{"subject":"Third"}', createdAt: new Date(now.getTime() - 1000) },
      { id: "r2", agentType: "content" as const, status: "completed" as const, output: '{"title":"Second"}', createdAt: new Date(now.getTime() - 2000) },
      { id: "r1", agentType: "research" as const, status: "completed" as const, output: '{}', createdAt: new Date(now.getTime() - 3000) },
    ];
    vi.mocked(dbModule.getRecentResults).mockResolvedValue(results);

    const recent = await manager.getRecentResults(5);
    expect(recent).toHaveLength(3);
    expect(recent[0].id).toBe("r3");
    expect(recent[1].id).toBe("r2");
    expect(recent[2].id).toBe("r1");
  });

  it("getResultsByType filters results correctly", async () => {
    const now = new Date();
    const allResults = [
      { id: "1", agentType: "content" as const, status: "completed" as const, output: "{}", createdAt: now },
      { id: "2", agentType: "research" as const, status: "completed" as const, output: "{}", createdAt: now },
      { id: "3", agentType: "content" as const, status: "completed" as const, output: "{}", createdAt: now },
    ];
    vi.mocked(dbModule.getRecentResults).mockResolvedValue(allResults);

    const contentResults = await manager.getResultsByType("content");
    expect(contentResults).toHaveLength(2);
    expect(contentResults.every((r) => r.agentType === "content")).toBe(true);
  });
});

// ====================================================================
// 7. Singleton Behavior
// ====================================================================

describe("AgentManager singleton in pipeline context", () => {
  it("getAgentManager returns same instance across pipeline calls", () => {
    const instance1 = getAgentManager();
    const instance2 = getAgentManager();
    expect(instance1).toBe(instance2);
  });

  it("fresh AgentManager instances are independent", () => {
    const m1 = new AgentManager();
    const m2 = new AgentManager();

    // Both should have agents registered
    expect(m1.getAllAgents().length).toBe(m2.getAllAgents().length);
    expect(m1.getAllAgents().length).toBeGreaterThanOrEqual(9);

    // And they should be different instances
    expect(m1).not.toBe(m2);
  });
});
