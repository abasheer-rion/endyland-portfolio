#!/usr/bin/env python3
"""Write sitemap.xml. Every index.html page is listed except pages with a noindex meta tag.
lastmod is the date of the last git commit touching the page's own files (index.html and the files beside it),
or the file modification date when those files have uncommitted changes."""
import os, re, subprocess, datetime, glob
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://endyland.com"
def sh(*a): return subprocess.run(a, cwd=ROOT, capture_output=True, text=True).stdout.strip()
pages = []
for f in glob.glob("**/index.html", root_dir=ROOT, recursive=True):
    if f.startswith(("shared/", "docs/", "node_modules/")): continue
    if re.search(r'name="robots"[^>]*noindex', open(os.path.join(ROOT, f)).read().split("</head>")[0]): continue
    d = os.path.dirname(f)
    pages.append(d)
def depth(d): return 0 if d == "" else d.count("/") + 1
order = {"": 0, "web-design": 1, "research": 2, "startup-work": 3, "projects": 4, "experience": 5, "code": 6}
pages.sort(key=lambda d: (order.get(d.split("/")[0], 9), depth(d), d))
pages.sort(key=lambda d: (depth(d) > 1, order.get(d.split("/")[0], 9), depth(d), d))
rows = []
for d in pages:
    files = [p for p in glob.glob(os.path.join(d, "*"), root_dir=ROOT) if os.path.isfile(os.path.join(ROOT, p))]
    dirty = [l for l in sh("git", "status", "--porcelain", "--", *files).splitlines() if l]
    if dirty:
        ts = max(os.path.getmtime(os.path.join(ROOT, p)) for p in files)
        day = datetime.date.fromtimestamp(ts).isoformat()
    else:
        day = (sh("git", "log", "-1", "--format=%cs", "--", *files) or datetime.date.today().isoformat())
    rows.append((BASE + "/" + (d + "/" if d else ""), day))
out = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
out += [f"  <url><loc>{u}</loc><lastmod>{m}</lastmod></url>" for u, m in rows]
out.append("</urlset>")
open(os.path.join(ROOT, "sitemap.xml"), "w").write("\n".join(out) + "\n")
print(len(rows), "urls")
