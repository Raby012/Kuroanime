// src/app/api/browse/route.ts
// Proxies AniList GraphQL through your server to avoid CORS/blocking issues

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Dynamic query builder — only declares variables that are actually used.
// This prevents AniList from throwing GraphQL validation errors for
// unused typed variables (e.g. passing null for $genres: [String]).
function buildQuery(vars: Record<string, unknown>): string {
  const hasSearch     = !!vars.search;
  const hasGenres     = !!vars.genres;
  const hasFormat     = !!vars.format;
  const hasSeason     = !!vars.season;
  const hasSeasonYear = !!vars.seasonYear;
  const hasStatus     = !!vars.status;

  const argDefs: string[] = [
    "$page: Int",
    "$perPage: Int",
    "$sort: [MediaSort]",
  ];
  if (hasSearch)     argDefs.push("$search: String");
  if (hasGenres)     argDefs.push("$genres: [String]");
  if (hasFormat)     argDefs.push("$format: MediaFormat");
  if (hasSeason)     argDefs.push("$season: MediaSeason");
  if (hasSeasonYear) argDefs.push("$seasonYear: Int");
  if (hasStatus)     argDefs.push("$status: MediaStatus");

  const mediaArgs: string[] = [
    "type: ANIME",
    "isAdult: false",
    "sort: $sort",
  ];
  if (hasSearch)     mediaArgs.push("search: $search");
  if (hasGenres)     mediaArgs.push("genre_in: $genres");
  if (hasFormat)     mediaArgs.push("format: $format");
  if (hasSeason)     mediaArgs.push("season: $season");
  if (hasSeasonYear) mediaArgs.push("seasonYear: $seasonYear");
  if (hasStatus)     mediaArgs.push("status: $status");

  return `
    query Browse(${argDefs.join(", ")}) {
      Page(page: $page, perPage: $perPage) {
        pageInfo {
          hasNextPage
          currentPage
        }
        media(${mediaArgs.join(", ")}) {
          id
          title { english romaji }
          coverImage { large extraLarge medium color }
          format
          averageScore
          episodes
          status
        }
      }
    }
  `;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Build only the variables we actually have
  const variables: Record<string, unknown> = {
    page:    parseInt(searchParams.get("page")    || "1"),
    perPage: parseInt(searchParams.get("perPage") || "24"),
    sort:    [searchParams.get("sort") || "TRENDING_DESC"],
  };

  const search  = searchParams.get("search");
  const genres  = searchParams.get("genres");
  const format  = searchParams.get("format");
  const season  = searchParams.get("season");
  const year    = searchParams.get("year");
  const status  = searchParams.get("status");

  if (search)  variables.search     = search;
  if (genres)  variables.genres     = genres.split(",").map((g) => g.trim());
  if (format)  variables.format     = format.toUpperCase();
  if (season)  variables.season     = season.toUpperCase();
  if (year)    variables.seasonYear = parseInt(year);
  if (status)  variables.status     = status.toUpperCase();

  try {
    // DO NOT use `next: { revalidate }` inside fetch() in Route Handlers on Vercel —
    // it causes silent failures with the Node.js runtime.
    // Use Cache-Control response headers instead.
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept":       "application/json",
        "User-Agent":   "KuroAnime/1.0",
      },
      body: JSON.stringify({
        query:     buildQuery(variables),
        variables,
      }),
      cache: "no-store", // Let our response Cache-Control header handle caching
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("AniList HTTP error:", res.status, text);
      return NextResponse.json(
        { error: `AniList error ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();

    // Surface GraphQL errors clearly so they don't silently fail
    if (data.errors && data.errors.length > 0) {
      console.error("AniList GraphQL errors:", JSON.stringify(data.errors));
      return NextResponse.json(
        { error: data.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (e) {
    console.error("Browse proxy error:", e);
    return NextResponse.json({ error: "fetch failed" }, { status: 500 });
  }
}
