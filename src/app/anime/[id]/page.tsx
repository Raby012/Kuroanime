import { notFound } from "next/navigation";
import { getAnimeById, getAnimeEpisodeData } from "@/lib/anilist"; // ✅ Fixed imports
import { EpisodesSection } from "@/components/EpisodesSection";
import { VideoPlayer } from "@/components/VideoPlayer";

interface AnimePageProps {
  params: Promise<{ id: string }>;
}

export default async function AnimePage({ params }: AnimePageProps) {
  const { id } = await params;
  const anilistId = Number(id);
  if (isNaN(anilistId)) return notFound();

  // 1. Fetch official data from AniList using the correct function
  const media = await getAnimeById(anilistId);
  if (!media) return notFound();

  // 2. Calculate True Episode Count using the existing helper
  const { totalEpisodes } = getAnimeEpisodeData(media);

  // 3. Prepare anime info
  const animeInfo = {
    title: media.title?.userPreferred || media.title?.romaji || "Unknown",
    image: media.coverImage?.large || "",
    description: media.description || "",
    isMovie: media.format === "MOVIE",
    imdbId: null, // You'll need to get this from your other API
    malId: media.idMal || null,
    season: media.season || "UNKNOWN",
    seasonYear: media.seasonYear || undefined,
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Your existing Anime Header goes here */}
      <h1 className="text-3xl font-bold mb-4">{animeInfo.title}</h1>
      
      {/* Your Main Player */}
      <div className="mb-8">
        <VideoPlayer
          animeTitle={animeInfo.title}
          anilistId={anilistId}
          episode={1} // Default start episode
          isMovie={animeInfo.isMovie}
          imdbId={animeInfo.imdbId}
          seasonYear={animeInfo.seasonYear} // Pass this for better TMDB lookups
        />
      </div>

      {/* EPISODE SECTION WITH FIXED COUNT */}
      <EpisodesSection
        animeTitle={animeInfo.title}
        anilistId={anilistId}
        totalEpisodes={totalEpisodes} // ✅ Now uses the correctly calculated count
        isMovie={animeInfo.isMovie}
        imdbId={animeInfo.imdbId}
        malId={animeInfo.malId}
      />
    </div>
  );
}
