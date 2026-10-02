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
.dndwiki-note-preview-header {
  display: flex; align-items: center; gap: .75rem; flex: 0 0 auto;
  padding: .65rem .85rem .65rem 1.15rem;
  border-bottom: 1px solid var(--background-modifier-border);
  font-family: var(--font-interface); font-size: 15px;
}
.dndwiki-note-preview-header > a {
  flex: 1; min-width: 0; color: var(--text-normal); font-weight: 650;
  line-height: 1.4; text-decoration: none; overflow-wrap: anywhere;
}
.dndwiki-note-preview-header > a:hover { color: var(--text-accent); }
.dndwiki-note-preview-close {
  display: grid; place-items: center; width: 32px; height: 32px; min-height: 32px;
  flex: 0 0 auto; padding: 0; border: 0; border-radius: 6px; box-shadow: none;
  background: transparent; color: var(--text-muted); font-size: 22px; cursor: pointer;
}
.dndwiki-note-preview-close:hover { background: var(--background-modifier-hover); color: var(--text-normal); }
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

export function mountNoteLinkPreviews({ root, window: browserWindow, snapshot, session } = {}) {
  const document = browserWindow?.document;
  if (root == null || document?.body == null || session == null) return { close() {}, destroy() {} };
  if (document.getElementById(STYLE_ID) == null) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.append(style);
  }

  const panel = document.createElement('aside');
  panel.className = 'dndwiki-note-preview';
  panel.setAttribute('data-dndwiki-note-preview', '');
  panel.setAttribute('role', 'region');
  panel.hidden = true;
  document.body.append(panel);
  let anchor = null;
  let openTimer = 0;
  let closeTimer = 0;
  let destroyed = false;
  let dismissedAnchor = null;

  const clearTimers = () => {
    browserWindow.clearTimeout(openTimer);
    browserWindow.clearTimeout(closeTimer);
    openTimer = closeTimer = 0;
  };
  const close = () => {
    clearTimers();
    panel.hidden = true;
    panel.replaceChildren();
    anchor = null;
  };
  const position = () => {
    if (panel.hidden || anchor?.isConnected !== true) return;
    const rect = anchor.getBoundingClientRect();
    const width = panel.offsetWidth;
    const height = panel.offsetHeight;
    const margin = 12;
    let left = rect.right + margin;
    let top = rect.top - 12;
    if (left + width > browserWindow.innerWidth - margin) {
      if (rect.left - width - margin >= margin) left = rect.left - width - margin;
      else {
        left = rect.left;
        top = rect.bottom + 8;
        if (top + height > browserWindow.innerHeight - margin && rect.top - height - 8 >= margin) top = rect.top - height - 8;
      }
    }
    panel.style.left = `${Math.max(margin, Math.min(left, browserWindow.innerWidth - width - margin))}px`;
    panel.style.top = `${Math.max(margin, Math.min(top, browserWindow.innerHeight - height - margin))}px`;
  };
  const open = () => {
    openTimer = 0;
    if (destroyed || anchor?.isConnected !== true) return;
    // Re-read the live perspective at opening time, never a cached public view.
    const preview = notePreviewForLink(snapshot, session.perspective, anchor.getAttribute('href'));
    if (preview == null) { close(); return; }
    panel.setAttribute('aria-label', `${preview.title} preview`);
    panel.innerHTML = `<header class="dndwiki-note-preview-header"><a href="${escapeHtml(preview.route)}">${escapeHtml(preview.title)}</a><button type="button" class="dndwiki-note-preview-close" aria-label="Close preview">×</button></header><div class="dndwiki-shell" data-dndwiki-note-preview-scroll tabindex="0" aria-label="Note preview body"><article class="dndwiki-page" data-dndwiki-note-preview-body>${preview.html}</article></div>`;
    panel.hidden = false;
    position();
    const scroll = panel.querySelector('[data-dndwiki-note-preview-scroll]');
    scroll.scrollTop = 0;
    if (preview.heading) {
      const heading = [...panel.querySelectorAll('h1,h2,h3,h4,h5,h6')].find((node) => node.textContent.trim().toLocaleLowerCase('en-US') === preview.heading.trim().toLocaleLowerCase('en-US'));
      if (heading) scroll.scrollTop = heading.getBoundingClientRect().top - scroll.getBoundingClientRect().top;
    }
  };
  const linkFor = (target) => {
    const link = target?.closest?.('a[href]');
    if (!link || !root.contains(link) || link.closest('[data-dndwiki-page-outline]')) return null;
    return /^#\/page\/([a-z0-9][a-z0-9-]{0,63})(?:#.*)?$/.test(link.getAttribute('href')) ? link : null;
  };
  const showSoon = (link) => {
    if (link === dismissedAnchor) return;
    browserWindow.clearTimeout(closeTimer);
    closeTimer = 0;
    if (anchor === link && (!panel.hidden || openTimer)) return;
    close();
    anchor = link;
    openTimer = browserWindow.setTimeout(open, 220);
  };
  const leaveSoon = () => {
    browserWindow.clearTimeout(openTimer);
    openTimer = 0;
    browserWindow.clearTimeout(closeTimer);
    closeTimer = browserWindow.setTimeout(() => {
      closeTimer = 0;
      if (panel.matches(':hover') || panel.contains(document.activeElement) || anchor === document.activeElement) return;
      close();
    }, 220);
  };
  const onPointerOver = (event) => {
    if (event.pointerType === 'touch') return;
    if (panel.contains(event.target)) {
      browserWindow.clearTimeout(closeTimer);
      closeTimer = 0;
      return;
    }
    if (browserWindow.matchMedia?.('(any-hover: hover)').matches === false) return;
    const link = linkFor(event.target);
    if (link) showSoon(link);
  };
  const onPointerOut = (event) => {
    const link = linkFor(event.target);
    if (link?.contains(event.relatedTarget)) return;
    if (panel.contains(event.relatedTarget) || anchor?.contains(event.relatedTarget)) return;
    if (link === dismissedAnchor) dismissedAnchor = null;
    if (link === anchor || panel.contains(event.target)) leaveSoon();
  };
  const onFocusIn = (event) => {
    if (panel.contains(event.target)) {
      browserWindow.clearTimeout(closeTimer);
      closeTimer = 0;
      return;
    }
    const link = linkFor(event.target);
    if (link) showSoon(link);
    else leaveSoon();
  };
  const onFocusOut = (event) => {
    if (panel.contains(event.relatedTarget) || anchor?.contains(event.relatedTarget)) return;
    dismissedAnchor = null;
    leaveSoon();
  };
  const onKeyDown = (event) => {
    if (event.key !== 'Escape' || panel.hidden) return;
    dismissedAnchor = anchor;
    const returnFocus = panel.contains(document.activeElement);
    const source = anchor;
    close();
    if (returnFocus && source?.isConnected) source.focus({ preventScroll: true });
  };
  const onClick = (event) => {
    if (event.target?.closest?.('.dndwiki-note-preview-close')) {
      dismissedAnchor = anchor;
      const source = anchor;
      close();
      if (source?.isConnected) source.focus({ preventScroll: true });
    } else if (event.target?.closest?.('a[href]')) close();
  };
  const onRootMutation = () => {
    if (anchor?.isConnected === false) close();
  };
  const observer = typeof browserWindow.MutationObserver === 'function'
    ? new browserWindow.MutationObserver(onRootMutation) : null;
  observer?.observe(root, { childList: true, subtree: true });
  const onScroll = () => { if (!panel.hidden) position(); };
  document.addEventListener('pointerover', onPointerOver);
  document.addEventListener('pointerout', onPointerOut);
  document.addEventListener('focusin', onFocusIn);
  document.addEventListener('focusout', onFocusOut);
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('click', onClick);
  browserWindow.addEventListener('hashchange', close, true);
  browserWindow.addEventListener('scroll', onScroll, { passive: true });
  browserWindow.addEventListener('resize', position, { passive: true });
  return {
    close,
    destroy() {
      destroyed = true;
      close();
      observer?.disconnect();
      panel.remove();
      document.removeEventListener('pointerover', onPointerOver);
      document.removeEventListener('pointerout', onPointerOut);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('click', onClick);
      browserWindow.removeEventListener('hashchange', close, true);
      browserWindow.removeEventListener('scroll', onScroll);
      browserWindow.removeEventListener('resize', position);
    },
  };
}
