"use client";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Star, ChevronLeft, ChevronRight, Info } from "lucide-react";
import type { AnilistMedia } from "@/lib/anilist";

export function HeroSlider({ items }: { items: AnilistMedia[] }) {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const next = useCallback(() => {
    setCurrent((i) => (i + 1) % items.length);
  }, [items.length]);

  const prev = useCallback(() => {
    setCurrent((i) => (i - 1 + items.length) % items.length);
  }, [items.length]);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [next, isPaused]);

  const anime = items[current];
  if (!anime) return null;

  const title = anime.title.english || anime.title.romaji;
  const desc = anime.description
    ?.replace(/<[^>]*>/g, "")
    .slice(0, 180)
    .trim() + "...";

  return (
    <section
      className="relative h-[75vh] sm:h-[85vh] min-h-[480px] max-h-[700px] flex items-end pb-12 sm:pb-16 overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* All background images — fade between them */}
      {items.map((item, i) => (
        <div
          key={item.id}
          className={`absolute inset-0 transition-opacity duration-700 ${
            i === current ? "opacity-100" : "opacity-0"
          }`}
        >
          <Image
            src={item.bannerImage || item.coverImage.extraLarge}
            alt={item.title.english || item.title.romaji}
            fill
            className="object-cover object-center"
            priority={i === 0}
            sizes="100vw"
            quality={90}
          />
        </div>
      ))}

      {/* Gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-surface/95 via-surface/40 to-transparent" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 w-full">
        <div className="max-w-lg xl:max-w-xl">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {anime.trending && (
              <span className="bg-brand text-white text-xs font-bold px-2.5 py-1 rounded-full">
                #{anime.trending} TRENDING
              </span>
            )}
            {anime.format && (
              <span className="bg-surface-2/80 backdrop-blur-sm text-gray-300 text-xs px-2.5 py-1 rounded-full border border-white/10">
                {anime.format}
              </span>
            )}
            {anime.status === "RELEASING" && (
              <span className="bg-green-500/20 text-green-400 text-xs px-2.5 py-1 rounded-full border border-green-500/30">
                AIRING
              </span>
            )}
          </div>

          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white leading-none mb-3 drop-shadow-lg">
            {title.toUpperCase()}
          </h1>

          <div className="flex items-center gap-3 sm:gap-4 text-sm text-gray-400 mb-4 flex-wrap">
            {anime.averageScore && (
              <span className="flex items-center gap-1">
                <Star size={13} className="text-yellow-400 fill-yellow-400" />
                <span className="font-semibold text-white">
                  {(anime.averageScore / 10).toFixed(1)}
                </span>
              </span>
            )}
            {anime.episodes && <span>{anime.episodes} Episodes</span>}
            {anime.seasonYear && (
              <span>{anime.season} {anime.seasonYear}</span>
            )}
            {anime.duration && <span>{anime.duration} min</span>}
          </div>

          <p className="text-gray-300 text-sm leading-relaxed line-clamp-3 mb-5 hidden sm:block">
            {desc}
          </p>

          <div className="flex flex-wrap gap-2 mb-5">
            {anime.genres.slice(0, 4).map((g) => (
              <span
                key={g}
                className="text-xs bg-white/10 backdrop-blur-sm text-gray-300 px-3 py-1 rounded-full border border-white/10"
              >
                {g}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/anime/${anime.id}`}
              className="inline-flex items-center gap-2 bg-brand hover:bg-brand-dark text-white font-semibold px-5 sm:px-6 py-2.5 sm:py-3 rounded-full transition-all hover:scale-105 shadow-lg shadow-brand/30 text-sm sm:text-base"
            >
              <Play size={16} fill="white" /> Watch Now
            </Link>
            <Link
              href={`/anime/${anime.id}`}
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-medium px-5 sm:px-6 py-2.5 sm:py-3 rounded-full transition-all border border-white/20 text-sm sm:text-base"
            >
              <Info size={16} /> Details
            </Link>
          </div>
        </div>
      </div>

      {/* Arrows */}
      <button
        onClick={prev}
        className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center bg-black/40 hover:bg-brand backdrop-blur-sm rounded-full border border-white/20 text-white transition-all hover:scale-110"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        onClick={next}
        className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center bg-black/40 hover:bg-brand backdrop-blur-sm rounded-full border border-white/20 text-white transition-all hover:scale-110"
      >
        <ChevronRight size={20} />
      </button>

      {/* Dots */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`transition-all rounded-full ${
              i === current
                ? "w-6 h-2 bg-brand"
                : "w-2 h-2 bg-white/30 hover:bg-white/60"
            }`}
          />
        ))}
      </div>

      {/* Counter */}
      <div className="absolute top-6 right-6 z-20 text-xs text-white/50 font-medium hidden sm:block">
        {String(current + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
      </div>
    </section>
  );
}
