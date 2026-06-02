"use client";

import { useState } from "react";
import {
  FileText,
  Search,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ArrowRight,
  Mail,
  TrendingUp,
  Globe,
} from "lucide-react";
import type { AgentType, AgentStatus } from "@/lib/agents/types";
import clsx from "clsx";

interface AgentInfo {
  type: AgentType;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  gradient: string;
  inputs: { label: string; key: string; type: "text" | "textarea" | "select"; options?: string[] }[];
}

const AGENTS: AgentInfo[] = [
  {
    type: "content",
    name: "AI Content Creator",
    description: "Create blog posts, social content, nurture emails, and landing pages for your business",
    icon: FileText,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    gradient: "from-emerald-500 to-teal-600",
    inputs: [
      { label: "Topic", key: "topic", type: "text" },
      {
        label: "Content Type",
        key: "contentType",
        type: "select",
        options: ["blog", "social", "email", "landing", "ad"],
      },
      { label: "Target Audience", key: "targetAudience", type: "text" },
      { label: "Key Points (one per line)", key: "keyPoints", type: "textarea" },
      {
        label: "Tone",
        key: "tone",
        type: "select",
        options: ["Warm & Educational", "Inspirational", "Scientific", "Conversational", "Empathetic"],
      },
      {
        label: "Length",
        key: "length",
        type: "select",
        options: ["short", "medium", "long"],
      },
      { label: "Keywords (comma separated)", key: "keywords", type: "text" },
    ],
  },
  {
    type: "research",
    name: "Prospect Researcher",
    description: "Research and analyze prospects, find ideal customers, and uncover partnership opportunities",
    icon: Search,
    color: "text-violet-600",
    bg: "bg-violet-50",
    gradient: "from-violet-500 to-purple-600",
    inputs: [
      {
        label: "Research Focus",
        key: "researchType",
        type: "select",
        options: ["ideal-customer", "partner", "competitor", "market"],
      },
      { label: "Name / Company", key: "companyName", type: "text" },
      { label: "Industry / Niche", key: "industry", type: "text" },
      { label: "Role / Title", key: "role", type: "text" },
      { label: "Location", key: "location", type: "text" },
      { label: "Website / Social Profile", key: "website", type: "text" },
    ],
  },    {
    type: "outreach",
    name: "AI Outreach Specialist",
    description: "Generate personalized outreach messages, qualify leads, and schedule appointments across any channel",
    icon: Mail,
    color: "text-amber-600",
    bg: "bg-amber-50",
    gradient: "from-amber-500 to-orange-600",
    inputs: [
      {
        label: "Action",
        key: "action",
        type: "select",
        options: ["generate_message", "qualify_lead", "suggest_appointment"],
      },
      { label: "Prospect Name", key: "prospectName", type: "text" },
      {
        label: "Persona",
        key: "personaType",
        type: "select",
        options: ["customer", "partner", "referral", "existing-client"],
      },
      { label: "Company / Context", key: "prospectCompany", type: "text" },
      { label: "Role / Interest", key: "prospectRole", type: "text" },
      {
        label: "Channel",
        key: "channel",
        type: "select",
        options: ["whatsapp", "email", "linkedin", "phone"],
      },
      {
        label: "Tone",
        key: "tone",
        type: "select",
        options: ["warm", "professional", "casual", "empathetic"],
      },
    ],
  },
  {
    type: "sales",
    name: "AI Sales Team",
    description: "Lead qualification, message personalization, appointment scheduling, and follow-up cadences",
    icon: TrendingUp,
    color: "text-amber-600",
    bg: "bg-amber-50",
    gradient: "from-amber-500 to-orange-600",
    inputs: [
      { label: "Lead Name", key: "leadName", type: "text" },
      { label: "Company", key: "leadCompany", type: "text" },
      { label: "Role", key: "leadRole", type: "text" },
      { label: "Persona", key: "personaType", type: "select", options: ["wellness-seeker", "practitioner", "biohacker", "business-builder"] },
      { label: "Channel", key: "channel", type: "select", options: ["whatsapp", "email", "linkedin", "phone"] },
      { label: "Urgency", key: "urgency", type: "select", options: ["hot", "warm", "cold"] },
    ],
  },
  {
    type: "scraper",
    name: "Lead Scraper",
    description: "Scrape directories and sources for high-quality prospect leads with contact info",
    icon: Globe,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    gradient: "from-indigo-500 to-purple-600",
    inputs: [
      { label: "Search Query", key: "query", type: "text" },
      { label: "Source Type", key: "sourceType", type: "select", options: ["directory", "apollo", "linkedin"] },
      { label: "Industry / Niche", key: "industry", type: "text" },
      { label: "Location", key: "location", type: "text" },
      { label: "Role / Title", key: "role", type: "text" },
      { label: "Max Leads", key: "maxLeads", type: "text" },
    ],
  },
];

function AgentInputs({
  agent,
  values,
  onChange,
}: {
  agent: AgentInfo;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="space-y-3">
      {agent.inputs.map((input) => (
        <div key={input.key}>
          <label htmlFor={`agent-input-${agent.type}-${input.key}`} className="block text-xs font-medium text-surface-600 mb-1.5">
            {input.label}
          </label>
          {input.type === "select" ? (
            <select
              id={`agent-input-${agent.type}-${input.key}`}
              value={values[input.key] ?? ""}
              onChange={(e) => onChange(input.key, e.target.value)}
              className="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 placeholder-surface-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all"
            >
              <option value="">Select {input.label.toLowerCase()}...</option>
              {input.options?.map((opt) => (
                <option key={opt} value={opt}>
                  {opt.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                </option>
              ))}
            </select>
          ) : input.type === "textarea" ? (
            <textarea
              id={`agent-input-${agent.type}-${input.key}`}
              value={values[input.key] ?? ""}
              onChange={(e) => onChange(input.key, e.target.value)}
              placeholder={`Enter ${input.label.toLowerCase()}...`}
              rows={4}
              className="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 placeholder-surface-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all resize-vertical"
            />
          ) : (
            <input
              type={input.type}
              id={`agent-input-${agent.type}-${input.key}`}
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

function AgentResult({ result }: { result: { output: string; metadata?: Record<string, unknown> } }) {
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(result.output);
  } catch {
    // Not JSON, display as-is
  }

  if (!parsed) {
    return (
      <div className="rounded-lg bg-surface-50 p-4">
        <pre className="text-sm text-surface-700 whitespace-pre-wrap font-mono leading-relaxed">
          {result.output}
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!!parsed.title && (
        <h4 className="font-semibold text-surface-900">{String(parsed.title)}</h4>
      )}
      {!!parsed.excerpt && (
        <p className="text-sm text-surface-600 italic">{String(parsed.excerpt)}</p>
      )}
      {!!parsed.summary && (
        <p className="text-sm text-surface-600">{String(parsed.summary)}</p>
      )}
      {Array.isArray(parsed.painPoints) && (
        <div>
          <p className="text-xs font-semibold text-surface-500 uppercase mb-2">Pain Points</p>
          <ul className="space-y-1">
            {(parsed.painPoints as string[]).slice(0, 5).map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-surface-700">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-400" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}
      {Array.isArray(parsed.opportunities) && (
        <div>
          <p className="text-xs font-semibold text-surface-500 uppercase mb-2">Engagement Opportunities</p>
          <ul className="space-y-1">
            {(parsed.opportunities as string[]).slice(0, 5).map((o, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-surface-700">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
                {o}
              </li>
            ))}
          </ul>
        </div>
      )}
      {Array.isArray(parsed.keyInsights) && (
        <div>
          <p className="text-xs font-semibold text-surface-500 uppercase mb-2">Key Insights</p>
          <ul className="space-y-1">
            {(parsed.keyInsights as string[]).slice(0, 5).map((k, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-surface-700">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-violet-400" />
                {k}
              </li>
            ))}
          </ul>
        </div>
      )}
      {!!parsed.body && (
        <div className="rounded-lg bg-surface-50 p-4 max-h-96 overflow-y-auto">
          <pre className="text-sm text-surface-700 whitespace-pre-wrap font-sans leading-relaxed">
            {String(parsed.body)}
          </pre>
        </div>
      )}
      {!!parsed.subject && (
        <div className="rounded-lg border border-surface-200 bg-white p-4">
          <div className="mb-2">
            <span className="text-xs font-medium text-surface-400">Subject:</span>
            <p className="text-sm font-medium text-surface-900 mt-0.5">{String(parsed.subject)}</p>
          </div>
          <div>
            <span className="text-xs font-medium text-surface-400">Body:</span>
            <p className="text-sm text-surface-700 mt-0.5 whitespace-pre-wrap">{String(parsed.body)}</p>
          </div>
          {!!parsed.callToAction && (
            <div className="mt-3 rounded-lg bg-primary-50 px-3 py-2">
              <span className="text-xs font-medium text-primary-700">CTA: {String(parsed.callToAction)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState<AgentType>("content");
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [result, setResult] = useState<{
    output: string;
    metadata?: Record<string, unknown>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentAgent = AGENTS.find((a) => a.type === selectedAgent)!;

  const handleInputChange = (key: string, value: string) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const handleRunAgent = async () => {
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

      // Build structured input based on agent type
      let agentInput: Record<string, unknown> = { ...inputs };
      const context: Record<string, unknown> = { ...inputs };

      switch (selectedAgent) {
        case "content": {
          agentInput = {
            topic: inputs.topic ?? "",
            contentType: inputs.contentType ?? "blog",
            targetAudience: inputs.targetAudience ?? "",
            keyPoints: (inputs.keyPoints ?? "").split("\n").map((s) => s.trim()).filter(Boolean),
            tone: inputs.tone ?? "",
            length: (inputs.length ?? "medium") as "short" | "medium" | "long",
            keywords: (inputs.keywords ?? "").split(",").map((s) => s.trim()).filter(Boolean),
          };
          break;
        }
        case "research": {
          agentInput = {
            companyName: inputs.companyName ?? "",
            industry: inputs.industry ?? "",
            role: inputs.role ?? "",
            location: inputs.location ?? "",
            website: inputs.website ?? "",
          };
          context.researchType = inputs.researchType ?? "ideal-customer";
          break;
        }
        case "outreach": {
          agentInput = {
            name: inputs.prospectName ?? "",
            company: inputs.prospectCompany ?? "",
            role: inputs.prospectRole ?? "",
            personaType: inputs.personaType ?? "customer",
          };
          context.action = inputs.action ?? "generate_message";
          context.channel = inputs.channel ?? "email";
          context.tone = inputs.tone ?? "warm";
          break;
        }
        case "sales": {
          agentInput = {
            leadName: inputs.leadName ?? "",
            leadCompany: inputs.leadCompany ?? "",
            leadRole: inputs.leadRole ?? "",
            personaType: (inputs.personaType ?? "customer") as "wellness-seeker" | "practitioner" | "biohacker" | "business-builder",
            channel: (inputs.channel ?? "whatsapp") as "whatsapp" | "email" | "linkedin" | "phone",
            urgency: (inputs.urgency ?? "warm") as "hot" | "warm" | "cold",
          };
          break;
        }
        case "scraper": {
          agentInput = {
            type: (inputs.sourceType ?? "directory") as "directory" | "apollo" | "linkedin",
            query: inputs.query ?? "",
            industry: inputs.industry ?? "",
            location: inputs.location ?? "",
            role: inputs.role ?? "",
            maxResults: parseInt(inputs.maxLeads ?? "5"),
          };
          break;
        }
      }

      const body: Record<string, unknown> = {
        agentType: selectedAgent,
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
      if (!res.ok) throw new Error(data.error ?? "Failed to run agent");

      setResult(data.result);
      setStatus("completed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-surface-900">AI Agents</h2>
        <p className="text-sm text-surface-500 mt-1">
          Run AI-powered agents for content creation, prospect research, and sales outreach
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Agent Selection */}
        <div className="lg:col-span-1 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">
            Select an Agent
          </p>
          {AGENTS.map((agent) => {
            const isSelected = selectedAgent === agent.type;
            const Icon = agent.icon;

            return (
              <button
                key={agent.type}
                onClick={() => {
                  setSelectedAgent(agent.type);
                  setResult(null);
                  setError(null);
                  setInputs({});
                }}
                className={clsx(
                  "w-full rounded-xl border p-4 text-left transition-all duration-200",
                  isSelected
                    ? "border-surface-300 bg-white shadow-sm ring-2 ring-primary-100"
                    : "border-surface-200 bg-white hover:border-surface-300 hover:shadow-sm"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={clsx(
                      "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                      isSelected ? agent.bg : "bg-surface-50"
                    )}
                  >
                    <Icon className={clsx("h-5 w-5", agent.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-surface-900">{agent.name}</p>
                    <p className="text-xs text-surface-500 line-clamp-2">{agent.description}</p>
                  </div>
                  <ChevronRight
                    className={clsx(
                      "h-4 w-4 transition-all",
                      isSelected ? "text-surface-400 rotate-90" : "text-surface-300"
                    )}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Agent Input Panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Active Agent Header */}
          <div className="rounded-xl border border-surface-200 bg-white p-5">
            <div className="flex items-center gap-3 mb-4">
              <div
                className={clsx(
                  "flex h-10 w-10 items-center justify-center rounded-lg",
                  currentAgent.bg
                )}
              >
                <currentAgent.icon className={clsx("h-5 w-5", currentAgent.color)} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-surface-900">{currentAgent.name}</h3>
                <p className="text-xs text-surface-500">{currentAgent.description}</p>
              </div>
            </div>

            <AgentInputs agent={currentAgent} values={inputs} onChange={handleInputChange} />

            <button
              onClick={handleRunAgent}
              disabled={status === "running"}
              className={clsx(
                "mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-all duration-200",
                status === "running"
                  ? "bg-surface-400 cursor-not-allowed"
                  : "bg-gradient-to-r shadow-sm hover:shadow-md active:scale-[0.98] " +
                      currentAgent.gradient
              )}
            >
              {status === "running" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Run Agent
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>

          {/* Results */}
          {status === "completed" && result && (
            <div className="rounded-xl border border-surface-200 bg-white p-5 animate-slide-up">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-semibold text-surface-900">Result</h3>
                <span className="ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  Completed
                </span>
              </div>
              <AgentResult result={result} />
            </div>
          )}

          {/* Error */}
          {status === "error" && error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5 animate-slide-up">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <h3 className="text-sm font-semibold text-red-700">Error</h3>
              </div>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
