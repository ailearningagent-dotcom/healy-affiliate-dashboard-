import React from "react";
import { vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";

// ============ Mock lucide-react ============
// Comprehensive mock that provides ALL lucide-react icon components used across the app.
// Vitest validates that each export used by the component exists in the mock,
// so we must explicitly define every icon that any component imports.
// Uses React.createElement instead of JSX because setup files are .ts not .tsx.
vi.mock("lucide-react", () => {
  function makeIcon(name: string) {
    return function MockIcon({ className, "data-testid": testId }: { className?: string; "data-testid"?: string }) {
      return React.createElement("span", {
        "data-testid": testId ?? `icon-${name}`,
        className,
      });
    };
  }

  // Every icon used in ANY component must be listed here.
  // Add new imports here as needed.
  return {
    __esModule: true,
    Activity: makeIcon("Activity"),
    RefreshCw: makeIcon("RefreshCw"),
    AlertCircle: makeIcon("AlertCircle"),
    ArrowUpRight: makeIcon("ArrowUpRight"),
    ArrowDownRight: makeIcon("ArrowDownRight"),
    BarChart3: makeIcon("BarChart3"),
    Building2: makeIcon("Building2"),
    Calendar: makeIcon("Calendar"),
    CalendarCheck: makeIcon("CalendarCheck"),
    CheckCircle2: makeIcon("CheckCircle2"),
    ChevronRight: makeIcon("ChevronRight"),
    Clock: makeIcon("Clock"),
    Crown: makeIcon("Crown"),
    DollarSign: makeIcon("DollarSign"),
    Download: makeIcon("Download"),
    FileSpreadsheet: makeIcon("FileSpreadsheet"),
    FileText: makeIcon("FileText"),
    Filter: makeIcon("Filter"),
    Flame: makeIcon("Flame"),
    Layers: makeIcon("Layers"),
    List: makeIcon("List"),
    Loader2: makeIcon("Loader2"),
    Mail: makeIcon("Mail"),
    MapPin: makeIcon("MapPin"),
    Palette: makeIcon("Palette"),
    Pause: makeIcon("Pause"),
    Phone: makeIcon("Phone"),
    Play: makeIcon("Play"),
    Plus: makeIcon("Plus"),
    Search: makeIcon("Search"),
    Snowflake: makeIcon("Snowflake"),
    Star: makeIcon("Star"),
    Sun: makeIcon("Sun"),
    Target: makeIcon("Target"),
    Thermometer: makeIcon("Thermometer"),
    TrendingUp: makeIcon("TrendingUp"),
    Upload: makeIcon("Upload"),
    UserCheck: makeIcon("UserCheck"),
    Users: makeIcon("Users"),
    X: makeIcon("X"),
    XCircle: makeIcon("XCircle"),
    Zap: makeIcon("Zap"),
  };
});

// ============ Mock callLLM ============
// All agent tests should mock this to avoid actual API calls
vi.mock("@/lib/llm/call-llm", () => ({
  callLLM: vi.fn().mockResolvedValue(
    JSON.stringify({ mock: true, message: "Mocked LLM response" })
  ),
  estimateCost: vi.fn().mockReturnValue({
    model: "gpt-4o-mini",
    provider: "openai",
    inputTokens: 50,
    outputTokens: 100,
    inputCost: 0.000075,
    outputCost: 0.0006,
    totalCost: 0.000675,
  }),
}));

// ============ Mock database ============
// AgentManager uses the DB — mock to avoid needing a real DB
vi.mock("@/lib/db", () => ({
  seedIfEmpty: vi.fn().mockResolvedValue(undefined),
  getDepartmentReports: vi.fn().mockResolvedValue([]),
  incrementDepartmentCompleted: vi.fn().mockResolvedValue(undefined),
  upsertLead: vi.fn().mockImplementation((lead: any) => Promise.resolve(lead)),
  upsertAppointment: vi.fn().mockImplementation((apt: any) => Promise.resolve(apt)),
  upsertContent: vi.fn().mockResolvedValue(undefined),
  upsertResult: vi.fn().mockResolvedValue(undefined),
  getRecentResults: vi.fn().mockResolvedValue([]),
  listContent: vi.fn().mockResolvedValue([]),
  dbGet: vi.fn().mockResolvedValue(null),
  dbList: vi.fn().mockResolvedValue([]),
  dbCount: vi.fn().mockResolvedValue(0),
  dbUpdate: vi.fn().mockResolvedValue(null),
  // Nurture sequence DB functions (needed by NurtureEngine)
  saveSequence: vi.fn().mockImplementation((seq: any) => Promise.resolve(seq)),
  loadSequence: vi.fn().mockImplementation((id: string) => Promise.resolve(null)),
  loadSequencesByLead: vi.fn().mockResolvedValue([]),
  loadAllSequenceIds: vi.fn().mockResolvedValue([]),
  countActiveSequences: vi.fn().mockResolvedValue(0),
  getSetting: vi.fn().mockResolvedValue(null),
  setSetting: vi.fn().mockResolvedValue(undefined),

}));

// ============ Mock crypto.randomUUID ============
// Node 19+ has crypto.randomUUID, but ensure it's available
if (typeof globalThis.crypto === "undefined") {
  Object.defineProperty(globalThis, "crypto", {
    value: { randomUUID: () => "00000000-0000-4000-8000-000000000001" },
    writable: true,
  });
}

// Ensure crypto.randomUUID returns predictable IDs for tests
const originalRandomUUID = globalThis.crypto.randomUUID;
let uuidCounter = 0;
globalThis.crypto.randomUUID = () => {
  uuidCounter++;
  const hex = uuidCounter.toString(16).padStart(12, "0");
  return `00000000-0000-4000-8000-${hex}`;
};

// Restore after each test
afterEach(() => {
  uuidCounter = 0;
});
