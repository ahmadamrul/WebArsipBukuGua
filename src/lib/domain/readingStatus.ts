export type ReadingStatus = 'wantToRead' | 'reading' | 'completed' | 'dropped';

export const READING_STATUSES: ReadingStatus[] = ['wantToRead', 'reading', 'completed', 'dropped'];

export function readingStatusLabel(status: ReadingStatus | null | undefined, locale: 'id' | 'en') {
  const labels: Record<ReadingStatus, [string, string]> = {
    wantToRead: ['Ingin dibaca', 'Want to read'],
    reading: ['Sedang dibaca', 'Reading'],
    completed: ['Tamat', 'Completed'],
    dropped: ['Dihentikan', 'Dropped'],
  };
  const [indonesian, english] = labels[status as ReadingStatus] ?? labels.wantToRead;
  return locale === 'id' ? indonesian : english;
}

export function validReadingStatus(status: string | null | undefined): ReadingStatus {
  return READING_STATUSES.includes(status as ReadingStatus) ? (status as ReadingStatus) : 'wantToRead';
}
