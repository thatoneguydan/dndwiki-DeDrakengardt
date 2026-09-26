import { pageForRoute } from './navigation.mjs';
import { mountWikiShell, parseWikiRoute } from './wiki-shell.mjs';

const CHROME_STYLE_ID = 'dndwiki-modern-chrome-styles';

const CHROME_CSS = `
.dndwiki-layout.dndwiki-modern-layout {
  width: min(100%, 108rem);
  grid-template-columns: minmax(12rem, 16rem) minmax(0, 1fr) minmax(14rem, 18rem);
  gap: clamp(1.25rem, 2.5vw, 2.5rem);
}
.dndwiki-primary-nav {
  position: sticky;
  top: 4.25rem;
  align-self: start;
  max-height: calc(100vh - 5.25rem);
  overflow: auto;
  padding: .15rem .75rem .75rem 0;
  scrollbar-width: thin;
}
.dndwiki-primary-nav-heading {
  margin: 1.15rem .5rem .4rem;
  color: var(--text-muted);
  font-size: .7rem;
  font-weight: 700;
  letter-spacing: .06em;
  text-transform: uppercase;
}
.dndwiki-primary-nav-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: .1rem;
}
.dndwiki-primary-nav-link {
  display: flex;
  align-items: center;
  min-height: 32px;
  padding: .35rem .55rem;
  border-radius: var(--radius-m);
  color: var(--text-muted);
  text-decoration: none;
  line-height: 1.25;
}
.dndwiki-primary-nav-link:hover {
  color: var(--text-normal);
  background: var(--background-modifier-hover);
}
.dndwiki-primary-nav-link[aria-current="page"] {
  color: var(--text-normal);
  background: var(--background-secondary);
  font-weight: 600;
}
.dndwiki-primary-nav-count {
  margin: .55rem .55rem 0;
  color: var(--text-faint);
  font-size: .72rem;
}
.dndwiki-mobile-browse { display: none; }
.dndwiki-shell[data-dndwiki-home-route="true"] .dndwiki-sidebar { display: none; }
.dndwiki-shell[data-dndwiki-home-route="true"] .dndwiki-layout.dndwiki-modern-layout {
  grid-template-columns: minmax(12rem, 16rem) minmax(0, 1fr);
}
.dndwiki-home {
  width: min(100%, 68rem);
  margin: 0 auto;
  padding: clamp(.25rem, 1vw, 1rem) 0 3rem;
}
.dndwiki-home-hero {
  padding: clamp(1.25rem, 3vw, 2.25rem);
  border: 1px solid var(--background-modifier-border);
  border-radius: 14px;
  background: linear-gradient(145deg, var(--background-primary-alt), var(--background-primary));
}
.dndwiki-home-kicker {
  margin: 0 0 .45rem;
  color: var(--text-muted);
  font-size: .76rem;
  font-weight: 700;
  letter-spacing: .07em;
  text-transform: uppercase;
}
.dndwiki-home h1 {
  margin: 0;
  font-size: clamp(1.75rem, 4vw, 2.7rem);
  line-height: 1.08;
  letter-spacing: -.025em;
}
.dndwiki-home-intro {
  max-width: 44rem;
  margin: .8rem 0 0;
  color: var(--text-muted);
  font-size: 1rem;
  line-height: 1.6;
}
.dndwiki-home-actions {
  display: flex;
  flex-wrap: wrap;
  gap: .6rem;
  margin-top: 1.15rem;
}
.dndwiki-home-search {
  min-height: 40px;
  padding-inline: .9rem;
  background: var(--text-normal);
  color: var(--background-primary);
  border-color: var(--text-normal);
  font-weight: 600;
}
.dndwiki-home-search:hover {
  background: color-mix(in srgb, var(--text-normal) 86%, var(--background-primary));
  color: var(--background-primary);
}
.dndwiki-home-stat {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  padding: .4rem .75rem;
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-m);
  color: var(--text-muted);
  background: var(--background-primary);
  font-size: .82rem;
}
.dndwiki-home-section { margin-top: 2rem; }
.dndwiki-home-section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: .75rem;
}
.dndwiki-home-section h2 { margin: 0; font-size: 1rem; }
.dndwiki-home-section-head span { color: var(--text-muted); font-size: .78rem; }
.dndwiki-home-pages {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: .55rem;
}
.dndwiki-home-pages a {
  display: flex;
  align-items: center;
  min-height: 48px;
  padding: .7rem .8rem;
  border: 1px solid var(--background-modifier-border);
  border-radius: 10px;
  background: var(--background-primary);
  color: var(--text-normal);
  text-decoration: none;
  line-height: 1.3;
}
.dndwiki-home-pages a:hover {
  border-color: var(--background-modifier-border-hover);
  background: var(--background-modifier-hover);
}
.dndwiki-home-empty {
  padding: 1rem;
  border: 1px dashed var(--background-modifier-border);
  border-radius: var(--radius-m);
  color: var(--text-muted);
}
@media (max-width: 1100px) and (min-width: 861px) {
  .dndwiki-layout.dndwiki-modern-layout {
    grid-template-columns: minmax(12rem, 15rem) minmax(0, 1fr);
  }
  .dndwiki-layout.dndwiki-modern-layout > .dndwiki-sidebar {
    position: static;
    grid-column: 2;
    margin-top: 0;
  }
}
@media (max-width: 860px) {
  .dndwiki-layout.dndwiki-modern-layout,
  .dndwiki-shell[data-dndwiki-home-route="true"] .dndwiki-layout.dndwiki-modern-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  .dndwiki-primary-nav { display: none; }
  .dndwiki-mobile-browse {
    display: block;
    margin: 0 0 .75rem;
    border: 1px solid var(--background-modifier-border);
    border-radius: var(--radius-m);
    background: var(--background-secondary);
  }
  .dndwiki-mobile-browse summary {
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: .75rem;
    padding: .65rem .75rem;
    cursor: pointer;
    font-weight: 600;
    list-style: none;
  }
  .dndwiki-mobile-browse summary::-webkit-details-marker { display: none; }
  .dndwiki-mobile-browse summary::after { content: '▾'; color: var(--text-muted); }
  .dndwiki-mobile-browse[open] summary::after { content: '▴'; }
  .dndwiki-mobile-browse .dndwiki-primary-nav-list {
    max-height: 52vh;
    overflow: auto;
    padding: 0 .45rem .55rem;
  }
  .dndwiki-mobile-browse .dndwiki-primary-nav-link { min-height: 44px; }
  .dndwiki-home { padding-top: 0; }
  .dndwiki-home-pages { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 560px) {
  .dndwiki-home-hero { margin-inline: -.15rem; padding: 1.15rem; border-radius: 10px; }
  .dndwiki-home-actions { display: grid; grid-template-columns: 1fr; }
  .dndwiki-home-search, .dndwiki-home-stat { width: 100%; justify-content: center; }
}
`;

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function isWikiHomeHash(hash) {
  return parseWikiRoute(String(hash ?? '')).kind === 'home';
}

export function visiblePageDirectory(snapshot, perspective) {
  if (snapshot == null || snapshot.schemaVersion !== 1 || !Array.isArray(snapshot.pages)) return [];
  const pages = [];
  for (const record of snapshot.pages) {
    if (typeof record?.pageId !== 'string') continue;
    let view;
    try {
      view = pageForRoute(snapshot, perspective, record.pageId);
    } catch {
      continue;
    }
    if (view.status !== 'visible' || typeof view.title !== 'string' || view.title.trim().length === 0 || typeof view.route !== 'string') continue;
    pages.push({ pageId: view.pageId, title: view.title.trim(), route: view.route });
  }
  return pages.sort((left, right) => left.title.localeCompare(right.title, 'en-US', { sensitivity: 'base', numeric: true }));
}

function navigationItems(directory, currentPageId, { includeHome = true } = {}) {
  const home = includeHome
    ? `<li><a class="dndwiki-primary-nav-link" href="#/"${currentPageId === null ? ' aria-current="page"' : ''}>Home</a></li>`
    : '';
  const pages = directory.map((page) => `<li><a class="dndwiki-primary-nav-link" href="${escapeHtml(page.route)}"${page.pageId === currentPageId ? ' aria-current="page"' : ''}>${escapeHtml(page.title)}</a></li>`).join('');
  return `${home}${pages}`;
}

export function renderWikiHomeHtml({ campaignTitle, directory, playerAccessActive = false }) {
  const count = directory.length;
  const pages = count === 0
    ? '<div class="dndwiki-home-empty">No pages are visible in this view yet.</div>'
    : `<ul class="dndwiki-home-pages">${directory.map((page) => `<li><a href="${escapeHtml(page.route)}">${escapeHtml(page.title)}</a></li>`).join('')}</ul>`;
  return `<section class="dndwiki-home" data-dndwiki-home>
    <div class="dndwiki-home-hero">
      <p class="dndwiki-home-kicker">Campaign wiki</p>
      <h1>${escapeHtml(campaignTitle)}</h1>
      <p class="dndwiki-home-intro">Search the campaign, browse the pages available to you, and follow connections between notes without needing to know how the wiki is organized behind the scenes.</p>
      <div class="dndwiki-home-actions">
        <button type="button" class="dndwiki-home-search" data-dndwiki-home-search>Search the wiki</button>
        <span class="dndwiki-home-stat">${count} visible page${count === 1 ? '' : 's'} · ${playerAccessActive ? 'Player access active' : 'Public view'}</span>
      </div>
    </div>
    <section class="dndwiki-home-section" aria-labelledby="dndwiki-home-pages-heading">
      <div class="dndwiki-home-section-head">
        <h2 id="dndwiki-home-pages-heading">Browse pages</h2>
        <span>Alphabetical</span>
      </div>
      ${pages}
    </section>
  </section>`;
}

function ensureChromeStyles(document) {
  if (document?.getElementById?.(CHROME_STYLE_ID) != null) return;
  const style = document?.createElement?.('style');
  if (style == null) return;
  style.id = CHROME_STYLE_ID;
  style.textContent = CHROME_CSS;
  document.head?.append?.(style);
}

function primaryNavigationHtml(directory, currentPageId) {
  return `<nav class="dndwiki-primary-nav" data-dndwiki-primary-nav aria-label="Wiki pages">
    <ul class="dndwiki-primary-nav-list">${navigationItems(directory, currentPageId)}</ul>
    <p class="dndwiki-primary-nav-heading">Pages</p>
    <p class="dndwiki-primary-nav-count">${directory.length} visible</p>
  </nav>`;
}

function mobileNavigationHtml(directory, currentPageId) {
  return `<details class="dndwiki-mobile-browse" data-dndwiki-mobile-browse>
    <summary>Browse pages <span class="dndwiki-meta">${directory.length}</span></summary>
    <ul class="dndwiki-primary-nav-list">${navigationItems(directory, currentPageId)}</ul>
  </details>`;
}

function enhanceWikiChrome({ root, browserWindow, snapshot, session }) {
  const shell = root?.querySelector?.('.dndwiki-shell');
  const layout = shell?.querySelector?.('.dndwiki-layout');
  const main = shell?.querySelector?.('.dndwiki-main');
  if (shell == null || layout == null || main == null) return;

  const parsedRoute = parseWikiRoute(browserWindow.location?.hash ?? '');
  const home = parsedRoute.kind === 'home';
  const currentPageId = home ? null : parsedRoute.pageId;
  const directory = visiblePageDirectory(snapshot, session.perspective);

  shell.setAttribute('data-dndwiki-home-route', home ? 'true' : 'false');
  layout.classList.add('dndwiki-modern-layout');

  if (layout.querySelector?.('[data-dndwiki-primary-nav]') == null) {
    main.insertAdjacentHTML?.('beforebegin', primaryNavigationHtml(directory, currentPageId));
  }
  if (layout.querySelector?.('[data-dndwiki-mobile-browse]') == null) {
    main.insertAdjacentHTML?.('beforebegin', mobileNavigationHtml(directory, currentPageId));
  }

  if (home && main.querySelector?.('[data-dndwiki-home]') == null) {
    main.innerHTML = renderWikiHomeHtml({
      campaignTitle: snapshot.campaign.title,
      directory,
      playerAccessActive: session.perspective?.kind === 'player',
    });
    if (browserWindow.document != null) browserWindow.document.title = snapshot.campaign.title;
    const searchButton = main.querySelector?.('[data-dndwiki-home-search]');
    searchButton?.addEventListener?.('click', () => {
      const input = root.querySelector?.('[data-dndwiki-search-form] input[name="query"]');
      input?.focus?.();
      input?.scrollIntoView?.({ block: 'center', behavior: browserWindow.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ? 'auto' : 'smooth' });
    });
  }
}

export async function mountModernWikiChrome({
  root,
  window: browserWindow,
  fetchImpl = browserWindow?.fetch?.bind(browserWindow),
  snapshotUrl = './dndwiki.snapshot.json',
} = {}) {
  if (root == null || browserWindow == null || typeof fetchImpl !== 'function') throw new Error('dndwiki modern chrome requires root, window, and fetch.');
  ensureChromeStyles(browserWindow.document);

  const response = await fetchImpl(snapshotUrl, { cache: 'no-store' });
  if (response == null || response.ok !== true || typeof response.json !== 'function') throw new Error('Could not load campaign snapshot.');
  const snapshot = await response.json();
  const shellFetch = async (url, options) => {
    if (url === snapshotUrl) {
      return { ok: true, json: async () => structuredClone(snapshot) };
    }
    return fetchImpl(url, options);
  };

  const mounted = await mountWikiShell({ root, window: browserWindow, fetchImpl: shellFetch, snapshotUrl });
  let enhanceQueued = false;
  const enhance = () => {
    if (enhanceQueued) return;
    enhanceQueued = true;
    queueMicrotask(() => {
      enhanceQueued = false;
      enhanceWikiChrome({ root, browserWindow, snapshot, session: mounted.session });
    });
  };

  enhance();
  const observer = typeof browserWindow.MutationObserver === 'function'
    ? new browserWindow.MutationObserver(enhance)
    : null;
  observer?.observe?.(root, { childList: true, subtree: true });

  return {
    ...mounted,
    snapshot,
    destroy() {
      observer?.disconnect?.();
      mounted.destroy?.();
    },
  };
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  const root = document.getElementById('dndwiki-app');
  try {
    await mountModernWikiChrome({ root, window });
  } catch (error) {
    console.error('dndwiki failed to start.', error);
    if (root) {
      root.className = 'dndwiki-error';
      root.textContent = 'This wiki could not be loaded. Reload the page or try again later.';
    }
  }
}
