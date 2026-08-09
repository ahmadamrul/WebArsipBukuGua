import type { Dispatch, FormEvent, SetStateAction } from 'react';
import type { Comic, ComicFormState } from '../../features/comics';
import type { LabelFormState, LibraryLabel } from '../../features/labels';
import type { ComicSourceLink, SourceEditFormState, SourceFormState } from '../../features/sources';
import type { Locale } from '../../features/settings';
import { AppConfirmModal } from './AppConfirmModal';
import { AppComicFormModal } from './AppComicFormModal';
import { AppLabelModal } from './AppLabelModal';
import { AppSourceModal } from './AppSourceModal';

type DetectedTitleOption = {
  title: string;
  sourceName: string;
  sourceUrl: string;
};

type ConfirmState = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
};

type TFunction = typeof import('../../features/settings/services/localization').localeLabels.id;

type AppModalsProps = {
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
  openPanel: 'comic' | 'source' | 'label' | null;
  sourceForm: SourceFormState;
  sourceEditForm: SourceEditFormState;
  labelForm: LabelFormState;
  editingLabel: LibraryLabel | null;
  comics: Comic[];
  confirmState: ConfirmState;
  setFormMode: (value: 'create' | 'edit' | null) => void;
  setComicForm: Dispatch<SetStateAction<ComicFormState>>;
  setComicSourceLinks: Dispatch<SetStateAction<ComicSourceLink[]>>;
  setDismissedTitleSuggestion: (value: string) => void;
  setComicFormTagIds: Dispatch<SetStateAction<string[]>>;
  setComicFormCollectionIds: Dispatch<SetStateAction<string[]>>;
  setOpenPanel: (value: 'comic' | 'source' | 'label' | null) => void;
  setSourceForm: Dispatch<SetStateAction<SourceFormState>>;
  setSourceEditForm: Dispatch<SetStateAction<SourceEditFormState>>;
  setLabelForm: Dispatch<SetStateAction<LabelFormState>>;
  setEditingLabel: Dispatch<SetStateAction<LibraryLabel | null>>;
  closeConfirm: (value: boolean) => void;
  saveComicForm: (event: FormEvent<HTMLFormElement>) => void;
  saveSourceForm: (event: FormEvent<HTMLFormElement>) => void;
  saveSourceEditForm: (event: FormEvent<HTMLFormElement>) => void;
  saveLabelForm: (event: FormEvent<HTMLFormElement>) => void;
  handleAddComic: () => void;
  updateComicSourceUrl: (link: ComicSourceLink, value: string) => void;
  pasteComicSourceUrl: (link: ComicSourceLink) => Promise<void> | void;
  checkCoverCandidates: () => Promise<void> | void;
};

export function AppModals(props: AppModalsProps) {
  const {
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
    openPanel,
    sourceForm,
    sourceEditForm,
    labelForm,
    editingLabel,
    confirmState,
    setFormMode,
    setComicForm,
    setComicSourceLinks,
    setDismissedTitleSuggestion,
    setComicFormTagIds,
    setComicFormCollectionIds,
    setOpenPanel,
    setSourceForm,
  setSourceEditForm,
  setLabelForm,
  setEditingLabel,
  closeConfirm,
  saveComicForm,
  saveSourceForm,
  saveSourceEditForm,
  saveLabelForm,
  handleAddComic,
  updateComicSourceUrl,
  pasteComicSourceUrl,
  checkCoverCandidates,
  } = props;

  return (
    <>
      <AppComicFormModal
        locale={locale}
        t={t}
        tr={tr}
        formMode={formMode}
        comicForm={comicForm}
        comicSourceLinks={comicSourceLinks}
        showDetectedTitleOptions={showDetectedTitleOptions}
        availableDetectedTitleOptions={availableDetectedTitleOptions}
        detectedTitleOptionsSignature={detectedTitleOptionsSignature}
        coverCheckState={coverCheckState}
        comicPanelNotice={comicPanelNotice}
        labels={labels}
        tagOptions={tagOptions}
        collectionOptions={collectionOptions}
        comicFormTagIds={comicFormTagIds}
        comicFormCollectionIds={comicFormCollectionIds}
        setFormMode={setFormMode}
        setComicForm={setComicForm}
        setComicSourceLinks={setComicSourceLinks}
        setDismissedTitleSuggestion={setDismissedTitleSuggestion}
        setComicFormTagIds={setComicFormTagIds}
        setComicFormCollectionIds={setComicFormCollectionIds}
        saveComicForm={saveComicForm}
        handleAddComic={handleAddComic}
        updateComicSourceUrl={updateComicSourceUrl}
        pasteComicSourceUrl={pasteComicSourceUrl}
        checkCoverCandidates={checkCoverCandidates}
      />

      {openPanel === 'source' && (
        <AppSourceModal
          t={t}
          tr={tr}
          sourceForm={sourceForm}
          sourceEditForm={sourceEditForm}
          comics={props.comics}
          setOpenPanel={setOpenPanel}
          setSourceForm={setSourceForm}
          setSourceEditForm={setSourceEditForm}
          saveSourceForm={saveSourceForm}
          saveSourceEditForm={saveSourceEditForm}
        />
      )}

      {openPanel === 'label' && (
        <AppLabelModal
          t={t}
          tr={tr}
          labelForm={labelForm}
          editingLabel={editingLabel}
          setOpenPanel={setOpenPanel}
          setEditingLabel={setEditingLabel}
          setLabelForm={setLabelForm}
          saveLabelForm={saveLabelForm}
        />
      )}

      <AppConfirmModal confirmState={confirmState} tr={tr} closeConfirm={closeConfirm} />
    </>
  );
}
