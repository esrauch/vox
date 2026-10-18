/**
 * What the player sees and hears when things happen: sim events turned into
 * sound effects and HUD pops. The words for every pop live here.
 */
import type { SfxId } from '../audio/sfx';
import type { CatchQuality, ScreenState, SimEvent, ThrowProblem } from '../sim/types';
import { yardsText } from '../sim/run';
import type { Hud } from '../ui/hud';

export const THROW_PROBLEM_TEXT: Readonly<Record<ThrowProblem, string>> = {
  notInPlay: 'not in play',
  noBall: 'no ball',
  offField: 'off the field',
  tooFar: 'out of range',
  tooClose: 'too close',
};

const CATCH_TEXT: Readonly<Record<CatchQuality, string>> = {
  perfect: 'PERFECT!',
  good: 'GOOD!',
  ok: 'OK',
};

/** How a tackle's gain (in rows: half-yards) reads. */
function gainText(gained: number): string {
  if (gained > 0) return `+${yardsText(gained)} ${gained <= 2 ? 'YARD' : 'YARDS'}`;
  if (gained < 0) return `LOSS OF ${yardsText(-gained)}`;
  return 'NO GAIN';
}

export function react(
  events: readonly SimEvent[],
  screen: ScreenState,
  hud: Hud,
  play: (id: SfxId) => void,
): void {
  // One hop sound per beat, and only for your players' hops.
  const playerIds = new Set(screen.players.map((s) => s.id));
  if (events.some((e) => e.type === 'hop' && playerIds.has(e.id))) play('hop');
  for (const e of events) {
    switch (e.type) {
      case 'thrown':
        play('throw');
        break;
      case 'caught':
        play(e.quality === 'perfect' ? 'cleanCatch' : 'catch');
        hud.pop(CATCH_TEXT[e.quality], 'good');
        break;
      case 'blocked':
        // Every failed pass gets the comedy of a fumble, but it only costs the down.
        play('fumble');
        play('chant');
        hud.pop('BLOCKED!', 'bad');
        break;
      case 'incomplete':
        play('fumble');
        hud.pop('INCOMPLETE', 'bad');
        break;
      case 'sacked':
        play('sack');
        hud.pop('SACKED!', 'bad');
        break;
      case 'tackled':
        play('burst');
        break;
      case 'fendedOff':
        hud.pop('SHRUGGED OFF!', 'good');
        break;
      case 'downEnded':
        if (e.result === 'firstDown') {
          play('touchdown');
          hud.pop('FIRST DOWN!', 'good');
        } else if (e.result === 'tackled') {
          hud.pop(gainText(e.gained), e.gained > 0 ? 'good' : 'bad');
        }
        break;
      case 'throwRejected':
        hud.pop(THROW_PROBLEM_TEXT[e.reason], 'bad');
        break;
      default:
        break;
    }
  }
}
