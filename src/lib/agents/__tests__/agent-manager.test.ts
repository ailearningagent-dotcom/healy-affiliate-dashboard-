import { describe, it, expect, vi, beforeEach } from "vitest";
import { AgentManager, getAgentManager } from "../agent-manager";

describe("AgentManager", () => {
  let manager: AgentManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new AgentManager();
  });

  describe("agent registration and retrieval", () => {
    it("provides access to all registered agents", () => {
      const allAgents = manager.getAllAgents();
      const types = allAgents.map((a) => a.config.type);

      expect(types).toContain("content");
      expect(types).toContain("research");
      expect(types).toContain("outreach");
      expect(types).toContain("sales");
      expect(types).toContain("scraper");
    });

    it("returns agent config for each type", () => {
      const config = manager.getAgentConfig("content");
      expect(config).toBeDefined();
      expect(config!.type).toBe("content");
      expect(config!.name).toBe("AI Content Creator");
    });

    it("returns undefined for unregistered type", () => {
      const config = manager.getAgentConfig("unknown" as any);
      expect(config).toBeUndefined();
    });

    it("all agents start with idle status", () => {
      const allAgents = manager.getAllAgents();
      allAgents.forEach((a) => {
        expect(manager.getAgentStatus(a.config.type)).toBe("idle");
      });
    });

    it("returns agent instance for valid type", () => {
      const agent = manager.getAgent("content");
      expect(agent).toBeDefined();
      expect(agent!.getConfig().type).toBe("content");
    });
  });

  describe("executeAgent", () => {
    it("returns error result for unknown agent type", async () => {
      const result = await manager.executeAgent("unknown" as any, "{}");
      expect(result.status).toBe("error");
      expect(result.error).toContain("Agent type 'unknown' not found");
    });

    it("executes an agent and returns the result", async () => {
      const result = await manager.executeAgent(
        "content",
        JSON.stringify({
          topic: "Test",
          contentType: "blog",
          targetAudience: "Testers",
          keyPoints: ["Test point"],
        })
      );
      expect(result).toBeDefined();
      expect(result.agentType).toBe("content");
    });

    it("updates status to running then completed", async () => {
      expect(manager.getAgentStatus("content")).toBe("idle");
      await manager.executeAgent(
        "content",
        JSON.stringify({
          topic: "Health Benefits",
          contentType: "blog",
          targetAudience: "Wellness seekers",
          keyPoints: ["Benefit 1"],
        })
      );
      expect(manager.getAgentStatus("content")).toBe("completed");
    });
  });

  describe("singleton pattern", () => {
    it("getAgentManager returns the same instance", () => {
      const instance1 = getAgentManager();
      const instance2 = getAgentManager();
      expect(instance1).toBe(instance2);
    });
  });
});
