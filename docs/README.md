# Docs index

Notes for people working on the site. Not deployed. Site overview is `../README.md`.

| File | What it is |
|---|---|
| `DESIGN.md` | The rules: pages, content map, the book look, readability, motion, shared code, page builder limits. Read first. |
| `redesign-2026-11.md` | Living doc for the November 2026 redesign: what changed, what was verified, what is still open. |
| `home-sections.md` | How the home page is built and how to add a Recently added item or change a room chapter. |
| `projects.json` | Manifest of every project page: theme, images, links. Read by the check script. |
| `brand.md` | The endyland logo mark: files, geometry, colours, where each file is used. |
| `seo.md` | Search metadata: titles, descriptions, social images, structured data, sitemap, and how to add a page. |
| `code-page.md` | The `/code/` GitHub page: where the numbers come from, the daily refresh job, the token it needs. |
| `models.md` | The 3D model kit in `shared/models/`: markup, model names, options, how to add one. |
| `themes/` | One brief per branded project or tab: colors, fonts, logo, motifs, assets. |
| `research-figures.py` | Script that draws the research page figures. |
| `make-og.py`, `make-sitemap.py` | Redraw the social images and regenerate `sitemap.xml`. See `seo.md`. |

Related: `../THIRD_PARTY.md` (licenses and image sources), `../../CHANGELOG.md` (history for the whole box),
`../.github/scripts/check-site.sh` (the checks that run on every push).
