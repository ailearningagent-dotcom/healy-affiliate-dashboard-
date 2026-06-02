import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock lucide-react
vi.mock("lucide-react", () => {
  const icons: Record<string, unknown> = {};
  const names = [
    "Search", "Plus", "ChevronDown", "MoreHorizontal", "Mail", "Phone",
    "Calendar", "ExternalLink", "Sparkles", "CheckCircle2", "XCircle",
    "AlertCircle", "Loader2", "Filter", "Building2", "Users", "ArrowUpDown",
    "ArrowUp", "ArrowDown", "Eye", "Edit", "Trash2", "X", "Power", "PowerOff",
    "BarChart3", "ChevronRight", "Globe", "Palette", "CalendarCheck", "ArrowRight",
  ];
  names.forEach((n) => {
    icons[n] = ({ className }: { className?: string }) =>
      <span data-testid={`icon-${n}`} className={className} />;
  });
  return icons;
});

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, className, ...props }: any) =>
    <a href={href} className={className} {...props}>{children}</a>,
}));

// Client data
const mockClient = {
  id: "client-1", name: "Alpha Corp", slug: "alpha-corp", email: "admin@alpha.com",
  company: "Alpha Corp", industry: "Technology", status: "active", isActive: true,
  primaryColor: "#6366f1", createdAt: "2025-01-15T00:00:00Z",
  metrics: { totalLeads: 45, qualifiedLeads: 18, appointmentsScheduled: 12, appointmentsCompleted: 8 },
};
const mockClient2 = {
  id: "client-2", name: "Beta LLC", slug: "beta-llc", email: "info@beta.com",
  company: "Beta LLC", industry: "Healthcare", status: "active", isActive: true,
  primaryColor: "#06b6d4", createdAt: "2025-02-20T00:00:00Z",
  metrics: { totalLeads: 32, qualifiedLeads: 14, appointmentsScheduled: 9, appointmentsCompleted: 6 },
};
const mockClient3 = {
  id: "client-3", name: "Gamma LLC", slug: "gamma-llc", email: "hello@gamma.com",
  company: "Gamma LLC", industry: "Finance", status: "active", isActive: true,
  primaryColor: "#f59e0b", createdAt: "2025-03-10T00:00:00Z",
  metrics: { totalLeads: 67, qualifiedLeads: 29, appointmentsScheduled: 21, appointmentsCompleted: 15 },
};
const mockClients = [mockClient, mockClient2, mockClient3];

// Mock fetch - return proper data per URL
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

import AdminClientsPage from "../AdminClientsPage";

// Detail data per client
const clientDetails: Record<string, unknown> = {
  "client-1": { ...mockClient, leads: [], appointments: [] },
  "client-2": { ...mockClient2, leads: [], appointments: [] },
  "client-3": { ...mockClient3, leads: [], appointments: [] },
};

describe("AdminClientsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Return correct data based on URL
    mockFetch.mockImplementation((url: string) => {
      if (url === "/api/admin/clients") {
        return Promise.resolve({
          ok: true,
          json: async () => mockClients,
        } as Response);
      }
      // Detail fetch: extract client ID from URL
      const idMatch = url.match(/\/api\/admin\/clients\/(.+)/);
      const clientId = idMatch ? idMatch[1] : "client-1";
      return Promise.resolve({
        ok: true,
        json: async () => clientDetails[clientId] || mockClient,
      } as Response);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the page header", async () => {
    render(<AdminClientsPage />);
    await waitFor(() => {
      expect(screen.getByText("Clients")).toBeInTheDocument();
    });
  });

  it("renders client cards after loading", async () => {
    render(<AdminClientsPage />);
    await waitFor(() => {
      const gammaElements = screen.getAllByText("Gamma LLC");
      expect(gammaElements.length).toBeGreaterThanOrEqual(1);
    });
    const alphaElements = screen.getAllByText("Alpha Corp");
    expect(alphaElements.length).toBeGreaterThanOrEqual(1);
    const betaElements = screen.getAllByText("Beta LLC");
    expect(betaElements.length).toBeGreaterThanOrEqual(1);
  });

  it("shows client emails in detail panel", async () => {
    const user = userEvent.setup();
    render(<AdminClientsPage />);
    await waitFor(() => {
      expect(screen.getByText("Clients")).toBeInTheDocument();
    });
    // Click on Alpha Corp card to open detail panel
    const alphaCards = screen.getAllByText("Alpha Corp");
    await user.click(alphaCards[0]);
    await waitFor(() => {
      expect(screen.getByText("admin@alpha.com")).toBeInTheDocument();
    });
  });

  it("shows search input", async () => {
    render(<AdminClientsPage />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search clients/i)).toBeInTheDocument();
    });
  });

  it("filters clients by search text", async () => {
    const user = userEvent.setup();
    render(<AdminClientsPage />);
    await waitFor(() => {
      const alphaElements = screen.getAllByText("Alpha Corp");
      expect(alphaElements.length).toBeGreaterThanOrEqual(1);
    });

    const searchInput = screen.getByPlaceholderText(/search clients/i);
    await user.type(searchInput, "Beta");

    const alphaElements = screen.queryAllByText("Alpha Corp");
    expect(alphaElements.length).toBe(0);
    const betaElements = screen.getAllByText("Beta LLC");
    expect(betaElements.length).toBeGreaterThanOrEqual(1);
  });

  it("renders add client button", async () => {
    render(<AdminClientsPage />);
    await waitFor(() => {
      expect(screen.getByText("Add Client")).toBeInTheDocument();
    });
  });

  it("shows client status badges", async () => {
    render(<AdminClientsPage />);
    await waitFor(() => {
      const activeElements = screen.getAllByText("Active");
      expect(activeElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows client metrics", async () => {
    render(<AdminClientsPage />);
    await waitFor(() => {
      const leadElements = screen.getAllByText(/45/);
      expect(leadElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("handles API errors gracefully", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    render(<AdminClientsPage />);
    await waitFor(() => {
      expect(screen.queryByText("Alpha Corp")).not.toBeInTheDocument();
    });
  });
});
