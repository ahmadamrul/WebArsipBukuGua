import { useState } from 'react';
import { replaceComicCover, updateComic, type Comic } from '../../features/comics';
import { hasUsableCoverUrl } from '../../lib/utils/cover';

type ManualCoverUploadPanelProps = {
  comics: Comic[];
  tr: (indonesian: string, english: string) => string;
  onUploadComplete: () => void;
};

export function ManualCoverUploadPanel({ comics, tr, onUploadComplete }: ManualCoverUploadPanelProps) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const eligibleComics = comics.filter(
    (comic) => !comic.cover_storage_path && hasUsableCoverUrl(comic.cover_url),
  );

  const handleFileUpload = async (comic: Comic, file: File) => {
    if (!file) return;
    setUploading(comic.id);
    try {
      const { uploadComicCoverFromFile } = await import('../../features/comics');
      const cachedCover = await uploadComicCoverFromFile(comic.id, file, comic.title);
      await updateComic(comic.id, {
        coverUrl: cachedCover.coverUrl,
        coverUrls: null,
        coverStoragePath: cachedCover.coverStoragePath,
      });
      onUploadComplete();
    } catch (error) {
      console.error(`Failed to upload cover for ${comic.title}:`, error);
      alert(tr('Gagal upload cover. Cek console untuk detail.', 'Failed to upload cover. Check console for details.'));
    } finally {
      setUploading(null);
    }
  };

  if (eligibleComics.length === 0) {
    return null;
  }

  return (
    <section className="panel compact-panel manual-upload-panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">📤 {tr('Upload Manual', 'Manual Upload')}</p>
          <h3>{tr('Upload Cover ke Supabase', 'Upload Covers to Supabase')}</h3>
        </div>
      </div>
      <p className="muted">
        {tr(
          'Pilih komik untuk upload cover ke Supabase Storage. Klik preview untuk lihat gambar full size.',
          'Select comics to upload covers to Supabase Storage. Click preview to see full image.',
        )}
      </p>
      <div className="manual-upload-list">
        {eligibleComics.map((comic) => (
          <div key={comic.id} className="manual-upload-item">
            <div className="upload-item-header">
              <div>
                <h4>{comic.title}</h4>
                <small>{comic.source_name || tr('Sumber tidak diketahui', 'Unknown source')}</small>
              </div>
              <label className="secondary" style={{ cursor: 'pointer', margin: 0 }}>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  disabled={uploading === comic.id}
                  onChange={(e) => {
                    const file = e.currentTarget.files?.[0];
                    if (file) {
                      void handleFileUpload(comic, file);
                    }
                  }}
                />
                {uploading === comic.id ? tr('Uploading...', 'Uploading...') : tr('Pilih & Upload', 'Choose & Upload')}
              </label>
            </div>
            {expandedId === comic.id && (
              <div className="upload-item-preview">
                <img src={comic.cover_url || ''} alt={comic.title} />
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setExpandedId(null)}
                >
                  {tr('Tutup', 'Close')}
                </button>
              </div>
            )}
            {expandedId !== comic.id && (
              <button
                type="button"
                className="ghost"
                onClick={() => setExpandedId(comic.id)}
              >
                {tr('Preview Gambar', 'Preview Image')}
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
