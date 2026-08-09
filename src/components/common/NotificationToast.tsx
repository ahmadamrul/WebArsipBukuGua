export type MessageTone = 'info' | 'success' | 'warning' | 'error';

type NotificationToastProps = {
  message: string;
  tone: MessageTone;
  visible: boolean;
  translate: (indonesian: string, english: string) => string;
};

export function NotificationToast({ message, tone, visible, translate }: NotificationToastProps) {
  if (!visible) return null;

  const title = {
    success: translate('Berhasil', 'Success'),
    warning: translate('Perhatian', 'Attention'),
    error: translate('Gagal', 'Error'),
    info: 'Info',
  }[tone];

  return (
    <div className={`toast-notification tone-${tone}`} role="status" aria-live="polite">
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  );
}
