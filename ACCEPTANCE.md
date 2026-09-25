# De Drakengardt Production Acceptance

This checklist closes DnDWiki Workstream 5, Stage 3 only after the permanent production hostname is live over HTTPS and real player perspectives have been exercised without exposing raw player keys.

## Production target

- Permanent URL: `https://dedrak.lorebomb.com/`
- Pre-custom-domain GitHub Pages project URL: `https://thatoneguydan.github.io/dndwiki-DeDrakengardt/` (GitHub may redirect this once the custom-domain binding is active).
- DNS target: `dedrak.lorebomb.com` CNAME `thatoneguydan.github.io`
- Cloudflare proxy should remain DNS-only until GitHub Pages has validated the hostname and provisioned its certificate.

## Preconditions

- [ ] GitHub Pages reports the custom domain as valid.
- [ ] `https://dedrak.lorebomb.com/` presents a valid certificate for `dedrak.lorebomb.com`.
- [ ] HTTP redirects to HTTPS once GitHub **Enforce HTTPS** is available and enabled.
- [x] The generated site uses relative asset/snapshot URLs and hash routing, so the same artifact can be served from either the project-site URL or the custom hostname.
- [x] Persistent Automatic Publishing remains off during launch acceptance.

## 1. Host and runtime smoke

From the permanent hostname:

- [ ] The landing page loads without a certificate warning.
- [ ] Styles load and the page is not an unstyled HTML shell.
- [ ] `./runtime/wiki-shell-entry.mjs` and `./dndwiki.snapshot.json` load successfully.
- [ ] Reloading a `#/page/<slug>` route returns to the same wiki route.
- [ ] There are no mixed-content or same-origin runtime errors in the browser console/network panel.

## 2. Anonymous perspective

With no stored player key:

- [ ] Public pages remain readable, including `Session 38 - 3.1 Recap`, `Spellbook Jailbreak`, `The Humbling of the Silver City`, and `A Construct's Confession About Dreams`.
- [ ] `Letter to Celeste` presents only the generic player-key gate.
- [ ] Search does not reveal keyed-only text, hidden snippets, hidden player IDs, or audience metadata.
- [ ] Forward links and backlinks do not leak hidden target content or private source structure.
- [ ] The normal UI identifies the perspective only as public/anonymous; it does not expose registry internals.

## 3. Wrong-key perspective

Use a deliberately invalid test value, never a real player's key:

- [ ] The result remains equivalent to the anonymous visibility boundary.
- [ ] The UI reports only the generic mismatch message.
- [ ] No hidden content, player ID, key hash, or registry metadata is shown.
- [ ] Reloading does not activate a player perspective.

## 4. Celeste perspective

Celeste should perform this portion using her own real key. Do not paste, record, screenshot, commit, log, or transmit the raw key as acceptance evidence.

- [ ] Entering the valid key activates player access.
- [ ] `Letter to Celeste` becomes readable.
- [ ] Public pages remain readable.
- [ ] Search/navigation expose only public material plus material intended for Celeste.
- [ ] Reloading preserves the active perspective in the same browser profile.
- [ ] Clearing the key immediately returns to the anonymous visibility boundary.
- [ ] Entering the key causes no network request containing the raw key; key resolution remains browser-local against the public hash projection.

## 5. Non-Celeste player perspective

At least one other real player should perform this portion with their own key, again without recording the raw key.

- [ ] Their valid key activates player access.
- [ ] Public pages remain readable.
- [ ] `Letter to Celeste` remains gated/unavailable to them.
- [ ] Search, links, and backlinks do not expose Celeste-only text or metadata.
- [ ] Clearing the key returns to the anonymous visibility boundary.

## 6. Real-device session check

Exercise the permanent hostname on at least one desktop browser and one touch/mobile browser representative of actual play.

- [ ] Reading width, navigation, search, key entry, and backlinks are usable without horizontal page overflow.
- [ ] Touch targets and forms work without requiring hover-only interaction.
- [ ] A page can be followed, reloaded, searched, and returned to during normal session use without losing the expected perspective.

Android/Obsidian plugin physical acceptance is tracked separately; this gate covers the player-facing website rather than authoring-device plugin behavior.

## Pass criteria

The launch gate passes only when all applicable boxes above are complete on `https://dedrak.lorebomb.com/` and no privacy, routing, HTTPS, or perspective-isolation defect remains.

Acceptance evidence may record browser/device type, page/route tested, expected perspective, and pass/fail outcome. It must never contain raw player keys or private registry source data.
