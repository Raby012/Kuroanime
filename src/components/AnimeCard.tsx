import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import type { AnilistMedia } from "@/lib/anilist";

interface AnimeCardProps {
  anime: AnilistMedia;
  size?: "sm" | "md" | "lg";
}

export function AnimeCard({ anime, size = "md" }: AnimeCardProps) {
  const title = anime.title.english || anime.title.romaji;
  const score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : null;

  const widths = { sm: "w-36", md: "w-44", lg: "w-52" };
  const heights = { sm: "h-52", md: "h-64", lg: "h-72" };

  return (
    <Link href={`/anime/${anime.id}`} className={`anime-card group block ${widths[size]}`}>
      <div className={`relative ${heights[size]} rounded-xl overflow-hidden bg-surface-2`}>
        <Image
          src={anime.coverImage.large}
          alt={title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 768px) 144px, 208px"
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Score badge */}
        {score && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded-md px-1.5 py-0.5">
            <Star size={10} className="text-yellow-400 fill-yellow-400" />
            <span className="text-xs font-semibold text-white">{score}</span>
          </div>
        )}

        {/* Format badge */}
        {anime.format && (
          <div className="absolute top-2 left-2 bg-brand/90 rounded-md px-1.5 py-0.5">
            <span className="text-xs font-bold text-white">{anime.format}</span>
          </div>
        )}

        {/* Episodes */}
        {anime.episodes && (
          <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-xs text-gray-300">{anime.episodes} eps</span>
          </div>
        )}
      </div>

      <div className="mt-2 px-0.5">
        <h3 className="text-sm font-medium text-white line-clamp-2 leading-snug">{title}</h3>
        {anime.seasonYear && (
          <p className="text-xs text-gray-500 mt-0.5">{anime.season} {anime.seasonYear}</p>
        )}
      </div>
    </Link>
  );
}
