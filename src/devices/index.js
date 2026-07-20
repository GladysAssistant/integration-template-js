// -----------------------------------------------------------------------------
// Device registry.
//
// Add or remove device types here. Each device lives in its own file and
// exposes the same shape:
//   - key                        : short identifier (used in logs)
//   - deviceExternalId(gladys)   : the device external_id (for dispatch)
//   - buildDevice(gladys, config): the discovery payload sent to Gladys
//   - onPoll(gladys, config)      (optional): periodic read
//   - onSetValue(gladys, {...})   (optional): run a user command
//   - onGetImage(gladys, {...})   (optional): fresh camera capture, resolved
//     as an `image/jpg;base64,...` string (cameras only)
//   - startPush(gladys, config)   (optional): subscribe to a real-time stream
//   - transport(gladys, config)   (optional): effective transport of the
//     device ('local' | 'cloud' | 'unreachable'), shown as a badge in Gladys
//   - actions                     (optional): manifest action handlers, keyed
//     by the action `key` declared in gladys-assistant-integration.json
// -----------------------------------------------------------------------------

import { weatherStation } from './weatherStation.js';
import { switchDevice } from './switchDevice.js';
import { light } from './light.js';
import { plug } from './plug.js';
import { motionSensor } from './motionSensor.js';
import { camera } from './camera.js';

export const DEVICE_BLUEPRINTS = [weatherStation, switchDevice, light, plug, motionSensor, camera];

/**
 * Build the discovery payload for Gladys (all devices).
 */
export function buildDiscoveredDevices(gladys, config) {
  return DEVICE_BLUEPRINTS.map((bp) => bp.buildDevice(gladys, config));
}

/**
 * Find the blueprint that owns a given device, from its external_id
 * (used to route onPoll / onSetValue / onGetImage to the right device).
 */
export function findBlueprintByDevice(gladys, device) {
  return DEVICE_BLUEPRINTS.find((bp) => bp.deviceExternalId(gladys) === device.external_id);
}

/**
 * Build the `publishTransports` payload: one entry per blueprint that reports
 * its effective transport (dual-channel devices). Devices with a single,
 * obvious channel simply do not implement `transport()`.
 */
export function buildTransportEntries(gladys, config) {
  return DEVICE_BLUEPRINTS.filter((bp) => typeof bp.transport === 'function').map((bp) => ({
    external_id: bp.deviceExternalId(gladys),
    transport: bp.transport(gladys, config),
  }));
}
