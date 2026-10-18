# Fourth & Ghoul: Theme

*A football team, a haunted forest, and the longest fourth down of their lives.*

This document is about who, where and what it feels like. It does not cover rules or numbers; those live in [GAMEPLAY.md](GAMEPLAY.md).

---

## The Pitch in One Breath

**A football team playing through a haunted forest.** Your squad is plain, cheerful football players, and you're the one calling the plays. Drive by drive they fight their way up the field, four downs at a time, past gnomes, scarecrows, owls and bats that don't want them there. Your playbook grows as you go, and the forest's own creatures turn up in it: a bat in a football helmet on a deep route, a skeleton who pulls himself together after a tackle, a pumpkin rolling out as a decoy. Make the first down, add a play to the book, and keep going until a 4th down goes wrong.

**The feel:** snappy, fast, silly and fun. It's closer to *Crossy Road* than to *Blood Bowl*: pick it up in seconds, laugh every few seconds, one more go. **It's a portrait, one-thumb phone game in voxels**, and everything moves to the beat of a cheerful Halloween soundtrack.

Inspirations: *Crossy Road* (feel, readability, chunky toy-like look), *Retro Bowl* (pocket-sized football you can read at a glance), *Slay the Spire* and *Balatro* (a deck that becomes your run), *Crypt of the NecroDancer* (everything moves to the beat), *Blood Bowl* (fantasy football), and the joy of a team of misfits that somehow works.

## Core Fantasy

- **You call the play and make the throw.** You're the quarterback: the one who reads the defense, picks the play, and decides where the ball goes.
- **A plain playbook becomes a monster playbook.** You start with Go, Slant and Curl. By the end of a good run your deck is full of bat routes, flea flickers and a Hail Mary you only dare call on 4th down.
- **Every card is a little story.** The Skeleton Sneak that got you the first down against the Treant is *your* play.
- **Chaos you can read.** The defense is all on show, but four downs go fast. You call the play and adapt as it falls apart.

## Tone

- **Slapstick violence with no cruelty.** Players get flattened, punted and buried in leaves. A tackle bursts them into voxel bits that click back together for the next down. A blocked pass bounces off a scarecrow's face. It's never sad for more than a second.
- **The game is a dance.** Everything on the field hops in time with the music. Even the dead have rhythm.
- **Snappy above all.** Quick downs, quick celebrations, quick restarts. Silliness happens in seconds, not in cutscenes.
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
- **Everyone faces the camera, leaning back a little.** Players, defenders and props never turn, even while hopping up the field, and the characters lean back toward the camera like figures in a diorama, so you always see their faces, masks and numbers. Small arrows on the turf show where each will hop next. The one exception is the **Witch on a Broom**, who faces the way she's flying.
- **Animation is bouncy, not smooth.** Hops, squashes and snappy poses, like toys moved by hand.

---

## Our Team

### Walk-ons

**Every play is run by the same squad of vanilla football players**: identical Walk-ons in gold helmets and orange jerseys. They're plain, keen and expendable, and they line up again for the next down however many times they get flattened. (The model is `team/walkOn`.)

### Special players: the forest on your cards

**Creatures of the haunted forest turn up on play cards, and every one of them puts on a football helmet** for that play. A card might bring a Bat to run a deep route, or a Skeleton to carry the ball. They only exist for the play on their card; the deck is the team.

Candidates (each wearing the team helmet, with a role you can read from its shape):

| Special player | Good at | Look |
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
| **Owl** | Seeing the whole field | Round, wide-eyed, wings folded. *(Also a candidate for the defense's Safety: a wild, purple, helmetless owl.)* |

### The ball

**A jack-o'-lantern football.** It's the team's ball and the game's icon. *(The current model is the cube Jack-o'-Lantern; a football-shaped pumpkin is worth trying.)*

---

## The Opposition: the Haunted Forest

**The forest's locals don't want a football team tramping through their woods.** They're the defenders: wild creatures, never in helmets, always in candy purple.

| Defender job | Forest local | Look |
|---|---|---|
| **Cover** (man coverage) | **Garden Gnome** | A tall pointy hat, a beard, arms out. |
| **Blitzer** (the pass rush) | **Rhino Beetle** | Low, wide and horned, a little battering ram. |
| **Zone** (planted, guards a wide area) | **Scarecrow** | Arms spread wide along its crossbar, a literal wall. |
| **Safety** (the deep guard) | ▲ **Owl** | Perched deep, wide-eyed, seeing everything. *(Not modelled yet.)* |
| **Bat** (patrols a box of sky) | **Bat** | Hovering with its wings spread, to knock passes out of the air. |

*Note: a Bat is both a defender and a special-player candidate. The helmet rule tells them apart (a wild purple bat versus our helmeted gold bat).*

**Hazards** belong to the forest too, each one a single simple shape: **rolling pumpkins** tumbling along the turf, a **witch on a broom** swooping over the passing lanes, **tombstones** in the way, and later **drifting ghosts**.

**Later, more haunted places:** a graveyard, a witch's swamp, a haunted manor. Each area has its own locals, hazards and cards, and a boss defense at the end of its four drives. It's always the same team, with a growing playbook.

---

## Attributes

Every player and every defender is described by **three attributes**, the **Three H's**: whole numbers starting at 0. Walk-ons are a perfectly average 0 / 0 / 0, and special players are better in one or two.

| Attribute | What it means | Who's known for it |
|---|---|---|
| **Hustle** | Speed: how often you hop. | Black Cat, Pumpkin-head |
| **Hands** | Catching: how easy you are to hit with a pass. | Bat, Mummy |
| **Heft** | Toughness: breaking tackles. | Werewolf, Frankenstein's Monster |

## Trick Plays

**Trick plays are play cards**, the showiest ones in the deck: a Flea Flicker, a Hook and Ladder, a Hail Mary, a Statue of Liberty, and haunted ones the forest teaches you. It's a real football term, and it's Halloween ("trick or treat").

---

## Title

**Fourth & Ghoul**: fourth and goal, the last-chance down, with a ghoul in it. It's chosen.

Runners-up, kept for reuse inside the game (cards, achievements, area names): *Field of Screams*, *Hike & Shriek*, *Trick Play*, *Ghoul Line*, *Boo-tball*, *The Boo Zone*, *Haunted Huddle*, *Hail Mary Shelley*, *Fright Night Football*, *Touchdown Town*. The old title, *Fee Fi Fo Fumble*, lives on as the crowd's chant when you fumble.

## Open Questions

- **What makes runs different from each other** beyond the draft? Perhaps different starting decks (a "coach" per playbook), or the team's colors and name.
- **Is the Bat both a defender and a special player,** or should one of them change?
- **What is the run toward?** The far side of the forest? A haunted stadium? Is there a joke at the end that nobody ever reaches?
