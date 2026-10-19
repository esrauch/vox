/**
 * What the player sees and hears when things happen: sim events turned into
 * sound effects and HUD pops. The words for every pop live here.
 */
import type { SfxId } from '../audio/sfx';
import { FORMS } from '../content/roster';
import type { CatchQuality, RunState, SimEvent, ThrowProblem } from '../sim/types';
import { yardsText } from '../sim/run';
import { statName } from './rosterText';
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
  state: RunState,
  hud: Hud,
  play: (id: SfxId) => void,
  /** The Boss drive goes for the end zone: its "first down" is a touchdown. */
  touchdown = false,
): void {
  const { screen, roster } = state;
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
        hud.pop(e.contested ? 'CAUGHT!' : CATCH_TEXT[e.quality], 'good');
        break;
      case 'dropped':
        play('fumble');
        play('chant');
        hud.pop('DROPPED!', 'bad');
        break;
      case 'shook': {
        const carrying = screen.ball.at === 'carried' && screen.ball.by === e.id;
        hud.pop(carrying ? 'SHOOK HIM!' : 'GOT OPEN!', 'good');
        break;
      }
      case 'brokeTackle':
        hud.pop('BROKE IT!', 'good');
        break;
      case 'transformed':
        hud.pop(`${roster[e.slot]?.name ?? 'Someone'} is a ${FORMS[e.form].name}!`, 'good');
        break;
      case 'trained':
        hud.pop(`${roster[e.slot]?.name ?? 'Someone'} +1 ${statName(e.stat)}`, 'good');
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
      case 'downEnded':
        if (e.result === 'firstDown') {
          play('touchdown');
          hud.pop(touchdown ? 'TOUCHDOWN!' : 'FIRST DOWN!', 'good');
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
