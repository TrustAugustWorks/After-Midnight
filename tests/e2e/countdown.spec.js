import { expect, test } from '@playwright/test';
import { openAt, readCountdown, tile, tileLabel } from './helpers.js';

test.describe('on a 360 × 800 phone in Copenhagen', () => {
  test.use({ viewport: { width: 360, height: 800 }, timezoneId: 'Europe/Copenhagen' });

  test('TC-01 / FR-01: shows 1 d 00:00:00, fully visible, then 0 d 23:59:59 a second later', async ({ page }) => {
    await openAt(page, '2026-11-17T23:00:00Z');
    await expect(tile(page, 'days')).toHaveText('1');
    await expect(tile(page, 'hours')).toHaveText('00');
    await expect(tile(page, 'minutes')).toHaveText('00');
    await expect(tile(page, 'seconds')).toHaveText('00');
    await expect(tileLabel(page, 'days')).toHaveText('dag');

    const box = await page.locator('#countdown').boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(360);
    expect(box.y + box.height).toBeLessThanOrEqual(800);

    await page.clock.runFor(1000);
    await expect(tile(page, 'days')).toHaveText('0');
    await expect(tile(page, 'hours')).toHaveText('23');
    await expect(tile(page, 'minutes')).toHaveText('59');
    await expect(tile(page, 'seconds')).toHaveText('59');
    await expect(tileLabel(page, 'days')).toHaveText('dage');
  });
});

test('TC-02 / FR-01: the value changes every second with zero layout shift', async ({ page }) => {
  await openAt(page, '2026-11-10T12:00:00Z');
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => {
    window.__cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__cls += entry.value;
    }).observe({ type: 'layout-shift' });
  });

  const seen = [await readCountdown(page)];
  for (let i = 0; i < 10; i++) {
    await page.clock.runFor(1000);
    seen.push(await readCountdown(page));
  }
  for (let i = 1; i < seen.length; i++) expect(seen[i]).not.toBe(seen[i - 1]);
  expect(await page.evaluate(() => window.__cls)).toBe(0);
});

test.describe('in New York', () => {
  test.use({ timezoneId: 'America/New_York' });

  test('TC-03 / FR-02: counts to the Copenhagen moment and shows Danish Copenhagen time', async ({ page }) => {
    await openAt(page, '2026-11-17T23:00:00Z');
    await expect(tile(page, 'days')).toHaveText('1');
    await expect(tile(page, 'hours')).toHaveText('00');
    await expect(tile(page, 'minutes')).toHaveText('00');
    await expect(tile(page, 'seconds')).toHaveText('00');
    await expect(page.locator('#launch-time')).toHaveText('torsdag 19. november 2026 kl. 00.00');
  });
});

test('TC-N3: the live region announces at most once per minute', async ({ page }) => {
  await openAt(page, '2026-11-10T12:00:30Z');
  const region = page.locator('#sr-status');
  await expect(region).toHaveAttribute('aria-live', 'polite');
  await page.evaluate(() => {
    window.__announcements = 0;
    new MutationObserver(() => window.__announcements++).observe(document.getElementById('sr-status'), {
      childList: true, characterData: true, subtree: true,
    });
  });
  await page.clock.runFor(120_000);
  const count = await page.evaluate(() => window.__announcements);
  expect(count).toBeGreaterThanOrEqual(1);
  expect(count).toBeLessThanOrEqual(2);
});

test('TC-23 / FR-17: the long-wait counter shows time since GTA V and counts up', async ({ page }) => {
  await openAt(page, '2026-11-17T23:00:00Z');
  const totalSeconds = (Date.parse('2026-11-17T23:00:00Z') - Date.parse('2013-09-16T22:00:00Z')) / 1000;
  const days = Math.floor(totalSeconds / 86400);
  const rest = totalSeconds % 86400;
  const hh = String(Math.floor(rest / 3600)).padStart(2, '0');
  const mm = String(Math.floor((rest % 3600) / 60)).padStart(2, '0');
  const ss = String(rest % 60).padStart(2, '0');

  await expect(page.locator('#longwait-days')).toHaveText(new Intl.NumberFormat('da-DK').format(days));
  await expect(page.locator('#longwait-clock')).toHaveText(`${hh}:${mm}:${ss}`);
  await page.clock.runFor(1000);
  await expect(page.locator('#longwait-clock')).not.toHaveText(`${hh}:${mm}:${ss}`);
});
