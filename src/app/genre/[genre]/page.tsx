import { getAnimeByGenre, ALL_GENRES } from "@/lib/anilist";
import { AnimeCard } from "@/components/AnimeCard";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Tag } from "lucide-react";

interface Props {
  params: { genre: string };
  searchParams: { page?: string };
}

const GENRE_COLORS: Record<string, string> = {
  Action: "from-red-900/40 to-orange-900/20",
  Adventure: "from-green-900/40 to-emerald-900/20",
  Comedy: "from-yellow-900/40 to-amber-900/20",
  Drama: "from-purple-900/40 to-violet-900/20",
  Fantasy: "from-blue-900/40 to-indigo-900/20",
  Horror: "from-gray-900/40 to-red-900/30",
  Mecha: "from-zinc-900/40 to-slate-900/20",
  Music: "from-pink-900/40 to-rose-900/20",
  Mystery: "from-slate-900/40 to-gray-900/20",
  Psychological: "from-violet-900/40 to-purple-900/30",
  Romance: "from-pink-900/40 to-red-900/20",
  "Sci-Fi": "from-cyan-900/40 to-blue-900/20",
  "Slice of Life": "from-teal-900/40 to-green-900/20",
  Sports: "from-orange-900/40 to-yellow-900/20",
  Supernatural: "from-indigo-900/40 to-purple-900/20",
  Thriller: "from-gray-900/40 to-zinc-900/30",
  Isekai: "from-emerald-900/40 to-teal-900/20",
  Harem: "from-rose-900/40 to-pink-900/20",
};

export async function generateMetadata({ params }: Props) {
  const genre = decodeURIComponent(params.genre);
  return { title: `${genre} Anime` };
}

export default async function GenrePage({ params, searchParams }: Props) {
  const genre = decodeURIComponent(params.genre);
  if (!ALL_GENRES.includes(genre)) notFound();

  const page = parseInt(searchParams.page || "1");
  const { media, pageInfo } = await getAnimeByGenre(genre, page, 36);
  const gradient = GENRE_COLORS[genre] || "from-brand/20 to-surface/0";

  return (
    <div className="min-h-screen">
      {/* Genre Hero Banner */}
      <div className={`h-40 bg-gradient-to-br ${gradient} relative overflow-hidden pt-16`}>
        <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 h-full flex items-end pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand/20 rounded-xl flex items-center justify-center">
              <Tag size={18} className="text-brand" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-0.5">Genre</p>
              <h1 className="font-display text-4xl text-white">{genre.toUpperCase()}</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* All genres quick nav */}
        <div className="flex gap-2 flex-wrap mb-8">
          {ALL_GENRES.map((g) => (
            <Link
              key={g}
              href={`/genre/${encodeURIComponent(g)}`}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                g === genre
                  ? "bg-brand text-white"
                  : "bg-surface-2 text-gray-400 hover:text-white border border-white/5"
              }`}
            >
              {g}
            </Link>
          ))}
        </div>

        {/* Results count */}
        <p className="text-gray-500 text-sm mb-6">{pageInfo.total} anime found</p>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8">
          {media.map((anime) => (
            <AnimeCard key={anime.id} anime={anime} size="md" />
          ))}
        </div>

        {/* Pagination */}
        <div className="flex justify-center gap-2 mt-10">
          {page > 1 && (
            <a href={`/genre/${params.genre}?page=${page - 1}`}
              className="px-5 py-2 rounded-full bg-surface-2 text-gray-300 hover:text-white text-sm transition-colors">
              ← Previous
            </a>
          )}
          <span className="px-5 py-2 rounded-full bg-brand text-white text-sm font-medium">
            Page {page} of {pageInfo.lastPage}
          </span>
          {pageInfo.hasNextPage && (
            <a href={`/genre/${params.genre}?page=${page + 1}`}
              className="px-5 py-2 rounded-full bg-surface-2 text-gray-300 hover:text-white text-sm transition-colors">
              Next →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
