"use client";

import Link from "next/link";
import { ArrowLeft, Bot, ArrowRight } from "lucide-react";

export default function AgentPlaygroundPage() {
  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex items-center justify-center">
      <div className="max-w-md text-center space-y-6 p-8">
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg">
            <Bot className="h-10 w-10 text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">
          Interactive Playground Removed
        </h1>
        <p className="text-surface-500 leading-relaxed">
          The interactive agent playground has been replaced with a powerful 90-day Healy email sequence system.
          The system now focuses on automated email nurture sequences that provide genuine value and drive
          consultations through <strong>https://www.healycommunity.com</strong>.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row items-center justify-center">
          <Link
            href="/agents"
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition-all shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Agents
          </Link>
          <Link
            href="/leads"
            className="inline-flex items-center gap-2 rounded-lg border border-surface-200 px-5 py-2.5 text-sm font-medium text-surface-600 hover:bg-surface-50 dark:border-surface-600 dark:text-surface-400 dark:hover:bg-surface-800 transition-all"
          >
            View Leads
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
