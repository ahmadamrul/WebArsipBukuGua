import { addComic, updateComic, queueCoverSync, type Comic, type ComicFormState } from '../../features/comics';
import { type ComicLabel, type LibraryLabel } from '../../features/labels';
import { validReadingStatus } from '../../features/reading-progress';
import { addComicSource, updateComicSource, type ComicSource, type ComicSourceLink } from '../../features/sources';

type SetState<T> = (value: T | ((current: T) => T)) => void;
export type ComicFormActionsDeps = {
  labels: LibraryLabel[];
  comicLabels: ComicLabel[];
  sources: ComicSource[];  
  comicForm: ComicFormState;
  comicSourceLinks: ComicSourceLink[];
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
};

export function createComicFormActions(deps: ComicFormActionsDeps) {
  const {
    labels,
    comicLabels,
    sources,
    comicForm,
    comicSourceLinks,
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
    const sourceLinks = comicSourceLinks
      .map((link) => ({ ...link, label: link.label.trim(), url: link.url.trim() }))
      .filter((link) => link.url);
    const primarySource = sourceLinks[0] ?? null;
    const selectedGenreNames = labels
      .filter((label) => label.kind === 'genre' && comicForm.genre.split(',').some((value) => value.trim() === label.name))
      .map((label) => label.name);
    const selectedCollectionNames = labels
      .filter((label) => label.kind === 'collection' && comicForm.collection.split(',').some((value) => value.trim() === label.name))
      .map((label) => label.name);
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
    if (!payload.title) return;
    if (formMode === 'create') {
      const createdComicId = await addComic({ ...payload, coverUrl: undefined, coverStoragePath: undefined });
      if (createdComicId && payload.coverUrl) {
        await updateComic(createdComicId, { coverUrl: payload.coverUrl });
        queueCoverSync({ comicId: createdComicId, coverUrl: payload.coverUrl, previousStoragePath: '' });
      }
      if (createdComicId && sourceLinks.length > 0) {
        for (const sourceLink of sourceLinks) {
          await addComicSource({
            comicId: createdComicId,
            label: sourceLink.label || payload.sourceName || 'Sumber',
            url: sourceLink.url,
          });
        }
      }
    } else if (formMode === 'edit' && selectedComicId) {
      await updateComic(selectedComicId, { ...payload, coverUrl: payload.coverUrl || undefined });
      for (const sourceLink of sourceLinks) {
        await updateComicSource(sourceLink.id, {
          label: sourceLink.label || payload.sourceName || 'Sumber',
          url: sourceLink.url,
        });
      }
    }
    setOpenPanel(null);
  };

  return { handleAddComic, handleEditComic, saveComicForm };
}
