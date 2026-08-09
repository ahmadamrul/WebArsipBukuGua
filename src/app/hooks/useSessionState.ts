import { useEffect, useState } from 'react';
import { getSession, type AuthMode } from '../../features/auth';
import type { SyncState } from '../../lib/types/shared';

type SetState<T> = (value: T | ((current: T) => T)) => void;

export type SessionStateDeps = {
  setMessage: SetState<string>;
  setMessageTone: SetState<'info' | 'success' | 'warning' | 'error'>;
  setDebugError: SetState<string>;
};

export function useSessionState({ setMessage, setMessageTone, setDebugError }: SessionStateDeps) {
  const [ready, setReady] = useState(false);
  const [sessionEmail, setSessionEmail] = useState('');
  const [profileUsername, setProfileUsername] = useState('');
  const [profileUsernameInput, setProfileUsernameInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordChangedAt, setPasswordChangedAt] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<SyncState>('belum-login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLogin, setShowLogin] = useState(true);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [recoveryPasswordConfirm, setRecoveryPasswordConfirm] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);

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
          setMessageTone('success');
          setDebugError('');
        }
      })
      .catch(() => {
        if (active) {
          setMessage('Wajib login untuk masuk.');
          setMessageTone('warning');
        }
      });
    return () => {
      active = false;
    };
  }, [setDebugError, setMessage, setMessageTone]);

  useEffect(() => {
    const hash = window.location.hash.toLowerCase();
    const search = window.location.search.toLowerCase();
    const recoveryDetected =
      hash.includes('type=recovery') ||
      search.includes('type=recovery') ||
      hash.includes('access_token=') ||
      hash.includes('recovery');
    if (recoveryDetected) {
      setRecoveryMode(true);
      setShowLogin(true);
      setAuthMode('login');
      setMessage('Masukkan password baru untuk menyelesaikan reset.');
      setMessageTone('info');
    }
  }, [setMessage, setMessageTone]);

  return {
    ready,
    setReady,
    sessionEmail,
    setSessionEmail,
    profileUsername,
    setProfileUsername,
    profileUsernameInput,
    setProfileUsernameInput,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    profileSaving,
    setProfileSaving,
    passwordChangedAt,
    setPasswordChangedAt,
    syncState,
    setSyncState,
    loginEmail,
    setLoginEmail,
    loginPassword,
    setLoginPassword,
    showLogin,
    setShowLogin,
    authMode,
    setAuthMode,
    recoveryMode,
    setRecoveryMode,
    recoveryPassword,
    setRecoveryPassword,
    recoveryPasswordConfirm,
    setRecoveryPasswordConfirm,
    forgotPasswordLoading,
    setForgotPasswordLoading,
  };
}
