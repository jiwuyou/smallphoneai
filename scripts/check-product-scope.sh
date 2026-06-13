#!/usr/bin/env sh
set -eu

root="${1:-/root/projects/smallphoneai}"
missing=0

require_file() {
  path="$1"
  if [ -f "$root/$path" ]; then
    printf 'OK   %s\n' "$path"
  else
    printf 'MISS %s\n' "$path"
    missing=1
  fi
}

require_text() {
  path="$1"
  pattern="$2"
  label="$3"
  if [ ! -f "$root/$path" ]; then
    printf 'MISS %s\n' "$path"
    missing=1
    return
  fi
  if grep -Eq "$pattern" "$root/$path"; then
    printf 'OK   %s: %s\n' "$path" "$label"
  else
    printf 'FAIL %s: missing %s\n' "$path" "$label"
    missing=1
  fi
}

reject_text() {
  path="$1"
  pattern="$2"
  label="$3"
  if [ ! -f "$root/$path" ]; then
    return
  fi
  if grep -Eq "$pattern" "$root/$path"; then
    printf 'FAIL %s: still contains %s\n' "$path" "$label"
    missing=1
  else
    printf 'OK   %s: absent %s\n' "$path" "$label"
  fi
}

reject_first_run_remote_dependency() {
  path="$1"
  if [ ! -f "$root/$path" ]; then
    return
  fi

  if grep -Eiq 'first[- ]run.*(requires?|depends on|must (fetch|download|clone|reach|contact)|download from|clone from).*(GitHub|github|raw\.githubusercontent|network|internet|remote)' "$root/$path" \
    || grep -Eiq 'first[- ]run.*must use (GitHub|github|raw\.githubusercontent|network|internet|remote)' "$root/$path" \
    || grep -Eiq '(GitHub|github|raw\.githubusercontent|network|internet|remote).*(required|prerequisite).*(first[- ]run|clean install)' "$root/$path"; then
    printf 'FAIL %s: contains GitHub/network-required first-run wording\n' "$path"
    missing=1
  else
    printf 'OK   %s: no GitHub/network-required first-run wording\n' "$path"
  fi
}

require_file README.md
require_file AGENTS.md
require_file docs/product-scope.md
require_file docs/bootstrap-flow.md
require_file docs/control-tests.md
require_file docs/repositories.md
require_file docs/integration-contract.md
require_file scripts/check-apk-product-payloads.sh
require_file scripts/package-apk-product-payloads.sh
require_file openhouseai-ui-preview/README.md
require_file openhouseai-ui-preview/src/App.tsx
require_file openhouseai-ui-preview/src/styles.css
require_file openhouseai-bootstrap/README.md
require_file openhouseai-bootstrap/bootstrap.sh
require_file openhouseai-bootstrap/openhouseai-manifest.json
require_file openhouseai-bootstrap/scripts/50-install-runtime-components.sh
require_file openhouseai-bootstrap/scripts/60-start-smallphone.sh
require_file openhouseai-bootstrap/scripts/65-smallphone-status.sh
require_file openhouseai-app/app/src/main/assets/smallphoneai/bootstrap/bootstrap.sh
require_file openhouseai-app/app/src/main/assets/smallphoneai/bootstrap/scripts/50-install-runtime-components.sh
require_file openhouseai-app/app/src/main/assets/openhouse/product-payloads/service-manager.tar
require_file openhouseai-app/app/src/main/assets/openhouse/product-payloads/openhouse-connect.tar
require_file openhouseai-app/app/src/main/assets/openhouse/product-payloads/smallphone.tar
require_file openhouseai-app/app/src/main/assets/openhouse/product-payloads/payload-manifest.json

require_text README.md 'SmallPhoneAI' 'SmallPhoneAI product name'
require_text README.md 'opens? SmallPhone|SmallPhone by default' 'SmallPhone default launch'
require_text README.md 'service-manager' 'service-manager included'
require_text README.md 'Ubuntu/proot' 'Ubuntu/proot primary runtime'
require_text README.md 'bootstrap, bridge, and recovery' 'Termux bootstrap bridge role'
require_text README.md 'cc-connect' 'cc-connect included'
require_text docs/integration-contract.md '22082' 'OpenHouse SmallPhone frontend port'
require_text docs/integration-contract.md '22000' 'OpenHouse SmallPhone core port'
require_text docs/integration-contract.md '21010' 'OpenHouse cc-connect bridge port'
require_text docs/integration-contract.md '21020' 'OpenHouse cc-connect management port'
require_text docs/integration-contract.md '21040' 'OpenHouse cc-connect webhook port'
require_text docs/integration-contract.md '20087' 'OpenHouse service-manager port'
require_text docs/integration-contract.md '23003' 'OpenHouse smallphone-likegirl port'
require_text docs/integration-contract.md '23008' 'OpenHouse smallphone-likegirl clone port'

require_text AGENTS.md 'SmallPhone as the default app surface' 'SmallPhone-first agent guideline'
require_text AGENTS.md 'service-manager' 'backend control guideline'
require_text AGENTS.md 'cc-connect' 'cc-connect guideline'

require_text docs/product-scope.md 'Outer maintenance drawer' 'outer maintenance drawer'
require_text docs/product-scope.md 'first-run|First-run' 'first-run scope'
require_text docs/product-scope.md 'service-manager' 'service-manager scope'
require_text docs/product-scope.md 'Ubuntu/proot runtime' 'Ubuntu/proot runtime scope'
require_text docs/product-scope.md 'Termux native bootstrap/bridge' 'Termux bootstrap bridge scope'
require_text docs/product-scope.md 'cc-connect' 'cc-connect scope'
require_text docs/product-scope.md 'smallphone-likegirl' 'smallphone-likegirl control-test scope'
require_text docs/product-scope.md 'APK-bundled offline payload' 'APK-bundled offline payload scope'
require_text docs/product-scope.md 'Remote-only first-run source' 'remote-only first-run exclusion'
require_text docs/product-scope.md 'First run must use the local APK payload' 'local payload before remote lookup'
require_text docs/product-scope.md 'network endpoints are optional after boot' 'network optional after boot'

require_text docs/control-tests.md 'smallphone-likegirl' 'control-test repository'
require_text docs/control-tests.md '23003' 'control-test primary port'
require_text docs/control-tests.md '23008' 'control-test clone port'
require_text docs/control-tests.md 'control-test:smallphone-likegirl' 'control-test service tag'

require_text docs/bootstrap-flow.md 'service-manager' 'service-manager bootstrap stage'
require_text docs/bootstrap-flow.md 'Ubuntu/proot by default' 'Ubuntu/proot runtime placement'
require_text docs/bootstrap-flow.md 'Termux native scripts are the bootstrap, bridge' 'Termux fallback placement'
require_text docs/bootstrap-flow.md 'cc-connect' 'cc-connect bootstrap stage'
require_text docs/bootstrap-flow.md 'smallphone-likegirl' 'smallphone-likegirl control test'
require_text docs/bootstrap-flow.md 'SmallPhone-first' 'SmallPhone-first bootstrap outcome'
require_text docs/bootstrap-flow.md 'runtime-components' 'runtime component hook'
require_text docs/bootstrap-flow.md 'Machine Hooks' 'machine hook contract'
require_text docs/bootstrap-flow.md 'Offline First-Run Contract' 'offline first-run contract'
require_text docs/bootstrap-flow.md 'APK-bundled offline payload' 'APK-bundled bootstrap payload'
require_text docs/bootstrap-flow.md 'SMALLPHONEAI_OFFLINE_PAYLOAD_DIR' 'offline payload directory handoff'
require_text docs/bootstrap-flow.md 'SMALLPHONEAI_OFFLINE_PAYLOAD_MANIFEST' 'offline payload manifest handoff'
require_text docs/bootstrap-flow.md 'GitHub and network sources are optional after boot' 'network optional after boot'

require_text docs/integration-contract.md 'Healthy stack: the app opens SmallPhone directly' 'default launch policy'
require_text docs/integration-contract.md 'First run' 'first-run policy'
require_text docs/integration-contract.md 'Offline Bootstrap Handoff' 'offline bootstrap handoff'
require_text docs/integration-contract.md 'APK-bundled offline payload' 'APK-bundled offline handoff'
require_text docs/integration-contract.md 'SMALLPHONEAI_OFFLINE_PAYLOAD_DIR' 'offline payload directory env'
require_text docs/integration-contract.md 'SMALLPHONEAI_OFFLINE_PAYLOAD_MANIFEST' 'offline payload manifest env'
require_text docs/integration-contract.md 'GitHub/network is optional after boot' 'network optional after boot'
require_text docs/integration-contract.md 'offline payload.*required artifact|required artifact.*offline payload' 'offline payload status reporting'
require_text docs/integration-contract.md 'service-manager' 'backend control plane'
require_text docs/integration-contract.md 'default placement.*Ubuntu/proot|Ubuntu/proot.*default placement' 'service-manager placement'
require_text docs/integration-contract.md 'Termux native layer owns only bootstrap, bridge, and recovery' 'Termux native layer boundary'
require_text docs/integration-contract.md 'cc-connect' 'included bridge'
require_text docs/integration-contract.md 'status.*hooks|hooks.*status' 'machine-readable bootstrap handoff'
require_text docs/integration-contract.md 'openhouse/product-payloads/service-manager\.tar' 'service-manager APK payload path'
require_text docs/integration-contract.md 'openhouse/product-payloads/openhouse-connect\.tar' 'cc-connect APK payload path'
require_text docs/integration-contract.md 'openhouse/product-payloads/smallphone\.tar' 'SmallPhone APK payload path'
require_text docs/integration-contract.md 'optional update path only' 'network is optional update path'

require_text openhouseai-bootstrap/README.md 'SmallPhoneAI' 'bootstrap product name'
require_text openhouseai-bootstrap/README.md 'Ubuntu/proot' 'bootstrap Ubuntu/proot split'
require_text openhouseai-bootstrap/README.md 'service-manager' 'bootstrap service-manager'
require_text openhouseai-bootstrap/README.md 'cc-connect' 'bootstrap cc-connect'
require_text openhouseai-bootstrap/README.md 'APK-bundled payloads' 'bootstrap APK bundled payloads'
require_text openhouseai-bootstrap/README.md 'openhouse/product-payloads' 'bootstrap payload asset root'
require_text openhouseai-bootstrap/README.md '23003' 'bootstrap smallphone-likegirl port'
require_text openhouseai-bootstrap/README.md '23008' 'bootstrap smallphone-likegirl clone port'
require_text openhouseai-bootstrap/bootstrap.sh '50-install-runtime-components.sh' 'bootstrap runtime components stage'
require_text openhouseai-bootstrap/bootstrap.sh '60-start-smallphone.sh' 'bootstrap SmallPhone start stage'
require_text openhouseai-bootstrap/bootstrap.sh '65-smallphone-status.sh' 'bootstrap machine-readable status stage'
require_text openhouseai-bootstrap/openhouseai-manifest.json 'service-manager' 'manifest service-manager'
require_text openhouseai-bootstrap/openhouseai-manifest.json 'cc-connect' 'manifest cc-connect'
require_text openhouseai-bootstrap/openhouseai-manifest.json 'SmallPhone' 'manifest SmallPhone'
require_text openhouseai-bootstrap/openhouseai-manifest.json 'runtimePayloads' 'manifest runtime payload contract'
require_text openhouseai-bootstrap/openhouseai-manifest.json 'optional_update_only' 'manifest network role'
require_text openhouseai-bootstrap/scripts/50-install-runtime-components.sh 'SMALLPHONEAI_BUNDLED_PAYLOAD_ROOT' 'runtime bundled payload root'
require_text openhouseai-bootstrap/scripts/50-install-runtime-components.sh 'SMALLPHONEAI_COMPONENT_SOURCE_MODE' 'runtime source mode'
require_text openhouseai-bootstrap/scripts/50-install-runtime-components.sh 'openhouse-connect' 'runtime openhouse-connect payload'
require_text openhouseai-app/app/src/main/java/com/termux/app/openhouse/OpenHouseMaintainerRunner.java 'openhouse/product-payloads' 'Android payload asset extraction'
require_text openhouseai-app/app/src/main/java/com/termux/app/openhouse/OpenHouseMaintainerRunner.java 'smallphoneai/bootstrap' 'Android bootstrap asset extraction'
require_text openhouseai-app/app/src/main/java/com/termux/app/openhouse/OpenHouseMaintainerRunner.java 'SMALLPHONEAI_BOOTSTRAP' 'Android bundled bootstrap handoff'
require_text scripts/check-apk-product-payloads.sh 'openhouse/product-payloads' 'payload asset validator'
require_text scripts/check-apk-product-payloads.sh 'service-manager\.tar' 'service-manager payload validator'
require_text scripts/check-apk-product-payloads.sh 'openhouse-connect\.tar' 'cc-connect payload validator'
require_text scripts/check-apk-product-payloads.sh 'smallphone\.tar' 'SmallPhone payload validator'
require_text scripts/package-apk-product-payloads.sh 'openhouse/product-payloads' 'payload packager asset root'

require_text openhouseai-ui-preview/src/App.tsx 'service-manager' 'preview service-manager signal'
require_text openhouseai-ui-preview/src/App.tsx 'cc-connect' 'preview cc-connect signal'
require_text openhouseai-ui-preview/src/App.tsx '首次安装|first-run' 'preview first-run/recovery signal'

reject_text AGENTS.md 'Do not add SmallPhone' 'old installer-only exclusion'
reject_text docs/product-scope.md 'outside installer-only scope' 'old installer-only exclusion'
reject_text docs/product-scope.md 'minimal agent CLI installer' 'old installer-only summary'
reject_text docs/integration-contract.md '18082|18080|18096|3100|8787|9840|9810|9820|4103|4108' 'old runtime ports'
reject_text docs/bootstrap-flow.md '18082|18080|18096|3100|8787|9840|9810|9820|4103|4108' 'old bootstrap ports'
reject_text openhouseai-bootstrap/README.md '18082|18080|18096|3100|8787|9840|9810|9820|4103|4108' 'old bootstrap README ports'
reject_text docs/product-scope.md 'raw\.githubusercontent\.com' 'raw GitHub first-run URL'
reject_text docs/bootstrap-flow.md 'raw\.githubusercontent\.com' 'raw GitHub first-run URL'
reject_text docs/integration-contract.md 'raw\.githubusercontent\.com' 'raw GitHub first-run URL'
reject_first_run_remote_dependency docs/product-scope.md
reject_first_run_remote_dependency docs/bootstrap-flow.md
reject_first_run_remote_dependency docs/integration-contract.md

exit "$missing"
