# endyland.com

Personal site of Ayan Basheer, live at https://endyland.com.

A home page, five tabs, a page for every project, and Privacy and Terms pages. Everything shares the printed book and brass look, and each
branded project page takes on that brand's colors, fonts and logo. No build step: the files here are the site. The plan, the content map and each tab's art direction are in `docs/DESIGN.md`.

- `/` the hub: one long scroll with a gold dot hero that steers toward the pointer, a bio, recently added work, one chapter per tab and contact. Editing guide: `docs/home-sections.md`.
- `/web-design/`, `/research/`, `/startup-work/`, `/projects/`, `/experience/`: the five tabs.
- `/<tab>/<slug>/`: one page per project, listed in `docs/projects.json`.
- `/privacy/` and `/terms/`: legal pages, linked from every footer.

All text is plain HTML. The canvases are decoration only.

- Reduced motion is ignored on purpose (owner decision): animations always run.
- Phones and slow machines: lighter scenes and a lower resolution, which drops further if frames
  run slow. Scenes start after the page paints and stop while hidden or off screen.
- No WebGL 2: the canvas is hidden and a CSS gradient takes its place.

## Files

- `index.html` and `home/`: the home page, its styles, behaviour and hero scene.
- `privacy/` and `terms/`: the legal pages. `privacy/legal.css` styles both.
- `web-design/`, `research/`, `startup-work/`, `projects/`, `experience/`: one folder per tab with
  `index.html`, `style.css`, `main.js`, `scene.js` and `project-theme.css` (the look of its unbranded project pages).
- `<tab>/<slug>/`: one folder per project with `index.html`, `style.css`, `main.js` and `img/` (WebP under 200 KB,
  `thumb.webp` is the card on the tab page). Argus and RION pages share `startup-work/argus/brand.css` and
  `startup-work/rion/brand.css`.
- `shared/`: used by every page. `base.css` (the book palette tokens, glass top bar, readability base, plain footer, private badge, page turn), `nav.js`
  (the top bar behaviour, transition direction and the theme wipe into project pages), `project.css` and `project.js` (project page layout,
  "What I did" reveal, count-up numbers, gallery lightbox, back links), `motion.js` (helpers), `scene-loader.js` (starts
  3D after first paint, pauses it off screen), `legacy-hash.js` (old `/#argus` style links).
- `shared/vendor/three-r186.module.min.js`: three.js 0.186.1. MIT license, text in
  `shared/vendor/three-LICENSE.txt` (also see `THIRD_PARTY.md`). Rebuild it with
  `.github/scripts/vendor-three.sh 0.186.1`.
- `404.html`: the page shown for any address that does not exist.
- `favicon.svg`: the tab icon.
- `_headers`: security headers and cache times. Scripts only load from this site, no inline scripts.
- `_redirects`: short links like `/github`, and old links sent to their new tab.
- `robots.txt` and `sitemap.xml`: for search engines.
- `.well-known/security.txt`: how to report a security problem.
- `docs/`: notes for people working on the site. Not deployed. Start at `docs/README.md`.

## Checks

`.github/scripts/check-site.sh` checks every page for broken local links and #anchors, broken
script imports, inline scripts, the glass top bar (brand link, five section links, menu button) on every page with the right tab marked, no
leftover thumb index or folio, the back link on every project page, `width` and `height` on every image, photos over 200 KB, the one
project the owner keeps off the site, sitemap
addresses, em dashes, bad redirect lines and redirect targets, a security.txt that expires within
30 days, a missing or loosened Content-Security-Policy, and files over 25 MiB. It runs on every push and pull request. Run it locally before pushing:

    .github/scripts/check-site.sh

## Deploy

Hosted on Cloudflare Pages, project `endyland-portfolio`.

Pushes to `main` deploy automatically through GitHub Actions (`.github/workflows/deploy.yml`).
Pull requests only run the checks. They never deploy.
Each deploy adds `version.txt` with the commit, and the run checks endyland.com serves it.

Manual fallback: `~/endyland-infra/scripts/deploy-portfolio.sh`.

Other addresses on the domain run separately.
