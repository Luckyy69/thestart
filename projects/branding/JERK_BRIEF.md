# "The Falling Jolt Before Sleep" (hypnic jerk): build brief (shared by all agents)

A SHORT 41 s vertical cartoon short: TOTAL 1230 frames at 30 fps. Final render 2K (1440x2560), rendered in the cloud.
The owner asked: "make it insanely good AND funny". It is short and relatable.

Use our latest shorts (src/videos/voice, hiccup, sneeze) for TECHNIQUE only. Design everything NEW and make the quality
even better.

Requirements:
- ZERO glitches. It renders unattended.
- Backgrounds must NOT be blurry.
- House style: flat bean-head characters (Canvas2D cards) in a colourful, contrasty, painted 3D world with black ink
  outlines.
- Family-friendly.

## THE 4 RULES (the owner's, binding)
1. SCRIPT: a strange fact in line one, no intro. It climbs to one twist: an ancient tree-sleeping reflex, "a tree you're
   not even in".
2. CAMERA: very few cuts. Travel, LAND, then say the important word while still.
3. LIGHT: a low light source, long shadows, blue shade, haze. The light CHANGES when the story turns: night blue →
   golden jungle sunset.
4. FACES: one feeling per line. The big meme face appears ONLY at the peak (shot 4: the ancestor ape jolting awake
   mid-fall).

## Read first
- Script + facts + timings: /home/user/jerk-short/SCRIPT.md and /home/user/jerk-short/voice/words.json
- Timeline + contracts: src/videos/jerk/story.ts. It contains:
  - SHOTS, with the beats in the comments
  - the places BEDROOM, BLOCK and JUNGLE
  - W cues and LOOK_RAMPS
  - the state functions JOLTS, JOLT_WINDOWS, xrayAt, apeAt, leafAt
  - Key everything off these. Never hard-code seconds.
- world.ts calls Sets, Holo, Jungle and Props update(id,t,f,cam), then draws the castAt cards. The composition is
  Jerk.tsx (captions + the watermark top-left at about y 150-215 px). Word timings are in words.ts.
- Technique references (READ-ONLY): src/videos/voice/*, src/videos/hiccup/*, src/videos/sneeze/*.
  Library: src/videos/bridge/*
- Best frames: /home/user/remotion-demo/out/vo/m/*.jpg and /home/user/remotion-demo/out/hi/review/*.jpg

## Ownership (edit ONLY your files, in your sandbox src/sandboxes/je_<name>/videos/jerk/)

### sets: sets.ts + props.ts
**BEDROOM at night**
- A cosy bed against the back wall, mattress top at y 0.55. BEAN lies under a duvet at BEDROOM+(0,0.6,-0.4), head
  toward -x.
- A big window on the back wall (z=-1.4). A low cold moon key and a warm street-lamp glow come through it, throwing long
  window-frame shadows across the bed.
- Nightstand, lamp, alarm clock showing 23:47, posters, a plant, slippers.
- The duvet's lift follows BEAN's jolts. The cast owner draws BEAN; agree a duvet hook with them, or keep the duvet as
  part of the cast card.
- In "xray" the room drops to deep blue.

**BLOCK exterior** at BLOCK+(0,0,0):
- A charming apartment block at night with 10 lit windows (2 columns x 5 floors). BEAN's window must be identifiable,
  e.g. with a red curtain.
- Rooftops, a moon, a street with a lamp, a parked bike.
- Each window shows a bed interior where the cast owner puts a sleeper. Export the window positions as WINDOW_POS[0..9].

**props.ts**: the leaf that floats down onto the pillow in shot 5 (leafAt). Put any small bed props here too.

### jungle: jungle.ts + looks.ts
**The prehistoric JUNGLE at a low golden sunset:**
- A huge ancient tree with a thick, mossy, horizontal branch at JUNGLE+(0,6,0) where the ape sleeps.
- Hanging vines, giant ferns, a misty canopy, god rays, distant volcanoes and pterosaurs.
- The ground 6 m below with a sabre-tooth cat spot at JUNGLE+(0.4,0,1.0). The cast draws the cat.
- Long shadows and haze.

Tune all 4 looks (night, xray, jungle, peak) per RULE 3.

### holo: holo.ts
The X-RAY in shot 3 (xrayAt), over BEAN asleep in bed. It must read instantly on a phone.
- A glowing body outline with its MUSCLES drawn red. On `limp` they droop and go grey, with a "MUSCLES: LIMP" label.
- The BRAIN with a sleepy face, one eye half open ("HALF AWAKE").
- On `alarm` a red "DROP DETECTED" alarm.
- On `panic` the brain screams "WE'RE FALLING!" into a megaphone.
- On `fire` lightning bolts shoot from the brain to every muscle, then everything snaps back.
- Anchor to the cast owner's BEAN in bed (default head at BEDROOM+(-0.75,0.75,-0.4), body along +x). Export positions.

### cast: cast.ts + fx.ts
All characters are Canvas2D cards, all NEW.

**BEAN** (pyjamas with a nightcap, lying under a duvet):
- Every JOLT is a huge comic full-body jolt: he flies up off the mattress, the duvet flaps, hair stands up, then he
  lands wide awake.
- Expressions:
  - asleep
  - JOLT
  - wide-eyed
  - suspicious, with a tree thought bubble (shot 1)
  - asleep (shot 3)
  - jolt, then a proud self head-pat and staring at the leaf (shot 5)

**The 10 window sleepers** (shot 2): different people and a dog. The 7 in JOLT_WINDOWS jolt one after another. The other
3 sleep peacefully.

**The ANCESTOR APE** (cute, round, furry; on the branch): asleep and snoring, then slides off (apeAt.slide), then falls
(drop).
- THE MEME FACE only at the jolt, the peak: eyes bulging, fur standing on end, as it catches the branch with one hand.
- Then dangling.

**The SABRE-TOOTH CAT** below: grinning, then a disappointed sigh.

**FX**: Zzz, JOLT! bursts, motion lines, "!", "?", sweat, sparkles, a "SNORE" bubble.

**Exports**: headAt, mouthAt, handAt.

### cam: second wave. story.ts camera + transitions only.
Transitions:
- 1→2: pull out through the window to the block.
- 2→3: push back in.
- 3→4: a dream dissolve into the jungle.
- 4→5: a jolt cut back to bed.

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
  cd /home/user/remotion-demo && npx tsc --noEmit 2>&1 | grep "sandboxes/je_<name>" | grep -v TS6133
  ```
- **Stills:** CPU is shared, so be frugal: use `nice -n 5` and render ≤ 8 frames per call.
  ```
  cd /home/user/remotion-demo && REMOTION_TMP=/home/user/remotion-tmp BRIDGE_ENTRY=src/sandboxes/je_<name>/index.tsx \
    COMP=JerkShort PROPS='{"noCaptions":true}' nice -n 5 node scripts/bridge-stills.mjs out/je/<name>/x_ <frames> 0.5
  ```
  Use a temporary DEBUG camera of your own if the first-pass cameras don't show your work, but turn it OFF before
  reporting.
- **Frames:** hook 9, 20, 60, 140, 185 | block 235, 250, 265, 300 | xray 420, 470, 530, 590, 652 | jungle 760, 840, 893, 925, 965, 1008 | outro 1050, 1095, 1153, 1225.
- **Budget:** about 90 min (the user said: take your time, make it really good). Then typecheck and reply with a report of ≤ 200 words covering:
  - what you built
  - still paths
  - the exact positions/contracts for the others

