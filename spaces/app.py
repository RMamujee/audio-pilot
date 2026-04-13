"""
AudioPilot — AI Backend
Hosted on Hugging Face Spaces (Docker).
Exposes POST /generate and GET /health on port 7860.

sentence-transformers is pre-installed on HF Spaces GPU/CPU runtimes,
so cold starts are fast and the model is cached across restarts.
"""

from __future__ import annotations
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
import numpy as np
import uvicorn

app = FastAPI(title="AudioPilot AI", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Vercel frontend + VST plugin both need this
    allow_methods=["*"],
    allow_headers=["*"],
)

# all-MiniLM-L6-v2: 80MB, CPU-friendly, cached by HF automatically
MODEL_NAME = os.getenv("MODEL_NAME", "all-MiniLM-L6-v2")
model = SentenceTransformer(MODEL_NAME)

# ---------------------------------------------------------------------------
# Preset library — extend freely.
# Keys are natural-language descriptions used for semantic embedding search.
# ---------------------------------------------------------------------------
PRESETS: dict[str, dict] = {
    "travis scott dark atmospheric trap pad": {
        "cutoff": 1200, "resonance": 0.5,
        "attack": 0.8, "decay": 1.0, "sustain": 0.8, "release": 3.0,
        "reverb_size": 0.95, "reverb_wet": 0.65,
        "osc_type": "saw", "drive": 0.1, "chorus": 0.4, "delay_mix": 0.3,
        "display_name": "Travis Atmospheric Pad",
        "artists": ["travis scott", "don toliver", "nav"],
    },
    "dark ambient drone eerie slow evolving": {
        "cutoff": 600, "resonance": 0.4,
        "attack": 1.2, "decay": 0.8, "sustain": 0.9, "release": 2.5,
        "reverb_size": 0.9, "reverb_wet": 0.7,
        "osc_type": "sine", "drive": 0.0, "chorus": 0.1, "delay_mix": 0.2,
        "display_name": "Dark Ambient Drone",
        "artists": ["burial", "tim hecker", "william basinski"],
    },
    "808 sub bass trap hip-hop deep punchy": {
        "cutoff": 200, "resonance": 1.2,
        "attack": 0.001, "decay": 0.6, "sustain": 0.0, "release": 0.5,
        "reverb_size": 0.1, "reverb_wet": 0.05,
        "osc_type": "sine", "drive": 0.05, "chorus": 0.0, "delay_mix": 0.0,
        "display_name": "808 Sub Bass",
        "artists": ["metro boomin", "southside", "travis scott", "future"],
    },
    "acid pluck 303 techno rave resonant": {
        "cutoff": 2500, "resonance": 4.0,
        "attack": 0.002, "decay": 0.3, "sustain": 0.1, "release": 0.2,
        "reverb_size": 0.2, "reverb_wet": 0.1,
        "osc_type": "saw", "drive": 0.3, "chorus": 0.0, "delay_mix": 0.15,
        "display_name": "Acid Pluck",
        "artists": ["aphex twin", "squarepusher", "autechre"],
    },
    "glassy bell ethereal bright airy shimmer": {
        "cutoff": 4000, "resonance": 0.3,
        "attack": 0.5, "decay": 2.0, "sustain": 0.4, "release": 4.0,
        "reverb_size": 0.8, "reverb_wet": 0.5,
        "osc_type": "sine", "drive": 0.0, "chorus": 0.2, "delay_mix": 0.25,
        "display_name": "Glassy Bell Pad",
        "artists": ["brian eno", "max richter", "nils frahm"],
    },
    "aggressive distorted lead harsh industrial hard": {
        "cutoff": 8000, "resonance": 3.0,
        "attack": 0.002, "decay": 0.1, "sustain": 0.9, "release": 0.2,
        "reverb_size": 0.3, "reverb_wet": 0.15,
        "osc_type": "square", "drive": 0.8, "chorus": 0.1, "delay_mix": 0.1,
        "display_name": "Aggressive Distorted Lead",
        "artists": ["skrillex", "nine inch nails", "health"],
    },
    "lofi warm vintage chill pad mellow nostalgic": {
        "cutoff": 1800, "resonance": 0.35,
        "attack": 0.4, "decay": 1.2, "sustain": 0.7, "release": 2.0,
        "reverb_size": 0.6, "reverb_wet": 0.4,
        "osc_type": "saw", "drive": 0.15, "chorus": 0.6, "delay_mix": 0.2,
        "display_name": "Lo-Fi Warm Pad",
        "artists": ["j dilla", "knxwledge", "mndsgn"],
    },
    "choir shimmer angelic spiritual ethereal lush": {
        "cutoff": 3500, "resonance": 0.25,
        "attack": 2.0, "decay": 1.5, "sustain": 0.85, "release": 5.0,
        "reverb_size": 0.99, "reverb_wet": 0.8,
        "osc_type": "sine", "drive": 0.0, "chorus": 0.5, "delay_mix": 0.3,
        "display_name": "Choir Shimmer",
        "artists": ["kanye west", "frank ocean", "bon iver"],
    },
    "bright pluck lead funk clean punchy upbeat pop": {
        "cutoff": 6000, "resonance": 0.6,
        "attack": 0.005, "decay": 0.2, "sustain": 0.5, "release": 0.3,
        "reverb_size": 0.2, "reverb_wet": 0.1,
        "osc_type": "saw", "drive": 0.05, "chorus": 0.2, "delay_mix": 0.05,
        "display_name": "Bright Pluck Lead",
        "artists": ["daft punk", "justice", "chromeo"],
    },
    "deep techno bass underground minimal dark": {
        "cutoff": 300, "resonance": 0.9,
        "attack": 0.01, "decay": 0.3, "sustain": 0.6, "release": 0.4,
        "reverb_size": 0.15, "reverb_wet": 0.0,
        "osc_type": "square", "drive": 0.4, "chorus": 0.0, "delay_mix": 0.0,
        "display_name": "Deep Techno Bass",
        "artists": ["blawan", "surgeon", "objekt"],
    },
    "future bass supersaw euphoric festival edm wide": {
        "cutoff": 5000, "resonance": 0.7,
        "attack": 0.05, "decay": 0.5, "sustain": 0.8, "release": 1.5,
        "reverb_size": 0.5, "reverb_wet": 0.35,
        "osc_type": "saw", "drive": 0.1, "chorus": 0.9, "delay_mix": 0.2,
        "display_name": "Future Bass Supersaw",
        "artists": ["flume", "rustie", "cashmere cat"],
    },
    "dark trap ominous menacing minor moody drill": {
        "cutoff": 900, "resonance": 0.6,
        "attack": 0.3, "decay": 0.9, "sustain": 0.75, "release": 2.0,
        "reverb_size": 0.8, "reverb_wet": 0.55,
        "osc_type": "saw", "drive": 0.2, "chorus": 0.3, "delay_mix": 0.25,
        "display_name": "Dark Trap Pad",
        "artists": ["drake", "21 savage", "rod wave"],
    },
}

# Pre-compute embeddings once at startup
print(f"Loading model: {MODEL_NAME}")
preset_keys       = list(PRESETS.keys())
preset_embeddings = model.encode(preset_keys, normalize_embeddings=True)
print(f"Indexed {len(PRESETS)} presets. Ready.")


class PromptRequest(BaseModel):
    prompt: str
    artist: str = ""
    top_k: int = 4


@app.post("/generate")
def generate(req: PromptRequest) -> dict:
    # Build combined query: vibe + artist name together
    query = req.prompt.strip()
    if req.artist.strip():
        query = f"{query} {req.artist.strip()}"

    query_emb = model.encode([query], normalize_embeddings=True)[0]
    scores    = preset_embeddings @ query_emb  # cosine sim (normalized)

    top_indices = np.argsort(scores)[::-1][: req.top_k]

    results = []
    for idx in top_indices:
        key    = preset_keys[idx]
        preset = PRESETS[key].copy()
        results.append({
            "name":          preset.pop("display_name"),
            "artists":       preset.pop("artists"),
            "confidence":    float(scores[idx]),
            "params":        {k: v for k, v in preset.items()},
            "matched_query": key,
        })

    return {"results": results}


@app.get("/")
def root() -> FileResponse:
    return FileResponse("static/index.html")


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "model": MODEL_NAME, "presets": len(PRESETS)}


@app.get("/presets")
def list_presets() -> list[str]:
    return [v["display_name"] for v in PRESETS.values()]


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=7860)
