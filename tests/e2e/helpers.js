// Shared E2E helpers. Time is always faked; the real date never matters.

/**
 * Open the page with the device clock at `iso`.
 * The server-time check (FR-04) is aborted so the real server clock can't
 * "correct" the fake one. FR-04 itself is covered by unit tests.
 */
export async function openAt(page, iso, path = '/') {
  await page.route('**/*', (route) =>
    route.request().method() === 'HEAD' ? route.abort() : route.continue(),
  );
  await page.clock.install({ time: new Date(iso) });
  await page.goto(path);
}

export const tile = (page, unit) => page.locator(`[data-unit="${unit}"] .tile__value`);
export const tileLabel = (page, unit) => page.locator(`[data-unit="${unit}"] .tile__label`);

export async function readCountdown(page) {
  const units = ['days', 'hours', 'minutes', 'seconds'];
  const values = await Promise.all(units.map((u) => tile(page, u).textContent()));
  return values.map((v) => v.trim()).join(':');
}
