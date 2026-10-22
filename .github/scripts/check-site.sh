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

# 1d. The tab bar is on every main page, with all four tabs and exactly the right one marked current.
tabpages="index.html web-design/index.html research/index.html startup-work/index.html projects/index.html"
for page in $tabpages; do
  [ -f "$page" ] || { err "$page is missing"; continue; }
  grep -q 'class="tabbar"' "$page" || err "$page has no tab bar"
  for t in web-design research startup-work projects; do
    grep -q "href=\"/$t/\"" "$page" || err "$page tab bar has no link to /$t/"
  done
  want="/$(dirname "$page")/"; [ "$page" = index.html ] && want="/"
  n=$(grep -o 'aria-current="page"' "$page" | wc -l | tr -d ' ')
  [ "$n" = 1 ] || err "$page marks $n links as the current page, want 1"
  grep -qE "href=\"$want\"( [^>]*)? aria-current=\"page\"" "$page" || err "$page does not mark $want as the current tab"
done

# 1e. Every sitemap address is a real page.
if [ -f sitemap.xml ]; then
  for loc in $(grep -oE '<loc>[^<]+</loc>' sitemap.xml | sed -E 's|<loc>https://endyland\.com/?||; s|</loc>||'); do
    f="${loc}index.html"; [ -n "$loc" ] || f=index.html
    [ -f "$f" ] || err "sitemap.xml lists /$loc but $f does not exist"
  done
fi

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
