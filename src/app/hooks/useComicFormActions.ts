import { addComic, updateComic, queueCoverSync, type Comic, type ComicFormState } from '../../features/comics';
import { addComicLabel, removeComicLabel, type ComicLabel, type LibraryLabel } from '../../features/labels';
import { validReadingStatus } from '../../features/reading-progress';
import {
  addComicSource,
  deleteComicSource,
  normalizeSourceUrl,
  updateComicSource,
  type ComicSource,
  type ComicSourceLink,
} from '../../features/sources';
import { toDebugMessage, toErrorMessage } from '../../lib/utils/errors';

type SetState<T> = (value: T | ((current: T) => T)) => void;
export type ComicFormActionsDeps = {
  labels: LibraryLabel[];
  comicLabels: ComicLabel[];
  sources: ComicSource[];  
  comicForm: ComicFormState;
  comicSourceLinks: ComicSourceLink[];
  comicFormTagIds: string[];
  comicFormGenreIds: string[];
  comicFormCollectionIds: string[];
  comics: Comic[];
  formMode: 'create' | 'edit' | null;
  selectedComicId: string;
  setComicForm: SetState<ComicFormState>;
  setComicSourceLinks: SetState<ComicSourceLink[]>;
  setComicFormTagIds: SetState<string[]>;
  setComicFormGenreIds: SetState<string[]>;
  setComicFormCollectionIds: SetState<string[]>;
  setFormMode: SetState<'create' | 'edit' | null>;
  setSelectedComicId: SetState<string>;
  setActiveComicId: SetState<string>;
  setOpenPanel: SetState<'comic' | 'source' | 'label' | null>;
  setComicPanelNotice: SetState<string>;
  setComicFormSaving: SetState<boolean>;
  comicFormSubmitLockRef: React.MutableRefObject<boolean>;
  setMessage: SetState<string>;
  setMessageTone: SetState<'success' | 'error' | 'info' | 'warning'>;
  setDebugError: SetState<string>;
  requestConfirm: (title: string, message: string, confirmLabel?: string, cancelLabel?: string) => Promise<boolean>;
  syncNow: (force?: boolean, options?: { suppressSuccessMessage?: boolean; suppressErrorMessage?: boolean }) => Promise<boolean> | boolean;
  tr: (indonesian: string, english: string) => string;
};

export function createComicFormActions(deps: ComicFormActionsDeps) {
  const {
    labels,
    comicLabels,
    sources,
    comicForm,
    comicSourceLinks,
    comicFormTagIds,
    comicFormGenreIds,
    comicFormCollectionIds,
    comics,
    formMode,
    selectedComicId,
    setComicForm,
    setComicSourceLinks,
    setComicFormTagIds,
    setComicFormGenreIds,
    setComicFormCollectionIds,
    setFormMode,
    setSelectedComicId,
    setActiveComicId,
    setOpenPanel,
    setComicPanelNotice,
    setComicFormSaving,
    comicFormSubmitLockRef,
    setMessage,
    setMessageTone,
    setDebugError,
    requestConfirm,
    syncNow,
    tr,
  } = deps;

  const handleAddComic = async () => {
    setComicForm({ title: '', sourceUrl: '', sourceName: '', coverUrl: '', genre: '', collection: '', history: '', readingStatus: 'wantToRead' });
    setComicFormTagIds([]);
    setComicFormGenreIds([]);
    setComicFormCollectionIds([]);
    setComicSourceLinks([{ id: crypto.randomUUID(), label: '', url: '' }]);
    setComicPanelNotice('');
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
        : [{ id: crypto.randomUUID(), label: target.source_name ?? 'Sumber Utama', url: target.source_url ?? '' }],
    );
    setComicPanelNotice('');
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
    if (comicFormSubmitLockRef.current) return;
    comicFormSubmitLockRef.current = true;
    setComicFormSaving(true);
    const sourceLinks = comicSourceLinks
      .map((link) => ({ ...link, label: link.label.trim(), url: link.url.trim() }))
      .filter((link) => link.url);
    const primarySource = sourceLinks[0] ?? null;
    const selectedGenreNames = labels
      .filter((label) => label.kind === 'genre' && comicFormGenreIds.includes(label.id))
      .map((label) => label.name);
    const selectedCollectionNames = labels
      .filter((label) => label.kind === 'collection' && comicFormCollectionIds.includes(label.id))
      .map((label) => label.name);
    const selectedLabelIds = Array.from(new Set([
      ...comicFormTagIds,
      ...comicFormGenreIds,
      ...comicFormCollectionIds,
    ]));
    const payload = {
      title: comicForm.title.trim(),
      sourceUrl: primarySource?.url ?? comicForm.sourceUrl.trim(),
      sourceName: primarySource?.label || comicForm.sourceName.trim(),
      coverUrl: comicForm.coverUrl.trim(),
      genre: selectedGenreNames.join(', '),
      collection: selectedCollectionNames.join(', '),
      history: comicForm.history.trim(),
      readingStatus: comicForm.readingStatus,
    };
    try {
      if (!payload.title) {
        setComicPanelNotice(tr('Judul komik wajib diisi.', 'Comic title is required.'));
        return;
      }

      if (formMode === 'create') {
        const submittedUrls = new Set(sourceLinks.map((link) => normalizeSourceUrl(link.url)).filter(Boolean));
        const duplicateComic = comics.find((comic) => {
          const urls = [
            comic.source_url,
            ...sources.filter((source) => source.comic_id === comic.id).map((source) => source.url),
          ].map((url) => normalizeSourceUrl(url ?? '')).filter(Boolean);
          return urls.some((url) => submittedUrls.has(url));
        });
        if (duplicateComic) {
          const merge = await requestConfirm(
            tr('Komik sudah ada', 'Comic already exists'),
            tr(
              `Sumber ini sudah terhubung ke "${duplicateComic.title}". Buka komik lama agar tidak membuat duplikat?`,
              `This source is already linked to "${duplicateComic.title}". Open the existing comic to avoid a duplicate?`,
            ),
            tr('Buka komik lama', 'Open existing comic'),
            tr('Batal', 'Cancel'),
          );
          if (merge) {
            setSelectedComicId(duplicateComic.id);
            setActiveComicId(duplicateComic.id);
            setFormMode(null);
            setOpenPanel(null);
          }
          return;
        }

        const createdComicId = await addComic({ ...payload, coverUrl: undefined, coverStoragePath: undefined });
        if (!createdComicId) throw new Error(tr('Komik gagal dibuat.', 'Comic could not be created.'));
        if (payload.coverUrl) {
          await updateComic(createdComicId, { coverUrl: payload.coverUrl });
          queueCoverSync({ comicId: createdComicId, coverUrl: payload.coverUrl, previousStoragePath: '' });
        }
        for (const sourceLink of sourceLinks) {
          await addComicSource({
            comicId: createdComicId,
            label: sourceLink.label || payload.sourceName || 'Sumber',
            url: sourceLink.url,
          });
        }
        for (const labelId of selectedLabelIds) {
          await addComicLabel({ comicId: createdComicId, labelId });
        }
        setSelectedComicId(createdComicId);
        setActiveComicId(createdComicId);
      } else if (formMode === 'edit' && selectedComicId) {
        const previousComic = comics.find((comic) => comic.id === selectedComicId) ?? null;
        await updateComic(selectedComicId, { ...payload, coverUrl: payload.coverUrl || undefined });
        const persistedSources = sources.filter((source) => source.comic_id === selectedComicId);
        const persistedSourceIds = new Set(persistedSources.map((source) => source.id));
        const submittedSourceIds = new Set(sourceLinks.map((sourceLink) => sourceLink.id).filter(Boolean));
        for (const sourceLink of sourceLinks) {
          if (persistedSourceIds.has(sourceLink.id)) {
            await updateComicSource(sourceLink.id, {
              label: sourceLink.label || payload.sourceName || 'Sumber',
              url: sourceLink.url,
            });
          } else {
            await addComicSource({
              comicId: selectedComicId,
              label: sourceLink.label || payload.sourceName || 'Sumber',
              url: sourceLink.url,
            });
          }
        }
        for (const source of persistedSources) {
          if (!submittedSourceIds.has(source.id)) {
            await deleteComicSource(source.id);
          }
        }
        if (payload.coverUrl) {
          queueCoverSync({
            comicId: selectedComicId,
            coverUrl: payload.coverUrl,
            previousStoragePath: previousComic?.cover_storage_path ?? '',
          });
        }
        const currentLabelIds = new Set(comicLabels.filter((link) => link.comic_id === selectedComicId).map((link) => link.label_id));
        for (const labelId of selectedLabelIds) {
          if (!currentLabelIds.has(labelId)) await addComicLabel({ comicId: selectedComicId, labelId });
        }
        for (const labelId of currentLabelIds) {
          if (!selectedLabelIds.includes(labelId)) await removeComicLabel({ comicId: selectedComicId, labelId });
        }
      }

      setMessageTone('success');
      setMessage(formMode === 'create' ? tr('Komik berhasil ditambahkan.', 'Comic added successfully.') : tr('Perubahan komik berhasil disimpan.', 'Comic changes saved successfully.'));
      setComicPanelNotice('');
      setOpenPanel(null);
      setFormMode(null);
      const synced = await syncNow(false, { suppressSuccessMessage: true, suppressErrorMessage: true });
      if (!synced) {
        setMessageTone('warning');
        setMessage(
          tr(
            'Komik tersimpan lokal, tetapi sinkronisasi cloud gagal. Coba sinkronisasi lagi dari sidebar.',
            'The comic was saved locally, but cloud sync failed. Try syncing again from the sidebar.',
          ),
        );
      }
    } catch (error) {
      const message = toErrorMessage(error);
      setComicPanelNotice(`${tr('Gagal menyimpan komik:', 'Failed to save comic:')} ${message}`);
      setMessageTone('error');
      setMessage(`${tr('Gagal menyimpan komik:', 'Failed to save comic:')} ${message}`);
      setDebugError(toDebugMessage(error));
    } finally {
      comicFormSubmitLockRef.current = false;
      setComicFormSaving(false);
    }
  };

  return { handleAddComic, handleEditComic, saveComicForm };
}
