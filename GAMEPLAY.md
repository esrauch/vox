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

Tap PLAY and you're on the field. **Pick one of three play cards** and the ball is snapped: your Blockers shove the pass rush, your Catchers break for open grass, and an **aim line sweeps** back and forth from the QB. **Tap THROW** as it crosses an open receiver and a bullet zips out. Once someone has the ball it charges upfield on its own, and every time a gnome or an owl grabs it, **Break it!**: one well-timed tap shakes them off. See how far you get before they bury you. Four downs to make 10 yards. Make it and it's **TRICK OR TREAT!**: pick a perk (a stat boost, a slower sweep, a Ghost or a Golem to recruit) and shuffle your lineup. Miss on 4th down and the run is over. You start as a team of plain, weak humans against a sleepy defense; by the third area you're a pack of monsters against the whole forest.

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

- **A run is a series of themed areas** (the Haunted Forest first). **Each area is four drives**, *Balatro*-style: **Intro**, **Challenge**, **Gimmick** (a twist: Witches overhead, Bats everywhere) and **Boss**.
- **The main game is three areas: 12 drives and three Bosses**, on the way to Jack's pumpkin patch (THEME.md). **Each Boss has one gimmick that attacks one thing you do, and the first two leave a special perk behind:**

  | Area | Boss | Gimmick | Attacks |
  |---|---|---|---|
  | **The Forest** | **Mister Frog** (top hat) | **Frog Rain:** before the snap a lane lights up on the turf; during the down, frogs fall in it one by one (each shows a shadow first) and flatten whoever is under them. You see the lane while choosing a card, so you pick a play, or **Flip** it, to keep your routes out. | Where your routes go |
  | **The Swamp** | **The Queen** (a witch, double size, in a crown) | **The Hex:** the aim line shrinks to a short stub by the pumpkin, and receivers stop lighting up. The sweep still runs at full speed: you extrapolate. | Your timing |
  | **The Farm** | **The King** (a scarecrow in a crown) *(beating him gets Jack home: the end)* | **The Two-Part Grab:** when he grabs the carrier it's two Break it! tests back to back, and the second comes only if you pass the first. | The team you've built |

- **Boss perks:** beating a Boss gives its special perk, on top of that drive's TRICK OR TREAT!. These perks are never in the TRICK OR TREAT! pool.

  | Boss | Perk |
  |---|---|
  | **Mister Frog** | **Hot Arm:** the ball flies twice as fast. |
  | **The Queen** | ▲ *To decide.* |

- **The story is two tiny cutscenes:** at the start, Jack asks a football team to help him get home to his patch; at the end, in the patch, your team and every defender you played through (Bosses included) dance.

  ▲ *Until the Swamp and the Farm are built, the forest is played three times, stiffer each time.*
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
2. **The sweep.** On a pass play an **aim line sweeps from the QB**, sideline to sideline and back, like a lighthouse beam. **A receiver the line is passing over lights up.** It sweeps faster in later areas.
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
| **Between drives** | **Tap a card** | Take that perk (or skip). |
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

  Individuals vary: a recruit's stats land within ±10 of its kind's, so no two are alike (your starting seven are the plain 50s). **A new kind should follow the same rule:** one stat up, one down, a total of 150, and a position it suits.
- **Everyone starts human and plain.** A fresh team is a bit slow, a bit light, a bit clumsy: good enough for the sleepy first drive, not for the Boss.
- **Any player can play any position** (2 Blocker slots, 2 Runner slots, 3 Catcher slots). The plays only ever talk to the slots, so the team always lines up 2 / 2 / 3; who you put where is up to you, and their stats decide how well it works. A Golem in a Catcher slot is a slow Catcher nobody can tackle.
- **The numbers live on the roster screen** (between drives). On the field, the stats only show through what happens.

---

## Building Up: TRICK OR TREAT!

**After every won drive: TRICK OR TREAT!** Three perks are offered, each with a **rarity**; pick one (or skip) and play on; a new player keeps the screen open until you tap **Done**. **On the same screen is your roster: the seven on the field down the left, by position, and the bench (three seats) down the right. Tap any two players to swap them, field or bench.** Every player has a photo box: a pixel portrait of its kind. **There's no draft before the first drive**: you start with what you've got.

### The perks

| Rarity | Perk | What it does |
|---|---|---|
| Common | **+10 (stat) to everyone** | The baseline: a sure, small step for the whole team |
| Common | **Extra Sweep** | The pocket holds for one more sweep before the sack |
| Rare | **+20 (stat) to every Ghost** *(or Golem, Werewolf…)* | Rewards having several of one kind |
| Rare | **Slow-Mo Sweep** | The aim line sweeps 25% slower: easier timing, but fewer chances before the pocket collapses |
| Rare | **Second Wind** | Once per drive, a BAD Break it! counts as OK |
| Rare | **Candy Corn Magnet** | A ball that would fall incomplete gets twice the reach from your Catchers |
| Epic | **Haunted Line** *(not built yet)* | Defenders your Blockers pancake come back as your ghosts for the rest of the down, and block for you |
| Varies | **New player** | A recruit joins your team (below): a plain human is common, a monster rare, a star (+15 to everything) epic |

▲ *Rarity sets how often a perk turns up, and later areas offer rarer ones more often.*

### New players

**A recruit arrives with a little bio card:** a **name**, its **Heft / Hands / Hustle**, its **kind** (Human, Ghost, Golem, Werewolf, Skeleton…), and a **preferred position**: the one its best stat suits (Heft → Blocker, Hustle → Runner, Hands → Catcher). It takes a seat on the bench, and the roster stays open so you can swap it in (then **Done**). With the bench full, you pick who it replaces, on the field or the bench. It can go in any slot, but it plays best in its preferred one. Only the seven on the field play, and only they count for team bonuses like Monster Mash.

> **Bonesy Malone** · Skeleton · *prefers Runner*
> Heft 45 · Hands 50 · Hustle 75

### Team bonuses

**How your kinds add up matters**, *Balatro*-style:

| Bonus | Your team | Effect |
|---|---|---|
| **Monster Mash** | Players of different kinds | **+10 to every stat for each player whose kind is unique on your team** (the only one of its kind) |
| ▲ *More to come* | *e.g. three of one kind* | *e.g. that kind's perk bonuses doubled* |

The tension: a recruit of a kind you already have feeds the "+20 to every Ghost" perks; a recruit of a new kind feeds Monster Mash.

---

## The Defense

**The forest's locals, always in candy purple, never in helmets** (THEME.md). Each kind has **one job**, readable from its shape:

| Defender | Creature | Job |
|---|---|---|
| **Rusher** | Rhino Beetle | Charges the QB. Your Blockers have to out-shove it. |
| **Cover** | Garden Gnome | Shadows a Catcher; after the catch, chases the carrier. Small, quick, light: easy to shove, hard to shake. |
| **Zone** | Scarecrow | Planted: its long arms reach a **wide purple ring** on the turf, and any low ball coming down inside it is contested: its Hands beat a plain Catcher's, so it's a patch of field to throw away from (a Catcher with great Hands, like a Ghost, can still win it). Running into one stops you dead. |
| **Safety** | Owl | Hangs deep, between the ball and the first-down line, and comes down to meet the carrier. *(In the Swamp the Safety is a Witch.)* |
| **Bat** | Bat | Patrols a fixed loop and swats passes that fly through it. |
| **Frog** *(new)* | Frog | Covers like a Gnome until the carrier gets close, then crouches (the telegraph) and leaps onto it. |
| **Bog Hand** *(new, Swamp)* | Hand in the mud | Planted: grabs anyone who passes close. |
| **Crow** *(new, Farm)* | Crow | A Bat that swoops down a lane instead of looping. |

- **Each area has its own set:** the Forest adds Frogs; the Swamp swaps the Owl for Witches and adds Bog Hands and mud (everyone moves slower in it, defenders too); the Farm adds Crows and rows of Scarecrows. Older kinds keep their rules wherever they appear.
- **The Bosses:** Mister Frog is a Frog in a top hat; the Queen is a Witch twice the size, with the stats to match; the King is a Scarecrow in a crown.
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
| **Who's open, and how far they can reach** | A ring under each receiver **as wide as its catch range**: a bullet coming inside the ring is caught. Green when no defender could reach a ball there, red when one could, gold while the aim line is over it. Better Hands, a bigger ring. |
| **How far each defender reaches** | A purple ring around every defender, as wide as its reach: a bullet coming inside it gets batted down (a Scarecrow's is widest). Gone once it's down, after the catch, and for a Rhino Beetle locked up at the line. |
| **Where the ball will go** | The sweeping aim line, with gold dashes; the receivers it's over light up gold. |
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
- **TRICK OR TREAT!** after each won drive: perks, recruits, the roster and bench, Monster Mash.
- **Impact:** hit-pause, shake, flying bodies, the catch slow-mo, sound on every contact.

**Then:** real levels, defenders and Bosses; more team bonuses; a second area.

---

## Ideas Set Aside

- **Slingshot aiming and swipe steering:** pulling back to aim a throw anywhere and swiping to nudge the carrier. Fiddly on a phone, and the decisions felt thin; the timing design replaced it.
- **The Giant Quarterback** *(the original premise):* a hulking monster QB with a team of tiny creatures. The comedy of scale might return as a Boss.

---

## Open Questions

- **Field width** and how far the camera sees ahead (to tune in the first playable).
- **The forest's Boss:** the Treant is still to design.
- **Sound off:** with no rhythm gameplay, it should play fine muted. Check it.
