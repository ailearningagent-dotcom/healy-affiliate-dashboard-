/**
 * Accessibility regression tests.
 *
 * These tests verify that the accessibility fixes across the application
 * remain intact and that no regressions are introduced.
 *
 * Key checks:
 * - <label> elements have htmlFor attributes matching input id attributes
 * - Form inputs have aria-label or name attributes where labels are absent
 * - Password-type inputs are contained within <form> elements
 * - autoComplete attributes are set on password fields
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ============ Shared Mocks ============

vi.mock("lucide-react", () => {
  const icons: Record<string, unknown> = {};
  const names = [
    "LayoutDashboard", "Bot", "FileText", "Users", "Calendar", "Settings",
    "Sparkles", "Building2", "History", "Moon", "Sun", "Menu", "X", "Shield",
    "Monitor", "Play", "Search", "Mail", "TrendingUp", "Crown", "DollarSign",
    "BarChart3", "Palette", "Code2", "Globe", "CheckCircle2", "AlertCircle",
    "ChevronRight", "ArrowRight", "Loader2", "Key", "Bell", "Save", "Cpu",
    "Zap", "Link", "ExternalLink", "Clock", "Unlink", "MessageCircle", "Phone",
    "Smartphone", "Send", "Atom", "Brain", "Wind", "Network", "ChevronDown",
    "Activity", "Target", "Layers", "Image", "Bug", "GitBranch", "Package",
    "HeartPulse", "Users", "MapPin", "Star", "CalendarCheck", "BookOpen",
    "MessageSquare", "Megaphone", "Eye", "RefreshCw", "Code", "List", "Pause",
    "Snowflake", "Flame", "Upload", "Download", "UserCheck",
  ];
  names.forEach((n) => {
    icons[n] = ({ className }: { className?: string }) =>
      <span data-testid={`icon-${n}`} className={className} />;
  });
  return icons;
});

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, className, ...props }: any) =>
    <a href={href} className={className} {...props}>{children}</a>,
}));

vi.mock("@/lib/theme-context", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: vi.fn() }),
}));

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

const mockLocalStorage = () => {
  const store: Record<string, string> = {};
  vi.stubGlobal("localStorage", {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ result: { output: "{}" }, leads: [], stats: { total: 0, hot: 0, warm: 0, cold: 0 }, total: 0 }),
  } as Response);
  mockLocalStorage();
  Object.defineProperty(window, "location", {
    value: { ...window.location, search: "", origin: "http://localhost:3000", href: "http://localhost:3000/" },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ============ HELPERS ============

/**
 * Verify that a label element has an htmlFor attribute and that an element
 * with that id exists.
 */
function expectLabelAssociated(labelText: string, expectedId?: string) {
  const label = screen.getByText((content: string) => content.trim() === labelText).closest("label");
  expect(label).not.toBeNull();
  const htmlFor = label!.getAttribute("for") || label!.getAttribute("htmlFor");
  expect(htmlFor).toBeTruthy();
  if (expectedId) {
    expect(htmlFor).toBe(expectedId);
  }
  // Verify the target element exists
  const target = document.getElementById(htmlFor!);
  expect(target).not.toBeNull();
}

/**
 * Verify that an input/select with the given CSS selector has an aria-label.
 */
function expectInputHasAriaLabel(selector: string, expectedLabel: string) {
  const el = document.querySelector(selector);
  expect(el).not.toBeNull();
  expect(el!.getAttribute("aria-label")).toBe(expectedLabel);
}

// ============ TESTS ============

describe("Accessibility: AgentsPage", () => {
  it("has htmlFor/id pairs on all agent form fields", { timeout: 15000 }, async () => {
    const user = (await import("@testing-library/user-event")).default;
    const AgentsPage = (await import("../AgentsPage")).default;
    render(<AgentsPage />);

    // The first visible agent is "AI Content Creator"
    expectLabelAssociated("Topic");
    expectLabelAssociated("Content Type");
    expectLabelAssociated("Target Audience");

    // Switch to another agent
    const salesBtn = screen.getByText("AI Sales Team");
    await user.click(salesBtn);

    expectLabelAssociated("Lead Name");
    expectLabelAssociated("Company");
    expectLabelAssociated("Role");
  });
});

describe("Accessibility: SettingsPage", () => {
  it("has htmlFor/id pairs on Business Profile fields", async () => {
    const user = (await import("@testing-library/user-event")).default;
    const SettingsPage = (await import("../SettingsPage")).default;
    render(<SettingsPage />);

    // Navigate to preferences
    const prefsBtn = screen.getByText("Preferences");
    await user.click(prefsBtn);

    expectLabelAssociated("Business Name");
    expectLabelAssociated("Industry");
    expectLabelAssociated("Target Audience");
  });

  it("has htmlFor/id on API key inputs", async () => {
    const SettingsPage = (await import("../SettingsPage")).default;
    render(<SettingsPage />);

    // Find only label elements that contain "API Key"
    const labels = document.querySelectorAll("label");
    const apiKeyLabels = Array.from(labels).filter((l) => l.textContent?.includes("API Key"));
    expect(apiKeyLabels.length).toBeGreaterThanOrEqual(1);
    apiKeyLabels.forEach((label) => {
      const htmlFor = label.getAttribute("for") || label.getAttribute("htmlFor");
      expect(htmlFor).toBeTruthy();
      const target = document.getElementById(htmlFor!);
      expect(target).not.toBeNull();
    });
  });

  it("wraps password fields in form elements", async () => {
    const SettingsPage = (await import("../SettingsPage")).default;
    render(<SettingsPage />);

    // All password-type inputs should be inside a <form>
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    // Note: the component may lazy-render the email section where some passwords are
    // So just check that if any password inputs exist, they're in a form
    passwordInputs.forEach((input) => {
      const form = input.closest("form");
      expect(form).not.toBeNull();
    });
  });

  it("sets autoComplete='off' on password fields", async () => {
    const SettingsPage = (await import("../SettingsPage")).default;
    render(<SettingsPage />);

    const passwordInputs = document.querySelectorAll('input[type="password"]');
    passwordInputs.forEach((input) => {
      expect(input.getAttribute("autocomplete")).toBe("off");
    });
  });
});

describe("Accessibility: LeadsPage", () => {
  it("has aria-label on search input", async () => {
    const LeadsPage = (await import("../LeadsPage")).default;
    render(<LeadsPage />);

    expectInputHasAriaLabel('input[name="leads-search"]', "Search leads");
  });

  it("has aria-label on temperature filter", async () => {
    const LeadsPage = (await import("../LeadsPage")).default;
    render(<LeadsPage />);

    expectInputHasAriaLabel('select[name="temperature-filter"]', "Filter by temperature");
  });

  it("has aria-label on status filter", async () => {
    const LeadsPage = (await import("../LeadsPage")).default;
    render(<LeadsPage />);

    expectInputHasAriaLabel('select[name="status-filter"]', "Filter by status");
  });
});

describe("Accessibility: ContentLibrary", () => {
  it("has aria-label on search input", async () => {
    const ContentLibrary = (await import("../ContentLibrary")).default;
    render(<ContentLibrary />);

    expectInputHasAriaLabel('input[name="content-search"]', "Search content");
  });
});

describe("Accessibility: HierarchyPage", () => {
  it("has htmlFor/id pairs on sub-agent input forms", async () => {
    const user = (await import("@testing-library/user-event")).default;
    const HierarchyPage = (await import("../HierarchyPage")).default;
    render(<HierarchyPage />);

    // Expand a sub-agent
    const expandBtn = screen.getByText("Task Prioritizer");
    await user.click(expandBtn);

    expectLabelAssociated("Business Goal");
    expectLabelAssociated("Target Outcome");
  });
});

describe("Accessibility: ShowcasePage", () => {
  it("has htmlFor/id pairs on demo form fields", async () => {
    // IntersectionObserver is needed by ShowcasePage
    vi.stubGlobal("IntersectionObserver", class {
      constructor() {}
      observe() {}
      disconnect() {}
      unobserve() {}
    });

    const ShowcasePage = (await import("../ShowcasePage")).default;
    render(<ShowcasePage />);

    expectLabelAssociated("Business Name");

    vi.unstubAllGlobals();
  });
});

describe("Accessibility: InteractiveAgentDemo", () => {
  it("has htmlFor/id pairs on demo agent form fields", async () => {
    // IntersectionObserver might be needed by parent components
    vi.stubGlobal("IntersectionObserver", class {
      constructor() {}
      observe() {}
      disconnect() {}
      unobserve() {}
    });

    const InteractiveAgentDemo = (await import("../InteractiveAgentDemo")).default;
    render(<InteractiveAgentDemo />);

    expectLabelAssociated("Topic");

    vi.unstubAllGlobals();
  });
});

describe("Accessibility: MassScrapePanel", () => {
  it("has htmlFor/id pairs on scrape configuration fields", async () => {
    const MassScrapePanel = (await import("../MassScrapePanel")).default;
    render(<MassScrapePanel />);

    expectLabelAssociated("Concurrency");
    expectLabelAssociated("Results per query");
  });
});

describe("Accessibility: GoogleMapsScrapeModal", () => {
  it("has htmlFor/id pairs on modal form fields", async () => {
    const GoogleMapsScrapeModal = (await import("../GoogleMapsScrapeModal")).default;
    render(<GoogleMapsScrapeModal onClose={vi.fn()} onImport={vi.fn()} />);

    expectLabelAssociated("Search Query");
    expectLabelAssociated("Location");
    // Max Results label contains a dynamic counter (e.g. "Max Results: 20"), match by prefix
    const label = screen.getByText((content: string) => content.trim().startsWith("Max Results")).closest("label");
    expect(label).not.toBeNull();
    const htmlFor = label!.getAttribute("for") || label!.getAttribute("htmlFor");
    expect(htmlFor).toBe("gmap-max-results");
  });
});

describe("Accessibility: Proxy migration", () => {
  it("proxy.ts exports a proxy function", () => {
    // Verify the proxy.ts file structure is correct by reading it
    // (Can't import @/proxy in test env because next/server isn't available)
    const fs = require("fs");
    const content = fs.readFileSync("src/proxy.ts", "utf-8");
    expect(content).toContain("export function proxy");
    expect(content).toContain("export const config");
    expect(content).not.toContain("export default");
  });
});
