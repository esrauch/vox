# Fourth & Ghoul: Milestones

This is a **living plan** for **Arcade Halloween Football**, the design in [GAMEPLAY.md](GAMEPLAY.md) (rewritten 2026-10-19). We work through it top to bottom and update it as we go: check items off, add what we discover, and move things around when priorities change. The theme is in [THEME.md](THEME.md) and the build in [TECHNICAL.md](TECHNICAL.md). This file tracks *what's next* and *what "done" means*.

**Status key:** `[ ]` to do · `[~]` in progress · `[x]` done · `[-]` dropped

**Current focus:** **play the timing design** (built 2026-10-20, not yet looked at in a browser): three cards and Flip, the sweep and THROW/RUN, Break it!. Then back to A2: upgrades between drives, and the feel.

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
- [x] **A random play each down:** its name flashes up, and its routes are drawn on the turf until the snap (dotted paths with arrows). *(2026-10-19)*
- [~] **Throw, hand off and steer** with one thumb: pull back to snap and aim, release to throw; tap a Runner to hand off; swipe to nudge the carrier. *(Wired 2026-10-19, not yet played on a phone.)*
- [~] **The three roles as placeholder silhouettes:** the walk-on stretched wide (Blockers), lean (Runners) and tall (Catchers), with a colored block on the head for a monster. *(2026-10-19; readability not yet checked from the camera.)*
- [~] **Rendering the real-time sim** (`src/arcade/game.ts`, `src/arcade/render/`): the third-person camera behind and above the QB, following the ball and the carrier; one long turf strip with the scrimmage and first-down lines (and the Boss's end zone); everyone turning to face where they're going and tipping over when down; the ball along its real arc with a landing ring; the aim's dashed arc; gold ring under the carrier, green or red under receivers; pops for every result. *(2026-10-19: built, not yet looked at in a browser. The old grid game is still at `?grid=1`.)*
- [ ] **A defense that scales:** three or four sleepy defenders on the first drive, up to the full forest by the area III Boss.
- [x] **TRICK OR TREAT! after each won drive:** three perks with rarity, new players with bio cards, swapping positions on the roster, Monster Mash. *(2026-10-21; Haunted Line still to build.)*
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

- [~] **Voxel models for the three roles** (Blocker, Runner, Catcher) and **the three monsters** (Golem, Werewolf, Ghost), all in the team helmet. Check each from the game camera at phone size. *(2026-10-21: the Ghost, Golem and Werewolf are modelled (`team/ghost`, `team/golem`, `team/werewolf`) and in the game; every position now shares one build and only Golems are stretched wide and low, the linebacker shape. Not yet checked from the camera.)*
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

- **2026-10-21:** **Models for the other kinds of player:** Ghost (a floating sheet with eye holes, a jersey stripe and a ragged hem), Golem (mossy stones, glowing eyes, a too-small helmet, a jersey scrap) and Werewolf (fur, ears through the helmet, snout and fangs, clawed feet), all in team colours. They replace the coloured head blocks; Ghosts hover. New palette colours: `fur`, `furDark`.
- **2026-10-21:** **TRICK OR TREAT! built.**
  - **The offer:** after each won drive, three perks, drawn by rarity: common 60%, rare 32%, epic 8%. Never the same perk twice in one offer, and a one-off perk isn't offered again once you have it.
  - **The perks:** +10 to a stat for everyone, +20 to a stat for one kind, Extra Sweep, Slow-Mo Sweep, Second Wind, Candy Corn Magnet, Hot Arm, and new players.
  - **New players** come with a bio (name, kind, preferred position, stats), and you tap the player they replace.
  - **Swapping:** tap two players on the roster to swap their positions.
  - **Monster Mash:** +10 to every stat for each player whose kind is unique on the team.
  - **Under the hood:** the roster is now players with their own stats, in slot order (`sim/team.ts`, `content/perks.ts`, `ui/trickOrTreat.ts`).
  - **Balance:** with random perks the bot wins about 5.7 drives of 12 (13% beat the game), against 3.8 taking none.
- **2026-10-20:** **Stats on a 50 scale; TRICK OR TREAT! designed.**
  - **Stats:** an ordinary player is 50 / 50 / 50, and every 10 points is one step (the physics and Break it! read steps from 50), so there's room for small tuned bonuses. It plays the same as before.
  - **TRICK OR TREAT!** (design only): after each won drive, pick one of three perks with rarity. The baseline is +10 to a stat for everyone; others include kind bonuses, sweep and pocket perks, a faster ball, Second Wind, and new players with bio cards.
  - **Monster Mash:** +10 to every stat for each player whose kind is unique on the team.
  - **Any player can play any position.**
- **2026-10-20:** **The bullet goes past the scrum.** Blockers are never eligible to catch, and a Rhino Beetle engaged with one of your players can't bat it down (a free one still can). SWATTED! is now BLOCKED!.
- **2026-10-20:** **After every Break it!, a big GREAT! / OK / BAD** in the middle of the screen (green, orange, red), with the yards still popping below it. The PANCAKE! pop is gone (the hit still sounds). The pumpkin's embers now stream in every phase, play selection included, and a dead ball hovers above the pile instead of sinking into it.
- **2026-10-20:** **The pumpkin throws itself.**
  - **No QB model:** the sim still has the QB (where throws start, and who's sacked), but the pumpkin floats there, bobbing, face to the camera. On a QB run it bounds upfield on its own.
  - **Embers:** glowing cubes drift off it, a trail of sparks follows it in flight, and bursts go off when it's thrown, caught, batted down or run.
- **2026-10-20:** **Break it! gets a countdown; the pumpkin gets bigger.**
  - **Every test opens with a two-second "GET READY TO …"** (taps don't count during it), then the call.
  - **JUKE! has ◀ and ▶ buttons** on screen through the countdown; the one to press lights up when it ends.
  - **The pumpkin ball is twice the size** and spins half as fast.
  - **The QB casts no shadow** while the pumpkin's in his hand, so he doesn't block its light.
- **2026-10-20:** **The ball is a jack-o'-lantern again, and it's the light.**
  - **The model:** the round pumpkin with the glowing face, a bit bigger so it reads from the arcade camera, drawn unlit so it glows.
  - **The light:** a warm, slightly flickering lamp inside it lights the field and casts the shadows: they swing as it flies and pool around the carrier.
  - **The moon** is now a dim fill with no shadows.
- **2026-10-20:** **Break it! has three tests, and the game runs 20% slower.**
  - **Each grab picks one test at random:** the bar, **MASH!** (tap fast; Heft fills it faster), or **JUKE!** (tap the side the arrow shows, quickly; Hustle gives a longer window). A guess before the arrow is a tackle.
  - **The sim runs at 0.8× real time,** so everything slows together and the balance numbers are unchanged.
  - **Balance** (the bot mashes about 8 taps a second, and jukes the right way 90% of the time after 0.3 s): plain humans win about 3 drives of 12, all three monster types about 8.
- **2026-10-20:** **Pick, look, then hike.** Tapping a card now calls it: its routes are drawn on the field, another card can be tapped instead, and Flip mirrors it in place. HIKE! (or Space) starts the play. Keys: 1–3 call a card, F flips.
- **2026-10-20:** **Built: the timing design.**
  - **Three cards a down,** with Flip. A finger on a card shows its routes; letting go calls and snaps. Handoffs are the Dive and a new Sweep.
  - **The aim line sweeps** sideline to sideline. Receivers it's over light up gold. THROW fires a bullet along it, and the first thing that reaches it decides it: a Scarecrow's ring blocks a whole lane.
  - **RUN:** the QB keeps it, drifting to the open side.
  - **The pocket** holds for 3 sweeps, and the sweep is faster each area.
  - **Carriers choose their own lanes.**
  - **Break it!** freezes the play on every grab, with a sweet spot sized by Heft and narrowed by extra tacklers: break, drag or tackled.
  - **The balance bot** plays it (it reacts to a catchable throw a quarter of the time, and hits Break it! 60% of the time). Plain humans win about 4 drives of 12; downs last about 4 seconds; runs and passes gain about the same, around 3.8 yards each. Ghost Catchers do worse than humans for now: their Heft −1 narrows Break it!.
  - **Keys:** Space, R, F and 1–3.
- **2026-10-20:** **Designed: the timing controls.**
  - **Three random play cards** with Flip; tapping one snaps. Handoffs are cards (Dive, and a new Sweep).
  - **A sweeping aim line** and a THROW button for **bullet** passes: no aiming, no distance.
  - **RUN** for the QB, who drifts to the open side.
  - **The pocket collapses after three sweeps,** and the sweep speeds up in later areas.
  - **No steering:** carriers find the open lane themselves.
  - **Break it!** on every tackle: one timed tap breaks it, drags it, or not, with the sweet spot sized by Heft.
  - **Replaces** slingshot aiming, swipe steering and the auto-picked play.
- **2026-10-19:** **The plays reworked.**
  - **Every Runner gets past the line of scrimmage.** Only the Blockers stay home: the Runners on Slants and Deep Shot run check-downs, and on the Dive the second Runner leads through the hole.
  - **Every route finishes going upfield.** Slants cut in, then go straight up. The flats turn up the sideline.
  - **Curls come back at an angle** toward the middle, so they read as curls.
  - **No route runs deeper than a throw can reach.**
  - **A content test** keeps all of this true.
- **2026-10-19:** **Scarecrows matter, and the routes show before the snap.**
  - **Scarecrows** reach a wide purple ring, drawn on the turf. Any low ball coming down inside it is contested, and their Hands (3) beat a plain Catcher's. Running into one stops you dead.
  - **Bats** get a small ring too.
  - **Each receiver's route** is drawn as dotted paths with an arrow until the snap.
  - **The balance bot** now reads the rings, measuring room from the edge of each defender's reach. It throws away from Scarecrows; plain humans win about 7 drives of 12.
- **2026-10-19:** **A narrower field, more defenders and a simpler bot.**
  - **The field** is 30% narrower (18 yards), so the camera can fit both sidelines from closer. The line-ups, routes and defense spots shrank with it.
  - **More defenders:** Intro 4, Challenge 5, Gimmicks 5–6, Boss 8.
  - **The bot** now plays like a casual player: it runs 30% of the time, otherwise throws at 2 seconds to the receiver furthest from any defender.
  - **Results** (100 runs a build): plain humans win about 6 drives of 12; one monster type 7–10 (Ghost Catchers beat the game 28%); all three 10.5, beating it 64%. Downs last about 3 seconds. Runs gain about 1 yard against about 6 for passes.
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
