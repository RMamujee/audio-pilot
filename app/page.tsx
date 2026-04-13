"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SynthParams {
  cutoff: number; resonance: number;
  attack: number; decay: number; sustain: number; release: number;
  reverbSize: number; reverbWet: number;
  oscType: string; drive: number; chorus: number; delayMix: number;
}

interface PresetResult {
  name: string; description: string; genre: string;
  confidence: number; matchedArtist: boolean;
  matchedTags: string[]; artistTags: string[];
  params: SynthParams;
  artists: string[]; tags: string[];
}

interface ArtistSuggestion {
  name: string; disambiguation: string; country: string; score: number;
}

// ─── Genre browser config ─────────────────────────────────────────────────────

const GENRES = [
  { label: "Trap",        icon: "🔫", prompt: "",                          artist: "metro boomin" },
  { label: "Lo-Fi",       icon: "📻", prompt: "lofi chill warm",           artist: "" },
  { label: "Techno",      icon: "⚙️",  prompt: "techno dark industrial",    artist: "" },
  { label: "House",       icon: "🏠", prompt: "house groove",              artist: "daft punk" },
  { label: "Ambient",     icon: "🌊", prompt: "ambient texture evolving",  artist: "" },
  { label: "DnB",         icon: "🥁", prompt: "drum and bass rolling",     artist: "" },
  { label: "Dubstep",     icon: "💥", prompt: "dubstep wobble bass",       artist: "skrillex" },
  { label: "R&B",         icon: "🎤", prompt: "smooth r&b emotional",      artist: "frank ocean" },
  { label: "Synthwave",   icon: "🌅", prompt: "retrowave 80s neon",        artist: "kavinsky" },
  { label: "Future Bass", icon: "🚀", prompt: "future bass euphoric",      artist: "flume" },
  { label: "IDM",         icon: "🧠", prompt: "idm glitchy complex",       artist: "aphex twin" },
  { label: "Shoegaze",    icon: "🎸", prompt: "shoegaze wall of sound",    artist: "" },
  { label: "K-Pop",       icon: "✨", prompt: "k-pop bright catchy",       artist: "" },
  { label: "Phonk",       icon: "💀", prompt: "phonk dark memphis",        artist: "" },
  { label: "Afrobeats",   icon: "🌍", prompt: "afrobeats groove warm",     artist: "burna boy" },
  { label: "Trance",      icon: "🕊️", prompt: "trance euphoric uplifting", artist: "armin van buuren" },
];

const SUGGESTIONS = [
  { prompt: "dark ambient pad",       artist: "Travis Scott" },
  { prompt: "808 sub bass heavy",     artist: "Metro Boomin" },
  { prompt: "ethereal choir shimmer", artist: "Frank Ocean" },
  { prompt: "acid pluck resonant",    artist: "Aphex Twin" },
  { prompt: "warm lofi chill",        artist: "J Dilla" },
  { prompt: "future bass supersaw",   artist: "Flume" },
  { prompt: "techno industrial dark", artist: "Charlotte de Witte" },
  { prompt: "phonk cowbell raw",      artist: "DJ Smokey" },
];

// ─── Audio helpers ────────────────────────────────────────────────────────────

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

function makeReverb(ctx: AudioContext, size: number, wet: number): ConvolverNode {
  const cv = ctx.createConvolver();
  const len = Math.max(512, Math.floor(ctx.sampleRate * size * 4));
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const ch = buf.getChannelData(c);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.5 + wet);
  }
  cv.buffer = buf; return cv;
}

function makeDriveCurve(amount: number): Float32Array<ArrayBuffer> {
  const n = 256; const curve = new Float32Array(new ArrayBuffer(n * 4)); const k = amount * 100;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = k > 0 ? ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x)) : x;
  }
  return curve;
}

function playSound(ctx: AudioContext, p: SynthParams): () => void {
  const now = ctx.currentTime;
  const oscTypeMap: Record<string, OscillatorType> = { sine: "sine", saw: "sawtooth", square: "square" };
  const oscType  = oscTypeMap[p.oscType] ?? "sawtooth";
  const baseFreq = p.cutoff < 400 ? 55 : p.cutoff < 1500 ? 110 : p.attack > 0.5 ? 110 : 220;

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
  shaper.curve = makeDriveCurve(p.drive); shaper.oversample = "2x";

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
  filter.connect(shaper); shaper.connect(env);
  env.connect(dryGain); env.connect(reverbGain); env.connect(delayGain);
  dryGain.connect(ctx.destination);
  reverbGain.connect(reverb); reverb.connect(ctx.destination);
  delayGain.connect(delay); delay.connect(ctx.destination);

  return () => oscillators.forEach(o => { try { o.stop(); } catch { /* ok */ } });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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

const OSC_COLORS: Record<string, string> = { sine: "#22c55e", saw: "#a855f7", square: "#f59e0b" };

const GENRE_COLORS: Record<string, string> = {
  trap: "#ef4444", "emo rap": "#ec4899", phonk: "#dc2626", drill: "#991b1b",
  "boom bap": "#b45309", "hip-hop soul": "#d97706", "neo-soul": "#92400e",
  "lo-fi": "#059669", chillhop: "#047857",
  "dark ambient": "#1e3a5f", ambient: "#1d4ed8", "dream pop": "#4338ca",
  neoclassical: "#6d28d9", experimental: "#581c87",
  "acid techno": "#7c2d12", techno: "#374151", "deep house": "#0f3460",
  house: "#1e40af", "french house": "#1d4ed8", "future house": "#0284c7",
  "melodic house": "#0369a1", "afro house": "#065f46",
  trance: "#7c3aed", psytrance: "#6d28d9", "progressive trance": "#5b21b6",
  "future bass": "#0891b2", dubstep: "#b91c1c", "electro house": "#991b1b",
  neurofunk: "#4b5563", "drum and bass": "#1f2937", "liquid dnb": "#0284c7",
  "uk garage": "#4b5563", grime: "#374151",
  idm: "#1e40af", "r&b": "#7e22ce", "synth-pop": "#0891b2",
  electropop: "#0369a1", hyperpop: "#db2777", pop: "#4f46e5",
  synthwave: "#7c2d12", vaporwave: "#a855f7", psychedelic: "#16a34a",
  "indie folk": "#92400e", "post-dubstep": "#4b5563",
  industrial: "#374151", shoegaze: "#6d28d9", "post-rock": "#1e40af",
  "trap metal": "#7f1d1d", jazz: "#b45309", funk: "#92400e",
  soul: "#9a3412", "nu-disco": "#be185d", disco: "#c026d3",
  reggaeton: "#b91c1c", afrobeats: "#15803d", amapiano: "#0f766e",
  "k-pop": "#db2777", "film score": "#374151", "cloud rap": "#4338ca",
  electro: "#374151", electronic: "#1e40af",
};

function gColor(genre: string): string {
  return GENRE_COLORS[genre.toLowerCase()] ?? "#374151";
}

function PresetCard({ result, index, isPlaying, onPlay, onStop }: {
  result: PresetResult; index: number; isPlaying: boolean; onPlay: () => void; onStop: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const oscColor  = OSC_COLORS[result.params.oscType] ?? "#888";
  const confPct   = Math.round(Math.min(result.confidence, 1) * 100);
  const confColor = confPct > 70 ? "var(--green)" : confPct > 40 ? "var(--accent2)" : "var(--muted)";
  const gc        = gColor(result.genre);

  return (
    <div style={{
      background: "var(--surface)", border: `1px solid ${isPlaying ? "var(--accent)" : "var(--border)"}`,
      borderRadius: 12, padding: 20, position: "relative", overflow: "hidden",
      animation: `fadeUp 0.35s ease ${index * 0.06}s both`,
      transition: "border-color 0.2s, box-shadow 0.2s",
      boxShadow: isPlaying ? "0 0 24px rgba(124,58,237,0.25)" : "none",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${gc},var(--accent2),transparent)` }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: oscColor, display: "inline-block", boxShadow: `0 0 6px ${oscColor}`, flexShrink: 0 }} />
            <h3 style={{ fontSize: 14, fontWeight: 700 }}>{result.name}</h3>
            {result.genre && (
              <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: `${gc}33`, color: gc, border: `1px solid ${gc}55`, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {result.genre}
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: confColor, fontWeight: 600 }}>{confPct}% match</span>
            {result.matchedArtist && (
              <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(124,58,237,0.2)", color: "var(--accent2)", fontWeight: 700 }}>ARTIST</span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, marginLeft: 10 }}>
          <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, background: "var(--surface2)", border: "1px solid var(--border)", color: oscColor, fontFamily: "monospace", fontWeight: 700, textTransform: "uppercase" }}>
            {result.params.oscType}
          </span>
          <button onClick={isPlaying ? onStop : onPlay}
            style={{ fontSize: 12, padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", fontWeight: 700,
              background: isPlaying ? "rgba(124,58,237,0.25)" : "linear-gradient(135deg,var(--accent),var(--accent2))",
              border: `1px solid ${isPlaying ? "var(--accent2)" : "transparent"}`,
              color: "#fff", letterSpacing: "0.04em", animation: isPlaying ? "pulse 1.5s ease infinite" : "none" }}>
            {isPlaying ? "■ Stop" : "▶ Preview"}
          </button>
          <button onClick={() => {
            navigator.clipboard.writeText(JSON.stringify(result.params, null, 2));
            setCopied(true); setTimeout(() => setCopied(false), 2000);
          }}
            style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, cursor: "pointer",
              background: copied ? "rgba(34,197,94,0.15)" : "var(--surface2)",
              border: `1px solid ${copied ? "var(--green)" : "var(--border)"}`,
              color: copied ? "var(--green)" : "var(--muted)", transition: "all 0.2s" }}>
            {copied ? "✓ Copied" : "Copy params"}
          </button>
        </div>
      </div>

      {result.artists.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
          {result.artists.slice(0, 5).map((a) => (
            <span key={a} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, background: "var(--surface2)", color: "var(--muted)", border: "1px solid var(--border)" }}>{a}</span>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
        {PARAM_BARS.map(({ key, label, min, max, unit }) => (
          <ParamBar key={key} label={label} value={result.params[key] as number} min={min} max={max} unit={unit} />
        ))}
      </div>

      {result.artistTags && result.artistTags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 10, alignItems: "center" }}>
          <span style={{ fontSize: 9, color: "var(--muted)", marginRight: 2 }}>MB TAGS:</span>
          {result.artistTags.slice(0, 7).map((tag) => (
            <span key={tag} style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "rgba(168,85,247,0.1)", color: "var(--accent2)", border: "1px solid rgba(168,85,247,0.2)" }}>{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Artist autocomplete ──────────────────────────────────────────────────────

function ArtistInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
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

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Artist (optional) {fetching && <span style={{ color: "var(--accent2)" }}>↻</span>}
      </label>
      <input type="text" value={value}
        placeholder="Travis Scott, Burial, Aphex Twin..."
        onChange={(e) => { onChange(e.target.value); lookup(e.target.value); }}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        style={{ width: "100%", padding: "10px 14px", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 14, outline: "none", fontFamily: "inherit" }}
      />
      {open && suggestions.length > 0 && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, zIndex: 50, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
          {suggestions.map((s) => (
            <button key={s.name + s.disambiguation}
              onClick={() => { onChange(s.name); setSuggestions([]); setOpen(false); }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 14px", background: "transparent", border: "none", borderBottom: "1px solid var(--border)", cursor: "pointer", color: "var(--text)", fontFamily: "inherit" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface2)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</span>
              {s.disambiguation && <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 8 }}>{s.disambiguation}</span>}
              {s.country && <span style={{ fontSize: 10, color: "var(--accent2)", marginLeft: 6 }}>[{s.country}]</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type SortMode = "match" | "genre" | "name";

export default function Home() {
  const [prompt,      setPrompt]      = useState("");
  const [artist,      setArtist]      = useState("");
  const [results,     setResults]     = useState<PresetResult[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [playingId,   setPlayingId]   = useState<string | null>(null);
  const [sortMode,    setSortMode]    = useState<SortMode>("match");
  const [filterGenre, setFilterGenre] = useState<string>("");

  const audioCtxRef  = useRef<AudioContext | null>(null);
  const stopRef      = useRef<(() => void) | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopCurrent = useCallback(() => {
    stopRef.current?.(); stopRef.current = null;
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    setPlayingId(null);
  }, []);

  const handlePlay = useCallback((result: PresetResult) => {
    stopCurrent();
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") ctx.resume();
    stopRef.current = playSound(ctx, result.params);
    setPlayingId(result.name);
    const p = result.params;
    const dur = p.attack + p.decay + Math.min(p.sustain * 3 + 0.5, 3) + Math.min(p.release, 3) + 0.2;
    stopTimerRef.current = setTimeout(() => { stopRef.current = null; setPlayingId(null); }, dur * 1000);
  }, [stopCurrent]);

  const search = useCallback(async (overPrompt?: string, overArtist?: string) => {
    const p = (overPrompt ?? prompt).trim();
    const a = (overArtist ?? artist).trim();
    if (!p && !a) return;
    stopCurrent(); setLoading(true); setError(""); setResults([]);
    try {
      const res  = await fetch("/api/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: p, artist: a, top_k: 6 }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong"); return; }
      setResults(data.results ?? []);
    } catch {
      setError("Failed to reach API");
    } finally {
      setLoading(false);
    }
  }, [prompt, artist, stopCurrent]);

  const displayedResults = (() => {
    let r = [...results];
    if (filterGenre) r = r.filter(x => x.genre.toLowerCase() === filterGenre.toLowerCase());
    if (sortMode === "genre") r.sort((a, b) => a.genre.localeCompare(b.genre));
    if (sortMode === "name")  r.sort((a, b) => a.name.localeCompare(b.name));
    return r;
  })();

  const resultGenres = [...new Set(results.map(r => r.genre).filter(Boolean))];

  return (
    <>
      <style>{`
        @keyframes fadeUp { from { opacity:0;transform:translateY(12px); } to { opacity:1;transform:translateY(0); } }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.5} }
      `}</style>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 16px 80px" }}>

        {/* ── Header ── */}
        <header style={{ padding: "36px 0 28px", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "4px 14px", marginBottom: 20, fontSize: 12, color: "var(--muted)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", display: "inline-block", boxShadow: "0 0 6px var(--green)" }} />
            AI SOUND FINDER &nbsp;·&nbsp; 200+ PRESETS &nbsp;·&nbsp; MILLIONS OF ARTISTS &nbsp;·&nbsp;
            <a href="/synth" style={{ color: "var(--accent2)" }}>▶ Open Synth</a>
          </div>
          <h1 style={{ fontSize: "clamp(32px,6vw,56px)", fontWeight: 800, background: "linear-gradient(135deg,#fff 0%,var(--accent2) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-1px", marginBottom: 12, lineHeight: 1.1 }}>
            AUDIOPILOT
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 15, maxWidth: 520, margin: "0 auto" }}>
            Search <strong style={{ color: "var(--text)" }}>any artist</strong> from millions in MusicBrainz — AI maps their genre tags to synth parameters in real-time.
            Type a vibe, name anyone, preview and copy presets.
          </p>
        </header>

        {/* ── Search panel ── */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Sound / Vibe</label>
              <input type="text" value={prompt}
                placeholder="dark ambient pad, 808 bass, acid pluck..."
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search()}
                style={{ width: "100%", padding: "10px 14px", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 14, outline: "none", fontFamily: "inherit" }}
              />
            </div>
            <ArtistInput value={artist} onChange={setArtist} />
          </div>
          <button onClick={() => search()} disabled={loading || (!prompt.trim() && !artist.trim())}
            style={{ width: "100%", padding: "12px", background: loading ? "var(--surface2)" : "linear-gradient(135deg,var(--accent),var(--accent2))", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", letterSpacing: "0.05em", opacity: (!prompt.trim() && !artist.trim()) ? 0.5 : 1, fontFamily: "inherit" }}>
            {loading ? <span style={{ animation: "pulse 1s infinite" }}>Finding sounds via AI + MusicBrainz...</span> : "FIND SOUNDS"}
          </button>
          {error && <p style={{ marginTop: 10, fontSize: 13, color: "var(--red)", textAlign: "center" }}>{error}</p>}
        </div>

        {/* ── Genre browser ── */}
        {results.length === 0 && !loading && (
          <>
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Browse by genre</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(108px,1fr))", gap: 8 }}>
                {GENRES.map((g) => (
                  <button key={g.label}
                    onClick={() => { setPrompt(g.prompt); setArtist(g.artist); search(g.prompt, g.artist); }}
                    style={{ padding: "10px 8px", borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 12, cursor: "pointer", fontFamily: "inherit", textAlign: "center" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.background = "var(--surface2)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)";  e.currentTarget.style.background = "var(--surface)"; }}
                  >
                    <div style={{ fontSize: 18, marginBottom: 4 }}>{g.icon}</div>
                    <div style={{ fontWeight: 600 }}>{g.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 32 }}>
              <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Quick picks</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {SUGGESTIONS.map((s) => (
                  <button key={s.prompt + s.artist}
                    onClick={() => { setPrompt(s.prompt); setArtist(s.artist); search(s.prompt, s.artist); }}
                    style={{ padding: "6px 12px", borderRadius: 6, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                    {s.artist ? `${s.artist} — ` : ""}{s.prompt}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Results toolbar ── */}
        {results.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
            <p style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {displayedResults.length} of {results.length} sounds
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {resultGenres.length > 1 && (
                <select value={filterGenre} onChange={(e) => setFilterGenre(e.target.value)}
                  style={{ padding: "4px 10px", borderRadius: 6, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 12, cursor: "pointer", fontFamily: "inherit", outline: "none" }}>
                  <option value="">All genres</option>
                  {resultGenres.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              )}
              {(["match", "genre", "name"] as SortMode[]).map((m) => (
                <button key={m} onClick={() => setSortMode(m)}
                  style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                    background: sortMode === m ? "var(--accent)" : "var(--surface)",
                    border: `1px solid ${sortMode === m ? "var(--accent)" : "var(--border)"}`,
                    color: sortMode === m ? "#fff" : "var(--muted)", fontWeight: sortMode === m ? 700 : 400 }}>
                  {m === "match" ? "Best match" : m}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Result cards ── */}
        {displayedResults.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(380px,1fr))", gap: 14 }}>
            {displayedResults.map((r, i) => (
              <PresetCard key={r.name} result={r} index={i}
                isPlaying={playingId === r.name}
                onPlay={() => handlePlay(r)}
                onStop={stopCurrent}
              />
            ))}
          </div>
        )}

        <footer style={{ marginTop: 60, textAlign: "center", color: "var(--muted)", fontSize: 12 }}>
          Open-source · JUCE + sentence-transformers + MusicBrainz + Next.js ·{" "}
          <a href="https://github.com/RMamujee/serum-dupe" style={{ color: "var(--accent2)", textDecoration: "none" }}>GitHub</a>
        </footer>
      </div>
    </>
  );
}
