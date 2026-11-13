# Redesign, November 2026

> **Current as of:** 2026-11-13 · **Code:** whole `portfolio/` repo. The 2026-11-11 pass is committed and deployed by hand. The 2026-11-13 pass is built and checked, not committed or deployed.
> Living doc. Rules for pages stay in `DESIGN.md`; this file records what the November pass changed
> and what is still open. Change history for the box is in `../../CHANGELOG.md`. All docs: `README.md` in this folder.

## Where the work lives

- `portfolio/` is its own git repo (the parent `endyland-infra` ignores it). Branch
  `portfolio/safe-home-argus-ended-refresh`. The 2026-11-11 work is commit 202fc92 and was deployed by hand.
- The 2026-11-13 pass sits on top as uncommitted changes. Owner rule stands: ship to endyland.com only when told.

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
- **Safe Home** (`/projects/safe-home/`, short link `/safehome`): HackUTD 2026 project. The first version stated no
  place or track. The 2026-11-13 section below has the verified wording. Clicking a node in the mesh animation takes it offline and packets
  reroute. Repo is private.
- **Argus** was first written as ended. That was wrong and is corrected in the 2026-11-13 section below.
- **Parity** (`/research/parity/`): built from the real repo, with the honest negative result.
- **Privacy and Terms** (`/privacy/`, `/terms/`): written, linked from every footer, in `sitemap.xml`. Privacy says no
  cookies, no forms, no accounts, and names Google Fonts and Cloudflare as the outside services.
- **Motion** follows the `/animations` skill. Reduced motion is ignored on purpose (owner decision), so no rules or
  checks for it exist in the site.
- **Check script**: `.github/scripts/check-site.sh` now checks the new bar and the absence of the old thumb index. Two
  bugs were fixed on 2026-11-11: it exited silently on the home page, and a shared-file check was skipped by a glob
  setting. It now prints "Site checks passed."

## Pass of 2026-11-13 (built, not committed or deployed)

Notes from the agents that did the work are in the session scratchpad, not in the repo. What changed:

- **Logo.** A capital E drawn as one trace. The three arms end in dots on a slant, like three antenna elements. It is
  in the top bar, favicon, apple icon, manifest and social images. Files and geometry: `brand.md`.
- **3D model kit.** Eight procedural three.js models and one viewer in `shared/models/` (sensor box, mesh, edge unit,
  patch array, FPGA board, logo, sensor node, pose). They sit beside the text on home, Projects, Safe Home, FPGA,
  sensor node, RF direction finder, Argus One and the edge board. Without WebGL 2 a WebP poster shows. Details:
  `models.md`.
- **`/code/` page.** GitHub activity: the past year as a dot plate, totals, languages, public repos. Home has a short
  strip that links to it. Data flow and the daily refresh job: `code-page.md`.
- **Search.** Unique title, description, canonical, Open Graph and Twitter tags, JSON-LD, social images and a
  41-page sitemap. Details: `seo.md`.
- **Declutter.** Small explainer text, captions that explain the page, eyebrows over every block, badges, numbering,
  stat tiles with captions and meta commentary were removed or folded into normal-size body text. Body text is 17 to
  19px, lines are 70 to 74 characters. The rules are now standing rules in `DESIGN.md`.
- **New sites.** Web design lists seven sites: Safe Home (its own page, covering the public site and UI) joins
  YoTummy, New Door, Detail Theory, Swadesi Mangoes, the RION website and endyland.com.
- **Safe Home and Argus depth.** Safe Home covers the sensors, the radio mesh, the API and the risk engine. Argus has an
  architecture diagram and the model and tuning work. Safe Home says it was Ayan's first hackathon and that the team
  won two awards, including 3rd place in the State Farm track.
- **Argus wording corrected.** Argus did not end. Ayan handed off his work and left in 2026 to spend more time on
  school and electrical engineering. The company continues under Rayan Sikkandar and team. The ended chips and past-tense
  company wording were changed on every Argus page, on home and on the tab.
- **Fact check.** Claims without a source were removed or reworded (list in the owner to-do in `../../CHANGELOG.md`).
  Examples: "cofounded" became "lead engineer", the RF array is described as designed and simulated, and the Parity
  claim is "none passed all 11 tests".
- **Fixes found while checking.** Wipe reveals never fired (the home "Recently added" heading stayed invisible); fixed in
  `shared/base.css` and `shared/motion.js`. Also: case-page flow diagrams touching the next paragraph, the 404 page
  stipple over its links on phones, breadcrumb wrapping on phones, and several phone diagram overlaps.
- **Performance.** Model posters went from PNG to WebP (804 KB to 263 KB). The model pixel ratio cap is 1.5 on phones
  and touch screens. `/data/*` is cached for 5 minutes.
- **Check script** also verifies brand files, the manifest, per-page search tags, unique titles and descriptions, and
  the GitHub data file.

## Verified (2026-11-13)

- All 41 sitemap pages at 1440 and 390 wide: no console errors, failed requests, CSP violations or sideways overflow.
- Internal links and assets returned 200 on every page checked in the verify passes.
- Model stages: 14 checks on 9 pages. Drawing stops off screen, no page errors, disposal frees the renderer. With WebGL
  off, all 7 stages on 5 pages show their poster and three.js is never requested.
- `/code/` and the home strip with the data file missing, a 404, invalid JSON or `{}`: one-line message, nothing else breaks.
- Fact check of every sitemap page against the repos, GitHub data and live sites. Corrections are in the changelog.
- Page JavaScript time in the home hero: median 2.0 ms per frame.
- `check-site.sh` passes.

## Still open

- Not committed, pushed or deployed.
- Facts only the owner can confirm: the list in `../../CHANGELOG.md` (2026-11-13) and the full list in the fact check.
- The daily GitHub refresh has not run on GitHub. It needs a repo secret `GH_STATS_TOKEN` to keep counting private work.
  Without it the job changes nothing and the numbers stay as fetched on 2026-11-12. See `code-page.md`.
- Hero frame rate was not re-measured cleanly: the machine was busy and software rendering gave about 8 fps. The earlier
  60 fps figure is not confirmed.
- Lighthouse mobile score (target 85) has not been rerun since the rebuild.
- Contrast of text over images and canvases was not measured.
- Not looked at on a real phone. Safe Home is 18,000 px tall on desktop and 23,000 px on phones.
- Several labels are under the 17px body target: 3D label chips and code samples (15 to 16px), breadcrumbs, footer and
  remaining figure captions (16px), edge-board model labels (14 to 15px).
- The Cloudflare tuning (HSTS, www redirect) is not live. The hosting page no longer claims it.
- Privacy and Terms are plain-language drafts. The owner should read them before ship.
- Plain headless screenshots show blank sections on home and Safe Home because reveals and WebGL need real rendering.
