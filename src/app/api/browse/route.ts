// src/app/api/browse/route.ts
// Proxies AniList GraphQL through your server to avoid CORS/blocking issues

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const BROWSE_QUERY = `
query Browse($page:Int,$perPage:Int,$genres:[String],$format:MediaFormat,$season:MediaSeason,
  $seasonYear:Int,$status:MediaStatus,$sort:[MediaSort],$search:String){
  Page(page:$page,perPage:$perPage){
    pageInfo{ hasNextPage currentPage }
    media(type:ANIME,genres:$genres,format:$format,season:$season,seasonYear:$seasonYear,
      status:$status,sort:$sort,search:$search,isAdult:false){
      id title{english romaji}
      coverImage{large extraLarge medium color}
      format averageScore episodes status
    }
  }
}`;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

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
  if (genres)  variables.genres     = genres.split(",");
  if (format)  variables.format     = format;
  if (season)  variables.season     = season.toUpperCase();
  if (year)    variables.seasonYear = parseInt(year);
  if (status)  variables.status     = status;

  try {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Accept":        "application/json",
        "User-Agent":    "KuroAnime/1.0",
      },
      body: JSON.stringify({ query: BROWSE_QUERY, variables }),
      next: { revalidate: 300 }, // cache 5 mins
    });

    if (!res.ok) {
      return NextResponse.json({ error: `AniList error ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (e) {
    console.error("Browse proxy error:", e);
    return NextResponse.json({ error: "fetch failed" }, { status: 500 });
  }
}
