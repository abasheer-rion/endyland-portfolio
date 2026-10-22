#!/usr/bin/env bash
# Rebuilds vendor/three-r<N>.min.js: a small three.js file with only the parts js/scene.js imports.
#   .github/scripts/vendor-three.sh 0.186.1
# Needs node and npm. Downloads three and esbuild into a temp folder, nothing is installed here.
# If you add a three.js import to js/scene.js, run this again.
set -euo pipefail
ver=${1:?three.js version, for example 0.186.1}
esbuild_ver=0.28.2
cd "$(dirname "$0")/../.."
site=$PWD
rev=${ver#0.}; rev=r${rev%%.*}
out="vendor/three-$rev.min.js"

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
(cd "$tmp" && npm pack --silent "three@$ver" >/dev/null && tar xzf "three-$ver.tgz" \
  && npm init -y >/dev/null && npm i --silent --no-audit --no-fund --save-exact "esbuild@$esbuild_ver")

# The names inside the import { ... } from '../vendor/three-...' block of js/scene.js.
names=$(node -e '
  const s = require("fs").readFileSync(process.argv[1], "utf8");
  const m = s.match(/import\s*\{([^}]*)\}\s*from\s*["\x27]\.\.\/vendor\/three-[^"\x27]+["\x27]/);
  if (!m) { console.error("no three.js import found in js/scene.js"); process.exit(1); }
  console.log(m[1].split(",").map(x => x.trim()).filter(Boolean).join(", "));
' "$site/js/scene.js")

echo "export { $names } from './package/build/three.module.js';" > "$tmp/entry.js"
"$tmp/node_modules/.bin/esbuild" "$tmp/entry.js" --bundle --minify --format=esm --target=es2020 \
  --legal-comments=none --banner:js="/* three.js $ver, MIT License, https://github.com/mrdoob/three.js. Only the parts js/scene.js uses. License: /vendor/three-LICENSE.txt */" \
  --outfile="$site/$out" --log-level=warning
echo "Wrote $out: $(wc -c < "$out" | tr -d ' ') bytes, $(gzip -9c "$out" | wc -c | tr -d ' ') gzipped."
echo "If the file name changed, update the import in js/scene.js and the cache rule in _headers."
