import Image from "next/image";
import Link from "next/link";
import { getTrending, getPopular, getSeasonalAnime, type AnilistMedia } from "@/lib/anilist";
import { AnimeCard } from "@/components/AnimeCard";
import { Play, Star, TrendingUp, Calendar, Flame } from "lucide-react";

export default async function HomePage() {
  const [trending, popular, seasonal] = await Promise.all([
    getTrending(1, 20),
    getPopular(1, 20),
    getSeasonalAnime(),
  ]);

  const hero = trending[0];

  return (
    <div className="pb-16">
      {/* Hero */}
      {hero && <HeroSection anime={hero} />}

      {/* Trending */}
      <Section title="Trending Now" icon={<Flame size={20} className="text-brand" />} items={trending} />

      {/* Seasonal */}
      <Section title="This Season" icon={<Calendar size={20} className="text-brand" />} items={seasonal} />

      {/* Popular */}
      <Section title="All Time Popular" icon={<TrendingUp size={20} className="text-brand" />} items={popular} />
    </div>
  );
}

function HeroSection({ anime }: { anime: AnilistMedia }) {
  const title = anime.title.english || anime.title.romaji;
  const desc = anime.description?.replace(/<[^>]*>/g, "").slice(0, 200) + "...";

  return (
    <section className="relative h-[85vh] min-h-[500px] flex items-end pb-16 overflow-hidden">
      {/* Background */}
      {anime.bannerImage && (
        <>
          <Image
            src={anime.bannerImage}
            alt={title}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-surface/90 via-transparent to-transparent" />
        </>
      )}

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 w-full">
        <div className="max-w-xl">
          {/* Badges */}
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-brand/90 text-white text-xs font-bold px-2 py-0.5 rounded">
              #{anime.trending} TRENDING
            </span>
            {anime.format && (
              <span className="bg-surface-2/80 text-gray-300 text-xs px-2 py-0.5 rounded">
                {anime.format}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="font-display text-5xl md:text-7xl text-white leading-none mb-3">
            {title.toUpperCase()}
          </h1>

          {/* Meta */}
          <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
            {anime.averageScore && (
              <span className="flex items-center gap-1">
                <Star size={14} className="text-yellow-400 fill-yellow-400" />
                {(anime.averageScore / 10).toFixed(1)}
              </span>
            )}
            {anime.episodes && <span>{anime.episodes} Episodes</span>}
            {anime.seasonYear && <span>{anime.season} {anime.seasonYear}</span>}
          </div>

          {/* Description */}
          <p className="text-gray-300 text-sm leading-relaxed line-clamp-3 mb-6">{desc}</p>

          {/* Genres */}
          <div className="flex flex-wrap gap-2 mb-6">
            {anime.genres.slice(0, 4).map((g) => (
              <span key={g} className="text-xs bg-surface-2/80 text-gray-300 px-3 py-1 rounded-full">
                {g}
              </span>
            ))}
          </div>

          {/* CTA */}
          <Link
            href={`/anime/${anime.id}`}
            className="inline-flex items-center gap-2 bg-brand hover:bg-brand-dark text-white font-semibold px-6 py-3 rounded-full transition-colors"
          >
            <Play size={18} fill="white" /> Watch Now
          </Link>
        </div>
      </div>
    </section>
  );
}

function Section({ title, icon, items }: { title: string; icon: React.ReactNode; items: AnilistMedia[] }) {
  return (
    <section className="max-w-7xl mx-auto px-4 mt-12">
      <div className="flex items-center gap-2 mb-5">
        {icon}
        <h2 className="font-display text-2xl text-white tracking-wide">{title.toUpperCase()}</h2>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {items.map((anime) => (
          <div key={anime.id} className="shrink-0">
            <AnimeCard anime={anime} size="md" />
          </div>
        ))}
      </div>
    </section>
  );
}
