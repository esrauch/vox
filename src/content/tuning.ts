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
    /**
     * The simulation ticks on eighth notes: two ticks per beat of the music.
     * Units hop on ticks, so they still move in time with the song.
     */
    ticksPerBeat: 2,
  },
  grid: {
    /**
     * Half-yard tiles (GAMEPLAY.md, The Grid): 11 wide (5½ yards) by 26 tall
     * (13 yards), so a 10-yard first down is 20 rows and fits on one screen.
     */
    cols: 11,
    rows: 26,
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
    /** Every Blitzer beyond the first takes this many away. */
    perExtraBlitzer: 3,
    /** The pocket never holds for less than this. */
    minTicks: 6,
    /** On a run, the line ties the rush up for this many ticks before letting it go. */
    runHold: 6,
  },
  cards: {
    /** Play cards drawn before each down. */
    handSize: 3,
    /** New cards offered after a won drive. */
    draftOffer: 3,
  },
  throw: {
    /** Passes up to this far from the QB (tiles: 5 yards) are quick… */
    quickRange: 10,
    /** …and land this many ticks after the release (one beat)… */
    quickTicks: 2,
    /** …and longer ones take this many (two beats): time for the defense to close in. */
    longTicks: 4,
    /** Throws land from this many rows behind the line of scrimmage (negative)… */
    minAhead: -2,
    /** …to this many rows past it. */
    maxAhead: 22,
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
     * Ticks a knocked-down unit stays down: long enough for a carrier that
     * fends it off to get clear, so it can't get up right behind it and
     * tackle it anyway.
     */
    knockdownTicks: 5,
  },
} as const;
