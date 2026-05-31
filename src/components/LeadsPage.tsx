"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Phone,
  Mail,
  Calendar,
  ChevronRight,
  Star,
  Search,
  Clock,
  AlertCircle,
  UserCheck,
  Download,
  Upload,
  FileSpreadsheet,
  Loader2,
  X,
  MapPin,
  Zap,
  Snowflake,
  Sun,
  Flame,
  Layers,
} from "lucide-react";
import type { Lead, Appointment, LeadTemperature } from "@/lib/agents/types";
import GoogleMapsScrapeModal from "./GoogleMapsScrapeModal";
import PipelineAutoPilot from "./PipelineAutoPilot";
import MassScrapePanel from "./MassScrapePanel";
import clsx from "clsx";

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-50 text-blue-700",
  contacted: "bg-amber-50 text-amber-700",
  qualified: "bg-emerald-50 text-emerald-700",
  appointment_scheduled: "bg-violet-50 text-violet-700",
  closed: "bg-surface-100 text-surface-700",
  lost: "bg-red-50 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  appointment_scheduled: "Appt. Scheduled",
  closed: "Closed Won",
  lost: "Closed Lost",
};

const TEMPERATURE_COLORS: Record<LeadTemperature, string> = {
  cold: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  warm: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  hot: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
};

const TEMPERATURE_ICONS: Record<LeadTemperature, React.ElementType> = {
  cold: Snowflake,
  warm: Sun,
  hot: Flame,
};

const APPOINTMENT_STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-50 text-blue-700",
  completed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-700",
  no_show: "bg-amber-50 text-amber-700",
};

function TemperatureBadge({ temperature }: { temperature?: LeadTemperature }) {
  const temp = temperature ?? "cold";
  const Icon = TEMPERATURE_ICONS[temp];
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        TEMPERATURE_COLORS[temp]
      )}
    >
      <Icon className="h-3 w-3" />
      {temp}
    </span>
  );
}

function LeadRow({
  lead,
  onSelect,
  isSelected,
}: {
  lead: Lead;
  onSelect: (lead: Lead) => void;
  isSelected: boolean;
}) {
  const TempIcon = TEMPERATURE_ICONS[lead.temperature ?? "cold"];

  return (
    <div
      onClick={() => onSelect(lead)}
      className={clsx(
        "flex cursor-pointer items-center gap-4 rounded-lg border p-4 transition-all duration-200",
        isSelected
          ? "border-primary-200 bg-primary-50/50 shadow-sm"
          : "border-surface-200 bg-white hover:border-surface-300 hover:shadow-sm"
      )}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-100 text-surface-600 font-semibold text-xs">
        {lead.name
          .split(" ")
          .map((n) => n[0])
          .slice(0, 2)
          .join("")}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-surface-900">{lead.name}</p>
          <TemperatureBadge temperature={lead.temperature} />
        </div>
        <p className="text-xs text-surface-500 truncate">
          {lead.role} at {lead.company}
        </p>
      </div>
      <div className="hidden sm:block">
        <span
          className={clsx(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
            STATUS_COLORS[lead.status]
          )}
        >
          {STATUS_LABELS[lead.status]}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1">
          <Star className="h-3 w-3 text-amber-500" />
          <span className="text-xs font-medium text-amber-700">{lead.score}</span>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-surface-300" />
    </div>
  );
}

function LeadDetail({ lead }: { lead: Lead }) {
  const TempIcon = TEMPERATURE_ICONS[lead.temperature ?? "cold"];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-100 text-surface-600 font-bold text-sm">
          {lead.name
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-surface-900">{lead.name}</h3>
            <TemperatureBadge temperature={lead.temperature} />
          </div>
          <p className="text-sm text-surface-500">
            {lead.role} · {lead.company}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button className="flex items-center gap-2 rounded-lg border border-surface-200 bg-white px-3 py-2 text-xs font-medium text-surface-600 hover:bg-surface-50 transition-colors">
          <Mail className="h-3.5 w-3.5" />
          Send Email
        </button>
        <button className="flex items-center gap-2 rounded-lg border border-surface-200 bg-white px-3 py-2 text-xs font-medium text-surface-600 hover:bg-surface-50 transition-colors">
          <Calendar className="h-3.5 w-3.5" />
          Schedule
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">
          Contact Info
        </p>
        <div className="rounded-lg bg-surface-50 p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm text-surface-600">
            <Mail className="h-3.5 w-3.5 text-surface-400" />
            {lead.email}
          </div>
          {lead.phone && (
            <div className="flex items-center gap-2 text-sm text-surface-600">
              <Phone className="h-3.5 w-3.5 text-surface-400" />
              {lead.phone}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">
          Classification
        </p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-lg bg-surface-50 px-3 py-2">
            <TempIcon className={clsx(
              "h-4 w-4",
              (lead.temperature ?? "cold") === "cold" && "text-blue-500",
              lead.temperature === "warm" && "text-amber-500",
              lead.temperature === "hot" && "text-rose-500",
            )} />
            <span className="text-sm font-medium text-surface-700 capitalize">{lead.temperature ?? "cold"}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-surface-50 px-3 py-2">
            <Users className="h-4 w-4 text-surface-400" />
            <span className="text-sm text-surface-600">{lead.personaType}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">Notes</p>
        <p className="text-sm text-surface-600 bg-surface-50 rounded-lg p-3">
          {lead.notes || "No notes yet."}
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">
          Lead Score: {lead.score}
        </p>
        <div className="h-2 rounded-full bg-surface-200 overflow-hidden">
          <div
            className={clsx(
              "h-full rounded-full transition-all",
              lead.score >= 70 ? "bg-gradient-to-r from-amber-400 to-rose-500" :
              lead.score >= 40 ? "bg-gradient-to-r from-blue-400 to-amber-500" :
              "bg-gradient-to-r from-blue-400 to-blue-500"
            )}
            style={{ width: `${lead.score}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function AppointmentCard({ appointment }: { appointment: Appointment }) {
  return (
    <div className="rounded-lg border border-surface-200 bg-white p-4 transition-all hover:shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-sm font-semibold text-surface-900">
            {appointment.leadName}
          </p>
          <p className="text-xs text-surface-500">{appointment.leadCompany}</p>
        </div>
        <span
          className={clsx(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
            APPOINTMENT_STATUS_COLORS[appointment.status]
          )}
        >
          {appointment.status}
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs text-surface-500">
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {new Date(appointment.dateTime).toLocaleDateString()}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {new Date(appointment.dateTime).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        <span className="capitalize">{appointment.type}</span>
      </div>
      {appointment.notes && (
        <p className="text-xs text-surface-400 mt-2 line-clamp-1">{appointment.notes}</p>
      )}
    </div>
  );
}

function CSVImportModal({ onClose, onImport }: { onClose: () => void; onImport: (leads: Array<{name: string; company: string; role: string; email: string; phone?: string; status: string; score: number; notes: string; personaType: string}>) => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Array<Record<string, string>>>([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) {
        setError("CSV must have a header row and at least one data row");
        return;
      }
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const required = ["name", "email"];
      const missing = required.filter((r) => !headers.includes(r));
      if (missing.length > 0) {
        setError(`Missing required columns: ${missing.join(", ")}. Required: name, email`);
        return;
      }
      const rows = lines.slice(1).map((line) => {
        const vals = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
        const row: Record<string, string> = {};
        headers.forEach((h, i) => { row[h] = vals[i] ?? ""; });
        return row;
      });
      setPreview(rows.slice(0, 5));
    };
    reader.readAsText(f);
  };

  const handleImport = async () => {
    if (preview.length === 0) return;
    setImporting(true);
    setError(null);
    try {
      const leads = preview.map((row) => ({
        name: row.name || "Unknown",
        company: row.company || "",
        role: row.role || "",
        email: row.email || "",
        phone: row.phone || undefined,
        status: (row.status || "new") as string,
        score: parseInt(row.score || "50"),
        notes: row.notes || row.description || "",
        personaType: (row.persona || row.personatype || "customer") as string,
      }));
      await onImport(leads);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    }
    setImporting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-surface-200 bg-white dark:bg-surface-800 p-6 shadow-xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary-600" />
            <h3 className="text-base font-semibold text-surface-900">Import Leads from CSV</h3>
          </div>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-surface-100 dark:hover:bg-surface-700">
            <X className="h-4 w-4 text-surface-500" />
          </button>
        </div>

        <p className="text-xs text-surface-500 mb-4">
          Upload a CSV file with columns: <code className="rounded bg-surface-100 dark:bg-surface-700 px-1 py-0.5 font-mono text-surface-600">name</code>, <code className="rounded bg-surface-100 dark:bg-surface-700 px-1 py-0.5 font-mono text-surface-600">email</code>, <code className="rounded bg-surface-100 dark:bg-surface-700 px-1 py-0.5 font-mono text-surface-600">company</code>, <code className="rounded bg-surface-100 dark:bg-surface-700 px-1 py-0.5 font-mono text-surface-600">role</code>, <code className="rounded bg-surface-100 dark:bg-surface-700 px-1 py-0.5 font-mono text-surface-600">phone</code>, <code className="rounded bg-surface-100 dark:bg-surface-700 px-1 py-0.5 font-mono text-surface-600">score</code> (optional)
        </p>

        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-800/50 p-6 hover:border-primary-300 transition-colors">
          <FileSpreadsheet className="h-8 w-8 text-surface-400" />
          <span className="text-sm font-medium text-surface-600">
            {file ? file.name : "Click to select CSV file"}
          </span>
          <span className="text-xs text-surface-400">
            {file ? `${(file.size / 1024).toFixed(1)} KB` : "Supports .csv files"}
          </span>
          <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" name="csv-file" />
        </label>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {preview.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium text-surface-500 mb-2">Preview ({preview.length} rows)</p>
            <div className="space-y-1.5">
              {preview.map((row, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-surface-700 bg-surface-50 dark:bg-surface-800 rounded-lg px-3 py-2">
                  <Users className="h-3 w-3 text-surface-400 flex-shrink-0" />
                  <span className="font-medium">{row.name}</span>
                  <span className="text-surface-400">·</span>
                  <span className="text-surface-500">{row.email}</span>
                  {row.company && <><span className="text-surface-300">·</span><span>{row.company}</span></>}
                </div>
              ))}
            </div>

            <button
              onClick={handleImport}
              disabled={importing}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition-all disabled:bg-surface-400"
            >
              {importing ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Importing...</>
              ) : (
                <><Upload className="h-4 w-4" /> Import {preview.length} Lead{preview.length !== 1 ? "s" : ""}</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LeadsPage() {
  const [showAutoPilot, setShowAutoPilot] = useState(true);
  const [showMassScrape, setShowMassScrape] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [temperatureFilter, setTemperatureFilter] = useState<string>("all");
  const [view, setView] = useState<"leads" | "appointments">("leads");
  const [showImport, setShowImport] = useState(false);
  const [showMapsScrape, setShowMapsScrape] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [recomputingTemps, setRecomputingTemps] = useState(false);
  const [tempRecomputeResult, setTempRecomputeResult] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [leadsRes, aptsRes] = await Promise.all([
        fetch("/api/leads"),
        fetch("/api/appointments"),
      ]);
      if (leadsRes.ok) {
        const data = await leadsRes.json();
        setLeads(Array.isArray(data) ? data : []);
      } else {
        setLeads([]);
      }
      if (aptsRes.ok) {
        const data = await aptsRes.json();
        setAppointments(Array.isArray(data) ? data : []);
      } else {
        setAppointments([]);
      }
    } catch {
      setLeads([]);
      setAppointments([]);
    }
  }

  async function handleCSVImport(imported: Array<{name: string; company: string; role: string; email: string; phone?: string; status: string; score: number; notes: string; personaType: string}>) {
    let importedCount = 0;
    for (const lead of imported) {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: lead.name,
          company: lead.company,
          role: lead.role,
          email: lead.email,
          phone: lead.phone,
          status: lead.status || "new",
          score: lead.score || 50,
          notes: lead.notes || "Imported via CSV",
          personaType: lead.personaType || "customer",
          source: "csv_import",
          pipelineStage: "sourced",
        }),
      });
      if (res.ok) importedCount++;
    }
    setImportMessage(`Successfully imported ${importedCount} of ${imported.length} leads`);
    await loadData();
    setTimeout(() => setImportMessage(null), 3000);
  }

  async function handleMapsImport(imported: Array<{name: string; company: string; role: string; email: string; phone?: string; status: string; score: number; notes: string; personaType: string}>) {
    let importedCount = 0;
    for (const lead of imported) {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: lead.name,
          company: lead.company,
          role: lead.role,
          email: lead.email,
          phone: lead.phone,
          status: lead.status || "new",
          score: lead.score || 50,
          notes: lead.notes || "Scraped from Google Maps",
          personaType: lead.personaType || "customer",
          source: "google-maps",
          pipelineStage: "sourced",
        }),
      });
      if (res.ok) importedCount++;
    }
    setImportMessage(`Successfully imported ${importedCount} of ${imported.length} leads`);
    await loadData();
    setTimeout(() => setImportMessage(null), 3000);
  }

  async function recomputeTemperatures() {
    setRecomputingTemps(true);
    setTempRecomputeResult(null);
    try {
      const res = await fetch("/api/leads/recompute-temperatures", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setTempRecomputeResult(
          `✅ Updated ${data.updated} of ${data.totalLeads} leads — ❄️${data.breakdown.cold} ☀️${data.breakdown.warm} 🔥${data.breakdown.hot}`
        );
        // Reload to reflect changes
        setTimeout(() => loadData(), 500);
      } else {
        setTempRecomputeResult(`❌ Error: ${data.error}`);
      }
    } catch (e) {
      setTempRecomputeResult(`❌ Error: ${e instanceof Error ? e.message : "Unknown"}`);
    }
    setRecomputingTemps(false);
    setTimeout(() => setTempRecomputeResult(null), 8000);
  }

  async function exportToExcel() {
    try {
      const res = await fetch("/api/leads/export");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export failed:", e);
    }
  }

  // Temperature breakdown counts
  const coldCount = leads.filter((l) => (l.temperature ?? "cold") === "cold").length;
  const warmCount = leads.filter((l) => l.temperature === "warm").length;
  const hotCount = leads.filter((l) => l.temperature === "hot").length;

  const filteredLeads = leads.filter((l) => {
    const matchesSearch =
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.company.toLowerCase().includes(search.toLowerCase()) ||
      l.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || l.status === statusFilter;
    const matchesTemperature = temperatureFilter === "all" || (l.temperature ?? "cold") === temperatureFilter;
    return matchesSearch && matchesStatus && matchesTemperature;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-surface-900">Leads & Appointments</h2>
          <p className="text-sm text-surface-500 mt-1">
            Manage prospects, track outreach, and schedule meetings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 rounded-lg border border-surface-200 bg-white px-4 py-2 text-sm font-medium text-surface-600 hover:bg-surface-50 hover:border-surface-300 transition-all duration-200"
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </button>
          <button
            onClick={() => setShowMassScrape(!showMassScrape)}
            className={clsx(
              "flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-200",
              showMassScrape
                ? "bg-violet-50 text-violet-700 border-violet-200"
                : "border-surface-200 text-surface-600 hover:bg-surface-50"
            )}
          >
            <Layers className="h-4 w-4" />
            Mass Scrape
          </button>
          <button
            onClick={() => setShowAutoPilot(!showAutoPilot)}
            className={clsx(
              "flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-200",
              showAutoPilot
                ? "bg-primary-50 text-primary-700 border-primary-200"
                : "border-surface-200 text-surface-600 hover:bg-surface-50"
            )}
          >
            <Zap className="h-4 w-4" />
            Auto-Pilot
          </button>
          <button
            onClick={() => setShowMapsScrape(true)}
            className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-all duration-200"
          >
            <MapPin className="h-4 w-4" />
            Scrape from Maps
          </button>
          <button
            onClick={recomputeTemperatures}
            disabled={recomputingTemps}
            className="flex items-center gap-2 rounded-lg border border-surface-200 bg-white px-4 py-2 text-sm font-medium text-surface-600 hover:bg-surface-50 hover:border-surface-300 transition-all duration-200 disabled:opacity-50"
          >
            {recomputingTemps ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Flame className="h-4 w-4" />
            )}
            Recompute Temps
          </button>
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 rounded-lg border border-surface-200 bg-white px-4 py-2 text-sm font-medium text-surface-600 hover:bg-surface-50 hover:border-surface-300 transition-all duration-200"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Mass Scrape Panel */}
      {showMassScrape && <MassScrapePanel />}

      {/* Auto-Pilot */}
      {showAutoPilot && <PipelineAutoPilot />}

      {/* Temperature Recompute Result Toast */}
      {tempRecomputeResult && (
        <div className="flex items-center gap-2 rounded-lg bg-surface-50 border border-surface-200 px-4 py-2.5 text-xs text-surface-700 animate-fade-in">
          {tempRecomputeResult.startsWith("✅") ? (
            <Flame className="h-4 w-4 text-rose-500 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          )}
          {tempRecomputeResult}
        </div>
      )}

      {/* Temperature Summary Bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50/50 p-3">
          <Snowflake className="h-5 w-5 text-blue-600" />
          <div>
            <p className="text-lg font-bold text-blue-700">{coldCount}</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-blue-600">Cold</p>
          </div>
          <div className="flex-1 h-1.5 rounded-full bg-blue-200 overflow-hidden">
            <div className="h-full rounded-full bg-blue-500 transition-all" style={{width: `${leads.length > 0 ? (coldCount / leads.length) * 100 : 0}%`}} />
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3">
          <Sun className="h-5 w-5 text-amber-600" />
          <div>
            <p className="text-lg font-bold text-amber-700">{warmCount}</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-amber-600">Warm</p>
          </div>
          <div className="flex-1 h-1.5 rounded-full bg-amber-200 overflow-hidden">
            <div className="h-full rounded-full bg-amber-500 transition-all" style={{width: `${leads.length > 0 ? (warmCount / leads.length) * 100 : 0}%`}} />
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-rose-200 bg-rose-50/50 p-3">
          <Flame className="h-5 w-5 text-rose-600" />
          <div>
            <p className="text-lg font-bold text-rose-700">{hotCount}</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-rose-600">Hot</p>
          </div>
          <div className="flex-1 h-1.5 rounded-full bg-rose-200 overflow-hidden">
            <div className="h-full rounded-full bg-rose-500 transition-all" style={{width: `${leads.length > 0 ? (hotCount / leads.length) * 100 : 0}%`}} />
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setView("leads")}
          className={clsx(
            "rounded-lg px-4 py-2 text-sm font-medium transition-all",
            view === "leads"
              ? "bg-primary-50 text-primary-700 ring-1 ring-primary-200"
              : "text-surface-500 hover:bg-surface-50"
          )}
        >
          <Users className="inline h-4 w-4 mr-1.5" />
          Leads ({leads.length})
        </button>
        <button
          onClick={() => setView("appointments")}
          className={clsx(
            "rounded-lg px-4 py-2 text-sm font-medium transition-all",
            view === "appointments"
              ? "bg-primary-50 text-primary-700 ring-1 ring-primary-200"
              : "text-surface-500 hover:bg-surface-50"
          )}
        >
          <Calendar className="inline h-4 w-4 mr-1.5" />
          Appointments ({appointments.length})
        </button>
      </div>

      {view === "leads" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Lead List */}
          <div className={clsx("space-y-3", selectedLead ? "lg:col-span-2" : "lg:col-span-3")}>
            {/* Search & Filters */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />                  <input
                    type="text"
                    name="leads-search"
                    placeholder="Search leads..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Search leads"
                    className="w-full rounded-lg border border-surface-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
                  />
              </div>
              <div className="flex gap-2">
                {/* Temperature Filter */}                  <select
                    name="temperature-filter"
                    value={temperatureFilter}
                    onChange={(e) => setTemperatureFilter(e.target.value)}
                    aria-label="Filter by temperature"
                    className="rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
                >
                  <option value="all">All Temp</option>
                  <option value="cold">❄️ Cold</option>
                  <option value="warm">☀️ Warm</option>
                  <option value="hot">🔥 Hot</option>
                </select>
                {/* Status Filter */}                  <select
                    name="status-filter"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    aria-label="Filter by status"
                    className="rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
                >
                  <option value="all">All Status</option>
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="appointment_scheduled">Appt. Scheduled</option>
                  <option value="closed">Closed Won</option>
                  <option value="lost">Closed Lost</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              {filteredLeads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <UserCheck className="mb-3 h-10 w-10 text-surface-300" />
                  <p className="text-sm font-medium text-surface-500">No leads found</p>
                  <p className="text-xs text-surface-400 mt-1">
                    Use Mass Scrape to find thousands of targeted businesses, or the Research Agent to find leads
                  </p>
                </div>
              ) : (
                filteredLeads.map((lead) => (
                  <LeadRow
                    key={lead.id}
                    lead={lead}
                    onSelect={setSelectedLead}
                    isSelected={selectedLead?.id === lead.id}
                  />
                ))
              )}
            </div>
          </div>

          {/* Lead Detail */}
          {selectedLead && (
            <div className="lg:col-span-1">
              <div className="rounded-xl border border-surface-200 bg-white p-5 sticky top-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-surface-900">Lead Details</h3>
                  <button
                    onClick={() => setSelectedLead(null)}
                    className="text-xs text-surface-400 hover:text-surface-600"
                  >
                    Close
                  </button>
                </div>
                <LeadDetail lead={selectedLead} />
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Appointments View */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {appointments.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
              <Calendar className="mb-3 h-10 w-10 text-surface-300" />
              <p className="text-sm font-medium text-surface-500">No appointments scheduled</p>
              <p className="text-xs text-surface-400 mt-1">
                Use the Sales Outreach Agent to start booking meetings
              </p>
            </div>
          ) : (
            appointments.map((apt) => (
              <AppointmentCard key={apt.id} appointment={apt} />
            ))
          )}
        </div>
      )}

      {/* CSV Import Modal */}
      {showImport && (
        <CSVImportModal
          onClose={() => setShowImport(false)}
          onImport={handleCSVImport}
        />
      )}

      {/* Google Maps Scrape Modal */}
      {showMapsScrape && (
        <GoogleMapsScrapeModal
          onClose={() => setShowMapsScrape(false)}
          onImport={handleMapsImport}
        />
      )}
    </div>
  );
}
