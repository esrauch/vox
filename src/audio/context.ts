/**
 * The one AudioContext (TECHNICAL.md §8). Mobile browsers only allow audio to
 * start from a user gesture, so the context is created and resumed on the
 * first tap.
 */

let ctx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  return ctx;
}

/** Create (if needed) and resume the AudioContext. Call from inside a user-gesture handler. */
export async function unlockAudio(): Promise<AudioContext> {
  ctx ??= new AudioContext({ latencyHint: 'interactive' });
  if (ctx.state !== 'running') await ctx.resume();
  return ctx;
}

/** Suspend audio while the page is hidden and resume when it's visible again. */
export function installVisibilityPause(onChange?: (hidden: boolean) => void): void {
  document.addEventListener('visibilitychange', () => {
    const hidden = document.visibilityState === 'hidden';
    if (ctx) void (hidden ? ctx.suspend() : ctx.resume());
    onChange?.(hidden);
  });
}
