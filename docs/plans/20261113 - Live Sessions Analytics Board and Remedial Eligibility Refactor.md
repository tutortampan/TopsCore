# 20261113 - Live Sessions Analytics Board and Remedial Eligibility Refactor

## Goal Description
Overhaul the **Live Test Sessions Controller** (`js/admin/tests-access.js`) based on direct user requirements across three critical dimensions:
1. **Zero-Overflow Session Card (225px) & Standard 12px Font with Strict 10px Gap**:
   - Card height calibrated to **225px** (`height: 225px !important; min-height: 225px; max-height: 225px; padding: 12px 14px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden;`), ensuring all panels (header, exam title, metadata box, buttons row, and standby status) are 100% accommodated with **zero pixel overflow**.
   - Strict adherence to the **Universal 10px Container Gap Invariant** between cards, buttons, boxes, and lower tables (`gap: 10px !important; margin-bottom: 10px !important;`).
   - Header & metadata font strictly standardized at **12px** (`font-size: 12px;`):
     - Line 1: Theme Code and Theme Name formatted directly together: `A - PUBLIC SPEAKING` (with readiness counter `👥 15/16 Ready (94%)` on the right).
     - Line 2: Associated Exam Title: `Words Exam & Phrases Exam`.
     - Line 3: Standard 12px metadata box:
       - Default Duration: `⏱️ 38 mins` <small>(Auto: 25 Qs × 1.5m)</small>
       - Question Count: `Words: 15, Phrases: 10` <small>(Total: 25)</small>
2. **Eligibility Engine Refactor (Normal vs Remedi vs Passed Retake)**:
   - **`NORMAL`**: Scoped **STRICTLY** to students who have **NOT taken the exam yet** (0 submitted attempts on this theme's exam) but have completed prerequisite quizzes ($\ge 60\%$).
   - **`REMEDI`**: Scoped **STRICTLY** to students who **HAVE taken the exam and scored below passing** ($< 60\%$).
   - **`PASSED (RETAKE)`**: Students who scored $\ge 60\%$ are excluded from the main Normal and Remedial counts, because they already have 24/7 self-paced retake unlocked in their student portal (`js/dashboard.js`).
3. **Strict Zero-Capsule 5-Column Table with Electric Blue Typography ("TARGET | MISTAKE | COUNT | RATE | MISTAKE TYPE")**:
   - Replace the static 16-row readiness matrix with a simple, high-visibility 5-column analytics table under each theme card.
   - Enforce 100% adherence to user direction and TopsCore Table Invariants:
     - **ELECTRIC BLUE FOR MISTAKE & MISTAKE TYPE**: Kolom `MISTAKE` dan `MISTAKE TYPE` menggunakan warna **Biru Elektrik (`#38bdf8`)** agar teks tabel tetap tenang, profesional, dan menghindari kelelahan mata akibat overpopulasi warna merah/kuning/hijau pada teks biasa.
     - **RED RESERVED FOR CRITICAL METRICS**: Warna merah Grade E (`#FF0000`) dikhususkan hanya untuk kolom metrik persentase kegagalan (`RATE`).
     - **NO QUOTES ON MISTAKE**: Kolom `MISTAKE` bersih tanpa tanda petik (`gorgious`, `pukul karung`, bukan `"gorgious"`).
     - **ZERO INNER CAPSULES**: Dilarang keras menggunakan capsule pill badge, border box, atau background pill di dalam sel tabel. Seluruh sel dirender sebagai *flat text* murni dengan Excel gridlines.
     - **Font Standar Tabel 11px**: `--tr-font-table: 11px !important;` dengan `white-space: nowrap !important;`.
     - **Single-Responsibility Columns (1 Info = 1 Column)**:
       1. `TARGET`: Kata/frasa target (flat white `#ffffff`, `font-size: 11px;`, medium 500).
       2. `MISTAKE`: Jawaban salah siswa (flat electric blue `#38bdf8`, no quotes).
       3. `COUNT`: Frekuensi kesalahan (flat white tabular number, contoh: `11`).
       4. `RATE`: Persentase kesalahan (flat tabular percentage merah Grade E, contoh: `78%`).
       5. `MISTAKE TYPE`: Jenis miskonsepsi (flat electric blue `#38bdf8`: `Spelling`, `Literal`, `Word Form`, `Vocab Gap` tanpa kapsul).

---

## Architectural Confirmation: "Apakah Itu Ada dalam Sistem?"
> [!NOTE]
> **Jawaban untuk Pertanyaan User Mengenai Retake Mandiri & Remedi Siswa:**
> **YA, logika tersebut SUDAH SEPENUHNYA ADA DAN BERJALAN di sistem siswa (`js/dashboard.js` baris 2505–2530):**
> 1. **Siswa Lulus ($\ge 60\%$)**: Variabel `isEligibleForSelfPacedExam` bernilai `true`. Tombol ujian di portal siswa berubah menjadi `🔁 Retake` / `⚡ Retake Exam` dan dapat dikerjakan secara mandiri 24/7 tanpa perlu menunggu tutor membuka sesi live.
> 2. **Siswa Belum Lulus ($< 60\%$)**: Akses mandiri diblokir, tombol berubah menjadi `🔒 Locked`. Siswa **hanya bisa ujian kembali jika tutor membuka sesi live bertipe Remedial (`isSessionUnlocked`)**.
> 3. **Masalah di Controller Tutor Sebelumnya**: Controller tutor di `tests-access.js` sebelumnya salah menghitung:
>    - Tombol `NORMAL` ikut menghitung siswa yang sudah lulus.
>    - Tombol `REMEDI` ikut menghitung siswa yang *belum pernah ujian sama sekali* jika kuisnya lengkap. Hal ini menyebabkan angka siswa terduplikasi (misal: 15 siswa muncul di Normal sekaligus Remedi seperti terlihat pada Gambar 2).
> 
> Dengan refactor ini, controller tutor akan 100% selaras dengan arsitektur portal siswa!

---

## Visual Planning & Pre-Flight Verification

### 1. Baseline Visual Snapshot (CURRENT STATE / BEFORE)
The user provided 3 authoritative screenshots showing the current state:

````carousel
![Current Theme A Card](/C:/Users/Top/.gemini/antigravity/brain/e109f303-e1a5-4e34-b57b-3d40f829c347/user_card_a_before.png)
<!-- slide -->
![Current Theme C Card (Duplicated Normal/Remedi 15)](/C:/Users/Top/.gemini/antigravity/brain/e109f303-e1a5-4e34-b57b-3d40f829c347/user_card_c_before.png)
<!-- slide -->
![Current Readiness Matrix to Replace](/C:/Users/Top/.gemini/antigravity/brain/e109f303-e1a5-4e34-b57b-3d40f829c347/user_matrix_before_to_replace.png)
````

---

### 2. Proposed Visual Mockup (AFTER — 225px Zero-Overflow Card & Electric Blue Columns)
Interactive generative mockup demonstrating the 225px zero-overflow card, standard 12px header/metadata font, strict 10px gap between containers, distinct Normal vs Remedial button scoping, and the 5-Column Zero-Capsule Table with Electric Blue typography (`TARGET | MISTAKE | COUNT | RATE | MISTAKE TYPE`):

![Electric Blue Columns and Zero Overflow Mockup](/C:/Users/Top/.gemini/antigravity/brain/e109f303-e1a5-4e34-b57b-3d40f829c347/before_after_analytics_overhaul.png)

> [!TIP]
> File interaktif HTML lengkap tersedia di: [`before_after_analytics_overhaul.html`](file:///C:/Users/Top/.gemini/antigravity/brain/e109f303-e1a5-4e34-b57b-3d40f829c347/before_after_analytics_overhaul.html).

---

### 3. Mandatory 4-Column Before & After Comparative Matrix

| Komponen / Properti | 🔴 Kondisi Saat Ini (BEFORE) | 🟢 Target Perubahan (AFTER) | Dasar Aturan / Alasan |
| :--- | :--- | :--- | :--- |
| **Card Height & Overflow** | Elemen tombol keluar kotak pada 200px. | **Tinggi 225px (Zero Overflow)**: Semua panel (header, exam title, metadata, buttons, standby) tertampung 100%. | Instruksi user: "tambah ukuran kotak kartunya agar bisa menampung semua panel". |
| **Card Spacing & Container Gap** | Gap acak (14px, 24px) pada card dan grid. | **Strict 10px Container Gap** (`gap: 10px !important; margin-bottom: 10px !important;`). | Rule 3 UI Invariants: "Universal 10px Container Gap Invariant". |
| **Card Font Standard** | Sub-11px (`0.70rem` / 9.8px) pada subtitle dan durasi. | **Font standar header 12px** (`font-size: 12px; font-weight: 600/700;`). | Permintaan user: "Font yang dipakai adalah standar header yaitu 12". |
| **Card Header Structure** | Badge `THEME A` terpisah dari judul tema (`PUBLIC SPEAKING`). | Format langsung: `A - PUBLIC SPEAKING` dalam satu baris header terpadu. | Permintaan user: "taruh saja kode Tema dan nama Tema (ex: A - PUBLIC SPEAKING)". |
| **Tombol Normal & Remedi** | Siswa yang belum ujian dihitung di Normal AND Remedi (`Normal: 15, Remedi: 15`). | **`NORMAL`**: Siswa yang belum pernah ujian (0 attempt) & kuis lengkap.<br>**`REMEDI`**: Siswa yang sudah ujian dan skor $< 60\%$.<br>Siswa $\ge 60\%$ retake mandiri di student portal. | Menghilangkan duplikasi data dan menyelaraskan dengan aturan bisnis TopsCore (`js/dashboard.js`). |
| **Tabel Bagian Bawah Header** | Header matriks lama mencampur kolom Quizzes & Exam untuk 16 siswa. | **5 Kolom Terpisah**: `TARGET \| MISTAKE \| COUNT \| RATE \| MISTAKE TYPE`. | Permintaan user: "header isinya TARGET \| MISTAKE \| COUNT \| RATE \| MISTAKE TYPE". |
| **Warna Kolom MISTAKE & TYPE** | Menggunakan warna merah dan aneka warna pastel acak. | **Biru Elektrik (`#38bdf8`)**: Teks MISTAKE dan MISTAKE TYPE menggunakan biru elektrik yang tenang dan fokus. | Permintaan user: "untuk kolom mistake dan mistake type, pakai biru elektrik saja, warna merah kuning hijau jangan sering dipakai untuk penulisan huruf2". |
| **Kolom MISTAKE (No Quotes)** | Memakai tanda petik (`"gorgious"`). | **Tanpa tanda petik**: `gorgious`, `pukul karung`, `unbelieving`. | Permintaan user: "di kolom mistake, tidak perlu tambahkan tanda petik disnaa". |
| **Zero-Capsule Invariant** | Ada kapsul badge warna-warni pada tabel analitik sebelumnya. | **ZERO INNER CAPSULE**: Dilarang menggunakan kapsul pill badge di dalam sel tabel. Seluruh sel berupa flat text murni dengan Excel gridlines. | Rule 2, 4, 8 UI Invariants: "Zero table cells, numbers, scores, counts, or statuses may render inside capsule badges". |
| **Table Typography & Sizing** | Sebagian elemen menggunakan font sub-11px (`0.70rem`, `0.75rem`). | Seluruh sel tabel strictly `11px` (`--tr-font-table: 11px !important;`) dengan `white-space: nowrap !important;`. | Rule 2.20 & Rule 14 UI Invariants (Zero Sub-11px Invariant). |

---

### 4. Visual Pre-Flight Verification Checklist
- [x] **Current State Screenshot (Before)**: Embedded baseline visuals (`user_card_a_before.png`, `user_card_c_before.png`, `user_matrix_before_to_replace.png`).
- [x] **Proposed Visual Mockup (After)**: Embedded high-fidelity visual mockup (`before_after_analytics_overhaul.png`).
- [x] **Zero Outer Page Scroll**: Verified root `100vh` lock with `calc(100vh - 60px)` console sizing.
- [x] **Zero Card Overflow**: Verified 225px height accommodates all panels with zero element overflow.
- [x] **Strict 10px Container Gap**: Verified exact 10px gap between all cards, tables, panels, and toolbars.
- [x] **Electric Blue Column Typography**: Verified Mistake and Mistake Type render in Electric Blue (`#38bdf8`).
- [x] **Zero Capsule Invariant**: Verified zero capsules/pills inside table cells; pure flat text with crisp Excel gridlines.
- [x] **No Quotes on Mistake**: Verified column Mistake renders raw text without quotes.
- [x] **Dynamic Columns & Nowrap**: Verified `white-space: nowrap !important;` on table cells with zero clipped text.
- [x] **Language Standard**: Verified all headers, labels, and status badges use 100% direct English.

---

## User Review Required
> [!IMPORTANT]
> 1. **Penerapan Biru Elektrik pada Kolom Teks**:
>    - Kolom `MISTAKE` dan `MISTAKE TYPE` menggunakan warna **Biru Elektrik (`#38bdf8`)**.
>    - Warna merah Grade E (`#FF0000`) hanya diterapkan pada metrik persentase kegagalan (`RATE`), sehingga mata tutor tidak cepat lelah saat membaca barisan kata di tabel.
> 2. **Ketinggian 225px**:
>    - Kotak kartu sesi memiliki ketinggian 225px yang menampung seluruh grup panel dengan zero overflow.

---

## Proposed Changes

### Component: Admin Controller (`js/admin/tests-access.js`)

#### [MODIFY] `js/admin/tests-access.js`
1. **Refactor `evaluateStudentsEligibility`**:
   - Isolasi ketat:
     - `NORMAL`: `!hasAttempted && prereqMet`
     - `REMEDI`: `hasAttempted && isFailed && prereqMet`
     - `PASSED`: `hasAttempted && isPassed`
2. **Refactor `renderThemeCard` (225px Height, Zero Overflow, 12px Font & 10px Gap)**:
   - Terapkan styling kartu:
     `height: 225px !important; min-height: 225px !important; max-height: 225px !important; padding: 12px 14px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; gap: 10px !important;`
   - Header baris 1: `A - ${escapeHtml(name)}`
   - Header baris 2: Judul exam (`Words Exam & Phrases Exam`)
   - Box spesifikasi: durasi dinamis & rincian soal berfont standar `12px`
   - Tombol Normal/Remedi dan Standby dengan gap `10px`
3. **Strict Zero-Capsule 5-Column Table with Electric Blue Typography (`renderThemeExamAnalyticsBoard`)**:
   - Merender tabel dengan 5 kolom terpisah:
     `TARGET` | `MISTAKE` | `COUNT` | `RATE` | `MISTAKE TYPE`
   - Mematuhi aturan Zero-Capsule, No Quotes, dan Electric Blue:
     - `TARGET`: `<td class="td-target">${escapeHtml(q.text)}</td>` (White)
     - `MISTAKE`: `<td class="td-mistake" style="color:#38bdf8;">${escapeHtml(q.commonWrong || '—')}</td>` (Electric Blue, no quotes)
     - `COUNT`: `<td class="td-count" style="text-align:center;">${q.fail}</td>` (White)
     - `RATE`: `<td class="td-rate" style="color:var(--grade-e, #FF0000); text-align:center;">${q.failRate}%</td>` (Grade E Red)
     - `MISTAKE TYPE`: `<td class="td-type" style="color:#38bdf8;">${escapeHtml(q.dominantErrorLabel || 'Spelling')}</td>` (Electric Blue)
   - Zero capsule pills, zero inner borders, 100% flat text dengan Excel cell gridlines.
4. **Cache Buster Update**:
   - Bump impor di `js/admin/app.js` menjadi `tests-access.js?v=20261113_v447`.

---

## Verification Plan

### Automated Tests
1. **Verification Test Script (`scripts/verify_live_sessions_analytics_and_eligibility.cjs`)**:
   - **Assertion 1**: `renderThemeCard` mengunci tinggi kartu `225px` dan gap tepat `10px`.
   - **Assertion 2**: Format header baris 1 adalah `A - ${name}` dan font metadata `12px`.
   - **Assertion 3**: Logika `evaluateStudentsEligibility` memisahkan Normal (0 attempt), Remedi (<60%), dan Lulus (>=60%).
   - **Assertion 4**: Tabel analitik memiliki 5 kolom: `TARGET`, `MISTAKE`, `COUNT`, `RATE`, `MISTAKE TYPE`.
   - **Assertion 5**: Kolom MISTAKE dan MISTAKE TYPE menggunakan warna Biru Elektrik (`#38bdf8`) tanpa tanda petik.
   - **Assertion 6**: Zero capsule badges / zero pills di dalam sel tabel analitik (flat text only).
   - **Assertion 7**: `node --check` syntax validation pada `js/admin/tests-access.js` dan `js/admin/app.js`.

### Master Regression Testing
- `node scripts/test_viewport_lock_and_table_normalization.mjs` (100% viewport lock & table normalization).
- `node scripts/test_universal_color_token_ssot.mjs` (100% color token SSOT integrity).

---

## Step-by-Step Execution Sequence (Upon User Approval)
1. **Step Zero**: Segera buat dan pin `tasks.md` di tab tengah editor.
2. **Phase 1**: Update `evaluateStudentsEligibility` di `js/admin/tests-access.js`.
3. **Phase 2**: Redesain `renderThemeCard` (tinggi 225px zero-overflow, gap 10px, header format `A - ${name}`, font 12px).
4. **Phase 3**: Implementasikan tabel analitik 5 kolom flat text (`TARGET | MISTAKE | COUNT | RATE | MISTAKE TYPE`) dengan teks Biru Elektrik tanpa kapsul dan tanpa tanda petik.
5. **Phase 4**: Bump cache buster di `js/admin/app.js`.
6. **Phase 5**: Jalankan automated verification suite dan master regression tests hingga 100% PASS.
7. **Phase 6**: Update `docs/CURRENT_STATE.md` dan `docs/CHANGELOG.md`.
