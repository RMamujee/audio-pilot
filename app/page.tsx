"use client";

import { useState, useRef, useCallback } from "react";

interface SynthParams {
  cutoff: number;
  resonance: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  reverbSize: number;
  reverbWet: number;
  oscType: string;
  drive: number;
  chorus: number;
  delayMix: number;
}

interface PresetResult {
  name: string;
  description: string;
  confidence: number;
  matchedArtist: boolean;
  matchedTags: string[];
  params: SynthParams;
  artists: string[];
  tags: string[];
}

const PARAM_BARS: { key: keyof SynthParams; label: string; min: number; max: number; unit?: string }[] = [
  { key: "cutoff",     label: "Cutoff",    min: 20,  max: 20000, unit: "Hz" },
  { key: "resonance",  label: "Resonance", min: 0.1, max: 10 },
  { key: "attack",     label: "Attack",    min: 0,   max: 5,     unit: "s" },
  { key: "decay",      label: "Decay",     min: 0,   max: 5,     unit: "s" },
  { key: "sustain",    label: "Sustain",   min: 0,   max: 1 },
  { key: "release",    label: "Release",   min: 0,   max: 8,     unit: "s" },
  { key: "reverbWet",  label: "Reverb",    min: 0,   max: 1 },
  { key: "drive",      label: "Drive",     min: 0,   max: 1 },
  { key: "chorus",     label: "Chorus",    min: 0,   max: 1 },
  { key: "delayMix",   label: "Delay",     min: 0,   max: 1 },
];

// Build a reverb impulse response from white noise
function makeReverb(ctx: AudioContext, size: number, wet: number): ConvolverNode {
  const convolver = ctx.createConvolver();
  const length    = Math.max(512, Math.floor(ctx.sampleRate * size * 4));
  const buf       = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const ch = buf.getChannelData(c);
    for (let i = 0; i < length; i++) {
      ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 1.5 + wet);
    }
  }
  convolver.buffer = buf;
  return convolver;
}

// Waveshaper curve for soft saturation/drive
function makeDriveCurve(amount: number): Float32Array<ArrayBuffer> {
  const n   = 256;
  const curve = new Float32Array(new ArrayBuffer(n * 4));
  const k   = amount * 100;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = k > 0
      ? ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x))
      : x;
  }
  return curve;
}

function playSound(ctx: AudioContext, p: SynthParams): () => void {
  const now      = ctx.currentTime;
  const oscTypeMap: Record<string, OscillatorType> = {
    sine: "sine", saw: "sawtooth", square: "square",
  };
  const oscType   = oscTypeMap[p.oscType] ?? "sawtooth";

  // Pick base frequency by preset character
  const baseFreq = p.cutoff < 400 ? 55 : p.cutoff < 1500 ? 110 : p.attack > 0.5 ? 110 : 220;

  // --- Master gain (ADSR) ---
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(0.5, now + p.attack);
  env.gain.linearRampToValueAtTime(0.5 * p.sustain, now + p.attack + p.decay);

  const sustainEnd = now + p.attack + p.decay + Math.min(p.sustain * 3 + 0.5, 3);
  const releaseEnd = sustainEnd + Math.min(p.release, 3);
  env.gain.setValueAtTime(0.5 * p.sustain, sustainEnd);
  env.gain.linearRampToValueAtTime(0, releaseEnd);

  // --- Filter ---
  const filter = ctx.createBiquadFilter();
  filter.type            = "lowpass";
  filter.frequency.value = Math.min(p.cutoff, ctx.sampleRate / 2 - 1);
  filter.Q.value         = p.resonance;

  // --- Drive (waveshaper) ---
  const shaper = ctx.createWaveShaper();
  shaper.curve   = makeDriveCurve(p.drive);
  shaper.oversample = "2x";

  // --- Reverb ---
  const reverb    = makeReverb(ctx, p.reverbSize, p.reverbWet);
  const reverbGain = ctx.createGain();
  reverbGain.gain.value = p.reverbWet;
  const dryGain = ctx.createGain();
  dryGain.gain.value = 1 - p.reverbWet * 0.5;

  // --- Delay ---
  const delay = ctx.createDelay(1.0);
  delay.delayTime.value = 0.375;
  const delayFb = ctx.createGain();
  delayFb.gain.value = 0.4;
  const delayGain = ctx.createGain();
  delayGain.gain.value = p.delayMix;
  delay.connect(delayFb);
  delayFb.connect(delay);

  // --- Oscillators ---
  const oscillators: OscillatorNode[] = [];

  function makeOsc(freq: number, detune = 0, gainVal = 1) {
    const osc = ctx.createOscillator();
    osc.type = oscType;
    osc.frequency.value = freq;
    osc.detune.value    = detune;
    const g = ctx.createGain();
    g.gain.value = gainVal;
    osc.connect(g);
    g.connect(filter);
    osc.start(now);
    osc.stop(releaseEnd + 0.1);
    oscillators.push(osc);
  }

  // Main oscillator + chorus (extra detuned voices for saw)
  makeOsc(baseFreq);
  if (p.chorus > 0.1 && oscType === "sawtooth") {
    const spread = p.chorus * 15;
    makeOsc(baseFreq, -spread, p.chorus * 0.6);
    makeOsc(baseFreq,  spread, p.chorus * 0.6);
    makeOsc(baseFreq * 2, -spread * 0.5, p.chorus * 0.3);
  }

  // Signal chain: filter -> shaper -> env -> dry/reverb -> destination
  filter.connect(shaper);
  shaper.connect(env);
  env.connect(dryGain);
  env.connect(reverbGain);
  env.connect(delayGain);
  dryGain.connect(ctx.destination);
  reverbGain.connect(reverb);
  reverb.connect(ctx.destination);
  delayGain.connect(delay);
  delay.connect(ctx.destination);

  return () => {
    oscillators.forEach(o => { try { o.stop(); } catch { /* already stopped */ } });
  };
}

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
        <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, var(--accent), var(--accent2))", borderRadius: 2, transition: "width 0.4s cubic-bezier(0.4,0,0.2,1)" }} />
      </div>
    </div>
  );
}

const OSC_COLORS: Record<string, string> = { sine: "#22c55e", saw: "#a855f7", square: "#f59e0b" };

function PresetCard({ result, index, isPlaying, onPlay, onStop }: {
  result: PresetResult;
  index: number;
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const oscColor = OSC_COLORS[result.params.oscType] ?? "#888";
  const confPct  = Math.round(Math.min(result.confidence, 1) * 100);
  const confColor = confPct > 70 ? "var(--green)" : confPct > 40 ? "var(--accent2)" : "var(--muted)";

  return (
    <div style={{
      background: "var(--surface)", border: `1px solid ${isPlaying ? "var(--accent)" : "var(--border)"}`,
      borderRadius: 12, padding: 20, position: "relative", overflow: "hidden",
      animation: `fadeUp 0.35s ease ${index * 0.07}s both`,
      transition: "border-color 0.2s",
      boxShadow: isPlaying ? "0 0 20px rgba(124,58,237,0.2)" : "none",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, var(--accent), var(--accent2), transparent)" }} />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: oscColor, display: "inline-block", boxShadow: `0 0 6px ${oscColor}` }} />
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>{result.name}</h3>
          </div>
          <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>{result.description}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, color: confColor, fontWeight: 600 }}>{confPct}% match</span>
            {result.matchedArtist && (
              <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(124,58,237,0.2)", color: "var(--accent2)", fontWeight: 600 }}>ARTIST</span>
            )}
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, marginLeft: 12 }}>
          <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, background: "var(--surface2)", border: "1px solid var(--border)", color: oscColor, fontFamily: "monospace", fontWeight: 700, textTransform: "uppercase" }}>
            {result.params.oscType}
          </span>

          {/* PLAY BUTTON */}
          <button
            onClick={isPlaying ? onStop : onPlay}
            style={{
              fontSize: 12, padding: "5px 12px", borderRadius: 6, cursor: "pointer",
              fontFamily: "inherit", fontWeight: 700, transition: "all 0.15s",
              background: isPlaying ? "rgba(124,58,237,0.25)" : "linear-gradient(135deg, var(--accent), var(--accent2))",
              border: `1px solid ${isPlaying ? "var(--accent2)" : "transparent"}`,
              color: "#fff", letterSpacing: "0.04em",
              animation: isPlaying ? "pulse 1.5s ease infinite" : "none",
            }}
          >
            {isPlaying ? "■ Stop" : "▶ Preview"}
          </button>

          <button
            onClick={() => { navigator.clipboard.writeText(JSON.stringify(result.params, null, 2)); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            style={{
              fontSize: 11, padding: "3px 8px", borderRadius: 6, background: copied ? "rgba(34,197,94,0.15)" : "var(--surface2)",
              border: `1px solid ${copied ? "var(--green)" : "var(--border)"}`, color: copied ? "var(--green)" : "var(--muted)", cursor: "pointer", transition: "all 0.2s",
            }}
          >
            {copied ? "✓ Copied" : "Copy params"}
          </button>
        </div>
      </div>

      {/* Artist pills */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 14 }}>
        {result.artists.slice(0, 4).map((a) => (
          <span key={a} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, background: "var(--surface2)", color: "var(--muted)", border: "1px solid var(--border)" }}>{a}</span>
        ))}
      </div>

      {/* Param bars */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
        {PARAM_BARS.map(({ key, label, min, max, unit }) => (
          <ParamBar key={key} label={label} value={result.params[key] as number} min={min} max={max} unit={unit} />
        ))}
      </div>

      {/* Matched tags */}
      {result.matchedTags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 12 }}>
          {result.matchedTags.map((tag) => (
            <span key={tag} style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "rgba(124,58,237,0.15)", color: "var(--accent2)", border: "1px solid rgba(124,58,237,0.3)" }}>{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
}

const SUGGESTIONS = [
  { prompt: "dark ambient pad",       artist: "Travis Scott" },
  { prompt: "808 sub bass heavy",     artist: "Metro Boomin" },
  { prompt: "ethereal choir shimmer", artist: "Frank Ocean" },
  { prompt: "acid pluck electronic",  artist: "Aphex Twin" },
  { prompt: "warm lofi chill",        artist: "J Dilla" },
];

export default function Home() {
  const [prompt,    setPrompt]    = useState("");
  const [artist,    setArtist]    = useState("");
  const [results,   setResults]   = useState<PresetResult[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);

  const audioCtxRef  = useRef<AudioContext | null>(null);
  const stopRef      = useRef<(() => void) | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopCurrent = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    setPlayingId(null);
  }, []);

  const handlePlay = useCallback((result: PresetResult) => {
    stopCurrent();

    // Lazy-create AudioContext (must be after a user gesture)
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") ctx.resume();

    const p        = result.params;
    const stopFn   = playSound(ctx, p);
    stopRef.current = stopFn;
    setPlayingId(result.name);

    // Auto-stop when envelope finishes
    const duration = p.attack + p.decay + Math.min(p.sustain * 3 + 0.5, 3) + Math.min(p.release, 3) + 0.2;
    stopTimerRef.current = setTimeout(() => {
      stopRef.current = null;
      setPlayingId(null);
    }, duration * 1000);
  }, [stopCurrent]);

  const search = async () => {
    if (!prompt.trim() && !artist.trim()) return;
    stopCurrent();
    setLoading(true);
    setError("");
    setResults([]);
    try {
      const res  = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: prompt.trim(), artist: artist.trim() }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong"); return; }
      setResults(data.results);
    } catch {
      setError("Failed to reach API");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse  { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
      `}</style>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px 60px" }}>
        <header style={{ padding: "40px 0 32px", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "4px 12px", marginBottom: 20, fontSize: 12, color: "var(--muted)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", display: "inline-block", boxShadow: "0 0 6px var(--green)" }} />
            AI SOUND FINDER
          </div>
          <h1 style={{ fontSize: "clamp(32px,6vw,56px)", fontWeight: 800, background: "linear-gradient(135deg,#fff 0%,var(--accent2) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-1px", marginBottom: 12, lineHeight: 1.1 }}>
            AUDIOPILOT
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 16, maxWidth: 480, margin: "0 auto" }}>
            Find synth sounds that match any artist&apos;s signature style — powered by AI.<br />
            Type a vibe, name an artist, preview and copy parameters.
          </p>
        </header>

        {/* Search */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, marginBottom: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            {[
              { id: "prompt", val: prompt, set: setPrompt, placeholder: "dark ambient pad, 808 bass, acid pluck...", label: "Sound / Vibe" },
              { id: "artist", val: artist, set: setArtist, placeholder: "Travis Scott, Burial, Aphex Twin...",        label: "Artist (optional)" },
            ].map(({ id, val, set, placeholder, label }) => (
              <div key={id}>
                <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</label>
                <input
                  type="text" value={val} placeholder={placeholder}
                  onChange={(e) => set(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && search()}
                  style={{ width: "100%", padding: "10px 14px", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 14, outline: "none", transition: "border-color 0.2s", fontFamily: "inherit" }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                  onBlur={(e)  => (e.target.style.borderColor = "var(--border)")}
                />
              </div>
            ))}
          </div>
          <button onClick={search} disabled={loading || (!prompt.trim() && !artist.trim())} style={{ width: "100%", padding: "12px", background: loading ? "var(--surface2)" : "linear-gradient(135deg,var(--accent),var(--accent2))", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", letterSpacing: "0.05em", opacity: (!prompt.trim() && !artist.trim()) ? 0.5 : 1, fontFamily: "inherit" }}>
            {loading ? <span style={{ animation: "pulse 1s infinite" }}>Finding sounds...</span> : "FIND SOUNDS"}
          </button>
          {error && <p style={{ marginTop: 10, fontSize: 13, color: "var(--red)", textAlign: "center" }}>{error}</p>}
        </div>

        {/* Suggestions */}
        {results.length === 0 && !loading && (
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Try these</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {SUGGESTIONS.map((s) => (
                <button key={s.prompt} onClick={() => { setPrompt(s.prompt); setArtist(s.artist); }}
                  style={{ padding: "6px 12px", borderRadius: 6, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                  {s.artist} — {s.prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div>
            <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.08em" }}>{results.length} sounds found</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(380px,1fr))", gap: 14 }}>
              {results.map((r, i) => (
                <PresetCard
                  key={r.name} result={r} index={i}
                  isPlaying={playingId === r.name}
                  onPlay={() => handlePlay(r)}
                  onStop={stopCurrent}
                />
              ))}
            </div>
          </div>
        )}

        <footer style={{ marginTop: 60, textAlign: "center", color: "var(--muted)", fontSize: 12 }}>
          Open-source · JUCE + sentence-transformers + Next.js ·{" "}
          <a href="https://github.com/RMamujee/serum-dupe" style={{ color: "var(--accent2)", textDecoration: "none" }}>GitHub</a>
        </footer>
      </div>
    </>
  );
}
