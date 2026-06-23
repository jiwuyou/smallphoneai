# Integration Contract

This contract defines the target handoff between the Android host, bootstrap,
SmallPhone runtime, `service-manager`, and `cc-connect`.

## Launch Policy

- Healthy stack: the app opens SmallPhone directly.
- First run: the app opens the outer maintenance drawer, starts the installer,
  shows progress, then navigates to SmallPhone after health checks pass.
- Failed launch: the app stays in the maintenance drawer with repair, update,
  logs, and terminal fallback.

## Offline Bootstrap Handoff

The Android host ships an APK-bundled offline payload and extracts it before
starting any first-run installer stage. The host passes the extracted directory
as `SMALLPHONEAI_OFFLINE_PAYLOAD_DIR` and the payload manifest path as
`SMALLPHONEAI_OFFLINE_PAYLOAD_MANIFEST`.

Bootstrap treats that local payload as the source of truth for first run. It may
probe GitHub or other network sources only for optional update and repair paths
after the local payload path has been attempted. GitHub/network is optional after boot when the bundled payload is intact.

The machine-readable `status` output should report offline payload presence, manifest version, and required artifact gaps.
Missing required local artifacts are reported as `repairable` or
`terminal_required`; they are not converted into a GitHub-first install path.

## Backend Control Plane

`service-manager` owns lifecycle control for:

- SmallPhone core services.
- SmallPhone apps and app bundles.
- `cc-connect`.
- Control-test apps such as `smallphone-likegirl`.
- Agent services required by SmallPhoneAI.

The default placement for `service-manager` is the Ubuntu/proot runtime managed
by Termux. The Termux native layer owns only bootstrap, bridge, and recovery
actions that must survive when Ubuntu or `service-manager` is unavailable.

The app and WebView should call backend actions for status, start, stop,
restart, repair, update, logs, and app lifecycle changes. UI code should not
embed long-running process orchestration.

Bootstrap should expose machine-readable `status` and `hooks` outputs so the
Android host can decide whether to open SmallPhone, show first-run progress, or
hold the user in recovery.
`install`/`full`, `start`, and `repair` hooks report final health by printing a
final status JSON object after any progress logs.

## OpenHouse Registry Contract

OpenHouse registry has three distinct layers:

| Layer | Path | Owner | Write policy |
| --- | --- | --- | --- |
| Project manifest source | `$HOME/smallphoneai-repos/<project>/openhouse/*.json` or equivalent project files | The project or plugin | Editable source. Developers and AI tools may change it as part of that project. |
| Ubuntu runtime registry | `/root/.config/openhouseai` inside Ubuntu/proot | `service-manager` registry API | Runtime state. Normal writes go through the API, with schema validation and atomic file replacement. |
| Termux canonical mirror | `/data/data/com.termux/files/home/.config/openhouseai` | Registry sync action | Android-readable mirror. Do not hand-edit; it is regenerated from the Ubuntu runtime registry. |

The Android host and SmallPhone surfaces read the Termux canonical mirror. They
must not read into the Ubuntu rootfs directly. `service-manager` writes and
syncs the runtime registry during normal operation. Bootstrap may write or
restore the mirror only as a recovery fallback when `service-manager` is not
available.

The mirror includes `components.d/*.json` for menu entries and may include
`registry-state.json` for diagnostics. `registry-state.json` should describe the
last sync status, source path, target path, file checksums/counts, timestamp, and
errors. Android treats a missing or invalid state file as diagnostic information,
not as a reason to crash or hide all built-in menu entries.

Component manifests are UI capability contracts. They must not contain process
execution fields such as `command`, `shell`, `script`, or `args`. Those fields
belong only in service-manager service specs.

## Core Stack

Minimum target stack:

- SmallPhone web/app runtime.
- `service-manager` backend API and service registry.
- `cc-connect` bridge.
- Ubuntu/proot runtime substrate for the primary service stack.
- Termux native bootstrap/bridge substrate for install, launch, Android-native
  commands, and recovery fallback.
- Agent toolchain needed by SmallPhoneAI workflows.

## Bundled Runtime Payloads

First run must install the product runtime from APK-bundled payloads, not from
GitHub. Network access is an optional update path only after the bundled
payload contract is satisfied.

The APK must contain these product payload archives under
`app/src/main/assets`:

| Component | APK asset path | Installed target |
| --- | --- | --- |
| service-manager | `openhouse/product-payloads/service-manager.tar` | `$HOME/smallphoneai-repos/service-manager` |
| cc-connect/openhouse-connect | `openhouse/product-payloads/openhouse-connect.tar` | `$HOME/smallphoneai-repos/openhouse-connect` |
| SmallPhone | `openhouse/product-payloads/smallphone.tar` | `$HOME/smallphoneai-repos/smallphone-active` |

Each archive must unpack to a child repo root containing `scripts/install.sh`
and `scripts/check.sh`; `scripts/register-service.sh` remains optional but is
used when present. The app or build asset-copy step must extract/copy these
assets to
`$HOME/.smallphoneai-bootstrap/apk-assets/openhouse/product-payloads` before
running `bash bootstrap.sh install`, `components`, or `repair`.

`50-install-runtime-components.sh` defaults to
`SMALLPHONEAI_COMPONENT_SOURCE_MODE=bundle` and reads from
`SMALLPHONEAI_BUNDLED_PAYLOAD_ROOT`. `SMALLPHONEAI_COMPONENT_SOURCE_MODE=git-update`
with `SMALLPHONEAI_COMPONENTS_ALLOW_GIT_UPDATE=1` is reserved for explicit
repair/update flows and is not a first-run dependency.

Canonical local runtime ports follow the OpenHouse five-digit `2xxxx` target
namespace:

| Surface | Endpoint |
| --- | --- |
| SmallPhone frontend | `http://127.0.0.1:22082/` |
| SmallPhone core API | `http://127.0.0.1:22000/` |
| cc-connect bridge | `tcp://127.0.0.1:21010` |
| cc-connect management | `tcp://127.0.0.1:21020` |
| cc-connect webhook/callback | `tcp://127.0.0.1:21040` |
| service-manager | `http://127.0.0.1:20087/` |

SmallPhone standalone app control-test ports use the OpenHouse `23000-24999`
range:

| App | URL |
| --- | --- |
| smallphone-likegirl | `http://127.0.0.1:23003/` |
| smallphone-likegirl clone | `http://127.0.0.1:23008/` |

## Maintenance Drawer

The outer maintenance drawer is allowed to:

- Run first-run installer stages.
- Recover an unhealthy stack.
- Restart or update core services through `service-manager`.
- Show logs and health state.
- Open terminal fallback for advanced recovery.
- Trigger bootstrap `components`, `start`, `status`, and `repair` actions.
- Use the Termux bridge for Android/Termux native actions that cannot safely run
  inside Ubuntu/proot.

It is not the primary product home screen.

## Health Gate

Before opening SmallPhone by default, the app should verify:

- `service-manager` is reachable.
- SmallPhone frontend and core API URLs are reachable.
- `cc-connect` webclient is reachable or intentionally disabled by
  `SMALLPHONEAI_CC_CONNECT_DISABLED=1`.
- Required core services have healthy or recoverable status.
