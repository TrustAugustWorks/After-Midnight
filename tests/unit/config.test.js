import { expect, test } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import config from '../../src/config.json' with { type: 'json' };
import { launchInstant, formatDanishDateTime } from '../../src/js/time.js';
import { launchEvent } from '../../src/js/ics.js';
import { phaseStart } from '../../src/js/content.js';

const ROOT = join(import.meta.dirname, '..', '..');

test('TC-13 / FR-07: all derived values follow the date in config', () => {
  const testConfig = { ...config, launchLocal: '2027-01-01T00:00', reviewEmbargoLocal: '2026-12-31T00:00' };
  const launch = launchInstant(testConfig);
  expect(launch).toBe(Date.parse('2026-12-31T23:00:00Z'));
  expect(formatDanishDateTime(launch, testConfig.timeZone)).toBe('fredag 1. januar 2027 kl. 00.00');
  expect(launchEvent(testConfig, { stamp: 0 })).toContain('DTSTART:20261231T230000Z');
  expect(phaseStart('launch', testConfig)).toBe(launch);
  expect(phaseStart('review', testConfig)).toBe(Date.parse('2026-12-30T23:00:00Z'));
});

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else yield path;
  }
}

test('TC-13 / FR-07: no launch date is hard-coded outside the config file', () => {
  const launchPatterns = [/2026-11-1[89]/, /19\.? november/i, /18\.? november/i, /20261118/, /Nov(ember)? 1[89]/i];
  const sources = [...walk(join(ROOT, 'src')), ...walk(join(ROOT, 'scripts'))]
    .filter((p) => /\.(js|mjs|html|css|json)$/.test(p))
    .filter((p) => relative(ROOT, p) !== join('src', 'config.json'));
  expect(sources.length).toBeGreaterThan(0);
  const offenders = sources.filter((p) => launchPatterns.some((re) => re.test(readFileSync(p, 'utf8'))));
  expect(offenders.map((p) => relative(ROOT, p))).toEqual([]);
});
