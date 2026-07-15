// -----------------------------------------------------------------------------
// Helper to build the device and feature external ids of ONE physical device.
//
// Why this matters: an external_id must be **globally unique and stable**. It is
// how Gladys matches an incoming state to the right device/feature across
// restarts. It must therefore be derived from the unique id that the external
// platform gives you for the device (a serial number, a cloud device id, a
// Zigbee IEEE address, a MAC, ...), NOT from a hard-coded label.
//
// The SDK prefixes everything with `ext:<selector>:` via `gladys.externalId()`.
// On top of that we namespace by device type + the platform id, so two devices
// of the same type never collide.
//
//   device  → ext:<selector>:<type>:<platformId>
//   feature → ext:<selector>:<type>:<platformId>:<featureKey>
// -----------------------------------------------------------------------------

/**
 * @param {import('@gladysassistant/integration-sdk').GladysIntegration} gladys
 * @param {string} type       device type namespace, e.g. 'weather-station'
 * @param {string} platformId unique id coming from the external platform
 */
export function createIds(gladys, type, platformId) {
  const deviceId = gladys.externalId(`${type}:${platformId}`);
  return {
    device: deviceId,
    feature: (featureKey) => gladys.externalId(`${type}:${platformId}:${featureKey}`),
  };
}
