import React from 'react';
import type { ImportedKotatsuComic } from '../../features/import-export';

export interface ImportPreviewData {
  comics: ImportedKotatsuComic[];
  duplicates: number;
  errors: number;
  categories: Array<{ id: number; name: string; count: number }>;
}

export interface ImportPreviewProps {
  preview: ImportPreviewData | null;
  isOpen: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  tr: (id: string, en: string) => string;
}

export function ImportPreviewModal({ preview, isOpen, onConfirm, onCancel, tr }: ImportPreviewProps) {
  const [isConfirming, setIsConfirming] = React.useState(false);

  if (!isOpen || !preview) return null;

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2>{tr('Preview Impor', 'Import Preview')}</h2>
          <button onClick={onCancel} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.content}>
          {/* Summary Stats */}
          <div style={styles.stats}>
            <div style={styles.statItem}>
              <div style={styles.statNumber}>{preview.comics.length}</div>
              <div style={styles.statLabel}>{tr('Komik', 'Comics')}</div>
            </div>
            {preview.duplicates > 0 && (
              <div style={styles.statItem}>
                <div style={{ ...styles.statNumber, color: '#ff9800' }}>{preview.duplicates}</div>
                <div style={styles.statLabel}>{tr('Duplikat', 'Duplicates')}</div>
              </div>
            )}
            {preview.errors > 0 && (
              <div style={styles.statItem}>
                <div style={{ ...styles.statNumber, color: '#f44336' }}>{preview.errors}</div>
                <div style={styles.statLabel}>{tr('Error', 'Errors')}</div>
              </div>
            )}
          </div>

          {/* Category Selection */}
          {preview.categories.length > 0 && (
            <div style={styles.section}>
              <h3>{tr('Pilih Kategori/Koleksi', 'Select Categories/Collections')}</h3>
              <div style={styles.categoryList}>
                {preview.categories.map((cat) => (
                  <div key={cat.id} style={styles.categoryItem}>
                    <div>
                      <div style={styles.categoryName}>{cat.name}</div>
                      <small style={styles.categoryCount}>{cat.count} komik</small>
                    </div>
                    {/* TODO: add collection selector dropdown */}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comics List Preview */}
          <div style={styles.section}>
            <h3>{tr('Komik yang akan diimport', 'Comics to import')}</h3>
            <div style={styles.comicsList}>
              {preview.comics.slice(0, 5).map((comic, i) => (
                <div key={i} style={styles.comicItem}>
                  <div style={styles.comicTitle}>{comic.title}</div>
                  <small style={styles.comicMeta}>
                    {comic.sourceName} • {comic.readingStatus}
                    {comic.progressPercent && ` (${Math.round(comic.progressPercent * 100)}%)`}
                  </small>
                </div>
              ))}
              {preview.comics.length > 5 && (
                <div style={styles.moreItems}>
                  +{preview.comics.length - 5} {tr('komik lainnya', 'more comics')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={styles.footer}>
          <button onClick={onCancel} style={styles.btnCancel} disabled={isConfirming}>
            {tr('Batal', 'Cancel')}
          </button>
          <button onClick={handleConfirm} style={styles.btnConfirm} disabled={isConfirming}>
            {isConfirming ? tr('Mengimpor...', 'Importing...') : tr('Lanjutkan', 'Confirm')}
          </button>
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
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '90vh',
    overflow: 'auto',
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
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  statItem: {
    textAlign: 'center' as const,
    padding: '12px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
  },
  statNumber: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#2196f3',
  },
  statLabel: {
    fontSize: '12px',
    color: '#666',
    marginTop: '4px',
  },
  section: {
    marginBottom: '24px',
  },
  categoryList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  categoryItem: {
    padding: '12px',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryName: {
    fontWeight: '500',
  },
  categoryCount: {
    color: '#999',
  },
  comicsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  comicItem: {
    padding: '8px',
    borderLeft: '3px solid #2196f3',
    paddingLeft: '12px',
  },
  comicTitle: {
    fontWeight: '500',
    marginBottom: '2px',
  },
  comicMeta: {
    color: '#999',
  },
  moreItems: {
    textAlign: 'center' as const,
    padding: '8px',
    color: '#999',
  },
  footer: {
    display: 'flex',
    gap: '12px',
    padding: '20px',
    borderTop: '1px solid #eee',
    justifyContent: 'flex-end',
  },
  btnCancel: {
    padding: '8px 16px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    backgroundColor: 'white',
    cursor: 'pointer',
  },
  btnConfirm: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#2196f3',
    color: 'white',
    cursor: 'pointer',
  },
};
