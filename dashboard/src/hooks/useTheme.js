import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "spotify-intel-theme";

function initialTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch (error) {
    console.warn("Theme storage unavailable", error);
  }
  return "dark";
}

export default function useTheme() {
  const [theme, setTheme] = useState(initialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "light" ? "#f3f6fa" : "#080d14");
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
      console.warn("Theme persistence unavailable", error);
    }
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggle };
}
