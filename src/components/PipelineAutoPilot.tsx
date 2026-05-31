"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Play,
  Square,
  RefreshCw,
  MapPin,
  Clock,
  DollarSign,
  Users,
  Activity,
  Settings2,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Zap,
} from "lucide-react";
import clsx from "clsx";

interface PipelineState {
  status: "idle" | "running" | "error" | "paused";
  lastScrapeAt: string | null;
  lastEnrichAt: string | null;
  lastNurtureAt: string | null;
  totalLeadsSourced: number;
  totalCostIncurred: number;
  nextScrapeAt: string | null;
  error: string | null;
  cycleCount: number;
  uptime: number;
}

interface PipelineConfig {
  enabled: boolean;
  scrapeIntervalHours: number;
  enrichEnabled: boolean;
  nurtureEnabled: boolean;
  defaultSource: string;
  defaultLocation: string;
  defaultQuery: string;
  maxLeadsPerScrape: number;
  preferredModel: string;
  preferredProvider: string;
}

export default function PipelineAutoPilot() {
  const [state, setState] = useState<PipelineState | null>(null);
  const [config, setConfig] = useState<PipelineConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [tickResult, setTickResult] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/pipeline");
      const data = await res.json();
      setState(data.state);
      setConfig(data.config);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    // Poll every 30 seconds for status updates
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, [loadStatus]);

  const doAction = async (action: string, extra?: Record<string, unknown>) => {
    setActionLoading(action);
    setTickResult(null);
    try {
      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (data.state) setState(data.state);
      if (data.config) setConfig(data.config);
      if (data.result) {
        const r = data.result;
        setTickResult(
          `✅ +${r.leadsAdded} leads, ${r.leadsEnriched} enriched, ${r.sequencesCreated} sequences — $${r.cost.toFixed(6)}`
        );
        setTimeout(() => setTickResult(null), 8000);
      }
    } catch (e) {
      setTickResult(`❌ Error: ${e instanceof Error ? e.message : "Unknown"}`);
    } finally {
      setActionLoading(null);
    }
  };

  const updateConfig = async (updates: Partial<PipelineConfig>) => {
    setActionLoading("config");
    try {
      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "config", config: updates }),
      });
      const data = await res.json();
      if (data.config) setConfig(data.config);
      if (data.state) setState(data.state);
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-surface-400 py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading Auto-Pilot...
      </div>
    );
  }

  const isRunning = state?.status === "running";
  const isEnabled = config?.enabled;

  return (
    <div className="rounded-xl border border-surface-200 bg-white overflow-hidden">
      {/* Header — Toggle + Status */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div
            className={clsx(
              "flex h-9 w-9 items-center justify-center rounded-lg",
              isEnabled ? "bg-emerald-50 text-emerald-600" : "bg-surface-100 text-surface-400"
            )}
          >
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-surface-900">Auto-Pilot</h3>
            <p className="text-xs text-surface-500">
              {isEnabled
                ? `Active — next scrape ${formatTime(state?.nextScrapeAt || null)}`
                : "Inactive — no automated scraping"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEnabled && (
            <button
              onClick={() => doAction("tick")}
              disabled={actionLoading !== null || isRunning}
              className="flex items-center gap-1.5 rounded-lg border border-surface-200 px-3 py-1.5 text-xs font-medium text-surface-600 hover:bg-surface-50 transition-colors disabled:opacity-50"
            >
              {actionLoading === "tick" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              Run Now
            </button>
          )}

          <button
            onClick={() =>
              doAction(isEnabled ? "stop" : "start")
            }
            disabled={actionLoading !== null}
            className={clsx(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-50",
              isEnabled
                ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200"
            )}
          >
            {actionLoading === "start" || actionLoading === "stop" ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : isEnabled ? (
              <Square className="h-3 w-3" />
            ) : (
              <Play className="h-3 w-3" />
            )}
            {isEnabled ? "Stop" : "Enable"}
          </button>

          <button
            onClick={() => setShowConfig(!showConfig)}
            className={clsx(
              "rounded-lg p-1.5 transition-colors",
              showConfig ? "bg-primary-50 text-primary-600" : "text-surface-400 hover:text-surface-600"
            )}
          >
            <Settings2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Status bar */}
      {isEnabled && state && (
        <div className="border-t border-surface-100 px-4 py-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatItem
              icon={<MapPin className="h-3.5 w-3.5" />}
              label="Leads Sourced"
              value={String(state.totalLeadsSourced || 0)}
            />
            <StatItem
              icon={<DollarSign className="h-3.5 w-3.5" />}
              label="Total Cost"
              value={`$${(state.totalCostIncurred || 0).toFixed(4)}`}
            />
            <StatItem
              icon={<Activity className="h-3.5 w-3.5" />}
              label="Cycles Run"
              value={String(state.cycleCount || 0)}
            />
            <StatItem
              icon={<Clock className="h-3.5 w-3.5" />}
              label="Uptime"
              value={formatUptime(state.uptime || 0)}
            />
          </div>

          {/* Tick result toast */}
          {tickResult && (
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-surface-50 px-3 py-2 text-xs text-surface-600 animate-fade-in">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
              {tickResult}
            </div>
          )}

          {/* Error state */}
          {state.error && (
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
              {state.error}
            </div>
          )}
        </div>
      )}

      {/* Config panel */}
      {showConfig && config && (
        <div className="border-t border-surface-100 px-4 py-3 space-y-3 animate-fade-in">
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">Configuration</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ConfigField
              label="Scrape Interval (hours)"
              value={String(config.scrapeIntervalHours)}
              onChange={(v) => updateConfig({ scrapeIntervalHours: parseInt(v) || 24 })}
              type="number"
              min={1}
              max={168}
            />
            <ConfigField
              label="Max Leads per Scrape"
              value={String(config.maxLeadsPerScrape)}
              onChange={(v) => updateConfig({ maxLeadsPerScrape: parseInt(v) || 10 })}
              type="number"
              min={1}
              max={50}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ConfigField
              label="Search Query"
              value={config.defaultQuery}
              onChange={(v) => updateConfig({ defaultQuery: v })}
              placeholder="wellness center health clinic"
            />
            <ConfigField
              label="Location (optional)"
              value={config.defaultLocation}
              onChange={(v) => updateConfig({ defaultLocation: v })}
              placeholder="e.g., California"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ConfigField
              label="LLM Provider"
              value={config.preferredProvider}
              onChange={(v) => updateConfig({ preferredProvider: v })}
              placeholder="gemini"
            />
            <ConfigField
              label="LLM Model"
              value={config.preferredModel}
              onChange={(v) => updateConfig({ preferredModel: v })}
              placeholder="gemini-2.0-flash-lite"
            />
          </div>

          <div className="flex items-center gap-4 pt-1">
            <ToggleField
              label="Enrichment"
              description="Auto-score new leads"
              enabled={config.enrichEnabled}
              onChange={(v) => updateConfig({ enrichEnabled: v })}
            />
            <ToggleField
              label="Nurture"
              description="Auto-create sequences"
              enabled={config.nurtureEnabled}
              onChange={(v) => updateConfig({ nurtureEnabled: v })}
            />
          </div>

          <p className="text-xs text-surface-400 italic">
            Pipeline uses <strong>Google Maps browser scraping</strong> ($0) +{" "}
            <strong>{config.preferredModel}</strong> enrichment (~$0.00005/lead).
            Estimated cost per cycle:{" "}
            <strong>~${(config.maxLeadsPerScrape * 0.00005).toFixed(5)}</strong>
          </p>
        </div>
      )}
    </div>
  );
}

// ==================== SUB-COMPONENTS ====================

function StatItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-100 text-surface-500">
        {icon}
      </div>
      <div>
        <p className="text-xs text-surface-400">{label}</p>
        <p className="text-sm font-semibold text-surface-800">{value}</p>
      </div>
    </div>
  );
}

function ConfigField({
  label,
  value,
  onChange,
  placeholder,
  type,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  min?: number;
  max?: number;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-surface-500">{label}</label>
      <input
        type={type || "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        className="w-full rounded-lg border border-surface-200 bg-white px-3 py-1.5 text-xs focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
      />
    </div>
  );
}

function ToggleField({
  label,
  description,
  enabled,
  onChange,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(!enabled)}
        className={clsx(
          "relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
          enabled ? "bg-emerald-500" : "bg-surface-300"
        )}
      >
        <span
          className={clsx(
            "inline-block h-4 w-4 rounded-full bg-white shadow transform transition duration-200",
            enabled ? "translate-x-4" : "translate-x-0"
          )}
        />
      </button>
      <div>
        <p className="text-xs font-medium text-surface-700">{label}</p>
        <p className="text-xs text-surface-400">{description}</p>
      </div>
    </div>
  );
}

// ==================== HELPERS ====================

function formatTime(iso: string | null): string {
  if (!iso) return "N/A";
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "now";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
