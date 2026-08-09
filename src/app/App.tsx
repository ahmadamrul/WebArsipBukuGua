import { useEffect, useState } from 'react';
import { AuthScreen } from '../features/auth';
import {
  deleteComic,
  canRateComic,
  comicTitlesAreRelated,
  removeQueuedCoverSync,
  validComicRating,
  type Comic,
  type ComicFormState,
} from '../features/comics';
import { type ComicLabel, type LabelFormState, type LibraryLabel } from '../features/labels';
import { createSourceLink, normalizeSourceUrl, type ComicSource, type ComicSourceLink, type SourceEditFormState, type SourceFormState } from '../features/sources';
import {
  readingStatusLabel,
  type ReadingProgress,
} from '../features/reading-progress';
import { isUsefulDetectedTitle } from '../features/metadata-detection';
import { localeLabels } from '../features/settings/services/localization';
import { loadLibrary } from './bootstrap/library';
import type { AppView } from './routes';
import { cloudConfigMissing } from '../lib/api/supabaseClient';
import type { SyncState } from '../lib/types/shared';
import { MAX_COMIC_RATING } from '../lib/constants/limits';
import { toDebugMessage } from '../lib/utils/errors';
import { normalizeComparableText } from '../lib/utils/text';
import { AppSidebar } from '../components/layout';
import { NotificationToast } from '../components/common';
import { AppDashboard } from './components/AppDashboard';
import { AppLibraryView } from './components/AppLibraryView';
import { AppComicPanel } from './components/AppComicPanel';
import { AppModals } from './components/AppModals';
import { AppSettingsPanels } from './components/AppSettingsPanels';
import { createComicDraftActions } from './actions/comicDraftActions';
import { createLibraryActions } from './actions/libraryActions';
import { createSessionActions } from './actions/sessionActions';
import {
  createComicFormActions,
  createComicInteractions,
  useComicCoverCheck,
  useComicTaxonomySync,
  createPanelActions,
  useActiveComicView,
  useAppFeedback,
  useLibraryPreferences,
  useLibraryViewData,
  useSessionState,
} from './hooks';

const emptyComicForm: ComicFormState = {
  title: '',
  sourceUrl: '',
  sourceName: '',
  coverUrl: '',
  genre: '',
  collection: '',
  history: '',
  readingStatus: 'wantToRead',
};

const emptySourceForm: SourceFormState = {
  comicId: '',
  label: '',
  url: '',
};

const emptyLabelForm: LabelFormState = {
  name: '',
  kind: 'collection',
};

const emptySourceEditForm: SourceEditFormState = {
  id: '',
  comicId: '',
  label: '',
  url: '',
};

export default function App() {
  const {
    locale,
    setLocale,
    query,
    setQuery,
    selectedGenres,
    setSelectedGenres,
    selectedCollections,
    setSelectedCollections,
    selectedTags,
    setSelectedTags,
    selectedReadingStatus,
    setSelectedReadingStatus,
    selectedFavoriteFilter,
    setSelectedFavoriteFilter,
    sortBy,
    setSortBy,
    viewMode,
    setViewMode,
    adultContentMode,
    setAdultContentMode,
    showAdultOnDashboard,
    setShowAdultOnDashboard,
    activeGenreFilters,
    activeCollectionFilters,
    activeTagFilters,
  } = useLibraryPreferences();
  const {
    setMessage,
    messageTone,
    setMessageTone,
    toastVisible,
    debugError,
    setDebugError,
    confirmState,
    setConfirmState,
    requestConfirmAction: requestConfirm,
    closeConfirm,
    displayMessage,
  } = useAppFeedback(locale, 'Login dulu untuk masuk ke arsip.');
  const {
    ready,
    setReady,
    sessionEmail,
    setSessionEmail,
    profileUsername,
    setProfileUsername,
    profileUsernameInput,
    setProfileUsernameInput,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    profileSaving,
    setProfileSaving,
    setPasswordChangedAt,
    syncState,
    setSyncState,
    loginEmail,
    setLoginEmail,
    loginPassword,
    setLoginPassword,
    showLogin,
    setShowLogin,
    authMode,
    setAuthMode,
    recoveryMode,
    setRecoveryMode,
    recoveryPassword,
    setRecoveryPassword,
    recoveryPasswordConfirm,
    setRecoveryPasswordConfirm,
    forgotPasswordLoading,
    setForgotPasswordLoading,
  } = useSessionState({ setMessage, setMessageTone, setDebugError });
  const [comics, setComics] = useState<Comic[]>([]);
  const [labels, setLabels] = useState<LibraryLabel[]>([]);
  const [comicLabels, setComicLabels] = useState<ComicLabel[]>([]);
  const [sources, setSources] = useState<ComicSource[]>([]);
  const [progresses, setProgresses] = useState<ReadingProgress[]>([]);
  const [chapterUpdatingComicId, setChapterUpdatingComicId] = useState('');
  const [chapterDrafts, setChapterDrafts] = useState<Record<string, string>>({});
  const [descriptionLoadingComicId, setDescriptionLoadingComicId] = useState('');
  const [selectedComicId, setSelectedComicId] = useState('');
  const [comicForm, setComicForm] = useState<ComicFormState>(emptyComicForm);
  const [comicSourceLinks, setComicSourceLinks] = useState<ComicSourceLink[]>([createSourceLink()]);
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [comicPanelNotice, setComicPanelNotice] = useState('');
  const [dismissedTitleSuggestion, setDismissedTitleSuggestion] = useState('');
  const [sourceForm, setSourceForm] = useState<SourceFormState>(emptySourceForm);
  const [labelForm, setLabelForm] = useState<LabelFormState>(emptyLabelForm);
  const [editingLabel, setEditingLabel] = useState<LibraryLabel | null>(null);
  const [sourceEditForm, setSourceEditForm] = useState<SourceEditFormState>(emptySourceEditForm);
  const [comicFormTagIds, setComicFormTagIds] = useState<string[]>([]);
  const [comicFormGenreIds, setComicFormGenreIds] = useState<string[]>([]);
  void comicFormGenreIds;
  const [comicFormCollectionIds, setComicFormCollectionIds] = useState<string[]>([]);
  const [activeComicId, setActiveComicId] = useState('');
  const [openPanel, setOpenPanel] = useState<'comic' | 'source' | 'label' | null>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'source' | 'history' | 'label'>('info');
  const [activeMenu, setActiveMenu] = useState<AppView>('dashboard');
  const t = localeLabels[locale];
  const tr = (indonesian: string, english: string) => (locale === 'id' ? indonesian : english);
  const toast = (
    <NotificationToast message={displayMessage} tone={messageTone} visible={toastVisible} translate={tr} />
  );

  useComicTaxonomySync({
    labels,
    comicFormTagIds,
    formMode,
    setComicFormGenreIds,
  });

  useEffect(() => {
    if (!ready) return;
    loadLibrary()
      .then((snapshot) => {
        setComics(snapshot.comics);
        setLabels(snapshot.labels);
        setComicLabels(snapshot.comicLabels);
        setSources(snapshot.sources);
        setProgresses(snapshot.progresses);
        const firstComicId = snapshot.comics[0]?.id ?? '';
        setSelectedComicId(firstComicId);
        setActiveComicId(firstComicId);
        setMessage('Data cloud berhasil dimuat.');
        setDebugError('');
      })
      .catch((error) => {
        setMessage(`Gagal memuat data cloud: ${String(error)}`);
        setDebugError(toDebugMessage(error));
        setSyncState('gagal');
      });
  }, [ready]);

  const {
    adultComicIds,
    visibleComics,
    filteredComics,
    sortedComics,
    genres,
    collections,
    tags,
    collectionOptions,
    tagOptions,
    stats,
    dashboardBars,
    recentComics,
    dashboardActivities,
    comicTaxonomyNamesForPanel,
    comicTaxonomySummaryForList,
  } = useLibraryViewData({
    comics,
    labels,
    comicLabels,
    progresses,
    query,
    selectedGenres: activeGenreFilters,
    selectedCollections: activeCollectionFilters,
    selectedTags: activeTagFilters,
    selectedReadingStatus,
    selectedFavoriteFilter,
    sortBy,
    adultContentMode,
    showAdultOnDashboard,
    locale,
    tr,
    readingStatusLabel,
  });

  const syncLabel = {
    'belum-login': tr('Belum login', 'Not logged in'),
    'siap-sync': tr('Siap sync', 'Ready to sync'),
    'sedang-sync': tr('Sedang sync', 'Syncing'),
    berhasil: tr('Berhasil', 'Successful'),
    gagal: tr('Gagal', 'Failed'),
  } satisfies Record<SyncState, string>;

  const shouldHideAdultCover = (comic: Comic | null | undefined) =>
    Boolean(comic && adultContentMode === 'hide-images' && adultComicIds.has(comic.id));
  const { login, handleForgotPassword, handleRecoveryPassword, syncNow, handleLogout, handleProfileSave } =
    createSessionActions({
      ready,
      authMode,
      loginEmail,
      loginPassword,
      recoveryPassword,
      recoveryPasswordConfirm,
      profileUsername,
      profileUsernameInput,
      newPassword,
      confirmPassword,
      setReady,
      setSessionEmail,
      setProfileUsername,
      setProfileUsernameInput,
      setPasswordChangedAt,
      setShowLogin,
      setSyncState,
      setProfileSaving,
      setMessage,
      setMessageTone,
      setDebugError,
      setLoginPassword,
      setForgotPasswordLoading,
      setRecoveryMode,
      setRecoveryPassword,
      setRecoveryPasswordConfirm,
      setNewPassword,
      setConfirmPassword,
      setComics,
      setLabels,
      setComicLabels,
      setSources,
      setProgresses,
      setConfirmState,
    });

  const { updateComicSourceUrl, pasteComicSourceUrl } = createComicDraftActions({
    comicForm,
    formMode,
    setComicSourceLinks,
    setComicForm,
    setDismissedTitleSuggestion,
    setComicPanelNotice,
    tr,
  });

  const { handleAddComic, handleEditComic, saveComicForm } = createComicFormActions({
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
  });

  const {
    latestProgressByComic,
    handleReadingStatusChange,
    handleComicRatingChange,
    handleComicFavoriteChange,
    handleChapterStep,
    commitChapterDraft,
  } = createComicInteractions({
    comics,
    progresses,
    chapterDrafts,
    chapterUpdatingComicId,
    setComics,
    setMessage,
    setMessageTone,
    setDebugError,
    setChapterUpdatingComicId,
    setChapterDrafts,
    syncNow,
    tr,
  });

  const ratingOptions = Array.from({ length: MAX_COMIC_RATING + 1 }, (_, index) => index);
  const {
    activeComic,
    activeSources,
    activeLabelLinks,
    openComicPage,
    handleLibraryComicClick,
  } = useActiveComicView({
    visibleComics,
    sources,
    progresses,
    comicLabels,
    selectedComicId,
    activeComicId,
    descriptionLoadingComicId,
    setActiveComicId,
    setSelectedComicId,
    setActiveMenu,
    setDetailTab,
    setDescriptionLoadingComicId,
    syncNow,
  });
  const { detectedTitleOptions, coverCheckState, checkCoverCandidates } = useComicCoverCheck({
    comicSourceLinks,
    comicForm,
    labels,
    formMode,
    openPanel,
    setComicForm,
    setComicSourceLinks,
    setComicFormGenreIds,
    setComicPanelNotice,
    setDebugError,
  });
  const availableDetectedTitleOptions =
    formMode === 'edit'
      ? detectedTitleOptions.filter(
          (option) =>
            isUsefulDetectedTitle(option.title, option.sourceUrl) &&
            !comicTitlesAreRelated(option.title, comicForm.title),
        )
      : [];
  const detectedTitleOptionsSignature = availableDetectedTitleOptions
    .map((option) => `${normalizeSourceUrl(option.sourceUrl)}::${normalizeComparableText(option.title)}`)
    .join('|');
  const showDetectedTitleOptions = Boolean(
    detectedTitleOptionsSignature && detectedTitleOptionsSignature !== dismissedTitleSuggestion,
  );
  const { openSourceEdit, openLabelForm, openLabelEdit } = createPanelActions({
    setSourceEditForm,
    setOpenPanel,
    setEditingLabel,
    setLabelForm,
  });
  const { saveSourceForm, saveSourceEditForm, saveLabelForm, handleDeleteLabel, toggleComicLabel } =
    createLibraryActions({
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
    });

  if (showLogin || !ready) {
    return (
      <AuthScreen
        authMode={authMode}
        cloudConfigMissing={cloudConfigMissing}
        forgotPasswordLoading={forgotPasswordLoading}
        labels={t}
        locale={locale}
        loginEmail={loginEmail}
        loginPassword={loginPassword}
        recoveryMode={recoveryMode}
        recoveryPassword={recoveryPassword}
        recoveryPasswordConfirm={recoveryPasswordConfirm}
        toast={toast}
        onAuthModeChange={setAuthMode}
        onBackToLogin={() => {
          setAuthMode('login');
          setRecoveryMode(false);
          setDebugError('');
          setMessage('Login dulu untuk masuk ke arsip.');
          setMessageTone('info');
        }}
        onEmailChange={setLoginEmail}
        onForgotPassword={() => void handleForgotPassword()}
        onLogin={login}
        onOpenForgotPassword={() => {
          setAuthMode('forgot');
          setRecoveryMode(false);
          setLoginPassword('');
          setMessage('Masukkan email untuk mengirim link reset password.');
          setDebugError('');
        }}
        onPasswordChange={setLoginPassword}
        onRecoveryPasswordChange={setRecoveryPassword}
        onRecoveryPasswordConfirmChange={setRecoveryPasswordConfirm}
        onRecoverySubmit={handleRecoveryPassword}
        translate={tr}
      />
    );
  }
  return (
    <div className="shell">
      {toast}
      <AppSidebar
        activeView={activeMenu}
        debugError={debugError}
        labels={t}
        profileUsername={profileUsername}
        syncLabel={syncLabel[syncState]}
        onLogout={() => void handleLogout()}
        onNavigate={setActiveMenu}
        onSync={() => void syncNow(true)}
        translate={tr}
      />

      <main className="content">
        {activeMenu === 'dashboard' && (
          <AppDashboard
            locale={locale}
            t={t}
            tr={tr}
            messageTone={messageTone}
            syncLabel={syncLabel}
            syncState={syncState}
            sessionEmail={sessionEmail}
            debugError={debugError}
            dashboardBars={dashboardBars}
            stats={stats}
            recentComics={recentComics}
            dashboardActivities={dashboardActivities}
            shouldHideAdultCover={shouldHideAdultCover}
            openComicPage={openComicPage}
            handleAddComic={handleAddComic}
            setActiveMenu={setActiveMenu}
          />
        )}

        {activeMenu === 'library' && (
          <AppLibraryView
            locale={locale}
            t={t}
            tr={tr}
            activeMenu={activeMenu}
            viewMode={viewMode}
            setViewMode={setViewMode}
            sortedComics={sortedComics}
            activeComic={activeComic}
            openComicPage={openComicPage}
            handleLibraryComicClick={handleLibraryComicClick}
            shouldHideAdultCover={shouldHideAdultCover}
            latestProgressByComic={latestProgressByComic}
            chapterUpdatingComicId={chapterUpdatingComicId}
            chapterDrafts={chapterDrafts}
            setChapterDrafts={setChapterDrafts}
            handleChapterStep={handleChapterStep}
            commitChapterDraft={commitChapterDraft}
            handleReadingStatusChange={handleReadingStatusChange}
            handleComicRatingChange={handleComicRatingChange}
            handleEditComic={handleEditComic}
            ratingOptions={ratingOptions}
            labels={labels}
            collections={collections}
            genres={genres}
            tags={tags}
            filteredComics={filteredComics}
            query={query}
            sortBy={sortBy}
            selectedReadingStatus={selectedReadingStatus}
            selectedCollections={selectedCollections}
            selectedGenres={selectedGenres}
            selectedTags={selectedTags}
            selectedFavoriteFilter={selectedFavoriteFilter}
            detailTab={detailTab}
            comicTaxonomyNamesForList={comicTaxonomySummaryForList}
            comicTaxonomyNamesForPanel={comicTaxonomyNamesForPanel}
            validComicRating={validComicRating}
            canRateComic={canRateComic}
            setQuery={setQuery}
            setSortBy={setSortBy}
            setSelectedReadingStatus={setSelectedReadingStatus}
            setSelectedCollections={setSelectedCollections}
            setSelectedGenres={setSelectedGenres}
            setSelectedTags={setSelectedTags}
            setSelectedFavoriteFilter={setSelectedFavoriteFilter}
            setDetailTab={setDetailTab}
            openLabelForm={openLabelForm}
            openSourceEdit={(source) => openSourceEdit({ ...source, comic_id: activeComic?.id ?? '' })}
            toggleComicLabel={toggleComicLabel}
            requestConfirm={requestConfirm}
            syncNow={syncNow}
          />
        )}

        {activeMenu === 'comic' && activeComic && (
          <AppComicPanel
            locale={locale}
            tr={tr}
            activeComic={activeComic}
            activeSources={activeSources}
            activeLabelLinks={activeLabelLinks}
            labels={labels}
            chapterUpdatingComicId={chapterUpdatingComicId}
            chapterDrafts={chapterDrafts}
            ratingOptions={ratingOptions}
            latestProgressByComic={latestProgressByComic}
            descriptionLoadingComicId={descriptionLoadingComicId}
            shouldHideAdultCover={shouldHideAdultCover}
            comicTaxonomyNames={comicTaxonomyNamesForPanel}
            validComicRating={validComicRating}
            canRateComic={canRateComic}
            setActiveMenu={setActiveMenu}
            setDetailTab={setDetailTab}
            setChapterDrafts={setChapterDrafts}
            handleComicFavoriteChange={handleComicFavoriteChange}
            handleEditComic={handleEditComic}
            handleChapterStep={handleChapterStep}
            commitChapterDraft={commitChapterDraft}
            handleReadingStatusChange={handleReadingStatusChange}
            handleComicRatingChange={handleComicRatingChange}
            requestConfirm={requestConfirm}
            deleteComic={deleteComic}
            removeQueuedCoverSync={removeQueuedCoverSync}
            syncNow={syncNow}
            setSelectedComicId={setSelectedComicId}
            setActiveComicId={setActiveComicId}
          />
        )}
        {activeMenu === 'history' && (
          <section className="history-coming-soon panel">
            <div className="history-coming-visual" aria-hidden="true">
              <span className="history-clock-hand" />
              <span className="history-clock-dot" />
            </div>
            <div className="history-coming-copy">
              <p className="eyebrow">{tr('Riwayat', 'History')}</p>
              <span className="history-coming-badge">{tr('Segera hadir', 'Coming soon')}</span>
              <h2>{tr('Riwayat sedang disiapkan', 'History is being prepared')}</h2>
              <p>
                {tr(
                  'Bagian ini belum digunakan sampai alur dan informasi riwayat selesai ditentukan.',
                  'This section will remain unavailable until the history flow and information are finalized.',
                )}
              </p>
              <button type="button" className="secondary" onClick={() => setActiveMenu('dashboard')}>
                {tr('Kembali ke dashboard', 'Back to dashboard')}
              </button>
            </div>
          </section>
        )}

        <AppSettingsPanels
          activeMenu={activeMenu}
          locale={locale}
          t={t}
          tr={tr}
          profileUsername={profileUsername}
          sessionEmail={sessionEmail}
          profileUsernameInput={profileUsernameInput}
          newPassword={newPassword}
          confirmPassword={confirmPassword}
          profileSaving={profileSaving}
          syncState={syncState}
          adultContentMode={adultContentMode}
          showAdultOnDashboard={showAdultOnDashboard}
          labels={labels}
          openLabelForm={openLabelForm}
          openLabelEdit={openLabelEdit}
          handleDeleteLabel={handleDeleteLabel}
          setActiveMenu={setActiveMenu}
          setLocale={setLocale}
          setAdultContentMode={setAdultContentMode}
          setShowAdultOnDashboard={setShowAdultOnDashboard}
          setProfileUsernameInput={setProfileUsernameInput}
          setNewPassword={setNewPassword}
          setConfirmPassword={setConfirmPassword}
          syncNow={syncNow}
          handleLogout={handleLogout}
          handleProfileSave={handleProfileSave}
        />
      </main>
      <AppModals
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
        openPanel={openPanel}
        sourceForm={sourceForm}
        sourceEditForm={sourceEditForm}
        labelForm={labelForm}
        editingLabel={editingLabel}
        comics={comics}
        confirmState={{
          open: confirmState.open,
          title: confirmState.title,
          message: confirmState.message,
          confirmLabel: confirmState.confirmLabel,
          cancelLabel: confirmState.cancelLabel,
        }}
        setFormMode={setFormMode}
        setComicForm={setComicForm}
        setComicSourceLinks={setComicSourceLinks}
        setDismissedTitleSuggestion={setDismissedTitleSuggestion}
        setComicFormTagIds={setComicFormTagIds}
        setComicFormCollectionIds={setComicFormCollectionIds}
        setOpenPanel={setOpenPanel}
        setSourceForm={setSourceForm}
        setSourceEditForm={setSourceEditForm}
        setLabelForm={setLabelForm}
        setEditingLabel={setEditingLabel}
        closeConfirm={closeConfirm}
        saveComicForm={saveComicForm}
        saveSourceForm={saveSourceForm}
        saveSourceEditForm={saveSourceEditForm}
        saveLabelForm={saveLabelForm}
        handleAddComic={handleAddComic}
        updateComicSourceUrl={updateComicSourceUrl}
        pasteComicSourceUrl={pasteComicSourceUrl}
        checkCoverCandidates={checkCoverCandidates}
      />
    </div>
  );
}


