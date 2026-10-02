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
    .replace(/<[^>]*>/g, ' ')
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

function firstVisibleLine(markdown, title) {
  const normalizedTitle = String(title ?? '').trim().toLocaleLowerCase('en-US');
  let fenced = false;
  for (const rawLine of String(markdown ?? '').split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (/^```/.test(trimmed)) {
      fenced = !fenced;
      continue;
    }
    if (fenced || trimmed.length === 0) continue;
    const heading = /^ {0,3}#{1,6}[ \t]+(.+?)[ \t]*#*[ \t]*$/.exec(rawLine);
    const text = searchableText(rawLine);
    if (text.length === 0) continue;
    if (heading != null && text.toLocaleLowerCase('en-US') === normalizedTitle) continue;
    return text.length > 180 ? `${text.slice(0, 179).trimEnd()}…` : text;
  }
  return '';
}

export function routeForPage(pageIdValue, heading = null) {
  const id = pageId(pageIdValue);
  const fragment = typeof heading === 'string' && heading.length > 0
    ? `#${encodeURIComponent(heading)}`
    : '';
  return `#/page/${id}${fragment}`;
}

export function routeForTag(tagName) {
  const tag = String(tagName ?? '').trim().replace(/^#+/, '');
  if (tag.length === 0) throw new NavigationError('tagName is required.');
  return `#/tag/${encodeURIComponent(tag)}`;
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
      tags: [],
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

const SEARCH_SORTS = new Set(['relevance', 'newest', 'oldest', 'updated', 'az', 'za']);
function searchTagKey(value) { return String(value ?? '').trim().replace(/^#+/, '').toLocaleLowerCase('en-US'); }

export function normalizeSearchOptions(options = {}) {
  options ??= {};
  const tags = (values) => [...new Set((Array.isArray(values) ? values : []).filter((value) => typeof value === 'string').map(searchTagKey).filter(Boolean))];
  const excludeTags = tags(options.excludeTags);
  return { includeTags: tags(options.includeTags).filter((tag) => !excludeTags.includes(tag)), excludeTags, sort: SEARCH_SORTS.has(options.sort) ? options.sort : 'relevance' };
}

export function visibleSearchTags(snapshot, perspective) {
  const tags = new Map();
  for (const page of snapshot.pages) {
    const view = buildPageView(page, perspective);
    if (view.status !== 'visible') continue;
    for (const tag of view.tags ?? []) {
      const key = searchTagKey(tag.name);
      if (!tags.has(key)) tags.set(key, { name: tag.name, key, count: 0 });
      tags.get(key).count += 1;
    }
  }
  return [...tags.values()].sort((a, b) => a.name.localeCompare(b.name, 'en-US'));
}

export function sortSearchResults(results, snapshot, sort = 'relevance') {
  const groups = new Map();
  const pages = new Map(snapshot.pages.map((page) => [page.pageId, page]));
  for (const result of results) {
    if (!groups.has(result.pageId)) groups.set(result.pageId, { page: pages.get(result.pageId), title: result.title ?? result.pageId, results: [], relevance: 0 });
    const group = groups.get(result.pageId);
    group.results.push(result);
    group.relevance = Math.max(group.relevance, result.matchType === 'title' ? 3 : result.matchType === 'tag' ? 2 : 1);
  }
  const date = (group, field) => { const value = Date.parse(group.page?.[field]); return Number.isFinite(value) ? value : null; };
  const dates = (a, b, field, direction) => {
    const left = date(a, field), right = date(b, field);
    if (left === null || right === null) return left === right ? 0 : left === null ? 1 : -1;
    return (left - right) * direction;
  };
  return [...groups.values()].sort((a, b) => {
    const title = a.title.localeCompare(b.title, 'en-US', { numeric: true, sensitivity: 'base' });
    const primary = sort === 'newest' ? dates(a, b, 'createdAt', -1)
      : sort === 'oldest' ? dates(a, b, 'createdAt', 1)
        : sort === 'updated' ? dates(a, b, 'updatedAt', -1)
          : sort === 'az' ? title : sort === 'za' ? -title : b.relevance - a.relevance;
    return primary || title || a.page.pageId.localeCompare(b.page.pageId, 'en-US');
  }).flatMap((group) => group.results);
}

export function searchNavigation(snapshot, perspective, query, options = {}) {
  const { pages, graph } = snapshotParts(snapshot);
  const filters = normalizeSearchOptions(options);
  const normalizedQuery = String(query ?? '').trim().toLocaleLowerCase('en-US');
  if (normalizedQuery.length === 0 && options.browse !== true) return [];

  const results = [];
  const pageOccurrenceCounts = new Map();
  const pageViews = new Map();
  const pageTitles = new Map();
  const eligiblePages = new Set();

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
    const tags = new Set((view.tags ?? []).map((tag) => searchTagKey(tag.name)));
    if (!filters.includeTags.every((tag) => tags.has(tag)) || filters.excludeTags.some((tag) => tags.has(tag))) continue;
    eligiblePages.add(id);
    const title = visibleTitle(page, view);
    if (title == null) continue;
    pageTitles.set(id, title);
    if (normalizedQuery.length === 0) {
      results.push({ matchType: 'page', pageId: id, title, preview: firstVisibleLine(view.markdown, title), snippet: title, route: routeForPage(id) });
      continue;
    }
    const matchIndex = title.toLocaleLowerCase('en-US').indexOf(normalizedQuery);
    if (matchIndex >= 0) {
      results.push({
        matchType: 'title',
        pageId: id,
        segmentIndex: null,
        pageOccurrenceIndex: null,
        title,
        preview: firstVisibleLine(view.markdown, title),
        snippet: title,
        matchStart: matchIndex,
        matchLength: normalizedQuery.length,
        route: routeForPage(id),
      });
    }
    for (const tag of view.tags ?? []) {
      const label = `#${tag.name}`;
      const tagMatch = label.toLocaleLowerCase('en-US').indexOf(normalizedQuery);
      if (tagMatch < 0) continue;
      results.push({
        matchType: 'tag',
        pageId: id,
        segmentIndex: null,
        pageOccurrenceIndex: null,
        title,
        tag: tag.name,
        snippet: label,
        matchStart: tagMatch,
        matchLength: normalizedQuery.length,
        route: routeForPage(id),
      });
    }
  }

  for (const record of buildViewerGraph(graph, perspective).search) {
    if (normalizedQuery.length === 0 || !eligiblePages.has(record.pageId)) continue;
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
  return sortSearchResults(results, snapshot, filters.sort);
}

export function embedNavigationForPage(snapshot, perspective, sourcePageId) {
  return forwardNavigationForPage(snapshot, perspective, sourcePageId)
    .filter((record) => record.kind === 'embed');
}

export function bottomAwareOutlineTriggers(itemDocumentTops, {
  anchorOffset = 0,
  maxScrollY = 0,
  viewportHeight = 0,
  stepGap = null,
  endLead = null,
} = {}) {
  if (!Array.isArray(itemDocumentTops) || itemDocumentTops.length === 0) return [];
  const anchor = Math.max(0, Number(anchorOffset) || 0);
  const maxScroll = Math.max(0, Number(maxScrollY) || 0);
  const viewport = Math.max(0, Number(viewportHeight) || 0);
  const desiredGap = stepGap != null && Number.isFinite(Number(stepGap))
    ? Math.max(1, Number(stepGap))
    : Math.max(96, Math.min(140, viewport * 0.14 || 112));
  const lead = endLead != null && Number.isFinite(Number(endLead))
    ? Math.max(0, Number(endLead))
    : desiredGap;
  const natural = itemDocumentTops.map((value) => {
    const top = Number(value);
    return Number.isFinite(top) ? Math.max(0, top - anchor) : Infinity;
  });
  const triggers = [...natural];
  const last = triggers.length - 1;
  if (Number.isFinite(triggers[last])) triggers[last] = Math.min(triggers[last], Math.max(0, maxScroll - lead));
  for (let index = last - 1; index >= 0; index -= 1) {
    if (!Number.isFinite(triggers[index])) continue;
    const next = triggers[index + 1];
    if (!Number.isFinite(next)) continue;
    triggers[index] = Math.max(0, Math.min(triggers[index], next - desiredGap));
  }
  return triggers;
}

export function bottomAwareOutlineIndex(itemDocumentTops, {
  scrollY = 0,
  anchorOffset = 0,
  maxScrollY = 0,
  viewportHeight = 0,
  stepGap = null,
  endLead = null,
} = {}) {
  const triggers = bottomAwareOutlineTriggers(itemDocumentTops, {
    anchorOffset,
    maxScrollY,
    viewportHeight,
    stepGap,
    endLead,
  });
  if (triggers.length === 0) return -1;
  const currentScroll = Math.max(0, Number(scrollY) || 0);
  // The start of a note always belongs to its title, including notes whose
  // short tail has been compressed into the available scroll range.
  if (currentScroll <= 1) return 0;
  let active = 0;
  for (let index = 0; index < triggers.length; index += 1) {
    const trigger = Number(triggers[index]);
    if (Number.isFinite(trigger) && currentScroll >= trigger) active = index;
    else if (Number.isFinite(trigger) && currentScroll < trigger) break;
  }
  return active;
}

export function stagedOutlineIndex(currentIndex, targetIndex) {
  const target = Number(targetIndex);
  if (!Number.isInteger(target) || target < 0) return -1;
  const current = Number(currentIndex);
  if (!Number.isInteger(current) || current < 0) return target;
  if (target > current + 1) return current + 1;
  if (target < current - 1) return current - 1;
  return target;
}

function outlineDocumentHeight(browserWindow) {
  const document = browserWindow?.document;
  return Math.max(
    0,
    Number(document?.documentElement?.scrollHeight ?? 0),
    Number(document?.body?.scrollHeight ?? 0),
  );
}

function outlineRecords(root, browserWindow) {
  const rail = root?.querySelector?.('[data-dndwiki-page-outline]');
  const article = root?.querySelector?.('[data-dndwiki-page]');
  if (rail == null || article == null) return [];
  const headings = [...(article.querySelectorAll?.('h1,h2,h3,h4,h5,h6') ?? [])];
  const scrollY = Math.max(0, Number(browserWindow?.scrollY ?? browserWindow?.pageYOffset ?? 0));
  const related = root?.querySelector?.('#dndwiki-related') ?? null;
  const records = [];
  for (const link of rail.querySelectorAll?.('.dndwiki-toc-link') ?? []) {
    let target = null;
    const titleLink = link.hasAttribute?.('data-dndwiki-title-link');
    if (titleLink) target = root.querySelector?.('[data-dndwiki-page-header] h1');
    else if (link.hasAttribute?.('data-dndwiki-related-link')) target = related;
    else {
      const attribute = link.getAttribute?.('data-dndwiki-toc-index');
      const index = attribute == null ? -1 : Number(attribute);
      if (Number.isInteger(index) && index >= 0) target = headings[index] ?? null;
    }
    if (target == null || target.hasAttribute?.('data-dndwiki-outline-contract-sentinel')) continue;
    const top = Number(target.getBoundingClientRect?.()?.top ?? NaN);
    if (!Number.isFinite(top)) continue;
    records.push({ link, target, documentTop: titleLink ? 0 : top + scrollY });
  }
  return records;
}

function installBottomAwareOutlineProgress(root, browserWindow) {
  if (root == null || browserWindow == null) return { destroy() {} };
  const state = {
    activeIndex: -1,
    signature: '',
    frameQueued: false,
    stepTimer: 0,
    explicitIndex: -1,
    explicitScrollY: null,
  };

  const clearStepTimer = () => {
    if (state.stepTimer !== 0) browserWindow.clearTimeout?.(state.stepTimer);
    state.stepTimer = 0;
  };

  const clearExplicitSelection = () => {
    state.explicitIndex = -1;
    state.explicitScrollY = null;
  };

  const applyActive = (records, activeIndex, { animate = true } = {}) => {
    const transition = animate
      ? 'background-color 120ms ease, color 120ms ease, box-shadow 120ms ease'
      : 'none';
    const trackedLinks = new Set(records.map((record) => record.link));
    for (const link of root.querySelectorAll?.('[data-dndwiki-page-outline] .dndwiki-toc-link') ?? []) {
      if (!trackedLinks.has(link)) link.removeAttribute?.('aria-current');
    }
    for (const [index, record] of records.entries()) {
      record.link.style?.setProperty?.('transition', transition);
      const current = record.link.getAttribute?.('aria-current') === 'location';
      const desired = index === activeIndex;
      if (desired && !current) record.link.setAttribute?.('aria-current', 'location');
      else if (!desired && current) record.link.removeAttribute?.('aria-current');
    }
  };

  const explicitSelectionIsCurrent = (scrollY) => state.explicitIndex >= 0
    && Number.isFinite(state.explicitScrollY)
    && Math.abs(scrollY - state.explicitScrollY) <= 2;

  const activeStateMatches = (records, activeIndex) => records.every((record, index) => (
    record.link.getAttribute?.('aria-current') === 'location'
  ) === (index === activeIndex));

  const reconcileActiveState = () => {
    const records = outlineRecords(root, browserWindow);
    if (records.length === 0 || state.activeIndex < 0 || state.activeIndex >= records.length) return;
    if (activeStateMatches(records, state.activeIndex)) return;
    const scrollY = Math.max(0, Number(browserWindow.scrollY ?? browserWindow.pageYOffset ?? 0));
    const explicit = explicitSelectionIsCurrent(scrollY) && state.explicitIndex < records.length;
    applyActive(records, state.activeIndex, { animate: !explicit });
  };

  const sync = () => {
    const records = outlineRecords(root, browserWindow);
    if (records.length === 0) {
      state.activeIndex = -1;
      state.signature = '';
      clearExplicitSelection();
      clearStepTimer();
      return;
    }
    root.querySelector?.('[data-dndwiki-page-outline]')?.setAttribute?.('data-dndwiki-outline-progress-owner', '');
    const signature = records.map(({ link }) => `${link.getAttribute?.('href') ?? ''}|${link.textContent ?? ''}`).join('\n');
    if (signature !== state.signature) {
      state.signature = signature;
      state.activeIndex = -1;
      clearExplicitSelection();
      clearStepTimer();
    }

    const scrollY = Math.max(0, Number(browserWindow.scrollY ?? browserWindow.pageYOffset ?? 0));
    const viewportHeight = Math.max(0, Number(browserWindow.innerHeight ?? 0));
    const maxScrollY = Math.max(0, outlineDocumentHeight(browserWindow) - viewportHeight);
    const topbarBottom = Math.max(0, Number(root.querySelector?.('.dndwiki-topbar')?.getBoundingClientRect?.()?.bottom ?? 0));
    const explicit = explicitSelectionIsCurrent(scrollY) && state.explicitIndex < records.length;
    if (!explicit && state.explicitIndex >= 0) clearExplicitSelection();
    const targetIndex = explicit
      ? state.explicitIndex
      : bottomAwareOutlineIndex(records.map((record) => record.documentTop), {
        scrollY,
        anchorOffset: topbarBottom + 28,
        maxScrollY,
        viewportHeight,
      });
    const nextIndex = explicit || scrollY <= 1 ? targetIndex : stagedOutlineIndex(state.activeIndex, targetIndex);
    state.activeIndex = nextIndex;
    applyActive(records, nextIndex, { animate: !explicit });

    clearStepTimer();
    if (!explicit && nextIndex !== targetIndex) {
      state.stepTimer = browserWindow.setTimeout?.(() => {
        state.stepTimer = 0;
        schedule();
      }, 72) ?? 0;
    }
  };

  const schedule = () => {
    if (state.frameQueued) return;
    state.frameQueued = true;
    const frame = browserWindow.requestAnimationFrame ?? ((callback) => browserWindow.setTimeout?.(callback, 0));
    frame(() => frame(() => {
      state.frameQueued = false;
      sync();
    }));
  };

  const resetAndSchedule = () => {
    state.activeIndex = -1;
    clearExplicitSelection();
    clearStepTimer();
    schedule();
  };

  const onExplicitClick = (event) => {
    const link = event?.target?.closest?.('[data-dndwiki-page-outline] .dndwiki-toc-link') ?? null;
    if (link == null || root.contains?.(link) !== true) return;
    const records = outlineRecords(root, browserWindow);
    const selectedIndex = records.findIndex((record) => record.link === link);
    if (selectedIndex < 0) return;

    event.preventDefault?.();
    event.stopImmediatePropagation?.();
    clearStepTimer();
    clearExplicitSelection();
    state.activeIndex = selectedIndex;
    state.explicitIndex = selectedIndex;
    applyActive(records, selectedIndex, { animate: false });

    const topbarBottom = Math.max(0, Number(root.querySelector?.('.dndwiki-topbar')?.getBoundingClientRect?.()?.bottom ?? 0));
    const top = link.hasAttribute?.('data-dndwiki-title-link') ? 0 : Math.max(0, records[selectedIndex].documentTop - topbarBottom - 16);
    browserWindow.scrollTo?.({ top, behavior: 'auto' });
    state.explicitScrollY = Math.max(0, Number(browserWindow.scrollY ?? browserWindow.pageYOffset ?? 0));

    const route = String(link.getAttribute?.('href') ?? '');
    if (/^#\/page\/[a-z0-9][a-z0-9._-]{0,63}(?:#|$)/.test(route)) {
      try {
        browserWindow.history?.replaceState?.(browserWindow.history.state, '', route);
      } catch {
        // The click must remain local even when history mutation is unavailable.
      }
    }
    schedule();
  };

  const observer = typeof browserWindow.MutationObserver === 'function'
    ? new browserWindow.MutationObserver((mutations = []) => {
      const activeChanged = mutations.some((mutation) => mutation?.type === 'attributes'
        && mutation?.attributeName === 'aria-current'
        && mutation?.target?.closest?.('[data-dndwiki-page-outline]') != null);
      if (activeChanged) reconcileActiveState();
      if (mutations.some((mutation) => mutation?.type === 'childList')) schedule();
    })
    : null;
  observer?.observe?.(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['aria-current'],
  });
  browserWindow.document?.addEventListener?.('click', onExplicitClick, true);
  browserWindow.addEventListener?.('scroll', schedule, { passive: true });
  browserWindow.addEventListener?.('resize', resetAndSchedule, { passive: true });
  browserWindow.addEventListener?.('hashchange', resetAndSchedule, true);
  schedule();

  return {
    destroy() {
      clearStepTimer();
      clearExplicitSelection();
      observer?.disconnect?.();
      browserWindow.document?.removeEventListener?.('click', onExplicitClick, true);
      browserWindow.removeEventListener?.('scroll', schedule);
      browserWindow.removeEventListener?.('resize', resetAndSchedule);
      browserWindow.removeEventListener?.('hashchange', resetAndSchedule, true);
    },
  };
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const root = document.getElementById?.('dndwiki-app') ?? null;
  if (root != null) installBottomAwareOutlineProgress(root, window);
}
