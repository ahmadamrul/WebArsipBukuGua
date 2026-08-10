import { useEffect, useState } from 'react';
import { detectMetadata } from '../../features/metadata-detection';
import { comicTitlesAreRelated } from '../../features/comics';
import { matchingGenreLabelIds, type LibraryLabel } from '../../features/labels';
import type { ComicSourceLink } from '../../features/sources';
import type { ComicFormState } from '../../features/comics';
import { toDebugMessage, toErrorMessage } from '../../lib/utils/errors';

type SetState<T> = (value: T | ((current: T) => T)) => void;

function pickBestCoverCandidate(candidates: Array<string | null | undefined>) {
  const normalized = candidates.filter((candidate): candidate is string => Boolean(candidate));
  return normalized
    .slice()
    .sort((left, right) => {
      const score = (value: string) => {
        const lower = value.toLowerCase();
        let total = 0;
        if (lower.includes('og:image') || lower.includes('twitter:image')) total += 60;
        if (lower.includes('cover') || lower.includes('poster') || lower.includes('thumbnail')) total += 35;
        if (lower.includes('/uploads/') || lower.includes('/images/')) total += 18;
        if (lower.includes('thumb') || lower.includes('thumb_')) total += 12;
        if (/(?:^|[\/_.-])(?:logo|icon|fav|favicon)(?:[\/_.-]|$)/.test(lower)) total -= 120;
        if (lower.includes('logo') || lower.includes('icon') || lower.includes('sprite') || lower.includes('button')) total -= 80;
        if (lower.includes('avatar') || lower.includes('profile')) total -= 30;
        if (lower.includes('1x1') || lower.includes('spacer')) total -= 100;
        return total;
      };
      return score(right) - score(left);
    })[0] ?? null;
}

function normalizeMeaningfulText(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function textSharesEnoughWords(leftText: string, rightText: string) {
  const left = normalizeMeaningfulText(leftText);
  const right = normalizeMeaningfulText(rightText);
  if (!left || !right) return false;
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
    'indo',
    'id',
  ]);
  const leftWords = left.split(' ').filter((word) => word.length >= 3 && !ignoredWords.has(word));
  const rightWords = new Set(right.split(' ').filter((word) => word.length >= 3 && !ignoredWords.has(word)));
  if (leftWords.length === 0 || rightWords.size === 0) return false;
  const overlap = leftWords.filter((word) => rightWords.has(word)).length;
  return overlap >= 2 || overlap / Math.min(leftWords.length, rightWords.size) >= 0.35;
}

function shouldReplaceLongText(currentValue: string, detectedValue: string) {
  const current = currentValue.trim();
  const detected = detectedValue.trim();
  if (!detected) return false;
  if (!current) return true;
  if (current === detected) return false;
  if (current.length < 24) return true;
  if (comicTitlesAreRelated(current, detected)) return false;
  if (textSharesEnoughWords(current, detected)) return false;
  return false;
}

function intersectGenres(results: Array<Awaited<ReturnType<typeof detectMetadata>>>) {
  const cleaned = results
    .map((result) => Array.from(new Set(result.genres.map((genre) => genre.trim()).filter(Boolean))))
    .filter((genres) => genres.length > 0);
  if (cleaned.length === 0) return [];
  if (cleaned.length === 1) return cleaned[0];
  const shared = cleaned.reduce<Set<string> | null>((acc, genres) => {
    const set = new Set(genres);
    if (!acc) return set;
    return new Set([...acc].filter((genre) => set.has(genre)));
  }, null);
  const sharedGenres = Array.from(shared ?? []);
  if (sharedGenres.length > 0) return sharedGenres;
  return Array.from(new Set(cleaned.flatMap((genres) => genres)));
}

export type ComicCoverCheckDeps = {
  comicSourceLinks: ComicSourceLink[];
  comicForm: ComicFormState;
  labels: LibraryLabel[];
  formMode: 'create' | 'edit' | null;
  openPanel: 'comic' | 'source' | 'label' | null;
  setComicForm: SetState<ComicFormState>;
  setComicFormGenreIds: SetState<string[]>;
  setComicPanelNotice: SetState<string>;
  setDebugError: SetState<string>;
};

export function useComicCoverCheck({
  comicSourceLinks,
  comicForm,
  labels,
  formMode,
  openPanel,
  setComicForm,
  setComicFormGenreIds,
  setComicPanelNotice,
  setDebugError,
}: ComicCoverCheckDeps) {
  const [detectedTitleOptions, setDetectedTitleOptions] = useState<Array<{ title: string; sourceName: string; sourceUrl: string }>>([]);
  const [coverCheckState, setCoverCheckState] = useState({
    loading: false,
    title: '',
    sourceName: '',
    coverCandidates: [] as string[],
    coverUrl: null as string | null,
    genres: [] as string[],
    sourceSizeLabel: null as string | null,
    optimizedSizeLabel: null as string | null,
    sourceResults: [] as Array<{ url: string; title: string; coverFound: boolean; descriptionFound: boolean; genresFound: number }>,
  });
  const [coverCheckSourceUrl, setCoverCheckSourceUrl] = useState('');

  useEffect(() => {
    let cancelled = false;
    const sourceLinks = comicSourceLinks
      .map((link) => ({ ...link, label: link.label.trim(), url: link.url.trim() }))
      .filter((link) => link.url.length > 0);
    if (!formMode || openPanel !== 'comic') return;
    if (sourceLinks.length === 0) {
      setCoverCheckSourceUrl('');
      setDetectedTitleOptions([]);
      setCoverCheckState({
        loading: false,
        title: '',
        sourceName: '',
        coverCandidates: [],
        coverUrl: null,
        genres: [],
        sourceSizeLabel: null,
        optimizedSizeLabel: null,
        sourceResults: [],
      });
      return;
    }
    const sourceSignature = sourceLinks.map((link) => link.url).join('|');
    if (sourceSignature === coverCheckSourceUrl) return;
    const shouldRefreshTitle = !comicForm.title.trim();
    const shouldRefreshSourceName = !comicForm.sourceName.trim() || comicForm.sourceName === coverCheckState.sourceName;
    const shouldRefreshCover = !comicForm.coverUrl.trim() || comicForm.coverUrl === coverCheckState.coverUrl;
    // Set loading immediately for instant UX feedback
    setCoverCheckState((current) => ({ ...current, loading: true }));
    const timer = window.setTimeout(async () => {
      if (cancelled) return;
      try {
        const results: Awaited<ReturnType<typeof detectMetadata>>[] = [];
        const titleOptions: Array<{ title: string; sourceName: string; sourceUrl: string }> = [];
        const sourceResults: Array<{ url: string; title: string; coverFound: boolean; descriptionFound: boolean; genresFound: number }> = [];
        for (const sourceLink of sourceLinks) {
          try {
            const metadata = await detectMetadata(sourceLink.url);
            if (cancelled) return;
            results.push(metadata);
            sourceResults.push({
              url: sourceLink.url,
              title: metadata.title || sourceLink.label || '',
              coverFound: Boolean(metadata.coverUrl || metadata.coverCandidates.length > 0),
              descriptionFound: Boolean(metadata.description),
              genresFound: metadata.genres.length,
            });
            if (metadata.title.trim()) {
              titleOptions.push({
                title: metadata.title.trim(),
                sourceName: metadata.sourceName || sourceLink.label,
                sourceUrl: sourceLink.url,
              });
            }
            if (shouldRefreshTitle && metadata.title) {
              setComicForm((current) => ({ ...current, title: metadata.title }));
            }
            if (shouldRefreshSourceName && metadata.sourceName) {
              setComicForm((current) => ({ ...current, sourceName: metadata.sourceName }));
            }
            if (metadata.description && shouldReplaceLongText(comicForm.history, metadata.description)) {
              setComicForm((current) => {
                const currentHistory = current.history.trim();
                if (currentHistory && !shouldReplaceLongText(currentHistory, metadata.description ?? '')) {
                  return current;
                }
                return { ...current, history: metadata.description ?? '' };
              });
            }
          } catch (error) {
            console.error('Failed to detect metadata for URL:', sourceLink.url, error);
            continue;
          }
        }
        if (cancelled) return;
        const metadata = results.reduce<Awaited<ReturnType<typeof detectMetadata>> | null>((best, current) => {
          if (!best) return current;
          return pickBestCoverCandidate([current.coverUrl, ...current.coverCandidates]) &&
            !pickBestCoverCandidate([best.coverUrl, ...best.coverCandidates])
            ? current
            : best;
        }, null) ?? results[0] ?? null;
        if (!metadata) return;
        setDetectedTitleOptions(titleOptions);
        const allCoverCandidates = Array.from(
          new Set(
            [
              comicForm.coverUrl.trim() || null,
              ...results.flatMap((result) => [result.coverUrl, ...result.coverCandidates]),
            ].filter((value): value is string => Boolean(value)),
          ),
        );
        const allGenres = intersectGenres(results);
        const allSourceNames = Array.from(new Set(results.map((result) => result.sourceName).filter(Boolean)));
        const preferredCover = pickBestCoverCandidate([metadata.coverUrl, ...allCoverCandidates]);
        const detectedGenreIds = matchingGenreLabelIds(allGenres, labels);
        if (detectedGenreIds.length > 0) {
          setComicFormGenreIds((current) => Array.from(new Set([...current, ...detectedGenreIds])));
        }
        if (shouldRefreshCover && preferredCover) {
          setComicForm((current) => ({ ...current, coverUrl: preferredCover }));
        }
        setCoverCheckState({
          loading: false,
          title: metadata.title,
          sourceName: allSourceNames.join(' + ') || metadata.sourceName,
          coverCandidates: allCoverCandidates,
          coverUrl: preferredCover,
          genres: allGenres,
          sourceSizeLabel: null,
          optimizedSizeLabel: null,
          sourceResults,
        });
        setCoverCheckSourceUrl(sourceSignature);
      } catch {
        if (cancelled) return;
        setDetectedTitleOptions([]);
        setCoverCheckState({
          loading: false,
          title: '',
          sourceName: '',
          coverCandidates: [],
          coverUrl: null,
          genres: [],
          sourceSizeLabel: null,
          optimizedSizeLabel: null,
          sourceResults: [],
        });
      }
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [comicSourceLinks, formMode, openPanel]);

  const checkCoverCandidates = async () => {
    try {
      const sourceUrls = comicSourceLinks.map((link) => link.url.trim()).filter(Boolean);
      if (sourceUrls.length === 0) {
        setComicPanelNotice('Isi dulu minimal satu link sumber untuk cek cover.');
        return;
      }
      const results: Awaited<ReturnType<typeof detectMetadata>>[] = [];
      const sourceResults: Array<{ url: string; title: string; coverFound: boolean; descriptionFound: boolean; genresFound: number }> = [];
      for (const sourceUrl of sourceUrls) {
        try {
          const metadata = await detectMetadata(sourceUrl);
          results.push(metadata);
          sourceResults.push({
            url: sourceUrl,
            title: metadata.title,
            coverFound: Boolean(metadata.coverUrl || metadata.coverCandidates.length > 0),
            descriptionFound: Boolean(metadata.description),
            genresFound: metadata.genres.length,
          });
        } catch {
          sourceResults.push({
            url: sourceUrl,
            title: '',
            coverFound: false,
            descriptionFound: false,
            genresFound: 0,
          });
          results.push({
            title: '',
            sourceName: '',
            description: null,
            coverUrl: null,
            coverCandidates: [],
            genres: [],
          });
        }
      }
      const picked =
        results.reduce<Awaited<ReturnType<typeof detectMetadata>> | null>((best, current) => {
          if (!best) return current;
          return pickBestCoverCandidate([current.coverUrl, ...current.coverCandidates]) &&
            !pickBestCoverCandidate([best.coverUrl, ...best.coverCandidates])
            ? current
            : best;
        }, null) ?? results[0] ?? null;
      if (!picked) throw new Error('Tidak ada data sumber yang bisa dibaca.');
      const allCoverCandidates = Array.from(
        new Set([comicForm.coverUrl.trim() || null, ...results.flatMap((result) => [result.coverUrl, ...result.coverCandidates])].filter((value): value is string => Boolean(value))),
      );
      const allGenres = intersectGenres(results);
      const allSourceNames = Array.from(new Set(results.map((result) => result.sourceName).filter(Boolean)));
      const preferredCover = pickBestCoverCandidate([picked.coverUrl, ...allCoverCandidates]);
      const detectedGenreIds = matchingGenreLabelIds(allGenres, labels);
      if (detectedGenreIds.length > 0) {
        setComicFormGenreIds((current) => Array.from(new Set([...current, ...detectedGenreIds])));
      }
      setCoverCheckState({
        loading: false,
        title: picked.title,
        sourceName: allSourceNames.join(' + ') || picked.sourceName,
        coverCandidates: allCoverCandidates,
        coverUrl: preferredCover,
        genres: allGenres,
        sourceSizeLabel: picked.sourceSizeLabel ?? null,
        optimizedSizeLabel: picked.optimizedSizeLabel ?? null,
        sourceResults,
      });
      setCoverCheckSourceUrl(sourceUrls.join('|'));
      if (!comicForm.title.trim() && picked.title) {
        setComicForm((current) => ({ ...current, title: picked.title }));
      }
      if (!comicForm.sourceName.trim() && picked.sourceName) {
        setComicForm((current) => ({ ...current, sourceName: picked.sourceName }));
      }
      if (picked.description && shouldReplaceLongText(comicForm.history, picked.description)) {
        setComicForm((current) => {
          const currentHistory = current.history.trim();
          if (currentHistory && !shouldReplaceLongText(currentHistory, picked.description ?? '')) {
            return current;
          }
          return { ...current, history: picked.description ?? '' };
        });
      }
      if (!comicForm.coverUrl.trim() && preferredCover) {
        setComicForm((current) => ({ ...current, coverUrl: preferredCover })); 
      }
      setComicPanelNotice(
        allCoverCandidates.length > 0
          ? `${allCoverCandidates.length} kandidat cover ditemukan dari ${allSourceNames.length || 1} sumber.`
          : 'Belum ada cover di link pertama. Silakan tambah sumber lain lalu cek lagi.',
      );
    } catch (error) {
      setCoverCheckSourceUrl('');
      setCoverCheckState({
        loading: false,
        title: '',
        sourceName: '',
        coverCandidates: [],
        coverUrl: null,
        genres: [],
        sourceSizeLabel: null,
        optimizedSizeLabel: null,
        sourceResults: [],
      });
      setComicPanelNotice(`Cek cover gagal: ${toErrorMessage(error)}`);
      setDebugError(toDebugMessage(error));
    }
  };

  return { detectedTitleOptions, coverCheckState, coverCheckSourceUrl, checkCoverCandidates };
}
