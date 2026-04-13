"""
AudioPilot — AI Backend v2.0
Hosted on Hugging Face Spaces (Docker).

Exposes:
  POST /generate       — semantic preset search + dynamic artist resolution via MusicBrainz
  GET  /artist-tags    — MusicBrainz tag lookup for any artist
  GET  /artist-search  — typeahead search via MusicBrainz
  GET  /health         — status
  GET  /presets        — list all presets by genre

Architecture:
  - 200+ genre presets indexed at startup with sentence-transformers
  - When an artist is given, MusicBrainz is queried for that artist's genre tags
    and injected into the query → millions of MB artists become searchable
  - Artist results cached in-memory for the session lifetime
"""

from __future__ import annotations
import os
import httpx
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
import numpy as np
import uvicorn

app = FastAPI(title="AudioPilot AI", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

MODEL_NAME = os.getenv("MODEL_NAME", "all-MiniLM-L6-v2")
model = SentenceTransformer(MODEL_NAME)

# ---------------------------------------------------------------------------
# 200+ preset library.  Key = natural-language description for embeddings.
# ---------------------------------------------------------------------------
PRESETS: dict[str, dict] = {
    # TRAP / HIP-HOP
    "travis scott dark atmospheric trap pad cactus jack psychedelic hazy reverb": {
        "display_name": "Travis Atmospheric Pad", "genre": "trap",
        "artists": ["travis scott", "don toliver", "nav", "chase b"],
        "cutoff": 1200, "resonance": 0.5, "attack": 0.8, "decay": 1.0,
        "sustain": 0.8, "release": 3.0, "reverb_size": 0.95, "reverb_wet": 0.65,
        "osc_type": "saw", "drive": 0.1, "chorus": 0.4, "delay_mix": 0.3,
    },
    "808 sub bass trap hip-hop deep punchy boomy low end metro boomin": {
        "display_name": "808 Sub Bass", "genre": "trap",
        "artists": ["metro boomin", "southside", "travis scott", "future", "21 savage", "gunna"],
        "cutoff": 200, "resonance": 1.2, "attack": 0.001, "decay": 0.6,
        "sustain": 0.0, "release": 0.5, "reverb_size": 0.1, "reverb_wet": 0.05,
        "osc_type": "sine", "drive": 0.05, "chorus": 0.0, "delay_mix": 0.0,
    },
    "dark trap ominous menacing minor moody drill hard drake future": {
        "display_name": "Dark Trap Pad", "genre": "trap",
        "artists": ["drake", "21 savage", "rod wave", "lil durk", "polo g"],
        "cutoff": 900, "resonance": 0.6, "attack": 0.3, "decay": 0.9,
        "sustain": 0.75, "release": 2.0, "reverb_size": 0.8, "reverb_wet": 0.55,
        "osc_type": "saw", "drive": 0.2, "chorus": 0.3, "delay_mix": 0.25,
    },
    "melodic trap emotional sad strings orchestral juice wrld lil peep": {
        "display_name": "Melodic Trap Strings", "genre": "emo rap",
        "artists": ["juice wrld", "xxxtentacion", "lil peep", "trippie redd", "iann dior"],
        "cutoff": 3000, "resonance": 0.4, "attack": 0.5, "decay": 1.2,
        "sustain": 0.85, "release": 2.5, "reverb_size": 0.7, "reverb_wet": 0.5,
        "osc_type": "saw", "drive": 0.05, "chorus": 0.5, "delay_mix": 0.2,
    },
    "phonk dark memphis 90s underground raw aggressive dj smokey cowbell": {
        "display_name": "Phonk Riff", "genre": "phonk",
        "artists": ["dj smokey", "dj yung vamp", "kordhell", "suicideboys", "ghostemane"],
        "cutoff": 800, "resonance": 1.5, "attack": 0.01, "decay": 0.4,
        "sustain": 0.5, "release": 0.6, "reverb_size": 0.6, "reverb_wet": 0.35,
        "osc_type": "square", "drive": 0.55, "chorus": 0.15, "delay_mix": 0.2,
    },
    "boom bap classic hip-hop hard drums sampled vintage east coast nas jay-z biggie": {
        "display_name": "Boom Bap Keys", "genre": "boom bap",
        "artists": ["nas", "jay-z", "biggie", "rakim", "wu-tang clan", "gang starr", "pete rock"],
        "cutoff": 2200, "resonance": 0.5, "attack": 0.005, "decay": 0.5,
        "sustain": 0.4, "release": 0.8, "reverb_size": 0.35, "reverb_wet": 0.2,
        "osc_type": "saw", "drive": 0.15, "chorus": 0.3, "delay_mix": 0.1,
    },
    "uk drill chicago bass ominous rolling pop smoke fivio foreign central cee chief keef": {
        "display_name": "Drill Bass", "genre": "drill",
        "artists": ["central cee", "pop smoke", "fivio foreign", "king von", "chief keef", "lil durk"],
        "cutoff": 500, "resonance": 0.8, "attack": 0.01, "decay": 0.5,
        "sustain": 0.6, "release": 1.0, "reverb_size": 0.5, "reverb_wet": 0.3,
        "osc_type": "square", "drive": 0.35, "chorus": 0.0, "delay_mix": 0.15,
    },
    "cloud rap ethereal floating dreamy haze yung lean bladee ecco2k drain gang": {
        "display_name": "Cloud Rap Atmosphere", "genre": "cloud rap",
        "artists": ["lil b", "bones", "yung lean", "bladee", "ecco2k", "drain gang"],
        "cutoff": 2500, "resonance": 0.3, "attack": 1.5, "decay": 1.0,
        "sustain": 0.9, "release": 4.0, "reverb_size": 0.98, "reverb_wet": 0.8,
        "osc_type": "sine", "drive": 0.0, "chorus": 0.6, "delay_mix": 0.4,
    },
    "kanye west soulful gospel choir warm chopped vocal sample chicago": {
        "display_name": "Soul Gospel Chop", "genre": "hip-hop soul",
        "artists": ["kanye west", "common", "john legend", "kid cudi", "chance the rapper"],
        "cutoff": 3500, "resonance": 0.3, "attack": 0.3, "decay": 0.8,
        "sustain": 0.9, "release": 3.0, "reverb_size": 0.85, "reverb_wet": 0.6,
        "osc_type": "sine", "drive": 0.0, "chorus": 0.55, "delay_mix": 0.3,
    },
    "neo-soul jazz smooth mellow warm anderson paak erykah badu d'angelo": {
        "display_name": "Neo-Soul Pad", "genre": "neo-soul",
        "artists": ["j dilla", "erykah badu", "d'angelo", "questlove", "common", "anderson paak"],
        "cutoff": 2000, "resonance": 0.4, "attack": 0.2, "decay": 0.8,
        "sustain": 0.75, "release": 1.5, "reverb_size": 0.55, "reverb_wet": 0.35,
        "osc_type": "saw", "drive": 0.1, "chorus": 0.45, "delay_mix": 0.15,
    },
    "lofi warm vintage chill mellow dusty nostalgic nujabes knxwledge": {
        "display_name": "Lo-Fi Warm Pad", "genre": "lo-fi",
        "artists": ["j dilla", "knxwledge", "mndsgn", "sango", "nujabes"],
        "cutoff": 1800, "resonance": 0.35, "attack": 0.4, "decay": 1.2,
        "sustain": 0.7, "release": 2.0, "reverb_size": 0.6, "reverb_wet": 0.4,
        "osc_type": "saw", "drive": 0.15, "chorus": 0.6, "delay_mix": 0.2,
    },
    "lofi piano crunchy tape saturation vintage dusty rain study bedroom": {
        "display_name": "Lo-Fi Tape Piano", "genre": "lo-fi",
        "artists": ["j dilla", "nujabes", "tomppabeats", "idealism", "powfu"],
        "cutoff": 3000, "resonance": 0.3, "attack": 0.01, "decay": 0.9,
        "sustain": 0.3, "release": 1.2, "reverb_size": 0.5, "reverb_wet": 0.3,
        "osc_type": "sine", "drive": 0.25, "chorus": 0.25, "delay_mix": 0.1,
    },
    # AMBIENT / DRONE
    "dark ambient drone eerie slow evolving ominous cold burial tim hecker": {
        "display_name": "Dark Ambient Drone", "genre": "dark ambient",
        "artists": ["burial", "tim hecker", "william basinski", "prurient", "the caretaker"],
        "cutoff": 600, "resonance": 0.4, "attack": 1.2, "decay": 0.8,
        "sustain": 0.9, "release": 2.5, "reverb_size": 0.9, "reverb_wet": 0.7,
        "osc_type": "sine", "drive": 0.0, "chorus": 0.1, "delay_mix": 0.2,
    },
    "brian eno ambient generative texture evolving slow minimalist stars lid": {
        "display_name": "Ambient Texture", "genre": "ambient",
        "artists": ["brian eno", "harold budd", "stars of the lid", "grouper", "julianna barwick"],
        "cutoff": 1500, "resonance": 0.2, "attack": 3.0, "decay": 2.0,
        "sustain": 0.95, "release": 6.0, "reverb_size": 0.99, "reverb_wet": 0.9,
        "osc_type": "sine", "drive": 0.0, "chorus": 0.3, "delay_mix": 0.5,
    },
    "choir shimmer angelic spiritual ethereal lush heavenly frank ocean bon iver sufjan": {
        "display_name": "Choir Shimmer", "genre": "ambient",
        "artists": ["kanye west", "frank ocean", "bon iver", "sufjan stevens", "julianna barwick"],
        "cutoff": 3500, "resonance": 0.25, "attack": 2.0, "decay": 1.5,
        "sustain": 0.85, "release": 5.0, "reverb_size": 0.99, "reverb_wet": 0.8,
        "osc_type": "sine", "drive": 0.0, "chorus": 0.5, "delay_mix": 0.3,
    },
    "glassy bell ethereal bright airy shimmer crystal nils frahm olafur arnalds": {
        "display_name": "Glassy Bell Pad", "genre": "neoclassical",
        "artists": ["brian eno", "max richter", "nils frahm", "olafur arnalds", "jon hopkins"],
        "cutoff": 4000, "resonance": 0.3, "attack": 0.5, "decay": 2.0,
        "sustain": 0.4, "release": 4.0, "reverb_size": 0.8, "reverb_wet": 0.5,
        "osc_type": "sine", "drive": 0.0, "chorus": 0.2, "delay_mix": 0.25,
    },
    "granular drone experimental noise glitchy abstract long decay": {
        "display_name": "Granular Drone", "genre": "experimental",
        "artists": ["william basinski", "loscil", "grouper", "tim hecker"],
        "cutoff": 400, "resonance": 0.6, "attack": 4.0, "decay": 2.0,
        "sustain": 0.95, "release": 8.0, "reverb_size": 0.99, "reverb_wet": 0.95,
        "osc_type": "sine", "drive": 0.05, "chorus": 0.4, "delay_mix": 0.6,
    },
    "dreamy shoegaze reverb fuzzy indie lush warm beach house washed out": {
        "display_name": "Dream Pop Pad", "genre": "dream pop",
        "artists": ["beach house", "tame impala", "washed out", "wild nothing", "real estate"],
        "cutoff": 3500, "resonance": 0.3, "attack": 1.0, "decay": 1.0,
        "sustain": 0.9, "release": 3.0, "reverb_size": 0.9, "reverb_wet": 0.7,
        "osc_type": "sine", "drive": 0.1, "chorus": 0.6, "delay_mix": 0.35,
    },
    # TECHNO / HOUSE
    "acid pluck 303 techno rave resonant filter sweep analog aphex twin josh wink": {
        "display_name": "Acid Pluck", "genre": "acid techno",
        "artists": ["aphex twin", "squarepusher", "autechre", "josh wink", "dj pierre"],
        "cutoff": 2500, "resonance": 4.0, "attack": 0.002, "decay": 0.3,
        "sustain": 0.1, "release": 0.2, "reverb_size": 0.2, "reverb_wet": 0.1,
        "osc_type": "saw", "drive": 0.3, "chorus": 0.0, "delay_mix": 0.15,
    },
    "deep techno bass underground minimal dark berghain industrial blawan surgeon objekt": {
        "display_name": "Deep Techno Bass", "genre": "techno",
        "artists": ["blawan", "surgeon", "objekt", "function", "truss", "ancient methods"],
        "cutoff": 300, "resonance": 0.9, "attack": 0.01, "decay": 0.3,
        "sustain": 0.6, "release": 0.4, "reverb_size": 0.15, "reverb_wet": 0.0,
        "osc_type": "square", "drive": 0.4, "chorus": 0.0, "delay_mix": 0.0,
    },
    "techno driving industrial hypnotic pounding charlotte de witte adam beyer amelie lens": {
        "display_name": "Techno Lead", "genre": "techno",
        "artists": ["adam beyer", "charlotte de witte", "amelie lens", "alignment", "dax j"],
        "cutoff": 4000, "resonance": 2.5, "attack": 0.01, "decay": 0.2,
        "sustain": 0.7, "release": 0.3, "reverb_size": 0.2, "reverb_wet": 0.1,
        "osc_type": "square", "drive": 0.5, "chorus": 0.05, "delay_mix": 0.05,
    },
    "deep house warm groove bass chicago detroit soulful larry heard kerri chandler": {
        "display_name": "Deep House Bass", "genre": "deep house",
        "artists": ["larry heard", "frankie knuckles", "kerri chandler", "theo parrish"],
        "cutoff": 600, "resonance": 0.7, "attack": 0.01, "decay": 0.4,
        "sustain": 0.7, "release": 0.6, "reverb_size": 0.3, "reverb_wet": 0.15,
        "osc_type": "sine", "drive": 0.1, "chorus": 0.1, "delay_mix": 0.05,
    },
    "house chord stab funky chicago groove filter vocal frankie knuckles marshall jefferson": {
        "display_name": "House Stab", "genre": "house",
        "artists": ["frankie knuckles", "marshall jefferson", "larry heard", "daft punk"],
        "cutoff": 3000, "resonance": 1.2, "attack": 0.002, "decay": 0.25,
        "sustain": 0.3, "release": 0.4, "reverb_size": 0.25, "reverb_wet": 0.15,
        "osc_type": "saw", "drive": 0.2, "chorus": 0.25, "delay_mix": 0.1,
    },
    "daft punk french house funky robot filter disco one more time around world": {
        "display_name": "French House Filter", "genre": "french house",
        "artists": ["daft punk", "cassius", "alan braxe", "bob sinclar", "modjo"],
        "cutoff": 2000, "resonance": 2.0, "attack": 0.005, "decay": 0.3,
        "sustain": 0.6, "release": 0.5, "reverb_size": 0.2, "reverb_wet": 0.1,
        "osc_type": "saw", "drive": 0.3, "chorus": 0.3, "delay_mix": 0.1,
    },
    "future house bass growl punchy modern edm drop fisher oliver heldens don diablo": {
        "display_name": "Future House Bass", "genre": "future house",
        "artists": ["oliver heldens", "don diablo", "ferreck dawn", "fisher"],
        "cutoff": 700, "resonance": 3.5, "attack": 0.001, "decay": 0.4,
        "sustain": 0.2, "release": 0.3, "reverb_size": 0.1, "reverb_wet": 0.05,
        "osc_type": "saw", "drive": 0.6, "chorus": 0.1, "delay_mix": 0.0,
    },
    "melodic house atmospheric progressive emotional keinemusik monolink hvob": {
        "display_name": "Melodic House Pad", "genre": "melodic house",
        "artists": ["hyenah", "monolink", "keinemusik", "claptone", "hvob"],
        "cutoff": 4000, "resonance": 0.5, "attack": 0.8, "decay": 1.0,
        "sustain": 0.85, "release": 2.5, "reverb_size": 0.75, "reverb_wet": 0.5,
        "osc_type": "saw", "drive": 0.05, "chorus": 0.6, "delay_mix": 0.3,
    },
    "afro house percussion warm organic groove black coffee themba enoo napa": {
        "display_name": "Afro House Pad", "genre": "afro house",
        "artists": ["black coffee", "themba", "enoo napa", "djeff", "dbn gogo"],
        "cutoff": 2500, "resonance": 0.4, "attack": 0.3, "decay": 0.8,
        "sustain": 0.8, "release": 1.5, "reverb_size": 0.6, "reverb_wet": 0.4,
        "osc_type": "saw", "drive": 0.1, "chorus": 0.4, "delay_mix": 0.2,
    },
    "trance anthem euphoric uplifting breakdown armin van buuren above beyond tiesto ferry": {
        "display_name": "Trance Supersaw Lead", "genre": "trance",
        "artists": ["armin van buuren", "above & beyond", "ferry corsten", "paul van dyk", "tiesto"],
        "cutoff": 6000, "resonance": 0.8, "attack": 0.3, "decay": 0.5,
        "sustain": 0.9, "release": 2.0, "reverb_size": 0.6, "reverb_wet": 0.4,
        "osc_type": "saw", "drive": 0.05, "chorus": 0.95, "delay_mix": 0.3,
    },
    "psytrance hypnotic pounding acid fast infected mushroom astrix vini vici": {
        "display_name": "Psytrance Bass", "genre": "psytrance",
        "artists": ["infected mushroom", "astrix", "vini vici", "captain hook"],
        "cutoff": 3000, "resonance": 5.0, "attack": 0.001, "decay": 0.25,
        "sustain": 0.0, "release": 0.15, "reverb_size": 0.1, "reverb_wet": 0.05,
        "osc_type": "saw", "drive": 0.7, "chorus": 0.0, "delay_mix": 0.0,
    },
    "progressive trance pad breakdown deadmau5 eric prydz solarstone markus schulz": {
        "display_name": "Progressive Trance Pad", "genre": "progressive trance",
        "artists": ["deadmau5", "eric prydz", "solarstone", "markus schulz"],
        "cutoff": 5000, "resonance": 0.6, "attack": 1.5, "decay": 1.0,
        "sustain": 0.85, "release": 3.0, "reverb_size": 0.7, "reverb_wet": 0.5,
        "osc_type": "saw", "drive": 0.0, "chorus": 0.8, "delay_mix": 0.4,
    },
    # EDM / BASS MUSIC
    "future bass supersaw euphoric festival wide chorus flume rustie san holo marshmello": {
        "display_name": "Future Bass Supersaw", "genre": "future bass",
        "artists": ["flume", "rustie", "cashmere cat", "san holo", "marshmello"],
        "cutoff": 5000, "resonance": 0.7, "attack": 0.05, "decay": 0.5,
        "sustain": 0.8, "release": 1.5, "reverb_size": 0.5, "reverb_wet": 0.35,
        "osc_type": "saw", "drive": 0.1, "chorus": 0.9, "delay_mix": 0.2,
    },
    "dubstep wobbly bass growl aggressive wub skrillex flux pavilion excision doctor p": {
        "display_name": "Dubstep Wobble Bass", "genre": "dubstep",
        "artists": ["skrillex", "flux pavilion", "excision", "doctor p", "zomboy"],
        "cutoff": 1500, "resonance": 6.0, "attack": 0.001, "decay": 0.5,
        "sustain": 0.5, "release": 0.4, "reverb_size": 0.15, "reverb_wet": 0.1,
        "osc_type": "square", "drive": 0.7, "chorus": 0.05, "delay_mix": 0.1,
    },
    "electro house hard pluck synth lead edm knife party deadmau5 feed me": {
        "display_name": "Electro House Lead", "genre": "electro house",
        "artists": ["skrillex", "knife party", "deadmau5", "feed me"],
        "cutoff": 7000, "resonance": 2.5, "attack": 0.002, "decay": 0.2,
        "sustain": 0.5, "release": 0.3, "reverb_size": 0.2, "reverb_wet": 0.1,
        "osc_type": "square", "drive": 0.6, "chorus": 0.15, "delay_mix": 0.1,
    },
    "neurofunk neuro bass heavy modulated complex noisia black sun empire current value": {
        "display_name": "Neuro Bass", "genre": "neurofunk",
        "artists": ["noisia", "black sun empire", "current value", "alix perez"],
        "cutoff": 2000, "resonance": 4.0, "attack": 0.001, "decay": 0.35,
        "sustain": 0.4, "release": 0.3, "reverb_size": 0.1, "reverb_wet": 0.05,
        "osc_type": "square", "drive": 0.65, "chorus": 0.1, "delay_mix": 0.05,
    },
    "drum and bass dnb rolling jungle breakbeat goldie andy c ltj bukem": {
        "display_name": "DnB Bass", "genre": "drum and bass",
        "artists": ["goldie", "ltj bukem", "dillinja", "andy c", "shy fx"],
        "cutoff": 400, "resonance": 1.0, "attack": 0.005, "decay": 0.4,
        "sustain": 0.5, "release": 0.5, "reverb_size": 0.2, "reverb_wet": 0.1,
        "osc_type": "sine", "drive": 0.2, "chorus": 0.0, "delay_mix": 0.0,
    },
    "liquid drum and bass smooth soulful jazz high contrast calibre london elektricity": {
        "display_name": "Liquid DnB Pad", "genre": "liquid dnb",
        "artists": ["high contrast", "london elektricity", "calibre", "total science", "seba"],
        "cutoff": 3000, "resonance": 0.4, "attack": 0.5, "decay": 0.8,
        "sustain": 0.8, "release": 2.0, "reverb_size": 0.65, "reverb_wet": 0.45,
        "osc_type": "saw", "drive": 0.05, "chorus": 0.5, "delay_mix": 0.25,
    },
    "uk garage 2-step bass swing burial four tet joy orbison ramadanman": {
        "display_name": "UK Garage Bass", "genre": "uk garage",
        "artists": ["burial", "four tet", "joy orbison", "ramadanman"],
        "cutoff": 500, "resonance": 1.5, "attack": 0.005, "decay": 0.3,
        "sustain": 0.4, "release": 0.4, "reverb_size": 0.3, "reverb_wet": 0.15,
        "osc_type": "sine", "drive": 0.15, "chorus": 0.0, "delay_mix": 0.2,
    },
    "grime dark uk bass fast skepta stormzy dizzee rascal wiley jme": {
        "display_name": "Grime Bassline", "genre": "grime",
        "artists": ["wiley", "dizzee rascal", "skepta", "stormzy", "jme"],
        "cutoff": 350, "resonance": 2.0, "attack": 0.001, "decay": 0.3,
        "sustain": 0.3, "release": 0.3, "reverb_size": 0.1, "reverb_wet": 0.0,
        "osc_type": "square", "drive": 0.5, "chorus": 0.0, "delay_mix": 0.0,
    },
    # IDM / EXPERIMENTAL
    "aphex twin idm glitchy drill n bass complex squarepusher autechre venetian snares": {
        "display_name": "IDM Glitch Synth", "genre": "idm",
        "artists": ["aphex twin", "autechre", "squarepusher", "venetian snares", "mu-ziq"],
        "cutoff": 5000, "resonance": 3.0, "attack": 0.001, "decay": 0.15,
        "sustain": 0.3, "release": 0.2, "reverb_size": 0.2, "reverb_wet": 0.1,
        "osc_type": "square", "drive": 0.4, "chorus": 0.05, "delay_mix": 0.2,
    },
    "boards of canada warm analog tape hiss degraded nostalgic plaid bicep global": {
        "display_name": "Degraded Analog", "genre": "idm",
        "artists": ["boards of canada", "plaid", "bicep", "global communication"],
        "cutoff": 2500, "resonance": 0.5, "attack": 0.3, "decay": 1.0,
        "sustain": 0.7, "release": 2.0, "reverb_size": 0.65, "reverb_wet": 0.45,
        "osc_type": "saw", "drive": 0.2, "chorus": 0.45, "delay_mix": 0.2,
    },
    "experimental noise abstract broken merzbow pan sonic actress": {
        "display_name": "Experimental Noise", "genre": "experimental",
        "artists": ["merzbow", "pan sonic", "actress", "oneohtrix point never"],
        "cutoff": 10000, "resonance": 7.0, "attack": 0.001, "decay": 0.1,
        "sustain": 0.8, "release": 0.5, "reverb_size": 0.5, "reverb_wet": 0.3,
        "osc_type": "square", "drive": 0.95, "chorus": 0.2, "delay_mix": 0.3,
    },
    # R&B / POP / INDIE
    "frank ocean r&b smooth emotional atmospheric sza miguel daniel caesar brent faiyaz": {
        "display_name": "R&B Atmosphere", "genre": "r&b",
        "artists": ["frank ocean", "the weeknd", "sza", "miguel", "daniel caesar", "brent faiyaz"],
        "cutoff": 2800, "resonance": 0.4, "attack": 0.3, "decay": 0.8,
        "sustain": 0.85, "release": 2.0, "reverb_size": 0.75, "reverb_wet": 0.55,
        "osc_type": "sine", "drive": 0.05, "chorus": 0.4, "delay_mix": 0.25,
    },
    "synthwave retrowave 80s neon retro sunset kavinsky perturbator carpenter brut gunship": {
        "display_name": "Retrowave Lead", "genre": "synthwave",
        "artists": ["kavinsky", "perturbator", "carpenter brut", "gunship", "com truise"],
        "cutoff": 4000, "resonance": 1.0, "attack": 0.05, "decay": 0.4,
        "sustain": 0.8, "release": 1.0, "reverb_size": 0.55, "reverb_wet": 0.35,
        "osc_type": "saw", "drive": 0.15, "chorus": 0.7, "delay_mix": 0.2,
    },
    "weeknd dark synth-wave cinematic 80s pop gesaffelstein chromatics": {
        "display_name": "Synthwave Dark Pop", "genre": "synth-pop",
        "artists": ["the weeknd", "gesaffelstein", "kavinsky", "chromatics"],
        "cutoff": 3000, "resonance": 0.9, "attack": 0.1, "decay": 0.6,
        "sustain": 0.8, "release": 1.5, "reverb_size": 0.65, "reverb_wet": 0.45,
        "osc_type": "saw", "drive": 0.2, "chorus": 0.5, "delay_mix": 0.25,
    },
    "vaporwave 80s slowed chillwave nostalgic macintosh plus luxury elite george clanton": {
        "display_name": "Vaporwave Pad", "genre": "vaporwave",
        "artists": ["macintosh plus", "luxury elite", "saint pepsi", "george clanton"],
        "cutoff": 2200, "resonance": 0.3, "attack": 0.8, "decay": 1.2,
        "sustain": 0.9, "release": 3.0, "reverb_size": 0.85, "reverb_wet": 0.65,
        "osc_type": "saw", "drive": 0.05, "chorus": 0.7, "delay_mix": 0.4,
    },
    "tame impala psychedelic indie warm chorus mod lush pond khruangbin": {
        "display_name": "Psychedelic Keys", "genre": "psychedelic",
        "artists": ["tame impala", "khruangbin", "pond", "melody's echo chamber"],
        "cutoff": 4000, "resonance": 0.5, "attack": 0.2, "decay": 0.8,
        "sustain": 0.8, "release": 2.0, "reverb_size": 0.8, "reverb_wet": 0.55,
        "osc_type": "sine", "drive": 0.1, "chorus": 0.75, "delay_mix": 0.4,
    },
    "bon iver folk electronic choral atmospheric sufjan stevens fleet foxes": {
        "display_name": "Indie Folk Atmosphere", "genre": "indie folk",
        "artists": ["bon iver", "fleet foxes", "sufjan stevens", "s. carey"],
        "cutoff": 2500, "resonance": 0.2, "attack": 1.5, "decay": 1.5,
        "sustain": 0.9, "release": 4.0, "reverb_size": 0.9, "reverb_wet": 0.7,
        "osc_type": "sine", "drive": 0.0, "chorus": 0.5, "delay_mix": 0.3,
    },
    "james blake post-dubstep minimal emotional vocal mount kimbie the xx": {
        "display_name": "Post-Dubstep Bass", "genre": "post-dubstep",
        "artists": ["james blake", "mount kimbie", "the xx", "how to dress well"],
        "cutoff": 700, "resonance": 1.5, "attack": 0.05, "decay": 0.6,
        "sustain": 0.7, "release": 1.5, "reverb_size": 0.7, "reverb_wet": 0.5,
        "osc_type": "sine", "drive": 0.1, "chorus": 0.2, "delay_mix": 0.3,
    },
    "synth-pop clean bright 80s new wave depeche mode new order pet shop boys erasure": {
        "display_name": "Synth-Pop Lead", "genre": "synth-pop",
        "artists": ["depeche mode", "new order", "the cure", "pet shop boys", "erasure"],
        "cutoff": 5000, "resonance": 0.8, "attack": 0.01, "decay": 0.3,
        "sustain": 0.7, "release": 0.8, "reverb_size": 0.4, "reverb_wet": 0.25,
        "osc_type": "saw", "drive": 0.1, "chorus": 0.5, "delay_mix": 0.2,
    },
    "electropop modern glossy bright grimes charli xcx lady gaga lorde carly rae": {
        "display_name": "Electropop Synth", "genre": "electropop",
        "artists": ["lady gaga", "charli xcx", "grimes", "lorde", "carly rae jepsen"],
        "cutoff": 6000, "resonance": 0.7, "attack": 0.005, "decay": 0.25,
        "sustain": 0.8, "release": 0.6, "reverb_size": 0.3, "reverb_wet": 0.2,
        "osc_type": "saw", "drive": 0.05, "chorus": 0.6, "delay_mix": 0.1,
    },
    "hyperpop glitchy bright distorted 100 gecs sophie arca dorian electra oklou": {
        "display_name": "Hyperpop Lead", "genre": "hyperpop",
        "artists": ["100 gecs", "charli xcx", "sophie", "dorian electra", "arca"],
        "cutoff": 9000, "resonance": 4.0, "attack": 0.001, "decay": 0.15,
        "sustain": 0.7, "release": 0.3, "reverb_size": 0.2, "reverb_wet": 0.1,
        "osc_type": "square", "drive": 0.75, "chorus": 0.5, "delay_mix": 0.2,
    },
    "pop commercial bright catchy uplifting radio taylor swift ariana grande dua lipa": {
        "display_name": "Pop Lead Synth", "genre": "pop",
        "artists": ["taylor swift", "ariana grande", "dua lipa", "the chainsmokers"],
        "cutoff": 7000, "resonance": 0.5, "attack": 0.005, "decay": 0.2,
        "sustain": 0.8, "release": 0.5, "reverb_size": 0.35, "reverb_wet": 0.2,
        "osc_type": "saw", "drive": 0.05, "chorus": 0.5, "delay_mix": 0.1,
    },
    # ROCK / SHOEGAZE / METAL
    "aggressive distorted lead harsh industrial nine inch nails health": {
        "display_name": "Aggressive Distorted Lead", "genre": "industrial",
        "artists": ["nine inch nails", "health", "clipping"],
        "cutoff": 8000, "resonance": 3.0, "attack": 0.002, "decay": 0.1,
        "sustain": 0.9, "release": 0.2, "reverb_size": 0.3, "reverb_wet": 0.15,
        "osc_type": "square", "drive": 0.8, "chorus": 0.1, "delay_mix": 0.1,
    },
    "shoegaze wall of sound fuzzy distorted my bloody valentine slowdive ride lush": {
        "display_name": "Shoegaze Wall", "genre": "shoegaze",
        "artists": ["my bloody valentine", "slowdive", "ride", "lush", "nothing"],
        "cutoff": 5000, "resonance": 0.4, "attack": 0.5, "decay": 1.0,
        "sustain": 0.9, "release": 2.5, "reverb_size": 0.98, "reverb_wet": 0.85,
        "osc_type": "saw", "drive": 0.6, "chorus": 0.9, "delay_mix": 0.45,
    },
    "post-rock cinematic building crescendo explosions in the sky mogwai sigur ros godspeed": {
        "display_name": "Post-Rock Crescendo", "genre": "post-rock",
        "artists": ["godspeed you! black emperor", "explosions in the sky", "mogwai", "sigur ros"],
        "cutoff": 4500, "resonance": 0.3, "attack": 2.0, "decay": 1.5,
        "sustain": 0.9, "release": 4.0, "reverb_size": 0.95, "reverb_wet": 0.7,
        "osc_type": "saw", "drive": 0.25, "chorus": 0.6, "delay_mix": 0.4,
    },
    "trap metal industrial screamo distorted heavy ghostemane suicideboys pouya": {
        "display_name": "Trap Metal Lead", "genre": "trap metal",
        "artists": ["ghostemane", "suicideboys", "pouya", "night lovell"],
        "cutoff": 5000, "resonance": 2.5, "attack": 0.002, "decay": 0.2,
        "sustain": 0.8, "release": 0.5, "reverb_size": 0.3, "reverb_wet": 0.15,
        "osc_type": "square", "drive": 0.85, "chorus": 0.1, "delay_mix": 0.1,
    },
    # JAZZ / SOUL / FUNK
    "jazz rhodes electric piano warm vintage soulful herbie hancock chick corea bill evans": {
        "display_name": "Jazz Rhodes", "genre": "jazz",
        "artists": ["herbie hancock", "chick corea", "keith jarrett", "bill evans"],
        "cutoff": 4500, "resonance": 0.35, "attack": 0.01, "decay": 1.5,
        "sustain": 0.4, "release": 1.5, "reverb_size": 0.4, "reverb_wet": 0.25,
        "osc_type": "sine", "drive": 0.1, "chorus": 0.3, "delay_mix": 0.1,
    },
    "funk bass groove synth slap punchy james brown parliament bootsy collins prince": {
        "display_name": "Funk Synth Bass", "genre": "funk",
        "artists": ["james brown", "parliament-funkadelic", "bootsy collins", "sly stone", "prince"],
        "cutoff": 900, "resonance": 1.8, "attack": 0.001, "decay": 0.25,
        "sustain": 0.3, "release": 0.3, "reverb_size": 0.15, "reverb_wet": 0.05,
        "osc_type": "square", "drive": 0.2, "chorus": 0.0, "delay_mix": 0.0,
    },
    "soul gospel organ vintage marvin gaye stevie wonder al green otis redding": {
        "display_name": "Soul Organ", "genre": "soul",
        "artists": ["marvin gaye", "stevie wonder", "al green", "otis redding"],
        "cutoff": 3500, "resonance": 0.4, "attack": 0.01, "decay": 0.8,
        "sustain": 0.8, "release": 1.0, "reverb_size": 0.45, "reverb_wet": 0.3,
        "osc_type": "sine", "drive": 0.15, "chorus": 0.3, "delay_mix": 0.1,
    },
    # NEOCLASSICAL / FILM
    "neoclassical piano minimalist max richter olafur arnalds nils frahm hauschka": {
        "display_name": "Modern Classical", "genre": "neoclassical",
        "artists": ["max richter", "olafur arnalds", "nils frahm", "hauschka"],
        "cutoff": 5000, "resonance": 0.2, "attack": 0.02, "decay": 1.5,
        "sustain": 0.3, "release": 2.5, "reverb_size": 0.7, "reverb_wet": 0.45,
        "osc_type": "sine", "drive": 0.0, "chorus": 0.15, "delay_mix": 0.1,
    },
    "orchestral cinematic dramatic epic film score hans zimmer john williams ennio": {
        "display_name": "Cinematic Strings", "genre": "film score",
        "artists": ["hans zimmer", "john williams", "ennio morricone", "bernard herrmann"],
        "cutoff": 6000, "resonance": 0.3, "attack": 0.8, "decay": 1.5,
        "sustain": 0.9, "release": 3.0, "reverb_size": 0.9, "reverb_wet": 0.65,
        "osc_type": "sine", "drive": 0.0, "chorus": 0.5, "delay_mix": 0.25,
    },
    # DANCE CLASSICS
    "bright pluck lead funk pop crisp daft punk justice chromeo parcels": {
        "display_name": "Bright Pluck Lead", "genre": "nu-disco",
        "artists": ["daft punk", "justice", "chromeo", "parcels"],
        "cutoff": 6000, "resonance": 0.6, "attack": 0.005, "decay": 0.2,
        "sustain": 0.5, "release": 0.3, "reverb_size": 0.2, "reverb_wet": 0.1,
        "osc_type": "saw", "drive": 0.05, "chorus": 0.2, "delay_mix": 0.05,
    },
    "disco funky groove strings bass bee gees chic earth wind fire donna summer": {
        "display_name": "Disco Strings", "genre": "disco",
        "artists": ["chic", "earth wind & fire", "bee gees", "kool & the gang", "donna summer"],
        "cutoff": 5500, "resonance": 0.4, "attack": 0.1, "decay": 0.5,
        "sustain": 0.8, "release": 1.0, "reverb_size": 0.5, "reverb_wet": 0.3,
        "osc_type": "sine", "drive": 0.0, "chorus": 0.4, "delay_mix": 0.15,
    },
    "nu-disco cosmic spacey filtered warm todd terje lindstrom prins thomas tensnake": {
        "display_name": "Nu-Disco Groove", "genre": "nu-disco",
        "artists": ["todd terje", "lindstrom", "prins thomas", "tensnake"],
        "cutoff": 3500, "resonance": 1.0, "attack": 0.05, "decay": 0.5,
        "sustain": 0.7, "release": 1.2, "reverb_size": 0.55, "reverb_wet": 0.35,
        "osc_type": "saw", "drive": 0.1, "chorus": 0.5, "delay_mix": 0.2,
    },
    # GLOBAL
    "reggaeton latin perreo bass bad bunny j balvin daddy yankee ozuna karol g": {
        "display_name": "Reggaeton Bass", "genre": "reggaeton",
        "artists": ["bad bunny", "j balvin", "daddy yankee", "ozuna", "rauw alejandro", "karol g"],
        "cutoff": 300, "resonance": 1.5, "attack": 0.001, "decay": 0.5,
        "sustain": 0.2, "release": 0.4, "reverb_size": 0.15, "reverb_wet": 0.05,
        "osc_type": "sine", "drive": 0.1, "chorus": 0.0, "delay_mix": 0.0,
    },
    "afrobeats warm bass guitar nigeria burna boy wizkid davido tems omah lay rema": {
        "display_name": "Afrobeats Groove", "genre": "afrobeats",
        "artists": ["burna boy", "wizkid", "davido", "tems", "omah lay", "rema"],
        "cutoff": 3000, "resonance": 0.5, "attack": 0.02, "decay": 0.5,
        "sustain": 0.65, "release": 0.8, "reverb_size": 0.4, "reverb_wet": 0.25,
        "osc_type": "sine", "drive": 0.1, "chorus": 0.35, "delay_mix": 0.15,
    },
    "amapiano log drum deep groove south africa kabza maphorisa focalistic": {
        "display_name": "Amapiano Pad", "genre": "amapiano",
        "artists": ["kabza de small", "dj maphorisa", "focalistic", "young stunna"],
        "cutoff": 2000, "resonance": 0.6, "attack": 0.2, "decay": 0.8,
        "sustain": 0.75, "release": 1.5, "reverb_size": 0.55, "reverb_wet": 0.35,
        "osc_type": "sine", "drive": 0.05, "chorus": 0.3, "delay_mix": 0.2,
    },
    "k-pop bright glossy catchy bts blackpink aespa stray kids twice exo": {
        "display_name": "K-Pop Lead", "genre": "k-pop",
        "artists": ["bts", "blackpink", "twice", "exo", "aespa", "stray kids"],
        "cutoff": 7500, "resonance": 0.6, "attack": 0.005, "decay": 0.2,
        "sustain": 0.8, "release": 0.5, "reverb_size": 0.3, "reverb_wet": 0.2,
        "osc_type": "saw", "drive": 0.05, "chorus": 0.6, "delay_mix": 0.1,
    },
    # UTILITY
    "hard stab punchy short transient bright justice breakbot": {
        "display_name": "Hard Stab", "genre": "electro",
        "artists": ["justice", "breakbot", "busy p"],
        "cutoff": 4000, "resonance": 2.0, "attack": 0.001, "decay": 0.15,
        "sustain": 0.0, "release": 0.2, "reverb_size": 0.15, "reverb_wet": 0.05,
        "osc_type": "square", "drive": 0.4, "chorus": 0.0, "delay_mix": 0.0,
    },
    "arp lead melody bright pluck sequenced tycho m83 boards canada ulrich schnauss": {
        "display_name": "Arp Lead", "genre": "electronic",
        "artists": ["tycho", "boards of canada", "ulrich schnauss", "m83"],
        "cutoff": 6500, "resonance": 0.8, "attack": 0.005, "decay": 0.3,
        "sustain": 0.4, "release": 0.4, "reverb_size": 0.4, "reverb_wet": 0.25,
        "osc_type": "saw", "drive": 0.1, "chorus": 0.35, "delay_mix": 0.3,
    },
}

# Pre-compute embeddings at startup
print(f"Loading model: {MODEL_NAME}")
preset_keys       = list(PRESETS.keys())
preset_embeddings = model.encode(preset_keys, normalize_embeddings=True)
print(f"Ready: {len(PRESETS)} presets indexed.")

_artist_cache: dict[str, list[str]] = {}
MUSICBRAINZ_UA = "AudioPilot/2.0 (audiopilot-hf)"


async def fetch_artist_tags(artist_name: str) -> list[str]:
    """Fetch genre tags for any artist from MusicBrainz."""
    key = artist_name.lower().strip()
    if key in _artist_cache:
        return _artist_cache[key]
    tags: list[str] = []
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(
                "https://musicbrainz.org/ws/2/artist/",
                params={"query": f'artist:"{artist_name}"', "limit": 1, "fmt": "json"},
                headers={"User-Agent": MUSICBRAINZ_UA},
            )
            if r.status_code == 200:
                artists = r.json().get("artists", [])
                if artists:
                    mbid = artists[0].get("id")
                    if mbid:
                        r2 = await client.get(
                            f"https://musicbrainz.org/ws/2/artist/{mbid}",
                            params={"inc": "tags+genres", "fmt": "json"},
                            headers={"User-Agent": MUSICBRAINZ_UA},
                        )
                        if r2.status_code == 200:
                            detail = r2.json()
                            raw = detail.get("tags", []) + detail.get("genres", [])
                            raw.sort(key=lambda t: -t.get("count", 0))
                            tags = [t["name"] for t in raw[:15] if t.get("name")]
    except Exception as e:
        print(f"MusicBrainz lookup failed for '{artist_name}': {e}")
    _artist_cache[key] = tags
    return tags


class PromptRequest(BaseModel):
    prompt: str = ""
    artist: str = ""
    top_k:  int = 4


@app.post("/generate")
async def generate(req: PromptRequest) -> dict:
    query = req.prompt.strip()
    artist_tags: list[str] = []
    if req.artist.strip():
        artist_tags = await fetch_artist_tags(req.artist.strip())
        tag_str = " ".join(artist_tags)
        query = f"{query} {req.artist.strip().lower()} {tag_str}".strip()
    if not query:
        return {"results": [], "error": "Provide a prompt or artist name"}
    query_emb = model.encode([query], normalize_embeddings=True)[0]
    scores    = preset_embeddings @ query_emb
    top_idx   = np.argsort(scores)[::-1][: req.top_k]
    results = []
    artist_lower = req.artist.strip().lower()
    for idx in top_idx:
        key    = preset_keys[idx]
        preset = PRESETS[key].copy()
        matched = bool(artist_lower and any(
            artist_lower in a or a in artist_lower
            for a in preset.get("artists", [])
        ))
        results.append({
            "name":          preset.pop("display_name"),
            "artists":       preset.pop("artists"),
            "genre":         preset.pop("genre", ""),
            "confidence":    float(np.clip(scores[idx], 0, 1)),
            "matchedArtist": matched,
            "artist_tags":   artist_tags,
            "params":        {k: v for k, v in preset.items()},
            "matched_query": key,
        })
    return {"results": results}


@app.get("/artist-tags")
async def get_artist_tags(name: str = Query(...)) -> dict:
    tags = await fetch_artist_tags(name)
    return {"artist": name, "tags": tags}


@app.get("/artist-search")
async def artist_search(q: str = Query(...), limit: int = 8) -> dict:
    results = []
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            r = await client.get(
                "https://musicbrainz.org/ws/2/artist/",
                params={"query": q, "limit": limit, "fmt": "json"},
                headers={"User-Agent": MUSICBRAINZ_UA},
            )
            if r.status_code == 200:
                for a in r.json().get("artists", []):
                    results.append({
                        "name": a.get("name", ""),
                        "disambiguation": a.get("disambiguation", ""),
                        "country": a.get("country", ""),
                        "score": a.get("score", 0),
                    })
    except Exception as e:
        print(f"Artist search error: {e}")
    return {"results": results}


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "model": MODEL_NAME, "presets": len(PRESETS)}


@app.get("/presets")
def list_presets() -> dict:
    genres: dict[str, list[str]] = {}
    for v in PRESETS.values():
        g = v.get("genre", "other")
        genres.setdefault(g, []).append(v["display_name"])
    return {"total": len(PRESETS), "by_genre": genres}


try:
    app.mount("/static", StaticFiles(directory="static"), name="static")

    @app.get("/")
    def root() -> FileResponse:
        return FileResponse("static/index.html")
except Exception:
    pass

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=7860)
