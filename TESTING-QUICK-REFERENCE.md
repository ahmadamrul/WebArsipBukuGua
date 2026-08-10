# 🎯 QUICK REFERENCE - Manual Testing

## Before Testing

```bash
# 1. Start dev server
npm run dev

# 2. Login dengan akun test
# 3. Buka DevTools (F12) - untuk check error

# 4. Have ready:
- Supabase Dashboard (verify DB records)
- 2 browser tabs (App + Scraping sites)
- Notepad (track results)
```

---

## Phase 1: Save Flow (8 Tests)

| # | Test | Key Check | Expected |
|---|------|-----------|----------|
| 1 | Add 1 source | Modal close, toast, DB record | ✅ Success |
| 2 | Add 2 sources | Merge candidates + genres | ✅ 2 sources saved |
| 3 | Rapid save 5x | Only 1 record (lock working) | ✅ 1 record |
| 4 | Delete source | Sumber gone from DB | ✅ Deleted |
| 5 | Title empty | Modal stays open + error | ✅ Error shown |
| 6 | Duplicate cancel | Form preserved | ✅ Input kept |
| 7 | Duplicate open | Switch to edit mode | ✅ Switched |
| 8 | Network fail | Modal open + error | ✅ Error shown |

**⏱ Time: 45 min**  
**Pass Rate: 8/8 = GO to Phase 2**

---

## Phase 2: Scraping (6 Sites)

| # | Site | URL Pattern | Key Point |
|---|------|---|---|
| 9 | Shinigami | 11.shinigami.asia | Proxy server-side |
| 10 | Webtoons | webtoons.com | API metadata |
| 11 | MangaPlus | mangaplus.shueisha.co.jp | Signed URLs |
| 12 | Komiktap | komiktap.info | oEmbed fallback |
| 13 | MangaDistrict | mangadistrict.com | Genre extraction |
| 14 | Ryukomik | ryukomik.my.id | ⚠️ Known issue |

**Each site check:**
- ✅ Judul terdeteksi benar
- ✅ Genre ada (not empty)
- ✅ Cover muncul (not broken)
- ✅ No CORS error

**⏱ Time: 60 min**  
**HIGH RISK - Run first!**

---

## Phase 3: Cover Sync (1 Test)

| # | Test | Steps | Check |
|---|------|-------|-------|
| 15 | Local→Sync | Add cover→refresh→sync | Storage bucket OK |

- ✅ Local storage has cover cache
- ✅ Sync button works
- ✅ File in Supabase Storage
- ✅ cover_storage_path set

**⏱ Time: 15 min**

---

## Common Issues & Fix

### Modal Closes on Error ❌
- **Problem:** Form lost on error
- **Expected:** Modal stays open
- **Action:** Check useComicFormActions.ts lines 263-268
- **Trace:** `graphify query "Kapan modal ditutup saat error?"`

### Duplicate URL Not Detected ❌
- **Problem:** Duplicate allows save
- **Expected:** Dialog appears
- **Action:** Check normalizeSourceUrl()
- **Trace:** `graphify query "Bagaimana duplikat URL dideteksi?"`

### Rapid Save Creates Multiple ❌
- **Problem:** 5 clicks = 5 records
- **Expected:** Only 1 record (lock broken)
- **Action:** Check comicFormSubmitLockRef
- **Trace:** `graphify query "Dimana form lock diimplementasikan?"`

### Scraping Returns Empty ❌
- **Problem:** Judul/genre/cover kosong
- **Expected:** Data terdeteksi
- **Action:** Check detectMetadata() in libraryService.ts
- **Trace:** `graphify query "Bagaimana judul terdeteksi dari {site}?"`

### Cover Not Synced ❌
- **Problem:** Cover not in Storage
- **Expected:** File in bucket
- **Action:** Check queueCoverSync() & syncNow()
- **Trace:** `graphify query "Alur cover sync ke Supabase storage?"`

---

## Console Commands (F12)

```javascript
// Check if form lock is active
console.log('Lock active:', comicFormSubmitLockRef.current)

// Check pending cover sync
localStorage.getItem('pendingCoverSync')

// Check current form mode
console.log('Form mode:', formMode)

// Clear localStorage (reset app state)
localStorage.clear()
```

---

## Supabase Checks

### Count Comics
```sql
SELECT COUNT(*) FROM comics WHERE user_id = 'YOUR_USER_ID';
```

### Check Sources
```sql
SELECT * FROM comic_sources WHERE comic_id = 'COMIC_ID';
```

### Check Covers
- Go to Storage → covers bucket
- See files with pattern: `[user_id]/[comic_id].webp`

### Check RLS
- All queries should filter by `user_id`
- Can't see other users' data

---

## Success Criteria

### Phase 1 ✅
```
✅ All 8 tests pass (100%)
✅ No console errors
✅ DB records correct
✅ Modal behavior correct
```

### Phase 2 ✅
```
✅ 5-6 sites work (83-100%)
✅ Metadata detected
✅ Covers load
✅ Ryukomik OK even if imperfect
```

### Phase 3 ✅
```
✅ Cover persists locally
✅ Sync to Supabase works
✅ File in storage bucket
```

### Overall ✅
```
✅ No Unhandled Promise errors
✅ No duplicate records from double-click
✅ Modal behavior correct
✅ Responsive (desktop looks good)
→ READY FOR PHASE 4+
```

---

## If Stuck

### Option 1: Use Graphify
```bash
graphify query "Bagaimana [feature] diimplementasikan?"
```

### Option 2: Check Code
- Look at files in AUDIT-REPORT-GRAPHIFY.md "Key Files"
- Read comments in useComicFormActions.ts

### Option 3: Ask for Trace
- "Trace: Why is modal closing on error?"
- Provide test step + expected vs actual
- Will use graphify to investigate

---

## Reporting Template

```
TEST REPORT
===========

Date: [YYYY-MM-DD]
Phase: [1/2/3]
Test #: [N]
Status: [PASS/FAIL]

Steps:
1. [What you did]
2. [What happened]
3. [Expected result]

Actual Result:
[Describe what actually happened]

Console Error (F12):
[Error message or "No error"]

Screenshot:
[Saved as: test-[N]-[FAIL/PASS].png]

Notes:
[Any additional context]
```

---

## Timeline

```
Right now: Start Phase 1 (45 min)
↓
After Phase 1: Phase 2 (60 min) - HIGHEST RISK
↓
After Phase 2: Phase 3 (15 min) - Quick check
↓
After all: Summary + decisions
  - All pass → Go Phase 4+
  - 1-2 fail → Fix + retest
  - Major fail → Investigate + trace
```

---

## GO! 🚀

1. Open browser to `http://localhost:5173`
2. Login
3. Start with **Test #1**
4. Track in TESTING-GUIDE-MANUAL.md
5. Report results when done!

**Estimated:** 2 hours 15 minutes total
**Difficulty:** Easy - Just click and verify
**Risk:** Medium-High for scraping tests

Good luck! 💪
