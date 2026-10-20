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

# 1. Every local href/src in the HTML pages points at a real file.
for page in index.html 404.html; do
  [ -f "$page" ] || { err "$page is missing"; continue; }
  refs=$(grep -oE '(href|src)="[^"]*"' "$page" | sed -E 's/^(href|src)="//; s/"$//' || true)
  for ref in $refs; do
    case "$ref" in
      http:*|https:*|//*|mailto:*|tel:*|data:*|\#*) continue ;;
    esac
    target=${ref%%#*}
    target=${target%%\?*}
    target=${target#/}
    case "$target" in
      "") target=index.html ;;
      */) target="${target}index.html" ;;
    esac
    [ -f "$target" ] || [ -f "$target.html" ] || err "$page links to $ref but $target does not exist"
  done
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
    elif [ $# -eq 3 ]; then
      case "$3" in 301|302|307|308) ;; *) err "_redirects line $n has status $3" ;; esac
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
