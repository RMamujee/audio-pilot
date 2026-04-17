"use client";

import { useState, useRef, useCallback, useEffect } from "react";

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
  filter.connect(shaper); shaper.connect(env);
  env.connect(dryGain); env.connect(reverbGain); env.connect(delayGain);
  dryGain.connect(ctx.destination);
  reverbGain.connect(reverb); reverb.connect(ctx.destination);
  delayGain.connect(delay); delay.connect(ctx.destination);

  return () => oscillators.forEach(o => { try { o.stop(); } catch { /* ok */ } });
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

function SoundCard({ result, index, isPlaying, onPlay, onStop }: {
  result: SoundResult; index: number; isPlaying: boolean; onPlay: () => void; onStop: () => void;
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
      animation: `fadeUp 0.35s ease ${index * 0.05}s both`,
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
        {PARAM_BARS.map(({ key, label, min, max, unit }) => (
          <ParamBar key={key} label={label} value={result.params[key] as number} min={min} max={max} unit={unit} />
        ))}
      </div>

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

// ─── Artist autocomplete ──────────────────────────────────────────────────────

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
    onChange(name);
    setSuggestions([]);
    setOpen(false);
    onSearch(name);
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", flex: 1 }}>
      <input
        type="text"
        value={value}
        placeholder="Search any artist — Travis Scott, Aphex Twin, Daft Punk..."
        onChange={(e) => { onChange(e.target.value); lookup(e.target.value); }}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onKeyDown={(e) => { if (e.key === "Enter") { setOpen(false); onSearch(value); } }}
        style={{
          width: "100%", padding: "14px 44px 14px 18px",
          background: "var(--surface2)", border: "2px solid var(--border)",
          borderRadius: 10, color: "var(--text)", fontSize: 16,
          outline: "none", fontFamily: "inherit", transition: "border-color 0.2s",
        }}
      />
      {fetching && (
        <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--accent2)", fontSize: 18, animation: "spin 1s linear infinite" }}>↻</span>
      )}
      {open && suggestions.length > 0 && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, zIndex: 50, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
          {suggestions.map((s) => (
            <button key={s.name + s.disambiguation}
              onClick={() => select(s.name)}
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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Home() {
  const [artist,         setArtist]         = useState("");
  const [results,        setResults]        = useState<SoundResult[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState("");
  const [playingId,      setPlayingId]      = useState<string | null>(null);
  const [searchedArtist, setSearchedArtist] = useState("");
  const [dataSources,    setDataSources]    = useState<string[]>([]);

  const audioCtxRef  = useRef<AudioContext | null>(null);
  const stopRef      = useRef<(() => void) | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopCurrent = useCallback(() => {
    stopRef.current?.(); stopRef.current = null;
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    setPlayingId(null);
  }, []);

  const handlePlay = useCallback((result: SoundResult) => {
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

  const search = useCallback(async (overArtist?: string) => {
    const a = (overArtist ?? artist).trim();
    if (!a) return;
    stopCurrent(); setLoading(true); setError(""); setResults([]);
    setSearchedArtist(a);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artist: a, top_k: 100 }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong"); return; }
      setResults(data.results ?? []);
      setDataSources(data.sources ?? []);
    } catch {
      setError("Failed to reach API");
    } finally {
      setLoading(false);
    }
  }, [artist, stopCurrent]);

  return (
    <>
      <style>{`
        @keyframes fadeUp { from { opacity:0;transform:translateY(12px); } to { opacity:1;transform:translateY(0); } }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.5} }
        @keyframes spin   { to { transform:translateY(-50%) rotate(360deg); } }
      `}</style>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 16px 80px" }}>

        {/* Header */}
        <header style={{ padding: "48px 0 36px", textAlign: "center" }}>
          <h1 style={{ fontSize: "clamp(40px,8vw,72px)", fontWeight: 900, background: "linear-gradient(135deg,#fff 20%,var(--accent2) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-2px", marginBottom: 16, lineHeight: 1.0 }}>
            AUDIOPILOT
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 16, maxWidth: 460, margin: "0 auto", lineHeight: 1.6 }}>
            Search any artist from millions in Last.fm, Spotify &amp; MusicBrainz — find every sound in their sonic palette and copy synth parameters instantly.
          </p>
        </header>

        {/* Search bar */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <ArtistInput value={artist} onChange={setArtist} onSearch={search} />
            <button
              onClick={() => search()}
              disabled={loading || !artist.trim()}
              style={{
                padding: "14px 24px",
                background: loading ? "var(--surface2)" : "linear-gradient(135deg,var(--accent),var(--accent2))",
                border: "none", borderRadius: 10, color: "#fff",
                fontSize: 14, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer",
                letterSpacing: "0.06em", opacity: !artist.trim() ? 0.5 : 1,
                fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0,
                transition: "opacity 0.2s",
              }}>
              {loading
                ? <span style={{ animation: "pulse 1s infinite" }}>Searching...</span>
                : "FIND ALL SOUNDS"}
            </button>
          </div>
          {error && (
            <p style={{ fontSize: 13, color: "var(--red)", textAlign: "center", marginTop: 10 }}>{error}</p>
          )}
        </div>

        {/* Featured artists (shown when no results) */}
        {results.length === 0 && !loading && (
          <div style={{ marginBottom: 40 }}>
            <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Featured Artists
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {FEATURED.map((f) => (
                <button
                  key={f.name}
                  onClick={() => { setArtist(f.name); search(f.name); }}
                  style={{ padding: "8px 14px", borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 13, cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "all 0.15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.background = "var(--surface2)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)";  e.currentTarget.style.background = "var(--surface)"; }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>{f.name}</div>
                  <div style={{ fontSize: 10, color: "var(--muted)" }}>{f.genre}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <>
            <div style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <p style={{ fontSize: 17, fontWeight: 700 }}>
                {results.length} sound{results.length !== 1 ? "s" : ""} for{" "}
                <span style={{ color: "var(--accent2)" }}>{searchedArtist}</span>
              </p>
              {dataSources.length > 0 && (
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>via</span>
                  {dataSources.map(s => (
                    <span key={s} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: "rgba(34,197,94,0.12)", color: "var(--green)", border: "1px solid rgba(34,197,94,0.25)", fontWeight: 700 }}>{s}</span>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(380px,1fr))", gap: 14 }}>
              {results.map((r, i) => (
                <SoundCard
                  key={r.name} result={r} index={i}
                  isPlaying={playingId === r.name}
                  onPlay={() => handlePlay(r)}
                  onStop={stopCurrent}
                />
              ))}
            </div>
          </>
        )}

        <footer style={{ marginTop: 60, textAlign: "center", color: "var(--muted)", fontSize: 12 }}>
          Open-source · MusicBrainz + Next.js ·{" "}
          <a href="https://github.com/RMamujee/audio-pilot" style={{ color: "var(--accent2)", textDecoration: "none" }}>GitHub</a>
        </footer>
      </div>
    </>
  );
}
