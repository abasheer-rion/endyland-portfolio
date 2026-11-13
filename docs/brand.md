# endyland brand mark

The mark is a capital E for endyland. Its spine and three arms are drawn as one trace, 8 units wide on a 64 unit grid.
Each arm stops short and is followed by a dot. The arms get shorter from top to bottom, so the three dots sit on a
slanted line: a three-element antenna array with a steered wavefront. This file is not deployed.

## Files

| File | Use |
|---|---|
| `shared/brand/logo.svg` | Mark, two colour, for paper and other light backgrounds (ink E, rust dots) |
| `shared/brand/logo-on-dark.svg` | Mark, two colour, for leather and other dark backgrounds (paper E, foil dots) |
| `shared/brand/logo-mono.svg` | Mark, one colour (ink). Also the CSS mask for the top bar when JS is off |
| `shared/brand/logo-mono-on-dark.svg` | Mark, one colour (paper) |
| `shared/brand/logo-wordmark.svg`, `logo-wordmark-on-dark.svg` | Mark and the word "endyland" in Newsreader italic 500. The word is live text, so as an `<img>` it falls back to Georgia; inline it on a page that loads Newsreader |
| `favicon.svg` | Mark on a rounded leather tile |
| `shared/brand/icon-32.png` | PNG favicon for browsers without SVG icons |
| `apple-touch-icon.png` | 180px, square leather tile |
| `shared/brand/icon-192.png`, `icon-512.png` | Manifest icons, square, mark inside the maskable safe zone |
| `site.webmanifest` | Name, colours, icons |
| `shared/brand/og-default.png` | 1200x630 default social image |

The top bar draws the mark inline from `shared/nav.js` (class `bar-mark`), styled in `shared/base.css`. The E takes
the bar's text colour and the dots take its accent, so it follows the dark and light tint.

## Geometry

- Grid: `viewBox="0 0 64 64"`.
- E: `M36 12H12V52H20M12 32H28`, stroke 8, round caps and joins, no fill.
- Dots: radius 6 at (52,12), (44,32), (36,52).
- Every edge sits on a 4 unit line, so the mark lands on whole pixels at 16px and 32px.

## Colours

| Background | E | Dots |
|---|---|---|
| Leather `#26180F`, walnut, ink | Paper `#EFE3C8` | Foil `#D9AE4A` |
| Paper `#EFE3C8`, vellum | Ink `#17100A` | Rust `#9C4A22` |
| One colour | Ink, paper or foil | Same as the E |

## Clear space and size

- Keep one stroke width (8 units, an eighth of the mark's height) clear on every side.
- Smallest size: 16px. Under 24px prefer the one-colour version on busy backgrounds.
- With the word: the gap between mark and word is a quarter of the mark's height.

## Don'ts

- Don't put it in a circle or add a gradient, shadow, glow or outline.
- Don't change the arm lengths or line the dots up vertically.
- Don't use brass or foil dots on paper (too faint); use rust.
- Don't rotate, stretch or recolour it outside the table above.
- Don't set the word in another typeface or in upright capitals.

## Remaking the PNGs

Open the SVG in headless Chrome at the exact window size with `--screenshot`, device scale 1. The square icons use the
favicon tile with `rx="0"` and the mark at 64% (192, 512) or 70% (180). The social image is a 1200x630 HTML page
(leather, a foil stipple field behind the mark, Newsreader and Instrument Sans) captured the same way.
