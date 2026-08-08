import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';

import { supabase, supabaseConfigured } from './supabase';
import type {
  Comic,
  ComicLabel,
  ComicSource,
  LibraryLabel,
  PublicationItem,
  PublicationKind,
  ReadingProgress,
} from './types';

const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export type SessionInfo = {
  id: string;
  email: string;
};

export type LibrarySnapshot = {
  comics: Comic[];
  labels: LibraryLabel[];
  comicLabels: ComicLabel[];
  sources: ComicSource[];
  progresses: ReadingProgress[];
};

export type ComicInput = {
  title: string;
  sourceUrl?: string;
  sourceName?: string;
  coverUrl?: string;
  genre?: string;
  collection?: string;
  progress?: number;
  history?: string;
};

export type ComicSourceInput = {
  comicId: string;
  label: string;
  url: string;
};

export type ComicSourceUpdateInput = {
  label?: string;
  url?: string;
};

export type ComicLabelInput = {
  comicId: string;
  labelId: string;
};

export type DetectedMetadata = {
  title: string;
  sourceName: string;
  coverUrl: string | null;
  genres: string[];
};

export type PublicationPreview = {
  items: PublicationItem[];
  kind: PublicationKind;
  title: string;
};

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
  return user?.email ? { id: user.id, email: user.email } : null;
}

export async function signIn(email: string, password: string) {
  if (!supabaseConfigured || !supabase) throw new Error('Akun cloud belum dikonfigurasi.');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(formatSupabaseError(error));
}

export async function signUp(email: string, password: string) {
  if (!supabaseConfigured || !supabase) throw new Error('Akun cloud belum dikonfigurasi.');
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(formatSupabaseError(error));
}

export async function signOut() {
  if (!supabaseConfigured || !supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
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
    supabase!.from('comic_sources').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase!.from('reading_progresses').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
  ]);

  if (comics.error) throw new Error(formatSupabaseError(comics.error));
  if (labels.error) throw new Error(formatSupabaseError(labels.error));
  if (genres.error) throw new Error(formatSupabaseError(genres.error));
  if (tags.error) throw new Error(formatSupabaseError(tags.error));
  if (collections.error) throw new Error(formatSupabaseError(collections.error));
  if (comicLabels.error) throw new Error(formatSupabaseError(comicLabels.error));
  if (sources.error) throw new Error(formatSupabaseError(sources.error));
  if (progresses.error) throw new Error(formatSupabaseError(progresses.error));

  const mergedLabels = [
    ...(labels.data ?? []),
    ...(genres.data ?? []).map((item) => ({ ...item, kind: 'genre' })),
    ...(tags.data ?? []).map((item) => ({ ...item, kind: 'tag' })),
    ...(collections.data ?? []).map((item) => ({ ...item, kind: 'collection' })),
  ];

  return {
    comics: comics.data ?? [],
    labels: mergedLabels,
    comicLabels: comicLabels.data ?? [],
    sources: sources.data ?? [],
    progresses: progresses.data ?? [],
  };
}

export async function addComic(input: ComicInput) {
  const user = await requireUser();
  const { data, error } = await supabase!
    .from('comics')
    .insert({
    user_id: user.id,
    title: input.title,
    source_url: input.sourceUrl ?? null,
    source_name: input.sourceName ?? null,
    cover_url: input.coverUrl ?? null,
    genre: input.genre ?? null,
    collection: input.collection ?? null,
    progress: input.progress ?? 0,
    history: input.history ?? null,
    })
    .select('id')
    .single();
  if (error) throw new Error(formatSupabaseError(error));
  return data?.id ?? null;
}

export async function updateComic(id: string, input: Partial<ComicInput>) {
  const user = await requireUser();
  const payload = {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.sourceUrl !== undefined ? { source_url: input.sourceUrl || null } : {}),
    ...(input.sourceName !== undefined ? { source_name: input.sourceName || null } : {}),
    ...(input.coverUrl !== undefined ? { cover_url: input.coverUrl || null } : {}),
    ...(input.genre !== undefined ? { genre: input.genre || null } : {}),
    ...(input.collection !== undefined ? { collection: input.collection || null } : {}),
    ...(input.progress !== undefined ? { progress: input.progress } : {}),
    ...(input.history !== undefined ? { history: input.history || null } : {}),
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase!
    .from('comics')
    .update(payload)
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) throw new Error(formatSupabaseError(error));
}

export async function deleteComic(id: string) {
  const user = await requireUser();
  const { error } = await supabase!.from('comics').delete().eq('id', id).eq('user_id', user.id);
  if (error) throw new Error(formatSupabaseError(error));
}

export async function addLabel(name: string, kind = 'collection') {
  const user = await requireUser();
  const normalizedName = name.trim().toLowerCase();
  const basePayload = { user_id: user.id, name: name.trim() || name, normalized_name: normalizedName };
  const targetTable =
    kind === 'genre'
      ? 'library_genres'
      : kind === 'tag'
        ? 'library_tags'
        : 'library_collections';

  const [{ error: labelError }, { error: typedError }] = await Promise.all([
    supabase!.from('library_labels').insert({ user_id: user.id, name: name.trim(), kind }),
    supabase!.from(targetTable).insert(basePayload),
  ]);
  if (labelError) throw new Error(formatSupabaseError(labelError));
  if (typedError) throw new Error(formatSupabaseError(typedError));
}

export async function updateProgress(comicId: string, pageIndex: number, chapterLabel?: string) {
  const user = await requireUser();
  const { error } = await supabase!.from('reading_progresses').insert({
    user_id: user.id,
    comic_id: comicId,
    page_index: pageIndex,
    chapter_label: chapterLabel ?? null,
  });
  if (error) throw new Error(formatSupabaseError(error));
}

export async function deleteReadingProgress(id: string) {
  const user = await requireUser();
  const { error } = await supabase!
    .from('reading_progresses')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) throw new Error(formatSupabaseError(error));
}

export async function addComicSource(input: ComicSourceInput) {
  const user = await requireUser();
  const { error } = await supabase!.from('comic_sources').insert({
    user_id: user.id,
    comic_id: input.comicId,
    label: input.label,
    url: input.url,
  });
  if (error) throw new Error(formatSupabaseError(error));
}

export async function updateComicSource(id: string, input: ComicSourceUpdateInput) {
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

export async function addComicLabel(input: ComicLabelInput) {
  const user = await requireUser();
  const { error } = await supabase!.from('comic_labels').insert({
    user_id: user.id,
    comic_id: input.comicId,
    label_id: input.labelId,
  });
  if (error) throw error;
}

export async function removeComicLabel(input: ComicLabelInput) {
  const user = await requireUser();
  const { error } = await supabase!
    .from('comic_labels')
    .delete()
    .eq('comic_id', input.comicId)
    .eq('label_id', input.labelId)
    .eq('user_id', user.id);
  if (error) throw error;
}

export async function exportLibraryJson() {
  const snapshot = await loadLibrary();
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      ...snapshot,
    },
    null,
    2,
  );
}

export async function exportLibraryBundle() {
  const snapshot = await loadLibrary();
  const zip = new JSZip();
  zip.file(
    'manifest.json',
    JSON.stringify(
      {
        format: 'arsip-buku-gua-web',
        exportedAt: new Date().toISOString(),
        version: 1,
      },
      null,
      2,
    ),
  );
  zip.file('library.json', JSON.stringify(snapshot, null, 2));
  return zip.generateAsync({ type: 'blob' });
}

export async function importLibraryJson(jsonText: string) {
  const user = await requireUser();
  const parsed = JSON.parse(jsonText) as Partial<LibrarySnapshot> & { comics?: Comic[] };
  const comics = Array.isArray(parsed.comics) ? parsed.comics : [];
  const labels = Array.isArray(parsed.labels) ? parsed.labels : [];
  const comicLabels = Array.isArray(parsed.comicLabels) ? parsed.comicLabels : [];
  const sources = Array.isArray(parsed.sources) ? parsed.sources : [];
  const progresses = Array.isArray(parsed.progresses) ? parsed.progresses : [];
  for (const comic of comics) {
    await supabase!.from('comics').upsert({
      ...comic,
      user_id: user.id,
    });
  }
  for (const label of labels) {
    await supabase!.from('library_labels').upsert({
      ...label,
      user_id: user.id,
    });
  }
  for (const source of sources) {
    await supabase!.from('comic_sources').upsert({
      ...source,
      user_id: user.id,
    });
  }
  for (const relation of comicLabels) {
    await supabase!.from('comic_labels').upsert({
      ...relation,
      user_id: user.id,
    });
  }
  for (const progress of progresses) {
    await supabase!.from('reading_progresses').upsert({
      ...progress,
      user_id: user.id,
    });
  }
}

export async function importLibraryBundle(file: File) {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const library = zip.file('library.json');
  if (library) {
    await importLibraryJson(await library.async('string'));
  }
}

export async function detectMetadata(url: string): Promise<DetectedMetadata> {
  const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
  const sourceName = parsed.hostname.replace(/^www\./, '').split('.')[0] || 'Sumber';
  try {
    const response = await fetch(parsed.toString(), { method: 'GET' });
    const html = await response.text();
    const title =
      html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i)?.[1] ??
      html.match(/<title[^>]*>([^<]+)</i)?.[1] ??
      parsed.pathname.split('/').filter(Boolean).at(-1) ??
      'Komik';
    const coverUrl =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i)?.[1] ??
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)/i)?.[1] ??
      null;
    const genres = [...html.matchAll(/genre[^>]*content=["']([^"']+)/gi)]
      .map((match) => match[1])
      .filter(Boolean);
    return {
      title: title.trim(),
      sourceName: sourceName[0].toUpperCase() + sourceName.slice(1),
      coverUrl,
      genres,
    };
  } catch {
    return {
      title: parsed.pathname.split('/').filter(Boolean).at(-1) || 'Komik',
      sourceName: sourceName[0].toUpperCase() + sourceName.slice(1),
      coverUrl: null,
      genres: [],
    };
  }
}

export async function previewPublication(file: File): Promise<PublicationPreview> {
  const kind = detectPublicationKind(file.name, file.type);
  if (kind === 'pdf') {
    return {
      items: [{ name: file.name, kind: 'pdf', url: URL.createObjectURL(file) }],
      kind,
      title: stripExtension(file.name),
    };
  }
  if (kind === 'image') {
    return {
      items: [{ name: file.name, kind: 'image', url: URL.createObjectURL(file) }],
      kind,
      title: stripExtension(file.name),
    };
  }
  if (kind === 'zip') {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const items: PublicationItem[] = [];
    const entries = Object.values(zip.files)
      .filter((entry) => !entry.dir)
      .filter((entry) => /\.(png|jpe?g|webp|gif|bmp)$/i.test(entry.name))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    for (const entry of entries) {
      const blob = await entry.async('blob');
      items.push({
        name: entry.name,
        kind: 'image',
        url: URL.createObjectURL(blob),
      });
    }
    return {
      items,
      kind,
      title: stripExtension(file.name),
    };
  }
  if (kind === 'epub') {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
    const containerXml = await zip.file('META-INF/container.xml')?.async('string');
    const rootPath =
      containerXml && parser.parse(containerXml)?.container?.rootfiles?.rootfile?.full_path;
    const opfXml = rootPath ? await zip.file(String(rootPath))?.async('string') : null;
    const opf = opfXml ? parser.parse(opfXml) : null;
    const spineIds = toArray(opf?.package?.spine?.itemref)
      .map((entry) => entry.idref)
      .filter(Boolean);
    const manifest = toArray(opf?.package?.manifest?.item);
    const hrefById = new Map(
      manifest
        .map((entry) => ({ id: entry.id, href: entry.href }))
        .filter((entry) => entry.id && entry.href)
        .map((entry) => [entry.id, entry.href] as const),
    );
    const baseDir = rootPath ? String(rootPath).split('/').slice(0, -1).join('/') : '';
    const items: PublicationItem[] = [];
    for (const id of spineIds) {
      const href = hrefById.get(id);
      if (!href) continue;
      const path = baseDir ? `${baseDir}/${href}` : href;
      const content = await zip.file(path)?.async('string');
      if (!content) continue;
      const text = content
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      items.push({
        name: href,
        kind: 'text',
        url: `data:text/plain;charset=utf-8,${encodeURIComponent(text.slice(0, 50000))}`,
      });
    }
    return {
      items,
      kind,
      title: stripExtension(file.name),
    };
  }
  return {
    items: [{ name: file.name, kind: 'unknown', url: URL.createObjectURL(file) }],
    kind: 'unknown',
    title: stripExtension(file.name),
  };
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function detectPublicationKind(name: string, mimeType: string): PublicationKind {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(ext)) {
    return 'image';
  }
  if (mimeType === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (ext === 'cbz' || ext === 'zip') return 'zip';
  if (ext === 'epub') return 'epub';
  return 'unknown';
}

function stripExtension(name: string) {
  return name.replace(/\.[^.]+$/, '');
}

export async function importLocalFile(file: File) {
  await delay(250);
  return {
    name: file.name,
    size: file.size,
    type: file.type || 'application/octet-stream',
  };
}
