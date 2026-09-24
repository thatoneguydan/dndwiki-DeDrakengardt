const PLAYER_ID_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const PAGE_ID_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;

export class ViewerGraphError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ViewerGraphError';
  }
}

function viewerIds(perspective) {
  if (perspective == null || perspective.kind === 'anonymous') return [];
  if (perspective.kind !== 'player' || !Array.isArray(perspective.playerIds) || perspective.playerIds.length === 0) {
    throw new ViewerGraphError('Perspective must be anonymous or a non-empty player perspective.');
  }
  const ids = [];
  const seen = new Set();
  for (const id of perspective.playerIds) {
    if (typeof id !== 'string' || !PLAYER_ID_RE.test(id)) throw new ViewerGraphError(`Invalid player ID '${String(id)}'.`);
    if (!seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

function validateAudience(audience, field) {
  if (audience == null || typeof audience !== 'object' || typeof audience.public !== 'boolean' || !Array.isArray(audience.playerIds)) {
    throw new ViewerGraphError(`${field} has invalid audience.`);
  }
  const playerIds = [];
  const seen = new Set();
  for (const id of audience.playerIds) {
    if (typeof id !== 'string' || !PLAYER_ID_RE.test(id)) throw new ViewerGraphError(`${field} has invalid audience player ID.`);
    if (!seen.has(id)) {
      seen.add(id);
      playerIds.push(id);
    }
  }
  if (audience.public && playerIds.length !== 0) throw new ViewerGraphError(`${field} public audience must not name players.`);
  if (!audience.public && playerIds.length === 0) throw new ViewerGraphError(`${field} keyed audience requires players.`);
  return { public: audience.public, playerIds };
}

function visible(audience, allowed) {
  return audience.public || audience.playerIds.some((id) => allowed.has(id));
}

function pageId(value, field) {
  if (typeof value !== 'string' || !PAGE_ID_RE.test(value)) throw new ViewerGraphError(`${field} must be an opaque page ID.`);
  return value;
}

function nonNegativeInteger(value, field) {
  if (!Number.isInteger(value) || value < 0) throw new ViewerGraphError(`${field} must be a non-negative integer.`);
  return value;
}

function validateGraph(graph) {
  if (graph == null || graph.schemaVersion !== 1) throw new ViewerGraphError('Viewer graph schemaVersion must be 1.');
  if (!Array.isArray(graph.search) || !Array.isArray(graph.references) || !Array.isArray(graph.assets)) {
    throw new ViewerGraphError('Viewer graph requires search, references, and assets arrays.');
  }

  const search = graph.search.map((record, index) => {
    const field = `search[${index}]`;
    if (typeof record?.markdown !== 'string') throw new ViewerGraphError(`${field} requires Markdown.`);
    return {
      pageId: pageId(record.pageId, `${field}.pageId`),
      segmentIndex: nonNegativeInteger(record.segmentIndex, `${field}.segmentIndex`),
      audience: validateAudience(record.audience, field),
      markdown: record.markdown,
    };
  });

  const references = graph.references.map((record, index) => {
    const field = `references[${index}]`;
    if (record?.kind !== 'link' && record?.kind !== 'embed') throw new ViewerGraphError(`${field} has invalid kind.`);
    if (record?.targetType !== 'page' && record?.targetType !== 'asset') throw new ViewerGraphError(`${field} has invalid targetType.`);
    if (typeof record.label !== 'string' || record.label.length === 0) throw new ViewerGraphError(`${field} requires label.`);
    const base = {
      sourcePageId: pageId(record.sourcePageId, `${field}.sourcePageId`),
      segmentIndex: nonNegativeInteger(record.segmentIndex, `${field}.segmentIndex`),
      audience: validateAudience(record.audience, field),
      kind: record.kind,
      targetType: record.targetType,
      heading: record.heading == null ? null : String(record.heading),
      label: record.label,
    };
    if (record.targetType === 'page') {
      return { ...base, targetPageId: pageId(record.targetPageId, `${field}.targetPageId`) };
    }
    if (record.kind !== 'embed') throw new ViewerGraphError(`${field} asset target must be an embed.`);
    if (typeof record.assetPath !== 'string' || !/^assets\/[a-f0-9]{24}(?:\.[a-z0-9]{1,10})?$/.test(record.assetPath)) {
      throw new ViewerGraphError(`${field}.assetPath must be a generated public asset path.`);
    }
    return { ...base, assetPath: record.assetPath };
  });

  const assets = graph.assets.map((record, index) => {
    const field = `assets[${index}]`;
    if (typeof record?.assetPath !== 'string' || !/^assets\/[a-f0-9]{24}(?:\.[a-z0-9]{1,10})?$/.test(record.assetPath)) {
      throw new ViewerGraphError(`${field}.assetPath must be a generated public asset path.`);
    }
    return { assetPath: record.assetPath, audience: validateAudience(record.audience, field) };
  });

  return { search, references, assets };
}

function stripSearch(record) {
  return { pageId: record.pageId, segmentIndex: record.segmentIndex, markdown: record.markdown };
}

function stripReference(record) {
  const base = {
    sourcePageId: record.sourcePageId,
    segmentIndex: record.segmentIndex,
    kind: record.kind,
    targetType: record.targetType,
    heading: record.heading,
    label: record.label,
  };
  return record.targetType === 'page'
    ? { ...base, targetPageId: record.targetPageId }
    : { ...base, assetPath: record.assetPath };
}

export function buildViewerGraph(graph, perspective) {
  const validated = validateGraph(graph);
  const allowed = new Set(viewerIds(perspective));
  const search = validated.search.filter((record) => visible(record.audience, allowed)).map(stripSearch);
  const references = validated.references.filter((record) => visible(record.audience, allowed)).map(stripReference);
  const assets = validated.assets
    .filter((record) => visible(record.audience, allowed))
    .map((record) => ({ assetPath: record.assetPath }));

  const backlinkMap = new Map();
  for (const reference of references) {
    if (reference.targetType !== 'page') continue;
    const list = backlinkMap.get(reference.targetPageId) ?? [];
    list.push({
      sourcePageId: reference.sourcePageId,
      segmentIndex: reference.segmentIndex,
      kind: reference.kind,
      heading: reference.heading,
      label: reference.label,
    });
    backlinkMap.set(reference.targetPageId, list);
  }

  const backlinks = [...backlinkMap.entries()]
    .sort(([left], [right]) => left.localeCompare(right, 'en-US'))
    .map(([targetPageId, sources]) => ({ targetPageId, sources }));

  return { schemaVersion: 1, search, references, assets, backlinks };
}

function compactSnippet(markdown, maxLength = 180) {
  const text = String(markdown)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_>#~-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function searchViewerGraph(graph, perspective, query, { limit = 20 } = {}) {
  const normalizedQuery = String(query ?? '').trim().toLocaleLowerCase('en-US');
  if (normalizedQuery.length === 0) return [];
  if (!Number.isInteger(limit) || limit < 1) throw new TypeError('limit must be a positive integer.');
  return buildViewerGraph(graph, perspective).search
    .filter((record) => record.markdown.toLocaleLowerCase('en-US').includes(normalizedQuery))
    .slice(0, limit)
    .map((record) => ({
      pageId: record.pageId,
      segmentIndex: record.segmentIndex,
      snippet: compactSnippet(record.markdown),
    }));
}

export function backlinksForPage(graph, perspective, targetPageId) {
  const id = pageId(targetPageId, 'targetPageId');
  return buildViewerGraph(graph, perspective).backlinks.find((record) => record.targetPageId === id)?.sources ?? [];
}

export function referencesFromPage(graph, perspective, sourcePageId) {
  const id = pageId(sourcePageId, 'sourcePageId');
  return buildViewerGraph(graph, perspective).references.filter((record) => record.sourcePageId === id);
}
