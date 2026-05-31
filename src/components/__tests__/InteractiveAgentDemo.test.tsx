import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InteractiveAgentDemo from "@/components/InteractiveAgentDemo";

// ============ SETUP ============

// Mock lucide-react to avoid SVG rendering issues in jsdom
vi.mock("lucide-react", async () => {
  const actual = await vi.importActual("lucide-react");
  const iconMock = (name: string) =>
    function MockIcon({ className, "data-testid": testId }: { className?: string; "data-testid"?: string }) {
      return <span data-testid={testId ?? `icon-${name}`} className={className} />;
    };

  const icons = [
    "FileText", "TrendingUp", "Crown", "DollarSign", "Search", "Palette",
    "Code2", "Mail", "Globe", "BarChart3", "Play", "ArrowRight", "Loader2",
    "CheckCircle2", "Code", "Activity", "Zap",
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

// ============ HELPERS ============

function setup() {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  const onRunComplete = vi.fn();
  const view = render(<InteractiveAgentDemo onRunComplete={onRunComplete} />);
  return { user, onRunComplete, view };
}

// ============ HELPERS ============

async function advanceTypingAnimation() {
  for (let t = 0; t < 30; t++) {
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
  }
}

// ============ TESTS ============

describe("InteractiveAgentDemo", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ============ RENDER / STRUCTURE ============

  it("renders agent selector tabs", () => {
    setup();
    // Should see at least the Content Creator tab and a few others
    expect(screen.getByText("Content")).toBeInTheDocument();
    expect(screen.getByText("Sales")).toBeInTheDocument();
    expect(screen.getByText("CEO")).toBeInTheDocument();
    expect(screen.getByText("CFO")).toBeInTheDocument();
    expect(screen.getByText("Design")).toBeInTheDocument();
  });

  it("renders the form panel with agent description", () => {
    setup();
    // The first agent (Content Creator) should show its full name
    expect(screen.getByText("Content Creator")).toBeInTheDocument();
    // Description should be present
    expect(
      screen.getByText(/Generate blog posts, social content/i)
    ).toBeInTheDocument();
  });

  it("renders the Run Agent button in idle state", () => {
    setup();
    const runButton = screen.getByRole("button", { name: /run agent/i });
    expect(runButton).toBeInTheDocument();
    expect(runButton).not.toBeDisabled();
  });

  it("renders the output panel showing awaiting_input placeholder", () => {
    setup();
    expect(screen.getByText(/awaiting_input/i)).toBeInTheDocument();
    expect(screen.getByText(/Configure the agent and press Run Agent/i)).toBeInTheDocument();
  });

  it("renders form fields for the default Content Creator agent", () => {
    setup();
    // Content Creator has: Topic, Content Type, Target Audience, Tone, Key Points
    expect(screen.getByText("Topic")).toBeInTheDocument();
    expect(screen.getByText("Content Type")).toBeInTheDocument();
    expect(screen.getByText("Target Audience")).toBeInTheDocument();
    expect(screen.getByText("Tone")).toBeInTheDocument();
    expect(screen.getByText("Key Points")).toBeInTheDocument();
  });

  it("renders with fullWidth prop without errors", () => {
    const { container } = render(<InteractiveAgentDemo fullWidth />);
    // Should render without crashing
    expect(container.querySelector("[class]")).toBeTruthy();
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  // ============ AGENT SWITCHING ============

  it("switches form fields when clicking a different agent tab", async () => {
    const { user } = setup();

    // Initially Content Creator — click the Sales tab
    await user.click(screen.getByText("Sales"));

    // Sales Team fields should appear: Lead Name, Company, Role, Persona Type, Channel, Urgency
    expect(screen.getByText("Lead Name")).toBeInTheDocument();
    expect(screen.getByText("Company")).toBeInTheDocument();
    expect(screen.getByText("Persona Type")).toBeInTheDocument();
    // Content Creator fields should no longer be visible
    expect(screen.queryByText("Key Points")).not.toBeInTheDocument();
  });

  it("switches agent description when tabs are clicked", async () => {
    const { user } = setup();

    // Click on CFO Analyst tab
    await user.click(screen.getByText("CFO"));

    expect(screen.getByText("CFO Analyst")).toBeInTheDocument();
    expect(
      screen.getByText(/Budget planning, ROI analysis/i)
    ).toBeInTheDocument();
  });

  it("switches through all 10 agents without error", async () => {
    const { user } = setup();

    // Tab labels in order (short name from first word)
    const tabs = ["Content", "Sales", "CEO", "CFO", "Prospect", "Design", "AI", "Consultation", "Lead", "Data"];
    const fullNames = [
      "Content Creator",
      "Sales Team",
      "CEO Strategist",
      "CFO Analyst",
      "Prospect Researcher",
      "Design Team",
      "AI Developer",
      "Consultation Booker",
      "Lead Scraper",
      "Data Analyst",
    ];

    for (let i = 0; i < tabs.length; i++) {
      // Find the tab button (some tabs share first words like "Prospect" and "Lead" might not exist exactly)
      // Use getAllByText and click the right one
      if (i > 0) {
        const tabButtons = screen.getAllByText(tabs[i]);
        // Click the first matching tab button
        const tabButton = tabButtons.find((btn) => btn.tagName === "BUTTON") ?? tabButtons[0];
        await user.click(tabButton);
      }
      expect(screen.getByText(fullNames[i])).toBeInTheDocument();
    }
  }, 15000);

  it("resets the run state when switching agents after a run", async () => {
    const { user } = setup();

    // Click Content Creator's Run Agent
    await user.click(screen.getByRole("button", { name: /run agent/i }));

    // Advance time past the setTimeout (800-2000ms)
    await act(async () => {
      vi.advanceTimersByTime(2500);
    });

    // Should be complete now
    expect(screen.getByText("Execution Complete")).toBeInTheDocument();

    // Switch to Sales tab
    await user.click(screen.getByText("Sales"));

    // State should reset to idle
    expect(screen.getByText("Configure & Run")).toBeInTheDocument();
    expect(screen.getByText("Fill out the form and click Run Agent")).toBeInTheDocument();
  });

  // ============ FORM INPUT CHANGES ============

  it("updates a text field value when typing", async () => {
    const { user } = setup();

    // Content Creator first field is Topic — it should be an input with default value
    const topicInput = screen.getByDisplayValue("Microcurrent Therapy for Daily Wellness");
    expect(topicInput).toBeInTheDocument();

    // Clear and type a new value
    await user.clear(topicInput);
    await user.type(topicInput, "Frequency Healing Basics");

    expect(screen.getByDisplayValue("Frequency Healing Basics")).toBeInTheDocument();
  });

  it("updates a select field when choosing an option", async () => {
    const { user } = setup();

    // Content Type is a select with default "blog"
    const contentTypeSelect = screen.getByDisplayValue("blog");
    expect(contentTypeSelect).toBeInTheDocument();

    // Change to "social"
    await user.selectOptions(contentTypeSelect, "social");
    expect(screen.getByDisplayValue("social")).toBeInTheDocument();
  });

  it("updates a textarea field when typing", async () => {
    const { user } = setup();

    // Key Points is a textarea with default value
    const keyPointsTextarea = screen.getByDisplayValue(/Non-invasive wellness support/);
    expect(keyPointsTextarea).toBeInTheDocument();

    await user.clear(keyPointsTextarea);
    await user.type(keyPointsTextarea, "Custom point A\nCustom point B");

    expect(screen.getByDisplayValue(/Custom point A/)).toBeInTheDocument();
  });

  it("updates a number field for agents with number inputs", async () => {
    const { user } = setup();

    // Switch to CFO Analyst which has Budget ($) as a number field
    await user.click(screen.getByText("CFO"));

    const budgetInput = screen.getByDisplayValue("15000");
    expect(budgetInput).toBeInTheDocument();
    expect(budgetInput).toHaveAttribute("type", "number");

    await user.clear(budgetInput);
    await user.type(budgetInput, "25000");

    expect(screen.getByDisplayValue("25000")).toBeInTheDocument();
  });

  // ============ RUN / COMPLETE LIFECYCLE ============

  it("disables the Run Agent button during execution", async () => {
    const { user } = setup();

    const runButton = screen.getByRole("button", { name: /run agent/i });
    await user.click(runButton);

    // Button should now be disabled with "Running" text
    const runningButton = screen.getByRole("button", { name: /running content creator/i });
    expect(runningButton).toBeDisabled();
  });

  it("shows running state with loader and progress bar", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: /run agent/i }));

    // Should show "Processing..." status
    expect(screen.getByText("Processing...")).toBeInTheDocument();

    // Should show the running message
    expect(screen.getByText(/Running Content Creator with AI/i)).toBeInTheDocument();

    // Progress bar should render (div with animate-progress-bar class)
    const progressBar = document.querySelector(".animate-progress-bar");
    expect(progressBar).toBeInTheDocument();
  });

  it("shows complete state with JSON output and token metrics after execution", async () => {
    const { user, view } = setup();

    await user.click(screen.getByRole("button", { name: /run agent/i }));

    // Fire the completion timeout, then advance typing animation ticks
    await act(async () => { vi.advanceTimersByTime(3000); });
    await advanceTypingAnimation();

    // Should show Execution Complete
    expect(screen.getByText("Execution Complete")).toBeInTheDocument();

    // Should show Completed in X.Xs
    expect(screen.getByText(/Completed in/)).toBeInTheDocument();

    // Check that JSON output contains content from the mock result
    const preElement = view.container.querySelector("pre");
    expect(preElement).toBeInTheDocument();
    expect(preElement?.textContent).toContain("title");
    expect(preElement?.textContent).toContain("Microcurrent");

    // Should show token metrics
    expect(screen.getAllByText(/tokens/).length).toBeGreaterThanOrEqual(1);

    // Should show model, token count, and cost labels
    expect(screen.getByText(/Model:/)).toBeInTheDocument();
    expect(screen.getByText(/tokens · \$/)).toBeInTheDocument();
  });

  it("calls onRunComplete callback with correct values", async () => {
    const { user, onRunComplete } = setup();

    await user.click(screen.getByRole("button", { name: /run agent/i }));

    await act(async () => {
      vi.runAllTimers();
    });

    // onRunComplete should have been called
    expect(onRunComplete).toHaveBeenCalledTimes(1);

    // First arg should be "content" (agent id)
    expect(onRunComplete).toHaveBeenCalledWith(
      "content",
      expect.any(Number), // durationMs
      expect.any(Number)  // tokenCount
    );

    // Duration should be between 800 and 2000ms
    const durationMs = onRunComplete.mock.calls[0][1];
    expect(durationMs).toBeGreaterThanOrEqual(800);
    expect(durationMs).toBeLessThanOrEqual(2000);

    // Tokens should be between 200 and 800
    const tokens = onRunComplete.mock.calls[0][2];
    expect(tokens).toBeGreaterThanOrEqual(200);
    expect(tokens).toBeLessThanOrEqual(800);
  });

  it("typing animation reveals lines progressively", async () => {
    const { user, view } = setup();

    await user.click(screen.getByRole("button", { name: /run agent/i }));

    // Run only the completion timer, not the typing timers
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    // At this point the run should be complete, but typing hasn't started yet
    // visibleLines is 0, so the pre should just show the cursor
    const preEl = view.container.querySelector("pre");
    expect(preEl?.textContent).toContain("▊");

    // Now advance typing timer by one tick
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    // After one tick, the first line (opening brace) should be visible
    expect(preEl?.textContent).toContain("{");
  });

  // ============ EDGE CASES ============

  it("handles consecutive runs correctly", async () => {
    const { user, onRunComplete } = setup();

    // First run
    await user.click(screen.getByRole("button", { name: /run agent/i }));
    await act(async () => {
      vi.advanceTimersByTime(2500);
    });
    expect(onRunComplete).toHaveBeenCalledTimes(1);

    // Second run
    await user.click(screen.getByRole("button", { name: /run agent/i }));
    // Should show running again
    expect(screen.getByText("Processing...")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(2500);
    });
    expect(onRunComplete).toHaveBeenCalledTimes(2);

    // Third run
    await user.click(screen.getByRole("button", { name: /run agent/i }));
    await act(async () => {
      vi.advanceTimersByTime(2500);
    });
    expect(onRunComplete).toHaveBeenCalledTimes(3);
  });

  it("shows different mock output for different agents", async () => {
    const { user, view } = setup();

    // Run Content Creator
    await user.click(screen.getByRole("button", { name: /run agent/i }));
    await act(async () => { vi.advanceTimersByTime(3000); });
    await advanceTypingAnimation();

    // Content creator output should mention microcurrent
    const preEl = view.container.querySelector("pre");
    expect(preEl?.textContent).toContain("Microcurrent");

    // Switch to Sales and run
    await user.click(screen.getByText("Sales"));
    await user.click(screen.getByRole("button", { name: /run agent/i }));
    await act(async () => { vi.advanceTimersByTime(3000); });
    await advanceTypingAnimation();

    // Sales output should mention score and BANT
    expect(view.container.querySelector("pre")?.textContent).toContain("overallScore");
    expect(view.container.querySelector("pre")?.textContent).toContain("bantScore");
  });

  it("does not crash when run is clicked without waiting for previous run", async () => {
    const { user } = setup();

    // Click run
    await user.click(screen.getByRole("button", { name: /run agent/i }));

    // Button should be disabled so clicking again does nothing
    const buttons = screen.getAllByRole("button");
    const runButton = buttons.find((b) => b.textContent?.includes("Running"));
    expect(runButton).toBeDisabled();

    // Complete the run
    await act(async () => {
      vi.advanceTimersByTime(2500);
    });

    // Should be in complete state
    expect(screen.getByText("Execution Complete")).toBeInTheDocument();
  });

  it("renders stable completion time (not flickering)", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: /run agent/i }));
    await act(async () => {
      vi.advanceTimersByTime(2500);
    });

    // Get the completion time text
    const statusText = screen.getByText(/Completed in/);
    const timeText = statusText.textContent;

    // Force a re-render by advancing time (should not change the time)
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    // The time should remain stable
    expect(screen.getByText(/Completed in/).textContent).toBe(timeText);
  });

  // ============ PROPS ============

  it("does not crash when onRunComplete is not provided", async () => {
    const { container } = render(<InteractiveAgentDemo />);
    expect(container.querySelector("[class]")).toBeTruthy();
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("passes fullWidth prop without layout issues", () => {
    const { container } = render(<InteractiveAgentDemo fullWidth />);
    // Should render the lg:grid-cols-2 layout instead of lg:grid-cols-5
    expect(container.innerHTML).toContain("lg:grid-cols-2");
  });
});
