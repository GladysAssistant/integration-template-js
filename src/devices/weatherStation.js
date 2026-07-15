// -----------------------------------------------------------------------------
// Device type: WEATHER STATION
// Illustrates read-only sensors (temperature + humidity) refreshed by polling.
// Uses REAL data from the free Open-Meteo API (no hardware, no API key).
// -----------------------------------------------------------------------------

import { logger } from '../logger.js';
import { fetchWeather } from '../weather.js';
import { CATEGORY, TYPE, UNIT } from '../constants.js';
import { createIds } from './externalId.js';

const DEVICE_TYPE = 'weather-station';

// Unique id provided by the external platform for THIS physical device.
// In a real integration you obtain it when you enumerate devices from the
// platform (cloud API, gateway, serial bus...). It MUST be unique and stable.
// Here we simulate the id Open-Meteo would attach to a station/location.
const PLATFORM_DEVICE_ID = 'openmeteo-48.8566_2.3522';

// Feature keys, kept in one place so discovery and polling always agree.
const FEATURE = {
  TEMPERATURE: 'temperature',
  HUMIDITY: 'humidity',
};

export const weatherStation = {
  key: DEVICE_TYPE,

  deviceExternalId(gladys) {
    return createIds(gladys, DEVICE_TYPE, PLATFORM_DEVICE_ID).device;
  },

  buildDevice(gladys, config) {
    const ids = createIds(gladys, DEVICE_TYPE, PLATFORM_DEVICE_ID);
    return {
      name: 'Weather station (Open-Meteo demo)',
      external_id: ids.device,
      // Gladys will call onPoll at this interval (in seconds).
      poll_frequency: config.poll_frequency,
      features: [
        {
          name: 'Temperature',
          external_id: ids.feature(FEATURE.TEMPERATURE),
          category: CATEGORY.TEMPERATURE_SENSOR,
          type: TYPE.DECIMAL,
          unit: config.unit === 'fahrenheit' ? UNIT.FAHRENHEIT : UNIT.CELSIUS,
          min: -50,
          max: 60,
          read_only: true, // sensor: no action possible
          has_feedback: false,
          keep_history: true, // keep history to draw charts
        },
        {
          name: 'Humidity',
          external_id: ids.feature(FEATURE.HUMIDITY),
          category: CATEGORY.HUMIDITY_SENSOR,
          type: TYPE.INTEGER,
          unit: UNIT.PERCENT,
          min: 0,
          max: 100,
          read_only: true,
          has_feedback: false,
          keep_history: true,
        },
      ],
    };
  },

  async onPoll(gladys, config) {
    const ids = createIds(gladys, DEVICE_TYPE, PLATFORM_DEVICE_ID);
    logger.info('[weather-station] Polling weather values...');

    // ------------------------------------------------------------------ //
    // DO THE WORK: read the real sensor values.
    // Here it is an HTTP call to Open-Meteo. Replace with your own source.
    // ------------------------------------------------------------------ //
    const { temperature, humidity } = await fetchWeather(config);

    logger.info(`[weather-station] Read: ${temperature}deg / ${humidity}%`);

    // Publish both values in a single request (batch, up to 100).
    await gladys.publishStates([
      { device_feature_external_id: ids.feature(FEATURE.TEMPERATURE), state: temperature },
      { device_feature_external_id: ids.feature(FEATURE.HUMIDITY), state: humidity },
    ]);
  },
};
