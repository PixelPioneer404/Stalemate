export const DEFAULT_TIME_CONTROL_KEY = 'rapid_15_10';

export const TIME_CONTROL_PRESETS = Object.freeze({
  rapid_15_10: Object.freeze({
    key: 'rapid_15_10',
    label: 'Rapid 15|10',
    initialTimeMs: 15 * 60 * 1000,
    incrementMs: 10 * 1000,
  }),
  rapid_10_5: Object.freeze({
    key: 'rapid_10_5',
    label: 'Rapid 10|5',
    initialTimeMs: 10 * 60 * 1000,
    incrementMs: 5 * 1000,
  }),
});

export const TIME_CONTROL_OPTIONS = Object.freeze(Object.values(TIME_CONTROL_PRESETS));

export const isValidTimeControlKey = (value) =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(TIME_CONTROL_PRESETS, value);

export const getTimeControlByKey = (value) => {
  if (isValidTimeControlKey(value)) {
    return TIME_CONTROL_PRESETS[value];
  }

  return TIME_CONTROL_PRESETS[DEFAULT_TIME_CONTROL_KEY];
};
