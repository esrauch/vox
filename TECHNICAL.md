# Fourth & Ghoul: Technical

This doc covers how we build it: the stack, the architecture, the beat clock, rendering, UI, audio, and how assets get made and sourced. It builds on [THEME.md](THEME.md) and [GAMEPLAY.md](GAMEPLAY.md).

Items marked **▲ Decision** are recommendations that are still open to change.

---

## 1. Goals and Constraints

- **A web game that loads from a URL.** It plays in a mobile browser, in portrait, with one thumb. Desktop browsers work too (mouse = thumb).
- **Web app only for now.** It's an installable PWA, with no native wrapper.
- **Performance budget:**
  - A steady **60 fps on a mid-range phone** (about 3 years old).
  - **First load under ~5 MB.** A first screen that can be played within a few seconds on 4G.
  - Low battery drain. No needless work between beats.
- **Minimal dependencies.** No game engine. Every runtime dependency has to justify itself in this doc.
- **UI polish is a top priority,** on equal footing with gameplay.
- **Audio is critical.** The beat is the game's clock. If the audio timing is wrong, the game is wrong.

---

## 2. Stack

| Layer | Choice | Why |
|---|---|---|
| Language | **TypeScript** (strict mode) | Safety for a codebase that's mostly Claude-written. |
| 3D | **three.js** | Mature, small enough, and no engine lock-in. |
| UI overlay | **Plain DOM + CSS** | No dependency, crisp text, and the best tools for polish (CSS animation). We'll adopt **Preact** only if menus get complex enough to need it. |
| Audio | **Web Audio API**, used directly | Beat-accurate scheduling. A wrapper like Howler would get in the way. |
| Build / dev | **Vite** | Instant hot reload, TypeScript out of the box, static output. |
| Tests | **Vitest** | Same config as Vite, and fast. |
| Dev tooling | **Playwright** (dev only) | Headless rendering of asset previews, and smoke tests. |

**Runtime dependencies: `three`. That's the whole list.** Preact (about 3 KB) is the only one we've pre-approved adding.

Development-only dependencies can be added more freely, since they never ship to players.

---

## 3. Architecture

### The simulation is separate from rendering

The game is **discrete**: a tile grid that advances once per beat. That makes a clean split possible:

```
        ┌──────────────┐  beat ticks  ┌─────────────┐
 input ─▶│  Simulation  │─────────────▶│  Renderer   │──▶ three.js canvas
 (taps)  │ (pure TS,    │  state diffs │  (animates  │
         │  no three.js)│              │  between    │──▶ DOM overlay
         └──────────────┘              │  beats)     │
                ▲                      └─────────────┘
                │ beat N                      ▲
         ┌──────────────┐                     │ current audio time
         │  Beat Clock  │─────────────────────┘
         │ (audio time) │──▶ Audio (music + SFX scheduling)
         └──────────────┘
```

- **The simulation** (`src/sim/`) is pure TypeScript. It holds the grid, the units, the ball, the Hype and the fumble rules. It advances with `step(state, queuedActions) → nextState + events`, **once per beat**. It has no rendering, no timers and no randomness except a seeded RNG.
- **The renderer** (`src/render/`, `src/ui/`) never changes the game state. It reads the state and its events (`Hopped`, `Caught`, `Fumbled`, `Died` and so on) and animates the transitions *between* beats: hop arcs, squash/stretch, cube bursts.
- **Benefits:** the rules are unit-testable, runs are deterministic and replayable from a seed (useful for debugging, and later for daily runs), and the art can be redone without touching the rules.

### Game flow

A small state machine covers the screens: `Boot → Title → [Setup → Play → Draft]* → GameOver`. Each state owns its DOM overlay and its input handling.

### No ECS framework

The scale is a few dozen units on a 9×16 grid, so plain typed objects and arrays are enough.

---

## 4. The Beat Clock

This is the riskiest system in the project, so it gets built and tested first.

- **The audio clock is the master clock.** The beat comes from `AudioContext.currentTime` and the track's BPM, never from `requestAnimationFrame` or `setTimeout`.
- **Scheduling uses lookahead** (the standard "two clocks" pattern). A short timer schedules audio events slightly ahead of time, at exact audio-clock times. The renderer asks "what beat is it, and how far through it are we?" every frame, and animates to match.
- **The simulation steps exactly on each beat boundary.** Actions you tapped during beat *N* are queued and resolve at beat *N+1*. That's how "everything happens on the beat" works.
- **Beat alignment is not a score mechanic.** There is no separate "perfect timing" judgment or tap window to reward. The music is the shared timing source, and the UI simply reflects it.
- **Latency compensation:**
  - `outputLatency` and `baseLatency` are taken into account where the browser reports them.
  - Device-specific offset checks remain possible for the clock, but they are for sync quality, not a perfect-timing system.
- **Audio unlock:** mobile browsers only start audio after a user gesture. The title screen's first tap creates and resumes the `AudioContext`.
- **Pausing:** when the tab is hidden, the game pauses and suspends the audio context. Resuming starts with a short count-in before play continues.
- **Debug overlay (dev only):** shows the current beat, the measured latency and the frame time.

---

## 5. 3D Rendering

- **Camera:** a fixed, angled ¾ view as in *Crossy Road*. **Decided (M1.3):** perspective with a narrow field of view. Orthographic was prototyped and dropped.
- **The look (2026-10-17):** the camera is pitched **58°** above the horizon, and **every character leans back 35°**: a diorama cheat so faces and jerseys read from above. Both live in `tuning.camera`, and the URL can override them for comparisons (`?pitch=` and `?tilt=`; see `src/render/experiments.ts`). Anything a character holds must lean with it (the ball's held and carried positions do). *Possibly to be tweaked in the M3 feel pass.*
- **Lighting:** one directional "sun" plus a hemisphere fill. Shadows come from **one shadow-casting light with a small shadow map**, or from fake blob shadows under units if phones struggle.
- **Materials:** flat-shaded with **vertex colors**. No textures on voxel models.
  - **Exception:** the **ball cubes** (and similar props) carry one tiny texture each, for the face: skull, jack-o'-lantern, ember cracks.
- **Voxel meshes:**
  - **Greedy meshing** merges matching faces into a few big quads.
  - **Only visible faces** are kept.
  - Repeated units (all the Rattlebones) share their geometry through **InstancedMesh**.
  - The field tiles of a screen are merged into one mesh per strip.
- **Effects:**
  - **Cube bursts:** one shared `InstancedMesh` pool of small cubes with simple physics, recycled.
  - **Hit-pause:** the renderer holds the animation time. The *beat* never pauses; hit-pause only stretches the animation inside the current beat.
  - **Screen shake** is an offset on the camera.
  - **Squash and stretch** are scale animations on the unit's root node.
- **Field indicators** (the reticle, landing rings, facing arrows, hazard warnings, the throw-range ring) are three.js meshes lying flat on the tiles. They live in 3D space, so they belong there rather than in the DOM.
- **Screen transitions:** the camera scrolls up one screen while the next screen's strips are built in the background.
- **Mobile performance:**
  - The pixel ratio is capped at around 2, with a dynamic resolution fallback.
  - Keep draw calls low (target under ~100) and don't allocate memory in the frame loop.
  - Stop rendering completely while paused.

---

## 6. UI Overlay (DOM)

**Plain DOM and CSS, layered over the WebGL canvas.** We'll adopt Preact if the menus or draft screens get hard to manage by hand.

- **Layering:** the canvas fills the screen, and a DOM root sits over it. The overlay doesn't block taps by default (`pointer-events: none`), and only real controls accept them.
- **What lives in the DOM:**
  - The title screen and menus.
  - The draft cards and the game-over roll call.
  - The HUD: the ball pile, the yards, the **Hijink icons** and the Hype meter. (Aiming happens on the canvas, so the HUD has no throw button.)
  - Settings and credits.
- **Polish toolkit:**
  - CSS transitions and keyframes, animating only `transform` and `opacity`, which stay smooth on phones.
  - CSS custom properties for team palettes, set from the same palette data as the voxels.
  - SVG for icons and card art.
- **Syncing UI to the beat:** UI animations that should be on the beat (e.g. pulses on Hijink icons) are driven from the beat clock in JavaScript. CSS's own timing would drift.
- **Phone layout:**
  - Safe-area insets (`env(safe-area-inset-*)`) for notches.
  - The `100dvh` viewport unit for the full screen height.
  - Large thumb targets at the bottom of the screen.
  - The game is built for portrait, and shows a "rotate your phone" card in landscape.
- **Fonts:** one chunky display face and one readable UI face, both **OFL-licensed and self-hosted**, so no font-CDN dependency.

---

## 7. Input and Haptics

- **Pointer Events** cover touch and mouse together.
- **Stopping browser gestures:**
  - `touch-action: none` on the game surface, plus preventing double-tap zoom, pinch zoom, pull-to-refresh and text selection.
  - The long-press menu is suppressed.
- **Tap routing:**
  - **Aiming:** during play, a press anywhere on the canvas starts a slingshot pull, using pointer capture. The pull vector maps to a free target point (`tuning.aim.tilesPerPixel`), and the release's `timeStamp` decides which beat the throw resolves on.
  - **Button taps** (Hijinks, HIKE) are handled by DOM elements.
  - **Setup drags** move players between tiles.
- **Haptics:** `navigator.vibrate` for throws, catches, fumbles and the beat tick.
  - **Known limitation:** iOS Safari doesn't support vibration. On iOS, the beat has to be readable from visuals and sound alone (it already is by design).

---

## 8. Audio

Everything goes through **one `AudioContext`**, with a small mixer: `master → (music bus, SFX bus, UI bus)`. Each bus has its own gain and a light compressor on the master.

### Music is synthesized

- **Songs are data,** not audio files. Each song has a BPM, a time signature, patterns (note sequences per instrument), an arrangement, and **stems**: separate layers such as drums, bass, lead and organ.
- **A small built-in synth** (`src/audio/synth/`) has oscillators, filters, envelopes, noise and simple drum voices. Together these cover surf guitar-ish leads, organ, plucks, kicks, snares and hats.
- **▲ Decision: render the songs at load time, not live.** Each song's stems are rendered to `AudioBuffer`s with an `OfflineAudioContext` while the game loads (and cached), then played as perfectly looping buffers.
  - **Why:** it's still all synthesized (no music files, tiny downloads), but it plays back at near-zero CPU cost and with sample-accurate loops.
  - **Live synthesis** stays an option for reactive layers later.
- **Layering:** the setup huddle plays only some stems (bass and hats). **HIKE!** brings in the full arrangement on the next beat (a bar line felt too slow to wait for), and the beat clock starts on that beat, so the music *is* the clock.
- **Notation:** each stem is one string per bar: notes like `A3`, chords like `A3+C4+E4`, `-` to hold, `.` to rest, and `x`/`X` for drum hits (`src/audio/synth/notes.ts`).
- **Tempo per biome:** each biome's song has its own BPM. Changing tempo means switching songs, which happens on a screen transition, never mid-play.
- **The chant** ("FEE! FI! FO! FUMBLE!") is a stinger that lands on the beat, made either from synthesized vocal-ish sounds or from a recorded public-domain or CC0 sample.

### Sound effects

- **Mostly synthesized,** using **sfxr-style parameter sets** (wave, envelope, pitch slide, and so on) rendered to buffers at load. Every effect is a few lines of data that Claude can write and tweak.
- **Some samples:** public-domain or CC0 recordings for things synthesis does badly, such as crowd cheers, gasps and voices.
- **Playback:**
  - **Voice limits** per sound, so that twenty Rattlebones hopping don't stack twenty clicks.
  - **Small random pitch variation** so repeats don't sound robotic.
  - **Beat-aligned SFX** (hops, traps) should be scheduled on the audio clock, not when the frame happens to render. *(As of M1.5, event sounds play when the beat is heard, so they land one output-latency late. Scheduling them ahead is an M3 task.)*
- **Sample format:** **MP3** (universal, small). Gapless looping isn't needed, since all the looping music is synthesized.

---

## 9. Content and Data

All game content is **typed data**, kept separate from the engine code. That keeps it easy for Claude to add content and for anyone to tune the balance.

```
src/content/
  team.ts         // the team: helmet/jersey colors, ball, slot count
  smalls.ts       // the Walk-on plus every recruit kind: Hustle/Hands/Heft, role, look
  places.ts       // each haunted place: defenders, hazards, recruit/card/Hijink pools, palette, song
  defenders.ts    // defender kinds and behaviors
  hazards.ts      // hazard types and their beat patterns
  biomes.ts       // strip sets, hazard pools, song, palette
  cards.ts        // draft cards: Treats, Tricks, perks
  hijinks.ts      // Hijinks: targeted/global, Hype cost, effect, rhythm bonus
  tuning.ts       // every magic number in one place
```

- Content is checked with TypeScript types, plus a small validation test (every reference resolves, and no stat is out of range).
- **Palettes have a single source of truth** (`src/content/palettes.ts`). It feeds the voxel colors, the CSS custom properties and the SVG fills, so 3D and 2D always match.

---

## 10. Screen Generation and AI

- **Strip-based generation:** a screen is about 15–16 rows of stacked **strips** (turf, defender zone, hazard lane), chosen from the biome's pool by a seeded RNG along a difficulty curve.
- **Solvability check:** setup is a puzzle, so a generated screen must be beatable. A cheap simulated check (can *some* formation and throw timing get a player to the top?) rejects unfair screens. It runs at generation time, and in bulk tests during development.
- **AI** is simple, readable rules, decided once per beat:
  - Each player and defender kind has a small decision function that chooses a target tile.
  - **Its intent (next tile) is set one beat ahead**, which gives the hop-arrow telegraph for free. Models never turn to face it.
- **Collisions** are resolved within the simulation step, in a fixed order, so they're deterministic.

---

## 11. Asset Pipeline: Voxel Models

We support **two source formats**, both converted into one runtime format.

### A. Text voxel format (`.voxt`): the main one, written by Claude

A plain-text format that Claude can write, read and diff: a palette legend, then slices from bottom to top, each one a grid of characters.

```
# rattlebone.voxt
size 5 5 7
palette
  . = empty
  w = bone       # resolves to palettes.ts
  k = eyeblack
layer 0
  .....
  .w.w.
  .....
  .w.w.
  .....
# ...layers 1-6 follow
```

- Colors refer to **named palette entries**, not raw hex values, so changing a palette recolors everything.
- **Helpers for bigger models (▲ Decision):** symmetry flags (`mirror x`), reusable parts, and simple primitives (a box, a sphere) for big models and props, so Claude isn't hand-typing every slice of a 20-voxel-tall treant.

### B. MagicaVoxel (`.vox`): imports

- For public-domain models, and for anything made by hand in MagicaVoxel.
- Its colors are mapped to the nearest named palette entry, so imports match the art direction.

### Build and runtime

- **`.voxt` is the runtime format.** Vite loads every `.voxt` under `assets-src/voxels/` as text (so edits hot-reload). It's parsed once and greedy-meshed once at load into cached geometry with vertex colors (`src/voxel/`). The models are tiny, so this is fast. If loading ever gets slow, meshing can move into the build.
- **`.vox` files are converted, not loaded.** `npm run import-vox -- model.vox <id>` turns a MagicaVoxel file into `.voxt`, snapping every color to the nearest named palette color. Everything in the game is then in one format.
- **Model ids are paths:** `forest/chaser` is `assets-src/voxels/forest/chaser.voxt`. Folders group models by place (`forest`, `forestProps`) or role (`misc`).
- **Orientation:** a model's front (slice 0) faces the camera, and **models never rotate in play**: an arrow shows each unit's next hop. The only exception is the Witch on a Broom (built facing +x), which faces its flight direction: rotate it 180° when flying left.

### Preview loop (how Claude sees its work)

- **`npm run preview-models`** (`tools/voxels/preview.ts`) renders each model headlessly (playwright-core driving the system Chrome, plus the game's own renderer) to **PNG turntables** in `previews/` (front, ¾ view, side), plus a **contact sheet** per model folder, seen from the game's camera angle.
- Claude writes a model, renders the preview, *looks at the PNG*, and iterates. Scale and color comparisons against the rest of the team are part of every review.
- **A dev-only asset viewer page** (`/dev/models`) does the same thing interactively in the browser.

---

## 12. Asset Pipeline: 2D Sprites and UI Art

- **Created by Claude: SVG.**
  - Icons, Hijink icons, draft-card frames and art, buttons, badges.
  - It scales perfectly, is tiny, can be written as text, and is themed through palette CSS variables.
  - Its style follows the voxel look: chunky, flat colors, bold outlines.
- **Public-domain or CC0 sources:**
  - **Kenney.nl** (CC0 UI packs, icons, fonts, sound).
  - **OpenGameArt.org** and **itch.io**, filtered to CC0 or public domain.
  - **Google Fonts**, OFL-licensed.
- **Raster art** (when unavoidable) is packed into atlases by a small build script and served as WebP with PNG fallback.
- **Keeping the style consistent:** public-domain art gets recolored into our palette (SVG) or palette-mapped (raster). Nothing goes in "as is" if it clashes with the look.
- **The preview loop applies here too:** Playwright screenshots of UI screens at phone size let Claude check layout and polish visually.

---

## 13. Asset Pipeline: Sound and Music

| Asset | Made how | Format |
|---|---|---|
| Music (all songs) | **Claude writes the song data** (patterns, arrangement, stems) | `.ts` data, synthesized and rendered at load |
| Most SFX (hops, throws, catches, cube bursts, UI clicks) | **Claude writes sfxr-style parameter sets** | `.ts` data, rendered at load |
| Organic SFX (crowd, cheers, gasps, voices, the chant) | **Public-domain or CC0 samples**, possibly layered with synthesized ones | MP3 |

- **Sources for samples:** **Freesound.org** (filtered to CC0), **Kenney.nl** audio packs, **OpenGameArt.org** (CC0) and **Sonniss GDC bundles**. Sonniss isn't public domain but is royalty-free, so its license gets checked file by file.
- **How Claude checks audio:**
  - `tools/audio/render.ts` renders a song or SFX to WAV and reports its peak and loudness.
  - It also shows a **waveform or spectrogram PNG**, so Claude can sanity-check levels, loop points and timing it can't hear.
  - **A human listens before anything ships.** That's the one asset type Claude can't fully judge on its own.
- **A dev sound board** (`/dev/audio`) plays every SFX and every song stem, with tempo and mute controls.
- **Mixing:** loudness targets for each bus are set in `tuning.ts`, so every source sits at a consistent level.

---

## 14. Licensing and Credits

- **Every asset file has an entry** in `assets/manifest.json`: source, author, license, link and any changes we made.
- **Allowed licenses:** CC0, public domain, OFL (fonts), and anything else only after explicit review. Claude-created assets are marked as original.
- **The build checks this:** `tools/check-assets.ts` fails the build if any asset file has no manifest entry, or has a license that isn't allowed.
- **The credits screen is generated** from the manifest.

---

## 15. Saving and Settings

- **localStorage**, holding small JSON with a version number for migrations:
  - best score (yards), unlocks (recruits, cards, team looks, places), and seen tutorials;
  - settings: music and SFX volume, **audio latency offset**, reduced motion, haptics on or off.
- **No accounts and no backend.**
- **▲ Decision:** whether to save a run in progress so you can resume it. Recommendation: yes. A phone call shouldn't end a good run. The simulation state is small and serializable, which makes this cheap.

---

## 16. Packaging and Deployment

- **A static site:** `vite build` produces HTML, JS and assets, served from any static host (GitHub Pages, Netlify, Cloudflare Pages).
- **An installable PWA:**
  - a web app manifest (portrait orientation, icon, theme color);
  - a handwritten **service worker** that caches the game for offline play and shows an "update available" prompt when a new version is out;
  - "Add to Home Screen" support, which opens full screen.
- **Known iOS web-app limitations:** no vibration, stricter audio unlock rules, and storage can be cleared by the OS. We design around all three.
- **Out of scope for now:** native wrappers (Capacitor and similar) and app stores.

---

## 17. Tooling and Testing

- **TypeScript strict mode,** plus ESLint and Prettier (development only).
- **Unit tests (Vitest)** cover:
  - the simulation rules (catches, interceptions, fumbles, deaths, Hype);
  - the beat maths (tap judging, scheduling, latency offset);
  - screen generation (seeded output, solvability);
  - content validation.
- **Replay tests:** a seed plus a recorded sequence of inputs must give the same outcome. This guards against accidental rule changes.
- **Dev pages and tools** (deployed alongside the game while we build foundations, so they can be tested on phones; `npm run build:release` leaves them out): a debug overlay (fps, draw calls, beat offsets), cheats (skip screen, give cards, set tempo), `/dev/models`, `/dev/audio`, and `/dev/screen?seed=…` to inspect any generated screen.
- **Device testing:** a regular check on a real mid-range Android phone and a real iPhone, which covers beat feel, frame rate and touch. Desktop emulation isn't enough for timing.

---

## 18. Accessibility

- **Audio latency calibration** (see the beat clock).
- **Playing on mute:** the beat is always visible (everything bounces on the beat) and, where supported, felt (haptics).
- **Teams differ by shape *and* color,** and the palettes are checked for color-blind safety.
- **Reduced motion:** less screen shake, gentler bursts, no camera jolts. It follows the system's `prefers-reduced-motion` setting by default.
- **Large touch targets** and readable text sizes at phone scale.

---

## 19. Project Layout

```
/
├─ index.html
├─ src/
│  ├─ main.ts            // boot, state machine
│  ├─ sim/               // pure rules: grid, units, ball, step(), RNG
│  ├─ beat/              // beat clock, scheduler, input judging
│  ├─ render/            // three.js scene, voxel meshing, effects, field indicators
│  ├─ ui/                // DOM overlay: HUD, menus, draft, styles
│  ├─ audio/             // mixer, synth, song player, SFX
│  ├─ content/           // typed game data, palettes, tuning
│  └─ dev/               // debug overlay, cheats, dev pages (excluded from prod)
├─ assets-src/
│  ├─ voxels/            // .voxt and .vox sources
│  ├─ svg/               // UI and icon sources
│  └─ samples/           // raw public-domain/CC0 audio
├─ assets/               // build output + manifest.json
├─ tools/                // voxel build/preview, audio render, asset checks
└─ tests/
```

---

## 20. Build Order

1. **Beat-clock spike.** Audio clock, synthesized metronome, tap judging, calibration, all on real phones. If this doesn't feel right, nothing else matters.
2. **Simulation core.** Grid, hops on the beat, a throw taking 2 beats, catch/interception/miss, fumbles, the pile of balls. All of it unit-tested.
3. **Minimal render.** Cubes standing in for units, the camera, the reticle, the HUD.
4. **The voxel pipeline.** `.voxt` → mesh → preview PNGs. First models: a Walk-on, the QB, the Jack-o'-Lantern ball.
5. **Synth and the first song.** One Halloween track with stems, plus the core SFX.
6. **First playable** (as scoped in GAMEPLAY.md). Then iterate on feel.

---

## 21. Out of Scope (for now)

Multiplayer, accounts and backends, analytics, localization (we keep text minimal so it stays possible later), native wrappers, and monetization.

---

## 22. Working Notes: How to Pick This Up Again

Everything a future session (human or Claude) needs to carry on without the original conversation. The design lives in THEME.md and GAMEPLAY.md, and progress lives in MILESTONES.md. This section covers **how the code works and how assets get made**.

### State of play (2026-10-17)

- **Done:** M1.0–M1.5 (scaffold, beat clock, simulation, render, voxel pipeline, synth and music), plus the new theme's models: the team, the Forest defenders, props, scenery and hazard models.
- **Next:** wire the hazards into play (M2): Rolling Pumpkin lanes and Witch on a Broom (rules in GAMEPLAY.md, *Haunted Forest hazards*). Then the draft, two recruits, strip-based screen generation, and recruit death effects.
- **Open loose ends:** `main` is **not pushed** (this shell has no GitHub credentials; the user pushes with `git -C /home/esr/Code/vox push origin main`). GitHub Pages must be switched to **Settings → Pages → Source: GitHub Actions** (it currently serves the raw branch, which doesn't work). The iPhone beat test and a human listen of the audio are still pending.

### Environment

- **Node 24 LTS** (`.nvmrc`). Vite 8, Vitest 5, ESLint 10, TypeScript 5 strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`).
- **System Chrome** (`/usr/bin/google-chrome`) is driven by `playwright-core` (`channel: 'chrome'`) for every headless tool. No Playwright browser download is needed. WebGL runs headless via `--use-angle=swiftshader --enable-unsafe-swiftshader`.
- **Dev server:** `npm run dev` (`vite --host`, port 5173). On a phone on the same Wi-Fi: `http://192.168.68.66:5173/` (the game) and `/dev/` (the tools). `.claude/launch.json` has a `dev` config for the Claude desktop Browser pane.
- **Git:** commit messages end with the `Co-Authored-By` line from the session instructions. Commit freely after a verified step; never push (the user does).

### Commands

| Command | What it does |
|---|---|
| `npm run check` | Lint, Prettier check, typecheck, tests, asset-license check. **Run before every commit.** |
| `npm run build` / `build:release` | The build with dev pages included (for phone testing) / without them. |
| `npm run preview-models [ids…]` | Headless PNG turntables → `previews/<id>.png`, plus a contact sheet per folder (`previews/sheet-<folder>.png`) **seen from the game's camera pitch**. |
| `npm run screenshot [seed] [play] [query] [name]` | A headless phone-size (375×812 @2x) capture of the game → `previews/game.png`, or `game-play.png` a moment after HIKE. Extra URL params and an output name allow A/B looks, e.g. `-- 8 play "pitch=58&tilt=35" view-a` → `previews/view-a.png`. |
| `npm run render-audio [song:id \| stem:song/stem \| sfx:id …]` | WAVs plus waveform PNGs in `previews/audio/`, with peak/RMS levels and a loop-seam check. |
| `npm run import-vox -- file.vox folder/name [voxelSize]` | Convert a MagicaVoxel model into `.voxt`, colors snapped to the palette. |

`previews/` is gitignored output: look at the PNGs with an image viewer (Claude: the Read tool).

### Code map (`src/`)

- **`sim/`**: the pure, deterministic rules. No three.js, no DOM, no `Math.random`.
  - `types.ts`: `RunState`, units, ball states (`at: 'qb' | 'flight' | 'carried' | 'none'`), events.
  - `grid.ts`: 9×16 grid, `QB_POS` (4,0), `inSetupZone`, `inThrowBand` (rows 4–11), `nextToQb`, `stepToward`.
  - `run.ts`: `createRun(seed)`, `setUpScreen`, `dispatch(place | hike | nextScreen)`, `DEFAULT_FORMATION`.
  - `step.ts`: `step(state, throwTarget?)` advances **one beat** and returns `{state, events}`. The order is in its header comment. Throw targets are **free points** in tile units, and landing picks the closest receiver within the `tuning.catch` radii (perfect/good/ok, widened by Hands). Also `throwProblem`, fumbles (lose a ball → **reset the screen to setup**), collisions (the defender wins; Walk-ons without the ball **trade**, taking the defender down too; fend-offs), Blitzer attacks on the QB's counter, landing (Clean Catch, interception, lunge, miss), touchdown, wipeout.
  - `ai.ts`: per-beat intents (the hop-arrow telegraph): Walk-ons go straight up; Chaser, Blitzer, Wall-er and Picker rules.
  - `stats.ts`: what Hustle, Hands and Heft mean (only the 0 values are decided; 1+ are placeholders). `screen.ts`: a placeholder seeded defender scatter. `replay.ts`: replay from seed and inputs. `rng.ts`: mulberry32 plus `deriveSeed`.
- **`beat/`**: `clock.ts` (`BeatClock`: audio-clock grid, lookahead scheduling, `position()` in *heard* time via `getOutputTimestamp`, `startAt(bpm, origin)`), `beatMath.ts` (pure maths; `judge()` deliberately never awards On-Beat), `calibration.ts`.
- **`audio/`**: `mixer.ts` (buses → compressor), `music.ts` (`prepareSong`, `MusicPlayer` with setup/play layers), `sfx.ts` (`SFX` definitions, `prepareSfx`, `SfxPlayer`), `synth/` (`notes.ts` notation, `instruments.ts` voices, `render.ts` offline stem rendering with tail folding), `songs/spookySurf.ts`, `wav.ts`, `context.ts` (unlock, pause on hide).
- **`render/`**: `view.ts` (renderer, lights `hemi`/`sun`, the fitted perspective camera, fog range, `tileAt`, `toScreen`), `field.ts` (tiles, throwing-band dimming and chalk lines, the QB model, `QB_MODEL`), `units.ts` (unit meshes, hop animation, facing; Wall-ers never rotate), `markers.ts` (ball, the free reticle with perfect/ok rings and a marching dashed arc while aiming, landing ring and pips, the QB's raised-hand ball position), `scenery.ts` (forest floor texture, fog, moonlight, instanced props).
- **`game/game.ts`**: the controller. The sim steps when each beat is *heard*; it pauses if frames stall more than 2 beats or the page is hidden; the music *is* the clock (on HIKE the clock's beat 0 is set on the next beat of the song); SFX hooks; input (press anywhere and pull back to aim, release to throw; drag in setup).
- **`ui/`**: `hud.ts` and `hud.css` (DOM HUD), `base.css`, `paletteVars.ts`.
- **`content/`**: `palettes.ts` (**the only place colors are defined**: `common`, `team`, `voxel` for model colors, `biomes.forest`), `tuning.ts` (every magic number), `smalls.ts` (the Walk-on and recruit kinds; `returns`, `trades`), `defenders.ts`.
- **`voxel/`**: `voxt.ts` (parser), `mesh.ts` (greedy mesher), `models.ts` (loads every `.voxt` through `import.meta.glob`, caches geometry, `voxelMaterial`, `modelHeight`), `vox.ts` (MagicaVoxel import).
- **`dev/`** plus `/dev/*.html`: the beat-clock page, the screen inspector (`screen.html?seed=N`), the model viewer, the sound board. In dev builds the game is exposed as `window.game` for console debugging.

Tests live in `tests/` and mirror these folders (73 at last count). Simulation tests build exact situations with `tests/sim/helpers.ts` (`playState`, `run`, `small`, `ofType`).

### How to make a voxel model (the recipe that works)

1. **Write `assets-src/voxels/<folder>/<name>.voxt`.** The id is `<folder>/<name>`. Folders: `team/` (our players, the ball), `forest/` (defenders), `forestHazards/`, `forestProps/`. The format is in §11 and at the top of `src/voxel/voxt.ts`. Things to remember:
   - `size W H D`, then `voxel <units per voxel>`, then `colors` (one character per named color from `palettes.ts`'s `voxel` table; add new colors there, never inline hex).
   - `slice` grids are **front views**: slice 0 is the front, which faces the camera (+z); rows run top to bottom, columns left to right.
   - `mirror x` means each row gives the left half *including* the centre column.
   - `box x0 y0 z0 x1 y1 z1 c` is inclusive, with y up from 0 and z from the front; `.` clears. Steps apply in order. Boxes are easiest for big or blocky things; slices for faces and characters.
   - Floating things (bats, ghosts) leave empty rows at the bottom.
2. **Register it** in `assets/manifest.json` (`source: "Original voxel model (…), written by Claude"`, `author: "Claude"`, `license: "original"`). `check-assets` fails the build otherwise.
3. **Preview it:** `npm run preview-models -- <id>`, then **look at both the turntable and the folder's contact sheet**. Iterate until it reads.
4. **Use it:** `getGeometry(id)` with `voxelMaterial`. Many copies of a static prop go through an `InstancedMesh` (see `scenery.ts`).

**Sizing that works** (a field tile is 1 unit):

| Kind | Typical size | Example |
|---|---|---|
| Players (Walk-on) | 9×14×5 at 0.08 → ~0.7 wide, 1.1 tall | `team/walkOn` |
| QB | 9×14×5 at 0.1 → 0.9 wide, 1.4 tall | `team/qb` |
| Defenders | 0.6–0.9 wide, 0.6–1.1 tall | `forest/*` |
| Ball | 9×5×5 at 0.045 | `team/ball` |
| Field hazards | about a tile wide | `forestHazards/pumpkin` (9×8×9 at 0.1) |
| Scenery props | up to 2–3 units tall | `forestProps/pine` (0.16) |

**Readability rules learned the hard way:**
- **Judge every model from the game's camera:** 58° pitch with characters leaning back 35°. *(The contact sheet still renders at 64° with no tilt, so it's slightly harsher than the game: update `modelViewer.ts` if that matters.)* From there you mostly see the **top**. A big hat or helmet reads; a face on the front barely does.
  - The first leaf-sprite Walk-on read as just a brown cap, because the cap hid the body.
  - The first Elder Bough's canopy hid its carved face.
  - Fix: make the top silhouette carry the identity, and pull overhangs back so faces show.
- **Thin parts vanish from above:** make wings and similar at least 2 voxels deep.
- **Models always face the camera** (a design rule since 2026-10-17): turning made a sideways-moving Wall-er read as a stick and hid every player's face mask. Design every model for the front view plus the view from above. The Witch is the one model that turns (left or right).
- **Faces:** simple and spaced out, with a voxel of skin between features. Dark eyes next to a dark mask merge (the mask went grey). Busy carved faces read as brackets, so prefer a few bold blocks (two eyes and a wide grin).
- **Color rules:** **our team is gold and orange in helmets**; **every opponent is candy purple and never helmeted**; hazards are their own shapes (orange pumpkins with glowing grins, grey stone, the witch). Never reuse the field's greens on anything that moves.
- **Keep scenery off the field and clear of the HUD:** the pumpkins in front of the field sit behind the HUD's bottom area (HIKE and the Hijink icons).

### How to make audio

- **Songs** are TypeScript data (`src/audio/songs/*.ts`), one string per bar per stem. Melodic bars are space-separated tokens (`A3`, `A3+C4+E4`, `-` hold, `.` rest); drum bars are one character per step (`x`, `X` accent, `.`). Set `steps` per bar (8 or 16). `validateSong` reports errors by stem and bar. Each song lists its `layers.setup` (the huddle) and `layers.play` stems. `fx` offers a beat-timed `echo` and `drive`.
- **SFX** are entries in `SFX` (`src/audio/sfx.ts`): wave or noise, frequency slide, attack/decay, an optional filter sweep, arpeggio `notes`/`noteStep`, `maxVoices`, `jitter`.
- **Check** with `npm run render-audio`: the song mix should peak around −3 dBFS with the loop-seam jump far below the largest step; effects should land roughly −7 to −16 dBFS peak. **A human must listen** before calling anything done.

### Testing and verifying changes

- **Rule changes:** add or adjust a sim test first (`playState(...)` + `run(state, n)` + `ofType(events, 'type')`). Remember the timing: Hustle 0 hops on **even beats**, a throw sent with `step(state, target)` leaves on that beat and lands 2 beats later, and **throw targets must be in rows 4–11** (free points from 3.5 to 11.5). Catch quality depends on the distance from the landing point to the receiver's tile.
- **Visual changes:** `npm run screenshot` (and `-- <seed> play`), then look at the PNG. The Browser pane works too, but **when the pane is hidden its page runs in the background and the game pauses itself** (correctly). For live checks, show the pane (`show_pane: preview`) and drive it through `window.game` in JavaScript, e.g. pressing the mouse anywhere on the field and dragging down to aim (see the Playwright script pattern: `page.mouse.down()`, `move`, `up`).
- **The browser console keeps old errors** across hot reloads; check timestamps before chasing them.

### Gotchas

- **Prettier ignores `*.md` and `*.voxt`.** Code is formatted with `npm run format`, and Python or sed edits to `.ts` files get reformatted afterwards, so don't match on line-wrapped text after a format.
- **ESLint:** non-null assertions are allowed only in `tests/**` and `src/voxel/**`; unused parameters must start with `_`.
- **Assets:** every file under `assets/` or `assets-src/` needs a manifest entry (`.gitkeep` and `manifest.json` are ignored).
- **Dev pages ship in the normal build** (for phone testing over Pages). Links between them must be **relative**, because Pages serves the site under `/vox/`.
- **Audio** can't start before a user gesture. Songs and SFX are pre-rendered at load at 48 kHz (`RENDER_RATE`) without a context; the `AudioContext` is created on the first tap (HIKE).
- **Event SFX** play when the beat is *heard*, so they're one output-latency late (an M3 task).
- **Calibration:** Android measured about −115 ms uncalibrated, and the offset saved by `/dev/beat.html` is used by the game.
