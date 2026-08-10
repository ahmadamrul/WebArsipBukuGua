import { toErrorMessage } from '../../lib/utils/errors';
import { PASSWORD_MIN_LENGTH } from '../../lib/constants/limits';

function getAuthErrorCode(error: unknown) {
  if (!error || typeof error !== 'object') return '';
  const record = error as Record<string, unknown>;
  return typeof record.code === 'string' ? record.code.toLowerCase() : '';
}

export function normalizeAuthError(error: unknown, fallbackPrefix: string) {
  const raw = toErrorMessage(error);
  const lower = raw.toLowerCase();
  const code = getAuthErrorCode(error);
  if (
    lower.includes('already registered') ||
    lower.includes('already exists') ||
    lower.includes('user already exists') ||
    code === 'email_exists'
  ) {
    return 'Email sudah terdaftar. Coba login atau gunakan lupa sandi.';
  }
  if (
    lower.includes('invalid login credentials') ||
    lower.includes('email not confirmed') ||
    code === 'invalid_credentials' ||
    code === 'email_not_confirmed'
  ) {
    return 'Email atau password salah, atau email belum diverifikasi.';
  }
  if (lower.includes('rate limit') || lower.includes('429') || code === 'over_sms_send_rate_limit') {
    if (lower.includes('recover') || lower.includes('reset') || lower.includes('password')) {
      return 'Anda terlalu sering mengirim link reset password. Coba lagi nanti.';
    }
    return 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.';
  }
  if (lower.includes('forbidden') || code === 'provider_disabled') return 'Akses ditolak. Cek konfigurasi Auth di Supabase.';
  if (raw.trim() === '{}' || lower === '[object object]') {
    return `${fallbackPrefix}: kesalahan auth tidak dikenal`;
  }
  return `${fallbackPrefix}: ${raw}`;
}

export function getPasswordRequirementState(password: string) {
  return {
    length: password.length >= PASSWORD_MIN_LENGTH,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    digit: /\d/.test(password),
  };
}

export function isPasswordStrongEnough(password: string) {
  const state = getPasswordRequirementState(password);
  return state.length && state.lowercase && state.uppercase && state.digit;
}
