import { AdultCoverNotice, type Comic } from '../../features/comics';
import { READING_STATUSES, readingStatusLabel, type ReadingProgress, type ReadingStatus } from '../../features/reading-progress';
import type { ComicLabel, LibraryLabel } from '../../features/labels';
import type { Locale } from '../../features/settings';
import { formatShortDate } from '../../lib/utils/date';

type AppComicPanelProps = {
  locale: Locale;
  tr: (indonesian: string, english: string) => string;
  activeComic: Comic;
  activeSources: Array<{ id: string; label: string | null; url: string }>;
  activeLabelLinks: ComicLabel[];
  labels: LibraryLabel[];
  chapterUpdatingComicId: string;
  chapterDrafts: Record<string, string>;
  ratingOptions: number[];
  latestProgressByComic: Map<string, ReadingProgress>;
  descriptionLoadingComicId: string;
  shouldHideAdultCover: (comic: Comic | null | undefined) => boolean;
  comicTaxonomyNames: (comic: Comic, kind: 'genre' | 'collection' | 'tag') => string[];
  validComicRating: (rating: number | null | undefined) => number;
  canRateComic: (readingStatus: ReadingStatus | null | undefined) => boolean;
  setActiveMenu: (value: 'dashboard' | 'library' | 'comic' | 'history' | 'settings') => void;
  setDetailTab: (value: 'info' | 'source' | 'history' | 'label') => void;
  setChapterDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleComicFavoriteChange: (comicId: string, favorite: boolean) => Promise<void> | void;
  handleEditComic: (comic: Comic) => void;
  handleChapterStep: (comic: Comic, direction: -1 | 1) => Promise<void> | void;
  commitChapterDraft: (comic: Comic) => Promise<void> | void;
  handleReadingStatusChange: (comicId: string, readingStatus: ReadingStatus) => Promise<void> | void;
  handleComicRatingChange: (comicId: string, rating: number) => Promise<void> | void;
  requestConfirm: (title: string, message: string, confirmLabel?: string, cancelLabel?: string) => Promise<boolean>;
  deleteComic: (comicId: string) => Promise<void>;
  removeQueuedCoverSync: (comicId: string) => void;
  syncNow: (force?: boolean) => Promise<void> | void;
  setSelectedComicId: (value: string) => void;
  setActiveComicId: (value: string) => void;
};

export function AppComicPanel(props: AppComicPanelProps) {
  const {
    locale,
    tr,
    activeComic,
    activeSources,
    activeLabelLinks,
    labels,
    chapterUpdatingComicId,
    chapterDrafts,
    ratingOptions,
    latestProgressByComic,
    descriptionLoadingComicId,
    shouldHideAdultCover,
    comicTaxonomyNames,
    validComicRating,
    canRateComic,
    setActiveMenu,
    setDetailTab,
    setChapterDrafts,
    handleComicFavoriteChange,
    handleEditComic,
    handleChapterStep,
    commitChapterDraft,
    handleReadingStatusChange,
    handleComicRatingChange,
    requestConfirm,
    deleteComic,
    removeQueuedCoverSync,
    syncNow,
    setSelectedComicId,
    setActiveComicId,
  } = props;

  return (
    <section className="comic-page-shell">
      <header className="comic-page-toolbar">
        <button type="button" className="secondary" onClick={() => setActiveMenu('library')}>
          <span className="comic-page-back-arrow" aria-hidden="true">←</span>
          <span>{tr('Kembali', 'Back')}</span>
        </button>
        <div className="comic-page-toolbar-actions">
          <button
            type="button"
            className={activeComic.favorite ? 'detail-toolbar-favorite active' : 'detail-toolbar-favorite'}
            onClick={() => void handleComicFavoriteChange(activeComic.id, !activeComic.favorite)}
          >★</button>
          <button
            type="button"
            className="detail-toolbar-delete"
            onClick={async () => {
              if (!(await requestConfirm(tr('Hapus Komik?', 'Delete Comic?'), tr(`Komik "${activeComic.title}" akan dihapus.`, `Comic "${activeComic.title}" will be deleted.`)))) return;
              await deleteComic(activeComic.id);
              removeQueuedCoverSync(activeComic.id);
              setActiveComicId('');
              setSelectedComicId('');
              setActiveMenu('library');
              await syncNow();
            }}
          >
            {tr('Hapus', 'Delete')}
          </button>
          <button type="button" className="primary" onClick={() => handleEditComic(activeComic)}>{tr('Edit komik', 'Edit comic')}</button>
        </div>
      </header>
      <section className="panel comic-page-hero">
        <div className={shouldHideAdultCover(activeComic) ? 'comic-page-cover adult-cover-hidden' : 'comic-page-cover'}>
          <span>{activeComic.title.trim().charAt(0).toUpperCase() || '?'}</span>
          {shouldHideAdultCover(activeComic) ? <AdultCoverNotice locale={locale} /> : activeComic.cover_url ? <img src={activeComic.cover_url} alt={activeComic.title} onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : null}
        </div>
        <div className="comic-page-intro">
          <p className="eyebrow">{tr('Detail komik', 'Comic details')}</p>
          <h2>{activeComic.title}</h2>
          <div className="comic-page-badges">
            <span className="comic-page-status">{readingStatusLabel(activeComic.reading_status, locale)}</span>
            {comicTaxonomyNames(activeComic, 'collection').map((name) => <span key={name}>{name}</span>)}
          </div>
          <p className="comic-page-description">
            {activeComic.history || (descriptionLoadingComicId === activeComic.id ? tr('Mengambil deskripsi dari sumber…', 'Fetching description from sources…') : tr('Belum ada catatan atau keterangan untuk komik ini.', 'No notes or description have been added for this comic.'))}
          </p>
          <div className="comic-page-primary-source">
            <span>{tr('Sumber utama', 'Primary source')}</span>
            {activeComic.source_url ? <a href={activeComic.source_url} target="_blank" rel="noreferrer">{activeComic.source_name || activeComic.source_url}</a> : <strong>{tr('Belum ada sumber', 'No source yet')}</strong>}
          </div>
        </div>
      </section>
      <section className="comic-page-stat-grid">
        <article className="comic-page-stat tone-blue">
          <span>{tr('Chapter terakhir', 'Last chapter')}</span>
          <strong>{chapterNumberFromLabel(latestProgressByComic.get(activeComic.id)?.chapter_label)}</strong>
          <div className="chapter-stepper comic-page-chapter">
            <button type="button" disabled={chapterUpdatingComicId === activeComic.id} onClick={() => void handleChapterStep(activeComic, -1)}>-</button>
            <span className="chapter-value">
              <small>{tr('Chapter', 'Chapter')}</small>
              <input type="number" min="0" step="1" inputMode="numeric" disabled={chapterUpdatingComicId === activeComic.id} value={chapterDrafts[activeComic.id] ?? String(chapterNumberFromLabel(latestProgressByComic.get(activeComic.id)?.chapter_label))} onFocus={() => setChapterDrafts((current) => ({ ...current, [activeComic.id]: String(chapterNumberFromLabel(latestProgressByComic.get(activeComic.id)?.chapter_label)) }))} onChange={(event) => setChapterDrafts((current) => ({ ...current, [activeComic.id]: event.target.value }))} onBlur={() => void commitChapterDraft(activeComic)} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} />
            </span>
            <button type="button" disabled={chapterUpdatingComicId === activeComic.id} onClick={() => void handleChapterStep(activeComic, 1)}>+</button>
          </div>
        </article>
        <article className="comic-page-stat tone-mint">
          <span>{tr('Status baca', 'Reading status')}</span>
          <select className="reading-status-select" value={activeComic.reading_status ?? 'wantToRead'} onChange={(event) => void handleReadingStatusChange(activeComic.id, event.target.value as ReadingStatus)}>
            {READING_STATUSES.map((status) => <option key={status} value={status}>{readingStatusLabel(status, locale)}</option>)}
          </select>
        </article>
        <article className="comic-page-stat tone-gold comic-page-rating-card">
          <span>{tr('Rating', 'Rating')}</span>
          <div className="comic-rating-stars comic-page-rating-stars">
            {ratingOptions.filter((value) => value > 0).map((value) => <button key={value} type="button" className={validComicRating(activeComic.rating) >= value ? 'comic-star-button active' : 'comic-star-button'} disabled={!canRateComic(activeComic.reading_status)} onClick={() => void handleComicRatingChange(activeComic.id, value)} aria-label={tr(`${value} bintang`, `${value} star`)}>★</button>)}
          </div>
          <div className="comic-rating-footer comic-page-rating-footer">
            <strong><b className="comic-rating-star">★</b><span>{validComicRating(activeComic.rating) > 0 ? `${validComicRating(activeComic.rating)}/5` : tr('Belum dinilai', 'Unrated')}</span></strong>
            <button type="button" className="comic-rating-clear" disabled={!canRateComic(activeComic.reading_status) || validComicRating(activeComic.rating) === 0} onClick={() => void handleComicRatingChange(activeComic.id, 0)}>{tr('Hapus', 'Clear')}</button>
          </div>
        </article>
        <article className="comic-page-stat tone-amber"><span>{tr('Ditambahkan', 'Added')}</span><strong>{formatShortDate(activeComic.created_at ?? activeComic.updated_at, locale)}</strong></article>
        <article className="comic-page-stat tone-coral"><span>{tr('Terakhir diperbarui', 'Last updated')}</span><strong>{formatShortDate(activeComic.updated_at, locale)}</strong></article>
      </section>
      <section className="comic-page-content-grid">
        <article className="panel comic-page-section">
          <div className="comic-page-section-head">
            <div><p className="eyebrow">{tr('Klasifikasi', 'Classification')}</p><h3>{tr('Genre, koleksi, dan tag', 'Genres, collections, and tags')}</h3></div>
            <button type="button" className="secondary" onClick={() => { setDetailTab('label'); setActiveMenu('library'); }}>{tr('Kelola label', 'Manage labels')}</button>
          </div>
          {(['genre', 'collection', 'tag'] as const).map((kind) => {
            const names = kind === 'tag' ? labels.filter((label) => label.kind === 'tag' && activeLabelLinks.some((link) => link.label_id === label.id)).map((label) => label.name) : comicTaxonomyNames(activeComic, kind);
            return <div className="comic-page-label-row" key={kind}><span>{kind === 'genre' ? 'Genre' : kind === 'collection' ? tr('Koleksi', 'Collection') : 'Tag'}</span><div className="chips">{names.length > 0 ? names.map((name) => <span className="chip active" key={name}>{name}</span>) : <small>{tr('Belum dipilih', 'Not selected')}</small>}</div></div>;
          })}
        </article>
        <article className="panel comic-page-section">
          <div className="comic-page-section-head"><div><p className="eyebrow">{tr('Tautan baca', 'Reading links')}</p><h3>{tr('Semua sumber', 'All sources')}</h3></div></div>
          <div className="comic-page-source-list">
            {activeComic.source_url && <a href={activeComic.source_url} target="_blank" rel="noreferrer"><span>{activeComic.source_name || tr('Sumber utama', 'Primary source')}</span><small>{activeComic.source_url}</small><b>↗</b></a>}
            {activeSources.filter((source) => source.url !== activeComic.source_url).map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.id}><span>{source.label || tr('Sumber', 'Source')}</span><small>{source.url}</small><b>↗</b></a>)}
          </div>
        </article>
      </section>
    </section>
  );
}

function chapterNumberFromLabel(label: string | null | undefined) {
  const match = String(label ?? '').match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}
