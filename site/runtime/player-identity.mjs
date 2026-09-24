const PLAYER_ID_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const HASH_RE = /^[0-9a-f]{64}$/;

export class PublicRegistryError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PublicRegistryError';
  }
}

function requiredString(value, field) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new PublicRegistryError(`${field} is required.`);
  }
  return value.trim();
}

export function validatePublicRegistry(registry) {
  if (registry == null || registry.schemaVersion !== 1) {
    throw new PublicRegistryError('Public player registry schemaVersion must be 1.');
  }
  if (registry.keyLookup == null || typeof registry.keyLookup !== 'object' || Array.isArray(registry.keyLookup)) {
    throw new PublicRegistryError('Public player registry keyLookup must be an object.');
  }

  const lookup = {};
  const playerIds = new Set();
  for (const [hash, rawPlayerId] of Object.entries(registry.keyLookup)) {
    if (!HASH_RE.test(hash)) throw new PublicRegistryError(`Invalid player key hash '${hash}'.`);
    const playerId = requiredString(rawPlayerId, `keyLookup.${hash}`);
    if (!PLAYER_ID_RE.test(playerId)) throw new PublicRegistryError(`Invalid player ID '${playerId}'.`);
    if (playerIds.has(playerId)) throw new PublicRegistryError(`Multiple public key hashes resolve to player '${playerId}'.`);
    playerIds.add(playerId);
    lookup[hash] = playerId;
  }

  return { schemaVersion: 1, keyLookup: lookup };
}

function webCrypto(cryptoImpl) {
  const crypto = cryptoImpl ?? globalThis.crypto;
  if (crypto?.subtle == null || typeof crypto.subtle.digest !== 'function') {
    throw new Error('Web Crypto SHA-256 is unavailable.');
  }
  return crypto;
}

export async function sha256Hex(value, cryptoImpl = null) {
  const bytes = new TextEncoder().encode(String(value));
  const digest = new Uint8Array(await webCrypto(cryptoImpl).subtle.digest('SHA-256', bytes));
  return [...digest].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function anonymous(reason = 'no-key') {
  return {
    kind: 'anonymous',
    playerId: null,
    playerIds: [],
    reason,
  };
}

export async function resolvePlayerPerspective(publicRegistry, rawKey, { crypto = null } = {}) {
  let registry;
  try {
    registry = validatePublicRegistry(publicRegistry);
  } catch {
    return anonymous('registry-invalid');
  }

  if (typeof rawKey !== 'string' || rawKey.trim().length === 0) return anonymous('no-key');
  const normalizedKey = rawKey.trim();
  const hash = await sha256Hex(normalizedKey, crypto);
  const playerId = registry.keyLookup[hash] ?? null;
  if (playerId === null) return anonymous('wrong-key');
  return {
    kind: 'player',
    playerId,
    playerIds: [playerId],
    reason: 'matched-key',
  };
}

function normalizedCampaignId(value) {
  const campaignId = requiredString(value, 'campaignId');
  if (!/^[a-z0-9][a-z0-9._-]{0,63}$/.test(campaignId)) {
    throw new TypeError(`Invalid campaignId '${campaignId}'.`);
  }
  return campaignId;
}

export function playerKeyStorageKey(campaignId) {
  return `dndwiki:${normalizedCampaignId(campaignId)}:player-key`;
}

function requireStorage(storage) {
  if (storage == null
    || typeof storage.getItem !== 'function'
    || typeof storage.setItem !== 'function'
    || typeof storage.removeItem !== 'function') {
    throw new TypeError('storage must provide getItem, setItem, and removeItem.');
  }
  return storage;
}

export function readRememberedPlayerKey({ campaignId, storage }) {
  const key = playerKeyStorageKey(campaignId);
  try {
    const value = requireStorage(storage).getItem(key);
    return typeof value === 'string' && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

export function rememberPlayerKey({ campaignId, storage, rawKey }) {
  const value = requiredString(rawKey, 'rawKey');
  requireStorage(storage).setItem(playerKeyStorageKey(campaignId), value);
  return value;
}

export function clearRememberedPlayerKey({ campaignId, storage }) {
  try {
    requireStorage(storage).removeItem(playerKeyStorageKey(campaignId));
    return true;
  } catch {
    return false;
  }
}

export function createPlayerIdentitySession({ campaignId, publicRegistry, storage, crypto = null }) {
  const normalizedId = normalizedCampaignId(campaignId);
  const targetStorage = requireStorage(storage);
  let perspective = anonymous('not-loaded');

  return {
    get perspective() {
      return structuredClone(perspective);
    },

    async load() {
      const remembered = readRememberedPlayerKey({ campaignId: normalizedId, storage: targetStorage });
      perspective = await resolvePlayerPerspective(publicRegistry, remembered, { crypto });
      if (remembered !== null && perspective.kind !== 'player') {
        clearRememberedPlayerKey({ campaignId: normalizedId, storage: targetStorage });
      }
      return structuredClone(perspective);
    },

    async enterKey(rawKey) {
      const resolved = await resolvePlayerPerspective(publicRegistry, rawKey, { crypto });
      if (resolved.kind === 'player') {
        rememberPlayerKey({ campaignId: normalizedId, storage: targetStorage, rawKey: rawKey.trim() });
      } else {
        clearRememberedPlayerKey({ campaignId: normalizedId, storage: targetStorage });
      }
      perspective = resolved;
      return structuredClone(perspective);
    },

    clear() {
      clearRememberedPlayerKey({ campaignId: normalizedId, storage: targetStorage });
      perspective = anonymous('cleared');
      return structuredClone(perspective);
    },
  };
}
