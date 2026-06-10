// src/app/settings/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Palette, Monitor, Tv } from "lucide-react";
import { applyTheme } from "@/components/ThemeProvider";

const ACCENT_COLORS = [
  { name: "Red",    value: "#E63946" },
  { name: "Blue",   value: "#3B82F6" },
  { name: "Purple", value: "#8B5CF6" },
  { name: "Green",  value: "#10B981" },
  { name: "Orange", value: "#F97316" },
  { name: "Pink",   value: "#EC4899" },
  { name: "Cyan",   value: "#06B6D4" },
  { name: "Yellow", value: "#EAB308" },
];

const BG_STYLES = [
  { name: "Dark",     value: "dark",     bg: "#0d0d14", desc: "Default dark theme"      },
  { name: "Darker",   value: "darker",   bg: "#0a0a0e", desc: "Slightly darker"         },
  { name: "Midnight", value: "midnight", bg: "#070710", desc: "Deep midnight blue"      },
  { name: "AMOLED",   value: "amoled",   bg: "#000000", desc: "Pure black (OLED screens)" },
];

interface Settings {
  accentColor: string;
  bgStyle:     string;
  defaultLang: string;
}

const DEFAULT: Settings = { accentColor: "#E63946", bgStyle: "dark", defaultLang: "sub" };

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>(DEFAULT);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetch("/api/settings").then((r) => r.json()).then((d) => {
        if (d.settings) setSettings({ ...DEFAULT, ...d.settings });
      });
    }
  }, [session]);

  // Live preview — apply theme instantly as user clicks
  function updateAccent(color: string) {
    setSettings((s) => ({ ...s, accentColor: color }));
    applyTheme(color, settings.bgStyle);
  }
  function updateBg(bg: string) {
    setSettings((s) => ({ ...s, bgStyle: bg }));
    applyTheme(settings.accentColor, bg);
  }

  async function save() {
    setSaving(true);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-brand" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="font-display text-2xl text-white mb-6">SETTINGS</h1>

        <div className="space-y-5">
          {/* Accent Color */}
          <section className="bg-surface-1 border border-white/8 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Palette size={16} className="text-brand" />
              <h2 className="text-sm font-semibold text-white">Accent Color</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {ACCENT_COLORS.map((c) => (
                <button key={c.value} onClick={() => updateAccent(c.value)} title={c.name}
                  className="relative w-9 h-9 rounded-full transition-transform hover:scale-110 active:scale-95"
                  style={{ backgroundColor: c.value }}>
                  {settings.accentColor.toLowerCase() === c.value.toLowerCase() && (
                    <Check size={14} className="absolute inset-0 m-auto text-white" strokeWidth={3} />
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-3">Tap a color to preview — save to keep.</p>
          </section>

          {/* Background Style */}
          <section className="bg-surface-1 border border-white/8 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Monitor size={16} className="text-brand" />
              <h2 className="text-sm font-semibold text-white">Background Style</h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {BG_STYLES.map((b) => (
                <button key={b.value} onClick={() => updateBg(b.value)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    settings.bgStyle === b.value
                      ? "border-brand bg-brand/10"
                      : "border-white/8 hover:border-white/20"
                  }`}>
                  <div className="w-8 h-8 rounded-lg border border-white/20 shrink-0" style={{ backgroundColor: b.bg }} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white">{b.name}</p>
                    <p className="text-xs text-gray-600 truncate">{b.desc}</p>
                  </div>
                  {settings.bgStyle === b.value && (
                    <Check size={13} className="ml-auto text-brand shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* Playback */}
          <section className="bg-surface-1 border border-white/8 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Tv size={16} className="text-brand" />
              <h2 className="text-sm font-semibold text-white">Playback</h2>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white">Default Language</p>
                <p className="text-xs text-gray-600">Preferred audio/subtitle track</p>
              </div>
              <div className="flex gap-1.5">
                {["sub","dub"].map((lang) => (
                  <button key={lang}
                    onClick={() => setSettings((s) => ({ ...s, defaultLang: lang }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      settings.defaultLang === lang ? "bg-brand text-white" : "bg-surface-2 text-gray-400 hover:text-white"
                    }`}>
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Save */}
          <button onClick={save} disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-white rounded-xl py-3 text-sm font-semibold transition-all disabled:opacity-60">
            {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : null}
            {saved ? "Saved!" : saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
