import { escapeHtml, renderMarkdownToHtml } from './markdown-renderer-v2.mjs';
import { pageForRoute, routeForPage } from './navigation.mjs';
import { tablerIcon } from './tabler-icons.mjs';

const DETAILS = 'details[data-dndwiki-note-embed]';
const PAGE_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const sectionName = (value) => value.replace(/[*_`]/g, '').trim().toLocaleLowerCase('en-US');

function noteSection(markdown, selector) {
  if (!selector) return markdown;
  const lines = markdown.split(/\r?\n/);
  const headings = [];
  let fence = null;
  for (const [index, line] of lines.entries()) {
    const delimiter = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (delimiter) {
      const [, marker, rest] = delimiter;
      if (!fence) fence = marker;
      else if (marker[0] === fence[0] && marker.length >= fence.length && !rest.trim()) fence = null;
      continue;
    }
    if (fence) continue;
    if (selector.startsWith('^') && line.trimEnd().endsWith(selector)) {
      const end = line.trimEnd().length - selector.length;
      if (end && !/\s/.test(line[end - 1])) continue;
      let start = index;
      while (start > 0 && lines[start - 1].trim() && !/^ {0,3}#{1,6}\s/.test(lines[start - 1])) start -= 1;
      return [...lines.slice(start, index), line.slice(0, end).trimEnd()].join('\n');
    }
    const match = /^ {0,3}(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*$/.exec(line);
    if (match) headings.push({ index, level: match[1].length, name: sectionName(match[2]) });
  }
  if (selector.startsWith('^')) return null;
  const ancestry = [];
  const name = selector.split('#').map(sectionName).join('#');
  const start = headings.findIndex((heading) => {
    while (ancestry.length && ancestry.at(-1).level >= heading.level) ancestry.pop();
    ancestry.push(heading);
    return (name.includes('#') ? ancestry.map((item) => item.name).join('#') : heading.name) === name;
  });
  if (start < 0) return null;
  const heading = headings[start];
  const end = headings.slice(start + 1).find((item) => item.level <= heading.level);
  return lines.slice(heading.index, end?.index).join('\n');
}

function visibleNoteSection(snapshot, perspective, pageId, selector) {
  const page = pageForRoute(snapshot, perspective, pageId);
  if (page.status !== 'visible') return null;
  const markdown = noteSection(page.markdown, selector);
  return markdown === null ? null : { title: page.title, markdown };
}

function renderWithEmbeds(snapshot, perspective, markdown, ancestors) {
  return renderMarkdownToHtml(markdown, {
    renderNoteEmbed(pageId, encodedSelector, encodedAlias) {
      let selector, alias;
      try {
        selector = decodeURIComponent(encodedSelector);
        alias = decodeURIComponent(encodedAlias);
      } catch {
        return '';
      }
      const target = visibleNoteSection(snapshot, perspective, pageId, selector);
      if (!target) return '';
      const title = escapeHtml(alias || target.title || 'Embedded note');
      if (ancestors.has(routeForPage(pageId, selector))) {
        return `<p><a href="${routeForPage(pageId, selector)}">${title}</a></p>`;
      }
      const icon = tablerIcon('chevron-right');
      return `<details class="dndwiki-note-embed" data-dndwiki-note-embed="${pageId}" data-dndwiki-note-selector="${escapeHtml(selector)}"><summary>${icon}<span>${title}</span></summary><div class="dndwiki-note-embed-body"></div></details>`;
    },
  });
}

export function renderNoteMarkdown(snapshot, perspective, page) {
  return renderWithEmbeds(snapshot, perspective, page.markdown, new Set([page.route]));
}

export function mountNoteEmbeds(document, snapshot, getPerspective) {
  const loaded = new WeakSet();
  const openEmbed = (event) => {
    const details = event.target;
    if (!details?.open || !details.matches?.(DETAILS) || loaded.has(details)) return;
    const article = details.closest('article[data-dndwiki-embed-root]');
    const body = details.querySelector(':scope > .dndwiki-note-embed-body');
    if (!article || !body) return;
    const ancestors = new Set([article.dataset.dndwikiEmbedRoot]);
    for (let node = details; node; node = node.parentElement?.closest(DETAILS)) {
      if (!PAGE_ID.test(node.dataset.dndwikiNoteEmbed)) return;
      ancestors.add(routeForPage(node.dataset.dndwikiNoteEmbed, node.dataset.dndwikiNoteSelector));
    }
    const perspective = getPerspective(), { dndwikiNoteEmbed: pageId, dndwikiNoteSelector: selector } = details.dataset;
    const target = visibleNoteSection(snapshot, perspective, pageId, selector);
    if (!target) return;
    body.innerHTML = renderWithEmbeds(snapshot, perspective, target.markdown, ancestors);
    loaded.add(details);
  };
  document?.addEventListener?.('toggle', openEmbed, true);
  return () => document?.removeEventListener?.('toggle', openEmbed, true);
}
