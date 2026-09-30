const AUTHORED_HTML_TAGS = new Set([
  'a', 'b', 'blockquote', 'br', 'center', 'del', 'details', 'div', 'em', 'hr', 'i', 'li', 'mark',
  'ol', 'p', 's', 'small', 'span', 'strong', 'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'tfoot',
  'th', 'thead', 'tr', 'u', 'ul',
]);

const BLOCK_HTML_TAGS = new Set([
  'blockquote', 'center', 'details', 'div', 'hr', 'ol', 'p', 'table', 'ul',
]);

const VOID_HTML_TAGS = new Set(['br', 'hr']);
const GLOBAL_ATTRIBUTES = new Set(['class', 'id', 'title']);
const CELL_ATTRIBUTES = new Set(['colspan', 'rowspan', 'scope']);
const LINK_ATTRIBUTES = new Set(['href', 'rel', 'target']);
const SAFE_TARGETS = new Set(['_blank', '_self']);
const SAFE_SCOPE_VALUES = new Set(['col', 'colgroup', 'row', 'rowgroup']);

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

function safeClassList(value) {
  const classes = String(value ?? '').trim().split(/\s+/).filter(Boolean);
  if (classes.length === 0 || classes.some((name) => !/^[A-Za-z0-9_-]{1,64}$/.test(name))) return null;
  return classes.join(' ');
}

function safeId(value) {
  const id = String(value ?? '').trim();
  return /^[A-Za-z][A-Za-z0-9_.:-]{0,127}$/.test(id) ? id : null;
}

function safeTokenList(value) {
  const tokens = String(value ?? '').trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0 || tokens.some((token) => !/^[A-Za-z0-9_-]{1,32}$/.test(token))) return null;
  return tokens.join(' ');
}

function parseAttributes(source) {
  const attributes = [];
  let index = 0;
  while (index < source.length) {
    const whitespace = /^\s+/.exec(source.slice(index));
    if (whitespace) index += whitespace[0].length;
    if (index >= source.length) break;

    const nameMatch = /^[A-Za-z_:][A-Za-z0-9:._-]*/.exec(source.slice(index));
    if (!nameMatch) return null;
    const name = nameMatch[0].toLowerCase();
    index += nameMatch[0].length;

    const afterNameWhitespace = /^\s*/.exec(source.slice(index))?.[0] ?? '';
    index += afterNameWhitespace.length;
    if (source[index] !== '=') {
      attributes.push({ name, value: null });
      continue;
    }

    index += 1;
    const beforeValueWhitespace = /^\s*/.exec(source.slice(index))?.[0] ?? '';
    index += beforeValueWhitespace.length;
    if (index >= source.length) return null;

    let value = '';
    const quote = source[index];
    if (quote === '"' || quote === "'") {
      index += 1;
      const close = source.indexOf(quote, index);
      if (close === -1) return null;
      value = source.slice(index, close);
      index = close + 1;
    } else {
      const unquoted = /^[^\s"'=<>`]+/.exec(source.slice(index));
      if (!unquoted) return null;
      value = unquoted[0];
      index += unquoted[0].length;
    }
    attributes.push({ name, value });
  }
  return attributes;
}

function sanitizeAttribute(tag, attribute) {
  const { name, value } = attribute;
  if (name.startsWith('on') || name === 'style') return null;

  if (name.startsWith('data-')) {
    if (!/^data-[a-z0-9_.:-]{1,64}$/.test(name) || value == null) return null;
    return `${name}="${escapeAttribute(value)}"`;
  }

  if (GLOBAL_ATTRIBUTES.has(name)) {
    if (value == null) return null;
    if (name === 'class') {
      const safe = safeClassList(value);
      return safe == null ? null : `class="${escapeAttribute(safe)}"`;
    }
    if (name === 'id') {
      const safe = safeId(value);
      return safe == null ? null : `id="${escapeAttribute(safe)}"`;
    }
    return `title="${escapeAttribute(value)}"`;
  }

  if ((tag === 'td' || tag === 'th') && CELL_ATTRIBUTES.has(name)) {
    if (value == null) return null;
    if (name === 'scope') {
      const normalized = String(value).toLowerCase();
      return SAFE_SCOPE_VALUES.has(normalized) ? `scope="${normalized}"` : null;
    }
    const numeric = Number.parseInt(String(value), 10);
    return Number.isInteger(numeric) && numeric >= 1 && numeric <= 100 ? `${name}="${numeric}"` : null;
  }

  if (tag === 'a' && LINK_ATTRIBUTES.has(name)) {
    if (value == null) return null;
    if (name === 'href') {
      const url = safeUrl(value);
      return url == null ? null : `href="${escapeAttribute(url)}"`;
    }
    if (name === 'target') {
      const normalized = String(value).toLowerCase();
      return SAFE_TARGETS.has(normalized) ? `target="${normalized}"` : null;
    }
    const tokens = safeTokenList(value);
    return tokens == null ? null : `rel="${escapeAttribute(tokens)}"`;
  }

  if (tag === 'details' && name === 'open' && value == null) return 'open';
  return null;
}

function tokenParts(token) {
  const source = String(token ?? '');
  const closing = /^<\s*\/\s*([A-Za-z][A-Za-z0-9-]*)\s*>$/.exec(source);
  if (closing) return { kind: 'close', tag: closing[1].toLowerCase(), source };

  const opening = /^<\s*([A-Za-z][A-Za-z0-9-]*)([\s\S]*?)\s*(\/?)>$/.exec(source);
  if (!opening) return null;
  return {
    kind: 'open',
    tag: opening[1].toLowerCase(),
    attributesSource: opening[2],
    selfClosing: opening[3] === '/',
    source,
  };
}

export function sanitizeAuthoredHtmlToken(token) {
  const parts = tokenParts(token);
  if (parts == null || !AUTHORED_HTML_TAGS.has(parts.tag)) return null;
  if (parts.kind === 'close') return VOID_HTML_TAGS.has(parts.tag) ? null : `</${parts.tag}>`;

  const attributes = parseAttributes(parts.attributesSource);
  if (attributes == null) return null;
  const rendered = [];
  for (const attribute of attributes) {
    const safe = sanitizeAttribute(parts.tag, attribute);
    if (safe == null) return null;
    rendered.push(safe);
  }

  if (parts.tag === 'a' && attributes.some(({ name }) => name === 'target') && !attributes.some(({ name }) => name === 'rel')) {
    rendered.push('rel="noopener noreferrer"');
  }

  return `<${parts.tag}${rendered.length > 0 ? ` ${rendered.join(' ')}` : ''}>`;
}

export function sanitizeAuthoredHtml(source) {
  const value = String(source ?? '');
  const stack = [];
  let output = '';
  let index = 0;
  while (index < value.length) {
    const open = value.indexOf('<', index);
    if (open === -1) {
      output += escapeHtml(value.slice(index));
      break;
    }
    output += escapeHtml(value.slice(index, open));
    const close = value.indexOf('>', open + 1);
    if (close === -1) {
      output += escapeHtml(value.slice(open));
      break;
    }

    const token = value.slice(open, close + 1);
    const parts = tokenParts(token);
    const safe = sanitizeAuthoredHtmlToken(token);
    if (parts == null || safe == null) {
      output += escapeHtml(token);
      index = close + 1;
      continue;
    }

    if (parts.kind === 'close') {
      if (stack.at(-1) !== parts.tag) output += escapeHtml(token);
      else {
        stack.pop();
        output += safe;
      }
    } else {
      output += safe;
      if (!VOID_HTML_TAGS.has(parts.tag) && !parts.selfClosing) stack.push(parts.tag);
    }
    index = close + 1;
  }
  return output;
}

export function safeInlineAuthoredHtmlAt(source, startIndex) {
  const value = String(source ?? '');
  const index = Number(startIndex);
  if (!Number.isInteger(index) || index < 0 || value[index] !== '<') return null;
  const close = value.indexOf('>', index + 1);
  if (close === -1) return null;

  const openingToken = value.slice(index, close + 1);
  const parts = tokenParts(openingToken);
  const safeOpen = sanitizeAuthoredHtmlToken(openingToken);
  if (parts == null || parts.kind !== 'open' || safeOpen == null || BLOCK_HTML_TAGS.has(parts.tag)) return null;
  if (VOID_HTML_TAGS.has(parts.tag) || parts.selfClosing) return { html: safeOpen, end: close + 1 };

  const closingPattern = new RegExp(`<\\s*\\/\\s*${parts.tag}\\s*>`, 'ig');
  closingPattern.lastIndex = close + 1;
  const closing = closingPattern.exec(value);
  if (closing == null) return null;
  const inner = value.slice(close + 1, closing.index);
  return {
    html: `${safeOpen}${sanitizeAuthoredHtml(inner)}</${parts.tag}>`,
    end: closing.index + closing[0].length,
  };
}

export function authoredHtmlBlockStart(line) {
  const match = /^\s*<\s*([A-Za-z][A-Za-z0-9-]*)\b/.exec(String(line ?? ''));
  return match != null && BLOCK_HTML_TAGS.has(match[1].toLowerCase());
}

export function collectAuthoredHtmlBlock(lines, startIndex) {
  const first = String(lines?.[startIndex] ?? '');
  const match = /^\s*<\s*([A-Za-z][A-Za-z0-9-]*)\b/.exec(first);
  if (!match) return null;
  const rootTag = match[1].toLowerCase();
  if (!BLOCK_HTML_TAGS.has(rootTag)) return null;
  if (VOID_HTML_TAGS.has(rootTag)) return { source: first, end: startIndex + 1 };

  let depth = 0;
  const block = [];
  const tokenPattern = /<\s*(\/?)\s*([A-Za-z][A-Za-z0-9-]*)\b[^>]*>/g;
  for (let index = startIndex; index < lines.length; index += 1) {
    const line = String(lines[index] ?? '');
    block.push(line);
    tokenPattern.lastIndex = 0;
    for (const token of line.matchAll(tokenPattern)) {
      if (token[2].toLowerCase() !== rootTag) continue;
      if (token[1] === '/') depth -= 1;
      else if (!/\/\s*>$/.test(token[0])) depth += 1;
    }
    if (depth === 0) return { source: block.join('\n'), end: index + 1 };
    if (depth < 0) return null;
  }
  return null;
}
