import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock lucide-react
vi.mock("lucide-react", () => {
  const icons: Record<string, unknown> = {};
  const names = ["FileText", "Clock", "Hash", "ExternalLink", "Search", "Filter", "BookOpen", "MessageSquare", "Mail", "Globe", "Megaphone"];
  names.forEach((n) => {
    icons[n] = ({ className, "data-testid": testId }: { className?: string; "data-testid"?: string }) =>
      <span data-testid={testId ?? `icon-${n}`} className={className} />;
  });
  return icons;
});

// Mock fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

import ContentLibrary from "../ContentLibrary";

const mockContent = {
  content: [
    { title: "Blog Post About AI", excerpt: "Exploring AI in marketing...", type: "blog", seoKeywords: ["ai", "marketing"], estimatedReadTime: 5, generatedAt: "2025-05-30T10:00:00Z" },
    { title: "Social Media Tips", excerpt: "Tips for better engagement...", type: "social", seoKeywords: ["social", "tips"], estimatedReadTime: 3, generatedAt: "2025-05-29T10:00:00Z" },
    { title: "Email Newsletter", excerpt: "Monthly newsletter content...", type: "email", seoKeywords: ["newsletter"], estimatedReadTime: 2, generatedAt: "2025-05-28T10:00:00Z" },
    { title: "Landing Page Copy", excerpt: "Landing page for new product...", type: "landing", seoKeywords: ["landing", "product"], estimatedReadTime: 4, generatedAt: "2025-05-27T10:00:00Z" },
    { title: "Ad Campaign", excerpt: "Paid ad for social platforms...", type: "ad", seoKeywords: ["ad", "campaign"], estimatedReadTime: 1, generatedAt: "2025-05-26T10:00:00Z" },
  ],
};

describe("ContentLibrary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockContent,
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the page header and title", async () => {
    render(<ContentLibrary />);
    expect(await screen.findByText("Content Library")).toBeInTheDocument();
    expect(screen.getByText(/Browse and manage/i)).toBeInTheDocument();
  });

  it("renders filter buttons", async () => {
    render(<ContentLibrary />);
    expect(await screen.findByText("All")).toBeInTheDocument();
    expect(screen.getByText("Blog")).toBeInTheDocument();
    expect(screen.getByText("Social")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Landing")).toBeInTheDocument();
    expect(screen.getByText("Ad")).toBeInTheDocument();
  });

  it("renders content cards after loading", async () => {
    render(<ContentLibrary />);
    await waitFor(() => {
      expect(screen.getByText("Blog Post About AI")).toBeInTheDocument();
    });
    expect(screen.getByText("Social Media Tips")).toBeInTheDocument();
    expect(screen.getByText("Email Newsletter")).toBeInTheDocument();
    expect(screen.getByText("Landing Page Copy")).toBeInTheDocument();
    expect(screen.getByText("Ad Campaign")).toBeInTheDocument();
  });

  it("renders content excerpts", async () => {
    render(<ContentLibrary />);
    await waitFor(() => {
      expect(screen.getByText(/Exploring AI in marketing/i)).toBeInTheDocument();
    });
  });

  it("shows keyword counts", async () => {
    render(<ContentLibrary />);
    await waitFor(() => {
      const keywordElements = screen.getAllByText(/keywords/i);
      expect(keywordElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows read time", async () => {
    render(<ContentLibrary />);
    await waitFor(() => {
      expect(screen.getByText(/5 min read/i)).toBeInTheDocument();
    });
  });

  it("filters content by type", async () => {
    const user = userEvent.setup();
    render(<ContentLibrary />);
    await waitFor(() => {
      expect(screen.getByText("Blog Post About AI")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Social"));
    expect(screen.queryByText("Blog Post About AI")).not.toBeInTheDocument();
    expect(screen.getByText("Social Media Tips")).toBeInTheDocument();
  });

  it("searches content by title", async () => {
    const user = userEvent.setup();
    render(<ContentLibrary />);
    await waitFor(() => {
      expect(screen.getByText("Blog Post About AI")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search content/i);
    await user.type(searchInput, "Email");
    expect(screen.queryByText("Blog Post About AI")).not.toBeInTheDocument();
    expect(screen.getByText("Email Newsletter")).toBeInTheDocument();
  });

  it("searches content by excerpt", async () => {
    const user = userEvent.setup();
    render(<ContentLibrary />);
    await waitFor(() => {
      expect(screen.getByText("Blog Post About AI")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search content/i);
    await user.type(searchInput, "engagement");
    expect(screen.queryByText("Blog Post About AI")).not.toBeInTheDocument();
    expect(screen.getByText("Social Media Tips")).toBeInTheDocument();
  });

  it("shows empty state when no content matches filters", async () => {
    const user = userEvent.setup();
    render(<ContentLibrary />);
    await waitFor(() => {
      expect(screen.getByText("Blog Post About AI")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search content/i);
    await user.type(searchInput, "zzzznotfound");
    expect(screen.getByText("No content yet")).toBeInTheDocument();
    expect(screen.getByText(/Go to Agents/i)).toBeInTheDocument();
  });

  it("shows empty state when API returns no content", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: [] }),
    } as Response);

    render(<ContentLibrary />);
    await waitFor(() => {
      expect(screen.getByText("No content yet")).toBeInTheDocument();
    });
  });

  it("handles API errors gracefully", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    render(<ContentLibrary />);
    await waitFor(() => {
      expect(screen.getByText("No content yet")).toBeInTheDocument();
    });
  });

  it("shows content type labels for each card", async () => {
    render(<ContentLibrary />);
    await waitFor(() => {
      expect(screen.getByText("Blog Post About AI")).toBeInTheDocument();
    });
    const blogLabels = screen.getAllByText("Blog");
    expect(blogLabels.length).toBeGreaterThanOrEqual(1);
    const socialLabels = screen.getAllByText("Social");
    expect(socialLabels.length).toBeGreaterThanOrEqual(1);
  });
});
