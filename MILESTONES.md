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
- [~] **Forest:** the **Frog** defender; **Mister Frog** (top hat) and **Frog Rain**: a telegraphed lane before the snap, frogs falling in it with shadows first, flattening whoever is under them. *(Built: Mister Frog stands in his end zone as a prop; the lane runs in from one sideline 40% of the way across, never over the pumpkin; 1.2 s into the down the frogs all come down at once, FROGGED! for a carrier in the lane; carriers steer clear of the lane. The Frog defender is still to do; its model, `forest/frog`, is the rain's.)*
- [x] **Candy Kingdom:** the Safety becomes a **Witch**; the **Gingerbread Man** (a plain Cover in a new look); sidelines of gingerbread houses, candy canes and a few trees; pink-and-white turf; *(2026-10-22: built as the second area: Gumdrop Lane, Gingerbread Row, Broomstick Alley, the Queen's Court.)* **the Queen** (a witch twice the size, crowned) and **the Hex** (a short aim stub, no gold lights on receivers). *(Built 2026-10-22.)*
- [~] **Farm:** the **Crow**; rows of Scarecrows; **the King** (a crowned scarecrow, a prop in play) and **SHOO!** (his two crows swoop at the ball every play). *(2026-10-24: all built.)*
- [~] **Models** for the new defenders and the three Bosses, readable from the game camera. *(2026-10-22: the three Bosses are modelled at twice a player's size: `bosses/misterFrog` (a white top hat), `bosses/queen` (a witch with a broom and a crown), `bosses/king` (a scarecrow with a crown). Not yet in the game or checked from the game camera.)*
- [x] **The two cutscenes:** at the start, Jack asks a football team to help him get home (GET JACK BACK); at the end, the whole roster dances around Jack in front of the King (GOT JACK BACK). *(2026-10-24.)*
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
- [x] **The aim line stops at the first catch or block,** judged with everyone where they stand; only the receiver it stops on lights gold. *(2026-10-22. It doesn't look ahead in time, so a crossing receiver can still be gone by the time the ball arrives.)*

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

- **2026-10-24:** **Flip keeps the roster left to right:** mirror partners (the Blockers, the Runners, the outside Catchers) swap assignments, so a flipped handoff goes to the other Runner (before, the first Runner always got it).
- **2026-10-24:** **Handoffs run their play:** before the snap the Runner who'll take the ball has its route drawn bigger in pumpkin orange, with a ring at its feet; after the handoff the carrier leans toward that route when it picks its lane (it still dodges defenders and props). Running bot with new players: 5.8 yards a run (5.4 without the lean).
- **2026-10-24:** **The win cutscene:** after the last touchdown, the camera settles on the King with the pumpkin patch behind him; the whole roster, field and bench, dances in staggered rows around Jack (bounces, shuffles and spins), GOT / JACK / BACK slams in, then AGAIN. The intro's title loses its periods (GET JACK BACK). Winning the last drive no longer slides the field origin on (the King and the patch stay put).
- **2026-10-24:** **The first screen is just PLAY** on the purple backdrop (no title, no field behind it); it goes straight into the intro, now framed twice as far out.
- **2026-10-24:** **The opening cutscene:** after the first PLAY (the music already going), Jack floats on the turf, three football players bounce-walk on, Jack asks "Can you help me get back to my patch?", one answers "Ok", they lift him onto a head and carry him off, and GET. / JACK. / BACK. slams in a word at a time; then the last frame crossfades into the first drive. A tap (or Space) skips it; AGAIN goes straight to the field.
- **2026-10-24:** **The Farm's turf is a tilled field:** warm brown soil, a furrow up the field every yard, green sprouts on the ridges (the five-yard bands stay).
- **2026-10-24:** **Boss perks cancelled:** beating a Boss gives nothing extra (Hot Arm and Gift of Foresight are dropped).
- **2026-10-24:** **The Queen's Hex pulses:** clear for 1 s from the snap, then on for 1.5 s, over and over; her crown glows purple (and lights the field) while it's on. While on: the stub and no lights; clear: everything shows. Bots: her drive won 96% (good) / 82% (reading).
- **2026-10-24:** **All three Bosses are end-zone props:** Mister Frog and the Queen no longer play deep (the Owl or the Witch is back), they stand guard like the King and only have their ability. **Frog Rain is one big dump:** 1.2 s into the down, the frogs all come down at once over the lane; a carrier in it is FROGGED! (tackled), anyone else flattened. Bots: the Boss drives got easier with no Boss defender (good bot about 96%, reading 79-88%); the Queen's Hex is still always on until its new design.
- **2026-10-24:** **The same twelve drives every run:** one Gimmick per area (Bat Cave, Broomstick Alley, A Murder of Crows; Witching Hour, Scarecrow Field, Candy Cane Grove and Scarecrow Rows are gone). **Bats are zone defenders:** they loop their square but dive at a carrier that comes within 3 yards, and go back to the loop if it gets away. Bots: about the same overall (good 10.3 of 12, reading 5.3).
- **2026-10-24:** **The King's SHOO!** Two crows sit on his arms; half a second after the snap they swoop at the ball at 12 yards a second (half a bullet's speed), and when they land on its holder a SHOO! button pops up (no freeze, 0.6 s, or the S key). Too late: a sack or a tackle. A throw before they land makes them miss, so a quick deep pass beats them. Bots (who always shoo in time): the King's drive won about 83%, from 92%.
- **2026-10-24:** **The Farm is built** as the third area: the Back Forty, the Cornrows, Scarecrow Rows or A Murder of Crows, and the King's Patch. New: the **Crow** (a Bat that flies a lane up and down the field; a black crow model), **hay bales**; meadow-green turf with straw flecks, dark soil, fences with jack-o'-lanterns, pumpkin patches and hay bales along the sidelines, pumpkins and hay bales on the field. On the last drive **the King**, drawn twice his size, stands guard just past the first-down line as a prop (he never tackles or defends) in front of **Jack's pumpkin patch**, which fills the field behind him. His QTE on every play is still to design (the Two-Part Grab is dropped).
- **2026-10-24:** **No more frozen pile-ups after a GREAT.** Over half of GREATs were followed within a second by a new grab from the pile, each opening a fresh two-second countdown with everyone frozen in one spot. Now a GREAT also knocks back the defenders right beside the carrier and gives it 0.6 s in which nobody can grab it (none are re-grabbed within half a second, down from 30%), and a Break it! that starts within 2 s of the last one has a half-second countdown.
- **2026-10-22:** **Props on the field:** two or three per 10 yards from the area's set (the Forest's trees, stumps and toadstools; the Candy Kingdom's gumdrops, lollipops and candy canes, two new models). Solid: everyone steers round them, a target inside one moves to its edge, anyone shoved in is pushed out, and carriers choose lanes clear of them; the ball flies over. Kept out of the middle lane and off the sidelines, with room between. A probe of 818 seeded downs found nobody stuck on one. Balance about the same.
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
