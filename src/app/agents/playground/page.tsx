"use client";

import { useState, useCallback } from "react";
import {
  Bot,
  Sparkles,
  History,
  Trash2,
  Download,
  Clock,
  Zap,
  Activity,
  ArrowLeft,
} from "lucide-react";
import clsx from "clsx";
import InteractiveAgentDemo from "@/components/InteractiveAgentDemo";
import Link from "next/link";

// ============ RUN HISTORY ============

interface RunRecord {
  id: string;
  agentId: string;
  agentName: string;
  durationMs: number;
  tokenCount: number;
  timestamp: Date;
}

export default function AgentPlaygroundPage() {
  const [runHistory, setRunHistory] = useState<RunRecord[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  const handleRunComplete = useCallback(
    (agentId: string, durationMs: number, tokenCount: number) => {
      const agentNames: Record<string, string> = {
        content: "Content Creator",
        sales: "Sales Team",
        ceo: "CEO Strategist",
        cfo: "CFO Analyst",
        research: "Prospect Researcher",
        design: "Design Team",
        developer: "AI Developer",
        outreach: "Consultation Booker",
        scraper: "Lead Scraper",
        analyst: "Data Analyst",
      };
      const record: RunRecord = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        agentId,
        agentName: agentNames[agentId] ?? agentId,
        durationMs,
        tokenCount,
        timestamp: new Date(),
      };
      setRunHistory((prev) => [record, ...prev].slice(0, 50));
    },
    []
  );

  const clearHistory = () => setRunHistory([]);

  const downloadHistory = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          runHistory.map((r) => ({
            agent: r.agentName,
            durationMs: r.durationMs,
            tokens: r.tokenCount,
            timestamp: r.timestamp.toISOString(),
          })),
          null,
          2
        ),
      ],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "agent-run-history.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalTokens = runHistory.reduce((sum, r) => sum + r.tokenCount, 0);
  const totalCost = parseFloat((totalTokens * 0.00015).toFixed(4));

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      {/* Top bar */}
      <div className="sticky top-0 z-40 border-b border-surface-200 bg-white/80 backdrop-blur-md dark:border-surface-700 dark:bg-surface-900/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/agents"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-surface-200 text-surface-500 hover:bg-surface-50 hover:text-surface-700 dark:border-surface-600 dark:hover:bg-surface-800 dark:hover:text-surface-300"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 shadow-sm">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-surface-900 dark:text-surface-100">
                  Agent Playground
                </h1>
                <p className="text-xs text-surface-400">
                  Run all 10 AI agents interactively
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Session stats */}
            {runHistory.length > 0 && (
              <div className="hidden items-center gap-3 rounded-lg bg-surface-50 px-3 py-1.5 text-[11px] text-surface-500 sm:flex dark:bg-surface-800">
                <span className="inline-flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  {runHistory.length} runs
                </span>
                <span className="inline-flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  {totalTokens} tokens
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="font-medium text-primary-600 dark:text-primary-400">
                    ${totalCost}
                  </span>
                </span>
              </div>
            )}

            {/* History toggle */}
            <button
              onClick={() => setHistoryOpen(!historyOpen)}
              className={clsx(
                "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                historyOpen
                  ? "border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-700 dark:bg-primary-900/20 dark:text-primary-400"
                  : "border-surface-200 text-surface-600 hover:bg-surface-50 dark:border-surface-600 dark:text-surface-400 dark:hover:bg-surface-800"
              )}
            >
              <History className="h-3.5 w-3.5" />
              History
              {runHistory.length > 0 && (
                <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-500 px-1 text-[9px] font-bold text-white">
                  {runHistory.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* History panel */}
      {historyOpen && (
        <div className="border-b border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-900">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
                Run History
              </h2>
              <div className="flex items-center gap-2">
                {runHistory.length > 0 && (
                  <>
                    <button
                      onClick={downloadHistory}
                      className="flex items-center gap-1 rounded-lg border border-surface-200 px-2.5 py-1 text-[10px] font-medium text-surface-500 hover:bg-surface-50 dark:border-surface-600 dark:hover:bg-surface-800"
                    >
                      <Download className="h-3 w-3" />
                      Export
                    </button>
                    <button
                      onClick={clearHistory}
                      className="flex items-center gap-1 rounded-lg border border-surface-200 px-2.5 py-1 text-[10px] font-medium text-red-500 hover:bg-red-50 dark:border-surface-600 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-3 w-3" />
                      Clear
                    </button>
                  </>
                )}
                <button
                  onClick={() => setHistoryOpen(false)}
                  className="rounded-lg px-2.5 py-1 text-[10px] font-medium text-surface-400 hover:text-surface-600"
                >
                  Close
                </button>
              </div>
            </div>

            {runHistory.length === 0 ? (
              <div className="rounded-lg border border-dashed border-surface-200 p-8 text-center dark:border-surface-700">
                <History className="mx-auto h-6 w-6 text-surface-300 dark:text-surface-600" />
                <p className="mt-2 text-sm text-surface-400">
                  No runs yet. Select an agent and click <strong>Run Agent</strong> to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {runHistory.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 rounded-lg border border-surface-100 bg-surface-50 px-3 py-2 text-xs dark:border-surface-700 dark:bg-surface-800"
                  >
                    <Bot className="h-3.5 w-3.5 text-primary-500" />
                    <span className="font-medium text-surface-700 dark:text-surface-300">
                      {r.agentName}
                    </span>
                    <span className="text-surface-400">·</span>
                    <span className="inline-flex items-center gap-1 text-surface-400">
                      <Clock className="h-3 w-3" />
                      {(r.durationMs / 1000).toFixed(1)}s
                    </span>
                    <span className="text-surface-400">·</span>
                    <span className="text-surface-400">{r.tokenCount} tokens</span>
                    <span className="ml-auto text-[10px] text-surface-400">
                      {r.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {runHistory.length > 0 && (
              <div className="mt-3 flex items-center gap-4 text-[10px] text-surface-400">
                <span>
                  Total runs: <strong className="text-surface-600">{runHistory.length}</strong>
                </span>
                <span>
                  Total tokens: <strong className="text-surface-600">{totalTokens.toLocaleString()}</strong>
                </span>
                <span>
                  Estimated cost: <strong className="text-primary-600">${totalCost}</strong>
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary-500 to-primary-700 px-3 py-1 text-[11px] font-medium text-white shadow-sm">
              <Zap className="h-3 w-3" />
              Interactive Demo
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-200 px-3 py-1 text-[11px] font-medium text-surface-500 dark:bg-surface-700 dark:text-surface-400">
              <Bot className="h-3 w-3" />
              10 Agents
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-200 px-3 py-1 text-[11px] font-medium text-surface-500 dark:bg-surface-700 dark:text-surface-400">
              <Sparkles className="h-3 w-3" />
              GPT-4o Mini
            </span>
          </div>
          <p className="text-sm text-surface-400">
            Select an agent type, configure the inputs, and run it to see simulated AI-generated output with
            typing animation, token metrics, and cost tracking. All agents reflect the real agent architecture
            behind the MarketAI platform.
          </p>
        </div>

        {/* The interactive demo — full width */}
        <InteractiveAgentDemo fullWidth onRunComplete={handleRunComplete} />

        {/* Tips section */}
        <div className="mt-8 rounded-xl border border-surface-200 bg-white p-5 dark:border-surface-700 dark:bg-surface-800">
          <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-3">
            About the Agent System
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Autonomous & Specialized",
                desc: "Each agent has a focused role — Content, Sales, CEO, CFO, Research, Design, Developer, Outreach, Scraper, Analyst — with structured input schemas.",
              },
              {
                title: "Pipeline Orchestration",
                desc: "Agents can be chained together: CEO strategizes → Content creates → Outreach engages → Sales closes, with context flowing between steps.",
              },
              {
                title: "Multi-Provider LLM",
                desc: "Supports OpenAI, Gemini, Claude, and OpenRouter. Each agent routes to the optimal model based on task complexity and cost requirements.",
              },
              {
                title: "Real Execution Logs",
                desc: "Every run is tracked with duration, token count, and cost. Export run history as JSON for analysis and optimization.",
              },
            ].map((tip) => (
              <div key={tip.title} className="rounded-lg border border-surface-100 bg-surface-50 p-3 dark:border-surface-700 dark:bg-surface-800/50">
                <h4 className="text-xs font-semibold text-surface-900 dark:text-surface-100 mb-1">
                  {tip.title}
                </h4>
                <p className="text-[11px] text-surface-500 leading-relaxed">{tip.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
