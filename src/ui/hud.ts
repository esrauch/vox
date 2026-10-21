/**
 * The DOM HUD over the canvas (TECHNICAL.md §6): the drive banner and down
 * and distance at the top; the hand of play cards, Flip and the context button
 * (PLAY, HIKE!, RESUME, AGAIN) at the bottom; message pops; and the draft
 * overlay. Aiming happens on the canvas itself (see game.ts).
 *
 * The bottom bar keeps one height whether or not cards are showing, so the
 * camera's fit of the field doesn't jump between downs.
 */
import './hud.css';

export interface HudHandlers {
  /** The context button: PLAY, HIKE, resume, new run. */
  onAction(): void;
  /** Tap a card in the hand: call that play. */
  onCard(hand: number): void;
  onFlip(): void;
  /** In the draft: take an offer, or skip. */
  onDraft(offer: number): void;
  onSkip(): void;
  /** In the draft: tap a roster player (to place a recruit there, or to swap two). */
  onRoster?(slot: number): void;
}

/** One of your players on the roster panel. */
export interface RosterRow {
  /** The position it's playing, e.g. "Runner" (shown first, when given). */
  readonly position?: string;
  /** Highlighted (picked for a swap). */
  readonly selected?: boolean;
  readonly name: string;
  /** Its form, e.g. "Werewolf". */
  readonly form: string;
  /** "Hustle +1 · Hands 0 · Heft −2". */
  readonly stats: string;
  /** Its skill, or "". */
  readonly skill: string;
}

/** What the draft shows: the offers, your roster, and your team's hand. */
export interface DraftView {
  /** The heading over the offer (default "Pick one"). */
  readonly title?: string;
  readonly offer: readonly CardFace[];
  readonly roster: readonly RosterRow[];
  /** The team hand you hold, e.g. "Monster Mash: every player has every skill", or null. */
  readonly hand: string | null;
}

/** What a card face shows. */
export interface CardFace {
  readonly name: string;
  readonly blurb: string;
  /** A rarity, e.g. "rare": styles the card. */
  readonly rarity?: string;
}

export class Hud {
  private readonly top: HTMLElement;
  private readonly banner: HTMLElement;
  private readonly downs: HTMLElement;
  private readonly message: HTMLElement;
  private readonly bottom: HTMLElement;
  private readonly hand: HTMLElement;
  private readonly flipButton: HTMLButtonElement;
  private readonly actionButton: HTMLButtonElement;
  private readonly popEl: HTMLElement;
  private readonly draft: HTMLElement;
  private popTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly bigEl: HTMLElement;
  private bigTimer: ReturnType<typeof setTimeout> | undefined;
  private handKey = '';
  private draftKey = '';

  constructor(
    root: HTMLElement,
    private readonly handlers: HudHandlers,
  ) {
    root.innerHTML = `
      <div class="hud-top">
        <div class="hud-banner"></div>
        <div class="hud-downs"></div>
      </div>
      <div class="hud-message"></div>
      <div class="hud-pop"></div>
      <div class="hud-big"></div>
      <div class="hud-bottom">
        <div class="hud-hand"></div>
        <div class="hud-controls">
          <button class="hud-flip interactive">⇄ Flip</button>
          <button class="hud-action interactive"></button>
        </div>
      </div>
      <div class="hud-draft interactive" hidden></div>`;
    const q = <T extends HTMLElement>(sel: string): T => {
      const el = root.querySelector<T>(sel);
      if (!el) throw new Error(`HUD is missing ${sel}`);
      return el;
    };
    this.top = q('.hud-top');
    this.banner = q('.hud-banner');
    this.downs = q('.hud-downs');
    this.message = q('.hud-message');
    this.bottom = q('.hud-bottom');
    this.hand = q('.hud-hand');
    this.flipButton = q<HTMLButtonElement>('.hud-flip');
    this.actionButton = q<HTMLButtonElement>('.hud-action');
    this.popEl = q('.hud-pop');
    this.bigEl = q('.hud-big');
    this.draft = q('.hud-draft');

    this.actionButton.addEventListener('click', () => handlers.onAction());
    this.flipButton.addEventListener('click', () => handlers.onFlip());
  }

  /** Space the HUD takes at the top and bottom, so the camera can fit the field between. */
  insets(): { top: number; bottom: number } {
    return {
      top: this.top.getBoundingClientRect().bottom + 4,
      bottom: window.innerHeight - this.bottom.getBoundingClientRect().top + 4,
    };
  }

  /** The drive banner ("Drive 2 of 4 · Challenge") and down and distance ("3rd & 4"). */
  setTop(banner: string, downs: string | null): void {
    this.banner.textContent = banner;
    this.downs.textContent = downs ?? '';
    this.downs.hidden = !downs;
  }

  /** The big centre message and the context button. Null hides them. */
  setPrompt(message: string | null, action: string | null): void {
    this.message.textContent = message ?? '';
    this.message.classList.toggle('show', !!message);
    this.actionButton.textContent = action ?? '';
    this.actionButton.hidden = !action;
  }

  /** The hand of play cards (null hides it), which one is called (Flip shows once one is). */
  setHand(
    cards: readonly CardFace[] | null,
    called: number | null,
    /** Show Flip even before a card is called (it mirrors the whole hand); `flipped` marks it on. */
    flip: { readonly always: boolean; readonly flipped: boolean } = {
      always: false,
      flipped: false,
    },
  ): void {
    this.flipButton.hidden = !cards || (called === null && !flip.always);
    this.flipButton.classList.toggle('on', flip.flipped);
    const key = cards ? `${cards.map((c) => c.name + c.blurb).join('|')}#${called}` : '';
    if (key === this.handKey) return;
    this.handKey = key;
    this.hand.classList.toggle('show', !!cards);
    this.hand.replaceChildren(
      ...(cards ?? []).map((c, i) =>
        cardButton(c, `hud-card interactive${i === called ? ' called' : ''}`, () =>
          this.handlers.onCard(i),
        ),
      ),
    );
  }

  /**
   * The draft after a won drive: the offers to take (or skip), and the
   * roster panel with your players' numbers and your team's hand. Null hides it.
   */
  setDraft(draft: DraftView | null): void {
    this.draft.hidden = !draft;
    const key = draft ? JSON.stringify(draft) : '';
    if (key === this.draftKey) return;
    this.draftKey = key;
    if (!draft) return;
    const heading = (text: string): HTMLElement => {
      const h = document.createElement('h2');
      h.textContent = text;
      return h;
    };
    const offer = document.createElement('div');
    offer.className = 'hud-draft-row';
    offer.append(
      ...draft.offer.map((c, i) =>
        cardButton(c, `hud-card${c.rarity ? ` rarity-${c.rarity}` : ''}`, () =>
          this.handlers.onDraft(i),
        ),
      ),
    );
    const roster = document.createElement('div');
    roster.className = 'hud-roster';
    roster.append(
      ...draft.roster.map((row, i) => {
        const onRoster = this.handlers.onRoster;
        return rosterRow(row, onRoster ? () => onRoster(i) : undefined);
      }),
    );
    const hand = document.createElement('p');
    hand.className = 'hud-roster-hand';
    hand.textContent =
      draft.hand ?? 'No team hand yet: all different, four of a kind, or all human and trained';
    const skip = document.createElement('button');
    skip.className = 'hud-skip';
    skip.textContent = 'Skip';
    skip.addEventListener('click', () => this.handlers.onSkip());
    this.draft.replaceChildren(
      heading(draft.title ?? 'Pick one'),
      offer,
      skip,
      heading('Your team'),
      roster,
      hand,
    );
  }

  /** A big word in the middle of the screen, for a moment: how a Break it! went. */
  big(text: string, tone: 'good' | 'ok' | 'bad'): void {
    this.bigEl.textContent = text;
    this.bigEl.className = `hud-big show ${tone}`;
    clearTimeout(this.bigTimer);
    this.bigTimer = setTimeout(() => (this.bigEl.className = 'hud-big'), 1000);
  }

  /** A short pop above the controls: a catch rating, a block, a tackle. */
  pop(text: string, tone: 'good' | 'bad'): void {
    this.popEl.textContent = text;
    this.popEl.className = `hud-pop show ${tone}`;
    clearTimeout(this.popTimer);
    this.popTimer = setTimeout(() => (this.popEl.className = 'hud-pop'), 900);
  }
}

function cardButton(face: CardFace, className: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.className = className;
  const name = document.createElement('strong');
  name.textContent = face.name;
  const blurb = document.createElement('span');
  blurb.textContent = face.blurb;
  b.append(name, blurb);
  b.addEventListener('click', onClick);
  return b;
}

function rosterRow(row: RosterRow, onTap?: () => void): HTMLElement {
  const el = document.createElement(onTap ? 'button' : 'div');
  el.className = `hud-roster-row${onTap ? ' interactive' : ''}${row.selected ? ' selected' : ''}`;
  if (onTap) el.addEventListener('click', onTap);
  if (row.position) {
    const pos = document.createElement('small');
    pos.textContent = row.position.toUpperCase();
    el.append(pos);
  }
  const name = document.createElement('strong');
  name.textContent = `${row.name} · ${row.form}`;
  const stats = document.createElement('span');
  stats.textContent = row.stats;
  el.append(name, stats);
  if (row.skill) {
    const skill = document.createElement('em');
    skill.textContent = row.skill;
    el.append(skill);
  }
  return el;
}
