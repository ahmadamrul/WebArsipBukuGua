export type SyncState = 'belum-login' | 'siap-sync' | 'sedang-sync' | 'berhasil' | 'gagal';

export type Comic = {
  id: string;
  title: string;
  source_url: string | null;
  source_name: string | null;
  cover_url: string | null;
  genre: string | null;
  collection: string | null;
  progress: number;
  history: string | null;
  updated_at: string;
};

export type LibraryLabel = {
  id: string;
  name: string;
  kind: string;
};

export type ComicSource = {
  id: string;
  comic_id: string;
  label: string | null;
  url: string;
};

export type ComicLabel = {
  comic_id: string;
  label_id: string;
};

export type PublicationKind = 'image' | 'pdf' | 'text' | 'epub' | 'zip' | 'unknown';

export type PublicationItem = {
  name: string;
  kind: PublicationKind;
  url: string;
};

export type ReadingProgress = {
  id: string;
  comic_id: string;
  chapter_label: string | null;
  page_index: number;
  note: string | null;
  updated_at: string;
};
