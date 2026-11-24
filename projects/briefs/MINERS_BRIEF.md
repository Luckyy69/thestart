# Miners short — build brief (shared by all agents)
A ~69 s vertical cartoon short "The Note on the Drill" (the 33 Chilean miners, San José mine, 2010), final render in 2K
(1440x2560, --scale 4/3) — so textures and detail must hold up at 2K. House style: flat 2D bean-head characters (cards)
in a colourful, contrasty, painted 3D world with black ink outlines, DOF and dramatic, targeted light (see the Apollo
short's merged code + stills for the current best level). The user demands reference quality and ZERO glitches; the video
renders unattended. Our own staging only — never copy the reference clips' stories, characters, shots, signs or text.

## Read first
- Script + facts: /home/user/miners-short/SCRIPT.md ; words: /home/user/miners-short/voice/words.json
- Timeline + contracts: src/videos/miners/story.ts (SHOTS places/looks, W cues, state functions collapseAt, megablockAt,
  empireAt, probesAt, rodAt, shaftAt, tireAt, capsuleAt, dayAt; place anchors DESERT, MINE_MOUTH, CAMP, DRILL, SHAFT, MINE,
  REFUGE, CUT). Orchestrator src/videos/miners/world.ts (sky/sun/fog/light uniforms from looks.ts; calls Surface,
  Underground, Props update(id,t,f,cam); draws cast cards from castAt). Composition src/videos/miners/Miners.tsx.
- Best working examples to copy techniques from (READ-ONLY): src/videos/apollo/{outdoor,interiors,rocket,cast,fx,looks}.ts
  (storm sky, rain, bolts, lit interiors with own light shaders, CRT shaders, premium models, spectators, accessory cards).
- Library (READ-ONLY, shared): src/videos/bridge/* (paint.ts textures, build.ts Batch/boxGeo/lam/house/addVeg, shade.ts
  twoTone/TONE, toon.ts Pen/outfits/Expr, cast.ts Pool/Actor/Fx/person/blob/prepStage/viewOf/lidAt/hh/q).
- Reference frames: /home/user/lookmatch/ref/ ; skill rules: ~/.claude/skills/cartoon-3d-short/SKILL.md

## Ownership (edit ONLY your files in your sandbox src/sandboxes/mn_<name>/videos/miners/)
- surface     : surface.ts + looks.ts — the Atacama desert (ochre/rust hills, dusty roads, scrub, rocks, far mountains,
                deep blue sky by day, orange dusk, starry navy night with work floodlights), the mine mouth (portal with
                timber/steel frame in a brown mountain at MINE_MOUTH), mining trucks, CAMP (Camp Hope: ~30 colourful tents, many
                Chilean flags on poles (white/blue/red with the white star — flags are fine), a shrine with candles (glowing),
                photos, a big tent, generators, string lights at dusk/night), the DRILL rig at DRILL (a tall truck-mounted
                drilling mast with pipes racked beside it; the rod string rises out of the hole: use rodAt(id,t).up), the
                rescue platform at SHAFT (a steel platform over the shaft mouth, a big winch tower with a large pulley wheel
                that turns while the capsule moves (capsuleAt), floodlights, a crowd barrier, a giant Chilean flag) for the night
                shots. Looks: desert (hot, bright, deep sky), dusk (warm orange), night (navy + white work lights, glow), mine
                (dark, warm helmet-lamp light), cut (clean diagram light).
- underground : underground.ts — MINE: the ramp tunnel (rough rock walls, timber props, pipes, cables, puddles, a pickup
                truck), the collapse in shot 4 (collapseAt: rocks/slabs falling and shaking, thick dust billowing toward the
                camera, deterministic, nothing pops; a big flash of dust), and the REFUGE (a low rock room ~10x6 m around
                REFUGE: benches, a metal cabinet with very few cans/milk cartons/biscuits, an oxygen bottle, cardboard on the
                floor, a single bare bulb or helmet lamps lighting the room in warm cones — use an own light shader like
                apollo/interiors.ts; a wall where tally marks grow with dayAt (draw them on a canvas texture: dayAt(id,t) strokes),
                dust motes in the lamp beams (NOINK)).
- props       : props.ts — the CUTAWAY diagram at CUT (a big vertical cross-section slab of the mountain, rock strata in warm
                tones, surface line at y=0 with tiny tents/rigs, the ramp tunnel spiralling down, the refuge at ~700 m depth
                (glowing), the megablock separating and dropping (megablockAt), an Empire State Building silhouette beside it
                for scale (empireAt), probe holes as thin lines that grow and miss (probesAt; the last one hits on day 17),
                the rescue shaft drawn down (shaftAt), a car tire next to the shaft mouth for scale (tireAt)); the Fénix
                capsule model (a slim ~54 cm-wide, ~4 m tall steel cylinder: white with red/blue Chilean stripes, a cage top,
                a door, guide wheels) placed at SHAFT using capsuleAt(id,t); the hanging drill rod string end + the taped NOTE
                (a small plastic bag with a folded paper; the note text itself is a cast/fx card close-up) at DRILL using rodAt.
- cast        : cast.ts + fx.ts — the 33 miners (orange/blue coveralls with reflective stripes, white/yellow helmets with
                lamps — a glowing lamp card per helmet, beards growing with days), families at Camp Hope (women, kids, older
                men, many holding flags/photos/candles), rescuers/drill crew (red coveralls, white helmets), engineers by the
                capsule, the crowd at the rescue at night (cheering, flags), a miner stepping out of the capsule in dark
                sunglasses (the real men wore them), hugs at the end. Effect cards: the NOTE close-up (a crumpled paper with
                hand-written red text "ESTAMOS BIEN EN EL REFUGIO LOS 33" — Spanish, red ink, readable), the two-spoonfuls
                spoon + tuna can, candles, dust, sweat, '?' Expressions timed to W (reaction 0-3 frames before the word).
- cam         : (second wave) story.ts camera keys + dofAt only.

## Rules (zero glitches)
- Nothing pops in/out within a visible frame (scale/fade in); no camera inside geometry or within 0.6 m of a card;
  no coplanar surfaces (z-fighting); NOINK for transparent effects; pure functions of (id,t) — seeded randomness only.
- Never cull things that matter (if you merge geometry, compute bounding spheres correctly or set frustumCulled=false).
- Performance: merge static geometry (Batch), instancing for repeats, textures <= 2048.
- Typecheck: cd /home/user/remotion-demo && npx tsc --noEmit 2>&1 | grep "sandboxes/mn_<name>" | grep -v TS6133
- Stills (CPU shared — frugal, nice -n 5, <= 8 frames per call):
    cd /home/user/remotion-demo && REMOTION_TMP=/home/user/remotion-tmp BRIDGE_ENTRY=src/sandboxes/mn_<name>/index.tsx \
      COMP=MinersShort nice -n 5 node scripts/bridge-stills.mjs out/mn/<name>/x_ <frames> 0.5
  Frames: refuge 40, 650, 780 | dusk camp 150 | desert 270 | collapse 380,400,420 | cutaway 470,520,560 | camp 880 |
  drill 1000 | dusk 1100 | note 1200,1300,1420 | cut 1490,1580 | capsule 1700 | rescue 1850 | end 1990.
- ~60 min. Then typecheck and reply with a <= 200-word report (built, still paths, contract notes for others).
