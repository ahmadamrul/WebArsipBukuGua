import type { LibraryLabel } from '../../features/labels';
import type { SourceEditFormState } from '../../features/sources';

type SetState<T> = (value: T | ((current: T) => T)) => void;

export type PanelActionsDeps = {
  setSourceEditForm: SetState<SourceEditFormState>;
  setOpenPanel: SetState<'comic' | 'source' | 'label' | null>;
  setEditingLabel: SetState<LibraryLabel | null>;
  setLabelForm: SetState<{ name: string; kind: string }>;
};

export function createPanelActions(deps: PanelActionsDeps) {
  const {
    setSourceEditForm,
    setOpenPanel,
    setEditingLabel,
    setLabelForm,
  } = deps;

  const openSourceEdit = (source: { id: string; comic_id: string; label?: string | null; url: string }) => {
    setSourceEditForm({
      id: source.id,
      comicId: source.comic_id,
      label: source.label ?? '',
      url: source.url,
    });
    setOpenPanel('source');
  };

  const openLabelForm = (kind: string = 'collection') => {
    setEditingLabel(null);
    setLabelForm({ name: '', kind });
    setOpenPanel('label');
  };

  const openLabelEdit = (label: LibraryLabel) => {
    setEditingLabel(label);
    setLabelForm({ name: label.name, kind: label.kind });
    setOpenPanel('label');
  };

  return { openSourceEdit, openLabelForm, openLabelEdit };
}
