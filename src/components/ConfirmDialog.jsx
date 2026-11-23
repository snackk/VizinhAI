import React, { useEffect } from 'react';

function ConfirmDialog({ open, message, onConfirm, onCancel }) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="bg-white rounded-2xl shadow-lg max-w-sm w-full p-6 space-y-5"
      >
        <p className="text-sm font-medium text-slate-700">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl font-semibold text-sm text-slate-600 hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2.5 rounded-xl font-semibold text-sm bg-red-600 text-white active:bg-red-700"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
