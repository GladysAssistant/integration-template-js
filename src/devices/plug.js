// -----------------------------------------------------------------------------
// Device type: SMART PLUG
// Illustrates a MIXED device: a binary actuator (relay) AND a read-only
// measurement (instantaneous power). It is both controlled and polled.
// -----------------------------------------------------------------------------

import { logger } from '../logger.js';
import { CATEGORY, TYPE, UNIT } from '../constants.js';
import { createIds } from './externalId.js';

const DEVICE_TYPE = 'plug';

// Unique id coming from the external platform (simulated here).
const PLATFORM_DEVICE_ID = 'plug-77c1ab';

const FEATURE = {
  ON_OFF: 'on-off',
  POWER: 'power',
};

// In-memory reflection of the real device state.
let isOn = false;

export const plug = {
  key: DEVICE_TYPE,

  deviceExternalId(gladys) {
    return createIds(gladys, DEVICE_TYPE, PLATFORM_DEVICE_ID).device;
  },

  buildDevice(gladys, config) {
    const ids = createIds(gladys, DEVICE_TYPE, PLATFORM_DEVICE_ID);
    return {
      name: 'Office plug',
      external_id: ids.device,
      poll_frequency: config.poll_frequency, // to refresh the power reading
      features: [
        {
          name: 'On/Off',
          external_id: ids.feature(FEATURE.ON_OFF),
          category: CATEGORY.SWITCH,
          type: TYPE.BINARY,
          read_only: false,
          has_feedback: true,
          keep_history: true,
        },
        {
          name: 'Instantaneous power',
          external_id: ids.feature(FEATURE.POWER),
          category: CATEGORY.ENERGY_SENSOR,
          type: TYPE.POWER,
          unit: UNIT.WATT,
          min: 0,
          max: 3680,
          read_only: true, // measurement: not controllable
          has_feedback: false,
          keep_history: true,
        },
      ],
    };
  },

  async onSetValue(gladys, { feature, value }) {
    const on = value === 1;
    logger.info(`[plug] Relay command: ${on ? 'ON' : 'OFF'}`);
    // ------------------------------------------------------------------ //
    // DO THE WORK: toggle the plug relay.
    // ------------------------------------------------------------------ //
    isOn = on;
    await gladys.publishState(feature.external_id, on ? 1 : 0);
  },

  async onPoll(gladys) {
    const ids = createIds(gladys, DEVICE_TYPE, PLATFORM_DEVICE_ID);
    // ------------------------------------------------------------------ //
    // DO THE WORK: read the instantaneous power measured by the plug.
    // Here we simulate it: 0 W when off, ~120 W (+ noise) when on.
    // ------------------------------------------------------------------ //
    const power = isOn ? Math.round(120 + Math.random() * 15) : 0;
    logger.info(`[plug] Measured power: ${power} W`);
    await gladys.publishState(ids.feature(FEATURE.POWER), power);
  },
};
