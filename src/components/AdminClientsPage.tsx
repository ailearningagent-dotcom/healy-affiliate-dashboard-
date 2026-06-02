"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Building2,
  Plus,
  Search,
  ChevronRight,
  Users,
  Calendar,
  CalendarCheck,
  ExternalLink,
  Power,
  PowerOff,
  Trash2,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Globe,
  Mail,
  Palette,
  Eye,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import type { Client } from "@/lib/agents/types";
import clsx from "clsx";

// ============ TYPES ============

interface ClientWithMetrics extends Client {
  metrics?: {
    totalLeads: number;
    appointmentsScheduled: number;
    appointmentsCompleted: number;
  };
  leads?: Array<Record<string, unknown>>;
  appointments?: Array<Record<string, unknown>>;
}

// ============ CREATE MODAL ============

function CreateClientModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#6366f1");
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
      const res = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          email: email || undefined,
          company: company || undefined,
          primaryColor,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create client");
      }

      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create client");
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
        className="w-full max-w-lg rounded-2xl border border-surface-200 bg-white dark:bg-surface-800 p-6 shadow-xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-surface-900">New Client</h3>
              <p className="text-xs text-surface-500">Create a new client workspace</p>
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
            <label htmlFor="client-name" className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1.5">
              Client Name <span className="text-red-500">*</span>
            </label>
            <input
              id="client-name"
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
            <label htmlFor="client-slug" className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1.5">
              Slug <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-surface-400 font-mono">
                /book/
              </span>
              <input
                id="client-slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(generateSlug(e.target.value))}
                placeholder="wellness-center-nyc"
                className="w-full rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 pl-14 pr-3 py-2.5 text-sm font-mono focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900"
                required
              />
            </div>
            <p className="text-[11px] text-surface-400 mt-1">Unique identifier for this client</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="client-email" className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                Email
              </label>
              <input
                id="client-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@client.com"
                className="w-full rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900"
              />
            </div>
            <div>
              <label htmlFor="client-company" className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                Company
              </label>
              <input
                id="client-company"
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Client Company"
                className="w-full rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900"
              />
            </div>
          </div>

          <div>
            <label htmlFor="client-color" className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1.5">
              Brand Color
            </label>
            <div className="flex items-center gap-3">
              <input
                id="client-color"
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-10 rounded-lg border border-surface-200 dark:border-surface-600 cursor-pointer"
              />
              <span className="text-sm font-mono text-surface-500">{primaryColor}</span>
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
                <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</>
              ) : (
                <><Plus className="h-4 w-4" /> Create Client</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============ DELETE CONFIRM MODAL ============

function DeleteConfirmModal({
  client,
  onClose,
  onDeleted,
}: {
  client: Client;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/clients/${client.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete client");
      }
      onDeleted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete client");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-surface-200 bg-white dark:bg-surface-800 p-6 shadow-xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
            <Trash2 className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-surface-900">Delete Client</h3>
            <p className="text-xs text-surface-500">This action cannot be undone</p>
          </div>
        </div>

        <p className="text-sm text-surface-600 dark:text-surface-400 mb-2">
          Are you sure you want to delete <strong>{client.name}</strong>?
        </p>
        <p className="text-xs text-surface-500 mb-4">
          All associated data (leads, appointments, bookings) will be orphaned.
        </p>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 mb-4">
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-surface-200 dark:border-surface-600 px-4 py-2.5 text-sm font-medium text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            {deleting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Deleting...</>
            ) : (
              <><Trash2 className="h-4 w-4" /> Delete</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ CLIENT CARD ============

function ClientCard({
  client,
  onSelect,
  onToggleActive,
  onDelete,
}: {
  client: ClientWithMetrics;
  onSelect: (client: ClientWithMetrics) => void;
  onToggleActive: (client: ClientWithMetrics) => void;
  onDelete: (client: Client) => void;
}) {
  return (
    <div
      onClick={() => onSelect(client)}
      className="group cursor-pointer rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-5 hover:border-primary-200 dark:hover:border-primary-700 hover:shadow-md transition-all duration-200"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg text-white font-bold text-sm"
            style={{ backgroundColor: client.primaryColor }}
          >
            {client.name
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
              {client.name}
            </h3>
            <p className="text-xs text-surface-500">{client.company || client.email}</p>
          </div>
        </div>
        <span
          className={clsx(
            "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
            client.isActive
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
              : "bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400"
          )}
        >
          {client.isActive ? "Active" : "Inactive"}
        </span>
      </div>

      {/* Metrics */}
      {client.metrics && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-lg bg-surface-50 dark:bg-surface-900/50 p-2.5 text-center">
            <Users className="h-3.5 w-3.5 text-primary-500 mx-auto mb-1" />
            <p className="text-sm font-bold text-surface-900 dark:text-surface-100">
              {client.metrics.totalLeads}
            </p>
            <p className="text-[10px] text-surface-500">Leads</p>
          </div>
          <div className="rounded-lg bg-surface-50 dark:bg-surface-900/50 p-2.5 text-center">
            <Calendar className="h-3.5 w-3.5 text-violet-500 mx-auto mb-1" />
            <p className="text-sm font-bold text-surface-900 dark:text-surface-100">
              {client.metrics.appointmentsScheduled}
            </p>
            <p className="text-[10px] text-surface-500">Appts</p>
          </div>
          <div className="rounded-lg bg-surface-50 dark:bg-surface-900/50 p-2.5 text-center">
            <CalendarCheck className="h-3.5 w-3.5 text-emerald-500 mx-auto mb-1" />
            <p className="text-sm font-bold text-surface-900 dark:text-surface-100">
              {client.metrics.appointmentsScheduled}
            </p>
            <p className="text-[10px] text-surface-500">Appointments</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-surface-400 font-mono">
          {client.slug}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleActive(client);
            }}
            className={clsx(
              "rounded-lg p-1.5 transition-colors",
              client.isActive
                ? "text-surface-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                : "text-surface-400 hover:text-surface-600 hover:bg-surface-100"
            )}
            title={client.isActive ? "Deactivate" : "Activate"}
          >
            {client.isActive ? (
              <Power className="h-3.5 w-3.5" />
            ) : (
              <PowerOff className="h-3.5 w-3.5" />
            )}
          </button>
          {client.id !== "default" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(client);
              }}
              className="rounded-lg p-1.5 text-surface-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Delete client"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <Link
            href={`/admin/clients/${client.id}`}
            onClick={(e) => e.stopPropagation()}
            className="rounded-lg p-1.5 text-surface-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
            title="View Dashboard"
          >
            <BarChart3 className="h-3.5 w-3.5" />
          </Link>
          <ChevronRight className="h-4 w-4 text-surface-300 group-hover:text-primary-500 transition-colors" />
        </div>
      </div>
    </div>
  );
}

// ============ CLIENT DETAIL PANEL ============

function ClientDetailPanel({
  client,
  onClose,
  onRefresh,
}: {
  client: ClientWithMetrics;
  onClose: () => void;
  onRefresh: () => void;
}) {
  return (
    <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-6 sticky top-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl text-white font-bold text-lg"
            style={{ backgroundColor: client.primaryColor }}
          >
            {client.name
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
          </div>
          <div>
            <h3 className="text-base font-semibold text-surface-900 dark:text-surface-100">
              {client.name}
            </h3>
            <p className="text-sm text-surface-500">{client.company}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-1.5 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
        >
          <X className="h-4 w-4 text-surface-500" />
        </button>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-2 mb-5">
        <span
          className={clsx(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
            client.isActive
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
              : "bg-surface-100 text-surface-500 dark:bg-surface-800"
          )}
        >
          <span
            className={clsx(
              "h-1.5 w-1.5 rounded-full",
              client.isActive ? "bg-emerald-500" : "bg-surface-400"
            )}
          />
          {client.isActive ? "Active" : "Inactive"}
        </span>
        <span className="text-xs text-surface-400 font-mono">ID: {client.id.slice(0, 8)}...</span>
      </div>

      {/* Info */}
      <div className="space-y-3 mb-5">
        <div className="flex items-center gap-2 text-sm text-surface-600">
          <Mail className="h-3.5 w-3.5 text-surface-400" />
          {client.email || "No email"}
        </div>
        <div className="flex items-center gap-2 text-sm text-surface-600">
          <Globe className="h-3.5 w-3.5 text-surface-400" />
          <span className="font-mono">/book/{client.slug}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-surface-600">
          <Palette className="h-3.5 w-3.5 text-surface-400" />
          <span className="font-mono">{client.primaryColor}</span>
          <span
            className="inline-block h-4 w-4 rounded border border-surface-200"
            style={{ backgroundColor: client.primaryColor }}
          />
        </div>
        <div className="text-xs text-surface-400">
          Created: {new Date(client.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </div>

      {/* Metrics */}
      {client.metrics && (
        <div className="space-y-2 mb-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">
            Overview Metrics
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-surface-100 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/50 p-3">
              <p className="text-xs text-surface-500">Total Leads</p>
              <p className="text-lg font-bold text-surface-900 dark:text-surface-100">
                {client.metrics.totalLeads}
              </p>
            </div>
            <div className="rounded-lg border border-surface-100 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/50 p-3">
              <p className="text-xs text-surface-500">Appts Scheduled</p>
              <p className="text-lg font-bold text-surface-900 dark:text-surface-100">
                {client.metrics.appointmentsScheduled}
              </p>
            </div>
            <div className="rounded-lg border border-surface-100 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/50 p-3">
              <p className="text-xs text-surface-500">Appts Completed</p>
              <p className="text-lg font-bold text-surface-900 dark:text-surface-100">
                {client.metrics.appointmentsCompleted}
              </p>
            </div>
            <div className="rounded-lg border border-surface-100 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/50 p-3">
              <p className="text-xs text-surface-500">Appointments</p>

              <p className="text-2xl font-bold text-surface-900 dark:text-surface-100">
                {client.metrics.appointmentsScheduled}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">
          Quick Actions
        </p>
        <div className="flex flex-col gap-2">
          <a
            href={`/book/${client.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-surface-200 dark:border-surface-600 px-3 py-2 text-xs font-medium text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
            View Booking Page
            <ExternalLink className="h-3 w-3 ml-auto text-surface-400" />
          </a>
          <Link
            href={`/admin/clients/${client.id}`}
            className="flex items-center gap-2 rounded-lg border border-surface-200 dark:border-surface-600 px-3 py-2 text-xs font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Full Dashboard
            <ArrowRight className="h-3 w-3" />
          </Link>
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 rounded-lg border border-surface-200 dark:border-surface-600 px-3 py-2 text-xs font-medium text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
          >
            <Loader2 className="h-3.5 w-3.5" />
            Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ TOAST ============

function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={clsx(
        "fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl px-4 py-3 shadow-lg animate-slide-up",
        type === "success"
          ? "bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
          : "bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
      )}
    >
      {type === "success" ? (
        <CheckCircle2 className="h-4 w-4" />
      ) : (
        <AlertCircle className="h-4 w-4" />
      )}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 rounded-full p-0.5 hover:bg-black/5 dark:hover:bg-white/10">
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

// ============ MAIN COMPONENT ============

export default function AdminClientsPage() {
  const [clients, setClients] = useState<ClientWithMetrics[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientWithMetrics | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const loadClients = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/clients");
      const data = await res.json();
      if (Array.isArray(data)) {
        // Fetch detailed data for each client in parallel
        const detailed = await Promise.all(
          data.map(async (c: Client) => {
            try {
              const detailRes = await fetch(`/api/admin/clients/${c.id}`);
              if (detailRes.ok) {
                return await detailRes.json();
              }
            } catch {}
            return c;
          })
        );
        setClients(detailed);
      }
    } catch {
      setToast({ message: "Failed to load clients", type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const handleToggleActive = async (client: ClientWithMetrics) => {
    try {
      const res = await fetch(`/api/admin/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !client.isActive }),
      });
      if (res.ok) {
        setToast({
          message: `${client.name} ${client.isActive ? "deactivated" : "activated"}`,
          type: "success",
        });
        loadClients();
      }
    } catch {
      setToast({ message: "Failed to toggle client status", type: "error" });
    }
  };

  const filteredClients = clients.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.slug.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary-600" />
            <h2 className="text-2xl font-bold text-surface-900 dark:text-surface-100">
              Clients
            </h2>
            <span className="rounded-full bg-surface-100 dark:bg-surface-800 px-2.5 py-0.5 text-xs font-medium text-surface-500">
              {clients.length}
            </span>
          </div>
          <p className="text-sm text-surface-500 mt-1">
            Manage all client workspaces and their configurations
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition-all shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Add Client
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
        <input
          type="text"
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 py-2.5 pl-9 pr-3 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Client Grid */}
          <div className={clsx(selectedClient ? "lg:col-span-2" : "lg:col-span-3")}>
            {filteredClients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Building2 className="mb-3 h-12 w-12 text-surface-300 dark:text-surface-600" />
                <p className="text-sm font-medium text-surface-500">No clients found</p>
                <p className="text-xs text-surface-400 mt-1">
                  {search ? "Try a different search term" : "Click 'Add Client' to create your first client"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {filteredClients.map((client) => (
                  <ClientCard
                    key={client.id}
                    client={client}
                    onSelect={setSelectedClient}
                    onToggleActive={handleToggleActive}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Detail Panel */}
          {selectedClient && (
            <div className="lg:col-span-1">
              <ClientDetailPanel
                client={selectedClient}
                onClose={() => setSelectedClient(null)}
                onRefresh={loadClients}
              />
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <CreateClientModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            loadClients();
            setToast({ message: "Client created successfully", type: "success" });
          }}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          client={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            loadClients();
            setToast({ message: "Client deleted", type: "success" });
          }}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
