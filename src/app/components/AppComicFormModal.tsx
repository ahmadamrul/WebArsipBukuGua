import { createSourceLink } from '../../features/sources';
import { READING_STATUSES, readingStatusLabel, type ReadingStatus } from '../../features/reading-progress';
import type { ComicFormState } from '../../features/comics';
import type { ComicSourceLink } from '../../features/sources';
import type { LibraryLabel } from '../../features/labels';
import type { Locale } from '../../features/settings';

type DetectedTitleOption = {
  title: string;
  sourceName: string;
  sourceUrl: string;
};

type TFunction = typeof import('../../features/settings/services/localization').localeLabels.id;

type AppComicFormModalProps = {
  locale: Locale;
  t: TFunction;
  tr: (indonesian: string, english: string) => string;
  formMode: 'create' | 'edit' | null;
  comicForm: ComicFormState;
  comicSourceLinks: ComicSourceLink[];
  showDetectedTitleOptions: boolean;
  availableDetectedTitleOptions: DetectedTitleOption[];
  detectedTitleOptionsSignature: string;
  coverCheckState: {
    loading: boolean;
    title: string;
    sourceName: string;
    coverCandidates: string[];
    coverUrl: string | null;
    genres: string[];
    sourceSizeLabel: string | null;
    optimizedSizeLabel: string | null;
  };
  comicPanelNotice: string;
  labels: LibraryLabel[];
  tagOptions: string[];
  collectionOptions: string[];
  comicFormTagIds: string[];
  comicFormCollectionIds: string[];
  setFormMode: (value: 'create' | 'edit' | null) => void;
  setComicForm: React.Dispatch<React.SetStateAction<ComicFormState>>;
  setComicSourceLinks: React.Dispatch<React.SetStateAction<ComicSourceLink[]>>;
  setDismissedTitleSuggestion: (value: string) => void;
  setComicFormTagIds: React.Dispatch<React.SetStateAction<string[]>>;
  setComicFormCollectionIds: React.Dispatch<React.SetStateAction<string[]>>;
  saveComicForm: (event: React.FormEvent<HTMLFormElement>) => void;
  handleAddComic: () => void;
  updateComicSourceUrl: (link: ComicSourceLink, value: string) => void;
  pasteComicSourceUrl: (link: ComicSourceLink) => Promise<void> | void;
  checkCoverCandidates: () => Promise<void> | void;
};

export function AppComicFormModal({
  locale,
  t,
  tr,
  formMode,
  comicForm,
  comicSourceLinks,
  showDetectedTitleOptions,
  availableDetectedTitleOptions,
  detectedTitleOptionsSignature,
  coverCheckState,
  comicPanelNotice,
  labels,
  tagOptions,
  collectionOptions,
  comicFormTagIds,
  comicFormCollectionIds,
  setFormMode,
  setComicForm,
  setComicSourceLinks,
  setDismissedTitleSuggestion,
  setComicFormTagIds,
  setComicFormCollectionIds,
  saveComicForm,
  handleAddComic,
  updateComicSourceUrl,
  pasteComicSourceUrl,
  checkCoverCandidates,
}: AppComicFormModalProps) {
  if (!formMode) return null;

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="modal modal-large comic-form-modal" onSubmit={saveComicForm}>
        <div className="panel-head comic-form-header">
          <div>
            <p className="eyebrow">{tr('Komik', 'Comic')}</p>
            <h3>{formMode === 'create' ? tr('Tambah komik', 'Add comic') : tr('Edit komik', 'Edit comic')}</h3>
            <p className="muted">
              {formMode === 'create'
                ? tr('Isi data komik baru lalu simpan.', 'Enter the new comic details, then save.')
                : tr('Ubah data komik lalu simpan perubahan.', 'Update the comic details, then save your changes.')}
            </p>
          </div>
          <div className="inline-actions">
            {formMode === 'edit' ? (
              <button type="button" className="secondary" onClick={handleAddComic}>
                {tr('Tambah Baru', 'Add New')}
              </button>
            ) : null}
            <button type="button" className="secondary" onClick={() => setFormMode(null)}>
              {t.close}
            </button>
          </div>
        </div>
        <div className="comic-form-content">
          <label className="comic-title-field">
            {tr('Judul', 'Title')}
            <input
              value={comicForm.title}
              onChange={(event) => setComicForm((current) => ({ ...current, title: event.target.value }))}
            />
          </label>
          {showDetectedTitleOptions ? (
            <section className="detected-title-suggestion" aria-live="polite">
              <div className="detected-title-suggestion-head">
                <span>{tr('Judul baru terdeteksi', 'New title detected')}</span>
                <small>{tr(`Judul saat ini: ${comicForm.title || '-'}`, `Current title: ${comicForm.title || '-'}`)}</small>
              </div>
              <div className="detected-title-option-list">
                {availableDetectedTitleOptions.map((option, index) => (
                  <article className="detected-title-option" key={`${option.sourceUrl}-${index}`}>
                    <div>
                      <span>{option.sourceName || tr(`Sumber ${index + 1}`, `Source ${index + 1}`)}</span>
                      <strong>{option.title}</strong>
                    </div>
                    <button
                      type="button"
                      className="primary"
                      onClick={() => {
                        setComicForm((current) => ({ ...current, title: option.title }));
                        setDismissedTitleSuggestion(detectedTitleOptionsSignature);
                      }}
                    >
                      {tr('Pakai judul ini', 'Use this title')}
                    </button>
                  </article>
                ))}
              </div>
              <button
                type="button"
                className="secondary detected-title-keep"
                onClick={() => setDismissedTitleSuggestion(detectedTitleOptionsSignature)}
              >
                {tr('Pertahankan judul sekarang', 'Keep current title')}
              </button>
            </section>
          ) : null}
          <section className="source-link-list comic-form-section">
            <div className="source-link-list-head">
              <strong>{tr('Sumber per link', 'Sources by link')}</strong>
              <button
                type="button"
                className="secondary compact-button"
                onClick={() => setComicSourceLinks((current) => [...current, createSourceLink()])}
              >
                + {tr('Tambah link', 'Add link')}
              </button>
            </div>
            {comicSourceLinks.map((link, index) => (
              <div className="source-link-row" key={link.id}>
                <label>
                  {tr('Nama sumber', 'Source name')} {index + 1}
                  <input
                    value={link.label}
                    onChange={(event) =>
                      setComicSourceLinks((current) =>
                        current.map((item) => (item.id === link.id ? { ...item, label: event.target.value } : item)),
                      )
                    }
                    placeholder={tr('Sumber 1', 'Source 1')}
                  />
                </label>
                <label>
                  {tr('URL link', 'Link URL')} {index + 1}
                  <div className="source-url-control">
                    <input value={link.url} onChange={(event) => updateComicSourceUrl(link, event.target.value)} placeholder="https://..." />
                    <button type="button" className="secondary source-paste-button" onClick={() => void pasteComicSourceUrl(link)}>
                      {tr('Tempel', 'Paste')}
                    </button>
                  </div>
                </label>
                <button
                  type="button"
                  className="ghost source-link-remove"
                  disabled={comicSourceLinks.length === 1}
                  onClick={() => setComicSourceLinks((current) => current.filter((item) => item.id !== link.id))}
                >
                  {tr('Hapus', 'Remove')}
                </button>
              </div>
            ))}
          </section>
          <section className="comic-form-section comic-metadata-section">
            <div className="comic-metadata-grid">
              <label className="comic-cover-url-field">
                {tr('URL Cover', 'Cover URL')}
                <input
                  type="url"
                  placeholder="https://.../cover.jpg"
                  value={comicForm.coverUrl}
                  onChange={(event) => setComicForm((current) => ({ ...current, coverUrl: event.target.value }))}
                />
              </label>
              <label>
                {tr('Tag', 'Tags')}
                {comicFormTagIds.length > 0 ? ` (${comicFormTagIds.length})` : ''}
                <select
                  value=""
                  onChange={(event) => {
                    const selectedTag = labels.find(
                      (label) => label.kind === 'tag' && label.name === event.target.value,
                    );
                    if (!selectedTag) return;
                    setComicFormTagIds((current) =>
                      current.includes(selectedTag.id)
                        ? current.filter((id) => id !== selectedTag.id)
                        : [...current, selectedTag.id],
                    );
                  }}
                >
                  <option value="">{tr('Pilih atau hapus tag', 'Select or remove tags')}</option>
                  {tagOptions.map((tag) => {
                    const tagId = labels.find((label) => label.kind === 'tag' && label.name === tag)?.id ?? '';
                    const selected = comicFormTagIds.includes(tagId);
                    return <option key={tag} value={tag}>{selected ? `✓ ${tag}` : tag}</option>;
                  })}
                </select>
              </label>
              <label>
                {tr('Koleksi', 'Collections')}
                {comicFormCollectionIds.length > 0 ? ` (${comicFormCollectionIds.length})` : ''}
                <select
                  value=""
                  onChange={(event) => {
                    const selectedCollection = labels.find(
                      (label) => label.kind === 'collection' && label.name === event.target.value,
                    );
                    if (!selectedCollection) return;
                    setComicFormCollectionIds((current) =>
                      current.includes(selectedCollection.id)
                        ? current.filter((id) => id !== selectedCollection.id)
                        : [...current, selectedCollection.id],
                    );
                  }}
                >
                  <option value="">{tr('Pilih atau hapus koleksi', 'Select or remove collections')}</option>
                  {collectionOptions.map((collection) => {
                    const collectionId = labels.find((label) => label.kind === 'collection' && label.name === collection)?.id ?? '';
                    const selected = comicFormCollectionIds.includes(collectionId);
                    return <option key={collection} value={collection}>{selected ? `✓ ${collection}` : collection}</option>;
                  })}
                </select>
              </label>
              <label>
                {tr('Status baca', 'Reading status')}
                <select value={comicForm.readingStatus} onChange={(event) => setComicForm((current) => ({ ...current, readingStatus: event.target.value as ReadingStatus }))}>
                  {READING_STATUSES.map((status) => <option key={status} value={status}>{readingStatusLabel(status, locale)}</option>)}
                </select>
              </label>
            </div>
            <div className="inline-actions comic-cover-actions">
              <button type="button" className="secondary" onClick={checkCoverCandidates} disabled={coverCheckState.loading}>
                {coverCheckState.loading ? tr('Mengecek cover...', 'Checking covers...') : tr('Cek cover', 'Check covers')}
              </button>
            </div>
          </section>
        </div>
        <footer className="comic-form-footer">
          <div className="panel-notice tone-error comic-panel-notice" role="status" aria-live="polite">
            <strong>{t.info}</strong>
            <p>{comicPanelNotice || tr('Tambah lebih dari satu sumber link.', 'Add more than one source link.')}</p>
          </div>
          <button type="submit" className="primary">{formMode === 'create' ? t.saveComic : t.saveChanges}</button>
        </footer>
      </form>
    </div>
  );
}
