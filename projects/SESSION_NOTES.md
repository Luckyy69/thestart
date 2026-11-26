# Bean Stories: production notes (how every short is made)

## Channel rules (from the owner)
- English narration, voice "Liam" (ElevenLabs TX3LPaxmHKxFdv7VOQHJ, speed ~1.08-1.1); key stored as an environment
  network secret, never in code.
- Final render 2K (1440x2560, `--scale=1.3333333333333333`), 30 fps, chunked + resumable (projects/run*.sh).
- THE 4 RULES: 1 strange fact in line one, climb to one twist; 2 very few cuts: travel, LAND, say the key word while
  still; 3 low sun, long shadows, blue shade, haze, the light changes when the story turns; 4 one feeling per line,
  the big meme face only at the peak.
- Backgrounds must NOT be blurry (lens gain 0.8, DOF cInf <= 1.5).
- Funny + catchy; cool transitions (whip-pans, push into a head -> out somewhere else).
- WATERMARK on every video from "Why We Say Ow" on: src/videos/common/Watermark.tsx (top-left logo + BEAN STORIES),
  logo in public/bean_logo_256.png. Add `<Watermark />` after `<Captions />` in each composition.
- Zero glitches: stills every ~10 frames, burst checks at every key word + transition, 3-way merged QA agents,
  per-chunk short_qa.py (scripts/qachunk.sh) during the render.

## Pipeline
1. Research facts (sources in projects/<name>-short/SCRIPT.md) -> script -> voice/tts.py -> words.json.
2. Skeleton in src/videos/<name>/: story.ts (SHOTS, W cues, state fns, camera), world.ts, looks.ts, <Name>.tsx, voice.ts.
3. Brief (projects/briefs/*_BRIEF.md) -> 4 build agents in src/sandboxes/<prefix>_<owner>/ (sets, world/looks, props,
   cast+fx) -> merge -> camera agent -> 3 QA+fix agents (3-way merge with git merge-file) -> stills check.
4. Audio: projects/<name>-short/audio/build.py (numpy synth: score + SFX + ducked voice, -15 LUFS).
5. Render: projects/run<name>.sh (detached with setsid nohup), QA each chunk, deliver + thumbnail
   (projects/branding/thumb_*.html + shot_thumb.js).

## Videos
- the_war_australia_lost_to_birds_2k (EmuShort), astronauts_cant_burp_2k (BurpShort), why_we_say_ow_2k (OuchShort),
  plus the earlier bridge / gimli / apollo / miners shorts.

## Thumbnail style (owner's rule, from the sneeze short on)
CLEAN: one clean frame of the main character (no effect cards, captions or watermark: PROPS noCaptions+noWatermark),
a single 2-3 line headline at the top (white Inter Display 900, dark outline, ONE key word in yellow #ffcf3a), a dark
gradient behind the headline, small "BEAN STORIES" bottom-left. No subtitle, no bottom text, no extra stickers.
Template: projects/branding/thumb_sneeze2.html (render with shot_thumb.js).
