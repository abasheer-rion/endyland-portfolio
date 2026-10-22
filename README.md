# endyland.com

Personal site of Ayan Basheer, live at https://endyland.com.

One static page with a 3D scene behind it. No build step: the files here are the site.

The scene is a 6 by 6 antenna array in an anechoic chamber. Its beam is the real radiation pattern,
computed on the GPU from the array factor, and it steers toward the pointer. Scrolling flies the
camera through five stops, one per section: the array, Argus (a store floor under cameras), projects
(one node per project; hovering a project swings the beam to it), about (a tunnel of pipes) and
contact (a beacon). All text is plain HTML on top. The canvas is decoration only.

- Reduced motion: one still picture of the array, no camera flight, no card tilt or reveal.
- Phones and slow machines: lower resolution and fewer particles. The resolution drops further if
  frames run slow. Drawing stops while the tab is hidden.
- No WebGL 2: the canvas is hidden and a soft gradient takes its place.

## Files

- `index.html`: the page.
- `css/site.css`: the styles.
- `js/main.js`: card tilt and reveal, then loads the scene if WebGL 2 works.
- `js/scene.js`: the 3D scene and the scroll camera.
- `vendor/three-r186.min.js`: three.js 0.186.1, trimmed to what `js/scene.js` imports. MIT license,
  text in `vendor/three-LICENSE.txt` (also see `THIRD_PARTY.md`). Rebuild it with
  `.github/scripts/vendor-three.sh 0.186.1` after adding a three.js import.
- `img/placeholders/`: stand-in project images. Replace each with a real one of the same name, or
  change the `src` in `index.html`. Keep `width` and `height` on the `img` so nothing shifts on load.
- `404.html`: the page shown for any address that does not exist.
- `favicon.svg`: the tab icon.
- `_headers`: security headers and cache times. Scripts only load from this site, no inline scripts.
- `_redirects`: short links like `/github`.
- `robots.txt` and `sitemap.xml`: for search engines.
- `.well-known/security.txt`: how to report a security problem.

## Checks

`.github/scripts/check-site.sh` checks for broken local links and script imports, inline
scripts, bad redirect lines, a security.txt that expires within 30 days, a missing or loosened
Content-Security-Policy, and files over 25 MiB. It runs on every push and pull request. Run it locally before pushing:

    .github/scripts/check-site.sh

## Deploy

Hosted on Cloudflare Pages, project `endyland-portfolio`.

Pushes to `main` deploy automatically through GitHub Actions (`.github/workflows/deploy.yml`).
Pull requests only run the checks. They never deploy.
Each deploy adds `version.txt` with the commit, and the run checks endyland.com serves it.

Manual fallback: `~/endyland-infra/scripts/deploy-portfolio.sh`.

Other addresses on the domain: `movie.` and `parking.` run separately.
