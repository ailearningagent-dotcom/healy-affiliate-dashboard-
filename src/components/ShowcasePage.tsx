"use client";

import { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  LayoutDashboard,
  Bot,
  Building2,
  FileText,
  Users,
  Calendar,
  Settings,
  Shield,
  History,
  Crown,
  DollarSign,
  BarChart3,
  Palette,
  TrendingUp,
  Code2,
  Globe,
  Mail,
  Search,
  Target,
  Activity,
  CheckCircle2,
  ChevronRight,
  Zap,
  Layers,
  Brain,
  Star,
  CalendarCheck,
  BookOpen,
  MessageSquare,
  Megaphone,
  Eye,
  Key,
  RefreshCw,
  Sun,
  Moon,
  Code,
} from "lucide-react";
import clsx from "clsx";
import { useTheme } from "@/lib/theme-context";
import Link from "next/link";


// ============ TYPES ============

interface Feature {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  gradient: string;
  preview: React.ReactNode;
  details: { label: string; value: string }[];
}

// ============ DEMO DATA ============

const DEMO_METRICS = {
  totalLeads: 248,
  qualifiedLeads: 89,
  appointmentsScheduled: 42,
  appointmentsCompleted: 28,
  contentGenerated: 156,
  outreachSent: 1_247,
  conversionRate: 18.5,
  activeNurtureSequences: 6,
};

const DEMO_AGENTS = [
  { name: "Content Creator", type: "Content", count: 47, icon: FileText, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
  { name: "Prospect Researcher", type: "Research", count: 32, icon: Search, color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-900/20" },
  { name: "Outreach Specialist", type: "Outreach", count: 89, icon: Mail, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20" },
  { name: "CEO Strategist", type: "CEO", count: 18, icon: Crown, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-900/20" },
  { name: "CFO Analyst", type: "CFO", count: 12, icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
  { name: "Data Analyst", type: "Analyst", count: 24, icon: BarChart3, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
  { name: "Design Team", type: "Design", count: 15, icon: Palette, color: "text-pink-500", bg: "bg-pink-50 dark:bg-pink-900/20" },
  { name: "Sales Team", type: "Sales", count: 53, icon: TrendingUp, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20" },
  { name: "Developer", type: "Dev", count: 9, icon: Code2, color: "text-cyan-500", bg: "bg-cyan-50 dark:bg-cyan-900/20" },
  { name: "Lead Scraper", type: "Scraper", count: 21, icon: Globe, color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-900/20" },
];

const DEMO_CONTENT = [
  { title: "The Future of Frequency Wellness", type: "blog", excerpt: "Explore how microcurrent technology is transforming wellness routines...", keywords: 8, readTime: 6 },
  { title: "5 Morning Rituals for Peak Performance", type: "social", excerpt: "Start your day right with these science-backed habits...", keywords: 4, readTime: 3 },
  { title: "Your Personalized Wellness Journey", type: "email", excerpt: "Welcome! Here's how to get the most out of your device...", keywords: 5, readTime: 2 },
  { title: "Transform Your Health Naturally", type: "landing", excerpt: "Discover the power of non-invasive frequency technology...", keywords: 10, readTime: 4 },
  { title: "Why 10,000+ Choose Bio-Frequency", type: "ad", excerpt: "See results in just 15 minutes a day. Start your trial...", keywords: 6, readTime: 1 },
  { title: "Meet Sarah: Her Journey to Vitality", type: "blog", excerpt: "How Sarah regained her energy and focus with daily sessions...", keywords: 7, readTime: 7 },
];

const DEMO_LEADS = [
  { name: "Dr. Sarah Chen", company: "Holistic Health NYC", role: "Clinic Director", score: 92, status: "qualified" as const, email: "sarah@holistic.health" },
  { name: "James Mitchell", company: "Biohack Labs", role: "CEO", score: 88, status: "appointment_scheduled" as const, email: "james@biohacklabs.io" },
  { name: "Maria Gonzalez", company: "Wellness First", role: "Practice Owner", score: 76, status: "contacted" as const, email: "maria@wellnessfirst.com" },
  { name: "Alex Thompson", company: "Peak Performance Co.", role: "Head of Wellness", score: 71, status: "new" as const, email: "alex@peakperf.co" },
  { name: "Dr. Emily Park", company: "Integrated Medicine Center", role: "Medical Director", score: 85, status: "qualified" as const, email: "emily@integratedmed.com" },
];

const DEMO_APPOINTMENTS = [
  { name: "James Mitchell", company: "Biohack Labs", date: "Tomorrow", time: "10:00 AM", type: "Discovery Call" },
  { name: "Dr. Sarah Chen", company: "Holistic Health NYC", date: "Fri, Jun 5", time: "2:00 PM", type: "Consultation" },
  { name: "Maria Gonzalez", company: "Wellness First", date: "Mon, Jun 8", time: "11:30 AM", type: "Follow-up" },
];

const DEMO_CLIENTS = [
  { name: "Wellness Center NYC", slug: "wellness-nyc", color: "#6366f1", leads: 45, appointments: 12, active: true },
  { name: "Biohack Labs", slug: "biohack-labs", color: "#10b981", leads: 28, appointments: 8, active: true },
  { name: "Holistic Health", slug: "holistic-health", color: "#f59e0b", leads: 19, appointments: 5, active: false },
];

const ORG_DEPARTMENTS = [
  { name: "Executive Office", status: "operational" as const, tasks: 12, perf: 94, icon: Crown, color: "text-purple-500", bg: "bg-purple-50" },
  { name: "Finance Dept.", status: "operational" as const, tasks: 8, perf: 87, icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-50" },
  { name: "Data & Research", status: "busy" as const, tasks: 16, perf: 79, icon: Search, color: "text-blue-500", bg: "bg-blue-50" },
  { name: "Creative Studio", status: "operational" as const, tasks: 10, perf: 91, icon: Palette, color: "text-pink-500", bg: "bg-pink-50" },
  { name: "Sales Development", status: "operational" as const, tasks: 14, perf: 85, icon: TrendingUp, color: "text-amber-500", bg: "bg-amber-50" },
  { name: "Engineering", status: "busy" as const, tasks: 6, perf: 96, icon: Code2, color: "text-cyan-500", bg: "bg-cyan-50" },
];

const NAV_SECTIONS = [
  { id: "overview", label: "Overview", icon: Sparkles },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "agents", label: "AI Agents", icon: Bot },
  { id: "hierarchy", label: "Org Hierarchy", icon: Building2 },
  { id: "content", label: "Content Library", icon: FileText },
  { id: "leads", label: "Leads & Appts", icon: Users },
  { id: "book", label: "Booking", icon: Calendar },
  { id: "admin", label: "Admin Panel", icon: Shield },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "architecture", label: "Architecture", icon: Layers },
  { id: "tech", label: "Tech Stack", icon: Code2 },
  { id: "history", label: "History", icon: History },
  { id: "theme", label: "Dark Mode", icon: Sun },
];

// ============ SECTION NAV ============

function SectionNav({ active, onSelect }: { active: string; onSelect: (id: string) => void }) {
  return (
    <nav className="sticky top-20 z-30 -mx-4 overflow-x-auto border-b border-surface-200 bg-surface-50/80 backdrop-blur-md px-4 dark:bg-surface-900/80">
      <div className="flex gap-1 py-2 min-w-max">
        {NAV_SECTIONS.map((s) => {
          const Icon = s.icon;
          const isActive = active === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={clsx(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all duration-200",
                isActive
                  ? "bg-primary-100 text-primary-700 shadow-sm dark:bg-primary-900/30 dark:text-primary-300"
                  : "text-surface-500 hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-800 dark:hover:text-surface-300"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {s.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ============ HERO SECTION ============

function HeroSection() {


  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface-900 via-primary-900 to-surface-900 px-6 py-16 sm:px-10 sm:py-20 lg:px-16">
      {/* Animated particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-primary-500/10 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-accent-500/10 blur-3xl" />
        <div className="absolute left-1/3 top-1/3 h-40 w-40 rounded-full bg-violet-500/5 blur-2xl" />
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute h-1 w-1 rounded-full bg-white/20"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `pulseSoft ${2 + Math.random() * 3}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-sm">
          <Zap className="h-3.5 w-3.5 text-accent-400" />
          <span className="text-xs font-medium text-white/80">v0.1 · AI-Powered Marketing Platform</span>
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
          MarketAI Platform
          <br />
          <span className="bg-gradient-to-r from-primary-300 via-accent-300 to-violet-300 bg-clip-text text-transparent">
            Full Feature Showcase
          </span>
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-white/60">
          A complete AI-powered marketing platform with autonomous agents, content generation,
          lead management, appointment scheduling, multi-tenant admin, and more — all in one stunning interface.
        </p>

        {/* Stats */}
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "AI Agents", value: "10", icon: Bot },
            { label: "Pages & Routes", value: "25+", icon: Layers },
            { label: "API Endpoints", value: "20+", icon: Activity },
            { label: "Features", value: "50+", icon: Zap },
          ].map((stat) => {
            const StatIcon = stat.icon;
            return (
              <div key={stat.label} className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <StatIcon className="h-5 w-5 text-primary-400 mb-2" />
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-white/50 mt-0.5">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* Quick links */}
        <div className="mt-8 flex flex-wrap gap-3">
          {NAV_SECTIONS.filter(s => s.id !== "overview").map((s) => {
            const Icon = s.icon;
            return (
              <a
                key={s.id}
                href={`#section-${s.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white/70 hover:bg-white/20 hover:text-white transition-all"
              >
                <Icon className="h-3.5 w-3.5" />
                {s.label}
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============ DASHBOARD PREVIEW ============

function DashboardPreview() {
  return (
    <div className="space-y-4">
      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Qualified Leads", value: DEMO_METRICS.qualifiedLeads, icon: Target, color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-900/20" },
          { label: "Appointments", value: DEMO_METRICS.appointmentsScheduled, icon: CalendarCheck, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
          { label: "Content Pieces", value: DEMO_METRICS.contentGenerated, icon: FileText, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
          { label: "Outreach Sent", value: DEMO_METRICS.outreachSent.toLocaleString(), icon: Mail, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20" },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="rounded-xl border border-surface-200 bg-white p-4 dark:bg-surface-800">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-surface-400">{kpi.label}</p>
                  <p className="mt-1 text-2xl font-bold text-surface-900 dark:text-surface-100">{kpi.value}</p>
                </div>
                <div className={clsx("flex h-9 w-9 items-center justify-center rounded-lg", kpi.bg)}>
                  <Icon className={clsx("h-5 w-5", kpi.color)} />
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
                <TrendingUp className="h-3 w-3" />
                <span>+{Math.floor(Math.random() * 20 + 5)}% vs last month</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-surface-200 bg-white p-5 dark:bg-surface-800">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-surface-400" />
            <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100">Lead Pipeline</h4>
          </div>
          <div className="flex items-end gap-3 h-32">
            {[
              { label: "Total", value: DEMO_METRICS.totalLeads, color: "#6366f1" },
              { label: "Qualified", value: DEMO_METRICS.qualifiedLeads, color: "#22c55e" },
              { label: "Appt.", value: DEMO_METRICS.appointmentsScheduled, color: "#3b82f6" },
              { label: "Completed", value: DEMO_METRICS.appointmentsCompleted, color: "#a855f7" },
            ].map((d) => {
              const pct = (d.value / DEMO_METRICS.totalLeads) * 100;
              return (
                <div key={d.label} className="flex flex-1 flex-col items-center justify-end h-full">
                  <span className="mb-1 text-[10px] font-medium text-surface-500">{d.value}</span>
                  <div
                    className="w-full rounded-t-md transition-all"
                    style={{ height: `${Math.max(pct, 4)}%`, backgroundColor: d.color }}
                  />
                  <span className="mt-1.5 text-[10px] text-surface-400">{d.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-surface-200 bg-white p-5 dark:bg-surface-800">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-surface-400" />
            <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100">Agent Activity</h4>
          </div>
          <div className="flex items-end gap-3 h-32">
            {[
              { label: "Content", value: DEMO_METRICS.contentGenerated, color: "#3b82f6" },
              { label: "Outreach", value: DEMO_METRICS.outreachSent, color: "#f59e0b" },
              { label: "Leads", value: DEMO_METRICS.totalLeads, color: "#6366f1" },
              { label: "Nurture", value: DEMO_METRICS.activeNurtureSequences, color: "#22c55e" },
            ].map((d) => {
              const maxVal = Math.max(DEMO_METRICS.outreachSent, DEMO_METRICS.totalLeads, DEMO_METRICS.contentGenerated, DEMO_METRICS.activeNurtureSequences);
              const pct = (d.value / maxVal) * 100;
              return (
                <div key={d.label} className="flex flex-1 flex-col items-center justify-end h-full">
                  <span className="mb-1 text-[10px] font-medium text-surface-500">{d.value.toLocaleString()}</span>
                  <div
                    className="w-full rounded-t-md transition-all"
                    style={{ height: `${Math.max(pct, 4)}%`, backgroundColor: d.color }}
                  />
                  <span className="mt-1.5 text-[10px] text-surface-400">{d.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Activity */}
      <div className="rounded-xl border border-surface-200 bg-white p-5 dark:bg-surface-800">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100">Recent Activity</h4>
          <span className="text-xs text-primary-600 font-medium">View all history</span>
        </div>
        <div className="space-y-1">
          {[
            { type: "content" as const, desc: "Content Agent generated a new blog post: 'The Future of Frequency Wellness'", time: "2 min ago" },
            { type: "sales" as const, desc: "Sales Agent qualified lead: Dr. Sarah Chen (Score: 92)", time: "15 min ago" },
            { type: "analyst" as const, desc: "Data Analyst found 5 new prospects in NYC area", time: "32 min ago" },
            { type: "appointment" as const, desc: "Appointment scheduled with James Mitchell for tomorrow", time: "1 hour ago" },
            { type: "design" as const, desc: "Design Team created 3 poster concepts for Q3 campaign", time: "2 hours ago" },
          ].map((a, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-surface-50 dark:hover:bg-surface-700/50 transition-colors">
              <div className={clsx(
                "flex h-7 w-7 items-center justify-center rounded-full",
                a.type === "content" ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" :
                a.type === "sales" ? "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400" :
                a.type === "analyst" ? "bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400" :
                a.type === "appointment" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" :
                "bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400"
              )}>
                {a.type === "content" ? <FileText className="h-3.5 w-3.5" /> :
                 a.type === "sales" ? <Mail className="h-3.5 w-3.5" /> :
                 a.type === "analyst" ? <Target className="h-3.5 w-3.5" /> :
                 a.type === "appointment" ? <Calendar className="h-3.5 w-3.5" /> :
                 <Palette className="h-3.5 w-3.5" />}
              </div>
              <p className="flex-1 text-sm text-surface-700 dark:text-surface-300 truncate">{a.desc}</p>
              <span className="text-xs text-surface-400 flex-shrink-0">{a.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ HIERARCHY PREVIEW ============

function HierarchyPreview() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {ORG_DEPARTMENTS.map((dept) => {
          const Icon = dept.icon;
          const isExpanded = expanded === dept.name;
          return (
            <div key={dept.name}>
              <button
                onClick={() => setExpanded(isExpanded ? null : dept.name)}
                className={clsx(
                  "w-full rounded-xl border p-3 text-left transition-all",
                  isExpanded
                    ? "border-primary-200 bg-white shadow-sm ring-2 ring-primary-100 dark:border-primary-700 dark:bg-surface-800 dark:ring-primary-900"
                    : "border-surface-200 bg-white hover:border-surface-300 dark:border-surface-700 dark:bg-surface-800 dark:hover:border-surface-600"
                )}
              >
                <div className={clsx("flex h-8 w-8 items-center justify-center rounded-lg mb-2", dept.bg)}>
                  <Icon className={clsx("h-4 w-4", dept.color)} />
                </div>
                <h4 className="text-xs font-bold text-surface-900 dark:text-surface-100">{dept.name.split(" ")[0]}</h4>
                <div className="mt-1.5 flex items-center gap-1">
                  <span className={clsx("h-1.5 w-1.5 rounded-full", dept.status === "operational" ? "bg-emerald-500" : "bg-amber-500")} />
                  <span className="text-[10px] text-surface-400 capitalize">{dept.status}</span>
                </div>
                <div className="mt-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-surface-400">Tasks: {dept.tasks}</span>
                    <span className="text-surface-500">{dept.perf}%</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-surface-100 dark:bg-surface-700 overflow-hidden">
                    <div className="h-full rounded-full bg-primary-500" style={{ width: `${dept.perf}%` }} />
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="mt-2 rounded-lg border border-surface-200 bg-white p-3 text-xs text-surface-600 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-400 animate-fade-in">
                  {dept.name === "Executive Office" && "Sets strategic goals, coordinates departments, reviews KPIs"}
                  {dept.name === "Finance Dept." && "Budgets, ROI analysis, cost-per-lead optimization"}
                  {dept.name === "Data & Research" && "Scrapes leads, enriches data, market intelligence"}
                  {dept.name === "Creative Studio" && "Poster concepts, video scripts, brand assets"}
                  {dept.name === "Sales Development" && "Qualifies leads, personalizes outreach, schedules"}
                  {dept.name === "Engineering" && "Auto-fixes errors, reviews code, monitors health"}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Expanded Department Detail */}
      <div className="rounded-xl border border-surface-200 bg-gradient-to-r from-purple-500 to-violet-600 p-4 text-white">
        <div className="flex items-center gap-2 mb-3">
          <Crown className="h-5 w-5" />
          <h4 className="text-sm font-bold">CEO — Executive Office</h4>
        </div>
        <p className="text-xs text-white/80 mb-3">Strategic orchestrator — sets goals, prioritizes tasks, coordinates all departments</p>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-white/20 p-2">
            <p className="text-[10px] text-white/70">Active Strategies</p>
            <p className="text-lg font-bold">3</p>
          </div>
          <div className="rounded-lg bg-white/20 p-2">
            <p className="text-[10px] text-white/70">Departments</p>
            <p className="text-lg font-bold">5</p>
          </div>
          <div className="rounded-lg bg-white/20 p-2">
            <p className="text-[10px] text-white/70">Tasks/Week</p>
            <p className="text-lg font-bold">12</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ CONTENT LIBRARY PREVIEW ============

function ContentPreview() {
  const TYPE_ICONS: Record<string, React.ElementType> = { blog: BookOpen, social: MessageSquare, email: Mail, landing: Globe, ad: Megaphone };
  const TYPE_COLORS: Record<string, string> = {
    blog: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20",
    social: "text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-900/20",
    email: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20",
    landing: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20",
    ad: "text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-900/20",
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {["all", "blog", "social", "email", "landing", "ad"].map((f) => (
          <button
            key={f}
            className={clsx(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
              f === "all"
                ? "bg-primary-50 text-primary-700 ring-1 ring-primary-200 dark:bg-primary-900/30 dark:text-primary-300"
                : "bg-surface-50 text-surface-500 hover:bg-surface-100 dark:bg-surface-800 dark:text-surface-400"
            )}
          >
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {DEMO_CONTENT.map((item, i) => {
          const Icon = TYPE_ICONS[item.type] ?? FileText;
          const colorClass = TYPE_COLORS[item.type] ?? "text-surface-600 bg-surface-50";
          return (
            <div key={i} className="rounded-xl border border-surface-200 bg-white p-4 hover:shadow-md transition-all dark:border-surface-700 dark:bg-surface-800">
              <div className="flex items-center gap-2 mb-2">
                <div className={clsx("flex h-7 w-7 items-center justify-center rounded-lg", colorClass)}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-[10px] font-medium text-surface-400 uppercase">{item.type}</span>
              </div>
              <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100 truncate">{item.title}</h4>
              <p className="text-xs text-surface-500 mt-1 line-clamp-2">{item.excerpt}</p>
              <div className="flex items-center gap-3 mt-3 text-[10px] text-surface-400">
                <span>{item.keywords} keywords</span>
                <span>{item.readTime} min read</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============ LEADS PREVIEW ============

function LeadsPreview() {
  const [selected, setSelected] = useState(DEMO_LEADS[0]);
  const STATUS_COLORS: Record<string, string> = {
    new: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
    contacted: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
    qualified: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
    appointment_scheduled: "bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400",
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-2">
        {DEMO_LEADS.map((lead) => {
          const isSelected = selected.name === lead.name;
          return (
            <button
              key={lead.name}
              onClick={() => setSelected(lead)}
              className={clsx(
                "w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
                isSelected
                  ? "border-primary-200 bg-primary-50/50 shadow-sm dark:border-primary-700 dark:bg-primary-900/10"
                  : "border-surface-200 bg-white hover:border-surface-300 dark:border-surface-700 dark:bg-surface-800 dark:hover:border-surface-600"
              )}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-100 text-surface-600 font-semibold text-xs dark:bg-surface-700 dark:text-surface-300">
                {lead.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-surface-900 dark:text-surface-100">{lead.name}</p>
                <p className="text-xs text-surface-500 truncate">{lead.role} at {lead.company}</p>
              </div>
              <span className={clsx("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium", STATUS_COLORS[lead.status])}>
                {lead.status.replace("_", " ")}
              </span>
              <div className="flex items-center gap-1 rounded-md bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5">
                <Star className="h-3 w-3 text-amber-500" />
                <span className="text-[10px] font-medium text-amber-700 dark:text-amber-400">{lead.score}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Detail */}
      <div className="rounded-xl border border-surface-200 bg-white p-5 dark:border-surface-700 dark:bg-surface-800">
        <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-3">Lead Details</h4>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-100 text-surface-600 font-bold text-sm dark:bg-surface-700 dark:text-surface-300">
              {selected.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
            </div>
            <div>
              <p className="text-sm font-semibold text-surface-900 dark:text-surface-100">{selected.name}</p>
              <p className="text-xs text-surface-500">{selected.role} · {selected.company}</p>
            </div>
          </div>
          <div className="rounded-lg bg-surface-50 dark:bg-surface-700/50 p-3 space-y-1.5">
            <p className="text-xs text-surface-500">{selected.email}</p>
          </div>
          <div>
            <p className="text-xs text-surface-400 mb-1">Lead Score: {selected.score}</p>
            <div className="h-2 rounded-full bg-surface-200 dark:bg-surface-600 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-400 via-emerald-400 to-primary-500" style={{ width: `${selected.score}%` }} />
            </div>
          </div>
          <div className="flex gap-2">
            <button className="flex-1 rounded-lg border border-surface-200 px-3 py-2 text-xs font-medium text-surface-600 hover:bg-surface-50 transition-colors dark:border-surface-600 dark:text-surface-400 dark:hover:bg-surface-700">
              <Mail className="inline h-3 w-3 mr-1" /> Email
            </button>
            <button className="flex-1 rounded-lg border border-surface-200 px-3 py-2 text-xs font-medium text-surface-600 hover:bg-surface-50 transition-colors dark:border-surface-600 dark:text-surface-400 dark:hover:bg-surface-700">
              <Calendar className="inline h-3 w-3 mr-1" /> Schedule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ ADMIN PREVIEW ============

function AdminPreview() {
  const [selected, setSelected] = useState(DEMO_CLIENTS[0]);
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {DEMO_CLIENTS.map((c) => {
          const isSelected = selected.name === c.name;
          return (
            <button
              key={c.name}
              onClick={() => setSelected(c)}
              className={clsx(
                "rounded-xl border p-4 text-left transition-all",
                isSelected
                  ? "border-primary-200 bg-white shadow-sm ring-2 ring-primary-100 dark:border-primary-700 dark:bg-surface-800"
                  : "border-surface-200 bg-white hover:border-surface-300 dark:border-surface-700 dark:bg-surface-800 dark:hover:border-surface-600"
              )}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg text-white font-bold text-xs" style={{ backgroundColor: c.color }}>
                  {c.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100 truncate">{c.name}</h4>
                  <span className={clsx("text-[10px] font-medium", c.active ? "text-emerald-600" : "text-surface-400")}>
                    {c.active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-surface-50 dark:bg-surface-700/50 p-2 text-center">
                  <p className="text-sm font-bold text-surface-900 dark:text-surface-100">{c.leads}</p>
                  <p className="text-[10px] text-surface-500">Leads</p>
                </div>
                <div className="rounded-lg bg-surface-50 dark:bg-surface-700/50 p-2 text-center">
                  <p className="text-sm font-bold text-surface-900 dark:text-surface-100">{c.appointments}</p>
                  <p className="text-[10px] text-surface-500">Appts</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Client Detail */}
      <div className="rounded-xl border border-surface-200 bg-white p-5 dark:border-surface-700 dark:bg-surface-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl text-white font-bold text-lg" style={{ backgroundColor: selected.color }}>
            {selected.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
          </div>
          <div>
            <h4 className="text-base font-semibold text-surface-900 dark:text-surface-100">{selected.name}</h4>
            <p className="text-xs text-surface-400">/book/{selected.slug}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-surface-100 dark:border-surface-700 bg-surface-50 dark:bg-surface-700/50 p-3">
            <p className="text-xs text-surface-500">Total Leads</p>
            <p className="text-lg font-bold text-surface-900 dark:text-surface-100">{selected.leads}</p>
          </div>
          <div className="rounded-lg border border-surface-100 dark:border-surface-700 bg-surface-50 dark:bg-surface-700/50 p-3">
            <p className="text-xs text-surface-500">Appointments</p>
            <p className="text-lg font-bold text-surface-900 dark:text-surface-100">{selected.appointments}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button className="flex items-center gap-1.5 rounded-lg border border-surface-200 px-3 py-2 text-xs font-medium text-primary-600 hover:bg-primary-50 dark:border-surface-600 dark:text-primary-400 dark:hover:bg-primary-900/20">
            <BarChart3 className="h-3.5 w-3.5" /> Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ SETTINGS PREVIEW ============

function SettingsPreview() {
  const providers = [
    { name: "OpenAI", key: "sk-...saved", status: "configured" as const, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
    { name: "Gemini", key: "AIza...saved", status: "configured" as const, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
    { name: "Claude", key: "Not set", status: "missing" as const, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-900/20" },
    { name: "OpenRouter", key: "Not set", status: "missing" as const, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-900/20" },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* API Keys */}
      <div className="rounded-xl border border-surface-200 bg-white p-5 dark:border-surface-700 dark:bg-surface-800">
        <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100 flex items-center gap-2 mb-4">
          <Key className="h-4 w-4 text-primary-500" />
          API Keys & Providers
        </h4>
        <div className="space-y-2">
          {providers.map((p) => (
            <div key={p.name} className={clsx("flex items-center justify-between rounded-lg border p-3", p.bg)}>
              <div>
                <p className="text-sm font-medium text-surface-900 dark:text-surface-100">{p.name}</p>
                <p className="text-xs font-mono text-surface-400">{p.key}</p>
              </div>
              <span className={clsx("text-xs font-medium", p.status === "configured" ? "text-emerald-600" : "text-surface-400")}>
                {p.status === "configured" ? "✓ Configured" : "Not set"}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3">
          <Zap className="h-4 w-4 text-amber-600" />
          <p className="text-xs text-amber-700 dark:text-amber-400">Default provider: <strong>OpenAI</strong> (GPT-4o Mini)</p>
        </div>
      </div>

      {/* Business Profile */}
      <div className="rounded-xl border border-surface-200 bg-white p-5 dark:border-surface-700 dark:bg-surface-800">
        <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100 flex items-center gap-2 mb-4">
          <Palette className="h-4 w-4 text-primary-500" />
          Business Profile
        </h4>
        <div className="space-y-3">                  <div>
                    <label htmlFor="demo-business-name" className="block text-xs font-medium text-surface-500 mb-1">Business Name</label>
                    <input id="demo-business-name" type="text" value="Healy" readOnly className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-500 dark:border-surface-600 dark:bg-surface-700" />
                  </div>
                  <div>
                    <label htmlFor="demo-industry" className="block text-xs font-medium text-surface-500 mb-1">Industry</label>
                    <input id="demo-industry" type="text" value="Frequency Wellness Technology" readOnly className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-500 dark:border-surface-600 dark:bg-surface-700" />
                  </div>
                  <div>
                    <label htmlFor="demo-target-audience" className="block text-xs font-medium text-surface-500 mb-1">Target Audience</label>
                    <input id="demo-target-audience" type="text" value="Wellness seekers, holistic practitioners, biohackers" readOnly className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-500 dark:border-surface-600 dark:bg-surface-700" />
                  </div>
                </div>
              </div>

    </div>
  );
}

// ============ FEATURE CARD ============

function FeatureCard({ feature }: { feature: Feature }) {
  const Icon = feature.icon;
  return (
    <div className="group rounded-xl border border-surface-200 bg-white p-5 transition-all hover:shadow-md hover:border-surface-300 dark:border-surface-700 dark:bg-surface-800 dark:hover:border-surface-600">
      <div className="flex items-start justify-between mb-3">
        <div className={clsx("flex h-10 w-10 items-center justify-center rounded-lg", feature.bg)}>
          <Icon className={clsx("h-5 w-5", feature.color)} />
        </div>
        <div className="flex gap-1.5">
          {feature.details.map((d) => (
            <div key={d.label} className="rounded-md bg-surface-50 dark:bg-surface-700 px-2 py-1 text-center">
              <p className="text-xs font-bold text-surface-900 dark:text-surface-100">{d.value}</p>
              <p className="text-[9px] text-surface-400">{d.label}</p>
            </div>
          ))}
        </div>
      </div>
      <h3 className="text-sm font-bold text-surface-900 dark:text-surface-100">{feature.title}</h3>
      <p className="text-xs text-surface-500 mt-1">{feature.description}</p>
    </div>
  );
}

// ============ KEY STATS STRIP ============

function StatsStrip() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
      {[
        { label: "LLM Providers", value: "4", icon: Brain },
        { label: "Agent Types", value: "10", icon: Bot },
        { label: "Sub-Agents", value: "20+", icon: Layers },
        { label: "API Routes", value: "22", icon: Activity },
        { label: "Database Tables", value: "8", icon: BarChart3 },
        { label: "UI Components", value: "30+", icon: Palette },
        { label: "Data Providers", value: "3", icon: Globe },
        { label: "Auth Methods", value: "2", icon: Shield },
      ].map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className="rounded-xl border border-surface-200 bg-white p-3 text-center dark:border-surface-700 dark:bg-surface-800">
            <Icon className="h-5 w-5 text-primary-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-surface-900 dark:text-surface-100">{stat.value}</p>
            <p className="text-[10px] text-surface-400">{stat.label}</p>
          </div>
        );
      })}
    </div>
  );
}

// ============ ARCHITECTURE OVERVIEW ============

function ArchitectureSection() {
  const layers = [
    { name: "Frontend", tech: "Next.js 16 + React 19", items: ["Server Components", "App Router", "Client Components", "Recharts Charts"], color: "from-blue-500 to-cyan-500" },
    { name: "UI Layer", tech: "Tailwind CSS v4 + Lucide", items: ["23 Route Pages", "12 Shared Components", "Dark/Light Mode", "CSS Animations"], color: "from-violet-500 to-purple-500" },
    { name: "API Layer", tech: "Next.js Route Handlers", items: ["22 API Endpoints", "RESTful Design", "Auth Middleware", "Rate Limiting"], color: "from-emerald-500 to-teal-500" },
    { name: "AI Layer", tech: "Multi-Provider LLM", items: ["OpenAI", "Gemini", "Claude", "OpenRouter"], color: "from-amber-500 to-orange-500" },
    { name: "Agent System", tech: "Autonomous Agents", items: ["9 Agent Types", "20+ Sub-Agents", "Pipeline Orchestration", "Context Management"], color: "from-pink-500 to-rose-500" },
    { name: "Data Layer", tech: "Turso (libSQL)", items: ["Leads Table", "Appointments", "Content Store", "Activity Log"], color: "from-indigo-500 to-violet-500" },
  ];

  return (
    <div className="space-y-3">
      {layers.map((layer, i) => (
        <div key={layer.name} className="group rounded-xl border border-surface-200 bg-white p-4 hover:shadow-sm transition-all dark:border-surface-700 dark:bg-surface-800">
          <div className="flex items-center gap-3">
            <div className={clsx("flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-white text-xs font-bold", layer.color)}>
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-surface-900 dark:text-surface-100">{layer.name}</h4>
                <span className="rounded-full bg-surface-100 dark:bg-surface-700 px-2 py-0.5 text-[10px] font-medium text-surface-500">{layer.tech}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {layer.items.map((item) => (
                  <span key={item} className="rounded-md bg-surface-50 dark:bg-surface-700/50 px-2 py-0.5 text-[10px] text-surface-600 dark:text-surface-400">
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-surface-300 group-hover:text-surface-400 transition-colors" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ TECH STACK SECTION ============

function TechStackSection() {
  const stacks = [
    { category: "Framework", items: ["Next.js 16", "React 19", "TypeScript 5"], icon: Code2 },
    { category: "Styling", items: ["Tailwind CSS v4", "Lucide React", "clsx"], icon: Palette },
    { category: "AI/ML", items: ["OpenAI SDK", "Gemini SDK", "Anthropic SDK", "OpenRouter"], icon: Brain },
    { category: "Database", items: ["Turso/libSQL", "SQLite"], icon: BarChart3 },
    { category: "Auth", items: ["NextAuth v5", "Auth Core"], icon: Shield },
    { category: "Testing", items: ["Vitest", "Unit Tests", "Integration Tests"], icon: CheckCircle2 },
    { category: "Charts", items: ["Recharts", "Custom SVG"], icon: Activity },
    { category: "Dev Tools", items: ["ESLint 9", "PostCSS", "Turbopack"], icon: Zap },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stacks.map((stack) => {
        const Icon = stack.icon;
        return (
          <div key={stack.category} className="rounded-xl border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-800">
            <Icon className="h-5 w-5 text-primary-500 mb-2" />
            <h4 className="text-xs font-bold text-surface-900 dark:text-surface-100 mb-1.5">{stack.category}</h4>
            <ul className="space-y-0.5">
              {stack.items.map((item) => (
                <li key={item} className="text-[10px] text-surface-500">• {item}</li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

// ============ APPOINTMENTS CARD ============

function AppointmentsCard() {
  return (
    <div className="rounded-xl border border-surface-200 bg-white p-5 dark:border-surface-700 dark:bg-surface-800">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-surface-400" />
          <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100">Upcoming Appointments</h4>
        </div>
        <span className="text-xs text-surface-400">Next 7 days</span>
      </div>
      <div className="space-y-2">
        {DEMO_APPOINTMENTS.map((apt) => (
          <div key={apt.name} className="flex items-center gap-3 rounded-lg border border-surface-100 bg-surface-50 p-3 dark:border-surface-700 dark:bg-surface-700/50">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 text-primary-600 font-semibold text-xs dark:bg-primary-900/20 dark:text-primary-400">
              {apt.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">{apt.name}</p>
              <p className="text-xs text-surface-400">{apt.company}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-surface-700 dark:text-surface-300">{apt.date}</p>
              <p className="text-[10px] text-surface-400">{apt.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ DARK MODE SHOWCASE ============

function DemoThemeCard({ variant }: { variant: "light" | "dark" }) {
  const isDark = variant === "dark";
  return (
    <div className={clsx("space-y-3", isDark ? "text-white" : "text-surface-900")}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={clsx(
          "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold",
          isDark ? "bg-indigo-500 text-white" : "bg-indigo-100 text-indigo-700"
        )}>
          JD
        </div>
        <div>
          <p className={clsx("text-sm font-semibold", isDark ? "text-white" : "text-surface-900")}>
            Jane Doe
          </p>
          <p className={clsx("text-xs", isDark ? "text-surface-400" : "text-surface-500")}>
            jane@example.com
          </p>
        </div>
        <span className={clsx(
          "ml-auto inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium",
          isDark ? "bg-emerald-900/40 text-emerald-400" : "bg-emerald-50 text-emerald-700"
        )}>
          Active
        </span>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Leads", value: "42" },
          { label: "Deals", value: "12" },
          { label: "Rate", value: "28%" },
        ].map((s) => (
          <div key={s.label} className={clsx(
            "rounded-lg p-2 text-center",
            isDark ? "bg-surface-700/50" : "bg-surface-50"
          )}>
            <p className="text-sm font-bold">{s.value}</p>
            <p className={clsx("text-[10px]", isDark ? "text-surface-400" : "text-surface-500")}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div>
        <div className="flex items-center justify-between text-xs mb-1">
          <span className={isDark ? "text-surface-400" : "text-surface-500"}>Pipeline Progress</span>
          <span className="font-medium">68%</span>
        </div>
        <div className={clsx("h-2 rounded-full overflow-hidden", isDark ? "bg-surface-700" : "bg-surface-200")}>
          <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-primary-500 to-primary-400" />
        </div>
      </div>

      {/* Button */}
      <button className={clsx(
        "w-full rounded-lg py-2 text-xs font-semibold transition-all",
        isDark
          ? "bg-primary-600 text-white hover:bg-primary-500"
          : "bg-primary-50 text-primary-700 hover:bg-primary-100"
      )}>
        View Dashboard
      </button>
    </div>
  );
}

function DarkModeShowcase() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="space-y-6">
      {/* Hero Toggle */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 px-6 py-10 sm:px-10 text-center">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-10 -top-10 h-60 w-60 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-10 -right-10 h-60 w-60 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5 blur-2xl" />
        </div>

        <div className="relative z-10">
          {/* Large toggle */}
          <div className="flex items-center justify-center gap-6 mb-6">
            <div className={clsx(
              "rounded-2xl p-4 transition-all duration-300",
              theme === "light" ? "scale-110 bg-amber-100 text-amber-600 shadow-lg" : "bg-white/10 text-white/50"
            )}>
              <Sun className="h-8 w-8" />
            </div>

            <button
              onClick={toggleTheme}
              className="relative h-12 w-24 rounded-full bg-white/20 backdrop-blur-sm p-1.5 transition-all hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-label="Toggle theme"
            >
              <div
                className={clsx(
                  "flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-lg transition-all duration-300",
                  theme === "dark" ? "translate-x-11" : "translate-x-0"
                )}
              >
                {theme === "dark" ? (
                  <Moon className="h-5 w-5 text-indigo-600" />
                ) : (
                  <Sun className="h-5 w-5 text-amber-600" />
                )}
              </div>
            </button>

            <div className={clsx(
              "rounded-2xl p-4 transition-all duration-300",
              theme === "dark" ? "scale-110 bg-indigo-100 text-indigo-600 shadow-lg" : "bg-white/10 text-white/50"
            )}>
              <Moon className="h-8 w-8" />
            </div>
          </div>

          <h3 className="text-2xl font-bold text-white sm:text-3xl">Live Dark Mode Toggle</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm text-white/70">
            Click the toggle above to switch between light and dark modes. Your preference is
            persisted to localStorage and respected across all pages.
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {[
              { label: `Current: ${theme}`, color: "bg-white/15 text-white/80" },
              { label: "localStorage persisted", color: "bg-white/15 text-white/80" },
              { label: "System preference detection", color: "bg-white/15 text-white/80" },
            ].map((badge) => (
              <span
                key={badge.label}
                className={clsx(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium backdrop-blur-sm",
                  badge.color
                )}
              >
                {badge.label === `Current: ${theme}` && (
                  <span className={clsx(
                    "h-1.5 w-1.5 rounded-full",
                    theme === "dark" ? "bg-indigo-300" : "bg-amber-300"
                  )} />
                )}
                {badge.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Light Card */}
        <div className="overflow-hidden rounded-xl border border-surface-200 bg-white">
          <div className="flex items-center gap-2 border-b border-surface-100 px-4 py-3">
            <Sun className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-semibold text-surface-600">Light Mode</span>
          </div>
          <div className="p-4">
            <DemoThemeCard variant="light" />
          </div>
        </div>

        {/* Dark Card */}
        <div className="overflow-hidden rounded-xl border border-surface-700 bg-surface-800">
          <div className="flex items-center gap-2 border-b border-surface-700 px-4 py-3">
            <Moon className="h-4 w-4 text-blue-400" />
            <span className="text-xs font-semibold text-surface-300">Dark Mode</span>
          </div>
          <div className="p-4">
            <DemoThemeCard variant="dark" />
          </div>
        </div>
      </div>

      {/* Implementation */}
      <div className="overflow-hidden rounded-xl border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800">
        <div className="flex items-center gap-2 border-b border-surface-100 px-5 py-3 dark:border-surface-700">
          <Code className="h-4 w-4 text-primary-500" />
          <span className="text-xs font-semibold text-surface-600 dark:text-surface-300">Implementation</span>
          <span className="ml-auto text-[10px] text-surface-400">theme-context.tsx</span>
        </div>
        <div className="overflow-x-auto p-5">
          <pre className="text-[11px] leading-6 text-surface-700 dark:text-surface-300">
            <code>{`// ThemeProvider wraps your app:
&lt;ThemeProvider&gt;
  &lt;App /&gt;
&lt;/ThemeProvider&gt;

// Use in any component:
const { theme, toggleTheme, setTheme } = useTheme();

// Tailwind: prefix with \`dark:\`
&lt;div className=&quot;bg-white dark:bg-surface-900&quot; /&gt;

// Persisted to localStorage("THEME")
// Falls back to system preference`}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}

// ============ MAIN SHOWPAGE COMPONENT ============

export default function ShowcasePage() {
  const [activeSection, setActiveSection] = useState("overview");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(`section-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute("data-section");
            if (id) setActiveSection(id);
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );

    Object.values(sectionRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const FEATURES: Feature[] = [
    {
      id: "dashboard-feature", title: "Real-Time Dashboard", description: "Live KPI metrics, lead pipeline charts, agent activity charts, department radar, and recent activity feed with auto-refresh.", icon: LayoutDashboard, color: "text-primary-600", bg: "bg-primary-50", gradient: "from-primary-500 to-primary-700",
      preview: <DashboardPreview />,
      details: [{ label: "KPIs", value: "8" }, { label: "Charts", value: "4" }],
    },
    {
      id: "agents-feature", title: "10 AI Agent Types", description: "Specialized autonomous agents: Content, Research, Outreach, CEO, CFO, Analyst, Design, Developer, Sales, Scraper — each with structured input forms.", icon: Bot, color: "text-violet-600", bg: "bg-violet-50", gradient: "from-violet-500 to-purple-600",
      preview: <div className="rounded-xl border border-dashed border-surface-200 dark:border-surface-700 p-8 text-center">
            <Bot className="mx-auto h-8 w-8 text-surface-300 dark:text-surface-600 mb-3" />
            <p className="text-sm text-surface-400">Interactive agent playground replaced with 90-day automated Healy email sequences.<br />Visit the <Link href="/leads" className="text-primary-600 font-medium hover:underline">Leads page</Link> to manage the email sequence system.</p>
          </div>,
      details: [{ label: "Agents", value: "10" }, { label: "Sub-Agents", value: "20+" }],
    },
    {
      id: "content-feature", title: "Content Library", description: "Browse, search, and filter AI-generated content across types: blog posts, social media, emails, landing pages, and ads.", icon: FileText, color: "text-blue-600", bg: "bg-blue-50", gradient: "from-blue-500 to-cyan-600",
      preview: <ContentPreview />,
      details: [{ label: "Types", value: "5" }, { label: "Content", value: "156" }],
    },
    {
      id: "leads-feature", title: "Leads & Appointments", description: "Full lead management with status tracking, lead scoring, appointment scheduling, CSV import, and Excel export.", icon: Users, color: "text-amber-600", bg: "bg-amber-50", gradient: "from-amber-500 to-orange-600",
      preview: <LeadsPreview />,
      details: [{ label: "Statuses", value: "6" }, { label: "Export", value: "CSV/XLSX" }],
    },
    {
      id: "admin-feature", title: "Multi-Tenant Admin", description: "Client workspace management with CRUD, per-client dashboards, metrics, branding colors, booking slugs, and status toggles.", icon: Shield, color: "text-purple-600", bg: "bg-purple-50", gradient: "from-purple-500 to-violet-600",
      preview: <AdminPreview />,
      details: [{ label: "Tenants", value: "Multi" }, { label: "Metrics", value: "Real-time" }],
    },
    {
      id: "settings-feature", title: "Settings & Integration", description: "Multi-provider LLM configuration (OpenAI, Gemini, Claude, OpenRouter), business profile, and availability settings.", icon: Settings, color: "text-slate-600", bg: "bg-slate-50", gradient: "from-slate-500 to-slate-600",
      preview: <SettingsPreview />,
      details: [{ label: "Providers", value: "4" }, { label: "Integrations", value: "3" }],
    },
    {
      id: "hierarchy-feature", title: "Org Hierarchy", description: "Full AI organizational chart with CEO, CFO, Analyst, Design, Developer, Sales departments — each with sub-agents, stats, and runnable workflows.", icon: Building2, color: "text-indigo-600", bg: "bg-indigo-50", gradient: "from-indigo-500 to-purple-600",
      preview: <HierarchyPreview />,
      details: [{ label: "Departments", value: "6" }, { label: "Sub-Agents", value: "20+" }],
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-20 max-w-7xl mx-auto">
      {/* Hero */}
      <section id="section-overview" data-section="overview" ref={(el) => { sectionRefs.current["overview"] = el; }}>
        <HeroSection />
      </section>

      {/* Sticky Section Nav */}
      <SectionNav active={activeSection} onSelect={scrollToSection} />

      {/* Quick Stats */}
      <section>
        <StatsStrip />
      </section>

      {/* Feature Sections */}
      {FEATURES.map((feature) => {
        const Icon = feature.icon;
        return (
          <section
            key={feature.id}
            id={`section-${feature.id.split("-")[0]}`}
            data-section={feature.id.split("-")[0]}
            ref={(el) => { sectionRefs.current[feature.id.split("-")[0]] = el; }}
            className="scroll-mt-24"
          >
            <div className="rounded-2xl border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800 overflow-hidden">
              {/* Feature Header */}
              <div className={clsx("bg-gradient-to-r px-6 py-5", feature.gradient)}>
                <div className="flex items-center gap-3">
                  <Icon className="h-6 w-6 text-white" />
                  <div>
                    <h2 className="text-lg font-bold text-white">{feature.title}</h2>
                    <p className="text-sm text-white/80">{feature.description}</p>
                  </div>
                </div>
              </div>

              {/* Feature Content */}
              <div className="p-6">
                {feature.preview}
              </div>
            </div>
          </section>
        );
      })}

      {/* Architecture */}
      <section id="section-architecture" data-section="architecture" ref={(el) => { sectionRefs.current["architecture"] = el; }} className="scroll-mt-24">
        <div className="rounded-2xl border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-700 to-slate-900 px-6 py-5">
            <div className="flex items-center gap-3">
              <Layers className="h-6 w-6 text-white" />
              <div>
                <h2 className="text-lg font-bold text-white">System Architecture</h2>
                <p className="text-sm text-white/80">Full-stack Next.js application with multi-provider AI orchestration</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <ArchitectureSection />
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section id="section-tech" data-section="tech" ref={(el) => { sectionRefs.current["tech"] = el; }} className="scroll-mt-24">
        <div className="rounded-2xl border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5">
            <div className="flex items-center gap-3">
              <Zap className="h-6 w-6 text-white" />
              <div>
                <h2 className="text-lg font-bold text-white">Tech Stack</h2>
                <p className="text-sm text-white/80">Modern tooling powering the MarketAI platform</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <TechStackSection />
          </div>
        </div>
      </section>

      {/* History & Activity */}
      <section id="section-history" data-section="history" ref={(el) => { sectionRefs.current["history"] = el; }} className="scroll-mt-24">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <AppointmentsCard />

          <div className="rounded-xl border border-surface-200 bg-white p-5 dark:border-surface-700 dark:bg-surface-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-surface-400" />
                <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100">Agent History</h4>
              </div>
              <button className="flex items-center gap-1 text-xs text-primary-600 font-medium">
                <RefreshCw className="h-3 w-3" /> Refresh
              </button>
            </div>
            <div className="space-y-1">
              {DEMO_AGENTS.slice(0, 5).map((a, i) => {
                const Icon = a.icon;
                return (
                  <div key={a.name} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-surface-50 dark:hover:bg-surface-700/50 transition-colors">
                    <div className={clsx("flex h-8 w-8 items-center justify-center rounded-lg", a.bg)}>
                      <Icon className={clsx("h-4 w-4", a.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-surface-900 dark:text-surface-100">{a.name}</p>
                      <p className="text-xs text-surface-400">{a.count} runs · Last ran {i + 1}h ago</p>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-3 w-3 mr-0.5" />
                      Completed
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Dark Mode Showcase */}
      <section id="section-theme" data-section="theme" ref={(el) => { sectionRefs.current["theme"] = el; }} className="scroll-mt-24">
        <div className="rounded-2xl border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5">
            <div className="flex items-center gap-3">
              <Sun className="h-6 w-6 text-white" />
              <Moon className="h-6 w-6 text-white" />
              <div>
                <h2 className="text-lg font-bold text-white">Dark Mode</h2>
                <p className="text-sm text-white/80">Built-in light/dark theme with live toggle, localStorage persistence, and system preference detection</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <DarkModeShowcase />
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <div className="rounded-2xl bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950 px-6 py-10 text-center">
        <Sparkles className="h-10 w-10 text-primary-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white">Ready to build with MarketAI?</h2>
        <p className="mt-2 text-sm text-white/60 max-w-lg mx-auto">
          This is a fully functional AI-powered marketing platform. Set up your API keys, configure your business profile, and start running agents.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <a
            href="/settings"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-primary-800 hover:bg-primary-50 transition-all shadow-lg"
          >
            <Settings className="h-4 w-4" />
            Configure Settings
          </a>
          <a
            href="/agents"
            className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition-all"
          >
            <Bot className="h-4 w-4" />
            Run Agents
          </a>
        </div>
      </div>
    </div>
  );
}


