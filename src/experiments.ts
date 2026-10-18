import { tuning } from './content/tuning';

/**
 * Settings under trial, with URL overrides so alternatives can be compared
 * without changing the game:
 *   ?pitch=50   camera pitch in degrees
 *   ?tilt=45    lean every character back by this many degrees
 *   ?steer=0    turn off steering the ball carrier (the experiment from 2026-10-17)
 */
const params = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);
const fromUrl = (name: string): number | null => {
  const v = params.get(name);
  return v === null || v === '' || Number.isNaN(Number(v)) ? null : Number(v);
};

export const experiment = {
  pitch: fromUrl('pitch') ?? tuning.camera.pitch,
  tiltDeg: fromUrl('tilt') ?? tuning.camera.tilt,
  /** Swipe to steer the ball carrier (sidestep or wait) once someone catches the ball. */
  steer: fromUrl('steer') !== 0,
};

/** The backward lean in radians (a negative x rotation tips the top away and the front up). */
export const tilt = (-experiment.tiltDeg * Math.PI) / 180;
