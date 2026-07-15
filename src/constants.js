// -----------------------------------------------------------------------------
// Standard Gladys device-feature constants.
//
// These are the canonical category / type / unit strings understood by Gladys.
// Reference: server/utils/constants.js in the Gladys repository.
// Keep only the ones your integration needs.
// -----------------------------------------------------------------------------

export const CATEGORY = {
  TEMPERATURE_SENSOR: 'temperature-sensor',
  HUMIDITY_SENSOR: 'humidity-sensor',
  SWITCH: 'switch',
  LIGHT: 'light',
  ENERGY_SENSOR: 'energy-sensor',
  MOTION_SENSOR: 'motion-sensor',
};

export const TYPE = {
  BINARY: 'binary',
  DECIMAL: 'decimal',
  INTEGER: 'integer',
  BRIGHTNESS: 'brightness',
  POWER: 'power',
};

export const UNIT = {
  CELSIUS: 'celsius',
  FAHRENHEIT: 'fahrenheit',
  PERCENT: 'percent',
  WATT: 'watt',
};
