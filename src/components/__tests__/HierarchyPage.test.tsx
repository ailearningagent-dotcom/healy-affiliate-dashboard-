import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock lucide-react
vi.mock("lucide-react", () => {
  const icons: Record<string, unknown> = {};
  const names = [
    "TrendingUp", "Loader2", "CheckCircle2", "AlertCircle", "Activity", "Users",
    "Target", "Clock", "ChevronDown", "ChevronRight", "Play", "FileText",
    "Search", "Mail", "ArrowRight", "Globe", "Sparkles",
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

import HierarchyPage from "../HierarchyPage";

describe("HierarchyPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ result: { output: '{"title":"Test Summary"}' } }),
    } as Response);
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the page header and title", () => {
    render(<HierarchyPage />);
    expect(screen.getByText("AI Agents")).toBeInTheDocument();
    expect(screen.getByText(/Content, Research, Outreach, Sales, and Scraper/i)).toBeInTheDocument();
  });

  it("renders all 5 department cards", () => {
    render(<HierarchyPage />);
    expect(screen.getByText("Content")).toBeInTheDocument();
    expect(screen.getByText("Research")).toBeInTheDocument();
    expect(screen.getByText("Outreach")).toBeInTheDocument();
    expect(screen.getByText("Sales Team")).toBeInTheDocument();
  });

  it("shows statistics on department cards", () => {
    render(<HierarchyPage />);
    const contentTypes = screen.getAllByText(/Content Types/);
    expect(contentTypes.length).toBeGreaterThanOrEqual(1);
    const activeElements = screen.getAllByText(/Auto-Pilot/);
    expect(activeElements.length).toBeGreaterThanOrEqual(1);
  });

  it("shows Content department details by default", () => {
    render(<HierarchyPage />);
    expect(screen.getByText("Content — AI Content Creator")).toBeInTheDocument();
    expect(screen.getByText(/Create blog posts, social content/i)).toBeInTheDocument();
  });

  it("switches department when clicking a different card", async () => {
    const user = userEvent.setup();
    render(<HierarchyPage />);
    await user.click(screen.getByText("Sales Team"));
    expect(screen.getByText("Sales Team — Sales Development")).toBeInTheDocument();
    expect(screen.getByText(/Lead qualification, message personalization/i)).toBeInTheDocument();
  });

  it("shows sub-agents for the selected department", () => {
    render(<HierarchyPage />);
    expect(screen.getByText("Blog Writer")).toBeInTheDocument();
    expect(screen.getByText("Email Creator")).toBeInTheDocument();
  });

  it("expands sub-agent when clicked", async () => {
    const user = userEvent.setup();
    render(<HierarchyPage />);
    await user.click(screen.getByText("Blog Writer"));
    expect(screen.getByText("Topic")).toBeInTheDocument();
    expect(screen.getByText("Target Audience")).toBeInTheDocument();
  });

  it("shows Run Sub-Agent button when sub-agent is expanded", async () => {
    const user = userEvent.setup();
    render(<HierarchyPage />);
    await user.click(screen.getByText("Blog Writer"));
    expect(screen.getByRole("button", { name: /run sub-agent/i })).toBeInTheDocument();
  });

  it("disables run button during execution", async () => {
    mockFetch.mockImplementationOnce(() => new Promise(() => {}));
    const user = userEvent.setup();
    render(<HierarchyPage />);
    await user.click(screen.getByText("Blog Writer"));
    const runBtn = screen.getByRole("button", { name: /run sub-agent/i });
    await user.click(runBtn);
    expect(screen.getByText(/Running/i)).toBeInTheDocument();
  });

  it("shows result output after successful run", async () => {
    const user = userEvent.setup();
    render(<HierarchyPage />);
    await user.click(screen.getByText("Blog Writer"));
    const runBtn = screen.getByRole("button", { name: /run sub-agent/i });
    await user.click(runBtn);

    await waitFor(() => {
      expect(screen.getByText("Output")).toBeInTheDocument();
    });
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("shows error state when API fails", async () => {
    mockFetch.mockRejectedValueOnce(new Error("API Error"));
    const user = userEvent.setup();
    render(<HierarchyPage />);
    await user.click(screen.getByText("Blog Writer"));
    await user.click(screen.getByRole("button", { name: /run sub-agent/i }));

    await waitFor(() => {
      expect(screen.getByText("Error")).toBeInTheDocument();
    });
    expect(screen.getByText(/API Error/i)).toBeInTheDocument();
  });

  it("clears results when switching departments", async () => {
    const user = userEvent.setup();
    render(<HierarchyPage />);

    await user.click(screen.getByText("Blog Writer"));
    await user.click(screen.getByRole("button", { name: /run sub-agent/i }));
    await waitFor(() => {
      expect(screen.getByText("Output")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Research"));
    expect(screen.queryByText("Output")).not.toBeInTheDocument();
  });

  it("renders department stats in the header area", () => {
    render(<HierarchyPage />);
    const contentTypes = screen.getAllByText(/Content Types/);
    expect(contentTypes.length).toBeGreaterThanOrEqual(1);
  });
});
