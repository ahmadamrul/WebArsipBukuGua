import type { Comic, ComicSource } from '../domain/comic';
import type { ComicLabel, LibraryLabel } from '../domain/label';
import type { ReadingStatus } from '../domain/readingStatus';
import type { PublicationItem, PublicationKind, ReadingProgress } from './shared';

export type SessionInfo = {
  id: string;
  email: string;
  username: string;
  passwordChangedAt: string | null;
};

export type LibrarySnapshot = {
  comics: Comic[];
  labels: LibraryLabel[];
  comicLabels: ComicLabel[];
  sources: ComicSource[];
  progresses: ReadingProgress[];
};

export type ComicInput = {
  title: string;
  sourceUrl?: string;
  sourceName?: string;
  coverUrl?: string;
  coverUrls?: string[] | null;
  coverStoragePath?: string;
  favorite?: boolean;
  genre?: string;
  collection?: string;
  history?: string;
  rating?: number;
  readingStatus?: ReadingStatus;
};

export type ComicSourceInput = {
  comicId: string;
  label: string;
  url: string;
};

export type ComicSourceUpdateInput = {
  label?: string;
  url?: string;
};

export type ComicLabelInput = {
  comicId: string;
  labelId: string;
};

export type DetectedMetadata = {
  title: string;
  sourceName: string;
  description: string | null;
  coverUrl: string | null;
  coverCandidates: string[];
  genres: string[];
  sourceSizeLabel?: string | null;
  optimizedSizeLabel?: string | null;
};

export type PublicationPreview = {
  items: PublicationItem[];
  kind: PublicationKind;
  title: string;
};
