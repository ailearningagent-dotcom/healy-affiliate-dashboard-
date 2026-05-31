import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// Mock lucide-react
vi.mock("lucide-react", () => {
  const icons: Record<string, unknown> = {};
  const names = [
    "Users", "CalendarCheck", "FileText", "TrendingUp",    "Activity", "Target",
    "Mail", "BarChart3", "Crown", "DollarSign", "Search", "Palette",
    "Building2", "ArrowUpRight", "ArrowDownRight", "Snowflake", "Flame", "Sun",
  ];
  names.forEach((n) => {
    icons[n] = ({ className }: { className?: string }) =>
      <span data-testid={`icon-${n}`} className={className} />;
  });
  return icons;
});

// Mock recharts
vi.mock("recharts", () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  AreaChart: ({ children }: { children: React.ReactNode }) => <svg data-testid="area-chart">{children}</svg>,
  Area: () => <div data-testid="area" />,
  RadarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="radar-chart">{children}</div>,
  PolarGrid: () => <div data-testid="polar-grid" />,
  PolarAngleAxis: () => <div data-testid="polar-angle-axis" />,
  PolarRadiusAxis: () => <div data-testid="polar-radius-axis" />,
  Radar: () => <div data-testid="radar" />,
  Legend: () => <div data-testid="legend" />,
}));

// Mock fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

import Dashboard from "../Dashboard";

const mockDashboardData = {
  metrics: {
    totalLeads: 245,
    qualifiedLeads: 89,
    appointmentsScheduled: 42,
    appointmentsCompleted: 28,
    contentGenerated: 156,
    outreachSent: 1247,
    leadsSourcedThisWeek: 35,
    activeNurtureSequences: 6,
    conversionRate: 18.5,
    recentActivity: [
      { id: "1", type: "content", description: "New lead: Acme Corp", timestamp: "2025-05-30T10:00:00Z", status: "completed" },
      { id: "2", type: "appointment", description: "Appointment with John Doe", timestamp: "2025-05-30T09:30:00Z" },
      { id: "3", type: "sales", description: "Sales agent finished outreach", timestamp: "2025-05-30T09:00:00Z" },
    ],
    teamMetrics: null,
  },
};

describe("Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockDashboardData,
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders dashboard header", async () => {
    render(<Dashboard />);
    expect(await screen.findByText("Dashboard")).toBeInTheDocument();
  });

  it("renders KPI cards after data loads", async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText("89")).toBeInTheDocument(); // Qualified Leads
    });
    expect(screen.getByText("42")).toBeInTheDocument(); // Appointments
    expect(screen.getByText("156")).toBeInTheDocument(); // Content Pieces
    // 1247 may render with or without comma depending on locale
    const outreachElements = screen.getAllByText(/124/);
    expect(outreachElements.length).toBeGreaterThanOrEqual(1);
  });

  it("renders KPI card labels", async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/qualified leads/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/appointments/i)).toBeInTheDocument();
    expect(screen.getByText(/content pieces/i)).toBeInTheDocument();
    expect(screen.getByText(/outreach sent/i)).toBeInTheDocument();
  });

  it("renders recent activity section", async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/New lead: Acme Corp/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Appointment with John Doe/i)).toBeInTheDocument();
    expect(screen.getByText(/Sales agent finished outreach/i)).toBeInTheDocument();
  });

  it("renders secondary metric cards", async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText("245")).toBeInTheDocument(); // Total Leads
    });
    expect(screen.getByText("28")).toBeInTheDocument(); // Completed Meetings
    expect(screen.getByText("18.5%")).toBeInTheDocument(); // Conversion Rate
  });

  it("renders org team section when teamMetrics provided", async () => {
    const dataWithTeam = {
      metrics: {
        ...mockDashboardData.metrics,
        teamMetrics: {
          departments: [
            { name: "Executive Office", status: "operational", taskCount: 12, performance: 94 },
            { name: "Finance Department", status: "operational", taskCount: 8, performance: 87 },
          ],
        },
      },
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => dataWithTeam,
    } as Response);

    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText(/Executive Office/i)).toBeInTheDocument();
    });
  });

  it("handles fetch error gracefully without crashing", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    const { container } = render(<Dashboard />);
    await waitFor(() => {
      expect(container.querySelector("h2")).toBeInTheDocument();
    });
  });
});
