/**
 * Dev page for audio (M1.5): play every SFX and every song stem, with mutes,
 * and draw the waveform of whatever played last. Render modes produce WAVs
 * and waveform images for `npm run render-audio`, so levels and loop seams
 * can be checked without listening (TECHNICAL.md §13).
 */
import { unlockAudio } from '../audio/context';
import { getMixer } from '../audio/mixer';
import { RENDER_RATE, prepareSong } from '../audio/music';
import { SFX, prepareSfx, type SfxId } from '../audio/sfx';
import { SONGS } from '../audio/songs/spookySurf';
import { loopSeconds, type Song } from '../audio/synth/render';
import { encodeWav, levels } from '../audio/wav';

const $ = <T extends HTMLElement>(sel: string): T => {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`audio.html is missing ${sel}`);
  return el;
};
const songRow = $('#song');
const stemRow = $('#stems');
const sfxRow = $('#sfx');
const wave = $<HTMLCanvasElement>('#wave');
const status = $('#status');

const params = new URLSearchParams(location.search);
const renderMode = params.get('render');
const song = SONGS[0] as Song;

if (renderMode) void renderForTool(renderMode, params.get('id') ?? '');
else interactive();

function interactive(): void {
  const muted = new Set<string>();
  let playing: { source: AudioBufferSourceNode; gain: GainNode; stem: string }[] = [];

  const button = (row: HTMLElement, text: string, onClick: () => void): void => {
    const b = document.createElement('button');
    b.textContent = text;
    b.addEventListener('click', onClick);
    row.append(b);
  };

  const stopSong = (): void => {
    for (const p of playing) p.source.stop();
    playing = [];
  };

  const playSong = async (layer: 'setup' | 'play'): Promise<void> => {
    const ctx = await unlockAudio();
    status.textContent = `Rendering ${song.name}…`;
    const stems = await prepareSong(song);
    stopSong();
    const when = ctx.currentTime + 0.1;
    for (const stem of song.stems) {
      const buffer = stems.get(stem.id);
      if (!buffer) continue;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const gain = ctx.createGain();
      gain.gain.value = song.layers[layer].includes(stem.id) && !muted.has(stem.id) ? 1 : 0;
      source.connect(gain).connect(getMixer(ctx).music);
      source.start(when);
      playing.push({ source, gain, stem: stem.id });
    }
    draw(mixStems(stems, song.layers[layer]));
    status.textContent = `${song.name} · ${song.bpm} BPM · ${song.bars} bars (${loopSeconds(song)}s loop) · ${layer} layer`;
  };

  button(songRow, `▶ ${song.name}: setup`, () => void playSong('setup'));
  button(songRow, `▶ ${song.name}: full`, () => void playSong('play'));
  button(songRow, '■ Stop', stopSong);
  for (const stem of song.stems) {
    const label = document.createElement('label');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = true;
    box.addEventListener('change', () => {
      if (box.checked) muted.delete(stem.id);
      else muted.add(stem.id);
      for (const p of playing) if (p.stem === stem.id) p.gain.gain.value = box.checked ? 1 : 0;
    });
    label.append(box, ` ${stem.id}`);
    stemRow.append(label);
  }

  for (const id of Object.keys(SFX) as SfxId[]) {
    button(sfxRow, id, async () => {
      const ctx = await unlockAudio();
      const buffers = await prepareSfx(RENDER_RATE);
      const buffer = buffers.get(id);
      if (!buffer) return;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(getMixer(ctx).sfx);
      src.start();
      draw(buffer.getChannelData(0));
      const { peakDb, rmsDb } = levels([buffer.getChannelData(0)]);
      status.textContent = `${id}: ${(buffer.duration * 1000).toFixed(0)} ms · peak ${peakDb.toFixed(1)} dBFS · RMS ${rmsDb.toFixed(1)} dBFS`;
    });
  }
}

/** Sum some stems into one mono track (as the mix bus would). */
function mixStems(stems: Map<string, AudioBuffer>, ids: readonly string[]): Float32Array {
  const first = stems.get(ids[0] ?? '');
  const out = new Float32Array(first?.length ?? 0);
  for (const id of ids) {
    const data = stems.get(id)?.getChannelData(0);
    if (!data) continue;
    for (let i = 0; i < out.length; i++) out[i] = (out[i] ?? 0) + (data[i] ?? 0);
  }
  return out;
}

function draw(samples: Float32Array): void {
  const dpr = Math.min(window.devicePixelRatio, 2);
  const w = (wave.width = wave.clientWidth * dpr);
  const h = (wave.height = wave.clientHeight * dpr);
  const g = wave.getContext('2d');
  if (!g) return;
  g.fillStyle = '#1d1630';
  g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(255,255,255,0.15)';
  g.beginPath();
  g.moveTo(0, h / 2);
  g.lineTo(w, h / 2);
  g.stroke();
  // Min/max per pixel column, in pumpkin; clipping would show as red at the edges.
  const per = Math.max(1, Math.floor(samples.length / w));
  for (let x = 0; x < w; x++) {
    let lo = 1;
    let hi = -1;
    for (let i = x * per; i < (x + 1) * per && i < samples.length; i++) {
      const s = samples[i] ?? 0;
      if (s < lo) lo = s;
      if (s > hi) hi = s;
    }
    g.fillStyle = hi >= 0.999 || lo <= -0.999 ? '#e8344e' : '#ff8a1f';
    g.fillRect(x, ((1 - hi) / 2) * h, 1, Math.max(1, ((hi - lo) / 2) * h));
  }
}

/** Render offline and expose the result for tools/audio/render.ts. */
async function renderForTool(mode: string, id: string): Promise<void> {
  document.body.classList.add('render');
  wave.style.height = '220px';
  let samples: Float32Array;
  let looping = false;
  if (mode === 'sfx') {
    const buffer = (await prepareSfx(RENDER_RATE)).get(id as SfxId);
    if (!buffer) throw new Error(`No sfx "${id}"`);
    samples = buffer.getChannelData(0);
  } else {
    const [songId, stemId] = id.split('/');
    const s = SONGS.find((x) => x.id === songId);
    if (!s) throw new Error(`No song "${songId}"`);
    const stems = await prepareSong(s);
    samples = mixStems(stems, mode === 'stem' && stemId ? [stemId] : s.layers.play);
    looping = true;
  }
  draw(samples);
  const { peakDb, rmsDb } = levels([samples]);
  // How big a jump there is where the loop wraps around, compared with the biggest step inside it.
  let maxStep = 0;
  for (let i = 1; i < samples.length; i++) {
    maxStep = Math.max(maxStep, Math.abs((samples[i] ?? 0) - (samples[i - 1] ?? 0)));
  }
  const seam = looping ? Math.abs((samples[0] ?? 0) - (samples[samples.length - 1] ?? 0)) : null;
  const wav = encodeWav([samples], RENDER_RATE);
  let binary = '';
  for (let i = 0; i < wav.length; i += 0x8000) {
    binary += String.fromCharCode(...wav.subarray(i, i + 0x8000));
  }
  Object.assign(window, {
    __result: {
      wav: btoa(binary),
      seconds: samples.length / RENDER_RATE,
      peakDb,
      rmsDb,
      seam,
      maxStep,
    },
  });
}
