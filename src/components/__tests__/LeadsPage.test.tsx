import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock PipelineAutoPilot to avoid interfering with test fetch mocks
vi.mock("../PipelineAutoPilot", () => ({
  default: () => null,
}));

// Mock lucide-react
vi.mock("lucide-react", () => {
  const icons: Record<string, unknown> = {};
  const names = [
    "Search", "Filter", "Plus", "ChevronDown", "ChevronRight", "MoreHorizontal",
    "Mail", "Phone", "Calendar", "CalendarCheck", "Star", "Target", "TrendingUp",
    "Users", "UserPlus", "UserCheck", "UserX", "MessageSquare", "ExternalLink",
    "Loader2", "Sparkles", "CheckCircle2", "AlertCircle", "XCircle", "Clock",
    "Download", "RefreshCw", "ArrowUpDown", "ArrowUp", "ArrowDown",
    "BarChart3", "PieChart", "Activity", "Upload", "FileSpreadsheet", "X",
    "MapPin", "Globe", "Zap", "Snowflake", "Flame", "Sun", "Layers",
  ];
  names.forEach((n) => {
    icons[n] = ({ className }: { className?: string }) =>
      <span data-testid={`icon-${n}`} className={className} />;
  });
  return icons;
});

// Mock fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

import LeadsPage from "../LeadsPage";

const mockLeads = [
  { id: "lead-1", name: "John Doe", email: "john@example.com", phone: "+1-555-0100", company: "Acme Corp", role: "CEO", status: "new", score: 45, source: "website", createdAt: "2025-05-28T10:00:00Z" },
  { id: "lead-2", name: "Jane Smith", email: "jane@example.com", phone: "+1-555-0101", company: "Beta Inc", role: "Director", status: "qualified", score: 82, source: "referral", createdAt: "2025-05-27T09:00:00Z" },
  { id: "lead-3", name: "Bob Johnson", email: "bob@example.com", phone: "+1-555-0102", company: "Gamma LLC", role: "Manager", status: "contacted", score: 65, source: "linkedin", createdAt: "2025-05-26T08:00:00Z" },
];

const mockAppointments: Array<Record<string, string>> = [];

describe("LeadsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockLeads,
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the page header", async () => {
    render(<LeadsPage />);
    const headerLeads = await screen.findAllByText(/Leads/i);
    expect(headerLeads.length).toBeGreaterThanOrEqual(1);
  });

  it("renders leads list after loading", async () => {
    render(<LeadsPage />);
    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
  });

  it("shows lead status badges", async () => {
    render(<LeadsPage />);
    await waitFor(() => {
      const newBadges = screen.getAllByText("New");
      expect(newBadges.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows search input", async () => {
    render(<LeadsPage />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search leads/i)).toBeInTheDocument();
    });
  });

  it("shows filter by status", async () => {
    render(<LeadsPage />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("All Status")).toBeInTheDocument();
    });
  });

  it("shows appointments toggle", async () => {
    const user = userEvent.setup();
    render(<LeadsPage />);
    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    const appointmentsButtons = screen.getAllByText(/Appointments/i);
    await user.click(appointmentsButtons[0]);
  });

  it("shows lead status values (status labels)", async () => {
    render(<LeadsPage />);
    await waitFor(() => {
      expect(screen.getByText("New")).toBeInTheDocument();
    });
    const qualifiedElements = screen.getAllByText("Qualified");
    expect(qualifiedElements.length).toBeGreaterThanOrEqual(1);
    const contactedElements = screen.getAllByText("Contacted");
    expect(contactedElements.length).toBeGreaterThanOrEqual(1);
  });

  it("shows lead scores", async () => {
    render(<LeadsPage />);
    await waitFor(() => {
      const scoreElements = screen.getAllByText("82");
      expect(scoreElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows export button", async () => {
    render(<LeadsPage />);
    await waitFor(() => {
      expect(screen.getByText(/Export/i)).toBeInTheDocument();
    });
  });

  it("renders with correct section title", async () => {
    const { container } = render(<LeadsPage />);
    await screen.findAllByText(/Leads/i);
    expect(container.querySelector("h2")).toBeInTheDocument();
  });

  it("handles API errors without crashing", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    render(<LeadsPage />);
    await waitFor(() => {
      expect(screen.getByText(/Export/i)).toBeInTheDocument();
    });
  });

  it("shows Scrape from Maps button", async () => {
    render(<LeadsPage />);
    await waitFor(() => {
      expect(screen.getByText(/Scrape from Maps/i)).toBeInTheDocument();
    });
  });

  it("opens Google Maps scrape modal when button clicked", async () => {
    const user = userEvent.setup();
    render(<LeadsPage />);

    const scrapeButton = await screen.findByText(/Scrape from Maps/i);
    await user.click(scrapeButton);

    expect(screen.getByText(/Scrape Leads from Google Maps/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/wellness clinic, yoga studio/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/San Francisco, California/i)).toBeInTheDocument();
  });

  it("closes Google Maps scrape modal when X clicked", async () => {
    const user = userEvent.setup();
    render(<LeadsPage />);

    const scrapeButton = await screen.findByText(/Scrape from Maps/i);
    await user.click(scrapeButton);
    expect(screen.getByText(/Scrape Leads from Google Maps/i)).toBeInTheDocument();

    const closeButtons = screen.getAllByRole("button");
    const xButton = Array.from(closeButtons).find(
      (btn) => btn.querySelector('[data-testid="icon-X"]')
    );
    if (xButton) await user.click(xButton);

    await waitFor(() => {
      expect(screen.queryByText(/Scrape Leads from Google Maps/i)).not.toBeInTheDocument();
    });
  });
});
