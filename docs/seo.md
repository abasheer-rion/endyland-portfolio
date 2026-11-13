# Search metadata

> **Current as of:** 2026-11-13 (built and checked, not committed or deployed) · **Code:** `<head>` of every page, `sitemap.xml`, `robots.txt`, `shared/brand/og/`, `docs/make-og.py`, `docs/make-sitemap.py`, `.github/scripts/check-site.sh`

## What exists

- **Every indexable page** has a unique title and description, a canonical URL, `lang="en"`, viewport, theme colour, icons and manifest, Open Graph tags (image 1200x630 with width, height and alt text) and a `summary_large_image` Twitter card.
- **Titles**: the home page is "Ayan Basheer - Electrical engineering student at UT Dallas | endyland". Other pages are "Page - Ayan Basheer", 60 characters or fewer. Descriptions are 155 characters or fewer.
- **Social images**: `shared/brand/og/` holds images for home, Safe Home, Argus, Parity, the RF direction finder and the five tabs. Other pages use `shared/brand/og-default.png`. `python3 docs/make-og.py` redraws them with headless Chrome. Edit the `IMAGES` table in that file to change the text.
- **Structured data** (JSON-LD in the head, `<script type="application/ld+json">`):
  - Home: Person (name, alternate name endyland, job title, UT Dallas, topics, LinkedIn and GitHub in `sameAs`) and WebSite.
  - Tab pages: CollectionPage and BreadcrumbList.
  - Project and write-up pages: TechArticle, CreativeWork or WebPage, plus BreadcrumbList. Safe Home carries the award and team.
  - `/code/`: ProfilePage about the Person.
  - Privacy and terms: WebPage and BreadcrumbList.
- **CSP**: JSON-LD is data, so the policy does not treat it as a script. Checked in headless Chrome with the production CSP: no violation, no hash needed. `_headers` is unchanged.
- **Sitemap**: `sitemap.xml` lists every page with an `index.html` that is not `noindex`. Regenerate with `python3 docs/make-sitemap.py`. `lastmod` is the last git commit date of the page's own files, or the file modification date when they have uncommitted changes.
- **robots.txt** allows everything except the model test page and points at the sitemap. `404.html` and the model test page are `noindex`.
- **Links**: the LinkedIn and GitHub links in page bodies carry `rel="me"`. Each page has one `<h1>`, headings do not skip levels, and every `<img>` has alt text, width and height.
- **Checks**: `.github/scripts/check-site.sh` fails when a sitemap page lacks a title, description, canonical, og:image (file must exist), Twitter card, icons, one h1 or valid JSON-LD, when two pages share a title or description, or when robots.txt does not name the sitemap.

## Adding a page

1. Create `section/slug/index.html`. Copy the head of a similar page.
2. Set a unique `<title>` ("Name - Ayan Basheer", 60 characters or fewer) and a description of 155 characters or fewer.
3. Set `canonical` and `og:url` to `https://endyland.com/section/slug/`. Point `og:image` at `og-default.png`, or add an entry to `docs/make-og.py` and run it.
4. Add a JSON-LD block with a BreadcrumbList (Home, section, page). Copy one from a sibling page and change the names and URLs.
5. Run `python3 docs/make-sitemap.py`, then `bash .github/scripts/check-site.sh`.

For a page that should not be indexed, add `<meta name="robots" content="noindex">` and leave it out of the sitemap (the script skips it).

## Not done in the repo

- No `favicon.ico`. Browsers use the SVG and PNG icons.
- No `www` redirect. The `_redirects` file only matches paths on one host, so a `www.endyland.com` to `endyland.com` redirect belongs in Cloudflare (a Redirect Rule). That is a DNS and domain change and needs the owner.
- The model test page sits behind a robots.txt block, so crawlers never read its `noindex`. It is not linked from anywhere.

## Steps only the owner can do

1. **Google Search Console**: add `endyland.com` as a Domain property, verify with the DNS TXT record Google gives, then Sitemaps, submit `https://endyland.com/sitemap.xml`. Use URL Inspection on `https://endyland.com/` and request indexing.
2. **Bing Webmaster Tools**: sign in, import the site from Search Console (or verify with a DNS record), submit the same sitemap.
3. **LinkedIn**: in the profile, Contact info, Website, add `https://endyland.com` (label "Portfolio"). Also use it in the profile's featured section.
4. **GitHub**: on the profile (Edit profile, URL field) add `https://endyland.com`. Do the same in the bio of the repository that backs the site.
5. **Cloudflare**: add a Redirect Rule from `www.endyland.com` to `https://endyland.com` if www is in use.
6. After deploy, check the previews with the LinkedIn Post Inspector and the Facebook Sharing Debugger for `https://endyland.com/` and `https://endyland.com/projects/safe-home/`. Social sites cache images, so run them again after any image change.
7. Rankings for the name take weeks. Links from LinkedIn, GitHub and any team or event pages that mention Ayan Basheer help most.
