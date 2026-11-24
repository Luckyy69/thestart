# Look-match brief (shared by all agents)

Goal: make our two cartoon shorts look as polished as the reference style: "flat 2D bean-head characters with ink
outlines in a colourful, contrasty, painted 3D world with black ink lines, depth-of-field, rich targeted colour and
moody/dramatic lighting". The user says ours looks like "a cheap copy": dull, low contrast, flat lighting, bland
textures, empty sets, characters look worse, the world ink outline is weak/missing, little depth. Also "it glitches
in places". Make it as close in QUALITY and LOOK as possible. NEVER copy the reference's stories, characters,
shots, signs or text: our stories/characters stay our own; we match the look only.

## Images
- Reference frames: /home/user/lookmatch/ref/ (space_*.jpg, japan_*.jpg = the two clips the user sent, 1080x1920;
  short*.jpg = 38 more reference frames at 540x960). Reference contact sheets: ~/.claude/skills/cartoon-3d-short/references/sheets/
- Measured reference targets (numbers!): ~/.claude/skills/cartoon-3d-short/references/reports/*.md and STYLE_BIBLE.md, and
  the "Final look values" + "Look targets" + "Gotchas" + "Readability traps" sections of ~/.claude/skills/cartoon-3d-short/SKILL.md
- Our current frames: /home/user/lookmatch/ours/ (gimli_<sec>.jpg = the plane short, scorchie_<sec>.jpg = the skyscraper short)
- Frame-by-frame QA of our finished videos (glitch hunting): /home/user/lookmatch/qa_gimli.txt, qa_scorchie.txt and the
  contact sheets in /home/user/lookmatch/qa_gimli/, qa_scorchie/ (may still be being written for a few minutes)

## Code (Remotion + three.js, project /home/user/remotion-demo)
- Main code: src/videos/{bridge,gimli,scorchie,common}. bridge/* = the shared look library (toon.ts characters, cast.ts
  card placement, cardshade.ts card lighting, shade.ts two-tone world shading, lights.ts light presets, grade.ts colour grade,
  ink.ts outline pass, lensblur.ts DOF). gimli/* = the plane short (world.ts, story.ts shots/cameras, plane.ts, fx.ts,
  Gimli.tsx composition + post chain). scorchie/* = the skyscraper short (world.ts, story.ts, fx.ts, Scorchie.tsx, voice2.ts).
  common/Captions.tsx = subtitles.
- NOTE: the bridge template (src/videos/bridge/*: its own world.ts/build.ts/paint.ts) reached a good look; our gimli/scorchie
  worlds were written fast and do NOT use most of its craft (painted HD textures, rich props, the reference fog values, etc).
  Our worlds also multiply fog distances (x2..x4) which washes nothing out but kills depth cues; lights.ts presets are shared.
- YOU WORK ONLY IN YOUR SANDBOX: /home/user/remotion-demo/src/sandboxes/<name>/videos/... and edit ONLY the files you own.
  Ownership (merge copies only these):
  - world  : gimli/world.ts
  - grade  : bridge/lights.ts, bridge/shade.ts, bridge/grade.ts
  - char   : bridge/toon.ts, bridge/cast.ts, bridge/cardshade.ts
  - post   : bridge/ink.ts, bridge/lensblur.ts, gimli/Gimli.tsx, common/Captions.tsx   (Scorchie.tsx is merged by hand from your Gimli.tsx changes)
  - cam    : gimli/story.ts
  - props  : gimli/plane.ts, gimli/fx.ts
  - scorch : scorchie/world.ts, scorchie/story.ts, scorchie/fx.ts   (its sandbox renders ScorchieShort)
  Do not change exported names/signatures other files use (contracts). If you need another owner's change, say so in your report.
  Do not change story timing (shot a/b frames, word cue times) — the voice and the sound mix are locked to them.
- Render stills of your sandbox (CPU only, 4 cores shared by ~8 agents: be frugal, max ~8 render calls total, few frames each):
    cd /home/user/remotion-demo && REMOTION_TMP=/home/user/remotion-tmp BRIDGE_ENTRY=src/sandboxes/<name>/index.tsx COMP=GimliShort \
      nice -n 5 node scripts/bridge-stills.mjs out/lm/<name>/x_ 80,1300,1660 0.5
  (COMP=ScorchieShort for the scorch sandbox; frames are the composition's frames; 0.5 = half size stills; each call bundles ~40 s first.)
  Typecheck: cd /home/user/remotion-demo && npx tsc --noEmit 2>&1 | grep sandboxes/<name> | grep -v TS6133
  Compare side by side: python scripts/sbs_sheet.py out.jpg --ours a.jpg b.jpg --ref r1.jpg r2.jpg (or PIL).
- Gimli shots (frames, 30 fps): 1 0-161 cruise hook | 2-4 161-478 airport | 5 478-701 kitchen | 6 701-810 takeoff | 7 810-971 cruise,
  engines stop | 8-9 971-1132 cockpit | 10 1132-1236 aerial racetrack | 11 1236-1337 racetrack crowd | 12 1337-1573 slip |
  13 1573-1716 landing/sparks | 14 1716-1792 extinguishers | 15 1792-1865 walk away | 16 1865-2090 cruise finale.
- Time budget: ~45 minutes. Then stop, make sure your sandbox typechecks, and reply with a <=200-word report: what you changed
  (file + what), before/after still paths, and anything another owner must do.
