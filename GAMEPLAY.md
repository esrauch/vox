# Get Jack Back: Gameplay

**Arcade Halloween Football.** Simple arcade mechanics, a clear monster theme, and a game that lives or dies by its UX and a hundred tiny optimizations.

This doc covers what the player *does*: the pillars, the run, a down, the controls, your team and the defense, and how a run builds up. It builds on [THEME.md](THEME.md). Exact numbers live in `src/arcade/content/` (`tuning.ts` and friends).

Items marked **▲** are recommendations or details still open to change. Every number is a starting value, to tune by playtesting and by the headless balance runs (TECHNICAL.md).

**Words used here:**
- **Area:** a themed place (the Haunted Forest first). Each area is four drives.
- **Drive:** four downs to gain 10 yards. **Down:** one play, a few seconds long.
- **Line of scrimmage:** where the current down starts. **First-down line:** 10 yards past where the drive started.
- **Your team:** **eight on the field**: the QB plus seven players, each a **Blocker**, a **Runner** or a **Catcher**. *The QB is the pumpkin ball itself, **Jack**: there's no QB player on the field, Jack throws himself (THEME.md, The ball).*
- **Carrier:** whoever has the ball after a catch or a handoff. It runs on its own.
- **Heft, Hustle, Hands:** your players' (and defenders') three stats. They're physics, not dice: weight, speed and reach.

---

## The Game in One Breath

Tap PLAY and you're on the field. **Pick one of three play cards** and the ball is snapped: your Blockers shove the pass rush, your Catchers break for open grass, and an **aim line sweeps** back and forth from the QB. **Tap THROW** as it crosses an open receiver and a bullet zips out. Once someone has the ball it charges upfield on its own, and every time a gnome or an owl grabs it, **Break it!**: one well-timed tap shakes them off. See how far you get before they bury you. Four downs to make 10 yards. Make it and it's **TRICK OR TREAT!**: pick one of two new players (a Ghost, a Golem, a Werewolf, a keen Human) and it goes straight into your lineup. Miss on 4th down and the run is over. You start as a team of plain, weak humans against a sleepy defense; by the third area you're a pack of monsters against the whole forest.

---

## Design Pillars

1. **Playing in five seconds.** From opening the game to the first snap is one tap. No draft, no team setup, no tutorial wall. Everything you need to know, you learn by doing it once.
2. **Arcade, not simulation.** One skill: **timing**. Pick a play, tap THROW as the sweeping line crosses an open receiver, tap again to break a tackle. No aiming, no steering. Everything else (blocking, routes, running, the defense) happens on its own, at speed.
3. **Impact.** Every play ends in something physical: a crunching tackle, a pancake block, a bounced pass, a carrier dragging a gnome for five yards. If a moment doesn't *hit*, it's not done.
4. **Readable at a glance.** Who's on your team, what role each player has, who's open and who's about to hit you, in under a second, on a phone. Kinds read from their shapes; the stats are things you *see* happen, never numbers you have to read on the field.
5. **Start weak, build up.** Like *Slay the Spire*, *Dungeon Clawler* or *Balatro*: limited resources and very easy opponents at first, then your team grows and the forest fights back harder.
6. **The UX is the game.** Snappy restarts, instant feedback, no dead time between downs, and the tiny details (how the ball leaves the hand, how a tackle lands, how fast the next down lines up) get as much care as the rules.
7. **Every run tells a story.** "My Golem dragged three gnomes into the end zone." Losing is funny, and the next run is one tap away.

The test for any feature: **does it make a run faster, funnier, more readable, or more "one more go"?** If not, cut it.

---

## The Run: Areas of Four Drives

- **A run is a series of themed areas** (the Haunted Forest first). **Each area is four drives**, *Balatro*-style: **Intro**, **Challenge**, **Gimmick** (a twist) and **Boss**. **Every run is the same twelve drives:**

  | | Intro | Challenge | Gimmick | Boss |
  |---|---|---|---|---|
  | **The Forest** | A Quiet Clearing | Gnome Country | Bat Cave | Mister Frog's Pond |
  | **The Candy Kingdom** | Gumdrop Lane | Gingerbread Row | Broomstick Alley | The Queen's Court |
  | **The Farm** | The Back Forty | The Cornrows | A Murder of Crows | The King's Patch |
- **The main game is three areas: 12 drives and three Bosses**, on the way to Jack's pumpkin patch (THEME.md). **Each Boss has one gimmick that attacks one thing you do, and the first two leave a special perk behind:**

  | Area | Boss | Gimmick | Attacks |
  |---|---|---|---|
  | **The Forest** | **Mister Frog** (top hat) | **Frog Rain:** before the snap a lane lights up on the turf, in from one sideline 40% of the way across. A moment into the down (1.2 s) its shadows fill in and **the frogs all come down at once**, a shower over the whole lane: a carrier in it is tackled there (**FROGGED!**), anyone else in it is flattened for a moment. Once a down. You see the lane while choosing a card, so you pick a play, or **Flip** it, to keep your routes out. | Where your routes go |
  | **The Candy Kingdom** | **The Queen** (a witch, double size, in a crown) | **The Hex pulses:** from the snap it's clear for a second, then on for a second and a half, over and over, and her crown glows purple while it's on. While it's on the aim line shrinks to a short stub by the pumpkin and receivers stop lighting up (the sweep still runs at full speed); when it fades, everything shows again. Learn her rhythm and throw in the clear, or throw blind. | Your timing |
  | **The Farm** | **The King** (a giant scarecrow in a crown) *(beating his drive gets Jack home: the end)* | **SHOO!** Two crows sit on his arms. Half a second after the snap they swoop at whoever has the ball (while a pass is in the air, at where it's going), at half a bullet's speed. When they land on the holder a big **SHOO!** button pops up, with no freeze: tap it within about half a second and they're gone for the down; too late and they knock the holder down (a sack if Jack still has it, a tackle if a carrier does). If the ball leaves the holder first they miss, so **a quick deep pass leaves them behind**. Once a play. The King himself is only a prop: he stands guard, still, just past the first-down line in front of the pumpkin patch. | Your nerve: hold the ball and they come for it |

- **Boss perks:** beating a Boss gives its special perk, on top of that drive's TRICK OR TREAT!. They're the only perks there are.

  | Boss | Perk |
  |---|---|
  | **Mister Frog** | **Hot Arm:** the ball flies twice as fast. |
  | **The Queen** | **Gift of Foresight:** a receiver's ring turns orange when a throw right now *would* be caught, looking ahead along the bullet's flight as everyone keeps moving. ▲ *An approximation (each body carried along its current velocity for the flight) is cheap enough to run every frame.* |

- **The story is two tiny cutscenes:** at the start, Jack asks a football team to help him get home to his patch; at the end, in the patch, your team and every defender you played through (Bosses included) dance.

  ▲ *Until the Farm is built, the Forest comes round again as the third area.*
- **The four drives are one continuous march up the field**, with no break between them: the camera follows the play up to the next defense, TRICK OR TREAT! takes a moment, and play carries on. The Boss drive goes for the end zone: a **TOUCHDOWN!** and a Boss perk (or, the third time, Jack is home).
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

**Every input is timing, never aiming.** Pick a play, then one tap at the right moment, then one more when you're grabbed.

1. **Call a play: three cards, drawn at random** from the playbook. **Tap a card** and its routes are drawn on the field (tap another to switch); **Flip** mirrors it toward the other side (the defenses are lopsided). Then **HIKE!** starts the play.

   | Play | What happens |
   |---|---|
   | **Slants** | The outside Catchers cut inside, then go straight upfield; the slot goes deep; one Runner checks down up the middle, the other leaks out to the flat and turns upfield along the sideline. |
   | **Deep Shot** | All three Catchers go long; both Runners slip out past the line as short check-downs. |
   | **Curl & Flat** | The Catchers run out and curl back at an angle toward the middle, and wait there; the Runners swing out to the flats, then turn upfield. |
   | **Dive** *(handoff)* | A Runner takes it straight up the middle, the other leading through the hole; the Catchers run off, dragging their Covers away. |
   | **Sweep** *(handoff)* | A Runner takes it wide toward the sideline and turns upfield behind the other Runner; the Catchers run short decoy routes. |

   **Every Runner gets out past the line of scrimmage** (only the Blockers stay home), and no route runs deeper than a throw can reach. A curl can end coming back. **Choosing a handoff card is choosing to run.**

   **Runs are the safe call, passes the gamble.** A handoff is almost always a couple of yards; a pass is less likely to work but worth more when it does. On a run only the Blockers and the other Runner block; **the Catchers keep running their routes as decoys**, pulling their Covers away (after a catch, everyone blocks for the carrier). What makes a run safe is **the play fake**: for about a second after the handoff, the defense keeps playing the pass (except anyone right next to the carrier). The yards after the grab still come from Break it!: an OK one drags the pile forward, a GREAT one can break it long, a BAD one goes down where it stands. *(Balance runs, 2026-10-22, with a bot that gets BAD about one time in ten: runs average 4.1 yards and gain nothing 5% of the time; a good passer averages 5.4 a pass, with 25% gaining nothing.)*
2. **The sweep.** On a pass play an **aim line sweeps from the QB**, sideline to sideline and back, like a lighthouse beam. **The line stops at the first thing a bullet thrown right now would meet:** a receiver who'd catch it (its ring lights up gold) or a defender who'd bat it down. It's judged with everyone where they stand, not where they'll be when the ball arrives, so a receiver running across the field can still be gone by then. It sweeps faster in later areas.
3. **One button:**
   - **THROW** fires a **bullet** along the line: fast and flat. The **first one of your players it reaches** catches it (anyone within a few yards of the QB is skipped). If a defender gets to it first, it's **batted down**. If nobody's in the way, it's **incomplete**.
4. **The pocket holds for three sweeps.** If the QB still has the ball when the line finishes its third pass across, the pocket collapses: **SACKED!** A faster sweep means a quicker pocket.
5. **After the catch, the carrier runs on its own:** it charges upfield and drifts toward the emptiest lane by itself. There's no steering: your skill goes into the tackles.
6. **Break it!** (below) every time someone grabs the carrier.
7. **The down ends with a tackle, a dead ball, a sack, or the line.**

### Break it! *(the tackle mini-games)*

**When a defender grabs the carrier, the play freezes** for one of three quick tests, picked at random. **Each opens with a two-second countdown** ("GET READY TO MASH! 2… 1…"), when taps don't count, then the call ("MASH!"). Each ends the same three ways, called out big in the middle of the screen: **GREAT!** (a break: the tackler goes flying and the carrier keeps running), **OK** (a drag: the carrier hauls the tackler a few more yards, then goes down), or **BAD** (tackled).

| Test | You see | You do | Sized by |
|---|---|---|---|
| **The bar** | A marker crossing a bar, left to right or right to left, with a green sweet spot (never in the first third of its trip) and a yellow "close" band | Tap in the green to break, in the yellow to drag | **Heft**: a wider sweet spot |
| **MASH!** | A bar that fills as you tap | Tap as fast as you can for a second: fill it to break, half fill it to drag | **Heft**: more per tap |
| **JUKE!** | Two big buttons, ◀ and ▶, from the start of the countdown; when it ends, the one to press lights up | Press it: quickly to break, a beat later to drag. The wrong one is a tackle | **Hustle**: a longer window |

- **A GREAT really breaks free:** the rest of the pile right beside the carrier is knocked back too, and for a moment (0.6 s) nobody can grab it, so it gets clear instead of being grabbed again on the spot. **A grab that follows hard on another** (within 2 seconds) gets a short countdown (half a second), so a pile-up never stalls the game.
- **Every extra tackler already on it** makes the test harder: a narrower sweet spot, less per tap, a shorter window. A pile is hard to escape.
- **More Heft also means more yards on a drag.**

### Catching

- **A catch is reach.** The bullet is caught by the first of your players whose reach it passes through, and **Hands is reach**: better Hands catch a bullet that would have gone by.
- **A contested ball:** if a defender can reach it at the same moment, the one with **more Hands** wins it; if it's the defender, it's batted down (no interceptions). Ties go to you.
- **It goes past the scrum:** your Blockers never touch the ball (linemen aren't eligible), and a Rhino Beetle locked up with one of your players can't get a hand to it.
- **Throwing lanes matter:** a bullet passes every defender between the QB and the receiver, and any of them that can reach it bats it down. **A Scarecrow's wide ring blocks a whole lane.** So the timing is: when the line is over an open receiver *and* the lane to it is clear.

---

## Controls

| When | Gesture | What it does |
|---|---|---|
| **Before the snap** | **Tap Flip** (once a play is called) | Mirror the play. |
| **Before the snap** | **Tap a card** | Call that play: its routes show on the field. Tap another to switch. |
| **Before the snap** | **HIKE!** | Start the called play. |
| **Pass play** | **THROW** | Fire a bullet along the sweeping line. |
| **Grabbed** | **Tap** anywhere (a juke: its ◀ or ▶ button) | Break it! |
| **The King's crows land** | **SHOO!** | Drive them off. |
| **Between drives** | **Tap a card** | Take one of the two new players. |
| **Between drives** | **Tap two players** | Swap them, field or bench. |

**One thumb, portrait, no aiming.** Everything is a tap at the right moment.

---

## Your Team

**Eight on the field: the QB plus seven players**, every one on the field every down, each playing one of three positions:

| Position | How many | Does | Main stat |
|---|---|---|---|
| **Blocker** | 2 | Holds off the rush, shoves defenders out of the carrier's way | **Heft** |
| **Runner** | 2 | Takes handoffs; on a pass, runs a short route past the line | **Hustle** |
| **Catcher** | 3 | Gets open, catches | **Hands** |

▲ *Up to eight defenders against them.*

**The camera sits behind and above the QB**, lower than a top-down view: a third-person look down the field, like standing just behind your own line, always wide enough for both sidelines. It follows the play upfield. Every kind has to read from there at phone size.

**The stats are physics, never dice.** Everything that matters, you can see happen:

| Stat | What it is | You see it when… |
|---|---|---|
| **Heft** | **Weight.** In any shove, the heavier one pushes the lighter one back; and in **Break it!**, the bigger your Heft over the tackler, the wider the sweet spot and the longer the drag. | A Blocker pancakes a beetle; a Golem carrier shrugs off a gnome. |
| **Hustle** | **Speed.** | A Runner pulls away from the pack; a Catcher gets a step on its Cover. |
| **Hands** | **Reach.** A bullet passing near snaps into the hands from further away, and a contested ball goes to the better Hands. | A Catcher plucks a bullet that was going by. |

- **The scale: 50 is ordinary.** An ordinary player is **50 / 50 / 50**, and **every 10 points is one step** (one step more Heft is a quarter heavier; one step more Hustle is a little faster). The fine scale is there so small bonuses can be tuned. Every human is 50 / 50 / 50 whatever position it plays: only its kind and perks move the numbers.
- **Every kind is a trade, and humans are all-rounders.** A kind pushes one stat up two steps (++, +20), pulls one down two steps (--, −20) and leaves one alone, so every kind has the same total and none is simply better:

  | Kind | Hands | Hustle | Heft | Suits |
  | --- | --- | --- | --- | --- |
  | **Human** | = | = | = | anywhere |
  | **Ghost** | ++ | = | -- | Catcher |
  | **Golem** | = | -- | ++ | Blocker |
  | **Werewolf** | -- | ++ | = | Runner |

  **The kind is a shape, not a total:** a recruit's stats add up to its zone's total (200, 250, 300; TRICK OR TREAT!), shared out in its kind's shape and nudged a little, so no two are alike (your starting seven are the plain 50s). **A new kind should follow the same rule:** one stat up, one down, a total of 150 for its shape, and a position it suits.
- **Everyone starts human and plain.** A fresh team is a bit slow, a bit light, a bit clumsy: good enough for the sleepy first drive, not for the Boss.
- **Any player can play any position** (2 Blocker slots, 2 Runner slots, 3 Catcher slots). The plays only ever talk to the slots, so the team always lines up 2 / 2 / 3; who you put where is up to you, and their stats decide how well it works. A Golem in a Catcher slot is a slow Catcher nobody can tackle.
- **The numbers live on the roster screen** (between drives). On the field, the stats only show through what happens.

---

## Building Up: TRICK OR TREAT!

**After every won drive: TRICK OR TREAT!** Two **New Player!** cards are offered; take one, set your lineup, and tap **Done**. **On the same screen is your roster: the seven on the field down the left, by position, and the bench down the right. Tap any two players to swap them, field or bench.** Every player has a photo box: a pixel portrait of its kind. **There's no draft before the first drive**: you start with what you've got.

### The offer

**Two new players, never of the same kind, and you take one:** there's no skipping (a new player can always sit on the bench). Each card is the player itself, drawn like a roster card: its photo, name and kind, its **Heft / Hustle / Hands** bars, and its **preferred position** (the one its best stat suits: Heft → Blocker, Hustle → Runner, Hands → Catcher).

**A new player's stats add up to the zone's total:** **200** in the Forest, **250** in the Candy Kingdom, **300** on the Farm, shared out in its kind's shape (a Ghost mostly Hands, a Golem mostly Heft, a Human evenly) and nudged a little, so no two are alike. The zone is the one of the drive about to be played, so the offer after the Forest's Boss is already the Candy Kingdom's.

**Take one and it goes straight in:** into the field slot whose player it beats by the most total stats (on a tie, a slot of the position it prefers), and whoever was there sits on the bench. If it beats nobody, it sits on the bench itself. Then the roster stays open to rearrange (any two swap), and **Done** plays on. Only the seven on the field play.

**The bench has no limit:** the newest sit at the top, and a full run ends with eleven players on it (one for each TRICK OR TREAT!).

> **Howlin' Hal** · Werewolf · *prefers Runner*
> Heft 65 · Hands 40 · Hustle 95 *(a Forest recruit: 200 in all)*

---

## The Defense

**The forest's locals, always in candy purple, never in helmets** (THEME.md). Each kind has **one job**, readable from its shape:

| Defender | Creature | Job |
|---|---|---|
| **Rusher** | Rhino Beetle | Charges the QB. Your Blockers have to out-shove it. |
| **Cover** | Garden Gnome | Shadows a Catcher; after the catch, chases the carrier. Small, quick, light: easy to shove, hard to shake. |
| **Zone** | Scarecrow | Planted: its long arms reach a **wide purple ring** on the turf, and any low ball coming down inside it is contested: its Hands beat a plain Catcher's, so it's a patch of field to throw away from (a Catcher with great Hands, like a Ghost, can still win it). Running into one stops you dead. |
| **Safety** | Owl | Hangs deep, between the ball and the first-down line, and comes down to meet the carrier. *(In the Candy Kingdom the Safety is a Witch.)* |
| **Bat** | Bat | Guards its patch of air: it loops a square and swats passes that fly through it, and dives at a carrier that comes within 3 yards (back to its loop if the carrier gets away). |
| **Frog** *(new)* | Frog | Covers like a Gnome until the carrier gets close, then crouches (the telegraph) and leaps onto it. |
| **Gingerbread Man** *(Candy Kingdom)* | Gingerbread Man | The Candy Kingdom's Cover: the same rule, a new look. |
| **Crow** *(Farm)* | Crow | Like a Bat, it swats passes that fly through it; it flies a lane up and down the field (8 yards) instead of looping a square. |

- **Each area has its own set:** the Forest adds Frogs; the Candy Kingdom swaps the Owl for Witches and adds Gingerbread Men; the Farm adds Crows and rows of Scarecrows, and its props are pumpkins and hay bales. Older kinds keep their rules wherever they appear.
- **The Bosses aren't defenders:** each stands in the middle of its drive's end zone, just past the first-down line, drawn twice a player's size, and never moves, tackles or defends (a prop). Its ability is the whole fight. Mister Frog is a Frog in a top hat, the Queen a Witch in a crown, the King a Scarecrow in a crown.
- **Props on the field:** two or three to every 10 yards, from the area's own set (the Forest: trees, stumps and toadstools; the Candy Kingdom: gumdrops, lollipops and candy canes). They're solid: everyone, yours and theirs, has to go around them, and carriers pick lanes clear of them. The ball flies over them. They never stand in the middle lane (the pumpkin's, and the handoffs'), never against a sideline, and always leave room to pass between.
- **Hazards** stay simple patterns, like *Crossy Road*'s cars: the **Witch on a Broom** sweeps across the field and knocks down any pass she meets.
- **Scaling, the lever behind the whole run:** the first drive of area I is **four slow defenders** (Intro 4, Challenge 5, Gimmicks 5 or 6, the Boss a full 8); every drive adds defenders or stats, and later areas bring more rushers and heavier, faster, grabbier versions of everyone. ▲ *Numbers to come from the balance runs: the target is that a team that never upgrades loses in area II, a decent build reaches the last Boss, and a strong one beats it.*
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
| **Your team** | Gold and orange, in helmets. One build for every position; only Golems are built like linebackers (wide and low), so a broad body is always a Golem. |
| **Who's open, and how far they can reach** | A ring under each receiver **as wide as its catch range**: a bullet coming inside the ring is caught. Green when no defender could reach a ball there, red when one could, gold when the aim line stops on it (a throw now would be caught there, as things stand). Better Hands, a bigger ring. |
| **How far each defender reaches** | A purple ring around every defender, as wide as its reach: a bullet coming inside it gets batted down (a Scarecrow's is widest). Gone once it's down, after the catch, and for a Rhino Beetle locked up at the line. |
| **Where the ball will go** | The sweeping aim line, with gold dashes, stopping at the first receiver or defender a bullet thrown now would meet. |
| **The carrier** | Holds the ball high, with a gold ring underfoot. |
| **What the defense will do** | Their facing: rushers toward the QB, Covers toward their Catcher. |
| **Down and distance** | "3rd & 4" and the gold first-down line. |

**Indicators stay small:** the voxel field and the bodies flying around it are the show.

---

## Score and Meta

- **The score is how far you got**: area, drive, and yards. ▲
- **Light meta progression** for variety, never power: new plays in the random pool, new areas, team looks.
- ▲ *Daily runs with a shared seed.*

---

## Scope: First Playable

The smallest version that proves the fun, most of it built:
- **One area of four drives**, played three times with the defense scaling up.
- **The QB (the pumpkin) and seven players** in three positions, starting all human.
- **A down:** three random play cards with Flip and HIKE!, the sweep and THROW, handoffs with the play fake, Break it!.
- **The third-person camera** behind and above the QB, following the play.
- **The defense:** Rushers, Covers, a Safety, Scarecrows and Bats, scaling by drive and area. The Witch.
- **TRICK OR TREAT!** after each won drive: two new players to choose from, the roster and bench.
- **Impact:** hit-pause, shake, flying bodies, the catch slow-mo, sound on every contact.

**Then:** real levels, defenders and Bosses; a second area.

---

## Ideas Set Aside

- **Slingshot aiming and swipe steering:** pulling back to aim a throw anywhere and swiping to nudge the carrier. Fiddly on a phone, and the decisions felt thin; the timing design replaced it.
- **The Giant Quarterback** *(the original premise):* a hulking monster QB with a team of tiny creatures. The comedy of scale might return as a Boss.

---

## Open Questions

- **Field width** and how far the camera sees ahead (to tune in the first playable).
- **The forest's Boss:** the Treant is still to design.
- **Sound off:** with no rhythm gameplay, it should play fine muted. Check it.
