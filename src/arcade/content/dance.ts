/**
 * The win dance's timing (render/outro.ts), shared with the sing-along video
 * script (tools/video/render.ts), so it's plain data with no imports.
 */

/** Every move of the dance comes round again after this many beats. */
export const LOOP_BEATS = 8;

/** The beat the dance keeps: the music's tempo, and when its first beat falls (seconds in). */
export interface DanceBeat {
  readonly bpm: number;
  readonly firstBeat: number;
}

/** "We Got Jack Back"'s beat, measured by tools/video/tempo.ts. */
export const WIN_TRACK_BEAT: DanceBeat = { bpm: 135.6, firstBeat: 0.28 };
