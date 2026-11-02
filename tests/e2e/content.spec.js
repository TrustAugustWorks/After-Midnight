import { expect, test } from '@playwright/test';
import { openAt } from './helpers.js';

const YOUTUBE = /(^|\.)(youtube\.com|youtube-nocookie\.com|ytimg\.com|googlevideo\.com|youtu\.be)$/;
const IGN = /(^|\.)ign\.com$/;

function trackHosts(page) {
  const hosts = [];
  page.on('request', (req) => hosts.push(new URL(req.url()).hostname));
  return hosts;
}

test('TC-17 / FR-12: no YouTube request until a thumbnail is clicked, then exactly one privacy-enhanced player', async ({ page }) => {
  await page.route('https://www.youtube-nocookie.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>player</title>' }),
  );
  const hosts = trackHosts(page);
  await openAt(page, '2026-11-10T12:00:00Z');
  await expect(page.locator('.video-card').first()).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(hosts.filter((h) => YOUTUBE.test(h))).toEqual([]);

  await page.locator('.video-card[data-spoiler="safe"] .video-card__play').first().click();
  const frames = page.locator('iframe');
  await expect(frames).toHaveCount(1);
  await expect(frames.first()).toHaveAttribute('src', /^https:\/\/www\.youtube-nocookie\.com\/embed\/[A-Za-z0-9_-]{11}\?/);
});

test('TC-22 / FR-15: only safe items show by default; opting in reveals mild items and survives a reload', async ({ page }) => {
  const hosts = trackHosts(page);
  await openAt(page, '2026-11-10T12:00:00Z');

  const safe = page.locator('[data-spoiler="safe"]');
  const mild = page.locator('[data-spoiler="mild"]');
  const story = page.locator('[data-spoiler="story"]');
  await expect(safe.first()).not.toHaveClass(/is-shielded/);
  for (const item of await mild.all()) await expect(item).toHaveClass(/is-shielded/);
  for (const item of await story.all()) await expect(item).toHaveClass(/is-shielded/);

  // Shielded videos cannot be played.
  await expect(page.locator('.video-card[data-spoiler="mild"] .video-card__play')).toBeDisabled();
  await expect(page.locator('iframe')).toHaveCount(0);

  const toggle = page.locator('#spoiler-toggle');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  for (const item of await mild.all()) await expect(item).not.toHaveClass(/is-shielded/);
  for (const item of await story.all()) await expect(item).toHaveClass(/is-shielded/);

  await page.reload();
  await expect(page.locator('#spoiler-toggle')).toHaveAttribute('aria-pressed', 'false');
  for (const item of await mild.all()) await expect(item).not.toHaveClass(/is-shielded/);

  expect(hosts.filter((h) => YOUTUBE.test(h))).toEqual([]);
});

test('TC-22 / FR-15: a story item can be revealed individually', async ({ page }) => {
  await openAt(page, '2026-11-10T12:00:00Z');
  const item = page.locator('.article[data-spoiler="story"]');
  await expect(item).toHaveClass(/is-shielded/);
  await item.getByRole('button', { name: /vis alligevel/i }).click();
  await expect(item).not.toHaveClass(/is-shielded/);
});

test('TC-27 / FR-20: "Lyd: til" plays the official soundtrack embed; "Lyd: fra" stops it; nothing loads before', async ({ page }) => {
  await page.route('https://www.youtube-nocookie.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>player</title>' }),
  );
  const hosts = trackHosts(page);
  await openAt(page, '2026-11-10T12:00:00Z');
  await page.waitForLoadState('networkidle');
  expect(hosts.filter((h) => YOUTUBE.test(h))).toEqual([]);

  const toggle = page.locator('#sound-toggle');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  const player = page.locator('#soundtrack iframe');
  await expect(player).toHaveCount(1);
  await expect(player).toHaveAttribute('src', /^https:\/\/www\.youtube-nocookie\.com\/embed\/G59iOfClrVo\?.*autoplay=1/);
  await expect(page.locator('#soundtrack')).toContainText('Sexy Magic');
  await expect(page.locator('#soundtrack')).toContainText('Fred again..');

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#soundtrack iframe')).toHaveCount(0);
  await expect(page.locator('#soundtrack')).toBeHidden();

  // Sound is never remembered: a reload starts silent and loads nothing.
  await toggle.click();
  await page.reload();
  await expect(page.locator('#sound-toggle')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#soundtrack iframe')).toHaveCount(0);
});

test('FR-15: the spoiler toggle shows a shield icon next to its label', async ({ page }) => {
  await openAt(page, '2026-11-10T12:00:00Z');
  const toggle = page.locator('#spoiler-toggle');
  await expect(toggle.locator('svg.icon-shield')).toBeVisible();
  await expect(toggle.locator('svg.icon-shield')).toHaveAttribute('aria-hidden', 'true');
  await expect(toggle).toHaveAccessibleName('Spoilerskjold: til');
});

test('FR-17: the long-wait counter sits in its own box', async ({ page }) => {
  await openAt(page, '2026-11-10T12:00:00Z');
  const box = page.locator('.longwait__box');
  await expect(box).toBeVisible();
  await expect(box.locator('#longwait-days')).toBeVisible();
  const style = await box.evaluate((el) => getComputedStyle(el));
  expect(style.borderTopStyle).toBe('solid');
  expect(style.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
});

test('TC-26 / FR-19: safe IGN articles are links, newest first, with Danish dates and no request to IGN', async ({ page }) => {
  const hosts = trackHosts(page);
  await openAt(page, '2026-11-10T12:00:00Z');

  const visible = page.locator('.article[data-spoiler="safe"]');
  await expect(visible).toHaveCount(2);
  await expect(visible.nth(0).locator('a')).toHaveText('Fixture: nyeste sikre artikel');
  await expect(visible.nth(0).locator('a')).toHaveAttribute('href', 'https://www.ign.com/articles/fixture-newest');
  await expect(visible.nth(0).locator('time')).toHaveText('7. oktober 2026');
  await expect(visible.nth(1).locator('a')).toHaveText('Fixture: ældste sikre artikel');
  await expect(visible.nth(1).locator('time')).toHaveText('1. september 2026');

  const all = await page.locator('.article time').evaluateAll((els) => els.map((e) => e.dateTime));
  expect(all).toEqual([...all].sort().reverse());

  await page.waitForLoadState('networkidle');
  expect(hosts.filter((h) => IGN.test(h))).toEqual([]);
});
