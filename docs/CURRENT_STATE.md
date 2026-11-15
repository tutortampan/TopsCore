# CURRENT STATE — TOPSCORE LMS

> **Purpose:** Single authoritative restart point across sessions and restarts.
> **Last Updated:** 2026-11-15 19:00 UTC+8
> **Current Phase:** Phase 572 [COMPLETE] — Alumni Main Panel Routing & Clickability Resolution
> **Status:** READY FOR USER CONFIRMATION & REVIEW (ALL TESTS 100% GREEN)

---

## 1. Active System Architecture & Invariants

- **Alumni Main Panel Clickability & Routing Resolution (Phase 572)**:
  - **Click Handler & Routing Fix**: Menambahkan handler routing resmi `case 'alumni':` di switch statement `loadSection` ([js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js)) yang sebelumnya jatuh ke `default` (halaman "This section is under development").
  - **Early Window Attachment & Inline Onclick**: `window.loadSection = loadSection;` diekspos langsung tepat setelah definisinya, ditambah fail-safe inline `onclick` pada `#sidebar-alumni-item` di [admin.html](file:///d:/Drives/Tutor%20Tampan/TopsCore/admin.html) dan event listener langsung di `loadSidebarPrograms()`.
  - **Perbaikan Query program_status & Pengenalan 20 Alumni**: Menambahkan kolom `program_status` ke query `adminFetchAll('students')` di [js/admin/student-management.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/student-management.js) dan menyertakan status `PROGRAM_COMPLETED` sehingga seluruh 20 siswa alumni tampil akurat.

- **Dedicated Theme STATUS Column & Pure Canonical GRADE (Phase 571)**:
  - **Kolom Baru STATUS**: Ditambahkan kolom ke-5 di setiap tema (`THEME A`, `B`, `C`, `D`) matriks nilai kelas ([js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js), [css/admin.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/admin.css)). Kolom ini menampilkan:
    - Siswa Lulus normal ($\ge 60\%$): Centang hijau (**✓** / `check-circle` Grade A hijau).
    - Remedial: Badge **`R`** (Kuning `#FFFF00` / `var(--grade-c)`).
    - Forgiven: Badge **`F`** (Merah `#FF0000` / `var(--grade-e)`).
    - Manual Override: Badge **`M`** (Tactical Cyan `#38bdf8`).
    - Belum lulus / belum diambil: Strip (**—**).
  - **Kolom GRADE Murni Nilai Akademik**: Kolom `GRADE` murni menampilkan grade kanonik siswa (**★, A, B, C, D, E** atau lock jika belum diambil) berdasarkan persentase skor riil mereka tanpa pernah ditimpa oleh huruf administratif `M`, `R`, atau `F`.
  - **Penyelesaian Tuntas Constraint `check_attempts_grade`**: Seluruh penyimpanan nilai (manual, remedi, forgive di [js/api.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/api.js) dan [js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js)) menyimpan grade kanonik ('★'..'E') ke kolom `attempts.grade`, menghilangkan error database constraint secara permanen sekaligus menjaga tampilan siswa tetap murni sesuai capaian skor.
  - **Tempat Checkbox Aksi Sub Panel**: Saat mode `Remedi (R)` atau `Forgive (F)` aktif di Sub Panel, checkbox interaktif muncul langsung di dalam kolom **`STATUS`** ini.

- **Manual Edit Deferred Batch Save & Exit Confirmation Prompt (Phase 570)**:
  - **Zero Save on Blur**: Seluruh event `onblur` yang sebelumnya langsung menyimpan ke database saat kursor berpindah sel dibuang total. Nilai tersimpan sementara di in-memory draft (`window._manualInputState.drafts`).
  - **Simpan Hanya Saat Tombol Edit Ditekan Lagi**: Seluruh perubahan hanya diproses saat tombol **`Done Editing (Manual)`** atau tombol `Escape` ditekan.
  - **Window Prompt Save / Cancel**: Saat tombol edit selesai ditekan dan ada perubahan nilai yang belum disimpan, sistem memunculkan prompt konfirmasi:
    - **`Save Changes` (Cyan)**: Menyimpan seluruh draft nilai siswa secara batch ke Supabase, mengunci kembali tabel, dan me-refresh data.
    - **`Cancel (Discard)` (Secondary)**: Membuang seluruh draf perubahan, mengunci kembali tabel, dan mengembalikan data asli.
    - Jika tidak ada nilai yang diubah, mode edit langsung tertutup secara mulus tanpa memunculkan prompt.

- **Student Dashboard Bottom Banner De-Overlap & Zero-Clipping (Phase 569)**:
  - **Eliminasi Fixed Banner Overlap**: `#bottom-ad-banner` pada halaman dashboard ([css/dashboard.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/dashboard.css)) dikunci dengan `position: relative !important;` sehingga berpartisipasi dalam flex flow normal halaman, duduk tepat di bawah `.dashboard-content` tanpa pernah melayang di atas atau menutupi kartu tabel.
  - **Zero-Clipping Test No. 11**: Kontainer tabel `#completed-Tests-container` kini memiliki `padding-bottom: 20px !important;` dan flex height yang presisi, memastikan baris tes paling akhir (No. 11 `2nd Vocabulary A Words Exam`) 100% terlihat jelas saat di-scroll ke bawah dengan bingkai hijau kartu yang tertutup rapi di atas banner.

- **Direct Table Remedi & Forgive Inline Checkboxes (Phase 568 / Zero Modal Invariant)**:
  - **Zero Pop-up Windows**: Seluruh pop-up wizard untuk Remedi dan Forgiven dibuang total dari workflow. Mode aktif langsung di tabel kelas ([js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js)).
  - **Tanda Centang / Checkbox di Kolom Grade**: Saat tombol **`Remedi (R)`** (Kuning) atau **`Forgive (F)`** (Merah) aktif, checkbox interaktif muncul tepat di samping simbol nilai/grade pada kolom `GRADE`:
    - **Remedial (R)**: Nilai setinggi apapun turun menjadi batas maksimum ujian tersebut (capped 60%) dan berstatus Grade **`R`** (`var(--grade-c)`). Saat uncheck, kembali ke nilai normal.
    - **Forgiven (F)**: Nilai berapapun tidak dinaikkan, hanya dianggap selesai dan **PASSED** saja, berstatus Grade **`F`** (`var(--grade-e)`). Saat uncheck, status waiver dicabut.
  - **Single Active Sub Panel Mode**: Manual, Remedi, dan Forgive saling eksklusif (mengaktifkan satu mode otomatis menonaktifkan mode lain). Tombol Escape keluar dari seluruh mode edit.

- **Universal Terminology Cleanliness & 'RATE' Column Standard (Phase 567 / SSOT)**:
  - **SCORE $\rightarrow$ RATE**: Kolom persentase nilai pada matriks nilai kelas ([js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js), [js/admin/class.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/class.js), [js/admin/tests-management.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/tests-management.js), [js/admin/datagrid.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/datagrid.js)) resmi dinamai **`RATE`** (4 huruf pas). Menghilangkan kerancuan antara persentase (%) dan poin riil (PTS): `PROG` $\rightarrow$ `RATE` $\rightarrow$ `POINT` $\rightarrow$ `GRADE`.
  - **Zero Cohort Invariant**: Istilah `cohort` dibersihkan total dan diseragamkan menjadi **`Batch`** di seluruh modal transfer, re-enroll, dan tabel admin.
  - **Zero Class Board / Subject Invariant**: Istilah `Class Board` dan `Subject` dihapus total dan diseragamkan menjadi **`Class`**.
  - **Zero Assessment Invariant**: Istilah `assessment` dibersihkan dari dashboard, report card, dan test room menjadi baku **`Test`**.
  - **PASSED Column Standard**: Kolom jumlah tes selesai di Student Roster diubah dari `COMPLETED` menjadi **`PASSED`** (micro `PASS`).
  - **Zero Quiz Legacy**: Seluruh sisa ID modal dan label wizard dibersihkan dari `quiz` menjadi **`task`**.

- **Alumni Main Panel in Board & Hold-Inactive Consolidation (Phase 566)**:
  - **Panel Alumni di Domain B (`B — BOARD`)**: Menghadirkan menu navigasi mandiri `Alumni` di Domain B ([admin.html](file:///d:/Drives/Tutor%20Tampan/TopsCore/admin.html)), ter-pin di posisi paling bawah Domain B ([js/admin/admin-init.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/admin-init.js)), dengan title `Alumni` pada topbar ([js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js)). Student Roster memuat seluruh data alumni se-lembaga (`isAlumniPanel: true`).
  - **Single Table for Hold & Inactive**: Pada batch reguler, siswa `HOLD` dan `INACTIVE` digabung dalam satu tab **`Hold & Inactive`** ([js/admin/student-management.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/student-management.js)), ditampilkan dalam satu tabel bersama tanpa pemisahan tabel, dengan label status jelas di kolom `STATUS` (Hold kuning, Inactive slate).

- **Role Separation for Special Grades (Admin/Tutor 'M'/'R'/'F' vs Student Score Grade, Phase 565)**:
  - **Admin & Tutor Exclusivity**: Simbol khusus `M` (Manual Score Cyan `#38bdf8`), `R` (Remedial Kuning `var(--grade-c)`), dan `F` (Forgiven Merah `var(--grade-e)`) HANYA muncul di tabel Student Test and Grade pada layar Admin dan Tutor ([js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js)).
  - **Tampilan Murni Kanonik untuk Siswa**: Bagi siswa (Student Dashboard [js/dashboard.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/dashboard.js), Result Page [js/result.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/result.js), Leaderboard), nilai grade yang ditampilkan murni dihitung langsung dari persentase skor mereka (`calculateGrade(percentage)`: `★`, `A`, `B`, `C`, `D`, `E`). Siswa tidak pernah melihat simbol internal `M`, `R`, atau `F`.

- **Authoritative Entity Status & Type Standards (Phase 564 / Rule 2.27 SSOT)**:
  - **Student Status (`students.program_status` / `is_active`)**: Strictly **`ACTIVE`**, **`HOLD`**, **`ALUMNI`**, and **`INACTIVE`**. Legacy `graduated` and `completed` terms eradicated and consolidated into `ALUMNI`.
  - **Class Status (`classes.is_active`)**: Strictly **`ACTIVE`** and **`INACTIVE`**. `archived` aliased/purged to inactive.
  - **Batch Status (`batches.is_active`)**: Strictly **`ACTIVE`** and **`INACTIVE`** (`completed` does not exist for batches).
  - **Test Status (`tests.status`)**: Strictly **`PUBLISHED`** and **`DRAFT`** (`unpublished` and `archived` normalized to `DRAFT`).
  - **Test Type (`tests.test_type` / `tests.category`)**: Strictly **`TASK`** and **`EXAM`** (`quiz` legacy eradicated).

- **Database Constraint Expansion ('M', 'R', 'F', Phase 561 / Migration 20261115000000)**: Memperluas check constraint PostgreSQL `check_attempts_grade` pada tabel `public.attempts` menjadi `CHECK (grade IN ('★', 'A', 'B', 'C', 'D', 'E', 'R', 'F', 'M') OR grade IS NULL)`.

- **Sub Panel Buttons Outline vs Solid & Anti-Layout-Shift Standard (Phase 558)**:
  - **Outline saat Idle, Solid saat Aktif**: Tombol Sub Panel (Manual `175px`, Remedi `155px`, Forgive `155px`) saat idle hanya memiliki font dan border berwarna dengan latar transparan. Menjadi solid pekat hanya saat aktif. 0px pergeseran layout saat status berganti.

- **Single-Screen 100vh Viewport Lock & Spatial System (SSOT in `ui-invariants.md`)**:
  - `html, body { height: 100vh; overflow: hidden; }`, `#admin-console { height: calc(100vh - 60px); }`.
  - Canonical 10px container gap, 40px Sub Panel (`.workspace-lower-panel`), 30px in-panel buttons, 40px Title Area (`text-transform: uppercase`), 60px CTA Area. Modals capped at 75vh–80vh.

- **Dual-Scale Typography & Zero Sub-12px (SSOT)**:
  - Primary Structural Scale: Level 1 (20px), Level 2 (16px), Level 3 (12px baseline). Zero sub-12px font across application.
  - Zero decorative emojis in data tables/cards; strictly vector SVG icons via `getClassSvgIcon()`.

- **Standard Student Name & Dashboard-Only Title Exclusivity (Rule 2.23 / SSOT)**:
  - Authentic student names (`studentName`) system-wide (database, session, admin tables, exam/result rooms, exports).
  - Honorific titles (`Mr.` / `Miss`) strictly exclusive to Student Dashboard greeting.

- **Minimal Supabase Footprint**: In-browser client-side image processing (SVG data URIs / Canvas), lean queries, zero bloated polling.

---

## 2. Recent Active Milestones (Latest Rolling Window)

- **Phase 568**: Direct Table Remedi & Forgive Inline Checkboxes (Zero Pop-ups, Capped R & Waiver F).
- **Phase 567**: Universal Terminology Standardization ('RATE' Metric, Zero Cohort/Assessment/Subject/Quiz).
- **Phase 566**: Alumni Main Panel in Board & Hold-Inactive Category Consolidation.
- **Phase 565**: Strict Role Separation for Special Grades (Admin/Tutor 'M'/'R'/'F' vs Student Score Grade).
- **Phase 564**: Categorical Entity Standardization (Student, Class, Batch, Test Status & Types).

---

## 3. Standing Governance & Execution Boundaries

- **Rule 0.1.1 (Strict Git Gate)**: NEVER execute `git commit` or `git push` autonomously.
- **Rule 0.1.2 (Strict UTF-8 & No PowerShell File Editing)**: Use native tools or Node.js only.
- **Rule 2.10 (Authoritative Color SSOT)**: Zero raw hex codes. CSS variables & `TOPSCORE_COLORS`.
- **Rule 2.27 (Authoritative Entity Standards)**: Strict status & type taxonomies.

---

## 4. Verification Suite Status

- **Global Parallel Test Pool**: 28/28 suites 100% PASS cleanly (`node scripts/run_all_tests_parallel.mjs`).
- **Syntax Validation**: 51/51 JavaScript files PASS. 100% assertions PASS.

---

## 5. Next Exact Action

- Advance to user's next directive. All changes remain uncommitted in the working tree for user review per Rule 0.1.1.
