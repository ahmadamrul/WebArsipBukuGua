import { AdultCoverNotice, type Comic } from '../../features/comics';
import { readingStatusLabel } from '../../features/reading-progress';
import type { Locale } from '../../features/settings';
import { formatShortDate } from '../../lib/utils/date';
import type { AppView } from '../routes';

type DashboardBar = { label: string; value: number; accent: string };
type DashboardStat = { label: string; value: string | number; tone: string };
type DashboardActivity = {
  id: string;
  type: string;
  label: string;
  detail: string;
  timestamp: string;
  comic?: Comic | null;
};

type TFunction = typeof import('../../features/settings/services/localization').localeLabels.id;

type AppDashboardProps = {
  locale: Locale;
  t: TFunction;
  tr: (indonesian: string, english: string) => string;
  messageTone: 'info' | 'success' | 'warning' | 'error';
  syncLabel: Record<string, string>;
  syncState: string;
  sessionEmail: string;
  debugError: string;
  dashboardBars: DashboardBar[];
  stats: DashboardStat[];
  recentComics: Comic[];
  dashboardActivities: DashboardActivity[];
  allComics: Comic[];
  shouldHideAdultCover: (comic: Comic | null | undefined) => boolean;
  openComicPage: (comicId: string) => void;
  handleAddComic: () => void;
  setActiveMenu: (value: AppView) => void;
};

export function AppDashboard(props: AppDashboardProps) {
  const {
    locale,
    t,
    tr,
    messageTone,
    syncLabel,
    syncState,
    sessionEmail,
    debugError,
    dashboardBars,
    stats,
    recentComics,
    dashboardActivities,
    allComics,
    shouldHideAdultCover,
    openComicPage,
    handleAddComic,
    setActiveMenu,
  } = props;


  return (
    <section className="dashboard-shell">
      <section className="dashboard-hero panel panel-glow">
        <div className="dashboard-header">
          <div className="dashboard-copy">
            <p className="eyebrow">{t.dashboard}</p>
            <h2>{tr('Arsip buku dan komik', 'Book and comic archive')}</h2>
            <p className="hero-copy">
              {tr('Ringkasan cepat, visual ringan, dan ruang yang lebih lega.', 'A quick overview with clean visuals and more breathing room.')}
            </p>
          </div>
          <div className="dashboard-actions">
            <button type="button" className="primary" onClick={() => handleAddComic()}>
              {tr('+ Tambah komik', '+ Add comic')}
            </button>
          </div>
        </div>
        <div className="dashboard-stats-simple">
          <div className="dashboard-stat-simple">
            <span>{tr('Total Komik', 'Total Comics')}</span>
            <strong>{allComics.length}</strong>
          </div>
        </div>
      </section>
      <section className="dashboard-feed-grid">
        <article className="panel dashboard-feed-panel recent-comics-panel">
          <div className="dashboard-section-head">
            <div>
              <p className="eyebrow">{tr('Library', 'Library')}</p>
              <h3>{tr('Baru ditambahkan', 'Recently added')}</h3>
            </div>
            <button type="button" className="ghost" onClick={() => setActiveMenu('library')}>
              {tr('Lihat semua', 'View all')}
            </button>
          </div>
          <div className="dashboard-comic-strip">
            {recentComics.length === 0 ? (
              <p className="dashboard-empty">{tr('Belum ada komik. Tambahkan komik pertama Anda.', 'No comics yet. Add your first comic.')}</p>
            ) : (
              recentComics.map((comic) => (
                <button type="button" className="dashboard-comic-card" key={comic.id} onClick={() => openComicPage(comic.id)}>
                  <span className={shouldHideAdultCover(comic) ? 'dashboard-comic-cover adult-cover-hidden' : 'dashboard-comic-cover'}>
                    <b>{comic.title.trim().charAt(0).toUpperCase() || '?'}</b>
                    {shouldHideAdultCover(comic) ? (
                      <AdultCoverNotice locale={locale} />
                    ) : comic.cover_url ? (
                      <img src={comic.cover_url} alt="" loading="lazy" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
                    ) : null}
                  </span>
                  <span className="dashboard-comic-copy">
                    <strong>{comic.title}</strong>
                    <small>{readingStatusLabel(comic.reading_status, locale)}</small>
                    <time>{formatShortDate(comic.created_at ?? comic.updated_at, locale)}</time>
                  </span>
                </button>
              ))
            )}
          </div>
        </article>
        <div className="dashboard-side-column">
          <article className="panel dashboard-feed-panel status-summary-panel">
            <div className="dashboard-section-head">
              <h3>{tr('Status Komik', 'Comic Status')}</h3>
            </div>
            <div className="status-summary">
              <div className="status-summary-item want">
                <span>{tr('Ingin dibaca', 'Want to read')}</span>
                <strong>{allComics.filter(c => c.reading_status === 'wantToRead').length}</strong>
              </div>
              <div className="status-summary-item reading">
                <span>{tr('Sedang dibaca', 'Reading')}</span>
                <strong>{allComics.filter(c => c.reading_status === 'reading').length}</strong>
              </div>
              <div className="status-summary-item complete">
                <span>{tr('Tamat', 'Completed')}</span>
                <strong>{allComics.filter(c => c.reading_status === 'completed').length}</strong>
              </div>
              <div className="status-summary-item dropped">
                <span>{tr('Dihentikan', 'Dropped')}</span>
                <strong>{allComics.filter(c => c.reading_status === 'dropped').length}</strong>
              </div>
            </div>
          </article>
          <article className="panel dashboard-feed-panel activity-panel">
          <div className="dashboard-section-head">
            <div>
              <p className="eyebrow">{tr('Aktivitas', 'Activity')}</p>
              <h3>{tr('Aktivitas terbaru', 'Recent activity')}</h3>
            </div>
            <span className="activity-live-dot">{tr('Tersinkron', 'Synced')}</span>
          </div>
          <div className="dashboard-activity-list">
            {dashboardActivities.length === 0 ? (
              <p className="dashboard-empty">{tr('Aktivitas akan muncul setelah komik ditambahkan atau dibaca.', 'Activity will appear after a comic is added or read.')}</p>
            ) : (
              dashboardActivities.map((activity) => (
                <button type="button" className={`dashboard-activity-item type-${activity.type}`} key={activity.id} onClick={() => { if (activity.comic) openComicPage(activity.comic.id); }}>
                  <span className="activity-marker" aria-hidden="true" />
                  <span>
                    <strong>{activity.comic?.title}</strong>
                    <small>{activity.label} · {activity.detail}</small>
                  </span>
                  <time>{formatShortDate(activity.timestamp, locale)}</time>
                </button>
              ))
            )}
          </div>
        </article>
        </div>
      </section>
      <section className={`dashboard-sync-strip tone-${messageTone}`}>
        <div>
          <span>{tr('Status cloud', 'Cloud status')}</span>
          <strong>{syncLabel[syncState]}</strong>
          <p>{tr('Notifikasi tampil sebentar di atas.', 'Notifications appear briefly above.')}</p>
        </div>
        <span className="badge">{sessionEmail || tr('Akun cloud', 'Cloud account')}</span>
        {debugError ? <pre className="debug-box">{debugError}</pre> : null}
      </section>
    </section>
  );
}
