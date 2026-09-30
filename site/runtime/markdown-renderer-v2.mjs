import { renderMarkdownToHtml as renderLegacyMarkdownToHtml } from './markdown-renderer.mjs';
import {
  authoredHtmlBlockStart,
  collectAuthoredHtmlBlock,
  safeInlineAuthoredHtmlAt,
  sanitizeAuthoredHtml,
} from './obsidian-html.mjs';

const DD5E_ROOT_RE = /^\s*<div class="dd5e-sheet">\s*$/;

function fenceMarker(line) {
  const match = /^ {0,3}(`{3,}|~{3,})/.exec(String(line ?? ''));
  return match?.[1] ?? null;
}

function fenceCloses(line, marker) {
  if (marker == null) return false;
  const character = marker[0] === '`' ? '`' : '~';
  return new RegExp(`^ {0,3}${character}{${marker.length},}\\s*$`).test(String(line ?? ''));
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
  const prepared = preprocessAuthoredHtml(markdown);
  let html = renderLegacyMarkdownToHtml(prepared.markdown);
  for (const replacement of prepared.replacements) {
    if (replacement.block) html = html.replace(`<p>${replacement.token}</p>`, replacement.html);
    html = html.replaceAll(replacement.token, replacement.html);
  }
  return html;
}

export { escapeHtml, safeUrl } from './markdown-renderer.mjs';
