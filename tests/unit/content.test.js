import { expect, test } from 'vitest';
import config from '../../src/config.json' with { type: 'json' };
import { isShielded, sortArticles, isPhaseLive } from '../../src/js/content.js';

test('TC-22 / FR-15: shield on shows only safe; off adds mild; story is always shielded', () => {
  expect(isShielded('safe', true)).toBe(false);
  expect(isShielded('mild', true)).toBe(true);
  expect(isShielded('story', true)).toBe(true);
  expect(isShielded('safe', false)).toBe(false);
  expect(isShielded('mild', false)).toBe(false);
  expect(isShielded('story', false)).toBe(true);
});

test('TC-26 / FR-19: articles are sorted newest first without mutating the input', () => {
  const input = [
    { title: 'a', publishedAt: '2026-09-01' },
    { title: 'b', publishedAt: '2026-10-07' },
    { title: 'c', publishedAt: '2026-10-01' },
  ];
  expect(sortArticles(input).map((a) => a.title)).toEqual(['b', 'c', 'a']);
  expect(input[0].title).toBe('a');
});

test('FR-11: video phases go live on the dates in config', () => {
  const beforeEmbargo = Date.parse('2026-11-17T12:00:00Z');
  const afterEmbargo = Date.parse('2026-11-18T08:00:00Z');
  const afterLaunch = Date.parse('2026-11-19T08:00:00Z');
  expect(isPhaseLive('pre', config, beforeEmbargo)).toBe(true);
  expect(isPhaseLive('review', config, beforeEmbargo)).toBe(false);
  expect(isPhaseLive('review', config, afterEmbargo)).toBe(true);
  expect(isPhaseLive('launch', config, afterEmbargo)).toBe(false);
  expect(isPhaseLive('launch', config, afterLaunch)).toBe(true);
});
