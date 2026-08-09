import { supabase } from '../../../lib/api/supabaseClient';

function formatSupabaseError(error: unknown) {
  if (!error || typeof error !== 'object') return String(error);
  const record = error as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof record.message === 'string' && record.message) parts.push(record.message);
  if (typeof record.details === 'string' && record.details) parts.push(`details: ${record.details}`);
  if (typeof record.hint === 'string' && record.hint) parts.push(`hint: ${record.hint}`);
  if (typeof record.code === 'string' && record.code) parts.push(`code: ${record.code}`);
  return parts.length > 0 ? parts.join(' | ') : JSON.stringify(error);
}

async function requireUser() {
  const { data, error } = await supabase!.auth.getUser();
  if (error) throw new Error(formatSupabaseError(error));
  if (!data.user) throw new Error('Wajib login untuk masuk.');
  return data.user;
}

export async function addComicSource(input: { comicId: string; label: string; url: string }) {
  const user = await requireUser();
  const { error } = await supabase!.from('comic_sources').insert({
    user_id: user.id,
    comic_id: input.comicId,
    label: input.label,
    url: input.url,
  });
  if (error) throw new Error(formatSupabaseError(error));
}

export async function updateComicSource(id: string, input: { label?: string; url?: string }) {
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
