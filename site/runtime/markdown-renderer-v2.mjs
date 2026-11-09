import './reader-ui-contracts.mjs';
import { renderMarkdownToHtml as renderLegacyMarkdownToHtml } from './markdown-renderer.mjs';
import {
  authoredHtmlBlockStart,
  collectAuthoredHtmlBlock,
  safeInlineAuthoredHtmlAt,
  sanitizeAuthoredHtml,
} from './obsidian-html.mjs';

const DD5E_ROOT_RE = /^\s*<div class="dd5e-sheet">\s*$/;
const MAPSMITH_MARKER_RE = /^\s*<!-- dndwiki:mapsmith ([a-z0-9][a-z0-9-]{0,63}) -->\s*$/;

function fenceMarker(line) {
  const match = /^ {0,3}(`{3,}|~{3,})/.exec(String(line ?? ''));
  return match?.[1] ?? null;
}

function fenceCloses(line, marker) {
  if (marker == null) return false;
  const character = marker[0] === '`' ? '`' : '~';
  return new RegExp(`^ {0,3}${character}{${marker.length},}\\s*$`).test(String(line ?? ''));
}

function closingCodeSpan(source, start, length) {
  for (let cursor = start; cursor < source.length;) {
    const next = source.indexOf('`', cursor);
    if (next < 0) return -1;
    let end = next + 1;
    while (source[end] === '`') end += 1;
    if (end - next === length) return end;
    cursor = end;
  }
  return -1;
}

/** Comments are absent content, including any Markdown assets within them. */
function stripOrdinaryHtmlComments(markdown) {
  const source = String(markdown ?? '').replace(/\r\n?/g, '\n');
  let output = '', cursor = 0, activeFence = null;
  while (cursor < source.length) {
    const lineStart = cursor === 0 || source[cursor - 1] === '\n';
    if (lineStart) {
      const newline = source.indexOf('\n', cursor), end = newline < 0 ? source.length : newline;
      const line = source.slice(cursor, end), opening = fenceMarker(line);
      if (activeFence != null || opening != null || MAPSMITH_MARKER_RE.test(line)) {
        output += source.slice(cursor, newline < 0 ? end : end + 1);
        if (activeFence != null) { if (fenceCloses(line, activeFence)) activeFence = null; }
        else if (opening != null) activeFence = opening;
        cursor = newline < 0 ? end : end + 1;
        continue;
      }
    }
    if (source[cursor] === '\\' && cursor + 1 < source.length) {
      output += source.slice(cursor, cursor + 2); cursor += 2; continue;
    }
    if (source[cursor] === '`') {
      let end = cursor + 1; while (source[end] === '`') end += 1;
      const close = closingCodeSpan(source, end, end - cursor);
      if (close >= 0) { output += source.slice(cursor, close); cursor = close; continue; }
      output += source.slice(cursor, end); cursor = end; continue;
    }
    if (source.startsWith('<!--', cursor)) {
      const close = source.indexOf('-->', cursor + 4);
      cursor = close < 0 ? source.length : close + 3;
      continue;
    }
    // Delimiters inside an HTML tag's quoted attributes are literal values.
    if (source[cursor] === '<' && /^<\/?[A-Za-z]/.test(source.slice(cursor))) {
      let end = cursor + 1, quote = null;
      for (; end < source.length; end += 1) {
        const character = source[end];
        if (quote) { if (character === quote) quote = null; }
        else if (character === '"' || character === "'") quote = character;
        else if (character === '>') { end += 1; break; }
      }
      output += source.slice(cursor, end); cursor = end; continue;
    }
    output += source[cursor]; cursor += 1;
  }
  return output;
}

function placeholder(kind, index) {
  return `DNDWIKI${kind}${index}AUTHOREDHTMLTOKEN`;
}

function replaceInlineHtml(line, replacements) {
  const source = String(line ?? '');
  let output = '';
  let cursor = 0;
  while (cursor < source.length) {
    const open = source.indexOf('<', cursor);
    if (open === -1) {
      output += source.slice(cursor);
      break;
    }
    output += source.slice(cursor, open);
    const safe = safeInlineAuthoredHtmlAt(source, open);
    if (safe == null) {
      output += '<';
      cursor = open + 1;
      continue;
    }
    const token = placeholder('INLINE', replacements.length);
    replacements.push({ token, html: safe.html, block: false });
    output += token;
    cursor = safe.end;
  }
  return output;
}

function preprocessAuthoredHtml(markdown) {
  const lines = String(markdown ?? '').replace(/\r\n?/g, '\n').split('\n');
  const output = [];
  const replacements = [];
  let activeFence = null;

  for (let index = 0; index < lines.length;) {
    const line = lines[index];
    if (activeFence != null) {
      output.push(line);
      if (fenceCloses(line, activeFence)) activeFence = null;
      index += 1;
      continue;
    }

    const openingFence = fenceMarker(line);
    if (openingFence != null) {
      activeFence = openingFence;
      output.push(line);
      index += 1;
      continue;
    }

    const map = MAPSMITH_MARKER_RE.exec(line);
    if (map != null) {
      const token = placeholder('BLOCK', replacements.length);
      replacements.push({ token, html: `<div class="dndwiki-mapsmith-host" data-dndwiki-mapsmith-page="${map[1]}"></div>`, block: true });
      if (output.length > 0 && output.at(-1) !== '') output.push('');
      output.push(token, '');
      index += 1;
      continue;
    }

    if (!DD5E_ROOT_RE.test(line) && authoredHtmlBlockStart(line)) {
      const block = collectAuthoredHtmlBlock(lines, index);
      if (block != null) {
        const html = sanitizeAuthoredHtml(block.source);
        const token = placeholder('BLOCK', replacements.length);
        replacements.push({ token, html, block: true });
        if (output.length > 0 && output.at(-1) !== '') output.push('');
        output.push(token, '');
        index = block.end;
        continue;
      }
    }

    output.push(replaceInlineHtml(line, replacements));
    index += 1;
  }

  return { markdown: output.join('\n'), replacements };
}

export function renderMarkdownToHtml(markdown) {
  const prepared = preprocessAuthoredHtml(stripOrdinaryHtmlComments(markdown));
  let html = renderLegacyMarkdownToHtml(prepared.markdown);
  for (const replacement of prepared.replacements) {
    if (replacement.block) html = html.replace(`<p>${replacement.token}</p>`, replacement.html);
    html = html.replaceAll(replacement.token, replacement.html);
  }
  return html;
}

export { escapeHtml, safeUrl } from './markdown-renderer.mjs';
