// Pure time logic. Every function takes "now" as an argument, so nothing here
// depends on the real clock or the device's timezone.

const SECOND = 1000;

function partsOf(ms, timeZone, locale, options) {
  const parts = new Intl.DateTimeFormat(locale, { timeZone, ...options }).formatToParts(new Date(ms));
  return Object.fromEntries(parts.map((p) => [p.type, p.value]));
}

/** Offset of `timeZone` from UTC at instant `ms`, in milliseconds. */
export function zoneOffset(ms, timeZone) {
  const p = partsOf(ms, timeZone, 'en-US', {
    hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
  });
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(ms / SECOND) * SECOND;
}

/** Resolve a wall-clock time like "2030-01-31T00:00" in `timeZone` to a UTC instant. */
export function zonedToInstant(localIso, timeZone) {
  const [date, time = '00:00'] = localIso.split('T');
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  // Second pass handles the case where the offset differs on either side of a DST change.
  const first = wall - zoneOffset(wall, timeZone);
  return wall - zoneOffset(first, timeZone);
}

export const launchInstant = (config) => zonedToInstant(config.launchLocal, config.timeZone);

function split(totalSeconds) {
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

/** Time left until `targetMs`. Rounds up, so the display reaches 0 exactly at the target. */
export function timeLeft(targetMs, nowMs) {
  const ms = targetMs - nowMs;
  if (ms <= 0) return { done: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  return { done: false, ...split(Math.ceil(ms / SECOND)) };
}

/** Time elapsed since `fromMs`, never negative. */
export function timeSince(fromMs, nowMs) {
  return split(Math.max(0, Math.floor((nowMs - fromMs) / SECOND)));
}

/** e.g. "torsdag 31. januar 2030 kl. 00.00" */
export function formatDanishDateTime(ms, timeZone) {
  const p = partsOf(ms, timeZone, 'da-DK', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  return `${p.weekday} ${p.day}. ${p.month} ${p.year} kl. ${p.hour}.${p.minute}`;
}

/** "7. oktober 2026" */
export function formatDanishDate(ms, timeZone) {
  const p = partsOf(ms, timeZone, 'da-DK', { day: 'numeric', month: 'long', year: 'numeric' });
  return `${p.day}. ${p.month} ${p.year}`;
}

const UNITS = {
  days: ['dag', 'dage'],
  hours: ['time', 'timer'],
  minutes: ['minut', 'minutter'],
  seconds: ['sekund', 'sekunder'],
};

export const unitLabel = (unit, n) => UNITS[unit][n === 1 ? 0 : 1];

export const pad2 = (n) => String(n).padStart(2, '0');

/** Sentence for the screen-reader live region (announced once per minute). */
export function srSentence({ days, hours, minutes }) {
  return `${days} ${unitLabel('days', days)}, ${hours} ${unitLabel('hours', hours)} og ` +
    `${minutes} ${unitLabel('minutes', minutes)} til lanceringen.`;
}
