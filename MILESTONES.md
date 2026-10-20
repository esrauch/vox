# Fourth & Ghoul: Milestones

This is a **living plan** for **Arcade Halloween Football**, the design in [GAMEPLAY.md](GAMEPLAY.md) (rewritten 2026-10-19). We work through it top to bottom and update it as we go: check items off, add what we discover, and move things around when priorities change. The theme is in [THEME.md](THEME.md) and the build in [TECHNICAL.md](TECHNICAL.md). This file tracks *what's next* and *what "done" means*.

**Status key:** `[ ]` to do · `[~]` in progress · `[x]` done · `[-]` dropped

**Current focus:** **A2, the first playable**: the arcade game now renders and takes input (`src/arcade/game.ts`), untested in a browser. Next: play it, fix what's wrong with the camera, scale and controls, judge the pacing by feel, then upgrades between drives. Work happens on the branch `design/arcade`. The earlier grid design (and its milestones) are in git history and summed up in GAMEPLAY.md, *History*.

---

## What We Already Have

Built for the earlier designs and carried over as they are:

- [x] **The stack:** TypeScript, three.js and Vite, a PWA, `npm run check` (types, lint, tests, assets).
- [x] **Rendering:** the fitted ¾ perspective camera, fog, moonlight and shadows, the forest scenery, the one long field that runs on past the first-down line, and the camera glide from one drive into the next, with a crossfade.
- [x] **Voxels:** the `.voxt` format, the greedy mesher, the model viewer and the screenshot tool. Models: the walk-on, the QB (arm up and down), the ball, the forest defenders (gnome, rhino beetle, scarecrow, owl, bat), the Witch, forest props.
- [x] **Audio:** the synth, the mixer, the sound effects, four song loops on one shared grid (Spooky Surf is in the game; the other three are waiting for a listen).
- [x] **UI:** the DOM HUD, the drive banner, down and distance, pops, the self-hosted Creepster font (no flash of fallback text).
- [x] **The run's shape:** drives of four downs to gain 10 yards, areas of four drives (Intro, Challenge, Gimmick, Boss), the Boss drive going for a touchdown, game over on a failed 4th down.
- [x] **Headless balance runs:** `npm run balance` (the grid sim) and `npm run balance:arcade` (the new sim, A1).

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

**Done when** a whole down plays out in the sim alone, deterministically, and the tests and balance runs pass. **Built 2026-10-19** in `src/arcade/` (alongside the old grid sim, which the game still renders until A2).

- [x] **A fixed-timestep sim** at 60 steps a second, pure and seeded: the same seed and inputs always give the same run (`src/arcade/sim/step.ts`, `run.ts`).
- [x] **Bodies:** circles with position, velocity, mass (1.25 ^ Heft), top speed (Hustle) and reach (Hands). Overlaps are pushed apart by weight; Scarecrows are planted; your players pass through each other.
- [x] **Roles and jobs:** Blockers get between a rusher and the QB (after the catch, between the nearest defender and the carrier); route runners run their waypoints and go for a ball coming down near them; Rushers charge the QB, Covers trail their mark, the Owl hangs deep and comes down, Bats loop; after the catch everyone chases.
- [x] **The ball:** the throw arc, catching by reach, contested balls won by Hands (ties to you), low passes batted down, the Witch.
- [x] **Handing off:** tap a Runner to snap and hand it the ball, or hand off in the first second after the snap, on any play (Retro Bowl's run-or-pass choice, without play cards). The Dive is the play built for it. *(2026-10-19)*
- [x] **The carrier:** swipe steering (a lane nudged 1½ yards a swipe), tackles on contact, breaking free 2 Heft heavier, pancakes 3 Heft heavier, out of bounds.
- [x] **How a down ends:** tackled, incomplete, batted, sacked, out of bounds, over the line; drives, areas and the run (three areas), with a placeholder pause where the upgrade pick will go.
- [x] **Tests** (`tests/arcade/`), and **the balance runs** (`npm run balance:arcade`) with a bot that throws and steers.

**Tuned 2026-10-19** with the balance runs (100 runs a build, the bot never upgrading during a run). Changes:
- Everyone and the ball slowed down.
- Blocks hold.
- Tackles are a grab and a drag.
- The ball comes down at catching height, so only the ends of a throw can be touched.
- Rushers line up outside the Blockers, and handoffs head for the play's hole.
- The Boss drive gets no extra boost.
- Golem Heft +4, Werewolf Hustle +3, Ghost Hustle +2.

Results (drives won of 12, and how often the game is beaten):

| Build | Drives won | Beat the game |
|---|---|---|
| All human | about 5 | 0% (loses around the area II Boss) |
| One monster type | 6 to 8 (Golem Blockers 7.9) | up to 12% |
| All three types | about 11 | about 60% |

Every training pick helps. Two things are still off target: **downs last about 2 seconds** (the target is 4 to 8), and **runs gain about half what passes do**. Both are for the first playable, judged by feel.

## A2. First Playable

**Done when** a whole run plays on a phone, from one tap to game over, and it's fun to play again.

- [ ] **Instant start:** one tap from the title to the first snap.
- [ ] **A random play each down:** its name flashes up, its routes show for a moment.
- [~] **Throw, hand off and steer** with one thumb: pull back to snap and aim, release to throw; tap a Runner to hand off; swipe to nudge the carrier. *(Wired 2026-10-19, not yet played on a phone.)*
- [~] **The three roles as placeholder silhouettes:** the walk-on stretched wide (Blockers), lean (Runners) and tall (Catchers), with a colored block on the head for a monster. *(2026-10-19; readability not yet checked from the camera.)*
- [~] **Rendering the real-time sim** (`src/arcade/game.ts`, `src/arcade/render/`): the third-person camera behind and above the QB, following the ball and the carrier; one long turf strip with the scrimmage and first-down lines (and the Boss's end zone); everyone turning to face where they're going and tipping over when down; the ball along its real arc with a landing ring; the aim's dashed arc; gold ring under the carrier, green or red under receivers; pops for every result. *(2026-10-19: built, not yet looked at in a browser. The old grid game is still at `?grid=1`.)*
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

- **2026-10-19:** **The arcade game renders.** The app now opens the arcade game (the grid game is at `?grid=1`): a third-person camera behind and above the QB, following the play; one long field; placeholder role silhouettes and monster badges; the ball's real arc; pull to throw, tap a Runner to hand off, swipe to steer. The view gained a follow-camera mode and the forest scenery a field layout, so both games share them. Not yet looked at in a browser.
- **2026-10-19:** **The arcade sim is tuned** with the balance runs. Changes:
  - **Slower all round.**
  - **Blocks hold** a defender.
  - **Tackles are a grab and a drag,** so Heft is yards after contact.
  - **The ball comes down at catching height,** so a Cover left a step behind can't swat it. Faster Catchers used to do *worse*.
  - **Rushers line up wide,** and handoffs head for the hole.
  - **No extra boost on the Boss.**
  - **Stronger monsters.**

  Now every upgrade helps; plain humans lose around the area II Boss, and a full monster team beats the game about 60% of the time.
- **2026-10-19:** **A1 built: the real-time simulation** in `src/arcade/` (content, sim, tests, `npm run balance:arcade`). Eight a side at 60 steps a second; stats as weight, speed and reach; the four plays; the forest's defenses scaling by drive and area. The first balance numbers say downs are far too short and Hands decides too much; tuning comes with the first playable.
- **2026-10-19:** **The plan starts over for Arcade Halloween Football.** GAMEPLAY.md was rewritten from first principles: real time instead of the grid and the beat, throw then steer, the QB plus eight players as Blockers, Runners and Catchers, physical stats instead of dice, a random play each down, no draft at the start, and a run that builds up against a defense that scales. The earlier milestones and changelog are in git history.
