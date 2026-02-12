import { Swords } from 'lucide-react';
import { PIECE_ASSET_MAP } from '../utils/chessboard.js';

const PIECE_ORDER = {
  q: 0,
  r: 1,
  b: 2,
  n: 3,
  p: 4,
};

const sortCapturedPieces = (pieces) => {
  if (!Array.isArray(pieces)) {
    return [];
  }
  return [...pieces].sort((a, b) => {
    const orderA = PIECE_ORDER[a?.[1]] ?? 99;
    const orderB = PIECE_ORDER[b?.[1]] ?? 99;

    return orderA - orderB;
  });
};

const CapturedRow = ({ label, pieces, compact }) => {
  const orderedPieces = sortCapturedPieces(pieces || []);

  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-xl border border-slate-700/70 bg-slate-900/60 ${
        compact ? 'px-2.5 py-2' : 'px-3 py-2.5'
      }`}
    >
      <span
        className={`font-semibold uppercase text-slate-300 ${
          compact ? 'text-[10px] tracking-[0.14em]' : 'text-xs tracking-[0.14em]'
        }`}
      >
        {label}
      </span>
      <div className={`flex min-h-7 flex-1 flex-wrap items-center justify-end ${compact ? 'gap-1' : 'gap-1.5'}`}>
        {orderedPieces.length === 0 ? (
          <span className={compact ? 'text-[10px] text-slate-500' : 'text-xs text-slate-500'}>None</span>
        ) : (
          orderedPieces.map((pieceCode, index) => {
            const src = PIECE_ASSET_MAP[pieceCode];

            if (!src) {
              return null;
            }

            return (
              <span
                key={`${pieceCode}-${index}`}
                className={`inline-flex items-center justify-center rounded-md bg-slate-800/85 ring-1 ring-slate-700/70 ${
                  compact ? 'h-6 w-6' : 'h-7 w-7'
                }`}
              >
                <img
                  src={src}
                  alt={pieceCode}
                  className={`select-none object-contain ${compact ? 'h-4 w-4' : 'h-5 w-5'}`}
                  draggable={false}
                />
              </span>
            );
          })
        )}
      </div>
    </div>
  );
};

const CapturedPiecesPanel = ({
  capturedByWhite,
  capturedByBlack,
  compact = false,
  className = '',
}) => (
  <section
    className={`rounded-xl border border-slate-700/70 bg-slate-950/45 ${
      compact ? 'p-2.5' : 'p-3'
    } ${className}`}
  >
    <div
      className={`mb-2 flex items-center gap-2 font-semibold uppercase text-slate-300 ${
        compact ? 'text-[10px] tracking-[0.16em]' : 'text-[11px] tracking-[0.18em]'
      }`}
    >
      <Swords className={compact ? 'h-3 w-3 text-cyan-300' : 'h-3.5 w-3.5 text-cyan-300'} />
      Captured Pieces
    </div>
    <div className={compact ? 'grid gap-1.5' : 'grid gap-2'}>
      <CapturedRow label="White Captured" pieces={capturedByWhite} compact={compact} />
      <CapturedRow label="Black Captured" pieces={capturedByBlack} compact={compact} />
    </div>
  </section>
);

export default CapturedPiecesPanel;
