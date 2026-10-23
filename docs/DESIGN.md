# endyland.com redesign: five tabs and a page per project

The owner asked (2026-10-22): separate the site into web design, research, startup work and
individual projects, and later added a fifth tab, Experience, plus a page for every project. Clicking a branded project
switches the whole page to that brand's theme. Link every repo or website. Every tab looks and moves differently: its own art
style and its own animations. Earlier direction: very 3D, plenty of animation, placeholder images for
now, build on a preview address first, ship to endyland.com only when the owner says ship.

This file is not deployed (the deploy skips `docs/`).

## Pages

| Address | Folder | What it is |
|---|---|---|
| `/` | `index.html`, `home/` | The hub. Beam hero, five room cards that lead to the tabs, about, contact. |
| `/web-design/` | `web-design/` | Tab 01 |
| `/research/` | `research/` | Tab 02 |
| `/startup-work/` | `startup-work/` | Tab 03 |
| `/projects/` | `projects/` | Tab 04, individual projects |
| `/experience/` | `experience/` | Tab 05, jobs and roles |
| `/<tab>/<slug>/` | `<tab>/<slug>/` | One page per project. The full list is `docs/projects.json`. |
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
- Never name teammates, cofounders or collaborators. Say "a 3-person team" or "a small team".
- One personal project is off the site everywhere (pages, redirects, sitemap). `check-site.sh` fails if its name appears.
- The Butler matrix and the RF direction finder are one project.
- Public repo: link it ("Code on GitHub"). Only `endyland-portfolio` is public. Every other repo shows the
  "Private repo" badge and is not linked. Projects with no repo and no site say "No public link."
- Ship to endyland.com only when the owner says ship.

### Web design (`/web-design/`)
- YoTummy (`yotummy`, branded). https://yotummy.com
- New Door Investments (`new-door`, branded). https://newdoorinvestments.net and the inventory site.
- Detail Theory (`detail-theory`, branded). The "gloss detailing company". https://detail-theory.com
- Swadesi Mangoes (`swadesi-mangoes`, branded from a screenshot). https://swadesimangoes.com (not confirmed it runs his build; the caption says so).
- RION Solutions website (`rion-website`, RION brand). Also listed under RION.
- endyland.com (`endyland`, tab style). Public repo.

### Research (`/research/`)
- RF direction finder and Butler matrix (`rf-direction-finder`). UT Dallas RIDE. Merged project.
- Parity (`parity`).
- DFW rental pricing model (`dfw-rent-model`). Resume only, diagram figure.
- Public spending data explorer (`spending-explorer`). Resume only, diagram figure.

### Startup work (`/startup-work/`)
- Argus (`argus`, branded), with sub-projects: Argus Dashboard (`argus-dashboard`, the app's dark theme), Argus One
  (`argus-one`, includes the model tuning and the streaming agent), In-store AI board (`argus-edge-board`), useargus.co
  (`argus-site`). Smaller pieces (docs site, status page, ops console, audit logging) are listed on the Argus page.
- RION Solutions (`rion`, branded), with sub-projects: NEXUS Command Center (`nexus-command-center`), County records API
  and client intake (`rion-county-api`), and the website (`/web-design/rion-website/`). The RION page links across to
  the client work delivered through RION.

### Individual projects (`/projects/`)
- 8-bit RISC processor on FPGA (`fpga-risc`), Low-power wireless sensor node (`sensor-node`), Automated bench test rig
  (`bench-rig`): resume projects, stock photos.
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

Left out on purpose: the movie site, p-stream, userscript, backend, the Valentine fork, the off-site project above.

Profile links on every page: GitHub https://github.com/abasheer-rion,
LinkedIn https://www.linkedin.com/in/ayanbasheer.

## Art directions

Each tab must look and move differently. No shared palette, no shared fonts, no shared motion
beyond the tab bar and the page transition.

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
- Theme: set the `--p-*` tokens and the tab bar tokens on `:root`.
  - Branded pages adopt the brand: YoTummy, New Door, Detail Theory and Swadesi set tokens in their own `style.css`.
    Argus pages share `/startup-work/argus/brand.css` (the Dashboard page switches to the app's dark mode in its own
    `style.css`). RION pages, including `/web-design/rion-website/`, share `/startup-work/rion/brand.css`.
  - Unbranded pages use their tab's `project-theme.css`.
  - Each brand's brief (colors, fonts, logo, motifs, motion ideas, which assets exist) is in `docs/themes/`.
  - The theme files are checked for WCAG AA: ink, muted text and links on the page and surface colors, and button
    text on the button color. Brand colors that fail AA as text (YoTummy orange, New Door blue) are used for shapes only.
- Fonts come from Google Fonts. Every brand font is on Google Fonts, so nothing needs self-hosting.
- Images live in each page's `img/`. Every photo is WebP under 200 KB with `width` and `height` set. `img/thumb.webp`
  (800 by 450) is the card picture on the tab page. Stock photos carry a credit line on the page and in `THIRD_PARTY.md`.
  Projects with no photo use a diagram drawn for this site (`img/figure.svg`) that shows only the stated facts.
- A page may add a scene: `<canvas class="proj-scene" aria-hidden="true">` plus `mountScene` with a `scene.js` in its folder.
- Tab pages list every project as a card linking to its page (link class `link-more`, "See the project").

## Rules for every tab

- All content is real HTML. The canvas is decoration (`aria-hidden="true"`). Nothing is only in 3D.
- Keyboard: every link and control is reachable and has a visible focus ring.
- Contrast: text meets WCAG AA (4.5:1, or 3:1 for large text) against what is behind it,
  including over the moving scene.
- Reduced motion: no animation loops, no flips, no physics, no scroll-drawn plots. Show the end
  state. The loader already draws one still frame instead of looping.
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
- the tab bar markup, exactly (it is the same on every page),
- the footer markup,
- `<main id="main">` and each item's `id`,
- every link, badge and text in the content map and on each project page (you may restyle and rearrange them),
- the crumbs, the back links (class `back-link`), and the credit lines under stock photos.

Do not edit `/shared/`, `/home/`, `index.html`, `404.html`, `_headers`, `_redirects` or `sitemap.xml`.
If you need a shared change, ask the controller.

## Shared code (`/shared/`)

- `base.css`: reset, skip link, tab bar, footer, the private repo badge, page transitions.
  Theme it from your `style.css` by setting these on `:root`. A tab page marks its tab `aria-current="page"`;
  a project page marks its parent tab `aria-current="true"` and keeps the `.tab-ind` marker there.
  `--tb-bg --tb-fg --tb-mute --tb-accent --tb-border --tb-font --tb-radius --focus --ft-fg
  --badge-bg --badge-fg --badge-border`.
- `nav.js`: plain script in `<head>`. Adds a direction ("forward" or "back") to the page transition,
  and names `<main>` only while a transition runs (a name all the time stops glass panels from
  blurring the scene behind them).
- The tab bar is the same size on every page: each tab is 136px wide on desktop and a fifth of the
  row on screens up to 760px. Tabs may change its colors and fonts, not its size.
- `body` clips anything that reaches past the screen edge sideways, so glows cannot make phones pan.
  Do not set `overflow-x` on `html` or `body` in a tab.
- `project.css`: the project page layout, themed by `--p-bg --p-surface --p-ink --p-mute --p-accent --p-accent-bg
  --p-on-accent --p-link --p-line --p-display --p-display-weight --p-body --p-mono --p-radius`. Blocks: `.proj-crumbs`,
  `.proj-hero` (`.proj-logo .proj-kicker .proj-summary .proj-meta .proj-stack .proj-links .proj-nolink .proj-hero-media`),
  `.proj-section`, `.stats` / `.stat`, `.did-list`, `.cards` / `.card-link`, `.products`, `.plain-list`, `.gallery`,
  `.lightbox`, `.credit`, `.proj-back`, `.back-link`, `.proj-scene`.
- `project.js`: `initProject({ reveal, counts, gallery, back })` runs all four; each is also exported alone:
  `setupReveal(sel)` ("What I did" items rise in one after another), `setupCounts(sel)` (numbers in `[data-count]`
  count up once; the HTML holds the final value and a hidden copy for screen readers), `setupGallery(sel)` (links
  `a.lb` open a `<dialog>` lightbox with arrows, Escape and focus return), `setupBackLinks(sel)` (`a.back-link` goes
  back in history when you came from that page, so the tab keeps its scroll). Adds `pj-anim` to `<html>` when motion is allowed.
- `motion.js`: `prefersReducedMotion()`, `onReducedMotionChange(cb)`, `finePointer()`,
  `isLowPower()`, `onVisible(els, cb, opts)` (runs cb when each element scrolls into view; runs
  right away with reduced motion).
- `scene-loader.js`: `mountScene({ canvas, load, webgl, dprCap, lowDprCap })`. Waits for first paint,
  checks WebGL 2, loads your scene module, runs the loop, pauses it when hidden or off screen, draws
  a still frame with reduced motion, lowers the pixel ratio when frames run slow, and adds class `on`
  to the canvas after the first frame. On failure it adds `no-webgl` to `<html>`.
  Your `scene.js` exports `start(ctx)` and returns `{ resize(w, h, dpr), frame(t, dt), still(), dispose() }`.
  `ctx` is `{ canvas, low, dpr, reduced, onReducedChange(cb) }`. Call `mountScene` once per canvas.
  Use `webgl: false` for a plain 2D canvas (for example a polar plot).
- `vendor/three-r186.module.min.js`: all of three.js 0.186.1 as one module. Import what you need:
  `import { WebGLRenderer, ... } from '../shared/vendor/three-r186.module.min.js';`
  No three.js addons are vendored. Write small helpers yourself inside your folder.
- `legacy-hash.js`: home page only.

## Page transitions

CSS only (`@view-transition { navigation: auto; }` in `base.css`), so they work without JS.
Between a tab and its project pages (and between sibling project pages) the transition is the page-theme wipe:
`nav.js` saves where you clicked (sessionStorage key `endyland-vt-point`, read by the RION pages too, so keep the name) and adds type `deeper` or `up`, and the new page with its own theme grows in as a
circle from that point (`--vt-x`, `--vt-y`). The tab bar marker stays on the parent tab.
The tab bar stays still, the marker under the current tab slides to the new tab, and the page content
slides left or right by tab order. Browsers without view transitions get a short fade in on load.
Reduced motion turns all of it off.

## Old links

- Short links in `_redirects`: `/github`, `/linkedin`, `/argus` (to `/startup-work/argus/`),
  `/rion` (`/startup-work/rion/`), `/yotummy` (`/web-design/yotummy/`), `/verizon` (`/experience/verizon/`),
  `/work` (`/projects/`), `/about` (`/#about`), `/contact` (`/#contact`).
- Old one-page anchors such as `/#argus`, `/#yotummy`, `/#rf-direction-finder`, `/#gohighlevel-mcp`,
  `/#ses-mailer`, `/#work`, `/#projects` and `/#links` are sent on by `shared/legacy-hash.js`, now straight to the
  project pages. The old anchor of the off-site project is gone and simply lands on the home page.
- Tab pages keep an `id` on each card (the project slug), so `/<tab>/#<slug>` still works.
