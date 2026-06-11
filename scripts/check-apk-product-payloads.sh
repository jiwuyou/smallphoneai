#!/usr/bin/env sh
set -eu

root="${1:-/root/projects/smallphoneai}"
payload_dir="$root/openhouseai-app/app/src/main/assets/openhouse/product-payloads"
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
  tar -tzf "$archive" | sed 's#^\./##' > "$list_file"
  grep -Eq "$pattern" "$list_file"
  status=$?
  rm -f "$list_file"
  return "$status"
}

archive_rejects() {
  archive="$1"
  pattern="$2"
  list_file="$(mktemp "${TMPDIR:-/tmp}/smallphoneai-payload-list.XXXXXX")"
  tar -tzf "$archive" | sed 's#^\./##' > "$list_file"
  if grep -Eq "$pattern" "$list_file"; then
    rm -f "$list_file"
    return 1
  fi
  rm -f "$list_file"
  return 0
}

check_payload() {
  name="$1"
  archive="$payload_dir/$2"

  if [ ! -s "$archive" ]; then
    fail "missing APK product payload archive: ${archive#$root/}"
    return
  fi

  if ! tar -tzf "$archive" >/dev/null 2>&1; then
    fail "invalid tar.gz APK product payload: ${archive#$root/}"
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

  if archive_rejects "$archive" '(^|/)\.git(/|$)'; then
    ok "$name payload excludes .git metadata"
  else
    fail "$name payload must not bundle .git metadata"
  fi
}

if [ -d "$payload_dir" ]; then
  ok "APK product payload directory exists: ${payload_dir#$root/}"
else
  fail "missing APK product payload directory: ${payload_dir#$root/}"
fi

check_payload "service-manager" "service-manager.tar.gz"
check_payload "cc-connect/openhouse-connect" "openhouse-connect.tar.gz"
check_payload "SmallPhone" "smallphone.tar.gz"

exit "$missing"
