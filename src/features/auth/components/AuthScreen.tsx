import type { FormEventHandler, ReactNode } from 'react';

import { PASSWORD_MIN_LENGTH } from '../../../lib/constants/limits';
import type { Locale } from '../../settings';
import type { AuthMode } from '../types';
import { PasswordRequirements } from './PasswordRequirements';

type AuthLabels = {
  forgotPassword: string;
  login: string;
  signup: string;
};

type AuthScreenProps = {
  authMode: AuthMode;
  cloudConfigMissing: boolean;
  forgotPasswordLoading: boolean;
  labels: AuthLabels;
  locale: Locale;
  loginEmail: string;
  loginPassword: string;
  recoveryMode: boolean;
  recoveryPassword: string;
  recoveryPasswordConfirm: string;
  toast: ReactNode;
  onAuthModeChange: (mode: AuthMode) => void;
  onBackToLogin: () => void;
  onEmailChange: (value: string) => void;
  onForgotPassword: () => void;
  onLogin: FormEventHandler<HTMLFormElement>;
  onOpenForgotPassword: () => void;
  onPasswordChange: (value: string) => void;
  onRecoveryPasswordChange: (value: string) => void;
  onRecoveryPasswordConfirmChange: (value: string) => void;
  onRecoverySubmit: FormEventHandler<HTMLFormElement>;
  translate: (indonesian: string, english: string) => string;
};

export function AuthScreen({
  authMode,
  cloudConfigMissing,
  forgotPasswordLoading,
  labels,
  locale,
  loginEmail,
  loginPassword,
  recoveryMode,
  recoveryPassword,
  recoveryPasswordConfirm,
  toast,
  onAuthModeChange,
  onBackToLogin,
  onEmailChange,
  onForgotPassword,
  onLogin,
  onOpenForgotPassword,
  onPasswordChange,
  onRecoveryPasswordChange,
  onRecoveryPasswordConfirmChange,
  onRecoverySubmit,
  translate,
}: AuthScreenProps) {
  return (
    <div className="auth-screen">
      {toast}
      <section className="auth-panel">
        <div className="auth-card-top">
          <img className="auth-mark" src="/app-icon.png" alt="" aria-hidden="true" />
          <div>
            <p className="auth-kicker">Arsip Buku Gua</p>
            <h2>
              {recoveryMode || authMode === 'forgot'
                ? translate('Reset password', 'Reset password')
                : authMode === 'login'
                  ? labels.login
                  : labels.signup}
            </h2>
          </div>
        </div>
        {cloudConfigMissing ? (
          <p className="auth-note">
            {translate(
              'Konfigurasi cloud belum ditemukan. Buat file',
              'Cloud configuration was not found. Create',
            )}{' '}
            <code>.env</code> {translate('dari', 'from')} <code>.env.example</code>,{' '}
            {translate(
              'isi URL dan anon key, lalu restart aplikasi.',
              'add the URL and anon key, then restart the app.',
            )}
          </p>
        ) : null}
        {authMode === 'forgot' && !recoveryMode ? (
          <p className="auth-note auth-note-strong">
            {locale === 'id'
              ? 'Masukkan email yang terdaftar untuk mengirim link reset password.'
              : 'Enter the registered email to send a password reset link.'}
          </p>
        ) : null}
        {recoveryMode ? (
          <form className="auth-form" onSubmit={onRecoverySubmit}>
            <label>
              {translate('Password baru', 'New password')}
              <input
                type="password"
                value={recoveryPassword}
                onChange={(event) => onRecoveryPasswordChange(event.target.value)}
                placeholder={translate('Minimal 6 karakter', 'Minimum 6 characters')}
                minLength={PASSWORD_MIN_LENGTH}
                autoComplete="new-password"
              />
            </label>
            <PasswordRequirements password={recoveryPassword} locale={locale} compact />
            <label>
              {translate('Ulangi password', 'Repeat password')}
              <input
                type="password"
                value={recoveryPasswordConfirm}
                onChange={(event) => onRecoveryPasswordConfirmChange(event.target.value)}
                placeholder={translate('Ulangi password baru', 'Repeat the new password')}
                minLength={PASSWORD_MIN_LENGTH}
                autoComplete="new-password"
              />
            </label>
            <button className="primary auth-submit" type="submit" disabled={cloudConfigMissing}>
              {locale === 'id' ? 'Simpan password' : 'Save password'}
            </button>
          </form>
        ) : authMode === 'forgot' ? (
          <form
            className="auth-form"
            onSubmit={(event) => {
              event.preventDefault();
              onForgotPassword();
            }}
          >
            <label>
              Email
              <input
                value={loginEmail}
                onChange={(event) => onEmailChange(event.target.value)}
                placeholder={translate('nama@contoh.com', 'name@example.com')}
                autoFocus
              />
            </label>
            <button
              className="primary auth-submit"
              type="submit"
              disabled={cloudConfigMissing || forgotPasswordLoading}
            >
              {forgotPasswordLoading
                ? locale === 'id'
                  ? 'Mengirim...'
                  : 'Sending...'
                : locale === 'id'
                  ? 'Kirim link reset'
                  : 'Send reset link'}
            </button>
            <div className="auth-links">
              <button type="button" className="ghost auth-link" onClick={onBackToLogin}>
                {locale === 'id' ? 'Kembali' : 'Back'}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div
              className="auth-tabs"
              role="tablist"
              aria-label={translate('Mode autentikasi', 'Authentication mode')}
            >
              <button
                type="button"
                role="tab"
                aria-selected={authMode === 'login'}
                className={authMode === 'login' ? 'auth-tab active' : 'auth-tab'}
                onClick={() => onAuthModeChange('login')}
              >
                {labels.login}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={authMode === 'signup'}
                className={authMode === 'signup' ? 'auth-tab active' : 'auth-tab'}
                onClick={() => onAuthModeChange('signup')}
              >
                {labels.signup}
              </button>
            </div>
            <form className="auth-form" onSubmit={onLogin}>
              <label>
                Email
                <input
                  value={loginEmail}
                  onChange={(event) => onEmailChange(event.target.value)}
                  placeholder={translate('nama@contoh.com', 'name@example.com')}
                  autoFocus
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(event) => onPasswordChange(event.target.value)}
                  placeholder={translate('Masukkan password', 'Enter password')}
                  minLength={PASSWORD_MIN_LENGTH}
                />
              </label>
              {authMode === 'signup' ? (
                <PasswordRequirements password={loginPassword} locale={locale} />
              ) : null}
              <button className="primary auth-submit" type="submit" disabled={cloudConfigMissing}>
                {authMode === 'login' ? labels.login : locale === 'id' ? 'Buat akun' : 'Create account'}
              </button>
            </form>
            <div className="auth-links">
              <button type="button" className="ghost auth-link" onClick={onOpenForgotPassword}>
                {labels.forgotPassword}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
