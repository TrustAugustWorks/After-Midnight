import { describe, expect, test } from 'vitest';
import config from '../../src/config.json' with { type: 'json' };
import {
  launchInstant,
  zonedToInstant,
  timeLeft,
  timeSince,
  formatDanishDateTime,
  formatDanishDate,
  unitLabel,
  srSentence,
} from '../../src/js/time.js';

const Z = (iso) => Date.parse(iso);

describe('launch instant', () => {
  test('TC-04 / FR-02: launch is 00:00 Copenhagen = 18 Nov 23:00Z', () => {
    expect(launchInstant(config)).toBe(Z('2026-11-18T23:00:00Z'));
  });

  test('TC-04 / FR-02: wall-clock conversion handles summer time (CEST)', () => {
    expect(zonedToInstant('2013-09-17T00:00', 'Europe/Copenhagen')).toBe(Z('2013-09-16T22:00:00Z'));
  });
});

describe('formatting', () => {
  test('TC-04 / FR-02: launch is formatted in Danish Copenhagen time', () => {
    expect(formatDanishDateTime(Z('2026-11-18T23:00:00Z'), 'Europe/Copenhagen')).toBe(
      'torsdag 19. november 2026 kl. 00.00',
    );
  });

  test('TC-04 / FR-02: formatting is independent of the device timezone across the 23:00Z boundary', () => {
    expect(formatDanishDateTime(Z('2026-11-18T22:59:00Z'), 'Europe/Copenhagen')).toBe(
      'onsdag 18. november 2026 kl. 23.59',
    );
  });

  test('TC-26 / FR-19: article dates are formatted in Danish', () => {
    expect(formatDanishDate(Z('2026-10-07T12:00:00Z'), 'Europe/Copenhagen')).toBe('7. oktober 2026');
  });

  test('TC-01 / FR-01: Danish unit labels are singular for 1 and plural otherwise', () => {
    expect(unitLabel('days', 1)).toBe('dag');
    expect(unitLabel('days', 0)).toBe('dage');
    expect(unitLabel('hours', 23)).toBe('timer');
    expect(unitLabel('minutes', 1)).toBe('minut');
    expect(unitLabel('seconds', 59)).toBe('sekunder');
  });
});

describe('time left', () => {
  const target = Z('2026-11-18T23:00:00Z');

  test('TC-01 / FR-01: exactly 24 h before shows 1 d 00:00:00', () => {
    expect(timeLeft(target, Z('2026-11-17T23:00:00Z'))).toEqual({
      done: false, days: 1, hours: 0, minutes: 0, seconds: 0,
    });
  });

  test('TC-01 / FR-01: one second later shows 0 d 23:59:59', () => {
    expect(timeLeft(target, Z('2026-11-17T23:00:01Z'))).toEqual({
      done: false, days: 0, hours: 23, minutes: 59, seconds: 59,
    });
  });

  test('TC-11 / FR-05: after the launch it is done and never negative', () => {
    expect(timeLeft(target, Z('2026-11-20T12:00:00Z'))).toEqual({
      done: true, days: 0, hours: 0, minutes: 0, seconds: 0,
    });
    expect(timeLeft(target, target).done).toBe(true);
  });

  test('TC-N3: the screen-reader sentence names days, hours and minutes in Danish', () => {
    expect(srSentence({ days: 1, hours: 2, minutes: 1 })).toBe(
      '1 dag, 2 timer og 1 minut til lanceringen.',
    );
  });
});

describe('long wait', () => {
  test('TC-23 / FR-17: time since GTA V counts up from 17 Sep 2013 Copenhagen', () => {
    const from = zonedToInstant(config.gtaVReleaseLocal, config.timeZone);
    const now = Z('2026-11-17T23:00:00Z');
    const expectedSeconds = (now - Z('2013-09-16T22:00:00Z')) / 1000;
    const since = timeSince(from, now);
    expect(since.days * 86400 + since.hours * 3600 + since.minutes * 60 + since.seconds).toBe(expectedSeconds);
    expect(timeSince(from, now + 1000).seconds).toBe((since.seconds + 1) % 60);
  });
});
