# Arsip Buku Gua Web

Aplikasi web React untuk mengelola koleksi buku dan komik. Aplikasi menggunakan akun cloud, sehingga pengguna wajib login sebelum mengakses library dan seluruh data dibatasi berdasarkan akun yang sedang aktif.

## Fitur

- Login dan pendaftaran akun cloud.
- Tambah, edit, dan hapus komik.
- Mode tampilan daftar dan grid.
- Cover komik dari URL manual atau metadata link sumber.
- Genre, koleksi, tag, dan relasi label per komik.
- Pencarian, filter, dan pengurutan library.
- Sumber serta link bacaan per komik.
- Progress dan riwayat baca.
- Import file lokal dan export/import data library.
- Row Level Security untuk memisahkan data setiap pengguna.
- Tampilan responsif untuk desktop dan browser mobile.

## Teknologi

- React 19
- TypeScript
- Vite
- Supabase Auth dan Postgres
- JSZip dan fast-xml-parser untuk import file

## Persyaratan

- Node.js 20 atau lebih baru.
- npm.
- Proyek Supabase dengan Auth email/password aktif.

## Menjalankan Proyek

1. Install dependency:

```bash
npm install
```

2. Salin konfigurasi environment:

```powershell
Copy-Item .env.example .env
```

Pada macOS atau Linux:

```bash
cp .env.example .env
```

3. Isi `.env` dengan konfigurasi proyek:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_your_key_here
```

Gunakan **Project URL** dan **Publishable key** dari pengaturan API proyek. Jangan gunakan secret key atau service-role key di aplikasi browser.

4. Buka SQL Editor pada dashboard proyek, jalankan seluruh isi [`supabase/schema.sql`](supabase/schema.sql), lalu pastikan tidak ada error.

5. Jalankan development server:

```bash
npm run dev
```

Aplikasi tersedia di alamat yang ditampilkan Vite, biasanya `http://localhost:5173`.

## Perintah

```bash
npm run dev      # Menjalankan development server
npm run build    # Type-check dan membuat production build
npm run preview  # Menampilkan production build secara lokal
```

## Struktur Proyek

```text
src/
  App.tsx                  UI dan alur utama aplikasi
  styles.css               Seluruh styling dan layout responsif
  lib/
    libraryService.ts      Auth, CRUD, import/export, dan metadata
    supabase.ts            Inisialisasi client akun cloud
    types.ts               Tipe data aplikasi
supabase/
  schema.sql               Tabel, migrasi kompatibilitas, RLS, dan index
public/                     Favicon dan aset publik
```

## Database dan Keamanan

- Semua tabel utama menggunakan `user_id` yang terhubung ke `auth.users`.
- Row Level Security hanya mengizinkan pengguna terautentikasi membaca dan mengubah datanya sendiri.
- `schema.sql` aman dijalankan ulang karena menggunakan `if not exists` dan mengganti policy dengan definisi terbaru.
- Migrasi schema menangani database lama dari aplikasi Flutter yang masih memiliki kolom `device_id` wajib isi pada riwayat baca.
- `.env` tidak ikut Git. Hanya `.env.example` dengan placeholder yang boleh di-commit.

## Troubleshooting

### Akun cloud belum dikonfigurasi

Pastikan `.env` tersedia, kedua variabel terisi, lalu restart `npm run dev` setelah mengubah environment.

### Request database mendapat status 400

Jalankan ulang [`supabase/schema.sql`](supabase/schema.sql). Error ini biasanya terjadi ketika struktur tabel lama belum memiliki kolom atau default terbaru.

### Insert atau update ditolak policy

Pastikan pengguna sudah login dan policy RLS dari [`supabase/schema.sql`](supabase/schema.sql) berhasil dibuat.

### Cover dari link sumber tidak ditemukan

Sebagian situs memblokir pengambilan metadata dari browser. Isi `URL Cover` secara manual pada form tambah atau edit komik sebagai fallback.

## Catatan

Versi web ini bersifat online dan membutuhkan koneksi ke akun cloud. Repo Flutter/Android berada di proyek terpisah dan tidak diubah oleh aplikasi ini.
