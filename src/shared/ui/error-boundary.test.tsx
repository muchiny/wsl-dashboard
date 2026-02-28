import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { ErrorBoundary } from "./error-boundary";

function ProblemChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Test explosion");
  }
  return <div>Child content</div>;
}

describe("ErrorBoundary", () => {
  // Suppress console.error from React and the component during error tests
  const originalConsoleError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalConsoleError;
  });

  it("renders children when no error occurs", () => {
    renderWithProviders(
      <ErrorBoundary>
        <ProblemChild shouldThrow={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Child content")).toBeInTheDocument();
  });

  it("renders error UI when a child throws", () => {
    renderWithProviders(
      <ErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.queryByText("Child content")).not.toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("displays the thrown error message", () => {
    renderWithProviders(
      <ErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Test explosion")).toBeInTheDocument();
  });

  it("shows a Try Again button that resets the error state", () => {
    renderWithProviders(
      <ErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>,
    );
    const retryButton = screen.getByRole("button", { name: /try again/i });
    expect(retryButton).toBeInTheDocument();
  });

  it("re-renders children after clicking Try Again if error is resolved", () => {
    // We use a mutable ref to control whether the child throws
    let shouldThrow = true;

    function ConditionalChild() {
      if (shouldThrow) {
        throw new Error("Temporary error");
      }
      return <div>Recovered content</div>;
    }

    renderWithProviders(
      <ErrorBoundary>
        <ConditionalChild />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    // "Fix" the error before retrying
    shouldThrow = false;
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(screen.getByText("Recovered content")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });

  it("renders a custom fallback when provided", () => {
    renderWithProviders(
      <ErrorBoundary fallback={<div>Custom fallback UI</div>}>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Custom fallback UI")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });

  it("shows default message when error is null-ish", () => {
    function ThrowNull(): React.JSX.Element {
      // Simulate an error object where message is nullish
      const err = new Error("placeholder");
      // @ts-expect-error - deliberately setting message to undefined to test fallback
      err.message = undefined;
      throw err;
    }

    renderWithProviders(
      <ErrorBoundary>
        <ThrowNull />
      </ErrorBoundary>,
    );
    expect(screen.getByText("An unexpected error occurred.")).toBeInTheDocument();
  });
});
