/**
 * MassScraper — Parallel Massive Lead Scraping Engine
 *
 * Manages N concurrent browser instances to scrape thousands of Google Maps
 * businesses simultaneously across multiple search queries and locations.
 *
 * Architecture:
 *   - Configurable concurrency pool (default: 5 parallel browsers)
 *   - Job queue with retry logic
 *   - Deduplication across all batches
 *   - Progress tracking per job
 *   - Rate limiting to avoid Google blocking
 *
 * Cost: $0 (same Chrome/Puppeteer infrastructure as single scrapes)
 */

import { logger } from "@/lib/logger";
import { scrapeGoogleMaps } from "./google-maps-scraper";
import { upsertLead, dbList, upsertResult } from "@/lib/db";
import { computeLeadTemperature, type Lead, type ScrapedLead } from "./types";
import { validateAndFilterLeads, logValidationSummary, computeScrapedLeadScore } from "./lead-validator";

// ========================================================================
// TYPES
// ========================================================================

export interface MassScrapeJob {
  id: string;
  queries: ScrapeQuery[];
  concurrency: number;
  maxResultsPerQuery: number;
  status: "queued" | "running" | "paused" | "completed" | "failed";
  progress: {
    totalQueries: number;
    completedQueries: number;
    totalLeadsFound: number;
    totalLeadsImported: number;
    failedQueries: number;
  };
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface ScrapeQuery {
  query: string;
  location?: string;
}

export interface MassScrapeResult {
  jobId: string;
  leadsFound: number;
  leadsImported: number;
  newLeads: Lead[];
  errors: string[];
  duration: number;
  queriesCompleted: number;
  queriesTotal: number;
}

// ========================================================================
// JOB MANAGER
// ========================================================================

// In-memory job store — all jobs are ephemeral and tracked in memory
const jobStore = new Map<string, MassScrapeJob>();

function generateJobId(): string {
  return `ms-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Create a new mass scrape job with multiple queries.
 */
export async function createMassScrapeJob(
  queries: ScrapeQuery[],
  options?: {
    concurrency?: number;
    maxResultsPerQuery?: number;
  }
): Promise<MassScrapeJob> {
  const job: MassScrapeJob = {
    id: generateJobId(),
    queries,
    concurrency: options?.concurrency ?? 5,
    maxResultsPerQuery: options?.maxResultsPerQuery ?? 20,
    status: "queued",
    progress: {
      totalQueries: queries.length,
      completedQueries: 0,
      totalLeadsFound: 0,
      totalLeadsImported: 0,
      failedQueries: 0,
    },
    startedAt: new Date(),
  };

  jobStore.set(job.id, job);

  logger.info("MassScraper", `Created job ${job.id} with ${queries.length} queries`);

  // Start processing in background (don't await — let it run async)
  processJob(job).catch((err) => {
    logger.error("MassScraper", `Job ${job.id} failed: ${err}`);
  });

  return job;
}

/**
 * Get the current state of a job.
 */
export function getMassScrapeJob(jobId: string): MassScrapeJob | undefined {
  return jobStore.get(jobId);
}

/**
 * List all jobs (most recent first).
 */
export function listMassScrapeJobs(): MassScrapeJob[] {
  return Array.from(jobStore.values()).sort(
    (a, b) => (b.startedAt?.getTime() ?? 0) - (a.startedAt?.getTime() ?? 0)
  );
}

/**
 * Cancel/pause a running job.
 */
export function cancelMassScrapeJob(jobId: string): boolean {
  const job = jobStore.get(jobId);
  if (!job || job.status !== "running") return false;
  job.status = "paused";
  return true;
}

// ========================================================================
// JOB PROCESSOR
// ========================================================================

async function processJob(job: MassScrapeJob): Promise<void> {
  job.status = "running";

  const startTime = Date.now();
  const allNewLeads: Lead[] = [];
  const allErrors: string[] = [];
  const queue = [...job.queries];

  // Process queries with concurrency limit
  const workers: Promise<void>[] = [];
  const workerCount = Math.min(job.concurrency, queue.length);

  for (let i = 0; i < workerCount; i++) {
    workers.push(runWorker(job, queue, allNewLeads, allErrors));
  }

  try {
    await Promise.all(workers);

    const duration = Date.now() - startTime;
    job.status = "completed";
    job.completedAt = new Date();
    job.progress.totalLeadsImported = allNewLeads.length;

    logger.info("MassScraper", `Job ${job.id} completed: ${allNewLeads.length} leads imported in ${duration}ms`);

    // Immediately engage all new scraped leads — nurture + email + WhatsApp
    if (allNewLeads.length > 0) {
      // Import engageLeads here to avoid circular dependency
      const { engageLeads } = await import("./lead-engager");
      engageLeads(allNewLeads).catch((err: unknown) => {
        logger.error("MassScraper", `Engagement failed after job ${job.id}: ${err}`);
      });
    }

    // Record as an agent result for history
    await upsertResult({
      id: crypto.randomUUID(),
      agentType: "scraper",
      status: "completed",
      output: JSON.stringify({
        type: "mass_scrape",
        jobId: job.id,
        queriesCompleted: job.progress.completedQueries,
        queriesTotal: job.queries.length,
        leadsImported: allNewLeads.length,
        errors: allErrors.length,
        duration,
      }),
      createdAt: new Date(),
      metadata: {
        label: `Mass Scrape: ${allNewLeads.length} leads from ${job.progress.completedQueries} queries`,
      },
    });
  } catch (error) {
    job.status = "failed";
    job.error = error instanceof Error ? error.message : "Unknown job error";
    logger.error("MassScraper", `Job ${job.id} failed: ${job.error}`);
  }
}

async function runWorker(
  job: MassScrapeJob,
  queue: ScrapeQuery[],
  allNewLeads: Lead[],
  allErrors: string[]
): Promise<void> {
  while (true) {
    // Check if job was paused/cancelled
    if (job.status === "paused") break;

    // Get next query from queue (thread-safe via shift)
    const query = queue.shift();
    if (!query) break; // No more work

    try {
      const result = await scrapeSingleQuery(job, query, allNewLeads);
      job.progress.totalLeadsFound += result.leadsFound;
      job.progress.completedQueries++;

      // Track skip stats
      if (result.skipped > 0) {
        logger.info("MassScraper", `Skipped ${result.skipped} invalid leads from "${query.query}${query.location ? ` in ${query.location}` : ""}"`);
      }

      if (result.errors.length > 0) {
        job.progress.failedQueries++;
        allErrors.push(...result.errors);
      }
    } catch (error) {
      job.progress.failedQueries++;
      const msg = error instanceof Error ? error.message : String(error);
      allErrors.push(`Query "${query.query}${query.location ? ` in ${query.location}` : ""}": ${msg}`);
    } finally {
      // Rate limiting: wait between queries to avoid Google blocking
      await new Promise((r) => setTimeout(r, 2000 + Math.random() * 3000));
    }
  }
}

async function scrapeSingleQuery(
  job: MassScrapeJob,
  query: ScrapeQuery,
  allNewLeads: Lead[]
): Promise<{ leadsFound: number; skipped: number; errors: string[] }> {
  const errors: string[] = [];
  let skipped = 0;

  try {
    const scrapedLeads: ScrapedLead[] = await scrapeGoogleMaps({
      query: query.query,
      location: query.location,
      maxResults: job.maxResultsPerQuery,
    });

    // === VALIDATION: Filter out invalid/incomplete leads ===
    const { validLeads, summary } = validateAndFilterLeads(scrapedLeads);
    skipped = summary.skippedLeads;

    if (summary.skippedLeads > 0) {
      logValidationSummary(`MassScrape "${query.query}${query.location ? ` in ${query.location}` : ""}"`, summary);
    }

    // Import validated leads with deduplication
    for (const sl of validLeads) {
      try {
        const existing = await dbList<Lead>("leads");
        const isDuplicate = existing.some(
          (l) =>
            (sl.email && l.email === sl.email) ||
            (l.name.toLowerCase() === sl.name.toLowerCase() &&
             l.company.toLowerCase() === sl.company.toLowerCase())
        );

        if (!isDuplicate) {
          const score = sl.score || computeScrapedLeadScore(sl);
          const temperature = computeLeadTemperature({ score, status: "new" });
          const newLead: Lead = {
            id: crypto.randomUUID(),
            name: sl.name,
            company: sl.company,
            role: sl.role,
            email: sl.email,
            phone: sl.phone,
            source: "google-maps",
            sourceUrl: sl.sourceUrl,
            status: "new",
            pipelineStage: "sourced",
            temperature,
            score,
            personaType: sl.personaType || "customer",
            notes: buildRicherNotes(sl),
            createdAt: new Date(),
          };
          await upsertLead(newLead);
          allNewLeads.push(newLead);
        }
      } catch (err) {
        errors.push(`Error importing ${sl.name}: ${err instanceof Error ? err.message : "Unknown"}`);
      }
    }

    return { leadsFound: scrapedLeads.length, skipped, errors };
  } catch (error) {
    return {
      leadsFound: 0,
      skipped: 0,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

/**
 * Build richer notes from all available scraped data.
 */
function buildRicherNotes(sl: ScrapedLead): string {
  const parts: string[] = [sl.notes];
  if (sl.rating) parts.push(`${sl.rating}★`);
  if (sl.reviews) parts.push(`${sl.reviews} reviews`);
  if (sl.address) parts.push(sl.address);
  if (sl.category) parts.push(`Category: ${sl.category}`);
  if (sl.businessDetails) parts.push(`Details: ${sl.businessDetails}`);
  return parts.filter(Boolean).join(" | ");
}

// ========================================================================
// CONFIGURATION HELPERS
// ========================================================================

/**
 * Generate a batch of scrape queries from a base query + list of locations.
 * This is the quick way to set up a 1000-lead scrape.
 */
export function generateLocationQueries(
  baseQuery: string,
  locations: string[]
): ScrapeQuery[] {
  return locations.map((location) => ({
    query: baseQuery,
    location,
  }));
}

// ========================================================================
// PRE-BUILT LOCATION BATCHES FOR COMMON TARGETS
// ========================================================================

/**
 * Major US metro areas pre-built for scraping.
 * ~20 queries × 20 leads each = ~400 leads per full batch.
 */
export const MAJOR_US_METRO_AREAS = [
  "New York, NY",
  "Los Angeles, CA",
  "Chicago, IL",
  "Houston, TX",
  "Phoenix, AZ",
  "Philadelphia, PA",
  "San Antonio, TX",
  "San Diego, CA",
  "Dallas, TX",
  "San Jose, CA",
  "Austin, TX",
  "Jacksonville, FL",
  "Fort Worth, TX",
  "Columbus, OH",
  "Charlotte, NC",
  "Indianapolis, IN",
  "San Francisco, CA",
  "Seattle, WA",
  "Denver, CO",
  "Nashville, TN",
  "Oklahoma City, OK",
  "El Paso, TX",
  "Washington, DC",
  "Boston, MA",
  "Las Vegas, NV",
  "Portland, OR",
  "Memphis, TN",
  "Louisville, KY",
  "Baltimore, MD",
  "Milwaukee, WI",
];

// ========================================================================
// HEALY AFFILIATE TIER-BASED TARGETING
// ========================================================================

/**
 * TIER 1 — Highest Buying Power countries for Healy affiliate marketing.
 * These are the priority markets: high income, high CPC, best conversion.
 * Start here for maximum ROI.
 */
export const HEALY_TIER_1: string[] = [
  "United States",
  "Canada",
  "United Kingdom",
  "Germany",
  "Switzerland",
  "Austria",
  "Australia",
  "New Zealand",
  "Netherlands",
  "Sweden",
];

/**
 * TIER 2 — Good Scale + Lower CPC countries.
 * Large populations, growing wellness markets, lower ad costs.
 * Run separate campaigns after Tier 1 is optimized.
 */
export const HEALY_TIER_2: string[] = [
  "India",
  "Singapore",
  "Malaysia",
  "United Arab Emirates",
  "South Africa",
  "Ireland",
  "Belgium",
  "Norway",
];

/** @deprecated Use HEALY_TIER_1 + HEALY_TIER_2 instead */
export const HEALY_APAC_COUNTRIES = [
  "India", "Australia", "Hong Kong", "Philippines", "Thailand",
  "Indonesia", "Malaysia", "Singapore", "Vietnam", "Cambodia",
  "Taiwan", "Japan", "South Korea", "New Zealand",
];

/** @deprecated Use HEALY_TIER_1 + HEALY_TIER_2 instead */
export const HEALY_AMERICAS_COUNTRIES = [
  "United States", "Canada", "Mexico", "Colombia", "Chile",
  "Peru", "Ecuador", "Costa Rica", "Panama", "Guatemala",
  "Dominican Republic", "Aruba", "Curacao", "Bonaire",
];

/** @deprecated Use HEALY_TIER_1 + HEALY_TIER_2 instead */
export const HEALY_EUROPE_COUNTRIES = [
  "United Kingdom", "Germany", "France", "Italy", "Spain",
  "Netherlands", "Switzerland", "Sweden", "Norway", "Denmark",
  "Finland", "Poland", "Portugal", "Belgium", "Austria",
  "Ireland", "Greece", "Hungary", "Romania", "Czech Republic",
  "Bulgaria", "Croatia", "Slovakia", "Slovenia", "Lithuania",
  "Latvia", "Estonia", "Luxembourg", "Malta", "Cyprus",
  "Ukraine", "Turkey", "United Arab Emirates",
];

/**
 * ALL Healy countries combined for maximum global coverage.
 */
export const HEALY_ALL_COUNTRIES = [
  ...new Set([...HEALY_TIER_1, ...HEALY_TIER_2, ...HEALY_APAC_COUNTRIES, ...HEALY_AMERICAS_COUNTRIES, ...HEALY_EUROPE_COUNTRIES]),
];

// ========================================================================
// TARGET AUDIENCE SEGMENTS — Scrape queries for each persona
// ========================================================================

/**
 * Best audience segments for Healy affiliate marketing.
 * Each query targets a specific persona type for Google Maps scraping.
 *
 * Biohackers & wellness enthusiasts → biohacking, wellness centers, spas
 * Holistic health followers → holistic health, alternative medicine, naturopaths
 * Yoga & meditation practitioners → yoga studios, meditation centers
 * Health coaches & entrepreneurs → health coaching, wellness business
 */
export const HEALY_AUDIENCE_QUERIES: string[] = [
  // Biohackers & wellness enthusiasts
  "biohacking center",
  "wellness center",
  "biohacking gym",
  // Holistic health followers
  "holistic health center",
  "alternative medicine clinic",
  "naturopath",
  "functional medicine",
  // Yoga & meditation practitioners
  "yoga studio",
  "meditation center",
  "mindfulness studio",
  // Health coaches & wellness professionals
  "health coach",
  "nutritionist",
  "wellness coach",
  // Premium wellness venues
  "spa wellness",
  "wellness retreat",
  "cryotherapy",
];

/**
 * High-intent Google Ads keywords mapped to scrape queries.
 * These are the same keywords used for paid ads, but scraped for free
 * to get direct leads from Google Maps listings.
 */
export const HEALY_KEYWORD_QUERIES: string[] = [
  "Healy device",
  "frequency wellness",
  "biohacking device",
  "energy wellness",
  "wellness technology",
];

// ========================================================================
// ONE-CLICK LAUNCH FUNCTIONS — Start scraping with a single call
// ========================================================================

/**
 * 🚀 Launch Tier 1 (Highest Buying Power) — Start here.
 *
 * Scrapes: USA, Canada, UK, Germany, Switzerland, Austria, Australia,
 *          New Zealand, Netherlands, Sweden
 * Queries: All audience segments (biohacking, wellness, yoga, holistic, etc.)
 * Result:  ~10 countries × 15 queries × 20 leads = ~3,000 leads
 *
 * Cost: $0 (uses local Chrome)
 */
export function launchTier1Strategy(): ScrapeQuery[] {
  return generateGlobalHealyBatch(HEALY_AUDIENCE_QUERIES, HEALY_TIER_1);
}

/**
 * 🚀 Launch Tier 2 (Good Scale + Lower CPC) — Run after Tier 1.
 *
 * Scrapes: India, Singapore, Malaysia, UAE, South Africa, Ireland, Belgium, Norway
 * Queries: All audience segments
 * Result:  ~8 countries × 15 queries × 20 leads = ~2,400 leads
 *
 * Cost: $0 (uses local Chrome)
 */
export function launchTier2Strategy(): ScrapeQuery[] {
  return generateGlobalHealyBatch(HEALY_AUDIENCE_QUERIES, HEALY_TIER_2);
}

/**
 * 🚀 Launch both Tier 1 + Tier 2 combined.
 * Full global rollout.
 */
export function launchFullAffiliateStrategy(): ScrapeQuery[] {
  return generateGlobalHealyBatch(HEALY_AUDIENCE_QUERIES, [...HEALY_TIER_1, ...HEALY_TIER_2]);
}

/**
 * 🚀 Launch targeted by specific audience segment.
 *
 * Example: launchAudienceStrategy("biohacking")
 *   → Scrapes "biohacking center", "biohacking gym" across Tier 1 countries
 */
export function launchAudienceStrategy(
  keyword: string,
  tiers: string[] = HEALY_TIER_1
): ScrapeQuery[] {
  const matchingQueries = HEALY_AUDIENCE_QUERIES.filter(
    (q) => q.toLowerCase().includes(keyword.toLowerCase())
  );
  if (matchingQueries.length === 0) {
    // Fall back to all queries if no match
    return generateGlobalHealyBatch(HEALY_AUDIENCE_QUERIES, tiers);
  }
  return generateGlobalHealyBatch(matchingQueries, tiers);
}

// ========================================================================
// GENERATE BATCH FUNCTIONS
// ========================================================================

/**
 * Generate a full mass scrape across ALL Healy countries.
 * queries × countries × leads = massive lead generation.
 *
 * Example: 4 queries × 60 countries × 20 leads = 4,800 leads total.
 */
export function generateGlobalHealyBatch(
  queries: string[] = ["wellness center", "health clinic", "holistic health", "alternative medicine"],
  countries: string[] = HEALY_ALL_COUNTRIES
): ScrapeQuery[] {
  const all: ScrapeQuery[] = [];
  for (const q of queries) {
    for (const country of countries) {
      all.push({ query: q, location: country });
    }
  }
  return all;
}

/**
 * Generate a region-specific batch.
 */
export function generateRegionBatch(
  region: "apac" | "americas" | "europe",
  queries: string[] = ["wellness center", "health clinic"]
): ScrapeQuery[] {
  const countryMap: Record<string, string[]> = {
    apac: HEALY_APAC_COUNTRIES,
    americas: HEALY_AMERICAS_COUNTRIES,
    europe: HEALY_EUROPE_COUNTRIES,
  };
  return generateGlobalHealyBatch(queries, countryMap[region] || HEALY_ALL_COUNTRIES);
}

/**
 * Generate a full mass scrape for all US metros finding wellness centers.
 * Result: ~30 locations × 20 leads = ~600 leads per full run.
 */
export function generateWellnessCenterBatch(
  queries: string[] = ["wellness center", "health clinic", "holistic health", "alternative medicine", "chiropractor", "acupuncture", "yoga studio", "meditation center"]
): ScrapeQuery[] {
  const all: ScrapeQuery[] = [];
  for (const q of queries) {
    for (const loc of MAJOR_US_METRO_AREAS.slice(0, 10)) { // Top 10 to keep manageable
      all.push({ query: q, location: loc });
    }
  }
  return all;
}
