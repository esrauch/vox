/** Every magic number in one place (TECHNICAL.md §9). Values are starting points for tuning. */
export const tuning = {
  beat: {
    /** Default tempo for the beat-clock spike. */
    defaultBpm: 120,
    /** ± seconds around a beat that count as On-Beat. Generous by default (GAMEPLAY.md). */
    onBeatWindow: 0.08,
  },
  calibration: {
    /** Taps ignored at the start while the player finds the beat. */
    warmupTaps: 4,
    /** Taps measured after the warm-up. */
    measuredTaps: 12,
  },
  clock: {
    /** Simulation ticks per beat of the music (one: everyone hops on the beat). */
    ticksPerBeat: 1,
  },
  grid: {
    /**
     * Half-yard tiles (GAMEPLAY.md, The Grid): 11 wide (5½ yards) by 30 tall
     * (15 yards): a 10-yard first down is 20 rows, with 3 yards of field past
     * the first-down line so a defense near it still has room.
     */
    cols: 11,
    rows: 30,
  },
  drive: {
    /** The row the line of scrimmage starts on for every drive. */
    startRow: 3,
    /** Rows (half-yards) to gain for a first down: 10 yards. */
    distance: 20,
    downs: 4,
    /** How many rows behind the line of scrimmage the QB lines up. */
    qbDepth: 3,
    /** Rows lost on a sack (2 yards). */
    sackLoss: 4,
    /** Ticks a finished down stays on screen (so you see what happened) before the next. */
    pauseTicks: 6,
  },
  pocket: {
    /** Ticks your line holds the pass rush off before the pocket collapses (a sack). */
    ticks: 12,
    /** Every player a play leaves at home to block buys this many more ticks. */
    perBlocker: 3,
    /** Every pass rusher beyond the first takes this many away. */
    perExtraRusher: 3,
    /** The pocket never holds for less than this. */
    minTicks: 6,
  },
  cards: {
    /** Play cards drawn before each down. */
    handSize: 3,
    /** Picks offered after a won drive: one or two transforms (while a human is left), the rest training. */
    draftOffer: 4,
    /** The most transforms one draft offers (each a different form). */
    maxTransforms: 2,
  },
  throw: {
    /** Flight time: one tick per this many tiles of distance (at least one tick). */
    tilesPerTick: 7.5,
    /**
     * The arc's peak above the straight line, in tiles: this times the
     * distance squared (capped). Short passes stay low; long ones climb.
     */
    arcPerTile2: 0.006,
    maxArc: 6,
    /** Height of the ball at the release, just under a defender's reach. */
    releaseHeight: 1,
    /** A defender can get a hand on a ball lower than this… */
    reach: 1.2,
    /**
     * The aiming line shows the ball as catchable (gold) only below this
     * height: a little short of the real `reach`, so the real window is always
     * a bit more forgiving than it looks. Purely visual.
     */
    shownReach: 0.9,
    /** …if it passes within this many tiles of it (a defender right beside the ball's path). */
    blockRadius: 1,
    /** Throws land from this many rows behind the line of scrimmage (negative)… */
    minAhead: -2,
    /** …to this many rows past it. */
    maxAhead: 26,
  },
  aim: {
    /** Slingshot aiming: how far the target moves per pixel of pull. */
    tilesPerPixel: 0.055,
  },
  catch: {
    /**
     * Throws land anywhere (not grid-locked); a receiver catches if it's close
     * enough to where the ball comes down. Distances are in tiles, from the
     * landing point to the receiver's tile centre.
     */
    perfect: 0.35,
    good: 0.75,
    ok: 1.15,
  },
  checks: {
    /**
     * A check's chance of success by your edge (your stat minus the
     * defender's, plus modifiers), from -4 or worse up to +4 or better
     * (GAMEPLAY.md, Checks). It favors you: even is 60%, +4 is certain, and
     * there's always a long shot.
     */
    curve: [0.1, 0.15, 0.25, 0.4, 0.6, 0.75, 0.88, 0.95, 1],
    /** The safety net: each failure in a row adds this much edge to that player's next check of the kind. */
    safetyNet: 1,
    /** Edge from the throw's quality on a contested catch. */
    quality: { perfect: 1, good: 0, ok: -1 },
    /** Edge lost for each contesting defender beyond the best one. */
    perExtraDefender: 1,
    /** Ticks a shaken defender stays stumbled (down): it misses about two hops, dropping behind, then keeps chasing. */
    shakeTicks: 3,
    /** Frenzy: edge on the next check of the kind after a success. */
    frenzy: 2,
    /** A player's ring: green at or above `open`, yellow at or above `tight`, red below. */
    bands: { open: 0.75, tight: 0.4 },
  },
  run: {
    /** Areas in the main game. Until there are more, the forest is played again, stiffer each time. */
    areas: 3,
  },
  defense: {
    /** Added to every defender's stats for each area after the first… */
    perArea: 1,
    /** …and again on the Boss drive. */
    boss: 1,
  },
  camera: {
    /** Camera pitch in degrees above the horizon. */
    pitch: 58,
    /**
     * Characters lean back by this many degrees, a diorama cheat so faces and
     * jerseys read from the steep camera. (Chosen 2026-10-17; may be revisited.)
     */
    tilt: 35,
  },
  audio: {
    /** Bus levels (0..1). */
    master: 0.9,
    music: 0.65,
    sfx: 0.8,
    ui: 0.5,
  },
  units: {
    /**
     * Ticks a knocked-down unit stays down: long enough for a carrier that
     * fends it off to get clear, so it can't get up right behind it and
     * tackle it anyway.
     */
    knockdownTicks: 5,
  },
} as const;
