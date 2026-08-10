import React, { useState, useRef } from 'react';
import { detectMetadata } from '../../lib/libraryService';

export interface URLCheckResult {
  comicId: string;
  comicTitle: string;
  sourceName: string;
  currentUrl: string;
  coverUrl?: string;
  genre?: string;
  isAlive: boolean;
  error?: string;
}

export interface URLCheckResult {
  comicId: string;
  comicTitle: string;
  sourceName: string;
  currentUrl: string;
  coverUrl?: string;
  genre?: string;
  isAlive: boolean;
  error?: string;
}

export interface MetadataPreview {
  url: string;
  coverUrl?: string | null;
  title?: string | null;
  genre?: string | null;
  description?: string | null;
  isLoading: boolean;
}

export interface URLCheckerPanelProps {
  comics: any[];
  isChecking: boolean;
  onCheck: () => Promise<URLCheckResult[]>;
  onReplace: (comicId: string, newUrl: string) => Promise<void>;
  tr: (id: string, en: string) => string;
}

export function URLCheckerPanel({ comics, isChecking, onCheck, onReplace, tr }: URLCheckerPanelProps) {
  const [results, setResults] = useState<URLCheckResult[]>([]);
  const [checking, setChecking] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [replacements, setReplacements] = useState<Map<string, string>>(new Map());
  const [replacing, setReplacing] = useState(false);
  const [metadataPreviews, setMetadataPreviews] = useState<Map<string, MetadataPreview>>(new Map());
  const debounceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const handleCheck = async () => {
    setChecking(true);
    try {
      const checkResults = await onCheck();
      setResults(checkResults);
      // Auto-select dead URLs
      const deadIds = new Set(
        checkResults
          .filter((r) => !r.isAlive)
          .map((r) => r.comicId)
      );
      setSelectedIds(deadIds);
    } finally {
      setChecking(false);
    }
  };

  const handleToggleSelect = (comicId: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(comicId)) {
      newSet.delete(comicId);
    } else {
      newSet.add(comicId);
    }
    setSelectedIds(newSet);
  };

  const handleUpdateUrl = (comicId: string, newUrl: string) => {
    const newReplacements = new Map(replacements);
    if (newUrl.trim()) {
      newReplacements.set(comicId, newUrl.trim());
    } else {
      newReplacements.delete(comicId);
    }
    setReplacements(newReplacements);
  };

  const handleUrlChange = (comicId: string, newUrl: string) => {
    const newReplacements = new Map(replacements);
    if (newUrl.trim()) {
      newReplacements.set(comicId, newUrl.trim());
    } else {
      newReplacements.delete(comicId);
    }
    setReplacements(newReplacements);

    // Debounce metadata fetch
    if (debounceTimers.current.has(comicId)) {
      clearTimeout(debounceTimers.current.get(comicId));
    }

    if (!newUrl.trim() || !newUrl.includes('http')) {
      setMetadataPreviews((prev) => {
        const next = new Map(prev);
        next.delete(comicId);
        return next;
      });
      return;
    }

    // Set loading state
    setMetadataPreviews((prev) => {
      const next = new Map(prev);
      next.set(comicId, { url: newUrl, isLoading: true });
      return next;
    });

    // Fetch metadata after delay
    const timer = setTimeout(async () => {
      try {
        const metadata = await detectMetadata(newUrl);
        setMetadataPreviews((prev) => {
          const next = new Map(prev);
          next.set(comicId, {
            url: newUrl,
            coverUrl: metadata?.coverUrl,
            title: metadata?.title,
            genre: metadata?.genres?.join(', '),
            description: metadata?.description,
            isLoading: false,
          });
          return next;
        });
      } catch (err) {
        console.warn(`Failed to detect metadata for ${newUrl}:`, err);
        setMetadataPreviews((prev) => {
          const next = new Map(prev);
          next.set(comicId, {
            url: newUrl,
            isLoading: false,
          });
          return next;
        });
      }
    }, 800); // 800ms debounce

    debounceTimers.current.set(comicId, timer);
  };

  const handleReplaceAll = async () => {
    setReplacing(true);
    try {
      let succeeded = 0;
      let failed = 0;

      for (const [comicId, newUrl] of replacements) {
        try {
          await onReplace(comicId, newUrl);
          succeeded++;
        } catch (err) {
          failed++;
          console.error(`Failed to replace URL for comic ${comicId}:`, err);
        }
      }

      // Show toast notification
      const message = failed === 0
        ? tr(`✅ ${succeeded} URL alternatif berhasil ditambahkan!`, `✅ ${succeeded} alternative URLs added successfully!`)
        : tr(`✅ ${succeeded} ditambahkan, ❌ ${failed} gagal`, `✅ ${succeeded} added, ❌ ${failed} failed`);

      // Create simple toast
      const toast = document.createElement('div');
      toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${failed === 0 ? '#4caf50' : '#ff9800'};
        color: white;
        padding: 16px 24px;
        borderRadius: 8px;
        boxShadow: 0 4px 12px rgba(0,0,0,0.2);
        zIndex: 10000;
        animation: slideIn 0.3s ease-out;
        fontWeight: 500;
      `;
      toast.textContent = message;
      document.body.appendChild(toast);

      setTimeout(() => toast.remove(), 3000);

      // Refresh check
      await handleCheck();
      setReplacements(new Map());
    } finally {
      setReplacing(false);
    }
  };

  const deadCount = results.filter((r) => !r.isAlive).length;
  const selectedCount = selectedIds.size;
  const replaceableCount = Array.from(replacements.values()).filter((url) => url.trim()).length;

  return (
    <section className="panel compact-panel url-checker">
      <div className="panel-head">
        <div>
          <p className="eyebrow">🔗 {tr('Periksa URL', 'Check URLs')}</p>
          <h3>{tr('Cek & Perbaiki Gambar Mati', 'Check & Fix Dead Covers')}</h3>
        </div>
      </div>

      <div style={styles.content}>
        <div style={styles.buttonGroup}>
          <button
            type="button"
            onClick={handleCheck}
            disabled={checking || comics.length === 0}
            style={styles.btnCheck}
          >
            {checking ? tr('Memeriksa...', 'Checking...') : tr('Periksa Semua URL', 'Check All URLs')}
          </button>
        </div>

        {results.length > 0 && (
          <>
            <div style={styles.stats}>
              <div style={styles.stat}>
                <strong>{results.length}</strong>
                <small>{tr('Total', 'Total')}</small>
              </div>
              <div style={{ ...styles.stat, color: '#4caf50' }}>
                <strong>{results.filter((r) => r.isAlive).length}</strong>
                <small>{tr('Baik', 'Good')}</small>
              </div>
              <div style={{ ...styles.stat, color: '#f44336' }}>
                <strong>{deadCount}</strong>
                <small>{tr('Mati', 'Dead')}</small>
              </div>
            </div>

            {deadCount > 0 && (
              <div style={styles.deadSection}>
                <h4 style={styles.sectionTitle}>❌ {tr('Gambar yang Mati', 'Dead Covers')}</h4>
                <div style={styles.list}>
                  {results
                    .filter((r) => !r.isAlive)
                    .map((result) => (
                      <div key={result.comicId} style={styles.item}>
                        <div style={styles.itemRow}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(result.comicId)}
                            onChange={() => handleToggleSelect(result.comicId)}
                            style={styles.checkbox}
                          />
                          {result.coverUrl && (
                            <img
                              src={result.coverUrl}
                              alt={result.comicTitle}
                              style={styles.coverThumb}
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          )}
                          <div style={styles.itemContent}>
                            <strong>{result.comicTitle}</strong>
                            <small style={styles.sourceName}>📍 {result.sourceName}</small>
                            {result.genre && <small style={styles.genre}>🏷️ {result.genre}</small>}
                            <small style={styles.error}>{result.error || '❌ URL tidak dapat diakses'}</small>
                          </div>
                        </div>
                        <div style={styles.urlSection}>
                          <small style={styles.oldUrlLabel}>
                            {tr('URL yang gagal:', 'Failed URL:')}
                          </small>
                          <code
                            style={styles.oldUrl}
                            onClick={() => {
                              navigator.clipboard.writeText(result.currentUrl);
                            }}
                            title={tr('Klik untuk copy', 'Click to copy')}
                          >
                            {result.currentUrl}
                          </code>
                          <small style={styles.newUrlLabel}>
                            {tr('Tambah URL alternatif:', 'Add alternative URL:')}
                          </small>
                          <input
                            type="url"
                            placeholder={tr('https://contoh.com/gambar.jpg', 'https://example.com/image.jpg')}
                            value={replacements.get(result.comicId) || ''}
                            onChange={(e) => handleUrlChange(result.comicId, e.target.value)}
                            disabled={replacing}
                            style={styles.urlInput}
                          />

                          {/* Metadata Preview */}
                          {metadataPreviews.has(result.comicId) && (
                            <div style={styles.metadataPreview}>
                              {metadataPreviews.get(result.comicId)?.isLoading ? (
                                <small style={styles.previewLoading}>⏳ {tr('Mengambil metadata...', 'Fetching metadata...')}</small>
                              ) : (
                                (() => {
                                  const preview = metadataPreviews.get(result.comicId);
                                  return preview?.coverUrl || preview?.genre || preview?.title ? (
                                    <div style={styles.previewContent}>
                                      {preview?.coverUrl && (
                                        <img
                                          src={preview.coverUrl}
                                          alt="preview"
                                          style={styles.previewCover}
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                          }}
                                        />
                                      )}
                                      <div style={styles.previewInfo}>
                                        {preview?.title && (
                                          <small style={styles.previewTitle}>{preview.title}</small>
                                        )}
                                        {preview?.genre && (
                                          <small style={styles.previewGenre}>🏷️ {preview.genre}</small>
                                        )}
                                        <small style={styles.previewCheck}>✅ {tr('Gambar ditemukan', 'Image found')}</small>
                                      </div>
                                    </div>
                                  ) : (
                                    <small style={styles.previewNotFound}>
                                      ❌ {tr('Metadata tidak ditemukan', 'Metadata not found')}
                                    </small>
                                  );
                                })()
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>

                <div style={styles.footer}>
                  <p style={styles.info}>
                    ℹ️ {tr(
                      'Masukkan URL gambar alternatif untuk setiap komik. Sistem akan mencoba URL baru jika yang lama gagal.',
                      'Enter an alternative cover URL for each comic. The system will try the new URL if the old one fails.'
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={handleReplaceAll}
                    disabled={replacing || replaceableCount === 0}
                    style={styles.btnReplace}
                  >
                    {replacing
                      ? tr('Menambahkan...', 'Adding...')
                      : tr(`Tambah ${replaceableCount} URL Alternatif`, `Add ${replaceableCount} Alternative URLs`)}
                  </button>
                </div>
              </div>
            )}

            {deadCount === 0 && (
              <div style={styles.success}>
                ✅ {tr('Semua URL gambar berfungsi dengan baik!', 'All cover URLs are working!')}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

const styles = {
  content: {
    padding: '20px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
  },
  btnCheck: {
    flex: 1,
    padding: '10px 16px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#2196f3',
    color: 'white',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '14px',
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    marginBottom: '20px',
  },
  stat: {
    textAlign: 'center' as const,
    padding: '12px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
  },
  deadSection: {
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '1px solid #eee',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '12px',
    margin: '0 0 12px 0',
  },
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    marginBottom: '16px',
  },
  item: {
    padding: '12px',
    backgroundColor: '#fff3e0',
    borderRadius: '8px',
    borderLeft: '3px solid #ff9800',
  },
  itemRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '8px',
  },
  checkbox: {
    marginTop: '2px',
    cursor: 'pointer',
    flex: 0,
  },
  coverThumb: {
    width: '50px',
    height: '70px',
    objectFit: 'cover' as const,
    borderRadius: '4px',
    flex: 0,
    border: '1px solid #ddd',
  },
  itemContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '3px',
    flex: 1,
  },
  sourceName: {
    color: '#0288d1',
    fontSize: '11px',
    display: 'block',
  },
  genre: {
    color: '#666',
    fontSize: '11px',
    display: 'block',
    maxWidth: '200px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  error: {
    color: '#d32f2f',
    fontSize: '12px',
    display: 'block',
    fontWeight: '500',
  },
  urlSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  oldUrlLabel: {
    color: '#999',
    fontSize: '11px',
    fontWeight: '500',
  },
  oldUrl: {
    display: 'block',
    padding: '8px 12px',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
    fontSize: '11px',
    wordBreak: 'break-all' as const,
    cursor: 'pointer',
    border: '1px solid #ddd',
    color: '#d32f2f',
  },
  newUrlLabel: {
    color: '#666',
    fontSize: '11px',
    fontWeight: '500',
    marginTop: '4px',
  },
  urlInput: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #2196f3',
    borderRadius: '4px',
    fontSize: '12px',
    fontFamily: 'monospace',
    boxSizing: 'border-box' as const,
  },
  footer: {
    paddingTop: '12px',
    borderTop: '1px solid rgba(255, 152, 0, 0.3)',
  },
  info: {
    margin: '0 0 12px 0',
    fontSize: '12px',
    color: '#666',
  },
  btnReplace: {
    width: '100%',
    padding: '10px 16px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#ff9800',
    color: 'white',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '14px',
  },
  success: {
    padding: '12px',
    backgroundColor: '#e8f5e9',
    borderRadius: '6px',
    color: '#2e7d32',
    textAlign: 'center' as const,
    fontSize: '14px',
    marginTop: '16px',
  },
  metadataPreview: {
    marginTop: '8px',
    padding: '8px',
    backgroundColor: '#f5f5f5',
    borderRadius: '6px',
    borderLeft: '3px solid #2196f3',
  },
  previewLoading: {
    color: '#2196f3',
    fontSize: '12px',
    display: 'block',
  },
  previewContent: {
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-start',
  },
  previewCover: {
    width: '35px',
    height: '50px',
    objectFit: 'cover' as const,
    borderRadius: '4px',
    border: '1px solid #ddd',
  },
  previewInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },
  previewTitle: {
    color: '#333',
    fontSize: '11px',
    fontWeight: '500',
    display: 'block',
    maxWidth: '150px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  previewGenre: {
    color: '#666',
    fontSize: '11px',
    display: 'block',
  },
  previewCheck: {
    color: '#4caf50',
    fontSize: '11px',
    display: 'block',
    fontWeight: '500',
  },
  previewNotFound: {
    color: '#f44336',
    fontSize: '12px',
    display: 'block',
  },
};
