"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  Clock,
  Hash,
  ExternalLink,
  Search,
  Filter,
  BookOpen,
  MessageSquare,
  Mail,
  Globe,
  Megaphone,
} from "lucide-react";
import type { ContentResult } from "@/lib/agents/types";
import clsx from "clsx";

const TYPE_ICONS: Record<string, React.ElementType> = {
  blog: BookOpen,
  social: MessageSquare,
  email: Mail,
  landing: Globe,
  ad: Megaphone,
};

const TYPE_COLORS: Record<string, string> = {
  blog: "text-blue-600 bg-blue-50",
  social: "text-violet-600 bg-violet-50",
  email: "text-amber-600 bg-amber-50",
  landing: "text-emerald-600 bg-emerald-50",
  ad: "text-rose-600 bg-rose-50",
};

export default function ContentLibrary() {
  const [content, setContent] = useState<(ContentResult & { type?: string })[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    async function loadContent() {
      try {
        const res = await fetch("/api/content");
        const data = await res.json();
        setContent(data.content);
      } catch {
        // Ignore errors
      }
    }
    loadContent();
  }, []);

  const filtered = content.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.excerpt.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || item.type === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-surface-900">Content Library</h2>
        <p className="text-sm text-surface-500 mt-1">
          Browse and manage all AI-generated marketing content
        </p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />            <input
            type="text"
            name="content-search"
            placeholder="Search content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search content"
            className="w-full rounded-lg border border-surface-200 bg-white py-2 pl-9 pr-3 text-sm text-surface-900 placeholder-surface-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all"
          />
        </div>
        <div className="flex gap-2">
          {["all", "blog", "social", "email", "landing", "ad"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                filter === f
                  ? "bg-primary-50 text-primary-700 ring-1 ring-primary-200"
                  : "bg-surface-50 text-surface-500 hover:bg-surface-100"
              )}
            >
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="mb-3 h-12 w-12 text-surface-300" />
          <p className="text-sm font-medium text-surface-500">No content yet</p>
          <p className="text-xs text-surface-400 mt-1">
            Generate content using the AI Content Creator agent
          </p>
          <button
            onClick={() => (window.location.href = "/agents")}
            className="mt-4 rounded-lg bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700 hover:bg-primary-100 transition-colors"
          >
            Go to Agents
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filtered.map((item, i) => {
            const Icon = TYPE_ICONS[item.type ?? "blog"] ?? FileText;
            const colorClass = TYPE_COLORS[item.type ?? "blog"] ?? "text-surface-600 bg-surface-50";

            return (
              <div
                key={i}
                className="group rounded-xl border border-surface-200 bg-white p-5 transition-all duration-200 hover:shadow-md hover:border-surface-300 animate-slide-up"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={clsx("flex h-8 w-8 items-center justify-center rounded-lg", colorClass)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-surface-400 capitalize">
                      {item.type ?? "Content"}
                    </p>
                    <h3 className="text-sm font-semibold text-surface-900 truncate">
                      {item.title}
                    </h3>
                  </div>
                </div>

                <p className="text-sm text-surface-600 line-clamp-2 mb-3">{item.excerpt}</p>

                <div className="flex flex-wrap items-center gap-3">
                  {item.seoKeywords?.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs text-surface-400">
                      <Hash className="h-3 w-3" />
                      {item.seoKeywords.length} keywords
                    </span>
                  )}
                  {item.estimatedReadTime && (
                    <span className="inline-flex items-center gap-1 text-xs text-surface-400">
                      <Clock className="h-3 w-3" />
                      {item.estimatedReadTime} min read
                    </span>
                  )}
                  <span className="text-xs text-surface-300">
                    {item.generatedAt
                      ? new Date(item.generatedAt).toLocaleDateString()
                      : ""}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
