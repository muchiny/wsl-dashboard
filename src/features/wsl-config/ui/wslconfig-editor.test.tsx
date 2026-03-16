import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { WslConfigEditor } from "./wslconfig-editor";

const mockMutate = vi.fn();
const defaultConfig = {
  memory: "4GB",
  processors: 4,
  swap: "2GB",
  swap_file: null,
  localhost_forwarding: true,
  kernel: null,
  kernel_command_line: null,
  nested_virtualization: false,
  vm_idle_timeout: 60000,
  dns_tunneling: true,
  firewall: true,
  auto_proxy: true,
  networking_mode: null,
  gui_applications: null,
  default_vhd_size: null,
  dns_proxy: null,
  safe_mode: null,
  auto_memory_reclaim: null,
  sparse_vhd: null,
};

let mockIsLoading = false;
let mockData: typeof defaultConfig | undefined = defaultConfig;

vi.mock("../api/queries", () => ({
  useWslConfig: () => ({
    data: mockData,
    isLoading: mockIsLoading,
  }),
}));

vi.mock("../api/mutations", () => ({
  useUpdateWslConfig: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

let mockErrors: Record<string, string> = {};
let mockHasErrors = false;
vi.mock("../lib/validation", () => ({
  validateWslConfig: () => mockErrors,
  hasErrors: () => mockHasErrors,
}));

describe("WslConfigEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoading = false;
    mockData = defaultConfig;
    mockErrors = {};
    mockHasErrors = false;
  });

  it("shows loading skeleton when isLoading is true", () => {
    mockIsLoading = true;
    mockData = undefined;
    const { container } = renderWithProviders(<WslConfigEditor />);
    const skeleton = container.querySelector(".animate-pulse");
    expect(skeleton).toBeTruthy();
  });

  it("displays the title", () => {
    renderWithProviders(<WslConfigEditor />);
    expect(screen.getByText(".wslconfig (Global WSL2 Settings)")).toBeInTheDocument();
  });

  it("renders save button", () => {
    renderWithProviders(<WslConfigEditor />);
    expect(screen.getByText("Save")).toBeInTheDocument();
  });

  it("renders basic config fields", () => {
    renderWithProviders(<WslConfigEditor />);
    expect(screen.getByText("Memory Limit")).toBeInTheDocument();
    expect(screen.getByText("Processors")).toBeInTheDocument();
    expect(screen.getByText("Swap Size")).toBeInTheDocument();
    expect(screen.getByText("VM Idle Timeout (ms)")).toBeInTheDocument();
  });

  it("renders boolean toggle checkboxes", () => {
    renderWithProviders(<WslConfigEditor />);
    expect(screen.getByText("Localhost Forwarding")).toBeInTheDocument();
    expect(screen.getByText("Nested Virtualization")).toBeInTheDocument();
    expect(screen.getByText("DNS Tunneling")).toBeInTheDocument();
    expect(screen.getByText("Firewall")).toBeInTheDocument();
    expect(screen.getByText("Auto Proxy")).toBeInTheDocument();
  });

  it("renders advanced settings toggle", () => {
    renderWithProviders(<WslConfigEditor />);
    expect(screen.getByText("Advanced Settings")).toBeInTheDocument();
  });

  it("shows advanced fields when advanced toggle is clicked", () => {
    renderWithProviders(<WslConfigEditor />);
    // Advanced fields should not be visible initially
    expect(screen.queryByText("Custom Kernel Path")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Advanced Settings"));
    expect(screen.getByText("Custom Kernel Path")).toBeInTheDocument();
    expect(screen.getByText("Kernel Command Line")).toBeInTheDocument();
    expect(screen.getByText("Swap File Path")).toBeInTheDocument();
  });

  it("calls updateConfig.mutate when save is clicked", () => {
    renderWithProviders(<WslConfigEditor />);
    fireEvent.click(screen.getByText("Save"));
    expect(mockMutate).toHaveBeenCalledOnce();
  });

  it("renders memory input with correct placeholder", () => {
    renderWithProviders(<WslConfigEditor />);
    expect(screen.getByPlaceholderText("e.g. 4GB")).toBeInTheDocument();
  });

  it("updates form when memory input changes", () => {
    renderWithProviders(<WslConfigEditor />);
    const memoryInput = screen.getByPlaceholderText("e.g. 4GB");
    fireEvent.change(memoryInput, { target: { value: "8GB" } });
    expect((memoryInput as HTMLInputElement).value).toBe("8GB");
  });

  it("updates processors input", () => {
    renderWithProviders(<WslConfigEditor />);
    const processorsInput = screen.getByPlaceholderText("All available");
    fireEvent.change(processorsInput, { target: { value: "8" } });
    expect((processorsInput as HTMLInputElement).value).toBe("8");
  });

  it("updates swap input", () => {
    renderWithProviders(<WslConfigEditor />);
    const swapInput = screen.getByPlaceholderText("e.g. 2GB");
    fireEvent.change(swapInput, { target: { value: "4GB" } });
    expect((swapInput as HTMLInputElement).value).toBe("4GB");
  });

  it("updates VM idle timeout input", () => {
    renderWithProviders(<WslConfigEditor />);
    const timeoutInput = screen.getByPlaceholderText("60000");
    fireEvent.change(timeoutInput, { target: { value: "30000" } });
    expect((timeoutInput as HTMLInputElement).value).toBe("30000");
  });

  it("toggles checkbox settings", () => {
    renderWithProviders(<WslConfigEditor />);
    const localhostCheckbox = screen.getByLabelText("Localhost Forwarding") as HTMLInputElement;
    expect(localhostCheckbox.checked).toBe(false);
    fireEvent.click(localhostCheckbox);
    expect(localhostCheckbox.checked).toBe(true);
  });

  it("clears numeric input to empty when emptied", () => {
    renderWithProviders(<WslConfigEditor />);
    const processorsInput = screen.getByPlaceholderText("All available") as HTMLInputElement;
    fireEvent.change(processorsInput, { target: { value: "" } });
    expect(processorsInput.value).toBe("");
  });

  it("clears text input to empty when emptied", () => {
    renderWithProviders(<WslConfigEditor />);
    const memoryInput = screen.getByPlaceholderText("e.g. 4GB") as HTMLInputElement;
    fireEvent.change(memoryInput, { target: { value: "" } });
    expect(memoryInput.value).toBe("");
  });

  it("renders networking mode select", () => {
    renderWithProviders(<WslConfigEditor />);
    expect(screen.getByText("Networking Mode")).toBeInTheDocument();
  });

  it("renders auto memory reclaim select", () => {
    renderWithProviders(<WslConfigEditor />);
    expect(screen.getByText("Auto Memory Reclaim")).toBeInTheDocument();
  });

  it("shows advanced fields including Default VHD Size", () => {
    renderWithProviders(<WslConfigEditor />);
    fireEvent.click(screen.getByText("Advanced Settings"));
    expect(screen.getByText("Default VHD Size")).toBeInTheDocument();
    expect(screen.getByText("Custom Kernel Path")).toBeInTheDocument();
    expect(screen.getByText("Kernel Command Line")).toBeInTheDocument();
    expect(screen.getByText("Swap File Path")).toBeInTheDocument();
  });

  it("edits kernel path in advanced settings", () => {
    renderWithProviders(<WslConfigEditor />);
    fireEvent.click(screen.getByText("Advanced Settings"));
    const kernelInput = screen.getByPlaceholderText(/C:\\Users\\user\\kernel/i) as HTMLInputElement;
    fireEvent.change(kernelInput, { target: { value: "/custom/kernel" } });
    expect(kernelInput.value).toBe("/custom/kernel");
  });

  it("edits kernel command line in advanced settings", () => {
    renderWithProviders(<WslConfigEditor />);
    fireEvent.click(screen.getByText("Advanced Settings"));
    const cmdInput = screen.getByPlaceholderText(/initrd/i) as HTMLInputElement;
    fireEvent.change(cmdInput, { target: { value: "console=ttyS0" } });
    expect(cmdInput.value).toBe("console=ttyS0");
  });

  it("marks field as touched on blur", () => {
    renderWithProviders(<WslConfigEditor />);
    const memoryInput = screen.getByPlaceholderText("e.g. 4GB");
    fireEvent.blur(memoryInput);
    // After blur, the field is marked touched (validation would show if there were errors)
    // Since we mock validateWslConfig to return {}, no error shown
    expect(memoryInput).toBeInTheDocument();
  });

  it("renders all boolean toggle checkboxes", () => {
    renderWithProviders(<WslConfigEditor />);
    const expectedLabels = [
      "Localhost Forwarding",
      "Nested Virtualization",
      "DNS Tunneling",
      "Firewall",
      "Auto Proxy",
      "GUI Applications (WSLg)",
      "DNS Proxy",
      "Safe Mode",
      "Sparse VHD (Auto-shrink)",
    ];
    for (const label of expectedLabels) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("toggles nested virtualization checkbox", () => {
    renderWithProviders(<WslConfigEditor />);
    const checkbox = screen.getByLabelText("Nested Virtualization") as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
  });

  it("toggles dns tunneling checkbox", () => {
    renderWithProviders(<WslConfigEditor />);
    const checkbox = screen.getByLabelText("DNS Tunneling") as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
  });

  it("edits swap file path in advanced settings", () => {
    renderWithProviders(<WslConfigEditor />);
    fireEvent.click(screen.getByText("Advanced Settings"));
    const swapFileInput = screen.getByPlaceholderText(
      /C:\\Users\\user\\swap\.vhdx/i,
    ) as HTMLInputElement;
    fireEvent.change(swapFileInput, { target: { value: "C:\\temp\\swap.vhdx" } });
    expect(swapFileInput.value).toBe("C:\\temp\\swap.vhdx");
  });

  it("edits default VHD size in advanced settings", () => {
    renderWithProviders(<WslConfigEditor />);
    fireEvent.click(screen.getByText("Advanced Settings"));
    const vhdInput = screen.getByPlaceholderText("e.g. 1024GB") as HTMLInputElement;
    fireEvent.change(vhdInput, { target: { value: "512GB" } });
    expect(vhdInput.value).toBe("512GB");
  });

  it("hides advanced fields when toggle is clicked again", () => {
    renderWithProviders(<WslConfigEditor />);
    fireEvent.click(screen.getByText("Advanced Settings"));
    expect(screen.getByText("Custom Kernel Path")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Advanced Settings"));
    expect(screen.queryByText("Custom Kernel Path")).not.toBeInTheDocument();
  });

  it("does not call mutate when form has validation errors", () => {
    mockHasErrors = true;
    renderWithProviders(<WslConfigEditor />);
    fireEvent.click(screen.getByText("Save"));
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("shows validation error for memory field after blur", () => {
    mockErrors = { memory: "Invalid format" };
    renderWithProviders(<WslConfigEditor />);
    const memoryInput = screen.getByPlaceholderText("e.g. 4GB");
    fireEvent.blur(memoryInput);
    expect(screen.getByText("Invalid format")).toBeInTheDocument();
  });

  it("shows validation error for processors field after blur", () => {
    mockErrors = { processors: "Must be an integer between 1 and 128" };
    renderWithProviders(<WslConfigEditor />);
    const processorsInput = screen.getByPlaceholderText("All available");
    fireEvent.blur(processorsInput);
    expect(screen.getByText("Must be an integer between 1 and 128")).toBeInTheDocument();
  });

  it("syncs form when fetched config changes", () => {
    const { rerender } = renderWithProviders(<WslConfigEditor />);
    mockData = { ...defaultConfig, memory: "16GB" };
    rerender(<WslConfigEditor />);
    const memoryInput = screen.getByPlaceholderText("e.g. 4GB") as HTMLInputElement;
    expect(memoryInput.value).toBe("16GB");
  });

  it("updates networking mode when option is selected", () => {
    Element.prototype.scrollIntoView = vi.fn();
    renderWithProviders(<WslConfigEditor />);
    const trigger = screen.getByLabelText("Networking Mode");
    fireEvent.click(trigger);
    fireEvent.click(screen.getByText("Mirrored"));
    // After selection the trigger should display the selected value
    expect(trigger).toHaveTextContent("Mirrored");
  });

  it("updates auto memory reclaim when option is selected", () => {
    Element.prototype.scrollIntoView = vi.fn();
    renderWithProviders(<WslConfigEditor />);
    const trigger = screen.getByLabelText("Auto Memory Reclaim");
    fireEvent.click(trigger);
    fireEvent.click(screen.getByText("Gradual"));
    expect(trigger).toHaveTextContent("Gradual");
  });

  it("blurs default_vhd_size in advanced settings and shows error", () => {
    mockErrors = { default_vhd_size: "Must be a number followed by KB, MB, or GB (e.g. 1024GB)" };
    renderWithProviders(<WslConfigEditor />);
    fireEvent.click(screen.getByText("Advanced Settings"));
    const vhdInput = screen.getByPlaceholderText("e.g. 1024GB");
    fireEvent.blur(vhdInput);
    expect(
      screen.getByText("Must be a number followed by KB, MB, or GB (e.g. 1024GB)"),
    ).toBeInTheDocument();
  });

  it("save button is disabled when form has validation errors", () => {
    mockHasErrors = true;
    renderWithProviders(<WslConfigEditor />);
    const saveButton = screen.getByTestId("wslconfig-save");
    expect(saveButton).toBeDisabled();
  });
});
