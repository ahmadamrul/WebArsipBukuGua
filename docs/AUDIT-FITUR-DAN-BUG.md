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
- [ ] Pastikan klik simpan berulang tidak lagi membuat komik duplikat.
- [ ] Pastikan toast berhasil/gagal selalu terlihat, lalu hilang otomatis.

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

- [ ] Ada dua implementasi `createComicFormActions`: `src/app/actions/comicFormActions.ts` dan `src/app/hooks/useComicFormActions.ts`.
- [ ] Pastikan hanya satu implementasi aktif, lalu hapus/gabung duplikat agar perbaikan tidak masuk ke file yang salah.
- [ ] Audit dependency setiap hook cover/metadata agar state lama tidak tertinggal.
- [ ] Hindari mutasi langsung objek form; gunakan setter/state immutable.
- [ ] Pecah `libraryService.ts` menjadi auth, database, cover storage, metadata parser, dan proxy client.
- [ ] Kurangi bundle utama yang saat build masih melewati sekitar 500 kB dengan lazy loading/code splitting.

## Autentikasi dan Profil

- [ ] Login memvalidasi email dan password wajib diisi.
- [ ] Login gagal menampilkan pesan jelas, termasuk password salah dan email belum dikonfirmasi.
- [ ] Daftar akun menangani email sudah dipakai, rate limit, dan email konfirmasi.
- [ ] Lupa password meminta email, mengirim tautan, dan menampilkan berhasil/gagal/rate limit.
- [ ] Reset password benar-benar menyimpan password baru dan kembali ke login.
- [ ] Password minimal 6 karakter, memiliki huruf kecil, huruf besar, dan angka.
- [ ] Username tersimpan sebagai display name Supabase.
- [ ] Halaman kelola profil rapi dan konsisten di desktop/mobile.
- [ ] Cek kembali masalah `JWT issued at future`; jam perangkat/server harus sinkron.

## Bahasa

- [ ] Semua teks statis dapat berubah Indonesia/English.
- [ ] Pilihan bahasa tersimpan setelah refresh, logout/login, tutup tab, dan buka kembali.
- [ ] Data Supabase seperti judul, nama label, catatan, dan nama sumber tidak diterjemahkan.
- [ ] Audit string yang masih ditulis langsung di komponen tanpa kamus terjemahan.

## Tambah dan Edit Komik

- [x] Mendukung lebih dari satu sumber/link.
- [x] Ada tombol tempel URL dan deteksi otomatis setelah input berhenti berubah.
- [ ] Nama sumber otomatis mengikuti domain saat URL baru dimasukkan/diganti.
- [ ] Menghapus/mengganti URL membersihkan metadata sementara lama, bukan gambar cover yang sudah tersimpan.
- [ ] Metadata dari semua link diproses dan digabung, bukan berhenti di link pertama.
- [ ] Judul diambil dari HTML/metadata lebih dahulu; slug hanya fallback terakhir.
- [ ] Edit komik menampilkan beberapa rekomendasi judul dari semua sumber.
- [ ] Rekomendasi judul tidak muncul jika judul lama dan baru sebenarnya sama/berhubungan erat.
- [ ] Judul tidak boleh otomatis diganti tanpa pilihan pengguna saat edit.
- [ ] Genre dari semua sumber digabung dan fuzzy-match dengan genre yang sudah dimiliki.
- [ ] Tag dan koleksi mendukung multi-select.
- [ ] Status baca dapat dipilih saat tambah/edit.
- [ ] Catatan/deskripsi tersimpan dan tampil di detail.
- [x] Kandidat cover, preview, genre terdeteksi, catatan, dan label tampil kembali setelah regresi refactor.
- [ ] Panel form bisa di-scroll, responsif, dan tidak memotong bagian bawah.
- [ ] URL panjang pada preview dibungkus/dipotong tanpa keluar panel.
- [ ] Tombol simpan terkunci saat proses dan tidak membuat request ganda.
- [ ] Setelah sukses, modal ditutup dan koleksi langsung menampilkan data terbaru.

### Pencegahan Duplikat

- [ ] Normalisasi URL sebelum membandingkan: protokol, `www`, slash akhir, query tracking, dan variasi domain.
- [ ] Tolak sumber URL identik yang sudah dipakai komik lain.
- [ ] Jika judul sama/mirip, tampilkan peringatan dan tawarkan menambahkan URL ke komik lama.
- [ ] Jangan membuat komik baru sebelum pengguna memilih lanjut atau gabungkan.
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
- [ ] Kandidat cover tidak boleh didominasi logo, ikon negara, favicon, banner, atau gambar chapter.
- [ ] Komiktap mencoba oEmbed/API dan tetap memiliki fallback HTML lain.
- [ ] MangaDistrict membaca `Genre(s)`, `Type`, dan metadata cover yang terlihat pada halaman.
- [ ] Manga Plus menangani URL gambar bertanda tangan/secure yang mudah kedaluwarsa.
- [ ] Shinigami mengambil metadata melalui jalur server/proxy, bukan fetch browser langsung yang terkena CORS.
- [ ] Dua atau lebih sumber menghasilkan kandidat dari semuanya dan tetap mencantumkan asal kandidat.
- [ ] Tombol `Cek cover` selalu menjalankan ulang seluruh link, bukan hanya link pertama/terakhir.
- [ ] Ganti urutan sumber tidak menghilangkan kandidat sumber lain.
- [ ] Pemilihan kandidat memperbarui preview dan URL cover secara konsisten.

## Penyimpanan Cover dan Sinkronisasi

- [ ] Cover diunduh, diperkecil, dan dikonversi ke WebP/format efisien sebelum upload.
- [ ] Cover dapat disimpan lokal dahulu ketika sumber tidak bisa diakses Supabase.
- [ ] Tombol `Sync Sekarang` mengunggah antrean cover lokal ke Supabase Storage.
- [ ] `cover_storage_path` menunjuk file storage yang benar.
- [ ] Jika upload gagal, komik tetap tersimpan lokal dan status pending terlihat jelas.
- [ ] Menghapus seluruh sumber tidak menghapus cover tersimpan.
- [ ] Cover hanya hilang jika pengguna menghapus/mengganti cover secara manual.
- [ ] Refresh/logout tidak menghilangkan antrean sinkronisasi lokal.

## Database Supabase

- [ ] Tabel `comics` memiliki `cover_storage_path text`.
- [x] Tabel `comics` memiliki `rating integer`.
- [ ] Tabel `comics` memiliki `favorite boolean not null default false` dan schema cache sudah diperbarui.
- [ ] Nilai rating dibatasi `0..5` atau `NULL` dengan constraint.
- [ ] Tabel progress memenuhi kolom wajib `device_id` dan `client_updated_at`.
- [ ] Kebijakan RLS memungkinkan pengguna hanya membaca/mengubah datanya sendiri.
- [ ] Bucket cover, policy upload/read/delete, Edge Function proxy, dan CORS sudah benar.
- [ ] Setelah migrasi SQL, reload schema/PostgREST agar tidak muncul `PGRST204`.

## Koleksi

- [x] Mode list/grid tersimpan di perangkat.
- [ ] Mode list padat: tinggi baris kecil, cover memenuhi tinggi baris, teks tetap terbaca.
- [ ] Mode grid tetap rapi di desktop/mobile.
- [ ] Klik sekali memilih komik dan membuka ringkasan samping.
- [ ] Klik kedua pada komik terpilih atau double click membuka halaman detail.
- [ ] Search bekerja berdasarkan judul.
- [ ] Filter genre, koleksi, tag, status baca, dan favorit dapat dipilih multiple.
- [ ] Filter hanya memakai koleksi yang tersimpan, tidak ada nilai `Baru` hard-coded.
- [ ] Sort terbaru/terlama/judul/rating bekerja benar.
- [ ] Adult filter mengikuti preferensi settings.
- [ ] Kartu menampilkan cover, judul, genre ringkas, sumber, rating read-only, chapter, status, edit, dan hapus.
- [ ] Input chapter dapat diketik langsung hingga angka besar seperti 1000 tanpa terpotong.
- [ ] Menambah chapter otomatis mengubah status menjadi `Sedang dibaca`.

## Detail Komik

- [ ] Tombol kembali sejajar dan konsisten dengan tombol aksi.
- [ ] Tombol favorit, edit, dan hapus tersedia di kanan atas.
- [ ] Favorit langsung tersimpan dan tampil sebagai bintang emas pada kartu/ringkasan.
- [ ] Deskripsi mengambil catatan tersimpan atau metadata sumber bila catatan kosong.
- [ ] Cover menggunakan ruang dengan baik tanpa gap aneh.
- [ ] Rating 1-5 dapat diatur dengan klik bintang hanya jika status bukan `Ingin dibaca`.
- [ ] Rating dapat dihapus/reset.
- [ ] Semua sumber tampil dan dapat dibuka.
- [ ] Genre, koleksi, dan tag tampil lengkap dan dapat dikelola.

## Rating dan Favorit

- [ ] Rating hanya editable di detail dan panel ringkasan; kartu koleksi hanya menampilkan nilai kecil.
- [ ] Status `Ingin dibaca` tidak boleh diberi rating.
- [ ] Mengubah status kembali ke `Ingin dibaca` menentukan apakah rating dihapus atau dipertahankan sesuai keputusan produk.
- [ ] Favorite tersimpan lokal dan cloud tanpa error `REST 400`.
- [ ] Filter favorit/non-favorit bekerja dan tetap benar setelah refresh/sync.

## Adult Content

- [ ] Genre/tag seperti Adult, Hentai, Sex, Explicit Sex, Nudity, Sexual Content, dan sejenisnya menandai komik sebagai adult.
- [ ] Preferensi hanya berada di Settings, bukan Dashboard.
- [ ] Opsi: tampil normal, sembunyikan gambar saja, atau sembunyikan seluruh komik.
- [ ] Pilihan tersimpan setelah refresh/login ulang.
- [ ] Dashboard, koleksi, ringkasan, dan detail menerapkan aturan yang sama.

## Dashboard

- [ ] Statistik komik, label, sedang dibaca, dan sinkronisasi akurat.
- [ ] Ada variasi warna yang konsisten, bukan panel putih kosong.
- [ ] Tampilkan komik baru ditambahkan/baru diperbarui.
- [ ] Tombol utama cukup satu: `Tambah komik` / `Add comic`.
- [ ] Toast menggantikan notifikasi permanen di sidebar.

## Label

- [ ] Genre, koleksi, dan tag dapat ditambah, diubah, dan dihapus.
- [ ] Konfirmasi tambah/edit/hapus memiliki layout ringkas dan jelas.
- [ ] Label komik dapat dipilih/dihapus tanpa menampilkan duplikasi teks seperti `Actiongenre`.
- [ ] Pengelolaan label kembali/menutup setelah sukses dan UI memakai data terbaru.

## Settings dan Import/Export

- [ ] Kartu profil, bahasa, dan sinkronisasi tetap ringkas dalam tiga kolom.
- [ ] Import publikasi: PDF, CBZ, EPUB, dan gambar.
- [ ] Restore JSON dan restore ZIP bundle.
- [ ] Export JSON dan export bundle.
- [ ] Ikon import/export berupa ikon jelas, bukan hanya huruf P/J/Z.
- [ ] Preferensi adult dan bahasa tersimpan.

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

## Catatan Tambahan Perubahan Terakhir untuk Audit Besok

Bagian ini hanya mencatat perubahan refactor/perbaikan terakhir yang belum diuji menyeluruh di browser. Isi catatan sebelumnya tetap menjadi acuan utama.

### File yang Berubah

- `src/app/App.tsx`: menambahkan state `comicFormSaving`, submit lock berbasis `useRef`, state genre terpilih, serta meneruskan dependency baru ke action dan modal.
- `src/app/hooks/useComicFormActions.ts`: mengubah alur simpan tambah/edit komik, validasi duplikat URL, sinkronisasi sumber dan label, feedback sukses/gagal, serta pemanggilan sinkronisasi setelah simpan.
- `src/app/actions/comicFormActions.ts`: ikut diubah untuk penanganan duplikat URL, tetapi bukan implementasi yang saat ini diimpor `App.tsx`.
- `src/app/components/AppComicFormModal.tsx`: menambahkan hasil kandidat cover, preview cover terpilih, genre terdeteksi, pilihan genre, catatan, dan status tombol `Menyimpan...`.
- `src/app/components/AppModals.tsx`: meneruskan state genre dan status penyimpanan ke modal form komik.
- `src/styles.css`: memadatkan tampilan koleksi mode list, termasuk ukuran cover, teks, rating, chapter stepper, status baca, dan tombol aksi.

### Temuan Penting dari Refactor

- [ ] `App.tsx` saat ini memakai `createComicFormActions` dari barrel `src/app/hooks/index.ts`, sehingga implementasi aktif berasal dari `src/app/hooks/useComicFormActions.ts`.
- [ ] Masih ada implementasi kedua dengan nama sama di `src/app/actions/comicFormActions.ts`; perilaku penanganan duplikatnya berbeda dari implementasi aktif dan berisiko membuat perbaikan berikutnya masuk ke file yang salah.
- [ ] Implementasi aktif membuka komik lama ketika menemukan URL duplikat, sedangkan implementasi kedua mencoba menambahkan sumber ke komik lama; tentukan satu perilaku produk sebelum kedua implementasi disatukan.
- [ ] Jangan menganggap typecheck/build hijau sebagai bukti alur simpan sudah aman; seluruh perubahan di bawah tetap memerlukan pengujian browser dan Supabase.

### Audit Alur Simpan Komik

- [ ] Klik tombol simpan berkali-kali hanya menghasilkan satu proses karena `comicFormSubmitLockRef` dan `comicFormSaving`.
- [ ] Tombol kembali aktif setelah validasi gagal, pengguna membatalkan dialog duplikat, request gagal, atau sinkronisasi gagal.
- [ ] Judul kosong menampilkan pesan di modal dan tidak menutup modal.
- [ ] Tambah komik berhasil menyimpan data utama, seluruh sumber, genre, koleksi, tag, cover, dan status baca.
- [ ] Edit komik berhasil memperbarui sumber lama dan menambahkan sumber baru.
- [ ] Menghapus sumber dari form edit juga benar-benar menghapus relasi sumber dari penyimpanan; implementasi aktif saat ini perlu diperiksa karena hanya terlihat memperbarui/menambah sumber.
- [ ] Edit cover memicu antrean/sinkronisasi cover yang benar; jalur edit perlu dibandingkan dengan jalur tambah yang memanggil `queueCoverSync`.
- [ ] Menghapus genre, koleksi, atau tag saat edit benar-benar menghapus relasi lama tanpa menghapus label milik komik lain.
- [ ] Kegagalan di tengah penyimpanan beberapa sumber/label tidak meninggalkan data setengah tersimpan tanpa pemberitahuan yang jelas.
- [ ] Setelah data lokal berhasil disimpan tetapi `syncNow()` gagal, pesan tidak boleh menyatakan bahwa penyimpanan komik gagal jika sebenarnya hanya sinkronisasi yang gagal.
- [ ] Modal hanya ditutup setelah hasil simpan sudah pasti berhasil dan data koleksi terbaru tampil.

### Audit Duplikat URL dan Judul

- [ ] Normalisasi URL mendeteksi variasi protokol, `www`, slash akhir, kapitalisasi host, dan query tracking sesuai aturan produk.
- [ ] Pengecekan duplikat mencakup `comic.source_url` dan seluruh record di tabel sumber.
- [ ] URL yang sama pada dua input sumber di form yang sama tidak membuat dua record sumber identik.
- [ ] Dialog duplikat menampilkan komik yang benar ketika beberapa komik memiliki URL mirip.
- [ ] Memilih `Buka komik lama` menutup form baru, memilih komik lama, dan tidak membuat atau mengubah record apa pun.
- [ ] Memilih `Batal` tetap mempertahankan seluruh isi form supaya pengguna tidak kehilangan input.
- [ ] Audit ulang deteksi judul mirip setelah perilaku duplikat URL ditentukan agar dua dialog tidak saling bertabrakan.

### Audit Genre, Koleksi, Tag, dan Modal

- [ ] Saat membuka form tambah, `comicFormGenreIds`, `comicFormCollectionIds`, dan `comicFormTagIds` selalu mulai dari keadaan kosong yang benar.
- [ ] Saat membuka form edit, ketiga state ID diisi dari relasi komik aktif, bukan tertinggal dari komik yang sebelumnya diedit.
- [ ] Memilih dan melepas genre langsung mengubah tampilan chip serta payload simpan.
- [ ] Genre hasil deteksi metadata tidak otomatis dianggap dipilih tanpa tindakan atau aturan yang jelas.
- [ ] Kandidat cover dari beberapa sumber tampil tanpa duplikasi, gambar rusak, atau key React yang sama.
- [ ] Tombol `Pakai cover terbaik` memilih kandidat pertama yang memang sudah melalui pemeringkatan, bukan sekadar hasil pertama dari sumber pertama.
- [ ] Memilih kandidat cover memperbarui preview dan URL yang akhirnya disimpan.
- [ ] URL cover panjang tidak membuat panel melebar atau keluar layar.
- [ ] Modal tetap dapat di-scroll sampai footer pada desktop dan mobile, termasuk ketika kandidat cover dan daftar genre sangat banyak.
- [ ] Menutup modal saat pengecekan cover berjalan tidak menyebabkan update state terlambat, warning React, atau data bocor ke form berikutnya.

### Audit Feedback dan Sinkronisasi

- [ ] Toast sukses muncul setelah tambah/edit selesai dan hilang otomatis.
- [ ] Toast gagal serta `comicPanelNotice` menampilkan pesan yang konsisten dan tidak menggandakan informasi membingungkan.
- [ ] Detail debug tidak menampilkan token, URL bertanda tangan, atau data sensitif pengguna.
- [ ] `syncNow()` tidak terpanggil berulang akibat render ulang dan tidak membuat request ganda setelah submit.
- [ ] Jika penyimpanan cloud gagal, perubahan lokal dan antrean cover tetap dapat dipulihkan pada percobaan sinkronisasi berikutnya.

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
