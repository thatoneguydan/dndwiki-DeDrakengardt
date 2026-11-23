const LOGICAL_PATH = /^assets\/[a-f0-9]{24}(?:\.[a-z0-9]{1,10})?$/;
const CIPHERTEXT_PATH = /^assets\/private\/[a-f0-9]{64}\.json$/;
const RASTER_TYPES = Object.freeze({
  apng: 'image/apng', avif: 'image/avif', bmp: 'image/bmp', gif: 'image/gif',
  ico: 'image/x-icon', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
});

export function isLogicalPrivateAssetPath(value) {
  return typeof value === 'string' && LOGICAL_PATH.test(value);
}

// Only passive raster formats can be rendered inline or opened as images.
// In particular, an authenticated SVG or HTML attachment is still untrusted.
export function privateAssetMediaType(logicalPath) {
  const extension = logicalPath.split('.').at(-1);
  return Object.hasOwn(RASTER_TYPES, extension) ? RASTER_TYPES[extension] : 'application/octet-stream';
}

export function privateAssetPurpose(logicalPath) {
  if (!isLogicalPrivateAssetPath(logicalPath)) throw new TypeError('Invalid protected attachment reference.');
  return `attachment:${logicalPath}`;
}

export function validatePrivateAssetDescriptor(logicalPath, descriptor) {
  if (!isLogicalPrivateAssetPath(logicalPath) || !descriptor || typeof descriptor.path !== 'string'
    || !CIPHERTEXT_PATH.test(descriptor.path) || descriptor.mediaType !== privateAssetMediaType(logicalPath)) {
    throw new TypeError('Invalid protected attachment descriptor.');
  }
  return { path: descriptor.path, mediaType: descriptor.mediaType };
}
