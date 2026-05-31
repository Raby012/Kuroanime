# KuroAnime 🖤

A full-stack anime streaming website built from scratch.

**Stack:** Next.js 14 · TypeScript · Tailwind CSS · AniList · Consumet.ts · Prisma · PostgreSQL · Auth.js

---

## Features

- 🎬 Real HLS streams via GogoAnime + AnimePahe (consumet.ts)
- 🔗 VidSrc embed fallback (5+ providers auto-rotate)
- 🔍 Search 20,000+ anime via AniList GraphQL
- 📺 Trending, Seasonal, Popular sections
- 👤 Google + GitHub login
- 📋 Watchlist with status tracking (Watching / Completed / Planning / Dropped)
- ▶️ Episode progress tracking
- 📱 Fully responsive

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/yourusername/kuroanime.git
cd kuroanime
npm install
```

### 2. Setup environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | Supabase → Project → Settings → Database |
| `AUTH_SECRET` | Run: `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID/SECRET` | Google Cloud Console → Credentials |
| `GITHUB_CLIENT_ID/SECRET` | GitHub → Settings → Developer Settings → OAuth Apps |

### 3. Setup database

```bash
npm run db:push
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploy to Vercel (free)

1. Push to GitHub
2. Go to [vercel.com](https://vercel.com) → Import project
3. Add all environment variables in Vercel dashboard
4. Change `NEXTAUTH_URL` to your Vercel URL
5. Deploy ✅

---

## Database (Supabase - free)

1. Go to [supabase.com](https://supabase.com) → New project
2. Go to Settings → Database → Connection string → copy URI
3. Replace `[YOUR-PASSWORD]` with your DB password
4. Paste as `DATABASE_URL` in your env

---

## OAuth Setup

### Google
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create project → APIs & Services → Credentials → OAuth 2.0
3. Authorized redirect URI: `https://yoursite.com/api/auth/callback/google`

### GitHub  
1. Go to GitHub → Settings → Developer settings → OAuth Apps → New
2. Authorization callback URL: `https://yoursite.com/api/auth/callback/github`

---

## Adding More Streaming Sources

Edit `src/lib/streaming.ts` to add or remove providers.
Edit `src/components/VideoPlayer.tsx` to change fallback order.

---

## Tech Used

| Purpose | Library |
|---|---|
| Framework | Next.js 14 App Router |
| Styling | Tailwind CSS |
| Anime Data | AniList GraphQL API (free, no key) |
| Streaming | @consumet/extensions (GogoAnime, AnimePahe) |
| Embed fallback | VidSrc, VidSrc CC, 2Embed, SmashyStream |
| Auth | Auth.js v5 (Google + GitHub OAuth) |
| Database | PostgreSQL via Supabase |
| ORM | Prisma |
| HLS Player | hls.js |
| Toasts | react-hot-toast |
