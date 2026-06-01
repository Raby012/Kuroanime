"use client";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Star, ChevronLeft, ChevronRight, Info } from "lucide-react";
import type { AnilistMedia } from "@/lib/anilist";

export function HeroSlider({ items }: { items: AnilistMedia[] }) {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const next = useCallback(() => setCurrent((i) => (i + 1) % items.length), [items.length]);
  const prev = useCallback(() => setCurrent((i) => (i - 1 + items.length) % items.length), [items.length]);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [next, isPaused]);

  const anime = items[current];
  if (!anime) return null;

  const title = anime.title.english || anime.title.romaji;
  const desc = anime.description?.replace(/<[^>]*>/g, "").slice(0, 160).trim() + "...";

  return (
    <section
      className="relative h-[60vh] sm:h-[75vh] min-h-[400px] max-h-[620px] flex items-end pb-10 sm:pb-14 overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background images */}
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
            className="object-cover object-top"
            priority={i === 0}
            sizes="100vw"
            quality={95}
          />
        </div>
      ))}

      {/* Gradients — stronger to prevent blur look */}
      <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/55 to-surface/5" />
      <div className="absolute inset-0 bg-gradient-to-r from-surface/90 via-surface/30 to-transparent" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 w-full">
        <div className="max-w-md sm:max-w-lg">
          {/* Badges */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
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

          {/* Title */}
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white leading-none mb-2 drop-shadow-lg">
            {title.toUpperCase()}
          </h1>

          {/* Meta */}
          <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-400 mb-3 flex-wrap">
            {anime.averageScore && (
              <span className="flex items-center gap-1">
                <Star size={12} className="text-yellow-400 fill-yellow-400" />
                <span className="font-semibold text-white">
                  {(anime.averageScore / 10).toFixed(1)}
                </span>
              </span>
            )}
            {anime.episodes && <span>{anime.episodes} eps</span>}
            {anime.seasonYear && <span>{anime.season} {anime.seasonYear}</span>}
            {anime.duration && <span>{anime.duration}m</span>}
          </div>

          {/* Description — only on larger screens */}
          <p className="text-gray-300 text-xs sm:text-sm leading-relaxed line-clamp-2 mb-4 hidden sm:block">
            {desc}
          </p>

          {/* Genres */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {anime.genres.slice(0, 3).map((g) => (
              <span key={g} className="text-xs bg-white/10 backdrop-blur-sm text-gray-300 px-2.5 py-1 rounded-full border border-white/10">
                {g}
              </span>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href={`/anime/${anime.id}`}
              className="inline-flex items-center gap-2 bg-brand hover:bg-brand-dark text-white font-semibold px-4 sm:px-6 py-2.5 rounded-full transition-all hover:scale-105 shadow-lg shadow-brand/30 text-sm"
            >
              <Play size={15} fill="white" /> Watch Now
            </Link>
            <Link
              href={`/anime/${anime.id}`}
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-medium px-4 sm:px-6 py-2.5 rounded-full transition-all border border-white/20 text-sm"
            >
              <Info size={15} /> Details
            </Link>
          </div>
        </div>
      </div>

      {/* Arrows */}
      <button
        onClick={prev}
        className="absolute left-2 sm:left-5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-black/50 hover:bg-brand rounded-full border border-white/20 text-white transition-all"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        onClick={next}
        className="absolute right-2 sm:right-5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-black/50 hover:bg-brand rounded-full border border-white/20 text-white transition-all"
      >
        <ChevronRight size={18} />
      </button>

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`transition-all rounded-full ${
              i === current ? "w-5 h-1.5 bg-brand" : "w-1.5 h-1.5 bg-white/30 hover:bg-white/60"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
