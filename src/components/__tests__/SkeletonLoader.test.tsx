import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { CardSkeleton, KPISkeleton, TableSkeleton, DashboardSkeleton, SkeletonBar } from "../SkeletonLoader";

describe("SkeletonLoader components", () => {
  it("SkeletonBar renders with animate-pulse class", () => {
    const { container } = render(<SkeletonBar />);
    const el = container.firstChild as HTMLElement;
    expect(el).toBeInTheDocument();
    expect(el.className).toContain("animate-pulse");
    expect(el.className).toContain("rounded-lg");
  });

  it("SkeletonBar renders with custom className", () => {
    const { container } = render(<SkeletonBar className="my-custom-class" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("my-custom-class");
  });

  it("CardSkeleton renders without crashing", () => {
    const { container } = render(<CardSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
    expect(container.firstChild?.childNodes.length).toBeGreaterThan(0);
  });

  it("KPISkeleton renders 4 skeleton cards", () => {
    const { container } = render(<KPISkeleton />);
    const cards = container.querySelectorAll(".rounded-xl");
    expect(cards.length).toBe(4);
  });

  it("TableSkeleton renders with default 5 rows", () => {
    const { container } = render(<TableSkeleton />);
    const rows = container.querySelectorAll(".rounded-lg");
    // The first child contains all rows
    expect(container.firstChild?.childNodes.length).toBe(5);
  });

  it("TableSkeleton renders with custom row count", () => {
    const { container } = render(<TableSkeleton rows={3} />);
    expect(container.firstChild?.childNodes.length).toBe(3);
  });

  it("DashboardSkeleton renders without crashing", () => {
    const { container } = render(<DashboardSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
    expect(container.querySelector(".animate-fade-in")).toBeInTheDocument();
  });
});
