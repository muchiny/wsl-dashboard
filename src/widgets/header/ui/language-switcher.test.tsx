import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";

const mockSetLocale = vi.fn();

vi.mock("@/shared/stores/use-locale-store", () => ({
  useLocaleStore: () => ({
    locale: "en",
    setLocale: mockSetLocale,
  }),
}));

vi.mock("@/shared/config/i18n", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/config/i18n")>();
  return {
    ...actual,
    supportedLocales: ["en", "fr", "es", "zh"],
    localeLabels: {
      en: "English",
      fr: "Fran\u00e7ais",
      es: "Espa\u00f1ol",
      zh: "\u4e2d\u6587 (Chinese)",
    },
  };
});

vi.mock("@/shared/assets/flags/gb.svg", () => ({ default: "gb.svg" }));
vi.mock("@/shared/assets/flags/fr.svg", () => ({ default: "fr.svg" }));
vi.mock("@/shared/assets/flags/es.svg", () => ({ default: "es.svg" }));
vi.mock("@/shared/assets/flags/cn.svg", () => ({ default: "cn.svg" }));

const { LanguageSwitcher } = await import("./language-switcher");

describe("LanguageSwitcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders current language button", () => {
    renderWithProviders(<LanguageSwitcher />);
    const button = screen.getByRole("button", { name: /switch to/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("opens dropdown on click", () => {
    renderWithProviders(<LanguageSwitcher />);

    const button = screen.getByRole("button", { name: /switch to/i });
    fireEvent.click(button);

    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("shows all language options when open", () => {
    renderWithProviders(<LanguageSwitcher />);

    fireEvent.click(screen.getByRole("button", { name: /switch to/i }));

    expect(screen.getByText("English")).toBeInTheDocument();
    expect(screen.getByText("Fran\u00e7ais")).toBeInTheDocument();
    expect(screen.getByText("Espa\u00f1ol")).toBeInTheDocument();
    expect(screen.getByText("\u4e2d\u6587 (Chinese)")).toBeInTheDocument();
  });

  it("closes dropdown on Escape", () => {
    renderWithProviders(<LanguageSwitcher />);

    const button = screen.getByRole("button", { name: /switch to/i });
    fireEvent.click(button);
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.keyDown(button, { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("closes dropdown on click outside", () => {
    renderWithProviders(
      <div>
        <span data-testid="outside">Outside</span>
        <LanguageSwitcher />
      </div>,
    );

    fireEvent.click(screen.getByRole("button", { name: /switch to/i }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId("outside"));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
