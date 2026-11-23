import { openPlayerPayload } from './sealed-player-view.mjs';
import { privateAssetPurpose, validatePrivateAssetDescriptor } from './private-asset-format.mjs';

const PLACEHOLDER = 'data-dndwiki-private-asset';
const STATUS = 'data-dndwiki-private-asset-state';
const NODES = `img[${PLACEHOLDER}],a[${PLACEHOLDER}]`;
const MAX_ACTIVE_DOWNLOADS = 3;

/** Keep protected plaintext URLs entirely out of the HTML given to the browser. */
export function guardPrivateAssetMarkup(html, privateAssets) {
  if (!privateAssets || !Object.keys(privateAssets).length) return html;
  const has = (path) => Object.hasOwn(privateAssets, path);
  return html.replace(/<img src="(assets\/[a-f0-9]{24}(?:\.[a-z0-9]{1,10})?)" alt="([^"]*)" loading="lazy">/g, (full, path, label) => {
    if (!has(path)) return full;
    const { mediaType } = validatePrivateAssetDescriptor(path, privateAssets[path]);
    if (mediaType.startsWith('image/')) return `<img ${PLACEHOLDER}="${path}" alt="${label}">`;
    return `<a ${PLACEHOLDER}="${path}" download>${label || 'Download attachment'}</a>`;
  }).replace(/<a\b[^<>]*>/g, (tag) => tag.replace(/\shref="(assets\/[a-f0-9]{24}(?:\.[a-z0-9]{1,10})?)"/,
    (full, path) => {
      if (!has(path)) return full;
      validatePrivateAssetDescriptor(path, privateAssets[path]);
      return ` ${PLACEHOLDER}="${path}" download`;
    }));
}

/** Resolve a protected attachment only while an authenticated view owns it. */
export function createPrivateAssetReader({ document, fetchImpl = document?.defaultView?.fetch?.bind(document.defaultView) } = {}) {
  const window = document?.defaultView;
  if (!document?.body || typeof fetchImpl !== 'function' || typeof window?.MutationObserver !== 'function'
    || typeof window.URL?.createObjectURL !== 'function') return { setAccess() {}, destroy() {} };

  const entries = new Map();
  const nodes = new Map();
  const activeRequests = new Set();
  let current = null;
  let pending = [];
  let disposed = false;

  const attrFor = (node) => node.tagName === 'IMG' ? 'src' : 'href';
  const alive = (entry) => current === entry.access && entries.get(entry.path) === entry;
  const setNode = (node, entry) => {
    node.setAttribute(STATUS, entry.status);
    if (entry.status === 'ready') node.setAttribute(attrFor(node), entry.url);
  };

  function releaseEntry(entry) {
    entries.delete(entry.path);
    entry.controller.abort();
    if (entry.url) window.URL.revokeObjectURL(entry.url);
  }

  async function load(entry) {
    try {
      const url = new window.URL(entry.descriptor.path, document.baseURI);
      if (!['https:', 'http:'].includes(url.protocol) || url.origin !== window.location.origin) throw new Error('Invalid attachment origin.');
      const response = await fetchImpl(url.href, {
        signal: entry.controller.signal, redirect: 'error', cache: 'no-store',
      });
      if (!response.ok) throw new Error('Attachment unavailable.');
      const envelope = await response.json();
      if (!alive(entry)) return;
      const { campaignId, playerId, rawKey } = entry.access;
      const value = await openPlayerPayload({ campaignId, playerId, rawKey, purpose: privateAssetPurpose(entry.path), envelope });
      if (!alive(entry)) return;
      entry.url = window.URL.createObjectURL(new window.Blob([value], { type: entry.descriptor.mediaType }));
      entry.status = 'ready';
    } catch {
      if (!alive(entry)) return;
      entry.status = 'error';
    }
    for (const node of entry.nodes) setNode(node, entry);
  }

  function schedule() {
    while (!disposed && activeRequests.size < MAX_ACTIVE_DOWNLOADS && pending.length) {
      const entry = pending.shift();
      if (!alive(entry)) continue;
      activeRequests.add(entry);
      void load(entry).finally(() => { activeRequests.delete(entry); schedule(); });
    }
  }

  function attach(node) {
    if (!current || nodes.has(node) || !node.isConnected) return;
    const path = node.getAttribute(PLACEHOLDER);
    if (!current.privateAssets || !Object.hasOwn(current.privateAssets, path)) return;
    let entry = entries.get(path);
    if (!entry) {
      let descriptor;
      try { descriptor = validatePrivateAssetDescriptor(path, current.privateAssets[path]); }
      catch { node.setAttribute(STATUS, 'error'); return; }
      entry = { path, descriptor, access: current, nodes: new Set(), controller: new window.AbortController(), status: 'loading' };
      entries.set(path, entry);
      pending.push(entry);
    }
    nodes.set(node, entry);
    entry.nodes.add(node);
    setNode(node, entry);
  }

  function detach(node) {
    const entry = nodes.get(node);
    if (!entry) return;
    node.removeAttribute(attrFor(node));
    node.removeAttribute(STATUS);
    nodes.delete(node);
    entry.nodes.delete(node);
    if (!entry.nodes.size) releaseEntry(entry);
  }

  function attachIn(root) {
    if (root.matches?.(NODES)) attach(root);
    for (const child of root.querySelectorAll?.(NODES) ?? []) attach(child);
  }

  const observer = new window.MutationObserver((records) => {
    for (const record of records) for (const node of record.addedNodes) attachIn(node);
    for (const node of nodes.keys()) if (!node.isConnected) detach(node);
    schedule();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  function setAccess(access) {
    if (disposed || current === access) return;
    current = access;
    pending = [];
    for (const node of nodes.keys()) detach(node);
    if (access) attachIn(document.body);
    schedule();
  }

  return { setAccess, destroy() { setAccess(null); disposed = true; observer.disconnect(); } };
}
