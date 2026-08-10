import { normalizeComparableText } from '../../lib/utils/text';
import type { ComicSourceLink } from './types';

export function createSourceLink(label = '', url = ''): ComicSourceLink {
  return { id: crypto.randomUUID(), label, url };
}

export function normalizeSourceUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    parsed.hash = '';
    parsed.hostname = parsed.hostname.toLowerCase();
    parsed.pathname = parsed.pathname.length > 1 ? parsed.pathname.replace(/\/+$/, '') : parsed.pathname;
    return parsed.toString().replace(/\/$/, '').toLowerCase();
  } catch {
    return trimmed.replace(/\/+$/, '').toLowerCase();
  }
}

export function sourceLabelFromUrl(value: string) {
  if (!value.trim()) return '';
  try {
    const parsed = new URL(value.startsWith('http') ? value : `https://${value}`);
    const hostname = parsed.hostname.replace(/^www\./, '').toLowerCase();
    if (hostname.includes('shinigami.asia')) return 'Shinigami';
    const firstLabel = hostname.split('.')[0] ?? '';
    if (/^\d+$/.test(firstLabel) && hostname.includes('shinigami')) return 'Shinigami';
    return firstLabel;
  } catch {
    return '';
  }
}

export function shouldReplaceAutoSourceLabel(label: string, sourceUrl: string, detectedSourceName: string) {
  const normalizedLabel = normalizeComparableText(label);
  if (!normalizedLabel) return true;
  if (normalizedLabel === normalizeComparableText(detectedSourceName)) return false;
  const currentHostLabel = normalizeComparableText(sourceLabelFromUrl(sourceUrl));
  const knownHostLabels = new Set([
    'komiku',
    'webtoon',
    'webtoons',
    'shinigami',
    'lapakkomik',
    'keikomik',
    'ryukomik',
    'maid',
    'komikcast',
    'manganato',
    'bato',
  ]);
  const genericLabels = new Set(['sumber', 'sumberutama', 'source', 'sourceutama', 'source1', 'sumber1']);
  return (
    genericLabels.has(normalizedLabel) ||
    /^\d+$/.test(normalizedLabel) ||
    (knownHostLabels.has(normalizedLabel) && normalizedLabel !== currentHostLabel)
  );
}
