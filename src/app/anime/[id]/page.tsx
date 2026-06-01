import Image from "next/image";
import { notFound } from "next/navigation";
import { getAnimeById } from "@/lib/anilist";
import { AnimeCard } from "@/components/AnimeCard";
import { EpisodesSection } from "@/components/EpisodesSection";
import { WatchlistButton } from "@/components/WatchlistButton";
import { Star, Clock, Tv, Calendar, Users } from "lucide-react";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const anime = await getAnimeById(parseInt(params.id)).catch(() => null);
  if (!anime) return { title: "Not Found" };
  return {
    title: anime.title.english || anime.title.romaji,
    description: anime.description?.replace(/<[^>]*>/g, "").slice(0, 160),
  };
}

export default async function AnimePage({ params }: { params: { id: string } }) {
  const id = parseInt(params.id);
  if (isNaN(id)) notFound();

  const anime = await getAnimeById(id).catch(() => null);
  if (!anime) notFound();

  const title = anime.title.english || anime.title.romaji;

  const imdbLink = anime.externalLinks?.find(
    (l) => l.site === "IMDb" || l.url?.includes("imdb.com")
  );
  const imdbId = imdbLink?.url?.match(/tt\d+/)?.[0] || null;

  const isMovie = anime.format === "MOVIE";

  // Fix: use nextAiringEpisode for ongoing anime like One Piece
  const totalEpisodes =
    anime.episodes ||
    (anime.nextAiringEpisode?.episode
      ? anime.nextAiringEpisode.episode - 1
      : 0) ||
    (isMovie ? 1 : 12);

  const related = anime.relations?.edges
    ?.filter((e) =>
      ["SEQUEL", "PREQUEL", "SIDE_STORY", "ALTERNATIVE"].includes(
        e.relationType
      )
    )
    .slice(0, 6) || [];

  const recs = (anime.recommendations?.nodes || [])
    .filter((n) => n.mediaRecommendation)
    .slice(0, 10);

  return (
    <div className="min-h-screen">
      {/* Banner */}
      <div className="relative h-72 md:h-96 overflow-hidden">
        {anime.bannerImage ? (
          <Image
            src={anime.bannerImage}
            alt={title}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <Image
            src={anime.coverImage.extraLarge}
            alt={title}
            fill
            className="object-cover blur-sm scale-110"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 -mt-40 relative z-10">
        <div className="flex gap-6 flex-col md:flex-row">
          {/* Poster */}
          <div className="shrink-0">
            <div className="w-40 md:w-52 rounded-xl overflow-hidden shadow-2xl border border-white/10">
              <Image
                src={anime.coverImage.extraLarge}
                alt={title}
                width={208}
                height={296}
                className="w-full"
              />
            </div>
            <div className="mt-3">
              <WatchlistButton
                anilistId={anime.id}
                title={title}
                image={anime.coverImage.large}
              />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 pt-4 md:pt-20">
            {anime.title.native && (
              <p className="text-gray-500 text-sm mb-1">{anime.title.native}</p>
            )}
            <h1 className="font-display text-3xl md:text-5xl text-white leading-none mb-4">
              {title.toUpperCase()}
            </h1>

            {/* Stats */}
            <div className="flex flex-wrap items-center gap-4 mb-4 text-sm text-gray-400">
              {anime.averageScore && (
                <span className="flex items-center gap-1.5 text-yellow-400">
                  <Star size={15} fill="currentColor" />
                  <span className="font-semibold">
                    {(anime.averageScore / 10).toFixed(1)}
                  </span>
                </span>
              )}
              {totalEpisodes > 0 && (
                <span className="flex items-center gap-1.5">
                  <Tv size={15} className="text-brand" />
                  {anime.status === "RELEASING"
                    ? `${totalEpisodes}+ eps`
                    : `${totalEpisodes} eps`}
                </span>
              )}
              {anime.duration && (
                <span className="flex items-center gap-1.5">
                  <Clock size={15} className="text-brand" /> {anime.duration}m
