import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const HF_SPACE_URL = process.env.HF_SPACE_URL?.replace(/\/$/, "");
const MB_UA = "AudioPilot/2.0 (audiopilot-vercel)";

// Fetch artist search results — tries HF Space first, falls back to direct MusicBrainz
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  // Try HF Space /artist-search
  if (HF_SPACE_URL) {
    try {
      const r = await fetch(
        `${HF_SPACE_URL}/artist-search?q=${encodeURIComponent(q)}&limit=10`,
        { signal: AbortSignal.timeout(5_000) }
      );
      if (r.ok) {
        const data = await r.json();
        return NextResponse.json(data);
      }
    } catch {
      // fall through to direct MusicBrainz
    }
  }

  // Direct MusicBrainz fallback
  try {
    const r = await fetch(
      `https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(q)}&limit=10&fmt=json`,
      {
        headers: { "User-Agent": MB_UA },
        signal: AbortSignal.timeout(6_000),
      }
    );
    if (r.ok) {
      const data = await r.json();
      const results = (data.artists ?? []).map((a: Record<string, unknown>) => ({
        name: a.name ?? "",
        disambiguation: a.disambiguation ?? "",
        country: a.country ?? "",
        score: a.score ?? 0,
      }));
      return NextResponse.json({ results });
    }
  } catch {
    /* ignore */
  }

  return NextResponse.json({ results: [] });
}
