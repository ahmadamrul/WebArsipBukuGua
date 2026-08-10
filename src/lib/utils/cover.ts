export function hasUsableCoverUrl(value: string | null | undefined) {
  if (!value) return false;
  return /^(https?:|data:|blob:)/i.test(value.trim());
}

export function getAllCoverUrls(comic: any): string[] {
  const urls: string[] = [];

  // Add cover_urls array if available
  if (Array.isArray(comic.cover_urls)) {
    urls.push(...comic.cover_urls.filter((url: any) => typeof url === 'string' && hasUsableCoverUrl(url)));
  }

  // Add cover_url as fallback if not already in the list
  if (comic.cover_url && hasUsableCoverUrl(comic.cover_url) && !urls.includes(comic.cover_url)) {
    urls.push(comic.cover_url);
  }

  return urls;
}

export function getPrimaryCoverUrl(comic: any): string | null {
  const urls = getAllCoverUrls(comic);
  return urls.length > 0 ? urls[0] : null;
}
