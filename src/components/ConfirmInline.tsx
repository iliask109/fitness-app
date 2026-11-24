import { ReactNode } from 'react';
import { tr } from '../lib/i18n';

/** An "are you sure?" box inside the page (browser confirm dialogs are blocked in some installed apps). */
export default function ConfirmInline({ message, confirmLabel = tr('כן, למחוק', 'Yes, delete'), onConfirm, onCancel, busy, danger = true }: {
  message: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="card confirm-card stack tight" role="alertdialog">
      <strong>{message}</strong>
      <div className="row gap">
        <button className={'btn grow ' + (danger ? 'danger' : 'primary')} disabled={busy} onClick={onConfirm}>{busy ? tr('רגע…', 'One moment…') : confirmLabel}</button>
        <button className="btn grow" disabled={busy} onClick={onCancel}>{tr('ביטול', 'Cancel')}</button>
      </div>
    </div>
  );
}
