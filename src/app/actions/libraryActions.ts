import { addComicLabel, addLabel, deleteLabel, removeComicLabel, updateLabel } from '../../features/labels';
import { addComicSource, updateComicSource } from '../../features/sources';
import type { ComicLabel, LibraryLabel } from '../../features/labels';
import type { LabelFormState } from '../../features/labels';
import type { SourceEditFormState, SourceFormState } from '../../features/sources';

type SetState<T> = (value: T | ((current: T) => T)) => void;

export type LibraryActionsDeps = {
  activeComicId: string;
  comicLabels: ComicLabel[];
  sourceForm: SourceFormState;
  sourceEditForm: SourceEditFormState;
  labelForm: LabelFormState;
  editingLabel: LibraryLabel | null;
  setOpenPanel: SetState<'comic' | 'source' | 'label' | null>;
  setSourceForm: SetState<SourceFormState>;
  setSourceEditForm: SetState<SourceEditFormState>;
  setLabelForm: SetState<LabelFormState>;
  setEditingLabel: SetState<LibraryLabel | null>;
  setMessage: SetState<string>;
  setDebugError: SetState<string>;
  requestConfirm: (title: string, message: string, confirmLabel?: string, cancelLabel?: string) => Promise<boolean>;
  syncNow: (force?: boolean) => Promise<void> | void;
};

export function createLibraryActions(deps: LibraryActionsDeps) {
  const {
    activeComicId,
    comicLabels,
    sourceForm,
    sourceEditForm,
    labelForm,
    editingLabel,
    setOpenPanel,
    setSourceForm,
    setSourceEditForm,
    setLabelForm,
    setEditingLabel,
    setMessage,
    setDebugError,
    requestConfirm,
    syncNow,
  } = deps;

  const saveSourceForm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      if (!sourceForm.comicId || !sourceForm.url.trim()) {
        setMessage('Komik dan URL sumber wajib diisi.');
        return;
      }
      if (!(await requestConfirm('Simpan Sumber?', 'Sumber baru akan ditambahkan dan sumber utama komik ikut diperbarui.'))) return;
      await addComicSource({
        comicId: sourceForm.comicId,
        label: sourceForm.label.trim() || 'Sumber',
        url: sourceForm.url.trim(),
      });
      setOpenPanel(null);
      setSourceForm({ comicId: '', label: '', url: '' });
      await syncNow();
    } catch (error) {
      setMessage(`Simpan sumber gagal: ${String(error)}`);
      setDebugError(String(error));
    }
  };

  const saveSourceEditForm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      if (!sourceEditForm.id || !sourceEditForm.url.trim()) {
        setMessage('URL sumber wajib diisi.');
        return;
      }
      if (!(await requestConfirm('Simpan Perubahan Sumber?', 'Perubahan sumber akan diterapkan.'))) return;
      await updateComicSource(sourceEditForm.id, {
        label: sourceEditForm.label.trim() || 'Sumber',
        url: sourceEditForm.url.trim(),
      });
      setOpenPanel(null);
      setSourceEditForm({ id: '', comicId: '', label: '', url: '' });
      await syncNow();
    } catch (error) {
      setMessage(`Edit sumber gagal: ${String(error)}`);
      setDebugError(String(error));
    }
  };

  const saveLabelForm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      if (!labelForm.name.trim()) {
        setMessage('Nama label wajib diisi.');
        return;
      }
      if (editingLabel) {
        if (!(await requestConfirm('Simpan Perubahan Label?', `Label "${editingLabel.name}" akan diperbarui.`))) return;
        await updateLabel(
          editingLabel.id,
          labelForm.name.trim(),
          labelForm.kind.trim() || 'collection',
          editingLabel.name,
          editingLabel.kind,
        );
      } else {
        if (!(await requestConfirm('Buat Label?', 'Label baru akan ditambahkan ke library.'))) return;
        await addLabel(labelForm.name.trim(), labelForm.kind.trim() || 'collection');
      }
      setOpenPanel(null);
      setLabelForm({ name: '', kind: 'collection' });
      setEditingLabel(null);
      await syncNow();
    } catch (error) {
      setMessage(`Simpan label gagal: ${String(error)}`);
      setDebugError(String(error));
    }
  };

  const handleDeleteLabel = async (label: LibraryLabel) => {
    try {
      if (!(await requestConfirm('Hapus Label?', `Label "${label.name}" dan relasinya pada komik akan dihapus.`))) return;
      await deleteLabel(label.id, label.name, label.kind);
      await syncNow();
    } catch (error) {
      setMessage(`Hapus label gagal: ${String(error)}`);
      setDebugError(String(error));
    }
  };

  const toggleComicLabel = async (labelId: string) => {
    if (!activeComicId) return;
    try {
      const exists = comicLabels.some((link) => link.comic_id === activeComicId && link.label_id === labelId);
      if (!(await requestConfirm(exists ? 'Hapus Label?' : 'Tambah Label?', exists ? 'Label ini akan dilepas dari komik aktif.' : 'Label ini akan ditambahkan ke komik aktif.'))) return;
      if (exists) {
        await removeComicLabel({ comicId: activeComicId, labelId });
      } else {
        await addComicLabel({ comicId: activeComicId, labelId });
      }
      await syncNow();
    } catch (error) {
      setMessage(`Ubah label gagal: ${String(error)}`);
      setDebugError(String(error));
    }
  };

  return { saveSourceForm, saveSourceEditForm, saveLabelForm, handleDeleteLabel, toggleComicLabel };
}
