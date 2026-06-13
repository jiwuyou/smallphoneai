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
  local payload_name="${3:-}"
  local required_description

  [ -d "$source" ] || die "$name source directory does not exist: $source"
  [ -f "$source/scripts/install.sh" ] || die "$name source missing scripts/install.sh: $source"
  [ -f "$source/scripts/check.sh" ] || die "$name source missing scripts/check.sh: $source"

  if required_description="$(payload_executable_description "$payload_name")"; then
    payload_source_contains_executable "$source" "$payload_name" \
      || die "$name source missing executable $required_description: $source"
  fi

  case "$payload_name" in
    openhouse-connect)
      [ -f "$source/scripts/register-service.sh" ] \
        || die "$name source missing scripts/register-service.sh: $source"
      grep -Fq 'detect_claude_cli' "$source/scripts/register-service.sh" \
        || die "$name source register-service.sh must auto-detect Claude CLI: $source"
      grep -Fq 'CC_CONNECT_BRIDGE_PORT' "$source/scripts/register-service.sh" \
        || die "$name source register-service.sh missing bridge port config: $source"
      grep -Fq 'CC_CONNECT_MANAGEMENT_PORT' "$source/scripts/register-service.sh" \
        || die "$name source register-service.sh missing management port config: $source"
      ;;
  esac
}

write_payload() {
  local name="$1"
  local source="$2"
  local archive="$3"
  local payload_name="${4:-}"

  require_payload_contract "$name" "$source" "$payload_name"

  log "Packaging $name from $source"
  tar \
    --exclude='.git' \
    --exclude='./.git' \
    --exclude='./.git/*' \
    --exclude='*/.git' \
    --exclude='*/.git/*' \
    --exclude='./.gocache' \
    --exclude='./.gocache/*' \
    --exclude='./.gomodcache' \
    --exclude='./.gomodcache/*' \
    --exclude='./.gopath' \
    --exclude='./.gopath/*' \
    --exclude='./web/node_modules' \
    --exclude='./web/node_modules/*' \
    --exclude='./web/dist' \
    --exclude='./web/dist/*' \
    --exclude='./node_modules' \
    --exclude='./node_modules/*' \
    --exclude='./target' \
    --exclude='./target/*' \
    --exclude='./dist' \
    --exclude='./dist/*' \
    -cf "$payload_dir/$archive" \
    -C "$source" \
    .

  case "$payload_name" in
    openhouse-connect)
      tar -xOf "$payload_dir/$archive" ./scripts/register-service.sh | grep -Fq 'detect_claude_cli' \
        || die "$name payload archive missing Claude CLI auto-detection: $payload_dir/$archive"
      ;;
  esac
}

payload_source_contains_executable() {
  local source="$1"
  local payload_name="$2"

  case "$payload_name" in
    service-manager)
      [ -x "$source/service-manager" ] || [ -x "$source/target/release/service-manager" ]
      ;;
    openhouse-connect)
      [ -x "$source/cc-connect" ]
      ;;
    *)
      return 1
      ;;
  esac
}

payload_executable_description() {
  case "$1" in
    service-manager)
      printf 'service-manager at service-manager or target/release/service-manager'
      ;;
    openhouse-connect)
      printf 'cc-connect at cc-connect'
      ;;
    *)
      return 1
      ;;
  esac
}

service_manager_source="${SMALLPHONEAI_SERVICE_MANAGER_SOURCE:-$(first_existing_dir /root/projects/service-manager "$root/../service-manager" || true)}"
cc_connect_source="${SMALLPHONEAI_CC_CONNECT_SOURCE:-$(first_existing_dir /root/openhouse-connect-fresh /root/cc-connect-fresh /root/cc-connect "$root/../openhouse-connect-fresh" "$root/../openhouse-connect" "$root/../cc-connect" || true)}"
smallphone_source="${SMALLPHONEAI_SMALLPHONE_SOURCE:-$(first_existing_dir /root/projects/smallphone/smallphone-active "$root/../smallphone-active" "$root/../smallphone" || true)}"

[ -n "$service_manager_source" ] || die "service-manager source not found; set SMALLPHONEAI_SERVICE_MANAGER_SOURCE"
[ -n "$cc_connect_source" ] || die "cc-connect/openhouse-connect source not found; set SMALLPHONEAI_CC_CONNECT_SOURCE"
[ -n "$smallphone_source" ] || die "SmallPhone source not found; set SMALLPHONEAI_SMALLPHONE_SOURCE"

mkdir -p "$payload_dir"
rm -f "$payload_dir/service-manager.tar.gz" "$payload_dir/openhouse-connect.tar.gz" "$payload_dir/smallphone.tar.gz"

write_payload "service-manager" "$service_manager_source" "service-manager.tar" "service-manager"
write_payload "cc-connect/openhouse-connect" "$cc_connect_source" "openhouse-connect.tar" "openhouse-connect"
write_payload "SmallPhone" "$smallphone_source" "smallphone.tar"

{
  printf '{\n'
  printf '  "schema": 1,\n'
  printf '  "assetRoot": "openhouse/product-payloads",\n'
  printf '  "payloads": [\n'
  printf '    { "id": "service-manager", "archive": "service-manager.tar", "sha256": "%s", "size": %s },\n' "$(sha256sum "$payload_dir/service-manager.tar" | awk '{print $1}')" "$(wc -c < "$payload_dir/service-manager.tar" | tr -d ' ')"
  printf '    { "id": "openhouse-connect", "archive": "openhouse-connect.tar", "sha256": "%s", "size": %s },\n' "$(sha256sum "$payload_dir/openhouse-connect.tar" | awk '{print $1}')" "$(wc -c < "$payload_dir/openhouse-connect.tar" | tr -d ' ')"
  printf '    { "id": "smallphone", "archive": "smallphone.tar", "sha256": "%s", "size": %s }\n' "$(sha256sum "$payload_dir/smallphone.tar" | awk '{print $1}')" "$(wc -c < "$payload_dir/smallphone.tar" | tr -d ' ')"
  printf '  ]\n'
  printf '}\n'
} > "$payload_dir/payload-manifest.json"

{
  printf '{\n'
  printf '  "schema": 1,\n'
  printf '  "generatedAt": "%s",\n' "$(date -u '+%Y-%m-%d')"
  printf '  "description": "SmallPhoneAI first-run offline payloads bundled inside the APK. Network and GitHub are optional update paths after boot.",\n'
  printf '  "components": [\n'
  printf '    { "id": "service-manager", "archive": "service-manager.tar", "targetDir": "service-manager", "sha256": "%s", "size": %s },\n' "$(sha256sum "$payload_dir/service-manager.tar" | awk '{print $1}')" "$(wc -c < "$payload_dir/service-manager.tar" | tr -d ' ')"
  printf '    { "id": "openhouse-connect", "aliases": ["cc-connect"], "archive": "openhouse-connect.tar", "targetDir": "openhouse-connect", "sha256": "%s", "size": %s },\n' "$(sha256sum "$payload_dir/openhouse-connect.tar" | awk '{print $1}')" "$(wc -c < "$payload_dir/openhouse-connect.tar" | tr -d ' ')"
  printf '    { "id": "smallphone", "archive": "smallphone.tar", "targetDir": "smallphone-active", "sha256": "%s", "size": %s }\n' "$(sha256sum "$payload_dir/smallphone.tar" | awk '{print $1}')" "$(wc -c < "$payload_dir/smallphone.tar" | tr -d ' ')"
  printf '  ]\n'
  printf '}\n'
} > "$payload_dir/manifest.json"

"$root/scripts/check-apk-product-payloads.sh" "$root"
log "APK product payloads are ready in $payload_dir"
