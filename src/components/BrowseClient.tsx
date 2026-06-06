// src/components/BrowseClient.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimeCard } from "@/components/AnimeCard";
import { Search, SlidersHorizontal, X, ChevronDown, Loader2 } from "lucide-react";

const GENRES = [
  "Action","Adventure","Comedy","Drama","Ecchi","Fantasy","Horror",
  "Mahou Shoujo","Mecha","Music","Mystery","Psychological","Romance",
  "Sci-Fi","Slice of Life","Sports","Supernatural","Thriller",
];

const FORMATS = ["TV","Movie","OVA","ONA","Special","Music"];
const SEASONS = ["Winter","Spring","Summer","Fall"];
const YEARS   = Array.from({ length: 30 }, (_, i) => String(2024 - i));
const SORTS   = [
  { label: "Trending",    value: "TRENDING_DESC" },
  { label: "Popularity",  value: "POPULARITY_DESC" },
  { label: "Score",       value: "SCORE_DESC" },
  { label: "Newest",      value: "START_DATE_DESC" },
  { label: "Title A–Z",   value: "TITLE_ROMAJI" },
];
const STATUSES = ["Releasing","Finished","Not Yet Released","Cancelled","Hiatus"];

interface Anime {
  id: number;
  title: { english?: string; romaji: string };
  coverImage: { large: string; extraLarge: string; medium: string; color: string | null };
  format?: string;
  averageScore?: number;
  episodes?: number;
  status?: string;
}

const BROWSE_QUERY = `
query Browse($page:Int,$perPage:Int,$genres:[String],$format:MediaFormat,$season:MediaSeason,
  $seasonYear:Int,$status:MediaStatus,$sort:[MediaSort],$search:String,$isAdult:Boolean){
  Page(page:$page,perPage:$perPage){
    pageInfo{ hasNextPage }
    media(type:ANIME,genres:$genres,format:$format,season:$season,seasonYear:$seasonYear,
      status:$status,sort:$sort,search:$search,isAdult:$isAdult){
      id title{english romaji}
      coverImage{large extraLarge medium color}
      format averageScore episodes status
    }
  }
}`;

export default function BrowseClient() {
  const router       = useSearchParams();
  const [search,     setSearch]     = useState("");
  const [genres,     setGenres]     = useState<string[]>([]);
  const [format,     setFormat]     = useState("");
  const [season,     setSeason]     = useState("");
  const [year,       setYear]       = useState("");
  const [status,     setStatus]     = useState("");
  const [sort,       setSort]       = useState("TRENDING_DESC");
  const [showFilter, setShowFilter] = useState(false);
  const [animes,     setAnimes]     = useState<Anime[]>([]);
  const [page,       setPage]       = useState(1);
  const [hasMore,    setHasMore]    = useState(true);
  const [loading,    setLoading]    = useState(false);

  const activeFilters = genres.length + (format ? 1 : 0) + (season ? 1 : 0) +
    (year ? 1 : 0) + (status ? 1 : 0);

  const fetchAnimes = useCallback(async (reset = false) => {
    setLoading(true);
    const variables: Record<string, unknown> = {
      page: reset ? 1 : page,
      perPage: 24,
      sort: [sort],
      isAdult: false,
    };
    if (search)  variables.search     = search;
    if (genres.length) variables.genres = genres;
    if (format)  variables.format     = format.toUpperCase().replace(" ", "_");
    if (season)  variables.season     = season.toUpperCase();
    if (year)    variables.seasonYear = parseInt(year);
    if (status)  variables.status     = status.toUpperCase().replace(/ /g, "_");

    try {
      const res  = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: BROWSE_QUERY, variables }),
      });
      const json = await res.json();
      const media    = json.data?.Page?.media ?? [];
      const pageInfo = json.data?.Page?.pageInfo;
      setHasMore(pageInfo?.hasNextPage ?? false);
      if (reset) { setAnimes(media); setPage(2); }
      else        { setAnimes((p) => [...p, ...media]); setPage((p) => p + 1); }
    } catch {}
    setLoading(false);
  }, [search, genres, format, season, year, status, sort, page]);

  // Fetch on filter change
  useEffect(() => { fetchAnimes(true); }, [search, genres, format, season, year, status, sort]);

  function toggleGenre(g: string) {
    setGenres((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]);
  }

  function clearFilters() {
    setGenres([]); setFormat(""); setSeason(""); setYear(""); setStatus(""); setSort("TRENDING_DESC");
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search anime..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-1 border border-white/8 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-brand transition-colors"
            />
          </div>
          <div className="flex gap-2">
            {/* Sort */}
            <div className="relative">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="appearance-none bg-surface-1 border border-white/8 rounded-xl pl-3 pr-8 py-2.5 text-sm text-white focus:outline-none focus:border-brand transition-colors cursor-pointer"
              >
                {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
            {/* Filter toggle */}
            <button
              onClick={() => setShowFilter(!showFilter)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                showFilter || activeFilters > 0
                  ? "bg-brand text-white border-brand"
                  : "bg-surface-1 text-gray-300 border-white/8 hover:border-brand/50"
              }`}
            >
              <SlidersHorizontal size={15} />
              Filters
              {activeFilters > 0 && (
                <span className="bg-white/20 text-white text-xs rounded-full px-1.5 py-0.5">{activeFilters}</span>
              )}
            </button>
          </div>
        </div>

        {/* Filter panel */}
        {showFilter && (
          <div className="bg-surface-1 border border-white/8 rounded-2xl p-4 mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Filters</span>
              {activeFilters > 0 && (
                <button onClick={clearFilters} className="text-xs text-brand hover:text-brand-light flex items-center gap-1">
                  <X size={12} /> Clear all
                </button>
              )}
            </div>

            {/* Genres — multi select */}
            <div>
              <p className="text-xs text-gray-500 mb-2 font-medium">GENRES</p>
              <div className="flex flex-wrap gap-1.5">
                {GENRES.map((g) => (
                  <button
                    key={g}
                    onClick={() => toggleGenre(g)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
                      genres.includes(g)
                        ? "bg-brand text-white border-brand"
                        : "bg-surface-2 text-gray-400 border-white/8 hover:border-brand/40 hover:text-white"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Row filters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Format */}
              <div>
                <p className="text-xs text-gray-500 mb-1.5 font-medium">FORMAT</p>
                <div className="relative">
                  <select value={format} onChange={(e) => setFormat(e.target.value)}
                    className="w-full appearance-none bg-surface-2 border border-white/8 rounded-lg pl-3 pr-7 py-2 text-sm text-white focus:outline-none focus:border-brand transition-colors">
                    <option value="">Any</option>
                    {FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
              </div>
              {/* Season */}
              <div>
                <p className="text-xs text-gray-500 mb-1.5 font-medium">SEASON</p>
                <div className="relative">
                  <select value={season} onChange={(e) => setSeason(e.target.value)}
                    className="w-full appearance-none bg-surface-2 border border-white/8 rounded-lg pl-3 pr-7 py-2 text-sm text-white focus:outline-none focus:border-brand transition-colors">
                    <option value="">Any</option>
                    {SEASONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
              </div>
              {/* Year */}
              <div>
                <p className="text-xs text-gray-500 mb-1.5 font-medium">YEAR</p>
                <div className="relative">
                  <select value={year} onChange={(e) => setYear(e.target.value)}
                    className="w-full appearance-none bg-surface-2 border border-white/8 rounded-lg pl-3 pr-7 py-2 text-sm text-white focus:outline-none focus:border-brand transition-colors">
                    <option value="">Any</option>
                    {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
              </div>
              {/* Status */}
              <div>
                <p className="text-xs text-gray-500 mb-1.5 font-medium">STATUS</p>
                <div className="relative">
                  <select value={status} onChange={(e) => setStatus(e.target.value)}
                    className="w-full appearance-none bg-surface-2 border border-white/8 rounded-lg pl-3 pr-7 py-2 text-sm text-white focus:outline-none focus:border-brand transition-colors">
                    <option value="">Any</option>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active genre chips */}
        {genres.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {genres.map((g) => (
              <button key={g} onClick={() => toggleGenre(g)}
                className="flex items-center gap-1 bg-brand/20 text-brand border border-brand/30 rounded-full px-2.5 py-0.5 text-xs font-medium hover:bg-brand/30 transition-colors">
                {g} <X size={10} />
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        {animes.length === 0 && !loading ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg">No anime found</p>
            <p className="text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
              {animes.map((anime) => (
                <AnimeCard key={anime.id} anime={anime as any} size="sm" />
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={() => fetchAnimes(false)}
                  disabled={loading}
                  className="flex items-center gap-2 bg-surface-1 hover:bg-surface-2 border border-white/8 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-60"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                  {loading ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
