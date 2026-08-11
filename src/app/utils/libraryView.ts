import type { Comic } from '../../features/comics';
import type { LibraryLabel } from '../../features/labels';
import type { ReadingProgress, ReadingStatus } from '../../features/reading-progress';

export function comicTaxonomyNames(
  comic: Comic,
  kind: 'genre' | 'collection' | 'tag',
  labels: LibraryLabel[],
  comicLabels: Array<{ comic_id: string; label_id: string }>,
) {
  const legacyNames = kind === 'genre' ? (comic.genre ?? '') : '';
  const linkedLabelIds = new Set(
    comicLabels.filter((link) => link.comic_id === comic.id).map((link) => link.label_id),
  );
  return Array.from(
    new Set(
      [
        ...legacyNames.split(','),
        ...labels
          .filter((label) => label.kind === kind && linkedLabelIds.has(label.id))
          .map((label) => label.name),
      ]
        .map((value) => value.trim())
        .filter((value) => value && /[\p{L}\p{N}]/u.test(value)),
    ),
  );
}

export function comicTaxonomySummary(
  comic: Comic,
  labels: LibraryLabel[],
  comicLabels: Array<{ comic_id: string; label_id: string }>,
  translate: (indonesian: string, english: string) => string,
) {
  const genreText = comicTaxonomyNames(comic, 'genre', labels, comicLabels).join(', ');
  const collectionText = comicTaxonomyNames(comic, 'collection', labels, comicLabels).join(', ');
  if (!genreText && !collectionText) {
    return `${translate('Tanpa genre', 'No genre')} · ${translate('Tanpa koleksi', 'No collection')}`;
  }
  return [genreText, collectionText].filter(Boolean).join(' · ');
}

export function buildDashboardStats(args: {
  comics: Comic[];
  labels: LibraryLabel[];
  readingStatusLabel: (status: ReadingStatus, locale: 'id' | 'en') => string;
  locale: 'id' | 'en';
  tr: (indonesian: string, english: string) => string;
}) {
  const { comics, labels, tr } = args;
  return [
    { label: tr('Komik', 'Comics'), value: String(comics.length), tone: 'blue' },
    { label: tr('Label', 'Labels'), value: String(labels.length), tone: 'mint' },
    {
      label: tr('Sedang dibaca', 'Reading'),
      value: String(comics.filter((comic) => comic.reading_status === 'reading').length),
      tone: 'amber',
    },
    {
      label: tr('Tamat', 'Completed'),
      value: String(comics.filter((comic) => comic.reading_status === 'completed').length),
      tone: 'coral',
    },
  ];
}

export function buildDashboardBars(args: {
  dashboardComics: Comic[];
  labels: LibraryLabel[];
  dashboardProgresses: ReadingProgress[];
  tr: (indonesian: string, english: string) => string;
}) {
  const { dashboardComics, labels, dashboardProgresses, tr } = args;
  return [
    { label: tr('Komik', 'Comics'), value: dashboardComics.length, accent: 'linear-gradient(180deg, #8bb8ff, #d8ecff)' },
    { label: tr('Riwayat baca', 'Reading history'), value: dashboardProgresses.length, accent: 'linear-gradient(180deg, #aacb7d, #eef7d8)' },
  ];
}

export function buildRecentComics(dashboardComics: Comic[]) {
  return [...dashboardComics]
    .sort(
      (left, right) =>
        new Date(right.created_at ?? right.updated_at).getTime() -
        new Date(left.created_at ?? left.updated_at).getTime(),
    )
    .slice(0, 14);
}

export function buildDashboardActivities(args: {
  dashboardComics: Comic[];
  dashboardProgresses: ReadingProgress[];
  locale: 'id' | 'en';
  tr: (indonesian: string, english: string) => string;
  readingStatusLabel: (status: ReadingStatus, locale: 'id' | 'en') => string;
  limit?: number;
}) {
  const { dashboardComics, dashboardProgresses, locale, tr, readingStatusLabel, limit = 7 } = args;
  const activities = [
    ...dashboardComics.map((comic) => ({
      id: `comic-${comic.id}`,
      comic,
      type: 'added' as const,
      label: tr('Komik ditambahkan', 'Comic added'),
      detail: readingStatusLabel(comic.reading_status ?? 'wantToRead', locale),
      timestamp: comic.created_at ?? comic.updated_at,
    })),
    ...dashboardProgresses.map((progress) => {
      const comic = dashboardComics.find((item) => item.id === progress.comic_id);
      return {
        id: `progress-${progress.id}`,
        comic,
        type: 'read' as const,
        label: tr('Posisi baca diperbarui', 'Reading position updated'),
        detail: progress.chapter_label ?? tr('Chapter tidak dicatat', 'Chapter not recorded'),
        timestamp: progress.updated_at,
      };
    }),
  ]
    .filter((activity) => activity.comic)
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());
  return activities.slice(0, limit);
}
