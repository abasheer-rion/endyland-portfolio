#!/usr/bin/env bash
# Checks the site files before deploy. Runs in CI and locally:
#   .github/scripts/check-site.sh
# Bash only. If started with another shell (zsh, sh), rerun under plain bash.
case "${BASH_VERSION:-none}:${SHELLOPTS:-}" in
  none:*|*posix*) exec bash "$0" "$@" ;;
esac
set -euo pipefail
set -f  # no glob expansion when splitting lines into words

cd "$(dirname "$0")/../.."
fail=0
err() { echo "FAIL: $*" >&2; fail=1; }

# Every HTML page in the site, wherever it lives.
pages=$(find . -name '*.html' -not -path './.git/*' -not -path './node_modules/*' | sed 's|^\./||' | sort)
[ -f index.html ] || err "index.html is missing"
[ -f 404.html ] || err "404.html is missing"

# resolve <from-file> <ref>: prints the file a local link points at ("" for a same-page link).
resolve() {
  local from=$1 ref=$2 target
  target=${ref%%#*}
  target=${target%%\?*}
  case "$target" in
    "") echo ""; return ;;
    /*) target=${target#/} ;;
    *) target="$(dirname "$from")/$target"; target=${target#./} ;;
  esac
  case "$target" in
    "") target=index.html ;;
    */) target="${target}index.html" ;;
  esac
  echo "$target"
}
# has_id <file> <id>: the page has an element with that id.
has_id() { grep -qE "id=\"$2\"" "$1"; }

# 1. Every local href/src in every page points at a real file, and every #anchor at a real id.
for page in $pages; do
  refs=$(grep -oE '(href|src)="[^"]*"' "$page" | sed -E 's/^(href|src)="//; s/"$//' || true)
  for ref in $refs; do
    case "$ref" in
      http:*|https:*|//*|mailto:*|tel:*|data:*) continue ;;
    esac
    frag=""
    case "$ref" in *\#*) frag=${ref#*#} ;; esac
    case "$ref" in /privacy/|/terms/) [ -f "${ref#/}index.html" ] || continue ;; esac  # legal pages come from the legal pass
    target=$(resolve "$page" "$ref")
    [ -n "$target" ] || target=$page
    if [ -f "$target" ]; then :
    elif [ -f "$target.html" ]; then target="$target.html"
    elif [ -f "$target/index.html" ]; then target="$target/index.html"
    else err "$page links to $ref but $target does not exist"; continue
    fi
    if [ -n "$frag" ] && [ "${target##*.}" = html ]; then
      has_id "$target" "$frag" || err "$page links to $ref but $target has no id=\"$frag\""
    fi
  done
done

# 1b. Every import in the site's own JS points at a real file. No bare package names.
jsfiles=$(find . -name '*.js' -not -path './.git/*' -not -path './.github/*' -not -path './shared/vendor/*' -not -path './node_modules/*' | sed 's|^\./||' | sort)
for js in $jsfiles; do
  # Comment lines are skipped, so examples in comments do not count.
  imps=$(grep -vE '^[[:space:]]*(//|/?\*)' "$js" | grep -oE "(from|import)[[:space:]]*\(?[[:space:]]*['\"][^'\"]+['\"]" | sed -E "s/^[^'\"]*['\"]//; s/['\"]$//" || true)
  for imp in $imps; do
    case "$imp" in
      /*) target=${imp#/} ;;
      .*) target="$(dirname "$js")/$imp" ;;
      *) err "$js imports \"$imp\". Browsers need a path like ./x.js or /shared/x.js"; continue ;;
    esac
    [ -f "$target" ] || err "$js imports $imp but $target does not exist"
  done
done

# 1c. No inline scripts. The CSP blocks them, so they would silently not run.
for page in $pages; do
  if grep -qE '<script( [^>]*)?>[[:space:]]*[^<[:space:]]' "$page" || grep -E '<script' "$page" | grep -vq 'src='; then
    err "$page has an inline <script>. Move it to a .js file."
  fi
done

# 1d. The glass top bar and plain footer are on every page; the old thumb index and folio are gone.
# It is <header class="bar"> holding <nav class="bar-nav" aria-label="Sections"> with five links, plus a brand link home.
tabs="web-design research startup-work projects experience"
tabpages="index.html web-design/index.html research/index.html startup-work/index.html projects/index.html experience/index.html"
# bar_block <file>: prints the header.bar markup.
bar_block() { awk '/<header class="bar"/{p=1} p{print} /<\/header>/{if(p) exit}' "$1"; }
# nav_block <file>: prints the <nav> inside it.
nav_block() { bar_block "$1" | awk '/<nav /{p=1} p{print} /<\/nav>/{if(p) exit}'; }
for page in $pages; do
  if grep -qE 'class="tabbar|<header class="tabbar|class="thumbs"|class="folio"' "$page"; then err "$page still has the old thumb index, folio or top bar"; fi
  block=$(bar_block "$page")
  [ -n "$block" ] || { err "$page has no top bar (<header class=\"bar\">)"; continue; }
  nb=$(nav_block "$page")
  echo "$nb" | grep -q 'aria-label="Sections"' || err "$page top bar nav has no aria-label=\"Sections\""
  for t in $tabs; do
    echo "$nb" | grep -q "href=\"/$t/\"" || err "$page top bar has no link to /$t/"
  done
  n=$(echo "$nb" | grep -oE '<a ' | wc -l | tr -d ' ')
  [ "$n" = 5 ] || err "$page top bar nav has $n links, want 5"
  echo "$block" | grep -qE '<a class="bar-brand" href="/"' || err "$page top bar has no brand link home"
  echo "$block" | grep -q 'class="bar-menu"' || err "$page top bar has no menu button"
  grep -q 'class="site-footer"' "$page" || err "$page has no footer (footer.site-footer)"
  foot=$(awk '/<footer class="site-footer"/{p=1} p{print} /<\/footer>/{if(p) exit}' "$page")
  for l in 'href="/privacy/"' 'href="/terms/"' 'href="/#contact"' 'github.com/abasheer-rion' 'linkedin.com/in/ayanbasheer'; do
    echo "$foot" | grep -q "$l" || err "$page footer has no link $l"
  done
  if grep -qiE 'colophon|class="folio|prefers-reduced-motion' "$page"; then err "$page mentions colophon, a folio or reduced motion"; fi
  grep -q 'class="skip"' "$page" || err "$page has no skip link"
  grep -q '/shared/base.css' "$page" || err "$page does not load /shared/base.css"
  grep -q '/shared/nav.js' "$page" || err "$page does not load /shared/nav.js (the top bar needs it)"
  # The skip link comes before the bar.
  sk=$(grep -n 'class="skip"' "$page" | head -1 | cut -d: -f1); hb=$(grep -n '<header class="bar"' "$page" | head -1 | cut -d: -f1)
  [ -z "$sk" ] || [ -z "$hb" ] || [ "$sk" -lt "$hb" ] || err "$page has the skip link after the top bar"
done
# A tab page marks its tab aria-current="page" (home marks none).
for page in $tabpages; do
  [ -f "$page" ] || { err "$page is missing"; continue; }
  want="/$(dirname "$page")/"; [ "$page" = index.html ] && want="/"
  n=$( (nav_block "$page" | grep -o 'aria-current' || true) | wc -l | tr -d ' ')
  if [ "$want" = "/" ]; then
    [ "$n" = 0 ] || err "$page (home) marks $n top bar links as current, want 0"
  else
    [ "$n" = 1 ] || err "$page marks $n top bar links as current, want 1"
    nav_block "$page" | grep -qE "href=\"$want\"( [^>]*)? aria-current=\"page\"" || err "$page does not mark $want as the current tab"
  fi
done

# 1d2. Every project page (/<tab>/<slug>/index.html) marks its own tab aria-current="true" in the top bar,
# and has a link back to its tab.
for t in $tabs; do
  for page in $(find "$t" -mindepth 2 -maxdepth 2 -name index.html 2>/dev/null | sort); do
    n=$(nav_block "$page" | grep -oE 'aria-current="(page|true)"' | wc -l | tr -d ' ')
    [ "$n" = 1 ] || err "$page marks $n tab links as current, want 1"
    nav_block "$page" | grep -qE "href=\"/$t/\"( [^>]*)? aria-current=\"true\"" || err "$page does not mark /$t/ as its tab"
    grep -qE "class=\"back-link\" href=\"/$t/\"" "$page" || err "$page has no back link to /$t/"
  done
done

# 1d3. Every <img> in a page has width and height, so nothing jumps while it loads.
for page in $pages; do
  bad=$(grep -oE '<img [^>]*>' "$page" | grep -vE 'width="[0-9]+"' | head -1 || true)
  [ -z "$bad" ] || err "$page has an <img> with no width: $bad"
  bad=$(grep -oE '<img [^>]*>' "$page" | grep -vE 'height="[0-9]+"' | head -1 || true)
  [ -z "$bad" ] || err "$page has an <img> with no height: $bad"
done

# 1d4. Photos in the site stay small (200 KB). Optimize to WebP or AVIF first.
while IFS= read -r f; do
  size=$(wc -c < "$f" | tr -d ' ')
  [ "$size" -le 204800 ] || err "$f is $size bytes, over 200 KB. Optimize it."
done < <(find . -type f \( -name '*.webp' -o -name '*.avif' -o -name '*.jpg' -o -name '*.jpeg' -o -name '*.png' \) -not -path './.git/*' -not -path './docs/*')

# 1d5. The owner asked that one personal project never appears on the site. Keep it out of every file.
if grep -rIilE 'park[ -]?with[ -]?love' --exclude-dir=.git --exclude-dir=.github . >/dev/null 2>&1; then
  err "the site mentions a project the owner asked to keep off it: $(grep -rIilE 'park[ -]?with[ -]?love' --exclude-dir=.git --exclude-dir=.github . | tr '\n' ' ')"
fi

# 1e. Every sitemap address is a real page.
if [ -f sitemap.xml ]; then
  for loc in $(grep -oE '<loc>[^<]+</loc>' sitemap.xml | sed -E 's|<loc>https://endyland\.com/?||; s|</loc>||'); do
    f="${loc}index.html"; [ -n "$loc" ] || f=index.html
    case "$loc" in privacy/|terms/) [ -f "$f" ] || continue ;; esac  # legal pages come from the legal pass
    [ -f "$f" ] || err "sitemap.xml lists /$loc but $f does not exist"
  done
fi

# 1e2. The sitemap lists /privacy/ and /terms/, and once those pages exist they carry the same chrome (checked above).
for loc in privacy terms; do
  grep -q "<loc>https://endyland.com/$loc/</loc>" sitemap.xml || err "sitemap.xml does not list /$loc/"
done

# 1e3. Shared CSS and JS ignore reduced motion, and have no drop caps or colophon.
for f in $(find shared -maxdepth 1 -type f \( -name '*.css' -o -name '*.js' \)); do
  if grep -qE 'prefers-reduced-motion|first-letter|dropcap|colophon' "$f"; then err "$f has a reduced-motion rule, a drop cap or a colophon"; fi
done

# 1f. No em dashes in page text. House style.
for page in $pages; do
  if grep -qE '—|&mdash;' "$page"; then err "$page has an em dash"; fi
done

# 2. _redirects: 2 or 3 fields, status 301/302/307/308.
if [ -f _redirects ]; then
  n=0
  while IFS= read -r line || [ -n "$line" ]; do
    n=$((n + 1))
    case "$line" in ''|\#*) continue ;; esac
    # shellcheck disable=SC2086 # split on purpose; globbing is off
    set -- $line
    if [ $# -lt 2 ] || [ $# -gt 3 ]; then
      err "_redirects line $n has $# fields: $line"
    else
      if [ $# -eq 3 ]; then
        case "$3" in 301|302|307|308) ;; *) err "_redirects line $n has status $3" ;; esac
      fi
      case "$2" in
        /*)
          dest=$(resolve index.html "$2"); frag=""
          case "$2" in *\#*) frag=${2#*#} ;; esac
          if [ ! -f "$dest" ]; then err "_redirects line $n sends to $2 but $dest does not exist"
          elif [ -n "$frag" ] && ! has_id "$dest" "$frag"; then err "_redirects line $n sends to $2 but $dest has no id=\"$frag\""
          fi ;;
      esac
    fi
  done < _redirects
fi

# 3. security.txt has Contact and an Expires at least 30 days out.
sec=.well-known/security.txt
if [ -f "$sec" ]; then
  grep -qi '^Contact:' "$sec" || err "$sec has no Contact line"
  expires=$(grep -i '^Expires:' "$sec" | head -1 | sed -E 's/^[Ee]xpires:[[:space:]]*//' | tr -d '\r')
  if [ -z "$expires" ]; then
    err "$sec has no Expires line"
  else
    # GNU date first, then BSD (macOS) date.
    exp_s=$(date -u -d "$expires" +%s 2>/dev/null \
      || date -u -j -f '%Y-%m-%dT%H:%M:%S' "$(echo "$expires" | sed -E 's/(\.[0-9]+)?Z$//')" +%s 2>/dev/null \
      || echo "")
    if [ -z "$exp_s" ]; then
      err "$sec Expires is not a date: $expires"
    else
      days=$(( (exp_s - $(date -u +%s)) / 86400 ))
      if [ "$days" -lt 0 ]; then
        err "$sec expired on $expires"
      elif [ "$days" -lt 30 ]; then
        err "$sec expires in $days days ($expires). Push the date out."
      fi
    fi
  fi
else
  err "$sec is missing"
fi

# 4. _headers sets a Content-Security-Policy.
grep -q 'Content-Security-Policy' _headers 2>/dev/null || err "_headers has no Content-Security-Policy"
if grep -E 'Content-Security-Policy' _headers 2>/dev/null | grep -oE "script-src[^;]*" | grep -qE "unsafe-inline|unsafe-eval"; then
  err "_headers script-src allows unsafe-inline or unsafe-eval"
fi

# 5. No file over 25 MiB (Cloudflare Pages limit).
limit=$((25 * 1024 * 1024))
while IFS= read -r f; do
  size=$(wc -c < "$f" | tr -d ' ')
  [ "$size" -le "$limit" ] || err "$f is $size bytes, over the 25 MiB Pages limit"
done < <(find . -type f -not -path './.git/*')

if [ "$fail" -ne 0 ]; then
  echo "Site checks failed." >&2
  exit 1
fi
echo "Site checks passed."
