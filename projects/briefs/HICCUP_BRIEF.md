# "Hiccups Come From Tadpoles": build brief (shared by all agents)

This is a SHORT 41 s vertical cartoon short: TOTAL 1230 frames at 30 fps. The final render is 2K (1440x2560).

The owner's growth plan:
- Short videos.
- Body + funny + relatable, like our best performer "Astronauts Can't Burp".
- Quality even better than our last shorts (src/videos/sneeze, tickle, ouch, burp). Use those for TECHNIQUE only and
  design everything NEW.

Hard requirements:
- Zero glitches: it renders unattended.
- Backgrounds must NOT be blurry.
- House style: flat bean-head characters (Canvas2D cards) in a colourful, contrasty, painted 3D world with black ink
  outlines. Family-friendly.

## THE 4 RULES (the owner's, binding)
1. SCRIPT: a strange fact in line one, no intro. It climbs to one twist: 68 years and 430 million hics.
2. CAMERA: very few cuts. Travel, LAND, then say the important word while still.
3. LIGHT: low sun, long shadows, blue shade, haze. The light CHANGES when the story turns.
4. FACES: one feeling per line. The big meme face appears ONLY at the peak (shot 5: old Osborne on "430 million hics").

## Read first
- Script, facts and word timings: /home/user/hiccup-short/SCRIPT.md and /home/user/hiccup-short/voice/words.json
- Timeline and contracts: src/videos/hiccup/story.ts. It has:
  - SHOTS, with the beats in comments
  - the places KITCHEN, POND and FARM
  - W cues and LOOK_RAMPS
  - state functions HICS, shadowAt, xrayAt, tadpoleAt, morphAt, osborneAt
  - Key everything off W and the state functions. Never hard-code seconds.
- world.ts calls Sets, Pond, Holo and Props update(id,t,f,cam), then draws the castAt cards.
- Composition: Hiccup.tsx (captions plus the watermark, top-left at about y 150-215 px).
- Technique references (READ-ONLY): src/videos/sneeze/*, src/videos/tickle/*, src/videos/burp/* (the stomach hologram,
  props.ts). Library: src/videos/bridge/*
- Best frames: /home/user/remotion-demo/out/sn/m/*.jpg and /home/user/remotion-demo/out/ti/m/*.jpg

## Ownership
Edit ONLY your own files, in your sandbox src/sandboxes/hi_<name>/videos/hiccup/

### sets: sets.ts
**KITCHEN:** BEAN's bright little kitchen at golden morning.
- The counter runs along z=-0.6 with its top at y 0.92: tiles, a fridge with magnets, a window with low sun stripes,
  plants, a kettle.
- A FISH TANK on the counter: a little callback to "water".
- A clear plain wall area behind BEAN so the shot-1 fish/tadpole SHADOW reads. Draw the shadow yourself per shadowAt:
  a big tadpole-shaped shadow sliding across the wall.
- BEAN stands at KITCHEN+(0,0,0).

**FARM 1922:** an Iowa hog farm.
- Red barn, white fence, windmill, corn, dusty yard, the low sepia-gold sun.
- A big hog-weighing SCALE platform at FARM+(0.8,0,-0.3) (the hog is a cast card).
- A wooden wall CALENDAR on the barn whose pages fly by in the time-lapse per osborneAt.year (big readable year number).
- Charles Osborne stands at FARM+(0,0,0).

### pond: pond.ts + looks.ts
**The POND:** prehistoric, half underwater.
- Green-teal water, god-ray sunbeams from the surface at y 2.2, golden caustics on the pebbly floor, reeds, lily pads
  from below, bubbles, tiny prehistoric plants.
- The camera sits underwater around POND+(0,1.2,3).
- The TADPOLE is a cast card at POND+(0,1.2,0); leave room for it.

**Looks:** tune all 5 looks per RULE 3 (kitchen, xray, pond, farm, peak). The pond look is the story turn: a different
world.

### holo: holo.ts
All the readable science overlays. They must read instantly on a phone.

**Shot 2 X-RAY** (xrayAt):
- A glowing cutaway of BEAN's chest and throat: lungs, the pink DIAPHRAGM dome that SPASMS down (diaphragm), air rushing
  in through the windpipe (air), and a little THROAT DOOR (the glottis) that SLAMS shut (door) → a big "HIC!".
- Labels: "DIAPHRAGM" and "THROAT DOOR".
- Anchor to BEAN's chest (default chest KITCHEN+(0,1.05,0); head KITCHEN+(0,1.45,0)).

**Shot 3 GILLS diagram** (tadpoleAt), around the tadpole card at POND+(0,1.2,0):
- Blue water arrows flowing in the mouth and OUT over the gills (flow).
- The throat-snap indicator (snap).
- Little lungs with a green ✓ "DRY" (dry).

**Shot 5:**
- A big brass ODOMETER counter that rolls to 430,000,000 (osborneAt.count, show).
- A tally of "HIC" marks.

Export the positions.

### props: props.ts
- BEAN's fizzy-drink can (our own design, no real logo), with a fizz spray on the first hic.
- Osborne's hog-scale details: a dial with a needle.
- Corn sacks.
- Little "hic bubble" puffs in 3D per HICS.

Cast exports the hand/mouth points.

### cast: cast.ts + fx.ts
All characters are Canvas2D cards, all NEW.

**BEAN:** pyjamas or a hoodie, morning hair.
- Every hic is a full-body jolt plus a "HIC!" card per HICS.
- Shot 1: mid-sip when the first hic hits at 0.25 s, the can splashes, then he side-eyes the wall shadow.
- Shot 2: the X-ray pose.
- Shot 4: betrayed look at the can; worried on "it doesn't stop".

**The TADPOLE:** a huge, cute, expressive cartoon tadpole with visible gill slits, swimming.
- Gulp: cheeks puff (tadpoleAt.gulp), then the throat snaps.
- The MORPH at the 3→4 transition (morphAt): the tadpole turns into BEAN.

**CHARLES OSBORNE:** a 1920s Iowa farmer (overalls, straw hat, moustache).
- Weighing a cute HOG on the scale (the hog card).
- AGES with osborneAt.age: hair and moustache go white, he gets glasses and a stoop, from 1922 to 1990.
- Hiccups through the whole time-lapse.
- THE MEME FACE only at the peak, "430 million hics": exhausted, eyes bulging, one last giant HIC. Iconic.

**FX:** HIC! bursts, sweat, "!"/"?", sparkles, motion lines, bubbles.

**Exports:** headAt, mouthAt, chestAt, handAt.

### cam: (second wave) story.ts camera + transitions only.
Planned transitions:
- 1→2: X-ray scan wipe.
- 2→3: dive into the fish tank / water to the pond.
- 3→4: the tadpole→BEAN morph match.
- 4→5: a whip to 1922 with a sepia flash.

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
  cd /home/user/remotion-demo && npx tsc --noEmit 2>&1 | grep "sandboxes/hi_<name>" | grep -v TS6133
  ```
- **Stills:** CPU is shared, so be frugal: use `nice -n 5` and render ≤ 8 frames per call.
  ```
  cd /home/user/remotion-demo && REMOTION_TMP=/home/user/remotion-tmp BRIDGE_ENTRY=src/sandboxes/hi_<name>/index.tsx \
    COMP=HiccupShort PROPS='{"noCaptions":true}' nice -n 5 node scripts/bridge-stills.mjs out/hi/<name>/x_ <frames> 0.5
  ```
  Use a temporary DEBUG camera of your own if the first-pass cameras don't show your work, but turn it OFF before
  reporting.
- **Frames:** hook 8, 60, 90 | xray 175, 230, 270, 302, 360 | pond 470, 510, 560, 610, 640 | morph 650, 665, 680 | kitchen 736, 795, 870 | farm 920, 1000, 1060, 1110, 1150, 1180, 1220.
- **Budget:** about 90 min (the user said: take your time, make it really good). Then typecheck and reply with a report of ≤ 200 words covering:
  - what you built
  - still paths
  - the exact positions/contracts for the others

