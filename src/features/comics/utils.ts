import type { Comic } from '../../lib/domain/comic';
import type { ComicLabel, LibraryLabel } from '../../lib/domain/label';
import type { ReadingStatus } from '../../lib/domain/readingStatus';
import { validReadingStatus } from '../../lib/domain/readingStatus';
import { MAX_COMIC_RATING } from '../../lib/constants/limits';
import { ADULT_TAXONOMY_PATTERN } from '../../lib/constants/regex';
import { editDistance, normalizeComparableText } from '../../lib/utils/text';

export function comicTitleSimilarity(leftTitle: string, rightTitle: string) {
  const left = normalizeComparableText(leftTitle);
  const right = normalizeComparableText(rightTitle);
  if (!left || !right) return 0;
  if (left === right) return 1;
  const longest = Math.max(left.length, right.length);
  if (longest < 6) return 0;
  return 1 - editDistance(left, right) / longest;
}

export function comicTitlesAreRelated(leftTitle: string, rightTitle: string) {
  const left = normalizeComparableText(leftTitle);
  const right = normalizeComparableText(rightTitle);
  if (!left || !right) return false;
  if (left === right || left.includes(right) || right.includes(left)) return true;
  const ignoredWords = new Set([
    'bahasa',
    'indonesia',
    'indo',
    'english',
    'komik',
    'comic',
    'manga',
    'manhwa',
    'manhua',
    'chapter',
    'episode',
    'the',
    'and',
    'dan',
    'sub',
  ]);
  const meaningfulWords = (value: string) =>
    new Set(
      value
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .match(/[a-z0-9]+/g)
        ?.filter((word) => word.length >= 3 && !ignoredWords.has(word)) ?? [],
    );
  const leftWords = meaningfulWords(leftTitle);
  const rightWords = meaningfulWords(rightTitle);
  return [...leftWords].some((word) => rightWords.has(word));
}

export function findSimilarComic(title: string, comics: Comic[]) {
  return (
    comics
      .map((comic) => ({ comic, similarity: comicTitleSimilarity(title, comic.title) }))
      .filter((candidate) => candidate.similarity >= 0.88)
      .sort((left, right) => right.similarity - left.similarity)[0] ?? null
  );
}

export function isAdultTaxonomyName(value: string) {
  return ADULT_TAXONOMY_PATTERN.test(
    value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase(),
  );
}

export function comicHasAdultTaxonomy(comic: Comic, labels: LibraryLabel[], comicLabels: ComicLabel[]) {
  const linkedLabelIds = new Set(
    comicLabels.filter((link) => link.comic_id === comic.id).map((link) => link.label_id),
  );
  const taxonomyNames = [
    ...(comic.genre ?? '').split(','),
    ...labels
      .filter((label) => linkedLabelIds.has(label.id) && (label.kind === 'genre' || label.kind === 'tag'))
      .map((label) => label.name),
  ];
  return taxonomyNames.some((name) => isAdultTaxonomyName(name.trim()));
}

export function validComicRating(value: number | null | undefined) {
  const rating = Math.round(Number(value ?? 0));
  if (!Number.isFinite(rating)) return 0;
  return Math.max(0, Math.min(MAX_COMIC_RATING, rating));
}

export function canRateComic(status: ReadingStatus | null | undefined) {
  return validReadingStatus(status) !== 'wantToRead';
}

export function chapterNumberFromLabel(label: string | null | undefined) {
  const value = Number(label?.match(/\d+/)?.[0] ?? 0);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}
