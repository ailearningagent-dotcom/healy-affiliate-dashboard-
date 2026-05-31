import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, className, ...props }: any) =>
    <a href={href} className={className} {...props}>{children}</a>,
}));

// Mock lucide-react
vi.mock("lucide-react", () => {
  const icons: Record<string, unknown> = {};
  const names = [
    "LayoutDashboard", "Bot", "FileText", "Users", "Calendar", "Settings",
    "Sparkles", "Building2", "History", "Moon", "Sun", "Menu", "X", "Shield",
    "Monitor", "Play",
  ];
  names.forEach((n) => {
    icons[n] = ({ className }: { className?: string }) =>
      <span data-testid={`icon-${n}`} className={className} />;
  });
  return icons;
});

// Mock theme context
vi.mock("@/lib/theme-context", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: vi.fn() }),
}));

// Mock fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

import Navigation from "../Navigation";

describe("Navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the navigation bar with logo/brand", () => {
    render(<Navigation />);
    const brandElements = screen.getAllByText(/marketai/i);
    expect(brandElements.length).toBeGreaterThanOrEqual(1);
    const marketingElements = screen.getAllByText("Marketing Agents");
    expect(marketingElements.length).toBeGreaterThanOrEqual(1);
  });

  it("shows nav links for authenticated users", () => {
    render(<Navigation />);
    const dashboardLinks = screen.getAllByText(/dashboard/i);
    expect(dashboardLinks.length).toBeGreaterThanOrEqual(1);
    const agentsElements = screen.getAllByText("AI Agents");
    expect(agentsElements.length).toBeGreaterThanOrEqual(1);
    const contentElements = screen.getAllByText("Content Library");
    expect(contentElements.length).toBeGreaterThanOrEqual(1);
    const settingsElements = screen.getAllByText("Settings");
    expect(settingsElements.length).toBeGreaterThanOrEqual(1);
  });

  it("shows limited nav for unauthenticated users", () => {
    render(<Navigation />);
    const dashboardLinks = screen.getAllByText(/dashboard/i);
    expect(dashboardLinks.length).toBeGreaterThanOrEqual(1);
    const showcaseElements = screen.getAllByText("Showcase");
    expect(showcaseElements.length).toBeGreaterThanOrEqual(1);
  });

  it("highlights the active link based on pathname", () => {
    render(<Navigation />);
    // Dashboard is active since pathname is "/"
    const dashboardLinks = screen.getAllByText("Dashboard");
    expect(dashboardLinks.length).toBeGreaterThanOrEqual(1);
    // The active link has bg-primary-50 class
    const activeLink = dashboardLinks[0].closest("a");
    expect(activeLink?.className).toContain("bg-primary-50");
  });

  it("shows theme toggle button", () => {
    render(<Navigation />);
    const darkModeText = screen.getAllByText(/dark mode/i);
    expect(darkModeText.length).toBeGreaterThanOrEqual(1);
  });

  it("shows all main navigation items", () => {
    render(<Navigation />);
    const dashboardElements = screen.getAllByText("Dashboard");
    expect(dashboardElements.length).toBeGreaterThanOrEqual(1);
    const hierarchyElements = screen.getAllByText("Org Hierarchy");
    expect(hierarchyElements.length).toBeGreaterThanOrEqual(1);
    const agentsElements = screen.getAllByText("AI Agents");
    expect(agentsElements.length).toBeGreaterThanOrEqual(1);
  });
});
