#!/usr/bin/env sh
set -eu

root="${1:-/root/projects/smallphoneai}"
payload_dir="${SMALLPHONEAI_APK_PRODUCT_PAYLOAD_DIR:-$root/openhouseai-app/app/src/main/assets/openhouse/product-payloads}"
service_manager_payload_arch="${SMALLPHONEAI_SERVICE_MANAGER_PAYLOAD_ARCH:-aarch64}"
cc_connect_payload_arch="${SMALLPHONEAI_CC_CONNECT_PAYLOAD_ARCH:-aarch64}"
missing=0

fail() {
  printf 'FAIL %s\n' "$*"
  missing=1
}

ok() {
  printf 'OK   %s\n' "$*"
}

archive_contains() {
  archive="$1"
  pattern="$2"
  list_file="$(mktemp "${TMPDIR:-/tmp}/smallphoneai-payload-list.XXXXXX")"
  case "$archive" in
    *.tar) tar -tf "$archive" ;;
    *) tar -tzf "$archive" ;;
  esac | sed 's#^\./##' > "$list_file"
  grep -Eq "$pattern" "$list_file"
  status=$?
  rm -f "$list_file"
  return "$status"
}

archive_rejects() {
  archive="$1"
  pattern="$2"
  list_file="$(mktemp "${TMPDIR:-/tmp}/smallphoneai-payload-list.XXXXXX")"
  case "$archive" in
    *.tar) tar -tf "$archive" ;;
    *) tar -tzf "$archive" ;;
  esac | sed 's#^\./##' > "$list_file"
  if grep -Eq "$pattern" "$list_file"; then
    rm -f "$list_file"
    return 1
  fi
  rm -f "$list_file"
  return 0
}

archive_contains_executable() {
  archive="$1"
  pattern="$2"

  case "$archive" in
    *.tar) tar -tvf "$archive" ;;
    *) tar -tzvf "$archive" ;;
  esac | awk -v pattern="$pattern" '
    {
      mode = $1
      name = $0
      sub(/^[^[:space:]]+[[:space:]]+[^[:space:]]+[[:space:]]+[^[:space:]]+[[:space:]]+[^[:space:]]+[[:space:]]+[^[:space:]]+[[:space:]]+/, "", name)
      sub(/^\.\//, "", name)
      if (substr(mode, 1, 1) == "-" && mode ~ /x/ && name ~ pattern) {
        found = 1
      }
    }
    END { exit(found ? 0 : 1) }
  '
}

archive_file_contains_text() {
  archive="$1"
  path="$2"
  pattern="$3"

  case "$archive" in
    *.tar) tar -xOf "$archive" "$path" ;;
    *) tar -xOzf "$archive" "$path" ;;
  esac | grep -Fq "$pattern"
}

archive_file_rejects_text() {
  archive="$1"
  path="$2"
  pattern="$3"

  if case "$archive" in
    *.tar) tar -xOf "$archive" "$path" ;;
    *) tar -xOzf "$archive" "$path" ;;
  esac | grep -Fq "$pattern"; then
    return 1
  fi
  return 0
}

archive_file_payload_block_rejects_line() {
  archive="$1"
  path="$2"
  rejected="$3"

  case "$archive" in
    *.tar) tar -xOf "$archive" "$path" ;;
    *) tar -xOzf "$archive" "$path" ;;
  esac | awk -v rejected="$rejected" '
    /payload = \{/ { in_payload = 1 }
    in_payload && $0 == rejected { found = 1 }
    in_payload && /^with open\(out_path,/ { in_payload = 0 }
    END { exit(found ? 1 : 0) }
  '
}

archive_executable_matches_arch() {
  archive="$1"
  executable="$2"
  expected_arch="$3"

  command -v file >/dev/null 2>&1 || return 0
  tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/smallphoneai-payload-bin.XXXXXX")"
  case "$archive" in
    *.tar) tar -xf "$archive" -C "$tmp_dir" "./$executable" ;;
    *) tar -xzf "$archive" -C "$tmp_dir" "./$executable" ;;
  esac
  description="$(file "$tmp_dir/$executable" 2>/dev/null || true)"
  rm -rf "$tmp_dir"

  case "$expected_arch" in
    aarch64|arm64)
      printf '%s\n' "$description" | grep -Eq 'ARM aarch64|aarch64'
      ;;
    x86_64|amd64)
      printf '%s\n' "$description" | grep -Eq 'x86-64|x86_64'
      ;;
    *)
      return 1
      ;;
  esac
}

payload_executable_pattern() {
  case "$1" in
    service-manager)
      printf '^service-manager$'
      ;;
    openhouse-connect)
      printf '^cc-connect$'
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

check_payload() {
  name="$1"
  archive="$payload_dir/$2"
  payload_name="${3:-}"
  required_pattern=""
  required_description=""

  if [ ! -s "$archive" ]; then
    fail "missing APK product payload archive: ${archive#$root/}"
    return
  fi

  if ! case "$archive" in
    *.tar) tar -tf "$archive" >/dev/null 2>&1 ;;
    *) tar -tzf "$archive" >/dev/null 2>&1 ;;
  esac; then
    fail "invalid tar APK product payload: ${archive#$root/}"
    return
  fi

  if archive_contains "$archive" '(^|/)scripts/install\.sh$'; then
    ok "$name payload contains scripts/install.sh"
  else
    fail "$name payload missing scripts/install.sh"
  fi

  if archive_contains "$archive" '(^|/)scripts/check\.sh$'; then
    ok "$name payload contains scripts/check.sh"
  else
    fail "$name payload missing scripts/check.sh"
  fi

  if required_pattern="$(payload_executable_pattern "$payload_name")"; then
    required_description="$(payload_executable_description "$payload_name")"
    if archive_contains_executable "$archive" "$required_pattern"; then
      ok "$name payload contains executable $required_description"
    else
      fail "$name payload missing executable $required_description"
    fi
  fi

  if [ "$payload_name" = "service-manager" ]; then
    if archive_executable_matches_arch "$archive" "service-manager" "$service_manager_payload_arch"; then
      ok "$name payload executable is $service_manager_payload_arch"
    else
      fail "$name payload executable must be $service_manager_payload_arch"
    fi
  fi
  if [ "$payload_name" = "openhouse-connect" ]; then
    if archive_executable_matches_arch "$archive" "cc-connect" "$cc_connect_payload_arch"; then
      ok "$name payload executable is $cc_connect_payload_arch"
    else
      fail "$name payload executable must be $cc_connect_payload_arch"
    fi
  fi

  if archive_rejects "$archive" '(^|/)\.git(/|$)'; then
    ok "$name payload excludes .git metadata"
  else
    fail "$name payload must not bundle .git metadata"
  fi

  if archive_rejects "$archive" '(^|/)(target|dist|\.gocache|\.gomodcache|\.gopath)(/|$)'; then
    ok "$name payload excludes build/cache directories"
  else
    fail "$name payload must not bundle build/cache directories"
  fi

  if [ "$payload_name" = "hermes" ]; then
    if archive_file_contains_text "$archive" "./scripts/register-service.sh" "/api/v1/registry/apply"; then
      ok "$name payload register-service.sh uses service-manager registry API"
    else
      fail "$name payload register-service.sh must call /api/v1/registry/apply"
    fi
    if archive_file_rejects_text "$archive" "./scripts/register-service.sh" "/api/v1/services"; then
      ok "$name payload register-service.sh avoids legacy /api/v1/services registration"
    else
      fail "$name payload register-service.sh must not use legacy /api/v1/services registration"
    fi
    if archive_file_payload_block_rejects_line "$archive" "./scripts/register-service.sh" '    "schemaVersion": 1,' \
      && archive_file_payload_block_rejects_line "$archive" "./scripts/register-service.sh" '    "id": "hermes-webui",' \
      && archive_file_payload_block_rejects_line "$archive" "./scripts/register-service.sh" '    "componentId": "hermes-webui",'; then
      ok "$name payload apply body excludes legacy top-level metadata"
    else
      fail "$name payload apply body must only use component/components/services/aiDocs top-level keys"
    fi
  fi
}

check_manifest_entry() {
  name="$1"
  archive_name="$2"
  archive="$payload_dir/$archive_name"
  manifest="$payload_dir/payload-manifest.json"
  legacy_manifest="$payload_dir/manifest.json"
  sha="$(sha256sum "$archive" | awk '{print $1}')"
  size="$(wc -c < "$archive" | tr -d ' ')"

  if grep -Fq "\"archive\": \"$archive_name\"" "$manifest" \
    && grep -Fq "\"sha256\": \"$sha\"" "$manifest" \
    && grep -Fq "\"size\": $size" "$manifest"; then
    ok "$name payload-manifest entry matches archive sha256/size"
  else
    fail "$name payload-manifest entry does not match archive sha256/size"
  fi

  if grep -Fq "\"archive\": \"$archive_name\"" "$legacy_manifest" \
    && grep -Fq "\"sha256\": \"$sha\"" "$legacy_manifest" \
    && grep -Fq "\"size\": $size" "$legacy_manifest"; then
    ok "$name legacy manifest entry matches archive sha256/size"
  else
    fail "$name legacy manifest entry does not match archive sha256/size"
  fi
}

first_existing_payload_archive() {
  for archive_name in "$@"; do
    if [ -s "$payload_dir/$archive_name" ]; then
      printf '%s\n' "$archive_name"
      return 0
    fi
  done
  return 1
}

if [ -d "$payload_dir" ]; then
  ok "APK product payload directory exists: ${payload_dir#$root/}"
else
  fail "missing APK product payload directory: ${payload_dir#$root/}"
fi

check_payload "service-manager" "service-manager.tar" "service-manager"
check_payload "cc-connect/openhouse-connect" "openhouse-connect.tar" "openhouse-connect"
check_payload "SmallPhone" "smallphone.tar"
hermes_archive="$(first_existing_payload_archive "hermes.tar" "hermes.tar.gz" "hermes.tgz" || true)"
if [ -n "$hermes_archive" ]; then
  check_payload "Hermes" "$hermes_archive" "hermes"
fi

check_manifest_entry "service-manager" "service-manager.tar"
check_manifest_entry "cc-connect/openhouse-connect" "openhouse-connect.tar"
check_manifest_entry "SmallPhone" "smallphone.tar"
if [ -n "$hermes_archive" ]; then
  check_manifest_entry "Hermes" "$hermes_archive"
fi

exit "$missing"
