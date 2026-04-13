"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Params {
  oscType:    "sine" | "sawtooth" | "square";
  cutoff:     number;  // 20–20000 Hz
  resonance:  number;  // 0.1–10
  attack:     number;  // 0–5 s
  decay:      number;  // 0–5 s
  sustain:    number;  // 0–1
  release:    number;  // 0–8 s
  reverbSize: number;  // 0–1
  reverbWet:  number;  // 0–1
  drive:      number;  // 0–1
  chorus:     number;  // 0–1
  delayMix:   number;  // 0–1
  masterVol:  number;  // 0–1
}

interface Voice {
  oscs:    OscillatorNode[];
  filter:  BiquadFilterNode;
  env:     GainNode;
  release: number;
}

// ─── Default params ───────────────────────────────────────────────────────────

const DEFAULT: Params = {
  oscType: "sawtooth", cutoff: 4000, resonance: 0.7,
  attack: 0.02, decay: 0.3, sustain: 0.7, release: 0.8,
  reverbSize: 0.4, reverbWet: 0.2, drive: 0.1, chorus: 0.2,
  delayMix: 0.0, masterVol: 0.7,
};

// ─── Note helpers ─────────────────────────────────────────────────────────────

function midiToFreq(note: number) { return 440 * Math.pow(2, (note - 69) / 12); }

// Piano layout: 2 octaves C3–B4 + C5
const START_NOTE = 48; // C3
const WHITE_NOTES = [0,2,4,5,7,9,11]; // semitone offsets for white keys
const BLACK_NOTES: Record<number, number> = { 1:0, 3:1, 6:3, 8:4, 10:5 }; // semitone -> white key index

// Build key list for 2 octaves + C5
const PIANO_KEYS: { note: number; isBlack: boolean; whiteIdx: number }[] = [];
let whiteCount = 0;
for (let oct = 0; oct < 2; oct++) {
  for (let s = 0; s < 12; s++) {
    const note = START_NOTE + oct * 12 + s;
    if (WHITE_NOTES.includes(s)) {
      PIANO_KEYS.push({ note, isBlack: false, whiteIdx: whiteCount++ });
    } else {
      const wi = BLACK_NOTES[s];
      if (wi !== undefined) {
        PIANO_KEYS.push({ note, isBlack: true, whiteIdx: oct * 7 + wi });
      }
    }
  }
}
PIANO_KEYS.push({ note: START_NOTE + 24, isBlack: false, whiteIdx: whiteCount });
const WHITE_KEY_COUNT = whiteCount + 1;

// Computer keyboard → MIDI note
const KB_MAP: Record<string, number> = {
  a:48,w:49,s:50,e:51,d:52,f:53,t:54,g:55,y:56,h:57,u:58,j:59,
  k:60,o:61,l:62,p:63,";":64,
};

// ─── Audio helpers ────────────────────────────────────────────────────────────

function buildReverb(ctx: AudioContext, size: number): ConvolverNode {
  const cv  = ctx.createConvolver();
  const len = Math.max(512, Math.floor(ctx.sampleRate * size * 3));
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const ch = buf.getChannelData(c);
    for (let i = 0; i < len; i++) ch[i] = (Math.random()*2-1) * Math.pow(1 - i/len, 2);
  }
  cv.buffer = buf;
  return cv;
}

function buildDriveCurve(amount: number): Float32Array<ArrayBuffer> {
  const n = 256;
  const curve = new Float32Array(new ArrayBuffer(n * 4));
  const k = amount * 80;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = k > 0 ? ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x)) : x;
  }
  return curve;
}

// ─── Synth engine (held in a ref, never re-created) ──────────────────────────

class SynthEngine {
  ctx:       AudioContext;
  master:    GainNode;
  shaper:    WaveShaperNode;
  reverbNode: ConvolverNode;
  reverbGain: GainNode;
  dryGain:   GainNode;
  delay:     DelayNode;
  delayFb:   GainNode;
  delayGain: GainNode;
  voices:    Map<number, Voice> = new Map();
  params:    Params;

  constructor(params: Params) {
    this.ctx    = new AudioContext();
    this.params = { ...params };

    this.master    = this.ctx.createGain();
    this.master.gain.value = params.masterVol;

    this.shaper    = this.ctx.createWaveShaper();
    this.shaper.curve      = buildDriveCurve(params.drive);
    this.shaper.oversample = "2x";

    this.reverbNode = buildReverb(this.ctx, params.reverbSize);
    this.reverbGain = this.ctx.createGain();
    this.reverbGain.gain.value = params.reverbWet;
    this.dryGain    = this.ctx.createGain();
    this.dryGain.gain.value   = 1 - params.reverbWet * 0.5;

    this.delay      = this.ctx.createDelay(1.0);
    this.delay.delayTime.value = 0.375;
    this.delayFb    = this.ctx.createGain();
    this.delayFb.gain.value   = 0.4;
    this.delayGain  = this.ctx.createGain();
    this.delayGain.gain.value = params.delayMix;

    // delay feedback loop
    this.delay.connect(this.delayFb);
    this.delayFb.connect(this.delay);

    // master chain: shaper -> dry/reverb/delay -> master -> output
    this.shaper.connect(this.dryGain);
    this.shaper.connect(this.reverbGain);
    this.shaper.connect(this.delayGain);
    this.dryGain.connect(this.master);
    this.reverbGain.connect(this.reverbNode);
    this.reverbNode.connect(this.master);
    this.delayGain.connect(this.delay);
    this.delay.connect(this.master);
    this.master.connect(this.ctx.destination);
  }

  noteOn(note: number) {
    if (this.voices.has(note)) this.noteOff(note);
    if (this.ctx.state === "suspended") this.ctx.resume();

    const ctx = this.ctx;
    const p   = this.params;
    const now = ctx.currentTime;
    const freq = midiToFreq(note);

    const filter = ctx.createBiquadFilter();
    filter.type             = "lowpass";
    filter.frequency.value  = Math.min(p.cutoff, ctx.sampleRate / 2 - 1);
    filter.Q.value          = p.resonance;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.6, now + Math.max(0.001, p.attack));
    env.gain.linearRampToValueAtTime(0.6 * p.sustain, now + p.attack + Math.max(0.001, p.decay));

    filter.connect(env);
    env.connect(this.shaper);

    const oscs: OscillatorNode[] = [];
    const oscType = p.oscType;

    const addOsc = (detune = 0, gain = 1.0) => {
      const osc = ctx.createOscillator();
      osc.type            = oscType;
      osc.frequency.value = freq;
      osc.detune.value    = detune;
      const g = ctx.createGain();
      g.gain.value = gain;
      osc.connect(g);
      g.connect(filter);
      osc.start(now);
      oscs.push(osc);
    };

    addOsc(0, 1.0);
    if (p.chorus > 0.05 && oscType === "sawtooth") {
      const spread = p.chorus * 14;
      addOsc(-spread, p.chorus * 0.55);
      addOsc( spread, p.chorus * 0.55);
      addOsc(-spread * 0.5, p.chorus * 0.25);
    }

    this.voices.set(note, { oscs, filter, env, release: p.release });
  }

  noteOff(note: number) {
    const voice = this.voices.get(note);
    if (!voice) return;
    this.voices.delete(note);

    const now = this.ctx.currentTime;
    const rel = Math.max(0.01, voice.release);
    voice.env.gain.cancelScheduledValues(now);
    voice.env.gain.setValueAtTime(voice.env.gain.value, now);
    voice.env.gain.linearRampToValueAtTime(0, now + rel);
    voice.oscs.forEach(o => { try { o.stop(now + rel + 0.05); } catch { /* ok */ } });
  }

  allNotesOff() {
    for (const note of this.voices.keys()) this.noteOff(note);
  }

  updateParam<K extends keyof Params>(key: K, val: Params[K]) {
    this.params[key] = val;
    const now = this.ctx.currentTime;

    if (key === "cutoff" || key === "resonance") {
      this.voices.forEach(v => {
        if (key === "cutoff")    v.filter.frequency.setTargetAtTime(val as number, now, 0.02);
        if (key === "resonance") v.filter.Q.setTargetAtTime(val as number, now, 0.02);
      });
    }
    if (key === "drive") {
      this.shaper.curve = buildDriveCurve(val as number);
    }
    if (key === "reverbWet") {
      this.reverbGain.gain.setTargetAtTime(val as number, now, 0.05);
      this.dryGain.gain.setTargetAtTime(1 - (val as number) * 0.5, now, 0.05);
    }
    if (key === "delayMix") {
      this.delayGain.gain.setTargetAtTime(val as number, now, 0.05);
    }
    if (key === "masterVol") {
      this.master.gain.setTargetAtTime(val as number, now, 0.02);
    }
  }
}

// ─── UI components ────────────────────────────────────────────────────────────

function Knob({ label, value, min, max, step = 0.01, unit = "", onChange }: {
  label: string; value: number; min: number; max: number;
  step?: number; unit?: string; onChange: (v: number) => void;
}) {
  const display = unit === "Hz"
    ? value >= 1000 ? `${(value/1000).toFixed(1)}k` : `${Math.round(value)}`
    : unit === "s" ? value.toFixed(2) : value.toFixed(2);

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, minWidth:60 }}>
      <label style={{ fontSize:10, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.07em", textAlign:"center" }}>{label}</label>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width:56, accentColor:"var(--accent)", cursor:"pointer" }}
      />
      <span style={{ fontSize:10, color:"var(--text)", fontFamily:"monospace" }}>
        {display}{unit === "Hz" ? "Hz" : unit === "s" ? "s" : ""}
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:"12px 16px" }}>
      <div style={{ fontSize:10, color:"var(--accent2)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:12, fontWeight:700 }}>{title}</div>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center" }}>{children}</div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SynthPage() {
  const [params,   setParams]   = useState<Params>(DEFAULT);
  const [held,     setHeld]     = useState<Set<number>>(new Set());
  const [prompt,   setPrompt]   = useState("");
  const [artist,   setArtist]   = useState("");
  const [aiStatus, setAiStatus] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [midiOk,   setMidiOk]   = useState<boolean | null>(null);

  const engineRef = useRef<SynthEngine | null>(null);
  const kbHeld    = useRef<Set<string>>(new Set());

  // Lazy-init engine on first interaction
  const getEngine = useCallback(() => {
    if (!engineRef.current) engineRef.current = new SynthEngine(params);
    return engineRef.current;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const noteOn = useCallback((note: number) => {
    getEngine().noteOn(note);
    setHeld(prev => new Set([...prev, note]));
  }, [getEngine]);

  const noteOff = useCallback((note: number) => {
    engineRef.current?.noteOff(note);
    setHeld(prev => { const n = new Set(prev); n.delete(note); return n; });
  }, []);

  const updateParam = useCallback(<K extends keyof Params>(key: K, val: Params[K]) => {
    setParams(prev => ({ ...prev, [key]: val }));
    engineRef.current?.updateParam(key, val);
  }, []);

  // Keyboard events
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.repeat || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const note = KB_MAP[e.key.toLowerCase()];
      if (note !== undefined && !kbHeld.current.has(e.key)) {
        kbHeld.current.add(e.key);
        noteOn(note);
      }
    };
    const onUp = (e: KeyboardEvent) => {
      const note = KB_MAP[e.key.toLowerCase()];
      if (note !== undefined) { kbHeld.current.delete(e.key); noteOff(note); }
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup",   onUp);
    return () => { window.removeEventListener("keydown", onDown); window.removeEventListener("keyup", onUp); };
  }, [noteOn, noteOff]);

  // Web MIDI
  useEffect(() => {
    if (!navigator.requestMIDIAccess) { setMidiOk(false); return; }
    navigator.requestMIDIAccess().then(midi => {
      setMidiOk(true);
      const onMsg = (e: MIDIMessageEvent) => {
        if (!e.data) return;
        const data   = Array.from(e.data as Uint8Array);
        const status = data[0], note = data[1], vel = data[2];
        if (status === 144 && vel > 0) noteOn(note);
        else if (status === 128 || (status === 144 && vel === 0)) noteOff(note);
        else if (status === 176 && note === 123) engineRef.current?.allNotesOff();
      };
      for (const input of midi.inputs.values()) input.onmidimessage = onMsg;
    }).catch(() => setMidiOk(false));
  }, [noteOn, noteOff]);

  // AI generate
  const generate = async () => {
    if (!prompt.trim() && !artist.trim()) return;
    setLoading(true);
    setAiStatus("Finding sound...");
    try {
      const res  = await fetch("/api/generate", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ prompt, artist, top_k:1 }) });
      const data = await res.json();
      if (!res.ok || !data.results?.length) { setAiStatus("No match found."); return; }
      const r = data.results[0];
      const p = r.params;
      const oscMap: Record<string,Params["oscType"]> = { sine:"sine", saw:"sawtooth", sawtooth:"sawtooth", square:"square" };

      const next: Params = {
        oscType:    oscMap[p.oscType ?? p.osc_type] ?? "sawtooth",
        cutoff:     p.cutoff     ?? 4000,
        resonance:  p.resonance  ?? 0.7,
        attack:     p.attack     ?? 0.02,
        decay:      p.decay      ?? 0.3,
        sustain:    p.sustain    ?? 0.7,
        release:    p.release    ?? 0.8,
        reverbSize: p.reverbSize ?? p.reverb_size ?? 0.4,
        reverbWet:  p.reverbWet  ?? p.reverb_wet  ?? 0.2,
        drive:      p.drive      ?? 0.1,
        chorus:     p.chorus     ?? 0.2,
        delayMix:   p.delayMix   ?? p.delay_mix   ?? 0,
        masterVol:  params.masterVol,
      };

      setParams(next);
      if (engineRef.current) {
        (Object.keys(next) as (keyof Params)[]).forEach(k => engineRef.current!.updateParam(k, next[k]));
        // rebuild reverb for new size
        const eng = engineRef.current;
        eng.reverbNode.disconnect();
        eng.reverbNode = buildReverb(eng.ctx, next.reverbSize);
        eng.reverbGain.connect(eng.reverbNode);
        eng.reverbNode.connect(eng.master);
      }
      setAiStatus(`Loaded: "${r.name}" (${Math.round(r.confidence*100)}% match)`);
    } catch { setAiStatus("Error reaching API."); }
    finally  { setLoading(false); }
  };

  // Piano key width
  const WW = 36; // white key width px
  const BW = 22; // black key width px

  const OSC_OPTIONS: { val: Params["oscType"]; label: string; color: string }[] = [
    { val:"sine",     label:"SINE",   color:"#22c55e" },
    { val:"sawtooth", label:"SAW",    color:"#a855f7" },
    { val:"square",   label:"SQUARE", color:"#f59e0b" },
  ];

  return (
    <>
      <style>{`
        * { box-sizing:border-box; margin:0; padding:0; }
        :root { --bg:#0d0d14; --surface:#13131f; --surface2:#1a1a2e; --border:#2a2a45; --accent:#7c3aed; --accent2:#a855f7; --text:#e8e8f0; --muted:#6b6b8a; --green:#22c55e; }
        body  { background:var(--bg); color:var(--text); font-family:'Inter','Segoe UI',system-ui,sans-serif; min-height:100vh; }
        input[type=range] { -webkit-appearance:none; height:4px; border-radius:2px; background:var(--border); outline:none; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:14px; height:14px; border-radius:50%; background:var(--accent2); cursor:pointer; }
        .piano-key-white { position:absolute; background:#e8e8f0; border:1px solid #555; border-radius:0 0 4px 4px; cursor:pointer; transition:background .05s; }
        .piano-key-white:hover, .piano-key-white.active { background:#c4a8f5; }
        .piano-key-black { position:absolute; background:#1a1a1a; border:1px solid #000; border-radius:0 0 3px 3px; cursor:pointer; z-index:2; transition:background .05s; }
        .piano-key-black:hover, .piano-key-black.active { background:#7c3aed; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        a { color:var(--accent2); text-decoration:none; }
        a:hover { text-decoration:underline; }
      `}</style>

      <div style={{ maxWidth:1000, margin:"0 auto", padding:"20px 16px 60px" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
          <div>
            <h1 style={{ fontSize:24, fontWeight:900, background:"linear-gradient(135deg,#fff,var(--accent2))", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", letterSpacing:"-1px" }}>AUDIOPILOT</h1>
            <span style={{ fontSize:11, color:"var(--muted)", letterSpacing:"0.1em" }}>STANDALONE SYNTH</span>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <span style={{ fontSize:11, padding:"3px 8px", borderRadius:6, background:"var(--surface)", border:"1px solid var(--border)", color: midiOk ? "var(--green)" : "var(--muted)" }}>
              {midiOk === null ? "MIDI: checking..." : midiOk ? "MIDI: connected" : "MIDI: not found"}
            </span>
            <a href="/" style={{ fontSize:11, padding:"3px 8px", borderRadius:6, background:"var(--surface)", border:"1px solid var(--border)", color:"var(--muted)" }}>← Sound Finder</a>
          </div>
        </div>

        {/* AI Prompt */}
        <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:"14px 16px", marginBottom:16, display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
          <input value={prompt} onChange={e=>setPrompt(e.target.value)} onKeyDown={e=>e.key==="Enter"&&generate()} placeholder="dark ambient pad, 808 bass..." style={{ flex:1, minWidth:140, padding:"8px 12px", background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:7, color:"var(--text)", fontSize:13, outline:"none", fontFamily:"inherit" }} />
          <input value={artist} onChange={e=>setArtist(e.target.value)} onKeyDown={e=>e.key==="Enter"&&generate()} placeholder="Artist (optional)" style={{ flex:"0 0 160px", padding:"8px 12px", background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:7, color:"var(--text)", fontSize:13, outline:"none", fontFamily:"inherit" }} />
          <button onClick={generate} disabled={loading} style={{ padding:"8px 20px", background:"linear-gradient(135deg,var(--accent),var(--accent2))", border:"none", borderRadius:7, color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}>
            {loading ? <span style={{animation:"pulse 1s infinite"}}>...</span> : "AI SET"}
          </button>
          {aiStatus && <span style={{ fontSize:12, color:"var(--green)", width:"100%" }}>{aiStatus}</span>}
        </div>

        {/* Controls */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:10, marginBottom:16 }}>

          {/* Oscillator */}
          <Section title="Oscillator">
            <div style={{ display:"flex", flexDirection:"column", gap:6, width:"100%" }}>
              {OSC_OPTIONS.map(o => (
                <button key={o.val} onClick={() => updateParam("oscType", o.val)}
                  style={{ padding:"6px 10px", borderRadius:6, border:`1px solid ${params.oscType===o.val ? o.color : "var(--border)"}`, background: params.oscType===o.val ? `${o.color}22` : "var(--surface2)", color: params.oscType===o.val ? o.color : "var(--muted)", fontFamily:"monospace", fontWeight:700, fontSize:12, cursor:"pointer", transition:"all .15s" }}>
                  {o.label}
                </button>
              ))}
            </div>
          </Section>

          {/* Filter */}
          <Section title="Filter">
            <Knob label="Cutoff"    value={params.cutoff}    min={20}   max={20000} step={1}    unit="Hz" onChange={v=>updateParam("cutoff",v)} />
            <Knob label="Resonance" value={params.resonance} min={0.1}  max={10}    step={0.05}       onChange={v=>updateParam("resonance",v)} />
          </Section>

          {/* Envelope */}
          <Section title="Envelope">
            <Knob label="Attack"  value={params.attack}  min={0.001} max={5} step={0.001} unit="s" onChange={v=>updateParam("attack",v)} />
            <Knob label="Decay"   value={params.decay}   min={0.001} max={5} step={0.001} unit="s" onChange={v=>updateParam("decay",v)} />
            <Knob label="Sustain" value={params.sustain}  min={0}     max={1} step={0.01}           onChange={v=>updateParam("sustain",v)} />
            <Knob label="Release" value={params.release}  min={0.001} max={8} step={0.01}  unit="s" onChange={v=>updateParam("release",v)} />
          </Section>

          {/* Effects */}
          <Section title="Effects">
            <Knob label="Reverb"  value={params.reverbWet}  min={0} max={1} step={0.01} onChange={v=>updateParam("reverbWet",v)} />
            <Knob label="Drive"   value={params.drive}      min={0} max={1} step={0.01} onChange={v=>updateParam("drive",v)} />
            <Knob label="Chorus"  value={params.chorus}     min={0} max={1} step={0.01} onChange={v=>updateParam("chorus",v)} />
            <Knob label="Delay"   value={params.delayMix}   min={0} max={1} step={0.01} onChange={v=>updateParam("delayMix",v)} />
          </Section>

          {/* Master */}
          <Section title="Master">
            <Knob label="Volume" value={params.masterVol} min={0} max={1} step={0.01} onChange={v=>updateParam("masterVol",v)} />
          </Section>
        </div>

        {/* Piano keyboard */}
        <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:"16px 16px 20px" }}>
          <div style={{ fontSize:10, color:"var(--accent2)", textTransform:"uppercase", letterSpacing:"0.1em", fontWeight:700, marginBottom:14 }}>
            KEYBOARD &nbsp;·&nbsp; <span style={{color:"var(--muted)",fontWeight:400}}>Click keys or use computer keyboard (A S D F G H J K / W E T Y U)</span>
          </div>
          <div style={{ position:"relative", height:120, width: WHITE_KEY_COUNT * WW }}>
            {PIANO_KEYS.map(k => {
              const isActive = held.has(k.note);
              if (!k.isBlack) {
                return (
                  <div key={k.note}
                    className={`piano-key-white${isActive?" active":""}`}
                    onMouseDown={() => noteOn(k.note)}
                    onMouseUp={() => noteOff(k.note)}
                    onMouseLeave={() => { if(held.has(k.note)) noteOff(k.note); }}
                    onTouchStart={e => { e.preventDefault(); noteOn(k.note); }}
                    onTouchEnd={() => noteOff(k.note)}
                    style={{ left: k.whiteIdx * WW, top:0, width: WW - 1, height:120 }}
                  />
                );
              } else {
                return (
                  <div key={k.note}
                    className={`piano-key-black${isActive?" active":""}`}
                    onMouseDown={e => { e.stopPropagation(); noteOn(k.note); }}
                    onMouseUp={e => { e.stopPropagation(); noteOff(k.note); }}
                    onMouseLeave={() => { if(held.has(k.note)) noteOff(k.note); }}
                    onTouchStart={e => { e.preventDefault(); noteOn(k.note); }}
                    onTouchEnd={() => noteOff(k.note)}
                    style={{ left: k.whiteIdx * WW + WW - BW/2, top:0, width: BW, height:72 }}
                  />
                );
              }
            })}
          </div>
        </div>

        {/* KB legend */}
        <div style={{ marginTop:12, display:"flex", flexWrap:"wrap", gap:6 }}>
          {Object.entries(KB_MAP).slice(0,14).map(([key, note]) => (
            <span key={key} style={{ fontSize:10, padding:"2px 7px", borderRadius:4, background:"var(--surface)", border:"1px solid var(--border)", color: held.has(note) ? "var(--accent2)" : "var(--muted)", fontFamily:"monospace" }}>
              {key.toUpperCase()}
            </span>
          ))}
        </div>

      </div>
    </>
  );
}
