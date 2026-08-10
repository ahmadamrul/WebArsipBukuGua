import type { ComicSourceLink } from '../../features/sources';
import { sourceLabelFromUrl } from '../../features/sources';
import { titleMatchesSourceSlug } from '../../features/metadata-detection';
import type { ComicFormState } from '../../features/comics';
import { normalizeComparableText } from '../../lib/utils/text';

type SetState<T> = (value: T | ((current: T) => T)) => void;

export type ComicDraftActionsDeps = {
  comicForm: ComicFormState;
  formMode: 'create' | 'edit' | null;
  setComicSourceLinks: SetState<ComicSourceLink[]>;
  setComicForm: SetState<ComicFormState>;
  setDismissedTitleSuggestion: SetState<string>;
  setComicPanelNotice: SetState<string>;
  tr: (indonesian: string, english: string) => string;
};

export function createComicDraftActions(deps: ComicDraftActionsDeps) {
  const {
    comicForm,
    formMode,
    setComicSourceLinks,
    setComicForm,
    setDismissedTitleSuggestion,
    setComicPanelNotice,
    tr,
  } = deps;

  const updateComicSourceUrl = (link: ComicSourceLink, value: string) => {
    const nextAutoLabel = sourceLabelFromUrl(value);
    const normalizedLabel = normalizeComparableText(link.label);
    const shouldAutoFillLabel =
      !normalizedLabel ||
      normalizedLabel === 'sumber' ||
      normalizedLabel === 'sumberutama' ||
      normalizedLabel === 'source' ||
      normalizedLabel === 'sourceutama' ||
      normalizedLabel === 'source1' ||
      normalizedLabel === 'sumber1' ||
      /^\d+$/.test(normalizedLabel);
    const shouldClearAutoTitle = titleMatchesSourceSlug(comicForm.title, [link.url]);
    setComicSourceLinks((current) =>
      current.map((item) =>
        item.id === link.id
          ? { ...item, url: value, label: shouldAutoFillLabel && nextAutoLabel ? nextAutoLabel : item.label }
          : item,
      ),
    );
    if (shouldClearAutoTitle && formMode === 'create') {
      setComicForm((current) => ({ ...current, title: '' }));
    }
    setDismissedTitleSuggestion('');
  };

  const pasteComicSourceUrl = async (link: ComicSourceLink) => {
    try {
      const value = (await navigator.clipboard.readText()).trim();
      if (!value) {
        setComicPanelNotice(
          tr(
            'Clipboard kosong. Salin URL lalu coba lagi.',
            'The clipboard is empty. Copy a URL and try again.',
          ),
        );
        return;
      }
      updateComicSourceUrl(link, value);
      setComicPanelNotice('');
    } catch {
      setComicPanelNotice(
        tr(
          'Clipboard tidak bisa dibaca. Izinkan akses clipboard atau tempel URL secara manual.',
          'The clipboard could not be read. Allow clipboard access or paste the URL manually.',
        ),
      );
    }
  };

  return { updateComicSourceUrl, pasteComicSourceUrl };
}
