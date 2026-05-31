import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createMassScrapeJob,
  getMassScrapeJob,
  listMassScrapeJobs,
  cancelMassScrapeJob,
  generateWellnessCenterBatch,
} from "@/lib/agents/mass-scraper";

const startJobSchema = z.object({
  queries: z
    .array(
      z.object({
        query: z.string().min(1),
        location: z.string().optional(),
      })
    )
    .min(1)
    .max(500),
  concurrency: z.number().int().min(1).max(20).optional().default(5),
  maxResultsPerQuery: z.number().int().min(1).max(100).optional().default(20),
});

const quickScrapeSchema = z.object({
  query: z.string().optional().default("wellness center health clinic"),
  locations: z.array(z.string().min(1)).min(1).max(100),
  concurrency: z.number().int().min(1).max(20).optional().default(5),
  maxResultsPerQuery: z.number().int().min(1).max(100).optional().default(20),
});

// GET /api/scrape/batch — list all jobs or get a specific job
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (jobId) {
      const job = getMassScrapeJob(jobId);
      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }
      return NextResponse.json({ job });
    }

    const jobs = listMassScrapeJobs();
    return NextResponse.json({ jobs });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list jobs" },
      { status: 500 }
    );
  }
}

// POST /api/scrape/batch — start a new mass scrape job
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // Quick scrape: base query + list of locations
    if (action === "quick") {
      const parsed = quickScrapeSchema.parse(body);
      const queries = parsed.locations.map((location) => ({
        query: parsed.query,
        location,
      }));

      const job = await createMassScrapeJob(queries, {
        concurrency: parsed.concurrency,
        maxResultsPerQuery: parsed.maxResultsPerQuery,
      });

      return NextResponse.json(
        { job, estimatedLeads: queries.length * parsed.maxResultsPerQuery },
        { status: 201 }
      );
    }

    // Full scrape: full list of query+location pairs
    if (action === "full") {
      const parsed = startJobSchema.parse(body);
      const job = await createMassScrapeJob(parsed.queries, {
        concurrency: parsed.concurrency,
        maxResultsPerQuery: parsed.maxResultsPerQuery,
      });

      return NextResponse.json(
        { job, estimatedLeads: parsed.queries.length * parsed.maxResultsPerQuery },
        { status: 201 }
      );
    }

    // Pre-built wellness center batch
    if (action === "wellness_batch") {
      const queries = generateWellnessCenterBatch(
        body.queries ?? ["wellness center", "health clinic", "holistic health", "chiropractor", "acupuncture", "yoga studio"]
      );
      const job = await createMassScrapeJob(queries, {
        concurrency: body.concurrency ?? 5,
        maxResultsPerQuery: body.maxResultsPerQuery ?? 20,
      });

      return NextResponse.json(
        {
          job,
          estimatedLeads: queries.length * (body.maxResultsPerQuery ?? 20),
          totalQueries: queries.length,
        },
        { status: 201 }
      );
    }

    // Cancel a running job
    if (action === "cancel") {
      const { jobId } = body;
      if (!jobId) {
        return NextResponse.json({ error: "jobId required" }, { status: 400 });
      }
      const cancelled = cancelMassScrapeJob(jobId);
      return NextResponse.json({ cancelled });
    }

    return NextResponse.json(
      { error: "Unknown action. Valid: quick, full, wellness_batch, cancel" },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start scrape" },
      { status: 500 }
    );
  }
}
