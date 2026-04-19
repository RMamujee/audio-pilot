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
  // ── Hip-hop / Rap ──────────────────────────────────────────────────────────
  ["trap",              0.25,  0.15, -0.15, -0.05,  0.35],
  ["drill",             0.35,  0.35, -0.25, -0.15,  0.40],
  ["grime",             0.25,  0.35, -0.15, -0.05,  0.35],
  ["phonk",             0.45,  0.25,  0.05, -0.15,  0.25],
  ["memphis",           0.40,  0.20,  0.00, -0.10,  0.25],
  ["dark trap",         0.45,  0.25, -0.05, -0.15,  0.35],
  ["cloud rap",         0.15,  0.00,  0.35,  0.10,  0.05],
  ["plugg",             0.05,  0.00,  0.25,  0.15,  0.15],
  ["rage",              0.20,  0.25,  0.10, -0.05,  0.20],
  ["melodic rap",       0.00,  0.00,  0.15,  0.20,  0.15],
  ["emo rap",           0.15,  0.10,  0.15,  0.05,  0.15],
  ["boom bap",         -0.05,  0.05,  0.05,  0.35,  0.20],
  ["east coast",       -0.05,  0.10,  0.00,  0.30,  0.20],
  ["west coast",       -0.05,  0.05,  0.05,  0.25,  0.20],
  ["golden age",       -0.10,  0.05,  0.05,  0.35,  0.20],
  ["conscious",        -0.05,  0.00,  0.05,  0.30,  0.15],
  ["gangsta",           0.20,  0.25, -0.10,  0.00,  0.30],
  ["crunk",             0.20,  0.35, -0.15, -0.05,  0.40],
  ["bounce",            0.00,  0.15, -0.10,  0.05,  0.45],
  ["jersey club",       0.00,  0.20, -0.05, -0.05,  0.55],
  ["hip-hop",           0.05,  0.10,  0.00,  0.20,  0.25],
  ["hip hop",           0.05,  0.10,  0.00,  0.20,  0.25],
  ["rap",               0.05,  0.15,  0.00,  0.10,  0.25],
  // ── Electronic / Techno / House ────────────────────────────────────────────
  ["techno",            0.15,  0.15, -0.05, -0.25,  0.45],
  ["minimal techno",    0.10,  0.10,  0.05, -0.30,  0.40],
  ["hard techno",       0.25,  0.40, -0.15, -0.35,  0.50],
  ["berlin",            0.20,  0.15,  0.05, -0.20,  0.40],
  ["industrial techno", 0.35,  0.40,  0.00, -0.35,  0.40],
  ["house",            -0.05,  0.00,  0.05,  0.10,  0.45],
  ["deep house",       -0.10, -0.05,  0.15,  0.15,  0.40],
  ["chicago house",    -0.05,  0.00,  0.05,  0.20,  0.45],
  ["acid house",        0.05,  0.20,  0.00, -0.10,  0.40],
  ["acid",              0.05,  0.25,  0.00, -0.15,  0.35],
  ["acid techno",       0.10,  0.30, -0.05, -0.20,  0.40],
  ["trance",           -0.05,  0.00,  0.25, -0.05,  0.35],
  ["progressive trance",0.00,  0.00,  0.30, -0.05,  0.35],
  ["psytrance",         0.10,  0.10,  0.15, -0.15,  0.40],
  ["hard trance",       0.10,  0.25,  0.05, -0.20,  0.45],
  ["dubstep",           0.15,  0.35, -0.05, -0.15,  0.35],
  ["brostep",           0.15,  0.40, -0.10, -0.20,  0.35],
  ["drum and bass",     0.05,  0.25, -0.05, -0.15,  0.50],
  ["dnb",               0.05,  0.25, -0.05, -0.15,  0.50],
  ["neurofunk",         0.15,  0.30, -0.05, -0.20,  0.50],
  ["liquid dnb",       -0.05,  0.05,  0.15,  0.10,  0.45],
  ["jungle",            0.05,  0.15, -0.05, -0.05,  0.45],
  ["breakbeat",         0.05,  0.15, -0.05, -0.05,  0.45],
  ["breaks",            0.00,  0.10,  0.00,  0.00,  0.40],
  ["big beat",          0.05,  0.20, -0.05, -0.05,  0.45],
  ["idm",               0.00,  0.05,  0.20, -0.05, -0.05],
  ["braindance",        0.00,  0.10,  0.20, -0.05,  0.00],
  ["experimental",      0.05,  0.00,  0.25,  0.00, -0.10],
  ["glitch",            0.05,  0.15,  0.10, -0.15,  0.05],
  ["electronica",       0.00,  0.00,  0.15, -0.05,  0.10],
  ["electronic",        0.00,  0.00,  0.05, -0.05,  0.10],
  ["electro",           0.05,  0.10,  0.00, -0.10,  0.30],
  ["edm",              -0.10,  0.05,  0.05, -0.05,  0.35],
  ["big room",         -0.05,  0.10,  0.10, -0.10,  0.40],
  ["future bass",      -0.05,  0.00,  0.15,  0.05,  0.25],
  ["wave",              0.15,  0.00,  0.25,  0.05,  0.10],
  ["uk garage",         0.00,  0.05,  0.05,  0.05,  0.40],
  ["2-step",            0.00,  0.05,  0.05,  0.05,  0.40],
  ["uk bass",           0.05,  0.10,  0.05,  0.00,  0.35],
  ["post-dubstep",      0.05,  0.00,  0.20,  0.05,  0.15],
  ["footwork",          0.00,  0.15, -0.05, -0.05,  0.55],
  ["juke",              0.00,  0.15, -0.05, -0.05,  0.55],
  ["gabber",            0.15,  0.55, -0.15, -0.35,  0.50],
  ["hardcore",          0.25,  0.55, -0.05, -0.35,  0.40],
  ["hardstyle",         0.05,  0.45, -0.05, -0.25,  0.45],
  ["frenchcore",        0.15,  0.50, -0.15, -0.30,  0.50],
  ["ambient",          -0.05, -0.25,  0.55,  0.10, -0.40],
  ["dark ambient",      0.55, -0.10,  0.50, -0.05, -0.35],
  ["drone",             0.15, -0.20,  0.60,  0.00, -0.50],
  ["noise",             0.25,  0.45,  0.05, -0.35,  0.00],
  ["industrial",        0.35,  0.45,  0.00, -0.35,  0.10],
  ["power electronics", 0.40,  0.55,  0.00, -0.45,  0.05],
  ["darksynth",         0.55,  0.45,  0.00, -0.35,  0.20],
  ["synthwave",         0.00,  0.00,  0.20,  0.00,  0.20],
  ["outrun",            0.00,  0.00,  0.15,  0.00,  0.25],
  ["retrowave",         0.00,  0.00,  0.20,  0.05,  0.20],
  ["vaporwave",        -0.15, -0.20,  0.50,  0.10, -0.25],
  ["future funk",      -0.10,  0.00,  0.15,  0.25,  0.35],
  ["chillwave",        -0.15, -0.30,  0.40,  0.20, -0.15],
  ["lo-fi",            -0.05, -0.20,  0.20,  0.40,  0.00],
  ["lofi",             -0.05, -0.20,  0.20,  0.40,  0.00],
  ["chillhop",         -0.05, -0.20,  0.20,  0.35,  0.05],
  ["trip-hop",          0.15, -0.10,  0.40,  0.20, -0.05],
  ["downtempo",         0.10, -0.15,  0.35,  0.15, -0.15],
  ["hauntology",        0.10, -0.15,  0.45,  0.10, -0.20],
  ["hyperpop",          0.00,  0.15,  0.00, -0.05,  0.20],
  ["digicore",          0.00,  0.10,  0.05, -0.05,  0.20],
  ["bubblegum bass",   -0.10,  0.10,  0.05, -0.05,  0.25],
  ["pc music",         -0.15,  0.05,  0.00, -0.05,  0.25],
  // ── R&B / Soul / Jazz ──────────────────────────────────────────────────────
  ["r&b",              -0.10, -0.20,  0.10,  0.45,  0.10],
  ["rnb",              -0.10, -0.20,  0.10,  0.45,  0.10],
  ["soul",             -0.15, -0.25,  0.10,  0.55,  0.10],
  ["neo-soul",         -0.15, -0.25,  0.20,  0.55,  0.05],
  ["gospel",           -0.25, -0.20,  0.10,  0.55,  0.10],
  ["funk",             -0.05,  0.00,  0.00,  0.40,  0.40],
  ["jazz",             -0.15, -0.20,  0.20,  0.55,  0.00],
  ["jazz rap",         -0.05,  0.05,  0.10,  0.40,  0.15],
  ["blues",            -0.10, -0.10,  0.05,  0.45,  0.10],
  ["smooth",           -0.15, -0.20,  0.10,  0.35,  0.05],
  ["quiet storm",      -0.15, -0.25,  0.15,  0.40,  0.00],
  // ── Rock / Guitar ──────────────────────────────────────────────────────────
  ["rock",              0.05,  0.20,  0.00,  0.00,  0.30],
  ["alternative",       0.05,  0.10,  0.05,  0.05,  0.20],
  ["indie",             0.00,  0.00,  0.10,  0.10,  0.15],
  ["indie rock",        0.00,  0.10,  0.05,  0.10,  0.20],
  ["metal",             0.35,  0.55,  0.00, -0.35,  0.25],
  ["death metal",       0.45,  0.60, -0.05, -0.45,  0.30],
  ["black metal",       0.50,  0.45,  0.10, -0.40,  0.20],
  ["doom metal",        0.45,  0.20,  0.20, -0.30,  0.00],
  ["sludge",            0.40,  0.30,  0.15, -0.25,  0.05],
  ["stoner",            0.20,  0.10,  0.30, -0.10, -0.10],
  ["thrash",            0.30,  0.55, -0.10, -0.35,  0.40],
  ["metalcore",         0.30,  0.55, -0.05, -0.30,  0.35],
  ["djent",             0.25,  0.40,  0.05, -0.25,  0.30],
  ["punk",              0.05,  0.45, -0.05, -0.05,  0.35],
  ["post-punk",         0.15,  0.25,  0.15,  0.00,  0.20],
  ["new wave",          0.00,  0.05,  0.10,  0.00,  0.25],
  ["grunge",            0.15,  0.30,  0.05, -0.10,  0.25],
  ["britpop",          -0.05,  0.10,  0.05,  0.10,  0.25],
  ["emo",               0.15,  0.15,  0.10,  0.00,  0.20],
  ["post-rock",        -0.05,  0.00,  0.45,  0.10, -0.10],
  ["shoegaze",         -0.05,  0.00,  0.55,  0.10, -0.20],
  ["dream pop",        -0.15, -0.20,  0.50,  0.20, -0.15],
  ["noise rock",        0.20,  0.35,  0.15, -0.15,  0.20],
  ["art rock",          0.05,  0.05,  0.20,  0.10,  0.10],
  // ── Pop / Mainstream ───────────────────────────────────────────────────────
  ["pop",              -0.25, -0.10,  0.00,  0.10,  0.20],
  ["synth-pop",        -0.10,  0.00,  0.10,  0.00,  0.30],
  ["electropop",       -0.10,  0.00,  0.05, -0.05,  0.30],
  ["dance-pop",        -0.15,  0.00,  0.00,  0.05,  0.40],
  ["art pop",          -0.05, -0.05,  0.15,  0.10,  0.10],
  ["indie pop",        -0.10, -0.05,  0.10,  0.15,  0.15],
  ["chamber pop",      -0.20, -0.15,  0.15,  0.25, -0.05],
  ["k-pop",            -0.25, -0.10,  0.10,  0.00,  0.40],
  ["j-pop",            -0.20, -0.05,  0.10,  0.05,  0.35],
  ["singer-songwriter",-0.15, -0.20,  0.10,  0.25, -0.10],
  ["ballad",           -0.10, -0.20,  0.15,  0.25, -0.20],
  // ── Ambient / Atmospheric / Cinematic ─────────────────────────────────────
  ["neoclassical",     -0.25, -0.30,  0.40,  0.40, -0.30],
  ["new age",          -0.35, -0.45,  0.65,  0.40, -0.40],
  ["meditation",       -0.40, -0.45,  0.65,  0.40, -0.45],
  ["healing",          -0.40, -0.40,  0.55,  0.45, -0.40],
  ["cinematic",         0.05, -0.05,  0.40,  0.10, -0.15],
  ["film score",        0.05, -0.05,  0.40,  0.15, -0.15],
  ["ethereal",         -0.15, -0.20,  0.55,  0.15, -0.30],
  ["atmospheric",       0.05, -0.10,  0.45,  0.05, -0.20],
  // ── World / Latin / Other ──────────────────────────────────────────────────
  ["afrobeats",        -0.10,  0.00,  0.00,  0.25,  0.50],
  ["afropop",          -0.10,  0.00,  0.00,  0.25,  0.45],
  ["amapiano",         -0.05,  0.00,  0.05,  0.20,  0.45],
  ["afroswing",        -0.05,  0.05,  0.05,  0.20,  0.40],
  ["reggae",           -0.10, -0.15,  0.20,  0.30,  0.20],
  ["dub",              -0.05, -0.15,  0.40,  0.20,  0.15],
  ["dancehall",         0.00,  0.05,  0.00,  0.15,  0.40],
  ["country",          -0.15, -0.10,  0.05,  0.40,  0.20],
  ["folk",             -0.15, -0.15,  0.10,  0.40, -0.10],
  ["country rap",       0.10,  0.10,  0.00,  0.25,  0.25],
  ["latin",            -0.05,  0.05,  0.00,  0.20,  0.40],
  ["reggaeton",         0.00,  0.10, -0.05,  0.10,  0.45],
  ["latin trap",        0.20,  0.15, -0.10,  0.05,  0.40],
  ["salsa",            -0.05,  0.05,  0.00,  0.25,  0.50],
  ["cumbia",           -0.05,  0.00,  0.05,  0.25,  0.45],
  ["baile funk",        0.05,  0.15, -0.10,  0.05,  0.55],
  // ── Descriptors common in Last.fm tags ────────────────────────────────────
  ["dark",              0.35,  0.10,  0.05, -0.10,  0.00],
  ["heavy",             0.25,  0.30,  0.00, -0.20,  0.15],
  ["aggressive",        0.20,  0.45, -0.10, -0.15,  0.25],
  ["melancholic",       0.20, -0.15,  0.20,  0.10, -0.10],
  ["sad",               0.15, -0.15,  0.15,  0.10, -0.10],
  ["emotional",         0.10, -0.10,  0.15,  0.15, -0.05],
  ["mellow",           -0.10, -0.20,  0.15,  0.25, -0.10],
  ["chill",            -0.10, -0.25,  0.20,  0.20, -0.15],
  ["relaxing",         -0.15, -0.30,  0.25,  0.25, -0.20],
  ["uplifting",        -0.25, -0.05,  0.10,  0.10,  0.10],
  ["euphoric",         -0.20,  0.05,  0.15,  0.05,  0.20],
  ["energetic",        -0.10,  0.25, -0.05, -0.05,  0.35],
  ["catchy",           -0.15,  0.00,  0.00,  0.10,  0.25],
  ["romantic",         -0.15, -0.20,  0.10,  0.35, -0.05],
  ["sensual",          -0.10, -0.15,  0.15,  0.35,  0.05],
  ["psychedelic",       0.10,  0.00,  0.35,  0.05, -0.05],
  ["spiritual",        -0.25, -0.25,  0.40,  0.30, -0.20],
  ["party",            -0.15,  0.10, -0.10,  0.05,  0.45],
  ["club",             -0.05,  0.05, -0.10, -0.05,  0.45],
  ["dance",            -0.10,  0.00,  0.00,  0.05,  0.35],
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

  const noiseAmt = matches > 3 ? 0.06 : matches > 0 ? 0.14 : 0.0;
  const toAxis = (delta: number): number => {
    if (matches === 0) return nameRng();
    const scale = Math.max(matches, 2);
    return clamp01(0.5 + delta / scale + (nameRng() - 0.5) * noiseAmt * 2);
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
// No hardcoded templates. Sound types, vocabulary, and parameter spaces all
// emerge from the artist's actual tags and the five profile axes above.

type SoundType = "sub" | "bass" | "lead" | "pad" | "stab" | "pluck" | "texture" | "arp" | "drone";

// Which tags make each sound type part of an artist's palette
const TYPE_AFFINITY: Record<SoundType, string[]> = {
  sub:     ["trap","808","hip-hop","rap","drill","phonk","grime","uk bass","dubstep","dnb","drum and bass","jungle","dub","bass music","bass","uk garage","dembow"],
  bass:    ["bass","house","techno","acid","funk","disco","electronic","dance","electro","deep house","minimal techno","dnb","dubstep","jungle","afrobeats","reggaeton","uk garage","breakbeat","chicago house"],
  lead:    ["house","techno","trance","synthwave","synth-pop","pop","r&b","soul","trap","acid","edm","electropop","k-pop","metal","rock","indie","melodic","idm","dubstep","darksynth","new wave","retrowave"],
  pad:     ["ambient","atmospheric","cinematic","shoegaze","dream pop","dark ambient","vaporwave","chillwave","trip-hop","lo-fi","lofi","ethereal","post-rock","hauntology","synthwave","neoclassical","new age","drone","spiritual","film score"],
  stab:    ["house","techno","jungle","dnb","drum and bass","rave","acid","uk garage","funk","disco","chicago house","breakbeat","electro","latin","afrobeats","trance"],
  pluck:   ["trap","hip-hop","melodic trap","plugg","cloud rap","pop","electropop","k-pop","synth-pop","idm","funk","r&b","indie","bedroom pop","afrobeats","amapiano"],
  texture: ["ambient","experimental","idm","noise","industrial","glitch","power electronics","dark ambient","hauntology","drone","psychedelic","shoegaze","post-rock","abstract","braindance"],
  arp:     ["synth-pop","trance","idm","electronic","synthwave","techno","electropop","new wave","acid","braindance","progressive trance","k-pop","j-pop","retrowave"],
  drone:   ["ambient","dark ambient","drone","experimental","industrial","post-rock","doom metal","meditation","new age","noise","shoegaze","black metal","dark","atmospheric"],
};

// Genre-context nouns — pulled from artist's matching tags to name their sounds
const TAG_NOUNS: [string, string[]][] = [
  ["trap",          ["808","Trap","Astro","Dark","Wave","Rage","Tunnel","Void","Slide","Echo"]],
  ["drill",         ["Drill","Steel","Pressure","Block","Cold","Concrete","Road"]],
  ["phonk",         ["Phonk","Memphis","Casket","Neon","Chrome","Hollow","Drift"]],
  ["grime",         ["Road","East","Grime","Static","Concrete","Pressure","Block"]],
  ["hip-hop",       ["Boom","Gold","Raw","Classic","Grimy","Hip Hop","Street"]],
  ["boom bap",      ["Boom","Gold","Classic","East","Raw","Crate","Break"]],
  ["r&b",           ["Velvet","Silk","Midnight","Satin","Warm","Moody","Late"]],
  ["soul",          ["Soul","Gospel","Deep","Rich","Spirit","Church","Gold"]],
  ["jazz",          ["Jazz","Blue","Mellow","Club","Late Night","Smoky","Chord"]],
  ["neo-soul",      ["Velvet","Warm","Rich","Deep","Smooth","Night","Haze"]],
  ["funk",          ["Funk","Groove","Slap","Bounce","Electric","Dirty","Pocket"]],
  ["house",         ["House","Club","Chicago","Floor","Deep","Groove","Pump"]],
  ["techno",        ["Techno","Berlin","Grid","Machine","Circuit","Industrial","Drive"]],
  ["acid",          ["Acid","303","Squelch","Resonant","Hypnotic","Raw","Twist"]],
  ["trance",        ["Trance","Euphoric","Lift","Sky","Rave","Peak","Rise"]],
  ["dubstep",       ["Wobble","Filth","Drop","Bass","Heavy","Dub","Rupture"]],
  ["dnb",           ["Neuro","Liquid","Break","Rush","Step","Speed","Grid"]],
  ["drum and bass", ["Neuro","Liquid","Break","Rush","Step","Speed","Amen"]],
  ["idm",           ["Brain","Glitch","Circuit","Algo","Neural","Abstract","Loop"]],
  ["experimental",  ["Glitch","Abstract","Chaos","Morph","Fractal","Void","Error"]],
  ["ambient",       ["Drift","Float","Ether","Void","Cloud","Space","Mist"]],
  ["dark ambient",  ["Shadow","Abyss","Void","Dusk","Obsidian","Cold","Rot"]],
  ["vaporwave",     ["Vapor","Neon","Retro","Aesthetic","Mall","Dream","Freeze"]],
  ["synthwave",     ["Neon","Retro","Outrun","Chrome","Night","80s","Sunset"]],
  ["retrowave",     ["Neon","Outrun","Chrome","Night","Retro","Sunset","Drive"]],
  ["shoegaze",      ["Blur","Haze","Wave","Dream","Noise","Wall","Gaze"]],
  ["metal",         ["Sear","Grind","Riff","Blade","Fury","Iron","Rust"]],
  ["industrial",    ["Machine","Steel","Grind","Rust","Factory","Bolt","Oxide"]],
  ["post-rock",     ["Signal","Swell","Rise","Echo","Wave","Space","Crest"]],
  ["afrobeats",     ["Afro","Lagos","Dance","Heat","Groove","Rhythm","High Life"]],
  ["amapiano",      ["Log","Jozi","Gqom","Step","Flow","Cape","Piano"]],
  ["reggae",        ["Roots","Dub","Island","Skank","Dread","Bass","Yard"]],
  ["pop",           ["Pop","Bright","Crystal","Fresh","Pure","Candy","Sugar"]],
  ["k-pop",         ["Bright","Pixel","Idol","Clean","Hyper","K","Neon"]],
  ["indie",         ["Lo","Haze","Bedroom","Tape","Warm","Indie","Wires"]],
  ["trip-hop",      ["Shadow","Heavy","Smoke","Trip","Low","Fog","Grey"]],
  ["lo-fi",         ["Tape","Dust","Vintage","Warm","Mellow","Lo","Static"]],
  ["darksynth",     ["Shadow","Cyber","Blade","Dark","Neon","Machine","Vector"]],
  ["chillwave",     ["Wave","Chill","Haze","Drift","Soft","Pastel","Glow"]],
  ["new age",       ["Light","Peace","Heal","Glow","Pure","Serenity","Lotus"]],
  ["drone",         ["Hum","Sustain","Void","Static","Hold","Deep","Field"]],
  ["emo",           ["Bleed","Echo","Rain","Gray","Hollow","Fade","Scar"]],
  ["punk",          ["Fury","Raw","Crash","Riot","Burn","Edge","Spike"]],
  ["latin",         ["Caliente","Ritmo","Noche","Fuego","Groove","Sol","Clave"]],
  ["reggaeton",     ["Perreo","Dembow","Noche","Calor","Ritmo","Bass","Flow"]],
  ["psychedelic",   ["Trip","Prism","Spiral","Haze","Phase","Drift","Warp"]],
];

// Label words per sound type
const TYPE_LABELS: Record<SoundType, string[]> = {
  sub:     ["Sub","808","Low End","Bottom","Sub Bass","Rumble"],
  bass:    ["Bass","Bassline","Foundation","Low Drive","Groove","Thump"],
  lead:    ["Lead","Melody","Voice","Theme","Hook","Line"],
  pad:     ["Pad","Layer","Atmosphere","Wash","Cloud","Field"],
  stab:    ["Stab","Hit","Chord","Cut","Shot","Slice"],
  pluck:   ["Pluck","Bell","Ping","Key","Tone","Note"],
  texture: ["Texture","Grain","Surface","Noise","Wash","Mass"],
  arp:     ["Arp","Sequence","Pattern","Run","Roll","Ripple"],
  drone:   ["Drone","Hum","Hold","Sustain","Tone","Mass"],
};

// 50 variation seeds — each produces a distinct parameter set via the seeded RNG
const VARIATION_SEEDS = [
  "Warm","Cold","Bright","Dark","Deep","Sharp","Soft","Hard",
  "Thick","Thin","Wet","Dry","Lush","Sparse","Smooth","Rough",
  "Punchy","Long","Short","Tight","Open","Closed","Heavy","Light",
  "Dirty","Clean","Wide","Narrow","High","Low","Full","Empty",
  "Rich","Subtle","Massive","Gentle","Cutting","Mellow","Airy","Dense",
  "Crisp","Muddy","Raw","Polished","Distant","Close","Spacious","Intimate",
  "Evolving","Static",
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
    const confidence = parseFloat(Math.min(0.35 + score * 0.65, 1.0).toFixed(2));
    const labels = TYPE_LABELS[type];
    const topGenre = hits[0] ?? (tags[0] ?? type);

    for (const varSeed of VARIATION_SEEDS) {
      const pRng = seededRng(`${artistName.toLowerCase()}|${type}|${varSeed}`);

      const noun  = nounPool[Math.floor(pRng() * nounPool.length)];
      const label = labels[Math.floor(pRng() * labels.length)];
      const name  = artistName
        ? `${artistName} \u2014 ${noun} ${label} \u00B7 ${varSeed}`
        : `${noun} ${label} \u00B7 ${varSeed}`;

      sounds.push({
        name,
        description: `${varSeed} ${type} from ${artistName || "this artist"}'s sonic palette`,
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
