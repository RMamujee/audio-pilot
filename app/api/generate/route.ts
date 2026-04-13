import { NextRequest, NextResponse } from "next/server";
import { matchPresets } from "@/lib/matcher";

export const runtime = "nodejs";

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
