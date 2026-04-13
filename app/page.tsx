"use client";

import { useState } from "react";

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
  { key: "cutoff",     label: "Cutoff",    min: 20,   max: 20000, unit: "Hz" },
  { key: "resonance",  label: "Resonance", min: 0.1,  max: 10 },
  { key: "attack",     label: "Attack",    min: 0,    max: 5,     unit: "s" },
  { key: "decay",      label: "Decay",     min: 0,    max: 5,     unit: "s" },
  { key: "sustain",    label: "Sustain",   min: 0,    max: 1 },
  { key: "release",    label: "Release",   min: 0,    max: 8,     unit: "s" },
  { key: "reverbWet",  label: "Reverb",    min: 0,    max: 1 },
  { key: "drive",      label: "Drive",     min: 0,    max: 1 },
  { key: "chorus",     label: "Chorus",    min: 0,    max: 1 },
  { key: "delayMix",   label: "Delay",     min: 0,    max: 1 },
];

function ParamBar({ label, value, min, max, unit }: { label: string; value: number; min: number; max: number; unit?: string }) {
  const pct = Math.min(((value - min) / (max - min)) * 100, 100);
  const display = unit === "Hz"
    ? value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toFixed(0)
    : unit === "s"
    ? `${value.toFixed(2)}s`
    : value.toFixed(2);

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 11, color: "var(--muted)" }}>
        <span>{label}</span>
        <span style={{ color: "var(--text)" }}>{display}{unit === "Hz" ? "Hz" : ""}</span>
      </div>
      <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{
          width: `${pct}%`,
          height: "100%",
          background: `linear-gradient(90deg, var(--accent), var(--accent2))`,
          borderRadius: 2,
          transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        }} />
      </div>
    </div>
  );
}

function ConfidenceBadge({ score, artistMatch }: { score: number; artistMatch: boolean }) {
  const pct = Math.round(score * 100);
  const color = pct > 70 ? "var(--green)" : pct > 40 ? "var(--accent2)" : "var(--muted)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 12, color, fontWeight: 600 }}>{pct}% match</span>
      {artistMatch && (
        <span style={{
          fontSize: 10, padding: "2px 6px", borderRadius: 4,
          background: "rgba(124,58,237,0.2)", color: "var(--accent2)", fontWeight: 600,
        }}>
          ARTIST
        </span>
      )}
    </div>
  );
}

function PresetCard({ result, index }: { result: PresetResult; index: number }) {
  const [copied, setCopied] = useState(false);

  const copyParams = () => {
    navigator.clipboard.writeText(JSON.stringify(result.params, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const oscColors: Record<string, string> = {
    sine: "#22c55e", saw: "#a855f7", square: "#f59e0b",
  };

  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: 20,
      position: "relative",
      overflow: "hidden",
      animation: `fadeUp 0.35s ease ${index * 0.07}s both`,
    }}>
      {/* Glow accent on top */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: "linear-gradient(90deg, var(--accent), var(--accent2), transparent)",
      }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{
              width: 8, height: 8, borderRadius: "50%",
              background: oscColors[result.params.oscType] ?? "#888",
              display: "inline-block",
              boxShadow: `0 0 6px ${oscColors[result.params.oscType] ?? "#888"}`,
            }} />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{result.name}</h3>
          </div>
          <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>{result.description}</p>
          <ConfidenceBadge score={result.confidence} artistMatch={result.matchedArtist} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <span style={{
            fontSize: 11, padding: "3px 8px", borderRadius: 6,
            background: "var(--surface2)", border: "1px solid var(--border)",
            color: oscColors[result.params.oscType] ?? "var(--muted)",
            fontFamily: "monospace", fontWeight: 700,
            textTransform: "uppercase",
          }}>
            {result.params.oscType}
          </span>
          <button
            onClick={copyParams}
            style={{
              fontSize: 11, padding: "3px 8px", borderRadius: 6,
              background: copied ? "rgba(34,197,94,0.15)" : "var(--surface2)",
              border: `1px solid ${copied ? "var(--green)" : "var(--border)"}`,
              color: copied ? "var(--green)" : "var(--muted)",
              cursor: "pointer", transition: "all 0.2s",
            }}
          >
            {copied ? "✓ Copied" : "Copy params"}
          </button>
        </div>
      </div>

      {/* Artists */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 14 }}>
        {result.artists.slice(0, 4).map((a) => (
          <span key={a} style={{
            fontSize: 10, padding: "2px 7px", borderRadius: 10,
            background: "var(--surface2)", color: "var(--muted)",
            border: "1px solid var(--border)",
          }}>
            {a}
          </span>
        ))}
      </div>

      {/* Parameter bars */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: "0 20px",
      }}>
        {PARAM_BARS.map(({ key, label, min, max, unit }) => (
          <ParamBar
            key={key}
            label={label}
            value={result.params[key] as number}
            min={min}
            max={max}
            unit={unit}
          />
        ))}
      </div>

      {/* Matched tags */}
      {result.matchedTags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 12 }}>
          {result.matchedTags.map((tag) => (
            <span key={tag} style={{
              fontSize: 10, padding: "1px 6px", borderRadius: 4,
              background: "rgba(124,58,237,0.15)", color: "var(--accent2)",
              border: "1px solid rgba(124,58,237,0.3)",
            }}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const SUGGESTIONS = [
  { prompt: "dark ambient pad", artist: "Travis Scott" },
  { prompt: "808 sub bass heavy", artist: "Metro Boomin" },
  { prompt: "ethereal choir shimmer", artist: "Frank Ocean" },
  { prompt: "acid pluck electronic", artist: "Aphex Twin" },
  { prompt: "warm lofi chill", artist: "J Dilla" },
];

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [artist, setArtist] = useState("");
  const [results, setResults] = useState<PresetResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const search = async () => {
    if (!prompt.trim() && !artist.trim()) return;
    setLoading(true);
    setError("");
    setResults([]);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), artist: artist.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong"); return; }
      setResults(data.results);
    } catch {
      setError("Failed to reach API");
    } finally {
      setLoading(false);
    }
  };

  const loadSuggestion = (s: typeof SUGGESTIONS[0]) => {
    setPrompt(s.prompt);
    setArtist(s.artist);
  };

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px 60px" }}>

        {/* Header */}
        <header style={{ padding: "40px 0 32px", textAlign: "center" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 8, padding: "4px 12px", marginBottom: 20,
            fontSize: 12, color: "var(--muted)",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", display: "inline-block", boxShadow: "0 0 6px var(--green)" }} />
            AI SOUND FINDER
          </div>
          <h1 style={{
            fontSize: "clamp(32px, 6vw, 56px)", fontWeight: 800,
            background: "linear-gradient(135deg, #fff 0%, var(--accent2) 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            letterSpacing: "-1px", marginBottom: 12, lineHeight: 1.1,
          }}>
            SERUM DUPE
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 16, maxWidth: 480, margin: "0 auto" }}>
            Find synth sounds that match any artist's signature style.<br />
            Type a vibe, name an artist, get parameters.
          </p>
        </header>

        {/* Search panel */}
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: 24,
          marginBottom: 24,
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Sound / Vibe
              </label>
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search()}
                placeholder="dark ambient pad, 808 bass, acid pluck..."
                style={{
                  width: "100%", padding: "10px 14px",
                  background: "var(--surface2)", border: "1px solid var(--border)",
                  borderRadius: 8, color: "var(--text)", fontSize: 14,
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => e.target.style.borderColor = "var(--accent)"}
                onBlur={(e) => e.target.style.borderColor = "var(--border)"}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Artist (optional)
              </label>
              <input
                type="text"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search()}
                placeholder="Travis Scott, Burial, Aphex Twin..."
                style={{
                  width: "100%", padding: "10px 14px",
                  background: "var(--surface2)", border: "1px solid var(--border)",
                  borderRadius: 8, color: "var(--text)", fontSize: 14,
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => e.target.style.borderColor = "var(--accent)"}
                onBlur={(e) => e.target.style.borderColor = "var(--border)"}
              />
            </div>
          </div>

          <button
            onClick={search}
            disabled={loading || (!prompt.trim() && !artist.trim())}
            style={{
              width: "100%", padding: "12px",
              background: loading ? "var(--surface2)" : "linear-gradient(135deg, var(--accent), var(--accent2))",
              border: "none", borderRadius: 8, color: "#fff",
              fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
              letterSpacing: "0.05em", transition: "opacity 0.2s",
              opacity: (!prompt.trim() && !artist.trim()) ? 0.5 : 1,
            }}
          >
            {loading
              ? <span style={{ animation: "pulse 1s infinite" }}>Finding sounds...</span>
              : "FIND SOUNDS"}
          </button>

          {error && (
            <p style={{ marginTop: 10, fontSize: 13, color: "var(--red)", textAlign: "center" }}>{error}</p>
          )}
        </div>

        {/* Suggestions */}
        {results.length === 0 && !loading && (
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Try these
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.prompt}
                  onClick={() => loadSuggestion(s)}
                  style={{
                    padding: "6px 12px", borderRadius: 6,
                    background: "var(--surface)", border: "1px solid var(--border)",
                    color: "var(--muted)", fontSize: 12, cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLElement).style.borderColor = "var(--accent)";
                    (e.target as HTMLElement).style.color = "var(--text)";
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.borderColor = "var(--border)";
                    (e.target as HTMLElement).style.color = "var(--muted)";
                  }}
                >
                  {s.artist} — {s.prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div>
            <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {results.length} sounds found
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 14 }}>
              {results.map((r, i) => (
                <PresetCard key={r.name} result={r} index={i} />
              ))}
            </div>
          </div>
        )}

        <footer style={{ marginTop: 60, textAlign: "center", color: "var(--muted)", fontSize: 12 }}>
          Open-source · JUCE + sentence-transformers + Next.js ·{" "}
          <a href="https://github.com/RMamujee/serum-dupe" style={{ color: "var(--accent2)", textDecoration: "none" }}>
            GitHub
          </a>
        </footer>
      </div>
    </>
  );
}
