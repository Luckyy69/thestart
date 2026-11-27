# "Wrong Address" (why ice cream gives you brain freeze): build brief (shared by all agents)

SHORT vertical cartoon short, 35.5 s (TOTAL 1065 frames @ 30 fps), final render 2K (1440x2560) in the cloud. The owner
asked: "make it insanely good AND funny". Relatable. Use our latest shorts (src/videos/goose = newest, wrinkle, jerk)
for TECHNIQUE only. Design everything NEW and push the quality higher.
Requirements: ZERO glitches (renders unattended). Backgrounds must NOT be blurry. House style: flat bean-head characters
(Canvas2D cards) in a colourful, contrasty, painted 3D world with black ink outlines. Family-friendly.

## THE 4 RULES (the owner's, binding)
1. SCRIPT: line one is a strange fact: "Brain freeze isn't happening in your brain." It climbs to ONE twist: a
   SCHOOLKID and her dad tested it: the fast ice-cream eaters got TWICE the brain freeze. Ends: "Or... eat slower. Nah."
2. CAMERA: very few cuts. Travel, LAND, then the important word is said while the camera is still.
3. LIGHT: low sun, long shadows, blue shade, haze. The light CHANGES when the story turns:
   park = warm golden summer late afternoon -> mouth = warm pink cave that goes ICY BLUE on the palate when the cold hits
   -> hq = cosy amber control room lit by red alarm light -> gym = cool bright MORNING (low sun beams through high
   windows) -> peak (on "Twice", LOOK_RAMPS gym->peak) = an ICE-BLUE/cyan flash-freeze with white rim light -> parkend
   = the park at DUSK (rose/indigo sky, lamps + cart string-lights lit).
4. FACES: one feeling per line. The big MEME face ONLY at the peak: shot 4 "Twice the brain freeze": BEAN (in the FAST
   group) flash-freezes: eyes bulge, mouth stretched in a frozen scream, frost explodes over his head, icicle hair.

## Read first
- Script/facts/timings: /home/user/freeze-short/SCRIPT.md, /home/user/freeze-short/voice/words.json
- Timeline + contracts: src/videos/freeze/story.ts (SHOTS with every beat in the comments, places PARK/MOUTH/HQ/GYM with
  their layout in the header, W cues, LOOK_RAMPS, state functions hookAt, mouthAt, hqAt, gymAt, endAt). Key everything
  off these. NEVER hard-code seconds.
- world.ts calls Sets, Mouth, Hq, Props `.update(id,t,f,cam)`, then draws the castAt cards. The composition is
  Freeze.tsx (captions + watermark top-left at ~y 150-215 px). Keep faces and key gags out of that corner and out of the
  caption band (~y 1150-1350 at 1080x1920).
- Technique references (READ-ONLY): src/videos/goose/* (newest: sets.ts shader rigs, skin.ts giant-scale organic
  world, cast.ts/fx.ts cards), src/videos/wrinkle/*, library src/videos/bridge/*.
- Best frames from the last short: /home/user/remotion-demo/out/go/final* and the delivered video
  /home/user/thestart/deliver/bald_fur_2k.mp4 (that is the quality bar).

## Ownership
Edit ONLY your own files, in your own sandbox src/sandboxes/fz_<name>/videos/freeze/. You may ADD new files with your
own prefix. Do NOT edit story.ts (if you need a state value it lacks, derive it locally from W and tell the lead).

### sets: sets.ts + props.ts (sandbox fz_sets)
PARK (shots 1 + 5): a summer city park at a warm low golden late afternoon: a pastel ICE-CREAM CART (striped umbrella,
"ICE CREAM" sign, a giant cone sign on a pole, tubs in the counter) at PARK+(1.3,0,-1.3); lush grass, a curving gravel
path, a bench at PARK+(-1.4,0,-1.2), round painted trees, a pond, flower beds, lamp posts (lit at dusk), a distant
pastel city skyline and hills, a few birds. BEAN stands at PARK+(-0.15,0,-0.2) (keep 0.8 m clear around him).
Shot 5 = the SAME park at DUSK: lamps + string lights on the cart glow (key the glows on the shot's look).
GYM (shot 4): a school science fair in a gym at a cool bright morning: wooden floor with court lines, high windows on
the LEFT wall (x -4) with low sun beams raking across the floor (haze beams on NOINK), bleachers on the back wall,
basketball hoop, a long table at z -0.9 (top y 0.72, x -1.8..1.8) with paper cups, tubs and bowls; banners "FAST"
(over the left half) and "SLOW" (over the right half); a trifold poster "ICE-CREAM HEADACHE STUDY" on the table;
a BAR CHART board on an easel at GYM+(2.1,0,-1.0) facing the camera (+z, slightly toward the centre) with two bars
"FAST" and "SLOW": the FAST bar grows to 2x the SLOW bar on gymAt.chart with a springy overshoot and a "2x" label pops
(scale-in, no pop); bunting, other science-fair tables with volcanoes etc. in the background.
props.ts: BEAN's 3-scoop CONE is drawn by the cast (card), so props are world objects only: the giant ICE-CREAM SLAB
for the mouth is owned by mouth; anything else small you want. Export the positions you create (CART, BENCH, CHART_*).

### mouth: mouth.ts (sandbox fz_mouth)
MOUTH (shot 2) at MOUTH, giant scale, INSIDE BEAN's mouth. Must read INSTANTLY on a phone as "inside a mouth":
- the TONGUE floor (glossy pink, a centre groove, papillae bumps), surface ~y 0, x -4..4, z +6 (lips) -> z -8 (throat);
- the PALATE: a big ribbed pink vault overhead (apex y ~5.5) with the classic transverse ridges;
- giant white TEETH rows (upper + lower) framing the opening at the lips (z ~+5), bright warm park light spilling in
  through the lips opening; the dark throat / uvula at the back;
- red BLOOD VESSELS (plump glossy pipes, 3-4 of them) running along the palate near the camera. On mouthAt.squeeze they
  PINCH thin (radius x 0.35) with a wobble, on mouthAt.blast they BALLOON (x 1.8) with a springy overshoot;
- a glowing yellow NERVE cable from the palate, running back and UP into a dark tunnel at the back (toward the brain).
  It glows on nerve; on alarm a big cartoon ALARM BELL mounted on it rings (shakes, glow rings); on travel a bright
  pulse races along the cable into the tunnel;
- the ICE-CREAM SLAB: a giant scoop (pink strawberry with chocolate chips, a cone-wafer edge) slides in through the lips
  on mouthAt.slab and SLAMS onto the palate/tongue front; on cold a FROST layer spreads over the palate from the impact
  (blue-white crystals, an animated mask), cold vapour wisps (NOINK), and the palate's light turns icy blue there.
- Warm pink-red bounce, a soft haze. Export SLAB_AT, VESSELS[] (centres), NERVE_PATH (points: palate -> tunnel), BELL.

### hq: hq.ts + looks.ts (sandbox fz_hq)
HQ (shot 3): BRAIN HQ, a cosy retro control room inside BEAN's head (see story.ts header). Back wall with TWO big round
EYE WINDOWS (iris-shaped frames, the park visible outside as a painted glowing backdrop), a big switchboard CONSOLE
with knobs, levers, a big red button, little screens; a panel above with two big round ALARM LAMPS "MOUTH" (left) and
"FOREHEAD" (right). The yellow NERVE cable comes up through the floor at HQ+(0,0,0.6), runs to a junction box, and one
plug SPLITS into two wires to both lamps (make the split visible: that IS the gag). On hqAt.pulse a glowing pulse
arrives; mouthLamp lights MOUTH (red, rotating beacon light), foreLamp lights FOREHEAD too; on blame the FOREHEAD lamp
goes huge-bright and the room fills with red alarm light (an animated rotating beacon). Pink wrinkly brain-tissue
texture on the walls/ceiling (cute), cables, file cabinets "PAIN REPORTS". The BRAIN character is a cast card at
HQ+(0,0,-0.5).
looks.ts: tune ALL 6 looks per RULE 3 (park, mouth, hq, gym, peak, parkend). The current looks.ts is a placeholder
copied from goose: rewrite it cleanly (the same LookDef shape; see goose/looks.ts + bridge/lights.ts). Check every
look on stills of every place (use a temporary DEBUG camera if needed; turn it off before reporting).

### cast: cast.ts + fx.ts (sandbox fz_cast)
All characters are Canvas2D cards, all NEW (technique: goose/cast.ts, fx.ts, bridge/cast.ts).
- BEAN (summer tee + shorts, red nose): shot 1 at PARK+(-0.15,0,-0.2) facing +z holding a huge 3-scoop cone
  (pink/mint/vanilla, drips). hookAt: bite (chomp, scoop bitten), frost (blue frost creeping over his forehead with
  crystals), ouch (clutches his forehead, eyes squeezed, one feeling: OUCH); lid (the top of his head flips open like
  a lid with a hinge), brain (his little pink BRAIN pops up out of it), shrug (the brain shrugs holding a tiny sign
  "0 PAIN SENSORS"), open (the brain ducks back, lid closes, BEAN opens his mouth wide for the camera dive; mouth
  centre is the dive target: export MOUTH_HOOK).
- BRAIN (shot 3, HQ): a cute pink wrinkly brain character with eyes, little arms, a headset mic, on a swivel chair at
  HQ+(0,0,-0.5) facing the console (3/4 to the lens). hqAt.confused: scratches its head, "?" ; blame: slams the big red
  button and points at FOREHEAD, a "FOREHEAD!" fx word.
- GYM (shot 4): kids sit at the table (z -0.9), cards facing +z: FAST group (left, 3 kids incl. BEAN at
  GYM+(-0.45,0,-0.9)) shovel ice cream on gymAt.fast (fast spoon loops, splats); SLOW group (right, 3 kids) take tiny
  dainty licks on slow (pinkies up). The SCHOOLKID (girl, lab goggles, pigtails, lab coat, stopwatch) at
  GYM+(0.1,0,0.1) clicks the stopwatch on girl, points at FAST on point; her DAD (tall, glasses, moustache, clipboard)
  at GYM+(0.65,0,0.0) raises the clipboard on dad. THE PEAK on gymAt.peak: BEAN's MEME FREEZE face (eyes bulge, frozen
  scream, frost explosion, icicle hair, ice crystals burst, a "!!" ), the rest of the FAST kids also wince.
- PARK DUSK (shot 5): BEAN at PARK+(-0.15,0,-0.2) with a fresh cone. endAt.fix: finger up "the fix?"; tongue: tongue
  pressed to the roof (cheeks puff, eyes closed, relief, a warm glow + "ahh"); think: looks at the cone, eyebrow;
  nah: shoves the WHOLE cone in (cone vanishes into the mouth); ice: he is FROZEN inside a big translucent ICE BLOCK
  (deadpan face, a tiny frozen "nah" bubble), hold. (The ice block may be a cast card; make it glossy.)
- FX: frost crystals, "?", "!!", "OUCH", "0 PAIN SENSORS" sign, "FOREHEAD!", stopwatch click, speed lines, splats,
  hearts/sparkles, "ahh", cold vapour.
- Exports: headAt, handAt, MOUTH_HOOK, beanAt.

### audio (separate agent, no sandbox): /home/user/freeze-short/audio/
### cam (second wave): story.ts camera + transitions only.
- 1->2: dive into BEAN's open mouth (MOUTH_HOOK) and it dissolves into the giant mouth (from the lips opening).
- 2->3: ride the glowing nerve pulse up the tunnel into HQ.
- 3->4: a whip / brain-to-gym transition (e.g. push into the eye window -> gym).
- 4->5: a whoosh to the dusk park.

## Rules (zero glitches)
- No pops: nothing pops within a visible frame. Scale or fade things in.
- Camera clearance: the camera is never inside geometry and never within 0.6 m of a card.
- No z-fighting: no coplanar surfaces. Transparent effects go on NOINK.
- Deterministic: everything is a pure function of (id,t). Seeded randomness only.
- No bounding-sphere culling on important meshes (frustumCulled = false on big/animated ones).
- Performance: merge static geometry, instance repeats, textures <= 2048, keep frames fast (CPU renderer).
- Typecheck: `cd /home/user/remotion-demo && npx tsc --noEmit 2>&1 | grep "sandboxes/fz_<name>" | grep -v TS6133`
- Stills (CPU is shared: be frugal, nice -n 5, <= 8 frames per call):
  `cd /home/user/remotion-demo && REMOTION_TMP=/home/user/remotion-tmp BRIDGE_ENTRY=src/sandboxes/fz_<name>/index.tsx COMP=FreezeShort PROPS='{"noCaptions":true}' nice -n 5 node scripts/bridge-stills.mjs out/fz/<name>/x_ <frames> 0.5`
  The first-pass cameras in story.ts are rough: use a temporary DEBUG camera of your own (e.g. in your module or by
  overriding cam in a local copy) if they don't show your work, but turn it OFF before reporting.
- Check frames: hook 5, 40, 75, 100 | mouth 135, 160, 215, 255, 300, 330 | hq 360, 400, 440, 470 |
  gym 520, 560, 640, 690, 730, 770 | outro 830, 870, 940, 1000, 1050.
- Budget ~90 minutes. Make it really good. Then typecheck and reply with a report of <= 200 words: what you built,
  your still paths, the exact positions/contracts for the others.
