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
    perArea: 0.15,
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
    /** The marker crosses the meter once, in this long… */
    meterSeconds: 1.1,
    /** …and the sweet spot never starts before this share of its trip, so there's time to react. */
    earliest: 0.34,
    /** The sweet spot's width (a share of the meter) at an even Heft match… */
    sweet: 0.2,
    /** …this much wider for every point of Heft the carrier has over the tackler… */
    perHeft: 0.06,
    /** …never narrower or wider than these… */
    minSweet: 0.05,
    maxSweet: 0.6,
    /** …and this many times narrower for every extra tackler on it. */
    perExtraTackler: 0.6,
    /** "Close": this far either side of the sweet spot, a drag. */
    near: 0.12,
    /** Mash: this long to tap; each tap fills this share, plus this per point of Heft over the tackler (within the range). */
    mashSeconds: 1.2,
    mashPerTap: 0.12,
    mashPerHeft: 0.025,
    mashMinPerTap: 0.05,
    mashMaxPerTap: 0.3,
    /** …full breaks it at once; this full by the end drags. */
    mashDrag: 0.5,
    /** Juke: when the countdown ends the arrow shows; then there's this long to tap its side, plus this per point of Hustle over the tackler (within the range)… */
    jukeWindow: 0.55,
    jukePerHustle: 0.06,
    jukeMinWindow: 0.25,
    jukeMaxWindow: 0.9,
    /** …and a tap in this first share of the window breaks it (later, a drag). */
    jukeBreakShare: 0.5,
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
    /** The play fake: after a handoff the defense keeps playing the pass this long (seconds)… */
    playFake: 0.9,
    /** …except a defender this close to the carrier (yards), who sees it. */
    fakeSees: 2,
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
