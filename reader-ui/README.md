# Reader interface for the legacy publisher

The publisher owns generated `site/` content. Its currently installed runtime republishes older interface assets. The existing Pages workflow recognizes that exact legacy bundle by the Git blob hashes of all three UI files, then stages these accepted replacements over `site/runtime/` before uploading the site artifact. This step never commits back to `site/`, changes notes, or accesses the authoring device.

All three legacy hashes must match before any replacement happens. A publisher with a different UI bundle passes through unchanged, so a future publisher update can supply its own interface without being masked by older copies here. Files already containing the accepted polish also pass through unchanged.

The files are exact copies of the accepted canonical `dndwiki/runtime/` files at source commit `c20a7f6f83e32fa187b0b8e3cfbd53f4507a780f` ([source PR #246](https://github.com/thatoneguydan/dndwiki/pull/246)).

## Updates

For a reader-interface change, update the canonical source first and copy the accepted versions of all three files here. Validate the assembled site against the current campaign snapshot and preserve authored-note formatting. Keep the legacy hash guard tied to the observed publisher bundle; do not broaden it to arbitrary or partially matching runtimes. The existing deployment also runs when `reader-ui/` changes.

When upgrading the publisher runtime, verify its own UI and remove this compatibility step once the legacy bundle is no longer in use. Publishing alone does not update this folder.

This folder intentionally excludes the snapshot, note assets, renderers, `styles.css`, and `index.html`. Deployment requires only this campaign repository and its existing Pages permissions.

