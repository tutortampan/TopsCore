# ACTIVE DIRECTIVE: PHASE 58 — STRICT ACTIVE-ONLY BATCH DROPDOWNS & LEVEL 0 SEMANTICS ("UNDER LEVEL 1")

- [x] Task 1: Enforce Strict Active-Only Filtering in Live Session Controller (`js/admin/assessment-access.js`)
  - Filtered `_cachedBatches` to strictly `b.is_active !== false && !b.deleted_at`.
  - Excluded inactive batches (`Batch 131`, `Batch 132`, `Batch TP-2026`).
  - Updated section title to "1. TARGET ACTIVE BATCH".

- [x] Task 2: Level 0 Semantics ("Under Level 1", NOT "All Levels") (`levels` DB, `js/admin/assessment-access.js`, `js/api.js`, `js/dashboard.js`)
  - Updated database `levels` row `b70a0ea2-785d-4291-9adf-a4cbd7a2c9a2` (`level_number = 0`) to `name = 'Level 0'` and `description = 'Pre-Level / Foundation (Under Level 1)'`.
  - When assessment targets Level 1, 2, or 3, exclude Level 0 batches (`bLevelNum === 0`).
  - Purged hardcoded `'All Levels'` fallback in `assessment-access.js`.
  - Removed `isAllLevels = true` for Level 0 in `js/api.js` (line 2142).
  - Ensured Level 0 classes do not display under Level 1, 2, or 3 in `js/dashboard.js` (line 1034).
  - Renamed Vocabulary Vault `'Level 0 (Universal)'` to `'Level 0 (Pre-Level)'`.

- [x] Task 3: Audit Other Operational Batch Dropdowns
  - Enforced `b.is_active !== false && !b.deleted_at` in Single Student Edit Modal and Bulk Batch Edit Modal in `js/admin/student-management.js`.
  - Enforced active-only batches in Class Assignment Modal in `js/admin/class.js`.

- [x] Task 4: Automated Verification & E2E Audits
  - Playwright Live Session test (`scratch/verify_live_session_dropdown.mjs`): verified dropdown contains ONLY active batches (`Batch 123`, `Batch 133`), 0 inactive, 0 Level 0, 0 "All Levels".
  - Captured verified screenshot: `screenshot_live_session_active_batches_only.png`.
  - Full E2E audit (`scratch/full_e2e_system_audit.mjs`): 17/17 passed with 0 failures and 0 console errors.
  - Strict git freeze maintained: 0 commits, 0 pushes. All changes remain local.

---

# PHASE 56 — SOFT-DELETED ASSESSMENT FILTERING & STUDENT DASHBOARD RECOVERY

- [x] Task 1: API Data Layer Remediation (`js/api.js`)
  - `fetchAssessments()`: Added `deleted_at` to `.select(...)` and `.is('deleted_at', null)` by default.
  - `fetchAssessmentsForStudentLevel()`: Added `deleted_at` to `.select(...)` and `.is('deleted_at', null)`.
  - `fetchAllStudentAttempts()`: Added `assessments(..., deleted_at, status)` to join and fallback.

- [x] Task 2: Student Dashboard Up-Next Hero Banner & Daily Task (`js/dashboard.js`)
  - Excluded soft-deleted assessments in `renderNextAssignmentHero`.
  - Daily task now picks active test `3A-Vocabulary Test - Workplace` instead of defunct `3rd Vocabulary A1 Phrases Task`.

- [x] Task 3: Overall Score & Grade Recovery per AGENTS.md §2.8 (`js/dashboard.js`)
  - Excluded soft-deleted/unavailable assessments from `bestMap` in `computeOverallStats`.
  - Restored King Test's overall score from 56% (Grade C) to 70% (Grade C/B tier).

- [x] Task 4: Curriculum Class Progress Bar Recalibration (`js/dashboard.js`)
  - Filtered soft-deleted assessments from `classAssms` denominator in `renderClasses`.
  - Restored Vocabulary progress bar from 13% to 20% (4 completed out of 20 active tasks).

- [x] Task 5: Completed Assessments List & Batch Leaderboard Clean-up (`js/dashboard.js`)
  - Filtered soft-deleted attempts in `renderCompletedAssessmentsBottom`, removing defunct 0% "⚠️ Retake" card.
  - Filtered soft-deleted attempts in `loadBatchLeaderboard`, synchronizing leaderboard score to 70% (4 completed).
  - Filtered soft-deleted attempts in `setupProfileModal` history table.

- [x] Task 6: Automated Verification & E2E Audits
  - Automated Playwright verification (`scratch/capture_dashboard_fixed.mjs`): captured `screenshot_dashboard_king_test_fixed.png`.
  - Full E2E audit (`scratch/full_e2e_system_audit.mjs`): 17/17 passed with 0 failures and 0 console errors.
  - Strict git freeze maintained: 0 commits, 0 pushes. All changes remain local.

---

# PHASE 55 — ALPHABETICAL SORTING & FILTERING FOR STUDENT WHITELIST, BATCHES & TESTS

- [x] Task 1: Student Attendance Whitelist Alphabetical Sorting (A → Z) (`js/admin/assessment-access.js`)
  - Enrolled students sort alphabetically by name (A to Z) by default.
  - Added `#btn-sort-students` toggle button (`🔤 A → Z` / `🔤 Z → A`) in modal whitelist header.
  - Added `#session-student-search` input to filter students in real-time with full selection state preservation via `_checkedStudentIds`.

- [x] Task 2: Natural Alphanumeric Sorting for Batches (`js/admin/assessment-access.js`)
  - Batches inside `<optgroup>` options sorted via `localeCompare(..., { numeric: true })`.

- [x] Task 3: Alphabetical Tests Table Sorting & Interactive Column Headers (`js/admin/assessment-access.js`)
  - Initialized tests table in alphabetical order by title (3A -> 3B -> 3C -> 3D).
  - Added `#access-sort-select` dropdown and clickable `.th-sortable` column headers.

- [x] Task 4: Automated Verification & E2E Audits
  - Automated Playwright verification (`scratch/test_alphabetical_sort.mjs`): All 24 students verified sorted alphabetically A-Z (Asti first, Suharto last). Toggle sort and search filter verified. Saved screenshot `screenshot_whitelist_sorted_az.png`.
  - Full E2E audit (`scratch/full_e2e_system_audit.mjs`): 17/17 passed with 0 failures and 0 console errors.
  - Strict git freeze maintained: 0 commits, 0 pushes. All changes remain local.

---

# PHASE 54 — ASSESSMENT ACCESS BATCH LOADING & SMART CATEGORIZATION

- [x] Task 1: Resolve Database Column Error in Batch Query (`js/admin/assessment-access.js`)
  - Fixed query in `adminFetchAll('batches', ...)` from requesting non-existent column `status` to `id, name, program_id, current_level_id, is_active, deleted_at`.
  - Added `programs` fetch in `Promise.all` and updated `classes` query to include `level_id`.

- [x] Task 2: Smart Categorization & Rich Metadata (`js/admin/assessment-access.js`)
  - Correlated test's `level_id` and class `program_id` to available batches.
  - Grouped into `<optgroup label="🎯 Related Batches (<Class> • <Level>)">` and `<optgroup label="Other Batches">`.
  - Enriched labels with student counts, program name, and level metadata (e.g. `Batch 133 (24 Students • Camp • 3rd Level)`).

- [x] Task 3: Auto-Selection & Whitelist Checklist Auto-Load (`js/admin/assessment-access.js`)
  - Auto-selects the direct matching related active batch upon opening modal (`Batch 133`).
  - Dispatches `change` event immediately to load all 24 enrolled student checkboxes without requiring manual selection.

- [x] Task 4: Automated Verification & E2E Audits
  - Automated Playwright verification (`scratch/test_assessment_access_modal.mjs`) verified related optgroup, Batch 133 auto-selected, 24 student checkboxes populated, and captured screenshot.
  - Full E2E audit (`scratch/full_e2e_system_audit.mjs`): 17/17 passed with 0 failures and 0 console errors.
  - Strict git freeze maintained: 0 commits, 0 pushes. All changes remain local.

---

# PHASE 53 — REMOVE TOP HEADER & ZERO-SCROLL DYNAMIC VIEWPORT SCALING FOR CLASS ATTENDANCE MATRIX

- [x] Task 1: Removal of Top Header & DataGrid Toolbar (`js/admin/app.js`, `js/admin/datagrid.js`, `css/admin.css`)
  - Removed card header (`📋 Class Roster (Attendance) 25 ENROLLED` and `Batch: Active Batches Only` filter).
  - Added `hideToolbar: true` to `DataGrid` and suppressed `.datagrid-toolbar` and `.datagrid-pagination`.
  - Reclaimed over 160px of vertical space, allowing the attendance matrix table to start directly at the top.

- [x] Task 2: Dynamic Responsive Row & Font Sizing (`js/admin/app.js`, `css/admin.css`)
  - Implemented `fitMatrixToScreen()` to dynamically calculate available height (`window.innerHeight - rect.top - bannerHeight - 6`).
  - Dynamically calculates row height (`--matrix-row-height`), font size (`--matrix-font-size`), badge font size (`--matrix-badge-font`), and cell padding (`--matrix-cell-padding`).
  - Attached resize listener and RAF to dynamically recalculate on window resize or zoom.
  - Made `PROG` column single line compact (`${row.progressPct}%` with tooltip) to ensure strict uniform row heights.

- [x] Task 3: Zero-Scroll Viewport Geometry (`css/admin.css`)
  - Subtracted 38px bottom banner from `.admin-content:has(#class-attendance-grid)` height (`calc(100vh - 56px - 38px)`).
  - Verified `adminContentHasScroll: false` and `tableWrapHasScroll: false`.
  - All 25 student rows and the summary row (★ CLASS AVERAGE) are 100% visible simultaneously without any vertical scrolling.

- [x] Task 4: Automated Verification & E2E Audits
  - Automated Playwright verification (`scratch/test_attendance_matrix_layout.mjs`) verified zero scrollbars, dynamic row height (28px on 900px viewport), and captured screenshot.
  - Full E2E audit (`scratch/full_e2e_system_audit.mjs`): 17/17 passed.
  - Strict git freeze maintained: 0 commits, 0 pushes. All changes remain local.

---

# PHASE 52 — SPLIT SCORE AND GRADE (GRD) COLUMNS IN CLASS ATTENDANCE MATRIX

- [x] Task 1: SuperHeaders Colspan Expansion (`js/admin/app.js`)
  - Expanded `STUDENT DETAILS` super-header `colSpan` from 7 to 8 to accommodate independent SCORE and GRD columns.

- [x] Task 2: Standalone SCORE and GRD Columns (`js/admin/app.js`)
  - Added standalone `SCORE` column (`key: 'averageScorePct'`, label: `SCORE`, width: `45px`) displaying solely the student's average score percentage (e.g., `96%`).
  - Modified `GRD` column (`key: 'grade'`, label: `GRD`, width: `35px`) to render purely the styled grade badge (e.g., `<span class="badge">[ A ]</span>`) without merging score text.
  - Column sequence under `STUDENT DETAILS`: `INST` -> `PROGRAM` -> `BATCH` -> `STUDENT NAME` -> `PROG` -> `SCORE` -> `GRD` -> `PTS`.

- [x] Task 3: Summary Row Alignment (`js/admin/app.js`)
  - Updated `summaryRow` callback to render `${avgScore}%` in the `SCORE` column and purely the `${avgGrade}` badge in the `GRD` column.

- [x] Task 4: Verification & Automated Audits
  - Automated Playwright verification (`scratch/test_attendance_matrix_layout.mjs`) verified 8 student detail column headers, top 5 student rows with separate `score: '96%'` and `grd: 'A'`, and summary row `{ score: '78%', grd: 'B' }`.
  - Visual inspection confirms flawless alignment without layout breaks.
  - Full E2E audit (`scratch/full_e2e_system_audit.mjs`): 17/17 passed.
  - Strict git freeze maintained: 0 commits, 0 pushes. All changes remain local.

---

# PHASE 51 — ACTIVE STUDENTS ENROLLED TAB & TASK POINTS 50-POINT MAX ALIGNMENT

- [x] Task 1: Topbar Tab Active Enrolled Students Count (`js/admin/app.js`)
  - Updated Class Hub topbar tab to count active batch students only: `val: activeBatchStudents.length` (displays `25`), with label `Active Enrolled Students`.
  - Resolves confusion between 50 total curriculum enrollments (including alumni/inactive batches) and 25 active students in the attendance roster.

- [x] Task 2: Task Attempt Points Recalibration to 50 Max Points (`scratch/recalibrate_task_points_50.mjs`, `js/admin/app.js`)
  - Recalibrated all 82 student TASK attempt pairs in Level 3: Words (max 40) + Phrases (max 10) = 50 Max Points.
  - Unggul's task scores: Task 1: `49/50`, Task 2: `50/50`, Task 3: `50/50`, Test: `101.5/120` -> Total PTS: `250.5 pts`.
  - Asmul's task scores: Task 1: `47/50`, Task 2: `43/50`, Task 3: `42/50`, Test: `116.5/120` -> Total PTS: `248.5 pts`.
  - Cleaned up 62 secondary attempts with scores > 50 in database so no task attempt exceeds total questions.
  - Updated `totalQ` fallbacks to 50 for tasks and 120 for tests in `js/admin/app.js`.
  - Prioritized `is_best_score: true` when selecting `bestAtt`.

- [x] Task 3: Verification & Audits
  - Automated Playwright verification (`scratch/test_attendance_matrix_layout.mjs`) verified points (49, 50, 50, 101.5), PTS (250.5 pts), and active tab.
  - Full E2E audit (`scratch/full_e2e_system_audit.mjs`): 17/17 passed.
  - Strict git freeze maintained: 0 commits, 0 pushes. All changes remain local.

---

# PHASE 50 — CLASS ROSTER ATTENDANCE MATRIX POINTS (POIN) DISPLAY & PTS ACCUMULATION

- [x] Task 1: Assessment Columns (1-20) Points Display (`js/admin/app.js`)
  - Updated matrix cell renderer to display raw points (`displayVal = (sc % 1 !== 0) ? sc.toFixed(1) : sc`), e.g., `101.5` on Column 4, rather than percentage score (`85`).
  - Tooltip updated to clearly show points and percentage: `Points: ${displayVal}/${totalQ} pts (${Math.round(pct)}%)`.

- [x] Task 2: Cumulative Points (PTS) & Column Sort Value Normalization (`js/admin/app.js`)
  - Standardized `totalEarnedScore` and `rowScoreSortVals` to sum and sort by raw earned points (`rawEarned`), restoring Unggul's PTS to `400.5 pts` ($99 + 100 + 100 + 101.5$) and Asmul's to `396.5 pts`.
  - Added decimal point formatting to PTS cell rendering (`400.5 pts`).
  - Standardized bottom summary row column average to average points (`pts`).

- [x] Task 3: Verification & Audits
  - Automated Playwright verification (`scratch/test_attendance_matrix_layout.mjs`) verified points display (`101.5`) and PTS (`400.5 pts`).
  - Full E2E audit (`scratch/full_e2e_system_audit.mjs`): 17/17 passed.
  - Strict git freeze maintained: 0 commits, 0 pushes. All changes remain local.

---

# PHASE 49 — CLASS ROSTER ATTENDANCE MATRIX 20-COLUMN LAYOUT & THEME ALIGNMENT

- [x] Task 1: Dynamic Theme SuperHeaders Colspan Generation (`js/admin/app.js`)
  - Replaced hardcoded `colSpan: 8, 10, 10, 12` with dynamic theme grouping based on `classAssessments`.
  - Accurately aligns Theme A (colSpan 4), Theme B (colSpan 5), Theme C (colSpan 6), and Theme D (colSpan 5) across 20 assessment columns.

- [x] Task 2: Elimination of Hardcoded Test Column Highlights (`js/admin/app.js`)
  - Removed obsolete hardcoded array `testColNumbers = [7, 8, 17, 18, 29, 30, 39, 40]`.
  - Dynamic `isTest` evaluation highlights strictly columns 4, 9, 15, and 20 as Tests (`.col-asm-test`, pink). Columns 7, 8, 17, 18 restored to Tasks (`.col-asm-task`, cyan).

- [x] Task 3: Normalization of Cell Display Values & Total Points (PTS) (`js/admin/app.js`)
  - Normalized matrix cell display value to `Math.round(pct)` (0–100 scale). Preserved raw points in tooltip (`${displayVal}% (${sc}/${totalQ} pts)`).
  - Normalized student `PTS` sum and sort values to normalized percentage points: Unggul's score corrected from `400.5 pts` to `384 pts` ($99 + 100 + 100 + 85$), perfectly matching his 96% Grade A.
  - Standardized bottom summary row class averages to percentage scale.

- [x] Task 4: Verification & Automated Audits
  - Automated Playwright verification (`scratch/test_attendance_matrix_layout.mjs`) verified SuperHeaders, column classes, and student rows.
  - Full E2E audit (`scratch/full_e2e_system_audit.mjs`): 17/17 checks passed, 0 failures, 0 console errors.
  - Strict git freeze maintained: 0 commits, 0 pushes. All changes remain local.

---

# PHASE 48 — UNIFIED VOCABULARY TASK & TEST SYSTEM, SPOKEN/WRITTEN ANSWER TYPES & SCORE MERGE

- [x] Task 1: Auto-Generator Unification (`js/api.js`)
  - Updated `upsertDynamicAssessmentShell` and `autoGenerateAssessmentsHierarchy` to generate 1 unified Vocab Task per topic and 1 unified Vocab Test per theme.
  - Standardized Shell Codes per user formula:
    * Tasks: `${levelNum}${themeCode}${topicCode} Vocab Task` (e.g., `3A1 Vocab Task`)
    * Tests: `${levelNum}${themeCode} Vocab Test` (e.g., `3A Vocab Test`)
  - Standardized Titles per user formula:
    * Tasks: `${levelNum}${themeCode}${topicCode}-Vocabulary Task - [Topic Name]`
    * Tests: `${levelNum}${themeCode}-Vocabulary Test - [Theme Name]`
  - Standardized Default Answer Types:
    * Tasks: `'spoken'` (speech_to_text for pronunciation & speaking practice)
    * Tests: `'written'` (virtual keyboard for spelling & written recall)
    * User/tutor customization preserved if changed.

- [x] Task 2: Student Attempt & Score Merging for Matching Topics (`scratch/execute_merge_migration.mjs`)
  - Consolidated 20 assessment groups (16 Tasks + 4 Tests) into unified primary assessments.
  - Soft-deleted 20 legacy companion phrase shells (`deleted_at = now()`) with zero data loss.
  - Reassigned 117 secondary attempts safely to primary unified assessments.
  - Merged and recalibrated 85 student scores: averaged top scores of words & phrases ($(P_w + P_p) / 2$), updated grade per centralized grading table, and marked singular `is_best_score: true` (0 duplicates).

- [x] Task 3: Linear Prerequisite Chain Rebuild
  - Re-linked 20 nodes in clean linear progression:
    `3A1 Vocab Task` -> `3A2 Vocab Task` -> `3A3 Vocab Task` -> `3A Vocab Test` -> `3B1 Vocab Task` -> ... -> `3D Vocab Test`.

- [x] Task 4: End-to-End System Verification
  - Automated tests verified: `scratch/test_phase47_e2e.mjs` (9/9 passed).
  - Syntax check: `node --check` passed across 100% of JS files.
  - Strict git freeze honored (0 commits, 0 pushes).

---

# PHASE 47 — ASSESSMENT ACCESS, LIVE TEST SESSIONS & UNIFIED WORDS/PHRASES TEST

- [x] Task 1: Database & API Layer for Test Sessions & Dynamic Duration
- [x] Task 2: Dedicated Admin Panel "Assessment Access" (`admin.html` & `js/admin/assessment-access.js`)
- [x] Task 3: Student Dashboard Always-Visible "Next Assignment / Test Arena" Panel (`dashboard.html` & `js/dashboard.js`)
- [x] Task 4: Unified Words & Phrases Test Two-Stage Randomization (`js/api.js`)
- [x] Task 5: End-to-End Automated Verification & Playwright Testing

---


## 🚀 MASTER DEV TASK LIST (TOPSCORE SYSTEM)

### ✅ PHASE 32: STUDENT DASHBOARD AVATAR SCALING, GLOW HIERARCHY & BATCH STANDINGS (SELESAI)
- [x] 1. Penskalaan visual avatar dashboard dari 60px ke 86px dominan dengan clipping melingkar dan glow borders tanpa merusak layout vertikal.
- [x] 2. Skema grading & glow hierarchy lengkap: 100% menggunakan simbol Bintang Bersinar (⭐) dengan golden glow aura, Grade A–F dengan tiered colors dan soft glow.
- [x] 3. Batch Leaderboard / Standings Matrix dual-dock tab (`[ 🏆 Batch Standings ] [ 📋 Completed ]`) dengan rank indicator pill (`RANK #1`) dan 4-level tie-breaker sorting.
- [x] 4. Royal Title & Crown Mechanics: Batch champion mendapatkan floating crown (👑) di atas avatar dan dynamic title `King <Name>` / `Queen <Name>` real-time.
- [x] 5. Preservasi 100% zero-scroll mobile geometry (`100dvh`) dan `#bottom-ad-banner` (28px) di dasar layar.
- [x] 6. Verifikasi otomatis Playwright pada iPhone 14 (390x844) dan Android Small (360x640) lulus 100%.

---

## 📜 GRAND ROADMAP (PHASE 1 - 11)

## âœ… PHASE 1-3: SYSTEM RESCUE & DATABASE HYGIENE (SELESAI)

- [x] 1. Perbaikan arsitektur database (Membuang tabel lawas, menyatukan relasi `batches`, `levels`, dan `classes`).
- [x] 2. Pembersihan skema dan dekomisioning fitur usang.
- [x] 3. Pembaruan API dan Pipeline Murid (Logika naik level/Level-Up otomatis).

## âœ… PHASE 4: DUAL-AXIS WORKSPACE & MODUL SEMUA KELAS/LEVEL (SELESAI)

- [x] 1. Pembuatan Dual-Axis Workspace (Sumbu Y: Kelas, Sumbu X: Level) di dashboard Admin.
- [x] 2. Adaptasi Modul untuk Semua Kelas & Level.
- [x] 3. Pembuatan Modal Pembuat Ujian (Assessment Builder) per-level dan per-kelas.

## âœ… PHASE 5: VOCABULARY VAULT UI & MANAGEMENT (SELESAI)

- [x] 1. Mengganti nama tab menjadi "Topic Mapping".
- [x] 2. Membuat Sticky Top Panel agar navigasi tidak hilang saat di-scroll.
- [x] 3. Menambahkan Summary Cards (Total Words, Themes, Topics).
- [x] 4. Menambahkan Filter "Target Level" (SD, SMP, SMA).
- [x] 5. Menambahkan sistem Pagination (Tampilkan 50, 100, Infinite).
- [x] 6. Memperbaiki logika Auto-Fix pendeteksi Tipe Kata & Frasa.
- [x] 7. Menambahkan fitur Bulk Delete Selected (Hapus Massal).

## âœ… PHASE 6: ASSESSMENT GENERATOR & ENGINE (SELESAI)

- [x] 1. Implementasi Backend Generator Statis ke `assessment_questions` saat Blueprint disimpan.
- [x] 2. Assessment Blueprint UX â€” pemisahan eksplisit Voice vs Typing vs MCQ.
- [x] 3. Review Algoritma Pengecoh (Distractors) â€” Phrase Recognition mengambil tipe kata setara.
- [x] 4. Review Alur Murid â€” Task: Speech-to-Text, Test: Typing.

## âœ… PHASE 7: BLUEPRINT KELAS & SOP SATU PINTU (SELESAI)

- [x] 1. Pembersihan Database & Sinkronisasi (soft-delete duplikat/orphan).
- [x] 2. Inisialisasi Kelas Wajib Tiap Level.

## âœ… PHASE 8: PERAKITAN 5 KELAS UTAMA (SELESAI)

- [x] 1. Kelas Vocabulary (Level 1, 2, 3)
- [x] 2. Kelas Basic English (Level 1)
- [x] 3. Kelas Storytelling (Level 1)
- [x] 4. Kelas Telling Story (Level 2)
- [x] 5. Kelas Public Speaking (Level 2)
- [x] 6. Kelas Speaking Projects (Level 3)

## âœ… PHASE 9: FINALISASI MOBILE UI â€” STUDENT EXPERIENCE (SELESAI)

- [x] 1. Dashboard Murid: Hirarki Level â†’ Kelas â†’ Daftar Task & Test.
- [x] 2. Sequential Lock UI: Efek gembok pada modul terkunci.
- [x] 3. Routing Otomatis: ke halaman AI yang tepat (Kamera, Mic, MCQ, dll).
- [x] 4. Review General Assessment UX: Desain frosted glass diterapkan di semua tampilan tes.

## âœ… PHASE 10: MAINTENANCE & DATA PIPELINE (SELESAI)

- [x] 1. Verify Excel Data Import (Vault): Kolom `Theme Code` & `Topic Code` terbaca â†’ verified (inserted:1).
- [x] 2. Test Real-Time Sync (Dynamic Shell): Vault updates â†’ Shells ter-generate â†’ verified (tasks:1, tests:1, updated:2).
- [x] 3. Blueprint Theme Ordering: Tema diurutkan berdasarkan `theme_code` (numeric-aware). Tema tanpa kode turun ke bawah.

---

## ðŸ†• PHASE 11: POLISH & STABILISATION (NEXT UP)

- [x] **11.1.** Blueprint â€” Verify Theme Order Live: Confirmed âœ… â€” Order is WORKPLACE â†’ TOURISM â†’ CCU â†’ HIGH-FREQUENCY (by theme_code, not alphabetically). CCU is no longer first.
- [x] **11.2.** Vault Inline Edit: Verified âœ… â€” Save handler reads theme_code & topic_code, uppercases, saves to DB, updates in-memory word, then calls filterAndRender() which rebuilds Blueprint immediately.
- [x] **11.3.** Student Flow â€” End-to-End Test: Selesaikan satu percobaan penuh Vocabulary Task (Dynamic Shell) dan konfirmasi kata-kata Vault termuat benar. (Verified âœ…: 40 Vault words mapped, Edge Functions start & submit passed, 100% score Grade S recorded).
- [x] **11.4.** Clean Up Test Data: Deleted 6 mock vault rows + 2 assessment shells (TEST_TH_1 / TEST_TP_1) from Level 1. âœ…
- [x] **11.5.** Admin Security Review: Pastikan route admin-only (Vault, Blueprint, Assessment Builder) sudah diproteksi RLS dan Edge Function auth.

---

## 🚀 PHASE 12: DEEP SYSTEM AUDIT REMEDIATION (TASK_LIST.md)

Detailed tracker maintained in [TASK_LIST.md](file:///d:/TopsCore/TASK_LIST.md):
- [x] TASK-01 | FOUC Prevention & Synchronous Head Session Guards | HIGH | depends: none | criteria: instant redirect without visual flicker
- [x] TASK-02 | Cache-Busting Version Alignment (?v=4.9.8) & sw.js URL Pattern Repair | HIGH | depends: none | criteria: unified query strings and working offline cache
- [x] TASK-03 | PostgreSQL Stored Procedure `auto_close_expired_attempts` Migration | HIGH | depends: none | criteria: live `public.attempts` target table and RPC parameter support
- [x] TASK-04 | Deprecate Client-Side Scoring Fallback in API | CRITICAL | depends: none | criteria: remove client scoring per AGENTS.md §1.4
- [x] TASK-05 | Server-Authoritative Emergency Fallback RPC (SECURITY DEFINER) | CRITICAL | depends: TASK-04 | criteria: secure fallback submissions through RLS
- [x] TASK-06 | Anti-Cheat Hardening (Clipboard, DevTools, Strikes & Mobile Inputs) | MEDIUM | depends: none | criteria: blocked copy/paste/F12 and 3-strike policy
- [x] TASK-07 | Conceal Answer Keys in Exam Network Payload & Sanitize Snapshots | HIGH | depends: none | criteria: zero correct answers in active exam payload
- [x] TASK-08 | Database Query Projection Auditing (Replace `.select('*')`) | MEDIUM | depends: none | criteria: explicit column projections on high-volume tables
- [x] TASK-09 | Debounced Autosave Buffer for Real-Time Keystrokes & Transcripts | MEDIUM | depends: none | criteria: 400ms debounced buffer on input event
- [x] TASK-10 | Student Profile Media & Storage Migration (Base64 -> Storage / SVG) | MEDIUM | depends: none | criteria: WebP storage bucket upload and zero-egress SVG avatars
- [x] TASK-11 | Honorific Prefix Stripping in Alphabetical Student Sorting & Avatars | HIGH | depends: none | criteria: true alphabetical sorting by personal names

---

## ⚡ PHASE 24: HEURISTIC AUDIT REMEDIATION — CORE STABILITY & INTEGRITY

- [x] **TASK-24-01** | Unified Asset Versioning Alignment (?v=5.2.2) & Service Worker Cache Fix | HIGH | depends: none | criteria: All HTML/JS imports aligned to ?v=5.2.2; sw.js precache matched & covers modular scripts
- [x] **TASK-24-02** | Centralize & Deduplicate `escapeHtml` / `escHtml` and Name Utilities | HIGH | depends: none | criteria: Single source in js/app.js & avatar-engine.js; 19 redundant copies removed
- [x] **TASK-24-03** | Mobile Viewport Truncation & Touch Target Safety (`assessment.html`) | HIGH | depends: none | criteria: .assessment-main-content allows vertical scroll on screens <640px/focus; 100vw removed
- [x] **TASK-24-04** | API Error Handling & Submission Fallback Reliability | HIGH | depends: none | criteria: No blank catch (_) blocks in api.js; assessment.html stops premature redirect on submit failure
- [x] **TASK-24-05** | High-Volume Search Input Debounce & DataGrid Memory Leak Fix | MEDIUM | depends: none | criteria: 200ms debounce on vocab-vault & index searches; datagrid.js cleans up keydown listener

---

## 📦 PHASE 25: MODULARIZATION & ARCHITECTURE REFACTORING

- [x] **TASK-25-01** | Extract Monolithic CSS from HTML Shells (index, dashboard, assessment, result) | MEDIUM | depends: TASK-24-01 | criteria: 1,560+ lines of inline CSS extracted to modular external stylesheets
  - [x] 25.1.1: Extract `index.html` inline `<style>` (504 lines) to `css/auth.css` & link via `css/auth.css?v=5.2.2`.
  - [x] 25.1.2: Merge `dashboard.html` inline `<style>` (411 lines) into `css/dashboard.css` & link via `css/dashboard.css?v=5.2.2`.
  - [x] 25.1.3: Extract `assessment.html` inline `<style>` (542 lines) to `css/assessment.css` & link via `css/assessment.css?v=5.2.2`.
  - [x] 25.1.4: Extract `result.html` inline `<style>` (142 lines) to `css/result.css` & link via `css/result.css?v=5.2.2`.
  - [x] 25.1.5: Register `css/auth.css`, `css/assessment.css`, and `css/result.css` in `sw.js` cache manifest.
- [x] **TASK-25-02** | Extract Monolithic JS from HTML Shells (index, dashboard, assessment, result) | MEDIUM | depends: TASK-24-01, TASK-24-02 | criteria: 4,770+ lines of inline JS extracted to js/auth.js, js/dashboard.js, js/assessment.js, js/result.js
  - [x] 25.2.1: Extract `index.html` module script (462 lines) to `js/auth.js` & link via `./js/auth.js?v=5.2.2`. Keep head guard inline.
  - [x] 25.2.2: Extract `dashboard.html` module script (2,125 lines) to `js/dashboard.js` & link via `./js/dashboard.js?v=5.2.2`. Keep head guard inline.
  - [x] 25.2.3: Extract `assessment.html` module scripts (1,628 lines) to `js/assessment.js` & link via `./js/assessment.js?v=5.2.2`. Keep head guard inline.
  - [x] 25.2.4: Extract `result.html` module script (476 lines) to `js/result.js` & link via `./js/result.js?v=5.2.2`. Keep head guard inline.
  - [x] 25.2.5: Register extracted scripts in `sw.js` precache & verify syntax with `node --check`.
- [x] **TASK-25-03** | Consolidate Competing Student Profile Modals in Admin | MEDIUM | depends: TASK-24-02 | criteria: Single authoritative student profile modal in js/admin/student-management.js
  - [x] 25.3.1: Delegate `openStudentProfile` to `showStudentProfileModal` in `js/admin/app.js` and `js/admin/class.js`.
  - [x] 25.3.2: Verify zero regression across all table profile triggers (`B — BOARD`, `C — CLASS`, Class Hub, and Assessment details).
- [x] **TASK-25-04** | Offline CDN Fallbacks & Third-Party Elimination | LOW | depends: none | criteria: Local SheetJS fallback; ui-avatars.com replaced with local SVG data URIs
  - [x] 25.4.1: Replace external `ui-avatars.com` image endpoints in `assessment.html` / `js/assessment.js` with local SVG data URIs via `createInitialsSvgDataUri`.
  - [x] 25.4.2: Bundle SheetJS locally in `js/vendor/xlsx.full.min.js`, configure local loader with CDN fallback, and add to `sw.js`.
- [x] **TASK-25-05** | Automated E2E Regression Verification & Continuation State Sync | MEDIUM | depends: TASK-25-01..TASK-25-04 | criteria: All pages render with 0 errors; state files updated

---

## 🎓 PHASE 26: ACADEMIC ENGINE, SEQUENTIAL PREREQUISITES & ROSTER MATRIX

- [x] **TASK-26-01** | Fix Student Progress Calculation & Cumulative Mastery Grade Formula | HIGH | depends: none | criteria: `completion_pct = (completed_assessments_count / total_class_assessments) * 100`; authoritative cumulative mastery grade (unattempted count as 0); default sort `PTS` descending
- [x] **TASK-26-02** | Standalone Student Info Columns & Text-Only Identity | MEDIUM | depends: none | criteria: Dedicated columns `INST` (~65px), `PROGRAM` (~65px), `BATCH` (~55px), `STUDENT NAME` (~140px, text-only, 0 avatars/initials); compact `PROG` (~50px), `GRD` (~40px), `PTS` (~55px)
- [x] **TASK-26-03** | 40-Column Dense Assessment Matrix (Zero Horizontal Scrollbar) | CRITICAL | depends: TASK-26-01, TASK-26-02 | criteria: `table-layout: fixed; width: 100%; overflow-x: hidden !important;`; remaining width evenly distributed across 1..40; 4 super-headers; magenta accents on Test columns (7, 8, 17, 18, 29, 30, 39, 40); clean "pts" formatting; "★ CLASS AVERAGE" summary row; score cell click opens `result.html?attempt_id=...` in new tab
- [x] **TASK-26-04** | Standardize Assessment Codes & Sequential Prerequisites | HIGH | depends: none | criteria: Code format `[Level][Theme][Topic]-[TYPE]-[TIER]`; sequential `prerequisite_assessment_id` chain (1 -> 2 -> ... -> 40) in DB
- [x] **TASK-26-05** | Playwright Automated Matrix Verification & Screenshot Validation | HIGH | depends: TASK-26-01..TASK-26-04 | criteria: Automated test verifies zero horizontal overflow, score cell new tab opening, and outputs `class_roster_matrix_phase26_verified.png`

---

## 🎯 PHASE 27: UNLOCKED/TAKEABLE ASSESSMENT CALIBRATION & FLEXIBLE SORTING

- [x] **TASK-27-01** | Calibrate Student Score (%) & Grade (GRD) Strictly on Taken/Unlocked Modules | CRITICAL | depends: none | criteria: Student Score = `sum(best_percentage_on_taken) / count(taken_assessments)`; Grade = `getGrade(average_score)`; locked/unopened assessments strictly excluded from score denominator
- [x] **TASK-27-02** | Differentiate Progress (PROG) vs Student Score/Grade | HIGH | depends: TASK-27-01 | criteria: PROG reflects completion (`completed_count / total_class_assessments * 100`, e.g. "15% 6/40 Done"); GRD displays score % and grade badge (e.g. "100% S")
- [x] **TASK-27-03** | Flexible Multi-Criteria Column Sorting in Class Roster | HIGH | depends: TASK-27-01 | criteria: Clicking PTS sorts by total cumulative points; clicking PROG sorts by curriculum completion; clicking GRD sorts by mastery percentage; default first-click sort direction is descending for academic performance metrics
- [x] **TASK-27-04** | Authoritative Grading Engine Synchronization (`api.js`, `class.js`, `dashboard.js`, `app.js`) | HIGH | depends: TASK-27-01 | criteria: Centralized `calculateOverallStudentScore` exported in `api.js` & `grading.js`; synchronized across class roster, dashboard banner, and class reports
- [x] **TASK-27-05** | Automated Playwright Verification & Screenshot Validation | HIGH | depends: TASK-27-01..TASK-27-04 | criteria: Verified that student with perfect scores on taken assessments displays 100% Grade S without being dragged down by locked modules; screenshot `class_roster_calibrated_scores.png`

---

## 🎯 PHASE 31: TYPOGRAPHY POLISH, TABULAR NUMS & MATRIX REFINEMENTS

- [x] **TASK-31-01** | Tabular Numbers for Data Grids, Timers & Metrics | HIGH | depends: none | criteria: `font-variant-numeric: tabular-nums;` applied across `.table-wrap`, `.data-grid`, `.datagrid-table`, `#class-attendance-grid`, `#assessment-timer`, `#timer-display`, `.result-summary-val`, `.badge`, `.score-val`, `.matrix-cell`
- [x] **TASK-31-02** | Font-Weight Hierarchy & Contrast Elevation | MEDIUM | depends: none | criteria: Elevate muted text tokens from `#64748B` to `#94A3B8` / `#CBD5E1`; Headings/KPIs 700, Tables/Buttons 500/600, Subtitles/helpers 400
- [x] **TASK-31-03** | Student Roster PROGRAM Column & Age Sanitization | HIGH | depends: none | criteria: Standalone PROGRAM column rendered between INSTITUTION and BATCH; `birth_date` null/0 renders `—` (0 standalone "0 yrs"); `.actions-col` enforces `gap: 6px;`
- [x] **TASK-31-04** | Class Roster Attendance Matrix Native Tooltips & Summary Row | HIGH | depends: none | criteria: 40 assessment header cells equipped with active native `title` tooltips; docked summary row `★ CLASS AVERAGE (KELAS)` displays class-wide completion and average points
- [x] **TASK-31-05** | Playwright Desktop Verification (1600x900) & Strict Git Freeze | HIGH | depends: TASK-31-01..TASK-31-04 | criteria: 100% PASS rate across all verified views; 0 commits, 0 pushes

