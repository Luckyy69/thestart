# "The Cleaning Crew" (why your stomach growls): build brief (shared by all agents)

SHORT vertical cartoon short, 36.5 s (TOTAL 1095 frames @ 30 fps), final render 2K (1440x2560) in the cloud. The owner
asked: "make it insanely good AND funny". Relatable. Use our latest shorts (src/videos/freeze = newest, goose, wrinkle)
for TECHNIQUE only. Design everything NEW and push the quality higher.
Requirements: ZERO glitches (renders unattended). Backgrounds must NOT be blurry. House style: flat bean-head characters
(Canvas2D cards) in a colourful, contrasty, painted 3D world with black ink outlines. Family-friendly.
NOTE: a 2K cloud render of another short is running on this 4-core machine: render stills with nice -n 15, <= 6 frames
per call, at scale 0.5, and don't run more than one render at a time.

## THE 4 RULES (the owner's, binding)
1. SCRIPT: line one is a strange fact: "Your stomach growling doesn't mean it's hungry. It means it's cleaning." It
   climbs to ONE twist: the cleaning crew runs on a SCHEDULE, it starts right before you usually eat... "which is why it
   always growls... in the quietest room possible."
2. CAMERA: very few cuts. Travel, LAND, then the important word is said while the camera is still.
3. LIGHT: low sun, long shadows, blue shade, haze. The light CHANGES when the story turns:
   hall = cool late-morning exam hall, low sun raking through venetian blinds (long stripes) -> belly = a warm pink-orange
   cavern lit by the glowing green-yellow JUICE pool from below, rim light from the oesophagus opening above -> full
   (LOOK_RAMPS belly -> full, continuous camera) = warmer, golden, cosier -> staff = a cosy tungsten break room with a
   cool vending-machine glow -> hush = the exam hall again, dimmer + cooler, ONE sun stripe across BEAN -> peak (on
   "GROWLS", LOOK_RAMPS hush -> peak) = a dramatic hot spotlight on BEAN, the room falls into deep blue shade.
4. FACES: one feeling per line. The big MEME face ONLY at the peak: shot 5 "always GROWLS": BEAN mortified (eyes
   bulge, beet-red, sweat drops, teeth clenched), the whole hall turns to stare.

## Read first
- Script/facts/timings: /home/user/growl-short/SCRIPT.md, /home/user/growl-short/voice/words.json
- Timeline + contracts: src/videos/growl/story.ts (SHOTS with every beat in the comments, places HALL/BELLY/STAFF with
  their layout in the header, W cues, LOOK_RAMPS, SUN_FROM, state functions hookAt, bellyAt, fullAt, staffAt, endAt).
  Key everything off these. NEVER hard-code seconds.
- world.ts calls Sets, Belly, Staff, Props `.update(id,t,f,cam)`, then draws the castAt cards. The composition is
  Growl.tsx (captions + watermark top-left at ~y 150-215 px). Keep faces and key gags out of that corner and out of the
  caption band (~y 1150-1350 at 1080x1920).
- Technique references (READ-ONLY): src/videos/freeze/* (newest: mouth.ts = a giant organic interior, hq.ts = a cosy
  room with its own light rig, sets.ts = park + gym, cast.ts/fx.ts = cards), src/videos/goose/*, library
  src/videos/bridge/*. Quality bar: /home/user/thestart/deliver/bald_fur_2k.mp4 and the freeze stills in
  /home/user/remotion-demo/out/fz/ (qa1/, qa2/).

## Ownership
Edit ONLY your own files, in your own sandbox src/sandboxes/gr_<name>/videos/growl/. You may ADD new files with your
own prefix. Do NOT edit story.ts (if you need a state value it lacks, derive it locally from W and tell the lead).

### sets: sets.ts + props.ts (sandbox gr_sets)
HALL (shots 1 + 5): a big school EXAM HALL (see the story.ts header for the layout): polished wooden floor, 3 rows x 4
little single desks + chairs (BEAN's middle desk at HALL+(0,0,0)), exam papers + pencils on every desk, tall windows on
the LEFT wall (x -5) with VENETIAN BLINDS raking long stripes of low sun across the floor and desks (haze beams on
NOINK), a big round WALL CLOCK on the front wall (z -5, y 3.2) whose hands are driven by hookAt/endAt.tick (11:58 ->
11:59, the minute hand jumps with a tiny overshoot; a "LUNCH" sticker at 12), a "SILENCE - EXAM IN PROGRESS" banner, a
blackboard with "EXAM - NO TALKING", the teacher's desk at HALL+(0,0,-3.8) with an apple and a bell, radiators, a
trophy cabinet, plants. The look "hush" (shot 5) must feel quieter and cooler with ONE sun stripe on BEAN.
props.ts: small world props you want (the exam papers flutter on the peak growl, a pencil rattles on hookAt.rumble).
Export the positions you create (DESKS[], CLOCK, TEACHER_DESK).

### belly: belly.ts (sandbox gr_belly)
BELLY (shots 2 + 3): the giant stomach cavern (see the story.ts header). Must read INSTANTLY on a phone as "inside a
stomach": soft pink-orange glossy walls with big wavy RUGAE folds, a glowing green-yellow JUICE pool (animated, gentle
bubbles), crumbs, a shiny translucent AIR BUBBLE pocket at BELLY+(1.5,1.2,-1) (wobbles), the oesophagus opening in the
roof at BELLY+(-5,8,0) (light spills in), the exit tunnel at BELLY+(7,1.5,0). The crew's CORNER at BELLY+(-3,0,2.5):
hammocks, a wooden crate table, an alarm clock (rings on bellyAt.alarm), a little wall clock (spins on clock), mops,
buckets, a "CLEANING CREW" sign (the crew are cast cards).
THE SQUEEZE (bellyAt.squeeze 0..1): a glowing ring of muscle that contracts the cavern wall and travels from x -6 to
x +7 like a big wave (the walls really pinch in around it), with a giant BROOM sweeping crumbs ahead of it into the exit
on sweep; on squish (when the wave reaches the bubble) the bubble SQUISHES flat and on echo concentric SOUND RINGS
(NOINK) bounce off the walls; on growl a big 3D "GRRROWL" letter sign wobbles and echoes (or leave the letters to cast
and tell the lead).
Shot 3 FULL (fullAt): FOOD tumbles in from the roof opening on fill: spaghetti, a pizza slice, broccoli, a burger,
peas, a juice-box straw; it piles up and fills the cavern (no pops: drop in from out of frame and settle with a squash);
squeeze2 rolls the same wave under the food (food bobs up), then muffle: a tiny "mmf" bubble (cast) pops out.
Export JUICE_AT, BUBBLE_AT, CORNER_AT, SQUEEZE_X(t), FOOD_TOP(t).

### staff: staff.ts + looks.ts (sandbox gr_staff)
STAFF (shot 4): the crew's STAFF ROOM inside the stomach wall: a cosy, funny break room (pink fleshy walls with tiles
painted on, a round porthole showing the stomach juice outside, lockers, a vending machine "SNACKS (for humans)", a
coffee machine, a punch-card TIME CLOCK, a big SCHEDULE BOARD with "SHIFT: CLEAN" and "11:59 (right before LUNCH)" that
lights up on staffAt.board, a big wall CLOCK at STAFF+(0,2.2,-2.2) driven by tick (11:58 -> 11:59, the minute hand
jumps), a red ALARM light that spins on whistle, a mop rack (mops vanish smoothly as the crew grab them on run: or keep
the mops and let the cast carry their own), a motivational poster "NO CRUMB LEFT BEHIND". The crew + FOREMAN are cast
cards around STAFF+(0,0,-0.6).
looks.ts: tune ALL 6 looks per RULE 3 (hall, belly, full, staff, hush, peak). The current looks.ts is a placeholder
borrowed from freeze: rewrite it cleanly (the same LookDef shape; see freeze/looks.ts + bridge/lights.ts). Places with
their own shader rigs (belly, staff) may read sunAz/sunEl. Check every look on stills.

### cast: cast.ts + fx.ts (sandbox gr_cast)
All characters are Canvas2D cards, all NEW (technique: freeze/cast.ts, fx.ts, bridge/cast.ts).
- BEAN (school hoodie, red nose) sits at his desk HALL+(0,0,0) (seat y 0.45) facing -z (the camera mostly looks at him
  from the front, so the card faces the lens). hookAt: rumble (his belly rumbles: the hoodie ripples, wobble lines,
  "grrr" squiggles), puzzled (looks down at his belly: one feeling), sign (a tiny yellow "CLEANING IN PROGRESS" wet-floor
  sign + a tiny gloved hand pop up out of his belly, scale-in), wave (the hand waves). Export BELLY_HOOK (the dive
  target on his belly).
- The CREW (shots 2-4): 4-5 tiny round janitor blobs (cute stomach-cell creatures: different colours, hard hats/caps,
  overalls, mops, brooms, a bucket, a vacuum), sleeping in hammocks at the corner (ZZZ) then jumping up on bellyAt.wake;
  in the squeeze they SURF the wave / push the giant broom (positions follow the belly's SQUEEZE_X); in shot 3 one is
  squashed under a pizza slice giving a thumbs-up on fullAt.thumbs; FX "mmf" on muffle. Card scale is giant-world
  scale: a crew member is ~1.2 m tall in BELLY metres.
- FX in the belly: "GRRROWL" big wobbly echoing letters on bellyAt.growl (unless belly does them in 3D: coordinate via
  your report), "RING RING" on alarm, "ZZZ", sparkles on the clean floor.
- STAFF (shot 4): the crew in the break room with coffee mugs, the FOREMAN (bigger, moustache, clipboard, whistle):
  board: points at the schedule; whistle: blows (cheeks puff, "TWEET!"); run: the crew grab mops and dash out (speed
  lines, dust puffs).
- HALL payoff (shot 5): BEAN at his desk; other pupils (6-8 cards at the other desks, varied, writing quietly) and the
  TEACHER (strict, glasses, bun) at the front desk. endAt: peak = BEAN's MORTIFIED MEME face + a monster "GRRROOOWL"
  shockwave from his belly (papers flutter); stare = every pupil and the teacher turn to stare (wide eyes, one drops a
  pencil); sink = BEAN slowly sinks down in his seat; sorry = a tiny crew member pops out of his belly: tiny "sorry".
- Exports: headAt, handAt, BELLY_HOOK, beanAt.

### audio (separate agent): /home/user/growl-short/audio/
### cam (second wave): story.ts camera + transitions only.
- 1->2: dive into BEAN's belly (BELLY_HOOK) and dissolve into the cavern (e.g. from the oesophagus opening, falling in).
- 2->3: continuous (same cavern): the camera keeps going while the food falls in.
- 3->4: a swoosh through the stomach wall into the staff room (a door "STAFF ONLY").
- 4->5: the crew runs out the door -> whoosh into the silent exam hall.

## Rules (zero glitches)
- No pops: nothing pops within a visible frame. Scale or fade things in.
- Camera clearance: the camera is never inside geometry and never within 0.6 m of a card.
- No z-fighting: no coplanar surfaces. Transparent effects go on NOINK.
- Deterministic: everything is a pure function of (id,t). Seeded randomness only.
- No bounding-sphere culling on important meshes (frustumCulled = false on big/animated ones).
- Performance: merge static geometry, instance repeats, textures <= 2048, keep frames fast (CPU renderer).
- Typecheck: `cd /home/user/remotion-demo && npx tsc --noEmit 2>&1 | grep "sandboxes/gr_<name>" | grep -v TS6133`
- Stills (CPU is shared: be frugal, nice -n 15, <= 8 frames per call):
  `cd /home/user/remotion-demo && REMOTION_TMP=/home/user/remotion-tmp BRIDGE_ENTRY=src/sandboxes/gr_<name>/index.tsx COMP=GrowlShort PROPS='{"noCaptions":true}' nice -n 15 node scripts/bridge-stills.mjs out/gr/<name>/x_ <frames> 0.5`
  The first-pass cameras in story.ts are rough: use a temporary DEBUG camera of your own (e.g. in your module or by
  overriding cam in a local copy) if they don't show your work, but turn it OFF before reporting.
- Check frames: hook 10, 45, 85 | belly 140, 175, 225, 285, 340, 430, 490, 556 | full 600, 640, 690, 740 |
  staff 790, 845, 880, 905 | payoff 935, 962, 995, 1040, 1090.
- Budget ~90 minutes. Make it really good. Then typecheck and reply with a report of <= 200 words: what you built,
  your still paths, the exact positions/contracts for the others.
