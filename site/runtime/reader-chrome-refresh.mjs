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

export function updateContextHeadings(root) {
  const title = root?.querySelector?.('[data-dndwiki-page-header] h1')?.textContent?.trim() ?? '';
  const backlinksHeading = root?.querySelector?.('#dndwiki-backlinks-heading');
  if (backlinksHeading != null && title.length > 0) {
    const desiredHeading = `${title} is mentioned in`;
    if (backlinksHeading.textContent !== desiredHeading) {
      backlinksHeading.textContent = desiredHeading;
    }
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
  for (const heading of article?.querySelectorAll?.('h2,h3,h4') ?? []) {
    const label = String(heading.textContent ?? '').trim();
    const level = Number(String(heading.tagName ?? '').slice(1));
    if (label.length === 0 || !Number.isInteger(level) || level < 2 || level > 4) continue;
    records.push({ label, level });
  }
  return records;
}

export function syncPageTableOfContents(root, browserWindow) {
  const header = root?.querySelector?.('[data-dndwiki-page-header]');
  const article = root?.querySelector?.('[data-dndwiki-page]');
  const existing = root?.querySelector?.('[data-dndwiki-page-outline]') ?? null;
  if (header == null || article == null) {
    existing?.remove?.();
    return existing != null;
  }

  const entries = tocEntries(article);
  if (entries.length < 2) {
    existing?.remove?.();
    return existing != null;
  }

  const routeHash = String(browserWindow?.location?.hash ?? '');
  const signature = entries.map((entry) => `${entry.level}:${entry.label}`).join('|');
  if (existing?.getAttribute?.('data-dndwiki-toc-signature') === signature) return false;

  const links = entries.map((entry) => {
    const route = headingRoute(routeHash, entry.label);
    if (route == null) return '';
    return `<li><a class="dndwiki-toc-link" data-level="${entry.level}" href="${escapeHtml(route)}">${escapeHtml(entry.label)}</a></li>`;
  }).filter(Boolean).join('');

  if (links.length === 0) {
    existing?.remove?.();
    return existing != null;
  }

  const html = `<details class="dndwiki-page-outline" data-dndwiki-page-outline data-dndwiki-toc-signature="${escapeHtml(signature)}"><summary><span>On this page</span><span class="dndwiki-page-outline-count">${entries.length} sections</span></summary><ul class="dndwiki-toc-list">${links}</ul></details>`;
  existing?.remove?.();
  header.insertAdjacentHTML?.('beforeend', html);
  return true;
}

export function syncBrowsePanel(root) {
  const shell = root?.querySelector?.('.dndwiki-shell');
  const nav = root?.querySelector?.('[data-dndwiki-primary-nav]');
  if (shell == null || nav == null) return false;
  let changed = false;

  if (nav.getAttribute?.('id') !== 'dndwiki-browse-panel') {
    nav.setAttribute?.('id', 'dndwiki-browse-panel');
    changed = true;
  }
  if (nav.getAttribute?.('aria-label') !== 'Browse wiki') {
    nav.setAttribute?.('aria-label', 'Browse wiki');
    changed = true;
  }
  if (nav.querySelector?.('[data-dndwiki-browse-panel-head]') == null) {
    nav.insertAdjacentHTML?.('afterbegin', '<div class="dndwiki-browse-panel-head" data-dndwiki-browse-panel-head><span class="dndwiki-browse-panel-title">Browse</span><button class="dndwiki-browse-close" type="button" data-dndwiki-browse-close aria-label="Close browse">×</button></div>');
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

  const open = shell.hasAttribute?.('data-dndwiki-browse-open') === true;
  nav.setAttribute?.('aria-hidden', open ? 'false' : 'true');
  for (const trigger of shell.querySelectorAll?.('[data-dndwiki-browse-trigger]') ?? []) {
    trigger.setAttribute?.('aria-expanded', open ? 'true' : 'false');
  }
  if ('inert' in nav) nav.inert = !open;
  return changed;
}

export function setBrowseOpen(root, open) {
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
  return current !== desired;
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

  if (sidebar.parentElement !== main) {
    main.append?.(sidebar);
    changed = true;
  }
  if (sidebar.hasAttribute?.('data-dndwiki-context-footer') !== true) {
    sidebar.setAttribute?.('data-dndwiki-context-footer', '');
    changed = true;
  }

  const hasCards = (sidebar.querySelectorAll?.('.dndwiki-card') ?? []).length > 0;
  if (sidebar.hidden === hasCards) {
    sidebar.hidden = !hasCards;
    changed = true;
  }
  return changed;
}

export function reshapeHomeDirectory(root) {
  const home = root?.querySelector?.('[data-dndwiki-home]');
  if (home == null || home.hasAttribute?.('data-dndwiki-reader-v3-home')) return false;
  let changed = false;

  const actions = home.querySelector?.('.dndwiki-home-actions');
  if (actions != null && actions.querySelector?.('[data-dndwiki-browse-trigger]') == null) {
    actions.insertAdjacentHTML?.('beforeend', '<button class="dndwiki-home-browse" type="button" data-dndwiki-browse-trigger aria-controls="dndwiki-browse-panel" aria-expanded="false">Browse topics</button>');
    changed = true;
  }

  const heading = home.querySelector?.('#dndwiki-home-pages-heading');
  const section = heading?.closest?.('.dndwiki-home-section');
  const pages = section?.querySelector?.('.dndwiki-home-pages');
  if (section != null && pages != null && typeof section.insertAdjacentHTML === 'function') {
    const count = (pages.querySelectorAll?.('li') ?? []).length;
    section.insertAdjacentHTML('beforebegin', `<details class="dndwiki-home-directory"><summary><span>All pages</span><span class="dndwiki-home-directory-meta">${count} alphabetical</span></summary><div class="dndwiki-home-directory-body">${pages.outerHTML ?? ''}</div></details>`);
    section.remove?.();
    changed = true;
  }

  home.setAttribute?.('data-dndwiki-reader-v3-home', '');
  return changed;
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
  setBrowseOpen(root, false);
  input.focus();
  input.select?.();
  return true;
}

function handleReaderClick(root, target) {
  const trigger = target?.closest?.('[data-dndwiki-browse-trigger]');
  if (trigger != null) {
    const shell = root?.querySelector?.('.dndwiki-shell');
    const open = shell?.hasAttribute?.('data-dndwiki-browse-open') === true;
    setBrowseOpen(root, !open);
    return true;
  }
  if (target?.closest?.('[data-dndwiki-browse-close], [data-dndwiki-browse-scrim]') != null) {
    setBrowseOpen(root, false);
    return true;
  }
  if (target?.closest?.('[data-dndwiki-primary-nav] a') != null) {
    setBrowseOpen(root, false);
    return true;
  }
  return false;
}

export function mountReaderChromeRefresh({ root, window: browserWindow } = {}) {
  if (root == null || browserWindow == null) return { destroy() {} };

  moveReaderStylesheetLast(browserWindow.document);

  let queued = false;
  const refresh = () => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      moveReaderStylesheetLast(browserWindow.document);
      syncBrowsePanel(root);
      updateContextHeadings(root);
      syncPageBreadcrumbs(root);
      syncPageTableOfContents(root, browserWindow);
      syncContextFooter(root);
      reshapeHomeDirectory(root);
    });
  };

  const onKeyDown = (event) => {
    if (String(event?.key ?? '') === 'Escape') {
      if (setBrowseOpen(root, false)) event.preventDefault?.();
      return;
    }
    focusWikiSearch(root, browserWindow, event);
  };
  const onClick = (event) => handleReaderClick(root, event?.target);
  const onHashChange = () => {
    setBrowseOpen(root, false);
    refresh();
  };
  const observer = typeof browserWindow.MutationObserver === 'function'
    ? new browserWindow.MutationObserver(refresh)
    : null;
  observer?.observe?.(root, { childList: true, subtree: true });
  browserWindow.addEventListener?.('hashchange', onHashChange, true);
  browserWindow.addEventListener?.('keydown', onKeyDown, true);
  root.addEventListener?.('click', onClick, true);
  refresh();

  return {
    destroy() {
      observer?.disconnect?.();
      browserWindow.removeEventListener?.('hashchange', onHashChange, true);
      browserWindow.removeEventListener?.('keydown', onKeyDown, true);
      root.removeEventListener?.('click', onClick, true);
    },
  };
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  mountReaderChromeRefresh({ root: document.getElementById('dndwiki-app'), window });
}
