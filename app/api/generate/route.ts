import { NextRequest, NextResponse } from "next/server";
import { matchPresets } from "@/lib/matcher";

export const runtime = "nodejs";

// If HF_SPACE_URL is set (Vercel env var), proxy to the HF Space for real ML embeddings.
// Otherwise fall back to the local keyword matcher (always works, no external deps).
const HF_SPACE_URL = process.env.HF_SPACE_URL?.replace(/\/$/, "");

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

    // --- Path A: proxy to HF Space (real sentence-transformers) ---
    if (HF_SPACE_URL) {
      const upstream = await fetch(`${HF_SPACE_URL}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, artist, top_k: 4 }),
        signal: AbortSignal.timeout(15_000),
      });

      if (!upstream.ok) {
        // HF Space is cold-starting or down — fall through to local matcher
        console.warn("HF Space unavailable, falling back to local matcher");
      } else {
        const data = await upstream.json();
        return NextResponse.json(data);
      }
    }

    // --- Path B: local keyword matcher (fallback / no HF_SPACE_URL set) ---
    const results = matchPresets(prompt, artist, 4);

    if (results.length === 0) {
      return NextResponse.json(
        { error: "No matching presets found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      results: results.map((r) => ({
        name: r.preset.name,
        description: r.preset.description,
        confidence: Math.min(r.score, 1.0),
        matchedArtist: r.matchedArtist,
        matchedTags: r.matchedTags,
        params: r.preset.params,
        artists: r.preset.artists,
        tags: r.preset.tags,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
