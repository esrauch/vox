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

  /** Show the Break it! meter (null hides it): the sweet spot, the close band, and the marker. */
  setMeter(
    meter: { sweet: { from: number; to: number }; near: number; marker: number } | null,
  ): void {
    this.breaking = meter !== null;
    this.meter.hidden = !meter;
    if (!meter) return;
    const pct = (x: number): string => `${Math.max(0, Math.min(1, x)) * 100}%`;
    this.sweet.style.left = pct(meter.sweet.from);
    this.sweet.style.width = pct(meter.sweet.to - meter.sweet.from);
    this.near.style.left = pct(meter.sweet.from - meter.near);
    this.near.style.width = pct(meter.sweet.to - meter.sweet.from + 2 * meter.near);
    this.marker.style.left = pct(meter.marker);
  }
}
