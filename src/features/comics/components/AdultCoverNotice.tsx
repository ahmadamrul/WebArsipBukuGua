import type { Locale } from '../../settings/types';

export function AdultCoverNotice({ locale }: { locale: Locale }) {
  return (
    <span className="adult-cover-notice">
      <b>18+</b>
      <small>{locale === 'id' ? 'Gambar disembunyikan' : 'Image hidden'}</small>
    </span>
  );
}
