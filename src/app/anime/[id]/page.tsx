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

  // ── Smart episode count ──────────────────────────────────────────────
  const totalEpisodes = (() => {
    if (isMovie) return 1;

    // Actively airing with known schedule → use nextAiringEpisode - 1
    if (anime.status === "RELEASING" && anime.nextAiringEpisode?.episode) {
      return Math.max(1, anime.nextAiringEpisode.episode - 1);
    }

    // Releasing but no airing schedule on AniList
    if (anime.status === "RELEASING" && !anime.nextAiringEpisode) {
      // Check if the show has actually started airing
      const hasStarted =
        anime.startDate?.year &&
        new Date(
          `${anime.startDate.year}-${String(anime.startDate.month ?? 1).padStart(2, "0")}-${String(anime.startDate.day ?? 1).padStart(2, "0")}`
        ) <= new Date();

      if (!hasStarted) return 0; // Not started yet, show no episodes
      // Started but no schedule — use AniList episode count as best guess
      return anime.episodes || 1;
    }

    // Finished / not yet released
    return anime.episodes || 0;
  })();

  const related = (anime.relations?.edges || [])
    .filter((e) =>
      ["SEQUEL", "PREQUEL", "SIDE_STORY", "ALTERNATIVE"].includes(e.relationType)
    )
    .slice(0, 6);

  const recs = (anime.recommendations?.nodes || [])
    .filter((n) => n.mediaRecommendation)
    .slice(0, 10);

  return (
    <div className="min-h-screen">
      {/* Banner */}
      <div className="relative h-56 sm:h-72 md:h-96 overflow-hidden">
        {anime.bannerImage ? (
          <Image
            src={anime.bannerImage}
            alt={title}
            fill
            className="object-cover object-top"
            priority
            sizes="100vw"
            quality={95}
          />
        ) : (
          <Image
            src={anime.coverImage.extraLarge}
            alt={title}
            fill
            className="object-cover object-top"
            priority
            sizes="100vw"
            quality={95}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 -mt-32 sm:-mt-40 relative z-10">
        <div className="flex gap-4 sm:gap-6 flex-col sm:flex-row">
          {/* Poster */}
          <div className="shrink-0">
            <div className="w-32 sm:w-40 md:w-52 rounded-xl overflow-hidden shadow-2xl border border-white/10">
              <Image
                src={anime.coverImage.extraLarge}
                alt={title}
                width={208}
                height={296}
                className="w-full"
                quality={95}
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
          <div className="flex-1 min-w-0 pt-2 sm:pt-4 md:pt-20">
            {anime.title.native && (
              <p className="text-gray-500 text-xs sm:text-sm mb-1">
                {anime.title.native}
              </p>
            )}
            <h1 className="font-display text-2xl sm:text-3xl md:text-5xl text-white leading-none mb-3">
              {title.toUpperCase()}
            </h1>

            {/* Stats */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-3 text-xs sm:text-sm text-gray-400">
              {anime.averageScore && (
                <span className="flex items-center gap-1 text-yellow-400">
                  <Star size={13} fill="currentColor" />
                  <span className="font-semibold">
                    {(anime.averageScore / 10).toFixed(1)}
                  </span>
                </span>
              )}
              {totalEpisodes > 0 && (
                <span className="flex items-center gap-1">
                  <Tv size={13} className="text-brand" />
                  {anime.status === "RELEASING"
                    ? `${totalEpisodes} / ${anime.episodes ?? "?"} eps`
                    : `${totalEpisodes} eps`}
                </span>
              )}
              {anime.duration && (
                <span className="flex items-center gap-1">
                  <Clock size={13} className="text-brand" /> {anime.duration}m
                </span>
              )}
              {anime.seasonYear && (
                <span className="flex items-center gap-1">
                  <Calendar size={13} className="text-brand" /> {anime.season}{" "}
                  {anime.seasonYear}
                </span>
              )}
              {anime.popularity && (
                <span className="flex items-center gap-1">
                  <Users size={13} className="text-brand" />{" "}
                  {anime.popularity.toLocaleString()}
                </span>
              )}
              {anime.status && (
                <span
                  className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    anime.status === "RELEASING"
                      ? "bg-green-900/50 text-green-400"
                      : anime.status === "FINISHED"
                      ? "bg-surface-2 text-gray-400"
                      : "bg-yellow-900/50 text-yellow-400"
                  }`}
                >
                  {anime.status}
                </span>
              )}
            </div>

            {/* Genres */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3">
              {anime.genres.map((g) => (
                <span
                  key={g}
                  className="text-xs bg-surface-2 border border-white/10 text-gray-300 px-2.5 py-1 rounded-full"
                >
                  {g}
                </span>
              ))}
            </div>

            {/* Studio */}
            {anime.studios?.nodes?.length > 0 && (
              <p className="text-xs sm:text-sm text-gray-400 mb-3">
                Studio:{" "}
                <span className="text-brand font-medium">
                  {anime.studios.nodes[0].name}
                </span>
              </p>
            )}

            {/* Description */}
            {anime.description && (
              <p className="text-gray-300 text-xs sm:text-sm leading-relaxed line-clamp-4 md:line-clamp-none">
                {anime.description.replace(/<[^>]*>/g, "")}
              </p>
            )}
          </div>
        </div>

        {/* Episodes + Player */}
        {totalEpisodes > 0 ? (
          <div className="mt-8 sm:mt-10">
            <EpisodesSection
              malId={anime.idMal} 
              animeTitle={title}
              anilistId={anime.id}
              totalEpisodes={totalEpisodes}
              isMovie={isMovie}
              imdbId={imdbId}
              seasonYear={anime.seasonYear}
            />
          </div>
        ) : anime.status === "NOT_YET_RELEASED" ? (
          <div className="mt-8 sm:mt-10 bg-surface-1 rounded-xl p-6 text-center border border-white/5">
            <p className="text-gray-400 text-sm">
              This anime hasn't started airing yet.
            </p>
            {anime.startDate?.year && (
              <p className="text-brand text-sm font-medium mt-1">
                Expected: {anime.startDate.month}/{anime.startDate.year}
              </p>
            )}
          </div>
        ) : null}

        {/* Characters */}
        {anime.characters?.edges?.length > 0 && (
          <section className="mt-10 sm:mt-12">
            <h2 className="font-display text-xl sm:text-2xl text-white mb-4">
              CHARACTERS
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {anime.characters.edges.map(({ node, role }) => (
                <div key={node.id} className="shrink-0 w-20 sm:w-24 text-center">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden mx-auto bg-surface-2">
                    <Image
                      src={node.image.medium}
                      alt={node.name.full}
                      width={96}
                      height={96}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <p className="text-xs text-white mt-1.5 leading-snug">
                    {node.name.full}
                  </p>
                  <p className="text-xs text-gray-500">{role}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-10 sm:mt-12">
            <h2 className="font-display text-xl sm:text-2xl text-white mb-4">
              RELATED
            </h2>
            <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {related.map(({ node, relationType }) => (
                <div key={node.id} className="shrink-0 relative">
                  <AnimeCard
                    anime={{
                      id: node.id,
                      title: node.title,
                      coverImage: {
                        large: node.coverImage.large,
                        extraLarge: node.coverImage.large,
                        medium: node.coverImage.large,
                        color: null,
                      },
                      format: node.format,
                    } as any}
                    size="sm"
                  />
                  <span className="absolute top-0 left-0 right-0 text-center text-xs bg-surface-2/80 text-brand py-0.5 rounded-t-xl">
                    {relationType.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recommendations */}
        {recs.length > 0 && (
          <section className="mt-10 sm:mt-12 mb-8">
            <h2 className="font-display text-xl sm:text-2xl text-white mb-4">
              YOU MAY ALSO LIKE
            </h2>
            <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {recs.map(({ mediaRecommendation: rec }) =>
                rec ? (
                  <div key={rec.id} className="shrink-0">
                    <AnimeCard
                      anime={{
                        id: rec.id,
                        title: rec.title,
                        coverImage: {
                          large: rec.coverImage.large,
                          extraLarge: rec.coverImage.large,
                          medium: rec.coverImage.large,
                          color: null,
                        },
                        format: rec.format,
                      } as any}
                      size="sm"
                    />
                  </div>
                ) : null
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
