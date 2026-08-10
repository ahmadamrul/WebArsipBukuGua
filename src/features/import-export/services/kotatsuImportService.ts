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
  // Reading progress
  currentChapter?: string;
  currentPage?: number;
  progressPercent?: number;
  totalChapters?: number;
  // Collections
  categoryId?: number;
  categoryName?: string;
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
  const historyData = loaded.file('history');
  const categoriesData = loaded.file('categories');

  if (!favouritesData) {
    throw new Error('Invalid Kotatsu backup: favourites file not found');
  }

  const favouritesText = await favouritesData.async('text');
  const historyText = historyData ? await historyData.async('text') : null;
  const categoriesText = categoriesData ? await categoriesData.async('text') : null;

  let mangas: KotatsuManga[];
  let history: Array<{ manga_id: number; chapter_id: number; page: number; percent: number; chapters: number }> = [];
  let categories: Array<{ category_id: number; title: string }> = [];

  try {
    mangas = JSON.parse(favouritesText);
  } catch {
    throw new Error('Failed to parse Kotatsu favourites JSON');
  }

  if (historyText) {
    try {
      history = JSON.parse(historyText);
    } catch {
      console.warn('Failed to parse Kotatsu history');
    }
  }

  if (categoriesText) {
    try {
      categories = JSON.parse(categoriesText);
    } catch {
      console.warn('Failed to parse Kotatsu categories');
    }
  }

  if (!Array.isArray(mangas)) {
    throw new Error('Invalid Kotatsu backup format');
  }

  // Build lookup maps
  const historyMap = new Map(history.map((h) => [h.manga_id, h]));
  const categoryMap = new Map(categories.map((c) => [c.category_id, c]));

  return mangas
    .filter((item) => item.manga && item.manga.title && item.manga.public_url)
    .map((item) => {
      const manga = item.manga;
      const coverUrl = manga.large_cover_url || manga.cover_url;
      const tags = Array.isArray(manga.tags) ? manga.tags : [];
      const genres = tags.map((tag) => tag?.title || '').filter(Boolean).join(', ');

      // Get reading progress from history
      const mangaHistory = historyMap.get(manga.id);
      const category = categoryMap.get(item.category_id);

      return {
        title: String(manga.title || '').trim(),
        sourceUrl: String(manga.public_url || ''),
        sourceName: String(manga.source || 'Kotatsu'),
        coverUrl: coverUrl ? String(coverUrl) : null,
        author: String(manga.author || ''),
        genre: genres,
        readingStatus: mapKotatsuState(String(manga.state || '')),
        rating: mapRating(typeof manga.rating === 'number' ? manga.rating : 0),
        nsfw: manga.nsfw === true || manga.content_rating === 'NSFW',
        // Reading progress
        currentChapter: mangaHistory ? String(mangaHistory.chapter_id) : undefined,
        currentPage: mangaHistory?.page,
        progressPercent: mangaHistory?.percent,
        totalChapters: mangaHistory?.chapters,
        // Collections
        categoryId: item.category_id,
        categoryName: category?.title,
      };
    });
}
