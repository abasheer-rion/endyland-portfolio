# Home page sections

> **Current as of:** 2026-11-11 · **Code:** `index.html`, `home/home.css`, `home/home.js`, `home/scene.js`

The home page is one long scroll. Sections, in order:

| # | Section | Id | Notes |
|---|---|---|---|
| 0 | Hero | `#name` | Name, lede, Latest note, proof numbers. A canvas of gold dots (the beam of a 6-element array) steers to the pointer. No WebGL or no script: a CSS dot pattern. |
| 1 | About | `#about` | Four short paragraphs, a pull quote, Now and Elsewhere lists. A sticky path on the left follows the paragraph being read. |
| 2 | Recently added | `#recent` | One big card, then a short list. See below. |
| 3 | 01 Web design | `#web-design` | Room chapter. |
| 4 | 02 Projects | `#projects` | Room chapter. |
| 5 | 03 Experience | `#experience` | Room chapter. |
| 6 | 04 Research | `#research` | Room chapter. |
| 7 | 05 Startup work | `#startup-work` | Room chapter. |
| 8 | Contact | `#contact` | Email and profile links. |

The top bar keeps the tab order (Web design, Research, Startup work, Projects, Experience). The page shows rooms in the
owner's order. Each room has `data-bar-section` so the bar's brass marker follows the room on screen.

## How to add a "Recently added" item

1. Open `index.html` and find `<ul class="recent-row">`.
2. Copy one `<li class="rc">` block. Put the new one at the top of the list for a normal item, or make it the big card
   by moving the `rc--lead` class onto it (only one `<li>` should have it).
3. Change four things: the link (`href`), the image (`src`, plus `alt` that says what the picture shows), the title and
   one sentence of text.
4. The image must be a real picture of the real thing: a fresh screenshot saved as WebP under 200 KB at 800 by 450, or a
   drawn SVG card like the Verizon one. No stock photos. Keep `width="800" height="450"`, `loading="lazy"`, `decoding="async"`.
5. Keep the list to four items. Move the oldest one out. Numbers in the text must already be on the linked page.
6. Run `.github/scripts/check-site.sh`.

Use `<span class="rc-win">` above the title only for a win. Nothing else gets that mark.

## How each room chapter is built

Each room is `<section class="sec room ...">` with a left column (big numeral, title, one paragraph, the Enter link)
and a right column (a drawn figure, then `ol.picks`, the featured work with a big number). To change a featured item,
edit its `<li class="pick">`: the number goes in `.big`, a `data-count` span counts up once when seen. Every number must
match the linked project page. To change a drawn figure, edit the SVG inside `figure.art`; it is decoration, and the
caption says in plain words what it shows.

## Motion and speed

- Entrances use an `IntersectionObserver` (`home.js`) and CSS only. There are no scroll handlers.
- Where the browser supports scroll timelines (Chrome, Safari 26), figures wipe open, headings wipe in and a thin line
  fills as you pass a room. Other browsers just show the content.
- The hero canvas stops when off screen or when the tab is hidden, uses at most 1.5x pixel ratio (1x on phones) and
  draws about 3 thousand dots on a phone instead of about 20 thousand.
- Below-the-fold sections use `content-visibility: auto`.
- Reduced motion is ignored on purpose (owner decision).
