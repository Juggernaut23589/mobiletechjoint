"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "mtj-theme";

/** Flips the page's resting background/text pair between the current
 *  black theme and the pre-rebrand light one (see globals.css'
 *  `[data-theme="light"]` override) — nothing else on the page changes.
 *  The inline script in layout.tsx sets the initial `data-theme`
 *  attribute before hydration, so this just mirrors that into state. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    setTheme(document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark");
  }, []);

  function toggle() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      className="-m-2 flex items-center p-2 text-white transition-opacity hover:opacity-80"
    >
      {theme === "light" ? (
        <Moon className="h-5 w-5" strokeWidth={2} />
      ) : (
        <Sun className="h-5 w-5" strokeWidth={2} />
      )}
    </button>
  );
}
