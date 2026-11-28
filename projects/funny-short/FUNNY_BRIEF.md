# "Live Wire" (why hitting your funny bone zaps your pinky): build brief (shared by all agents)

Bean Stories short #17. Vertical cartoon science short, 35.7 s (TOTAL **1072 frames @ 30 fps** = voice 34.53 s + 1.2 s tag),
final render 2K (1440x2560). The bar is growl (src/videos/growl, just finished) and freeze. Make it insanely good AND
FUNNY. House style: flat bean-head characters (Canvas2D cards, ink outlines) in a colourful, contrasty, painted three.js
3D world with black ink lines. Family-friendly. ZERO glitches (renders unattended). **Backgrounds SHARP, not blurry.**
Watermark + captions on (same systems as growl: common/Watermark.tsx, common/Captions.tsx, already wired in Funny.tsx).

## THE 4 RULES (the channel's, binding)
1. SCRIPT: line one is a strange fact ("Your funny bone isn't a bone"). It climbs to ONE twist: it's a nerve with no
   padding = a live wire... and the name is probably a pun: HUMERUS / HUMOROUS. Deadpan button: "It's still not funny."
2. CAMERA: very few cuts. Travel, LAND, then the key word is said while the camera is still. Continuous moves + portal
   transitions. Exactly ONE hard cut moment (the peak, shot 3).
3. LIGHT: low sun, long shadows, blue shade, haze. The light CHANGES when the story turns (see Looks).
4. FACES: one feeling per line. BEAN's MEME face ONLY at the peak (shot 3, "a live WIRE").

## Read first
- Script/facts: /home/user/funny-short/SCRIPT.md; words: /home/user/funny-short/voice/words.json (-> words.ts, generated).
- Timeline + contracts: **src/videos/funny/story.ts** (header = every place's layout; SHOTS with every beat in the
  comments; BEAT = named frames; W = word starts (s), WF = word frames; LOOK_RAMPS; SUN_FROM; state functions hookAt,
  armAt, peakAt, surgeAt, museumAt, endAt; ELBOW_L; CAMS / RIDE). Key everything off these. NEVER hard-code seconds.
- world.ts (lead-owned) calls Sets, Arm, Props `.update(id,t,f,cam)`, LightFx `.update(id,t,f,cam,sunDir,look)`, then
  draws `castAt()` character cards + `fxAt()` effect cards. Composition = Funny.tsx (captions + watermark).
- Safe zones (1080x1920): watermark top-left (x < 420, y 150-215); captions centred at y ~1345 (band ~1270-1420).
  Keep faces, the plaque text and key gags out of both.
- Technique (READ-ONLY): growl/* (sets_kit.ts + sets_tex.ts = a room with its own light rig, belly.ts = a giant organic
  interior, staff.ts = a cosy room, cast.ts/fx.ts = cards incl. a meme face), freeze/* (mouth.ts has a glowing NERVE
  cable + pulse; hq.ts; its peak = a hard cut to the meme face), bridge/* (library). Quality bar: freeze/growl stills in
  /home/user/remotion-demo/out/fz/ and out/gr/.

## Places (separate world offsets; full layout in the story.ts header)
| place | offset | what |
|---|---|---|
| HALL | (0,0,0) | sunny family hallway, low warm MORNING sun from the END window (x +5). Kitchen doorway in the back wall (z -1.4, opening x -0.45..0.45, h 2.05). BEAN walks OUT of the kitchen toward the lens with a heaped laundry basket, BONKs his right elbow on the LEFT jamb, then stands at HALL+(0.1,0,-1.15). |
| ARM | (1000,0,0) | inside BEAN's arm, giant scale: an HOURGLASS of two fleshy chambers (upper arm x -18..-2, forearm/hand x +2..+26) joined by a LOW ELBOW ARCH at x 0. The nerve = a glowing yellow POWER CABLE on posts with lamps, padded everywhere except the elbow, NECK SUBSTATION (-16,0,0) -> elbow gap (thin SKIN ROOF y 2.3) -> PINKY TOWN (pole (16,0,0), PINKY (18.2,0,1.0), RING (18.2,0,-0.5)). |
| MUSEUM | (2000,0,0) | dusty anatomy museum, low late-afternoon sun through the RIGHT windows (x +3.5). SKELLY on a plinth at (0,0,0) facing +z, HUMERUS plaque at (-0.6,1.2,0.3), BEAN visitor at (1.15,0,1.3), PORTRAIT wall = left wall x -3.4 (1840 z -0.6, 1900 z -2.2, 1950 z -3.8, 2026 = BEAN z -5.4). |

## Shot table
| shot | frames | place | look (-> ramps) | beats |
|---|---|---|---|---|
| 1 HOOK | 0-130 | HALL | hall | BONK (12); "funny bone isn't a bone" wince, sock lands on head (40); "definitely not funny" (68-97) glare into the lens; "It's a nerve" (104-113) round X-RAY window over his elbow shows the glowing cable; DIVE into the window (116-136) |
| 2 ARM | 130-433 (dissolve 124-136) | ARM | arm -> skin (312-330) -> zap (398-428) | land on NECK substation "neck" (157); rise + turn down the line, the WHOLE cable through the elbow arch to Pinky Town "pinky" (189); glide to the elbow "elbow" (225); "squeezes through a tiny gap" (250-284) cable squeezes in; "no padding" (296-301) sign-holder; tilt up "just skin" (331-338) roof glows; "when you whack it" door-frame shadow (367), SLAM (378), roof dents; sparks build "live" (429) |
| 3 **PEAK** | 433-462 (**HARD CUT in**, flash 433) | HALL | peak | "WIRE" (437): BEAN ELECTROCUTED, the MEME face |
| 4 SURGE | 462-612 (dissolve 458-466) | ARM | zap -> town (492-514) | the same long view: the light front races along the WHOLE line, lamps pop on (still camera) "whole line lights up" (464-487); RIDE down the line THROUGH the elbow arch into Pinky Town (490-516); "pinky screams" (526-536) PINKY screams, RING half-screams; "totally fine" (579-593) PINKY stops, pats himself, band-aid anyway (587); rise into the glow |
| 5 MUSEUM | 612-992 (dissolve 604-620) | MUSEUM | museum -> pun (876-884) | descend from the skylight, land wide "weird part" (635-642); BEAN "?" "Why funny?" (672-680); SKELLY smirks "probably a pun" (713-729); SKELLY taps its upper arm (777), push in to the plaque "humerus" (807), hold "Humerus..." (840); FLIP -> HUMOROUS "humorous" (881) + spotlight + ba-dum-tss (886); glide to the 1840 portrait, it LAUGHS "joke" (949); truck along the row (1900, 1950 laugh in turn) to BEAN's 2026 portrait, unamused "years" (983); PORTAL: push INTO his portrait (984-998) |
| 6 END | 992-1072 (dissolve 986-998) | HALL | hallend | the portrait becomes the real doorway: BEAN, a PILLOW taped to his elbow, deadpan into the lens: "It's still not funny." (1001-1029); hold; he walks out right (1041); offscreen BONK (1056) + "zzt" |

Transitions: 1->2 crash-zoom into the x-ray window + dissolve, fall into the upper-arm chamber | 2->3 the ONE hard cut |
3->4 an 8-frame electric dissolve | 4->5 rise into Pinky Town's glowing skin sky, dissolve to the museum skylight,
descend | 5->6 PORTAL: push into BEAN's 2026 portrait, dissolve to the matching hallway framing (cast: paint the
portrait as BEAN in that doorway, same composition as camera C6).

## Beat list (frame per key word; story.ts W / WF / BEAT)
bone 17, bone2 37 | definitely 68, funny2 85 | nerve 113 | neck 157 | pinky 189 | elbow 225 | squeezes 250, tiny 273,
gap 284 | no 296, padding 301 | just 331, skin 338 | whack 376 | live 429, **wire 437** | whole 464, line 472, lights 479,
up 487 | pinky2 526, screams 536 | totally 579, fine 593 | now 625, weird 635, part 642 | why 672, funny3 680 |
probably 713, pun 729 | right 777 | humerus 807 | humerus2 840 | humorous 881 | people 919, joke 949 | almost 960, two 968,
hundred 974, years 983 | its3 1001, still 1007, not2 1013, funny4 1017 (voice ends 1036).

## THE PEAK: frame 436
Hard cut at 433 (BEAT.peak, with one decaying flash); the meme face is FULLY on by **436** (BEAT.peakFace), one frame
before "wire" (437); hold to 458, dissolve out 458-466. Why here: the zap is the physical payoff of the hook (we saw the
whack happen in the hallway, then saw WHY from inside); "live WIRE" is the exact metaphor word; cutting from the dark,
sparking arm interior to the bright hallway is the biggest light + scale jump in the film, and it lands at the 41 %
mark, leaving the second half to climb to the pun twist without competing with it.

## Audio cue frames (sound designer)
| frame | cue |
|---|---|
| 12 | WHACK 1: elbow BONK on the door jamb (wood thunk + a tiny "zing") |
| 40 | sock lands on head (soft flop) |
| 102 | x-ray window opens (whoosh + ding) |
| 116-136 | dive whoosh |
| 157 | neck substation hums on |
| 250-284 | cable squeezing (rubbery squeak) |
| 296 | sign flip-up (card flap) |
| 367 | door-frame shadow (low rumble) |
| **378** | WHACK 2: the giant door frame SLAMS the skin roof (huge THUD + kick) |
| 405-432 | sparks crackle, building |
| **433** | ZAP SURGE: hard cut, big electric zap, meme face (through 458) |
| 458-490 | the whole line lights up: rising zing + lamp dings in sequence |
| 490-516 | ride whoosh through the arch |
| **526-550** | SCREAMS: PINKY "AAAA!" (+ RING's half-scream from 529) |
| 587 | band-aid slap / pat pat |
| 596-620 | rise + dissolve whoosh; museum room tone from 612 |
| 777 | SKELLY taps its humerus (tok tok) |
| **878** | LABEL FLIP (split-flap clack) |
| 886 | rimshot: ba-dum-tss |
| **947** | 1840 portrait LAUGH (dusty old guffaw); more laughs 960, 968, 974 (other eras) |
| 984-998 | portal whoosh |
| **1030** | deadpan STING after "funny" |
| 1056 | offscreen BONK + "zzt" (1059) |

## Looks (looks.ts; first pass in place)
hall (warm low morning sun down the hall, honey stripes, blue shade) -> arm (warm red-orange cavern lit by the yellow
cable) -> skin (sun glowing THROUGH the skin roof: hot peach) -> zap (dark violet, the cable + sparks blaze cyan-white)
-> **peak** (the hallway under a hard electric-blue key, navy shade) -> zap -> town (cosy lamp-lit dusk) -> **museum**
(THE TURN: dusty amber beams, sepia haze) -> pun (the room dims, a stage spotlight on the plaque) -> hallend (the hallway,
lower + cooler + flatter: deadpan). SUN_FROM {3:1, 4:2, 6:1}: looks sharing a shot (or a SUN_FROM pair) must keep equal
sunAz/sunEl (arm = skin = zap = town; hall = peak = hallend).

## Sandboxes + ownership
Each agent works ONLY in its own sandbox copy `src/sandboxes/fn_<name>/videos/funny/` (already created from the base;
merge base = /home/user/lookmatch/funny_base). Edit ONLY your owned files; you may ADD files with your own prefix. Do NOT
edit story.ts / world.ts / Funny.tsx / words.ts (lead-owned). If you need a state value story.ts lacks, derive it
locally from W/BEAT and tell the lead. Other modules' exports in your sandbox are PLACEHOLDERS with the final names and
types: code against the names; the lead merges.

### 1. SETS: `sets.ts`, `sets_*.ts` (sandbox fn_sets)
Contract (keep names/types): `DOOR {x0,x1,h,z,t}`, `JAMB_HIT: V3`, `type Win`, `WINDOWS: Win[]`, `PLINTH_TOP: V3`,
`PORTRAITS: {c,w,h,year}[]`, `MU_WALL_X`, `class Sets { root; update(id,t,f,cam) }` (hide each place by SHOTS place).
Build (technique: growl/sets_kit.ts hallRig = a room with its own shader light rig, sets_tex.ts = painted textures):
- HALLWAY (shots 1, 3, 6): warm wooden floorboards, a long red runner rug, cream wallpaper with a subtle stripe, white
  skirting + dado rail, the KITCHEN DOORWAY (chunky white painted jambs with a few dents/chips on the LEFT jamb at elbow
  height = previous victims, ha), a bright sunny yellow kitchen visible behind (fridge with magnets, a window, a plant).
  The END window (x +5) throws long honey stripes of low sun down the floor (window frame + a plant silhouette in the
  stripe). Family photos on the wall (BEAN as a baby, a dog), a coat rack with a yellow raincoat, a radiator, a
  "HOME SWEET HOME" sampler, a little side table with a phone. Shot 6 "hallend": same set (the look does the light).
  Peak (shot 3) camera is ~1.25 m in front of BEAN looking at -z: the wall/doorway behind him must read crisp.
- MUSEUM (shot 5): a dusty old anatomy gallery: creaky parquet, tall arched windows on the RIGHT wall with long amber
  beams, a skylight, wood-and-glass display cases (a jar of teeth, a giant ear model, a brain in a jar), velvet rope
  stands, a "PLEASE DO NOT TOUCH THE BONES" sign, the SKELETON PLINTH (cream marble, brass nameplate "SKELLY, est.
  1888"), the PORTRAIT WALL (deep green wallpaper, four ornate gilt frames at PORTRAITS[i]: the faces inside are cast
  cards; frames 4 cm proud of the wall, the canvas card sits at x -3.37). The 2026 frame should be a cheap modern
  black frame (gag). Dust motes are lightfx's; the plaque stand is props'.

### 2. ARM: `arm.ts`, `arm_*.ts` (sandbox fn_arm)
Contract: `CABLE_PTS: V3[]`, `cablePt(u): V3` (u 0 = neck, 1 = town pole top, arc length), `CABLE_LEN`, `CABLE_R`,
`ELBOW_U`, `NECK_AT`, `ELBOW_GAP`, `BONE_KNOB`, `ROOF_Y` (LOCAL y; ARM y = 0), `ROOF_SPAN`, `roofDent(id,t,lx)`,
`SIGN_AT`, `TOWN_POLE`, `PINKY_AT`, `RING_AT`, `PINKY_HOUSE`, `RING_HOUSE`, `OTHERS_AT`, `LAMPS: {p,u}[]`,
`surgeSpan(id,t): {lo,hi,k}`, `class Arm { root; update(id,t,f,cam) }`. You may move points slightly (tell the lead);
keep the cameras' clearances (camera paths in story.ts CAMS/RIDE shots 2 + 4, the RIDE flies through the arch at
y ~1.55, z ~0.55).
Build (technique: growl/belly.ts + belly_kit.ts, freeze/mouth.ts's nerve):
- The hourglass cavern: glossy warm red-pink walls of giant striped MUSCLE ropes, the ceiling lined with huge pillowy
  yellow-cream FAT cushions (padding!), the long white HUMERUS ridge on the -z wall of the upper chamber (faint stencil
  "HUMERUS" on the elbow boulder: foreshadowing), the walls pinching into the low ELBOW ARCH. Must read on a phone as
  "inside an arm" and as a POWER LINE.
- The CABLE: thick glowing yellow-orange cable with a rubbery insulation sheen, stitched/zip-tied into fluffy pink
  padding cushions along its whole length EXCEPT the gap; short wooden posts each with a little lamp; route signposts
  ("NECK", "ELBOW 2 km", "PINKY TOWN ->", "CAUTION: LIVE"). NECK SUBSTATION: a cute junction box / transformer with
  "NECK - C8/T1" plate, dials, hum glow on armAt.neck.
- The ELBOW GAP: the cable squeezes through between the bone knob and the muscle wall (armAt.squeeze: a bulge travels
  through, the cable "sweats": maybe little sweat drops = ask cast/fx), the THIN SKIN ROOF (translucent peach membrane,
  sunlight glowing through on armAt.skin, giant hair stalks silhouetted outside, pores), the door-frame SHADOW darkening
  it on armAt.shadow, the DENT (roofDent) pressing down onto the cable on the whack.
- The SURGE: in shot 2 armAt.spark = the cable glows white-hot at the dent; in shot 4 surgeSpan: the cable + lamps
  blaze from the elbow outward along the WHOLE line (the front is an emissive band; lamps pop on with a tiny overshoot,
  no pops), then calm to a warm glow. Keep a residual dent (~0.35) in the roof in shot 4.
- PINKY TOWN (hand chamber): a tiny cosy town under the glowing skin sky: the power POLE with insulators, wires to
  PINKY's cottage (pink, a fingernail-shaped roof) and RING's cottage (blue, wired on only HALF: half its windows light
  up), a sign "PINKY TOWN - POP. 1 1/2", streetlamps, a fence, flower pots; further back the other fingers' houses on a
  separate pole line "MEDIAN NERVE CO." whose lamps NEVER light (they stay calm). Above the town the skin sky glows
  (the 4->5 rise dissolves into it).

### 3. CAST: `cast.ts`, `cast_*.ts` (sandbox fn_cast)
Contract: `castAt(id,t,cam,light): Stage`, `headAt(id,t,who)`, `beanHallAt(t)`, `BEAN_SC`, `BEAN_HALL`, `KITCHEN_FROM`,
`ELBOW_HALL` (== story ELBOW_L: the x-ray window + dive target, keep his elbow there in shot 1), `BEAN_MU`, `SKELLY_AT`,
`SKELLY_SC`, `HUMERUS_PT`, `FOLK_SC`, re-exported `PINKY_AT/RING_AT/SIGN_AT`. Add `handAt` if fx needs it.
All drawings NEW (technique: growl/cast.ts + fx.ts drawings, bridge/toon.ts Pen). Expressions land 0-3 frames before
their word. One feeling per line.
- BEAN (shots 1, 3, 5, 6): striped tee, socks, messy hair. Shot 1: walks out carrying a heaped LAUNDRY BASKET (socks,
  a rubber duck on top), BONK (hookAt.whack: squash on impact, the basket jolts), WINCE (eyes squeezed, teeth gritted,
  hugging his elbow with the basket on his hip), the SOCK lands on his head (hookAt.sock: fx owns the flying sock, you
  show it on his head from 40), GLARE into the lens (hookAt.glare: flat unamused stare, one eyebrow down: one feeling).
  Shot 3 **THE MEME** (peakAt.zap): ELECTROCUTED: hair blasted straight up in spikes, eyes huge and bulging, a rigid
  rectangle grimace showing all teeth, body rigid, the arm flashes X-RAY (glowing bones visible through the sleeve), the
  basket's laundry blasting upward, alternating 2 drawings on peakAt.buzz (jitter, not strobe). Shot 5 visitor: an ICE
  PACK strapped to his elbow, looking up at SKELLY, "?" on museumAt.ponder. Shot 6: a big PILLOW taped to his elbow,
  DEADPAN (half lids, flat mouth, endAt.deadpan), then turns and walks out right (endAt.exit).
- The NO PADDING sign-holder (shot 2): a little hard-hat nerve-cell worker (safety vest, clipboard) who lifts a big
  "NO PADDING" sign on armAt.noPad with a shrug.
- PINKY + RING (shot 4, ~1.2 m in ARM metres): finger-shaped folk with fingernail caps. Calm -> on surgeAt.scream PINKY
  SCREAMS (hair up, mouth huge, smoke curls), RING half-screams (ONLY his left half zapped: half hair up, one eye wide,
  the other half calmly sipping tea). On fine: PINKY stops mid-scream, pats himself down... fine. surgeAt.bandaid: slaps
  a band-aid on anyway, deadpan. (Optional: the other fingers far back, unbothered, sipping tea.)
- SKELLY (shot 5, fixed-yaw card facing +z, ~1.75 m): a friendly museum skeleton: smirk/side-eye on museumAt.smirk, taps
  its own upper arm (HUMERUS_PT) on museumAt.tap, jaw clacks laughing on museumAt.skLaugh.
- PORTRAITS (shot 5, fixed-yaw cards in the frames, yaw +PI/2, at PORTRAITS[i]): 1840 gentleman (mutton chops, top
  hat, monocle), 1900 lady (huge feathered hat), 1950 dad (cardigan, pipe), each painted in an old-paint style, each
  bursts into LAUGHTER on laugh0/1/2/3 (monocle pops out!). The 2026 frame = BEAN, unamused, pillow on elbow, painted
  as the SAME composition as the shot 6 camera (the portal match).

### 4. PROPS + FX: `props.ts`, `props_*.ts`, `fx.ts`, `fx_*.ts` (sandbox fn_fx)
Contract: `PLAQUE_AT`, `PLAQUE_SIZE`, `frameY(id,t)`, `class Props { root; update(id,t,f,cam) }`,
`fxAt(id,t,cam): FxPlace[]`.
- props.ts (3D): the giant DOOR FRAME (shot 2): a huge painted white wooden jamb edge (chipped paint, a giant wood
  grain) seen through/above the skin roof: its shadow first (armAt.shadow), then it SLAMS down on armAt.whack riding the
  roof dent (no interpenetration with the roof: use roofDent). The HUMERUS PLAQUE (shot 5): an engraved brass plaque on
  a little brass stand by SKELLY's upper arm; museumAt.glint = a glint sweep; museumAt.flip = a crisp split-flap flip
  (overshoot + settle) to HUMOROUS (same engraving style, a tiny rimshot wobble).
- fx.ts (cards): shot 1 BONK star + wood splinter bits at JAMB_HIT (12), the flying SOCK (12-40), pinky zing squiggles,
  the round X-RAY WINDOW over ELBOW_HALL (hookAt.xray: scales in, a cartoon x-ray lens showing the bone + the glowing
  yellow cable, pulse on hookAt.pulse); shot 2 sweat drops on the squeezing cable, "WHAM!" + dust on the slam (378),
  crackling sparks + little arcs at the dent (armAt.spark); shot 3 lightning bolts round BEAN, "ZZZAP!" letters, flying
  laundry, smoke puffs (two-drawing buzz, no strobe); shot 4 the LIGHTNING FRONT racing along the cable (cards at
  cablePt(surgeSpan.lo/hi)), lamp sparkle pops, "AAAAA!" letters over PINKY + a small "aa" over RING, a "fine" sparkle
  on the band-aid; shot 5 "BA-DUM-TSS" (with a little drum kit icon), "HA HA HA" puffs + DUST clouds from each
  laughing portrait (museumAt.dust); shot 6 the offscreen BONK star at the right frame edge (1056) + "zzt".

### 5. LOOKS + LIGHT: `looks.ts`, `lightfx.ts`, `lightfx_*.ts` (sandbox fn_looks)
Contract: `LookDef`, `LOOKS: Record<Look, LookDef>` (all 9 looks), `class LightFx { root; update(id,t,f,cam,sunDir,look) }`.
- looks.ts: tune ALL 9 looks per RULE 3 (the first pass + the colour arc are in the file header). Equal az/el inside
  each sun group (see Looks above). Check every look on stills, including the ramps (320, 415, 505, 880).
- lightfx.ts (all NOINK, transparent, depthWrite false): haze SHAFTS from the hallway END window and the museum's
  right windows (sets.WINDOWS) aligned with the frozen sunDir, drifting DUST MOTES in the museum beams, the warm glow
  pool under the arm's skin roof (shot 2 skin), soft lamp halos in Pinky Town, the museum stage SPOTLIGHT cone on the
  plaque (look pun), a cold electric rim/haze in the peak. Keep backgrounds SHARP: glow, don't fog out detail.

### cam (lead, second wave): story.ts CAMS / RIDE only, after the merge.

## Rules (zero glitches)
- No pops: nothing pops within a visible frame. Scale or fade things in.
- Camera clearance: the camera is never inside geometry and never within 0.6 m of a card.
- No z-fighting: no coplanar surfaces. Transparent effects go on NOINK.
- Deterministic: everything is a pure function of (id,t). Seeded randomness only.
- No bounding-sphere culling on big/animated meshes (frustumCulled = false).
- Performance: merge static geometry, instance repeats, textures <= 2048, CPU-friendly frames.
- Typecheck: `cd /home/user/remotion-demo && npx tsc --noEmit -p . 2>&1 | grep "sandboxes/fn_<name>" | grep -v TS6133`
- Stills (shared CPU: nice -n 15, <= 8 frames per call, one render at a time):
  `cd /home/user/remotion-demo && REMOTION_TMP=/home/user/remotion-tmp BRIDGE_ENTRY=src/sandboxes/fn_<name>/index.tsx COMP=FunnyShort PROPS='{"noCaptions":true}' nice -n 15 node scripts/bridge-stills.mjs out/fn/<name>/x_ <frames> 0.5`
  The first-pass cameras are rough: use a temporary DEBUG camera in your own module if they don't show your work, but
  turn it OFF before reporting.
- Check frames: hook 12, 40, 85, 113 | arm 157, 189, 225, 284, 301, 338, 378, 425 | peak 436, 450 | surge 470, 487, 503,
  536, 593 | museum 640, 680, 729, 807, 885, 949, 983 | end 1010, 1030, 1060.
- Budget ~90 minutes. Then typecheck and reply with a report of <= 200 words: what you built, your still paths, the
  exact positions/contracts you changed or added.
