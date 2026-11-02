import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openAt } from './helpers.js';

test('TC-14 / FR-09: the HTML has share tags without JS and the image is a 1200 × 630 PNG', async ({ request }) => {
  const html = await (await request.get('/')).text();
  const meta = (attr, name) => html.match(new RegExp(`<meta ${attr}="${name}" content="([^"]+)"`))?.[1];

  expect(meta('property', 'og:title')).toBeTruthy();
  expect(meta('property', 'og:description')).toBeTruthy();
  expect(meta('name', 'twitter:card')).toBe('summary_large_image');
  const image = meta('property', 'og:image');
  expect(image).toMatch(/^https?:\/\/[^/]+\/.+\.png$/);
  expect(meta('name', 'twitter:image')).toBe(image);
  expect(html).toContain('<html lang="da"');

  const res = await request.get(image);
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toBe('image/png');
  const png = await res.body();
  expect(png.subarray(1, 4).toString('ascii')).toBe('PNG');
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(630);
});

test('FR-02: the launch moment is readable without JavaScript', async ({ request }) => {
  const html = await (await request.get('/')).text();
  expect(html).toContain('torsdag 19. november 2026 kl. 00.00');
});

const seriousViolations = async (page) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  return results.violations
    .filter((v) => ['serious', 'critical'].includes(v.impact))
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
};

test.describe('TC-N2: no serious or critical axe violations', () => {
  test('before launch', async ({ page }) => {
    await openAt(page, '2026-11-10T12:00:00Z');
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('at zero', async ({ page }) => {
    await openAt(page, '2026-11-18T22:59:59Z');
    await page.clock.runFor(2000);
    await expect(page.locator('#launched')).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('after launch', async ({ page }) => {
    await openAt(page, '2026-11-20T12:00:00Z');
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('with the spoiler shield off', async ({ page }) => {
    await openAt(page, '2026-11-10T12:00:00Z');
    await page.locator('#spoiler-toggle').click();
    expect(await seriousViolations(page)).toEqual([]);
  });
});

test('TC-N4: the first visit sets no cookies and makes no third-party requests', async ({ page, context, baseURL }) => {
  const own = new URL(baseURL).host;
  const foreign = [];
  page.on('request', (req) => {
    const url = new URL(req.url());
    if (!['data:', 'blob:'].includes(url.protocol) && url.host !== own) foreign.push(req.url());
  });
  await openAt(page, '2026-11-10T12:00:00Z');
  await page.waitForLoadState('networkidle');
  expect(foreign).toEqual([]);
  expect(await context.cookies()).toEqual([]);
});

test('TC-N5: the footer has the unofficial fan project disclaimer in Danish', async ({ page }) => {
  await openAt(page, '2026-11-10T12:00:00Z');
  const footer = page.locator('footer');
  await expect(footer).toContainText('Uofficielt fanprojekt');
  await expect(footer).toContainText('Ikke tilknyttet Rockstar Games, Take-Two Interactive eller IGN');
});

test('FR-06: the calendar link downloads an .ics file', async ({ page, request }) => {
  await openAt(page, '2026-11-10T12:00:00Z');
  const link = page.getByRole('link', { name: /tilføj til kalender/i });
  const href = await link.getAttribute('href');
  expect(href).toMatch(/\.ics$/);
  await expect(link).toHaveAttribute('download', /\.ics$/);
  const res = await request.get(href);
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toMatch(/^text\/calendar/);
  expect(await res.text()).toContain('DTSTART:20261118T230000Z');
});
