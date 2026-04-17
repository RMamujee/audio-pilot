import { PRESETS, ARTIST_ALIASES, type Preset } from "./presets";

export interface MatchResult {
  preset: Preset;
  score: number;
  matchedArtist: boolean;
  matchedTags: string[];
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function normalizeArtist(input: string): string {
  const lower = input.toLowerCase().trim();
  return ARTIST_ALIASES[lower] ?? lower;
}

function cosineSim(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0, normA = 0, normB = 0;
  for (const [term, wA] of a) {
    const wB = b.get(term) ?? 0;
    dot += wA * wB;
  }
  for (const w of a.values()) normA += w * w;
  for (const w of b.values()) normB += w * w;
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function buildTagVector(tags: string[]): Map<string, number> {
  const vec = new Map<string, number>();
  for (const tag of tags) {
    for (const token of tokenize(tag)) {
      vec.set(token, (vec.get(token) ?? 0) + 1);
    }
  }
  return vec;
}

export function matchPresets(prompt: string, artist: string, topK = 4): MatchResult[] {
  const normalizedArtist = artist.trim() ? normalizeArtist(artist) : "";
  const promptTokens = tokenize(prompt);

  // When only artist is given, derive query from that artist's preset tags
  // so stylistically similar sounds are also surfaced
  let queryVec: Map<string, number>;
  if (!prompt.trim() && normalizedArtist) {
    const artistPresets = PRESETS.filter(p =>
      p.artists.some(a => a.includes(normalizedArtist) || normalizedArtist.includes(a))
    );
    const derivedTags = artistPresets.flatMap(p => p.tags);
    queryVec = buildTagVector(derivedTags.length > 0 ? derivedTags : [normalizedArtist]);
  } else {
    queryVec = buildTagVector(promptTokens);
  }

  const results: MatchResult[] = PRESETS.map((preset) => {
    const presetVec = buildTagVector(preset.tags);
    let score = cosineSim(queryVec, presetVec);

    const artistMatch =
      normalizedArtist !== "" &&
      preset.artists.some(a => a.includes(normalizedArtist) || normalizedArtist.includes(a));
    if (artistMatch) score += 0.6;

    const matchedTags: string[] = [];
    for (const tag of preset.tags) {
      if (promptTokens.some(t => tag.toLowerCase().includes(t) || t.includes(tag.toLowerCase()))) {
        matchedTags.push(tag);
        score += 0.08;
      }
    }

    return { preset, score, matchedArtist: artistMatch, matchedTags };
  });

  return results
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
