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
    : searchNavigation(snapshot, perspective, normalizedQuery, { limit: 20 });
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

function searchResults(model) {
  if (model.query.length === 0) return '';
  const items = model.searchResults.map((result) => `<li>
    <a href="${escapeHtml(result.route)}">
      <strong>${escapeHtml(result.title ?? 'Page')}</strong>
      <span>${escapeHtml(result.snippet)}</span>
    </a>
  </li>`).join('');
  return `<section class="dndwiki-search-results" aria-label="Search results">
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
        <label style="min-width:0">
          <span class="dndwiki-meta" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Search visible wiki content</span>
          <input name="query" type="search" value="${escapeHtml(model.query)}" placeholder="Search this wiki" autocomplete="off">
        </label>
        <button type="submit">Search</button>
      </form>
      <div class="dndwiki-access">
        <span class="dndwiki-access-status">${accessStatus}</span>
        ${model.access.active ? '<button type="button" data-dndwiki-clear-key>Lock</button>' : ''}
      </div>
    </header>
    <div class="dndwiki-layout">
      <main class="dndwiki-main" id="main-content">
        <div data-dndwiki-search-results>${searchResults(model)}</div>
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
      const updateSearch = (value) => {
        model = session.search(value);
        const resultsRoot = root.querySelector('[data-dndwiki-search-results]');
        if (resultsRoot != null) resultsRoot.innerHTML = searchResults(model);
      };
      searchForm?.addEventListener?.('submit', (event) => {
        event.preventDefault();
        updateSearch(searchInput?.value ?? '');
      });
      searchInput?.addEventListener?.('input', () => {
        updateSearch(searchInput.value ?? '');
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
  };

  const onHashChange = () => {
    model = session.setRoute(browserWindow.location?.hash ?? '');
    render();
  };
  browserWindow.addEventListener?.('hashchange', onHashChange);
  render();

  return {
    get model() {
      return model;
    },
    session,
    destroy() {
      browserWindow.removeEventListener?.('hashchange', onHashChange);
    },
  };
}