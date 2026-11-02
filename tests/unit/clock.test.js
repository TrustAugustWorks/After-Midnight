import { describe, expect, test } from 'vitest';
import { clockOffset, measureOffset } from '../../src/js/clock.js';

// Server time is the truth; the device clock is wrong by `skew`.
const T = Date.parse('2026-11-10T12:00:00Z');
const header = (ms) => new Date(ms).toUTCString(); // HTTP Date: whole seconds only

describe('clock skew correction', () => {
  test('TC-07 / FR-04: device clock 5 minutes fast is corrected to within 1 s', () => {
    const skew = 5 * 60_000;
    const offset = clockOffset({ sentAt: T + skew, receivedAt: T + skew, serverDate: header(T) });
    const corrected = T + skew + offset;
    expect(Math.abs(corrected - T)).toBeLessThan(1000);
  });

  test('TC-08 / FR-04: device clock 1 s off is not corrected', () => {
    expect(clockOffset({ sentAt: T + 1000, receivedAt: T + 1000, serverDate: header(T) })).toBe(0);
    expect(clockOffset({ sentAt: T - 1000, receivedAt: T - 1000, serverDate: header(T) })).toBe(0);
  });

  test('TC-08 / FR-04: a failed server-time request applies no correction and does not throw', async () => {
    const failing = async () => { throw new Error('offline'); };
    await expect(measureOffset(failing, '/', () => T)).resolves.toBe(0);
  });

  test('TC-08 / FR-04: a response without a Date header applies no correction', async () => {
    const noDate = async () => ({ headers: { get: () => null } });
    await expect(measureOffset(noDate, '/', () => T)).resolves.toBe(0);
  });

  test('TC-24 / FR-04: a 3 s offset is corrected', () => {
    const offset = clockOffset({ sentAt: T - 3000, receivedAt: T - 3000, serverDate: header(T) });
    expect(offset).not.toBe(0);
    expect(Math.abs(T - 3000 + offset - T)).toBeLessThan(1000);
  });

  test('TC-24 / FR-04: the correction compensates for half the round trip', () => {
    // Request takes 1.2 s; the server stamps it half-way through.
    const sentAt = T - 4000;
    const receivedAt = sentAt + 1200;
    const serverStamp = T + 600; // true server time at the midpoint
    const offset = clockOffset({ sentAt, receivedAt, serverDate: header(serverStamp) });
    const trueOffset = 4000;
    expect(Math.abs(offset - trueOffset)).toBeLessThan(1000);
  });
});
