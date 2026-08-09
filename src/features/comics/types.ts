import type { ReadingStatus } from '../../lib/domain/readingStatus';

export type { Comic } from '../../lib/domain/comic';
export type { ComicInput } from '../../lib/types/api';

export type ComicFormState = {
  title: string;
  sourceUrl: string;
  sourceName: string;
  coverUrl: string;
  genre: string;
  collection: string;
  history: string;
  readingStatus: ReadingStatus;
};

export type PendingCoverSync = {
  comicId: string;
  coverUrl: string;
  previousStoragePath: string;
};
