import { mountPixelBurn } from './pixel-burn.mjs';
import { tablerIcon } from './tabler-icons.mjs';

export function registryIconElement(document, descriptor) {
  const art = document.createElement('span'); art.className = 'reader-player-art'; art.setAttribute('aria-hidden', 'true');
  if (descriptor?.kind === 'text' && typeof descriptor.text === 'string' && descriptor.text.trim()) art.textContent = descriptor.text;
  else if (descriptor?.kind === 'tabler' && /^assets\/[a-zA-Z0-9._/-]+\.svg$/.test(descriptor.src ?? '')) {
    art.classList.add('reader-player-tabler'); art.style.maskImage = `url(${JSON.stringify(descriptor.src)})`; art.style.webkitMaskImage = art.style.maskImage;
  } else if (descriptor?.kind === 'image' && /^assets\/[a-zA-Z0-9._/-]+\.(?:png|svg|webp|jpe?g|gif)$/i.test(descriptor.src ?? '')) {
    const image = document.createElement('img'); image.src = descriptor.src; image.alt = ''; image.addEventListener('error', () => { art.replaceChildren(); art.innerHTML = tablerIcon('key'); }, { once: true }); art.append(image);
  } else art.innerHTML = tablerIcon(descriptor?.kind === 'tabler' ? descriptor.name : 'key');
  return art;
}

export function mountReaderAccess({ root, window: browserWindow, snapshot, session, navigation, refreshReader, isOtherInteractionActive = () => false }) {
  const document = browserWindow.document, reduced = browserWindow.matchMedia('(prefers-reduced-motion: reduce)');
  const stage = document.createElement('div'); stage.className = 'reader-burn-stage';
  const panel = document.createElement('section'); panel.className = 'reader-key-panel'; panel.id = 'reader-player-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Player access'); panel.hidden = true;
  stage.append(panel); document.body.append(stage);
  let editing = false, submitting = false, revealing = false, panelSignature = '', destroyed = false;
  const button = () => navigation.keyButton;
  const model = () => session.currentModel;
  const player = () => model().access;
  const anchor = () => button().querySelector('.reader-player-art,svg') ?? button();
  const burn = mountPixelBurn({ stage, content: panel, anchor, window: browserWindow, reducedMotion: () => reduced.matches,
    onPhaseChange(phase) {
      stage.setAttribute('data-phase', phase);
      const expanded = ['opening', 'open', 'closing'].includes(phase);
      button()?.setAttribute('aria-expanded', String(expanded)); navigation.setInteractionActive(phase !== 'closed' || isOtherInteractionActive());
    },
  });
  function renderPanel() {
    const access = player(), signature = JSON.stringify([access.active, access.playerId, access.displayName, editing, access.message]);
    if (signature === panelSignature) return;
    panelSignature = signature; panel.replaceChildren();
    const eyebrow = document.createElement('div'); eyebrow.className = 'reader-key-eyebrow'; eyebrow.textContent = 'Player access'; panel.append(eyebrow);
    if (access.active && !editing) {
      const heading = document.createElement('div'); heading.className = 'reader-player-heading';
      heading.append(registryIconElement(document, snapshot.players?.icons?.[access.playerId]));
      const title = document.createElement('h2'); title.textContent = access.displayName ?? access.playerId; heading.append(title); panel.append(heading);
      for (const [label, action] of [['Change key', 'change'], ['Remove key', 'remove']]) {
        const control = document.createElement('button'); control.type = 'button'; control.className = 'reader-key-action'; control.textContent = label;
        control.setAttribute(action === 'remove' ? 'data-dndwiki-clear-key' : 'data-reader-change-key', ''); panel.append(control);
      }
    } else {
      const title = document.createElement('h2'); title.textContent = access.active ? 'Change your key' : 'Your perspective'; panel.append(title);
      const intro = document.createElement('p'); intro.textContent = 'Reveal your part of the story.'; panel.append(intro);
      const form = document.createElement('form'); form.setAttribute('data-dndwiki-key-form', '');
      form.innerHTML = '<label for="reader-player-key">Player key</label><input id="reader-player-key" name="playerKey" type="password" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="Paste your key here" required><p class="reader-key-error" role="status" aria-live="polite"></p><button type="submit">Enter key</button>';
      form.querySelector('.reader-key-error').textContent = access.message ?? ''; panel.append(form);
    }
  }
  function updateIdentity() {
    const access = player(), target = button(); if (!target) return;
    const art = target.querySelector('.reader-key-art');
    const signature = JSON.stringify([access.active, access.playerId, snapshot.players?.icons?.[access.playerId]]);
    if (art.getAttribute('data-identity') !== signature) {
      art.setAttribute('data-identity', signature); art.replaceChildren(registryIconElement(document, access.active ? snapshot.players?.icons?.[access.playerId] : null));
    }
    target.setAttribute('aria-label', access.active ? `${access.displayName ?? access.playerId} — player access` : 'Player key');
    target.setAttribute('aria-controls', panel.id);
    target.querySelector('[data-reader-key-caption]').textContent = 'Key';
  }
  function layout() {
    const metrics = burn.metrics(), width = stage.clientWidth, height = stage.clientHeight;
    const mobile = browserWindow.innerWidth <= 760, available = height - (mobile ? 64 : 0);
    const contentWidth = Math.min(252, Math.max(130, width - 2 * (metrics.compactMargin + metrics.safety)));
    panel.style.width = `${contentWidth}px`; panel.style.maxHeight = `${Math.max(130, available - 140)}px`;
    const contentHeight = panel.offsetHeight;
    const mx = Math.min(metrics.margin + metrics.desiredWave * 2, (width - contentWidth) / 2 - metrics.safety);
    const my = Math.min(metrics.margin + metrics.desiredWave * 2, (available - contentHeight) / 2 - metrics.safety);
    let x = mobile ? (width - contentWidth) / 2 : 82 + mx * .3;
    x = Math.max(mx + metrics.safety, Math.min(x, width - contentWidth - mx - metrics.safety));
    const y = Math.max(my + metrics.safety, available - contentHeight - my - metrics.safety);
    panel.style.left = `${x}px`; panel.style.top = `${y}px`;
    return { x, y, w: contentWidth, h: contentHeight };
  }
  function refresh() {
    if (destroyed) return;
    updateIdentity(); renderPanel();
    if (!revealing && ['open', 'opening', 'closing'].includes(burn.phase)) burn.refresh(layout());
  }
  async function close({ focus = false } = {}) {
    await burn.close();
    if (focus) button()?.focus({ preventScroll: true });
  }
  function toggle() {
    if (burn.phase === 'full') return;
    if (burn.phase === 'open' || burn.phase === 'opening') { void close({ focus: true }); return; }
    editing = false; panelSignature = ''; refresh(); panel.hidden = false;
    void burn.open(layout());
    (panel.querySelector('input') ?? panel.querySelector('button'))?.focus({ preventScroll: true });
  }
  function captureView() {
    const old = document.createElement('div'); old.className = 'reader-burn-snapshot'; old.inert = true; old.setAttribute('aria-hidden', 'true');
    const content = root.cloneNode(true); content.id = 'reader-old-view';
    content.querySelector('.reader-navigation')?.remove(); content.querySelector('.reader-timeline')?.remove();
    content.style.position = 'absolute'; content.style.top = `${-browserWindow.scrollY}px`; content.style.left = '0'; content.style.width = '100%';
    old.append(content);
    for (const node of [navigation.element, root.querySelector('.reader-timeline')]) if (node) old.append(node.cloneNode(true));
    stage.prepend(old); return old;
  }
  async function enterKey(rawKey) {
    if (submitting) return; submitting = true;
    const submit = panel.querySelector('button[type="submit"]'); if (submit) submit.disabled = true;
    try {
      session.setRoute(browserWindow.location.hash);
      const next = await session.enterKey(rawKey);
      if (!next.access.active) {
        refreshReader(); panelSignature = ''; refresh(); panel.hidden = false;
        if (burn.phase === 'closed') void burn.open(layout()); else burn.refresh(layout());
        panel.querySelector('input')?.focus({ preventScroll: true }); return;
      }
      const old = reduced.matches ? null : captureView();
      editing = false; revealing = true;
      const completed = burn.reveal({ snapshot: old, update() { refreshReader(); updateIdentity(); } });
      revealing = false; panelSignature = ''; renderPanel(); await completed;
      button()?.focus({ preventScroll: true });
    } finally { submitting = false; const current = panel.querySelector('button[type="submit"]'); if (current) current.disabled = false; }
  }
  const onSubmit = event => {
    const form = event.target.closest?.('[data-dndwiki-key-form]'); if (!form || (!root.contains(form) && !panel.contains(form))) return;
    event.preventDefault(); event.stopImmediatePropagation(); void enterKey(form.elements.playerKey?.value ?? '');
  };
  const onPointer = event => {
    if (panel.contains(event.target) || button()?.contains(event.target)) return;
    if (burn.phase === 'open' || burn.phase === 'opening') void close();
  };
  const onClick = event => {
    if (event.target.closest?.('[data-reader-change-key]')) {
      editing = true; panelSignature = ''; renderPanel(); burn.refresh(layout()); panel.querySelector('input')?.focus({ preventScroll: true });
    } else if (event.target.closest?.('[data-dndwiki-clear-key]') && panel.contains(event.target)) {
      session.setRoute(browserWindow.location.hash); session.clearKey(); editing = false; refreshReader(); refresh(); void close({ focus: true });
    }
  };
  const onKey = event => { if (event.key === 'Escape' && burn.phase !== 'closed' && burn.phase !== 'full') { event.preventDefault(); void close({ focus: true }); } };
  const onResize = () => { if (['opening', 'open', 'closing'].includes(burn.phase)) burn.refresh(layout()); };
  const onMotion = () => burn.refreshMotion();
  const onStorage = event => { if (event.key === `dndwiki:${snapshot.campaign.id}:player-key` || event.key == null) void session.load({ routeHash: browserWindow.location.hash }).then(() => { refreshReader(); refresh(); }); };
  document.addEventListener('submit', onSubmit, true); document.addEventListener('pointerdown', onPointer); document.addEventListener('click', onClick); document.addEventListener('keydown', onKey);
  browserWindow.addEventListener('resize', onResize, { passive: true }); browserWindow.addEventListener('storage', onStorage); reduced.addEventListener?.('change', onMotion);
  refresh();
  return { toggle, refresh, close, get phase() { return burn.phase; }, destroy() { destroyed = true; burn.dispose(); stage.remove(); document.removeEventListener('submit', onSubmit, true); document.removeEventListener('pointerdown', onPointer); document.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey); browserWindow.removeEventListener('resize', onResize); browserWindow.removeEventListener('storage', onStorage); reduced.removeEventListener?.('change', onMotion); } };
}
