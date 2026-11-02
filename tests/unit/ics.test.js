import { expect, test } from 'vitest';
import config from '../../src/config.json' with { type: 'json' };
import { launchInstant } from '../../src/js/time.js';
import { launchEvent } from '../../src/js/ics.js';

// Minimal RFC 5545 reader: unfolds lines and returns the VEVENT properties.
function parseIcs(text) {
  expect(text.endsWith('\r\n')).toBe(true);
  const lines = text.replace(/\r\n[ \t]/g, '').split('\r\n').filter(Boolean);
  for (const line of lines) expect(line).toMatch(/^[A-Z-]+(;[^:]*)?:/);
  expect(lines[0]).toBe('BEGIN:VCALENDAR');
  expect(lines.at(-1)).toBe('END:VCALENDAR');
  const start = lines.indexOf('BEGIN:VEVENT');
  const end = lines.indexOf('END:VEVENT');
  expect(start).toBeGreaterThan(0);
  expect(end).toBeGreaterThan(start);
  const props = {};
  for (const line of lines.slice(start + 1, end)) {
    const i = line.indexOf(':');
    props[line.slice(0, i).split(';')[0]] = line.slice(i + 1);
  }
  return { lines, props };
}

test('TC-12 / FR-06: the .ics is valid and starts at the configured launch (18 Nov 23:00Z)', () => {
  const text = launchEvent(config, { stamp: Date.parse('2026-11-02T10:00:00Z') });
  const { lines, props } = parseIcs(text);
  expect(lines).toContain('VERSION:2.0');
  expect(lines.some((l) => l.startsWith('PRODID:'))).toBe(true);
  expect(props.DTSTART).toBe('20261118T230000Z');
  expect(props.DTSTAMP).toBe('20261102T100000Z');
  expect(props.SUMMARY).toMatch(/GTA VI/);
  expect(props.SUMMARY).toMatch(/lanceres/i);
  expect(props.UID).toMatch(/^[^@\s]+@[^@\s]+$/);
  expect(launchInstant(config)).toBe(Date.parse('2026-11-18T23:00:00Z'));
});

test('TC-12 / FR-06: lines are folded to at most 75 octets', () => {
  const text = launchEvent(config, { stamp: 0 });
  for (const line of text.split('\r\n')) {
    expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  }
});
