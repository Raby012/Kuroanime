// src/components/WatchlistButton.tsx — replace existing WatchlistButton
"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck, Loader2, ChevronDown } from "lucide-react";

const STATUSES = [
  { value: "plan_to_watch", label: "Plan to Watch" },
  { value: "watching",      label: "Watching"      },
  { value: "completed",     label: "Completed"     },
  { value: "on_hold",       label: "On Hold"       },
  { value: "dropped",       label: "Dropped"       },
];

interface Props { anilistId: number; title: string; image?: string; }

export function WatchlistButton({ anilistId, title, image }: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  const [status,   setStatus]   = useState<string | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [open,     setOpen]     = useState(false);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    if (!session) { setLoading(false); return; }
    fetch(`/api/watchlist?id=${anilistId}`).then((r) => r.json()).then((d) => {
      setStatus(d.item?.status ?? null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [session, anilistId]);

  async function setStatusValue(val: string) {
    if (!session) { router.push("/auth/signin"); return; }
    setSaving(true); setOpen(false);
    await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anilistId, title, image, status: val }),
    });
    setStatus(val);
    setSaving(false);
  }

  async function remove() {
    setSaving(true); setOpen(false);
    await fetch("/api/watchlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anilistId }),
    });
    setStatus(null);
    setSaving(false);
  }

  const currentLabel = STATUSES.find((s) => s.value === status)?.label;

  return (
    <div className="relative">
      <div className="flex gap-1">
        <button
          onClick={() => !status ? setStatusValue("plan_to_watch") : setOpen(!open)}
          disabled={loading || saving}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
            status
              ? "bg-brand text-white"
              : "bg-surface-2 border border-white/10 text-gray-300 hover:border-brand/50 hover:text-white"
          }`}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : status ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
          {status ? currentLabel : "Add to List"}
        </button>
        {status && (
          <button onClick={() => setOpen(!open)}
            className="bg-brand text-white px-2 py-2 rounded-xl transition-all hover:bg-brand-dark">
            <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-44 bg-surface-1 border border-white/10 rounded-xl shadow-2xl py-1 z-50">
          {STATUSES.map((s) => (
            <button key={s.value} onClick={() => setStatusValue(s.value)}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                status === s.value ? "text-brand bg-brand/10" : "text-gray-300 hover:text-white hover:bg-white/5"
              }`}>
              {s.label}
            </button>
          ))}
          <div className="h-px bg-white/8 my-1" />
          <button onClick={remove} className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
            Remove from List
          </button>
        </div>
      )}
    </div>
  );
}
