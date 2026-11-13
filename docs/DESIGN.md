# endyland.com redesign: five tabs and a page per project

The owner asked (2026-10-22): separate the site into web design, research, startup work and
individual projects, and later added a fifth tab, Experience, plus a page for every project. Clicking a branded project
switches the whole page to that brand's theme. Link every repo or website. Every tab looks and moves differently: its own art
style and its own animations. Earlier direction: very 3D, plenty of animation, placeholder images for
now, build on a preview address first, ship to endyland.com only when the owner says ship.

This file is not deployed (the deploy skips `docs/`).

Legal pages: `/privacy/` and `/terms/` are written, linked from every footer and listed in `sitemap.xml`. They share `privacy/legal.css`. Privacy says the site sets no cookies and has no forms or accounts, and names Google Fonts and Cloudflare. If the site starts using anything new from outside, update Privacy in the same change.

## Pages

| Address | Folder | What it is |
|---|---|---|
| `/` | `index.html`, `home/` | One long scroll: gold dot hero, about, recently added, one chapter per room, contact. See `home-sections.md`. |
| `/web-design/` | `web-design/` | Tab 01 |
| `/research/` | `research/` | Tab 02 |
| `/startup-work/` | `startup-work/` | Tab 03 |
| `/projects/` | `projects/` | Tab 04, individual projects |
| `/experience/` | `experience/` | Tab 05, jobs and roles |
| `/<tab>/<slug>/` | `<tab>/<slug>/` | One page per project. The full list is `docs/projects.json`. |
| `/code/` | `code/`, `data/github.json` | GitHub activity: the year as a dot plate, totals, languages, public repos. Linked from home, not a tab. See `code-page.md`. |
| `/privacy/`, `/terms/` | `privacy/`, `terms/` | Legal pages, linked from every footer |
| any other | `404.html` | Not found |

Each tab folder holds `index.html`, `style.css`, `main.js`, `scene.js`, and `project-theme.css` for its unbranded
project pages. Each project folder holds `index.html`, `style.css`, `main.js`, `img/`, and an optional `scene.js`.
A page loads only `/shared/*`, its tab's or brand's theme file, and its own folder. One exception: RION pages also load
`/startup-work/rion/brand.js` (shared RION behavior) and `/startup-work/rion/sky.js` (the starfield), the JS side of `brand.css`.

## Content map

Decided by the controller from `CONTENT.md` and the owner's answers of 2026-10-22. The manifest with every page,
its theme and its images is `docs/projects.json`.

Owner rules:
- Big numbers, client logos, client photos and screenshots are OK to show.
- Argus: say Ayan stepped away and handed off his work in 2026. Never say Argus ended or shut down. Reason on record: more time for school and electrical engineering.
- Name teammates only where the owner's own public posts do (the Safe Home team, who Argus continues under). Elsewhere say "a 3-person team" or "a small team".
- One personal project is off the site everywhere (pages, redirects, sitemap). `check-site.sh` fails if its name appears.
- The Butler matrix and the RF direction finder are one project.
- Public repo: link it ("Code on GitHub"). Only `endyland-portfolio` is public. Every other repo shows the
  "Private repo" badge and is not linked. Projects with no repo and no site say "No public link."
- Ship to endyland.com only when the owner says ship.

### Web design (`/web-design/`)
- YoTummy (`yotummy`, branded). https://yotummy.com
- New Door Investments (`new-door`, branded). https://newdoorinvestments.net and the inventory site.
- Detail Theory (`detail-theory`, branded). The "gloss detailing company". https://detail-theory.com
- Swadesi Mangoes (`swadesi-mangoes`, branded from a screenshot). https://swadesimangoes.com (not confirmed it runs his build).
- RION Solutions website (`rion-website`, RION brand). Also listed under RION.
- Safe Home (`safe-home`, branded). The public site and its UI. The hardware and architecture are on `/projects/safe-home/`.
- endyland.com (`endyland`, tab style). Public repo.

### Research (`/research/`)
- RF direction finder and Butler matrix (`rf-direction-finder`). UT Dallas RIDE. Merged project.
- Parity (`parity`).
- DFW rental pricing model (`dfw-rent-model`). Resume only, diagram figure.
- Public spending data explorer (`spending-explorer`). Resume only, diagram figure.

### Startup work (`/startup-work/`)
- Argus (`argus`, branded; Ayan left in 2026, the company continues), with sub-projects: Argus Dashboard (`argus-dashboard`, the app's dark theme), Argus One
  (`argus-one`, includes the model tuning and the streaming agent), In-store AI board (`argus-edge-board`), useargus.co
  (`argus-site`). Smaller pieces (docs site, status page, ops console, audit logging) are listed on the Argus page.
- RION Solutions (`rion`, branded), with sub-projects: NEXUS Command Center (`nexus-command-center`), County records API
  and client intake (`rion-county-api`), and the website (`/web-design/rion-website/`). The RION page links across to
  the client work delivered through RION.

### Individual projects (`/projects/`)
- 8-bit RISC processor on FPGA (`fpga-risc`), Low-power wireless sensor node (`sensor-node`), Automated bench test rig
  (`bench-rig`): resume projects, drawn figures.
- Safe Home (`safe-home`): HackUTD 2026, his first hackathon. Two awards, including 3rd place in the State Farm track.
- Claude for GoHighLevel (`gohighlevel-mcp`) and the bulk email app on Amazon SES (`ses-mailer`): built for New Door.
- endyland hosting and status page (`endyland-infra`). The status page link is off the site for now because the live
  status page lists the off-site project. The screenshot is cropped to the portfolio card.

### Experience (`/experience/`)
- Verizon (`verizon`), network engineer intern, two summers, with sub-pages: Carrier Trunk Provisioning Tool
  (`verizon-trunk-tool`), voice network device backups (`verizon-backups`), moving apps off VMware (`verizon-cloud-move`).
  No Verizon logo (no permission).
- Property manager, ZAYKS at Parker (`property-manager`).
- Food bank coordinator, IAA and IACC (`food-bank`).
- Education and memberships are a small sheet on the tab page.

Left out on purpose: private projects, forks and anything unfinished.

Profile links on every page: GitHub https://github.com/abasheer-rion,
LinkedIn https://www.linkedin.com/in/ayanbasheer.

## The book system (latest owner direction, overrides the earlier palette and nav rules)

The site is "a printed book and a brass workshop": engraved banknote, letterpress, ledger and field notebook, leather
and brass hardware. Stippling (engraving dots for gradients, shadows and art) is the signature. Smooth and
professional, not a first-shot AI template. The shared chrome is the same on every page.

- **Top bar: dynamic glass.** `<header class="bar" data-tone="dark">` holds a floating, rounded, translucent pill
  centred at the top (brand link `endyland`, then `<nav class="bar-nav" id="bar-nav" aria-label="Sections">` with Web
  design, Research, Startup work, Projects, Experience, then a menu button and a progress line). Glass is
  `backdrop-filter: blur saturate` over a 74% tint with a thin brass hairline and a soft inner highlight. Behaviour
  (`shared/nav.js`, all optional polish): it condenses after the first scroll (scale .94, a second blurrier glass layer
  fades in); it slides up out of sight when scrolling down and returns on scroll up (translateY, 250ms ease-out in,
  200ms out; always shown on focus and while the menu is open); a brass indicator slides under the
  hovered, focused or current link (transform only); a 2px progress line (CSS scroll timeline, JS fallback); the tint
  flips between dark (over leather) and light (over paper) by sampling what is behind it, or by `data-tone` on any
  section; on phones the links fold into a Menu button whose panel grows from the button (scale .95 to 1, 200ms,
  Escape or outside click closes). Home can mark long-scroll sections with `data-bar-section="web-design"` to move the
  resting indicator. A tab page marks its link `aria-current="page"`, a project page its parent tab
  `aria-current="true"`, home none. Without JS the links are a plain row (two rows on phones). Without
  `backdrop-filter`, or with `prefers-reduced-transparency`, or in forced colors, the glass is a solid colour. The brand link is the logo mark (an E whose arms end in three dots, see `docs/brand.md`) and the word `endyland`; `nav.js` draws the mark inline, and without JS it comes from `shared/brand/logo-mono.svg` as a CSS mask.
- **Room for the bar.** The bar floats over the page. `--bar-h` (80px, 68px on phones) is the height pages leave at
  the top. `.proj` and `404.html` use it for their top padding and `html` uses it for `scroll-padding-top`. A tab page
  or home with a full-bleed hero should add `padding-top: var(--bar-h)` to the content (not the canvas).
- **Footer.** A plain leather band with a hairline: `<footer class="site-footer">` holds the copyright and five links (GitHub, LinkedIn, Contact `/#contact`, Privacy `/privacy/`, Terms `/terms/`). No colophon, no registration mark. The same markup is on every page.
- **Page turn.** The new page slides in from the right edge behind a short clip-path wipe (250ms, ease-out); the old
  page leaves in 200ms. Moving back along the tabs turns the other way. A tab to a project page is an ink-wipe circle
  from the click point. 
- **Palette (flat, matte, no glow).** CSS tokens in `base.css`: `--bk-ink #17100A`, `--bk-leather #26180F`,
  `--bk-walnut #35221A`, `--bk-saddle #5A3A22`, `--bk-brass #B8872E`, `--bk-foil #D9AE4A` (flat or stippled, never a
  glow), `--bk-paper #EFE3C8`, `--bk-vellum #F6EEDB`, `--bk-rust #9C4A22` (rare), `--bk-cream #D9CBAA` (muted text on
  leather). Dark sections are leather with paper text, light sections are paper with ink text. Pairs used by the chrome:
  paper on walnut about 11:1, ink on brass about 5.6:1, paper on saddle about 7.6:1, foil on leather about 8:1, rust on
  paper about 5:1 (all pass AA).
- **Type.** Newsreader (display serif, optical sizing, italics), Instrument Sans (UI and body). At most two families per page.
  Tokens `--bk-serif --bk-sans --bk-mono` (mono is the system monospace, for code only). Every page loads them with one Google Fonts link in `<head>` before base.css.
- **Stipple and grain.** `--bk-stipple` (a dot, uses `currentColor`) and `--bk-grain` (paper noise, an inline SVG) are
  backgrounds for any element. Set `background-size` 4px to 8px, layer two sizes offset for a hand-engraved look, and fade
  with `mask-image`. Decoration only.
- **Readability (hard requirement).** Fluid layout: `--gut` clamp(18px,4.5vw,72px), `--wrap` (screen minus both
  gutters, max 1480px; `.wrap`), full-bleed sections allowed. Prose column `--measure` 34em, about 70 to 74 characters (`--measure-wide` 36em;
  `.prose`). Body `--fs-body` 17px on phones to 19px on desktop, line-height 1.6; scale `--fs-lead --fs-small
  --fs-h1 --fs-h2 --fs-h3 --fs-h4`; `--fs-small` is 16 to 17px and `--fs-meta` (14 to 15px) is for dates only. Section rhythm `--section`. Text never sits on
  busy dots or a canvas: use a solid reading surface (`.surface`, `.surface--dark`) or keep the stipple away from the
  text. Contrast AA at least, aim 7:1 for body. No fixed element may cover text. Phones keep 18px side padding.
  Tables go in `.table-wrap` (scrolls sideways, `tabindex="0"`) or use `table.restack` with `data-label` on cells.
  Focus rings are 3px (`--focus`), foil on dark.
- **Banned (they read as AI templates):** drop caps, colophons, folios and page numbers, registration or corner marks, "Plate" or "Fig." captions, uppercase eyebrow tags over headings, glassmorphism on page content (the top bar is the one glass element), blur panels, glows and neon, gradient-border cards,
  cursor-spotlights on every card, tilt-with-glare on everything, purple or blue gradients, emoji or gradient icon tiles,
  pill badges, three-equal-card grids, a centered hero with two buttons, floating blobs,
  bounce or jelly easing, particle swarms for their own sake, generic scroll arrows.
- **Motion rules** follow `~/.claude/skills/animations/SKILL.md`: ease-out entrances, popovers 150 to 250ms from 0.95,
  30ms stagger, press 0.97, exits 20% shorter, no bounce, masks and clip-path for reveals. Only transform, opacity,
  clip-path and filter on small areas. `prefers-reduced-motion` is ignored on purpose (owner decision): animations always run, and the site has no reduced-motion rules or checks. Phones get lighter effects.

Brand pages (YoTummy, New Door, Detail Theory, Swadesi Mangoes, RION, Argus, Safe Home) keep their own colors and fonts
in the body. Only the chrome (top bar, footer, back links) is the book.

## Art directions (earlier brief, kept for history)

The section below is the brief from before the book system. Where it names a palette, fonts, glass panels or a tab bar,
the book system above wins. Each tab still gets its own art style and animation, built from the book's materials.

### Web design: bright, playful, Memphis and Bauhaus 3D
- Chunky primitive shapes (spheres, cylinders, half-discs, zigzags, cones) with soft shadows.
- You can drag and fling the shapes. Simple physics: velocity, gravity or springs, bounces off the
  screen edges. Write it by hand, no physics library.
- Springy hover on cards. The color palette shifts per project card.
- Cards flip in 3D (front: image and title, back: details and links). Links must stay reachable by
  keyboard on both faces, and the content must read fine with no flip at all.
- Starting palette: cream `#FFF4E0`, ink `#1B1B1F`, coral `#FF5A4E`, sun `#FFC93C`, blue `#2D5BFF`,
  mint `#2EC4B6`. Fonts: Archivo (display, wide and heavy), DM Sans (body).

### Research: dark lab instrument
- Oscilloscope green `#39FF88` and amber `#FFB000` on black `#050705`.
- Wireframe RF field lines, and a live polar beam plot (the 4-element array at 5.8 GHz).
- Data plots that draw themselves as you scroll to them.
- Monospace type (JetBrains Mono). A grid and scanline overlay, done in CSS.

### Startup work: cinematic and sleek
- Glass panels over a deep gradient (`#070818` to `#1A0F3A`).
- A particle swarm that morphs between shapes as you scroll from one company to the next
  (Argus, RION, New Door), with a smooth camera dolly.
- Glow done cheaply: additive sprites. No heavy post-processing on phones.
- Fonts: Instrument Serif (display), Inter Tight (body).

### Individual projects: retro arcade
- A voxel and pixel-art 3D world.
- CRT curvature and scanlines, done in CSS.
- 8-bit style hover effects. Cards as cartridges or arcade cabinets that light up.
- A small idle animation loop.
- Starting palette: night `#0B0420`, pink `#FF4FD8`, cyan `#3DF2FF`, yellow `#FFE14D`.
  Fonts: Press Start 2P (headings only, it is hard to read in long text), IBM Plex Mono (body).

### Experience: blueprint of a network
- Navy drafting paper `#0B2545` with a fine grid and a heavier line every fifth square, all in CSS.
- White and cyan linework (`#9CC9FF`, `#8FD8FF`), amber packets `#FFC857`.
- A network topology behind the page: routers drawn as circles with a cross, dashed links, amber packets moving
  between them (`experience/scene.js`, a plain 2D canvas, so it is light on phones).
- Each job is a drawing sheet: corner ticks that draw on, a dashed title block, uppercase condensed headings.
- Fonts: Barlow Condensed (display, uppercase), Barlow (body), system monospace for labels.

The palettes and fonts above are starting points already in each tab's `style.css`. A tab builder
can change them, as long as the tab stays clearly different from the others.

## Project pages

Every project has a page at `/<tab>/<slug>/`. The stubs already hold the real content: title, one-line summary,
role, dates, stack, links or the private badge, big numbers, "What I did", gallery or figure with credits, related
links and back links. Page builders add art and motion only.

- Layout: `/shared/project.css`. Behaviour: `/shared/project.js` (see Shared code).
- Theme: set the `--p-*` tokens on `:root`. The top bar and footer are not themed. `--focus` and `--badge-*` still are.
  - Branded pages adopt the brand: YoTummy, New Door, Detail Theory and Swadesi set tokens in their own `style.css`.
    Argus pages share `/startup-work/argus/brand.css` (the Dashboard page switches to the app's dark mode in its own
    `style.css`). RION pages, including `/web-design/rion-website/`, share `/startup-work/rion/brand.css`.
  - Unbranded pages use their tab's `project-theme.css`.
  - Each brand's brief (colors, fonts, logo, motifs, motion ideas, which assets exist) is in `docs/themes/`.
  - The theme files are checked for WCAG AA: ink, muted text and links on the page and surface colors, and button
    text on the button color. Brand colors that fail AA as text (YoTummy orange, New Door blue) are used for shapes only.
- Fonts come from Google Fonts. Every brand font is on Google Fonts, so nothing needs self-hosting.
- Images live in each page's `img/`. Every photo is WebP under 200 KB with `width` and `height` set. `img/thumb.webp`
  (800 by 450) is the card picture on the tab page. No stock photos are used anywhere (removed 2026-11-11). Client screenshots and drawings only.
  Projects with no photo use a diagram drawn for this site (`img/figure.svg`) that shows only the stated facts.
- A page may add a scene: `<canvas class="proj-scene" aria-hidden="true">` plus `mountScene` with a `scene.js` in its folder.
- Tab pages list every project as a card linking to its page (link class `link-more`, "See the project").

## Writing and declutter rules (standing)

Pages describe things objectively: what it is, what it does, how it is built, what was measured. The aim is a page
that reads as plain, checked fact.

- **Body copy.** No hype, no adjectives doing the work of facts, no rhetorical questions, no "not X, but Y", no closing
  moral, no lists of three for rhythm. State only what a source supports (repo, git history, live site, the owner's
  own posts). If unsure, leave it out.
- **Cut small explainer text.** No footnotes, fine-print captions that explain the page, "how to read this" notes,
  or commentary about the site or the write-up. If a fact matters, say it once in the body at normal size.
- **Cut decoration that stands in for content.** No eyebrow label over every block, no kicker and tagline pairs, no
  badges on everything, no 01/02/03 numbering, no stat tiles with a tiny caption. Keep a figure caption only when it
  discloses something the reader needs (a drawn model is not a photo, the demo data is fictional).
- **Fewer, larger, calmer elements.** Body text 17 to 19px (`--fs-body`), line length about 70 characters
  (`--measure` 34em), small text 16 to 17px (`--fs-small`), dates only at `--fs-meta`. Clear heading hierarchy.
  A page is easy to read first and decorative second.
- **People and employers.** Never put secrets, customer names, store names, tenant data or private repo names on the site.
- **Sources.** Dates, counts and roles come from the repos and posts, not from memory. When a number cannot be traced,
  remove it and put it on the owner confirm list.

## 3D model stages (standing)

The model kit is documented in `models.md`. Rules for using it on a page:

- Use a model only where the thing it shows is the subject of the page or section. Put it beside the text, never behind
  text. The page must still read without it.
- Mount with `<div class="model-stage" data-model="..." aria-label="...">` plus `/shared/models/stage.css` and
  `/shared/models/auto.js`. Say in the `aria-label` what the picture shows.
- A model drawn from parts lists or typical layouts is not a photo. Say so in one short caption where it matters.
- Keep a poster image (`posters/<model>.webp`) for each model. It shows when WebGL 2 is missing or fails.
- Three.js loads only when a stage is near the viewport. Do not import it from page code on pages without a stage.
- Phones and touch screens cap the pixel ratio at 1.5. Every stage stops drawing off screen and in hidden tabs.
- A new model needs an entry in `stage.js`, the test page and a poster. Steps are in `models.md`.

## Rules for every tab

- All content is real HTML. The canvas is decoration (`aria-hidden="true"`). Nothing is only in 3D.
- Keyboard: every link and control is reachable and has a visible focus ring.
- Contrast: text meets WCAG AA (4.5:1, or 3:1 for large text) against what is behind it,
  including over the moving scene.
- Reduced motion: ignored. Animations always run. Keep the no-WebGL fallback.
- Performance: every canvas pauses off screen and in a hidden tab (the loader does it), caps the pixel ratio at 1.5 on desktop and 1 on phones, and uses fewer dots on phones. Use IntersectionObserver, rAF and passive listeners, never layout reads in scroll handlers. `content-visibility:auto` on long below-fold sections, `will-change` only while animating.
- Phones: lighter scenes (`ctx.low`), start 3D after first paint, pause when hidden or off screen.
  The loader does the last two.
- Performance: Lighthouse mobile performance 85 or more for each page.
- CSP stays strict: `script-src 'self' https://static.cloudflareinsights.com`. No inline scripts,
  no new external hosts. Google Fonts is fine. Everything else is self-hosted.
- Libraries are pinned to a release at least 2 weeks old.
- Text: short and plain. No em dashes. `.github/scripts/check-site.sh` fails on them.

## What a page builder may touch

Only the folders you were given: a tab folder (`web-design/`, `research/`, `startup-work/`, `projects/`,
`experience/`) and/or project folders inside it, plus that tab's `project-theme.css` or the brand's `brand.css`.
That means its `index.html`, `style.css`, `main.js`, `scene.js`, `img/`, and any new files you add
inside it. Keep these as they are in your `index.html`:
- the `<head>` lines for `/shared/nav.js` and `/shared/base.css`,
- the top bar markup (`<header class="bar">`), exactly (the same on every page, only `aria-current` differs),
- the footer markup,
- `<main id="main">` and each item's `id`,
- every link, badge and text in the content map and on each project page (you may restyle and rearrange them),
- the crumbs, the back links (class `back-link`), and any credit lines.

Do not edit `/shared/`, `/home/`, `index.html`, `404.html`, `_headers`, `_redirects` or `sitemap.xml`.
If you need a shared change, ask the controller.

## Shared code (`/shared/`)

- `base.css`: the `--bk-*` tokens, reset, skip link, glass top bar (`.bar`), readability base (`.wrap .prose .surface .table-wrap`), the footer (`.site-footer`), the private repo badge (`.badge-private`), the page turn. A page may still set `--focus`
  (keyboard ring on its content) and `--badge-bg --badge-fg --badge-border`. The old `--tb-*` and `--ft-fg`
  variables still resolve to book colors, but nothing in the shared chrome reads them, so setting them does nothing.
  Do not style `.bar` or `.site-footer` from a page. Leave `var(--bar-h)` of room at the top.
- `nav.js`: plain script in `<head>`. Adds a direction ("forward" or "back") to the page transition,
  and names `<main>` only while a transition runs (a name all the time would flatten pages that draw a scene behind it).
- The top bar is the same on every page. Pages do not change it. `nav.js` also adds class `js` to `<html>`.
- `body` clips anything that reaches past the screen edge sideways, so decorations cannot make phones pan.
  Do not set `overflow-x` on `html` or `body` in a tab.
- `project.css`: the project page layout, themed by `--p-bg --p-surface --p-ink --p-mute --p-accent --p-accent-bg
  --p-on-accent --p-link --p-line --p-display --p-display-weight --p-body --p-mono --p-radius`. Blocks: `.proj-crumbs`,
  `.proj-hero` (`.proj-logo .proj-kicker .proj-summary .proj-meta .proj-stack .proj-links .proj-nolink .proj-hero-media`),
  `.proj-section`, `.stats` / `.stat`, `.did-list`, `.cards` / `.card-link`, `.products`, `.plain-list`, `.gallery`,
  `.lightbox`, `.credit`, `.proj-back`, `.back-link`, `.proj-scene`. Defaults are the book: paper, ink brown, rust,
  Newsreader display, stats as ledger entries (heavy rule, hairline columns, dotted rule over each label), cards and
  gallery items as pasted plates (paper edge plus an offset edge), sections as plain hairline rules (`content-visibility:auto`),  the ink-wipe reveal (`clip-path`) for `.did-list`, `.stats` and any `[data-wipe]` element.
- `project.js`: `initProject({ reveal, counts, gallery, back })` runs all four; each is also exported alone:
  `setupReveal(sel)` (lines in "What I did" and ledger stats are inked in one after another, 30ms apart; elements with `data-wipe` wipe in on their own), `setupCounts(sel)` (numbers in `[data-count]`
  count up once; the HTML holds the final value and a hidden copy for screen readers), `setupGallery(sel)` (links
  `a.lb` open a `<dialog>` lightbox with arrows, Escape and focus return), `setupBackLinks(sel)` (`a.back-link` goes
  back in history when you came from that page, so the tab keeps its scroll). Adds `pj-anim` to `<html>`.
- `motion.js`: `prefersReducedMotion()` (always false), `onReducedMotionChange(cb)` (never fires, kept for old imports), `finePointer()`,
  `isLowPower()`, `onVisible(els, cb, opts)` (runs cb when each element scrolls into view; runs right away only where IntersectionObserver is missing).
- `scene-loader.js`: `mountScene({ canvas, load, webgl, dprCap, lowDprCap })`. Waits for first paint,
  checks WebGL 2, loads your scene module, runs the loop, pauses it when hidden or off screen, lowers the pixel ratio when frames run slow, and adds class `on`
  to the canvas after the first frame. On failure it adds `no-webgl` to `<html>`.
  Your `scene.js` exports `start(ctx)` and returns `{ resize(w, h, dpr), frame(t, dt), still(), dispose() }`.
  `ctx` is `{ canvas, low, dpr, reduced (always false), onReducedChange(cb) (no-op) }`. Call `mountScene` once per canvas.
  Use `webgl: false` for a plain 2D canvas (for example a polar plot).
- `vendor/three-r186.module.min.js`: all of three.js 0.186.1 as one module. Import what you need:
  `import { WebGLRenderer, ... } from '../shared/vendor/three-r186.module.min.js';`
  No three.js addons are vendored. Write small helpers yourself inside your folder.
- `legacy-hash.js`: home page only.

## Page transitions

CSS only (`@view-transition { navigation: auto; }` in `base.css`), so they work without JS.
Between a tab and its project pages (and between sibling project pages) the transition is the page-theme wipe:
`nav.js` saves where you clicked (sessionStorage key `endyland-vt-point`, read by the RION pages too, so keep the name) and adds type `deeper` or `up`, and the new page with its own theme grows in as a
circle from that point (`--vt-x`, `--vt-y`). Between tabs the page turns: the top bar stays put and
 the new page slides in from the right edge (moving forward by tab
order) or from the left (moving back) behind a clip-path wipe, 250ms ease-out, while the old page leaves in 200ms.
Browsers without view transitions get a short slide-fade on load. 

## Old links

- Short links in `_redirects`: `/github`, `/linkedin`, `/argus` (to `/startup-work/argus/`),
  `/rion` (`/startup-work/rion/`), `/yotummy` (`/web-design/yotummy/`), `/verizon` (`/experience/verizon/`),
  `/safehome` (`/projects/safe-home/`), `/work` (`/projects/`), `/about` (`/#about`), `/contact` (`/#contact`).
- Old one-page anchors such as `/#argus`, `/#yotummy`, `/#rf-direction-finder`, `/#gohighlevel-mcp`,
  `/#ses-mailer`, `/#work`, `/#projects` and `/#links` are sent on by `shared/legacy-hash.js`, now straight to the
  project pages. The old anchor of the off-site project is gone and simply lands on the home page.
- Tab pages keep an `id` on each card (the project slug), so `/<tab>/#<slug>` still works.
