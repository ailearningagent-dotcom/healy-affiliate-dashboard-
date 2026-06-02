import { describe, it, expect, vi } from "vitest";
import { BaseAgent } from "../base-agent";
import type { AgentConfig, AgentResult, AgentType } from "../types";

// Create a concrete implementation for testing
class TestAgent extends BaseAgent {
  async execute(input: string, _context?: Record<string, unknown>): Promise<AgentResult> {
    try {
      this.setApiKey(_context?.apiKey as string | undefined);
      return this.createResult("content", input, { processed: true });
    } catch (error) {
      return this.createErrorResult(
        "content",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}

class ErrorAgent extends BaseAgent {
  async execute(_input?: string, _context?: Record<string, unknown>): Promise<AgentResult> {
    return this.createErrorResult("outreach", "API key missing");
  }
}

const defaultConfig: AgentConfig = {
  type: "content",
  name: "Test Agent",
  description: "For testing",
  model: "gpt-4o-mini",
  temperature: 0.7,
  maxTokens: 2048,
  provider: "openai",
};

describe("BaseAgent", () => {
  it("stores config from constructor", () => {
    const agent = new TestAgent(defaultConfig);
    expect(agent.getConfig()).toEqual(defaultConfig);
  });

  it("returns config with all required properties", () => {
    const agent = new TestAgent(defaultConfig);
    const config = agent.getConfig();
    expect(config.type).toBe("content");
    expect(config.name).toBe("Test Agent");
    expect(config.model).toBe("gpt-4o-mini");
    expect(config.temperature).toBe(0.7);
    expect(config.maxTokens).toBe(2048);
    expect(config.provider).toBe("openai");
  });

  it("execute returns AgentResult with completed status on success", async () => {
    const agent = new TestAgent(defaultConfig);
    const result = await agent.execute("hello world");

    expect(result).toBeDefined();
    expect(result.agentType).toBe("content");
    expect(result.status).toBe("completed");
    expect(result.output).toBe("hello world");
    expect(result.metadata).toEqual({ processed: true });
    expect(result.id).toBeTruthy();
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it("execute returns AgentResult with error status on failure", async () => {
    const agent = new ErrorAgent(defaultConfig);
    const result = await agent.execute();

    expect(result.status).toBe("error");
    expect(result.error).toBe("API key missing");
    expect(result.output).toBe("");
    expect(result.id).toBeTruthy();
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it("createResult generates a unique ID for each result", async () => {
    const agent = new TestAgent(defaultConfig);
    const result1 = await agent.execute("first");
    const result2 = await agent.execute("second");

    expect(result1.id).not.toBe(result2.id);
  });

  it("accepts optional apiKey via setApiKey", async () => {
    const agent = new TestAgent(defaultConfig);
    const result = await agent.execute("test", { apiKey: "sk-test123" });

    expect(result.status).toBe("completed");
    expect(result.output).toBe("test");
  });

  it("handles all agent types", async () => {
    const types: AgentType[] = [
      "sales", "content", "research", "outreach", "scraper",
    ];

    for (const type of types) {
      const config: AgentConfig = { ...defaultConfig, type };
      const agent = new TestAgent(config);
      expect(agent.getConfig().type).toBe(type);
    }
  });
});

describe("AgentResult structure", () => {
  it("completed result matches the AgentResult interface", async () => {
    const agent = new TestAgent(defaultConfig);
    const result = await agent.execute(`{"test": true}`);

    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("agentType");
    expect(result).toHaveProperty("status");
    expect(result).toHaveProperty("output");
    expect(result).toHaveProperty("createdAt");

    expect(typeof result.id).toBe("string");
    expect(result.agentType).toMatch(/^(ceo|cfo|analyst|design|sales|developer|content|research|outreach|scraper)$/);
    expect(result.status).toMatch(/^(idle|running|completed|error)$/);
    expect(typeof result.output).toBe("string");
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it("error result has error field", async () => {
    const agent = new ErrorAgent(defaultConfig);
    const result = await agent.execute();

    expect(result).toHaveProperty("error");
    expect(typeof result.error).toBe("string");
    expect(result.status).toBe("error");
  });
});
