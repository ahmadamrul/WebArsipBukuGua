import { useMemo } from 'react';
import { detectMetadata } from '../../features/metadata-detection';
import type { Comic } from '../../features/comics';
import type { ComicLabel } from '../../features/labels';
import type { ComicSource } from '../../features/sources';
import type { ReadingProgress } from '../../features/reading-progress';
import { updateComic } from '../../features/comics';
import type { AppView } from '../routes';

type SetState<T> = (value: T | ((current: T) => T)) => void;

export type ActiveComicViewDeps = {
  visibleComics: Comic[];
  sources: ComicSource[];
  progresses: ReadingProgress[];
  comicLabels: ComicLabel[];
  selectedComicId: string;
  activeComicId: string;
  descriptionLoadingComicId: string;
  setActiveComicId: SetState<string>;
  setSelectedComicId: SetState<string>;
  setActiveMenu: SetState<AppView>;
  setDetailTab: SetState<'info' | 'source' | 'history' | 'label'>;
  setDescriptionLoadingComicId: SetState<string>;
  syncNow: (force?: boolean, options?: { suppressSuccessMessage?: boolean; suppressErrorMessage?: boolean }) => Promise<boolean> | boolean;
};

export function useActiveComicView({
  visibleComics,
  sources,
  progresses,
  comicLabels,
  selectedComicId,
  activeComicId,
  descriptionLoadingComicId,
  setActiveComicId,
  setSelectedComicId,
  setActiveMenu,
  setDetailTab,
  setDescriptionLoadingComicId,
  syncNow,
}: ActiveComicViewDeps) {
  const activeComic = useMemo(
    () => visibleComics.find((comic) => comic.id === (activeComicId || selectedComicId)) ?? visibleComics[0],
    [activeComicId, selectedComicId, visibleComics],
  );
  const activeSources = useMemo(() => sources.filter((source) => source.comic_id === activeComic?.id), [activeComic?.id, sources]);
  const activeProgresses = useMemo(
    () => progresses.filter((progress) => progress.comic_id === activeComic?.id),
    [activeComic?.id, progresses],
  );
  const activeLabelLinks = useMemo(
    () => comicLabels.filter((link) => link.comic_id === activeComic?.id),
    [activeComic?.id, comicLabels],
  );

  const hydrateComicDescription = async (comic: Comic) => {
    if (comic.history?.trim() || descriptionLoadingComicId === comic.id) return;
    const sourceUrls = Array.from(
      new Set([
        comic.source_url,
        ...sources.filter((source) => source.comic_id === comic.id).map((source) => source.url),
      ].filter((value): value is string => Boolean(value))),
    );
    if (sourceUrls.length === 0) return;
    setDescriptionLoadingComicId(comic.id);
    try {
      for (const sourceUrl of sourceUrls) {
        const metadata = await detectMetadata(sourceUrl);
        if (!metadata.description) continue;
        await updateComic(comic.id, { history: metadata.description });
        await syncNow();
        return;
      }
    } finally {
      setDescriptionLoadingComicId('');
    }
  };

  const openComicPage = (comicId: string) => {
    if (!visibleComics.some((comic) => comic.id === comicId)) return;
    setActiveComicId(comicId);
    setSelectedComicId(comicId);
    setActiveMenu('comic');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const comic = visibleComics.find((item) => item.id === comicId);
    if (comic) void hydrateComicDescription(comic);
  };

  const handleLibraryComicClick = (comicId: string) => {
    if (activeComic?.id === comicId) {
      openComicPage(comicId);
      return;
    }
    setActiveComicId(comicId);
    setSelectedComicId(comicId);
    setDetailTab('info');
  };

  return {
    activeComic,
    activeSources,
    activeProgresses,
    activeLabelLinks,
    openComicPage,
    handleLibraryComicClick,
  };
}
