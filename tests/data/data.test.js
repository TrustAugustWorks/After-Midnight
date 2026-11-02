import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PHASES, SPOILER_LEVELS } from '../../src/js/content.js';

const ROOT = join(import.meta.dirname, '..', '..');
const DATA_DIRS = ['data', join('tests', 'fixtures', 'data')];
const load = (dir, file) => JSON.parse(readFileSync(join(ROOT, dir, file), 'utf8'));

describe.each(DATA_DIRS)('%s', (dir) => {
  test('TC-16 / FR-11: every video in videos.json is valid', () => {
    const videos = load(dir, 'videos.json');
    expect(Array.isArray(videos)).toBe(true);
    expect(videos.length).toBeGreaterThan(0);
    for (const v of videos) {
      expect(Object.keys(v).sort()).toEqual(['channel', 'phase', 'spoiler', 'title', 'youtubeId']);
      expect(v.title.trim()).not.toBe('');
      expect(v.channel.trim()).not.toBe('');
      expect(v.youtubeId).toMatch(/^[A-Za-z0-9_-]{11}$/);
      expect(PHASES).toContain(v.phase);
      expect(SPOILER_LEVELS).toContain(v.spoiler);
    }
    const ids = videos.map((v) => v.youtubeId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('TC-25 / FR-19: every article in articles.json is valid', () => {
    const articles = load(dir, 'articles.json');
    expect(Array.isArray(articles)).toBe(true);
    expect(articles.length).toBeGreaterThan(0);
    for (const a of articles) {
      expect(Object.keys(a).sort()).toEqual(['publishedAt', 'spoiler', 'title', 'url']);
      expect(a.title.trim()).not.toBe('');
      expect(a.url).toMatch(/^https:\/\/www\.ign\.com\/\S+$/);
      expect(a.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(a.publishedAt))).toBe(false);
      expect(SPOILER_LEVELS).toContain(a.spoiler);
    }
    const urls = articles.map((a) => a.url);
    expect(new Set(urls).size).toBe(urls.length);
  });
});
