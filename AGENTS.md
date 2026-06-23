# SmallPhoneAI Workspace Guidelines

This workspace coordinates the SmallPhoneAI product contract across the app,
bootstrap, preview, and documentation.

## Scope

SmallPhoneAI includes:

- SmallPhone as the default app surface.
- An outer maintenance drawer for first-run install, recovery, repair, update,
  logs, and advanced controls.
- `service-manager` as the backend control plane for core services and
  SmallPhone apps.
- `cc-connect` as a bundled bridge in the core stack.
- Agent tools required by SmallPhoneAI workflows, exposed through the backend or
  the SmallPhone UI rather than as the product's main screen.

## Working Rules

- Keep the app launch contract SmallPhone-first. Terminal, installer, and
  maintenance screens are fallback or advanced surfaces.
- Keep process lifecycle logic behind `service-manager`; UI code should request
  status, start, stop, restart, repair, update, and logs through backend
  actions.
- Keep first-run and recovery flows idempotent where practical.
- Keep secrets, tokens, provider API keys, and local credentials out of tracked
  files.
- Treat OpenHouse project manifests as editable source, but keep runtime
  registry writes behind `service-manager` APIs.
- Do not hand-edit the Termux canonical registry mirror under
  `/data/data/com.termux/files/home/.config/openhouseai`; it is generated state
  for Android to read and should be repaired or resynced through bootstrap only
  when `service-manager` is unavailable.
- Treat `openhouseai-*` child repository names as transitional implementation
  names. Do not use them to narrow the product back to an installer-only scope.
