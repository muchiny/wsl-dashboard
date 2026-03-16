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

  it("selects a language when option is clicked", () => {
    renderWithProviders(<LanguageSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: /switch to/i }));
    fireEvent.click(screen.getByText("Fran\u00e7ais"));
    expect(mockSetLocale).toHaveBeenCalledWith("fr");
  });

  it("closes dropdown after selecting a language", () => {
    renderWithProviders(<LanguageSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: /switch to/i }));
    fireEvent.click(screen.getByText("Espa\u00f1ol"));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("closes dropdown when clicking toggle button again", () => {
    renderWithProviders(<LanguageSwitcher />);
    const button = screen.getByRole("button", { name: /switch to/i });
    fireEvent.click(button);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.click(button);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("opens dropdown with ArrowDown key", () => {
    renderWithProviders(<LanguageSwitcher />);
    const button = screen.getByRole("button", { name: /switch to/i });
    fireEvent.keyDown(button, { key: "ArrowDown" });
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("opens dropdown with ArrowUp key", () => {
    renderWithProviders(<LanguageSwitcher />);
    const button = screen.getByRole("button", { name: /switch to/i });
    fireEvent.keyDown(button, { key: "ArrowUp" });
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("selects highlighted option with Enter key", () => {
    renderWithProviders(<LanguageSwitcher />);
    const button = screen.getByRole("button", { name: /switch to/i });
    // Open with ArrowDown (highlights first item at index 0)
    fireEvent.keyDown(button, { key: "ArrowDown" });
    // Move down to second item (Fran\u00e7ais at index 1)
    fireEvent.keyDown(button, { key: "ArrowDown" });
    // Select with Enter
    fireEvent.keyDown(button, { key: "Enter" });
    expect(mockSetLocale).toHaveBeenCalledWith("fr");
  });

  it("opens dropdown with Enter key when closed", () => {
    renderWithProviders(<LanguageSwitcher />);
    const button = screen.getByRole("button", { name: /switch to/i });
    fireEvent.keyDown(button, { key: "Enter" });
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("opens dropdown with Space key when closed", () => {
    renderWithProviders(<LanguageSwitcher />);
    const button = screen.getByRole("button", { name: /switch to/i });
    fireEvent.keyDown(button, { key: " " });
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("closes dropdown with Tab key", () => {
    renderWithProviders(<LanguageSwitcher />);
    const button = screen.getByRole("button", { name: /switch to/i });
    fireEvent.click(button);
    fireEvent.keyDown(button, { key: "Tab" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("highlights option on mouse enter", () => {
    renderWithProviders(<LanguageSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: /switch to/i }));
    const options = screen.getAllByRole("option");
    fireEvent.mouseEnter(options[2]!);
    expect(options[2]).toHaveClass("bg-white/10");
  });

  it("marks current locale as selected", () => {
    renderWithProviders(<LanguageSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: /switch to/i }));
    const enOption = screen
      .getAllByRole("option")
      .find((opt) => opt.getAttribute("aria-selected") === "true");
    expect(enOption).toBeDefined();
  });

  it("navigates up with ArrowUp key when open", () => {
    renderWithProviders(<LanguageSwitcher />);
    const button = screen.getByRole("button", { name: /switch to/i });
    // Open with ArrowUp (highlights last item at index 3)
    fireEvent.keyDown(button, { key: "ArrowUp" });
    // Select with Enter - should select "zh" (last locale)
    fireEvent.keyDown(button, { key: "Enter" });
    expect(mockSetLocale).toHaveBeenCalledWith("zh");
  });

  it("does not go below last option with ArrowDown", () => {
    renderWithProviders(<LanguageSwitcher />);
    const button = screen.getByRole("button", { name: /switch to/i });
    fireEvent.keyDown(button, { key: "ArrowDown" }); // opens, index 0
    fireEvent.keyDown(button, { key: "ArrowDown" }); // index 1
    fireEvent.keyDown(button, { key: "ArrowDown" }); // index 2
    fireEvent.keyDown(button, { key: "ArrowDown" }); // index 3 (last)
    fireEvent.keyDown(button, { key: "ArrowDown" }); // should stay at 3
    fireEvent.keyDown(button, { key: "Enter" });
    expect(mockSetLocale).toHaveBeenCalledWith("zh");
  });

  it("does not go above first option with ArrowUp", () => {
    renderWithProviders(<LanguageSwitcher />);
    const button = screen.getByRole("button", { name: /switch to/i });
    fireEvent.keyDown(button, { key: "ArrowDown" }); // opens, index 0
    fireEvent.keyDown(button, { key: "ArrowUp" }); // should stay at 0
    fireEvent.keyDown(button, { key: "Enter" });
    expect(mockSetLocale).toHaveBeenCalledWith("en");
  });
});
