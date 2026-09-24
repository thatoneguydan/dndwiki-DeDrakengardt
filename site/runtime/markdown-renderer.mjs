const BLOCK_START_RE = /^(?: {0,3}(?:#{1,6})\s+| {0,3}(?:```+|~~~+)| {0,3}> ?|\s*(?:[-+*]|\d+[.)])\s+|\s*(?:\|?.+\|.+)|\s*(?:\*\s*){3,}$|\s*(?:-\s*){3,}$|\s*(?:_\s*){3,}$)/;
const SPECIAL_MARK_RE = /^<mark class="(story|battle|ideation)">([\s\S]*?)<\/mark>/;
const CALLOUT_HEADER_RE = /^\[!([A-Za-z0-9_-]{1,32})\](?:[+-])?(?:\s+(.*))?$/;

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/[\u0000-\u001f\u007f]/g, '');
}

function safeUrl(raw) {
  const value = String(raw ?? '').trim().replace(/[\u0000-\u001f\u007f]/g, '');
  if (value.length === 0 || value.startsWith('//')) return null;
  if (value.startsWith('#')) return value;
  if (/^(?:https?:|mailto:)/i.test(value)) return value;
  const colon = value.indexOf(':');
  const slash = value.search(/[/?#]/);
  if (colon !== -1 && (slash === -1 || colon < slash)) return null;
  return value;
}

function findClosing(value, marker, from) {
  let index = from;
  while (index < value.length) {
    index = value.indexOf(marker, index);
    if (index === -1) return -1;
    let backslashes = 0;
    for (let cursor = index - 1; cursor >= 0 && value[cursor] === '\\'; cursor -= 1) backslashes += 1;
    if (backslashes % 2 === 0) return index;
    index += marker.length;
  }
  return -1;
}

function parseLinkAt(source, index, image) {
  const labelStart = index + (image ? 2 : 1);
  const closeLabel = findClosing(source, ']', labelStart);
  if (closeLabel === -1 || source[closeLabel + 1] !== '(') return null;
  const closeDestination = findClosing(source, ')', closeLabel + 2);
  if (closeDestination === -1) return null;
  const label = source.slice(labelStart, closeLabel);
  const destination = source.slice(closeLabel + 2, closeDestination).trim();
  if (destination.length === 0 || /\s/.test(destination)) return null;
  return { label, destination, end: closeDestination + 1 };
}

function renderInline(source) {
  let output = '';
  for (let index = 0; index < source.length;) {
    const char = source[index];

    if (char === '\\' && index + 1 < source.length) {
      output += escapeHtml(source[index + 1]);
      index += 2;
      continue;
    }

    if (char === '<') {
      const specialMark = SPECIAL_MARK_RE.exec(source.slice(index));
      if (specialMark) {
        output += `<mark class="${specialMark[1]}">${renderInline(specialMark[2])}</mark>`;
        index += specialMark[0].length;
        continue;
      }
    }

    if (source.startsWith('==', index)) {
      const close = findClosing(source, '==', index + 2);
      if (close !== -1 && close > index + 2) {
        output += `<mark>${renderInline(source.slice(index + 2, close))}</mark>`;
        index = close + 2;
        continue;
      }
    }

    if (char === '`') {
      const close = findClosing(source, '`', index + 1);
      if (close !== -1) {
        output += `<code>${escapeHtml(source.slice(index + 1, close))}</code>`;
        index = close + 1;
        continue;
      }
    }

    if (source.startsWith('![', index)) {
      const parsed = parseLinkAt(source, index, true);
      if (parsed) {
        const url = safeUrl(parsed.destination);
        if (url === null) output += escapeHtml(parsed.label);
        else output += `<img src="${escapeAttribute(url)}" alt="${escapeAttribute(parsed.label)}" loading="lazy">`;
        index = parsed.end;
        continue;
      }
    }

    if (char === '[') {
      const parsed = parseLinkAt(source, index, false);
      if (parsed) {
        const url = safeUrl(parsed.destination);
        if (url === null) output += renderInline(parsed.label);
        else output += `<a href="${escapeAttribute(url)}">${renderInline(parsed.label)}</a>`;
        index = parsed.end;
        continue;
      }
    }

    const markers = [
      ['**', 'strong'],
      ['__', 'strong'],
      ['~~', 'del'],
      ['*', 'em'],
      ['_', 'em'],
    ];
    let matched = false;
    for (const [marker, tag] of markers) {
      if (!source.startsWith(marker, index)) continue;
      const close = findClosing(source, marker, index + marker.length);
      if (close === -1 || close === index + marker.length) continue;
      output += `<${tag}>${renderInline(source.slice(index + marker.length, close))}</${tag}>`;
      index = close + marker.length;
      matched = true;
      break;
    }
    if (matched) continue;

    output += escapeHtml(char);
    index += 1;
  }
  return output;
}

function isFenceStart(line) {
  const match = /^ {0,3}(`{3,}|~{3,})(?:\s*([A-Za-z0-9_-]+))?\s*$/.exec(line);
  if (!match) return null;
  return { char: match[1][0], length: match[1].length, language: match[2] ?? null };
}

function isFenceClose(line, fence) {
  const escaped = fence.char === '`' ? '`' : '~';
  return new RegExp(`^ {0,3}${escaped}{${fence.length},}\\s*$`).test(line);
}

function splitTableRow(line) {
  let value = line.trim();
  if (value.startsWith('|')) value = value.slice(1);
  if (value.endsWith('|')) value = value.slice(0, -1);
  const cells = [];
  let current = '';
  let escaped = false;
  for (const char of value) {
    if (escaped) {
      current += char;
      escaped = false;
    } else if (char === '\\') {
      escaped = true;
    } else if (char === '|') {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function tableDelimiter(line, expectedColumns) {
  const cells = splitTableRow(line);
  if (cells.length !== expectedColumns) return null;
  const alignments = [];
  for (const cell of cells) {
    const match = /^(:)?-{3,}(:)?$/.exec(cell.replace(/\s+/g, ''));
    if (!match) return null;
    alignments.push(match[1] && match[2] ? 'center' : match[1] ? 'left' : match[2] ? 'right' : null);
  }
  return alignments;
}

function alignmentAttribute(value) {
  return value === null ? '' : ` style="text-align:${value}"`;
}

function renderParagraphLines(lines) {
  const pieces = lines.map((line) => {
    const hardBreak = / {2,}$/.test(line);
    const clean = hardBreak ? line.replace(/ {2,}$/, '') : line;
    return { html: renderInline(clean), hardBreak };
  });
  let html = '';
  for (let index = 0; index < pieces.length; index += 1) {
    html += pieces[index].html;
    if (index < pieces.length - 1) html += pieces[index].hardBreak ? '<br>' : ' ';
  }
  return `<p>${html}</p>`;
}

function horizontalRule(line) {
  const trimmed = line.trim();
  return /^(?:\*\s*){3,}$/.test(trimmed)
    || /^(?:-\s*){3,}$/.test(trimmed)
    || /^(?:_\s*){3,}$/.test(trimmed);
}

function defaultCalloutTitle(type) {
  return type
    .replace(/[-_]+/g, ' ')
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

export function renderMarkdownToHtml(markdown) {
  const lines = String(markdown ?? '').replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (line.trim().length === 0) {
      index += 1;
      continue;
    }

    const fence = isFenceStart(line);
    if (fence) {
      const code = [];
      index += 1;
      while (index < lines.length && !isFenceClose(lines[index], fence)) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      const className = fence.language ? ` class="language-${escapeAttribute(fence.language)}"` : '';
      blocks.push(`<pre><code${className}>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }

    const heading = /^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      blocks.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }

    if (horizontalRule(line)) {
      blocks.push('<hr>');
      index += 1;
      continue;
    }

    if (/^ {0,3}> ?/.test(line)) {
      const quoteLines = [];
      while (index < lines.length && /^ {0,3}> ?/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^ {0,3}> ?/, ''));
        index += 1;
      }
      const callout = quoteLines.length > 0 ? CALLOUT_HEADER_RE.exec(quoteLines[0].trim()) : null;
      if (callout) {
        const type = callout[1].toLowerCase();
        const title = callout[2]?.trim() || defaultCalloutTitle(type);
        const content = renderMarkdownToHtml(quoteLines.slice(1).join('\n'));
        blocks.push(`<div class="callout" data-callout="${escapeAttribute(type)}"><div class="callout-title">${renderInline(title)}</div><div class="callout-content">${content}</div></div>`);
      } else {
        blocks.push(`<blockquote>${renderMarkdownToHtml(quoteLines.join('\n'))}</blockquote>`);
      }
      continue;
    }

    const unordered = /^\s*[-+*]\s+(.+)$/.exec(line);
    const ordered = /^\s*\d+[.)]\s+(.+)$/.exec(line);
    if (unordered || ordered) {
      const orderedList = Boolean(ordered);
      const items = [];
      const itemRe = orderedList ? /^\s*\d+[.)]\s+(.+)$/ : /^\s*[-+*]\s+(.+)$/;
      while (index < lines.length) {
        const item = itemRe.exec(lines[index]);
        if (!item) break;
        items.push(`<li>${renderInline(item[1])}</li>`);
        index += 1;
      }
      const tag = orderedList ? 'ol' : 'ul';
      blocks.push(`<${tag}>${items.join('')}</${tag}>`);
      continue;
    }

    if (line.includes('|') && index + 1 < lines.length) {
      const headers = splitTableRow(line);
      const alignments = headers.length >= 2 ? tableDelimiter(lines[index + 1], headers.length) : null;
      if (alignments) {
        const bodyRows = [];
        index += 2;
        while (index < lines.length && lines[index].trim().length > 0 && lines[index].includes('|')) {
          const cells = splitTableRow(lines[index]);
          if (cells.length !== headers.length) break;
          bodyRows.push(cells);
          index += 1;
        }
        const headHtml = headers.map((cell, cellIndex) => `<th${alignmentAttribute(alignments[cellIndex])}>${renderInline(cell)}</th>`).join('');
        const bodyHtml = bodyRows.map((cells) => `<tr>${cells.map((cell, cellIndex) => `<td${alignmentAttribute(alignments[cellIndex])}>${renderInline(cell)}</td>`).join('')}</tr>`).join('');
        blocks.push(`<table><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`);
        continue;
      }
    }

    const paragraph = [line];
    index += 1;
    while (index < lines.length && lines[index].trim().length > 0) {
      if (BLOCK_START_RE.test(lines[index])) {
        const nextFence = isFenceStart(lines[index]);
        const nextHeading = /^ {0,3}#{1,6}\s+/.test(lines[index]);
        const nextQuote = /^ {0,3}> ?/.test(lines[index]);
        const nextList = /^\s*(?:[-+*]|\d+[.)])\s+/.test(lines[index]);
        const nextRule = horizontalRule(lines[index]);
        const nextTable = lines[index].includes('|')
          && index + 1 < lines.length
          && tableDelimiter(lines[index + 1], splitTableRow(lines[index]).length) !== null;
        if (nextFence || nextHeading || nextQuote || nextList || nextRule || nextTable) break;
      }
      paragraph.push(lines[index]);
      index += 1;
    }
    blocks.push(renderParagraphLines(paragraph));
  }

  return blocks.join('');
}

export { escapeHtml, safeUrl };
