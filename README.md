# SmallPhoneAI

SmallPhoneAI is the Android/Termux product shell for SmallPhone. The app
should open SmallPhone by default. The outer OpenHouse maintenance surface is a
recovery and installer layer, not the primary user experience.

## Product Contract

- Default entry: launch the SmallPhone WebView/home surface when the core stack
  is healthy.
- First-run path: run the installer, start the core stack, verify health, then
  hand the user into SmallPhone.
- Recovery path: if SmallPhone cannot start, keep the user in the outer
  maintenance drawer with repair, update, logs, and terminal escape hatches.
- Backend control: `service-manager` is the control plane for core services and
  SmallPhone apps. UI actions call the backend instead of owning process logic.
- Runtime placement: the primary runtime stack runs inside the Termux-managed
  Ubuntu/proot environment. Termux native code remains the installer,
  bootstrap, bridge, and recovery layer.
- Included bridge: `cc-connect` is part of the SmallPhoneAI core stack.

## Repositories

- `openhouseai-app`: Android/Termux app host. The target behavior is
  SmallPhone-first launch with an outer maintenance drawer.
- `openhouseai-bootstrap`: first-run installer and recovery bootstrap. The
  target behavior is to install or repair the SmallPhoneAI core stack.
- `openhouseai-ui-preview`: local product preview for the SmallPhone-first
  shell and maintenance drawer.

The `openhouseai-*` directory names are transitional implementation names. The
top-level product contract is SmallPhoneAI.

## Checks

```bash
./scripts/check-repos.sh
./scripts/check-product-scope.sh
./scripts/smoke-smallphoneai-contract.sh
```

Bootstrap handoff:

```bash
cd openhouseai-bootstrap
bash bootstrap.sh status
bash bootstrap.sh components
bash bootstrap.sh start
```

Preview build:

```bash
npm --prefix openhouseai-ui-preview run build
```
