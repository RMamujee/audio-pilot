"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";

interface SynthParams {
  cutoff: number; resonance: number;
  attack: number; decay: number; sustain: number; release: number;
  reverbSize: number; reverbWet: number;
  oscType: string; drive: number; chorus: number; delayMix: number;
}

interface SoundResult {
  name: string; description: string; genre: string;
  confidence: number; matchedArtist: boolean;
  matchedTags: string[]; artistTags: string[];
  params: SynthParams;
  artists: string[]; tags: string[];
}

interface ArtistSuggestion {
  name: string; disambiguation: string; country: string; score: number;
}

interface SimilarArtist {
  name: string; match: number; image?: string;
}

// ─── Search history ───────────────────────────────────────────────────────────

const HISTORY_KEY = "audiopilot_history";

function useSearchHistory() {
  const [history, setHistory] = useState<string[]>([]);
  useEffect(() => {
    try { setHistory(JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]")); } catch { /* ignore */ }
  }, []);
  const add = useCallback((artist: string) => {
    setHistory(prev => {
      const next = [artist, ...prev.filter(a => a.toLowerCase() !== artist.toLowerCase())].slice(0, 10);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);
  const clear = useCallback(() => {
    setHistory([]);
    try { localStorage.removeItem(HISTORY_KEY); } catch { /* ignore */ }
  }, []);
  return { history, add, clear };
}

// ─── Favorites ────────────────────────────────────────────────────────────────

const FAVORITES_KEY = "audiopilot_favorites";

function useFavorites() {
  const [favorites, setFavorites] = useState<SoundResult[]>([]);
  useEffect(() => {
    try { setFavorites(JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]")); } catch { /* ignore */ }
  }, []);
  const toggle = useCallback((result: SoundResult) => {
    setFavorites(prev => {
      const next = prev.some(f => f.name === result.name)
        ? prev.filter(f => f.name !== result.name)
        : [result, ...prev];
      try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);
  const isFav = useCallback((name: string, favs: SoundResult[]) => favs.some(f => f.name === name), []);
  const clearAll = useCallback(() => {
    setFavorites([]);
    try { localStorage.removeItem(FAVORITES_KEY); } catch { /* ignore */ }
  }, []);
  return { favorites, toggle, isFav, clearAll };
}

// ─── Shareable URL helpers ────────────────────────────────────────────────────

function buildShareURL(artist: string, filters: {
  sortBy: string; minMatch: number; oscFilter: string;
  genreFilter: Set<string>; statFilters: Record<string, [number, number]>;
}): string {
  const p = new URLSearchParams();
  p.set("a", artist);
  if (filters.sortBy !== "match-desc") p.set("sort", filters.sortBy);
  if (filters.minMatch > 0) p.set("min", String(filters.minMatch));
  if (filters.oscFilter) p.set("osc", filters.oscFilter);
  if (filters.genreFilter.size > 0) p.set("genre", [...filters.genreFilter].join(","));
  const { cutoff, drive, reverbWet, attack, release, chorus } = filters.statFilters;
  if (cutoff[0] > 20 || cutoff[1] < 20000)  p.set("cutoff",  `${cutoff[0]}-${cutoff[1]}`);
  if (drive[0] > 0 || drive[1] < 1)         p.set("drive",   `${drive[0]}-${drive[1]}`);
  if (reverbWet[0] > 0 || reverbWet[1] < 1) p.set("reverb",  `${reverbWet[0]}-${reverbWet[1]}`);
  if (attack[0] > 0 || attack[1] < 5)       p.set("attack",  `${attack[0]}-${attack[1]}`);
  if (release[0] > 0 || release[1] < 8)     p.set("release", `${release[0]}-${release[1]}`);
  if (chorus[0] > 0 || chorus[1] < 1)       p.set("chorus",  `${chorus[0]}-${chorus[1]}`);
  return `${window.location.origin}${window.location.pathname}?${p.toString()}`;
}

function parseURLFilters() {
  if (typeof window === "undefined") return null;
  const p = new URLSearchParams(window.location.search);
  const a = p.get("a")?.trim();
  if (!a) return null;
  const pr = (key: string, def: [number, number]): [number, number] => {
    const v = p.get(key); if (!v) return def;
    const [lo, hi] = v.split("-").map(Number);
    return [isNaN(lo) ? def[0] : lo, isNaN(hi) ? def[1] : hi];
  };
  return {
    artist: a,
    sortBy: p.get("sort") || "match-desc",
    minMatch: Number(p.get("min") || 0),
    oscFilter: p.get("osc") || "",
    genreFilter: new Set(p.get("genre")?.split(",").filter(Boolean) ?? []),
    statFilters: {
      cutoff:    pr("cutoff",  [20, 20000]),
      drive:     pr("drive",   [0, 1]),
      reverbWet: pr("reverb",  [0, 1]),
      attack:    pr("attack",  [0, 5]),
      release:   pr("release", [0, 8]),
      chorus:    pr("chorus",  [0, 1]),
    },
  };
}

// ─── Variations ───────────────────────────────────────────────────────────────

function miniRng(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return () => { h = (Math.imul(1664525, h) + 1013904223) | 0; return (h >>> 0) / 0xffffffff; };
}

function generateVariations(base: SoundResult, count = 5): SoundResult[] {
  return Array.from({ length: count }, (_, i) => {
    const rng = miniRng(base.name + i);
    const vary = (v: number, lo: number, hi: number, spread = 0.3) =>
      Math.max(lo, Math.min(hi, v + (rng() - 0.5) * 2 * spread * (hi - lo)));
    const p = base.params;
    return {
      ...base,
      name: `${base.name} · var ${i + 1}`,
      params: {
        ...p,
        cutoff:    vary(p.cutoff,    20,  20000, 0.35),
        resonance: vary(p.resonance, 0.1, 10,    0.25),
        attack:    vary(p.attack,    0,   5,     0.4),
        decay:     vary(p.decay,     0,   5,     0.3),
        sustain:   vary(p.sustain,   0,   1,     0.2),
        release:   vary(p.release,   0,   8,     0.4),
        reverbWet: vary(p.reverbWet, 0,   1,     0.3),
        reverbSize: vary(p.reverbSize, 0, 1,     0.3),
        drive:     vary(p.drive,     0,   1,     0.4),
        chorus:    vary(p.chorus,    0,   1,     0.3),
        delayMix:  vary(p.delayMix,  0,   1,     0.35),
      },
    };
  });
}

// ─── Window width hook ────────────────────────────────────────────────────────

function useWindowWidth() {
  const [width, setWidth] = useState(1200);
  useEffect(() => {
    const update = () => setWidth(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return width;
}

// ─── Audio engine ─────────────────────────────────────────────────────────────

function makeReverb(ctx: AudioContext, size: number, wet: number): ConvolverNode {
  const cv = ctx.createConvolver();
  const len = Math.max(512, Math.floor(ctx.sampleRate * size * 4));
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const ch = buf.getChannelData(c);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.5 + wet);
  }
  cv.buffer = buf;
  return cv;
}

function makeDriveCurve(amount: number): Float32Array<ArrayBuffer> {
  const n = 256;
  const curve = new Float32Array(new ArrayBuffer(n * 4));
  const k = amount * 100;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = k > 0 ? ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x)) : x;
  }
  return curve;
}

function baseFreqFor(p: SynthParams): number {
  // Hash all params so every distinct sound gets a distinct pitch
  const h = Math.abs(
    ((p.cutoff    * 0.01) | 0) * 31 +
    ((p.resonance * 100)  | 0) * 17 +
    ((p.attack    * 1000) | 0) * 13 +
    ((p.decay     * 1000) | 0) * 7  +
    ((p.drive     * 1000) | 0) * 11 +
    ((p.chorus    * 1000) | 0) * 5  +
    ((p.delayMix  * 1000) | 0) * 3
  );
  // Sine stays in bass register (A2-A4), saw/square span A2-A5
  const top = p.oscType === "sine" ? 25 : 37;
  return 110 * Math.pow(2, (h % top) / 12);
}

function soundDuration(p: SynthParams, startOffset = 0): number {
  return startOffset + p.attack + p.decay + Math.min(p.sustain * 3 + 0.5, 3) + Math.min(p.release, 3) + 0.2;
}

function playSound(ctx: AudioContext, p: SynthParams, freqOverride?: number, startOffset = 0): () => void {
  const now = ctx.currentTime + startOffset;
  const oscTypeMap: Record<string, OscillatorType> = { sine: "sine", saw: "sawtooth", square: "square" };
  const oscType  = oscTypeMap[p.oscType] ?? "sawtooth";
  const baseFreq = freqOverride ?? baseFreqFor(p);

  const env = ctx.createGain();
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(0.5, now + p.attack);
  env.gain.linearRampToValueAtTime(0.5 * p.sustain, now + p.attack + p.decay);
  const sustainEnd = now + p.attack + p.decay + Math.min(p.sustain * 3 + 0.5, 3);
  const releaseEnd = sustainEnd + Math.min(p.release, 3);
  env.gain.setValueAtTime(0.5 * p.sustain, sustainEnd);
  env.gain.linearRampToValueAtTime(0, releaseEnd);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = Math.min(p.cutoff, ctx.sampleRate / 2 - 1);
  filter.Q.value = p.resonance;

  const shaper = ctx.createWaveShaper();
  shaper.curve = makeDriveCurve(p.drive);
  shaper.oversample = "2x";

  const reverb = makeReverb(ctx, p.reverbSize, p.reverbWet);
  const reverbGain = ctx.createGain(); reverbGain.gain.value = p.reverbWet;
  const dryGain   = ctx.createGain(); dryGain.gain.value    = 1 - p.reverbWet * 0.5;

  const delay = ctx.createDelay(1.0); delay.delayTime.value = 0.375;
  const delayFb   = ctx.createGain(); delayFb.gain.value   = 0.4;
  const delayGain = ctx.createGain(); delayGain.gain.value = p.delayMix;
  delay.connect(delayFb); delayFb.connect(delay);

  const oscillators: OscillatorNode[] = [];
  function makeOsc(freq: number, detune = 0, gain = 1) {
    const osc = ctx.createOscillator();
    osc.type = oscType; osc.frequency.value = freq; osc.detune.value = detune;
    const g = ctx.createGain(); g.gain.value = gain;
    osc.connect(g); g.connect(filter);
    osc.start(now); osc.stop(releaseEnd + 0.1);
    oscillators.push(osc);
  }
  makeOsc(baseFreq);
  if (p.chorus > 0.1 && oscType === "sawtooth") {
    const sp = p.chorus * 15;
    makeOsc(baseFreq, -sp, p.chorus * 0.6);
    makeOsc(baseFreq,  sp, p.chorus * 0.6);
    makeOsc(baseFreq * 2, -sp * 0.5, p.chorus * 0.3);
  }
  // Master gain: routes everything through one node so stop() kills reverb/delay tails
  const master = ctx.createGain();
  master.connect(ctx.destination);

  filter.connect(shaper); shaper.connect(env);
  env.connect(dryGain); env.connect(reverbGain); env.connect(delayGain);
  dryGain.connect(master);
  reverbGain.connect(reverb); reverb.connect(master);
  delayGain.connect(delay); delay.connect(master);

  return () => {
    const t = ctx.currentTime;
    master.gain.setValueAtTime(1, t);
    master.gain.linearRampToValueAtTime(0, t + 0.05);
    oscillators.forEach(o => { try { o.stop(t + 0.06); } catch { /* ok */ } });
    setTimeout(() => { try { master.disconnect(); } catch { /* ok */ } }, 200);
  };
}
// Play root → major 3rd → perfect 5th as a rising arpeggio
function playArp(ctx: AudioContext, p: SynthParams): { stop: () => void; duration: number } {
  const root    = baseFreqFor(p);
  const spacing = Math.max(0.15, Math.min(0.35, p.attack * 0.4 + 0.15));
  const freqs   = [root, root * 2 ** (4 / 12), root * 2 ** (7 / 12)];
  const stops   = freqs.map((f, i) => playSound(ctx, p, f, i * spacing));
  const duration = soundDuration(p, (freqs.length - 1) * spacing);
  return { stop: () => stops.forEach(s => s()), duration };
}

// ─── Vital (.vital) preset export ────────────────────────────────────────────

function buildVitalPreset(result: SoundResult) {
  const p = result.params;
  const waveFrame  = p.oscType === "sine" ? 0 : p.oscType === "saw" ? 127 : 255;
  const cutoffNote = Math.max(0, Math.min(128, 69 + 12 * Math.log2(Math.max(20, p.cutoff) / 440)));
  const resNorm    = Math.max(0, Math.min(1, (p.resonance - 0.1) / 9.9));
  return {
    synth_version: "1.5.5", preset_style: "",
    preset_name: result.name, author: "AudioPilot",
    comments: `${result.description} · ${result.genre}`,
    groups: [], modulations: [],
    settings: {
      beats_per_minute: 120.0,
      osc_1_on: 1.0, osc_1_level: 1.0, osc_1_pan: 0.0,
      osc_1_tune: 0.0, osc_1_transpose: 0.0, osc_1_wave_frame: waveFrame,
      osc_1_unison_voices: p.chorus > 0.3 ? 3.0 : 1.0,
      osc_1_unison_detune: p.chorus > 0.3 ? p.chorus * 20 : 0.0,
      osc_1_unison_blend: 0.8, osc_2_on: 0.0, osc_3_on: 0.0,
      filter_1_on: 1.0, filter_1_cutoff: cutoffNote,
      filter_1_resonance: resNorm, filter_1_drive: 0.0,
      filter_1_model: 0.0, filter_1_style: 0.0, filter_2_on: 0.0,
      env_1_attack: p.attack, env_1_attack_power: -2.0,
      env_1_decay: p.decay, env_1_decay_power: -2.0,
      env_1_sustain: p.sustain,
      env_1_release: p.release, env_1_release_power: -2.0,
      env_1_velocity_track: 1.0,
      reverb_on: p.reverbWet > 0.02 ? 1.0 : 0.0,
      reverb_dry_wet: p.reverbWet, reverb_size: p.reverbSize,
      reverb_decay_time: 1.0 + p.reverbSize * 3,
      reverb_high_shelf_cutoff: 9.0, reverb_high_shelf_gain: 0.0,
      reverb_low_shelf_cutoff: 40.0, reverb_low_shelf_gain: 0.0,
      reverb_pre_high_cutoff: 0.0, reverb_pre_low_cutoff: 0.0,
      chorus_on: p.chorus > 0.05 ? 1.0 : 0.0,
      chorus_dry_wet: p.chorus, chorus_voices: p.chorus > 0.3 ? 4.0 : 2.0,
      chorus_frequency: 0.5, chorus_mod_depth: p.chorus * 0.7,
      chorus_feedback: 0.0, chorus_cutoff: 1.0, chorus_damping: 0.9,
      chorus_delay_1: -0.8, chorus_delay_2: -0.8,
      distortion_on: p.drive > 0.05 ? 1.0 : 0.0,
      distortion_mix: p.drive, distortion_drive: p.drive * 20, distortion_type: 0.0,
      delay_on: p.delayMix > 0.05 ? 1.0 : 0.0,
      delay_dry_wet: p.delayMix, delay_feedback: 0.4,
      delay_frequency: 2.0, delay_sync: 1.0, delay_tempo: 9.0,
      delay_style: 0.0, delay_filter_cutoff: 60.0, delay_filter_spread: 0.0,
      volume: 1.0,
    },
  };
}

function exportToVital(result: SoundResult): void {
  const blob = new Blob([JSON.stringify(buildVitalPreset(result), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${result.name.replace(/[^a-z0-9\-_]/gi, "_")}.vital`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── ZIP builder + bulk export ────────────────────────────────────────────────

function crc32(buf: Uint8Array): number {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) { let c = i; for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[i] = c; }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function buildZip(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const enc = new TextEncoder();
  const locals: Uint8Array[] = [], bodies: Uint8Array[] = [], centrals: Uint8Array[] = [];
  let off = 0;
  for (const file of files) {
    const nb = enc.encode(file.name), sz = file.data.length, crc = crc32(file.data);
    const lh = new Uint8Array(30 + nb.length); const lv = new DataView(lh.buffer);
    lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true);
    lv.setUint32(14, crc, true); lv.setUint32(18, sz, true); lv.setUint32(22, sz, true);
    lv.setUint16(26, nb.length, true); lh.set(nb, 30);
    const ch = new Uint8Array(46 + nb.length); const cv = new DataView(ch.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true);
    cv.setUint32(16, crc, true); cv.setUint32(20, sz, true); cv.setUint32(24, sz, true);
    cv.setUint16(28, nb.length, true); cv.setUint32(42, off, true); ch.set(nb, 46);
    locals.push(lh); bodies.push(file.data); centrals.push(ch);
    off += lh.length + sz;
  }
  const centralOff = off;
  const centralSz = centrals.reduce((s, c) => s + c.length, 0);
  const eocd = new Uint8Array(22); const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true); ev.setUint32(12, centralSz, true);
  ev.setUint32(16, centralOff, true);
  const parts = [...locals.flatMap((l, i) => [l, bodies[i]]), ...centrals, eocd];
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let pos = 0; for (const p of parts) { out.set(p, pos); pos += p.length; }
  return out;
}

function exportBulkVital(results: SoundResult[], label: string): void {
  const enc = new TextEncoder();
  const seen = new Map<string, number>();
  const files = results.map(r => {
    let base = r.name.replace(/[^a-z0-9\-_]/gi, "_").slice(0, 60);
    const n = (seen.get(base) ?? 0) + 1; seen.set(base, n);
    if (n > 1) base += `_${n}`;
    return { name: `${base}.vital`, data: enc.encode(JSON.stringify(buildVitalPreset(r), null, 2)) };
  });
  const zip = buildZip(files);
  const blob = new Blob([zip.buffer as ArrayBuffer], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audiopilot_${label.replace(/[^a-z0-9]/gi, "_").slice(0, 40)}.zip`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Param bars ───────────────────────────────────────────────────────────────

const PARAM_BARS: { key: keyof SynthParams; label: string; min: number; max: number; unit?: string }[] = [
  { key: "cutoff",    label: "Cutoff",    min: 20,  max: 20000, unit: "Hz" },
  { key: "resonance", label: "Resonance", min: 0.1, max: 10 },
  { key: "attack",    label: "Attack",    min: 0,   max: 5,     unit: "s" },
  { key: "decay",     label: "Decay",     min: 0,   max: 5,     unit: "s" },
  { key: "sustain",   label: "Sustain",   min: 0,   max: 1 },
  { key: "release",   label: "Release",   min: 0,   max: 8,     unit: "s" },
  { key: "reverbWet", label: "Reverb",    min: 0,   max: 1 },
  { key: "drive",     label: "Drive",     min: 0,   max: 1 },
  { key: "chorus",    label: "Chorus",    min: 0,   max: 1 },
  { key: "delayMix",  label: "Delay",     min: 0,   max: 1 },
];

function ParamBar({ label, value, min, max, unit }: { label: string; value: number; min: number; max: number; unit?: string }) {
  const pct = Math.min(((value - min) / (max - min)) * 100, 100);
  const display = unit === "Hz"
    ? value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toFixed(0)
    : unit === "s" ? `${value.toFixed(2)}s` : value.toFixed(2);
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 11, color: "var(--muted)" }}>
        <span>{label}</span>
        <span style={{ color: "var(--text)" }}>{display}{unit === "Hz" ? "Hz" : ""}</span>
      </div>
      <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg,var(--accent),var(--accent2))", borderRadius: 2, transition: "width 0.4s cubic-bezier(0.4,0,0.2,1)" }} />
      </div>
    </div>
  );
}

// ─── Range slider ─────────────────────────────────────────────────────────────

function RangeSlider({ label, min, max, step, value, onChange, format }: {
  label: string; min: number; max: number; step: number;
  value: [number, number]; onChange: (v: [number, number]) => void;
  format: (v: number) => string;
}) {
  const [lo, hi] = value;
  const loPos = ((lo - min) / (max - min)) * 100;
  const hiPos = ((hi - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 6 }}>
        <span style={{ color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
        <span style={{ color: "var(--text)", fontFamily: "monospace", fontSize: 10 }}>{format(lo)} – {format(hi)}</span>
      </div>
      <div style={{ position: "relative", height: 20 }}>
        <div style={{ position: "absolute", top: 8, left: 0, right: 0, height: 4, background: "var(--border)", borderRadius: 2 }} />
        <div style={{ position: "absolute", top: 8, height: 4, borderRadius: 2, background: "linear-gradient(90deg,var(--accent),var(--accent2))", left: `${loPos}%`, width: `${Math.max(hiPos - loPos, 0)}%` }} />
        <input type="range" min={min} max={max} step={step} value={lo}
          onChange={e => onChange([Math.min(+e.target.value, hi - step), hi])}
          style={{ position: "absolute", width: "100%", opacity: 0, height: 20, margin: 0, cursor: "pointer" }} />
        <input type="range" min={min} max={max} step={step} value={hi}
          onChange={e => onChange([lo, Math.max(+e.target.value, lo + step)])}
          style={{ position: "absolute", width: "100%", opacity: 0, height: 20, margin: 0, cursor: "pointer" }} />
      </div>
    </div>
  );
}

// ─── Genre color map ──────────────────────────────────────────────────────────

const GENRE_COLORS: Record<string, string> = {
  trap: "#ef4444", "emo rap": "#ec4899", phonk: "#dc2626", drill: "#991b1b",
  "boom bap": "#b45309", "hip-hop soul": "#d97706", "neo-soul": "#92400e",
  "lo-fi": "#059669", chillhop: "#047857",
  "dark ambient": "#1e3a5f", ambient: "#1d4ed8", "dream pop": "#4338ca",
  neoclassical: "#6d28d9", experimental: "#581c87",
  "acid techno": "#7c2d12", techno: "#374151", "deep house": "#0f3460",
  house: "#1e40af", "french house": "#1d4ed8", "future house": "#0284c7",
  "melodic house": "#0369a1", trance: "#7c3aed", "future bass": "#0891b2",
  dubstep: "#b91c1c", "drum and bass": "#1f2937",
  idm: "#1e40af", "r&b": "#7e22ce", synthwave: "#7c2d12", vaporwave: "#a855f7",
  afrobeats: "#15803d", "k-pop": "#db2777", electronic: "#1e40af",
};

function gColor(genre: string): string {
  return GENRE_COLORS[genre.toLowerCase()] ?? "#374151";
}

const OSC_COLORS: Record<string, string> = { sine: "#22c55e", saw: "#a855f7", square: "#f59e0b" };

// ─── Sound card ───────────────────────────────────────────────────────────────


const TWEAK_PARAMS: { key: keyof SynthParams; label: string; min: number; max: number; step: number }[] = [
  { key: "cutoff",    label: "Cutoff",    min: 20,  max: 20000, step: 100  },
  { key: "resonance", label: "Resonance", min: 0.1, max: 10,    step: 0.1  },
  { key: "attack",    label: "Attack",    min: 0,   max: 5,     step: 0.01 },
  { key: "decay",     label: "Decay",     min: 0,   max: 5,     step: 0.01 },
  { key: "sustain",   label: "Sustain",   min: 0,   max: 1,     step: 0.01 },
  { key: "release",   label: "Release",   min: 0,   max: 8,     step: 0.05 },
  { key: "reverbWet", label: "Reverb",    min: 0,   max: 1,     step: 0.01 },
  { key: "drive",     label: "Drive",     min: 0,   max: 1,     step: 0.01 },
  { key: "chorus",    label: "Chorus",    min: 0,   max: 1,     step: 0.01 },
  { key: "delayMix",  label: "Delay",     min: 0,   max: 1,     step: 0.01 },
];

function SoundCard({ result, index, isPlaying, isFav, onPlay, onPlayArp, onStop, onFav, onVary }: {
  result: SoundResult; index: number; isPlaying: boolean; isFav?: boolean;
  onPlay: (params: SynthParams) => void; onPlayArp: (params: SynthParams) => void;
  onStop: () => void; onFav?: () => void; onVary?: () => void;
}) {
  const [copied, setCopied]       = useState(false);
  const [exported, setExported]   = useState(false);
  const [tweakOpen, setTweakOpen] = useState(false);
  const [tweaked, setTweaked]     = useState<SynthParams>({ ...result.params });

  const oscColor  = OSC_COLORS[tweaked.oscType] ?? "#888";
  const confPct   = Math.round(Math.min(result.confidence, 1) * 100);
  const confColor = confPct > 70 ? "var(--green)" : confPct > 40 ? "var(--accent2)" : "var(--muted)";
  const gc        = gColor(result.genre);
  const isDirty   = JSON.stringify(tweaked) !== JSON.stringify(result.params);

  const handleExport = () => {
    exportToVital({ ...result, params: tweaked });
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  };

  const tweakParam = (key: string, val: number | string) =>
    setTweaked(p => ({ ...p, [key]: val }));

  return (
    <div style={{
      background: "var(--surface)",
      border: `1px solid ${isPlaying ? "var(--accent)" : isFav ? "rgba(168,85,247,0.4)" : "var(--border)"}`,
      borderRadius: 12, padding: 20, position: "relative", overflow: "hidden",
      animation: `fadeUp 0.35s ease ${Math.min(index, 20) * 0.04}s both`,
      transition: "border-color 0.2s, box-shadow 0.2s",
      boxShadow: isPlaying ? "0 0 24px rgba(124,58,237,0.25)" : "none",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${gc || "var(--accent)"},var(--accent2),transparent)` }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: oscColor, display: "inline-block", boxShadow: `0 0 6px ${oscColor}`, flexShrink: 0 }} />
            <h3 style={{ fontSize: 14, fontWeight: 700 }}>{result.name}</h3>
            {result.genre && (
              <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: `${gc}33`, color: gc, border: `1px solid ${gc}55`, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {result.genre}
              </span>
            )}
            {isDirty && (
              <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)", fontWeight: 700 }}>TWEAKED</span>
            )}
          </div>
          <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6, lineHeight: 1.4 }}>{result.description}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: confColor, fontWeight: 600 }}>{confPct}% match</span>
            {result.matchedArtist && (
              <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(124,58,237,0.2)", color: "var(--accent2)", fontWeight: 700 }}>ARTIST</span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, marginLeft: 12, flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {onFav && (
              <button onClick={onFav} title={isFav ? "Remove from favorites" : "Add to favorites"}
                style={{ fontSize: 16, padding: "2px 6px", borderRadius: 6, cursor: "pointer", background: "transparent", border: "none", color: isFav ? "#f472b6" : "var(--muted)", transition: "color 0.15s", lineHeight: 1 }}>
                {isFav ? "♥" : "♡"}
              </button>
            )}
            <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, background: "var(--surface2)", border: "1px solid var(--border)", color: oscColor, fontFamily: "monospace", fontWeight: 700, textTransform: "uppercase" }}>
              {tweaked.oscType}
            </span>
          </div>

          {isPlaying ? (
            <button onClick={onStop}
              style={{ fontSize: 12, padding: "5px 14px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, background: "rgba(124,58,237,0.25)", border: "1px solid var(--accent2)", color: "#fff", letterSpacing: "0.04em", animation: "pulse 1.5s ease infinite" }}>
              ■ Stop
            </button>
          ) : (
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={() => onPlayArp(tweaked)}
                style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, background: "linear-gradient(135deg,var(--accent),var(--accent2))", border: "none", color: "#fff", letterSpacing: "0.03em" }}
                title="Preview as rising chord arpeggio">
                ♫ Arp
              </button>
              <button onClick={() => onPlay(tweaked)}
                style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--accent2)", letterSpacing: "0.03em" }}>
                ▶ Note
              </button>
            </div>
          )}

          <button onClick={handleExport}
            style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, cursor: "pointer",
              background: exported ? "rgba(124,58,237,0.15)" : "var(--surface2)",
              border: `1px solid ${exported ? "var(--accent)" : "var(--border)"}`,
              color: exported ? "var(--accent2)" : "var(--muted)", transition: "all 0.2s" }}
            title="Download as Vital synth preset">
            {exported ? "✓ Saved" : "⬇ Vital"}
          </button>
          {onVary && (
            <button onClick={onVary}
              style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, cursor: "pointer", background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--muted)", transition: "all 0.2s" }}
              title="Generate 5 randomised variants of this sound">
              ∿ Vary
            </button>
          )}
          <button onClick={() => setTweakOpen(o => !o)}
            style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, cursor: "pointer",
              background: tweakOpen ? "rgba(124,58,237,0.15)" : "var(--surface2)",
              border: `1px solid ${tweakOpen ? "var(--accent)" : "var(--border)"}`,
              color: tweakOpen ? "var(--accent2)" : "var(--muted)", transition: "all 0.2s" }}>
            {tweakOpen ? "× Close" : "⊞ Tweak"}
          </button>
          <button onClick={() => {
            navigator.clipboard.writeText(JSON.stringify(tweaked, null, 2));
            setCopied(true); setTimeout(() => setCopied(false), 2000);
          }}
            style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, cursor: "pointer",
              background: copied ? "rgba(34,197,94,0.15)" : "var(--surface2)",
              border: `1px solid ${copied ? "var(--green)" : "var(--border)"}`,
              color: copied ? "var(--green)" : "var(--muted)", transition: "all 0.2s" }}>
            {copied ? "✓ Copied" : "Copy JSON"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
        {PARAM_BARS.map(({ key, label, min, max, unit }) => (
          <ParamBar key={key} label={label} value={tweaked[key as keyof SynthParams] as number} min={min} max={max} unit={unit} />
        ))}
      </div>

      {tweakOpen && (
        <div style={{ marginTop: 14, padding: "14px 16px", background: "var(--surface2)", borderRadius: 10, border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--accent2)" }}>Live Tweaking</span>
            <div style={{ display: "flex", gap: 5 }}>
              <div style={{ display: "flex", gap: 3 }}>
                {(["sine","saw","square"] as const).map(o => (
                  <button key={o} onClick={() => tweakParam("oscType", o)}
                    style={{ fontSize: 10, padding: "2px 7px", borderRadius: 5, cursor: "pointer", fontFamily: "monospace", fontWeight: 700, textTransform: "uppercase",
                      background: tweaked.oscType === o ? `${OSC_COLORS[o]}22` : "var(--surface)",
                      border: `1px solid ${tweaked.oscType === o ? OSC_COLORS[o] : "var(--border)"}`,
                      color: tweaked.oscType === o ? OSC_COLORS[o] : "var(--muted)" }}>
                    {o}
                  </button>
                ))}
              </div>
              {isDirty && (
                <button onClick={() => setTweaked({ ...result.params })}
                  style={{ fontSize: 10, padding: "2px 8px", borderRadius: 5, cursor: "pointer", fontFamily: "inherit", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", fontWeight: 700 }}>
                  Reset
                </button>
              )}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 20px" }}>
            {TWEAK_PARAMS.map(({ key, label, min, max, step }) => {
              const val = tweaked[key] as number;
              const pct = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
              return (
                <div key={key}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 9, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
                    <span style={{ fontSize: 9, fontFamily: "monospace", color: "var(--text)" }}>
                      {key === "cutoff" ? (val >= 1000 ? `${(val/1000).toFixed(1)}k` : `${val}`) : val.toFixed(key === "attack" || key === "decay" ? 3 : 2)}
                    </span>
                  </div>
                  <div style={{ position: "relative", height: 22, display: "flex", alignItems: "center" }}>
                    <div style={{ position: "absolute", left: 0, right: 0, height: 3, borderRadius: 2, background: "var(--border)" }} />
                    <div style={{ position: "absolute", left: 0, width: `${pct}%`, height: 3, borderRadius: 2, background: "linear-gradient(90deg,var(--accent),var(--accent2))", transition: "width 0.05s" }} />
                    <input type="range" min={min} max={max} step={step} value={val}
                      onChange={e => tweakParam(key as string, key === "cutoff" ? parseInt(e.target.value) : parseFloat(parseFloat(e.target.value).toFixed(step < 0.05 ? 3 : 2)))}
                      style={{ position: "absolute", left: 0, right: 0, width: "100%", opacity: 0, cursor: "pointer", height: 22, margin: 0 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {result.artistTags && result.artistTags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 10, alignItems: "center" }}>
          <span style={{ fontSize: 9, color: "var(--muted)", marginRight: 2 }}>TAGS:</span>
          {result.artistTags.slice(0, 8).map((tag) => (
            <span key={tag} style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "rgba(168,85,247,0.1)", color: "var(--accent2)", border: "1px solid rgba(168,85,247,0.2)" }}>{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function ArtistInput({ value, onChange, onSearch }: {
  value: string; onChange: (v: string) => void; onSearch: (a: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<ArtistSuggestion[]>([]);
  const [open,        setOpen]        = useState(false);
  const [fetching,    setFetching]    = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef     = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const lookup = (q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) { setSuggestions([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setFetching(true);
      try {
        const r = await fetch(`/api/artists?q=${encodeURIComponent(q)}`);
        if (r.ok) {
          const data = await r.json();
          setSuggestions((data.results ?? []).slice(0, 8));
          setOpen(true);
        }
      } catch { /* ignore */ } finally { setFetching(false); }
    }, 300);
  };

  const select = (name: string) => {
    onChange(name); setSuggestions([]); setOpen(false); onSearch(name);
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", flex: 1, minWidth: 0 }}>
      <input
        type="text" value={value}
        placeholder="Search any artist — Travis Scott, Aphex Twin, Daft Punk..."
        onChange={(e) => { onChange(e.target.value); lookup(e.target.value); }}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onKeyDown={(e) => { if (e.key === "Enter") { setOpen(false); onSearch(value); } }}
        style={{
          width: "100%", padding: "14px 44px 14px 18px",
          background: "var(--surface2)", border: "2px solid var(--border)",
          borderRadius: 10, color: "var(--text)", fontSize: 16,
          outline: "none", fontFamily: "inherit", transition: "border-color 0.2s",
          boxSizing: "border-box",
        }}
      />
      {fetching && (
        <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--accent2)", fontSize: 18, animation: "spin 1s linear infinite" }}>↻</span>
      )}
      {open && suggestions.length > 0 && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, zIndex: 50, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
          {suggestions.map((s) => (
            <button key={s.name + s.disambiguation} onClick={() => select(s.name)}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 16px", background: "transparent", border: "none", borderBottom: "1px solid var(--border)", cursor: "pointer", color: "var(--text)", fontFamily: "inherit" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface2)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ fontSize: 14, fontWeight: 600 }}>{s.name}</span>
              {s.disambiguation && <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 8 }}>{s.disambiguation}</span>}
              {s.country && <span style={{ fontSize: 10, color: "var(--accent2)", marginLeft: 6 }}>[{s.country}]</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Featured artists ─────────────────────────────────────────────────────────

const FEATURED = [
  { name: "Travis Scott",     genre: "Trap" },
  { name: "Aphex Twin",       genre: "IDM" },
  { name: "Daft Punk",        genre: "House" },
  { name: "Frank Ocean",      genre: "R&B" },
  { name: "Burial",           genre: "UK Garage" },
  { name: "Flume",            genre: "Future Bass" },
  { name: "Skrillex",         genre: "Dubstep" },
  { name: "The Weeknd",       genre: "Dark R&B" },
  { name: "Metro Boomin",     genre: "Trap" },
  { name: "Four Tet",         genre: "Electronic" },
  { name: "Playboi Carti",    genre: "Plugg" },
  { name: "Kendrick Lamar",   genre: "Hip-Hop" },
  { name: "Boards of Canada", genre: "IDM" },
  { name: "James Blake",      genre: "Post-Dubstep" },
  { name: "Massive Attack",   genre: "Trip-Hop" },
  { name: "Bicep",            genre: "Melodic House" },
];

// ─── Genre picker (no-results fallback) ──────────────────────────────────────

const PICKER_GENRES = [
  "Trap", "Hip-Hop", "R&B", "Pop", "House", "Techno", "Ambient", "IDM",
  "Drum & Bass", "Dubstep", "Future Bass", "Lo-Fi", "Jazz", "Soul",
  "Rock", "Indie Rock", "Electronic", "Trance", "Synthwave", "Metal",
  "Gospel", "Reggae", "Afrobeats", "K-Pop", "Plugg", "Phonk",
];

function GenrePicker({ artist, onSearch }: { artist: string; onSearch: (tags: string[]) => void }) {
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const toggle = (g: string) =>
    setPicked(prev => { const n = new Set(prev); n.has(g) ? n.delete(g) : n.add(g); return n; });

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "28px 24px", textAlign: "center", animation: "fadeUp 0.3s ease both" }}>
      <div style={{ fontSize: 28, marginBottom: 10 }}>🎵</div>
      <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
        No tags found for <span style={{ color: "var(--accent2)" }}>{artist}</span>
      </p>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>
        Pick genres to generate matching sounds:
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 24 }}>
        {PICKER_GENRES.map(g => {
          const active = picked.has(g);
          const gc = gColor(g);
          return (
            <button key={g} onClick={() => toggle(g)}
              style={{
                padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                fontSize: 13, fontWeight: 700,
                border: `1px solid ${active ? gc : "var(--border)"}`,
                background: active ? `${gc}22` : "var(--surface2)",
                color: active ? gc : "var(--text)",
                transition: "all 0.15s",
              }}>
              {g}{active ? " ✓" : ""}
            </button>
          );
        })}
      </div>
      <button
        onClick={() => picked.size > 0 && onSearch([...picked].map(g => g.toLowerCase()))}
        disabled={picked.size === 0}
        style={{
          padding: "12px 32px", borderRadius: 10,
          background: picked.size > 0 ? "linear-gradient(135deg,var(--accent),var(--accent2))" : "var(--surface2)",
          border: "none", color: picked.size > 0 ? "#fff" : "var(--muted)",
          fontSize: 14, fontWeight: 800, cursor: picked.size > 0 ? "pointer" : "not-allowed",
          fontFamily: "inherit", letterSpacing: "0.06em",
        }}>
        Generate Sounds{picked.size > 0 ? ` (${picked.size} genre${picked.size > 1 ? "s" : ""})` : ""}
      </button>
    </div>
  );
}

// ─── Similar artists sidebar ──────────────────────────────────────────────────

function ArtistAvatar({ name, image, size = 32 }: { name: string; image?: string; size?: number }) {
  const [err, setErr] = useState(false);
  const initial = name.charAt(0).toUpperCase();
  const hue = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;

  if (image && !err) {
    return (
      <img src={image} alt={name} onError={() => setErr(true)}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
    );
  }
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: `hsl(${hue},55%,25%)`, fontSize: size * 0.4, fontWeight: 800, color: `hsl(${hue},70%,75%)` }}>
      {initial}
    </div>
  );
}

function SimilarSidebar({ artists, mainImage, loading, onSelect, mobile }: {
  artists: SimilarArtist[]; mainImage?: string | null; loading: boolean;
  onSelect: (name: string) => void; mobile?: boolean;
}) {
  if (mobile) {
    // Horizontal scrollable strip for mobile
    return (
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Similar Artists</p>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6, WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
          {loading ? (
            [...Array(6)].map((_, i) => (
              <div key={i} style={{ flexShrink: 0, width: 100, height: 36, borderRadius: 8, background: "var(--surface2)", animation: "pulse 1.5s ease infinite" }} />
            ))
          ) : artists.length === 0 ? (
            <span style={{ fontSize: 12, color: "var(--muted)" }}>None found</span>
          ) : (
            artists.map(a => (
              <button key={a.name} onClick={() => onSelect(a.name)}
                style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 7, padding: "5px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer", fontFamily: "inherit", color: "var(--text)", whiteSpace: "nowrap" }}>
                <ArtistAvatar name={a.name} image={a.image} size={22} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>{a.name}</span>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  // Desktop vertical sidebar
  return (
    <div style={{
      width: 210, flexShrink: 0, position: "sticky", top: 20,
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 12, overflow: "hidden", maxHeight: "calc(100vh - 40px)",
      display: "flex", flexDirection: "column",
    }}>
      {mainImage && (
        <img src={mainImage} alt="" style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }} />
      )}
      <div style={{ padding: "12px 12px", overflowY: "auto", flex: 1 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
          Similar Artists
        </p>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[...Array(8)].map((_, i) => (
              <div key={i} style={{ height: 40, borderRadius: 8, background: "var(--surface2)", animation: "pulse 1.5s ease infinite" }} />
            ))}
          </div>
        ) : artists.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>No similar artists found.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {artists.map((a) => (
              <button key={a.name} onClick={() => onSelect(a.name)}
                style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "7px 8px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface2)"; e.currentTarget.style.borderColor = "var(--accent)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "var(--border)"; }}
              >
                <ArtistAvatar name={a.name} image={a.image} size={28} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</div>
                  <div style={{ fontSize: 10, color: "var(--accent2)" }}>{Math.round(a.match * 100)}% similar</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Variations modal ────────────────────────────────────────────────────────

function VariationsModal({ source, onClose, playingId, onPlay, onPlayArp, onStop }: {
  source: SoundResult; onClose: () => void;
  playingId: string | null;
  onPlay: (name: string, params: SynthParams) => void; onPlayArp: (name: string, params: SynthParams) => void; onStop: () => void;
}) {
  const variations = useMemo(() => generateVariations(source), [source]);
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "var(--bg,#0a0a0f)", border: "1px solid var(--border)", borderRadius: 16, width: "100%", maxWidth: 880, maxHeight: "88vh", display: "flex", flexDirection: "column", overflow: "hidden", animation: "fadeUp 0.25s ease both" }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700 }}>
              Variations of <span style={{ color: "var(--accent2)" }}>{source.name}</span>
            </p>
            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
              5 randomised variants — preview, export or copy any you like
            </p>
          </div>
          <button onClick={onClose}
            style={{ fontSize: 20, lineHeight: 1, padding: "2px 8px", background: "none", border: "none", color: "var(--muted)", cursor: "pointer" }}>
            ✕
          </button>
        </div>
        {/* Grid */}
        <div style={{ overflowY: "auto", padding: 16, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 12 }}>
          {variations.map((v, i) => (
            <SoundCard key={v.name} result={v} index={i}
              isPlaying={playingId === v.name}
              onPlay={(params) => onPlay(v.name, params)} onPlayArp={(params) => onPlayArp(v.name, params)} onStop={onStop}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Filter types ─────────────────────────────────────────────────────────────

type OscFilter = "" | "sine" | "saw" | "square";
type SortMode  = "match-desc" | "match-asc" | "name";

const STAT_DEFAULTS = {
  cutoff:    [20, 20000] as [number, number],
  drive:     [0, 1]      as [number, number],
  reverbWet: [0, 1]      as [number, number],
  attack:    [0, 5]      as [number, number],
  release:   [0, 8]      as [number, number],
  chorus:    [0, 1]      as [number, number],
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Home() {
  const windowWidth = useWindowWidth();
  const isMobile    = windowWidth < 768;

  const [artist,         setArtist]         = useState("");
  const [results,        setResults]        = useState<SoundResult[]>([]);
  const [visibleCount,   setVisibleCount]   = useState(100);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState("");
  const [playingId,      setPlayingId]      = useState<string | null>(null);
  const [searchedArtist, setSearchedArtist] = useState("");
  const [dataSources,    setDataSources]    = useState<string[]>([]);
  const [similarArtists, setSimilarArtists] = useState<SimilarArtist[]>([]);
  const [artistImage,    setArtistImage]    = useState<string | null>(null);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [showGenrePicker, setShowGenrePicker] = useState(false);
  const [variationsFor,  setVariationsFor]  = useState<SoundResult | null>(null);
  const [linkCopied,     setLinkCopied]     = useState(false);
  const { history: searchHistory, add: addToHistory, clear: clearHistory } = useSearchHistory();
  const { favorites, toggle: toggleFav, isFav, clearAll: clearFavorites } = useFavorites();
  const [showFavorites, setShowFavorites] = useState(false);

  // ── Filters ──────────────────────────────────────────────────────────────────
  const [sortBy,      setSortBy]      = useState<SortMode>("match-desc");
  const [minMatch,    setMinMatch]    = useState(0);
  const [oscFilter,   setOscFilter]   = useState<OscFilter>("");
  const [genreFilter, setGenreFilter] = useState<Set<string>>(new Set());
  const [statFilters, setStatFilters] = useState(STAT_DEFAULTS);

  const uniqueGenres = useMemo(() =>
    [...new Set(results.map(r => r.genre).filter(Boolean))].sort(),
  [results]);

  const filteredResults = useMemo(() => {
    let r = results.filter(r => {
      if (Math.round(r.confidence * 100) < minMatch) return false;
      if (oscFilter && r.params.oscType !== oscFilter) return false;
      if (genreFilter.size > 0 && !genreFilter.has(r.genre.toLowerCase())) return false;
      const p = r.params;
      if (p.cutoff    < statFilters.cutoff[0]    || p.cutoff    > statFilters.cutoff[1])    return false;
      if (p.drive     < statFilters.drive[0]     || p.drive     > statFilters.drive[1])     return false;
      if (p.reverbWet < statFilters.reverbWet[0] || p.reverbWet > statFilters.reverbWet[1]) return false;
      if (p.attack    < statFilters.attack[0]    || p.attack    > statFilters.attack[1])    return false;
      if (p.release   < statFilters.release[0]   || p.release   > statFilters.release[1])   return false;
      if (p.chorus    < statFilters.chorus[0]    || p.chorus    > statFilters.chorus[1])    return false;
      return true;
    });
    if (sortBy === "match-desc") r = [...r].sort((a, b) => b.confidence - a.confidence);
    else if (sortBy === "match-asc") r = [...r].sort((a, b) => a.confidence - b.confidence);
    else r = [...r].sort((a, b) => a.name.localeCompare(b.name));
    return r;
  }, [results, sortBy, minMatch, oscFilter, genreFilter, statFilters]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (sortBy !== "match-desc")  n++;
    if (minMatch > 0)             n++;
    if (oscFilter)                n++;
    if (genreFilter.size > 0)     n++;
    if (statFilters.cutoff[0]    > STAT_DEFAULTS.cutoff[0]    || statFilters.cutoff[1]    < STAT_DEFAULTS.cutoff[1])    n++;
    if (statFilters.drive[0]     > STAT_DEFAULTS.drive[0]     || statFilters.drive[1]     < STAT_DEFAULTS.drive[1])     n++;
    if (statFilters.reverbWet[0] > STAT_DEFAULTS.reverbWet[0] || statFilters.reverbWet[1] < STAT_DEFAULTS.reverbWet[1]) n++;
    if (statFilters.attack[0]    > STAT_DEFAULTS.attack[0]    || statFilters.attack[1]    < STAT_DEFAULTS.attack[1])    n++;
    if (statFilters.release[0]   > STAT_DEFAULTS.release[0]   || statFilters.release[1]   < STAT_DEFAULTS.release[1])   n++;
    if (statFilters.chorus[0]    > STAT_DEFAULTS.chorus[0]    || statFilters.chorus[1]    < STAT_DEFAULTS.chorus[1])    n++;
    return n;
  }, [sortBy, minMatch, oscFilter, genreFilter, statFilters]);

  const clearFilters = useCallback(() => {
    setSortBy("match-desc"); setMinMatch(0); setOscFilter(""); setGenreFilter(new Set()); setStatFilters(STAT_DEFAULTS);
  }, []);

  // ── URL init: read ?a= on mount and auto-search ───────────────────────────
  const searchRef = useRef<((a: string, tags?: string[]) => void) | null>(null);
  useEffect(() => { searchRef.current = search; });
  useEffect(() => {
    const url = parseURLFilters();
    if (!url) return;
    setArtist(url.artist);
    setSortBy(url.sortBy as SortMode);
    setMinMatch(url.minMatch);
    setOscFilter(url.oscFilter as OscFilter);
    setGenreFilter(url.genreFilter as Set<string>);
    setStatFilters(url.statFilters);
    setTimeout(() => searchRef.current?.(url.artist), 0);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const audioCtxRef  = useRef<AudioContext | null>(null);
  const stopRef      = useRef<(() => void) | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopCurrent = useCallback(() => {
    stopRef.current?.(); stopRef.current = null;
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    setPlayingId(null);
  }, []);

  const getCtx = useCallback((): AudioContext => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }, []);

  const handlePlay = useCallback((name: string, params: SynthParams) => {
    stopCurrent();
    const ctx = getCtx();
    stopRef.current = playSound(ctx, params);
    setPlayingId(name);
    const dur = soundDuration(params);
    stopTimerRef.current = setTimeout(() => { stopRef.current = null; setPlayingId(null); }, dur * 1000);
  }, [stopCurrent, getCtx]);

  const handlePlayArp = useCallback((name: string, params: SynthParams) => {
    stopCurrent();
    const ctx = getCtx();
    const { stop, duration } = playArp(ctx, params);
    stopRef.current = stop;
    setPlayingId(name);
    stopTimerRef.current = setTimeout(() => { stopRef.current = null; setPlayingId(null); }, duration * 1000);
  }, [stopCurrent, getCtx]);

  const search = useCallback(async (overArtist?: string, manualTags?: string[]) => {
    const a = (overArtist ?? artist).trim();
    if (!a) return;
    stopCurrent();
    setLoading(true); setError(""); setResults([]); setVisibleCount(100);
    setSortBy("match-desc"); setMinMatch(0); setOscFilter(""); setGenreFilter(new Set()); setStatFilters(STAT_DEFAULTS);
    setSearchedArtist(a);
    setShowGenrePicker(false);
    setVariationsFor(null);
    addToHistory(a);
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", `?${new URLSearchParams({ a }).toString()}`);
    }
    setSimilarArtists([]); setArtistImage(null); setLoadingSimilar(true);

    const [soundsRes] = await Promise.all([
      fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artist: a, top_k: 2600, ...(manualTags ? { manualTags } : {}) }),
      }).then(async r => ({ ok: r.ok, status: r.status, data: await r.json() }))
        .catch(() => ({ ok: false, status: 500, data: {} })),

      fetch(`/api/similar?artist=${encodeURIComponent(a)}`)
        .then(async r => {
          if (r.ok) {
            const d = await r.json() as { similar: SimilarArtist[]; image: string | null };
            setSimilarArtists(d.similar ?? []);
            setArtistImage(d.image ?? null);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingSimilar(false)),
    ]);

    if (!soundsRes.ok) {
      if (soundsRes.status === 404) {
        setShowGenrePicker(true);
      } else {
        setError((soundsRes.data as { error?: string }).error ?? "Something went wrong");
      }
    } else {
      setResults((soundsRes.data as { results?: SoundResult[] }).results ?? []);
      setDataSources((soundsRes.data as { sources?: string[] }).sources ?? []);
    }
    setLoading(false);
  }, [artist, stopCurrent]);

  const hasContent = results.length > 0 || loading || showGenrePicker;

  return (
    <>
      <style>{`
        @keyframes fadeUp { from { opacity:0;transform:translateY(12px); } to { opacity:1;transform:translateY(0); } }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.5} }
        @keyframes spin   { to { transform:translateY(-50%) rotate(360deg); } }
        * { box-sizing: border-box; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: var(--accent2); cursor: pointer; }
      `}</style>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "0 12px 60px" : "0 16px 80px" }}>

        {/* Header */}
        <header style={{ padding: isMobile ? "32px 0 24px" : "48px 0 36px", textAlign: "center" }}>
          <h1 style={{ fontSize: isMobile ? "clamp(32px,12vw,56px)" : "clamp(40px,8vw,72px)", fontWeight: 900, background: "linear-gradient(135deg,#fff 20%,var(--accent2) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-2px", marginBottom: 12, lineHeight: 1.0 }}>
            AUDIOPILOT
          </h1>
          {!isMobile && (
            <p style={{ color: "var(--muted)", fontSize: 16, maxWidth: 460, margin: "0 auto", lineHeight: 1.6 }}>
              Search any artist from millions in Last.fm, Spotify &amp; MusicBrainz — find every sound in their sonic palette and copy synth parameters instantly.
            </p>
          )}
        </header>

        {/* Search bar */}
        <div style={{ marginBottom: isMobile ? 24 : 36 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: isMobile ? "wrap" : "nowrap" }}>
            <ArtistInput value={artist} onChange={setArtist} onSearch={search} />
            <button
              onClick={() => search()}
              disabled={loading || !artist.trim()}
              style={{
                padding: isMobile ? "12px 18px" : "14px 24px",
                width: isMobile ? "100%" : "auto",
                background: loading ? "var(--surface2)" : "linear-gradient(135deg,var(--accent),var(--accent2))",
                border: "none", borderRadius: 10, color: "#fff",
                fontSize: isMobile ? 15 : 14, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer",
                letterSpacing: "0.06em", opacity: !artist.trim() ? 0.5 : 1,
                fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0,
                transition: "opacity 0.2s",
              }}>
              {loading ? <span style={{ animation: "pulse 1s infinite" }}>Searching...</span> : "FIND ALL SOUNDS"}
            </button>
          </div>
          {error && (
            <p style={{ fontSize: 13, color: "var(--red)", textAlign: "center", marginTop: 10 }}>{error}</p>
          )}
        </div>

        {/* Search history */}
        {!hasContent && !loading && searchHistory.length > 0 && (
          <div style={{ marginBottom: 20, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
            <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginRight: 4, whiteSpace: "nowrap" }}>Recent</span>
            {searchHistory.map(h => (
              <button key={h} onClick={() => { setArtist(h); search(h); }}
                style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.background = "var(--surface2)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--surface)"; }}>
                {h}
              </button>
            ))}
            <button onClick={clearHistory}
              style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--muted)", cursor: "pointer", fontFamily: "inherit", marginLeft: 4 }}>
              Clear
            </button>
          </div>
        )}

        {/* Featured artists (when no search yet) */}
        {!hasContent && !loading && (
          <div style={{ marginBottom: 40 }}>
            <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Featured Artists
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {FEATURED.map((f) => (
                <button key={f.name}
                  onClick={() => { setArtist(f.name); search(f.name); }}
                  style={{ padding: "8px 14px", borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 13, cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "all 0.15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.background = "var(--surface2)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--surface)"; }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>{f.name}</div>
                  <div style={{ fontSize: 10, color: "var(--muted)" }}>{f.genre}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Genre picker — no tags found fallback */}
        {showGenrePicker && (
          <GenrePicker artist={searchedArtist} onSearch={(tags) => search(artist, tags)} />
        )}

        {/* Favorites panel */}
        {favorites.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: showFavorites ? 12 : 0 }}>
              <button onClick={() => setShowFavorites(v => !v)}
                style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontWeight: 700,
                  background: showFavorites ? "rgba(244,114,182,0.12)" : "var(--surface)",
                  border: `1px solid ${showFavorites ? "rgba(244,114,182,0.5)" : "var(--border)"}`,
                  color: showFavorites ? "#f472b6" : "var(--text)", transition: "all 0.2s" }}>
                <span style={{ fontSize: 16 }}>{showFavorites ? "♥" : "♡"}</span>
                Favorites
                <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 12, background: "rgba(244,114,182,0.2)", color: "#f472b6" }}>{favorites.length}</span>
              </button>
              {showFavorites && (
                <>
                  <button onClick={() => exportBulkVital(favorites, "favorites")}
                    style={{ fontSize: 12, padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontWeight: 700,
                      background: "linear-gradient(135deg,var(--accent),var(--accent2))", border: "none", color: "#fff", letterSpacing: "0.04em" }}>
                    ⬇ Export All ZIP
                  </button>
                  <button onClick={() => { if (confirm(`Remove all ${favorites.length} favorites?`)) clearFavorites(); }}
                    style={{ fontSize: 12, padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
                      background: "transparent", border: "1px solid rgba(239,68,68,0.35)", color: "#ef4444" }}>
                    Clear All
                  </button>
                </>
              )}
            </div>
            {showFavorites && (
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(360px,1fr))", gap: 12 }}>
                {favorites.map((r, i) => (
                  <SoundCard key={r.name} result={r} index={i}
                    isPlaying={playingId === r.name}
                    isFav={true}
                    onFav={() => toggleFav(r)}
                    onPlay={(params) => handlePlay(r.name, params)}
                    onPlayArp={(params) => handlePlayArp(r.name, params)}
                    onStop={stopCurrent}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Results — layout: sidebar + main */}
        {(results.length > 0 || loading) && (
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexDirection: isMobile ? "column" : "row" }}>

            {/* Similar artists — sidebar (desktop) or strip (mobile) */}
            <SimilarSidebar
              artists={similarArtists}
              mainImage={artistImage}
              loading={loadingSimilar}
              onSelect={(name) => { setArtist(name); search(name); }}
              mobile={isMobile}
            />

            {/* Main content */}
            <div style={{ flex: 1, minWidth: 0, width: "100%" }}>

              {/* Results header */}
              <div style={{ marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <p style={{ fontSize: isMobile ? 14 : 17, fontWeight: 700 }}>
                  <span style={{ color: "var(--accent2)" }}>{Math.min(visibleCount, filteredResults.length)}</span>
                  {" "}of{" "}
                  <span style={{ color: "var(--green)" }}>{filteredResults.length}</span>
                  {filteredResults.length !== results.length && <span style={{ color: "var(--muted)", fontSize: 12, fontWeight: 400 }}>{" "}(of {results.length})</span>}
                  {" "}sounds for <span style={{ color: "var(--accent2)" }}>{searchedArtist}</span>
                </p>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {dataSources.length > 0 && (
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>via</span>
                      {dataSources.map(s => (
                        <span key={s} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: "rgba(34,197,94,0.12)", color: "var(--green)", border: "1px solid rgba(34,197,94,0.25)", fontWeight: 700 }}>{s}</span>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => {
                      const url = buildShareURL(searchedArtist, { sortBy, minMatch, oscFilter, genreFilter, statFilters });
                      navigator.clipboard.writeText(url);
                      setLinkCopied(true);
                      setTimeout(() => setLinkCopied(false), 2000);
                    }}
                    style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: `1px solid ${linkCopied ? "var(--green)" : "var(--border)"}`, background: linkCopied ? "rgba(34,197,94,0.12)" : "var(--surface2)", color: linkCopied ? "var(--green)" : "var(--muted)", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, whiteSpace: "nowrap", transition: "all 0.2s" }}>
                    {linkCopied ? "✓ Copied!" : "🔗 Copy Link"}
                  </button>
                </div>
              </div>

              {/* Filter bar */}
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: isMobile ? "12px" : "14px 16px", marginBottom: 16 }}>

                {/* Sort + Match + Osc */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: isMobile ? 8 : 12, alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>Sort</span>
                    <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                      {(["match-desc", "match-asc", "name"] as SortMode[]).map(s => (
                        <button key={s} onClick={() => { setSortBy(s); setVisibleCount(100); }}
                          style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, border: `1px solid ${sortBy === s ? "var(--accent)" : "var(--border)"}`, background: sortBy === s ? "rgba(124,58,237,0.18)" : "var(--surface2)", color: sortBy === s ? "var(--accent2)" : "var(--muted)", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, whiteSpace: "nowrap" }}>
                          {s === "match-desc" ? "Best" : s === "match-asc" ? "Lowest" : "A–Z"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>Match</span>
                    <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                      {[0, 35, 50, 70, 90].map(pct => (
                        <button key={pct} onClick={() => { setMinMatch(pct); setVisibleCount(100); }}
                          style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, border: `1px solid ${minMatch === pct ? "var(--green)" : "var(--border)"}`, background: minMatch === pct ? "rgba(34,197,94,0.15)" : "var(--surface2)", color: minMatch === pct ? "var(--green)" : "var(--muted)", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
                          {pct === 0 ? "Any" : `${pct}%+`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Osc</span>
                    <div style={{ display: "flex", gap: 3 }}>
                      {(["", "sine", "saw", "square"] as OscFilter[]).map(o => {
                        const color = o === "sine" ? "#22c55e" : o === "saw" ? "#a855f7" : o === "square" ? "#f59e0b" : "var(--muted)";
                        const active = oscFilter === o;
                        return (
                          <button key={o || "all"} onClick={() => { setOscFilter(o); setVisibleCount(100); }}
                            style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, border: `1px solid ${active ? color : "var(--border)"}`, background: active ? `${color}22` : "var(--surface2)", color: active ? color : "var(--muted)", cursor: "pointer", fontFamily: "monospace", fontWeight: 700, textTransform: "uppercase" }}>
                            {o === "" ? "All" : o}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Genre + clear */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center", marginBottom: 14 }}>
                  <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>Genre</span>
                  {uniqueGenres.slice(0, isMobile ? 8 : 12).map(g => {
                    const active = genreFilter.has(g.toLowerCase());
                    const gc = gColor(g);
                    return (
                      <button key={g} onClick={() => {
                        setGenreFilter(prev => { const n = new Set(prev); active ? n.delete(g.toLowerCase()) : n.add(g.toLowerCase()); return n; });
                        setVisibleCount(100);
                      }}
                        style={{ fontSize: 10, padding: "3px 7px", borderRadius: 5, border: `1px solid ${active ? gc : "var(--border)"}`, background: active ? `${gc}22` : "var(--surface2)", color: active ? gc : "var(--muted)", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        {g}{active ? " ×" : ""}
                      </button>
                    );
                  })}
                  {uniqueGenres.length > (isMobile ? 8 : 12) && (
                    <span style={{ fontSize: 10, color: "var(--muted)" }}>+{uniqueGenres.length - (isMobile ? 8 : 12)} more</span>
                  )}
                  {activeFilterCount > 0 && (
                    <button onClick={clearFilters} style={{ marginLeft: "auto", fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.08)", color: "#ef4444", cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>
                      {activeFilterCount} × Clear
                    </button>
                  )}
                </div>

                {/* Stat range filters — always visible */}
                <div style={{ paddingTop: 12, borderTop: "1px solid var(--border)", display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fill,minmax(220px,1fr))", gap: isMobile ? "0 16px" : "0 28px" }}>
                  <RangeSlider label="Cutoff (Hz)"  min={20}   max={20000} step={100}  value={statFilters.cutoff}    onChange={v => { setStatFilters(f => ({...f, cutoff: v}));    setVisibleCount(100); }} format={v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : `${v}`} />
                  <RangeSlider label="Drive"        min={0}    max={1}     step={0.01} value={statFilters.drive}     onChange={v => { setStatFilters(f => ({...f, drive: v}));     setVisibleCount(100); }} format={v => v.toFixed(2)} />
                  <RangeSlider label="Reverb"       min={0}    max={1}     step={0.01} value={statFilters.reverbWet} onChange={v => { setStatFilters(f => ({...f, reverbWet: v})); setVisibleCount(100); }} format={v => v.toFixed(2)} />
                  <RangeSlider label="Chorus"       min={0}    max={1}     step={0.01} value={statFilters.chorus}    onChange={v => { setStatFilters(f => ({...f, chorus: v}));    setVisibleCount(100); }} format={v => v.toFixed(2)} />
                  <RangeSlider label="Attack (s)"   min={0}    max={5}     step={0.05} value={statFilters.attack}    onChange={v => { setStatFilters(f => ({...f, attack: v}));    setVisibleCount(100); }} format={v => `${v.toFixed(2)}s`} />
                  <RangeSlider label="Release (s)"  min={0}    max={8}     step={0.1}  value={statFilters.release}   onChange={v => { setStatFilters(f => ({...f, release: v}));   setVisibleCount(100); }} format={v => `${v.toFixed(1)}s`} />
                </div>
              </div>

              {/* Sound grid */}
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(360px,1fr))", gap: 12 }}>
                {filteredResults.slice(0, visibleCount).map((r, i) => (
                  <SoundCard
                    key={r.name} result={r} index={i}
                    isPlaying={playingId === r.name}
                    isFav={isFav(r.name, favorites)}
                    onFav={() => toggleFav(r)}
                    onPlay={(params) => handlePlay(r.name, params)}
                    onPlayArp={(params) => handlePlayArp(r.name, params)}
                    onStop={stopCurrent}
                    onVary={() => setVariationsFor(r)}
                  />
                ))}
              </div>

              {filteredResults.length === 0 && !loading && (
                <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)" }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>∅</div>
                  <p style={{ fontSize: 14 }}>No sounds match the current filters.</p>
                  <button onClick={clearFilters} style={{ marginTop: 12, fontSize: 13, padding: "8px 18px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text)", cursor: "pointer", fontFamily: "inherit" }}>Clear filters</button>
                </div>
              )}

              {visibleCount < filteredResults.length && (
                <div style={{ textAlign: "center", marginTop: 24 }}>
                  <button onClick={() => setVisibleCount(c => Math.min(c + 100, filteredResults.length))}
                    style={{ padding: "12px 32px", borderRadius: 10, background: "linear-gradient(135deg,var(--accent),var(--accent2))", border: "none", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em" }}>
                    Load 100 more ({filteredResults.length - visibleCount} remaining)
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Variations modal */}
        {variationsFor && (
          <VariationsModal
            source={variationsFor}
            onClose={() => setVariationsFor(null)}
            playingId={playingId}
            onPlay={handlePlay}
            onPlayArp={handlePlayArp}
            onStop={stopCurrent}
          />
        )}

        <footer style={{ marginTop: 60, textAlign: "center", color: "var(--muted)", fontSize: 12 }}>
          Open-source · MusicBrainz + Next.js ·{" "}
          <a href="https://github.com/RMamujee/audio-pilot" style={{ color: "var(--accent2)", textDecoration: "none" }}>GitHub</a>
        </footer>
      </div>
    </>
  );
}
