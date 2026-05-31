import { getTrending, getPopular, getTopAnime } from "@/lib/anilist";
import { AnimeCard } from "@/components/AnimeCard";
import { TrendingFilterTabs } from "@/components/TrendingFilterTabs";
import { Flame } from "lucide-react";

interface Props {
  searchParams: { filter?: string; page?: string };
}

export const metadata = { title: "Trending" };

export default async function TrendingPage({ searchParams }: Props) {
  const filter = searchParams.filter || "trending";
  const page = parseInt(searchParams.page || "1");

  let result;
  let label = "";

  if (filter === "popular") {
    result = await getPopular(page, 48);
    label = "Most Popular";
  } else if (filter === "top") {
    const data = await getTopAnime(page, 48);
    result = data.media;
    label = "Top Rated";
  } else {
    result = await getTrending(page, 48);
    label = "Trending Now";
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pt-24 pb-16">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 bg-brand/20 rounded-lg flex items-center justify-center">
          <Flame size={18} className="text-brand" />
        </div>
        <h1 className="font-display text-4xl text-white">TRENDING</h1>
      </div>
      <p className="text-gray-500 text-sm mb-6">What the world is watching right now</p>

      {/* Filter tabs */}
      <TrendingFilterTabs active={filter} />

      {/* Divider */}
      <div className="flex items-center gap-3 my-6">
        <div className="h-px flex-1 bg-white/5" />
        <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</span>
        <div className="h-px flex-1 bg-white/5" />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8">
        {result.map((anime, i) => (
          <div key={anime.id} className="relative">
            {filter === "top" && (
              <span className={`absolute -top-2 -left-1 z-10 font-display text-3xl leading-none ${
                i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-amber-600" : "text-gray-600"
              }`}>
                #{i + 1 + (page - 1) * 48}
              </span>
            )}
            <AnimeCard anime={anime} size="md" />
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex justify-center gap-2 mt-10">
        {page > 1 && (
          <a
            href={`/trending?filter=${filter}&page=${page - 1}`}
            className="px-5 py-2 rounded-full bg-surface-2 text-gray-300 hover:text-white text-sm transition-colors"
          >
            ← Previous
          </a>
        )}
        <span className="px-5 py-2 rounded-full bg-brand text-white text-sm font-medium">
          Page {page}
        </span>
        <a
          href={`/trending?filter=${filter}&page=${page + 1}`}
          className="px-5 py-2 rounded-full bg-surface-2 text-gray-300 hover:text-white text-sm transition-colors"
        >
          Next →
        </a>
      </div>
    </div>
  );
}
