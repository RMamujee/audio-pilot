import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const LASTFM_API_KEY = process.env.LASTFM_API_KEY;

export async function GET(req: NextRequest) {
  const artist = req.nextUrl.searchParams.get("artist")?.trim();
  if (!artist) return NextResponse.json({ similar: [] });
  if (!LASTFM_API_KEY) return NextResponse.json({ similar: [] });

  try {
    const r = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist=${encodeURIComponent(artist)}&api_key=${LASTFM_API_KEY}&limit=15&format=json`,
      { signal: AbortSignal.timeout(6_000) }
    );
    if (!r.ok) return NextResponse.json({ similar: [] });
    const data = await r.json() as { similarartists?: { artist?: { name: string; match: string }[] } };
    const similar = (data.similarartists?.artist ?? []).map(a => ({
      name: a.name,
      match: parseFloat(a.match),
    }));
    return NextResponse.json({ similar });
  } catch {
    return NextResponse.json({ similar: [] });
  }
}
