import { pageForRoute } from './navigation.mjs';
import { renderMarkdownToHtml } from './markdown-renderer-v2.mjs';
import { mountMapNoteCard } from './mapsmith-note-card.mjs';

const PAGE_ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const HOST_SELECTOR = '[data-dndwiki-mapsmith-page]';
const STYLE_ID = 'dndwiki-mapsmith-reader-style';
const STYLE_LOADS = new WeakMap();
const CSS = `
.dndwiki-mapsmith-host { display:block; width:100%; min-width:0; margin:1.25rem 0; }
.dndwiki-mapsmith-host[hidden] { display:none!important; }
.dndwiki-mapsmith-host > .mapsmith { width:100%; height:auto; min-height:0; aspect-ratio:1/1; }
.mapsmith .mapsmith-note-content.dndwiki-page { width:auto; max-width:100%; margin:0; }
.mapsmith[data-dndwiki-mapsmith-viewer-page] .mapsmith-logo { z-index:19; }
.dndwiki-mapsmith-error { color:var(--text-muted); font-size:.9rem; }
html:has(#dndwiki-app .dndwiki-shell[data-dndwiki-mapsmith-standalone]),
body:has(#dndwiki-app .dndwiki-shell[data-dndwiki-mapsmith-standalone]) { overflow:hidden!important; }
html:has(#dndwiki-app .dndwiki-shell[data-dndwiki-mapsmith-standalone]) .dndwiki-viewport-scrollbar { display:none!important; }
#dndwiki-app .dndwiki-shell[data-dndwiki-mapsmith-standalone] { padding-right:var(--reader-right-space,0px)!important; }
#dndwiki-app .dndwiki-shell[data-dndwiki-mapsmith-standalone] .dndwiki-layout { display:block!important; width:100%!important; max-width:none!important; margin:0!important; padding:0!important; }
#dndwiki-app .dndwiki-shell[data-dndwiki-mapsmith-standalone] .dndwiki-main { width:100%; margin:0!important; padding:0!important; }
#dndwiki-app .dndwiki-shell[data-dndwiki-mapsmith-standalone] .dndwiki-main > [data-dndwiki-page] { width:100%!important; max-width:none!important; margin:0!important; padding:0!important; }
#dndwiki-app .dndwiki-shell[data-dndwiki-mapsmith-standalone] .dndwiki-main > :not([data-dndwiki-page]),
#dndwiki-app .dndwiki-shell[data-dndwiki-mapsmith-standalone] .dndwiki-main > [data-dndwiki-page] > :not([data-dndwiki-mapsmith-primary]),
#dndwiki-app .dndwiki-shell[data-dndwiki-mapsmith-standalone] .dndwiki-reading-progress { display:none!important; }
.dndwiki-mapsmith-host[data-dndwiki-mapsmith-mode="standalone"] { position:fixed; z-index:1; top:var(--dndwiki-mapsmith-header-height,0px); bottom:var(--reader-bottom-space,0px); left:var(--dndwiki-mapsmith-pane-left,var(--reader-left-space,0px)); right:var(--reader-right-space,0px); width:auto; height:auto; margin:0!important; }
.dndwiki-mapsmith-host[data-dndwiki-mapsmith-mode="standalone"] > .mapsmith { height:100%; min-height:0; aspect-ratio:auto; border:0; border-radius:0; }
`;

export function mapsmithAudienceVisible(audience, perspective) {
  if (audience?.public === true) return true;
  return audience?.public === false
    && Array.isArray(audience.playerIds)
    && perspective?.kind === 'player'
    && Array.isArray(perspective.playerIds)
    && audience.playerIds.some((id) => perspective.playerIds.includes(id));
}

function visiblePage(snapshot, perspective, pageId) {
  if (!PAGE_ID_RE.test(String(pageId ?? ''))) return null;
  try {
    const view = pageForRoute(snapshot, perspective, pageId);
    return view.status === 'visible' ? view : null;
  } catch { return null; }
}

export function mapsmithAssetPath(path) {
  if (typeof path !== 'string' || !/^assets\/[A-Za-z0-9._/-]+$/.test(path)) return null;
  return path.split('/').some((part) => !part || part === '.' || part === '..') ? null : path;
}

/** Project every map surface through the same active perspective as wiki pages. */
export function mapsmithForPerspective(snapshot, perspective, pageId) {
  const view = visiblePage(snapshot, perspective, pageId);
  const descriptor = snapshot?.pages?.find((page) => page.pageId === pageId)?.mapsmith;
  if (view == null || descriptor?.schemaVersion !== 1
    || !mapsmithAudienceVisible(descriptor.audience, perspective)
    || descriptor.map?.version !== 1 || descriptor.map.image == null || typeof descriptor.map.image !== 'object'
    || !Array.isArray(descriptor.map.pins) || !Array.isArray(descriptor.map.assets)
    || (descriptor.map.regions != null && !Array.isArray(descriptor.map.regions))
    || (descriptor.map.connections != null && !Array.isArray(descriptor.map.connections))) return null;

  const map = structuredClone(descriptor.map);
  if (map.assets.some((asset) => typeof asset?.key !== 'string' || mapsmithAssetPath(asset.path) == null)) return null;
  const projectItem = (item, unlinkedAllowed = false) => {
    if (!mapsmithAudienceVisible(item?.audience, perspective)) return [];
    if (item.note !== '' || !unlinkedAllowed) {
      if (visiblePage(snapshot, perspective, item.note) == null) return [];
    }
    const { audience: _audience, ...projected } = item;
    return [projected];
  };
  map.pins = map.pins.flatMap((item) => projectItem(item));
  map.regions = (map.regions ?? []).flatMap((item) => projectItem(item, true));
  const regions = new Map(map.regions.map((region) => [region.id, region]));
  map.connections = (map.connections ?? []).filter((connection) => {
    if (connection == null || !Array.isArray(connection.nodes)) return false;
    const a = regions.get(connection.a), b = regions.get(connection.b);
    if (a == null || b == null || !regions.has(connection.owner)) return false;
    const pointsA = new Set((Array.isArray(a.points) ? a.points : []).map((point) => point?.id));
    const pointsB = new Set((Array.isArray(b.points) ? b.points : []).map((point) => point?.id));
    return (connection.nodes ?? []).every((node) => pointsA.has(node) && pointsB.has(node));
  });
  // Authoring-only labels and manifest source names are never reader controls.
  delete map.manifest;
  delete map.boundaryTags;
  map.image.sourceName = '';
  return { pageId, title: view.title ?? 'Map', map };
}

function installStyles(document) {
  if (STYLE_LOADS.has(document)) return STYLE_LOADS.get(document);
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.append(style);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('./mapsmith.css', import.meta.url).href;
  const loaded = new Promise((resolve, reject) => {
    link.addEventListener('load', resolve, { once: true });
    link.addEventListener('error', () => reject(Error('Map styles could not be loaded.')), { once: true });
  });
  STYLE_LOADS.set(document, loaded);
  document.head.append(link);
  return loaded;
}

/** MapViewer owns its interaction lifecycle; dndwiki owns all content admission. */
export function mountMapsmithReader({ root, window: browserWindow, snapshot, session,
  loadViewer = () => import('./mapsmith-viewer.mjs'),
  notePreviews,
} = {}) {
  const document = browserWindow?.document;
  if (root == null || document?.body == null || session == null) return { destroy() {} };
  const entries = new Map();
  let viewerModule, queued = false, destroyed = false, frame = 0;
  let measuredHeader = null;
  const headerObserver = typeof browserWindow.ResizeObserver === 'function' ? new browserWindow.ResizeObserver(() => schedule()) : null;
  const settledLayout = () => new Promise((resolve) => browserWindow.requestAnimationFrame(() => browserWindow.requestAnimationFrame(resolve)));
  const perspectiveKey = () => JSON.stringify(session.perspective);
  const remove = (owner, entry) => {
    entries.delete(owner);
    entry.viewer?.destroy();
  };
  const renderNote = async (item, element) => {
    const view = visiblePage(snapshot, session.perspective, item.note);
    element.replaceChildren();
    if (view == null) return;
    notePreviews?.close();
    return mountMapNoteCard(element,{title:view.title??'Location',html:renderMarkdownToHtml(view.markdown),window:browserWindow});
  };
  const start = async (owner, entry, projected) => {
    try {
      viewerModule ??= Promise.resolve(loadViewer());
      const [{ MapViewer }] = await Promise.all([viewerModule, installStyles(document)]);
      // The shell adds its title/category chrome after its initial article render.
      await settledLayout();
      if (destroyed || entries.get(owner) !== entry || !owner.isConnected
        || entry.perspective !== perspectiveKey()) return;
      const assetsByKey = new Map(projected.map.assets.map((asset) => [asset.key, asset.path]));
      const assets = new Set(projected.map.assets.map((asset) => asset.path));
      const url = (path) => {
        if (!assets.has(path) || mapsmithAssetPath(path) == null) throw Error('Map artwork is unavailable.');
        return new URL(path, document.baseURI).href;
      };
      const viewer = new MapViewer(owner, projected.map, projected.map.image, {
        title: projected.title,
        controlBounds:'viewport',
        tileUrl: (key) => url(assetsByKey.get(key)),
        resourceUrl: url,
        renderNote,
        hoverNote: (item, _event, anchor) => {
          const href = item.note.startsWith('#/page/') ? item.note : `#/page/${item.note}`;
          notePreviews?.showForAnchor(anchor,href);
        },
        fullscreen: {
          available:document.fullscreenEnabled===true&&typeof owner.requestFullscreen==='function',
          request: async (element, expanded) => {
            if (expanded) {
              if (typeof element.requestFullscreen !== 'function') throw Error('Fullscreen is unavailable in this browser.');
              await element.requestFullscreen();
            } else if (document.fullscreenElement === element) await document.exitFullscreen();
          },
          active: (element) => document.fullscreenElement === element,
        },
        noteTitle: (item) => visiblePage(snapshot, session.perspective, item.note)?.title ?? 'Location',
        openNote: (item) => {
          const view = visiblePage(snapshot, session.perspective, item.note);
          if (view != null) browserWindow.open(new URL(view.route, document.baseURI).href, '_blank', 'noopener');
        },
      }, !entry.standalone);
      entry.viewer = viewer;
      viewer.root.setAttribute('data-dndwiki-mapsmith-viewer-page', projected.pageId);
      await viewer.ready;
      // The shared viewer fits its camera after the measured layout has settled.
      await settledLayout();
      if (entries.get(owner) === entry) owner.setAttribute('data-dndwiki-mapsmith-state', 'ready');
    } catch {
      if (destroyed || entries.get(owner) !== entry || !owner.isConnected) return;
      entry.viewer?.destroy();
      entry.viewer = null;
      owner.classList.add('dndwiki-mapsmith-error');
      owner.textContent = 'This map could not be loaded.';
      owner.setAttribute('data-dndwiki-mapsmith-state', 'error');
    }
  };
  const sync = () => {
    frame = 0; queued = false;
    if (destroyed) return;
    const perspective = session.perspective, key = perspectiveKey();
    const shell = root.querySelector('.dndwiki-shell');
    const header = shell?.querySelector('.dndwiki-topbar');
    if (header !== measuredHeader) { headerObserver?.disconnect(); measuredHeader = header; if (header) headerObserver?.observe(header); }
    const current = session.currentModel;
    const article = shell?.querySelector('.dndwiki-main > [data-dndwiki-page]');
    const ownPageId = current?.route?.kind === 'page' && current.page?.status === 'visible' ? current.page.pageId : null;
    const primary = mapsmithForPerspective(snapshot, perspective, ownPageId) == null ? null
      : [...(article?.querySelectorAll(HOST_SELECTOR) ?? [])].find((owner) => owner.getAttribute('data-dndwiki-mapsmith-page') === ownPageId && owner.closest('.mapsmith') == null);
    shell?.toggleAttribute('data-dndwiki-mapsmith-standalone', primary != null);
    if (primary) {
      const height = `${header?.getBoundingClientRect().height ?? 0}px`;
      if (shell.style.getPropertyValue('--dndwiki-mapsmith-header-height') !== height) shell.style.setProperty('--dndwiki-mapsmith-header-height', height);
      const left = browserWindow.getComputedStyle(shell).paddingLeft;
      if (shell.style.getPropertyValue('--dndwiki-mapsmith-pane-left') !== left) shell.style.setProperty('--dndwiki-mapsmith-pane-left', left);
    }
    for (const previous of root.querySelectorAll('[data-dndwiki-mapsmith-primary]')) if (previous !== primary) previous.removeAttribute('data-dndwiki-mapsmith-primary');
    primary?.setAttribute('data-dndwiki-mapsmith-primary', '');
    for (const [owner, entry] of [...entries]) {
      if (!owner.isConnected || entry.perspective !== key || entry.standalone !== (owner === primary)) remove(owner, entry);
    }
    for (const owner of document.querySelectorAll(HOST_SELECTOR)) {
      const standalone = owner === primary;
      owner.setAttribute('data-dndwiki-mapsmith-mode', standalone ? 'standalone' : 'embedded');
      if (entries.has(owner)) continue;
      const pageId = owner.getAttribute('data-dndwiki-mapsmith-page');
      const projected = mapsmithForPerspective(snapshot, perspective, pageId);
      owner.hidden = projected == null;
      if (projected == null) continue;
      // A circular authored embed remains an ordinary navigable page link.
      let ancestor = owner.parentElement, circular = false;
      while (ancestor != null) {
        if (ancestor.getAttribute('data-dndwiki-mapsmith-viewer-page') === pageId) { circular = true; break; }
        ancestor = ancestor.parentElement;
      }
      if (circular) {
        if (owner.querySelector('a') == null) {
          const link = document.createElement('a'); link.href = `#/page/${pageId}`;
          link.textContent = projected.title; owner.append(link);
        }
        continue;
      }
      const entry = { perspective: key, standalone, viewer: null };
      entries.set(owner, entry);
      owner.setAttribute('data-dndwiki-mapsmith-state', 'loading');
      void start(owner, entry, projected);
    }
  };
  const schedule = () => {
    if (destroyed || queued) return;
    queued = true;
    frame = browserWindow.requestAnimationFrame(sync);
  };
  const observer = new browserWindow.MutationObserver(schedule);
  // Includes note-preview cards and expanded maps, both hosted outside root.
  observer.observe(document.body, { childList: true, subtree: true });
  browserWindow.addEventListener('hashchange', schedule);
  browserWindow.addEventListener('resize', schedule);
  sync();
  return { destroy() {
    destroyed = true; observer.disconnect(); headerObserver?.disconnect();
    browserWindow.removeEventListener('hashchange', schedule);
    browserWindow.removeEventListener('resize', schedule);
    if (frame) browserWindow.cancelAnimationFrame(frame);
    for (const [owner, entry] of [...entries]) remove(owner, entry);
  } };
}
