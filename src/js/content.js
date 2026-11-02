// Rules for the video hub, IGN articles and the spoiler shield (FR-11, FR-15, FR-19).
import { launchInstant, zonedToInstant } from './time.js';

export const SPOILER_LEVELS = ['safe', 'mild', 'story'];
export const PHASES = ['pre', 'review', 'launch'];

/** Shield on: only "safe" is shown. Shield off: "mild" too. "story" always needs its own reveal. */
export function isShielded(level, shieldOn) {
  if (level === 'story') return true;
  if (level === 'mild') return shieldOn;
  return false;
}

export function phaseStart(phase, config) {
  if (phase === 'review') return zonedToInstant(config.reviewEmbargoLocal, config.timeZone);
  if (phase === 'launch') return launchInstant(config);
  return -Infinity;
}

export const isPhaseLive = (phase, config, nowMs) => phaseStart(phase, config) <= nowMs;

export const sortArticles = (articles) =>
  [...articles].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
