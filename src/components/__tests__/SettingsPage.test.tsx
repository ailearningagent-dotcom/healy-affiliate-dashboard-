import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock lucide-react
vi.mock("lucide-react", () => {
  const icons: Record<string, unknown> = {};
  const names = [
    "Key", "Bell", "Shield", "Palette", "Save", "CheckCircle2", "ChevronRight",
    "Sparkles", "Bot", "Globe", "Zap", "Cpu", "ChevronDown", "Calendar",
    "Link", "ExternalLink", "Clock", "Unlink", "Mail", "MessageCircle", "Phone",
    "Smartphone", "Send", "Loader2", "Atom", "Brain", "Wind", "Network",
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

import SettingsPage from "../SettingsPage";

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ connected: false, email: "" }) } as Response);

    // Mock localStorage
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });

    // Mock window.location.search
    Object.defineProperty(window, "location", {
      value: { ...window.location, search: "", origin: "http://localhost:3000" },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders the page header and title", async () => {
    render(<SettingsPage />);
    expect(await screen.findByText("Settings")).toBeInTheDocument();
    expect(screen.getByText(/Configure your AI provider keys/i)).toBeInTheDocument();
  });

  it("renders settings sidebar sections", async () => {
    render(<SettingsPage />);
    expect(await screen.findByText("API Keys")).toBeInTheDocument();
    expect(screen.getByText("Calendar")).toBeInTheDocument();
    expect(screen.getByText("Preferences")).toBeInTheDocument();
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("Security")).toBeInTheDocument();
  });

  it("shows API keys section by default with provider tabs", async () => {
    render(<SettingsPage />);
    const openAiButtons = await screen.findAllByText("OpenAI");
    expect(openAiButtons.length).toBeGreaterThanOrEqual(1);
    const geminiElements = screen.getAllByText("Gemini");
    expect(geminiElements.length).toBeGreaterThanOrEqual(1);
    const claudeElements = screen.getAllByText("Claude");
    expect(claudeElements.length).toBeGreaterThanOrEqual(1);
    const openRouterElements = screen.getAllByText("OpenRouter");
    expect(openRouterElements.length).toBeGreaterThanOrEqual(1);
  });

  it("shows API key input for default OpenAI provider", async () => {
    render(<SettingsPage />);
    const apiKeyLabels = await screen.findAllByText("OpenAI API Key");
    expect(apiKeyLabels.length).toBeGreaterThanOrEqual(1);
  });

  it("switches provider tabs when clicked", async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);
    // There are multiple "Gemini" elements (tab + model lists), click the first tab one
    const geminiElements = screen.getAllByText("Gemini");
    await user.click(geminiElements[0]);
    const geminiLabels = screen.getAllByText("Gemini API Key");
    expect(geminiLabels.length).toBeGreaterThanOrEqual(1);
  });

  it("changes model selection for a provider", async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    const geminiElements = screen.getAllByText("Gemini");
    await user.click(geminiElements[0]);
    const options = screen.getAllByText(/Gemini 2\.5 Pro/i);
    expect(options.length).toBeGreaterThanOrEqual(1);
  });

  it("switches to Calendar section when clicked", async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);
    await user.click(screen.getByText("Calendar"));
    expect(screen.getByText("Google Calendar Integration")).toBeInTheDocument();
  });

  it("switches to Preferences section when clicked", async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);
    await user.click(screen.getByText("Preferences"));
    expect(screen.getByText("Business Profile")).toBeInTheDocument();
  });

  it("renders default business profile values in preferences", async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);
    await user.click(screen.getByText("Preferences"));

    expect(screen.getByDisplayValue("Healy")).toBeInTheDocument();
    expect(screen.getByDisplayValue(/frequency wellness technology/i)).toBeInTheDocument();
  });

  it("shows Connect button when calendar not connected", async () => {
    render(<SettingsPage />);
    const user = userEvent.setup();
    await user.click(screen.getByText("Calendar"));
    expect(screen.getByText("Connect")).toBeInTheDocument();
  });

  it("shows default availability settings", async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);
    await user.click(screen.getByText("Calendar"));

    expect(screen.getByDisplayValue("09:00")).toBeInTheDocument();
    expect(screen.getByDisplayValue("17:00")).toBeInTheDocument();
  });

  it("shows default provider selector", async () => {
    render(<SettingsPage />);
    expect(await screen.findByText(/Default AI Provider/i)).toBeInTheDocument();
  });

  it("shows provider benefits section with configured status", async () => {
    // Mock localStorage to have an API key saved for OpenAI
    // Note: storageKey in the component is "OPENAI_API_KEY" (uppercase)
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => {
        if (key === "OPENAI_API_KEY") return "sk-test-key";
        return null;
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });

    render(<SettingsPage />);
    const elements = await screen.findAllByText(/Configured/i);
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });
});
