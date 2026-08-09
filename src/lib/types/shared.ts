export type SyncState = 'belum-login' | 'siap-sync' | 'sedang-sync' | 'berhasil' | 'gagal';

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
