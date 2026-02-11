import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock3, Crown, House, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { Link } from 'react-router-dom';
import CapturedPiecesPanel from '../components/CapturedPiecesPanel.jsx';
import ChessBoard from '../components/ChessBoard.jsx';
import MoveHistoryPanel from '../components/MoveHistoryPanel.jsx';
import { useLocalPracticeGame } from '../hooks/useLocalPracticeGame.js';
import { getCapturedPiecesAtPly } from '../utils/chessboard.js';
import { DEFAULT_TIME_CONTROL_KEY, TIME_CONTROL_OPTIONS } from '../utils/timeControls.js';

const formatClock = (milliseconds) => {
  const safeMs = Math.max(0, milliseconds);
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');

  return `${minutes}:${seconds}`;
};

const LocalPracticePage = ({ muted, onToggleMuted, playMoveFeedback }) => {
  const [showModeModal, setShowModeModal] = useState(true);
  const [selectedModeKey, setSelectedModeKey] = useState(DEFAULT_TIME_CONTROL_KEY);

  const {
    fen,
    moveHistory,
    fenHistory,
    historyIndex,
    isLiveView,
    canGoPrevious,
    canGoNext,
    legalMoves,
    selectedSquare,
    handleSquareClick,
    goPrevious,
    goNext,
    selectPly,
    startGameWithMode,
    isConfigured,
    timeControl,
    whiteClockMs,
    blackClockMs,
    currentTurn,
    inCheck,
    checkSquare,
    isGameOver,
    gameOverMessage,
    lastMoveSquares,
  } = useLocalPracticeGame({ playMoveFeedback });

  const captured = useMemo(
    () => getCapturedPiecesAtPly(fenHistory, historyIndex),
    [fenHistory, historyIndex]
  );

  const startSelectedMode = () => {
    startGameWithMode(selectedModeKey);
    setShowModeModal(false);
  };

  const openNewGameModal = () => {
    setSelectedModeKey(timeControl?.key ?? DEFAULT_TIME_CONTROL_KEY);
    setShowModeModal(true);
  };

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-3 sm:px-5 sm:py-5">
      <div className="hidden lg:block">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Local Practice</p>
            <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Training Board</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleMuted}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-200 transition hover:bg-slate-800"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              {muted ? 'Unmute' : 'Mute'}
            </button>
            <button
              type="button"
              onClick={openNewGameModal}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-200 transition hover:bg-slate-800"
            >
              <RotateCcw className="h-4 w-4" />
              New Game
            </button>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-200 transition hover:bg-slate-800"
            >
              <House className="h-4 w-4" />
              Home
            </Link>
          </div>
        </header>

        <section className="mb-4 rounded-xl border border-slate-700/70 bg-slate-900/70 px-4 py-3">
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-200">
            <span className="inline-flex items-center gap-2 rounded-full bg-cyan-500/15 px-3 py-1.5 text-cyan-100">
              <Crown className="h-4 w-4" />
              Turn: {currentTurn}
            </span>
            {isConfigured ? (
              <span className="rounded-full bg-slate-800 px-3 py-1.5 text-slate-100">
                Mode: {timeControl.label}
              </span>
            ) : (
              <span className="rounded-full bg-slate-800 px-3 py-1.5 text-slate-300">
                Select a rapid mode to start
              </span>
            )}
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1.5 text-emerald-200">
              <Clock3 className="h-4 w-4" />
              White {formatClock(whiteClockMs)}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-indigo-500/15 px-3 py-1.5 text-indigo-200">
              <Clock3 className="h-4 w-4" />
              Black {formatClock(blackClockMs)}
            </span>
            {inCheck ? (
              <span className="rounded-full bg-rose-500/20 px-3 py-1.5 text-rose-200">Check</span>
            ) : null}
          </div>
        </section>

        <CapturedPiecesPanel capturedByWhite={captured.white} capturedByBlack={captured.black} className="mb-3" />

        <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="relative w-full max-w-[min(100%,calc(100vh-11rem))]">
            <ChessBoard
              fen={fen}
              selectedSquare={selectedSquare}
              legalMoves={legalMoves}
              onSquareClick={handleSquareClick}
              checkSquare={checkSquare}
              lastMoveSquares={lastMoveSquares}
              orientation="white"
              disabled={!isLiveView || !isConfigured || showModeModal || isGameOver}
            />

            {isGameOver ? (
              <div className="pointer-events-none absolute inset-0 m-auto flex h-fit w-[92%] max-w-md items-center justify-center rounded-2xl border border-slate-600 bg-slate-950/92 px-5 py-6 text-center shadow-2xl">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Match Complete</p>
                  <h2 className="mt-2 text-lg font-semibold text-slate-100">{gameOverMessage}</h2>
                </div>
              </div>
            ) : null}
          </div>

          <MoveHistoryPanel
            moveHistory={moveHistory}
            historyIndex={historyIndex}
            fenHistory={fenHistory}
            onPrevious={goPrevious}
            onNext={goNext}
            onSelectPly={selectPly}
            whitePlayerName="White"
            blackPlayerName="Black"
          />
        </div>
      </div>

      <div className="lg:hidden">
        <header className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-300">Local Practice</p>
          <h1 className="truncate text-2xl font-semibold text-slate-100 sm:text-3xl">Training Board</h1>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={openNewGameModal}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-900/80 px-2.5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200 transition hover:bg-slate-800 sm:px-3"
          >
            <RotateCcw className="h-4 w-4" />
            New
          </button>
          <button
            type="button"
            onClick={onToggleMuted}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-900/80 px-2.5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200 transition hover:bg-slate-800 sm:px-3"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            {muted ? 'On' : 'Mute'}
          </button>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-900/80 px-2.5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200 transition hover:bg-slate-800 sm:px-3"
          >
            <House className="h-4 w-4" />
            Home
          </Link>
        </div>
      </header>

      <section className="mb-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="inline-flex items-center gap-2 rounded-lg bg-cyan-500/15 px-3 py-2 text-sm text-cyan-100">
            <Crown className="h-4 w-4" />
            Turn: {currentTurn}
          </div>
          <div className="inline-flex items-center rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100">
            {isConfigured ? `Mode: ${timeControl.label}` : 'Mode: Waiting'}
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/15 px-3 py-2 text-sm text-emerald-200">
            <Clock3 className="h-4 w-4" />
            White {formatClock(whiteClockMs)}
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg bg-indigo-500/15 px-3 py-2 text-sm text-indigo-200">
            <Clock3 className="h-4 w-4" />
            Black {formatClock(blackClockMs)}
          </div>
        </div>

        {inCheck ? (
          <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-rose-200">Check</p>
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
            fen={fen}
            selectedSquare={selectedSquare}
            legalMoves={legalMoves}
            onSquareClick={handleSquareClick}
            checkSquare={checkSquare}
            lastMoveSquares={lastMoveSquares}
            orientation="white"
            disabled={!isLiveView || !isConfigured || showModeModal || isGameOver}
            fullBleedOnMobile
          />
        </div>

        {isGameOver ? (
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
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-900/80 px-3 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>
        <button
          type="button"
          onClick={goNext}
          disabled={!canGoNext}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-900/80 px-3 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </section>

      <section>
        <MoveHistoryPanel
          moveHistory={moveHistory}
          historyIndex={historyIndex}
          fenHistory={fenHistory}
          onPrevious={goPrevious}
          onNext={goNext}
          onSelectPly={selectPly}
          whitePlayerName="White"
          blackPlayerName="Black"
          showNavigationControls={false}
        />
      </section>
      </div>

      {showModeModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl shadow-slate-950/60">
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">Local Practice</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-100">Choose Rapid Mode</h2>
            <p className="mt-2 text-sm text-slate-300">Select a time control before starting the board.</p>

            <div className="mt-5 grid gap-2">
              {TIME_CONTROL_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setSelectedModeKey(option.key)}
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    selectedModeKey === option.key
                      ? 'border-cyan-400/70 bg-cyan-500/15 text-cyan-100'
                      : 'border-slate-600 bg-slate-950/40 text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <p className="text-sm font-semibold">{option.label}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {Math.floor(option.initialTimeMs / 60000)} min + {Math.floor(option.incrementMs / 1000)} sec increment
                  </p>
                </button>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
              >
                <House className="h-4 w-4" />
                Back Home
              </Link>
              <button
                type="button"
                onClick={startSelectedMode}
                className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/60 bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/35"
              >
                Start Match
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default LocalPracticePage;
