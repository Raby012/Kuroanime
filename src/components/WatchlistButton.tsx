"use client";
import { useState, useEffect } from "react";
import { BookMarked, Plus, Check, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";

type WatchStatus = "PLANNING" | "WATCHING" | "COMPLETED" | "DROPPED";

const STATUS_OPTIONS: { value: WatchStatus; label: string }[] = [
  { value: "WATCHING", label: "Watching" },
  { value: "COMPLETED", label: "Completed" },
  { value: "PLANNING", label: "Plan to Watch" },
  { value: "DROPPED", label: "Dropped" },
];

interface WatchlistButtonProps {
  anilistId: number;
  title: string;
  image: string;
}

export function WatchlistButton({ anilistId, title, image }: WatchlistButtonProps) {
  const { data: session } = useSession();
  const [status, setStatus] = useState<WatchStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!session) return;
    fetch("/api/watchlist")
      .then((r) => r.json())
      .then((list) => {
        const item = list.find((i: { anilistId: number; status: string }) => i.anilistId === anilistId);
        if (item) setStatus(item.status);
      })
      .catch(() => {});
  }, [session, anilistId]);

  async function handleSelect(newStatus: WatchStatus) {
    if (!session) { toast.error("Sign in to track anime"); return; }
    setLoading(true);
    try {
      await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anilistId, title, image, status: newStatus }),
      });
      setStatus(newStatus);
      toast.success(`Added to ${newStatus.toLowerCase().replace("_", " ")}`);
    } catch {
      toast.error("Failed to update watchlist");
    }
    setLoading(false);
    setOpen(false);
  }

  async function handleRemove() {
    setLoading(true);
    try {
      await fetch(`/api/watchlist?anilistId=${anilistId}`, { method: "DELETE" });
      setStatus(null);
      toast.success("Removed from watchlist");
    } catch {
      toast.error("Failed to remove");
    }
    setLoading(false);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
          status
            ? "bg-surface-2 border border-brand/50 text-brand hover:bg-surface-3"
            : "bg-surface-2 border border-white/10 text-gray-300 hover:border-brand/30 hover:text-white"
        }`}
        disabled={loading}
      >
        {loading ? (
          <Loader2 size={15} className="animate-spin" />
        ) : status ? (
          <Check size={15} />
        ) : (
          <Plus size={15} />
        )}
        {status
          ? STATUS_OPTIONS.find((o) => o.value === status)?.label || "In List"
          : "Add to List"}
        <BookMarked size={14} className="ml-auto opacity-60" />
      </button>

      {open && (
        <div className="absolute top-12 left-0 right-0 glass rounded-xl overflow-hidden z-20 shadow-xl">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-surface-2 flex items-center justify-between ${
                status === opt.value ? "text-brand" : "text-gray-300"
              }`}
            >
              {opt.label}
              {status === opt.value && <Check size={14} />}
            </button>
          ))}
          {status && (
            <button
              onClick={handleRemove}
              className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-surface-2 border-t border-white/10 transition-colors"
            >
              Remove from list
            </button>
          )}
        </div>
      )}
    </div>
  );
}
