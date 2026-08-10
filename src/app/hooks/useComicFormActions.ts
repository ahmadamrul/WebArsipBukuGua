import { addComic, updateComic, type Comic, type ComicFormState } from '../../features/comics';
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
import { supabase } from '../../lib/api/supabaseClient';

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

  const handleEditComic = async (target: Comic) => {
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
      coverUrls: target.cover_urls ?? undefined,
      genre: target.genre ?? '',
      collection: target.collection ?? '',
      history: target.history ?? '',
      readingStatus: validReadingStatus(target.reading_status),
    });

    // Fetch all sources directly from Supabase to ensure we have the latest
    let allSources = sources.filter((source) => source.comic_id === target.id);
    try {
      if (supabase) {
        const { data: dbSources } = await supabase
          .from('comic_sources')
          .select('*')
          .eq('comic_id', target.id);
        if (dbSources && dbSources.length > 0) {
          allSources = dbSources as ComicSource[];
        }
      }
    } catch (err) {
      console.warn('Failed to fetch sources from Supabase, using local sources:', err);
    }

    // The comic's original source can live only in the legacy comics.source_url /
    // source_name columns (e.g. comics created before comic_sources rows existed,
    // or imported comics). Merge it in as the first entry unless a comic_sources
    // row already points at the same URL, so it never silently disappears when
    // additional sources are added via the URL checker.
    const legacyUrl = target.source_url?.trim();
    const legacyAlreadyPresent =
      !legacyUrl || allSources.some((source) => normalizeSourceUrl(source.url ?? '') === normalizeSourceUrl(legacyUrl));
    const mergedSources: ComicSourceLink[] = [
      ...(legacyUrl && !legacyAlreadyPresent
        ? [{ id: crypto.randomUUID(), label: target.source_name ?? 'Sumber Utama', url: legacyUrl }]
        : []),
      ...allSources.map((source) => ({ id: source.id, label: source.label ?? '', url: source.url ?? '' })),
    ];

    setComicSourceLinks(
      mergedSources.length > 0
        ? mergedSources
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

        const createdComicId = await addComic({ ...payload, coverStoragePath: undefined });
        if (!createdComicId) throw new Error(tr('Komik gagal dibuat.', 'Comic could not be created.'));
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
        // Check for duplicate sources in other comics during edit
        const persistedSources = sources.filter((source) => source.comic_id === selectedComicId);
        const persistedSourceIds = new Set(persistedSources.map((source) => source.id));
        const submittedSourceIds = new Set(sourceLinks.map((sourceLink) => sourceLink.id).filter(Boolean));
        const newSourceUrls = sourceLinks
          .filter((link) => !persistedSourceIds.has(link.id) && link.url)
          .map((link) => normalizeSourceUrl(link.url))
          .filter(Boolean);

        if (newSourceUrls.length > 0) {
          const duplicateComic = comics.find((comic) => {
            if (comic.id === selectedComicId) return false;
            const urls = [
              comic.source_url,
              ...sources.filter((source) => source.comic_id === comic.id).map((source) => source.url),
            ]
              .map((url) => normalizeSourceUrl(url ?? ''))
              .filter(Boolean);
            return urls.some((url) => newSourceUrls.includes(url));
          });
          if (duplicateComic) {
            setComicPanelNotice(
              tr(
                `Sumber ini sudah terhubung ke "${duplicateComic.title}". Hapus dari komik lain atau gunakan sumber berbeda.`,
                `This source is already linked to "${duplicateComic.title}". Remove it from the other comic or use a different source.`,
              ),
            );
            return;
          }
        }

        await updateComic(selectedComicId, { ...payload, coverUrl: payload.coverUrl || undefined });
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
      setOpenPanel(null);
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
