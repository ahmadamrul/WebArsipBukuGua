import { useState, useEffect } from 'react';
import { PasswordRequirements } from '../../features/auth';
import type { AdultContentMode, Locale } from '../../features/settings';
import type { AppView } from '../routes';
import type { SyncState } from '../../lib/types/shared';
import { parseKotatsuBackup } from '../../features/import-export';
import { importLibraryJson, importLibraryBundle, exportLibraryJson, exportLibraryBundle } from '../../lib/libraryService';
import { toErrorMessage } from '../../lib/utils/errors';
import { startBackgroundImport, subscribeToImportProgress, getImportProgress, setReportCallback, type ImportProgress, type ImportReport } from '../../lib/services/backgroundImportService';
import { ImportPreviewModal, type ImportPreviewData } from './ImportPreviewModal';
import { ImportReportModal } from './ImportReportModal';
import { CollectionCreationModal, type CollectionCreationRequest } from './CollectionCreationModal';
import { CoverReplaceModal } from './CoverReplaceModal';
import { URLCheckerPanel, type URLCheckResult } from './URLCheckerPanel';
import { addLabel, updateComic } from '../../lib/libraryService';

type TFunction = typeof import('../../features/settings/services/localization').localeLabels.id;

type AppSettingsPanelsProps = {
  activeMenu: AppView;
  locale: Locale;
  t: TFunction;
  tr: (indonesian: string, english: string) => string;
  profileUsername: string;
  sessionEmail: string;
  profileUsernameInput: string;
  newPassword: string;
  confirmPassword: string;
  profileSaving: boolean;
  syncState: SyncState;
  adultContentMode: AdultContentMode;
  showAdultOnDashboard: boolean;
  labels: Array<{ id: string; name: string; kind: string }>;
  allComics: any[];
  openLabelForm: (kind?: string) => void;
  openLabelEdit: (label: { id: string; name: string; kind: string }) => void;
  handleDeleteLabel: (label: { id: string; name: string; kind: string }) => void;
  setActiveMenu: (value: AppView) => void;
  setLocale: (value: Locale) => void;
  setAdultContentMode: (value: AdultContentMode) => void;
  setShowAdultOnDashboard: (value: boolean | ((current: boolean) => boolean)) => void;
  setProfileUsernameInput: (value: string) => void;
  setNewPassword: (value: string) => void;
  setConfirmPassword: (value: string) => void;
  syncNow: (force?: boolean, options?: { suppressSuccessMessage?: boolean; suppressErrorMessage?: boolean }) => Promise<boolean> | boolean;
  handleLogout: () => Promise<void> | void;
  handleProfileSave: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function AppSettingsPanels(props: AppSettingsPanelsProps) {
  const {
    activeMenu,
    locale,
    t,
    tr,
    profileUsername,
    sessionEmail,
    profileUsernameInput,
    newPassword,
    confirmPassword,
    profileSaving,
    syncState,
    adultContentMode,
    showAdultOnDashboard,
    labels,
    allComics,
    openLabelForm,
    openLabelEdit,
    handleDeleteLabel,
    setActiveMenu,
    setLocale,
    setAdultContentMode,
    setShowAdultOnDashboard,
    setProfileUsernameInput,
    setNewPassword,
    setConfirmPassword,
    syncNow,
    handleLogout,
    handleProfileSave,
  } = props;

  const [importingFile, setImportingFile] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress>(getImportProgress());
  const [previewData, setPreviewData] = useState<ImportPreviewData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [reportData, setReportData] = useState<ImportReport | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [collectionsToCreate, setCollectionsToCreate] = useState<CollectionCreationRequest[]>([]);
  const [showCollectionCreation, setShowCollectionCreation] = useState(false);
  const [creatingCollections, setCreatingCollections] = useState(false);
  const [deadLinkQueue, setDeadLinkQueue] = useState<Array<{ comicId: string; comicTitle: string; failedUrl: string }>>([]);
  const [currentDeadLink, setCurrentDeadLink] = useState<{ comicId: string; comicTitle: string; failedUrl: string } | null>(null);
  const [replacingCover, setReplacingCover] = useState(false);

  useEffect(() => {
    return subscribeToImportProgress((progress) => {
      setImportProgress(progress);
    });
  }, []);

  useEffect(() => {
    setReportCallback((report) => {
      setReportData(report);
      setShowReport(true);
      // Show collection creation prompt if there are new collections
      if (report.newCollections && report.newCollections.length > 0) {
        setCollectionsToCreate(report.newCollections);
        setShowCollectionCreation(true);
      }
      // Queue dead links for one-by-one replacement
      if (report.deadLinks && report.deadLinks.length > 0) {
        const queue = report.deadLinks.map((link) => ({
          comicId: '', // Will need to be set from context
          comicTitle: link.comicTitle,
          failedUrl: link.failedUrl,
        }));
        setDeadLinkQueue(queue);
        if (queue.length > 0) {
          setCurrentDeadLink(queue[0]);
        }
      }
    });
  }, []);

  const handleCreateCollections = async (selectedCollections: CollectionCreationRequest[]) => {
    setCreatingCollections(true);
    try {
      for (const collection of selectedCollections) {
        try {
          await addLabel(collection.kotatsuName, 'collection');
        } catch (err) {
          console.error(`Failed to create collection ${collection.kotatsuName}:`, err);
        }
      }
      setShowCollectionCreation(false);
    } finally {
      setCreatingCollections(false);
    }
  };

  const handleReplaceCover = async (newUrl: string) => {
    if (!currentDeadLink) return;

    setReplacingCover(true);
    try {
      // Note: comicId needs to be fetched from the database based on title
      // For now, we'll just show success and move to next
      console.log(`Would replace cover for "${currentDeadLink.comicTitle}" with ${newUrl}`);

      // Move to next dead link
      const nextIndex = deadLinkQueue.indexOf(currentDeadLink) + 1;
      if (nextIndex < deadLinkQueue.length) {
        setCurrentDeadLink(deadLinkQueue[nextIndex]);
      } else {
        // All done
        setCurrentDeadLink(null);
        setDeadLinkQueue([]);
      }
    } catch (err) {
      console.error('Failed to replace cover:', err);
    } finally {
      setReplacingCover(false);
    }
  };

  const handleSkipDeadLink = () => {
    if (!currentDeadLink) return;

    const nextIndex = deadLinkQueue.indexOf(currentDeadLink) + 1;
    if (nextIndex < deadLinkQueue.length) {
      setCurrentDeadLink(deadLinkQueue[nextIndex]);
    } else {
      // All done
      setCurrentDeadLink(null);
      setDeadLinkQueue([]);
    }
  };

  const handleCheckUrls = async (): Promise<URLCheckResult[]> => {
    const results: URLCheckResult[] = [];

    for (const comic of allComics) {
      if (!comic.cover_url) {
        continue;
      }

      try {
        const response = await fetch(comic.cover_url, { method: 'HEAD' });
        results.push({
          comicId: comic.id,
          comicTitle: comic.title,
          sourceName: comic.source_name || 'Unknown',
          currentUrl: comic.cover_url,
          isAlive: response.ok,
          error: !response.ok ? `HTTP ${response.status}` : undefined,
        });
      } catch (err) {
        results.push({
          comicId: comic.id,
          comicTitle: comic.title,
          sourceName: comic.source_name || 'Unknown',
          currentUrl: comic.cover_url,
          isAlive: false,
          error: toErrorMessage(err),
        });
      }
    }

    return results;
  };

  const handleReplaceUrl = async (comicId: string, newUrl: string) => {
    await updateComic(comicId, { coverUrl: newUrl });
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    const inputEl = event.currentTarget;
    if (!file) return;

    setImportingFile(true);
    try {
      if (file.name.endsWith('.bk.zip')) {
        const kotatsuComics = await parseKotatsuBackup(file);
        // Show preview modal
        setPreviewData({
          comics: kotatsuComics,
          duplicates: 0,
          errors: 0,
          categories: [],
        });
        setShowPreview(true);
      } else if (file.name.endsWith('.json')) {
        const text = await file.text();
        await importLibraryJson(text);
        console.log(tr('Library JSON berhasil diimpor.', 'Library JSON imported successfully.'));
        await syncNow(false, { suppressSuccessMessage: true });
      } else if (file.name.endsWith('.zip')) {
        await importLibraryBundle(file);
        console.log(tr('Library Bundle berhasil diimpor.', 'Library Bundle imported successfully.'));
        await syncNow(false, { suppressSuccessMessage: true });
      } else {
        throw new Error(tr('Format file tidak didukung.', 'File format not supported.'));
      }
    } catch (error) {
      const message = toErrorMessage(error);
      console.error(tr('Gagal mengimpor file:', 'Failed to import file:'), message);
    } finally {
      setImportingFile(false);
      if (inputEl) {
        inputEl.value = '';
      }
    }
  };

  const handleConfirmImport = async () => {
    if (!previewData) return;

    try {
      await startBackgroundImport(previewData.comics);
      setShowPreview(false);
      console.log(tr(`Import dimulai untuk ${previewData.comics.length} komik.`, `Import started for ${previewData.comics.length} comics.`));
    } catch (error) {
      const message = toErrorMessage(error);
      console.error(tr('Gagal memulai import:', 'Failed to start import:'), message);
    }
  };

  const handleExportJson = async () => {
    try {
      const jsonString = await exportLibraryJson();
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `arsip-buku-gua-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(tr('Gagal mengekspor JSON:', 'Failed to export JSON:'), error);
    }
  };

  const handleExportBundle = async () => {
    try {
      const blob = await exportLibraryBundle();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `arsip-buku-gua-bundle-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(tr('Gagal mengekspor Bundle:', 'Failed to export Bundle:'), error);
    }
  };

  const syncLabel: Record<SyncState, string> = {
    'belum-login': tr('Belum login', 'Not logged in'),
    'siap-sync': tr('Siap sinkron', 'Ready to sync'),
    'sedang-sync': tr('Sedang sinkron', 'Syncing'),
    berhasil: tr('Sinkron berhasil', 'Sync succeeded'),
    gagal: tr('Sync gagal', 'Sync failed'),
  };

  return (
    <>
      {activeMenu === 'settings' && (
        <section className="stack">
          <section className="settings-account-grid">
            <article className="panel compact-panel settings-card profile-summary-card">
              <div className="settings-card-icon" aria-hidden="true">
                {(profileUsername || sessionEmail).charAt(0).toUpperCase()}
              </div>
              <div className="settings-card-copy">
                <p className="eyebrow">{tr('Profil', 'Profile')}</p>
                <h3>{profileUsername || tr('Atur username', 'Set username')}</h3>
                <p className="muted">{sessionEmail}</p>
              </div>
              <button type="button" className="secondary" onClick={() => setActiveMenu('profile')}>
                {t.manageProfile}
              </button>
            </article>
            <article className="panel compact-panel settings-card language-settings-card">
              <div className="settings-card-copy">
                <p className="eyebrow">{t.language}</p>
                <h3>{locale === 'id' ? 'Bahasa aplikasi' : 'App language'}</h3>
                <p className="muted">
                  {locale === 'id'
                    ? 'Pilih bahasa tampilan untuk antarmuka aplikasi.'
                    : 'Choose the display language for the app interface.'}
                </p>
              </div>
              <div className="language-toggle" role="group" aria-label={tr('Pilihan bahasa', 'Language selector')}>
                <button
                  type="button"
                  className={locale === 'id' ? 'language-toggle-button active' : 'language-toggle-button'}
                  onClick={() => setLocale('id')}
                >
                  {t.indonesian}
                </button>
                <button
                  type="button"
                  className={locale === 'en' ? 'language-toggle-button active' : 'language-toggle-button'}
                  onClick={() => setLocale('en')}
                >
                  {t.english}
                </button>
              </div>
            </article>
            <article className="panel compact-panel settings-card sync-settings-card">
              <div className="settings-card-copy">
                <p className="eyebrow">{tr('Sinkronisasi', 'Synchronization')}</p>
                <h3>{syncLabel[syncState]}</h3>
                <p className="muted">{tr('Notifikasi singkat akan muncul di atas.', 'Short notifications will appear above.')}</p>
              </div>
              <div className="inline-actions settings-card-actions">
                <button type="button" className="primary" onClick={() => void syncNow(true)}>
                  {t.syncNow}
                </button>
                <button type="button" className="secondary" onClick={handleLogout}>
                  {t.logout}
                </button>
              </div>
            </article>
          </section>
          <section className="panel compact-panel adult-content-settings">
            <div className="adult-content-settings-copy">
              <p className="eyebrow">{tr('Privasi konten', 'Content privacy')}</p>
              <h3>{tr('Tampilan konten dewasa', 'Adult content display')}</h3>
              <p className="muted">
                {tr(
                  'Komik dikenali dari genre dan tag seperti Adult, Hentai, Sex, Explicit, NSFW, atau Nudity. Pilihan ini tersimpan di perangkat.',
                  'Comics are detected from genres and tags such as Adult, Hentai, Sex, Explicit, NSFW, or Nudity. This choice is saved on this device.',
                )}
              </p>
            </div>
            <div className="adult-dashboard-visibility-row">
              <div className="adult-dashboard-visibility-copy">
                <p className="eyebrow">{tr('Visibilitas dashboard', 'Dashboard visibility')}</p>
                <h4>{tr('Tampilkan komik adult di dashboard', 'Show adult comics on the dashboard')}</h4>
                <p className="muted">
                  {showAdultOnDashboard
                    ? tr('Komik adult tetap muncul di dashboard.', 'Adult comics remain visible on the dashboard.')
                    : tr('Komik adult disembunyikan dari dashboard.', 'Adult comics are hidden from the dashboard.')}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={showAdultOnDashboard}
                className={showAdultOnDashboard ? 'dashboard-adult-toggle active' : 'dashboard-adult-toggle'}
                onClick={() => setShowAdultOnDashboard((current) => !current)}
              >
                <span className="dashboard-toggle-track" aria-hidden="true">
                  <i />
                </span>
                <span>{showAdultOnDashboard ? tr('On', 'On') : tr('Off', 'Off')}</span>
              </button>
            </div>
            <div className="adult-content-mode-grid" role="radiogroup" aria-label={tr('Tampilan konten dewasa', 'Adult content display')}>
              {(
                [
                  ['show', tr('Tampilkan semua', 'Show everything')],
                  ['hide-images', tr('Sembunyikan gambar', 'Hide images')],
                  ['hide-comics', tr('Sembunyikan komik', 'Hide comics')],
                ] as const
              ).map(([mode, title]) => (
                <button
                  type="button"
                  role="radio"
                  aria-checked={adultContentMode === mode}
                  className={adultContentMode === mode ? 'adult-content-option active' : 'adult-content-option'}
                  key={mode}
                  onClick={() => setAdultContentMode(mode)}
                >
                  <span className="adult-content-radio" aria-hidden="true" />
                  <span>
                    <strong>{title}</strong>
                  </span>
                </button>
              ))}
            </div>
          </section>
          <section className="panel compact-panel import-manager">
            <div className="panel-head">
              <div>
                <p className="eyebrow">{tr('Impor & Ekspor', 'Import & Export')}</p>
                <h3>{tr('Kelola file library', 'Manage library files')}</h3>
              </div>
            </div>
            <div className="import-grid">
              <label className="import-option" style={{ opacity: importingFile || importProgress.isRunning ? 0.6 : 1, pointerEvents: importingFile || importProgress.isRunning ? 'none' : 'auto' }}>
                <div className="import-icon">
                  {importingFile || importProgress.isRunning ? (
                    <div style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>
                      <svg width="39" height="39" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="#5B8DEF" strokeWidth="2" strokeDasharray="15.7 47.1" />
                      </svg>
                    </div>
                  ) : (
                    <svg width="39" height="39" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="3" y="8" width="18" height="12" rx="2" fill="#5B8DEF" opacity="0.1"/>
                      <path d="M12 5v8M9 10l3-3 3 3" stroke="#5B8DEF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M6 20h12" stroke="#5B8DEF" strokeWidth="1.5"/>
                    </svg>
                  )}
                </div>
                <div>
                  <strong>{importingFile || importProgress.isRunning ? tr('Sedang impor...', 'Importing...') : tr('Impor', 'Import')}</strong>
                  <small>
                    {importProgress.isRunning
                      ? tr(`${importProgress.completed}/${importProgress.total}`, `${importProgress.completed}/${importProgress.total}`)
                      : importingFile
                      ? tr('Tunggu sebentar', 'Please wait')
                      : tr('JSON, ZIP, Kotatsu', 'JSON, ZIP, Kotatsu')}
                  </small>
                </div>
                <input type="file" accept=".json,.zip,.bk.zip" onChange={handleFileImport} disabled={importingFile || importProgress.isRunning} style={{ display: 'none' }} />
              </label>
              <button type="button" className="import-option import-option-json" onClick={handleExportJson}>
                <div className="import-icon">
                  <svg width="39" height="39" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" fill="#276451" opacity="0.1" stroke="#276451" strokeWidth="1.5"/>
                    <text x="12" y="15" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#276451">JSON</text>
                  </svg>
                </div>
                <div>
                  <strong>{tr('Ekspor JSON', 'Export JSON')}</strong>
                  <small>{tr('Data terstruktur', 'Structured data')}</small>
                </div>
              </button>
              <button type="button" className="import-option" onClick={handleExportBundle}>
                <div className="import-icon">
                  <svg width="39" height="39" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 6h18v12c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V6z" fill="#C97C1C" opacity="0.1" stroke="#C97C1C" strokeWidth="1.5"/>
                    <path d="M8 9l-1.5 1.5M13 9l-1.5 1.5M8 14l-1.5 1.5M13 14l-1.5 1.5" stroke="#C97C1C" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <div>
                  <strong>{tr('Ekspor Bundle', 'Export Bundle')}</strong>
                  <small>{tr('Dengan media', 'With media files')}</small>
                </div>
              </button>
            </div>
          </section>
          <URLCheckerPanel
            comics={allComics}
            isChecking={false}
            onCheck={handleCheckUrls}
            onReplace={handleReplaceUrl}
            tr={tr}
          />
          <section className="panel compact-panel label-manager">
            <div className="panel-head">
              <div>
                <p className="eyebrow">{tr('Label', 'Labels')}</p>
                <h3>{tr('Genre, koleksi, dan tag', 'Genres, collections, and tags')}</h3>
              </div>
            </div>
            <div className="label-management-grid">
              {[
                { kind: 'genre', title: 'Genre' },
                { kind: 'collection', title: tr('Koleksi', 'Collection') },
                { kind: 'tag', title: 'Tag' },
              ].map((group) => {
                const groupLabels = labels.filter((label) => label.kind === group.kind);
                return (
                  <section className={`label-group label-group-${group.kind}`} key={group.kind}>
                    <div className="label-group-head">
                      <div>
                        <span className="label-kind-badge">{group.title}</span>
                        <strong>{groupLabels.length} item</strong>
                      </div>
                      <button type="button" className="secondary" onClick={() => openLabelForm(group.kind)}>
                        + {t.add}
                      </button>
                    </div>
                    <div className="label-manage-list">
                      {groupLabels.map((label) => (
                        <article className="label-manage-card" key={label.id}>
                          <div className="label-manage-name">
                            <span aria-hidden="true">{label.name.trim().charAt(0).toUpperCase() || '?'}</span>
                            <div>
                              <strong>{label.name}</strong>
                              <small>{group.title}</small>
                            </div>
                          </div>
                          <div className="label-manage-actions">
                            <button type="button" className="mini-action" onClick={() => openLabelEdit(label)}>
                              Edit
                            </button>
                            <button type="button" className="mini-action danger" onClick={() => handleDeleteLabel(label)}>
                              {tr('Hapus', 'Delete')}
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </section>
        </section>
      )}
      {activeMenu === 'profile' && (
        <section className="profile-page">
          <section className="profile-page-header">
            <div>
              <p className="eyebrow">{tr('Akun', 'Account')}</p>
              <h2>{t.manageProfile}</h2>
            </div>
            <button type="button" className="secondary" onClick={() => setActiveMenu('settings')}>
              {t.backToSettings}
            </button>
          </section>
          <section className="panel compact-panel profile-settings-panel">
            <div className="profile-page-identity">
              <div className="profile-page-avatar">{(profileUsername || sessionEmail).charAt(0).toUpperCase()}</div>
              <div>
                <strong>{profileUsername || tr('Belum ada username', 'No username yet')}</strong>
                <span>{sessionEmail}</span>
              </div>
            </div>
            <form className="profile-form" onSubmit={handleProfileSave}>
              <label>
                Username
                <input value={profileUsernameInput} onChange={(event) => setProfileUsernameInput(event.target.value)} />
              </label>
              <label>
                Email
                <input value={sessionEmail} readOnly aria-readonly="true" />
              </label>
              <div className="profile-password-grid">
                <div className="profile-password-fields">
                  <label>
                    {tr('Password baru', 'New password')}
                    <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
                  </label>
                  <label>
                    {tr('Konfirmasi password', 'Confirm password')}
                    <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
                  </label>
                </div>
                <PasswordRequirements password={newPassword} locale={locale} compact />
              </div>
              <div className="profile-form-actions">
                <button type="button" className="secondary" onClick={() => setProfileUsernameInput(profileUsername)}>
                  {tr('Batalkan perubahan', 'Discard changes')}
                </button>
                <button type="submit" className="primary" disabled={profileSaving}>
                  {profileSaving ? tr('Menyimpan...', 'Saving...') : t.saveChanges}
                </button>
              </div>
            </form>
          </section>
        </section>
      )}
      <ImportPreviewModal
        preview={previewData}
        isOpen={showPreview}
        onConfirm={handleConfirmImport}
        onCancel={() => setShowPreview(false)}
        tr={tr}
      />
      <ImportReportModal
        report={reportData}
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        tr={tr}
      />
      <CollectionCreationModal
        collections={collectionsToCreate}
        isOpen={showCollectionCreation}
        isCreating={creatingCollections}
        onConfirm={handleCreateCollections}
        onSkip={() => setShowCollectionCreation(false)}
        tr={tr}
      />
      {currentDeadLink && (
        <CoverReplaceModal
          request={{
            comicId: currentDeadLink.comicId || '',
            comicTitle: currentDeadLink.comicTitle,
            failedUrl: currentDeadLink.failedUrl,
          }}
          isOpen={!!currentDeadLink && deadLinkQueue.length > 0}
          isProcessing={replacingCover}
          onReplace={handleReplaceCover}
          onSkip={handleSkipDeadLink}
          onClose={() => {
            setCurrentDeadLink(null);
            setDeadLinkQueue([]);
          }}
          tr={tr}
        />
      )}
    </>
  );
}
