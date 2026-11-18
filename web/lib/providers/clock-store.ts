/**
 * A tiny external clock store. A single one-second interval drives every animated number
 * in the app, and the offset is corrected from the latest Aevum block timestamp.
 *
 * This lives outside React so the provider can subscribe with useSyncExternalStore
 * instead of calling setState from an effect.
 */

let offsetMs = 0;
let currentNow = 0;
let timer: number | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function tick() {
  currentNow = Date.now() + offsetMs;
  emit();
}

export function subscribeClock(listener: () => void): () => void {
  if (listeners.size === 0) {
    currentNow = Date.now() + offsetMs;
    timer = window.setInterval(tick, 1_000);
  }
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer != null) {
      window.clearInterval(timer);
      timer = null;
    }
  };
}

export function getClockSnapshot(): number {
  if (currentNow === 0) currentNow = Date.now() + offsetMs;
  return currentNow;
}

export function getClockServerSnapshot(): number {
  return 0;
}

export function getOffsetSnapshot(): number {
  return offsetMs;
}

export function setClockOffset(nextOffsetMs: number): void {
  offsetMs = nextOffsetMs;
  currentNow = Date.now() + offsetMs;
  emit();
}
