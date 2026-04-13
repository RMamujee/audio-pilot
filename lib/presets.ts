export interface SynthParams {
  cutoff: number;       // Hz  20–20000
  resonance: number;    // 0.1–10
  attack: number;       // sec
  decay: number;        // sec
  sustain: number;      // 0–1
  release: number;      // sec
  reverbSize: number;   // 0–1
  reverbWet: number;    // 0–1
  oscType: "sine" | "saw" | "square";
  drive: number;        // 0–1 (distortion amount)
  chorus: number;       // 0–1
  delayMix: number;     // 0–1
}

export interface Preset {
  name: string;
  tags: string[];
  artists: string[];    // artist names this preset matches
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
];

// Artist alias normalization
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
};
