# Fourth & Ghoul: Milestones

This is a **living plan** for **Arcade Halloween Football**, the design in [GAMEPLAY.md](GAMEPLAY.md) (rewritten 2026-10-19). We work through it top to bottom and update it as we go: check items off, add what we discover, and move things around when priorities change. The theme is in [THEME.md](THEME.md) and the build in [TECHNICAL.md](TECHNICAL.md). This file tracks *what's next* and *what "done" means*.

**Status key:** `[ ]` to do · `[~]` in progress · `[x]` done · `[-]` dropped

**Current focus:** **A1, the real-time simulation**, built alongside the old one in `src/arcade/` so the current game keeps running until A2 switches over. Work happens on the branch `design/arcade`. The earlier grid design (and its milestones) are in git history and summed up in GAMEPLAY.md, *History*.

---

## What We Already Have

Built for the earlier designs and carried over as they are:

- [x] **The stack:** TypeScript, three.js and Vite, a PWA, `npm run check` (types, lint, tests, assets).
- [x] **Rendering:** the fitted ¾ perspective camera, fog, moonlight and shadows, the forest scenery, the one long field that runs on past the first-down line, and the camera glide from one drive into the next, with a crossfade.
- [x] **Voxels:** the `.voxt` format, the greedy mesher, the model viewer and the screenshot tool. Models: the walk-on, the QB (arm up and down), the ball, the forest defenders (gnome, rhino beetle, scarecrow, owl, bat), the Witch, forest props.
- [x] **Audio:** the synth, the mixer, the sound effects, four song loops on one shared grid (Spooky Surf is in the game; the other three are waiting for a listen).
- [x] **UI:** the DOM HUD, the drive banner, down and distance, pops, the self-hosted Creepster font (no flash of fallback text).
- [x] **The run's shape:** drives of four downs to gain 10 yards, areas of four drives (Intro, Challenge, Gimmick, Boss), the Boss drive going for a touchdown, game over on a failed 4th down.
- [x] **Headless balance runs:** `npm run balance` plays whole runs through the sim with a bot. It has to be ported to the new simulation (A1).

What goes: the grid and the beat-locked tick, play cards and the hand, the dice checks, and the roster-of-four prototype.

---

## A0. Decisions Before Building

- [x] **Steering:** the carrier charges upfield on its own; each swipe left or right nudges it a little to that side. No juke. *(2026-10-19)*
- [x] **On the field:** eight a side: the QB plus seven (2 Blockers, 2 Runners, 3 Catchers). *(2026-10-19)*
- [x] **Camera:** third person, behind and above the QB, lower than before, following the play. *(2026-10-19)*
- [x] **The playbook:** four new plays (Slants, Deep Shot, Curl & Flat, Dive), picked at random and randomly mirrored. *(2026-10-19)*
- [ ] **Who upgrades land on:** a random player in the role, or you choose. *(Needed for A2.)*

---

## A1. The Real-Time Simulation

**Done when** a whole down plays out in the sim alone, deterministically, and the tests and balance runs pass.

- [ ] **A fixed-timestep sim** (for example 60 steps a second), pure and seeded like the old one: the same seed and inputs always give the same run.
- [ ] **Bodies:** circles with position, velocity, mass (Heft), top speed (Hustle) and reach (Hands). Collisions push by mass.
- [ ] **Roles and jobs:** Blockers find a rusher and shove it; Runners and Catchers run their routes; the defense's Rushers, Covers, Scarecrows, the Owl and Bats do their jobs.
- [ ] **The ball:** the throw arc (kept from the grid design), catching by reach, contested balls won by Hands, batted-down low passes, the Witch.
- [ ] **The carrier:** swipe steering, tackles as collisions, breaking free on a big Heft gap, out of bounds.
- [ ] **How a down ends:** tackled, incomplete, batted down, sacked, over the line.
- [ ] **Tests** for each of these, and **the balance runs ported** to the new sim, with a bot that throws and steers.

## A2. First Playable

**Done when** a whole run plays on a phone, from one tap to game over, and it's fun to play again.

- [ ] **Instant start:** one tap from the title to the first snap.
- [ ] **A random play each down:** its name flashes up, its routes show for a moment.
- [ ] **Throw and steer** with one thumb: pull back to snap and aim, release to throw, drag and flick to carry.
- [ ] **The three roles as placeholder silhouettes** (scaled walk-ons are fine at first), readable at the new scale.
- [ ] **Rendering the real-time sim:** smooth movement, the arc and landing ring, the carrier's ring, who's open.
- [ ] **A defense that scales:** three or four sleepy defenders on the first drive, up to the full forest by the area III Boss.
- [ ] **Upgrades after each won drive:** the three transforms (Golem, Werewolf, Ghost) and training, with a roster screen of simple pips.
- [ ] **Balance from the headless runs:** a team that never upgrades loses in area II; a decent build reaches the last Boss; a strong one beats it.

## A3. Impact and Feel

**Done when** every play ends with something that *hits*. This is a pillar, not polish; much of it lands alongside A2.

- [ ] **Hit-pause** on tackles, blocks and catches, and **screen shake** scaled to the hit.
- [ ] **Flying bodies:** pancaked defenders tumble; a tackled carrier bursts into voxel bits that click back together.
- [ ] **The catch moment:** a split second of slow motion.
- [ ] **Squash and stretch,** the spinning ball, dust and leaves.
- [ ] **Sound on every contact,** the crowd, and big hits landing on the beat when they can.
- [ ] **Haptics** on the snap, the throw, the catch and hits.
- [ ] **No dead time:** the next down lines up in about a second; the upgrade pick takes a few.

## A4. Monsters and the Build

- [ ] **Voxel models for the three roles** (Blocker, Runner, Catcher) and **the three monsters** (Golem, Werewolf, Ghost), all in the team helmet. Check each from the game camera at phone size.
- [ ] **Team bonuses:** The Wall, The Pack, The Haunting, Monster Mash, Final Girls, tuned with the balance runs.
- [ ] **Three areas** (the forest three times, stiffer each time, until there are more).

## A5. Content

- [ ] **A real Boss:** the Treant.
- [ ] **Trick plays:** one-use upgrades, starting with the Pumpkin Bomb.
- [ ] **New plays** for the random pool as unlocks.
- [ ] **More monsters:** the Skeleton, the Mummy, the Pumpkin-head.
- [ ] **A second area** (the graveyard), with its own defenders, hazards, palette and song.

## A6. Ship It

- [ ] **Test on a real iPhone** (Safari, audio unlock, haptics, the safe areas).
- [ ] **Deploy** with GitHub Pages through GitHub Actions.
- [ ] **Title, settings and pause:** sound, haptics, and how to play in one screen.
- [ ] **Score and meta:** the best run on the title screen, and light unlocks for variety.
- [ ] **Performance** on a mid-range phone: sixteen bodies, shadows, particles.

---

## Loose Ends

- [ ] **Listen to the three waiting song loops** (Graveyard Shuffle, Midnight Chase, Skeleton Stomp) and decide which to keep.
- [ ] **Push** `main`, and decide what to do with the branches `design/roster-stats` and `design/arcade` (the user pushes).

---

## Changelog

- **2026-10-19:** **The plan starts over for Arcade Halloween Football.** GAMEPLAY.md was rewritten from first principles: real time instead of the grid and the beat, throw then steer, the QB plus eight players as Blockers, Runners and Catchers, physical stats instead of dice, a random play each down, no draft at the start, and a run that builds up against a defense that scales. The earlier milestones and changelog are in git history.
