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
  const sidebar = root?.querySelector?.('.dndwiki-sidebar');
  const article = root?.querySelector?.('[data-dndwiki-page]');
  const existing = sidebar?.querySelector?.('[data-dndwiki-page-toc]') ?? null;
  if (sidebar == null || article == null) {
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

  const html = `<section class="dndwiki-card dndwiki-toc" data-dndwiki-page-toc data-dndwiki-toc-signature="${escapeHtml(signature)}" aria-labelledby="dndwiki-toc-heading"><h2 id="dndwiki-toc-heading">On this page</h2><ul class="dndwiki-toc-list">${links}</ul></section>`;
  existing?.remove?.();
  sidebar.insertAdjacentHTML?.('afterbegin', html);
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
  input.focus();
  input.select?.();
  return true;
}

function closeMobileBrowseAfterNavigation(root, target) {
  const link = target?.closest?.('[data-dndwiki-mobile-browse] a');
  if (link == null) return false;
  const browse = link.closest?.('[data-dndwiki-mobile-browse]');
  if (browse?.hasAttribute?.('open') !== true) return false;
  browse.removeAttribute?.('open');
  return true;
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
      updateContextHeadings(root);
      syncPageBreadcrumbs(root);
      syncPageTableOfContents(root, browserWindow);
    });
  };

  const onKeyDown = (event) => focusWikiSearch(root, browserWindow, event);
  const onClick = (event) => closeMobileBrowseAfterNavigation(root, event?.target);
  const observer = typeof browserWindow.MutationObserver === 'function'
    ? new browserWindow.MutationObserver(refresh)
    : null;
  observer?.observe?.(root, { childList: true, subtree: true });
  browserWindow.addEventListener?.('hashchange', refresh, true);
  browserWindow.addEventListener?.('keydown', onKeyDown, true);
  root.addEventListener?.('click', onClick, true);
  refresh();

  return {
    destroy() {
      observer?.disconnect?.();
      browserWindow.removeEventListener?.('hashchange', refresh, true);
      browserWindow.removeEventListener?.('keydown', onKeyDown, true);
      root.removeEventListener?.('click', onClick, true);
    },
  };
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  mountReaderChromeRefresh({ root: document.getElementById('dndwiki-app'), window });
}
