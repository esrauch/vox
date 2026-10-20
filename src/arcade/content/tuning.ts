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
    /**
     * A tackler that reaches the carrier hangs on, and the carrier drags it:
     * slowed to carrier mass / (carrier mass + the weight hanging on). It's
     * down once the weight on it, relative to its own, has added up to this
     * many seconds (one tackler as heavy as the carrier takes this long).
     */
    wrapTime: 0.5,
    /** A carrier this many times heavier than its tackler breaks the tackle (2 Heft heavier)… */
    breakRatio: 1.55,
    /** …and the tackler lies there this long. */
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
    /** Ball speed along the ground (yards a second); flight time is distance over this… */
    speed: 13,
    /** …but never shorter than this. */
    minFlight: 0.35,
    /** The arc's peak above the straight line: this × distance² (capped at maxArc). */
    arcPerYard2: 0.012,
    maxArc: 4,
    /** Height of the ball at the release… */
    releaseHeight: 0.8,
    /** …and where it comes down: at catching height, not the turf. */
    catchHeight: 1.0,
    /**
     * A ball lower than this can be touched: caught, or batted down. With the
     * arc, that's only near the two ends of a throw: at the line, and where it
     * comes down. A defender left a step behind its Catcher can't reach it.
     */
    reachHeight: 1.2,
    /** Throws land from this many yards behind the line of scrimmage… */
    minAhead: -2,
    /** …to this many past it. */
    maxAhead: 30,
    /** Letting go closer to the QB than this cancels the throw. */
    minDistance: 2,
    /** You can hand off to a Runner up to this long after the snap (or tap one to snap and hand off at once). */
    handoffWindow: 1,
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
    /** …and again on the Boss drive (its bigger line-up is most of its step up). */
    boss: 0,
    /** How far behind its Catcher a Cover trails. */
    coverTrail: 0.8,
    /** How far ahead a chaser leads the carrier (seconds of its velocity). */
    chaseLead: 0.3,
    /** A Bat's loop: a square this wide. */
    batLoop: 3.5,
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
