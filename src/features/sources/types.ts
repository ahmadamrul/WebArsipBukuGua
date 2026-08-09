export type { ComicSource } from '../../lib/domain/comic';
export type { ComicSourceInput, ComicSourceUpdateInput } from '../../lib/types/api';

export type ComicSourceLink = {
  id: string;
  label: string;
  url: string;
};

export type SourceFormState = {
  comicId: string;
  label: string;
  url: string;
};

export type SourceEditFormState = SourceFormState & { id: string };
