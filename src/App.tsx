import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  addComic,
  addComicSource,
  addComicLabel,
  addLabel,
  deleteComic,
  deleteLabel,
  deleteReadingProgress,
  getSession,
  exportLibraryBundle,
  exportLibraryJson,
  importLocalFile,
  importLibraryBundle,
  importLibraryJson,
  loadLibrary,
  detectMetadata,
  signIn,
  signOut,
  signUp,
  updateComic,
  updateLabel,
  updateComicSource,
  updateAccountPassword,
  updateProfileUsername,
  removeComicLabel,
  updateProgress,
} from './lib/libraryService';
import { cloudConfigMissing } from './lib/supabase';
import type {
  Comic,
  ComicLabel,
  ComicSource,
  LibraryLabel,
  ReadingProgress,
  SyncState,
} from './lib/types';

type ComicFormState = {
  title: string;
  sourceUrl: string;
  sourceName: string;
  coverUrl: string;
  genre: string;
  collection: string;
  progress: string;
  history: string;
};

type SourceFormState = {
  comicId: string;
  label: string;
  url: string;
};

type LabelFormState = {
  name: string;
  kind: string;
};

type SourceEditFormState = {
  id: string;
  comicId: string;
  label: string;
  url: string;
};

const emptyComicForm: ComicFormState = {
  title: '',
  sourceUrl: '',
  sourceName: '',
  coverUrl: '',
  genre: '',
  collection: '',
  progress: '0',
  history: '',
};

const emptySourceForm: SourceFormState = {
  comicId: '',
  label: '',
  url: '',
};

const emptyLabelForm: LabelFormState = {
  name: '',
  kind: 'collection',
};

const emptySourceEditForm: SourceEditFormState = {
  id: '',
  comicId: '',
  label: '',
  url: '',
};

function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return JSON.stringify(error);
}

function toDebugMessage(error: unknown) {
  if (!error || typeof error !== 'object') return toErrorMessage(error);
  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return toErrorMessage(error);
  }
}

const shortDateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

function formatShortDate(value: string | null | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : shortDateFormatter.format(date);
}

const PASSWORD_COOLDOWN_MS = 24 * 60 * 60 * 1000;

function formatCooldown(milliseconds: number) {
  const totalMinutes = Math.max(1, Math.ceil(milliseconds / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours} jam ${minutes} menit` : `${minutes} menit`;
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [sessionEmail, setSessionEmail] = useState('');
  const [profileUsername, setProfileUsername] = useState('');
  const [profileUsernameInput, setProfileUsernameInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordChangedAt, setPasswordChangedAt] = useState<string | null>(null);
  const [clockNow, setClockNow] = useState(Date.now());
  const [syncState, setSyncState] = useState<SyncState>('belum-login');
  const [message, setMessage] = useState('Login dulu untuk masuk ke arsip.');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLogin, setShowLogin] = useState(true);
  const [comics, setComics] = useState<Comic[]>([]);
  const [labels, setLabels] = useState<LibraryLabel[]>([]);
  const [comicLabels, setComicLabels] = useState<ComicLabel[]>([]);
  const [sources, setSources] = useState<ComicSource[]>([]);
  const [progresses, setProgresses] = useState<ReadingProgress[]>([]);
  const [query, setQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('Semua');
  const [selectedCollection, setSelectedCollection] = useState('Semua');
  const [selectedTag, setSelectedTag] = useState('Semua');
  const [sortBy, setSortBy] = useState<'updated_at_desc' | 'title_asc' | 'title_desc' | 'progress_desc' | 'created_at_desc'>('updated_at_desc');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedComicId, setSelectedComicId] = useState('');
  const [importInfo, setImportInfo] = useState('');
  const [comicForm, setComicForm] = useState<ComicFormState>(emptyComicForm);
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [sourceForm, setSourceForm] = useState<SourceFormState>(emptySourceForm);
  const [labelForm, setLabelForm] = useState<LabelFormState>(emptyLabelForm);
  const [editingLabel, setEditingLabel] = useState<LibraryLabel | null>(null);
  const [sourceEditForm, setSourceEditForm] = useState<SourceEditFormState>(emptySourceEditForm);
  const [comicFormTagIds, setComicFormTagIds] = useState<string[]>([]);
  const [activeComicId, setActiveComicId] = useState('');
  const [openPanel, setOpenPanel] = useState<'comic' | 'source' | 'label' | null>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'source' | 'history' | 'label'>('info');
  const [debugError, setDebugError] = useState('');
  const [activeMenu, setActiveMenu] = useState<'dashboard' | 'history' | 'library' | 'settings' | 'profile'>('dashboard');
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    message: string;
    resolver: ((value: boolean) => void) | null;
  }>({
    open: false,
    title: '',
    message: '',
    resolver: null,
  });

  useEffect(() => {
    let active = true;
    getSession()
      .then((session) => {
        if (!active) return;
        if (session) {
          setSessionEmail(session.email);
          setProfileUsername(session.username);
          setProfileUsernameInput(session.username);
          setPasswordChangedAt(session.passwordChangedAt);
          setShowLogin(false);
          setReady(true);
          setSyncState('siap-sync');
          setMessage('Akun terhubung. Sinkronisasi siap.');
          setDebugError('');
        }
      })
      .catch(() => {
        if (active) setMessage('Wajib login untuk masuk.');
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!ready) return;
    loadLibrary()
      .then((snapshot) => {
        setComics(snapshot.comics);
        setLabels(snapshot.labels);
        setComicLabels(snapshot.comicLabels);
        setSources(snapshot.sources);
        setProgresses(snapshot.progresses);
        const firstComicId = snapshot.comics[0]?.id ?? '';
        setSelectedComicId(firstComicId);
        setActiveComicId(firstComicId);
        setMessage('Data cloud berhasil dimuat.');
        setDebugError('');
      })
      .catch((error) => {
        setMessage(`Gagal memuat data cloud: ${String(error)}`);
        setDebugError(toDebugMessage(error));
        setSyncState('gagal');
      });
  }, [ready]);

  const syncLabel = {
    'belum-login': 'Belum login',
    'siap-sync': 'Siap sync',
    'sedang-sync': 'Sedang sync',
    berhasil: 'Berhasil',
    gagal: 'Gagal',
  } satisfies Record<SyncState, string>;

  const passwordCooldownRemaining = passwordChangedAt
    ? Math.max(0, new Date(passwordChangedAt).getTime() + PASSWORD_COOLDOWN_MS - clockNow)
    : 0;

  const requestConfirm = (title: string, message: string) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ open: true, title, message, resolver: resolve });
    });
  };

  const closeConfirm = (value: boolean) => {
    setConfirmState((current) => {
      current.resolver?.(value);
      return { open: false, title: '', message: '', resolver: null };
    });
  };

  const filteredComics = useMemo(() => {
    return comics.filter((comic) => {
      const matchesQuery =
        comic.title.toLowerCase().includes(query.toLowerCase()) ||
        (comic.source_url ?? '').toLowerCase().includes(query.toLowerCase()) ||
        (comic.collection ?? '').toLowerCase().includes(query.toLowerCase());
      const comicTagIds = comicLabels
        .filter((link) => link.comic_id === comic.id)
        .map((link) => link.label_id);
      const linkedLabels = labels.filter((label) => comicTagIds.includes(label.id));
      const comicGenreNames = [
        comic.genre?.trim(),
        ...linkedLabels.filter((label) => label.kind === 'genre').map((label) => label.name.trim()),
      ].filter((value): value is string => Boolean(value));
      const comicCollectionNames = [
        comic.collection?.trim(),
        ...linkedLabels.filter((label) => label.kind === 'collection').map((label) => label.name.trim()),
      ].filter((value): value is string => Boolean(value));
      const comicTagNames = linkedLabels
        .filter((label) => label.kind === 'tag')
        .map((label) => label.name.trim())
        .filter((value): value is string => Boolean(value));
      const matchesGenre = selectedGenre === 'Semua' || comicGenreNames.includes(selectedGenre);
      const matchesCollection =
        selectedCollection === 'Semua' || comicCollectionNames.includes(selectedCollection);
      const matchesTag = selectedTag === 'Semua' || comicTagNames.includes(selectedTag);
      return matchesQuery && matchesGenre && matchesCollection && matchesTag;
    });
  }, [comics, query, selectedGenre, selectedCollection, selectedTag, comicLabels, labels]);

  const sortedComics = useMemo(() => {
    const list = [...filteredComics];
    const compareDate = (a: string | null | undefined, b: string | null | undefined) =>
      new Date(b ?? 0).getTime() - new Date(a ?? 0).getTime();
    switch (sortBy) {
      case 'title_asc':
        return list.sort((a, b) => a.title.localeCompare(b.title));
      case 'title_desc':
        return list.sort((a, b) => b.title.localeCompare(a.title));
      case 'progress_desc':
        return list.sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0));
      case 'created_at_desc':
        return list.sort((a, b) => compareDate(a.updated_at, b.updated_at));
      case 'updated_at_desc':
      default:
        return list.sort((a, b) => compareDate(a.updated_at, b.updated_at));
    }
  }, [filteredComics, sortBy]);

  const genres = useMemo(() => {
    const comicGenres = comics
      .map((comic) => comic.genre?.trim())
      .filter((value): value is string => Boolean(value));
    const labelGenres = labels
      .filter((label) => label.kind === 'genre')
      .map((label) => label.name.trim())
      .filter((value): value is string => Boolean(value));
    return ['Semua', ...new Set([...comicGenres, ...labelGenres])];
  }, [comics, labels]);

  const collections = useMemo(() => {
    const comicCollections = comics
      .map((comic) => comic.collection?.trim())
      .filter((value): value is string => Boolean(value));
    const labelCollections = labels
      .filter((label) => label.kind === 'collection')
      .map((label) => label.name.trim())
      .filter((value): value is string => Boolean(value));
    return ['Semua', ...new Set([...comicCollections, ...labelCollections])];
  }, [comics, labels]);

  const tags = useMemo(() => {
    const comicTags = labels
      .filter((label) => label.kind === 'tag')
      .map((label) => label.name.trim())
      .filter((value): value is string => Boolean(value));
    return ['Semua', ...new Set(comicTags)];
  }, [labels]);

  const genreOptions = useMemo(() => {
    return labels
      .filter((label) => label.kind === 'genre')
      .map((label) => label.name.trim())
      .filter((value): value is string => Boolean(value));
  }, [labels]);

  const collectionOptions = useMemo(() => {
    return labels
      .filter((label) => label.kind === 'collection')
      .map((label) => label.name.trim())
      .filter((value): value is string => Boolean(value));
  }, [labels]);

  const tagOptions = useMemo(() => {
    return labels
      .filter((label) => label.kind === 'tag')
      .map((label) => label.name.trim())
      .filter((value): value is string => Boolean(value));
  }, [labels]);

  const stats = [
    { label: 'Komik', value: String(comics.length) },
    { label: 'Label', value: String(labels.length) },
    { label: 'Progress', value: String(progresses.length) },
    { label: 'Sync', value: syncState === 'berhasil' ? '100%' : syncState === 'sedang-sync' ? '...' : '—' },
  ];

  const dashboardBars = [
    { label: 'Komik', value: comics.length, accent: 'linear-gradient(180deg, #8bb8ff, #d8ecff)' },
    { label: 'Label', value: labels.length, accent: 'linear-gradient(180deg, #7edfd2, #d7f7f1)' },
    { label: 'Progress', value: progresses.length, accent: 'linear-gradient(180deg, #aacb7d, #eef7d8)' },
  ];

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (cloudConfigMissing) {
      setSyncState('gagal');
      setMessage('Akun cloud belum dikonfigurasi. Isi file .env lalu restart app.');
      return;
    }
    setSyncState('sedang-sync');
    try {
      await signIn(loginEmail, loginPassword);
      const session = await getSession();
      if (!session) throw new Error('Sesi login tidak ditemukan.');
      setSessionEmail(session.email);
      setProfileUsername(session.username);
      setProfileUsernameInput(session.username);
      setPasswordChangedAt(session.passwordChangedAt);
      setReady(true);
      setShowLogin(false);
      setSyncState('siap-sync');
      setMessage('Login berhasil. Dashboard dibuka.');
      setDebugError('');
    } catch (signInError) {
      try {
        await signUp(loginEmail, loginPassword);
        const session = await getSession();
        if (!session) throw new Error('Akun belum aktif.');
        setSessionEmail(session.email);
        setProfileUsername(session.username);
        setProfileUsernameInput(session.username);
        setPasswordChangedAt(session.passwordChangedAt);
        setReady(true);
        setShowLogin(false);
        setSyncState('siap-sync');
        setMessage('Akun dibuat dan login aktif.');
        setDebugError('');
      } catch (signUpError) {
        setSyncState('gagal');
        setMessage(`Login gagal: ${toErrorMessage(signInError ?? signUpError)}`);
      }
    }
  };

  const syncNow = async () => {
    if (!ready) {
      setShowLogin(true);
      setMessage('Wajib login untuk masuk.');
      return;
    }
    setSyncState('sedang-sync');
    try {
      const snapshot = await loadLibrary();
      setComics(snapshot.comics);
      setLabels(snapshot.labels);
      setComicLabels(snapshot.comicLabels);
      setSources(snapshot.sources);
      setProgresses(snapshot.progresses);
      setSyncState('berhasil');
      setMessage('Sinkronisasi berhasil.');
      setDebugError('');
    } catch (error) {
      setSyncState('gagal');
      setMessage(`Sinkronisasi gagal: ${toErrorMessage(error)}`);
      setDebugError(toDebugMessage(error));
    }
  };

  const handleAddComic = async () => {
    setComicForm(emptyComicForm);
    setComicFormTagIds([]);
    setFormMode('create');
    setOpenPanel('comic');
  };

  const handleEditComic = (target: Comic) => {
    const targetTagIds = comicLabels
      .filter((link) => link.comic_id === target.id)
      .map((link) => link.label_id)
      .filter((labelId) => labels.some((label) => label.id === labelId && label.kind === 'tag'));
    setComicForm({
      title: target.title,
      sourceUrl: target.source_url ?? '',
      sourceName: target.source_name ?? '',
      coverUrl: target.cover_url ?? '',
      genre: target.genre ?? '',
      collection: target.collection ?? '',
      progress: String(target.progress),
      history: target.history ?? '',
    });
    setComicFormTagIds(targetTagIds);
    setSelectedComicId(target.id);
    setActiveComicId(target.id);
    setFormMode('edit');
    setOpenPanel('comic');
  };

  const saveComicForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const payload = {
        title: comicForm.title.trim(),
        sourceUrl: comicForm.sourceUrl.trim(),
        sourceName: comicForm.sourceName.trim(),
        coverUrl: comicForm.coverUrl.trim(),
        genre: comicForm.genre.trim(),
        collection: comicForm.collection.trim(),
        progress: Number(comicForm.progress || 0),
        history: comicForm.history.trim(),
      };
      if (!payload.title) {
        setMessage('Judul komik wajib diisi.');
        return;
      }
      let resolvedCoverUrl = payload.coverUrl;
      if (payload.sourceUrl) {
        try {
          const metadata = await detectMetadata(payload.sourceUrl);
          if (!resolvedCoverUrl) resolvedCoverUrl = metadata.coverUrl ?? '';
          if (!payload.sourceName) payload.sourceName = metadata.sourceName;
          if (!payload.title || formMode === 'create') payload.title = metadata.title;
        } catch {
          resolvedCoverUrl = '';
        }
      }
      if (formMode === 'create') {
        if (
          !(await requestConfirm(
            'Simpan Komik Baru?',
            'Komik baru akan ditambahkan ke library.',
          ))
        ) {
          return;
        }
        const createdComicId = await addComic({ ...payload, coverUrl: resolvedCoverUrl || undefined });
        if (createdComicId && comicFormTagIds.length) {
          for (const labelId of comicFormTagIds) {
            await addComicLabel({ comicId: createdComicId, labelId });
          }
        }
      } else if (formMode === 'edit' && selectedComicId) {
        if (
          !(await requestConfirm(
            'Simpan Perubahan?',
            'Data komik yang lama akan ditimpa dengan perubahan baru.',
          ))
        ) {
          return;
        }
        await updateComic(selectedComicId, { ...payload, coverUrl: resolvedCoverUrl || undefined });
        const currentTagLinks = comicLabels.filter(
          (link) => link.comic_id === selectedComicId && labels.some((label) => label.id === link.label_id && label.kind === 'tag'),
        );
        const currentTagIds = currentTagLinks.map((link) => link.label_id);
        for (const link of currentTagLinks) {
          if (!comicFormTagIds.includes(link.label_id)) {
            await removeComicLabel({ comicId: selectedComicId, labelId: link.label_id });
          }
        }
        for (const labelId of comicFormTagIds) {
          if (!currentTagIds.includes(labelId)) {
            await addComicLabel({ comicId: selectedComicId, labelId });
          }
        }
      }
      setFormMode(null);
      setComicForm(emptyComicForm);
      setComicFormTagIds([]);
      await syncNow();
    } catch (error) {
      setMessage(`Simpan komik gagal: ${toErrorMessage(error)}`);
      setDebugError(toDebugMessage(error));
    }
  };

  const handleProgress = async () => {
    const comicId = activeComicId || selectedComicId || comics[0]?.id;
    if (!comicId) return;
    try {
      if (!(await requestConfirm('Simpan Progress?', 'Progress baca akan disimpan untuk komik ini.'))) return;
      await updateProgress(comicId, 42, 'Bab 42');
      await syncNow();
    } catch (error) {
      setMessage(`Simpan progress gagal: ${toErrorMessage(error)}`);
    }
  };

  const activeComic = comics.find((comic) => comic.id === (activeComicId || selectedComicId)) ?? comics[0];
  const activeSources = sources.filter((source) => source.comic_id === activeComic?.id);
  const activeProgresses = progresses.filter((progress) => progress.comic_id === activeComic?.id);
  const activeLabelLinks = comicLabels.filter((link) => link.comic_id === activeComic?.id);
  const activeLabels = labels.filter((label) =>
    activeLabelLinks.some((link) => link.label_id === label.id),
  );

  const openSourceForm = () => {
    setSourceEditForm(emptySourceEditForm);
    setSourceForm({
      comicId: activeComic?.id ?? '',
      label: activeComic?.source_name ?? 'Sumber Utama',
      url: activeComic?.source_url ?? '',
    });
    setOpenPanel('source');
  };

  const openSourceEdit = (source: ComicSource) => {
    setSourceEditForm({
      id: source.id,
      comicId: source.comic_id,
      label: source.label ?? '',
      url: source.url,
    });
    setOpenPanel('source');
  };

  const openLabelForm = (kind: string = 'collection') => {
    setEditingLabel(null);
    setLabelForm({ ...emptyLabelForm, kind });
    setOpenPanel('label');
  };

  const openLabelEdit = (label: LibraryLabel) => {
    setEditingLabel(label);
    setLabelForm({ name: label.name, kind: label.kind });
    setOpenPanel('label');
  };

  const saveSourceForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      if (!sourceForm.comicId || !sourceForm.url.trim()) {
        setMessage('Komik dan URL sumber wajib diisi.');
        return;
      }
      if (
        !(await requestConfirm(
          'Simpan Sumber?',
          'Sumber baru akan ditambahkan dan sumber utama komik ikut diperbarui.',
        ))
      ) {
        return;
      }
      await addComicSource({
        comicId: sourceForm.comicId,
        label: sourceForm.label.trim() || 'Sumber',
        url: sourceForm.url.trim(),
      });
      await updateComic(sourceForm.comicId, {
        sourceName: sourceForm.label.trim() || 'Sumber',
        sourceUrl: sourceForm.url.trim(),
      });
      setOpenPanel(null);
      await syncNow();
    } catch (error) {
      setMessage(`Simpan sumber gagal: ${toErrorMessage(error)}`);
    }
  };

  const saveSourceEditForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      if (!sourceEditForm.id || !sourceEditForm.url.trim()) {
        setMessage('URL sumber wajib diisi.');
        return;
      }
      if (!(await requestConfirm('Simpan Perubahan Sumber?', 'Perubahan sumber akan diterapkan.'))) return;
      await updateComicSource(sourceEditForm.id, {
        label: sourceEditForm.label.trim() || 'Sumber',
        url: sourceEditForm.url.trim(),
      });
      setOpenPanel(null);
      setSourceEditForm(emptySourceEditForm);
      await syncNow();
    } catch (error) {
      setMessage(`Edit sumber gagal: ${toErrorMessage(error)}`);
    }
  };

  const saveLabelForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      if (!labelForm.name.trim()) {
        setMessage('Nama label wajib diisi.');
        return;
      }
      if (editingLabel) {
        if (!(await requestConfirm('Simpan Perubahan Label?', `Label "${editingLabel.name}" akan diperbarui.`))) return;
        await updateLabel(
          editingLabel.id,
          labelForm.name.trim(),
          labelForm.kind.trim() || 'collection',
          editingLabel.name,
          editingLabel.kind,
        );
      } else {
        if (!(await requestConfirm('Buat Label?', 'Label baru akan ditambahkan ke library.'))) return;
        await addLabel(labelForm.name.trim(), labelForm.kind.trim() || 'collection');
      }
      setOpenPanel(null);
      setLabelForm(emptyLabelForm);
      setEditingLabel(null);
      await syncNow();
    } catch (error) {
      setMessage(`${editingLabel ? 'Edit' : 'Simpan'} label gagal: ${toErrorMessage(error)}`);
    }
  };

  const handleDeleteLabel = async (label: LibraryLabel) => {
    try {
      if (!(await requestConfirm('Hapus Label?', `Label "${label.name}" dan relasinya pada komik akan dihapus.`))) return;
      await deleteLabel(label.id, label.name, label.kind);
      await syncNow();
    } catch (error) {
      setMessage(`Hapus label gagal: ${toErrorMessage(error)}`);
      setDebugError(toDebugMessage(error));
    }
  };

  const toggleComicLabel = async (labelId: string) => {
    if (!activeComic?.id) return;
    try {
      const exists = comicLabels.some(
        (link) => link.comic_id === activeComic.id && link.label_id === labelId,
      );
      if (
        !(await requestConfirm(
          exists ? 'Hapus Label?' : 'Tambah Label?',
          exists
            ? 'Label ini akan dilepas dari komik aktif.'
            : 'Label ini akan ditambahkan ke komik aktif.',
        ))
      ) {
        return;
      }
      if (exists) {
        await removeComicLabel({ comicId: activeComic.id, labelId });
      } else {
        await addComicLabel({ comicId: activeComic.id, labelId });
      }
      await syncNow();
    } catch (error) {
      setMessage(`Ubah label gagal: ${toErrorMessage(error)}`);
    }
  };

  const handleExport = async () => {
    const blob = new Blob([await exportLibraryJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'arsip-buku-gua-export.json';
    link.click();
    URL.revokeObjectURL(url);
    setMessage('Arsip diekspor.');
  };

  const handleExportBundle = async () => {
    const blob = await exportLibraryBundle();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'arsip-buku-gua-bundle.zip';
    link.click();
    URL.revokeObjectURL(url);
    setMessage('Bundle arsip diekspor.');
  };

  const handleImportLibrary = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    try {
      await importLibraryJson(await file.text());
      await syncNow();
      setMessage('Arsip berhasil diimpor.');
    } catch (error) {
      setMessage(`Import arsip gagal: ${toErrorMessage(error)}`);
    }
  };

  const handleImportLocalFile = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    try {
      const result = await importLocalFile(file);
      setImportInfo(`${result.name} • ${Math.round(result.size / 1024)} KB`);
      setMessage('File lokal dibaca. Tinggal diproses ke cloud.');
    } catch (error) {
      setMessage(`Baca file gagal: ${toErrorMessage(error)}`);
    }
  };

  const handleImportBundle = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    try {
      await importLibraryBundle(file);
      await syncNow();
      setMessage('Bundle arsip berhasil diimpor.');
    } catch (error) {
      setMessage(`Import bundle gagal: ${toErrorMessage(error)}`);
    }
  };

  const handleLogout = async () => {
    try {
      if (!(await requestConfirm('Logout?', 'Anda akan keluar dari sesi saat ini. Data akun tidak akan dihapus.'))) return;
      await signOut();
      setReady(false);
      setSessionEmail('');
      setProfileUsername('');
      setProfileUsernameInput('');
      setPasswordChangedAt(null);
      setComics([]);
      setLabels([]);
      setComicLabels([]);
      setProgresses([]);
      setShowLogin(true);
      setSyncState('belum-login');
      setMessage('Logout berhasil.');
    } catch (error) {
      setMessage(`Logout gagal: ${toErrorMessage(error)}`);
    }
  };

  const handleProfileSave = async (event: FormEvent) => {
    event.preventDefault();
    const usernameChanged = profileUsernameInput.trim() !== profileUsername;
    const passwordChanged = newPassword.length > 0 || confirmPassword.length > 0;

    if (!usernameChanged && !passwordChanged) {
      setMessage('Tidak ada perubahan profil untuk disimpan.');
      return;
    }
    if (passwordChanged && newPassword !== confirmPassword) {
      setMessage('Konfirmasi password tidak sama.');
      return;
    }
    if (passwordChanged && passwordCooldownRemaining > 0) {
      setMessage(`Password dapat diganti lagi dalam ${formatCooldown(passwordCooldownRemaining)}.`);
      return;
    }
    if (!(await requestConfirm('Simpan Profil?', 'Username atau password akun akan diperbarui.'))) return;

    setProfileSaving(true);
    try {
      if (usernameChanged) await updateProfileUsername(profileUsernameInput);
      if (passwordChanged) await updateAccountPassword(newPassword);
      const session = await getSession();
      if (session) {
        setProfileUsername(session.username);
        setProfileUsernameInput(session.username);
        setPasswordChangedAt(session.passwordChangedAt);
      }
      setNewPassword('');
      setConfirmPassword('');
      setMessage('Profil berhasil diperbarui.');
      setDebugError('');
    } catch (error) {
      setMessage(`Update profil gagal: ${toErrorMessage(error)}`);
      setDebugError(toDebugMessage(error));
    } finally {
      setProfileSaving(false);
    }
  };

  if (showLogin || !ready) {
    return (
      <div className="auth-screen">
        <div className="auth-panel">
          <div className="auth-badge">A</div>
          <p className="eyebrow">Arsip Buku Gua</p>
          <h1>Masuk dulu untuk membuka arsip</h1>
          <p className="auth-copy">
            Semua fitur library, kategori, progress, dan riwayat hanya bisa diakses setelah login.
          </p>
          {cloudConfigMissing ? (
            <p className="auth-note">
              Konfigurasi cloud belum ditemukan. Buat file <code>.env</code> dari <code>.env.example</code>, isi URL dan anon key, lalu restart aplikasi.
            </p>
          ) : null}
          <form className="auth-form" onSubmit={login}>
            <label>
              Email
              <input value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} placeholder="nama@contoh.com" />
            </label>
            <label>
              Password
              <input type="password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} placeholder="Masukkan password" />
            </label>
            <button className="primary" type="submit" disabled={cloudConfigMissing}>Login dan Masuk</button>
          </form>
          <p className="auth-note">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <button type="button" className="brand brand-profile-button" onClick={() => setActiveMenu('profile')} aria-label="Buka pengaturan profil">
          <div className="brand-mark">{(profileUsername || sessionEmail).charAt(0).toUpperCase()}</div>
          <div>
            <p className="eyebrow">Arsip Buku Gua</p>
            <h1>{profileUsername || 'Atur username'}</h1>
          </div>
        </button>

        <nav className="menu" aria-label="Navigasi utama">
          <button
            type="button"
            className={activeMenu === 'dashboard' ? 'menu-item active' : 'menu-item'}
            onClick={() => setActiveMenu('dashboard')}
          >
            Dashboard
          </button>
          <button
            type="button"
            className={activeMenu === 'history' ? 'menu-item active' : 'menu-item'}
            onClick={() => setActiveMenu('history')}
          >
            Riwayat
          </button>
          <button
            type="button"
            className={activeMenu === 'library' ? 'menu-item active' : 'menu-item'}
            onClick={() => setActiveMenu('library')}
          >
            Koleksi
          </button>
          <button
            type="button"
            className={activeMenu === 'settings' ? 'menu-item active' : 'menu-item'}
            onClick={() => setActiveMenu('settings')}
          >
            Pengaturan
          </button>
        </nav>

        <section className="sidebar-card card-accent">
          <span className="pill">{syncLabel[syncState]}</span>
          <p>{message}</p>
          {debugError ? <pre className="debug-box">{debugError}</pre> : null}
          <div className="stack-actions">
            <button type="button" className="primary" onClick={syncNow}>Sync Sekarang</button>
            <button type="button" className="secondary" onClick={handleLogout}>Logout</button>
          </div>
        </section>

      </aside>

      <main className="content">
        {activeMenu === 'dashboard' && (
          <section className="dashboard-shell">
            <section className="dashboard-hero panel panel-glow">
              <div className="dashboard-header">
                <div className="dashboard-copy">
                  <p className="eyebrow">Dashboard</p>
                  <h2>Arsip buku dan komik</h2>
                  <p className="hero-copy">Ringkasan cepat, visual ringan, dan ruang yang lebih lega.</p>
                </div>
                <div className="dashboard-actions">
                  <button type="button" className="secondary" onClick={() => handleAddComic()}>Tambah</button>
                  <button type="button" className="secondary" onClick={() => openLabelForm('collection')}>Label</button>
                  <button type="button" className="secondary" onClick={openSourceForm}>Sumber</button>
                </div>
              </div>
              <div className="dashboard-visual">
                {dashboardBars.map((bar) => (
                  <div className="dashboard-bar" key={bar.label}>
                    <div className="dashboard-bar-head">
                      <span>{bar.label}</span>
                      <strong>{bar.value}</strong>
                    </div>
                    <div className="dashboard-bar-track">
                      <div
                        className="dashboard-bar-fill"
                        style={{
                          width: `${Math.min(100, 20 + bar.value * 12)}%`,
                          background: bar.accent,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <div className="stats-grid compact">
              {stats.map((stat) => (
                <article className="stat-card" key={stat.label}>
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                </article>
              ))}
            </div>
            <section className="panel compact-panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Status</p>
                  <h3>{syncLabel[syncState]}</h3>
                </div>
                <span className="badge">{sessionEmail || 'Akun cloud'}</span>
              </div>
              <p className="muted">{message}</p>
              {debugError ? <pre className="debug-box">{debugError}</pre> : null}
            </section>
          </section>
        )}

        {activeMenu === 'library' && (
          <section className="library-shell">
            <section className="library-layout">
              <div className="panel library-list-panel">
                <div className="panel-head">
                  <div>
                    <p className="eyebrow">Koleksi</p>
                    <h3>Daftar komik</h3>
                  </div>
                  <div className="view-switcher" aria-label="Mode tampilan">
                    <button type="button" className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>Daftar</button>
                    <button type="button" className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}>Grid</button>
                  </div>
                </div>
                <div className={`comic-list ${viewMode === 'grid' ? 'grid-view' : 'list-view'}`}>
                  {sortedComics.map((comic) => (
                    <article className={comic.id === activeComic?.id ? 'comic-card active' : 'comic-card'} key={comic.id} onClick={() => { setActiveComicId(comic.id); setActiveMenu('library'); }}>
                      <div className="comic-cover" aria-label={`Cover ${comic.title}`}>
                        <span>{comic.title.trim().charAt(0).toUpperCase() || '?'}</span>
                        {comic.cover_url ? <img src={comic.cover_url} alt={`Cover ${comic.title}`} loading="lazy" onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : null}
                      </div>
                      <div className="comic-info">
                        <h4>{comic.title}</h4>
                        <p>{comic.genre ?? 'Tanpa genre'} · {comic.collection ?? 'Tanpa koleksi'}</p>
                        <a href={comic.source_url ?? '#'} target="_blank" rel="noreferrer">{comic.source_name ?? comic.source_url ?? 'Sumber'}</a>
                      </div>
                      <div className="comic-meta">
                        <span>{comic.progress}%</span>
                        <small>{comic.history ?? 'Tidak ada riwayat'}</small>
                        <div className="comic-actions">
                          <button type="button" className="mini-action" onClick={(event) => { event.stopPropagation(); handleEditComic(comic); }}>Edit</button>
                          <button className="mini-action danger" onClick={async (event) => { event.stopPropagation(); if (!(await requestConfirm('Hapus Komik?', `Komik "${comic.title}" akan dihapus.`))) return; await deleteComic(comic.id); await syncNow(); }}>Hapus</button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className="library-side-column">
                <section className="filters panel library-filter-panel">
                  <div className="filters-top">
                    <div className="filters-title">
                      <p className="eyebrow">Library</p>
                      <h3>Cari dan filter</h3>
                      <span className="badge">{filteredComics.length} item</span>
                    </div>
                    <div className="filters-search">
                      <input
                        className="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Cari judul..."
                      />
                      <div className="inline-actions filter-toolbar">
                        <button type="button" className="secondary" onClick={() => openLabelForm('genre')}>+ Genre</button>
                        <button type="button" className="secondary" onClick={() => openLabelForm('collection')}>+ Koleksi</button>
                        <button type="button" className="secondary" onClick={() => openLabelForm('tag')}>+ Tag</button>
                        <select className="sort-select" value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}>
                          <option value="updated_at_desc">Baru diperbarui</option>
                          <option value="created_at_desc">Terbaru ditambahkan</option>
                          <option value="title_asc">Judul (A-Z)</option>
                          <option value="title_desc">Judul (Z-A)</option>
                          <option value="progress_desc">Progress tertinggi</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="filter-stack">
                    <div className="filter-group">
                      <span className="filter-label">Koleksi</span>
                      <div className="chips">
                        {collections.map((collection) => (
                          <button key={collection} type="button" className={collection === selectedCollection ? 'chip active' : 'chip'} onClick={() => setSelectedCollection(collection)}>{collection}</button>
                        ))}
                      </div>
                    </div>
                    <div className="filter-group">
                      <span className="filter-label">Genre</span>
                      <div className="chips">
                        {genres.map((genre) => (
                          <button key={genre} type="button" className={genre === selectedGenre ? 'chip active' : 'chip'} onClick={() => setSelectedGenre(genre)}>{genre}</button>
                        ))}
                      </div>
                    </div>
                    <div className="filter-group">
                      <span className="filter-label">Tag</span>
                      <div className="chips">
                        {tags.map((tag) => (
                          <button key={tag} type="button" className={tag === selectedTag ? 'chip active' : 'chip'} onClick={() => setSelectedTag(tag)}>{tag}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

              <div className="stack library-detail-stack">
                <section className="panel panel-glow detail-panel">
                  <div className="detail-hero">
                    <div className="detail-visual">
                      <div className="detail-cover-thumb" aria-hidden="true">
                        <span>{activeComic?.title.trim().charAt(0).toUpperCase() || '?'}</span>
                        {activeComic?.cover_url ? <img src={activeComic.cover_url} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : null}
                      </div>
                      <div className="detail-ribbon">Detail Komik</div>
                      <h3>{activeComic?.title ?? 'Pilih komik'}</h3>
                      <p>{activeComic?.genre ?? 'Tanpa genre'} · {activeComic?.collection ?? 'Tanpa koleksi'}</p>
                      <div className="detail-progress"><span style={{ width: `${activeComic?.progress ?? 0}%` }} /></div>
                    </div>
                    <div className="detail-meta">
                      <span>Sumber</span>
                      <strong>{activeComic?.source_name ?? 'Belum ada'}</strong>
                      <span>Link</span>
                      <a href={activeComic?.source_url ?? '#'} target="_blank" rel="noreferrer">{activeComic?.source_url ?? 'Belum ada link'}</a>
                      <span>Riwayat</span>
                      <strong>{activeComic?.history ?? 'Belum ada catatan'}</strong>
                    </div>
                  </div>
                  <div className="detail-tabs">
                    {(['info', 'source', 'history', 'label'] as const).map((tab) => (
                      <button key={tab} type="button" className={detailTab === tab ? 'detail-tab active' : 'detail-tab'} onClick={() => setDetailTab(tab)}>
                        {tab === 'info' ? 'Info' : tab === 'source' ? 'Sumber' : tab === 'history' ? 'Riwayat' : 'Label'}
                      </button>
                    ))}
                  </div>
                  <div className="detail-content">
                    {detailTab === 'info' && (
                      <div className="detail-grid">
                        <div><span>Genre</span><strong>{activeComic?.genre ?? 'Tanpa genre'}</strong></div>
                        <div><span>Koleksi</span><strong>{activeComic?.collection ?? 'Tanpa koleksi'}</strong></div>
                        <div><span>Progress</span><strong>{activeComic?.progress ?? 0}%</strong></div>
                        <div><span>Update</span><strong>{formatShortDate(activeComic?.updated_at)}</strong></div>
                      </div>
                    )}
                    {detailTab === 'source' && (
                      <div className="detail-stack">
                        {activeSources.length === 0 ? <p className="muted">Belum ada sumber tersimpan.</p> : activeSources.map((source) => (<article className="source-card" key={source.id}><div><strong>{source.label ?? 'Sumber'}</strong><a href={source.url} target="_blank" rel="noreferrer">{source.url}</a></div><button type="button" className="mini-action" onClick={() => openSourceEdit(source)}>Edit</button></article>))}
                      </div>
                    )}
                    {detailTab === 'history' && (
                      <div className="detail-stack">
                        {activeProgresses.length === 0 ? <p className="muted">Belum ada riwayat baca untuk komik ini.</p> : activeProgresses.slice(0, 6).map((progress) => (<article className="history-card" key={progress.id}><div><strong>{progress.chapter_label ?? 'Bab'}</strong><span>Halaman {progress.page_index}</span></div><button type="button" className="mini-action danger" onClick={async () => { if (!(await requestConfirm('Hapus Riwayat?', 'Riwayat baca ini akan dihapus.'))) return; await deleteReadingProgress(progress.id); await syncNow(); }}>Hapus</button></article>))}
                      </div>
                    )}
                    {detailTab === 'label' && (
                      <div className="detail-stack">
                        <div className="label-pick-grid">
                          {labels.map((label) => {
                            const active = activeLabelLinks.some((link) => link.label_id === label.id);
                            return (<button type="button" key={label.id} className={active ? 'label-pill active' : 'label-pill'} onClick={() => toggleComicLabel(label.id)}><strong>{label.name}</strong><small>{label.kind}</small></button>);
                          })}
                        </div>
                        <div className="label-grid">{activeLabels.length === 0 ? <p className="muted">Belum ada label yang aktif untuk komik ini.</p> : activeLabels.map((label) => (<article className="label-card" key={label.id}><strong>{label.name}</strong><small>{label.kind}</small></article>))}</div>
                      </div>
                    )}
                  </div>
                </section>
              </div>
              </div>
            </section>
          </section>
        )}

        {activeMenu === 'history' && (
          <section className="panel compact-panel">
            <div className="panel-head"><div><p className="eyebrow">Riwayat</p><h3>Daftar baca terakhir</h3></div><button type="button" className="secondary" onClick={handleProgress}>Simpan progress</button></div>
            <div className="stack-actions">
              <select value={activeComic?.id ?? ''} onChange={(event) => setActiveComicId(event.target.value)}>
                {comics.map((comic) => (<option key={comic.id} value={comic.id}>{comic.title}</option>))}
              </select>
              <div className="history-list">{progresses.slice(0, 8).map((progress) => (<article className="history-card" key={progress.id}><div><strong>{progress.chapter_label ?? 'Bab'}</strong><span>Halaman {progress.page_index}</span></div><button type="button" className="mini-action danger" onClick={async () => { if (!(await requestConfirm('Hapus Riwayat?', 'Riwayat baca ini akan dihapus.'))) return; await deleteReadingProgress(progress.id); await syncNow(); }}>Hapus</button></article>))}</div>
            </div>
          </section>
        )}

        {activeMenu === 'settings' && (
          <section className="stack">
            <section className="settings-account-grid">
              <article className="panel compact-panel settings-card profile-summary-card">
                <div className="settings-card-icon" aria-hidden="true">{(profileUsername || sessionEmail).charAt(0).toUpperCase()}</div>
                <div className="settings-card-copy">
                  <p className="eyebrow">Profil</p>
                  <h3>{profileUsername || 'Atur username'}</h3>
                  <p className="muted">{sessionEmail}</p>
                </div>
                <button type="button" className="secondary" onClick={() => setActiveMenu('profile')}>Kelola profil</button>
              </article>
              <article className="panel compact-panel settings-card sync-settings-card">
                <div className="settings-card-copy">
                  <p className="eyebrow">Sinkronisasi</p>
                  <h3>{syncLabel[syncState]}</h3>
                  <p className="muted">{message}</p>
                </div>
                <div className="inline-actions settings-card-actions">
                  <button type="button" className="primary" onClick={syncNow}>Sync Sekarang</button>
                  <button type="button" className="secondary" onClick={handleLogout}>Logout</button>
                </div>
              </article>
            </section>
            <section className="panel compact-panel import-manager">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Import & Export</p>
                  <h3>Kelola file library</h3>
                  <p className="muted">Tambahkan publikasi atau pulihkan data dari arsip sebelumnya.</p>
                </div>
              </div>
              <div className="import-grid">
                <label className="import-option import-option-publication">
                  <input
                    type="file"
                    accept=".pdf,.cbz,.epub,.png,.jpg,.jpeg"
                    onChange={(event) => {
                      void handleImportLocalFile(event.target.files);
                      event.currentTarget.value = '';
                    }}
                  />
                  <span className="import-icon" aria-hidden="true">P</span>
                  <span className="import-copy">
                    <strong>Import publikasi</strong>
                    <small>PDF, CBZ, EPUB, atau gambar</small>
                  </span>
                  <span className="import-action">Pilih file</span>
                </label>
                <label className="import-option import-option-json">
                  <input
                    type="file"
                    accept=".json"
                    onChange={(event) => {
                      void handleImportLibrary(event.target.files);
                      event.currentTarget.value = '';
                    }}
                  />
                  <span className="import-icon" aria-hidden="true">J</span>
                  <span className="import-copy">
                    <strong>Restore JSON</strong>
                    <small>Pulihkan data library dari file JSON</small>
                  </span>
                  <span className="import-action">Pilih file</span>
                </label>
                <label className="import-option import-option-bundle">
                  <input
                    type="file"
                    accept=".zip"
                    onChange={(event) => {
                      void handleImportBundle(event.target.files);
                      event.currentTarget.value = '';
                    }}
                  />
                  <span className="import-icon" aria-hidden="true">Z</span>
                  <span className="import-copy">
                    <strong>Restore bundle</strong>
                    <small>Pulihkan data dan file dari arsip ZIP</small>
                  </span>
                  <span className="import-action">Pilih file</span>
                </label>
              </div>
              {importInfo ? <div className="import-status"><span aria-hidden="true">OK</span><div><strong>File siap diproses</strong><small>{importInfo}</small></div></div> : null}
              <div className="export-row">
                <div>
                  <strong>Cadangkan library</strong>
                  <span>Simpan data dalam format ringan atau bundle lengkap.</span>
                </div>
                <div className="inline-actions">
                  <button type="button" className="secondary" onClick={handleExport}>Export JSON</button>
                  <button type="button" className="secondary" onClick={handleExportBundle}>Export Bundle</button>
                </div>
              </div>
            </section>
            <section className="panel compact-panel label-manager">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Label</p>
                  <h3>Genre, koleksi, dan tag</h3>
                  <p className="muted">Kelola kategori yang digunakan untuk menyusun library.</p>
                </div>
              </div>
              <div className="label-management-grid">
                {[
                  { kind: 'genre', title: 'Genre', description: 'Jenis cerita atau kategori bacaan.' },
                  { kind: 'collection', title: 'Koleksi', description: 'Kelompok khusus dalam library.' },
                  { kind: 'tag', title: 'Tag', description: 'Penanda tambahan untuk komik.' },
                ].map((group) => {
                  const groupLabels = labels.filter((label) => label.kind === group.kind);
                  return (
                    <section className={`label-group label-group-${group.kind}`} key={group.kind}>
                      <div className="label-group-head">
                        <div>
                          <span className="label-kind-badge">{group.title}</span>
                          <strong>{groupLabels.length} item</strong>
                          <small>{group.description}</small>
                        </div>
                        <button type="button" className="secondary" onClick={() => openLabelForm(group.kind)}>+ Tambah</button>
                      </div>
                      <div className="label-manage-list">
                        {groupLabels.length ? groupLabels.map((label) => (
                          <article className="label-manage-card" key={label.id}>
                            <div className="label-manage-name">
                              <span aria-hidden="true">{label.name.trim().charAt(0).toUpperCase() || '?'}</span>
                              <div><strong>{label.name}</strong><small>{group.title}</small></div>
                            </div>
                            <div className="label-manage-actions">
                              <button type="button" className="mini-action" onClick={() => openLabelEdit(label)}>Edit</button>
                              <button type="button" className="mini-action danger" onClick={() => handleDeleteLabel(label)}>Hapus</button>
                            </div>
                          </article>
                        )) : <p className="label-empty">Belum ada {group.title.toLowerCase()}.</p>}
                      </div>
                    </section>
                  );
                })}
              </div>
            </section>
          </section>
        )}

        {activeMenu === 'profile' && (
          <section className="profile-page">
            <section className="profile-page-header">
              <div>
                <p className="eyebrow">Akun</p>
                <h2>Kelola profil</h2>
                <p className="muted">Atur identitas akun dan keamanan login Anda.</p>
              </div>
              <button type="button" className="secondary" onClick={() => setActiveMenu('settings')}>Kembali ke Pengaturan</button>
            </section>
            <section className="panel compact-panel profile-settings-panel">
              <div className="profile-page-identity">
                <div className="profile-page-avatar">{(profileUsername || sessionEmail).charAt(0).toUpperCase()}</div>
                <div><strong>{profileUsername || 'Belum ada username'}</strong><span>{sessionEmail}</span></div>
              </div>
              <form className="profile-form" onSubmit={handleProfileSave}>
                <label>
                  Username
                  <input value={profileUsernameInput} onChange={(event) => setProfileUsernameInput(event.target.value)} placeholder="Masukkan username" minLength={2} maxLength={40} />
                </label>
                <label>
                  Email
                  <input value={sessionEmail} readOnly aria-readonly="true" />
                  <small>Email digunakan untuk login dan tidak diubah dari halaman ini.</small>
                </label>
                <div className="password-section">
                  <div className="password-section-head">
                    <div><strong>Ganti password</strong><span>Password minimal 8 karakter.</span></div>
                    {passwordCooldownRemaining > 0 ? <span className="cooldown-badge">Tersedia dalam {formatCooldown(passwordCooldownRemaining)}</span> : <span className="cooldown-badge ready">Siap diubah</span>}
                  </div>
                  <div className="profile-password-grid">
                    <label>
                      Password baru
                      <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Minimal 8 karakter" minLength={8} autoComplete="new-password" disabled={passwordCooldownRemaining > 0} />
                    </label>
                    <label>
                      Konfirmasi password
                      <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Ulangi password baru" minLength={8} autoComplete="new-password" disabled={passwordCooldownRemaining > 0} />
                    </label>
                  </div>
                </div>
                <div className="profile-form-actions">
                  <button type="button" className="secondary" onClick={() => { setProfileUsernameInput(profileUsername); setNewPassword(''); setConfirmPassword(''); }}>Batalkan perubahan</button>
                  <button type="submit" className="primary" disabled={profileSaving}>{profileSaving ? 'Menyimpan...' : 'Simpan perubahan'}</button>
                </div>
              </form>
            </section>
          </section>
        )}
      </main>
      {formMode && (
        <div className="modal-backdrop" role="presentation">
          <form className="modal modal-large" onSubmit={saveComicForm}>
            <div className="panel-head">
              <div>
                <p className="eyebrow">Komik</p>
                <h3>{formMode === 'create' ? 'Tambah komik' : 'Edit komik'}</h3>
                <p className="muted">
                  {formMode === 'create'
                    ? 'Isi data komik baru lalu simpan.'
                    : 'Ubah data komik lalu simpan perubahan.'}
                </p>
              </div>
              <div className="inline-actions">
                {formMode === 'edit' ? (
                  <button type="button" className="secondary" onClick={handleAddComic}>
                    Tambah Baru
                  </button>
                ) : null}
                <button type="button" className="ghost" onClick={() => setFormMode(null)}>
                  Tutup
                </button>
              </div>
            </div>
            <div className="form-grid">
              <label>
                Judul
                <input value={comicForm.title} onChange={(event) => setComicForm((current) => ({ ...current, title: event.target.value }))} />
              </label>
              <label>
                Sumber Link
                <input value={comicForm.sourceUrl} onChange={(event) => setComicForm((current) => ({ ...current, sourceUrl: event.target.value }))} />
              </label>
              <label>
                Nama Sumber
                <input value={comicForm.sourceName} onChange={(event) => setComicForm((current) => ({ ...current, sourceName: event.target.value }))} />
              </label>
              <label>
                URL Cover
                <input type="url" placeholder="https://.../cover.jpg" value={comicForm.coverUrl} onChange={(event) => setComicForm((current) => ({ ...current, coverUrl: event.target.value }))} />
              </label>
              <label>
                Genre
                <select value={comicForm.genre} onChange={(event) => setComicForm((current) => ({ ...current, genre: event.target.value }))}>
                  <option value="">Pilih genre</option>
                  {genreOptions.map((genre) => (
                    <option key={genre} value={genre}>{genre}</option>
                  ))}
                </select>
              </label>
              <label>
                Koleksi
                <select value={comicForm.collection} onChange={(event) => setComicForm((current) => ({ ...current, collection: event.target.value }))}>
                  <option value="">Pilih koleksi</option>
                  {collectionOptions.map((collection) => (
                    <option key={collection} value={collection}>{collection}</option>
                  ))}
                </select>
              </label>
              <label>
                Progress %
                <input type="number" min="0" max="100" value={comicForm.progress} onChange={(event) => setComicForm((current) => ({ ...current, progress: event.target.value }))} />
              </label>
            </div>
            {comicForm.coverUrl ? (
              <div className="cover-preview">
                <img src={comicForm.coverUrl} alt="Preview cover komik" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
                <div><strong>Preview cover</strong><span>Jika URL dikosongkan, aplikasi akan mencoba mengambil cover dari link sumber.</span></div>
              </div>
            ) : null}
            <label>
              Riwayat
              <input value={comicForm.history} onChange={(event) => setComicForm((current) => ({ ...current, history: event.target.value }))} />
            </label>
            <div className="label-pick-grid">
              {tagOptions.map((tag) => {
                const active = comicFormTagIds.includes(
                  labels.find((label) => label.kind === 'tag' && label.name === tag)?.id ?? '',
                );
                const matchedLabel = labels.find((label) => label.kind === 'tag' && label.name === tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    className={active ? 'label-pill active' : 'label-pill'}
                    onClick={() => {
                      if (!matchedLabel) return;
                      setComicFormTagIds((current) =>
                        current.includes(matchedLabel.id)
                          ? current.filter((id) => id !== matchedLabel.id)
                          : [...current, matchedLabel.id],
                      );
                    }}
                  >
                    <strong>{tag}</strong>
                    <small>tag</small>
                  </button>
                );
              })}
              <button type="button" className="label-pill" onClick={() => openLabelForm('tag')}>
                <strong>+ Tag Baru</strong>
                <small>buat</small>
              </button>
            </div>
            <div className="inline-actions">
              <button type="button" className="secondary" onClick={() => openLabelForm('genre')}>
                + Genre
              </button>
              <button type="button" className="secondary" onClick={() => openLabelForm('collection')}>
                + Koleksi
              </button>
              <button type="button" className="secondary" onClick={() => openLabelForm('tag')}>
                + Tag
              </button>
            </div>
            <div className="label-grid">
              <div className="label-card">
                <strong>Tag yang ada</strong>
                <small>{tagOptions.length ? tagOptions.join(' · ') : 'Belum ada tag tersimpan'}</small>
              </div>
            </div>
            <div className="inline-actions">
              <button type="submit" className="primary">
                {formMode === 'create' ? 'Simpan Komik' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {openPanel === 'source' && (
        <div className="modal-backdrop" role="presentation">
          {sourceEditForm.id ? (
            <form className="modal modal-large" onSubmit={saveSourceEditForm}>
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Sumber</p>
                  <h3>Edit sumber/link</h3>
                </div>
                <button type="button" className="ghost" onClick={() => { setOpenPanel(null); setSourceEditForm(emptySourceEditForm); }}>Tutup</button>
              </div>
              <div className="form-grid">
                <label>
                  Nama sumber
                  <input value={sourceEditForm.label} onChange={(event) => setSourceEditForm((current) => ({ ...current, label: event.target.value }))} />
                </label>
                <label>
                  URL sumber
                  <input value={sourceEditForm.url} onChange={(event) => setSourceEditForm((current) => ({ ...current, url: event.target.value }))} />
                </label>
              </div>
              <button className="primary" type="submit">Simpan Perubahan</button>
            </form>
          ) : (
            <form className="modal modal-large" onSubmit={saveSourceForm}>
            <div className="panel-head">
              <div>
                <p className="eyebrow">Sumber</p>
                <h3>Tambah sumber/link komik</h3>
              </div>
              <button type="button" className="ghost" onClick={() => setOpenPanel(null)}>Tutup</button>
            </div>
            <div className="form-grid">
              <label>
                Komik
                <select value={sourceForm.comicId} onChange={(event) => setSourceForm((current) => ({ ...current, comicId: event.target.value }))}>
                  <option value="">Pilih komik</option>
                  {comics.map((comic) => (
                    <option key={comic.id} value={comic.id}>{comic.title}</option>
                  ))}
                </select>
              </label>
              <label>
                Nama sumber
                <input value={sourceForm.label} onChange={(event) => setSourceForm((current) => ({ ...current, label: event.target.value }))} />
              </label>
            </div>
            <label>
              URL sumber
              <input value={sourceForm.url} onChange={(event) => setSourceForm((current) => ({ ...current, url: event.target.value }))} />
            </label>
            <button className="primary" type="submit">Simpan Sumber</button>
            </form>
          )}
        </div>
      )}

      {openPanel === 'label' && (
        <div className="modal-backdrop" role="presentation">
          <form className="modal modal-large" onSubmit={saveLabelForm}>
            <div className="panel-head">
              <div>
                <p className="eyebrow">Label</p>
                <h3>{editingLabel ? 'Edit label' : 'Buat label baru'}</h3>
              </div>
              <button type="button" className="ghost" onClick={() => { setOpenPanel(null); setEditingLabel(null); setLabelForm(emptyLabelForm); }}>Tutup</button>
            </div>
            <div className="form-grid">
              <label>
                Nama label
                <input value={labelForm.name} onChange={(event) => setLabelForm((current) => ({ ...current, name: event.target.value }))} />
              </label>
              <label>
                Tipe
                <select value={labelForm.kind} onChange={(event) => setLabelForm((current) => ({ ...current, kind: event.target.value }))}>
                  <option value="collection">Collection</option>
                  <option value="genre">Genre</option>
                  <option value="tag">Tag</option>
                </select>
              </label>
            </div>
            <button className="primary" type="submit">{editingLabel ? 'Simpan Perubahan' : 'Simpan Label'}</button>
          </form>
        </div>
      )}

      {confirmState.open && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal" role="dialog" aria-modal="true">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Konfirmasi</p>
                <h3>{confirmState.title}</h3>
              </div>
              <button type="button" className="ghost" onClick={() => closeConfirm(false)}>
                Batal
              </button>
            </div>
            <p className="muted">{confirmState.message}</p>
            <div className="inline-actions" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="primary" onClick={() => closeConfirm(true)}>
                Ya, lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
