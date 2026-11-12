import { tablerIcon } from './tabler-icons.mjs';
import { visibleReaderDirectory, readerDirectoryModel } from './reader-navigation.mjs';

const escapeHtml = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// Labels may move to make room. Markers always retain their document position.
export function spreadTimelineLabels(positions, height, gap = 32) {
  if (!positions.length) return [];
  const spacing = Math.min(gap, Math.max(14, height / positions.length));
  const labels = positions.map((position, index) => Math.max(position, index ? positions[index - 1] + spacing : 0));
  for (let index = 1; index < labels.length; index++) labels[index] = Math.max(labels[index], labels[index - 1] + spacing);
  if (labels.at(-1) > height) labels[labels.length - 1] = height;
  for (let index = labels.length - 2; index >= 0; index--) labels[index] = Math.min(labels[index], labels[index + 1] - spacing);
  if (labels[0] < 0) return labels.map((_, index) => positions.length === 1 ? height / 2 : index * height / (positions.length - 1));
  return labels;
}

export function timelineScrollMetrics({ scrollY, documentHeight, viewportHeight, trackHeight }) {
  const height = Math.max(1, documentHeight), maximum = Math.max(0, height - viewportHeight);
  const thumbHeight = Math.min(trackHeight, Math.max(28, viewportHeight / height * trackHeight));
  return { maximum, thumbHeight, thumbTop: maximum ? clamp(scrollY / maximum, 0, 1) * (trackHeight - thumbHeight) : 0 };
}

export function timelineLabelsNeedScroll(count, trackHeight) {
  return count * 32 > Math.max(0, trackHeight - 28);
}

function remember(window, key, value) {
  try { if (value === undefined) return window.localStorage.getItem(key); window.localStorage.setItem(key, value); } catch { /* Optional preference storage. */ }
  return null;
}

export function mountReaderTimeline({ root, window: browserWindow, snapshot, session, mobilePanel = 'full', onOpenChange = () => {} }) {
  const document = browserWindow.document;
  const preference = `dndwiki:${snapshot.campaign.id}:outline-open`;
  let rail = null, signature = '', open = remember(browserWindow, preference) === 'open';
  let records = [], frame = 0, dragging = null, destroyed = false, resizeObserver = null;
  const pageRoute = () => /^(#\/page\/[^#]+)/.exec(browserWindow.location.hash)?.[1] ?? '#/';
  const updateSpace = () => {
    document.documentElement.style.setProperty('--reader-right-space', browserWindow.innerWidth <= 760 ? '28px' : open ? '310px' : '56px');
  };
  const setOpen = value => {
    open = Boolean(value); rail?.classList.toggle('is-open', open);
    rail?.setAttribute('data-reader-mobile-panel', mobilePanel);
    const button = rail?.querySelector('[data-reader-outline-toggle]');
    button?.setAttribute('aria-expanded', String(open));
    button?.setAttribute('aria-label', open ? 'Collapse page headings' : 'Expand page headings');
    if (button) button.innerHTML = tablerIcon(open ? 'chevron-right' : 'chevron-left');
    remember(browserWindow, preference, open ? 'open' : 'closed'); updateSpace(); schedule();
    onOpenChange(open);
  };
  function collect() {
    const article = root.querySelector('[data-dndwiki-page]');
    const heading = root.querySelector('[data-dndwiki-page-header] h1');
    if (!article || !heading) return [];
    const route = pageRoute(), title = heading.textContent.trim();
    const result = [{ title, level: 1, target: heading, titleLink: true, href: route }];
    const headings = [...article.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(target => !target.closest('.mapsmith'));
    headings.forEach((target, index) => {
      if (target.hasAttribute('data-dndwiki-outline-contract-sentinel')) return;
      const text = target.textContent.trim();
      if (!text || (index === 0 && text.toLocaleLowerCase() === title.toLocaleLowerCase())) return;
      result.push({ title: text, level: Number(target.tagName.slice(1)), target, index, href: `${route}#${encodeURIComponent(text)}` });
    });
    const related = root.querySelector('#dndwiki-related');
    if (related && related.getClientRects().length) result.push({ title: 'Related', level: 2, target: related, related: true, href: `${route}#Related` });
    return result;
  }
  function category() {
    const model = session.currentModel;
    const page = visibleReaderDirectory(snapshot, session.perspective).find(record => record.pageId === model.page?.pageId);
    const current = page?.categories?.[0];
    const directory = readerDirectoryModel({ snapshot, perspective: session.perspective, hash: browserWindow.location.hash });
    const tag = current?.tag ?? directory.category?.tag;
    return tag ? { title: current?.label ?? directory.category?.label ?? tag, href: `#/tag/${encodeURIComponent(tag)}` } : { title: 'All notes', href: '#/' };
  }
  function refresh() {
    if (destroyed) return;
    const next = collect(), route = pageRoute(), categoryRecord = category();
    const nextSignature = `${route}|${categoryRecord.href}|${next.map(item => `${item.level}:${item.title}`).join('|')}`;
    const shell = root.querySelector('.dndwiki-shell');
    if (!shell) return;
    if (!rail || !rail.isConnected || signature !== nextSignature) {
      rail?.remove();
      rail = document.createElement('aside');
      rail.className = 'reader-timeline dndwiki-outline-rail';
      rail.setAttribute('data-dndwiki-outline-rail', ''); rail.setAttribute('aria-label', 'Page headings and scrollbar');
      rail.innerHTML = `<div class="reader-timeline-head"><a class="reader-timeline-category" href="${escapeHtml(categoryRecord.href)}">${escapeHtml(categoryRecord.title)}</a><button type="button" data-reader-outline-toggle aria-controls="reader-heading-list"></button></div><div class="reader-timeline-track" data-reader-scrollbar role="scrollbar" tabindex="0" aria-label="Page scroll position" aria-controls="main-content" aria-orientation="vertical" aria-valuemin="0" aria-valuemax="100"><span class="reader-scroll-thumb"></span></div><nav id="reader-heading-list" data-dndwiki-page-outline data-dndwiki-outline-progress-owner aria-label="On this page"><svg class="reader-timeline-leaders" aria-hidden="true"></svg><ul class="dndwiki-toc-list">${next.map(item => `<li><a class="dndwiki-toc-link reader-toc-link" href="${escapeHtml(item.href)}" aria-label="${escapeHtml(item.title)}" data-level="${item.level}"${item.titleLink ? ' data-dndwiki-title-link' : item.related ? ' data-dndwiki-related-link' : ` data-dndwiki-toc-index="${item.index}"`}><span class="reader-toc-label dndwiki-toc-label">${escapeHtml(item.title)}</span><span class="reader-toc-dot dndwiki-outline-dot" aria-hidden="true"></span></a></li>`).join('')}</ul></nav>`;
      shell.append(rail); signature = nextSignature;
      rail.querySelector('[data-reader-outline-toggle]').addEventListener('click', () => setOpen(!open));
      const leaders = rail.querySelector('.reader-timeline-leaders');
      rail.insertBefore(leaders, rail.querySelector('[data-dndwiki-page-outline]'));
      rail.querySelector('[data-dndwiki-page-outline]').addEventListener('scroll', schedule, { passive: true });
      const track = rail.querySelector('[data-reader-scrollbar]');
      track.addEventListener('pointerdown', onPointerDown);
      track.addEventListener('pointermove', onPointerMove);
      for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) track.addEventListener(event, onPointerEnd);
      track.addEventListener('keydown', onScrollKey);
      setOpen(open);
    }
    records = next;
    schedule();
  }
  function sync() {
    frame = 0; if (!rail?.isConnected) return;
    const track = rail.querySelector('[data-reader-scrollbar]'), rect = track.getBoundingClientRect();
    const height = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    const viewport = browserWindow.innerHeight, y = browserWindow.scrollY;
    const { maximum, thumbHeight, thumbTop } = timelineScrollMetrics({ scrollY: y, documentHeight: height, viewportHeight: viewport, trackHeight: rect.height });
    const thumb = track.querySelector('.reader-scroll-thumb');
    thumb.hidden = maximum <= 0; track.setAttribute('aria-disabled', String(maximum <= 0));
    thumb.style.height = `${thumbHeight}px`; thumb.style.transform = `translateY(${thumbTop}px)`;
    track.setAttribute('aria-valuenow', String(Math.round(maximum ? y / maximum * 100 : 0)));
    const positions = records.map(item => item.titleLink ? 0 : clamp((item.target.getBoundingClientRect().top + y) / Math.max(1, height) * rect.height, 0, rect.height));
    const labels = spreadTimelineLabels(positions, Math.max(0, rect.height - 28));
    const offset = rect.top - rail.getBoundingClientRect().top;
    const links = rail.querySelectorAll('.reader-toc-link'), width = rail.clientWidth;
    const labelsOverflow = timelineLabelsNeedScroll(records.length, rect.height);
    rail.toggleAttribute('data-reader-labels-scroll', labelsOverflow);
    const scrollingLabels = open && (browserWindow.innerWidth <= 760 || labelsOverflow);
    const railTop = rail.getBoundingClientRect().top;
    let lines = '';
    links.forEach((link, index) => {
      const labelY = labels[index] ?? 0, dotY = positions[index] ?? 0;
      link.style.top = `${offset + labelY}px`; link.style.setProperty('--reader-dot-shift', `${dotY - labelY - 4}px`);
      link.style.setProperty('--reader-dot-screen-y', `${rect.top + dotY - 4}px`);
      const labelPosition = scrollingLabels ? link.getBoundingClientRect().top - railTop + link.getBoundingClientRect().height / 2 : offset + labelY + 12;
      if (!scrollingLabels || (labelPosition >= 102 && labelPosition <= rail.clientHeight - 20)) lines += `<polyline points="${Math.max(24, width - 70)},${labelPosition} ${Math.max(32, width - 46)},${labelPosition} ${width - 22.5},${offset + dotY}"/>`;
    });
    const svg = rail.querySelector('.reader-timeline-leaders');
    svg.setAttribute('viewBox', `0 0 ${width} ${rail.clientHeight}`);
    if (svg.getAttribute('data-lines') !== lines) { svg.setAttribute('data-lines', lines); svg.innerHTML = lines; }
  }
  function schedule() {
    if (frame || destroyed) return;
    frame = browserWindow.requestAnimationFrame(sync);
  }
  function scrollMetrics() {
    const track = rail.querySelector('[data-reader-scrollbar]'), rect = track.getBoundingClientRect();
    return { track, rect, ...timelineScrollMetrics({ scrollY: browserWindow.scrollY, documentHeight: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight), viewportHeight: browserWindow.innerHeight, trackHeight: rect.height }) };
  }
  function dragTo(clientY) {
    const data = scrollMetrics(), travel = Math.max(1, data.rect.height - data.thumbHeight);
    browserWindow.scrollTo({ top: clamp((clientY - data.rect.top - dragging.offset) / travel, 0, 1) * data.maximum, behavior: 'auto' });
    sync();
  }
  function onPointerDown(event) {
    if (event.button !== 0) return;
    const data = scrollMetrics(), thumb = data.track.querySelector('.reader-scroll-thumb').getBoundingClientRect();
    dragging = { id: event.pointerId, offset: event.target.closest('.reader-scroll-thumb') ? event.clientY - thumb.top : data.thumbHeight / 2 };
    data.track.setPointerCapture(event.pointerId); event.preventDefault(); dragTo(event.clientY);
  }
  function onPointerMove(event) { if (dragging?.id === event.pointerId) { event.preventDefault(); dragTo(event.clientY); } }
  function onPointerEnd(event) { if (dragging?.id === event.pointerId) dragging = null; }
  function onScrollKey(event) {
    const { maximum } = scrollMetrics(), page = browserWindow.innerHeight * .9;
    const changes = { ArrowDown: 40, ArrowUp: -40, PageDown: page, PageUp: -page, ' ': event.shiftKey ? -page : page };
    if (!(event.key in changes) && !['Home', 'End'].includes(event.key)) return;
    event.preventDefault(); browserWindow.scrollTo({ top: event.key === 'Home' ? 0 : event.key === 'End' ? maximum : clamp(browserWindow.scrollY + changes[event.key], 0, maximum), behavior: 'auto' }); sync();
  }
  const onResize = () => { updateSpace(); schedule(); };
  const onHeadingSelect = event => {
    if (open && browserWindow.innerWidth <= 760 && event.target.closest?.('.reader-timeline .dndwiki-toc-link')) browserWindow.setTimeout(() => setOpen(false), 0);
  };
  browserWindow.addEventListener('click', onHeadingSelect, true);
  browserWindow.addEventListener('scroll', schedule, { passive: true });
  browserWindow.addEventListener('resize', onResize, { passive: true });
  document.addEventListener('load', schedule, true);
  if (browserWindow.ResizeObserver) { resizeObserver = new browserWindow.ResizeObserver(schedule); resizeObserver.observe(root); }
  refresh();
  return { refresh, setOpen, get open() { return open; }, destroy() { destroyed = true; if (frame) browserWindow.cancelAnimationFrame(frame); resizeObserver?.disconnect(); rail?.remove(); browserWindow.removeEventListener('click', onHeadingSelect, true); browserWindow.removeEventListener('scroll', schedule); browserWindow.removeEventListener('resize', onResize); document.removeEventListener('load', schedule, true); document.documentElement.style.removeProperty('--reader-right-space'); } };
}
