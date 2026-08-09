import { supabase } from './supabaseClient';
import { toErrorMessage } from '../utils/errors';
import type { ComicLabelInput } from '../types/api';

function formatSupabaseError(error: unknown) {
  return toErrorMessage(error);
}

async function requireUser() {
  const { data, error } = await supabase!.auth.getUser();
  if (error) throw new Error(formatSupabaseError(error));
  if (!data.user) throw new Error('Wajib login untuk masuk.');
  return data.user;
}

function labelTable(kind: string) {
  return kind === 'genre' ? 'library_genres' : kind === 'tag' ? 'library_tags' : 'library_collections';
}

export async function addLabel(name: string, kind = 'collection') {
  const user = await requireUser();
  const normalizedName = name.trim().toLowerCase();
  const basePayload = { user_id: user.id, name: name.trim() || name, normalized_name: normalizedName };
  const targetTable = labelTable(kind);
  const [{ error: labelError }, { error: typedError }] = await Promise.all([
    supabase!.from('library_labels').insert({ ...basePayload, kind }),
    supabase!.from(targetTable).insert(basePayload),
  ]);
  if (labelError) throw new Error(formatSupabaseError(labelError));
  if (typedError) throw new Error(formatSupabaseError(typedError));
}

export async function updateLabel(
  id: string,
  name: string,
  kind: string,
  previousName: string,
  previousKind: string,
) {
  const user = await requireUser();
  const normalizedName = name.trim().toLowerCase();
  const previousTable = labelTable(previousKind);
  const targetTable = labelTable(kind);
  const { error: labelError } = await supabase!
    .from('library_labels')
    .update({ name: name.trim(), normalized_name: normalizedName, kind })
    .eq('id', id)
    .eq('user_id', user.id);
  if (labelError) throw new Error(formatSupabaseError(labelError));
  if (previousKind === 'genre' || previousKind === 'collection') {
    const column = previousKind === 'genre' ? 'genre' : 'collection';
    const replacement = kind === previousKind ? name.trim() : null;
    const { error: comicError } = await supabase!
      .from('comics')
      .update({ [column]: replacement, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq(column, previousName);
    if (comicError) throw new Error(formatSupabaseError(comicError));
  }
  const { error: removeTypedError } = await supabase!.from(previousTable).delete().eq('user_id', user.id).eq('name', previousName);
  if (removeTypedError) throw new Error(formatSupabaseError(removeTypedError));
  const { error: typedError } = await supabase!.from(targetTable).insert({ user_id: user.id, name: name.trim(), normalized_name: normalizedName });
  if (typedError) throw new Error(formatSupabaseError(typedError));
}

export async function deleteLabel(id: string, name: string, kind: string) {
  const user = await requireUser();
  const targetTable = labelTable(kind);
  const { error: linkError } = await supabase!.from('comic_labels').delete().eq('label_id', id).eq('user_id', user.id);
  if (linkError) throw new Error(formatSupabaseError(linkError));
  if (kind === 'genre' || kind === 'collection') {
    const column = kind === 'genre' ? 'genre' : 'collection';
    const { error: comicError } = await supabase!
      .from('comics')
      .update({ [column]: null, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq(column, name);
    if (comicError) throw new Error(formatSupabaseError(comicError));
  }
  const [{ error: labelError }, { error: typedError }] = await Promise.all([
    supabase!.from('library_labels').delete().eq('id', id).eq('user_id', user.id),
    supabase!.from(targetTable).delete().eq('user_id', user.id).eq('name', name),
  ]);
  if (labelError) throw new Error(formatSupabaseError(labelError));
  if (typedError) throw new Error(formatSupabaseError(typedError));
}

export async function addComicLabel(input: ComicLabelInput) {
  const user = await requireUser();
  const { error } = await supabase!.from('comic_labels').insert({
    user_id: user.id,
    comic_id: input.comicId,
    label_id: input.labelId,
  });
  if (error) throw new Error(formatSupabaseError(error));
}

export async function removeComicLabel(input: ComicLabelInput) {
  const user = await requireUser();
  const { error } = await supabase!
    .from('comic_labels')
    .delete()
    .eq('comic_id', input.comicId)
    .eq('label_id', input.labelId)
    .eq('user_id', user.id);
  if (error) throw new Error(formatSupabaseError(error));
}
