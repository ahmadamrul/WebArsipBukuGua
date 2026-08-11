import { useState } from 'react';
import type { Locale } from '../../features/settings';
import { formatShortDate } from '../../lib/utils/date';
import type { DashboardActivity } from './AppDashboard';

type HistoryFilter = 'all' | 'added' | 'read';

type AppHistoryViewProps = {
  locale: Locale;
  tr: (indonesian: string, english: string) => string;
  historyActivities: DashboardActivity[];
  openComicPage: (comicId: string) => void;
};

export function AppHistoryView({ locale, tr, historyActivities, openComicPage }: AppHistoryViewProps) {
  const [filter, setFilter] = useState<HistoryFilter>('all');

  const filteredActivities = historyActivities.filter((activity) => filter === 'all' || activity.type === filter);

  const filters: Array<{ value: HistoryFilter; label: string }> = [
    { value: 'all', label: tr('Semua', 'All') },
    { value: 'added', label: tr('Ditambahkan', 'Added') },
    { value: 'read', label: tr('Dibaca', 'Read') },
  ];

  return (
    <section className="stack">
      <section className="panel compact-panel history-view">
        <div className="panel-head">
          <div>
            <p className="eyebrow">{tr('Riwayat', 'History')}</p>
            <h3>{tr('Aktivitas library', 'Library activity')}</h3>
          </div>
          <div className="view-switcher" role="group" aria-label={tr('Filter riwayat', 'History filter')}>
            {filters.map((option) => (
              <button
                key={option.value}
                type="button"
                className={filter === option.value ? 'active' : ''}
                onClick={() => setFilter(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="dashboard-activity-list history-activity-list">
          {filteredActivities.length === 0 ? (
            <p className="dashboard-empty">
              {tr('Belum ada aktivitas untuk ditampilkan.', 'No activity to show yet.')}
            </p>
          ) : (
            filteredActivities.map((activity) => (
              <button
                type="button"
                className={`dashboard-activity-item type-${activity.type}`}
                key={activity.id}
                onClick={() => {
                  if (activity.comic) openComicPage(activity.comic.id);
                }}
              >
                <span className="activity-marker" aria-hidden="true" />
                <span>
                  <strong>{activity.comic?.title}</strong>
                  <small>
                    {activity.label} · {activity.detail}
                  </small>
                </span>
                <time>{formatShortDate(activity.timestamp, locale)}</time>
              </button>
            ))
          )}
        </div>
      </section>
    </section>
  );
}
