import type { ReadingStatus } from './readingStatus';

export type Comic = {
  id: string;
  title: string;
  source_url: string | null;
  source_name: string | null;
  cover_url: string | null;
  cover_storage_path: string | null;
  favorite: boolean;
  genre: string | null;
  collection: string | null;
  history: string | null;
  rating: number | null;
  reading_status: ReadingStatus | null;
  updated_at: string;
  created_at: string;
};

export type ComicSource = {
  id: string;
  comic_id: string;
  label: string | null;
  url: string;
};
