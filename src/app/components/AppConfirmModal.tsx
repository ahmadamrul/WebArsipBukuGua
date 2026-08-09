type ConfirmState = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
};

type AppConfirmModalProps = {
  confirmState: ConfirmState;
  tr: (indonesian: string, english: string) => string;
  closeConfirm: (value: boolean) => void;
};

export function AppConfirmModal({ confirmState, tr, closeConfirm }: AppConfirmModalProps) {
  if (!confirmState.open) return null;

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
        <div className="confirm-modal-icon" aria-hidden="true">
          <span>?</span>
        </div>
        <div className="confirm-modal-copy">
          <p className="eyebrow">{tr('Konfirmasi tindakan', 'Confirm action')}</p>
          <h3 id="confirm-dialog-title">{confirmState.title}</h3>
          <p>{confirmState.message}</p>
        </div>
        <div className="confirm-modal-actions">
          <button type="button" className="secondary" onClick={() => closeConfirm(false)}>
            {confirmState.cancelLabel || tr('Batal', 'Cancel')}
          </button>
          <button type="button" className="primary" onClick={() => closeConfirm(true)}>
            {confirmState.confirmLabel || tr('Ya, lanjutkan', 'Yes, continue')}
          </button>
        </div>
      </div>
    </div>
  );
}
