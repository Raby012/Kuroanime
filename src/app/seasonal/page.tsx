import { getSeasonalAnime } from "@/lib/anilist";
import { AnimeCard } from "@/components/AnimeCard";
import { SeasonSelector } from "@/components/SeasonSelector";
import { Calendar } from "lucide-react";

interface Props {
  searchParams: { season?: string; year?: string };
}

export const metadata = { title: "Seasonal Anime" };

const SEASONS = ["WINTER", "SPRING", "SUMMER", "FALL"] as const;
const SEASON_EMOJI: Record<string, string> = {
  WINTER: "❄️", SPRING: "🌸", SUMMER: "☀️", FALL: "🍂",
};

function getCurrentSeason() {
  const m = new Date().getMonth() + 1;
  if (m <= 3) return "WINTER";
  if (m <= 6) return "SPRING";
  if (m <= 9) return "SUMMER";
  return "FALL";
}

export default async function SeasonalPage({ searchParams }: Props) {
  const now = new Date();
  const season = (searchParams.season?.toUpperCase() || getCurrentSeason()) as typeof SEASONS[number];
  const year = parseInt(searchParams.year || String(now.getFullYear()));

  const anime = await getSeasonalAnime(season, year);

  // Build year options (5 years back, 1 ahead)
  const years = Array.from({ length: 7 }, (_, i) => now.getFullYear() - 5 + i);

  return (
    <div className="max-w-7xl mx-auto px-4 pt-24 pb-16">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 bg-brand/20 rounded-lg flex items-center justify-center">
          <Calendar size={18} className="text-brand" />
        </div>
        <h1 className="font-display text-4xl text-white">SEASONAL</h1>
      </div>
      <p className="text-gray-500 text-sm mb-6">Browse anime by release season</p>

      {/* Season + Year selector */}
      <SeasonSelector
        seasons={SEASONS as unknown as string[]}
        seasonEmoji={SEASON_EMOJI}
        years={years}
        activeSeason={season}
        activeYear={year}
      />

      {/* Current heading */}
      <div className="flex items-center gap-3 my-6">
        <div className="h-px flex-1 bg-white/5" />
        <h2 className="font-display text-xl text-white tracking-wide">
          {SEASON_EMOJI[season]} {season} {year}
        </h2>
        <div className="h-px flex-1 bg-white/5" />
      </div>

      {anime.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="font-display text-2xl mb-2">NO ANIME FOUND</p>
          <p className="text-sm">Try a different season or year</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8">
          {anime.map((a) => (
            <AnimeCard key={a.id} anime={a} size="md" />
          ))}
        </div>
      )}
    </div>
  );
}
