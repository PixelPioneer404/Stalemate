export const DEFAULT_TIME_CONTROL_KEY = 'rapid_15_10';

export const TIME_CONTROL_OPTIONS = Object.freeze([
  Object.freeze({
    key: 'rapid_15_10',
    label: 'Rapid 15|10',
    initialTimeMs: 15 * 60 * 1000,
    incrementMs: 10 * 1000,
  }),
  Object.freeze({
    key: 'rapid_10_5',
    label: 'Rapid 10|5',
    initialTimeMs: 10 * 60 * 1000,
    incrementMs: 5 * 1000,
  }),
]);

export const getTimeControlByKey = (key) =>
  TIME_CONTROL_OPTIONS.find((option) => option.key === key) ??
  TIME_CONTROL_OPTIONS.find((option) => option.key === DEFAULT_TIME_CONTROL_KEY) ??
  TIME_CONTROL_OPTIONS[0];
