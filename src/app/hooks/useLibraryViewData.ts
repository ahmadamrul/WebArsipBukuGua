import { useMemo } from 'react';
import { buildDashboardActivities, buildDashboardBars, buildDashboardStats, buildRecentComics, comicTaxonomyNames, comicTaxonomySummary } from '../utils/libraryView';
import { comicHasAdultTaxonomy, type Comic } from '../../features/comics';
import type { ComicLabel, LibraryLabel } from '../../features/labels';
import type { ReadingProgress, ReadingStatus } from '../../features/reading-progress';
import type { AdultContentMode, Locale } from '../../features/settings';

type Translate = (indonesian: string, english: string) => string;

type Params = {
  comics: Comic[];
  labels: LibraryLabel[];
  comicLabels: ComicLabel[];
  progresses: ReadingProgress[];
  query: string;
  selectedGenres: string[];
  selectedCollections: string[];
  selectedTags: string[];
  selectedReadingStatus: 'all' | ReadingStatus;
  selectedFavoriteFilter: 'all' | 'favorite' | 'not-favorite';
  sortBy: 'updated_at_desc' | 'title_asc' | 'title_desc' | 'last_read_desc' | 'created_at_desc';
  adultContentMode: AdultContentMode;
  showAdultOnDashboard: boolean;
  locale: Locale;
  tr: Translate;
  readingStatusLabel: (status: ReadingStatus | null | undefined, locale: Locale) => string;
};

export function useLibraryViewData({
  comics,
  labels,
  comicLabels,
  progresses,
  query,
  selectedGenres,
  selectedCollections,
  selectedTags,
  selectedReadingStatus,
  selectedFavoriteFilter,
  sortBy,
  adultContentMode,
  showAdultOnDashboard,
  locale,
  tr,
  readingStatusLabel,
}: Params) {
  const adultComicIds = useMemo(
    () => new Set(comics.filter((comic) => comicHasAdultTaxonomy(comic, labels, comicLabels)).map((comic) => comic.id)),
    [comics, labels, comicLabels],
  );
  const visibleComics = useMemo(
    () => (adultContentMode === 'hide-comics' ? comics.filter((comic) => !adultComicIds.has(comic.id)) : comics),
    [adultComicIds, adultContentMode, comics],
  );
  const dashboardComics = useMemo(
    () => (showAdultOnDashboard ? visibleComics : visibleComics.filter((comic) => !adultComicIds.has(comic.id))),
    [adultComicIds, showAdultOnDashboard, visibleComics],
  );
  const dashboardComicIds = useMemo(() => new Set(dashboardComics.map((comic) => comic.id)), [dashboardComics]);
  const dashboardProgresses = useMemo(
    () => progresses.filter((progress) => dashboardComicIds.has(progress.comic_id)),
    [dashboardComicIds, progresses],
  );
  const filteredComics = useMemo(() => {
    return visibleComics.filter((comic) => {
      const comicTagIds = comicLabels.filter((link) => link.comic_id === comic.id).map((link) => link.label_id);
      const linkedLabels = labels.filter((label) => comicTagIds.includes(label.id));
      const comicGenreNames = [
        ...(comic.genre ?? '').split(',').map((value) => value.trim()),
        ...linkedLabels.filter((label) => label.kind === 'genre').map((label) => label.name.trim()),
      ].filter((value): value is string => Boolean(value));
      const comicCollectionNames = linkedLabels
        .filter((label) => label.kind === 'collection')
        .map((label) => label.name.trim())
        .filter((value): value is string => Boolean(value));
      const comicTagNames = linkedLabels
        .filter((label) => label.kind === 'tag')
        .map((label) => label.name.trim())
        .filter((value): value is string => Boolean(value));
      const normalizedQuery = query.toLowerCase();
      const matchesQuery =
        comic.title.toLowerCase().includes(normalizedQuery) ||
        (comic.source_url ?? '').toLowerCase().includes(normalizedQuery) ||
        comicCollectionNames.some((collection) => collection.toLowerCase().includes(normalizedQuery));
      const matchesGenre = selectedGenres.every((genre) => comicGenreNames.includes(genre));
      const matchesCollection = selectedCollections.every((collection) => comicCollectionNames.includes(collection));
      const matchesTag = selectedTags.every((tag) => comicTagNames.includes(tag));
      const matchesReadingStatus =
        selectedReadingStatus === 'all' || comic.reading_status === selectedReadingStatus;
      const matchesFavorite =
        selectedFavoriteFilter === 'all' ||
        (selectedFavoriteFilter === 'favorite' && Boolean(comic.favorite)) ||
        (selectedFavoriteFilter === 'not-favorite' && !comic.favorite);
      return matchesQuery && matchesGenre && matchesCollection && matchesTag && matchesReadingStatus && matchesFavorite;
    });
  }, [
    visibleComics,
    query,
    selectedGenres,
    selectedCollections,
    selectedTags,
    selectedReadingStatus,
    selectedFavoriteFilter,
    comicLabels,
    labels,
  ]);
  const sortedComics = useMemo(() => {
    const list = [...filteredComics];
    const compareDate = (a: string | null | undefined, b: string | null | undefined) =>
      new Date(b ?? 0).getTime() - new Date(a ?? 0).getTime();
    switch (sortBy) {
      case 'title_asc':
        return list.sort((a, b) => a.title.localeCompare(b.title));
      case 'title_desc':
        return list.sort((a, b) => b.title.localeCompare(a.title));
      case 'last_read_desc':
        return list.sort((a, b) => {
          const left = progresses.find((progress) => progress.comic_id === a.id)?.updated_at;
          const right = progresses.find((progress) => progress.comic_id === b.id)?.updated_at;
          return compareDate(left, right);
        });
      case 'created_at_desc':
      case 'updated_at_desc':
      default:
        return list.sort((a, b) => compareDate(a.updated_at, b.updated_at));
    }
  }, [filteredComics, sortBy, progresses]);
  const genres = useMemo(() => [...new Set([...comics.flatMap((comic) => (comic.genre ?? '').split(',').map((value) => value.trim())).filter(Boolean), ...labels.filter((label) => label.kind === 'genre').map((label) => label.name.trim()).filter(Boolean)])], [comics, labels]);
  const collections = useMemo(() => [...new Set(labels.filter((label) => label.kind === 'collection').map((label) => label.name.trim()).filter(Boolean))], [labels]);
  const tags = useMemo(() => [...new Set(labels.filter((label) => label.kind === 'tag').map((label) => label.name.trim()).filter(Boolean))], [labels]);
  const collectionOptions = useMemo(() => labels.filter((label) => label.kind === 'collection').map((label) => label.name.trim()).filter(Boolean), [labels]);
  const tagOptions = useMemo(() => labels.filter((label) => label.kind === 'tag').map((label) => label.name.trim()).filter(Boolean), [labels]);
  const stats = buildDashboardStats({ comics: dashboardComics, labels, readingStatusLabel, locale, tr });
  const dashboardBars = buildDashboardBars({ dashboardComics, labels, dashboardProgresses, tr });
  const recentComics = buildRecentComics(dashboardComics);
  const dashboardActivities = buildDashboardActivities({ dashboardComics, dashboardProgresses, locale, tr, readingStatusLabel });
  const historyActivities = buildDashboardActivities({ dashboardComics, dashboardProgresses, locale, tr, readingStatusLabel, limit: Infinity });
  const comicTaxonomyNamesForPanel = (comic: Comic, kind: 'genre' | 'collection' | 'tag') => comicTaxonomyNames(comic, kind, labels, comicLabels);
  const comicTaxonomySummaryForList = (comic: Comic) => comicTaxonomySummary(comic, labels, comicLabels, tr);
  return {
    adultComicIds,
    visibleComics,
    dashboardComics,
    dashboardProgresses,
    filteredComics,
    sortedComics,
    genres,
    collections,
    tags,
    collectionOptions,
    tagOptions,
    stats,
    dashboardBars,
    recentComics,
    dashboardActivities,
    historyActivities,
    comicTaxonomyNamesForPanel,
    comicTaxonomySummaryForList,
  };
}
