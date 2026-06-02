"use client";

import { useState } from "react";
import {
  MapPin,
  Search,
  X,
  Loader2,
  Users,
  AlertCircle,
  CheckCircle2,
  Globe,
} from "lucide-react";
import clsx from "clsx";

interface GoogleMapsScrapeModalProps {
  onClose: () => void;
  onImport: (leads: Array<{
    name: string;
    company: string;
    role: string;
    email: string;
    phone?: string;
    status: string;
    score: number;
    notes: string;
    personaType: string;
  }>) => Promise<void>;
}

export default function GoogleMapsScrapeModal({ onClose, onImport }: GoogleMapsScrapeModalProps) {
  const [query, setQuery] = useState("wellness clinic");
  const [location, setLocation] = useState("");
  const [maxResults, setMaxResults] = useState(20);
  const [scraping, setScraping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [scrapedLeads, setScrapedLeads] = useState<Array<{
    name: string;
    company: string;
    role: string;
    email: string;
    phone?: string;
    score: number;
    notes: string;
    personaType: string;
  }> | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const handleScrape = async () => {
    if (!query.trim()) {
      setError("Please enter a search query");
      return;
    }

    setScraping(true);
    setError(null);
    setStatus("Launching browser and searching Google Maps...");
    setScrapedLeads(null);
    setImportMessage(null);

    try {
      const input = JSON.stringify({
        type: "google-maps",
        query: query.trim(),
        location: location.trim() || undefined,
        maxResults,
      });

      const res = await fetch("/api/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentType: "scraper",
          input,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Scraping failed (${res.status})`);
      }

      const data = await res.json();
      const result = data.result;

      if (result.status === "error") {
        throw new Error(result.error || "Scraper agent returned an error");
      }

      let leads: Array<Record<string, unknown>>;
      try {
        const parsed = JSON.parse(result.output);
        // The scraper-agent wraps leads in { leads: [...], count: ... }
        if (Array.isArray(parsed)) {
          leads = parsed;
        } else if (parsed.leads && Array.isArray(parsed.leads)) {
          leads = parsed.leads;
        } else {
          throw new Error("Unexpected response format");
        }
      } catch {
        throw new Error("Failed to parse scraper output");
      }

      if (!Array.isArray(leads) || leads.length === 0) {
        setStatus("No leads found. Try a different query or location.");
        setScraping(false);
        return;
      }

      const formatted = leads.map((l: Record<string, unknown>) => ({
        name: String(l.name || "Unknown"),
        company: String(l.company || ""),
        role: String(l.role || ""),
        email: String(l.email || ""),
        phone: l.phone ? String(l.phone) : undefined,
        score: typeof l.score === "number" ? l.score : 50,
        notes: String(l.notes || ""),
        personaType: String(l.personaType || "customer"),
      }));

      setScrapedLeads(formatted);
      setStatus(`Found ${formatted.length} leads from Google Maps`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scraping failed");
      setStatus(null);
    } finally {
      setScraping(false);
    }
  };

  const handleImport = async () => {
    if (!scrapedLeads || scrapedLeads.length === 0) return;
    setImporting(true);
    setError(null);
    try {
      await onImport(scrapedLeads.map(l => ({ ...l, status: "new" })));
      setImportMessage(`Successfully imported ${scrapedLeads.length} leads`);
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    }
    setImporting(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-surface-200 bg-white dark:bg-surface-800 p-6 shadow-xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary-600" />
            <h3 className="text-base font-semibold text-surface-900">Scrape Leads from Google Maps</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-surface-100 dark:hover:bg-surface-700"
          >
            <X className="h-4 w-4 text-surface-500" />
          </button>
        </div>

        <p className="text-xs text-surface-500 mb-4">
          Search Google Maps for businesses matching your criteria. The scraper
          launches a real browser to extract names, ratings, addresses, and contact info.
        </p>

        {/* Query Input */}
        <div className="space-y-3">
          <div>
            <label htmlFor="gmap-query" className="block text-xs font-medium text-surface-600 mb-1">
              Search Query
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
              <input
                id="gmap-query"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. wellness clinic, yoga studio, chiropractor"
                className="w-full rounded-lg border border-surface-200 bg-white dark:bg-surface-800 py-2.5 pl-9 pr-3 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
            </div>
          </div>

          <div>
            <label htmlFor="gmap-location" className="block text-xs font-medium text-surface-600 mb-1">
              Location <span className="text-surface-400">(optional)</span>
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
              <input
                id="gmap-location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. San Francisco, California"
                className="w-full rounded-lg border border-surface-200 bg-white dark:bg-surface-800 py-2.5 pl-9 pr-3 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
            </div>
          </div>

          <div>
            <label htmlFor="gmap-max-results" className="block text-xs font-medium text-surface-600 mb-1">
              Max Results: <span className="font-semibold text-surface-900">{maxResults}</span>
            </label>
            <input
              id="gmap-max-results"
              type="range"
              min={5}
              max={100}
              step={5}
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer bg-surface-200 accent-primary-600"
            />
            <div className="flex justify-between text-xs text-surface-400 mt-1">
              <span>5</span>
              <span>100</span>
            </div>
          </div>
        </div>

        {/* Status */}
        {status && !error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3">
            {scraping ? (
              <Loader2 className="h-4 w-4 text-blue-500 animate-spin flex-shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
            )}
            <p className="text-xs text-blue-600 dark:text-blue-400">{status}</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Import Message */}
        {importMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
            <p className="text-xs text-emerald-600 dark:text-emerald-400">{importMessage}</p>
          </div>
        )}

        {/* Scraped Leads Preview */}
        {scrapedLeads && scrapedLeads.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium text-surface-500 mb-2">
              Preview ({scrapedLeads.length} leads)
            </p>
            <div className="max-h-40 overflow-y-auto space-y-1.5">
              {scrapedLeads.slice(0, 10).map((lead, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-xs text-surface-700 bg-surface-50 dark:bg-surface-800 rounded-lg px-3 py-2"
                >
                  <Users className="h-3 w-3 text-surface-400 flex-shrink-0" />
                  <span className="font-medium">{lead.name}</span>
                  <span className="text-surface-400">·</span>
                  <span className="text-surface-500 truncate">{lead.company}</span>
                  {lead.score > 0 && (
                    <>
                      <span className="text-surface-300">·</span>
                      <span className="text-amber-600 font-medium">{lead.score}</span>
                    </>
                  )}
                </div>
              ))}
              {scrapedLeads.length > 10 && (
                <p className="text-xs text-surface-400 text-center pt-1">
                  +{scrapedLeads.length - 10} more
                </p>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-5 flex gap-3">
          {!scrapedLeads ? (
            <button
              onClick={handleScrape}
              disabled={scraping}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition-all disabled:bg-surface-400"
            >
              {scraping ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Scraping...</>
              ) : (
                <><MapPin className="h-4 w-4" /> Scrape Google Maps</>
              )}
            </button>
          ) : (
            <>
              <button
                onClick={handleImport}
                disabled={importing}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition-all disabled:bg-surface-400"
              >
                {importing ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Importing...</>
                ) : (
                  <><Users className="h-4 w-4" /> Import {scrapedLeads.length} Lead{scrapedLeads.length !== 1 ? "s" : ""}</>
                )}
              </button>
              <button
                onClick={() => { setScrapedLeads(null); setStatus(null); setError(null); }}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-surface-200 px-4 py-2.5 text-sm font-medium text-surface-600 hover:bg-surface-50 transition-all"
              >
                New Search
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
