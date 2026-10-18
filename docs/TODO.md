# LIVE SYSTEM REPAIR & FULL CUMULATIVE E2E RUN (Siti Qori', Camp 131, Level 3) -- ACTIVE DIRECTIVE

- [x] Task 1: Safe clean state - purge dangling previous test attempts for Siti Qori.
- [x] Task 2: Fix `assessments.answer_type` DB column sync & backfill existing records.
- [x] Task 3: Fix `QS: 0` counter in Admin UI to calculate dynamic vault question counts.
- [x] Task 4: Fix `PUBLISHED ASSESSMENTS` top card counter query in Admin Hub.
- [x] Task 5: Enforce Cumulative Timing (60m/theme), Max 2 Retakes & Batch Insertion in backend.
- [x] Task 6: Auto-generate full Level 3 assessment suite (16 Words Tasks, 16 Phrases Tasks, 4 Cumulative Words Tests, 4 Cumulative Phrases Tests).
- [x] Task 7: Real-data simulation - Siti Qori completes Theme A (Tasks + Test).
- [x] Task 8: Real-data simulation - Siti Qori completes Theme B (Tasks + Cumulative Test).
- [x] Task 9: Real-data simulation - Siti Qori completes Theme C (Tasks + Cumulative Test).
- [x] Task 10: Real-data simulation - Siti Qori completes Theme D (Tasks + Final 640W/160P Cumulative Test).
- [x] Task 11: Verify 'Level Completed' status trigger on Theme D graduation.
- [x] Task 12: Output Full Diagnostic & Verification Report.
- [x] Task 13: Migrate database to fresh production Supabase project (`oclajpyumehpojepcczg`).
- [x] Task 14: Verify live client SDK connectivity, RLS, Storage, and RPCs.
- [x] Task 15: Ready for deployment to Netlify / Vercel.

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

