#!/usr/bin/env bash
set -euo pipefail

root="${1:-/root/projects/smallphoneai}"
payload_dir="${SMALLPHONEAI_APK_PRODUCT_PAYLOAD_DIR:-$root/openhouseai-app/app/src/main/assets/openhouse/product-payloads}"

log() {
  printf '[SmallPhoneAI] %s\n' "$*"
}

die() {
  printf '[SmallPhoneAI] ERROR: %s\n' "$*" >&2
  exit 1
}

first_existing_dir() {
  local candidate
  for candidate in "$@"; do
    if [ -d "$candidate" ]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done
  return 1
}

require_payload_contract() {
  local name="$1"
  local source="$2"

  [ -d "$source" ] || die "$name source directory does not exist: $source"
  [ -f "$source/scripts/install.sh" ] || die "$name source missing scripts/install.sh: $source"
  [ -f "$source/scripts/check.sh" ] || die "$name source missing scripts/check.sh: $source"
}

write_payload() {
  local name="$1"
  local source="$2"
  local archive="$3"

  require_payload_contract "$name" "$source"

  log "Packaging $name from $source"
  tar \
    --exclude='./.git' \
    --exclude='./.git/*' \
    -czf "$payload_dir/$archive" \
    -C "$source" \
    .
}

service_manager_source="${SMALLPHONEAI_SERVICE_MANAGER_SOURCE:-$(first_existing_dir /root/projects/service-manager "$root/../service-manager" || true)}"
cc_connect_source="${SMALLPHONEAI_CC_CONNECT_SOURCE:-$(first_existing_dir /root/cc-connect-fresh /root/cc-connect "$root/../openhouse-connect" "$root/../cc-connect" || true)}"
smallphone_source="${SMALLPHONEAI_SMALLPHONE_SOURCE:-$(first_existing_dir /root/projects/smallphone/smallphone-active "$root/../smallphone-active" "$root/../smallphone" || true)}"

[ -n "$service_manager_source" ] || die "service-manager source not found; set SMALLPHONEAI_SERVICE_MANAGER_SOURCE"
[ -n "$cc_connect_source" ] || die "cc-connect/openhouse-connect source not found; set SMALLPHONEAI_CC_CONNECT_SOURCE"
[ -n "$smallphone_source" ] || die "SmallPhone source not found; set SMALLPHONEAI_SMALLPHONE_SOURCE"

mkdir -p "$payload_dir"

write_payload "service-manager" "$service_manager_source" "service-manager.tar.gz"
write_payload "cc-connect/openhouse-connect" "$cc_connect_source" "openhouse-connect.tar.gz"
write_payload "SmallPhone" "$smallphone_source" "smallphone.tar.gz"

{
  printf '{\n'
  printf '  "schema": 1,\n'
  printf '  "assetRoot": "openhouse/product-payloads",\n'
  printf '  "payloads": [\n'
  printf '    { "id": "service-manager", "archive": "service-manager.tar.gz", "sha256": "%s" },\n' "$(sha256sum "$payload_dir/service-manager.tar.gz" | awk '{print $1}')"
  printf '    { "id": "openhouse-connect", "archive": "openhouse-connect.tar.gz", "sha256": "%s" },\n' "$(sha256sum "$payload_dir/openhouse-connect.tar.gz" | awk '{print $1}')"
  printf '    { "id": "smallphone", "archive": "smallphone.tar.gz", "sha256": "%s" }\n' "$(sha256sum "$payload_dir/smallphone.tar.gz" | awk '{print $1}')"
  printf '  ]\n'
  printf '}\n'
} > "$payload_dir/payload-manifest.json"

"$root/scripts/check-apk-product-payloads.sh" "$root"
log "APK product payloads are ready in $payload_dir"
