#!/usr/bin/env sh
set -eu

root="${1:-/root/projects/smallphoneai}"
preview_dir="$root/openhouseai-ui-preview"

"$root/scripts/check-repos.sh" "$root"
"$root/scripts/check-product-scope.sh" "$root"
"$root/scripts/check-apk-product-payloads.sh" "$root"
"$root/scripts/smoke-bootstrap-registry-sync.sh" "$root"

if command -v npm >/dev/null 2>&1; then
  npm --prefix "$preview_dir" run build
else
  printf 'WARN npm is not available; skipped preview build\n'
fi

printf 'OK   SmallPhoneAI contract smoke check complete\n'
