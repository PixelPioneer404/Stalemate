import { Chess } from 'chess.js';
import {
  AlertOctagon,
  ChevronLeft,
  ChevronRight,
  CircleX,
  Clock3,
  Copy,
  Crown,
  Flag,
  Handshake,
  Hourglass,
  ShieldAlert,
  Swords,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import CapturedPiecesPanel from '../components/CapturedPiecesPanel.jsx';
import ChessBoard from '../components/ChessBoard.jsx';
import Modal from '../components/Modal.jsx';
import MoveHistoryPanel from '../components/MoveHistoryPanel.jsx';
import { useMultiplayerGame } from '../hooks/useMultiplayerGame.js';
import { getCapturedPiecesAtPly } from '../utils/chessboard.js';
import { clearMatchSession, loadMatchSession } from '../utils/storage.js';

const formatCountdown = (milliseconds) => {
  const safeMs = Math.max(0, milliseconds);
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');

  return `${minutes}:${seconds}`;
};

const getDisplayedClocks = (matchState, nowMs) => {
  const whiteBase = Math.max(0, Number(matchState?.whiteTimeMs ?? 0));
  const blackBase = Math.max(0, Number(matchState?.blackTimeMs ?? 0));

  if (!matchState || matchState.status !== 'active' || !matchState.activeTurnStartedAt) {
    return { whiteMs: whiteBase, blackMs: blackBase };
  }

  const startedAtMs = new Date(matchState.activeTurnStartedAt).getTime();
  const elapsedMs = Number.isFinite(startedAtMs) ? Math.max(0, nowMs - startedAtMs) : 0;

  if (matchState.turn === 'white') {
    return { whiteMs: Math.max(0, whiteBase - elapsedMs), blackMs: blackBase };
  }

  return { whiteMs: whiteBase, blackMs: Math.max(0, blackBase - elapsedMs) };
};

const getStatusMeta = (matchState) => {
  if (!matchState) {
    return {
      label: 'Connecting',
      className: 'bg-slate-500/15 text-slate-300 border border-slate-500/30',
    };
  }

  if (matchState.result || ['finished', 'aborted', 'canceled'].includes(matchState.status)) {
    return {
      label: 'Game Over',
      className: 'bg-rose-500/15 text-rose-200 border border-rose-500/35',
    };
  }

  if (matchState.drawOfferedBy) {
    return {
      label: 'Draw Offered',
      className: 'bg-amber-500/15 text-amber-200 border border-amber-500/35',
    };
  }

  if (matchState.status === 'waiting') {
    return {
      label: 'Waiting',
      className: 'bg-sky-500/15 text-sky-200 border border-sky-500/35',
    };
  }

  return {
    label: 'Active',
    className: 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/35',
  };
};

const MultiplayerSessionView = ({
  matchCode,
  session,
  muted,
  onToggleMuted,
  playMoveFeedback,
  onLeave,
}) => {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const {
    error,
    clearError,
    banner,
    clearBanner,
    matchState,
    displayedFen,
    historyIndex,
    canGoPrevious,
    canGoNext,
    goPrevious,
    goNext,
    selectPly,
    selectedSquare,
    legalMoves,
    handleSquareClick,
    playerCanMove,
    me,
    incomingDrawRequest,
    dismissDrawRequest,
    requestResign,
    requestAbort,
    requestDraw,
    respondDraw,
    requestCancelRoom,
    checkSquare,
    lastMoveSquares,
  } = useMultiplayerGame({
    matchCode,
    playerName: session.playerName,
    playerColor: session.playerColor,
    isCreator: Boolean(session.isCreator),
    playMoveFeedback,
    onRoomCanceled: onLeave,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const countdownMs =
    !matchState?.expiresAt || matchState.status !== 'waiting'
      ? null
      : Math.max(0, new Date(matchState.expiresAt).getTime() - nowMs);
  const clockTimes = useMemo(() => getDisplayedClocks(matchState, nowMs), [matchState, nowMs]);
  const timeControlLabel = matchState?.timeControl?.label ?? 'Rapid 15|10';

  const whiteName = matchState?.players?.find((player) => player.color === 'white')?.name ?? 'White';
  const blackName = matchState?.players?.find((player) => player.color === 'black')?.name ?? 'Black';

  const statusMeta = getStatusMeta(matchState);

  const turnLabel = matchState
    ? `${matchState.turn[0].toUpperCase()}${matchState.turn.slice(1)} to move`
    : 'Waiting for state';

  const gameOverMessage = useMemo(() => matchState?.result?.reason ?? null, [matchState?.result?.reason]);
  const captured = useMemo(
    () => getCapturedPiecesAtPly(matchState?.fenHistory ?? [], historyIndex),
    [historyIndex, matchState?.fenHistory]
  );

  const reviewCheckSquare = (() => {
    if (!displayedFen) {
      return null;
    }

    if (historyIndex === (matchState?.fenHistory.length ?? 1) - 1) {
      return checkSquare;
    }

    const chess = new Chess(displayedFen);
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
  })();

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(matchCode);
    } catch {
      // Ignore clipboard API errors.
    }
  };

  const handleCancelRoom = async () => {
    const success = await requestCancelRoom();

    if (success) {
      setShowCancelModal(false);
      onLeave();
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-3 sm:px-5 sm:py-5">
      <div className="hidden lg:block">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">Match Room</p>
            <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Code: {matchCode}</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={copyCode}
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/60 bg-cyan-500/15 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100 transition hover:bg-cyan-500/30"
            >
              <Copy className="h-4 w-4" />
              Copy Code
            </button>
            <button
              type="button"
              onClick={onToggleMuted}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-900/85 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-100 transition hover:bg-slate-800"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              {muted ? 'Unmute' : 'Mute'}
            </button>
          </div>
        </header>

        <section className="mb-4 rounded-xl border border-slate-700/70 bg-slate-900/70 px-4 py-3 text-sm text-slate-200">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-slate-800 px-3 py-1.5">
              You: {session.playerName} ({me?.color ?? session.playerColor})
            </span>
            <span className="rounded-full bg-slate-800 px-3 py-1.5 text-slate-200">
              Mode: {timeControlLabel}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-cyan-500/15 px-3 py-1.5 text-cyan-100">
              <Swords className="h-4 w-4" />
              {turnLabel}
            </span>
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 ${statusMeta.className}`}
            >
              <Crown className="h-4 w-4" />
              {statusMeta.label}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5 text-emerald-200">
              <Clock3 className="h-3.5 w-3.5" />
              {whiteName}: {formatCountdown(clockTimes.whiteMs)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/15 px-3 py-1.5 text-indigo-200">
              <Clock3 className="h-3.5 w-3.5" />
              {blackName}: {formatCountdown(clockTimes.blackMs)}
            </span>
            {countdownMs !== null ? (
              <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-slate-400">
                <Hourglass className="h-3.5 w-3.5" />
                Expires in {formatCountdown(countdownMs)}
              </span>
            ) : null}
          </div>
        </section>

        {banner ? (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-cyan-400/50 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
            <span>{banner}</span>
            <button type="button" onClick={clearBanner} className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-cyan-200">
              <CircleX className="h-3.5 w-3.5" />
              Dismiss
            </button>
          </div>
        ) : null}

        {error ? (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-rose-400/50 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            <span>{error}</span>
            <button type="button" onClick={clearError} className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-rose-100">
              <CircleX className="h-3.5 w-3.5" />
              Dismiss
            </button>
          </div>
        ) : null}

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={requestResign}
            disabled={!matchState || matchState.status !== 'active'}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-900/85 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Flag className="h-4 w-4" />
            Resign
          </button>
          <button
            type="button"
            onClick={requestAbort}
            disabled={!matchState || matchState.status !== 'active'}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-900/85 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <AlertOctagon className="h-4 w-4" />
            Abort
          </button>
          <button
            type="button"
            onClick={requestDraw}
            disabled={!matchState || matchState.status !== 'active'}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-900/85 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Handshake className="h-4 w-4" />
            Declare Draw
          </button>
          {session.isCreator ? (
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-rose-500/60 bg-rose-500/15 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-rose-100 transition hover:bg-rose-500/30"
            >
              <ShieldAlert className="h-4 w-4" />
              Cancel Room
            </button>
          ) : null}
        </div>

        <CapturedPiecesPanel capturedByWhite={captured.white} capturedByBlack={captured.black} className="mb-3" />

        <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="relative w-full max-w-[min(100%,calc(100vh-13rem))]">
            <ChessBoard
              fen={displayedFen}
              selectedSquare={selectedSquare}
              legalMoves={legalMoves}
              onSquareClick={handleSquareClick}
              checkSquare={reviewCheckSquare}
              lastMoveSquares={lastMoveSquares}
              orientation={(me?.color ?? session.playerColor) === 'black' ? 'black' : 'white'}
              disabled={!playerCanMove}
            />

            {gameOverMessage ? (
              <div className="pointer-events-none absolute inset-0 m-auto flex h-fit w-[92%] max-w-md items-center justify-center rounded-2xl border border-slate-600 bg-slate-950/92 px-5 py-6 text-center shadow-2xl">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Match Complete</p>
                  <h2 className="mt-2 text-lg font-semibold text-slate-100">{gameOverMessage}</h2>
                </div>
              </div>
            ) : null}
          </div>

          <MoveHistoryPanel
            moveHistory={matchState?.moveHistory ?? []}
            historyIndex={historyIndex}
            fenHistory={matchState?.fenHistory ?? [displayedFen].filter(Boolean)}
            onPrevious={goPrevious}
            onNext={goNext}
            onSelectPly={selectPly}
            whitePlayerName={whiteName}
            blackPlayerName={blackName}
          />
        </div>
      </div>

      <div className="lg:hidden">
        <header className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-300">Online Match</p>
            <h1 className="truncate text-2xl font-semibold text-slate-100 sm:text-3xl">
              Room {matchCode}
            </h1>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={copyCode}
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/60 bg-cyan-500/15 px-2.5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-100 transition hover:bg-cyan-500/30 sm:px-3"
            >
              <Copy className="h-4 w-4" />
              Copy
            </button>
            <button
              type="button"
              onClick={onToggleMuted}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-900/85 px-2.5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-100 transition hover:bg-slate-800 sm:px-3"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              {muted ? 'On' : 'Mute'}
            </button>
            {session.isCreator ? (
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/45 bg-rose-500/10 px-2.5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-100 transition hover:bg-rose-500/20 sm:px-3"
              >
                <ShieldAlert className="h-4 w-4" />
                Cancel
              </button>
            ) : null}
          </div>
        </header>

        {banner ? (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-cyan-400/50 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
            <span>{banner}</span>
            <button type="button" onClick={clearBanner} className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-cyan-200">
              <CircleX className="h-3.5 w-3.5" />
              Dismiss
            </button>
          </div>
        ) : null}

        {error ? (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-rose-400/50 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            <span>{error}</span>
            <button type="button" onClick={clearError} className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-rose-100">
              <CircleX className="h-3.5 w-3.5" />
              Dismiss
            </button>
          </div>
        ) : null}

        <section className="mb-3 rounded-2xl border border-slate-700/70 bg-slate-900/70 p-3 sm:p-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div className="inline-flex items-center gap-2 rounded-lg bg-cyan-500/15 px-3 py-2 text-sm text-cyan-100">
              <Swords className="h-4 w-4" />
              {turnLabel}
            </div>
            <div className="inline-flex items-center rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-200">
              Game: Online ({timeControlLabel})
            </div>
            <div
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${statusMeta.className}`}
            >
              <Crown className="h-4 w-4" />
              {statusMeta.label}
            </div>
            <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/15 px-3 py-2 text-sm text-emerald-200">
              <Clock3 className="h-4 w-4" />
              {whiteName}: {formatCountdown(clockTimes.whiteMs)}
            </div>
            <div className="inline-flex items-center gap-2 rounded-lg bg-indigo-500/15 px-3 py-2 text-sm text-indigo-200">
              <Clock3 className="h-4 w-4" />
              {blackName}: {formatCountdown(clockTimes.blackMs)}
            </div>
            <div className="inline-flex items-center rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-300">
              You: {session.playerName} ({me?.color ?? session.playerColor})
            </div>
          </div>

          {countdownMs !== null ? (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-400">
              <Hourglass className="h-3.5 w-3.5" />
              Room expires in {formatCountdown(countdownMs)} if no opponent joins.
            </p>
          ) : null}

          <CapturedPiecesPanel
            capturedByWhite={captured.white}
            capturedByBlack={captured.black}
            compact
            className="mt-3"
          />
        </section>

        <section className="relative mb-3 w-full">
          <div className="-mx-4 sm:mx-0">
            <ChessBoard
              fen={displayedFen}
              selectedSquare={selectedSquare}
              legalMoves={legalMoves}
              onSquareClick={handleSquareClick}
              checkSquare={reviewCheckSquare}
              lastMoveSquares={lastMoveSquares}
              orientation={(me?.color ?? session.playerColor) === 'black' ? 'black' : 'white'}
              disabled={!playerCanMove}
              fullBleedOnMobile
            />
          </div>

          {gameOverMessage ? (
            <div className="pointer-events-none absolute inset-0 m-auto flex h-fit w-[90%] max-w-md items-center justify-center rounded-2xl border border-slate-600 bg-slate-950/92 px-5 py-6 text-center shadow-2xl">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Match Complete</p>
                <h2 className="mt-2 text-lg font-semibold text-slate-100">{gameOverMessage}</h2>
              </div>
            </div>
          ) : null}
        </section>

        <section className="mb-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={goPrevious}
            disabled={!canGoPrevious}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-900/85 px-3 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!canGoNext}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-900/85 px-3 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </section>

        <section className="mb-4 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={requestDraw}
            disabled={!matchState || matchState.status !== 'active'}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-900/85 px-3 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Handshake className="h-4 w-4" />
            Draw
          </button>
          <button
            type="button"
            onClick={requestResign}
            disabled={!matchState || matchState.status !== 'active'}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-900/85 px-3 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Flag className="h-4 w-4" />
            Resign
          </button>
          <button
            type="button"
            onClick={requestAbort}
            disabled={!matchState || matchState.status !== 'active'}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-900/85 px-3 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <AlertOctagon className="h-4 w-4" />
            Abort
          </button>
        </section>

        <section>
          <MoveHistoryPanel
            moveHistory={matchState?.moveHistory ?? []}
            historyIndex={historyIndex}
            fenHistory={matchState?.fenHistory ?? [displayedFen].filter(Boolean)}
            onPrevious={goPrevious}
            onNext={goNext}
            onSelectPly={selectPly}
            whitePlayerName={whiteName}
            blackPlayerName={blackName}
            showNavigationControls={false}
          />
        </section>
      </div>

      <Modal
        isOpen={showCancelModal}
        title="Cancel this room?"
        description="This deletes the match for both players, closes the room, and removes all room data immediately."
        confirmLabel="Yes, Cancel Room"
        cancelLabel="Keep Room"
        onCancel={() => setShowCancelModal(false)}
        onConfirm={handleCancelRoom}
      />

      <Modal
        isOpen={Boolean(incomingDrawRequest)}
        title="Draw request"
        description={`${incomingDrawRequest} requested a draw. Accept to end the game as a draw.`}
        confirmLabel="Accept Draw"
        cancelLabel="Decline"
        onCancel={async () => {
          await respondDraw(false);
          dismissDrawRequest();
        }}
        onConfirm={async () => {
          await respondDraw(true);
          dismissDrawRequest();
        }}
      />
    </div>
  );
};

const MultiplayerPage = ({ muted, onToggleMuted, playMoveFeedback }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { matchCode: rawCode = '' } = useParams();

  const matchCode = rawCode.toUpperCase();
  const persistedSession = loadMatchSession(matchCode);
  const routeSession = location.state;
  const session = routeSession || persistedSession;

  const leaveMatch = () => {
    clearMatchSession(matchCode);
    navigate('/');
  };

  if (!session?.playerName) {
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col items-center justify-center px-4 text-center">
        <h1 className="text-2xl font-semibold text-slate-100">No active session</h1>
        <p className="mt-2 text-sm text-slate-400">Re-enter your name from home to rejoin this match.</p>
        <Link
          to="/"
          className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-slate-800"
        >
          <Clock3 className="h-4 w-4" />
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <MultiplayerSessionView
      matchCode={matchCode}
      session={session}
      muted={muted}
      onToggleMuted={onToggleMuted}
      playMoveFeedback={playMoveFeedback}
      onLeave={leaveMatch}
    />
  );
};

export default MultiplayerPage;
