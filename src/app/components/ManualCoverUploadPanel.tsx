import { useState, useRef } from 'react';
import { updateComic, type Comic } from '../../features/comics';
import { hasUsableCoverUrl, getAllCoverUrls } from '../../lib/utils/cover';

type ManualCoverUploadPanelProps = {
  comics: Comic[];
  tr: (indonesian: string, english: string) => string;
  onUploadComplete: () => void;
};

export function ManualCoverUploadPanel({ comics, tr, onUploadComplete }: ManualCoverUploadPanelProps) {
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement>>({});

  const eligibleComics = comics.filter(
    (comic) => !comic.cover_storage_path && hasUsableCoverUrl(comic.cover_url),
  );

  const handleUploadImage = async (comic: Comic, fileInput?: HTMLInputElement) => {
    const urls = getAllCoverUrls(comic);
    if (urls.length === 0) return;

    setUploading(comic.id);
    try {
      const imageUrl = urls[0];
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);

      const blob = await response.blob();
      const { uploadComicCoverFromFile } = await import('../../features/comics');
      const cachedCover = await uploadComicCoverFromFile(comic.id, blob, comic.title);

      await updateComic(comic.id, {
        coverUrl: cachedCover.coverUrl,
        coverUrls: null,
        coverStoragePath: cachedCover.coverStoragePath,
      });
      onUploadComplete();
    } catch (error) {
      console.error(`Failed to upload cover for ${comic.title}:`, error);
      // Auto-open file picker on failure
      if (fileInput) {
        fileInput.click();
      }
    } finally {
      setUploading(null);
    }
  };

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
          <h3>{tr(`Upload Cover ke Supabase (${eligibleComics.length})`, `Upload Covers to Supabase (${eligibleComics.length})`)}</h3>
        </div>
      </div>
      <p className="muted">
        {tr(
          'Komik di bawah ini belum di-cache ke Supabase. Klik "Buka Gambar" untuk preview, lalu klik "Upload" untuk save ke Supabase Storage.',
          'Comics below are not yet cached to Supabase. Click "Open Image" to preview, then click "Upload" to save to Supabase Storage.',
        )}
      </p>
      <div className="manual-upload-grid">
        {eligibleComics.map((comic) => (
          <div key={comic.id} className="manual-upload-card">
            <div className="upload-card-image">
              <img
                src={getAllCoverUrls(comic)[0] || ''}
                alt={comic.title}
                loading="lazy"
              />
            </div>
            <div className="upload-card-content">
              <h4>{comic.title}</h4>
              <small>{comic.source_name || tr('Sumber', 'Source')}</small>
              <a
                className="secondary"
                href={getAllCoverUrls(comic)[0] || '#'}
                target="_blank"
                rel="noopener noreferrer"
                style={{ marginTop: '8px', display: 'block', textAlign: 'center', padding: '6px 8px', fontSize: '0.8rem' }}
              >
                {tr('Buka gambar penuh', 'Open full image')}
              </a>
              <input
                type="file"
                accept="image/*"
                ref={(el) => {
                  if (el) fileInputRefs.current[comic.id] = el;
                }}
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.currentTarget.files?.[0];
                  if (file) {
                    void handleFileUpload(comic, file);
                  }
                }}
              />
              <button
                type="button"
                className="primary"
                disabled={uploading === comic.id}
                onClick={() => void handleUploadImage(comic, fileInputRefs.current[comic.id])}
                style={{ width: '100%' }}
              >
                {uploading === comic.id ? tr('Uploading...', 'Uploading...') : tr('Upload', 'Upload')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
