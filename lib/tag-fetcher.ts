const LASTFM_API_KEY     = process.env.LASTFM_API_KEY;
const SPOTIFY_CLIENT_ID  = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const MB_UA = "AudioPilot/2.0 (audiopilot-vercel)";

// ─── Spotify token cache ──────────────────────────────────────────────────────

let _spToken: string | null = null;
let _spTokenExp = 0;

async function getSpotifyToken(): Promise<string | null> {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) return null;
  if (_spToken && Date.now() < _spTokenExp) return _spToken;
  try {
    const r = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
      },
      body: "grant_type=client_credentials",
      signal: AbortSignal.timeout(6_000),
    });
    if (!r.ok) return null;
    const d = await r.json() as { access_token: string; expires_in: number };
    _spToken = d.access_token;
    _spTokenExp = Date.now() + (d.expires_in - 60) * 1000;
    return _spToken;
  } catch { return null; }
}

// ─── Per-source fetchers ──────────────────────────────────────────────────────

async function fetchLastFm(artist: string): Promise<string[]> {
  if (!LASTFM_API_KEY) return [];
  try {
    const r = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=artist.gettoptags&artist=${encodeURIComponent(artist)}&api_key=${LASTFM_API_KEY}&format=json`,
      { signal: AbortSignal.timeout(6_000) }
    );
    if (!r.ok) return [];
    const d = await r.json() as { toptags?: { tag?: { name: string; count: number }[] } };
    return (d.toptags?.tag ?? []).filter(t => t.count > 3).slice(0, 20).map(t => t.name.toLowerCase());
  } catch { return []; }
}

async function fetchSpotify(artist: string): Promise<string[]> {
  const token = await getSpotifyToken();
  if (!token) return [];
  try {
    const r = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(artist)}&type=artist&limit=1`,
      { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(6_000) }
    );
    if (!r.ok) return [];
    const d = await r.json() as { artists?: { items?: { genres: string[]; popularity: number }[] } };
    return (d.artists?.items?.[0]?.genres ?? []).map(g => g.toLowerCase());
  } catch { return []; }
}

// Extracts genre clues from MusicBrainz disambiguation strings like "American rapper"
function parseDisambiguation(disambiguation: string): string[] {
  const lower = disambiguation.toLowerCase();
  const HINTS: Record<string, string[]> = {
    rapper: ["hip-hop", "rap"],
    "hip-hop": ["hip-hop", "rap"],
    "hip hop": ["hip-hop", "rap"],
    "r&b": ["r&b", "soul"],
    "r&b singer": ["r&b", "neo-soul"],
    electronic: ["electronic"],
    dj: ["electronic", "dance"],
    producer: ["electronic"],
    "house music": ["house"],
    techno: ["techno"],
    ambient: ["ambient"],
    jazz: ["jazz"],
    rock: ["rock"],
    pop: ["pop"],
    metal: ["metal"],
    punk: ["punk"],
    folk: ["folk"],
    country: ["country"],
    reggae: ["reggae"],
    dancehall: ["dancehall"],
    afrobeats: ["afrobeats"],
    "k-pop": ["k-pop"],
    "j-pop": ["j-pop"],
    trap: ["trap"],
    drill: ["drill"],
    grime: ["grime"],
    dubstep: ["dubstep"],
    trance: ["trance"],
    synthwave: ["synthwave"],
    industrial: ["industrial"],
    "drum and bass": ["drum and bass"],
    dnb: ["drum and bass"],
  };
  const found = new Set<string>();
  for (const [hint, genres] of Object.entries(HINTS)) {
    if (lower.includes(hint)) genres.forEach(g => found.add(g));
  }
  return [...found];
}

async function fetchMusicBrainz(artist: string): Promise<string[]> {
  try {
    const r = await fetch(
      `https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(artist)}&limit=1&fmt=json`,
      { headers: { "User-Agent": MB_UA }, signal: AbortSignal.timeout(7_000) }
    );
    if (!r.ok) return [];
    const d = await r.json() as {
      artists?: {
        id: string;
        disambiguation?: string;
        tags?: { name: string; count: number }[];
      }[];
    };
    const a = d.artists?.[0];
    if (!a) return [];

    const tags: string[] = [];
    if (a.tags?.length) {
      tags.push(...a.tags.slice(0, 20).map(t => t.name.toLowerCase()));
    }
    if (a.disambiguation) {
      tags.push(...parseDisambiguation(a.disambiguation));
    }
    return tags;
  } catch { return []; }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function fetchArtistTags(artist: string): Promise<{
  tags: string[];
  sources: string[];
}> {
  // Run fast paid-API sources in parallel
  const [lfm, spot] = await Promise.all([fetchLastFm(artist), fetchSpotify(artist)]);

  const sources: string[] = [];
  if (lfm.length)  sources.push("Last.fm");
  if (spot.length) sources.push("Spotify");

  let combined = [...lfm, ...spot];

  // Only hit MusicBrainz when both fast sources are empty (free but slower)
  if (combined.length < 3) {
    const mb = await fetchMusicBrainz(artist);
    if (mb.length) {
      combined = [...combined, ...mb];
      sources.push("MusicBrainz");
    }
  }

  const tags = [...new Set(combined.map(t => t.toLowerCase().trim()).filter(Boolean))];
  return { tags, sources };
}
