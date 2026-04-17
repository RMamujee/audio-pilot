type OscType = "sine" | "saw" | "square";

interface Range { min: number; max: number; }

interface SoundTemplate {
  name: string;
  description: string;
  genre: string;
  matchTags: string[];
  oscTypes: OscType[];
  cutoff: Range;
  resonance: Range;
  attack: Range;
  decay: Range;
  sustain: Range;
  release: Range;
  reverbSize: Range;
  reverbWet: Range;
  drive: Range;
  chorus: Range;
  delayMix: Range;
}

export interface GeneratedSound {
  name: string;
  description: string;
  genre: string;
  confidence: number;
  matchedArtist: boolean;
  matchedTags: string[];
  artistTags: string[];
  params: {
    cutoff: number; resonance: number;
    attack: number; decay: number; sustain: number; release: number;
    reverbSize: number; reverbWet: number;
    oscType: OscType;
    drive: number; chorus: number; delayMix: number;
  };
  artists: string[];
  tags: string[];
}

// ─── Template library (40+ templates, all major genres) ──────────────────────

const TEMPLATES: SoundTemplate[] = [
  // ── Bass ─────────────────────────────────────────────────────────────────
  {
    name: "Sub Bass",
    description: "Deep sine sub with sharp transient — trap and hip-hop foundation",
    genre: "trap",
    matchTags: ["trap", "hip-hop", "rap", "bass", "808", "sub", "heavy", "deep", "grime", "drill", "phonk", "dark trap"],
    oscTypes: ["sine"],
    cutoff: { min: 80, max: 220 }, resonance: { min: 0.8, max: 2.5 },
    attack: { min: 0.001, max: 0.005 }, decay: { min: 0.4, max: 1.2 },
    sustain: { min: 0, max: 0.1 }, release: { min: 0.3, max: 0.7 },
    reverbSize: { min: 0.05, max: 0.12 }, reverbWet: { min: 0, max: 0.06 },
    drive: { min: 0.02, max: 0.12 }, chorus: { min: 0, max: 0.02 }, delayMix: { min: 0, max: 0.03 },
  },
  {
    name: "Deep Resonant Bass",
    description: "Resonant filtered bass — deep club-ready thump",
    genre: "techno",
    matchTags: ["techno", "house", "electronic", "bass", "deep", "underground", "minimal", "club", "dark"],
    oscTypes: ["square", "saw"],
    cutoff: { min: 200, max: 500 }, resonance: { min: 1.5, max: 4.5 },
    attack: { min: 0.002, max: 0.02 }, decay: { min: 0.2, max: 0.5 },
    sustain: { min: 0.3, max: 0.7 }, release: { min: 0.2, max: 0.6 },
    reverbSize: { min: 0.05, max: 0.2 }, reverbWet: { min: 0, max: 0.1 },
    drive: { min: 0.2, max: 0.55 }, chorus: { min: 0, max: 0.06 }, delayMix: { min: 0, max: 0.05 },
  },
  {
    name: "Acid Bass",
    description: "Squelchy TB-303 acid bass — hypnotic and driving",
    genre: "acid",
    matchTags: ["acid", "techno", "electronic", "rave", "303", "acid house", "idm", "gabber", "acid techno"],
    oscTypes: ["saw"],
    cutoff: { min: 1500, max: 4500 }, resonance: { min: 3.5, max: 8.0 },
    attack: { min: 0.001, max: 0.005 }, decay: { min: 0.15, max: 0.5 },
    sustain: { min: 0.05, max: 0.2 }, release: { min: 0.1, max: 0.3 },
    reverbSize: { min: 0.1, max: 0.3 }, reverbWet: { min: 0.05, max: 0.18 },
    drive: { min: 0.2, max: 0.5 }, chorus: { min: 0, max: 0.1 }, delayMix: { min: 0.1, max: 0.3 },
  },
  {
    name: "Phonk Distorted Bass",
    description: "Raw distorted Memphis bass — phonk aggression",
    genre: "phonk",
    matchTags: ["phonk", "memphis", "dark", "distorted", "aggressive", "raw", "gritty", "trap"],
    oscTypes: ["square"],
    cutoff: { min: 2500, max: 8000 }, resonance: { min: 1.0, max: 3.0 },
    attack: { min: 0.001, max: 0.005 }, decay: { min: 0.2, max: 0.6 },
    sustain: { min: 0.1, max: 0.3 }, release: { min: 0.2, max: 0.6 },
    reverbSize: { min: 0.1, max: 0.25 }, reverbWet: { min: 0.05, max: 0.15 },
    drive: { min: 0.55, max: 0.95 }, chorus: { min: 0, max: 0.1 }, delayMix: { min: 0.05, max: 0.2 },
  },
  {
    name: "Wobble Bass",
    description: "Classic wobble bass — dubstep and bass music staple",
    genre: "dubstep",
    matchTags: ["dubstep", "bass music", "brostep", "filthy", "heavy", "wub", "bass", "electronic"],
    oscTypes: ["saw", "square"],
    cutoff: { min: 400, max: 2200 }, resonance: { min: 1.5, max: 4.5 },
    attack: { min: 0.001, max: 0.01 }, decay: { min: 0.3, max: 0.8 },
    sustain: { min: 0.4, max: 0.8 }, release: { min: 0.3, max: 0.7 },
    reverbSize: { min: 0.15, max: 0.35 }, reverbWet: { min: 0.08, max: 0.22 },
    drive: { min: 0.3, max: 0.75 }, chorus: { min: 0.1, max: 0.3 }, delayMix: { min: 0.05, max: 0.15 },
  },
  {
    name: "UK Minimal Bass",
    description: "Sparse minimal bass — UK garage and grime",
    genre: "uk garage",
    matchTags: ["uk garage", "grime", "uk bass", "uk", "jungle", "2-step", "electronic", "bass"],
    oscTypes: ["sine", "square"],
    cutoff: { min: 150, max: 420 }, resonance: { min: 0.5, max: 2.0 },
    attack: { min: 0.001, max: 0.01 }, decay: { min: 0.3, max: 0.8 },
    sustain: { min: 0, max: 0.2 }, release: { min: 0.2, max: 0.5 },
    reverbSize: { min: 0.1, max: 0.3 }, reverbWet: { min: 0.05, max: 0.15 },
    drive: { min: 0.1, max: 0.3 }, chorus: { min: 0, max: 0.05 }, delayMix: { min: 0.1, max: 0.3 },
  },
  {
    name: "Neurofunk Bass",
    description: "Distorted neuro bass — dark drum and bass",
    genre: "drum and bass",
    matchTags: ["drum and bass", "dnb", "neurofunk", "neuro", "dark dnb", "liquid dnb", "jungle", "breakbeat"],
    oscTypes: ["saw", "square"],
    cutoff: { min: 300, max: 1500 }, resonance: { min: 2.0, max: 5.0 },
    attack: { min: 0.001, max: 0.008 }, decay: { min: 0.1, max: 0.4 },
    sustain: { min: 0.2, max: 0.6 }, release: { min: 0.15, max: 0.5 },
    reverbSize: { min: 0.1, max: 0.3 }, reverbWet: { min: 0.05, max: 0.15 },
    drive: { min: 0.4, max: 0.8 }, chorus: { min: 0.05, max: 0.2 }, delayMix: { min: 0.05, max: 0.15 },
  },
  // ── Lead ─────────────────────────────────────────────────────────────────
  {
    name: "Bright Saw Lead",
    description: "Crisp saw lead — punchy and melodic",
    genre: "house",
    matchTags: ["house", "disco", "funk", "pop", "dance", "french house", "bright", "melodic", "groove"],
    oscTypes: ["saw"],
    cutoff: { min: 4000, max: 12000 }, resonance: { min: 0.4, max: 1.2 },
    attack: { min: 0.002, max: 0.02 }, decay: { min: 0.1, max: 0.4 },
    sustain: { min: 0.4, max: 0.8 }, release: { min: 0.2, max: 0.6 },
    reverbSize: { min: 0.15, max: 0.35 }, reverbWet: { min: 0.05, max: 0.2 },
    drive: { min: 0.02, max: 0.15 }, chorus: { min: 0.1, max: 0.4 }, delayMix: { min: 0.02, max: 0.12 },
  },
  {
    name: "Dark Trap Lead",
    description: "Dark minor lead — menacing trap atmosphere",
    genre: "trap",
    matchTags: ["trap", "dark", "rap", "hip-hop", "ominous", "moody", "aggressive", "menacing", "dark trap", "cloud rap"],
    oscTypes: ["saw", "square"],
    cutoff: { min: 1000, max: 3800 }, resonance: { min: 0.5, max: 1.5 },
    attack: { min: 0.005, max: 0.04 }, decay: { min: 0.2, max: 0.6 },
    sustain: { min: 0.5, max: 0.85 }, release: { min: 0.5, max: 1.5 },
    reverbSize: { min: 0.4, max: 0.72 }, reverbWet: { min: 0.2, max: 0.45 },
    drive: { min: 0.1, max: 0.3 }, chorus: { min: 0.1, max: 0.35 }, delayMix: { min: 0.1, max: 0.3 },
  },
  {
    name: "Trance Supersaw",
    description: "Wide detuned supersaw — uplifting and euphoric",
    genre: "trance",
    matchTags: ["trance", "edm", "festival", "euphoric", "uplifting", "rave", "progressive trance", "psytrance", "big room"],
    oscTypes: ["saw"],
    cutoff: { min: 5000, max: 16000 }, resonance: { min: 0.4, max: 1.0 },
    attack: { min: 0.02, max: 0.1 }, decay: { min: 0.2, max: 0.5 },
    sustain: { min: 0.75, max: 0.97 }, release: { min: 1.0, max: 3.0 },
    reverbSize: { min: 0.4, max: 0.7 }, reverbWet: { min: 0.25, max: 0.5 },
    drive: { min: 0.02, max: 0.1 }, chorus: { min: 0.75, max: 0.99 }, delayMix: { min: 0.08, max: 0.2 },
  },
  {
    name: "Darksynth Lead",
    description: "Distorted industrial lead — darksynth aggression",
    genre: "darksynth",
    matchTags: ["darksynth", "industrial", "metal", "aggressive", "heavy", "noise", "power electronics", "synthwave", "dark"],
    oscTypes: ["square"],
    cutoff: { min: 6000, max: 18000 }, resonance: { min: 1.5, max: 4.5 },
    attack: { min: 0.001, max: 0.008 }, decay: { min: 0.05, max: 0.2 },
    sustain: { min: 0.7, max: 0.95 }, release: { min: 0.1, max: 0.5 },
    reverbSize: { min: 0.1, max: 0.3 }, reverbWet: { min: 0.05, max: 0.15 },
    drive: { min: 0.65, max: 0.99 }, chorus: { min: 0, max: 0.15 }, delayMix: { min: 0.05, max: 0.15 },
  },
  {
    name: "Melodic R&B Lead",
    description: "Smooth melodic lead — R&B and neo-soul expression",
    genre: "r&b",
    matchTags: ["r&b", "neo-soul", "soul", "smooth", "melodic", "emotional", "pop", "romantic", "jazz"],
    oscTypes: ["saw", "sine"],
    cutoff: { min: 3000, max: 9000 }, resonance: { min: 0.3, max: 0.9 },
    attack: { min: 0.01, max: 0.06 }, decay: { min: 0.2, max: 0.7 },
    sustain: { min: 0.6, max: 0.9 }, release: { min: 0.8, max: 2.0 },
    reverbSize: { min: 0.3, max: 0.6 }, reverbWet: { min: 0.2, max: 0.45 },
    drive: { min: 0, max: 0.1 }, chorus: { min: 0.15, max: 0.5 }, delayMix: { min: 0.1, max: 0.3 },
  },
  {
    name: "Future Bass Lead",
    description: "Bright filtered lead — future bass emotional energy",
    genre: "future bass",
    matchTags: ["future bass", "edm", "emotional", "wave", "bright", "uplifting", "electronic", "melodic"],
    oscTypes: ["saw"],
    cutoff: { min: 3000, max: 9000 }, resonance: { min: 0.5, max: 1.5 },
    attack: { min: 0.02, max: 0.1 }, decay: { min: 0.3, max: 0.7 },
    sustain: { min: 0.7, max: 0.92 }, release: { min: 1.0, max: 2.5 },
    reverbSize: { min: 0.35, max: 0.62 }, reverbWet: { min: 0.2, max: 0.45 },
    drive: { min: 0.05, max: 0.15 }, chorus: { min: 0.5, max: 0.95 }, delayMix: { min: 0.1, max: 0.25 },
  },
  {
    name: "IDM Glitch Lead",
    description: "Abstract glitchy lead — IDM and experimental textures",
    genre: "idm",
    matchTags: ["idm", "experimental", "glitch", "abstract", "complex", "braindance", "drill and bass", "electronic", "electro"],
    oscTypes: ["square", "saw"],
    cutoff: { min: 5000, max: 18000 }, resonance: { min: 2.0, max: 7.5 },
    attack: { min: 0.001, max: 0.005 }, decay: { min: 0.05, max: 0.15 },
    sustain: { min: 0.1, max: 0.4 }, release: { min: 0.05, max: 0.2 },
    reverbSize: { min: 0.2, max: 0.5 }, reverbWet: { min: 0.1, max: 0.3 },
    drive: { min: 0.3, max: 0.7 }, chorus: { min: 0.1, max: 0.3 }, delayMix: { min: 0.2, max: 0.5 },
  },
  {
    name: "Acid Lead",
    description: "303-inspired acid lead — rave and techno energy",
    genre: "acid techno",
    matchTags: ["acid", "techno", "rave", "acid house", "gabber", "hardstyle", "electronic"],
    oscTypes: ["saw"],
    cutoff: { min: 2000, max: 12000 }, resonance: { min: 4.0, max: 9.0 },
    attack: { min: 0.001, max: 0.01 }, decay: { min: 0.1, max: 0.4 },
    sustain: { min: 0.05, max: 0.3 }, release: { min: 0.1, max: 0.4 },
    reverbSize: { min: 0.1, max: 0.3 }, reverbWet: { min: 0.05, max: 0.2 },
    drive: { min: 0.25, max: 0.6 }, chorus: { min: 0, max: 0.1 }, delayMix: { min: 0.1, max: 0.35 },
  },
  {
    name: "Synthwave Lead",
    description: "80s arpeggiated lead — retrowave and neon",
    genre: "synthwave",
    matchTags: ["synthwave", "retrowave", "80s", "retro", "outrun", "chillwave", "neon", "vaporwave"],
    oscTypes: ["saw"],
    cutoff: { min: 3000, max: 10000 }, resonance: { min: 0.6, max: 1.5 },
    attack: { min: 0.01, max: 0.05 }, decay: { min: 0.2, max: 0.5 },
    sustain: { min: 0.65, max: 0.9 }, release: { min: 0.5, max: 1.5 },
    reverbSize: { min: 0.3, max: 0.55 }, reverbWet: { min: 0.15, max: 0.4 },
    drive: { min: 0.1, max: 0.35 }, chorus: { min: 0.2, max: 0.55 }, delayMix: { min: 0.2, max: 0.4 },
  },
  // ── Pad ──────────────────────────────────────────────────────────────────
  {
    name: "Dark Atmospheric Pad",
    description: "Slow-evolving dark pad — cinematic and immersive",
    genre: "dark ambient",
    matchTags: ["dark", "atmospheric", "ambient", "cinematic", "ominous", "trap", "dark ambient", "film score", "moody", "dark trap", "cloud rap"],
    oscTypes: ["saw"],
    cutoff: { min: 600, max: 2200 }, resonance: { min: 0.3, max: 0.7 },
    attack: { min: 0.5, max: 2.2 }, decay: { min: 0.8, max: 1.5 },
    sustain: { min: 0.7, max: 0.93 }, release: { min: 2.0, max: 5.5 },
    reverbSize: { min: 0.75, max: 0.99 }, reverbWet: { min: 0.5, max: 0.82 },
    drive: { min: 0.05, max: 0.22 }, chorus: { min: 0.2, max: 0.5 }, delayMix: { min: 0.1, max: 0.35 },
  },
  {
    name: "Warm Lo-Fi Pad",
    description: "Warm filtered pad — lo-fi hip-hop comfort",
    genre: "lo-fi",
    matchTags: ["lofi", "lo-fi", "chill", "hip-hop", "warm", "vintage", "dusty", "mellow", "nostalgic", "chillhop"],
    oscTypes: ["saw"],
    cutoff: { min: 1200, max: 3000 }, resonance: { min: 0.25, max: 0.55 },
    attack: { min: 0.3, max: 0.9 }, decay: { min: 0.8, max: 1.5 },
    sustain: { min: 0.6, max: 0.88 }, release: { min: 1.5, max: 3.0 },
    reverbSize: { min: 0.45, max: 0.72 }, reverbWet: { min: 0.3, max: 0.55 },
    drive: { min: 0.08, max: 0.22 }, chorus: { min: 0.4, max: 0.72 }, delayMix: { min: 0.1, max: 0.3 },
  },
  {
    name: "Ethereal Shimmer Pad",
    description: "Angelic shimmer pad with hall reverb",
    genre: "ambient",
    matchTags: ["ethereal", "ambient", "spiritual", "choir", "angelic", "dreamy", "lush", "cinematic", "neo-classical", "shoegaze", "post-rock"],
    oscTypes: ["sine"],
    cutoff: { min: 2500, max: 7000 }, resonance: { min: 0.2, max: 0.5 },
    attack: { min: 1.0, max: 3.0 }, decay: { min: 1.0, max: 2.5 },
    sustain: { min: 0.7, max: 0.96 }, release: { min: 3.0, max: 7.0 },
    reverbSize: { min: 0.85, max: 0.99 }, reverbWet: { min: 0.65, max: 0.92 },
    drive: { min: 0, max: 0.05 }, chorus: { min: 0.3, max: 0.65 }, delayMix: { min: 0.2, max: 0.4 },
  },
  {
    name: "Dark Ambient Drone",
    description: "Sustained dark drone — meditative and ominous",
    genre: "dark ambient",
    matchTags: ["dark ambient", "drone", "ambient", "eerie", "cold", "noise", "experimental", "minimal"],
    oscTypes: ["sine"],
    cutoff: { min: 300, max: 1000 }, resonance: { min: 0.3, max: 0.6 },
    attack: { min: 1.0, max: 2.8 }, decay: { min: 0.8, max: 1.5 },
    sustain: { min: 0.85, max: 0.99 }, release: { min: 2.5, max: 6.5 },
    reverbSize: { min: 0.82, max: 0.99 }, reverbWet: { min: 0.62, max: 0.88 },
    drive: { min: 0, max: 0.1 }, chorus: { min: 0.05, max: 0.2 }, delayMix: { min: 0.15, max: 0.35 },
  },
  {
    name: "Melodic Chord Pad",
    description: "Warm chord pad — melodic house and techno emotion",
    genre: "melodic house",
    matchTags: ["melodic house", "house", "melodic", "emotional", "uplifting", "indie dance", "progressive house", "melodic techno"],
    oscTypes: ["saw"],
    cutoff: { min: 3000, max: 8000 }, resonance: { min: 0.4, max: 0.8 },
    attack: { min: 0.2, max: 0.6 }, decay: { min: 0.5, max: 1.2 },
    sustain: { min: 0.7, max: 0.92 }, release: { min: 1.5, max: 3.0 },
    reverbSize: { min: 0.5, max: 0.78 }, reverbWet: { min: 0.35, max: 0.62 },
    drive: { min: 0.02, max: 0.1 }, chorus: { min: 0.5, max: 0.88 }, delayMix: { min: 0.1, max: 0.25 },
  },
  {
    name: "Synthwave Retropad",
    description: "80s synthwave pad — neon-drenched nostalgia",
    genre: "synthwave",
    matchTags: ["synthwave", "retrowave", "80s", "retro", "vaporwave", "chillwave", "neon", "outrun"],
    oscTypes: ["saw"],
    cutoff: { min: 1800, max: 5500 }, resonance: { min: 0.5, max: 1.05 },
    attack: { min: 0.2, max: 0.85 }, decay: { min: 0.5, max: 1.5 },
    sustain: { min: 0.65, max: 0.92 }, release: { min: 1.0, max: 2.5 },
    reverbSize: { min: 0.4, max: 0.68 }, reverbWet: { min: 0.25, max: 0.52 },
    drive: { min: 0.15, max: 0.42 }, chorus: { min: 0.3, max: 0.68 }, delayMix: { min: 0.2, max: 0.4 },
  },
  {
    name: "Vaporwave Pad",
    description: "Washed-out smooth pad — aesthetic nostalgia",
    genre: "vaporwave",
    matchTags: ["vaporwave", "aesthetic", "smooth", "nostalgic", "dreamy", "chill", "lofi", "slowed"],
    oscTypes: ["saw"],
    cutoff: { min: 2000, max: 5500 }, resonance: { min: 0.25, max: 0.5 },
    attack: { min: 0.8, max: 2.2 }, decay: { min: 1.5, max: 3.0 },
    sustain: { min: 0.7, max: 0.92 }, release: { min: 3.0, max: 6.0 },
    reverbSize: { min: 0.82, max: 0.99 }, reverbWet: { min: 0.62, max: 0.88 },
    drive: { min: 0, max: 0.05 }, chorus: { min: 0.4, max: 0.72 }, delayMix: { min: 0.3, max: 0.5 },
  },
  {
    name: "Trip-Hop Pad",
    description: "Heavy cinematic pad — trip-hop darkness and depth",
    genre: "trip-hop",
    matchTags: ["trip-hop", "dark", "cinematic", "heavy", "mysterious", "atmospheric", "downtempo"],
    oscTypes: ["saw", "sine"],
    cutoff: { min: 800, max: 2800 }, resonance: { min: 0.4, max: 0.9 },
    attack: { min: 0.4, max: 1.2 }, decay: { min: 0.8, max: 1.5 },
    sustain: { min: 0.7, max: 0.92 }, release: { min: 2.0, max: 4.5 },
    reverbSize: { min: 0.62, max: 0.88 }, reverbWet: { min: 0.45, max: 0.72 },
    drive: { min: 0.1, max: 0.3 }, chorus: { min: 0.15, max: 0.45 }, delayMix: { min: 0.15, max: 0.35 },
  },
  {
    name: "Hauntology Pad",
    description: "Degraded washed-out pad — deeply nostalgic and hazy",
    genre: "ambient",
    matchTags: ["hauntology", "nostalgic", "hazy", "vintage", "degraded", "experimental", "idm", "folktronica", "organic"],
    oscTypes: ["saw"],
    cutoff: { min: 1000, max: 3000 }, resonance: { min: 0.35, max: 0.65 },
    attack: { min: 0.6, max: 1.8 }, decay: { min: 1.0, max: 2.0 },
    sustain: { min: 0.65, max: 0.88 }, release: { min: 2.5, max: 5.0 },
    reverbSize: { min: 0.7, max: 0.92 }, reverbWet: { min: 0.5, max: 0.75 },
    drive: { min: 0.12, max: 0.28 }, chorus: { min: 0.35, max: 0.62 }, delayMix: { min: 0.25, max: 0.48 },
  },
  {
    name: "Neo-Soul Chord",
    description: "Warm jazz-tinged chord — neo-soul and conscious hip-hop",
    genre: "neo-soul",
    matchTags: ["neo-soul", "r&b", "jazz", "soul", "conscious", "boom bap", "organic", "smooth", "hip-hop"],
    oscTypes: ["saw", "sine"],
    cutoff: { min: 2000, max: 5500 }, resonance: { min: 0.3, max: 0.65 },
    attack: { min: 0.25, max: 0.75 }, decay: { min: 0.8, max: 1.5 },
    sustain: { min: 0.65, max: 0.88 }, release: { min: 1.5, max: 3.0 },
    reverbSize: { min: 0.45, max: 0.7 }, reverbWet: { min: 0.28, max: 0.52 },
    drive: { min: 0.08, max: 0.2 }, chorus: { min: 0.35, max: 0.65 }, delayMix: { min: 0.1, max: 0.28 },
  },
  // ── Stab / Pluck ──────────────────────────────────────────────────────────
  {
    name: "House Stab",
    description: "Classic house stab — disco-influenced groove",
    genre: "house",
    matchTags: ["house", "disco", "garage", "groove", "funk", "soul", "dance", "chicago house", "deep house"],
    oscTypes: ["saw"],
    cutoff: { min: 3000, max: 9000 }, resonance: { min: 0.8, max: 2.8 },
    attack: { min: 0.001, max: 0.005 }, decay: { min: 0.1, max: 0.35 },
    sustain: { min: 0, max: 0.15 }, release: { min: 0.15, max: 0.45 },
    reverbSize: { min: 0.15, max: 0.38 }, reverbWet: { min: 0.08, max: 0.22 },
    drive: { min: 0.1, max: 0.32 }, chorus: { min: 0.05, max: 0.22 }, delayMix: { min: 0.05, max: 0.18 },
  },
  {
    name: "Tech Stab",
    description: "Minimal industrial stab — techno percussive hit",
    genre: "techno",
    matchTags: ["techno", "minimal", "industrial", "underground", "percussive", "hard techno", "berlin"],
    oscTypes: ["square"],
    cutoff: { min: 2000, max: 8000 }, resonance: { min: 1.5, max: 4.5 },
    attack: { min: 0.001, max: 0.003 }, decay: { min: 0.08, max: 0.22 },
    sustain: { min: 0, max: 0.1 }, release: { min: 0.1, max: 0.32 },
    reverbSize: { min: 0.1, max: 0.28 }, reverbWet: { min: 0.03, max: 0.12 },
    drive: { min: 0.32, max: 0.72 }, chorus: { min: 0, max: 0.05 }, delayMix: { min: 0.02, max: 0.12 },
  },
  {
    name: "Trap Hi Pluck",
    description: "Short bright pluck — modern trap melodics",
    genre: "trap",
    matchTags: ["trap", "hip-hop", "rap", "bright", "bounce", "atlanta", "modern", "melodic trap", "plugg"],
    oscTypes: ["saw"],
    cutoff: { min: 4000, max: 14000 }, resonance: { min: 0.4, max: 1.0 },
    attack: { min: 0.001, max: 0.003 }, decay: { min: 0.1, max: 0.38 },
    sustain: { min: 0, max: 0.12 }, release: { min: 0.15, max: 0.55 },
    reverbSize: { min: 0.2, max: 0.48 }, reverbWet: { min: 0.1, max: 0.28 },
    drive: { min: 0.02, max: 0.12 }, chorus: { min: 0.1, max: 0.38 }, delayMix: { min: 0.1, max: 0.28 },
  },
  {
    name: "Funk Pluck",
    description: "Funky resonant pluck — disco and house groove",
    genre: "funk",
    matchTags: ["funk", "disco", "french house", "electro", "soul", "boogie", "dance", "groove"],
    oscTypes: ["saw"],
    cutoff: { min: 5000, max: 16000 }, resonance: { min: 0.6, max: 1.6 },
    attack: { min: 0.001, max: 0.006 }, decay: { min: 0.15, max: 0.42 },
    sustain: { min: 0.3, max: 0.68 }, release: { min: 0.2, max: 0.52 },
    reverbSize: { min: 0.15, max: 0.38 }, reverbWet: { min: 0.05, max: 0.2 },
    drive: { min: 0.05, max: 0.22 }, chorus: { min: 0.1, max: 0.38 }, delayMix: { min: 0.03, max: 0.12 },
  },
  {
    name: "Synth-Pop Arp",
    description: "Driving arpeggio — synth-pop and electropop energy",
    genre: "synth-pop",
    matchTags: ["synth-pop", "electropop", "pop", "new wave", "dance-pop", "80s", "retro", "k-pop"],
    oscTypes: ["saw", "square"],
    cutoff: { min: 4000, max: 14000 }, resonance: { min: 0.5, max: 1.5 },
    attack: { min: 0.001, max: 0.01 }, decay: { min: 0.1, max: 0.35 },
    sustain: { min: 0.3, max: 0.72 }, release: { min: 0.2, max: 0.6 },
    reverbSize: { min: 0.2, max: 0.45 }, reverbWet: { min: 0.1, max: 0.28 },
    drive: { min: 0.02, max: 0.15 }, chorus: { min: 0.15, max: 0.5 }, delayMix: { min: 0.1, max: 0.3 },
  },
  {
    name: "Jungle Stab",
    description: "High-energy stab — jungle and drum & bass",
    genre: "drum and bass",
    matchTags: ["jungle", "drum and bass", "dnb", "rave", "hardcore", "breakbeat", "electronic"],
    oscTypes: ["saw", "square"],
    cutoff: { min: 3000, max: 10000 }, resonance: { min: 1.0, max: 3.2 },
    attack: { min: 0.001, max: 0.005 }, decay: { min: 0.08, max: 0.28 },
    sustain: { min: 0.2, max: 0.62 }, release: { min: 0.1, max: 0.42 },
    reverbSize: { min: 0.1, max: 0.32 }, reverbWet: { min: 0.05, max: 0.18 },
    drive: { min: 0.2, max: 0.52 }, chorus: { min: 0, max: 0.15 }, delayMix: { min: 0.05, max: 0.18 },
  },
  // ── Texture / Drone ────────────────────────────────────────────────────────
  {
    name: "Noise Texture",
    description: "Abrasive noise texture — industrial and experimental",
    genre: "industrial",
    matchTags: ["industrial", "noise", "power electronics", "harsh noise", "experimental", "dark", "aggressive"],
    oscTypes: ["square"],
    cutoff: { min: 3000, max: 18000 }, resonance: { min: 3.0, max: 8.5 },
    attack: { min: 0.1, max: 0.5 }, decay: { min: 0.3, max: 1.0 },
    sustain: { min: 0.4, max: 0.88 }, release: { min: 0.5, max: 2.0 },
    reverbSize: { min: 0.3, max: 0.62 }, reverbWet: { min: 0.1, max: 0.32 },
    drive: { min: 0.62, max: 0.99 }, chorus: { min: 0.1, max: 0.3 }, delayMix: { min: 0.1, max: 0.4 },
  },
  {
    name: "Organic Texture",
    description: "Warm organic texture — folktronica and experimental ambient",
    genre: "ambient",
    matchTags: ["folktronica", "organic", "experimental", "ambient", "acoustic", "electronic", "indie"],
    oscTypes: ["sine", "saw"],
    cutoff: { min: 1500, max: 5500 }, resonance: { min: 0.3, max: 0.7 },
    attack: { min: 0.5, max: 1.5 }, decay: { min: 1.0, max: 2.2 },
    sustain: { min: 0.5, max: 0.82 }, release: { min: 2.0, max: 4.5 },
    reverbSize: { min: 0.55, max: 0.82 }, reverbWet: { min: 0.4, max: 0.68 },
    drive: { min: 0.02, max: 0.12 }, chorus: { min: 0.3, max: 0.68 }, delayMix: { min: 0.2, max: 0.45 },
  },
  // ── Special ───────────────────────────────────────────────────────────────
  {
    name: "Bell Shimmer",
    description: "Crystalline bell shimmer — ambient and neoclassical",
    genre: "ambient",
    matchTags: ["ambient", "neoclassical", "ethereal", "delicate", "film score", "meditative", "piano", "classical"],
    oscTypes: ["sine"],
    cutoff: { min: 3000, max: 9000 }, resonance: { min: 0.2, max: 0.5 },
    attack: { min: 0.3, max: 1.0 }, decay: { min: 1.5, max: 3.8 },
    sustain: { min: 0.2, max: 0.52 }, release: { min: 3.0, max: 7.0 },
    reverbSize: { min: 0.72, max: 0.96 }, reverbWet: { min: 0.5, max: 0.82 },
    drive: { min: 0, max: 0.04 }, chorus: { min: 0.15, max: 0.42 }, delayMix: { min: 0.2, max: 0.48 },
  },
  {
    name: "Boom Bap Organ",
    description: "Gritty organ tone — East Coast hip-hop",
    genre: "hip-hop",
    matchTags: ["boom bap", "hip-hop", "east coast", "jazz", "soul", "classic hip-hop", "golden age", "rap"],
    oscTypes: ["square"],
    cutoff: { min: 1800, max: 5500 }, resonance: { min: 0.4, max: 1.0 },
    attack: { min: 0.003, max: 0.02 }, decay: { min: 0.3, max: 0.8 },
    sustain: { min: 0.55, max: 0.88 }, release: { min: 0.5, max: 1.2 },
    reverbSize: { min: 0.2, max: 0.48 }, reverbWet: { min: 0.1, max: 0.28 },
    drive: { min: 0.2, max: 0.48 }, chorus: { min: 0.08, max: 0.28 }, delayMix: { min: 0.05, max: 0.18 },
  },
  {
    name: "Afrobeats Bell Synth",
    description: "Bright percussive bell — afrobeats and amapiano",
    genre: "afrobeats",
    matchTags: ["afrobeats", "afropop", "amapiano", "dancehall", "tropical", "groove", "african", "world music"],
    oscTypes: ["sine", "saw"],
    cutoff: { min: 4000, max: 12000 }, resonance: { min: 0.4, max: 1.0 },
    attack: { min: 0.001, max: 0.005 }, decay: { min: 0.2, max: 0.52 },
    sustain: { min: 0.3, max: 0.68 }, release: { min: 0.3, max: 0.82 },
    reverbSize: { min: 0.2, max: 0.48 }, reverbWet: { min: 0.1, max: 0.28 },
    drive: { min: 0.05, max: 0.18 }, chorus: { min: 0.2, max: 0.52 }, delayMix: { min: 0.1, max: 0.28 },
  },
  {
    name: "K-Pop Bright Synth",
    description: "Bright catchy synth — K-pop and electropop energy",
    genre: "k-pop",
    matchTags: ["k-pop", "j-pop", "synth-pop", "electropop", "pop", "bright", "catchy", "dance-pop"],
    oscTypes: ["saw"],
    cutoff: { min: 5000, max: 16000 }, resonance: { min: 0.3, max: 0.82 },
    attack: { min: 0.002, max: 0.015 }, decay: { min: 0.15, max: 0.52 },
    sustain: { min: 0.5, max: 0.88 }, release: { min: 0.3, max: 0.82 },
    reverbSize: { min: 0.2, max: 0.48 }, reverbWet: { min: 0.1, max: 0.28 },
    drive: { min: 0.02, max: 0.12 }, chorus: { min: 0.2, max: 0.58 }, delayMix: { min: 0.1, max: 0.28 },
  },
  {
    name: "Post-Dubstep Minimal",
    description: "Sparse digital tone — post-dubstep and UK bass",
    genre: "post-dubstep",
    matchTags: ["post-dubstep", "uk bass", "bass music", "minimal", "digital", "emotional", "electronic"],
    oscTypes: ["square", "sine"],
    cutoff: { min: 2500, max: 8000 }, resonance: { min: 0.4, max: 1.05 },
    attack: { min: 0.005, max: 0.035 }, decay: { min: 0.3, max: 0.72 },
    sustain: { min: 0.4, max: 0.78 }, release: { min: 1.0, max: 2.5 },
    reverbSize: { min: 0.52, max: 0.78 }, reverbWet: { min: 0.35, max: 0.62 },
    drive: { min: 0.02, max: 0.12 }, chorus: { min: 0.1, max: 0.32 }, delayMix: { min: 0.25, max: 0.52 },
  },
  {
    name: "Reggaeton Synth",
    description: "Punchy dembow synth — reggaeton and Latin trap",
    genre: "reggaeton",
    matchTags: ["reggaeton", "latin trap", "dembow", "latin", "urban", "dancehall", "tropical"],
    oscTypes: ["saw", "square"],
    cutoff: { min: 3000, max: 9000 }, resonance: { min: 0.7, max: 2.0 },
    attack: { min: 0.001, max: 0.008 }, decay: { min: 0.1, max: 0.4 },
    sustain: { min: 0.3, max: 0.72 }, release: { min: 0.2, max: 0.6 },
    reverbSize: { min: 0.15, max: 0.4 }, reverbWet: { min: 0.08, max: 0.25 },
    drive: { min: 0.15, max: 0.42 }, chorus: { min: 0.1, max: 0.38 }, delayMix: { min: 0.05, max: 0.18 },
  },
  {
    name: "Shoegaze Wall",
    description: "Dense washed-out wall of sound — shoegaze and dream pop",
    genre: "shoegaze",
    matchTags: ["shoegaze", "dream pop", "indie", "wall of sound", "noise pop", "alternative", "post-rock"],
    oscTypes: ["saw"],
    cutoff: { min: 2000, max: 7000 }, resonance: { min: 0.3, max: 0.7 },
    attack: { min: 0.1, max: 0.5 }, decay: { min: 0.5, max: 1.2 },
    sustain: { min: 0.65, max: 0.92 }, release: { min: 2.0, max: 5.0 },
    reverbSize: { min: 0.75, max: 0.99 }, reverbWet: { min: 0.55, max: 0.85 },
    drive: { min: 0.15, max: 0.45 }, chorus: { min: 0.55, max: 0.95 }, delayMix: { min: 0.2, max: 0.5 },
  },
  {
    name: "Lo-Fi Jazz Tone",
    description: "Smooth degraded tone — lo-fi jazz and hip-hop",
    genre: "lo-fi",
    matchTags: ["jazz", "lofi", "lo-fi", "smooth", "mellow", "chillhop", "nujabes", "hip-hop", "nostalgic"],
    oscTypes: ["sine"],
    cutoff: { min: 2000, max: 5500 }, resonance: { min: 0.25, max: 0.6 },
    attack: { min: 0.15, max: 0.5 }, decay: { min: 0.8, max: 1.8 },
    sustain: { min: 0.5, max: 0.82 }, release: { min: 1.2, max: 2.5 },
    reverbSize: { min: 0.45, max: 0.72 }, reverbWet: { min: 0.32, max: 0.58 },
    drive: { min: 0.08, max: 0.22 }, chorus: { min: 0.28, max: 0.55 }, delayMix: { min: 0.12, max: 0.32 },
  },
];

// ─── Seeded RNG (same artist → same sounds every time) ────────────────────────

function seededRng(seed: string) {
  let h = 0xdeadbeef;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return () => {
    h ^= h >>> 13;
    h = (Math.imul(h, 0x9e3779b9)) | 0;
    h ^= h >>> 15;
    return (h >>> 0) / 0x100000000;
  };
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

// ─── Main export ──────────────────────────────────────────────────────────────

export function generateSounds(
  artistName: string,
  artistTags: string[],
  topK = 200
): GeneratedSound[] {
  const tags = artistTags.map(t => t.toLowerCase());
  const rng  = seededRng(artistName.toLowerCase());

  // Score each template against artist tags
  const scored = TEMPLATES.map(t => {
    const hits = t.matchTags.filter(mt =>
      tags.some(at => at.includes(mt) || mt.includes(at))
    );
    return { t, score: hits.length / Math.max(t.matchTags.length, 1), hits };
  }).filter(({ score }) => score > 0);

  // Fallback: use all templates with minimal score if no match
  const pool = scored.length > 0 ? scored : TEMPLATES.slice(0, 8).map(t => ({ t, score: 0.3, hits: [] as string[] }));

  pool.sort((a, b) => b.score - a.score);

  const sample = (range: Range) => lerp(range.min, range.max, rng());

  return pool.map(({ t, score, hits }) => {
    const oscType = t.oscTypes[Math.floor(rng() * t.oscTypes.length)];
    return {
      name:          t.name,
      description:   t.description,
      genre:         t.genre,
      confidence:    Math.min(0.35 + score * 0.65, 1.0),
      matchedArtist: false,
      matchedTags:   hits,
      artistTags:    tags.slice(0, 8),
      params: {
        cutoff:     Math.round(sample(t.cutoff)),
        resonance:  parseFloat(sample(t.resonance).toFixed(2)),
        attack:     parseFloat(sample(t.attack).toFixed(3)),
        decay:      parseFloat(sample(t.decay).toFixed(3)),
        sustain:    parseFloat(sample(t.sustain).toFixed(2)),
        release:    parseFloat(sample(t.release).toFixed(2)),
        reverbSize: parseFloat(sample(t.reverbSize).toFixed(2)),
        reverbWet:  parseFloat(sample(t.reverbWet).toFixed(2)),
        oscType,
        drive:      parseFloat(sample(t.drive).toFixed(2)),
        chorus:     parseFloat(sample(t.chorus).toFixed(2)),
        delayMix:   parseFloat(sample(t.delayMix).toFixed(2)),
      },
      artists: [],
      tags: t.matchTags.slice(0, 5),
    };
  });
}
