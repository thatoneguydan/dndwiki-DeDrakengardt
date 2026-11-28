export const MAX_PAGE_SLUG_LENGTH = 256;
export const PAGE_SLUG_PATTERN = `[a-z0-9](?:[a-z0-9-]{0,${MAX_PAGE_SLUG_LENGTH - 2}}[a-z0-9])?`;
export const PAGE_ID_RE = new RegExp(`^${PAGE_SLUG_PATTERN}$`);

// Older snapshots used opaque IDs that could contain periods and underscores.
const READER_PAGE_ID_PATTERN = `[a-z0-9][a-z0-9._-]{0,${MAX_PAGE_SLUG_LENGTH - 1}}`;
export const READER_PAGE_ID_RE = new RegExp(`^${READER_PAGE_ID_PATTERN}$`);
const PAGE_ROUTE_RE = new RegExp(`^#/page/(${READER_PAGE_ID_PATTERN})(?:#(.*))?$`);

export function parsePageRoute(hash) {
  const match = PAGE_ROUTE_RE.exec(String(hash ?? ''));
  return match ? { pageId: match[1], fragment: match[2] ?? null } : null;
}
