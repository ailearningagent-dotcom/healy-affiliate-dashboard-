"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Bot,
  FileText,
  Users,
  Calendar,
  CalendarDays,
  Settings,
  Sparkles,
  Building2,
  History,
  Moon,
  Sun,
  Menu,
  X,
  Shield,
  Monitor,
  Play,
} from "lucide-react";
import { useTheme } from "@/lib/theme-context";
import clsx from "clsx";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/hierarchy", label: "Org Hierarchy", icon: Building2 },
  { href: "/agents", label: "AI Agents", icon: Bot },
  { href: "/history", label: "Agent History", icon: History },
  { href: "/content", label: "Content Library", icon: FileText },
  { href: "/leads", label: "Leads & Appointments", icon: Users },
  { href: "/admin/clients", label: "Admin", icon: Shield },
  { href: "/admin/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/showcase", label: "Showcase", icon: Monitor },
  { href: "/agents/playground", label: "Playground", icon: Play },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Navigation() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [leadCount, setLeadCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    async function loadLeads() {
      try {
        const res = await fetch("/api/leads");
        const leads = await res.json();
        if (Array.isArray(leads)) {
          const qualified = leads.filter(
            (l: { status: string }) => l.status === "new" || l.status === "qualified"
          );
          setLeadCount(qualified.length);
        }
      } catch {
        // Ignore errors
      }
    }
    loadLeads();
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-surface-200 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 shadow-sm">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-surface-900">MarketAI</h1>
          <p className="text-xs text-surface-500">Marketing Agents</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-4">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary-50 text-primary-700 shadow-sm"
                  : "text-surface-600 hover:bg-surface-50 hover:text-surface-900"
              )}
            >
              <Icon
                className={clsx(
                  "h-4.5 w-4.5 transition-colors",
                  isActive ? "text-primary-600" : "text-surface-400"
                )}
              />
              {item.label}
              {item.href === "/leads" && leadCount > 0 && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-500 px-1.5 text-[11px] font-medium text-white">
                  {leadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: Theme toggle + consultations */}
      <div className="absolute bottom-0 left-0 right-0 space-y-2 p-4">
        <button
          onClick={toggleTheme}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-surface-600 hover:bg-surface-50 hover:text-surface-900 transition-all duration-200"
        >
          {theme === "dark" ? (
            <Sun className="h-4.5 w-4.5 text-surface-400" />
          ) : (
            <Moon className="h-4.5 w-4.5 text-surface-400" />
          )}
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </button>

        <div className="flex items-center gap-3 rounded-lg bg-gradient-to-r from-primary-50 to-accent-50 p-3">
          <Calendar className="h-5 w-5 text-primary-600" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-surface-900">Free consultations</p>
            <p className="text-[11px] text-surface-500">available to book</p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 shadow-sm lg:hidden"
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5 text-surface-600" />
      </button>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar (slide-in) */}
      <aside
        className={clsx(
          "fixed left-0 top-0 z-50 h-screen w-72 border-r border-surface-200 bg-white dark:bg-surface-900 transition-transform duration-300 ease-in-out lg:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800"
          aria-label="Close sidebar"
        >
          <X className="h-4 w-4 text-surface-500" />
        </button>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 border-r border-surface-200 bg-white dark:bg-surface-900 dark:border-surface-700 lg:block">
        {sidebarContent}
      </aside>
    </>
  );
}
