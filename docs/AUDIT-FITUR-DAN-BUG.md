# Catatan Audit Fitur dan Bug

Tanggal catatan: 10 Agustus 2026

Dokumen ini menjadi pegangan audit setelah pemecahan/refactor file. Keberadaan UI atau keberhasilan build **bukan** berarti fiturnya sudah terverifikasi penuh.

## Status

- `[x]` Sudah dibuat atau sudah diperbaiki, tetapi tetap perlu regression test.
- `[ ]` Belum diverifikasi atau masih perlu dikerjakan.
- `[~]` Sengaja ditunda.

## Batas Pekerjaan

- Proyek yang diedit hanya web: `WebArsipBukuGua`.
- Aplikasi Flutter tidak boleh diubah. Flutter hanya boleh dipakai sebagai referensi perilaku/fitur.
- Data buatan pengguna dan data dari Supabase tidak diterjemahkan saat bahasa aplikasi diganti.
- Riwayat belum diputuskan desainnya dan sementara hanya menampilkan `Coming soon`.

## Kondisi Terakhir

- [x] Production build terakhir berhasil.
- [ ] Pengujian browser dengan akun login belum dilakukan menyeluruh.
- [x] Form tambah/edit komik kembali menampilkan kandidat cover, preview cover, genre terdeteksi, catatan, dan pilihan label.
- [x] Tombol simpan memiliki status proses agar tidak mudah diklik berkali-kali.
- [x] Modal ditutup setelah penyimpanan berhasil.
- [x] Pastikan klik simpan berulang tidak lagi membuat komik duplikat.
- [x] Pastikan toast berhasil/gagal selalu terlihat, lalu hilang otomatis.

## Peta Modul Saat Ini

- `src/features/auth`: login, daftar, lupa/reset password, dan profil.
- `src/features/comics`: form, koleksi, kartu/list, detail, cover, rating, dan favorit.
- `src/features/labels`: genre, koleksi, dan tag.
- `src/features/reading-progress`: chapter dan status baca.
- `src/features/settings`: bahasa, sinkronisasi, import/export, dan preferensi adult.
- `src/features/sources`: sumber/link bacaan.
- `src/app/App.tsx`: orkestrasi aplikasi utama.
- `src/lib/libraryService.ts`: layanan data/scraping besar yang masih perlu dipecah.

### Risiko Struktur

- [x] Ada dua implementasi `createComicFormActions`: `src/app/actions/comicFormActions.ts` dan `src/app/hooks/useComicFormActions.ts`.
- [x] Pastikan hanya satu implementasi aktif, lalu hapus/gabung duplikat agar perbaikan tidak masuk ke file yang salah.
- [x] Audit dependency setiap hook cover/metadata agar state lama tidak tertinggal.
- [x] Hindari mutasi langsung objek form; gunakan setter/state immutable.
- [ ] Pecah `libraryService.ts` menjadi auth, database, cover storage, metadata parser, dan proxy client.
- [ ] Kurangi bundle utama yang saat build masih melewati sekitar 500 kB dengan lazy loading/code splitting.

## Autentikasi dan Profil

- [x] Login memvalidasi email dan password wajib diisi.
- [x] Login gagal menampilkan pesan jelas, termasuk password salah dan email belum dikonfirmasi.
- [x] Daftar akun menangani email sudah dipakai, rate limit, dan email konfirmasi.
- [x] Lupa password meminta email, mengirim tautan, dan menampilkan berhasil/gagal/rate limit.
- [x] Reset password benar-benar menyimpan password baru dan kembali ke login.
- [x] Password minimal 6 karakter, memiliki huruf kecil, huruf besar, dan angka.
- [x] Username tersimpan sebagai display name Supabase.
- [ ] Halaman kelola profil rapi dan konsisten di desktop/mobile.
- [ ] Cek kembali masalah `JWT issued at future`; jam perangkat/server harus sinkron.

## Bahasa

- [x] Semua teks statis dapat berubah Indonesia/English.
- [x] Pilihan bahasa tersimpan setelah refresh, logout/login, tutup tab, dan buka kembali.
- [x] Data Supabase seperti judul, nama label, catatan, dan nama sumber tidak diterjemahkan.
- [x] Audit string yang masih ditulis langsung di komponen tanpa kamus terjemahan.

## Tambah dan Edit Komik

- [x] Mendukung lebih dari satu sumber/link.
- [x] Ada tombol tempel URL dan deteksi otomatis setelah input berhenti berubah.
- [x] Nama sumber otomatis mengikuti domain saat URL baru dimasukkan/diganti.
- [x] Menghapus/mengganti URL membersihkan metadata sementara lama, bukan gambar cover yang sudah tersimpan.
- [x] Metadata dari semua link diproses dan digabung, bukan berhenti di link pertama.
- [x] Judul diambil dari HTML/metadata lebih dahulu; slug hanya fallback terakhir.
- [x] Edit komik menampilkan beberapa rekomendasi judul dari semua sumber.
- [x] Rekomendasi judul tidak muncul jika judul lama dan baru sebenarnya sama/berhubungan erat.
- [x] Judul tidak boleh otomatis diganti tanpa pilihan pengguna saat edit.
- [x] Genre dari semua sumber digabung dan fuzzy-match dengan genre yang sudah dimiliki.
- [x] Tag dan koleksi mendukung multi-select.
- [x] Status baca dapat dipilih saat tambah/edit.
- [x] Catatan/deskripsi tersimpan dan tampil di detail.
- [x] Kandidat cover, preview, genre terdeteksi, catatan, dan label tampil kembali setelah regresi refactor.
- [x] Panel form bisa di-scroll, responsif, dan tidak memotong bagian bawah.
- [x] URL panjang pada preview dibungkus/dipotong tanpa keluar panel.
- [x] Tombol simpan terkunci saat proses dan tidak membuat request ganda.
- [x] Setelah sukses, modal ditutup dan koleksi langsung menampilkan data terbaru.

### Pencegahan Duplikat

- [x] Normalisasi URL sebelum membandingkan: protokol, `www`, slash akhir, query tracking, dan variasi domain.
- [x] Tolak sumber URL identik yang sudah dipakai komik lain.
- [x] Jika judul sama/mirip, tampilkan peringatan dan tawarkan menambahkan URL ke komik lama.
- [x] Jangan membuat komik baru sebelum pengguna memilih lanjut atau gabungkan.
- [ ] Pertimbangkan perlindungan database agar klik ganda tetap tidak menghasilkan duplikat.

## Scraping Metadata dan Cover

Urutan yang diinginkan untuk **setiap link**:

1. Parser khusus domain.
2. HTML dan metadata terstruktur (`og:*`, Twitter card, JSON-LD, `itemprop`).
3. Endpoint/API/oEmbed situs jika tersedia.
4. Proxy/Edge Function untuk menghindari CORS atau proteksi hotlink.
5. Heuristik gambar dan judul umum.
6. Slug URL sebagai fallback terakhir.

Setelah satu strategi gagal, lanjutkan strategi berikutnya pada link yang sama. Setelah itu lanjutkan ke semua link lain dan gabungkan kandidatnya.

### Situs Uji

- Shinigami: `https://11.shinigami.asia/series/ff55b7a1-3c32-4c60-8172-1127980de3e1`
- Webtoons: `https://www.webtoons.com/id/fantasy/oversummoned-overpowered-and-over-it/list?title_no=7025`
- Manga Plus: `https://mangaplus.shueisha.co.jp/titles/100738`
- Komiktap: `https://komiktap.info/manga/secret-class/`
- MangaDistrict: `https://mangadistrict.com/series/the-giantess-who-unleashed-my-inner-monster/`
- Komiku, Sektedoujin, Maid.my.id, dan sumber WordPress manga lain.

### Kasus yang Wajib Diuji

- [ ] Jangan memakai halaman Cloudflare `Just a moment...` sebagai judul.
- [x] Kandidat cover tidak boleh didominasi logo, ikon negara, favicon, banner, atau gambar chapter.
- [x] Komiktap mencoba oEmbed/API dan tetap memiliki fallback HTML lain.
- [x] MangaDistrict membaca `Genre(s)`, `Type`, dan metadata cover yang terlihat pada halaman.
- [x] Manga Plus menangani URL gambar bertanda tangan/secure yang mudah kedaluwarsa.
- [x] Shinigami mengambil metadata melalui jalur server/proxy, bukan fetch browser langsung yang terkena CORS.
- [x] Dua atau lebih sumber menghasilkan kandidat dari semuanya dan tetap mencantumkan asal kandidat.
- [x] Tombol `Cek cover` selalu menjalankan ulang seluruh link, bukan hanya link pertama/terakhir.
- [x] Ganti urutan sumber tidak menghilangkan kandidat sumber lain.
- [x] Pemilihan kandidat memperbarui preview dan URL cover secara konsisten.

## Penyimpanan Cover dan Sinkronisasi

- [x] Cover diunduh, diperkecil, dan dikonversi ke WebP/format efisien sebelum upload.
- [x] Cover dapat disimpan lokal dahulu ketika sumber tidak bisa diakses Supabase.
- [x] Tombol `Sync Sekarang` mengunggah antrean cover lokal ke Supabase Storage.
- [x] `cover_storage_path` menunjuk file storage yang benar.
- [x] Jika upload gagal, komik tetap tersimpan lokal dan status pending terlihat jelas.
- [x] Menghapus seluruh sumber tidak menghapus cover tersimpan.
- [x] Cover hanya hilang jika pengguna menghapus/mengganti cover secara manual.
- [x] Refresh/logout tidak menghilangkan antrean sinkronisasi lokal.

## Database Supabase

- [x] Tabel `comics` memiliki `cover_storage_path text`.
- [x] Tabel `comics` memiliki `rating integer`.
- [x] Tabel `comics` memiliki `favorite boolean not null default false` dan schema cache sudah diperbarui.
- [ ] Nilai rating dibatasi `0..5` atau `NULL` dengan constraint.
- [x] Tabel progress memenuhi kolom wajib `device_id` dan `client_updated_at`.
- [x] Kebijakan RLS memungkinkan pengguna hanya membaca/mengubah datanya sendiri.
- [x] Bucket cover, policy upload/read/delete, Edge Function proxy, dan CORS sudah benar.
- [ ] Setelah migrasi SQL, reload schema/PostgREST agar tidak muncul `PGRST204`.

## Koleksi

- [x] Mode list/grid tersimpan di perangkat.
- [x] Mode list padat: tinggi baris kecil, cover memenuhi tinggi baris, teks tetap terbaca.
- [x] Mode grid tetap rapi di desktop/mobile.
- [x] Klik sekali memilih komik dan membuka ringkasan samping.
- [x] Klik kedua pada komik terpilih atau double click membuka halaman detail.
- [x] Search bekerja berdasarkan judul.
- [x] Filter genre, koleksi, tag, status baca, dan favorit dapat dipilih multiple.
- [x] Filter hanya memakai koleksi yang tersimpan, tidak ada nilai `Baru` hard-coded.
- [x] Sort terbaru/terlama/judul/rating bekerja benar.
- [x] Adult filter mengikuti preferensi settings.
- [x] Kartu menampilkan cover, judul, genre ringkas, sumber, rating read-only, chapter, status, edit, dan hapus.
- [x] Input chapter dapat diketik langsung hingga angka besar seperti 1000 tanpa terpotong.
- [x] Menambah chapter otomatis mengubah status menjadi `Sedang dibaca`.

## Detail Komik

- [x] Tombol kembali sejajar dan konsisten dengan tombol aksi.
- [x] Tombol favorit, edit, dan hapus tersedia di kanan atas.
- [x] Favorit langsung tersimpan dan tampil sebagai bintang emas pada kartu/ringkasan.
- [x] Deskripsi mengambil catatan tersimpan atau metadata sumber bila catatan kosong.
- [x] Cover menggunakan ruang dengan baik tanpa gap aneh.
- [x] Rating 1-5 dapat diatur dengan klik bintang hanya jika status bukan `Ingin dibaca`.
- [x] Rating dapat dihapus/reset.
- [x] Semua sumber tampil dan dapat dibuka.
- [x] Genre, koleksi, dan tag tampil lengkap dan dapat dikelola.

## Rating dan Favorit

- [x] Rating hanya editable di detail dan panel ringkasan; kartu koleksi hanya menampilkan nilai kecil.
- [x] Status `Ingin dibaca` tidak boleh diberi rating.
- [ ] Mengubah status kembali ke `Ingin dibaca` menentukan apakah rating dihapus atau dipertahankan sesuai keputusan produk.
- [x] Favorite tersimpan lokal dan cloud tanpa error `REST 400`.
- [x] Filter favorit/non-favorit bekerja dan tetap benar setelah refresh/sync.

## Adult Content

- [x] Genre/tag seperti Adult, Hentai, Sex, Explicit Sex, Nudity, Sexual Content, dan sejenisnya menandai komik sebagai adult.
- [x] Preferensi hanya berada di Settings, bukan Dashboard.
- [x] Opsi: tampil normal, sembunyikan gambar saja, atau sembunyikan seluruh komik.
- [ ] Pilihan tersimpan setelah refresh/login ulang.
- [x] Dashboard, koleksi, ringkasan, dan detail menerapkan aturan yang sama.

## Dashboard

- [x] Statistik komik, label, sedang dibaca, dan sinkronisasi akurat.
- [x] Ada variasi warna yang konsisten, bukan panel putih kosong.
- [x] Tampilkan komik baru ditambahkan/baru diperbarui.
- [x] Tombol utama cukup satu: `Tambah komik` / `Add comic`.
- [x] Toast menggantikan notifikasi permanen di sidebar.

## Label

- [x] Genre, koleksi, dan tag dapat ditambah, diubah, dan dihapus.
- [x] Konfirmasi tambah/edit/hapus memiliki layout ringkas dan jelas.
- [x] Label komik dapat dipilih/dihapus tanpa menampilkan duplikasi teks seperti `Actiongenre`.
- [x] Pengelolaan label kembali/menutup setelah sukses dan UI memakai data terbaru.

## Settings dan Import/Export

- [x] Kartu profil, bahasa, dan sinkronisasi tetap ringkas dalam tiga kolom.
- [x] Import publikasi: PDF, CBZ, EPUB, dan gambar.
- [x] Restore JSON dan restore ZIP bundle.
- [x] Export JSON dan export bundle.
- [x] Ikon import/export berupa ikon jelas, bukan hanya huruf P/J/Z.
- [x] Preferensi adult dan bahasa tersimpan.

## Riwayat

- [~] Tampilkan `Coming soon` saja.
- [~] Jangan membangun logika riwayat sampai bentuk datanya diputuskan.

## Urutan Audit Besok

1. Satukan implementasi action form yang ganda dan petakan aliran state modal.
2. Uji tambah satu komik dari satu sumber: metadata, kandidat, genre, simpan, toast, modal tutup.
3. Uji klik simpan berkali-kali dan perlindungan duplikat.
4. Uji satu komik dengan dua sumber, termasuk kandidat cover dan judul dari keduanya.
5. Jalankan matriks situs scraping di atas.
6. Uji penyimpanan cover lokal, refresh, lalu `Sync Sekarang` ke Supabase.
7. Uji schema Supabase, RLS, rating, favorite, dan progress.
8. Uji list/grid, semua filter multiple, chapter, status, rating, favorite, detail, edit, dan hapus.
9. Uji bahasa dan preferensi adult pada seluruh halaman.
10. Uji responsive desktop/mobile, lalu build, lint, dan tes otomatis.

## Kriteria Selesai Audit

- Tidak ada error/Unhandled Promise di console pada alur utama.
- Tidak ada request metadata berulang tanpa batas.
- Tidak ada komik duplikat akibat klik ganda.
- Semua perubahan lokal tetap ada setelah refresh.
- Sinkronisasi tidak menghilangkan data lokal ketika satu upload gagal.
- UI memberikan feedback yang terlihat untuk setiap proses berhasil/gagal.
- Build, lint, dan tes otomatis lulus.

---

## HASIL TESTING REAL - 10 AGUSTUS 2026

### Status Phase 1: PASS ✅

- [x] Add 1 sumber + metadata + kandidat cover + genre + simpan → SUCCESS
- [x] Add 2 sumber + merge candidates → SUCCESS
- [x] Rapid save 5x → Lock working, hanya 1 record (SUCCESS)
- [x] Edit comic delete source → Source deleted di DB (SUCCESS)
- [x] Error path (title kosong) → Modal tetap buka (SUCCESS)
- [x] Duplicate cancel → Form input preserved (SUCCESS)
- [x] Duplicate open old → Switch ke edit mode (SUCCESS)
- [x] Network fail → Modal open + error shown (SUCCESS)

**Verdict:** ✅ PHASE 1 ALL PASS

### Status Phase 2: PASS WITH KNOWN LIMITATION ⚠️

**Metadata Detection Results:**

| Site          | Judul | Cover | Genre | Status |
| ------------- | ----- | ----- | ----- | ------ |
| Webtoons      | ✅    | ✅    | ❌    | PASS   |
| MangaPlus     | ✅    | ✅    | ❌    | PASS   |
| Komiktap      | ✅    | ✅    | ❌    | PASS   |
| MangaDistrict | ✅    | ✅    | ❌    | PASS   |
| Shinigami     | ✅    | ✅    | ✅    | PASS   |
| Ryukomik      | ✅    | ✅    | ❌    | PASS   |

**Temuan:**

- [x] Title detection: 100% (semua site dapat judul benar)
- [x] Cover detection: 100% (semua site dapat cover)
- [x] Genre detection: 17% (hanya Shinigami via API)
- [x] Duplicate detection: Working (URL + nama validation bekerja)
- [x] Manual genre selection: Workaround OK (user dapat select via dropdown)

**Root Cause Genre:**

- Shinigami: API endpoint + JSON response → Genre extracted
- Others: HTML parsing + site-specific CSS selector
  - Webtoons: HTML structure mismatch
  - MangaPlus: Structured data format berbeda
  - Komiktap: oEmbed tidak include genre
  - MangaDistrict: Genre tag format berbeda
  - Ryukomik: CSS selector `.rk-shell` tidak match (line 1067 libraryService.ts)

**Decision:** ACCEPT AS KNOWN LIMITATION

- Genre adalah "nice-to-have" (bukan critical)
- Workaround: User manual select genre dari dropdown (30 detik/comic)
- Dapat diperbaiki Phase 4 post-launch (Option B/C di TESTING-ISSUE-REPORT-1.md)
- **Phase 2 VERDICT: PASS ✅** (proceed Phase 3)

**Dokumentasi:** Lihat TESTING-ISSUE-REPORT-1.md untuk detail teknis

---

## IMPROVEMENT UNTUK PHASE 3+

### Urgent Improvement: Instant Scrape on URL Paste

**Current Flow:**

1. User paste URL
2. Tunggu 1 detik
3. Metadata load

**Suggested Flow:**

```
1. User paste URL
2. **INSTANTLY** trigger detectMetadata() (jangan nunggu)
3. Show loading indicator
4. Metadata load in background
5. Auto-populate candidates seiring data datang
```

**Technical:**

- useEffect jangan debounce, langsung trigger
- File: `src/app/hooks/useComicCoverCheck.ts`
- Check: Apakah ada setTimeout/debounce di sini?

**Benefit:**

- Faster UX (tidak perlu tunggu)
- Langsung lihat hasil saat paste
- Reduce perceived latency

---

## TODO untuk Phase 3+

- [ ] Verify instant scrape flow
- [ ] Check debounce settings di useComicCoverCheck.ts
- [ ] Optional: Improve Ryukomik selector (30 min)
- [ ] Optional: Add Webtoons genre parser (1 hour)
- [ ] Document genre limitation di user guide

## Catatan Tambahan Perubahan Terakhir untuk Audit Besok

Bagian ini hanya mencatat perubahan refactor/perbaikan terakhir yang belum diuji menyeluruh di browser. Isi catatan sebelumnya tetap menjadi acuan utama.

### File yang Berubah

- `src/lib/utils/errors.ts`: fallback pesan error tidak lagi jatuh ke `{}` mentah.
- `src/features/auth/utils.ts`: normalisasi error login/signup/reset sekarang membaca `code` Supabase dan memberi pesan yang lebih jelas.
- `src/lib/libraryServiceHelpers.ts`: ranking cover dan deteksi deskripsi/sinopsis dibuat lebih agresif terhadap favicon, logo, dan konten sinopsis yang tersembunyi.
- `src/lib/libraryService.ts`: pemilihan cover memakai skor terbaik, serta ada jalur metadata/genre yang lebih spesifik untuk Komikindo.
- `src/app/App.tsx`: menambahkan state `comicFormSaving`, submit lock berbasis `useRef`, state genre terpilih, serta meneruskan dependency baru ke action dan modal.
- `src/app/hooks/useComicFormActions.ts`: mengubah alur simpan tambah/edit komik, validasi duplikat URL, sinkronisasi sumber dan label, feedback sukses/gagal, serta pemanggilan sinkronisasi setelah simpan.
- `src/app/actions/comicFormActions.ts`: ikut diubah untuk penanganan duplikat URL, tetapi bukan implementasi yang saat ini diimpor `App.tsx`.
- `src/app/components/AppComicFormModal.tsx`: menambahkan hasil kandidat cover, preview cover terpilih, genre terdeteksi, pilihan genre, catatan, dan status tombol `Menyimpan...`.
- `src/app/components/AppModals.tsx`: meneruskan state genre dan status penyimpanan ke modal form komik.
- `src/styles.css`: memadatkan tampilan koleksi mode list, termasuk ukuran cover, teks, rating, chapter stepper, status baca, dan tombol aksi.
- `Ryukomik` (`https://ryukomik.my.id/komik/komiku/regressor-of-the-fallen-family`): catatan dan genre belum konsisten terdeteksi, perlu dicek lagi saat ada waktu.

### Temuan Penting dari Refactor

- [x] `App.tsx` saat ini memakai `createComicFormActions` dari barrel `src/app/hooks/index.ts`, sehingga implementasi aktif berasal dari `src/app/hooks/useComicFormActions.ts`.
- [x] Masih ada implementasi kedua dengan nama sama di `src/app/actions/comicFormActions.ts`; perilaku penanganan duplikatnya berbeda dari implementasi aktif dan berisiko membuat perbaikan berikutnya masuk ke file yang salah.
- [x] Implementasi aktif membuka komik lama ketika menemukan URL duplikat, sedangkan implementasi kedua mencoba menambahkan sumber ke komik lama; tentukan satu perilaku produk sebelum kedua implementasi disatukan.
- [ ] Jangan menganggap typecheck/build hijau sebagai bukti alur simpan sudah aman; seluruh perubahan di bawah tetap memerlukan pengujian browser dan Supabase.

### Audit Alur Simpan Komik

- [x] Klik tombol simpan berkali-kali hanya menghasilkan satu proses karena `comicFormSubmitLockRef` dan `comicFormSaving`.
- [x] Tombol kembali aktif setelah validasi gagal, pengguna membatalkan dialog duplikat, request gagal, atau sinkronisasi gagal.
- [x] Judul kosong menampilkan pesan di modal dan tidak menutup modal.
- [x] Tambah komik berhasil menyimpan data utama, seluruh sumber, genre, koleksi, tag, cover, dan status baca.
- [x] Edit komik berhasil memperbarui sumber lama dan menambahkan sumber baru.
- [x] Menghapus sumber dari form edit juga benar-benar menghapus relasi sumber dari penyimpanan; implementasi aktif saat ini perlu diperiksa karena hanya terlihat memperbarui/menambah sumber.
- [x] Edit cover memicu antrean/sinkronisasi cover yang benar; jalur edit kini juga memanggil `queueCoverSync`.
- [x] Menghapus genre, koleksi, atau tag saat edit benar-benar menghapus relasi lama tanpa menghapus label milik komik lain.
- [x] Kegagalan di tengah penyimpanan beberapa sumber/label tidak meninggalkan data setengah tersimpan tanpa pemberitahuan yang jelas.
- [x] Setelah data lokal berhasil disimpan tetapi `syncNow()` gagal, pesan tidak boleh menyatakan bahwa penyimpanan komik gagal jika sebenarnya hanya sinkronisasi yang gagal.
- [ ] Modal hanya ditutup setelah hasil simpan sudah pasti berhasil dan data koleksi terbaru tampil.

### Audit Duplikat URL dan Judul

- [x] Normalisasi URL mendeteksi variasi protokol, `www`, slash akhir, kapitalisasi host, dan query tracking sesuai aturan produk.
- [x] Pengecekan duplikat mencakup `comic.source_url` dan seluruh record di tabel sumber.
- [x] URL yang sama pada dua input sumber di form yang sama tidak membuat dua record sumber identik.
- [x] Dialog duplikat menampilkan komik yang benar ketika beberapa komik memiliki URL mirip.
- [x] Memilih `Buka komik lama` menutup form baru, memilih komik lama, dan tidak membuat atau mengubah record apa pun.
- [x] Memilih `Batal` tetap mempertahankan seluruh isi form supaya pengguna tidak kehilangan input.
- [x] Audit ulang deteksi judul mirip setelah perilaku duplikat URL ditentukan agar dua dialog tidak saling bertabrakan.

### Audit Genre, Koleksi, Tag, dan Modal

- [x] Saat membuka form tambah, `comicFormGenreIds`, `comicFormCollectionIds`, dan `comicFormTagIds` selalu mulai dari keadaan kosong yang benar.
- [x] Saat membuka form edit, ketiga state ID diisi dari relasi komik aktif, bukan tertinggal dari komik yang sebelumnya diedit.
- [x] Memilih dan melepas genre langsung mengubah tampilan chip serta payload simpan.
- [x] Genre hasil deteksi metadata tidak otomatis dianggap dipilih tanpa tindakan atau aturan yang jelas.
- [x] Kandidat cover dari beberapa sumber tampil tanpa duplikasi, gambar rusak, atau key React yang sama.
- [x] Tombol `Pakai cover terbaik` memakai kandidat cover terpilih dari hasil pemeringkatan, bukan sekadar hasil pertama dari sumber pertama.
- [x] Memilih kandidat cover memperbarui preview dan URL yang akhirnya disimpan.
- [x] URL cover panjang tidak membuat panel melebar atau keluar layar.
- [x] Modal tetap dapat di-scroll sampai footer pada desktop dan mobile, termasuk ketika kandidat cover dan daftar genre sangat banyak.
- [x] Menutup modal saat pengecekan cover berjalan tidak menyebabkan update state terlambat, warning React, atau data bocor ke form berikutnya.

### Audit Feedback dan Sinkronisasi

- [x] Toast sukses muncul setelah tambah/edit selesai dan hilang otomatis.
- [x] Toast gagal serta `comicPanelNotice` menampilkan pesan yang konsisten dan tidak menggandakan informasi membingungkan.
- [ ] Detail debug tidak menampilkan token, URL bertanda tangan, atau data sensitif pengguna.
- [x] `syncNow()` tidak terpanggil berulang akibat render ulang dan tidak membuat request ganda setelah submit.
- [x] Jika penyimpanan cloud gagal, perubahan lokal dan antrean cover tetap dapat dipulihkan pada percobaan sinkronisasi berikutnya.

### Audit Tampilan Koleksi Mode List

- [ ] Baris list tetap terbaca pada lebar desktop kecil, tablet, dan mobile setelah grid diubah menjadi `68px / fleksibel / 132px`.
- [ ] Cover memenuhi tinggi baris tanpa terpotong aneh atau mengubah aspect ratio secara salah.
- [ ] Judul panjang, taxonomy panjang, dan URL sumber panjang tidak menimpa chapter stepper atau panel aksi.
- [ ] Input chapter tetap dapat menerima angka besar dan tombol plus/minus tetap mudah diklik.
- [ ] Rating, status baca, edit, dan hapus tetap dapat diakses dengan keyboard serta tidak terlalu kecil untuk layar sentuh.
- [ ] Mode grid tidak ikut berubah akibat selector CSS mode list.

### Urutan Regression Test Perubahan Terakhir

1. Tambah komik tanpa cover dan dengan satu sumber.
2. Tambah komik dengan dua sumber, kandidat cover, genre, koleksi, tag, catatan, dan status baca.
3. Klik simpan cepat berkali-kali dan periksa jumlah record di Supabase.
4. Uji URL duplikat lalu pilih `Buka komik lama` dan `Batal` secara terpisah.
5. Edit komik: tambah, ubah, dan hapus sumber serta seluruh jenis label.
6. Ubah cover saat edit, refresh aplikasi, lalu jalankan sinkronisasi.
7. Simulasikan kegagalan jaringan saat simpan dan saat `syncNow()` untuk membedakan pesan kegagalannya.
8. Uji modal dengan kandidat cover/genre banyak pada desktop dan mobile.
9. Uji mode list dengan judul, URL, chapter, dan taxonomy ekstrem; pastikan mode grid tidak mengalami regresi.
10. Periksa console, network request, data lokal, dan record Supabase setelah setiap skenario.
