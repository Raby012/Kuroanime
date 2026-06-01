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

  // Extract IMDB ID from external links
  const imdbLink = anime.externalLinks.find(
    (l) => l.site === "IMDb" || l.url.includes("imdb.com")
  );
  const imdbId = imdbLink?.url.match(/tt\d+/)?.[0] || null;

  const isMovie = anime.format === "MOVIE";

  // Correct episode count for ongoing anime
  const totalEpisodes = (() => {
    if (isMovie) return 1;
    if (anime.status === "RELEASING" && anime.nextAiringEpisode?.episode) {
      return anime.nextAiringEpisode.episode - 1;
    }
    return anime.episodes || 12;
  })();

  // Related anime
  const related = anime.relations.edges
    .filter((e) =>
      ["SEQUEL", "PREQUEL", "SIDE_STORY", "ALTERNATIVE"].includes(e.relationType)
    )
    .slice(0, 6);

  // Recommendations
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
            <div className="mt-3 space-y-2">
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

            {/* Stats row */}
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
                    ? `${totalEpisodes} / ${anime.episodes ?? "?"} eps`
                    : `${totalEpisodes} eps`}
                </span>
              )}
              {anime.duration && (
                <span className="flex items-center gap-1.5">
                  <Clock size={15} className="text-brand" /> {anime.duration}m
                </span>
              )}
              {anime.seasonYear && (
                <span className="flex items-center gap-1.5">
                  <Calendar size={15} className="text-brand" /> {anime.season}{" "}
                  {anime.seasonYear}
                </span>
              )}
              {anime.popularity && (
                <span className="flex items-center gap-1.5">
                  <Users size={15} className="text-brand" />{" "}
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
            <div className="flex flex-wrap gap-2 mb-4">
              {anime.genres.map((g) => (
                <span
                  key={g}
                  className="text-xs bg-surface-2 border border-white/10 text-gray-300 px-3 py-1 rounded-full"
                >
                  {g}
                </span>
              ))}
            </div>

            {/* Studios */}
            {anime.studios.nodes.length > 0 && (
              <p className="text-sm text-gray-400 mb-4">
                Studio:{" "}
                <span className="text-brand font-medium">
                  {anime.studios.nodes[0].name}
                </span>
              </p>
            )}

            {/* Description */}
            {anime.description && (
              <p className="text-gray-300 text-sm leading-relaxed line-clamp-3 md:line-clamp-none">
                {anime.description.replace(/<[^>]*>/g, "")}
              </p>
            )}
          </div>
        </div>

        {/* Episodes + Player */}
        <div className="mt-10">
          <EpisodesSection
            animeTitle={title}
            anilistId={anime.id}
            malId={anime.idMal}
            totalEpisodes={totalEpisodes}
            isMovie={isMovie}
            imdbId={imdbId}
            tmdbId={null}
          />

          
        </div>

        {/* Characters */}
        {anime.characters.edges.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-2xl text-white mb-4">CHARACTERS</h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {anime.characters.edges.map(({ node, role }) => (
                <div key={node.id} className="shrink-0 w-24 text-center">
                  <div className="w-24 h-24 rounded-full overflow-hidden mx-auto bg-surface-2">
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
          <section className="mt-12">
            <h2 className="font-display text-2xl text-white mb-4">RELATED</h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {related.map(({ node, relationType }) => (
                <div key={node.id} className="shrink-0">
                  <div className="relative">
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
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recommendations */}
        {recs.length > 0 && (
          <section className="mt-12 mb-8">
            <h2 className="font-display text-2xl text-white mb-4">
              YOU MAY ALSO LIKE
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
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
