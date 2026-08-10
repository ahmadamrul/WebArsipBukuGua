import { addComic } from '../../features/comics';
import { detectMetadata } from '../libraryService';
import { toErrorMessage } from '../utils/errors';
import type { ImportedKotatsuComic } from '../../features/import-export';

export interface ImportProgress {
  total: number;
  completed: number;
  failed: number;
  skipped: number;
  currentComic?: string;
  isRunning: boolean;
  error?: string;
}

export interface DeadLinkRequest {
  comicTitle: string;
  failedUrl: string;
  action?: 'ask' | 'skip' | 'retry';
}

export interface CollectionRequest {
  kotatsuName: string;
  comicCount: number;
  action?: 'create' | 'skip';
}

export interface ImportReport {
  total: number;
  successful: number;
  skipped: number;
  failed: number;
  failedComics: Array<{ title: string; reason: string }>;
  deadLinks: DeadLinkRequest[];
  newCollections: CollectionRequest[];
  duration: number;
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
  skipped: 0,
  isRunning: false,
};

let currentReport: ImportReport | null = null;
const progressCallbacks = new Set<ImportProgressCallback>();
let reportCallback: ((report: ImportReport) => void) | null = null;

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
    skipped: 0,
    isRunning: true,
  };
  currentReport = null;
  notifyProgress();

  // Start import in background without awaiting
  importComicsBackground(comics);
}

async function importComicsBackground(comics: ImportedKotatsuComic[]) {
  const startTime = Date.now();
  const failedComics: Array<{ title: string; reason: string }> = [];
  const deadLinks: DeadLinkRequest[] = [];
  const newCollections: Map<string, number> = new Map(); // categoryName -> comicCount

  try {
    for (let i = 0; i < comics.length; i++) {
      const comic = comics[i];
      currentProgress.currentComic = comic.title;
      notifyProgress();

      try {
        let { title, sourceUrl, sourceName, coverUrl, genre, author, readingStatus, currentChapter, currentPage, progressPercent, categoryName } = comic;

        // Track new collections
        if (categoryName) {
          newCollections.set(categoryName, (newCollections.get(categoryName) ?? 0) + 1);
        }

        // Auto-detect metadata if missing (skip if we have both)
        if ((!coverUrl || !genre) && sourceUrl) {
          try {
            // Only detect if we're missing critical data
            if (!coverUrl || !genre) {
              const detected = await detectMetadata(sourceUrl);
              if (detected) {
                if (!coverUrl && detected.coverUrl) coverUrl = detected.coverUrl;
                if (!genre && detected.genres && Array.isArray(detected.genres)) {
                  genre = detected.genres.join(', ');
                }
              }
            }
          } catch (err) {
            console.warn(`Failed to detect metadata for ${title}:`, err);
            // Continue without metadata - don't fail the entire import
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
        const reason = toErrorMessage(err);
        failedComics.push({ title: comic.title, reason });
        currentProgress.failed++;
        console.error(`Failed to import ${comic.title}:`, err);
      }

      notifyProgress();
    }
  } catch (err) {
    currentProgress.error = toErrorMessage(err);
  } finally {
    currentProgress.isRunning = false;

    // Generate report
    const duration = Date.now() - startTime;
    currentReport = {
      total: currentProgress.total,
      successful: currentProgress.completed,
      skipped: currentProgress.skipped,
      failed: currentProgress.failed,
      failedComics,
      deadLinks,
      newCollections: Array.from(newCollections.entries()).map(([name, count]) => ({
        kotatsuName: name,
        comicCount: count,
      })),
      duration,
    };

    notifyProgress();

    // Notify report callback
    if (reportCallback && currentReport) {
      reportCallback(currentReport);
    }
  }
}

export function getImportProgress(): ImportProgress {
  return { ...currentProgress };
}

export function getImportReport(): ImportReport | null {
  return currentReport;
}

export function setReportCallback(callback: (report: ImportReport) => void) {
  reportCallback = callback;
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
