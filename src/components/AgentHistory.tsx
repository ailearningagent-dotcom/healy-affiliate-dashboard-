"use client";

import { useEffect, useState } from "react";
import {
  History,
  Bot,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  RefreshCw,
  Search,
  Filter,
  Trash2,
  ChevronDown,
  ChevronRight,
  FileText,
  Crown,
  DollarSign,
  BarChart3,
  Palette,
  TrendingUp,
  Code2,
  Globe,
  Mail,
} from "lucide-react";
import type { AgentResult, AgentType } from "@/lib/agents/types";
import clsx from "clsx";

const AGENT_ICONS: Record<string, React.ElementType> = {
  content: FileText,
  research: Search,
  outreach: Mail,
  ceo: Crown,
  cfo: DollarSign,
  analyst: BarChart3,
  design: Palette,
  sales: TrendingUp,
  developer: Code2,
  scraper: Globe,
};

const AGENT_COLORS: Record<string, string> = {
  content: "text-emerald-600 bg-emerald-50",
  research: "text-violet-600 bg-violet-50",
  outreach: "text-amber-600 bg-amber-50",
  ceo: "text-purple-600 bg-purple-50",
  cfo: "text-emerald-600 bg-emerald-50",
  analyst: "text-blue-600 bg-blue-50",
  design: "text-pink-600 bg-pink-50",
  sales: "text-amber-600 bg-amber-50",
  developer: "text-cyan-600 bg-cyan-50",
  scraper: "text-indigo-600 bg-indigo-50",
};

const AGENT_LABELS: Record<string, string> = {
  content: "Content Creator",
  research: "Prospect Researcher",
  outreach: "Outreach Specialist",
  ceo: "AI CEO",
  cfo: "AI CFO",
  analyst: "Data Analyst",
  design: "Design Team",
  sales: "Sales Team",
  developer: "Developer",
  scraper: "Lead Scraper",
};

function ResultOutput({ output }: { output: string }) {
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(output);
  } catch {
    // Not JSON
  }

  if (!parsed) {
    return (
      <pre className="text-xs text-surface-600 whitespace-pre-wrap font-mono leading-relaxed max-h-40 overflow-y-auto rounded-lg bg-surface-50 dark:bg-surface-800 p-3">
        {output.slice(0, 500)}
        {output.length > 500 && "..."}
      </pre>
    );
  }

  const displayText = JSON.stringify(parsed, null, 2).slice(0, 500);
  return (
    <pre className="text-xs text-surface-600 whitespace-pre-wrap font-mono leading-relaxed max-h-40 overflow-y-auto rounded-lg bg-surface-50 dark:bg-surface-800 p-3">
      {displayText}
      {JSON.stringify(parsed, null, 2).length > 500 && "..."}
    </pre>
  );
}

export default function AgentHistory() {
  const [results, setResults] = useState<AgentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reRunning, setReRunning] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard");
      const data = await res.json();
      // Derive history from recent activity in dashboard
      if (data?.metrics?.recentActivity) {
        const activities = data.metrics.recentActivity.map((a: { id: string; type: string; description: string; timestamp: string; status?: string }) => ({
          id: a.id,
          agentType: a.type as AgentType,
          status: (a.status === "Completed" ? "completed" : a.status === "Failed" ? "error" : "completed") as "completed" | "error" | "idle" | "running",
          output: a.description,
          createdAt: new Date(a.timestamp),
        }));
        setResults(activities as AgentResult[]);
      }
    } catch {
      // Use empty state
    }
    setLoading(false);
  }

  async function handleReRun(result: AgentResult) {
    setReRunning(result.id);
    try {
      const res = await fetch("/api/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentType: result.agentType,
          input: result.output || "{}",
        }),
      });
      if (res.ok) {
        await loadHistory();
      }
    } catch {
      // Ignore
    }
    setReRunning(null);
  }

  async function handleDelete(id: string) {
    // In a full implementation, this would delete from DB
    setResults((prev) => prev.filter((r) => r.id !== id));
  }

  const filtered = results.filter((r) => {
    const matchesSearch =
      AGENT_LABELS[r.agentType]?.toLowerCase().includes(search.toLowerCase()) ||
      r.output.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || r.agentType === typeFilter;
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-surface-900">Agent History</h2>
        <p className="text-sm text-surface-500 mt-1">
          View past agent executions, re-run agents, and track performance over time
        </p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
          <input
            type="text"
            id="history-search"
            name="search"
            placeholder="Search history..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-surface-200 bg-white dark:bg-surface-800 py-2 pl-9 pr-3 text-sm text-surface-900 placeholder-surface-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all"
          />
        </div>
        <select
          id="type-filter"
          name="typeFilter"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-surface-200 bg-white dark:bg-surface-800 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
        >
          <option value="all">All Agents</option>
          {Object.entries(AGENT_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          id="status-filter"
          name="statusFilter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-surface-200 bg-white dark:bg-surface-800 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
        >
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="error">Error</option>
          <option value="running">Running</option>
        </select>
        <button
          onClick={loadHistory}
          className="flex items-center gap-2 rounded-lg border border-surface-200 bg-white dark:bg-surface-800 px-3 py-2 text-sm font-medium text-surface-600 hover:bg-surface-50 dark:hover:bg-surface-700 transition-all"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <History className="mb-3 h-12 w-12 text-surface-300" />
          <p className="text-sm font-medium text-surface-500">No history found</p>
          <p className="text-xs text-surface-400 mt-1">
            {search || typeFilter !== "all" || statusFilter !== "all"
              ? "Try adjusting your filters"
              : "Run some agents to see their history here"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((result) => {
            const Icon = AGENT_ICONS[result.agentType] ?? Bot;
            const colorClass = AGENT_COLORS[result.agentType] ?? "text-surface-600 bg-surface-50";
            const isExpanded = expandedId === result.id;
            const isReRunning = reRunning === result.id;

            return (
              <div
                key={result.id}
                className={clsx(
                  "rounded-xl border transition-all duration-200",
                  isExpanded
                    ? "border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 shadow-sm"
                    : "border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 hover:border-surface-300 dark:hover:border-surface-600"
                )}
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : result.id)}
                  className="w-full flex items-center gap-3 p-4 text-left"
                >
                  <div className={clsx("flex h-9 w-9 items-center justify-center rounded-lg", colorClass)}>
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-surface-900">
                        {AGENT_LABELS[result.agentType] ?? result.agentType}
                      </p>
                      <span
                        className={clsx(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                          result.status === "completed"
                            ? "bg-emerald-50 text-emerald-700"
                            : result.status === "error"
                              ? "bg-red-50 text-red-700"
                              : "bg-amber-50 text-amber-700"
                        )}
                      >
                        {result.status === "completed" ? (
                          <CheckCircle2 className="h-3 w-3 mr-0.5" />
                        ) : result.status === "error" ? (
                          <AlertCircle className="h-3 w-3 mr-0.5" />
                        ) : (
                          <Loader2 className="h-3 w-3 mr-0.5 animate-spin" />
                        )}
                        {result.status}
                      </span>
                    </div>
                    <p className="text-xs text-surface-500 mt-0.5 truncate">
                      {result.output?.slice(0, 120) || "No output"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-surface-400">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">
                      {result.createdAt instanceof Date
                        ? result.createdAt.toLocaleDateString()
                        : new Date(result.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-surface-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-surface-400 flex-shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t border-surface-200 dark:border-surface-700 px-4 pb-4 pt-3 space-y-3">
                    <ResultOutput output={result.output} />

                    {result.error && (
                      <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                        <p className="text-xs font-semibold text-red-700 dark:text-red-300 mb-1">Error</p>
                        <p className="text-xs text-red-600 dark:text-red-400">{result.error}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-[11px] text-surface-400">
                      <span>ID: {result.id.slice(0, 8)}...</span>
                      <span>·</span>
                      <span>
                        {result.createdAt instanceof Date
                          ? result.createdAt.toLocaleString()
                          : new Date(result.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReRun(result);
                        }}
                        disabled={isReRunning}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/30 px-3 py-1.5 text-xs font-medium text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-all disabled:opacity-50"
                      >
                        {isReRunning ? (
                          <><Loader2 className="h-3 w-3 animate-spin" /> Running...</>
                        ) : (
                          <><RefreshCw className="h-3 w-3" /> Re-run</>
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(result.id);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
