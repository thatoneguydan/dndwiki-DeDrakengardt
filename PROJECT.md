# dndwiki — De Drakengardt

This public repository is the generated player-facing publication target for the De Drakengardt campaign.

## Authority

- Canonical campaign writing remains in the DM's private Obsidian vault.
- Reusable engine/plugin/parser/UI source belongs to `thatoneguydan/dndwiki`.
- This repository owns only De Drakengardt publication configuration, generated player-safe/perspective-tagged content/assets/runtime output, and its GitHub Pages deployment configuration.
- This repository is never a full-vault mirror and is never a second authoring copy.

## Privacy boundary

DM-only ordinary note content and the player-registry source note must never enter this repository. Player-keyed sections are intentionally publishable under dndwiki's lightweight personalization threat model. Generated state must identify the dndwiki schema/engine version that produced it.

## Read next

- `dndwiki.campaign.json` — campaign publication/deployment contract.
- `ACCEPTANCE.md` — permanent-hostname and real-player launch acceptance.
- `thatoneguydan/dndwiki/ARCHITECTURE.md` — engine-wide publication/privacy semantics.
- `thatoneguydan/dndwiki/ROADMAP.md` — canonical program roadmap.

## Current position

De Drakengardt has completed its initial live campaign publication and production GitHub Pages deployment, including the permanent HTTPS hostname.

- Pre-custom-domain GitHub Pages project URL: `https://thatoneguydan.github.io/dndwiki-DeDrakengardt/`.
- Permanent campaign URL: `https://dedrak.lorebomb.com/`.
- `dedrak.lorebomb.com` resolves by CNAME to `thatoneguydan.github.io`.
- GitHub Pages presents a valid Let's Encrypt certificate for `dedrak.lorebomb.com`; HTTP redirects to HTTPS and the root, CSS, runtime entrypoint, and snapshot all serve successfully over HTTPS.
- Intentionally published corpus: `Session 38 - 3.1 Recap` (public), `Letter to Celeste` (`celeste` only), `Spellbook Jailbreak` (public), `The Humbling of the Silver City` (public), and `A Construct's Confession About Dreams` (public).
- GitHub Pages deployment is enabled from generated `site/` output on `main`; custom-domain observation remains available on demand and after deployments without an ongoing hourly schedule.
- Automatic Publishing remains off; publication remains explicitly controlled from the canonical private vault.
- The active launch gate is now `ACCEPTANCE.md` real-player validation on the permanent HTTPS hostname.

## Safety constraints

- Never commit private DM-only source or the player registry.
- Never infer publishability from folder location alone; generated output must come from the dndwiki extraction contract.
- Do not require Gigachomper, grimoireOS, the DM's home power, or residential internet to serve already-published content.
