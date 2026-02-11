import { Chess } from 'chess.js';
import Match from '../models/Match.js';
import {
  ACTIVE_MATCH_RETENTION_MS,
  FINISHED_MATCH_RETENTION_MS,
  MATCH_EXPIRY_MS,
  MATCH_STATUS,
  RESULT_OUTCOME,
} from './constants.js';
import { generateMatchCode } from './codeGenerator.js';
import { getMoveDescriptor } from './chessState.js';
import {
  DEFAULT_TIME_CONTROL_KEY,
  getTimeControlByKey,
  isValidTimeControlKey,
} from './timeControls.js';

const CODE_PATTERN = /^[A-Z0-9]{6}$/;

export class MatchServiceError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'MatchServiceError';
    this.statusCode = statusCode;
  }
}

const expiresIn = (milliseconds) => new Date(Date.now() + milliseconds);

export const normalizeName = (value) => {
  if (typeof value !== 'string') {
    throw new MatchServiceError('Name is required.', 400);
  }

  const normalized = value.replace(/\s+/g, ' ').trim();

  if (normalized.length < 2 || normalized.length > 24) {
    throw new MatchServiceError('Name must be between 2 and 24 characters.', 400);
  }

  return normalized;
};

export const normalizeMatchCode = (value) => {
  if (typeof value !== 'string') {
    throw new MatchServiceError('Match code is required.', 400);
  }

  const normalized = value.trim().toUpperCase();
  if (!CODE_PATTERN.test(normalized)) {
    throw new MatchServiceError('Match code must be 6 alphanumeric characters.', 400);
  }

  return normalized;
};

export const normalizeTimeControlKey = (value) => {
  if (value === undefined || value === null || value === '') {
    return DEFAULT_TIME_CONTROL_KEY;
  }

  if (!isValidTimeControlKey(value)) {
    throw new MatchServiceError('Invalid time control. Choose Rapid 15|10 or Rapid 10|5.', 400);
  }

  return value;
};

const getTurnColor = (chess) => (chess.turn() === 'w' ? 'white' : 'black');

const getClockField = (color) => (color === 'white' ? 'whiteTimeMs' : 'blackTimeMs');

const getOpponentColor = (color) => (color === 'white' ? 'black' : 'white');

export const syncTimeControlFields = (match) => {
  const preset = getTimeControlByKey(match.timeControlKey);

  match.timeControlKey = match.timeControlKey ?? preset.key;
  match.timeControlLabel = match.timeControlLabel ?? preset.label;
  match.initialTimeMs =
    typeof match.initialTimeMs === 'number' && match.initialTimeMs > 0
      ? match.initialTimeMs
      : preset.initialTimeMs;
  match.incrementMs =
    typeof match.incrementMs === 'number' && match.incrementMs >= 0
      ? match.incrementMs
      : preset.incrementMs;
  match.whiteTimeMs =
    typeof match.whiteTimeMs === 'number' && match.whiteTimeMs >= 0
      ? match.whiteTimeMs
      : match.initialTimeMs;
  match.blackTimeMs =
    typeof match.blackTimeMs === 'number' && match.blackTimeMs >= 0
      ? match.blackTimeMs
      : match.initialTimeMs;

  return preset;
};

const getRemainingTurnTime = (match, chess, nowMs = Date.now()) => {
  const turnColor = getTurnColor(chess);
  const field = getClockField(turnColor);
  const baseTime = Math.max(0, Number(match[field] ?? 0));

  if (match.status !== MATCH_STATUS.ACTIVE || !match.activeTurnStartedAt) {
    return { turnColor, remainingMs: baseTime };
  }

  const startedAtMs = new Date(match.activeTurnStartedAt).getTime();
  const elapsedMs = Number.isFinite(startedAtMs) ? Math.max(0, nowMs - startedAtMs) : 0;

  return {
    turnColor,
    remainingMs: Math.max(0, baseTime - elapsedMs),
  };
};

export const markTimedOut = (match, loserColor) => {
  const winnerColor = getOpponentColor(loserColor);
  const loser = match.players.find((player) => player.color === loserColor);

  match.status = MATCH_STATUS.FINISHED;
  match.result = {
    outcome: RESULT_OUTCOME.TIMEOUT,
    winnerColor,
    reason: loser ? `${loser.name} ran out of time.` : `${loserColor} ran out of time.`,
    actor: loser?.name ?? loserColor,
  };
  match.drawOfferedBy = null;
  match.activeTurnStartedAt = null;
  match.expiresAt = expiresIn(FINISHED_MATCH_RETENTION_MS);
};

export const resolveTurnTimeout = (match, chess, nowMs = Date.now()) => {
  syncTimeControlFields(match);

  const { turnColor, remainingMs } = getRemainingTurnTime(match, chess, nowMs);
  match[getClockField(turnColor)] = remainingMs;

  if (remainingMs > 0) {
    return null;
  }

  markTimedOut(match, turnColor);
  return turnColor;
};

const validateMatchAvailability = (match) => {
  if (!match) {
    throw new MatchServiceError('Match not found.', 404);
  }

  if (match.status === MATCH_STATUS.CANCELED) {
    throw new MatchServiceError('Match was canceled by the host.', 410);
  }

  if (match.status === MATCH_STATUS.FINISHED || match.status === MATCH_STATUS.ABORTED) {
    throw new MatchServiceError('Match has already ended.', 410);
  }

  if (match.status === MATCH_STATUS.WAITING && match.expiresAt <= new Date()) {
    throw new MatchServiceError('Match code expired. Please create a new match.', 410);
  }

  return match;
};

export const createMatchRecord = async (rawName, rawTimeControlKey) => {
  const name = normalizeName(rawName);
  const chess = new Chess();
  const timeControlKey = normalizeTimeControlKey(rawTimeControlKey);
  const preset = getTimeControlByKey(timeControlKey);

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const matchCode = generateMatchCode();
    const existing = await Match.exists({ matchCode });

    if (existing) {
      continue;
    }

    const match = await Match.create({
      matchCode,
      players: [
        {
          name,
          socketId: null,
          color: 'white',
          isCreator: true,
          connected: false,
        },
      ],
      fen: chess.fen(),
      fenHistory: [chess.fen()],
      moveHistory: [],
      timeControlKey: preset.key,
      timeControlLabel: preset.label,
      initialTimeMs: preset.initialTimeMs,
      incrementMs: preset.incrementMs,
      whiteTimeMs: preset.initialTimeMs,
      blackTimeMs: preset.initialTimeMs,
      activeTurnStartedAt: null,
      status: MATCH_STATUS.WAITING,
      expiresAt: expiresIn(MATCH_EXPIRY_MS),
    });

    return { match, playerName: name, playerColor: 'white' };
  }

  throw new MatchServiceError('Unable to generate a unique match code. Try again.', 503);
};

export const joinMatchRecord = async (rawCode, rawName) => {
  const matchCode = normalizeMatchCode(rawCode);
  const name = normalizeName(rawName);

  const match = validateMatchAvailability(await Match.findOne({ matchCode }));
  syncTimeControlFields(match);

  const existingPlayer = match.players.find((player) => player.name.toLowerCase() === name.toLowerCase());

  if (existingPlayer) {
    return {
      match,
      playerName: existingPlayer.name,
      playerColor: existingPlayer.color,
      isRejoin: true,
    };
  }

  if (match.players.length >= 2) {
    throw new MatchServiceError('Match Full', 409);
  }

  const nextPlayer = {
    name,
    socketId: null,
    color: 'black',
    isCreator: false,
    connected: false,
  };

  match.players.push(nextPlayer);

  if (match.players.length === 2) {
    match.status = MATCH_STATUS.ACTIVE;
    match.expiresAt = expiresIn(ACTIVE_MATCH_RETENTION_MS);
    match.activeTurnStartedAt = new Date();
  }

  await match.save();

  return {
    match,
    playerName: name,
    playerColor: 'black',
    isRejoin: false,
  };
};

export const attachSocketToMatch = async ({ rawCode, rawName, socketId, allowAutoJoinSecond = false }) => {
  const matchCode = normalizeMatchCode(rawCode);
  const name = normalizeName(rawName);

  const match = validateMatchAvailability(await Match.findOne({ matchCode }));
  syncTimeControlFields(match);

  let player = match.players.find((entry) => entry.name.toLowerCase() === name.toLowerCase());

  if (!player && allowAutoJoinSecond) {
    if (match.players.length >= 2) {
      throw new MatchServiceError('Match Full', 409);
    }

    const freshPlayer = {
      name,
      socketId,
      color: 'black',
      isCreator: false,
      connected: true,
    };

    match.players.push(freshPlayer);
    player = freshPlayer;
  }

  if (!player) {
    throw new MatchServiceError('Player not registered for this match.', 403);
  }

  player.socketId = socketId;
  player.connected = true;

  if (match.players.length === 2 && match.status === MATCH_STATUS.WAITING) {
    match.status = MATCH_STATUS.ACTIVE;
    match.expiresAt = expiresIn(ACTIVE_MATCH_RETENTION_MS);
    match.activeTurnStartedAt = new Date();
  }

  if (match.status === MATCH_STATUS.ACTIVE && !match.activeTurnStartedAt) {
    match.activeTurnStartedAt = new Date();
  }

  await match.save();

  return { match, player };
};

export const getPlayerBySocket = (match, socketId) => {
  if (!match?.players?.length) {
    return null;
  }

  return match.players.find((player) => player.socketId === socketId) ?? null;
};

const getCheckmateResult = (winnerColor) => ({
  outcome: RESULT_OUTCOME.CHECKMATE,
  winnerColor,
  reason: `${winnerColor} won by checkmate.`,
  actor: winnerColor,
});

const getDrawResult = (reason) => ({
  outcome: RESULT_OUTCOME.DRAW,
  winnerColor: null,
  reason,
  actor: null,
});

export const resolveGameResult = (chess, currentPlayer) => {
  if (!chess.isGameOver()) {
    return null;
  }

  if (chess.isCheckmate()) {
    return getCheckmateResult(currentPlayer.color);
  }

  if (chess.isStalemate()) {
    return getDrawResult('Draw by stalemate.');
  }

  if (chess.isInsufficientMaterial()) {
    return getDrawResult('Draw by insufficient material.');
  }

  if (chess.isThreefoldRepetition()) {
    return getDrawResult('Draw by threefold repetition.');
  }

  if (chess.isDraw()) {
    return getDrawResult('Draw by fifty-move rule.');
  }

  return getDrawResult('Draw.');
};

export const applyMoveToMatch = (match, chess, move, player) => {
  syncTimeControlFields(match);
  match.fen = chess.fen();
  match.lastMove = getMoveDescriptor(move);
  match.moveHistory.push(move.san);
  match.fenHistory.push(chess.fen());
  match.drawOfferedBy = null;

  const result = resolveGameResult(chess, player);

  if (result) {
    match.status = MATCH_STATUS.FINISHED;
    match.result = result;
    match.activeTurnStartedAt = null;
    match.expiresAt = expiresIn(FINISHED_MATCH_RETENTION_MS);
  } else {
    match.status = MATCH_STATUS.ACTIVE;
  }

  return result;
};

export const markResigned = (match, player) => {
  syncTimeControlFields(match);
  const winnerColor = player.color === 'white' ? 'black' : 'white';

  match.status = MATCH_STATUS.FINISHED;
  match.result = {
    outcome: RESULT_OUTCOME.RESIGNATION,
    winnerColor,
    reason: `${player.name} resigned.`,
    actor: player.name,
  };
  match.drawOfferedBy = null;
  match.activeTurnStartedAt = null;
  match.expiresAt = expiresIn(FINISHED_MATCH_RETENTION_MS);
};

export const markAborted = (match, player) => {
  syncTimeControlFields(match);
  match.status = MATCH_STATUS.ABORTED;
  match.result = {
    outcome: RESULT_OUTCOME.ABORTED,
    winnerColor: null,
    reason: `${player.name} aborted the match.`,
    actor: player.name,
  };
  match.drawOfferedBy = null;
  match.activeTurnStartedAt = null;
  match.expiresAt = expiresIn(FINISHED_MATCH_RETENTION_MS);
};

export const markDrawByAgreement = (match, player) => {
  syncTimeControlFields(match);
  match.status = MATCH_STATUS.FINISHED;
  match.result = {
    outcome: RESULT_OUTCOME.DRAW,
    winnerColor: null,
    reason: `Draw accepted by ${player.name}.`,
    actor: player.name,
  };
  match.drawOfferedBy = null;
  match.activeTurnStartedAt = null;
  match.expiresAt = expiresIn(FINISHED_MATCH_RETENTION_MS);
};

export const detachSocketFromMatches = async (socketId) => {
  const matches = await Match.find({ 'players.socketId': socketId });

  const updates = [];

  for (const match of matches) {
    const player = match.players.find((entry) => entry.socketId === socketId);

    if (!player) {
      continue;
    }

    player.socketId = null;
    player.connected = false;

    updates.push(
      match.save().then(() => ({
        matchCode: match.matchCode,
        playerName: player.name,
        status: match.status,
      }))
    );
  }

  return Promise.all(updates);
};
