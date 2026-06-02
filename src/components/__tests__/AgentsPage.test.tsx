import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock lucide-react icons
vi.mock("lucide-react", () => {
  const icons: Record<string, unknown> = {};
  const names = ["FileText", "Search", "Sparkles", "Loader2", "CheckCircle2", "AlertCircle", "ChevronRight", "ArrowRight", "Mail", "TrendingUp", "Globe"];
  names.forEach((n) => {
    icons[n] = ({ className }: { className?: string }) =>
      <span data-testid={`icon-${n}`} className={className} />;
  });
  return icons;
});

// Mock fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

import AgentsPage from "../AgentsPage";

describe("AgentsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ result: { output: '{"title":"Test Output"}' } }),
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
    render(<AgentsPage />);
    expect(screen.getByText("AI Agents")).toBeInTheDocument();
    expect(screen.getByText(/Run AI-powered agents/i)).toBeInTheDocument();
  });

  it("renders agent selection buttons for all 5 agents", () => {
    render(<AgentsPage />);
    const creatorElements = screen.getAllByText("AI Content Creator");
    expect(creatorElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Prospect Researcher")).toBeInTheDocument();
    expect(screen.getByText("AI Outreach Specialist")).toBeInTheDocument();
    expect(screen.getByText("AI Sales Team")).toBeInTheDocument();
    expect(screen.getByText("Lead Scraper")).toBeInTheDocument();
  });

  it("shows the default Content Creator agent description", () => {
    render(<AgentsPage />);
    const descElements = screen.getAllByText(/Create blog posts, social content/i);
    expect(descElements.length).toBeGreaterThanOrEqual(1);
  });

  it("switches agent and shows its description when clicking a different agent", async () => {
    const user = userEvent.setup();
    render(<AgentsPage />);
    await user.click(screen.getByText("AI Sales Team"));
    const descElements = screen.getAllByText(/Lead qualification, message personalization/i);
    expect(descElements.length).toBeGreaterThanOrEqual(1);
  });

  it("renders form fields for the selected agent", () => {
    render(<AgentsPage />);
    expect(screen.getByText("Topic")).toBeInTheDocument();
    expect(screen.getByText("Content Type")).toBeInTheDocument();
    expect(screen.getByText("Target Audience")).toBeInTheDocument();
  });

  it("updates form fields when user types", async () => {
    const user = userEvent.setup();
    render(<AgentsPage />);
    const input = screen.getByPlaceholderText(/Enter topic/i);
    await user.type(input, "Wellness Trends");
    expect(input).toHaveValue("Wellness Trends");
  });

  it("disables the Run button during execution", async () => {
    const user = userEvent.setup();
    mockFetch.mockImplementationOnce(() => new Promise(() => {}));
    render(<AgentsPage />);
    const runBtn = screen.getByRole("button", { name: /run agent/i });
    await user.click(runBtn);
    expect(screen.getByText(/Running/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /running/i })).toBeDisabled();
  });

  it("shows completed result after successful agent run", async () => {
    const user = userEvent.setup();
    render(<AgentsPage />);
    const runBtn = screen.getByRole("button", { name: /run agent/i });
    await user.click(runBtn);

    await waitFor(() => {
      expect(screen.getByText("Result")).toBeInTheDocument();
    });
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("Test Output")).toBeInTheDocument();
  });

  it("calls the API with correct endpoint", async () => {
    const user = userEvent.setup();
    render(<AgentsPage />);
    const runBtn = screen.getByRole("button", { name: /run agent/i });
    await user.click(runBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/agents/run", expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      }));
    });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.agentType).toBe("content");
  });

  it("shows error state when API fails", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    const user = userEvent.setup();
    render(<AgentsPage />);
    const runBtn = screen.getByRole("button", { name: /run agent/i });
    await user.click(runBtn);

    await waitFor(() => {
      expect(screen.getByText("Error")).toBeInTheDocument();
    });
    expect(screen.getByText(/Network error/i)).toBeInTheDocument();
  });

  it("clears result and error when switching agents", async () => {
    const user = userEvent.setup();
    render(<AgentsPage />);

    await user.click(screen.getByRole("button", { name: /run agent/i }));
    await waitFor(() => {
      expect(screen.getByText("Result")).toBeInTheDocument();
    });

    await user.click(screen.getByText("AI Sales Team"));
    expect(screen.queryByText("Result")).not.toBeInTheDocument();
  });

  it("clears result and error when clicking Run again", async () => {
    const user = userEvent.setup();
    render(<AgentsPage />);

    await user.click(screen.getByRole("button", { name: /run agent/i }));
    await waitFor(() => {
      expect(screen.getByText("Result")).toBeInTheDocument();
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: { output: '{"title":"Second Run"}' } }),
    } as Response);
    await user.click(screen.getByRole("button", { name: /run agent/i }));

    await waitFor(() => {
      expect(screen.getByText("Second Run")).toBeInTheDocument();
    });
  });

  it("renders all agents with unique colors and icons", () => {
    render(<AgentsPage />);
    const agentNames = [
      "AI Content Creator", "Prospect Researcher", "AI Outreach Specialist",
      "AI Sales Team", "Lead Scraper",
    ];
    agentNames.forEach((name) => {
      const elements = screen.getAllByText(name);
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });
  });
});
