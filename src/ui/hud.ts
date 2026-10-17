/**
 * The DOM HUD over the canvas (TECHNICAL.md §6): the ball pile, yards, the
 * setup/next/restart button, message pops, and number badges pinned to things
 * on the field. Aiming happens on the canvas itself (see game.ts).
 */
import './hud.css';

export interface HudHandlers {
  /** The context button: HIKE, next screen, or new run. */
  onAction(): void;
}

export interface Badge {
  readonly x: number;
  readonly y: number;
  readonly text: string;
  readonly danger?: boolean;
}

export class Hud {
  private readonly top: HTMLElement;
  private readonly balls: HTMLElement;
  private readonly yards: HTMLElement;
  private readonly message: HTMLElement;
  private readonly bottom: HTMLElement;
  private readonly actionButton: HTMLButtonElement;
  private readonly judge: HTMLElement;
  private readonly badges: HTMLElement;
  private judgeTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(root: HTMLElement, handlers: HudHandlers) {
    root.innerHTML = `
      <div class="hud-top">
        <div class="hud-balls"></div>
        <div class="hud-yards"></div>
      </div>
      <div class="hud-badges"></div>
      <div class="hud-message"></div>
      <div class="hud-judge"></div>
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
    this.judge = q('.hud-judge');
    this.badges = q('.hud-badges');

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

  showJudgement(text: string, kind: 'onBeat' | 'offBeat' | 'bad'): void {
    this.judge.textContent = text;
    this.judge.className = `hud-judge show ${kind}`;
    clearTimeout(this.judgeTimer);
    this.judgeTimer = setTimeout(() => (this.judge.className = 'hud-judge'), 550);
  }

  setBadges(badges: readonly Badge[]): void {
    while (this.badges.childElementCount < badges.length) {
      const el = document.createElement('div');
      el.className = 'hud-badge';
      this.badges.append(el);
    }
    [...this.badges.children].forEach((el, i) => {
      const badge = badges[i];
      const node = el as HTMLElement;
      node.hidden = !badge;
      if (!badge) return;
      node.textContent = badge.text;
      node.classList.toggle('danger', !!badge.danger);
      node.style.transform = `translate(${badge.x}px, ${badge.y}px) translate(-50%, -100%)`;
    });
  }
}
