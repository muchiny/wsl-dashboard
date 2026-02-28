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

vi.mock("../lib/validation", () => ({
  validateWslConfig: () => ({}),
  hasErrors: () => false,
}));

describe("WslConfigEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoading = false;
    mockData = defaultConfig;
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
});
