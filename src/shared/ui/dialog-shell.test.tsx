import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DialogShell } from "./dialog-shell";

describe("DialogShell", () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    ariaLabelledby: "test-title",
  };

  it("renders nothing when open is false", () => {
    const { container } = render(
      <DialogShell {...defaultProps} open={false}>
        <p>Content</p>
      </DialogShell>,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders children when open is true", () => {
    render(
      <DialogShell {...defaultProps}>
        <p>Dialog content</p>
      </DialogShell>,
    );
    expect(screen.getByText("Dialog content")).toBeInTheDocument();
  });

  it("sets aria-modal to true", () => {
    render(
      <DialogShell {...defaultProps}>
        <p>Content</p>
      </DialogShell>,
    );
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog!.getAttribute("aria-modal")).toBe("true");
  });

  it("sets aria-labelledby", () => {
    render(
      <DialogShell {...defaultProps} ariaLabelledby="my-title">
        <p>Content</p>
      </DialogShell>,
    );
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog!.getAttribute("aria-labelledby")).toBe("my-title");
  });

  it("sets aria-describedby when provided", () => {
    render(
      <DialogShell {...defaultProps} ariaDescribedby="my-desc">
        <p>Content</p>
      </DialogShell>,
    );
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog!.getAttribute("aria-describedby")).toBe("my-desc");
  });

  it('uses default role "dialog"', () => {
    render(
      <DialogShell {...defaultProps}>
        <p>Content</p>
      </DialogShell>,
    );
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
  });

  it('uses custom role "alertdialog"', () => {
    render(
      <DialogShell {...defaultProps} role="alertdialog">
        <p>Content</p>
      </DialogShell>,
    );
    const alertDialog = document.querySelector('[role="alertdialog"]');
    expect(alertDialog).toBeTruthy();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    render(
      <DialogShell {...defaultProps} onClose={onClose}>
        <p>Content</p>
      </DialogShell>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when overlay is clicked", () => {
    const onClose = vi.fn();
    render(
      <DialogShell {...defaultProps} onClose={onClose}>
        <p>Content</p>
      </DialogShell>,
    );
    const overlay = document.querySelector(".fixed.inset-0.backdrop-blur-md");
    expect(overlay).toBeTruthy();
    fireEvent.click(overlay!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("custom maxWidth class applied", () => {
    render(
      <DialogShell {...defaultProps} maxWidth="max-w-lg">
        <p>Content</p>
      </DialogShell>,
    );
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog!.className).toContain("max-w-lg");
    expect(dialog!.className).not.toContain("max-w-sm");
  });

  it("does not call onClose when dialog panel is clicked", () => {
    const onClose = vi.fn();
    render(
      <DialogShell {...defaultProps} onClose={onClose}>
        <p>Content</p>
      </DialogShell>,
    );
    fireEvent.click(screen.getByText("Content"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("focus trap: Tab from last element wraps to first", () => {
    render(
      <DialogShell {...defaultProps}>
        <button>First</button>
        <button>Last</button>
      </DialogShell>,
    );

    const lastButton = screen.getByText("Last");
    lastButton.focus();
    expect(document.activeElement).toBe(lastButton);

    fireEvent.keyDown(document, { key: "Tab" });

    const firstButton = screen.getByText("First");
    expect(document.activeElement).toBe(firstButton);
  });
});
