"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Users,
  Calendar,
  CalendarCheck,
  Star,
  Target,
  TrendingUp,
  Mail,
  Phone,
  Globe,
  Palette,
  ExternalLink,
  Eye,
  Clock,
  ChevronRight,
  Sparkles,
  AlertCircle,
  Loader2,
  CalendarDays,
  BarChart3,
  PieChart,
  Activity,
  UserCheck,
  Zap,
  Settings,
  X,
  CheckCircle2,
  Save,
  Power,
  PowerOff,
} from "lucide-react";
import type { Client, Lead, Appointment } from "@/lib/agents/types";
import clsx from "clsx";

// ============ TYPES ============

interface DashboardData extends Client {
  metrics: {
    totalLeads: number;
    appointmentsScheduled: number;
    appointmentsCompleted: number;
    totalBookings: number;
    qualifiedLeads: number;
    conversionRate: number;
    totalAppointments: number;
  };
  analytics: {
    statusDistribution: Record<string, number>;
    pipelineDistribution: Record<string, number>;
    sourceBreakdown: Record<string, number>;
    appointmentStatusDist: Record<string, number>;
    appointmentTypeDist: Record<string, number>;
  };
  leads: Lead[];
  appointments: Appointment[];
  upcomingAppointments: Appointment[];
  recentLeads: Lead[];
  bookings: Array<Record<string, unknown>>;
  calendar: {
    connected: boolean;
    email: string | null;
  };
}

// ============ STATUS CONFIG ============

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; text: string }> = {
  new: { label: "New", color: "#3b82f6", bg: "bg-blue-50", text: "text-blue-700" },
  contacted: { label: "Contacted", color: "#f59e0b", bg: "bg-amber-50", text: "text-amber-700" },
  qualified: { label: "Qualified", color: "#10b981", bg: "bg-emerald-50", text: "text-emerald-700" },
  appointment_scheduled: { label: "Appt. Scheduled", color: "#8b5cf6", bg: "bg-violet-50", text: "text-violet-700" },
  closed: { label: "Closed Won", color: "#059669", bg: "bg-emerald-50", text: "text-emerald-700" },
  lost: { label: "Closed Lost", color: "#ef4444", bg: "bg-red-50", text: "text-red-700" },
};

const PIPELINE_CONFIG: Record<string, { label: string; color: string }> = {
  sourced: { label: "Sourced", color: "#94a3b8" },
  contacted: { label: "Contacted", color: "#f59e0b" },
  nurturing: { label: "Nurturing", color: "#f97316" },
  warm: { label: "Warm", color: "#10b981" },
  hot: { label: "Hot", color: "#ef4444" },
  consultation_booked: { label: "Consultation Booked", color: "#8b5cf6" },
  closed_won: { label: "Closed Won", color: "#059669" },
  closed_lost: { label: "Closed Lost", color: "#6b7280" },
};

const SOURCE_CONFIG: Record<string, { label: string; color: string }> = {
  manual: { label: "Manual", color: "#6366f1" },
  directory: { label: "Directory", color: "#8b5cf6" },
  apollo: { label: "Apollo", color: "#ec4899" },
  linkedin: { label: "LinkedIn", color: "#0ea5e9" },
  csv_import: { label: "CSV Import", color: "#14b8a6" },
  referral: { label: "Referral", color: "#10b981" },
  website: { label: "Website", color: "#f59e0b" },
};

const APPT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  scheduled: { label: "Scheduled", color: "#3b82f6" },
  completed: { label: "Completed", color: "#10b981" },
  cancelled: { label: "Cancelled", color: "#ef4444" },
  no_show: { label: "No Show", color: "#f59e0b" },
};

// ============ PIE CHART (conic-gradient) ============

function PieChartSVG({
  data,
  total,
  size = 120,
}: {
  data: { label: string; value: number; color: string }[];
  total: number;
  size?: number;
}) {
  if (total === 0) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <div className="rounded-full border-2 border-dashed border-surface-200" style={{ width: size - 8, height: size - 8 }} />
      </div>
    );
  }

  const segments = data.filter((d) => d.value > 0);
  const conicGradients = segments.map((d, i) => {
    const startPct = segments
      .slice(0, i)
      .reduce((sum, s) => sum + (s.value / total) * 100, 0);
    const endPct = startPct + (d.value / total) * 100;
    return `${d.color} ${startPct}% ${endPct}%`;
  });

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <div
        className="rounded-full"
        style={{
          width: size - 8,
          height: size - 8,
          background: `conic-gradient(${conicGradients.join(", ")})`,
        }}
      />
      <div className="absolute flex flex-col items-center justify-center rounded-full bg-white dark:bg-surface-800" style={{ width: size / 2.5, height: size / 2.5 }}>
        <span className="text-lg font-bold text-surface-900 dark:text-surface-100">{total}</span>
        <span className="text-[10px] text-surface-500">Total</span>
      </div>
    </div>
  );
}

// ============ BAR CHART ============

function BarChart({
  data,
  maxValue,
  color = "primary",
  height = 160,
}: {
  data: { label: string; value: number; color?: string }[];
  maxValue: number;
  color?: string;
  height?: number;
}) {
  const max = Math.max(maxValue, 1);
  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {data.map((d, i) => {
        const pct = (d.value / max) * 100;
        return (
          <div key={i} className="group relative flex flex-1 flex-col items-center justify-end h-full">
            <div className="mb-1 text-[11px] font-medium text-surface-500 opacity-0 group-hover:opacity-100 transition-opacity">
              {d.value}
            </div>
            <div
              className="w-full rounded-t-md transition-all duration-300 hover:opacity-80"
              style={{
                height: `${Math.max(pct, 2)}%`,
                backgroundColor: d.color || "var(--color-primary-500, #6366f1)",
              }}
            />
            <div className="mt-1.5 text-[10px] text-surface-400 truncate w-full text-center" title={d.label}>
              {d.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============ HERO STAT CARD ============

function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  color,
  trend,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sublabel?: string;
  color: string;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-5 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        {trend && (
          <span
            className={clsx(
              "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
              trend === "up" && "bg-emerald-50 text-emerald-600",
              trend === "down" && "bg-red-50 text-red-600",
              trend === "neutral" && "bg-surface-100 text-surface-500"
            )}
          >
            <TrendingUp className="h-3 w-3" />
            {trend === "up" ? "+" : trend === "down" ? "-" : ""}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-surface-900 dark:text-surface-100">{value}</p>
      <p className="text-xs text-surface-500 mt-0.5">{label}</p>
      {sublabel && <p className="text-[11px] text-surface-400 mt-1">{sublabel}</p>}
    </div>
  );
}

// ============ LOADING SKELETON ============

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-64 rounded-lg bg-surface-200 dark:bg-surface-700" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-surface-100 dark:bg-surface-800" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-64 rounded-xl bg-surface-100 dark:bg-surface-800" />
        <div className="h-64 rounded-xl bg-surface-100 dark:bg-surface-800" />
      </div>
      <div className="h-48 rounded-xl bg-surface-100 dark:bg-surface-800" />
    </div>
  );
}

// ============ SETTINGS MODAL ============

function ClientSettingsModal({
  client,
  onClose,
  onSaved,
}: {
  client: DashboardData;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(client.name);
  const [slug, setSlug] = useState(client.slug);
  const [email, setEmail] = useState(client.email || "");
  const [company, setCompany] = useState(client.company || "");
  const [primaryColor, setPrimaryColor] = useState(client.primaryColor);
  const [isActive, setIsActive] = useState(client.isActive);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSlug = useCallback((val: string) => {
    return val
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 50);
  }, []);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slug || slug === generateSlug(name.slice(0, -1))) {
      setSlug(generateSlug(val));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        name,
        slug,
        primaryColor,
        isActive,
      };
      if (email) body.email = email;
      if (company) body.company = company;

      const res = await fetch(`/api/admin/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update client");
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update client");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-6 shadow-xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-100 dark:bg-surface-700">
              <Settings className="h-5 w-5 text-surface-600 dark:text-surface-300" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-surface-900 dark:text-surface-100">
                {client.name} Settings
              </h3>
              <p className="text-xs text-surface-500">Edit client workspace configuration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
          >
            <X className="h-4 w-4 text-surface-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="settings-name" className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1.5">
              Client Name <span className="text-red-500">*</span>
            </label>
            <input
              id="settings-name"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Wellness Center NYC"
              className="w-full rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900"
              autoFocus
              required
            />
          </div>

          <div>
            <label htmlFor="settings-slug" className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1.5">
              Slug <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-surface-400 font-mono">
                /book/
              </span>
              <input
                id="settings-slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(generateSlug(e.target.value))}
                placeholder="wellness-center-nyc"
                className="w-full rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 pl-14 pr-3 py-2.5 text-sm font-mono focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900"
                required
              />
            </div>
            <p className="text-[11px] text-surface-400 mt-1">Booking page URL: /book/{slug || "..."}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="settings-email" className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                Email
              </label>
              <input
                id="settings-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@client.com"
                className="w-full rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900"
              />
            </div>
            <div>
              <label htmlFor="settings-company" className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                Company
              </label>
              <input
                id="settings-company"
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Client Company"
                className="w-full rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div>
              <label htmlFor="settings-color" className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                Brand Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="settings-color"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-10 rounded-lg border border-surface-200 dark:border-surface-600 cursor-pointer"
                />
                <span className="text-sm font-mono text-surface-500">{primaryColor}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                Status
              </label>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={clsx(
                  "inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                    : "border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 text-surface-500 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700"
                )}
              >
                {isActive ? (
                  <><Power className="h-4 w-4" /> Active</>
                ) : (
                  <><PowerOff className="h-4 w-4" /> Inactive</>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-surface-200 dark:border-surface-600 px-4 py-2.5 text-sm font-medium text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name || !slug}
              className="flex-1 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {saving ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                <><Save className="h-4 w-4" /> Save Changes</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============ MAIN COMPONENT ============

export default function AdminClientDashboard() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const id = params?.id as string;

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/clients/${id}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Client not found");
        throw new Error("Failed to load client data");
      }
      const json = await res.json();
      setData(json as DashboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load client data");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <DashboardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20 mb-4">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <p className="text-sm font-medium text-surface-900 dark:text-surface-100">{error}</p>
        <button
          onClick={() => router.push("/admin/clients")}
          className="mt-4 flex items-center gap-2 rounded-lg border border-surface-200 px-4 py-2 text-sm text-surface-600 hover:bg-surface-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Clients
        </button>
      </div>
    );
  }

  if (!data) return null;

  const {
    statusDistribution,
    pipelineDistribution,
    sourceBreakdown,
    appointmentStatusDist,
  } = data.analytics;

  // Prepare data for charts
  const statusChartData = Object.entries(statusDistribution).map(([key, val]) => ({
    label: STATUS_CONFIG[key]?.label || key,
    value: val,
    color: STATUS_CONFIG[key]?.color || "#94a3b8",
  }));

  const pipelineChartData = Object.entries(pipelineDistribution).map(([key, val]) => ({
    label: PIPELINE_CONFIG[key]?.label || key,
    value: val,
    color: PIPELINE_CONFIG[key]?.color || "#94a3b8",
  }));

  const sourceChartData = Object.entries(sourceBreakdown).map(([key, val]) => ({
    label: SOURCE_CONFIG[key]?.label || key,
    value: val,
    color: SOURCE_CONFIG[key]?.color || "#94a3b8",
  }));

  const apptStatusChartData = Object.entries(appointmentStatusDist).map(([key, val]) => ({
    label: APPT_STATUS_CONFIG[key]?.label || key,
    value: val,
    color: APPT_STATUS_CONFIG[key]?.color || "#94a3b8",
  }));

  const totalLeads = data.metrics.totalLeads;
  const totalAppointments = data.metrics.totalAppointments;
  const leadMaxValue = Math.max(...statusChartData.map((d) => d.value), 1);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ======== HEADER ======== */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/admin/clients")}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 text-surface-500 hover:text-surface-700 hover:bg-surface-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl text-white font-bold text-lg"
            style={{ backgroundColor: data.primaryColor }}
          >
            {data.name
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-surface-900 dark:text-surface-100">
                {data.name}
              </h2>
              <span
                className={clsx(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                  data.isActive
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                    : "bg-surface-100 text-surface-500"
                )}
              >
                <span
                  className={clsx(
                    "h-1.5 w-1.5 rounded-full",
                    data.isActive ? "bg-emerald-500" : "bg-surface-400"
                  )}
                />
                {data.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="text-sm text-surface-500">{data.company || data.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {data.calendar.connected && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Calendar Connected
            </span>
          )}
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-1.5 rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-1.5 text-xs font-medium text-surface-600 dark:text-surface-400 hover:bg-surface-50 transition-colors"
          >
            <Settings className="h-3.5 w-3.5" />
            Settings
          </button>
          <a
            href={`/book/${data.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-1.5 text-xs font-medium text-surface-600 dark:text-surface-400 hover:bg-surface-50 transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
            View Booking Page
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* ======== HERO STATS ======== */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard icon={Users} label="Total Leads" value={totalLeads} color="#6366f1" trend={totalLeads > 0 ? "up" : undefined} />
        <StatCard icon={UserCheck} label="Qualified Leads" value={data.metrics.qualifiedLeads} color="#10b981" sublabel={`${totalLeads > 0 ? Math.round((data.metrics.qualifiedLeads / totalLeads) * 100) : 0}% of total`} />
        <StatCard icon={Calendar} label="Appointments" value={totalAppointments} color="#8b5cf6" sublabel={`${data.metrics.appointmentsScheduled} scheduled`} />
        <StatCard icon={CalendarCheck} label="Bookings" value={data.metrics.totalBookings} color="#f59e0b" />
        <StatCard icon={Target} label="Conversion" value={`${data.metrics.conversionRate}%`} color="#ec4899" sublabel={`${data.metrics.appointmentsCompleted} completed`} />
      </div>

      {/* ======== CHARTS ROW ======== */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Lead Status Distribution */}
        <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-surface-400" />
              <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
                Lead Status Distribution
              </h3>
            </div>
          </div>
          {statusChartData.length === 0 ? (
            <p className="text-sm text-surface-400 py-8 text-center">No leads yet</p>
          ) : (
            <div>
              <BarChart data={statusChartData} maxValue={leadMaxValue} height={150} />
              {/* Legend */}
              <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-surface-100 dark:border-surface-700">
                {statusChartData.map((d, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                    <span className="text-[11px] text-surface-500">{d.label}</span>
                    <span className="text-[11px] font-medium text-surface-700 dark:text-surface-300">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Lead Source Breakdown */}
        <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <PieChart className="h-4 w-4 text-surface-400" />
              <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
                Lead Sources
              </h3>
            </div>
          </div>
          {sourceChartData.length === 0 ? (
            <p className="text-sm text-surface-400 py-8 text-center">No leads yet</p>
          ) : (
            <div className="flex items-center gap-8">
              <PieChartSVG data={sourceChartData} total={totalLeads} />
              <div className="flex-1 space-y-2">
                {sourceChartData.map((d, i) => {
                  const pct = Math.round((d.value / totalLeads) * 100);
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-xs text-surface-500 flex-1">{d.label}</span>
                      <span className="text-xs font-medium text-surface-700 dark:text-surface-300">{d.value}</span>
                      <span className="text-[11px] text-surface-400 w-8 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ======== PIPELINE + APPOINTMENTS ROW ======== */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pipeline Stage Distribution */}
        <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Activity className="h-4 w-4 text-surface-400" />
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
              Pipeline Stages
            </h3>
          </div>
          {pipelineChartData.length === 0 ? (
            <p className="text-sm text-surface-400 py-8 text-center">No leads in pipeline</p>
          ) : (
            <div className="space-y-3">
              {pipelineChartData.map((d, i) => {
                const pct = Math.round((d.value / totalLeads) * 100);
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-surface-600 dark:text-surface-400">{d.label}</span>
                      <span className="text-xs font-medium text-surface-700 dark:text-surface-300">{d.value}</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-100 dark:bg-surface-700 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: d.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Appointment Status */}
        <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-6">
          <div className="flex items-center gap-2 mb-5">
            <CalendarDays className="h-4 w-4 text-surface-400" />
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
              Appointment Status
            </h3>
          </div>
          {apptStatusChartData.length === 0 ? (
            <p className="text-sm text-surface-400 py-8 text-center">No appointments yet</p>
          ) : (
            <div className="space-y-3">
              {apptStatusChartData.map((d, i) => {
                const pct = totalAppointments > 0 ? Math.round((d.value / totalAppointments) * 100) : 0;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-surface-600 dark:text-surface-400">{d.label}</span>
                      <span className="text-xs font-medium text-surface-700 dark:text-surface-300">{d.value}</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-100 dark:bg-surface-700 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: d.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ======== UPCOMING APPOINTMENTS ======== */}
      <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-surface-400" />
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
              Upcoming Appointments
            </h3>
          </div>
          {data.upcomingAppointments.length > 0 && (
            <span className="text-xs text-surface-400">
              Next 30 days
            </span>
          )}
        </div>
        {data.upcomingAppointments.length === 0 ? (
          <p className="text-sm text-surface-400 py-6 text-center">No upcoming appointments</p>
        ) : (
          <div className="divide-y divide-surface-100 dark:divide-surface-700">
            {data.upcomingAppointments.map((apt) => (
              <div key={apt.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-semibold text-xs">
                  {apt.leadName
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">
                    {apt.leadName}
                  </p>
                  <p className="text-xs text-surface-500">{apt.leadCompany}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-surface-700 dark:text-surface-300">
                    {new Date(apt.dateTime).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-[11px] text-surface-400">
                    {new Date(apt.dateTime).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <span
                  className={clsx(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
                    apt.status === "scheduled" && "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
                    apt.status === "completed" && "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
                    apt.status === "cancelled" && "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
                    apt.status === "no_show" && "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                  )}
                >
                  {apt.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ======== RECENT LEADS ======== */}
      <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-surface-400" />
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
              Recent Leads
            </h3>
          </div>
          {data.recentLeads.length > 0 && (
            <span className="text-xs text-surface-400">Last 7 days</span>
          )}
        </div>
        {data.recentLeads.length === 0 ? (
          <p className="text-sm text-surface-400 py-6 text-center">No new leads this week</p>
        ) : (
          <div className="divide-y divide-surface-100 dark:divide-surface-700">
            {data.recentLeads.map((lead) => (
              <div key={lead.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-400 font-semibold text-xs">
                  {lead.name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">
                    {lead.name}
                  </p>
                  <p className="text-xs text-surface-500 truncate">
                    {lead.role && `${lead.role} · `}{lead.company}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={clsx(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                      STATUS_CONFIG[lead.status]?.bg || "bg-surface-100",
                      STATUS_CONFIG[lead.status]?.text || "text-surface-600"
                    )}
                  >
                    {STATUS_CONFIG[lead.status]?.label || lead.status}
                  </span>
                  <div className="flex items-center gap-1 rounded-md bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5">
                    <Star className="h-3 w-3 text-amber-500" />
                    <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400">{lead.score}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ======== CLIENT INFO ======== */}
      <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-surface-400" />
          <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
            Client Information
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-400">
            <Mail className="h-4 w-4 text-surface-400" />
            {data.email || "No email"}
          </div>
          <div className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-400">
            <Globe className="h-4 w-4 text-surface-400" />
            <span className="font-mono">/book/{data.slug}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-400">
            <Palette className="h-4 w-4 text-surface-400" />
            <span className="font-mono">{data.primaryColor}</span>
            <span
              className="inline-block h-4 w-4 rounded border border-surface-200"
              style={{ backgroundColor: data.primaryColor }}
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-400">
            <CalendarDays className="h-4 w-4 text-surface-400" />
            Created {new Date(data.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && data && (
        <ClientSettingsModal
          client={data}
          onClose={() => setShowSettings(false)}
          onSaved={() => {
            loadData();
            setToast({ message: "Client settings updated successfully", type: "success" });
          }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          className={clsx(
            "fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl px-4 py-3 shadow-lg animate-slide-up",
            toast.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
              : "bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
          )}
        >
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 rounded-full p-0.5 hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
