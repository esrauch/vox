# Fourth & Ghoul: Gameplay

**Arcade Halloween Football.** Simple arcade mechanics, a clear monster theme, and a game that lives or dies by its UX and a hundred tiny optimizations.

This doc covers what the player *does*: the pillars, the run, a down, the controls, your team and the defense, and how a run builds up. It builds on [THEME.md](THEME.md). Exact numbers will live in `src/content/tuning.ts`.

Items marked **▲** are recommendations or details still open to change. Every number is a starting value, to tune by playtesting and by the headless balance runs (TECHNICAL.md).

> **Rewritten from first principles on 2026-10-19** (branch `design/arcade`). The code still plays the earlier design: a grid, moves on the beat, play cards and hidden dice checks (see *History*). This doc is the target.

**Words used here:**
- **Area:** a themed place (the Haunted Forest first). Each area is four drives.
- **Drive:** four downs to gain 10 yards. **Down:** one play, a few seconds long.
- **Line of scrimmage:** where the current down starts. **First-down line:** 10 yards past where the drive started.
- **Your team:** **eight on the field**: the QB plus seven players, each a **Blocker**, a **Runner** or a **Catcher**.
- **Carrier:** whoever has the ball after a catch or a handoff. **You steer the carrier.**
- **Heft, Hustle, Hands:** your players' (and defenders') three stats. They're physics, not dice: weight, speed and reach.

---

## The Game in One Breath

Tap PLAY and you're on the field. The ball is snapped the moment you pull back on the screen: the play is picked for you, your Blockers shove the pass rush, your Catchers break for open grass, and you **release to throw**. The moment someone catches it, **you're steering**: the carrier charges upfield, and each swipe nudges it a little left or right through the forest's gnomes and owls. See how far you get before they bury you. Four downs to make 10 yards. Make it and you **pick an upgrade**: a Catcher becomes a Ghost, a Blocker becomes a Golem, someone gets faster. Miss on 4th down and the run is over. You start as a team of plain, weak humans against a sleepy defense; by the third area you're a pack of monsters against the whole forest.

---

## Design Pillars

1. **Playing in five seconds.** From opening the game to the first snap is one tap. No draft, no team setup, no tutorial wall. Everything you need to know, you learn by doing it once.
2. **Arcade, not simulation.** Two verbs: **throw** (or hand off) and **steer**. Everything else (blocking, routes, the defense) happens on its own, at speed.
3. **Impact.** Every play ends in something physical: a crunching tackle, a pancake block, a bounced pass, a carrier dragging a gnome for five yards. If a moment doesn't *hit*, it's not done.
4. **Readable at a glance.** Who's on your team, what role each player has, who's open and who's about to hit you, in under a second, on a phone. The roles are three silhouettes; the stats are things you *see* happen, never numbers you have to read.
5. **Start weak, build up.** Like *Slay the Spire*, *Dungeon Clawler* or *Balatro*: limited resources and very easy opponents at first, then your team grows and the forest fights back harder.
6. **The UX is the game.** Snappy restarts, instant feedback, no dead time between downs, and the tiny details (how the ball leaves the hand, how a tackle lands, how fast the next down lines up) get as much care as the rules.
7. **Every run tells a story.** "My Golem dragged three gnomes into the end zone." Losing is funny, and the next run is one tap away.

The test for any feature: **does it make a run faster, funnier, more readable, or more "one more go"?** If not, cut it.

---

## The Run: Areas of Four Drives

- **A run is a series of themed areas** (the Haunted Forest first). **Each area is four drives**, *Balatro*-style: **Intro**, **Challenge**, **Gimmick** (a twist: Witches overhead, Bats everywhere) and **Boss**.
- **The main game is three areas: 12 drives and three Bosses.** ▲ *Until there are more areas, the forest is played three times, stiffer each time.*
- **The four drives are one continuous march up the field**, with no break between them: the camera glides up to the next defense, you pick an upgrade, and play carries on. The Boss drive goes for the end zone: a **TOUCHDOWN!**
- **There are no lives. Losing a drive is game over.** Four downs, and every one counts.
- **The forest scales up as you do:** the first drive is a handful of sleepy defenders, the area III Boss is the whole forest at full strength (see *The Defense*).

## A Drive: Four Downs to Gain 10 Yards

- **Four downs to get the ball over the first-down line.** Each down starts where the last one ended.
- **How a down ends:**

  | What happens | Result |
  |---|---|
  | **Tackled** | The next down starts where the carrier went down. |
  | **Incomplete or batted down** | The down is used, no gain. |
  | **Sacked** (a rusher reaches the QB holding the ball) | The down is used, and you lose ground. |
  | **Over the line** | The drive is won. |
  | **4th down fails** | Game over. |

- **No interceptions, no fumbles.** A bad pass costs a down, never the run.
- ▲ **A down takes about 4 to 8 seconds**, and the next one lines up in about one: no menus between downs.

---

## A Down

1. **The play is picked for you.** One of **four plays**, at random (and randomly mirrored), lines your team up: where your Catchers will run and who stays home to block. Its name flashes up ("SLANTS!") and the routes show for a moment. You don't pick it: the only choice is pass or run (step 2).

   | Play | What happens |
   |---|---|
   | **Slants** | The outside Catchers cut inside; the slot goes deep; a Runner leaks into the flat. |
   | **Deep Shot** | All three Catchers go long; both Runners stay home to block. |
   | **Curl & Flat** | The Catchers run out and turn back; the Runners swing out to the flats. |
   | **Dive** | Built for a run: a Runner charges straight up the middle behind the Blockers; the Catchers run off, dragging their Covers away. Tap the Runner to give it the ball. |
2. **Pass or run, your call.** **Pull back anywhere** to snap and aim a throw, or **tap a Runner** to snap and hand it the ball. You can also hand off in the first second after the snap, while the QB still has it. Any play can be a run; the Dive is built for one.
3. **The play happens at full speed, on its own.** Blockers lock up with the pass rush and shove; Catchers run their routes; Covers chase them; the Owl hangs deep.
4. **Release to throw.** The ball flies to where you aimed; the arc rises the further you throw, so long passes sail over defenders underneath and short ones are quick but low.
5. **If someone catches it, you're steering.** On a handoff, you're steering the Runner from the moment it has the ball.
6. **The down ends with a tackle, a dead ball, a sack, or the line.**

### The pocket

- **The pocket is real now:** Rhino Beetles rush the QB, and your Blockers physically hold them off. How long you have is **how your Blockers' Heft matches up against the rush**, not a timer: a strong line buys time, a weak one folds.
- **A rusher that gets past reaches the QB: SACKED!** You see it coming: the beetle breaks free and charges.

### Catching

- **A catch is reach.** A pass coming down within a Catcher's reach is caught, and **Hands is reach**: the better the Hands, the further the ball snaps in. Lead your Catcher into open grass.
- **A contested ball is a visible tussle.** If a defender gets a hand to it too, the one with **more Hands** comes away with it. If it's the defender, the ball is batted down (no interceptions). Ties go to you.
- **Low passes can be batted down** by any defender right under them. Long, high passes clear them until they drop.

### After the catch: steering

- **Swipe left or right to steer, a little at a time.** The carrier always charges upfield on its own; each swipe nudges it over a step to that side. You're choosing the lane, not driving.
- **Don't run out of bounds:** a carrier over the sideline is down there.
- **Tackles are collisions.** A defender that hits the carrier brings it down, unless the carrier is **much heavier**: then the defender bounces off and the carrier keeps going (Heft). A faster carrier simply outruns chasers (Hustle).
- **Your Blockers keep blocking** after the catch, shoving defenders out of the carrier's way, so running behind them is the safe lane.

---

## Controls

| When | Gesture | What it does |
|---|---|---|
| **Before the snap** | **Pull back anywhere** | Snap the ball and start aiming. The further you pull, the further the throw. |
| **Before the snap, or just after** | **Tap a Runner** | Hand it the ball (snapping first, if it's before the snap). You're steering it from then on. |
| **Aiming** | **Release** | Throw. Letting go too close to the QB cancels. |
| **Carrying** | **Swipe left or right** | Nudge the carrier a step to that side. |
| **Between drives** | **Tap a card** | Take that upgrade. |

**One thumb, portrait.** Nothing needs two hands, and nothing needs precise timing to a beat.

---

## Your Team

**Eight on the field: the QB plus seven players**, every one on the field every down. Each has one of three roles, and **the role is the silhouette**: you know what a player does by looking at it.

| Role | How many | Looks | Does | Main stat |
|---|---|---|---|---|
| **Blocker** | 2 | Big, wide, low | Holds off the rush, shoves defenders out of the carrier's way | **Heft** |
| **Runner** | 2 | Lean, leaning forward | Takes handoffs, breaks away; on a pass play, one stays home to block | **Hustle** |
| **Catcher** | 3 | Tall, long arms | Gets open, catches | **Hands** |

▲ *Up to eight defenders against them.*

**The camera sits behind and above the QB**, lower than a top-down view: a third-person look down the field, like standing just behind your own line. It follows the play upfield. The three silhouettes have to read from there at phone size.

**The stats are physics, never dice.** Everything that matters, you can see happen:

| Stat | What it is | You see it when… |
|---|---|---|
| **Heft** | **Weight.** In any shove, the heavier one pushes the lighter one back; a big gap sends the light one flying. | A Blocker pancakes a beetle; a Golem carrier shrugs off a gnome. |
| **Hustle** | **Speed.** | A Runner pulls away from the pack; a Catcher gets a step on its Cover. |
| **Hands** | **Reach.** The ball snaps into the hands from further away, and wins a tussle for it. | A Catcher plucks a ball you overthrew. |

- **Everyone starts human and plain.** A fresh team is a bit slow, a bit light, a bit clumsy: good enough for the sleepy first drive, not for the Boss.
- **The numbers live on the roster screen** (between drives), as simple pips. On the field, the stats only show through what happens.

---

## Building Up: Upgrades

**After every won drive, pick one of three upgrades, or skip.** It takes a few seconds and the next drive is already lined up behind it. **There's no draft before the first drive**: you start with what you've got.

**The offers:**
- **Transforms:** a player becomes a monster, for the rest of the run. **Each monster suits a role**, so a transform says which role it lands on:
  - **Golem Clay:** a Blocker becomes a **Golem**. Much heavier: the line holds, and a Golem carrier is almost impossible to bring down.
  - **Werewolf Bite:** a Runner becomes a **Werewolf**. Much faster, and gets faster the longer it runs.
  - **Ghostly Touch:** a Catcher becomes a **Ghost**. Huge reach, and it drifts through Covers (they can't stick to it).
- **Training:** *+1 Heft to your Blockers*, *+1 Hustle to your Runners*, *+1 Hands to your Catchers*. ▲ *Or to one random player, for more swing.*
- ▲ *Later: trick plays (one-use, like a Pumpkin Bomb that clears a patch of defenders), and new plays for the random pool.*

**Only humans can be transformed**, which player is random within the role, and there's no way back.

### Team bonuses

**How your monsters add up matters**, *Balatro*-style: a few bonuses reward building toward something. ▲ *First ideas, to prove out with the balance runs:*

| Bonus | Your team | Effect |
|---|---|---|
| **The Wall** | All three Blockers are Golems | The pocket never collapses |
| **The Pack** | Both Runners are Werewolves | Every carrier gets the Werewolf's speed |
| **The Haunting** | All three Catchers are Ghosts | Every pass is out of the defense's reach until it lands |
| **Monster Mash** | At least one of each monster | Every player gets +1 to every stat |
| **Final Girls** | No monsters at all, and at least two training picks | Every player gets +1 to every stat, and the last tackle on 4th down always misses |

The tension: every pick is either toward a bonus or a sure, small boost now.

---

## The Defense

**The forest's locals, always in candy purple, never in helmets** (THEME.md). Each kind has **one job**, readable from its shape:

| Defender | Creature | Job |
|---|---|---|
| **Rusher** | Rhino Beetle | Charges the QB. Your Blockers have to out-shove it. |
| **Cover** | Garden Gnome | Shadows a Catcher; after the catch, chases the carrier. Small, quick, light: easy to shove, hard to shake. |
| **Zone** | Scarecrow | Planted: swats any low ball that comes near it. Heavy: running into one stops you. |
| **Safety** | Owl | Hangs deep, between the ball and the first-down line, and comes down to meet the carrier. |
| **Bat** | Bat | Patrols a fixed loop and swats passes that fly through it. |

- **Hazards** stay simple patterns, like *Crossy Road*'s cars: the **Witch on a Broom** sweeps across the field and knocks down any pass she meets.
- **Scaling, the lever behind the whole run:** the first drive of area I is **three or four slow defenders**; every drive adds defenders or stats, and later areas bring more rushers and heavier, faster, grabbier versions of everyone. ▲ *Numbers to come from the balance runs: the target is that a team that never upgrades loses in area II, a decent build reaches the last Boss, and a strong one beats it.*
- **The defense always shows its intent:** rushers lean toward the QB, Covers face their Catcher, the Owl tracks the ball.

---

## Impact and Feel

**This is the product, not polish for later.** Every one of these lands in the first playable:

- **Hit-pause** on every tackle, block and catch (a few frames), and **screen shake** scaled to the hit.
- **Things fly.** A pancaked defender tumbles; a tackled carrier bursts into voxel bits that click back together for the next down.
- **The catch moment:** a split second of slow motion as the ball arrives, then full speed.
- **Squash and stretch** on everything; the ball spins; dust and leaves kick up.
- **Sound on every contact:** crunches, squeaks, rattles, howls, and the crowd reacting.
- **Haptics** on the snap, the throw, the catch and every hit.
- **The music is the soundtrack, and juice:** big hits and celebrations land on the beat when they can, the crowd claps along. **There's no rhythm gameplay**: nothing you do has to be on the beat.

## Reading the Field

| What | How it's shown |
|---|---|
| **Your team** | Gold and orange, in helmets. Role by silhouette: big Blockers, lean Runners, tall Catchers. |
| **Who's open** | A soft ring under each Catcher: green when it's clear of defenders, red when one is on it. |
| **Where the ball will land** | While aiming: a reticle and the arc; in flight, a landing ring. |
| **The carrier** | Holds the ball high, with a gold ring underfoot. |
| **What the defense will do** | Their facing and lean: rushers toward the QB, Covers toward their Catcher. |
| **Down and distance** | "3rd & 4" and the gold first-down line. |

**Indicators stay small:** the voxel field and the bodies flying around it are the show.

---

## Score and Meta

- **The score is how far you got**: area, drive, and yards. ▲
- **Light meta progression** for variety, never power: new plays in the random pool, new areas, team looks.
- ▲ *Daily runs with a shared seed.*

---

## Scope: First Playable

The smallest version that proves the fun:
- **One area of four drives**, played three times with the defense scaling up.
- **The QB and seven players** in three roles, all human, with **throw** and **steer**.
- **A real-time play:** blocking as shoving, routes, a real pass rush, catching by reach, tackles as collisions, swipes to steer.
- **A random play each down** from the four.
- **The third-person camera** behind and above the QB, following the play.
- **The defense:** Rushers, Covers, a Safety, Scarecrows and Bats, scaling by drive and area. The Witch.
- **Upgrades** after each won drive: the three transforms and training.
- **Impact:** hit-pause, shake, flying bodies, the catch slow-mo, sound on every contact.

**Then:** team bonuses, trick plays, a real Boss, a second area.

---

## History: Ideas Tried and Set Aside

- **The grid, the beat, play cards and dice checks** *(built 2026-10-17 to 2026-10-19, replaced 2026-10-19):* everyone hopped one half-yard tile per beat of the music; each down you drew three play cards and called one; your four players' Hustle, Hands and Heft were rolled as hidden checks against the defenders' on a friendly curve, and a roster of four was transformed into monsters with poker-style team hands. **Why it was replaced:** it lacked impact. A balance bot that picked a random play, waited, threw at the first green ring and took random upgrades did about as well as playing it: the decisions didn't matter, the dice hid why things happened, and nothing on the grid ever collided. Kept from it: drives, downs and areas, the continuous march between drives, the defenders and the Witch, the throw arc, the transforms, and the headless balance runs.
- **Screens to the end zone, balls as lives** *(until 2026-10-18):* you placed your squad, threw once and ran to the top of the screen; balls were lives. Replaced because placement barely mattered and waiting was free.
- **Steering the carrier on the grid** *(tried 2026-10-17):* swipe to sidestep or wait after the catch. It didn't work on a hopping grid with no pressure, where waiting was free. **It's back in real time**, where defenders close from every side and the lane you pick is the whole skill.
- **The Giant Quarterback** *(the original premise):* you were a hulking monster QB with a team of tiny creatures. The comedy of scale might return as a Boss.

---

## Open Questions

- **Who the upgrades land on:** a random player in the role, or you choose?
- **Field width** and how far the camera sees ahead (to tune in the first playable).
- **The forest's Boss:** the Treant is still to design.
- **Sound off:** with no rhythm gameplay, it should play fine muted. Check it.
