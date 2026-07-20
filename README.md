# Gladys external integration — JavaScript template

Official starter template for building an **external integration** for
[Gladys Assistant](https://gladysassistant.com) with the JavaScript SDK
[`@gladysassistant/integration-sdk`](https://github.com/GladysAssistant/integration-sdk-js).

> Fork it, add the GitHub topic `gladys-assistant-integration`, push a
> multi-arch image, bump the version — that's publishing. No account, no review.

## What this template demonstrates

This is **not** a 40-line hello-world: it deliberately shows several **device
types** so you can copy the one closest to your hardware. Everything lives in
the [`src/devices/`](./src/devices) folder (one file per device type), and every
place where you would talk to your real hardware / cloud API is marked with a
`DO THE WORK` comment and a `logger` call.

| Device                 | Type illustrated                                                         | SDK hooks used                              |
| ---------------------- | ------------------------------------------------------------------------ | ------------------------------------------- |
| Weather station        | Read-only sensors (temperature + humidity), **real data** via Open-Meteo | `onPoll`, `publishStates`, `onAction`       |
| Living room switch     | Binary actuator (ON/OFF)                                                 | `onSetValue`, `publishState`                |
| Living room light      | Dimmable light (on/off **+** brightness)                                 | `onSetValue` per feature                    |
| Office plug            | Mixed: actuator **+** power metering, cloud/local **transport badge**    | `onSetValue`, `onPoll`, `publishTransports` |
| Entrance motion sensor | Push / event-driven sensor                                               | `startPush`, `publishState`                 |
| Entrance camera        | Camera images: periodic snapshot **+** on-demand fresh capture           | `publishCameraImage`, `onGetImage`          |

The wiring (connection, auth, reconnection, dispatch) is in
[`index.js`](./index.js) — you rarely need to touch it.

## Project structure

```
.
├─ index.js                          # SDK bootstrap + event wiring (no device logic)
├─ src/
│  ├─ devices/                       # ← one file per device type (edit these)
│  │  ├─ index.js                    #   registry: list your devices here
│  │  ├─ weatherStation.js           #   read-only sensors (poll)
│  │  ├─ switchDevice.js             #   binary actuator
│  │  ├─ light.js                    #   dimmable light (on/off + brightness)
│  │  ├─ plug.js                     #   actuator + power metering + transport badge
│  │  ├─ motionSensor.js             #   push / event-driven sensor
│  │  └─ camera.js                   #   camera images (push + pull)
│  ├─ weather.js                     # example real "driver" (Open-Meteo)
│  └─ config.js                      # config defaults + normalization
├─ gladys-assistant-integration.json # manifest (name, config schema, image…)
├─ Dockerfile                        # Node 24 Alpine, read-only rootfs ready
├─ .github/workflows/release.yml     # UI-driven release: bump + tag + build
├─ .github/workflows/build.yml       # multi-arch build (git tag or called by release)
└─ cover.png                         # catalog cover, 800×534 px, ≤150 KB
```

To add a device type, create a new file in `src/devices/` following the same
shape as the existing ones, then register it in `src/devices/index.js`. Business
logic (the device modules) and utilities (`weather.js`, `config.js`) are kept
separate so the parts you edit stay small.

The plumbing you would otherwise copy into every integration comes straight
from the SDK (v0.5.0+):

- `logger` / `createLogger({ name })` — leveled console logger (`LOG_LEVEL`
  env var), with named/child loggers per module. Since SDK v0.4 the SDK also
  logs its own connection lifecycle (under the `gladys-sdk` name), so
  connectivity problems show up in `docker logs` without extra code;
- `DEVICE_FEATURE_CATEGORIES`, `DEVICE_FEATURE_TYPES`, `DEVICE_FEATURE_UNITS`
  — the standard Gladys categories / types / units, no manual string copying;
- `gladys.externalIds(type, platformId)` — builds the unique, stable device
  and feature external ids;
- `gladys.handleShutdown(cleanup)` — graceful SIGTERM/SIGINT handling;
- `gladys.setConnectionStatus(connected, message?)` — application-level
  connection status shown in the Configuration screen (the template reports it
  after every (re)initialization);
- `gladys.onAction(key, cb)` — handler of a manifest `actions` button: the
  template declares a `test_weather` action (manifest `actions` field) and the
  weather station blueprint implements it, returning the multi-language
  message displayed under the button;
- `gladys.publishCameraImage(externalId, image)` / `gladys.onGetImage(cb)`
  (SDK v0.5) — the camera image channel: push a periodic snapshot and answer
  on-demand capture requests with an `image/jpg;base64,...` string (≤ 150 KB,
  max 12 images/minute per device). Dedicated channel: images never go through
  the states history. See [`src/devices/camera.js`](./src/devices/camera.js);
- `gladys.publishTransports(entries)` + `DEVICE_TRANSPORTS` (SDK v0.5) — the
  per-device cloud/local transport badge for dual-channel devices. The
  manifest declares `"transports": ["local", "cloud"]`, so the Configuration
  screen shows a standard "Prefer the local connection" toggle whose value
  arrives as the reserved, read-only config key `GLADYS_PREFER_LOCAL`
  (boolean, default `true`). The demo plug applies the preference and reports
  its effective transport. See [`src/devices/plug.js`](./src/devices/plug.js).

The SDK offers more for integrations that need it — OAuth2 cloud flows
(`onOAuthAuthorizeUrl` / `onOAuthCallback` + an `oauth2` config field),
sub-containers (`getContainers`, `startContainer`… + the manifest `containers`
field) and mediated network discovery (`scanNetwork` + the manifest
`network_discovery` field, for UDP-broadcast / mDNS / SSDP scans from the
core). See the
[SDK README](https://github.com/GladysAssistant/integration-sdk-js) for those
patterns; this template stays focused on devices.

## Run it locally

```bash
npm install
GLADYS_HOST_API_URL="http://localhost:1443" \
GLADYS_INTEGRATION_TOKEN="<token>" \
GLADYS_INTEGRATION_SELECTOR="demo-devices-template" \
LOG_LEVEL=debug \
npm start
```

The three `GLADYS_*` variables are injected by the Gladys supervisor when the
integration runs inside its sandboxed container. The SDK reads them
automatically.

## Quality checks

The template ships with the tooling every integration should keep. The same
three checks run automatically on every push and pull request (see
[`.github/workflows/ci.yml`](.github/workflows/ci.yml)):

```bash
npm run format:check   # Prettier: is everything formatted?
npm run format         # Prettier: format everything in place
npm run lint           # ESLint: catch real mistakes (unused vars, dead code…)
npm test               # Unit tests, via the built-in `node --test` runner
```

Tests live in [`test/`](test/) and use Node's native test runner — no extra
test framework to install. Add a `*.test.js` file next to the ones already
there and it is picked up automatically.

## Publish in 5 steps

1. **Fork** this template (or use _Use this template_ on GitHub).
2. **Edit** the files in `src/devices/` and `gladys-assistant-integration.json` for your
   devices, and replace `docker_image` / `cover_image` with your own.
3. **Add the GitHub topic** `gladys-assistant-integration` to your repo.
4. **Release from the GitHub UI**: open **Actions → Release → Run workflow**,
   pick `patch`, `minor` or `major`. The workflow bumps the version everywhere
   (`package.json` + manifest `version`/`docker_image`), pushes the `vX.Y.Z`
   tag, and builds the `linux/amd64` + `linux/arm64` image to `ghcr.io`
   (`:X.Y.Z` and `:latest`). No local tag, no manual version edit.
5. The decentralized indexer picks up the new manifest `version` and Gladys
   offers a one-click install / update.

> Prefer the terminal? `git tag v1.0.0 && git push --tags` still works — the
> hand-pushed tag triggers the same multi-arch build. This path only publishes
> the Docker tags, though: it does **not** touch `package.json`,
> `package-lock.json` or the manifest. Bump `version` (and `docker_image`) in
> `gladys-assistant-integration.json` and commit it **before** tagging, or the
> indexer will keep serving the old version. The Release workflow above does
> all of this for you.

Full documentation: <https://gladysassistant.com> (integrations developer guide).

## Notes

- Requires **Node.js ≥ 20** (uses the built-in global `fetch`; no HTTP dep).
- All external identifiers are prefixed with `ext:<selector>:` — always build
  them with `gladys.externalIds(type, platformId)` (or the lower-level
  `gladys.externalId(suffix)`); the server rejects anything else. Derive
  `platformId` from the unique id the external platform gives you (serial,
  cloud id, MAC…), never from a hard-coded label.
- `has_feedback: true` features should publish the state **confirmed by the
  device**; the template publishes the requested value for simplicity.
- Replace `cover.png` with your own 800×534 px image (≤150 KB, PNG or JPEG)
  before publishing. The bundled one is a plain gradient placeholder.

## License

Apache-2.0
