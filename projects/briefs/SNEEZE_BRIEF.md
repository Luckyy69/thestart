# "The Sun Sneeze" (ACHOO): build brief (shared by all agents)

This is a ~58 s vertical cartoon short: TOTAL 1755 frames at 30 fps. The final render is 2K (1440x2560), so detail must
hold at 2K. It is the next in our funny-science series: "Astronauts Can't Burp", "Why We Say Ow", "Why You Can't Tickle
Yourself" (src/videos/burp, ouch, tickle). Use those for TECHNIQUE only.

The user's request: "EVEN BETTER than last time, with cool transitions and insanely good quality overall". Design
EVERYTHING NEW (sets, characters, props). Take your time. The video must have ZERO glitches, because it renders
unattended, and backgrounds must NOT be blurry.

Style:
- House style: flat bean-head characters (Canvas2D cards) in a colourful, contrasty, painted 3D world with black ink
  outlines.
- Family-friendly. Sneezes are cartoon blasts (wind, sparkles, a few cute droplets), never gross.

## THE 4 RULES (the user's, binding)
1. SCRIPT: a strange fact in line one, no intro. It climbs to one twist: the official name spells ACHOO.
2. CAMERA: very few cuts. Travel, LAND, then say the important word while the camera is still.
3. LIGHT: low sun, long shadows, blue shade, haze. The light CHANGES when the story turns.
4. FACES: one feeling per line. The big meme face ONLY at the peak (shot 5 "Achoo!").

## Read first
- Script, facts and word timings: /home/user/sneeze-short/SCRIPT.md and /home/user/sneeze-short/voice/words.json
- Timeline and contracts: src/videos/sneeze/story.ts. It has:
  - SHOTS, with the beats in comments
  - places STREET, GREECE, ENGLAND, STAGE
  - W cues and LOOK_RAMPS
  - state functions: SNEEZES, doorAt, noseAt, baconAt, nervesAt, bannerAt
  - Key everything off W and these state functions. Never hard-code seconds.
- Orchestrator: src/videos/sneeze/world.ts. It calls Sets, Eras, Nerves and Props update(id,t,f,cam), then draws the
  castAt cards.
- Composition: Sneeze.tsx (captions plus the watermark top-left, ~y 150-215 px). Keep key content clear of it.
- Technique references (READ-ONLY):
  - src/videos/tickle/* (newest): sets.ts light shader, haze, cutaway walls; brain.ts hologram; cast.ts + fx.ts
  - src/videos/ouch/*, src/videos/burp/*
- Library (READ-ONLY): src/videos/bridge/*
- Best finished frames: /home/user/remotion-demo/out/ti/m/*.jpg, /home/user/remotion-demo/out/ou/m/*.jpg

## Ownership
Edit ONLY your files, in your sandbox src/sandboxes/sn_<name>/videos/sneeze/

### sets: sets.ts
**STREET (sunrise):** a colourful little terraced street.
- BEAN's red front door at STREET+(0,0,-1.2), with a dark hallway behind it and steps down to the pavement.
- Pastel houses, window boxes, a lamp post, a cat on a wall, bunting.
- The low sun rises right at the end of the street: long shadows toward the camera, haze, lens glow.
- BEAN steps out to STREET+(0,0,0). His family of 6 steps out the same door in shot 6, so make room for 6 people on the
  pavement.

**STAGE (1978 conference):**
- Red velvet curtains, a wooden podium with a microphone, a slide projector beam with haze.
- An audience of seats, BEAN in the front row at STAGE+(0,0,2.5).
- Space for a GIANT BANNER at STAGE+(0,2.6,-2.2), 6 m wide. Props builds the banner.

### eras: eras.ts + looks.ts
**GREECE:** ancient Athens at golden hour.
- A marble terrace, fluted columns, olive trees in pots.
- The Aegean sea far below with sparkle, distant islands, the Acropolis on a hill.
- Aristotle stands at GREECE+(0,0,0).

**ENGLAND:** a 1630s English manor garden on a hazy gold morning.
- Clipped hedges, lavender, a sundial, a red-brick Jacobean manor, a gravel path, mist.
- Francis Bacon stands at ENGLAND+(0,0,0) facing the sun.

**Looks:** tune all 6 looks in looks.ts (dawn, greece, england, xray, flash, stage). Each era must have its own
distinct light (RULE 3).

### nerves: nerves.ts
The X-RAY HEAD for shot 4 (nervesAt), at STREET, over BEAN's head and face. It must read instantly on a phone; this is
the science.
- A big glowing hologram head-profile cutaway: eyes → the gold LIGHT nerve (optic) and the green SNEEZE nerve
  (trigeminal) running to the nose, side by side like two cables.
- "CROSSED WIRES" label on `crossed`.
- Each nerve draws itself on `sneezeNerve` / `lightNerve`.
- Bright light floods in through the eyes on `flood`: gold pulses race down the light nerve.
- Sparks JUMP across to the sneeze nerve on `jump`, and the nose lights up.
- The brain's confused thought bubble "LIGHT? ...MUST BE SOMETHING IN THE NOSE!" on `thought`.
- Anchor to the cast owner's BEAN head (default head centre STREET+(0,1.45,0)). Export headPos.

### props: props.ts
- The giant conference BANNER (bannerAt): it unrolls on `reveal`. The five words light up one by one on `words`
  (0..5): "Autosomal Dominant Compelling Helio-Ophthalmic Outburst". The initials A-C-H-O-O glow gold on `initials`,
  then the banner collapses into a huge "ACHOO!" on `achoo`.
- A slide projector with a light beam.
- Aristotle's scroll and Bacon's notebook + quill.
- BEAN's coffee mug.
- Volumetric sunbeam cards.
- The SNEEZE BLAST effect in 3D (shockwave ring, wind streaks, cute sparkle droplets) per SNEEZES (t, who, size).
  Cast exports the mouth points.

### cast: cast.ts + fx.ts
All characters are Canvas2D cards in our Pen style, as brand-new designs.

**Characters:**
- BEAN, in a dressing gown, slippers, bed hair and a mug.
- ARISTOTLE, with a white beard, toga and laurel.
- FRANCIS BACON, with a big ruff collar, tall black hat, goatee and doublet.
- BEAN's FAMILY for shot 6: Mum, Dad and 4 kids of different sizes.
- The 1978 SCIENTIST, with big hair, wide tie, tweed and big glasses.
- The audience.

**Sneezes:** every sneeze has a build-up ("ah... ah..." face, 0.6 s, nostrils flaring), then the blast (eyes shut, head
whips), per SNEEZES.

**Faces:** one feeling per line.

**The meme face:** THE MEME FACE only at the PEAK "Achoo!" (38.65 s). It is a colossal sneeze: face distorted, hair blown
back, cheeks puffed, eyes squeezed. It must be iconic, the screenshot moment.

**Effect cards:**
- "AH... AH..." text
- "ACHOO!" bursts
- squint/glare lines
- sweat
- "!" and "?"
- sparkles
- motion lines

**Exports:** headAt, mouthAt, noseAt.

### cam: (second wave) story.ts camera + transitions only.
The user explicitly wants COOL TRANSITIONS. Ideas:
- Match cuts on the sun (BEAN's sun → Aristotle's sun → Bacon's sun).
- A whip-pan through time.
- A push into BEAN's eye for the X-ray.
- The sneeze shockwave blowing us to the family.

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
  cd /home/user/remotion-demo && npx tsc --noEmit 2>&1 | grep "sandboxes/sn_<name>" | grep -v TS6133
  ```
- **Stills:** CPU is shared, so be frugal: use `nice -n 5` and render ≤ 8 frames per call.
  ```
  cd /home/user/remotion-demo && REMOTION_TMP=/home/user/remotion-tmp BRIDGE_ENTRY=src/sandboxes/sn_<name>/index.tsx \
    COMP=SneezeShort PROPS='{"noCaptions":true}' nice -n 5 node scripts/bridge-stills.mjs out/sn/<name>/x_ <frames> 0.5
  ```
  Use a temporary DEBUG camera of your own if the first-pass cameras don't show your work, but turn it OFF before
  reporting.
- **Frames:** hook 20, 42, 110 | greece 200, 243, 284, 325 | england 420, 494, 545, 579, 665 | xray 760, 830, 930, 1000, 1080, 1130 | PEAK 1160, 1170, 1185 | family 1230, 1300, 1330, 1350 | stage 1470, 1510, 1550, 1600, 1650, 1680, 1720.
- **Budget:** about 90 min (the user said: take your time, make it really good). Then typecheck and reply with a report of ≤ 200 words covering:
  - what you built
  - still paths
  - the exact positions/contracts for the others

