import type { SessionInfo } from '../types/api';
import { supabase, supabaseConfigured } from './supabaseClient';

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
