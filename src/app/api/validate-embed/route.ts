// src/app/api/validate-embed/route.ts
// Pre-checks embed URLs server-side before loading them in iframes.
// Since Vercel is whitelisted by MegaPlay/TryEmbed/Anikoto, this works.
// Returns { valid: boolean } — "valid" means real video content, not a 404 page.

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Phrases that appear in error pages from embed providers
const ERROR_PHRASES = [
  "oops! something went wrong",
  "something went wrong",
  "error code: 404",
  "page not found",
  "not found on any server",
  "dub not found",
  "sub not found",
  "no video found",
  "video not available",
  "404",
  "does not exist",
  "has been moved",
];

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ valid: false, reason: "no url" });
  }

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Referer": "https://kuroanime-green.vercel.app/",
        "Origin": "https://kuroanime-green.vercel.app",
      },
      signal: AbortSignal.timeout(8000),
      // Don't follow too many redirects
      redirect: "follow",
    });

    // Non-200 → definitely not valid
    if (!res.ok) {
      return NextResponse.json({ valid: false, reason: `http_${res.status}` });
    }

    // Read first 3KB of response — enough to detect error pages
    const reader = res.body?.getReader();
    if (!reader) {
      return NextResponse.json({ valid: true }); // Can't read, assume valid
    }

    let text = "";
    let bytesRead = 0;
    while (bytesRead < 3000) {
      const { done, value } = await reader.read();
      if (done) break;
      text += new TextDecoder().decode(value);
      bytesRead += value.byteLength;
    }
    reader.cancel();

    const lower = text.toLowerCase();
    const hasError = ERROR_PHRASES.some((phrase) => lower.includes(phrase));

    return NextResponse.json({
      valid: !hasError,
      reason: hasError ? "error_page_detected" : "ok",
    });
  } catch (e: any) {
    return NextResponse.json({ valid: false, reason: e?.message || "fetch_failed" });
  }
}
