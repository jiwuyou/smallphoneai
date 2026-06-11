#!/usr/bin/env sh
set -eu

root="${1:-/root/projects/smallphoneai}"
missing=0

check_repo() {
  repo="$1"
  if [ -d "$repo/.git" ]; then
    printf 'OK   %s\n' "$repo"
  elif [ -d "$repo" ]; then
    printf 'WARN %s exists but is not a git repository\n' "$repo"
  else
    printf 'MISS %s\n' "$repo"
    missing=1
  fi
}

check_repo "$root"
check_repo "$root/openhouseai-bootstrap"
check_repo "$root/openhouseai-app"
check_repo "$root/openhouseai-ui-preview"

exit "$missing"
