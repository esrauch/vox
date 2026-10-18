# Fourth & Ghoul: Milestones

This is a **living plan**. We work through it top to bottom and update it as we go: check items off, add what we discover, and move things around when priorities change. The design lives in [THEME.md](THEME.md), [GAMEPLAY.md](GAMEPLAY.md) and [TECHNICAL.md](TECHNICAL.md). This file tracks *what's next* and *what "done" means*.

**Status key:** `[ ]` to do · `[~]` in progress · `[x]` done · `[-]` dropped

**Current focus:** redesigning the core loop around **play cards and downs** (2026-10-18): four downs to gain 10 yards per level, and progression as a deck of play cards only. Rules spec awaiting approval. The three new song loops are waiting for a listen.

**Earlier focus:** listen to M1.5 (`/dev/audio.html` and the game) and check it on a phone, then M2 (first playable). Still open: the M1.1 iPhone test, and switching Pages to GitHub Actions.

---

## M0: Open Design Decisions

Most of the design is settled. What's left is listed here, grouped by when it has to be decided. Items marked *(rec: …)* already have a recommendation in the design docs, so they only need a yes or no.

### Needed before the first playable (M2)

- [x] **Name for the default Smalls:** Walk-ons.
- [x] **Starting slots:** 5, with "+1 slot" as a rare card.
- [x] **Starting balls:** 3.
- [x] **Wipeout:** lose a ball and restart the screen from setup. Walk-ons return, and dead recruits stay dead.
- [x] **Draft mix:** always one recruit, one Walk-on upgrade and one other card.
- [x] **Throw range:** the middle half of the field only (rows 4–11). The bottom and top quarters can't be targeted, shown by slightly dimmed rows and faint chalk lines.
- [x] **Catching:** *(revised 2026-10-17)* throws land on free points, not tiles. The closest receiver within about a tile catches it, rated perfect, good or ok by distance (perfect is a Clean Catch, and Hands widens the rings). A defender right under the ball and closer than the receiver intercepts.
- [x] **Throwing controls:** *(2026-10-17)* press anywhere, pull back to aim (a slingshot, with a free reticle and an animated dashed arc), release to throw on the next beat. This replaces tapping a tile and then the ball button.
- [x] **Catch glow:** always on.
- [x] **Hazards hit defenders too.**
- [x] **Blitzers and the Big's counter:** Blitzers head for the Big and attack it from a tile next to it (e.g. every 2 beats). Each attack ticks the Big's counter (3) down, and at 0, while the Big holds the ball, it's a sack (a fumble). Several Blitzers drain it faster. They're irrelevant once the ball is thrown. *(The pocket and Blockers were removed; see GAMEPLAY.md, Future Ideas.)*
- [x] **A fumble resets the screen:** you lose a ball and go back to setup, with Walk-ons and defenders back at their starting tiles (after playtesting: continuing mid-screen left Walk-ons out of reach).
- [x] **Smalls never block each other:** they can share tiles and pass one another.
- [x] **Walk-ons trade:** a Walk-on without the ball that runs into a defender dies and takes the defender with it, so stacked Walk-ons clear a path. A carrier is just tackled.
- [x] **Collisions:** the defender always wins against Walk-ons. Some units **fend off N defenders**.
- [x] **Bigs have no stats.** Choosing a Big only sets the theme and the draft pool. The Big improves only through perks.
- [x] **The stat scale:** every Small and defender has Hustle, Hands and Heft as whole numbers from 0. Walk-ons are 0/0/0. Hustle 0 hops every 2 beats, Hands 0 catches on its own tile or 1 ahead, and Heft 0 dies on the first hit.
- [ ] **What 1+ means** for each stat, and the stat values for defenders. *(Decide during M1.2 and M2 tuning.)*
- [~] **Defender kinds and per-beat rules:** a draft spec is in GAMEPLAY.md (Chaser, Blitzer, Wall-er, Picker). Confirm it during M2 playtesting.
- [x] **Hands is catch reach:** the own tile plus one ahead, and high Hands adds diagonal lunges.
- [x] **Walk-ons are dumb:** they hop straight up their column, even into danger. Recruits and upgrades can add smarter footwork.

### Missing from the design so far (needed before M5–M8)

- [ ] **Onboarding:** how a first-time player learns setup, the reticle and the ball button, using the beat as a shared rhythm cue rather than a perfect-timing gate. *(Idea: the first few screens of the first run are built to teach one thing each.)*
- [ ] **The UX flow and wireframes:** title, setup, play HUD, draft, game over (with the roll call of fallen recruits), pause, settings and calibration.
- [ ] **Unlock conditions:** how new recruits, cards, team looks and places are earned (distance milestones? achievements?).
- [ ] **Content scope for v1:** how many recruits, Walk-on upgrades, perks and Hijinks the Haunted Forest has, and how many places there are.
- [ ] **Biomes:** their order, how many screens each lasts, and whether the sequence loops or changes as you climb.
- [ ] **Boss screens:** how often they come, what a giant forest boss does on the beat, and how you beat one.
- [ ] **The Hype economy:** meter size, what fills it and by how much, and how much each Hijink costs.
- [ ] **Treats vs Tricks:** keep Tricks for v1, or postpone?
- [ ] **The announcer:** text pop-ups only, or synthesized or sampled voice?
- [ ] **The audio list:** the songs (per biome, boss, menus) and the core list of sound effects.
- [ ] **Who the quarterback is:** a Walk-on, or a special player that's always there.
- [ ] **What makes runs different** now that there's no Big to choose (a starting recruit, a coach, the team's look?).
- [ ] **Names:** "Walk-ons" or "Rookies"; "Hijinks" or "Trick Plays"; the team's name.
- [ ] **The Bat as both defender and recruit:** keep it (told apart by the helmet), or make the Picker an Owl or Crow.
- [x] **Who the defenders are:** each biome's locals, always in candy purple. The Forest set is built (gnome, rhino beetle, scarecrow, bat); the Graveyard and Mountain sets are still to design.
- [ ] **The theme of the climb:** where it's going, and whether there's a joke at the top.

### Can be settled by prototyping

- [ ] **Camera:** narrow perspective or orthographic *(decide in M1.3)*.
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
- [ ] **Drives and downs:** a line of scrimmage, a first-down line 10 rows upfield, four downs. A tackle ends the down (the next starts there), an incompletion uses the down, a sack uses it and loses 2 yards, and an interception or a failed 4th down is **game over**. A down-and-distance HUD ("2nd & 6") and the first-down line on the field.
- [ ] **Play cards:** each sets the formation and every route, with **Flip** to mirror it. A deck with draw 3, play 1, discard, reshuffle. Six starter plays: Go, Slant, Out, Curl, Screen, Draw. Players follow their routes; after a catch the carrier runs straight up.
- [ ] **Defensive jobs and coverage rings:** Covers (gnomes) shadow a receiver one beat behind and pursue after a catch; Zones (scarecrows) stand still with a wide ring; Blitzers rush the QB (no ring); a new **Safety** hangs deep and keeps you from gaining 10 in one play; Bats patrol. Purple coverage rings on defenders, and green/yellow/red rings on your players.
- [ ] **Blocks, not interceptions:** a pass to a covered (red) receiver bounces off the defender; an uncaught pass is incomplete. Both just use the down. A model for the Safety (an Owl?).
- [ ] **The pre-snap UI:** three cards to pick from, the chosen play's routes previewed on the field, Flip and HIKE.
- [~] The Haunted Forest's hazards: **Rolling Pumpkin** (ground lane) and **Witch on a Broom** (air lane that snatches passes), plus **Tombstones** (static obstacles) if time allows. Each needs a model, a beat pattern, a one-beat telegraph and a setup-phase preview. *The Witch is in (one per screen on a throw-band row, flying one tile per beat and wrapping, visible before HIKE); her edge flash telegraph isn't built yet. The pumpkin and tombstones are still to do.*
- [ ] **One area of four drives:** Intro, Challenge, Gimmick and Boss (placeholder Gimmick and Boss), then a "next area" stub.
- [ ] **The draft after a won drive:** one of three play cards, or remove one, in a plain UI.
- [ ] Game over and a score (drives won, yards gained).
- [-] ~~Endless screens from strip-based generation; the pile of balls and wipeouts.~~ Replaced by drives and game over on a lost drive.
- [ ] One song and the core SFX.
- [ ] Basic juice: cube bursts, hit-pause, screen shake, the fumble chant (a placeholder is fine).

**Done when:** a playtester on a phone finishes a run and *asks to go again*. Record what they found confusing, unfair or boring, and feed it back into M0 and M3.

---

## M3: Feel Pass

**Goal:** make every second feel great.

- [ ] The full juice list from GAMEPLAY.md: squash and stretch, everything bouncing on the beat, haptics, rhythm cues, sparkle trails, player noises.
- [ ] Every indicator from *Reading the Beat*, polished, with hazards telegraphing one beat ahead.
- [ ] The tombstone and waving ghost when a recruit dies.
- [ ] **Revisit the look:** the camera pitch (58°) and the characters' backward lean (35°) were chosen from screenshots (2026-10-17). Re-check them on phones, perhaps with a playtester, and tweak `tuning.camera` (try different values with `?pitch=` and `?tilt=`).
- [ ] Tuning: hop rates, throw range, and beat alignment.
- [ ] A screen-generation solvability check, so no unfair screens get through.

**Done when:** the game is satisfying to watch with the sound off, satisfying to play with the sound on, and playtesters can say *why* they fumbled.

---

## M4: Trick Plays and the Deck

**Goal:** the roguelite layer: the deck is the only progression *(re-scoped 2026-10-18)*.

- [-] ~~The Hype meter and Hijinks.~~ Trick plays are play cards.
- [ ] **Cards with special players** who exist only for that play: Bat Route, Skeleton Sneak, Pumpkin Decoy.
- [ ] **Trick-play cards:** Flea Flicker, Hook and Ladder, Hail Mary, Statue of Liberty.
- [ ] Card rarity, and card upgrades (e.g. a veteran version of a play).
- [ ] The draft UI: three cards, chosen in one tap, plus "remove a card".

**Done when:** two runs can grow into noticeably different teams and playstyles.

---

## M5: UI Shell and Polish

**Goal:** it looks and feels like a finished game from the first tap.

- [ ] The UX flow from M0: title, setup HUD, play HUD, draft, game over and the roll call.
- [ ] Pause, settings (volume, haptics, reduced motion), the calibration screen, credits (generated from the manifest).
- [ ] The "rotate your phone" card, safe areas and thumb-reach layout.
- [ ] SVG art for icons and cards. Public-domain UI assets, recolored to the palette.
- [ ] Saving and resuming a run in progress (if M0 approved it).
- [ ] An installable PWA that works offline, with an "update available" prompt.

**Done when:** a new player can install it, play, pause, resume and change settings, and nothing feels placeholder.

---

## M6: The Full Haunted Forest

**Goal:** the first place, complete.

- [ ] The full recruit roster for the forest, each with a model in the team helmet: Bat, Skeleton, Pumpkin-head, Werewolf, Mummy, Ghost, Black Cat, Witch, Frankenstein's Monster, Owl (THEME.md).
- [ ] Their perks and Hijinks.
- [ ] Every recruit's job reads from its silhouette and plays differently.

**Done when:** each recruit feels clearly different to play, and none of them is obviously the best.

---

## M7: Biomes, Bosses and the Climb

**Goal:** a run that changes as you go.

- [ ] A second haunted place (the graveyard), with its own strips, hazards, defenders, palette and song (with its own tempo), after the Haunted Forest.
- [ ] Biome transitions and their order (from M0).
- [ ] Boss screens with giant forest bosses, plus a boss song.
- [ ] A difficulty curve that hits the target run lengths: about 2 minutes early, about 10 for a good run, 20+ for a legendary one.

**Done when:** a good run passes through every biome and a boss, and the climb feels like a journey.

---

## M8: Meta and Onboarding

**Goal:** the first run teaches the game, and every later run gives you a reason to come back.

- [ ] Onboarding from M0: the first screens of the first run each teach one thing.
- [ ] Unlocks (from M0): new recruits, cards, team looks and places.
- [ ] Best distance on the title screen, and a collection screen.
- [ ] More content toward the v1 scope from M0.

**Done when:** a brand-new player gets through their first run without any explanation, and veterans have things to chase.

---

## M9: Content and Audio Complete

**Goal:** everything planned for v1 is in.

- [ ] All recruits, cards, perks and Hijinks from the v1 content scope.
- [ ] The full soundtrack: menus, three biomes, the boss, the stingers.
- [ ] The full SFX list, the crowd, the chant and the announcer (as decided in M0).
- [ ] Final names in place everywhere.
- [ ] The asset manifest is complete and the credits are correct.

**Done when:** there's nothing left marked "placeholder."

---

## M10: Release Candidate

**Goal:** ready to share at a public URL.

- [ ] Performance on low and mid-range phones: frame rate, load time, battery.
- [ ] An accessibility pass: reduced motion, color-blind checks, playing on mute, text sizes.
- [ ] A balance pass across the recruits and cards.
- [ ] A bug bash on iOS Safari and Android Chrome, in the browser and installed.
- [ ] The final domain/URL, a share image and a short landing blurb.

**Done when:** we'd be happy for strangers to play it.

---

## Backlog (after v1)

- [ ] **More haunted places:** the graveyard, a witch's swamp, a haunted manor, each with its own defenders, hazards and recruits.
- [ ] **Team looks:** helmet and jersey colors, team names.
- [ ] Daily runs with a shared seed.
- [ ] More biomes (swamp, sky, clockwork, sea).
- [ ] Balls with rules (e.g. a biting Skull perk).
- [ ] A native wrapper and app stores.

---

## Changelog

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
