import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DistroList } from "./distro-list";
import type { Distro } from "@/shared/types/distro";

// Mock TanStack Router's Link used by DistroCard
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <a href={props.to as string} title={props.title as string}>
      {children}
    </a>
  ),
}));

// Mock query and mutation hooks
const mockUseDistros = vi.fn();
const mockStartMutate = vi.fn();
const mockStopMutate = vi.fn();
const mockRestartMutate = vi.fn();

vi.mock("../api/queries", () => ({
  useDistros: () => mockUseDistros(),
}));

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

const noop = () => {};

describe("DistroList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading skeletons when loading", () => {
    mockUseDistros.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    const { container } = render(<DistroList onSnapshot={noop} />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons).toHaveLength(3);
  });

  it("shows error message when query fails", () => {
    mockUseDistros.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Connection refused"),
    });

    render(<DistroList onSnapshot={noop} />);
    expect(screen.getByText(/failed to load distributions/i)).toBeInTheDocument();
    expect(screen.getByText(/connection refused/i)).toBeInTheDocument();
  });

  it("shows empty state when no distros are returned", () => {
    mockUseDistros.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    render(<DistroList onSnapshot={noop} />);
    expect(
      screen.getByText(/no wsl distributions found/i),
    ).toBeInTheDocument();
  });

  it("renders a distro card for each distro", () => {
    const distros = [
      makeDistro({ name: "Ubuntu" }),
      makeDistro({ name: "Debian", state: "Stopped" }),
      makeDistro({ name: "Fedora" }),
    ];

    mockUseDistros.mockReturnValue({
      data: distros,
      isLoading: false,
      error: null,
    });

    render(<DistroList onSnapshot={noop} />);
    expect(screen.getByText("Ubuntu")).toBeInTheDocument();
    expect(screen.getByText("Debian")).toBeInTheDocument();
    expect(screen.getByText("Fedora")).toBeInTheDocument();
  });

  it("calls onSnapshot callback with the distro name when snapshot button is clicked", () => {
    const onSnapshot = vi.fn();
    const distros = [makeDistro({ name: "Ubuntu" })];

    mockUseDistros.mockReturnValue({
      data: distros,
      isLoading: false,
      error: null,
    });

    render(<DistroList onSnapshot={onSnapshot} />);
    fireEvent.click(screen.getByTitle("Create snapshot"));
    expect(onSnapshot).toHaveBeenCalledOnce();
    expect(onSnapshot).toHaveBeenCalledWith("Ubuntu");
  });

  it("shows empty state when data is undefined (not loading, no error)", () => {
    mockUseDistros.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });

    render(<DistroList onSnapshot={noop} />);
    expect(
      screen.getByText(/no wsl distributions found/i),
    ).toBeInTheDocument();
  });
});
