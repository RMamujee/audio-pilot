import { NextRequest, NextResponse } from "next/server";
import { fetchArtistImage } from "@/lib/tag-fetcher";

export const runtime = "nodejs";

const LASTFM_API_KEY = process.env.LASTFM_API_KEY;

type LfmImage = { "#text": string; size: string };
type LfmArtist = { name: string; match: string; image?: LfmImage[] };

export async function GET(req: NextRequest) {
  const artist = req.nextUrl.searchParams.get("artist")?.trim();
  if (!artist) return NextResponse.json({ similar: [], image: null });
  if (!LASTFM_API_KEY) return NextResponse.json({ similar: [], image: null });

  const [lfmRes, image] = await Promise.all([
    fetch(
      `https://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist=${encodeURIComponent(artist)}&api_key=${LASTFM_API_KEY}&limit=15&format=json`,
      { signal: AbortSignal.timeout(6_000) }
    ).then(r => r.ok ? r.json() : null).catch(() => null) as Promise<{ similarartists?: { artist?: LfmArtist[] } } | null>,
    fetchArtistImage(artist),
  ]);

  const similar = (lfmRes?.similarartists?.artist ?? []).map(a => ({
    name: a.name,
    match: parseFloat(a.match),
    image: a.image?.find(i => i.size === "medium")?.["#text"] || undefined,
  }));

  return NextResponse.json({ similar, image });
}
