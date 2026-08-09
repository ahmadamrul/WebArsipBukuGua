export function formatShortDate(value: string | null | undefined, locale: 'id' | 'en') {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat(locale === 'id' ? 'id-ID' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatCooldown(milliseconds: number, locale: 'id' | 'en' = 'id') {
  const totalMinutes = Math.max(1, Math.ceil(milliseconds / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (locale === 'en') return hours > 0 ? `${hours} hr ${minutes} min` : `${minutes} min`;
  return hours > 0 ? `${hours} jam ${minutes} menit` : `${minutes} menit`;
}
