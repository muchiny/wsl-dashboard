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

// Mock mutation hooks (still used internally by DistroList)
const mockStartMutate = vi.fn();
const mockStopMutate = vi.fn();
const mockRestartMutate = vi.fn();

vi.mock("../api/mutations", () => ({
  useStartDistro: () => ({
    mutate: mockStartMutate,
    isPending: false,
    variables: undefined,
  }),
  useStopDistro: () => ({
    mutate: mockStopMutate,
    isPending: false,
    variables: undefined,
  }),
  useRestartDistro: () => ({
    mutate: mockRestartMutate,
    isPending: false,
    variables: undefined,
  }),
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

// Mock SnapshotList used by DistroSnapshotPanel
vi.mock("@/features/snapshot-list/ui/snapshot-list", () => ({
  SnapshotList: ({ distroName }: { distroName?: string }) => (
    <div data-testid={`snapshot-list-${distroName}`}>Snapshots for {distroName}</div>
  ),
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
  onRestore: noop,
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

  it("shows snapshot panel when a distro card is clicked in grid mode", () => {
    const distros = [makeDistro({ name: "Ubuntu" })];

    renderWithProviders(<DistroList {...defaultProps} distros={distros} />);

    // Panel should not be visible initially
    expect(screen.queryByTestId("snapshot-list-Ubuntu")).not.toBeInTheDocument();

    // Click the card to expand
    fireEvent.click(screen.getByRole("button", { name: CARD_LABEL }));
    expect(screen.getByTestId("snapshot-list-Ubuntu")).toBeInTheDocument();
  });

  it("collapses panel when the same card is clicked again", () => {
    const distros = [makeDistro({ name: "Ubuntu" })];

    renderWithProviders(<DistroList {...defaultProps} distros={distros} />);

    const card = screen.getByRole("button", { name: CARD_LABEL });

    // Expand
    fireEvent.click(card);
    expect(screen.getByTestId("snapshot-list-Ubuntu")).toBeInTheDocument();

    // Collapse
    fireEvent.click(card);
    expect(screen.queryByTestId("snapshot-list-Ubuntu")).not.toBeInTheDocument();
  });

  it("shows snapshot panel when a distro row is clicked in list mode", () => {
    const distros = [makeDistro({ name: "Ubuntu" })];

    renderWithProviders(<DistroList {...defaultProps} distros={distros} viewMode="list" />);

    // Panel should not be visible initially
    expect(screen.queryByTestId("snapshot-list-Ubuntu")).not.toBeInTheDocument();

    // Click the row to expand
    fireEvent.click(screen.getByRole("button", { name: CARD_LABEL }));
    expect(screen.getByTestId("snapshot-list-Ubuntu")).toBeInTheDocument();

    // Click again to collapse
    fireEvent.click(screen.getByRole("button", { name: CARD_LABEL }));
    expect(screen.queryByTestId("snapshot-list-Ubuntu")).not.toBeInTheDocument();
  });

  it("only shows one panel at a time (accordion)", () => {
    const distros = [
      makeDistro({ name: "Ubuntu" }),
      makeDistro({ name: "Debian", state: "Stopped" }),
    ];

    renderWithProviders(<DistroList {...defaultProps} distros={distros} />);

    // Use text to find specific cards
    const ubuntuCard = screen.getByText("Ubuntu").closest('[role="button"]')!;
    const debianCard = screen.getByText("Debian").closest('[role="button"]')!;

    // Expand Ubuntu
    fireEvent.click(ubuntuCard);
    expect(screen.getByTestId("snapshot-list-Ubuntu")).toBeInTheDocument();

    // Expand Debian - Ubuntu should close
    fireEvent.click(debianCard);
    expect(screen.queryByTestId("snapshot-list-Ubuntu")).not.toBeInTheDocument();
    expect(screen.getByTestId("snapshot-list-Debian")).toBeInTheDocument();
  });
});
