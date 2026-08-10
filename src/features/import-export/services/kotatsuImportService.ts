import JSZip from 'jszip';

export interface KotatsuManga {
  manga_id: number;
  category_id: number;
  manga: {
    id: number;
    title: string;
    author: string;
    cover_url: string | null;
    large_cover_url: string | null;
    public_url: string;
    state: string;
    rating: number;
    nsfw: boolean;
    content_rating: string;
    source?: string;
    tags: Array<{
      id: number;
      title: string;
      key: string;
      source: string;
    }>;
  };
}

export interface ImportedKotatsuComic {
  title: string;
  sourceUrl: string;
  sourceName: string;
  coverUrl: string | null;
  author: string;
  genre: string;
  readingStatus: 'wantToRead' | 'reading' | 'finished' | 'paused';
  rating: number | null;
  nsfw: boolean;
}

function mapKotatsuState(kotatsuState: string): 'wantToRead' | 'reading' | 'finished' | 'paused' {
  switch (kotatsuState.toUpperCase()) {
    case 'READING':
      return 'reading';
    case 'FINISHED':
      return 'finished';
    case 'PAUSED':
      return 'paused';
    case 'DROPPED':
      return 'paused';
    default:
      return 'wantToRead';
  }
}

function mapRating(kotatsuRating: number): number | null {
  if (!kotatsuRating || kotatsuRating === 0) return null;
  const normalized = Math.round(kotatsuRating * 5 * 2) / 2;
  return Math.min(5, Math.max(0, normalized));
}

export async function parseKotatsuBackup(file: File): Promise<ImportedKotatsuComic[]> {
  const zip = new JSZip();
  const loaded = await zip.loadAsync(file);

  const favouritesData = loaded.file('favourites');
  if (!favouritesData) {
    throw new Error('Invalid Kotatsu backup: favourites file not found');
  }

  const favouritesText = await favouritesData.async('text');
  let mangas: KotatsuManga[];

  try {
    mangas = JSON.parse(favouritesText);
  } catch {
    throw new Error('Failed to parse Kotatsu favourites JSON');
  }

  if (!Array.isArray(mangas)) {
    throw new Error('Invalid Kotatsu backup format');
  }

  return mangas
    .filter((item) => item.manga && item.manga.title)
    .map((item) => {
      const manga = item.manga;
      const coverUrl = manga.large_cover_url || manga.cover_url;
      const genres = manga.tags.map((tag) => tag.title).join(', ');

      return {
        title: manga.title.trim(),
        sourceUrl: manga.public_url,
        sourceName: manga.source || 'Kotatsu',
        coverUrl: coverUrl || null,
        author: manga.author || '',
        genre: genres,
        readingStatus: mapKotatsuState(manga.state),
        rating: mapRating(manga.rating),
        nsfw: manga.nsfw || manga.content_rating === 'NSFW',
      };
    });
}
