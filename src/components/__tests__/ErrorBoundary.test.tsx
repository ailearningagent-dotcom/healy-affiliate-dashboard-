import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Import after mocks
import { ErrorBoundary } from "../ErrorBoundary";

// A component that throws on render
function BuggyComponent({ shouldThrow = false }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error("Test error");
  }
  return <div>All good</div>;
}

// Suppress console.error for intentional error boundary tests
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ErrorBoundary", () => {
  it("renders children when there is no error", () => {
    render(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText("Child content")).toBeInTheDocument();
  });

  it("renders default fallback UI when a child throws", () => {
    render(
      <ErrorBoundary>
        <BuggyComponent shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("renders custom fallback when provided", () => {
    render(
      <ErrorBoundary fallback={<div>Custom error UI</div>}>
        <BuggyComponent shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText("Custom error UI")).toBeInTheDocument();
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
  });

  it("recovers and re-renders children after state reset via key change", () => {
    const { rerender } = render(
      <ErrorBoundary key="boundary-1">
        <BuggyComponent shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

    // Rerender with new key to reset error boundary state
    rerender(
      <ErrorBoundary key="boundary-2">
        <BuggyComponent shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText("All good")).toBeInTheDocument();
  });

  it("does not crash when multiple errors occur", () => {
    const { rerender } = render(
      <ErrorBoundary>
        <BuggyComponent shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

    // Try rendering again with error still present
    rerender(
      <ErrorBoundary>
        <BuggyComponent shouldThrow />
      </ErrorBoundary>
    );
    // Should still show error UI without crashing
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });
});
