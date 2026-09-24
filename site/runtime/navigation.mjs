import { buildPageView } from './page-visibility.mjs';
import {
  backlinksForPage,
  buildViewerGraph,
  referencesFromPage,
  searchViewerGraph,
} from './viewer-graph.mjs';

const PAGE_ID_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;

export class NavigationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NavigationError';
  }
}

function pageId(value, field = 'pageId') {
  if (typeof value !== 'string' || !PAGE_ID_RE.test(value)) {
    throw new NavigationError(`${field} must be a valid opaque page ID.`);
  }
  return value;
}

function snapshotParts(snapshot) {
  if (snapshot == null || snapshot.schemaVersion !== 1 || !Array.isArray(snapshot.pages)) {
    throw new NavigationError('Snapshot schemaVersion must be 1 and include pages.');
  }
  if (snapshot.graph == null || typeof snapshot.graph !== 'object') {
    throw new NavigationError('Snapshot requires a viewer graph.');
  }

  const pages = new Map();
  for (const [index, page] of snapshot.pages.entries()) {
    const id = pageId(page?.pageId, `pages[${index}].pageId`);
    if (pages.has(id)) throw new NavigationError(`Duplicate page ID '${id}'.`);
    pages.set(id, page);
  }
  return { pages, graph: snapshot.graph };
}

function inlineText(value) {
  return String(value ?? '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_~]/g, '')
    .replace(/\\([\\`*{}\[\]()#+\-.!_>])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function visibleTitle(pageView) {
  if (pageView.status !== 'visible') return null;
  for (const line of pageView.markdown.split(/\r?\n/)) {
    const match = /^ {0,3}#{1,6}[ \t]+(.+?)[ \t]*#*[ \t]*$/.exec(line);
    if (match) {
      const title = inlineText(match[1]);
      if (title.length > 0) return title;
    }
  }
  return null;
}

export function routeForPage(pageIdValue, heading = null) {
  const id = pageId(pageIdValue);
  const fragment = typeof heading === 'string' && heading.length > 0
    ? `#${encodeURIComponent(heading)}`
    : '';
  return `#/page/${id}${fragment}`;
}

export function pageForRoute(snapshot, perspective, pageIdValue) {
  const id = pageId(pageIdValue);
  const { pages } = snapshotParts(snapshot);
  const page = pages.get(id);
  if (page == null) {
    return {
      pageId: id,
      status: 'missing',
      markdown: '',
      showKeyEntry: false,
      title: null,
      route: null,
    };
  }

  const view = buildPageView(page, perspective);
  return {
    ...view,
    title: visibleTitle(view),
    route: routeForPage(id),
  };
}

function pageTargetSummary(pages, perspective, targetPageId, heading) {
  const target = pages.get(targetPageId);
  if (target == null) {
    return { targetStatus: 'missing', targetTitle: null, route: null };
  }
  const view = buildPageView(target, perspective);
  return {
    targetStatus: view.status,
    targetTitle: visibleTitle(view),
    route: routeForPage(targetPageId, heading),
  };
}

export function forwardNavigationForPage(snapshot, perspective, sourcePageId) {
  const id = pageId(sourcePageId, 'sourcePageId');
  const { pages, graph } = snapshotParts(snapshot);
  if (!pages.has(id)) return [];

  const viewerGraph = buildViewerGraph(graph, perspective);
  const visibleAssets = new Set(viewerGraph.assets.map((record) => record.assetPath));
  return referencesFromPage(graph, perspective, id).flatMap((reference) => {
    if (reference.targetType === 'asset') {
      if (!visibleAssets.has(reference.assetPath)) return [];
      return [{
        kind: reference.kind,
        targetType: 'asset',
        label: reference.label,
        heading: null,
        assetPath: reference.assetPath,
        targetStatus: 'visible',
        route: reference.assetPath,
      }];
    }

    return [{
      kind: reference.kind,
      targetType: 'page',
      label: reference.label,
      heading: reference.heading,
      targetPageId: reference.targetPageId,
      ...pageTargetSummary(pages, perspective, reference.targetPageId, reference.heading),
    }];
  });
}

export function backlinkNavigationForPage(snapshot, perspective, targetPageId) {
  const id = pageId(targetPageId, 'targetPageId');
  const { pages, graph } = snapshotParts(snapshot);
  if (!pages.has(id)) return [];

  return backlinksForPage(graph, perspective, id).flatMap((record) => {
    const source = pages.get(record.sourcePageId);
    if (source == null) return [];
    const sourceView = buildPageView(source, perspective);
    if (sourceView.status !== 'visible') return [];
    return [{
      sourcePageId: record.sourcePageId,
      sourceTitle: visibleTitle(sourceView),
      kind: record.kind,
      heading: record.heading,
      label: record.label,
      route: routeForPage(record.sourcePageId),
    }];
  });
}

export function searchNavigation(snapshot, perspective, query, options = {}) {
  const { pages, graph } = snapshotParts(snapshot);
  return searchViewerGraph(graph, perspective, query, options).flatMap((record) => {
    const page = pages.get(record.pageId);
    if (page == null) return [];
    const view = buildPageView(page, perspective);
    if (view.status !== 'visible') return [];
    return [{
      pageId: record.pageId,
      segmentIndex: record.segmentIndex,
      title: visibleTitle(view),
      snippet: record.snippet,
      route: routeForPage(record.pageId),
    }];
  });
}

export function embedNavigationForPage(snapshot, perspective, sourcePageId) {
  return forwardNavigationForPage(snapshot, perspective, sourcePageId)
    .filter((record) => record.kind === 'embed');
}
