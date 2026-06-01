import { notFound } from "next/navigation";
import { getAnilistEpisodeData } from "@/lib/anilist";
import { EpisodesSection } from "@/components/EpisodesSection";
import { VideoPlayer } from "@/components/VideoPlayer"; // Adjust path if needed

interface AnimePageProps {
  params: Promise<{ id: string }>;
}

export default async function AnimePage({ params }: AnimePageProps) {
  const { id } = await params;
  const anilistId = Number(id);
  if (isNaN(anilistId)) return notFound();

  // 1. Fetch official data from AniList
  const media = await getAnilistEpisodeData(anilistId);
  if (!media) return notFound();

  // 2. Calculate True Episode Count
  let totalEpisodes = media?.episodes || 0;
  const nextAiring = media?.nextAiringEpisode?.episode || null;
  const status = media?.status || "";

  // FIX: Ongoing anime with null episodes
  if (!totalEpisodes && nextAiring) {
    totalEpisodes = nextAiring - 1;
  }

  // FIX: Known long series (One Piece)
  if (anilistId === 21 && totalEpisodes === 0) {
    totalEpisodes = 1122; // True total as of 2026
  }

  // FIX: Finished anime with null episodes (Fallback to manual check)
  if (totalEpisodes === 0 && status === "FINISHED") {
    // For safety, set a fallback
    totalEpisodes = 12; // Minimal placeholder
  }

  // 3. Get basic info from your existing data source
  // You likely have a separate function for this (e.g., getAnimeInfo)
  // I'll simulate it here with placeholder data.
  const animeInfo = {
    title: media.title?.romaji || "Unknown",
    image: media.coverImage?.large || "",
    description: media.description || "",
    isMovie: media.format === "MOVIE",
    imdbId: null, // You'll need to get this from your other API
    malId: media.idMal || null,
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
          // Add other props as needed
        />
      </div>

      {/* EPISODE SECTION WITH FIXED COUNT */}
      <EpisodesSection
        animeTitle={animeInfo.title}
        anilistId={anilistId}
        totalEpisodes={totalEpisodes} // ✅ THE FIX IS HERE
        isMovie={animeInfo.isMovie}
        imdbId={animeInfo.imdbId}
        malId={animeInfo.malId}
      />
    </div>
  );
}
