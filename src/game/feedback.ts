/**
 * What the player sees and hears when things happen: sim events turned into
 * sound effects and HUD pops. The words for every pop live here.
 */
import type { SfxId } from '../audio/sfx';
import type { CatchQuality, FumbleReason, ScreenState, SimEvent, ThrowProblem } from '../sim/types';
import type { Hud } from '../ui/hud';

export const THROW_PROBLEM_TEXT: Readonly<Record<ThrowProblem, string>> = {
  notInPlay: 'not in play',
  noBall: 'no ball',
  offField: 'off the field',
  tooFar: 'out of range',
  tooClose: 'too close',
};

/** Fumbles with their own pop; the rest get the crowd's chant. */
const FUMBLE_TEXT: Partial<Record<FumbleReason, string>> = {
  sack: 'SACKED!',
  snatched: 'SNATCHED!',
};

const CATCH_TEXT: Readonly<Record<CatchQuality, string>> = {
  perfect: 'PERFECT!',
  good: 'GOOD!',
  ok: 'OK',
};

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
      case 'died':
        play('burst');
        break;
      case 'fumble':
        if (e.reason === 'sack') play('sack');
        play('fumble');
        play('chant');
        hud.pop(FUMBLE_TEXT[e.reason] ?? 'FEE FI FO FUMBLE!', 'bad');
        break;
      case 'touchdown':
        play('touchdown');
        break;
      case 'wipeout':
        hud.pop('WIPEOUT!', 'bad');
        break;
      case 'throwRejected':
        hud.pop(THROW_PROBLEM_TEXT[e.reason], 'bad');
        break;
      default:
        break;
    }
  }
}
