import { getTopAnime } from "@/lib/anilist";
import Image from "next/image";
import Link from "next/link";
import { Star, Trophy } from "lucide-react";

interface Props {
  searchParams: { page?: string };
}

export const metadata = { title: "Top Anime" };

const MEDAL = ["🥇", "🥈", "🥉"];

export default async function TopPage({ searchParams }: Props) {
  const page = parseInt(searchParams.page || "1");
  const { media, pageInfo } = await getTopAnime(page, 50);
  const offset = (page - 1) * 50;

  return (
    <div className="max-w-5xl mx-auto px-4 pt-24 pb-16">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 bg-brand/20 rounded-lg flex items-center justify-center">
          <Trophy size={18} className="text-brand" />
        </div>
        <h1 className="font-display text-4xl text-white">TOP ANIME</h1>
      </div>
      <p className="text-gray-500 text-sm mb-8">Ranked by AniList community score</p>

      {/* Ranked list */}
      <div className="space-y-2">
        {media.map((anime, i) => {
          const rank = offset + i + 1;
          const title = anime.title.english || anime.title.romaji;
          const score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : "—";

          return (
            <Link
              key={anime.id}
              href={`/anime/${anime.id}`}
              className="group flex items-center gap-4 p-3 rounded-xl hover:bg-surface-2 transition-colors"
            >
              {/* Rank */}
              <div className="w-10 text-center shrink-0">
                {rank <= 3 ? (
                  <span className="text-2xl">{MEDAL[rank - 1]}</span>
                ) : (
                  <span className={`font-display text-2xl ${rank <= 10 ? "text-brand" : "text-gray-600"}`}>
                    {rank}
                  </span>
                )}
              </div>

              {/* Cover */}
              <div className="w-12 h-16 rounded-lg overflow-hidden shrink-0 bg-surface-2">
                <Image
                  src={anime.coverImage.medium}
                  alt={title}
                  width={48}
                  height={64}
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform"
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm leading-snug line-clamp-1 group-hover:text-brand transition-colors">
                  {title}
                </p>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {anime.format && (
                    <span className="text-xs text-gray-500">{anime.format}</span>
                  )}
                  {anime.episodes && (
                    <span className="text-xs text-gray-500">{anime.episodes} eps</span>
                  )}
                  {anime.seasonYear && (
                    <span className="text-xs text-gray-500">{anime.season} {anime.seasonYear}</span>
                  )}
                  <div className="flex gap-1 flex-wrap">
                    {anime.genres.slice(0, 3).map((g) => (
                      <span key={g} className="text-xs bg-surface-2 text-gray-500 px-1.5 py-0.5 rounded">
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Score */}
              <div className="shrink-0 flex flex-col items-end gap-1">
                <div className="flex items-center gap-1">
                  <Star size={13} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-white font-bold text-sm">{score}</span>
                </div>
                {anime.popularity && (
                  <span className="text-xs text-gray-600">
                    {(anime.popularity / 1000).toFixed(0)}K users
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Pagination */}
      <div className="flex justify-center gap-2 mt-10">
        {page > 1 && (
          <a href={`/top?page=${page - 1}`}
            className="px-5 py-2 rounded-full bg-surface-2 text-gray-300 hover:text-white text-sm transition-colors">
            ← Previous
          </a>
        )}
        <span className="px-5 py-2 rounded-full bg-brand text-white text-sm font-medium">
          #{offset + 1}–{offset + media.length}
        </span>
        {pageInfo.hasNextPage && (
          <a href={`/top?page=${page + 1}`}
            className="px-5 py-2 rounded-full bg-surface-2 text-gray-300 hover:text-white text-sm transition-colors">
            Next →
          </a>
        )}
      </div>
    </div>
  );
}
