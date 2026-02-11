import { useEffect, useMemo, useRef, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { PIECE_ASSET_MAP } from '../utils/chessboard.js';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';

const useBoardWidth = () => {
  const containerRef = useRef(null);
  const [boardWidth, setBoardWidth] = useState(520);

  useEffect(() => {
    const element = containerRef.current;

    if (!element) {
      return undefined;
    }

    const update = () => {
      const width = Math.floor(element.getBoundingClientRect().width);
      if (width > 0) {
        setBoardWidth(width);
      }
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(element);

    window.addEventListener('resize', update);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  return { containerRef, boardWidth };
};

const createPieceMap = () => {
  const map = {};

  Object.entries(PIECE_ASSET_MAP).forEach(([pieceKey, src]) => {
    const uppercaseCode = `${pieceKey[0]}${pieceKey[1].toUpperCase()}`;

    map[uppercaseCode] = ({ squareWidth }) => (
      <img
        src={src}
        alt={pieceKey}
        style={{
          width: `${Math.max(squareWidth - 8, 24)}px`,
          height: `${Math.max(squareWidth - 8, 24)}px`,
          objectFit: 'contain',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
        draggable={false}
      />
    );
  });

  return map;
};

const ChessBoard = ({
  fen,
  selectedSquare,
  legalMoves,
  onSquareClick,
  checkSquare,
  lastMoveSquares,
  orientation = 'white',
  disabled = false,
  fullBleedOnMobile = false,
}) => {
  const { containerRef, boardWidth } = useBoardWidth();
  const safePosition = fen || START_FEN;

  const customPieces = useMemo(() => createPieceMap(), []);

  const squareStyles = useMemo(() => {
    const styles = {};

    lastMoveSquares.forEach((square) => {
      styles[square] = {
        boxShadow:
          'inset 0 0 0 2px rgba(56,189,248,0.55), inset 0 0 22px rgba(56,189,248,0.22)',
        transition: 'box-shadow 180ms ease, background-color 180ms ease',
      };
    });

    legalMoves.forEach((move) => {
      const currentStyle = styles[move.to] ?? {};

      if (move.capture) {
        styles[move.to] = {
          ...currentStyle,
          boxShadow: [
            currentStyle.boxShadow,
            'inset 0 0 0 2px rgba(125,211,252,0.75)',
            'inset 0 0 0 6px rgba(56,189,248,0.2)',
          ]
            .filter(Boolean)
            .join(', '),
          transition: 'box-shadow 180ms ease, background-color 180ms ease',
        };

        return;
      }

      styles[move.to] = {
        ...currentStyle,
        backgroundImage:
          'radial-gradient(circle at center, rgba(125,211,252,0.55) 0, rgba(125,211,252,0.55) 18%, transparent 20%)',
        transition: 'background-image 180ms ease, box-shadow 180ms ease',
      };
    });

    if (selectedSquare) {
      styles[selectedSquare] = {
        ...(styles[selectedSquare] ?? {}),
        boxShadow: [
          styles[selectedSquare]?.boxShadow,
          'inset 0 0 0 2px rgba(14,165,233,0.9)',
        ]
          .filter(Boolean)
          .join(', '),
      };
    }

    if (checkSquare) {
      styles[checkSquare] = {
        ...(styles[checkSquare] ?? {}),
        boxShadow: [
          styles[checkSquare]?.boxShadow,
          'inset 0 0 0 2px rgba(248,113,113,0.82)',
          'inset 0 0 20px rgba(248,113,113,0.33)',
        ]
          .filter(Boolean)
          .join(', '),
        animation: 'checkPulse 1.2s ease-in-out infinite',
      };
    }

    return styles;
  }, [checkSquare, lastMoveSquares, legalMoves, selectedSquare]);

  const boardOptions = useMemo(
    () => ({
      id: 'chess-board',
      position: safePosition,
      boardOrientation: orientation,
      onSquareClick: (value) => {
        const square = typeof value === 'string' ? value : value?.square;
        if (!disabled && square) {
          onSquareClick?.(square);
        }
      },
      onPieceClick: (pieceOrData, maybeSquare) => {
        const square =
          typeof maybeSquare === 'string'
            ? maybeSquare
            : typeof pieceOrData === 'string'
              ? null
              : pieceOrData?.square;
        if (!disabled && square) {
          onSquareClick?.(square);
        }
      },
      allowDragging: false,
      boardStyle: {
        borderRadius: '0px',
        overflow: 'hidden',
      },
      darkSquareStyle: { backgroundColor: '#334764' },
      lightSquareStyle: { backgroundColor: '#b9c2cd' },
      squareStyles,
      animationDurationInMs: 220,
      pieces: customPieces,
    }),
    [customPieces, disabled, onSquareClick, orientation, safePosition, squareStyles]
  );

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden border border-slate-700/70 bg-slate-900/60 shadow-2xl shadow-slate-950/55 ${
        fullBleedOnMobile
          ? 'rounded-none border-x-0 p-0 sm:rounded-3xl sm:border-x sm:p-3'
          : 'rounded-3xl p-2.5 sm:p-3'
      }`}
    >
      <div style={{ width: `${boardWidth}px`, maxWidth: '100%', marginInline: 'auto' }}>
        <Chessboard options={boardOptions} />
      </div>
    </div>
  );
};

export default ChessBoard;
