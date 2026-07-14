# Gladys external integration — JavaScript template

Official starter template for building an **external integration** for
[Gladys Assistant](https://gladysassistant.com) with the JavaScript SDK
[`@gladysassistant/integration-sdk`](https://github.com/GladysAssistant/integration-sdk-js).

> Fork it, add the GitHub topic `gladys-assistant-integration`, push a
> multi-arch image, bump the version — that's publishing. No account, no review.

## What this template demonstrates

This is **not** a 40-line hello-world: it deliberately shows several **device
types** so you can copy the one closest to your hardware. Everything lives in
[`src/devices.js`](./src/devices.js), and every place where you would talk to
your real hardware / cloud API is marked with a `FAIRE LE TRAVAIL` comment and
a `logger` call.

| Device | Type illustrated | SDK hooks used |
|--------|------------------|----------------|
| Station météo | Read-only sensors (temperature + humidity), **real data** via Open-Meteo | `onPoll`, `publishStates` |
| Interrupteur salon | Binary actuator (ON/OFF) | `onSetValue`, `publishState` |
| Lampe salon | Dimmable light (on/off **+** brightness) | `onSetValue` per feature |
| Prise bureau | Mixed: actuator **+** power metering | `onSetValue`, `onPoll` |
| Détecteur de mouvement | Push / event-driven sensor | `startPush`, `publishState` |

The wiring (connection, auth, reconnection, dispatch) is in
[`index.js`](./index.js) — you rarely need to touch it.

## Project structure

```
.
├─ index.js                          # SDK bootstrap + event wiring
├─ src/
│  ├─ devices.js                     # ← the device catalog (edit this)
│  ├─ weather.js                     # example real "driver" (Open-Meteo)
│  ├─ config.js                      # config defaults + normalization
│  └─ logger.js                      # tiny console logger
├─ gladys-assistant-integration.json # manifest (name, config schema, image…)
├─ Dockerfile                        # Node 20 Alpine, read-only rootfs ready
├─ .github/workflows/build.yml       # multi-arch build on git tag
└─ cover.png                         # catalog cover, 800×534 px, ≤150 KB
```

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

## Publish in 5 steps

1. **Fork** this template (or use *Use this template* on GitHub).
2. **Edit** `src/devices.js` and `gladys-assistant-integration.json` for your
   devices, and replace `docker_image` / `cover_image` with your own.
3. **Add the GitHub topic** `gladys-assistant-integration` to your repo.
4. **Tag a release** (`git tag v1.0.0 && git push --tags`) — the workflow
   builds and pushes the `linux/amd64` + `linux/arm64` image to `ghcr.io`.
5. **Bump `version`** in the manifest for each update; the decentralized
   indexer picks it up and Gladys offers a one-click install / update.

Full documentation: <https://gladysassistant.com> (integrations developer guide).

## Notes

- Requires **Node.js ≥ 20** (uses the built-in global `fetch`; no HTTP dep).
- All external identifiers are prefixed with `ext:<selector>:` — always build
  them with `gladys.externalId(suffix)`; the server rejects anything else.
- `has_feedback: true` features should publish the state **confirmed by the
  device**; the template publishes the requested value for simplicity.
- Replace `cover.png` with your own 800×534 px image (≤150 KB, PNG or JPEG)
  before publishing. The bundled one is a plain gradient placeholder.

## License

Apache-2.0
