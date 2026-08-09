import { useMemo, useState } from 'react';
import { STORAGE_KEYS } from '../../lib/constants/storageKeys';
import type { AdultContentMode, Locale } from '../../features/settings';
import type { ReadingStatus } from '../../features/reading-progress';

export function useLibraryPreferences() {
  const [locale, setLocale] = useState<Locale>(() => {
    const stored = window.localStorage.getItem(STORAGE_KEYS.locale);
    return stored === 'en' ? 'en' : 'id';
  });
  const [query, setQuery] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedReadingStatus, setSelectedReadingStatus] = useState<'all' | ReadingStatus>('all');
  const [selectedFavoriteFilter, setSelectedFavoriteFilter] = useState<'all' | 'favorite' | 'not-favorite'>('all');
  const [sortBy, setSortBy] = useState<'updated_at_desc' | 'title_asc' | 'title_desc' | 'last_read_desc' | 'created_at_desc'>('updated_at_desc');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() =>
    window.localStorage.getItem(STORAGE_KEYS.libraryView) === 'grid' ? 'grid' : 'list',
  );
  const [adultContentMode, setAdultContentMode] = useState<AdultContentMode>(() => {
    const savedMode = window.localStorage.getItem(STORAGE_KEYS.adultContentMode);
    return savedMode === 'hide-images' || savedMode === 'hide-comics' ? savedMode : 'show';
  });
  const [showAdultOnDashboard, setShowAdultOnDashboard] = useState(
    () => window.localStorage.getItem(STORAGE_KEYS.dashboardAdultVisibility) === 'true',
  );

  const activeGenreFilters = useMemo(() => (Array.isArray(selectedGenres) ? selectedGenres : []), [selectedGenres]);
  const activeCollectionFilters = useMemo(
    () => (Array.isArray(selectedCollections) ? selectedCollections : []),
    [selectedCollections],
  );
  const activeTagFilters = useMemo(() => (Array.isArray(selectedTags) ? selectedTags : []), [selectedTags]);

  return {
    locale,
    setLocale,
    query,
    setQuery,
    selectedGenres,
    setSelectedGenres,
    selectedCollections,
    setSelectedCollections,
    selectedTags,
    setSelectedTags,
    selectedReadingStatus,
    setSelectedReadingStatus,
    selectedFavoriteFilter,
    setSelectedFavoriteFilter,
    sortBy,
    setSortBy,
    viewMode,
    setViewMode,
    adultContentMode,
    setAdultContentMode,
    showAdultOnDashboard,
    setShowAdultOnDashboard,
    activeGenreFilters,
    activeCollectionFilters,
    activeTagFilters,
  };
}
