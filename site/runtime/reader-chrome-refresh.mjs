const BROWSE_DESKTOP_MIN = 1100;
const OUTLINE_RAIL_MIN = 1200;
const READER_V48_STYLE_ID = 'dndwiki-reader-v48-polish';

const READER_V48_CSS = `
:root {
  --text-accent: hsl(258 88% 66%);
  --text-accent-hover: hsl(258 88% 58%);
  --interactive-accent: hsl(258 88% 66%);
}

#dndwiki-app .dndwiki-shell .dndwiki-brand::before {
  display: none !important;
}

#dndwiki-app .dndwiki-shell .dndwiki-brand > a {
  display: none !important;
}

#dndwiki-app .dndwiki-shell .dndwiki-browse-panel-head > div {
  display: flex !important;
  align-items: center;
}

#dndwiki-app .dndwiki-shell .dndwiki-browse-panel-eyebrow {
  display: none !important;
}

#dndwiki-app .dndwiki-shell .dndwiki-browse-panel-title {
  font-size: .96rem !important;
}

#dndwiki-app .dndwiki-shell .dndwiki-toc-children {
  position: relative;
  display: block !important;
  margin: .08rem 0 .08rem .95rem !important;
  padding: 0 0 0 .65rem !important;
  list-style: none !important;
}

#dndwiki-app .dndwiki-shell .dndwiki-toc-children::before {
  content: '';
  position: absolute;
  top: .12rem;
  bottom: .12rem;
  left: 0;
  width: 1px;
  background: var(--background-modifier-border);
  pointer-events: none;
}

#dndwiki-app .dndwiki-shell .dndwiki-outline-dot {
  width: .52rem !important;
  height: .52rem !important;
  min-width: .52rem !important;
  min-height: .52rem !important;
  flex: 0 0 .52rem !important;
}

@media (min-width: 1100px) {
  #dndwiki-app .dndwiki-shell[data-dndwiki-browse-persistent]:not([data-dndwiki-browse-open]) .dndwiki-browse-panel-head > div,
  #dndwiki-app .dndwiki-shell[data-dndwiki-browse-persistent]:not([data-dndwiki-browse-open]) .dndwiki-access-label,
  #dndwiki-app .dndwiki-shell[data-dndwiki-browse-persistent]:not([data-dndwiki-browse-open]) .dndwiki-key-popover {
    display: none !important;
  }

  #dndwiki-app .dndwiki-shell[data-dndwiki-browse-persistent]:not([data-dndwiki-browse-open]) .dndwiki-primary-nav .dndwiki-access {
    width: 2.55rem !important;
    margin-inline: auto !important;
  }

  #dndwiki-app .dndwiki-shell[data-dndwiki-browse-persistent]:not([data-dndwiki-browse-open]) .dndwiki-primary-nav .dndwiki-access-menu > summary {
    width: 2.55rem !important;
    min-width: 2.55rem !important;
    max-width: 2.55rem !important;
    height: 2.55rem !important;
    min-height: 2.55rem !important;
    margin-inline: auto !important;
    padding: .48rem !important;
    gap: 0 !important;
    justify-content: center !important;
    box-sizing: border-box !important;
  }

  #dndwiki-app .dndwiki-shell .dndwiki-topbar .dndwiki-brand > [data-dndwiki-browse-trigger] {
    display: none !important;
  }
}

@media (min-width: 1200px) {
  #dndwiki-app .dndwiki-shell[data-dndwiki-outline-persistent]:not([data-dndwiki-outline-open]) .dndwiki-outline-rail .dndwiki-toc-children {
    margin: 0 !important;
    padding: 0 !important;
  }

  #dndwiki-app .dndwiki-shell[data-dndwiki-outline-persistent]:not([data-dndwiki-outline-open]) .dndwiki-outline-rail .dndwiki-toc-children::before {
    display: none !important;
    content: none !important;
  }
}

@media (max-width: 1099px) {
  #dndwiki-app .dndwiki-shell .dndwiki-topbar .dndwiki-brand > [data-dndwiki-browse-trigger] {
    width: 38px !important;
    height: 38px !important;
    min-width: 38px !important;
    min-height: 38px !important;
    display: inline-grid !important;
    place-items: center;
    padding: 0 !important;
    font-size: 0 !important;
  }

  #dndwiki-app .dndwiki-shell .dndwiki-topbar .dndwiki-brand > [data-dndwiki-browse-trigger]::before {
    display: block !important;
    content: '☰' !important;
    font-size: .95rem !important;
    line-height: 1 !important;
  }
}

@media (max-width: 1199px) {
  #dndwiki-app .dndwiki-shell .dndwiki-page-header > .dndwiki-page-outline > summary::after {
    display: block !important;
    content: '⌄' !important;
    flex: 0 0 auto;
    color: var(--text-faint);
    transform: none !important;
  }

  #dndwiki-app .dndwiki-shell .dndwiki-page-header > .dndwiki-page-outline[open] > summary::after {
    transform: rotate(180deg) !important;
  }
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

function safeRoute(value) {
  const route = String(value ?? '');
  return /^#\/(?:$|tag\/|page\/)/.test(route) ? route : '#/';
}

function ensureReaderV48Styles(document) {
  if (document == null) return false;
  let style = document.getElementById?.(READER_V48_STYLE_ID) ?? null;
  if (style == null) {
    style = document.createElement?.('style') ?? null;
    if (style == null) return false;
    style.id = READER_V48_STYLE_ID;
    style.textContent = READER_V48_CSS;
    document.head?.append?.(style);
    return true;
  }
  if (style.textContent !== READER_V48_CSS) style.textContent = READER_V48_CSS;
  return false;
}

function campaignTitle(root) {
  const shell = root?.querySelector?.('.dndwiki-shell');
  if (shell == null) return '';
  const cached = String(shell.getAttribute?.('data-dndwiki-campaign-title') ?? '').trim();
  if (cached.length > 0) return cached;
  const title = String(shell.querySelector?.('.dndwiki-brand > a')?.textContent ?? '').trim();
  if (title.length > 0) shell.setAttribute?.('data-dndwiki-campaign-title', title);
  return title;
}

export function updateContextHeadings(root) {
  const title = root?.querySelector?.('[data-dndwiki-page-header] h1')?.textContent?.trim() ?? '';
  const backlinksHeading = root?.querySelector?.('#dndwiki-backlinks-heading');
  if (backlinksHeading != null && title.length > 0) {
    const desiredHeading = `${title} is mentioned in`;
    if (backlinksHeading.textContent !== desiredHeading) backlinksHeading.textContent = desiredHeading;
  }
}

export function headingRoute(hash, heading) {
  const match = /^#\/page\/([a-z0-9][a-z0-9._-]{0,63})/.exec(String(hash ?? ''));
  const label = String(heading ?? '').trim();
  if (match == null || label.length === 0) return null;
  return `#/page/${match[1]}#${encodeURIComponent(label)}`;
}

export function moveReaderStylesheetLast(document) {
  const head = document?.head;
  const links = document?.querySelectorAll?.('link[rel="stylesheet"]') ?? [];
  const target = [...links].find((link) => String(link.getAttribute?.('href') ?? '').endsWith('/runtime/reader-chrome-refresh.css')
    || String(link.getAttribute?.('href') ?? '') === './runtime/reader-chrome-refresh.css');
  if (head == null || target == null || head.lastElementChild === target) return false;
  head.append?.(target);
  return true;
}

export function syncPageBreadcrumbs(root) {
  const header = root?.querySelector?.('[data-dndwiki-page-header]');
  if (header == null || header.querySelector?.('[data-dndwiki-page-breadcrumbs]') != null) return false;
  const title = header.querySelector?.('h1');
  if (title == null || typeof title.insertAdjacentHTML !== 'function') return false;

  const tags = [...(header.querySelectorAll?.('.dndwiki-page-tags .dndwiki-tag') ?? [])].slice(0, 2);
  const crumbs = ['<a href="#/">Home</a>'];
  for (const tag of tags) {
    const label = String(tag.textContent ?? '').trim().replace(/^#+/, '');
    if (label.length === 0) continue;
    crumbs.push('<span class="dndwiki-page-breadcrumbs-separator" aria-hidden="true">›</span>');
    crumbs.push(`<a href="${escapeHtml(safeRoute(tag.getAttribute?.('href')))}">${escapeHtml(label)}</a>`);
  }
  title.insertAdjacentHTML('beforebegin', `<nav class="dndwiki-page-breadcrumbs" data-dndwiki-page-breadcrumbs aria-label="Breadcrumb">${crumbs.join('')}</nav>`);
  return true;
}

function tocEntries(article) {
  const records = [];
  for (const heading of article?.querySelectorAll?.('h1,h2,h3,h4,h5,h6') ?? []) {
    const label = String(heading.textContent ?? '').trim();
    const level = Number(String(heading.tagName ?? '').slice(1));
    if (label.length === 0 || !Number.isInteger(level) || level < 1 || level > 6) continue;
    records.push({ label, level, heading });
  }
  return records;
}

function tocHierarchyHtml(entries, routeHash) {
  const roots = [];
  const stack = [];
  for (const [index, entry] of entries.entries()) {
    const route = headingRoute(routeHash, entry.label);
    if (route == null) continue;
    const node = { ...entry, index, route, children: [] };
    while (stack.length > 0 && stack[stack.length - 1].level >= node.level) stack.pop();
    const parent = stack[stack.length - 1] ?? null;
    if (parent == null) roots.push(node);
    else parent.children.push(node);
    stack.push(node);
  }

  const renderNodes = (nodes, nested = false) => nodes.map((node) => {
    const children = node.children.length > 0
      ? `<ul class="dndwiki-toc-children">${renderNodes(node.children, true)}</ul>`
      : '';
    return `<li data-dndwiki-toc-level="${node.level}"><a class="dndwiki-toc-link" data-dndwiki-toc-index="${node.index}" data-level="${node.level}" href="${escapeHtml(node.route)}">${escapeHtml(node.label)}</a>${children}</li>`;
  }).join('');

  return renderNodes(roots, false);
}

export function outlineUsesRightRail(browserWindow) {
  return Number(browserWindow?.innerWidth ?? 0) >= OUTLINE_RAIL_MIN;
}

export function activeOutlineIndex(headingTops, threshold = 0) {
  if (!Array.isArray(headingTops) || headingTops.length === 0) return -1;
  let active = 0;
  for (let index = 0; index < headingTops.length; index += 1) {
    const top = Number(headingTops[index]);
    if (Number.isFinite(top) && top <= threshold) active = index;
    else if (Number.isFinite(top) && top > threshold) break;
  }
  return active;
}

export function syncPageTableOfContents(root, browserWindow) {
  const header = root?.querySelector?.('[data-dndwiki-page-header]');
  const article = root?.querySelector?.('[data-dndwiki-page]');
  const layout = root?.querySelector?.('.dndwiki-layout');
  const existing = root?.querySelector?.('[data-dndwiki-page-outline]') ?? null;
  const existingRail = root?.querySelector?.('[data-dndwiki-outline-rail]') ?? null;
  if (header == null || article == null) {
    existingRail?.remove?.();
    if (existingRail == null) existing?.remove?.();
    return existing != null || existingRail != null;
  }

  const entries = tocEntries(article);
  if (entries.length < 2) {
    existingRail?.remove?.();
    if (existingRail == null) existing?.remove?.();
    return existing != null || existingRail != null;
  }

  const routeHash = String(browserWindow?.location?.hash ?? '');
  const rail = outlineUsesRightRail(browserWindow) && layout != null;
  const placement = rail ? 'rail' : 'inline';
  const signature = `${placement}:${entries.map((entry) => `${entry.level}:${entry.label}`).join('|')}`;
  if (existing?.getAttribute?.('data-dndwiki-toc-signature') === signature) return false;

  const links = tocHierarchyHtml(entries, routeHash);
  if (links.length === 0) {
    existingRail?.remove?.();
    if (existingRail == null) existing?.remove?.();
    return existing != null || existingRail != null;
  }

  const open = rail || (Number(browserWindow?.innerWidth ?? 0) >= 860 && entries.length <= 7) ? ' open' : '';
  const details = `<details class="dndwiki-page-outline" data-dndwiki-page-outline data-dndwiki-toc-signature="${escapeHtml(signature)}"${open}><summary><span>On this page</span><span class="dndwiki-page-outline-count">${entries.length} sections</span></summary><ul class="dndwiki-toc-list">${links}</ul></details>`;
  existingRail?.remove?.();
  if (existingRail == null) existing?.remove?.();
  if (rail) {
    layout.insertAdjacentHTML?.('beforeend', `<aside class="dndwiki-outline-rail" data-dndwiki-outline-rail aria-label="Page outline">${details}</aside>`);
  } else {
    header.insertAdjacentHTML?.('beforeend', details);
  }
  return true;
}

export function syncActiveOutlineSection(root) {
  const article = root?.querySelector?.('[data-dndwiki-page]');
  const links = [...(root?.querySelectorAll?.('[data-dndwiki-toc-index]') ?? [])];
  const entries = tocEntries(article);
  if (entries.length < 2 || links.length === 0) return false;
  const topbarBottom = Number(root?.querySelector?.('.dndwiki-topbar')?.getBoundingClientRect?.()?.bottom ?? 0);
  const threshold = topbarBottom + 28;
  const active = activeOutlineIndex(entries.map((entry) => entry.heading?.getBoundingClientRect?.()?.top), threshold);
  let changed = false;
  for (const link of links) {
    const index = Number(link.getAttribute?.('data-dndwiki-toc-index'));
    const desired = index === active;
    const current = link.getAttribute?.('aria-current') === 'location';
    if (desired !== current) {
      if (desired) link.setAttribute?.('aria-current', 'location');
      else link.removeAttribute?.('aria-current');
      changed = true;
    }
  }
  return changed;
}

export function browseQueryMatches(value, query) {
  const haystack = String(value ?? '').trim().toLocaleLowerCase('en-US');
  const needle = String(query ?? '').trim().toLocaleLowerCase('en-US');
  return needle.length === 0 || haystack.includes(needle);
}

export function filterBrowseItems(nav, query) {
  if (nav == null) return false;
  const needle = String(query ?? '').trim();
  let changed = false;
  const items = [...(nav.querySelectorAll?.('li') ?? [])];
  for (const item of items) {
    const shouldHide = !browseQueryMatches(item.textContent, needle);
    if (item.hidden !== shouldHide) {
      item.hidden = shouldHide;
      changed = true;
    }
  }
  for (const section of nav.querySelectorAll?.('.dndwiki-primary-nav-section') ?? []) {
    const visible = [...(section.querySelectorAll?.('li') ?? [])].some((item) => item.hidden !== true);
    if (section.hidden === visible) {
      section.hidden = !visible;
      changed = true;
    }
  }
  return changed;
}

export function persistentBrowseViewport(browserWindow) {
  return Number(browserWindow?.innerWidth ?? 0) >= BROWSE_DESKTOP_MIN;
}

function browsePreferenceKey(shell) {
  const campaignId = String(shell?.getAttribute?.('data-dndwiki-campaign-id') ?? '').trim();
  return campaignId.length > 0 ? `dndwiki:${campaignId}:browse-open` : 'dndwiki:reader:browse-open';
}

function storedBrowsePreference(shell, browserWindow) {
  try {
    const value = browserWindow?.localStorage?.getItem?.(browsePreferenceKey(shell));
    if (value === 'open') return true;
    if (value === 'closed') return false;
  } catch {
    // Storage is optional; desktop still defaults open.
  }
  return null;
}

function persistBrowsePreference(shell, browserWindow, open) {
  try {
    browserWindow?.localStorage?.setItem?.(browsePreferenceKey(shell), open ? 'open' : 'closed');
  } catch {
    // A blocked storage backend must not break navigation.
  }
}

export function syncBrowsePanel(root, browserWindow = null) {
  const shell = root?.querySelector?.('.dndwiki-shell');
  const nav = root?.querySelector?.('[data-dndwiki-primary-nav]');
  if (shell == null || nav == null) return false;
  let changed = false;
  const title = campaignTitle(root) || 'Campaign wiki';

  if (nav.getAttribute?.('id') !== 'dndwiki-browse-panel') {
    nav.setAttribute?.('id', 'dndwiki-browse-panel');
    changed = true;
  }
  if (nav.getAttribute?.('aria-label') !== 'Browse wiki') {
    nav.setAttribute?.('aria-label', 'Browse wiki');
    changed = true;
  }
  if (nav.querySelector?.('[data-dndwiki-browse-panel-head]') == null) {
    nav.insertAdjacentHTML?.('afterbegin', `<div class="dndwiki-browse-panel-head" data-dndwiki-browse-panel-head><div><span class="dndwiki-browse-panel-title">${escapeHtml(title)}</span></div><button class="dndwiki-browse-close" type="button" data-dndwiki-browse-close aria-label="Collapse browse">×</button></div>`);
    changed = true;
  } else {
    const railTitle = nav.querySelector?.('.dndwiki-browse-panel-title');
    if (railTitle != null && railTitle.textContent !== title) {
      railTitle.textContent = title;
      changed = true;
    }
    const eyebrow = nav.querySelector?.('.dndwiki-browse-panel-eyebrow');
    if (eyebrow != null) {
      eyebrow.remove?.();
      changed = true;
    }
  }
  if (nav.querySelector?.('[data-dndwiki-browse-filter]') == null) {
    const head = nav.querySelector?.('[data-dndwiki-browse-panel-head]');
    head?.insertAdjacentHTML?.('afterend', '<label class="dndwiki-browse-filter"><span>Filter browse</span><input type="search" autocomplete="off" placeholder="Filter topics and pages…" data-dndwiki-browse-filter></label>');
    changed = true;
  }

  const brand = shell.querySelector?.('.dndwiki-brand');
  if (brand != null && brand.querySelector?.('[data-dndwiki-browse-trigger]') == null) {
    brand.insertAdjacentHTML?.('beforeend', '<button class="dndwiki-browse-trigger" type="button" data-dndwiki-browse-trigger aria-controls="dndwiki-browse-panel" aria-expanded="false">Browse</button>');
    changed = true;
  }
  if (shell.querySelector?.('[data-dndwiki-browse-scrim]') == null) {
    shell.insertAdjacentHTML?.('beforeend', '<button class="dndwiki-browse-scrim" type="button" data-dndwiki-browse-scrim aria-label="Close browse"></button>');
    changed = true;
  }

  const persistent = persistentBrowseViewport(browserWindow);
  const wasPersistent = shell.hasAttribute?.('data-dndwiki-browse-persistent') === true;
  if (persistent) shell.setAttribute?.('data-dndwiki-browse-persistent', '');
  else shell.removeAttribute?.('data-dndwiki-browse-persistent');
  if (persistent !== wasPersistent) changed = true;

  if (shell.hasAttribute?.('data-dndwiki-browse-state-ready') !== true || persistent !== wasPersistent) {
    const preferred = persistent ? storedBrowsePreference(shell, browserWindow) : false;
    const desired = persistent ? preferred ?? true : false;
    if (desired) shell.setAttribute?.('data-dndwiki-browse-open', '');
    else shell.removeAttribute?.('data-dndwiki-browse-open');
    shell.setAttribute?.('data-dndwiki-browse-state-ready', '');
    changed = true;
  }

  const open = shell.hasAttribute?.('data-dndwiki-browse-open') === true;
  nav.setAttribute?.('aria-hidden', open ? 'false' : 'true');
  for (const trigger of shell.querySelectorAll?.('[data-dndwiki-browse-trigger]') ?? []) {
    trigger.setAttribute?.('aria-expanded', open ? 'true' : 'false');
  }
  if ('inert' in nav) nav.inert = !open;
  return changed;
}

export function setBrowseOpen(root, open, browserWindow = null, { focus = true, persist = true } = {}) {
  const shell = root?.querySelector?.('.dndwiki-shell');
  const nav = root?.querySelector?.('[data-dndwiki-primary-nav]');
  if (shell == null || nav == null) return false;
  const desired = open === true;
  const current = shell.hasAttribute?.('data-dndwiki-browse-open') === true;
  if (desired) shell.setAttribute?.('data-dndwiki-browse-open', '');
  else shell.removeAttribute?.('data-dndwiki-browse-open');
  nav.setAttribute?.('aria-hidden', desired ? 'false' : 'true');
  if ('inert' in nav) nav.inert = !desired;
  for (const trigger of shell.querySelectorAll?.('[data-dndwiki-browse-trigger]') ?? []) {
    trigger.setAttribute?.('aria-expanded', desired ? 'true' : 'false');
  }
  if (persist && (shell.hasAttribute?.('data-dndwiki-browse-persistent') === true || persistentBrowseViewport(browserWindow))) {
    persistBrowsePreference(shell, browserWindow, desired);
  }
  if (desired && focus) nav.querySelector?.('[data-dndwiki-browse-filter]')?.focus?.();
  return current !== desired;
}

export function syncSearchChrome(root) {
  const form = root?.querySelector?.('[data-dndwiki-search-form]');
  const input = form?.querySelector?.('input[name="query"]');
  if (form == null || input == null) return false;
  let changed = false;
  if (form.querySelector?.('[data-dndwiki-search-shortcut]') == null) {
    const label = input.closest?.('label') ?? form;
    label.insertAdjacentHTML?.('beforeend', '<span class="dndwiki-search-shortcut" data-dndwiki-search-shortcut aria-hidden="true">Ctrl K</span>');
    changed = true;
  }
  const title = campaignTitle(root);
  const placeholder = title.length > 0 ? `Search ${title} wiki` : 'Search the wiki';
  if (input.getAttribute?.('placeholder') !== placeholder) {
    input.setAttribute?.('placeholder', placeholder);
    changed = true;
  }
  return changed;
}

function contextPageKey(link) {
  const href = String(link?.getAttribute?.('href') ?? '');
  const match = /^(#\/page\/[a-z0-9][a-z0-9._-]{0,63})/.exec(href);
  return match?.[1] ?? href;
}

function dedupeContextLinks(sidebar) {
  const seen = new Set();
  let changed = false;
  for (const card of sidebar?.querySelectorAll?.('.dndwiki-card') ?? []) {
    for (const link of card.querySelectorAll?.('.dndwiki-link-list a') ?? []) {
      const key = contextPageKey(link);
      if (key.length === 0 || !seen.has(key)) {
        if (key.length > 0) seen.add(key);
        continue;
      }
      link.closest?.('li')?.remove?.();
      changed = true;
    }
    const remaining = (card.querySelectorAll?.('.dndwiki-link-list a') ?? []).length;
    if (remaining === 0) {
      card.remove?.();
      changed = true;
    }
  }
  return changed;
}

export function syncContextFooter(root) {
  const main = root?.querySelector?.('.dndwiki-main');
  const sidebar = root?.querySelector?.('.dndwiki-sidebar');
  if (main == null || sidebar == null) return false;
  let changed = false;

  const accessHeading = sidebar.querySelector?.('#dndwiki-access-heading');
  const accessCard = accessHeading?.closest?.('.dndwiki-card');
  if (accessCard != null) {
    accessCard.remove?.();
    changed = true;
  }

  if (dedupeContextLinks(sidebar)) changed = true;

  if (sidebar.parentElement !== main) {
    main.append?.(sidebar);
    changed = true;
  }
  if (sidebar.hasAttribute?.('data-dndwiki-context-footer') !== true) {
    sidebar.setAttribute?.('data-dndwiki-context-footer', '');
    changed = true;
  }

  const hasCards = (sidebar.querySelectorAll?.('.dndwiki-card') ?? []).length > 0;
  if (hasCards && sidebar.querySelector?.('[data-dndwiki-context-footer-head]') == null) {
    sidebar.insertAdjacentHTML?.('afterbegin', '<div class="dndwiki-context-footer-head" data-dndwiki-context-footer-head><span>Continue exploring</span><p>Follow the connections around this note.</p></div>');
    changed = true;
  }
  if (!hasCards) sidebar.querySelector?.('[data-dndwiki-context-footer-head]')?.remove?.();

  if (sidebar.hidden === hasCards) {
    sidebar.hidden = !hasCards;
    changed = true;
  }
  return changed;
}

export function reshapeHomeDirectory(root) {
  const home = root?.querySelector?.('[data-dndwiki-home]');
  if (home == null || home.hasAttribute?.('data-dndwiki-reader-v4-home')) return false;
  let changed = false;

  const kicker = home.querySelector?.('.dndwiki-home-kicker');
  if (kicker != null && kicker.textContent !== 'Campaign compendium') {
    kicker.textContent = 'Campaign compendium';
    changed = true;
  }
  const categoriesHeading = home.querySelector?.('#dndwiki-home-categories-heading');
  if (categoriesHeading != null && categoriesHeading.textContent !== 'Explore the world') {
    categoriesHeading.textContent = 'Explore the world';
    changed = true;
  }
  const sectionHead = categoriesHeading?.closest?.('.dndwiki-home-section-head');
  if (sectionHead != null && sectionHead.nextElementSibling?.classList?.contains?.('dndwiki-home-section-intro') !== true) {
    sectionHead.insertAdjacentHTML?.('afterend', '<p class="dndwiki-home-section-intro">Start with a topic, or search for a person, place, event, or piece of lore.</p>');
    changed = true;
  }

  const actions = home.querySelector?.('.dndwiki-home-actions');
  const searchButton = actions?.querySelector?.('[data-dndwiki-home-search]');
  if (searchButton != null && searchButton.textContent !== 'Search the campaign') {
    searchButton.textContent = 'Search the campaign';
    changed = true;
  }
  if (actions != null && actions.querySelector?.('[data-dndwiki-browse-trigger]') == null) {
    actions.insertAdjacentHTML?.('beforeend', '<button class="dndwiki-home-browse" type="button" data-dndwiki-browse-trigger aria-controls="dndwiki-browse-panel" aria-expanded="false">Browse the atlas</button>');
    changed = true;
  }

  const heading = home.querySelector?.('#dndwiki-home-pages-heading');
  const section = heading?.closest?.('.dndwiki-home-section');
  const pages = section?.querySelector?.('.dndwiki-home-pages');
  if (section != null && pages != null && typeof section.insertAdjacentHTML === 'function') {
    const count = (pages.querySelectorAll?.('li') ?? []).length;
    section.insertAdjacentHTML('beforebegin', `<details class="dndwiki-home-directory"><summary><span><strong>Browse every page</strong><small>Alphabetical archive</small></span><span class="dndwiki-home-directory-meta">${count} pages</span></summary><div class="dndwiki-home-directory-body">${pages.outerHTML ?? ''}</div></details>`);
    section.remove?.();
    changed = true;
  }

  home.setAttribute?.('data-dndwiki-reader-v4-home', '');
  return changed;
}

export function readingProgressRatio({ scrollY = 0, articleTop = 0, articleHeight = 0, viewportHeight = 0 } = {}) {
  const height = Number(articleHeight);
  const viewport = Math.max(0, Number(viewportHeight) || 0);
  const denominator = Math.max(1, height - viewport);
  if (!Number.isFinite(height) || height <= 0) return 0;
  const travelled = (Number(scrollY) || 0) - (Number(articleTop) || 0);
  return Math.max(0, Math.min(1, travelled / denominator));
}

export function syncReadingProgress(root, browserWindow) {
  const shell = root?.querySelector?.('.dndwiki-shell');
  const article = root?.querySelector?.('[data-dndwiki-page]');
  if (shell == null) return false;
  let bar = shell.querySelector?.('[data-dndwiki-reading-progress]') ?? null;
  if (article == null) {
    if (bar != null) {
      bar.remove?.();
      return true;
    }
    return false;
  }

  const topbar = shell.querySelector?.('.dndwiki-topbar') ?? null;
  if (topbar == null) return false;
  if (bar == null) {
    topbar.insertAdjacentHTML?.('beforeend', '<div class="dndwiki-reading-progress" data-dndwiki-reading-progress aria-hidden="true"><span></span></div>');
    bar = topbar.querySelector?.('[data-dndwiki-reading-progress]')
      ?? shell.querySelector?.('[data-dndwiki-reading-progress]')
      ?? null;
  }
  if (bar == null) return false;

  if (bar.parentElement !== topbar) topbar.append?.(bar);
  bar.style?.setProperty?.('position', 'absolute');
  bar.style?.setProperty?.('top', 'auto');
  bar.style?.setProperty?.('bottom', '0');
  bar.style?.setProperty?.('left', '0');
  bar.style?.setProperty?.('right', '0');

  const rect = article.getBoundingClientRect?.();
  const scrollY = Number(browserWindow?.scrollY ?? browserWindow?.pageYOffset ?? 0);
  const articleTop = Number(rect?.top ?? 0) + scrollY;
  const articleHeight = Number(article.scrollHeight ?? rect?.height ?? 0);
  const viewportHeight = Number(browserWindow?.innerHeight ?? 0);
  const ratio = readingProgressRatio({ scrollY, articleTop, articleHeight, viewportHeight });
  bar.querySelector?.('span')?.style?.setProperty?.('--dndwiki-reading-progress', String(ratio));
  return true;
}

function isTypingTarget(target) {
  const tagName = String(target?.tagName ?? '').toLocaleLowerCase('en-US');
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target?.isContentEditable === true;
}

export function focusWikiSearch(root, browserWindow, event) {
  const key = String(event?.key ?? '').toLocaleLowerCase('en-US');
  const commandShortcut = key === 'k' && (event?.ctrlKey === true || event?.metaKey === true) && event?.altKey !== true;
  const slashShortcut = key === '/' && event?.ctrlKey !== true && event?.metaKey !== true && event?.altKey !== true;
  if ((!commandShortcut && !slashShortcut) || isTypingTarget(event?.target)) return false;
  const input = root?.querySelector?.('[data-dndwiki-search-form] input[name="query"]');
  if (input == null || typeof input.focus !== 'function') return false;
  event.preventDefault?.();
  if (!persistentBrowseViewport(browserWindow)) setBrowseOpen(root, false, browserWindow, { persist: false });
  input.focus();
  input.select?.();
  return true;
}

function handleReaderClick(root, target, browserWindow) {
  const trigger = target?.closest?.('[data-dndwiki-browse-trigger]');
  if (trigger != null) {
    const shell = root?.querySelector?.('.dndwiki-shell');
    const open = shell?.hasAttribute?.('data-dndwiki-browse-open') === true;
    setBrowseOpen(root, !open, browserWindow);
    return true;
  }
  if (target?.closest?.('[data-dndwiki-browse-close]') != null) {
    setBrowseOpen(root, false, browserWindow);
    return true;
  }
  if (target?.closest?.('[data-dndwiki-browse-scrim]') != null) {
    setBrowseOpen(root, false, browserWindow, { persist: false });
    return true;
  }
  if (target?.closest?.('[data-dndwiki-primary-nav] a') != null && !persistentBrowseViewport(browserWindow)) {
    setBrowseOpen(root, false, browserWindow, { persist: false });
    return true;
  }
  return false;
}

export function mountReaderChromeRefresh({ root, window: browserWindow } = {}) {
  if (root == null || browserWindow == null) return { destroy() {} };

  ensureReaderV48Styles(browserWindow.document);
  moveReaderStylesheetLast(browserWindow.document);

  let queued = false;
  let scrollQueued = false;
  const updateScrollState = () => {
    if (scrollQueued) return;
    scrollQueued = true;
    const schedule = browserWindow.requestAnimationFrame ?? ((callback) => setTimeout(callback, 0));
    schedule(() => {
      scrollQueued = false;
      syncReadingProgress(root, browserWindow);
      syncActiveOutlineSection(root);
    });
  };
  const refresh = () => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      ensureReaderV48Styles(browserWindow.document);
      moveReaderStylesheetLast(browserWindow.document);
      syncBrowsePanel(root, browserWindow);
      syncSearchChrome(root);
      updateContextHeadings(root);
      syncPageBreadcrumbs(root);
      syncPageTableOfContents(root, browserWindow);
      syncContextFooter(root);
      reshapeHomeDirectory(root);
      syncReadingProgress(root, browserWindow);
      syncActiveOutlineSection(root);
    });
  };

  const onKeyDown = (event) => {
    if (String(event?.key ?? '') === 'Escape') {
      if (!persistentBrowseViewport(browserWindow) && setBrowseOpen(root, false, browserWindow, { persist: false })) event.preventDefault?.();
      return;
    }
    focusWikiSearch(root, browserWindow, event);
  };
  const onClick = (event) => handleReaderClick(root, event?.target, browserWindow);
  const onInput = (event) => {
    if (event?.target?.matches?.('[data-dndwiki-browse-filter]')) {
      const nav = root?.querySelector?.('[data-dndwiki-primary-nav]');
      filterBrowseItems(nav, event.target.value);
    }
  };
  const onHashChange = () => {
    if (!persistentBrowseViewport(browserWindow)) setBrowseOpen(root, false, browserWindow, { persist: false });
    refresh();
    updateScrollState();
  };
  const onResize = () => {
    syncBrowsePanel(root, browserWindow);
    syncPageTableOfContents(root, browserWindow);
    updateScrollState();
  };
  const observer = typeof browserWindow.MutationObserver === 'function'
    ? new browserWindow.MutationObserver(refresh)
    : null;
  observer?.observe?.(root, { childList: true, subtree: true });
  browserWindow.addEventListener?.('hashchange', onHashChange, true);
  browserWindow.addEventListener?.('keydown', onKeyDown, true);
  browserWindow.addEventListener?.('scroll', updateScrollState, { passive: true });
  browserWindow.addEventListener?.('resize', onResize, { passive: true });
  root.addEventListener?.('click', onClick, true);
  root.addEventListener?.('input', onInput, true);
  refresh();

  return {
    destroy() {
      observer?.disconnect?.();
      browserWindow.removeEventListener?.('hashchange', onHashChange, true);
      browserWindow.removeEventListener?.('keydown', onKeyDown, true);
      browserWindow.removeEventListener?.('scroll', updateScrollState);
      browserWindow.removeEventListener?.('resize', onResize);
      root.removeEventListener?.('click', onClick, true);
      root.removeEventListener?.('input', onInput, true);
    },
  };
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  mountReaderChromeRefresh({ root: document.getElementById('dndwiki-app'), window });
}
