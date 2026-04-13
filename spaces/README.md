---
title: AudioPilot AI Backend
emoji: 🎛️
colorFrom: purple
colorTo: blue
sdk: docker
pinned: false
app_port: 7860
---

# AudioPilot — AI Backend

FastAPI backend for the Serum Dupe VST3 plugin and web app.

Maps text prompts + artist names to synthesizer parameters using
`sentence-transformers/all-MiniLM-L6-v2` semantic embeddings.

## Endpoints

- `POST /generate` — `{ prompt, artist, top_k }` → ranked preset matches
- `GET /presets` — list all available preset names  
- `GET /health` — liveness check

## Example

```bash
curl -X POST https://YOUR-SPACE.hf.space/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "dark ambient pad", "artist": "Travis Scott"}'
```
