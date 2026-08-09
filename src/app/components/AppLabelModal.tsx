import type { Dispatch, FormEvent, SetStateAction } from 'react';
import type { LabelFormState, LibraryLabel } from '../../features/labels';

type TFunction = typeof import('../../features/settings/services/localization').localeLabels.id;

type AppLabelModalProps = {
  t: TFunction;
  tr: (indonesian: string, english: string) => string;
  labelForm: LabelFormState;
  editingLabel: LibraryLabel | null;
  setOpenPanel: (value: 'comic' | 'source' | 'label' | null) => void;
  setEditingLabel: Dispatch<SetStateAction<LibraryLabel | null>>;
  setLabelForm: Dispatch<SetStateAction<LabelFormState>>;
  saveLabelForm: (event: FormEvent<HTMLFormElement>) => void;
};

export function AppLabelModal({
  t,
  tr,
  labelForm,
  editingLabel,
  setOpenPanel,
  setEditingLabel,
  setLabelForm,
  saveLabelForm,
}: AppLabelModalProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <form className="modal modal-large" onSubmit={saveLabelForm}>
        <div className="panel-head">
          <div>
            <p className="eyebrow">{tr('Label', 'Label')}</p>
            <h3>{editingLabel ? tr('Edit label', 'Edit label') : tr('Buat label baru', 'Create new label')}</h3>
          </div>
          <button type="button" className="ghost" onClick={() => { setOpenPanel(null); setEditingLabel(null); setLabelForm({ name: '', kind: 'collection' }); }}>
            {t.close}
          </button>
        </div>
        <div className="form-grid">
          <label>
            {tr('Nama label', 'Label name')}
            <input value={labelForm.name} onChange={(event) => setLabelForm((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label>
            {tr('Tipe', 'Type')}
            <select value={labelForm.kind} onChange={(event) => setLabelForm((current) => ({ ...current, kind: event.target.value }))}>
              <option value="collection">{tr('Koleksi', 'Collection')}</option>
              <option value="genre">Genre</option>
              <option value="tag">Tag</option>
            </select>
          </label>
        </div>
        <button className="primary" type="submit">{editingLabel ? t.saveChanges : tr('Simpan Label', 'Save Label')}</button>
      </form>
    </div>
  );
}
