import Link from "next/link";
import Image from "next/image";
import { Star, Play } from "lucide-react";
import type { AnilistMedia } from "@/lib/anilist";

interface AnimeCardProps {
  anime: AnilistMedia;
  size?: "sm" | "md" | "lg";
}

export function AnimeCard({ anime, size = "md" }: AnimeCardProps) {
  const title = anime.title.english || anime.title.romaji;
  const score = anime.averageScore
    ? (anime.averageScore / 10).toFixed(1)
    : null;

  const imgSrc =
    anime.coverImage.extraLarge ||
    anime.coverImage.large ||
    anime.coverImage.medium;

  const widths = {
    sm: "w-32 sm:w-36",
    md: "w-36 sm:w-44",
    lg: "w-44 sm:w-52",
  };
  const heights = {
    sm: "h-44 sm:h-52",
    md: "h-52 sm:h-64",
    lg: "h-60 sm:h-72",
  };
  const imgSizes = {
    sm: "(max-width: 640px) 128px, 144px",
    md: "(max-width: 640px) 144px, 176px",
    lg: "(max-width: 640px) 176px, 208px",
  };

  return (
    <Link href={`/anime/${anime.id}`} className={`anime-card group block ${widths[size]}`}>
      <div className={`relative ${heights[size]} rounded-xl overflow-hidden bg-surface-2`}>
        <Image
          src={imgSrc}
          alt={title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          sizes={imgSizes[size]}
          quality={90}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2">
          <div className="flex items-center justify-center mb-2">
            <div className="w-10 h-10 bg-brand/90 rounded-full flex items-center justify-center shadow-lg">
              <Play size={16} fill="white" className="text-white ml-0.5" />
            </div>
          </div>
        </div>

        {score && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/75 backdrop-blur-sm rounded-md px-1.5 py-0.5">
            <Star size={9} className="text-yellow-400 fill-yellow-400" />
            <span className="text-xs font-semibold text-white">{score}</span>
          </div>
        )}

        {anime.format && (
          <div className="absolute top-2 left-2 bg-brand/90 backdrop-blur-sm rounded-md px-1.5 py-0.5">
            <span className="text-xs font-bold text-white">{anime.format}</span>
          </div>
        )}

        {anime.status === "RELEASING" && (
          <div className="absolute bottom-2 right-2 w-2 h-2 bg-green-400 rounded-full ring-2 ring-green-400/30 animate-pulse" />
        )}
      </div>

      <div className="mt-2 px-0.5">
        <h3 className="text-xs sm:text-sm font-medium text-white line-clamp-2 leading-snug">
          {title}
        </h3>
        {anime.seasonYear && (
          <p className="text-xs text-gray-500 mt-0.5">
            {anime.season} {anime.seasonYear}
          </p>
        )}
      </div>
    </Link>
  );
}
