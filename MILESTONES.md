# Get Jack Back: Milestones

This is a **living plan** for the game in [GAMEPLAY.md](GAMEPLAY.md). We work through it top to bottom and update it as we go: check items off, add what we discover, and move things around when priorities change. The theme is in [THEME.md](THEME.md) and the build in [TECHNICAL.md](TECHNICAL.md). This file tracks *what's next* and *what "done" means*.

**Status key:** `[ ]` to do · `[~]` in progress · `[x]` done · `[-]` dropped

**Current focus:** **levels, defenders and Bosses**: make each drive and area play differently, now that a practised player beats the current game about half the time with no upgrades.

---

## What We Have

- [x] **The stack:** TypeScript, three.js and Vite; `npm run check` (lint, format, types, tests, asset licenses); deploys through GitHub Actions.
- [x] **The simulation** (`src/arcade/sim/`): a pure, seeded 60 Hz step; eight a side as circle bodies; stats as weight, speed and reach; blocking as shoving, pancakes, tackles, drags, contested catches; teammates who spread their blocks and give way to the carrier.
- [x] **A down:** three random play cards (Slants, Deep Shot, Curl & Flat, Dive, Sweep) with Flip and HIKE!; the sweeping aim line and THROW; the pocket of three sweeps; handoffs with the play fake and decoy Catchers; carriers that pick their own lane.
- [x] **Break it!:** the bar, MASH! and JUKE!, each with a countdown and a big GREAT! / OK / BAD.
- [x] **The run:** drives of four downs, areas of four drives (Intro, Challenge, Gimmick, Boss), three areas (the forest three times, stiffer each time), game over on a failed 4th down, a continuous field.
- [x] **TRICK OR TREAT!:** two new players of different kinds after each won drive (sized by zone); the one you take goes straight into its best slot; the roster (field by position, an unlimited bench, newest on top, swap any two).
- [x] **Your team:** humans 50 / 50 / 50; Golem, Werewolf and Ghost as stat trades, each with its model; Golems the only linebacker build; pixel portraits.
- [x] **Rendering:** the third-person follow camera that always fits both sidelines; the pumpkin ball as QB and light, with embers; catch-range and reach rings; the forest scenery.
- [x] **UI:** the retro pixel HUD and controls, the self-hosted Creepster font.
- [x] **Audio:** the synth, the mixer, the sound effects, four song loops on one shared grid (Spooky Surf is in the game).
- [x] **Balance runs:** `npm run balance:arcade` with a practised bot (passing well, BAD in Break it! about one time in ten).

---

## B1. Levels, Defenders and Bosses

**Done when** each drive of an area plays differently, each Boss is an event, and the balance runs hit the targets below.

- [x] **Design pass** (GAMEPLAY.md, *The Run* and *The Defense*): three areas (Forest, Candy Kingdom, Farm), each Boss with one gimmick that attacks one thing you do.
- [~] **Forest:** the **Frog** defender; **Mister Frog** (top hat) and **Frog Rain**: a telegraphed lane before the snap, frogs falling in it with shadows first, flattening whoever is under them. *(2026-10-22: Mister Frog and Frog Rain are built: he plays deep like the Owl on the Boss drive; the lane runs in from one sideline (either, at random) 40% of the way across, never over the pumpkin; a frog every 0.15 s of live play, its shadow showing 0.7 s first; a carrier it lands on is tackled there, anyone else is flattened for a moment; carriers steer clear of the lane. The Frog defender is still to do; its model, `forest/frog`, is the rain's.)*
- [x] **Candy Kingdom:** the Safety becomes a **Witch**; the **Gingerbread Man** (a plain Cover in a new look); sidelines of gingerbread houses, candy canes and a few trees; pink-and-white turf; *(2026-10-22: built as the second area: Gumdrop Lane, Gingerbread Row, Broomstick Alley or Candy Cane Grove, the Queen's Court.)* **the Queen** (a witch twice the size, crowned) and **the Hex** (a short aim stub, no gold lights on receivers). *(Built 2026-10-22.)*
- [ ] **Farm:** the **Crow**; rows of Scarecrows; **the King** (a crowned scarecrow) and the **Two-Part Grab** (two Break it! tests in a row).
- [~] **Models** for the new defenders and the three Bosses, readable from the game camera. *(2026-10-22: the three Bosses are modelled at twice a player's size: `bosses/misterFrog` (a white top hat), `bosses/queen` (a witch with a broom and a crown), `bosses/king` (a scarecrow with a crown). Not yet in the game or checked from the game camera.)*
- [ ] **Boss perks:** beating Mister Frog gives **Hot Arm** (out of TRICK OR TREAT!); the Queen gives **Gift of Foresight** (an orange ring when a throw now would really be caught, looking ahead along the flight; approximate, cheap enough for every frame).
- [ ] **The two cutscenes:** at the start, Jack asks a football team to help him get home; at the end, everyone (your team and every defender you met, Bosses included) dances in the pumpkin patch.
- [ ] **Difficulty targets:** a practised player who never upgrades loses in area II; a decent build reaches the last Boss; a strong one beats it.

## B2. Impact and Feel

**Done when** every play ends with something that *hits*. This is a pillar, not polish.

- [ ] **Hit-pause** on tackles, blocks and catches, and **screen shake** scaled to the hit.
- [ ] **Flying bodies:** pancaked defenders tumble; a tackled carrier bursts into voxel bits that click back together.
- [ ] **The catch moment:** a split second of slow motion.
- [ ] **Squash and stretch,** dust and leaves.
- [ ] **Sound on every contact,** the crowd, and big hits landing on the beat when they can.
- [ ] **Haptics** on the snap, the throw, the catch and hits.
- [ ] **No dead time:** the next down lines up in about a second.
- [x] **The aim line stops at the first catch or block,** judged with everyone where they stand; only the receiver it stops on lights gold. *(2026-10-22. It doesn't look ahead in time, so a crossing receiver can still be gone by the time the ball arrives: Gift of Foresight is the look-ahead.)*

## B3. Monsters and the Build

- [ ] **Check every kind from the game camera** at phone size (Werewolves especially).
- [ ] **Haunted Line** (epic perk): pancaked defenders come back as your ghosts for the down.
- [ ] **More kinds:** the Skeleton, the Mummy, the Pumpkin-head, each a stat trade.

## B4. Content

- [ ] **A second area** (the graveyard), with its own defenders, hazards, palette and song.
- [ ] **New plays** for the random pool as unlocks.

## B5. Ship It

- [ ] **Test on a real iPhone** (Safari, audio unlock, haptics, the safe areas).
- [ ] **Deploy** with GitHub Pages through GitHub Actions (switch Pages to *Source: GitHub Actions*).
- [ ] **Title, settings and pause:** sound, haptics, and how to play in one screen.
- [ ] **Score and meta:** the best run on the title screen, and light unlocks for variety.
- [ ] **An installable PWA** with offline play.
- [ ] **Performance** on a mid-range phone: sixteen bodies, shadows, particles.

---

## Loose Ends

- [ ] **Listen to the three waiting song loops** (Graveyard Shuffle, Midnight Chase, Skeleton Stomp) and decide which to keep.
- [ ] **Push** `main` (the user pushes), and delete the merged branches `design/arcade` and `design/roster-stats`.
- [ ] **The refactors** listed in TECHNICAL.md §22.

---

## Changelog

- **2026-10-22:** **The Candy Kingdom is built** as the second area: its own drives (Gumdrop Lane, Gingerbread Row, Broomstick Alley or Candy Cane Grove, the Queen's Court), Gingerbread Men as Covers and Witches on brooms as Safeties, pink-and-white turf, a berry floor with sprinkles, and gingerbread houses (facing the field), candy canes and a few pines along its stretch of the field. **The Queen** plays deep on her drive, and **her Hex** cuts the aim line to a 3-yard purple stub and lights nobody up. Balance: the Queen's Court is won 100% by the good bot (it simulates its throws) and 68% by the reading bot (the Hex hides what it reads), the hardest drive in the run. The third area is the Forest again until the Farm.
- **2026-10-22:** **The second area is the Candy Kingdom** (instead of the Swamp, too close to the Forest): Witches as Safeties, the new Gingerbread Man, gingerbread houses and candy canes along the sidelines; models made (not in the game yet). **The Witches are visible again:** the Witch on a Broom flies her row with her shadow below (she'd been knocking passes down unseen). **The Forest's sidelines** are toadstools, stumps and trees only (no pumpkins, lanterns or fences; those wait for the Farm).
- **2026-10-22:** **Harder later and in Break it!:** the sweep speeds up 30% per area after the first (was 15%: area III sweeps at 1.6×); the bar's sweet spot is under half its old size (0.09 of the bar at an even match, was 0.2) and its close band a little narrower; MASH! fills less per tap and needs 55% for a drag. JUKE! is unchanged. Bots: the bar's BAD rate went from about 11% to 22%; the good bot wins 11.2 of 12 drives (90% beat the game), the reading bot 5.9 (23%).
- **2026-10-22:** **Mister Frog and his Frog Rain are in the game** on the Forest's Boss drive (Mister Frog's Pond): a lane shown before each snap, frogs falling in it during the down (shadows first), flattening whoever is under them and tackling a carrier. Balance: the area I Boss drive is won 90% (good bot) / 79% (reading bot), the hardest drive of its area. Until the Swamp and Farm exist, every area's Boss is Mister Frog.
- **2026-10-22:** **Two new players, no stat boost, an endless bench.** Every TRICK OR TREAT! is two new players of different kinds (the stat boost was confusing next to the new player). The bench has no limit, newest on top: a full run ends with eleven on it. The new player card no longer says who it replaces.
- **2026-10-22:** **New Player! and More Stats!:** each card is a player card like the roster's (the new player, or the player the boost is for, with the gains on its bars). A new player goes straight into the field slot it improves most (on a tie, its preferred position), and whoever was there sits on the bench; with the bench full, the weakest leaves. **Monster Mash is gone.**
- **2026-10-22:** **TRICK OR TREAT! is exactly two cards, and no Skip:** a new player and a stat boost for one of your players, the boost now half on its main stat and a quarter on each other (40 / 60 / 80 in all by zone: +20 / +10 / +10 in the Forest). The pool perks are gone. Balance (the reading bot, 100 runs): always the boost 6.7 drives won, always the player 6.6.
- **2026-10-22:** **TRICK OR TREAT! is always three kinds of card:** a new player (stats adding to 200 / 250 / 300 by zone, in its kind's shape), a stat boost for one of your field players' main stat (+40 / +60 / +80: tuned so it matches the new player in balance runs), and a pool perk at the zone's rarity (common in the Forest). Hot Arm left the pool for Mister Frog.
- **2026-10-22:** **The aim line stops at the first catch or block** (with everyone frozen where they stand, `sim/ball.ts` `aimContact`), and only the receiver it stops on lights gold. The Queen's Boss perk will be **Gift of Foresight**, the same idea looking ahead in time.
- **2026-10-22:** **The progression is designed:** Forest (Mister Frog, Frog Rain), Swamp (the Queen, the Hex; Witches as Safeties) and the Farm (the King, the Two-Part Grab), ending at the pumpkin patch. The first two Bosses each give a special perk (Mister Frog: Hot Arm, which leaves the TRICK OR TREAT! pool). The story is two tiny cutscenes: Jack asking a team for help, and everyone dancing in the patch at the end. Not built yet.
- **2026-10-22:** **The game is now Get Jack Back.** Jack the pumpkin ball is the hero, trying to get home to his pumpkin patch. The title screen, page titles and package are renamed, and winning says "Jack is home!".
- **2026-10-22:** **Docs rewritten** for the game as it is; the screenshot tool and the model contact sheet follow the arcade camera. A **local cleanup pass** (dead code, comments, shared stat helpers), with the bigger refactors noted in TECHNICAL.md.
- **2026-10-22:** **No more clipping.** After a catch or handoff each helper blocks its own defender instead of all piling onto one; teammates collide and give way to the carrier; bodies lying down get nudged aside; Golems' bodies are as wide as their model. With working blocks, runs got long and swingy, so on a handoff the Catchers now run decoy routes.
- **2026-10-22:** **Runs are the safe call, passes the gamble.** The play fake: for about a second after a handoff the defense keeps playing the pass. Runs average about 4 yards and gain nothing about 5% of the time; a good passer averages about 5½, with a quarter gaining nothing.
- **2026-10-22:** **The balance bot plays like a practised player:** it never hands off while it holds a pass card, judges where a throw will really be caught, and gets BAD in Break it! about one time in ten (a timing-error model instead of coin flips). All human, never upgrading: about 9.5 of 12 drives, beating the game about half the time.
- **2026-10-22:** **A recruit prefers the position its best stat suits.**
- **2026-10-21:** **The roster gets a bench.** Field down the left by position, a bench of three down the right; swap any two. A recruit takes a bench seat (or, with the bench full, replaces whoever you choose). Every player has a photo box with a pixel portrait of its kind; tapping a player stars the position it prefers.
- **2026-10-21:** **Retro pixel UI:** square corners, hard outlines, flat shadows, outlined text, segmented bars, scanlines; Creepster stays and animations stay smooth. A clearer roster screen with stat bars and the gains or losses of placing a recruit.
- **2026-10-21:** **Kinds are stat trades.** Humans 50 / 50 / 50 in every position; Ghost Hands ++ Heft --, Golem Heft ++ Hustle --, Werewolf Hustle ++ Hands --. Only Golems are built like linebackers. The loss prompt says Game Over.
- **2026-10-21:** **Models for the other kinds:** Ghost (a white sheet in the helmet, unlit, hovering), Golem (mossy stones, glowing eyes) and Werewolf (fur, ears through the helmet, snout and fangs). `?monsters=1` starts with a monster team.
- **2026-10-21:** **TRICK OR TREAT! built:** three perks drawn by rarity (common 60%, rare 32%, epic 8%) after each won drive: +10 to a stat for everyone, +20 for one kind, Extra Sweep, Slow-Mo Sweep, Second Wind, Candy Corn Magnet, Hot Arm, and new players. Monster Mash: +10 to every stat for each player whose kind is unique on the team. Receivers' rings show their catch range, and every defender shows its reach.
- **2026-10-20:** **Stats on a 50 scale** (every 10 points is one step), and any player can play any position.
- **2026-10-20:** **The pumpkin throws itself** (no QB model), floating and bobbing, face to the camera, with embers; **it's the field's light**, and the moon is a dim fill.
- **2026-10-20:** **Break it! has three tests** (the bar, MASH!, JUKE!), each with a two-second countdown and a big GREAT! / OK / BAD. The game runs at 0.8× real time.
- **2026-10-20:** **The timing design:** three random play cards with Flip; tap a card to see its routes, then HIKE!; the sweeping aim line and THROW (a bullet; the ball goes past the scrum); the pocket holds for three sweeps; carriers pick their own lanes; handoffs are the Dive and Sweep cards.
- **2026-10-19:** **The arcade game:** a real-time simulation at 60 steps a second with eight a side, physical stats, the forest's defenders scaling by drive and area, a third-person camera following the play on one long field, and headless balance runs. The field is 18 yards wide so the camera fits both sidelines.
