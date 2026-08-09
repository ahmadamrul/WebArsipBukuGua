import { addComic, findSimilarComic, queueCoverSync, updateComic } from '../../features/comics';
import { addComicSource, normalizeSourceUrl } from '../../features/sources';
import type { ComicLabel, LibraryLabel } from '../../features/labels';
import { detectMetadata, isUsefulDetectedTitle } from '../../features/metadata-detection';
import type { ComicFormState, Comic } from '../../features/comics';
import type { ComicSourceLink } from '../../features/sources';
import { validReadingStatus } from '../../features/reading-progress';

type SetState<T> = (value: T | ((current: T) => T)) => void;

export type ComicFormActionsDeps = {
  comicForm: ComicFormState;
  comicSourceLinks: ComicSourceLink[];
  comicLabels: ComicLabel[];
  labels: LibraryLabel[];
  sources: Array<{ id: string; comic_id: string; label: string | null; url: string }>;
  comics: Comic[];
  formMode: 'create' | 'edit' | null;
  selectedComicId: string;
  dismissedTitleSuggestion: string;
  tr: (indonesian: string, english: string) => string;
  requestConfirm: (title: string, message: string, confirmLabel?: string, cancelLabel?: string) => Promise<boolean>;
  setComicForm: SetState<ComicFormState>;
  setComicSourceLinks: SetState<ComicSourceLink[]>;
  setComicFormTagIds: SetState<string[]>;
  setComicFormGenreIds: SetState<string[]>;
  setComicFormCollectionIds: SetState<string[]>;
  setComicPanelNotice: SetState<string>;
  setDismissedTitleSuggestion: SetState<string>;
  setDetectedTitleOptions: SetState<Array<{ title: string; sourceName: string; sourceUrl: string }>>;
  setSelectedComicId: SetState<string>;
  setActiveComicId: SetState<string>;
  setFormMode: SetState<'create' | 'edit' | null>;
  setOpenPanel: SetState<'comic' | 'source' | 'label' | null>;
  syncNow: (force?: boolean) => Promise<void> | void;
};

export function createComicFormActions(deps: ComicFormActionsDeps) {
  const {
    comicForm,
    comicSourceLinks,
    comicLabels,
    labels,
    sources,
    comics,
    formMode,
    selectedComicId,
    dismissedTitleSuggestion,
    tr,
    requestConfirm,
    setComicForm,
    setComicSourceLinks,
    setComicFormTagIds,
    setComicFormGenreIds,
    setComicFormCollectionIds,
    setComicPanelNotice,
    setDismissedTitleSuggestion,
    setDetectedTitleOptions,
    setSelectedComicId,
    setActiveComicId,
    setFormMode,
    setOpenPanel,
    syncNow,
  } = deps;

  const handleAddComic = async () => {
    setComicForm({
      title: '',
      sourceUrl: '',
      sourceName: '',
      coverUrl: '',
      genre: '',
      collection: '',
      history: '',
      readingStatus: 'wantToRead',
    });
    setComicFormTagIds([]);
    setComicFormGenreIds([]);
    setComicFormCollectionIds([]);
    setComicSourceLinks([{ id: crypto.randomUUID(), label: '', url: '' }]);
    setComicPanelNotice('');
    setDismissedTitleSuggestion('');
    setDetectedTitleOptions([]);
    setFormMode('create');
    setOpenPanel('comic');
  };

  const handleEditComic = (target: Comic) => {
    const targetLabelIds = comicLabels.filter((link) => link.comic_id === target.id).map((link) => link.label_id);
    const selectedIdsForKind = (kind: 'tag' | 'genre' | 'collection', legacyValue = '') => {
      const linkedIds = targetLabelIds.filter((labelId) => labels.some((label) => label.id === labelId && label.kind === kind));
      if (linkedIds.length > 0) return linkedIds;
      const legacyNames = legacyValue.split(',').map((value) => value.trim()).filter(Boolean);
      return labels.filter((label) => label.kind === kind && legacyNames.includes(label.name)).map((label) => label.id);
    };
    setComicForm({
      title: target.title,
      sourceUrl: target.source_url ?? '',
      sourceName: target.source_name ?? '',
      coverUrl: target.cover_url ?? '',
      genre: target.genre ?? '',
      collection: target.collection ?? '',
      history: target.history ?? '',
      readingStatus: validReadingStatus(target.reading_status),
    });
    const relatedSources = sources.filter((source) => source.comic_id === target.id);
    setComicSourceLinks(
      relatedSources.length > 0
        ? relatedSources.map((source) => ({ id: source.id, label: source.label ?? '', url: source.url ?? '' }))
        : [{ id: crypto.randomUUID(), label: '', url: target.source_url ?? '' }],
    );
    setComicPanelNotice('');
    setDismissedTitleSuggestion('');
    setDetectedTitleOptions([]);
    setComicFormTagIds(selectedIdsForKind('tag'));
    setComicFormGenreIds(selectedIdsForKind('genre', target.genre ?? ''));
    setComicFormCollectionIds(selectedIdsForKind('collection', target.collection ?? ''));
    setSelectedComicId(target.id);
    setActiveComicId(target.id);
    setFormMode('edit');
    setOpenPanel('comic');
  };

  const saveComicForm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const sourceLinks = comicSourceLinks.map((link) => ({ ...link, label: link.label.trim(), url: link.url.trim() })).filter((link) => link.url);
    const primarySource = sourceLinks[0] ?? null;
    const selectedGenreNames = labels.filter((label) => label.kind === 'genre' && comicForm.genre.split(',').map((v) => v.trim()).includes(label.name)).map((label) => label.name);
    const selectedCollectionNames = labels.filter((label) => label.kind === 'collection' && comicForm.collection.split(',').map((v) => v.trim()).includes(label.name)).map((label) => label.name);
  let resolvedCoverUrl = comicForm.coverUrl.trim();
    let coverQueued = false;
    let duplicateMergeMessage = '';
    const editingComic = formMode === 'edit' && selectedComicId ? comics.find((comic) => comic.id === selectedComicId) ?? null : null;
    const existingEditSourceUrls = new Set(editingComic ? [editingComic.source_url ?? '', ...sources.filter((source) => source.comic_id === editingComic.id).map((source) => source.url)].map(normalizeSourceUrl).filter(Boolean) : []);
    let detectedReplacementTitle = '';
    if (sourceLinks.length > 0) {
      for (const sourceLink of sourceLinks) {
        try {
          const metadata = await detectMetadata(sourceLink.url);
          if (!resolvedCoverUrl && metadata.coverUrl) resolvedCoverUrl = metadata.coverUrl ?? '';
          if (!comicForm.history && metadata.description) comicForm.history = metadata.description;
          if (!comicForm.sourceName) comicForm.sourceName = sourceLink.label || metadata.sourceName;
          if (!comicForm.title || formMode === 'create') comicForm.title = metadata.title;
          const isNewEditSource = formMode === 'edit' && !existingEditSourceUrls.has(normalizeSourceUrl(sourceLink.url));
          if (!detectedReplacementTitle && isNewEditSource && isUsefulDetectedTitle(metadata.title, sourceLink.url) && !dismissedTitleSuggestion && !comicForm.title) {
            detectedReplacementTitle = metadata.title.trim();
          }
        } catch {}
      }
    }
    if (formMode === 'edit' && detectedReplacementTitle) {
      const replaceTitle = await requestConfirm(tr('Nama komik baru terdeteksi', 'New comic title detected'), tr(`Sumber baru mendeteksi judul "${detectedReplacementTitle}". Ganti nama "${comicForm.title}" ke judul tersebut?`, `The new source detected "${detectedReplacementTitle}". Replace "${comicForm.title}" with this title?`), tr('Ganti nama', 'Replace title'), tr('Pertahankan', 'Keep current'));
      if (replaceTitle) comicForm.title = detectedReplacementTitle;
    }
    if (formMode === 'create') {
      const similarComic = findSimilarComic(comicForm.title, comics);
      if (similarComic) {
        const shouldMerge = await requestConfirm(tr('Komik serupa sudah ada', 'A similar comic already exists'), tr(`Judul ini mirip dengan "${similarComic.comic.title}". Tambahkan URL dan label baru ke komik tersebut agar tidak membuat duplikat?`, `This title is similar to "${similarComic.comic.title}". Add the new URLs and labels to that comic to avoid a duplicate?`), tr('Tambahkan ke komik lama', 'Add to existing comic'), tr('Batal', 'Cancel'));
        if (!shouldMerge) return;
        for (const sourceLink of sourceLinks) {
          await addComicSource({ comicId: similarComic.comic.id, label: sourceLink.label || comicForm.sourceName || 'Sumber', url: sourceLink.url });
        }
        setSelectedComicId(similarComic.comic.id);
        setActiveComicId(similarComic.comic.id);
      } else {
        const createdComicId = await addComic({ title: comicForm.title.trim(), sourceUrl: primarySource?.url ?? comicForm.sourceUrl.trim(), sourceName: primarySource?.label || comicForm.sourceName.trim(), coverUrl: undefined, coverStoragePath: undefined, genre: selectedGenreNames.join(', '), collection: selectedCollectionNames.join(', '), history: comicForm.history.trim(), readingStatus: comicForm.readingStatus });
        if (createdComicId && resolvedCoverUrl) {
          await updateComic(createdComicId, { coverUrl: resolvedCoverUrl });
          queueCoverSync({ comicId: createdComicId, coverUrl: resolvedCoverUrl, previousStoragePath: '' });
          coverQueued = true;
        }
      }
    }
    setOpenPanel(null);
    setFormMode(null);
    setComicPanelNotice('');
    await syncNow();
    if (duplicateMergeMessage) setComicPanelNotice(duplicateMergeMessage + (coverQueued ? ' Cover masuk antrean lokal untuk sinkronisasi.' : ''));
  };

  return { handleAddComic, handleEditComic, saveComicForm };
}
