# Redesign, November 2026

> **Current as of:** 2026-11-11 (built and checked, not committed or deployed) · **Code:** whole `portfolio/` repo
> Living doc. Rules for pages stay in `DESIGN.md`; this file records what the November pass changed
> and what is still open. Change history for the box is in `../../CHANGELOG.md`. All docs: `README.md` in this folder.

## Where the work lives

- `portfolio/` is its own git repo (the parent `endyland-infra` ignores it). Branch
  `portfolio/safe-home-argus-ended-refresh`. About 300 files changed, none committed or deployed.
- Owner rule stands: ship to endyland.com only when told.

## What changed

- **Home** is one long scroll: hero (gold dot canvas that follows the pointer), bio, Recently added (one big Safe Home
  card plus three more), one chapter per room (web design, projects, experience, research, startup work), contact.
  How to edit it: `home-sections.md`.
- **Navigation**: the thumb index and folio are gone. Every page has the same floating glass top bar (brand link, five
  tabs, menu button on phones) with the right tab marked. Rules are in `DESIGN.md`.
- **Look**: "printed book and brass workshop". Matte browns, paper, brass, stippled gold, serif display type.
  Banned on purpose: glass on page content, glows, gradient borders, neon, cursor spotlights on everything.
  Brand pages keep their own colors in the body.
- **All five tabs and every project page** were rewritten with fresh write-ups, drawn or screenshot visuals and
  readable layouts. Tab builders: web design, research, startup work, projects, experience.
- **Stock photos are gone.** Pages use client screenshots or drawings made for this site. No credit lines or unused
  images remain. `THIRD_PARTY.md` lists the sources.
- **Safe Home** (`/projects/safe-home/`, short link `/safehome`): HackUTD 2026 project, says the team won with no
  place, prize or track because none was verified. Clicking a node in the mesh animation takes it offline and packets
  reroute. Repo is private.
- **Argus is ended** (2025 to 2026, chip on all five Argus pages, past tense). No reason or month is stated.
- **Parity** (`/research/parity/`): built from the real repo, with the honest negative result.
- **Privacy and Terms** (`/privacy/`, `/terms/`): written, linked from every footer, in `sitemap.xml`. Privacy says no
  cookies, no forms, no accounts, and names Google Fonts and Cloudflare as the outside services.
- **Motion** follows the `/animations` skill. Reduced motion is ignored on purpose (owner decision), so no rules or
  checks for it exist in the site.
- **Check script**: `.github/scripts/check-site.sh` now checks the new bar and the absence of the old thumb index. Two
  bugs were fixed on 2026-11-11: it exited silently on the home page, and a shared-file check was skipped by a glob
  setting. It now prints "Site checks passed."

## Verified (2026-11-11)

- `check-site.sh` passes.
- All 39 sitemap pages at 1440, 768 and 390 wide: no console errors, failed requests or CSP violations; no sideways
  overflow; top bar present with the right tab marked and nothing under it; no leftover thumb index.
- Body text passes contrast AA on every page.
- Every animated or revealed item becomes visible after scrolling, with or without reduced motion emulated.
- Hero frame time: median 16.7 ms, locked to a 60 Hz display. Not over budget.
- Screenshots looked at: home, the tab pages, Safe Home, Argus, Parity.

## Still open

- Not committed, pushed or deployed. Waiting for the owner to say ship.
- Privacy and Terms at 390 wide looked clipped on the right in a headless screenshot, including the shared bar. Probably
  a headless window artifact, not confirmed. Check on a real phone.
- Phone-width screenshots were not looked at for most pages beyond the ones named above (the automated overflow check
  did cover them). Desktop views of several research and experience pages were also not looked at by eye.
- Contrast of text sitting over images and canvases was not measured.
- Lighthouse mobile score (target 85) was not rerun after the rebuild.
- Hero dot count left as is. Lower it only if a slow phone shows trouble.
- Facts the owner has not given: Argus end date or reason, Safe Home placement. Ask before adding either.
- Privacy and Terms are plain-language drafts written from what the site does. The owner should read them before ship.
