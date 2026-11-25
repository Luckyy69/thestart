# "Astronauts Can't Burp": build brief (shared by all agents)

This is a ~57 s vertical cartoon short. The final render is 2K (1440x2560), so detail must hold at 2K. The user wants it
"so good you'd think it was a lie", with a hook so strong that EVERYONE wants to keep watching. It must also have ZERO
glitches, because it renders unattended.

The house style is the same as our previous shorts: flat bean-head characters (cards) in a colourful, contrasty, painted
3D world with black ink outlines. Depth blur stays mild, so backgrounds remain readable. Use our own staging only. Never
copy anyone's stories, characters, shots or text. Use no real brand logos: the cans are a RED can and a BLUE can with
our own fake "COLA" lettering.

## THE 4 RULES (the user's, binding)
1. SCRIPT: a strange fact in line one, no intro. The story climbs to one twist.
2. CAMERA: very few cuts. The camera travels, LANDS, and the important word is said while it is still.
3. LIGHT: low sun, long shadows, blue shade, haze. The light CHANGES when the story turns.
4. FACES: one feeling per line. The big meme face appears ONLY at the peak (shot 7, "Wet. Burps.").

## Read first
- Script, facts, word timings: /home/user/burp-short/SCRIPT.md and /home/user/burp-short/voice/words.json
- Timeline and contracts: src/videos/burp/story.ts.
  - SHOTS, with the beats in comments.
  - Places: STATION, EARTH, MIDDECK, ORBIT.
  - W word cues.
  - State functions: stomachAt, BURPS, canAt, menuAt, newmanAt (NEWMAN_X0..X1).
- Orchestrator: src/videos/burp/world.ts. It calls Interiors, Exterior and Props update(id,t,f,cam), and draws the castAt
  cards. The composition is in Burp.tsx.
- Best examples (READ-ONLY):
  - src/videos/miners/* and src/videos/emu/*, especially emu/flock.ts (Canvas2D character design), emu/cast.ts + fx.ts,
    and emu/outback.ts.
  - src/videos/apollo/* (space! apollo/interiors.ts has a capsule interior, apollo/outdoor.ts has the Moon/space set,
    apollo/rocket.ts).
- Library (READ-ONLY): src/videos/bridge/*.
- Our best finished frames: /home/user/remotion-demo/out/em/cam/sheet_*.jpg and /home/user/branding/emu_*.jpg

## Ownership
Edit ONLY your own files, in your sandbox: src/sandboxes/bu_<name>/videos/burp/

### in: interiors.ts
**STATION (ISS-like module):**
- Shape: a long tube along x from -6 to +6, deck y=0, ceiling 2.3, walls at z=±1.15.
- Surfaces: the white/cream padded panels and racks of the real ISS.
- Clutter: handrails (yellow-gold), laptops on arms, cables, velcro patches, stowage bags, a few floating items (a pen,
  a checklist card) bobbing slowly and deterministically, a "foot restraint" bar.
- Window: a big round window on the -z wall at x=+1.5. Earth and space are seen through it. Either draw a backdrop
  plane outside it or rely on the exterior owner's ORBIT set (it is far away), so put a simple Earth-limb view card
  behind the window.
- Hatches: rings at both ends. Newman pushes off the -x end wall/hatch at x≈-5.6, so put a sturdy flat panel + handrail
  there.
- Light: a sunlight shaft (haze card, NOINK) through the window. It is low raking and cool in "station"; in "sunrise"
  it becomes golden and flooding (shot 8 = the twist).

**MIDDECK (1985 shuttle middeck):**
- A wall of grey-white locker doors (with latches) on one side.
- A small side hatch window with a low sun shaft.
- A ladder opening in the ceiling and a sleep bag on the wall.
- 80s details: a camera on a bracket, a checklist on the wall.
- Room for 3 crew floating at MIDDECK+(-0.9|0|0.9, 1.1, 0).
- The "gross" look (peak) tints this room sickly green.

### ext: exterior.ts + looks.ts
**EARTH (backyard at golden hour):**
- Lawn, wooden fence, a deck chair at EARTH+(0,0,0) (BEAN sits in it), a grill, a little table for a soda glass, a
  house wall + window behind, trees.
- A very low warm sun with LONG shadows, and peach haze.

**ORBIT:**
- Black space with stars (instanced, no flicker).
- A huge curved Earth below: blue oceans, white clouds, a glowing blue atmosphere rim (NOINK), and a low sun near the
  limb (HDR disc + glare).
- The SPACE SHUTTLE (1985 orbiter) at ORBIT+(100,0,0): white with black belly tiles, open payload-bay doors, the cargo
  bay, a tail fin, and "USA" lettering is fine. Note: our fake "Challenger" text is fine.
- The STATION exterior at ORBIT+(-200,0,0): a module truss with big golden solar arrays, radiators, and a lit cupola
  window (BEAN/Newman card visible inside for shot 9 is the cast owner's job: give a WINDOW position).

**Looks:** tune all 7 looks in looks.ts (station, backyard, commercial, orbit, middeck, gross, sunrise) to follow RULE 3.

### props: props.ts
- **Soda cans:** the red and blue cans (our own fake "COLA" designs).
  - Shot 4: they float/spin slowly into a spotlight in orbit at ORBIT+(0,0,0), glinting, with condensation sparkle.
  - Shots 6-7: the crew holds them at the hand positions the cast owner gives you. They open with a pssht puff on
    canAt.open.
  - Cans have a little drinking spout.
- **The X-RAY STOMACH hologram:** a glowing cartoon stomach (cyan holo outline, NOINK, HDR) floating next to the
  character, per stomachAt(id,t).
  - Inside: a liquid layer (food/soda, orange-brown) and gas bubbles.
  - sep=1: the gas sits in a pocket at the TOP and the food at the BOTTOM (Earth).
  - sep=0: everything is mixed into a bubbly floating soup (space).
  - Animate the bubbles deterministically.
  - It must read instantly at phone size: this is the science explanation.
  - Shots 2, 3, 6 (one per crew member, smaller), 8.
  - Use cast positions plus offsets you agree with the cast owner (default: 0.55 m to the right of the character's
    chest).
- **The MENU card (shot 7):** a floating NASA-style food menu clipboard with "COLA" on it. A red X gets drawn on
  menuAt.cross.
- **Soda glass/can** for BEAN in the backyard (shot 2).

### cast: cast.ts + fx.ts
All characters as Canvas2D cards, in the bridge Pen style like emu/cast.ts.

**BEAN** (our astronaut):
- Bean head, a cap or no helmet, a navy polo shirt with a mission patch, cargo pants, socks.
- He floats with his legs tucked and drifts gently in microgravity, deterministically.
- Shot 1: mid-module, FACING CAMERA.
- Shot 2: on EARTH in a T-shirt in the deck chair, with a soda.
- Shot 3: floating again.
- Expressions, one feeling per line:
  - shot 1: strain (puffed cheeks) on "can't burp", annoyed on "Not won't", defeated on "Can't."
  - shot 2: relaxed → satisfied "ahh" on the burp
  - shot 3: worried → queasy → embarrassed on the wet burp

**The 1985 CREW** (3: 80s polo shirts/rugby shirts, big 80s hair/moustache on one), shots 6-7:
- They hold the cans: excited → happy sip → nervous.
- Shot 7: THE MEME FACE, the only one in the film. Huge bulging eyes, puffed cheeks about to burst, then the wet burp
  (wobbly translucent blobs + droplets float out, cartoon not gross). Then sheepish.

**NEWMAN** (astronaut, glasses optional, name tape "NEWMAN"), shot 8:
- Determined; braces/crouches at the -x wall (newmanAt.crouch); launches on "Hard."
- Flies along x (newmanAt.x) with his body stretched like Superman and speed lines.
- Wide-eyed "feeling gravity" face; catches a rail (caught).
- On "One perfect burp" (BURPS clean): a proud, blissful, satisfied face, with a clean burp ring + sparkles.

**Shot 9:** Newman/BEAN small in the station's exterior window with a tiny burp ring on "burp".

**FX cards:**
- burp rings (clean)
- the "fail" puff (shot 1)
- wet blobs
- sweat drops
- speed lines
- sparkles
- a "?"
- the pssht can spray

Burp timing: BURPS (story.ts). Expressions land 0-3 frames before their word.

### cam: (second wave) story.ts camera keys + dofAt only

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
  cd /home/user/remotion-demo && npx tsc --noEmit 2>&1 | grep "sandboxes/bu_<name>" | grep -v TS6133
  ```
- **Stills:** CPU is shared, so be frugal: use `nice -n 5` and render ≤ 8 frames per call.
  ```
  cd /home/user/remotion-demo && REMOTION_TMP=/home/user/remotion-tmp BRIDGE_ENTRY=src/sandboxes/bu_<name>/index.tsx \
    COMP=BurpShort PROPS='{"noCaptions":true}' nice -n 5 node scripts/bridge-stills.mjs out/bu/<name>/x_ <frames> 0.5
  ```
  Use a temporary DEBUG camera of your own if the first-pass cameras don't show your work, but turn it OFF before
  reporting.
- **Frames:**

  | Beat | Frames |
  |---|---|
  | hook | 20, 60, 85 |
  | earth | 150, 240, 255 |
  | soup | 330, 400 |
  | wet burp | 580 |
  | cans | 680 |
  | shuttle | 840 |
  | middeck | 890, 925, 975 |
  | PEAK | 1020, 1050, 1120 |
  | push | 1240, 1265, 1350 |
  | gas up | 1420 |
  | perfect burp | 1500 |
  | outro | 1640, 1700 |
- **Budget:** about 60 min. Then typecheck and reply with a report of ≤ 200 words covering:
  - what you built
  - still paths
  - the exact positions/contracts for the others
