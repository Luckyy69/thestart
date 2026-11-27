# "Bald Fur" (why we get goosebumps): build brief (shared by all agents)

This is a SHORT vertical cartoon short of 39 s: TOTAL is 1170 frames at 30 fps. The final render is 2K (1440x2560) and is
done in the cloud. The owner asked: "make it insanely good AND funny". The short is relatable.

Use our latest shorts (src/videos/wrinkle, jerk, sneeze, hiccup) for TECHNIQUE only. Design everything NEW and push the
quality even higher.

Requirements:
- ZERO glitches. The video renders unattended.
- Backgrounds must NOT be blurry.
- House style: flat bean-head characters (Canvas2D cards) in a colourful, contrasty, painted 3D world with black ink
  outlines.
- Family-friendly.

## THE 4 RULES (the owner's, binding)
1. **SCRIPT:** open on a strange fact in line one: "Goosebumps are your body trying to puff up fur you don't even
   have". The script then climbs to one twist: MUSIC presses the same button, so your body puffs up to look scary... for
   a song. It ends on "Very scary. Very bald."
2. **CAMERA:** very few cuts. Travel, LAND, then the important word is said while the camera is still.
3. **LIGHT:** a low sun, long shadows, blue shade and haze. The light CHANGES when the story turns:
   - a cold blue winter bus stop
   - warm peach skin
   - the bus stop in warmer light
   - a pale blue ice-age blizzard
   - a warm sunset bedroom
   - on "hits", the light ramps to a concert magenta/violet with hot gold (the peak)
   - dusk
4. **FACES:** one feeling per line. The big meme face appears ONLY at the peak: shot 5 "hits", BEAN on the bed with
   headphones. His eyes bulge, every hair stands up and his ghost fur EXPLODES.

## Read first
- Script, facts and timings: /home/user/goose-short/SCRIPT.md and /home/user/goose-short/voice/words.json
- Timeline and contracts live in src/videos/goose/story.ts:
  - SHOTS, with the beats in the comments
  - the places STREET, ROOM, SKIN and ICE, with their layout in the header comment
  - the W cues
  - LOOK_RAMPS and SUN_FROM
  - the state functions hookAt, skinAt, catAt, iceAt, roomAt and endAt

  Key everything off these. NEVER hard-code seconds.
- world.ts calls Sets, Skin, Ice and Props `.update(id,t,f,cam)`, then draws the castAt cards (Stage = places + fx).
- The composition is Goose.tsx, which draws the captions plus the watermark top-left at about y 150-215 px. Keep faces
  and key gags out of that corner and out of the caption band (about y 1150-1350 at 1080x1920).
- Technique references (READ-ONLY):
  - src/videos/wrinkle/* (the newest; best cards and sets)
  - src/videos/jerk/*
  - library: src/videos/bridge/*
- Best frames from the last short: /home/user/remotion-demo/out/wr/ (final stills)

## Ownership
Edit ONLY your own files, in your own sandbox at src/sandboxes/go_<name>/videos/goose/. You may ADD new files with your
own prefix. Do NOT edit story.ts. If you need a state value that story.ts lacks, derive it locally from W and tell the
lead in your report.

### sets: sets.ts + props.ts
**STREET:** a snowy little BUS STOP at a cold winter late afternoon.
- A glass shelter with its back panel at z -1.0 and its roof at y 2.3, spanning x -1.4..1.4. Snow lies on the roof.
- The roof has a clump that falls on catAt.plop: it plops onto the snow next to the cat at about STREET+(0.95,0,-0.5) and
  bursts into a little puff.
- A bench: seat at y 0.46, z -0.65.
- A bus-stop sign ("BUS 42"), a snowy kerb and street, street lamps (lit warm), little colourful houses with warm windows
  receding down the street, bare trees and a distant hill.
- The low sun is down the street. Long blue shadows lie across the snow.
- Falling snow: instanced and deterministic, on NOINK.

**ROOM:** BEAN's cosy bedroom at a warm low sunset.
- A bed along the back wall (z -1.4) with its mattress top at y 0.5. A big window on the left wall (x -2) lets the low
  sun rake across the room.
- Posters, a speaker, a plant, a rug, fairy lights (which pulse on the peak) and a desk.
- A standing MIRROR at ROOM+(1.35,0,-0.55), angled to face BEAN's outro spot ROOM+(0.35,0,-0.1). Put a flat light glass
  plane in it. The cast draws the reflection card just behind the glass. Export MIRROR_GLASS (centre, normal, w, h).
- A window sill at the left window where the CAT sits in the outro. Export CAT_SILL.

**props.ts:**
- BEAN's PHONE on the bed: it glows on roomAt.reveal and shows the cute song screen "♪ Little Duckling Lullaby".
- Headphones lying on the pillow before shot 5.
- Any small props.

Light your sets per look (see how wrinkle's sets.ts builds its shader rigs).

### skin: skin.ts
The SKIN landscape (shot 2) at SKIN, surface y 4, at giant scale. It must read INSTANTLY on a phone.
- Soft peach skin with pores and fine creases.
- 7-12 giant HAIRS: springy, slightly curved brown stalks about 5 m long, lying at about 25° (leaning) at the start.
- Each hair has a red ARRECTOR MUSCLE strap from its root down to the skin under it. On skinAt.muscle, one hero muscle
  near the camera glows and a label "TINY MUSCLE" appears.
- A glowing yellow NERVE network runs just under a translucent patch of the surface. It has little cartoon hands that
  hold every muscle.
  - On `nerve` it lights up.
  - On `pull` the hands YANK and the muscles contract (shorten and thicken).
  - On `stand` the hairs swing upright in a staggered wave with a springy overshoot.
  - On `bumps` the skin around each root DOMES up into big round bumps.
- On `cold`, giant snowflakes drift through (NOINK). On `scared`, a big scary shadow (a cartoon monster-hand silhouette)
  sweeps across the ground.
- A warm peach sky and haze. Export HERO_HAIR (root position) and HAIRS[] for the camera owner.

### ice: ice.ts + looks.ts
**ICE-AGE tundra** in a blizzard at a pale low sun:
- snowdrifts, a glacier wall, pine silhouettes, 2-3 distant woolly mammoths (simple, charming and ink-outlined)
- blowing snow streaks (NOINK)
- a low sun disc glowing through the snow

The ANCESTOR stands at ICE+(-0.6,0,0) and BEAN at ICE+(0.65,0,0.1). They are drawn by the cast.

Tune ALL 7 looks per RULE 3: street, skin, cat, ice, room, peak, roomend. LOOK_RAMPS blends room→peak at "hits" and
peak→roomend at the shot 5→6 switch, which uses a continuous camera. Shot 6 uses shot 5's sun (SUN_FROM).

### cast: cast.ts + fx.ts
All characters are Canvas2D cards, all NEW.

**BEAN:**
- STREET: a t-shirt and shorts, the only one in the snow not dressed for it, shivering.
- ICE: the same, shivering.
- ROOM: a hoodie and huge headphones.
- Shot 1:
  - Open CLOSE on his bare forearm: a big arm card. The bumps rise (hookAt.bumps) and tiny hairs spring up.
  - Then BEAN shivers, chattering teeth.
  - A dotted, translucent GHOST FUR outline (a huge fluffy fur coat silhouette) puffs out around him on `ghost`. He
    looks proud.
  - On `fizzle` it fizzles away into sparkles. He looks down at himself, `confused`.

**The CAT** (round, cute, grey-orange): sits on the bench.
- On `plop` it is startled.
- On `puff` it FLOOFS to 2x, with spiky round fur and a tail like a bottle brush.
- On `warm`, a cosy warm glow layer appears in the fur with little "warm air" puffs.
- On `ruler`, a "2x" size ruler card slides in beside it.
- On `pity` it gives BEAN a pitying look.

**BEAN's try** (shot 3):
- On `tryk` he strains (red face, fists).
- On `bumps` he gets just tiny bumps and a tiny "boop" label.

**The ANCESTOR** (shot 4): a cute, round, very furry early human with a stone-age vibe and a big red PUFF button on
its chest.
- On `floof` it becomes a MAJESTIC floof: giant fur, wind-blown, a heroic pose, sparkles.

**BEAN in shot 4:**
- On `button` he holds up the same big red button.
- On `press` he presses it.
- On `boing`, ONE tiny hair springs up on his arm ("boing" label) while the ancestor looks at him.

**ROOM** (shot 5):
- BEAN chilling on the bed.
- On `notes`, music notes float out of the headphones.
- On `press`, one note with a little hand presses a PUFF button that floats by his chest.
- On `hit`: THE MEME FACE (only here). Eyes bulging, mouth open, every hair on his arms standing, a spiky hair burst on
  his head, and a HUGE dotted ghost fur exploding around him.
- On `bear`, the ghost fur shapes into a scary BEAR silhouette (translucent, roaring) behind him.
- On `reveal`/`deflate` the bear sags and deflates. The phone (props) shows the cute song.

**ROOM** (shot 6):
- BEAN stands at ROOM+(0.35,0,-0.1) facing the mirror, 3/4 to the lens. On `rawr` he makes a "RAWR" claw pose.
- His REFLECTION card sits just behind the mirror glass: a bald, bumpy little BEAN making the same pose. On `bald`,
  little arrows point at the bumps.
- The CAT sits on the window sill (CAT_SILL from sets). On `blink` it does a slow pitying blink.

**FX:**
- shiver lines
- "brrr"
- snowflake cards
- music notes
- "!"
- sweat
- sparkles
- "BOOP"
- "BOING"
- "RAWR"
- "2x"
- labels

**Exports:** headAt, handAt.

### cam: second wave. story.ts camera + transitions only.
- 1→2: dive into his forearm skin. Push into a goosebump, and it dissolves into the giant skin.
- 2→3: rise out of the skin and pull back to the bus stop.
- 3→4: a snow-whiteout whoosh into the blizzard.
- 4→5: a whip into the bedroom.
- 5→6: continuous.

## Rules (zero glitches)
- **No pops:** nothing pops within a visible frame. Scale or fade things in.
- **Camera clearance:** the camera is never inside geometry and never within 0.6 m of a card.
- **No z-fighting:** no coplanar surfaces.
- **Transparent fx:** transparent effects go on NOINK.
- **Deterministic:** everything is a pure function of (id,t). Randomness must be seeded only.
- **No bounding-sphere culling** on important meshes.
- **Performance:**
  - Merge static geometry.
  - Instance repeats.
  - Textures ≤ 2048.
  - Keep frames fast (CPU renderer).
- **Typecheck:**
  ```
  cd /home/user/remotion-demo && npx tsc --noEmit 2>&1 | grep "sandboxes/go_<name>" | grep -v TS6133
  ```
- **Stills:** the CPU is shared, so be frugal. Use `nice -n 5` and render ≤ 8 frames per call:
  ```
  cd /home/user/remotion-demo && REMOTION_TMP=/home/user/remotion-tmp BRIDGE_ENTRY=src/sandboxes/go_<name>/index.tsx \
    COMP=GooseShort PROPS='{"noCaptions":true}' nice -n 5 node scripts/bridge-stills.mjs out/go/<name>/x_ <frames> 0.5
  ```
  Use a temporary DEBUG camera of your own if the first-pass cameras don't show your work, but turn it OFF before
  reporting.
- **Check frames:**
  - hook: 5, 30, 60, 100
  - skin: 150, 200, 240, 270, 320, 360
  - cat: 400, 450, 480, 525, 575, 600
  - ice: 630, 660, 715, 745
  - room: 800, 840, 870, 920, 990, 1030
  - outro: 1065, 1110, 1160
- **Budget:** about 90 minutes. Make it really good. Then typecheck and reply with a report of ≤ 200 words covering:
  - what you built
  - your still paths
  - the exact positions/contracts for the others
