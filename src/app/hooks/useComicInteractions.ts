import { useMemo } from 'react';
import { updateComic, validComicRating, canRateComic, chapterNumberFromLabel, type Comic } from '../../features/comics';
import { setLastReadChapter, type ReadingProgress, type ReadingStatus } from '../../features/reading-progress';
import { toDebugMessage, toErrorMessage } from '../../lib/utils/errors';

type SetState<T> = (value: T | ((current: T) => T)) => void;
type Translate = (indonesian: string, english: string) => string;

export type ComicInteractionsDeps = {
  comics: Comic[];
  progresses: ReadingProgress[];
  chapterDrafts: Record<string, string>;
  chapterUpdatingComicId: string;
  setComics: SetState<Comic[]>;
  setMessage: SetState<string>;
  setMessageTone: SetState<'info' | 'success' | 'warning' | 'error'>;
  setDebugError: SetState<string>;
  setChapterUpdatingComicId: SetState<string>;
  setChapterDrafts: SetState<Record<string, string>>;
  syncNow: (force?: boolean, options?: { suppressSuccessMessage?: boolean; suppressErrorMessage?: boolean }) => Promise<boolean> | boolean;
  tr: Translate;
};

export function createComicInteractions(deps: ComicInteractionsDeps) {
  const {
    comics,
    progresses,
    chapterDrafts,
    chapterUpdatingComicId,
    setComics,
    setMessage,
    setMessageTone,
    setDebugError,
    setChapterUpdatingComicId,
    setChapterDrafts,
    syncNow,
    tr,
  } = deps;

  const latestProgressByComic = useMemo(() => {
    const latest = new Map<string, ReadingProgress>();
    for (const progress of progresses) {
      const current = latest.get(progress.comic_id);
      if (!current || new Date(progress.updated_at).getTime() > new Date(current.updated_at).getTime()) {
        latest.set(progress.comic_id, progress);
      }
    }
    return latest;
  }, [progresses]);

  const handleReadingStatusChange = async (comicId: string, readingStatus: ReadingStatus) => {
    try {
      await updateComic(comicId, { readingStatus, rating: readingStatus === 'wantToRead' ? 0 : undefined });
      await syncNow();
      setMessage(tr(`Status diubah menjadi ${readingStatus}.`, `Status changed to ${readingStatus}.`));
      setMessageTone('success');
    } catch (error) {
      setMessage(tr(`Ubah status gagal: ${toErrorMessage(error)}`, `Failed to change status: ${toErrorMessage(error)}`));
      setMessageTone('error');
      setDebugError(toDebugMessage(error));
    }
  };

  const handleComicRatingChange = async (comicId: string, rating: number) => {
    const nextRating = validComicRating(rating);
    const comic = comics.find((item) => item.id === comicId);
    if (!canRateComic(comic?.reading_status)) {
      setMessage(tr('Rating hanya bisa diberikan setelah komik masuk ke status dibaca, tamat, atau dihentikan.', 'Ratings are only available after a comic is set to reading, completed, or dropped.'));
      setMessageTone('warning');
      return;
    }
    try {
      await updateComic(comicId, { rating: nextRating });
      await syncNow();
      setMessage(tr(`Rating komik diperbarui ke ${nextRating} bintang.`, `Comic rating updated to ${nextRating} stars.`));
      setMessageTone('success');
    } catch (error) {
      setMessage(`Gagal menyimpan rating: ${toErrorMessage(error)}`);
      setMessageTone('error');
      setDebugError(toDebugMessage(error));
    }
  };

  const handleComicFavoriteChange = async (comicId: string, favorite: boolean) => {
    const previousComicState = comics;
    const normalizedFavorite = Boolean(favorite);
    setComics((current) => current.map((comic) => (comic.id === comicId ? { ...comic, favorite: normalizedFavorite } : comic)));
    try {
      await updateComic(comicId, { favorite: normalizedFavorite });
      await syncNow();
      setMessage(tr(normalizedFavorite ? 'Komik ditandai sebagai favorit.' : 'Favorit komik dihapus.', normalizedFavorite ? 'Comic marked as favorite.' : 'Comic removed from favorites.'));
      setMessageTone('success');
    } catch (error) {
      setComics(previousComicState);
      setMessage(tr(`Gagal mengubah favorit: ${toErrorMessage(error)}`, `Failed to change favorite: ${toErrorMessage(error)}`));
      setMessageTone('error');
      setDebugError(toDebugMessage(error));
    }
  };

  const saveComicChapter = async (comic: Comic, nextChapter: number) => {
    if (chapterUpdatingComicId) return;
    const normalizedChapter = Math.max(0, Math.floor(nextChapter));
    setChapterUpdatingComicId(comic.id);
    try {
      await setLastReadChapter(comic.id, `Chapter ${normalizedChapter}`);
      if (normalizedChapter > 0 && comic.reading_status === 'wantToRead') {
        await updateComic(comic.id, { readingStatus: 'reading' });
      }
      await syncNow();
      setMessage(tr(`Chapter terakhir "${comic.title}" diperbarui ke ${normalizedChapter}.`, `The last chapter for "${comic.title}" was updated to ${normalizedChapter}.`));
      setMessageTone('success');
    } catch (error) {
      setMessage(tr(`Ubah chapter gagal: ${toErrorMessage(error)}`, `Failed to update chapter: ${toErrorMessage(error)}`));
      setMessageTone('error');
      setDebugError(toDebugMessage(error));
    } finally {
      setChapterUpdatingComicId('');
      setChapterDrafts((current) => {
        const next = { ...current };
        delete next[comic.id];
        return next;
      });
    }
  };

  const handleChapterStep = async (comic: Comic, direction: -1 | 1) => {
    const currentChapter = chapterNumberFromLabel(latestProgressByComic.get(comic.id)?.chapter_label);
    const nextChapter = Math.max(0, currentChapter + direction);
    if (nextChapter === currentChapter) return;
    await saveComicChapter(comic, nextChapter);
  };

  const commitChapterDraft = async (comic: Comic) => {
    const draft = chapterDrafts[comic.id];
    if (draft === undefined || draft.trim() === '') {
      setChapterDrafts((current) => {
        const next = { ...current };
        delete next[comic.id];
        return next;
      });
      return;
    }
    const nextChapter = Number(draft);
    const currentChapter = chapterNumberFromLabel(latestProgressByComic.get(comic.id)?.chapter_label);
    if (!Number.isFinite(nextChapter) || nextChapter < 0 || Math.floor(nextChapter) === currentChapter) {
      setChapterDrafts((current) => {
        const next = { ...current };
        delete next[comic.id];
        return next;
      });
      return;
    }
    await saveComicChapter(comic, nextChapter);
  };

  return {
    latestProgressByComic,
    handleReadingStatusChange,
    handleComicRatingChange,
    handleComicFavoriteChange,
    saveComicChapter,
    handleChapterStep,
    commitChapterDraft,
  };
}
