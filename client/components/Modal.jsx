import { CircleX, ShieldAlert } from 'lucide-react';

const Modal = ({ isOpen, title, description, onConfirm, onCancel, confirmLabel, cancelLabel }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl shadow-slate-950/60">
        <h3 className="text-lg font-semibold text-slate-50">{title}</h3>
        <p className="mt-2 text-sm text-slate-300">{description}</p>

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
            onClick={onCancel}
          >
            <CircleX className="h-4 w-4" />
            {cancelLabel}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-rose-500/70 bg-rose-600/90 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500"
            onClick={onConfirm}
          >
            <ShieldAlert className="h-4 w-4" />
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
