import { track } from '@vercel/analytics/react';

type Value = string | number | boolean | null;

/** Game events sent to Vercel Web Analytics. Never throws, so analytics can't break the game. */
export function trackEvent(name: string, properties?: Record<string, Value>) {
  try { track(name, properties); } catch { /* analytics unavailable */ }
}
