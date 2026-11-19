# CURRENT STATE — TOPSCORE LMS

> **Purpose:** Single authoritative restart point across sessions and restarts.
> **Last Updated:** 2026-11-19 19:55 UTC+8
> **Current Phase:** Phase 634 [COMPLETE] — Standardized 80px Bottom Banner Invariant & Result Page Revamp
> **Status:** READY FOR USER CONFIRMATION & REVIEW (ALL TEST SUITES 100% GREEN)

---

## 1. Active System Architecture & Invariants

- **Standardized 80px Bottom Banner Invariant & Result Page Revamp (Phase 634 — SSOT §2.28, §2.32, ui-invariants.md §1.1, §1.8)**:
  - **Standardized 80px Bottom Banner (`#bottom-ad-banner` / `.topscore-locked-banner`)**:
    - **Strict 80px Height Lock**: Bottom banner locked to strictly **`80px`** across all application views (`height: 80px !important; min-height: 80px !important; max-height: 80px !important; box-sizing: border-box !important;`).
    - **Dual-Viewport Execution**:
      * On Student Realm (mobile corridor 430px), banner sits docked at the bottom and centered (`max-width: 430px !important; margin: 0 auto !important; position: fixed !important;`).
      * On Admin Desktop Realm (100vh workstation), `#admin-console` deducts exactly 80px (`height: calc(100vh - 80px) !important; max-height: calc(100vh - 80px) !important;`) ensuring zero outer page scroll.
    - **Clearance & Padding**: Scrollable pages allocate `body { padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px)) !important; }`. Zero-scroll pages (`result.html`, `test.html`) maintain an exact 10px vertical gap between the lowest action button (`#back-dashboard-btn`) and the bottom banner.
    - **Codification & Tooling**: Formally codified in `AGENTS.md` §2.32, `.agents/rules/ui-invariants.md` §1.1 & §1.8, `.agents/skills/ui-spatial-checker/SKILL.md`, and test suites (`check_spatial_invariants.mjs`, `test_viewport_lock_and_table_normalization.mjs`, `test_bottom_banner_universal.mjs`).
  - **Result Page Revamp (`result.html`, `css/result.css`, `js/result.js`)**:
    - **Header Integration**: Test Title panel (`#result-Test-name-container`) moved into the top banner (`#result-page-header`), featuring 2-line title architecture (Line 1: 14px Outfit 800, Line 2: 12px Inter 700) with dynamic tier glow.
    - **Breakdown Ghost Button Removal**: Removed standalone `VIEW ANSWER BREAKDOWN` button (`#toggle-answers-btn`). Answer breakdown modal is triggered directly by clicking any metric row (`CORRECT`, `PARTIAL`, `INCORRECT`, `POINTS`).
    - **Standardized 50px Lower Panels**: All 4 lower panels locked to **`50px`** height (`#result-score-grade-card`, `#result-motivation-msg`, `#smart-next-action-container`, `#back-dashboard-btn`).
    - **Dual-Scale Typography Calibration**: Calibrated typography to strict scale (12px, 14px, 16px, 20px, 30px); eradicated arbitrary rem clamps and sub-12px text.
    - **Mobile Viewport Zero-Scroll**: Fits standard mobile viewports (390×800) with zero outer page scroll and full button visibility.

- **Unified Test Words & Phrases Independent Scoring & Pip Isolation (Phase 633 — SSOT §2.6, §2.9, §2.10, DECISION-034)**:
  - **Bug 1: Component Selector Modal Pip Dots Isolation**:
    - **Separate Pass Tracking**: In [js/dashboard.js](file:///d:/Tutor%20Tampan/TopsCore/js/dashboard.js) (`renderNextAssignmentHero`, `renderAssignedTests`, and `renderCompletedTestsBottom`), introduced `wordsPassCountByTest`, `phrasesPassCountByTest`, `wordsBestByTest`, and `phrasesBestByTest` for unified test shells (`category === 'unified'` / `test_subtype.startsWith('UNIFIED')`).
    - **Section Detection via Attempt Metadata**: Created `getAttemptSection` which inspects `total_questions` (40 vs 10 in tasks; 80% vs 20% in exams) and question scores to accurately attribute attempts to either Words or Phrases.
    - **Isolated Pip Display**: Completing a Words attempt now increments only `wordsPasses` (`wordsPassCountByTest`). `phrasesPasses` remains at 0 until Phrases is practiced. The Phrases card pips in `#component-selector-modal` remain unlit (0/7) instead of falsely mirroring the Words count.
    - **In-Test Modal Pip Population**: In [js/test.js](file:///d:/Tutor%20Tampan/TopsCore/js/test.js), dynamically populated `#component-words-pips` and `#component-phrases-pips` from past student attempts so that opening the modal directly inside `test.html` also displays strictly isolated pip counts.
  - **Bug 2: Server-Authoritative & Client Fallback Scoring Denominator Fix**:
    - **Section-Aware Denominator in Edge Function**: In [supabase/functions/submit-test/index.ts](file:///d:/Tutor%20Tampan/TopsCore/supabase/functions/submit-test/index.ts), identified `isPartialSubmit` when student submits only Words (40 rows) or Phrases (10 rows). Scored rows and denominator are now strictly bounded to the submitted rows (`totalQuestions = scoredRows.length`), avoiding penalizing unanswered questions from other sections. Non-submitted rows are skipped from DB update to prevent overwriting.
    - **Client Fallback & Tolerance Sync Hardening**: In [js/api.js](file:///d:/Tutor%20Tampan/TopsCore/js/api.js), updated client fallback evaluation and Post-submit Answer Tolerance & Spelling Sync to use the exact same section-aware denominator. If a student gets 40/40 words correct, score is recorded as 40/40 (100% / Grade ★) and `total_questions: 40`, rather than being divided by 50 (80%).
    - **`fetchAllStudentAttempts` Query Sync**: Added `total_questions, correct_count` to the `.select(...)` queries in `fetchAllStudentAttempts` in [js/api.js](file:///d:/Tutor%20Tampan/TopsCore/js/api.js) so all dashboard views have authoritative access to section bounds.
  - **Result Page Section-Aware Filtering**:
    - In [js/result.js](file:///d:/Tutor%20Tampan/TopsCore/js/result.js), if the attempt was a section submission of a unified test, `answers` is filtered to only include rows from the active section.
    - Correct, partial, and wrong stats, accuracy bar percentages, and the answer breakdown review table only evaluate and display questions belonging to the submitted section. Unanswered phrases are no longer counted as wrong answers.
    - Updated result page header title row to display section tags (`TASK A1 (WORDS)` or `TASK A1 (PHRASES)`).

- **Level 0 Theme Manager Support & Uniform Level-Prefixed Test Code (Phase 632 — SSOT §2.4.2, §2.6, DECISION-061)**:
  - **Frontend Permissibility for Level 0 (`min="0"`)**:
    - Updated [js/admin/vocab-vault.js](file:///d:/Tutor%20Tampan/TopsCore/js/admin/vocab-vault.js) to accept `0` (`newLvl < 0 || newLvl > 6` and `parsedLvl < 0 || parsedLvl > 6`), allowing admin to set themes and words to Level 0 (Non-Level `—`) directly from the table.
    - Updated toast alert to `'Level must be between 0 and 6 (0 for Non-Level).'`.
  - **Theme Level Cascade (`updateVaultThemeLevelCascade`)**:
    - Created and exported `updateVaultThemeLevelCascade(themeCode, oldLevel, newLevel)` in [js/api.js](file:///d:/Tutor%20Tampan/TopsCore/js/api.js) with strict null-checks (`targetLevel !== null && targetLevel !== undefined`).
    - Moving a theme's level in Theme Manager now moves all words in `vocabulary_vault` and simultaneously cascades `theme_program_assignments.target_level`.
    - Synchronizes all DOM rows for that theme, updating the level label to `—` (slate neutral `#94a3b8`) and recalculating the composite `CODE` column across the workstation.
  - **Uniform Level-Prefixed Test Code (`0G1`, `0G2`, `0A1`)**:
    - Aligned with user directive: in Level 0, codes now feature the level number `0` in front for 100% cross-level uniformity (`0...`, `1...`, `2...`, `3...`).
    - Column `CODE` in Theme Manager, Test Blueprint, and Vault tables uniformly displays `${lvl}${cleanThemeCode}${cleanTopicCode}` (producing `0G1`, `0G2`, `0A1` for Level 0).
    - In `upsertDynamicTestShell`, Level 0 test shells and titles use the `0` prefix:
      * Evnikom (Theme A): `EVN-VCB-0A1-TASK` (`Evnikom Vocabulary Task 0A1 - Time Name`), `EVN-VCB-0A2-TASK` (`Evnikom Vocabulary Task 0A2 - Family Member`), `EVN-VCB-0A-EXAM` (`Evnikom Vocabulary Exam 0A - General`).
      * Sheraton (Theme A): `SHR-VCB-0A1-TASK` (`Sheraton Vocabulary Task 0A1 - Pre-Test`), `SHR-VCB-0A-EXAM` (`Sheraton Vocabulary Exam 0A - Hospitality`).
    - Updated `findTaskForTopic` and `findExamForTheme` to match both prefixed (`0A1`, `0G1`) and bare (`A1`, `G1`) test codes for robust backwards-compatibility.
  - **Evnikom & Sheraton Live Data Migration in Supabase**:
    - Evnikom theme updated to Theme `A` (`Time Name` & `Family Member`, 90 items) at `target_level = 0`.
    - Synced `theme_program_assignments` for Theme `A` to `target_level = 0` for Evnikom (`EEC`).
    - Updated `tests` database records for Evnikom to Theme `A`: `EVN-VCB-0A1-TASK` (40 questions, 15m), `EVN-VCB-0A2-TASK` (50 questions, 15m), and `EVN-VCB-0A-EXAM` (90 questions, 30m) with full dynamic question generation verification.
    - Updated `tests` database records for Sheraton: `SHR-VCB-0A1-TASK` (50 questions, 15m) and `SHR-VCB-0A-EXAM` (50 questions, 13m).

- **Level 0 Non-Level Program Architecture & Dynamic Vault Tests Calibration (Phase 631 — SSOT §2.4.2, §2.5.1, §2.6, ui-invariants.md §1.1)**:
  - **Eradication of Level 0 Falsy Coercion Across Entire Stack**:
    - Fixed `parseInt(level) || 1` and `if (level)` falsy pitfalls across [js/api.js](file:///d:/Tutor%20Tampan/TopsCore/js/api.js) (import sanitization, dynamic test shell generation, curriculum syncing, and question sampling) and [js/admin/vocab-vault.js](file:///d:/Tutor%20Tampan/TopsCore/js/admin/vocab-vault.js) (Theme Manager and Blueprint grouping and filters).
    - Preserved `target_level = 0` as integer `0` throughout the pipeline without accidental conversion to Level 1 or 3.
  - **Class Tests Workstation Table Level 0 Fix ([js/admin/app.js](file:///d:/Tutor%20Tampan/TopsCore/js/admin/app.js) & [js/admin/classes-management.js](file:///d:/Tutor%20Tampan/TopsCore/js/admin/classes-management.js))**:
    - Fixed `const lvlNum = lvlObj?.level_number || 1` in `js/admin/app.js` which caused Level 0 classes to evaluate `0 || 1` into `1`, displaying `1st` instead of `—` and routing `vaultCountFor(r, 1)` to count words from Level 1 instead of Level 0 (causing the 11 and 21 question discrepancy for Sheraton).
    - With `lvlNum = lvlObj?.level_number != null ? lvlObj.level_number : 0`, Level 0 now correctly evaluates to Level `0`, displaying `—` per SSOT Rule 2.4.2, and invoking `vaultCountFor(r, 0)` which accurately projects all 50 vault words (`50 (Vault)`) for both Task A1 and Exam A.
  - **Dynamic Shell Question Count & Duration Calibration for Level 0**:
    - Calibrated `upsertDynamicTestShell` and `autoGenerateTestsHierarchy` in `js/api.js`: for Level 0 programs, exams calibrate question bounds to the actual available theme words (50) instead of the hardcoded 200 questions designed for 4-topic multi-week levels.
    - Calibrated working duration to match the 50-word volume (13-15 min) rather than 54 min for 200 questions.
    - Database test records for `SHR-VCB-A1-TASK` and `SHR-VCB-A-EXAM` updated and verified in Supabase.

- **Organization Hub Unified Datagrid Table & Sub Panel Edit Mode (Phase 630 — SSOT §0.3, §1.3, §2.4, §2.22, ui-invariants.md §1.1, §4.1, DECISION-060)**:
  - **Sheraton SH-26 Activation & Period Extension**:
    - Batch `SH-26` (`id = '67108e07-e262-4707-b07e-970627061b54'`) resmi diaktifkan di database Supabase: `is_active: true`, `actual_final_date = '2026-12-30'`.
    - Status periodik batch kini berstatus `Ongoing` (green) dan batch langsung muncul di sidebar navigasi `B — BOARD` sebagai `Sheraton SH-26` dengan 14 siswa aktif.
  - **Transformasi Akordeon ke Desktop Workstation Datagrid Table**:
    - Seluruh tampilan akordeon bertingkat pada halaman Organization Hub (`admin.html#organization`) telah dirombak menjadi satu tabel datagrid terpadu (`table.datagrid-table` di dalam `.table-wrap.sticky-first`), terkunci single-screen 100vh lock tanpa outer page scroll.
    - Geometri 13 kolom presisi terkalibrasi sempurna: `NO (36px) | PROGRAM (135px) | BATCH NAME (110px) | CLASS (150px) | LEVEL (55px) | STUDENTS (65px) | START (95px) | FINISH (95px) | DURATION (100px) | REMAINING (90px) | STATUS (85px) | ACTIVE (70px) | ACTIONS (84px)`.
    - Seluruh kolom interaktif dapat diurutkan (sorting) dengan indikator aktif `▲` / `▼` Tactical Blue (`#38bdf8`) per Rule 2.38 Pillar 6.
  - **Sub Panel 40px & Master Edit Mode Integration**:
    - Mengintegrasikan Sub Panel standar 40px (`#admin-bottom-infobar`) dengan metrik langsung di sisi kiri (`3 Batches · 2 ACTIVE · 1 INACTIVE · 2 Programs · 17 Enrolled Students`) dan kontrol 30px di sisi kanan (`Edit Mode`, `+ Add Batch`, `+ Add Program`).
    - Tombol `Edit Mode` menerapkan Ghost-to-Solid-Glow Invariant (§3.4): Ghost Cyan saat inaktif, Solid Cyan `#0284c7` + neon glow saat aktif.
    - Dalam Master Edit Mode (`body.global-edit-mode-on`), seluruh sel tabel dapat diedit langsung (inline editing) dengan garis kisi Excel putih:
      - **Ganti Nama Isi Tabel**: Mengubah nama Batch (`batches.name`), nama Program (`programs.name`), dan nama Kelas (`classes.name`) secara inline.
      - **Mengubah Status Kelas & Batch**: Dropdown status kelas (`Active` / `Inactive`) di kolom Class, dropdown/toggle status batch di kolom Active, serta pemilih tanggal Start dan Finish.
      - Seluruh mutasi tersimpan seketika via `adminUpdate` ke Supabase dengan notifikasi toast dan auto-reload sidebar B - BOARD & C - CLASS.

- **Scope Boundary Enforcement for 7x7 Task Mastery (Phase 629 — SSOT §0.3, §2.9, §2.10, ui-invariants.md §5.1)**:
  - **Camp 2nd Vocabulary (`CMP-2VOCAB`) Scope Lockdown**: Membatasi secara ketat injeksi data riwayat 7x7 attempt repetisi HANYA untuk kelas **Camp 2nd Vocabulary** (`CMP-2VOCAB`) sesuai instruksi eksplisit pengguna.
  - **Pembersihan Total Attempt Non-2nd-Vocab**:
    - Seluruh 6.241 record attempt hasil generasi skrip sebelumnya pada kelas selain 2nd Vocabulary (`CMP-3VOCAB`, `CMP-1VOCAB`, `EVN-VOCAB`, dsb.) telah dihapus tuntas dari tabel `attempts`.
    - Menghapus 5 record attempt 3rd Vocabulary milik akun simulasi `Mr. Asik` (`CMP-3VCB-A1-TASK` s/d `A4-TASK` dan `CMP-3VCB-A-EXAM`), serta mengembalikan profil Asik ke `Level 3` (`program_status = 'ACTIVE'`) dengan 0 attempt di 3rd Vocabulary.
    - Memastikan saat siswa/Asik masuk ke `Camp 3rd Vocabulary`, `Completed Tests` bernilai 0 dan banner `All tests in this class completed!` tidak muncul.
  - **7x7 Attempt Seeding pada Camp 2nd Vocabulary**:
    - Seluruh siswa pada kelas Camp 2nd Vocabulary (termasuk Mr. Abdul Qoyyim Hanif Dahuri pada Batch 134) memiliki 7 attempt penuh pada setiap task yang telah dipublikasikan (Task C1, C2, C3, C4, D1, D2, D3, D4).
    - Kotak indikator 7 riwayat nilai tertinggi (`.task-mini-grade`) pada sub-row Task di tabel Completed Tests terisi rapi sesuai formula Top-7 7x7 repetitive mastery tanpa ada strip kosong `—`.

- **Completed Tests Top-7 Task Attempts & Zero Table Glow (Phase 628 — SSOT §2.9, §2.10, §2.31, ui-invariants.md §4.9, §5.1)**:
  - **Restoration of Top-7 Task Attempt Score Chips**: Untuk seluruh entri Task (`!isEx`) pada tabel Completed Tests di Student Dashboard (`dashboard.html`), sub-row 7 kotak kecil (pips) nilai riwayat percobaan terbaik (`.task-grades-subrow` dengan 7 item `.task-mini-grade`) berhasil diaktifkan kembali. Masing-masing kotak menampilkan grade percobaan dengan background warna grade dan teks gelap (atau putih untuk Star), serta slot kosong ditandai tanda strip `—`. Nilai dan grade task pada baris tabel dihitung dari rata-rata Top 7 riwayat percobaan tersebut sesuai formula baku 7x7 repetitive mastery system.
  - **Zero Table Glow Invariant (Pembersihan Neon Glow Tabel)**:
    - Melenyapkan seluruh `box-shadow` tebal pada baris tabel (`box-shadow: none !important;`).
    - Menghapus garis ganda neon `border-top: 1.5px solid ${scoreColor}` pada baris tabel; baris Task menggunakan divider halus netral `border-bottom: 1px solid rgba(255, 255, 255, 0.05)`, sementara baris Exam menggunakan accent divider tipis `border-bottom: 1px solid rgba(${scoreRgb}, 0.35)`.
    - Mengganti latar gradien pekat `0.18` dengan gradien sangat lembut `0.08` pada baris Exam, dan `background: transparent` pada baris Task.
    - Menghilangkan `box-shadow` pada badge Grade (`.grade-circle`) dan tombol retry (`.completed-retry-btn`), serta menghapus efek silau `filter: brightness(1.2)` pada hover baris tabel di [css/dashboard.css](file:///d:/Tutor%20Tampan/TopsCore/css/dashboard.css).
  - **Class-Scoped Student Dashboard Architecture**:
    - Seluruh metrik utama di dashboard (Grade Card [GRADE, GRADE DESCRIPTION, RATE], Hero Card tier aura, My Rank / Standings, Completed Tests, dan Next Assignment Hero) merepresentasikan kelas yang sedang aktif dipilih (`window._selectedClassId`).
    - Tabel Completed Tests menampilkan seluruh tes yang telah diselesaikan pada kelas terpilih (baik formative Task maupun milestone Exam).
    - Class Lobby menampilkan kelas-kelas dari level sebelumnya yang telah dibuka (`cLvlNum < studentLevelNum`) dengan status Completed (100% ★) untuk keperluan review materi, dengan landing default otomatis memprioritaskan kelas level aktif saat ini.

- **Student Raport Card Modal Architecture (Phase 627 — SSOT §1.4, §2.3, §2.10)**:
  - **Full Name Integrated in Biodata Card (Row 1)**: Meniadakan pembungkus header nama terpisah di luar kartu; nama lengkap siswa kini menjadi Baris 1 di dalam tabel biodata kartu profil dengan font Outfit 18px 800.
  - **Course Data Below Address (Row 7 — Black Font & Clean Format)**: Metadata institusi, program, dan rombel dipindahkan ke dalam kartu di bawah Address sebagai `Course Data` tanpa karakter pemisah titik atau strip (e.g. `CEC Camp 134`) dengan warna font hitam (`#0f172a`, `font-weight: 700`).
  - **Dynamic 3:4 Photo Height Lock & Zero Bottom Overhang**: Mengubah tata letak foto kartu biodata menjadi flex container `align-items: flex-start` dengan `#raport-student-photo-box` yang tingginya disinkronisasikan secara presisi via JavaScript (`syncRaportPhotoHeight()`) agar 100% identik dengan tinggi blok teks biodata (dari batas atas `Full Name` hingga batas bawah `Course Data`), melenyapkan masalah foto menggantung melebihi baris teks terbawah dan mengunci rasio 3:4 secara dinamis.
  - **Simplified Dual CTA Buttons & Edit Deprecation**:
    - Menghapus total fungsi inline edit raport (`Edit Raport` dan `SAVE RAPORT CHANGES`), karena pengubahan data siswa dilakukan melalui workstation `Students Data`.
    - Area CTA modal (footer bawah) disederhanakan menjadi tepat 2 tombol: tombol kiri **`CLOSE`** dan tombol kanan **`Export to PDF`** (`#btn-export-pdf-dossier`).
    - Header atas hanya menyisakan tombol navigasi carousel (`← 1 of 12 →`) dan tombol cepat `CLOSE`.
  - **Dossier Structure**:
    - Judul Dokumen: `STUDENT RAPORT CARD` (32px Outfit 900, text-transform uppercase).
    - Baris Biodata Terstruktur (Label 135px + Titik Dua Rata): `Full Name`, `Gender`, `Date of Birth`, `Age` (`XX yo`), `Education`, `Address`, `Course Data`.
    - Tabel Nilai 6-Kolom: `LEVEL | CLASS NAME | POINT | RATE | GRADE | GRADE DESCRIPTION` (menghapus kolom `EXAM NAME`, menyajikan nilai kumulatif kelas dari ujian milestone resmi).

- **Non-Level Programs Architecture & Alumni Level X (Phase 626 — SSOT §1.4, §2.4.2, DECISION-058)**:
  - **Alumni Promoted to Level X**: Di database Supabase, entitas Alumni kini memiliki `level_number = 99` (Level X), name `'Alumni'`. Seluruh formatter (`toShortLevel`, `toOrdinalLevel`) merender Alumni sebagai simbol **`X`** dengan aksen ungu neon (`#c084fc` / `var(--quad-d)`). Ketergantungan Alumni pada angka 0 resmi dilenyapkan.
  - **Level 0 Khusus Program Tanpa Jenjang (Non-Level / Display `—`)**: Dibuat entitas Level 0 di database (`level_number = 0`, nama `'Non-Level'`). Seluruh program tanpa jenjang bertahap mereferensikan UUID ini. Pada seluruh tabel workstation (kolom `LVL`) dan dashboard, Level 0 dirender sebagai strip bersih **`—`** (slate netral `#94a3b8`). Meniadakan teks angka 0 di antarmuka.
  - **Overhaul Institusi TOP (Zero-Level Omission Invariant)**: Seluruh kelas, rombel, siswa, dan tes pada institusi TOP (Evnikom, Sheraton, Tamata Persada) telah dimigrasikan ke Level 0 (`level_id = 0e1c49fb-d8a8-4fd5-a239-a50466875c23`):
    - Kelas: `Evnikom Vocabulary` (`EVN-VOCAB`), `Sheraton Vocabulary` (`SHR-VOCAB`), `Tamata Vocabulary` (`TMT-VOCAB`). Segmen `1st` dan digit `1` ditiadakan (dianggap kosong).
    - Rombel: `SH-26`, `TP-26`, `EV-07` terkoneksi ke Level 0.
    - Siswa: 20/20 siswa di institusi TOP berelasi ke Level 0, dengan status `ACTIVE` dan kolom `LVL` menampilkan `—`.
    - Tes: `EVN-VCB-G1-TASK`, `EVN-VCB-G-EXAM`, `EVN-VCB-G2-TASK` diperbarui tanpa ordinal level.
  - **Promotion Gating Protection**: Siswa pada program Non-Level (Level 0) secara otomatis tidak menampilkan tombol `LEVEL UP` karena tidak memiliki level bertahap berikutnya.

- **Full Multi-Level Academic Journey Engine (Phase 625 — SSOT §1.4, §2.4, §2.5, §2.27)**:
  - **Repetitive Mastery & Sibling Task Gating Resolution**: Memperbaiki query gating `siblingTasks` pada `startTest` di [js/api.js](file:///d:/Tutor%20Tampan/TopsCore/js/api.js#L1558) agar hanya memfilter tugas berstatus `.eq('status', 'PUBLISHED')`, mencegah tugas bertaraf `DRAFT` memblokir akses siswa ke ujian tema.
  - **Vocabulary Vault Integrity Restoration**: Memulihkan 21 kosakata Level 1 Theme A di tabel `vocabulary_vault` yang sebelumnya berstatus soft-deleted (`deleted_at` terisi pada 2026-11-09), menjamin 100% dari 23 tes terpublikasi di Level 1, 2, dan 3 menghasilkan soal secara lengkap melalui `generateTestQuestions`.
  - **Authoritative Passing Threshold Realignment**: Menghilangkan angka liar `|| 70` pada gating mastery di [js/dashboard.js](file:///d:/Tutor%20Tampan/TopsCore/js/dashboard.js#L2510) dan menyelaraskannya ke batas kelulusan resmi TopsCore Grade C ($\ge 60\%$) sesuai AGENTS.md §2.4.1.
  - **Multi-Level Simulation Verified**: Berhasil mensimulasikan siswa Asik di rombel Batch 123 menyelesaikan 96 tes bertahap melewati 1st Level $\rightarrow$ 2nd Level $\rightarrow$ 3rd Level $\rightarrow$ Alumni, tervalidasi via E2E Playwright dengan 5 tangkapan layar antarmuka siswa.

- **Level Promotion Auto-Heal & Strict Level Isolation Engine (Phase 617 — SSOT §1.4, §2.4, §2.5, §2.27)**:
  - **Auto-Heal Target Level Classes**: `fetchStudentClasses()` di [js/api.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/api.js) secara otomatis mendeteksi dan mengaktifkan (`is_active = true`) kelas level tujuan jika siswa telah dipromosikan (misal ke Level 3) tetapi kelas di level tersebut belum diaktifkan di database.
  - **Eradication of Cross-Level Fallbacks**: Menghilangkan *unsafe fallback* ke level di bawahnya; siswa level 3 dijamin hanya mengakses kelas level 3 tanpa kebocoran kurikulum level lama.
  - **Batch & Class Promotion Automation**: Pada `promoteAllEligibleStudents` dan `promoteStudentNextLevel` di [js/admin/student-management.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/student-management.js), `batches.current_level_id` dan kelas-kelas program terkait otomatis disinkronkan saat aksi Level Up dieksekusi.
  - **Diagnostic Placement Test Support**: Menambahkan aksi `Add Placement` di Classes Management dan builder penjenjangan Tryout di Vocab Vault.

- **Student Dashboard Hero Profile & Unified 3-Pillar Performance Card Redesign (Phase 616 — SSOT §1.4, §2.3, §2.10, §2.28)**:
  - **Hero Identity Bar Replaced by Profile & Demographic Card**: Mengubah tata letak Hero Card (`#welcome-banner-section`) menjadi kartu profil identitas siswa ala dossier/profil ($110\text{px}$ height, strict 10px internal padding). Menampilkan foto profil resmi ($68 \times 88\text{px}$ rasio 3:4 dengan tier border & glow) di sebelah kiri, dan 4 baris data terstruktur di sebelah kanan:
    1. **Full Name with Title**: `#welcome-name` (`Miss Sari Hikmah` / `Mr. Top`) 16px Outfit 800.
    2. **Academic Hierarchy**: `#welcome-meta-wrapper` (`CEC • CAMP • Batch 131 • 3RD LEVEL`) 11px Inter 600 Tactical Blue.
    3. **Demographics**: `#hero-profile-demographics` (Gender e.g. `Female` • Usia e.g. `27 y.o.` • Tanggal Lahir e.g. `06 May 1997`) 11px Inter 400.
    4. **Address / Domicile**: `#hero-profile-address` (Desa, Kecamatan, Kota, Provinsi) 11px Inter 400 slate `#94a3b8`.
  - **Unified 3-Pillar Performance Card (`GRADE | GRADE DESCRIPTION | RATE`)**: Mengubah kartu deskripsi tunggal (`.dashboard-grade-legend`) menjadi kartu performa 3 kolom simetris ($54\text{px}$ height) dengan pembatas vertikal halus:
    - **Pillar 1 (`GRADE`)**: Label uppercase 10px Inter 600 + Nilai Grade (`#stat-overall-grade-value`, e.g. `B`, atau pure star SVG untuk Grade ★) 22px Outfit 900.
    - **Pillar 2 (`GRADE DESCRIPTION`)**: Label uppercase 10px Inter 600 + Kata Predikat (`#dashboard-achievement-text`, e.g. `GOOD` / `VERY GOOD` / `EXCELLENT` / `ENOUGH` / `LESS` / `FAIL`) 15px Outfit 800.
    - **Pillar 3 (`RATE`)**: Label uppercase 10px Inter 600 + Persentase Rata-rata (`#bottom-stat-avg-score`, e.g. `85%`) 22px Outfit 900.
  - **Square Progress Pips Invariant**: Ketujuh kotak repetisi progres (`.rainbow-box`) kini terkunci ke rasio bujur sangkar presisi ($22 \times 22\text{px}$, `aspect-ratio: 1 / 1`, `border-radius: 5px`, `gap: 4px`), melenyapkan bentuk pip pipih/gepeng horizontal.
  - **Zero Regression & Spatial Invariant**: Menghemat $36\text{px}$ ruang vertikal ($110\text{px} + 10\text{px} + 54\text{px} = 174\text{px}$ vs sebelumnya $210\text{px}$), memberikan ruang lebih lapang bagi leaderboard di bawahnya tanpa memicu scrollbar vertikal halaman (100% strict 100vh lock compliance).

- **Curriculum Class Action Direct Activation & Deactivation Controls (Phase 615 — SSOT §1.4, §2.27, §4.1)**:
  - **Tombol Langsung `Activate` & `Deactivate` di Kolom ACTIONS**: Menghapus ketergantungan aktivasi kelas dari toggle tersembunyi `edit-mode-only`.
  - **Aksi Kelas Inaktif**: Pada kelas berstatus `Inactive`, kolom ACTIONS langsung menampilkan tombol hijau Grade A **`Activate`** berikon SVG `check-circle`.
  - **Aksi Kelas Aktif**: Pada kelas berstatus `Active`, kolom ACTIONS menampilkan tombol sekunder **`Deactivate`** serta tombol **`Inspect`** untuk meninjau detail tes.
  - **Instant State & Sidebar Synchronization**: Mengklik `Activate` langsung memutasi database Supabase (`classes.is_active = true`), menyinkronkan status lokal di memori secara instan, memicu `loadSidebarClasses()` untuk menyegarkan menu `C — CLASS` di sidebar tanpa reload halaman, dan menampilkan notifikasi sukses.
  - **Status Pill Toggle Affordance**: Pil teks `Active` / `Inactive` di kolom STATUS kini interaktif (`cursor: pointer`), memungkinkan aktivasi/deaktivasi instan langsung dari status maupun tombol aksi.

- **Dual-View Student Roster Architecture (Phase 614 — SSOT Rule §1.4, §2.3, §2.10, §4.1)**:
  - **Tab 1: `Students Data`**: Fokus pada identitas, demografi, dan alamat (`LVL`, `PIC`, `SEX`, `NAME`, `DOB`, `AGE`, `EDUCATION`, `VILLAGE`, `DISTRICT`, `REGENCY`, `PROVINCE`, `PIN`, `STATUS`). Bersih total dari kolom nilai kelas (*zero exam columns*), melenyapkan horizontal scroll dan tabel sesak.
  - **Tab 2: `Student's Raport`**: Fokus pada pencapaian akademik dan evaluasi (`LVL`, `PIC`, `NAME`, kolom ujian kelas e.g. `CAMP 2ND VOCABULARY` Exam 1..4, `OVERALL PERFORMANCE` `DONE`, `PTS`, `GRD`, `PIN`, `STATUS` dengan aksi interaktif `LEVEL UP`). Bersih total dari kolom demografi dan alamat.
  - **Universal Sub Panel `✎ Edit Mode` Toggle**: Tombol aksi di Sub Panel bawah mengaktifkan Master Edit Mode (`body.global-edit-mode-on`) bergaris kisi Excel putih (`rgba(255,255,255,0.45)`). Tombol ghost berstatus `✎ Edit Mode` dan berubah menjadi solid neon glow `✓ Done Editing`.
  - **Inline Level Selection & Rollback**: Kolom Level (`LVL`) dilengkapi `<select class="student-level-select">` saat Edit Mode aktif, memungkinkan Tutor/Admin menaikkan atau menurunkan level siswa secara langsung jika terjadi kesalahan promosi.
  - **Class Hub Isolation Maintained (User Directive #1)**: Filter siswa di `Class Hub` (`C — CLASS`) dipertahankan sesuai aturan level agar daftar kelas tidak membengkak seiring bertambahnya siswa baru.

- **Hero Next Test Card Harmonization (Phase 613 — AGENTS.md §2.10.2 & ui-invariants.md §2.0)**:
  - **Balanced Typographic Hierarchy**: Judul tugas (`.next-test-primary-name`) menggunakan font `Inter` semibold 13px (`font-weight: 600`), sedangkan sub-topik materi (`.next-test-topic-name`) terkunci **Regular 12px (`font-weight: 400`)** warna slate `#94a3b8`, melenyapkan kesan tulisan serba tebal (*bulky/fat*).
  - **Rainbow Pips SSOT Alignment**: Ketujuh kotak repetisi (`.rainbow-box`) menggunakan font `Inter` tabular-nums 11px berbobot 600, serta menyelaraskan pemetaan warna 100% ke standar AGENTS.md §2.10.2: Merah (`var(--grade-e)`) $\to$ Jingga (`var(--grade-d)`) $\to$ Kuning (`var(--grade-c)`) $\to$ Hijau (`var(--grade-a)`) $\to$ Biru (`var(--primary-tactical)`) $\to$ Nila (`var(--clr-accent-1)`) $\to$ Ungu (`var(--quad-d)`), melenyapkan bug warna kuning ganda sebelumnya.
  - **Clear Practice Affordance**: Tombol aksi repetisi di sisi kanan (`.pass-counter-btn`) menyertakan nomor repetisi target bersama glif play SVG mikro (`2 ▶`) dengan font `Inter 700`, memperjelas fungsinya sebagai tombol interaktif untuk memulai latihan repetisi.

- **Student Academic Raport Modal Harmonization & CTA 3-Pillar Architecture (Phase 627 — SSOT §1.4, §2.10, §2.27)**:
  - **Standardized 60px Title Area (§1.5.1 Centered Title & Zero Subtitle Clutter Invariant)**: Header modal dirombak mematuhi SSOT §1.5.1 dan Zero Subtitle Clutter: tinggi baku 60px, border perimeter bawah 1.5px tegas (`rgba(255, 255, 255, 0.16)`), latar Navy `#1E293B`, judul terpusat matematis (**Centered Title Invariant**), tipografi 16px Outfit 800 **ALL CAPS (`STUDENT ACADEMIC REPORT`)** dengan letter-spacing 0.05em, bersih total tanpa subtitle/deskripsi redundan (*Zero Subtitle & Description Clutter*), serta meniadakan ikon pita/side icon dan keterangan `(Portrait)`.
  - **Pojok Kiri Bawah (`#btn-close-dossier-modal`)**: Tombol `CLOSE` diposisikan secara konsisten di pojok kiri bawah modal footer (`.modal-footer`) dengan `display: inline-flex !important;`.
  - **Tengah Area CTA (Carousel Pager)**: Tombol navigasi siswa (`← 1 of 12 →`) diposisikan di bagian tengah area CTA.
  - **Pojok Kanan Bawah (`#btn-export-pdf-dossier`)**: Tombol `Export to PDF` (Save PDF) diletakkan di sisi kanan bawah CTA.
  - **Eradikasi CSS Suppression**: Menghapus deklarasi `#btn-close-dossier-modal` dari daftar `display: none !important;` di `css/style.css` sehingga tombol CLOSE muncul sempurna.
  - **Clean Header Toolbar**: Header modal atas bebas dari tombol close dan tombol navigasi (hanya judul dan subjudul raport).
  - **Instant 1-Click Close**: Mengeliminasi bug 3 kali klik dengan beralih ke `history.replaceState` (mencegah penumpukan backdrop dari trigger `hashchange` di `app.js`) serta membersihkan seluruh modal backdrop dalam satu siklus `closeAllDossierModals()`.
  - **Biodata Raport Rapi & Course Data**: Baris biodata tersusun atas ke bawah dengan foto pasfoto 3:4 yang tingginya dinamis mengunci tabel teks, alamat lengkap, dan `Course Data` berformat `CEC Camp 134` dengan font hitam tebal (`#0f172a`).

- **Interactive LEVEL UP Status Action & Alumni Consolidation (Phase 611 — SSOT §1.4, §2.10, §2.27)**:
  - **Peniadaan Tombol Alumni Terpisah**: Tombol `Alumni` di Sub Panel bawah dihapus total. Kelulusan menjadi alumni merupakan puncak kenaikan level resmi (`Level 1` $\rightarrow$ `Level 2` $\rightarrow$ `Level 3` $\rightarrow$ `Level X / Alumni`).
  - **Status Interaktif `LEVEL UP` di Kolom Tabel**: Ketika siswa memenuhi kriteria kelulusan level (`row.isEligibleNext === true`), kolom STATUS menampilkan tombol interaktif beranimasi neon **`LEVEL UP`** dengan ikon SVG panah ganda ke atas (`chevrons-up`).
  - **Bulk Level-Up Action (`btn-promote-all-eligible`)**: Tombol aksi di Sub Panel bawah diperbarui menjadi **`LEVEL UP ALL (X Eligible)`** berikon SVG `chevrons-up` dengan palet hijau Grade A.
  - **Zero Movement Hover Invariant**: Tombol `.btn-level-up-cell` terkunci `transform: none !important;` dengan transisi ghost-to-solid neon glow.

- **Standing Operational Discipline (Rule 0.2 SSOT: Cepat, Cermat, Tepat, Akurat)**:
  - Setiap instruksi dieksekusi cepat tanpa seremonial dokumen berlebih, cermat memeriksa dampak sistemik, tepat sasaran sesuai konteks & SSOT, dan akurat lolos verifikasi 100% green.

---

## 2. Recent Active Milestones (Latest Rolling Window)

- **Phase 626**: Non-Level Programs Architecture (Level 0 / Tampilan '—'), TOP Institution Overhaul & Alumni Graduation to Level X.
- **Phase 625**: Full Student Academic Journey Simulation (Asik in Batch 123: 1st Level → Alumni) & Multi-Level Gating Engine Bug Resolution.
- **Phase 624**: Test Boot Latency Optimization, Fullscreen Modal Prompt Eradication & In-Test Component Selector (Words vs Phrases).
- **Phase 623**: Zero Table Capsule & Zero Table Glow Invariant across all tables & grids (`AGENTS.md` §2.31, `ui-invariants.md` §4.9).
- **Phase 622**: Unified Hero Card Architecture (Option A SSOT: Sex Above DoB, aligned colons, 64x84px portrait).
- **Phase 619**: RPC Error Elimination & Dashboard Address SSOT Formatting.
- **Phase 618**: NTB Comprehensive Administrative Hierarchy & Village Autocomplete Overhaul.

---

## 3. Standing Governance & Execution Boundaries

- **Rule 0.1.1 (Strict Git Gate)**: NEVER execute `git commit` or `git push` autonomously.
- **Rule 0.1.2 (Strict UTF-8 & No PowerShell File Editing)**: Use native tools or Node.js only.
- **Rule 0.2 (Standing Operational Discipline)**: Cepat, Cermat, Tepat, dan Akurat di setiap eksekusi perintah.
- **Rule 0.3 (Strict Zero Unsolicited Action)**: Dilarang men-generate, membuat, merubah, atau menghapus apa pun di luar yang diminta.
- **Rule 2.10 (Authoritative Color SSOT)**: Zero raw hex codes. CSS variables & `TOPSCORE_COLORS`.
- **Rule 2.27 (Authoritative Entity Standards)**: Strict status & type taxonomies (ACTIVE, HOLD, ALUMNI, INACTIVE).

---

## 4. Verification Suite Status

- **Universal Table Standardization**: 11/11 Pillars PASS with 100% integrity (`npm.cmd run test:table`).
- **Preflight & Fast AST Check**: 51/51 JavaScript files PASS syntax validation (`npm.cmd run test:fast`).
- **Global Parallel Test Pool**: 25/25 suites PASS cleanly (`node scripts/run_all_tests_parallel.mjs`).
- **Automated Spatial & Visual Invariants**: ALL checks PASS 100% (`npm.cmd run check:spatial`).

---

## 5. Next Exact Action

- **Target**: Siap menerima instruksi dan arahan berikutnya dari pengguna. Seluruh file tetap aman dan uncommitted di working tree per Rule 0.1.1.
