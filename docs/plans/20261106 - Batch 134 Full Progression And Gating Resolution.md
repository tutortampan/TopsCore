# Plan: Investigasi Kendala Gagal Lanjut Task Seluruh Siswa Batch 134 & Solusi Penuntasan

> **Status: [IMPLEMENTED] (SUDAH) — CLOSED / ARCHIVED** (All components fully implemented, verified, committed in `b1bfa81`, pushed to `main`, active in production with cache buster `v=20261105_v134` and SW cache `v62`).

## Ringkasan Eksekutif & Temuan Utama (Root Cause Analysis)

Berdasarkan audit mendalam terhadap seluruh data siswa di **Batch 134** (`3e7288b7-a90e-4323-9b02-24e73991f0d7`) pada kelas **2nd Vocabulary** (`2ccf6468-1e03-41d1-b72b-1d84dcad85b2`), ditemukan **3 akar penyebab utama** mengapa banyak siswa mengalami kegagalan saat ingin melanjutkan task:

---

### 1. Akar Penyebab Utama: Bug Threshold Hardcoded 70% vs Database 60% di Edge Function `start-test`
- **Fakta di Database:** Pada tabel `tests`, nilai `minimum_required_score` untuk `2A-WORDS-EXAM`, `2B-WORDS-EXAM`, dan `2C-WORDS-EXAM` dikonfigurasi resmi sebesar **`60%`** (sesuai standar pedagogi TopsCore Grade C = 60%).
- **Fakta di Tampilan Dashboard (`dashboard.js:1750`):** Dashboard membaca nilai resmi database `pe.minimum_required_score || 60`, sehingga siswa yang memperoleh nilai 60%–69% dinyatakan **LULUS** Theme B Exam, dan kartu Theme C di dashboard tampil **TERBUKA (UNLOCKED)**.
- **Bug di Server Edge Function (`start-test/index.ts:208` & `js/api.js:1462`):**
  Server melakukan pengecekan Section 5b dengan nilai ambang batas **hardcoded 70%**:
  ```typescript
  if (pct >= 70 || att.is_remedial_unlocked || att.is_forgiven) { ... }
  ```
- **Dampak Nyata:**
  Ketika siswa mengklik tombol *"Lanjut Drill"* atau *"Mulai Task"* di dashboard, fungsi `startTest` memanggil Edge Function `start-test`. Edge Function menolak siswa dengan error:
  > `403: Prerequisite not completed. You must pass all Theme B Exams with at least 70% before taking Theme C tests.`
  
  Siswa-siswa yang terkena dampak langsung bug ini (nilai Theme B Exam antara 60% dan 69%):
  1. **Mr. Muhammad Afyani Farobi**: Nilai Theme B Exam = **69%** (hanya kurang 1% dari 70%, namun di atas KKM 60%).
  2. **Miss Cinta Laura**: Nilai Theme B Exam = **63%** (Grade C Lulus, di atas KKM 60%).
  3. **Mr. Muhamad Alifurrahman**: Nilai Theme B Exam = **60%** (Grade C Lulus, pas KKM 60%).
  4. **Miss Adinda Karunia Farela**: Nilai Theme B Exam = **60%** (Grade C Lulus, pas KKM 60%).
  5. **Mr. Muhammad Ariwil Asrori**: Nilai Theme B Exam = **60%** (Grade C Lulus, pas KKM 60%).

---

### 2. Akar Penyebab Kedua: Cross-Theme Gating Seharusnya Hanya untuk Exam, Bukan Task Harian
- Pada `start-test/index.ts` baris 489, aturan awal Cross-Theme Prerequisite memang dikhususkan untuk **Exam** (`test.test_type === 'exam'`).
- Namun pada Section 5b (baris 174–220), aturan tersebut diterapkan ke **SELURUH test di Theme C**, termasuk task drill harian (C1, C2, C3, C4).
- Akibatnya, siswa yang belum lulus ujian Theme B tidak bisa mengikuti drill harian Theme C di kelas bersama teman-temannya. 
- **Solusi Pedagogis:** Cross-theme gating harus menggunakan KKM resmi ujian (`pe.minimum_required_score` = 60%), dan task harian (formative drill) tidak boleh diblokir total jika siswa sudah tuntas task sebelumnya.

---

### 3. Akar Penyebab Ketiga: Riwayat Attempt Sebelum Aturan Linear Diperketat
- Kemarin (4 November), beberapa siswa sempat mencoba mengerjakan Topic C2, C3, atau C4 sebanyak 1–2 kali sebelum aturan Linear Prerequisite 7×7 diterapkan.
- Hari ini, ketika mereka membuka dashboard dan melihat ada riwayat di C3, mereka mencoba mengklik C3, namun sistem memblokir karena Topic C2 (atau C1) belum mencapai 7 kelulusan.
- Siswa-siswa ini mengira sistem error, padahal sistem meminta penuntasan prasyarat topik sebelumnya secara urut:
  - **Mr. Abdul Basit**: C1 memiliki 6/7 kelulusan. Sempat mengerjakan C2 1 kali. (Perlu 1 kelulusan lagi di C1 agar C2 terbuka resmi).
  - **Mr. Ayya Sofyandi**: C2 memiliki 6/7 kelulusan. Sempat mengerjakan C3 1 kali. (Perlu 1 kelulusan lagi di C2 agar C3 terbuka resmi).
  - **Mr. Lalu Yuda Handika Prawira**: C2 memiliki 4/7 kelulusan. Sempat mengerjakan C3 2 kali. (Perlu 3 kelulusan lagi di C2).
  - **Miss Alfina Damayanti**: C2 memiliki 3/7 kelulusan. Sempat mengerjakan C3 1 kali. (Perlu 4 kelulusan lagi di C2).
  - **Mr. Wildian Yusroni**: C2 memiliki 4/7 kelulusan. Sempat mengerjakan C3 1 kali. (Perlu 3 kelulusan lagi di C2).

---

### 4. Akar Penyebab Keempat: Attempt `in_progress` yang Menggantung (Stuck Sessions)
Beberapa siswa membuka tes/task dan meninggalkannya tanpa submit, sehingga sesi tersimpan sebagai `in_progress`:
1. **Mr. Muhammad Afyani Farobi**: Membuka `2A-WORDS-EXAM` pukul 12:08 UTC karena mengira harus mengulang Theme A.
2. **Mr. Muhammad Ariwil Asrori**: Membuka `2A-WORDS-EXAM` pukul 12:02 UTC dengan alasan serupa.
3. **Miss Sari Hikmah**: Membuka `2C2-WORDS-TASK` pukul 12:17 UTC.
4. **Mr. Lalu Yuda Handika Prawira**: Membuka `2C2-WORDS-TASK` pukul 12:18 UTC.

---

## Matriks Status Lengkap Seluruh 18 Siswa Batch 134

| # | Nama Siswa | Theme B Exam | Status Progres Theme C | Task Aktif yang Harus Dikerjakan | Status Gating Saat Ini | Solusi / Tindakan |
|---|---|:---:|---|---|:---:|---|
| 1 | **Miss Adinda Karunia Farela** | 60% (Lulus KKM) | C1: 6/7, C2: 2/7, C3: 2/7, C4: 0/7 | `2C1-WORDS-TASK` (Perlu 1 pass) | ❌ Terblokir bug 70% | Samakan KKM Edge Function ke 60% & selesaikan 1 pass C1 |
| 2 | **Miss Alfina Damayanti** | 99% (Lulus) | C1: 7/7 ✅, C2: 3/7, C3: 1/7 | `2C2-WORDS-TASK` (Perlu 4 pass) | ✅ Terbuka di C2 | Lanjut drill C2 hingga 7/7 |
| 3 | **Miss Cinta Laura** | 63% (Lulus KKM) | C1: 9/7 ✅, C2: 2/7, C3: 1/7 | `2C2-WORDS-TASK` (Perlu 5 pass) | ❌ Terblokir bug 70% | Samakan KKM Edge Function ke 60% & selesaikan 5 pass C2 |
| 4 | **Miss Havvina Solehah** | 92% (Lulus) | C1: 7/7 ✅, C2: 7/7 ✅, C3: 7/7 ✅, C4: 7/7 ✅ | `2C-WORDS-EXAM` | ✅ Siap Ujian | Kerjakan Theme C Official Exam |
| 5 | **Miss Isnantika Salsabila** | 99% (Lulus) | C1: 7/7 ✅, C2: 7/7 ✅, C3: 1/7 | `2C3-WORDS-TASK` (Perlu 6 pass) | ✅ Terbuka di C3 | Lanjut drill C3 hingga 7/7 |
| 6 | **Miss Riska Fetrosia** | 96% (Lulus) | C1: 7/7 ✅, C2: 2/7 | `2C2-WORDS-TASK` (Perlu 5 pass) | ✅ Terbuka di C2 | Lanjut drill C2 hingga 7/7 |
| 7 | **Miss Sari Hikmah** | 94% (Lulus) | C1: 8/7 ✅, C2: 9/7 ✅, C3: 7/7 ✅, C4: 3/7 | `2C4-WORDS-TASK` (Perlu 4 pass) | ⏳ In-Progress di C2 | Bersihkan sesi gantung C2 & lanjut drill C4 |
| 8 | **Mr. Abdul Basit** | 82% (Lulus) | C1: 6/7, C2: 1/7 | `2C1-WORDS-TASK` (Perlu 1 pass) | ✅ Terbuka di C1 | Selesaikan 1 pass lagi di C1 agar C2 terbuka |
| 9 | **Mr. Abdul Qoyyim Hanif D.** | 78% (Lulus) | C1: 8/7 ✅, C2: 1/7 | `2C2-WORDS-TASK` (Perlu 6 pass) | ✅ Terbuka di C2 | Lanjut drill C2 hingga 7/7 |
| 10 | **Mr. Ayya Sofyandi Mzeth** | 100% (Lulus) | C1: 9/7 ✅, C2: 6/7, C3: 1/7 | `2C2-WORDS-TASK` (Perlu 1 pass) | ✅ Terbuka di C2 | Selesaikan 1 pass lagi di C2 agar C3 terbuka |
| 11 | **Mr. Lalu Arman Maulana** | 78% (Lulus) | C1: 0/7, C2: 0/7, C3: 0/7, C4: 0/7 | `2C1-WORDS-TASK` (Perlu 7 pass) | ✅ Terbuka di C1 | Mulai drill dari C1 |
| 12 | **Mr. Lalu Nune Mubarak** | 80% (Lulus) | C1: 0/7, C2: 0/7, C3: 0/7, C4: 0/7 | `2C1-WORDS-TASK` (Perlu 7 pass) | ✅ Terbuka di C1 | Mulai drill dari C1 |
| 13 | **Mr. Lalu Yuda Handika P.** | 96% (Lulus) | C1: 8/7 ✅, C2: 4/7, C3: 2/7 | `2C2-WORDS-TASK` (Perlu 3 pass) | ⏳ In-Progress di C2 | Selesaikan sesi aktif C2 & capai 7 pass |
| 14 | **Mr. Muhamad Alifurrahman** | 60% (Lulus KKM) | C1: 2/7, C2: 0/7, C3: 0/7, C4: 0/7 | `2C1-WORDS-TASK` (Perlu 5 pass) | ❌ Terblokir bug 70% | Samakan KKM Edge Function ke 60% & selesaikan 5 pass C1 |
| 15 | **Mr. Muhammad Afyani Farobi**| 69% (Lulus KKM) | C1: 6/7, C2: 0/7, C3: 0/7, C4: 0/7 | `2C1-WORDS-TASK` (Perlu 1 pass) | ❌ Terblokir bug 70% & in-progress 2A | Samakan KKM Edge Function ke 60%, batalkan sesi 2A, tuntaskan 1 pass C1 |
| 16 | **Mr. Muhammad Ariwil Asrori**| 60% (Lulus KKM) | C1: 2/7, C2: 0/7, C3: 0/7, C4: 0/7 | `2C1-WORDS-TASK` (Perlu 5 pass) | ❌ Terblokir bug 70% & in-progress 2A | Samakan KKM Edge Function ke 60%, batalkan sesi 2A, tuntaskan 5 pass C1 |
| 17 | **Mr. Wildian Yusroni** | 74% (Lulus) | C1: 8/7 ✅, C2: 4/7, C3: 0/7 | `2C2-WORDS-TASK` (Perlu 3 pass) | ✅ Terbuka di C2 | Lanjut drill C2 hingga 7/7 |
| 18 | **Mr. Test** (Akun Uji Coba) | 0% (Belum Lulus) | C1: 1/7 | `2C1-WORDS-TASK` | ⚪ Akun Uji Coba | Bebas |

---

## Usulan Perbaikan & Rencana Eksekusi (Proposed Changes)

### 1. Sinkronisasi KKM Exam di Edge Function `start-test` & Client Fallback
#### [MODIFY] `supabase/functions/start-test/index.ts`
- Ganti nilai ambang batas hardcoded `70%` pada Section 5b dan Section 4 dengan nilai dinamis dari konfigurasi tes:
  ```typescript
  const reqScore = pe.minimum_required_score || pe.pass_threshold || 60;
  if (pct >= reqScore || att.is_remedial_unlocked || att.is_forgiven) {
    passedPriorIds.add(att.test_id);
  }
  ```
- Pada baris 411 (pengecekan task menuju exam), gunakan ambang batas kelulusan task (`taskMinScore` = 50%), bukan 70%.

#### [MODIFY] `js/api.js`
- Sinkronkan baris 1462:
  ```javascript
  const reqScore = priorExam.minimum_required_score || 60;
  if (pct >= reqScore || att.is_remedial_unlocked || att.is_forgiven) {
    passedPriorIds.add(att.test_id);
  }
  ```

### 2. Pembersihan Sesi Gantung (Cleanup Stuck In-Progress Attempts)
- Batalkan (cancel) sesi yang tidak sengaja dibuka pada `2A-WORDS-EXAM` untuk:
  - `Mr. Muhammad Afyani Farobi` (`181053bd-6ae5-4778-9290-8a12dfb82b65`)
  - `Mr. Muhammad Ariwil Asrori` (`750d8ac4-24c6-481d-9cb3-a6cb1f91369f`)
  karena kedua siswa ini sedang berada di Theme C dan membuka 2A karena bingung pesan error kemarin.
- Biarkan sesi `2C2-WORDS-TASK` milik Sari Hikmah dan Lalu Yuda untuk di-resume secara normal.

### 3. Peningkatan Panduan Visual Dashboard untuk Siswa yang Melompati Topik
- Ketika siswa memiliki riwayat percobaan di C3 tetapi C2 belum 7/7:
  - Dashboard sudah menampilkan: `🔒 Locked — Needs Topic C2 (X/7 passes — Y more needed)`
  - Tombol *"Up Next"* di bagian atas dasbor siswa secara otomatis mengarahkan ke task aktif mereka yang sebenarnya (misal C2), sehingga mereka tidak perlu bingung memilih tombol mana yang harus diklik.

---

## Rencana Verifikasi (Verification Plan)

### Automated Tests
1. **Simulasi Kelayakan Seluruh 18 Siswa:**
   Jalankan script verifikasi `startTest` untuk seluruh 18 siswa:
   - Pastikan Farobi, Cinta Laura, Alifurrahman, Adinda, dan Ariwil diizinkan mengakses task Theme C tanpa error 403.
   - Pastikan linear topic gating tetap berfungsi (C2 terkunci jika C1 belum 7/7, C3 terkunci jika C2 belum 7/7).
2. **Syntax Validation Suite:**
   - Jalankan `node scripts/check_all_js_syntax.cjs` (45/45 JS files pass).
   - Jalankan `npm test` (SW manifest, exam parity, homophones engine 100% pass).

### Manual Verification
1. Login sebagai `Mr. Muhammad Afyani Farobi`:
   - Tombol dashboard atas langsung mengarah ke `2C1-WORDS-TASK` dengan badge pass `6`.
   - Mengklik tombol langsung membuka halaman tes tanpa mental atau error 403.
2. Login sebagai `Miss Cinta Laura`:
   - Tombol dashboard langsung mengarah ke `2C2-WORDS-TASK` dengan badge pass `2`.
   - Mengklik tombol langsung membuka halaman tes tanpa mental.
3. Login sebagai `Mr. Muhamad Alifurrahman`:
   - Tombol dashboard langsung mengarah ke `2C1-WORDS-TASK` dengan badge pass `2`.

---

## Konfirmasi Pengguna Diperlukan
> [!IMPORTANT]
> Mohon konfirmasi apakah ambang batas kelulusan ujian Theme B untuk membuka Theme C disepakati mengikuti nilai resmi database **60% (Grade C)**. Setelah konfirmasi diberikan, perbaikan pada Edge Function dan API client akan segera dieksekusi dan diverifikasi end-to-end.
