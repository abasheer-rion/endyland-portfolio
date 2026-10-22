# endyland.com redesign: four tabs

The owner asked (2026-10-22): separate the site into web design, research, startup work and
individual projects. Link every repo or website. Every tab looks and moves differently: its own art
style and its own animations. Earlier direction: very 3D, plenty of animation, placeholder images for
now, build on a preview address first, ship to endyland.com only when the owner says ship.

This file is not deployed (the deploy skips `docs/`).

## Pages

| Address | Folder | What it is |
|---|---|---|
| `/` | `index.html`, `home/` | The hub. Beam hero, four room cards that lead to the tabs, about, contact. |
| `/web-design/` | `web-design/` | Tab 01 |
| `/research/` | `research/` | Tab 02 |
| `/startup-work/` | `startup-work/` | Tab 03 |
| `/projects/` | `projects/` | Tab 04, individual projects |
| any other | `404.html` | Not found |

Each tab folder holds `index.html`, `style.css`, `main.js`, `scene.js` and `img/`. A page loads only
`/shared/*` and its own folder.

## Content map

Decided by the controller. The owner can correct it after the preview.

Rules:
- Public repo: link it ("Code on GitHub").
- Private repo: show the lock badge "Private repo" and do not link the repo. It would 404 for visitors.
- Link the live website when there is one.
- Each item keeps its id, so old links like `/#argus` still land on it (see "Old links" below).

### Web design
- **endyland.com** (`#endyland`). This site. Public repo https://github.com/abasheer-rion/endyland-portfolio
- **YoTummy** (`#yotummy`). https://yotummy.com. Private repo.
- **RION Solutions website** (`#rion-website`). https://rionsolution.com. Private repo
  (RION-Solutions-Development org).
- **RION admin dashboard** (`#rion-admin`). https://rion-admin-five.vercel.app. Private repo.
- **Park With Love** guest parking app (`#park-with-love`). No public link, friends get a private
  link. Private repo.

### Research
- **RF direction finder and beam steering at 5.8 GHz** (`#rf-direction-finder`). UT Dallas RIDE,
  fall 2026, MATLAB. Private repo (ride-beamforming). Text kept from the old site.
- **Parity: can a currency strategy beat the S&P 500?** (`#parity`). Private repo.

### Startup work
- **Argus** (`#argus`), cofounder. https://useargus.co. Text kept from the old site.
- **RION Solutions** (`#rion`), co-ran it. https://rionsolution.com. Text kept from the old site.
- **New Door team email tool** (`#ses-mailer`). Minimal self-hosted SES mailer built for the team.
  Private repo (email-SES-LocalHosted). Text kept from the old SES mailer card.

### Individual projects
- **Claude for GoHighLevel** (`#gohighlevel-mcp`). MCP server. Private repo. Text kept.
- **endyland infrastructure** (`#endyland-infra`). Status page
  https://endyland-status.ayanbasheer.workers.dev and automatic deploys. Private repo.
- **Park With Love** (`#park-with-love-card`). A small card that links to
  `/web-design/#park-with-love`. Not a second copy.

Left out on purpose: the movie site, p-stream, userscript, backend, the Valentine fork.

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

The palettes and fonts above are starting points already in each tab's `style.css`. A tab builder
can change them, as long as the tab stays clearly different from the others.

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

## What a tab builder may touch

Only your own folder: `web-design/`, `research/`, `startup-work/` or `projects/`.
That means its `index.html`, `style.css`, `main.js`, `scene.js`, `img/`, and any new files you add
inside it. Keep these as they are in your `index.html`:
- the `<head>` lines for `/shared/nav.js` and `/shared/base.css`,
- the tab bar markup, exactly (it is the same on every page),
- the footer markup,
- `<main id="main">` and each item's `id`,
- every link, badge and text in the content map (you may restyle and rearrange them).

Do not edit `/shared/`, `/home/`, `index.html`, `404.html`, `_headers`, `_redirects` or `sitemap.xml`.
If you need a shared change, ask the controller.

## Shared code (`/shared/`)

- `base.css`: reset, skip link, tab bar, footer, the private repo badge, page transitions.
  Theme it from your `style.css` by setting these on `:root`:
  `--tb-bg --tb-fg --tb-mute --tb-accent --tb-border --tb-font --tb-radius --focus --ft-fg
  --badge-bg --badge-fg --badge-border`.
- `nav.js`: plain script in `<head>`. Adds a direction ("forward" or "back") to the page transition.
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
The tab bar stays still, the marker under the current tab slides to the new tab, and the page content
slides left or right by tab order. Browsers without view transitions get a short fade in on load.
Reduced motion turns all of it off.

## Old links

- Short links in `_redirects`: `/github`, `/linkedin`, `/argus` (to `/startup-work/#argus`),
  `/rion` (`/startup-work/#rion`), `/yotummy` (`/web-design/#yotummy`), `/work` (`/projects/`),
  `/about` (`/#about`), `/contact` (`/#contact`).
- Old one-page anchors such as `/#argus`, `/#yotummy`, `/#rf-direction-finder`, `/#gohighlevel-mcp`,
  `/#park-with-love`, `/#ses-mailer`, `/#work`, `/#projects` and `/#links` are sent on by
  `shared/legacy-hash.js`.
