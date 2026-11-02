# Efter Midnat: GTA VI countdown (Denmark)

A static countdown site to the GTA VI launch at **00:00 Copenhagen time**, in Danish, in the "After Midnight" style.
Built from `GTA6-Countdown-Requirements.docx` (v0.4) plus the changes in `spec-changes-v0.5.md`.

Unofficial fan project, not affiliated with Rockstar Games, Take-Two Interactive or IGN.

## Put it on GitHub (about 5 minutes)

1. Create a new **empty** repository on github.com (for example `efter-midnat`). Don't add a README there.
2. Upload this folder. **Don't upload `node_modules/` or `dist/`** (they're in `.gitignore`). With git:
   ```bash
   git init -b main
   git add .
   git commit -m "Efter Midnat countdown"
   git remote add origin https://github.com/<your-user>/efter-midnat.git
   git push -u origin main
   ```
3. On GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Open the **Actions** tab. The "Test and deploy" workflow runs every test, then publishes the site.
   The address appears on the workflow run, normally `https://<your-user>.github.io/efter-midnat/`.

Every later push to `main` tests and republishes automatically. If a test fails, nothing is published.

## Run it on your own machine

Needs [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
```

```bash
npm start
```

Then open http://localhost:4173/. You can also run `npm run build` and double-click `dist/index.html`.
That works too, except the device-clock correction, which needs a server.

## Where to change things

| What | File |
|------|------|
| Launch time, time zone, GTA V date, links, site name | `src/config.json` (the only place dates live, FR-07) |
| Videos (trailers, reviews from 18 Nov, launch clips) | `data/videos.json` |
| IGN articles | `data/articles.json` |
| Text and layout | `src/index.html`, `src/styles.css` |

**Adding a video:** add an entry with `title`, `channel`, `youtubeId` (the 11 characters after `watch?v=`),
`phase` (`pre`, `review` from the embargo date, or `launch` from launch) and `spoiler` (`safe`, `mild` or `story`).
Then run `npm run thumbs` and commit the new image in `src/assets/thumbs/`.
(The build also fetches missing thumbnails on its own.)

**Adding an IGN article:** add `title`, `url` (must start with `https://www.ign.com/`), `publishedAt` (`YYYY-MM-DD`)
and `spoiler`. The list is sorted newest first automatically.

**If the launch time changes:** edit `launchLocal` in `src/config.json`, then run `npm run og` to redraw the share image.

## Tests

| Command | What it runs |
|---------|--------------|
| `npm test` | Unit and data tests (Vitest) |
| `npm run test:e2e` | Browser tests (Playwright, fake clock and time zones). First time: `npx playwright install chromium` |
| `npm run check` | JavaScript size budget (under 50 KB gzipped) |

Each test is named after its test ID and requirement, for example `TC-09 / FR-05`. The E2E tests use the fixed data in
`tests/fixtures/data/`, so editing the real lists never breaks them.

Not automated yet: the Lighthouse part of TC-N1 (LCP and CLS on simulated 4G).

## Spec coverage

| Requirement | Tests |
|-------------|-------|
| FR-01 countdown | TC-01, TC-02 |
| FR-02 Copenhagen time for everyone | TC-03, TC-04 |
| FR-04 clock correction | TC-07, TC-08, TC-24 |
| FR-05 zero moment and "Ude nu" | TC-09, TC-10, TC-11 |
| FR-06 calendar file | TC-12 |
| FR-07 single config | TC-13 |
| FR-09 share image | TC-14 |
| FR-11 / FR-12 / FR-18 videos, click-to-load, own thumbnails | TC-16, TC-17 |
| FR-15 spoiler shield | TC-22 |
| FR-17 long wait | TC-23 |
| FR-19 IGN articles | TC-25, TC-26 |
| Accessibility, privacy, disclaimer | TC-N2, TC-N3, TC-N4, TC-N5 |

Fonts: Big Shoulders Display and Space Grotesk, self-hosted under the SIL Open Font License (see `src/fonts/`).
