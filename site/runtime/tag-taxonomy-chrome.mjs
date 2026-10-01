const STYLE_ID = 'dndwiki-tag-taxonomy-styles';

const TAXONOMY_CSS = `
.dndwiki-tag-breadcrumb {
  display:flex;
  align-items:center;
  gap:.35rem;
  margin:.65rem 0 0;
  color:var(--text-muted);
  font-size:.78rem;
}
.dndwiki-tag-breadcrumb a { color:inherit; }

@media (max-width:980px) {
  #dndwiki-app .dndwiki-shell .dndwiki-topbar {
    min-height:60px !important;
    grid-template-columns:44px minmax(0,1fr) auto !important;
    grid-template-areas:"brand search access" !important;
    align-items:center !important;
    gap:.45rem !important;
    padding-block:.42rem !important;
  }
  #dndwiki-app .dndwiki-shell .dndwiki-brand {
    grid-area:brand !important;
    width:44px !important;
    min-width:44px !important;
    height:44px !important;
    min-height:44px !important;
    padding:0 !important;
    gap:0 !important;
    align-self:center !important;
    align-items:center !important;
    justify-content:center !important;
  }
  #dndwiki-app .dndwiki-shell .dndwiki-topbar .dndwiki-brand > [data-dndwiki-browse-trigger] {
    position:relative !important;
    width:44px !important;
    height:44px !important;
    min-width:44px !important;
    min-height:44px !important;
    display:block !important;
    margin:0 !important;
    padding:0 !important;
    font-size:0 !important;
    line-height:0 !important;
  }
  #dndwiki-app .dndwiki-shell .dndwiki-topbar .dndwiki-brand > [data-dndwiki-browse-trigger]::before {
    content:'' !important;
    position:absolute !important;
    left:50% !important;
    top:50% !important;
    display:block !important;
    width:18px !important;
    height:14px !important;
    margin:0 !important;
    border:0 !important;
    border-radius:0 !important;
    background:
      linear-gradient(currentColor,currentColor) top / 18px 2px no-repeat,
      linear-gradient(currentColor,currentColor) center / 18px 2px no-repeat,
      linear-gradient(currentColor,currentColor) bottom / 18px 2px no-repeat !important;
    transform:translate(-50%,-50%) !important;
  }
  #dndwiki-app .dndwiki-shell .dndwiki-search {
    grid-area:search !important;
    width:100% !important;
    min-width:0 !important;
    max-width:none !important;
    display:grid !important;
    grid-template-columns:minmax(0,1fr) auto !important;
    align-items:center !important;
    align-self:center !important;
    gap:.35rem !important;
    margin:0 !important;
  }
  #dndwiki-app .dndwiki-shell .dndwiki-search label {
    display:block !important;
    min-width:0 !important;
    height:44px !important;
    line-height:0 !important;
  }
  #dndwiki-app .dndwiki-shell .dndwiki-search input {
    display:block !important;
    height:44px !important;
    min-height:44px !important;
  }
  #dndwiki-app .dndwiki-shell .dndwiki-search > button[type="submit"] {
    height:44px !important;
    min-height:44px !important;
    display:inline-flex !important;
    align-items:center !important;
    justify-content:center !important;
    padding-inline:.72rem !important;
  }
  #dndwiki-app .dndwiki-shell .dndwiki-access {
    grid-area:access !important;
  }
  #dndwiki-app .dndwiki-shell .dndwiki-search-results {
    top:64px !important;
  }
  #dndwiki-app .dndwiki-shell .dndwiki-primary-nav {
    width:min(21rem,calc(100vw - .65rem)) !important;
    height:100vh !important;
    height:100dvh !important;
    max-height:100vh !important;
    max-height:100dvh !important;
    overflow-x:hidden !important;
    overflow-y:auto !important;
    overscroll-behavior-x:none !important;
    overscroll-behavior-y:contain !important;
    touch-action:pan-y !important;
    -webkit-overflow-scrolling:touch;
    padding:0 .65rem 1rem !important;
  }
  #dndwiki-app .dndwiki-shell .dndwiki-browse-panel-head {
    min-height:60px !important;
    margin-inline:-.65rem !important;
    padding:.62rem .7rem !important;
  }
  #dndwiki-app .dndwiki-shell .dndwiki-browse-panel-title {
    font-size:.9rem !important;
    line-height:1.2 !important;
  }
  #dndwiki-app .dndwiki-shell .dndwiki-browse-close {
    width:40px !important;
    height:40px !important;
    min-width:40px !important;
    min-height:40px !important;
  }
  #dndwiki-app .dndwiki-shell .dndwiki-browse-filter {
    top:60px !important;
    margin:0 0 .55rem !important;
    padding:.55rem 0 !important;
  }
  #dndwiki-app .dndwiki-shell .dndwiki-browse-filter input {
    min-height:42px !important;
    padding:.42rem .65rem !important;
    border-radius:9px !important;
    font-size:.82rem !important;
  }
  #dndwiki-app .dndwiki-shell .dndwiki-primary-nav-section + .dndwiki-primary-nav-section {
    margin-top:.5rem !important;
    padding-top:.5rem !important;
  }
  #dndwiki-app .dndwiki-shell .dndwiki-primary-nav-heading {
    margin:.15rem .38rem .3rem !important;
    font-size:.64rem !important;
    letter-spacing:.065em !important;
  }
  #dndwiki-app .dndwiki-shell .dndwiki-primary-nav-list {
    gap:.08rem !important;
  }
  #dndwiki-app .dndwiki-shell .dndwiki-primary-nav-link,
  #dndwiki-app .dndwiki-shell .dndwiki-primary-nav-details > summary {
    min-height:42px !important;
    padding:.42rem .5rem !important;
    border-radius:8px !important;
    font-size:.8rem !important;
    line-height:1.25 !important;
  }
  #dndwiki-app .dndwiki-shell .dndwiki-primary-nav-badge {
    font-size:.66rem !important;
  }
  #dndwiki-app .dndwiki-shell .dndwiki-player-key-icon,
  #dndwiki-app .dndwiki-shell .dndwiki-nav-icon,
  #dndwiki-app .dndwiki-shell .dndwiki-nav-summary-icon {
    width:1rem !important;
    height:1rem !important;
    flex:0 0 1rem !important;
  }
  #dndwiki-app .dndwiki-shell .dndwiki-key-popover {
    font-size:.8rem !important;
  }
}

@media (max-width:560px) {
  #dndwiki-app .dndwiki-shell .dndwiki-topbar {
    grid-template-columns:44px minmax(0,1fr) !important;
    grid-template-areas:"brand search" !important;
    padding-inline:.7rem !important;
  }
  #dndwiki-app .dndwiki-shell .dndwiki-topbar > .dndwiki-access {
    display:none !important;
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

function safeColor(value) {
  const color = String(value ?? '').trim();
  if (color.length === 0 || color.length > 256 || /[;{}<>"']/.test(color)) return '';
  const css = globalThis.CSS;
  if (typeof css?.supports === 'function') return css.supports('color', color) ? color : '';
  return /^(?:#[0-9a-f]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\)|(?:ok)?lch\([^)]*\)|(?:ok)?lab\([^)]*\)|color\([^)]*\)|transparent|[a-z]+)$/i.test(color) ? color : '';
}

function tagRoute(name) {
  return `#/tag/${encodeURIComponent(String(name ?? '').trim().replace(/^#+/, ''))}`;
}

function normalize(value) {
  return String(value ?? '').trim().replace(/^#+/, '').toLocaleLowerCase('en-US');
}

function cloneCategory(category) {
  if (category == null) return null;
  return {
    name: String(category.label ?? category.tag ?? '').trim(),
    sourceTag: String(category.tag ?? '').trim().replace(/^#+/, ''),
    ...Object.fromEntries(['color', 'backgroundColor', 'borderColor']
      .filter((field) => String(category?.[field] ?? '').trim().length > 0)
      .map((field) => [field, category[field]])),
  };
}

function legacyCategories(page) {
  if (!Array.isArray(page?.tags)) return [];
  return page.tags.slice(0, 2).map((tag) => ({
    tag: tag?.name,
    label: tag?.name,
    ...Object.fromEntries(['color', 'backgroundColor', 'borderColor']
      .filter((field) => String(tag?.[field] ?? '').trim().length > 0)
      .map((field) => [field, tag[field]])),
  }));
}

function sortByName(records) {
  return [...records].sort((a, b) => a.tag.name.localeCompare(b.tag.name, 'en-US', { sensitivity: 'base', numeric: true }));
}

export function buildTagTaxonomy(pages, { legacyTags = false, categoryOrder = [] } = {}) {
  const roots = new Map();
  for (const page of pages ?? []) {
    if (typeof page?.pageId !== 'string') continue;
    const categories = Array.isArray(page.categories)
      ? page.categories
      : (legacyTags ? legacyCategories(page) : []);
    for (const category of categories) {
      const key = normalize(category?.tag);
      const tag = cloneCategory(category);
      if (key.length === 0 || tag == null || tag.name.length === 0) continue;
      let root = roots.get(key);
      if (root == null) {
        root = { tag, pageIds: new Set(), children: new Map() };
        roots.set(key, root);
      }
      root.pageIds.add(page.pageId);
    }
  }
  const ranks = new Map(categoryOrder.map((category, index) => [normalize(category?.tag), index]));
  const ordered = sortByName(roots.values()).sort((a, b) =>
    (ranks.get(normalize(a.tag.sourceTag)) ?? Infinity) - (ranks.get(normalize(b.tag.sourceTag)) ?? Infinity));
  return new Map(ordered.map((record) => [normalize(record.tag.sourceTag), record]));
}

function visiblePageIds(root) {
  const ids = new Set();
  for (const anchor of root?.querySelectorAll?.('.dndwiki-primary-nav-details a[href^="#/page/"]') ?? []) {
    const match = /^#\/page\/([a-z0-9][a-z0-9._-]{0,63})/.exec(anchor.getAttribute?.('href') ?? '');
    if (match) ids.add(match[1]);
  }
  return ids;
}

function visiblePages(snapshot, root) {
  const ids = visiblePageIds(root);
  return (snapshot?.pages ?? []).filter((page) => ids.has(page?.pageId));
}

function currentState(snapshot, taxonomy, hash) {
  const tagMatch = /^#\/tag\/(.+)$/.exec(String(hash ?? ''));
  if (tagMatch) {
    let tag = '';
    try { tag = decodeURIComponent(tagMatch[1]); } catch { tag = ''; }
    const key = normalize(tag);
    return { kind: 'tag', tag, rootKey: taxonomy.has(key) ? key : null, childKey: null };
  }

  const pageMatch = /^#\/page\/([a-z0-9][a-z0-9._-]{0,63})/.exec(String(hash ?? ''));
  if (pageMatch) {
    const page = snapshot?.pages?.find((record) => record?.pageId === pageMatch[1]);
    const rootKey = normalize(page?.categories?.[0]?.tag ?? (snapshot?.browse == null ? page?.tags?.[0]?.name : ''));
    return {
      kind: 'page',
      tag: null,
      rootKey: taxonomy.has(rootKey) ? rootKey : null,
      childKey: null,
      pageId: pageMatch[1],
    };
  }
  return { kind: 'home', tag: null, rootKey: null, childKey: null, pageId: null };
}

function tagAccentStyle(tag) {
  const accent = safeColor(tag?.backgroundColor) || safeColor(tag?.borderColor) || safeColor(tag?.color);
  return accent ? `--tag-nav-color:${accent}` : '';
}

function rootNavigationItems(taxonomy, state) {
  return [...taxonomy.entries()].map(([rootKey, root]) => {
    const active = state.rootKey === rootKey;
    const style = tagAccentStyle(root.tag);
    return `<li><a class="dndwiki-primary-nav-link dndwiki-primary-nav-tag-link" href="${escapeHtml(tagRoute(root.tag.sourceTag))}"${state.kind === 'tag' && active ? ' aria-current="page"' : ''}><span class="dndwiki-primary-nav-tag-name"><span class="dndwiki-primary-nav-tag-dot"${style ? ` style="${escapeHtml(style)}"` : ''}></span><span>${escapeHtml(root.tag.name)}</span></span><span class="dndwiki-primary-nav-badge">${root.pageIds.size}</span></a></li>`;
  }).join('');
}

function rewriteDesktopNavigation(root, taxonomy, state) {
  const nav = root?.querySelector?.('[data-dndwiki-primary-nav]');
  if (nav == null || nav.hasAttribute?.('data-dndwiki-taxonomy-applied')) return;
  const sections = [...(nav.querySelectorAll?.(':scope > .dndwiki-primary-nav-section') ?? [])];
  const categorySection = sections.find((section) => section.querySelector?.('.dndwiki-primary-nav-heading')?.textContent?.trim() === 'Categories');
  if (categorySection != null) {
    if (taxonomy.size === 0) categorySection.remove?.();
    else categorySection.innerHTML = `<p class="dndwiki-primary-nav-heading">Browse</p><ul class="dndwiki-primary-nav-list">${rootNavigationItems(taxonomy, state)}</ul>`;
  } else if (taxonomy.size > 0) {
    const homeSection = sections[0];
    homeSection?.insertAdjacentHTML?.('afterend', `<section class="dndwiki-primary-nav-section"><p class="dndwiki-primary-nav-heading">Browse</p><ul class="dndwiki-primary-nav-list">${rootNavigationItems(taxonomy, state)}</ul></section>`);
  }
  nav.setAttribute?.('data-dndwiki-taxonomy-applied', '');
}

function rewriteMobileNavigation(root, taxonomy, state) {
  const mobile = root?.querySelector?.('[data-dndwiki-mobile-browse]');
  if (mobile == null || mobile.hasAttribute?.('data-dndwiki-taxonomy-applied')) return;
  const body = mobile.querySelector?.('.dndwiki-mobile-browse-body');
  if (body == null) return;
  const heading = [...(body.querySelectorAll?.('.dndwiki-primary-nav-heading') ?? [])].find((record) => record.textContent?.trim() === 'Categories');
  if (heading != null) {
    const list = heading.nextElementSibling;
    if (taxonomy.size === 0) {
      list?.remove?.();
      heading.remove?.();
    } else {
      heading.textContent = 'Browse';
      if (list?.classList?.contains('dndwiki-primary-nav-list')) list.innerHTML = rootNavigationItems(taxonomy, state);
    }
  }
  mobile.setAttribute?.('data-dndwiki-taxonomy-applied', '');
}

function categoryStyle(tag) {
  return [
    safeColor(tag?.color) && `--tag-fg:${safeColor(tag.color)}`,
    safeColor(tag?.backgroundColor) && `--tag-bg:${safeColor(tag.backgroundColor)}`,
    safeColor(tag?.borderColor) && `--tag-border:${safeColor(tag.borderColor)}`,
  ].filter(Boolean).join(';');
}

function rewriteHome(root, taxonomy) {
  const home = root?.querySelector?.('[data-dndwiki-home]');
  if (home == null || home.hasAttribute?.('data-dndwiki-taxonomy-applied')) return;
  const heading = home.querySelector?.('#dndwiki-home-categories-heading');
  const list = home.querySelector?.('.dndwiki-home-categories');
  if (heading != null) heading.textContent = 'Explore the world';
  if (list != null) {
    list.innerHTML = [...taxonomy.values()].map((rootRecord) => {
      const style = categoryStyle(rootRecord.tag);
      return `<li><a class="dndwiki-home-category" href="${escapeHtml(tagRoute(rootRecord.tag.sourceTag))}"${style ? ` style="${escapeHtml(style)}"` : ''}><span>${escapeHtml(rootRecord.tag.name)}</span><span class="dndwiki-home-category-count">${rootRecord.pageIds.size}</span></a></li>`;
    }).join('');
    const section = list.closest?.('.dndwiki-home-section');
    if (taxonomy.size === 0) section?.remove?.();
  }
  const sectionHead = heading?.closest?.('.dndwiki-home-section-head');
  const count = sectionHead?.querySelector?.('span');
  if (count != null) count.remove?.();
  home.setAttribute?.('data-dndwiki-taxonomy-applied', '');
}

function polishHome(root) {
  const home = root?.querySelector?.('[data-dndwiki-home]');
  if (home == null) return;
  home.querySelector?.('.dndwiki-home-browse')?.remove?.();
  home.querySelector?.('.dndwiki-home-stat')?.remove?.();
  home.querySelector?.('.dndwiki-home-directory-meta')?.remove?.();
}

function rewriteTagPage(root, taxonomy, state) {
  const page = root?.querySelector?.('[data-dndwiki-tag-page]');
  if (page == null || page.hasAttribute?.('data-dndwiki-taxonomy-applied')) return;

  if (state.rootKey == null) {
    page.innerHTML = '<div class="dndwiki-tag-hero"><p class="dndwiki-tag-kicker">Category</p><h1>Category unavailable</h1><p class="dndwiki-home-intro">This tag is not a player-facing category.</p></div>';
    page.setAttribute?.('data-dndwiki-taxonomy-applied', '');
    return;
  }

  const record = taxonomy.get(state.rootKey);
  const hero = page.querySelector?.('.dndwiki-tag-hero');
  const heading = hero?.querySelector?.('h1');
  if (heading != null) heading.textContent = record.tag.name;
  hero?.querySelector?.('.dndwiki-page-tags')?.remove?.();
  page.setAttribute?.('data-dndwiki-taxonomy-applied', '');
}

function polishPageTags(root, taxonomy, snapshot, state) {
  if (state.kind !== 'page') return;
  const pageRecord = snapshot?.pages?.find((page) => page?.pageId === state.pageId);
  const categories = new Map((pageRecord?.categories ?? []).map((category) => [normalize(category.tag), category]));
  for (const link of root?.querySelectorAll?.('[data-dndwiki-page-header] .dndwiki-tag') ?? []) {
    const key = normalize(link.textContent);
    if (categories.has(key)) {
      link.setAttribute?.('href', tagRoute(categories.get(key).tag));
      continue;
    }
    if (String(link.tagName ?? '').toLocaleLowerCase('en-US') !== 'a') continue;
    const replacement = root.ownerDocument?.createElement?.('span');
    if (replacement == null) continue;
    replacement.className = link.className;
    replacement.textContent = link.textContent;
    const style = link.getAttribute?.('style');
    if (style) replacement.setAttribute?.('style', style);
    link.replaceWith?.(replacement);
  }

  const breadcrumbs = root?.querySelector?.('[data-dndwiki-page-breadcrumbs]');
  if (breadcrumbs != null) {
    const crumbs = ['<a href="#/">Home</a>'];
    for (const category of pageRecord?.categories ?? []) {
      const key = normalize(category.tag);
      const taxonomyRecord = taxonomy.get(key);
      if (taxonomyRecord == null) continue;
      crumbs.push('<span class="dndwiki-page-breadcrumbs-separator" aria-hidden="true">›</span>');
      crumbs.push(`<a href="${escapeHtml(tagRoute(category.tag))}">${escapeHtml(category.label)}</a>`);
    }
    const nextBreadcrumbs = crumbs.join('');
    if (breadcrumbs.innerHTML !== nextBreadcrumbs) breadcrumbs.innerHTML = nextBreadcrumbs;
  }
}

function ensureStyles(document) {
  let style = document?.getElementById?.(STYLE_ID) ?? null;
  if (style == null) {
    style = document?.createElement?.('style');
    if (style == null) return;
    style.id = STYLE_ID;
  }
  if (style.textContent !== TAXONOMY_CSS) style.textContent = TAXONOMY_CSS;
  if (document?.head != null && document.head.lastElementChild !== style) document.head.append?.(style);
}

export async function mountTagTaxonomyChrome({ root, window: browserWindow, fetchImpl = browserWindow?.fetch?.bind(browserWindow), snapshotUrl = './dndwiki.snapshot.json' } = {}) {
  if (root == null || browserWindow == null || typeof fetchImpl !== 'function') return { destroy() {} };
  ensureStyles(browserWindow.document);
  const response = await fetchImpl(snapshotUrl, { cache: 'no-store' });
  if (response == null || response.ok !== true || typeof response.json !== 'function') return { destroy() {} };
  const snapshot = await response.json();

  let queued = false;
  const apply = () => {
    queued = false;
    ensureStyles(browserWindow.document);
    const pages = visiblePages(snapshot, root);
    if (pages.length === 0 && root.querySelector?.('[data-dndwiki-primary-nav]') == null) return;
    const taxonomy = buildTagTaxonomy(pages, { legacyTags: snapshot?.browse == null, categoryOrder: snapshot?.browse?.categories ?? [] });
    const state = currentState(snapshot, taxonomy, browserWindow.location?.hash ?? '');
    rewriteDesktopNavigation(root, taxonomy, state);
    rewriteMobileNavigation(root, taxonomy, state);
    rewriteHome(root, taxonomy);
    polishHome(root);
    rewriteTagPage(root, taxonomy, state);
    polishPageTags(root, taxonomy, snapshot, state);
  };
  const schedule = () => {
    if (queued) return;
    queued = true;
    queueMicrotask(apply);
  };

  schedule();
  const observer = typeof browserWindow.MutationObserver === 'function'
    ? new browserWindow.MutationObserver(schedule)
    : null;
  observer?.observe?.(root, { childList: true, subtree: true });
  browserWindow.addEventListener?.('hashchange', schedule);
  browserWindow.addEventListener?.('resize', schedule);

  return {
    destroy() {
      observer?.disconnect?.();
      browserWindow.removeEventListener?.('hashchange', schedule);
      browserWindow.removeEventListener?.('resize', schedule);
    },
  };
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  const root = document.getElementById('dndwiki-app');
  mountTagTaxonomyChrome({ root, window }).catch((error) => console.error('dndwiki tag taxonomy enhancement failed.', error));
}
