// -----------------------------------------------------------------------------
// Device type: DIMMABLE LIGHT
// Illustrates a device with SEVERAL controllable features: on/off + brightness.
// A single onSetValue callback handles the whole device and routes per feature.
// -----------------------------------------------------------------------------

import { logger } from '../logger.js';
import { CATEGORY, TYPE, UNIT } from '../constants.js';
import { createIds } from './externalId.js';

const DEVICE_TYPE = 'light';

// Unique id coming from the external platform (simulated here).
const PLATFORM_DEVICE_ID = 'bulb-4d9e01';

const FEATURE = {
  ON_OFF: 'on-off',
  BRIGHTNESS: 'brightness',
};

// In-memory reflection of the real device state.
let isOn = false;
let brightness = 50;

export const light = {
  key: DEVICE_TYPE,

  deviceExternalId(gladys) {
    return createIds(gladys, DEVICE_TYPE, PLATFORM_DEVICE_ID).device;
  },

  buildDevice(gladys) {
    const ids = createIds(gladys, DEVICE_TYPE, PLATFORM_DEVICE_ID);
    return {
      name: 'Living room light',
      external_id: ids.device,
      features: [
        {
          name: 'On/Off',
          external_id: ids.feature(FEATURE.ON_OFF),
          category: CATEGORY.LIGHT,
          type: TYPE.BINARY,
          read_only: false,
          has_feedback: true,
          keep_history: true,
        },
        {
          name: 'Brightness',
          external_id: ids.feature(FEATURE.BRIGHTNESS),
          category: CATEGORY.LIGHT,
          type: TYPE.BRIGHTNESS,
          unit: UNIT.PERCENT,
          min: 0,
          max: 100,
          read_only: false,
          has_feedback: true,
          keep_history: true,
        },
      ],
    };
  },

  async onSetValue(gladys, { feature, value }) {
    const ids = createIds(gladys, DEVICE_TYPE, PLATFORM_DEVICE_ID);

    if (feature.external_id === ids.feature(FEATURE.ON_OFF)) {
      const on = value === 1;
      logger.info(`[light] Power: ${on ? 'ON' : 'OFF'}`);
      // -------------------------------------------------------------- //
      // DO THE WORK: turn the bulb on/off.
      // e.g. await zigbee.set(ieeeAddr, { state: on ? 'ON' : 'OFF' });
      // -------------------------------------------------------------- //
      isOn = on;
      await gladys.publishState(feature.external_id, on ? 1 : 0);
      return;
    }

    if (feature.external_id === ids.feature(FEATURE.BRIGHTNESS)) {
      const level = Math.max(0, Math.min(100, value));
      logger.info(`[light] Brightness: ${level}%`);
      // -------------------------------------------------------------- //
      // DO THE WORK: set the brightness (often needs converting to the
      // hardware scale, e.g. 0-254 for Zigbee).
      // e.g. await zigbee.set(ieeeAddr, { brightness: Math.round(level / 100 * 254) });
      // -------------------------------------------------------------- //
      brightness = level;
      isOn = level > 0;
      await gladys.publishState(feature.external_id, level);
      return;
    }

    logger.warn(`[light] Unknown feature: ${feature.external_id}`);
  },
};
