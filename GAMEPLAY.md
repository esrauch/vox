# Fourth & Ghoul: Gameplay

This doc covers what the player *does*: the design pillars, the controls, the run structure, and how a single screen plays out. It builds on [THEME.md](THEME.md). Exact numbers and tuning belong in a later systems doc.

**The north star: snappy, fast, silly, fun.** It's a **portrait, one-thumb phone game** with **voxel** graphics, and **everything moves to the beat**. It looks like *Crossy Road*, plays to the rhythm of *Crypt of the NecroDancer*, and has a roguelite's "one more run."

Items marked **▲ Decision** are recommendations that are still open to change.

**Words used here:**
- **Drive:** one level: four downs to gain 10 yards. **Down:** one play.
- **Play card:** a play you call. It sets the formation and every route, and can bring special players or tricks.
- **The quarterback (QB):** the one player who throws. It stands in the backfield and never moves.
- **Players:** everyone else on your team, the ones who run, catch and score.
- **Walk-ons:** the vanilla rookies every run starts with. *(THEME.md calls them rookies; the final name isn't settled.)*
- **Recruits:** haunted-forest creatures in football helmets who join along the way.

---

## The Game in One Breath

Every drive, you have **four downs to gain 10 yards**. Each down you **draw three play cards and call one**: it lines your players up and sets their routes. The defense is right there for you to read. Snap the ball, **pull back and release** to hit the receiver who's beaten their man before the pass rush gets you, and watch them run until they're tackled. Make the line and you **draft a new play card**. Miss on 4th down, or get picked off, and **the run is over**. Each themed area is four drives (Intro, Challenge, Gimmick, Boss), then on to the next. **Your deck is your team. Go as far as you can.**

---

## The Core Loop: Drives, Downs and Play Cards *(decided 2026-10-18)*

This section is the source of truth for how a run plays. Where older sections below disagree, they're marked **superseded** and this wins.

### The run: areas of four drives

- **A run is a series of themed areas** (the Haunted Forest first, then the graveyard, the swamp and more). **Each area is four drives**, *Balatro*-style:
  1. **Intro:** a plain defense, and a safe place to try new cards.
  2. **Challenge:** a tougher defense: tighter coverage, more rushers.
  3. **Gimmick:** one rule-bending twist on the defense or the field, shown before you pick a play (e.g. "the Witch flies two rows", "Bats everywhere", "4th and 15").
  4. **Boss:** the area's set-piece defense (the forest's is a Treant).
- **Then the run moves on to the next themed area**, with its own defenders, hazards, card pool and song.
- **There are no lives. Losing a drive is game over.** You get four downs, and that's it. Every down counts.

### A drive: four downs to gain 10 yards

- **A drive is one screen and one defense.** The ball starts on your **line of scrimmage** near the bottom, and a **first-down line** is drawn **10 rows (10 yards) upfield**.
- **You have four downs to get the ball past that line.** Do it and the drive is won: you draft a card and go on to the next drive.
- **How a down ends:**

  | What happens | Result |
  |---|---|
  | **Tackled** | The down is over. The next down starts from where the carrier went down. |
  | **Incomplete** (nobody catches the pass) | The down is used, with no gain. |
  | **Sacked** (the pass rush reaches the QB before the throw) | The down is used, and you lose 2 yards. |
  | **Intercepted**, or **4th down fails** | **The drive is lost: game over.** |

- **After a catch, the carrier runs on its own**, straight upfield, until it's tackled or crosses the line. You don't steer it.
- **Every down starts fresh:** your players line up again behind the new line of scrimmage.

### Each down: pick a play, then throw

1. **Draw three play cards** from your deck and **play one**. The other two go to the discard pile (*Slay the Spire* style). When the deck runs out, the discard pile is shuffled back in.
2. **A card is the whole play:** where your players line up and **every player's route**, drawn on the field as a preview before you commit. **Flip** mirrors it left or right. That's the only adjustment: there's no dragging players.
3. **The defense is visible before you choose** (*Into the Breach* style): who's marking whom, where the pass rush comes from, where the Bats circle and the Witch flies. Picking the card that beats this defense *is* the puzzle.
4. **Snap, then throw.** Receivers run their routes on the beat, and you pull back and release as before. **The pass rush gives you about 4–6 beats** before you're sacked, so waiting is never free.

### The deck is the only progression

- **A run starts with a small deck** of 6–8 basic plays, e.g. **Go** (deep), **Slant**, **Out**, **Curl**, **Screen** (short, with blockers) and **Draw** (a handoff: no throw at all).
- **After every won drive, pick one of three new cards** to add to the deck, **or remove one** to thin it.
- **Cards can bring players who exist only for that play.** For example: **Bat Route** (a Bat receiver flies over defenders), **Skeleton Sneak** (the carrier reassembles after its first tackle), **Pumpkin Decoy** (a rolling pumpkin drags coverage away).
- **Trick plays are cards too.** For example: **Flea Flicker** (a pitch back, then a deep throw), **Hook and Ladder** (a lateral after the catch), **Hail Mary** (huge range, tiny catch window), **Statue of Liberty**.
- **Nothing else carries over between drives.** Recruits, Walk-on upgrades, Hijinks, Hype and perks are all replaced by cards: if it matters, it's on a card.

### The defense has jobs

- **Chasers mark a receiver** (man coverage), and **pursue the carrier** after a catch.
- **Blitzers are the pass rush:** they decide how long you have to throw.
- **Wall-ers guard a zone:** a row they won't let you cross for free.
- **Bats and the Witch** keep their patterns over the field: a Bat intercepts passes under it, and the Witch snatches passes crossing her row.
- **Later drives and areas** tighten the coverage, add rushers and lengthen the distance.

### Kept for the prototype

- **The grid and the beat stay.** Routes on the grid are readable and cheap to build; they can be loosened later if it plays stiff.
- **The slingshot throw, catch slop and catch quality stay.** A perfect catch still earns a fend-off.

---

## Design Pillars

Every feature gets checked against these six.

1. **One thumb, portrait, playing within five seconds.** No tutorial wall. If something needs explaining, cut it or make it obvious.
2. **You are the quarterback.** Everything runs through the throw. If your players could win without it, something is wrong.
3. **Something funny every few seconds.** Players flying, fumbles, piles collapsing.
4. **Readable at a glance on a small screen.** You can see who has the ball, where your team is, and what's about to hit you in under a second.
5. **Everything moves to the beat.** The music is the game's clock. If you can hear it, you can play it.
6. **Every run tells a story.** "I got to screen 23 with just one rookie and a bat in a helmet." Losing is funny, and the next run is one tap away.

The test for any feature: **does it make a run faster, funnier, more readable, or more "one more go"?** If not, cut it.

---

## The Core Rule: The QB Throws, Players Score

**The quarterback can never score.** The ball has to cross the first-down line (or, in the old design, the top of the screen) in the hands (or wings, or jaws) of one of your players. The QB's job is to **get it to a player who can get it there**.

That's what makes your players matter. Your **Walk-ons** always return for the next screen, so you never run out for good. But if everyone on the field goes down mid-screen, it costs you a ball (see *Wipeout*).

---

## The QB Never Moves

The QB can't score, so it doesn't need to move. **It stands rooted at the bottom of the screen**, like a quarterback in the pocket or a tower in a tower-defense game. All of its power goes into the arm.

This gives the game one thing to master: **where and when you throw**.

---

## Controls: Pull Back and Release

**Throwing is a slingshot.** You aim by feel and then let go; the beat is the shared clock, but there's no separate "perfect timing" challenge or judgment UI.

| Phase | Input | What it does |
|---|---|---|
| **Before the snap** | **Tap a play card** (one of three) | Call the play: it sets your formation and every route, previewed on the field. |
| **Before the snap** | **Tap Flip** | Mirror the play left or right. |
| **Before the snap** | **Tap HIKE!** | Start the down. |
| **Play** | **Press anywhere and pull back** | **Aim.** Wherever your finger first touches is the anchor. Pulling down aims up the field, and pulling left aims right. A **reticle** appears where the ball would land, with an animated dashed arc from the QB's hand to it. |
| **Play** | **Release** | **Throw** to the reticle: the ball leaves at once and lands on a beat. Releasing where you can't throw (outside the middle-half band) cancels. |

**That's it.** There's nothing to move or steer.

- **The reticle is a free point, not a tile.** It shows two rings, a small one for a **perfect** catch and a larger one for an **ok** catch, and turns red where a throw isn't allowed. **Leading your receiver** is the skill: put the rings where it will be in two beats.
- **There's no perfect-timing throw bonus.** A throw resolves on the beat, but the rhythm is a shared timing layer, not a separate score mechanic.
- **Only the QB throws. There are no laterals.** Once a player catches the ball, it's on its own and has to run it home. You can't aim again until the QB has a ball.
- **The flight time is the drama.** While the ball is in the air, everyone hops for the landing point, and you hold your breath.
- **The pull sensitivity** is a tuning value (`tuning.aim`).

---

## A Screen

Each screen is one field-length climb, in two phases.

### The Grid

**A screen is a tile grid about the size of one *Crossy Road* screen:** roughly **9 columns wide and 15–16 rows tall** in portrait. Everything lives on it: your players, the defenders, hazard lanes and the QB.
- **The bottom few rows are your setup zone.** That's roughly 9 × 3, so a few dozen tiles to place players on, with the QB rooted in the middle of the bottom row.
- **The top row is the end zone.**
- **Every row in between is a strip:** open turf, a defender zone or a hazard lane.
- **Players and defenders hop tile to tile**, the way the chicken does in *Crossy Road*, and they **hop on the beat** (see *The Beat*).

### The Beat

**The whole game runs on the music**, like *Crypt of the NecroDancer*. Every hop and every hazard lands on a beat.

- **Everything hops on the beat.** Players, defenders, rolling pumpkins and boars all move one step per beat (or per two beats, for the slow ones). The screen bounces in time: the crowd claps and the jack-o'-lanterns pulse.
- **Hazards are beat patterns.** For example, a lane of pumpkins rolls every beat and a flytrap snaps shut every fourth beat. You learn a lane the way you learn a riff.
- **Every throw lands on a beat, 2 beats after the next one.** You can release any time. The ball **leaves the QB's hand the instant you let go**, and lands **on the beat 2 beats after the next beat**, however far it goes. Its flight speed varies a little, from just over 2 beats to just under 3, so the landing always hits the beat. (The sim takes the throw on the next beat; only the animation starts early.) One fixed rhythm makes every throw predictable, so **leading your receiver is counting**: "two hops from now, Pip will be *there*." The **Fast Throw** perk cuts this to **1 beat**, which leaves defenders almost no time to react.
- **Somebody has to catch it, and close is good enough.** When the ball comes down:
  - **The closest of your players within about a tile catches it**, rated by how close it is to where the ball landed:
    - **Perfect** (within about ⅓ of a tile): a **Clean Catch**. The receiver **fends off 1 defender** while it carries the ball (shown by a glowing outline).
    - **Good** (within about ¾ of a tile).
    - **Ok** (within about 1.15 tiles).
  - **Hands widens all three rings,** so good catchers are easier to hit.
  - **A defender right under the ball** (within about 0.6 of a tile) **and closer than your receiver intercepts it**, which is a **fumble**.
  - **Nobody close enough:** it's a miss, and that's also a **fumble**. There are no loose balls and no scrambles. A throw either connects or it costs you a ball.
  - The distances are tuning values (`tuning.catch`), and the game pops "PERFECT!", "GOOD!" or "OK".
- **Throws and Hijinks always happen on a beat.** Release or tap whenever you like, and the action fires on the **next beat** (a thrown ball starts flying at once, but lands on a beat). Nothing ever happens off the beat.
- **The beat never stops either.** There's one beat for the whole game, running in setup, in play and between screens. It starts when you tap **PLAY**, with the music (the beat *is* the music), and stops only when the music does: pausing freezes both. **HIKE!** doesn't start it; it just releases everyone. Before the snap, your players and most defenders stand still on the beat, while the **Bats ignore the snap entirely** and keep circling. After it, each unit moves on its own beats (Hustle 0 hops every other beat), so the first hop can come one beat or two after HIKE.
- **The music never stops.** One song plays continuously, through setup, play, touchdowns and new runs, with no break or restart. Setup is a breather in the *game*, not the music: patrols keep hopping on the beat while you place your squad, and after **HIKE!** your players hop on their own beats of the same song.
- **The tempo is the difficulty dial.** Each place has its own track and tempo, and the beat picks up as you climb. Boss screens get their own song.

**The soundtrack:** cheerful Halloween music with a strong, clear pulse: spooky surf rock, a swinging organ, monster-mash bop. Four loops so far, from friendliest to most intense: *Graveyard Shuffle* (swung monster-mash bop), *Spooky Surf* (the one the game plays now), *Midnight Chase* (driving) and *Skeleton Stomp* (the boss). They all share one tempo and loop length, so the game can crossfade between them at any moment, e.g. as the run gets harder.

### Reading the Beat: Visual Indicators

**Clarity comes first.** At any moment, a glance should tell you *when* the next beat is, *where* everything is about to go, and *where your ball will land*.

| What | How it's shown |
|---|---|
| **The beat itself** | The music, and everything on the field hopping and bouncing in time. There's no beat bar or timing meter. |
| **The grid** | A soft checkerboard on the turf, so every tile is obvious. |
| **Where a unit will hop next** | Every player and defender shows a **small arrow toward the tile it's about to hop to**. Fast units show a double-hop arrow. Models themselves **never turn: they always face the camera** (the one exception is the Witch, who faces the way she's flying). |
| **Throw range** | **Only the middle half of the field** (rows 4–11 of 16). The bottom quarter is too close to the QB, and the top quarter always has to be run. The rows outside the band are dimmed slightly, with faint chalk lines at its edges. The reticle can't be placed outside it. |
| **The reticle** | While you pull: a free point in your team's color, with a small *perfect* ring and a larger *ok* ring, and a dashed arc marching from the QB's hand to it. It turns red where you can't throw. |
| **Where the ball will land** | A landing ring with **2 countdown pips** (one per beat), plus the ball's shadow growing as it falls. |
| **Who has the ball** | The carrier holds a **bigger football up overhead**, and a **pulsing gold ring** sits on the ground around it. It has to be unmistakable at a glance. |
| **Is someone going to be there?** | *Not built yet (▲).* The reticle could light up when one of your players will be inside its rings in two beats, and go red if a defender will be closer. |
| **Hazards** | Every hazard warns **one beat ahead**: a lane flashes before something enters it, and a trap shows countdown pips before it snaps. |

**Readability rules:**
- **Teams are told apart by shape *and* color,** never by color alone: your team is gold and orange in football helmets, and the forest's defenders are candy purple with no helmets.
- **One beat of warning for everything.** Nothing on the field moves without telegraphing it first.
- **Indicators stay small.** They sit on the tiles, not over them. The voxel field stays the star.

### 1. Setup (the huddle)

> **Superseded (2026-10-18):** there's no free placement any more. A play card sets the formation and routes (see *The Core Loop*).


- The new screen is revealed, and **you can see everything** before you commit: every defender on its starting tile and every hazard lane.
- **Setup is a little puzzle.** You read the board and place your players to beat it. A defender's *kind* tells you what it'll do: a Chaser will come at your carrier, a Wall-er holds its row, a Picker circles a box of sky, guarding the passes under it. **Hazards keep cycling during setup**, so you can see the rhythm of a lane before you send someone into it.
- **Drag your players onto tiles of the setup zone.**
- **Where a player starts decides what it does.** Each one runs up its own **column**, doing the job its kind does. Walk-ons all run. Placement is how you aim them: at open lanes, or straight at a defender you want taken out.
- **Snappy defaults:** last screen's formation is pre-filled, so a quick look and a tap on **HIKE!** is enough.

### 2. Play

- Your players charge upfield. Defenders react, hazards cycle, and Blitzers go for the QB.
- You **pull back to aim** and **release to throw**, and then use **Hijinks** while the ball is in flight or being carried.
- **Touchdown:** a player carries the ball across the top edge. You get a short celebration (it can be skipped by tapping), the camera scrolls up, and it's time to **draft**.

A screen should take **roughly 15–40 seconds** of play, plus a few seconds of setup.

### What's in the Way

Two kinds of trouble fill each screen. **Neither of them ever has the ball.** All they want is to stop you.

**Defenders** are the forest's locals, who don't want a football team tramping through their woods. They **always wear candy purple and never wear helmets**, so they can't be mistaken for your team (see THEME.md, *The Opposition*). Each kind follows one simple rule, decided once per beat, and always shows its next hop with an arrow. *(▲ Draft spec, to confirm in play.)*

| Kind | Forest local | Each beat, it… | Threat |
|---|---|---|---|
| **Chaser** | Garden Gnome | Hops one tile toward your carrier. With no carrier, it hops toward the ball's landing tile while the ball is in flight, and otherwise toward your nearest player. | Tackling your carrier is a fumble. |
| **Blitzer** | Rhino Beetle | Hops straight toward the QB. | Reaching the QB while it still holds the ball is a **sack**, which is a fumble. |
| **Wall-er** | Scarecrow | Stays in its row and slides one tile sideways to stay in the column of the nearest player heading its way. | It blocks runners, and acts as a moving wall. |
| **Picker** | Bat | Flies a fixed 4×4 box circuit (clockwise around the box's edge, one tile per hop). It's **already circling during setup**, so you can time a throw past it, and it carries on from the same spot after HIKE. It never chases the ball. | It intercepts any pass that lands under it. |

Defenders avoid telegraphed hazards, but not perfectly, and **hazards hit them too**, so you can bait a Chaser into a pumpkin lane.

**Hazards** don't react to you. They're beat patterns, like the cars in *Crossy Road*: you learn their rhythm and time your throws and runs around them.

**The readability test for every hazard:** one big, simple voxel shape that reads from the steep camera at phone size, **one rule**, and **one telegraph** (an arrow, a shadow, a glow). No status effects: a hazard either hits you or it doesn't.

#### Haunted Forest hazards

| Hazard | Shape | Rule | Telegraph | When |
|---|---|---|---|---|
| **Rolling Pumpkin** | A big orange pumpkin. | **A ground lane.** A whole row is a pumpkin lane: one to three pumpkins roll along it, one tile per beat (or every 2 beats on a slow lane), each lane in one direction. Anything a pumpkin rolls into, or that hops into one, goes down. Pumpkins are **low**, so passes fly over them. | Each pumpkin shows an arrow to its next tile; an arrow at the lane's edge shows its direction. | **M2** |
| **Witch on a Broom** | A purple pointed hat on a broom, flying high. | **An air lane.** She flies across her row, **one tile per beat**, and never stops: she flies off one side of the field and the next sweep comes in from the other (in the rules she just wraps around). **Only passes are affected:** a pass crossing her row within about a tile of her gets **snatched**, which is a fumble. Runners on the ground pass under her. | She **faces the way she's flying**, left or right: the only model that turns. Her dark shadow on the row. *(Not built yet: a flash at the edge the beat before she enters.)* | **Built** (one Witch per screen, for now) |
| **Tombstone** | A grey slab. | **A static obstacle.** Nothing can enter its tile: a Walk-on stops behind it and waits. Passes fly over it. | None needed: it never moves. | M2 if time allows |
| **Drifting Ghost** | A plain white sheet with two eye holes. | **A slow, tall lane** (a tile every 2 beats). It knocks down players and defenders, and because it's tall it **blocks passes** through its tile: the slow, tall counterpart to the pumpkin. | An arrow shows its next tile. | Later |

**Hazard rules:**
- **Pure beat patterns.** What a hazard does is set by the beat number alone, so the same screen always plays the same way.
- **Learn it before HIKE.** During setup, hazards and patrols loop through their cycle on the music's beat. At **HIKE!** they carry on exactly where they were, so what you saw is what you get.
- **One beat of warning, always.** Nothing moves without telegraphing it first, so losing a player feels fair and funny, not cheap.
- **They hit everyone.** A hit is a normal hit (a Heft 0 Walk-on goes down), for your players and for defenders. A carrier that gets hit drops the ball, which is a fumble.
- **Upfield only.** Hazards never appear in the setup rows or the end zone, and never reach the QB.
- **▲ Pumpkins wrap around:** one rolling off one edge comes back in at the other, so a lane's whole pattern is always visible.
- **▲ Who walks into them depends on the kind:**
  - **Walk-ons are dumb** and hop straight in.
  - **Chasers and Blitzers are reckless** and charge through, so you can bait them into a lane.
  - **Wall-ers and Pickers are careful** and wait a beat rather than step into a hazard.
- **Setup becomes a timing puzzle.** Walk-ons hop every 2 beats, so a player's starting row and column decide exactly when and where it reaches each lane.

**Later places** bring their own hazards (a graveyard's runaway coffins, for example), designed to the same readability test.

**Hazards and difficulty:** early screens have one slow pumpkin lane. Later screens add faster lanes, more pumpkins, the witch over the passing lanes, and hazards combined with defenders (say, a Wall-er just behind a pumpkin lane).

**Screens are built from horizontal strips**, much as *Crossy Road* builds its road: open turf, defender zones and hazard lanes stacked on top of each other. Mixing up those strips is how screens get both variety and difficulty.

### Balls Are Lives

> **Superseded (2026-10-18):** there are no lives. Losing a drive (an interception or a failed 4th down) ends the run. A tackle just ends the down.


**The QB starts the run with a pile of N jack-o'-lantern footballs**, stacked right beside it at the bottom of the screen. **The pile is your life counter.** There's no separate display; you can just *see* how many you have left.

- **The count carries over for the whole run.** It never resets between screens.
- **A fumble loses the ball in play for good.** The defense runs off with it, or it gets smashed. Fumbles happen when a Blitzer sacks the QB, a throw lands on an empty tile, a defender catches a throw, or a carrier gets tackled or flattened by a hazard.
- **Then the whole screen resets.** It's back to setup with the next ball: every Walk-on returns to its place, the defenders go back to their starting tiles, and you get to re-plan. Recruits who went down stay gone. *(Continuing mid-screen left Walk-ons too far upfield to throw to, and the run just drained away.)*
- Each fumble comes with a slow-motion beat, the crowd chanting *"FEE! FI! FO! FUMBLE!"*, and a gasp as the pile shrinks.
- **When the last ball is gone, the run is over.**
- **More balls are a draft reward**, and a rare, valuable one. Because lives carry over, every extra ball is a real lifeline.

### Sacks

> **Superseded in part (2026-10-18):** a sack now **uses the down and loses 2 yards**; it isn't a fumble. Blitzers are the pass rush, which gives you about 4–6 beats to throw.


- **Any defender that reaches the QB sacks it, on the beat it gets there.** "Reaches" means it's up (not knocked down) on a tile touching the QB (left, right or in front) while the QB still holds the ball. **SACKED!** is a fumble. There's no counter and no waiting: the hop arrow pointing at the QB is the whole warning.
- **Blitzers are the ones that come for it.** They head straight for the QB, so a Blitzer's approach is your clock: a Blitzer 3 tiles away with Hustle 0 gives you 6 beats to throw. Other defenders only sack the QB if their own rule happens to bring them next to it.
- **Once the ball is thrown, the QB is safe.** Only a QB that's still holding the ball can be sacked.
- **Nothing stands between the QB and a Blitzer except players in its path.** A Walk-on that runs into a Blitzer trades itself for it (see *Collisions*), so a Walk-on in the right column can take one out before it arrives.

So every possession is a few seconds of "throw it, THROW IT," against a receiver who isn't quite open yet.

---

## The Team: Walk-ons and Recruits

> **Superseded (2026-10-18):** players come from play cards. Special players (a Bat receiver, a Skeleton) exist only on the card that brings them, and nothing carries over between drives.


### Walk-ons

- **Every run starts with the same squad of Walk-ons:** vanilla football players in the team's gold helmets and orange jerseys, with **Hustle 0, Hands 0, Heft 0** and one simple job: run up their column.
- **Walk-ons always come back.** A Walk-on that goes down is out for the rest of that screen, but it's back for the next one. **You never drop to zero.**
- **Walk-on upgrades** are draft cards that improve **every** Walk-on for the rest of the run: +Hustle, +Hands, +Heft, or a new trick for all of them.

### Recruits

- **A recruit replaces one of your Walk-ons.** Recruits are the haunted forest's creatures who join up and **put on the team helmet**: a Bat, a Skeleton, a Pumpkin-head, a Werewolf, a Mummy (see THEME.md for the full list). Each one has a sharper job and better stats.
- **Recruits don't come back.** If a recruit goes down, it's gone for good, and **its slot goes back to a Walk-on** at the next screen. It gets a tiny tombstone, a little ghost that waves goodbye, and an "awww" from the crowd.
- That's the risk and reward of the team: **recruits are what make a run strong, and losing them is what makes a run fall apart**, while the Walk-ons are a safety net that never runs out.

### On the field

- **Players run themselves**, starting from the tile you put them on. Each kind has a single, obvious job you can read from its silhouette.
- **Players never block each other.** They can share a tile and hop past one another, so a carrier is never stuck behind a teammate.
- **Walk-ons are dumb.** A Walk-on hops straight up its column on every hop beat, **even into a defender or a hazard**. Keeping it alive is *your* job: place it in a clear column, or throw it the ball before it gets there. Smarter footwork (sidestepping, waiting) is something recruits and Walk-on upgrades can add.
- **Collisions:** when one of your players and a defender run into each other, **the defender wins**. A tackled carrier drops the ball, which is a fumble.
  - **Walk-ons trade.** A Walk-on **without the ball** that runs into a defender goes down, but **takes the defender down with it**. That opens up a strategy: **stack Walk-ons in a column**, so the first clears the way for the ones behind. A Walk-on carrying the ball doesn't trade: it's simply tackled.
  - **The exception is "fends off".** Some players (recruits, upgraded Walk-ons, or any receiver after a Clean Catch) can **fend off N defenders**. Each fend-off knocks the defender down instead and uses up one charge. It's the main property that makes recruits and upgrades feel strong.
- **Getting hit:** a hit is losing a collision, or being struck by a hazard or a boss. **Heft decides what a hit does.** At Heft 0 (every Walk-on), the first hit takes a player down. What higher Heft buys (knockdowns instead, absorbing hits) is still *TBD*.
- **Knocked down** (for players with enough Heft): the player bursts into voxel bits, pops back together after a beat or two, and keeps going.
- **Wipeout:** if every one of your players on the field is down, you **lose a ball**, and the screen restarts from setup with the Walk-ons back. Recruits who went down stay gone.

The team has **5 slots** to start with, with "+1 slot" as a rare draft card. Every run starts with **3 balls** on the pile.

---

## The Draft: Trick or Treat

> **Superseded (2026-10-18):** the draft is now **one of three play cards, or remove a card**, after every won drive. The deck is the only progression.


After every touchdown, you go trick-or-treating: choose **one of three cards**. It's one tap and then straight into the next screen.

**The cards come from the place you're playing through.** The haunted forest offers its creatures as recruits, plus Walk-on upgrades, perks and Hijinks. Later places (the graveyard, the swamp) bring their own.

▲ *Decision:* most cards are **Treats** (pure upgrades). Occasionally a **Trick** shows up instead: a strong card with a funny downside, e.g. "+2 Hustle for everyone, but the ball is on fire."

The three cards are always **one recruit, one Walk-on upgrade and one other card**, so every draft offers a clear choice: a new star, a stronger base squad, or something else.

| Card type | Examples |
|---|---|
| **Recruits** | A haunted-forest creature in a team helmet. It replaces a Walk-on, and if it goes down it's gone. |
| **Walk-on upgrades** | +Hustle, +Hands or +Heft for *every* Walk-on, or a new trick for all of them. |
| **Recruit upgrades** | Promote one recruit to a veteran version. |
| **QB perks** | The QB has no stats, so it gets stronger through perks, e.g. **Long Arm** (bigger throwing range). |
| **+1 slot** | One more Walk-on on the team. It's rare. |
| **Hijinks** | Unlock a new Hijink, or power up one you already have. |
| **Fast Throw** | Throws land in 1 beat instead of 2. |
| **Extra balls** | +1 ball on the pile. It's rare and precious. |
| **Perks** | Passive quirks with punny names, e.g. **Butterfingers Insurance** (the first fumble of each screen is free) or **Second String** (a recruit who goes down sometimes comes back). |

Card names and art should be jokes. The draft is part of the comedy, not a spreadsheet.

---

## Hype and Hijinks

> **Superseded (2026-10-18):** trick plays are play cards; there's no Hype meter or Hijink slots.


*(Hijinks may be renamed **Trick Plays**: see THEME.md.)*

- **You start a run with no Hijinks** and unlock them through the draft, many of them brought by recruits.
- **Hijinks only work after the throw.** While the QB holds the ball, its hands are full. Once the ball is in the air (or in a carrier's hands), the Hijink icons wake up. This keeps the flow clear: **aim, throw, then wreak havoc**.
- **Hijinks aim at the landing point by default,** which is where the action usually is. *(▲ How to re-aim a targeted Hijink after the throw is still open: perhaps the same pull gesture.)*
- **There are two kinds of Hijink:**
  - **Targeted** ones hit at the reticle, e.g. *Root Awakening* snares a patch around it, and a Witch's *Hex* freezes the defenders there.
  - **Global** ones affect the whole field, e.g. *Fog of War*, or the Ghost's *Spook Through*, which lets everyone slip past defenders for a beat. The reticle doesn't matter for these.
  - Each icon shows which kind it is: targeted icons have a little crosshair.
- **Hype** is a crowd meter that fills when exciting things happen: long throws, diving catches, Clean Catches and touchdowns. A fumble *drains* it. Each Hijink costs Hype, so a full meter means you can afford something.
- **▲ Decision:** Recommendation: **at most three Hijink slots**, along the bottom of the screen. When you draft a fourth, it replaces one you already have.
- **Hijinks fire on the next beat, like throws.**

---

## Difficulty and Pacing

> **Superseded in part (2026-10-18):** a run is themed areas of four drives (Intro, Challenge, Gimmick, Boss). Difficulty comes from the defenses, the Gimmick and the Boss.


- **Defenders get tougher as you climb:** more of them, smarter, faster and heavier.
- **Hazards get busier:** more lanes, faster patterns, and traps combined with lanes.
- **The run moves through haunted places:** the forest first, then later the graveyard, the swamp and more. Each brings its own defenders, hazards and song.
- **▲ Boss screens:** every so often, a **giant forest boss** stands rooted somewhere up the field (a towering treant, a headless horseman). It swats players and plucks passes out of the air. You have to get around it, or Hijink it.
- **Target run length:** an early wipe-out in about 2 minutes, a good run in about 10, and a legendary run in 20 or more.

---

## Score and Meta

- **Score = distance.** Each screen is worth **10 yards**. "Best: 340 yards" shows on the main screen, as in *Crossy Road*.
- **Light meta progression**, collected rather than grinded:
  - New **recruits** joining the draft pool.
  - New **Hijinks** and perks.
  - Team **looks**: helmet and jersey colors, and the team name.
  - New **places** to play through.
- Nothing pay-to-win. Meta unlocks give you **variety, not power**.

---

## How the Attributes Show Up

**Every player and every defender has Hustle, Hands and Heft.** They're **whole numbers starting at 0**. What a stat *means* can depend on the kind of unit, but **0 is always the plain baseline**, and every point above it is an upgrade.

**The QB has no stats.** It has a fixed throwing range and a fixed 2-beat throw, and gets stronger only through perks (Long Arm, Fast Throw…).

Players see the stats as **pips on cards and on the setup screen**. Everything else they learn by feel.

**Walk-ons are 0 / 0 / 0.**

| Attribute | For players, at **0** | For players, at 1+ | For defenders |
|---|---|---|---|
| **Hustle** | Hops **every 2 beats**. | *TBD.* Faster hopping, up to the fastest recruits covering two tiles per beat. | Hop the same way. |
| **Hands** | Catches on **its own tile, or 1 tile ahead**. | *TBD.* More catch reach, e.g. diagonal lunges. | *TBD* (perhaps interception reach). |
| **Heft** | **Goes down on the first hit.** | *TBD.* Surviving hits, e.g. a knockdown instead. | *TBD*. |

**Fends off** is separate from all three: it's a property that lets a unit beat N defenders in collisions. Heft is about *surviving* a hit, and fends off is about *winning* one.

▲ *The meaning of 1+ for each stat, and the defenders' values, get decided during M2 tuning.*

---

## Feel and Juice

This is a pillar-level priority, not polish to add at the end.

- **Voxel destruction:** players burst into chunky cubes and click back together.
- **Hit-pause** on big impacts, and **screen shake** on fumbles and Hijinks.
- **Squash and stretch** on everything.
- **Every player makes a noise:** grunts, squeaks, rattles, howls.
- **Haptics** on throws, catches, impacts and fumbles, plus a light tick **on the beat**, so you can feel the rhythm with the sound off.
- **Everything bounces in time:** the field, the crowd, the players waiting in the setup zone, the QB's foot tapping.
- **The chant** on every fumble. **The tombstone** for every recruit who goes down.

---

## Scope: "Small" Game

**First playable** (the smallest version that proves the fun):
- The **Haunted Forest**, with Walk-ons, two kinds of recruit, and the four Forest defenders.
- Two hazard types (one lane, one timed trap).
- The setup grid, one looping track with everything on the beat, pull-to-aim throwing with catch slop (throws quantized to the beat), Blitzers and instant sacks, Walk-on trades, a pile of balls as lives, permadeath for recruits.
- A draft with **recruit** and **Walk-on upgrade** cards only.
- Endless screens with a simple difficulty ramp, and a score.

**Then:** Hijinks and Hype, perks, more recruits, boss screens, a second place.

**Later:** team looks and names, daily runs with a shared seed.

---

## Future Ideas

Designs we tried or considered and set aside. They aren't in the game, but they're worth remembering.

### The Pocket and Blockers

*Removed during M1.3. A possible future mechanic, perhaps as a recruit or perk.*

- **The pocket:** a single tile directly in front of the QB, the only route to it.
- **The Blocker:** the one player placed in the pocket stays home instead of running. It carries a **hold counter**, shown as a badge.
- **Engaging:** Blitzers head for the pocket. When one runs into the Blocker, it stops and attacks on its rhythm, ticking the hold counter down. Several Blitzers drain it faster.
- **At 0, the Blocker is beaten** (a Walk-on goes down), and the Blitzer steps into the pocket and starts on the QB's counter. Blockers only buy time.
- **The puzzle it created:** a Blocker is a runner you don't have.
- **Why it was set aside:** it added a role and a counter to learn, and it played less directly than Walk-ons trading themselves to take Blitzers out.

### The Giant Quarterback

*The original premise: you were the **Big**, a hulking monster quarterback, and your team was tiny creatures (the **Smalls**). Each Big brought a homeland theme (the Graveyard, the Woodfolk, the Mountain) with its own ball and recruits. It was replaced by a football team in a haunted forest, but the comedy of scale might return, e.g. as a boss.*

---

## Open Questions

- **Who is the quarterback?** A Walk-on in the backfield, or a special player that's always there? Could a recruit ever play QB?
- **What makes runs different from each other** now that there's no Big to choose? Perhaps a starting recruit, a coach with a perk, or the team's look.
- **Should playing with the sound off be supported?** Plenty of phone games are played on mute. The beat is also visible (bouncing) and felt (haptic ticks), but is that enough?
- **How much beat guidance should the UI provide?** The rhythm should stay readable without turning the whole game into a timing challenge.
- **Should the "someone will be there" target-ring hint stay forever?** It makes throws very readable, but it might make them *too* easy. It could become an early-game crutch or a perk instead.
- **Is the setup zone a fixed size?** Opening up more rows could be an upgrade, letting you start players further up the field.
- **A Toss Hijink?** The QB grabs a player and flings it to a spot.
- **Should the ball ever get rules?** The jack-o'-lantern football is cosmetic for now. Later, ball variants could be draft cards or perks, e.g. a skull ball that bites defenders.
