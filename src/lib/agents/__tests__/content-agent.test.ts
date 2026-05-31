import { describe, it, expect, vi, beforeEach } from "vitest";
import { ContentAgent } from "../content-agent";
import type { AgentConfig } from "../types";

// callLLM is already mocked in test-setup.ts - use the reference
import { callLLM } from "@/lib/llm/call-llm";

const config: AgentConfig = {
  type: "content",
  name: "AI Content Creator",
  description: "Creates content",
  model: "gpt-4o-mini",
  temperature: 0.7,
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

describe("ContentAgent", () => {
  let agent: ContentAgent;

  beforeEach(() => {
    agent = new ContentAgent(config);
    vi.clearAllMocks();
  });

  it("creates blog content successfully", async () => {
    const mockOutput = `# Natural Stress Relief
      
This is the body of the blog post about natural stress relief methods.

It covers meditation, exercise, and holistic approaches.

## Key Benefits
- Reduces cortisol
- Improves sleep
- Increases energy

Ready to try natural wellness? Book a consultation today.`;

    vi.mocked(callLLM).mockResolvedValueOnce(mockOutput);

    const input = JSON.stringify({
      topic: "Natural Stress Relief",
      contentType: "blog",
      targetAudience: "Wellness seekers",
      keyPoints: ["Meditation benefits", "Exercise for stress", "Holistic approaches"],
      tone: "Warm & Educational",
      length: "medium",
      keywords: ["stress relief", "natural wellness", "holistic health"],
    });

    const result = await agent.execute(input);

    expect(result.status).toBe("completed");
    expect(result.agentType).toBe("content");

    const parsed = JSON.parse(result.output);
    expect(parsed.title).toBe("Natural Stress Relief");
    expect(parsed.contentType).toBe("blog");
    expect(parsed.body).toContain("Natural Stress Relief");
    expect(parsed.excerpt).toBeTruthy();
    expect(parsed.seoKeywords).toContain("stress relief");
    expect(parsed.estimatedReadTime).toBeGreaterThan(0);
    expect(typeof parsed.generatedAt).toBe("string"); // Dates become strings after JSON processing
  });

  it("creates social media content", async () => {
    const socialOutput = "# Boost Your Energy Naturally!\n\nShort social post about energy.";
    vi.mocked(callLLM).mockResolvedValueOnce(socialOutput);

    const input = JSON.stringify({
      topic: "Energy Boost",
      contentType: "social",
      targetAudience: "Biohackers",
      keyPoints: ["Natural energy", "No caffeine"],
      tone: "Inspirational",
      length: "short",
      keywords: ["energy", "natural"],
    });

    const result = await agent.execute(input);
    expect(result.status).toBe("completed");

    const parsed = JSON.parse(result.output);
    expect(parsed.contentType).toBe("social");
  });

  it("handles LLM failure gracefully", async () => {
    vi.mocked(callLLM).mockRejectedValueOnce(new Error("API rate limit exceeded"));

    const input = JSON.stringify({
      topic: "Test",
      contentType: "blog",
      targetAudience: "Test",
      keyPoints: ["Point 1"],
    });

    const result = await agent.execute(input);
    expect(result.status).toBe("error");
    expect(result.error).toContain("API rate limit exceeded");
  });

  it("extracts title from markdown headings", async () => {
    const output = "### Wellness Tips\nSome body content here.";
    vi.mocked(callLLM).mockResolvedValueOnce(output);

    const input = JSON.stringify({
      topic: "Wellness Tips",
      contentType: "blog",
      targetAudience: "Everyone",
      keyPoints: ["Tip 1"],
    });

    const result = await agent.execute(input);
    const parsed = JSON.parse(result.output);
    expect(parsed.title).toBe("Wellness Tips");
  });

  it("extracts excerpt from first paragraph", async () => {
    const output = "# Title\n\nFirst paragraph with useful information about wellness.\n\nSecond paragraph here.";
    vi.mocked(callLLM).mockResolvedValueOnce(output);

    const input = JSON.stringify({
      topic: "Title",
      contentType: "blog",
      targetAudience: "Everyone",
      keyPoints: ["Point"],
    });

    const result = await agent.execute(input);
    const parsed = JSON.parse(result.output);
    expect(parsed.excerpt.length).toBeGreaterThan(0);
    expect(parsed.excerpt.length).toBeLessThanOrEqual(200);
  });

  it("uses business profile from context", async () => {
    vi.mocked(callLLM).mockResolvedValueOnce("# Custom Content\n\nBody");

    const input = JSON.stringify({
      topic: "Custom Topic",
      contentType: "blog",
      targetAudience: "Custom audience",
      keyPoints: ["Custom point"],
    });

    const customProfile = {
      ...defaultProfile,
      businessName: "Custom Wellness Co",
    };

    const result = await agent.execute(input, {
      businessProfile: customProfile,
    });

    // Verify that callLLM was called with the custom profile filled in
    const systemPrompt = vi.mocked(callLLM).mock.calls[0][0];
    expect(systemPrompt).toContain("Custom Wellness Co");

    expect(result.status).toBe("completed");
  });

  it("handles non-JSON LLM output (fallback)", async () => {
    vi.mocked(callLLM).mockResolvedValueOnce("Just plain text without any JSON structure");

    const input = JSON.stringify({
      topic: "Fallback Topic",
      contentType: "blog",
      targetAudience: "Test",
      keyPoints: ["Point"],
    });

    const result = await agent.execute(input);
    expect(result.status).toBe("completed");

    // Should still produce a valid content result
    const parsed = JSON.parse(result.output);
    expect(parsed.title).toBe("Fallback Topic");
    expect(parsed.body).toBe("Just plain text without any JSON structure");
  });

  it("creates email content type", async () => {
    const emailOutput = "# Nurture Email\n\nBody with educational content.";
    vi.mocked(callLLM).mockResolvedValueOnce(emailOutput);

    const input = JSON.stringify({
      topic: "Welcome Series",
      contentType: "email",
      targetAudience: "New subscribers",
      keyPoints: ["Welcome", "Introduction"],
    });

    const result = await agent.execute(input);
    expect(result.status).toBe("completed");

    const parsed = JSON.parse(result.output);
    expect(parsed.contentType).toBe("email");
  });

  it("creates landing page content", async () => {
    vi.mocked(callLLM).mockResolvedValueOnce("# Landing Page\n\nConversion copy.");
    const input = JSON.stringify({
      topic: "Product Launch",
      contentType: "landing",
      targetAudience: "Early adopters",
      keyPoints: ["Benefit 1", "Benefit 2"],
    });

    const result = await agent.execute(input);
    expect(result.status).toBe("completed");

    const parsed = JSON.parse(result.output);
    expect(parsed.contentType).toBe("landing");
  });
});
