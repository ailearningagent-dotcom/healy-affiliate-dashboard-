import { describe, it, expect, vi, beforeEach } from "vitest";
import { ScraperAgent } from "../scraper-agent";
import type { AgentConfig } from "../types";

// callLLM is already mocked in test-setup.ts
import { callLLM } from "@/lib/llm/call-llm";

// Mock the Google Maps scraper so we don't actually launch a browser in tests
vi.mock("../google-maps-scraper", () => ({
  scrapeGoogleMaps: vi.fn(),
}));

import { scrapeGoogleMaps } from "../google-maps-scraper";

const config: AgentConfig = {
  type: "scraper" as const,
  name: "Lead Scraper",
  description: "Scrapes leads",
  model: "gpt-4o-mini",
  temperature: 0.3,
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

describe("ScraperAgent", () => {
  let agent: ScraperAgent;

  beforeEach(() => {
    agent = new ScraperAgent(config);
    vi.clearAllMocks();
  });

  it("scrapes leads from directory sources", async () => {
    const mockLeads = JSON.stringify([
      {
        name: "Dr. Sarah Chen",
        company: "Harmony Health Center",
        role: "Naturopathic Doctor",
        email: "sarah@harmonyhealth.com",
        phone: "+1 (555) 0192",
        source: "directory",
        score: 90,
        notes: "Established practice interested in complementary technologies",
        personaType: "practitioner",
      },
      {
        name: "Mark Johnson",
        company: "Biohack Collective",
        role: "Health Coach",
        email: "mark@biohack.com",
        source: "directory",
        score: 78,
        notes: "Active in biohacking community, always looking for new tech",
        personaType: "biohacker",
      },
    ]);

    vi.mocked(callLLM).mockResolvedValueOnce(mockLeads);

    const input = JSON.stringify({
      type: "directory",
      query: "wellness practitioners California",
      industry: "holistic health",
      location: "California",
      role: "naturopath",
      maxResults: 2,
    });

    const result = await agent.execute(input, {
      businessProfile: defaultProfile,
    });

    expect(result.status).toBe("completed");
    expect(result.agentType).toBe("scraper");

    const parsed = JSON.parse(result.output);
    expect(parsed.leads).toBeDefined();
    expect(parsed.leads.length).toBe(2);
    expect(parsed.count).toBe(2);

    const firstLead = parsed.leads[0];
    expect(firstLead.name).toBe("Dr. Sarah Chen");
    expect(firstLead.source).toBe("directory");
    expect(firstLead.personaType).toBe("practitioner");
    expect(firstLead.score).toBeGreaterThan(0);
  });

  it("scrapes leads from Apollo source", async () => {
    vi.mocked(callLLM).mockResolvedValueOnce(JSON.stringify([
      {
        name: "Robert Chen",
        company: "Vitality Health",
        role: "VP Product",
        email: "robert@vitality.com",
        source: "apollo",
        score: 82,
        notes: "Decision-maker with budget authority",
        personaType: "practitioner",
      },
    ]));

    const input = JSON.stringify({
      type: "apollo",
      query: "wellness product distributors",
      maxResults: 1,
    });

    const result = await agent.execute(input, {
      businessProfile: defaultProfile,
    });

    expect(result.status).toBe("completed");
    const parsed = JSON.parse(result.output);
    expect(parsed.leads[0].source).toBe("apollo");
  });

  it("scrapes leads from Google Maps source using browser", async () => {
    const mockGoogleLeads = [
      {
        name: "Harmony Health Center",
        company: "Harmony Health Center",
        role: "Wellness Center",
        email: "",
        phone: "+1 (415) 555-0123",
        source: "google-maps" as const,
        sourceUrl: "https://maps.google.com/maps/place/Harmony+Health+Center",
        score: 85,
        notes: "Wellness center found on Google Maps.",
        personaType: "practitioner",
      },
      {
        name: "Peak Performance Studio",
        company: "Peak Performance Studio",
        role: "Fitness Studio",
        email: "",
        phone: "+1 (415) 555-0456",
        source: "google-maps" as const,
        sourceUrl: "",
        score: 72,
        notes: "Fitness studio on Google Maps.",
        personaType: "wellness-seeker",
      },
    ];

    vi.mocked(scrapeGoogleMaps).mockResolvedValueOnce(mockGoogleLeads);

    const input = JSON.stringify({
      type: "google-maps",
      query: "wellness center",
      location: "Los Angeles",
      maxResults: 5,
    });

    const result = await agent.execute(input, {
      businessProfile: defaultProfile,
    });

    expect(result.status).toBe("completed");
    const parsed = JSON.parse(result.output);
    expect(parsed.leads).toBeDefined();
    expect(parsed.leads.length).toBe(2);
    expect(parsed.leads[0].source).toBe("google-maps");
    expect(parsed.leads[0].name).toBe("Harmony Health Center");
    expect(parsed.webSearch).toBe(true);
  });

  it("handles Google Maps scraping returning no results", async () => {
    vi.mocked(scrapeGoogleMaps).mockResolvedValueOnce([]);

    const input = JSON.stringify({
      type: "google-maps",
      query: "nonexistent business XYZ123",
      location: "Nowhere",
      maxResults: 3,
    });

    const result = await agent.execute(input, {
      businessProfile: defaultProfile,
    });

    expect(result.status).toBe("completed");
    const parsed = JSON.parse(result.output);
    expect(parsed.leads).toEqual([]);
    expect(parsed.count).toBe(0);
    expect(parsed.webSearch).toBe(true);
  });

  it("handles Google Maps scraper throwing an error gracefully", async () => {
    vi.mocked(scrapeGoogleMaps).mockRejectedValueOnce(new Error("Browser timeout"));

    const input = JSON.stringify({
      type: "google-maps",
      query: "test",
      maxResults: 5,
    });

    const result = await agent.execute(input, {
      businessProfile: defaultProfile,
    });

    expect(result.status).toBe("error");
    expect(result.error).toContain("Browser timeout");
  });

  it("scrapes leads from LinkedIn source", async () => {
    vi.mocked(callLLM).mockResolvedValueOnce(JSON.stringify([
      {
        name: "Natalie Foster",
        company: "NF Wellness",
        role: "Holistic Health Coach",
        email: "natalie@nfwellness.com",
        source: "linkedin",
        score: 91,
        notes: "Wellness influencer with 30K followers",
        personaType: "business-builder",
      },
    ]));

    const input = JSON.stringify({
      type: "linkedin",
      query: "wellness coach California",
      maxResults: 1,
    });

    const result = await agent.execute(input, {
      businessProfile: defaultProfile,
    });

    expect(result.status).toBe("completed");
    const parsed = JSON.parse(result.output);
    expect(parsed.leads[0].source).toBe("linkedin");
  });

  it("handles non-JSON LLM output with fallback leads", async () => {
    vi.mocked(callLLM).mockResolvedValueOnce("Plain text that is not valid JSON");

    const input = JSON.stringify({
      type: "directory",
      query: "wellness practitioners",
      industry: "holistic health",
      location: "New York",
      maxResults: 3,
    });

    const result = await agent.execute(input, {
      businessProfile: defaultProfile,
    });

    expect(result.status).toBe("completed");
    const parsed = JSON.parse(result.output);
    expect(parsed.leads).toBeDefined();
    expect(parsed.leads.length).toBeGreaterThan(0);
  });

  it("handles directory fallback leads specifically", async () => {
    vi.mocked(callLLM).mockResolvedValueOnce("```\nnot-json\n```");

    const input = JSON.stringify({
      type: "directory",
      query: "test",
      maxResults: 2,
    });

    const result = await agent.execute(input, {
      businessProfile: defaultProfile,
    });

    expect(result.status).toBe("completed");
    const parsed = JSON.parse(result.output);
    expect(parsed.leads.length).toBe(2);
  });

  it("handles apollo fallback leads", async () => {
    vi.mocked(callLLM).mockResolvedValueOnce("raw text");

    const input = JSON.stringify({
      type: "apollo",
      query: "test",
      maxResults: 3,
    });

    const result = await agent.execute(input, {
      businessProfile: defaultProfile,
    });

    expect(result.status).toBe("completed");
    const parsed = JSON.parse(result.output);
    expect(parsed.leads.length).toBe(3);
  });

  it("handles API errors gracefully", async () => {
    vi.mocked(callLLM).mockRejectedValueOnce(new Error("Scraper API unavailable"));

    const input = JSON.stringify({
      type: "directory",
      query: "test",
      maxResults: 5,
    });

    const result = await agent.execute(input);
    expect(result.status).toBe("error");
    expect(result.error).toContain("Scraper API unavailable");
  });

  it("cleans JSON from markdown code blocks", async () => {
    const markdownJson = "```json\n[{\"name\":\"Test\",\"company\":\"TestCo\",\"role\":\"Role\",\"email\":\"test@test.com\",\"score\":80,\"notes\":\"Test\",\"personaType\":\"practitioner\",\"source\":\"directory\"}]\n```";

    vi.mocked(callLLM).mockResolvedValueOnce(markdownJson);

    const input = JSON.stringify({
      type: "directory",
      query: "test",
      maxResults: 1,
    });

    const result = await agent.execute(input, {
      businessProfile: defaultProfile,
    });

    expect(result.status).toBe("completed");
    const parsed = JSON.parse(result.output);
    expect(parsed.leads.length).toBe(1);
  });
});
