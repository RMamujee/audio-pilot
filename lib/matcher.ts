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

function artistMatches(presetArtist: string, query: string): boolean {
  return presetArtist.includes(query) || query.includes(presetArtist);
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

// Returns ALL presets that explicitly list the artist — no cosine bleed from
// other artists' sounds. Used for artist-only searches so every returned sound
// is genuinely that artist's work.
export function getAllArtistPresets(artist: string): MatchResult[] {
  if (!artist.trim()) return [];
  const normalized = normalizeArtist(artist);
  return PRESETS
    .filter(p => p.artists.some(a => artistMatches(a, normalized)))
    .map(p => ({
      preset: p,
      score: 1.0,
      matchedArtist: true,
      matchedTags: p.tags,
    }));
}

// Used when a text prompt is provided (with or without artist).
// Scores ALL presets by cosine similarity + artist bonus, returns top K.
export function matchPresets(prompt: string, artist: string, topK = 4): MatchResult[] {
  const normalizedArtist = artist.trim() ? normalizeArtist(artist) : "";
  const promptTokens = tokenize(prompt);
  const queryVec = buildTagVector(promptTokens);

  const results: MatchResult[] = PRESETS.map((preset) => {
    const presetVec = buildTagVector(preset.tags);
    let score = cosineSim(queryVec, presetVec);

    const isArtistMatch =
      normalizedArtist !== "" &&
      preset.artists.some(a => artistMatches(a, normalizedArtist));
    if (isArtistMatch) score += 0.6;

    const matchedTags: string[] = [];
    for (const tag of preset.tags) {
      if (promptTokens.some(t => tag.toLowerCase().includes(t) || t.includes(tag.toLowerCase()))) {
        matchedTags.push(tag);
        score += 0.08;
      }
    }

    return { preset, score, matchedArtist: isArtistMatch, matchedTags };
  });

  return results
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
