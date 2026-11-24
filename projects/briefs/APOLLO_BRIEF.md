# Apollo 12 short — build brief (shared by all agents)

We are making a ~62 s vertical cartoon short "The Rocket That Made Its Own Lightning" (Apollo 12, 14 Nov 1969) in the
house style: flat 2D bean-head characters (cards) in a colourful, contrasty, painted 3D world with black ink outlines,
depth of field and dramatic, targeted lighting. The user wants REFERENCE-LEVEL quality and ZERO glitches. The video
renders overnight from the merged code, so everything must be correct and robust. Our own story/characters only — never
copy the reference's stories, characters, shots, signs or text.

## Read first
- Script + sourced facts: /home/user/apollo-short/SCRIPT.md ; word timings: /home/user/apollo-short/voice/words.json
- Timeline + contracts: src/videos/apollo/story.ts (SHOTS with places/looks, W word cues, STRIKES, FLASHES, rocketAt,
  cabinAt, switchAt, screensAt, camera keys, dofAt). Places are far apart: PAD (0,0,0) + the sky above it, CABIN (3000,0,0),
  MCC (-3000,0,0), DIAGRAM (0,0,-6000), MOON (6000,0,0).
- Orchestrator: src/videos/apollo/world.ts (sky, sun, fog, light uniforms from looks.ts, calls the sets, draws cast cards).
- Composition + post chain: src/videos/apollo/Apollo.tsx (ink -> lens blur -> bloom (threshold 1.0: HDR emissives > 1
  glow) -> tone map -> grade; captions; white flash frames from FLASHES).
- Quality reference frames: /home/user/lookmatch/ref/ (space_*.jpg, japan_*.jpg = the two clips the user loves; short*.jpg)
  and our best finished frames: /home/user/remotion-demo/out/verify/g_*.jpg (the plane short after the look-match pass).
- Reusable library (READ-ONLY, shared with other videos): src/videos/bridge/* — paint.ts (ctex, stoneHD, cobbleHD,
  grassHD, roofHD, facadeHD, planksHD, cloudHD...), build.ts (Batch, boxGeo, V, lam, house, addVeg), shade.ts (twoTone, TONE),
  toon.ts (Pen, bodyFront/bodySide, outfits, Expr list, fx drawings), cast.ts (Pool, Actor, Fx, person, blob, prepStage,
  viewOf, lidAt, hh, q, Stage, Who, CamInfo). Good working examples of everything: src/videos/gimli/{world,plane,fx}.ts.
- Skill rules + gotchas (look values, readability traps): ~/.claude/skills/cartoon-3d-short/SKILL.md

## Ownership (you edit ONLY your files, ONLY inside your sandbox src/sandboxes/ap_<name>/videos/apollo/)
- outdoor   : apollo/outdoor.ts + apollo/looks.ts  — pad + Florida in rain (swamp, water, palms/scrub, puddles, causeway with
              spectators' umbrellas/cars), storm cloud deck the rocket climbs through, falling rain (streak cards/instanced
              lines, NOINK), lightning bolt meshes (HDR emissive, branching, flicker by strikeK(t, ts); bolts hit the rocket
              in sky shots at STRIKES; in the diagram the bolt runs cloud -> rocket nose, down the plume -> ground), the DIAGRAM set
              (clean stylised ground + cloud deck), the MOON set (grey cratered ground, black starry sky, Earth), and all looks
              (storm: dark blue-grey moody day, rain light; interior: warm cabin + red alarm light; mcc: dim room lit by screens;
              diagram: clean; space: hard sun, black sky).
- interiors : apollo/interiors.ts — CABIN (command-module interior: three couches facing +x, curved grey-green panel with
              dozens of switches/gauges/lights; a big caution & warning light matrix that turns red/amber by cabinAt(id,t).warn
              and blinks; windows showing grey storm; the SCE switch with a guard and painted NORM/AUX marks on the right
              side panel near Bean (z ~ +0.75): toggles by switchAt(id,t); interior lighting dims with cabinAt().power) and
              MCC (1969 Mission Control: tiered rows of consoles with CRT screens facing -z, big wall screens + world map at
              z=-14, ceiling lights, carpet, clocks; every CRT shows clean data or GARBAGE by screensAt(id,t) — garbage =
              noisy scrambled numbers; clean = tidy columns; screens are HDR emissive so they bloom; Aaron's console is at
              MCC + SEATS.aaron with his own CRT facing him).
- rocket    : apollo/rocket.ts — a premium Saturn V (white with black roll pattern bands, stages with fins, F-1 engine bells,
              "USA" vertical lettering allowed, the escape tower + command module on top), engine fire (HDR emissive core,
              animated flicker), a long glowing exhaust plume of length s.plume, billowing launch smoke/steam at liftoff, the
              service tower (red lattice, swing arms) at the pad, and the lunar module (gold foil, legs) for the MOON set.
              Keep the exports buildRocket(): Rocket, poseRocket(r, s: RocketState, t, cam); add buildTower()/buildLM() and
              place them yourself (tower at PAD z=-20; LM at MOON) inside buildRocket's group or as children you manage.
- cast      : apollo/cast.ts + apollo/fx.ts — everyone and every effect card: the three astronauts in white pressure suits
              with helmets (cabin: Conrad z=-0.75, Gordon z=0, Bean z=+0.75, sitting, facing +x), the flight controllers
              (1960s white short-sleeve shirts, narrow ties, glasses, crew cuts, headsets) at their consoles, the flight
              director (vest), JOHN AARON young, glasses, headset, at MCC+SEATS.aaron; spectators under umbrellas at the
              pad; astronauts on the Moon. Expressions timed to W cues (shock on strikes, worry on "abort", confusion on
              "Try SCE to AUX", relief/cheer on "life"). Effect cards: a thought bubble with the test screen for the
              memory beat, "?" over confused heads, sparks/glow, rain splashes, steam. Reaction changes land 0-3 frames
              before their word.
- cam       : (second wave) apollo/story.ts camera keys + dofAt only.

## Rules (zero glitches)
- Nothing may pop in/out inside a visible frame; scale/fade in. No camera ever inside geometry or within 0.6 m of a card.
- Ground layers: no coplanar surfaces (z-fighting flicker): separate by >= 0.05 m or use polygonOffset.
- Transparent/NOINK things (rain, smoke, bolts, plume glow, clouds) on layer NOINK so the ink pass ignores them.
- Pure functions of (id, t): no randomness without a fixed seed; no accumulated state between frames.
- Keep frame budget sane (CPU renderer): merge static geometry with Batch, instancing for many repeats, textures <= 2048.
- Typecheck: cd /home/user/remotion-demo && npx tsc --noEmit 2>&1 | grep "sandboxes/ap_<name>" | grep -v TS6133
- Stills (CPU shared by several agents: be frugal, nice -n 5, <= 8 frames per call):
    cd /home/user/remotion-demo && REMOTION_TMP=/home/user/remotion-tmp BRIDGE_ENTRY=src/sandboxes/ap_<name>/index.tsx \
      COMP=ApolloShort nice -n 5 node scripts/bridge-stills.mjs out/ap/<name>/x_ <frames> 0.5
  Frames of interest: hook 60,95,130 | pad 260 | tilt 330 | cabin 380,560,1300 | liftoff 435 | strikes 494,656 |
  MCC 720,820,930,1040,1150,1380 | nobody 1430 | diagram 1500,1590,1640 | rod 1690 | moon 1780,1850.
- Time budget ~60 min. Then make sure your sandbox typechecks and reply with a <= 200-word report (what you built,
  still paths, contract notes for other owners).
