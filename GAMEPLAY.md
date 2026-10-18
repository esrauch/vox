# Fourth & Ghoul: Gameplay

This doc covers what the player *does*: the design pillars, the run structure, a drive, a down, the controls, and how players and defenders interact. It builds on [THEME.md](THEME.md). Exact numbers live in `src/content/tuning.ts`.

**The north star: snappy, fast, silly, fun.** It's a **portrait, one-thumb phone game** with **voxel** graphics, and **everything moves to the beat**. It looks like *Crossy Road*, calls plays like a pocket-sized *Retro Bowl* or *Madden*, builds a deck like *Slay the Spire*, and has a roguelite's "one more run."

Items marked **▲** are recommendations or details that are still open to change. Every number is a starting value in `tuning.ts` or the content files, to tune by playtesting.

**Words used here:**
- **Area:** a themed place (the Haunted Forest first). Each area is four drives.
- **Drive:** one level: **four downs to gain 10 yards**. **Down:** one play.
- **Line of scrimmage:** where the current down starts. **First-down line:** 10 yards past where the drive started; get the ball over it to win the drive.
- **Play card:** a play you call. It sets the formation and every route, and can bring special players or tricks.
- **The quarterback (QB):** the one player who throws. It never moves during a play.
- **Players:** everyone else on your team, the ones who run, catch and carry. **Walk-ons** are the plain players on every play; **special players** come only with the card that brings them.
- **Carrier:** whoever has the ball after a catch.

---

## The Game in One Breath

Every drive, you have **four downs to gain 10 yards**. Each down you **draw three play cards and call one**: it lines your players up and sets their routes. The defense is right there for you to read: every defender's coverage is a purple ring, and every one of your players shows green, yellow or red for whether it's open. Snap the ball, **pull back and release** to hit an open receiver before the pass rush gets you, and watch the catch run straight upfield until it's tackled. Make the line and you **draft a new play card**. Miss on 4th down and **the run is over**. Each themed area is four drives (Intro, Challenge, Gimmick, Boss), then on to the next. **Your deck is your team. Go as far as you can.**

---

## Design Pillars

Every feature gets checked against these six.

1. **One thumb, portrait, playing within five seconds.** No tutorial wall. If something needs explaining, cut it or make it obvious.
2. **You are the quarterback.** Everything runs through the call and the throw. If your players could win without them, something is wrong.
3. **Something funny every few seconds.** Players flying, passes bouncing off a scarecrow's face, piles collapsing.
4. **Readable at a glance on a small screen.** Who's open, who has the ball, and what's about to hit you, in under a second.
5. **Everything moves to the beat.** The music is the game's clock. If you can hear it, you can play it.
6. **Every run tells a story.** "I beat the Treant on 4th and 9 with a Flea Flicker." Losing is funny, and the next run is one tap away.

The test for any feature: **does it make a run faster, funnier, more readable, or more "one more go"?** If not, cut it.

---

## The Run: Areas of Four Drives

- **A run is a series of themed areas**: the Haunted Forest first, then the graveyard, the swamp and more. **Each area is four drives**, *Balatro*-style:
  1. **Intro:** a plain defense, and a safe place to try new cards.
  2. **Challenge:** a tougher defense: tighter coverage, more rushers.
  3. **Gimmick:** one rule-bending twist on the defense or the field, shown before you pick a play (e.g. "the Witch flies two rows", "Bats everywhere", "4th and 15").
  4. **Boss:** the area's set-piece defense (the forest's is a Treant).
- **Then the run moves on to the next area**, with its own defenders, hazards, card pool and song.
- **There are no lives. Losing a drive is game over.** You get four downs, and that's it: every down counts. **The only way to lose is running out of downs.** There are no interceptions and no turnovers.
- **After every won drive, you draft** (see *The Deck*).

---

## A Drive: Four Downs to Gain 10 Yards

- **A drive is one screen and one defense.** The ball starts on your **line of scrimmage** near the bottom, and the **first-down line** is drawn **10 rows (10 yards) upfield**.
- **You have four downs to get the ball over that line.** Do it and the drive is won.
- **How a down ends:**

  | What happens | Result |
  |---|---|
  | **Tackled** | The down is over. The next down starts from where the carrier went down. |
  | **Incomplete** (nobody is there to catch it) | The down is used, with no gain. |
  | **Blocked** (the receiver was covered: the ball **bounces off the covering defender**) | The down is used, with no gain. |
  | **Sacked** (the pocket clock runs out before the throw) | The down is used, and you lose 2 yards. |
  | **4th down fails** | **The drive is lost: game over.** |

- **Every failed pass gets the comedy of a fumble:** the ball bounces loose, the crowd chants *"FEE! FI! FO! FUMBLE!"*. But it only costs the down.
- **Every down starts fresh:** your players line up again behind the new line of scrimmage.
- **The QB lines up 1½ yards behind the line of scrimmage** each down. *(Prototype: the camera shows the whole field, every drive starts 1½ yards up it, and the first-down line is 10 yards on. Following the line of scrimmage with the camera is still open.)*
- ▲ **Getting 10 yards in one play should be rare** (see *The Safety*). A typical drive is a short gain, a short gain, and a nervy 3rd or 4th down.

---

## A Down: Call the Play, Then Throw

1. **Draw three play cards** from your deck and **call one** (tap it; tap another to change your mind). All three go to the discard pile at the snap. When the deck runs out, the discard pile is shuffled back in.
2. **A card is the whole play:** where your players line up and **every player's route**, drawn on the field as a preview before you commit. **Flip** mirrors it left or right. That's the only adjustment: you don't place players by hand.
3. **The defense is visible before you choose** (*Into the Breach* style): every defender, its coverage ring and its job, where the Bats circle and the Witch flies. Picking the card that beats this defense *is* the puzzle.
4. **HIKE!** Receivers run their routes on the beat. Defenders cover them, and the pass rush comes for the QB.
5. **Pull back and release** to throw before **the pocket collapses** (see *The Pocket*), leading your receiver into open space.

### The Pocket *(Retro Bowl-style)*

- **It's a countdown you can see, nothing more.** Two linemen stand in front of the QB, either side of the middle, with **two rushers** (rhino beetles) pressed against them, leaving a lane up the middle for runs. From the snap, **the pocket clock runs: 6 beats** on an ordinary play. As it runs down, **the rush pushes your line back toward the QB**, and **pips over the line count the beats left** (white, then red for the last one). At zero, with the ball still in the QB's hand, it's a **sack**.
- **The line and the rushers are only drawn.** They don't block passes, bat the ball, chase or tackle.
- **Blockers buy time:** every player a play leaves at home (a "." route, like the Screen's two blockers) adds 1½ beats. **A defense that brings extra rushers** (the Boss brings two) takes 1½ beats away per extra rusher. The pocket never holds for less than 3 beats.
- **Runs have no pocket clock:** a Draw hands the ball off at the snap.

## Controls

**Throwing is a slingshot.** You aim by feel and let go. The beat is the shared clock, but there's no timing judgement.

| When | Input | What it does |
|---|---|---|
| **Before the snap** | **Tap a play card** (one of three) | Call the play: it sets your formation and every route, previewed on the field. |
| **Before the snap** | **Tap Flip** | Mirror the play left or right. |
| **Before the snap** | **Press anywhere and pull back** | **Snap the ball:** the down starts, and the same pull aims the throw. There's no HIKE button. |
| **After the snap** | **Press anywhere and pull back** | **Aim.** Wherever your finger first touches is the anchor. Pulling down aims up the field, and pulling left aims right. A **reticle** appears where the ball would land, with an animated dashed arc from the QB's hand to it. |
| **After the snap** | **Release** | **Throw** to the reticle: the ball leaves at once and lands on a beat. Releasing where you can't throw cancels. |

**That's it.** Nothing to steer after the catch.

- **The reticle is a free point, not a tile.** It shows a small ring for a **perfect** catch and a larger one for an **ok** catch, and turns red only where a throw isn't allowed at all. **It never warns about coverage:** you read the rings.
- **Leading your receiver is the skill:** put the reticle where it will be when the ball lands.
- **Only the QB throws. There are no laterals**, except on trick-play cards.
- **Throw range** is measured from the line of scrimmage: from **a yard behind it** (for a Screen) to **11 yards past it**.
- **One sliding arc, no throw modes:** the farther you throw, **the higher the ball flies** (the peak grows with the distance squared) **and the longer it's in the air** (about a beat per 2½ yards). The dashed aiming line shows the arc.
- **A pass can only be touched where it's low**, by anyone: caught by your players or batted down by defenders. A short pass stays low the whole way; a long one climbs out of reach right from the release and comes back within reach only as it drops toward the reticle. **The dashed aiming line shows it: gold (and bigger) where the ball will be low enough to touch, white where it's out of reach.** The gold stretch is drawn a little short of the real window, so catches are a bit more forgiving than they look.
- **The pull sensitivity** is a tuning value (`tuning.aim`).

---

## Coverage: Who's Open, at a Glance

- **Scarecrows (and Bats) show a purple ring** on the turf: a low pass inside it is knocked away. Covers and the Safety have **no ring**: they can only bat down a low pass that comes right past them. The rings go away once the ball is caught.
- **Every one of your players shows a ring that says whether it could catch right now:**
  - **Green:** clear. No coverage nearby; a ball arriving now is a safe catch.
  - **Yellow:** coverage is close (*within half a yard of a purple ring*). A ball thrown right at it now would still be caught, but by the time it lands, it may not be.
  - **Red:** covered (inside a purple ring). A ball thrown right at it would be blocked; lead it into open space instead.
- **The rings update every beat.** Reading them, and how they'll change during the ball's flight, *is* the throw.

### Catching

- **The ball lands at a free point**, and the **closest player within catch reach** is the receiver. How close decides the catch: **perfect** (within about ⅓ of a tile), **good** (about ¾) or **ok** (about 1.15). Hands widens all three.
- **A perfect catch is a Clean Catch:** the carrier **fends off one tackle** (shown by a glowing outline).
- **The catch window is the gold stretch:** along the ball's path, the first thing within reach of it while it's low decides the pass. **A defender right beside the ball bats it down**; **inside a Scarecrow's (or Bat's) ring it's knocked away**; **one of your players near it catches it**, even short of the reticle. So **leading the receiver away from its defender is the skill**: a receiver with a Cover right behind it can still catch a ball put on its far side.
- **If nobody is within reach, it's incomplete.**
- **There are no interceptions.** The Witch crossing the pass also **blocks** it: it bounces off.
- The game pops "PERFECT!", "GOOD!" or "OK", and "BLOCKED!" when one bounces.

### Tackling

- **A tackle is contact:** the carrier is down when a defender reaches it: they meet on a tile or swap tiles, or the defender ends a beat **right next to it** (in front, behind or beside, not diagonally). So a chaser one step behind catches the carrier rather than trailing it up the field. Any defender can tackle.
- **A fend-off** (from a Clean Catch or a card) knocks that defender down instead, long enough for the carrier to get clear, and the carrier keeps running.
- **Blocking is just standing in the way:** your players and defenders **never share a tile**. Whoever would step into the other waits, so a player on a "." route is a blocker that defenders have to go around. Only the carrier can be stepped into, and that's a tackle.
- **Your players never block each other.** They can share a tile and hop past one another.

---

## The Defense

Defenders are the forest's locals, who don't want a football team tramping through their woods. They **always wear candy purple and never wear helmets**, so they can't be mistaken for your team (THEME.md, *The Opposition*). Each kind has **one job** and shows its next hop with an arrow.

| Defender | Forest creature | Job | Ring |
|---|---|---|---|
| **Cover** | Garden Gnome | **Man coverage.** At the snap, each picks a receiver (the nearest one not already covered) and shadows it **one beat behind**, so a route's cut opens a beat or two of separation. After a catch, it **chases the carrier**. | **None:** it blocks only by being right beside a low pass |
| *The pass rush* | Rhino Beetles | **Drawn, not played:** three rushers against your line, pushed in as the pocket clock runs (see *The Pocket*). A defense's rush count only changes the clock. | — |
| **Zone** | Scarecrow | **Doesn't move.** Planted on its tile, it guards a wide area. | **Wide** (1½ yards): a low pass inside it is knocked away |
| **Safety** | **Owl**: perched deep, it sees everything | **The deep guard, always between the ball and the first-down line.** It hangs back near the line and slides across its row to stay level with your deepest receiver; while a pass is in the air, it slides toward where it will land. **After a catch it gets into the carrier's column first, then comes down to meet it** (a carrier already past it is just chased). So **a deep pass coming down near it is batted away**, and a carrier rarely gets by it. Beating the Safety (a decoy, a flood to one side, a trick play) is how you gain 10 in one play. | **None** |
| **Bat** | Bat | **Patrols** a fixed box circuit (3 yards square), one tile per hop, whatever the play is doing. It's already circling before the snap, so you can time a throw past it. A pass coming down near it bounces off. | Small (half a yard), moving with it |

- **Later drives and areas** add more Covers and rushers, plant more Scarecrows, and lengthen the distance ("4th and 15").
- **Before the snap, only the Bats move.** Everyone else waits for HIKE.

### Hazards

**Hazards** don't react to you. They're beat patterns, like the cars in *Crossy Road*: you learn their rhythm and call plays around them.

**The readability test for every hazard:** one big, simple voxel shape that reads from the steep camera at phone size, **one rule**, and **one telegraph** (an arrow, a shadow, a glow). No status effects: a hazard either hits you or it doesn't.

| Hazard | Shape | Rule | Telegraph | Status |
|---|---|---|---|---|
| **Witch on a Broom** | A purple pointed hat on a broom, flying high. | **An air lane.** She flies across her row **one tile per beat** and never stops: off one side of the field, and the next sweep comes in from the other. **Only passes are affected:** a pass crossing her row within about a tile of her bounces off her. Runners pass under her. | She **faces the way she's flying**, the only model that turns, and casts a dark shadow on her row. ▲ *A flash at the edge the beat before she enters.* | **Built** |
| **Rolling Pumpkin** | A big orange pumpkin. | **A ground lane.** One to three pumpkins roll along a row, one tile per beat (or every 2 on a slow lane), wrapping around. Anything it rolls into goes down for the rest of the down; a carrier it hits is **tackled**. Pumpkins are low, so passes fly over them. | An arrow to each pumpkin's next tile. | Planned |
| **Tombstone** | A grey slab. | **A static obstacle.** Nothing can enter its tile: a runner stops behind it. Passes fly over it. | None needed. | Planned |
| **Drifting Ghost** | A plain white sheet with two eye holes. | **A slow, tall lane** (a tile every 2 beats). It knocks players down, and because it's tall it **blocks passes** through its tile. | An arrow to its next tile. | Later |

**Hazard rules:**
- **Pure beat patterns.** What a hazard does is set by the beat number alone, so the same field always plays the same way.
- **Learn it before the snap.** Hazards and patrols keep moving while you pick a play, and carry on exactly where they were after HIKE.
- **One beat of warning, always.** Nothing moves without telegraphing it first.
- **They hit defenders too.** ▲ *Covers are reckless and charge through; Bats and Scarecrows don't go near them.*
- **Upfield only.** Hazards never sit behind the line of scrimmage or reach the QB.

---

## The Deck: the Only Progression

- **A run starts with a deck of 8 basic plays:** **Go** (deep), **Slant** ×2, **Out**, **Curl** ×2, **Screen** (a short toss behind two blockers) and **Draw** (a handoff behind two blockers: no throw at all). Every play uses **four Walk-ons**. The first draft pool adds **Four Verticals**, **Mesh**, **Flood** and **Quick Out** (content/cards.ts).
- **After every won drive, pick one of three new cards** to add to the deck, **or cut one** to thin it (never below three), or skip.
- **Cards can bring players who exist only for that play.** For example: **Bat Route** (a Bat receiver flies over defenders), **Skeleton Sneak** (the carrier reassembles after its first tackle), **Pumpkin Decoy** (a rolling pumpkin drags coverage away).
- **Trick plays are cards too.** For example: **Flea Flicker** (a pitch back, then a deep throw), **Hook and Ladder** (a lateral after the catch), **Hail Mary** (huge range, tiny catch window), **Statue of Liberty**.
- **The cards on offer come from the area you're in:** the forest offers forest creatures and forest tricks.
- **Nothing else carries over between drives.** If it matters, it's on a card.
- **Card names and art should be jokes.** The draft is part of the comedy, not a spreadsheet.
- ▲ *Card rarity, and upgraded versions of cards ("veteran" plays), come later.*

---

## The Grid and the Beat

### The Grid

- **The field is a grid of half-yard tiles:** **11 wide and 26 tall** (5½ by 13 yards) in portrait, so a 10-yard first down is 20 rows and the whole drive fits on one screen. Everything lives on it.
- **Players and defenders hop tile to tile**, the way the chicken does in *Crossy Road*, and they **hop on the beat**.
- **Routes are tile paths**, so a play's preview is easy to read. ▲ *The grid can be loosened later if it plays stiff.*

### The Beat

**The whole game runs on the music**, like *Crypt of the NecroDancer*.

- **The music is the clock.** It starts when you tap **PLAY** and never stops: through picking plays, downs, drives and new runs. Pausing freezes the music and the beat together.
- **There's one clock for the whole game: the music.** The game ticks **on the beat**, and **everyone hops every tick**: half a yard per beat, 1 yard a second at 120 BPM, so a play lasts about 8–14 seconds. HIKE doesn't start the clock; it just releases everyone. Before the snap only the Bats and hazards move.
- **Every throw lands on a tick:** one beat after the release for a quick pass, two for a long one. The ball **leaves the QB's hand the instant you let go** and flies a little faster or slower so it lands in time.
- **Hazards are beat patterns**, so you learn them like a riff.

**The soundtrack:** cheerful Halloween music with a strong, clear pulse. Four loops so far, from friendliest to most intense: *Graveyard Shuffle* (a swung monster-mash bop), *Spooky Surf* (the one the game plays now), *Midnight Chase* (driving) and *Skeleton Stomp* (for bosses). They share one tempo and loop length, so the game can crossfade between them at any moment. ▲ *When it switches songs (by drive type? on 4th down?) is still open.*

---

## Reading the Field: Visual Indicators

**Clarity comes first.** A glance should tell you who's open, where everything is about to go, and where your ball will land.

| What | How it's shown |
|---|---|
| **The beat** | The music, and everything on the field hopping and bouncing in time. There's no beat bar. |
| **Down and distance** | A plain readout, e.g. **"3rd & 4"**, and the **first-down line** drawn across the field. |
| **The play you're calling** | Each card's routes drawn on the field as a preview, before you commit. |
| **Coverage** | A **purple ring** around every covering defender. |
| **Who's open** | A **green, yellow or red ring** under each of your players. |
| **Where a unit will hop next** | A **small arrow toward its next tile**. Models never turn: they always face the camera (except the Witch, who faces the way she's flying). |
| **The reticle** | While you pull: a free point with a small *perfect* ring and a larger *ok* ring, and a dashed arc marching from the QB's hand to it. |
| **Where the ball will land** | A landing ring with **countdown pips**. |
| **The pocket clock** | Your line in front of the QB being pushed back, with **pips over it, one per beat left** before the sack. |
| **Who has the ball** | The carrier holds a **bigger football up overhead**, with a **pulsing gold ring** on the ground around it. |
| **Hazards** | Every hazard warns **one beat ahead**. |

**Readability rules:**
- **Teams are told apart by shape *and* color,** never by color alone: your team is gold and orange in football helmets; defenders are candy purple with no helmets.
- **One beat of warning for everything.**
- **Indicators stay small.** They sit on the tiles, not over them. The voxel field stays the star.

---

## How the Attributes Show Up

**Every player and every defender has Hustle, Hands and Heft**, whole numbers starting at 0. **0 is the plain baseline**, and every point above it is an upgrade. Walk-ons are 0 / 0 / 0; special players on cards are better at something.

**The QB has no stats.** Cards can bend its throw (a Hail Mary's range, a quick-release play).

| Attribute | At **0** | At 1+ |
|---|---|---|
| **Hustle** | Hops **every tick** (2 yards a second). | ▲ *Faster: e.g. two hops a tick.* |
| **Hands** | The normal catch reach. | ▲ *Wider catch reach.* |
| **Heft** | **Tackled on the first contact.** | ▲ *Breaks tackles.* |

**Fends off** is separate: a charge that beats one tackle (from a Clean Catch, or a card).

---

## Score and Meta

- **The score is how far you got**: the area and drive, plus the yards you gained along the way. "Best: Area 2, drive 3" shows on the main screen. ▲
- **Light meta progression**, collected rather than grinded: new **cards** in the draft pools, new **areas**, and team **looks** (helmet and jersey colors, the team name).
- Nothing pay-to-win. Meta unlocks give you **variety, not power**.
- ▲ *Daily runs with a shared seed.*

---

## Feel and Juice

This is a pillar-level priority, not polish to add at the end.

- **Hit-pause** on catches, tackles and blocks, and **screen shake** on big hits.
- **Voxel destruction:** tackled players burst into chunky cubes and click back together for the next down.
- **Squash and stretch** on everything.
- **Every player makes a noise:** grunts, squeaks, rattles, howls.
- **Haptics** on throws, catches, tackles and blocks, plus a light tick **on the beat**.
- **Everything bounces in time:** the field, the crowd, the players waiting for the snap, the QB's foot tapping.
- **The chant** on every failed pass. **A big moment** on 4th down.

---

## Scope: First Playable

The smallest version that proves the fun:
- **One area, the Haunted Forest, of four drives** (placeholder Gimmick and Boss).
- **Drives and downs** with a first-down line and a down-and-distance readout.
- **Play cards:** six starter plays with formations, routes and Flip; draw 3, call 1.
- **The defense:** Covers, Zones, a Safety and Bats, the drawn pass rush, Scarecrow rings and green, yellow and red player rings. Blocks instead of interceptions.
- **The Witch** as the first hazard.
- **The draft** after a won drive: one of three cards, or remove one.
- One looping song, the core sound effects, and basic juice.

**Then:** trick-play cards and special players, the Rolling Pumpkin, a real Boss, a second area.

**Later:** card rarity and upgrades, team looks, daily runs.

---

## History: Ideas Tried and Set Aside

Designs we built or considered. They aren't in the game, but they're worth remembering.

- **Screens to the end zone, balls as lives** *(until 2026-10-18):* you placed your squad freely, threw once, and ran it to the top of the screen. A pile of balls was your lives, and every fumble or interception cost one. Walk-ons traded themselves for defenders; recruits joined from a draft and were gone for good if they went down; Hijinks spent a Hype meter. **Why it was replaced:** placement barely mattered, waiting was free, and the run after the catch was free too, so there was no real game. Drives, downs and play cards replaced it.
- **Steering the carrier** *(tried 2026-10-17, discarded 2026-10-18):* swipe to sidestep or wait after the catch. It didn't make the game.
- **The pocket and Blockers** *(removed in M1.3):* a single tile in front of the QB held by a Blocker with a hold counter that Blitzers wore down. It added a role and a counter to learn.
- **A hold counter for sacks** *(replaced 2026-10-17):* Blitzers attacked a 3-point counter. Now the pocket clock decides the sack.
- **The Giant Quarterback** *(the original premise):* you were the **Big**, a hulking monster QB, and your team was tiny creatures (the **Smalls**). The comedy of scale might return as a boss.

---

## Open Questions

- **How does the camera follow a drive?** The prototype shows the whole field; a drive that starts deeper, or longer distances ("4th and 15"), would need it to scroll.
- **The forest's Gimmicks and Boss:** the prototype has three Gimmicks (Witching Hour, Bat Cave, Scarecrow Field) and a placeholder Boss defense (The Treant's Guard, content/areas.ts). The Treant itself is still to design.
- **After the last area:** the prototype ends the run with "The forest is cleared!"; the next area is still to come.
- **When does the music change?** By drive type, area, or tension (4th down)?
- **Should playing with the sound off be supported?** The beat is also visible (bouncing) and felt (haptic ticks), but is that enough?
