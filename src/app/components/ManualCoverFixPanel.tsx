import { useState } from 'react';
import { updateComic, uploadComicCoverFromFile, removeQueuedCoverSync, readPendingCoverSync, type PendingCoverSync } from '../../features/comics';

type ManualCoverFixPanelProps = {
  tr: (indonesian: string, english: string) => string;
  onDone: () => void;
};

export function ManualCoverFixPanel({ tr, onDone }: ManualCoverFixPanelProps) {
  const [items, setItems] = useState<PendingCoverSync[]>(() => readPendingCoverSync());
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [errorById, setErrorById] = useState<Record<string, string>>({});

  const refreshItems = () => setItems(readPendingCoverSync());

  const handleFileSelected = async (item: PendingCoverSync, file: File | undefined) => {
    if (!file) return;
    setUploadingId(item.comicId);
    setErrorById((current) => ({ ...current, [item.comicId]: '' }));
    try {
      const uploaded = await uploadComicCoverFromFile(item.comicId, file, item.comicTitle);
      await updateComic(item.comicId, {
        coverUrl: uploaded.coverUrl,
        coverStoragePath: uploaded.coverStoragePath,
      });
      removeQueuedCoverSync(item.comicId);
      refreshItems();
      onDone();
    } catch (error) {
      setErrorById((current) => ({
        ...current,
        [item.comicId]: error instanceof Error ? error.message : tr('Gagal mengunggah gambar.', 'Failed to upload image.'),
      }));
    } finally {
      setUploadingId(null);
    }
  };

  if (items.length === 0) return null;

  return (
    <section className="panel compact-panel manual-cover-fix">
      <div className="panel-head">
        <div>
          <p className="eyebrow">📥 {tr('Perbaikan Manual', 'Manual Fix')}</p>
          <h3>{tr(`Cover Gagal Otomatis (${items.length})`, `Covers That Failed Automatically (${items.length})`)}</h3>
        </div>
      </div>
      <p className="muted">
        {tr(
          'Situs sumber di bawah ini memblokir pengambilan gambar otomatis. Klik "Buka gambar penuh", lalu klik kanan → Save Image As, dan upload filenya di sini.',
          'The source sites below block automatic image fetching. Click "Open full image", then right-click → Save Image As, and upload the file here.',
        )}
      </p>
      <div className="manual-cover-fix-list">
        {items.map((item) => (
          <div className="manual-cover-fix-item" key={item.comicId}>
            <img src={item.coverUrl} alt={item.comicTitle ?? ''} loading="lazy" />
            <div className="manual-cover-fix-item-copy">
              <strong>{item.comicTitle || tr('Tanpa judul', 'Untitled')}</strong>
              <a
                className="secondary manual-cover-fix-open"
                href={item.coverUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {tr('Buka gambar penuh', 'Open full image')}
              </a>
              <label className="secondary manual-cover-fix-upload">
                {uploadingId === item.comicId ? tr('Mengunggah...', 'Uploading...') : tr('Upload file', 'Upload file')}
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingId === item.comicId}
                  onChange={(event) => void handleFileSelected(item, event.target.files?.[0])}
                  style={{ display: 'none' }}
                />
              </label>
              {errorById[item.comicId] ? <small className="manual-cover-fix-error">{errorById[item.comicId]}</small> : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
