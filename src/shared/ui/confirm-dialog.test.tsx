import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfirmDialog } from "./confirm-dialog";

// Without i18n initialization, useTranslation returns raw keys
const CONFIRM_KEY = "common.confirm";
const CANCEL_KEY = "common.cancel";

describe("ConfirmDialog", () => {
  const defaultProps = {
    open: true,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    title: "Delete item?",
    description: "This action cannot be undone.",
  };

  it("renders nothing when closed", () => {
    const { container } = render(<ConfirmDialog {...defaultProps} open={false} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders title and description when open", () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText("Delete item?")).toBeInTheDocument();
    expect(screen.getByText("This action cannot be undone.")).toBeInTheDocument();
  });

  it("renders default button labels", () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText(CANCEL_KEY)).toBeInTheDocument();
    expect(screen.getByText(CONFIRM_KEY)).toBeInTheDocument();
  });

  it("renders custom button labels", () => {
    render(<ConfirmDialog {...defaultProps} confirmLabel="Delete" cancelLabel="Keep" />);
    expect(screen.getByText("Delete")).toBeInTheDocument();
    expect(screen.getByText("Keep")).toBeInTheDocument();
  });

  it("calls onCancel when cancel button is clicked", () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByText(CANCEL_KEY));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onConfirm when confirm button is clicked", () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText(CONFIRM_KEY));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when Escape key is pressed", () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when backdrop is clicked", () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);
    // The backdrop is the first child div with the onClick handler
    const backdrop = document.querySelector(".fixed.inset-0.backdrop-blur-sm");
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop!);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("shows spinner when isPending", () => {
    const { container } = render(<ConfirmDialog {...defaultProps} isPending={true} />);
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeTruthy();
    // Confirm label is still visible alongside spinner
    expect(screen.getByText(CONFIRM_KEY)).toBeInTheDocument();
  });

  it("disables buttons when isPending", () => {
    render(<ConfirmDialog {...defaultProps} isPending={true} />);
    expect(screen.getByText(CANCEL_KEY)).toBeDisabled();
    expect(screen.getByText(CONFIRM_KEY).closest("button")).toBeDisabled();
  });

  it("has correct ARIA attributes", () => {
    render(<ConfirmDialog {...defaultProps} />);
    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog!.getAttribute("aria-modal")).toBe("true");
    expect(dialog!.getAttribute("aria-labelledby")).toBe("confirm-title");
    expect(dialog!.getAttribute("aria-describedby")).toBe("confirm-desc");
  });

  it("renders ReactNode description", () => {
    render(
      <ConfirmDialog
        {...defaultProps}
        description={<span data-testid="custom-desc">Custom content</span>}
      />,
    );
    expect(screen.getByTestId("custom-desc")).toBeInTheDocument();
  });
});
