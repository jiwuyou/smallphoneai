# Repository Map

## `/root/projects/smallphoneai`

Top-level SmallPhoneAI coordination workspace.

Current role:

- Define the SmallPhoneAI product contract.
- Track child repository boundaries.
- Provide checks for contract text, repository layout, and preview build
  health.

## `/root/projects/smallphoneai/openhouseai-app`

Android/Termux app host. The name is transitional.

Target role:

- Open SmallPhone by default when the core stack is healthy.
- Show the outer maintenance drawer for first-run install, recovery, repair,
  update, logs, and advanced controls.
- Route lifecycle actions to `service-manager` instead of implementing service
  orchestration in the UI.
- Use Termux native hooks only for bootstrap, Ubuntu launch, bridge, and
  recovery fallback.
- Use terminal access as a fallback, not the default app surface.

## `/root/projects/smallphoneai/openhouseai-bootstrap`

SmallPhoneAI first-run installer and recovery bootstrap. The name is
transitional.

Target role:

- Prepare Termux and Ubuntu runtime dependencies.
- Install or repair `service-manager`, `cc-connect`, SmallPhone, and required
  agent tools.
- Run primary runtime component actions inside Ubuntu/proot by default.
- Register service-manager services and health checks.
- Register `smallphone-likegirl` as the SmallPhone standalone app control-test
  target on the OpenHouse `23003` app port.
- Provide resumable first-run and recovery actions for the app.
- Expose machine-readable `status` and `hooks` commands for launch gating and
  maintenance UI integration.

## `/root/projects/smallphoneai/openhouseai-ui-preview`

Local product preview.

Current role:

- Model the SmallPhone-first launch experience.
- Model the outer maintenance drawer, first-run/recovery states, and backend
  control assumptions without touching the Android app repository.
