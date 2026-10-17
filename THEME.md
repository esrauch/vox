# Fourth & Ghoul: Theme

*A football team, a haunted forest, and the longest fourth down of their lives.*

This document is about who, where and what it feels like. It does not cover rules or numbers; those live in [GAMEPLAY.md](GAMEPLAY.md).

---

## The Pitch in One Breath

**A football team playing through a haunted forest.** Your squad starts out as plain, cheerful football players. Screen by screen they fight their way up the field, past gnomes, scarecrows and bats that don't want them there. Along the way, the forest's own creatures join up: a bat in a football helmet, a skeleton in shoulder pads, a pumpkin-head who can really run. Get the ball to the end zone, pick up a new teammate, and keep going until the run falls apart.

**The feel:** snappy, fast, silly and fun. It's closer to *Crossy Road* than to *Blood Bowl*: pick it up in seconds, laugh every few seconds, one more go. **It's a portrait, one-thumb phone game in voxels**, and everything moves to the beat of a cheerful Halloween soundtrack.

Inspirations: *Crossy Road* (feel, readability, chunky toy-like look, collectible characters), *Crypt of the NecroDancer* (everything moves to the beat), *Blood Bowl* (fantasy football), and the joy of a team of misfits that somehow works.

## Core Fantasy

- **You run the play.** You're the quarterback, standing in the backfield: the one who sees the whole field and decides where the ball goes.
- **A team of nobodies becomes a team of monsters.** You start with a squad of identical rookies. By the end of a good run your roster is a bat, a werewolf, a mummy and two rookies who refuse to quit, all in matching helmets.
- **Every new teammate is a little story.** A bat that joined on screen 4 and caught the winning pass on screen 11 is *your* bat.
- **Chaos you can steer.** You can't control everything, and that's the point. You set up the play and adapt as it falls apart.

## Tone

- **Slapstick violence with no cruelty.** Players get flattened, punted and buried in leaves. A hit bursts them into voxel bits that click back together. When a teammate really goes down, it gets a tiny tombstone and a little ghost that waves goodbye. It's sad for exactly one second.
- **The game is a dance.** Everything on the field hops in time with the music. Even the dead have rhythm.
- **Snappy above all.** Quick screens, quick celebrations, quick restarts. Silliness happens in seconds, not in cutscenes.
- **Sports-broadcast energy.** Announcers, crowd chants, replays of the stupidest moments.
- **Spooky, never scary.** It's a haunted forest at dusk, but the monsters are cute, the pumpkins grin, and the darkest thing in the game is a slightly sad tombstone.

## Art Direction

**Simple voxel art like *Crossy Road*, set in a haunted forest at dusk.**

- **Simple voxels.** Low voxel counts, chunky proportions and flat colors. No textures, no fine detail.
- **Haunted dusk, still readable.** A mossy, dark-green field, a leaf-strewn forest floor, fog in the trees, moonlit purple light and glowing jack-o'-lanterns. It's spooky, but the players on the field always pop.
- **Silhouette first.** Every player, opponent and hazard is recognizable from its shape and color alone, at phone size, from the game's steep camera.
- **The helmet is the team.** *If it wears our helmet, it's on our side.* Every teammate, rookie or monster, wears the team's football helmet and colors. The forest's opponents never wear helmets.
- **Two colors carry the readability.** Our team is **gold and orange**. The opposition is always **candy purple**. Nothing on the field should ever leave you wondering whose side it's on.
- **Destruction is cubes.** Hits burst things into colorful voxel chunks. No blood, ever.
- **Everyone faces the camera.** Players, defenders and props never turn, even while hopping up the field, so you always see their faces, masks and numbers. Small arrows on the turf show where each will hop next. The one exception is the **Witch on a Broom**, who faces the way she's flying.
- **Animation is bouncy, not smooth.** Hops, squashes and snappy poses, like toys moved by hand.

---

## Our Team

### Rookies

**Every run starts with the same squad of vanilla football players**: identical rookies in gold helmets and orange jerseys. They're plain, keen and expendable, and they always turn up again for the next screen however many times they get flattened. (The model is `misc/footballPlayer`.)

*Name to settle: "Walk-ons" (the current name in the rules) or "Rookies".*

### Recruits: the forest joins the team

As the run goes on, **creatures of the haunted forest join the team, and every one of them puts on a football helmet**. Each recruit replaces a rookie, is better at something, and is precious: if a recruit goes down, it's gone for good, and a rookie takes its place.

Candidates (each wearing the team helmet, with a role you can read from its shape):

| Recruit | Good at | Look |
|---|---|---|
| **Bat** | Catching passes out of the air | Wings spread, hovering, with a tiny helmet. |
| **Skeleton** | Getting back up after a hit | Bones in shoulder pads, which rattle apart and click back together. |
| **Pumpkin-head** | Running | A jack-o'-lantern head under the helmet, glowing through the face mask. |
| **Werewolf** | Breaking tackles | Big, hairy, the helmet barely fits. |
| **Mummy** | Holding onto the ball | Wrapped up tight, trailing a bandage. |
| **Ghost** | Slipping past defenders | A sheet with a helmet floating on top. |
| **Black Cat** | Speed and lucky catches | Low and quick, tail up. |
| **Witch** | Trick plays | A pointy hat squashed under the helmet. |
| **Frankenstein's Monster** | Raw strength | Square, green, bolts poking out of the helmet. |
| **Owl** | Seeing the whole field | Round, wide-eyed, wings folded. |

### The ball

**A jack-o'-lantern football.** It's the team's ball and the game's icon. *(The current model is the cube Jack-o'-Lantern; a football-shaped pumpkin is worth trying.)*

---

## The Opposition: the Haunted Forest

**The forest's locals don't want a football team tramping through their woods.** They're the defenders: wild creatures, never in helmets, always in candy purple.

| Defender kind | Forest local | Look |
|---|---|---|
| **Chaser** | **Garden Gnome** | A tall pointy hat, a beard, arms out. |
| **Blitzer** | **Rhino Beetle** | Low, wide and horned, a little battering ram. |
| **Wall-er** | **Scarecrow** | Arms spread wide along its crossbar, a literal wall. |
| **Picker** | **Bat** | Hovering with its wings spread, to snatch passes out of the air. |

*Note: a Bat is both a defender and a recruit candidate. The helmet rule tells them apart (a wild purple bat versus our helmeted gold bat), but if it's confusing in play, the Picker could become an Owl or a Crow instead.*

**Hazards** belong to the forest too, each one a single simple shape: **rolling pumpkins** tumbling along the turf, a **witch on a broom** swooping over the passing lanes, **tombstones** in the way, and later **drifting ghosts**.

**Later, more haunted places:** a graveyard, a witch's swamp, a haunted manor. Each has its own locals and hazards, but it's always the same team, picking up recruits along the way.

---

## Attributes

Every player and every defender is described by **three attributes**, the **Three H's**: whole numbers starting at 0. Rookies are a perfectly average 0 / 0 / 0, and recruits are better in one or two.

| Attribute | What it means | Who's known for it |
|---|---|---|
| **Hustle** | Speed: how often you hop. | Black Cat, Pumpkin-head |
| **Hands** | Catching: how easy you are to hit with a pass. | Bat, Mummy |
| **Heft** | Toughness: how many hits you can take. | Werewolf, Frankenstein's Monster |

## Hijinks (team powers)

**Hijinks** are dramatic, screen-filling tricks the team can pull off after the throw, like ultimates in other games. They're unlocked through the draft, and many will come from recruits: the Witch hexes a lane, the Ghost lets everyone slip through defenders for a beat, the Owl spots every defender's next move.

*Name to consider: **"Trick Plays"**. It's a real football term, and it's Halloween ("trick or treat").*

---

## Title

**Fourth & Ghoul**: fourth and goal, the last-chance down, with a ghoul in it. It's chosen.

Runners-up, kept for reuse inside the game (screens, achievements, Trick Plays): *Field of Screams*, *Hike & Shriek*, *Trick Play*, *Ghoul Line*, *Boo-tball*, *The Boo Zone*, *Haunted Huddle*, *Hail Mary Shelley*, *Fright Night Football*, *Touchdown Town*. The old title, *Fee Fi Fo Fumble*, lives on as the crowd's chant when you fumble.

## Open Questions

- **"Walk-ons" or "Rookies"** for the vanilla players?
- **"Hijinks" or "Trick Plays"** for the team powers?
- **Who is the quarterback?** A rookie in the backfield, or a special player that's always there? It's the one player who never moves.
- **What makes runs different from each other** now that there's no Big to choose? Perhaps the team's colors and name, a starting recruit, or a coach.
- **Is the Bat both a defender and a recruit,** or should the Picker change?
- **What is the climb toward?** The far side of the forest? A haunted stadium? Is there a joke at the top that nobody ever reaches?
