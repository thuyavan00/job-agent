import { useTheme } from "@/theme/ThemeProvider";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-text-2 hover:bg-card hover:text-text"
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      <span className="select-none">{theme === "dark" ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
