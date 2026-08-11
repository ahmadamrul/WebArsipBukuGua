import {
  getSession,
  requestPasswordReset,
  signIn,
  signUp,
  signOut,
  updateAccountPassword,
  updateProfileUsername,
  normalizeAuthError,
  isPasswordStrongEnough,
} from '../../features/auth';
import { deleteStoredComicCover, replaceComicCover, updateComic, readPendingCoverSync, writePendingCoverSync } from '../../features/comics';
import { loadLibrary } from '../bootstrap/library';
import { cloudConfigMissing } from '../../lib/api/supabaseClient';
import type { SyncState } from '../../lib/types/shared';
import type { FormEvent } from 'react';
import { toDebugMessage, toErrorMessage } from '../../lib/utils/errors';
import type { Comic, PendingCoverSync } from '../../features/comics';
import type { ComicLabel, LibraryLabel } from '../../features/labels';
import type { ComicSource } from '../../features/sources';
import type { ReadingProgress } from '../../features/reading-progress';

type SetState<T> = (value: T | ((current: T) => T)) => void;

export type SessionActionsDeps = {
  ready: boolean;
  authMode: 'login' | 'signup' | 'forgot';
  loginEmail: string;
  loginPassword: string;
  recoveryPassword: string;
  recoveryPasswordConfirm: string;
  profileUsername: string;
  profileUsernameInput: string;
  newPassword: string;
  confirmPassword: string;
  setReady: SetState<boolean>;
  setSessionEmail: SetState<string>;
  setProfileUsername: SetState<string>;
  setProfileUsernameInput: SetState<string>;
  setPasswordChangedAt: SetState<string | null>;
  setShowLogin: SetState<boolean>;
  setSyncState: SetState<SyncState>;
  setProfileSaving: SetState<boolean>;
  setMessage: SetState<string>;
  setMessageTone: SetState<'info' | 'success' | 'warning' | 'error'>;
  setDebugError: SetState<string>;
  setLoginPassword: SetState<string>;
  setForgotPasswordLoading: SetState<boolean>;
  setRecoveryMode: SetState<boolean>;
  setRecoveryPassword: SetState<string>;
  setRecoveryPasswordConfirm: SetState<string>;
  setNewPassword: SetState<string>;
  setConfirmPassword: SetState<string>;
  setComics: SetState<Comic[]>;
  setLabels: SetState<LibraryLabel[]>;
  setComicLabels: SetState<ComicLabel[]>;
  setSources: SetState<ComicSource[]>;
  setProgresses: SetState<ReadingProgress[]>;
  setConfirmState: SetState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel: string;
    resolver: ((value: boolean) => void) | null;
  }>;
};

export function createSessionActions(deps: SessionActionsDeps) {
  const {
    ready,
    authMode,
    loginEmail,
    loginPassword,
    recoveryPassword,
    recoveryPasswordConfirm,
    profileUsername,
    profileUsernameInput,
    newPassword,
    confirmPassword,
    setReady,
    setSessionEmail,
    setProfileUsername,
    setProfileUsernameInput,
    setPasswordChangedAt,
    setShowLogin,
    setSyncState,
    setProfileSaving,
    setMessage,
    setMessageTone,
    setDebugError,
    setLoginPassword,
    setForgotPasswordLoading,
    setRecoveryMode,
    setRecoveryPassword,
    setRecoveryPasswordConfirm,
    setNewPassword,
    setConfirmPassword,
    setComics,
    setLabels,
    setComicLabels,
    setSources,
    setProgresses,
    setConfirmState,
  } = deps;

  const requestConfirmAction = (title: string, message: string, confirmLabel = '', cancelLabel = '') =>
    new Promise<boolean>((resolve) => {
      setConfirmState({ open: true, title, message, confirmLabel, cancelLabel, resolver: resolve });
    });

  const closeConfirm = (value: boolean) => {
    setConfirmState((current) => {
      current.resolver?.(value);
      return { open: false, title: '', message: '', confirmLabel: '', cancelLabel: '', resolver: null };
    });
  };

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (cloudConfigMissing) {
      setSyncState('gagal');
      setMessage('Akun cloud belum dikonfigurasi. Isi file .env lalu restart app.');
      setMessageTone('error');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail.trim())) return;
    setSyncState('sedang-sync');
    try {
      if (authMode === 'signup') {
        await signUp(loginEmail.trim(), loginPassword.trim());
        const session = await getSession();
        if (session) {
          setSessionEmail(session.email);
          setProfileUsername(session.username);
          setProfileUsernameInput(session.username);
          setPasswordChangedAt(session.passwordChangedAt);
          setReady(true);
          setShowLogin(false);
          setSyncState('siap-sync');
          setMessage('Akun dibuat dan login aktif.');
          setMessageTone('success');
        } else {
          setSyncState('siap-sync');
          setShowLogin(true);
          setMessage('Akun dibuat. Cek email untuk verifikasi lalu login ulang.');
          setMessageTone('warning');
        }
        setDebugError('');
        return;
      }
      await signIn(loginEmail.trim(), loginPassword.trim());
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
      setMessageTone('success');
      setDebugError('');
    } catch (error) {
      setSyncState('gagal');
      setMessage(normalizeAuthError(error, 'Login gagal'));
      setMessageTone('error');
      setDebugError(toDebugMessage(error));
    }
  };

  const handleForgotPassword = async () => {
    try {
      setForgotPasswordLoading(true);
      await requestPasswordReset(loginEmail.trim());
      setLoginPassword('');
      setMessage('Kalau email terdaftar, link reset sudah dikirim. Cek email untuk lanjut reset password.');
      setMessageTone('success');
    } catch (error) {
      setMessage(normalizeAuthError(error, 'Reset password gagal'));
      setMessageTone('error');
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleRecoveryPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isPasswordStrongEnough(recoveryPassword) || recoveryPassword !== recoveryPasswordConfirm) return;
    try {
      await updateAccountPassword(recoveryPassword);
      setRecoveryMode(false);
      setRecoveryPassword('');
      setRecoveryPasswordConfirm('');
      setMessage('Password berhasil diperbarui. Silakan login ulang.');
      setMessageTone('success');
    } catch (error) {
      setMessage(normalizeAuthError(error, 'Perbarui password gagal'));
      setMessageTone('error');
    }
  };

  const PENDING_COVER_RETRY_CONCURRENCY = 3;
  let pendingCoverRetryRunning = false;

  const processPendingCoverRetries = async () => {
    if (pendingCoverRetryRunning) return;
    const pendingCovers = readPendingCoverSync();
    if (pendingCovers.length === 0) return;
    pendingCoverRetryRunning = true;
    try {
      const remainingCovers: PendingCoverSync[] = [];
      const queue = [...pendingCovers];
      const worker = async () => {
        while (queue.length > 0) {
          const pendingCover = queue.shift();
          if (!pendingCover) break;
          try {
            const uploadedCover = await replaceComicCover(pendingCover.comicId, pendingCover.coverUrl, pendingCover.comicTitle);
            await updateComic(pendingCover.comicId, {
              coverUrl: uploadedCover.coverUrl,
              coverStoragePath: uploadedCover.coverStoragePath,
            });
            if (pendingCover.previousStoragePath && pendingCover.previousStoragePath !== uploadedCover.coverStoragePath) {
              await deleteStoredComicCover(pendingCover.previousStoragePath);
            }
          } catch (error) {
            console.error('Failed to sync cover:', error);
            remainingCovers.push(pendingCover);
          }
        }
      };
      await Promise.all(Array.from({ length: PENDING_COVER_RETRY_CONCURRENCY }, () => worker()));
      writePendingCoverSync(remainingCovers);
      // Silently refresh so successfully-cached covers show up without another manual sync.
      const refreshed = await loadLibrary();
      setComics(refreshed.comics);
      setLabels(refreshed.labels);
      setComicLabels(refreshed.comicLabels);
      setSources(refreshed.sources);
      setProgresses(refreshed.progresses);
    } finally {
      pendingCoverRetryRunning = false;
    }
  };

  const syncNow = async (
    processPendingCovers = false,
    options?: { suppressSuccessMessage?: boolean; suppressErrorMessage?: boolean },
  ) => {
    if (!ready) {
      setShowLogin(true);
      setMessage('Wajib login untuk masuk.');
      setMessageTone('warning');
      return false;
    }
    setSyncState('sedang-sync');
    try {
      if (processPendingCovers) {
        // Runs in the background so a large retry queue never blocks the sync
        // button from finishing quickly.
        void processPendingCoverRetries();
      }
      const snapshot = await loadLibrary();
      setComics(snapshot.comics);
      setLabels(snapshot.labels);
      setComicLabels(snapshot.comicLabels);
      setSources(snapshot.sources);
      setProgresses(snapshot.progresses);
      setSyncState('berhasil');
      if (!options?.suppressSuccessMessage) {
        setMessage('Sinkronisasi berhasil.');
        setMessageTone('success');
      }
      setDebugError('');
      return true;
    } catch (error) {
      setSyncState('gagal');
      if (!options?.suppressErrorMessage) {
        setMessage(`Sinkronisasi gagal: ${toErrorMessage(error)}`);
        setMessageTone('error');
      }
      setDebugError(toDebugMessage(error));
      return false;
    }
  };

  const handleLogout = async () => {
    await signOut();
    setReady(false);
    setShowLogin(true);
    setMessage('Logout berhasil.');
  };

  const handleProfileSave = async (event: FormEvent) => {
    event.preventDefault();
    setProfileSaving(true);
    if (profileUsernameInput.trim() !== profileUsername) await updateProfileUsername(profileUsernameInput);
    if (newPassword || confirmPassword) await updateAccountPassword(newPassword);
    setNewPassword('');
    setConfirmPassword('');
    setProfileSaving(false);
  };

  return { requestConfirmAction, closeConfirm, login, handleForgotPassword, handleRecoveryPassword, syncNow, handleLogout, handleProfileSave };
}
