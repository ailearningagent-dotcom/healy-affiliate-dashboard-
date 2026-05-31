import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock lucide-react
vi.mock("lucide-react", () => {
  const icons: Record<string, unknown> = {};
  const names = [
    "Crown", "DollarSign", "BarChart3", "Palette", "TrendingUp", "Code2",
    "Loader2", "Sparkles", "CheckCircle2", "AlertCircle", "Activity", "Users",
    "Target", "Clock", "ChevronDown", "ChevronRight", "Play", "FileText",
    "Search", "Mail", "Image", "Zap", "Brain", "Shield", "Layers", "ArrowRight",
    "Bug", "GitBranch", "Package", "HeartPulse",
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
      json: async () => ({ result: { output: '{"executiveSummary":"Test summary"}' } }),
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
    expect(screen.getByText("AI Org Hierarchy")).toBeInTheDocument();
    expect(screen.getByText(/Your full AI-powered corporate team/i)).toBeInTheDocument();
  });

  it("renders all 6 department cards", () => {
    render(<HierarchyPage />);
    expect(screen.getByText("CEO")).toBeInTheDocument();
    expect(screen.getByText("CFO")).toBeInTheDocument();
    expect(screen.getByText("Data Analyst")).toBeInTheDocument();
    expect(screen.getByText("Design Team")).toBeInTheDocument();
    expect(screen.getByText("Developer")).toBeInTheDocument();
    expect(screen.getByText("Sales Team")).toBeInTheDocument();
  });

  it("shows statistics on department cards", () => {
    render(<HierarchyPage />);
    const activeStrategiesElements = screen.getAllByText(/Active Strategies/i);
    expect(activeStrategiesElements.length).toBeGreaterThanOrEqual(1);
    const departmentsElements = screen.getAllByText(/Departments/i);
    expect(departmentsElements.length).toBeGreaterThanOrEqual(1);
    const tasksElements = screen.getAllByText(/Tasks This Week/i);
    expect(tasksElements.length).toBeGreaterThanOrEqual(1);
  });

  it("shows CEO department details by default", () => {
    render(<HierarchyPage />);
    expect(screen.getByText(/Strategic orchestrator/i)).toBeInTheDocument();
    expect(screen.getByText("CEO — Chief Executive Officer")).toBeInTheDocument();
  });

  it("switches department when clicking a different card", async () => {
    const user = userEvent.setup();
    render(<HierarchyPage />);
    await user.click(screen.getByText("CFO"));
    expect(screen.getByText("CFO — Chief Financial Officer")).toBeInTheDocument();
    expect(screen.getByText(/Financial oversight/i)).toBeInTheDocument();
  });

  it("shows sub-agents for the selected department", () => {
    render(<HierarchyPage />);
    expect(screen.getByText("Task Prioritizer")).toBeInTheDocument();
    expect(screen.getByText("Dept. Coordinator")).toBeInTheDocument();
    expect(screen.getByText("Performance Reviewer")).toBeInTheDocument();
  });

  it("expands sub-agent when clicked", async () => {
    const user = userEvent.setup();
    render(<HierarchyPage />);
    await user.click(screen.getByText("Task Prioritizer"));
    expect(screen.getByText("Business Goal")).toBeInTheDocument();
    expect(screen.getByText("Timeframe")).toBeInTheDocument();
  });

  it("shows Run Sub-Agent button when sub-agent is expanded", async () => {
    const user = userEvent.setup();
    render(<HierarchyPage />);
    await user.click(screen.getByText("Task Prioritizer"));
    expect(screen.getByRole("button", { name: /run sub-agent/i })).toBeInTheDocument();
  });

  it("disables run button during execution", async () => {
    mockFetch.mockImplementationOnce(() => new Promise(() => {}));
    const user = userEvent.setup();
    render(<HierarchyPage />);
    await user.click(screen.getByText("Task Prioritizer"));
    const runBtn = screen.getByRole("button", { name: /run sub-agent/i });
    await user.click(runBtn);
    expect(screen.getByText(/Running/i)).toBeInTheDocument();
  });

  it("shows result output after successful run", async () => {
    const user = userEvent.setup();
    render(<HierarchyPage />);
    await user.click(screen.getByText("Task Prioritizer"));
    const runBtn = screen.getByRole("button", { name: /run sub-agent/i });
    await user.click(runBtn);

    await waitFor(() => {
      expect(screen.getByText("Output")).toBeInTheDocument();
    });
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText(/Test summary/i)).toBeInTheDocument();
  });

  it("shows error state when API fails", async () => {
    mockFetch.mockRejectedValueOnce(new Error("API Error"));
    const user = userEvent.setup();
    render(<HierarchyPage />);
    await user.click(screen.getByText("Task Prioritizer"));
    await user.click(screen.getByRole("button", { name: /run sub-agent/i }));

    await waitFor(() => {
      expect(screen.getByText("Error")).toBeInTheDocument();
    });
    expect(screen.getByText(/API Error/i)).toBeInTheDocument();
  });

  it("clears results when switching departments", async () => {
    const user = userEvent.setup();
    render(<HierarchyPage />);

    await user.click(screen.getByText("Task Prioritizer"));
    await user.click(screen.getByRole("button", { name: /run sub-agent/i }));
    await waitFor(() => {
      expect(screen.getByText("Output")).toBeInTheDocument();
    });

    await user.click(screen.getByText("CFO"));
    expect(screen.queryByText("Output")).not.toBeInTheDocument();
  });

  it("renders department stats in the header area", () => {
    render(<HierarchyPage />);
    const activeStrategiesElements = screen.getAllByText(/Active Strategies: 2/i);
    expect(activeStrategiesElements.length).toBeGreaterThanOrEqual(1);
    const departmentsElements = screen.getAllByText(/Departments: 5/i);
    expect(departmentsElements.length).toBeGreaterThanOrEqual(1);
  });
});
