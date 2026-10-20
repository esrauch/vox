/**
 * The arcade game's own controls over the canvas (GAMEPLAY.md, Controls):
 * the THROW and RUN buttons on a pass play, and the Break it! meter, a bar
 * with the sweet spot and the "close" band and a marker crossing it. During
 * Break it! a tap anywhere counts. Buttons fire on press, not release: in a
 * timing game every frame counts.
 */
import './controls.css';

export interface ControlHandlers {
  onThrow(): void;
  onRun(): void;
  onBreakTap(): void;
}

export class ArcadeControls {
  private readonly root: HTMLElement;
  private readonly buttons: HTMLElement;
  private readonly meter: HTMLElement;
  private readonly sweet: HTMLElement;
  private readonly near: HTMLElement;
  private readonly marker: HTMLElement;
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
        </div>
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
    const press = (el: HTMLElement, fn: () => void): void =>
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        fn();
      });
    press(q('.arc-throw'), () => handlers.onThrow());
    press(q('.arc-run'), () => handlers.onRun());
    press(this.meter, () => handlers.onBreakTap());
    // In Break it!, a tap anywhere on the screen counts.
    window.addEventListener('pointerdown', () => {
      if (this.breaking) handlers.onBreakTap();
    });
  }

  /** Show THROW and RUN (on a pass play, while the QB has the ball). */
  setButtons(show: boolean): void {
    this.buttons.hidden = !show;
  }

  /**
   * Show the Break it! meter (null hides it): the sweet spot, the close band,
   * and the marker. Everything comes measured along the marker's trip; `dir`
   * -1 mirrors it, so the marker runs right to left.
   */
  setMeter(
    meter: {
      sweet: { from: number; to: number };
      near: number;
      marker: number;
      dir: 1 | -1;
    } | null,
  ): void {
    this.breaking = meter !== null;
    this.meter.hidden = !meter;
    if (!meter) return;
    const clamp = (x: number): number => Math.max(0, Math.min(1, x));
    const pct = (x: number): string => `${clamp(x) * 100}%`;
    // A span along the trip, as [left, width] on the bar.
    const span = (from: number, to: number): [string, string] => {
      const [a, b] = meter.dir === 1 ? [clamp(from), clamp(to)] : [clamp(1 - to), clamp(1 - from)];
      return [pct(a), pct(b - a)];
    };
    [this.sweet.style.left, this.sweet.style.width] = span(meter.sweet.from, meter.sweet.to);
    [this.near.style.left, this.near.style.width] = span(
      meter.sweet.from - meter.near,
      meter.sweet.to + meter.near,
    );
    this.marker.style.left = pct(meter.dir === 1 ? meter.marker : 1 - meter.marker);
  }
}
