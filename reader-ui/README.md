# Approved De Drakengardt reader

GitHub Pages stages the approved Browser Lab v79 reader over a disposable copy of the publisher’s `site/` output. `release.json` identifies the source, approved appearance revisions and staged files. The live entry enables the campaign’s approved collection cards and reader appearance. The bundle excludes Admin and loads the approved appearance locally.

The Obsidian publisher continues to own the campaign snapshot, notes, assets and tracked `site/` tree. The Pages build fingerprints the current snapshot for the reader cache and derives lossless map tiles from the current published assets. It serves the original assets at their existing URLs.

The live reader uses the existing tomato notification service configured in `release.json`. The service accepts throws from the live wiki and applies the campaign’s daily notification limit.

## Updating and rolling back

Build the next approved reader with `scripts/prepare-published-reader.mjs` in the canonical engine repository. Update the release manifest and validate the assembled site against the current publisher snapshot before deploying. The stage checks the known publisher entry files and snapshot schema. An incompatible publisher change stops deployment while the previous Pages artifact continues to serve.

Revert the campaign reader release commit to restore the previous Pages build. The earlier compatibility files remain available to that build.
