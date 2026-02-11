import { Chess } from 'chess.js';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getCheckSquareFromFen, getLegalMovesFromFen } from '../utils/chessboard.js';
import { createSocketClient } from '../utils/socketClient.js';

const emitWithAck = (socket, event, payload) =>
  new Promise((resolve) => {
    socket.emit(event, payload, (result) => {
      resolve(result ?? { ok: false, error: 'No response from server.' });
    });
  });

export const useMultiplayerGame = ({
  matchCode,
  playerName,
  playerColor,
  isCreator,
  playMoveFeedback,
  onRoomCanceled,
}) => {
  const socketRef = useRef(null);
  const hasReceivedFirstBoardRef = useRef(false);

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');
  const [banner, setBanner] = useState('');
  const [matchState, setMatchState] = useState(null);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [incomingDrawRequest, setIncomingDrawRequest] = useState(null);

  const latestFen = matchState?.fen ?? null;
  const displayedFen = matchState?.fenHistory?.[historyIndex] ?? latestFen;

  const me = useMemo(
    () =>
      matchState?.players?.find(
        (player) => player.name.toLowerCase() === playerName.toLowerCase()
      ) ?? null,
    [matchState?.players, playerName]
  );

  const isLiveView = Boolean(matchState) && historyIndex === (matchState.fenHistory.length - 1);
  const playerCanMove = Boolean(
    me &&
      matchState &&
      matchState.status === 'active' &&
      matchState.turn === me.color &&
      isLiveView
  );

  useEffect(() => {
    const socket = createSocketClient();
    socketRef.current = socket;

    const connectEvent = isCreator ? 'createRoom' : 'joinRoom';

    socket.on('connect', async () => {
      setIsConnected(true);
      setError('');

      const result = await emitWithAck(socket, connectEvent, {
        matchCode,
        name: playerName,
      });

      if (!result.ok) {
        setError(result.error || 'Unable to join match room.');
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('updateBoard', async (state) => {
      setMatchState(state);
      setHistoryIndex(state.fenHistory.length - 1);
      const drawRequester =
        state.drawOfferedBy && state.drawOfferedBy !== playerColor
          ? state.players?.find((player) => player.color === state.drawOfferedBy)?.name ?? 'Opponent'
          : null;
      setIncomingDrawRequest(drawRequester);

      if (!hasReceivedFirstBoardRef.current) {
        hasReceivedFirstBoardRef.current = true;
        return;
      }

      if (state.lastMove) {
        await playMoveFeedback({
          capture: state.lastMove.capture,
          check: state.lastMove.check,
        });
      }
    });

    socket.on('gameOver', ({ result }) => {
      if (result?.reason) {
        setBanner(result.reason);
      }
    });

    socket.on('opponentDisconnected', ({ playerName: disconnectedPlayer }) => {
      setBanner(`${disconnectedPlayer} disconnected.`);
    });

    socket.on('drawRequest', ({ from }) => {
      setIncomingDrawRequest(from);
      setBanner(`${from} offered a draw.`);
    });

    socket.on('drawAccepted', ({ accepted, by }) => {
      setIncomingDrawRequest(null);
      setBanner(accepted ? `Draw accepted by ${by}.` : `${by} declined the draw request.`);
    });

    socket.on('abort', ({ by }) => {
      setBanner(`Match aborted by ${by}.`);
    });

    socket.on('cancelRoom', ({ canceledBy, reason }) => {
      setBanner(reason || `Room canceled by ${canceledBy}.`);
      onRoomCanceled?.();
    });

    socket.connect();

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [isCreator, matchCode, onRoomCanceled, playerColor, playerName, playMoveFeedback]);

  const resetSelection = () => {
    setSelectedSquare(null);
    setLegalMoves([]);
  };

  const selectPiece = (square) => {
    if (!latestFen || !me) {
      resetSelection();
      return;
    }

    const chess = new Chess(latestFen);
    const piece = chess.get(square);

    if (!piece || piece.color !== me.color[0] || chess.turn() !== me.color[0]) {
      resetSelection();
      return;
    }

    const moves = getLegalMovesFromFen(latestFen, square).map((move) => ({
      to: move.to,
      capture: move.flags.includes('c') || move.flags.includes('e'),
    }));

    setSelectedSquare(square);
    setLegalMoves(moves);
  };

  const submitMove = async (from, to) => {
    const socket = socketRef.current;

    if (!socket) {
      setError('Socket not connected.');
      return;
    }

    const result = await emitWithAck(socket, 'move', {
      matchCode,
      from,
      to,
      promotion: 'q',
    });

    if (!result.ok) {
      setError(result.error || 'Move rejected by server.');
    }
  };

  const handleSquareClick = async (square) => {
    if (!playerCanMove) {
      return;
    }

    if (!selectedSquare) {
      selectPiece(square);
      return;
    }

    if (selectedSquare === square) {
      resetSelection();
      return;
    }

    const chess = new Chess(latestFen);
    const clickedPiece = chess.get(square);
    const selectedPiece = chess.get(selectedSquare);

    if (clickedPiece && selectedPiece && clickedPiece.color === selectedPiece.color) {
      selectPiece(square);
      return;
    }

    resetSelection();
    await submitMove(selectedSquare, square);
  };

  const goPrevious = () => {
    if (!matchState) {
      return;
    }

    setHistoryIndex((previous) => Math.max(0, previous - 1));
    resetSelection();
  };

  const goNext = () => {
    if (!matchState) {
      return;
    }

    setHistoryIndex((previous) => Math.min(matchState.fenHistory.length - 1, previous + 1));
    resetSelection();
  };

  const selectPly = (plyIndex) => {
    if (!matchState) {
      return;
    }

    const clamped = Math.max(0, Math.min(matchState.fenHistory.length - 1, plyIndex));
    setHistoryIndex(clamped);
    resetSelection();
  };

  const runRoomAction = async (event, payload = {}) => {
    const socket = socketRef.current;

    if (!socket) {
      setError('Socket not connected.');
      return false;
    }

    const result = await emitWithAck(socket, event, {
      matchCode,
      ...payload,
    });

    if (!result.ok) {
      setError(result.error || `Unable to ${event}.`);
      return false;
    }

    return true;
  };

  const requestResign = () => runRoomAction('resign');
  const requestAbort = () => runRoomAction('abort');
  const requestDraw = () => runRoomAction('drawRequest');
  const respondDraw = (accepted) => runRoomAction('drawAccepted', { accepted });
  const requestCancelRoom = () => runRoomAction('cancelRoom');

  const checkSquare = useMemo(() => {
    if (!displayedFen) {
      return null;
    }

    if (isLiveView) {
      return matchState?.checkSquare ?? null;
    }

    return getCheckSquareFromFen(displayedFen);
  }, [displayedFen, isLiveView, matchState?.checkSquare]);

  return {
    isConnected,
    error,
    clearError: () => setError(''),
    banner,
    clearBanner: () => setBanner(''),
    matchState,
    displayedFen,
    historyIndex,
    isLiveView,
    canGoPrevious: historyIndex > 0,
    canGoNext: Boolean(matchState) && historyIndex < matchState.fenHistory.length - 1,
    goPrevious,
    goNext,
    selectPly,
    selectedSquare,
    legalMoves,
    handleSquareClick,
    playerCanMove,
    me,
    incomingDrawRequest,
    dismissDrawRequest: () => setIncomingDrawRequest(null),
    requestResign,
    requestAbort,
    requestDraw,
    respondDraw,
    requestCancelRoom,
    checkSquare,
    lastMoveSquares: matchState?.lastMove
      ? [matchState.lastMove.from, matchState.lastMove.to]
      : [],
  };
};
