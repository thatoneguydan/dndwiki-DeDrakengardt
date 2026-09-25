import { mountWikiShell } from './wiki-shell.mjs';

const root = document.getElementById('dndwiki-app');

try {
  await mountWikiShell({ root, window });
} catch (error) {
  console.error('dndwiki failed to start.', error);
  if (root) {
    root.className = 'dndwiki-error';
    root.textContent = 'This wiki could not be loaded. Reload the page or try again later.';
  }
}
