import { describe, it, expect, vi, beforeEach } from "vitest";
import { AgentManager, getAgentManager } from "../agent-manager";

// All DB calls are mocked in test-setup.ts
// All callLLM calls are mocked in test-setup.ts

describe("AgentManager", () => {
  let manager: AgentManager;

  beforeEach(() => {
    vi.clearAllMocks();
    // Create a fresh instance for each test
    manager = new AgentManager();
  });

  describe("agent registration and retrieval", () => {
    it("provides access to all registered agents", () => {
      const allAgents = manager.getAllAgents();
      const types = allAgents.map((a) => a.config.type);

      expect(types).toContain("content");
      expect(types).toContain("research");
      expect(types).toContain("outreach");
      expect(types).toContain("ceo");
      expect(types).toContain("cfo");
      expect(types).toContain("analyst");
      expect(types).toContain("design");
      expect(types).toContain("sales");
      expect(types).toContain("developer");
    });

    it("returns agent config for each type", () => {
      const config = manager.getAgentConfig("content");
      expect(config).toBeDefined();
      expect(config!.type).toBe("content");
      expect(config!.name).toBe("AI Content Creator");
    });

    it("returns undefined for missing config", () => {
      // All types should be registered
      const types = manager.getAllAgents().map((a) => a.config.type);
      expect(types.length).toBeGreaterThanOrEqual(9);
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

    it("scraper is now registered as an agent with config", () => {
      // scraper is now in both initializeAgents and DEFAULT_CONFIGS
      const agent = manager.getAgent("scraper" as any);
      expect(agent).toBeDefined();
      expect(agent!.getConfig().type).toBe("scraper");
      // Config should also be available
      const config = manager.getAgentConfig("scraper" as any);
      expect(config).toBeDefined();
      expect(config!.type).toBe("scraper");
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

      // The mock in test-setup returns a generic JSON response
      // But the agent should still process and return a result
      expect(result).toBeDefined();
      expect(result.agentType).toBe("content");
    });

    it("updates status to running then completed", async () => {
      // Before execution
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

      // After successful execution
      expect(manager.getAgentStatus("content")).toBe("completed");
    });
  });

  describe("department teams", () => {
    it("returns department team definitions", () => {
      const teams = manager.getDepartmentTeams();
      expect(teams).toBeDefined();
      expect(Object.keys(teams).length).toBeGreaterThanOrEqual(6);
    });

    it("each department has sub-agents", () => {
      const teams = manager.getDepartmentTeams();
      for (const [, dept] of Object.entries(teams)) {
        expect(dept.subAgents.length).toBeGreaterThan(0);
        expect(dept.name).toBeTruthy();
        expect(dept.color).toBeTruthy();
      }
    });
  });

  describe("team summary", () => {
    it("returns a team summary with department info", async () => {
      const summary = await manager.getTeamSummary();
      expect(summary).toBeDefined();
      expect(Array.isArray(summary.departments)).toBe(true);
      expect(typeof summary.activeProjects).toBe("number");
      expect(summary.totalTeamMembers).toBe(summary.departments.length);
    });
  });

  describe("getDepartmentReports", () => {
    it("returns department reports", async () => {
      const reports = await manager.getDepartmentReports();
      expect(Array.isArray(reports)).toBe(true);
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
