export const THEME_STORAGE_KEY = "verdia-theme";

export type Theme = "light" | "dark";

export const THEME_COLORS: Record<Theme, string> = {
  dark: "#07110f",
  light: "#eef3f0",
};

export function isTheme(value: string | null | undefined): value is Theme {
  return value === "light" || value === "dark";
}

export function otherTheme(theme: Theme): Theme {
  return theme === "dark" ? "light" : "dark";
}

/** Blocking snippet so the first paint already matches the saved theme. */
export const THEME_BOOTSTRAP = `(function(){
  try {
    var stored = localStorage.getItem("${THEME_STORAGE_KEY}");
    var theme = stored === "light" || stored === "dark"
      ? stored
      : (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    var root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.style.colorScheme = theme;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "light" ? "${THEME_COLORS.light}" : "${THEME_COLORS.dark}");
  } catch (e) {
    var fallback = document.documentElement;
    fallback.setAttribute("data-theme", "dark");
    fallback.style.colorScheme = "dark";
  }
})();`;
