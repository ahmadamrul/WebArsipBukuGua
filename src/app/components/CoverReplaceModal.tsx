import React from 'react';

export interface CoverReplaceRequest {
  comicId: string;
  comicTitle: string;
  failedUrl: string;
  newUrl?: string;
}

export interface CoverReplaceModalProps {
  request: CoverReplaceRequest | null;
  isOpen: boolean;
  isProcessing: boolean;
  onReplace: (newUrl: string) => Promise<void>;
  onSkip: () => void;
  onClose: () => void;
  tr: (id: string, en: string) => string;
}

export function CoverReplaceModal({ request, isOpen, isProcessing, onReplace, onSkip, onClose, tr }: CoverReplaceModalProps) {
  const [newUrl, setNewUrl] = React.useState('');

  React.useEffect(() => {
    if (isOpen) {
      setNewUrl('');
    }
  }, [isOpen, request]);

  if (!isOpen || !request) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) {
      return;
    }
    await onReplace(newUrl.trim());
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2>🖼️ {tr('Ganti Gambar Sampul', 'Replace Cover Image')}</h2>
          <button onClick={onClose} style={styles.closeBtn} disabled={isProcessing}>✕</button>
        </div>

        <div style={styles.content}>
          <div style={styles.comicInfo}>
            <p style={styles.comicTitle}>{request.comicTitle}</p>
            <p style={styles.errorText}>
              {tr('Gambar sampul tidak dapat diakses (404)', 'Cover image cannot be accessed (404)')}
            </p>
          </div>

          <div style={styles.urlSection}>
            <p style={styles.label}>{tr('URL gambar yang gagal:', 'Failed URL:')}</p>
            <code style={styles.failedUrl}>{request.failedUrl}</code>
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            <label style={styles.labelBlock}>
              <span style={styles.labelText}>
                {tr('URL gambar baru:', 'New cover URL:')}
              </span>
              <input
                type="url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder={tr('https://example.com/cover.jpg', 'https://example.com/cover.jpg')}
                disabled={isProcessing}
                style={styles.input}
              />
            </label>

            <div style={styles.actions}>
              <button
                type="button"
                onClick={onSkip}
                disabled={isProcessing}
                style={styles.btnSkip}
              >
                {tr('Lewati', 'Skip')}
              </button>
              <button
                type="submit"
                disabled={isProcessing || !newUrl.trim()}
                style={styles.btnReplace}
              >
                {isProcessing ? tr('Memproses...', 'Processing...') : tr('Ganti', 'Replace')}
              </button>
            </div>
          </form>

          <div style={styles.help}>
            <p style={styles.helpText}>
              {tr(
                '💡 Cari URL gambar dari situs komik alternatif atau upload gambar baru',
                '💡 Find cover URL from alternative manga site or upload a new image',
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1002,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    maxWidth: '500px',
    width: '90%',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #eee',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
  },
  content: {
    padding: '20px',
  },
  comicInfo: {
    padding: '12px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
    marginBottom: '16px',
  },
  comicTitle: {
    margin: '0 0 8px 0',
    fontWeight: '500',
    fontSize: '14px',
  },
  errorText: {
    margin: 0,
    color: '#d32f2f',
    fontSize: '13px',
  },
  urlSection: {
    marginBottom: '16px',
  },
  label: {
    margin: '0 0 8px 0',
    fontSize: '13px',
    color: '#666',
    fontWeight: '500',
  },
  failedUrl: {
    display: 'block',
    padding: '8px',
    backgroundColor: '#fff3e0',
    borderRadius: '6px',
    fontSize: '12px',
    overflow: 'auto',
    wordBreak: 'break-all' as const,
  },
  form: {
    marginBottom: '16px',
  },
  labelBlock: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    marginBottom: '16px',
  },
  labelText: {
    fontSize: '13px',
    color: '#666',
    fontWeight: '500',
  },
  input: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'monospace',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    marginTop: '16px',
    borderTop: '1px solid #eee',
    paddingTop: '16px',
  },
  btnSkip: {
    flex: 1,
    padding: '8px 16px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '14px',
  },
  btnReplace: {
    flex: 1,
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#ff9800',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  help: {
    padding: '12px',
    backgroundColor: '#e3f2fd',
    borderRadius: '6px',
    marginTop: '12px',
  },
  helpText: {
    margin: 0,
    fontSize: '12px',
    color: '#1976d2',
    lineHeight: '1.4',
  },
};
