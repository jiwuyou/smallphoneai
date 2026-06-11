# Control Tests

SmallPhoneAI uses `smallphone-likegirl` as the first service-manager control
test for SmallPhone standalone apps.

## Repository

```text
https://github.com/jiwuyou/smallphone-likegirl
```

The current runtime can also use the LikeGirl standalone app bundled in:

```text
/root/projects/smallphone/smallphone-active/standalone-apps/like-girl
```

## Port Contract

Control-test app ports follow the OpenHouse `23000-24999` standalone app range.

| Service | Port | URL |
| --- | --- | --- |
| `smallphone-standalone-like-girl` | `23003` | `http://127.0.0.1:23003/` |
| `smallphone-standalone-like-girl-clone` | `23008` | `http://127.0.0.1:23008/` |

## Service-Manager Contract

SmallPhone registration must expose both services through `service-manager`.
Both services join `group:local-stack` and carry:

```text
openhouse-component:smallphone-standalone
control-test:smallphone-likegirl
```

Expected control actions:

- `start`
- `stop`
- `restart`
- `status`
- `logs`

The control test is non-blocking for the main launch readiness gate. Failure to
start LikeGirl must not prevent SmallPhone from opening, but it should appear in
status output so the maintenance drawer can surface it.
