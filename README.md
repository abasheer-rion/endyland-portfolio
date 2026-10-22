# endyland.com

Personal site of Ayan Basheer, live at https://endyland.com.

A home page and four tabs, each with its own 3D scene and its own look. No build step: the files
here are the site. The plan, the content map and each tab's art direction are in `docs/DESIGN.md`.

- `/` the hub: a 6 by 6 antenna array whose beam is computed on the GPU and steers toward the
  pointer. Scrolling flies the camera through four stops: the array, four rooms (one node per tab,
  hovering a room swings the beam to it), about (a tunnel of pipes) and contact (a beacon).
- `/web-design/`, `/research/`, `/startup-work/`, `/projects/`: the four tabs.

All text is plain HTML. The canvases are decoration only.

- Reduced motion: still pictures, no loops, no page transitions.
- Phones and slow machines: lighter scenes and a lower resolution, which drops further if frames
  run slow. Scenes start after the page paints and stop while hidden or off screen.
- No WebGL 2: the canvas is hidden and a CSS gradient takes its place.

## Files

- `index.html` and `home/`: the home page, its styles, behaviour and beam scene.
- `web-design/`, `research/`, `startup-work/`, `projects/`: one folder per tab with `index.html`,
  `style.css`, `main.js`, `scene.js` and `img/` (placeholder images, replace each with a real one
  of the same name and keep `width` and `height` on the `img`).
- `shared/`: used by every page. `base.css` (tab bar, footer, badges, page transitions), `nav.js`
  (transition direction), `motion.js` (reduced motion and other helpers), `scene-loader.js` (starts
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
- `docs/`: notes for people working on the site. Not deployed.

## Checks

`.github/scripts/check-site.sh` checks every page for broken local links and #anchors, broken
script imports, inline scripts, the tab bar on all five pages with the right tab marked, sitemap
addresses, em dashes, bad redirect lines and redirect targets, a security.txt that expires within
30 days, a missing or loosened Content-Security-Policy, and files over 25 MiB. It runs on every push and pull request. Run it locally before pushing:

    .github/scripts/check-site.sh

## Deploy

Hosted on Cloudflare Pages, project `endyland-portfolio`.

Pushes to `main` deploy automatically through GitHub Actions (`.github/workflows/deploy.yml`).
Pull requests only run the checks. They never deploy.
Each deploy adds `version.txt` with the commit, and the run checks endyland.com serves it.

Manual fallback: `~/endyland-infra/scripts/deploy-portfolio.sh`.

Other addresses on the domain: `movie.` and `parking.` run separately.
