# "Why We Say Ow": build brief (shared by all agents)

This is a ~62 s vertical cartoon short. Like our hit "Astronauts Can't Burp" (src/videos/burp/*, the best reference for EVERYTHING: quality, cards, holograms, fx, light), it explains a funny science fact. The final render is 2K (1440x2560), so detail must hold at 2K. The user wants it
"so good you'd think it was a lie", with a hook so strong that EVERYONE wants to keep watching. It must also have ZERO
glitches, because it renders unattended.

The house style is the same as our previous shorts: flat bean-head characters (cards) in a colourful, contrasty, painted
3D world with black ink outlines. Depth blur stays mild, so backgrounds remain readable. Use our own staging only. Never
copy anyone's stories, characters, shots or text. Use no real brand logos. Everything must be family-friendly: swearing is ONLY shown as a black censor bar + grawlix symbols ("#@$%!") + a BEEP, never a real word.

## THE 4 RULES (the user's, binding)
1. SCRIPT: a strange fact in line one, no intro. The story climbs to one twist.
2. CAMERA: very few cuts. The camera travels, LANDS, and the important word is said while it is still.
3. LIGHT: low sun, long shadows, blue shade, haze. The light CHANGES when the story turns.
4. FACES: one feeling per line. The big meme face appears ONLY at the peak (shot 6, "Swearing.").

## Read first
- Script, facts and word timings: /home/user/ouch-short/SCRIPT.md and /home/user/ouch-short/voice/words.json. NOTE: the
  voice-over may be re-recorded, which would shift the timings, so key EVERYTHING off the W cues and state functions in
  story.ts. Never hard-code seconds.
- Timeline and contracts: src/videos/ouch/story.ts. This file has:
  - SHOTS, with the beats in comments
  - the places HOME, GLOBE, LAB, plus TUB_A/TUB_B
  - W word cues, and LOOK_RAMPS (smooth light turns)
  - state functions: stubAt, signalAt, COUNTRIES, planetAt, labAt, BEEPS
- Orchestrator: src/videos/ouch/world.ts. It calls Sets, Globe and Props update(id,t,f,cam), then draws the castAt cards.
  Composition: Ouch.tsx.
- Best examples (READ-ONLY): src/videos/burp/* (the latest and best), src/videos/emu/*, src/videos/miners/*.
  Library (READ-ONLY): src/videos/bridge/*.
- Our best finished frames: /home/user/remotion-demo/out/bu/m/*.jpg, /home/user/remotion-demo/out/bu/cam/sheet_*.jpg,
  /home/user/branding/burp_*.jpg

## Ownership
Edit ONLY your files, in your sandbox src/sandboxes/ou_<name>/videos/ouch/.

### sets: sets.ts
**HOME:** a cosy hallway at early-morning golden hour.
- warm wooden floor with a rug
- the SIDE TABLE with a sturdy leg at HOME+(0.35,0,0): BEAN stubs his right toe on that leg
- coat hooks, framed pictures, a plant, a light switch, a doorway
- a window that throws long low sun stripes across the floor and walls (haze shaft, NOINK)
- back wall z=-1.2, side walls x=±3, camera side (+z) open
- In "xray" the room should read dark blue (LOOK_RAMPS handles the light). You may also dim or desaturate set emissives
  by shot.

**LAB:** a university pain lab (2015-ish).
- two ice-water tubs (clear acrylic boxes of icy water with floating ice cubes, frost, cold mist NOINK) at
  TUB_A=LAB+(-0.7,0,0) and TUB_B=LAB+(0.7,0,0) on a table
- a big wall SCORE SCREEN behind at LAB+(0,1.9,-1.6) with bars driven by labAt: barBase, barOw, barHear, barSwear,
  barFake, barSailor. Big readable labels and seconds counters.
- a bench with lab gear, posters, a window
- In "drama"/"peak" a red spotlight cone and red light. The room dims.

Show only the set needed per shot (SHOTS[id-1].place).

### globe: globe.ts + looks.ts
**GLOBE:** a TINY PLANET of radius 6, centre GLOBE+(0,-6,0), like a cute toy world.
- Four country quarters at lon 0/90/180/270 (COUNTRIES):
  - UK/US: red phone box, a London-ish house
  - France: mini Eiffel tower, café
  - Spain: white house, orange tree
  - Denmark: colourful Nyhavn-style houses, a windmill
- Each quarter has a little stub obstacle (a rock or step) where its person stands. Give the cast owner exact standing
  positions plus the "up" normal.
- Plus: oceans, trees, clouds on sticks, and a low sun raking across with a terminator, long shadows and a haze rim.
- Extras (planetAt.many, many): little speech bubbles from all over the planet, and a big "AH" sound wave ring (planetAt.ah).

**Looks:** tune all 6 looks in looks.ts (morning, xray, planet, lab, drama, peak) for RULE 3.

### props: props.ts
- **X-RAY nerve signal (shot 2):** a glowing cyan holographic skeleton/nerve line overlay along BEAN's leg, spine and
  neck to a glowing cartoon BRAIN at his head. The signal pulse travels by signalAt.p, the brain flashes on
  signalAt.brain, and it all fades in by signalAt.show. Anchor to the cast owner's BEAN pose (default: BEAN stands at
  HOME+(stubAt.x,0,0), toe at +(0.3,0.05,0.1), head ~1.45 m). Export helpers (toePos, brainPos) so the others align.
- **BEAN's coffee mug** (+ splash on the stub).
- **Lab:** stopwatches on the tubs, headphones for the "hearing" volunteer, the scientist's clipboard.
- **CENSOR BAR:** a black bar over a mouth with grawlix "#@$%!" chars popping out, on BEEPS. Use the cast owner's
  mouthAt helper, or export censorAt(who) that the cast can position.

### cast: cast.ts + fx.ts
All characters are Canvas2D cards in our Pen style (like burp/cast.ts).

**BEAN** (pyjamas or a hoodie, slippers, bed hair, coffee mug):
- Shot 1: stubAt drives him: walking → hit → hop on one foot holding the toe, and a dramatic over-the-top "OW!" with a
  comic "OW!" text burst. The narration calls the brain "a little dramatic", so overact: a theatrical faint-pose.
- Shot 2: frozen mid-hop for the X-ray.
- Shot 8: the callback. He stubs again, his face goes red, and on BEEPS (bean) the censor bar covers his mouth.

**Shot 3 (tiny planet):** four people, one per country, in local outfits: a UK/US person, a French person with a beret,
a Spanish person, a Danish person. Each stubs a toe on their word and shouts their bubble (OW!/AÏE!/¡AY!/AV!).

**LAB:**
- A scientist (Singapore), with a sly "mean" grin on "mean".
- Volunteers with a hand in the ice: shivering, blue fingers. One says "OW" (bubble).
- The "hearing" volunteer wears headphones, no gain, and looks deadpan.
- A second scientist for the turn.
- THE SWEARER volunteer at the peak: THE MEME FACE, the only one in the film. Iconic and hilarious, eyes bulging,
  steam, censor bar plus grawlix and BEEP.
- The "FOUCH!" volunteer (the bubble fizzles).
- The grumpy salty sailor type who swears all day (tiny bar, bored).

**FX:**
- OW bursts and speech bubbles
- grawlix
- shiver lines and cold mist puffs
- sweat
- stars-around-head
- tears
- "!" and "?" pops

Expressions land 0-3 frames before their word, one feeling per line.

### cam: (second wave) story.ts camera keys + dofAt + TRANSITIONS only.
The user wants "fede transitions": whip-pans and match moves between shots, for example zooming into BEAN's brain into the
globe, or a whip-pan into the lab. Our signature style.

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
  cd /home/user/remotion-demo && npx tsc --noEmit 2>&1 | grep "sandboxes/ou_<name>" | grep -v TS6133
  ```
- **Stills:** CPU is shared, so be frugal: use `nice -n 5` and render ≤ 8 frames per call.
  ```
  cd /home/user/remotion-demo && REMOTION_TMP=/home/user/remotion-tmp BRIDGE_ENTRY=src/sandboxes/ou_<name>/index.tsx \
    COMP=OuchShort PROPS='{"noCaptions":true}' nice -n 5 node scripts/bridge-stills.mjs out/ou/<name>/x_ <frames> 0.5
  ```
  Use a temporary DEBUG camera of your own if the first-pass cameras don't show your work, but turn it OFF before
  reporting.
- **Frames:** hook 30, 70, 100, 150 | xray 260, 320, 400 | planet 470, 520, 560, 610, 700, 800 | lab 900, 960, 1100, 1220, 1280 | turn 1360 | PEAK 1412, 1440, 1500 | 1600, 1700 | callback 1810, 1860.
- **Budget:** about 60 min. Then typecheck and reply with a report of ≤ 200 words covering:
  - what you built
  - still paths
  - the exact positions/contracts for the others

## Channel rule (all future videos)
Every composition renders the Bean Stories WATERMARK (src/videos/common/Watermark.tsx) after the captions.
