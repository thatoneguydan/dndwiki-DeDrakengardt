# DnDWiki — De Drakengardt

This public repository is the generated player-facing publication target for the De Drakengardt campaign.

## Authority

- Canonical campaign writing remains in the DM's private Obsidian vault.
- Reusable engine/plugin/parser/UI source belongs to `thatoneguydan/dndwiki`.
- This repository owns only De Drakengardt publication configuration, generated player-safe/perspective-tagged content/assets/runtime output, and its GitHub Pages deployment configuration.
- This repository is never a full-vault mirror and is never a second authoring copy.

## Privacy boundary

DM-only ordinary note content and the player-registry source note must never enter this repository. Player-keyed sections are intentionally publishable under DnDWiki's lightweight personalization threat model. Generated state must identify the DnDWiki schema/engine version that produced it.

## Read next

- `dndwiki.campaign.json` — campaign publication/deployment contract.
- `thatoneguydan/dndwiki/ARCHITECTURE.md` — engine-wide publication/privacy semantics.
- `thatoneguydan/dndwiki/ROADMAP.md` — canonical program roadmap.

## Current position

De Drakengardt has completed its initial live campaign publication and production GitHub Pages deployment.

- Current GitHub Pages site: `https://thatoneguydan.github.io/dndwiki-DeDrakengardt/`
- Selected permanent campaign domain: `https://dedrak.lorebomb.com/`
- Initial authorized corpus: `Session 38 - 3.1 Recap` (public) and `Letter to Celeste` (`celeste` only).
- GitHub Pages deployment is enabled from generated `site/` output on `main`.
- Automatic Publishing remains off; publication remains explicitly controlled from the canonical private vault.
- The active launch gate is binding `dedrak.lorebomb.com` to GitHub Pages, validating DNS, and enabling HTTPS.

## Safety constraints

- Never commit private DM-only source or the player registry.
- Never infer publishability from folder location alone; generated output must come from the DnDWiki extraction contract.
- Do not require Gigachomper, grimoireOS, the DM's home power, or residential internet to serve already-published content.
