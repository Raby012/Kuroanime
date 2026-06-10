// src/components/ThemeProvider.tsx
// Loads saved settings from API and applies CSS variables globally
"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";

const BG_STYLES: Record<string, { surface: string; surface1: string; surface2: string; surface3: string }> = {
  dark:     { surface: "#0d0d14", surface1: "#13131e", surface2: "#1a1a28", surface3: "#222233" },
  darker:   { surface: "#0a0a0e", surface1: "#101018", surface2: "#161624", surface3: "#1e1e2e" },
  midnight: { surface: "#070710", surface1: "#0d0d1a", surface2: "#131325", surface3: "#1a1a30" },
  amoled:   { surface: "#000000", surface1: "#0a0a0a", surface2: "#111111", surface3: "#1a1a1a" },
};

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  // darken for brand-dark, lighten for brand-light
  const dark  = `#${Math.max(0,r-50).toString(16).padStart(2,'0')}${Math.max(0,g-20).toString(16).padStart(2,'0')}${Math.max(0,b-20).toString(16).padStart(2,'0')}`;
  const light = `#${Math.min(255,r+50).toString(16).padStart(2,'0')}${Math.min(255,g+50).toString(16).padStart(2,'0')}${Math.min(255,b+50).toString(16).padStart(2,'0')}`;
  return { dark, light };
}

function applyTheme(accentColor: string, bgStyle: string) {
  const root = document.documentElement;
  const { dark, light } = hexToRgb(accentColor);
  root.style.setProperty("--color-brand",       accentColor);
  root.style.setProperty("--color-brand-dark",  dark);
  root.style.setProperty("--color-brand-light", light);

  const bg = BG_STYLES[bgStyle] || BG_STYLES.dark;
  root.style.setProperty("--color-surface",   bg.surface);
  root.style.setProperty("--color-surface-1", bg.surface1);
  root.style.setProperty("--color-surface-2", bg.surface2);
  root.style.setProperty("--color-surface-3", bg.surface3);

  // Also update scrollbar and other brand-colored elements
  root.style.setProperty("--color-brand-hex", accentColor);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  useEffect(() => {
    if (!session) return;
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) {
          applyTheme(d.settings.accentColor || "#e11d48", d.settings.bgStyle || "dark");
        }
      })
      .catch(() => {});
  }, [session]);

  return <>{children}</>;
}

// Export applyTheme so settings page can call it for live preview
export { applyTheme };
