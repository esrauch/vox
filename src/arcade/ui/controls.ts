/**
 * The arcade game's own controls over the canvas (GAMEPLAY.md, Controls):
 * the THROW and RUN buttons on a pass play, and the Break it! panel, one of
 * three: the bar (a sweet spot and "close" band, and a marker crossing it),
 * MASH! (a filling bar), or JUKE! (an arrow). During Break it! a tap
 * anywhere counts; for a juke, which half of the screen you tap is the side.
 * Buttons fire on press, not release: in a timing game every frame counts.
 */
import './controls.css';

export interface ControlHandlers {
  onThrow(): void;
  onRun(): void;
  /** A tap in Break it!, on the left (-1) or right (+1) half of the screen. */
  onBreakTap(side: -1 | 1): void;
}

/** What the Break it! panel shows. Bar positions are measured along the marker's trip. */
export type BreakView =
  | {
      readonly kind: 'bar';
      readonly sweet: { readonly from: number; readonly to: number };
      readonly near: number;
      readonly marker: number;
      readonly dir: 1 | -1;
    }
  | { readonly kind: 'mash'; readonly fill: number; readonly left: number }
  /** The side the arrow points, or null before it shows. */
  | { readonly kind: 'juke'; readonly side: -1 | 1 | null };

export class ArcadeControls {
  private readonly root: HTMLElement;
  private readonly buttons: HTMLElement;
  private readonly meter: HTMLElement;
  private readonly sweet: HTMLElement;
  private readonly near: HTMLElement;
  private readonly marker: HTMLElement;
  private readonly title: HTMLElement;
  private readonly hint: HTMLElement;
  private readonly bar: HTMLElement;
  private readonly fill: HTMLElement;
  private readonly arrow: HTMLElement;
  private breaking = false;

  constructor(parent: HTMLElement, handlers: ControlHandlers) {
    this.root = document.createElement('div');
    this.root.className = 'arc-controls';
    this.root.innerHTML = `
      <div class="arc-buttons" hidden>
        <button class="arc-btn arc-run interactive">RUN</button>
        <button class="arc-btn arc-throw interactive">THROW</button>
      </div>
      <div class="arc-meter interactive" hidden>
        <div class="arc-meter-title">BREAK IT!</div>
        <div class="arc-meter-bar">
          <div class="arc-near"></div>
          <div class="arc-sweet"></div>
          <div class="arc-marker"></div>
          <div class="arc-fill"></div>
        </div>
        <div class="arc-arrow"></div>
        <div class="arc-meter-hint">TAP!</div>
      </div>`;
    parent.append(this.root);
    const q = (sel: string): HTMLElement => {
      const el = this.root.querySelector<HTMLElement>(sel);
      if (!el) throw new Error(`controls missing ${sel}`);
      return el;
    };
    this.buttons = q('.arc-buttons');
    this.meter = q('.arc-meter');
    this.sweet = q('.arc-sweet');
    this.near = q('.arc-near');
    this.marker = q('.arc-marker');
    this.title = q('.arc-meter-title');
    this.hint = q('.arc-meter-hint');
    this.bar = q('.arc-meter-bar');
    this.fill = q('.arc-fill');
    this.arrow = q('.arc-arrow');
    const press = (el: HTMLElement, fn: () => void): void =>
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        fn();
      });
    press(q('.arc-throw'), () => handlers.onThrow());
    press(q('.arc-run'), () => handlers.onRun());
    // In Break it!, a tap anywhere on the screen counts (its half is the side, for a juke).
    window.addEventListener('pointerdown', (e) => {
      if (this.breaking) handlers.onBreakTap(e.clientX < window.innerWidth / 2 ? -1 : 1);
    });
  }

  /** Show THROW and RUN (on a pass play, while the QB has the ball). */
  setButtons(show: boolean): void {
    this.buttons.hidden = !show;
  }

  /** Show the Break it! panel (null hides it). */
  setBreak(view: BreakView | null): void {
    this.breaking = view !== null;
    this.meter.hidden = !view;
    if (!view) return;
    const clamp = (x: number): number => Math.max(0, Math.min(1, x));
    const pct = (x: number): string => `${clamp(x) * 100}%`;
    const isBar = view.kind === 'bar';
    this.bar.hidden = view.kind === 'juke';
    this.sweet.hidden = !isBar;
    this.near.hidden = !isBar;
    this.marker.hidden = !isBar;
    this.fill.hidden = view.kind !== 'mash';
    this.arrow.hidden = view.kind !== 'juke';
    switch (view.kind) {
      case 'bar': {
        this.title.textContent = 'BREAK IT!';
        this.hint.textContent = 'TAP IN THE GREEN!';
        // A span along the trip, as [left, width] on the bar (mirrored when it runs right to left).
        const span = (from: number, to: number): [string, string] => {
          const [a, c] =
            view.dir === 1 ? [clamp(from), clamp(to)] : [clamp(1 - to), clamp(1 - from)];
          return [pct(a), pct(c - a)];
        };
        [this.sweet.style.left, this.sweet.style.width] = span(view.sweet.from, view.sweet.to);
        [this.near.style.left, this.near.style.width] = span(
          view.sweet.from - view.near,
          view.sweet.to + view.near,
        );
        this.marker.style.left = pct(view.dir === 1 ? view.marker : 1 - view.marker);
        break;
      }
      case 'mash':
        this.title.textContent = 'MASH!';
        this.hint.textContent = `TAP TAP TAP! ${Math.ceil(view.left * 10) / 10}`;
        this.fill.style.width = pct(view.fill);
        break;
      case 'juke':
        this.title.textContent = 'JUKE!';
        this.arrow.textContent = view.side === null ? '…' : view.side < 0 ? '◀' : '▶';
        this.hint.textContent =
          view.side === null ? 'GET READY' : view.side < 0 ? 'TAP LEFT!' : 'TAP RIGHT!';
        break;
    }
  }
}
