# Fourth & Ghoul: Milestones

This is a **living plan**. We work through it top to bottom and update it as we go: check items off, add what we discover, and move things around when priorities change. The design lives in [THEME.md](THEME.md), [GAMEPLAY.md](GAMEPLAY.md) and [TECHNICAL.md](TECHNICAL.md). This file tracks *what's next* and *what "done" means*.

**Status key:** `[ ]` to do · `[~]` in progress · `[x]` done · `[-]` dropped

**Current focus:** **playtest the M2 first playable on a phone** (2026-10-18): does calling plays against a visible defense, reading the rings and throwing on the break make every down tense? Watch whether 10-yard plays are rare, whether 4 downs feel fair, and how long a drive takes. Then the rest of M2 (juice, the Witch's edge flash) and M3 tuning. The four song loops are still waiting for a listen.

**Still open from earlier:** the M1.1 iPhone test, and switching Pages to GitHub Actions.

---

## M0: Open Design Decisions

Most of the design is settled. What's left is listed here, grouped by when it has to be decided. Items marked *(rec: …)* already have a recommendation in the design docs, so they only need a yes or no.

### Needed before the first playable (M2)

**Decided 2026-10-18 (the core loop, GAMEPLAY.md):**

- [x] **Areas of four drives,** *Balatro*-style: Intro, Challenge, Gimmick, Boss. Then the next themed area.
- [x] **A drive is four downs to gain 10 yards.** A tackle ends the down where it happened; an incompletion or a block uses the down; a sack uses it and loses 2 yards.
- [x] **No lives: losing a drive (a failed 4th down) is game over.** There are no interceptions or turnovers.
- [x] **Play cards:** draw 3, call 1, discard the rest. A card sets the formation and every route; Flip mirrors it. No free placement.
- [x] **The deck is the only progression:** after each won drive, draft one of three cards or remove one. Special players and trick plays live on cards; nothing else carries over.
- [x] **Coverage rings:** purple rings on covering defenders; green, yellow or red rings on your players. No aim warning.
- [x] **Blocks, not interceptions:** a pass to a covered receiver bounces off the defender. Bats and the Witch block passes the same way.
- [x] **Defensive jobs:** Covers (man, one beat behind, chase after a catch), Zones (scarecrows, planted, wide rings), Blitzers (the pass rush, no ring, chase after a catch), Bats (patrol), and a deep **Safety** that makes a 10-yard play rare.
- [x] **Carriers always run straight up.** No steering (tried and discarded). Special players with their own running AI are a future card idea.
- [x] **Keep the grid and the beat** for the prototype.
- [x] **Throwing:** the slingshot (press anywhere, pull back, release), free landing points, perfect/good/ok catches by distance (a perfect catch fends off one tackle).
- [x] **Names:** Walk-ons for the plain players; Trick Plays are cards.
- [ ] **Throw range** measured from the line of scrimmage (the old fixed band of rows 4–11 doesn't fit short plays).
- [ ] **The camera during a drive:** follow the line of scrimmage, or show all 10 yards.
- [ ] **The starter deck:** the six plays' exact formations and routes, and how many players a play uses.
- [ ] **What 1+ means** for Hustle, Hands and Heft, and the defenders' values. *(Decide during M2 tuning.)*
- [ ] **The Safety's look** (an Owl?).

**Superseded by the new loop:** the earlier decisions about starting slots, balls as lives, wipeouts, the draft mix, interceptions, fumble resets, Walk-on trades, the Big's counter and placement-based setup. The history is in GAMEPLAY.md, *History*.

### Missing from the design so far (needed before M5–M8)

- [ ] **Onboarding:** how a first-time player learns calling a play, reading the rings and the slingshot. *(Idea: the first drives of the first run each teach one thing.)*
- [ ] **The UX flow and wireframes:** title, the hand of play cards, the down-and-distance HUD, the draft, game over, pause and settings.
- [ ] **Unlock conditions:** how new cards, team looks and areas are earned (progress milestones? achievements?).
- [ ] **Content scope for v1:** how many play cards (basic, special-player and trick) the Haunted Forest has, and how many areas there are.
- [ ] **Areas:** their order, and what happens after the last one (a win? endless?). *(Each is four drives: decided.)*
- [ ] **Gimmicks and Bosses:** the forest's Gimmick list, and the Treant boss drive's rules.
- [ ] **The announcer:** text pop-ups only, or synthesized or sampled voice?
- [ ] **The audio list:** the songs (per area, boss, menus), when the music switches, and the core list of sound effects.
- [ ] **What makes runs different** beyond the draft (different starting decks? the team's look?).
- [ ] **Names:** the team's name.
- [ ] **The Bat as both defender and special player:** keep it (told apart by the helmet), or change one.
- [x] **Who the defenders are:** each area's locals, always in candy purple. The Forest set is built (gnome, rhino beetle, scarecrow, bat), with a Safety still to model; later areas' sets are still to design.
- [ ] **What the run is toward:** where it's going, and whether there's a joke at the end.

### Can be settled by prototyping

- [x] **Camera:** narrow perspective *(decided in M1.3)*.
- [ ] **Beat-alignment tuning** *(decide in M1.1, keeping the action timing readable without a perfect-timing challenge)*.
- [ ] **Saving a run in progress** *(rec: yes, decide in M5)*.

---

## M1: Foundations

The base systems everything else is built on. **Each one is built and verified on its own**, before any of them are combined into a game.

### M1.0 Project scaffold
- [x] Vite 8 + TypeScript (strict), ESLint 10 and Prettier, Vitest 5, on Node 24 LTS (pinned in `.nvmrc`, which CI uses too).
- [x] The folder layout from TECHNICAL.md §19. Folders get created as they're needed.
- [x] Dev pages (`/dev/*`). They're deployed with the game for phone testing, and `npm run build:release` leaves them out.
- [~] **Deploy to a static host from day one.** A GitHub Pages workflow is ready (`.github/workflows/deploy.yml`). Pages is currently serving the raw branch, which doesn't work. Switch it to Settings → Pages → Source: **GitHub Actions**.
- [x] An asset manifest, with `check-assets` running in the build.

**Done when:** a "hello cube" page loads on a real phone from a public URL, and tests and lint run. *(The cube page and the checks work locally. The public URL and the phone check are waiting on the deploy.)*

### M1.1 Beat-clock spike *(the riskiest system)*
- [x] A beat clock running off `AudioContext.currentTime`, with lookahead scheduling (`src/beat/clock.ts`).
- [x] A synthesized metronome click, accented on the bar (`src/audio/metronome.ts`).
- [x] Beat alignment: actions resolve on the beat, and the clock stays synced to the music. The rhythm is a shared timing layer, not a perfect-timing judgment system.
- [x] Audio unlock on first tap, and pause/resume when the tab is hidden or shown.
- [x] A debug page (`/dev/beat.html`): beat pulse, latency readouts, frame time and BPM controls.
- [x] Unit tests for the beat maths and sync.
- [x] **Android phone test (2026-10-17):** the rhythm locked to the music and felt consistent once the audio clock was aligned.
- [ ] iPhone test, and Bluetooth headphones.
- [ ] **Haptic tick doesn't fire on Android** (`navigator.vibrate`). Deferred: investigate in M3 (feel pass).

**Done when:** on a mid-range Android phone and on an iPhone, the game feels locked to the music and the action timing reads cleanly without a separate perfect-timing mechanic. *(Android passes. iPhone and Bluetooth are still to do.)*

**Lesson:** the browser's reported latency can't be trusted, so **the clock must stay aligned to the music**, but the player does not need a separate perfect-timing skill wall or judgment UI.

### M1.2 Simulation core
- [x] The grid (9 × 16), the setup zone (bottom 3 rows), and the end row (`src/sim/grid.ts`). *Typed strips are deferred to M2, along with hazards.*
- [x] Units with Hustle, Hands and Heft. They hop on the beat and face their next hop (`src/sim/stats.ts`, `src/sim/ai.ts`). The 0 values follow the decisions; the 1+ values are placeholders.
- [x] Setup actions (place, with swapping and a remembered formation), hike, and next screen. Throws resolve on the beat they're passed to `step()`.
- [x] Throws: a fixed 2-beat flight, a maximum range row, and rejected throws.
- [x] The ball landing: Clean Catch (+1 fend-off), the one-tile lunge, interceptions and misses, with interceptions and misses counting as fumbles.
- [x] Fumbles and the pile of balls, and the run ending when the last ball is gone.
- [x] Collisions (the defender wins unless the Small can fend it off), Heft-based knockdowns and deaths, Walk-on and recruit slot rules, wipeouts.
- [x] Blitzers: engaging the Big, ganging up, the Big's counter, sacks only while the Big holds the ball. Walk-on trades.
- [x] The four defender kinds, following the draft spec (Chaser, Blitzer, Wall-er, Picker).
- [x] A seeded, deterministic placeholder screen generator, and `replay(seed, inputs)`.
- [x] 26 simulation tests, including replay determinism and a randomized invariant check.
- [x] A dev screen inspector (`/dev/screen.html?seed=N`): place Smalls, hike, queue throws by tapping, step or auto-run.

**Done when:** a whole screen can be played headlessly in tests, from setup through touchdown or fumble, and replays come out the same every time. ✅

**Changed after testing:** the pocket and Blockers were removed altogether (kept as a Future Idea). Blitzers go straight for the Big, and Walk-ons trade themselves with defenders.

### M1.3 Minimal render
- [x] A three.js scene, lighting, and a checkerboard field with the setup zone, end zone and out-of-range rows marked (`src/render/`).
- [x] **Camera: perspective** (narrow field of view), fitted so the whole field sits between the HUD bars. Orthographic was prototyped and dropped.
- [x] Placeholder cubes for units. They hop in an arc at the start of each beat, squash on landing, tip over when knocked down and shrink away when they die.
- [x] Field indicators: the reticle, the landing ring with one pip per beat left, facing arrows, the ball's arc. The throw range shows as darker rows.
- [x] The DOM HUD: the ball button (pulsing with the beat), the beat pulse, the ball pile, yards, HIKE/NEXT/AGAIN, rhythm cues, and the Big's counter badge.
- [x] Touch input: tap a tile to aim, tap the ball button to throw on the beat, drag Smalls in setup.
- [x] The sim steps exactly when each beat is *heard*. If frames stall for more than 2 beats, or the page is hidden, the game **pauses** (RESUME realigns the clock) rather than fast-forwarding.
- [x] Camera chosen on a phone: perspective.
- [x] 60 fps confirmed on a real phone.

**Done when:** a single screen is playable in grey boxes on a phone, at 60 fps. ✅

### M1.4 Voxel pipeline
- [x] The `.voxt` text format: size, voxel scale, a mirror, named palette colors, front-view slices with ranges, boxes. The parser gives errors with line numbers (`src/voxel/voxt.ts`).
- [x] MagicaVoxel `.vox` import: `npm run import-vox` converts to `.voxt` and snaps colors to the palette (`src/voxel/vox.ts`).
- [x] Greedy meshing with vertex colors and cached geometry (`src/voxel/mesh.ts`, `src/voxel/models.ts`). Every unit of a kind shares one geometry. *(Instancing comes when unit counts call for it.)*
- [x] Headless previews: `npm run preview-models` writes turntable PNGs and a contact sheet per Big, using the system Chrome.
- [x] The `/dev/models.html` viewer: a spinning model on a field tile, with size and quad count.
- [x] First models: the Elder Bough Walk-on (a gold leaf sprite in an acorn cap), the Elder Bough (a treant with a carved jack-o'-lantern face), and the Jack-o'-Lantern ball. All three are in the game.
- [x] 12 voxel tests: parsing, mirroring, boxes, errors, meshing and winding, and `.vox` import.

**Done when:** Claude can write a `.voxt` model, render a preview, look at it, and iterate, and the result appears in the game. ✅

**Lesson:** models have to be judged **from the game's steep camera**. The first Walk-on read as a brown cap, and the Big's canopy hid its face. The contact sheet now renders at the game's angle.

### M1.5 Synth and first audio
- [x] The mixer: music, SFX and UI buses into a master gain and a gentle compressor (`src/audio/mixer.ts`).
- [x] Synth voices: kick, snare, hat, bass, organ (drawbars and wobble), lead (a driven, detuned surf twang with vibrato and echo), pluck (`src/audio/synth/instruments.ts`).
- [x] Songs as data: a bar-by-bar notation for notes, chords, holds, rests and drum hits, validated with errors per stem and bar (`src/audio/synth/notes.ts`).
- [x] Stems rendered to buffers at load with `OfflineAudioContext`. Tails are folded back for seamless loops (`src/audio/synth/render.ts`). Rendering starts at page load, before any tap.
- [x] The music player is locked to the beat clock. The clock's beat 0 is set on a beat of the song. Setup plays bass and hats; **HIKE!** brings in the full arrangement on the next beat. A pause stops the music and RESUME restarts it locked to the beat. Game over fades it out.
- [x] sfxr-style SFX: hop, throw, catch, clean catch, burst, fumble, the **FEE FI FO FUMBLE chant**, sack, touchdown, UI click. Each has random pitch and a voice cap, and they're hooked to game events.
- [x] `npm run render-audio`: WAVs, waveform PNGs, peak/RMS levels and a loop-seam check. Plus the `/dev/audio.html` sound board with per-stem mutes.
- [x] **The first song: "Spooky Surf"**: A-minor Halloween surf rock at 120 BPM, 8 bars (Am Am F E Am Am Dm E). The mix peaks at −2.5 dBFS with a clean loop seam.
- [ ] **A human listens and approves** the song and the SFX. *(Claude can check levels and seams, but not whether it sounds good.)*
- [ ] **Note:** the first song needs review before it is considered final; make sure a person listens and signs off on it.
- [ ] Confirm on a phone that the loop is seamless and stays locked to the beat.
- [ ] Event SFX (catch, burst…) play when the beat is *heard*, so they land one output-latency late. Scheduling them ahead on the audio clock is for M3 (feel pass).

**Done when:** the first song loops seamlessly in time with the beat clock on a phone, and a human has listened and approved it. *(Built and checked in the browser: levels, seam, sync, layers, pause and resume. Waiting on listening and the phone.)*

---

## M2: First Playable

**Goal:** prove the fun. It's rough, but it's a whole run. *(Re-scoped 2026-10-18 to the drive-and-play-card loop: GAMEPLAY.md, The Core Loop.)*

- [x] **Swap in the new theme's models:** football-player Walk-ons (`team/walkOn`), a bigger QB in reversed colors with its throwing arm up (`team/qb`), and a jack-o'-lantern football (`team/ball`). The old Elder Bough models are removed, and the code now says QB instead of Big.
- [-] ~~The Haunted Forest, Walk-ons, and two recruit kinds.~~ Special players now come from play cards.
- [x] **Drives and downs:** a line of scrimmage, a first-down line 10 rows upfield, four downs. A tackle ends the down (the next starts there), an incompletion or a block uses the down, a sack uses it and loses 2 yards (plus a 14-beat play clock), and a failed 4th down is **game over**. A down-and-distance HUD ("2nd & 6") and the lines on the field.
- [x] **Play cards:** each sets the formation and every route, with **Flip** to mirror it. A deck with draw 3, play 1, discard, reshuffle. Six starter plays: Go, Slant, Out, Curl, Screen, Draw (an 8-card starter deck), plus four more in the draft pool. Players follow their routes; after a catch the carrier runs straight up.
- [x] **Defensive jobs and coverage rings:** Covers (gnomes) shadow a receiver one beat behind and pursue after a catch; Zones (scarecrows) stand still with a wide ring; Blitzers rush the QB (no ring); a new **Safety** hangs deep and keeps you from gaining 10 in one play; Bats patrol. Purple coverage rings on defenders, and green/yellow/red rings on your players.
- [x] **Blocks, not interceptions:** a pass to a covered (red) receiver bounces off the defender; an uncaught pass is incomplete. Both just use the down. The Safety is an Owl (`forest/safety`). Blocking works by standing in the way: players and defenders never share a tile.
- [x] **The pre-snap UI:** three cards to pick from, the chosen play's routes previewed on the field, Flip and HIKE.
- [~] The Haunted Forest's hazards: **Rolling Pumpkin** (ground lane) and **Witch on a Broom** (an air lane: a pass crossing near her bounces off), plus **Tombstones** (static obstacles) if time allows. Each needs a model, a beat pattern, a one-beat telegraph and a setup-phase preview. *The Witch is in (on the Witching Hour Gimmick and the Boss drive, flying one tile per beat and wrapping, visible before the snap); a pass crossing near her is blocked. Her edge flash telegraph isn't built yet. The pumpkin and tombstones are still to do.*
- [x] **One area of four drives:** Intro, Challenge, a seeded Gimmick (Witching Hour, Bat Cave or Scarecrow Field) and a placeholder Boss defense (The Treant's Guard); clearing it ends the run with "The forest is cleared!".
- [x] **The draft after a won drive:** one of three play cards, or cut one, or skip, in a plain UI.
- [x] Game over ("Turnover on downs!") and a score (drives won, yards gained). *(No best score saved yet.)*
- [-] ~~Endless screens from strip-based generation; the pile of balls and wipeouts.~~ Replaced by drives and game over on a lost drive.
- [x] One song (Spooky Surf, continuous) and the core SFX, hooked to the new events.
- [ ] Basic juice: cube bursts, hit-pause, screen shake, the fumble chant (a placeholder is fine).

**Done when:** a playtester on a phone finishes a run and *asks to go again*. Record what they found confusing, unfair or boring, and feed it back into M0 and M3.

---

## M3: Feel Pass

**Goal:** make every second feel great.

- [ ] The full juice list from GAMEPLAY.md: squash and stretch, everything bouncing on the beat, haptics, rhythm cues, sparkle trails, player noises.
- [ ] Every indicator from *Reading the Field*, polished, with hazards telegraphing one beat ahead.
- [ ] **Revisit the look:** the camera pitch (58°) and the characters' backward lean (35°) were chosen from screenshots (2026-10-17). Re-check them on phones, perhaps with a playtester, and tweak `tuning.camera` (try different values with `?pitch=` and `?tilt=`).
- [ ] Tuning: hop rates, throw range, and beat alignment.
- [ ] A drive fairness check, so no unbeatable defenses get through.

**Done when:** the game is satisfying to watch with the sound off, satisfying to play with the sound on, and playtesters can say *why* a pass was blocked.

---

## M4: Trick Plays and the Deck

**Goal:** the roguelite layer: the deck is the only progression *(re-scoped 2026-10-18)*.

- [-] ~~The Hype meter and Hijinks.~~ Trick plays are play cards.
- [ ] **Cards with special players** who exist only for that play: Bat Route, Skeleton Sneak, Pumpkin Decoy.
- [ ] **Trick-play cards:** Flea Flicker, Hook and Ladder, Hail Mary, Statue of Liberty.
- [ ] Card rarity, and card upgrades (e.g. a veteran version of a play).
- [ ] The draft UI: three cards, chosen in one tap, plus "remove a card".

**Done when:** two runs can grow into noticeably different decks and playstyles.

---

## M5: UI Shell and Polish

**Goal:** it looks and feels like a finished game from the first tap.

- [ ] The UX flow from M0: title, the hand of play cards, the down-and-distance HUD, the draft, game over.
- [ ] Pause, settings (volume, haptics, reduced motion), credits (generated from the manifest).
- [ ] The "rotate your phone" card, safe areas and thumb-reach layout.
- [ ] SVG art for icons and cards. Public-domain UI assets, recolored to the palette.
- [ ] Saving and resuming a run in progress (if M0 approved it).
- [ ] An installable PWA that works offline, with an "update available" prompt.

**Done when:** a new player can install it, play, pause, resume and change settings, and nothing feels placeholder.

---

## M6: The Full Haunted Forest

**Goal:** the first place, complete.

- [ ] The forest's card pool: special-player cards for the forest's creatures, each with a model in the team helmet (Bat, Skeleton, Pumpkin-head, Werewolf, Mummy, Ghost, Black Cat, Witch, Frankenstein's Monster, Owl: THEME.md), and forest trick plays.
- [ ] The forest's Gimmicks and the **Treant** boss drive.
- [ ] The Rolling Pumpkin and Tombstones.
- [ ] Every special player's job reads from its silhouette and plays differently.

**Done when:** each card feels clearly different to call, and none of them is obviously the best.

---

## M7: Areas, Bosses and the Run

**Goal:** a run that changes as you go.

- [ ] A second area (the graveyard), with its own defenders, hazards, card pool, palette and song (on the shared tempo), after the Haunted Forest.
- [ ] Area transitions and their order (from M0).
- [ ] A boss drive for each area, plus the boss song.
- [ ] A difficulty curve that hits the target run lengths: about 2 minutes early, about 10 for a good run, 20+ for a legendary one.

**Done when:** a good run passes through every area and its boss, and the run feels like a journey.

---

## M8: Meta and Onboarding

**Goal:** the first run teaches the game, and every later run gives you a reason to come back.

- [ ] Onboarding from M0: the first drives of the first run each teach one thing.
- [ ] Unlocks (from M0): new cards, team looks and areas.
- [ ] Best progress on the title screen, and a card collection screen.
- [ ] More content toward the v1 scope from M0.

**Done when:** a brand-new player gets through their first run without any explanation, and veterans have things to chase.

---

## M9: Content and Audio Complete

**Goal:** everything planned for v1 is in.

- [ ] All the play cards from the v1 content scope.
- [ ] The full soundtrack: menus, the areas, the boss, the stingers.
- [ ] The full SFX list, the crowd, the chant and the announcer (as decided in M0).
- [ ] Final names in place everywhere.
- [ ] The asset manifest is complete and the credits are correct.

**Done when:** there's nothing left marked "placeholder."

---

## M10: Release Candidate

**Goal:** ready to share at a public URL.

- [ ] Performance on low and mid-range phones: frame rate, load time, battery.
- [ ] An accessibility pass: reduced motion, color-blind checks, playing on mute, text sizes.
- [ ] A balance pass across the cards and defenses.
- [ ] A bug bash on iOS Safari and Android Chrome, in the browser and installed.
- [ ] The final domain/URL, a share image and a short landing blurb.

**Done when:** we'd be happy for strangers to play it.

---

## Backlog (after v1)

- [ ] **More areas:** the graveyard, a witch's swamp, a haunted manor, each with its own defenders, hazards and cards.
- [ ] **Team looks:** helmet and jersey colors, team names.
- [ ] Daily runs with a shared seed.
- [ ] More areas further out (sky, clockwork, sea).
- [ ] Ball variants as cards (e.g. a biting Skull ball).
- [ ] A native wrapper and app stores.

---

## Changelog

- **2026-10-18:** One sliding throw arc: higher and longer the farther you throw; passes can only be batted down where they're low, so long throws clear defenders underneath. The arc's height is hard to see from the steep camera (a follow-up).
- **2026-10-18:** Toward a Retro Bowl demake: **half-yard tiles** (an 11 × 26 field), the sim **ticks on eighth notes** with everyone hopping every tick (plays of about 4–7 seconds), **catches contested at the ball** (a landing point inside a coverage ring is blocked, so leading the receiver matters), **quick passes land in one beat** and long ones in two, and a **Retro Bowl-style pocket**: your line in front of the QB pushed back as the pocket clock runs, countdown pips, blockers adding time, extra Blitzers taking it away, and the line tying the rush up on runs.
- **2026-10-18:** **M2 first playable built:** drives and downs, play cards (an 8-card starter deck, draw 3, Flip), the draft, one area of four drives, defensive jobs with coverage rings, blocks instead of interceptions, blocking by standing in the way, the Safety (a new Owl model), the route preview, the lines of scrimmage and first down, and a new HUD. 88 tests.
- **2026-10-18:** Blitzers chase the carrier once the ball is caught. The design docs were reworked to match the new core loop: GAMEPLAY.md rewritten around areas, drives, downs, play cards and coverage (the old design moved to *History*), THEME.md's pitch, team and defenders updated, TECHNICAL.md's architecture, content and state of play updated, and M0 and M3–M10 re-scoped.
- **2026-10-18:** Coverage designed: purple coverage rings on defenders; green, yellow or red rings on your players; no interceptions (covered passes bounce off and use the down); Covers, Zones (scarecrows), Blitzers, Bats and a new deep **Safety** that makes a 10-yard gain in one play rare. Carriers always run straight up.
- **2026-10-18:** Steering the carrier tried and **discarded**: it didn't make the game. The core loop moves to play cards and four downs to gain 10 yards (being specified).
- **2026-10-17:** Three new song loops: *Graveyard Shuffle* (swung, on a 12-step triplet grid), *Midnight Chase* (driving) and *Skeleton Stomp* (boss). Every song shares `SONG_GRID` (120 BPM, 8 bars, A minor) so any two can crossfade at any moment; the dev audio board crossfades when you switch songs. The game still plays Spooky Surf only.
- **2026-10-17:** The Witch on a Broom is in: one per screen, flying across a throw-band row one tile per beat, wrapping off one side and back in from the other, before HIKE too. A pass crossing her row near her is **SNATCHED!** (a fumble); runners pass under her.
- **2026-10-17:** Code cleanup for extension: dead code removed; Smalls renamed to players; one definition per defender kind (`content/defenders.ts`) with an explicit `ignoresSnap` flag; `step(state, BeatInput)` and a pure `dispatch`; throw problems as codes; `game.ts` split into conductor, feedback and slingshot; `Markers` split into QB, ball and aim views.
- **2026-10-17:** Cleanup: the music is the global tick. PLAY starts the song and its clock; sim beat = song beat − run start, with no timer or re-anchoring. Pausing suspends the audio, freezing the beat with it. Removed the music layers from the player, HUD badges and the rhythm-era judgement kinds.
- **2026-10-17:** One global beat: it ticks in every phase and never resets. Before HIKE only Bats move; players and the other defenders wait for the snap. The setup-only idle beat is gone.
- **2026-10-17:** The music is one continuous song from the first tap: no silence before HIKE, no drop after a touchdown. Hikes line the sim up with the song's next beat, and setup patrols hop on the song's beats.
- **2026-10-17:** **SACKED!** happens the moment any defender reaches the QB while it holds the ball. The QB's counter and the Blitzer attack rhythm are gone.
- **2026-10-17:** The QB lowers its throwing arm the moment the ball leaves its hand (a second model, `team/qbThrown`), and raises it again when it gets a new ball.
- **2026-10-17:** A throw leaves the QB's hand the moment you release, and its speed is adjusted so it still lands on the beat (2 beats after the next beat).
- **2026-10-17:** Bats (Pickers) fly a fixed 4×4 box circuit. They start circling during setup and carry on after HIKE, instead of chasing the ball.
- **2026-10-17:** Removed the rhythm-game HUD (the beat bar and the throw circle): aiming is on the field, and the beat is felt through the music and the bouncing.
- **2026-10-17:** Slingshot throwing merged: pull back from anywhere to aim, release to throw; catches have slop and a perfect/good/ok rating.
- **2026-10-17:** The look: the camera pitched at 58° and characters leaning back 35°, so faces and jerseys read. Marked for a possible tweak in the M3 feel pass.
- **2026-10-17:** Models always face the camera, and arrows show the next hop. The Witch on a Broom is the exception: she faces the way she flies.
- **2026-10-17:** TECHNICAL.md §22 added: a handbook for picking the project back up (code map, commands, voxel and audio recipes, readability lessons, gotchas).
- **2026-10-17:** Hazard models built (`forestHazards/`): the grinning Rolling Pumpkin, the Witch on a Broom, the Tombstone and the Drifting Ghost. They aren't in the game yet.
- **2026-10-17:** Hazards designed: Rolling Pumpkin and Witch on a Broom for M2, Tombstones if time allows, Drifting Ghost later. The rule: one simple shape, one rule, one telegraph.
- **2026-10-17:** Throws are limited to the middle half of the field, subtly marked on the turf.
- **2026-10-17:** New team models in the game: football-player Walk-ons, the QB and the jack-o'-lantern football. "Big" is renamed to "QB" in the code.
- **2026-10-17:** Theme reworked: a football team in a haunted forest, with no Bigs or Smalls. The game is now called **Fourth & Ghoul**. GAMEPLAY.md and TECHNICAL.md are updated to match. *(Items checked off before this point use the old words: the Big is now the QB, and Smalls are now players.)*
- **2026-10-17:** Defenders are biome locals in candy purple. The Forest set (gnome Chaser, rhino-beetle Blitzer, scarecrow Wall-er, bat Picker) is modelled and in the game.
- **2026-10-17:** Playtest changes: a fumble now resets the whole screen to setup, and Smalls no longer block each other.
- **2026-10-17:** M1.5 synth and audio: mixer, synth voices, song notation, offline stem rendering, music locked to the beat, SFX, render tooling, and the first song, "Spooky Surf".
- **2026-10-17:** M1.4 voxel pipeline: `.voxt` format, `.vox` import, greedy meshing, headless previews, and the first three Elder Bough models in the game.
- **2026-10-17:** M1.3 done: perspective camera chosen, 60 fps confirmed on a phone.
- **2026-10-17:** Removed the pocket and Blockers (now a Future Idea). Blitzers go straight for the Big. Walk-ons trade themselves with defenders when they don't have the ball.
- **2026-10-17:** M1.3 minimal render: the game is playable in grey boxes, with both cameras, the HUD, aiming and throwing on the beat, setup dragging, and pause on stall.
- **2026-10-17:** Changed the pocket to a single Blocker spot that Blitzers must go through.
- **2026-10-17:** M1.2 simulation core built and tested (47 tests), plus the screen inspector dev page.
- **2026-10-17:** Android phone test: −115 ms uncalibrated, good after calibration. No haptics (deferred).
- **2026-10-17:** M1.1 beat clock built: clock, metronome, tap judging, calibration, and the `/dev/beat.html` debug page. Waiting on the phone test.
- **2026-10-17:** Upgraded to Node 24, Vite 8, Vitest 5 and ESLint 10. The audit is clean.
- **2026-10-17:** M1.0 scaffold built: hello-cube page, checks, tests, asset manifest, Pages workflow.
- **2026-10-17:** Set the stat scale, with Walk-ons at 0/0/0.
- **2026-10-17:** Made most of the M0 decisions needed before M2.
- **2026-10-17:** Plan created. The design docs (THEME, GAMEPLAY, TECHNICAL) were drafted earlier the same day.
