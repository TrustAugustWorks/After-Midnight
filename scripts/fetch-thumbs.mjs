// FR-18: download YouTube thumbnails once, so the page serves them from our own domain.
// Usage: npm run thumbs   (only fetches thumbnails that are missing)
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const THUMBS_DIR = join('src', 'assets', 'thumbs');

const exists = (path) => access(path).then(() => true, () => false);

export async function fetchThumbs(ids, dir = THUMBS_DIR) {
  await mkdir(dir, { recursive: true });
  for (const id of new Set(ids)) {
    const file = join(dir, `${id}.jpg`);
    if (await exists(file)) continue;
    const res = await fetch(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`);
    if (!res.ok) throw new Error(`Could not download the thumbnail for ${id} (HTTP ${res.status}).`);
    await writeFile(file, Buffer.from(await res.arrayBuffer()));
    console.log(`thumbnail saved: ${file}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dirs = ['data', join('tests', 'fixtures', 'data')];
  const ids = [];
  for (const dir of dirs) {
    const videos = JSON.parse(await readFile(join(dir, 'videos.json'), 'utf8'));
    ids.push(...videos.map((v) => v.youtubeId));
  }
  await fetchThumbs(ids);
  console.log('All thumbnails present.');
}
