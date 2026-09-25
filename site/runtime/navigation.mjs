import { buildPageView } from './page-visibility.mjs';
import {
  backlinksForPage,
  buildViewerGraph,
  referencesFromPage,
} from './viewer-graph.mjs';

const PAGE_ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

export class NavigationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NavigationError';
  }
}

function pageId(value, field = 'pageId') {
  if (typeof value !== 'string' || !PAGE_ID_RE.test(value)) {
    throw new NavigationError(`${field} must be a valid page slug.`);
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
    if (pages.has(id)) throw new NavigationError(`Duplicate page slug '${id}'.`);
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

function searchableText(value) {
  return String(value ?? '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^ {0,3}#{1,6}[ \t]+/gm, '')
    .replace(/^ {0,3}>[ \t]?/gm, '')
    .replace(/^ {0,3}(?:[-+*]|\d+[.)])[ \t]+/gm, '')
    .replace(/\|/g, ' ')
    .replace(/[`*_~]/g, '')
    .replace(/\\([\\`*{}\[\]()#+\-.!_>])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function occurrenceExcerpt(text, start, length, context = 72) {
  let excerptStart = Math.max(0, start - context);
  let excerptEnd = Math.min(text.length, start + length + context);

  if (excerptStart > 0) {
    const nextSpace = text.indexOf(' ', excerptStart);
    if (nextSpace >= 0 && nextSpace < start) excerptStart = nextSpace + 1;
  }
  if (excerptEnd < text.length) {
    const previousSpace = text.lastIndexOf(' ', excerptEnd);
    if (previousSpace > start + length) excerptEnd = previousSpace;
  }

  const prefix = `${excerptStart > 0 ? '…' : ''}${text.slice(excerptStart, start)}`;
  const match = text.slice(start, start + length);
  const suffix = `${text.slice(start + length, excerptEnd)}${excerptEnd < text.length ? '…' : ''}`;
  return {
    snippet: `${prefix}${match}${suffix}`,
    matchStart: prefix.length,
    matchLength: match.length,
  };
}

function visibleTitle(page, pageView) {
  if (pageView.status !== 'visible') return null;
  if (typeof page?.title === 'string' && page.title.trim().length > 0) return page.title.trim();
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
    title: visibleTitle(page, view),
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
    targetTitle: visibleTitle(target, view),
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
      sourceTitle: visibleTitle(source, sourceView),
      kind: record.kind,
      heading: record.heading,
      label: record.label,
      route: routeForPage(record.sourcePageId),
    }];
  });
}

export function searchNavigation(snapshot, perspective, query) {
  const { pages, graph } = snapshotParts(snapshot);
  const normalizedQuery = String(query ?? '').trim().toLocaleLowerCase('en-US');
  if (normalizedQuery.length === 0) return [];

  const results = [];
  const pageOccurrenceCounts = new Map();
  const pageViews = new Map();
  const pageTitles = new Map();

  const viewForPage = (id, page) => {
    let view = pageViews.get(id);
    if (view == null) {
      view = buildPageView(page, perspective);
      pageViews.set(id, view);
    }
    return view;
  };

  for (const [id, page] of pages) {
    const view = viewForPage(id, page);
    if (view.status !== 'visible') continue;
    const title = visibleTitle(page, view);
    if (title == null) continue;
    pageTitles.set(id, title);
    const matchIndex = title.toLocaleLowerCase('en-US').indexOf(normalizedQuery);
    if (matchIndex < 0) continue;
    results.push({
      matchType: 'title',
      pageId: id,
      segmentIndex: null,
      pageOccurrenceIndex: null,
      title,
      snippet: title,
      matchStart: matchIndex,
      matchLength: normalizedQuery.length,
      route: routeForPage(id),
    });
  }

  for (const record of buildViewerGraph(graph, perspective).search) {
    const page = pages.get(record.pageId);
    if (page == null) continue;
    const view = viewForPage(record.pageId, page);
    if (view.status !== 'visible') continue;
    const title = pageTitles.get(record.pageId) ?? visibleTitle(page, view);
    if (title != null) pageTitles.set(record.pageId, title);

    const text = searchableText(record.markdown);
    const normalizedText = text.toLocaleLowerCase('en-US');
    let fromIndex = 0;
    while (fromIndex <= normalizedText.length - normalizedQuery.length) {
      const matchIndex = normalizedText.indexOf(normalizedQuery, fromIndex);
      if (matchIndex < 0) break;
      const pageOccurrenceIndex = pageOccurrenceCounts.get(record.pageId) ?? 0;
      pageOccurrenceCounts.set(record.pageId, pageOccurrenceIndex + 1);
      const excerpt = occurrenceExcerpt(text, matchIndex, normalizedQuery.length);
      results.push({
        matchType: 'content',
        pageId: record.pageId,
        segmentIndex: record.segmentIndex,
        pageOccurrenceIndex,
        title,
        snippet: excerpt.snippet,
        matchStart: excerpt.matchStart,
        matchLength: excerpt.matchLength,
        route: routeForPage(record.pageId),
      });
      fromIndex = matchIndex + Math.max(1, normalizedQuery.length);
    }
  }
  return results;
}

export function embedNavigationForPage(snapshot, perspective, sourcePageId) {
  return forwardNavigationForPage(snapshot, perspective, sourcePageId)
    .filter((record) => record.kind === 'embed');
}
