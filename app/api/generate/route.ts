import { NextRequest, NextResponse } from "next/server";
import { matchPresets } from "@/lib/matcher";
import { fetchArtistTags, fetchArtistAudioFeatures } from "@/lib/tag-fetcher";
import { generateSounds } from "@/lib/sound-generator";

export const runtime = "nodejs";

const _rawHFURL = process.env.HF_SPACE_URL?.replace(/\/$/, "");
const HF_SPACE_URL = _rawHFURL?.startsWith("https://") ? _rawHFURL : undefined;

function clamp(val: unknown, min: number, max: number, def: number): number {
  const n = Number(val ?? def);
  return isFinite(n) ? Math.max(min, Math.min(max, n)) : def;
}

function normalizeHFResult(r: Record<string, unknown>) {
  const p = (r.params ?? {}) as Record<string, unknown>;
  const VALID_OSC = new Set(["sine", "saw", "square"]);
  const oscType = String(p.osc_type ?? p.oscType ?? "saw");
  return {
    name:          String(r.name ?? "").slice(0, 200),
    description:   String(r.description ?? r.matched_query ?? "").slice(0, 500),
    genre:         String(r.genre ?? "").slice(0, 100),
    artists:       Array.isArray(r.artists) ? (r.artists as unknown[]).filter(x => typeof x === "string").slice(0, 20) as string[] : [],
    tags:          Array.isArray(r.tags) ? (r.tags as unknown[]).filter(x => typeof x === "string").slice(0, 30) as string[] : [],
    artistTags:    Array.isArray(r.artist_tags) ? (r.artist_tags as unknown[]).filter(x => typeof x === "string").slice(0, 20) as string[] : [],
    confidence:    clamp(r.confidence, 0, 1, 0),
    matchedArtist: Boolean(r.matchedArtist),
    matchedTags:   Array.isArray(r.matchedTags) ? (r.matchedTags as unknown[]).filter(x => typeof x === "string").slice(0, 20) as string[] : [],
    params: {
      cutoff:     clamp(p.cutoff,     20,    20000, 8000),
      resonance:  clamp(p.resonance,  0.1,   10,    0.7),
      attack:     clamp(p.attack,     0,     5,     0.01),
      decay:      clamp(p.decay,      0,     5,     0.3),
      sustain:    clamp(p.sustain,    0,     1,     0.7),
      release:    clamp(p.release,    0,     8,     0.5),
      reverbSize: clamp(p.reverb_size ?? p.reverbSize, 0, 1, 0.3),
      reverbWet:  clamp(p.reverb_wet  ?? p.reverbWet,  0, 1, 0.1),
      oscType:    VALID_OSC.has(oscType) ? oscType : "saw",
      drive:      clamp(p.drive,      0,     1,     0),
      chorus:     clamp(p.chorus,     0,     1,     0),
      delayMix:   clamp(p.delay_mix   ?? p.delayMix,   0, 1, 0),
    },
  };
}

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const prompt: string    = String(body.prompt ?? "").slice(0, 500);
    const artist: string    = String(body.artist ?? "").slice(0, 200);
    const top_k: number     = Math.min(Math.max(1, Number(body.top_k ?? 500) || 500), 5000);
    const manualTags: string[] = Array.isArray(body.manualTags)
      ? (body.manualTags as unknown[]).filter(t => typeof t === "string").map(t => (t as string).slice(0, 100)).slice(0, 50)
      : [];

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
    const [{ tags: fetchedTags, sources }, audioFeatures, presetMatches] = await Promise.all([
      (artist && manualTags.length === 0) ? fetchArtistTags(artist) : Promise.resolve({ tags: [] as string[], sources: [] as string[] }),
      (artist && manualTags.length === 0) ? fetchArtistAudioFeatures(artist) : Promise.resolve(null),
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
    const generatedResults = generateSounds(artist || prompt, tags, audioFeatures);

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
