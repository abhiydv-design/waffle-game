import { ORDERS, type WaffleOrder } from './serving';

/** Day #1 of the daily special. */
const LAUNCH = new Date(2026, 8, 27); // 27 Sep 2026, local time
const STATS_KEY = 'waffle-morning-stats-v1';

export type DailyEntry = { stars: number; seconds: number; orderId: string };
export type Stats = {
  streak: number;
  bestStreak: number;
  lastDaily: string | null;
  played: number;
  threeStars: number;
  history: Record<string, DailyEntry>;
};

const EMPTY: Stats = { streak: 0, bestStreak: 0, lastDaily: null, played: 0, threeStars: 0, history: {} };

export function dateKey(date = new Date()) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

function dayIndex(date = new Date()) {
  const start = new Date(LAUNCH.getFullYear(), LAUNCH.getMonth(), LAUNCH.getDate());
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((today.getTime() - start.getTime()) / 86_400_000);
}

export function dailyNumber(date = new Date()) {
  return Math.max(1, dayIndex(date) + 1);
}

/** Deterministic, so everyone gets the same order on the same day; never repeats yesterday's. */
function orderIndexFor(day: number) {
  let h = (day + 1013) * 2654435761;
  h = (h ^ (h >>> 15)) >>> 0;
  return h % ORDERS.length;
}

export function dailyOrder(date = new Date()): WaffleOrder {
  const day = dayIndex(date);
  let index = orderIndexFor(day);
  if (index === orderIndexFor(day - 1)) index = (index + 1) % ORDERS.length;
  return ORDERS[index];
}

export function msUntilTomorrow(now = new Date()) {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next.getTime() - now.getTime();
}

export function formatCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

export function loadStats(): Stats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

function save(stats: Stats) {
  try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch { /* storage unavailable */ }
}

/** A streak only counts while the last daily was today or yesterday. */
export function currentStreak(stats: Stats, now = new Date()) {
  if (!stats.lastDaily) return 0;
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  return stats.lastDaily === dateKey(now) || stats.lastDaily === dateKey(yesterday) ? stats.streak : 0;
}

export function todaysEntry(stats: Stats, now = new Date()) {
  return stats.history[dateKey(now)] ?? null;
}

/** Records the first serve of today's special. Later serves the same day don't change it. */
export function recordDaily(entry: DailyEntry, now = new Date()): Stats {
  const stats = loadStats();
  const today = dateKey(now);
  if (stats.history[today]) return stats;
  const streak = currentStreak(stats, now) + 1;
  const next: Stats = {
    ...stats,
    streak,
    bestStreak: Math.max(stats.bestStreak, streak),
    lastDaily: today,
    played: stats.played + 1,
    threeStars: stats.threeStars + (entry.stars === 3 ? 1 : 0),
    history: { ...stats.history, [today]: entry },
  };
  save(next);
  return next;
}
