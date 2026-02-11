import { Chess } from 'chess.js';
import { useEffect, useMemo, useState } from 'react';
import {
  getCheckSquareFromFen,
  getGameOverMessage,
  getLegalMovesFromFen,
} from '../utils/chessboard.js';
import { DEFAULT_TIME_CONTROL_KEY, getTimeControlByKey } from '../utils/timeControls.js';

const INITIAL_FEN = new Chess().fen();

const clampClock = (milliseconds) => Math.max(0, milliseconds);

const getOpponentLabel = (color) => (color === 'white' ? 'Black' : 'White');

export const useLocalPracticeGame = ({ playMoveFeedback }) => {
  const [fenHistory, setFenHistory] = useState([INITIAL_FEN]);
  const [moveHistory, setMoveHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [lastMoveSquares, setLastMoveSquares] = useState([]);

  const [timeControlKey, setTimeControlKey] = useState(DEFAULT_TIME_CONTROL_KEY);
  const [whiteBaseTimeMs, setWhiteBaseTimeMs] = useState(0);
  const [blackBaseTimeMs, setBlackBaseTimeMs] = useState(0);
  const [activeTurnStartedAtMs, setActiveTurnStartedAtMs] = useState(null);
  const [clockNowMs, setClockNowMs] = useState(() => Date.now());
  const [timeoutMessage, setTimeoutMessage] = useState(null);
  const [isConfigured, setIsConfigured] = useState(false);

  const latestFen = fenHistory[fenHistory.length - 1];
  const displayedFen = fenHistory[historyIndex] ?? latestFen;
  const isLiveView = historyIndex === fenHistory.length - 1;

  const liveChess = useMemo(() => new Chess(latestFen), [latestFen]);
  const displayedChess = useMemo(() => new Chess(displayedFen), [displayedFen]);
  const liveTurnColor = liveChess.turn() === 'w' ? 'white' : 'black';

  const timeControl = useMemo(() => getTimeControlByKey(timeControlKey), [timeControlKey]);

  const isGameOver = liveChess.isGameOver() || Boolean(timeoutMessage);

  const resetSelections = () => {
    setSelectedSquare(null);
    setLegalMoves([]);
  };

  useEffect(() => {
    if (!isConfigured || isGameOver || activeTurnStartedAtMs === null) {
      return undefined;
    }

    const timer = setInterval(() => {
      const nowMs = Date.now();
      const elapsedMs = Math.max(0, nowMs - activeTurnStartedAtMs);
      const whiteRemainingMs = clampClock(whiteBaseTimeMs - elapsedMs);
      const blackRemainingMs = clampClock(blackBaseTimeMs - elapsedMs);

      setClockNowMs(nowMs);

      if (liveTurnColor === 'white' && whiteRemainingMs <= 0) {
        setWhiteBaseTimeMs(0);
        setTimeoutMessage('Black wins on time.');
        setActiveTurnStartedAtMs(null);
        resetSelections();
      }

      if (liveTurnColor === 'black' && blackRemainingMs <= 0) {
        setBlackBaseTimeMs(0);
        setTimeoutMessage('White wins on time.');
        setActiveTurnStartedAtMs(null);
        resetSelections();
      }
    }, 250);

    return () => clearInterval(timer);
  }, [
    activeTurnStartedAtMs,
    blackBaseTimeMs,
    isConfigured,
    isGameOver,
    liveTurnColor,
    whiteBaseTimeMs,
  ]);

  const whiteClockMs = useMemo(() => {
    if (!isConfigured) {
      return 0;
    }

    if (activeTurnStartedAtMs === null || isGameOver || liveTurnColor !== 'white') {
      return clampClock(whiteBaseTimeMs);
    }

    return clampClock(whiteBaseTimeMs - (clockNowMs - activeTurnStartedAtMs));
  }, [activeTurnStartedAtMs, clockNowMs, isConfigured, isGameOver, liveTurnColor, whiteBaseTimeMs]);

  const blackClockMs = useMemo(() => {
    if (!isConfigured) {
      return 0;
    }

    if (activeTurnStartedAtMs === null || isGameOver || liveTurnColor !== 'black') {
      return clampClock(blackBaseTimeMs);
    }

    return clampClock(blackBaseTimeMs - (clockNowMs - activeTurnStartedAtMs));
  }, [activeTurnStartedAtMs, blackBaseTimeMs, clockNowMs, isConfigured, isGameOver, liveTurnColor]);

  const gameOverMessage = useMemo(
    () => timeoutMessage ?? getGameOverMessage(liveChess),
    [liveChess, timeoutMessage]
  );

  const checkSquare = useMemo(() => getCheckSquareFromFen(displayedFen), [displayedFen]);

  const startGameWithMode = (modeKey) => {
    const preset = getTimeControlByKey(modeKey);
    const nowMs = Date.now();

    setTimeControlKey(preset.key);
    setFenHistory([INITIAL_FEN]);
    setMoveHistory([]);
    setHistoryIndex(0);
    setLastMoveSquares([]);
    setWhiteBaseTimeMs(preset.initialTimeMs);
    setBlackBaseTimeMs(preset.initialTimeMs);
    setActiveTurnStartedAtMs(nowMs);
    setClockNowMs(nowMs);
    setTimeoutMessage(null);
    setIsConfigured(true);
    resetSelections();
  };

  const consumeTurnTime = () => {
    const nowMs = Date.now();
    const elapsedMs = activeTurnStartedAtMs === null ? 0 : Math.max(0, nowMs - activeTurnStartedAtMs);

    if (liveTurnColor === 'white') {
      const remainingMs = clampClock(whiteBaseTimeMs - elapsedMs);
      setWhiteBaseTimeMs(remainingMs);
      return { movingColor: 'white', remainingMs, nowMs };
    }

    const remainingMs = clampClock(blackBaseTimeMs - elapsedMs);
    setBlackBaseTimeMs(remainingMs);
    return { movingColor: 'black', remainingMs, nowMs };
  };

  const selectSquare = (square, fenToInspect = latestFen) => {
    const chess = new Chess(fenToInspect);
    const piece = chess.get(square);

    if (!piece || piece.color !== chess.turn()) {
      resetSelections();
      return;
    }

    const moves = getLegalMovesFromFen(fenToInspect, square).map((move) => ({
      to: move.to,
      capture: move.flags.includes('c') || move.flags.includes('e'),
    }));

    setSelectedSquare(square);
    setLegalMoves(moves);
  };

  const handleSquareClick = async (square) => {
    if (!isConfigured || !isLiveView || isGameOver) {
      return;
    }

    if (!selectedSquare) {
      selectSquare(square, latestFen);
      return;
    }

    if (selectedSquare === square) {
      resetSelections();
      return;
    }

    const pieceAtSquare = liveChess.get(square);
    const selectedPiece = liveChess.get(selectedSquare);

    if (pieceAtSquare && selectedPiece && pieceAtSquare.color === selectedPiece.color) {
      selectSquare(square, latestFen);
      return;
    }

    const turnClock = consumeTurnTime();
    if (turnClock.remainingMs <= 0) {
      if (turnClock.movingColor === 'white') {
        setWhiteBaseTimeMs(0);
      } else {
        setBlackBaseTimeMs(0);
      }

      setTimeoutMessage(`${getOpponentLabel(turnClock.movingColor)} wins on time.`);
      setActiveTurnStartedAtMs(null);
      resetSelections();
      return;
    }

    const nextChess = new Chess(latestFen);
    const move = nextChess.move({
      from: selectedSquare,
      to: square,
      promotion: 'q',
    });

    if (!move) {
      selectSquare(square, latestFen);
      return;
    }

    setFenHistory((previous) => [...previous, nextChess.fen()]);
    setMoveHistory((previous) => [...previous, move.san]);
    setHistoryIndex((previous) => previous + 1);
    setLastMoveSquares([move.from, move.to]);

    if (turnClock.movingColor === 'white') {
      setWhiteBaseTimeMs(turnClock.remainingMs + timeControl.incrementMs);
    } else {
      setBlackBaseTimeMs(turnClock.remainingMs + timeControl.incrementMs);
    }

    setActiveTurnStartedAtMs(turnClock.nowMs);
    setClockNowMs(turnClock.nowMs);
    resetSelections();

    await playMoveFeedback({
      capture: Boolean(move.captured),
      check: move.san.includes('+') || move.san.includes('#'),
    });
  };

  const goPrevious = () => {
    setHistoryIndex((previous) => Math.max(0, previous - 1));
    resetSelections();
  };

  const goNext = () => {
    setHistoryIndex((previous) => Math.min(fenHistory.length - 1, previous + 1));
    resetSelections();
  };

  const selectPly = (plyIndex) => {
    const clamped = Math.max(0, Math.min(fenHistory.length - 1, plyIndex));
    setHistoryIndex(clamped);
    resetSelections();
  };

  const resetGame = () => {
    if (!isConfigured) {
      startGameWithMode(timeControlKey);
      return;
    }

    startGameWithMode(timeControlKey);
  };

  return {
    fen: displayedFen,
    moveHistory,
    fenHistory,
    historyIndex,
    isLiveView,
    canGoPrevious: historyIndex > 0,
    canGoNext: historyIndex < fenHistory.length - 1,
    selectedSquare,
    legalMoves,
    handleSquareClick,
    goPrevious,
    goNext,
    selectPly,
    resetGame,
    startGameWithMode,
    isConfigured,
    timeControl,
    whiteClockMs,
    blackClockMs,
    currentTurn: displayedChess.turn() === 'w' ? 'White' : 'Black',
    checkSquare,
    inCheck: displayedChess.inCheck(),
    isGameOver,
    gameOverMessage,
    lastMoveSquares,
  };
};
