/**
 * The DOM HUD over the canvas (TECHNICAL.md §6): the ball pile, yards, the
 * beat bar, the pulsing ball button, the setup/next/restart button, On-Beat
 * pops, and number badges pinned to things on the field.
 */
import './hud.css';

export interface HudHandlers {
  /**
   * The throw circle: press on it, pull back (down) to aim, release to throw.
   * Each gets the raw pointer event (the release's timestamp decides the beat).
   */
  onAimStart(event: PointerEvent): void;
  onAimMove(event: PointerEvent): void;
  onAimEnd(event: PointerEvent): void;
  /** The context button: HIKE, next screen, or new run. */
  onAction(): void;
}

export interface Badge {
  readonly x: number;
  readonly y: number;
  readonly text: string;
  readonly danger?: boolean;
}

const TICKS_EACH_SIDE = 3;

export class Hud {
  private readonly top: HTMLElement;
  private readonly balls: HTMLElement;
  private readonly yards: HTMLElement;
  private readonly message: HTMLElement;
  private readonly bottom: HTMLElement;
  private readonly beatBar: HTMLElement;
  private readonly ticks: HTMLElement[] = [];
  private readonly ballButton: HTMLButtonElement;
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
        <div class="hud-beatbar"><div class="hud-beat-target"></div></div>
        <div class="hud-controls">
          <button class="hud-ball interactive" aria-label="Pull back to throw"><span></span></button>
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
    this.beatBar = q('.hud-beatbar');
    this.ballButton = q<HTMLButtonElement>('.hud-ball');
    this.actionButton = q<HTMLButtonElement>('.hud-action');
    this.judge = q('.hud-judge');
    this.badges = q('.hud-badges');

    for (let i = 0; i < TICKS_EACH_SIDE * 2; i++) {
      const tick = document.createElement('div');
      tick.className = 'hud-tick';
      this.beatBar.append(tick);
      this.ticks.push(tick);
    }

    this.ballButton.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      // Keep receiving moves and the release even when the finger leaves the circle.
      this.ballButton.setPointerCapture(e.pointerId);
      handlers.onAimStart(e);
    });
    this.ballButton.addEventListener('pointermove', (e) => handlers.onAimMove(e));
    this.ballButton.addEventListener('pointerup', (e) => handlers.onAimEnd(e));
    this.ballButton.addEventListener('pointercancel', (e) => handlers.onAimEnd(e));
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
    this.ballButton.hidden = !!action;
  }

  setBallReady(ready: boolean): void {
    this.ballButton.classList.toggle('ready', ready);
  }

  /**
   * Drive the beat visuals from the clock: ticks slide toward the centre and
   * the ball button bounces, brightest exactly on the beat. Null = no beat.
   */
  updateBeat(phase: number | null): void {
    const running = phase !== null;
    this.beatBar.classList.toggle('running', running);
    if (!running) return;

    const width = this.beatBar.clientWidth;
    const spacing = width / (this.ticks.length + 1);
    this.ticks.forEach((tick, i) => {
      const offset = (i - (this.ticks.length - 1) / 2) * spacing;
      tick.style.transform = `translateX(${offset}px)`;
      tick.style.opacity = '0.8';
    });

    const kick = Math.pow(1 - phase, 3);
    this.ballButton.style.setProperty('--kick', kick.toFixed(3));
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
