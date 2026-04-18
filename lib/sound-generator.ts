type OscType = "sine" | "saw" | "square";

interface Range { min: number; max: number; }

interface SoundTemplate {
  name: string;
  description: string;
  genre: string;
  matchTags: string[];
  oscTypes: OscType[];
  cutoff: Range; resonance: Range;
  attack: Range; decay: Range; sustain: Range; release: Range;
  reverbSize: Range; reverbWet: Range;
  drive: Range; chorus: Range; delayMix: Range;
}

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

// ─── 50 variation characters ──────────────────────────────────────────────────
// Each value is 0–1 = position within that parameter's template range.
// Every template × variation produces a unique, distinctly-voiced sound.

const VARIATIONS: { name: string; c: number; r: number; a: number; d: number; s: number; rel: number; rv: number; dr: number; ch: number; dl: number }[] = [
  { name: "Classic",    c:0.50, r:0.35, a:0.30, d:0.40, s:0.60, rel:0.40, rv:0.40, dr:0.25, ch:0.30, dl:0.20 },
  { name: "Dark",       c:0.10, r:0.30, a:0.55, d:0.50, s:0.70, rel:0.60, rv:0.75, dr:0.30, ch:0.35, dl:0.30 },
  { name: "Bright",     c:0.85, r:0.40, a:0.15, d:0.35, s:0.55, rel:0.35, rv:0.25, dr:0.10, ch:0.30, dl:0.15 },
  { name: "Punchy",     c:0.60, r:0.50, a:0.02, d:0.15, s:0.10, rel:0.15, rv:0.10, dr:0.45, ch:0.10, dl:0.05 },
  { name: "Soft",       c:0.45, r:0.15, a:0.80, d:0.65, s:0.80, rel:0.75, rv:0.55, dr:0.02, ch:0.45, dl:0.20 },
  { name: "Dirty",      c:0.65, r:0.55, a:0.10, d:0.40, s:0.65, rel:0.35, rv:0.20, dr:0.90, ch:0.15, dl:0.10 },
  { name: "Clean",      c:0.75, r:0.20, a:0.25, d:0.35, s:0.55, rel:0.35, rv:0.15, dr:0.02, ch:0.25, dl:0.10 },
  { name: "Wide",       c:0.55, r:0.35, a:0.35, d:0.45, s:0.65, rel:0.50, rv:0.45, dr:0.20, ch:0.90, dl:0.25 },
  { name: "Mono",       c:0.50, r:0.35, a:0.20, d:0.35, s:0.55, rel:0.30, rv:0.25, dr:0.30, ch:0.02, dl:0.05 },
  { name: "Wet",        c:0.45, r:0.30, a:0.50, d:0.50, s:0.70, rel:0.65, rv:0.90, dr:0.15, ch:0.40, dl:0.35 },
  { name: "Dry",        c:0.60, r:0.45, a:0.15, d:0.30, s:0.50, rel:0.25, rv:0.02, dr:0.35, ch:0.10, dl:0.02 },
  { name: "Deep",       c:0.05, r:0.20, a:0.40, d:0.55, s:0.75, rel:0.55, rv:0.30, dr:0.15, ch:0.10, dl:0.10 },
  { name: "Sharp",      c:0.70, r:0.90, a:0.05, d:0.25, s:0.30, rel:0.20, rv:0.15, dr:0.40, ch:0.10, dl:0.10 },
  { name: "Smooth",     c:0.55, r:0.05, a:0.45, d:0.50, s:0.70, rel:0.60, rv:0.45, dr:0.02, ch:0.35, dl:0.20 },
  { name: "Tight",      c:0.55, r:0.40, a:0.08, d:0.20, s:0.40, rel:0.05, rv:0.15, dr:0.30, ch:0.15, dl:0.05 },
  { name: "Long",       c:0.40, r:0.25, a:0.85, d:0.80, s:0.85, rel:0.95, rv:0.65, dr:0.05, ch:0.50, dl:0.40 },
  { name: "Hard",       c:0.70, r:0.60, a:0.01, d:0.20, s:0.75, rel:0.20, rv:0.10, dr:0.85, ch:0.10, dl:0.05 },
  { name: "Airy",       c:0.95, r:0.15, a:0.60, d:0.65, s:0.50, rel:0.75, rv:0.85, dr:0.00, ch:0.50, dl:0.40 },
  { name: "Thick",      c:0.50, r:0.45, a:0.30, d:0.50, s:0.75, rel:0.55, rv:0.50, dr:0.45, ch:0.85, dl:0.25 },
  { name: "Thin",       c:0.80, r:0.25, a:0.10, d:0.20, s:0.35, rel:0.20, rv:0.20, dr:0.05, ch:0.05, dl:0.05 },
  { name: "Warm",       c:0.35, r:0.20, a:0.40, d:0.50, s:0.70, rel:0.55, rv:0.40, dr:0.12, ch:0.50, dl:0.20 },
  { name: "Cold",       c:0.15, r:0.50, a:0.10, d:0.25, s:0.40, rel:0.20, rv:0.02, dr:0.40, ch:0.02, dl:0.02 },
  { name: "Lush",       c:0.60, r:0.25, a:0.65, d:0.60, s:0.80, rel:0.75, rv:0.80, dr:0.05, ch:0.90, dl:0.35 },
  { name: "Hollow",     c:0.30, r:0.08, a:0.35, d:0.45, s:0.55, rel:0.45, rv:0.35, dr:0.05, ch:0.15, dl:0.15 },
  { name: "Glassy",     c:0.90, r:0.05, a:0.55, d:0.70, s:0.30, rel:0.80, rv:0.60, dr:0.00, ch:0.20, dl:0.30 },
  { name: "Resonant",   c:0.55, r:0.95, a:0.20, d:0.35, s:0.45, rel:0.30, rv:0.20, dr:0.25, ch:0.10, dl:0.10 },
  { name: "Saturated",  c:0.60, r:0.50, a:0.05, d:0.30, s:0.70, rel:0.25, rv:0.15, dr:0.98, ch:0.05, dl:0.05 },
  { name: "Filtered",   c:0.02, r:0.35, a:0.30, d:0.45, s:0.65, rel:0.50, rv:0.30, dr:0.10, ch:0.20, dl:0.15 },
  { name: "Open",       c:0.98, r:0.20, a:0.20, d:0.40, s:0.60, rel:0.45, rv:0.25, dr:0.08, ch:0.35, dl:0.10 },
  { name: "Evolving",   c:0.40, r:0.30, a:0.98, d:0.70, s:0.80, rel:0.85, rv:0.75, dr:0.05, ch:0.55, dl:0.35 },
  { name: "Snappy",     c:0.65, r:0.55, a:0.00, d:0.05, s:0.05, rel:0.08, rv:0.10, dr:0.50, ch:0.05, dl:0.02 },
  { name: "Swell",      c:0.50, r:0.20, a:0.92, d:0.60, s:0.85, rel:0.90, rv:0.70, dr:0.02, ch:0.60, dl:0.40 },
  { name: "Stab",       c:0.70, r:0.65, a:0.00, d:0.08, s:0.00, rel:0.05, rv:0.10, dr:0.55, ch:0.05, dl:0.05 },
  { name: "Plucky",     c:0.70, r:0.45, a:0.02, d:0.30, s:0.15, rel:0.20, rv:0.25, dr:0.15, ch:0.20, dl:0.12 },
  { name: "Drone",      c:0.25, r:0.15, a:0.60, d:0.50, s:0.99, rel:0.99, rv:0.70, dr:0.05, ch:0.35, dl:0.25 },
  { name: "Aggressive", c:0.75, r:0.70, a:0.01, d:0.15, s:0.80, rel:0.15, rv:0.10, dr:0.80, ch:0.05, dl:0.05 },
  { name: "Mellow",     c:0.40, r:0.10, a:0.55, d:0.55, s:0.72, rel:0.60, rv:0.45, dr:0.00, ch:0.40, dl:0.18 },
  { name: "Euphoric",   c:0.75, r:0.40, a:0.40, d:0.50, s:0.85, rel:0.70, rv:0.65, dr:0.12, ch:0.80, dl:0.30 },
  { name: "Subtle",     c:0.50, r:0.15, a:0.40, d:0.45, s:0.65, rel:0.50, rv:0.30, dr:0.02, ch:0.10, dl:0.08 },
  { name: "Cavernous",  c:0.20, r:0.25, a:0.70, d:0.60, s:0.75, rel:0.85, rv:0.98, dr:0.10, ch:0.25, dl:0.45 },
  { name: "Intimate",   c:0.55, r:0.30, a:0.25, d:0.40, s:0.60, rel:0.35, rv:0.05, dr:0.15, ch:0.15, dl:0.05 },
  { name: "Massive",    c:0.35, r:0.45, a:0.20, d:0.50, s:0.85, rel:0.70, rv:0.60, dr:0.50, ch:0.70, dl:0.30 },
  { name: "Gentle",     c:0.45, r:0.08, a:0.70, d:0.65, s:0.75, rel:0.75, rv:0.55, dr:0.00, ch:0.35, dl:0.20 },
  { name: "Razor",      c:0.90, r:0.85, a:0.00, d:0.10, s:0.50, rel:0.10, rv:0.05, dr:0.60, ch:0.00, dl:0.02 },
  { name: "Ghostly",    c:0.20, r:0.20, a:0.85, d:0.70, s:0.60, rel:0.90, rv:0.95, dr:0.02, ch:0.55, dl:0.50 },
  { name: "Electric",   c:0.80, r:0.75, a:0.05, d:0.30, s:0.65, rel:0.30, rv:0.20, dr:0.70, ch:0.20, dl:0.10 },
  { name: "Pillowy",    c:0.40, r:0.10, a:0.75, d:0.70, s:0.88, rel:0.85, rv:0.75, dr:0.00, ch:0.65, dl:0.30 },
  { name: "Glitchy",    c:0.85, r:0.80, a:0.00, d:0.05, s:0.20, rel:0.05, rv:0.35, dr:0.65, ch:0.15, dl:0.45 },
  { name: "Underwater", c:0.08, r:0.60, a:0.50, d:0.55, s:0.70, rel:0.65, rv:0.80, dr:0.05, ch:0.25, dl:0.20 },
  { name: "Metallic",   c:0.75, r:0.70, a:0.02, d:0.35, s:0.25, rel:0.25, rv:0.20, dr:0.55, ch:0.05, dl:0.08 },
];

// ─── 40+ sound templates ──────────────────────────────────────────────────────

const TEMPLATES: SoundTemplate[] = [
  {
    name: "Sub Bass", description: "Deep sine sub with sharp transient", genre: "trap",
    matchTags: ["trap","hip-hop","rap","bass","808","sub","heavy","deep","grime","drill","phonk","dark trap"],
    oscTypes: ["sine"],
    cutoff:{min:80,max:220}, resonance:{min:0.8,max:2.5}, attack:{min:0.001,max:0.005},
    decay:{min:0.4,max:1.2}, sustain:{min:0,max:0.1}, release:{min:0.3,max:0.7},
    reverbSize:{min:0.05,max:0.12}, reverbWet:{min:0,max:0.06}, drive:{min:0.02,max:0.12}, chorus:{min:0,max:0.02}, delayMix:{min:0,max:0.03},
  },
  {
    name: "Deep Resonant Bass", description: "Resonant filtered bass — club-ready thump", genre: "techno",
    matchTags: ["techno","house","electronic","bass","deep","underground","minimal","club","dark"],
    oscTypes: ["square","saw"],
    cutoff:{min:200,max:500}, resonance:{min:1.5,max:4.5}, attack:{min:0.002,max:0.02},
    decay:{min:0.2,max:0.5}, sustain:{min:0.3,max:0.7}, release:{min:0.2,max:0.6},
    reverbSize:{min:0.05,max:0.2}, reverbWet:{min:0,max:0.1}, drive:{min:0.2,max:0.55}, chorus:{min:0,max:0.06}, delayMix:{min:0,max:0.05},
  },
  {
    name: "Acid Bass", description: "TB-303 acid bass — squelchy and hypnotic", genre: "acid",
    matchTags: ["acid","techno","electronic","rave","303","acid house","idm","gabber","acid techno"],
    oscTypes: ["saw"],
    cutoff:{min:1500,max:4500}, resonance:{min:3.5,max:8.0}, attack:{min:0.001,max:0.005},
    decay:{min:0.15,max:0.5}, sustain:{min:0.05,max:0.2}, release:{min:0.1,max:0.3},
    reverbSize:{min:0.1,max:0.3}, reverbWet:{min:0.05,max:0.18}, drive:{min:0.2,max:0.5}, chorus:{min:0,max:0.1}, delayMix:{min:0.1,max:0.3},
  },
  {
    name: "Phonk Bass", description: "Raw distorted Memphis bass", genre: "phonk",
    matchTags: ["phonk","memphis","dark","distorted","aggressive","raw","gritty","trap"],
    oscTypes: ["square"],
    cutoff:{min:2500,max:8000}, resonance:{min:1.0,max:3.0}, attack:{min:0.001,max:0.005},
    decay:{min:0.2,max:0.6}, sustain:{min:0.1,max:0.3}, release:{min:0.2,max:0.6},
    reverbSize:{min:0.1,max:0.25}, reverbWet:{min:0.05,max:0.15}, drive:{min:0.55,max:0.95}, chorus:{min:0,max:0.1}, delayMix:{min:0.05,max:0.2},
  },
  {
    name: "Wobble Bass", description: "Dubstep wobble — bass music staple", genre: "dubstep",
    matchTags: ["dubstep","bass music","brostep","filthy","heavy","wub","bass","electronic"],
    oscTypes: ["saw","square"],
    cutoff:{min:400,max:2200}, resonance:{min:1.5,max:4.5}, attack:{min:0.001,max:0.01},
    decay:{min:0.3,max:0.8}, sustain:{min:0.4,max:0.8}, release:{min:0.3,max:0.7},
    reverbSize:{min:0.15,max:0.35}, reverbWet:{min:0.08,max:0.22}, drive:{min:0.3,max:0.75}, chorus:{min:0.1,max:0.3}, delayMix:{min:0.05,max:0.15},
  },
  {
    name: "UK Minimal Bass", description: "Sparse bass — UK garage and grime", genre: "uk garage",
    matchTags: ["uk garage","grime","uk bass","uk","jungle","2-step","electronic","bass"],
    oscTypes: ["sine","square"],
    cutoff:{min:150,max:420}, resonance:{min:0.5,max:2.0}, attack:{min:0.001,max:0.01},
    decay:{min:0.3,max:0.8}, sustain:{min:0,max:0.2}, release:{min:0.2,max:0.5},
    reverbSize:{min:0.1,max:0.3}, reverbWet:{min:0.05,max:0.15}, drive:{min:0.1,max:0.3}, chorus:{min:0,max:0.05}, delayMix:{min:0.1,max:0.3},
  },
  {
    name: "Neurofunk Bass", description: "Distorted neuro bass — dark DnB", genre: "drum and bass",
    matchTags: ["drum and bass","dnb","neurofunk","neuro","dark dnb","jungle","breakbeat"],
    oscTypes: ["saw","square"],
    cutoff:{min:300,max:1500}, resonance:{min:2.0,max:5.0}, attack:{min:0.001,max:0.008},
    decay:{min:0.1,max:0.4}, sustain:{min:0.2,max:0.6}, release:{min:0.15,max:0.5},
    reverbSize:{min:0.1,max:0.3}, reverbWet:{min:0.05,max:0.15}, drive:{min:0.4,max:0.8}, chorus:{min:0.05,max:0.2}, delayMix:{min:0.05,max:0.15},
  },
  {
    name: "Saw Lead", description: "Crisp saw lead — punchy and melodic", genre: "house",
    matchTags: ["house","disco","funk","pop","dance","french house","bright","melodic","groove"],
    oscTypes: ["saw"],
    cutoff:{min:4000,max:12000}, resonance:{min:0.4,max:1.2}, attack:{min:0.002,max:0.02},
    decay:{min:0.1,max:0.4}, sustain:{min:0.4,max:0.8}, release:{min:0.2,max:0.6},
    reverbSize:{min:0.15,max:0.35}, reverbWet:{min:0.05,max:0.2}, drive:{min:0.02,max:0.15}, chorus:{min:0.1,max:0.4}, delayMix:{min:0.02,max:0.12},
  },
  {
    name: "Trap Lead", description: "Dark minor lead — menacing trap atmosphere", genre: "trap",
    matchTags: ["trap","dark","rap","hip-hop","ominous","moody","aggressive","menacing","dark trap","cloud rap"],
    oscTypes: ["saw","square"],
    cutoff:{min:1000,max:3800}, resonance:{min:0.5,max:1.5}, attack:{min:0.005,max:0.04},
    decay:{min:0.2,max:0.6}, sustain:{min:0.5,max:0.85}, release:{min:0.5,max:1.5},
    reverbSize:{min:0.4,max:0.72}, reverbWet:{min:0.2,max:0.45}, drive:{min:0.1,max:0.3}, chorus:{min:0.1,max:0.35}, delayMix:{min:0.1,max:0.3},
  },
  {
    name: "Supersaw Lead", description: "Wide detuned supersaw — uplifting and euphoric", genre: "trance",
    matchTags: ["trance","edm","festival","euphoric","uplifting","rave","progressive trance","psytrance","big room"],
    oscTypes: ["saw"],
    cutoff:{min:5000,max:16000}, resonance:{min:0.4,max:1.0}, attack:{min:0.02,max:0.1},
    decay:{min:0.2,max:0.5}, sustain:{min:0.75,max:0.97}, release:{min:1.0,max:3.0},
    reverbSize:{min:0.4,max:0.7}, reverbWet:{min:0.25,max:0.5}, drive:{min:0.02,max:0.1}, chorus:{min:0.75,max:0.99}, delayMix:{min:0.08,max:0.2},
  },
  {
    name: "Darksynth Lead", description: "Distorted industrial lead — darksynth aggression", genre: "darksynth",
    matchTags: ["darksynth","industrial","metal","aggressive","heavy","noise","power electronics","synthwave","dark"],
    oscTypes: ["square"],
    cutoff:{min:6000,max:18000}, resonance:{min:1.5,max:4.5}, attack:{min:0.001,max:0.008},
    decay:{min:0.05,max:0.2}, sustain:{min:0.7,max:0.95}, release:{min:0.1,max:0.5},
    reverbSize:{min:0.1,max:0.3}, reverbWet:{min:0.05,max:0.15}, drive:{min:0.65,max:0.99}, chorus:{min:0,max:0.15}, delayMix:{min:0.05,max:0.15},
  },
  {
    name: "R&B Lead", description: "Smooth melodic lead — R&B and neo-soul", genre: "r&b",
    matchTags: ["r&b","neo-soul","soul","smooth","melodic","emotional","pop","romantic","jazz"],
    oscTypes: ["saw","sine"],
    cutoff:{min:3000,max:9000}, resonance:{min:0.3,max:0.9}, attack:{min:0.01,max:0.06},
    decay:{min:0.2,max:0.7}, sustain:{min:0.6,max:0.9}, release:{min:0.8,max:2.0},
    reverbSize:{min:0.3,max:0.6}, reverbWet:{min:0.2,max:0.45}, drive:{min:0,max:0.1}, chorus:{min:0.15,max:0.5}, delayMix:{min:0.1,max:0.3},
  },
  {
    name: "Future Bass Lead", description: "Bright filtered lead — future bass energy", genre: "future bass",
    matchTags: ["future bass","edm","emotional","wave","bright","uplifting","electronic","melodic"],
    oscTypes: ["saw"],
    cutoff:{min:3000,max:9000}, resonance:{min:0.5,max:1.5}, attack:{min:0.02,max:0.1},
    decay:{min:0.3,max:0.7}, sustain:{min:0.7,max:0.92}, release:{min:1.0,max:2.5},
    reverbSize:{min:0.35,max:0.62}, reverbWet:{min:0.2,max:0.45}, drive:{min:0.05,max:0.15}, chorus:{min:0.5,max:0.95}, delayMix:{min:0.1,max:0.25},
  },
  {
    name: "IDM Lead", description: "Glitchy abstract lead — IDM and experimental", genre: "idm",
    matchTags: ["idm","experimental","glitch","abstract","complex","braindance","drill and bass","electronic"],
    oscTypes: ["square","saw"],
    cutoff:{min:5000,max:18000}, resonance:{min:2.0,max:7.5}, attack:{min:0.001,max:0.005},
    decay:{min:0.05,max:0.15}, sustain:{min:0.1,max:0.4}, release:{min:0.05,max:0.2},
    reverbSize:{min:0.2,max:0.5}, reverbWet:{min:0.1,max:0.3}, drive:{min:0.3,max:0.7}, chorus:{min:0.1,max:0.3}, delayMix:{min:0.2,max:0.5},
  },
  {
    name: "Acid Lead", description: "303-inspired acid lead — rave energy", genre: "acid techno",
    matchTags: ["acid","techno","rave","acid house","gabber","hardstyle","electronic"],
    oscTypes: ["saw"],
    cutoff:{min:2000,max:12000}, resonance:{min:4.0,max:9.0}, attack:{min:0.001,max:0.01},
    decay:{min:0.1,max:0.4}, sustain:{min:0.05,max:0.3}, release:{min:0.1,max:0.4},
    reverbSize:{min:0.1,max:0.3}, reverbWet:{min:0.05,max:0.2}, drive:{min:0.25,max:0.6}, chorus:{min:0,max:0.1}, delayMix:{min:0.1,max:0.35},
  },
  {
    name: "Synthwave Lead", description: "80s arpeggiated lead — retrowave and neon", genre: "synthwave",
    matchTags: ["synthwave","retrowave","80s","retro","outrun","chillwave","neon","vaporwave"],
    oscTypes: ["saw"],
    cutoff:{min:3000,max:10000}, resonance:{min:0.6,max:1.5}, attack:{min:0.01,max:0.05},
    decay:{min:0.2,max:0.5}, sustain:{min:0.65,max:0.9}, release:{min:0.5,max:1.5},
    reverbSize:{min:0.3,max:0.55}, reverbWet:{min:0.15,max:0.4}, drive:{min:0.1,max:0.35}, chorus:{min:0.2,max:0.55}, delayMix:{min:0.2,max:0.4},
  },
  {
    name: "Dark Atmospheric Pad", description: "Slow-evolving dark pad — cinematic", genre: "dark ambient",
    matchTags: ["dark","atmospheric","ambient","cinematic","ominous","trap","dark ambient","film score","moody","dark trap","cloud rap"],
    oscTypes: ["saw"],
    cutoff:{min:600,max:2200}, resonance:{min:0.3,max:0.7}, attack:{min:0.5,max:2.2},
    decay:{min:0.8,max:1.5}, sustain:{min:0.7,max:0.93}, release:{min:2.0,max:5.5},
    reverbSize:{min:0.75,max:0.99}, reverbWet:{min:0.5,max:0.82}, drive:{min:0.05,max:0.22}, chorus:{min:0.2,max:0.5}, delayMix:{min:0.1,max:0.35},
  },
  {
    name: "Lo-Fi Pad", description: "Warm filtered pad — lo-fi hip-hop comfort", genre: "lo-fi",
    matchTags: ["lofi","lo-fi","chill","hip-hop","warm","vintage","dusty","mellow","nostalgic","chillhop"],
    oscTypes: ["saw"],
    cutoff:{min:1200,max:3000}, resonance:{min:0.25,max:0.55}, attack:{min:0.3,max:0.9},
    decay:{min:0.8,max:1.5}, sustain:{min:0.6,max:0.88}, release:{min:1.5,max:3.0},
    reverbSize:{min:0.45,max:0.72}, reverbWet:{min:0.3,max:0.55}, drive:{min:0.08,max:0.22}, chorus:{min:0.4,max:0.72}, delayMix:{min:0.1,max:0.3},
  },
  {
    name: "Shimmer Pad", description: "Angelic shimmer pad with hall reverb", genre: "ambient",
    matchTags: ["ethereal","ambient","spiritual","choir","angelic","dreamy","lush","cinematic","neo-classical","shoegaze","post-rock"],
    oscTypes: ["sine"],
    cutoff:{min:2500,max:7000}, resonance:{min:0.2,max:0.5}, attack:{min:1.0,max:3.0},
    decay:{min:1.0,max:2.5}, sustain:{min:0.7,max:0.96}, release:{min:3.0,max:7.0},
    reverbSize:{min:0.85,max:0.99}, reverbWet:{min:0.65,max:0.92}, drive:{min:0,max:0.05}, chorus:{min:0.3,max:0.65}, delayMix:{min:0.2,max:0.4},
  },
  {
    name: "Drone Pad", description: "Sustained dark drone — meditative and ominous", genre: "dark ambient",
    matchTags: ["dark ambient","drone","ambient","eerie","cold","noise","experimental","minimal"],
    oscTypes: ["sine"],
    cutoff:{min:300,max:1000}, resonance:{min:0.3,max:0.6}, attack:{min:1.0,max:2.8},
    decay:{min:0.8,max:1.5}, sustain:{min:0.85,max:0.99}, release:{min:2.5,max:6.5},
    reverbSize:{min:0.82,max:0.99}, reverbWet:{min:0.62,max:0.88}, drive:{min:0,max:0.1}, chorus:{min:0.05,max:0.2}, delayMix:{min:0.15,max:0.35},
  },
  {
    name: "Melodic Chord Pad", description: "Warm chord pad — melodic house emotion", genre: "melodic house",
    matchTags: ["melodic house","house","melodic","emotional","uplifting","indie dance","progressive house","melodic techno"],
    oscTypes: ["saw"],
    cutoff:{min:3000,max:8000}, resonance:{min:0.4,max:0.8}, attack:{min:0.2,max:0.6},
    decay:{min:0.5,max:1.2}, sustain:{min:0.7,max:0.92}, release:{min:1.5,max:3.0},
    reverbSize:{min:0.5,max:0.78}, reverbWet:{min:0.35,max:0.62}, drive:{min:0.02,max:0.1}, chorus:{min:0.5,max:0.88}, delayMix:{min:0.1,max:0.25},
  },
  {
    name: "Synthwave Pad", description: "80s synthwave pad — neon-drenched nostalgia", genre: "synthwave",
    matchTags: ["synthwave","retrowave","80s","retro","vaporwave","chillwave","neon","outrun"],
    oscTypes: ["saw"],
    cutoff:{min:1800,max:5500}, resonance:{min:0.5,max:1.05}, attack:{min:0.2,max:0.85},
    decay:{min:0.5,max:1.5}, sustain:{min:0.65,max:0.92}, release:{min:1.0,max:2.5},
    reverbSize:{min:0.4,max:0.68}, reverbWet:{min:0.25,max:0.52}, drive:{min:0.15,max:0.42}, chorus:{min:0.3,max:0.68}, delayMix:{min:0.2,max:0.4},
  },
  {
    name: "Vaporwave Pad", description: "Washed-out smooth pad — aesthetic nostalgia", genre: "vaporwave",
    matchTags: ["vaporwave","aesthetic","smooth","nostalgic","dreamy","chill","lofi","slowed"],
    oscTypes: ["saw"],
    cutoff:{min:2000,max:5500}, resonance:{min:0.25,max:0.5}, attack:{min:0.8,max:2.2},
    decay:{min:1.5,max:3.0}, sustain:{min:0.7,max:0.92}, release:{min:3.0,max:6.0},
    reverbSize:{min:0.82,max:0.99}, reverbWet:{min:0.62,max:0.88}, drive:{min:0,max:0.05}, chorus:{min:0.4,max:0.72}, delayMix:{min:0.3,max:0.5},
  },
  {
    name: "Trip-Hop Pad", description: "Heavy cinematic pad — trip-hop depth", genre: "trip-hop",
    matchTags: ["trip-hop","dark","cinematic","heavy","mysterious","atmospheric","downtempo"],
    oscTypes: ["saw","sine"],
    cutoff:{min:800,max:2800}, resonance:{min:0.4,max:0.9}, attack:{min:0.4,max:1.2},
    decay:{min:0.8,max:1.5}, sustain:{min:0.7,max:0.92}, release:{min:2.0,max:4.5},
    reverbSize:{min:0.62,max:0.88}, reverbWet:{min:0.45,max:0.72}, drive:{min:0.1,max:0.3}, chorus:{min:0.15,max:0.45}, delayMix:{min:0.15,max:0.35},
  },
  {
    name: "Hauntology Pad", description: "Degraded washed-out pad — deeply nostalgic", genre: "ambient",
    matchTags: ["hauntology","nostalgic","hazy","vintage","degraded","experimental","idm","folktronica","organic"],
    oscTypes: ["saw"],
    cutoff:{min:1000,max:3000}, resonance:{min:0.35,max:0.65}, attack:{min:0.6,max:1.8},
    decay:{min:1.0,max:2.0}, sustain:{min:0.65,max:0.88}, release:{min:2.5,max:5.0},
    reverbSize:{min:0.7,max:0.92}, reverbWet:{min:0.5,max:0.75}, drive:{min:0.12,max:0.28}, chorus:{min:0.35,max:0.62}, delayMix:{min:0.25,max:0.48},
  },
  {
    name: "Neo-Soul Pad", description: "Warm jazz-tinged pad — neo-soul warmth", genre: "neo-soul",
    matchTags: ["neo-soul","r&b","jazz","soul","conscious","boom bap","organic","smooth","hip-hop"],
    oscTypes: ["saw","sine"],
    cutoff:{min:2000,max:5500}, resonance:{min:0.3,max:0.65}, attack:{min:0.25,max:0.75},
    decay:{min:0.8,max:1.5}, sustain:{min:0.65,max:0.88}, release:{min:1.5,max:3.0},
    reverbSize:{min:0.45,max:0.7}, reverbWet:{min:0.28,max:0.52}, drive:{min:0.08,max:0.2}, chorus:{min:0.35,max:0.65}, delayMix:{min:0.1,max:0.28},
  },
  {
    name: "House Stab", description: "Classic house stab — disco groove", genre: "house",
    matchTags: ["house","disco","garage","groove","funk","soul","dance","chicago house","deep house"],
    oscTypes: ["saw"],
    cutoff:{min:3000,max:9000}, resonance:{min:0.8,max:2.8}, attack:{min:0.001,max:0.005},
    decay:{min:0.1,max:0.35}, sustain:{min:0,max:0.15}, release:{min:0.15,max:0.45},
    reverbSize:{min:0.15,max:0.38}, reverbWet:{min:0.08,max:0.22}, drive:{min:0.1,max:0.32}, chorus:{min:0.05,max:0.22}, delayMix:{min:0.05,max:0.18},
  },
  {
    name: "Techno Stab", description: "Minimal industrial stab — techno percussive hit", genre: "techno",
    matchTags: ["techno","minimal","industrial","underground","percussive","hard techno","berlin"],
    oscTypes: ["square"],
    cutoff:{min:2000,max:8000}, resonance:{min:1.5,max:4.5}, attack:{min:0.001,max:0.003},
    decay:{min:0.08,max:0.22}, sustain:{min:0,max:0.1}, release:{min:0.1,max:0.32},
    reverbSize:{min:0.1,max:0.28}, reverbWet:{min:0.03,max:0.12}, drive:{min:0.32,max:0.72}, chorus:{min:0,max:0.05}, delayMix:{min:0.02,max:0.12},
  },
  {
    name: "Trap Pluck", description: "Short bright pluck — modern trap melodics", genre: "trap",
    matchTags: ["trap","hip-hop","rap","bright","bounce","atlanta","modern","melodic trap","plugg"],
    oscTypes: ["saw"],
    cutoff:{min:4000,max:14000}, resonance:{min:0.4,max:1.0}, attack:{min:0.001,max:0.003},
    decay:{min:0.1,max:0.38}, sustain:{min:0,max:0.12}, release:{min:0.15,max:0.55},
    reverbSize:{min:0.2,max:0.48}, reverbWet:{min:0.1,max:0.28}, drive:{min:0.02,max:0.12}, chorus:{min:0.1,max:0.38}, delayMix:{min:0.1,max:0.28},
  },
  {
    name: "Funk Pluck", description: "Funky resonant pluck — disco and house groove", genre: "funk",
    matchTags: ["funk","disco","french house","electro","soul","boogie","dance","groove"],
    oscTypes: ["saw"],
    cutoff:{min:5000,max:16000}, resonance:{min:0.6,max:1.6}, attack:{min:0.001,max:0.006},
    decay:{min:0.15,max:0.42}, sustain:{min:0.3,max:0.68}, release:{min:0.2,max:0.52},
    reverbSize:{min:0.15,max:0.38}, reverbWet:{min:0.05,max:0.2}, drive:{min:0.05,max:0.22}, chorus:{min:0.1,max:0.38}, delayMix:{min:0.03,max:0.12},
  },
  {
    name: "Synth-Pop Arp", description: "Driving arpeggio — synth-pop and electropop", genre: "synth-pop",
    matchTags: ["synth-pop","electropop","pop","new wave","dance-pop","80s","retro","k-pop"],
    oscTypes: ["saw","square"],
    cutoff:{min:4000,max:14000}, resonance:{min:0.5,max:1.5}, attack:{min:0.001,max:0.01},
    decay:{min:0.1,max:0.35}, sustain:{min:0.3,max:0.72}, release:{min:0.2,max:0.6},
    reverbSize:{min:0.2,max:0.45}, reverbWet:{min:0.1,max:0.28}, drive:{min:0.02,max:0.15}, chorus:{min:0.15,max:0.5}, delayMix:{min:0.1,max:0.3},
  },
  {
    name: "DnB Stab", description: "High-energy stab — jungle and drum & bass", genre: "drum and bass",
    matchTags: ["jungle","drum and bass","dnb","rave","hardcore","breakbeat","electronic"],
    oscTypes: ["saw","square"],
    cutoff:{min:3000,max:10000}, resonance:{min:1.0,max:3.2}, attack:{min:0.001,max:0.005},
    decay:{min:0.08,max:0.28}, sustain:{min:0.2,max:0.62}, release:{min:0.1,max:0.42},
    reverbSize:{min:0.1,max:0.32}, reverbWet:{min:0.05,max:0.18}, drive:{min:0.2,max:0.52}, chorus:{min:0,max:0.15}, delayMix:{min:0.05,max:0.18},
  },
  {
    name: "Noise Texture", description: "Abrasive noise texture — industrial and experimental", genre: "industrial",
    matchTags: ["industrial","noise","power electronics","harsh noise","experimental","dark","aggressive"],
    oscTypes: ["square"],
    cutoff:{min:3000,max:18000}, resonance:{min:3.0,max:8.5}, attack:{min:0.1,max:0.5},
    decay:{min:0.3,max:1.0}, sustain:{min:0.4,max:0.88}, release:{min:0.5,max:2.0},
    reverbSize:{min:0.3,max:0.62}, reverbWet:{min:0.1,max:0.32}, drive:{min:0.62,max:0.99}, chorus:{min:0.1,max:0.3}, delayMix:{min:0.1,max:0.4},
  },
  {
    name: "Organic Texture", description: "Warm organic texture — folktronica and experimental", genre: "ambient",
    matchTags: ["folktronica","organic","experimental","ambient","acoustic","electronic","indie"],
    oscTypes: ["sine","saw"],
    cutoff:{min:1500,max:5500}, resonance:{min:0.3,max:0.7}, attack:{min:0.5,max:1.5},
    decay:{min:1.0,max:2.2}, sustain:{min:0.5,max:0.82}, release:{min:2.0,max:4.5},
    reverbSize:{min:0.55,max:0.82}, reverbWet:{min:0.4,max:0.68}, drive:{min:0.02,max:0.12}, chorus:{min:0.3,max:0.68}, delayMix:{min:0.2,max:0.45},
  },
  {
    name: "Bell Shimmer", description: "Crystalline bell shimmer — ambient and neoclassical", genre: "ambient",
    matchTags: ["ambient","neoclassical","ethereal","delicate","film score","meditative","piano","classical"],
    oscTypes: ["sine"],
    cutoff:{min:3000,max:9000}, resonance:{min:0.2,max:0.5}, attack:{min:0.3,max:1.0},
    decay:{min:1.5,max:3.8}, sustain:{min:0.2,max:0.52}, release:{min:3.0,max:7.0},
    reverbSize:{min:0.72,max:0.96}, reverbWet:{min:0.5,max:0.82}, drive:{min:0,max:0.04}, chorus:{min:0.15,max:0.42}, delayMix:{min:0.2,max:0.48},
  },
  {
    name: "Hip-Hop Organ", description: "Gritty organ tone — East Coast hip-hop", genre: "hip-hop",
    matchTags: ["boom bap","hip-hop","east coast","jazz","soul","classic hip-hop","golden age","rap"],
    oscTypes: ["square"],
    cutoff:{min:1800,max:5500}, resonance:{min:0.4,max:1.0}, attack:{min:0.003,max:0.02},
    decay:{min:0.3,max:0.8}, sustain:{min:0.55,max:0.88}, release:{min:0.5,max:1.2},
    reverbSize:{min:0.2,max:0.48}, reverbWet:{min:0.1,max:0.28}, drive:{min:0.2,max:0.48}, chorus:{min:0.08,max:0.28}, delayMix:{min:0.05,max:0.18},
  },
  {
    name: "Afrobeats Bell", description: "Bright percussive bell — afrobeats and amapiano", genre: "afrobeats",
    matchTags: ["afrobeats","afropop","amapiano","dancehall","tropical","groove","african","world music"],
    oscTypes: ["sine","saw"],
    cutoff:{min:4000,max:12000}, resonance:{min:0.4,max:1.0}, attack:{min:0.001,max:0.005},
    decay:{min:0.2,max:0.52}, sustain:{min:0.3,max:0.68}, release:{min:0.3,max:0.82},
    reverbSize:{min:0.2,max:0.48}, reverbWet:{min:0.1,max:0.28}, drive:{min:0.05,max:0.18}, chorus:{min:0.2,max:0.52}, delayMix:{min:0.1,max:0.28},
  },
  {
    name: "K-Pop Synth", description: "Bright catchy synth — K-pop and electropop energy", genre: "k-pop",
    matchTags: ["k-pop","j-pop","synth-pop","electropop","pop","bright","catchy","dance-pop"],
    oscTypes: ["saw"],
    cutoff:{min:5000,max:16000}, resonance:{min:0.3,max:0.82}, attack:{min:0.002,max:0.015},
    decay:{min:0.15,max:0.52}, sustain:{min:0.5,max:0.88}, release:{min:0.3,max:0.82},
    reverbSize:{min:0.2,max:0.48}, reverbWet:{min:0.1,max:0.28}, drive:{min:0.02,max:0.12}, chorus:{min:0.2,max:0.58}, delayMix:{min:0.1,max:0.28},
  },
  {
    name: "Post-Dubstep Tone", description: "Sparse digital tone — post-dubstep minimalism", genre: "post-dubstep",
    matchTags: ["post-dubstep","uk bass","bass music","minimal","digital","emotional","electronic"],
    oscTypes: ["square","sine"],
    cutoff:{min:2500,max:8000}, resonance:{min:0.4,max:1.05}, attack:{min:0.005,max:0.035},
    decay:{min:0.3,max:0.72}, sustain:{min:0.4,max:0.78}, release:{min:1.0,max:2.5},
    reverbSize:{min:0.52,max:0.78}, reverbWet:{min:0.35,max:0.62}, drive:{min:0.02,max:0.12}, chorus:{min:0.1,max:0.32}, delayMix:{min:0.25,max:0.52},
  },
  {
    name: "Reggaeton Synth", description: "Punchy dembow synth — reggaeton and Latin trap", genre: "reggaeton",
    matchTags: ["reggaeton","latin trap","dembow","latin","urban","dancehall","tropical"],
    oscTypes: ["saw","square"],
    cutoff:{min:3000,max:9000}, resonance:{min:0.7,max:2.0}, attack:{min:0.001,max:0.008},
    decay:{min:0.1,max:0.4}, sustain:{min:0.3,max:0.72}, release:{min:0.2,max:0.6},
    reverbSize:{min:0.15,max:0.4}, reverbWet:{min:0.08,max:0.25}, drive:{min:0.15,max:0.42}, chorus:{min:0.1,max:0.38}, delayMix:{min:0.05,max:0.18},
  },
  {
    name: "Shoegaze Wall", description: "Dense wall of sound — shoegaze and dream pop", genre: "shoegaze",
    matchTags: ["shoegaze","dream pop","indie","wall of sound","noise pop","alternative","post-rock"],
    oscTypes: ["saw"],
    cutoff:{min:2000,max:7000}, resonance:{min:0.3,max:0.7}, attack:{min:0.1,max:0.5},
    decay:{min:0.5,max:1.2}, sustain:{min:0.65,max:0.92}, release:{min:2.0,max:5.0},
    reverbSize:{min:0.75,max:0.99}, reverbWet:{min:0.55,max:0.85}, drive:{min:0.15,max:0.45}, chorus:{min:0.55,max:0.95}, delayMix:{min:0.2,max:0.5},
  },
  {
    name: "Jazz Tone", description: "Smooth degraded tone — lo-fi jazz and hip-hop", genre: "lo-fi",
    matchTags: ["jazz","lofi","lo-fi","smooth","mellow","chillhop","hip-hop","nostalgic"],
    oscTypes: ["sine"],
    cutoff:{min:2000,max:5500}, resonance:{min:0.25,max:0.6}, attack:{min:0.15,max:0.5},
    decay:{min:0.8,max:1.8}, sustain:{min:0.5,max:0.82}, release:{min:1.2,max:2.5},
    reverbSize:{min:0.45,max:0.72}, reverbWet:{min:0.32,max:0.58}, drive:{min:0.08,max:0.22}, chorus:{min:0.28,max:0.55}, delayMix:{min:0.12,max:0.32},
  },
  {
    name: "Plugg Lead", description: "Soft melodic lead — plugg and rage trap", genre: "plugg",
    matchTags: ["plugg","rage","trap","melodic trap","cloud rap","hyperpop","bedroom pop","atmospheric"],
    oscTypes: ["sine","saw"],
    cutoff:{min:2000,max:7000}, resonance:{min:0.2,max:0.7}, attack:{min:0.01,max:0.08},
    decay:{min:0.3,max:0.8}, sustain:{min:0.5,max:0.88}, release:{min:1.0,max:2.5},
    reverbSize:{min:0.55,max:0.82}, reverbWet:{min:0.4,max:0.72}, drive:{min:0.0,max:0.1}, chorus:{min:0.3,max:0.68}, delayMix:{min:0.2,max:0.45},
  },
  {
    name: "Metal Riff", description: "Searing distorted lead — heavy metal and metalcore", genre: "metal",
    matchTags: ["metal","heavy metal","metalcore","death metal","doom metal","hardcore","rock","djent","thrash"],
    oscTypes: ["square","saw"],
    cutoff:{min:3000,max:12000}, resonance:{min:1.0,max:3.5}, attack:{min:0.001,max:0.005},
    decay:{min:0.05,max:0.2}, sustain:{min:0.7,max:0.95}, release:{min:0.1,max:0.5},
    reverbSize:{min:0.1,max:0.32}, reverbWet:{min:0.05,max:0.18}, drive:{min:0.72,max:0.99}, chorus:{min:0.1,max:0.35}, delayMix:{min:0.05,max:0.2},
  },
  {
    name: "Gospel Organ", description: "Warm full organ — gospel and church soul", genre: "gospel",
    matchTags: ["gospel","soul","funk","blues","r&b","classic soul","choir","spiritual","christian"],
    oscTypes: ["square"],
    cutoff:{min:2500,max:7000}, resonance:{min:0.3,max:0.8}, attack:{min:0.005,max:0.03},
    decay:{min:0.4,max:1.0}, sustain:{min:0.75,max:0.96}, release:{min:0.8,max:2.0},
    reverbSize:{min:0.35,max:0.62}, reverbWet:{min:0.22,max:0.48}, drive:{min:0.18,max:0.45}, chorus:{min:0.12,max:0.4}, delayMix:{min:0.05,max:0.18},
  },
  {
    name: "Reggae Bass", description: "Rubbery skank bass — reggae and dub", genre: "reggae",
    matchTags: ["reggae","dub","dancehall","ska","roots","jamaican","bass","tropical"],
    oscTypes: ["sine","square"],
    cutoff:{min:100,max:350}, resonance:{min:0.4,max:1.5}, attack:{min:0.001,max:0.008},
    decay:{min:0.3,max:0.8}, sustain:{min:0.1,max:0.4}, release:{min:0.3,max:0.8},
    reverbSize:{min:0.3,max:0.6}, reverbWet:{min:0.15,max:0.38}, drive:{min:0.05,max:0.22}, chorus:{min:0.02,max:0.12}, delayMix:{min:0.25,max:0.55},
  },
  {
    name: "Indie Fuzz", description: "Warm fuzzy guitar tone — indie rock and shoegaze", genre: "indie rock",
    matchTags: ["indie","indie rock","alternative","rock","grunge","britpop","dream pop","post-punk","lo-fi"],
    oscTypes: ["saw","square"],
    cutoff:{min:800,max:4500}, resonance:{min:0.4,max:1.2}, attack:{min:0.01,max:0.06},
    decay:{min:0.2,max:0.6}, sustain:{min:0.55,max:0.88}, release:{min:0.8,max:2.2},
    reverbSize:{min:0.3,max:0.62}, reverbWet:{min:0.2,max:0.48}, drive:{min:0.35,max:0.78}, chorus:{min:0.2,max:0.55}, delayMix:{min:0.1,max:0.3},
  },
  {
    name: "New Age Pad", description: "Celestial drifting pad — new age and meditation", genre: "new age",
    matchTags: ["new age","meditation","spiritual","healing","relaxation","ambient","nature","yoga","mindfulness"],
    oscTypes: ["sine"],
    cutoff:{min:1500,max:5000}, resonance:{min:0.15,max:0.4}, attack:{min:1.5,max:4.0},
    decay:{min:1.5,max:3.0}, sustain:{min:0.8,max:0.99}, release:{min:4.0,max:9.0},
    reverbSize:{min:0.88,max:0.99}, reverbWet:{min:0.72,max:0.95}, drive:{min:0.0,max:0.03}, chorus:{min:0.4,max:0.75}, delayMix:{min:0.25,max:0.5},
  },
  {
    name: "Hyperpop Synth", description: "Glitchy bright synth — hyperpop and digicore", genre: "hyperpop",
    matchTags: ["hyperpop","digicore","pc music","bubblegum bass","emo rap","pop punk","electronic","experimental","bright"],
    oscTypes: ["saw","square"],
    cutoff:{min:6000,max:20000}, resonance:{min:1.5,max:5.0}, attack:{min:0.001,max:0.008},
    decay:{min:0.05,max:0.2}, sustain:{min:0.3,max:0.75}, release:{min:0.08,max:0.3},
    reverbSize:{min:0.15,max:0.42}, reverbWet:{min:0.1,max:0.3}, drive:{min:0.4,max:0.85}, chorus:{min:0.4,max:0.88}, delayMix:{min:0.15,max:0.4},
  },
  {
    name: "Boom Bap Lead", description: "Gritty sampled lead — classic boom bap and golden era", genre: "boom bap",
    matchTags: ["boom bap","hip-hop","east coast","rap","classic hip-hop","golden age","jazz rap","conscious"],
    oscTypes: ["saw","square"],
    cutoff:{min:1500,max:4500}, resonance:{min:0.3,max:0.8}, attack:{min:0.005,max:0.03},
    decay:{min:0.3,max:0.8}, sustain:{min:0.45,max:0.78}, release:{min:0.5,max:1.5},
    reverbSize:{min:0.2,max:0.45}, reverbWet:{min:0.1,max:0.28}, drive:{min:0.15,max:0.42}, chorus:{min:0.1,max:0.32}, delayMix:{min:0.1,max:0.28},
  },
  {
    name: "Pop Ballad Pad", description: "Lush emotive pad — pop and singer-songwriter", genre: "pop",
    matchTags: ["pop","singer-songwriter","indie pop","art pop","chamber pop","electropop","soft rock","ballad"],
    oscTypes: ["saw","sine"],
    cutoff:{min:3000,max:9000}, resonance:{min:0.2,max:0.6}, attack:{min:0.3,max:1.0},
    decay:{min:0.8,max:1.8}, sustain:{min:0.72,max:0.95}, release:{min:2.0,max:5.0},
    reverbSize:{min:0.55,max:0.82}, reverbWet:{min:0.38,max:0.65}, drive:{min:0.0,max:0.08}, chorus:{min:0.45,max:0.82}, delayMix:{min:0.15,max:0.35},
  },
];

// ─── Seeded RNG ───────────────────────────────────────────────────────────────

function seededRng(seed: string) {
  let h = 0xdeadbeef;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return () => {
    h ^= h >>> 13; h = (Math.imul(h, 0x9e3779b9)) | 0; h ^= h >>> 15;
    return (h >>> 0) / 0x100000000;
  };
}

function at(range: Range, pos: number) { return range.min + (range.max - range.min) * pos; }
function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }

// ─── Artist sonic profile ─────────────────────────────────────────────────────
// Five axes derived from weighted tag contributions + name-seeded RNG.
// Every tag from Last.fm / Spotify / MusicBrainz that matches any entry here
// pushes one or more axes in a musically meaningful direction.
// Artists with no matching tags still get a unique, deterministic profile from
// their name hash alone.

interface ArtistProfile {
  darkness:     number; // 0 = bright/airy,   1 = dark/heavy
  aggression:   number; // 0 = gentle/soft,    1 = driven/aggressive
  spaciousness: number; // 0 = dry/tight,      1 = ambient/spacious
  warmth:       number; // 0 = cold/digital,   1 = warm/organic
  rhythmic:     number; // 0 = drone/ambient,  1 = punchy/percussive
}

// [tag_substring, darkness, aggression, spaciousness, warmth, rhythmic]
// Matched via tag.includes(term) || term.includes(tag) — covers plurals / combos.
// Values are additive deltas from 0.5 neutral; final axis = 0.5 + Σdeltas (clamped).
type TagWeight = [string, number, number, number, number, number];

const TAG_WEIGHTS: TagWeight[] = [
  // ── Hip-hop / Rap ──────────────────────────────────────────────────────────
  ["trap",             0.25,  0.15, -0.15, -0.05,  0.35],
  ["drill",            0.35,  0.35, -0.25, -0.15,  0.40],
  ["grime",            0.25,  0.35, -0.15, -0.05,  0.35],
  ["phonk",            0.45,  0.25,  0.05, -0.15,  0.25],
  ["memphis",          0.40,  0.20,  0.00, -0.10,  0.25],
  ["dark trap",        0.45,  0.25, -0.05, -0.15,  0.35],
  ["cloud rap",        0.15,  0.00,  0.35,  0.10,  0.05],
  ["plugg",            0.05,  0.00,  0.25,  0.15,  0.15],
  ["rage",             0.20,  0.25,  0.10, -0.05,  0.20],
  ["melodic rap",      0.00,  0.00,  0.15,  0.20,  0.15],
  ["emo rap",          0.15,  0.10,  0.15,  0.05,  0.15],
  ["boom bap",        -0.05,  0.05,  0.05,  0.35,  0.20],
  ["east coast",      -0.05,  0.10,  0.00,  0.30,  0.20],
  ["west coast",      -0.05,  0.05,  0.05,  0.25,  0.20],
  ["golden age",      -0.10,  0.05,  0.05,  0.35,  0.20],
  ["conscious",       -0.05,  0.00,  0.05,  0.30,  0.15],
  ["gangsta",          0.20,  0.25, -0.10,  0.00,  0.30],
  ["crunk",            0.20,  0.35, -0.15, -0.05,  0.40],
  ["bounce",           0.00,  0.15, -0.10,  0.05,  0.45],
  ["jersey club",      0.00,  0.20, -0.05, -0.05,  0.55],
  ["hip-hop",          0.05,  0.10,  0.00,  0.20,  0.25],
  ["hip hop",          0.05,  0.10,  0.00,  0.20,  0.25],
  ["rap",              0.05,  0.15,  0.00,  0.10,  0.25],
  // ── Electronic / Techno / House ────────────────────────────────────────────
  ["techno",           0.15,  0.15, -0.05, -0.25,  0.45],
  ["minimal techno",   0.10,  0.10,  0.05, -0.30,  0.40],
  ["hard techno",      0.25,  0.40, -0.15, -0.35,  0.50],
  ["berlin",           0.20,  0.15,  0.05, -0.20,  0.40],
  ["industrial techno",0.35,  0.40,  0.00, -0.35,  0.40],
  ["house",           -0.05,  0.00,  0.05,  0.10,  0.45],
  ["deep house",      -0.10, -0.05,  0.15,  0.15,  0.40],
  ["chicago house",   -0.05,  0.00,  0.05,  0.20,  0.45],
  ["acid house",       0.05,  0.20,  0.00, -0.10,  0.40],
  ["acid",             0.05,  0.25,  0.00, -0.15,  0.35],
  ["acid techno",      0.10,  0.30, -0.05, -0.20,  0.40],
  ["trance",          -0.05,  0.00,  0.25, -0.05,  0.35],
  ["progressive trance",0.00, 0.00,  0.30, -0.05,  0.35],
  ["psytrance",        0.10,  0.10,  0.15, -0.15,  0.40],
  ["hard trance",      0.10,  0.25,  0.05, -0.20,  0.45],
  ["dubstep",          0.15,  0.35, -0.05, -0.15,  0.35],
  ["brostep",          0.15,  0.40, -0.10, -0.20,  0.35],
  ["drum and bass",    0.05,  0.25, -0.05, -0.15,  0.50],
  ["dnb",              0.05,  0.25, -0.05, -0.15,  0.50],
  ["neurofunk",        0.15,  0.30, -0.05, -0.20,  0.50],
  ["liquid dnb",      -0.05,  0.05,  0.15,  0.10,  0.45],
  ["jungle",           0.05,  0.15, -0.05, -0.05,  0.45],
  ["breakbeat",        0.05,  0.15, -0.05, -0.05,  0.45],
  ["breaks",           0.00,  0.10,  0.00,  0.00,  0.40],
  ["big beat",         0.05,  0.20, -0.05, -0.05,  0.45],
  ["idm",              0.00,  0.05,  0.20, -0.05, -0.05],
  ["braindance",       0.00,  0.10,  0.20, -0.05,  0.00],
  ["experimental",     0.05,  0.00,  0.25,  0.00, -0.10],
  ["glitch",           0.05,  0.15,  0.10, -0.15,  0.05],
  ["electronica",      0.00,  0.00,  0.15, -0.05,  0.10],
  ["electronic",       0.00,  0.00,  0.05, -0.05,  0.10],
  ["electro",          0.05,  0.10,  0.00, -0.10,  0.30],
  ["edm",             -0.10,  0.05,  0.05, -0.05,  0.35],
  ["big room",        -0.05,  0.10,  0.10, -0.10,  0.40],
  ["future bass",     -0.05,  0.00,  0.15,  0.05,  0.25],
  ["wave",             0.15,  0.00,  0.25,  0.05,  0.10],
  ["uk garage",        0.00,  0.05,  0.05,  0.05,  0.40],
  ["2-step",           0.00,  0.05,  0.05,  0.05,  0.40],
  ["uk bass",          0.05,  0.10,  0.05,  0.00,  0.35],
  ["post-dubstep",     0.05,  0.00,  0.20,  0.05,  0.15],
  ["footwork",         0.00,  0.15, -0.05, -0.05,  0.55],
  ["juke",             0.00,  0.15, -0.05, -0.05,  0.55],
  ["gabber",           0.15,  0.55, -0.15, -0.35,  0.50],
  ["hardcore",         0.25,  0.55, -0.05, -0.35,  0.40],
  ["hardstyle",        0.05,  0.45, -0.05, -0.25,  0.45],
  ["frenchcore",       0.15,  0.50, -0.15, -0.30,  0.50],
  ["ambient",         -0.05, -0.25,  0.55,  0.10, -0.40],
  ["dark ambient",     0.55, -0.10,  0.50, -0.05, -0.35],
  ["drone",            0.15, -0.20,  0.60,  0.00, -0.50],
  ["noise",            0.25,  0.45,  0.05, -0.35,  0.00],
  ["industrial",       0.35,  0.45,  0.00, -0.35,  0.10],
  ["power electronics",0.40,  0.55,  0.00, -0.45,  0.05],
  ["darksynth",        0.55,  0.45,  0.00, -0.35,  0.20],
  ["synthwave",        0.00,  0.00,  0.20,  0.00,  0.20],
  ["outrun",           0.00,  0.00,  0.15,  0.00,  0.25],
  ["retrowave",        0.00,  0.00,  0.20,  0.05,  0.20],
  ["vaporwave",       -0.15, -0.20,  0.50,  0.10, -0.25],
  ["future funk",     -0.10,  0.00,  0.15,  0.25,  0.35],
  ["chillwave",       -0.15, -0.30,  0.40,  0.20, -0.15],
  ["lo-fi",           -0.05, -0.20,  0.20,  0.40,  0.00],
  ["lofi",            -0.05, -0.20,  0.20,  0.40,  0.00],
  ["chillhop",        -0.05, -0.20,  0.20,  0.35,  0.05],
  ["trip-hop",         0.15, -0.10,  0.40,  0.20, -0.05],
  ["downtempo",        0.10, -0.15,  0.35,  0.15, -0.15],
  ["hauntology",       0.10, -0.15,  0.45,  0.10, -0.20],
  ["hyperpop",         0.00,  0.15,  0.00, -0.05,  0.20],
  ["digicore",         0.00,  0.10,  0.05, -0.05,  0.20],
  ["bubblegum bass",  -0.10,  0.10,  0.05, -0.05,  0.25],
  ["pc music",        -0.15,  0.05,  0.00, -0.05,  0.25],
  // ── R&B / Soul / Jazz ──────────────────────────────────────────────────────
  ["r&b",             -0.10, -0.20,  0.10,  0.45,  0.10],
  ["rnb",             -0.10, -0.20,  0.10,  0.45,  0.10],
  ["soul",            -0.15, -0.25,  0.10,  0.55,  0.10],
  ["neo-soul",        -0.15, -0.25,  0.20,  0.55,  0.05],
  ["gospel",          -0.25, -0.20,  0.10,  0.55,  0.10],
  ["funk",            -0.05,  0.00,  0.00,  0.40,  0.40],
  ["jazz",            -0.15, -0.20,  0.20,  0.55,  0.00],
  ["jazz rap",        -0.05,  0.05,  0.10,  0.40,  0.15],
  ["blues",           -0.10, -0.10,  0.05,  0.45,  0.10],
  ["smooth",          -0.15, -0.20,  0.10,  0.35,  0.05],
  ["quiet storm",     -0.15, -0.25,  0.15,  0.40,  0.00],
  // ── Rock / Guitar ──────────────────────────────────────────────────────────
  ["rock",             0.05,  0.20,  0.00,  0.00,  0.30],
  ["alternative",      0.05,  0.10,  0.05,  0.05,  0.20],
  ["indie",            0.00,  0.00,  0.10,  0.10,  0.15],
  ["indie rock",       0.00,  0.10,  0.05,  0.10,  0.20],
  ["metal",            0.35,  0.55,  0.00, -0.35,  0.25],
  ["death metal",      0.45,  0.60, -0.05, -0.45,  0.30],
  ["black metal",      0.50,  0.45,  0.10, -0.40,  0.20],
  ["doom metal",       0.45,  0.20,  0.20, -0.30,  0.00],
  ["sludge",           0.40,  0.30,  0.15, -0.25,  0.05],
  ["stoner",           0.20,  0.10,  0.30, -0.10, -0.10],
  ["thrash",           0.30,  0.55, -0.10, -0.35,  0.40],
  ["metalcore",        0.30,  0.55, -0.05, -0.30,  0.35],
  ["djent",            0.25,  0.40,  0.05, -0.25,  0.30],
  ["punk",             0.05,  0.45, -0.05, -0.05,  0.35],
  ["post-punk",        0.15,  0.25,  0.15,  0.00,  0.20],
  ["new wave",         0.00,  0.05,  0.10,  0.00,  0.25],
  ["grunge",           0.15,  0.30,  0.05, -0.10,  0.25],
  ["britpop",         -0.05,  0.10,  0.05,  0.10,  0.25],
  ["emo",              0.15,  0.15,  0.10,  0.00,  0.20],
  ["post-rock",       -0.05,  0.00,  0.45,  0.10, -0.10],
  ["shoegaze",        -0.05,  0.00,  0.55,  0.10, -0.20],
  ["dream pop",       -0.15, -0.20,  0.50,  0.20, -0.15],
  ["noise rock",       0.20,  0.35,  0.15, -0.15,  0.20],
  ["art rock",         0.05,  0.05,  0.20,  0.10,  0.10],
  // ── Pop / Mainstream ───────────────────────────────────────────────────────
  ["pop",             -0.25, -0.10,  0.00,  0.10,  0.20],
  ["synth-pop",       -0.10,  0.00,  0.10,  0.00,  0.30],
  ["electropop",      -0.10,  0.00,  0.05, -0.05,  0.30],
  ["dance-pop",       -0.15,  0.00,  0.00,  0.05,  0.40],
  ["art pop",         -0.05, -0.05,  0.15,  0.10,  0.10],
  ["indie pop",       -0.10, -0.05,  0.10,  0.15,  0.15],
  ["chamber pop",     -0.20, -0.15,  0.15,  0.25, -0.05],
  ["k-pop",           -0.25, -0.10,  0.10,  0.00,  0.40],
  ["j-pop",           -0.20, -0.05,  0.10,  0.05,  0.35],
  ["singer-songwriter",-0.15,-0.20,  0.10,  0.25, -0.10],
  ["ballad",          -0.10, -0.20,  0.15,  0.25, -0.20],
  // ── Ambient / Atmospheric / Cinematic ─────────────────────────────────────
  ["neoclassical",    -0.25, -0.30,  0.40,  0.40, -0.30],
  ["new age",         -0.35, -0.45,  0.65,  0.40, -0.40],
  ["meditation",      -0.40, -0.45,  0.65,  0.40, -0.45],
  ["healing",         -0.40, -0.40,  0.55,  0.45, -0.40],
  ["cinematic",        0.05, -0.05,  0.40,  0.10, -0.15],
  ["film score",       0.05, -0.05,  0.40,  0.15, -0.15],
  ["ethereal",        -0.15, -0.20,  0.55,  0.15, -0.30],
  ["atmospheric",      0.05, -0.10,  0.45,  0.05, -0.20],
  // ── World / Latin / Other ──────────────────────────────────────────────────
  ["afrobeats",       -0.10,  0.00,  0.00,  0.25,  0.50],
  ["afropop",         -0.10,  0.00,  0.00,  0.25,  0.45],
  ["amapiano",        -0.05,  0.00,  0.05,  0.20,  0.45],
  ["afroswing",       -0.05,  0.05,  0.05,  0.20,  0.40],
  ["reggae",          -0.10, -0.15,  0.20,  0.30,  0.20],
  ["dub",             -0.05, -0.15,  0.40,  0.20,  0.15],
  ["dancehall",        0.00,  0.05,  0.00,  0.15,  0.40],
  ["country",         -0.15, -0.10,  0.05,  0.40,  0.20],
  ["folk",            -0.15, -0.15,  0.10,  0.40, -0.10],
  ["country rap",      0.10,  0.10,  0.00,  0.25,  0.25],
  ["latin",           -0.05,  0.05,  0.00,  0.20,  0.40],
  ["reggaeton",        0.00,  0.10, -0.05,  0.10,  0.45],
  ["latin trap",       0.20,  0.15, -0.10,  0.05,  0.40],
  ["salsa",           -0.05,  0.05,  0.00,  0.25,  0.50],
  ["cumbia",          -0.05,  0.00,  0.05,  0.25,  0.45],
  ["baile funk",       0.05,  0.15, -0.10,  0.05,  0.55],
  // ── Descriptors that appear as Last.fm tags ────────────────────────────────
  ["dark",             0.35,  0.10,  0.05, -0.10,  0.00],
  ["heavy",            0.25,  0.30,  0.00, -0.20,  0.15],
  ["aggressive",       0.20,  0.45, -0.10, -0.15,  0.25],
  ["melancholic",      0.20, -0.15,  0.20,  0.10, -0.10],
  ["sad",              0.15, -0.15,  0.15,  0.10, -0.10],
  ["emotional",        0.10, -0.10,  0.15,  0.15, -0.05],
  ["mellow",          -0.10, -0.20,  0.15,  0.25, -0.10],
  ["chill",           -0.10, -0.25,  0.20,  0.20, -0.15],
  ["relaxing",        -0.15, -0.30,  0.25,  0.25, -0.20],
  ["uplifting",       -0.25, -0.05,  0.10,  0.10,  0.10],
  ["euphoric",        -0.20,  0.05,  0.15,  0.05,  0.20],
  ["energetic",       -0.10,  0.25, -0.05, -0.05,  0.35],
  ["catchy",          -0.15,  0.00,  0.00,  0.10,  0.25],
  ["romantic",        -0.15, -0.20,  0.10,  0.35, -0.05],
  ["sensual",         -0.10, -0.15,  0.15,  0.35,  0.05],
  ["psychedelic",      0.10,  0.00,  0.35,  0.05, -0.05],
  ["stoner rock",      0.20,  0.05,  0.30, -0.05, -0.05],
  ["spiritual",       -0.25, -0.25,  0.40,  0.30, -0.20],
  ["party",           -0.15,  0.10, -0.10,  0.05,  0.45],
  ["club",            -0.05,  0.05, -0.10, -0.05,  0.45],
  ["dance",           -0.10,  0.00,  0.00,  0.05,  0.35],
];

function buildArtistProfile(artistName: string, tags: string[]): ArtistProfile {
  const nameRng = seededRng(`profile|${artistName.toLowerCase()}`);

  // Sum weighted contributions from every matching tag
  let d = 0, ag = 0, sp = 0, wa = 0, ry = 0, matches = 0;
  for (const [term, td, ta, ts, tw, tr] of TAG_WEIGHTS) {
    if (tags.some(t => t.includes(term) || term.includes(t))) {
      d += td; ag += ta; sp += ts; wa += tw; ry += tr;
      matches++;
    }
  }

  // Convert accumulated delta to 0-1:
  // - Strong tag signal: 0.5 + clamped delta + tiny name noise
  // - No matching tags: fully name-hash driven (unique but consistent per artist)
  const noiseAmt = matches > 3 ? 0.06 : matches > 0 ? 0.14 : 0.0;
  const toAxis = (delta: number): number => {
    if (matches === 0) return nameRng(); // pure name-hash uniqueness
    const scale = Math.max(matches, 2); // avoid over-driving from a single tag
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

// ─── Main export ──────────────────────────────────────────────────────────────

const FALLBACK_TAG_POOL = [
  'trap','hip-hop','r&b','electronic','ambient','dark','bright','house',
  'techno','indie','jazz','soul','pop','experimental','bass','melodic',
  'chill','energetic','warm','cold','lofi','cinematic','atmospheric','acid',
];

export function generateSounds(artistName: string, artistTags: string[]): GeneratedSound[] {
  const rng = seededRng(artistName.toLowerCase());

  let resolvedTags = artistTags.map(t => t.toLowerCase());
  if (resolvedTags.length === 0 && artistName) {
    const shuffled = [...FALLBACK_TAG_POOL].sort(() => rng() - 0.5);
    resolvedTags = shuffled.slice(0, 6);
  }
  const tags = resolvedTags;
  const profile = buildArtistProfile(artistName, tags);

  // Score every template against the artist's tags
  const pool = TEMPLATES.map(t => {
    const hits = t.matchTags.filter(mt => tags.some(at2 => at2.includes(mt) || mt.includes(at2)));
    return { t, score: hits.length / Math.max(t.matchTags.length, 1), hits };
  }).sort((a, b) => b.score - a.score);

  const sounds: GeneratedSound[] = [];

  for (const { t, score, hits } of pool) {
    const confidence = parseFloat(Math.min(0.35 + score * 0.65, 1.0).toFixed(2));

    for (const v of VARIATIONS) {
      // Per-sound seeded RNG — guarantees every artist×template×variation is unique
      const pRng = seededRng(`${artistName.toLowerCase()}|${t.name}|${v.name}`);

      // mod(): shift variation baseline toward artist's profile, with small per-sound noise.
      // profilePull is a signed value in the -1..1 range representing how far the profile
      // pushes in each direction.  pullStrength controls maximum shift (up to ±0.4 of range).
      const mod = (base: number, profilePull: number, pullStrength = 0.35): number =>
        clamp01(base + profilePull * pullStrength + (pRng() - 0.5) * 0.12);

      // Each parameter is pulled by one or more profile axes:
      // cutoff:    darkness → lower,  rhythmic → slightly higher
      const wC   = mod(v.c,   -profile.darkness * 0.8 + profile.rhythmic * 0.25);
      // resonance: aggression → higher, warmth → lower
      const wR   = mod(v.r,    profile.aggression * 0.7 - profile.warmth * 0.3,  0.3);
      // attack:    spaciousness → longer, rhythmic → shorter
      const wA   = mod(v.a,    profile.spaciousness * 0.6 - profile.rhythmic * 0.45, 0.38);
      // decay:     spaciousness → longer
      const wD   = mod(v.d,    profile.spaciousness * 0.4, 0.28);
      // sustain:   warmth → higher, rhythmic → lower (shorter decay envelope)
      const wS   = mod(v.s,    profile.warmth * 0.3 - profile.rhythmic * 0.25, 0.25);
      // release:   spaciousness → longer, rhythmic → tighter
      const wRel = mod(v.rel,  profile.spaciousness * 0.65 - profile.rhythmic * 0.35, 0.4);
      // reverb:    spaciousness + darkness both add depth
      const wRv  = mod(v.rv,   profile.spaciousness * 0.55 + profile.darkness * 0.2,  0.3);
      // drive:     aggression + darkness → more driven, warmth → cleaner
      const wDr  = mod(v.dr,   profile.aggression * 0.55 + profile.darkness * 0.2 - profile.warmth * 0.2, 0.35);
      // chorus:    warmth + spaciousness → wider stereo
      const wCh  = mod(v.ch,   profile.warmth * 0.35 + profile.spaciousness * 0.2, 0.28);
      // delay:     spaciousness → more delay tails
      const wDl  = mod(v.dl,   profile.spaciousness * 0.4, 0.28);

      // oscType selected per-sound (not per-template) using per-sound RNG
      const oscType = t.oscTypes[Math.floor(pRng() * t.oscTypes.length)];

      const displayName = artistName
        ? `${artistName} \u2014 ${t.name} \u00B7 ${v.name}`
        : `${t.name} \u2014 ${v.name}`;

      sounds.push({
        name:          displayName,
        description:   t.description,
        genre:         t.genre,
        confidence,
        matchedArtist: false,
        matchedTags:   hits,
        artistTags:    tags.slice(0, 8),
        params: {
          cutoff:     Math.round(at(t.cutoff, wC)),
          resonance:  parseFloat(at(t.resonance, wR).toFixed(2)),
          attack:     parseFloat(at(t.attack, wA).toFixed(3)),
          decay:      parseFloat(at(t.decay, wD).toFixed(3)),
          sustain:    parseFloat(at(t.sustain, wS).toFixed(2)),
          release:    parseFloat(at(t.release, wRel).toFixed(2)),
          reverbSize: parseFloat(at(t.reverbSize, wRv).toFixed(2)),
          reverbWet:  parseFloat(at(t.reverbWet, wRv).toFixed(2)),
          oscType,
          drive:      parseFloat(at(t.drive, wDr).toFixed(2)),
          chorus:     parseFloat(at(t.chorus, wCh).toFixed(2)),
          delayMix:   parseFloat(at(t.delayMix, wDl).toFixed(2)),
        },
        artists: [],
        tags: t.matchTags.slice(0, 5),
      });
    }
  }

  return sounds;
}
