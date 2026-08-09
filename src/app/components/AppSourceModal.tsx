import type { FormEvent, Dispatch, SetStateAction } from 'react';
import type { SourceEditFormState, SourceFormState } from '../../features/sources';
import type { Comic } from '../../features/comics';

type TFunction = typeof import('../../features/settings/services/localization').localeLabels.id;

type AppSourceModalProps = {
  t: TFunction;
  tr: (indonesian: string, english: string) => string;
  sourceForm: SourceFormState;
  sourceEditForm: SourceEditFormState;
  comics: Comic[];
  setOpenPanel: (value: 'comic' | 'source' | 'label' | null) => void;
  setSourceForm: Dispatch<SetStateAction<SourceFormState>>;
  setSourceEditForm: Dispatch<SetStateAction<SourceEditFormState>>;
  saveSourceForm: (event: FormEvent<HTMLFormElement>) => void;
  saveSourceEditForm: (event: FormEvent<HTMLFormElement>) => void;
};

export function AppSourceModal({
  t,
  tr,
  sourceForm,
  sourceEditForm,
  comics,
  setOpenPanel,
  setSourceForm,
  setSourceEditForm,
  saveSourceForm,
  saveSourceEditForm,
}: AppSourceModalProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <form className="modal modal-large" onSubmit={sourceEditForm.id ? saveSourceEditForm : saveSourceForm}>
        <div className="panel-head">
          <div>
            <p className="eyebrow">{tr('Sumber', 'Source')}</p>
            <h3>{sourceEditForm.id ? tr('Edit sumber/link', 'Edit source/link') : tr('Tambah sumber/link komik', 'Add comic source/link')}</h3>
          </div>
          <button type="button" className="ghost" onClick={() => { setOpenPanel(null); setSourceEditForm({ id: '', comicId: '', label: '', url: '' }); }}>
            {t.close}
          </button>
        </div>
        <div className="form-grid">
          {!sourceEditForm.id ? (
            <label>
              {tr('Komik', 'Comic')}
              <select value={sourceForm.comicId} onChange={(event) => setSourceForm((current) => ({ ...current, comicId: event.target.value }))}>
                <option value="">{tr('Pilih komik', 'Select comic')}</option>
                {comics.map((comic) => <option key={comic.id} value={comic.id}>{comic.title}</option>)}
              </select>
            </label>
          ) : null}
          <label>
            {tr('Nama sumber', 'Source name')}
            <input value={sourceEditForm.id ? sourceEditForm.label : sourceForm.label} onChange={(event) => sourceEditForm.id ? setSourceEditForm((current) => ({ ...current, label: event.target.value })) : setSourceForm((current) => ({ ...current, label: event.target.value }))} />
          </label>
          <label>
            {tr('URL sumber', 'Source URL')}
            <input value={sourceEditForm.id ? sourceEditForm.url : sourceForm.url} onChange={(event) => sourceEditForm.id ? setSourceEditForm((current) => ({ ...current, url: event.target.value })) : setSourceForm((current) => ({ ...current, url: event.target.value }))} />
          </label>
        </div>
        <button className="primary" type="submit">{sourceEditForm.id ? t.saveChanges : tr('Simpan Sumber', 'Save Source')}</button>
      </form>
    </div>
  );
}
