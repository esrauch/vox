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
    /** A screen is about one Crossy Road screen: 9 wide, 16 tall (GAMEPLAY.md, The Grid). */
    cols: 9,
    rows: 16,
    /** Rows 0..setupRows-1 are the setup zone. */
    setupRows: 3,
  },
  run: {
    startingBalls: 3,
    startingSlots: 5,
    /** Yards awarded per cleared screen. */
    yardsPerScreen: 10,
  },
  throw: {
    /** Beats from release to landing (the Fast Throw perk makes it 1). */
    flightBeats: 2,
    /**
     * Throws can only land in the middle half of the field: the bottom quarter
     * (rows 0-3) is too close to the QB, and the top quarter (12-15) has to be run.
     */
    minRow: 4,
    maxRow: 11,
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
    /** A defender this close, and closer than any receiver, intercepts. */
    intercept: 0.6,
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
    /** Beats a knocked-down unit stays down. */
    knockdownBeats: 2,
  },
} as const;
