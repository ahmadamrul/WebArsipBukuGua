import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';

import { supabase, supabaseConfigured } from './api/supabaseClient';
import {
  COVER_BUCKET,
  cleanDescription,
  decodeHtmlEntities,
  detectPageDescription,
  formatBytes,
  guessCoverExtension,
  isChallengePage,
  legacyProgressFields,
  normalizeSourceName,
  optimizeCoverBlob,
  parseSrcset,
  requiresLegacyProgressFields,
  resolveUrl,
  scoreCoverCandidate,
} from './libraryServiceHelpers';
import { normalizeComparableText } from './utils/text';
import type { Comic, LibraryLabel, PublicationItem, PublicationKind } from './types';
import type {
  ComicInput,
  ComicLabelInput,
  ComicSourceInput,
  ComicSourceUpdateInput,
  DetectedMetadata,
  LibrarySnapshot,
  PublicationPreview,
  SessionInfo,
} from './types/api';

export type {
  ComicInput,
  ComicLabelInput,
  ComicSourceInput,
  ComicSourceUpdateInput,
  DetectedMetadata,
  LibrarySnapshot,
  PublicationPreview,
  SessionInfo,
} from './types/api';

const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

async function fetchHtmlWithFallback(url: string) {
  const parsed = new URL(url);
  const strippedUrl = url.replace(/^https?:\/\//i, '');
  const readerUrls =
    parsed.protocol === 'https:'
      ? [`https://r.jina.ai/https://${strippedUrl}`, `https://r.jina.ai/http://${strippedUrl}`]
      : [`https://r.jina.ai/http://${strippedUrl}`, `https://r.jina.ai/https://${strippedUrl}`];
  const attempts = parsed.origin === window.location.origin ? [url, ...readerUrls] : readerUrls;
  let lastError: unknown = null;
  for (const candidate of attempts) {
    try {
      const response = await fetch(candidate, {
        method: 'GET',
        cache: 'no-store',
      });
      if (!response.ok) {
        lastError = new Error(`Gagal mengambil halaman: ${response.status}`);
        continue;
      }
      const text = await response.text();
      if (text.trim() && !isChallengePage(text)) return text;
      if (isChallengePage(text)) {
        lastError = new Error('Halaman dilindungi challenge Cloudflare.');
      }
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error('Gagal mengambil halaman.');
}

async function fetchCoverSourceBlob(url: string) {
  const fetchFromEdgeProxy = async () => {
    if (!supabaseConfigured || !supabase) return null;
    const { data, error } = await supabase.functions.invoke('cover-proxy', { body: { url } });
    if (error) throw error;
    if (data instanceof Blob && data.size > 0) return data;
    if (data instanceof ArrayBuffer && data.byteLength > 0) return new Blob([data]);
    return null;
  };
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.endsWith('shngm.id') || hostname === 'jumpg-assets.tokyo-cdn.com') {
      const proxied = await fetchFromEdgeProxy();
      if (proxied) return proxied;
    }
  } catch {
    // Continue through the public fallbacks when the Edge Function is not deployed yet.
  }
  const attempts = [
    url,
    `https://images.weserv.nl/?url=${encodeURIComponent(url)}&output=webp`,
    `https://images.weserv.nl/?url=${encodeURIComponent(url)}`,
  ];
  let lastError: unknown = null;
  for (const candidate of attempts) {
    try {
      const response = await fetch(candidate, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-store',
      });
      if (!response.ok) {
        lastError = new Error(`Gagal mengambil gambar cover: ${response.status}`);
        continue;
      }
      return await response.blob();
    } catch (error) {
      lastError = error;
    }
  }
  if (supabaseConfigured && supabase) {
    try {
      const proxied = await fetchFromEdgeProxy();
      if (proxied) return proxied;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error('Gagal mengambil gambar cover.');
}

async function uploadComicCoverFromUrl(userId: string, comicId: string, coverUrl: string) {
  if (!supabaseConfigured || !supabase) throw new Error('Akun cloud belum dikonfigurasi.');
  const sourceBlob = await fetchCoverSourceBlob(coverUrl);
  const sourceSizeLabel = formatBytes(sourceBlob.size);
  const optimized = await optimizeCoverBlob(sourceBlob);
  const extension = guessCoverExtension(optimized.mimeType);
  const filePath = `${userId}/${comicId}/cover-${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from(COVER_BUCKET).upload(filePath, optimized.blob, {
    upsert: true,
    contentType: optimized.mimeType,
    cacheControl: '31536000',
  });
  if (error) throw new Error(formatSupabaseError(error));
  const { data } = supabase.storage.from(COVER_BUCKET).getPublicUrl(filePath);
  return {
    coverStoragePath: filePath,
    coverUrl: data.publicUrl,
    sourceSizeLabel,
    optimizedSizeLabel: formatBytes(optimized.blob.size),
  };
}

export async function replaceComicCover(comicId: string, coverUrl: string) {
  const user = await requireUser();
  return await uploadComicCoverFromUrl(user.id, comicId, coverUrl);
}

export async function deleteStoredComicCover(coverStoragePath: string | null | undefined) {
  if (!coverStoragePath || !supabaseConfigured || !supabase) return;
  const { error } = await supabase.storage.from(COVER_BUCKET).remove([coverStoragePath]);
  if (error) throw new Error(formatSupabaseError(error));
}

function uniqueStrings(values: Array<string | null | undefined>) {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    if (!value) continue;
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

function humanizePathTitle(pathname: string) {
  const raw = pathname.split('/').filter(Boolean).at(-1) ?? '';
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }
  return decoded.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function cleanDetectedTitle(value: string | null | undefined, hostname: string) {
  if (!value) return '';
  let title = decodeHtmlEntities(value)
    .replace(/^#+\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (hostname.includes('komiku.org')) {
    title = title
      .replace(/^Komik\s+/i, '')
      .replace(/\s*[-|]\s*Komiku\s*$/i, '')
      .trim();
  }
  if (hostname.includes('komiktap.')) {
    title = title.replace(/\s*[|-]\s*Komiktap\s*$/i, '').trim();
  }
  return title;
}

function pickBestCoverFromCandidates(candidates: string[]) {
  return candidates
    .slice()
    .sort((left, right) => scoreCoverCandidate(right) - scoreCoverCandidate(left))[0] ?? null;
}

function extractMarkdownTitle(html: string) {
  return uniqueStrings([html.match(/^Title:\s*(.+)$/im)?.[1], html.match(/^#\s+(.+)$/m)?.[1]]);
}

function parseJsonLdImages(html: string) {
  const candidates: string[] = [];
  for (const match of html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    const raw = match[1].trim();
    if (!raw) continue;
    try {
      const parsedJson = JSON.parse(raw);
      const entries = Array.isArray(parsedJson) ? parsedJson : [parsedJson];
      for (const entry of entries) {
        const values = [entry?.image, entry?.thumbnailUrl, entry?.associatedMedia?.thumbnailUrl];
        for (const value of values) {
          if (typeof value === 'string') {
            candidates.push(value);
          } else if (Array.isArray(value)) {
            for (const item of value) {
              if (typeof item === 'string') candidates.push(item);
              else if (item && typeof item === 'object') {
                const url = (item as Record<string, unknown>).url;
                if (typeof url === 'string') candidates.push(url);
              }
            }
          } else if (value && typeof value === 'object') {
            const url = (value as Record<string, unknown>).url;
            if (typeof url === 'string') candidates.push(url);
          }
        }
      }
    } catch {
      continue;
    }
  }
  return candidates;
}

function collectDomImageCandidates(document: Document) {
  return uniqueStrings(
    [
      ...Array.from(document.images),
      ...Array.from(document.querySelectorAll('source')),
      ...Array.from(
        document.querySelectorAll('meta[property*="image"], meta[name*="image"], link[rel*="image"]'),
      ),
    ].flatMap((element) => [
      element.getAttribute('src'),
      element.getAttribute('href'),
      element.getAttribute('content'),
      element.getAttribute('data-src'),
      element.getAttribute('data-original'),
      element.getAttribute('data-lazy-src'),
      element.getAttribute('data-url'),
      ...parseSrcset(element.getAttribute('srcset') ?? ''),
      ...parseSrcset(element.getAttribute('data-srcset') ?? ''),
    ]),
  );
}

function collectAggressiveCandidates(html: string, document: Document, baseUrl: string) {
  const metaCandidates = uniqueStrings([
    document.querySelector('meta[property="og:image:secure_url"]')?.getAttribute('content'),
    document.querySelector('meta[property="og:image"]')?.getAttribute('content'),
    document.querySelector('meta[name="twitter:image:src"]')?.getAttribute('content'),
    document.querySelector('meta[name="twitter:image"]')?.getAttribute('content'),
    document.querySelector('meta[itemprop="image"]')?.getAttribute('content'),
    document.querySelector('meta[property="vk:image"]')?.getAttribute('content'),
    document.querySelector('meta[name="thumbnail"]')?.getAttribute('content'),
    document.querySelector('meta[property="image"]')?.getAttribute('content'),
    document.querySelector('meta[name="image"]')?.getAttribute('content'),
    document.querySelector('link[rel="image_src"]')?.getAttribute('href'),
    document.querySelector('link[rel="preload"][as="image"]')?.getAttribute('href'),
  ]);
  const scriptCandidates = uniqueStrings(
    Array.from(
      html.matchAll(
        /(?:cover|poster|thumbnail|image)[^"'`\\]{0,40}(?:url|src)?\s*[:=]\s*["']([^"']+\.(?:jpe?g|png|webp|gif|bmp)(?:\?[^"']*)?)["']/gi,
      ),
      (match) => match[1],
    ),
  );
  const inlineUrlCandidates = uniqueStrings(
    Array.from(
      html.matchAll(/https?:\/\/[^"'`\s<>]+?\.(?:jpe?g|png|webp|gif|bmp)(?:\?[^"'`\s<>]*)?/gi),
      (match) => match[0],
    ),
  );
  const markdownImageCandidates = uniqueStrings(
    Array.from(html.matchAll(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/gi), (match) => match[1]),
  );
  return uniqueStrings([
    ...metaCandidates,
    ...parseJsonLdImages(html),
    ...collectDomImageCandidates(document),
    ...scriptCandidates,
    ...markdownImageCandidates,
    ...inlineUrlCandidates,
  ])
    .map((candidate) => resolveUrl(baseUrl, candidate))
    .filter(Boolean)
    .sort((a, b) => scoreCoverCandidate(b!) - scoreCoverCandidate(a!))
    .slice(0, 40) as string[];
}

function pickBestCoverCandidate(candidates: Array<string | null | undefined>) {
  return candidates
    .filter((candidate): candidate is string => Boolean(candidate))
    .sort((a, b) => scoreCoverCandidate(b) - scoreCoverCandidate(a))[0] ?? null;
}

function collectSektedoujinPageCovers(html: string, document: Document, baseUrl: string) {
  const pageTitle = humanizePathTitle(new URL(baseUrl).pathname);
  const normalizedPageTitle = pageTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const markdownMatches = Array.from(html.matchAll(/!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/gi), (match) => ({
    alt: match[1],
    url: match[2],
  }));
  const matchingMarkdownCovers = markdownMatches
    .filter(({ alt }) => {
      const normalizedAlt = alt
        .toLowerCase()
        .replace(/^image\s*\d+\s*:\s*/i, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
      return (
        normalizedPageTitle &&
        (normalizedAlt.includes(normalizedPageTitle) || normalizedPageTitle.includes(normalizedAlt))
      );
    })
    .map(({ url }) => url);
  return uniqueStrings([
    ...matchingMarkdownCovers,
    document.querySelector('.summary_image img')?.getAttribute('src'),
    document.querySelector('.summary_image img')?.getAttribute('data-src'),
    document.querySelector('.thumb img.wp-post-image')?.getAttribute('src'),
    document.querySelector('meta[property="og:image:secure_url"]')?.getAttribute('content'),
    document.querySelector('meta[property="og:image"]')?.getAttribute('content'),
  ])
    .map((candidate) => resolveUrl(baseUrl, candidate))
    .filter(Boolean) as string[];
}

function collectMangaDistrictPageCovers(html: string, document: Document, baseUrl: string) {
  const summaryImage = document.querySelector('.summary_image');
  const summaryCandidates = summaryImage
    ? uniqueStrings(
        [...summaryImage.querySelectorAll('img')].flatMap((image) => [
          image.getAttribute('src'),
          image.getAttribute('data-src'),
          image.getAttribute('data-original'),
          image.getAttribute('data-lazy-src'),
          image.getAttribute('data-mature-static'),
          ...parseSrcset(image.getAttribute('srcset') ?? ''),
          ...parseSrcset(image.getAttribute('data-srcset') ?? ''),
        ]),
      )
    : [];
  const pageSlug = new URL(baseUrl).pathname.split('/').filter(Boolean).at(-1)?.toLowerCase() ?? '';
  const slugWords = pageSlug.split('-').filter((word) => word.length > 2);
  const matchingInlineCandidates = Array.from(
    html.matchAll(/https?:\/\/[^"'`\s<>]+?\.(?:jpe?g|png|webp)(?:\?[^"'`\s<>]*)?/gi),
    (match) => match[0],
  ).filter((candidate) => {
    const normalizedCandidate = candidate.toLowerCase().replace(/[^a-z0-9]+/g, ' ');
    return (
      slugWords.length > 0 &&
      slugWords.filter((word) => normalizedCandidate.includes(word)).length >= Math.min(3, slugWords.length)
    );
  });
  return uniqueStrings([...summaryCandidates, ...matchingInlineCandidates])
    .map((candidate) => resolveUrl(baseUrl, candidate))
    .filter(Boolean) as string[];
}

function detectDomainSpecificCover(
  hostname: string,
  html: string,
  document: Document,
  baseUrl: string,
  fallbackCandidates: string[],
) {
  if (hostname.includes('mangaplus.shueisha.co.jp')) {
    const candidates = uniqueStrings([
      ...Array.from(
        html.matchAll(
          /https?:\/\/jumpg-assets\.tokyo-cdn\.com\/secure\/title\/\d+\/title_thumbnail_portrait(?:_list)?\/[^)\s"'<>]+/gi,
        ),
        (match) => match[0],
      ),
      ...fallbackCandidates.filter((candidate) => candidate.includes('/title_thumbnail_portrait')),
    ]);
    return candidates.map((candidate) => resolveUrl(baseUrl, candidate)).find(Boolean) ?? null;
  }
  if (hostname.includes('shinigami.asia')) {
    const candidates = uniqueStrings([
      document.querySelector('meta[property="og:image"]')?.getAttribute('content'),
      document.querySelector('meta[property="og:image:secure_url"]')?.getAttribute('content'),
      document.querySelector('meta[property="twitter:image"]')?.getAttribute('content'),
      document.querySelector('meta[name="twitter:image"]')?.getAttribute('content'),
      ...fallbackCandidates,
      ...Array.from(
        html.matchAll(
          /["'](?:cover|poster|thumbnail|banner|series_image|seriesImage|image)["']\s*:\s*["']([^"']+)["']/gi,
        ),
        (match) => match[1],
      ),
      ...Array.from(
        html.matchAll(/(?:data-src|src)=["']([^"']+\.(?:jpe?g|png|webp)(?:\?[^"']*)?)["']/gi),
        (match) => match[1],
      ),
    ]);
    return candidates.map((candidate) => resolveUrl(baseUrl, candidate)).find(Boolean) ?? null;
  }
  if (hostname.includes('webtoons.com')) {
    const candidates = uniqueStrings([
      document.querySelector('meta[property="og:image"]')?.getAttribute('content'),
      document.querySelector('meta[property="og:image:secure_url"]')?.getAttribute('content'),
      document.querySelector('meta[name="twitter:image"]')?.getAttribute('content'),
      document.querySelector('meta[name="twitter:image:src"]')?.getAttribute('content'),
      document.querySelector('img[alt*="comic" i]')?.getAttribute('src'),
      document.querySelector('img[alt*="cover" i]')?.getAttribute('src'),
      document.querySelector('img[title*="comic" i]')?.getAttribute('src'),
      ...fallbackCandidates,
      ...Array.from(
        html.matchAll(
          /["'](?:cover|thumbnail|thumb|image|seriesImage|episodeThumbnail)["']\s*:\s*["']([^"']+)["']/gi,
        ),
        (match) => match[1],
      ),
    ]);
    const resolved = candidates
      .map((candidate) => resolveUrl(baseUrl, candidate))
      .filter(Boolean) as string[];
    return pickBestCoverCandidate(resolved);
  }
  if (hostname.includes('komiktap.')) {
    const candidates = uniqueStrings([
      document.querySelector('.thumb[itemprop="image"] img')?.getAttribute('src'),
      document.querySelector('.thumb img.wp-post-image')?.getAttribute('src'),
      document.querySelector('.thumb img')?.getAttribute('src'),
      document.querySelector('meta[property="og:image:secure_url"]')?.getAttribute('content'),
      document.querySelector('meta[property="og:image"]')?.getAttribute('content'),
      document.querySelector('meta[name="twitter:image"]')?.getAttribute('content'),
      ...fallbackCandidates.filter((candidate) =>
        /wp-content\/uploads\/.+\.(?:jpe?g|png|webp)(?:\?|$)/i.test(candidate),
      ),
    ]);
    return pickBestCoverCandidate(candidates.map((candidate) => resolveUrl(baseUrl, candidate)));
  }
  if (hostname.includes('komikindo.')) {
    const candidates = uniqueStrings([
      document.querySelector('.entry-content img')?.getAttribute('src'),
      document.querySelector('.entry-content img')?.getAttribute('data-src'),
      document.querySelector('.chapter-content img')?.getAttribute('src'),
      document.querySelector('.chapter-content img')?.getAttribute('data-src'),
      document.querySelector('.manga-info img')?.getAttribute('src'),
      document.querySelector('.manga-info img')?.getAttribute('data-src'),
      document.querySelector('.thumb img')?.getAttribute('src'),
      document.querySelector('.thumb img')?.getAttribute('data-src'),
      document.querySelector('meta[property="og:image"]')?.getAttribute('content'),
      document.querySelector('meta[property="og:image:secure_url"]')?.getAttribute('content'),
      document.querySelector('meta[name="twitter:image"]')?.getAttribute('content'),
      ...fallbackCandidates,
    ]);
    const resolved = candidates
      .map((candidate) => resolveUrl(baseUrl, candidate))
      .filter(Boolean) as string[];
    return pickBestCoverCandidate(resolved);
  }
  if (hostname.includes('sektedoujin.')) {
    return collectSektedoujinPageCovers(html, document, baseUrl)[0] ?? null;
  }
  if (hostname.includes('mangadistrict.')) {
    return collectMangaDistrictPageCovers(html, document, baseUrl)[0] ?? null;
  }
  if (hostname.includes('komikcast') || hostname.includes('manganato') || hostname.includes('bato')) {
    const candidates = uniqueStrings([
      ...fallbackCandidates,
      document.querySelector('.thumb img')?.getAttribute('src'),
      document.querySelector('.thumb img')?.getAttribute('data-src'),
      document.querySelector('.summary_image img')?.getAttribute('src'),
      document.querySelector('.summary_image img')?.getAttribute('data-src'),
      document.querySelector('.series-thumb img')?.getAttribute('src'),
      document.querySelector('.series-thumb img')?.getAttribute('data-src'),
      document.querySelector('meta[property="og:image"]')?.getAttribute('content'),
    ]);
    const resolved = candidates
      .map((candidate) => resolveUrl(baseUrl, candidate))
      .filter(Boolean) as string[];
    return pickBestCoverCandidate(resolved);
  }
  return null;
}

function detectDomainSpecificTitle(
  hostname: string,
  html: string,
  document: Document,
  fallbackTitle: string,
) {
  if (hostname.includes('mangaplus.shueisha.co.jp')) {
    return cleanDetectedTitle(html.match(/^#\s+(.+)$/m)?.[1] ?? fallbackTitle, hostname);
  }
  if (hostname.includes('komiku.org')) {
    const candidates = uniqueStrings([
      document.querySelector('#Judul [itemprop="name"]')?.textContent,
      document.querySelector('h1 [itemprop="name"]')?.textContent,
      document.querySelector('[itemprop="name"]')?.getAttribute('content'),
      document.querySelector('[itemprop="name"]')?.textContent,
      document.querySelector('meta[property="og:title"]')?.getAttribute('content'),
      document.querySelector('meta[name="twitter:title"]')?.getAttribute('content'),
      ...Array.from(
        html.matchAll(/mangaData\s*=\s*\{[\s\S]*?judul\s*:\s*["']([^"']+)["']/gi),
        (match) => match[1],
      ),
      ...extractMarkdownTitle(html),
      document.querySelector('#Judul h1')?.textContent,
      document.querySelector('h1')?.textContent,
      fallbackTitle,
    ]);
    return (
      candidates
        .map((candidate) => cleanDetectedTitle(candidate, hostname))
        .find((candidate) => candidate && candidate.toLowerCase() !== 'list') ?? fallbackTitle
    );
  }
  if (hostname.includes('mangadistrict.')) {
    const candidates = uniqueStrings([
      document.querySelector('.post-title h1')?.textContent,
      document.querySelector('h1')?.textContent,
      document.querySelector('meta[property="og:title"]')?.getAttribute('content'),
      fallbackTitle,
    ]);
    return (
      candidates.map((candidate) => cleanDetectedTitle(candidate, hostname)).find(Boolean) ?? fallbackTitle
    );
  }
  if (hostname.includes('komiktap.')) {
    const candidates = uniqueStrings([
      document.querySelector('.entry-title')?.textContent,
      document.querySelector('h1[itemprop="name"]')?.textContent,
      document.querySelector('h1')?.textContent,
      document.querySelector('meta[property="og:title"]')?.getAttribute('content'),
      document.querySelector('meta[name="twitter:title"]')?.getAttribute('content'),
      fallbackTitle,
    ]);
    return (
      candidates.map((candidate) => cleanDetectedTitle(candidate, hostname)).find(Boolean) ?? fallbackTitle
    );
  }
  if (hostname.includes('shinigami.asia')) {
    const candidates = uniqueStrings([
      document.querySelector('meta[property="og:title"]')?.getAttribute('content'),
      document.querySelector('h1')?.textContent,
      document.querySelector('.series-title')?.textContent,
      document.querySelector('.post-title')?.textContent,
      document.querySelector('.entry-title')?.textContent,
      ...Array.from(html.matchAll(/<h1[^>]*>([^<]+)<\/h1>/gi), (match) => match[1]),
    ]);
    return candidates[0]?.trim() ?? fallbackTitle;
  }
  if (hostname.includes('webtoons.com')) {
    const candidates = uniqueStrings([
      document.querySelector('meta[property="og:title"]')?.getAttribute('content'),
      document.querySelector('meta[name="twitter:title"]')?.getAttribute('content'),
      document.querySelector('h1')?.textContent,
      document.querySelector('h2')?.textContent,
      document.querySelector('[class*="title"] h1')?.textContent,
      document.querySelector('[class*="title"]')?.textContent,
      document.querySelector('title')?.textContent,
      ...Array.from(html.matchAll(/<h1[^>]*>([^<]+)<\/h1>/gi), (match) => match[1]),
      ...Array.from(html.matchAll(/<title[^>]*>([^<]+)<\/title>/gi), (match) => match[1]),
    ]);
    const cleaned = candidates
      .map((candidate) => candidate?.trim())
      .find((candidate) => candidate && candidate.toLowerCase() !== 'list');
    return cleaned ?? fallbackTitle;
  }
  return fallbackTitle;
}

function collectLabeledGenreCandidates(document: Document) {
  const labeledValues = [
    ...document.querySelectorAll('.post-content_item, .info-item, .detail-item, .metadata-item, tr, dl'),
  ].flatMap((container) => {
    const heading =
      container
        .querySelector('.summary-heading, .label, .name, .title, th, dt, h4, h5, h6')
        ?.textContent?.trim() ?? '';
    if (!/^(?:genres?|types?|formats?)\s*(?:\(s\))?\s*:?$/i.test(heading)) return [];
    const content = container.querySelector('.summary-content, .value, .content, td, dd');
    if (!content) return [];
    const linkedValues = [...content.querySelectorAll('a')]
      .map((node) => node.textContent?.trim())
      .filter(Boolean);
    if (linkedValues.length > 0) return linkedValues;
    return (content.textContent ?? '')
      .split(/[,|•·]+/)
      .map((value) => value.trim())
      .filter(Boolean);
  });
  return uniqueStrings([
    ...[...document.querySelectorAll('[itemprop="genre"]')].map(
      (node) => node.getAttribute('content') ?? node.textContent,
    ),
    ...labeledValues,
  ]);
}

function collectMetaGenreCandidates(html: string, document: Document) {
  const keywords = [
    ...Array.from(
      html.matchAll(/<meta[^>]+(?:property|name)=["'][^"']*(?:keywords|genre)[^"']*["'][^>]+content=["']([^"']+)/gi),
      (match) => match[1],
    ),
    ...Array.from(
      html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
      (match) => match[1],
    ).flatMap((jsonText) => {
      try {
        const parsed = JSON.parse(jsonText) as unknown;
        const items = Array.isArray(parsed) ? parsed : [parsed];
        return items.flatMap((item) => {
          if (!item || typeof item !== 'object') return [];
          const record = item as Record<string, unknown>;
          const values = [record.genre, record.keywords].flatMap((value) => {
            if (Array.isArray(value)) return value.map(String);
            if (typeof value === 'string') return value.split(/[,|•·]/g);
            return [];
          });
          return values;
        });
      } catch {
        return [];
      }
    }),
    ...Array.from(document.querySelectorAll('meta[name="keywords"], meta[property="article:tag"]'), (node) =>
      node.getAttribute('content'),
    ),
  ].flatMap((value) => (value ?? '').split(/[,|•·]/g));
  return filterMeaningfulGenres(keywords);
}

function collectContentBlockGenreCandidates(document: Document) {
  const blocks = [...document.querySelectorAll('article, main, section, .entry-content, .post-content, .summary, .summary__content, .manga-info, .infox')];
  const candidates = blocks.flatMap((block) => {
    const text = (block.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (!text || text.length < 40) return [];
    if (/chapter\s+list/i.test(text) && text.length > 200) {
      const beforeChapter = text.split(/chapter\s+list/i)[0] ?? '';
      const lines = beforeChapter
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean);
      const tail = lines.slice(-4).join(' ');
      return [
        ...extractKnownGenresFromText(tail),
        ...extractGenresFromSentenceText(tail),
        ...expandGenreText(tail),
      ];
    }
    if (text.length > 1200) return [];
    return [...extractKnownGenresFromText(text), ...extractGenresFromSentenceText(text), ...expandGenreText(text)];
  });
  return filterMeaningfulGenres(candidates);
}

function collectContentBlockDescriptionCandidates(document: Document) {
  const blocks = [...document.querySelectorAll('article, main, section, .entry-content, .post-content, .summary, .summary__content, .manga-info, .infox')];
  const candidates = blocks.flatMap((block) => {
    const text = (block.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (!text || text.length < 40) return [];
    if (/chapter\s+list/i.test(text)) {
      const beforeChapter = text.split(/chapter\s+list/i)[0] ?? '';
      const lines = beforeChapter
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean);
      const paragraph = lines.slice(0, Math.max(1, lines.length - 1)).join(' ');
      return [paragraph || beforeChapter];
    }
    return [text];
  });
  return candidates.map(cleanDescription).filter(Boolean) as string[];
}

function expandGenreText(value: string) {
  const cleaned = value
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/www\.\S+/gi, ' ')
    .replace(/\[[^\]]+\]\([^)]+\)/g, ' ');
  return uniqueStrings([
    cleaned,
    ...cleaned.split(/[\n,|•·\/&+]+/g),
    ...cleaned
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(/\s+/g)
      .reduce<string[]>((acc, word, index, words) => {
        if (index === 0) return acc;
        const pair = `${words[index - 1]} ${word}`.trim();
        if (pair.length > 2 && pair.length <= 24) acc.push(pair);
        return acc;
      }, []),
  ])
    .map((candidate) => candidate.trim())
    .filter(Boolean);
}

function extractKnownGenresFromText(value: string) {
  const normalized = value
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/www\.\S+/gi, ' ')
    .replace(/\[[^\]]+\]\([^)]+\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return [];
  const genreDictionary = [
    'Action',
    'Adventure',
    'Comedy',
    'Drama',
    'Fantasy',
    'Historical',
    'Horror',
    'Isekai',
    'Josei',
    'Martial Arts',
    'Mecha',
    'Mystery',
    'Psychological',
    'Romance',
    'School Life',
    'Sci-Fi',
    'Science Fiction',
    'Seinen',
    'Shoujo',
    'Shounen',
    'Slice of Life',
    'Sports',
    'Supernatural',
    'Tragedy',
    'Webtoon',
    'Manhwa',
    'Manhua',
    'Manga',
    'Harem',
    'Adult',
    'Reincarnation',
    'Magic',
    'Military',
    'Monster',
    'Time Travel',
    'Regression',
    'Villainess',
  ];
  const result: string[] = [];
  let remaining = normalized;
  for (const genre of genreDictionary.sort((left, right) => right.length - left.length)) {
    const pattern = new RegExp(`\\b${genre.replace(/\s+/g, '\\s*')}\\b`, 'i');
    const compactPattern = new RegExp(genre.replace(/\s+/g, ''), 'i');
    if (pattern.test(remaining) || compactPattern.test(remaining)) {
      result.push(genre);
      remaining = remaining.replace(compactPattern, ' ');
    }
  }
  return uniqueStrings(result);
}

function extractGenresFromSentenceText(value: string) {
  const normalized = value
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/www\.\S+/gi, ' ')
    .replace(/\[[^\]]+\]\([^)]+\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return [];
  const sentenceMatches = [
    normalized.match(/bergenre\s+([^.;:]+)(?:[.;:]|$)/i)?.[1],
    normalized.match(/genre(?:nya)?\s*[:\-]?\s*([^.;:]+)(?:[.;:]|$)/i)?.[1],
    normalized.match(/(?:genres?|types?|formats?)\s*[:\-]?\s*([^.;:]+)(?:[.;:]|$)/i)?.[1],
  ].filter((value): value is string => Boolean(value));
  const extracted = sentenceMatches.flatMap((chunk) =>
    uniqueStrings([
      ...expandGenreText(chunk),
      ...extractKnownGenresFromText(chunk),
      ...chunk.split(/\s+/g).filter(Boolean),
    ]),
  );
  return filterMeaningfulGenres(extracted);
}

function collectMarkdownGenreCandidates(html: string) {
  const sectionPatterns = [
    /(?:^|\n)(?:#{1,4}\s*)?(?:Genre(?:s)?|Type(?:s)?|Format(?:s)?)\s*:?\s*\n+([\s\S]{0,500}?)(?=\n#{1,4}\s|\n(?:Sinopsis|Synopsis|Description|Deskripsi|Chapter|Daftar\s+Chapter)\b|$)/gi,
  ];
  const candidates: string[] = [];
  for (const pattern of sectionPatterns) {
    for (const match of html.matchAll(pattern)) {
      const body = match[1] ?? '';
      candidates.push(...expandGenreText(body));
      candidates.push(...extractKnownGenresFromText(body));
      candidates.push(...extractGenresFromSentenceText(body));
      candidates.push(...(body.match(/[A-Z][a-z]+(?:[A-Z][a-z]+)+|[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?/g)?.map((value) => value.trim()) ?? []));
    }
  }
  return filterMeaningfulGenres(candidates);
}

function collectGenericGenreLinkCandidates(document: Document, html: string) {
  const sectionCandidates = [...document.querySelectorAll('section, div, dl, tr, ul, ol')].flatMap((container) => {
    const heading =
      container.querySelector('h1, h2, h3, h4, h5, h6, dt, .label, .heading, .title')?.textContent?.trim() ?? '';
    if (!/^(?:genres?|genre|types?|type|formats?|format)\s*(?:\(s\))?\s*:?$/i.test(heading)) return [];
    return [...container.querySelectorAll('a, button, span, li')].flatMap((node) =>
      expandGenreText(node.textContent ?? node.getAttribute('title') ?? ''),
    );
  });
  const layers: string[][] = [];
  const layer1 = [
    ...[...document.querySelectorAll('[itemprop="genre"], meta[name="keywords"], meta[property="article:tag"]')].flatMap(
      (node) => expandGenreText(node.getAttribute('content') ?? node.textContent ?? ''),
    ),
    ...[...document.querySelectorAll('[itemprop="genre"], meta[name="keywords"], meta[property="article:tag"]')].flatMap(
      (node) => extractKnownGenresFromText(node.getAttribute('content') ?? node.textContent ?? ''),
    ),
    ...Array.from(
      html.matchAll(/<meta[^>]+(?:property|name)=["'][^"']*(?:keywords|genre)[^"']*["'][^>]+content=["']([^"']+)/gi),
      (match) => match[1],
    ).flatMap((value) => [...expandGenreText(value), ...extractKnownGenresFromText(value)]),
  ];
  if (layer1.length > 0) layers.push(layer1);
  const layer2 = [
    ...[...document.querySelectorAll('a[href*="/genre/"], a[href*="/genres/"], a[href*="/tag/"], a[href*="/tags/"]')].flatMap(
      (node) => expandGenreText(node.textContent ?? node.getAttribute('title') ?? ''),
    ),
    ...[...document.querySelectorAll('a[href*="/genre/"], a[href*="/genres/"], a[href*="/tag/"], a[href*="/tags/"]')].flatMap(
      (node) => extractKnownGenresFromText(node.textContent ?? node.getAttribute('title') ?? ''),
    ),
    ...Array.from(
      html.matchAll(/<a[^>]+href=["'][^"']*(?:\/genres?\/|\/tags?\/)[^"']*["'][^>]*>([^<]+)<\/a>/gi),
      (match) => match[1],
    ).flatMap((value) => [...expandGenreText(value), ...extractKnownGenresFromText(value)]),
  ];
  if (layer2.length > 0) layers.push(layer2);
  const layer3 = [
    ...[...document.querySelectorAll('a[href*="genre="], a[href*="genres="], a[href*="tag="], a[href*="tags="]')].flatMap(
      (node) => expandGenreText(node.textContent ?? node.getAttribute('title') ?? ''),
    ),
    ...[...document.querySelectorAll('a[href*="genre="], a[href*="genres="], a[href*="tag="], a[href*="tags="]')].flatMap(
      (node) => extractKnownGenresFromText(node.textContent ?? node.getAttribute('title') ?? ''),
    ),
    ...Array.from(
      html.matchAll(/<a[^>]+href=["'][^"']*[?&](?:genre|genres|tag|tags)=[^"']*["'][^>]*>([^<]+)<\/a>/gi),
      (match) => match[1],
    ).flatMap((value) => [...expandGenreText(value), ...extractKnownGenresFromText(value)]),
  ];
  if (layer3.length > 0) layers.push(layer3);
  const layer4 = [
    ...[...document.querySelectorAll('a[title*="genre" i], a[aria-label*="genre" i], a[class*="genre" i], a[class*="tag" i], span[class*="genre" i], span[class*="tag" i]')].flatMap(
      (node) => expandGenreText(node.textContent ?? node.getAttribute('title') ?? ''),
    ),
    ...[...document.querySelectorAll('a[title*="genre" i], a[aria-label*="genre" i], a[class*="genre" i], a[class*="tag" i], span[class*="genre" i], span[class*="tag" i]')].flatMap(
      (node) => extractKnownGenresFromText(node.textContent ?? node.getAttribute('title') ?? ''),
    ),
    ...Array.from(
      html.matchAll(/<span[^>]*class=["'][^"']*(?:genre|genres|tag|tags)[^"']*["'][^>]*>([^<]+)<\/span>/gi),
      (match) => match[1],
    ).flatMap((value) => [...expandGenreText(value), ...extractKnownGenresFromText(value)]),
    ...sectionCandidates,
  ];
  if (layer4.length > 0) layers.push(layer4);
  for (const layer of layers) {
    const found = filterMeaningfulGenres(layer);
    if (found.length > 0) return found;
  }
  return [];
}

function filterMeaningfulGenres(candidates: string[]) {
  const ignored = new Set([
    'genre',
    'genres',
    'tag',
    'tags',
    'type',
    'types',
    'format',
    'formats',
    'komik',
    'comic',
    'manga',
    'manhwa',
    'manhua',
    'webtoon',
    'webtoons',
    'novel',
    'lightnovel',
    'fullcolor',
    'adult',
    'ongoing',
    'completed',
    'finished',
    'sub',
    'indo',
    'indonesia',
  ]);
  return uniqueStrings(
    candidates
      .map((candidate) => candidate?.trim())
      .filter((candidate): candidate is string => Boolean(candidate))
      .filter((candidate) => {
        const normalized = normalizeComparableText(candidate);
        if (!normalized || ignored.has(normalized)) return false;
        if (normalized.length > 24) return false;
        if (/^\d+$/.test(normalized)) return false;
        if (normalized.includes('http') || normalized.includes('www')) return false;
        return true;
      }),
  );
}

function rankGenresByEvidence(genresBySource: string[][]) {
  const counts = new Map<string, number>();
  const firstSeen = new Map<string, number>();
  const displayByKey = new Map<string, string>();
  genresBySource.forEach((genres, sourceIndex) => {
    genres.forEach((genre) => {
      const key = normalizeComparableText(genre);
      if (!key) return;
      counts.set(key, (counts.get(key) ?? 0) + 1);
      if (!firstSeen.has(key)) firstSeen.set(key, sourceIndex);
      if (!displayByKey.has(key)) displayByKey.set(key, genre.trim());
    });
  });
  return Array.from(counts.entries())
    .sort((left, right) => {
      const countScore = right[1] - left[1];
      if (countScore !== 0) return countScore;
      return (firstSeen.get(left[0]) ?? 99) - (firstSeen.get(right[0]) ?? 99);
    })
    .map(([genre]) => displayByKey.get(genre) ?? genre);
}

function detectDomainSpecificGenres(hostname: string, html: string, document: Document) {
  if (hostname.includes('ryukomik.my.id')) {
    return filterMeaningfulGenres([
      ...[...document.querySelectorAll('.rk-shell a[href^="/genre/"], .rk-shell a[href*="/genre/"], .rk-shell a[href*="/genres/"]')].map(
        (node) => node.textContent,
      ),
      ...Array.from(html.matchAll(/<a[^>]+href=["'][^"']*\/genre\/[^"']+["'][^>]*>([^<]+)<\/a>/gi), (match) => match[1]),
      ...Array.from(html.matchAll(/<a[^>]+href=["'][^"']*\/genres?\/[^"']+["'][^>]*>([^<]+)<\/a>/gi), (match) => match[1]),
      ...Array.from(html.matchAll(/<a[^>]+href=["'][^"']*\/genre\/[^"']+["'][^>]*>([^<]+)<\/a>/gi), (match) => match[1]),
    ]);
  }
  if (hostname.includes('mangadistrict.')) {
    const typeItem = [...document.querySelectorAll('.post-content_item')].find((item) =>
      /^type$/i.test(item.querySelector('.summary-heading')?.textContent?.trim() ?? ''),
    );
    const typeValues =
      typeItem
        ?.querySelector('.summary-content')
        ?.textContent?.split(',')
        .map((value) => value.trim()) ?? [];
    const markdownGenreSection =
      html.match(
        /#{1,6}\s*Genre\(s\)\s*([\s\S]*?)(?=\n\s*>?\s*#{1,6}\s*(?:Type|Tag\(s\)|Chapters)(?:\s|$))/i,
      )?.[1] ?? '';
    const markdownGenres = Array.from(
      markdownGenreSection.matchAll(/\[([^\]]+)\]\([^)]*\/publication-genre\/[^)]+\)/gi),
      (match) => match[1].replace(/\s+/g, ' ').trim(),
    );
    const markdownTypeSection =
      html.match(
        /#{1,6}\s*Type\s*([\s\S]*?)(?=\n\s*>?\s*#{1,6}\s*(?:Tag\(s\)|Chapters|Release|Status)(?:\s|$))/i,
      )?.[1] ?? '';
    const markdownTypes = markdownTypeSection
      .replace(/^\s*>\s*/gm, '')
      .split(/[,|•·]+/)
      .map((value) => value.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    return uniqueStrings([
      ...[...document.querySelectorAll('.genres-content a')].map((node) => node.textContent),
      ...typeValues,
      ...markdownGenres,
      ...markdownTypes,
    ]);
  }
  if (hostname.includes('sektedoujin.') || hostname.includes('komiktap.')) {
    const candidates = uniqueStrings([
      ...[
        ...document.querySelectorAll(
          'a[href*="/genre/"], a[href*="/genres/"], .mgen a, .seriestugenre a, .genres a, [itemprop="genre"]',
        ),
      ].map((node) => node.textContent),
      ...Array.from(html.matchAll(/\[([^\]]+)\]\([^)]*\/genres?\/[^)]+\)/gi), (match) => match[1]),
      ...Array.from(
        html.matchAll(/\[([^\]]+)\]\([^)]*[?&]type=([^)&]+)[^)]*\)/gi),
        (match) => match[1] || match[2],
      ),
      ...Array.from(
        html.matchAll(/<a[^>]+href=["'][^"']*\/genres?\/[^"']+["'][^>]*>([^<]+)<\/a>/gi),
        (match) => match[1],
      ),
    ]);
    return candidates.filter((candidate) => !/^genres?$/i.test(candidate));
  }
  if (hostname.includes('komikindo.')) {
    return filterMeaningfulGenres([
      ...[...document.querySelectorAll('a[href*="/genre/"], a[href*="/genres/"], .genres a, .manga-info a, .infox a, .series-genres a')].map(
        (node) => node.textContent,
      ),
      ...Array.from(html.matchAll(/<a[^>]+href=["'][^"']*\/genre\/[^"']+["'][^>]*>([^<]+)<\/a>/gi), (match) => match[1]),
      ...Array.from(html.matchAll(/<span[^>]*class="[^"]*(?:genre|genres)[^"]*"[^>]*>([^<]+)<\/span>/gi), (match) => match[1]),
      ...Array.from(html.matchAll(/genre[^>]*>([^<]+)</gi), (match) => match[1]),
    ]);
  }
  if (hostname.includes('shinigami.asia')) {
    return filterMeaningfulGenres([
      ...[...document.querySelectorAll('a[href*="genre"], span.genre, .genres a, .tags a')].map(
        (node) => node.textContent,
      ),
      ...Array.from(html.matchAll(/genre[^>]*>([^<]+)</gi), (match) => match[1]),
    ]);
  }
  if (hostname.includes('webtoons.com')) {
    return filterMeaningfulGenres([
      ...[...document.querySelectorAll('a[href*="/genre/"], .genre, .genres a, .info_area a')].map(
        (node) => node.textContent,
      ),
      ...Array.from(
        html.matchAll(/<a[^>]+href="[^"]*\/genre\/[^"]+"[^>]*>([^<]+)<\/a>/gi),
        (match) => match[1],
      ),
      ...Array.from(
        html.matchAll(/<span[^>]*class="[^"]*(?:genre|tag)[^"]*"[^>]*>([^<]+)<\/span>/gi),
        (match) => match[1],
      ),
    ]);
  }
  return filterMeaningfulGenres([
    ...collectLabeledGenreCandidates(document),
    ...collectMetaGenreCandidates(html, document),
    ...collectMarkdownGenreCandidates(html),
    ...collectContentBlockGenreCandidates(document),
    ...collectRyukomikTitleGenreCandidates(document),
    ...collectGenericGenreLinkCandidates(document, html),
  ]);
}

function collectRyukomikTitleGenreCandidates(document: Document) {
  return filterMeaningfulGenres([
    ...[...document.querySelectorAll('.rk-shell a[href^="/genre/"], .rk-shell a[href*="/genres/"], .rk-shell a[href*="/genre/"]')].map(
      (node) => node.textContent ?? '',
    ),
  ]);
}

type ShinigamiTaxonomyItem = { name?: string };
type ShinigamiDetailResponse = {
  data?: {
    title?: string;
    description?: string;
    synopsis?: string;
    cover_image_url?: string;
    cover_portrait_url?: string;
    taxonomy?: Record<string, ShinigamiTaxonomyItem[]>;
  };
};

type KomiktapEmbedResponse = {
  title?: string;
  thumbnail_url?: string;
  thumbnail_width?: number;
  thumbnail_height?: number;
};

function parseShinigamiHtmlMetadata(html: string, document: Document, parsed: URL): DetectedMetadata | null {
  const title = uniqueStrings([
    document.querySelector('meta[property="og:title"]')?.getAttribute('content'),
    document.querySelector('meta[name="twitter:title"]')?.getAttribute('content'),
    document.querySelector('h1')?.textContent,
    document.querySelector('.series-title')?.textContent,
    document.querySelector('.post-title')?.textContent,
    document.querySelector('.entry-title')?.textContent,
    document.querySelector('title')?.textContent,
  ]).find(Boolean);
  const coverCandidates = uniqueStrings([
    document.querySelector('meta[property="og:image"]')?.getAttribute('content'),
    document.querySelector('meta[property="og:image:secure_url"]')?.getAttribute('content'),
    document.querySelector('meta[name="twitter:image"]')?.getAttribute('content'),
    document.querySelector('meta[name="twitter:image:src"]')?.getAttribute('content'),
    document.querySelector('img[alt*="cover" i]')?.getAttribute('src'),
    document.querySelector('img[alt*="poster" i]')?.getAttribute('src'),
    ...Array.from(html.matchAll(/["'](?:cover|poster|thumbnail|series_image|image)["']\s*:\s*["']([^"']+)["']/gi), (match) => match[1]),
    ...Array.from(html.matchAll(/(?:data-src|src)=["']([^"']+\.(?:jpe?g|png|webp)(?:\?[^"']*)?)["']/gi), (match) => match[1]),
  ])
    .map((candidate) => resolveUrl(parsed.toString(), candidate))
    .filter(Boolean) as string[];
  const genres = uniqueStrings([
    ...filterMeaningfulGenres([
      ...[...document.querySelectorAll('a[href*="genre"], a[href*="tag"], span.genre, .genres a, .tags a, [itemprop="genre"]')].map(
        (node) => node.textContent ?? node.getAttribute('title') ?? '',
      ),
      ...Array.from(html.matchAll(/genre[^>]*>([^<]+)</gi), (match) => match[1]),
    ]),
    ...filterMeaningfulGenres(
      Array.from(
        html.matchAll(/<meta[^>]+(?:property|name)=["'][^"']*(?:keywords|genre)[^"']*["'][^>]+content=["']([^"']+)/gi),
        (match) => match[1],
      ),
    ),
  ]);
  const description = cleanDescription(
    document.querySelector('meta[property="og:description"]')?.getAttribute('content') ??
      document.querySelector('meta[name="description"]')?.getAttribute('content') ??
      document.querySelector('.summary__content')?.textContent ??
      document.querySelector('.synopsis')?.textContent ??
      document.querySelector('.description')?.textContent ??
      document.querySelector('.series-description')?.textContent ??
      document.querySelector('.post-content')?.textContent ??
      document.querySelector('.entry-content')?.textContent ??
      null,
  ) ?? collectContentBlockDescriptionCandidates(document)[0] ?? null;
  if (!title && coverCandidates.length === 0 && genres.length === 0 && !description) return null;
  return {
    title: cleanDetectedTitle(title ?? humanizePathTitle(parsed.pathname), parsed.hostname),
    sourceName: 'Shinigami',
    description,
    coverUrl: coverCandidates[0] ?? null,
    coverCandidates,
    genres,
  };
}

async function detectKomiktapEmbed(parsed: URL) {
  const endpoint = new URL('/wp-json/oembed/1.0/embed', parsed.origin);
  endpoint.searchParams.set('url', parsed.toString());
  const response = await fetch(endpoint.toString(), { method: 'GET', cache: 'no-store' });
  if (!response.ok) throw new Error(`API oEmbed Komiktap gagal: ${response.status}`);
  return (await response.json()) as KomiktapEmbedResponse;
}

async function detectShinigamiMetadata(parsed: URL): Promise<DetectedMetadata | null> {
  const seriesId = parsed.pathname.match(/\/series\/([0-9a-f-]{20,})/i)?.[1];
  let apiMetadata: DetectedMetadata | null = null;
  if (seriesId) {
    try {
      const response = await fetch(`https://api.shngm.io/v1/manga/detail/${encodeURIComponent(seriesId)}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      if (response.ok) {
        const payload = (await response.json()) as ShinigamiDetailResponse;
        const data = payload.data;
        if (data?.title) {
          const coverCandidates = uniqueStrings([
            resolveUrl(parsed.toString(), data.cover_portrait_url),
            resolveUrl(parsed.toString(), data.cover_image_url),
          ]);
          const genres = uniqueStrings([
            ...(data.taxonomy?.Genre ?? []).map((item) => item.name),
            ...(data.taxonomy?.Format ?? []).map((item) => item.name),
          ]);
          apiMetadata = {
            title: cleanDetectedTitle(data.title, parsed.hostname),
            sourceName: 'Shinigami',
            description: cleanDescription(data.description ?? data.synopsis),
            coverUrl: coverCandidates[0] ?? null,
            coverCandidates,
            genres,
          };
          if (apiMetadata.description || apiMetadata.coverUrl || apiMetadata.genres.length > 0) return apiMetadata;
        }
      }
    } catch {
      // Fall through to the HTML fallback for mirrored Shinigami pages.
    }
  }
  const html = await fetchHtmlWithFallback(parsed.toString());
  const document = new DOMParser().parseFromString(html, 'text/html');
  return parseShinigamiHtmlMetadata(html, document, parsed) ?? apiMetadata;
}

function formatSupabaseError(error: unknown) {
  if (!error || typeof error !== 'object') return String(error);
  const parts: string[] = [];
  const record = error as Record<string, unknown>;
  if (typeof record.message === 'string' && record.message) parts.push(record.message);
  if (typeof record.details === 'string' && record.details) parts.push(`details: ${record.details}`);
  if (typeof record.hint === 'string' && record.hint) parts.push(`hint: ${record.hint}`);
  if (typeof record.code === 'string' && record.code) parts.push(`code: ${record.code}`);
  return parts.length > 0 ? parts.join(' | ') : JSON.stringify(error);
}

function isMissingColumnError(error: unknown, column: string) {
  if (!error || typeof error !== 'object') return false;
  const record = error as Record<string, unknown>;
  const message = typeof record.message === 'string' ? record.message.toLowerCase() : '';
  return record.code === 'PGRST204' && message.includes(column.toLowerCase());
}

async function requireUser() {
  if (!supabaseConfigured || !supabase) {
    throw new Error('Akun cloud belum dikonfigurasi.');
  }
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(formatSupabaseError(error));
  if (!data.user) throw new Error('Wajib login untuk masuk.');
  return data.user;
}

export async function getSession(): Promise<SessionInfo | null> {
  if (!supabaseConfigured || !supabase) return null;
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user?.email) return null;
  const username =
    (typeof user.user_metadata.username === 'string' && user.user_metadata.username.trim()) ||
    (typeof user.user_metadata.display_name === 'string' && user.user_metadata.display_name.trim()) ||
    '';
  const passwordChangedAt =
    typeof user.user_metadata.password_changed_at === 'string'
      ? user.user_metadata.password_changed_at
      : null;
  return { id: user.id, email: user.email, username, passwordChangedAt };
}

export async function updateProfileUsername(username: string) {
  if (!supabaseConfigured || !supabase) throw new Error('Akun cloud belum dikonfigurasi.');
  const normalizedUsername = username.trim();
  if (normalizedUsername.length < 2) throw new Error('Username minimal 2 karakter.');
  const { error } = await supabase.auth.updateUser({
    data: {
      username: normalizedUsername,
      display_name: normalizedUsername,
    },
  });
  if (error) throw new Error(formatSupabaseError(error));
}

export async function updateAccountPassword(password: string) {
  if (!supabaseConfigured || !supabase) throw new Error('Akun cloud belum dikonfigurasi.');
  if (password.length < 8) throw new Error('Password baru minimal 8 karakter.');
  const user = await requireUser();
  const lastChangedValue = user.user_metadata.password_changed_at;
  const lastChangedAt = typeof lastChangedValue === 'string' ? new Date(lastChangedValue).getTime() : 0;
  const cooldownEndsAt = lastChangedAt + 24 * 60 * 60 * 1000;
  if (lastChangedAt > 0 && Date.now() < cooldownEndsAt) {
    throw new Error('Password hanya dapat diganti satu kali dalam 24 jam.');
  }
  const changedAt = new Date().toISOString();
  const { error } = await supabase.auth.updateUser({
    password,
    data: { password_changed_at: changedAt },
  });
  if (error) throw new Error(formatSupabaseError(error));
}

export async function signIn(email: string, password: string) {
  if (!supabaseConfigured || !supabase) throw new Error('Akun cloud belum dikonfigurasi.');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(formatSupabaseError(error));
}

export async function signUp(email: string, password: string) {
  if (!supabaseConfigured || !supabase) throw new Error('Akun cloud belum dikonfigurasi.');
  const usernameGuess = email.trim().split('@')[0] || email.trim();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: usernameGuess,
        display_name: usernameGuess,
      },
    },
  });
  if (error) throw new Error(formatSupabaseError(error));
}

export async function requestPasswordReset(email: string) {
  if (!supabaseConfigured || !supabase) throw new Error('Akun cloud belum dikonfigurasi.');
  const normalizedEmail = email.trim();
  if (!normalizedEmail) throw new Error('Email wajib diisi.');
  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: `${window.location.origin}`,
  });
  if (error) throw new Error(formatSupabaseError(error));
}

export async function signOut() {
  if (!supabaseConfigured || !supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function loadLibrary(): Promise<LibrarySnapshot> {
  const user = await requireUser();
  const [comics, labels, genres, tags, collections, comicLabels, sources, progresses] = await Promise.all([
    supabase!.from('comics').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
    supabase!.from('library_labels').select('*').eq('user_id', user.id).order('name'),
    supabase!.from('library_genres').select('*').eq('user_id', user.id).order('name'),
    supabase!.from('library_tags').select('*').eq('user_id', user.id).order('name'),
    supabase!.from('library_collections').select('*').eq('user_id', user.id).order('name'),
    supabase!.from('comic_labels').select('*').eq('user_id', user.id),
    supabase!
      .from('comic_sources')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase!
      .from('reading_progresses')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false }),
  ]);

  if (comics.error) throw new Error(formatSupabaseError(comics.error));
  if (labels.error) throw new Error(formatSupabaseError(labels.error));
  if (genres.error) throw new Error(formatSupabaseError(genres.error));
  if (tags.error) throw new Error(formatSupabaseError(tags.error));
  if (collections.error) throw new Error(formatSupabaseError(collections.error));
  if (comicLabels.error) throw new Error(formatSupabaseError(comicLabels.error));
  if (sources.error) throw new Error(formatSupabaseError(sources.error));
  if (progresses.error) throw new Error(formatSupabaseError(progresses.error));

  const allLabels = [
    ...(labels.data ?? []),
    ...(genres.data ?? []).map((item) => ({ ...item, kind: 'genre' })),
    ...(tags.data ?? []).map((item) => ({ ...item, kind: 'tag' })),
    ...(collections.data ?? []).map((item) => ({ ...item, kind: 'collection' })),
  ];
  const labelMap = new Map<string, LibraryLabel>();
  for (const label of allLabels) {
    const key = `${label.kind}:${label.name.trim().toLowerCase()}`;
    if (!labelMap.has(key)) labelMap.set(key, label as LibraryLabel);
  }
  const mergedLabels = [...labelMap.values()].sort((a, b) => a.name.localeCompare(b.name));

  return {
    comics: comics.data ?? [],
    labels: mergedLabels,
    comicLabels: comicLabels.data ?? [],
    sources: sources.data ?? [],
    progresses: progresses.data ?? [],
  };
}

export async function addComic(input: ComicInput) {
  const user = await requireUser();
  const rating = Number.isFinite(input.rating) ? Math.max(0, Math.min(5, Math.round(input.rating ?? 0))) : 0;
  const payload = {
    user_id: user.id,
    title: input.title,
    source_url: input.sourceUrl ?? null,
    source_name: input.sourceName ?? null,
    cover_url: input.coverUrl ?? null,
    ...(input.coverStoragePath ? { cover_storage_path: input.coverStoragePath } : {}),
    favorite: input.favorite ?? false,
    genre: input.genre ?? null,
    collection: input.collection ?? null,
    history: input.history ?? null,
    rating,
    reading_status: input.readingStatus ?? 'wantToRead',
  };
  let { data, error } = await supabase!.from('comics').insert(payload).select('id').single();
  if (
    error &&
    (('cover_storage_path' in payload && isMissingColumnError(error, 'cover_storage_path')) ||
      isMissingColumnError(error, 'favorite') ||
      isMissingColumnError(error, 'rating'))
  ) {
    const {
      cover_storage_path: _ignoredPath,
      favorite: _ignoredFavorite,
      rating: _ignoredRating,
      ...legacyPayload
    } = payload;
    const retry = await supabase!.from('comics').insert(legacyPayload).select('id').single();
    data = retry.data;
    error = retry.error;
  }
  if (error) throw new Error(formatSupabaseError(error));
  return data?.id ?? null;
}

export async function updateComic(id: string, input: Partial<ComicInput>) {
  const user = await requireUser();
  const rating = input.rating !== undefined ? Math.max(0, Math.min(5, Math.round(input.rating))) : undefined;
  const payload = {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.sourceUrl !== undefined ? { source_url: input.sourceUrl || null } : {}),
    ...(input.sourceName !== undefined ? { source_name: input.sourceName || null } : {}),
    ...(input.coverUrl !== undefined ? { cover_url: input.coverUrl || null } : {}),
    ...(input.coverStoragePath !== undefined ? { cover_storage_path: input.coverStoragePath || null } : {}),
    ...(input.favorite !== undefined ? { favorite: input.favorite } : {}),
    ...(input.genre !== undefined ? { genre: input.genre || null } : {}),
    ...(input.collection !== undefined ? { collection: input.collection || null } : {}),
    ...(input.history !== undefined ? { history: input.history || null } : {}),
    ...(rating !== undefined ? { rating } : {}),
    ...(input.readingStatus !== undefined ? { reading_status: input.readingStatus } : {}),
    updated_at: new Date().toISOString(),
  };
  let { error } = await supabase!.from('comics').update(payload).eq('id', id).eq('user_id', user.id);
  if (
    error &&
    (('cover_storage_path' in payload && isMissingColumnError(error, 'cover_storage_path')) ||
      ('favorite' in payload && isMissingColumnError(error, 'favorite')) ||
      ('rating' in payload && isMissingColumnError(error, 'rating')))
  ) {
    const {
      cover_storage_path: _ignoredPath,
      favorite: _ignoredFavorite,
      rating: _ignoredRating,
      ...legacyPayload
    } = payload;
    const retry = await supabase!.from('comics').update(legacyPayload).eq('id', id).eq('user_id', user.id);
    error = retry.error;
  }
  if (error) throw new Error(formatSupabaseError(error));
}

export async function deleteComic(id: string) {
  const user = await requireUser();
  const { error } = await supabase!.from('comics').delete().eq('id', id).eq('user_id', user.id);
  if (error) throw new Error(formatSupabaseError(error));
}

export async function addLabel(name: string, kind = 'collection') {
  const user = await requireUser();
  const normalizedName = name.trim().toLowerCase();
  const basePayload = { user_id: user.id, name: name.trim() || name, normalized_name: normalizedName };
  const targetTable =
    kind === 'genre' ? 'library_genres' : kind === 'tag' ? 'library_tags' : 'library_collections';

  const [{ error: labelError }, { error: typedError }] = await Promise.all([
    supabase!.from('library_labels').insert({ ...basePayload, kind }),
    supabase!.from(targetTable).insert(basePayload),
  ]);
  if (labelError) throw new Error(formatSupabaseError(labelError));
  if (typedError) throw new Error(formatSupabaseError(typedError));
}

export async function updateLabel(
  id: string,
  name: string,
  kind: string,
  previousName: string,
  previousKind: string,
) {
  const user = await requireUser();
  const normalizedName = name.trim().toLowerCase();
  const previousTable = labelTable(previousKind);
  const targetTable = labelTable(kind);

  const { error: labelError } = await supabase!
    .from('library_labels')
    .update({ name: name.trim(), normalized_name: normalizedName, kind })
    .eq('id', id)
    .eq('user_id', user.id);
  if (labelError) throw new Error(formatSupabaseError(labelError));

  if (previousKind === 'genre' || previousKind === 'collection') {
    const column = previousKind === 'genre' ? 'genre' : 'collection';
    const replacement = kind === previousKind ? name.trim() : null;
    const { error: comicError } = await supabase!
      .from('comics')
      .update({ [column]: replacement, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq(column, previousName);
    if (comicError) throw new Error(formatSupabaseError(comicError));
  }

  const { error: removeTypedError } = await supabase!
    .from(previousTable)
    .delete()
    .eq('user_id', user.id)
    .eq('name', previousName);
  if (removeTypedError) throw new Error(formatSupabaseError(removeTypedError));

  const { error: typedError } = await supabase!
    .from(targetTable)
    .insert({ user_id: user.id, name: name.trim(), normalized_name: normalizedName });
  if (typedError) throw new Error(formatSupabaseError(typedError));
}

export async function deleteLabel(id: string, name: string, kind: string) {
  const user = await requireUser();
  const targetTable = labelTable(kind);

  const { error: linkError } = await supabase!
    .from('comic_labels')
    .delete()
    .eq('label_id', id)
    .eq('user_id', user.id);
  if (linkError) throw new Error(formatSupabaseError(linkError));

  if (kind === 'genre' || kind === 'collection') {
    const column = kind === 'genre' ? 'genre' : 'collection';
    const { error: comicError } = await supabase!
      .from('comics')
      .update({ [column]: null, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq(column, name);
    if (comicError) throw new Error(formatSupabaseError(comicError));
  }

  const [{ error: labelError }, { error: typedError }] = await Promise.all([
    supabase!.from('library_labels').delete().eq('id', id).eq('user_id', user.id),
    supabase!.from(targetTable).delete().eq('user_id', user.id).eq('name', name),
  ]);
  if (labelError) throw new Error(formatSupabaseError(labelError));
  if (typedError) throw new Error(formatSupabaseError(typedError));
}

function labelTable(kind: string) {
  return kind === 'genre' ? 'library_genres' : kind === 'tag' ? 'library_tags' : 'library_collections';
}

export async function updateProgress(comicId: string, pageIndex: number, chapterLabel?: string) {
  const user = await requireUser();
  const progress = {
    user_id: user.id,
    comic_id: comicId,
    page_index: pageIndex,
    chapter_label: chapterLabel ?? null,
  };
  let { error } = await supabase!.from('reading_progresses').insert(progress);
  if (requiresLegacyProgressFields(error)) {
    ({ error } = await supabase!.from('reading_progresses').insert({
      ...progress,
      ...legacyProgressFields(),
    }));
  }
  if (error) throw new Error(formatSupabaseError(error));
}

export async function setLastReadChapter(comicId: string, chapterLabel: string) {
  const user = await requireUser();
  const { data: latest, error: lookupError } = await supabase!
    .from('reading_progresses')
    .select('id')
    .eq('user_id', user.id)
    .eq('comic_id', comicId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lookupError) throw new Error(formatSupabaseError(lookupError));

  if (latest?.id) {
    const updatedAt = new Date().toISOString();
    let { error } = await supabase!
      .from('reading_progresses')
      .update({
        chapter_label: chapterLabel,
        page_index: 0,
        updated_at: updatedAt,
        client_updated_at: updatedAt,
      })
      .eq('id', latest.id)
      .eq('user_id', user.id);
    if (error && isMissingColumnError(error, 'client_updated_at')) {
      const retry = await supabase!
        .from('reading_progresses')
        .update({ chapter_label: chapterLabel, page_index: 0, updated_at: updatedAt })
        .eq('id', latest.id)
        .eq('user_id', user.id);
      error = retry.error;
    }
    if (error) throw new Error(formatSupabaseError(error));
    return;
  }

  await updateProgress(comicId, 0, chapterLabel);
}

export async function deleteReadingProgress(id: string) {
  const user = await requireUser();
  const { error } = await supabase!.from('reading_progresses').delete().eq('id', id).eq('user_id', user.id);
  if (error) throw new Error(formatSupabaseError(error));
}

export async function addComicSource(input: ComicSourceInput) {
  const user = await requireUser();
  const { error } = await supabase!.from('comic_sources').insert({
    user_id: user.id,
    comic_id: input.comicId,
    label: input.label,
    url: input.url,
  });
  if (error) throw new Error(formatSupabaseError(error));
}

export async function updateComicSource(id: string, input: ComicSourceUpdateInput) {
  const user = await requireUser();
  const { error } = await supabase!
    .from('comic_sources')
    .update({
      label: input.label,
      url: input.url,
    })
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) throw new Error(formatSupabaseError(error));
}

export async function addComicLabel(input: ComicLabelInput) {
  const user = await requireUser();
  const { error } = await supabase!.from('comic_labels').insert({
    user_id: user.id,
    comic_id: input.comicId,
    label_id: input.labelId,
  });
  if (error) throw error;
}

export async function removeComicLabel(input: ComicLabelInput) {
  const user = await requireUser();
  const { error } = await supabase!
    .from('comic_labels')
    .delete()
    .eq('comic_id', input.comicId)
    .eq('label_id', input.labelId)
    .eq('user_id', user.id);
  if (error) throw error;
}

export async function exportLibraryJson() {
  const snapshot = await loadLibrary();
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      ...snapshot,
    },
    null,
    2,
  );
}

export async function exportLibraryBundle() {
  const snapshot = await loadLibrary();
  const zip = new JSZip();
  zip.file(
    'manifest.json',
    JSON.stringify(
      {
        format: 'arsip-buku-gua-web',
        exportedAt: new Date().toISOString(),
        version: 1,
      },
      null,
      2,
    ),
  );
  zip.file('library.json', JSON.stringify(snapshot, null, 2));
  return zip.generateAsync({ type: 'blob' });
}

export async function importLibraryJson(jsonText: string) {
  const user = await requireUser();
  const parsed = JSON.parse(jsonText) as Partial<LibrarySnapshot> & { comics?: Comic[] };
  const comics = Array.isArray(parsed.comics) ? parsed.comics : [];
  const labels = Array.isArray(parsed.labels) ? parsed.labels : [];
  const comicLabels = Array.isArray(parsed.comicLabels) ? parsed.comicLabels : [];
  const sources = Array.isArray(parsed.sources) ? parsed.sources : [];
  const progresses = Array.isArray(parsed.progresses) ? parsed.progresses : [];
  for (const comic of comics) {
    await supabase!.from('comics').upsert({
      ...comic,
      user_id: user.id,
    });
  }
  for (const label of labels) {
    await supabase!.from('library_labels').upsert({
      ...label,
      user_id: user.id,
    });
  }
  for (const source of sources) {
    await supabase!.from('comic_sources').upsert({
      ...source,
      user_id: user.id,
    });
  }
  for (const relation of comicLabels) {
    await supabase!.from('comic_labels').upsert({
      ...relation,
      user_id: user.id,
    });
  }
  for (const progress of progresses) {
    const restoredProgress = {
      ...progress,
      user_id: user.id,
    };
    let { error } = await supabase!.from('reading_progresses').upsert(restoredProgress);
    if (requiresLegacyProgressFields(error)) {
      ({ error } = await supabase!.from('reading_progresses').upsert({
        ...restoredProgress,
        ...legacyProgressFields(),
      }));
    }
    if (error) throw new Error(formatSupabaseError(error));
  }
}

export async function importLibraryBundle(file: File) {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const library = zip.file('library.json');
  if (library) {
    await importLibraryJson(await library.async('string'));
  }
}

export async function detectMetadata(url: string): Promise<DetectedMetadata> {
  const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
  const sourceName = normalizeSourceName(parsed.hostname);
  const hostname = parsed.hostname.replace(/^www\./, '').toLowerCase();
  let komiktapEmbed: KomiktapEmbedResponse | null = null;
  if (hostname.includes('komiktap.')) {
    try {
      komiktapEmbed = await detectKomiktapEmbed(parsed);
    } catch {
      // Continue to the HTML fallbacks when the WordPress endpoint is unavailable.
    }
  }
  const komiktapEmbedCover = resolveUrl(parsed.toString(), komiktapEmbed?.thumbnail_url);
  try {
    if (parsed.hostname.toLowerCase().includes('shinigami.asia')) {
      try {
        const metadata = await detectShinigamiMetadata(parsed);
        if (metadata) return metadata;
      } catch {
        // Continue to the generic HTML and reader-proxy fallbacks when the API is unavailable.
      }
    }
    const html = await fetchHtmlWithFallback(parsed.toString());
    const document = new DOMParser().parseFromString(html, 'text/html');
    const meta = (selector: string) => document.querySelector(selector)?.getAttribute('content');
    const title =
      komiktapEmbed?.title ??
      meta('meta[property="og:title"]') ??
      meta('meta[name="twitter:title"]') ??
      extractMarkdownTitle(html)[0] ??
      document.querySelector('title')?.textContent ??
      humanizePathTitle(parsed.pathname) ??
      'Komik';
    const titleText = cleanDetectedTitle(title, hostname);
    const coverCandidates = collectAggressiveCandidates(html, document, parsed.toString());
    const domainCover = detectDomainSpecificCover(
      hostname,
      html,
      document,
      parsed.toString(),
      coverCandidates,
    );
    const domainTitle = detectDomainSpecificTitle(hostname, html, document, titleText);
    const domainGenres = detectDomainSpecificGenres(hostname, html, document);
    const description = detectPageDescription(html, document);
    const metaGenres = filterMeaningfulGenres([
      ...collectLabeledGenreCandidates(document),
      ...Array.from(html.matchAll(/genre[^>]*content=["']([^"']+)/gi), (match) => match[1]),
      ...Array.from(
        html.matchAll(/<meta[^>]+(?:property|name)=["'][^"']*genre[^"']*["'][^>]+content=["']([^"']+)/gi),
        (match) => match[1],
      ),
    ]);
    const markdownGenres = collectMarkdownGenreCandidates(html);
    const genericGenres = collectGenericGenreLinkCandidates(document, html);
    const mergedGenres = rankGenresByEvidence([domainGenres, metaGenres, markdownGenres, genericGenres]);
    // Merge every successful strategy while keeping the domain API result first.
    const coverUrl = pickBestCoverFromCandidates([komiktapEmbedCover, domainCover, ...coverCandidates].filter(Boolean) as string[]);
    const finalCoverCandidates = hostname.includes('mangaplus.shueisha.co.jp')
      ? uniqueStrings([domainCover, coverUrl].filter(Boolean) as string[])
      : hostname.includes('komiktap.')
        ? uniqueStrings(
            [
              komiktapEmbedCover,
              domainCover,
              document.querySelector('.thumb[itemprop="image"] img')?.getAttribute('src'),
              document.querySelector('.thumb img.wp-post-image')?.getAttribute('src'),
              document.querySelector('meta[property="og:image:secure_url"]')?.getAttribute('content'),
              document.querySelector('meta[property="og:image"]')?.getAttribute('content'),
              document.querySelector('meta[name="twitter:image"]')?.getAttribute('content'),
            ]
              .map((candidate) => resolveUrl(parsed.toString(), candidate))
              .filter(Boolean) as string[],
          )
        : hostname.includes('sektedoujin.')
          ? uniqueStrings(
              [domainCover, ...collectSektedoujinPageCovers(html, document, parsed.toString())].filter(
                Boolean,
              ) as string[],
            )
          : hostname.includes('mangadistrict.')
            ? uniqueStrings(
                [domainCover, ...collectMangaDistrictPageCovers(html, document, parsed.toString())].filter(
                  Boolean,
                ) as string[],
              )
            : uniqueStrings([domainCover, coverUrl, ...coverCandidates].filter(Boolean) as string[]);
    return {
      title: domainTitle,
      sourceName,
      description,
      coverUrl,
      coverCandidates: finalCoverCandidates,
      genres: mergedGenres,
    };
  } catch {
    return {
      title:
        cleanDetectedTitle(komiktapEmbed?.title, hostname) || humanizePathTitle(parsed.pathname) || 'Komik',
      sourceName,
      description: null,
      coverUrl: komiktapEmbedCover,
      coverCandidates: komiktapEmbedCover ? [komiktapEmbedCover] : [],
      genres: [],
    };
  }
}

export async function previewPublication(file: File): Promise<PublicationPreview> {
  const kind = detectPublicationKind(file.name, file.type);
  if (kind === 'pdf') {
    return {
      items: [{ name: file.name, kind: 'pdf', url: URL.createObjectURL(file) }],
      kind,
      title: stripExtension(file.name),
    };
  }
  if (kind === 'image') {
    return {
      items: [{ name: file.name, kind: 'image', url: URL.createObjectURL(file) }],
      kind,
      title: stripExtension(file.name),
    };
  }
  if (kind === 'zip') {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const items: PublicationItem[] = [];
    const entries = Object.values(zip.files)
      .filter((entry) => !entry.dir)
      .filter((entry) => /\.(png|jpe?g|webp|gif|bmp)$/i.test(entry.name))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    for (const entry of entries) {
      const blob = await entry.async('blob');
      items.push({
        name: entry.name,
        kind: 'image',
        url: URL.createObjectURL(blob),
      });
    }
    return {
      items,
      kind,
      title: stripExtension(file.name),
    };
  }
  if (kind === 'epub') {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
    const containerXml = await zip.file('META-INF/container.xml')?.async('string');
    const rootPath = containerXml && parser.parse(containerXml)?.container?.rootfiles?.rootfile?.full_path;
    const opfXml = rootPath ? await zip.file(String(rootPath))?.async('string') : null;
    const opf = opfXml ? parser.parse(opfXml) : null;
    const spineIds = toArray(opf?.package?.spine?.itemref)
      .map((entry) => entry.idref)
      .filter(Boolean);
    const manifest = toArray(opf?.package?.manifest?.item);
    const hrefById = new Map(
      manifest
        .map((entry) => ({ id: entry.id, href: entry.href }))
        .filter((entry) => entry.id && entry.href)
        .map((entry) => [entry.id, entry.href] as const),
    );
    const baseDir = rootPath ? String(rootPath).split('/').slice(0, -1).join('/') : '';
    const items: PublicationItem[] = [];
    for (const id of spineIds) {
      const href = hrefById.get(id);
      if (!href) continue;
      const path = baseDir ? `${baseDir}/${href}` : href;
      const content = await zip.file(path)?.async('string');
      if (!content) continue;
      const text = content
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      items.push({
        name: href,
        kind: 'text',
        url: `data:text/plain;charset=utf-8,${encodeURIComponent(text.slice(0, 50000))}`,
      });
    }
    return {
      items,
      kind,
      title: stripExtension(file.name),
    };
  }
  return {
    items: [{ name: file.name, kind: 'unknown', url: URL.createObjectURL(file) }],
    kind: 'unknown',
    title: stripExtension(file.name),
  };
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function detectPublicationKind(name: string, mimeType: string): PublicationKind {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(ext)) {
    return 'image';
  }
  if (mimeType === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (ext === 'cbz' || ext === 'zip') return 'zip';
  if (ext === 'epub') return 'epub';
  return 'unknown';
}

function stripExtension(name: string) {
  return name.replace(/\.[^.]+$/, '');
}

export async function importLocalFile(file: File) {
  await delay(250);
  return {
    name: file.name,
    size: file.size,
    type: file.type || 'application/octet-stream',
  };
}
