import { expect, test } from '@playwright/test';
import { openAt } from './helpers.js';

test('TC-09 / FR-05: at zero the celebration starts and the page shows "Ude nu" without a reload', async ({ page }) => {
  await openAt(page, '2026-11-18T22:59:59Z');
  await page.evaluate(() => { window.__sameDocument = true; });
  await expect(page.locator('#launched')).toBeHidden();

  await page.clock.runFor(2000);
  await expect(page.locator('#launched')).toBeVisible();
  await expect(page.locator('#launched h2')).toHaveText('Ude nu');
  await expect(page.locator('body')).toHaveAttribute('data-celebrating', 'true');
  await expect(page.locator('#countdown')).toBeHidden();
  expect(await page.evaluate(() => window.__sameDocument)).toBe(true);
});

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('TC-10 / FR-05: "Ude nu" appears immediately with no animation', async ({ page }) => {
    await openAt(page, '2026-11-18T22:59:59Z');
    await page.clock.runFor(2000);
    await expect(page.locator('#launched')).toBeVisible();
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  });
});

test('TC-11 / FR-05: after the launch the page loads straight into "Ude nu" with no negative numbers', async ({ page }) => {
  await openAt(page, '2026-11-20T12:00:00Z');
  await expect(page.locator('#launched')).toBeVisible();
  await expect(page.locator('#launched h2')).toHaveText('Ude nu');
  await expect(page.locator('#countdown')).toBeHidden();
  await expect(page.locator('body')).not.toHaveAttribute('data-celebrating', 'true');
  const text = await page.locator('main').innerText();
  expect(text).not.toMatch(/-\s?\d/);
});
