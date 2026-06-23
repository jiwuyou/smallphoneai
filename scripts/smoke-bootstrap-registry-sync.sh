#!/usr/bin/env bash
set -euo pipefail

root="${1:-/root/projects/smallphoneai}"
sync_script="$root/openhouseai-bootstrap/scripts/48-sync-openhouse-registry.sh"

[ -f "$sync_script" ] || {
  printf 'ERROR missing registry sync script: %s\n' "$sync_script" >&2
  exit 1
}

work_dir="$(mktemp -d "${TMPDIR:-/tmp}/smallphoneai-registry-sync.XXXXXX")"
trap 'rm -rf "$work_dir"' EXIT

source_dir="$work_dir/ubuntu/.config/openhouseai"
target_home="$work_dir/termux-home"
target_dir="$target_home/.config/openhouseai"

mkdir -p "$source_dir/components.d" "$source_dir/service-manager/services.d" "$source_dir/ai-docs" "$target_home"

printf '%s\n' '{
  "ai": {"enabled": true},
  "serviceManager": {"serviceId": "hermes-webui"},
  "shellMenu": {"id": "hermes", "title": "Hermes"},
  "smallphoneApp": {"id": "hermes", "title": "Hermes"}
}' > "$source_dir/components.d/hermes.json"

printf '%s\n' '{
  "id": "hermes-webui",
  "name": "Hermes WebUI"
}' > "$source_dir/service-manager/services.d/hermes-webui.json"

printf '%s\n' '# Hermes' > "$source_dir/ai-docs/hermes.md"

SMALLPHONEAI_REGISTRY_SYNC_USE_API=0 \
  HOME="$work_dir/ubuntu" \
  OPENHOUSEAI_CONFIG_DIR="$source_dir" \
  OPENHOUSEAI_TERMUX_HOME="$target_home" \
  OPENHOUSEAI_TERMUX_CONFIG_DIR="$target_dir" \
  bash "$sync_script"

python3 - "$target_dir" <<'PY'
import json
import pathlib
import sys

target = pathlib.Path(sys.argv[1])
required = [
    target / "components.d" / "hermes.json",
    target / "service-manager" / "services.d" / "hermes-webui.json",
    target / "ai-docs" / "hermes.md",
    target / "registry-state.json",
]
missing = [str(path) for path in required if not path.exists()]
if missing:
    raise SystemExit("missing synced files: " + ", ".join(missing))

state = json.loads((target / "registry-state.json").read_text(encoding="utf-8"))
if state.get("status") != "success":
    raise SystemExit(f"unexpected registry state status: {state.get('status')!r}")
if state.get("mode") != "bootstrap-fallback":
    raise SystemExit(f"unexpected registry state mode: {state.get('mode')!r}")
files = {entry.get("path") for entry in state.get("files", [])}
for expected in {
    "components.d/hermes.json",
    "service-manager/services.d/hermes-webui.json",
    "ai-docs/hermes.md",
}:
    if expected not in files:
        raise SystemExit(f"registry-state missing file entry: {expected}")
PY

printf 'OK   bootstrap registry sync fallback smoke\n'
