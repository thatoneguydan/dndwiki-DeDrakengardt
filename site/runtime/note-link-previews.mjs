import { pageForRoute } from './navigation.mjs';
import { renderMarkdownToHtml, escapeHtml } from './markdown-renderer-v2.mjs';

const STYLE_ID = 'dndwiki-note-link-preview-styles';
const CSS = `
.dndwiki-note-preview {
  position: fixed; z-index: 1000; display: flex; flex-direction: column;
  width: min(600px, calc(100vw - 24px)); max-height: min(620px, calc(100dvh - 24px));
  overflow: hidden; border: 1px solid var(--background-modifier-border);
  border-radius: 12px; background: var(--background-primary); color: var(--text-normal);
  box-shadow: 0 12px 36px rgb(0 0 0 / .16); isolation: isolate;
}
.dndwiki-note-preview[hidden] { display: none !important; }
.dndwiki-note-preview > .dndwiki-note-preview-header {
  display: flex; align-items: center; flex-wrap:nowrap; gap: .75rem; flex: 0 0 auto;
  padding: .65rem .85rem .65rem 1.15rem;
  border-bottom: 1px solid var(--background-modifier-border);
  font-family: var(--font-interface); font-size: 15px;
}
.dndwiki-note-preview > .dndwiki-note-preview-header > a {
  flex: 1; min-width: 0; color: var(--text-normal); font-weight: 650;
  line-height: 1.4; text-decoration: none; overflow-wrap: anywhere;
}
.dndwiki-note-preview-header > a:hover { color: var(--text-accent); }
.dndwiki-note-preview-actions { display:flex; align-items:center; flex:0 0 auto; gap:4px; }
.dndwiki-note-preview .dndwiki-note-preview-close {
  display: grid; place-items: center; width: 32px; height: 32px; min-height: 32px;
  flex: 0 0 auto; padding: 0; border: 0; border-radius: 6px; box-shadow: none;
  background: transparent; color: var(--text-muted); font-size: 22px; cursor: pointer;
}
.dndwiki-note-preview .dndwiki-note-preview-close:hover { background: var(--background-modifier-hover); color: var(--text-normal); }
.dndwiki-note-preview > .dndwiki-shell {
  display: block; flex: 1 1 auto; min-height: 0; width: auto; margin: 0; padding: 0;
  overflow-x: hidden; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin;
  background: transparent;
}
.dndwiki-note-preview .dndwiki-page {
  box-sizing: border-box; width: 100%; max-width: 100%; min-height: 0;
  margin: 0; padding: 1.15rem 1.35rem 1.5rem;
}
.dndwiki-note-preview :focus-visible { outline: 2px solid var(--interactive-accent); outline-offset: -2px; }
`;

export function notePreviewForLink(snapshot, perspective, href) {
  const match = /^#\/page\/([a-z0-9][a-z0-9-]{0,63})(?:#(.*))?$/.exec(String(href ?? ''));
  if (match == null) return null;
  const view = pageForRoute(snapshot, perspective, match[1]);
  if (view.status !== 'visible') return null;
  let heading = null;
  try { heading = match[2] == null ? null : decodeURIComponent(match[2]); } catch { /* Start at the title for malformed fragments. */ }
  return { title: view.title ?? 'Page', route: view.route, heading, html: renderMarkdownToHtml(view.markdown) };
}


/**
 * Each hover depth owns its own fixed-position card. They are appended to
 * document.body (not nested DOM), preserving the document's scrollWidth.
 * There is intentionally no maximum depth: A -> B -> C -> A can continue.
 */
export function mountNoteLinkPreviews({ root, window: browserWindow, snapshot, session } = {}) {
  const document = browserWindow?.document;
  if (root == null || document?.body == null || session == null) return { close() {}, destroy() {} };
  if (document.getElementById(STYLE_ID) == null) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.append(style);
  }

  const panels = [];
  let pending = null;
  let pendingTimer = 0;
  let closeTimer = 0;
  let positionFrame = 0;
  const dismissedAnchors = new WeakMap();
  let pointerPosition = null;
  let pointerVersion = 0;
  let fullscreenOwner = null;
  let destroyed = false;

  const rememberPointer = (event) => {
    if(!event.isTrusted || event.pointerType === 'touch') return;
    if(!pointerPosition || pointerPosition.x !== event.clientX || pointerPosition.y !== event.clientY) {
      pointerPosition = {x:event.clientX,y:event.clientY};
      pointerVersion++;
    }
  };

  const cancelPending = () => {
    browserWindow.clearTimeout(pendingTimer);
    pendingTimer = 0;
    pending = null;
  };
  const cancelClosing = () => {
    browserWindow.clearTimeout(closeTimer);
    closeTimer = 0;
  };
  const closeFrom = (depth) => {
    if (pending?.depth >= depth) cancelPending();
    while (panels.length > depth) panels.pop().element.remove();
  };
  const close = () => {
    cancelClosing();
    cancelPending();
    closeFrom(0);
    fullscreenOwner = null;
  };
  const interactionFloor = () => fullscreenOwner && document.fullscreenElement
    ? Math.max(0,panels.indexOf(fullscreenOwner)+1) : 0;
  const closeTransient = () => {
    const floor=interactionFloor();
    if(!floor){close();return;}
    cancelClosing();cancelPending();closeFrom(floor);
  };

  const previewHref = (anchor) => anchor?.getAttribute('data-dndwiki-note-preview-href') ?? anchor?.getAttribute('href');
  const linkInfo = (target) => {
    const link = target?.closest?.('a[href],[data-dndwiki-note-preview-href]');
    if (!link || link.closest('[data-dndwiki-page-outline]')) return null;
    const href = previewHref(link);
    if (!/^#\/page\/[a-z0-9][a-z0-9-]{0,63}(?:#.*)?$/.test(String(href ?? ''))) return null;
    // Only authored/body links nest. Header title links still navigate.
    // Check owned panels before the reader root: fullscreen map previews live
    // inside that root, but must retain their recursive parent depth.
    for (let i = panels.length - 1; i >= 0; i--) {
      if (panels[i].element.contains(link)) return link.closest('[data-dndwiki-note-preview-body]') ? { link, depth: i + 1 } : null;
    }
    if (root.contains(link)) return { link, depth: 0 };
    // A browser-fullscreen map may be hosted outside the ordinary reader root.
    if (link.closest('.mapsmith[data-dndwiki-mapsmith-viewer-page]')) return { link, depth:0 };
    return null;
  };
  const inInteraction = (target) => target != null && (
    panels.slice(interactionFloor()).some(({ element, anchor }) => element.contains(target) || anchor?.contains?.(target))
    || pending?.link?.contains?.(target) === true
  );

  const positionOne = (entry) => {
    const { element, anchor } = entry;
    if (anchor?.isConnected !== true) { closeFrom(panels.indexOf(entry)); return; }
    const rect = anchor.getBoundingClientRect();
    const width = element.offsetWidth;
    const height = element.offsetHeight;
    const margin = 12;
    const viewportWidth = Number(browserWindow.innerWidth) || document.documentElement.clientWidth;
    const viewportHeight = Number(browserWindow.innerHeight) || document.documentElement.clientHeight;
    let left = rect.right + margin;
    let top = rect.top - 12;

    if (left + width > viewportWidth - margin) {
      // Never flip to the left and create new horizontal space. On the right
      // boundary, keep the nested card below its hovered link.
      left = rect.left;
      top = rect.bottom + 8;
      if (top + height > viewportHeight - margin) {
        if (rect.top - height - 8 >= margin) top = rect.top - height - 8;
        else top = Math.max(margin, viewportHeight - height - margin);
      }
    }
    element.style.left = Math.max(margin, Math.min(left, viewportWidth - width - margin)) + 'px';
    element.style.top = Math.max(margin, Math.min(top, viewportHeight - height - margin)) + 'px';
  };
  const positionAll = () => {
    positionFrame = 0;
    for (const entry of [...panels]) {
      if (!panels.includes(entry)) break;
      positionOne(entry);
    }
  };
  const schedulePosition = () => {
    if (positionFrame) return;
    positionFrame = browserWindow.requestAnimationFrame(positionAll);
  };

  const open = ({ link, depth }) => {
    if (destroyed || link?.isConnected !== true) return;
    const preview = notePreviewForLink(snapshot, session.perspective, previewHref(link));
    if (preview == null) { closeFrom(depth); return; }
    closeFrom(depth);

    const panel = document.createElement('aside');
    panel.className = 'dndwiki-note-preview';
    panel.setAttribute('data-dndwiki-note-preview', '');
    panel.setAttribute('data-dndwiki-note-preview-depth', String(depth));
    panel.setAttribute('aria-label', preview.title + ' preview');
    panel.setAttribute('role', 'region');
    panel.style.zIndex = String(1000 + depth);
    panel.innerHTML = '<header class="dndwiki-note-preview-header"><a href="'
      + escapeHtml(preview.route) + '">' + escapeHtml(preview.title)
      + '</a><div class="dndwiki-note-preview-actions"><button type="button" class="dndwiki-note-preview-close" aria-label="Close preview">×</button></div></header>'
      + '<div class="dndwiki-shell" data-dndwiki-note-preview-scroll tabindex="0" aria-label="Note preview body">'
      + '<article class="dndwiki-page" data-dndwiki-note-preview-body>' + preview.html + '</article></div>';
    // Fullscreen's top layer excludes body siblings; keep recursive cards in
    // that same layer when their source is a fullscreen map.
    (document.fullscreenElement?.contains(link) ? document.fullscreenElement : document.body).append(panel);
    const entry = { anchor: link, element: panel };
    panels.push(entry);
    positionOne(entry);
    const scroller = panel.querySelector('[data-dndwiki-note-preview-scroll]');
    scroller.scrollTop = 0;
    if (preview.heading) {
      const heading = [...panel.querySelectorAll('h1,h2,h3,h4,h5,h6')]
        .find((node) => node.textContent.trim().toLocaleLowerCase('en-US') === preview.heading.trim().toLocaleLowerCase('en-US'));
      if (heading) scroller.scrollTop = heading.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
    }
  };
  const showSoon = ({ link, depth }) => {
    if (dismissedAnchors.has(link)) return;
    cancelClosing();
    if (panels[depth]?.anchor === link && pending == null) return;
    if (pending?.link === link && pending.depth === depth) return;
    cancelPending();
    closeFrom(depth);
    pending = { link, depth };
    pendingTimer = browserWindow.setTimeout(() => {
      pendingTimer = 0;
      const next = pending;
      pending = null;
      if (next) open(next);
    }, 220);
  };
  const leaveSoon = () => {
    cancelPending();
    cancelClosing();
    closeTimer = browserWindow.setTimeout(() => {
      closeTimer = 0;
      if (panels.slice(interactionFloor()).some(({ element, anchor }) => element.matches(':hover') || element.contains(document.activeElement) || anchor === document.activeElement)) return;
      closeTransient();
    }, 220);
  };

  const onPointerOver = (event) => {
    if (event.pointerType === 'touch' || browserWindow.matchMedia?.('(any-hover: hover)').matches === false) return;
    rememberPointer(event);
    const info = linkInfo(event.target);
    if (info) {
      // Closing returns keyboard focus to the source. Keep that restoration
      // and a stationary underlay reveal quiet, but honor the first real new
      // pointer entry instead of requiring an extra leave/re-enter cycle.
      if(event.isTrusted && !info.link.contains(event.relatedTarget) && dismissedAnchors.has(info.link) && pointerVersion > dismissedAnchors.get(info.link)) dismissedAnchors.delete(info.link);
      showSoon(info);
    }
    else if (inInteraction(event.target)) cancelClosing();
  };
  const onPointerOut = (event) => {
    const info = linkInfo(event.target);
    if (info?.link?.contains?.(event.relatedTarget)) return;
    if (info?.link) dismissedAnchors.delete(info.link);
    if (inInteraction(event.relatedTarget)) { cancelClosing(); return; }
    if (inInteraction(event.target)) leaveSoon();
  };
  const onFocusIn = (event) => {
    const info = linkInfo(event.target);
    if (info) showSoon(info);
    else if (inInteraction(event.target)) cancelClosing();
    else leaveSoon();
  };
  const onFocusOut = (event) => {
    const info=linkInfo(event.target);
    if(info?.link && !info.link.contains(event.relatedTarget)) dismissedAnchors.delete(info.link);
    if (inInteraction(event.relatedTarget)) return;
    leaveSoon();
  };
  const onKeyDown = (event) => {
    if (event.key !== 'Escape' || panels.length <= interactionFloor()) return;
    const depth = panels.length - 1;
    const entry = panels[depth];
    dismissedAnchors.set(entry.anchor,pointerVersion);
    cancelClosing();
    const returnFocus = entry.element.contains(document.activeElement);
    closeFrom(depth);
    if (returnFocus && entry.anchor?.isConnected) entry.anchor.focus({ preventScroll: true });
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  const onClick = (event) => {
    const closeButton = event.target?.closest?.('.dndwiki-note-preview-close');
    if (closeButton) {
      const depth = panels.findLastIndex(({ element }) => element.contains(closeButton));
      if (depth >= 0) {
        const source = panels[depth].anchor;
        dismissedAnchors.set(source,pointerVersion);
        cancelClosing();
        closeFrom(depth);
        if (source?.isConnected) source.focus({ preventScroll: true });
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    } else if (event.target?.closest?.('a[href]')) close();
  };
  const onPointerDown = (event) => { rememberPointer(event);if(!inInteraction(event.target)) closeTransient(); };
  const onFullscreenChange = () => {
    const fullscreen = document.fullscreenElement;
    const owner = fullscreen
      ? panels.findLastIndex(({element}) => element.contains(fullscreen))
      : panels.indexOf(fullscreenOwner);
    if(owner < 0) { close(); return; }
    // A map embedded in a preview needs that ancestor to stay connected.
    // Remove only newer cards; removing its owner would detach the native
    // fullscreen element and force the browser to exit fullscreen at once.
    cancelClosing();cancelPending();
    fullscreenOwner = fullscreen ? panels[owner] : null;
    closeFrom(owner + 1);
  };
  const onRootMutation = () => {
    const missingIndex = panels.findIndex(({ anchor }) => anchor?.isConnected !== true);
    if (missingIndex >= 0) closeFrom(missingIndex);
    if (pending?.link?.isConnected === false) cancelPending();
  };
  const observer = typeof browserWindow.MutationObserver === 'function'
    ? new browserWindow.MutationObserver(onRootMutation) : null;
  observer?.observe(root, { childList: true, subtree: true });

  document.addEventListener('pointerover', onPointerOver);
  document.addEventListener('pointerout', onPointerOut);
  document.addEventListener('pointermove', rememberPointer, {capture:true,passive:true});
  document.addEventListener('focusin', onFocusIn);
  document.addEventListener('focusout', onFocusOut);
  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('pointerdown', onPointerDown, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('scroll', schedulePosition, true);
  browserWindow.addEventListener('hashchange', close, true);
  document.addEventListener('fullscreenchange',onFullscreenChange);
  browserWindow.addEventListener('resize', schedulePosition, { passive: true });

  return {
    close,
    showForAnchor(anchor,href) {
      if (!anchor?.isConnected || notePreviewForLink(snapshot,session.perspective,href) == null) return;
      anchor.setAttribute('data-dndwiki-note-preview-href',href);
      const info=linkInfo(anchor);
      if(info)showSoon(info);
    },
    destroy() {
      destroyed = true;
      close();
      if (positionFrame) browserWindow.cancelAnimationFrame(positionFrame);
      observer?.disconnect();
      document.removeEventListener('pointerover', onPointerOver);
      document.removeEventListener('pointerout', onPointerOut);
      document.removeEventListener('pointermove', rememberPointer, true);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('scroll', schedulePosition, true);
      browserWindow.removeEventListener('hashchange', close, true);
      document.removeEventListener('fullscreenchange',onFullscreenChange);
      browserWindow.removeEventListener('resize', schedulePosition);
    },
  };
}
