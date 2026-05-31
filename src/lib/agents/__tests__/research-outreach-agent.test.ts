import { describe, it, expect, vi, beforeEach } from "vitest";
import { ResearchAgent } from "../research-agent";
import { OutreachAgent } from "../outreach-agent";
import type { AgentConfig } from "../types";

// callLLM is already mocked in test-setup.ts - we just need the reference
import { callLLM } from "@/lib/llm/call-llm";

const defaultConfig: AgentConfig = {
  type: "research" as const,
  name: "Test",
  description: "Test",
  model: "gpt-4o-mini",
  temperature: 0.4,
  maxTokens: 2048,
  provider: "openai",
};

const outreachConfig: AgentConfig = {
  ...defaultConfig,
  type: "outreach",
  temperature: 0.6,
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
// ResearchAgent Tests
// ============================================================
describe("ResearchAgent", () => {
  let agent: ResearchAgent;

  beforeEach(() => {
    agent = new ResearchAgent(defaultConfig);
    vi.clearAllMocks();
  });

  it("researches a prospect and returns structured result", async () => {
    const mockOutput = `
Prospect Analysis for Sarah Mitchell:
Sarah is a wellness seeker experiencing chronic stress.

Pain Points & Challenges:
1. High stress levels from demanding job
2. Poor sleep quality affecting daily performance
3. Previous attempts with meditation and supplements provided limited relief

Opportunities for Engagement:
- Educational content about frequency-based stress reduction
- Free stress assessment report
- Personalized demo focused on stress programs

Key Insights:
- Budget range suggests mid-tier product
- Prefers holistic over pharmaceutical approaches
- Active in yoga and wellness communities
    `;

    vi.mocked(callLLM).mockResolvedValueOnce(mockOutput);

    const input = JSON.stringify({
      companyName: "Sarah Mitchell",
      industry: "wellness",
      role: "Wellness Seeker - Stress Relief",
      location: "California",
    });

    const result = await agent.execute(input, {
      researchType: "wellness-seeker",
      businessProfile: defaultProfile,
    });

    expect(result.status).toBe("completed");
    expect(result.agentType).toBe("research");

    const parsed = JSON.parse(result.output);
    expect(parsed.targetName).toBe("Sarah Mitchell");
    expect(parsed.summary).toBeTruthy();
    expect(Array.isArray(parsed.painPoints)).toBe(true);
    expect(Array.isArray(parsed.opportunities)).toBe(true);
    expect(Array.isArray(parsed.keyInsights)).toBe(true);
  });

  it("handles LLM failure gracefully", async () => {
    vi.mocked(callLLM).mockRejectedValueOnce(new Error("API quota exceeded"));

    const input = JSON.stringify({
      companyName: "Test",
      industry: "test",
    });

    const result = await agent.execute(input);
    expect(result.status).toBe("error");
    expect(result.error).toContain("API quota exceeded");
  });

  it("researches a practitioner prospect", async () => {
    const mockOutput = "Research analysis for Dr. Chen:\nPain Points:\n1. Losing patients to competitors with more offerings\nOpportunities:\n- Partnership for frequency therapy\nInsights:\n- Budget for equipment";
    vi.mocked(callLLM).mockResolvedValueOnce(mockOutput);

    const input = JSON.stringify({
      companyName: "Dr. James Chen",
      industry: "holistic health",
      role: "Acupuncturist",
      location: "Los Angeles",
    });

    const result = await agent.execute(input, {
      researchType: "practitioner",
      businessProfile: defaultProfile,
    });

    expect(result.status).toBe("completed");
    const parsed = JSON.parse(result.output);
    expect(parsed.painPoints.length).toBeGreaterThan(0);
  });

  it("handles minimal input gracefully", async () => {
    vi.mocked(callLLM).mockResolvedValueOnce("Basic analysis of the target.");

    const result = await agent.execute("{}");
    expect(result.status).toBe("completed");
    const parsed = JSON.parse(result.output);
    expect(parsed.targetName).toBeTruthy();
    expect(Array.isArray(parsed.painPoints)).toBe(true);
  });

  it("extracts list items correctly", async () => {
    const output = `
Pain Points:
1. Chronic fatigue from stress
2. Poor sleep quality
- Joint discomfort
• Reduced focus
    `;
    vi.mocked(callLLM).mockResolvedValueOnce(output);

    const input = JSON.stringify({
      companyName: "Test User",
      industry: "wellness",
    });

    const result = await agent.execute(input, {
      researchType: "wellness-seeker",
      businessProfile: defaultProfile,
    });

    expect(result.status).toBe("completed");
    const parsed = JSON.parse(result.output);
    expect(parsed.painPoints.length).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================
// OutreachAgent Tests
// ============================================================
describe("OutreachAgent", () => {
  let agent: OutreachAgent;

  beforeEach(() => {
    agent = new OutreachAgent(outreachConfig);
    vi.clearAllMocks();
  });

  it("generates a personalized message with valid output", async () => {
    const mockMessage = JSON.stringify({
      subject: "Wellness insights for your journey",
      body: "Hi Sarah, I noticed your interest in holistic health...",
      personalizedFields: { name: "Sarah" },
      tone: "friendly",
      callToAction: "Would you like a free consultation?",
    });

    vi.mocked(callLLM).mockResolvedValueOnce(mockMessage);

    const input = JSON.stringify({
      name: "Sarah Mitchell",
      role: "Wellness Seeker",
      company: "Yoga Bliss",
    });

    const result = await agent.execute(input, {
      action: "generate_message",
      channel: "email",
      tone: "warm",
      personaType: "wellness-seeker",
      businessProfile: defaultProfile,
    });

    expect(result.status).toBe("completed");
    expect(result.agentType).toBe("outreach");

    const parsed = JSON.parse(result.output);
    expect(parsed.subject).toBe("Wellness insights for your journey");
    expect(parsed.body).toBeTruthy();
    expect(parsed.callToAction).toBe("Would you like a free consultation?");
  });

  it("falls back to plain text when LLM returns non-JSON", async () => {
    const plainText = "Hi there! I think you'd be interested in our wellness products. Would you like to learn more?";
    vi.mocked(callLLM).mockResolvedValueOnce(plainText);

    const input = JSON.stringify({
      name: "Test User",
      role: "Tester",
    });

    const result = await agent.execute(input, {
      action: "generate_message",
      channel: "email",
      tone: "warm",
      personaType: "customer",
      businessProfile: defaultProfile,
    });

    expect(result.status).toBe("completed");
    const parsed = JSON.parse(result.output);
    // The fallback should wrap plain text with subject and CTA
    expect(parsed.subject).toBeTruthy();
    expect(typeof parsed.subject).toBe("string");
    expect(parsed.body).toBe(plainText);
    expect(parsed.callToAction).toBeTruthy();
  });

  it("returns error when callLLM throws", async () => {
    vi.mocked(callLLM).mockRejectedValueOnce(new Error("Network error"));

    const result = await agent.execute("{}", {
      action: "generate_message",
      businessProfile: defaultProfile,
    });

    expect(result.status).toBe("error");
    expect(result.error).toContain("Network error");
  });

  it("qualifies a lead", async () => {
    const qualifyOutput = JSON.stringify({
      score: 85,
      painPoints: ["Stress", "Sleep issues"],
      recommendedAction: "Send educational content",
    });

    vi.mocked(callLLM).mockResolvedValueOnce(qualifyOutput);

    const input = JSON.stringify({
      name: "John Doe",
      role: "Wellness seeker",
      email: "john@example.com",
    });

    const result = await agent.execute(input, {
      action: "qualify_lead",
      businessProfile: defaultProfile,
    });

    expect(result.status).toBe("completed");
    expect(result.agentType).toBe("outreach");
  });

  it("suggests an appointment", async () => {
    vi.mocked(callLLM).mockResolvedValueOnce(
      JSON.stringify({
        meetingType: "discovery call",
        duration: 30,
        agenda: ["Introduction", "Needs assessment"],
      })
    );

    const input = JSON.stringify({
      leadName: "Jane Smith",
      interest: "Stress relief",
      stage: "warm",
    });

    const result = await agent.execute(input, {
      action: "suggest_appointment",
      businessProfile: defaultProfile,
    });

    expect(result.status).toBe("completed");
  });

  it("returns error for unknown action", async () => {
    const result = await agent.execute("{}", {
      action: "unknown_action",
    });

    expect(result.status).toBe("error");
    expect(result.error).toContain("Unknown outreach action");
  });
});
