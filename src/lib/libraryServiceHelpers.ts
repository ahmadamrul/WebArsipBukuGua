import { STORAGE_KEYS } from './constants/storageKeys';

export const COVER_BUCKET = 'covers';
export const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const COVER_MAX_DIMENSION = 1024;
const COVER_MIN_DIMENSION = 320;
const COVER_TARGET_BYTES = 180 * 1024;

export function getWebDeviceId() {
  try {
    const existing = window.localStorage.getItem(STORAGE_KEYS.webDeviceId);
    if (existing) return existing;
    const deviceId = `web-${crypto.randomUUID()}`;
    window.localStorage.setItem(STORAGE_KEYS.webDeviceId, deviceId);
    return deviceId;
  } catch {
    return 'web-browser';
  }
}

export function requiresLegacyProgressFields(
  error: { code?: string; message?: string; details?: string } | null,
) {
  if (!error) return false;
  const description = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
  return (
    error.code === '23502' && (description.includes('device_id') || description.includes('client_updated_at'))
  );
}

export function legacyProgressFields() {
  return {
    device_id: getWebDeviceId(),
    client_updated_at: new Date().toISOString(),
    revision: 1,
  };
}

const GENERIC_SUBDOMAIN_TOKENS = new Set([
  'www', 'cdn', 'img', 'image', 'images', 'static', 'assets', 'api', 'm', 'mobile', 'app', 'web', 'read', 'reader',
]);

export function normalizeSourceName(hostname: string) {
  if (hostname.includes('shinigami.asia')) return 'Shinigami';

  const parts = hostname.replace(/^www\./, '').toLowerCase().split('.').filter(Boolean);
  const isVersionToken = (token: string) => /^v?\d+$/i.test(token);

  // Pick the most meaningful label: skip the TLD (last part), generic
  // infra subdomains (cdn, api, ...), and version-style subdomains
  // (v1, v2, v3, or bare numbers like the "11" in 11.shinigami.asia)
  // so mirrors like "v3.komikcast.fit" resolve to "Komikcast", not "V3".
  const candidate = parts.find(
    (token, index) => index < parts.length - 1 && !GENERIC_SUBDOMAIN_TOKENS.has(token) && !isVersionToken(token),
  );

  // Strip a trailing numeric mirror suffix (komikcast02 -> komikcast) so
  // different mirrors of the same site normalize to the same source name.
  const base = (candidate ?? parts[0] ?? 'Sumber').replace(/\d+$/, '') || candidate || 'Sumber';
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export function isChallengePage(html: string) {
  const sample = html.slice(0, 12000).toLowerCase();
  return (
    sample.includes('<title>just a moment') ||
    sample.includes('title: just a moment') ||
    sample.includes('just a moment...') ||
    sample.includes('cf-chl-') ||
    sample.includes('challenge-platform') ||
    sample.includes('checking your browser') ||
    sample.includes('enable javascript and cookies to continue')
  );
}

export function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

export function cleanDescription(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new DOMParser().parseFromString(value, 'text/html');
  const text = (parsed.body.textContent || value)
    .replace(/^\s*(?:sinopsis(?:\s+lengkap)?|synopsis|description|deskripsi)\s*:?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length < 20) return null;
  return text.slice(0, 3000);
}

export function detectPageDescription(html: string, document: Document) {
  // Strict form: heading on its own line, followed by a blank line, then the body.
  const strictMarkdownSynopsis = html.match(
    /(?:^|\n)(?:#{1,4}\s*)?(?:Sinopsis(?:\s+Lengkap)?|Synopsis|Description|Deskripsi)\s*:?\s*\n+([\s\S]{20,3000}?)(?=\n#{1,4}\s|\n(?:Chapter|Daftar\s+Chapter)\b|$)/i,
  )?.[1];
  // Looser form: heading and body share a line (common in reader-proxy Markdown
  // output that doesn't insert a line break after the label), e.g.
  // "Sinopsis Demon and Angel run a bakery together..." or "Synopsis: ...".
  const looseMarkdownSynopsis = html.match(
    /(?:Sinopsis(?:\s+Lengkap)?|Synopsis|Description|Deskripsi)\s*:?\s+([^\n]{20,1000})/i,
  )?.[1];
  const candidates = [
    document.querySelector('.rk-shell .line-clamp-3')?.textContent,
    document.querySelector('.rk-shell p.line-clamp-3')?.textContent,
    document.querySelector('.rk-shell [class*="line-clamp"]')?.textContent,
    document.querySelector('.sinopsis-content')?.textContent,
    document.querySelector('.komik_info-description-sinopsis p')?.textContent,
    document.querySelector('.komik_info-description-sinopsis')?.textContent,
    document.querySelector('.entry-content p')?.textContent,
    document.querySelector('.entry-content')?.textContent,
    document.querySelector('.manga-info .desc')?.textContent,
    document.querySelector('.manga-info .summary')?.textContent,
    document.querySelector('.infox .summary')?.textContent,
    document.querySelector('meta[property="og:description"]')?.getAttribute('content'),
    document.querySelector('meta[name="description"]')?.getAttribute('content'),
    document.querySelector('meta[name="twitter:description"]')?.getAttribute('content'),
    document.querySelector('[itemprop="description"]')?.getAttribute('content'),
    document.querySelector('[itemprop="description"]')?.textContent,
    document.querySelector('#Sinopsis')?.textContent,
    document.querySelector('#sinopsis')?.textContent,
    document.querySelector('.sinopsis')?.textContent,
    document.querySelector('.synopsis')?.textContent,
    document.querySelector('.summary__content')?.textContent,
    document.querySelector('.description')?.textContent,
    strictMarkdownSynopsis,
    looseMarkdownSynopsis,
  ];
  return candidates.map(cleanDescription).find(Boolean) ?? null;
}

export function resolveUrl(baseUrl: string, candidate: string | null | undefined) {
  if (!candidate) return null;
  const trimmed = decodeHtmlEntities(candidate.trim()).replace(/[\])}>.,;]+$/g, '');
  if (!trimmed) return null;
  if (/^(data:|blob:|javascript:)/i.test(trimmed)) return null;
  try {
    return new URL(trimmed, baseUrl).toString();
  } catch {
    return null;
  }
}

export function scoreCoverCandidate(url: string) {
  const lower = url.toLowerCase();
  let score = 0;
  if (lower.includes('og:image') || lower.includes('twitter:image')) score += 60;
  if (lower.includes('cover') || lower.includes('poster') || lower.includes('thumbnail')) score += 35;
  if (lower.includes('webtoon-phinf') || lower.includes('pstatic.net')) score += 30;
  if (lower.includes('/uploads/') || lower.includes('/images/')) score += 18;
  if (lower.includes('thumb') || lower.includes('thumb_')) score += 12;
  if (/\b(?:fav|favicon|apple-touch-icon|icon|logo|brand|badge|sprite|avatar|profile|avatar)\b/.test(lower))
    score -= 120;
  if (/(?:^|[\/_.-])(?:logo|icon|fav|favicon)(?:[\/_.-]|$)/.test(lower)) score -= 80;
  if (
    lower.includes('logo') ||
    lower.includes('sprite') ||
    lower.includes('icon') ||
    lower.includes('button')
  )
    score -= 80;
  if (lower.includes('avatar') || lower.includes('profile')) score -= 30;
  if (lower.includes('1x1') || lower.includes('spacer')) score -= 100;
  if (/[\?&](?:w|width|h|height)=?(?:16|24|32|48|50|64|80|96|100|120)(?:&|$)/.test(lower)) score -= 50;
  if (/\b(?:16x16|32x32|48x48|64x64|96x96)\b/.test(lower)) score -= 120;
  return score;
}

export function parseSrcset(srcset: string) {
  return srcset
    .split(',')
    .map((entry) => entry.trim().split(/\s+/)[0])
    .filter(Boolean);
}

async function blobToDataUrl(blob: Blob) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Gagal membaca blob.'));
    reader.readAsDataURL(blob);
  });
}

async function decodeImageFromBlob(blob: Blob) {
  if ('createImageBitmap' in window) return await createImageBitmap(blob);
  const dataUrl = await blobToDataUrl(blob);
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Gagal memuat gambar.'));
    image.src = dataUrl;
  });
}

function getImageSize(image: ImageBitmap | HTMLImageElement) {
  return { width: image.width, height: image.height };
}

async function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Gagal mengonversi gambar.'));
          return;
        }
        resolve(blob);
      },
      type,
      quality,
    );
  });
}

export async function optimizeCoverBlob(sourceBlob: Blob) {
  const image = await decodeImageFromBlob(sourceBlob);
  const { width, height } = getImageSize(image);
  const scale = Math.min(1, COVER_MAX_DIMENSION / Math.max(width, height));
  const targetWidth = Math.max(COVER_MIN_DIMENSION, Math.round(width * scale));
  const targetHeight = Math.max(COVER_MIN_DIMENSION, Math.round(height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas tidak tersedia.');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image as CanvasImageSource, 0, 0, targetWidth, targetHeight);
  const supportsWebp = canvas.toDataURL('image/webp').startsWith('data:image/webp');
  const mimeType = supportsWebp ? 'image/webp' : 'image/jpeg';
  const qualities = supportsWebp ? [0.82, 0.72, 0.62, 0.52] : [0.9, 0.8, 0.7, 0.6];
  let bestBlob = await canvasToBlob(canvas, mimeType, qualities[0]);
  for (const quality of qualities.slice(1)) {
    if (bestBlob.size <= COVER_TARGET_BYTES) break;
    bestBlob = await canvasToBlob(canvas, mimeType, quality);
  }
  if (bestBlob.size > COVER_TARGET_BYTES && Math.max(targetWidth, targetHeight) > 640) {
    const smallerScale = 640 / Math.max(targetWidth, targetHeight);
    const smallerCanvas = document.createElement('canvas');
    smallerCanvas.width = Math.max(1, Math.round(targetWidth * smallerScale));
    smallerCanvas.height = Math.max(1, Math.round(targetHeight * smallerScale));
    const smallerContext = smallerCanvas.getContext('2d');
    if (smallerContext) {
      smallerContext.imageSmoothingEnabled = true;
      smallerContext.imageSmoothingQuality = 'high';
      smallerContext.drawImage(canvas, 0, 0, smallerCanvas.width, smallerCanvas.height);
      bestBlob = await canvasToBlob(smallerCanvas, mimeType, qualities.at(-1) ?? 0.6);
    }
  }
  return { blob: bestBlob, mimeType: bestBlob.type || mimeType, width: canvas.width, height: canvas.height };
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes)) return '-';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let size = bytes / 1024;
  let unit = units[0];
  for (const nextUnit of units) {
    unit = nextUnit;
    if (size < 1024 || nextUnit === units[units.length - 1]) break;
    size /= 1024;
  }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${unit}`;
}

export function guessCoverExtension(mimeType: string) {
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('png')) return 'png';
  return 'jpg';
}
