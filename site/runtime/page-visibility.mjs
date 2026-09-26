const PLAYER_ID_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const PAGE_ID_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;

export class PageVisibilityError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PageVisibilityError';
  }
}

function validatePerspective(perspective) {
  if (perspective == null || perspective.kind === 'anonymous') {
    return { kind: 'anonymous', playerIds: [] };
  }
  if (perspective.kind !== 'player' || !Array.isArray(perspective.playerIds)) {
    throw new PageVisibilityError('Perspective must be anonymous or a player perspective.');
  }
  const playerIds = [];
  const seen = new Set();
  for (const value of perspective.playerIds) {
    if (typeof value !== 'string' || !PLAYER_ID_RE.test(value)) {
      throw new PageVisibilityError(`Invalid perspective player ID '${String(value)}'.`);
    }
    if (!seen.has(value)) {
      seen.add(value);
      playerIds.push(value);
    }
  }
  if (playerIds.length === 0) {
    throw new PageVisibilityError('Player perspective requires at least one player ID.');
  }
  return { kind: 'player', playerIds };
}

function validateTags(page) {
  if (page.tags === undefined) return [];
  if (!Array.isArray(page.tags)) throw new PageVisibilityError(`Page '${page.pageId}' tags must be an array.`);
  return page.tags.map((tag, index) => {
    if (tag == null || typeof tag !== 'object' || typeof tag.name !== 'string' || tag.name.trim().length === 0) {
      throw new PageVisibilityError(`Page '${page.pageId}' tag ${index} is invalid.`);
    }
    const normalized = { name: tag.name.trim() };
    for (const field of ['color', 'backgroundColor', 'borderColor']) {
      if (tag[field] === undefined) continue;
      if (typeof tag[field] !== 'string') throw new PageVisibilityError(`Page '${page.pageId}' tag ${index} ${field} must be a string.`);
      normalized[field] = tag[field];
    }
    return normalized;
  });
}

function validatePage(page) {
  if (page == null || typeof page !== 'object') throw new PageVisibilityError('Page is required.');
  if (typeof page.pageId !== 'string' || !PAGE_ID_RE.test(page.pageId)) {
    throw new PageVisibilityError('Page requires a valid opaque pageId.');
  }
  if (!Array.isArray(page.segments)) throw new PageVisibilityError(`Page '${page.pageId}' requires segments.`);
  if (page.public !== undefined && typeof page.public !== 'boolean') {
    throw new PageVisibilityError(`Page '${page.pageId}' public visibility flag must be boolean.`);
  }

  return {
    pageId: page.pageId,
    public: page.public === true,
    tags: validateTags(page),
    segments: page.segments.map((segment, index) => {
      if (segment == null || (segment.kind !== 'public' && segment.kind !== 'keyed')) {
        throw new PageVisibilityError(`Page '${page.pageId}' segment ${index} has invalid kind.`);
      }
      if (typeof segment.markdown !== 'string') {
        throw new PageVisibilityError(`Page '${page.pageId}' segment ${index} requires Markdown.`);
      }
      if (!Array.isArray(segment.playerIds)) {
        throw new PageVisibilityError(`Page '${page.pageId}' segment ${index} requires playerIds.`);
      }
      const playerIds = [];
      const seen = new Set();
      for (const value of segment.playerIds) {
        if (typeof value !== 'string' || !PLAYER_ID_RE.test(value)) {
          throw new PageVisibilityError(`Page '${page.pageId}' segment ${index} has invalid player ID.`);
        }
        if (!seen.has(value)) {
          seen.add(value);
          playerIds.push(value);
        }
      }
      if (segment.kind === 'public' && playerIds.length !== 0) {
        throw new PageVisibilityError(`Page '${page.pageId}' public segment ${index} must not name players.`);
      }
      if (segment.kind === 'keyed' && playerIds.length === 0) {
        throw new PageVisibilityError(`Page '${page.pageId}' keyed segment ${index} requires an audience.`);
      }
      return { kind: segment.kind, playerIds, markdown: segment.markdown };
    }),
  };
}

export function visiblePageSegments(page, perspective) {
  const validatedPage = validatePage(page);
  const viewer = validatePerspective(perspective);
  const allowed = new Set(viewer.playerIds);

  return validatedPage.segments
    .filter((segment) => segment.kind === 'public'
      || (viewer.kind === 'player' && segment.playerIds.some((playerId) => allowed.has(playerId))))
    .map((segment) => ({ kind: segment.kind, markdown: segment.markdown }));
}

export function buildPageView(page, perspective) {
  const validatedPage = validatePage(page);
  const viewer = validatePerspective(perspective);
  const allowed = new Set(viewer.playerIds);
  const visibleMarkdown = [];
  let containsKeyedSegments = false;

  for (const segment of validatedPage.segments) {
    if (segment.kind === 'public') {
      visibleMarkdown.push(segment.markdown);
      continue;
    }
    containsKeyedSegments = true;
    if (viewer.kind === 'player' && segment.playerIds.some((playerId) => allowed.has(playerId))) {
      visibleMarkdown.push(segment.markdown);
    }
  }

  const markdown = visibleMarkdown.join('');
  const showKeyEntry = viewer.kind === 'anonymous' && containsKeyedSegments;
  const view = {
    pageId: validatedPage.pageId,
    status: markdown.length > 0 || validatedPage.public ? 'visible' : showKeyEntry ? 'gated' : 'empty',
    markdown,
    showKeyEntry,
  };
  if (validatedPage.tags.length > 0) view.tags = validatedPage.tags;
  return view;
}

export function buildAnonymousPageView(page) {
  return buildPageView(page, { kind: 'anonymous', playerIds: [] });
}
