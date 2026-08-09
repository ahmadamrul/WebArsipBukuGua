import type { AppView } from '../../app/routes';

type SidebarLabels = {
  collection: string;
  dashboard: string;
  history: string;
  logout: string;
  settings: string;
  syncNow: string;
};

type AppSidebarProps = {
  activeView: AppView;
  debugError: string;
  labels: SidebarLabels;
  profileUsername: string;
  syncLabel: string;
  onLogout: () => void;
  onNavigate: (view: AppView) => void;
  onSync: () => void;
  translate: (indonesian: string, english: string) => string;
};

export function AppSidebar({
  activeView,
  debugError,
  labels,
  profileUsername,
  syncLabel,
  onLogout,
  onNavigate,
  onSync,
  translate,
}: AppSidebarProps) {
  return (
    <aside className="sidebar">
      <button
        type="button"
        className="brand brand-profile-button"
        onClick={() => onNavigate('profile')}
        aria-label={translate('Buka pengaturan profil', 'Open profile settings')}
      >
        <img className="brand-mark" src="/app-icon.png" alt="" aria-hidden="true" />
        <div>
          <p className="eyebrow">Arsip Buku Gua</p>
          <h1>{profileUsername || translate('Atur username', 'Set username')}</h1>
        </div>
      </button>

      <nav className="menu" aria-label={translate('Navigasi utama', 'Main navigation')}>
        <button
          type="button"
          className={activeView === 'dashboard' ? 'menu-item active' : 'menu-item'}
          onClick={() => onNavigate('dashboard')}
        >
          {labels.dashboard}
        </button>
        <button
          type="button"
          className={activeView === 'history' ? 'menu-item active' : 'menu-item'}
          onClick={() => onNavigate('history')}
        >
          {labels.history}
        </button>
        <button
          type="button"
          className={activeView === 'library' || activeView === 'comic' ? 'menu-item active' : 'menu-item'}
          onClick={() => onNavigate('library')}
        >
          {labels.collection}
        </button>
        <button
          type="button"
          className={activeView === 'settings' ? 'menu-item active' : 'menu-item'}
          onClick={() => onNavigate('settings')}
        >
          {labels.settings}
        </button>
      </nav>

      <section className="sidebar-card card-accent">
        <span className="pill">{syncLabel}</span>
        {debugError ? <pre className="debug-box">{debugError}</pre> : null}
        <div className="stack-actions">
          <button type="button" className="primary" onClick={onSync}>
            {labels.syncNow}
          </button>
          <button type="button" className="secondary" onClick={onLogout}>
            {labels.logout}
          </button>
        </div>
      </section>
    </aside>
  );
}
