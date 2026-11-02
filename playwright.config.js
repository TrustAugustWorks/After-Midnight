import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/`,
    timezoneId: 'Europe/Copenhagen',
    locale: 'da-DK',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // E2E tests run against fixture data so they don't change when the curated lists do.
    command: 'node scripts/build.mjs --out .e2e-dist && node scripts/serve.mjs .e2e-dist',
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    env: {
      PORT: String(PORT),
      SITE_URL: `http://localhost:${PORT}/`,
      DATA_DIR: 'tests/fixtures/data',
    },
  },
});
