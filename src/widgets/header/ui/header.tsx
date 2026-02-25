import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "@/shared/hooks/use-theme";

export function Header() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <header className="border-border bg-card flex h-14 items-center justify-between border-b px-6">
      <div />
      <button
        onClick={toggleTheme}
        className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-md p-2 transition-colors"
        aria-label="Toggle theme"
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
    </header>
  );
}
