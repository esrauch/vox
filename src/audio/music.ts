/**
 * Music playback (TECHNICAL.md §8): every stem of the current song loops
 * together as a pre-rendered buffer. Layers fade stems in and out (the setup
 * huddle plays only some; HIKE! brings in the rest), always on the beat grid.
 */
import type { Mixer } from './mixer';
import { loopSeconds, renderSong, type Song } from './synth/render';

export type Layer = 'setup' | 'play';

/** The rate songs are rendered at. Rendering doesn't need the live context, so it can start at load. */
export const RENDER_RATE = 48_000;

const rendered = new Map<string, Promise<Map<string, AudioBuffer>>>();

/** Start rendering a song (once); resolves to its stem buffers. */
export function prepareSong(song: Song): Promise<Map<string, AudioBuffer>> {
  let p = rendered.get(song.id);
  if (!p) {
    p = renderSong(song, RENDER_RATE);
    rendered.set(song.id, p);
  }
  return p;
}

interface Voice {
  readonly stem: string;
  readonly source: AudioBufferSourceNode;
  readonly gain: GainNode;
}

export class MusicPlayer {
  private voices: Voice[] = [];
  /** Context time at which the loop was (or would have been) at its start. */
  private loopStart = 0;
  private layer: Layer = 'setup';

  constructor(
    private readonly ctx: AudioContext,
    private readonly mixer: Mixer,
    readonly song: Song,
    private readonly stems: Map<string, AudioBuffer>,
  ) {}

  get playing(): boolean {
    return this.voices.length > 0;
  }

  get currentLayer(): Layer {
    return this.layer;
  }

  /**
   * Start every stem so that `beatInLoop` beats into the song lands exactly at
   * context time `time`.
   */
  start(time: number, layer: Layer, beatInLoop = 0): void {
    this.stop();
    const loop = loopSeconds(this.song);
    const offset = ((((beatInLoop * 60) / this.song.bpm) % loop) + loop) % loop;
    this.loopStart = time - offset;
    this.layer = layer;
    for (const stem of this.song.stems) {
      const buffer = this.stems.get(stem.id);
      if (!buffer) continue;
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const gain = this.ctx.createGain();
      gain.gain.value = this.inLayer(stem.id, layer) ? 1 : 0;
      source.connect(gain).connect(this.mixer.music);
      source.start(time, offset);
      this.voices.push({ stem: stem.id, source, gain });
    }
  }

  /** Fade stems in or out to match a layer, landing at context time `time`. */
  setLayer(layer: Layer, time: number): void {
    this.layer = layer;
    for (const v of this.voices) {
      const target = this.inLayer(v.stem, layer) ? 1 : 0;
      v.gain.gain.cancelScheduledValues(time);
      v.gain.gain.setTargetAtTime(target, time, 0.015);
    }
  }

  stop(fade = 0): void {
    const now = this.ctx.currentTime;
    for (const v of this.voices) {
      if (fade > 0) {
        v.gain.gain.setTargetAtTime(0, now, fade / 3);
        v.source.stop(now + fade);
      } else {
        v.source.stop();
      }
    }
    this.voices = [];
  }

  /** The context time of the first beat at or after `after`. */
  nextBeatTime(after: number): number {
    const beat = 60 / this.song.bpm;
    return this.loopStart + Math.ceil((after - this.loopStart) / beat) * beat;
  }

  now(): number {
    return this.ctx.currentTime;
  }

  private inLayer(stem: string, layer: Layer): boolean {
    return this.song.layers[layer].includes(stem);
  }
}
