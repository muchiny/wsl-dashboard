import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { AddRuleDialog } from "./add-rule-dialog";

const mockMutate = vi.fn();

vi.mock("../api/mutations", () => ({
  useAddPortForwarding: () => ({
    mutate: mockMutate,
    isPending: false,
    isError: false,
    error: null,
  }),
}));

vi.mock("@/shared/api/distro-queries", () => ({
  useDistros: () => ({
    data: [
      {
        name: "Ubuntu",
        state: "Running",
        wsl_version: 2,
        is_default: true,
        base_path: null,
        vhdx_size_bytes: null,
        last_seen: "",
      },
      {
        name: "Debian",
        state: "Stopped",
        wsl_version: 2,
        is_default: false,
        base_path: null,
        vhdx_size_bytes: null,
        last_seen: "",
      },
    ],
  }),
}));

const defaultProps = {
  open: true,
  onClose: vi.fn(),
};

describe("AddRuleDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when open is false", () => {
    renderWithProviders(<AddRuleDialog open={false} onClose={vi.fn()} />);
    expect(screen.queryByText("Add Port Forwarding Rule")).not.toBeInTheDocument();
  });

  it("renders the dialog title when open", () => {
    renderWithProviders(<AddRuleDialog {...defaultProps} />);
    expect(screen.getByText("Add Port Forwarding Rule")).toBeInTheDocument();
  });

  it("renders port input fields", () => {
    renderWithProviders(<AddRuleDialog {...defaultProps} />);
    const placeholders = screen.getAllByPlaceholderText("e.g. 3000");
    expect(placeholders).toHaveLength(2);
  });

  it("renders cancel and submit buttons", () => {
    renderWithProviders(<AddRuleDialog {...defaultProps} />);
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByTestId("add-rule-submit")).toBeInTheDocument();
  });

  it("calls onClose when cancel is clicked", () => {
    const onClose = vi.fn();
    renderWithProviders(<AddRuleDialog open={true} onClose={onClose} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when close (X) button is clicked", () => {
    const onClose = vi.fn();
    renderWithProviders(<AddRuleDialog open={true} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Close dialog"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("renders distribution label", () => {
    renderWithProviders(<AddRuleDialog {...defaultProps} />);
    expect(screen.getByText("Distribution")).toBeInTheDocument();
  });

  it("renders WSL port and host port labels", () => {
    renderWithProviders(<AddRuleDialog {...defaultProps} />);
    expect(screen.getByText("WSL Port")).toBeInTheDocument();
    expect(screen.getByText("Host Port")).toBeInTheDocument();
  });
});
