import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Select, type SelectOption } from "./select";

// jsdom does not implement scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

const options: SelectOption[] = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
  { value: "cherry", label: "Cherry" },
];

describe("Select", () => {
  const defaultProps = {
    value: "",
    onChange: vi.fn(),
    options,
  };

  it("renders with placeholder when no value selected", () => {
    render(<Select {...defaultProps} placeholder="Pick a fruit" />);
    expect(screen.getByText("Pick a fruit")).toBeInTheDocument();
  });

  it("renders selected option label", () => {
    render(<Select {...defaultProps} value="banana" />);
    expect(screen.getByText("Banana")).toBeInTheDocument();
    expect(screen.queryByText("Select...")).not.toBeInTheDocument();
  });

  it("opens dropdown on click", () => {
    render(<Select {...defaultProps} />);
    const button = screen.getByRole("button");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("closes dropdown on second click", () => {
    render(<Select {...defaultProps} />);
    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("calls onChange when option clicked", () => {
    const onChange = vi.fn();
    render(<Select {...defaultProps} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByText("Cherry"));
    expect(onChange).toHaveBeenCalledWith("cherry");
  });

  it("ArrowDown opens dropdown and highlights first item", () => {
    render(<Select {...defaultProps} />);
    const button = screen.getByRole("button");
    fireEvent.keyDown(button, { key: "ArrowDown" });
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(button.getAttribute("aria-activedescendant")).toBe("select-option-0");
  });

  it("ArrowUp opens dropdown and highlights last item", () => {
    render(<Select {...defaultProps} />);
    const button = screen.getByRole("button");
    fireEvent.keyDown(button, { key: "ArrowUp" });
    expect(button.getAttribute("aria-expanded")).toBe("true");
    // allItems = placeholder + 3 options = 4 items, last index is 3
    expect(button.getAttribute("aria-activedescendant")).toBe("select-option-3");
  });

  it("ArrowDown navigates through options", () => {
    render(<Select {...defaultProps} />);
    const button = screen.getByRole("button");
    // Open with ArrowDown (highlights index 0)
    fireEvent.keyDown(button, { key: "ArrowDown" });
    expect(button.getAttribute("aria-activedescendant")).toBe("select-option-0");
    // Move to index 1
    fireEvent.keyDown(button, { key: "ArrowDown" });
    expect(button.getAttribute("aria-activedescendant")).toBe("select-option-1");
    // Move to index 2
    fireEvent.keyDown(button, { key: "ArrowDown" });
    expect(button.getAttribute("aria-activedescendant")).toBe("select-option-2");
    // Move to index 3 (last)
    fireEvent.keyDown(button, { key: "ArrowDown" });
    expect(button.getAttribute("aria-activedescendant")).toBe("select-option-3");
    // Should not go past last item
    fireEvent.keyDown(button, { key: "ArrowDown" });
    expect(button.getAttribute("aria-activedescendant")).toBe("select-option-3");
  });

  it("ArrowUp navigates through options", () => {
    render(<Select {...defaultProps} />);
    const button = screen.getByRole("button");
    // Open with ArrowUp (highlights last index = 3)
    fireEvent.keyDown(button, { key: "ArrowUp" });
    expect(button.getAttribute("aria-activedescendant")).toBe("select-option-3");
    // Move to index 2
    fireEvent.keyDown(button, { key: "ArrowUp" });
    expect(button.getAttribute("aria-activedescendant")).toBe("select-option-2");
    // Move to index 1
    fireEvent.keyDown(button, { key: "ArrowUp" });
    expect(button.getAttribute("aria-activedescendant")).toBe("select-option-1");
    // Move to index 0
    fireEvent.keyDown(button, { key: "ArrowUp" });
    expect(button.getAttribute("aria-activedescendant")).toBe("select-option-0");
    // Should not go past first item
    fireEvent.keyDown(button, { key: "ArrowUp" });
    expect(button.getAttribute("aria-activedescendant")).toBe("select-option-0");
  });

  it("Home key highlights first item", () => {
    render(<Select {...defaultProps} />);
    const button = screen.getByRole("button");
    // Open at last item
    fireEvent.keyDown(button, { key: "ArrowUp" });
    expect(button.getAttribute("aria-activedescendant")).toBe("select-option-3");
    // Home jumps to first
    fireEvent.keyDown(button, { key: "Home" });
    expect(button.getAttribute("aria-activedescendant")).toBe("select-option-0");
  });

  it("End key highlights last item", () => {
    render(<Select {...defaultProps} />);
    const button = screen.getByRole("button");
    // Open at first item
    fireEvent.keyDown(button, { key: "ArrowDown" });
    expect(button.getAttribute("aria-activedescendant")).toBe("select-option-0");
    // End jumps to last
    fireEvent.keyDown(button, { key: "End" });
    expect(button.getAttribute("aria-activedescendant")).toBe("select-option-3");
  });

  it("Enter selects highlighted option", () => {
    const onChange = vi.fn();
    render(<Select {...defaultProps} onChange={onChange} />);
    const button = screen.getByRole("button");
    // Open with ArrowDown (highlights index 0 = placeholder)
    fireEvent.keyDown(button, { key: "ArrowDown" });
    // Move to index 1 (Apple)
    fireEvent.keyDown(button, { key: "ArrowDown" });
    // Select with Enter
    fireEvent.keyDown(button, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("apple");
    // Dropdown should be closed
    expect(button.getAttribute("aria-expanded")).toBe("false");
  });

  it("Space selects highlighted option", () => {
    const onChange = vi.fn();
    render(<Select {...defaultProps} onChange={onChange} />);
    const button = screen.getByRole("button");
    // Open with ArrowDown (highlights index 0 = placeholder)
    fireEvent.keyDown(button, { key: "ArrowDown" });
    // Move to index 2 (Banana)
    fireEvent.keyDown(button, { key: "ArrowDown" });
    fireEvent.keyDown(button, { key: "ArrowDown" });
    // Select with Space
    fireEvent.keyDown(button, { key: " " });
    expect(onChange).toHaveBeenCalledWith("banana");
    expect(button.getAttribute("aria-expanded")).toBe("false");
  });

  it("Escape closes dropdown", () => {
    render(<Select {...defaultProps} />);
    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    fireEvent.keyDown(button, { key: "Escape" });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("Tab closes dropdown", () => {
    render(<Select {...defaultProps} />);
    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    fireEvent.keyDown(button, { key: "Tab" });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("shows check icon for selected option (aria-selected='true')", () => {
    render(<Select {...defaultProps} value="banana" />);
    fireEvent.click(screen.getByRole("button"));
    const allOptions = screen.getAllByRole("option");
    const selectedOption = allOptions.find(
      (el) => el.getAttribute("aria-selected") === "true",
    );
    expect(selectedOption).toBeTruthy();
    expect(selectedOption!.textContent).toContain("Banana");
    // Other options should not be selected
    const unselectedOptions = allOptions.filter(
      (el) => el.getAttribute("aria-selected") === "false",
    );
    expect(unselectedOptions.length).toBeGreaterThan(0);
  });

  it("renders with custom aria-label", () => {
    render(<Select {...defaultProps} aria-label="Choose fruit" />);
    const button = screen.getByRole("button");
    expect(button.getAttribute("aria-label")).toBe("Choose fruit");
  });

  it("click outside closes dropdown", () => {
    render(<Select {...defaultProps} />);
    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    // Simulate click outside
    fireEvent.mouseDown(document.body);
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
