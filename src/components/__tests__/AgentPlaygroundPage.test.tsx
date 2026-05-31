import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AgentPlaygroundPage from "@/app/agents/playground/page";

// ============ MOCKS ============

// Mock next/link to render a plain anchor in jsdom
vi.mock("next/link", () => ({
  default: function MockLink({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  },
}));

// Mock lucide-react icons to avoid SVG rendering issues in jsdom
vi.mock("lucide-react", async () => {
  const actual = await vi.importActual("lucide-react");
  const iconMock = (name: string) =>
    function MockIcon({
      className,
      "data-testid": testId,
    }: {
      className?: string;
      "data-testid"?: string;
    }) {
      return <span data-testid={testId ?? `icon-${name}`} className={className} />;
    };

  const icons = [
    "Bot",
    "Sparkles",
    "History",
    "Trash2",
    "Download",
    "Clock",
    "Zap",
    "Activity",
    "ArrowLeft",
  ];
  const mockMap: Record<string, any> = {};
  for (const name of icons) {
    mockMap[name] = iconMock(name);
  }

  return {
    ...(typeof actual === "object" ? actual : {}),
    ...mockMap,
  };
});

// Mock InteractiveAgentDemo to allow controlled triggering of onRunComplete
vi.mock("@/components/InteractiveAgentDemo", () => ({
  default: function MockInteractiveAgentDemo({
    onRunComplete,
    fullWidth,
  }: {
    onRunComplete?: (agentId: string, durationMs: number, tokenCount: number) => void;
    fullWidth?: boolean;
  }) {
    return (
      <div data-testid="mock-agent-demo">
        <div data-testid="fullWidth-prop">{String(fullWidth)}</div>
        <button
          data-testid="trigger-content-run"
          onClick={() => onRunComplete?.("content", 1234, 350)}
        >
          Content Run
        </button>
        <button
          data-testid="trigger-sales-run"
          onClick={() => onRunComplete?.("sales", 987, 520)}
        >
          Sales Run
        </button>
      </div>
    );
  },
}));

// ============ GLOBAL MOCKS FOR DOWNLOAD ============

let mockAnchorClick: ReturnType<typeof vi.fn>;
let mockCreateObjectURL: ReturnType<typeof vi.fn>;
let mockRevokeObjectURL: ReturnType<typeof vi.fn>;

type CreateObjectURL = (obj: Blob | MediaSource) => string;
type RevokeObjectURL = (url: string) => void;

beforeEach(() => {
  mockAnchorClick = vi.fn();
  mockCreateObjectURL = vi.fn(() => "blob:mock-url");
  mockRevokeObjectURL = vi.fn();

  // Mock URL static methods
  URL.createObjectURL = mockCreateObjectURL as unknown as CreateObjectURL;
  URL.revokeObjectURL = mockRevokeObjectURL as unknown as RevokeObjectURL;

  // Mock anchor click for download testing
  const originalCreateElement = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
    const el = originalCreateElement(tagName);
    if (tagName === "a") {
      // Stub the click to avoid navigation
      el.click = mockAnchorClick as unknown as typeof el.click;
    }
    return el;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ============ HELPERS ============

function setup() {
  const user = userEvent.setup();
  const view = render(<AgentPlaygroundPage />);
  return { user, view };
}

/** Trigger a mock agent run by clicking the content run button on the mock demo */
async function triggerRun(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByTestId("trigger-content-run"));
}

async function triggerSalesRun(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByTestId("trigger-sales-run"));
}

// ============ TESTS ============

describe("AgentPlaygroundPage", () => {
  // ============ RENDER BASICS ============

  it("renders the page header and title", () => {
    setup();
    expect(screen.getByText("Agent Playground")).toBeInTheDocument();
    expect(
      screen.getByText("Run all 10 AI agents interactively")
    ).toBeInTheDocument();
  });

  it("renders the mock agent demo component", () => {
    setup();
    expect(screen.getByTestId("mock-agent-demo")).toBeInTheDocument();
  });

  it("renders the back arrow link pointing to /agents", () => {
    setup();
    const backLink = screen.getByRole("link", { name: "" });
    // There should be a link to /agents with the ArrowLeft icon
    const arrowContainer = screen.getByTestId("icon-ArrowLeft")?.closest("a");
    expect(arrowContainer).toHaveAttribute("href", "/agents");
  });

  it("renders the About the Agent System section with 4 info cards", () => {
    setup();
    expect(screen.getByText("About the Agent System")).toBeInTheDocument();
    expect(
      screen.getByText("Autonomous & Specialized")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Pipeline Orchestration")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Multi-Provider LLM")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Real Execution Logs")
    ).toBeInTheDocument();
  });

  // ============ HISTORY PANEL ============

  it("shows history panel with empty state when History button is clicked", async () => {
    const { user } = setup();

    // History panel should not be visible initially
    expect(screen.queryByText("Run History")).not.toBeInTheDocument();

    // Click the History button
    await user.click(screen.getByRole("button", { name: /history/i }));

    // Panel should now be visible
    expect(screen.getByText("Run History")).toBeInTheDocument();

    // Empty state should be shown
    expect(
      screen.getByText(/No runs yet/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Select an agent and click/)
    ).toBeInTheDocument();
  });

  it("toggles history panel open and closed", async () => {
    const { user } = setup();

    // Open panel
    await user.click(screen.getByRole("button", { name: /history/i }));
    expect(screen.getByText("Run History")).toBeInTheDocument();

    // Close via Close button
    await user.click(screen.getByRole("button", { name: /close/i }));
    expect(screen.queryByText("Run History")).not.toBeInTheDocument();

    // Re-open
    await user.click(screen.getByRole("button", { name: /history/i }));
    expect(screen.getByText("Run History")).toBeInTheDocument();
  });

  it("shows run records in history panel after agent completes", async () => {
    const { user } = setup();

    // Trigger a content agent run
    await triggerRun(user);

    // Open history
    await user.click(screen.getByRole("button", { name: /history/i }));

    // Should show Content Creator in the history list
    expect(screen.getByText("Content Creator")).toBeInTheDocument();
    // Should show the duration
    expect(screen.getByText(/1\.2s/)).toBeInTheDocument();
    // Should show token count (appears in both history entry and session stats)
    const tokenElements = screen.getAllByText(/350 tokens?/);
    expect(tokenElements.length).toBeGreaterThanOrEqual(1);
  });

  it("shows history button badge count after runs", async () => {
    const { user } = setup();

    // History button should not have a badge initially
    const historyButton = screen.getByRole("button", { name: /history/i });
    expect(historyButton.textContent).not.toContain("1");

    // Run once
    await triggerRun(user);
    expect(historyButton.textContent).toContain("1");

    // Run again
    await triggerRun(user);
    expect(historyButton.textContent).toContain("2");
  });

  it("supports multiple runs appearing in history", async () => {
    const { user } = setup();

    // Two content runs
    await triggerRun(user);
    await triggerRun(user);

    // Open history
    await user.click(screen.getByRole("button", { name: /history/i }));

    // Should show both runs (find all elements with Content Creator text)
    const contentCreatorEntries = screen.getAllByText("Content Creator");
    // History title also has "Run History" — so there should be at least 2 entries
    // (the runs) plus the section heading. Actually the heading is "Run History"
    // not "Content Creator", so all matches should be run entries.
    expect(contentCreatorEntries.length).toBeGreaterThanOrEqual(2);
  });

  it("shows runs from different agents in history", async () => {
    const { user } = setup();

    // Content run
    await triggerRun(user);
    // Sales run
    await triggerSalesRun(user);

    // Open history
    await user.click(screen.getByRole("button", { name: /history/i }));

    // Should see both agent names
    expect(screen.getByText("Content Creator")).toBeInTheDocument();
    // For sales team, the display name maps from "sales" to "Sales Team"
    expect(screen.getByText("Sales Team")).toBeInTheDocument();

    // Should see different durations
    expect(screen.getByText(/1\.2s/)).toBeInTheDocument();
    expect(screen.getByText(/1\.0s/)).toBeInTheDocument();
  });

  it("shows history summary stats at the bottom of the panel", async () => {
    const { user } = setup();

    // Two runs: content (350 tokens) + sales (520 tokens) = 870 tokens total
    await triggerRun(user);
    await triggerSalesRun(user);

    // Open history
    await user.click(screen.getByRole("button", { name: /history/i }));

    // Total runs — find the summary container text
    const summaryContainer = screen.getByText(/Total runs:/).closest(".mt-3");
    expect(summaryContainer).toBeInTheDocument();
    expect(summaryContainer!.textContent).toMatch(/2/);

    // Total tokens
    expect(summaryContainer!.textContent).toMatch(/Total tokens:/);
    // 350 + 520 = 870
    expect(summaryContainer!.textContent).toMatch(/870/);

    // Estimated cost: 870 * 0.00015 = 0.1305
    expect(summaryContainer!.textContent).toMatch(/Estimated cost:/);
    expect(summaryContainer!.textContent).toMatch(/0\.1305/);
  });

  // ============ EXPORT / CLEAR ============

  it("shows Export and Clear buttons when history has runs", async () => {
    const { user } = setup();

    // Open history with no runs — no export/clear buttons
    await user.click(screen.getByRole("button", { name: /history/i }));
    expect(screen.queryByText("Export")).not.toBeInTheDocument();
    expect(screen.queryByText("Clear")).not.toBeInTheDocument();

    // Close, then run, then open
    await user.click(screen.getByRole("button", { name: /close/i }));
    await triggerRun(user);
    await user.click(screen.getByRole("button", { name: /history/i }));

    // Export and Clear should now be visible
    expect(screen.getByText("Export")).toBeInTheDocument();
    expect(screen.getByText("Clear")).toBeInTheDocument();
  });

  it("Clear button removes all runs from history", async () => {
    const { user } = setup();

    // Run twice
    await triggerRun(user);
    await triggerRun(user);

    // Open history and click Clear
    await user.click(screen.getByRole("button", { name: /history/i }));
    await user.click(screen.getByRole("button", { name: /clear/i }));

    // Should show empty state again
    expect(screen.getByText(/No runs yet/)).toBeInTheDocument();

    // History button badge should be gone
    const historyButton = screen.getByRole("button", { name: /history/i });
    expect(historyButton.textContent).not.toContain("2");
    expect(historyButton.textContent).not.toContain("0");
  });

  it("Export button creates a downloadable JSON blob", async () => {
    const { user } = setup();

    // Run two agents
    await triggerRun(user);
    await triggerSalesRun(user);

    // Open history and click Export
    await user.click(screen.getByRole("button", { name: /history/i }));
    await user.click(screen.getByText("Export"));

    // URL.createObjectURL should have been called with a Blob
    expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    const blobArg = mockCreateObjectURL.mock.calls[0][0];
    expect(blobArg).toBeInstanceOf(Blob);

    // The blob should contain valid JSON with our run data
    const blobText = await (blobArg as Blob).text();
    const parsed = JSON.parse(blobText);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].agent).toBe("Sales Team"); // most recent first
    expect(parsed[1].agent).toBe("Content Creator");

    // An anchor element should have been clicked to trigger download
    expect(mockAnchorClick).toHaveBeenCalledTimes(1);

    // URL.revokeObjectURL should have been called
    expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  // ============ SESSION STATS ============

  it("hides session stats when no runs have been made", () => {
    setup();

    // The stats container should not be visible
    expect(screen.queryByText(/runs/)).not.toBeInTheDocument();
    expect(screen.queryByText(/tokens/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
  });

  it("shows session stats after first run", async () => {
    const { user } = setup();

    await triggerRun(user);

    // Session stats should now be visible
    expect(screen.getByText("1 runs")).toBeInTheDocument();
    // 350 tokens
    expect(screen.getAllByText(/350/).length).toBeGreaterThanOrEqual(1);
    // Cost: 350 * 0.00015 = 0.0525
    expect(screen.getByText("$0.0525")).toBeInTheDocument();
  });

  it("updates session stats after multiple runs", async () => {
    const { user } = setup();

    // Three runs: content(350) + sales(520) + content(350) = 1220 total
    await triggerRun(user);
    await triggerSalesRun(user);
    await triggerRun(user);

    // Session stats
    expect(screen.getByText("3 runs")).toBeInTheDocument();
    // 1220 tokens (toLocaleString may or may not add commas in jsdom)
    const statsArea = screen.getByText(/3 runs/).closest("div");
    expect(statsArea?.textContent).toMatch(/1,?220/);
    // Cost: 1220 * 0.00015 = 0.183
    expect(screen.getByText("$0.183")).toBeInTheDocument();
  });

  it("resets session stats to zero after clear", async () => {
    const { user } = setup();

    await triggerRun(user);
    expect(screen.getByText("1 runs")).toBeInTheDocument();

    // Open history and clear
    await user.click(screen.getByRole("button", { name: /history/i }));
    await user.click(screen.getByText("Clear"));

    // Close history panel
    await user.click(screen.getByText("Close"));

    // Session stats should be hidden again
    expect(screen.queryByText(/runs/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
  });
});
