import { NextRequest, NextResponse } from "next/server";
import { matchPresets } from "@/lib/matcher";

export const runtime = "nodejs";

const HF_SPACE_URL = process.env.HF_SPACE_URL?.replace(/\/$/, "");

// HF Space returns snake_case params — normalize to camelCase for the frontend
function normalizeHFResult(r: Record<string, unknown>) {
  const p = (r.params ?? {}) as Record<string, unknown>;
  return {
    name:         r.name ?? "",
    description:  r.description ?? r.matched_query ?? "",
    artists:      Array.isArray(r.artists) ? r.artists : [],
    tags:         Array.isArray(r.tags) ? r.tags : [],
    confidence:   Math.min(Number(r.confidence ?? 0), 1.0),
    matchedArtist: Boolean(r.matchedArtist),
    matchedTags:  Array.isArray(r.matchedTags) ? r.matchedTags : [],
    params: {
      cutoff:      Number(p.cutoff      ?? 8000),
      resonance:   Number(p.resonance   ?? 0.7),
      attack:      Number(p.attack      ?? 0.01),
      decay:       Number(p.decay       ?? 0.3),
      sustain:     Number(p.sustain     ?? 0.7),
      release:     Number(p.release     ?? 0.5),
      reverbSize:  Number(p.reverb_size ?? p.reverbSize ?? 0.3),
      reverbWet:   Number(p.reverb_wet  ?? p.reverbWet  ?? 0.1),
      oscType:     String(p.osc_type    ?? p.oscType    ?? "saw"),
      drive:       Number(p.drive       ?? 0),
      chorus:      Number(p.chorus      ?? 0),
      delayMix:    Number(p.delay_mix   ?? p.delayMix   ?? 0),
    },
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt: string = body.prompt ?? "";
    const artist: string = body.artist ?? "";

    if (!prompt && !artist) {
      return NextResponse.json(
        { error: "Provide a prompt or artist name" },
        { status: 400 }
      );
    }

    // Path A: HF Space (real sentence-transformers embeddings)
    if (HF_SPACE_URL) {
      try {
        const upstream = await fetch(`${HF_SPACE_URL}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, artist, top_k: 4 }),
          signal: AbortSignal.timeout(15_000),
        });

        if (upstream.ok) {
          const data = await upstream.json() as { results: Record<string, unknown>[] };
          return NextResponse.json({
            results: data.results.map(normalizeHFResult),
          });
        }
      } catch {
        console.warn("HF Space unavailable, falling back to local matcher");
      }
    }

    // Path B: local keyword matcher fallback
    const results = matchPresets(prompt, artist, 4);

    if (results.length === 0) {
      return NextResponse.json(
        { error: "No matching presets found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      results: results.map((r) => ({
        name:         r.preset.name,
        description:  r.preset.description,
        confidence:   Math.min(r.score, 1.0),
        matchedArtist: r.matchedArtist,
        matchedTags:  r.matchedTags,
        params:       r.preset.params,
        artists:      r.preset.artists,
        tags:         r.preset.tags,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
