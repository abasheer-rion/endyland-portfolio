#!/usr/bin/env bash
# Rebuilds shared/vendor/three-r<N>.module.min.js: the whole three.js core as one minified ES module.
#   .github/scripts/vendor-three.sh 0.186.1
# Every page imports from this one file, so a tab can use any three.js class without a rebuild.
# Needs node and npm. Downloads three and esbuild into a temp folder, nothing is installed here.
# Pick a three.js release that is at least 2 weeks old.
set -euo pipefail
ver=${1:?three.js version, for example 0.186.1}
esbuild_ver=0.28.2
cd "$(dirname "$0")/../.."
site=$PWD
rev=${ver#0.}; rev=r${rev%%.*}
out="shared/vendor/three-$rev.module.min.js"

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
(cd "$tmp" && npm pack --silent "three@$ver" >/dev/null && tar xzf "three-$ver.tgz" \
  && npm init -y >/dev/null && npm i --silent --no-audit --no-fund --save-exact "esbuild@$esbuild_ver")

echo "export * from './package/build/three.module.js';" > "$tmp/entry.js"
"$tmp/node_modules/.bin/esbuild" "$tmp/entry.js" --bundle --minify --format=esm --target=es2020 \
  --legal-comments=none --banner:js="/* three.js $ver, MIT License, https://github.com/mrdoob/three.js. License: /shared/vendor/three-LICENSE.txt */" \
  --outfile="$site/$out" --log-level=warning
cp "$tmp/package/LICENSE" "$site/shared/vendor/three-LICENSE.txt"
echo "Wrote $out: $(wc -c < "$out" | tr -d ' ') bytes, $(gzip -9c "$out" | wc -c | tr -d ' ') gzipped."
echo "If the file name changed, update every import of it and THIRD_PARTY.md."
