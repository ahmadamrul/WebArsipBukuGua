import { getPasswordRequirementState } from '../utils';
import { PASSWORD_MIN_LENGTH } from '../../../lib/constants/limits';
import type { Locale } from '../../settings/types';

type PasswordRequirementsProps = {
  password: string;
  locale: Locale;
  compact?: boolean;
};

export function PasswordRequirements({ password, locale, compact = false }: PasswordRequirementsProps) {
  const state = getPasswordRequirementState(password);
  const items = [
    {
      label:
        locale === 'id'
          ? `Minimum ${PASSWORD_MIN_LENGTH} karakter`
          : `Minimum ${PASSWORD_MIN_LENGTH} characters`,
      ok: state.length,
    },
    { label: locale === 'id' ? 'Huruf kecil' : 'Lowercase letter', ok: state.lowercase },
    { label: locale === 'id' ? 'Huruf besar' : 'Uppercase letter', ok: state.uppercase },
    { label: locale === 'id' ? 'Angka' : 'Number', ok: state.digit },
  ];

  return (
    <div className={compact ? 'password-requirements compact' : 'password-requirements'}>
      <div className="password-requirements-head">
        <strong>{locale === 'id' ? 'Syarat password' : 'Password requirements'}</strong>
        <span>
          {locale === 'id'
            ? 'Password harus berisi huruf kecil, huruf besar, dan angka.'
            : 'Password must include lowercase, uppercase, and digits.'}
        </span>
      </div>
      <div className="password-requirements-list">
        {items.map((item) => (
          <div key={item.label} className={item.ok ? 'password-requirement ok' : 'password-requirement'}>
            <span className="password-requirement-bullet" aria-hidden="true" />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
