import { renderMarkdownToHtml } from './markdown-renderer.mjs';
import {
  backlinkNavigationForPage,
  forwardNavigationForPage,
  pageForRoute,
  searchNavigation,
} from './navigation.mjs';
import { createPlayerIdentitySession } from './player-identity.mjs';

const PAGE_ID_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const PLAYER_KEY_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="8.25" cy="12" r="3.25"></circle><path d="M11.5 12H21"></path><path d="m17.5 12 0 3"></path><path d="m14.5 12 0 2"></path></svg>';
const READER_V47_POLISH_CSS = `
#dndwiki-app .dndwiki-shell .dndwiki-brand > [data-dndwiki-browse-trigger] {
  display: none !important;
}

#dndwiki-app .dndwiki-shell .dndwiki-topbar > .dndwiki-access {
  display: none !important;
}

#dndwiki-app .dndwiki-shell .dndwiki-primary-nav .dndwiki-access {
  display: block !important;
  width: 100%;
  margin: .18rem 0 .35rem;
}

#dndwiki-app .dndwiki-shell .dndwiki-access-menu {
  position: relative;
  width: 100%;
}

#dndwiki-app .dndwiki-shell .dndwiki-access-menu > summary {
  min-height: 38px !important;
  display: flex !important;
  align-items: center;
  gap: .62rem;
  box-sizing: border-box;
  width: 100%;
  padding: .42rem .55rem !important;
  border: 0 !important;
  border-radius: 9px !important;
  background: transparent !important;
  color: var(--text-muted) !important;
  box-shadow: none !important;
  list-style: none;
  text-align: left;
  font-size: .82rem !important;
  font-weight: 500 !important;
  line-height: 1.28;
  cursor: pointer;
}

#dndwiki-app .dndwiki-shell .dndwiki-access-menu > summary::-webkit-details-marker {
  display: none;
}

#dndwiki-app .dndwiki-shell .dndwiki-access-menu > summary:hover,
#dndwiki-app .dndwiki-shell .dndwiki-access-menu[open] > summary {
  background: var(--background-modifier-hover) !important;
  color: var(--text-normal) !important;
}

#dndwiki-app .dndwiki-shell .dndwiki-player-key-icon {
  width: 1.05rem;
  height: 1.05rem;
  flex: 0 0 1.05rem;
  display: inline-grid;
  place-items: center;
  color: var(--text-faint);
}

#dndwiki-app .dndwiki-shell .dndwiki-player-key-icon svg {
  width: 100%;
  height: 100%;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

#dndwiki-app .dndwiki-shell .dndwiki-access-label {
  min-width: 0;
  overflow-wrap: anywhere;
}

#dndwiki-app .dndwiki-shell .dndwiki-key-popover {
  display: grid;
  gap: .65rem;
  margin: .18rem .2rem .45rem;
  padding: .72rem;
  border: 1px solid var(--background-modifier-border);
  border-radius: 10px;
  background: var(--background-primary);
  box-shadow: none;
}

#dndwiki-app .dndwiki-shell .dndwiki-key-popover > p {
  margin: 0;
}

#dndwiki-app .dndwiki-shell .dndwiki-key-popover [data-dndwiki-clear-key] {
  width: 100%;
}

#dndwiki-app .dndwiki-shell[data-dndwiki-browse-persistent]:not([data-dndwiki-browse-open]) .dndwiki-access-label,
#dndwiki-app .dndwiki-shell[data-dndwiki-browse-persistent]:not([data-dndwiki-browse-open]) .dndwiki-key-popover {
  display: none !important;
}

#dndwiki-app .dndwiki-shell[data-dndwiki-browse-persistent]:not([data-dndwiki-browse-open]) .dndwiki-access-menu > summary {
  justify-content: center;
  padding-inline: .35rem !important;
}

#dndwiki-app .dndwiki-shell .dndwiki-outline-dot {
  width: .52rem !important;
  height: .52rem !important;
  flex: 0 0 .52rem !important;
  opacity: 1 !important;
}

#dndwiki-app .dndwiki-shell .dndwiki-outline-rail .dndwiki-toc-link,
#dndwiki-app .dndwiki-shell .dndwiki-outline-rail .dndwiki-toc-link[data-level="3"],
#dndwiki-app .dndwiki-shell .dndwiki-outline-rail .dndwiki-toc-link[data-level="4"] {
  padding-left: .55rem !important;
  font-size: .82rem !important;
  line-height: 1.28 !important;
}

#dndwiki-app .dndwiki-shell[data-dndwiki-outline-persistent]:not([data-dndwiki-outline-open]) .dndwiki-outline-rail .dndwiki-toc-children {
  margin: 0 !important;
  padding: 0 !important;
}

#dndwiki-app .dndwiki-shell[data-dndwiki-outline-persistent]:not([data-dndwiki-outline-open]) .dndwiki-outline-rail .dndwiki-toc-children::before {
  display: none !important;
  content: none !important;
}

#dndwiki-app .dndwiki-shell .dndwiki-main > .dndwiki-sidebar[data-dndwiki-context-footer] {
  padding-top: 0 !important;
  border-top: 0 !important;
}

#dndwiki-app .dndwiki-shell .dndwiki-context-footer-head {
  display: none !important;
}

#dndwiki-app .dndwiki-shell .dndwiki-sidebar[data-dndwiki-context-footer] .dndwiki-link-list a {
  font-size: .76rem !important;
}

#dndwiki-app .dndwiki-shell .dndwiki-related-empty {
  min-height: 1px !important;
  height: 1px !important;
  margin-top: 2rem !important;
  padding: 0 !important;
  border: 0 !important;
  overflow: hidden;
}

#dndwiki-app .dndwiki-shell .dndwiki-related-empty > h2,
#dndwiki-app .dndwiki-shell .dndwiki-related-empty > p {
  display: none !important;
}

@media (min-width: 1100px) {
  #dndwiki-app .dndwiki-shell .dndwiki-topbar {
    min-height: 78px !important;
    height: 78px !important;
    box-sizing: border-box !important;
    grid-template-columns: minmax(0, 1fr) minmax(19rem, var(--line-width)) minmax(0, 1fr) !important;
    grid-template-areas: none !important;
    gap: clamp(.75rem, 1.6vw, 1.5rem) !important;
    padding-block: .58rem !important;
  }

  #dndwiki-app .dndwiki-shell .dndwiki-brand,
  #dndwiki-app .dndwiki-shell .dndwiki-search {
    grid-area: auto !important;
  }

  #dndwiki-app .dndwiki-shell .dndwiki-browse-panel-head,
  #dndwiki-app .dndwiki-shell .dndwiki-outline-rail-head {
    position: sticky !important;
    top: 0;
    min-height: 78px !important;
    height: 78px !important;
    box-sizing: border-box !important;
    border-bottom: 0 !important;
  }

  #dndwiki-app .dndwiki-shell .dndwiki-browse-panel-head::after,
  #dndwiki-app .dndwiki-shell .dndwiki-outline-rail-head::after {
    content: '';
    position: absolute;
    left: -3rem;
    right: -3rem;
    bottom: 0;
    border-bottom: 1px solid var(--dndwiki-soft-line);
    pointer-events: none;
  }

  #dndwiki-app .dndwiki-shell .dndwiki-browse-filter {
    top: 78px !important;
  }

  #dndwiki-app .dndwiki-shell .dndwiki-browse-close .dndwiki-rail-toggle-icon {
    transform: scaleX(-1) !important;
  }

  #dndwiki-app .dndwiki-shell[data-dndwiki-browse-persistent]:not([data-dndwiki-browse-open]) .dndwiki-browse-close .dndwiki-rail-toggle-icon {
    transform: scaleX(-1) rotate(180deg) !important;
  }
}
`;

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

function playerDisplayName(playerId) {
  const value = String(playerId ?? '').trim();
  if (value.length === 0) return 'Player';
  return value
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toLocaleUpperCase('en-US')}${part.slice(1)}`)
    .join(' ');
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

function pageLabel(page) {
  return page?.title ?? 'Page';
}

function uniqueByPage(records, key, excluded = new Set()) {
  const seen = new Set(excluded);
  const unique = [];
  for (const record of records) {
    const id = record?.[key];
    if (typeof id !== 'string' || seen.has(id)) continue;
    seen.add(id);
    unique.push(record);
  }
  return unique;
}

function cleanNavigationLinks(records) {
  return uniqueByPage(records
    .filter((record) => record.targetType === 'page' && record.route != null)
    .map((record) => ({
      label: record.label,
      route: record.route,
      status: record.targetStatus,
      targetPageId: record.targetPageId,
    })), 'targetPageId');
}

export function buildWikiShellModel(snapshotInput, perspective, {
  hash = '',
  query = '',
  accessMessage = null,
} = {}) {
  const snapshot = validateSnapshot(snapshotInput);
  const parsedRoute = parseWikiRoute(hash);
  const requestedPageId = parsedRoute.kind === 'page' ? parsedRoute.pageId : null;
  const page = requestedPageId == null
    ? null
    : pageForRoute(snapshot, perspective, requestedPageId);
  const normalizedQuery = String(query ?? '').trim();
  const searchResults = normalizedQuery.length === 0
    ? []
    : searchNavigation(snapshot, perspective, normalizedQuery);
  const forward = page != null && page.status === 'visible'
    ? cleanNavigationLinks(forwardNavigationForPage(snapshot, perspective, page.pageId))
    : [];
  const forwardPageIds = new Set(forward.map((record) => record.targetPageId));
  const backlinks = page != null && page.status !== 'missing'
    ? uniqueByPage(backlinkNavigationForPage(snapshot, perspective, page.pageId), 'sourcePageId', forwardPageIds)
    : [];

  return {
    schemaVersion: 1,
    campaign: {
      id: snapshot.campaign.id,
      title: snapshot.campaign.title,
    },
    route: {
      hash: parsedRoute.kind === 'page' ? hash : '#/',
      requested: parsedRoute.kind === 'page',
      heading: parsedRoute.heading,
    },
    perspective: {
      kind: perspective?.kind === 'player' ? 'player' : 'anonymous',
    },
    access: {
      active: perspective?.kind === 'player',
      playerId: perspective?.kind === 'player' && typeof perspective.playerId === 'string' ? perspective.playerId : null,
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
    <button type="submit">Use key</button>
    ${message ? `<p class="dndwiki-form-error" role="alert">${escapeHtml(message)}</p>` : ''}
  </form>`;
}

function topbarAccess(model) {
  const open = model.access.message ? ' open' : '';
  if (model.access.active) {
    const player = playerDisplayName(model.access.playerId);
    return `<div class="dndwiki-access" data-dndwiki-player-access>
      <details class="dndwiki-access-menu" data-dndwiki-access-menu>
        <summary class="dndwiki-button" data-dndwiki-player-access-summary>${PLAYER_KEY_ICON.replace('<svg ', '<span class="dndwiki-player-key-icon"><svg ').replace('</svg>', '</svg></span>')}<span class="dndwiki-access-label">Logged in as ${escapeHtml(player)}</span></summary>
        <div class="dndwiki-key-popover">
          <button type="button" data-dndwiki-clear-key>Remove player key</button>
        </div>
      </details>
    </div>`;
  }
  return `<div class="dndwiki-access" data-dndwiki-player-access>
    <details class="dndwiki-access-menu" data-dndwiki-access-menu${open}>
      <summary class="dndwiki-button" data-dndwiki-player-access-summary>${PLAYER_KEY_ICON.replace('<svg ', '<span class="dndwiki-player-key-icon"><svg ').replace('</svg>', '</svg></span>')}<span class="dndwiki-access-label">Insert player key</span></summary>
      <div class="dndwiki-key-popover">
        <p class="dndwiki-meta">Enter your campaign key to reveal material shared with you.</p>
        ${keyForm(model.access.message)}
      </div>
    </details>
  </div>`;
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
    const matches = visibleResults.map((result) => {
      const matchType = result.matchType === 'title' || result.matchType === 'tag'
        ? result.matchType
        : 'content';
      const occurrenceAttribute = matchType === 'content'
        ? ` data-dndwiki-search-occurrence="${result.pageOccurrenceIndex}"`
        : '';
      const titlePreview = String(result.preview ?? '').trim();
      const resultBody = matchType === 'title'
        ? `<strong>${highlightedSnippet(result)}</strong>${titlePreview.length > 0 ? `<span>${escapeHtml(titlePreview)}</span>` : ''}`
        : matchType === 'tag'
          ? `<strong>${highlightedSnippet(result)}</strong><span>Tag · ${escapeHtml(result.title ?? 'Page')}</span>`
          : `<strong>${escapeHtml(result.title ?? 'Page')}</strong><span>${highlightedSnippet(result)}</span>`;
      return `<li>
        <a href="${escapeHtml(result.route)}" data-dndwiki-search-result data-dndwiki-search-match="${matchType}" data-dndwiki-search-page="${escapeHtml(result.pageId)}"${occurrenceAttribute} data-dndwiki-search-query="${escapeHtml(model.query)}">
          ${resultBody}
        </a>
      </li>`;
    }).join('');
    const overflowCount = Math.max(0, group.results.length - 5);
    const toggle = overflowCount > 0
      ? `<li><button type="button" data-dndwiki-search-more data-dndwiki-search-page="${escapeHtml(group.pageId)}" aria-expanded="${expanded ? 'true' : 'false'}" aria-label="${expanded ? `Show fewer results from ${escapeHtml(group.title)}` : `Show ${overflowCount} more results from ${escapeHtml(group.title)}`}" style="display:flex;align-items:center;justify-content:space-between;gap:.75rem;width:calc(100% - 1.1rem);min-height:34px;margin:.42rem .55rem;padding:.42rem .7rem;border-radius:999px;color:var(--text-muted);font-size:.78rem;font-weight:500;text-align:left">
          <span style="display:inline;margin:0;color:inherit;font-size:inherit"><strong style="display:inline;font-weight:600">${expanded ? 'Show fewer' : `Show ${overflowCount} more`}</strong><span style="display:inline;margin:0;color:var(--text-muted);font-size:inherit"> · ${escapeHtml(group.title)}</span></span>
          <span aria-hidden="true" style="display:inline-flex;margin:0;color:inherit;font-size:.9rem;line-height:1">${expanded ? '▴' : '▾'}</span>
        </button></li>`
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
  if (page == null && model.route.requested !== true) {
    return '<section class="dndwiki-home-placeholder" data-dndwiki-home-placeholder aria-hidden="true"></section>';
  }
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
  return `<ul class="dndwiki-link-list">${records.map((record) => {
    const label = backlink
      ? pageLabel({ title: record.sourceTitle })
      : record.label;
    return `<li><a href="${escapeHtml(record.route)}">${escapeHtml(label)}</a>${!backlink && record.status === 'gated' ? ' <span class="dndwiki-meta">(key)</span>' : ''}</li>`;
  }).join('')}</ul>`;
}

export function renderWikiShellHtml(model) {
  if (model == null || model.schemaVersion !== 1) throw new WikiShellError('Shell model schemaVersion must be 1.');
  return `<div class="dndwiki-shell" data-dndwiki-campaign-id="${escapeHtml(model.campaign.id)}">
    <style id="dndwiki-reader-v47-polish">${READER_V47_POLISH_CSS}</style>
    <header class="dndwiki-topbar">
      <div class="dndwiki-brand">
        <a href="#/">${escapeHtml(model.campaign.title)}</a>
        <small>dndwiki</small>
      </div>
      <form class="dndwiki-search" role="search" data-dndwiki-search-form style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.4rem">
        <label style="min-width:0;position:relative">
          <span class="dndwiki-meta" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Search visible wiki content</span>
          <input name="query" type="text" value="${escapeHtml(model.query)}" placeholder="Search this wiki" autocomplete="off" style="padding-right:2.4rem">
          <button type="button" data-dndwiki-search-clear aria-label="Clear search"${model.query.length === 0 ? ' hidden' : ''} style="position:absolute;right:.22rem;top:50%;transform:translateY(-50%);width:1.8rem;height:1.8rem;min-height:0;padding:0;border:1px solid transparent;border-radius:999px;color:var(--text-muted);font-size:1.05rem;line-height:1">×</button>
        </label>
        <button type="submit">Search</button>
        <div data-dndwiki-search-results aria-live="polite"${model.query.length === 0 ? ' hidden' : ''} style="position:absolute;left:0;right:0;top:calc(100% + .4rem);z-index:30;max-height:min(70vh,34rem);overflow:auto">${searchResults(model)}</div>
      </form>
      ${topbarAccess(model)}
    </header>
    <div class="dndwiki-layout">
      <main class="dndwiki-main" id="main-content">
        ${pageBody(model)}
      </main>
      <aside class="dndwiki-sidebar" aria-label="Wiki navigation">
        ${model.forward.length > 0 ? `<section class="dndwiki-card" aria-labelledby="dndwiki-links-heading"><h2 id="dndwiki-links-heading">Links</h2>${linkList(model.forward)}</section>` : ''}
        ${model.backlinks.length > 0 ? `<section class="dndwiki-card" aria-labelledby="dndwiki-backlinks-heading"><h2 id="dndwiki-backlinks-heading">Backlinks</h2>${linkList(model.backlinks, { backlink: true })}</section>` : ''}
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

function syncPlayerAccessPlacement(root) {
  const nav = root?.querySelector?.('[data-dndwiki-primary-nav]');
  const access = root?.querySelector?.('[data-dndwiki-player-access]');
  const homeSection = nav?.querySelector?.('.dndwiki-primary-nav-section');
  if (nav == null || access == null || homeSection == null || access.parentElement === homeSection) return false;
  homeSection.append?.(access);
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
        const matchType = link.getAttribute?.('data-dndwiki-search-match') ?? 'content';
        const occurrenceIndex = Number.parseInt(link.getAttribute?.('data-dndwiki-search-occurrence') ?? '', 10);
        const route = link.getAttribute?.('href') ?? '';
        const contentTarget = matchType === 'content';
        if (!PAGE_ID_RE.test(pageId)
          || query.trim().length === 0
          || !['title', 'tag', 'content'].includes(matchType)
          || (contentTarget && (!Number.isInteger(occurrenceIndex) || occurrenceIndex < 0))
          || route.length === 0) return;
        event.preventDefault();
        pendingSearchTarget = contentTarget ? { pageId, query, occurrenceIndex } : null;
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

    syncPlayerAccessPlacement(root);

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
  const onPlayerAccessClick = (event) => {
    const summary = event.target?.closest?.('[data-dndwiki-player-access-summary]');
    if (summary == null) return;
    const shell = root.querySelector?.('.dndwiki-shell');
    if (Number(browserWindow.innerWidth ?? 0) < 1100
      || shell?.hasAttribute?.('data-dndwiki-browse-persistent') !== true
      || shell?.hasAttribute?.('data-dndwiki-browse-open') === true) return;
    event.preventDefault?.();
    const menu = summary.closest?.('[data-dndwiki-access-menu]');
    shell.querySelector?.('[data-dndwiki-browse-close]')?.click?.();
    browserWindow.queueMicrotask?.(() => { if (menu != null) menu.open = true; });
  };

  const accessObserver = typeof browserWindow.MutationObserver === 'function'
    ? new browserWindow.MutationObserver(() => { syncPlayerAccessPlacement(root); })
    : null;
  accessObserver?.observe?.(root, { childList: true, subtree: true });

  browserWindow.addEventListener?.('hashchange', onHashChange);
  browserWindow.document?.addEventListener?.('pointerdown', onDocumentPointerDown);
  root.addEventListener?.('click', onPlayerAccessClick);
  render();

  return {
    get model() {
      return model;
    },
    session,
    destroy() {
      accessObserver?.disconnect?.();
      browserWindow.removeEventListener?.('hashchange', onHashChange);
      browserWindow.document?.removeEventListener?.('pointerdown', onDocumentPointerDown);
      root.removeEventListener?.('click', onPlayerAccessClick);
    },
  };
}
