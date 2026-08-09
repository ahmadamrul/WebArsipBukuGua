import { useEffect, useState } from 'react';
import { detectMetadata, titleMatchesSourceSlug } from '../../features/metadata-detection';
import { matchingGenreLabelIds, type LibraryLabel } from '../../features/labels';
import { shouldReplaceAutoSourceLabel, type ComicSourceLink } from '../../features/sources';
import type { ComicFormState } from '../../features/comics';
import { toDebugMessage, toErrorMessage } from '../../lib/utils/errors';

type SetState<T> = (value: T | ((current: T) => T)) => void;

export type ComicCoverCheckDeps = {
  comicSourceLinks: ComicSourceLink[];
  comicForm: ComicFormState;
  labels: LibraryLabel[];
  formMode: 'create' | 'edit' | null;
  openPanel: 'comic' | 'source' | 'label' | null;
  setComicForm: SetState<ComicFormState>;
  setComicSourceLinks: SetState<ComicSourceLink[]>;
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
  setComicSourceLinks,
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
      });
      return;
    }
    const sourceSignature = sourceLinks.map((link) => link.url).join('|');
    if (sourceSignature === coverCheckSourceUrl) return;
    const shouldRefreshTitle =
      !comicForm.title.trim() ||
      (formMode === 'create' &&
        (comicForm.title === coverCheckState.title ||
          titleMatchesSourceSlug(
            comicForm.title,
            sourceLinks.map((link) => link.url),
          )));
    const shouldRefreshSourceName =
      !comicForm.sourceName.trim() ||
      comicForm.sourceName === coverCheckState.sourceName ||
      sourceLinks.some((link) => !link.label.trim());
    const shouldRefreshCover = !comicForm.coverUrl.trim() || comicForm.coverUrl === coverCheckState.coverUrl;
    const shouldRefreshDescription = !comicForm.history.trim();
    const timer = window.setTimeout(async () => {
      if (cancelled) return;
      setCoverCheckState((current) => ({ ...current, loading: true }));
      try {
        const results: Awaited<ReturnType<typeof detectMetadata>>[] = [];
        const titleOptions: Array<{ title: string; sourceName: string; sourceUrl: string }> = [];
        let picked: Awaited<ReturnType<typeof detectMetadata>> | null = null;
        for (const sourceLink of sourceLinks) {
          try {
            const metadata = await detectMetadata(sourceLink.url);
            if (cancelled) return;
            results.push(metadata);
            if (metadata.title.trim()) {
              titleOptions.push({
                title: metadata.title.trim(),
                sourceName: metadata.sourceName || sourceLink.label,
                sourceUrl: sourceLink.url,
              });
            }
            if (!picked && (metadata.coverCandidates.length > 0 || metadata.coverUrl || metadata.title || metadata.sourceName)) {
              picked = metadata;
            }
            if (shouldRefreshTitle && metadata.title) {
              setComicForm((current) => ({ ...current, title: metadata.title }));
            }
            if (shouldRefreshSourceName && metadata.sourceName) {
              setComicForm((current) => ({ ...current, sourceName: metadata.sourceName }));
            }
            if (shouldRefreshDescription && metadata.description) {
              setComicForm((current) =>
                current.history.trim() ? current : { ...current, history: metadata.description ?? '' },
              );
            }
            if (metadata.sourceName) {
              setComicSourceLinks((current) =>
                current.map((item) =>
                  item.id === sourceLink.id &&
                  shouldReplaceAutoSourceLabel(item.label, item.url, metadata.sourceName)
                    ? { ...item, label: metadata.sourceName }
                    : item,
                ),
              );
            }
          } catch {
            continue;
          }
        }
        if (cancelled) return;
        const metadata = picked ?? results[0] ?? null;
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
        const allGenres = Array.from(new Set(results.flatMap((result) => result.genres)));
        const allSourceNames = Array.from(new Set(results.map((result) => result.sourceName).filter(Boolean)));
        const preferredCover = metadata.coverUrl ?? allCoverCandidates[0] ?? null;
        const detectedGenreIds = matchingGenreLabelIds(allGenres, labels);
        if (detectedGenreIds.length > 0) {
          setComicFormGenreIds((current) => Array.from(new Set([...current, ...detectedGenreIds])));
        }
        if (shouldRefreshCover && preferredCover) {
          setComicForm((current) => ({ ...current, coverUrl: preferredCover }));
        }
        if (shouldRefreshSourceName && metadata.sourceName) {
          setComicSourceLinks((current) =>
            current.map((item, index) =>
              index === 0 && shouldReplaceAutoSourceLabel(item.label, item.url, metadata.sourceName)
                ? { ...item, label: metadata.sourceName }
                : item,
            ),
          );
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
        });
      }
    }, 350);
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
      for (const sourceUrl of sourceUrls) {
        try {
          results.push(await detectMetadata(sourceUrl));
        } catch {
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
      const picked = results.find((item) => item.coverCandidates.length > 0 || item.coverUrl) ?? results[0] ?? null;
      if (!picked) throw new Error('Tidak ada data sumber yang bisa dibaca.');
      const allCoverCandidates = Array.from(
        new Set([comicForm.coverUrl.trim() || null, ...results.flatMap((result) => [result.coverUrl, ...result.coverCandidates])].filter((value): value is string => Boolean(value))),
      );
      const allGenres = Array.from(new Set(results.flatMap((result) => result.genres)));
      const allSourceNames = Array.from(new Set(results.map((result) => result.sourceName).filter(Boolean)));
      const preferredCover = picked.coverUrl ?? allCoverCandidates[0] ?? null;
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
      });
      setCoverCheckSourceUrl(sourceUrls.join('|'));
      if ((!comicForm.title.trim() || titleMatchesSourceSlug(comicForm.title, sourceUrls)) && picked.title) {
        setComicForm((current) => ({ ...current, title: picked.title }));
      }
      if (!comicForm.sourceName.trim() && picked.sourceName) {
        setComicForm((current) => ({ ...current, sourceName: picked.sourceName }));
      }
      if (!comicForm.history.trim() && picked.description) {
        setComicForm((current) => (current.history.trim() ? current : { ...current, history: picked.description ?? '' }));
      }
      setComicSourceLinks((current) =>
        current.map((link, index) =>
          index === 0 && picked.sourceName && shouldReplaceAutoSourceLabel(link.label, link.url, picked.sourceName)
            ? { ...link, label: picked.sourceName }
            : link,
        ),
      );
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
      });
      setComicPanelNotice(`Cek cover gagal: ${toErrorMessage(error)}`);
      setDebugError(toDebugMessage(error));
    }
  };

  return { detectedTitleOptions, coverCheckState, coverCheckSourceUrl, checkCoverCandidates };
}
