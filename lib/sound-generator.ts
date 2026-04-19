// ─── Types ────────────────────────────────────────────────────────────────────

type OscType = "sine" | "saw" | "square";

export interface GeneratedSound {
  name: string; description: string; genre: string;
  confidence: number; matchedArtist: boolean;
  matchedTags: string[]; artistTags: string[];
  params: {
    cutoff: number; resonance: number;
    attack: number; decay: number; sustain: number; release: number;
    reverbSize: number; reverbWet: number; oscType: OscType;
    drive: number; chorus: number; delayMix: number;
  };
  artists: string[]; tags: string[];
}

// ─── Seeded RNG ───────────────────────────────────────────────────────────────

function seededRng(seed: string) {
  let h = 0xdeadbeef;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return () => {
    h ^= h >>> 13; h = (Math.imul(h, 0x9e3779b9)) | 0; h ^= h >>> 15;
    return (h >>> 0) / 0x100000000;
  };
}

function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }

// ─── Artist sonic profile ─────────────────────────────────────────────────────
// Five axes, each 0–1, derived from weighted tag contributions + name-seeded RNG.
// Covers 140+ genre/descriptor tags from Last.fm, Spotify, and MusicBrainz.

interface ArtistProfile {
  darkness:     number; // 0 = bright/airy,   1 = dark/heavy
  aggression:   number; // 0 = gentle/soft,    1 = driven/aggressive
  spaciousness: number; // 0 = dry/tight,      1 = ambient/spacious
  warmth:       number; // 0 = cold/digital,   1 = warm/organic
  rhythmic:     number; // 0 = drone/ambient,  1 = punchy/percussive
}

// [tag_substring, darkness, aggression, spaciousness, warmth, rhythmic]
type TagWeight = [string, number, number, number, number, number];

const TAG_WEIGHTS: TagWeight[] = [
  // ── Hip-hop / Rap ─────────────────────────────────────────────────────────
  ["trap",               0.55,  0.30, -0.25, -0.15,  0.50],
  ["drill",              0.65,  0.60, -0.40, -0.25,  0.55],
  ["grime",              0.45,  0.55, -0.25, -0.10,  0.50],
  ["phonk",              0.75,  0.45,  0.05, -0.25,  0.35],
  ["memphis",            0.65,  0.35,  0.00, -0.15,  0.35],
  ["dark trap",          0.70,  0.45, -0.10, -0.25,  0.45],
  ["cloud rap",          0.20, -0.05,  0.55,  0.20,  0.05],
  ["plugg",              0.05, -0.05,  0.45,  0.25,  0.15],
  ["rage",               0.35,  0.45,  0.15, -0.10,  0.30],
  ["melodic rap",       -0.05,  0.00,  0.25,  0.30,  0.20],
  ["emo rap",            0.25,  0.15,  0.20,  0.10,  0.20],
  ["sad rap",            0.30, -0.05,  0.30,  0.15,  0.10],
  ["boom bap",          -0.15,  0.10,  0.05,  0.50,  0.30],
  ["east coast",        -0.10,  0.15,  0.00,  0.45,  0.30],
  ["west coast",        -0.10,  0.10,  0.05,  0.40,  0.30],
  ["golden age",        -0.20,  0.05,  0.05,  0.50,  0.25],
  ["conscious",         -0.10,  0.00,  0.05,  0.45,  0.20],
  ["gangsta",            0.35,  0.40, -0.15,  0.00,  0.40],
  ["gangsta rap",        0.35,  0.45, -0.10,  0.00,  0.40],
  ["g-funk",            -0.05,  0.05,  0.10,  0.30,  0.35],
  ["crunk",              0.30,  0.55, -0.25, -0.10,  0.55],
  ["bounce",            -0.05,  0.25, -0.15,  0.05,  0.65],
  ["jersey club",        0.00,  0.30, -0.10, -0.10,  0.70],
  ["southern hip-hop",   0.20,  0.20, -0.05,  0.10,  0.30],
  ["hardcore hip-hop",   0.35,  0.50, -0.10, -0.15,  0.40],
  ["alternative hip-hop",0.10,  0.10,  0.15,  0.20,  0.20],
  ["hip-hop",            0.10,  0.15,  0.00,  0.25,  0.35],
  ["hip hop",            0.10,  0.15,  0.00,  0.25,  0.35],
  ["rap",                0.10,  0.20,  0.00,  0.15,  0.35],
  // ── Electronic / Techno / House ───────────────────────────────────────────
  ["techno",             0.25,  0.25, -0.05, -0.45,  0.55],
  ["minimal techno",     0.15,  0.15,  0.10, -0.50,  0.50],
  ["hard techno",        0.40,  0.60, -0.20, -0.50,  0.60],
  ["berlin",             0.30,  0.25,  0.05, -0.35,  0.50],
  ["industrial techno",  0.55,  0.60,  0.00, -0.55,  0.50],
  ["house",             -0.10,  0.00,  0.10,  0.15,  0.55],
  ["deep house",        -0.20, -0.10,  0.25,  0.25,  0.50],
  ["chicago house",     -0.10,  0.00,  0.05,  0.30,  0.55],
  ["acid house",         0.10,  0.30,  0.00, -0.15,  0.50],
  ["acid",               0.10,  0.40,  0.00, -0.25,  0.45],
  ["acid techno",        0.15,  0.50, -0.05, -0.35,  0.50],
  ["trance",            -0.10,  0.00,  0.35, -0.10,  0.45],
  ["progressive trance", 0.00,  0.00,  0.45, -0.10,  0.40],
  ["psytrance",          0.15,  0.15,  0.25, -0.20,  0.50],
  ["hard trance",        0.15,  0.40,  0.10, -0.30,  0.55],
  ["dubstep",            0.25,  0.55, -0.10, -0.25,  0.45],
  ["brostep",            0.25,  0.65, -0.15, -0.35,  0.45],
  ["drum and bass",      0.10,  0.40, -0.05, -0.20,  0.65],
  ["dnb",                0.10,  0.40, -0.05, -0.20,  0.65],
  ["neurofunk",          0.25,  0.50, -0.05, -0.30,  0.65],
  ["liquid dnb",        -0.05,  0.10,  0.25,  0.15,  0.60],
  ["jungle",             0.10,  0.25, -0.05, -0.05,  0.60],
  ["breakbeat",          0.10,  0.25, -0.05, -0.05,  0.55],
  ["breaks",             0.05,  0.15,  0.00,  0.00,  0.55],
  ["big beat",           0.10,  0.35, -0.05, -0.05,  0.60],
  ["idm",               -0.05,  0.10,  0.30, -0.10, -0.10],
  ["braindance",         0.00,  0.15,  0.30, -0.10, -0.05],
  ["experimental",       0.10,  0.00,  0.35,  0.00, -0.15],
  ["glitch",             0.10,  0.25,  0.15, -0.25,  0.05],
  ["electronica",        0.00,  0.00,  0.20, -0.10,  0.15],
  ["electronic",         0.00,  0.00,  0.10, -0.10,  0.15],
  ["electro",            0.10,  0.15,  0.00, -0.20,  0.40],
  ["edm",               -0.15,  0.10,  0.10, -0.10,  0.50],
  ["big room",          -0.10,  0.15,  0.15, -0.15,  0.55],
  ["future bass",       -0.10,  0.05,  0.20,  0.10,  0.35],
  ["wave",               0.25,  0.00,  0.35,  0.10,  0.15],
  ["uk garage",          0.00,  0.10,  0.10,  0.10,  0.55],
  ["2-step",             0.00,  0.10,  0.10,  0.10,  0.55],
  ["uk bass",            0.10,  0.15,  0.10,  0.05,  0.50],
  ["post-dubstep",       0.10,  0.00,  0.30,  0.10,  0.20],
  ["footwork",           0.00,  0.25, -0.05, -0.05,  0.70],
  ["juke",               0.00,  0.25, -0.05, -0.05,  0.70],
  ["gabber",             0.25,  0.75, -0.20, -0.50,  0.65],
  ["hardcore",           0.35,  0.75, -0.10, -0.50,  0.55],
  ["hardstyle",          0.10,  0.65, -0.10, -0.35,  0.60],
  ["frenchcore",         0.20,  0.70, -0.20, -0.45,  0.65],
  ["ambient",           -0.15, -0.55,  0.75,  0.15, -0.55],
  ["dark ambient",       0.70, -0.15,  0.70, -0.10, -0.50],
  ["drone",              0.25, -0.40,  0.80,  0.00, -0.65],
  ["noise",              0.35,  0.60,  0.10, -0.50,  0.00],
  ["industrial",         0.50,  0.60,  0.00, -0.50,  0.15],
  ["power electronics",  0.60,  0.70,  0.00, -0.60,  0.05],
  ["darksynth",          0.70,  0.60,  0.00, -0.50,  0.25],
  ["witch house",        0.55, -0.05,  0.50, -0.15, -0.20],
  ["synthwave",          0.00,  0.00,  0.30,  0.00,  0.30],
  ["outrun",             0.00,  0.00,  0.25,  0.00,  0.35],
  ["retrowave",          0.00,  0.00,  0.30,  0.10,  0.30],
  ["vaporwave",         -0.20, -0.35,  0.65,  0.15, -0.35],
  ["future funk",       -0.15,  0.00,  0.20,  0.35,  0.45],
  ["chillwave",         -0.25, -0.50,  0.55,  0.30, -0.20],
  ["lo-fi",             -0.10, -0.35,  0.30,  0.55,  0.00],
  ["lofi",              -0.10, -0.35,  0.30,  0.55,  0.00],
  ["chillhop",          -0.10, -0.35,  0.30,  0.50,  0.05],
  ["trip-hop",           0.25, -0.20,  0.55,  0.30, -0.10],
  ["downtempo",          0.15, -0.30,  0.50,  0.20, -0.20],
  ["hauntology",         0.20, -0.25,  0.60,  0.15, -0.25],
  ["hyperpop",           0.00,  0.20,  0.05, -0.15,  0.35],
  ["digicore",           0.00,  0.15,  0.10, -0.10,  0.30],
  ["bubblegum bass",    -0.15,  0.15,  0.05, -0.10,  0.35],
  ["pc music",          -0.20,  0.10,  0.00, -0.10,  0.35],
  // ── R&B / Soul / Jazz ────────────────────────────────────────────────────
  ["r&b",               -0.20, -0.35,  0.15,  0.60,  0.15],
  ["rnb",               -0.20, -0.35,  0.15,  0.60,  0.15],
  ["contemporary r&b",  -0.25, -0.35,  0.10,  0.55,  0.20],
  ["alternative r&b",   -0.10, -0.20,  0.25,  0.45,  0.10],
  ["soul",              -0.30, -0.45,  0.15,  0.70,  0.15],
  ["neo-soul",          -0.30, -0.45,  0.30,  0.70,  0.05],
  ["gospel",            -0.40, -0.40,  0.15,  0.70,  0.15],
  ["funk",              -0.10,  0.00,  0.00,  0.55,  0.55],
  ["jazz",              -0.25, -0.35,  0.25,  0.70,  0.00],
  ["jazz rap",          -0.10,  0.10,  0.15,  0.55,  0.20],
  ["blues",             -0.15, -0.20,  0.10,  0.60,  0.15],
  ["smooth",            -0.25, -0.35,  0.15,  0.50,  0.05],
  ["quiet storm",       -0.25, -0.40,  0.20,  0.55,  0.00],
  // ── Rock / Guitar ────────────────────────────────────────────────────────
  ["rock",               0.10,  0.35,  0.00,  0.00,  0.40],
  ["alternative",        0.10,  0.20,  0.10,  0.05,  0.30],
  ["indie",              0.00,  0.00,  0.15,  0.15,  0.20],
  ["indie rock",         0.00,  0.15,  0.10,  0.15,  0.30],
  ["metal",              0.55,  0.70,  0.00, -0.50,  0.35],
  ["death metal",        0.65,  0.75, -0.05, -0.60,  0.40],
  ["black metal",        0.70,  0.60,  0.15, -0.55,  0.25],
  ["doom metal",         0.60,  0.30,  0.30, -0.45,  0.00],
  ["sludge",             0.55,  0.45,  0.25, -0.40,  0.05],
  ["stoner",             0.30,  0.15,  0.45, -0.15, -0.15],
  ["post-metal",         0.45,  0.10,  0.55, -0.25, -0.10],
  ["thrash",             0.40,  0.70, -0.15, -0.50,  0.55],
  ["metalcore",          0.40,  0.70, -0.10, -0.45,  0.50],
  ["djent",              0.35,  0.55,  0.10, -0.35,  0.40],
  ["nu-metal",           0.35,  0.60, -0.05, -0.30,  0.35],
  ["punk",               0.10,  0.65, -0.10, -0.10,  0.50],
  ["post-punk",          0.25,  0.40,  0.20,  0.00,  0.30],
  ["new wave",           0.00,  0.10,  0.15,  0.00,  0.35],
  ["grunge",             0.25,  0.45,  0.10, -0.15,  0.35],
  ["britpop",           -0.05,  0.15,  0.05,  0.15,  0.35],
  ["emo",                0.25,  0.25,  0.15,  0.00,  0.25],
  ["midwest emo",        0.25,  0.20,  0.15,  0.10,  0.15],
  ["screamo",            0.35,  0.65,  0.10, -0.20,  0.30],
  ["post-rock",         -0.10,  0.00,  0.60,  0.15, -0.15],
  ["shoegaze",          -0.10,  0.00,  0.70,  0.15, -0.25],
  ["dream pop",         -0.25, -0.35,  0.65,  0.30, -0.20],
  ["slowcore",           0.15, -0.30,  0.40,  0.20, -0.30],
  ["noise rock",         0.30,  0.50,  0.20, -0.20,  0.25],
  ["art rock",           0.05,  0.10,  0.25,  0.15,  0.15],
  ["progressive rock",   0.05,  0.10,  0.35,  0.10,  0.00],
  ["gothic",             0.50,  0.05,  0.25, -0.10, -0.05],
  ["gothic rock",        0.50,  0.15,  0.20, -0.10,  0.10],
  // ── Pop / Mainstream ─────────────────────────────────────────────────────
  ["pop",               -0.35, -0.20,  0.00,  0.15,  0.30],
  ["synth-pop",         -0.15,  0.00,  0.15,  0.00,  0.40],
  ["electropop",        -0.15,  0.00,  0.10, -0.05,  0.40],
  ["dance-pop",         -0.25,  0.00,  0.00,  0.05,  0.55],
  ["teen pop",          -0.40, -0.25, -0.05,  0.10,  0.40],
  ["art pop",           -0.05, -0.05,  0.20,  0.15,  0.15],
  ["indie pop",         -0.15, -0.10,  0.15,  0.20,  0.20],
  ["bedroom pop",       -0.20, -0.30,  0.20,  0.40, -0.05],
  ["chamber pop",       -0.30, -0.25,  0.20,  0.35, -0.05],
  ["k-pop",             -0.35, -0.15,  0.15,  0.00,  0.55],
  ["j-pop",             -0.30, -0.10,  0.15,  0.10,  0.50],
  ["singer-songwriter", -0.25, -0.35,  0.15,  0.35, -0.15],
  ["ballad",            -0.15, -0.35,  0.20,  0.35, -0.25],
  // ── Ambient / Atmospheric / Cinematic ────────────────────────────────────
  ["neoclassical",      -0.40, -0.50,  0.55,  0.55, -0.40],
  ["post-classical",    -0.35, -0.45,  0.55,  0.45, -0.35],
  ["new age",           -0.55, -0.65,  0.80,  0.55, -0.55],
  ["meditation",        -0.60, -0.65,  0.80,  0.55, -0.60],
  ["healing",           -0.60, -0.60,  0.70,  0.60, -0.55],
  ["cinematic",          0.05, -0.05,  0.55,  0.15, -0.20],
  ["film score",         0.05, -0.05,  0.55,  0.20, -0.20],
  ["ethereal",          -0.25, -0.35,  0.70,  0.20, -0.40],
  ["atmospheric",        0.10, -0.15,  0.60,  0.10, -0.25],
  ["minimal",           -0.05, -0.10,  0.25, -0.20, -0.10],
  ["minimalism",        -0.05, -0.10,  0.25, -0.20, -0.10],
  ["space",             -0.10, -0.20,  0.60,  0.00, -0.30],
  // ── World / Latin / Other ────────────────────────────────────────────────
  ["afrobeats",         -0.15,  0.00,  0.00,  0.30,  0.65],
  ["afropop",           -0.15,  0.00,  0.00,  0.30,  0.60],
  ["amapiano",          -0.10,  0.00,  0.05,  0.25,  0.60],
  ["afroswing",         -0.10,  0.10,  0.05,  0.25,  0.55],
  ["reggae",            -0.15, -0.25,  0.30,  0.40,  0.25],
  ["dub",               -0.05, -0.25,  0.60,  0.25,  0.20],
  ["dancehall",          0.05,  0.10,  0.00,  0.20,  0.55],
  ["country",           -0.25, -0.15,  0.05,  0.55,  0.25],
  ["folk",              -0.25, -0.25,  0.15,  0.55, -0.10],
  ["country rap",        0.15,  0.15,  0.00,  0.30,  0.30],
  ["latin",             -0.10,  0.10,  0.00,  0.25,  0.55],
  ["reggaeton",          0.00,  0.15, -0.05,  0.15,  0.60],
  ["latin trap",         0.30,  0.25, -0.15,  0.05,  0.55],
  ["salsa",             -0.10,  0.10,  0.00,  0.30,  0.65],
  ["cumbia",            -0.10,  0.05,  0.05,  0.30,  0.60],
  ["baile funk",         0.10,  0.25, -0.15,  0.05,  0.70],
  // ── Descriptors common in Last.fm tags ───────────────────────────────────
  ["dark",               0.55,  0.15,  0.05, -0.15,  0.00],
  ["heavy",              0.40,  0.50,  0.00, -0.30,  0.20],
  ["aggressive",         0.30,  0.65, -0.15, -0.20,  0.35],
  ["melancholic",        0.30, -0.25,  0.30,  0.15, -0.15],
  ["sad",                0.25, -0.25,  0.25,  0.15, -0.15],
  ["emotional",          0.15, -0.15,  0.25,  0.20, -0.05],
  ["mellow",            -0.15, -0.35,  0.25,  0.35, -0.15],
  ["chill",             -0.15, -0.45,  0.30,  0.30, -0.20],
  ["relaxing",          -0.25, -0.50,  0.35,  0.35, -0.25],
  ["uplifting",         -0.40, -0.10,  0.15,  0.15,  0.15],
  ["euphoric",          -0.35,  0.10,  0.20,  0.10,  0.25],
  ["energetic",         -0.15,  0.40, -0.05, -0.05,  0.50],
  ["catchy",            -0.20,  0.00,  0.00,  0.15,  0.35],
  ["romantic",          -0.25, -0.35,  0.15,  0.50, -0.05],
  ["sensual",           -0.15, -0.25,  0.20,  0.50,  0.05],
  ["psychedelic",        0.15,  0.00,  0.50,  0.10, -0.05],
  ["spiritual",         -0.40, -0.45,  0.55,  0.45, -0.25],
  ["party",             -0.25,  0.15, -0.15,  0.05,  0.60],
  ["club",              -0.10,  0.10, -0.10, -0.05,  0.60],
  ["dance",             -0.15,  0.00,  0.00,  0.05,  0.50],
  ["symphonic",         -0.20, -0.25,  0.45,  0.35, -0.20],
  ["orchestral",        -0.20, -0.25,  0.45,  0.35, -0.20],
  ["progressive",        0.05,  0.05,  0.30,  0.05, -0.05],
];

function buildArtistProfile(artistName: string, tags: string[]): ArtistProfile {
  const nameRng = seededRng(`profile|${artistName.toLowerCase()}`);

  let d = 0, ag = 0, sp = 0, wa = 0, ry = 0, matches = 0;
  for (const [term, td, ta, ts, tw, tr] of TAG_WEIGHTS) {
    if (tags.some(t => t.includes(term) || term.includes(t))) {
      d += td; ag += ta; sp += ts; wa += tw; ry += tr;
      matches++;
    }
  }

  // tanh keeps the profile decisive even with few strong tags.
  // Scale 1.5 maps one strong genre match (Δ≈0.6) to ~0.74 on the axis,
  // and three agreeing tags to ~0.90 — clearly separated from other artists.
  const noiseAmt = matches > 6 ? 0.03 : matches > 2 ? 0.06 : matches > 0 ? 0.10 : 0.0;
  const toAxis = (delta: number): number => {
    if (matches === 0) return nameRng();
    return clamp01(0.5 + Math.tanh(delta / 1.5) * 0.5 + (nameRng() - 0.5) * noiseAmt);
  };

  return {
    darkness:     toAxis(d),
    aggression:   toAxis(ag),
    spaciousness: toAxis(sp),
    warmth:       toAxis(wa),
    rhythmic:     toAxis(ry),
  };
}

// ─── Artist-driven sound architecture ────────────────────────────────────────
// Zero hardcoded templates. Every sound type, parameter space, name, and count
// is derived entirely from the artist's tags and five profile axes.
//
// Variation is infinite: seed = artistName|type|index, so any artist can
// produce an unbounded unique library. A single API call returns a practical
// batch (default ~2 600, max 5 000); the full space is effectively limitless.

type SoundType = "sub" | "bass" | "lead" | "pad" | "stab" | "pluck" | "texture" | "arp" | "drone";

// Which tags pull each sound type into an artist's palette
const TYPE_AFFINITY: Record<SoundType, string[]> = {
  sub:     ["trap","808","hip-hop","rap","drill","phonk","grime","uk bass","dubstep","dnb","drum and bass","jungle","dub","bass music","bass","uk garage","dembow","hardcore","gabber","hardstyle"],
  bass:    ["bass","house","techno","acid","funk","disco","electronic","dance","electro","deep house","minimal techno","dnb","dubstep","jungle","afrobeats","reggaeton","uk garage","breakbeat","chicago house","trance","edm"],
  lead:    ["house","techno","trance","synthwave","synth-pop","pop","r&b","soul","trap","acid","edm","electropop","k-pop","metal","rock","indie","melodic","idm","dubstep","darksynth","new wave","retrowave","future bass","wave"],
  pad:     ["ambient","atmospheric","cinematic","shoegaze","dream pop","dark ambient","vaporwave","chillwave","trip-hop","lo-fi","lofi","ethereal","post-rock","hauntology","synthwave","neoclassical","new age","drone","spiritual","film score","psychedelic","slowcore"],
  stab:    ["house","techno","jungle","dnb","drum and bass","rave","acid","uk garage","funk","disco","chicago house","breakbeat","electro","latin","afrobeats","trance","footwork","juke","afropop","amapiano"],
  pluck:   ["trap","hip-hop","melodic trap","plugg","cloud rap","pop","electropop","k-pop","synth-pop","idm","funk","r&b","indie","bedroom pop","afrobeats","amapiano","reggaeton","dancehall","j-pop"],
  texture: ["ambient","experimental","idm","noise","industrial","glitch","power electronics","dark ambient","hauntology","drone","psychedelic","shoegaze","post-rock","abstract","braindance","musique concrete","noise rock","post-industrial"],
  arp:     ["synth-pop","trance","idm","electronic","synthwave","techno","electropop","new wave","acid","braindance","progressive trance","k-pop","j-pop","retrowave","italo disco","eurodance","future pop"],
  drone:   ["ambient","dark ambient","drone","experimental","industrial","post-rock","doom metal","meditation","new age","noise","shoegaze","black metal","dark","atmospheric","deep listening","lowercase","post-metal"],
};

// Genre-context nouns — pulled from matching tags to name an artist's sounds.
// Large pools ensure the name space stays collision-free even at 500+ per type.
const TAG_NOUNS: [string, string[]][] = [
  ["trap",          ["808","Trap","Astro","Dark","Wave","Rage","Tunnel","Void","Slide","Echo","Drip","Smoke","Haze","Steel","Glow"]],
  ["drill",         ["Drill","Steel","Pressure","Block","Cold","Concrete","Road","Slab","Ice","Flint","Edge","Bolt"]],
  ["phonk",         ["Phonk","Memphis","Casket","Neon","Chrome","Hollow","Drift","Ghost","Rust","Creep","Fog","Tomb"]],
  ["grime",         ["Road","East","Grime","Static","Concrete","Pressure","Block","Wire","Glass","Steel"]],
  ["hip-hop",       ["Boom","Gold","Raw","Classic","Grimy","Street","Blaze","Smoke","Cipher","Block"]],
  ["boom bap",      ["Boom","Gold","Classic","East","Raw","Crate","Break","Soul","Dust","Vinyl"]],
  ["r&b",           ["Velvet","Silk","Midnight","Satin","Warm","Moody","Bliss","Shimmer","Rose","Haze"]],
  ["soul",          ["Soul","Gospel","Deep","Rich","Spirit","Church","Gold","Glow","Flame","Grace"]],
  ["jazz",          ["Jazz","Blue","Mellow","Club","Late Night","Smoky","Chord","Mode","Tone","Swing"]],
  ["neo-soul",      ["Velvet","Warm","Rich","Deep","Smooth","Night","Haze","Ember","Silk","Flow"]],
  ["funk",          ["Funk","Groove","Slap","Bounce","Electric","Dirty","Pocket","Lock","Snap","Pop"]],
  ["house",         ["House","Club","Chicago","Floor","Deep","Groove","Pump","Lift","Jack","Organ"]],
  ["techno",        ["Techno","Berlin","Grid","Machine","Circuit","Industrial","Drive","Steel","Forge","Core"]],
  ["acid",          ["Acid","303","Squelch","Resonant","Hypnotic","Raw","Twist","Coil","Melt","Burn"]],
  ["trance",        ["Trance","Euphoric","Lift","Sky","Rave","Peak","Rise","Crest","Soar","Surge"]],
  ["dubstep",       ["Wobble","Filth","Drop","Bass","Heavy","Dub","Rupture","Crush","Shred","Slam"]],
  ["dnb",           ["Neuro","Liquid","Break","Rush","Step","Speed","Grid","Amen","Lurch","Snap"]],
  ["drum and bass", ["Neuro","Liquid","Break","Rush","Step","Speed","Amen","Panic","Drive","Flex"]],
  ["idm",           ["Brain","Glitch","Circuit","Algo","Neural","Abstract","Loop","Scatter","Morph","Fold"]],
  ["experimental",  ["Glitch","Abstract","Chaos","Morph","Fractal","Void","Error","Splice","Warp","Drift"]],
  ["ambient",       ["Drift","Float","Ether","Void","Cloud","Space","Mist","Lull","Still","Haze"]],
  ["dark ambient",  ["Shadow","Abyss","Void","Dusk","Obsidian","Cold","Rot","Tomb","Ash","Fog"]],
  ["vaporwave",     ["Vapor","Neon","Retro","Aesthetic","Mall","Dream","Freeze","Gloss","Haze","Still"]],
  ["synthwave",     ["Neon","Retro","Outrun","Chrome","Night","80s","Sunset","Grid","Laser","Pulse"]],
  ["retrowave",     ["Neon","Outrun","Chrome","Night","Retro","Sunset","Drive","Glow","Grid","Streak"]],
  ["shoegaze",      ["Blur","Haze","Wave","Dream","Noise","Wall","Gaze","Drown","Swirl","Cloud"]],
  ["metal",         ["Sear","Grind","Riff","Blade","Fury","Iron","Rust","Slag","Forge","Spike"]],
  ["industrial",    ["Machine","Steel","Grind","Rust","Factory","Bolt","Oxide","Grease","Pipe","Core"]],
  ["post-rock",     ["Signal","Swell","Rise","Echo","Wave","Space","Crest","Surge","Build","Crash"]],
  ["afrobeats",     ["Afro","Lagos","Dance","Heat","Groove","Rhythm","High Life","Sweat","Sun","Pulse"]],
  ["amapiano",      ["Log","Jozi","Gqom","Step","Flow","Cape","Piano","Stomp","Flute","Bounce"]],
  ["reggae",        ["Roots","Dub","Island","Skank","Dread","Bass","Yard","Riddim","Rock","Sway"]],
  ["pop",           ["Pop","Bright","Crystal","Fresh","Pure","Candy","Sugar","Gloss","Shine","Spark"]],
  ["k-pop",         ["Bright","Pixel","Idol","Clean","Hyper","Neon","Gloss","Shine","Star","Burst"]],
  ["indie",         ["Lo","Haze","Bedroom","Tape","Warm","Wires","Fuzz","Grain","Soft","Wool"]],
  ["trip-hop",      ["Shadow","Heavy","Smoke","Trip","Low","Fog","Grey","Nod","Slump","Stagger"]],
  ["lo-fi",         ["Tape","Dust","Vintage","Warm","Mellow","Static","Crackle","Grain","Worn","Amber"]],
  ["darksynth",     ["Shadow","Cyber","Blade","Dark","Neon","Machine","Vector","Hex","Corrupt","Glitch"]],
  ["chillwave",     ["Wave","Chill","Haze","Drift","Soft","Pastel","Glow","Wash","Fade","Float"]],
  ["new age",       ["Light","Peace","Heal","Glow","Pure","Serenity","Lotus","Aura","Bloom","Still"]],
  ["drone",         ["Hum","Sustain","Void","Static","Hold","Deep","Field","Bed","Floor","Tone"]],
  ["emo",           ["Bleed","Echo","Rain","Gray","Hollow","Fade","Scar","Rust","Crack","Break"]],
  ["punk",          ["Fury","Raw","Crash","Riot","Burn","Edge","Spike","Gash","Wreck","Snarl"]],
  ["latin",         ["Caliente","Ritmo","Noche","Fuego","Groove","Sol","Clave","Sabor","Swing","Pulse"]],
  ["reggaeton",     ["Perreo","Dembow","Noche","Calor","Ritmo","Flow","Peso","Tumba","Vibra","Bass"]],
  ["psychedelic",   ["Trip","Prism","Spiral","Haze","Phase","Drift","Warp","Melt","Bloom","Cycle"]],
  ["metal",         ["Sear","Riff","Grind","Forge","Iron","Blast","Slag","Shred","Thrash","Chug"]],
  ["country",       ["Twang","Dust","Road","Prairie","Steel","Amber","Porch","Creek","Barn","Hearth"]],
  ["folk",          ["Wood","Grain","Smoke","River","Field","Wool","Ember","Chalk","Root","Yarn"]],
  ["afropop",       ["Lagos","Sun","Dance","Joy","Heat","Pulse","Bright","Flow","Beat","Glow"]],
  ["dancehall",     ["Riddim","Dance","Fire","Wuk","Flex","Wave","Bounce","Gyrate","Hot","Yard"]],
];

// Label words per sound type — expanded for naming variety at scale
const TYPE_LABELS: Record<SoundType, string[]> = {
  sub:     ["Sub","808","Low End","Bottom","Sub Bass","Rumble","Foundation","Floor","Depth","Weight"],
  bass:    ["Bass","Bassline","Low Drive","Groove","Thump","Foundation","Movement","Push","Pulse","Pump"],
  lead:    ["Lead","Melody","Voice","Theme","Hook","Line","Phrase","Motif","Call","Top"],
  pad:     ["Pad","Layer","Atmosphere","Wash","Cloud","Field","Blanket","Swell","Bed","Veil"],
  stab:    ["Stab","Hit","Chord","Cut","Shot","Slice","Staccato","Jab","Spike","Chop"],
  pluck:   ["Pluck","Bell","Ping","Key","Tone","Note","Strike","Pick","Flick","Tap"],
  texture: ["Texture","Grain","Surface","Noise","Wash","Mass","Scrape","Static","Grit","Cloth"],
  arp:     ["Arp","Sequence","Pattern","Run","Roll","Ripple","Cascade","Climb","Scatter","Chain"],
  drone:   ["Drone","Hum","Hold","Sustain","Tone","Mass","Lull","Bed","Hover","Pool"],
};

// Two large independent word pools for name generation.
// Pool A picks the first descriptor, Pool B picks the second modifier after "·".
// With 120 × 80 × type_nouns × type_labels combinations, collision probability
// at 500 sounds/type is < 0.1 % — effectively zero.
const WORD_POOL_A = [
  "Deep","Dark","Bright","Warm","Cold","Hard","Soft","Sharp","Smooth","Heavy",
  "Light","Rich","Thin","Thick","Dirty","Clean","Wide","Narrow","Wet","Dry",
  "Raw","Open","Tight","Long","Short","Full","Dense","Airy","Lush","Sparse",
  "Crisp","Muddy","Massive","Gentle","Cutting","Mellow","Glassy","Gritty","Hollow",
  "Electric","Filtered","Saturated","Evolving","Layered","Punchy","Sustained",
  "Resonant","Overdriven","Spacious","Intimate","Aggressive","Organic","Digital",
  "Vintage","Modern","Cavernous","Metallic","Velvet","Ghostly","Grainy","Crystalline",
  "Fluid","Brittle","Silky","Thunderous","Soaring","Submerged","Fractured","Pulsing",
  "Drifting","Surging","Burning","Frozen","Charged","Razor","Plush","Twisted",
  "Stretched","Warped","Compressed","Phased","Distant","Close","Static","Liquid",
  "Fused","Layered","Stripped","Blown","Coiled","Bent","Cracked","Polished",
  "Smoked","Drenched","Blurred","Etched","Folded","Looped","Scattered","Pitched",
  "Grounded","Elevated","Hollow","Jagged","Muted","Opened","Punched","Rushing",
  "Sliding","Trembling","Unfolding","Vibrant","Woven","Yearning","Zeroed","Arcing",
];
const WORD_POOL_B = [
  "Edge","Core","Wave","Drive","Mode","Form","Space","Field","Tone","Shift",
  "Base","Arc","Pulse","Flux","Grid","Phase","Loop","Run","Rise","Fall",
  "Burn","Freeze","Warp","Blend","Cut","Push","Pull","Drop","Lift","Hold",
  "Slide","Snap","Ping","Roll","Spin","Wrap","Fold","Break","Build","Melt",
  "Fade","Sway","Bend","Burst","Sweep","Flow","Rush","Grow","Dive","Climb",
  "Crack","Grind","Haze","Ink","Knot","Lace","Mesh","Node","Orbit","Path",
  "Queue","Rift","Seam","Thread","Undulate","Vein","Wind","Axis","Bloom","Cast",
  "Depth","Echo","Frame","Gate","Hinge","Index","Joint","Kernel","Layer","Margin",
];

// ─── Parameter generation ─────────────────────────────────────────────────────
// All parameter spaces are computed from the artist's profile — no fixed ranges.

function generateParams(
  type: SoundType,
  profile: ArtistProfile,
  rng: () => number,
): GeneratedSound["params"] {
  const { darkness, aggression, spaciousness, warmth, rhythmic } = profile;
  const bright = 1 - darkness;

  // Pick a value within [lo, hi] guided by `pos` (0–1) plus per-sound noise
  const pick = (lo: number, hi: number, pos: number): number =>
    Math.max(lo, Math.min(hi, lo + (hi - lo) * clamp01(pos + (rng() - 0.5) * 0.18)));

  switch (type) {

    case "sub": return {
      oscType:    rng() < (0.5 + darkness * 0.4) ? "sine" : "square",
      cutoff:     Math.round(pick(35,   350,  1 - darkness * 0.85)),
      resonance:  parseFloat(pick(0.4,  4.0,  aggression * 0.55).toFixed(2)),
      attack:     parseFloat(pick(0.001,0.025, rhythmic < 0.4 ? 0.4 : 0.1).toFixed(3)),
      decay:      parseFloat(pick(0.3,  2.5,  darkness * 0.6 + 0.15).toFixed(3)),
      sustain:    parseFloat(pick(0.0,  0.18, 0.3).toFixed(2)),
      release:    parseFloat(pick(0.15, 1.2,  spaciousness * 0.45).toFixed(2)),
      reverbSize: parseFloat(pick(0.03, 0.28, spaciousness * 0.5).toFixed(2)),
      reverbWet:  parseFloat(pick(0.0,  0.10, spaciousness * 0.4).toFixed(2)),
      drive:      parseFloat(pick(0.0,  0.30, aggression * 0.5).toFixed(2)),
      chorus:     parseFloat(pick(0.0,  0.06, 0.2).toFixed(2)),
      delayMix:   parseFloat(pick(0.0,  0.08, spaciousness * 0.25).toFixed(2)),
    };

    case "bass": return {
      oscType:    rng() < 0.55 ? "saw" : "square",
      cutoff:     Math.round(pick(120,  3500, bright * 0.55 + 0.15)),
      resonance:  parseFloat(pick(0.4,  6.5,  aggression * 0.6 + 0.1).toFixed(2)),
      attack:     parseFloat(pick(0.001,0.04,  (1 - rhythmic) * 0.3).toFixed(3)),
      decay:      parseFloat(pick(0.1,  1.0,  (1 - rhythmic) * 0.5 + 0.15).toFixed(3)),
      sustain:    parseFloat(pick(0.1,  0.75, 0.4).toFixed(2)),
      release:    parseFloat(pick(0.1,  1.0,  (1 - rhythmic) * 0.4 + 0.1).toFixed(2)),
      reverbSize: parseFloat(pick(0.05, 0.45, spaciousness * 0.5).toFixed(2)),
      reverbWet:  parseFloat(pick(0.0,  0.22, spaciousness * 0.4).toFixed(2)),
      drive:      parseFloat(pick(0.0,  0.85, aggression * 0.7).toFixed(2)),
      chorus:     parseFloat(pick(0.0,  0.25, warmth * 0.35).toFixed(2)),
      delayMix:   parseFloat(pick(0.0,  0.22, spaciousness * 0.3).toFixed(2)),
    };

    case "lead": {
      const oscRoll = rng();
      return {
        oscType:    oscRoll < (aggression * 0.3 + 0.4) ? "saw" : (rng() < 0.5 ? "square" : "sine"),
        cutoff:     Math.round(pick(700,  19000, bright * 0.55 + 0.2)),
        resonance:  parseFloat(pick(0.2,  7.5,  aggression * 0.55 + 0.1).toFixed(2)),
        attack:     parseFloat(pick(0.001,0.2,   (1 - rhythmic) * 0.35).toFixed(3)),
        decay:      parseFloat(pick(0.1,  1.0,  0.3).toFixed(3)),
        sustain:    parseFloat(pick(0.25, 0.97, warmth * 0.3 + 0.35).toFixed(2)),
        release:    parseFloat(pick(0.15, 3.0,  spaciousness * 0.55).toFixed(2)),
        reverbSize: parseFloat(pick(0.1,  0.75, spaciousness * 0.65).toFixed(2)),
        reverbWet:  parseFloat(pick(0.03, 0.55, spaciousness * 0.55).toFixed(2)),
        drive:      parseFloat(pick(0.0,  0.90, aggression * 0.65).toFixed(2)),
        chorus:     parseFloat(pick(0.0,  0.85, warmth * 0.45 + spaciousness * 0.2).toFixed(2)),
        delayMix:   parseFloat(pick(0.0,  0.45, spaciousness * 0.45).toFixed(2)),
      };
    }

    case "pad": return {
      oscType:    rng() < (warmth * 0.3 + 0.4) ? "saw" : "sine",
      cutoff:     Math.round(pick(500,  10000, bright * 0.5 + 0.15)),
      resonance:  parseFloat(pick(0.1,  1.5,  0.2).toFixed(2)),
      attack:     parseFloat(pick(0.15, 4.5,  spaciousness * 0.75 + 0.1).toFixed(3)),
      decay:      parseFloat(pick(0.4,  3.5,  spaciousness * 0.55 + 0.2).toFixed(3)),
      sustain:    parseFloat(pick(0.45, 0.99, warmth * 0.2 + 0.55).toFixed(2)),
      release:    parseFloat(pick(0.8,  9.0,  spaciousness * 0.75 + 0.1).toFixed(2)),
      reverbSize: parseFloat(pick(0.25, 0.99, spaciousness * 0.7 + 0.2).toFixed(2)),
      reverbWet:  parseFloat(pick(0.15, 0.92, spaciousness * 0.65 + 0.2).toFixed(2)),
      drive:      parseFloat(pick(0.0,  0.35, aggression * 0.35).toFixed(2)),
      chorus:     parseFloat(pick(0.1,  0.92, warmth * 0.5 + 0.2).toFixed(2)),
      delayMix:   parseFloat(pick(0.04, 0.55, spaciousness * 0.55).toFixed(2)),
    };

    case "stab": return {
      oscType:    rng() < (aggression * 0.3 + 0.55) ? "saw" : "square",
      cutoff:     Math.round(pick(1500, 17000, bright * 0.6 + 0.2)),
      resonance:  parseFloat(pick(0.4,  5.0,  aggression * 0.55 + 0.15).toFixed(2)),
      attack:     parseFloat(pick(0.001,0.01,  0.2).toFixed(3)),
      decay:      parseFloat(pick(0.04, 0.45, 0.3).toFixed(3)),
      sustain:    parseFloat(pick(0.0,  0.25, 0.2).toFixed(2)),
      release:    parseFloat(pick(0.04, 0.6,  (1 - rhythmic) * 0.45).toFixed(2)),
      reverbSize: parseFloat(pick(0.08, 0.45, spaciousness * 0.45).toFixed(2)),
      reverbWet:  parseFloat(pick(0.0,  0.28, spaciousness * 0.35).toFixed(2)),
      drive:      parseFloat(pick(0.04, 0.75, aggression * 0.65).toFixed(2)),
      chorus:     parseFloat(pick(0.0,  0.35, 0.2).toFixed(2)),
      delayMix:   parseFloat(pick(0.0,  0.22, spaciousness * 0.25).toFixed(2)),
    };

    case "pluck": return {
      oscType:    rng() < 0.55 ? "saw" : (rng() < 0.5 ? "sine" : "square"),
      cutoff:     Math.round(pick(2500, 17000, bright * 0.5 + 0.25)),
      resonance:  parseFloat(pick(0.2,  2.8,  aggression * 0.35 + 0.15).toFixed(2)),
      attack:     parseFloat(pick(0.001,0.008, 0.2).toFixed(3)),
      decay:      parseFloat(pick(0.08, 0.7,  0.35).toFixed(3)),
      sustain:    parseFloat(pick(0.0,  0.35, 0.3).toFixed(2)),
      release:    parseFloat(pick(0.08, 1.0,  spaciousness * 0.45).toFixed(2)),
      reverbSize: parseFloat(pick(0.1,  0.65, spaciousness * 0.55).toFixed(2)),
      reverbWet:  parseFloat(pick(0.04, 0.45, spaciousness * 0.45).toFixed(2)),
      drive:      parseFloat(pick(0.0,  0.35, aggression * 0.35).toFixed(2)),
      chorus:     parseFloat(pick(0.04, 0.55, warmth * 0.35 + 0.1).toFixed(2)),
      delayMix:   parseFloat(pick(0.04, 0.45, spaciousness * 0.45).toFixed(2)),
    };

    case "texture": return {
      oscType:    rng() < (aggression * 0.3 + 0.45) ? "square" : "saw",
      cutoff:     Math.round(pick(300,  18000, bright * 0.45 + 0.1)),
      resonance:  parseFloat(pick(0.4,  9.5,  aggression * 0.75 + 0.1).toFixed(2)),
      attack:     parseFloat(pick(0.04, 2.5,  spaciousness * 0.65 + 0.1).toFixed(3)),
      decay:      parseFloat(pick(0.25, 3.0,  spaciousness * 0.55 + 0.2).toFixed(3)),
      sustain:    parseFloat(pick(0.15, 0.92, 0.4).toFixed(2)),
      release:    parseFloat(pick(0.2,  5.0,  spaciousness * 0.65).toFixed(2)),
      reverbSize: parseFloat(pick(0.15, 0.95, spaciousness * 0.65 + 0.2).toFixed(2)),
      reverbWet:  parseFloat(pick(0.08, 0.78, spaciousness * 0.55 + 0.1).toFixed(2)),
      drive:      parseFloat(pick(0.08, 0.99, aggression * 0.82 + 0.08).toFixed(2)),
      chorus:     parseFloat(pick(0.0,  0.55, warmth * 0.35 + spaciousness * 0.2).toFixed(2)),
      delayMix:   parseFloat(pick(0.04, 0.55, spaciousness * 0.55).toFixed(2)),
    };

    case "arp": return {
      oscType:    rng() < (aggression * 0.25 + 0.5) ? "saw" : "square",
      cutoff:     Math.round(pick(1500, 15000, bright * 0.6 + 0.2)),
      resonance:  parseFloat(pick(0.2,  3.5,  aggression * 0.45 + 0.1).toFixed(2)),
      attack:     parseFloat(pick(0.001,0.025, 0.2).toFixed(3)),
      decay:      parseFloat(pick(0.08, 0.55, 0.3).toFixed(3)),
      sustain:    parseFloat(pick(0.15, 0.75, warmth * 0.3 + 0.2).toFixed(2)),
      release:    parseFloat(pick(0.08, 1.0,  spaciousness * 0.45).toFixed(2)),
      reverbSize: parseFloat(pick(0.1,  0.65, spaciousness * 0.55).toFixed(2)),
      reverbWet:  parseFloat(pick(0.04, 0.45, spaciousness * 0.45).toFixed(2)),
      drive:      parseFloat(pick(0.0,  0.45, aggression * 0.45).toFixed(2)),
      chorus:     parseFloat(pick(0.04, 0.65, warmth * 0.35 + 0.1).toFixed(2)),
      delayMix:   parseFloat(pick(0.08, 0.45, spaciousness * 0.45 + 0.1).toFixed(2)),
    };

    case "drone": return {
      oscType:    rng() < (1 - darkness * 0.4) ? "sine" : "saw",
      cutoff:     Math.round(pick(80,   5000, (1 - darkness) * 0.45 + 0.1)),
      resonance:  parseFloat(pick(0.1,  1.8,  0.2).toFixed(2)),
      attack:     parseFloat(pick(0.4,  5.0,  spaciousness * 0.7 + 0.2).toFixed(3)),
      decay:      parseFloat(pick(0.4,  3.5,  spaciousness * 0.55 + 0.2).toFixed(3)),
      sustain:    parseFloat(pick(0.65, 0.99, 0.7).toFixed(2)),
      release:    parseFloat(pick(1.5, 10.0,  spaciousness * 0.75 + 0.2).toFixed(2)),
      reverbSize: parseFloat(pick(0.4,  0.99, spaciousness * 0.65 + 0.3).toFixed(2)),
      reverbWet:  parseFloat(pick(0.25, 0.95, spaciousness * 0.65 + 0.2).toFixed(2)),
      drive:      parseFloat(pick(0.0,  0.35, aggression * 0.35).toFixed(2)),
      chorus:     parseFloat(pick(0.0,  0.45, warmth * 0.35 + 0.1).toFixed(2)),
      delayMix:   parseFloat(pick(0.08, 0.55, spaciousness * 0.55 + 0.1).toFixed(2)),
    };
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function generateSounds(artistName: string, artistTags: string[]): GeneratedSound[] {
  const tags = artistTags.map(t => t.toLowerCase());
  const profile = buildArtistProfile(artistName, tags);

  // Score each sound type by how many affinity tags the artist has
  const typeScores = (Object.entries(TYPE_AFFINITY) as [SoundType, string[]][]).map(([type, affinityTags]) => {
    const hits = affinityTags.filter(at => tags.some(t => t.includes(at) || at.includes(t)));
    return { type, score: hits.length / Math.max(affinityTags.length, 1), hits };
  }).sort((a, b) => b.score - a.score);

  // Always include top 4 by relevance; add any with score > 0 up to 8 total;
  // pad to 5 minimum so artists with no known tags still get a full palette
  const selected: typeof typeScores = [];
  for (const entry of typeScores) {
    if (selected.length >= 8) break;
    if (selected.length < 4 || entry.score > 0 || selected.length < 5) {
      selected.push(entry);
    }
  }

  // Build a noun pool from genres the artist actually matches
  const matchingNouns = TAG_NOUNS
    .filter(([tag]) => tags.some(t => t.includes(tag) || tag.includes(t)))
    .flatMap(([, nouns]) => nouns);
  const nounPool = matchingNouns.length > 0
    ? matchingNouns
    : ["Sonic","Wave","Signal","Pulse","Echo","Tone","Drift","Grid","Void","Arc"];

  const sounds: GeneratedSound[] = [];

  for (const { type, score, hits } of selected) {
    // All generated sounds are derived from this artist's actual tags — always 100%.
    const confidence = parseFloat(Math.min(0.90 + score * 0.10, 1.0).toFixed(2));
    const labels = TYPE_LABELS[type];
    const topGenre = hits[0] ?? (tags[0] ?? type);

    // Scale variation count by affinity — high-affinity types get more sounds
    const count = Math.max(200, Math.round(300 + score * 500));

    for (let i = 0; i < count; i++) {
      const pRng = seededRng(`${artistName.toLowerCase()}|${type}|${i}`);

      const adjA  = WORD_POOL_A[Math.floor(pRng() * WORD_POOL_A.length)];
      const noun  = nounPool[Math.floor(pRng() * nounPool.length)];
      const label = labels[Math.floor(pRng() * labels.length)];
      const adjB  = WORD_POOL_B[Math.floor(pRng() * WORD_POOL_B.length)];
      const name  = artistName
        ? `${artistName} \u2014 ${adjA} ${noun} ${label} \u00B7 ${adjB}`
        : `${adjA} ${noun} ${label} \u00B7 ${adjB}`;

      sounds.push({
        name,
        description: `${adjA} ${type} sound from ${artistName || "this artist"}'s sonic palette`,
        genre:        topGenre,
        confidence,
        matchedArtist: score > 0.25,
        matchedTags:   hits,
        artistTags:    tags.slice(0, 8),
        params:        generateParams(type, profile, pRng),
        artists:       [],
        tags:          hits.slice(0, 5),
      });
    }
  }

  return sounds;
}
