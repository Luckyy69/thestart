# "Rain Tires" (why fingers wrinkle in the bath): build brief (shared by all agents)

This is a SHORT vertical cartoon short: 39 s, TOTAL 1170 frames at 30 fps. The final render is 2K (1440x2560), done in
the cloud. The owner asked: "make it insanely good AND funny". Our last shorts were body/relatable topics and they are
our best performers.

Use our latest shorts (src/videos/jerk, voice, hiccup) for TECHNIQUE only. Design everything NEW and make the quality
even better.

Requirements:
- ZERO glitches. It renders unattended.
- Backgrounds must NOT be blurry.
- House style: flat bean-head characters (Canvas2D cards) in a colourful, contrasty, painted 3D world with black ink
  outlines.
- Family-friendly. BEAN is in a bath, so keep it cute: foam up to the chest, no nudity issues.

## THE 4 RULES (the owner's, binding)
1. SCRIPT: a strange fact in line one: "not water soaking in, it's your brain putting on rain tires". It climbs to one
   twist: the nerve does it ON PURPOSE → grip → "rain mode".
2. CAMERA: very few cuts. Travel, LAND, then say the important word while still.
3. LIGHT: a low sun, long shadows, blue shade, haze. The light CHANGES when the story turns: warm golden bath → cold
   electric X-ray on "on purpose" → a stormy prehistoric rain with a low sun breaking through.
4. FACES: one feeling per line. The big meme face appears ONLY at the peak: shot 4 "faster", the SMOOTH-finger
   contestant fumbling every wet marble.

## Read first
- Script, facts and timings: /home/user/wrinkle-short/SCRIPT.md and /home/user/wrinkle-short/voice/words.json
- Timeline and contracts: src/videos/wrinkle/story.ts. It has:
  - SHOTS, with the beats in the comments
  - the places BATH, LAB, MICRO and CLIFF
  - W cues and LOOK_RAMPS
  - the state functions pruneAt, hookAt, holoAt (SNIP_FINGER), microAt, labAt (MARBLES), cliffAt, endAt
  Key everything off these. Never hard-code seconds.
- world.ts calls Sets, Holo, Micro, Cliff and Props update(id,t,f,cam), then draws the castAt cards. The composition
  is Wrinkle.tsx (captions + the watermark top-left at about y 150-215 px; the captions sit at ~70% of the frame
  height).
- Technique references (READ-ONLY): src/videos/jerk/* (the newest; its sets.ts has a superb room shader rig; holo.ts
  an X-ray hologram; jungle.ts a painted outdoor set; cast.ts + fx.ts the card characters), src/videos/voice/*,
  src/videos/hiccup/*. Library: src/videos/bridge/*.
- Best recent frames: /home/user/remotion-demo/out/je/cam/kw1_*.jpg, kw2_*.jpg and out/je/qa2/*.jpg

## Ownership
Edit ONLY your own files, in your sandbox: src/sandboxes/wr_<name>/videos/wrinkle/

### sets: sets.ts + props.ts
**BATH (shots 1, 2 background, 6):**
- A cute bathroom at a low golden late-afternoon sun through a frosted window: the light rakes in and long warm
  shadows fall over the tiles, with blue shade and steam haze.
- A big clawfoot tub along x (rim y≈0.62) full of thick FOAM (puffy, slowly breathing). BEAN sits in it at about
  BATH+(0,0.35,0) facing +z, chest-deep in foam. Leave the card space; the cast owner draws BEAN. Agree positions.
- Dressing: tiles, a rubber duck that bobs, shampoo bottles (no brands), a towel on a rail, a bath mat, a plant, a
  mirror with fog.
- Shot 6: rain streaks on the window (the callback to the ancestors' rain) while the sun is still low.
- Keep ~3 m open in front of the tub (+z) for cameras.

**LAB (shot 4):** a cosy science lab table seen from the front, for a race:
- two contestants seated side by side, SMOOTH on the left and WRINKLY on the right (cast cards, behind the table)
- each has a bowl of water full of glossy MARBLES (instanced) and an empty bowl
- a big stopwatch and a banner "WET MARBLE CHALLENGE"
- warm low window light and blue shade
- The marbles move per labAt (wrinkly/smooth counts). Marbles in flight are carried by the hands that cast reports.
- At fumble, the SMOOTH side's marbles squirt everywhere and bounce around the table: cartoon chaos, deterministic.

**Props:**
- the rubber duck
- the SOAP BAR for shot 6: it squirts around the foam, then BEAN grabs it on endAt.grab, at a hand position cast
  gives you
- a trophy for WRINKLY at labAt.win (or cast draws it; agree)

### micro: micro.ts + looks.ts
**MICRO (shot 3)**, inside a fingertip at giant scale (surface around MICRO y 4, a ~20 m wide view). It is a pink-peach
skin landscape with fingerprint ridges and a waxy sheen.

The cutaway shows, under the surface:
- fat red BLOOD VESSEL tubes, with blood cells flowing
- a glowing yellow NERVE with cute little hands wrapped around the vessels

Per microAt:
- wet: water drops land on the skin
- squeeze: the nerve hands squeeze and the vessels narrow and darken; a "SQUEEZE" pulse travels along the nerve
- shrink: the skin landscape sinks
- fold: it FOLDS into big deep grooves (an animated vertex deformation)
- tire: a giant cartoon TIRE rolls in alongside with the SAME groove pattern, and the grooves line up visually on
  "tread"

It must read instantly at phone size. Use a low warm light with haze; the vessels glow.

**Looks:** tune all 7 looks (bath, xray, micro, lab, peak, rain, bathend) to RULE 3.
- bath and bathend: low golden sun with blue shade.
- xray: cold electric blue.
- micro: warm pink with a rim light.
- lab: golden.
- peak: a hot punch, ramped from lab over frames 772-782.
- rain: a dark blue storm with a low gold sun breaking through, so sunDisc is visible.

### cliff: cliff.ts
**CLIFF (shot 5):** a prehistoric riverbank cliff in a RAINSTORM at a low sun breaking through:
- wet shiny mossy rocks (specular streaks)
- a slick branch reaching out over a rushing river
- ferns, distant misty hills, a giant tortoise or a curious dino far away for fun
- heavy rain streaks (NOINK, deterministic, instanced), splashes, puddle ripples, and a rainbow hint where the sun
  breaks through

ANCESTOR BEAN (a cast card) climbs the rock face (cliffAt.climb), slips (slip), GRIPS (grip), then swings onto the
branch (swing). Give the cast owner the exact hold points (HOLD_A, HOLD_B, BRANCH_POS).

### holo: holo.ts
**The shot-2 X-ray HAND hologram**, pinned at BEAN's raised hand position in the bath (agree with cast; it fills the
frame like the jerk X-ray did). It is a big glowing cyan hand outline with cartoon finger bones and a glowing yellow
NERVE running to each of the 5 fingertips.

Per holoAt:
- show: a scan sweep.
- nerves: the nerves light up.
- snip: a cartoon SCISSORS snips finger SNIP_FINGER's nerve. The nerve goes dark with a little spark, and a "SNIP!"
  label appears.
- wrinkle: the other 4 fingertips wrinkle (animated grooves on the tips, a "WRINKLY" ✓); the snipped one stays smooth
  and shiny ("SMOOTH?!" label).
- stamp: a big red "ON PURPOSE!" rubber stamp slams in. This is the turn; pair it with the light change.

### cast: cast.ts + fx.ts
All characters as Canvas2D cards (the jerk cast.ts/fx.ts style, but all NEW drawings).

**BEAN in the bath** (shots 1, 2, 6): chest-deep in foam, with a little foam beard/hat option.
- Hands: a giant PRUNEY hand held up to the lens in the hook. The wrinkly fingertips must read at phone size: deep
  grooves.
- Shot 1:
  - "Your wrinkly bath fingers?": staring at his fingers, horrified.
  - "not water soaking in": a water DROP bounces off a fingertip (hookAt.drop), he's puzzled.
  - "brain... rain tires" (hookAt.bubble/swap): a THOUGHT BUBBLE with his little BRAIN in a pit-crew cap swapping a
    smooth tire for a grooved rain tire (a mini pit-stop, very funny).
  - "Here's the weird part": he leans in, curious.
- Shot 2: BEAN's surprised "!" face on "on purpose".
- Shot 6 (endAt):
  - "stuck in the bath": bored, chin in the foam
  - "hands aren't ruined": he looks at his hands, worried
  - "rain mode": a dashboard badge "RAIN MODE: ON" with a tire icon pops over his hand
  - he snatches the slippery soap (grab), smug, eyebrows up; hold to the end

**LAB contestants** (shot 4):
- SMOOTH: shiny smooth fingers, sweaty, fumbling.
- WRINKLY: pruney fingers, focused, a sports headband.
- A referee/scientist bean with a clipboard.
- On "faster" (W.faster): THE MEME FACE (the only one) on SMOOTH: bulging eyes, mouth wide, marbles squirting from
  his hands. WRINKLY zooms with speed lines, then wins (labAt.win) with a trophy and a little confetti.

**ANCESTOR BEAN** (shot 5): a caveman bean with a fur outfit and wild hair, soaked in the rain.
- Climbs, slips: a scared face.
- "grip": his PRUNEY fingers clamp onto the rock. Add tire SCREECH lines and a little "GRIP!" label.
- Swings onto the branch: relieved, then a cheeky grin.

**FX cards:** water drops, splashes, speed lines, "!" "?", sweat, sparkles, confetti, screech lines, labels.

Expressions land 0-3 frames before their word.

### cam (second wave): story.ts camera + transitions only

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
  cd /home/user/remotion-demo && npx tsc --noEmit 2>&1 | grep "sandboxes/wr_<name>" | grep -v TS6133
  ```
- **Stills:** CPU is shared by 5 agents, so be frugal: use `nice -n 5` and render ≤ 8 frames per call.
  ```
  cd /home/user/remotion-demo && REMOTION_TMP=/home/user/remotion-tmp BRIDGE_ENTRY=src/sandboxes/wr_<name>/index.tsx \
    COMP=WrinkleShort PROPS='{"noCaptions":true}' nice -n 5 node scripts/bridge-stills.mjs out/wr/<name>/x_ <frames> 0.5
  ```
  Use a temporary DEBUG camera of your own if the first-pass cameras don't show your work, but turn it OFF before
  reporting.
- **Frames:**

  | Beat | Frames |
  |---|---|
  | hook | 15, 70, 125, 150, 195 |
  | xray | 230, 250, 270, 310, 340, 390 |
  | micro | 440, 475, 530, 580, 615, 670 |
  | lab | 720, 760, 778, 800, 830 |
  | cliff | 860, 890, 898, 930, 955 |
  | outro | 995, 1045, 1090, 1110, 1165 |
- **Budget:** about 90 min. Then typecheck and reply with a report of ≤ 200 words covering:
  - what you built
  - still paths
  - the exact positions/contracts for the others
