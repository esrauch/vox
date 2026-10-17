# Fee Fi Fo Fumble: Milestones

This is a **living plan**. We work through it top to bottom and update it as we go: check items off, add what we discover, and move things around when priorities change. The design lives in [THEME.md](THEME.md), [GAMEPLAY.md](GAMEPLAY.md) and [TECHNICAL.md](TECHNICAL.md). This file tracks *what's next* and *what "done" means*.

**Status key:** `[ ]` to do · `[~]` in progress · `[x]` done · `[-]` dropped

**Current focus:** testing the M1.1 beat clock on real phones, then M1.2 (the simulation core). M1.0 is done apart from going live on GitHub Pages.

---

## M0: Open Design Decisions

Most of the design is settled. What's left is listed here, grouped by when it has to be decided. Items marked *(rec: …)* already have a recommendation in the design docs, so they only need a yes or no.

### Needed before the first playable (M2)

- [x] **Name for the default Smalls:** Walk-ons.
- [x] **Starting slots:** 5, with "+1 slot" as a rare card.
- [x] **Starting balls:** 3.
- [x] **Wipeout:** lose a ball and restart the screen from setup. Walk-ons return, and dead recruits stay dead.
- [x] **Draft mix:** always one recruit, one Walk-on upgrade and one other card.
- [x] **Throw range:** most of the screen, never the top rows.
- [x] **Catching:** a Small catches on its own tile, or lunges one tile ahead. An exact-tile **Clean Catch** lets the receiver fend off 1 defender. Defenders only intercept on the exact tile.
- [x] **Catch glow:** always on.
- [x] **Hazards hit defenders too.**
- [x] **The pocket:** **Blitzers** (formerly Climbers) rush the Big. Each **Blocker** (formerly a guard) has a hold counter, and each Blitzer attack (e.g. every 2 beats) ticks it down. At 0 the Blocker is beaten, and several Blitzers drain it faster. The Big has its own counter, starting at 3 and shown only once a Blitzer arrives. If it hits 0 while the Big holds the ball, it's a sack (a fumble).
- [x] **Collisions:** the defender always wins against Walk-ons. Some units **fend off N defenders**.
- [x] **Bigs have no stats.** Choosing a Big only sets the theme and the draft pool. The Big improves only through perks.
- [x] **The stat scale:** every Small and defender has Hustle, Hands and Heft as whole numbers from 0. Walk-ons are 0/0/0. Hustle 0 hops every 2 beats, Hands 0 catches on its own tile or 1 ahead, and Heft 0 dies on the first hit.
- [ ] **What 1+ means** for each stat, and the stat values for defenders. *(Decide during M1.2 and M2 tuning.)*
- [~] **Defender kinds and per-beat rules:** a draft spec is in GAMEPLAY.md (Chaser, Blitzer, Wall-er, Picker). Confirm it during M2 playtesting.
- [x] **Hands is catch reach:** the own tile plus one ahead, and high Hands adds diagonal lunges.
- [x] **Walk-ons are dumb:** they hop straight up their column, even into danger. Recruits and upgrades can add smarter footwork.

### Missing from the design so far (needed before M5–M8)

- [ ] **Onboarding:** how a first-time player learns setup, the reticle, the ball button and On-Beat, with no tutorial wall. *(Idea: the first few screens of the first run are built to teach one thing each.)*
- [ ] **The UX flow and wireframes:** title, Big select, setup, play HUD, draft, game over (with the roll call of fallen recruits), pause, settings and calibration.
- [ ] **Unlock conditions:** how new Bigs and new cards are earned (distance milestones? achievements?).
- [ ] **Content scope for v1:** how many recruits, Walk-on upgrades, perks and Hijinks each Big gets, and how many biomes there are.
- [ ] **Biomes:** their order, how many screens each lasts, and whether the sequence loops or changes as you climb.
- [ ] **Boss screens:** how often they come, what an enemy Big does on the beat, and how you beat one.
- [ ] **The Hype economy:** meter size, what fills it and by how much, and how much each Hijink costs.
- [ ] **Treats vs Tricks:** keep Tricks for v1, or postpone?
- [ ] **The announcer:** text pop-ups only, or synthesized or sampled voice?
- [ ] **The audio list:** the songs (per biome, boss, menus) and the core list of sound effects.
- [ ] **Final names:** the three Bigs' homeland team names (from the candidate lists in THEME.md).
- [ ] **The theme of the climb:** where it's going, and whether there's a joke at the top.

### Can be settled by prototyping

- [ ] **Camera:** narrow perspective or orthographic *(decide in M1.3)*.
- [ ] **The On-Beat timing window** *(decide in M1.1, generous by default)*.
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
- [x] Tap judging: each tap's offset from the nearest beat, the On-Beat window (±80 ms to start), and which beat the action resolves on. Taps are mapped to *audible* time via `getOutputTimestamp`, with a latency fallback.
- [x] Latency calibration: tap along, with the median of 12 taps after 4 warm-up taps saved to settings.
- [x] Audio unlock on first tap, and pause/resume when the tab is hidden or shown.
- [x] A debug page (`/dev/beat.html`): beat pulse, verdicts, offset histogram, latency readouts, frame time, BPM and window sliders, haptic tick.
- [x] Unit tests for the beat maths and calibration.
- [ ] **On a real mid-range Android phone and an iPhone:** does it feel tight, do the offsets match what you feel, and does calibration fix Bluetooth headphones? Then choose the On-Beat window.

**Done when:** on a mid-range Android phone and on an iPhone, tapping along *feels* tight, the judged offsets match what you feel, and calibration fixes Bluetooth headphones. *(Everything is built and checked in a desktop browser. The real-phone feel test is still to do.)*

### M1.2 Simulation core
- [ ] The grid (about 9 × 16), strips, and the setup zone.
- [ ] Units, with Hustle, Hands and Heft. They hop on the beat and face their next hop.
- [ ] Actions are queued and resolve on the next beat.
- [ ] Throws: a reticle tile, and a fixed 2-beat flight (1 beat with Fast Throw).
- [ ] The ball landing: catch, interception or miss. Interceptions and misses are fumbles.
- [ ] Fumbles and the pile of balls, plus the run ending when the last ball is gone.
- [ ] Knocked down vs. dead, the Walk-on/recruit slot rules, and wipeouts.
- [ ] Blitzers, Blockers and counters: attack rhythm, ganging up, the Big's counter, and sacks.
- [ ] A seeded RNG, and deterministic replays (seed plus inputs).
- [ ] Unit tests covering all of the above.

**Done when:** a whole screen can be played headlessly in tests, from setup through touchdown or fumble, and replays come out the same every time.

### M1.3 Minimal render
- [ ] A three.js scene, the camera (prototype both options), lighting and a checkerboard field.
- [ ] Plain cubes standing in for units, animated with hops between beats.
- [ ] Field indicators: the reticle, the landing ring with countdown pips, facing arrows, the throw-range ring.
- [ ] The DOM overlay: the ball button (pulsing on the beat), the beat bar, the ball pile.
- [ ] Touch input: tapping a tile places the reticle, tapping the ball button throws, and setup supports dragging.

**Done when:** a single screen is playable in grey boxes on a phone, at 60 fps.

### M1.4 Voxel pipeline
- [ ] The `.voxt` text format, with a parser and palette references.
- [ ] MagicaVoxel `.vox` import, with colors mapped to the palette.
- [ ] Greedy meshing, cached geometry, and instancing for repeated units.
- [ ] Headless previews: PNG turntables and a contact sheet per Big.
- [ ] The `/dev/models` viewer.
- [ ] First models: an Elder Bough Walk-on, the Elder Bough, and the Jack-o'-Lantern ball.

**Done when:** Claude can write a `.voxt` model, render a preview, look at it, and iterate, and the result appears in the game.

### M1.5 Synth and first audio
- [ ] The mixer (music, SFX and UI buses).
- [ ] The synth voices: oscillators, filters, envelopes, noise and drums.
- [ ] Songs written as data, with stems rendered to audio buffers at load.
- [ ] The song player, locked to the beat clock, with the setup loop switching to the full song on **HIKE!**
- [ ] sfxr-style SFX: hop, throw, catch, burst, UI click, fumble.
- [ ] Render-to-WAV plus waveform PNG tooling, and the `/dev/audio` sound board.
- [ ] **The first song:** one cheerful Halloween track.

**Done when:** the first song loops seamlessly in time with the beat clock on a phone, and a human has listened and approved it.

---

## M2: First Playable

**Goal:** prove the fun. It's rough, but it's a whole run.

- [ ] One Big (**the Elder Bough**), Walk-ons, and **two recruit kinds**.
- [ ] One biome, generic defenders (all four kinds), and two hazards (one lane, one timed trap).
- [ ] Endless screens from strip-based generation, with a simple difficulty ramp.
- [ ] A draft with **recruit** and **Walk-on upgrade** cards only, in a plain UI.
- [ ] The pile of balls, wipeouts, game over, and a score in yards.
- [ ] One song and the core SFX.
- [ ] Basic juice: cube bursts, hit-pause, screen shake, the fumble chant (a placeholder is fine).

**Done when:** a playtester on a phone finishes a run and *asks to go again*. Record what they found confusing, unfair or boring, and feed it back into M0 and M3.

---

## M3: Feel Pass

**Goal:** make every second feel great.

- [ ] The full juice list from GAMEPLAY.md: squash and stretch, everything bouncing on the beat, haptics, the "ON BEAT!" pop, sparkle trails, Small noises.
- [ ] Every indicator from *Reading the Beat*, polished, with hazards telegraphing one beat ahead.
- [ ] The tombstone and waving ghost when a recruit dies.
- [ ] Tuning: hop rates, throw range, Blitzer attack rhythm and the Blocker and Big counters, the On-Beat window.
- [ ] A screen-generation solvability check, so no unfair screens get through.

**Done when:** the game is satisfying to watch with the sound off, satisfying to play with the sound on, and playtesters can say *why* they fumbled.

---

## M4: Hijinks and the Draft

**Goal:** the roguelite layer.

- [ ] The Hype meter, filled by On-Beat throws and drained by fumbles.
- [ ] Hijinks only after the throw, using the reticle, in targeted and global kinds, with the On-Beat bonus.
- [ ] Three Hijinks for the Elder Bough.
- [ ] The full card types: recruit upgrades, arm perks (Long Arm), +1 slot, extra balls, Fast Throw, Perfect Spiral, Butterfingers Insurance, Second String.
- [ ] Treats and Tricks (if M0 kept Tricks).
- [ ] The draft UI: three cards, chosen in one tap.

**Done when:** two runs with the same Big can grow into noticeably different squads and playstyles.

---

## M5: UI Shell and Polish

**Goal:** it looks and feels like a finished game from the first tap.

- [ ] The UX flow from M0: title, Big select, setup HUD, play HUD, draft, game over and the roll call.
- [ ] Pause, settings (volume, haptics, reduced motion), the calibration screen, credits (generated from the manifest).
- [ ] The "rotate your phone" card, safe areas and thumb-reach layout.
- [ ] SVG art for icons and cards. Public-domain UI assets, recolored to the palette.
- [ ] Saving and resuming a run in progress (if M0 approved it).
- [ ] An installable PWA that works offline, with an "update available" prompt.

**Done when:** a new player can install it, play, pause, resume and change settings, and nothing feels placeholder.

---

## M6: All Three Bigs

**Goal:** the starting roster.

- [ ] **The Groundskeeper:** the Skull ball, bedsheet-ghost Walk-ons, a recruit pool (Rattlebones, Shamblers, Wisps, Grave Rats), its perks and Hijinks.
- [ ] **The Slagfather:** the Ember ball, coal-sprite Walk-ons, a recruit pool (Cinder Imps, Kobolds, Rocklings, Salamanders), its perks and Hijinks.
- [ ] Full Elder Bough recruit pool (Pixies, Acorns, Squirrel Riders, Toadstools).
- [ ] Voxel models and a palette for each.
- [ ] A Big-select screen showing all three.

**Done when:** each Big feels clearly different to play, and none of them is obviously the best.

---

## M7: Biomes, Bosses and the Climb

**Goal:** a run that changes as you go.

- [ ] Three biomes (Graveyard, Forest, Mountain), each with its own strips, hazards, defenders, palette and song (with its own tempo).
- [ ] Biome transitions and their order (from M0).
- [ ] Boss screens with enemy Bigs, plus a boss song.
- [ ] A difficulty curve that hits the target run lengths: about 2 minutes early, about 10 for a good run, 20+ for a legendary one.

**Done when:** a good run passes through every biome and a boss, and the climb feels like a journey.

---

## M8: Meta and Onboarding

**Goal:** the first run teaches the game, and every later run gives you a reason to come back.

- [ ] Onboarding from M0: the first screens of the first run each teach one thing.
- [ ] Unlocks (from M0): new cards in each Big's pool, and the Big variants hook (see Backlog).
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
- [ ] A balance pass across all three Bigs.
- [ ] A bug bash on iOS Safari and Android Chrome, in the browser and installed.
- [ ] The final domain/URL, a share image and a short landing blurb.

**Done when:** we'd be happy for strangers to play it.

---

## Backlog (after v1)

- [ ] **Big variants** that share a homeland pool, e.g. Ghost, Skeleton and Vampire for the Graveyard.
- [ ] **The Halflings** (*The Second Breakfast Club*): the hired ogre, the Sandwich ball, and Hijinks-heavy play.
- [ ] Daily runs with a shared seed.
- [ ] More biomes (swamp, sky, clockwork, sea).
- [ ] Balls with rules (e.g. a biting Skull perk).
- [ ] A native wrapper and app stores.

---

## Changelog

- **2026-10-17:** M1.1 beat clock built: clock, metronome, tap judging, calibration, and the `/dev/beat.html` debug page. Waiting on the phone test.
- **2026-10-17:** Upgraded to Node 24, Vite 8, Vitest 5 and ESLint 10. The audit is clean.
- **2026-10-17:** M1.0 scaffold built: hello-cube page, checks, tests, asset manifest, Pages workflow.
- **2026-10-17:** Set the stat scale, with Walk-ons at 0/0/0.
- **2026-10-17:** Made most of the M0 decisions needed before M2.
- **2026-10-17:** Plan created. The design docs (THEME, GAMEPLAY, TECHNICAL) were drafted earlier the same day.
