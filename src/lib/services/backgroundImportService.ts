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
        let { title, sourceUrl, sourceName, coverUrl, genre, author, readingStatus } = comic;

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

        const type = (readingStatus || 'wantToRead') as any;
        await addComic({
          title,
          sourceUrl,
          sourceName,
          coverUrl: coverUrl || undefined,
          genre,
          collection: '',
          history: author ? `Author: ${author}` : '',
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
