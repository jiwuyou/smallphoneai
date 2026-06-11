# SmallPhoneAI UI Preview

This standalone Vite preview models the SmallPhoneAI product contract without
editing `openhouseai-app` or `openhouseai-bootstrap`.

## Start

```bash
cd /root/projects/smallphoneai/openhouseai-ui-preview
npm install
npm run dev -- --host 0.0.0.0 --port 4173
```

Suggested port: `4173`. If it is already in use, choose another port:

```bash
npm run dev -- --host 0.0.0.0 --port 4174
```

## Preview Scope

- The first visible product surface is SmallPhone.
- The outer maintenance drawer stays closed on first render and opens for
  first-run install, recovery, health, logs, and advanced controls.
- `service-manager` is represented as the backend control plane for core
  services and SmallPhone apps.
- `cc-connect` is represented as part of the bundled core stack.
- Terminal access remains an advanced fallback rather than the default app
  surface.

Runtime labels in the preview use the current local port contract:

| Component | URL |
| --- | --- |
| SmallPhone frontend | `http://127.0.0.1:22082/` |
| SmallPhone core API | `http://127.0.0.1:22000/` |
| cc-connect webclient | `http://127.0.0.1:21040/` |
| service-manager | `http://127.0.0.1:20087/` |

## Build Check

```bash
npm run build
```
