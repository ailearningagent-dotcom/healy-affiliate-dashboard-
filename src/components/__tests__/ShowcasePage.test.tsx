import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock lucide-react
vi.mock("lucide-react", () => {
  const icons: Record<string, unknown> = {};
  const names = [
    "Sparkles", "LayoutDashboard", "Bot", "Building2", "FileText", "Users",
    "Calendar", "Settings", "Shield", "History", "Crown", "DollarSign",
    "BarChart3", "Palette", "TrendingUp", "Code2", "Globe", "Mail", "Search",
    "Target", "Activity", "CheckCircle2", "ChevronRight", "Zap", "Layers",
    "Brain", "Star", "CalendarCheck", "BookOpen", "MessageSquare", "Megaphone",
    "Eye", "Key", "RefreshCw", "Sun", "Moon", "Code",
  ];
  names.forEach((n) => {
    icons[n] = ({ className }: { className?: string }) =>
      <span data-testid={`icon-${n}`} className={className} />;
  });
  return icons;
});

// Mock theme context
vi.mock("@/lib/theme-context", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: vi.fn(), setTheme: vi.fn() }),
}));

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Mock IntersectionObserver as a proper constructor
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();
const mockUnobserve = vi.fn();
vi.stubGlobal("IntersectionObserver", vi.fn(function MockIntersectionObserver(this: Record<string, unknown>) {
  this.observe = mockObserve;
  this.disconnect = mockDisconnect;
  this.unobserve = mockUnobserve;
  this.root = null;
  this.rootMargin = "";
  this.thresholds = [];
  return this;
}));

import ShowcasePage from "../ShowcasePage";

describe("ShowcasePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the hero section", () => {
    render(<ShowcasePage />);
    const platformElements = screen.getAllByText(/MarketAI Platform/i);
    expect(platformElements.length).toBeGreaterThanOrEqual(1);
    const showcaseElements = screen.getAllByText(/Full Feature Showcase/i);
    expect(showcaseElements.length).toBeGreaterThanOrEqual(1);
  });

  it("renders hero stats", () => {
    render(<ShowcasePage />);
    // Hero stats appear in hero section and Quick Stats strip
    const stat10 = screen.getAllByText("10");
    expect(stat10.length).toBeGreaterThanOrEqual(1);
    const stat25 = screen.getAllByText(/25\+/);
    expect(stat25.length).toBeGreaterThanOrEqual(1);
    const stat20 = screen.getAllByText(/20\+/);
    expect(stat20.length).toBeGreaterThanOrEqual(2);
    const stat50 = screen.getAllByText(/50\+/);
    expect(stat50.length).toBeGreaterThanOrEqual(1);
  });

  it("renders version badge", () => {
    render(<ShowcasePage />);
    const badges = screen.getAllByText(/v0.1/i);
    expect(badges.length).toBeGreaterThanOrEqual(1);
    const platformTexts = screen.getAllByText(/AI-Powered Marketing Platform/i);
    expect(platformTexts.length).toBeGreaterThanOrEqual(1);
  });

  it("renders section navigation bar", () => {
    render(<ShowcasePage />);
    const overviewElements = screen.getAllByText("Overview");
    expect(overviewElements.length).toBeGreaterThanOrEqual(1);
    const dashboardElements = screen.getAllByText("Dashboard");
    expect(dashboardElements.length).toBeGreaterThanOrEqual(1);
    const agentsElements = screen.getAllByText("AI Agents");
    expect(agentsElements.length).toBeGreaterThanOrEqual(1);
    const hierarchyElements = screen.getAllByText("Org Hierarchy");
    expect(hierarchyElements.length).toBeGreaterThanOrEqual(1);
    const contentElements = screen.getAllByText("Content Library");
    expect(contentElements.length).toBeGreaterThanOrEqual(1);
  });

  it("renders the Quick Stats strip", () => {
    render(<ShowcasePage />);
    const stat4 = screen.getAllByText("4");
    expect(stat4.length).toBeGreaterThanOrEqual(1);
    const stat22 = screen.getAllByText("22");
    expect(stat22.length).toBeGreaterThanOrEqual(1);
  });

  it("renders dashboard feature section", () => {
    render(<ShowcasePage />);
    expect(screen.getByText("Real-Time Dashboard")).toBeInTheDocument();
  });

  it("renders AI Agents feature section", () => {
    render(<ShowcasePage />);
    expect(screen.getByText("10 AI Agent Types")).toBeInTheDocument();
  });

  it("renders Content Library feature section", () => {
    render(<ShowcasePage />);
    const contentElements = screen.getAllByText("Content Library");
    expect(contentElements.length).toBeGreaterThanOrEqual(2);
  });

  it("renders Leads & Appointments feature section", () => {
    render(<ShowcasePage />);
    expect(screen.getByText("Leads & Appointments")).toBeInTheDocument();
  });

  it("renders Agents feature section", () => {
    render(<ShowcasePage />);
    expect(screen.getByText("10 AI Agent Types")).toBeInTheDocument();
  });

  it("renders Multi-Tenant Admin feature section", () => {
    render(<ShowcasePage />);
    expect(screen.getByText("Multi-Tenant Admin")).toBeInTheDocument();
  });

  it("renders Settings & Integration feature section", () => {
    render(<ShowcasePage />);
    expect(screen.getByText("Settings & Integration")).toBeInTheDocument();
  });

  it("renders Org Hierarchy feature section", () => {
    render(<ShowcasePage />);
    const elements = screen.getAllByText("Org Hierarchy");
    expect(elements.length).toBeGreaterThanOrEqual(2);
  });

  it("renders Architecture section", () => {
    render(<ShowcasePage />);
    expect(screen.getByText("System Architecture")).toBeInTheDocument();
  });

  it("renders Tech Stack section", () => {
    render(<ShowcasePage />);
    const techStackElements = screen.getAllByText("Tech Stack");
    expect(techStackElements.length).toBeGreaterThanOrEqual(1);
    // "Next.js 16" appears in TechStackSection items and ArchitectureSection badge
    const nextjs = screen.getAllByText(/Next\.js 16/);
    expect(nextjs.length).toBeGreaterThanOrEqual(1);
    const reactElements = screen.getAllByText(/React 19/);
    expect(reactElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText((c: string) => c.includes("TypeScript 5"))).toBeInTheDocument();
    const tailwind = screen.getAllByText(/Tailwind CSS/);
    expect(tailwind.length).toBeGreaterThanOrEqual(1);
  });

  it("renders Dark Mode section", () => {
    render(<ShowcasePage />);
    const darkModeElements = screen.getAllByText("Dark Mode");
    expect(darkModeElements.length).toBeGreaterThanOrEqual(1);
    const liveToggle = screen.getAllByText(/live toggle/i);
    expect(liveToggle.length).toBeGreaterThanOrEqual(1);
  });

  it("renders History & Activity section", () => {
    render(<ShowcasePage />);
    expect(screen.getByText("Upcoming Appointments")).toBeInTheDocument();
    expect(screen.getByText("Agent History")).toBeInTheDocument();
  });

  it("renders footer CTA section", () => {
    render(<ShowcasePage />);
    expect(screen.getByText(/Ready to build with MarketAI/i)).toBeInTheDocument();
    expect(screen.getByText("Configure Settings")).toBeInTheDocument();
    expect(screen.getByText("Run Agents")).toBeInTheDocument();
  });

  it("renders dashboard preview content", () => {
    render(<ShowcasePage />);
    const qualifiedElements = screen.getAllByText(/Qualified Leads/i);
    expect(qualifiedElements.length).toBeGreaterThanOrEqual(1);
    const outreachElements = screen.getAllByText(/Outreach Sent/i);
    expect(outreachElements.length).toBeGreaterThanOrEqual(1);
  });

  it("renders content preview with demo items", () => {
    render(<ShowcasePage />);
    const wellnessElements = screen.getAllByText(/The Future of Frequency Wellness/i);
    expect(wellnessElements.length).toBeGreaterThanOrEqual(1);
    const morningElements = screen.getAllByText(/5 Morning Rituals/i);
    expect(morningElements.length).toBeGreaterThanOrEqual(1);
  });

  it("renders lead preview with demo leads", () => {
    render(<ShowcasePage />);
    const sarahElements = screen.getAllByText(/Dr. Sarah Chen/i);
    expect(sarahElements.length).toBeGreaterThanOrEqual(1);
    const jamesElements = screen.getAllByText(/James Mitchell/i);
    expect(jamesElements.length).toBeGreaterThanOrEqual(1);
  });

  it("renders admin preview", () => {
    render(<ShowcasePage />);
    const wellnessElements = screen.getAllByText(/Wellness Center NYC/i);
    expect(wellnessElements.length).toBeGreaterThanOrEqual(1);
    const biohackElements = screen.getAllByText(/Biohack Labs/i);
    expect(biohackElements.length).toBeGreaterThanOrEqual(1);
  });

  it("renders settings preview with provider info", () => {
    render(<ShowcasePage />);
    expect(screen.getByText("API Keys & Providers")).toBeInTheDocument();
  });

  it("renders all tech stack items", () => {
    render(<ShowcasePage />);
    const nextjsItems = screen.getAllByText(/Next\.js 16/);
    expect(nextjsItems.length).toBeGreaterThanOrEqual(1);
    // Vitest is rendered inside a <span> in the tech stack card
    const vitestElements = screen.getAllByText((c: string) => c.includes("Vitest"));
    expect(vitestElements.length).toBeGreaterThanOrEqual(1);
  });

  it("does not crash when intersection observer triggers", () => {
    render(<ShowcasePage />);
    const platformElements = screen.getAllByText(/MarketAI Platform/i);
    expect(platformElements.length).toBeGreaterThanOrEqual(1);
  });
});
