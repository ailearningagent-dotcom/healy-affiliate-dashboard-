"use client";

import { useEffect, useState } from "react";
import {
  Users,
  CalendarCheck,
  FileText,
  TrendingUp,
  Activity,
  Target,
  Mail,
  BarChart3,
  Crown,
  DollarSign,
  Search,
  Palette,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Snowflake,
  Flame,
  Sun,
} from "lucide-react";
import type { DashboardMetrics, TeamSummary } from "@/lib/agents/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";
import clsx from "clsx";

const DEFAULT_METRICS: DashboardMetrics = {
  totalLeads: 0,
  qualifiedLeads: 0,
  appointmentsScheduled: 0,
  appointmentsCompleted: 0,
  contentGenerated: 0,
  outreachSent: 0,
  leadsSourcedThisWeek: 0,
  activeNurtureSequences: 0,
  conversionRate: 0,
  recentActivity: [],
  teamMetrics: null,
  coldLeads: 0,
  warmLeads: 0,
  hotLeads: 0,
};

const KPI_CARDS = [
  {
    key: "qualifiedLeads" as const,
    label: "Qualified Leads",
    icon: Target,
    color: "text-violet-600",
    bg: "bg-violet-50",
    trend: "+12%",
  },
  {
    key: "appointmentsScheduled" as const,
    label: "Appointments",
    icon: CalendarCheck,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    trend: "+8%",
  },
  {
    key: "contentGenerated" as const,
    label: "Content Pieces",
    icon: FileText,
    color: "text-blue-600",
    bg: "bg-blue-50",
    trend: "+24%",
  },
  {
    key: "outreachSent" as const,
    label: "Outreach Sent",
    icon: Mail,
    color: "text-amber-600",
    bg: "bg-amber-50",
    trend: "+18%",
  },
];

const DEPT_ICONS: Record<string, React.ElementType> = {
  "Executive Office": Crown,
  "Finance Department": DollarSign,
  "Data & Research": Search,
  "Creative Studio": Palette,
  "Sales Development": TrendingUp,
};

const DEPT_COLORS: Record<string, string> = {
  "Executive Office": "bg-purple-50 text-purple-700",
  "Finance Department": "bg-emerald-50 text-emerald-700",
  "Data & Research": "bg-blue-50 text-blue-700",
  "Creative Studio": "bg-pink-50 text-pink-700",
  "Sales Development": "bg-amber-50 text-amber-700",
};

const DEPT_BAR_COLORS: Record<string, string> = {
  "Executive Office": "bg-purple-500",
  "Finance Department": "bg-emerald-500",
  "Data & Research": "bg-blue-500",
  "Creative Studio": "bg-pink-500",
  "Sales Development": "bg-amber-500",
};

function MetricCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
  trend,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bg: string;
  trend: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-surface-200 bg-white p-5 transition-all duration-200 hover:shadow-md hover:border-surface-300">
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wider text-surface-400">
            {label}
          </p>
          <p className="text-2xl font-bold text-surface-900">{value}</p>
        </div>
        <div className={clsx("flex h-10 w-10 items-center justify-center rounded-lg", bg)}>
          <Icon className={clsx("h-5 w-5", color)} />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1">
        <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
        <span className="text-xs font-medium text-emerald-600">{trend}</span>
        <span className="text-xs text-surface-400">vs last month</span>
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-surface-50 opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
}

function OrgTeamSection({ team }: { team: TeamSummary | null }) {
  if (!team) return null;

  return (
    <div className="rounded-xl border border-surface-200 bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-surface-500" />
          <h3 className="text-sm font-semibold text-surface-900">AI Org Team</h3>
        </div>
        <button
          onClick={() => (window.location.href = "/hierarchy")}
          className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
        >
          View hierarchy
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {team.departments.map((dept) => {
          const DeptIcon = DEPT_ICONS[dept.name] ?? Building2;
          const colorClass = DEPT_COLORS[dept.name] ?? "bg-surface-50 text-surface-600";
          const barColor = DEPT_BAR_COLORS[dept.name] ?? "bg-surface-500";
          const statusColor =
            dept.status === "operational"
              ? "bg-emerald-500"
              : dept.status === "busy"
                ? "bg-amber-500"
                : "bg-surface-300";

          return (
            <div
              key={dept.name}
              className="rounded-lg border border-surface-200 bg-white p-3 transition-all hover:shadow-sm"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={clsx("flex h-7 w-7 items-center justify-center rounded-md", colorClass.split(" ")[0])}>
                  <DeptIcon className={clsx("h-3.5 w-3.5", colorClass.split(" ")[1])} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-surface-900 truncate">{dept.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className={clsx("h-1.5 w-1.5 rounded-full", statusColor)} />
                    <span className="text-[10px] text-surface-400 capitalize">{dept.status}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-surface-500">Tasks: {dept.taskCount}</span>
                  <span className="text-surface-500">{dept.performance}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-100 overflow-hidden">
                  <div
                    className={clsx("h-full rounded-full transition-all duration-500", barColor)}
                    style={{ width: `${dept.performance}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActivityFeed({ activities }: { activities: DashboardMetrics["recentActivity"] }) {
  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Activity className="mb-3 h-10 w-10 text-surface-300" />
        <p className="text-sm font-medium text-surface-500">No recent activity</p>
        <p className="text-xs text-surface-400 mt-1">
          Start using AI agents to see activity here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {activities.map((activity, i) => (
        <div
          key={activity.id}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-50 animate-slide-up"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <div
            className={clsx(
              "flex h-8 w-8 items-center justify-center rounded-full",
              activity.type === "content" || activity.type === "design"
                ? "bg-blue-50 text-blue-600"
                : activity.type === "research" || activity.type === "analyst"
                  ? "bg-violet-50 text-violet-600"
                  : activity.type === "outreach" || activity.type === "sales"
                    ? "bg-amber-50 text-amber-600"
                    : activity.type === "appointment"
                      ? "bg-emerald-50 text-emerald-600"
                      : activity.type === "ceo"
                        ? "bg-purple-50 text-purple-600"
                        : activity.type === "cfo"
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-surface-100 text-surface-600"
            )}
          >
            {activity.type === "content" ? (
              <FileText className="h-4 w-4" />
            ) : activity.type === "research" || activity.type === "analyst" ? (
              <Target className="h-4 w-4" />
            ) : activity.type === "outreach" || activity.type === "sales" ? (
              <Mail className="h-4 w-4" />
            ) : activity.type === "ceo" ? (
              <Crown className="h-4 w-4" />
            ) : activity.type === "cfo" ? (
              <DollarSign className="h-4 w-4" />
            ) : activity.type === "design" ? (
              <Palette className="h-4 w-4" />
            ) : (
              <Activity className="h-4 w-4" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-surface-700 truncate">{activity.description}</p>
            <p className="text-xs text-surface-400">
              {new Date(activity.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          {activity.status && (
            <span
              className={clsx(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                activity.status === "completed"
                  ? "bg-emerald-50 text-emerald-700"
                  : activity.status === "error"
                    ? "bg-red-50 text-red-700"
                    : "bg-amber-50 text-amber-700"
              )}
            >
              {activity.status}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>(DEFAULT_METRICS);

  useEffect(() => {
    async function loadMetrics() {
      try {
        const res = await fetch("/api/dashboard");
        const data = await res.json();
        setMetrics(data.metrics);
      } catch {
        // Use default metrics on error
      }
    }
    loadMetrics();
    const interval = setInterval(loadMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  // Generate chart data from metrics
  const leadPipelineData = [
    { name: "Total", value: metrics.totalLeads, fill: "#6366f1" },
    { name: "Qualified", value: metrics.qualifiedLeads, fill: "#22c55e" },
    { name: "Appt.", value: metrics.appointmentsScheduled, fill: "#3b82f6" },
    { name: "Completed", value: metrics.appointmentsCompleted, fill: "#a855f7" },
  ];

  const agentActivityData = [
    { name: "Content", value: metrics.contentGenerated, fill: "#3b82f6" },
    { name: "Outreach", value: metrics.outreachSent, fill: "#f59e0b" },
    { name: "Leads", value: metrics.leadsSourcedThisWeek, fill: "#6366f1" },
    { name: "Nurture", value: metrics.activeNurtureSequences, fill: "#22c55e" },
  ];

  const deptRadarData = metrics.teamMetrics?.departments.map((d) => ({
    department: d.name.split(" ")[0],
    performance: d.performance,
    tasks: Math.min(d.taskCount * 20, 100),
  })) ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-surface-900">Dashboard</h2>
        <p className="text-sm text-surface-500 mt-1">
          Overview of your AI marketing performance
        </p>
      </div>

      {/* KPI Cards */}
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPI_CARDS.map((card) => (
          <MetricCard
            key={card.key}
            label={card.label}
            value={metrics[card.key]}
            icon={card.icon}
            color={card.color}
            bg={card.bg}
            trend={card.trend}
          />
        ))}
      </div>

      {/* Temperature Breakdown */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="group relative overflow-hidden rounded-xl border border-surface-200 bg-white p-5 transition-all duration-200 hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wider text-surface-400">Cold Leads</p>
              <p className="text-2xl font-bold text-blue-600">{metrics.coldLeads}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Snowflake className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-surface-100 overflow-hidden">
            <div className="h-full rounded-full bg-blue-500 transition-all" style={{width: `${metrics.totalLeads > 0 ? (metrics.coldLeads / metrics.totalLeads) * 100 : 0}%`}} />
          </div>
          <p className="mt-2 text-xs text-surface-400">Needs initial outreach</p>
        </div>

        <div className="group relative overflow-hidden rounded-xl border border-surface-200 bg-white p-5 transition-all duration-200 hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wider text-surface-400">Warm Leads</p>
              <p className="text-2xl font-bold text-amber-600">{metrics.warmLeads}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <Sun className="h-5 w-5 text-amber-600" />
            </div>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-surface-100 overflow-hidden">
            <div className="h-full rounded-full bg-amber-500 transition-all" style={{width: `${metrics.totalLeads > 0 ? (metrics.warmLeads / metrics.totalLeads) * 100 : 0}%`}} />
          </div>
          <p className="mt-2 text-xs text-surface-400">Engaged — follow up active</p>
        </div>

        <div className="group relative overflow-hidden rounded-xl border border-surface-200 bg-white p-5 transition-all duration-200 hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wider text-surface-400">Hot Leads</p>
              <p className="text-2xl font-bold text-rose-600">{metrics.hotLeads}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50">
              <Flame className="h-5 w-5 text-rose-600" />
            </div>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-surface-100 overflow-hidden">
            <div className="h-full rounded-full bg-rose-500 transition-all" style={{width: `${metrics.totalLeads > 0 ? (metrics.hotLeads / metrics.totalLeads) * 100 : 0}%`}} />
          </div>
          <p className="mt-2 text-xs text-surface-400">Ready to convert — high priority</p>
        </div>
      </div>

      {/* Charts Row 1 — Lead Pipeline + Agent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Lead Pipeline Bar Chart */}
        <div className="rounded-xl border border-surface-200 bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-surface-500" />
              <h3 className="text-sm font-semibold text-surface-900">Lead Pipeline</h3>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height={256}>
              <BarChart data={leadPipelineData} barSize={48}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Agent Activity Area Chart */}
        <div className="rounded-xl border border-surface-200 bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-surface-500" />
              <h3 className="text-sm font-semibold text-surface-900">Agent Activity</h3>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height={256}>
              <AreaChart data={agentActivityData}>
                <defs>
                  <linearGradient id="activityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                  }}
                />
                <Area type="monotone" dataKey="value" stroke="#6366f1" fill="url(#activityGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 — Department Radar + KPIs */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Department Radar Chart */}
        <div className="rounded-xl border border-surface-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-surface-500" />
            <h3 className="text-sm font-semibold text-surface-900">Dept. Performance</h3>
          </div>
          <div className="h-56 w-full">
            {deptRadarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={224}>
                <RadarChart data={deptRadarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="department" tick={{ fontSize: 10, fill: "#64748b" }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: "#94a3b8" }} />
                  <Radar name="Performance" dataKey="performance" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
                  <Radar name="Task Load" dataKey="tasks" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-surface-400">
                No department data yet
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl border border-surface-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-surface-900 mb-4">Quick Actions</h3>
          <div className="space-y-2">
            {[
              { label: "🧠 CEO — Set Strategy", type: "ceo", color: "bg-purple-50 text-purple-700 hover:bg-purple-100" },
              { label: "💰 CFO — Budget Plan", type: "cfo", color: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" },
              { label: "📊 Analyst — Find Leads", type: "analyst", color: "bg-blue-50 text-blue-700 hover:bg-blue-100" },
              { label: "🎨 Design — Create Assets", type: "design", color: "bg-pink-50 text-pink-700 hover:bg-pink-100" },
              { label: "📈 Sales — Book Consults", type: "sales", color: "bg-amber-50 text-amber-700 hover:bg-amber-100" },
            ].map((action) => (
              <button
                key={action.label}
                onClick={() => {
                  window.location.href = "/hierarchy";
                }}
                className={clsx(
                  "w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-all duration-200",
                  action.color
                )}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* Org Team Section */}
        <div className="rounded-xl border border-surface-200 bg-white p-5">
          <OrgTeamSection team={metrics.teamMetrics ?? null} />
        </div>
      </div>

      {/* Secondary Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-surface-200 bg-white p-5">
          <div className="flex items-center gap-2 text-surface-500 mb-2">
            <Users className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Total Leads</span>
          </div>
          <p className="text-2xl font-bold text-surface-900">{metrics.totalLeads}</p>
          <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
            <ArrowUpRight className="h-3 w-3" /> +12% this month
          </div>
        </div>
        <div className="rounded-xl border border-surface-200 bg-white p-5">
          <div className="flex items-center gap-2 text-surface-500 mb-2">
            <CalendarCheck className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Completed Meetings</span>
          </div>
          <p className="text-2xl font-bold text-surface-900">{metrics.appointmentsCompleted}</p>
          <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
            <ArrowUpRight className="h-3 w-3" /> +8% this month
          </div>
        </div>
        <div className="rounded-xl border border-surface-200 bg-white p-5">
          <div className="flex items-center gap-2 text-surface-500 mb-2">
            <BarChart3 className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Conversion Rate</span>
          </div>
          <p className="text-2xl font-bold text-surface-900">{metrics.conversionRate}%</p>
          <div className={clsx("mt-2 flex items-center gap-1 text-xs", metrics.conversionRate >= 15 ? "text-emerald-600" : "text-amber-600")}>
            {metrics.conversionRate >= 15 ? (
              <><ArrowUpRight className="h-3 w-3" /> Above average</>
            ) : (
              <><ArrowDownRight className="h-3 w-3" /> Below target</>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl border border-surface-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-surface-900">Recent Activity</h3>
          <button
            onClick={() => (window.location.href = "/history")}
            className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
          >
            View all history
          </button>
        </div>
        <ActivityFeed activities={metrics.recentActivity} />
      </div>
    </div>
  );
}
