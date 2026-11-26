# "Your Voice on Recordings": build brief (shared by all agents)

## About the short
- Length: a SHORT 40 s vertical cartoon (TOTAL 1200 frames, 30 fps).
- Final render: 2K (1440x2560), rendered in the cloud.
- Goal (the owner's growth plan): short, relatable comment-bait. People should react with "NO WAY".
- References: our latest shorts, src/videos/hiccup, sneeze and tickle. Use them for TECHNIQUE only. Design everything
  NEW and make the quality even better.
- ZERO glitches: it renders unattended.
- Backgrounds must NOT be blurry.
- House style: flat bean-head characters (Canvas2D cards) in a colourful, contrasty, painted 3D world with black ink
  outlines. Family-friendly.

## THE 4 RULES (the owner's, binding)
1. SCRIPT: a strange fact in line one, no intro. It climbs to one twist: you rate your own voice the highest.
2. CAMERA: very few cuts. Travel, LAND, then say the important word while still.
3. LIGHT: low sun, long shadows, blue shade, haze. The light CHANGES when the story turns.
4. FACES: one feeling per line. The big meme face ONLY at the peak (shot 4: BEAN in love with his own voice).

## Read first
- Script + facts + word timings: /home/user/voice-short/SCRIPT.md, /home/user/voice-short/voice/words.json
- Timeline + contracts: src/videos/voice/story.ts. It has:
  - SHOTS, with the beats in comments
  - the places ROOM and LAB
  - W cues and LOOK_RAMPS
  - state functions phoneAt, xrayAt, micAt, ratingAt, RATING_BASE
  - Key everything off these. Never hard-code seconds.
- world.ts calls Sets, Holo and Props update(id,t,f,cam), then draws the castAt cards. The composition is Voice.tsx
  (captions + the watermark top-left, at about y 150-215 px).
- Technique references (READ-ONLY): src/videos/hiccup/*, src/videos/sneeze/*, src/videos/tickle/*.
  Library: src/videos/bridge/*
- Best frames: /home/user/remotion-demo/out/hi/review/*.jpg, /home/user/remotion-demo/out/sn/m/*.jpg

## Ownership
Edit ONLY your files, in your own sandbox src/sandboxes/vo_<name>/videos/voice/.

### sets: sets.ts + looks.ts
**ROOM:** BEAN's cosy bedroom at golden-hour sunset.
- A window with low sun stripes and a haze shaft.
- Bed with a duvet, a desk with a laptop and a ring light, band posters, fairy lights, plants, a guitar.
- A wall spot for a BABY PHOTO frame (micAt.life fades in a funny baby-BEAN photo).
- Floor y=0, back wall z=-1.4. BEAN stands at ROOM+(0,0,0). Keep room around him for a crowd of 5 people + a cat in
  shot 3.
- In "xray" the room drops to deep blue.

**LAB (2013):**
- A padded LISTENING BOOTH: foam walls, a desk at top y 0.76 with a tablet, a stool for BEAN at LAB+(0,0,0.4).
- A big wall RATING BOARD behind at LAB+(0,1.9,-1.5) with 6 bars A..F. Bars are driven by ratingAt.bars; D is "???"
  until ratingAt.own, then glows gold with a crown.
- A window with blinds. A researcher's spot at LAB+(1.2,0,-0.5).

**Looks:** tune all 4 looks (room, xray, lab, peak) per RULE 3.

### holo: holo.ts
The science overlays, per xrayAt. They must read instantly on a phone.
- Shot 2: a big glowing SIDE-VIEW X-RAY HEAD of BEAN, with mouth, skull, inner ear and an EAR label.
  - The AIR path: blue sound rings leaving the mouth and curving around to the outer ear. Label "AIR".
  - The BONE path: orange vibrations travelling through the jaw and skull straight to the inner ear. Label "BONE".
  - "x2 / YOU HEAR YOURSELF TWICE" on xrayAt.twice.
  - On xrayAt.deep a little waveform at the ear turns big and BASSY, with a "DEEPER" tag.
  - Anchor to BEAN's head (default head ROOM+(0,1.45,0)).
- Shot 3: the MICROPHONE's capture: only the blue air rings go into the mic (micAt.catch), and a thin waveform shows on
  a "REC" panel.
- Export positions.

### props: props.ts
- BEAN's phone, with a voice-memo app screen: play button, a waveform that animates per phoneAt.play, and a squeaky
  "hello" bubble drawn as a card on the phone.
- A big retro chrome studio MICROPHONE on a stand that slides in per micAt.mic.
- Big over-ear headphones for the lab (on BEAN's head in shot 4).
- The tablet with A-F rating sliders.
- Export hand / head positions for cast to align to.

### cast: cast.ts + fx.ts
All characters are Canvas2D cards, all NEW.
- BEAN, in a hoodie with headphones around his neck.
- The CROWD that "has heard it your whole life": Mum, Dad, best friend, a teacher, a grandma, and the cat, all
  nodding "yep".
- The sly RESEARCHER (lab coat, clipboard).
- Expressions, one per line:
  - horrified at "recordings"
  - dread at "Bad news."
  - defeated at "real you."
  - curious during the x-ray
  - shocked at "your whole life" when the crowd appears
- THE MEME FACE only at the peak, "higher than everyone else's": BEAN smitten with his own voice (heart eyes,
  blushing, hugging himself). Iconic.
- Outro: shy warm smile.
- FX: hearts, "!", "?", sweat, sparkles, motion lines, a "YEP" bubble.
- Exports: headAt, mouthAt, handAt.

### cam: second wave. Edits story.ts camera + transitions only.
- 1→2: an X-ray scan sweep.
- 2→3: pull out of the head to the mic.
- 3→4: a whip to the lab.
- 4→5: a match on BEAN's face.

## Rules (zero glitches)
- **No pops:** nothing pops within a visible frame. Scale or fade things in.
- **Camera clearance:** no camera inside geometry or within 0.6 m of a card.
- **No z-fighting:** no coplanar surfaces.
- **Transparent effects:** put them on NOINK.
- **Deterministic:** pure functions of (id,t), seeded randomness only.
- **No bounding-sphere culling** on important meshes.
- **Performance:**
  - merge static geometry
  - instance repeats
  - textures ≤ 2048
  - keep frames fast (CPU renderer)
- **Typecheck:**
  ```
  cd /home/user/remotion-demo && npx tsc --noEmit 2>&1 | grep "sandboxes/vo_<name>" | grep -v TS6133
  ```
- **Stills:** CPU is shared, so be frugal: use `nice -n 5` and render ≤ 8 frames per call.
  ```
  cd /home/user/remotion-demo && REMOTION_TMP=/home/user/remotion-tmp BRIDGE_ENTRY=src/sandboxes/vo_<name>/index.tsx \
    COMP=VoiceShort PROPS='{"noCaptions":true}' nice -n 5 node scripts/bridge-stills.mjs out/vo/<name>/x_ <frames> 0.5
  ```
  Use a temporary DEBUG camera of your own if the first-pass cameras don't show your work, but turn it OFF before
  reporting.
- **Frames:** hook 10, 50, 120 | xray 200, 260, 330, 430, 470, 500 | mic 560, 585, 650, 690, 725 | lab 790, 830, 880, 940, 970, 1010, 1040 | outro 1090, 1130, 1190.
- **Budget:** about 90 min (the user said: take your time, make it really good). Then typecheck and reply with a report of ≤ 200 words covering:
  - what you built
  - still paths
  - the exact positions/contracts for the others

