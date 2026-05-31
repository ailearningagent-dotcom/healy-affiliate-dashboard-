"use client";

import { useState, useEffect } from "react";
import {
  MapPin,
  Loader2,
  Play,
  Pause,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
  Target,
  List,
} from "lucide-react";
import clsx from "clsx";

interface ScrapeJob {
  id: string;
  queries: { query: string; location?: string }[];
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
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

const WELLNESS_QUERIES = [
  "wellness center",
  "health clinic",
  "holistic health",
  "chiropractor",
  "acupuncture",
  "yoga studio",
  "meditation center",
  "alternative medicine",
  "naturopath",
  "functional medicine",
];

const US_METROS = [
  "New York, NY", "Los Angeles, CA", "Chicago, IL", "Houston, TX",
  "Phoenix, AZ", "Philadelphia, PA", "San Antonio, TX", "San Diego, CA",
  "Dallas, TX", "San Jose, CA", "Austin, TX", "Jacksonville, FL",
  "Fort Worth, TX", "Columbus, OH", "Charlotte, NC", "Indianapolis, IN",
  "San Francisco, CA", "Seattle, WA", "Denver, CO", "Nashville, TN",
  "Washington, DC", "Boston, MA", "Las Vegas, NV", "Portland, OR",
  "Memphis, TN", "Louisville, KY", "Baltimore, MD", "Milwaukee, WI",
  "Albuquerque, NM", "Tucson, AZ", "Fresno, CA", "Sacramento, CA",
  "Mesa, AZ", "Kansas City, MO", "Atlanta, GA", "Omaha, NE",
  "Colorado Springs, CO", "Raleigh, NC", "Long Beach, CA", "Virginia Beach, VA",
];

export default function MassScrapePanel() {
  const [jobs, setJobs] = useState<ScrapeJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedQueries, setSelectedQueries] = useState<string[]>(["wellness center"]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>(["New York, NY"]);
  const [concurrency, setConcurrency] = useState(5);
  const [maxResults, setMaxResults] = useState(20);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Fetch jobs on mount and auto-refresh
  useEffect(() => {
    fetchJobs();
    if (autoRefresh) {
      const interval = setInterval(fetchJobs, 3000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  async function fetchJobs() {
    try {
      const res = await fetch("/api/scrape/batch");
      const data = await res.json();
      setJobs(data.jobs ?? []);
    } catch {
      // Ignore
    }
  }

  async function startBatch() {
    setLoading(true);
    try {
      const res = await fetch("/api/scrape/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "quick",
          query: selectedQueries.join(" "),
          locations: selectedLocations,
          concurrency,
          maxResultsPerQuery: maxResults,
        }),
      });
      const data = await res.json();
      if (data.job) {
        setJobs((prev) => [data.job, ...prev]);
      }
    } catch {
      // Ignore
    }
    setLoading(false);
  }

  async function startWellnessBatch() {
    setLoading(true);
    try {
      const res = await fetch("/api/scrape/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "wellness_batch",
          queries: selectedQueries,
          concurrency,
          maxResultsPerQuery: maxResults,
        }),
      });
      const data = await res.json();
      if (data.job) {
        setJobs((prev) => [data.job, ...prev]);
      }
    } catch {
      // Ignore
    }
    setLoading(false);
  }

  async function cancelJob(jobId: string) {
    try {
      await fetch("/api/scrape/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", jobId }),
      });
      fetchJobs();
    } catch {
      // Ignore
    }
  }

  function toggleQuery(query: string) {
    setSelectedQueries((prev) =>
      prev.includes(query) ? prev.filter((q) => q !== query) : [...prev, query]
    );
  }

  function toggleLocation(loc: string) {
    setSelectedLocations((prev) =>
      prev.includes(loc) ? prev.filter((l) => l !== loc) : [...prev, loc]
    );
  }

  function selectAllLocations() {
    setSelectedLocations(US_METROS);
  }

  function clearLocations() {
    setSelectedLocations([]);
  }

  const estimatedLeads = selectedQueries.length * selectedLocations.length * maxResults;

  return (
    <div className="rounded-xl border border-surface-200 bg-white p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary-600" />
          <h3 className="text-base font-semibold text-surface-900">Mass Scrape Engine</h3>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="mass-refresh" className="flex items-center gap-1.5 text-xs text-surface-500">
            <input
              id="mass-refresh"
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
            />
            Auto-refresh
          </label>
        </div>
      </div>

      <p className="text-xs text-surface-500">
        Scrape thousands of targeted businesses from Google Maps in parallel. Select queries, locations, and concurrency level below.
      </p>

      {/* Query Selection */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-surface-400 mb-2">
          Business Types ({selectedQueries.length} selected)
        </p>
        <div className="flex flex-wrap gap-1.5">
          {WELLNESS_QUERIES.map((q) => (
            <button
              key={q}
              onClick={() => toggleQuery(q)}
              className={clsx(
                "rounded-full px-3 py-1 text-xs font-medium transition-all",
                selectedQueries.includes(q)
                  ? "bg-primary-100 text-primary-700 ring-1 ring-primary-300"
                  : "bg-surface-50 text-surface-600 hover:bg-surface-100"
              )}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Location Selection */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">
            Locations ({selectedLocations.length} selected)
          </p>
          <div className="flex gap-2">
            <button
              onClick={selectAllLocations}
              className="text-xs font-medium text-primary-600 hover:text-primary-700"
            >
              Select All
            </button>
            <button
              onClick={clearLocations}
              className="text-xs font-medium text-surface-500 hover:text-surface-600"
            >
              Clear
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
          {US_METROS.map((loc) => (
            <button
              key={loc}
              onClick={() => toggleLocation(loc)}
              className={clsx(
                "rounded-full px-2.5 py-1 text-xs font-medium transition-all",
                selectedLocations.includes(loc)
                  ? "bg-amber-100 text-amber-700 ring-1 ring-amber-300"
                  : "bg-surface-50 text-surface-600 hover:bg-surface-100"
              )}
            >
              {loc}
            </button>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label htmlFor="mass-concurrency" className="block text-xs font-medium text-surface-500 mb-1">Concurrency</label>
          <select
            id="mass-concurrency"
            value={concurrency}
            onChange={(e) => setConcurrency(Number(e.target.value))}
            className="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-xs focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          >
            {[1, 2, 3, 5, 8, 10, 15, 20].map((n) => (
              <option key={n} value={n}>{n} browsers</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="mass-results" className="block text-xs font-medium text-surface-500 mb-1">Results per query</label>
          <select
            id="mass-results"
            value={maxResults}
            onChange={(e) => setMaxResults(Number(e.target.value))}
            className="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-xs focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          >
            {[5, 10, 15, 20, 30, 50].map((n) => (
              <option key={n} value={n}>{n} leads</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col justify-end">
          <div className="rounded-lg bg-primary-50 border border-primary-200 px-3 py-2 text-center">
            <p className="text-xs text-surface-500">Estimated</p>
            <p className="text-lg font-bold text-primary-700">{estimatedLeads.toLocaleString()}</p>
            <p className="text-[10px] text-surface-400">total leads</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={startWellnessBatch}
          disabled={loading || selectedQueries.length === 0}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition-all disabled:bg-surface-300"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Starting...</>
          ) : (
            <><Play className="h-4 w-4" /> Run Wellness Batch</>
          )}
        </button>
        <button
          onClick={startBatch}
          disabled={loading || selectedQueries.length === 0 || selectedLocations.length === 0}
          className="flex items-center justify-center gap-2 rounded-lg border border-surface-200 bg-white px-4 py-2.5 text-sm font-medium text-surface-600 hover:bg-surface-50 transition-all disabled:opacity-50"
        >
          <Target className="h-4 w-4" />
          Custom
        </button>
      </div>

      {/* Active Jobs */}
      {jobs.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-surface-400" />
            <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">
              Recent Jobs
            </p>
          </div>
          <div className="space-y-2">
            {jobs.slice(0, 10).map((job) => (
              <div
                key={job.id}
                className="rounded-lg border border-surface-200 bg-surface-50/50 p-3"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    {job.status === "running" && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary-600" />}
                    {job.status === "completed" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                    {job.status === "failed" && <AlertCircle className="h-3.5 w-3.5 text-red-600" />}
                    {job.status === "queued" && <Clock className="h-3.5 w-3.5 text-amber-600" />}
                    {job.status === "paused" && <Pause className="h-3.5 w-3.5 text-surface-500" />}
                    <span className={clsx(
                      "text-xs font-medium capitalize",
                      job.status === "running" && "text-primary-700",
                      job.status === "completed" && "text-emerald-700",
                      job.status === "failed" && "text-red-700",
                    )}>
                      {job.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-surface-400 font-mono">{job.id.slice(0, 12)}…</span>
                    {(job.status === "running" || job.status === "queued") && (
                      <button
                        onClick={() => cancelJob(job.id)}
                        className="rounded p-0.5 hover:bg-surface-200"
                      >
                        <X className="h-3 w-3 text-surface-400" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10px] text-surface-500">
                  <span className="flex items-center gap-1">
                    <List className="h-3 w-3" />
                    {job.progress.completedQueries}/{job.progress.totalQueries} queries
                  </span>
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {job.progress.totalLeadsImported} imported
                  </span>
                  <span className="flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    {job.progress.totalLeadsFound} found
                  </span>
                </div>
                {job.progress.totalQueries > 0 && (
                  <div className="mt-1.5 h-1 rounded-full bg-surface-200 overflow-hidden">
                    <div
                      className={clsx(
                        "h-full rounded-full transition-all duration-500",
                        job.status === "completed" ? "bg-emerald-500" : "bg-primary-500"
                      )}
                      style={{ width: `${(job.progress.completedQueries / job.progress.totalQueries) * 100}%` }}
                    />
                  </div>
                )}
                {job.error && (
                  <p className="mt-1 text-[10px] text-red-500">{job.error}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
