import { renderMarkdownToHtml } from './markdown-renderer.mjs';
import {
  backlinkNavigationForPage,
  forwardNavigationForPage,
  pageForRoute,
  searchNavigation,
} from './navigation.mjs';
import { createPlayerIdentitySession } from './player-identity.mjs';

const PAGE_ID_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;

export class WikiShellError extends Error {
  constructor(message) {
    super(message);
    this.name = 'WikiShellError';
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function validateSnapshot(snapshot) {
  if (snapshot == null || snapshot.schemaVersion !== 1) throw new WikiShellError('Snapshot schemaVersion must be 1.');
  if (snapshot.campaign == null
    || typeof snapshot.campaign.id !== 'string'
    || typeof snapshot.campaign.title !== 'string'
    || snapshot.campaign.id.length === 0
    || snapshot.campaign.title.length === 0) {
    throw new WikiShellError('Snapshot requires campaign identity.');
  }
  if (!Array.isArray(snapshot.pages) || snapshot.graph == null || snapshot.players == null) {
    throw new WikiShellError('Snapshot requires pages, graph, and public player registry.');
  }
  return snapshot;
}

function decodeHeading(value) {
  if (value == null || value.length === 0) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

export function parseWikiRoute(hash) {
  const value = String(hash ?? '');
  const match = /^#\/page\/([a-z0-9][a-z0-9._-]{0,63})(?:#(.*))?$/.exec(value);
  if (!match) return { kind: 'home', pageId: null, heading: null };
  return { kind: 'page', pageId: match[1], heading: decodeHeading(match[2]) };
}

function chooseLandingPage(snapshot, perspective) {
  let gated = null;
  for (const page of snapshot.pages) {
    if (typeof page?.pageId !== 'string' || !PAGE_ID_RE.test(page.pageId)) continue;
    const view = pageForRoute(snapshot, perspective, page.pageId);
    if (view.status === 'visible') return page.pageId;
    if (gated === null && view.status === 'gated') gated = page.pageId;
  }
  return gated;
}

function pageLabel(page) {
  return page?.title ?? 'Page';
}

function cleanNavigationLinks(records) {
  return records
    .filter((record) => record.targetType === 'page' && record.route != null)
    .map((record) => ({
      label: record.label,
      route: record.route,
      status: record.targetStatus,
      targetPageId: record.targetPageId,
    }));
}

export function buildWikiShellModel(snapshotInput, perspective, {
  hash = '',
  query = '',
  accessMessage = null,
} = {}) {
  const snapshot = validateSnapshot(snapshotInput);
  const parsedRoute = parseWikiRoute(hash);
  const requestedPageId = parsedRoute.kind === 'page'
    ? parsedRoute.pageId
    : chooseLandingPage(snapshot, perspective);
  const page = requestedPageId == null
    ? null
    : pageForRoute(snapshot, perspective, requestedPageId);
  const normalizedQuery = String(query ?? '').trim();
  const searchResults = normalizedQuery.length === 0
    ? []
    : searchNavigation(snapshot, perspective, normalizedQuery);
  const backlinks = page != null && page.status !== 'missing'
    ? backlinkNavigationForPage(snapshot, perspective, page.pageId)
    : [];
  const forward = page != null && page.status === 'visible'
    ? cleanNavigationLinks(forwardNavigationForPage(snapshot, perspective, page.pageId))
    : [];

  return {
    schemaVersion: 1,
    campaign: {
      id: snapshot.campaign.id,
      title: snapshot.campaign.title,
    },
    route: {
      hash: parsedRoute.kind === 'page' ? hash : requestedPageId == null ? '#/' : `#/page/${requestedPageId}`,
      requested: parsedRoute.kind === 'page',
      heading: parsedRoute.heading,
    },
    perspective: {
      kind: perspective?.kind === 'player' ? 'player' : 'anonymous',
    },
    access: {
      active: perspective?.kind === 'player',
      message: accessMessage,
    },
    query: normalizedQuery,
    searchResults,
    page,
    backlinks,
    forward,
  };
}

export function createWikiShellSession({ snapshot: snapshotInput, storage, crypto = null }) {
  const snapshot = validateSnapshot(snapshotInput);
  const identity = createPlayerIdentitySession({
    campaignId: snapshot.campaign.id,
    publicRegistry: snapshot.players,
    storage,
    crypto,
  });
  let perspective = { kind: 'anonymous', playerId: null, playerIds: [], reason: 'not-loaded' };
  let hash = '';
  let query = '';
  let accessMessage = null;

  const model = () => buildWikiShellModel(snapshot, perspective, { hash, query, accessMessage });

  return {
    async load({ routeHash = '' } = {}) {
      hash = String(routeHash ?? '');
      perspective = await identity.load();
      accessMessage = null;
      return model();
    },

    setRoute(routeHash) {
      hash = String(routeHash ?? '');
      return model();
    },

    search(value) {
      query = String(value ?? '');
      return model();
    },

    async enterKey(rawKey) {
      perspective = await identity.enterKey(rawKey);
      accessMessage = perspective.kind === 'player'
        ? null
        : 'That key did not match this campaign.';
      return model();
    },

    clearKey() {
      perspective = identity.clear();
      accessMessage = null;
      return model();
    },

    get perspective() {
      return structuredClone(perspective);
    },

    get currentModel() {
      return model();
    },
  };
}

export async function bootWikiShell({
  fetchImpl,
  snapshotUrl = './dndwiki.snapshot.json',
  storage,
  crypto = null,
  routeHash = '',
}) {
  if (typeof fetchImpl !== 'function') throw new WikiShellError('fetchImpl is required.');
  const response = await fetchImpl(snapshotUrl, { cache: 'no-store' });
  if (response == null || response.ok !== true || typeof response.json !== 'function') {
    throw new WikiShellError('Could not load campaign snapshot.');
  }
  const snapshot = validateSnapshot(await response.json());
  const session = createWikiShellSession({ snapshot, storage, crypto });
  const model = await session.load({ routeHash });
  return { snapshot, session, model };
}

function keyForm(message = null) {
  return `<form class="dndwiki-key-form" data-dndwiki-key-form>
    <label>
      <span class="dndwiki-meta">Player key</span>
      <input name="playerKey" type="password" autocomplete="off" required aria-label="Player key">
    </label>
    <button type="submit">Unlock</button>
    ${message ? `<p class="dndwiki-form-error" role="alert">${escapeHtml(message)}</p>` : ''}
  </form>`;
}

function accessCard(model) {
  if (model.access.active) {
    return `<section class="dndwiki-card" aria-labelledby="dndwiki-access-heading">
      <h2 id="dndwiki-access-heading">Access</h2>
      <p class="dndwiki-meta">Player access active.</p>
      <button type="button" data-dndwiki-clear-key>Clear player key</button>
    </section>`;
  }
  return `<section class="dndwiki-card" aria-labelledby="dndwiki-access-heading">
    <h2 id="dndwiki-access-heading">Access</h2>
    <p class="dndwiki-meta">Enter your campaign key to reveal material shared with you.</p>
    ${keyForm(model.access.message)}
  </section>`;
}

function highlightedSnippet(result) {
  const snippet = String(result?.snippet ?? '');
  const start = Number(result?.matchStart);
  const length = Number(result?.matchLength);
  if (!Number.isInteger(start) || !Number.isInteger(length) || start < 0 || length < 1 || start + length > snippet.length) {
    return escapeHtml(snippet);
  }
  return `${escapeHtml(snippet.slice(0, start))}<mark style="background:var(--text-highlight-bg);color:inherit;padding:0 .08em">${escapeHtml(snippet.slice(start, start + length))}</mark>${escapeHtml(snippet.slice(start + length))}`;
}

function searchResults(model, expandedPageIds = new Set()) {
  if (model.query.length === 0) return '';

  const groups = [];
  const byPage = new Map();
  for (const result of model.searchResults) {
    let group = byPage.get(result.pageId);
    if (group == null) {
      group = { pageId: result.pageId, title: result.title ?? 'Page', results: [] };
      byPage.set(result.pageId, group);
      groups.push(group);
    }
    group.results.push(result);
  }

  const items = groups.map((group) => {
    const expanded = expandedPageIds.has(group.pageId);
    const visibleResults = expanded ? group.results : group.results.slice(0, 5);
    const matches = visibleResults.map((result) => `<li>
      <a href="${escapeHtml(result.route)}" data-dndwiki-search-result data-dndwiki-search-page="${escapeHtml(result.pageId)}" data-dndwiki-search-occurrence="${result.pageOccurrenceIndex}" data-dndwiki-search-query="${escapeHtml(model.query)}">
        <strong>${escapeHtml(result.title ?? 'Page')}</strong>
        <span>${highlightedSnippet(result)}</span>
      </a>
    </li>`).join('');
    const overflowCount = Math.max(0, group.results.length - 5);
    const toggle = overflowCount > 0
      ? `<li><button type="button" data-dndwiki-search-more data-dndwiki-search-page="${escapeHtml(group.pageId)}" aria-expanded="${expanded ? 'true' : 'false'}" style="display:block;width:100%;min-height:32px;text-align:left;border:0;border-radius:0;padding:.55rem .75rem;color:var(--text-muted)">${expanded ? `show fewer from ${escapeHtml(group.title)}` : `and ${overflowCount} more from ${escapeHtml(group.title)}`}</button></li>`
      : '';
    return `${matches}${toggle}`;
  }).join('');

  return `<section class="dndwiki-search-results" aria-label="Search results" style="width:100%;max-width:none;margin:0">
    <h2>${model.searchResults.length} result${model.searchResults.length === 1 ? '' : 's'} for “${escapeHtml(model.query)}”</h2>
    ${items.length > 0 ? `<ul>${items}</ul>` : '<p class="dndwiki-meta" style="padding:0 1rem 1rem">No visible matches.</p>'}
  </section>`;
}

function pageBody(model) {
  const page = model.page;
  if (page == null) {
    return '<section class="dndwiki-empty"><h1>No published pages yet</h1><p>This campaign does not currently have a page available to this view.</p></section>';
  }
  if (page.status === 'missing') {
    return '<section class="dndwiki-missing"><h1>Page not found</h1><p>This page is unavailable or no longer published.</p></section>';
  }
  if (page.status === 'gated') {
    return `<section class="dndwiki-gated"><h1>Player key required</h1><p>This page has campaign material that requires a player key.</p>${keyForm(model.access.message)}</section>`;
  }
  if (page.status === 'empty') {
    return '<section class="dndwiki-empty"><h1>Nothing to show</h1><p>This page has no content available in the current view.</p></section>';
  }
  return `<article class="dndwiki-page" data-dndwiki-page>${renderMarkdownToHtml(page.markdown)}</article>`;
}

function linkList(records, { backlink = false } = {}) {
  if (records.length === 0) return '<p class="dndwiki-meta">None</p>';
  return `<ul class="dndwiki-link-list">${records.map((record) => {
    const label = backlink
      ? pageLabel({ title: record.sourceTitle })
      : record.label;
    return `<li><a href="${escapeHtml(record.route)}">${escapeHtml(label)}</a>${!backlink && record.status === 'gated' ? ' <span class="dndwiki-meta">(key)</span>' : ''}</li>`;
  }).join('')}</ul>`;
}

export function renderWikiShellHtml(model) {
  if (model == null || model.schemaVersion !== 1) throw new WikiShellError('Shell model schemaVersion must be 1.');
  const accessStatus = model.access.active ? 'Player access active' : 'Public view';
  return `<div class="dndwiki-shell">
    <header class="dndwiki-topbar">
      <div class="dndwiki-brand">
        <a href="#/">${escapeHtml(model.campaign.title)}</a>
        <small>DnDWiki</small>
      </div>
      <form class="dndwiki-search" role="search" data-dndwiki-search-form style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.4rem">
        <label style="min-width:0;position:relative">
          <span class="dndwiki-meta" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Search visible wiki content</span>
          <input name="query" type="text" value="${escapeHtml(model.query)}" placeholder="Search this wiki" autocomplete="off" style="padding-right:2.4rem">
          <button type="button" data-dndwiki-search-clear aria-label="Clear search" title="Clear search"${model.query.length === 0 ? ' hidden' : ''} style="position:absolute;right:.22rem;top:50%;transform:translateY(-50%);width:1.8rem;height:1.8rem;min-height:0;padding:0;border:1px solid transparent;border-radius:999px;color:var(--text-muted);font-size:1.05rem;line-height:1">×</button>
        </label>
        <button type="submit">Search</button>
        <div data-dndwiki-search-results aria-live="polite"${model.query.length === 0 ? ' hidden' : ''} style="position:absolute;left:0;right:0;top:calc(100% + .4rem);z-index:30;max-height:min(70vh,34rem);overflow:auto">${searchResults(model)}</div>
      </form>
      <div class="dndwiki-access">
        <span class="dndwiki-access-status">${accessStatus}</span>
        ${model.access.active ? '<button type="button" data-dndwiki-clear-key>Lock</button>' : ''}
      </div>
    </header>
    <div class="dndwiki-layout">
      <main class="dndwiki-main" id="main-content">
        ${pageBody(model)}
      </main>
      <aside class="dndwiki-sidebar" aria-label="Wiki navigation">
        <section class="dndwiki-card" aria-labelledby="dndwiki-links-heading">
          <h2 id="dndwiki-links-heading">Links</h2>
          ${linkList(model.forward)}
        </section>
        <section class="dndwiki-card" aria-labelledby="dndwiki-backlinks-heading">
          <h2 id="dndwiki-backlinks-heading">Backlinks</h2>
          ${linkList(model.backlinks, { backlink: true })}
        </section>
        ${accessCard(model)}
      </aside>
    </div>
  </div>`;
}

function scrollToRequestedHeading(root, heading) {
  if (heading == null || typeof root?.querySelectorAll !== 'function') return;
  const target = String(heading).trim().toLocaleLowerCase('en-US');
  if (target.length === 0) return;
  const headings = root.querySelectorAll('h1,h2,h3,h4,h5,h6');
  for (const element of headings) {
    if (String(element.textContent ?? '').trim().toLocaleLowerCase('en-US') === target) {
      if (typeof element.scrollIntoView === 'function') element.scrollIntoView({ block: 'start' });
      break;
    }
  }
}

function occurrenceBounds(text, query, occurrenceIndex) {
  const normalizedText = String(text ?? '').toLocaleLowerCase('en-US');
  const normalizedQuery = String(query ?? '').trim().toLocaleLowerCase('en-US');
  if (normalizedQuery.length === 0 || !Number.isInteger(occurrenceIndex) || occurrenceIndex < 0) return null;
  let fromIndex = 0;
  for (let index = 0; index <= occurrenceIndex; index += 1) {
    const start = normalizedText.indexOf(normalizedQuery, fromIndex);
    if (start < 0) return null;
    if (index === occurrenceIndex) return { start, end: start + normalizedQuery.length };
    fromIndex = start + Math.max(1, normalizedQuery.length);
  }
  return null;
}

function highlightSearchOccurrence(root, browserWindow, target) {
  const article = root?.querySelector?.('[data-dndwiki-page]');
  const document = browserWindow?.document;
  if (article == null || document == null || typeof document.createTreeWalker !== 'function' || typeof document.createRange !== 'function') return false;

  const showText = browserWindow?.NodeFilter?.SHOW_TEXT ?? 4;
  const walker = document.createTreeWalker(article, showText);
  const nodes = [];
  let offset = 0;
  for (let node = walker.nextNode(); node != null; node = walker.nextNode()) {
    const text = String(node.data ?? node.textContent ?? '');
    if (text.length === 0) continue;
    nodes.push({ node, start: offset, end: offset + text.length, text });
    offset += text.length;
  }
  const combined = nodes.map((record) => record.text).join('');
  const bounds = occurrenceBounds(combined, target.query, target.occurrenceIndex);
  if (bounds == null) return false;

  const marks = [];
  try {
    for (const record of nodes) {
      const overlapStart = Math.max(bounds.start, record.start);
      const overlapEnd = Math.min(bounds.end, record.end);
      if (overlapStart >= overlapEnd) continue;
      const range = document.createRange();
      range.setStart(record.node, overlapStart - record.start);
      range.setEnd(record.node, overlapEnd - record.start);
      const mark = document.createElement('mark');
      mark.setAttribute('data-dndwiki-search-highlight', '');
      if (marks.length === 0) mark.setAttribute('data-dndwiki-search-target', '');
      range.surroundContents(mark);
      marks.push(mark);
    }
  } catch {
    return false;
  }

  const first = marks[0];
  if (first == null) return false;
  if (typeof first.scrollIntoView === 'function') {
    const reduced = browserWindow?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
    first.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
  }
  return true;
}

export async function mountWikiShell({
  root,
  window: browserWindow,
  fetchImpl = browserWindow?.fetch?.bind(browserWindow),
  snapshotUrl = './dndwiki.snapshot.json',
} = {}) {
  if (root == null || typeof root !== 'object') throw new WikiShellError('A root element is required.');
  if (browserWindow == null) throw new WikiShellError('A browser window is required.');

  const { snapshot, session } = await bootWikiShell({
    fetchImpl,
    snapshotUrl,
    storage: browserWindow.localStorage,
    crypto: browserWindow.crypto,
    routeHash: browserWindow.location?.hash ?? '',
  });

  let model = session.currentModel;
  let pendingSearchTarget = null;
  let searchResultsOpen = model.query.length > 0;
  const expandedSearchPages = new Set();

  const setSearchResultsOpen = (open) => {
    searchResultsOpen = open === true && model.query.length > 0;
    const resultsRoot = root.querySelector?.('[data-dndwiki-search-results]');
    if (resultsRoot != null) resultsRoot.hidden = !searchResultsOpen;
  };

  const render = () => {
    root.innerHTML = renderWikiShellHtml(model);
    if (browserWindow.document != null) {
      const pageTitle = model.page?.title;
      browserWindow.document.title = pageTitle ? `${pageTitle} · ${snapshot.campaign.title}` : snapshot.campaign.title;
    }
    scrollToRequestedHeading(root, model.route.heading);

    if (typeof root.querySelector === 'function') {
      const searchForm = root.querySelector('[data-dndwiki-search-form]');
      const searchInput = searchForm?.elements?.query;
      const resultsRoot = root.querySelector('[data-dndwiki-search-results]');
      const clearSearchButton = root.querySelector('[data-dndwiki-search-clear]');
      if (resultsRoot != null) resultsRoot.hidden = !searchResultsOpen || model.query.length === 0;

      const updateSearch = (value) => {
        const rawValue = String(value ?? '');
        model = session.search(rawValue);
        expandedSearchPages.clear();
        searchResultsOpen = model.query.length > 0;
        if (resultsRoot != null) {
          resultsRoot.innerHTML = searchResults(model, expandedSearchPages);
          resultsRoot.hidden = !searchResultsOpen;
        }
        if (clearSearchButton != null) clearSearchButton.hidden = rawValue.length === 0;
      };

      searchForm?.addEventListener?.('submit', (event) => {
        event.preventDefault();
        updateSearch(searchInput?.value ?? '');
      });
      searchInput?.addEventListener?.('input', () => {
        updateSearch(searchInput.value ?? '');
      });
      searchInput?.addEventListener?.('focus', () => {
        if (String(searchInput.value ?? '').trim().length > 0) setSearchResultsOpen(true);
      });
      clearSearchButton?.addEventListener?.('click', () => {
        if (searchInput != null) searchInput.value = '';
        model = session.search('');
        expandedSearchPages.clear();
        if (resultsRoot != null) {
          resultsRoot.innerHTML = '';
          resultsRoot.hidden = true;
        }
        clearSearchButton.hidden = true;
        searchResultsOpen = false;
        searchInput?.focus?.();
      });
      resultsRoot?.addEventListener?.('click', (event) => {
        const moreButton = event.target?.closest?.('[data-dndwiki-search-more]');
        if (moreButton != null) {
          const pageId = moreButton.getAttribute?.('data-dndwiki-search-page') ?? '';
          if (!PAGE_ID_RE.test(pageId)) return;
          event.preventDefault();
          if (expandedSearchPages.has(pageId)) {
            expandedSearchPages.delete(pageId);
          } else {
            expandedSearchPages.add(pageId);
          }
          resultsRoot.innerHTML = searchResults(model, expandedSearchPages);
          resultsRoot.hidden = false;
          searchResultsOpen = true;
          return;
        }

        const link = event.target?.closest?.('[data-dndwiki-search-result]');
        if (link == null) return;
        const pageId = link.getAttribute?.('data-dndwiki-search-page') ?? '';
        const query = link.getAttribute?.('data-dndwiki-search-query') ?? '';
        const occurrenceIndex = Number.parseInt(link.getAttribute?.('data-dndwiki-search-occurrence') ?? '', 10);
        const route = link.getAttribute?.('href') ?? '';
        if (!PAGE_ID_RE.test(pageId) || query.trim().length === 0 || !Number.isInteger(occurrenceIndex) || occurrenceIndex < 0 || route.length === 0) return;
        event.preventDefault();
        pendingSearchTarget = { pageId, query, occurrenceIndex };
        searchResultsOpen = false;
        if (resultsRoot != null) resultsRoot.hidden = true;
        if (browserWindow.location?.hash === route) {
          model = session.setRoute(route);
          render();
        } else if (browserWindow.location != null) {
          browserWindow.location.hash = route;
        } else {
          model = session.setRoute(route);
          render();
        }
      });

      for (const form of root.querySelectorAll?.('[data-dndwiki-key-form]') ?? []) {
        form.addEventListener?.('submit', async (event) => {
          event.preventDefault();
          const value = form.elements?.playerKey?.value ?? '';
          model = await session.enterKey(value);
          render();
        });
      }

      for (const button of root.querySelectorAll?.('[data-dndwiki-clear-key]') ?? []) {
        button.addEventListener?.('click', () => {
          model = session.clearKey();
          render();
        });
      }
    }

    if (pendingSearchTarget != null) {
      if (model.page?.pageId !== pendingSearchTarget.pageId || model.page?.status !== 'visible') {
        pendingSearchTarget = null;
      } else if (highlightSearchOccurrence(root, browserWindow, pendingSearchTarget)) {
        pendingSearchTarget = null;
      }
    }
  };

  const onHashChange = () => {
    model = session.setRoute(browserWindow.location?.hash ?? '');
    render();
  };
  const onDocumentPointerDown = (event) => {
    const searchForm = root.querySelector?.('[data-dndwiki-search-form]');
    if (searchForm?.contains?.(event.target)) return;
    setSearchResultsOpen(false);
  };

  browserWindow.addEventListener?.('hashchange', onHashChange);
  browserWindow.document?.addEventListener?.('pointerdown', onDocumentPointerDown);
  render();

  return {
    get model() {
      return model;
    },
    session,
    destroy() {
      browserWindow.removeEventListener?.('hashchange', onHashChange);
      browserWindow.document?.removeEventListener?.('pointerdown', onDocumentPointerDown);
    },
  };
}
