# Emu War short — build brief (shared by all agents)
A ~60 s vertical cartoon short "The War Australia Lost to Birds" (the Great Emu War, Western Australia, Nov 1932), final
render 2K (1440x2560) — detail must hold at 2K. It must be FUNNY and CATCHY (comedy timing, expressive emus, deadpan
army) at reference quality with ZERO glitches; it renders unattended. House style as the previous shorts: flat bean-head
characters (cards) in a colourful, contrasty painted 3D world with black ink outlines and targeted light. NOTE: depth
blur is now deliberately mild (user: backgrounds were too blurry) — keep backgrounds readable. Our own staging only;
never copy the reference clips' stories, characters, shots or text.

## Read first
- Script + facts: /home/user/emu-short/SCRIPT.md ; words: /home/user/emu-short/voice/words.json
- Timeline + contracts: src/videos/emu/story.ts (SHOTS with comic beats per shot, W cues, places FARM, HOMESTEAD, SCORE,
  DAM, HIDE, ROAD, OFFICE; state functions wheatAt, waveAt, lineupAt, jamAt, chaseAt, scoreAt). Orchestrator
  src/videos/emu/world.ts (calls Outback, Flock, Props update(id,t,f,cam); draws castAt cards). Composition Emu.tsx.
- Best examples (READ-ONLY): src/videos/miners/* (latest, best quality: surface.ts, underground.ts own light rigs,
  props.ts, cast.ts + fx.ts accessory cards) and src/videos/apollo/*. Library (READ-ONLY): src/videos/bridge/*.
- Reference frames: /home/user/lookmatch/ref/ ; best finished frames: /home/user/remotion-demo/out/mnv/a_*.jpg

## Ownership (edit ONLY your files in your sandbox src/sandboxes/em_<name>/videos/emu/)
- outback : outback.ts + looks.ts — FARM: golden wheat fields that get eaten down to red-dirt stubble by wheatAt (animated,
            deterministic), a tin-roof homestead with verandah, windmill (turning), corrugated water tank, post-and-wire
            fences, gum trees, red dirt tracks, a wide bright sky; a sign post at SCORE for the scoreboard (props builds the
            board). DAM: a red-earth farm dam with water + muddy bank, scrub bushes, a big bush at HIDE for the soldiers.
            ROAD: a long straight red-dirt road along +x (bumpy ruts, dust), scrub and termite mounds both sides, telegraph
            poles. OFFICE: a 1930s army office (desk, wall map of Western Australia with pins, flag, filing cabinet, window
            light, a ceiling fan) with its own light rig. Looks: day (hot bright saturated), golden (warm evening), office.
- flock   : flock.ts — ALL the emus. Design a great comedic cartoon emu in our style (Canvas2D card via the bridge Pen, like
            toon.ts characters): shaggy dark-brown body, long neck, blue-grey face, big round orange eyes with expressive
            brows/pupils, beak, long legs, big three-toed feet; poses: stand, walk, RUN (fast leg cycle, neck forward),
            peck/eat, look around (head swivel), smug, surprised, celebrate (wings flap); the lookout pose (neck fully
            extended, head turning like a periscope). Render thousands efficiently (instanced quads sharing a texture atlas
            of poses/frames, LOD by distance, deterministic per-bird phase). Beats per shot (story.ts comments): shot 1 one
            emu staring down a soldier; 2 the emu wearing the soldier's slouch hat (the cast owner draws the soldier;
            coordinate a hat card on the emu yourself); 4 a wave of thousands pouring over the hill (waveAt) and pecking the
            wheat; 8 ~1000 at the dam; 9 scatter on "twelve" (jamAt.scatter); 11 emus outrunning the truck (chaseAt.lead,
            run cycles, dust); 12 small groups each with a lookout (aerial); 13 one emu camouflaged with leaves/twigs on its
            head in a bush, eyes peeking; 14 emus waving goodbye; 17 emus celebrating around the scoreboard. Keep every emu
            grounded (feet on y=0), never intersecting each other, nothing popping.
- props   : props.ts — the 1930s army truck (open-cab flatbed, olive drab, round headlights, spoked wheels) driving along
            ROAD at chaseAt.truckX with a Lewis gun bolted on the tray, bouncing on ruts, dust trail; two Lewis guns (drum
            magazine, cooling shroud, bipod) for the line-up + the dam ambush (muzzle flashes while jamAt.firing, then a
            smoke puff + a sad spring popping out on "jams"); ammo crates stencilled "10,000 RDS"; a candlestick telephone
            at OFFICE; the SCOREBOARD at SCORE (a hand-painted wooden board "EMUS" / "ARMY" with numbers flipping in by
            scoreAt); the line-up beat at FARM (shot 6: items pop/drop in with lineupAt — the cast owner places the people).
- cast    : cast.ts + fx.ts — humans + effect cards: the farmers (ex-soldiers: slouch hats, rolled sleeves, braces), the
            MAJOR (big moustache, peaked cap, Sam Browne belt, very confident -> baffled), two soldiers (slouch hats with the
            side brim pinned up, khaki), people at the office phone; comic effect cards: "?" and "!" pops, sweat drops,
            speed lines, a phone "RING RING" burst, a NEWSPAPER card (shot 16: an old broadsheet, headline "THE GREAT EMU
            WAR", masthead, fake columns, readable at 2K), a white flag, dust clouds. Comic expressions timed to W cues
            (0-3 frames before the word).
- cam     : (second wave) story.ts camera keys + dofAt only.

## Rules (zero glitches)
- Nothing pops within a visible frame (scale/fade in); no camera inside geometry or within 0.6 m of a card; no coplanar
  surfaces (z-fighting); NOINK for transparent effects; pure functions of (id,t), seeded randomness only; never rely on
  bounding spheres for important meshes (Apollo had screens culled for single frames).
- Performance: merge static geometry, instance repeats, textures <= 2048.
- Typecheck: cd /home/user/remotion-demo && npx tsc --noEmit 2>&1 | grep "sandboxes/em_<name>" | grep -v TS6133
- Stills (CPU shared: frugal, nice -n 5, <= 8 frames per call):
    cd /home/user/remotion-demo && REMOTION_TMP=/home/user/remotion-tmp BRIDGE_ENTRY=src/sandboxes/em_<name>/index.tsx \
      COMP=EmuShort nice -n 5 node scripts/bridge-stills.mjs out/em/<name>/x_ <frames> 0.5
  Frames: standoff 60 | hat 140 | farmers 240 | wave 350,390 | phone 450 | lineup 520,600 | easy 660 | dam 720 |
  jam 805,830 | truck 890 | chase 990,1050 | groups 1140 | guerrilla 1240 | goodbye 1310 | quote 1450 | paper 1590 |
  score 1680,1760.
- ~60 min. Then typecheck and reply with a <= 200-word report (built, still paths, exact positions/contracts for others).
