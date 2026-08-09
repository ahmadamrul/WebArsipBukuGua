import type { LibrarySnapshot } from '../types/api';
import type { LibraryLabel } from '../domain/label';
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

export async function loadLibrary(): Promise<LibrarySnapshot> {
  const user = await requireUser();
  const [comics, labels, genres, tags, collections, comicLabels, sources, progresses] = await Promise.all([
    supabase!.from('comics').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
    supabase!.from('library_labels').select('*').eq('user_id', user.id).order('name'),
    supabase!.from('library_genres').select('*').eq('user_id', user.id).order('name'),
    supabase!.from('library_tags').select('*').eq('user_id', user.id).order('name'),
    supabase!.from('library_collections').select('*').eq('user_id', user.id).order('name'),
    supabase!.from('comic_labels').select('*').eq('user_id', user.id),
    supabase!
      .from('comic_sources')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase!
      .from('reading_progresses')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false }),
  ]);

  if (comics.error) throw new Error(formatSupabaseError(comics.error));
  if (labels.error) throw new Error(formatSupabaseError(labels.error));
  if (genres.error) throw new Error(formatSupabaseError(genres.error));
  if (tags.error) throw new Error(formatSupabaseError(tags.error));
  if (collections.error) throw new Error(formatSupabaseError(collections.error));
  if (comicLabels.error) throw new Error(formatSupabaseError(comicLabels.error));
  if (sources.error) throw new Error(formatSupabaseError(sources.error));
  if (progresses.error) throw new Error(formatSupabaseError(progresses.error));

  const allLabels = [
    ...(labels.data ?? []),
    ...(genres.data ?? []).map((item) => ({ ...item, kind: 'genre' })),
    ...(tags.data ?? []).map((item) => ({ ...item, kind: 'tag' })),
    ...(collections.data ?? []).map((item) => ({ ...item, kind: 'collection' })),
  ];
  const labelMap = new Map<string, LibraryLabel>();
  for (const label of allLabels) {
    const key = `${label.kind}:${label.name.trim().toLowerCase()}`;
    if (!labelMap.has(key)) labelMap.set(key, label as LibraryLabel);
  }
  const mergedLabels = [...labelMap.values()].sort((a, b) => a.name.localeCompare(b.name));

  return {
    comics: comics.data ?? [],
    labels: mergedLabels,
    comicLabels: comicLabels.data ?? [],
    sources: sources.data ?? [],
    progresses: progresses.data ?? [],
  };
}
