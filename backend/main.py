"""
AI backend for Serum Dupe VST3 plugin.
Maps text prompts -> synth parameters using sentence-transformers + cosine similarity.

Usage:
    pip install fastapi uvicorn sentence-transformers numpy
    uvicorn main:app --port 8765 --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
import numpy as np

app = FastAPI(title="Serum Dupe AI Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Lightweight model (~80MB), runs CPU-only, no GPU needed
model = SentenceTransformer("all-MiniLM-L6-v2")

# ---------------------------------------------------------------------------
# Preset library — extend this freely.
# Each key is a natural-language description used for semantic matching.
# ---------------------------------------------------------------------------
PRESETS: dict[str, dict] = {
    "dark ambient pad": {
        "cutoff": 600, "resonance": 0.4,
        "attack": 1.2, "decay": 0.8, "sustain": 0.9, "release": 2.5,
        "reverb_size": 0.9, "reverb_wet": 0.7, "osc_type": "sine",
    },
    "bright pluck lead": {
        "cutoff": 6000, "resonance": 0.6,
        "attack": 0.005, "decay": 0.2, "sustain": 0.5, "release": 0.3,
        "reverb_size": 0.2, "reverb_wet": 0.1, "osc_type": "saw",
    },
    "deep sub bass": {
        "cutoff": 280, "resonance": 0.9,
        "attack": 0.01, "decay": 0.3, "sustain": 0.6, "release": 0.4,
        "reverb_size": 0.05, "reverb_wet": 0.0, "osc_type": "square",
    },
    "travis scott atmospheric": {
        "cutoff": 1200, "resonance": 0.5,
        "attack": 0.8, "decay": 1.0, "sustain": 0.8, "release": 3.0,
        "reverb_size": 0.95, "reverb_wet": 0.65, "osc_type": "saw",
    },
    "808 kick bass": {
        "cutoff": 200, "resonance": 1.2,
        "attack": 0.001, "decay": 0.6, "sustain": 0.0, "release": 0.5,
        "reverb_size": 0.1, "reverb_wet": 0.05, "osc_type": "sine",
    },
    "glassy bell pad": {
        "cutoff": 4000, "resonance": 0.3,
        "attack": 0.5, "decay": 2.0, "sustain": 0.4, "release": 4.0,
        "reverb_size": 0.8, "reverb_wet": 0.5, "osc_type": "sine",
    },
    "aggressive distorted lead": {
        "cutoff": 8000, "resonance": 3.0,
        "attack": 0.002, "decay": 0.1, "sustain": 0.9, "release": 0.2,
        "reverb_size": 0.3, "reverb_wet": 0.15, "osc_type": "square",
    },
    "warm lo-fi pad": {
        "cutoff": 1800, "resonance": 0.35,
        "attack": 0.4, "decay": 1.2, "sustain": 0.7, "release": 2.0,
        "reverb_size": 0.6, "reverb_wet": 0.4, "osc_type": "saw",
    },
    "ethereal choir shimmer": {
        "cutoff": 3500, "resonance": 0.25,
        "attack": 2.0, "decay": 1.5, "sustain": 0.85, "release": 5.0,
        "reverb_size": 0.99, "reverb_wet": 0.8, "osc_type": "sine",
    },
    "punchy analog pluck": {
        "cutoff": 3000, "resonance": 1.5,
        "attack": 0.001, "decay": 0.4, "sustain": 0.1, "release": 0.3,
        "reverb_size": 0.25, "reverb_wet": 0.1, "osc_type": "saw",
    },
}

# Precompute embeddings at startup (one-time cost ~1–2s)
print("Computing preset embeddings...")
preset_keys       = list(PRESETS.keys())
preset_embeddings = model.encode(preset_keys, normalize_embeddings=True)
print(f"Ready. {len(PRESETS)} presets indexed.")


class PromptRequest(BaseModel):
    prompt: str


@app.post("/generate")
def generate_params(req: PromptRequest) -> dict:
    """Return synth parameters for the closest matching preset."""
    query_emb = model.encode([req.prompt.strip()], normalize_embeddings=True)[0]

    # Cosine similarity (embeddings are L2-normalized, so dot product = cosine)
    scores    = preset_embeddings @ query_emb
    best_idx  = int(np.argmax(scores))
    best_key  = preset_keys[best_idx]

    result = PRESETS[best_key].copy()
    result["matched_preset"] = best_key
    result["confidence"]     = float(scores[best_idx])
    return result


@app.get("/presets")
def list_presets() -> list[str]:
    """List all available preset names."""
    return preset_keys


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "presets": len(PRESETS)}
