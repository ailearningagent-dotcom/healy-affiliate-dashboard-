import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// Mock lucide-react
vi.mock("lucide-react", () => {
  const icons: Record<string, unknown> = {};
  const names = [
    "ArrowLeft", "Users", "Calendar", "CalendarCheck", "Star", "Target",
    "TrendingUp", "Mail", "Phone", "Globe", "Palette", "ExternalLink",
    "Eye", "Clock", "ChevronRight", "Sparkles", "AlertCircle", "Loader2",
    "CalendarDays", "BarChart3", "PieChart", "Activity", "UserCheck", "Zap",
    "Settings", "X", "CheckCircle2", "Save", "Power", "PowerOff",
  ];
  names.forEach((n) => {
    icons[n] = ({ className }: { className?: string }) =>
      <span data-testid={`icon-${n}`} className={className} />;
  });
  return icons;
});

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "client-1" }),
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

import AdminClientDashboard from "../AdminClientDashboard";

const mockClientData = {
  id: "client-1",
  name: "Acme Corporation",
  slug: "acme-corp",
  email: "contact@acme.com",
  company: "Acme Corp",
  industry: "Technology",
  status: "active",
  isActive: true,
  primaryColor: "#6366f1",
  createdAt: "2025-01-15T00:00:00Z",
  metrics: {
    totalLeads: 45,
    qualifiedLeads: 18,
    appointmentsScheduled: 12,
    appointmentsCompleted: 8,
    totalAppointments: 12,
    conversionRate: 18.5,
  },
  analytics: {
    statusDistribution: { new: 10, contacted: 15, qualified: 8, appointment_scheduled: 5, closed: 3, lost: 4 },
    pipelineDistribution: { sourced: 20, contacted: 10, nurturing: 5, warm: 3, hot: 2 },
    sourceBreakdown: { manual: 15, directory: 10, apollo: 8, linkedin: 5, referral: 4, website: 3 },
    appointmentStatusDist: { scheduled: 5, completed: 8, cancelled: 2, no_show: 1 },
    appointmentTypeDist: { discovery: 6, consultation: 4, follow_up: 2 },
  },
  leads: [
    { id: "lead-1", name: "John Doe", role: "CEO", company: "Acme Corp", status: "qualified", score: 85, email: "john@acme.com", phone: "+1-555-0100" },
    { id: "lead-2", name: "Jane Smith", role: "Director", company: "Beta Inc", status: "contacted", score: 72, email: "jane@beta.com" },
  ],
  appointments: [
    { id: "apt-1", leadName: "John Doe", leadCompany: "Acme Corp", dateTime: "2025-06-01T10:00:00Z", status: "scheduled", type: "discovery", notes: "" },
    { id: "apt-2", leadName: "Jane Smith", leadCompany: "Beta Inc", dateTime: "2025-05-28T14:00:00Z", status: "completed", type: "consultation", notes: "Discussed pricing" },
  ],
  upcomingAppointments: [{ id: "apt-1", leadName: "John Doe", leadCompany: "Acme Corp", dateTime: "2025-06-01T10:00:00Z", status: "scheduled", type: "discovery" }],
  recentLeads: [
    { id: "lead-1", name: "John Doe", role: "CEO", company: "Acme Corp", status: "qualified", score: 85, email: "john@acme.com" },
    { id: "lead-2", name: "Jane Smith", role: "Director", company: "Beta Inc", status: "contacted", score: 72, email: "jane@beta.com" },
  ],
};

describe("AdminClientDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockClientData,
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders client information after loading", async () => {
    render(<AdminClientDashboard />);
    await waitFor(() => {
      expect(screen.getByText("Acme Corporation")).toBeInTheDocument();
    });
    expect(screen.getByText("contact@acme.com")).toBeInTheDocument();
  });

  it("shows client status badge", async () => {
    render(<AdminClientDashboard />);
    await waitFor(() => {
      expect(screen.getByText("Active")).toBeInTheDocument();
    });
  });

  it("renders hero stats after loading", async () => {
    render(<AdminClientDashboard />);
    await waitFor(() => {
      const leadElements = screen.getAllByText("45");
      expect(leadElements.length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("shows industry and company info", async () => {
    render(<AdminClientDashboard />);
    await waitFor(() => {
      const acmeElements = screen.getAllByText("Acme Corp");
      expect(acmeElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows upcoming appointments", async () => {
    render(<AdminClientDashboard />);
    await waitFor(() => {
      const elements = screen.getAllByText(/John Doe/i);
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows recent leads", async () => {
    render(<AdminClientDashboard />);
    await waitFor(() => {
      const elements = screen.getAllByText(/Jane Smith/i);
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows client created date", async () => {
    render(<AdminClientDashboard />);
    await waitFor(() => {
      expect(screen.getByText(/Jan 15, 2025/i)).toBeInTheDocument();
    });
  });
});
