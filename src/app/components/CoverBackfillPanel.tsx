import { useState } from 'react';
import { replaceComicCover, updateComic, queueCoverSync, type Comic } from '../../features/comics';
import { hasUsableCoverUrl } from '../../lib/utils/cover';

type CoverBackfillPanelProps = {
  comics: Comic[];
  tr: (indonesian: string, english: string) => string;
  onDone: () => void;
};

export function CoverBackfillPanel({ comics, tr, onDone }: CoverBackfillPanelProps) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [summary, setSummary] = useState<{ succeeded: number; failed: number } | null>(null);

  const eligibleComics = comics.filter(
    (comic) => !comic.cover_storage_path && hasUsableCoverUrl(comic.cover_url),
  );

  const BACKFILL_CONCURRENCY = 3;

  const backfillOne = async (comic: Comic) => {
    try {
      const cachedCover = await replaceComicCover(comic.id, comic.cover_url!, comic.title);
      await updateComic(comic.id, {
        coverUrl: cachedCover.coverUrl,
        coverUrls: null, // Clear array so new Supabase URL is used
        coverStoragePath: cachedCover.coverStoragePath,
      });
      return true;
    } catch (error) {
      console.warn('Failed to backfill cover, queued for retry:', error);
      queueCoverSync({ comicId: comic.id, coverUrl: comic.cover_url!, previousStoragePath: '', comicTitle: comic.title });
      return false;
    }
  };

  const handleBackfill = async () => {
    if (eligibleComics.length === 0 || running) return;
    setRunning(true);
    setSummary(null);
    setProgress({ done: 0, total: eligibleComics.length });
    let succeeded = 0;
    let failed = 0;
    const queue = [...eligibleComics];
    const worker = async () => {
      while (queue.length > 0) {
        const comic = queue.shift();
        if (!comic) break;
        const ok = await backfillOne(comic);
        if (ok) succeeded += 1;
        else failed += 1;
        setProgress((current) => ({ ...current, done: current.done + 1 }));
      }
    };
    await Promise.all(Array.from({ length: BACKFILL_CONCURRENCY }, () => worker()));
    setSummary({ succeeded, failed });
    setRunning(false);
    onDone();
  };

  return (
    <section className="panel compact-panel cover-backfill">
      <div className="panel-head">
        <div>
          <p className="eyebrow">🖼️ {tr('Cover Lama', 'Old Covers')}</p>
          <h3>{tr('Cache Cover Komik Lama', 'Cache Old Comic Covers')}</h3>
        </div>
      </div>
      <p className="muted">
        {tr(
          'Simpan salinan cover komik yang ditambahkan sebelum fitur cache aktif, supaya tetap muncul walau situs sumber down.',
          'Save a copy of covers for comics added before caching was enabled, so they still show up even if the source site goes down.',
        )}
      </p>
      {running ? (
        <div className="cover-backfill-progress">
          <div className="cover-backfill-progress-bar">
            <div
              className="cover-backfill-progress-fill"
              style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
            />
          </div>
          <span>{tr(`Memproses ${progress.done}/${progress.total}...`, `Processing ${progress.done}/${progress.total}...`)}</span>
        </div>
      ) : (
        <button type="button" className="url-check-button" disabled={eligibleComics.length === 0} onClick={() => void handleBackfill()}>
          {eligibleComics.length === 0
            ? tr('Semua cover sudah tersimpan', 'All covers already cached')
            : `🖼️ ${tr(`Cache ${eligibleComics.length} Cover Lama`, `Cache ${eligibleComics.length} Old Covers`)}`}
        </button>
      )}
      {summary ? (
        <p className="cover-backfill-summary">
          {tr(
            `Selesai: ${summary.succeeded} berhasil, ${summary.failed} gagal (akan dicoba lagi otomatis saat sync).`,
            `Done: ${summary.succeeded} succeeded, ${summary.failed} failed (will retry automatically on next sync).`,
          )}
        </p>
      ) : null}
    </section>
  );
}
