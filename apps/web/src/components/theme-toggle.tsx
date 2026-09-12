"use client";

import { useSyncExternalStore } from "react";

import {
  isTheme,
  otherTheme,
  THEME_COLORS,
  THEME_STORAGE_KEY,
  type Theme,
} from "@/lib/theme";

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

function themeFromSystem(): Theme {
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

function readStoredTheme(): Theme | null {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(raw) ? raw : null;
  } catch {
    return null;
  }
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", THEME_COLORS[theme]);
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const media = window.matchMedia("(prefers-color-scheme: light)");
  media.addEventListener("change", emit);
  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", emit);
  };
}

function getSnapshot(): Theme {
  return readStoredTheme() ?? themeFromSystem();
}

function getServerSnapshot(): Theme {
  return "dark";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const next = otherTheme(theme);
  const label = next === "light" ? "Modo claro" : "Modo escuro";

  return (
    <button
      type="button"
      className="btn theme-toggle"
      aria-label={label}
      title={label}
      suppressHydrationWarning
      onClick={() => {
        try {
          localStorage.setItem(THEME_STORAGE_KEY, next);
        } catch {
          // Keep the in-page theme even if storage is blocked.
        }
        applyTheme(next);
        emit();
      }}
    >
      <ThemeIcon theme={next} />
      <span className="theme-toggle-label">{label}</span>
    </button>
  );
}

function ThemeIcon({ theme }: { theme: Theme }) {
  if (theme === "light") {
    return (
      <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
      <path
        d="M12.6 10.2A5.2 5.2 0 0 1 5.8 3.4 5.3 5.3 0 1 0 12.6 10.2Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
