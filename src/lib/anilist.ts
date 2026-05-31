const ANILIST_URL = "https://graphql.anilist.co";

const MEDIA_FIELDS = `
  id idMal
  title { romaji english native userPreferred }
  description(asHtml: false)
  coverImage { extraLarge large medium color }
  bannerImage
  format status episodes duration
  season seasonYear startDate { year month day }
  genres studios(isMain: true) { nodes { name } }
  averageScore popularity trending
  tags { name rank isMediaSpoiler }
  externalLinks { site url }
  trailer { id site }
  characters(sort: ROLE, role: MAIN, perPage: 8) {
    edges { role node { id name { full } image { medium } } }
  }
  relations {
    edges {
      relationType(version: 2)
      node { id title { userPreferred } coverImage { large } format }
    }
  }
`;

async function query<T>(q: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: q, variables }),
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`AniList error: ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data as T;
}

export async function getTrending(page = 1, perPage = 20) {
  const q = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(sort: TRENDING_DESC, type: ANIME, isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await query<{ Page: { media: AnilistMedia[] } }>(q, { page, perPage });
  return data.Page.media;
}

export async function getPopular(page = 1, perPage = 20) {
  const q = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(sort: POPULARITY_DESC, type: ANIME, isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await query<{ Page: { media: AnilistMedia[] } }>(q, { page, perPage });
  return data.Page.media;
}

export async function getSeasonalAnime(season?: string, year?: number) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentSeason =
    currentMonth <= 3 ? "WINTER" : currentMonth <= 6 ? "SPRING" : currentMonth <= 9 ? "SUMMER" : "FALL";

  const q = `
    query ($season: MediaSeason, $year: Int, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(season: $season, seasonYear: $year, sort: POPULARITY_DESC, type: ANIME, isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await query<{ Page: { media: AnilistMedia[] } }>(q, {
    season: season || currentSeason,
    year: year || now.getFullYear(),
    page: 1,
    perPage: 20,
  });
  return data.Page.media;
}

export async function searchAnime(search: string, page = 1, perPage = 20) {
  const q = `
    query ($search: String, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total currentPage lastPage hasNextPage }
        media(search: $search, type: ANIME, isAdult: false, sort: SEARCH_MATCH) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await query<{ Page: { pageInfo: PageInfo; media: AnilistMedia[] } }>(q, { search, page, perPage });
  return data.Page;
}

export async function getAnimeById(id: number) {
  const q = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        ${MEDIA_FIELDS}
        recommendations(perPage: 8, sort: RATING_DESC) {
          nodes { mediaRecommendation { id title { userPreferred } coverImage { large } format } }
        }
      }
    }
  `;
  const data = await query<{ Media: AnilistMedia }>(q, { id });
  return data.Media;
}

export async function getAnimeByMalId(malId: number) {
  const q = `
    query ($malId: Int) {
      Media(idMal: $malId, type: ANIME) { ${MEDIA_FIELDS} }
    }
  `;
  const data = await query<{ Media: AnilistMedia }>(q, { malId });
  return data.Media;
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface AnilistMedia {
  id: number;
  idMal: number | null;
  title: { romaji: string; english: string | null; native: string; userPreferred: string };
  description: string | null;
  coverImage: { extraLarge: string; large: string; medium: string; color: string | null };
  bannerImage: string | null;
  format: string | null;
  status: string | null;
  episodes: number | null;
  duration: number | null;
  season: string | null;
  seasonYear: number | null;
  startDate: { year: number | null; month: number | null; day: number | null };
  genres: string[];
  averageScore: number | null;
  popularity: number | null;
  trending: number | null;
  studios: { nodes: { name: string }[] };
  tags: { name: string; rank: number; isMediaSpoiler: boolean }[];
  externalLinks: { site: string; url: string }[];
  trailer: { id: string; site: string } | null;
  characters: {
    edges: {
      role: string;
      node: { id: number; name: { full: string }; image: { medium: string } };
    }[];
  };
  relations: {
    edges: {
      relationType: string;
      node: { id: number; title: { userPreferred: string }; coverImage: { large: string }; format: string | null };
    }[];
  };
  recommendations?: {
    nodes: {
      mediaRecommendation: {
        id: number;
        title: { userPreferred: string };
        coverImage: { large: string };
        format: string | null;
      } | null;
    }[];
  };
}

interface PageInfo {
  total: number;
  currentPage: number;
  lastPage: number;
  hasNextPage: boolean;
}

// ── Additional queries ────────────────────────────────────────────────────

export async function getTopAnime(page = 1, perPage = 50) {
  const q = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total currentPage lastPage hasNextPage }
        media(sort: SCORE_DESC, type: ANIME, isAdult: false, status_not: NOT_YET_RELEASED) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await query<{ Page: { pageInfo: PageInfo; media: AnilistMedia[] } }>(q, { page, perPage });
  return data.Page;
}

export async function getAnimeByGenre(genre: string, page = 1, perPage = 30) {
  const q = `
    query ($genre: String, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total currentPage lastPage hasNextPage }
        media(genre: $genre, sort: POPULARITY_DESC, type: ANIME, isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await query<{ Page: { pageInfo: PageInfo; media: AnilistMedia[] } }>(q, { genre, page, perPage });
  return data.Page;
}

export async function getAiringSchedule() {
  const now = Math.floor(Date.now() / 1000);
  const weekLater = now + 7 * 24 * 60 * 60;
  const q = `
    query ($from: Int, $to: Int) {
      Page(perPage: 50) {
        airingSchedules(airingAt_greater: $from, airingAt_lesser: $to, sort: TIME) {
          airingAt episode
          media {
            id title { english romaji }
            coverImage { large medium }
            format episodes
          }
        }
      }
    }
  `;
  const data = await query<{ Page: { airingSchedules: AiringSchedule[] } }>(q, { from: now, to: weekLater });
  return data.Page.airingSchedules;
}

export const ALL_GENRES = [
  "Action","Adventure","Comedy","Drama","Fantasy",
  "Horror","Mecha","Music","Mystery","Psychological",
  "Romance","Sci-Fi","Slice of Life","Sports",
  "Supernatural","Thriller","Isekai","Harem",
];

export interface AiringSchedule {
  airingAt: number;
  episode: number;
  media: {
    id: number;
    title: { english: string | null; romaji: string };
    coverImage: { large: string; medium: string };
    format: string | null;
    episodes: number | null;
  };
}
