import type { Locale } from '../types';

export const localeLabels: Record<
  Locale,
  {
    settings: string;
    profile: string;
    language: string;
    indonesian: string;
    english: string;
    close: string;
    backToSettings: string;
    saveComic: string;
    saveChanges: string;
    info: string;
    dashboard: string;
    history: string;
    library: string;
    login: string;
    signup: string;
    forgotPassword: string;
    logout: string;
    syncNow: string;
    manageProfile: string;
    add: string;
    labels: string;
    sources: string;
    collection: string;
    genre: string;
    tag: string;
  }
> = {
  id: {
    settings: 'Pengaturan',
    profile: 'Kelola profil',
    language: 'Bahasa',
    indonesian: 'Indonesia',
    english: 'English',
    close: 'Tutup',
    backToSettings: 'Kembali ke Pengaturan',
    saveComic: 'Simpan Komik',
    saveChanges: 'Simpan perubahan',
    info: 'Info',
    dashboard: 'Dashboard',
    history: 'Riwayat',
    library: 'Library',
    login: 'Masuk',
    signup: 'Daftar',
    forgotPassword: 'Lupa sandi',
    logout: 'Logout',
    syncNow: 'Sync Sekarang',
    manageProfile: 'Kelola profil',
    add: 'Tambah',
    labels: 'Label',
    sources: 'Sumber',
    collection: 'Koleksi',
    genre: 'Genre',
    tag: 'Tag',
  },
  en: {
    settings: 'Settings',
    profile: 'Manage profile',
    language: 'Language',
    indonesian: 'Indonesian',
    english: 'English',
    close: 'Close',
    backToSettings: 'Back to Settings',
    saveComic: 'Save Comic',
    saveChanges: 'Save Changes',
    info: 'Info',
    dashboard: 'Dashboard',
    history: 'History',
    library: 'Library',
    login: 'Login',
    signup: 'Sign up',
    forgotPassword: 'Forgot password',
    logout: 'Logout',
    syncNow: 'Sync Now',
    manageProfile: 'Manage profile',
    add: 'Add',
    labels: 'Labels',
    sources: 'Sources',
    collection: 'Collection',
    genre: 'Genre',
    tag: 'Tag',
  },
};

export function translateRuntimeText(text: string, locale: Locale) {
  if (locale === 'id' || !text) return text;
  const exact: Record<string, string> = {
    'Login dulu untuk masuk ke arsip.': 'Log in to access your archive.',
    'Akun terhubung. Sinkronisasi siap.': 'Account connected. Ready to sync.',
    'Wajib login untuk masuk.': 'You must log in to continue.',
    'Masukkan password baru untuk menyelesaikan reset.': 'Enter a new password to complete the reset.',
    'Data cloud berhasil dimuat.': 'Cloud data loaded successfully.',
    'Akun cloud belum dikonfigurasi. Isi file .env lalu restart app.':
      'Cloud account is not configured. Complete the .env file, then restart the app.',
    'Email wajib diisi.': 'Email is required.',
    'Password wajib diisi.': 'Password is required.',
    'Format email tidak valid.': 'Invalid email format.',
    'Akun dibuat dan login aktif.': 'Account created and logged in.',
    'Akun dibuat. Cek email untuk verifikasi lalu login ulang.':
      'Account created. Check your email to verify it, then log in again.',
    'Sesi login tidak ditemukan.': 'Login session was not found.',
    'Login berhasil. Dashboard dibuka.': 'Login successful. Opening the dashboard.',
    'Isi email dulu untuk kirim link reset password.':
      'Enter your email before sending a password reset link.',
    'Kalau email terdaftar, link reset sudah dikirim. Cek email untuk lanjut reset password.':
      'If the email is registered, a reset link has been sent. Check your inbox to continue.',
    'Password harus minimal 6 karakter dan berisi huruf kecil, huruf besar, dan angka.':
      'Password must be at least 6 characters and include lowercase, uppercase, and a number.',
    'Konfirmasi password tidak sama.': 'Password confirmation does not match.',
    'Password berhasil diperbarui. Silakan login ulang.':
      'Password updated successfully. Please log in again.',
    'Sinkronisasi berhasil.': 'Sync completed successfully.',
    'Judul komik wajib diisi.': 'Comic title is required.',
    'Isi dulu minimal satu link sumber untuk cek cover.':
      'Add at least one source link before checking covers.',
    'Tidak ada data sumber yang bisa dibaca.': 'No readable source data was found.',
    'Belum ada cover di link pertama. Silakan tambah sumber lain lalu cek lagi.':
      'No cover was found in the first link. Add another source and check again.',
    'Komik dan URL sumber wajib diisi.': 'Comic and source URL are required.',
    'URL sumber wajib diisi.': 'Source URL is required.',
    'Nama label wajib diisi.': 'Label name is required.',
    'Arsip diekspor.': 'Archive exported.',
    'Bundle arsip diekspor.': 'Archive bundle exported.',
    'Arsip berhasil diimpor.': 'Archive imported successfully.',
    'File lokal dibaca. Tinggal diproses ke cloud.': 'Local file loaded and ready for cloud processing.',
    'Bundle arsip berhasil diimpor.': 'Archive bundle imported successfully.',
    'Logout berhasil.': 'Logged out successfully.',
    'Tidak ada perubahan profil untuk disimpan.': 'There are no profile changes to save.',
    'Profil berhasil diperbarui.': 'Profile updated successfully.',
    'Email sudah terdaftar. Coba login atau gunakan lupa sandi.':
      'This email is already registered. Try logging in or use Forgot password.',
    'Email atau password salah, atau email belum diverifikasi.':
      'Incorrect email or password, or the email has not been verified.',
    'Anda terlalu sering mengirim link reset password. Coba lagi nanti.':
      'You have sent too many password reset links. Please try again later.',
    'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.':
      'Too many attempts. Wait a moment and try again.',
    'Akses ditolak. Cek konfigurasi Auth di Supabase.':
      'Access denied. Check the Auth configuration in Supabase.',
    'Masukkan email untuk mengirim link reset password.': 'Enter your email to send a password reset link.',
    'Akun cloud belum dikonfigurasi.': 'Cloud account is not configured.',
    'Canvas tidak tersedia.': 'Canvas is unavailable.',
    'Simpan Komik Baru?': 'Save New Comic?',
    'Komik baru akan ditambahkan ke library.': 'The new comic will be added to your library.',
    'Simpan Perubahan?': 'Save Changes?',
    'Data komik yang lama akan ditimpa dengan perubahan baru.':
      'The existing comic data will be replaced with the new changes.',
    'Simpan Sumber?': 'Save Source?',
    'Sumber baru akan ditambahkan dan sumber utama komik ikut diperbarui.':
      'The new source will be added and the comic primary source will be updated.',
    'Simpan Perubahan Sumber?': 'Save Source Changes?',
    'Perubahan sumber akan diterapkan.': 'The source changes will be applied.',
    'Simpan Perubahan Label?': 'Save Label Changes?',
    'Buat Label?': 'Create Label?',
    'Label baru akan ditambahkan ke library.': 'The new label will be added to your library.',
    'Hapus Label?': 'Delete Label?',
    'Tambah Label?': 'Add Label?',
    'Label ini akan dilepas dari komik aktif.': 'This label will be removed from the active comic.',
    'Label ini akan ditambahkan ke komik aktif.': 'This label will be added to the active comic.',
    'Logout?': 'Log out?',
    'Anda akan keluar dari sesi saat ini. Data akun tidak akan dihapus.':
      'You will be signed out of the current session. Your account data will not be deleted.',
    'Simpan Profil?': 'Save Profile?',
    'Username atau password akun akan diperbarui.': 'The account username or password will be updated.',
  };
  if (exact[text]) return exact[text];

  const prefixes: Array<[string, string]> = [
    ['Gagal memuat data cloud:', 'Failed to load cloud data:'],
    ['Daftar gagal:', 'Sign up failed:'],
    ['Login gagal:', 'Login failed:'],
    ['Reset password gagal:', 'Password reset failed:'],
    ['Sinkronisasi gagal:', 'Sync failed:'],
    ['Cover tersimpan lokal. Ukuran', 'Cover stored locally. Size'],
    ['Cover diperbarui. Ukuran', 'Cover updated. Size'],
    ['Simpan komik gagal:', 'Failed to save comic:'],
    ['Cover ditemukan dari link sumber', 'Cover found from source link'],
    ['Cek cover gagal:', 'Cover check failed:'],
    ['Simpan sumber gagal:', 'Failed to save source:'],
    ['Edit sumber gagal:', 'Failed to edit source:'],
    ['Edit label gagal:', 'Failed to edit label:'],
    ['Simpan label gagal:', 'Failed to save label:'],
    ['Hapus label gagal:', 'Failed to delete label:'],
    ['Ubah label gagal:', 'Failed to update label:'],
    ['Import arsip gagal:', 'Archive import failed:'],
    ['Baca file gagal:', 'Failed to read file:'],
    ['Import bundle gagal:', 'Bundle import failed:'],
    ['Logout gagal:', 'Logout failed:'],
    ['Update profil gagal:', 'Profile update failed:'],
    ['Password dapat diganti lagi dalam', 'Password can be changed again in'],
  ];
  for (const [source, target] of prefixes) {
    if (text.startsWith(source)) {
      return `${target}${text.slice(source.length)}`
        .replace(/(\d+) jam/g, '$1 hr')
        .replace(/(\d+) menit/g, '$1 min');
    }
  }
  const updatedLabel = text.match(/^Label "(.+)" akan diperbarui\.$/);
  if (updatedLabel) return `Label "${updatedLabel[1]}" will be updated.`;
  const deletedLabel = text.match(/^Label "(.+)" dan relasinya pada komik akan dihapus\.$/);
  if (deletedLabel) return `Label "${deletedLabel[1]}" and its comic relationships will be deleted.`;
  return text;
}
