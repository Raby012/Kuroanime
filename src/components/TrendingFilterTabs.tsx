"use client";
import { useRouter } from "next/navigation";

const TABS = [
  { value: "trending", label: "🔥 Trending" },
  { value: "popular", label: "⭐ Most Popular" },
  { value: "top", label: "🏆 Top Rated" },
];

export function TrendingFilterTabs({ active }: { active: string }) {
  const router = useRouter();
  return (
    <div className="flex gap-2 flex-wrap">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => router.push(`/trending?filter=${tab.value}&page=1`)}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
            active === tab.value
              ? "bg-brand text-white shadow-lg shadow-brand/25"
              : "bg-surface-2 text-gray-400 hover:text-white hover:bg-surface-3 border border-white/5"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
