import { Activity, ChevronLeft, ChevronRight, History, Timer } from 'lucide-react';
import { getMoveRows } from '../utils/chessboard.js';

const MoveHistoryPanel = ({
  moveHistory,
  historyIndex,
  fenHistory,
  onPrevious,
  onNext,
  onSelectPly,
  whitePlayerName,
  blackPlayerName,
  showNavigationControls = true,
  className = '',
}) => {
  const rows = getMoveRows(moveHistory || []);
  const currentPly = Math.max(0, historyIndex || 0);
  const isLive = historyIndex === (Array.isArray(fenHistory) ? fenHistory.length - 1 : 0);

  return (
    <aside
      className={`flex min-h-[280px] flex-col rounded-2xl border border-slate-700/70 bg-slate-900/75 p-3 shadow-xl shadow-slate-950/40 sm:p-4 ${className}`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
          <History className="h-4 w-4 text-cyan-300" />
          Move History
        </h3>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${
            isLive
              ? 'bg-emerald-500/20 text-emerald-200'
              : 'bg-slate-800 text-slate-400'
          }`}
        >
          {isLive ? <Activity className="h-3.5 w-3.5" /> : <Timer className="h-3.5 w-3.5" />}
          {isLive ? 'Live' : 'Review'}
        </span>
      </div>

      <div className="min-h-[220px] max-h-[55vh] overflow-y-auto rounded-xl border border-slate-700/60 bg-slate-950/30 sm:max-h-[60vh]">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-slate-900/95">
            <tr className="border-b border-slate-700/80 text-xs uppercase tracking-[0.16em] text-slate-400">
              <th className="px-3 py-3 text-left">
                White
                <span className="ml-1 text-slate-300">({whitePlayerName})</span>
              </th>
              <th className="px-3 py-3 text-left">
                Black
                <span className="ml-1 text-slate-300">({blackPlayerName})</span>
              </th>
            </tr>
          </thead>
          <tbody className="text-slate-200">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-3 py-5 text-center text-slate-400">
                  No moves yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const whitePly = row.moveNumber * 2 - 1;
                const blackPly = row.moveNumber * 2;
                const isCurrentRow = currentPly === whitePly || currentPly === blackPly;

                return (
                  <tr
                    key={row.moveNumber}
                    className={`border-b border-slate-800/75 ${
                      isCurrentRow ? 'bg-cyan-500/10' : 'hover:bg-slate-800/45'
                    }`}
                  >
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => row.white && onSelectPly?.(whitePly)}
                        disabled={!row.white}
                        className={`w-full rounded-md px-1.5 py-1 text-left transition ${
                          currentPly === whitePly
                            ? 'font-semibold text-cyan-200'
                            : 'text-slate-200 hover:bg-cyan-500/10 hover:text-cyan-200'
                        } disabled:cursor-default disabled:text-slate-500 disabled:hover:bg-transparent`}
                      >
                        {row.white || '-'}
                      </button>
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => row.black && onSelectPly?.(blackPly)}
                        disabled={!row.black}
                        className={`w-full rounded-md px-1.5 py-1 text-left transition ${
                          currentPly === blackPly
                            ? 'font-semibold text-cyan-200'
                            : 'text-slate-200 hover:bg-cyan-500/10 hover:text-cyan-200'
                        } disabled:cursor-default disabled:text-slate-500 disabled:hover:bg-transparent`}
                      >
                        {row.black || '-'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showNavigationControls ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onPrevious}
            disabled={historyIndex <= 0}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={historyIndex >= fenHistory.length - 1}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </aside>
  );
};

export default MoveHistoryPanel;
