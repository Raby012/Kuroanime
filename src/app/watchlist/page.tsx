// src/app/watchlist/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Loader2, Trash2, BookOpen } from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  watching:       { label: "Watching",       color: "text-green-400  bg-green-900/30" },
  completed:      { label: "Completed",      color: "text-blue-400   bg-blue-900/30"  },
  plan_to_watch:  { label: "Plan to Watch",  color: "text-gray-400   bg-white/5"      },
  dropped:        { label: "Dropped",        color: "text-red-400    bg-red-900/30"   },
  on_hold:        { label: "On Hold",        color: "text-yellow-400 bg-yellow-900/30"},
};

interface Item { id: string; anilistId: number; title: string; image?: string; status: string; progress: number; }

export default function WatchlistPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items,   setItems]   = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState("all");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetch("/api/watchlist").then((r) => r.json()).then((d) => {
        setItems(d.items ?? []);
        setLoading(false);
      });
    }
  }, [session]);

  async function remove(anilistId: number) {
    setItems((p) => p.filter((i) => i.anilistId !== anilistId));
    await fetch("/api/watchlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anilistId }),
    });
  }

  async function updateStatus(anilistId: number, newStatus: string) {
    setItems((p) => p.map((i) => i.anilistId === anilistId ? { ...i, status: newStatus } : i));
    await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anilistId, status: newStatus }),
    });
  }

  const filtered = filter === "all" ? items : items.filter((i) => i.status === filter);

  if (loading) return <div className="min-h-screen bg-surface flex items-center justify-center"><Loader2 className="animate-spin text-brand" size={32} /></div>;

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-2xl text-white">MY LIST</h1>
          <span className="text-sm text-gray-500">{items.length} anime</span>
        </div>

        {/* Status filter */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 mb-6">
          {[
            { key: "all",          label: "All"           },
            { key: "watching",     label: "Watching"      },
            { key: "plan_to_watch",label: "Plan to Watch" },
            { key: "completed",    label: "Completed"     },
            { key: "on_hold",      label: "On Hold"       },
            { key: "dropped",      label: "Dropped"       },
          ].map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all ${
                filter === f.key ? "bg-brand text-white" : "bg-surface-1 text-gray-400 hover:text-white border border-white/8"
              }`}>
              {f.label}
              {f.key !== "all" && (
                <span className="ml-1.5 text-xs opacity-60">
                  {items.filter((i) => i.status === f.key).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen size={40} className="mx-auto text-gray-700 mb-4" />
            <p className="text-gray-500">No anime here yet</p>
            <Link href="/browse" className="inline-block mt-3 text-sm text-brand hover:text-brand-light transition-colors">Browse anime →</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((item) => (
              <div key={item.id} className="flex items-center gap-3 bg-surface-1 border border-white/8 rounded-xl p-3 hover:border-white/15 transition-colors group">
                <Link href={`/anime/${item.anilistId}`} className="shrink-0">
                  <div className="w-12 h-16 rounded-lg overflow-hidden bg-surface-2">
                    {item.image && <Image src={item.image} alt={item.title} width={48} height={64} className="object-cover w-full h-full" />}
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/anime/${item.anilistId}`} className="text-sm font-medium text-white hover:text-brand transition-colors line-clamp-1">{item.title}</Link>
                  <p className="text-xs text-gray-600 mt-0.5">Ep {item.progress} watched</p>
                </div>
                <div className="shrink-0">
                  <select
                    value={item.status}
                    onChange={(e) => updateStatus(item.anilistId, e.target.value)}
                    className="bg-surface-2 border border-white/8 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-brand transition-colors cursor-pointer"
                  >
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <button onClick={() => remove(item.anilistId)}
                  className="shrink-0 text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
