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
      try {
        setIsConnected(true);
        setError('');

        const result = await emitWithAck(socket, connectEvent, {
          matchCode,
          name: playerName,
        });

        if (!result.ok) {
          setError(result.error || 'Unable to join match room.');
        }
      } catch (err) {
        console.error('Connection error:', err);
        setError('Failed to connect to game room.');
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setError('Connection failed. Please check your internet.');
    });

    socket.on('error', (err) => {
      console.error('Socket error:', err);
      setError('Connection error occurred.');
    });

    socket.on('updateBoard', async (state) => {
      try {
        if (!state || typeof state !== 'object') {
          console.error('Invalid state received:', state);
          return;
        }

        setMatchState(state);
        setHistoryIndex(state.fenHistory?.length - 1 || 0);
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
      } catch (err) {
        console.error('Error updating board:', err);
      }
    });

    socket.on('gameOver', ({ result }) => {
      try {
        if (result?.reason) {
          setBanner(result.reason);
        }
      } catch (err) {
        console.error('Error handling game over:', err);
      }
    });

    socket.on('opponentDisconnected', ({ playerName: disconnectedPlayer }) => {
      try {
        setBanner(`${disconnectedPlayer} disconnected.`);
      } catch (err) {
        console.error('Error handling disconnect:', err);
      }
    });

    socket.on('drawRequest', ({ from }) => {
      try {
        setIncomingDrawRequest(from);
        setBanner(`${from} offered a draw.`);
      } catch (err) {
        console.error('Error handling draw request:', err);
      }
    });

    socket.on('drawAccepted', ({ accepted, by }) => {
      try {
        setIncomingDrawRequest(null);
        setBanner(accepted ? `Draw accepted by ${by}.` : `${by} declined the draw request.`);
      } catch (err) {
        console.error('Error handling draw response:', err);
      }
    });

    socket.on('abort', ({ by }) => {
      try {
        setBanner(`Match aborted by ${by}.`);
      } catch (err) {
        console.error('Error handling abort:', err);
      }
    });

    socket.on('cancelRoom', ({ canceledBy, reason }) => {
      try {
        setBanner(reason || `Room canceled by ${canceledBy}.`);
        onRoomCanceled?.();
      } catch (err) {
        console.error('Error handling room cancel:', err);
      }
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

    if (!socket || !socket.connected) {
      setError('Socket not connected.');
      return;
    }

    try {
      const result = await emitWithAck(socket, 'move', {
        matchCode,
        from,
        to,
        promotion: 'q',
      });

      if (!result.ok) {
        setError(result.error || 'Move rejected by server.');
      }
    } catch (err) {
      console.error('Error submitting move:', err);
      setError('Failed to submit move. Please try again.');
    }
  };

  const handleSquareClick = async (square) => {
    try {
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
    } catch (err) {
      console.error('Error handling square click:', err);
      resetSelection();
    }
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

    if (!socket || !socket.connected) {
      setError('Socket not connected.');
      return false;
    }

    try {
      const result = await emitWithAck(socket, event, {
        matchCode,
        ...payload,
      });

      if (!result.ok) {
        setError(result.error || `Unable to ${event}.`);
        return false;
      }

      return true;
    } catch (err) {
      console.error(`Error executing ${event}:`, err);
      setError(`Failed to ${event}. Please try again.`);
      return false;
    }
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
