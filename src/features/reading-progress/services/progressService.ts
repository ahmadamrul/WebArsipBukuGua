import { supabase } from '../../../lib/api/supabaseClient';
import { legacyProgressFields, requiresLegacyProgressFields } from '../../../lib/libraryServiceHelpers';

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

export async function deleteReadingProgress(id: string) {
  const user = await requireUser();
  const { error } = await supabase!.from('reading_progresses').delete().eq('id', id).eq('user_id', user.id);
  if (error) throw new Error(formatSupabaseError(error));
}

export async function setLastReadChapter(comicId: string, chapterLabel: string) {
  const user = await requireUser();
  const { data: latest, error: lookupError } = await supabase!
    .from('reading_progresses')
    .select('id')
    .eq('user_id', user.id)
    .eq('comic_id', comicId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lookupError) throw new Error(formatSupabaseError(lookupError));

  if (latest?.id) {
    const updatedAt = new Date().toISOString();
    let { error } = await supabase!
      .from('reading_progresses')
      .update({
        chapter_label: chapterLabel,
        page_index: 0,
        updated_at: updatedAt,
        client_updated_at: updatedAt,
      })
      .eq('id', latest.id)
      .eq('user_id', user.id);
    if (error && requiresLegacyProgressFields(error)) {
      const retry = await supabase!
        .from('reading_progresses')
        .update({ chapter_label: chapterLabel, page_index: 0, updated_at: updatedAt })
        .eq('id', latest.id)
        .eq('user_id', user.id);
      error = retry.error;
    }
    if (error) throw new Error(formatSupabaseError(error));
    return;
  }

  const progress = {
    user_id: user.id,
    comic_id: comicId,
    page_index: 0,
    chapter_label: chapterLabel,
  };
  let { error } = await supabase!.from('reading_progresses').insert(progress);
  if (requiresLegacyProgressFields(error)) {
    ({ error } = await supabase!.from('reading_progresses').insert({
      ...progress,
      ...legacyProgressFields(),
    }));
  }
  if (error) throw new Error(formatSupabaseError(error));
}
