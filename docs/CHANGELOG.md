# TopsCore LMS — Active Changelog (Phases 548–572)

> **Format:** Ultra-Condensed Active Changelog (Strict 25-Phase Rolling Window per AGENTS.md §5.3). Each entry highlights core functional deliverables, architectural milestones, and affected systems.
> **Full Archives:** Historical verbose logs for earlier phases are preserved in:
> - [`docs/archive/CHANGELOG_ARCHIVE.md.gz`](file:///docs/archive/CHANGELOG_ARCHIVE.md.gz) (Phases 1–228, Gzip Compressed)
> - [`docs/archive/CHANGELOG_ARCHIVE_2.md.gz`](file:///docs/archive/CHANGELOG_ARCHIVE_2.md.gz) (Phases 229–451, Gzip Compressed)
> - [`docs/archive/CHANGELOG_ARCHIVE_3.md.gz`](file:///docs/archive/CHANGELOG_ARCHIVE_3.md.gz) (Phases 452–539, Gzip Compressed)

---

## [2026-11-15 19:00] — Phase 572: Alumni Main Panel Routing & Clickability Resolution
- **Perbaikan Click & Routing Panel Alumni (SSOT)**:
  - Menyelesaikan masalah item navigasi Alumni tidak bisa ditekan dengan menambahkan handler routing resmi `case 'alumni':` pada switch statement `loadSection` ([js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js)).
  - Mengintegrasikan section metadata `alumni: 'Alumni'` pada `sectionTitles` dan `alumni: 'BOARD'` pada `sectionDomainMap`.
  - Mengikat fail-safe direct click listener dan cursor pointer pada `#sidebar-alumni-item` di `loadSidebarPrograms()` dan menambahkan inline `onclick` di [admin.html](file:///d:/Drives/Tutor%20Tampan/TopsCore/admin.html).
  - Mengekspos `window.loadSection = loadSection;` secara dini tepat setelah definisinya di [js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js).
- **Pengenalan Sempurna 20 Siswa Alumni & Query program_status**:
  - Menambahkan kolom `program_status` ke query `adminFetchAll('students')` di [js/admin/student-management.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/student-management.js).
  - Memperbarui pengenal `isStudentAlumni` agar menyertakan status `PROGRAM_COMPLETED`, sehingga seluruh 20 siswa alumni dari Supabase tampil lengkap.
- **Verification**:
  - Pengujian E2E headless browser mengonfirmasi klik `#sidebar-alumni-item` berhasil membuka rute `#alumni`, mengaktifkan tab KPI Alumni, dan me-render 20 baris tabel siswa alumni dengan 100% data akurat.
  - Seluruh 28 test suites berjalan 100% green dalam 17.8s tanpa regresi.

## [2026-11-15 18:00] — Phase 571: Dedicated Theme STATUS Column & Pure Canonical GRADE Invariant
- **Kolom Baru STATUS & Separation of Concerns (SSOT)**:
  - Menambahkan kolom ke-5 `STATUS` di samping kolom `GRADE` pada setiap tema (`THEME A`, `B`, `C`, `D`) matriks nilai kelas ([js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js)).
  - Kolom `STATUS` menampilkan: Centang hijau (**✓** / `check-circle`) untuk kelulusan normal ($\ge 60\%$), Kuning **`R`** untuk remedial, Merah **`F`** untuk forgiven waiver, Tactical Cyan **`M`** untuk manual override, dan Strip (**—**) untuk belum lulus/belum ujian.
  - Checkbox interaktif untuk mode `Remedi (R)` dan `Forgive (F)` Sub Panel muncul langsung di dalam kolom `STATUS`.
- **Kolom GRADE Murni Nilai Akademik**:
  - Kolom `GRADE` murni menampilkan grade kanonik siswa (**★, A, B, C, D, E** atau lock) berdasarkan skor riil dan persentase, tanpa pernah ditimpa oleh token administratif `M`, `R`, atau `F`.
- **Penyelesaian Tuntas Constraint `check_attempts_grade`**:
  - Memperbaiki `adminApplyForgiven`, `saveRowManualInput`, `saveAllManualDrafts`, dan `toggleCellRemedial` di [js/api.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/api.js) dan [js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js) agar selalu menyimpan grade kanonik ('★'..'E') ke kolom `attempts.grade`, sedangkan status administratif tersimpan aman di metadata/flag (`is_forgiven`, `is_remedial`, `forgiven_reason`).
- **Styling Continuous Divider & Quadrant Header**:
  - Menetapkan continuous neutral divider 2px solid (`rgba(255,255,255,0.22)`) pada `col-test-theme-status` dan mengaplikasikan warna kuadran tematik A, B, C, D pada label header `STATUS` ([css/admin.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/admin.css)).
- **Verification**:
  - Seluruh test fast, test table invariants (10/10 pilar), super headers divider test (16/16), dan smart test runner 100% PASS.

## [2026-11-15 17:30] — Phase 570: Manual Edit Deferred Batch Save & Confirmation Prompt on Exit
- **Eradikasi Premature Auto-Save on Blur**:
  - Menghapus seluruh event `onblur` dari input nilai matriks kelas (`input-matrix-task-progress`, `input-matrix-exam-score`, `input-matrix-exam-pts`).
  - Pengguna bebas mengetik, berpindah sel (tab/klik), dan mengedit nilai banyak siswa tanpa gangguan network request di tengah proses.
- **Simpan Terpadu Hanya Saat Tombol Edit Selesai Ditekan**:
  - Semua perubahan disimpan dalam in-memory drafts (`window._manualInputState.drafts`).
  - Saat tombol **`Done Editing (Manual)`** atau tombol `Escape` ditekan, sistem mendeteksi apakah ada draft yang dimodifikasi (`hasDirtyManualDrafts`).
- **Window Prompt Save / Cancel (Dialog Konfirmasi Standar TopsCore)**:
  - Memunculkan dialog prompt konfirmasi terpadu:
    - **`Save Changes` (Cyan)**: Menyimpan seluruh draft perubahan secara batch ke database via `saveAllManualDrafts()`, mengunci kembali tabel, dan me-refresh matriks dengan toast sukses.
    - **`Cancel (Discard)` (Secondary)**: Membuang seluruh draft perubahan, mengunci kembali tabel, dan mengembalikan data asli dengan toast info.
    - Jika tidak ada perubahan, mode edit keluar langsung secara mulus tanpa memunculkan prompt.
- **Verification**:
  - Seluruh test suite lolos 100% hijau, AST syntax lolos 100%.

## [2026-11-15 17:15] — Phase 568: Direct Table Remedi & Forgive Inline Checkboxes (Zero Pop-ups, Capped R & Waiver F)
- **Eliminasi Pop-up Wizard Remedi & Forgive (Zero Pop-up Invariant)**:
  - Pop-up wizard untuk Remedi dan Forgiven dibuang total sesuai arahan pengguna.
  - Tombol Sub Panel **`Remedi (R)`** (Kuning) dan **`Forgive (F)`** (Merah) kini mengaktifkan mode inline langsung pada tabel matriks kelas ([js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js)).
- **Tanda Centang / Checkbox Interaktif di Samping Kolom Grade**:
  - Saat mode Remedi atau Forgive aktif, tanda centang/checkbox muncul di samping simbol nilai pada kolom `GRADE`:
    - **Remedial (R)**: Nilai setinggi apapun turun menjadi batas maksimum ujian tersebut (capped 60%) dan mendapatkan Grade **`R`** (`var(--grade-c)`). Saat uncheck, kembali normal.
    - **Forgiven (F)**: Nilai siswa berapapun tidak dinaikkan, hanya dianggap selesai dan **PASSED** saja, serta berstatus Grade **`F`** (`var(--grade-e)`). Saat uncheck, status waiver dicabut.
  - Memperbarui `theme_${tc}_grade` render dan fungsi backend `toggleCellRemedial` serta `toggleCellForgiven`.
- **Single Active Sub Panel Mode & Anti-Shift Dimensions**:
  - Tombol Manual, Remedi, dan Forgive bersifat mutually exclusive. Menekan Escape keluar dari seluruh mode edit.
- **Verification**:
  - Seluruh 28/28 regression test suites lolos 100% (48.07s).

## [2026-11-15 17:05] — Phase 567: Universal Terminology Standardization ('RATE' Metric, Zero Cohort/Assessment/Subject/Quiz)
- **Standardisasi Metrik SCORE Menjadi RATE**:
  - Kolom nilai persentase pada matriks kelas ([js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js), [js/admin/class.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/class.js), [js/admin/tests-management.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/tests-management.js), [js/admin/datagrid.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/datagrid.js)) resmi dinamai **`RATE`** (4-huruf pas). Membedakan secara mutlak antara persentase kelulusan/akurasi (`RATE` %) dan akumulasi poin jawaban benar (`POINT` PTS): $\text{PROG} \rightarrow \text{RATE} \rightarrow \text{POINT} \rightarrow \text{GRADE}$.
- **Pembersihan Menyeluruh Istilah Rancu Sesuai Arahan Pengguna**:
  - **Zero Cohort**: Istilah `cohort` dibersihkan 100% dan diseragamkan menjadi **`Batch`** di seluruh modal transfer, modal re-enroll, info enrollment, dan tabel duplikat.
  - **Zero Subject & Zero Class Board**: Seluruh kemunculan label `Class Board` dan `Subject` dibersihkan menjadi **`Class`**.
  - **Zero Assessment**: Seluruh istilah orphan `assessment` di dashboard siswa, halaman hasil, dan test room dinormalisasi menjadi **`Test`**.
  - **PASSED Column Standard**: Header kolom jumlah tes selesai di Student Roster diubah dari `COMPLETED` menjadi **`PASSED`** (micro `PASS`).
  - **Zero Quiz Legacy**: Seluruh sisa ID modal dan label wizard pada [js/admin/auto-gen-modal.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/auto-gen-modal.js) dibersihkan dari `quiz` menjadi **`task`**.
- **Verification**:
  - 10/10 Pilar Standardisasi Tabel lolos 100%. Spatial layout lolos 100%. AST Syntax 51/51 berkas lolos 100%. Workspace hygiene lolos 100%.

## [2026-11-15 16:50] — Phase 566: Alumni Main Panel in Board & Hold-Inactive Category Consolidation
- **Main Panel Alumni di Domain B (B — BOARD)**:
  - Menambahkan menu navigasi mandiri **Alumni** di bawah Domain B pada sidebar navigasi ([admin.html](file:///d:/Drives/Tutor%20Tampan/TopsCore/admin.html)), ter-pin di posisi paling bawah Domain B ([js/admin/admin-init.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/admin-init.js)).
  - Mengintegrasikan router `#alumni` dengan title **Alumni** di Domain B ([js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js)), memanggil modul Student Roster khusus seluruh siswa berstatus Alumni se-lembaga (`isAlumniPanel: true`).
  - Menyediakan filter graduating batch di Sub Panel Infobar untuk memudahkan navigasi angkatan kelulusan.
- **Konsolidasi Status Hold & Inactive dalam Satu Tabel Bersama (Single-Table Invariant)**:
  - Menggabungkan tab `Hold Students` dan `Inactive Students` menjadi satu kategori tab: **`Hold & Inactive`** ([js/admin/student-management.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/student-management.js)).
  - Siswa berstatus Hold dan Inactive tampil berdampingan dalam satu tabel bersama tanpa fragmentasi layout, dengan badge/label status yang jelas di kolom `STATUS` (Hold kuning, Inactive slate).
  - Merampingkan topbar tabs batch reguler menjadi 3 tab bersih: **Active Students**, **Hold & Inactive**, dan **All Students** (tab Alumni diekstrak ke panel mandiri).
- **Verification**:
  - Seluruh 28/28 regression test suites lolos 100% (21.70s).


## [2026-11-15 16:30] — Phase 565: Strict Role Separation for Special Grades (Admin/Tutor 'M'/'R'/'F' vs Student Canonical Score Grade)
- **Pemisahan Tegas Tampilan Nilai Siswa vs Admin/Tutor**:
  - **Eksklusivitas Layar Admin & Tutor**: Simbol khusus `M` (Manual Score Cyan `#38bdf8`), `R` (Remedial Kuning `var(--grade-c)`), dan `F` (Forgiven Merah `var(--grade-e)`) HANYA tampil pada tabel "Students Grade and Score" di layar Admin dan Tutor ([js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js)).
  - **Tampilan Nilai Bersih Berdasarkan Skor untuk Siswa**:
    - Pada Student Dashboard ([js/dashboard.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/dashboard.js)), kartu tes, daftar asesmen, sub-baris tugas, dan leaderboard secara tegas menghitung simbol grade dari persentase skor siswa (`calculateGrade(percentage)`: `★`, `A`, `B`, `C`, `D`, `E`).
    - Pada Result Page ([js/result.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/result.js)), siswa (`!isAdminSession`) selalu melihat grade kanonik hasil perhitungan skor murni tanpa pernah melihat huruf internal `M`, `R`, atau `F`.
    - Di [js/grading.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/grading.js), `getGradeSymbol(grade, percentage)` memprioritaskan grade kanonik dari skor bila parameter persentase tersedia.
- **Verification**:
  - Seluruh 28/28 parallel regression test suites lolos 100% (16.71s).


## [2026-11-15 16:15] — Phase 564: Categorical Entity Standardization (Student, Class, Batch, Test Status & Types)
- **Standarisasi Taksonomi Status & Tipe Entitas Sistem (Rule 2.27 SSOT)**:
  - **Status Siswa (`students.program_status` / `is_active`)**: Resmi menjadi **`ACTIVE`**, **`HOLD`**, **`ALUMNI`**, dan **`INACTIVE`**. Istilah legacy `graduated` dan `completed` dihapus total dan dikonsolidasikan menjadi `ALUMNI`. Status `HOLD` disiapkan sebagai tab mandiri dan target siswa yang berhenti di tengah jalan atau tidak naik bersama batchnya.
  - **Status Kelas (`classes.is_active`)**: Mutlak **`ACTIVE`** dan **`INACTIVE`** (`archived` dinormalisasi ke `INACTIVE`).
  - **Status Batch (`batches.is_active`)**: Mutlak **`ACTIVE`** dan **`INACTIVE`** (status `completed` ditiadakan).
  - **Status Ujian/Tes (`tests.status`)**: Mutlak **`PUBLISHED`** dan **`DRAFT`** (`unpublished` dan `archived` dinormalisasi ke `DRAFT`).
  - **Tipe Ujian (`tests.test_type` / `tests.category`)**: Mutlak **`TASK`** dan **`EXAM`**. Istilah legacy `quiz` dibersihkan dari primary type.
- **Pembaruan Modul Terdampak**:
  - [js/admin/student-management.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/student-management.js): Tab filter (Active, Hold, Inactive, Alumni, All), kolom STATUS dropdown options (`active`, `hold`, `alumni`, `inactive`), auto-save inline edit, lifecycle promote/transfer/re-enroll.
  - [js/admin/test-builder.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/test-builder.js): Radio button tipe ujian (`TASK` & `EXAM`), resolver status & tipe.
  - [js/admin/tests-management.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/tests-management.js): Drawer filter `task` vs `exam`, telemetry pacing, session modal query.
  - [js/admin/classes-management.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/classes-management.js) & [js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js): Normalisasi status ke `PUBLISHED` dan `DRAFT`.
  - [js/api.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/api.js): Generator test payload resolusi type `task` dan `exam`.
  - [AGENTS.md](file:///d:/Drives/Tutor%20Tampan/TopsCore/AGENTS.md): Mengodifikasi aturan baru di Section 2.14 dan Section 2.27.
- **Verification**:
  - Seluruh 28/28 regression test suites lolos 100%. Workspace hygiene lolos 100%.


## [2026-11-15 15:55] — Phase 563: Purge Student Roster Table Footer (Exclusivity to Student Grade Matrix)
- **Penghapusan Total Footer / Baris Summary pada Student Roster**:
  - Memenuhi instruksi baku pengguna: baris footer rata-rata ("BATCH AVERAGE ...") dihapus total dari tabel Student Roster ([js/admin/student-management.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/student-management.js)).
  - Footer baris ringkasan rata-rata kini berlaku eksklusif hanya pada tabel **Student Test and Grade** (Class Hub attendance matrix di [js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js)).
  - Mengupdate [js/admin/datagrid.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/datagrid.js) agar elemen `tfoot` disembunyikan (`display: none; innerHTML = ''`) saat tabel tidak mengonfigurasikan `summaryRow`.
  - Memperbarui suite tes [scripts/test_lower_panel_and_dynamic_columns.mjs](file:///d:/Drives/Tutor%20Tampan/TopsCore/scripts/test_lower_panel_and_dynamic_columns.mjs) untuk memvalidasi ketiadaan footer pada Student Roster dan keberadaannya yang eksklusif pada Student Grade.
- **Verification**:
  - Seluruh 28/28 regression test suites lolos 100%.


## [2026-11-15 15:50] — Phase 562: Gender Header Abbreviation Standardization ('SEX' Strictly, Purge 'GNDER')
- **Standarisasi Singkatan Header Gender (Hanya 3-Huruf 'SEX')**:
  - Memenuhi instruksi baku pengguna: header `GENDER` saat disingkat tidak boleh memiliki bentuk 5-huruf (`GNDER`), melainkan cukup 3-huruf baku **`SEX`**.
  - Mengunci kamus SSOT `HEADER_ABBREVIATIONS['GENDER']` di [js/admin/datagrid.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/datagrid.js) menjadi `{ full: 'GENDER', medium: 'SEX', short: 'SEX' }`.
  - Mendaftarkan entri alias `'SEX'` dalam kamus singkatan DataGrid.
  - Memperbarui kolom `gender` pada tabel Student Roster ([js/admin/student-management.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/student-management.js)) dengan `shortLabel: 'SEX', microLabel: 'SEX'`.
  - Memperbarui aturan SSOT di [.agents/rules/ui-invariants.md](file:///.agents/rules/ui-invariants.md) §4.2.2 dan [tasks.md](file:///d:/Drives/Tutor%20Tampan/TopsCore/tasks.md).
- **Verification**:
  - Verifikasi langsung via Node.js mengonfirmasi resolusi header kolom gender (lebar 68px) kini selalu menghasilkan `'SEX'`, dan resolusi lebar sempit (< 55px) juga menghasilkan `'SEX'`.
  - Seluruh 28/28 regression test suites lolos 100%.


## [2026-11-15 15:45] — Phase 561: Database Constraint Expansion for Special Grades ('M', 'R', 'F')
- **Penyelesaian Bug Constraint `check_attempts_grade`**:
  - Mengidentifikasi akar masalah kegagalan simpan edit manual: tabel `public.attempts` di PostgreSQL memiliki constraint `check_attempts_grade` yang sebelumnya hanya mengizinkan `('★', 'A', 'B', 'C', 'D', 'E')`. Saat proses simpan manual mengeksekusi insert/update dengan `grade: 'M'`, database menolak operasi tersebut.
  - Membuat dan mengeksekusi migrasi resmi [supabase/migrations/20261115000000_allow_special_grades_in_attempts_constraint.sql](file:///d:/Drives/Tutor%20Tampan/TopsCore/supabase/migrations/20261115000000_allow_special_grades_in_attempts_constraint.sql).
  - Memperluas check constraint PostgreSQL secara live menjadi:
    `CHECK (grade IN ('★', 'A', 'B', 'C', 'D', 'E', 'R', 'F', 'M') OR grade IS NULL)`.
  - Memperbarui [docs/DATABASE_SCHEMA.md](file:///d:/Drives/Tutor%20Tampan/TopsCore/docs/DATABASE_SCHEMA.md) dan membangun ulang [supabase/clean_migration_bundle/consolidated_schema.sql](file:///d:/Drives/Tutor%20Tampan/TopsCore/supabase/clean_migration_bundle/consolidated_schema.sql).
- **Verifikasi**:
  - Pengujian live Supabase JS SDK mengonfirmasi penyimpanan attempt dengan `grade = 'M'` berhasil 100% tanpa error constraint.


## [2026-11-15 15:40] — Phase 560: Photo Header Abbreviation Standardization ('PIC' Replacing 'PHT')
- **Standarisasi Singkatan 3-Huruf Kolom Foto ('PIC')**:
  - Mengganti singkatan mikro 3-huruf untuk header kolom foto dari `PHT` menjadi **`PIC`** (mewakili kata *picture* / *photo* yang jauh lebih intuitif dan standar).
  - Memperbarui kamus SSOT `HEADER_ABBREVIATIONS['PHOTO']` di [js/admin/datagrid.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/datagrid.js) menjadi `{ full: 'PHOTO', medium: 'PHOTO', short: 'PIC' }`.
  - Mendaftarkan entri alias `'PICTURE'` dan `'PIC'` dalam kamus singkatan DataGrid.
  - Memperbarui definisi kolom `photo_url` di [js/admin/student-management.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/student-management.js) dengan `microLabel: 'PIC'`.
  - Memperbarui aturan SSOT di [.agents/rules/ui-invariants.md](file:///.agents/rules/ui-invariants.md) §4.2.2 dan [tasks.md](file:///d:/Drives/Tutor%20Tampan/TopsCore/tasks.md).
- **Verification**:
  - Eksekusi langsung via Node.js mengonfirmasi resolusi `resolveHeaderLabel('PHOTO', 46)` mengembalikan `'PIC'`.
  - Seluruh 28/28 regression test suites lolos 100%.


## [2026-11-15 15:35] — Phase 559: Student Roster SECURITY Super-Header & Dedicated PIN Column
- **Super-Header Kategori SECURITY**:
  - Mengelompokkan kolom `PIN` dan `STATUS` ke dalam satu kesatuan kategori super-header bertajuk **`SECURITY`** (`colSpan: 2`, class `super-hdr super-hdr-security`).
  - Styling super-header SECURITY konsisten dengan desain netral modern TopsCore (`text-transform: uppercase`, padding rapat, warna label netral slate).
- **Kolom Personal PIN Siswa di Sebelah Kiri Kolom STATUS**:
  - Menambahkan kolom `PIN` (lebar 70px, min-width 65px) tepat di sebelah kiri kolom `STATUS` (90px) pada tabel Student Roster ([js/admin/student-management.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/student-management.js)).
  - Mengambil data `pin_hash` dari database Supabase (`students` table) dan me-resolve PIN otentik siswa (default dummy `'1234'`) untuk langsung ditampilkan secara elegan di tabel.
  - Nilai PIN dirender dengan font monospace tegas dan warna tactical cyan (`#38bdf8`) dengan tooltip `title="Student Personal PIN: ..."`.
  - Kolom `STATUS` dilengkapi kelas `super-hdr-divider` untuk batas vertikal tebal 2px netral (`border-right: 2px solid rgba(255, 255, 255, 0.22)`) di sebelah kanannya sebagai pembatas akhir grup kategori SECURITY.
- **Tfoot Summary Row & Sorting Integration**:
  - Summary row `tfoot` diperbarui untuk menampilkan `—` pada sel `pin` dan divider tebal pada kolom `program_status`.
  - Pengurutan data (sort) terintegrasi untuk kolom PIN (`sortKey === 'pin'`).
- **Strict STATUS Non-Abbreviation Guard**:
  - Kolom `STATUS` di bawah kategori `SECURITY` dijamin 100% tidak pernah disingkat menjadi `STATS` atau `STT`, selalu tampil utuh sebagai `STATUS`.
- **Verification**:
  - Headless browser test memverifikasi penempatan tepat kolom PIN di sebelah kiri STATUS, super-header SECURITY dengan colSpan: 2, dan border divider 2px netral.
  - Seluruh 28/28 regression test suites lolos 100%.


## [2026-11-15 15:30] — Phase 558: Sub Panel Buttons Outline vs Solid & Anti-Layout-Shift Fixed Dimensions
- **Standarisasi Outline vs Solid Penuh pada Tombol Sub Panel**:
  - **Saat Tidak Aktif (Idle)**: Tombol Manual, Remedi, dan Forgive tampil elegan hanya dengan font dan garis border kotak berwarna (`#38bdf8` untuk Manual, `var(--grade-c)` untuk Remedi, `var(--grade-e)` untuk Forgive) dan latar transparan (`background: transparent`).
  - **HANYA Tombol yang Aktif yang Berwarna Solid Penuh**:
    - Tombol Manual aktif (`Done Editing (Manual)`): latar solid biru `#0284c7`, font `#ffffff`, border `#38bdf8`.
    - Tombol Remedi aktif (saat wizard terbuka): latar solid kuning `var(--grade-c)`, font `#0f172a`, border `var(--grade-c)`.
    - Tombol Forgive aktif (saat wizard terbuka): latar solid merah `var(--grade-e)`, font `#ffffff`, border `var(--grade-e)`.
- **Anti-Layout-Shift (Dimensi Tetap Berdasarkan Ukuran Terlebar)**:
  - Tombol Manual dikunci mati pada ukuran terlebar (`width: 175px; min-width: 175px; max-width: 175px; height: 30px;`) sehingga perpindahan label dari `Manual (M)` ke `Done Editing (Manual)` tidak mengubah lebar tombol sama sekali (0px pergeseran layout) dan tidak mendorong tombol Remedi maupun Forgive ke kanan.
  - Tombol Remedi dan Forgive dikunci stabil pada `width: 115px; min-width: 115px; max-width: 115px; height: 30px;`.
- **Sinkronisasi Otomatis Modal State & ESC Binding**:
  - `openQuickRemedialModal` dan `openQuickForgivenModal` di [js/admin/quick-score-wizards.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/quick-score-wizards.js) menyalakan flag `_classRemedialModalOpen` dan `_classForgivenModalOpen` saat dibuka, serta otomatis meresetnya saat ditutup (tombol Cancel, Save, atau tombol ESC) dengan memanggil `syncClassHubLowerPanel('attendance')`.


## [2026-11-15 15:18] — Phase 555: Onboarding Pop-up Direct Gender Cards (Zero Title Invariant)
- **Zero Title Invariant on Onboarding Modal**:
  - Membuang total teks judul ("WELCOME" maupun "GENDER") dari dalam pop-up modal onboarding (`#introduce-setup-modal`).
  - Modal kini langsung diawali oleh kartu pilihan gender persegi 110x110px Mars ♂ (`Mister`) dan Venus ♀ (`Miss`) dengan padding atas rapi 10px, dilanjutkan oleh DATE OF BIRTH, EDUCATION, dan ADDRESS.
- **Top Header Bar Student Name**:
  - Nama otentik siswa (**`ABDUL BASIT`**) tetap terpasang elegan di top header bar navigasi sebagai identitas utama saat pop-up ini aktif.
- **Verification & Visual Capture**:
  - Tangkapan layar otentik via Puppeteer: `screenshot_dashboard_modal_authentic.png` (low-res PNG, 77.5 KB, $390 \times 740\text{ px}$).
  - Pengujian syntax AST dan spatial invariants lulus 100%.


## [2026-11-15 15:15] — Phase 557: Strict STATUS Non-Abbreviation Invariant (Purge STATS/STT/STS)
- **Larangan Mutlak Singkatan 'STATS' dan 'STT/STS' pada Header STATUS**:
  - Memenuhi arahan baku pengguna: header dengan judul **STATUS jangan pernah disingkat** menjadi 5 huruf (`STATS`) atau 3 huruf (`STT` / `STS`) karena menimbulkan kerancuan makna yang rancu dengan istilah statistik (*statistics* / *stats*).
  - Memperbarui kamus `HEADER_ABBREVIATIONS['STATUS']` di [js/admin/datagrid.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/datagrid.js) menjadi `{ full: 'STATUS', medium: 'STATUS', short: 'STATUS' }`.
  - Menambahkan *early return guard* di fungsi `resolveHeaderLabel`: setiap label atau key yang bernilai `'STATUS'` selalu dikembalikan utuh sebagai `'STATUS'` tanpa memandang lebar kolom.
  - Memperlebar kolom `program_status` di [js/admin/student-management.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/student-management.js) menjadi 90px (min 85px) dengan label eksplisit `shortLabel: 'STATUS', microLabel: 'STATUS'`.
  - Memperbarui dokumentasi SSOT di [.agents/rules/ui-invariants.md](file:///.agents/rules/ui-invariants.md) §4.2.2 dan §5.1.
- **Verification**:
  - Script pengujian resolusi multi-lebar (30px s/d 120px) memverifikasi bahwa header STATUS 100% konsisten mengembalikan `'STATUS'`.
  - Seluruh 28/28 suites lolos 100% (`node scripts/run_all_tests_parallel.mjs`).


## [2026-11-15 15:05] — Phase 556: Purge Legacy Master Edit Mode & Fix Manual Edit Mode Exit / Re-lock Workflow
- **Pemusnahan Total Sistem Master Edit Mode (Pojok Kiri Bawah & Safety HUD)**:
  - Menghapus tombol toggle `#global-edit-mode-toggle` dan label `EDIT MODE` di sidebar footer kiri bawah ([admin.html](file:///d:/Drives/Tutor%20Tampan/TopsCore/admin.html)). Sidebar footer kini bersih menampilkan label identitas baku `TOPSCORE LMS`.
  - Menghapus elemen `#master-edit-safety-hud` ("MASTER EDIT MODE ACTIVE") di bottom banner. Banner bawah kembali murni menampilkan brand netral `TopsCore by Mr. Top`.
  - Seluruh proses edit data kini secara tegas berpindah ke halaman masing-masing secara spesifik.
- **Perbaikan Masalah Tidak Bisa Keluar dari Manual Edit Mode (Delegated Event Architecture)**:
  - Mengidentifikasi akar masalah: saat Sub Panel di-render ulang (`syncClassHubLowerPanel`), elemen tombol digantikan oleh string HTML baru sehingga listener klik pada tombol lama terputus.
  - Menerapkan *delegated event listener* pada level `document` di [js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js) yang mendengarkan event `#btn-subpanel-manual`.
  - Klik pada tombol `[✓ Done Editing (Manual)]` kini **PASTI 100% terpicu** untuk mematikan mode manual, mengunci kembali tabel ke mode *read-only*, dan mengubah label tombol kembali ke `Manual (M)`.
  - Menambahkan listener tombol `ESC` untuk keluar dari mode edit secara instan.
- **Isolasi Styling Manual Edit (`class-manual-edit-on`)**:
  - Mengisolasi mode manual menggunakan class `class-manual-edit-on` pada `document.body` tanpa menyentuh status global `global-edit-mode-on`.
  - White Excel Gridlines (`rgba(255, 255, 255, 0.45)`) menyala saat mode manual aktif dan langsung hilang/terkunci saat mode selesai.
- **Verification**:
  - Script pengujian headless Chromium mengonfirmasi: `bottomLeftToggleFound: false`, `safetyHudFound: false`, siklus Enter manual mode (`isManualScoreEditMode: true`, tombol bertransformasi `Done Editing (Manual)`), dan siklus Exit manual mode (`isManualScoreEditMode: false`, tombol kembali `Manual (M)`, tabel terkunci kembali).
  - Tangkapan layar visual: `ss_table_after_exit_manual.png`.
  - Seluruh test suites dan syntax preflight lolos 100%.


## [2026-11-15 14:55] — Phase 554: Student Academic Profile Modal Overhaul (Top Full Name, Symmetrical DoB-Age-Sex-Adr, Classes List & Zero-Glow Tactical PIN)
- **Top Full Name with Thin Underline**:
  - Memindahkan nama lengkap siswa (`#prof-student-name`, e.g. `Miss Shelia Mulyaning Putri`) ke posisi paling atas di bawah Title Area (`PROFILE`) dengan pembatas tipis (`border-bottom: 1px solid rgba(255, 255, 255, 0.15); padding-bottom: 5px; margin: 0 0 8px 0;`).
- **38% - 62% Proportional Split & 80x80 Photo**:
  - Kartu identitas utama dibagi proporsional 38% kolom foto (foto square 80x80 terpusat) dan 62% kolom biodata (`DoB`, `Age`, `Sex`, `Adr`).
  - Kolom alamat membentang dalam 3 baris teks secara utuh tanpa terpotong (`Pejeruk, Ampenan, Mataram, West Nusa Tenggara`), dengan titik dua (`:`) sejajar tegak lurus secara matematis.
- **Section 2 Replaced with CLASSES (Pure Grade Descriptions)**:
  - Menggantikan bagian Address dengan kartu `CLASSES` berisi tabel 2 kolom: nama kelas di kolom kiri (rata kiri) dan murni deskripsi predikat grade di kolom kanan (rata kanan, e.g. `Excellent`, `Good` tanpa simbol grade) dalam warna grade resmi TopsCore.
- **Zero-Glow Tactical Blue PIN Card**:
  - Membatalkan semua efek glow (`box-shadow: none !important; text-shadow: none !important;`).
  - Mengubah ikon gembok dan kotak PIN dari nuansa pink menjadi Tactical Blue (`#38bdf8`) dan slate (`#0f172a`). Total tinggi modal dialog ~545px (bebas scroll vertikal di layar 844px).


## [2026-11-15 14:35] — Phase 553: Sub-Header Vertical Divider Specificity & Continuous 2px Neutral Border Fix
- **Perbaikan Garis Vertikal Tebal Terputus di Row 2 Sub-Header (Gambar 2 Matriks Kelas)**:
  - Mengatasi akar masalah spesifisitas CSS di [css/admin/admin-tables.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/admin/admin-tables.css) di mana selektor `#class-attendance-grid thead tr:nth-child(2) th` (1-1-3) menimpa aturan divider 2px solid neutral (`rgba(255, 255, 255, 0.22)`).
  - Menambahkan pengecualian `:not(.super-hdr-divider):not(.col-test-theme-grade):not([class*="col-test-theme-grade"]):not(.col-bp-sep)` pada aturan default sub-header `border-right: 1px solid rgba(255, 255, 255, 0.12)`.
  - Memperkuat selektor berbobot tinggi untuk sub-header Row 2 (`#class-attendance-grid thead tr:nth-child(2) th.super-hdr-divider`, `#class-attendance-grid thead tr:nth-child(2) th.col-test-theme-grade`, `.datagrid-thead tr:nth-child(2) th.super-hdr-divider`) dengan `border-right: 2px solid rgba(255, 255, 255, 0.22) !important;`.
  - Menambahkan class `super-hdr-divider` secara eksplisit pada kolom `theme_${tc}_grade` di [js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js).
- **Verification**:
  - Live computed style test via Chromium/Playwright mengonfirmasi `thThemeB_borderRight`, `thGrade_borderRight`, dan `tdGrade_borderRight` seluruhnya bernilai identik: `2px solid rgba(255, 255, 255, 0.22)` (tebal bersambung sempurna dari Row 1 ke Row 2 hingga ke Body).
  - Seluruh 28/28 suites lolos 100% (`node scripts/run_all_tests_parallel.mjs`).


## [2026-11-15 15:05] — Phase 552: Onboarding Pop-up Title (GENDER), Immediate Choices & Top Header Bar Student Name Standard
- **Top Header Bar Student Name Display**:
  - Saat pop-up onboarding (`#introduce-setup-modal`) aktif, nama otentik siswa (**`ABDUL BASIT`**) langsung ditampilkan pada top header bar (`#dashboard-header-class-name`), menggantikan teks statis TOPSCORE.
- **Onboarding Modal Title Area (GENDER) & Immediate Choices**:
  - Teks "WELCOME" dihapus dari modal, digantikan langsung oleh judul **`GENDER`** (16px Outfit Bold ALL CAPS, Tactical Cyan `#38bdf8`) dengan garis pembatas tegas 1.5px netral (`border-bottom: 1.5px solid rgba(255, 255, 255, 0.16)`).
  - Tepat di bawah garis Title Area `GENDER` (spasi 10px), langsung hadir pilihan kartu gender Mars ♂ (`Mister`) dan Venus ♀ (`Miss`), diikuti berurutan oleh DATE OF BIRTH, EDUCATION, dan ADDRESS.
  - Nama siswa murni berada di top bar dan tidak muncul di dalam pop-up window.
- **Verification & Visual Capture**:
  - Tangkapan layar otentik via Puppeteer: `screenshot_dashboard_modal_authentic.png`.
  - Seluruh pengujian syntax dan spatial invariants lolos 100%.


## [2026-11-15 14:15] — Phase 551: Universal Neutral Horizontal Table Boundaries & Sticky Header Stacking Protection
- **Eliminasi Tabrakan & Kebocoran Header Saat Scrolling**:
  - Memperbaiki selektor sub-header di [css/admin/admin-tables.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/admin/admin-tables.css): menghapus pengecualian `:not(.super-hdr-divider)` yang sebelumnya menyebabkan kolom pembatas (NAME, EDUCATION, PROVINCE, EXAM 4) melompat ke `top: 0` dan bertabrakan dengan super-header Row 1.
  - Memperkuat inline sticky style di [js/admin/datagrid.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/datagrid.js) untuk menjamin seluruh sel sub-header Row 2 terkunci di `top: 30px; z-index: 19/21; background: #0f172a;` dan standalone spanning headers (`rowspan="2"`) terkunci di `top: 0; z-index: 25/26; height: 60px;`.
  - Mengubah background transparan super-header kelas di [js/admin/student-management.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/student-management.js) menjadi solid `#141a2e` agar data tabel tidak tembus pandang saat di-scroll.
- **Standarisasi Garis Pembatas Horizontal Tegas & Netral (Header-Body & Body-Footer SSOT)**:
  - Header Bottom Boundary: Memasang garis pembatas tegas 2px solid netral (`border-bottom: 2px solid rgba(255, 255, 255, 0.28) !important;`) pada baris sub-header Row 2 dan standalone spanning headers.
  - Footer Top Boundary: Memasang garis pembatas tegas 2px solid netral (`border-top: 2px solid rgba(255, 255, 255, 0.28) !important;`) pada semua sel summary row tfoot, serta memusnahkan seluruh sisa border cyan (`rgba(56, 189, 248, 0.6)`) atau warna tematik pada divider footer.
- **Verification**:
  - Seluruh 28/28 test suites lulus 100% (`node scripts/run_all_tests_parallel.mjs`), termasuk pengujian layout `test_admin_headers_footers_standardization.mjs` dan `test_universal_table_standardization.mjs`.


## [2026-11-15 14:32] — Phase 550: Pop-Up 05 (Student Profile Modal) Modernization (Square 100x100 Avatar, Underlined Honorific Name, Aligned Sex/DoB/Age Colons, Centered Education & Grade-Themed Visible PIN Badge)
- **Sex, DoB, Age Labels with Vertically Aligned Colons (`:`)**:
  - Mengubah istilah `Gender` menjadi singkatan 3-huruf resmi **`Sex`** bersama **`DoB`** dan **`Age`**.
  - Mengimplementasikan layout tabel vertikal presisi (`.profile-hero-meta-table`, `.profile-meta-lbl`, `.profile-meta-colon`) sehingga tanda titik dua (`:`) berbaris lurus sejajar ke bawah secara matematis.
- **Thin Line Under Student Name**:
  - Menambahkan garis pembatas tipis (`border-bottom: 1px solid rgba(255, 255, 255, 0.15)`) di bawah nama bergelar siswa.
- **Grade-Themed Visible PIN Badge (Zero "Personal PIN" & Status Text)**:
  - Menghapus teks "Personal PIN" dan status "**** • Active"; digantikan dengan ikon gembok solid, kotak badge PIN monospaced, dan tombol `CHANGE PIN` bertema tegas.
  - Nuansa warna kartu Security, badge PIN, border, glow, dan tombol secara dinamis dan tegas mengikuti token warna grade resmi siswa (`var(--prof-grade-color)`: Grade Star `#ff2d87`, Grade A `#00c000`, Grade B `#95ff00`, dsb).
  - Terverifikasi secara realtime pada dua akun siswa riil: Shelia Mulyaning Putri (Star ★ Pink) dan Muhammad Ariwil Asrori (Grade B Lime).
- **Square 100px × 100px Profile Photo**:
  - Mengubah avatar dari bentuk lingkaran menjadi **persegi 100px × 100px** dengan sudut rounded halus 10px (`.profile-avatar-square`, `border-radius: 10px`) dan badge kamera persegi 6px.
- **Centered Education & Lock Icon Removal**:
  - Menghapus ikon gembok pada seksi Education dan memusatkan teks jenjang pendidikan secara horizontal (`.profile-edu-centered-row`).
- **Single-Line Sentence Metadata Banner**:
  - Metadata dirangkai menjadi satu baris kalimat ringkas di bawah Hero: `[Institution] • [Program] • [Batch] • [Level]`.
- **Outside Section Divider Titles**:
  - Judul `EDUCATION`, `ADDRESS`, dan `SECURITY` berada di luar kartu dengan garis pembatas horizontal antar-seksi.
- **Strict 80vh Height Invariant Enforced**:
  - Total tinggi modal terpangkas sangat ramping menjadi **546.6px** (sangat aman di bawah batas 80vh / 675px mobile height).


## [2026-11-15 13:50] — Phase 549: Fix Column Progress.Level_Status 400 Bad Request in `api.js`
- **Schema Alignment in `fetchStudentProgress`**:
  - Memperbaiki query `.from('progress').select(...)` di [api.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/api.js#L561-L572): menghapus kolom non-existent `level_status` dan `level_completed_at` yang memicu error Postgres 42703 (400 Bad Request: `column progress.level_status does not exist`).
  - Kolom skema resmi yang aktif diselaraskan ke: `id, student_id, class_id, unlocked_level, highest_score, updated_at`.
- **Cache Busters Bump**:
  - Bump import `api.js` ke `?v=20261115_v541` di [dashboard.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/dashboard.js), [result.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/result.js), [test.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/test.js), [auth.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/auth.js).
  - Bump `sw.js` ke `v130` dan `dashboard.html` ke `v541`.
- **Verification**:
  - Kueri Supabase terverifikasi mengembalikan data 200 OK tanpa error. Seluruh test suite syntax AST dan table layout 100% PASS.


## [2026-11-15 13:48] — Phase 548: Automated Administrative Center Default Resolution for District and Village & Cascading Dropdown Editing
- **Automated Regency Administrative Center Resolution (District & Village SSOT)**:
  - Mengimplementasikan `REGENCY_ADMIN_CENTERS` dan `getDefaultDistrictAndVillage(cityName, provinceName)` di `js/indonesia-regions.js`: secara otomatis menetapkan distrik ke Pusat Pemerintahan (Ibu Kota) kabupaten/kota dan village ke kelurahan/desa kantor distrik berada (misal: Mataram City ➔ Mataram, Pejanggik; Central Lombok ➔ Praya, Praya; Sumbawa ➔ Sumbawa, Brang Biji; West Sumbawa ➔ Taliwang, Kuang; West Lombok ➔ Gerung, Gerung Utara; East Lombok ➔ Selong, Selong; North Lombok ➔ Tanjung, Tanjung; Dompu ➔ Dompu, Bada; Bima ➔ Woha, Tente; Bima City ➔ Rasanae Barat, Paruga).
  - Melakukan sinkronisasi data (*backfill*) 83 siswa aktif di Supabase dan fallback in-memory rendering sehingga kolom `VILLAGE` dan `DISTRICT` tidak pernah kosong (`—`) di data table.
- **Cascading Dropdowns on Edit Mode & Student Full Edit Modal**:
  - Kolom `DISTRICT` dan `VILLAGE` pada Master Edit Mode diubah dari text input menjadi `<select class="student-district-select">` dan `<select class="student-village-select">` yang otomatis terisi berdasarkan kabupaten/kota dan ber-kaskade secara dinamis.
  - Modal Student Full Edit (`#modal-student-full-edit`) diperbarui menggunakan 4-tier cascading dropdowns (Province ➔ Regency ➔ District ➔ Village) dengan auto-default ke pusat pemerintahan saat regency dipilih.
- **Verification**:
  - Seluruh 28 test suites 100% PASS dalam 24.53s.


## [2026-11-15 14:00] — Phase 546: Sub Panel Score Action Modals (Manual Cyan M, Remedi Kuning R, Forgive Merah F), Score Column Lockdown & Alumni Graduation Button (Ungu X)
- **Score Column Lockdown (Edit Mode Restriction)**:
  - Mengunci kolom PROGRESS (`theme_${tc}_task`), SCORE (`theme_${tc}_score`), POINT (`theme_${tc}_total_pts`), dan GRADE (`theme_${tc}_grade`) dari inline `<input>` saat Master Edit Mode aktif. Kolom nilai hanya dapat dimutasi melalui 3 tombol aksi resmi di Sub Panel.
- **Tiga Tombol Sub Panel Berurutan di Class Hub**:
  - Tombol **Manual** (Cyan `#38bdf8`): Membuka single-step modal, menginput/mengoverride nilai manual berlabel **Grade M** (warna Cyan).
  - Tombol **Remedi** (Kuning `#FFFF00` / `var(--grade-c)`): Membuka single-step modal, memfilter siswa berhak remedi (< 60% / incomplete), memberi otorisasi **Grade R** (cap 60%).
  - Tombol **Forgive** (Merah `#FF0000` / `var(--grade-e)`): Membuka single-step modal, memfilter siswa butuh dispensasi, memberi waiver kelulusan **Grade F**.
- **Tombol Alumni di Student Roster (Ungu `#8b5cf6` / `#a855f7`)**:
  - Tombol **Alumni** di Sub Panel / Infobar Student Roster, single-step graduation langsung memproses siswa pada daftar roster aktif ke level Alumni.
- **SSOT Rules & Test Suites**:
  - Menambahkan aturan Grade M, R, F, X dan Score Column Lockdown ke `AGENTS.md` §2.10 dan `.agents/rules/ui-invariants.md`.
  - Seluruh 51 file JavaScript valid AST (0.12s), 10/10 pilar table standardization 100% PASS, service worker cache bumped ke `v129`.

---


## [2026-11-15 13:40] — Phase 549: Pop-Up 04 Official 7-Step Rainbow Spectrum Pips (Merah s/d Ungu System Tokens)
- **Official TopsCore 7-Step Rainbow Spectrum Integration**:
  - Mengganti warna pips tunggal menjadi spektrum pelangi resmi sistem TopsCore (Me-Ji-Ku-Hi-Bi-Ni-U) yang menyala secara sekuensial pada kotak progres 1 s/d 7:
    1. Pip 1: **Merah** (`var(--grade-e, #FF0000)` / Grade E Fail)
    2. Pip 2: **Jingga** (`var(--grade-d, #FF8C00)` / Grade D Less / Quad B)
    3. Pip 3: **Kuning** (`var(--grade-c, #FFFF00)` / Grade C Enough)
    4. Pip 4: **Hijau** (`var(--grade-a, #00c000)` / Grade A Very Good)
    5. Pip 5: **Biru** (`var(--primary-tactical, #38bdf8)` / Tactical Blue)
    6. Pip 6: **Nila** (`var(--clr-accent-1, #6366f1)` / Royal Indigo)
    7. Pip 7: **Ungu** (`var(--quad-d, #c084fc)` / Pillar D / Quad D Violet Mastery)
  - Seluruh teks angka kotak aktif render kontras gelap `#0f172a` per Rule 2.10 Universal Dark Badge Text.
- **Unified Tactical Blue Frame**:
  - Bingkai kartu, teks judul, ikon SVG, garis pembatas, dan tombol CTA kedua kartu konsisten menggunakan **Tactical Blue / Cyan (`#38bdf8`)**.
- **System Verification**:
  - Seluruh 51 file JavaScript valid AST (0.41s), spatial audit 100% PASS, CSS minification up-to-date, git gate uncommitted terjaga.

---

