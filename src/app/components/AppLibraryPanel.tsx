import { AdultCoverNotice, type Comic } from '../../features/comics';
import { deleteReadingProgress, READING_STATUSES, readingStatusLabel, type ReadingProgress, type ReadingStatus } from '../../features/reading-progress';
import type { ComicLabel, LibraryLabel } from '../../features/labels';
import type { Locale } from '../../features/settings';
import { formatShortDate } from '../../lib/utils/date';
import type { AppView } from '../routes';

type TFunction = typeof import('../../features/settings/services/localization').localeLabels.id;

type AppLibraryPanelProps = {
  locale: Locale;
  t: TFunction;
  tr: (indonesian: string, english: string) => string;
  activeMenu: AppView;
  activeComic: Comic | null;
  activeSources: Array<{ id: string; label: string | null; url: string }>;
  activeProgresses: ReadingProgress[];
  activeLabelLinks: ComicLabel[];
  labels: LibraryLabel[];
  collections: string[];
  genres: string[];
  tags: string[];
  filteredComics: Comic[];
  query: string;
  sortBy: 'updated_at_desc' | 'title_asc' | 'title_desc' | 'last_read_desc' | 'created_at_desc';
  selectedReadingStatus: 'all' | ReadingStatus;
  selectedCollections: string[];
  selectedGenres: string[];
  selectedTags: string[];
  selectedFavoriteFilter: 'all' | 'favorite' | 'not-favorite';
  detailTab: 'info' | 'source' | 'history' | 'label';
  ratingOptions: number[];
  latestProgressByComic: Map<string, ReadingProgress>;
  shouldHideAdultCover: (comic: Comic | null | undefined) => boolean;
  comicTaxonomyNames: (comic: Comic, kind: 'genre' | 'collection' | 'tag') => string[];
  validComicRating: (rating: number | null | undefined) => number;
  canRateComic: (readingStatus: ReadingStatus | null | undefined) => boolean;
  handleComicFavoriteChange: (comicId: string, favorite: boolean) => Promise<void> | void;
  setQuery: (value: string) => void;
  setSortBy: (value: AppLibraryPanelProps['sortBy']) => void;
  setSelectedReadingStatus: (value: 'all' | ReadingStatus) => void;
  setSelectedCollections: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedGenres: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedTags: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedFavoriteFilter: React.Dispatch<React.SetStateAction<'all' | 'favorite' | 'not-favorite'>>;
  setDetailTab: (value: 'info' | 'source' | 'history' | 'label') => void;
  openLabelForm: (kind?: string) => void;
  handleComicRatingChange: (comicId: string, rating: number) => Promise<void> | void;
  openSourceEdit: (source: { id: string; label: string | null; url: string }) => void;
  toggleComicLabel: (labelId: string) => Promise<void> | void;
  requestConfirm: (title: string, message: string, confirmLabel?: string, cancelLabel?: string) => Promise<boolean>;
  syncNow: (force?: boolean, options?: { suppressSuccessMessage?: boolean; suppressErrorMessage?: boolean }) => Promise<boolean> | boolean;
};

export function AppLibraryPanel(props: AppLibraryPanelProps) {
  const {
    locale,
    tr,
    activeComic,
    activeSources,
    activeProgresses,
    activeLabelLinks,
    labels,
    collections,
    genres,
    tags,
    filteredComics,
    query,
    sortBy,
    selectedReadingStatus,
    selectedCollections,
    selectedGenres,
    selectedTags,
    selectedFavoriteFilter,
    detailTab,
    ratingOptions,
    latestProgressByComic,
    shouldHideAdultCover,
    comicTaxonomyNames,
    validComicRating,
    canRateComic,
    handleComicFavoriteChange,
    setQuery,
    setSortBy,
    setSelectedReadingStatus,
    setSelectedCollections,
    setSelectedGenres,
    setSelectedTags,
    setSelectedFavoriteFilter,
    setDetailTab,
    openLabelForm,
    handleComicRatingChange,
    openSourceEdit,
    toggleComicLabel,
    requestConfirm,
    syncNow,
  } = props;

  const handleResetFilters = () => {
    setQuery('');
    setSelectedGenres([]);
    setSelectedCollections([]);
    setSelectedTags([]);
    setSelectedReadingStatus('all');
    setSelectedFavoriteFilter('all');
  };

  return (
    <div className="library-side-column">
      <section className="filters panel library-filter-panel">
        <div className="filters-top">
          <div className="filters-title">
            <p className="eyebrow">{tr('Koleksi', 'Collection')}</p>
            <h3>{tr('Cari dan filter', 'Search and filter')}</h3>
            <span className="badge">{filteredComics.length} item</span>
          </div>
          <div className="filters-search">
            <input
              className="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={tr('Cari judul...', 'Search titles...')}
            />
            <div className="inline-actions filter-toolbar">
              <button type="button" className="secondary" onClick={() => openLabelForm('genre')}>
                + Genre
              </button>
              <button type="button" className="secondary" onClick={() => openLabelForm('collection')}>
                + {tr('Koleksi', 'Collection')}
              </button>
              <button type="button" className="secondary" onClick={() => openLabelForm('tag')}>
                + Tag
              </button>
              <select
                className="sort-select"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as AppLibraryPanelProps['sortBy'])}
              >
                <option value="updated_at_desc">{tr('Baru diperbarui', 'Recently updated')}</option>
                <option value="created_at_desc">{tr('Terbaru ditambahkan', 'Recently added')}</option>
                <option value="title_asc">{tr('Judul (A-Z)', 'Title (A-Z)')}</option>
                <option value="title_desc">{tr('Judul (Z-A)', 'Title (Z-A)')}</option>
                <option value="last_read_desc">{tr('Terakhir dibaca', 'Last read')}</option>
              </select>
              <button type="button" className="secondary" onClick={handleResetFilters}>
                {tr('Reset filter', 'Reset filters')}
              </button>
            </div>
          </div>
        </div>
        <div className="filter-stack">
          <div className="filter-group">
            <span className="filter-label">{tr('Status baca', 'Reading status')}</span>
            <div className="chips">
              <button type="button" className={selectedReadingStatus === 'all' ? 'chip active' : 'chip'} onClick={() => setSelectedReadingStatus('all')}>
                {tr('Semua', 'All')}
              </button>
              {READING_STATUSES.map((status) => (
                <button key={status} type="button" className={selectedReadingStatus === status ? 'chip active' : 'chip'} onClick={() => setSelectedReadingStatus(status)}>
                  {readingStatusLabel(status, locale)}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <span className="filter-label">{tr('Koleksi', 'Collection')}</span>
            <div className="chips">
              <button
                type="button"
                className={selectedCollections.length === 0 ? 'chip active' : 'chip'}
                onClick={() => setSelectedCollections([])}
              >
                {tr('Semua', 'All')}
              </button>
              {collections.map((collection) => (
                <button
                  key={collection}
                  type="button"
                  className={selectedCollections.includes(collection) ? 'chip active' : 'chip'}
                  onClick={() =>
                    setSelectedCollections((current) =>
                      current.includes(collection)
                        ? current.filter((item) => item !== collection)
                        : [...current, collection],
                    )
                  }
                >
                  {collection}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <span className="filter-label">Genre</span>
            <div className="chips">
              <button
                type="button"
                className={selectedGenres.length === 0 ? 'chip active' : 'chip'}
                onClick={() => setSelectedGenres([])}
              >
                {tr('Semua', 'All')}
              </button>
              {genres.map((genre) => (
                <button
                  key={genre}
                  type="button"
                  className={selectedGenres.includes(genre) ? 'chip active' : 'chip'}
                  onClick={() =>
                    setSelectedGenres((current) =>
                      current.includes(genre) ? current.filter((item) => item !== genre) : [...current, genre],
                    )
                  }
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <span className="filter-label">Tag</span>
            <div className="chips">
              <button
                type="button"
                className={selectedTags.length === 0 ? 'chip active' : 'chip'}
                onClick={() => setSelectedTags([])}
              >
                {tr('Semua', 'All')}
              </button>
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={selectedTags.includes(tag) ? 'chip active' : 'chip'}
                  onClick={() =>
                    setSelectedTags((current) =>
                      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
                    )
                  }
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <span className="filter-label">{tr('Favorit', 'Favorite')}</span>
            <div className="chips">
              <button
                type="button"
                className={selectedFavoriteFilter === 'all' ? 'chip active' : 'chip'}
                onClick={() => setSelectedFavoriteFilter('all')}
              >
                {tr('Semua', 'All')}
              </button>
              <button
                type="button"
                className={selectedFavoriteFilter === 'favorite' ? 'chip active' : 'chip'}
                onClick={() =>
                  setSelectedFavoriteFilter((current) => (current === 'favorite' ? 'all' : 'favorite'))
                }
              >
                ★ {tr('Favorit', 'Favorite')}
              </button>
              <button
                type="button"
                className={selectedFavoriteFilter === 'not-favorite' ? 'chip active' : 'chip'}
                onClick={() =>
                  setSelectedFavoriteFilter((current) =>
                    current === 'not-favorite' ? 'all' : 'not-favorite',
                  )
                }
              >
                {tr('Bukan favorit', 'Not favorite')}
              </button>
            </div>
          </div>
        </div>
      </section>
      <div className="stack library-detail-stack">
        <section className="panel panel-glow detail-panel">
          <div className="detail-hero">
            <div className={shouldHideAdultCover(activeComic) ? 'detail-cover-full adult-cover-hidden' : 'detail-cover-full'} aria-label={tr('Cover komik', 'Comic cover')}>
              {activeComic ? (
                <button
                  type="button"
                  className={activeComic.favorite ? 'detail-favorite-button active' : 'detail-favorite-button'}
                  onClick={() => void handleComicFavoriteChange(activeComic.id, !activeComic.favorite)}
                  aria-label={activeComic.favorite ? tr('Hapus favorit', 'Remove favorite') : tr('Tandai favorit', 'Mark favorite')}
                >
                  ★
                </button>
              ) : null}
              <div className="detail-cover-placeholder" aria-hidden="true"><span>{activeComic?.title.trim().charAt(0).toUpperCase() || '?'}</span></div>
              {shouldHideAdultCover(activeComic) ? <AdultCoverNotice locale={locale} /> : activeComic?.cover_url ? <img src={activeComic.cover_url} alt={activeComic.title} onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : null}
            </div>
            <div className="detail-meta detail-title-card">
              <span>{tr('Judul', 'Title')}</span>
              <h3>{activeComic?.title ?? tr('Pilih komik', 'Select a comic')}</h3>
            </div>
          </div>
          <div className="detail-tabs">
            {(['info', 'source', 'history', 'label'] as const).map((tab) => (
              <button key={tab} type="button" className={detailTab === tab ? 'detail-tab active' : 'detail-tab'} onClick={() => setDetailTab(tab)}>
                {tab === 'info' ? 'Info' : tab === 'source' ? tr('Sumber', 'Source') : tab === 'history' ? tr('Riwayat', 'History') : tr('Label', 'Labels')}
              </button>
            ))}
          </div>
          <div className="detail-content">
            {detailTab === 'info' && activeComic && (
              <div className="detail-grid">
                <div><span>Genre</span><strong>{comicTaxonomyNames(activeComic, 'genre').join(', ') || tr('Tanpa genre', 'No genre')}</strong></div>
                <div><span>{tr('Koleksi', 'Collection')}</span><strong>{comicTaxonomyNames(activeComic, 'collection').join(', ') || tr('Tanpa koleksi', 'No collection')}</strong></div>
                <div className="detail-rating-panel">
                  <span>{tr('Rating', 'Rating')}</span>
                  <select
                    className="comic-rating-select"
                    value={validComicRating(activeComic.rating)}
                    disabled={!canRateComic(activeComic.reading_status)}
                    onChange={(event) =>
                      void handleComicRatingChange(activeComic.id, Number(event.target.value))
                    }
                  >
                    {ratingOptions.map((value) => (
                      <option key={value} value={value}>
                        {value === 0 ? '0' : `${value}★`}
                      </option>
                    ))}
                  </select>
                </div>
                <div><span>{tr('Status baca', 'Reading status')}</span><strong>{readingStatusLabel(activeComic.reading_status, locale)}</strong></div>
                <div><span>{tr('Terakhir dibaca', 'Last read')}</span><strong>{latestProgressByComic.get(activeComic.id)?.chapter_label ?? tr('Belum dibaca', 'Not read yet')}</strong></div>
              </div>
            )}
            {detailTab === 'source' && activeComic && (
              <div className="detail-stack">
                {activeSources.length > 0 ? activeSources.map((source) => (
                  <article className="source-card source-card-compact" key={source.id}>
                    <div>
                      <strong>{source.label ?? tr('Sumber', 'Source')}</strong>
                      <a href={source.url} target="_blank" rel="noreferrer">{source.url}</a>
                    </div>
                    <button type="button" className="mini-action" onClick={() => openSourceEdit(source)}>{tr('Edit', 'Edit')}</button>
                  </article>
                )) : (
                  <p className="detail-empty-note">{tr('Belum ada sumber yang tersimpan.', 'No sources have been saved yet.')}</p>
                )}
              </div>
            )}
            {detailTab === 'history' && activeComic && (
              <div className="detail-stack">
                {activeProgresses.slice(0, 6).length > 0 ? activeProgresses.slice(0, 6).map((progress) => (
                  <article className="history-card history-card-compact" key={progress.id}>
                    <div>
                      <strong>{progress.chapter_label ?? tr('Chapter tidak dicatat', 'Chapter not recorded')}</strong>
                      <span>{formatShortDate(progress.updated_at, locale)}</span>
                    </div>
                    <button type="button" className="mini-action danger" onClick={async () => { if (!(await requestConfirm(tr('Hapus Riwayat?', 'Delete History?'), tr('Riwayat baca ini akan dihapus.', 'This reading history entry will be deleted.')))) return; await deleteReadingProgress(progress.id); await syncNow(); }}>{tr('Hapus', 'Delete')}</button>
                  </article>
                )) : (
                  <p className="detail-empty-note">{tr('Belum ada riwayat baca.', 'No reading history yet.')}</p>
                )}
              </div>
            )}
            {detailTab === 'label' && activeComic && (
              <div className="detail-label-selector">
                {(['genre', 'collection', 'tag'] as const).map((kind) => (
                  <div className="detail-label-group" key={kind}>
                    <span>{kind === 'genre' ? 'Genre' : kind === 'collection' ? tr('Koleksi', 'Collection') : 'Tag'}</span>
                    <div className="chips">
                      {labels.filter((label) => label.kind === kind).map((label) => {
                        const active = activeLabelLinks.some((link) => link.label_id === label.id);
                        return <button type="button" key={label.id} className={active ? 'chip active' : 'chip'} onClick={() => toggleComicLabel(label.id)}>{label.name}</button>;
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
