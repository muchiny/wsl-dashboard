import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { DistroList } from "./distro-list";
import type { Distro } from "@/shared/types/distro";

// Mock TanStack Router's Link used by DistroCard
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <a href={props.to as string} aria-label={props["aria-label"] as string}>
      {children}
    </a>
  ),
}));

// Mock tauri invoke used directly by DistroList handlers
vi.mock("@/shared/api/tauri-client", () => ({
  tauriInvoke: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/features/terminal/api/mutations", () => ({
  useCreateTerminalSession: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

// Mock snapshot counts hook
vi.mock("@/features/snapshot-list/api/queries", () => ({
  useSnapshotCounts: () => ({}),
}));

function makeDistro(overrides: Partial<Distro> = {}): Distro {
  return {
    name: "Ubuntu",
    state: "Running",
    wsl_version: 2,
    is_default: false,
    base_path: null,
    vhdx_size_bytes: null,
    last_seen: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

const SNAPSHOT_LABEL = "Create snapshot of Ubuntu";
const CARD_LABEL = "Ubuntu - Running";

const noop = () => {};

const defaultProps = {
  distros: [] as Distro[],
  isLoading: false,
  error: null,
  viewMode: "grid" as const,
  isFiltered: false,
  onSnapshot: noop,
  onDelete: noop,
  selectedDistro: null as string | null,
  onSelectDistro: noop,
};

describe("DistroList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading skeletons when loading", () => {
    const { container } = renderWithProviders(<DistroList {...defaultProps} isLoading={true} />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons).toHaveLength(3);
  });

  it("shows error message when query fails", () => {
    renderWithProviders(<DistroList {...defaultProps} error={new Error("Connection refused")} />);
    expect(
      screen.getByText(/Failed to load distributions: Connection refused/),
    ).toBeInTheDocument();
  });

  it("shows empty state when no distros and not filtered", () => {
    renderWithProviders(<DistroList {...defaultProps} />);
    expect(screen.getByText("No distributions found")).toBeInTheDocument();
  });

  it("shows filter empty state when no distros match filters", () => {
    renderWithProviders(<DistroList {...defaultProps} isFiltered={true} />);
    expect(screen.getByText("No distributions match your filters")).toBeInTheDocument();
  });

  it("renders a distro card for each distro in grid mode", () => {
    const distros = [
      makeDistro({ name: "Ubuntu" }),
      makeDistro({ name: "Debian", state: "Stopped" }),
      makeDistro({ name: "Fedora" }),
    ];

    renderWithProviders(<DistroList {...defaultProps} distros={distros} />);
    expect(screen.getByText("Ubuntu")).toBeInTheDocument();
    expect(screen.getByText("Debian")).toBeInTheDocument();
    expect(screen.getByText("Fedora")).toBeInTheDocument();
  });

  it("renders distro rows in list mode", () => {
    const distros = [
      makeDistro({ name: "Ubuntu" }),
      makeDistro({ name: "Debian", state: "Stopped" }),
    ];

    renderWithProviders(<DistroList {...defaultProps} distros={distros} viewMode="list" />);
    expect(screen.getByText("Ubuntu")).toBeInTheDocument();
    expect(screen.getByText("Debian")).toBeInTheDocument();
  });

  it("calls onSnapshot callback with the distro name when snapshot button is clicked", () => {
    const onSnapshot = vi.fn();
    const distros = [makeDistro({ name: "Ubuntu" })];

    renderWithProviders(<DistroList {...defaultProps} distros={distros} onSnapshot={onSnapshot} />);
    fireEvent.click(screen.getByLabelText(SNAPSHOT_LABEL));
    expect(onSnapshot).toHaveBeenCalledOnce();
    expect(onSnapshot).toHaveBeenCalledWith("Ubuntu");
  });

  it("calls onSelectDistro when a distro card is clicked in grid mode", () => {
    const onSelectDistro = vi.fn();
    const distros = [makeDistro({ name: "Ubuntu" })];

    renderWithProviders(
      <DistroList {...defaultProps} distros={distros} onSelectDistro={onSelectDistro} />,
    );

    fireEvent.click(screen.getByRole("button", { name: CARD_LABEL }));
    expect(onSelectDistro).toHaveBeenCalledOnce();
    expect(onSelectDistro).toHaveBeenCalledWith("Ubuntu");
  });

  it("calls onSelectDistro when a distro row is clicked in list mode", () => {
    const onSelectDistro = vi.fn();
    const distros = [makeDistro({ name: "Ubuntu" })];

    renderWithProviders(
      <DistroList
        {...defaultProps}
        distros={distros}
        viewMode="list"
        onSelectDistro={onSelectDistro}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: CARD_LABEL }));
    expect(onSelectDistro).toHaveBeenCalledOnce();
    expect(onSelectDistro).toHaveBeenCalledWith("Ubuntu");
  });

  it("highlights the selected distro card", () => {
    const distros = [
      makeDistro({ name: "Ubuntu" }),
      makeDistro({ name: "Debian", state: "Stopped" }),
    ];

    renderWithProviders(<DistroList {...defaultProps} distros={distros} selectedDistro="Ubuntu" />);

    const ubuntuCard = screen.getByText("Ubuntu").closest('[role="button"]')!;
    expect(ubuntuCard.getAttribute("aria-pressed")).toBe("true");

    const debianCard = screen.getByText("Debian").closest('[role="button"]')!;
    expect(debianCard.getAttribute("aria-pressed")).toBe("false");
  });

  it("calls tauriInvoke with stop_distro when stop button is clicked", async () => {
    const { tauriInvoke } = await import("@/shared/api/tauri-client");
    const distros = [makeDistro({ name: "Ubuntu", state: "Running" })];

    renderWithProviders(<DistroList {...defaultProps} distros={distros} />);
    fireEvent.click(screen.getByLabelText("Stop Ubuntu"));
    expect(tauriInvoke).toHaveBeenCalledWith("stop_distro", { name: "Ubuntu" });
  });

  it("calls tauriInvoke with start_distro when start button is clicked", async () => {
    const { tauriInvoke } = await import("@/shared/api/tauri-client");
    const distros = [makeDistro({ name: "Debian", state: "Stopped" })];

    renderWithProviders(<DistroList {...defaultProps} distros={distros} />);
    fireEvent.click(screen.getByLabelText("Start Debian"));
    expect(tauriInvoke).toHaveBeenCalledWith("start_distro", { name: "Debian" });
  });

  it("can start/stop multiple distros concurrently", async () => {
    const { tauriInvoke } = await import("@/shared/api/tauri-client");
    const distros = [
      makeDistro({ name: "Ubuntu", state: "Running" }),
      makeDistro({ name: "Fedora", state: "Running" }),
      makeDistro({ name: "Debian", state: "Stopped" }),
    ];

    renderWithProviders(<DistroList {...defaultProps} distros={distros} />);

    // Stop Ubuntu
    fireEvent.click(screen.getByLabelText("Stop Ubuntu"));
    // Stop Fedora
    fireEvent.click(screen.getByLabelText("Stop Fedora"));
    // Start Debian
    fireEvent.click(screen.getByLabelText("Start Debian"));

    expect(tauriInvoke).toHaveBeenCalledWith("stop_distro", { name: "Ubuntu" });
    expect(tauriInvoke).toHaveBeenCalledWith("stop_distro", { name: "Fedora" });
    expect(tauriInvoke).toHaveBeenCalledWith("start_distro", { name: "Debian" });
  });

  it("disables buttons only on the pending distro, not others", async () => {
    const { tauriInvoke } = await import("@/shared/api/tauri-client");
    // Make tauriInvoke hang (never resolve) to keep the pending state
    vi.mocked(tauriInvoke).mockReturnValue(new Promise(() => {}));

    const distros = [
      makeDistro({ name: "Ubuntu", state: "Running" }),
      makeDistro({ name: "Fedora", state: "Running" }),
    ];

    renderWithProviders(<DistroList {...defaultProps} distros={distros} />);

    // Stop Ubuntu — its buttons become disabled
    fireEvent.click(screen.getByLabelText("Stop Ubuntu"));

    // Ubuntu's stop button should be disabled
    const ubuntuStop = screen.getByLabelText("Stop Ubuntu");
    expect(ubuntuStop).toBeDisabled();

    // Fedora's stop button should still be enabled
    const fedoraStop = screen.getByLabelText("Stop Fedora");
    expect(fedoraStop).not.toBeDisabled();
  });

  it("calls tauriInvoke with restart_distro when restart button is clicked", async () => {
    const { tauriInvoke } = await import("@/shared/api/tauri-client");
    const distros = [makeDistro({ name: "Ubuntu", state: "Running" })];

    renderWithProviders(<DistroList {...defaultProps} distros={distros} />);
    fireEvent.click(screen.getByLabelText("Restart Ubuntu"));
    expect(tauriInvoke).toHaveBeenCalledWith("restart_distro", { name: "Ubuntu" });
  });

  it("calls onDelete callback when delete button is clicked", () => {
    const onDelete = vi.fn();
    const distros = [makeDistro({ name: "Ubuntu" })];

    renderWithProviders(<DistroList {...defaultProps} distros={distros} onDelete={onDelete} />);
    fireEvent.click(screen.getByLabelText("Delete Ubuntu"));
    expect(onDelete).toHaveBeenCalledWith("Ubuntu");
  });
});
