# Implementation Plan: Fix Test Sessions Eligibility Runtime Error

> **Doc ID:** `20261113 - Fix Test Sessions Eligibility Function and UI Error`  
> **Target Module:** `js/admin/tests-access.js`  
> **Route:** `admin.html?status=active#class-hub?tab=test-sessions`  
> **Status:** Pending User Approval (`request_feedback: true`)  

---

## 1. Goal Description & Root Cause Analysis (RCA)

### Problem Description
Saat membuka tab `Test Sessions` pada URL `http://localhost:5500/admin.html?status=active#class-hub?tab=test-sessions`, layar admin menampilkan pesan error:
```text
Failed to load class data: evaluateStudentEligibility is not defined
```
Pada DevTools console terlihat:
```text
[renderClassHub error]: ReferenceError: evaluateStudentEligibility is not defined
    at texts-access.js?v=20261110_v174:231:23
    at Array.map (<anonymous>)
    at renderClassTestSessions (texts-access.js?v=20261110_v174:118:23)
```

![Runtime Error Screenshot](C:/Users/Top/.gemini/antigravity/brain/e109f303-e1a5-4e34-b57b-3d40f829c347/error_runtime_screenshot.png)

### Root Cause
1. Di dalam `js/admin/tests-access.js`, fungsi mesin evaluasi kelayakan murid bernama asli **`evaluateStudentsEligibility`** (menggunakan akhiran jamak `s`, baris 2938) dan menerima parameter berupa objek:
   ```javascript
   function evaluateStudentsEligibility({ students, theme, themeTasks, themeQuizzes, wordsTest, phrasesTest, classTests = [], allAttempts = [], mode })
   ```
2. Pada implementasi radar kesiapan di baris 231 dan 234, fungsi dipanggil dengan nama tunggal **`evaluateStudentEligibility`** (tanpa huruf `s`) dan menggunakan positional arguments:
   ```javascript
   // ❌ ERROR: Fungsi ini tidak eksis di scope
   const normalEvals = evaluateStudentEligibility(themeObj, activeBatchStudents, allAttempts, 'normal', classTests);
   ```
3. Akibatnya, JavaScript melempar `ReferenceError: evaluateStudentEligibility is not defined`, menghentikan rendering Class Hub, dan menampilkan pesan kegagalan merah di tengah layar.

---

## 2. Proposed Changes

### [MODIFY] `js/admin/tests-access.js`

1. **Perbaikan Pemanggilan Fungsi Evaluasi (Baris 231 & 234)**:
   Ubah pemanggilan menjadi signature objek yang valid:
   ```javascript
   // 🟢 FIX: Gunakan evaluateStudentsEligibility dengan objek parameter lengkap
   const normalEvals = evaluateStudentsEligibility({
     students: activeBatchStudents,
     theme: themeObj,
     themeTasks: tasks,
     wordsTest,
     phrasesTest,
     classTests,
     allAttempts,
     mode: 'normal'
   });
   const eligibleNormalCount = normalEvals.filter(e => e.isEligible).length;

   const remedialEvals = evaluateStudentsEligibility({
     students: activeBatchStudents,
     theme: themeObj,
     themeTasks: tasks,
     wordsTest,
     phrasesTest,
     classTests,
     allAttempts,
     mode: 'remedial'
   });
   const eligibleRemedialCount = remedialEvals.filter(e => e.isEligible).length;
   ```

2. **Penyediaan Fungsi Alias / Wrapper Universal (Fail-safe)**:
   Tambahkan alias wrapper di dekat baris 2935 agar jika ada kode lain memanggil dengan nama tunggal maupun positional arguments, fungsi tetap berjalan mulus tanpa crash:
   ```javascript
   /**
    * Backward-compatibility wrapper for singular / positional invocations
    */
   function evaluateStudentEligibility(themeOrObj, students, allAttempts, mode = 'normal', classTests = []) {
     if (themeOrObj && typeof themeOrObj === 'object' && themeOrObj.students) {
       return evaluateStudentsEligibility(themeOrObj);
     }
     return evaluateStudentsEligibility({
       students: students || [],
       theme: themeOrObj,
       themeTasks: themeOrObj?.tasks || [],
       wordsTest: themeOrObj?.wordsTest,
       phrasesTest: themeOrObj?.phrasesTest,
       classTests,
       allAttempts,
       mode
     });
   }
   ```

---

## 3. Standardized 4-Column Before & After Comparative Matrix

| Komponen / Properti | 🔴 Kondisi Saat Ini (BEFORE) | 🟢 Target Perubahan (AFTER) | Dasar Aturan / Alasan |
| :--- | :--- | :--- | :--- |
| **Pemanggilan Fungsi Radar** | `evaluateStudentEligibility(...)` (singular & positional) ➔ `ReferenceError` | `evaluateStudentsEligibility({ ... })` (object signature resmi) | **Integritas Eksekusi**: Menghilangkan `ReferenceError` fatal pada runtime. |
| **Fungsi Wrapper / Alias** | Belum ada fungsi `evaluateStudentEligibility` di scope modul | Menyediakan wrapper `evaluateStudentEligibility` yang aman | **Robustness**: Mencegah regresi jika ada pemanggilan tunggal di bagian lain. |
| **Tampilan Halaman Admin** | Blank hitam dengan teks merah `Failed to load class data...` | Render sempurna: 4 kartu tema modern, outline buttons, dan tabel matriks siswa | **UX & Spatial Invariant**: Halaman harus tampil 100% fungsional tanpa error. |
| **Indikator Kesiapan Siswa** | Macet / tidak tampil karena crash | Tampil badge kesiapan `👥 3/3 READY (100%)` dan hitungan tombol | **Fitur Sukses**: Radar kesiapan batch berfungsi realtime. |

---

## 4. Verification Plan

### Automated Tests
1. **Node.js AST & Syntax Check**:
   ```powershell
   node --check js/admin/tests-access.js
   ```
2. **Runtime Simulation Test (`scripts/verify_runtime_eligibility_fix.mjs`)**:
   - Memanggil `renderClassTestSessions` secara headless dengan mock context Supabase nyata (`Camp 2nd Vocabulary` dan `Evnikom 1st Vocabulary`).
   - Memastikan tidak ada exception atau `ReferenceError` yang dilempar.
   - Memverifikasi `normalEvals` dan `remedialEvals` mengembalikan array evaluasi yang valid.

### Manual Verification
- Buka `http://localhost:5500/admin.html?status=active#class-hub?tab=test-sessions`.
- Verifikasi kartu tema muncul rapi dengan tombol outline dan tabel matriks kesiapan siswa tanpa error console.

---

## 5. Visual Pre-Flight Verification Checklist

- [x] **Current State Screenshot (Before)**: Embedded runtime error screenshot from user DevTools.
- [x] **Proposed Changes Documented**: Explicit code snippets and wrapper design.
- [ ] **Zero Console Errors**: Verified no `ReferenceError` in browser DevTools.
- [ ] **Zero Outer Page Scroll**: Verified root `100vh` lock with `calc(100vh - 60px)`.
- [ ] **Language Standard**: Verified all headers and labels use 100% direct English.
