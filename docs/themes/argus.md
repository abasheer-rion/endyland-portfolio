# Theme brief: Argus

Pages: `/startup-work/argus/` and its sub-projects `argus-dashboard`, `argus-one`, `argus-edge-board`, `argus-site`.
Tokens: `/startup-work/argus/brand.css` (light website). `argus-dashboard/style.css` overrides them with the app's dark mode.

- Colors (website): white page, ink `#1A1A1A`, muted `#5A5A55`, red `#DC2626`, deep red `#B91C1C` (links), red wash `#FEF2F2`,
  dark panels `#1D1D1D`.
- Colors (app dark mode, Dashboard page): `#171717` to `#383838`, maroon `#A8293F` and `#C0384F` (shapes and buttons; links use `#F28B9C`).
- Fonts: Fraunces serif for display, key phrase in red and underlined. Inter for body. JetBrains Mono for uppercase
  spaced labels and numbers. All Google Fonts.
- Logo: `/startup-work/argus/img/logo.webp` (black camera-aperture mark with a red gear, spaced "ARGUS"), and
  `img/mark.webp` (the mark alone). The dashboard page inverts the logo for its dark background.
- Motifs: faint dot grid, soft red glow, frosted glass cards, tilted dashboard mockup ("Good morning, Maria"), big stat
  blocks like "96.4%". Plain-spoken, for store owners. The register and camera brand logo strip on the live site is
  third-party logos; leave it out.
- Motion ideas:
  - Camera stills with detection boxes that draw on and show a risk score counting up (Argus One).
  - The aperture logo opens on page load.
  - Stat numbers count up when they scroll into view (project.js already does this for `.stats`).
  - Dashboard mockup tilts toward the cursor.
  - Sub-project cards expand in place on the Argus page.
- Images: `argus/img/` hero (1440x796, cookie banner cropped out), logo, mark, thumb. `argus-dashboard/img/dashboard.webp`,
  `threat.webp` and `analytics.webp` (from the app's demo account), `argus-one/img/camera.webp` (632x350, example view
  recreated for the Argus site), `argus-site/img/site.webp` (1440x712), `phone.webp`, `numbers.webp` and `app.webp`,
  `argus-edge-board/img/board.webp` (stock, credited).
- In the Argus repos, not copied: store camera stills, dashboard renders, cam-aisle.mp4, model training charts.
- Do not name cofounders or teammates.
