import Link from "next/link";
import Image from "next/image";
import {
  getTrending,
  getPopular,
  getSeasonalAnime,
  getAiringSchedule,
  type AnilistMedia,
  type AiringSchedule,
} from "@/lib/anilist";
import { AnimeCard } from "@/components/AnimeCard";
import { HeroSlider } from "@/components/HeroSlider";
import { TrendingUp, Calendar, Flame, Clock, Tv } from "lucide-react";

export const revalidate = 900;

export default async function HomePage() {
  const [trending, popular, seasonal, schedule] = await Promise.all([
    getTrending(1, 20),
    getPopular(1, 20),
    getSeasonalAnime(),
    getAiringSchedule(),
  ]);

  const now = Math.floor(Date.now() / 1000);
  const latestEpisodes = schedule
    .filter((s) => s.airingAt <= now)
    .sort((a, b) => b.airingAt - a.airingAt)
    .slice(0, 20);

  const heroAnime = trending.slice(0, 5);

  return (
    <div className="pb-16">
      {heroAnime.length > 0 && <HeroSlider items={heroAnime} />}

      {latestEpisodes.length > 0 && (
        <LatestEpisodesSection episodes={latestEpisodes} />
      )}

      <Section
        title="Trending Now"
        icon={<Flame size={20} className="text-brand" />}
        items={trending}
        href="/trending"
      />
      <Section
        title="This Season"
        icon={<Calendar size={20} className="text-brand" />}
        items={seasonal}
        href="/seasonal"
      />
      <Section
        title="All Time Popular"
        icon={<TrendingUp size={20} className="text-brand" />}
        items={popular}
        href="/top"
      />
    </div>
  );
}

function LatestEpisodesSection({ episodes }: { episodes: AiringSchedule[] }) {
  return (
    <section className="max-w-7xl mx-auto px-4 mt-10">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Clock size={20} className="text-brand" />
          <h2 className="font-display text-xl sm:text-2xl text-white tracking-wide">
            LATEST EPISODES
          </h2>
        </div>
        <Link
          href="/schedule"
          className="text-xs text-brand hover:text-brand-light transition-colors font-medium"
        >
          View Schedule →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {episodes.map((ep) => (
          <LatestEpisodeCard key={`${ep.media.id}-${ep.episode}`} ep={ep} />
        ))}
      </div>
    </section>
  );
}

function LatestEpisodeCard({ ep }: { ep: AiringSchedule }) {
  const title = ep.media.title.english || ep.media.title.romaji;
  const airedAgo = Math.floor((Date.now() / 1000 - ep.airingAt) / 3600);
  const timeLabel =
    airedAgo < 1
      ? "Just aired"
      : airedAgo < 24
      ? `${airedAgo}h ago`
      : `${Math.floor(airedAgo / 24)}d ago`;

  return (
    <Link
      href={`/anime/${ep.media.id}`}
      className="flex items-center gap-3 bg-surface-1 hover:bg-surface-2 border border-white/5 hover:border-brand/30 rounded-xl p-3 transition-all group"
    >
      <div className="relative w-16 h-20 shrink-0 rounded-lg overflow-hidden bg-surface-2">
        <Image
          src={ep.media.coverImage.medium}
          alt={title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="64px"
        />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-white line-clamp-2 leading-snug mb-1">
          {title}
        </h3>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Tv size={11} className="text-brand shrink-0" />
          <span>Episode {ep.episode}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600 mt-0.5">
          <Clock size={11} className="shrink-0" />
          <span>{timeLabel}</span>
        </div>
      </div>
    </Link>
  );
}

function Section({
  title,
  icon,
  items,
  href,
}: {
  title: string;
  icon: React.ReactNode;
  items: AnilistMedia[];
  href?: string;
}) {
  return (
    <section className="max-w-7xl mx-auto px-4 mt-10 sm:mt-12">
      <div className="flex items-center justify-between mb-4 sm:mb-5">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="font-display text-xl sm:text-2xl text-white tracking-wide">
            {title.toUpperCase()}
          </h2>
        </div>
        {href && (
          <Link
            href={href}
            className="text-xs text-brand hover:text-brand-light transition-colors font-medium shrink-0"
          >
            See All →
          </Link>
        )}
      </div>
      <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
        {items.map((anime) => (
          <div key={anime.id} className="shrink-0">
            <AnimeCard anime={anime} size="md" />
          </div>
        ))}
      </div>
    </section>
  );
}
