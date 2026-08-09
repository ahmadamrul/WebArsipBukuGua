import { normalizeComparableText } from '../../lib/utils/text';

export function titleMatchesSourceSlug(title: string, sourceUrls: string[]) {
  const comparableTitle = normalizeComparableText(title);
  if (!comparableTitle) return false;
  return sourceUrls.some((sourceUrl) => {
    try {
      const parsed = new URL(sourceUrl.startsWith('http') ? sourceUrl : `https://${sourceUrl}`);
      const slug = parsed.pathname.split('/').filter(Boolean).at(-1) ?? '';
      return comparableTitle === normalizeComparableText(decodeURIComponent(slug));
    } catch {
      return false;
    }
  });
}

export function isUsefulDetectedTitle(title: string, _sourceUrl?: string) {
  void _sourceUrl;
  const normalized = normalizeComparableText(title);
  if (!normalized || normalized.length < 3) return false;
  return !['comic', 'komik', 'list', 'justamoment', 'checkingyourbrowser', 'attentionrequired'].includes(
    normalized,
  );
}
