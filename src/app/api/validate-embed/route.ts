// src/app/api/validate-embed/route.ts

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const FETCH_TIMEOUT_MS = 5000;
const READ_BYTES = 6000; // increased — MegaPlay error text is deeper in HTML

// SSR-rendered error phrases (not JS-rendered)
const ERROR_PHRASES = [
  "404 not found",
  "error 404",
  "page not found",
  "does not exist",
  "has been removed",
  "no longer available",
  "access denied",
  "403 forbidden",
  "dub not found",
  "sub not found",
  "no video found",
  "video not available",
  "no stream available",
  "episode not found",
  // MegaPlay specific — their error page has this in the SSR HTML
  "oops! something went wrong",
  "the page you&#39;re looking for doesn&#39;t exist",
  "the page you're looking for doesn't exist",
  "error code: 404",
  // TryEmbed specific
  "playback error",
  "all servers unavailable",
];

// Redirect patterns that mean dead content
const ERROR_REDIRECT_PATTERNS = ["/404", "/not-found", "/error", "error."];

// Providers where we skip validation entirely — their errors are pure JS
// and can't be detected from initial HTML. User sees iframe and picks manually.
// NOTE: We removed megaplay.buzz from here — we now detect its SSR error HTML.
const SKIP_VALIDATION_DOMAINS: string[] = [
  // Add domains here only if they NEVER have SSR error content
  // and postMessage errors are handled gracefully in the iframe itself
];

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ valid: false, reason: "no_url" });

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ valid: false, reason: "invalid_url" });
  }

  // Skip validation for fully-trusted domains
  if (SKIP_VALIDATION_DOMAINS.some((d) => parsed.hostname.includes(d))) {
    return NextResponse.json({ valid: true, reason: "trusted_provider" });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://kuroanime-green.vercel.app/",
        Origin: "https://kuroanime-green.vercel.app",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeoutId);

    // Check final URL after redirects
    const finalUrl = res.url || url;
    if (ERROR_REDIRECT_PATTERNS.some((p) => finalUrl.includes(p))) {
      return NextResponse.json({ valid: false, reason: "redirect_to_error" });
    }

    if (!res.ok) {
      return NextResponse.json({ valid: false, reason: `http_${res.status}` });
    }

    // Read body
    const reader = res.body?.getReader();
    if (!reader) {
      return NextResponse.json({ valid: true, reason: "no_body_reader" });
    }

    let text = "";
    let bytesRead = 0;
    try {
      while (bytesRead < READ_BYTES) {
        const { done, value } = await reader.read();
        if (done) break;
        text += new TextDecoder().decode(value);
        bytesRead += value.byteLength;
      }
    } finally {
      reader.cancel().catch(() => {});
    }

    if (bytesRead < 200) {
      return NextResponse.json({ valid: false, reason: "response_too_small" });
    }

    const lower = text.toLowerCase();
    const errorPhrase = ERROR_PHRASES.find((p) => lower.includes(p));
    if (errorPhrase) {
      return NextResponse.json({ valid: false, reason: `phrase: ${errorPhrase}` });
    }

    return NextResponse.json({ valid: true, reason: "ok" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    // Timeout → assume valid, show iframe
    if (msg.toLowerCase().includes("abort")) {
      return NextResponse.json({ valid: true, reason: "timeout_assume_valid" });
    }
    return NextResponse.json({ valid: false, reason: msg });
  }
}
