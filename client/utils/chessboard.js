import { Chess } from 'chess.js';

export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
export const RANKS = [8, 7, 6, 5, 4, 3, 2, 1];
export const RANKS_REVERSED = [...RANKS].reverse();
export const FILES_REVERSED = [...FILES].reverse();

export const PIECE_ASSET_MAP = {
  wp: '/pieces/wP.svg',
  wn: '/pieces/wN.svg',
  wb: '/pieces/wB.svg',
  wr: '/pieces/wR.svg',
  wq: '/pieces/wQ.svg',
  wk: '/pieces/wK.svg',
  bp: '/pieces/bP.svg',
  bn: '/pieces/bN.svg',
  bb: '/pieces/bB.svg',
  br: '/pieces/bR.svg',
  bq: '/pieces/bQ.svg',
  bk: '/pieces/bK.svg',
};

export const pieceToAsset = (piece) => {
  if (!piece) {
    return null;
  }

  return PIECE_ASSET_MAP[`${piece.color}${piece.type}`] ?? null;
};

export const getSquareColorClass = (square) => {
  const file = square[0];
  const rank = Number(square[1]);
  const fileIndex = FILES.indexOf(file);
  const isLightSquare = (fileIndex + rank) % 2 === 0;

  return isLightSquare ? 'bg-slate-200/95' : 'bg-slate-700/95';
};

export const isLightSquare = (square) => {
  const file = square[0];
  const rank = Number(square[1]);
  const fileIndex = FILES.indexOf(file);

  return (fileIndex + rank) % 2 === 0;
};

export const getOrientationAxes = (orientation) => {
  if (orientation === 'black') {
    return {
      files: FILES_REVERSED,
      ranks: RANKS_REVERSED,
    };
  }

  return {
    files: FILES,
    ranks: RANKS,
  };
};

export const getMoveRows = (sanMoves) => {
  const rows = [];

  for (let moveIndex = 0; moveIndex < sanMoves.length; moveIndex += 2) {
    rows.push({
      moveNumber: moveIndex / 2 + 1,
      white: sanMoves[moveIndex] ?? '',
      black: sanMoves[moveIndex + 1] ?? '',
    });
  }

  return rows;
};

const PIECE_TYPES = ['p', 'n', 'b', 'r', 'q', 'k'];

const emptyPieceCount = () => ({
  wp: 0,
  wn: 0,
  wb: 0,
  wr: 0,
  wq: 0,
  wk: 0,
  bp: 0,
  bn: 0,
  bb: 0,
  br: 0,
  bq: 0,
  bk: 0,
});

const getPieceCountFromFen = (fen) => {
  const counts = emptyPieceCount();
  const chess = new Chess(fen);
  const board = chess.board();

  for (const row of board) {
    for (const piece of row) {
      if (!piece) {
        continue;
      }

      const key = `${piece.color}${piece.type}`;
      counts[key] = (counts[key] ?? 0) + 1;
    }
  }

  return counts;
};

const findCapturedPieceType = (beforeCounts, afterCounts, capturedColorPrefix) => {
  for (const type of PIECE_TYPES) {
    const key = `${capturedColorPrefix}${type}`;
    if ((afterCounts[key] ?? 0) < (beforeCounts[key] ?? 0)) {
      return key;
    }
  }

  return null;
};

export const getCapturedPiecesAtPly = (fenHistory, plyIndex) => {
  const captures = { white: [], black: [] };

  if (!Array.isArray(fenHistory) || fenHistory.length <= 1) {
    return captures;
  }

  const maxPly = fenHistory.length - 1;
  const safePly = Math.max(0, Math.min(Number(plyIndex) || 0, maxPly));

  for (let ply = 1; ply <= safePly; ply += 1) {
    const beforeFen = fenHistory[ply - 1];
    const afterFen = fenHistory[ply];

    if (!beforeFen || !afterFen) {
      continue;
    }

    const before = getPieceCountFromFen(beforeFen);
    const after = getPieceCountFromFen(afterFen);

    const whiteBefore = PIECE_TYPES.reduce((sum, type) => sum + (before[`w${type}`] ?? 0), 0);
    const whiteAfter = PIECE_TYPES.reduce((sum, type) => sum + (after[`w${type}`] ?? 0), 0);
    const blackBefore = PIECE_TYPES.reduce((sum, type) => sum + (before[`b${type}`] ?? 0), 0);
    const blackAfter = PIECE_TYPES.reduce((sum, type) => sum + (after[`b${type}`] ?? 0), 0);

    if (blackAfter < blackBefore) {
      const captured = findCapturedPieceType(before, after, 'b');
      if (captured) {
        captures.white.push(captured);
      }
    }

    if (whiteAfter < whiteBefore) {
      const captured = findCapturedPieceType(before, after, 'w');
      if (captured) {
        captures.black.push(captured);
      }
    }
  }

  return captures;
};

export const getLegalMovesFromFen = (fen, square) => {
  const chess = new Chess(fen);
  return chess.moves({ square, verbose: true });
};

export const getCheckSquareFromFen = (fen) => {
  const chess = new Chess(fen);

  if (!chess.inCheck()) {
    return null;
  }

  const board = chess.board();
  const color = chess.turn();

  for (const row of board) {
    for (const piece of row) {
      if (piece && piece.type === 'k' && piece.color === color) {
        return piece.square;
      }
    }
  }

  return null;
};

export const getGameOverMessage = (chess) => {
  if (!chess.isGameOver()) {
    return null;
  }

  if (chess.isCheckmate()) {
    const winner = chess.turn() === 'w' ? 'Black' : 'White';
    return `${winner} wins by checkmate.`;
  }

  if (chess.isStalemate()) {
    return 'Draw by stalemate.';
  }

  if (chess.isInsufficientMaterial()) {
    return 'Draw by insufficient material.';
  }

  if (chess.isThreefoldRepetition()) {
    return 'Draw by threefold repetition.';
  }

  if (chess.isDraw()) {
    return 'Draw by fifty-move rule.';
  }

  return 'Game over.';
};
