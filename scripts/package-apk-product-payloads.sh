#!/usr/bin/env bash
set -euo pipefail

root="${1:-/root/projects/smallphoneai}"
payload_dir="${SMALLPHONEAI_APK_PRODUCT_PAYLOAD_DIR:-$root/openhouseai-app/app/src/main/assets/openhouse/product-payloads}"
service_manager_payload_arch="${SMALLPHONEAI_SERVICE_MANAGER_PAYLOAD_ARCH:-aarch64}"
cc_connect_payload_arch="${SMALLPHONEAI_CC_CONNECT_PAYLOAD_ARCH:-aarch64}"

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

  if [ "$payload_name" = "service-manager" ]; then
    payload_source_executable_matches_arch "$source/service-manager" "$service_manager_payload_arch" \
      || die "$name source executable must be $service_manager_payload_arch for APK payload: $source/service-manager"
    payload_source_executable_contains_text "$source/service-manager" "service-manager.repair" \
      || die "$name source executable missing repair hook marker: $source/service-manager"
    payload_source_executable_contains_text "$source/service-manager" "RepairHook" \
      || die "$name source executable missing RepairHook support: $source/service-manager"
  fi
  if [ "$payload_name" = "openhouse-connect" ]; then
    payload_source_executable_matches_arch "$source/cc-connect" "$cc_connect_payload_arch" \
      || die "$name source executable must be $cc_connect_payload_arch for APK payload: $source/cc-connect"
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

script_payload_block_rejects_line() {
  local script="$1"
  local rejected="$2"

  awk -v rejected="$rejected" '
    /payload = \{/ { in_payload = 1 }
    in_payload && $0 == rejected { found = 1 }
    in_payload && /^with open\(out_path,/ { in_payload = 0 }
    END { exit(found ? 1 : 0) }
  ' "$script"
}

require_hermes_payload_contract() {
  local agent_source="$1"
  local webui_source="$2"

  [ -d "$agent_source" ] || die "Hermes Agent source directory does not exist: $agent_source"
  [ -f "$agent_source/pyproject.toml" ] || die "Hermes Agent source missing pyproject.toml: $agent_source"
  [ -f "$agent_source/openhouse/install.sh" ] || die "Hermes Agent source missing openhouse/install.sh: $agent_source"
  [ -f "$agent_source/openhouse/check.sh" ] || die "Hermes Agent source missing openhouse/check.sh: $agent_source"
  [ -f "$agent_source/openhouse/start-hermes-webui.sh" ] || die "Hermes Agent source missing openhouse/start-hermes-webui.sh: $agent_source"
  [ -f "$agent_source/openhouse/register-service.sh" ] || die "Hermes Agent source missing openhouse/register-service.sh: $agent_source"
  [ -f "$agent_source/openhouse/repair-hermes-webui.sh" ] || die "Hermes Agent source missing openhouse/repair-hermes-webui.sh: $agent_source"
  [ -f "$agent_source/openhouse/snapshot-hermes-webui.sh" ] || die "Hermes Agent source missing openhouse/snapshot-hermes-webui.sh: $agent_source"
  [ -f "$agent_source/openhouse/component-manifest.json" ] || die "Hermes Agent source missing openhouse/component-manifest.json: $agent_source"
  [ -f "$agent_source/openhouse/component-manifest.schema.json" ] || die "Hermes Agent source missing openhouse/component-manifest.schema.json: $agent_source"
  [ -f "$agent_source/openhouse/capabilities.json" ] || die "Hermes Agent source missing openhouse/capabilities.json: $agent_source"
  [ -f "$agent_source/openhouse/openhouse.ai.md" ] || die "Hermes Agent source missing openhouse/openhouse.ai.md: $agent_source"
  [ -x "$agent_source/openhouse/start-hermes-webui.sh" ] \
    || die "Hermes start-hermes-webui.sh must be executable: $agent_source/openhouse/start-hermes-webui.sh"
  grep -Fq 'OPENHOUSE_FOREGROUND_START=hermes-webui-v2' "$agent_source/openhouse/start-hermes-webui.sh" \
    || die "Hermes start-hermes-webui.sh missing foreground start marker: $agent_source/openhouse/start-hermes-webui.sh"
  grep -Fq 'exec "$venv_python" "$server_path"' "$agent_source/openhouse/start-hermes-webui.sh" \
    || die "Hermes start-hermes-webui.sh must exec the real Python server without overriding argv0: $agent_source/openhouse/start-hermes-webui.sh"
  if grep -Fq 'exec -a' "$agent_source/openhouse/start-hermes-webui.sh"; then
    die "Hermes start-hermes-webui.sh must not use exec -a; it breaks Python venv discovery: $agent_source/openhouse/start-hermes-webui.sh"
  fi
  grep -Fq '/api/v1/registry/apply' "$agent_source/openhouse/register-service.sh" \
    || die "Hermes register-service.sh must call service-manager registry API: $agent_source/openhouse/register-service.sh"
  grep -Fq '"repair":' "$agent_source/openhouse/register-service.sh" \
    || die "Hermes register-service.sh must register a service-manager repair hook: $agent_source/openhouse/register-service.sh"
  grep -Fq 'venv_python,' "$agent_source/openhouse/register-service.sh" \
    && grep -Fq 'server_script,' "$agent_source/openhouse/register-service.sh" \
    || die "Hermes register-service.sh must register venv Python + server.py as service.command: $agent_source/openhouse/register-service.sh"
  if grep -Fq 'start-hermes-webui.sh' "$agent_source/openhouse/register-service.sh"; then
    die "Hermes register-service.sh must not register start-hermes-webui.sh as service.command: $agent_source/openhouse/register-service.sh"
  fi
  if grep -Fq '"./bootstrap.py"' "$agent_source/openhouse/register-service.sh"; then
    die "Hermes register-service.sh must not register bootstrap.py as service.command: $agent_source/openhouse/register-service.sh"
  fi
  if grep -Fq '/api/v1/services' "$agent_source/openhouse/register-service.sh"; then
    die "Hermes register-service.sh must not use legacy /api/v1/services registration: $agent_source/openhouse/register-service.sh"
  fi
  script_payload_block_rejects_line "$agent_source/openhouse/register-service.sh" '    "schemaVersion": 1,' \
    || die "Hermes apply payload must not include top-level schemaVersion: $agent_source/openhouse/register-service.sh"
  script_payload_block_rejects_line "$agent_source/openhouse/register-service.sh" '    "id": "hermes-webui",' \
    || die "Hermes apply payload must not include top-level id: $agent_source/openhouse/register-service.sh"
  script_payload_block_rejects_line "$agent_source/openhouse/register-service.sh" '    "componentId": "hermes-webui",' \
    || die "Hermes apply payload must not include top-level componentId: $agent_source/openhouse/register-service.sh"

  [ -d "$webui_source" ] || die "Hermes WebUI source directory does not exist: $webui_source"
  [ -f "$webui_source/bootstrap.py" ] || die "Hermes WebUI source missing bootstrap.py: $webui_source"
  [ -f "$webui_source/requirements.txt" ] || die "Hermes WebUI source missing requirements.txt: $webui_source"
}

write_hermes_payload() {
  local agent_source="$1"
  local webui_source="$2"
  local archive="$3"
  local tmp

  require_hermes_payload_contract "$agent_source" "$webui_source"

  command -v rsync >/dev/null 2>&1 || die "rsync is required to package Hermes payload"
  tmp="$(mktemp -d "${TMPDIR:-/tmp}/smallphoneai-hermes-payload.XXXXXX")"
  mkdir -p "$tmp/scripts" "$tmp/hermes-agent" "$tmp/hermes-webui"

  cp "$agent_source/openhouse/install.sh" "$tmp/scripts/install.sh"
  cp "$agent_source/openhouse/check.sh" "$tmp/scripts/check.sh"
  cp "$agent_source/openhouse/start-hermes-webui.sh" "$tmp/scripts/start-hermes-webui.sh"
  cp "$agent_source/openhouse/register-service.sh" "$tmp/scripts/register-service.sh"
  cp "$agent_source/openhouse/repair-hermes-webui.sh" "$tmp/scripts/repair-hermes-webui.sh"
  cp "$agent_source/openhouse/snapshot-hermes-webui.sh" "$tmp/scripts/snapshot-hermes-webui.sh"
  cp "$agent_source/openhouse/component-manifest.json" "$tmp/component-manifest.json"
  cp "$agent_source/openhouse/component-manifest.schema.json" "$tmp/component-manifest.schema.json"
  cp "$agent_source/openhouse/capabilities.json" "$tmp/capabilities.json"
  cp "$agent_source/openhouse/openhouse.ai.md" "$tmp/openhouse.ai.md"
  chmod 0755 \
    "$tmp/scripts/install.sh" \
    "$tmp/scripts/check.sh" \
    "$tmp/scripts/start-hermes-webui.sh" \
    "$tmp/scripts/register-service.sh" \
    "$tmp/scripts/repair-hermes-webui.sh" \
    "$tmp/scripts/snapshot-hermes-webui.sh"

  rsync -a \
    --exclude='.git' \
    --exclude='__pycache__' \
    --exclude='.pytest_cache' \
    --exclude='venv' \
    --exclude='.venv' \
    --exclude='node_modules' \
    --exclude='target' \
    --exclude='dist' \
    "$agent_source/" \
    "$tmp/hermes-agent/"
  rsync -a \
    --exclude='.git' \
    --exclude='__pycache__' \
    --exclude='.pytest_cache' \
    --exclude='venv' \
    --exclude='.venv' \
    --exclude='node_modules' \
    --exclude='target' \
    --exclude='dist' \
    "$webui_source/" \
    "$tmp/hermes-webui/"

  log "Packaging Hermes from $agent_source and $webui_source"
  tar -czf "$payload_dir/$archive" -C "$tmp" .
  rm -rf "$tmp"
}

payload_source_contains_executable() {
  local source="$1"
  local payload_name="$2"

  case "$payload_name" in
    service-manager)
      [ -x "$source/service-manager" ]
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
      printf 'service-manager at service-manager'
      ;;
    openhouse-connect)
      printf 'cc-connect at cc-connect'
      ;;
    *)
      return 1
      ;;
  esac
}

payload_source_executable_matches_arch() {
  local executable="$1"
  local expected_arch="$2"
  local description

  command -v file >/dev/null 2>&1 || return 0
  description="$(file "$executable" 2>/dev/null || true)"
  case "$expected_arch" in
    aarch64|arm64)
      printf '%s\n' "$description" | grep -Eq 'ARM aarch64|aarch64'
      ;;
    x86_64|amd64)
      printf '%s\n' "$description" | grep -Eq 'x86-64|x86_64'
      ;;
    *)
      die "unsupported SMALLPHONEAI_SERVICE_MANAGER_PAYLOAD_ARCH: $expected_arch"
      ;;
  esac
}

payload_source_executable_contains_text() {
  local executable="$1"
  local pattern="$2"

  command -v strings >/dev/null 2>&1 || return 1
  LC_ALL=C strings "$executable" 2>/dev/null | grep -Fq "$pattern"
}

service_manager_source="${SMALLPHONEAI_SERVICE_MANAGER_SOURCE:-$(first_existing_dir /root/projects/service-manager "$root/../service-manager" || true)}"
cc_connect_source="${SMALLPHONEAI_CC_CONNECT_SOURCE:-$(first_existing_dir /root/openhouse-connect-fresh /root/cc-connect-fresh /root/cc-connect "$root/../openhouse-connect-fresh" "$root/../openhouse-connect" "$root/../cc-connect" || true)}"
smallphone_source="${SMALLPHONEAI_SMALLPHONE_SOURCE:-$(first_existing_dir /root/projects/smallphone/smallphone-active "$root/../smallphone-active" "$root/../smallphone" || true)}"
hermes_agent_source="${SMALLPHONEAI_HERMES_AGENT_SOURCE:-$(first_existing_dir /root/projects/hermes-agent "$root/../hermes-agent" || true)}"
hermes_webui_source="${SMALLPHONEAI_HERMES_WEBUI_SOURCE:-$(first_existing_dir /root/projects/hermes-webui "$root/../hermes-webui" || true)}"
hermes_archive=""
for candidate in "$payload_dir/hermes.tgz" "$payload_dir/hermes.tar"; do
  if [ -s "$candidate" ]; then
    hermes_archive="$(basename "$candidate")"
    break
  fi
done

[ -n "$service_manager_source" ] || die "service-manager source not found; set SMALLPHONEAI_SERVICE_MANAGER_SOURCE"
[ -n "$cc_connect_source" ] || die "cc-connect/openhouse-connect source not found; set SMALLPHONEAI_CC_CONNECT_SOURCE"
[ -n "$smallphone_source" ] || die "SmallPhone source not found; set SMALLPHONEAI_SMALLPHONE_SOURCE"

mkdir -p "$payload_dir"
rm -f "$payload_dir/service-manager.tar.gz" "$payload_dir/openhouse-connect.tar.gz" "$payload_dir/smallphone.tar.gz"

write_payload "service-manager" "$service_manager_source" "service-manager.tar" "service-manager"
write_payload "cc-connect/openhouse-connect" "$cc_connect_source" "openhouse-connect.tar" "openhouse-connect"
write_payload "SmallPhone" "$smallphone_source" "smallphone.tar"
if [ -n "$hermes_agent_source" ] && [ -n "$hermes_webui_source" ]; then
  hermes_archive="hermes.tgz"
  rm -f "$payload_dir/hermes.tar" "$payload_dir/hermes.tar.gz"
  write_hermes_payload "$hermes_agent_source" "$hermes_webui_source" "$hermes_archive"
elif [ -n "$hermes_archive" ]; then
  log "Hermes sources not found; keeping existing $hermes_archive"
fi

{
  printf '{\n'
  printf '  "schema": 1,\n'
  printf '  "assetRoot": "openhouse/product-payloads",\n'
  printf '  "payloads": [\n'
  printf '    { "id": "service-manager", "archive": "service-manager.tar", "sha256": "%s", "size": %s },\n' "$(sha256sum "$payload_dir/service-manager.tar" | awk '{print $1}')" "$(wc -c < "$payload_dir/service-manager.tar" | tr -d ' ')"
  printf '    { "id": "openhouse-connect", "archive": "openhouse-connect.tar", "sha256": "%s", "size": %s },\n' "$(sha256sum "$payload_dir/openhouse-connect.tar" | awk '{print $1}')" "$(wc -c < "$payload_dir/openhouse-connect.tar" | tr -d ' ')"
  if [ -n "$hermes_archive" ]; then
    printf '    { "id": "smallphone", "archive": "smallphone.tar", "sha256": "%s", "size": %s },\n' "$(sha256sum "$payload_dir/smallphone.tar" | awk '{print $1}')" "$(wc -c < "$payload_dir/smallphone.tar" | tr -d ' ')"
    printf '    { "id": "hermes", "archive": "%s", "sha256": "%s", "size": %s }\n' "$hermes_archive" "$(sha256sum "$payload_dir/$hermes_archive" | awk '{print $1}')" "$(wc -c < "$payload_dir/$hermes_archive" | tr -d ' ')"
  else
    printf '    { "id": "smallphone", "archive": "smallphone.tar", "sha256": "%s", "size": %s }\n' "$(sha256sum "$payload_dir/smallphone.tar" | awk '{print $1}')" "$(wc -c < "$payload_dir/smallphone.tar" | tr -d ' ')"
  fi
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
  if [ -n "$hermes_archive" ]; then
    printf '    { "id": "smallphone", "archive": "smallphone.tar", "targetDir": "smallphone-active", "sha256": "%s", "size": %s },\n' "$(sha256sum "$payload_dir/smallphone.tar" | awk '{print $1}')" "$(wc -c < "$payload_dir/smallphone.tar" | tr -d ' ')"
    printf '    { "id": "hermes", "archive": "%s", "targetDir": "hermes", "sha256": "%s", "size": %s }\n' "$hermes_archive" "$(sha256sum "$payload_dir/$hermes_archive" | awk '{print $1}')" "$(wc -c < "$payload_dir/$hermes_archive" | tr -d ' ')"
  else
    printf '    { "id": "smallphone", "archive": "smallphone.tar", "targetDir": "smallphone-active", "sha256": "%s", "size": %s }\n' "$(sha256sum "$payload_dir/smallphone.tar" | awk '{print $1}')" "$(wc -c < "$payload_dir/smallphone.tar" | tr -d ' ')"
  fi
  printf '  ]\n'
  printf '}\n'
} > "$payload_dir/manifest.json"

"$root/scripts/check-apk-product-payloads.sh" "$root"
log "APK product payloads are ready in $payload_dir"
