# endyland.com

Personal site of Ayan Basheer, live at https://endyland.com.

One static page. The 3D shape behind it is the radiation pattern of a 6 by 6 antenna array,
computed in the browser from the array factor and drawn with three.js. It steers toward the
pointer, swings toward whichever project you hover, and orbits as you scroll. Reduced-motion
settings get a still image. The beam code lives in `beam.js`.

## Files

- `index.html`: the page and its styles.
- `404.html`: the page shown for any address that does not exist.
- `beam.js`: the beam drawing.
- `three.min.js`: three.js r128, MIT license (see `THIRD_PARTY.md`).
- `favicon.svg`: the tab icon.
- `_headers`: security headers and cache times.
- `_redirects`: short links like `/github`.
- `robots.txt` and `sitemap.xml`: for search engines.
- `.well-known/security.txt`: how to report a security problem.

## Checks

`.github/scripts/check-site.sh` checks for broken local links, bad redirect lines, a
security.txt that expires within 30 days, a missing Content-Security-Policy, and files over
25 MiB. It runs on every push and pull request. Run it locally before pushing:

    .github/scripts/check-site.sh

## Deploy

Hosted on Cloudflare Pages, project `endyland-portfolio`.

Pushes to `main` deploy automatically through GitHub Actions (`.github/workflows/deploy.yml`).
Pull requests only run the checks. They never deploy.
Each deploy adds `version.txt` with the commit, and the run checks endyland.com serves it.

Manual fallback: `~/endyland-infra/scripts/deploy-portfolio.sh`.

Other addresses on the domain: `movie.` and `parking.` run separately.
