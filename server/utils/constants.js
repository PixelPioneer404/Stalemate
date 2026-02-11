export const MATCH_CODE_LENGTH = 6;

export const MATCH_EXPIRY_MS = 10 * 60 * 1000;
export const ACTIVE_MATCH_RETENTION_MS = 12 * 60 * 60 * 1000;
export const FINISHED_MATCH_RETENTION_MS = 6 * 60 * 60 * 1000;

export const MATCH_STATUS = Object.freeze({
  WAITING: 'waiting',
  ACTIVE: 'active',
  FINISHED: 'finished',
  ABORTED: 'aborted',
  CANCELED: 'canceled',
});

export const RESULT_OUTCOME = Object.freeze({
  CHECKMATE: 'checkmate',
  DRAW: 'draw',
  RESIGNATION: 'resignation',
  TIMEOUT: 'timeout',
  ABORTED: 'aborted',
  ROOM_CANCELED: 'room_canceled',
});
