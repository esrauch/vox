/**
 * The DOM HUD over the canvas (TECHNICAL.md §6): the ball pile, yards, the
 * context button (PLAY, HIKE, NEXT, AGAIN, RESUME) and message pops. Aiming
 * happens on the canvas itself (see game.ts).
 */
import './hud.css';

export interface HudHandlers {
  /** The context button: PLAY, HIKE, next screen, new run, or resume. */
  onAction(): void;
}

export class Hud {
  private readonly top: HTMLElement;
  private readonly balls: HTMLElement;
  private readonly yards: HTMLElement;
  private readonly message: HTMLElement;
  private readonly bottom: HTMLElement;
  private readonly actionButton: HTMLButtonElement;
  private readonly popEl: HTMLElement;
  private popTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(root: HTMLElement, handlers: HudHandlers) {
    root.innerHTML = `
      <div class="hud-top">
        <div class="hud-balls"></div>
        <div class="hud-yards"></div>
      </div>
      <div class="hud-message"></div>
      <div class="hud-pop"></div>
      <div class="hud-bottom">
        <div class="hud-controls">
          <button class="hud-action interactive"></button>
        </div>
      </div>`;
    const q = <T extends HTMLElement>(sel: string): T => {
      const el = root.querySelector<T>(sel);
      if (!el) throw new Error(`HUD is missing ${sel}`);
      return el;
    };
    this.top = q('.hud-top');
    this.balls = q('.hud-balls');
    this.yards = q('.hud-yards');
    this.message = q('.hud-message');
    this.bottom = q('.hud-bottom');
    this.actionButton = q<HTMLButtonElement>('.hud-action');
    this.popEl = q('.hud-pop');

    this.actionButton.addEventListener('click', () => handlers.onAction());
  }

  /** Space the HUD takes at the top and bottom, so the camera can fit the field between. */
  insets(): { top: number; bottom: number } {
    return {
      top: this.top.getBoundingClientRect().bottom + 4,
      bottom: window.innerHeight - this.bottom.getBoundingClientRect().top + 4,
    };
  }

  setBalls(count: number): void {
    if (this.balls.childElementCount === count) return;
    this.balls.replaceChildren(
      ...Array.from({ length: count }, () => {
        const b = document.createElement('span');
        b.className = 'hud-pile-ball';
        return b;
      }),
    );
  }

  setYards(yards: number, screen: number): void {
    this.yards.textContent = `${yards} yds · screen ${screen + 1}`;
  }

  /** The big centre message and the context button. Null hides them. */
  setPrompt(message: string | null, action: string | null): void {
    this.message.textContent = message ?? '';
    this.message.classList.toggle('show', !!message);
    this.actionButton.textContent = action ?? '';
    this.actionButton.hidden = !action;
  }

  /** A short pop above the controls: a catch rating, a fumble, a rejected throw. */
  pop(text: string, tone: 'good' | 'bad'): void {
    this.popEl.textContent = text;
    this.popEl.className = `hud-pop show ${tone}`;
    clearTimeout(this.popTimer);
    this.popTimer = setTimeout(() => (this.popEl.className = 'hud-pop'), 550);
  }
}
