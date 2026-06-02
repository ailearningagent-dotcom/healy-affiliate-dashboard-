"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CalendarDays,
  Clock,
  Loader2,
  Search,
  CheckCircle2,
  X,
  AlertCircle,
  Calendar,
  MoreHorizontal,
  ChevronDown,
  Filter,
} from "lucide-react";
import type { Appointment } from "@/lib/agents/types";
import clsx from "clsx";

// ============ STATUS CONFIG ============

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; text: string; icon: string }> = {
  scheduled: { label: "Scheduled", color: "#3b82f6", bg: "bg-blue-50 dark:bg-blue-900/20", text: "text-blue-700 dark:text-blue-400", icon: "📅" },
  completed: { label: "Completed", color: "#10b981", bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-700 dark:text-emerald-400", icon: "✅" },
  cancelled: { label: "Cancelled", color: "#ef4444", bg: "bg-red-50 dark:bg-red-900/20", text: "text-red-700 dark:text-red-400", icon: "❌" },
  no_show: { label: "No Show", color: "#f59e0b", bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-700 dark:text-amber-400", icon: "⚠️" },
};

const TYPE_CONFIG: Record<string, string> = {
  discovery: "Discovery Call",
  demo: "Product Demo",
  proposal: "Proposal Review",
  follow_up: "Follow Up",
};

// ============ HELPERS ============

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isUpcoming(date: Date | string): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  return d > new Date();
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ============ APPOINTMENT CARD ============

function AppointmentCard({
  appointment,
  onStatusChange,
}: {
  appointment: Appointment;
  onStatusChange: (id: string, status: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const statusConfig = STATUS_CONFIG[appointment.status] || STATUS_CONFIG.scheduled;
  const typeLabel = TYPE_CONFIG[appointment.type] || appointment.type;
  const upcoming = isUpcoming(appointment.dateTime);

  return (
    <div className="group rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-5 hover:border-primary-200 dark:hover:border-primary-700 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={clsx(
              "flex h-10 w-10 items-center justify-center rounded-full text-white font-bold text-sm",
              appointment.status === "completed" && "bg-emerald-500",
              appointment.status === "cancelled" && "bg-red-400",
              appointment.status === "no_show" && "bg-amber-400",
              appointment.status === "scheduled" && "bg-primary-500"
            )}
          >
            {getInitials(appointment.leadName)}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
              {appointment.leadName}
            </h3>
            <p className="text-xs text-surface-500">
              {appointment.leadCompany || typeLabel}
            </p>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-lg p-1.5 text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors opacity-0 group-hover:opacity-100"
            title="Change status"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-10 z-20 w-44 rounded-xl border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 shadow-lg py-1 animate-scale-in">
                {["scheduled", "completed", "cancelled", "no_show"].map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      onStatusChange(appointment.id, s);
                      setMenuOpen(false);
                    }}
                    className={clsx(
                      "flex w-full items-center gap-2 px-4 py-2 text-xs font-medium transition-colors",
                      s === appointment.status
                        ? "text-primary-600 bg-primary-50 dark:bg-primary-900/20"
                        : "text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-700"
                    )}
                  >
                    <span>{STATUS_CONFIG[s]?.icon || "•"}</span>
                    {STATUS_CONFIG[s]?.label || s}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-400">
          <Calendar className="h-3.5 w-3.5 text-surface-400 flex-shrink-0" />
          <span>{formatDate(appointment.dateTime)}</span>
          {upcoming && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              Upcoming
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-400">
          <Clock className="h-3.5 w-3.5 text-surface-400 flex-shrink-0" />
          <span>{formatTime(appointment.dateTime)} — {appointment.duration} min</span>
        </div>
        {appointment.notes && (
          <p className="text-xs text-surface-500 italic line-clamp-2">
            "{appointment.notes}"
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-surface-100 dark:border-surface-700">
        <span className={clsx(
          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
          statusConfig.bg,
          statusConfig.text
        )}>
          {statusConfig.icon} {statusConfig.label}
        </span>
        <span className="text-[11px] text-surface-400">
          {appointment.type} · {appointment.createdBy}
        </span>
      </div>
    </div>
  );
}

// ============ SUMMARY STAT CARD ============

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  sublabel,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  sublabel?: string;
}) {
  return (
    <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-4 hover:shadow-md transition-all duration-200">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}15` }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <div>
          <p className="text-2xl font-bold text-surface-900 dark:text-surface-100">{value}</p>
          <p className="text-xs text-surface-500">{label}</p>
          {sublabel && <p className="text-[11px] text-surface-400 mt-0.5">{sublabel}</p>}
        </div>
      </div>
    </div>
  );
}

// ============ TODAY'S TIMELINE ============

function TodayTimeline({ appointments }: { appointments: Appointment[] }) {
  const today = new Date();
  const todayStr = today.toDateString();
  const todayAppts = appointments.filter((a) => {
    const d = typeof a.dateTime === "string" ? new Date(a.dateTime) : a.dateTime;
    return d.toDateString() === todayStr && a.status === "scheduled";
  }).sort((a, b) => {
    const da = typeof a.dateTime === "string" ? new Date(a.dateTime) : a.dateTime;
    const db = typeof b.dateTime === "string" ? new Date(b.dateTime) : b.dateTime;
    return da.getTime() - db.getTime();
  });

  if (todayAppts.length === 0) {
    return (
      <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4 text-surface-400" />
          <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">Today's Schedule</h3>
        </div>
        <p className="text-sm text-surface-400 py-6 text-center">No appointments scheduled for today</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-surface-400" />
          <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">Today's Schedule</h3>
        </div>
        <span className="text-xs text-surface-400">{todayAppts.length} appointment{todayAppts.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="relative pl-6 space-y-0">
        {/* Timeline line */}
        <div className="absolute left-[7px] top-3 bottom-3 w-0.5 bg-surface-200 dark:bg-surface-600" />
        {todayAppts.map((apt, i) => {
          const time = typeof apt.dateTime === "string" ? new Date(apt.dateTime) : apt.dateTime;
          const isPast = time < new Date();
          const isNext = i === 0 && !isPast;

          return (
            <div key={apt.id} className={clsx("relative pb-4", i === todayAppts.length - 1 && "pb-0")}>
              {/* Dot */}
              <div className={clsx(
                "absolute -left-[19px] top-1.5 h-3.5 w-3.5 rounded-full border-2",
                isNext
                  ? "border-primary-500 bg-primary-100 dark:bg-primary-900/30"
                  : isPast
                  ? "border-surface-300 bg-surface-100 dark:bg-surface-700"
                  : "border-surface-300 bg-white dark:bg-surface-800"
              )}>
                {isNext && <span className="absolute inset-0 rounded-full animate-ping bg-primary-400 opacity-30" />}
              </div>

              <div className={clsx(
                "rounded-lg p-3 border transition-colors",
                isNext
                  ? "border-primary-200 dark:border-primary-700 bg-primary-50/50 dark:bg-primary-900/10"
                  : isPast
                  ? "border-surface-100 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-900/50"
                  : "border-surface-100 dark:border-surface-700 bg-white dark:bg-surface-800"
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-surface-900 dark:text-surface-100">{apt.leadName}</span>
                    <span className="text-xs text-surface-400">{apt.leadCompany}</span>
                  </div>
                  <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
                    {formatTime(time)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-surface-400 capitalize">{TYPE_CONFIG[apt.type] || apt.type}</span>
                  <span className="text-[11px] text-surface-300">·</span>
                  <span className="text-[11px] text-surface-400">{apt.duration} min</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============ MAIN COMPONENT ============

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/appointments");
      if (!res.ok) {
        if (res.status === 401) throw new Error("Authentication required — please log in");
        throw new Error("Failed to load appointments");
      }
      const data = await res.json();
      setAppointments(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load appointments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      setToast({ message: `Appointment marked as ${newStatus}`, type: "success" });
      loadAppointments();
    } catch {
      setToast({ message: "Failed to update appointment status", type: "error" });
    }
  };

  // Filter & search
  const filtered = appointments.filter((a) => {
    const q = search.toLowerCase();
    const matchesSearch =
      a.leadName.toLowerCase().includes(q) ||
      a.leadCompany.toLowerCase().includes(q) ||
      a.notes.toLowerCase().includes(q) ||
      a.type.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Stats
  const total = appointments.length;
  const scheduled = appointments.filter((a) => a.status === "scheduled").length;
  const completed = appointments.filter((a) => a.status === "completed").length;
  const cancelled = appointments.filter((a) => a.status === "cancelled").length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary-600" />
          <h2 className="text-2xl font-bold text-surface-900 dark:text-surface-100">
            Appointments
          </h2>
          <span className="rounded-full bg-surface-100 dark:bg-surface-800 px-2.5 py-0.5 text-xs font-medium text-surface-500">
            {total}
          </span>
        </div>
        <p className="text-sm text-surface-500 mt-1">
          View and manage all booked consultations
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Calendar} label="Total Appointments" value={total} color="#6366f1" />
        <StatCard icon={CalendarDays} label="Scheduled" value={scheduled} color="#3b82f6" sublabel={`${total > 0 ? Math.round((scheduled / total) * 100) : 0}% of total`} />
        <StatCard icon={CheckCircle2} label="Completed" value={completed} color="#10b981" sublabel={`${total > 0 ? Math.round((completed / total) * 100) : 0}% completion`} />
        <StatCard icon={X} label="Cancelled" value={cancelled} color="#ef4444" />
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Today's timeline (sidebar) */}
        <div className="lg:col-span-1 order-2 lg:order-1">
          <TodayTimeline appointments={appointments} />
        </div>

        {/* Appointment list */}
        <div className="lg:col-span-2 order-1 lg:order-2 space-y-4">
          {/* Search & filter */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
              <input
                type="text"
                placeholder="Search appointments..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 py-2.5 pl-9 pr-3 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400 pointer-events-none" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 py-2.5 pl-9 pr-8 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900"
              >
                <option value="all">All Status</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No Show</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-surface-400 pointer-events-none" />
            </div>
          </div>

          {/* List */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20 mb-4">
                <AlertCircle className="h-7 w-7 text-red-500" />
              </div>
              <p className="text-sm font-medium text-surface-900 dark:text-surface-100">{error}</p>
              <button
                onClick={loadAppointments}
                className="mt-3 rounded-lg border border-surface-200 dark:border-surface-600 px-4 py-2 text-sm text-surface-600 hover:bg-surface-50 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CalendarDays className="mb-3 h-12 w-12 text-surface-300 dark:text-surface-600" />
              <p className="text-sm font-medium text-surface-500">
                {search || statusFilter !== "all" ? "No matching appointments" : "No appointments yet"}
              </p>
              <p className="text-xs text-surface-400 mt-1">
                {search || statusFilter !== "all" ? "Try different search or filter" : "Bookings from the anonymous chat will appear here"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((apt) => (
                <AppointmentCard
                  key={apt.id}
                  appointment={apt}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={clsx(
          "fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl px-4 py-3 shadow-lg animate-slide-up",
          toast.type === "success"
            ? "bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
            : "bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
        )}>
          {toast.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span className="text-sm font-medium">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 rounded-full p-0.5 hover:bg-black/5 dark:hover:bg-white/10">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
