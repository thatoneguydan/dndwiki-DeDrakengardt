import { resolvePlayerPerspective } from './player-identity.mjs';

const ID = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const PLAYER_KEY = /^dnd-(?:[A-Za-z0-9_-]{24}|[0-9a-f]{36})$/;
const BASE64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const encodeText = (value) => new TextEncoder().encode(value);
const selectedNonces = new WeakMap();

export function isSupportedSealedPlayerKey(value) {
  return typeof value === 'string' && PLAYER_KEY.test(value.trim());
}

function webCrypto(crypto) {
  const implementation = crypto ?? globalThis.crypto;
  if (implementation?.subtle == null || typeof implementation.getRandomValues !== 'function') {
    throw new Error('Protected player content requires Web Crypto.');
  }
  return implementation;
}

function encodeBase64Url(bytes) {
  const chunks = [];
  // The chunk size is a multiple of three, so only the last chunk has padding.
  const chunkSize = 24 * 1024;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    chunks.push(btoa(String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))));
  }
  return chunks.join('').replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function decodeBase64Url(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid protected payload encoding.');
  const last = BASE64URL.indexOf(value.at(-1));
  const remainder = value.length % 4;
  if (remainder === 1 || (remainder === 2 && (last & 15)) || (remainder === 3 && (last & 3))) {
    throw new Error('Invalid protected payload encoding.');
  }
  return Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), (character) => character.charCodeAt(0));
}

function sameBytes(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

async function prepare({ campaignId, playerId, rawKey, purpose, crypto }) {
  if (typeof campaignId !== 'string' || !ID.test(campaignId) || typeof playerId !== 'string' || !ID.test(playerId)
    || typeof purpose !== 'string' || purpose.length === 0 || purpose.length > 2048) {
    throw new TypeError('Invalid protected payload identity.');
  }
  if (!isSupportedSealedPlayerKey(rawKey)) throw new Error('Protected publication requires a generated player key.');
  const normalizedKey = rawKey.trim();
  const implementation = webCrypto(crypto);
  const input = await implementation.subtle.importKey('raw', encodeText(normalizedKey), 'HKDF', false, ['deriveKey', 'deriveBits']);
  const context = JSON.stringify([campaignId, playerId, purpose]);
  const associatedData = encodeText(context);
  const params = (domain) => ({
    name: 'HKDF', hash: 'SHA-256', salt: encodeText(`dndwiki:sealed-player:${domain}:v1`), info: associatedData,
  });
  return { implementation, input, normalizedKey, context, associatedData, params };
}

function gcmKey(prepared) {
  return prepared.implementation.subtle.deriveKey(prepared.params('encryption'), prepared.input,
    { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

function gcmOptions(prepared, iv) {
  return { name: 'AES-GCM', iv, additionalData: prepared.associatedData, tagLength: 128 };
}

async function decrypt(prepared, key, envelope) {
  if (envelope?.version !== 1) throw new Error('Unsupported protected payload.');
  const iv = decodeBase64Url(envelope.iv);
  const ciphertext = decodeBase64Url(envelope.ciphertext);
  if (iv.length !== 12 || ciphertext.length < 16) throw new Error('Invalid protected payload.');
  const value = await prepared.implementation.subtle.decrypt(gcmOptions(prepared, iv), key, ciphertext);
  return { iv, bytes: new Uint8Array(value) };
}

async function selectNonce(prepared, key, value, previous) {
  if (previous != null) {
    try {
      const decrypted = await decrypt(prepared, key, previous);
      if (sameBytes(decrypted.bytes, value)) return decrypted.iv;
    } catch {
      // An unusable prior envelope cannot authorize nonce reuse.
    }
  }
  return prepared.implementation.getRandomValues(new Uint8Array(12));
}

async function replayNonce(replay, prepared, key, plaintext, previous) {
  if (typeof replay !== 'object' || replay === null) throw new TypeError('Invalid protected payload replay token.');
  const { subtle } = prepared.implementation;
  const [keyDigest, plaintextDigest] = await Promise.all([
    subtle.digest('SHA-256', encodeText(prepared.normalizedKey)),
    subtle.digest('SHA-256', plaintext),
  ]);
  const existing = selectedNonces.get(replay);
  if (existing != null) {
    if (existing.context !== prepared.context || !sameBytes(existing.keyDigest, new Uint8Array(keyDigest))
      || !sameBytes(existing.plaintextDigest, new Uint8Array(plaintextDigest))) {
      throw new Error('Protected payload changed during publication.');
    }
    return existing.iv;
  }
  // Transport reads an attachment twice. Reproduce the same envelope only
  // after proving that the context, key and bytes all match its preflight.
  const iv = selectNonce(prepared, key, plaintext, previous);
  selectedNonces.set(replay, {
    context: prepared.context, keyDigest: new Uint8Array(keyDigest), plaintextDigest: new Uint8Array(plaintextDigest), iv,
  });
  return iv;
}

export async function sealPlayerPayload({ value, previous, replay, ...options }) {
  if (Object.prototype.toString.call(value) !== '[object Uint8Array]') throw new TypeError('Protected payload requires bytes.');
  const plaintext = new Uint8Array(value);
  const prepared = await prepare(options);
  const key = await gcmKey(prepared);
  const iv = await (replay === undefined
    ? selectNonce(prepared, key, plaintext, previous)
    : replayNonce(replay, prepared, key, plaintext, previous));
  const ciphertext = await prepared.implementation.subtle.encrypt(gcmOptions(prepared, iv), key, plaintext);
  return { version: 1, iv: encodeBase64Url(iv), ciphertext: encodeBase64Url(new Uint8Array(ciphertext)) };
}

export async function openPlayerPayload({ envelope, ...options }) {
  const prepared = await prepare(options);
  const key = await gcmKey(prepared);
  try {
    return (await decrypt(prepared, key, envelope)).bytes;
  } catch {
    throw new Error('Protected player content could not be authenticated.');
  }
}

export async function playerPayloadLocator(options) {
  const prepared = await prepare(options);
  const bytes = await prepared.implementation.subtle.deriveBits(prepared.params('locator'), prepared.input, 256);
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function expandRows(base, entries) {
  if (!Array.isArray(base) || !Array.isArray(entries)) throw new Error('Invalid protected view rows.');
  return entries.map((entry) => {
    if (Number.isInteger(entry) && entry >= 0 && entry < base.length) return base[entry];
    if (entry !== null && typeof entry === 'object' && !Array.isArray(entry)) return entry;
    throw new Error('Invalid protected view row.');
  });
}

export async function openSealedPlayerView({ snapshot, playerId, rawKey, crypto }) {
  const perspective = await resolvePlayerPerspective(snapshot?.players, rawKey, { crypto });
  if (snapshot?.schemaVersion !== 1 || snapshot.playerViews?.schemaVersion !== 1
    || perspective.kind !== 'player' || perspective.playerId !== playerId) {
    throw new Error('Protected player view is unavailable for this key.');
  }
  const byPlayer = snapshot.playerViews.byPlayer;
  if (byPlayer == null || typeof byPlayer !== 'object' || Array.isArray(byPlayer)) throw new Error('Invalid protected player view.');
  const { playerViews, ...publicSnapshot } = snapshot;
  if (!Object.hasOwn(byPlayer, playerId)) return { ...publicSnapshot, privateAssets: {} };
  const plaintext = await openPlayerPayload({
    campaignId: snapshot.campaign?.id, playerId, rawKey, purpose: 'view', envelope: byPlayer[playerId], crypto,
  });
  let overlay;
  try { overlay = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(plaintext)); }
  catch { throw new Error('Invalid protected player view.'); }
  if (overlay?.schemaVersion !== 1 || !Array.isArray(overlay.browse?.categories) || !overlay.privateAssets
    || typeof overlay.privateAssets !== 'object' || Array.isArray(overlay.privateAssets)) throw new Error('Invalid protected player view.');
  const graph = {
    schemaVersion: 1,
    search: expandRows(snapshot.graph.search, overlay.graph?.search),
    references: expandRows(snapshot.graph.references, overlay.graph?.references),
    assets: expandRows(snapshot.graph.assets, overlay.graph?.assets),
  };
  return {
    ...publicSnapshot,
    pages: expandRows(snapshot.pages, overlay.pages),
    graph,
    browse: overlay.browse,
    privateAssets: overlay.privateAssets,
    ...(Object.hasOwn(overlay, 'collections') ? { collections: overlay.collections } : {}),
  };
}
