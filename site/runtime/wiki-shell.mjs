import { renderMarkdownToHtml } from './markdown-renderer-v2.mjs';
import {
  backlinkNavigationForPage,
  forwardNavigationForPage,
  pageForRoute,
  searchNavigation,
  normalizeSearchOptions,
  visibleSearchTags,
} from './navigation.mjs';
import { buildPageView } from './page-visibility.mjs';
import { createPlayerIdentitySession } from './player-identity.mjs';
import { buildViewerGraph } from './viewer-graph.mjs';

const PAGE_ID_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const PLAYER_KEY_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="8.25" cy="12" r="3.25"></circle><path d="M11.5 12H21"></path><path d="m17.5 12 0 3"></path><path d="m14.5 12 0 2"></path></svg>';
const RELATED_PAGE_LIMIT = 4;
const RELATED_STOP_WORDS = new Set([
  'about', 'after', 'again', 'also', 'another', 'because', 'been', 'before', 'being', 'between', 'both',
  'could', 'does', 'each', 'from', 'have', 'into', 'just', 'more', 'most', 'other', 'over', 'same', 'some',
  'such', 'than', 'that', 'their', 'them', 'then', 'there', 'these', 'they', 'this', 'those', 'through',
  'under', 'very', 'what', 'when', 'where', 'which', 'while', 'with', 'would', 'your', 'were', 'will',
]);
const RELATED_INDEX_CACHE = new WeakMap();
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

#dndwiki-app .dndwiki-shell .dndwiki-key-form {
  align-items: stretch;
}

#dndwiki-app .dndwiki-shell .dndwiki-key-form > label {
  min-width: 0;
  display: flex;
}

#dndwiki-app .dndwiki-shell .dndwiki-key-form input,
#dndwiki-app .dndwiki-shell .dndwiki-key-form > button {
  height: 38px;
  min-height: 38px !important;
  box-sizing: border-box;
}

#dndwiki-app .dndwiki-shell .dndwiki-key-form input::placeholder {
  color: var(--text-muted);
  opacity: 1;
}

#dndwiki-app .dndwiki-shell .dndwiki-key-popover [data-dndwiki-clear-key] {
  width: 100%;
}

#dndwiki-app .dndwiki-shell .dndwiki-page hr.short {
  width: 28%;
  min-width: 5rem;
  margin-inline: auto;
}

#dndwiki-app .dndwiki-shell .dndwiki-page hr.long {
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

  #dndwiki-app .dndwiki-shell .dndwiki-browse-close,
  #dndwiki-app .dndwiki-shell .dndwiki-outline-trigger {
    width: 2.55rem !important;
    min-width: 2.55rem !important;
    max-width: 2.55rem !important;
    height: 2.55rem !important;
    min-height: 2.55rem !important;
    display: grid !important;
    place-items: center !important;
    padding: 0 !important;
    margin: 0 !important;
    line-height: 0 !important;
    justify-content: center !important;
  }

  #dndwiki-app .dndwiki-shell .dndwiki-rail-toggle-icon {
    width: 1.05rem !important;
    height: 1.05rem !important;
    display: grid !important;
    place-items: center !important;
    margin: 0 !important;
    transform-origin: 50% 50% !important;
  }

  #dndwiki-app .dndwiki-shell .dndwiki-rail-toggle-icon svg {
    width: 100% !important;
    height: 100% !important;
    display: block !important;
  }

  #dndwiki-app .dndwiki-shell[data-dndwiki-browse-persistent]:not([data-dndwiki-browse-open]) .dndwiki-browse-panel-head,
  #dndwiki-app .dndwiki-shell[data-dndwiki-outline-persistent]:not([data-dndwiki-outline-open]) .dndwiki-outline-rail-head {
    justify-content: center !important;
    padding-inline: 0 !important;
  }

  #dndwiki-app .dndwiki-shell[data-dndwiki-browse-persistent]:not([data-dndwiki-browse-open]) .dndwiki-browse-close,
  #dndwiki-app .dndwiki-shell[data-dndwiki-outline-persistent]:not([data-dndwiki-outline-open]) .dndwiki-outline-trigger {
    margin-inline: auto !important;
  }

  #dndwiki-app .dndwiki-shell[data-dndwiki-browse-persistent]:not([data-dndwiki-browse-open]) .dndwiki-primary-nav,
  #dndwiki-app .dndwiki-shell[data-dndwiki-outline-persistent]:not([data-dndwiki-outline-open]) .dndwiki-outline-rail {
    scrollbar-gutter: auto !important;
    scrollbar-width: none !important;
  }

  #dndwiki-app .dndwiki-shell[data-dndwiki-browse-persistent]:not([data-dndwiki-browse-open]) .dndwiki-primary-nav::-webkit-scrollbar,
  #dndwiki-app .dndwiki-shell[data-dndwiki-outline-persistent]:not([data-dndwiki-outline-open]) .dndwiki-outline-rail::-webkit-scrollbar {
    width: 0 !important;
    height: 0 !important;
  }

  #dndwiki-app .dndwiki-shell .dndwiki-browse-close .dndwiki-rail-toggle-icon {
    transform: scaleX(-1) !important;
  }

  #dndwiki-app .dndwiki-shell[data-dndwiki-browse-persistent]:not([data-dndwiki-browse-open]) .dndwiki-browse-close .dndwiki-rail-toggle-icon {
    transform: scaleX(-1) rotate(180deg) !important;
  }
}
`;

const SEARCH_UI_CSS = `
#dndwiki-app .dndwiki-shell .dndwiki-topbar .dndwiki-search .dndwiki-search-input-wrap {position:relative;min-width:0;width:100%;}
#dndwiki-app .dndwiki-shell .dndwiki-topbar .dndwiki-search .dndwiki-search-input-wrap label {display:block;width:100%;}
#dndwiki-app .dndwiki-shell .dndwiki-topbar .dndwiki-search input[name="query"] {padding-right:6rem !important;}
#dndwiki-app .dndwiki-shell .dndwiki-topbar .dndwiki-search [data-dndwiki-search-clear] {right:3rem !important;width:40px !important;height:40px !important;min-width:40px !important;min-height:40px !important;border:0;background:transparent;box-shadow:none;}
#dndwiki-app .dndwiki-shell .dndwiki-topbar .dndwiki-search .dndwiki-search-filter-toggle {position:absolute;right:2px;top:50%;transform:translateY(-50%);display:flex;align-items:center;justify-content:center;gap:2px;width:44px;min-width:44px;min-height:40px;padding:0;border:0;border-radius:8px;background:transparent;color:var(--text-muted);box-shadow:none;}
#dndwiki-app .dndwiki-shell .dndwiki-search-filter-toggle svg {width:19px;height:19px;}
#dndwiki-app .dndwiki-shell .dndwiki-search-filter-toggle span {font-size:10px;font-weight:700;}
#dndwiki-app .dndwiki-shell .dndwiki-search-filter-toggle:hover,#dndwiki-app .dndwiki-shell .dndwiki-search-filter-toggle[aria-expanded="true"],#dndwiki-app .dndwiki-shell .dndwiki-search-filter-toggle.is-active {background:var(--background-modifier-hover);color:var(--text-accent);}
/* The mount owns clipping only; the child owns the single scroll surface. */
#dndwiki-app .dndwiki-shell .dndwiki-topbar .dndwiki-search > [data-dndwiki-search-results] {position:absolute;inset:calc(100% + .4rem) 0 auto;z-index:120;max-height:none;overflow:hidden;border-radius:14px;background:transparent;box-shadow:var(--dndwiki-panel-shadow);}
#dndwiki-app .dndwiki-shell .dndwiki-topbar .dndwiki-search [data-dndwiki-search-results] > .dndwiki-search-results {position:static !important;max-height:min(65dvh,34rem) !important;overflow-y:auto !important;overflow-x:hidden !important;scrollbar-width:thin;border-radius:14px;background:var(--background-primary);box-shadow:none;transform:none !important;}
#dndwiki-app .dndwiki-shell .dndwiki-topbar .dndwiki-search [hidden] {display:none !important;}
#dndwiki-app .dndwiki-shell .dndwiki-search-filters {position:absolute;top:calc(100% + .4rem);right:0;z-index:125;width:min(100%,24rem);padding:1rem;border:1px solid var(--background-modifier-border);border-radius:14px;background:var(--background-primary);box-shadow:var(--dndwiki-panel-shadow);color:var(--text-normal);font-size:14px;}
#dndwiki-app .dndwiki-shell .dndwiki-search-filter-heading {display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem;}
#dndwiki-app .dndwiki-shell .dndwiki-search-filter-heading button {min-height:32px;padding:.3rem .6rem;font-size:12px;}
#dndwiki-app .dndwiki-shell .dndwiki-search .dndwiki-search-sort {display:flex !important;height:auto !important;line-height:normal !important;align-items:center;justify-content:space-between;gap:.75rem;margin-bottom:.75rem;}
#dndwiki-app .dndwiki-shell .dndwiki-search .dndwiki-search-sort::before {content:none;}
#dndwiki-app .dndwiki-shell .dndwiki-search-sort select {min-width:0;max-width:70%;min-height:36px;padding:.35rem .5rem;border:1px solid var(--background-modifier-border);border-radius:7px;background:var(--background-secondary);color:var(--text-normal);font:inherit;}
#dndwiki-app .dndwiki-shell .dndwiki-search input[data-dndwiki-search-tag-query] {min-height:36px;padding:.4rem .65rem !important;}
#dndwiki-app .dndwiki-shell .dndwiki-search-tag-heading,#dndwiki-app .dndwiki-shell .dndwiki-search-tag-row {display:grid;grid-template-columns:minmax(0,1fr) 54px 54px;align-items:center;gap:4px;}
#dndwiki-app .dndwiki-shell .dndwiki-search-tag-heading {margin:.85rem 0 .35rem;color:var(--text-muted);font-size:11px;text-align:center;}
#dndwiki-app .dndwiki-shell .dndwiki-search-tag-heading > :first-child {text-align:left;}
#dndwiki-app .dndwiki-shell .dndwiki-search-tag-list {max-height:min(38dvh,20rem);overflow-y:auto;scrollbar-width:thin;overscroll-behavior:contain;}
#dndwiki-app .dndwiki-shell .dndwiki-search-tag-row > span {min-width:0;overflow-wrap:anywhere;}
#dndwiki-app .dndwiki-shell .dndwiki-search-tag-row small {margin-left:.45rem;color:var(--text-faint);font-size:11px;}
#dndwiki-app .dndwiki-shell .dndwiki-search-tag-row button {justify-self:center;width:36px;height:36px;min-height:36px;padding:0;margin:2px 0;border-color:transparent;border-radius:7px;background:transparent;color:var(--text-muted);font-size:20px;box-shadow:none;}
#dndwiki-app .dndwiki-shell .dndwiki-search-tag-row button:hover {background:var(--background-modifier-hover);}
#dndwiki-app .dndwiki-shell .dndwiki-search-tag-row button[aria-pressed="true"] {background:var(--text-accent);color:var(--background-primary);}
#dndwiki-app .dndwiki-shell .dndwiki-search-page {width:var(--dndwiki-reading-max);max-width:100%;margin:0 auto 3rem;}
#dndwiki-app .dndwiki-shell .dndwiki-search-page h1 {font-size:clamp(1.5rem,3vw,2.1rem);line-height:1.2;margin:.4rem 0 1rem;overflow-wrap:anywhere;}
#dndwiki-app .dndwiki-shell .dndwiki-search-page-results {font-size:14px;}
#dndwiki-app .dndwiki-shell .dndwiki-search-result-count {color:var(--text-muted);font-size:12px;}
#dndwiki-app .dndwiki-shell .dndwiki-search-page-results ul {list-style:none;padding:0;margin:0;}
#dndwiki-app .dndwiki-shell .dndwiki-search-page-group {margin:0 0 .85rem;border:1px solid var(--background-modifier-border);border-radius:10px;overflow:hidden;background:var(--background-primary);}
#dndwiki-app .dndwiki-shell .dndwiki-search-page-results a {display:block;padding:.8rem 1rem;text-decoration:none;color:var(--text-normal);}
#dndwiki-app .dndwiki-shell .dndwiki-search-page-results a:hover {background:var(--background-modifier-hover);}
#dndwiki-app .dndwiki-shell .dndwiki-search-page-results strong {display:block;font-size:14px;font-weight:600;}
#dndwiki-app .dndwiki-shell .dndwiki-search-page-results a > span {display:block;margin-top:.3rem;color:var(--text-muted);font-size:13px;line-height:1.5;}
#dndwiki-app .dndwiki-shell .dndwiki-search-page-results li + li {border-top:1px solid var(--background-modifier-border);}
#dndwiki-app .dndwiki-shell [data-dndwiki-search-selected] {display:flex;flex-wrap:wrap;gap:.4rem;}
#dndwiki-app .dndwiki-shell .dndwiki-search-selected-tag {display:inline-flex;align-items:center;gap:.5rem;min-height:32px;font-size:12px;border-radius:999px;}
#dndwiki-app .dndwiki-shell[data-dndwiki-route-kind="search"] .dndwiki-sidebar {display:none !important;}
@media(max-width:860px) {
  #dndwiki-app .dndwiki-shell .dndwiki-topbar .dndwiki-search input[name="query"] {padding-right:6rem !important;}
  #dndwiki-app .dndwiki-shell .dndwiki-topbar .dndwiki-search .dndwiki-search-filter-toggle,#dndwiki-app .dndwiki-shell .dndwiki-topbar .dndwiki-search [data-dndwiki-search-clear] {min-height:44px !important;height:44px !important;width:44px !important;}
  #dndwiki-app .dndwiki-shell .dndwiki-search-filters {width:100%;}
  #dndwiki-app .dndwiki-shell .dndwiki-search-tag-row button {width:44px;height:44px;min-height:44px;}
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
  const search = /^#\/search(?:\?(.*))?$/.exec(value);
  if (search) {
    const params = new URLSearchParams(search[1] ?? '');
    return { kind: 'search', pageId: null, heading: null, query: params.get('q') ?? '', searchOptions: normalizeSearchOptions({ includeTags: params.getAll('include'), excludeTags: params.getAll('exclude'), sort: params.get('sort') }) };
  }
  const match = /^#\/page\/([a-z0-9][a-z0-9._-]{0,63})(?:#(.*))?$/.exec(value);
  if (!match) return { kind: 'home', pageId: null, heading: null };
  return { kind: 'page', pageId: match[1], heading: decodeHeading(match[2]) };
}

export function routeForSearch(query = '', options = {}) {
  const filters = normalizeSearchOptions(options);
  const params = new URLSearchParams();
  if (String(query).trim()) params.set('q', String(query).trim());
  for (const tag of filters.includeTags) params.append('include', tag);
  for (const tag of filters.excludeTags) params.append('exclude', tag);
  if (filters.sort !== 'relevance') params.set('sort', filters.sort);
  return `#/search${params.size ? `?${params}` : ''}`;
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

function normalizeRelatedValue(value) {
  return String(value ?? '').trim().replace(/^#+/, '').toLocaleLowerCase('en-US');
}

function relatedPerspectiveKey(perspective) {
  if (perspective?.kind !== 'player') return 'anonymous';
  const ids = Array.isArray(perspective.playerIds)
    ? [...new Set(perspective.playerIds.map((value) => String(value)))].sort((left, right) => left.localeCompare(right, 'en-US'))
    : [];
  return `player:${ids.join('|')}`;
}

function relatedInlineText(value) {
  return String(value ?? '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_~]/g, '')
    .replace(/\\([\\`*{}\[\]()#+\-.!_>])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function relatedVisibleTitle(page, view) {
  if (view.status !== 'visible') return null;
  if (typeof page?.title === 'string' && page.title.trim().length > 0) return page.title.trim();
  for (const line of String(view.markdown ?? '').split(/\r?\n/)) {
    const match = /^ {0,3}#{1,6}[ \t]+(.+?)[ \t]*#*[ \t]*$/.exec(line);
    if (match == null) continue;
    const title = relatedInlineText(match[1]);
    if (title.length > 0) return title;
  }
  return null;
}

function relatedTerms(title, markdown) {
  const text = `${String(title ?? '')} ${String(markdown ?? '')}`.toLocaleLowerCase('en-US');
  const terms = new Set();
  for (const match of text.matchAll(/[a-z0-9][a-z0-9'-]{2,}/g)) {
    const term = match[0].replace(/^'+|'+$/g, '');
    if (term.length < 3 || RELATED_STOP_WORDS.has(term)) continue;
    terms.add(term);
  }
  return terms;
}

function relatedEnsureSet(map, key) {
  let value = map.get(key);
  if (value == null) {
    value = new Set();
    map.set(key, value);
  }
  return value;
}

function relatedIntersectionSize(left, right) {
  if (left == null || right == null || left.size === 0 || right.size === 0) return 0;
  const [small, large] = left.size <= right.size ? [left, right] : [right, left];
  let count = 0;
  for (const value of small) if (large.has(value)) count += 1;
  return count;
}

function buildRelatedIndex(snapshot, perspective) {
  const pages = new Map();
  for (const page of snapshot.pages) {
    if (typeof page?.pageId !== 'string') continue;
    const view = buildPageView(page, perspective);
    if (view.status !== 'visible') continue;
    const title = relatedVisibleTitle(page, view) ?? page.pageId;
    pages.set(page.pageId, {
      pageId: page.pageId,
      title,
      route: `#/page/${page.pageId}`,
      tags: new Set((view.tags ?? []).map((tag) => normalizeRelatedValue(tag?.name)).filter(Boolean)),
      terms: relatedTerms(title, view.markdown),
    });
  }

  const broadTags = new Set((snapshot.browse?.categories ?? [])
    .map((category) => normalizeRelatedValue(category?.tag))
    .filter(Boolean));
  const outgoing = new Map();
  const incoming = new Map();
  const neighbors = new Map();
  const viewerGraph = buildViewerGraph(snapshot.graph, perspective);

  for (const reference of viewerGraph.references) {
    if (reference.targetType !== 'page') continue;
    if (!pages.has(reference.sourcePageId) || !pages.has(reference.targetPageId)) continue;
    relatedEnsureSet(outgoing, reference.sourcePageId).add(reference.targetPageId);
    relatedEnsureSet(incoming, reference.targetPageId).add(reference.sourcePageId);
    relatedEnsureSet(neighbors, reference.sourcePageId).add(reference.targetPageId);
    relatedEnsureSet(neighbors, reference.targetPageId).add(reference.sourcePageId);
  }

  const documentFrequency = new Map();
  for (const page of pages.values()) {
    for (const term of page.terms) documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
  }

  return { pages, broadTags, outgoing, incoming, neighbors, documentFrequency };
}

function relatedIndexFor(snapshot, perspective) {
  let byPerspective = RELATED_INDEX_CACHE.get(snapshot);
  if (byPerspective == null) {
    byPerspective = new Map();
    RELATED_INDEX_CACHE.set(snapshot, byPerspective);
  }
  const key = relatedPerspectiveKey(perspective);
  let index = byPerspective.get(key);
  if (index == null) {
    index = buildRelatedIndex(snapshot, perspective);
    byPerspective.set(key, index);
  }
  return index;
}

function relatedTextScore(source, candidate, documentFrequency, pageCount) {
  let weightedOverlap = 0;
  const [small, large] = source.terms.size <= candidate.terms.size
    ? [source.terms, candidate.terms]
    : [candidate.terms, source.terms];
  for (const term of small) {
    if (!large.has(term)) continue;
    const frequency = documentFrequency.get(term) ?? pageCount;
    if (frequency > Math.max(4, Math.ceil(pageCount * 0.7))) continue;
    weightedOverlap += Math.log((pageCount + 1) / (frequency + 1)) + 1;
  }
  return Math.min(900, Math.round(weightedOverlap * 18));
}

function relatedCandidateScore(index, source, candidate) {
  let score = 0;
  if (index.outgoing.get(source.pageId)?.has(candidate.pageId)) score += 10000;
  if (index.incoming.get(source.pageId)?.has(candidate.pageId)) score += 8000;

  for (const tag of source.tags) {
    if (!candidate.tags.has(tag)) continue;
    score += index.broadTags.has(tag) ? 300 : 1400;
  }

  score += relatedIntersectionSize(index.neighbors.get(source.pageId), index.neighbors.get(candidate.pageId)) * 650;
  score += relatedTextScore(source, candidate, index.documentFrequency, index.pages.size);
  return score;
}

export function relatedNavigationForPage(snapshot, perspective, sourcePageId, {
  limit = RELATED_PAGE_LIMIT,
  excludePageIds = [],
} = {}) {
  if (!Number.isInteger(limit) || limit < 1) throw new TypeError('Related-page limit must be a positive integer.');
  const excluded = new Set(Array.from(excludePageIds ?? [], (value) => String(value)));
  const index = relatedIndexFor(snapshot, perspective);
  const source = index.pages.get(String(sourcePageId ?? ''));
  if (source == null || index.pages.size <= 1) return [];

  return [...index.pages.values()]
    .filter((candidate) => candidate.pageId !== source.pageId && !excluded.has(candidate.pageId))
    .map((candidate) => ({ candidate, score: relatedCandidateScore(index, source, candidate) }))
    .sort((left, right) => right.score - left.score
      || left.candidate.title.localeCompare(right.candidate.title, 'en-US')
      || left.candidate.pageId.localeCompare(right.candidate.pageId, 'en-US'))
    .slice(0, limit)
    .map(({ candidate }) => ({
      targetPageId: candidate.pageId,
      label: candidate.title,
      route: candidate.route,
      status: 'visible',
    }));
}

export function buildWikiShellModel(snapshotInput, perspective, {
  hash = '',
  query = null,
  searchOptions = null,
  accessMessage = null,
} = {}) {
  const snapshot = validateSnapshot(snapshotInput);
  const parsedRoute = parseWikiRoute(hash);
  const requestedPageId = parsedRoute.kind === 'page' ? parsedRoute.pageId : null;
  const page = requestedPageId == null
    ? null
    : pageForRoute(snapshot, perspective, requestedPageId);
  const normalizedQuery = String(query ?? parsedRoute.query ?? '').trim();
  const searchTags = visibleSearchTags(snapshot, perspective);
  const tagKeys = new Set(searchTags.map((tag) => tag.key));
  const options = normalizeSearchOptions(searchOptions ?? parsedRoute.searchOptions);
  options.includeTags = options.includeTags.filter((tag) => tagKeys.has(tag));
  options.excludeTags = options.excludeTags.filter((tag) => tagKeys.has(tag));
  const searchResults = searchNavigation(snapshot, perspective, normalizedQuery, { ...options, browse: parsedRoute.kind === 'search' || options.includeTags.length + options.excludeTags.length > 0 });
  const forward = page != null && page.status === 'visible'
    ? cleanNavigationLinks(forwardNavigationForPage(snapshot, perspective, page.pageId))
    : [];
  const backlinks = page != null && page.status !== 'missing'
    ? uniqueByPage(backlinkNavigationForPage(snapshot, perspective, page.pageId), 'sourcePageId')
    : [];
  const directPageIds = new Set([
    ...forward.map((record) => record.targetPageId),
    ...backlinks.map((record) => record.sourcePageId),
  ]);
  const related = page != null && page.status === 'visible'
    ? relatedNavigationForPage(snapshot, perspective, page.pageId, { excludePageIds: directPageIds })
    : [];

  return {
    schemaVersion: 1,
    campaign: {
      id: snapshot.campaign.id,
      title: snapshot.campaign.title,
    },
    route: {
      kind: parsedRoute.kind,
      hash: parsedRoute.kind === 'page' || parsedRoute.kind === 'search' ? hash : '#/',
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
    searchOptions: options,
    searchTags,
    searchResults,
    page,
    backlinks,
    forward,
    related,
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
  let searchOptions = normalizeSearchOptions();
  let accessMessage = null;

  const model = () => {
    const next = buildWikiShellModel(snapshot, perspective, { hash, query, searchOptions, accessMessage });
    searchOptions = next.searchOptions;
    return next;
  };
  const readSearchRoute = () => {
    const route = parseWikiRoute(hash);
    if (route.kind === 'search') { query = route.query; searchOptions = route.searchOptions; }
  };

  return {
    async load({ routeHash = '' } = {}) {
      hash = String(routeHash ?? '');
      readSearchRoute();
      perspective = await identity.load();
      accessMessage = null;
      return model();
    },

    setRoute(routeHash) {
      hash = String(routeHash ?? '');
      readSearchRoute();
      return model();
    },

    search(value) {
      query = String(value ?? '');
      return model();
    },

    filterSearch(options) {
      searchOptions = normalizeSearchOptions(options);
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
      <input name="playerKey" type="password" autocomplete="off" required aria-label="Player key" placeholder="Paste your key here">
    </label>
    <button type="submit">Unlock</button>
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

function hasSearchFilters(model) { return (model.searchOptions?.includeTags.length ?? 0) + (model.searchOptions?.excludeTags.length ?? 0) > 0; }

function searchFilterPanel(model) {
  const options = model.searchOptions ?? normalizeSearchOptions();
  return `<div class="dndwiki-search-filters" data-dndwiki-search-filters id="dndwiki-search-filters" role="dialog" aria-label="Search filters" hidden>
    <div class="dndwiki-search-filter-heading"><strong>Filters</strong><button type="button" data-dndwiki-search-reset>Reset</button></div>
    <label class="dndwiki-search-sort">Sort by<select data-dndwiki-search-sort aria-label="Sort search results">${[['relevance', 'Relevance'], ['newest', 'Newest'], ['oldest', 'Oldest'], ['updated', 'Recently updated'], ['az', 'Title A–Z'], ['za', 'Title Z–A']].map(([value, label]) => `<option value="${value}"${options.sort === value ? ' selected' : ''}>${label}</option>`).join('')}</select></label>
    <input type="text" data-dndwiki-search-tag-query aria-label="Find tags" placeholder="Find tags" autocomplete="off">
    <div class="dndwiki-search-tag-heading"><span>Tags</span><span>Include</span><span>Exclude</span></div>
    <div class="dndwiki-search-tag-list">${(model.searchTags ?? []).map((tag) => `<div class="dndwiki-search-tag-row" data-dndwiki-filter-tag="${escapeHtml(tag.key)}"><span>#${escapeHtml(tag.name)}<small>${tag.count}</small></span><button type="button" data-dndwiki-tag-include="${escapeHtml(tag.key)}" aria-label="Include #${escapeHtml(tag.name)}" aria-pressed="${options.includeTags.includes(tag.key)}">+</button><button type="button" data-dndwiki-tag-exclude="${escapeHtml(tag.key)}" aria-label="Exclude #${escapeHtml(tag.name)}" aria-pressed="${options.excludeTags.includes(tag.key)}">−</button></div>`).join('') || '<p class="dndwiki-meta">No visible tags.</p>'}</div>
  </div>`;
}

function searchResults(model, expandedPageIds = new Set(), fullPage = false) {
  if (model.query.length === 0 && !hasSearchFilters(model) && !fullPage) return '';

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
      const matchType = ['title', 'tag', 'page'].includes(result.matchType)
        ? result.matchType
        : 'content';
      const occurrenceAttribute = matchType === 'content'
        ? ` data-dndwiki-search-occurrence="${result.pageOccurrenceIndex}"`
        : '';
      const titlePreview = String(result.preview ?? '').trim();
      const resultBody = matchType === 'title' || matchType === 'page'
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
    return fullPage ? `<li class="dndwiki-search-page-group"><ul>${matches}${toggle}</ul></li>` : `${matches}${toggle}`;
  }).join('');

  return `<section class="${fullPage ? 'dndwiki-search-page-results' : 'dndwiki-search-results'}" aria-label="Search results" style="width:100%;max-width:none;margin:0">
    <${fullPage ? 'p' : 'h2'} class="dndwiki-search-result-count">${groups.length} page${groups.length === 1 ? '' : 's'} · ${model.searchResults.length} result${model.searchResults.length === 1 ? '' : 's'}${model.query ? ` for “${escapeHtml(model.query)}”` : ''}</${fullPage ? 'p' : 'h2'}>
    ${items.length > 0 ? `<ul>${items}</ul>` : '<p class="dndwiki-meta" style="padding:0 1rem 1rem">No visible matches.</p>'}
  </section>`;
}

function pageBody(model) {
  const page = model.page;
  if (model.route.kind === 'search') {
    return `<section class="dndwiki-search-page" data-dndwiki-search-page><header><p class="dndwiki-meta">Search</p><h1>${model.query ? `Results for “${escapeHtml(model.query)}”` : 'All pages'}</h1><div data-dndwiki-search-selected>${searchSelectedFilters(model)}</div></header><div data-dndwiki-search-page-results>${searchResults(model, new Set(), true)}</div></section>`;
  }
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

function searchSelectedFilters(model) {
  const options = model.searchOptions ?? normalizeSearchOptions();
  const names = new Map((model.searchTags ?? []).map((tag) => [tag.key, tag.name]));
  return ['include', 'exclude'].flatMap((kind) => options[`${kind}Tags`].map((tag) => `<button type="button" data-dndwiki-search-remove-tag="${escapeHtml(tag)}" data-kind="${kind}" class="dndwiki-search-selected-tag" aria-label="Remove ${kind} #${escapeHtml(names.get(tag) ?? tag)}">${kind === 'exclude' ? '−' : '+'} #${escapeHtml(names.get(tag) ?? tag)}<span aria-hidden="true">×</span></button>`)).join('');
}

function linkList(records, { backlink = false } = {}) {
  return `<ul class="dndwiki-link-list">${records.map((record) => {
    const label = backlink
      ? pageLabel({ title: record.sourceTitle })
      : record.label;
    return `<li><a href="${escapeHtml(record.route)}">${escapeHtml(label)}</a>${!backlink && record.status === 'gated' ? ' <span class="dndwiki-meta">(key)</span>' : ''}</li>`;
  }).join('')}</ul>`;
}

function contextSidebar(model) {
  const related = Array.isArray(model.related) ? model.related : [];
  const backlinks = Array.isArray(model.backlinks) ? model.backlinks : [];
  const backlinkPageIds = new Set(backlinks.map((record) => record.sourcePageId));
  const forward = model.forward.filter((record) => !backlinkPageIds.has(record.targetPageId));
  const sections = [];
  if (related.length > 0) {
    sections.push(`<section class="dndwiki-card" aria-labelledby="dndwiki-related-heading"><h2 id="dndwiki-related-heading">Related</h2>${linkList(related)}</section>`);
  }
  if (forward.length > 0) {
    sections.push(`<section class="dndwiki-card" aria-labelledby="dndwiki-links-heading"><h2 id="dndwiki-links-heading">Links</h2>${linkList(forward)}</section>`);
  }
  if (backlinks.length > 0) {
    sections.push(`<section class="dndwiki-card" aria-labelledby="dndwiki-backlinks-heading"><h2 id="dndwiki-backlinks-heading">Backlinks</h2>${linkList(backlinks, { backlink: true })}</section>`);
  }
  return sections.join('');
}

export function renderWikiShellHtml(model) {
  if (model == null || model.schemaVersion !== 1) throw new WikiShellError('Shell model schemaVersion must be 1.');
  return `<div class="dndwiki-shell" data-dndwiki-campaign-id="${escapeHtml(model.campaign.id)}">
    <style id="dndwiki-reader-v47-polish">${READER_V47_POLISH_CSS}</style>
    <style id="dndwiki-search-ui">${SEARCH_UI_CSS}</style>
    <header class="dndwiki-topbar">
      <div class="dndwiki-brand">
        <a href="#/">${escapeHtml(model.campaign.title)}</a>
        <small>dndwiki</small>
      </div>
      <form class="dndwiki-search" role="search" data-dndwiki-search-form style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.4rem">
        <div class="dndwiki-search-input-wrap" style="min-width:0;position:relative">
        <label>
          <span class="dndwiki-meta" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Search visible wiki content</span>
          <input name="query" type="text" value="${escapeHtml(model.query)}" placeholder="Search this wiki" autocomplete="off">
        </label>
          <button type="button" data-dndwiki-search-clear aria-label="Clear search"${model.query.length === 0 ? ' hidden' : ''} style="position:absolute;right:.22rem;top:50%;transform:translateY(-50%);width:1.8rem;height:1.8rem;min-height:0;padding:0;border:1px solid transparent;border-radius:999px;color:var(--text-muted);font-size:1.05rem;line-height:1">×</button>
          <button type="button" data-dndwiki-search-filter-toggle aria-label="Search filters" aria-expanded="false" aria-controls="dndwiki-search-filters" class="dndwiki-search-filter-toggle${hasSearchFilters(model) ? ' is-active' : ''}"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="var(--background-primary)"/><circle cx="15" cy="17" r="3" fill="var(--background-primary)"/></svg><span data-dndwiki-search-filter-count${hasSearchFilters(model) ? '' : ' hidden'}>${(model.searchOptions?.includeTags.length ?? 0) + (model.searchOptions?.excludeTags.length ?? 0)}</span></button>
        </div>
        <button type="submit">Search</button>
        <div data-dndwiki-search-results aria-live="polite"${model.query.length === 0 ? ' hidden' : ''}>${searchResults(model)}</div>
        ${searchFilterPanel(model)}
      </form>
      ${topbarAccess(model)}
    </header>
    <div class="dndwiki-layout">
      <main class="dndwiki-main" id="main-content">
        ${pageBody(model)}
      </main>
      <aside class="dndwiki-sidebar" aria-label="Wiki navigation">
        ${contextSidebar(model)}
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
  let searchResultsOpen = model.route.kind !== 'search' && model.query.length > 0;
  const expandedSearchPages = new Set();

  const setSearchResultsOpen = (open) => {
    searchResultsOpen = open === true && model.route.kind !== 'search' && (model.query.length > 0 || hasSearchFilters(model));
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
      const pageResultsRoot = root.querySelector('[data-dndwiki-search-page-results]');
      const filterPanel = root.querySelector('[data-dndwiki-search-filters]');
      const filterToggle = root.querySelector('[data-dndwiki-search-filter-toggle]');
      if (resultsRoot != null) resultsRoot.hidden = !searchResultsOpen;

      const closeFilters = () => {
        if (filterPanel != null) filterPanel.hidden = true;
        filterToggle?.setAttribute('aria-expanded', 'false');
      };
      const refreshSearch = () => {
        if (resultsRoot != null) {
          resultsRoot.innerHTML = searchResults(model, expandedSearchPages);
          resultsRoot.hidden = !searchResultsOpen || filterPanel?.hidden === false;
        }
        if (pageResultsRoot != null) {
          pageResultsRoot.innerHTML = searchResults(model, expandedSearchPages, true);
          const heading = root.querySelector('.dndwiki-search-page header h1');
          if (heading) heading.textContent = model.query ? `Results for “${model.query}”` : 'All pages';
          const selected = root.querySelector('[data-dndwiki-search-selected]');
          if (selected) selected.innerHTML = searchSelectedFilters(model);
          const route = routeForSearch(model.query, model.searchOptions);
          browserWindow.history?.replaceState?.(null, '', route);
          model = session.setRoute(route);
        }
        const count = model.searchOptions.includeTags.length + model.searchOptions.excludeTags.length;
        filterToggle?.classList.toggle('is-active', count > 0 || model.searchOptions.sort !== 'relevance');
        const badge = root.querySelector('[data-dndwiki-search-filter-count]');
        if (badge) { badge.textContent = String(count); badge.hidden = count === 0; }
        for (const button of filterPanel?.querySelectorAll('[data-dndwiki-tag-include],[data-dndwiki-tag-exclude]') ?? []) {
          const include = button.hasAttribute('data-dndwiki-tag-include');
          const tag = button.getAttribute(include ? 'data-dndwiki-tag-include' : 'data-dndwiki-tag-exclude');
          button.setAttribute('aria-pressed', String(model.searchOptions[include ? 'includeTags' : 'excludeTags'].includes(tag)));
        }
        const sort = filterPanel?.querySelector('[data-dndwiki-search-sort]');
        if (sort) sort.value = model.searchOptions.sort;
      };

      const updateSearch = (value) => {
        const rawValue = String(value ?? '');
        model = session.search(rawValue);
        expandedSearchPages.clear();
        searchResultsOpen = model.route.kind !== 'search' && (model.query.length > 0 || hasSearchFilters(model));
        refreshSearch();
        if (clearSearchButton != null) clearSearchButton.hidden = rawValue.length === 0;
      };

      searchForm?.addEventListener?.('submit', (event) => {
        event.preventDefault();
        updateSearch(searchInput?.value ?? '');
        closeFilters();
        searchResultsOpen = false;
        const route = routeForSearch(model.query, model.searchOptions);
        if (browserWindow.location?.hash === route) { model = session.setRoute(route); render(); }
        else if (browserWindow.location) browserWindow.location.hash = route;
        else { model = session.setRoute(route); render(); }
      });
      searchInput?.addEventListener?.('input', () => {
        updateSearch(searchInput.value ?? '');
      });
      searchInput?.addEventListener?.('focus', () => {
        closeFilters();
        if (String(searchInput.value ?? '').trim().length > 0 || hasSearchFilters(model)) setSearchResultsOpen(true);
      });
      clearSearchButton?.addEventListener?.('click', () => {
        if (searchInput != null) searchInput.value = '';
        updateSearch('');
        clearSearchButton.hidden = true;
        searchResultsOpen = false;
        searchInput?.focus?.();
      });
      filterToggle?.addEventListener?.('click', () => {
        const open = filterPanel?.hidden !== false;
        setSearchResultsOpen(false);
        if (filterPanel) filterPanel.hidden = !open;
        filterToggle.setAttribute('aria-expanded', String(open));
        if (open) filterPanel?.querySelector('[data-dndwiki-search-tag-query]')?.focus();
      });
      const applyFilters = (options) => {
        model = session.filterSearch(options);
        expandedSearchPages.clear();
        searchResultsOpen = model.route.kind !== 'search' && (model.query.length > 0 || hasSearchFilters(model));
        refreshSearch();
      };
      filterPanel?.addEventListener?.('click', (event) => {
        if (event.target?.closest?.('[data-dndwiki-search-reset]')) { applyFilters({}); return; }
        const button = event.target?.closest?.('[data-dndwiki-tag-include],[data-dndwiki-tag-exclude]');
        if (!button) return;
        const include = button.hasAttribute('data-dndwiki-tag-include');
        const field = include ? 'includeTags' : 'excludeTags', opposite = include ? 'excludeTags' : 'includeTags';
        const tag = button.getAttribute(include ? 'data-dndwiki-tag-include' : 'data-dndwiki-tag-exclude');
        const options = structuredClone(model.searchOptions);
        options[field] = options[field].includes(tag) ? options[field].filter((value) => value !== tag) : [...options[field], tag];
        options[opposite] = options[opposite].filter((value) => value !== tag);
        applyFilters(options);
      });
      filterPanel?.querySelector('[data-dndwiki-search-sort]')?.addEventListener('change', (event) => applyFilters({ ...model.searchOptions, sort: event.target.value }));
      filterPanel?.querySelector('[data-dndwiki-search-tag-query]')?.addEventListener('input', (event) => {
        const value = String(event.target.value).trim().replace(/^#+/, '').toLocaleLowerCase('en-US');
        for (const row of filterPanel.querySelectorAll('[data-dndwiki-filter-tag]')) row.hidden = !row.getAttribute('data-dndwiki-filter-tag').includes(value);
      });
      root.querySelector('[data-dndwiki-search-selected]')?.addEventListener('click', (event) => {
        const button = event.target.closest?.('[data-dndwiki-search-remove-tag]');
        if (!button) return;
        const field = `${button.getAttribute('data-kind')}Tags`;
        applyFilters({ ...model.searchOptions, [field]: model.searchOptions[field].filter((tag) => tag !== button.getAttribute('data-dndwiki-search-remove-tag')) });
      });
      const onResultClick = (event) => {
        const targetRoot = event.currentTarget;
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
          targetRoot.innerHTML = searchResults(model, expandedSearchPages, targetRoot === pageResultsRoot);
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
          || (contentTarget && query.trim().length === 0)
          || !['title', 'tag', 'content', 'page'].includes(matchType)
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
      };
      resultsRoot?.addEventListener?.('click', onResultClick);
      pageResultsRoot?.addEventListener?.('click', onResultClick);

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
    searchResultsOpen = false;
    render();
  };
  const onDocumentPointerDown = (event) => {
    const searchForm = root.querySelector?.('[data-dndwiki-search-form]');
    if (searchForm?.contains?.(event.target)) return;
    setSearchResultsOpen(false);
    const panel = root.querySelector?.('[data-dndwiki-search-filters]');
    if (panel) panel.hidden = true;
    root.querySelector?.('[data-dndwiki-search-filter-toggle]')?.setAttribute('aria-expanded', 'false');
  };
  const onDocumentKeyDown = (event) => {
    if (event.key !== 'Escape') return;
    const panel = root.querySelector?.('[data-dndwiki-search-filters]');
    if (panel?.hidden === false) {
      panel.hidden = true;
      const button = root.querySelector?.('[data-dndwiki-search-filter-toggle]');
      button?.setAttribute('aria-expanded', 'false'); button?.focus();
    }
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
  browserWindow.document?.addEventListener?.('keydown', onDocumentKeyDown);
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
      browserWindow.document?.removeEventListener?.('keydown', onDocumentKeyDown);
      root.removeEventListener?.('click', onPlayerAccessClick);
    },
  };
}
