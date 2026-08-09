export function hasUsableCoverUrl(value: string | null | undefined) {
  if (!value) return false;
  return /^(https?:|data:|blob:)/i.test(value.trim());
}
