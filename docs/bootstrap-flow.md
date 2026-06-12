# Bootstrap Flow

Repository:

```text
/root/projects/smallphoneai/openhouseai-bootstrap
```

The repository name is transitional. Its target responsibility is the
SmallPhoneAI first-run installer and recovery bootstrap.

## Target Flow

```text
check Termux
  -> unpack and verify APK-bundled offline payload
  -> prepare Termux paths and packages
  -> install or repair Ubuntu through proot
  -> install base Ubuntu packages
  -> enter Ubuntu/proot for primary runtime components
  -> install service-manager from the APK-bundled payload in Ubuntu/proot
  -> install cc-connect/openhouse-connect from the APK-bundled payload in Ubuntu/proot
  -> install SmallPhone from the APK-bundled payload in Ubuntu/proot
  -> register smallphone-likegirl as a service-manager control-test app
  -> install required agent tools
  -> run runtime-components registration
  -> register service-manager services
  -> start SmallPhone through service-manager
  -> run health checks
  -> report the SmallPhone launch target to the app
```

## Required Properties

- Idempotent: a failed first run can be resumed from the maintenance drawer.
- Recoverable: repair actions can restart or reinstall the core stack without
  deleting user data by default.
- Backend-led: lifecycle actions should route through `service-manager`.
- SmallPhone-first: a successful bootstrap ends by letting the app open
  SmallPhone, not by leaving the user in the installer or terminal.
- Offline-first: first run is satisfied from the APK-bundled offline payload.
  GitHub and network sources are optional after boot, not prerequisites.
- Bridge included: `cc-connect` must be installed or repaired as part of the
  core stack.
- Control test included: `smallphone-likegirl` is registered as a controllable
  SmallPhone standalone app through `service-manager`.
- Runtime placement: `service-manager`, SmallPhone, and `cc-connect` run in
  Ubuntu/proot by default. Termux native scripts are the bootstrap, bridge, and
  recovery fallback.

## Offline First-Run Contract

The APK must contain a versioned offline payload sufficient for a clean install
to reach the SmallPhone health gate without fetching bootstrap code or component
source from GitHub. GitHub/network access is an optional update path only, not a
first-run dependency. The runtime component payload archives live under
`app/src/main/assets`:

| Component | APK asset path |
| --- | --- |
| service-manager | `openhouse/product-payloads/service-manager.tar` |
| cc-connect/openhouse-connect | `openhouse/product-payloads/openhouse-connect.tar` |
| SmallPhone | `openhouse/product-payloads/smallphone.tar` |

Each archive must unpack to a child repo root containing `scripts/install.sh`
and `scripts/check.sh`. Checksums and versions should be recorded by the
payload manifest generated with `scripts/package-apk-product-payloads.sh`.

The Android host extracts the payload before invoking bootstrap and exposes it
at `$HOME/.smallphoneai-bootstrap/apk-assets/openhouse/product-payloads`.
That extracted payload directory is also passed as
`SMALLPHONEAI_OFFLINE_PAYLOAD_DIR`; the generated
`payload-manifest.json` path is passed as
`SMALLPHONEAI_OFFLINE_PAYLOAD_MANIFEST`.
`50-install-runtime-components.sh` reads that location through
`SMALLPHONEAI_BUNDLED_PAYLOAD_ROOT` and defaults to
`SMALLPHONEAI_COMPONENT_SOURCE_MODE=bundle`. GitHub, package registries,
package mirrors, and other remote sources may be used only as optional update or
repair accelerators after the local payload path has been attempted.

If a required artifact is absent from the payload and cannot be downloaded, the
installer reports `repairable` or `terminal_required` with the missing artifact
name. It must not silently switch to a GitHub-first flow.

## App Handoff

The bootstrap should expose enough state for the app to decide between:

- `ready`: open SmallPhone directly.
- `installing`: show first-run progress in the maintenance drawer.
- `repairable`: show recovery actions and logs.
- `terminal_required`: show a terminal fallback with the current failure.

## Machine Hooks

The app-facing bootstrap contract should include these idempotent hooks:

- `status`: machine-readable SmallPhoneAI state for launch gating.
- `hooks`: machine-readable action metadata for installer/recovery UI.
- `components`: install, check, and register runtime components.
- `install` / `full`: run the full first-run flow and report final status
  health.
- `start`: start `service-manager`, start the SmallPhone local stack, and
  report final status health.
- `repair`: rerun component registration, start, and status reporting.

Hook metadata marks `install`, `full`, `start`, and `repair` with
`reportsFinalHealth: true`. Those commands may emit progress logs first; the
health report is the final stdout JSON object.

## Runtime Port Contract

Bootstrap status/readiness checks the current local runtime ports:

| Component | URL |
| --- | --- |
| SmallPhone frontend | `http://127.0.0.1:22082/` |
| SmallPhone core API | `http://127.0.0.1:22000/` |
| cc-connect webclient | `http://127.0.0.1:21040/` |
| service-manager | `http://127.0.0.1:20087/` |

OpenHouse standalone app control-test ports:

| Component | URL |
| --- | --- |
| smallphone-likegirl | `http://127.0.0.1:23003/` |
| smallphone-likegirl clone | `http://127.0.0.1:23008/` |

`cc-connect` is required for readiness unless
`SMALLPHONEAI_CC_CONNECT_DISABLED=1` or `SMALLPHONEAI_DISABLE_CC_CONNECT=1`
is set. `install`/`full`, `start`, and `repair` run the status check after
their startup work so the caller gets the final health JSON.
