import { parseWikiRoute } from './wiki-shell.mjs';
import { mountReaderNavigation, renderReaderDirectory, visibleReaderDirectory } from './reader-navigation.mjs';
import { mountReaderTimeline } from './reader-timeline.mjs';
import { mountReaderAccess } from './reader-access.mjs';
import { tablerIcon } from './tabler-icons.mjs';

const escapeHtml = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

export function mountCommissionedReader({ root, window: browserWindow, snapshot, mounted, mobilePanel = 'full' }) {
  const { session } = mounted;
  let navigation = null, access = null, timeline = null, queued = false, destroyed = false;
  const enhance = () => {
    if (destroyed) return;
    const shell = root.querySelector('.dndwiki-shell'), main = root.querySelector('.dndwiki-main');
    if (!shell || !main) return;
    shell.classList.add('reader-shell');
    const parsed = parseWikiRoute(browserWindow.location.hash);
    const kind = browserWindow.location.hash.startsWith('#/tag/') ? 'tag' : parsed.kind;
    shell.setAttribute('data-dndwiki-route-kind', kind);
    shell.querySelector('#dndwiki-reader-v47-polish')?.remove();
    const directory = renderReaderDirectory({ snapshot, perspective: session.perspective, hash: browserWindow.location.hash });
    if (directory != null) {
      const signature = `${kind}:${browserWindow.location.hash}:${session.perspective.playerId ?? ''}`;
      if (main.getAttribute('data-reader-directory-signature') !== signature) { main.innerHTML = directory; main.setAttribute('data-reader-directory-signature', signature); }
      browserWindow.document.title = kind === 'home' ? snapshot.campaign.title : `${main.querySelector('h1')?.childNodes?.[0]?.textContent ?? 'Category'} · ${snapshot.campaign.title}`;
    } else if (kind === 'page') {
      const model = session.currentModel, article = main.querySelector('[data-dndwiki-page]');
      if (article && model.page?.status === 'visible' && !main.querySelector('[data-dndwiki-page-header]')) {
        const title = model.page.title ?? snapshot.pages.find(page => page.pageId === model.page.pageId)?.title ?? 'Page';
        const categories = visibleReaderDirectory(snapshot, session.perspective).find(page => page.pageId === model.page.pageId)?.categories ?? [];
        const tags = categories.map(tag => `<a class="dndwiki-tag" href="#/tag/${encodeURIComponent(tag.tag)}">${escapeHtml(tag.label)}</a>`).join('');
        const first = article.querySelector('h1,h2,h3,h4,h5,h6');
        const authoredTitle = first?.tagName === 'H1' && first.textContent.trim().toLocaleLowerCase() === title.toLocaleLowerCase();
        article.insertAdjacentHTML('beforebegin', `<header class="dndwiki-page-header" data-dndwiki-page-header><h1${authoredTitle ? ' class="reader-authored-title" aria-hidden="true"' : ''}>${escapeHtml(title)}</h1>${tags ? `<div class="dndwiki-page-tags">${tags}</div>` : ''}</header>`);
      }
    }
    const sidebar = shell.querySelector('.dndwiki-sidebar');
    if (sidebar) {
      if (main.querySelector('[data-dndwiki-page]')) {
        sidebar.hidden = false; sidebar.id = 'dndwiki-related'; sidebar.setAttribute('data-dndwiki-context-footer', ''); sidebar.setAttribute('data-dndwiki-related-section', ''); sidebar.setAttribute('aria-label', 'Related pages');
        if (sidebar.parentElement !== main) main.append(sidebar);
        if (!sidebar.querySelector('[data-reader-related-title]')) sidebar.insertAdjacentHTML('afterbegin', '<h2 data-reader-related-title>Related</h2>');
        if (!sidebar.querySelector('.dndwiki-card') && !sidebar.querySelector('[data-reader-no-related]')) sidebar.insertAdjacentHTML('beforeend', '<p data-reader-no-related>No related pages yet.</p>');
        for (const heading of sidebar.querySelectorAll('.dndwiki-card h2')) if (heading.textContent === 'Backlinks') heading.textContent = `${session.currentModel.page?.title ?? 'This page'} is mentioned in`;
        const cards = sidebar.querySelectorAll('.dndwiki-card');
        if (cards.length === 1 && cards[0].querySelector('h2')?.textContent.trim() === 'Related') { cards[0].querySelector('h2').remove(); cards[0].removeAttribute('aria-labelledby'); cards[0].setAttribute('aria-label', 'Related pages'); }
        if (!sidebar.querySelector('#dndwiki-related-heading,#dndwiki-links-heading,#dndwiki-backlinks-heading')) sidebar.querySelector('[data-reader-related-title]').id = 'dndwiki-related-heading';
      } else sidebar.hidden = true;
    }
    const filter = root.querySelector('[data-dndwiki-search-filter-toggle]');
    if (filter && !filter.hasAttribute('data-reader-tabler')) { const count = filter.querySelector('[data-dndwiki-search-filter-count]'); filter.replaceChildren(); filter.insertAdjacentHTML('afterbegin', tablerIcon('adjustments-horizontal')); if (count) filter.append(count); filter.setAttribute('data-reader-tabler', ''); }
    const clear = root.querySelector('[data-dndwiki-search-clear]');
    if (clear && !clear.hasAttribute('data-reader-tabler')) { clear.innerHTML = tablerIcon('x'); clear.setAttribute('data-reader-tabler', ''); }
    for (const button of root.querySelectorAll('[data-dndwiki-tag-include],[data-dndwiki-tag-exclude]')) {
      if (button.hasAttribute('data-reader-tabler')) continue;
      button.innerHTML = tablerIcon(button.hasAttribute('data-dndwiki-tag-include') ? 'plus' : 'minus');
      button.setAttribute('data-reader-tabler', '');
    }
    navigation?.refresh();
    if (navigation) shell.querySelector('.dndwiki-topbar')?.remove();
    access?.refresh(); timeline?.refresh();
  };
  const refreshReader = () => { mounted.refresh(); enhance(); };
  enhance();
  navigation = mountReaderNavigation({ root, window: browserWindow, snapshot, session, mobilePanel, onKey: () => access?.toggle() });
  access = mountReaderAccess({ root, window: browserWindow, snapshot, session, navigation, refreshReader, isOtherInteractionActive: () => timeline?.open === true });
  timeline = mountReaderTimeline({ root, window: browserWindow, snapshot, session, mobilePanel, onOpenChange: open => navigation.setInteractionActive(open || access.phase !== 'closed') });
  enhance();
  const observer = typeof browserWindow.MutationObserver === 'function' ? new browserWindow.MutationObserver(records => {
    if (records.every(record => (record.target.nodeType === 1 ? record.target : record.target.parentElement)?.closest?.('.reader-navigation,.reader-timeline,.mapsmith'))) return;
    if (queued || destroyed) return; queued = true;
    queueMicrotask(() => { queued = false; enhance(); });
  }) : null;
  observer?.observe(root, { childList: true, subtree: true });
  const skip = event => { if (!event.target.closest?.('.reader-skip-link')) return; event.preventDefault(); const main = root.querySelector('.dndwiki-main'); if (main) { main.tabIndex = -1; main.focus({ preventScroll: true }); main.scrollIntoView({ block: 'start' }); } };
  browserWindow.document.addEventListener('click', skip);
  return { navigation, access, timeline, refresh: enhance, destroy() { destroyed = true; observer?.disconnect(); browserWindow.document.removeEventListener('click', skip); access.destroy(); timeline.destroy(); navigation.destroy(); } };
}
