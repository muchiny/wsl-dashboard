import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { useDistros } from "@/shared/api/distro-queries";
import { usePreferencesStore } from "@/shared/stores/use-preferences-store";
import { DistrosPage } from "./distros-page";

vi.mock("@/shared/api/distro-queries", () => ({ useDistros: vi.fn() }));
vi.mock("@/features/distro-list/api/mutations", () => ({
  useShutdownAll: vi.fn(() => ({ isPending: false, mutate: vi.fn() })),
  useStartDistro: vi.fn(),
  useStopDistro: vi.fn(),
  useRestartDistro: vi.fn(),
  useSetDefaultDistro: vi.fn(),
  useResizeVhd: vi.fn(),
  useStartAllDistros: vi.fn(),
}));
vi.mock("@/features/distro-list/ui/distro-list", () => ({
  DistroList: (props: Record<string, unknown>) => (
    <div data-testid="distro-list" data-view={props.viewMode as string} />
  ),
}));
vi.mock("@/features/distro-list/ui/distros-toolbar", () => ({
  DistrosToolbar: (props: Record<string, unknown>) => (
    <div
      data-testid="distros-toolbar"
      data-running={props.running as string}
      data-stopped={props.stopped as string}
      data-total={props.total as string}
    />
  ),
}));
vi.mock("@/features/distro-list/ui/distro-detail-drawer", () => ({
  DistroDetailDrawer: () => <div data-testid="detail-drawer" />,
}));
vi.mock("@/features/distro-list/hooks/use-distro-dialogs", () => ({
  useDistroDialogs: () => ({
    openCreateSnapshot: vi.fn(),
    openRestore: vi.fn(),
    openShutdownConfirm: vi.fn(),
    openDelete: vi.fn(),
    shutdownAllPending: false,
    DialogsRenderer: () => null,
  }),
}));
vi.mock("@/shared/hooks/use-debounce", () => ({
  useDebounce: <T,>(v: T) => v,
}));
const preferencesState = { sortKey: "name-asc" as const, viewMode: "grid" as const };
vi.mock("@/shared/stores/use-preferences-store", () => ({
  usePreferencesStore: vi.fn((selector?: (state: typeof preferencesState) => unknown) =>
    selector ? selector(preferencesState) : preferencesState,
  ),
}));

const mockDistros = [
  {
    name: "Ubuntu",
    state: "Running" as const,
    wsl_version: 2,
    is_default: true,
    base_path: null,
    vhdx_size_bytes: null,
    last_seen: "2026-01-01",
  },
  {
    name: "Debian",
    state: "Stopped" as const,
    wsl_version: 2,
    is_default: false,
    base_path: null,
    vhdx_size_bytes: null,
    last_seen: "2026-01-01",
  },
  {
    name: "Alpine",
    state: "Running" as const,
    wsl_version: 2,
    is_default: false,
    base_path: null,
    vhdx_size_bytes: null,
    last_seen: "2026-01-01",
  },
];

function setup() {
  vi.mocked(useDistros).mockReturnValue({
    data: mockDistros,
    isLoading: false,
    error: null,
  } as ReturnType<typeof useDistros>);
}

describe("DistrosPage", () => {
  it("renders toolbar with correct stats", () => {
    setup();
    renderWithProviders(<DistrosPage />);

    const toolbar = screen.getByTestId("distros-toolbar");
    expect(toolbar).toBeInTheDocument();
    expect(toolbar.dataset.running).toBe("2");
    expect(toolbar.dataset.stopped).toBe("1");
    expect(toolbar.dataset.total).toBe("3");
  });

  it("renders distro list component", () => {
    setup();
    renderWithProviders(<DistrosPage />);

    expect(screen.getByTestId("distro-list")).toBeInTheDocument();
  });

  it("passes viewMode from preferences store", () => {
    setup();
    const listState = { sortKey: "name-asc" as const, viewMode: "list" as const };
    vi.mocked(usePreferencesStore).mockImplementation(((
      selector?: (state: typeof listState) => unknown,
    ) => (selector ? selector(listState) : listState)) as typeof usePreferencesStore);

    renderWithProviders(<DistrosPage />);

    const list = screen.getByTestId("distro-list");
    expect(list.dataset.view).toBe("list");
  });

  it("computes running/stopped counts correctly from distros data", () => {
    vi.mocked(useDistros).mockReturnValue({
      data: [
        {
          name: "A",
          state: "Running",
          wsl_version: 2,
          is_default: false,
          base_path: null,
          vhdx_size_bytes: null,
          last_seen: "",
        },
        {
          name: "B",
          state: "Running",
          wsl_version: 2,
          is_default: false,
          base_path: null,
          vhdx_size_bytes: null,
          last_seen: "",
        },
        {
          name: "C",
          state: "Stopped",
          wsl_version: 2,
          is_default: false,
          base_path: null,
          vhdx_size_bytes: null,
          last_seen: "",
        },
        {
          name: "D",
          state: "Stopped",
          wsl_version: 2,
          is_default: false,
          base_path: null,
          vhdx_size_bytes: null,
          last_seen: "",
        },
        {
          name: "E",
          state: "Stopped",
          wsl_version: 2,
          is_default: false,
          base_path: null,
          vhdx_size_bytes: null,
          last_seen: "",
        },
      ],
      isLoading: false,
      error: null,
    } as ReturnType<typeof useDistros>);

    renderWithProviders(<DistrosPage />);

    const toolbar = screen.getByTestId("distros-toolbar");
    expect(toolbar.dataset.running).toBe("2");
    expect(toolbar.dataset.stopped).toBe("3");
    expect(toolbar.dataset.total).toBe("5");
  });
});
