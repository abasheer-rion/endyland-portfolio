# endyland.com

Personal site of Ayan Basheer, live at https://endyland.com.

One static page. The 3D shape behind it is the radiation pattern of a 6 by 6 antenna array,
computed in the browser from the array factor and drawn with three.js. It steers toward the
pointer, swings toward whichever project you hover, and orbits as you scroll. Reduced-motion
settings get a still image.

## Files

- `index.html`: the page, styles and the beam code.
- `three.min.js`: three.js r128, MIT license (see `THIRD_PARTY.md`).
- `favicon.svg`

## Deploy

Hosted on Cloudflare Pages, project `endyland-portfolio`.

    wrangler pages deploy . --project-name endyland-portfolio --branch main

Other addresses on the domain: `movie.` and `parking.` run separately.
