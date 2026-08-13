import { useEffect } from 'react';
import { canonicalGenreName, type LibraryLabel } from '../../features/labels';

type SetState<T> = (value: T | ((current: T) => T)) => void;

export type ComicTaxonomySyncDeps = {
  labels: LibraryLabel[];
  comicFormTagIds: string[];
  formMode: 'create' | 'edit' | null;
  setComicFormGenreIds: SetState<string[]>;
  customAdultLabelIds?: string[];
};

export function useComicTaxonomySync({
  labels,
  comicFormTagIds,
  formMode,
  setComicFormGenreIds,
  customAdultLabelIds,
}: ComicTaxonomySyncDeps) {
  useEffect(() => {
    if (!formMode || comicFormTagIds.length === 0) return;
    const customAdultIds = new Set(customAdultLabelIds ?? []);
    if (customAdultIds.size === 0) return;
    const selectedTagsAreAdult = labels.some(
      (label) => label.kind === 'tag' && comicFormTagIds.includes(label.id) && customAdultIds.has(label.id),
    );
    if (!selectedTagsAreAdult) return;
    const adultGenreId = labels.find(
      (label) => label.kind === 'genre' && canonicalGenreName(label.name) === 'adult',
    )?.id;
    if (!adultGenreId) return;
    setComicFormGenreIds((current) =>
      current.includes(adultGenreId) ? current : [...current, adultGenreId],
    );
  }, [comicFormTagIds, formMode, labels, setComicFormGenreIds, customAdultLabelIds]);
}
