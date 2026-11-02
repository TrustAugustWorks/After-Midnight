// Builds the "Tilføj til kalender" file (FR-06). Runs at build time.
import { launchInstant, formatDanishDateTime } from './time.js';

const pad = (n) => String(n).padStart(2, '0');

function icsStamp(ms) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

const escapeText = (s) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

// RFC 5545 §3.1: lines longer than 75 octets are folded with CRLF + space.
function fold(line) {
  const encoder = new TextEncoder();
  const out = [];
  let current = '';
  for (const char of line) {
    const limit = out.length === 0 ? 75 : 74; // continuation lines start with a space
    if (encoder.encode(current + char).length > limit) {
      out.push(current);
      current = '';
    }
    current += char;
  }
  out.push(current);
  return out.join('\r\n ');
}

export function buildIcs({ start, durationMinutes = 60, title, description, url, uid, stamp }) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Efter Midnat//Nedtaelling//DA',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${icsStamp(stamp)}`,
    `DTSTART:${icsStamp(start)}`,
    `DTEND:${icsStamp(start + durationMinutes * 60_000)}`,
    `SUMMARY:${escapeText(title)}`,
    `DESCRIPTION:${escapeText(description)}`,
    ...(url ? [`URL:${url}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

export function launchEvent(config, { stamp }) {
  const start = launchInstant(config);
  return buildIcs({
    start,
    title: 'GTA VI lanceres',
    description: `GTA VI lanceres ${formatDanishDateTime(start, config.timeZone)} dansk tid på ${config.platforms}.`,
    url: config.siteUrl,
    uid: `lancering-${start}@efter-midnat`,
    stamp,
  });
}
