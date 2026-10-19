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

- **The simulation** (`src/sim/`) is pure TypeScript. It holds the grid, the units, the ball, the downs and the deck. It advances with `step(state, input) → nextState + events`, **once per beat**, and actions between beats (calling a play, HIKE) go through `dispatch(state, action)`, which is pure too. It has no rendering, no timers and no randomness except a seeded RNG.
- **The renderer** (`src/render/`, `src/ui/`) never changes the game state. It reads the state and its events (`hop`, `caught`, `blocked`, `tackled` and so on) and animates the transitions *between* beats: hop arcs, squash/stretch, cube bursts.
- **Benefits:** the rules are unit-testable, runs are deterministic and replayable from a seed (useful for debugging, and later for daily runs), and the art can be redone without touching the rules.

### Game flow

A small state machine covers the screens: `Boot → Title → [Drive: (Call a play → Down) × up to 4 → Draft]* → GameOver`, with areas of four drives (GAMEPLAY.md, *The Run*). Each state owns its DOM overlay and its input handling.

### No ECS framework

The scale is a dozen or so units on an 11×30 grid of half-yard tiles, so plain typed objects and arrays are enough.

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
- **Audio unlock:** mobile browsers only start audio after a user gesture. For now the title is just the **PLAY** prompt: that tap creates and resumes the `AudioContext`, starts the song, and starts the global tick.
- **Pausing:** when the tab is hidden, the game pauses by suspending the audio context, which freezes the beat with the music. RESUME picks both up exactly where they were.
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
  - Repeated models share their geometry (`getGeometry` caches it), and many copies of a static prop go through **InstancedMesh**.
  - The field tiles are one instanced mesh.
- **Effects:**
  - **Cube bursts:** one shared `InstancedMesh` pool of small cubes with simple physics, recycled.
  - **Hit-pause:** the renderer holds the animation time. The *beat* never pauses; hit-pause only stretches the animation inside the current beat.
  - **Screen shake** is an offset on the camera.
  - **Squash and stretch** are scale animations on the unit's root node.
- **Field indicators** (the reticle, landing rings, hop arrows, coverage rings, the open/covered rings under your players, route previews, the first-down line, hazard warnings) are three.js meshes lying flat on the tiles. They live in 3D space, so they belong there rather than in the DOM.
- **Between downs and drives:** ▲ the camera follows the line of scrimmage during a drive, and a new drive brings a new field and defense.
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
  - The play cards (the hand of three before each down, and the draft after a won drive), and the game-over screen.
  - The HUD: down and distance ("3rd & 4"), Flip and HIKE, and message pops. (Aiming happens on the canvas, so the HUD has no throw button.)
  - Settings and credits.
- **Polish toolkit:**
  - CSS transitions and keyframes, animating only `transform` and `opacity`, which stay smooth on phones.
  - CSS custom properties for team palettes, set from the same palette data as the voxels.
  - SVG for icons and card art.
- **Syncing UI to the beat:** UI animations that should be on the beat (e.g. the cards bobbing in the hand) are driven from the beat clock in JavaScript. CSS's own timing would drift.
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
  - **Button taps** (play cards, Flip, HIKE) are handled by DOM elements.
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
- **The music is the global tick.** Tapping **PLAY** enters the game: the song's full mix starts looping and its beat clock starts with it. Neither ever stops or restarts, through calling plays, downs, drives and new runs. Game ticks are the song's beats: **sim beat = song beat − the run's start beat** (fixed when a run is created). There's nothing else: no timer, no re-anchoring.
  - **What a tick does depends on the phase**, not whether it happens: before the snap only the Bats (and hazards) move; after it, everyone does (see §22's `step.ts` note). **HIKE!** doesn't touch the beat.
  - **Pausing suspends the `AudioContext`.** `BeatClock.heardTime` never runs past `ctx.currentTime`, so the beat freezes with the music and both pick up exactly where they were on **RESUME**. Leaving the page pauses.
  - **No catch-up limit:** if frames stall while the music plays, the sim steps every beat it missed, so it never drifts from the song.
- **Notation:** each stem is one string per bar: notes like `A3`, chords like `A3+C4+E4`, `-` to hold, `.` to rest, and `x`/`X` for drum hits (`src/audio/synth/notes.ts`).
- **One tempo for every song:** all songs share `SONG_GRID` (120 BPM, 8-bar loops, A minor), so the game can **crossfade** between them at any moment without the beat moving (§22, *How to make audio*). ▲ *When it switches is a design question (GAMEPLAY.md, Open Questions).*
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
  cards.ts        // play cards: formation, every route, Flip; the fixed playbook of six
  roster.ts       // your four players' names, and the forms (Human, Ghost, Werewolf, Golem): stats and skills
  defenders.ts    // every defender kind: name, creature, model, stats, job (movement rule), coverage ring
  hazards.ts      // every hazard kind: model, speed, reach (the beat patterns are in sim/hazards.ts)
  areas.ts        // each themed area: its four drives' defenses, Gimmicks, Boss, card pool, palette, song
  palettes.ts     // every color
  tuning.ts       // every magic number in one place
```

*(`areas.ts` lists each area's four defenses; there's only the forest so far.)*

- Content is checked with TypeScript types, plus a small validation test (every reference resolves, and no stat is out of range).
- **Palettes have a single source of truth** (`src/content/palettes.ts`). It feeds the voxel colors, the CSS custom properties and the SVG fills, so 3D and 2D always match.

---

## 10. Drive Generation and AI

- **Each drive's defense** comes from the area's data for its slot (Intro, Challenge, Gimmick, Boss), placed by a seeded RNG: which defenders, where, and with what jobs, plus the hazards.
- **Fairness check:** a generated defense must be beatable. A cheap simulated check (can *some* card in the starter deck, with some throw, gain yards?) rejects unfair drives. It runs at generation time, and in bulk tests during development.
- **AI** is simple, readable rules, decided once per beat:
  - Each defender has a job (cover, zone, rush, deep safety, patrol) with a small decision function that chooses a target tile; your players follow their card's routes, and a carrier runs straight up.
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
  - Icons, play-card frames and art (including route diagrams), buttons, badges.
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
  - best score, unlocks (cards in the draft pools, team looks, areas), and seen tutorials;
  - settings: music and SFX volume, reduced motion, haptics on or off.
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
  - the simulation rules (catches, blocks, tackles, sacks, downs, the deck);
  - the beat maths (scheduling, heard time);
  - drive generation (seeded output, fairness);
  - content validation.
- **Replay tests:** a seed plus a recorded sequence of inputs must give the same outcome. This guards against accidental rule changes.
- **Dev pages and tools** (deployed alongside the game while we build foundations, so they can be tested on phones; `npm run build:release` leaves them out): a debug overlay (fps, draw calls, beat offsets), cheats (skip a drive, give cards), `/dev/models`, `/dev/audio`, and `/dev/screen?seed=…` to inspect any generated screen.
- **Device testing:** a regular check on a real mid-range Android phone and a real iPhone, which covers beat feel, frame rate and touch. Desktop emulation isn't enough for timing.

---

## 18. Accessibility

- **Output latency compensation** (see the beat clock), so what you see matches what you hear.
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
│  ├─ beat/              // beat clock and scheduler
│  ├─ render/            // three.js scene, voxel meshing, effects, field indicators
│  ├─ game/              // the controller, the conductor (music = tick), feedback, aiming maths
│  ├─ ui/                // DOM overlay: HUD, play cards, draft, menus, styles
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
6. **First playable** (as scoped in GAMEPLAY.md): since 2026-10-18 that's the drive-and-play-card loop (MILESTONES.md, M2). Then iterate on feel.

---

## 21. Out of Scope (for now)

Multiplayer, accounts and backends, analytics, localization (we keep text minimal so it stays possible later), native wrappers, and monetization.

---

## 22. Working Notes: How to Pick This Up Again

Everything a future session (human or Claude) needs to carry on without the original conversation. The design lives in THEME.md and GAMEPLAY.md, and progress lives in MILESTONES.md. This section covers **how the code works and how assets get made**.

### State of play (2026-10-18)

- **Done:** M1.0–M1.5 (scaffold, beat clock, simulation, render, voxel pipeline, synth and music), the theme's models, the Witch on a Broom, the global tick (the music), four song loops on one grid, and the **M2 first playable** of the new core loop: drives and downs, play cards with routes and Flip, the deck and the draft, defensive jobs with coverage rings, blocks instead of interceptions, the Safety (an Owl), and one area of four drives.
- **Next:** playtest M2 on a phone, then the rest of M2 (juice, the Witch's edge flash) and tuning (MILESTONES.md).
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
| `npm run screenshot [seed] [call\|play] [query] [name]` | A headless phone-size (375×812 @2x) capture of the game → `previews/game.png` (the title over the first down), `game-call.png` (the first card called, routes previewed) or `game-play.png` a moment after HIKE. Extra URL params and an output name allow A/B looks, e.g. `-- 8 play "pitch=58&tilt=35" view-a` → `previews/view-a.png`. |
| `npm run render-audio [song:id \| stem:song/stem \| sfx:id …]` | WAVs plus waveform PNGs in `previews/audio/`, with peak/RMS levels and a loop-seam check. |
| `npm run import-vox -- file.vox folder/name [voxelSize]` | Convert a MagicaVoxel model into `.voxt`, colors snapped to the palette. |

`previews/` is gitignored output: look at the PNGs with an image viewer (Claude: the Read tool).

### Code map (`src/`)

- **`sim/`**: the pure, deterministic rules (GAMEPLAY.md's core loop). No three.js, no DOM, no `Math.random`.
  - `types.ts`: `RunState` (phase, `drive`, `deck`, `called`, `roster`, `offer` of `DraftOffer`s, `screen`, `downBeat`, `pause`, `result`), `RosterPlayer` (form, training, the safety net's `streak`), `TeamHand`, `CheckKind`, units (`PlayerUnit` with its roster `slot`, `form`, `route`, `rerolls`, `frenzy`; `Defender` with `marking` and `patrol`), ball states (`qb`, `flight` with `from`, `carried`, `dead` with `how`: blocked, incomplete or sacked), `Action`s (`call`, `flip`, `hike`, `draft`, `skipDraft`), `BeatInput`, `ThrowProblem`, `SimResult`, events.
  - `grid.ts`: the 11×30 grid of **half-yard tiles**, `MID_COL`, `stepToward`, `distance`, `touches`. **The sim ticks on the beat** (`tuning.clock.ticksPerBeat` = 1; 2 would be eighth notes): `state.tick`, `downTick`, `downTicks` and every timing in `tuning` are ticks, and distances in rows are half-yards (`yardsText` in `run.ts` turns rows into "4½").
  - `run.ts`: `createRun(seed)`, `setUpDrive`, `setUpDown` (line the defense up, draw a hand), `dispatch(state, action)` (**pure**, like `step`), `endDown` (moves the line of scrimmage, never behind the drive's start), `nextDown` (the next down; after a won drive, the next drive lined up *before* the draft, whose hand `nextDrive` deals afterwards; game over; the area cleared), the seeded deck shuffle, the draft (one transform of a random form while a human is left, and training; the pick lands on a random player), the main game's three areas (`tuning.run.areas`, the forest again until there are more), `downAndDistance`.
  - `step.ts`: `step(state, input: BeatInput)` advances the **global beat** by one, in **every phase**. The order is in its header comment: hops (players and defenders never share a tile, which is blocking; a receiver's cut shakes its mark on a Hustle check; a defender meeting the carrier, or ending a tick beside it, tries to tackle it: a shake check, then a break check; the first-down line, **the pocket clock** (`state.pocket`, pass plays only: it runs down, and at zero with the ball in hand it's a sack; the line and rushers are only drawn, by `render/pocket.ts`), the Witch, the landing (**contested at the ball**: blocked if it comes down inside a coverage ring, else caught by the closest player in reach, else incomplete). The pass in the air: `resolveFlight` samples the ball's path each tick and, wherever it's low (`catchable`), the first defender beside it bats it, a Scarecrow's or Bat's ring knocks it away, or the nearest player in reach catches it. `flight.ts` is the shared throw model: `flightTicks`, `arcPeak`, `ballHeight`, `ballGround`, `catchable` (the render's `throwArc.ts` draws the same arc, and the aim line colors its catchable stretch). `downOver` counts its pause, then `nextDown`. Also `throwProblem` (range measured from the line of scrimmage) and `catchRadius`.
  - `ai.ts`: per-beat intents (the hop arrows): players take their route one move per hop and the carrier runs straight up; defenders do their **job** (`cover`, `zone`, `rush`, `safety`, `patrol`), and all but Zones and Bats chase the carrier after a catch. `assignMarks` gives each Cover a receiver at the snap. **A new defender kind** is an entry in `content/defenders.ts` plus, only for a new job, a case here.
  - `checks.ts`: **checks** (GAMEPLAY.md, Checks): `chance(edge)` on `tuning.checks.curve`, `checkEdge` (stat minus stat, modifiers, the safety net, Frenzy) and `check(state, kind, player, defender, modifier)`, which rolls from `deriveSeed(seed, 'check', tick, kind, ids, attempt)` (so runs stay deterministic) and applies rerolls, Frenzy and the streak. Shake is Hustle, catch is Hands, break is Heft.
  - `roster.ts`: `startingRoster`, `teamHand` (Monster Mash, Four of a Kind), `playerStats` (form + training + a Four of a Kind's bonus) and `playerSkills` (rerolls and Frenzy, widened by the hand).
  - `coverage.ts`: `coverageRadius`, `contestants` (defenders contesting a ball at a point: right beside it, or inside its ring), `catchChance` and `openness` (the green, yellow and red rings, by the odds of a catch: `tuning.checks.bands`).
  - `drive.ts`: `defenseFor` (the area's Intro, Challenge, a seeded Gimmick, or Boss), `defenseBoost` (+1 to every stat per area, +1 on the Boss), `lineUpDefense` (spots relative to the line of scrimmage; the Safety always deep; a Bat starts on a free tile of its circuit), `boxCircuit` (a Bat's 6×6 patrol), `driveHazards` (Witches), `formation` (your players for a called card, Flip applied, the roster filling the spots left to right), `qbTile`, `pocketTicks` (blockers add time, a defense's extra `rushers` take it away).
  - `hazards.ts`: hazards are **pure beat patterns** with no changing state (`ScreenState.hazards`): `witchColumn(h, beat)` wraps around the field, `witchTravel` is the continuous version for drawing, and `passCrossing`/`snatches` decide whether a pass crossing her row hits her (a block).
  - `replay.ts`: replay from seed and inputs. `rng.ts`: mulberry32 plus `deriveSeed`.
- **`beat/`**: `clock.ts` (`BeatClock`: audio-clock grid, lookahead scheduling, `position()` in *heard* time via `getOutputTimestamp`, `startAt(bpm, origin)`), `beatMath.ts` (pure maths), plus `calibration.ts` and tap judging (`judgeTap`, `judge()`) left over from the rhythm-game days and used only by the dev beat page.
- **`audio/`**: `mixer.ts` (buses → compressor), `music.ts` (`prepareSong`, `MusicPlayer`, the full mix as one continuous loop), `context.ts` (unlock, `suspendAudio`), `sfx.ts` (`SFX` definitions, `prepareSfx`, `SfxPlayer`), `synth/` (`notes.ts` notation, `instruments.ts` voices, `render.ts` offline stem rendering with tail folding), `songs/` (`index.ts` lists `SONGS`; `grid.ts` is `SONG_GRID`; one file per song: `graveyardShuffle`, `spookySurf`, `midnightChase`, `skeletonStomp`), `wav.ts`
- **`render/`**: `view.ts` (renderer, lights `hemi`/`sun`, the fitted perspective camera, fog range, `tileAt`, `toScreen`), `field.ts` (`Turf`: the checkerboard of one long field, running `TURF_BEHIND` rows before row 0 for the glide and `TURF_AHEAD` rows past the top, hidden on the Boss drive; and `DriveLines`: the line of scrimmage and the gold first-down line), `units.ts` (player and defender meshes, hop animation, hop arrows, and the rings: purple coverage under defenders, green/yellow/red under your players; models never turn), `routes.ts` (`RoutePreview`: the called play's dotted routes before the snap), `pocket.ts` (`PocketView`: three linemen and three rushers, pushed back toward the QB as the pocket clock runs, and its countdown pips; scenery only), `qb.ts` (`QbView`: lines up each down, arm up with the ball, down after; `qbHand(qb)`), `ball.ts` (`BallView`: held, flying from the moment of release with landing ring and pips, carried overhead with a ground ring, and dead: a blocked pass pops off the defender, an incomplete one skips on along the turf), `aim.ts` (`AimView`: the free reticle with perfect/ok rings and the marching dashed arc), `throwArc.ts` (the shared arc shape), `hazards.ts` (`HazardViews`: the Witch glides along her row facing her way, with a shadow; a second copy flies in from off the field while she wraps), `scenery.ts` (`ForestScenery`: forest floor texture, fog, moonlight, instanced props along the whole long field; fences past the top only while another drive is to come, the tree line behind the end zone only on the Boss drive), `crossfade.ts` (`Crossfade`: the hand-over while the camera glides into the next drive: still copies of the old drive's units, QB, line, ball and lines fade out where they stood, and the new drive's fade in, the defense from its waiting ghosts), `nextDefense.ts` (`NextDefenseView`: the next drive's defense, faded, standing past the first-down line where it will line up; scenery only, gone on the Boss drive).
- **`game/`**: `game.ts` (the controller: each frame the sim steps every tick *heard* since the last, in every phase, sim tick = (song beat − `runStart`) × `ticksPerBeat`; actions from the HUD (call, Flip, HIKE, draft) go through `dispatch`; the HUD per phase; input: press anywhere and pull back to aim, release to throw), `conductor.ts` (`Conductor`: the music and its `BeatClock` are the global tick, started by PLAY; pause = suspend the audio, freezing the beat; SFX), `feedback.ts` (sim events → sounds and HUD pops, and every pop's words), `slingshot.ts` (`aimTarget`, `throwTiming`: pure maths).
- **`ui/`**: `hud.ts` and `hud.css` (DOM HUD: the drive banner and down and distance, the hand of three cards, Flip, the context button, the draft overlay, `pop()`; the bottom bar keeps one height so the camera never jumps), `base.css`, `paletteVars.ts`.
- **`content/`**: `palettes.ts` (**the only place colors are defined**: `common`, `team`, `voxel` for model colors, `biomes.forest`), `tuning.ts` (every magic number), `roster.ts` (`STARTING_NAMES`, `FORMS`, `MONSTERS`), `cards.ts` (`CARDS`: formations and routes in half-yards, written with `route('U6 RU3')`; plays leave the three middle columns on the line to the offensive line; `PLAYBOOK`, `flipPlayer`), `areas.ts` (`FOREST`: its Intro, Challenge, Gimmicks and Boss defenses), `defenders.ts` (`DEFENDERS`: job, coverage radius, model, `ignoresSnap`), `hazards.ts` (`HAZARDS`: model, `beatsPerTile`, `reach`).
- **`voxel/`**: `voxt.ts` (parser), `mesh.ts` (greedy mesher), `models.ts` (loads every `.voxt` through `import.meta.glob`, caches geometry, `voxelMaterial`, `modelHeight`), `vox.ts` (MagicaVoxel import).
- **`dev/`** plus `/dev/*.html`: the beat-clock page, the screen inspector (`screen.html?seed=N`), the model viewer, the sound board. In dev builds the game is exposed as `window.game` for console debugging.

**Balance runs:** `npm run balance [runs]` (`tools/balance.ts`) plays whole runs straight through the sim, with no rendering, audio or browser (about 2,000 runs a minute). A simple bot calls random plays and throws to the receiver with the best odds, and it reports drive win rates by area and drive, check success rates and team hands for a set of team builds. Use it to compare builds and tune numbers; the bot isn't a good player, so its absolute win rates are only a guide.

Tests live in `tests/` and mirror these folders (115 at last count). Simulation tests build exact downs with `tests/sim/helpers.ts`: `playState(players, defenders)` is a down just snapped (line of scrimmage on row 3, first-down line on row 23, QB on (5, 0), no pocket clock unless you set `state.pocket`, player ids from 100, defender ids from 200), plus `run`, `carry`, `player`, `defender`, `ofType`. Players can be given `stats`, `form`, `rerolls` and `frenzy`. Checks are seeded, so tests use `STAR` stats (every check succeeds: +4 is certain) or `DUD` stats with `seedWhere` (the first seed that gives the unlikely result).

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
| QB | 9×14×5 at 0.1 → 0.9 wide, 1.4 tall | `team/qb` (arm raised, holding the ball); `team/qbThrown` (arm lowered after the throw; drawn by `render/qb.ts`) |
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
- **Keep scenery off the field and clear of the HUD:** the pumpkins in front of the field sit behind the HUD's bottom area (HIKE, and the play cards to come).

### How to make audio

- **Songs** are TypeScript data (`src/audio/songs/*.ts`), one string per bar per stem. Melodic bars are space-separated tokens (`A3`, `A3+C4+E4`, `-` hold, `.` rest); drum bars are one character per step (`x`, `X` accent, `.`). Set `steps` per bar (8 or 16; **12 gives a triplet grid for swing**, as in Graveyard Shuffle). `validateSong` reports errors by stem and bar. Each song lists its `layers.play` stems (the mix the game loops) and a thinner `layers.setup` mix, which only the dev audio board uses for now. `fx` offers a beat-timed `echo` and `drive`.
- **Every song shares `SONG_GRID`** (120 BPM, 4/4, 8 bars = a 16 s loop) and sits in **A minor**, so any two line up beat for beat and can **crossfade at any moment**: start the new one at the same offset into its loop as the old one (`MusicPlayer.start(time, beatInLoop)`), and fade. A test enforces the grid. The dev audio board does exactly this when you switch songs (a 2 s crossfade). Keep new songs near the others' loudness (`npm run render-audio`): they run about −17 to −14 dB RMS, from the friendliest to the boss track.
- **SFX** are entries in `SFX` (`src/audio/sfx.ts`): wave or noise, frequency slide, attack/decay, an optional filter sweep, arpeggio `notes`/`noteStep`, `maxVoices`, `jitter`.
- **Check** with `npm run render-audio`: the song mix should peak around −3 dBFS with the loop-seam jump far below the largest step; effects should land roughly −7 to −16 dBFS peak. **A human must listen** before calling anything done.

### Testing and verifying changes

- **Rule changes:** add or adjust a sim test first (`playState(...)` + `run(state, n)` + `ofType(events, 'type')`). Remember the timing: **everyone hops every tick**, a throw sent with `step(state, { throwAt })` leaves on that tick and lands `quickTicks` (2) or `longTicks` (4) later depending on its length, and **throw targets run from 2 rows behind the line of scrimmage to 22 past it**. Catch quality depends on the distance from the landing point to the receiver's tile, and a landing point inside a coverage ring means a block. A finished down pauses `tuning.drive.pauseTicks` ticks before the next.
- **Visual changes:** `npm run screenshot` (and `-- <seed> play`), then look at the PNG. The Browser pane works too, but **when the pane is hidden its page runs in the background and the game pauses itself** (correctly). For live checks, show the pane (`show_pane: preview`) and drive it through `window.game` in JavaScript, e.g. pressing the mouse anywhere on the field and dragging down to aim (see the Playwright script pattern: `page.mouse.down()`, `move`, `up`).
- **The browser console keeps old errors** across hot reloads; check timestamps before chasing them.

### Gotchas

- **Prettier ignores `*.md` and `*.voxt`.** Code is formatted with `npm run format`, and Python or sed edits to `.ts` files get reformatted afterwards, so don't match on line-wrapped text after a format.
- **ESLint:** non-null assertions are allowed only in `tests/**` and `src/voxel/**`; unused parameters must start with `_`.
- **Assets:** every file under `assets/` or `assets-src/` needs a manifest entry (`.gitkeep` and `manifest.json` are ignored).
- **Dev pages ship in the normal build** (for phone testing over Pages). Links between them must be **relative**, because Pages serves the site under `/vox/`.
- **Audio** can't start before a user gesture. Songs and SFX are pre-rendered at load at 48 kHz (`RENDER_RATE`) without a context; the `AudioContext` is created on the PLAY tap.
- **Event SFX** play when the beat is *heard*, so they're one output-latency late (an M3 task).
- **Calibration:** Android measured about −115 ms uncalibrated on `/dev/beat.html`. The game no longer uses a saved offset (there's no tap judging); it relies on the heard-time mapping.
