export function readStorageJson<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : (JSON.parse(value) as T);
  } catch {
    return fallback;
  }
}

export function writeStorageJson<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
}
