import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { PortForwardingPanel } from "./port-forwarding-panel";

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

const mockRules = [
  { id: "rule-1", distro_name: "Ubuntu", wsl_port: 3000, host_port: 3000, protocol: "tcp" },
];

vi.mock("../api/queries", () => ({
  useListeningPorts: () => ({
    data: [],
    isLoading: false,
  }),
  usePortForwardingRules: () => ({
    data: mockRules,
    isLoading: false,
  }),
}));

const mockRemoveMutate = vi.fn();
vi.mock("../api/mutations", () => ({
  useRemovePortForwarding: () => ({
    mutate: mockRemoveMutate,
    isPending: false,
    variables: undefined,
  }),
}));

vi.mock("./add-rule-dialog", () => ({
  AddRuleDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="add-rule-dialog">Add Rule Dialog</div> : null,
}));

describe("PortForwardingPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the title", () => {
    renderWithProviders(<PortForwardingPanel />);
    expect(screen.getByText("Port Forwarding")).toBeInTheDocument();
  });

  it("renders the distribution selector label", () => {
    renderWithProviders(<PortForwardingPanel />);
    expect(screen.getByText("Distribution")).toBeInTheDocument();
  });

  it("renders active rules section", () => {
    renderWithProviders(<PortForwardingPanel />);
    expect(screen.getByText("Active Rules")).toBeInTheDocument();
  });

  it("renders add rule button", () => {
    renderWithProviders(<PortForwardingPanel />);
    expect(screen.getByText("Add Rule")).toBeInTheDocument();
  });

  it("shows port forwarding rules", () => {
    renderWithProviders(<PortForwardingPanel />);
    expect(screen.getByText("Ubuntu")).toBeInTheDocument();
    expect(screen.getByText(":3000")).toBeInTheDocument();
    expect(screen.getByText("localhost:3000")).toBeInTheDocument();
    expect(screen.getByText("tcp")).toBeInTheDocument();
  });

  it("shows admin warning", () => {
    renderWithProviders(<PortForwardingPanel />);
    expect(
      screen.getByText(/Port forwarding requires administrator privileges/),
    ).toBeInTheDocument();
  });

  it("opens add rule dialog when button is clicked", () => {
    renderWithProviders(<PortForwardingPanel />);
    expect(screen.queryByTestId("add-rule-dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Add Rule"));
    expect(screen.getByTestId("add-rule-dialog")).toBeInTheDocument();
  });
});
