# Fourth & Ghoul: Gameplay

This doc covers what the player *does*: the design pillars, the controls, the run structure, and how a single screen plays out. It builds on [THEME.md](THEME.md). Exact numbers and tuning belong in a later systems doc.

**The north star: snappy, fast, silly, fun.** It's a **portrait, one-thumb phone game** with **voxel** graphics, and **everything moves to the beat**. It looks like *Crossy Road*, plays to the rhythm of *Crypt of the NecroDancer*, and has a roguelite's "one more run."

Items marked **▲ Decision** are recommendations that are still open to change.

---

## The Game in One Breath

You're the Big, planted at the bottom of the screen with the ball. First you **place your Smalls** in the bottom grid. Then the play starts, and you have two kinds of tap: **tap the field to place the target**, and **tap a button to act**: the pulsing ball to throw, and Hijinks after the throw. **Get the ball to the top of the screen** and it's a touchdown. Then the camera scrolls up, there's a new screen and harder defenders, and you **pick a reward**. You pick your **Big** at the start, and it themes everything. Your plain **Walk-ons** always come back, but the special **recruits** you draft stay dead if they die. The Big starts the run with a pile of **balls**, and those are your lives. Every fumble costs one for good. When the last ball is gone, the run is over. **Go as far as you can.**

---

## Design Pillars

Every feature gets checked against these six.

1. **One thumb, portrait, playing within five seconds.** No tutorial wall. If something needs explaining, cut it or make it obvious.
2. **You are the quarterback.** Everything runs through the Big's throw. If the Smalls could win without you, something is wrong.
3. **Something funny every few seconds.** Smalls flying, Bigs fumbling, piles collapsing.
4. **Readable at a glance on a small screen.** You can see who has the ball, where your team is, and what's about to hit you in under a second.
5. **Everything moves to the beat.** The music is the game's clock. If you can hear it, you can play it.
6. **Every run tells a story.** "I got to screen 23 with just one rat and an angry pebble." Losing is funny, and the next run is one tap away.

The test for any feature: **does it make a run faster, funnier, more readable, or more "one more go"?** If not, cut it.

---

## The Core Rule: Bigs Throw, Smalls Score

**A Big can never score.** The ball has to cross the top of the screen in the hands (or mouth, or jaws) of a Small. The Big's job is to **get it to a Small who can get it there**.

That's what makes the Smalls matter. Your **Walk-ons** always return for the next screen, so you never run out for good. But if everyone on the field dies mid-screen, it costs you a ball (see *Wipeout*).

---

## The Big Never Moves

Bigs can't score, so the Big doesn't need to move. **It stands rooted at the bottom of the screen**, like a quarterback in the pocket or a tower in a tower-defense game. All of its power goes into the arm.

This gives the game one thing to master: **where and when you throw**.

---

## Controls: Aim, Then Act

**Aiming is the skill.** The beat is the shared clock for the whole screen, but there is no separate "perfect timing" rhythm challenge or judgment UI.

| Phase | Input | What it does |
|---|---|---|
| **Setup** | **Drag a Small** into a tile of the setup zone | Set your formation. |
| **Setup** | **Tap HIKE!** | Start the play. |
| **Play** | **Tap the field** | **Place the target reticle** on that tile. Tap again to move it, as often as you like. |
| **Play** | **Tap the ball button** | **Throw** to the reticle. The button sits at the bottom center and pulses with the beat so you can read the rhythm, not chase a perfect timing window. |
| **After the throw** | **Tap a Hijink icon** | Fire it, either at the reticle or across the whole field (see *Hype and Hijinks*). |

**That's it.** There's nothing to move or steer.

- **The reticle is the single target for everything.** It marks where your next throw will go, and where your Hijinks will hit.
- **The ball button is your Big's ball:** a pumpkin, a skull, an ember. It bounces with the beat so the game feels locked to the music without asking for a perfect tap window.
- **A throw goes to a tile, not a player.** The ball arcs through the air and lands exactly on the reticle's tile. **Leading your receiver** is the skill.
- **There is no perfect-timing throw bonus.** A throw resolves on the beat, but the rhythm is a shared timing layer, not a separate score mechanic.
- **Only the Big throws. There are no laterals.** Once a Small catches the ball, it's on its own and has to run it home. The ball button goes dark until the Big has a ball again, either after a touchdown or a fumble.
- **The flight time is the drama.** While the ball is in the air, everyone hops for the landing tile, and you hold your breath.
- **Thumb layout:** the ball button is at the bottom center with the Hijink icons beside it, and the whole field above is for aiming.

---

## A Screen

Each screen is one field-length climb, in two phases.

### The Grid

**A screen is a tile grid about the size of one *Crossy Road* screen:** roughly **9 columns wide and 15–16 rows tall** in portrait. Everything lives on it: the Smalls, defenders, hazard lanes and the Big.
- **The bottom few rows are your setup zone.** That's roughly 9 × 3, so a few dozen cells to place Smalls in, with the Big rooted in the middle of the bottom row.
- **The top row is the end zone.**
- **Every row in between is a strip:** open turf, a defender zone or a hazard lane.
- **Smalls and defenders hop tile to tile**, the way the chicken does in *Crossy Road*, and they **hop on the beat** (see *The Beat*).

### The Beat

**The whole game runs on the music**, like *Crypt of the NecroDancer*. Every hop, every hazard, every swing of the scythe lands on a beat.

- **Everything hops on the beat.** Smalls, defenders, coffins and boars all move one step per beat (or per two beats, for the slow ones). The screen bounces in time: tombstones bob, the crowd claps, and the jack-o'-lanterns pulse.
- **Hazards are beat patterns.** For example, a lane of coffins slides every beat, a grave snaps shut every fourth beat, and a geyser blows on the "and" of three. You learn a lane the way you learn a riff.
- **Every throw takes exactly 2 beats.** You can tap the ball button any time. The ball leaves on the **next beat** and lands **2 beats later**, however far it goes. One fixed rhythm makes every throw predictable, so **leading your receiver is counting**: "two hops from now, Pip will be *there*." The **Fast Throw** perk cuts this to **1 beat**, which leaves defenders almost no time to react.
- **Somebody has to catch it.** When the ball lands:
  - **Your Small is on the tile:** it's a **Clean Catch**. The receiver gets a boost: it **fends off 1 defender** while it carries the ball (shown by a glowing outline).
  - **Otherwise, a defender is on the tile:** it's intercepted, and that's a **fumble**.
  - **Otherwise, your Small is one tile short, facing the landing tile:** it lunges forward and catches it. It's a normal catch, with no boost.
  - **Otherwise:** it's a miss, and that's also a **fumble**. There are no loose balls and no scrambles. A throw either connects or it costs you a ball.
  - Defenders only intercept on the exact tile. Only your Smalls get the one-tile lunge.
- **The direct-on-square catch is still a real mechanic.** A receiver who is already on the landing square gets the strongest outcome, while the one-square lead can still matter for timing and lane control. The game remains readable without adding a separate "perfect timing" reward.
- **Throws and Hijinks always happen on a beat.** Tap whenever you like, and the action fires on the **next beat**. Nothing ever happens off the beat.
- **There is no perfect-timing bonus.** The music and the field share the same beat, and you're reading that rhythm, not trying to hit a tiny perfect window. A twitchy timing meter is intentionally not part of the design.
- **Setup is the break.** During the huddle the music drops to a quiet loop. **HIKE!** brings the beat crashing back in.
- **The tempo is the difficulty dial.** Each biome has its own track and tempo, and the beat picks up as you climb. Boss screens get their own song.

**The soundtrack:** cheerful Halloween music with a strong, clear pulse. Spooky surf rock, a swinging organ, monster-mash bop and thumping bonfire drums.

### Reading the Beat: Visual Indicators

**Clarity comes first.** At any moment, a glance should tell you *when* the next beat is, *where* everything is about to go, and *where your ball will land*.

| What | How it's shown |
|---|---|
| **The beat itself** | A simple beat pulse and field bounce, enough to read the music without a timing-meter overlay. |
| **The grid** | A soft checkerboard on the turf, so every tile is obvious. |
| **Where a unit will hop next** | Every Small and defender **faces the direction it's about to hop**, as in *Crossy Road*. Fast units show a double-hop arrow. |
| **Throw range** | A ring around the Big. It covers most of the screen but **never reaches the top rows**, so the last stretch always has to be run. The reticle can't be placed outside it. |
| **The ball button** | Your Big's ball at the bottom center, bouncing and glowing in time with the music. It reads the rhythm without creating a timing-score layer. |
| **The reticle** | A bold target on a tile, in your team's color. Before a throw it shows where the ball will go. After a throw, it marks where Hijinks will land. |
| **Where the ball will land** | The reticle locks in, with **2 countdown pips** (one per beat), plus the ball's shadow growing as it falls. |
| **Is someone going to be there?** | **Always on.** The target ring lights up in your team's color if one of your Smalls will be able to catch it (on the tile, or one tile short and facing it), brighter for a Clean Catch, and red if a defender will intercept. |
| **Hazards** | Every hazard warns **one beat ahead**: a lane flashes before something enters it, and a trap shows countdown pips before it snaps. |
| **The Big's counter** | **It appears over the Big only once a Blitzer arrives**, pulsing red and ticking down with a crunch on each attack. Attacking Blitzers flash on the beat they strike. When it hits 0, you've been sacked. |

**Readability rules:**
- **Teams are told apart by shape *and* color,** never by color alone.
- **One beat of warning for everything.** Nothing on the field moves without telegraphing it first.
- **Indicators stay small.** They sit on the tiles, not over them. The voxel field stays the star.

### 1. Setup (the huddle)

- The new screen is revealed, and **you can see everything** before you commit: every defender in its starting tile and every hazard lane.
- **Setup is a little puzzle.** You read the board and place Smalls to beat it. A defender's *kind* tells you what it'll do: a Chaser will come at your carrier, a Wall-er holds its row, a Picker guards a passing lane. **Hazards keep cycling during setup**, so you can see the rhythm of a lane before you send someone into it.
- **Drag your surviving Smalls into tiles of the setup zone.**
- **Where a Small starts decides what it does.** Each Small runs up its own **column**, doing the job its kind does. Walk-ons all run. Placement is how you aim them: at open lanes, or straight at a defender you want taken out.
- So the central trade-off is: **send more Smalls up the field, or keep more back to protect the Big?**
- **Snappy defaults:** last screen's formation is pre-filled, so a quick look and a tap on **HIKE!** is enough.

### 2. Play

- Your Smalls charge upfield. Defenders react, hazards cycle, and Blitzers go for the Big.
- You **place the reticle**, **tap the pulsing ball** on the beat to throw, and then use **Hijinks** while the ball is in flight or being carried.
- **Touchdown:** a Small carries the ball across the top edge. You get a short celebration (it can be skipped by tapping), the camera scrolls up, and it's time to **draft**.

A screen should take **roughly 15–40 seconds** of play, plus a few seconds of setup.

### What's in the Way

Two kinds of trouble fill each screen. **Neither of them ever has the ball.** All they want is to stop you.

**Defenders** react to you. They're the AI opposition. Each kind follows one simple rule, decided once per beat, and always faces the tile it's about to hop to. *(▲ Draft spec, to confirm in play.)*

**Defenders are the biome's locals**, and they **always wear candy purple**, so the opposition never gets confused with your gold squad. Each biome has its own creature for each kind (see THEME.md, *The Defenders*).

| Kind | Each beat, it… | Threat |
|---|---|---|
| **Chaser** | Hops one tile toward your carrier. With no carrier, it hops toward the ball's landing tile while the ball is in flight, and otherwise toward the nearest Small. | Tackling your carrier is a fumble. |
| **Blitzer** | Hops toward the Big. Once it's next to the Big, it stays and **attacks on a rhythm**. | Each attack ticks down the Big's counter. At 0, while the Big still holds the ball, it's a **sack**, which is a fumble. |
| **Wall-er** | Stays in its row and slides one tile sideways to stay in the column of the nearest Small heading its way. | It blocks runners, and acts as a moving wall. |
| **Picker** | Stays near its home tile. Once a ball is thrown, it hops toward the landing tile, as fast as its Hustle allows. | It intercepts. |

Defenders avoid telegraphed hazards, but not perfectly, and **hazards hit them too**, so you can bait a Chaser into a coffin lane.

**Hazards** don't react to you. They're traps and patterns, like the cars in *Crossy Road*. You learn their rhythm and time your throws and runs around them:
- **Lanes** of things crossing the screen at a steady pace.
- **Timed traps** that open and shut, rise and fall.
- **Terrain** that slows, trips or sinks you.

Hazards are themed by biome:

| Biome | Lanes | Timed traps | Terrain |
|---|---|---|---|
| **Graveyard** | Runaway coffins, a hearse, a parade of ghosts | Graves that open and snap shut, a swinging scythe | Mud, fog |
| **Forest** | Rolling pumpkins, stampeding boars, a river of logs to hop | Snapping flytraps, falling acorns, popping scarecrows | Leaf piles, brambles, roots |
| **Mountain** | Lava flows, mine carts, tumbling boulders | Geysers, falling rocks | Cracked ground, ice |

**Hazards and the rules:**
- **They kill Smalls, and defenders too.** Hazards are the most common cause of death, so a well-timed run gets *through* a lane and a bad one gets flattened. A defender wandering into a lane gets flattened just the same.
- **If a hazard hits your carrier, it drops the ball.** That's a fumble, and you lose that ball.
- **Hazards never reach the Big.** The bottom grid is always safe ground. Hazards live up the field.
- **Throws can be blocked.** A ball in the air can hit something tall passing through a lane (a hearse, a boulder) and drop.
- **Telegraph everything.** Every hazard shows a warning before it moves (a rumble, a shadow, a glow) so that deaths feel fair and funny, not cheap.

**Screens are built from horizontal strips**, much as *Crossy Road* builds its road: open turf, defender zones and hazard lanes stacked on top of each other. Mixing up those strips is how screens get both variety and difficulty.

### Balls Are Lives

**The Big starts the run with a pile of N balls** (skulls, jack-o'-lanterns, embers, depending on the team), stacked right beside it at the bottom of the screen. **The pile is your life counter.** There's no separate interface for it; you can just *see* how many you have left.

- **The count carries over for the whole run.** It never resets between screens.
- **A fumble loses the ball in play for good.** The defense runs off with it, or it gets smashed. Fumbles happen when a Blitzer sacks the Big, a throw lands on an empty tile, a defender catches a throw, or a carrier gets tackled or flattened by a hazard.
- **Then the whole screen resets.** It's back to setup with the next ball: every Walk-on returns to its place, the defenders go back to their starting tiles, and you get to re-plan. Recruits who died stay dead. *(Continuing mid-screen left Walk-ons too far upfield to throw to, and the run just drained away.)*
- Each fumble comes with a slow-motion beat, *"FEE! FI! FO! FUMBLE!"*, and a gasp from the crowd as the pile shrinks.
- **When the last ball is gone, the run is over.**
- **More balls are a draft reward**, and a rare, valuable one. Because lives carry over, every extra ball is a real lifeline.

### Blitzers and the Big's Counter

Blitzers rush the Big, and the Big holds them off with a **counter**.

- **Blitzers head straight for the Big.** Once one reaches a tile next to it, it stays there and **attacks on a fixed rhythm** (for example, **every 2 beats**).
- **The Big's counter** is hidden until a Blitzer arrives. Then it appears over the Big, starting at **3**, and **each attack ticks it down by 1**. **If the Big still has the ball when it hits 0, that's a sack, which is a fumble.** For example, one Blitzer attacking every 2 beats gives you **6 beats** to throw.
- **Ganging up speeds it up.** Every Blitzer next to the Big attacks it, so two Blitzers drain the counter twice as fast.
- **Once the ball is thrown, Blitzers are irrelevant.** They only threaten a Big that's still holding the ball, and the counter resets for the next ball.
- **Nothing stands between the Big and a Blitzer except Smalls in its path.** A Walk-on that runs into a Blitzer trades itself for it (see *Collisions*), so a Walk-on in the right column can take one out before it arrives.
- **Tuning values:** each Blitzer's attack rhythm (▲ *perhaps its Hustle: Hustle 0 attacks every 2 beats, like it hops*), and the Big's starting counter (3, and a perk could raise it).

So every possession is a few seconds of "throw it, THROW IT," against a receiver who isn't quite open yet.

---

## The Squad: Walk-ons and Recruits

### Pick a Big, get a theme

**At the start of a run you choose only your Big.** That one choice themes the whole run: the **ball** (the Groundskeeper throws the Skull, the Elder Bough the Jack-o'-Lantern, the Slagfather the Ember), how your Walk-ons look, and **which recruits and perks show up in the draft**.

### Walk-ons

- **Every run starts with the same squad of Walk-ons.** They're vanilla, identical Smalls with **Hustle 0, Hands 0, Heft 0**, and one simple job: run up their column.
- **They're dressed in your Big's theme** (see THEME.md), but that's cosmetic. A Walk-on is a Walk-on.
- **Walk-ons always come back.** A Walk-on that dies is out for the rest of that screen, but it's back for the next one. **You never drop to zero.**
- **Walk-on upgrades** are draft cards that improve **every** Walk-on for the rest of the run: +Hustle, +Hands, +Heft, or a new trick for all of them.

### Recruits

- **A recruit replaces one of your Walk-ons.** Recruits are your Big's special Smalls: Rattlebones and Grave Rats for the Groundskeeper, Pixies and Squirrel Riders for the Elder Bough, Cinder Imps and Rocklings for the Slagfather. Each one has a sharper job and better stats.
- **Recruits don't come back.** If a recruit dies, it's gone for good, and **its slot goes back to a Walk-on** at the next screen. It's tiny tombstone, a ghost that waves, and the crowd goes "awww."
- That's the risk and reward of the squad: **recruits are what make a run strong, and losing them is what makes a run fall apart**, while the Walk-ons are a safety net that never runs out.

### On the field

- **Smalls run themselves**, starting from the tile you put them in. Each kind has a single, obvious job you can read from its silhouette.
- **Smalls never block each other.** They can share a tile and hop past one another, so a carrier is never stuck behind a teammate.
- **Walk-ons are dumb.** A Walk-on runner hops straight up its column on every beat, **even into a defender or a hazard**. Keeping it alive is *your* job: place it in a clear column, or throw it the ball before it gets there. Smarter footwork (sidestepping, waiting) is something recruits and Walk-on upgrades can add.
- **Collisions:** when a Small and a defender run into each other, **the defender wins**. A tackled carrier drops the ball, which is a fumble.
  - **Walk-ons trade.** A Walk-on **without the ball** that runs into a defender dies, but **takes the defender down with it**. That opens up a strategy: **stack Walk-ons in a column**, so the first clears the way for the ones behind. A Walk-on carrying the ball doesn't trade: it's simply tackled.
  - **The exception is "fends off".** Some Smalls (recruits, upgraded Walk-ons, or any receiver after a Clean Catch) can **fend off N defenders**. Each fend-off knocks the defender down instead and uses up one charge. It's the main property that makes recruits and upgrades feel strong.
- **Getting hit:** a hit is losing a collision, or being struck by a hazard or an enemy Big. **Heft decides what a hit does.** At Heft 0 (every Walk-on), the first hit kills. What higher Heft buys (knockdowns instead of death, absorbing hits) is still *TBD*.
- **Knocked down** (for Smalls with enough Heft): the Small bursts into voxel bits, pops back together after a beat or two, and keeps going.
- **Wipeout:** if every Small on the field is dead, you **lose a ball**, and the screen restarts from setup with the Walk-ons back. Recruits who died stay dead.

The squad has **5 slots** to start with, with "+1 slot" as a rare draft card. Every run starts with **3 balls** on the pile.

**All Bigs are built the same.** They have the same slot count and the same base rules, and differ only in theme and pool. **Later, Bigs can come as variants that share a homeland:** a Ghost, a Skeleton and a Vampire might all use the Graveyard pool, each with its own twist.

---

## The Draft: Trick or Treat

After every touchdown, you go trick-or-treating: choose **one of three cards**. It's one tap and then straight into the next screen.

**The cards come from your Big's pool.** Every Big has its own recruits, Walk-on upgrades, perks and Hijinks, so a Groundskeeper run and an Elder Bough run grow into very different squads.

▲ *Decision:* most cards are **Treats** (pure upgrades). Occasionally a **Trick** shows up instead: a strong card with a funny downside, e.g. "+2 Hustle for every Small, but the ball is on fire."

The three cards are always **one recruit, one Walk-on upgrade and one other card**, so every draft offers a clear choice: a new star, a stronger base squad, or something else.

Card types:

| Card type | Examples |
|---|---|
| **Recruits** | A special Small from your Big's pool. It replaces a Walk-on, and if it dies it's gone. |
| **Walk-on upgrades** | +Hustle, +Hands or +Heft for *every* Walk-on, or a new trick for all of them. |
| **Recruit upgrades** | Promote one recruit to a veteran version. |
| **Arm perks** | Bigs have no stats, so the Big gets stronger through perks, e.g. **Long Arm** (bigger throwing range). |
| **+1 slot** | One more Walk-on in the squad. It's rare. |
| **Hijinks** | Unlock a new Hijink, or power up one you already have. |
| **Fast Throw** | Throws land in 1 beat instead of 2. |
| **Extra balls** | +1 ball on the pile. It's rare and precious. |
| **Perks** | Passive quirks with punny names, e.g. **Butterfingers Insurance** (the first fumble of each screen is free) or **Second String** (a dead recruit sometimes comes back). |

Card names and art should be jokes. The draft is part of the comedy, not a spreadsheet.

---

## Hype and Hijinks

- **You start a run with no Hijinks** and unlock them through the draft.
- **Hijinks only work after the throw.** While the Big holds the ball, its hands are full. Once the ball is in the air (or in a carrier's hands), the Hijink icons wake up. This keeps the flow clear: **aim, throw, then wreak havoc**.
- **Hijinks use the same reticle.** After the throw, **the reticle stays on the landing tile by default**, which is where the action usually is. Tap the field to move it somewhere else, then tap a Hijink icon.
- **There are two kinds of Hijink:**
  - **Targeted** ones hit at the reticle, e.g. *Root Awakening* snares a patch around it, and *Eruption* blasts it.
  - **Global** ones affect the whole field, e.g. *Fog of War*, or *Night of the Living Dead*. The reticle doesn't matter for these.
  - Each icon shows which kind it is: targeted icons have a little crosshair.
- **Hype** is a crowd meter that fills when exciting things happen: long throws, diving catches, clean catches and touchdowns. A fumble *drains* it. Each Hijink costs Hype, so a full meter means you can afford something.
- **▲ Decision:** Recommendation: **at most three Hijink slots**, beside the ball button. When you draft a fourth, it replaces one you already have.
- **Hijinks fire on the next beat, like throws.** The flow stays rhythmic without adding a separate perfect-timing reward.

---

## Difficulty and Pacing

- **Defenders get tougher as you climb:** more of them, smarter, faster and heavier.
- **Hazards get busier:** more lanes, faster patterns, and traps combined with lanes.
- **Biomes change every few screens:** graveyard, forest, mountain, and more later. Each brings its own defenders and hazard set.
- **▲ Boss screens:** every so often, an **enemy Big** stands rooted somewhere up the field. It's a giant obstacle that swats Smalls and plucks passes out of the air. You have to get around it, or Hijink it.
- **Target run length:** an early wipe-out in about 2 minutes, a good run in about 10, and a legendary run in 20 or more.

---

## Score and Meta

- **Score = distance.** Each screen is worth **10 yards**. "Best: 340 yards" shows on the main screen, as in *Crossy Road*.
- **Light meta progression**, collected rather than grinded:
  - New **Bigs** to unlock. Each one is a whole new theme: a ball, a Walk-on look, and its own pool of recruits, perks and Hijinks. Examples: the Halflings' hired ogre, a vampire, a cactus treant, a pebble who insists it counts as a Big.
  - New cards joining each Big's pool.
- Nothing pay-to-win. Meta unlocks give you **variety, not power**.

---

## How the Attributes Show Up

**Every Small and every defender has Hustle, Hands and Heft.** They're **whole numbers starting at 0**. What a stat *means* can depend on the kind of unit, but **0 is always the plain baseline**, and every point above it is an upgrade.

**Bigs have no stats.** Every Big is mechanically identical: the same throwing range, and the same 2-beat throw. **Choosing a Big only decides what happens later:** the theme, and the pool of recruits, perks and Hijinks the draft offers. The Big itself gets stronger only through perks (Long Arm, Fast Throw…).

Players see the stats as **pips on cards and on the setup screen**. Everything else they learn by feel.

**Walk-ons are 0 / 0 / 0.**

| Attribute | For Smalls, at **0** | For Smalls, at 1+ | For other units |
|---|---|---|---|
| **Hustle** | Hops **every 2 beats**. | *TBD.* Faster hopping, up to the fastest recruits covering two tiles per beat. | Defenders hop the same way. |
| **Hands** | Catches on **its own tile, or 1 tile ahead**. | *TBD.* More catch reach, e.g. diagonal lunges. | For defenders: *TBD* (perhaps interception reach). |
| **Heft** | **Dies on the first hit.** | *TBD.* Surviving hits, e.g. a knockdown instead of death. | For defenders: *TBD*. |

**Fends off** is separate from all three: it's a property that lets a unit beat N defenders in collisions. Heft is about *surviving* a hit, and fends off is about *winning* one.

▲ *The meaning of 1+ for each stat, and the defenders' values, get decided during M1.2 and M2 tuning.*

---

## Feel and Juice

This is a pillar-level priority, not polish to add at the end.

- **Voxel destruction:** Smalls burst into chunky cubes and click back together.
- **Hit-pause** on big impacts, and **screen shake** on fumbles and Hijinks.
- **Squash and stretch** on everything.
- **Every Small makes a noise:** squeaks, rattles, little roars.
- **Haptics** on throws, catches, impacts and fumbles, plus a light tick **on the beat**, so you can feel the rhythm with the sound off.
- **Everything bounces in time:** the field, the crowd, the Smalls waiting in the setup zone, the Big's foot tapping.
- **The chant** on every fumble. **The tombstone** for every death.

---

## Scope: "Small" Game

**First playable** (the smallest version that proves the fun):
- One Big (**the Elder Bough**: the clearest passing game), with Walk-ons and two kinds of recruit.
- One biome, with generic defenders and two hazard types (one lane, one timed trap).
- The setup grid, one looping track with everything on the beat, the reticle and the pulsing ball button (throws quantized to the beat), Blitzers and the Big's counter, Walk-on trades, a pile of balls as lives, permadeath.
- A draft with **recruit** and **Walk-on upgrade** cards only.
- Endless screens with a simple difficulty ramp, and a score.

**Then:** Hijinks and Hype, perks, a second and third Big, biomes, boss screens.

**Later:** more unlockable Bigs (the Halflings' ogre), daily runs with a shared seed.

---

## Future Ideas

Designs we tried or considered and set aside. They aren't in the game, but they're worth remembering.

### The Pocket and Blockers

*Removed during M1.3. A possible future mechanic, perhaps as a recruit, perk or Big ability.*

- **The pocket:** a single tile directly in front of the Big, the only route to it.
- **The Blocker:** the one Small placed in the pocket stays home instead of running. It carries a **hold counter**, shown as a badge.
- **Engaging:** Blitzers head for the pocket. When one runs into the Blocker, it stops and attacks on its rhythm, ticking the hold counter down. Several Blitzers drain it faster.
- **At 0, the Blocker is beaten** (a Walk-on dies), and the Blitzer steps into the pocket and starts on the Big's counter. Blockers only buy time.
- **The puzzle it created:** a Blocker is a runner you don't have.
- **Why it was set aside:** it added a role and a counter to learn, and it played less directly than Walk-ons trading themselves to take Blitzers out.

---

## Open Questions

- **Should playing with the sound off be supported?** Plenty of phone games are played on mute. The beat is also visible (bouncing) and felt (haptic ticks), but is that enough?
- **How much beat guidance should the UI provide?** The rhythm should stay readable without turning the whole game into a timing challenge.

- **Should the "someone will be there" target-ring hint stay forever?** It makes throws very readable, but it might make them *too* easy. It could become an early-game crutch or a perk instead.
- **Is the setup zone a fixed size?** Opening up more rows could be an upgrade, letting you start Smalls further up the field.
- **A Toss Hijink?** The Big grabs a Small and flings it to a spot. The old "fling" move could live on as a Hijink.
- **Should balls ever get rules?** Each Big's ball (Skull, Jack-o'-Lantern, Ember) is cosmetic for now. Later, a ball could be a draft card or perk, e.g. swapping to a Skull that bites defenders.
