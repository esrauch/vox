/**
 * The music and the effects (TECHNICAL.md §8). The music is the soundtrack,
 * never a clock for play: `start()` (inside the PLAY tap, since browsers only
 * start audio from a gesture) begins the song looping, with its beat clock.
 * Pausing suspends the AudioContext, and the music freezes with it.
 */
import { suspendAudio, unlockAudio } from '../audio/context';
import { getMixer } from '../audio/mixer';
import { MusicPlayer, RENDER_RATE, prepareSong } from '../audio/music';
import { SfxPlayer, prepareSfx, type SfxId } from '../audio/sfx';
import { spookySurf } from '../audio/songs';
import { BeatClock } from '../beat/clock';

const SONG = spookySurf;

export class Conductor {
  private clock: BeatClock | null = null;
  private sfx: SfxPlayer | null = null;

  constructor() {
    // Rendering the song and effects doesn't need a tap, so start right away.
    void prepareSong(SONG);
    void prepareSfx(RENDER_RATE);
  }

  /** Whether the music (and so the tick) has started. */
  get started(): boolean {
    return this.clock !== null;
  }

  /** Start the song and its beat clock. Call from inside a tap. */
  async start(): Promise<void> {
    if (this.clock) return;
    const ctx = await unlockAudio();
    const mixer = getMixer(ctx);
    const music = new MusicPlayer(ctx, mixer, SONG, await prepareSong(SONG));
    this.sfx = new SfxPlayer(ctx, mixer, await prepareSfx(RENDER_RATE));
    const origin = ctx.currentTime + 0.1;
    music.start(origin);
    this.clock = new BeatClock(ctx);
    this.clock.startAt(SONG.bpm, origin);
  }

  /** Song beats heard by a performance-clock moment (ms), with the fraction; null before start. */
  beatAt(perfMs?: number): number | null {
    const heard = this.clock?.position(perfMs);
    return heard ? heard.index + Math.max(0, heard.phase) : null;
  }

  /** Freeze the music, and with it the beat. */
  pause(): void {
    void suspendAudio();
  }

  /** Carry on exactly where the pause left off. Call from inside a tap. */
  async resume(): Promise<void> {
    await unlockAudio();
  }

  play(id: SfxId): void {
    this.sfx?.play(id);
  }
}
