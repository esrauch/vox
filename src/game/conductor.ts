/**
 * The music and the effects (TECHNICAL.md §8). The music is the soundtrack,
 * never a clock for play: `start()` (inside the PLAY tap, since browsers only
 * start audio from a gesture) begins a song looping, with its beat clock.
 * `setSong` switches songs: every song shares one beat grid, so the new one
 * comes in beat for beat, crossfading over two bars from the next bar line.
 * A recorded track (audio/tracks.ts, the win screen's) crossfades in at once,
 * since it isn't on the beat grid, and plays once.
 * Pausing suspends the AudioContext, and the music freezes with it.
 */
import { suspendAudio, unlockAudio } from '../audio/context';
import { getMixer, type Mixer } from '../audio/mixer';
import { MusicPlayer, RENDER_RATE, prepareSong } from '../audio/music';
import { SfxPlayer, prepareSfx, type SfxId } from '../audio/sfx';
import { GAME_SONGS, SONG_GRID } from '../audio/songs';
import { WIN_TRACK, fetchTrack, type Track } from '../audio/tracks';
import type { Song } from '../audio/synth/render';
import { BeatClock } from '../beat/clock';

/** A crossfade between songs takes this many bars, starting on a bar line. */
const CROSSFADE_BARS = 2;
const BAR_SECONDS = (SONG_GRID.beatsPerBar * 60) / SONG_GRID.bpm;
/**
 * A recorded track's level against the synth songs: a mastered track is far
 * louder, so it's turned down to sit with them.
 */
const TRACK_LEVEL = 0.45;

/** Something playing: a song's stems, or a recorded track. */
interface Playing {
  readonly id: string;
  fadeOut(at: number, seconds: number): void;
}

/** What can be asked to play. */
export type Music = Song | Track;
const isTrack = (m: Music): m is Track => 'url' in m;

export class Conductor {
  private clock: BeatClock | null = null;
  private sfx: SfxPlayer | null = null;
  private audio: { ctx: AudioContext; mixer: Mixer; origin: number } | null = null;
  private playing: Playing | null = null;
  /** What should be playing (the last asked for). */
  private wanted: Music | null = null;
  private readonly decoded = new Map<string, Promise<AudioBuffer>>();

  constructor() {
    // Rendering the songs and effects doesn't need a tap, so start right away: the first
    // song on its own, so it's ready soonest, then the rest.
    const [first, ...rest] = GAME_SONGS;
    void prepareSong(first).then(() => {
      for (const song of rest) void prepareSong(song);
      void fetchTrack(WIN_TRACK).catch(() => undefined);
    });
    void prepareSfx(RENDER_RATE);
  }

  /** Whether the music (and so the tick) has started. */
  get started(): boolean {
    return this.clock !== null;
  }

  /** Start `song` and the beat clock. Call from inside a tap. */
  async start(song: Song): Promise<void> {
    if (this.clock) return;
    this.wanted = song;
    const ctx = await unlockAudio();
    const mixer = getMixer(ctx);
    const music = new MusicPlayer(ctx, mixer, song, await prepareSong(song));
    this.sfx = new SfxPlayer(ctx, mixer, await prepareSfx(RENDER_RATE));
    const origin = ctx.currentTime + 0.1;
    music.start(origin);
    this.audio = { ctx, mixer, origin };
    this.playing = { id: song.id, fadeOut: (at, s) => music.fadeOut(at, s) };
    this.clock = new BeatClock(ctx);
    this.clock.startAt(song.bpm, origin);
    // Asked for another song while this one was getting ready: switch now.
    if (this.wanted.id !== song.id) this.setSong(this.wanted);
  }

  /**
   * Play `music` (a no-op if it's already playing). A song crossfades in, in
   * time with the beat; a recorded track crossfades in at once and plays once.
   */
  setSong(music: Music): void {
    this.wanted = music;
    if (!this.audio || !this.playing || this.playing.id === music.id) return;
    void (isTrack(music) ? this.fadeToTrack(music) : this.crossfade(music));
  }

  /** Still wanted, and not already playing (after waiting for something to load). */
  private stillWanted(id: string): boolean {
    return this.wanted?.id === id && this.playing?.id !== id;
  }

  private async crossfade(song: Song): Promise<void> {
    const stems = await prepareSong(song);
    const audio = this.audio;
    const old = this.playing;
    if (!audio || !old || !this.stillWanted(song.id)) return;
    const { ctx, mixer, origin } = audio;
    const at = ctx.currentTime + 0.05;
    const beat = ((at - origin) * SONG_GRID.bpm) / 60;
    const bar = origin + Math.ceil((at - origin) / BAR_SECONDS) * BAR_SECONDS;
    const seconds = CROSSFADE_BARS * BAR_SECONDS;
    const next = new MusicPlayer(ctx, mixer, song, stems);
    next.start(at, beat, { at: bar, seconds });
    old.fadeOut(bar, seconds);
    this.playing = { id: song.id, fadeOut: (t, s) => next.fadeOut(t, s) };
  }

  private async fadeToTrack(track: Track): Promise<void> {
    const audio = this.audio;
    if (!audio) return;
    let buffer = this.decoded.get(track.id);
    if (!buffer) {
      buffer = fetchTrack(track).then((bytes) => audio.ctx.decodeAudioData(bytes.slice(0)));
      this.decoded.set(track.id, buffer);
    }
    const decoded = await buffer.catch(() => null);
    const old = this.playing;
    // Couldn't load it: carry on with what's playing.
    if (!decoded || !old || !this.stillWanted(track.id)) return;
    const { ctx, mixer } = audio;
    const at = ctx.currentTime + 0.05;
    const seconds = CROSSFADE_BARS * BAR_SECONDS;
    const source = ctx.createBufferSource();
    source.buffer = decoded;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(TRACK_LEVEL, at + seconds);
    source.connect(gain).connect(mixer.music);
    source.start(at);
    old.fadeOut(at, seconds);
    this.playing = {
      id: track.id,
      fadeOut: (t, s) => {
        gain.gain.setValueAtTime(TRACK_LEVEL, t);
        gain.gain.linearRampToValueAtTime(0, t + s);
        source.stop(t + s + 0.05);
      },
    };
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
