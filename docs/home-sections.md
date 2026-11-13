# Home page sections

> **Current as of:** 2026-11-12 · **Code:** `index.html`, `home/home.css`, `home/home.js`, `home/scene.js`

The home page is one long scroll. Sections, in order:

| Section | Id | Notes |
|---|---|---|
| Hero | `#name` | Name and one sentence. The 3D endyland mark (`shared/models`, model `logo`) stands on the apex of a stippled gold beam drawn on a 2D canvas (`home/scene.js`). The beam follows the pointer. No WebGL or no script: a CSS dot pattern and the poster image. |
| About | `#about` | Four short paragraphs on one column. |
| Recently added | `#recent` | One large card and two small ones. See below. |
| Code | `#code` | A dot plate of the past year and two numbers, read from `/data/github.json`, linking to `/code/`. Without the file it keeps a sentence and the link. |
| Web design, Projects, Research, Experience, Startup work | `#web-design` and so on | Heading, one sentence, a link to the tab, and a list of picks. Research also holds the `patch-array` model, its beam angle tied to scroll. |
| Contact | `#contact` | Email, GitHub, LinkedIn. |

The top bar keeps the tab order (Web design, Research, Startup work, Projects, Experience, Code). The page shows the
chapters in the owner's order. Each chapter has `data-bar-section` so the bar's brass marker follows the one on screen.

## Add a "Recently added" item

1. Open `index.html` and find `<ul class="recent-row">`.
2. Copy one `<li class="rc">` block. The first item has `rc--lead` and is the large card.
3. Change the link, the image (`src` and an `alt` that says what the picture shows), the title and one sentence.
4. The image is a real screenshot saved as WebP, 800 by 450, under 200 KB. Keep `width`, `height`, `loading="lazy"`.
5. Keep three items. Move the oldest one out. Facts in the text must already be on the linked page.
6. Run `.github/scripts/check-site.sh`.

## Chapters

Each chapter is `<section class="sec room ...">`: a left column (`.room-lead`: heading, one sentence, link) and a list
`ol.picks`, one title and one sentence per item. `room--flip` swaps the columns. No numbers, badges or captions.

## Motion

- Scroll reveals use `data-reveal` and `data-reveal-group` from `shared/motion.js`.
- Hero letters rise 30 ms apart. The mark fades up. The beam resolves from scattered dots on load and steers to the pointer.
- The hero canvas stops when off screen or when the tab is hidden, and draws fewer dots on a phone.
- Reduced motion is ignored on purpose (owner decision).
