# "Why You Can't Tickle Yourself": build brief (shared by all agents)

This is a ~51 s vertical cartoon short (TOTAL 1530 frames, 30 fps). The final render is 2K (1440x2560), so detail must
hold at 2K. It is the next in our series of funny science shorts:
- "Astronauts Can't Burp" (src/videos/burp/*)
- "Why We Say Ow" (src/videos/ouch/*)

Use those for QUALITY and TECHNIQUE only. The user said: build EVERYTHING NEW, reuse nothing, make it really good, take
your time. So: new sets, new character designs and outfits, new props, new looks. Do not copy their geometry or
drawings.

The target: insanely good graphics, so good you'd think it was a lie, and a hook EVERYONE watches. ZERO glitches, because
it renders unattended. Backgrounds must NOT be blurry.

House style: flat bean-head characters (Canvas2D cards) in a colourful, contrasty, painted 3D world with black ink
outlines. It must be family-friendly. Use our own staging only.

## THE 4 RULES (the user's, binding)
1. SCRIPT: a strange fact in line one. No intro. It climbs to one twist.
2. CAMERA: very few cuts. Travel, LAND, then say the important word while the camera is still.
3. LIGHT: low sun, long shadows, blue shade, haze. The light CHANGES when the story turns (LOOK_RAMPS).
4. FACES: one feeling per line. The big meme face appears ONLY at the peak (shot 5, "it tickled.": hysterical
   laughter).

## Read first
- Script + facts + word timings: /home/user/tickle-short/SCRIPT.md and /home/user/tickle-short/voice/words.json
- Timeline + contracts: src/videos/tickle/story.ts. It holds:
  - SHOTS, with the beats in comments
  - places HOME, LAB, RIG
  - W cues and LOOK_RAMPS
  - state functions: selfTickleAt, brainAt, robotAt, slowBotAt
  - Key everything off W and the state functions. Never hard-code seconds.
- Orchestrator: src/videos/tickle/world.ts. It calls Sets, Brain and Props update(id,t,f,cam), then draws the castAt
  cards.
- Composition: Tickle.tsx (captions plus the Bean Stories watermark, top-left, ~y 150-215 px; keep your important
  content clear of it).
- Technique references (READ-ONLY):
  - src/videos/ouch/* (sets.ts own light shader, haze shafts, auto-hide faces toward the camera; props.ts the glowing
    X-ray; cast.ts + fx.ts)
  - src/videos/burp/*
- Library (READ-ONLY): src/videos/bridge/*.
- Best finished frames: /home/user/remotion-demo/out/ou/m/*.jpg, /home/user/remotion-demo/out/bu/m/*.jpg

## Ownership
Edit ONLY your own files, in your own sandbox: src/sandboxes/ti_<name>/videos/tickle/

### sets: sets.ts + looks.ts
**HOME** (brand-new design): BEAN's cosy living room in the early-morning golden hour.
- a big window throwing low sun stripes and a haze shaft
- a squashy armchair at HOME+(-1.6,0,-0.3) (outro)
- a rug, bookshelves, plants, a floor lamp, a TV cabinet, posters, a cat bed
- floor y=0, back wall z=-1.4, side walls x=±3.2, the camera side (+z) open
- in "xray" the room dims to deep blue

**LAB** (brand new): a 1990s London neuroscience lab.
- beige computers, a CRT monitor with green text, cables, a whiteboard with brain diagrams, a window with blinds,
  shelves of binders
- a lab table, top y 0.78, centred at RIG, for the robot (props builds the robot)
- a stool for BEAN at LAB+(0,0,0.55); two scientists stand behind the table
- the "reveal" look: lights dim, a warm theatrical spotlight on the table
- the "peak" look: warm pink-gold punch

**Looks:** tune all 5 looks in looks.ts (morning, xray, lab, reveal, peak).

### brain: brain.ts
The X-RAY BRAIN hologram, drawn over BEAN's head per brainAt(id,t): shot 2 at HOME, shot 6 at LAB.
- a glowing cyan cartoon brain
- the CEREBELLUM lights up (gold) with a label "CEREBELLUM" (brainAt.cereb)
- a "FORECAST" thought card showing a little hand + a "TICKLE 98%" forecast (brainAt.forecast)
- a big VOLUME knob/slider that turns the feeling DOWN (brainAt.volume)
- the brain smugly stamps "SEEN IT!" (brainAt.knows)
- shot 6: the brain panting and sweating with a "LOADING..." spinner (brainAt.panting)
- must read instantly on a phone
- anchor to the cast owner's BEAN head (default head centre HOME+(0,1.45,0) / LAB+(0,1.3,0.55) seated)
- export brainPos

### props: props.ts
**The TICKLE ROBOT rig on RIG** (robotAt):
- a 1990s robot: grey metal arms, cables, a joystick handle for BEAN's left hand
- a second arm with a soft yellow foam tip that strokes his right palm (robotAt.run / phase / tickle)
- a big chunky DELAY dial with a needle (0 → 0.3 s) and a CRT showing "DELAY: 0.20 s" (robotAt.delay)
- a sheet that whips off on the reveal (robotAt.sheet)

**The little SLOW ROBOT at HOME** for the outro (slowBotAt): a cute tiny wind-up robot with a feather that creeps to
BEAN's armchair.

**Export** hand / palm / foam-tip positions so the cast can align.

### cast: cast.ts + fx.ts
All characters are Canvas2D cards in our Pen style, as brand-new designs.

**BEAN** (new look: cosy pyjamas or a hoodie, bed hair):
- shot 1: wiggles his fingers at his own ribs, stone-faced (selfTickleAt); "Nothing, right?" shrug; taps his head
  on "brain"
- shot 2: deadpan as his own fingers come for his ribs
- shots 3-6: on the stool at the robot, left hand on the handle, right palm up under the foam tip. Bored at first,
  then THE MEME FACE at the peak: hysterical laughter, tears, kicking feet, face red, hair standing up. Iconic, the
  screenshot moment.
- shot 7: in the armchair, a happy giggle when the slow robot tickles him

**Two British scientists** (1990s: lab coats, one with big glasses and a cardigan, one with a beard):
- the sheet reveal (shot 3)
- one turns the DELAY dial (shot 4)
- they take notes and are amazed at the peak

**FX:**
- tickle squiggle lines
- "HAHA" bursts
- tears of laughter
- "?" / "!" pops
- sparkles
- motion lines

Expressions land 0-3 frames before their word.

### cam: (second wave) story.ts camera + transitions only.

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
  cd /home/user/remotion-demo && npx tsc --noEmit 2>&1 | grep "sandboxes/ti_<name>" | grep -v TS6133
  ```
- **Stills:** CPU is shared, so be frugal: use `nice -n 5` and render ≤ 8 frames per call.
  ```
  cd /home/user/remotion-demo && REMOTION_TMP=/home/user/remotion-tmp BRIDGE_ENTRY=src/sandboxes/ti_<name>/index.tsx \
    COMP=TickleShort PROPS='{"noCaptions":true}' nice -n 5 node scripts/bridge-stills.mjs out/ti/<name>/x_ <frames> 0.5
  ```
  Use a temporary DEBUG camera of your own if the first-pass cameras don't show your work, but turn it OFF before
  reporting.
- **Frames:** hook 30, 140, 200, 240 | xray 300, 340, 380, 440, 520, 590, 650 | reveal 700, 783 | test 830, 880, 960, 1040, 1100 | PEAK 1140, 1180, 1250 | brain 1325 | outro 1400, 1452, 1500.
- **Budget:** about 90 min (the user said: take your time, make it really good). Then typecheck and reply with a report of ≤ 200 words covering:
  - what you built
  - still paths
  - the exact positions/contracts for the others

