// src/app/api/validate-embed/route.ts
// Pre-checks embed URLs server-side before loading in iframes.
// Key insight: MegaPlay/TryEmbed/MegaCloud render errors via JS, so the
// initial HTML is always "valid-looking". We detect invalid sources by:
//   1. HTTP status (non-200 = dead)
//   2. Redirect to a known error domain
//   3. Static HTML error phrases (for providers that do SSR errors)
//   4. Response too small (< 200 bytes = almost certainly an error stub)

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Hard timeout for the fetch itself — keep this SHORT so the player
// doesn't wait forever. The player's VALIDATE_TIMEOUT_MS is your safety net.
const FETCH_TIMEOUT_MS = 5000;

// Bytes to read from the response — 4KB is enough for SSR error pages
const READ_BYTES = 4000;

// Phrases in the *initial* HTML (SSR-rendered, not JS) that mean dead source.
// Do NOT add JS-rendered phrases here — they won't appear in the first 4KB.
const ERROR_PHRASES = [
  "404 not found",
  "error 404",
  "page not found",
  "not found",
  "does not exist",
  "has been removed",
  "has been moved",
  "no longer available",
  "access denied",
  "403 forbidden",
  "dub not found",
  "sub not found",
  "no video found",
  "video not available",
  "no stream available",
  "episode not found",
];

// Domains that embed providers redirect to when content is missing
const ERROR_REDIRECT_DOMAINS = [
  "error.",
  "/404",
  "/not-found",
  "/error",
];

// Known domains that we trust to always serve real content
// (skip validation for these — they never 404 on the HTML level)
const SKIP_VALIDATION_DOMAINS = [
  "megaplay.buzz",
  "megacloud.store",
  "megacloud.club",
  "rabbitstream.net",
  "vidstreaming.io",
  "gogo-stream.com",
];

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ valid: false, reason: "no_url" });
  }

  // Validate it's actually a URL
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ valid: false, reason: "invalid_url" });
  }

  // Skip validation for trusted providers — just say valid immediately.
  // These providers use JS-rendered errors so HTML check is useless anyway,
  // and we avoid wasting time + adding latency.
  const isTrusted = SKIP_VALIDATION_DOMAINS.some((d) =>
    parsed.hostname.includes(d)
  );
  if (isTrusted) {
    return NextResponse.json({ valid: true, reason: "trusted_provider" });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://kuroanime-green.vercel.app/",
        Origin: "https://kuroanime-green.vercel.app",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeoutId);

    // Check final URL after redirects for known error paths
    const finalUrl = res.url || url;
    const redirectedToError = ERROR_REDIRECT_DOMAINS.some((pattern) =>
      finalUrl.includes(pattern)
    );
    if (redirectedToError) {
      return NextResponse.json({ valid: false, reason: "redirect_to_error" });
    }

    // Non-2xx = dead
    if (!res.ok) {
      return NextResponse.json({ valid: false, reason: `http_${res.status}` });
    }

    // Read first READ_BYTES of body
    const reader = res.body?.getReader();
    if (!reader) {
      // Can't read body — if status was 200, assume valid
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

    // Too small = error stub (real embed pages are always > 500 bytes)
    if (bytesRead < 200) {
      return NextResponse.json({ valid: false, reason: "response_too_small" });
    }

    const lower = text.toLowerCase();
    const errorPhrase = ERROR_PHRASES.find((phrase) => lower.includes(phrase));
    if (errorPhrase) {
      return NextResponse.json({
        valid: false,
        reason: `error_phrase: ${errorPhrase}`,
      });
    }

    return NextResponse.json({ valid: true, reason: "ok" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    // AbortError = our timeout fired — treat as unknown (show iframe anyway)
    if (msg.includes("abort") || msg.includes("Abort")) {
      return NextResponse.json({ valid: true, reason: "timeout_assume_valid" });
    }
    return NextResponse.json({ valid: false, reason: msg });
  }
}
