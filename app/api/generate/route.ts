import { NextRequest, NextResponse } from "next/server";
import { matchPresets } from "@/lib/matcher";
import { fetchArtistTags } from "@/lib/tag-fetcher";
import { generateSounds } from "@/lib/sound-generator";

export const runtime = "nodejs";

const HF_SPACE_URL = process.env.HF_SPACE_URL?.replace(/\/$/, "");

function normalizeHFResult(r: Record<string, unknown>) {
  const p = (r.params ?? {}) as Record<string, unknown>;
  return {
    name:          String(r.name ?? ""),
    description:   String(r.description ?? r.matched_query ?? ""),
    genre:         String(r.genre ?? ""),
    artists:       Array.isArray(r.artists) ? r.artists as string[] : [],
    tags:          Array.isArray(r.tags) ? r.tags as string[] : [],
    artistTags:    Array.isArray(r.artist_tags) ? r.artist_tags as string[] : [],
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
    const prompt: string    = body.prompt ?? "";
    const artist: string    = body.artist ?? "";
    const top_k: number     = Math.min(Number(body.top_k ?? 500), 5000);
    const manualTags: string[] = Array.isArray(body.manualTags) ? body.manualTags : [];

    if (!prompt && !artist) {
      return NextResponse.json({ error: "Provide an artist name" }, { status: 400 });
    }

    // ── Path A: HF Space (semantic embeddings + full preset DB) ──────────────
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
        console.warn("HF Space unavailable, using local pipeline");
      }
    }

    // ── Path B: Local pipeline ───────────────────────────────────────────────
    // 1. Fetch artist tags (skip if manual tags provided)
    const [{ tags: fetchedTags, sources }, presetMatches] = await Promise.all([
      (artist && manualTags.length === 0) ? fetchArtistTags(artist) : Promise.resolve({ tags: [] as string[], sources: [] as string[] }),
      Promise.resolve(matchPresets(prompt, artist, 50)),
    ]);

    const tags = manualTags.length > 0 ? manualTags : fetchedTags;

    // 2. Map preset matches to response shape
    const presetResults = presetMatches.map(r => ({
      name:          r.preset.name,
      description:   r.preset.description,
      genre:         "",
      confidence:    Math.min(r.score, 1.0),
      matchedArtist: r.matchedArtist,
      matchedTags:   r.matchedTags,
      artistTags:    tags.slice(0, 8),
      params:        r.preset.params,
      artists:       r.preset.artists,
      tags:          r.preset.tags,
    }));

    // 3. Generate sounds from tags
    const generatedResults = tags.length > 0
      ? generateSounds(artist || prompt, tags)
      : [];

    // 4. Merge: curated presets first, then generated (no name dupes)
    const seen = new Set(presetResults.map(r => r.name));
    const merged = [
      ...presetResults,
      ...generatedResults.filter(r => !seen.has(r.name)),
    ];

    if (merged.length === 0) {
      return NextResponse.json(
        { error: "No sounds found — try a different artist name" },
        { status: 404 }
      );
    }

    return NextResponse.json({ results: merged.slice(0, top_k), sources });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
