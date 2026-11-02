// Builds the static site into dist/ (or --out <dir>).
// Env: SITE_URL overrides config.siteUrl (absolute URLs for share tags),
//      DATA_DIR picks the data folder (E2E tests use tests/fixtures/data).
import { build } from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { launchInstant, zonedToInstant, zoneOffset, formatDanishDateTime, formatDanishDate } from '../src/js/time.js';
import { isShielded, sortArticles } from '../src/js/content.js';
import { launchEvent } from '../src/js/ics.js';
import { fetchThumbs } from './fetch-thumbs.mjs';

const outIndex = process.argv.indexOf('--out');
const OUT = outIndex > -1 ? process.argv[outIndex + 1] : 'dist';
const DATA_DIR = process.env.DATA_DIR || 'data';

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const config = await readJson(join('src', 'config.json'));
const videos = await readJson(join(DATA_DIR, 'videos.json'));
const articles = await readJson(join(DATA_DIR, 'articles.json'));

const siteUrl = new URL(process.env.SITE_URL || config.siteUrl).href.replace(/\/?$/, '/');
const siteConfig = { ...config, siteUrl };

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// JSON inside <script>: escape "<" so the data can never close the tag.
const scriptJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

function isoWithOffset(ms, timeZone) {
  const offsetMin = zoneOffset(ms, timeZone) / 60_000;
  const sign = offsetMin < 0 ? '-' : '+';
  const abs = Math.abs(offsetMin);
  const local = new Date(ms + offsetMin * 60_000).toISOString().slice(0, 19);
  return `${local}${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}

function shieldOverlay(level) {
  const text = level === 'story' ? 'Indeholder historie-spoilere' : 'Kan indeholde milde spoilere';
  return `<div class="shield"><p>${text}</p>` +
    '<button type="button" class="btn btn--small shield__reveal">Vis alligevel</button></div>';
}

function videoCard(v) {
  const shielded = isShielded(v.spoiler, true);
  return `        <li class="video-card item${shielded ? ' is-shielded' : ''}" data-spoiler="${v.spoiler}" data-phase="${v.phase}" data-youtube-id="${esc(v.youtubeId)}">
          <div class="shield-content"${shielded ? ' inert' : ''}>
            <div class="video-card__media">
              <button class="video-card__play" type="button" aria-label="Afspil: ${esc(v.title)}"${shielded ? ' disabled' : ''}><img src="assets/thumbs/${esc(v.youtubeId)}.jpg" alt="" width="480" height="360" loading="lazy" decoding="async"></button>
            </div>
            <div class="video-card__meta">
              <p class="video-card__title">${esc(v.title)}</p>
              <p class="video-card__channel">${esc(v.channel)}</p>
            </div>
          </div>
          ${shieldOverlay(v.spoiler)}
        </li>`;
}

function articleItem(a) {
  const shielded = isShielded(a.spoiler, true);
  const date = formatDanishDate(Date.parse(`${a.publishedAt}T12:00:00Z`), config.timeZone);
  return `        <li class="article item${shielded ? ' is-shielded' : ''}" data-spoiler="${a.spoiler}">
          <div class="shield-content"${shielded ? ' inert' : ''}>
            <a href="${esc(a.url)}">${esc(a.title)}</a>
            <p class="article__meta"><span class="badge">IGN</span><time datetime="${a.publishedAt}">${date}</time></p>
          </div>
          ${shieldOverlay(a.spoiler)}
        </li>`;
}

const launch = launchInstant(config);
const launchText = formatDanishDateTime(launch, config.timeZone);
const title = `${config.siteName} · Nedtælling til GTA VI i Danmark`;
const description = `Hvor længe er der til GTA VI? Nedtælling til ${launchText} dansk tid på ${config.platforms}.`;

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Event',
  name: 'Lancering af GTA VI i Danmark',
  startDate: isoWithOffset(launch, config.timeZone),
  eventStatus: 'https://schema.org/EventScheduled',
  eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
  location: { '@type': 'VirtualLocation', url: siteUrl },
  description,
  organizer: { '@type': 'Organization', name: config.siteName, url: siteUrl },
};

const appConfig = {
  timeZone: config.timeZone,
  launchLocal: config.launchLocal,
  reviewEmbargoLocal: config.reviewEmbargoLocal,
  gtaVReleaseLocal: config.gtaVReleaseLocal,
  soundtrack: { youtubeId: config.soundtrack.youtubeId, title: config.soundtrack.title },
};

const values = {
  title: esc(title),
  description: esc(description),
  siteName: esc(config.siteName),
  siteUrl: esc(siteUrl),
  ogImage: esc(new URL('assets/og.png', siteUrl).href),
  ogImageAlt: esc(`Nedtælling til GTA VI: ${launchText} dansk tid`),
  jsonLd: scriptJson(jsonLd),
  appConfig: scriptJson(appConfig),
  launchIso: isoWithOffset(launch, config.timeZone),
  launchText: esc(launchText),
  platforms: esc(config.platforms),
  soundtrackTitle: esc(config.soundtrack.title),
  soundtrackArtists: esc(config.soundtrack.artists),
  soundtrackAlbum: esc(config.soundtrack.album),
  soundtrackChannel: esc(config.soundtrack.channel),
  gtaVText: esc(formatDanishDate(zonedToInstant(config.gtaVReleaseLocal, config.timeZone), config.timeZone)),
  videos: videos.map(videoCard).join('\n'),
  articles: sortArticles(articles).map(articleItem).join('\n'),
  ignGamePage: esc(config.links.ignGamePage),
  officialLink: esc(config.links.official),
};

const template = await readFile(join('src', 'index.html'), 'utf8');
const html = template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
  if (!(key in values)) throw new Error(`Unknown template placeholder ${match}`);
  return values[key];
});

await fetchThumbs(videos.map((v) => v.youtubeId));

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
await build({
  entryPoints: [join('src', 'js', 'main.js')],
  outfile: join(OUT, 'app.js'),
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2020',
  legalComments: 'none',
  logLevel: 'warning',
});
await cp(join('src', 'styles.css'), join(OUT, 'styles.css'));
await cp(join('src', 'fonts'), join(OUT, 'fonts'), { recursive: true });
await cp(join('src', 'assets'), join(OUT, 'assets'), { recursive: true });
await writeFile(join(OUT, 'index.html'), html);
await writeFile(join(OUT, 'gta6-lancering.ics'), launchEvent(siteConfig, { stamp: Date.now() }));
// GitHub Pages: serve files as-is, without Jekyll processing.
await writeFile(join(OUT, '.nojekyll'), '');

console.log(`Built ${OUT}/ for ${siteUrl} (data: ${DATA_DIR})`);
