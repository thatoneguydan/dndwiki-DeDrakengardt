const STYLE_ID = 'dndwiki-tag-taxonomy-styles';

const TAXONOMY_CSS = `
.dndwiki-taxonomy-children {
  list-style:none;
  margin:.18rem 0 .35rem .95rem;
  padding:0 0 0 .55rem;
  display:grid;
  gap:.08rem;
  border-left:1px solid var(--background-modifier-border);
}
.dndwiki-taxonomy-child-link {
  min-height:30px;
  font-size:.76rem;
}
.dndwiki-taxonomy-child-link .dndwiki-primary-nav-tag-dot {
  width:.48rem;
  height:.48rem;
}
.dndwiki-tag-breadcrumb {
  display:flex;
  align-items:center;
  gap:.35rem;
  margin:.65rem 0 0;
  color:var(--text-muted);
  font-size:.78rem;
}
.dndwiki-tag-breadcrumb a { color:inherit; }
.dndwiki-tag-subcategories {
  margin-top:1rem;
}
.dndwiki-tag-subcategories h2 {
  margin:0 0 .6rem;
  color:var(--text-muted);
  font-size:.78rem;
  font-weight:700;
  letter-spacing:.04em;
  text-transform:uppercase;
}
.dndwiki-tag-subcategories-list {
  list-style:none;
  margin:0;
  padding:0;
  display:flex;
  flex-wrap:wrap;
  gap:.45rem;
}
.dndwiki-tag-subcategory {
  display:inline-flex;
  align-items:center;
  gap:.4rem;
  min-height:34px;
  padding:.34rem .62rem;
  border:1px solid var(--background-modifier-border);
  border-radius:999px;
  color:var(--text-muted);
  background:var(--background-primary);
  text-decoration:none;
}
.dndwiki-tag-subcategory:hover { color:var(--text-normal); background:var(--background-modifier-hover); text-decoration:none; }
@media (max-width:860px) {
  .dndwiki-taxonomy-child-link { min-height:44px; }
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

function cloneTag(tag) {
  return tag == null ? null : structuredClone(tag);
}

function sortByName(records) {
  return [...records].sort((a, b) => a.tag.name.localeCompare(b.tag.name, 'en-US', { sensitivity: 'base', numeric: true }));
}

export function buildTagTaxonomy(pages) {
  const roots = new Map();
  const childParents = new Map();

  for (const page of pages ?? []) {
    if (typeof page?.pageId !== 'string' || !Array.isArray(page.tags) || page.tags.length === 0) continue;
    const rootTag = page.tags[0];
    const rootKey = normalize(rootTag?.name);
    if (rootKey.length === 0) continue;

    let root = roots.get(rootKey);
    if (root == null) {
      root = { tag: cloneTag(rootTag), pageIds: new Set(), children: new Map() };
      roots.set(rootKey, root);
    }
    root.pageIds.add(page.pageId);

    const childTag = page.tags[1];
    const childKey = normalize(childTag?.name);
    if (childKey.length === 0 || childKey === rootKey) continue;
    let child = root.children.get(childKey);
    if (child == null) {
      child = { tag: cloneTag(childTag), pageIds: new Set() };
      root.children.set(childKey, child);
    }
    child.pageIds.add(page.pageId);
    const parents = childParents.get(childKey) ?? new Set();
    parents.add(rootKey);
    childParents.set(childKey, parents);
  }

  for (const [rootKey, root] of roots) {
    for (const childKey of [...root.children.keys()]) {
      if ((childParents.get(childKey)?.size ?? 0) > 1) root.children.delete(childKey);
    }
    root.children = new Map(sortByName(root.children.values()).map((record) => [normalize(record.tag.name), record]));
    roots.set(rootKey, root);
  }

  return new Map(sortByName(roots.values()).map((record) => [normalize(record.tag.name), record]));
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
    if (taxonomy.has(key)) return { kind: 'tag', tag, rootKey: key, childKey: null };
    for (const [rootKey, root] of taxonomy) {
      if (root.children.has(key)) return { kind: 'tag', tag, rootKey, childKey: key };
    }
    return { kind: 'tag', tag, rootKey: null, childKey: null };
  }

  const pageMatch = /^#\/page\/([a-z0-9][a-z0-9._-]{0,63})/.exec(String(hash ?? ''));
  if (pageMatch) {
    const page = snapshot?.pages?.find((record) => record?.pageId === pageMatch[1]);
    const rootKey = normalize(page?.tags?.[0]?.name);
    const childKey = normalize(page?.tags?.[1]?.name);
    return {
      kind: 'page',
      tag: null,
      rootKey: taxonomy.has(rootKey) ? rootKey : null,
      childKey: taxonomy.get(rootKey)?.children?.has(childKey) ? childKey : null,
    };
  }
  return { kind: 'home', tag: null, rootKey: null, childKey: null };
}

function tagAccentStyle(tag) {
  const accent = safeColor(tag?.backgroundColor) || safeColor(tag?.borderColor) || safeColor(tag?.color);
  return accent ? `--tag-nav-color:${accent}` : '';
}

function rootNavigationItems(taxonomy, state) {
  return [...taxonomy.entries()].map(([rootKey, root]) => {
    const active = state.rootKey === rootKey;
    const style = tagAccentStyle(root.tag);
    const children = active && root.children.size > 0
      ? `<ul class="dndwiki-taxonomy-children">${[...root.children.entries()].map(([childKey, child]) => {
          const childStyle = tagAccentStyle(child.tag);
          return `<li><a class="dndwiki-primary-nav-link dndwiki-primary-nav-tag-link dndwiki-taxonomy-child-link" href="${escapeHtml(tagRoute(child.tag.name))}"${state.childKey === childKey ? ' aria-current="page"' : ''}><span class="dndwiki-primary-nav-tag-name"><span class="dndwiki-primary-nav-tag-dot"${childStyle ? ` style="${escapeHtml(childStyle)}"` : ''}></span><span>${escapeHtml(child.tag.name)}</span></span><span class="dndwiki-primary-nav-badge">${child.pageIds.size}</span></a></li>`;
        }).join('')}</ul>`
      : '';
    return `<li><a class="dndwiki-primary-nav-link dndwiki-primary-nav-tag-link" href="${escapeHtml(tagRoute(root.tag.name))}"${state.kind === 'tag' && state.childKey == null && active ? ' aria-current="page"' : ''}><span class="dndwiki-primary-nav-tag-name"><span class="dndwiki-primary-nav-tag-dot"${style ? ` style="${escapeHtml(style)}"` : ''}></span><span>${escapeHtml(root.tag.name)}</span></span><span class="dndwiki-primary-nav-badge">${root.pageIds.size}</span></a>${children}</li>`;
  }).join('');
}

function rewriteDesktopNavigation(root, taxonomy, state) {
  const nav = root?.querySelector?.('[data-dndwiki-primary-nav]');
  if (nav == null || nav.hasAttribute?.('data-dndwiki-taxonomy-applied')) return;
  const sections = [...(nav.querySelectorAll?.(':scope > .dndwiki-primary-nav-section') ?? [])];
  const categorySection = sections.find((section) => section.querySelector?.('.dndwiki-primary-nav-heading')?.textContent?.trim() === 'Categories');
  if (categorySection != null) {
    categorySection.innerHTML = taxonomy.size === 0
      ? ''
      : `<p class="dndwiki-primary-nav-heading">Browse</p><ul class="dndwiki-primary-nav-list">${rootNavigationItems(taxonomy, state)}</ul>`;
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
    heading.textContent = 'Browse';
    if (list?.classList?.contains('dndwiki-primary-nav-list')) list.innerHTML = rootNavigationItems(taxonomy, state);
  }
  mobile.setAttribute?.('data-dndwiki-taxonomy-applied', '');
}

function rewriteHome(root, taxonomy) {
  const home = root?.querySelector?.('[data-dndwiki-home]');
  if (home == null || home.hasAttribute?.('data-dndwiki-taxonomy-applied')) return;
  const heading = home.querySelector?.('#dndwiki-home-categories-heading');
  const list = home.querySelector?.('.dndwiki-home-categories');
  if (heading != null) heading.textContent = 'Browse the wiki';
  if (list != null) {
    list.innerHTML = [...taxonomy.values()].map((rootRecord) => {
      const style = [
        safeColor(rootRecord.tag?.color) && `--tag-fg:${safeColor(rootRecord.tag.color)}`,
        safeColor(rootRecord.tag?.backgroundColor) && `--tag-bg:${safeColor(rootRecord.tag.backgroundColor)}`,
        safeColor(rootRecord.tag?.borderColor) && `--tag-border:${safeColor(rootRecord.tag.borderColor)}`,
      ].filter(Boolean).join(';');
      return `<li><a class="dndwiki-home-category" href="${escapeHtml(tagRoute(rootRecord.tag.name))}"${style ? ` style="${escapeHtml(style)}"` : ''}><span>${escapeHtml(rootRecord.tag.name)}</span><span class="dndwiki-home-category-count">${rootRecord.pageIds.size}</span></a></li>`;
    }).join('');
  }
  const sectionHead = heading?.closest?.('.dndwiki-home-section-head');
  const count = sectionHead?.querySelector?.('span');
  if (count != null) count.textContent = `${taxonomy.size} categor${taxonomy.size === 1 ? 'y' : 'ies'}`;
  home.setAttribute?.('data-dndwiki-taxonomy-applied', '');
}

function rewriteTagPage(root, taxonomy, state) {
  const page = root?.querySelector?.('[data-dndwiki-tag-page]');
  if (page == null || page.hasAttribute?.('data-dndwiki-taxonomy-applied')) return;

  if (state.rootKey == null) {
    page.innerHTML = '<div class="dndwiki-tag-hero"><p class="dndwiki-tag-kicker">Category</p><h1>Category unavailable</h1><p class="dndwiki-home-intro">This tag is not part of the player-facing browse hierarchy.</p></div>';
    page.setAttribute?.('data-dndwiki-taxonomy-applied', '');
    return;
  }

  const rootRecord = taxonomy.get(state.rootKey);
  const hero = page.querySelector?.('.dndwiki-tag-hero');
  if (state.childKey != null && hero != null) {
    hero.insertAdjacentHTML?.('beforeend', `<p class="dndwiki-tag-breadcrumb"><a href="${escapeHtml(tagRoute(rootRecord.tag.name))}">${escapeHtml(rootRecord.tag.name)}</a><span aria-hidden="true">›</span><span>${escapeHtml(rootRecord.children.get(state.childKey)?.tag?.name ?? state.tag)}</span></p>`);
  } else if (hero != null && rootRecord.children.size > 0) {
    hero.insertAdjacentHTML?.('afterend', `<section class="dndwiki-tag-subcategories"><h2>Within ${escapeHtml(rootRecord.tag.name)}</h2><ul class="dndwiki-tag-subcategories-list">${[...rootRecord.children.values()].map((child) => `<li><a class="dndwiki-tag-subcategory" href="${escapeHtml(tagRoute(child.tag.name))}"><span>${escapeHtml(child.tag.name)}</span><span class="dndwiki-home-category-count">${child.pageIds.size}</span></a></li>`).join('')}</ul></section>`);
  }
  page.setAttribute?.('data-dndwiki-taxonomy-applied', '');
}

function ensureStyles(document) {
  if (document?.getElementById?.(STYLE_ID) != null) return;
  const style = document?.createElement?.('style');
  if (style == null) return;
  style.id = STYLE_ID;
  style.textContent = TAXONOMY_CSS;
  document.head?.append?.(style);
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
    const pages = visiblePages(snapshot, root);
    if (pages.length === 0 && root.querySelector?.('[data-dndwiki-primary-nav]') == null) return;
    const taxonomy = buildTagTaxonomy(pages);
    const state = currentState(snapshot, taxonomy, browserWindow.location?.hash ?? '');
    rewriteDesktopNavigation(root, taxonomy, state);
    rewriteMobileNavigation(root, taxonomy, state);
    rewriteHome(root, taxonomy);
    rewriteTagPage(root, taxonomy, state);
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

  return {
    destroy() {
      observer?.disconnect?.();
      browserWindow.removeEventListener?.('hashchange', schedule);
    },
  };
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  const root = document.getElementById('dndwiki-app');
  mountTagTaxonomyChrome({ root, window }).catch((error) => console.error('dndwiki tag taxonomy enhancement failed.', error));
}
