import { toErrorMessage } from '../../lib/utils/errors';
import { PASSWORD_MIN_LENGTH } from '../../lib/constants/limits';

export function normalizeAuthError(error: unknown, fallbackPrefix: string) {
  const raw = toErrorMessage(error);
  const lower = raw.toLowerCase();
  if (
    lower.includes('already registered') ||
    lower.includes('already exists') ||
    lower.includes('user already exists')
  ) {
    return 'Email sudah terdaftar. Coba login atau gunakan lupa sandi.';
  }
  if (lower.includes('invalid login credentials') || lower.includes('email not confirmed')) {
    return 'Email atau password salah, atau email belum diverifikasi.';
  }
  if (lower.includes('rate limit') || lower.includes('429')) {
    if (lower.includes('recover') || lower.includes('reset') || lower.includes('password')) {
      return 'Anda terlalu sering mengirim link reset password. Coba lagi nanti.';
    }
    return 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.';
  }
  if (lower.includes('forbidden')) return 'Akses ditolak. Cek konfigurasi Auth di Supabase.';
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
