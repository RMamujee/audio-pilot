export interface SynthParams {
  cutoff: number;
  resonance: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  reverbSize: number;
  reverbWet: number;
  oscType: "sine" | "saw" | "square";
  drive: number;
  chorus: number;
  delayMix: number;
}

export interface Preset {
  name: string;
  tags: string[];
  artists: string[];
  params: SynthParams;
  description: string;
}

export const PRESETS: Preset[] = [
  {
    name: "Travis Atmospheric Pad",
    tags: ["dark", "atmospheric", "trap", "ambient", "lush", "reverb", "slow", "cinematic", "hazy"],
    artists: ["travis scott", "don toliver", "nav", "young thug"],
    description: "Washed-out saw pad with heavy reverb — quintessential Cactus Jack atmosphere",
    params: { cutoff: 1200, resonance: 0.5, attack: 0.8, decay: 1.0, sustain: 0.8, release: 3.0, reverbSize: 0.95, reverbWet: 0.65, oscType: "saw", drive: 0.1, chorus: 0.4, delayMix: 0.3 },
  },
  {
    name: "Dark Ambient Drone",
    tags: ["dark", "ambient", "drone", "eerie", "cinematic", "cold", "ominous", "atmospheric"],
    artists: ["burial", "tim hecker", "prurient", "bvdlvd"],
    description: "Slow-evolving sine drone with maximum reverb tail",
    params: { cutoff: 600, resonance: 0.4, attack: 1.2, decay: 0.8, sustain: 0.9, release: 2.5, reverbSize: 0.9, reverbWet: 0.7, oscType: "sine", drive: 0.0, chorus: 0.1, delayMix: 0.2 },
  },
  {
    name: "808 Sub Bass",
    tags: ["bass", "808", "trap", "hip-hop", "sub", "punch", "deep", "boomy"],
    artists: ["travis scott", "21 savage", "future", "metro boomin", "southside"],
    description: "Pure sine sub with sharp transient, no reverb",
    params: { cutoff: 200, resonance: 1.2, attack: 0.001, decay: 0.6, sustain: 0.0, release: 0.5, reverbSize: 0.1, reverbWet: 0.05, oscType: "sine", drive: 0.05, chorus: 0.0, delayMix: 0.0 },
  },
  {
    name: "Acid Pluck",
    tags: ["acid", "electronic", "techno", "pluck", "303", "rave", "aggressive", "wet"],
    artists: ["aphex twin", "squarepusher", "dj stingray", "hardware"],
    description: "Classic TB-303 style resonant saw pluck",
    params: { cutoff: 2500, resonance: 4.0, attack: 0.002, decay: 0.3, sustain: 0.1, release: 0.2, reverbSize: 0.2, reverbWet: 0.1, oscType: "saw", drive: 0.3, chorus: 0.0, delayMix: 0.15 },
  },
  {
    name: "Glassy Bell",
    tags: ["bell", "glassy", "ethereal", "bright", "airy", "delicate", "melodic"],
    artists: ["brian eno", "max richter", "nils frahm", "ambient"],
    description: "Sine bell with long shimmer reverb",
    params: { cutoff: 4000, resonance: 0.3, attack: 0.5, decay: 2.0, sustain: 0.4, release: 4.0, reverbSize: 0.8, reverbWet: 0.5, oscType: "sine", drive: 0.0, chorus: 0.2, delayMix: 0.25 },
  },
  {
    name: "Aggressive Distorted Lead",
    tags: ["aggressive", "distorted", "lead", "hard", "industrial", "metal", "harsh", "loud"],
    artists: ["skrillex", "rezz", "nine inch nails", "health"],
    description: "High-resonance square wave with saturation",
    params: { cutoff: 8000, resonance: 3.0, attack: 0.002, decay: 0.1, sustain: 0.9, release: 0.2, reverbSize: 0.3, reverbWet: 0.15, oscType: "square", drive: 0.8, chorus: 0.1, delayMix: 0.1 },
  },
  {
    name: "Lo-Fi Warm Pad",
    tags: ["lofi", "warm", "chill", "pad", "vintage", "dusty", "mellow", "nostalgic", "smooth"],
    artists: ["j dilla", "knxwledge", "sango", "mndsgn"],
    description: "Warm filtered saw with chorus — perfect for lo-fi hip-hop",
    params: { cutoff: 1800, resonance: 0.35, attack: 0.4, decay: 1.2, sustain: 0.7, release: 2.0, reverbSize: 0.6, reverbWet: 0.4, oscType: "saw", drive: 0.15, chorus: 0.6, delayMix: 0.2 },
  },
  {
    name: "Choir Shimmer",
    tags: ["ethereal", "choir", "shimmer", "spiritual", "lush", "angelic", "cinematic", "epic"],
    artists: ["kanye west", "frank ocean", "bon iver", "sufjan stevens"],
    description: "Ultra-slow attack sine with hall reverb — heavenly texture",
    params: { cutoff: 3500, resonance: 0.25, attack: 2.0, decay: 1.5, sustain: 0.85, release: 5.0, reverbSize: 0.99, reverbWet: 0.8, oscType: "sine", drive: 0.0, chorus: 0.5, delayMix: 0.3 },
  },
  {
    name: "Bright Pluck Lead",
    tags: ["bright", "pluck", "lead", "punchy", "clean", "funk", "pop", "upbeat", "melodic"],
    artists: ["daft punk", "justice", "chromeo", "parcels"],
    description: "Crisp saw pluck with minimal reverb",
    params: { cutoff: 6000, resonance: 0.6, attack: 0.005, decay: 0.2, sustain: 0.5, release: 0.3, reverbSize: 0.2, reverbWet: 0.1, oscType: "saw", drive: 0.05, chorus: 0.2, delayMix: 0.05 },
  },
  {
    name: "Deep Techno Bass",
    tags: ["techno", "bass", "deep", "dark", "underground", "industrial", "heavy", "minimal"],
    artists: ["berghain", "blawan", "surgeon", "function"],
    description: "Low square bass with punchy resonance",
    params: { cutoff: 300, resonance: 0.9, attack: 0.01, decay: 0.3, sustain: 0.6, release: 0.4, reverbSize: 0.15, reverbWet: 0.0, oscType: "square", drive: 0.4, chorus: 0.0, delayMix: 0.0 },
  },
  {
    name: "Future Bass Supersaw",
    tags: ["future bass", "edm", "uplifting", "euphoric", "wide", "festival", "energetic", "emotional"],
    artists: ["flume", "rustie", "cashmere cat", "rl grime"],
    description: "Wide detuned saw stack with heavy chorus",
    params: { cutoff: 5000, resonance: 0.7, attack: 0.05, decay: 0.5, sustain: 0.8, release: 1.5, reverbSize: 0.5, reverbWet: 0.35, oscType: "saw", drive: 0.1, chorus: 0.9, delayMix: 0.2 },
  },
  {
    name: "Scary Hours Dark Trap",
    tags: ["dark", "trap", "ominous", "minor", "hard", "drill", "moody", "menacing"],
    artists: ["drake", "dark lo", "sdot go", "a boogie"],
    description: "Dark minor pad — fits menacing trap production",
    params: { cutoff: 900, resonance: 0.6, attack: 0.3, decay: 0.9, sustain: 0.75, release: 2.0, reverbSize: 0.8, reverbWet: 0.55, oscType: "saw", drive: 0.2, chorus: 0.3, delayMix: 0.25 },
  },
  {
    name: "Plugg Ethereal Pad",
    tags: ["emo", "plugg", "ethereal", "trap", "hazy", "pitched", "atmospheric", "dreamy", "airy"],
    artists: ["playboi carti", "ken carson", "destroy lonely", "sosa geek"],
    description: "Sky-high wispy pad — plugg and emo rap atmosphere",
    params: { cutoff: 3200, resonance: 0.4, attack: 0.6, decay: 0.8, sustain: 0.85, release: 3.5, reverbSize: 0.9, reverbWet: 0.7, oscType: "saw", drive: 0.05, chorus: 0.5, delayMix: 0.2 },
  },
  {
    name: "Drill Sub Bass",
    tags: ["drill", "dark", "808", "bass", "heavy", "uk", "boomy", "trap", "sub", "deep"],
    artists: ["pop smoke", "fivio foreign", "central cee", "unknown t"],
    description: "Heavy sub bass with slow decay — UK drill foundation",
    params: { cutoff: 120, resonance: 1.5, attack: 0.001, decay: 0.8, sustain: 0.0, release: 0.6, reverbSize: 0.05, reverbWet: 0.0, oscType: "sine", drive: 0.1, chorus: 0.0, delayMix: 0.0 },
  },
  {
    name: "Dark R&B Cinematic",
    tags: ["dark", "r&b", "cinematic", "emotional", "lush", "atmospheric", "romantic", "smooth"],
    artists: ["the weeknd", "partynextdoor", "dvsn", "bryson tiller"],
    description: "Dark romantic saw pad — cinematic R&B atmosphere",
    params: { cutoff: 1600, resonance: 0.55, attack: 0.5, decay: 0.9, sustain: 0.8, release: 2.5, reverbSize: 0.85, reverbWet: 0.6, oscType: "saw", drive: 0.08, chorus: 0.35, delayMix: 0.28 },
  },
  {
    name: "Neo-Soul Jazz Pad",
    tags: ["neo-soul", "jazz", "warm", "smooth", "organic", "mellow", "soulful", "vintage"],
    artists: ["tyler the creator", "frank ocean", "erykah badu", "robert glasper"],
    description: "Warm jazz-influenced pad with mellow filter",
    params: { cutoff: 2200, resonance: 0.3, attack: 0.3, decay: 1.0, sustain: 0.75, release: 2.0, reverbSize: 0.55, reverbWet: 0.35, oscType: "saw", drive: 0.1, chorus: 0.45, delayMix: 0.15 },
  },
  {
    name: "Post-Dubstep Minimal",
    tags: ["post-dubstep", "minimal", "emotional", "uk", "sparse", "digital", "bass", "cold"],
    artists: ["james blake", "mount kimbie", "burial", "sohn"],
    description: "Sparse digital square with emotional reverb space",
    params: { cutoff: 4500, resonance: 0.5, attack: 0.01, decay: 0.4, sustain: 0.5, release: 1.8, reverbSize: 0.75, reverbWet: 0.5, oscType: "square", drive: 0.05, chorus: 0.15, delayMix: 0.4 },
  },
  {
    name: "Trip-Hop Dark Bass",
    tags: ["trip-hop", "dark", "bass", "cinematic", "heavy", "mysterious", "urban", "slow"],
    artists: ["massive attack", "portishead", "tricky", "morcheeba"],
    description: "Heavy slow-moving bass tone — classic trip-hop texture",
    params: { cutoff: 400, resonance: 1.2, attack: 0.05, decay: 0.6, sustain: 0.7, release: 1.0, reverbSize: 0.4, reverbWet: 0.3, oscType: "sine", drive: 0.25, chorus: 0.1, delayMix: 0.2 },
  },
  {
    name: "Folktronica Warmth",
    tags: ["folktronica", "warm", "organic", "electronic", "textural", "gentle", "chill"],
    artists: ["four tet", "bonobo", "caribou", "jon hopkins"],
    description: "Warm organic texture with gentle filter movement",
    params: { cutoff: 2800, resonance: 0.4, attack: 0.4, decay: 1.2, sustain: 0.65, release: 2.5, reverbSize: 0.65, reverbWet: 0.45, oscType: "saw", drive: 0.05, chorus: 0.5, delayMix: 0.3 },
  },
  {
    name: "Hazy Nostalgia",
    tags: ["hauntology", "nostalgic", "hazy", "vintage", "degraded", "warm", "idm", "ambient"],
    artists: ["boards of canada", "bibio", "forest swords", "com truise"],
    description: "Washed-out degraded pad — deeply nostalgic texture",
    params: { cutoff: 1400, resonance: 0.45, attack: 0.7, decay: 1.5, sustain: 0.7, release: 3.0, reverbSize: 0.8, reverbWet: 0.55, oscType: "saw", drive: 0.18, chorus: 0.4, delayMix: 0.35 },
  },
  {
    name: "Progressive House Lead",
    tags: ["progressive house", "house", "euphoric", "lead", "bright", "festival", "electronic", "driving"],
    artists: ["deadmau5", "eric prydz", "feed me", "knife party"],
    description: "Driving progressive lead with long filter sweep",
    params: { cutoff: 7000, resonance: 0.9, attack: 0.03, decay: 0.4, sustain: 0.8, release: 0.8, reverbSize: 0.3, reverbWet: 0.2, oscType: "saw", drive: 0.12, chorus: 0.3, delayMix: 0.15 },
  },
  {
    name: "Hard Dark Techno",
    tags: ["techno", "dark", "hard", "industrial", "brutal", "underground", "driving", "hypnotic"],
    artists: ["charlotte de witte", "amelie lens", "kobosil", "stef mendesidis"],
    description: "Relentless dark industrial techno — hypnotic and brutal",
    params: { cutoff: 500, resonance: 2.5, attack: 0.002, decay: 0.2, sustain: 0.3, release: 0.3, reverbSize: 0.1, reverbWet: 0.05, oscType: "square", drive: 0.6, chorus: 0.0, delayMix: 0.05 },
  },
  {
    name: "Tech House Groove",
    tags: ["tech house", "house", "groove", "funky", "punchy", "driving", "club", "energetic"],
    artists: ["fisher", "chris lake", "john summit", "camelphat"],
    description: "Punchy tech house stab with short punchy transients",
    params: { cutoff: 3500, resonance: 1.2, attack: 0.002, decay: 0.25, sustain: 0.4, release: 0.35, reverbSize: 0.15, reverbWet: 0.08, oscType: "saw", drive: 0.35, chorus: 0.1, delayMix: 0.1 },
  },
  {
    name: "Melodic House Pad",
    tags: ["melodic house", "house", "nostalgic", "emotional", "lush", "uplifting", "cinematic"],
    artists: ["bicep", "lane 8", "cristoph", "elder island"],
    description: "Nostalgic lush pad — melodic club music warmth",
    params: { cutoff: 4000, resonance: 0.5, attack: 0.3, decay: 0.8, sustain: 0.8, release: 2.2, reverbSize: 0.7, reverbWet: 0.5, oscType: "saw", drive: 0.05, chorus: 0.6, delayMix: 0.22 },
  },
  {
    name: "Retrowave Drive",
    tags: ["synthwave", "retrowave", "80s", "driving", "cinematic", "neon", "bass", "dark"],
    artists: ["kavinsky", "perturbator", "carpenter brut", "gunship"],
    description: "Driving 80s retrowave bass — neon-soaked darkness",
    params: { cutoff: 2000, resonance: 0.8, attack: 0.01, decay: 0.5, sustain: 0.7, release: 1.0, reverbSize: 0.45, reverbWet: 0.3, oscType: "saw", drive: 0.35, chorus: 0.25, delayMix: 0.3 },
  },
  {
    name: "Phonk Memphis Dark",
    tags: ["phonk", "dark", "memphis", "distorted", "aggressive", "trap", "raw", "gritty"],
    artists: ["dj smokey", "night lovell", "soudiere", "suicideboys"],
    description: "Dark Memphis phonk — raw and distorted atmosphere",
    params: { cutoff: 5000, resonance: 1.5, attack: 0.001, decay: 0.4, sustain: 0.2, release: 0.5, reverbSize: 0.2, reverbWet: 0.12, oscType: "square", drive: 0.7, chorus: 0.05, delayMix: 0.15 },
  },
  {
    name: "Jazz Lo-Fi Smooth",
    tags: ["jazz", "lofi", "smooth", "warm", "chill", "nostalgic", "mellow", "hip-hop"],
    artists: ["nujabes", "j dilla", "pete rock", "dj shadow"],
    description: "Smooth jazz-sampled lo-fi vibe — timeless warmth",
    params: { cutoff: 2500, resonance: 0.3, attack: 0.2, decay: 1.4, sustain: 0.65, release: 1.8, reverbSize: 0.6, reverbWet: 0.4, oscType: "sine", drive: 0.12, chorus: 0.35, delayMix: 0.2 },
  },
  {
    name: "Boom Bap Organ",
    tags: ["boom bap", "hip-hop", "organic", "soulful", "punchy", "gritty", "classic", "east coast"],
    artists: ["kendrick lamar", "j cole", "joey bada$$", "nas"],
    description: "Gritty soulful organ — East Coast boom bap foundation",
    params: { cutoff: 3000, resonance: 0.6, attack: 0.005, decay: 0.5, sustain: 0.7, release: 0.8, reverbSize: 0.3, reverbWet: 0.2, oscType: "square", drive: 0.3, chorus: 0.15, delayMix: 0.1 },
  },
  {
    name: "Melodic Trap Lead",
    tags: ["trap", "melodic", "bright", "emotional", "lead", "pop", "catchy", "modern"],
    artists: ["gunna", "young thug", "lil baby", "future"],
    description: "Bright melodic trap lead — modern Atlanta bounce",
    params: { cutoff: 5500, resonance: 0.7, attack: 0.01, decay: 0.35, sustain: 0.65, release: 1.2, reverbSize: 0.4, reverbWet: 0.25, oscType: "saw", drive: 0.08, chorus: 0.4, delayMix: 0.18 },
  },
  {
    name: "Afrobeats Percussion Synth",
    tags: ["afrobeats", "afropop", "groove", "warm", "bright", "dancehall", "percussive", "tropical"],
    artists: ["burna boy", "wizkid", "davido", "tems"],
    description: "Bright percussive afrobeats synth with tropical warmth",
    params: { cutoff: 6000, resonance: 0.6, attack: 0.003, decay: 0.3, sustain: 0.5, release: 0.5, reverbSize: 0.25, reverbWet: 0.15, oscType: "saw", drive: 0.12, chorus: 0.3, delayMix: 0.12 },
  },
  {
    name: "Darksynth Industrial Lead",
    tags: ["darksynth", "industrial", "aggressive", "dark", "metal", "hard", "distorted", "heavy"],
    artists: ["carpenter brut", "perturbator", "power glove", "health"],
    description: "Industrial distorted lead — darksynth aggression",
    params: { cutoff: 9000, resonance: 2.5, attack: 0.002, decay: 0.15, sustain: 0.85, release: 0.3, reverbSize: 0.2, reverbWet: 0.1, oscType: "square", drive: 0.9, chorus: 0.05, delayMix: 0.08 },
  },
  {
    name: "UK Garage Stab",
    tags: ["uk garage", "garage", "stab", "punchy", "uk", "bass", "groove", "electronic"],
    artists: ["burial", "four tet", "zomby", "luke slater"],
    description: "Punchy UK garage stab — 2-step groove foundation",
    params: { cutoff: 5000, resonance: 1.8, attack: 0.001, decay: 0.2, sustain: 0.0, release: 0.3, reverbSize: 0.2, reverbWet: 0.1, oscType: "saw", drive: 0.2, chorus: 0.0, delayMix: 0.2 },
  },
  {
    name: "Vaporwave Pad",
    tags: ["vaporwave", "ethereal", "smooth", "nostalgic", "dreamy", "retro", "ambient", "chopped"],
    artists: ["saint pepsi", "macintosh plus", "luxury elite", "windows 96"],
    description: "Washed-out smooth pad — vaporwave aesthetic",
    params: { cutoff: 3000, resonance: 0.3, attack: 1.0, decay: 2.0, sustain: 0.75, release: 4.0, reverbSize: 0.95, reverbWet: 0.75, oscType: "saw", drive: 0.0, chorus: 0.55, delayMix: 0.4 },
  },
  {
    name: "Trance Supersaw",
    tags: ["trance", "supersaw", "uplifting", "euphoric", "emotional", "festival", "epic", "wide"],
    artists: ["armin van buuren", "tiesto", "above & beyond", "ferry corsten"],
    description: "Wide uplifting trance supersaw — pure euphoria",
    params: { cutoff: 8000, resonance: 0.6, attack: 0.04, decay: 0.3, sustain: 0.9, release: 2.0, reverbSize: 0.55, reverbWet: 0.4, oscType: "saw", drive: 0.05, chorus: 0.95, delayMix: 0.15 },
  },
  {
    name: "Experimental Glitch",
    tags: ["experimental", "glitch", "idm", "abstract", "noisy", "textural", "complex", "digital"],
    artists: ["aphex twin", "autechre", "arca", "oneohtrix point never"],
    description: "Glitchy abstract digital texture — experimental IDM",
    params: { cutoff: 12000, resonance: 5.0, attack: 0.001, decay: 0.1, sustain: 0.3, release: 0.15, reverbSize: 0.4, reverbWet: 0.2, oscType: "square", drive: 0.5, chorus: 0.2, delayMix: 0.35 },
  },
  {
    name: "Chillwave Haze",
    tags: ["chillwave", "warm", "hazy", "summer", "dreamy", "indie", "nostalgic", "reverb"],
    artists: ["toro y moi", "washed out", "neon indian", "small black"],
    description: "Hazy warm chillwave — lo-fi summer dreamscape",
    params: { cutoff: 2600, resonance: 0.4, attack: 0.5, decay: 1.0, sustain: 0.7, release: 2.8, reverbSize: 0.75, reverbWet: 0.55, oscType: "saw", drive: 0.1, chorus: 0.5, delayMix: 0.3 },
  },
];

export const ARTIST_ALIASES: Record<string, string> = {
  "travis": "travis scott",
  "carti": "playboi carti",
  "frank": "frank ocean",
  "kanye": "kanye west",
  "ye": "kanye west",
  "metro": "metro boomin",
  "future": "future",
  "21": "21 savage",
  "dilla": "j dilla",
  "burial": "burial",
  "eno": "brian eno",
  "aphex": "aphex twin",
  "weeknd": "the weeknd",
  "tyler": "tyler the creator",
  "kendrick": "kendrick lamar",
  "cole": "j cole",
  "nujabes": "nujabes",
  "bonobo": "bonobo",
  "bicep": "bicep",
  "flume": "flume",
  "skrillex": "skrillex",
  "deadmau5": "deadmau5",
  "fisher": "fisher",
  "burna": "burna boy",
};
