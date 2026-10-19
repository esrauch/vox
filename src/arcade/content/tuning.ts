/**
 * Every number for the arcade game (GAMEPLAY.md, rewritten 2026-10-19), in
 * one place. Distances are yards, times are seconds, speeds yards a second.
 * Starting values: tune by playtesting and the balance runs.
 */
export const arcadeTuning = {
  /** The simulation's fixed step. */
  stepsPerSecond: 60,
  field: {
    /** Half the field's width: x runs from -halfWidth to +halfWidth. */
    halfWidth: 13,
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
    /**
     * Heft is weight: mass = perHeft ^ Heft, so every point of Heft is the
     * same step at any level, and the contact ratios below read as Heft gaps.
     */
    mass: { perHeft: 1.25 },
    /** Hustle is speed (yards a second). */
    speed: { base: 5.5, perHustle: 0.6, min: 2 },
    /** Hands is reach (yards from the body's centre). */
    reach: { base: 0.9, perHands: 0.25, min: 0.3 },
    /** How fast anyone changes velocity (yards a second, a second). */
    accel: 22,
    /** How fast a body lying down slides to a stop. */
    friction: 8,
  },
  contact: {
    /** A Blocker this many times heavier than the defender it hits flattens it (3 Heft heavier)… */
    pancakeRatio: 1.9,
    /** …for this long. */
    pancakeTime: 1.2,
    /** A carrier this many times heavier than its tackler breaks the tackle (2 Heft heavier)… */
    breakRatio: 1.55,
    /** …and the tackler lies there this long. */
    brokenTime: 1.0,
    /** Bodies this close (beyond touching) count as contact for a tackle or a sack. */
    slop: 0.1,
  },
  throw: {
    /** Ball speed along the ground (yards a second); flight time is distance over this… */
    speed: 20,
    /** …but never shorter than this. */
    minFlight: 0.35,
    /** The arc's peak above the straight line: this × distance² (capped at maxArc). */
    arcPerYard2: 0.012,
    maxArc: 4,
    /** Height of the ball at the release. */
    releaseHeight: 0.8,
    /** A ball lower than this can be touched: caught, or batted down. */
    reachHeight: 1.0,
    /** Throws land from this many yards behind the line of scrimmage… */
    minAhead: -2,
    /** …to this many past it. */
    maxAhead: 30,
    /** Letting go closer to the QB than this cancels the throw. */
    minDistance: 2,
  },
  carrier: {
    /** How far one swipe moves the carrier's lane. */
    steerStep: 1.5,
    /** The carrier aims this far ahead of itself, in its lane. */
    lookAhead: 3,
  },
  defense: {
    /** Added to every defender's stats each area after the first… */
    perArea: 1,
    /** …and again on the Boss drive. */
    boss: 1,
    /** How far behind its Catcher a Cover trails. */
    coverTrail: 0.8,
    /** How far ahead a chaser leads the carrier (seconds of its velocity). */
    chaseLead: 0.3,
    /** A Bat's loop: a square this wide. */
    batLoop: 5,
  },
  witch: {
    /** Her speed across the field. */
    speed: 4,
    /** A pass whose path comes within this of her bounces off. */
    radius: 1.5,
  },
} as const;

/** The fixed step, in seconds. */
export const DT = 1 / arcadeTuning.stepsPerSecond;
