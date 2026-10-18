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
  grid: {
    /** The field is about one Crossy Road screen: 9 wide, 16 tall (GAMEPLAY.md, The Grid). */
    cols: 9,
    rows: 16,
  },
  drive: {
    /** The row the line of scrimmage starts on for every drive. */
    startRow: 2,
    /** Yards (rows) to gain for a first down. */
    distance: 10,
    downs: 4,
    /** How far behind the line of scrimmage the QB lines up. */
    qbDepth: 2,
    /** Yards lost on a sack. */
    sackLoss: 2,
    /** Beats a finished down stays on screen (so you see what happened) before the next. */
    pauseBeats: 4,
    /** If the QB still holds the ball this many beats after the snap, it's a sack anyway. */
    playClockBeats: 14,
  },
  cards: {
    /** Play cards drawn before each down. */
    handSize: 3,
    /** New cards offered after a won drive. */
    draftOffer: 3,
  },
  throw: {
    /** Beats from release to landing. */
    flightBeats: 2,
    /** Throws land from this many rows behind the line of scrimmage (negative)… */
    minAhead: -1,
    /** …to this many rows past it. */
    maxAhead: 11,
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
    /** Each point of Hands widens every catch radius by this much. */
    perHands: 0.3,
  },
  coverage: {
    /** A player within this many tiles outside a coverage ring is yellow (coverage is close). */
    nearBand: 1,
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
     * Beats a knocked-down unit stays down: four hops, long enough for a
     * carrier that fends it off to get clear, so it can't get up right behind
     * the carrier and tackle it anyway.
     */
    knockdownBeats: 8,
  },
} as const;
