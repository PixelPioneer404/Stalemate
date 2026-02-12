import { Chess } from 'chess.js';
import { getTimeControlByKey } from './timeControls.js';

export const getKingSquare = (chess, color) => {
  const board = chess.board();

  for (let rowIndex = 0; rowIndex < board.length; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < board[rowIndex].length; columnIndex += 1) {
      const piece = board[rowIndex][columnIndex];
      if (piece && piece.type === 'k' && piece.color === color) {
        return piece.square;
      }
    }
  }

  return null;
};

export const getMatchSnapshot = (match, explicitChess = null) => {
  try {
    const chess = explicitChess ?? new Chess(match.fen);
    const currentTurn = chess.turn() === 'w' ? 'white' : 'black';
    const inCheck = chess.inCheck();
    const timeControlPreset = getTimeControlByKey(match.timeControlKey);
    const initialTimeMs =
      typeof match.initialTimeMs === 'number' && match.initialTimeMs > 0
        ? match.initialTimeMs
        : timeControlPreset.initialTimeMs;
    const incrementMs =
      typeof match.incrementMs === 'number' && match.incrementMs >= 0
        ? match.incrementMs
        : timeControlPreset.incrementMs;
    const whiteTimeMs =
      typeof match.whiteTimeMs === 'number' && match.whiteTimeMs >= 0
        ? match.whiteTimeMs
        : initialTimeMs;
    const blackTimeMs =
      typeof match.blackTimeMs === 'number' && match.blackTimeMs >= 0
        ? match.blackTimeMs
        : initialTimeMs;

    return {
      matchCode: match.matchCode,
      fen: chess.fen(),
      fenHistory: Array.isArray(match.fenHistory) ? [...match.fenHistory] : [chess.fen()],
      moveHistory: Array.isArray(match.moveHistory) ? [...match.moveHistory] : [],
      players: (Array.isArray(match.players) ? match.players : []).map((player) => ({
        name: String(player.name || ''),
        color: String(player.color || ''),
        isCreator: Boolean(player.isCreator),
        connected: Boolean(player.connected),
      })),
      turn: currentTurn,
      status: match.status,
      timeControl: {
        key: match.timeControlKey ?? timeControlPreset.key,
        label: match.timeControlLabel ?? timeControlPreset.label,
        initialTimeMs,
        incrementMs,
      },
      whiteTimeMs,
      blackTimeMs,
      activeTurnStartedAt: match.activeTurnStartedAt
        ? new Date(match.activeTurnStartedAt).toISOString()
        : null,
      expiresAt: match.expiresAt ? new Date(match.expiresAt).toISOString() : null,
      createdAt: match.createdAt ? new Date(match.createdAt).toISOString() : null,
      result: match.result || null,
      drawOfferedBy: match.drawOfferedBy || null,
      inCheck,
      checkSquare: inCheck ? getKingSquare(chess, chess.turn()) : null,
      isCheckmate: chess.isCheckmate(),
      isDraw: chess.isDraw(),
      isStalemate: chess.isStalemate(),  
      isGameOver: chess.isGameOver(),
      lastMove: match.lastMove || null,
    };
  } catch (error) {
    console.error('Error creating match snapshot:', error);
    throw error;
  }
};

export const getMoveDescriptor = (move) => ({
  from: move.from,
  to: move.to,
  san: move.san,
  capture: Boolean(move.captured),
  check: move.san.includes('+') || move.san.includes('#'),
  promotion: move.promotion ?? null,
});
