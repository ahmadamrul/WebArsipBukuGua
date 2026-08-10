import React from 'react';

export interface CollectionCreationRequest {
  kotatsuName: string;
  comicCount: number;
  selected?: boolean;
}

export interface CollectionCreationModalProps {
  collections: CollectionCreationRequest[];
  isOpen: boolean;
  isCreating: boolean;
  onConfirm: (selectedCollections: CollectionCreationRequest[]) => Promise<void>;
  onSkip: () => void;
  tr: (id: string, en: string) => string;
}

export function CollectionCreationModal({ collections, isOpen, isCreating, onConfirm, onSkip, tr }: CollectionCreationModalProps) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set(collections.map((c) => c.kotatsuName)));

  if (!isOpen || collections.length === 0) return null;

  const handleToggle = (kotatsuName: string) => {
    const newSet = new Set(selected);
    if (newSet.has(kotatsuName)) {
      newSet.delete(kotatsuName);
    } else {
      newSet.add(kotatsuName);
    }
    setSelected(newSet);
  };

  const handleConfirm = async () => {
    const selectedCollections = collections.filter((c) => selected.has(c.kotatsuName));
    await onConfirm(selectedCollections);
  };

  return (
    <div style={styles.overlay} onClick={onSkip}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2>{tr('Buat koleksi baru', 'Create new collections')}</h2>
          <button onClick={onSkip} style={styles.closeBtn} disabled={isCreating}>✕</button>
        </div>

        <div style={styles.content}>
          <p style={styles.description}>
            {tr(
              'Kotatsu backup Anda memiliki kategori yang belum ada di aplikasi. Pilih mana yang ingin dibuat:',
              'Your Kotatsu backup has categories that don\'t exist in the app. Select which ones to create:',
            )}
          </p>

          <div style={styles.list}>
            {collections.map((collection) => (
              <label key={collection.kotatsuName} style={styles.item}>
                <input
                  type="checkbox"
                  checked={selected.has(collection.kotatsuName)}
                  onChange={() => handleToggle(collection.kotatsuName)}
                  disabled={isCreating}
                  style={styles.checkbox}
                />
                <div style={styles.itemContent}>
                  <strong>{collection.kotatsuName}</strong>
                  <small style={styles.itemCount}>{collection.comicCount} komik</small>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div style={styles.footer}>
          <button onClick={onSkip} style={styles.btnCancel} disabled={isCreating}>
            {tr('Lewati', 'Skip')}
          </button>
          <button onClick={handleConfirm} style={styles.btnConfirm} disabled={isCreating || selected.size === 0}>
            {isCreating ? tr('Membuat...', 'Creating...') : tr('Buat Koleksi', 'Create Collections')}
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
    zIndex: 1001,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '80vh',
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
  description: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '16px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  item: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    cursor: 'pointer',
    border: '1px solid #eee',
  },
  checkbox: {
    marginTop: '2px',
    cursor: 'pointer',
  },
  itemContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    flex: 1,
  },
  itemCount: {
    color: '#999',
    fontSize: '12px',
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
