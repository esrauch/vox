/**
 * The lyric timer (/dev/lyrics.html): tap along to "We Got Jack Back" to
 * stamp when each line starts (and, for a gap, ends), for the sing-along
 * video. Saves itself in localStorage; the result downloads as JSON.
 */
import songUrl from '../../assets/music/weGotJackBack.mp3?url';
import { WE_GOT_JACK_BACK_LYRICS } from '../content/lyrics/weGotJackBack';

interface Timing {
  start: number | null;
  /** Set when the line finishes before the next one starts (a gap): the screen goes blank. */
  end: number | null;
}

const KEY = 'lyricTimer:weGotJackBack';
const lines = WE_GOT_JACK_BACK_LYRICS;

const $ = <T extends HTMLElement>(sel: string): T => {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`missing ${sel}`);
  return el;
};
const audio = $<HTMLAudioElement>('audio');
const list = $<HTMLOListElement>('.lines');
const out = $<HTMLTextAreaElement>('.out');
const now = $('.preview .now');
const next = $('.preview .next');
audio.src = songUrl;

function load(): Timing[] {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Timing[] | null;
    if (Array.isArray(saved) && saved.length === lines.length) return saved;
  } catch {
    // Nothing saved, or it's unreadable: start fresh.
  }
  return lines.map(() => ({ start: null, end: null }));
}

let timings = load();
/** The line the next Space stamps. */
let cursor = Math.max(
  0,
  timings.findIndex((t) => t.start === null),
);
if (timings.every((t) => t.start !== null)) cursor = lines.length;
/** Stamps in the order they were made, for Backspace. */
const history: { line: number; field: 'start' | 'end' }[] = [];

const fmt = (t: number | null): string =>
  t === null ? '—' : `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}`;

function save(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(timings));
  } catch {
    // Storage blocked: the textarea still has it.
  }
  out.value = JSON.stringify(
    {
      track: 'weGotJackBack',
      lines: lines.map((l, i) => ({ text: l.text, ...timings[i] })),
    },
    null,
    2,
  );
}

function render(): void {
  list.replaceChildren(
    ...lines.map((l, i) => {
      const li = document.createElement('li');
      const t = timings[i];
      li.className = `${t?.start !== null ? 'done' : ''}${i === cursor ? ' cursor' : ''}`;
      li.innerHTML = `<span class="t"></span><span class="x"></span><span class="sec"></span>`;
      const [time, text, sec] = [...li.children] as HTMLElement[];
      if (time)
        time.textContent = `${fmt(t?.start ?? null)}${t?.end != null ? ` → ${fmt(t.end)}` : ''}`;
      if (text) text.textContent = l.text;
      if (sec && (i === 0 || lines[i - 1]?.section !== l.section)) sec.textContent = l.section;
      li.addEventListener('click', () => {
        cursor = i;
        const start = timings[i]?.start;
        if (start != null) audio.currentTime = Math.max(0, start - 2);
        render();
      });
      return li;
    }),
  );
  list.children[cursor]?.scrollIntoView({ block: 'center' });
  save();
}

/** The line being sung at time `t` (by the stamps so far), or -1. */
function singing(t: number): number {
  let at = -1;
  timings.forEach((x, i) => {
    if (x.start !== null && x.start <= t) at = i;
  });
  const line = timings[at];
  if (line && line.end !== null && t >= line.end) return -1;
  return at;
}

function tick(): void {
  const i = singing(audio.currentTime);
  now.textContent = lines[i]?.text ?? '';
  next.textContent = lines[i + 1]?.text ?? '';
  [...list.children].forEach((li, k) => li.classList.toggle('singing', k === i));
  requestAnimationFrame(tick);
}

document.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  const t = audio.currentTime;
  if (e.code === 'Space') {
    e.preventDefault();
    const line = timings[cursor];
    if (!line) return;
    line.start = t;
    line.end = null;
    history.push({ line: cursor, field: 'start' });
    cursor++;
    render();
  } else if (e.code === 'Enter') {
    e.preventDefault();
    const last = cursor - 1;
    const line = timings[last];
    if (!line || line.start === null || t <= line.start) return;
    line.end = t;
    history.push({ line: last, field: 'end' });
    render();
  } else if (e.code === 'Backspace') {
    e.preventDefault();
    const undo = history.pop();
    if (!undo) return;
    const line = timings[undo.line];
    if (!line) return;
    if (undo.field === 'start') {
      line.start = null;
      line.end = null;
      cursor = undo.line;
    } else {
      line.end = null;
    }
    audio.currentTime = Math.max(0, t - 3);
    render();
  } else if (e.code === 'ArrowLeft') {
    audio.currentTime = Math.max(0, t - 5);
  } else if (e.code === 'ArrowRight') {
    audio.currentTime = t + 5;
  } else if (e.code === 'KeyP') {
    if (audio.paused) void audio.play();
    else audio.pause();
  }
});

$('.download').addEventListener('click', () => {
  const blob = new Blob([out.value], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'weGotJackBack.timings.json';
  a.click();
  URL.revokeObjectURL(a.href);
});
$('.reset').addEventListener('click', () => {
  if (!confirm('Clear every timing?')) return;
  timings = lines.map(() => ({ start: null, end: null }));
  cursor = 0;
  history.length = 0;
  render();
});

render();
requestAnimationFrame(tick);
