import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPipelineOrchestrator, getDefaultPipelineConfig } from "../pipeline-orchestrator";
import type { PipelineConfig } from "../pipeline-orchestrator";

// Mock dependencies with in-memory store for round-trip
const settingStore = new Map<string, string>();

vi.mock("@/lib/db", () => ({
  getSetting: vi.fn(async (key: string) => settingStore.get(key)),
  setSetting: vi.fn(async (key: string, value: string) => { settingStore.set(key, value); }),
  dbList: vi.fn().mockResolvedValue([]),
  upsertLead: vi.fn().mockResolvedValue(undefined),
  getRecentResults: vi.fn().mockResolvedValue([]),
  upsertResult: vi.fn().mockResolvedValue(undefined),
  loadAllSequenceIds: vi.fn().mockResolvedValue([]),
}));

vi.mock("../google-maps-scraper", () => ({
  scrapeGoogleMaps: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/llm/call-llm", () => ({
  callLLM: vi.fn().mockResolvedValue("[]"),
}));

vi.mock("@/lib/business-profile", () => ({
  loadBusinessProfile: vi.fn().mockReturnValue({
    businessName: "Healy",
    industry: "frequency wellness technology",
    targetAudience: "Wellness seekers",
    productDescription: "Personalized microcurrent frequency wellness devices",
    keySellingPoints: "Non-invasive, drug-free, wearable",
    brandVoice: "Warm, educational, holistic",
  }),
}));

// Import default-config module to verify env-affected defaults
vi.mock("@/lib/agents/default-config", () => ({
  getDefaultProvider: () => "gemini",
  getDefaultModel: (role: string) => role === "flash" ? "gemini-2.0-flash" : "gemini-2.0-flash-lite",
}));

describe("PipelineOrchestrator", () => {
  let orchestrator: ReturnType<typeof getPipelineOrchestrator>;

  beforeEach(() => {
    vi.clearAllMocks();
    settingStore.clear();
    orchestrator = getPipelineOrchestrator();
  });

  describe("getConfig", () => {
    it("returns default config when no settings are stored", async () => {
      const config = await orchestrator.getConfig();
      const defaults = getDefaultPipelineConfig();
      expect(config.enabled).toBe(defaults.enabled);
      expect(config.scrapeIntervalHours).toBe(defaults.scrapeIntervalHours);
      expect(config.enrichEnabled).toBe(true);
      expect(config.nurtureEnabled).toBe(true);
      expect(config.defaultSource).toBe("google-maps");
      expect(config.maxLeadsPerScrape).toBe(10);
      expect(config.preferredModel).toBe("gemini-2.0-flash-lite");
    });
  });

  describe("getState", () => {
    it("returns default state when no state is stored", async () => {
      const state = await orchestrator.getState();
      expect(state.status).toBe("idle");
      expect(state.totalLeadsSourced).toBe(0);
      expect(state.totalCostIncurred).toBe(0);
      expect(state.cycleCount).toBe(0);
    });
  });

  describe("updateConfig", () => {
    it("updates config values", async () => {
      await orchestrator.updateConfig({
        scrapeIntervalHours: 12,
        maxLeadsPerScrape: 20,
        defaultQuery: "chiropractor",
      });

      const config = await orchestrator.getConfig();
      expect(config.scrapeIntervalHours).toBe(12);
      expect(config.maxLeadsPerScrape).toBe(20);
      expect(config.defaultQuery).toBe("chiropractor");
    });

    it("saves and retrieves enabled state", async () => {
      await orchestrator.updateConfig({ enabled: true });
      const config = await orchestrator.getConfig();
      expect(config.enabled).toBe(true);

      await orchestrator.updateConfig({ enabled: false });
      const config2 = await orchestrator.getConfig();
      expect(config2.enabled).toBe(false);
    });
  });

  describe("tick", () => {
    it("handles a tick with no leads (empty scrape)", async () => {
      const result = await orchestrator.tick();
      expect(result.phase).toBe("complete");
      expect(result.leadsAdded).toBe(0);
      expect(result.leadsEnriched).toBe(0);
      expect(result.sequencesCreated).toBe(0);
    });

    it("skips tick if already running", async () => {
      const firstPromise = orchestrator.tick();
      const secondPromise = orchestrator.tick();
      const [first, second] = await Promise.all([firstPromise, secondPromise]);
      expect(first.phase).toBe("complete");
      expect(second.phase).toBe("skipped (already running)");
    });
  });

  describe("checkAndRun", () => {
    it("does nothing when pipeline is not enabled", async () => {
      await orchestrator.checkAndRun();
    });
  });

  describe("default config factory", () => {
    it("returns sensible defaults", () => {
      const defaults = getDefaultPipelineConfig();
      expect(defaults.enabled).toBe(false);
      expect(defaults.scrapeIntervalHours).toBe(24);
      expect(defaults.preferredModel).toBe("gemini-2.0-flash-lite");
      expect(defaults.defaultSource).toBe("google-maps");
    });
  });
});
