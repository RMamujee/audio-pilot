# Serum Dupe — AI-Powered VST3 Synthesizer

A JUCE-based VST3 synth with an AI backend that maps text prompts to synthesizer parameters.

## Architecture

```
Ableton Live → VST3 Plugin (JUCE/C++) ←→ Python FastAPI backend (localhost:8765)
                                                   ↓
                                    sentence-transformers (all-MiniLM-L6-v2)
                                                   ↓
                                    prompt → cosine similarity → synth params
```

## Quick Start

### 1. Build the plugin

**Prerequisites:** CMake 3.22+, JUCE 7, a C++17 compiler (MSVC / Clang / GCC)

```bash
git clone --recurse-submodules https://github.com/RMamujee/serum-dupe.git
cd serum-dupe
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release
```

The VST3 will be at `build/SerumDupe_artefacts/Release/VST3/Serum Dupe.vst3`

Copy it to your VST3 folder and rescan in Ableton.

### 2. Start the AI backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --port 8765 --reload
```

### 3. Use it in Ableton

1. Load the plugin on a MIDI track
2. Type a prompt: `"dark ambient pad"`, `"travis scott atmospheric"`, `"808 kick bass"`
3. Hit **Generate** or press Enter
4. Parameters update in real time

## Preset Library

Current presets (extend in `backend/main.py`):

| Preset | Character |
|--------|-----------|
| dark ambient pad | Slow attack, low cutoff, heavy reverb |
| bright pluck lead | Fast attack, high cutoff, short decay |
| deep sub bass | Very low cutoff, square wave |
| travis scott atmospheric | Warm saw, huge reverb |
| 808 kick bass | Sine, pitch envelope feel |
| glassy bell pad | High cutoff sine, long release |
| aggressive distorted lead | High resonance square |
| warm lo-fi pad | Filtered saw, moderate reverb |
| ethereal choir shimmer | Very slow attack, maximum reverb |
| punchy analog pluck | Resonant saw, short envelope |

## Open-Source Components Used

| Component | License | Purpose |
|-----------|---------|---------|
| [JUCE](https://github.com/juce-framework/JUCE) | GPL/Commercial | Plugin framework, DSP, UI |
| [sentence-transformers](https://github.com/UKPLab/sentence-transformers) | Apache 2.0 | Text embeddings for prompt matching |
| [FastAPI](https://github.com/tiangolo/fastapi) | MIT | AI backend HTTP server |
| [librosa](https://github.com/librosa/librosa) | ISC | Audio feature extraction (Phase 5) |
| [numpy](https://github.com/numpy/numpy) | BSD | Cosine similarity math |

## Roadmap

- [x] Phase 1: Basic synth (oscillator, filter, ADSR, reverb)
- [x] Phase 2: VST3 export via JUCE
- [x] Phase 3: Python AI backend with semantic preset matching
- [x] Phase 4: Plugin ↔ backend integration
- [ ] Phase 5: Sample recommendation via librosa features
- [ ] Phase 6: Wavetable oscillator
- [ ] Phase 6: LFO + modulation matrix
- [ ] Phase 6: FX rack (chorus, phaser, compressor)
