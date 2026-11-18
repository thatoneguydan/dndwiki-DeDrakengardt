import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeReaderLabMapTiles } from './map-tile-delivery.mjs';

const directory = dirname(fileURLToPath(import.meta.url));
const site = resolve(process.argv[2] ?? join(directory, '../site'));
const release = JSON.parse(await readFile(join(directory, 'release.json'), 'utf8'));
const fingerprint = (content) => createHash('sha256').update(content).digest('hex');
const readText = async (path) => (await readFile(path, 'utf8')).replaceAll('\r\n', '\n');

const snapshotBytes = await readFile(join(site, 'dndwiki.snapshot.json'));
const snapshot = JSON.parse(snapshotBytes);
assert.equal(snapshot.campaign?.id, 'de-drakengardt', 'Unexpected campaign');
assert.equal(snapshot.schemaVersion, release.snapshotSchema, 'Publisher snapshot schema changed');
assert.ok(Array.isArray(snapshot.pages), 'Publisher snapshot is missing its pages');

const entryPaths = ['index.html', 'styles.css', 'runtime/wiki-shell-entry.mjs'];
for (const path of entryPaths) {
  assert.equal(fingerprint(await readText(join(site, path))), release.publisher[path],
    `Publisher ${path} changed. Verify compatibility before deploying this reader.`);
  assert.ok(release.files[path], `Missing reader release entry ${path}`);
}

const files = await Promise.all(Object.entries(release.files).map(async ([path, expected]) => {
  assert.ok(entryPaths.includes(path) || /^runtime\/[a-z0-9-]+\.(?:css|mjs|json|txt)$/i.test(path),
    `Unexpected reader release path ${path}`);
  const content = await readText(join(directory, 'release', path));
  assert.equal(fingerprint(content), expected, `Reader release fingerprint changed for ${path}`);
  return { path, content };
}));

const revision = fingerprint(snapshotBytes).slice(0, 20);
for (const { path, content } of files) {
  const output = join(site, path);
  await mkdir(dirname(output), { recursive: true });
  const assembled = path === 'index.html' ? content
    .replace('<html ', `<html data-reader-snapshot-revision="${revision}" `)
    .replace('</head>', `<link rel="preload" as="fetch" crossorigin="anonymous" href="./dndwiki.snapshot.json?v=${revision}">\n</head>`) : content;
  await writeFile(output, assembled, 'utf8');
}

const tiles = await writeReaderLabMapTiles(site, snapshot);
console.log(`Staged the approved reader from ${release.source} (${files.length} files, ${tiles.count} map tiles).`);
