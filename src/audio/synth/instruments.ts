/**
 * The built-in synth's voices (TECHNICAL.md §8): a handful of simple
 * oscillator, noise and filter recipes. Each schedules one note into any
 * audio context (usually an OfflineAudioContext while rendering a stem).
 */

export type InstrumentId = 'kick' | 'snare' | 'hat' | 'bass' | 'organ' | 'lead' | 'pluck';

export interface NoteArgs {
  readonly ctx: BaseAudioContext;
  readonly out: AudioNode;
  readonly time: number;
  /** How long the note is held, in seconds. */
  readonly duration: number;
  readonly freqs: readonly number[];
  readonly velocity: number;
}

const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();

/** One second of white noise per context, shared by every noisy voice. */
export function noise(ctx: BaseAudioContext): AudioBuffer {
  let buf = noiseBuffers.get(ctx);
  if (!buf) {
    buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buf.getChannelData(0);
    // A fixed seed keeps renders identical from run to run.
    let seed = 12345;
    for (let i = 0; i < data.length; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      data[i] = (seed / 0x7fffffff) * 2 - 1;
    }
    noiseBuffers.set(ctx, buf);
  }
  return buf;
}

/** An attack/decay/sustain/release gain envelope, returned so a voice can connect into it. */
function envelope(
  ctx: BaseAudioContext,
  out: AudioNode,
  time: number,
  peak: number,
  attack: number,
  decay: number,
  sustain: number,
  hold: number,
  release: number,
): GainNode {
  const g = ctx.createGain();
  const p = g.gain;
  p.setValueAtTime(0.0001, time);
  p.linearRampToValueAtTime(peak, time + attack);
  p.setTargetAtTime(peak * sustain, time + attack, decay / 3);
  const end = time + Math.max(hold, attack);
  p.setValueAtTime(peak * sustain, end);
  p.setTargetAtTime(0.0001, end, release / 3);
  g.connect(out);
  return g;
}

function osc(
  ctx: BaseAudioContext,
  type: OscillatorType,
  freq: number,
  time: number,
  stop: number,
) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, time);
  o.start(time);
  o.stop(stop);
  return o;
}

function noiseSource(ctx: BaseAudioContext, time: number, stop: number): AudioBufferSourceNode {
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx);
  src.loop = true;
  src.start(time, Math.random() * 0.5);
  src.stop(stop);
  return src;
}

export const INSTRUMENTS: Record<InstrumentId, (a: NoteArgs) => void> = {
  kick({ ctx, out, time, velocity }) {
    const o = osc(ctx, 'sine', 150, time, time + 0.4);
    o.frequency.exponentialRampToValueAtTime(42, time + 0.12);
    const g = envelope(ctx, out, time, velocity, 0.002, 0.25, 0, 0.002, 0.2);
    o.connect(g);
  },

  snare({ ctx, out, time, velocity }) {
    const n = noiseSource(ctx, time, time + 0.3);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1400;
    n.connect(hp).connect(envelope(ctx, out, time, velocity * 0.7, 0.001, 0.12, 0, 0.001, 0.1));
    const body = osc(ctx, 'triangle', 190, time, time + 0.15);
    body.frequency.exponentialRampToValueAtTime(120, time + 0.08);
    body.connect(envelope(ctx, out, time, velocity * 0.5, 0.001, 0.06, 0, 0.001, 0.05));
  },

  hat({ ctx, out, time, velocity }) {
    const open = velocity >= 1;
    const n = noiseSource(ctx, time, time + (open ? 0.3 : 0.1));
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7500;
    n.connect(hp).connect(
      envelope(ctx, out, time, velocity * 0.35, 0.001, open ? 0.2 : 0.04, 0, 0.001, 0.03),
    );
  },

  bass({ ctx, out, time, duration, freqs, velocity }) {
    for (const f of freqs) {
      const o = osc(ctx, 'sawtooth', f, time, time + duration + 0.3);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.Q.value = 6;
      lp.frequency.setValueAtTime(1400, time);
      lp.frequency.setTargetAtTime(420, time, 0.06);
      o.connect(lp).connect(
        envelope(ctx, out, time, velocity * 0.6, 0.004, 0.15, 0.55, duration * 0.9, 0.06),
      );
    }
  },

  organ({ ctx, out, time, duration, freqs, velocity }) {
    // Drawbars: fundamental plus a few harmonics, with a slow wobble for spookiness.
    const wave = ctx.createPeriodicWave(
      new Float32Array([0, 1, 0.6, 0.35, 0.2, 0, 0.12]),
      new Float32Array(7),
    );
    const lfo = osc(ctx, 'sine', 5.5, time, time + duration + 0.3);
    for (const f of freqs) {
      const o = ctx.createOscillator();
      o.setPeriodicWave(wave);
      o.frequency.setValueAtTime(f, time);
      const depth = ctx.createGain();
      depth.gain.value = f * 0.006;
      lfo.connect(depth).connect(o.frequency);
      o.start(time);
      o.stop(time + duration + 0.3);
      o.connect(
        envelope(
          ctx,
          out,
          time,
          (velocity * 0.22) / Math.sqrt(freqs.length),
          0.01,
          0.1,
          0.8,
          duration * 0.85,
          0.08,
        ),
      );
    }
  },

  lead({ ctx, out, time, duration, freqs, velocity }) {
    // A twangy, slightly driven surf-guitar-ish pluck with a little vibrato as it rings.
    for (const f of freqs) {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.Q.value = 3;
      lp.frequency.setValueAtTime(5000, time);
      lp.frequency.setTargetAtTime(1600, time, 0.12);
      const env = envelope(
        ctx,
        out,
        time,
        velocity * 0.32,
        0.003,
        0.35,
        0.45,
        duration * 0.95,
        0.12,
      );
      lp.connect(env);
      const vib = osc(ctx, 'sine', 6, time, time + duration + 0.4);
      const vibDepth = ctx.createGain();
      vibDepth.gain.setValueAtTime(0, time);
      vibDepth.gain.linearRampToValueAtTime(f * 0.012, time + Math.min(0.3, duration));
      vib.connect(vibDepth);
      for (const [type, detune] of [
        ['sawtooth', -6],
        ['square', 6],
      ] as const) {
        const o = osc(ctx, type, f, time, time + duration + 0.4);
        o.detune.value = detune;
        vibDepth.connect(o.frequency);
        o.connect(lp);
      }
    }
  },

  pluck({ ctx, out, time, duration, freqs, velocity }) {
    for (const f of freqs) {
      const o = osc(ctx, 'triangle', f, time, time + duration + 0.3);
      o.connect(envelope(ctx, out, time, velocity * 0.4, 0.002, 0.18, 0.2, duration * 0.6, 0.1));
    }
  },
};

/** A soft clipper, for a little drive. */
export function softClip(ctx: BaseAudioContext, amount: number): WaveShaperNode {
  const shaper = ctx.createWaveShaper();
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * (1 + amount * 4)) / Math.tanh(1 + amount * 4);
  }
  shaper.curve = curve;
  return shaper;
}
