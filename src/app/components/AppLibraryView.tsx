import { AdultCoverNotice, chapterNumberFromLabel, deleteComic, type Comic } from '../../features/comics';
import { readingStatusLabel, READING_STATUSES, validReadingStatus, type ReadingProgress, type ReadingStatus } from '../../features/reading-progress';
import type { ComicLabel, LibraryLabel } from '../../features/labels';
import { AppLibraryPanel } from './AppLibraryPanel';
import { CoverImage } from './CoverImage';
import type { AppView } from '../routes';

type TFunction = typeof import('../../features/settings/services/localization').localeLabels.id;

type AppLibraryViewProps = {
  locale: 'id' | 'en';
  t: TFunction;
  tr: (indonesian: string, english: string) => string;
  activeMenu: AppView;
  viewMode: 'list' | 'grid';
  setViewMode: (value: 'list' | 'grid') => void;
  sortedComics: Comic[];
  activeComic: Comic | null;
  openComicPage: (comicId: string) => void;
  handleLibraryComicClick: (comicId: string) => void;
  shouldHideAdultCover: (comic: Comic | null | undefined) => boolean;
  latestProgressByComic: Map<string, ReadingProgress>;
  chapterUpdatingComicId: string;
  chapterDrafts: Record<string, string>;
  setChapterDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleChapterStep: (comic: Comic, direction: -1 | 1) => Promise<void> | void;
  commitChapterDraft: (comic: Comic) => Promise<void> | void;
  handleReadingStatusChange: (comicId: string, readingStatus: ReadingStatus) => Promise<void> | void;
  handleComicRatingChange: (comicId: string, rating: number) => Promise<void> | void;
  handleComicFavoriteChange: (comicId: string, favorite: boolean) => Promise<void> | void;
  handleEditComic: (comic: Comic) => void;
  ratingOptions: number[];
  labels: LibraryLabel[];
  activeSources: Array<{ id: string; label: string | null; url: string }>;
  activeProgresses: ReadingProgress[];
  activeLabelLinks: ComicLabel[];
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
  comicTaxonomyNamesForList: (comic: Comic) => string;
  comicTaxonomyNamesForPanel: (comic: Comic, kind: 'genre' | 'collection' | 'tag') => string[];
  validComicRating: (rating: number | null | undefined) => number;
  canRateComic: (readingStatus: ReadingStatus | null | undefined) => boolean;
  setQuery: (value: string) => void;
  setSortBy: (value: AppLibraryViewProps['sortBy']) => void;
  setSelectedReadingStatus: (value: 'all' | ReadingStatus) => void;
  setSelectedCollections: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedGenres: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedTags: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedFavoriteFilter: React.Dispatch<React.SetStateAction<'all' | 'favorite' | 'not-favorite'>>;
  setDetailTab: (value: 'info' | 'source' | 'history' | 'label') => void;
  openLabelForm: (kind?: string) => void;
  openSourceEdit: (source: { id: string; label: string | null; url: string }) => void;
  toggleComicLabel: (labelId: string) => Promise<void> | void;
  requestConfirm: (title: string, message: string, confirmLabel?: string, cancelLabel?: string) => Promise<boolean>;
  syncNow: (force?: boolean, options?: { suppressSuccessMessage?: boolean; suppressErrorMessage?: boolean }) => Promise<boolean> | boolean;
};

export function AppLibraryView(props: AppLibraryViewProps) {
  const {
    locale,
    t,
    tr,
    activeMenu,
    viewMode,
    setViewMode,
    sortedComics,
    activeComic,
    openComicPage,
    handleLibraryComicClick,
    shouldHideAdultCover,
    latestProgressByComic,
    chapterUpdatingComicId,
    chapterDrafts,
    setChapterDrafts,
    handleChapterStep,
    commitChapterDraft,
    handleReadingStatusChange,
    handleComicRatingChange,
    handleComicFavoriteChange,
    handleEditComic,
    ratingOptions,
    labels,
    activeSources,
    activeProgresses,
    activeLabelLinks,
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
    comicTaxonomyNamesForList,
    comicTaxonomyNamesForPanel,
    validComicRating,
    canRateComic,
    setQuery,
    setSortBy,
    setSelectedReadingStatus,
    setSelectedCollections,
    setSelectedGenres,
    setSelectedTags,
    setSelectedFavoriteFilter,
    setDetailTab,
    openLabelForm,
    openSourceEdit,
    toggleComicLabel,
    requestConfirm,
    syncNow,
  } = props;

  return (
    <section className="library-shell">
      <section className="library-layout">
        <div className="panel library-list-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">{tr('Koleksi', 'Collection')}</p>
              <h3>{tr('Daftar komik', 'Comic list')}</h3>
            </div>
            <div className="view-switcher" aria-label={tr('Mode tampilan', 'View mode')}>
              <button type="button" className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>
                {tr('Daftar', 'List')}
              </button>
              <button type="button" className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}>
                Grid
              </button>
            </div>
          </div>
          <div className={`comic-list ${viewMode === 'grid' ? 'grid-view' : 'list-view'}`}>
            {sortedComics.map((comic) => (
              <article
                className={comic.id === activeComic?.id ? 'comic-card active' : 'comic-card'}
                key={comic.id}
                onClick={() => handleLibraryComicClick(comic.id)}
                onDoubleClick={() => openComicPage(comic.id)}
              >
                <div className={shouldHideAdultCover(comic) ? 'comic-cover adult-cover-hidden' : 'comic-cover'} aria-label={`Cover ${comic.title}`}>
                  <span>{comic.title.trim().charAt(0).toUpperCase() || '?'}</span>
                  {comic.favorite ? <span className="comic-favorite-badge" aria-label={tr('Favorit', 'Favorite')}>★</span> : null}
                  {shouldHideAdultCover(comic) ? (
                    <AdultCoverNotice locale={locale} />
                  ) : (
                    <CoverImage
                      comic={comic}
                      alt=""
                      loading="lazy"
                    />
                  )}
                </div>
                <div className="comic-info">
                  <h4>{comic.title}</h4>
                  <p>{comicTaxonomyNamesForList(comic)}</p>
                  <a href={comic.source_url ?? '#'} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
                    {comic.source_name ?? comic.source_url ?? tr('Sumber', 'Source')}
                  </a>
                  <div className="comic-rating" onClick={(event) => event.stopPropagation()}>
                    <span className="comic-rating-label">{tr('Rating', 'Rating')}</span>
                    <div className="comic-rating-footer">
                      <span className="comic-rating-value">
                        <b className="comic-rating-star">★</b>
                        <span>{validComicRating(comic.rating) > 0 ? `${validComicRating(comic.rating)}/5` : '0/5'}</span>
                      </span>
                    </div>
                  </div>
                  <div className="chapter-stepper" onClick={(event) => event.stopPropagation()}>
                    <button type="button" disabled={chapterUpdatingComicId === comic.id || chapterNumberFromLabel(latestProgressByComic.get(comic.id)?.chapter_label) === 0} onClick={() => void handleChapterStep(comic, -1)}>-</button>
                    <span className="chapter-value">
                      <small>{tr('Chapter', 'Chapter')}</small>
                      <input type="number" min="0" step="1" inputMode="numeric" disabled={chapterUpdatingComicId === comic.id} value={chapterDrafts[comic.id] ?? String(chapterNumberFromLabel(latestProgressByComic.get(comic.id)?.chapter_label))} onFocus={() => setChapterDrafts((current) => ({ ...current, [comic.id]: String(chapterNumberFromLabel(latestProgressByComic.get(comic.id)?.chapter_label)) }))} onChange={(event) => setChapterDrafts((current) => ({ ...current, [comic.id]: event.target.value }))} onBlur={() => void commitChapterDraft(comic)} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} />
                    </span>
                    <button type="button" disabled={chapterUpdatingComicId === comic.id} onClick={() => void handleChapterStep(comic, 1)}>+</button>
                  </div>
                </div>
                <div className="comic-meta">
                  <select className="reading-status-select" value={validReadingStatus(comic.reading_status)} onClick={(event) => event.stopPropagation()} onChange={(event) => void handleReadingStatusChange(comic.id, event.target.value as ReadingStatus)} aria-label={tr(`Status baca ${comic.title}`, `Reading status for ${comic.title}`)}>
                    {READING_STATUSES.map((status) => <option key={status} value={status}>{readingStatusLabel(status, locale)}</option>)}
                  </select>
                  <div className="comic-actions">
                    <button type="button" className="mini-action" onClick={(event) => { event.stopPropagation(); handleEditComic(comic); }}>{tr('Edit', 'Edit')}</button>
                    <button className="mini-action danger" onClick={async (event) => { event.stopPropagation(); if (!(await requestConfirm(tr('Hapus Komik?', 'Delete Comic?'), tr(`Komik "${comic.title}" akan dihapus.`, `Comic "${comic.title}" will be deleted.`)))) return; await deleteComic(comic.id); await syncNow(); }}>{tr('Hapus', 'Delete')}</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <AppLibraryPanel
          locale={locale}
          t={t}
          tr={tr}
          activeMenu={activeMenu}
          activeComic={activeComic}
          activeSources={activeSources}
          activeProgresses={activeProgresses}
          activeLabelLinks={activeLabelLinks}
          labels={labels}
          collections={collections}
          genres={genres}
          tags={tags}
          filteredComics={filteredComics}
          query={query}
          sortBy={sortBy}
          selectedReadingStatus={selectedReadingStatus}
          selectedCollections={selectedCollections}
          selectedGenres={selectedGenres}
          selectedTags={selectedTags}
          selectedFavoriteFilter={selectedFavoriteFilter}
          detailTab={detailTab}
          ratingOptions={ratingOptions}
          latestProgressByComic={latestProgressByComic}
          shouldHideAdultCover={shouldHideAdultCover}
          comicTaxonomyNames={comicTaxonomyNamesForPanel}
          validComicRating={validComicRating}
          canRateComic={canRateComic}
          handleComicFavoriteChange={handleComicFavoriteChange}
          setQuery={setQuery}
          setSortBy={setSortBy}
          setSelectedReadingStatus={setSelectedReadingStatus}
          setSelectedCollections={setSelectedCollections}
          setSelectedGenres={setSelectedGenres}
          setSelectedTags={setSelectedTags}
          setSelectedFavoriteFilter={setSelectedFavoriteFilter}
          setDetailTab={setDetailTab}
          openLabelForm={openLabelForm}
          handleComicRatingChange={handleComicRatingChange}
          openSourceEdit={openSourceEdit}
          toggleComicLabel={toggleComicLabel}
          requestConfirm={requestConfirm}
          syncNow={syncNow}
        />
      </section>
    </section>
  );
}
