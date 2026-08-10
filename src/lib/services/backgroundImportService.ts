import { addComic } from '../../features/comics';
import { detectMetadata } from '../libraryService';
import { toErrorMessage } from '../utils/errors';
import type { ImportedKotatsuComic } from '../../features/import-export';

export interface ImportProgress {
  total: number;
  completed: number;
  failed: number;
  currentComic?: string;
  isRunning: boolean;
  error?: string;
}

export interface CategoryMapping {
  kotatsuCategoryId: number;
  kotatsuCategoryName: string;
  appCollectionId?: string;
  appCollectionName?: string;
  comicsInCategory: number;
  autoMap?: boolean;
}

export interface CoverRecoveryRequest {
  comicTitle: string;
  failedUrl: string;
  newUrl?: string;
  manualInput?: boolean;
}

export type ImportProgressCallback = (progress: ImportProgress) => void;

let currentProgress: ImportProgress = {
  total: 0,
  completed: 0,
  failed: 0,
  isRunning: false,
};

const progressCallbacks = new Set<ImportProgressCallback>();

export function subscribeToImportProgress(callback: ImportProgressCallback) {
  progressCallbacks.add(callback);
  return () => {
    progressCallbacks.delete(callback);
  };
}

function notifyProgress() {
  progressCallbacks.forEach((cb) => cb(currentProgress));
}

export async function startBackgroundImport(comics: ImportedKotatsuComic[]) {
  if (currentProgress.isRunning) {
    throw new Error('Import already running');
  }

  currentProgress = {
    total: comics.length,
    completed: 0,
    failed: 0,
    isRunning: true,
  };
  notifyProgress();

  // Start import in background without awaiting
  importComicsBackground(comics);
}

async function importComicsBackground(comics: ImportedKotatsuComic[]) {
  try {
    for (let i = 0; i < comics.length; i++) {
      const comic = comics[i];
      currentProgress.currentComic = comic.title;
      notifyProgress();

      try {
        let { title, sourceUrl, sourceName, coverUrl, genre, author, readingStatus, currentChapter, currentPage, progressPercent, categoryName } = comic;

        // Auto-detect metadata if missing
        if ((!coverUrl || !genre) && sourceUrl) {
          try {
            const detected = await detectMetadata(sourceUrl);
            if (detected) {
              if (!coverUrl && detected.coverUrl) coverUrl = detected.coverUrl;
              if (!genre && detected.genres && Array.isArray(detected.genres)) {
                genre = detected.genres.join(', ');
              }
            }
          } catch (err) {
            console.warn(`Failed to detect metadata for ${title}:`, err);
          }
        }

        // Build history string with reading progress
        let historyStr = '';
        if (author) historyStr += `Author: ${author}`;
        if (currentChapter) {
          if (historyStr) historyStr += ' | ';
          historyStr += `Chapter: ${currentChapter}`;
        }
        if (currentPage !== undefined) {
          if (historyStr) historyStr += ', ';
          historyStr += `Page: ${currentPage}`;
        }
        if (progressPercent !== undefined) {
          if (historyStr) historyStr += ' (';
          historyStr += `${Math.round(progressPercent * 100)}%`;
          if (progressPercent !== undefined) historyStr += ')';
        }

        const type = (readingStatus || 'wantToRead') as any;
        await addComic({
          title,
          sourceUrl,
          sourceName,
          coverUrl: coverUrl || undefined,
          genre,
          collection: categoryName || '',
          history: historyStr,
          readingStatus: type,
          coverStoragePath: undefined,
        });

        currentProgress.completed++;
      } catch (err) {
        currentProgress.failed++;
        console.error(`Failed to import ${comic.title}:`, err);
      }

      notifyProgress();
    }
  } catch (err) {
    currentProgress.error = toErrorMessage(err);
  } finally {
    currentProgress.isRunning = false;
    notifyProgress();
  }
}

export function getImportProgress(): ImportProgress {
  return { ...currentProgress };
}

export function cancelImport() {
  if (currentProgress.isRunning) {
    currentProgress.isRunning = false;
    currentProgress.error = 'Import cancelled by user';
    notifyProgress();
  }
}

// Category mapping helpers
export function mapKotatsuCategories(kotatsuCategories: Array<{ category_id: number; title: string }>, appCollections: Array<{ id: string; name: string }>): CategoryMapping[] {
  return kotatsuCategories.map((kotatsuCat) => {
    // Try to find matching collection by name similarity
    const matching = appCollections.find(
      (appColl) => appColl.name.toLowerCase().includes(kotatsuCat.title.toLowerCase()) ||
                   kotatsuCat.title.toLowerCase().includes(appColl.name.toLowerCase())
    );

    return {
      kotatsuCategoryId: kotatsuCat.category_id,
      kotatsuCategoryName: kotatsuCat.title,
      appCollectionId: matching?.id,
      appCollectionName: matching?.name,
      comicsInCategory: 0, // Will be updated based on actual comics
      autoMap: !!matching,
    };
  });
}

// Cover recovery callback
export type CoverRecoveryCallback = (request: CoverRecoveryRequest) => Promise<string | null>;
let coverRecoveryCallback: CoverRecoveryCallback | null = null;

export function setCoverRecoveryCallback(callback: CoverRecoveryCallback) {
  coverRecoveryCallback = callback;
}

export async function attemptCoverRecovery(comicTitle: string, failedUrl: string): Promise<string | null> {
  if (!coverRecoveryCallback) {
    console.warn(`No cover recovery callback set for ${comicTitle}`);
    return null;
  }

  return coverRecoveryCallback({
    comicTitle,
    failedUrl,
  });
}
