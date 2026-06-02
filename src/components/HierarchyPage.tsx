"use client";

import { useState, useRef, useCallback } from "react";
import {
  TrendingUp,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Users,
  Target,
  Clock,
  ChevronDown,
  ChevronRight,
  Play,
  FileText,
  Search,
  Mail,
  ArrowRight,
  Globe,
  Sparkles,
} from "lucide-react";
import type { AgentType, AgentStatus } from "@/lib/agents/types";
import clsx from "clsx";

// ============ DEPARTMENT DEFINITIONS ============

interface SubAgentInfo {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  inputs: { label: string; key: string; type: "text" | "textarea" | "select"; options?: string[] }[];
}

interface DepartmentInfo {
  type: AgentType;
  name: string;
  title: string;
  description: string;
  icon: React.ElementType;
  gradient: string;
  color: string;
  bg: string;
  borderColor: string;
  stats: { label: string; value: string; icon: React.ElementType; color: string }[];
  subAgents: SubAgentInfo[];
}

const DEPARTMENTS: DepartmentInfo[] = [
  {
    type: "content",
    name: "Content",
    title: "AI Content Creator",
    description: "Create blog posts, social content, nurture emails, and landing pages for your business",
    icon: FileText,
    gradient: "from-emerald-500 to-teal-600",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    borderColor: "border-emerald-200",
    stats: [
      { label: "Content Types", value: "5", icon: FileText, color: "text-emerald-600" },
      { label: "Active", value: "Yes", icon: Target, color: "text-emerald-600" },
      { label: "Auto-Pilot", value: "On", icon: Sparkles, color: "text-emerald-600" },
    ],
    subAgents: [
      {
        id: "blog-writer", name: "Blog Writer", description: "Creates educational blog posts about frequency wellness",
        icon: FileText, color: "text-emerald-600",
        inputs: [
          { label: "Topic", key: "topic", type: "text" },
          { label: "Target Audience", key: "targetAudience", type: "text" },
          { label: "Key Points", key: "keyPoints", type: "textarea" },
          { label: "Tone", key: "tone", type: "select", options: ["Educational", "Inspirational", "Scientific", "Conversational"] },
        ],
      },
      {
        id: "email-creator", name: "Email Creator", description: "Writes nurture email sequences and outreach messages",
        icon: Mail, color: "text-emerald-600",
        inputs: [
          { label: "Topic", key: "topic", type: "text" },
          { label: "Target Audience", key: "targetAudience", type: "text" },
          { label: "Key Points", key: "keyPoints", type: "textarea" },
          { label: "Tone", key: "tone", type: "select", options: ["Warm", "Professional", "Friendly", "Educational"] },
        ],
      },
    ],
  },
  {
    type: "research",
    name: "Research",
    title: "Prospect Researcher",
    description: "Research prospects, analyze fit, and uncover partnership opportunities",
    icon: Search,
    gradient: "from-violet-500 to-purple-600",
    color: "text-violet-600",
    bg: "bg-violet-50",
    borderColor: "border-violet-200",
    stats: [
      { label: "Research Types", value: "4", icon: Search, color: "text-violet-600" },
      { label: "Active", value: "Yes", icon: Target, color: "text-violet-600" },
    ],
    subAgents: [
      {
        id: "prospect-analyzer", name: "Prospect Analyzer", description: "Analyzes prospects for fit and partnership potential",
        icon: Search, color: "text-violet-600",
        inputs: [
          { label: "Name / Company", key: "companyName", type: "text" },
          { label: "Industry", key: "industry", type: "text" },
          { label: "Role", key: "role", type: "text" },
          { label: "Location", key: "location", type: "text" },
        ],
      },
    ],
  },
  {
    type: "outreach",
    name: "Outreach",
    title: "Consultation Booker",
    description: "Generate personalized outreach messages, qualify leads, and schedule appointments",
    icon: Mail,
    gradient: "from-blue-500 to-cyan-600",
    color: "text-blue-600",
    bg: "bg-blue-50",
    borderColor: "border-blue-200",
    stats: [
      { label: "Channels", value: "4", icon: Mail, color: "text-blue-600" },
      { label: "Smart", value: "Yes", icon: Target, color: "text-blue-600" },
    ],
    subAgents: [
      {
        id: "message-generator", name: "Message Generator", description: "Generates personalized outreach for any channel",
        icon: Mail, color: "text-blue-600",
        inputs: [
          { label: "Prospect Name", key: "prospectName", type: "text" },
          { label: "Channel", key: "channel", type: "select", options: ["email", "whatsapp", "linkedin", "phone"] },
          { label: "Tone", key: "tone", type: "select", options: ["warm", "professional", "casual", "empathetic"] },
        ],
      },
    ],
  },
  {
    type: "sales",
    name: "Sales Team",
    title: "Sales Development",
    description: "Lead qualification, message personalization, appointment scheduling, and multi-step follow-up cadences",
    icon: TrendingUp,
    gradient: "from-amber-500 to-orange-600",
    color: "text-amber-600",
    bg: "bg-amber-50",
    borderColor: "border-amber-200",
    stats: [
      { label: "Qualified Today", value: "5", icon: CheckCircle2, color: "text-amber-600" },
      { label: "Appts. Booked", value: "2", icon: Target, color: "text-amber-600" },
      { label: "In Nurture", value: "8", icon: Users, color: "text-amber-600" },
    ],
    subAgents: [
      {
        id: "lead-qualifier", name: "Lead Qualifier", description: "Scores leads using BANT+ framework (Budget, Authority, Need, Timeline)",
        icon: CheckCircle2, color: "text-amber-600",
        inputs: [
          { label: "Lead Name", key: "leadName", type: "text" },
          { label: "Company", key: "leadCompany", type: "text" },
          { label: "Role", key: "leadRole", type: "text" },
          { label: "Persona", key: "personaType", type: "select", options: ["customer", "partner", "referral", "existing-client"] },
          { label: "Channel", key: "channel", type: "select", options: ["whatsapp", "email", "linkedin", "phone"] },
          { label: "Urgency", key: "urgency", type: "select", options: ["hot", "warm", "cold"] },
        ],
      },
      {
        id: "message-personalizer", name: "Message Specialist", description: "Crafts personalized outreach messages for any channel",
        icon: Mail, color: "text-amber-600",
        inputs: [
          { label: "Lead Name", key: "leadName", type: "text" },
          { label: "Company", key: "leadCompany", type: "text" },
          { label: "Role", key: "leadRole", type: "text" },
          { label: "Persona", key: "personaType", type: "select", options: ["customer", "partner", "referral", "existing-client"] },
          { label: "Channel", key: "channel", type: "select", options: ["whatsapp", "email", "linkedin", "phone"] },
          { label: "Urgency", key: "urgency", type: "select", options: ["hot", "warm", "cold"] },
        ],
      },
      {
        id: "appointment-scheduler", name: "Appt. Scheduler", description: "Suggests optimal consultation types and meeting structures",
        icon: Target, color: "text-amber-600",
        inputs: [
          { label: "Lead Name", key: "leadName", type: "text" },
          { label: "Company", key: "leadCompany", type: "text" },
          { label: "Role", key: "leadRole", type: "text" },
          { label: "Persona", key: "personaType", type: "select", options: ["customer", "partner", "referral", "existing-client"] },
          { label: "Channel", key: "channel", type: "select", options: ["whatsapp", "email", "linkedin", "phone"] },
          { label: "Urgency", key: "urgency", type: "select", options: ["hot", "warm", "cold"] },
        ],
      },
      {
        id: "followup-manager", name: "Follow-up Manager", description: "Designs multi-step nurture cadences over days/weeks",
        icon: Clock, color: "text-amber-600",
        inputs: [
          { label: "Lead Name", key: "leadName", type: "text" },
          { label: "Company", key: "leadCompany", type: "text" },
          { label: "Role", key: "leadRole", type: "text" },
          { label: "Persona", key: "personaType", type: "select", options: ["customer", "partner", "referral", "existing-client"] },
          { label: "Channel", key: "channel", type: "select", options: ["whatsapp", "email", "linkedin", "phone"] },
          { label: "Urgency", key: "urgency", type: "select", options: ["hot", "warm", "cold"] },
        ],
      },
    ],
  },
];

// ============ SUB-AGENT INPUT FORM ============

function SubAgentInputs({
  subAgent,
  values,
  onChange,
}: {
  subAgent: SubAgentInfo;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="space-y-2.5">
      {subAgent.inputs.map((input) => (
        <div key={input.key}>
          <label htmlFor={`hierarchy-input-${subAgent.id}-${input.key}`} className="block text-xs font-medium text-surface-600 mb-1">
            {input.label}
          </label>
          {input.type === "select" ? (
            <select
              id={`hierarchy-input-${subAgent.id}-${input.key}`}
              value={values[input.key] ?? ""}
              onChange={(e) => onChange(input.key, e.target.value)}
              className="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all"
            >
              <option value="">Select...</option>
              {input.options?.map((opt) => (
                <option key={opt} value={opt}>
                  {opt.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={`hierarchy-input-${subAgent.id}-${input.key}`}
              type="text"
              value={values[input.key] ?? ""}
              onChange={(e) => onChange(input.key, e.target.value)}
              placeholder={`Enter ${input.label.toLowerCase()}...`}
              className="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 placeholder-surface-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all"
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ============ RESULT DISPLAY ============

function DepartmentResult({ result }: { result: { output: string; metadata?: Record<string, unknown> } }) {
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(result.output);
  } catch {
    // Not JSON
  }

  if (!parsed) {
    return (
      <div className="rounded-lg bg-surface-50 p-4 max-h-60 overflow-y-auto">
        <pre className="text-sm text-surface-700 whitespace-pre-wrap font-sans leading-relaxed">
          {result.output}
        </pre>
      </div>
    );
  }

  // Show plan/tasks for CEO output
  if (parsed.prioritizedTasks || parsed.departments) {
    return (
      <div className="space-y-3">
        {!!parsed.executiveSummary && (
          <div>
            <p className="text-xs font-semibold text-surface-400 uppercase mb-1">Executive Summary</p>
            <p className="text-sm text-surface-700">{String(parsed.executiveSummary).slice(0, 300)}</p>
          </div>
        )}
        {Array.isArray(parsed.prioritizedTasks) && (
          <div>
            <p className="text-xs font-semibold text-surface-400 uppercase mb-2">Prioritized Tasks</p>
            <div className="space-y-1.5">
              {(parsed.prioritizedTasks as { task: string; department: string; priority: string }[]).slice(0, 6).map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-surface-700 bg-surface-50 rounded-lg px-3 py-2">
                  <span className={clsx("h-1.5 w-1.5 rounded-full flex-shrink-0", t.priority === "critical" ? "bg-red-400" : t.priority === "high" ? "bg-amber-400" : "bg-blue-400")} />
                  <span className="flex-1">{t.task}</span>
                  <span className="text-xs font-medium text-surface-400">{t.department}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Show budget/ROI for CFO output
  if (parsed.budgetAllocation || parsed.costPerLead) {
    return (
      <div className="space-y-3">
        {Array.isArray(parsed.budgetAllocation) && (
          <div>
            <p className="text-xs font-semibold text-surface-400 uppercase mb-2">Budget Allocation</p>
            {(parsed.budgetAllocation as { category: string; amount: number; percentage: number }[]).slice(0, 5).map((b, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-surface-700 mb-1.5">
                <span className="flex-1">{b.category}</span>
                <span className="font-medium">${b.amount.toLocaleString()}</span>
                <span className="text-xs text-surface-400">({b.percentage}%)</span>
              </div>
            ))}
          </div>
        )}
        {Array.isArray(parsed.recommendations) && (
          <div>
            <p className="text-xs font-semibold text-surface-400 uppercase mb-2">Recommendations</p>
            <ul className="space-y-1">
              {(parsed.recommendations as string[]).slice(0, 4).map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-surface-700">
                  <ArrowRight className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // Show prospects for Analyst output
  if (parsed.prospects || parsed.trends) {
    return (
      <div className="space-y-3">
        {Array.isArray(parsed.prospects) && (
          <div>
            <p className="text-xs font-semibold text-surface-400 uppercase mb-2">Discovered Prospects</p>
            <div className="space-y-1.5">
              {(parsed.prospects as { name: string; company: string; score?: number }[]).slice(0, 5).map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-surface-700 bg-surface-50 rounded-lg px-3 py-2">
                  <Users className="h-3.5 w-3.5 text-surface-400" />
                  <span className="font-medium">{p.name}</span>
                  <span className="text-surface-400">·</span>
                  <span>{p.company}</span>
                  {p.score && <span className="ml-auto text-xs font-medium text-blue-600">{p.score}/100</span>}
                </div>
              ))}
            </div>
          </div>
        )}
        {Array.isArray(parsed.trends) && (
          <div>
            <p className="text-xs font-semibold text-surface-400 uppercase mb-2">Market Trends</p>
            {(parsed.trends as { trend: string; impact: string }[]).slice(0, 4).map((t, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-surface-700 mb-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">{t.trend}</p>
                  <p className="text-xs text-surface-400">{t.impact}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Show design concepts
  if (parsed.concepts || parsed.videos) {
    return (
      <div className="space-y-3">
        {Array.isArray(parsed.concepts) && (
          <div>
            <p className="text-xs font-semibold text-surface-400 uppercase mb-2">Poster Concepts</p>
            {(parsed.concepts as { headline: string; visualDescription: string }[]).slice(0, 3).map((c, i) => (
              <div key={i} className="rounded-lg border border-surface-200 bg-white p-3 mb-2">
                <p className="text-sm font-semibold text-surface-900">{c.headline}</p>
                <p className="text-xs text-surface-500 mt-1 line-clamp-2">{c.visualDescription}</p>
              </div>
            ))}
          </div>
        )}
        {Array.isArray(parsed.videos) && (
          <div>
            <p className="text-xs font-semibold text-surface-400 uppercase mb-2">Video Concepts</p>
            {(parsed.videos as { title: string; format: string; hook: string }[]).slice(0, 2).map((v, i) => (
              <div key={i} className="rounded-lg border border-surface-200 bg-white p-3 mb-2">
                <div className="flex items-center gap-2 mb-1">                          <Sparkles className="h-3.5 w-3.5 text-pink-500" />
                  <p className="text-sm font-semibold text-surface-900">{v.title}</p>
                </div>
                <p className="text-xs text-surface-500">Format: {v.format} · Hook: {v.hook}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Show developer error fixes / health report
  if (parsed.fixSteps || parsed.issuesFound || parsed.vulnerabilities || parsed.categories || parsed.rootCause) {
    return (
      <div className="space-y-3">
        {!!parsed.issueSummary && (
          <div>
            <p className="text-xs font-semibold text-surface-400 uppercase mb-1">Issue Summary</p>
            <p className="text-sm text-surface-700">{String(parsed.issueSummary)}</p>
          </div>
        )}
        {!!parsed.rootCause && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-xs font-semibold text-red-600 uppercase mb-1">Root Cause</p>
            <p className="text-sm text-red-700">{String(parsed.rootCause)}</p>
          </div>
        )}
        {!!parsed.severity && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-surface-400 uppercase">Severity</span>
            <span className={clsx("text-xs font-medium px-2 py-0.5 rounded-full",
              parsed.severity === "critical" ? "bg-red-50 text-red-700" :
              parsed.severity === "high" ? "bg-amber-50 text-amber-700" :
              parsed.severity === "medium" ? "bg-blue-50 text-blue-700" : "bg-surface-50 text-surface-500"
            )}>
              {String(parsed.severity)}
            </span>
          </div>
        )}
        {Array.isArray(parsed.fixSteps) && (
          <div>
            <p className="text-xs font-semibold text-surface-400 uppercase mb-2">Fix Steps</p>
            {(parsed.fixSteps as { file: string; change: string; reasoning: string }[]).slice(0, 6).map((step, i) => (
              <div key={i} className="rounded-lg border border-surface-200 bg-white p-3 mb-2">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="h-3.5 w-3.5 text-cyan-500" />
                  <span className="text-sm font-mono font-medium text-surface-800">{step.file}</span>
                </div>
                <p className="text-xs text-surface-600 mb-1"><span className="font-medium">Change:</span> {step.change}</p>
                <p className="text-xs text-surface-400"><span className="font-medium">Why:</span> {step.reasoning}</p>
              </div>
            ))}
          </div>
        )}
        {Array.isArray(parsed.issuesFound) && (
          <div>
            <p className="text-xs font-semibold text-surface-400 uppercase mb-2">Issues Found</p>
            {(parsed.issuesFound as { file?: string; severity: string; explanation: string; suggestedFix?: string }[]).slice(0, 5).map((issue, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-surface-700 mb-2">
                <AlertCircle className={clsx("h-3.5 w-3.5 mt-0.5 flex-shrink-0",
                  issue.severity === "critical" ? "text-red-500" :
                  issue.severity === "major" ? "text-amber-500" : "text-blue-500"
                )} />
                <div>
                  <p className="text-xs">{issue.file && <span className="font-mono font-medium">{issue.file}: </span>}{issue.explanation}</p>
                  {issue.suggestedFix && <p className="text-xs text-surface-400 mt-0.5">Fix: {issue.suggestedFix}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
        {Array.isArray(parsed.vulnerabilities) && (
          <div>
            <p className="text-xs font-semibold text-surface-400 uppercase mb-2">Dependencies & Vulnerabilities</p>
            {(parsed.vulnerabilities as { package: string; current: string; recommended: string; severity: string; impact: string }[]).slice(0, 4).map((v, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-surface-700 mb-1.5">
                <FileText className="h-3.5 w-3.5 text-cyan-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs"><span className="font-medium">{v.package}</span>: {v.current} → {v.recommended}</p>
                  <p className="text-xs text-surface-400">{v.impact}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        {Array.isArray(parsed.recommendations) && (
          <div>
            <p className="text-xs font-semibold text-surface-400 uppercase mb-2">Recommendations</p>
            <ul className="space-y-1">
              {(parsed.recommendations as string[]).slice(0, 4).map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-surface-700">
                  <ArrowRight className="h-3.5 w-3.5 text-cyan-500 mt-0.5 flex-shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}
        {Array.isArray(parsed.categories) && (
          <div>
            <p className="text-xs font-semibold text-surface-400 uppercase mb-2">Health Categories</p>
            {(parsed.categories as { name: string; status: string; score: number; issues: string[] }[]).slice(0, 5).map((cat, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-surface-700 mb-1.5 bg-surface-50 rounded-lg px-3 py-2">
                <div className={clsx("h-2 w-2 rounded-full",
                  cat.status === "healthy" ? "bg-emerald-400" :
                  cat.status === "warning" ? "bg-amber-400" : "bg-red-400"
                )} />
                <span className="font-medium flex-1">{cat.name}</span>
                <span className="text-xs text-surface-400">{cat.score}/100</span>
              </div>
            ))}
          </div>
        )}
        {!!parsed.estimatedTimeMinutes && (
          <div className="text-xs text-surface-400">
            Estimated fix time: <span className="font-medium">{String(parsed.estimatedTimeMinutes)} minutes</span>
          </div>
        )}
      </div>
    );
  }

  // Show sales scoring/cadence
  if (parsed.overallScore !== undefined || parsed.cadence) {
    return (
      <div className="space-y-3">
        {parsed.overallScore !== undefined && (
          <div className="flex items-center gap-3">
            <p className="text-xs font-semibold text-surface-400 uppercase">Lead Score</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-surface-900">{Number(parsed.overallScore)}</span>
              <span className={clsx("text-xs font-medium px-2 py-0.5 rounded-full",
                Number(parsed.overallScore) >= 80 ? "bg-emerald-50 text-emerald-700" :
                Number(parsed.overallScore) >= 65 ? "bg-blue-50 text-blue-700" :
                Number(parsed.overallScore) >= 50 ? "bg-amber-50 text-amber-700" : "bg-surface-50 text-surface-500"
              )}>
                {String(parsed.category ?? "")}
              </span>
            </div>
          </div>
        )}
        {!!parsed.cadence && typeof parsed.cadence === "object" && Array.isArray((parsed.cadence as Record<string, unknown>).steps) && (
          <div>
            <p className="text-xs font-semibold text-surface-400 uppercase mb-2">Nurture Cadence</p>
            {((parsed.cadence as Record<string, unknown>).steps as { day: number; action: string; channel: string }[]).slice(0, 5).map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-surface-700 mb-1.5">
                <span className="text-xs font-mono text-surface-400 w-8">Day {s.day}</span>
                <span className="flex-1">{s.action}</span>
                <span className="text-xs text-surface-400 uppercase">{s.channel}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Fallback: show all parsed data
  return (
    <div className="rounded-lg bg-surface-50 p-4 max-h-60 overflow-y-auto">
      <pre className="text-sm text-surface-700 whitespace-pre-wrap font-mono leading-relaxed">
        {JSON.stringify(parsed, null, 2)}
      </pre>
    </div>
  );
}

// ============ MAIN PAGE ============

export default function HierarchyPage() {
  const [selectedDept, setSelectedDept] = useState<AgentType>("content");
  const [selectedSubAgent, setSelectedSubAgent] = useState<string>("");
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [result, setResult] = useState<{ output: string; metadata?: Record<string, unknown> } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const runningRef = useRef(false);

  const currentDept = DEPARTMENTS.find((d) => d.type === selectedDept)!;
  const currentSubAgent = currentDept?.subAgents.find((s) => s.id === selectedSubAgent);

  const handleInputChange = (key: string, value: string) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const handleRunSubAgent = useCallback(async () => {
    if (!selectedSubAgent || runningRef.current) return;
    runningRef.current = true;
    setStatus("running");
    setResult(null);
    setError(null);

    try {
      const defaultProvider = localStorage.getItem("DEFAULT_PROVIDER") || "openai";
      const storageKey = defaultProvider.toUpperCase() + "_API_KEY";
      const apiKey = localStorage.getItem(storageKey);
      const providerModel = localStorage.getItem(storageKey + "_MODEL") || "";
      const businessProfileStr = localStorage.getItem("BUSINESS_PROFILE");
      const businessProfile = businessProfileStr ? JSON.parse(businessProfileStr) : null;

      // Build the input based on the department type
      let agentInput: Record<string, unknown> = {};
      const context: Record<string, unknown> = { subAgent: selectedSubAgent, ...inputs };

      if (selectedDept === "sales") {
        agentInput = {
          leadName: inputs.leadName ?? "",
          leadCompany: inputs.leadCompany ?? "",
          leadRole: inputs.leadRole ?? "",
          personaType: inputs.personaType ?? "customer",
          channel: inputs.channel ?? "whatsapp",
          urgency: inputs.urgency ?? "warm",
        };
      } else if (selectedDept === "content") {
        agentInput = {
          topic: inputs.topic ?? "",
          contentType: "blog",
          targetAudience: inputs.targetAudience ?? "",
          keyPoints: (inputs.keyPoints ?? "").split("\n").filter(Boolean),
          tone: inputs.tone ?? "Educational",
        };
      } else if (selectedDept === "research") {
        agentInput = {
          companyName: inputs.companyName ?? "",
          industry: inputs.industry ?? "",
          role: inputs.role ?? "",
          location: inputs.location ?? "",
        };
      } else if (selectedDept === "outreach") {
        agentInput = {
          name: inputs.prospectName ?? "",
          company: inputs.prospectCompany ?? "",
          personaType: inputs.personaType ?? "customer",
        };
      } else {
        // scraper
        agentInput = {
          query: inputs.query ?? "",
          industry: inputs.industry ?? "",
          location: inputs.location ?? "",
          maxResults: parseInt(inputs.maxLeads ?? "10"),
        };
      }

      const body: Record<string, unknown> = {
        agentType: selectedDept,
        input: JSON.stringify(agentInput),
        context,
      };
      if (apiKey) body.apiKey = apiKey;
      if (defaultProvider !== "openai") body.provider = defaultProvider;
      if (providerModel) body.model = providerModel;
      if (businessProfile) body.businessProfile = businessProfile;

      const res = await fetch("/api/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.status === 429) {
        throw new Error("⏳ Too many requests. Please wait a moment and try again. (Rate limited)");
      }
      if (!res.ok) throw new Error(data.error ?? "Failed to run agent");

      setResult(data.result);
      setStatus("completed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    } finally {
      runningRef.current = false;
    }
  }, [selectedSubAgent, selectedDept, inputs]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-surface-900">AI Agents</h2>
        <p className="text-sm text-surface-500 mt-1">
          Your core AI agents — Content, Research, Outreach, Sales, and Scraper working in harmony
        </p>
      </div>

      {/* Department Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {DEPARTMENTS.map((dept) => {
          const isSelected = selectedDept === dept.type;
          const DeptIcon = dept.icon;
          return (
            <button
              key={dept.type}
              onClick={() => {
                setSelectedDept(dept.type);
                setSelectedSubAgent("");
                setResult(null);
                setError(null);
                setInputs({});
              }}
              className={clsx(
                "rounded-xl border p-4 text-left transition-all duration-200",
                isSelected
                  ? `${dept.borderColor} bg-white shadow-md ring-2 ring-primary-100`
                  : "border-surface-200 bg-white hover:border-surface-300 hover:shadow-sm"
              )}
            >
              <div className={clsx("flex h-10 w-10 items-center justify-center rounded-lg mb-3", dept.bg)}>
                <DeptIcon className={clsx("h-5 w-5", dept.color)} />
              </div>
              <h3 className="text-sm font-bold text-surface-900">{dept.name}</h3>
              <p className="text-xs text-surface-500 mt-0.5">{dept.title}</p>
              <div className="mt-3 space-y-1">
                {dept.stats.map((stat, i) => {
                  const StatIcon = stat.icon;
                  return (
                    <div key={i} className="flex items-center gap-1.5 text-xs">
                      <StatIcon className="h-3 w-3 text-surface-400" />
                      <span className="text-surface-600">{stat.label}: <span className="font-medium">{stat.value}</span></span>
                    </div>
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Department Panel */}
      {currentDept && (
        <div className="rounded-xl border border-surface-200 bg-white overflow-hidden">
          {/* Department Header */}
          <div className={clsx("bg-gradient-to-r px-6 py-4", currentDept.gradient)}>
            <div className="flex items-center gap-3">
              <currentDept.icon className="h-6 w-6 text-white" />
              <div>
                <h3 className="text-lg font-bold text-white">{currentDept.name} — {currentDept.title}</h3>
                <p className="text-sm text-white/80">{currentDept.description}</p>
              </div>
            </div>
            <div className="flex gap-4 mt-3">
              {currentDept.stats.map((stat, i) => {
                const StatIcon = stat.icon;
                return (
                  <div key={i} className="flex items-center gap-1.5 bg-white/20 rounded-lg px-3 py-1.5">
                    <StatIcon className="h-3.5 w-3.5 text-white" />
                    <span className="text-xs font-medium text-white">{stat.label}: {stat.value}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sub-Agents */}
          <div className="p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-surface-400 mb-4">
              Sub-Agents ({currentDept.subAgents.length})
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {currentDept.subAgents.map((sub) => {
                const isExpanded = expandedDept === sub.id;
                const SubIcon = sub.icon;
                return (
                  <div
                    key={sub.id}
                    className={clsx(
                      "rounded-xl border transition-all duration-200",
                      isExpanded ? "border-surface-300 shadow-sm" : "border-surface-200 hover:border-surface-300"
                    )}
                  >
                    <button
                      onClick={() => {
                        setExpandedDept(isExpanded ? null : sub.id);
                        setSelectedSubAgent(sub.id);
                        setResult(null);
                        setError(null);
                        setInputs({});
                      }}
                      className="w-full flex items-center gap-3 p-3 text-left"
                    >
                      <div className={clsx("flex h-8 w-8 items-center justify-center rounded-lg", currentDept.bg)}>
                        <SubIcon className={clsx("h-4 w-4", currentDept.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-surface-900">{sub.name}</p>
                        <p className="text-xs text-surface-500 line-clamp-1">{sub.description}</p>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-surface-400 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-surface-400 flex-shrink-0" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="border-t border-surface-200 p-4 space-y-3">
                        <SubAgentInputs
                          subAgent={sub}
                          values={inputs}
                          onChange={handleInputChange}
                        />
                        <button
                          onClick={handleRunSubAgent}
                          disabled={status === "running"}
                          className={clsx(
                            "inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-all duration-200",
                            status === "running"
                              ? "bg-surface-400 cursor-not-allowed"
                              : "bg-gradient-to-r shadow-sm hover:shadow-md active:scale-[0.98] " + currentDept.gradient
                          )}
                        >
                          {status === "running" ? (
                            <><Loader2 className="h-4 w-4 animate-spin" /> Running...</>
                          ) : (
                            <><Play className="h-4 w-4" /> Run Sub-Agent <ArrowRight className="h-4 w-4" /></>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Results Area */}
            {status === "completed" && result && (
              <div className="mt-6 rounded-xl border border-surface-200 bg-white p-5 animate-slide-up">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <h3 className="text-sm font-semibold text-surface-900">Output</h3>
                  <span className="ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    Completed
                  </span>
                </div>
                <DepartmentResult result={result} />
              </div>
            )}

            {status === "error" && error && (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5 animate-slide-up">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <h3 className="text-sm font-semibold text-red-700">Error</h3>
                </div>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
