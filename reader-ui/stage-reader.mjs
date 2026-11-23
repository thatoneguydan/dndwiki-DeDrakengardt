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
const readText = async (file) => (await readFile(file, 'utf8')).replaceAll('\r\n', '\n');
const sha256 = /^[a-f0-9]{64}$/;
const entryPaths = ['index.html', 'styles.css', 'runtime/wiki-shell-entry.mjs'];
const protectedRuntimePaths = [
  'runtime/sealed-player-view.mjs',
  'runtime/private-asset-format.mjs',
  'runtime/private-asset-reader.mjs',
];

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

async function verifyFingerprint(file, expected, message) {
  assert.match(expected, sha256, message);
  assert.equal(fingerprint(await readText(file)), expected, message);
}

function isAnonymous(audience) {
  return audience?.public === true && Array.isArray(audience.playerIds) && audience.playerIds.length === 0;
}

function verifyPublicProjection(snapshot) {
  assert.ok(!Object.hasOwn(snapshot, 'privateAssets'), 'Protected publisher exposed private attachment metadata');
  for (const page of snapshot.pages) {
    assert.equal(page.public, true, 'Protected publisher exposed a private page');
    assert.ok(Array.isArray(page.segments) && page.segments.every((segment) =>
      segment?.kind === 'public' && Array.isArray(segment.playerIds) && segment.playerIds.length === 0),
    'Protected publisher exposed a private page segment');
    if (page.mapsmith) {
      assert.ok(isAnonymous(page.mapsmith.audience), 'Protected publisher exposed a private map');
      for (const type of ['pins', 'regions']) {
        const annotations = page.mapsmith.map?.[type];
        assert.ok(Array.isArray(annotations) && annotations.every((item) => isAnonymous(item?.audience)),
          'Protected publisher exposed private map annotations');
      }
    }
  }
  for (const type of ['search', 'references', 'assets']) {
    assert.ok(Array.isArray(snapshot.graph?.[type]) && snapshot.graph[type].every((row) => isAnonymous(row?.audience)),
      'Protected publisher exposed private graph rows');
  }
}

async function verifyProtectedSnapshot(snapshot) {
  const protectedPublisher = release.protectedPublisher;
  assert.equal(protectedPublisher?.playerViewsSchema, 1, 'Unsupported protected reader release');
  assert.ok(isRecord(protectedPublisher.runtime) && protectedRuntimePaths.every((path) =>
    typeof protectedPublisher.runtime[path] === 'string' && sha256.test(protectedPublisher.runtime[path])),
  'Protected publisher release is missing runtime fingerprints');
  const hasProtectedMarker = Object.hasOwn(snapshot, 'playerViews');
  if (!hasProtectedMarker) {
    // A legacy snapshot and its runtime must come from the same publication.
    for (const path of protectedRuntimePaths) {
      await assert.rejects(readFile(join(site, path)), { code: 'ENOENT' },
        'Protected publisher snapshot is missing its player views marker');
    }
    return;
  }
  assert.equal(snapshot.playerViews?.schemaVersion, protectedPublisher.playerViewsSchema,
    'Publisher player views schema changed');
  const byPlayer = snapshot.playerViews?.byPlayer;
  assert.ok(isRecord(byPlayer), 'Publisher player views must be encrypted envelopes');
  assert.ok(isRecord(snapshot.players?.keyLookup), 'Protected snapshot is missing its public reader registry');
  const registeredPlayers = new Set(Object.values(snapshot.players.keyLookup));
  for (const [player, envelope] of Object.entries(byPlayer)) {
    assert.ok(registeredPlayers.has(player), 'Protected player view is missing a registered reader');
    assert.ok(isRecord(envelope) && Object.keys(envelope).length === 3 && envelope.version === 1
      && typeof envelope.iv === 'string' && /^[\w-]{16}$/.test(envelope.iv)
      && typeof envelope.ciphertext === 'string' && /^[\w-]{22,}$/.test(envelope.ciphertext),
    'Publisher player views must be encrypted envelopes');
  }
  await Promise.all(protectedRuntimePaths.map((path) =>
    verifyFingerprint(join(site, path), protectedPublisher.runtime[path],
      `Protected publisher ${path} changed. Verify compatibility before deploying this reader.`)));
  verifyPublicProjection(snapshot);
}

const tomatoEndpoint = release.tomatoNotificationsEndpoint ? new URL(release.tomatoNotificationsEndpoint) : null;
let tomatoAttribute = '';
if (tomatoEndpoint) {
  assert.ok(tomatoEndpoint.protocol === 'https:' && !tomatoEndpoint.username && !tomatoEndpoint.password && !tomatoEndpoint.hash,
    'Tomato notifications require an HTTPS endpoint without embedded credentials or a fragment');
  const url = tomatoEndpoint.href.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
  tomatoAttribute = ` data-tomato-notifications-endpoint="${url}"`;
}
const snapshotBytes = await readFile(join(site, 'dndwiki.snapshot.json'));
const snapshot = JSON.parse(snapshotBytes);
assert.equal(snapshot.campaign?.id, 'de-drakengardt', 'Unexpected campaign');
assert.equal(snapshot.schemaVersion, release.snapshotSchema, 'Publisher snapshot schema changed');
assert.ok(Array.isArray(snapshot.pages), 'Publisher snapshot is missing its pages');
for (const path of entryPaths) {
  await verifyFingerprint(join(site, path), release.publisher[path],
    `Publisher ${path} changed. Verify compatibility before deploying this reader.`);
  assert.ok(release.files[path], `Missing reader release entry ${path}`);
}
await verifyProtectedSnapshot(snapshot);
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
    .replace('<html ', `<html data-reader-snapshot-revision="${revision}"${tomatoAttribute} `)
    .replace('</head>', `<link rel="preload" as="fetch" crossorigin="anonymous" href="./dndwiki.snapshot.json?v=${revision}">\n</head>`) : content;
  await writeFile(output, assembled, 'utf8');
}
const tiles = await writeReaderLabMapTiles(site, snapshot);
console.log(`Staged the approved reader from ${release.source} (${files.length} files, ${tiles.count} map tiles).`);
