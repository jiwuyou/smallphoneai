#!/usr/bin/env sh
set -eu

root="${1:-/root/projects/smallphoneai}"
payload_dir="${SMALLPHONEAI_APK_PRODUCT_PAYLOAD_DIR:-$root/openhouseai-app/app/src/main/assets/openhouse/product-payloads}"
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

payload_executable_pattern() {
  case "$1" in
    service-manager)
      printf '^(service-manager|target/release/service-manager)$'
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

if [ -d "$payload_dir" ]; then
  ok "APK product payload directory exists: ${payload_dir#$root/}"
else
  fail "missing APK product payload directory: ${payload_dir#$root/}"
fi

check_payload "service-manager" "service-manager.tar" "service-manager"
check_payload "cc-connect/openhouse-connect" "openhouse-connect.tar" "openhouse-connect"
check_payload "SmallPhone" "smallphone.tar"

check_manifest_entry "service-manager" "service-manager.tar"
check_manifest_entry "cc-connect/openhouse-connect" "openhouse-connect.tar"
check_manifest_entry "SmallPhone" "smallphone.tar"

exit "$missing"
