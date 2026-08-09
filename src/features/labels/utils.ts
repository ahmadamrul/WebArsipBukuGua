import type { LibraryLabel } from '../../lib/domain/label';
import { editDistance, normalizeComparableText } from '../../lib/utils/text';

const GENRE_NAME_ALIASES: Record<string, string> = {
  borderlineh: 'adult',
  explicitsex: 'adult',
  nudity: 'adult',
  sexualcontent: 'adult',
  adult: 'adult',
  scifi: 'sciencefiction',
  sciencefiction: 'sciencefiction',
  shonen: 'shounen',
  shounen: 'shounen',
  shojo: 'shoujo',
  shoujo: 'shoujo',
  martialart: 'martialarts',
  martialarts: 'martialarts',
  supernatural: 'supernatural',
  supranatural: 'supernatural',
  webtoon: 'webtoon',
  webtoons: 'webtoon',
};

export function canonicalGenreName(value: string) {
  const normalized = normalizeComparableText(value);
  return GENRE_NAME_ALIASES[normalized] ?? normalized;
}

export function genreNamesMatch(detected: string, existing: string) {
  const left = canonicalGenreName(detected);
  const right = canonicalGenreName(existing);
  if (!left || !right) return false;
  if (left === right) return true;
  const longest = Math.max(left.length, right.length);
  if (longest < 4) return false;
  const distance = editDistance(left, right);
  return longest <= 6 ? distance <= 1 : distance <= 2 && distance / longest <= 0.25;
}

export function matchingGenreLabelIds(detectedGenres: string[], labels: LibraryLabel[]) {
  return labels
    .filter((label) => label.kind === 'genre')
    .filter((label) => detectedGenres.some((detected) => genreNamesMatch(detected, label.name)))
    .map((label) => label.id);
}
