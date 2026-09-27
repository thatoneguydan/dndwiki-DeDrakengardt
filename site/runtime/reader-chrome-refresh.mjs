export function updateContextHeadings(root) {
  const title = root?.querySelector?.('[data-dndwiki-page-header] h1')?.textContent?.trim() ?? '';
  const backlinksHeading = root?.querySelector?.('#dndwiki-backlinks-heading');
  if (backlinksHeading != null && title.length > 0) {
    const desiredHeading = `${title} is mentioned in`;
    if (backlinksHeading.textContent !== desiredHeading) {
      backlinksHeading.textContent = desiredHeading;
    }
  }
}

export function mountReaderChromeRefresh({ root, window: browserWindow } = {}) {
  if (root == null || browserWindow == null) return { destroy() {} };

  let queued = false;
  const refresh = () => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      updateContextHeadings(root);
    });
  };

  const observer = typeof browserWindow.MutationObserver === 'function'
    ? new browserWindow.MutationObserver(refresh)
    : null;
  observer?.observe?.(root, { childList: true, subtree: true });
  browserWindow.addEventListener?.('hashchange', refresh, true);
  refresh();

  return {
    destroy() {
      observer?.disconnect?.();
      browserWindow.removeEventListener?.('hashchange', refresh, true);
    },
  };
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  mountReaderChromeRefresh({ root: document.getElementById('dndwiki-app'), window });
}
