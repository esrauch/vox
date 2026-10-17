# Fee Fi Fo Fumble: Gameplay

This doc covers what the player *does*: the design pillars, the controls, the run structure, and how a single screen plays out. It builds on [THEME.md](THEME.md). Exact numbers and tuning belong in a later systems doc.

**The north star: snappy, fast, silly, fun.** It's a **portrait, one-thumb phone game** with **voxel** graphics, and **everything moves to the beat**. It looks like *Crossy Road*, plays to the rhythm of *Crypt of the NecroDancer*, and has a roguelite's "one more run."

Items marked **▲ Decision** are recommendations that are still open to change.

---

## The Game in One Breath

You're the Big, planted at the bottom of the screen with the ball. First you **place your Smalls** in the bottom grid. Then the play starts, and you have two kinds of tap: **tap the field to place the target**, and **tap a button to act**: the pulsing ball to throw, and Hijinks after the throw. **Get the ball to the top of the screen** and it's a touchdown. Then the camera scrolls up, there's a new screen and harder defenders, and you **pick a reward**. Your Smalls can die, and the dead stay dead. The Big starts the run with a pile of **balls**, and those are your lives. Every fumble costs one for good. When the last ball is gone, the run is over. **Go as far as you can.**

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

That's what makes the Smalls precious. **If you run out of Smalls, you can't score**, and the run is effectively over.

---

## The Big Never Moves

Bigs can't score, so the Big doesn't need to move. **It stands rooted at the bottom of the screen**, like a quarterback in the pocket or a tower in a tower-defense game. All of its power goes into the arm.

This gives the game one thing to master: **where and when you throw**.

---

## Controls: Aim, Then Time

**Aiming and timing are separate taps.** You aim at your leisure, then put all your attention on hitting the beat.

| Phase | Input | What it does |
|---|---|---|
| **Setup** | **Drag a Small** into a tile of the setup zone | Set your formation. |
| **Setup** | **Tap HIKE!** | Start the play. |
| **Play** | **Tap the field** | **Place the target reticle** on that tile. Tap again to move it, as often as you like. |
| **Play** | **Tap the pulsing ball** | **Throw** to the reticle. The ball button sits at the bottom center and pulses on the beat. |
| **After the throw** | **Tap a Hijink icon** | Fire it, either at the reticle or across the whole field (see *Hype and Hijinks*). |

**That's it.** There's nothing to move or steer.

- **The reticle is the single target for everything.** It marks where your next throw will go, and where your Hijinks will hit.
- **The ball button is your team's ball:** a pumpkin, a skull, an ember. It bounces on every beat, glowing brightest *on* the beat, which is when you want to tap it.
- **A throw goes to a tile, not a player.** The ball arcs through the air and lands exactly on the reticle's tile. **Leading your receiver** is the skill.
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
  - **Your Small is on the tile:** it's a catch, and play goes on.
  - **A defender is on the tile:** it's intercepted, and that's a **fumble**.
  - **Nobody is on the tile:** it's a miss, and that's also a **fumble**. There are no loose balls and no scrambles. A throw either connects or it costs you a ball.
- **Throws and Hijinks always happen on a beat.** Tap whenever you like, and the action fires on the **next beat**. Nothing ever happens off the beat.
- **Tap close to a beat for an On-Beat bonus.** The closer your tap is to the beat itself, the better. Off-beat taps still work, so the game is never unplayable if you lose the rhythm. Rhythm is a skill bonus, not a gate.
  - **On-Beat throw:** the throw itself is unchanged, but it **charges your Hijinks**, giving a big chunk of Hype. Rhythm feeds your powers. ▲ *Decision:* the alternative was making an On-Beat throw **uninterceptable**. Recommendation: make that a perk instead (**Perfect Spiral**: On-Beat throws can't be intercepted). That way the base bonus never decides whether a throw connects, but rhythm-heavy builds can lean into it.
  - **On-Beat Hijink:** the Hijink hits **harder**: a bigger area, a longer effect, or a partial Hype refund, whichever suits that Hijink. Rhythm makes your powers better.
- **Setup is the break.** During the huddle the music drops to a quiet loop. **HIKE!** brings the beat crashing back in.
- **The tempo is the difficulty dial.** Each biome has its own track and tempo, and the beat picks up as you climb. Boss screens get their own song.

**The soundtrack:** cheerful Halloween music with a strong, clear pulse. Spooky surf rock, a swinging organ, monster-mash bop and thumping bonfire drums.

### Reading the Beat: Visual Indicators

**Clarity comes first.** At any moment, a glance should tell you *when* the next beat is, *where* everything is about to go, and *where your ball will land*.

| What | How it's shown |
|---|---|
| **The beat itself** | A beat bar along the bottom edge, as in *NecroDancer*: ticks slide in toward a pulsing jack-o'-lantern in the center. The whole field gives a small bounce on every beat. |
| **The grid** | A soft checkerboard on the turf, so every tile is obvious. |
| **Where a unit will hop next** | Every Small and defender **faces the direction it's about to hop**, as in *Crossy Road*. Fast units show a double-hop arrow. |
| **Throw range** | A ring around the Big. It shrinks visibly as climbers pile on. The reticle can't be placed outside it. |
| **The ball button** | Your team's ball at the bottom center, bouncing and glowing in time. It's brightest exactly on the beat. |
| **The reticle** | A bold target on a tile, in your team's color. Before a throw it shows where the ball will go. After a throw, it marks where Hijinks will land. |
| **Where the ball will land** | The reticle locks in, with **2 countdown pips** (one per beat), plus the ball's shadow growing as it falls. |
| **Is someone going to be there?** | The target ring lights up in your team's color if one of your Smalls will hop onto the tile in time, and red if a defender will. |
| **Hazards** | Every hazard warns **one beat ahead**: a lane flashes before something enters it, and a trap shows countdown pips before it snaps. |
| **How buried the Big is** | Climbers are visible on its body, plus a short row of "buried" pips. When they're full, it's a fumble. |
| **On-Beat taps** | An "ON BEAT!" pop, a sparkle trail and a beat-synced *thwump*. The Hype meter visibly jumps. |

**Readability rules:**
- **Teams are told apart by shape *and* color,** never by color alone.
- **One beat of warning for everything.** Nothing on the field moves without telegraphing it first.
- **Indicators stay small.** They sit on the tiles, not over them. The voxel field stays the star.

### 1. Setup (the huddle)

- The new screen is revealed, and **you can see everything** before you commit: every defender in its starting tile and every hazard lane.
- **Setup is a little puzzle.** You read the board and place Smalls to beat it. A defender's *kind* tells you what it'll do: a Chaser will come at your carrier, a Wall-er holds its row, a Picker guards a passing lane. **Hazards keep cycling during setup**, so you can see the rhythm of a lane before you send someone into it.
- **Drag your surviving Smalls into tiles of the setup zone.**
- **Where a Small starts decides what it does.** Each Small runs up its own **column**, doing the job its kind does. A Small placed in the **back row stays home to protect the Big** from climbers.
- So the central trade-off is: **send more Smalls up the field, or keep more back to protect the Big?**
- **Snappy defaults:** last screen's formation is pre-filled, so a quick look and a tap on **HIKE!** is enough.

### 2. Play

- Your Smalls charge upfield. Defenders react, hazards cycle, and climbers go for the Big.
- You **place the reticle**, **tap the pulsing ball** on the beat to throw, and then use **Hijinks** while the ball is in flight or being carried.
- **Touchdown:** a Small carries the ball across the top edge. You get a short celebration (it can be skipped by tapping), the camera scrolls up, and it's time to **draft**.

A screen should take **roughly 15–40 seconds** of play, plus a few seconds of setup.

### What's in the Way

Two kinds of trouble fill each screen. **Neither of them ever has the ball.** All they want is to stop you.

**Defenders** react to you. They're the AI opposition:
- **Chasers** run at your carrier.
- **Climbers** go for the Big and bury it. Your back-row Smalls exist to stop them.
- **Wall-ers** hold a line and block lanes.
- **Pickers** lurk near passing lanes and try to intercept.

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
- **They kill Smalls.** Hazards are the most common cause of permadeath, so a well-timed run gets *through* a lane and a bad one gets flattened.
- **If a hazard hits your carrier, it drops the ball.** That's a fumble, and you lose that ball.
- **Hazards never reach the Big.** The bottom grid is always safe ground. Hazards live up the field.
- **Throws can be blocked.** A ball in the air can hit something tall passing through a lane (a hearse, a boulder) and drop.
- **Telegraph everything.** Every hazard shows a warning before it moves (a rumble, a shadow, a glow) so that deaths feel fair and funny, not cheap.

**Screens are built from horizontal strips**, much as *Crossy Road* builds its road: open turf, defender zones and hazard lanes stacked on top of each other. Mixing up those strips is how screens get both variety and difficulty.

### Balls Are Lives

**The Big starts the run with a pile of N balls** (skulls, jack-o'-lanterns, embers, depending on the team), stacked right beside it at the bottom of the screen. **The pile is your life counter.** There's no separate interface for it; you can just *see* how many you have left.

- **The count carries over for the whole run.** It never resets between screens.
- **A fumble loses the ball in play for good.** The defense runs off with it, or it gets smashed. Fumbles happen when the Big gets buried, a throw lands on an empty tile, a defender catches a throw, or a carrier gets tackled or flattened by a hazard.
- **Then play continues with the next ball.** The Big grabs a fresh one from the pile and you keep going on the same screen. Your Smalls stay where they are, so there's no setup phase again.
- Each fumble comes with a slow-motion beat, *"FEE! FI! FO! FUMBLE!"*, and a gasp from the crowd as the pile shrinks.
- **When the last ball is gone, the run is over.**
- **More balls are a draft reward**, and a rare, valuable one. Because lives carry over, every extra ball is a real lifeline.

### The Pocket

While the Big holds the ball, climbers sneak past your back row and **climb onto it**. Each one hanging on **shrinks your throwing range**, which is shown as a ring on the field that gets smaller. When enough are on, the Big is **buried** and fumbles. The Big can't shake them off; only your protecting Smalls can knock them away (or a Hijink).

So every possession is a few seconds of "throw it, THROW IT," against a receiver who isn't quite open yet.

---

## The Smalls

- **They run themselves**, starting from the cell you put them in. Each kind has a single, obvious job you can read from its silhouette: runners sprint up their column, blockers crash into the nearest defender, decoys draw defenders away, and guards (in the back row) protect the Big.
- **Knocked down:** an ordinary hit knocks a Small down. It bursts into voxel bits, pops back together and keeps going.
- **Dead:** a hit that's *too big* for its Heft kills it, and it stays dead for the rest of the run. Big hits, hazards, enemy Bigs and lava can all do it. A tiny tombstone pops up and a little ghost floats away, waving.
- **Squad size changes through the run.** It shrinks through deaths and grows through drafts. Your starting squad depends on your team (the Graveyard's horde, the Woodfolk's handful).

**Graveyard twist:** this is the one team for whom death isn't final. Their dead Smalls have a chance to **crawl back out of the ground** on the next screen. It's their whole identity, right in the run structure.

---

## The Draft: Trick or Treat

After every touchdown, you go trick-or-treating: choose **one of three cards**. It's one tap and then straight into the next screen.

▲ *Decision:* most cards are **Treats** (pure upgrades). Occasionally a **Trick** shows up instead: a strong card with a funny downside, e.g. "+2 Hustle for every Small, but the ball is on fire."

**One card is always a new Small.** It's usually a basic kind from your team. Sometimes it's a rare or better one, and occasionally a **mercenary** from another team.

The other two are drawn at random from:

| Card type | Examples |
|---|---|
| **Stat upgrades** | +Hustle for all your Runners, +Hands for your Big, +Heft for one named Small. |
| **Better Smalls** | Promote one Small to a veteran version. |
| **Hijinks** | Unlock a new Hijink, or power up one you already have. |
| **Fast Throw** | Throws land in 1 beat instead of 2. |
| **Perfect Spiral** | On-Beat throws can't be intercepted. |
| **Extra balls** | +1 ball on the pile. It's rare and precious. |
| **Perks** | Passive quirks with punny names, e.g. **Butterfingers Insurance** (the first fumble of each screen is free) or **Second String** (a dead Small sometimes comes back). |

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
- **Hype** is a crowd meter that fills when exciting things happen: **On-Beat throws** (the main source), long throws, diving catches, touchdowns. A fumble *drains* it. Each Hijink costs Hype, so a full meter means you can afford something.
- **▲ Decision:** Recommendation: **at most three Hijink slots**, beside the ball button. When you draft a fourth, it replaces one you already have.
- **Hijinks fire on the next beat, like throws.** If you tap one On-Beat, it hits harder (see *The Beat*).

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
  - New **Bigs** to unlock, each with its own look and a starting Hijink (a vampire Groundskeeper, a cactus treant, a pebble who insists it counts as a Big).
  - New **teams** to unlock (the Halflings).
  - New card types joining the draft pool.
- Nothing pay-to-win. Meta unlocks give you **variety, not power**.

---

## How the Attributes Show Up

The Three H's apply to the Big and every Small. They show up only as **pips on cards and on team select**. Everything else is learned by feel.

| Attribute | You feel it when… |
|---|---|
| **Hustle** | How often a Small hops. Slow ones hop every other beat, normal ones every beat, and the fastest (Squirrel Riders) cover two tiles per beat. Bigs don't use Hustle, since every throw takes 2 beats. Making throws faster is the **Fast Throw** perk. |
| **Hands** | Catches stick. A *very* high-Hands Small can dive for a ball that lands on the tile next to it, which is the one way to rescue a near-miss. A high-Hands carrier also doesn't get the ball stripped. **A Big with high Hands has a bigger throwing range.** |
| **Heft** | Somebody wins a collision. Most importantly, **high-Heft Smalls survive hits that would kill others.** **A Big with high Heft can carry more climbers** before it's buried. |

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
- One team (**Woodfolk**: the clearest passing game).
- One biome, with generic defenders and two hazard types (one lane, one timed trap).
- The setup grid, one looping track with everything on the beat, the reticle and the pulsing ball button (throws quantized to the beat), climbers and the pocket, a pile of balls as lives, permadeath.
- A draft with **new Small** and **stat upgrade** cards only.
- Endless screens with a simple difficulty ramp, and a score.

**Then:** Hijinks and Hype, perks, a second and third team, biomes, boss screens.

**Later:** unlockable Bigs, mercenaries, the Halflings, daily runs with a shared seed.

---

## Open Questions

- **Should playing with the sound off be supported?** Plenty of phone games are played on mute. The beat is also visible (bouncing) and felt (haptic ticks), but is that enough?
- **How strict should On-Beat be?** A generous window keeps the game casual. Recommendation: generous, with tighter windows offered as a perk or a challenge mode.

- **Do hazards hurt defenders too?** That would allow clever plays, like baiting a chaser into a lava lane.
- **Can the Big throw all the way to the top?** If so, a Small that's already near the top could score instantly. Recommendation: the Big's range covers most of the screen but not all of it, so the last stretch always has to be *run*.
- **Should the "someone will be there" target-ring hint stay forever?** It makes throws very readable, but it might make them *too* easy. It could become an early-game crutch or a perk instead.
- **Is the setup zone a fixed size?** Opening up more rows could be an upgrade, letting you start Smalls further up the field.
- **A Toss Hijink?** The Big grabs a Small and flings it to a spot. The old "fling" move could live on as a Hijink.
- **Is the starting squad size a team trait,** and how small can the Woodfolk's handful be before one bad screen ends a run?
- **Should balls ever get rules?** Each team's ball (Skull, Jack-o'-Lantern, Ember) is cosmetic for now. Later, a ball could be a draft card or perk, e.g. swapping to a Skull that bites defenders.
