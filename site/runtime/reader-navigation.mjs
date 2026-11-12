import { pageForRoute } from './navigation.mjs';
import { tablerIcon } from './tabler-icons.mjs';

export const READER_MOBILE_QUERY = '(max-width: 760px)';

const normalize = (value) => String(value ?? '').trim().replace(/^#+/, '').toLocaleLowerCase('en-US');
const alphabetical = (a, b) => a.title.localeCompare(b.title, 'en-US', { sensitivity: 'base', numeric: true });

function escapeHtml(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

export function readerCategoryRoute(tag) {
  return `#/tag/${encodeURIComponent(String(tag ?? '').trim().replace(/^#+/, ''))}`;
}

function categoriesForPage(page, view, snapshot) {
  const tags = Array.isArray(view.tags) ? view.tags : [];
  const order = new Map();
  tags.forEach((tag, index) => { const key = normalize(tag.name);if (!order.has(key)) order.set(key, index); });
  const mappings = Array.isArray(snapshot?.browse?.categories) ? snapshot.browse.categories : null;
  const configured = mappings == null ? null : new Map(mappings.map((record) => [normalize(record.tag), record]));
  const source = Array.isArray(page.categories) ? page.categories : mappings == null
    ? tags.slice(0, 2).map((tag) => ({ tag: tag.name, label: tag.name })) : [];
  return source.filter((category) => {
    const key = normalize(category?.tag);
    return key && order.has(key) && (configured == null || configured.has(key));
  }).map((category, index) => ({
    tag: String(category.tag).trim().replace(/^#+/, ''),
    label: String(category.label ?? configured?.get(normalize(category.tag))?.label ?? category.tag).trim(),
    authoredIndex: order.get(normalize(category.tag)) ?? index,
  })).sort((a, b) => a.authoredIndex - b.authoredIndex);
}

/** Only visible records enter navigation; the overall total is deliberately separate. */
export function visibleReaderDirectory(snapshot, perspective = { kind: 'anonymous', playerIds: [] }) {
  const directory = [];
  for (const record of snapshot?.pages ?? []) {
    if (typeof record?.pageId !== 'string') continue;
    let view;
    try { view = pageForRoute(snapshot, perspective, record.pageId); } catch { continue; }
    if (view.status !== 'visible' || typeof view.title !== 'string' || !view.title.trim() || typeof view.route !== 'string') continue;
    directory.push({
      pageId: record.pageId,
      title: view.title.trim(),
      route: view.route,
      tags: view.tags ?? [],
      categories: categoriesForPage(record, view, snapshot),
      isMap: record.mapsmith?.schemaVersion === 1
        && (record.mapsmith.audience?.public === true || (perspective?.kind === 'player'
          && record.mapsmith.audience?.playerIds?.some((id) => perspective.playerIds?.includes(id)))),
    });
  }
  return directory.sort(alphabetical);
}

export function readerCategories(directory, snapshot) {
  const groups = new Map();
  for (const page of directory ?? []) for (const category of page.categories ?? []) {
    const key = normalize(category.tag);
    if (!groups.has(key)) groups.set(key, { tag: category.tag, label: category.label, pages: [] });
    if (!groups.get(key).pages.some((record) => record.pageId === page.pageId)) groups.get(key).pages.push(page);
  }
  const ranks = new Map((snapshot?.browse?.categories ?? []).map((category, index) => [normalize(category.tag), index]));
  return [...groups.values()].sort((a, b) => (ranks.get(normalize(a.tag)) ?? Infinity) - (ranks.get(normalize(b.tag)) ?? Infinity)
    || a.label.localeCompare(b.label, 'en-US', { sensitivity: 'base', numeric: true }));
}

export function readerDirectoryModel({ snapshot, perspective, hash = '#/' } = {}) {
  const directory = visibleReaderDirectory(snapshot, perspective);
  const categories = readerCategories(directory, snapshot);
  const match = /^#\/tag\/(.+)$/.exec(String(hash));
  let requested = null;
  if (match) { try { requested = normalize(decodeURIComponent(match[1])); } catch { requested = ''; } }
  const category = requested == null ? null : categories.find((record) => normalize(record.tag) === requested) ?? null;
  const kind = match ? 'tag' : /^#\/(?:page(?:\/|$)|search(?:[/?]|$))/.test(String(hash)) ? 'other' : 'home';
  return { kind, title: snapshot?.campaign?.title ?? 'Campaign wiki', directory, categories,
    category, pages: kind === 'tag' ? category?.pages ?? [] : directory,
    total: Array.isArray(snapshot?.pages) ? snapshot.pages.length : 0 };
}

function countHtml(count, total, label = 'notes') {
  return `<sup class="reader-count" aria-label="${escapeHtml(`${count} visible ${label} / ${total} published notes in the wiki`)}">${count}/${total}</sup>`;
}

function pageRows(pages) {
  return pages.map((page, index) => `<li><a class="reader-directory-row" href="${escapeHtml(page.route)}"><span class="reader-row-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><span class="reader-row-title">${escapeHtml(page.title)}</span>${tablerIcon('arrow-up-right', { className: 'reader-row-arrow' })}</a></li>`).join('');
}

export function renderReaderDirectory(options = {}) {
  const model = readerDirectoryModel(options);
  if (model.kind === 'other') return null;
  if (model.kind === 'tag') {
    const title = model.category?.label ?? 'Category';
    return `<section class="reader-directory reader-category-directory" data-dndwiki-tag-page data-reader-directory>
      <a class="reader-directory-back" href="#/">${tablerIcon('chevron-left')}<span>${escapeHtml(model.title)}</span></a>
      <header class="reader-directory-heading"><span class="reader-directory-kicker">Explore</span><h1>${escapeHtml(title)}${countHtml(model.pages.length, model.total, `${title} notes`)}</h1></header>
      ${model.pages.length ? `<ol class="reader-directory-list">${pageRows(model.pages)}</ol>` : '<p class="reader-directory-empty">No notes are available in this category.</p>'}
    </section>`;
  }
  return `<section class="reader-directory reader-home-directory" data-dndwiki-home data-reader-directory>
    <header class="reader-directory-heading"><span class="reader-directory-kicker">The campaign</span><h1>${escapeHtml(model.title)}</h1><button type="button" class="reader-directory-search" data-reader-open-search>${tablerIcon('search')}<span>Search the lore</span>${tablerIcon('arrow-up-right')}</button></header>
    ${model.categories.length ? `<section class="reader-directory-section"><h2>Explore${countHtml(model.directory.length, model.total)}</h2><ol class="reader-directory-list reader-category-list">${model.categories.map((category, index) => `<li><a class="reader-directory-row" href="${escapeHtml(readerCategoryRoute(category.tag))}"><span class="reader-row-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><span class="reader-row-title">${escapeHtml(category.label)}${countHtml(category.pages.length, model.total, `${category.label} notes`)}</span>${tablerIcon('arrow-up-right', { className: 'reader-row-arrow' })}</a></li>`).join('')}</ol></section>` : ''}
    <section class="reader-directory-section"><h2>All notes${countHtml(model.directory.length, model.total)}</h2>${model.directory.length ? `<ol class="reader-directory-list">${pageRows(model.directory)}</ol>` : '<p class="reader-directory-empty">No notes are available yet.</p>'}</section>
  </section>`;
}

/** Direct scroll-delta translation: no timer, direction threshold, or easing. */
export function mobileRailOffset(offset, previousY, currentY, height) {
  const previous = Math.max(0, Number(previousY) || 0), current = Math.max(0, Number(currentY) || 0);
  if (current <= 0) return 0;
  return Math.max(0, Math.min(Math.max(0, Number(height) || 0), (Number(offset) || 0) + current - previous));
}

function routeState(hash) {
  const page = /^#\/page\/([a-z0-9][a-z0-9._-]{0,63})/.exec(String(hash));
  const tag = /^#\/tag\/(.+)$/.exec(String(hash));
  let category = null;
  if (tag) { try { category = normalize(decodeURIComponent(tag[1])); } catch { category = ''; } }
  return { pageId: page?.[1] ?? null, category, home: !page && !tag && !/^#\/search(?:[/?]|$)/.test(String(hash)) };
}

function panelLinks(model, hash) {
  const state = routeState(hash);
  return `<a href="#/" class="reader-panel-home"${state.home ? ' aria-current="page"' : ''}>${escapeHtml(model.title)}</a>
    <div class="reader-panel-search" data-reader-search-host></div>
    <section class="reader-panel-section"><h2>Explore${countHtml(model.directory.length, model.total)}</h2><ol class="reader-panel-links">${model.categories.map((category, index) => `<li><a href="${escapeHtml(readerCategoryRoute(category.tag))}"${state.category === normalize(category.tag) ? ' aria-current="page"' : ''}><span class="reader-panel-index" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><span>${escapeHtml(category.label)}${countHtml(category.pages.length, model.total, `${category.label} notes`)}</span>${tablerIcon('chevron-right')}</a></li>`).join('')}</ol></section>
    <details class="reader-all-notes"${state.pageId ? ' open' : ''}><summary><span>All notes${countHtml(model.directory.length, model.total)}</span>${tablerIcon('chevron-down')}</summary><ol class="reader-panel-note-links">${model.directory.map((page) => `<li><a href="${escapeHtml(page.route)}"${state.pageId === page.pageId ? ' aria-current="page"' : ''}>${escapeHtml(page.title)}</a></li>`).join('')}</ol></details>`;
}

export function mountReaderNavigation({ root, window: browserWindow, snapshot, session, onSearch, onKey, mobilePanel = 'full' } = {}) {
  const document = browserWindow?.document ?? root?.ownerDocument;
  if (!root || !document?.createElement || !document?.body) throw new TypeError('Reader navigation requires its mounted root and document.');
  const host = document.createElement('div');
  host.className = 'reader-navigation';host.setAttribute('data-reader-navigation', '');host.setAttribute('data-mobile-panel', mobilePanel === 'sheet' ? 'sheet' : 'full');
  host.innerHTML = `<nav class="reader-rail" aria-label="Main navigation"><button type="button" class="reader-rail-menu reader-rail-button" data-reader-menu aria-label="Open navigation" aria-controls="reader-navigation-panel" aria-expanded="false">${tablerIcon('menu')}</button><button type="button" class="reader-rail-button" data-reader-search aria-label="Search">${tablerIcon('search')}<span class="reader-rail-caption">Search</span></button><span data-reader-map-slot></span><div class="reader-rail-identity"><a href="#/" aria-label="Campaign home" data-reader-identity></a></div><button type="button" class="reader-rail-button reader-rail-key" data-reader-key aria-label="Player key" aria-expanded="false"><span class="reader-key-art">${tablerIcon('key')}</span><span class="reader-rail-caption" data-reader-key-caption>Key</span></button></nav><button type="button" class="reader-navigation-scrim" data-reader-scrim aria-label="Close navigation" hidden></button><aside class="reader-panel" id="reader-navigation-panel" aria-label="Search and Browse" aria-hidden="true" inert><div class="reader-panel-scroll" data-reader-panel-content></div></aside>`;
  (root.querySelector('.dndwiki-shell') ?? root).append(host);
  const rail = host.querySelector('.reader-rail'), panel = host.querySelector('.reader-panel'), menu = host.querySelector('[data-reader-menu]'), scrim = host.querySelector('[data-reader-scrim]');
  const media = browserWindow.matchMedia?.(READER_MOBILE_QUERY) ?? { matches: Number(browserWindow.innerWidth) <= 760 };
  let open = false, interaction = false, signature = '', currentForm = null, offset = 0, previousY = Math.max(0, Number(browserWindow.scrollY) || 0), railHeight = 64, maxScroll = Infinity;
  let observer = null;
  const measure = () => {
    railHeight = Math.max(1, Number(rail.getBoundingClientRect?.().height) || 64);
    maxScroll = Math.max(0, Number(document.documentElement?.scrollHeight ?? 0) - Number(browserWindow.innerHeight ?? 0));
  };
  const translate = () => { rail.style.transform = media.matches ? `translate3d(0,${offset}px,0)` : ''; };
  const reveal = () => { offset = 0;previousY = Math.max(0, Math.min(maxScroll, Number(browserWindow.scrollY) || 0));translate(); };
  const setOpen = (desired, { focus = false } = {}) => {
    open = desired === true;
    host.toggleAttribute('data-open', open);menu.setAttribute('aria-expanded', String(open));menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');menu.innerHTML = tablerIcon(open ? 'x' : 'menu');
    panel.setAttribute('aria-hidden', String(!open));panel.inert = !open;scrim.hidden = !open;
    reveal();
    if (open && focus) currentForm?.querySelector('input[name="query"]')?.focus({ preventScroll: true });
  };
  const openSearch = () => {
    setOpen(true);const input = currentForm?.querySelector('input[name="query"]');input?.focus({ preventScroll: true });
    onSearch?.({ form: currentForm, input });
  };
  const refresh = () => {
    const shell = root.querySelector('.dndwiki-shell') ?? root;
    if (host.parentElement !== shell) shell.append(host);
    const model = readerDirectoryModel({ snapshot, perspective: session?.perspective, hash: browserWindow.location?.hash ?? '#/' });
    const hash = String(browserWindow.location?.hash ?? '#/');
    const next = JSON.stringify([model.title, model.total, model.directory.map((page) => [page.pageId, page.title, page.isMap]), model.categories.map((category) => [category.tag, category.label, category.pages.length]), routeState(hash)]);
    const incoming = root.querySelector('[data-dndwiki-search-form]');
    if (incoming) currentForm = incoming;
    if (next !== signature) {
      signature = next;
      const content = host.querySelector('[data-reader-panel-content]');
      content.innerHTML = panelLinks(model, hash);
      host.querySelector('[data-reader-identity]').textContent = model.title;
      host.querySelector('[data-reader-identity]').setAttribute('aria-label', `${model.title} home`);
      const map = model.directory.find((page) => page.isMap);
      host.querySelector('[data-reader-map-slot]').innerHTML = map
        ? `<a class="reader-rail-button" href="${escapeHtml(map.route)}" aria-label="Map"${routeState(hash).pageId === map.pageId ? ' aria-current="page"' : ''}>${tablerIcon('map')}<span class="reader-rail-caption">Map</span></a>`
        : `<button type="button" class="reader-rail-button" disabled aria-label="Map">${tablerIcon('map')}<span class="reader-rail-caption">Map</span></button>`;
    }
    const searchHost = host.querySelector('[data-reader-search-host]');
    if (currentForm && currentForm.parentElement !== searchHost) searchHost.replaceChildren(currentForm);
    currentForm?.querySelector('input[name="query"]')?.setAttribute('placeholder', `Search ${model.title} wiki`);
    measure();
    return model;
  };
  const onScroll = () => {
    const y = Math.max(0, Math.min(maxScroll, Number(browserWindow.scrollY) || 0));
    if (media.matches && !open && !interaction) { offset = mobileRailOffset(offset, previousY, y, railHeight);translate(); }
    previousY = y;
  };
  const onResize = () => { measure();reveal(); };
  const onClick = (event) => {
    const target = event.target;
    if (target?.closest?.('[data-reader-open-search]')) { event.preventDefault();openSearch();return; }
    if (!host.contains(target)) return;
    if (target.closest('[data-reader-menu]')) { setOpen(!open);return; }
    if (target.closest('[data-reader-search]')) { openSearch();return; }
    if (target.closest('[data-reader-scrim]')) { setOpen(false);menu.focus({ preventScroll: true });return; }
    if (target.closest('[data-reader-key]')) { setOpen(false);reveal();onKey?.({ button: host.querySelector('[data-reader-key]'), event });return; }
    if (target.closest('a[href^="#/"]')) setOpen(false);
  };
  const onKeyDown = (event) => {
    if (event.defaultPrevented) return;
    if (event.key === 'Escape' && open) { event.preventDefault();setOpen(false);menu.focus({ preventScroll: true });return; }
    const typing = event.target?.closest?.('input,textarea,select,[contenteditable="true"]');
    if (!typing && event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey) { event.preventDefault();openSearch(); }
    else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault();openSearch(); }
  };
  const onHashChange = () => { setOpen(false);refresh();reveal(); };
  document.addEventListener('click', onClick);document.addEventListener('keydown', onKeyDown);
  browserWindow.addEventListener('scroll', onScroll, { passive: true });browserWindow.addEventListener('resize', onResize, { passive: true });browserWindow.addEventListener('hashchange', onHashChange);
  media.addEventListener?.('change', onResize);
  if (typeof browserWindow.ResizeObserver === 'function') { observer = new browserWindow.ResizeObserver(measure);observer.observe(document.body);observer.observe(rail); }
  refresh();
  return {
    refresh, setOpen, openSearch, reveal,
    get element() { return host; },
    get keyButton() { return host.querySelector('[data-reader-key]'); },
    setMobilePanel(value) { host.setAttribute('data-mobile-panel', value === 'sheet' ? 'sheet' : 'full'); },
    setInteractionActive(value) { interaction = value === true;if (interaction) reveal(); },
    destroy() { observer?.disconnect();document.removeEventListener('click', onClick);document.removeEventListener('keydown', onKeyDown);browserWindow.removeEventListener('scroll', onScroll);browserWindow.removeEventListener('resize', onResize);browserWindow.removeEventListener('hashchange', onHashChange);media.removeEventListener?.('change', onResize);host.remove(); },
  };
}
