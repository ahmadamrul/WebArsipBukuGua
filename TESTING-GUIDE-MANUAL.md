# 📖 PANDUAN TESTING MANUAL - ARSIP BUKU GUA WEB

**Tanggal:** 10 Agustus 2026  
**Target:** Phase 1 & 2 Regression Tests  
**Waktu:** ~2-3 jam  

---

## 🚀 SETUP - Persiapan Awal (5 menit)

### 1. Pastikan Supabase sudah ready

```bash
# Verifikasi .env sudah ada
cat .env
# Harus ada:
# VITE_SUPABASE_URL=https://xxx.supabase.co
# VITE_SUPABASE_ANON_KEY=sb_publishable_xxx
```

### 2. Start dev server

```bash
npm run dev
```

Buka browser ke `http://localhost:5173`

### 3. Siapkan tools

- **Browser DevTools** - untuk check console (F12)
- **Supabase Dashboard** - untuk verify DB records
- **Notepad** - untuk track hasil test
- **2nd tab** - untuk test scraping sites

---

## 📋 PHASE 1 - SAVE FLOW TESTS (Paling Penting!)

### Test #1: Add Comic 1 Sumber - Success Path

**Setup:**
- Fresh browser (atau logout dulu kalau sudah login)
- Login dengan akun test

**Steps:**

```
1. Klik "Add Comic" / "Tambah Komik"
2. Masukkan:
   - Judul: "Test Comic #1"
   - URL Sumber: "https://www.webtoons.com/id/fantasy/oversummoned/list?title_no=7025"
3. Tunggu metadata load (~2-3 detik)
   ✓ Verify: Judul terdeteksi dan disarankan
   ✓ Verify: Genre terdeteksi (fantasy, romance, dll)
   ✓ Verify: Cover candidates muncul di preview
4. Pilih cover terbaik dari candidate list
5. Pilih genre dari terdeteksi (ceklis beberapa)
6. Isi notes/deskripsi: "Test comic"
7. Klik "Simpan" / "Save"
   ⏱ PENTING: Perhatikan button ubah ke "Menyimpan..." (lock state)
8. Tunggu proses selesai
   ✓ Modal harus TUTUP otomatis
   ✓ Toast SUCCESS harus muncul
   ✓ Koleksi harus refresh dan tampil comic baru
9. Buka DevTools Console (F12) → pastikan NO error
10. Buka Supabase Dashboard → comics table → verify record ada
```

**Expected Result:**
- ✅ Modal closes
- ✅ Toast shows success message
- ✅ Comic appears in collection
- ✅ DB record created
- ✅ No console errors

**If Failed:**
- Screenshot console error
- Note modal state (tutup atau tetap buka)
- Check network tab for failed requests

---

### Test #2: Add Comic Multi-Source (2 sumber)

**Steps:**

```
1. Klik "Add Comic" lagi
2. Masukkan:
   - Judul: "Test Comic #2"
   - Sumber 1: "https://mangaplus.shueisha.co.jp/titles/100738"
3. Tunggu metadata load
4. Klik "+ Tambah Sumber" / "Add Source"
5. Masukkan Sumber 2: "https://www.webtoons.com/id/fantasy/XXX"
6. Tunggu metadata load untuk sumber 2
   ✓ Verify: Cover candidates dari KEDUA sumber muncul
   ✓ Verify: Genre dari kedua sumber merged
7. Pilih cover dari sumber mana saja
8. Pilih genre dari merged list
9. Klik "Simpan"
   ✓ Button lock: "Menyimpan..."
10. Tunggu selesai
    ✓ Modal tutup
    ✓ Toast success
    ✓ Comic di collection with 2 sources
```

**Expected Result:**
- ✅ Multi-source candidates merged
- ✅ Genres from both sources combined
- ✅ Save success

---

### Test #3: Rapid Click Save (Double-Submit Prevention)

**⚠️ CRITICAL TEST - Cek apakah lock working!**

**Steps:**

```
1. Buka form tambah comic
2. Isi data minimal: judul + URL
3. Tunggu metadata sebentar
4. **CEPAT KLIK TOMBOL SIMPAN 5x KALI (rapid fire)**
   - Click, click, click, click, click dalam 1-2 detik
5. Tunggu semua selesai
6. Buka Supabase → comics table → HITUNG berapa record?
   ✓ HARUS HANYA 1 record (bukan 5!)
   ✓ Kalau 5 record → LOCK TIDAK WORKING (bug!)
```

**Expected Result:**
- ✅ Only 1 record created despite 5 clicks
- ✅ Button disabled during save

**If Failed (5 records created):**
- 🚨 CRITICAL BUG - Save lock broken
- Screenshot
- Check comicFormSubmitLockRef in console

---

### Test #4: Edit Comic - Delete Source

**Steps:**

```
1. Dari comic yang sudah ada, klik "Edit"
2. Di form edit, lihat source list yang sudah ada
3. **DELETE salah satu source** (klik X atau delete button)
   ✓ Verify: Source hilang dari form
4. Klik "Simpan"
   ✓ Modal tutup
   ✓ Toast success
5. Buka Supabase → comic_sources table
   ✓ VERIFY: Sumber yang dihapus TIDAK ADA lagi
   ✓ Sumber lain TETAP ADA
6. Buka detail comic → sumber harus berkurang
```

**Expected Result:**
- ✅ Source deleted from DB
- ✅ Other sources remain
- ✅ Modal closes

---

### Test #5: Error Path - Title Kosong

**Steps:**

```
1. Klik "Add Comic"
2. JANGAN isi judul, hanya isi URL
3. Klik "Simpan"
4. **VERIFY: Modal tetap BUKA** (jangan tutup!)
5. Error message harus tampil di dalam modal
   ✓ Pesan: "Judul komik wajib diisi"
6. Isi judul sekarang
7. Klik "Simpan" lagi → harus sukses
```

**Expected Result:**
- ✅ Modal stays open on error
- ✅ Error message visible
- ✅ User can fix and retry

**If Modal Closed:**
- 🚨 BUG - Modal tutup padahal error, user hilang input
- Screenshot

---

### Test #6: Duplicate URL - Cancel Path

**Steps:**

```
1. Dari comic yang sudah ada, note salah satu URL-nya
   Contoh: https://www.webtoons.com/id/fantasy/oversummoned/list?title_no=7025
2. Klik "Add Comic" baru
3. Masukkan:
   - Judul: "New Comic"
   - URL: (copy URL dari step 1 - yang sudah ada)
4. Klik "Simpan"
5. Dialog harus muncul:
   "Sumber ini sudah terhubung ke 'Test Comic #1'. Buka komik lama?"
   Buttons: "Buka komik lama" atau "Batal"
6. Klik "Batal"
   ✓ Dialog tutup
   ✓ Modal form TETAP BUKA
   ✓ Form tetap punya data yang diisi (judul, URL)
7. Edit judul menjadi: "New Comic v2"
8. Klik "Simpan" lagi → sekarang harus sukses (bukan duplicate)
```

**Expected Result:**
- ✅ Duplicate dialog appears
- ✅ Cancel → form preserved
- ✅ Can edit and save successfully

**If Form Hilang:**
- 🚨 BUG - User input hilang, bad UX
- Screenshot

---

### Test #7: Duplicate URL - Open Old Comic Path

**Steps:**

```
1. Klik "Add Comic"
2. Masukkan URL yang sudah ada di comic lain
3. Dialog muncul dengan opsi "Buka komik lama"
4. Klik "Buka komik lama"
   ✓ Form tutup
   ✓ Seharusnya switch ke edit mode comic lama
   ✓ Panel samping menunjukkan comic lama
5. Verify: Tidak ada comic baru dibuat
   → Supabase count tetap sama
```

**Expected Result:**
- ✅ Old comic opened
- ✅ Form closed
- ✅ No new comic created

---

### Test #8: Network Fail During Save

**Steps:**

```
1. Buka DevTools (F12)
2. Network tab → Throttle ke "Offline" atau "Slow 3G"
3. Klik "Add Comic", isi data
4. Klik "Simpan"
   ✓ Proses dimulai
5. Tunggu sebentar, kemudian Network tetap simulate fail
6. Modal harus tetap BUKA
7. Error message harus muncul
   "Gagal menyimpan komik: ..."
8. Kemudian enable network lagi
9. Seharusnya ada opsi untuk retry atau refresh
```

**Expected Result:**
- ✅ Modal stays open
- ✅ Error message shown
- ✅ User can retry

---

## 🔍 PHASE 2 - SCRAPING TESTS (High Risk!)

### Test Setup

- Buka 2 tab browser:
  - Tab 1: Aplikasi (localhost:5173)
  - Tab 2: Scraping site test

### Test #9: Shinigami

**URL:** https://11.shinigami.asia/series/ff55b7a1-3c32-4c60-8172-1127980de3e1

**Steps:**

```
1. Buka URL di Tab 2, lihat website aslinya
   - Note: Judul, genre, cover image
2. Di Tab 1, "Add Comic"
3. Paste URL ke form
4. Tunggu metadata load
   ✓ Verify: Judul COCOK dengan website
   ✓ Verify: Genre COCOK dengan website
   ✓ Verify: Cover candidates ada (bukan broken image)
5. Lihat console - ada error CORS?
   - Shinigami butuh proxy via Edge Function
   ✓ Verify: Server-side metadata berhasil (bukan blocked)
6. Pilih cover terbaik
7. Save comic
```

**Check Points:**
- ✅ Judul terdeteksi benar
- ✅ Genre ada (jangan kosong)
- ✅ Cover muncul (bukan 404/broken)
- ✅ Tidak ada CORS error di console
- ✅ Save berhasil

**If Judul Kosong/Salah:**
- ⚠️ Scraping broken untuk site ini
- Screenshot console
- Note: "Shinigami judul tidak terdeteksi"

---

### Test #10: Webtoons

**URL:** https://www.webtoons.com/id/fantasy/oversummoned-overpowered-and-over-it/list?title_no=7025

**Steps:**

```
1. Tab 2: Buka URL, lihat judul + genre + cover
2. Tab 1: Add Comic
3. Paste URL
4. Tunggu metadata load (Webtoons bisa lambat)
   ✓ Verify: Judul -> "Oversummoned, Overpowered, and Over It"
   ✓ Verify: Genre ada
   ✓ Verify: Cover shows webtoon poster
5. Save comic
```

**Check Points:**
- ✅ Metadata terdeteksi
- ✅ Cover dari webtoons berhasil
- ✅ No console errors

---

### Test #11: MangaPlus

**URL:** https://mangaplus.shueisha.co.jp/titles/100738

**Steps:**

```
1. Tab 2: Buka URL (mungkin perlu VPN/proxy)
2. Tab 1: Add Comic → paste URL
3. Tunggu metadata
   ⚠️ SPECIAL: MangaPlus punya signed/temporary URLs
   ✓ Verify: Cover URL bekerja (bukan expired)
   - Buka URL cover di tab baru, harus bisa display
4. Save comic
```

**Check Points:**
- ✅ Cover URL works (not expired)
- ✅ Metadata loaded
- ✅ Save successful

---

### Test #12: Komiktap

**URL:** https://komiktap.info/manga/secret-class/

**Steps:**

```
1. Tab 2: View website
2. Tab 1: Add Comic → paste URL
3. Tunggu metadata
   - Komiktap punya oEmbed API
   ✓ Verify: Metadata dari oEmbed OR HTML fallback
4. Save comic
```

**Check Points:**
- ✅ Metadata loaded
- ✅ Cover displays

---

### Test #13: MangaDistrict

**URL:** https://mangadistrict.com/series/the-giantess-who-unleashed-my-inner-monster/

**Steps:**

```
1. Tab 2: View website, note Genre(s) and Type fields
2. Tab 1: Add Comic → paste URL
3. Tunggu metadata
   ✓ Verify: Genre(s) dari MangaDistrict terdeteksi
   ✓ Verify: Type (Manga/Manhwa) terdeteksi
4. Save comic
```

**Check Points:**
- ✅ Genre metadata extracted
- ✅ Cover works

---

### Test #14: Ryukomik (Known Issue)

**URL:** https://ryukomik.my.id/komik/komiku/regressor-of-the-fallen-family

**⚠️ KNOWN ISSUE: Notes/Genre inconsistent**

**Steps:**

```
1. Tab 2: View website
2. Tab 1: Add Comic → paste URL
3. Tunggu metadata
4. Check:
   - Judul terdeteksi?
   - Genre terdeteksi?
   - Cover ada?
5. Note: Ini situs yang punya issue
   - Mungkin judul/genre kurang konsisten
   - Dokumentasi: "perlu dicek lagi saat ada waktu"
```

**Expected:**
- ⚠️ Mungkin tidak sempurna, tapi jangan error/crash

---

## 📊 PHASE 3 - COVER SYNC

### Test #15: Local Save → Refresh → Sync

**Steps:**

```
1. Add comic dengan cover
2. Buka DevTools → Application → LocalStorage
   ✓ Verify: Ada data `pendingCoverSync` atau cache cover
3. Refresh page (Ctrl+R)
   ✓ Verify: Comic masih ada (lokal)
   ✓ Verify: Cover cache masih ada
4. Klik "Sync Sekarang" / "Sync Now" di sidebar
   ⏱ Tunggu sync process
   ✓ Verify: Toast "Sinkronisasi berhasil"
5. Buka Supabase Storage → bucket `covers`
   ✓ Verify: Cover file ada dengan nama yang benar
6. Verify: `cover_storage_path` di comics table punya value
```

**Expected Result:**
- ✅ Local persistence works
- ✅ Sync to Supabase succeeds
- ✅ File in storage bucket
- ✅ cover_storage_path set

---

## ✅ CHECKLIST HASIL TEST

### Phase 1 Summary

```
[ ] Test #1: Add 1 source - SUCCESS/FAIL
[ ] Test #2: Add 2 sources - SUCCESS/FAIL
[ ] Test #3: Rapid save (lock) - SUCCESS/FAIL
[ ] Test #4: Edit delete source - SUCCESS/FAIL
[ ] Test #5: Error path (title kosong) - SUCCESS/FAIL
[ ] Test #6: Duplicate cancel - SUCCESS/FAIL
[ ] Test #7: Duplicate open old - SUCCESS/FAIL
[ ] Test #8: Network fail - SUCCESS/FAIL
```

### Phase 2 Summary

```
[ ] Test #9: Shinigami - SUCCESS/FAIL
[ ] Test #10: Webtoons - SUCCESS/FAIL
[ ] Test #11: MangaPlus - SUCCESS/FAIL
[ ] Test #12: Komiktap - SUCCESS/FAIL
[ ] Test #13: MangaDistrict - SUCCESS/FAIL
[ ] Test #14: Ryukomik - SUCCESS/FAIL
```

### Phase 3 Summary

```
[ ] Test #15: Cover sync - SUCCESS/FAIL
```

---

## 🐛 KALAU ADA ERROR

### Dokumentasi Error

Untuk setiap test yang FAIL, dokumentasi:

```
Test #[N]: [Nama Test]
Status: FAIL
Steps:
1. [Step yang error]
2. [Apa yang terjadi]
3. [Expected vs Actual]

Console Error (F12):
[Copy-paste error message]

Network Error:
[Screenshot network tab]

Screenshot:
[Save screenshot]

Notes:
[Context tambahan]
```

### Trace dengan Graphify

Kalau bingung, gunakan graphify:

```bash
# Example: Trace cover save flow
graphify query "Bagaimana cover URL disimpan ke Supabase?"

# Trace modal state
graphify query "Kapan modal ditutup pada save comic?"

# Trace duplicate URL logic
graphify query "Bagaimana duplikat URL dideteksi?"
```

---

## 📝 HASIL AKHIR

Setelah semua test selesai, buat summary:

```
REGRESSION TEST RESULTS
======================
Date: [tanggal]
Tester: [nama]

PHASE 1 (Save Flow):
- Passed: 6/8
- Failed: 2/8
- Issues: [list]

PHASE 2 (Scraping):
- Passed: 5/6
- Failed: 1/6
- Issues: [list]

PHASE 3 (Cover Sync):
- Passed: 1/1
- Failed: 0/1

Total: 12/15 passed ✅
Critical Blockers: [if any]
Next Action: [deploy / fix / continue testing]
```

---

## ⏱️ ESTIMASI WAKTU

```
Phase 1: 45 menit
Phase 2: 60 menit (Scraping bisa lama)
Phase 3: 15 menit
Console check: 10 menit
Summary: 5 menit
─────────────────
TOTAL: ~2 jam 15 menit
```

---

## 🚀 READY?

Buka browser, login, dan mulai dengan **Test #1**!

Kalau stuck di mana, trace dengan graphify atau ask! 💪
