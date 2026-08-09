import { STORAGE_KEYS } from '../../../lib/constants/storageKeys';
import { readStorageJson, writeStorageJson } from '../../../lib/utils/storage';
import type { PendingCoverSync } from '../types';

export function readPendingCoverSync() {
  const parsed = readStorageJson<unknown>(STORAGE_KEYS.pendingCoverSync, []);
  return Array.isArray(parsed) ? (parsed as PendingCoverSync[]) : [];
}

export function writePendingCoverSync(items: PendingCoverSync[]) {
  writeStorageJson(STORAGE_KEYS.pendingCoverSync, items);
}

export function queueCoverSync(item: PendingCoverSync) {
  const current = readPendingCoverSync().filter((entry) => entry.comicId !== item.comicId);
  writePendingCoverSync([...current, item]);
}

export function removeQueuedCoverSync(comicId: string) {
  writePendingCoverSync(readPendingCoverSync().filter((entry) => entry.comicId !== comicId));
}
