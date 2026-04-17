import { NextRequest, NextResponse } from "next/server";
import { matchPresets } from "@/lib/matcher";

export const runtime = "nodejs";

const HF_SPACE_URL = process.env.HF_SPACE_URL?.replace(/\/$/, "");

function normalizeHFResult(r: Record<string, unknown>) {
  const p = (r.params ?? {}) as Record<string, unknown>;
  const artistTags = Array.isArray(r.artist_tags) ? r.artist_tags as string[] : [];
  return {
    name:          String(r.name ?? ""),
    description:   String(r.description ?? r.matched_query ?? ""),
    genre:         String(r.genre ?? ""),
    artists:       Array.isArray(r.artists) ? r.artists as string[] : [],
    tags:          Array.isArray(r.tags) ? r.tags as string[] : [],
    artistTags,
    confidence:    Math.min(Number(r.confidence ?? 0), 1.0),
    matchedArtist: Boolean(r.matchedArtist),
    matchedTags:   Array.isArray(r.matchedTags) ? r.matchedTags as string[] : [],
    params: {
      cutoff:     Number(p.cutoff     ?? 8000),
      resonance:  Number(p.resonance  ?? 0.7),
      attack:     Number(p.attack     ?? 0.01),
      decay:      Number(p.decay      ?? 0.3),
      sustain:    Number(p.sustain    ?? 0.7),
      release:    Number(p.release    ?? 0.5),
      reverbSize: Number(p.reverb_size ?? p.reverbSize ?? 0.3),
      reverbWet:  Number(p.reverb_wet  ?? p.reverbWet  ?? 0.1),
      oscType:    String(p.osc_type    ?? p.oscType    ?? "saw"),
      drive:      Number(p.drive      ?? 0),
      chorus:     Number(p.chorus     ?? 0),
      delayMix:   Number(p.delay_mix  ?? p.delayMix   ?? 0),
    },
  };
}

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const prompt: string = body.prompt ?? "";
    const artist: string = body.artist ?? "";
    const top_k: number  = Math.min(Number(body.top_k ?? 20), 50);

    if (!prompt && !artist) {
      return NextResponse.json({ error: "Provide an artist name" }, { status: 400 });
    }

    if (HF_SPACE_URL) {
      try {
        const upstream = await fetch(`${HF_SPACE_URL}/generate`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ prompt, artist, top_k }),
          signal:  AbortSignal.timeout(20_000),
        });
        if (upstream.ok) {
          const data = await upstream.json() as { results: Record<string, unknown>[] };
          return NextResponse.json({ results: data.results.map(normalizeHFResult) });
        }
      } catch {
        console.warn("HF Space unavailable, falling back to local matcher");
      }
    }

    const results = matchPresets(prompt, artist, top_k);
    if (results.length === 0) {
      return NextResponse.json({ error: "No matching sounds found for this artist" }, { status: 404 });
    }

    return NextResponse.json({
      results: results.map((r) => ({
        name:          r.preset.name,
        description:   r.preset.description,
        genre:         "",
        confidence:    Math.min(r.score, 1.0),
        matchedArtist: r.matchedArtist,
        matchedTags:   r.matchedTags,
        artistTags:    [],
        params:        r.preset.params,
        artists:       r.preset.artists,
        tags:          r.preset.tags,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
