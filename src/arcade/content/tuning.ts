/**
 * Every number for the arcade game (GAMEPLAY.md, rewritten 2026-10-19), in
 * one place. Distances are yards, times are seconds, speeds yards a second.
 * Starting values: tune by playtesting and the balance runs.
 */
export const arcadeTuning = {
  /** The simulation's fixed step. */
  stepsPerSecond: 60,
  field: {
    /** Half the field's width: x runs from -halfWidth to +halfWidth (18 yards wide, for the camera's sake). */
    halfWidth: 9.1,
  },
  drive: {
    /** Yards to gain for a first down. */
    distance: 10,
    downs: 4,
    /** Yards lost on a sack. */
    sackLoss: 2,
    /** Seconds a finished down stays on screen before the next lines up. */
    pause: 0.8,
  },
  run: {
    /** Areas in the main game (the forest again until there are more). */
    areas: 3,
  },
  /** How the three stats become physics (GAMEPLAY.md, Your Team). */
  body: {
    /** Stats are measured from this (ordinary)… */
    statBase: 50,
    /** …in steps of this: every number below that says "per Heft" or "per Hustle" means per step. */
    statStep: 10,
    /**
     * Heft is weight: mass = perHeft ^ Heft, so every point of Heft is the
     * same step at any level, and the contact ratios below read as Heft gaps.
     */
    mass: { perHeft: 1.25 },
    /** Hustle is speed (yards a second). */
    speed: { base: 3.4, perHustle: 0.4, min: 1.5 },
    /** Hands is reach (yards from the body's centre). */
    reach: { base: 0.9, perHands: 0.25, min: 0.3 },
    /** How fast anyone changes velocity (yards a second, a second). */
    accel: 12,
    /** How fast a body lying down slides to a stop. */
    friction: 8,
  },
  contact: {
    /** A Blocker this many times heavier than the defender it hits flattens it (3 Heft heavier)… */
    pancakeRatio: 1.9,
    /** …for this long. */
    pancakeTime: 1.2,
    /** A tackler shaken off in Break it! lies there this long. */
    brokenTime: 1.0,
    /** Bodies this close (beyond touching) count as contact for a tackle or a sack. */
    slop: 0.1,
    /**
     * A defender a Blocker is on moves at this share of its speed: held when
     * the Blocker is at least as heavy, slowed when it's lighter.
     */
    held: 0.25,
    slowed: 0.6,
  },
  throw: {
    /** A bullet: straight and fast, along the sweeping line (yards a second). */
    speed: 24,
    /** It flies no further than this past the line of scrimmage. */
    maxAhead: 30,
    /** Your players closer than this to the QB are skipped (it's going past them). */
    minDistance: 3,
  },
  sweep: {
    /** The aim line sweeps this far either side of straight upfield (degrees)… */
    halfAngle: 62,
    /** …at this speed (degrees a second)… */
    degreesPerSecond: 75,
    /** …this much faster each area after the first (a share of it)… */
    perArea: 0.3,
    /** …and again on the Boss drive. */
    boss: 0.1,
    /** The pocket holds while the line crosses this many times; then it's a sack. */
    scans: 3,
  },
  breakit: {
    /**
     * Every test opens with a countdown ("Get ready to mash…") this long in
     * sim time (2 seconds on screen, at the game's 0.8 time scale); taps
     * during it don't count.
     */
    ready: 1.6,
    /** …but only this long when it starts within `chainWindow` of the last one ending (no dead time in a pile-up). */
    chainReady: 0.5,
    chainWindow: 2,
    /** The marker crosses the meter once, in this long… */
    meterSeconds: 1.1,
    /** …and the sweet spot never starts before this share of its trip, so there's time to react. */
    earliest: 0.34,
    /** The sweet spot's width (a share of the meter) at an even Heft match… */
    sweet: 0.09,
    /** …this much wider for every point of Heft the carrier has over the tackler… */
    perHeft: 0.027,
    /** …never narrower or wider than these… */
    minSweet: 0.025,
    maxSweet: 0.27,
    /** …and this many times narrower for every extra tackler on it. */
    perExtraTackler: 0.6,
    /** "Close": this far either side of the sweet spot, a drag. */
    near: 0.1,
    /** Mash: this long to tap; each tap fills this share, plus this per point of Heft over the tackler (within the range). */
    mashSeconds: 1.2,
    mashPerTap: 0.1,
    mashPerHeft: 0.02,
    mashMinPerTap: 0.05,
    mashMaxPerTap: 0.3,
    /** …full breaks it at once; this full by the end drags. */
    mashDrag: 0.55,
    /** Juke: when the countdown ends the arrow shows; then there's this long to tap its side, plus this per point of Hustle over the tackler (within the range)… */
    jukeWindow: 0.55,
    jukePerHustle: 0.06,
    jukeMinWindow: 0.25,
    jukeMaxWindow: 0.9,
    /** …and a tap in this first share of the window breaks it (later, a drag). */
    jukeBreakShare: 0.5,
    /**
     * A GREAT breaks the carrier free of the pile: any other defender this close
     * (yards, beyond touching) is knocked back too, down this long; and nobody can
     * grab it for this long after (seconds of live play), so it gets clear instead
     * of being grabbed again at once.
     */
    scatter: 1.2,
    scatterDown: 0.6,
    breakaway: 0.6,
    /** A drag gets this many yards, plus this many for every point of Heft over the tackler (within the range). */
    dragYards: 1.5,
    dragPerHeft: 0.5,
    minDrag: 0.5,
    maxDrag: 4,
  },
  carrier: {
    /** The carrier aims this far ahead of itself, in its lane… */
    lookAhead: 3,
    /** …and picks the emptiest lane again this often (seconds). */
    laneEvery: 0.25,
  },
  defense: {
    /** Added to every defender's stats each area after the first… */
    perArea: 10,
    /** …and again on the Boss drive (its bigger line-up is most of its step up). */
    boss: 0,
    /** How far behind its Catcher a Cover trails. */
    coverTrail: 0.8,
    /** How far ahead a chaser leads the carrier (seconds of its velocity). */
    chaseLead: 0.3,
    /** A Bat's loop: a square this wide. */
    batLoop: 3.5,
    /** A Crow's lane: it flies this far up the field and back. */
    crowLane: 8,
    /** The play fake: after a handoff the defense keeps playing the pass this long (seconds)… */
    playFake: 0.9,
    /** …except a defender this close to the carrier (yards), who sees it. */
    fakeSees: 2,
  },
  fieldProps: {
    /** How many to a 10-yard stretch (at random in this range)… */
    min: 2,
    max: 3,
    /** …kept this far out of the middle (the pumpkin's lane), this far in from the sidelines… */
    center: 2.2,
    edge: 1,
    /** …and at least this far apart (edge to edge), so there's always a way between. */
    gap: 2.2,
    /** A body looks this far ahead for a prop in its way, and passes it with this much room. */
    lookAhead: 2.5,
    margin: 0.25,
    /** The King stands this far past the first-down line of the last drive, in front of the patch. */
    kingBeyond: 2.5,
  },
  hex: {
    /** The Queen's Hex: the aim line shows only this much of itself (yards from the pumpkin). */
    stub: 3,
  },
  frogRain: {
    /** The lane runs in from one sideline (either, at random) this share of the way across: never over the pumpkin, so Flip matters. */
    width: 0.4,
    /** It runs from just behind the line of scrimmage to this far upfield. */
    behind: 1,
    ahead: 16,
    /** The first frog lands this long into the down, then one every so often (seconds of live play)… */
    first: 0.6,
    every: 0.15,
    /** …for this long. */
    lasts: 9,
    /** Its shadow shows this long before it lands. */
    warn: 0.7,
    /** It flattens anyone this close to where it lands (plus their own size)… */
    radius: 0.6,
    /** …for this long (a carrier it lands on is tackled). */
    flatTime: 1.2,
  },
  witch: {
    /** Her speed across the field. */
    speed: 3,
    /** A pass whose path comes within this of her bounces off. */
    radius: 1.5,
  },
} as const;

/** The fixed step, in seconds. */
export const DT = 1 / arcadeTuning.stepsPerSecond;
