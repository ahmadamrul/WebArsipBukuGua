import { PasswordRequirements } from '../../features/auth';
import type { AdultContentMode, Locale } from '../../features/settings';
import type { AppView } from '../routes';
import type { SyncState } from '../../lib/types/shared';

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
              <label className="import-option">
                <div className="import-icon">
                  <svg width="39" height="39" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v20M2 12h20M6 8l6-6 6 6M6 16l6 6 6-6" />
                  </svg>
                </div>
                <div>
                  <strong>{tr('Impor File', 'Import File')}</strong>
                  <small>{tr('JSON, ZIP, Kotatsu', 'JSON, ZIP, Kotatsu')}</small>
                </div>
                <input type="file" accept=".json,.zip,.bk.zip" style={{ display: 'none' }} />
              </label>
              <button type="button" className="import-option import-option-json">
                <div className="import-icon">
                  <svg width="39" height="39" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  </svg>
                </div>
                <div>
                  <strong>{tr('Ekspor JSON', 'Export JSON')}</strong>
                  <small>{tr('Backup library', 'Backup library')}</small>
                </div>
              </button>
              <button type="button" className="import-option">
                <div className="import-icon">
                  <svg width="39" height="39" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-0.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-0.16.28-0.25.61-0.25.96 0 1.1.9 2 2 2h12v-2H7.42c-0.14 0-0.25-0.11-0.25-0.25l0.03-0.12 0.9-1.63h7.45c0.75 0 1.41-0.41 1.75-1.03l3.58-6.49c0.08-0.14 0.12-0.31 0.12-0.48 0-0.55-0.45-1-1-1H5.21l-0.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s0.89 2 1.99 2 2-0.9 2-2-0.9-2-2-2z" />
                  </svg>
                </div>
                <div>
                  <strong>{tr('Ekspor Bundle', 'Export Bundle')}</strong>
                  <small>{tr('Backup ZIP', 'Backup as ZIP')}</small>
                </div>
              </button>
            </div>
          </section>
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
    </>
  );
}
