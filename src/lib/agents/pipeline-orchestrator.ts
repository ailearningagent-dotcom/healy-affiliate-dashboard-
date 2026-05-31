/**
 * Pipeline Orchestrator — Fully Autonomous Lead Generation System
 *
 * Runs on a configurable interval with zero manual intervention.
 * Cost-optimized architecture:
 *   - Google Maps browser scraping (Puppeteer): $0 per cycle
 *   - Gemini 2.0 Flash-Lite enrichment: ~$0.00005 per lead
 *   - Default nurture templates (no LLM call): $0
 *
 * Total per cycle (10 leads): ~$0.0007 — fractions of a cent.
 *
 * Phases:
 *   1. Scrape (Google Maps Puppeteer): $0
 *   2. Enrich (Gemini Flash-Lite): ~$0.00005/lead
 *   3. Nurture (Default templates): $0
 *   4. Followup (Email via Gmail SMTP + WhatsApp Web): $0
 *   5. Auto-Book (Calendar API): $0
 */

import { logger } from "@/lib/logger";
import {
  getSetting,
  setSetting,
  dbList,
  upsertLead,
  getRecentResults,
  upsertResult,
} from "@/lib/db";
import { scrapeGoogleMaps } from "./google-maps-scraper";
import { callLLM } from "@/lib/llm/call-llm";
import { NurtureEngine } from "./nurture-engine";
import { FollowupEngine } from "./followup-engine";
import { AutoBooker } from "./auto-booker";
import { engageLeads } from "./lead-engager";
import { getDefaultProvider, getDefaultModel } from "./default-config";
import { getDefaultBusinessProfile, computeLeadTemperature, type Lead, type ScrapedLead, type BusinessProfile, type AgentResult, type NurtureSequence } from "./types";

// ========================================================================
// CONFIGURATION KEYS (stored in DB settings table)
// ========================================================================

const SETTING_PREFIX = "pipeline_";

const CONFIG_KEYS = {
  ENABLED: `${SETTING_PREFIX}enabled`,
  SCRAPE_INTERVAL_HOURS: `${SETTING_PREFIX}scrape_interval_hours`,
  ENRICH_ENABLED: `${SETTING_PREFIX}enrich_enabled`,
  NURTURE_ENABLED: `${SETTING_PREFIX}nurture_enabled`,
  FOLLOWUP_ENABLED: `${SETTING_PREFIX}followup_enabled`,
  AUTO_BOOK_ENABLED: `${SETTING_PREFIX}auto_book_enabled`,
  DEFAULT_SOURCE: `${SETTING_PREFIX}default_source`,
  DEFAULT_LOCATION: `${SETTING_PREFIX}default_location`,
  DEFAULT_QUERY: `${SETTING_PREFIX}default_query`,
  MAX_LEADS_PER_SCRAPE: `${SETTING_PREFIX}max_leads_per_scrape`,
  PREFERRED_MODEL: `${SETTING_PREFIX}preferred_model`,
  PREFERRED_PROVIDER: `${SETTING_PREFIX}preferred_provider`,
} as const;

const STATE_KEYS = {
  STATUS: `${SETTING_PREFIX}status`,
  LAST_SCRAPE_AT: `${SETTING_PREFIX}last_scrape_at`,
  LAST_ENRICH_AT: `${SETTING_PREFIX}last_enrich_at`,
  LAST_NURTURE_AT: `${SETTING_PREFIX}last_nurture_at`,
  TOTAL_LEADS_SOURCED: `${SETTING_PREFIX}total_leads_sourced`,
  TOTAL_COST_INCURRED: `${SETTING_PREFIX}total_cost_incurred`,
  NEXT_SCRAPE_AT: `${SETTING_PREFIX}next_scrape_at`,
  ERROR: `${SETTING_PREFIX}error`,
  CYCLE_COUNT: `${SETTING_PREFIX}cycle_count`,
} as const;

// ========================================================================
// DEFAULT CONFIG
// ========================================================================

export interface PipelineConfig {
  enabled: boolean;
  scrapeIntervalHours: number;
  enrichEnabled: boolean;
  nurtureEnabled: boolean;
  followupEnabled: boolean;
  autoBookEnabled: boolean;
  defaultSource: string;
  defaultLocation: string;
  defaultQuery: string;
  maxLeadsPerScrape: number;
  preferredModel: string;
  preferredProvider: string;
}

export function getDefaultPipelineConfig(): PipelineConfig {
  return {
    enabled: false,
    scrapeIntervalHours: 24,
    enrichEnabled: true,
    nurtureEnabled: true,
    followupEnabled: true,
    autoBookEnabled: true,
    defaultSource: "google-maps",
    defaultLocation: "",
    defaultQuery: "wellness center health clinic",
    maxLeadsPerScrape: 10,
    preferredModel: getDefaultModel("flash-lite"),
    preferredProvider: getDefaultProvider(),
  };
}

// ========================================================================
// PIPELINE STATE
// ========================================================================

export interface PipelineState {
  status: "idle" | "running" | "error" | "paused";
  lastScrapeAt: string | null;
  lastEnrichAt: string | null;
  lastNurtureAt: string | null;
  totalLeadsSourced: number;
  totalCostIncurred: number;
  nextScrapeAt: string | null;
  error: string | null;
  cycleCount: number;
  uptime: number; // seconds since pipeline started
}

// ========================================================================
// ENRICHMENT SYSTEM PROMPT (cheapest model possible)
// ========================================================================

const ENRICH_SYSTEM_PROMPT = `You are a lead qualification specialist for {businessName} ({industry}). Your task is to analyze each lead and provide:

1. Persona Type: "practitioner" | "wellness-seeker" | "biohacker" | "business-builder"
2. Lead Score: 0-100 (based on fit for {productDescription})
3. Pain Points: What specific needs or problems they likely have
4. Best Outreach Angle: How to approach them
5. Notes: 1-2 sentence summary of why they're a good fit

Respond with a JSON array where each element corresponds to the input lead in order.
Each element: { index: number, personaType: string, score: number, painPoints: string, outreachAngle: string, notes: string }`;

// ========================================================================
// THE ORCHESTRATOR
// ========================================================================

class PipelineOrchestrator {
  private _timer: ReturnType<typeof setInterval> | null = null;
  private _startedAt: number | null = null;
  private _running = false;

  // ==================== CONFIG ====================

  async getConfig(): Promise<PipelineConfig> {
    const defaults = getDefaultPipelineConfig();
    const [enabled, interval, enrich, nurture, followup, autoBook, source, location, query, maxLeads, model, provider, globalProvider, globalModel] =
      await Promise.all([
        getSetting(CONFIG_KEYS.ENABLED),
        getSetting(CONFIG_KEYS.SCRAPE_INTERVAL_HOURS),
        getSetting(CONFIG_KEYS.ENRICH_ENABLED),
        getSetting(CONFIG_KEYS.NURTURE_ENABLED),
        getSetting(CONFIG_KEYS.FOLLOWUP_ENABLED),
        getSetting(CONFIG_KEYS.AUTO_BOOK_ENABLED),
        getSetting(CONFIG_KEYS.DEFAULT_SOURCE),
        getSetting(CONFIG_KEYS.DEFAULT_LOCATION),
        getSetting(CONFIG_KEYS.DEFAULT_QUERY),
        getSetting(CONFIG_KEYS.MAX_LEADS_PER_SCRAPE),
        getSetting(CONFIG_KEYS.PREFERRED_MODEL),
        getSetting(CONFIG_KEYS.PREFERRED_PROVIDER),
        getSetting("global_default_provider"),
        getSetting("global_default_model"),
      ]);

    return {
      enabled: enabled === "true",
      scrapeIntervalHours: interval ? parseInt(interval) : defaults.scrapeIntervalHours,
      enrichEnabled: enrich === "true" || enrich === null || enrich === undefined,
      nurtureEnabled: nurture === "true" || nurture === null || nurture === undefined,
      followupEnabled: followup === "true" || followup === null || followup === undefined,
      autoBookEnabled: autoBook === "true" || autoBook === null || autoBook === undefined,
      defaultSource: source || defaults.defaultSource,
      defaultLocation: location || defaults.defaultLocation,
      defaultQuery: query || defaults.defaultQuery,
      maxLeadsPerScrape: maxLeads ? parseInt(maxLeads) : defaults.maxLeadsPerScrape,
      preferredModel: model || globalModel || defaults.preferredModel,
      preferredProvider: provider || globalProvider || defaults.preferredProvider,
    };
  }

  async updateConfig(updates: Partial<PipelineConfig>): Promise<void> {
    const promises: Promise<void>[] = [];
    if (updates.enabled !== undefined) promises.push(setSetting(CONFIG_KEYS.ENABLED, String(updates.enabled)));
    if (updates.scrapeIntervalHours !== undefined) promises.push(setSetting(CONFIG_KEYS.SCRAPE_INTERVAL_HOURS, String(updates.scrapeIntervalHours)));
    if (updates.enrichEnabled !== undefined) promises.push(setSetting(CONFIG_KEYS.ENRICH_ENABLED, String(updates.enrichEnabled)));
    if (updates.nurtureEnabled !== undefined) promises.push(setSetting(CONFIG_KEYS.NURTURE_ENABLED, String(updates.nurtureEnabled)));
    if (updates.followupEnabled !== undefined) promises.push(setSetting(CONFIG_KEYS.FOLLOWUP_ENABLED, String(updates.followupEnabled)));
    if (updates.autoBookEnabled !== undefined) promises.push(setSetting(CONFIG_KEYS.AUTO_BOOK_ENABLED, String(updates.autoBookEnabled)));
    if (updates.defaultSource !== undefined) promises.push(setSetting(CONFIG_KEYS.DEFAULT_SOURCE, updates.defaultSource));
    if (updates.defaultLocation !== undefined) promises.push(setSetting(CONFIG_KEYS.DEFAULT_LOCATION, updates.defaultLocation));
    if (updates.defaultQuery !== undefined) promises.push(setSetting(CONFIG_KEYS.DEFAULT_QUERY, updates.defaultQuery));
    if (updates.maxLeadsPerScrape !== undefined) promises.push(setSetting(CONFIG_KEYS.MAX_LEADS_PER_SCRAPE, String(updates.maxLeadsPerScrape)));
    if (updates.preferredModel !== undefined) promises.push(setSetting(CONFIG_KEYS.PREFERRED_MODEL, updates.preferredModel));
    if (updates.preferredProvider !== undefined) promises.push(setSetting(CONFIG_KEYS.PREFERRED_PROVIDER, updates.preferredProvider));
    await Promise.all(promises);

    // If enabling, schedule immediately
    const config = await this.getConfig();
    if (config.enabled && !this._timer) {
      await this.scheduleNextScrape();
      this._startTimer();
    } else if (!config.enabled && this._timer) {
      this._stopTimer();
    }
  }

  // ==================== STATE ====================

  async getState(): Promise<PipelineState> {
    const [status, lastScrape, lastEnrich, lastNurture, totalLeads, totalCost, nextScrape, error, cycleCount] =
      await Promise.all([
        getSetting(STATE_KEYS.STATUS),
        getSetting(STATE_KEYS.LAST_SCRAPE_AT),
        getSetting(STATE_KEYS.LAST_ENRICH_AT),
        getSetting(STATE_KEYS.LAST_NURTURE_AT),
        getSetting(STATE_KEYS.TOTAL_LEADS_SOURCED),
        getSetting(STATE_KEYS.TOTAL_COST_INCURRED),
        getSetting(STATE_KEYS.NEXT_SCRAPE_AT),
        getSetting(STATE_KEYS.ERROR),
        getSetting(STATE_KEYS.CYCLE_COUNT),
      ]);

    return {
      status: (status as PipelineState["status"]) || "idle",
      lastScrapeAt: lastScrape || null,
      lastEnrichAt: lastEnrich || null,
      lastNurtureAt: lastNurture || null,
      totalLeadsSourced: totalLeads ? parseInt(totalLeads) : 0,
      totalCostIncurred: totalCost ? parseFloat(totalCost) : 0,
      nextScrapeAt: nextScrape || null,
      error: error || null,
      cycleCount: cycleCount ? parseInt(cycleCount) : 0,
      uptime: this._startedAt ? Math.floor((Date.now() - this._startedAt) / 1000) : 0,
    };
  }

  private async setState(updates: Partial<PipelineState>): Promise<void> {
    const promises: Promise<void>[] = [];
    if (updates.status !== undefined) promises.push(setSetting(STATE_KEYS.STATUS, updates.status));
    if (updates.lastScrapeAt !== undefined) promises.push(setSetting(STATE_KEYS.LAST_SCRAPE_AT, updates.lastScrapeAt || ""));
    if (updates.lastEnrichAt !== undefined) promises.push(setSetting(STATE_KEYS.LAST_ENRICH_AT, updates.lastEnrichAt || ""));
    if (updates.lastNurtureAt !== undefined) promises.push(setSetting(STATE_KEYS.LAST_NURTURE_AT, updates.lastNurtureAt || ""));
    if (updates.totalLeadsSourced !== undefined) promises.push(setSetting(STATE_KEYS.TOTAL_LEADS_SOURCED, String(updates.totalLeadsSourced)));
    if (updates.totalCostIncurred !== undefined) promises.push(setSetting(STATE_KEYS.TOTAL_COST_INCURRED, String(updates.totalCostIncurred)));
    if (updates.nextScrapeAt !== undefined) promises.push(setSetting(STATE_KEYS.NEXT_SCRAPE_AT, updates.nextScrapeAt || ""));
    if (updates.error !== undefined) promises.push(setSetting(STATE_KEYS.ERROR, updates.error || ""));
    if (updates.cycleCount !== undefined) promises.push(setSetting(STATE_KEYS.CYCLE_COUNT, String(updates.cycleCount)));
    await Promise.all(promises);
  }

  // ==================== SCHEDULER ====================

  /**
   * Start the pipeline scheduler. Runs ticks on the configured interval.
   */
  async start(): Promise<void> {
    const config = await this.getConfig();
    if (this._timer) return; // Already running

    await this.updateConfig({ enabled: true });
    await this.setState({ status: "idle", error: null });
    this._startedAt = Date.now();
    await this.scheduleNextScrape();
    this._startTimer();

    logger.info("Pipeline", "Auto-Pilot started. Next scrape scheduled.");
  }

  /**
   * Stop the pipeline scheduler.
   */
  async stop(): Promise<void> {
    this._stopTimer();
    await this.updateConfig({ enabled: false });
    await this.setState({ status: "paused" });
    this._startedAt = null;
    logger.info("Pipeline", "Auto-Pilot stopped.");
  }

  /**
   * Run a single full pipeline tick (scrape → enrich → nurture).
   * Safe to call externally (e.g., from cron endpoint).
   */
  async tick(): Promise<{ phase: string; leadsAdded: number; leadsEnriched: number; sequencesCreated: number; followupsSent: number; appointmentsBooked: number; cost: number }> {
    const config = await this.getConfig();
    if (this._running) {
      return { phase: "skipped (already running)", leadsAdded: 0, leadsEnriched: 0, sequencesCreated: 0, followupsSent: 0, appointmentsBooked: 0, cost: 0 };
    }

    this._running = true;
    await this.setState({ status: "running" });

    let totalCost = 0;
    let leadsAdded = 0;
    let leadsEnriched = 0;
    let sequencesCreated = 0;
    let followupsSent = 0;
    let appointmentsBooked = 0;

    try {
      // ========== PHASE 1: Scrape ==========
      if (config.defaultSource === "google-maps") {
        const scrapeResult = await this.runScrapePhase(config);
        leadsAdded = scrapeResult.leadsAdded;
        totalCost += scrapeResult.cost;
      }

      // ========== PHASE 2: Enrich ==========
      if (config.enrichEnabled) {
        const enrichResult = await this.runEnrichPhase(config);
        leadsEnriched = enrichResult.leadsEnriched;
        totalCost += enrichResult.cost;
      }

      // ========== PHASE 3: Nurture ==========
      if (config.nurtureEnabled) {
        const nurtureResult = await this.runNurturePhase(config);
        sequencesCreated = nurtureResult.sequencesCreated;
        totalCost += nurtureResult.cost;
      }

      // ========== PHASE 4: 360 Follow-up (Email + WhatsApp) ==========
      if (config.followupEnabled) {
        const followupEngine = new FollowupEngine();
        const followupResult = await followupEngine.runFollowupCycle();
        followupsSent = followupResult.totalSent;
        totalCost += followupResult.totalCost;

        // Note: FollowupEngine already advances sequences internally on success
      }

      // ========== PHASE 5: Auto-Book Appointments ==========
      if (config.autoBookEnabled) {
        const booker = new AutoBooker();
        const bookingResult = await booker.scanAndBook();
        appointmentsBooked = bookingResult.booked;
      }

      // ========== Update state ==========
      const state = await this.getState();
      await this.setState({
        status: "idle",
        totalLeadsSourced: (state.totalLeadsSourced || 0) + leadsAdded,
        totalCostIncurred: (state.totalCostIncurred || 0) + totalCost,
        cycleCount: (state.cycleCount || 0) + 1,
        error: null,
      });

      // Schedule next scrape
      await this.scheduleNextScrape();

      logger.info("Pipeline", "Tick complete", { leadsAdded, leadsEnriched, sequencesCreated, followupsSent, appointmentsBooked, cost: totalCost });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown pipeline error";
      logger.error("Pipeline", "Tick error", { error: message });
      await this.setState({ status: "error", error: message });
    } finally {
      this._running = false;
    }

    // Record this tick as an agent result for history
    await upsertResult({
      id: crypto.randomUUID(),
      agentType: "analyst",
      status: "completed",
      output: JSON.stringify({
        type: "pipeline_tick",
        leadsAdded,
        leadsEnriched,
        sequencesCreated,
        followupsSent,
        appointmentsBooked,
        cost: totalCost,
      }),
      createdAt: new Date(),
      metadata: {
        label: `Pipeline: +${leadsAdded} leads, ${followupsSent} msgs, ${appointmentsBooked} booked, $${totalCost.toFixed(4)} cost`,
      },
    });

    return { phase: "complete", leadsAdded, leadsEnriched, sequencesCreated, followupsSent, appointmentsBooked, cost: totalCost };
  }

  // ==================== PHASE 1: SCRAPE (Google Maps — $0) ====================

  private async runScrapePhase(config: PipelineConfig): Promise<{ leadsAdded: number; cost: number }> {
    const profile = await this._getBusinessProfile();
    const query = config.defaultQuery || "wellness center health clinic";
    const location = config.defaultLocation || (profile.businessName === getDefaultBusinessProfile().businessName ? "" : "");

    logger.info("Pipeline", `Scraping Google Maps: "${query}" ${location ? `in ${location}` : ""}`);

    // Browser scrape — $0 API cost
    const scrapedLeads: ScrapedLead[] = await scrapeGoogleMaps({
      query,
      location: location || undefined,
      maxResults: config.maxLeadsPerScrape || 10,
    });

    let leadsAdded = 0;
    const newLeads: Lead[] = [];
    for (const sl of scrapedLeads) {
      // Check for duplicates by email or name+company
      const existing = await dbList<Lead>("leads");
      const isDuplicate = existing.some(
        (l) =>
          (sl.email && l.email === sl.email) ||
          (l.name.toLowerCase() === sl.name.toLowerCase() && l.company.toLowerCase() === sl.company.toLowerCase())
      );

      if (!isDuplicate) {
        const temperature = computeLeadTemperature({ score: sl.score || 50, status: "new" });
        const newLead: Lead = {
          id: crypto.randomUUID(),
          name: sl.name,
          company: sl.company,
          role: sl.role,
          email: sl.email,
          phone: sl.phone,
          source: "google-maps" as const,
          sourceUrl: sl.sourceUrl,
          status: "new",
          pipelineStage: "sourced",
          temperature,
          score: sl.score || 50,
          personaType: sl.personaType || "customer",
          notes: sl.notes,
          createdAt: new Date(),
        };
        await upsertLead(newLead);
        newLeads.push(newLead);
        leadsAdded++;
      }
    }

    // Immediately engage all new scraped leads — nurture + email + WhatsApp
    if (newLeads.length > 0) {
      engageLeads(newLeads).catch((err) => {
        logger.error("Pipeline", "Lead engagement failed after scrape", { error: String(err) });
      });
    }

    await this.setState({ lastScrapeAt: new Date().toISOString() });

    return { leadsAdded, cost: 0 }; // Browser scraping = free
  }

  // ==================== PHASE 2: ENRICH (Gemini Flash-Lite — ~$0.00005/lead) ====================

  private async runEnrichPhase(config: PipelineConfig): Promise<{ leadsEnriched: number; cost: number }> {
    const leads = await dbList<Lead>("leads");
    // Only enrich leads that are "new" with default/low scores or unknown persona
    const toEnrich = leads.filter(
      (l) =>
        (l.status === "new" || l.status === "contacted") &&
        (l.score < 30 || l.score === 50) // default score = needs enrichment
    );

    if (toEnrich.length === 0) {
      return { leadsEnriched: 0, cost: 0 };
    }

    // Batch process in chunks of 5 to keep prompts small
    const batchSize = 5;
    let enriched = 0;
    let totalCost = 0;

    for (let i = 0; i < toEnrich.length; i += batchSize) {
      const batch = toEnrich.slice(i, i + batchSize);
      const profile = await this._getBusinessProfile();
      const systemPrompt = ENRICH_SYSTEM_PROMPT
        .replace(/\{businessName\}/g, profile.businessName)
        .replace(/\{industry\}/g, profile.industry)
        .replace(/\{productDescription\}/g, profile.productDescription);

      const userPrompt = `Analyze these ${batch.length} leads and return a JSON array with enrichment data for each:\n\n${batch.map((l, idx) => `[${idx}] Name: ${l.name}, Role: ${l.role}, Company: ${l.company}, Notes: ${l.notes || "N/A"}`).join("\n")}\n\nReturn a JSON array of { index, personaType, score, painPoints, outreachAngle, notes } for each lead. Use realistic scores and personas.`;

      try {
        const output = await callLLM(systemPrompt, userPrompt, {
          model: config.preferredModel,
          temperature: 0.3,
          maxTokens: 1024,
          provider: config.preferredProvider as any,
        });

        // Parse the enrichment results
        let enrichments: Array<{ index: number; personaType: string; score: number; painPoints: string; outreachAngle: string; notes: string }> = [];
        try {
          // Clean markdown wrappers
          let cleaned = output.trim();
          if (cleaned.startsWith("```")) {
            cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
          }
          enrichments = JSON.parse(cleaned);
        } catch {
          // If parsing fails, skip enrichment for this batch
          continue;
        }

        // Apply enrichments
        for (const enrichment of enrichments) {
          const idx = enrichment.index;
          if (idx >= 0 && idx < batch.length) {
            const lead = batch[idx]!;
            const newScore = Math.min(Math.max(enrichment.score || 50, 0), 100);
            // Re-compute temperature based on enriched score and current status
            const updatedTemperature = computeLeadTemperature({ score: newScore, status: lead.status, replied: false });
            await upsertLead({
              ...lead,
              score: newScore,
              temperature: updatedTemperature,
              personaType: enrichment.personaType || lead.personaType,
              notes: enrichment.notes ? `${lead.notes}\n[AI Enriched] ${enrichment.notes}` : lead.notes,
            });
            enriched++;
          }
        }

        // Estimate cost: ~200 input tokens + output tokens
        const inputTokens = Math.ceil((systemPrompt.length + userPrompt.length) / 4);
        const outputTokens = Math.ceil(output.length / 4);
        const cost = (inputTokens / 1_000_000) * 0.075 + (outputTokens / 1_000_000) * 0.30;
        totalCost += cost;
      } catch {
        // Skip batch on error, continue with next
        continue;
      }
    }

    await this.setState({ lastEnrichAt: new Date().toISOString() });
    return { leadsEnriched: enriched, cost: totalCost };
  }

  // ==================== PHASE 3: NURTURE (Default templates — $0) ====================

  private async runNurturePhase(config: PipelineConfig): Promise<{ sequencesCreated: number; cost: number }> {
    const leads = await dbList<Lead>("leads");
    // Only create sequences for qualified leads without existing ones
    const nurtureCandidates = leads.filter(
      (l) =>
        (l.status === "new" || l.status === "contacted" || l.status === "qualified") &&
        l.score >= 40 // Minimum score threshold
    );

    if (nurtureCandidates.length === 0) {
      return { sequencesCreated: 0, cost: 0 };
    }

    // Check which leads already have sequences
    const engine = new NurtureEngine();
    let created = 0;

    for (const lead of nurtureCandidates.slice(0, 5)) {
      // Limit to 5 per cycle to avoid overwhelming
      try {
        const existingSequences = await engine.getSequencesByLead(lead.id);
        if (existingSequences.length > 0) continue;

        // Use default templates (no LLM call = $0) for max cost savings
        await engine.createSequence(lead, {
          name: `Auto-Nurture: ${lead.name}`,
        });
        created++;
      } catch {
        // Skip on error
        continue;
      }
    }

    // Don't advance sequences here — that happens on a different schedule
    await this.setState({ lastNurtureAt: new Date().toISOString() });
    return { sequencesCreated: created, cost: 0 }; // Default templates = free
  }

  // ==================== INTERNAL TIMER ====================

  private _startTimer(): void {
    if (this._timer) return;
    // Check every 15 minutes if a tick is due
    this._timer = setInterval(async () => {
      try {
        await this.checkAndRun();
      } catch (e) {
        logger.error("Pipeline", "Timer error", { error: String(e) });
      }
    }, 15 * 60 * 1000); // 15-minute check interval
  }

  private _stopTimer(): void {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  /**
   * Check if it's time to run a tick and execute if so.
   */
  async checkAndRun(): Promise<void> {
    const config = await this.getConfig();
    if (!config.enabled) return;

    const state = await this.getState();
    if (state.status === "running") return; // Already running

    // Check if next scrape time has passed
    if (state.nextScrapeAt) {
      const nextScrape = new Date(state.nextScrapeAt).getTime();
      if (Date.now() >= nextScrape) {
        await this.tick();
      }
    } else {
      // No next scrape scheduled — schedule one
      await this.scheduleNextScrape();
    }
  }

  private async scheduleNextScrape(): Promise<void> {
    const config = await this.getConfig();
    const nextAt = new Date(Date.now() + config.scrapeIntervalHours * 60 * 60 * 1000);
    await this.setState({ nextScrapeAt: nextAt.toISOString() });
  }

  // ==================== BUSINESS PROFILE FROM DB (server-safe) ====================

  private async _getBusinessProfile(): Promise<BusinessProfile> {
    try {
      const name = await getSetting("pipeline_business_name");
      const industry = await getSetting("pipeline_business_industry");
      const productDesc = await getSetting("pipeline_business_product_desc");
      const audience = await getSetting("pipeline_business_audience");
      const sellingPoints = await getSetting("pipeline_business_selling_points");
      const voice = await getSetting("pipeline_business_voice");

      if (name) {
        return {
          businessName: name,
          industry: industry || getDefaultBusinessProfile().industry,
          targetAudience: audience || getDefaultBusinessProfile().targetAudience,
          productDescription: productDesc || getDefaultBusinessProfile().productDescription,
          keySellingPoints: sellingPoints || getDefaultBusinessProfile().keySellingPoints,
          brandVoice: voice || getDefaultBusinessProfile().brandVoice,
        };
      }
    } catch {
      // Fall through to default
    }
    return getDefaultBusinessProfile();
  }

  /** Sync business profile from a SettingsPage save (called by the API route) */
  async _syncBusinessProfile(profile: BusinessProfile): Promise<void> {
    await Promise.all([
      setSetting("pipeline_business_name", profile.businessName),
      setSetting("pipeline_business_industry", profile.industry),
      setSetting("pipeline_business_product_desc", profile.productDescription),
      setSetting("pipeline_business_audience", profile.targetAudience),
      setSetting("pipeline_business_selling_points", profile.keySellingPoints),
      setSetting("pipeline_business_voice", profile.brandVoice),
    ]);
  }

  // ==================== ADVANCE NURTURE SEQUENCES (separate from main tick) ====================

  /**
   * Advance nurture sequences that have due steps.
   * This is a separate operation that runs on its own schedule.
   */
  async advanceDueSequences(): Promise<number> {
    const engine = new NurtureEngine();
    const allActive = await engine.getActiveSequences();
    let advanced = 0;

    for (const seq of allActive) {
      try {
        const step = seq.steps[seq.currentStep];
        if (!step) continue;

        // Check if step is due based on delayDays from sequence start + step delay
        const startedAt = seq.startedAt.getTime();
        const totalDelayDays = seq.steps
          .slice(0, seq.currentStep)
          .reduce((sum, s) => sum + s.delayDays, 0);
        const dueAt = new Date(startedAt + totalDelayDays * 24 * 60 * 60 * 1000);

        if (Date.now() >= dueAt.getTime()) {
          await engine.advanceSequence(seq.id);
          advanced++;
        }
      } catch {
        continue;
      }
    }

    return advanced;
  }
}

// Singleton
let orchestratorInstance: PipelineOrchestrator | null = null;

export function getPipelineOrchestrator(): PipelineOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new PipelineOrchestrator();
  }
  return orchestratorInstance;
}

export type { PipelineOrchestrator };
