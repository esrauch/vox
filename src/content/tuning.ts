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
    /** The highest row the Big can throw to; the rows above must be run. */
    maxRow: 12,
  },
  pocket: {
    /** The Big's own hold counter, per ball, once a Blitzer reaches it. */
    bigHold: 3,
  },
  units: {
    /** Beats a knocked-down unit stays down. */
    knockdownBeats: 2,
  },
} as const;
