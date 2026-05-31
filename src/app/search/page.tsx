import { searchAnime } from "@/lib/anilist";
import { AnimeCard } from "@/components/AnimeCard";
import { Search } from "lucide-react";

interface Props {
  searchParams: { q?: string; page?: string };
}

export default async function SearchPage({ searchParams }: Props) {
  const q = searchParams.q?.trim() || "";
  const page = parseInt(searchParams.page || "1");

  const results = q ? await searchAnime(q, page) : null;

  return (
    <div className="max-w-7xl mx-auto px-4 pt-24 pb-16">
      <h1 className="font-display text-3xl text-white mb-2">
        {q ? `RESULTS FOR "${q.toUpperCase()}"` : "SEARCH"}
      </h1>
      {results && (
        <p className="text-gray-500 text-sm mb-8">
          {results.pageInfo.total} results found
        </p>
      )}

      {!q && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Search size={48} className="text-gray-600 mb-4" />
          <p className="text-gray-500">Search for your favourite anime above</p>
        </div>
      )}

      {q && results?.media.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-white text-xl font-display mb-2">NO RESULTS</p>
          <p className="text-gray-500">Try a different search term</p>
        </div>
      )}

      {results && results.media.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {results.media.map((anime) => (
            <AnimeCard key={anime.id} anime={anime} size="md" />
          ))}
        </div>
      )}
    </div>
  );
}
