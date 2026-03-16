import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, act } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { RestoreCloneForm } from "./restore-clone-form";

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const defaultProps = {
  newName: "",
  onNewNameChange: vi.fn(),
  installLocation: "",
  onInstallLocationChange: vi.fn(),
  nameError: null,
};

describe("RestoreCloneForm", () => {
  it("renders name input with current value", () => {
    renderWithProviders(<RestoreCloneForm {...defaultProps} newName="MyDistro" />);
    const inputs = screen.getAllByRole("textbox");
    expect((inputs[0] as HTMLInputElement).value).toBe("MyDistro");
  });

  it("calls onNewNameChange when typing in name field", () => {
    const onNewNameChange = vi.fn();
    renderWithProviders(<RestoreCloneForm {...defaultProps} onNewNameChange={onNewNameChange} />);
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0]!, { target: { value: "NewName" } });
    expect(onNewNameChange).toHaveBeenCalledWith("NewName");
  });

  it("shows name error when nameError is set", () => {
    renderWithProviders(<RestoreCloneForm {...defaultProps} nameError="Name is invalid" />);
    expect(screen.getByText("Name is invalid")).toBeInTheDocument();
  });

  it("does not show error when nameError is null", () => {
    const { container } = renderWithProviders(
      <RestoreCloneForm {...defaultProps} nameError={null} />,
    );
    expect(container.querySelector(".text-red")).toBeNull();
  });

  it("renders install location input", () => {
    renderWithProviders(<RestoreCloneForm {...defaultProps} installLocation="C:\\WSL" />);
    const inputs = screen.getAllByRole("textbox");
    // Value in the input should match the prop
    expect((inputs[1] as HTMLInputElement).value).toContain("WSL");
  });

  it("calls onInstallLocationChange when typing in location field", () => {
    const onInstallLocationChange = vi.fn();
    renderWithProviders(
      <RestoreCloneForm {...defaultProps} onInstallLocationChange={onInstallLocationChange} />,
    );
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[1]!, { target: { value: "D:\\MyDistros" } });
    expect(onInstallLocationChange).toHaveBeenCalledWith("D:\\MyDistros");
  });

  it("browse button calls openDialog and updates location when dir is selected", async () => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    vi.mocked(open).mockResolvedValue("/selected/path");
    const onInstallLocationChange = vi.fn();
    renderWithProviders(
      <RestoreCloneForm {...defaultProps} onInstallLocationChange={onInstallLocationChange} />,
    );

    const browseBtn = screen.getByRole("button");
    await act(async () => {
      fireEvent.click(browseBtn);
    });

    expect(open).toHaveBeenCalledWith(expect.objectContaining({ directory: true }));
    expect(onInstallLocationChange).toHaveBeenCalledWith("/selected/path");
  });

  it("browse button does NOT update location when dialog returns null", async () => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    vi.mocked(open).mockResolvedValue(null);
    const onInstallLocationChange = vi.fn();
    renderWithProviders(
      <RestoreCloneForm {...defaultProps} onInstallLocationChange={onInstallLocationChange} />,
    );

    const browseBtn = screen.getByRole("button");
    await act(async () => {
      fireEvent.click(browseBtn);
    });

    expect(open).toHaveBeenCalled();
    expect(onInstallLocationChange).not.toHaveBeenCalled();
  });

  it("name input has border-red class when nameError is set", () => {
    renderWithProviders(<RestoreCloneForm {...defaultProps} nameError="Invalid name" />);
    const inputs = screen.getAllByRole("textbox");
    expect(inputs[0]).toHaveClass("border-red");
  });

  it("renders install location hint text", () => {
    renderWithProviders(<RestoreCloneForm {...defaultProps} />);
    expect(
      screen.getByText("Directory where the distribution's virtual disk will be stored."),
    ).toBeInTheDocument();
  });

  it("name input has maxLength 64 and location input has maxLength 260", () => {
    renderWithProviders(<RestoreCloneForm {...defaultProps} />);
    const inputs = screen.getAllByRole("textbox");
    expect(inputs[0]).toHaveAttribute("maxLength", "64");
    expect(inputs[1]).toHaveAttribute("maxLength", "260");
  });
});
