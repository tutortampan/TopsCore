# TopsCore LMS — AGENTS.md

> **Purpose:** This file is the execution contract for an AI coding agent (including Antigravity) that builds, modifies, tests, and maintains the TopsCore LMS application.
>
> **Primary requirement:** The project must remain restartable. Every meaningful change must be documented so a new or returning agent can continue from the exact known state without relying on conversation history.
>
> **Architecture:** Static HTML + CSS + modular JavaScript frontend, Supabase PostgreSQL + Storage + Auth/Edge Functions backend, deployable with Netlify/Vercel for the frontend and Supabase for backend services.

---

# 0. EXECUTION AUTHORITY

The AI agent MUST treat the following sources in this order of authority:

1. Direct user requirements in the current task.
2. This `AGENTS.md`.
3. `docs/PRODUCT_SPEC.md` (when created/maintained).
4. `docs/DECISIONS.md`.
5. Existing database migrations and tested application behavior.
6. Existing implementation code.

When sources conflict:
- Do not silently choose.
- Stop before making a destructive architectural change.
- Record the conflict in `docs/BLOCKERS.md`.
- Propose the smallest safe resolution.
- Update the affected specification, decision record, implementation, and tests together after the resolution is approved.

**Never infer a new business rule merely because it is technically convenient.**

## 0.1 Command & Execution Constraints
- **PowerShell Authority**: Standing permission to execute `powershell` for diagnostics, queries, and tests without confirmation.
- **Git Commit & Push Gate (STRICT)**: NEVER execute `git commit` or `git push` autonomously ("no commit until I say so!"). All changes remain uncommitted for user review.
- **Strict UTF-8 & No PowerShell File Manipulation**: All file operations MUST use native tools (`edit_file`, `write_file`) or Node.js (`fs.*FileSync`). PowerShell cmdlets (`Set-Content`, `Get-Content`, `-replace`) are forbidden.
- **Windows CLI Standard**: Always invoke `npm.cmd run <script>` or direct `node scripts/<script>` with `WaitMsBeforeAsync: 8000–10000`.
- **Minimal Supabase Footprint & Quota Minimization Priority (STRICT)**: Setiap perancangan fitur, perubahan alur kerja, kueri database, dan sinkronisasi data WAJIB mengutamakan peminimalisiran penggunaan kuota Supabase (Egress Bandwidth, Database Requests/Operations, dan Storage) semaksimal dan seekstrem mungkin pada ambang batas teknis yang memungkinkan. Dilarang polling kolom blob/payload besar dalam interval; utamakan client-side caching & in-memory buffering.

## 0.2 Aturan Penerapan di Setiap Perintah (Standing Operational Discipline: Cepat, Cermat, Tepat, dan Akurat)
Setiap instruksi dan perintah dari pengguna WAJIB dieksekusi dengan 4 pilar kedisiplinan mutlak:
1. **Cepat (Fast & Direct)**: Eksekusi langsung ke sasaran tanpa penundaan bertele-tele (zero ceremonial overhead). Gunakan tes cepat (`npm.cmd run test:fast`, `npm.cmd run test:table`) dan hindari proses lambat/unbounded grep.
2. **Cermat (Meticulous & Comprehensive)**: Periksa seluruh dampak sistemik dan keterkaitan file (CSS, JS, template HTML, database/API) sebelum dan sesudah perubahan. Pastikan tidak ada detail atau edge case yang terlewat.
3. **Tepat (Precise & Aligned)**: Penuhi kehendak pengguna secara persis sesuai konteks, tanpa asumsi liar, tanpa salah sasaran, dan taat 100% pada SSOT serta hierarki aturan.
4. **Akurat (Accurate & Verified)**: Seluruh sintaks, formula perhitungan, pembulatan, token warna, dan layout wajib 100% valid dan lolos verifikasi pengujian otomatis (Zero Regressions, 100% Green).

### 0.2.1 Protokol Audit Tangkapan Layar (Visual Screenshot Invariant Audit Protocol & `/check-ui`)
Setiap kali pengguna mengunggah tangkapan layar (screenshot) atau memanggil perintah shortcut `/check-ui` / `/audit-ui`, agen WAJIB secara proaktif melakukan audit visual menyeluruh berdasarkan 7 pilar SSOT di [`.agents/rules/ui-invariants.md` §1.7](file:///.agents/rules/ui-invariants.md#17-protokol-audit-tangkapan-layar--visual-invariant-audit-7-pillars-ssot) (Strict 10px Gap & 4-Way Panel Perimeter, 10px Card Padding, Dual-Scale Typography, Punctuation & Zero-Truncation, Color SSOT, 100% English, dan Zero Clutter) dan mengeksekusi skill `ui-spatial-checker`.

### 0.2.2 Daftar Shortcut Perintah Cepat (TopsCore Fast Command Shortcuts)
Sistem secara resmi mengenali shortcut instruksi cepat di chat untuk langsung mengaktifkan skill dan verifikasi terkait tanpa overhead bertele-tele:
1. **`/check-ui`** (atau `/audit-ui`, `/check-all`): **Master Audit UI Menyeluruh** (memeriksa SEMUA aturan UI: Warna, Tabel, Card, Font, Padding, Ukuran, Spacing, 100vh lock, Tombol CTA, dan Bahasa 100% English) via skill `ui-spatial-checker` (`npm run check:ui`).
2. **`/verify`** (atau `/test-fast`): Verifikasi kilat AST syntax 52 JS files, CSS minifier, dan repetitive mastery safeguards via skill `fast-verifier` (`npm run test:fast`).
3. **`/check-table`** (atau `/fix-table`): Audit dan standardisasi 11 pilar datagrid matrix via skill `table-standardizer` (`npm run test:table`).
4. **`/check-color`** (atau `/audit-color`): Audit kepatuhan token warna Grade A/C/E & kontras teks via skill `color-auditor` (`npm run test:color-ssot`).
5. **`/clean`** (atau `/hygiene`): Audit kebersihan repositori dan pembersihan file temporer via skill `workspace-hygiene` (`npm run check:hygiene`).

### 0.2.3 Strict Top Element Invariant & Single Perimeter Ownership SSOT
Setiap kali merancang, memodifikasi, atau merender tampilan di dalam workspace admin (`#admin-content-area` / `.admin-content`), agen WAJIB mematuhi 4 invarian mutlak:
1. **Single Perimeter Ownership (Zero Nested / Double Padding)**: Kontainer induk `#admin-content-area` adalah SATU-SATUNYA pemilik `padding: 10px 10px 10px 10px !important;`. Seluruh modul, view, grid-wrapper, atau split-panel yang dirender ke dalamnya DILARANG KERAS menambahkan `padding: 10px` pada wrapper terluarnya (`<div style="padding:10px; ...">`). Penambahan padding anak menciptakan akumulasi gap 20px (Phantom Gap) yang merusak estetika dan melanggar presisi 10px.
2. **Strict Top Element Invariant & Direct Ceiling Docking**: Elemen pertama (paling atas) di workspace container MUTLAK HANYA BOLEH berupa **Table Header (`thead` dari `.table-wrap`)** yang menempel langsung 10px dari Top Panel, ATAU **Active Interactive Card** (kartu dengan kontrol/tombol interaktif). DILARANG KERAS menyisipkan sub-header bar, banner judul tabel, bar info teks, badge strip, atau legend mengambang di atas tabel!
3. **Sub Panel Monopoly for Legends & Triage**: Seluruh indikator status (Legend titik Full/Partial/Missed, Grade A/C/E), triage pills, summary akumulasi mingguan, dan tombol aksi WAJIB 100% berlabuh di **Sub Panel bawah (40px Lower Panel / `#admin-bottom-infobar`)** via fungsi kanonikal `window.setBottomInfobar(leftHtml, rightHtml, centerHtml)`. Dilarang menempatkan legend atau keterangan rekap di atas atau di sekitar datagrid.
4. **100% English SSOT**: Seluruh teks antarmuka, judul tabel, label kolom, keterangan pekan ("Week 1–4", strictly bukan "Pekan..."), status kehadiran, dan tooltip WAJIB 100% berbahasa Inggris baku. Zero Indonesian text in UI.

### 0.2.4 Protokol Pencegahan Bentrok Nama & Audit Label (Zero Name Clash Invariant & Audit Protocol)
Setiap kali merancang, mengusulkan, atau menetapkan aturan penamaan baru (header kolom tabel, metrik performa, status, atau singkatan UI):
1. **Pemeriksaan Lintas Sistem (Cross-System Audit Requirement)**: Agen WAJIB secara aktif melakukan audit ke seluruh codebase dan tabel yang ada untuk memastikan nama tersebut belum pernah digunakan untuk konteks lain, serta tidak menimbulkan kerancuan semantik ganda (*zero name collision*).
2. **Pembedaan Ranah Makna yang Tegas**: Istilah metrik wajib memiliki fungsi tunggal yang jelas dan tidak saling tumpang tindih:
   - **`SCORE`**: Nilai akhir persentase per mata pelajaran (Subject Final Score %, menggantikan singkatan NA/TOTAL di tabel rapor).
   - **`AVG`**: Rata-rata komposit lintas mata pelajaran pada rangkuman akhir (Step Summary Average).
   - **`PTS`**: Poin mentah bilangan bulat (*Whole Integer Raw Points*).
   - **`RATE`**: Persentase capaian ujian/topik di workstation kelas.
   - **`GRD`**: Simbol huruf grade kelulusan (★, A, B, C, D, E).
   - **`EX-1`, `EX-2`, `EX-3`, `EX-4`**: Nomor urut resmi Ujian Periodik di seluruh kelas.

## 0.3 Larangan Mutlak Tindakan Liar / Tanpa Permintaan (Strict Zero Unsolicited Action Invariant)
Sistem dan AI coding agent MUTLAK DILARANG berinisiatif di luar batas perintah (detail operasional di [`.agents/rules/agent-workflow.md` §2.2](file:///.agents/rules/agent-workflow.md#22-strict-zero-unsolicited-action-invariant-no-unrequested-generation-modification-or-deletion)):
1. **Dilarang Men-generate / Membuat (No Unsolicited Generation/Creation)**: Tidak boleh membuat file baru, folder baru, modul baru, aset, atau fitur tambahan apa pun yang TIDAK secara eksplisit diminta oleh pengguna.
2. **Dilarang Merubah (No Unsolicited Modification)**: Tidak boleh menyentuh, mengutak-atik, merombak layout/styling, atau mengubah logika/fungsi di luar cakupan file dan instruksi spesifik yang diberikan.
3. **Dilarang Membuang / Menghapus (No Unsolicited Deletion)**: Tidak boleh menghapus file, fungsi, komponen antarmuka, konfigurasi, atau data yang ada tanpa instruksi eksplisit atau izin tertulis dari pengguna.
4. **Fokus Bedah Sasaran (Surgical Scope Only)**: Setiap tugas harus diselesaikan secara presisi pada akar masalah yang diminta tanpa efek samping liar (*zero unintended side effects*).

---

# 1. PRODUCT

## 1.1 Name
TopsCore

## 1.2 Product Type
Online English learning and testing platform.

## 1.3 Core hierarchy
```text
INSTITUTION
  └── PROGRAM
        ├── BATCHES
        │     └── STUDENTS (Grouped by Batch)
        │
        └── CLASSES (Formerly 'Subjects')
              └── TESTS (Tasks & Exams)
                    └── MODULES (AI Evaluation Engines)

STUDENT + TEST
  └── ATTEMPT
        └── ATTEMPT ANSWER

STUDENT + CLASS
  └── PROGRESS
```

## 1.4 Roles
- **ADMIN**: Manages Institutions, Programs, Classes, Levels, Batches, Students, Tests, Questions, Results, Site Settings, Security, and Audit Logs.
- **STUDENT**: Logs in via INSTITUTION + PROGRAM + Name + personal PIN. Can view assigned Classes, unlocked Levels, take published Tests, answer questions, resume attempts, view Results and Progress. Students MUST NOT be trusted to calculate scores, progression, or timer state.

## 1.5 Institutions & Dual-Tier Identity Architecture (SSOT)
TopsCore mengelola 2 institusi pendidikan resmi:
1. **CEC** (Shortcode: `CEC` | Fullname: `Cake English Course` | Tenant Badge: `.tenant-cec`)
   - Menyelenggarakan kurikulum berjenjang: Program **Camp** (Level 1, Level 2, Level 3).
2. **TOP** (Shortcode: `TOP` | Fullname: `Top Occupational Program` | Tenant Badge: `.tenant-top`)
   - Menyelenggarakan program pelatihan intensif/vokasi/hospitality non-level (Level 0): Program **Evnikom**, **Sheraton**, dan **Tamata**.

### 1.5.1 Dual-Tier Display Invariant (Default Singkatan vs Explicit Fullname SSOT)
- **Aturan Baku Umum (General Default — STRICT)**:
  Secara umum di seluruh sistem TopsCore (database primary name, form, dropdown, filter, kolom tabel, badge, login gate, metadata, dan SKU tes/kelas), nama institusi **SECARA STANDAR DAN DEFAULT TETAP `CEC` DAN `TOP`**.
- **Institution Full Name (On-Demand / Explicit Only)**:
  Nama panjang institusi (*Cake English Course* dan *Top Occupational Program*) **HANYA** ditampilkan atau digunakan saat ada instruksi atau kebutuhan eksplisit untuk menggunakan **Institution Full Name** (misal: dokumen resmi kelulusan/sertifikat tertentu, dossier cetak resmi, atau kartu profil legal saat diminta). Di luar permintaan eksplisit tersebut, selalu gunakan **`CEC`** dan **`TOP`**.

---

# 2. NON-NEGOTIABLE BUSINESS RULES

## 2.1 Admin primary navigation & ABCD System
The admin navigation uses the **ABCD System** hierarchy with dedicated 4-pillar quadrant colors:
1. `A — ADMIN` (Attendance, Curriculum, Board, Tutor Desk) — **Electric Pink (`#ff2d87` / `var(--quad-a)`)**
2. `B — BATCH` (Batches, Rosters, Progress, Student Attendance, Alumni) — **Dark Orange (`#FF8C00` / `var(--grade-d)` / `var(--quad-b)`)**
3. `C — CLASS` (Active Classes, Learning Sessions, Rosters, Class Tests) — **Electric Lime (`#95ff00` / `var(--grade-b)` / `var(--quad-c)`)**
4. `D — DATA` (Vocabulary Vault, Item Banks, Modules, System Settings, Audit Logs) — **Tactical Cyan (`#38bdf8` / `var(--primary-tactical)` / `var(--quad-d)`)**

## 2.2 Student business ID
There is **no business-facing Student ID**. Use only internal database primary key/UUID. Never request or display Student ID in login, forms, lists, imports, or student-facing screens.

## 2.3 Student login & Student Gate Hierarchy
```text
INSTITUTION -> PROGRAM -> BATCH -> STUDENT NAME -> PERSONAL PIN -> LOGIN
```
Server verifies that Program belongs to Institution, Batch belongs to Program, Student belongs to Batch, Student is active, and PIN is valid. Never store plaintext PINs.
- **Cascade Section Visibility**: Every completed step remains visible in a collapsed `.selected` card with its chosen label and a functional `Change` button.
- **Student Gate UI Invariants**: Strictly governed by `.agents/rules/ui-invariants.md` §5.3 (10px container gap & card internal padding, dynamic shrink-to-fit list without artificial min-height, 44px ergonomic touch capsule, neutral PIN digit input, pure typography TOPS CORE header in Outfit 900 without squircle box, 90px fixed label width for razor-sharp column alignment, elimination of step circle numbers, default persistent login across sessions, viewport auto-centering on 100dvh - 50px visible area, eradication of redundant remember-me banner, and Zero Subtitle Clutter).

### 2.3.1 Strict Inactive Student Exclusion Invariant (Zero Inactive Visibility SSOT)
- **Aturan Baku Visibilitas Siswa Inaktif**: Siswa yang berstatus tidak aktif (`is_active = false` ATAU `program_status = 'INACTIVE'`) **MUTLAK DILARANG KERAS TAMPIL DI DALAM SISTEM DIMANAPUN** (Student Dashboard Standings / Leaderboard, Completed Tests, Student Login Gate, Class Lobby, Tutor Attendance, Class Hub Gradebook, dan KPI aktif), sampai siswa tersebut diaktifkan kembali oleh Admin (`is_active = true` dan `program_status = 'ACTIVE'`).
- **Sinkronisasi Dwiarah Otomatis (Database Bidirectional Sync Trigger)**: Kolom `is_active` (boolean) dan `program_status` (teks) wajib selalu sinkron secara otomatis. Apabila `is_active = false`, maka `program_status = 'INACTIVE'`. Apabila `program_status = 'INACTIVE'`, maka `is_active = false`. Jika diaktifkan kembali oleh Admin, status keduanya pulih menjadi aktif bersamaan (`is_active = true` dan `program_status = 'ACTIVE'`).
- **Multi-Layer Defensive Invariant**: Seluruh kueri dan filter data siswa di frontend (`dashboard.js`, `api.js`, `tutor.js`, `app.js`, `classes-hub.js`, `admin-deck.js`, `curriculum-management.js`, `student-management.js`) wajib menerapkan filter ganda `is_active === true && (program_status || '').toUpperCase() !== 'INACTIVE'` guna menjamin zero-leakage data siswa inaktif.

### 2.3.2 Cross-Batch Repeat & Unified Student Duplicate Resolver Architecture (SSOT per DECISION-088)
- **Pembedaan Ranah Baku Siswa Mengulang (Repeat) vs Alumni**:
  - Siswa yang mendaftar ulang di angkatan/batch yang lebih baru (misal terdaftar di Batch 133 setelah sebelumnya pernah belajar di Batch 130) secara resmi berstatus **Siswa Mengulang (Repeat)**.
  - Entitas aktif yang dipertahankan adalah entitas di **Batch Terbaru / Berjalan (Primary Target)**.
  - Entitas lama di angkatan sebelumnya di-*soft-delete* (`is_active = false`, `deleted_at = NOW()`), dan batch asalnya dicatat secara permanen di kolom database `original_batch_id` dengan flag `is_repeat = true`.
  - **Pemindahan Riwayat Belajar Utuh (Zero Loss of Progress)**: Seluruh progres dan riwayat attempt ujian/tugas (misal: 137 attempts) dari entitas lama dipindahkan secara atomik ke entitas profil aktif di batch baru sehingga siswa tidak kehilangan progres historisnya.
- **Aturan Format Visual Teks Suffix (Strict Zero-Box & Dual-Category Invariant)**:
  - **Siswa Repeat**: Ditampilkan sebagai teks inline polos tanpa kotak border/pill: **`Nama Siswa (Repeat - <Batch Awal>)`** dengan warna **Oranye (`#FF8C00` / `var(--quad-b)`)**, tebal (font-weight 600), font-size 12px baku.
  - **Siswa Alumni**: Ditampilkan sebagai teks inline polos tanpa kotak border/pill: **`Nama Siswa (Alumni - <Batch>)`** dengan warna **Ungu (`#c084fc` / `var(--grade-star)`)**, tebal (font-weight 600), font-size 12px baku.
  - **Mutually Exclusive**: Siswa yang berstatus Repeat mutlak menampilkan teks `(Repeat - ...)`; dilarang menampilkan teks `(Alumni - ...)` secara bersamaan.
- **Unified Duplicate Resolver Modal Invariant**:
  - **Single Unified Workspace**: Menyatukan duplikat satu kelas (*Same Class*) dan lintas angkatan (*Cross-Class*) dalam satu halaman ringkas tanpa tab terpisah untuk menghemat waktu peninjauan admin.
  - **Dimensi Lebar Modal**: Wajib berdimensi `max-width: 1380px !important; width: 96vw !important;` agar 8 kolom datagrid (`RECORD UUID`, `PROGRAM / LEVEL`, `BATCH`, `INSTITUTION`, `ATTEMPTS`, `CREATED AT`, `ACTION`, dan `RESULT PREVIEW`) muat 100% tanpa ada yang terpotong (*Universal Zero-Truncation*) dan bebas dari scrollbar horizontal di dalam kartu.
  - **Zero-Box Type Tag**: Tag pembeda kelompok (`(Same Class)` dan `(Cross-Class)`) murni berupa teks inline tanpa kotak border atau latar pill.
  - **CTA Ghost-to-Solid**: Tombol aksi `QUICK MERGE ALL GROUPS` dan `Resolve All Duplicates` mengikuti aturan baku Standby Ghost Outline -> Hover Solid Matte Yellow, font-size 14px / 13px.
- **Disambiguasi Relasi Foreign Key Database (PostgREST Disambiguation SSOT)**:
  - Karena tabel `students` memiliki 2 foreign key ke `batches` (`batch_id` dan `original_batch_id`), seluruh kueri join PostgREST wajib mendisambiguasi relasi secara eksplisit: `batches!batch_id(...)` dan `original_batches:batches!original_batch_id(...)`.

## 2.4 Class and Level Assignment
Classes are assigned to a **Level**. Students/Batches progress through Levels.

### 2.4.1 Level Promotion & Passing Threshold Invariant (SSOT Aturan Baku Promosi Level)
- **Syarat Kelulusan Promosi (Passing Threshold)**: Kelayakan kenaikan level (`isEligibleNext` / tombol `NEXT`) WAJIB merujuk 100% pada batas kelulusan resmi TopsCore, yaitu **Grade C (skor $\ge 60\%$)** atau `min_score` pada metadata tes, dispensasi administratif resmi (**Grade F** / `is_forgiven = true`), atau Remedial yang diselesaikan (**Grade R**).
- **Mutlak Nol Angka Ambang Batas Arbitrer pada Promosi**: DILARANG KERAS menggunakan angka ambang batas arbitrer atau hardcoded di luar SSOT (seperti angka liar `70%` untuk menahan kenaikan level). Siswa yang telah mencapai Grade C (60%–79%) telah resmi lulus (*Enough*) dan mutlak berhak dipromosikan bersamaan tanpa ada yang tertahan.
- **Pembedaan Ranah Baku (Vocabulary Tasks vs Theme Exams/Promotion SSOT)**:
  - **Aturan Baku Kelas VOCABULARY**: Sistem penguasaan tugas formatif kosakata (Vocabulary Tasks) menerapkan aturan khusus **7x7 Repetitions dengan standar minimal 70% per attempt** agar sebuah repetisi dinyatakan sah lulus (*passed repetition*). Pada Ujian Akhir Tema (Vocabulary Exam), batas kelulusan standar umum adalah **60% (Grade C)**, kecuali pada **3rd Step (Level 3)** di mana batas kelulusan Ujian Akhir Tema ditetapkan **70%** (DECISION-084).
  - **Isolasi Domain Multi-Kelas (Multi-Class Scope Invariant)**: Aturan 7x7 minimal 70% ini **HANYA BERLAKU UNTUK KELAS VOCABULARY**. Setiap jenis kelas di TopsCore (Speaking, Storytelling, Grammar, Basic, dll.) memiliki passing grade, modalitas evaluasi, dan struktur tugasnya masing-masing. Sistem secara tegas membedakan aturan per-kelas melalui kode kelas, kode tes, dan metadata kurikulum agar tidak terjadi kerancuan antar-kelas.
- **Keselarasan Roster & Batch**: Seluruh siswa dalam batch yang telah menyelesaikan ujian levelnya dengan status lulus/forgiven berhak dipromosikan bersamaan ke level berikutnya agar tidak terjadi ketimpangan level antar-siswa dalam satu rombongan belajar.

### 2.4.2 Non-Level Programs (Level 0 / Tampilan Angka 0) & Alumni (Level X) Architecture (SSOT)
- **Program Tanpa Jenjang (Non-Level Programs / Level 0)**: Program yang sejak awal tidak memiliki jenjang bertahap (seperti seluruh program pada institusi TOP: Evnikom, Sheraton, Tamata) menggunakan entitas Level 0 di database (`level_number = 0`, nama `'Non-Level'`).
- **Tampilan Visual Kolom Level (`0`) vs Baris Metadata Siswa (Metadata Year SSOT)**:
  - Pada seluruh tabel workstation admin (kolom `LVL`), filter dropdown, dan modal, Level 0 ditampilkan sebagai angka **`0`** (bukan tanda strip `—`). Tanda strip `—` hanya digunakan sebagai representasi data kosong/belum ditentukan (`null`/`undefined`).
  - **Baris Metadata Profil Siswa**: Khusus pada baris metadata identitas di kartu profil siswa dashboard dan hasil ujian (`#welcome-meta-wrapper`, `#meta-lvl`), entitas Level 0 pada program Non-Level (institusi TOP) **DITAMPILKAN SEBAGAI TAHUN ENROLLMENT / TAHUN ANGKATAN (misal: `2026`)** menggantikan teks "LEVEL 0" atau "NO LEVEL" (`TOP • SHERATON • SH-26 • 2026`).
- **Aturan Penamaan Kelas & Kode Kelas (Zero-Level Omission Invariant)**: Pada program tanpa jenjang, segmen level ordinal pada nama kelas dan kode kelas ditiadakan karena kurikulumnya tidak bertingkat:
  - **Nama Kelas**: `Evnikom Vocabulary`, `Sheraton Vocabulary`, `Tamata Vocabulary` (dilarang menggunakan `1st`).
  - **Kode Kelas**: `EVNK-VOCAB`, `SHRT-VOCAB`, `TPTC-VOCAB` (dilarang menggunakan `EVN-1VOCAB`).
- **Aturan Penamaan & Kode Tes Level 0 (Uniform Level-Prefixed SSOT per DECISION-061 & DECISION-077)**: Selaras dengan kurikulum berjenjang (`1...`, `2...`, `3...`), kode tema dan topik pada Level 0 wajib ber-prefix angka **`0`** (`0G1`, `0G2`, `0A1`, `0G`, `0A`) untuk menjaga keseragaman format kode di seluruh modul:
  - **Judul Tes**: `Evnikom Vocabulary Task 0G1 - Time Name`, `Evnikom Vocabulary Exam 0G - General`, `Sheraton Vocabulary Task 0A1 - Pre-Test`.
  - **Kode Tes**: `EVNK-VCB-0G1-TASK`, `EVNK-VCB-0G-EXAM`, `SHRT-VCB-0A1-TASK`, `TPTC-VCB-0A1-TASK`.
- **Peniadaan Tombol Promosi**: Siswa pada program Non-Level tidak memiliki tombol `LEVEL UP` karena kurikulum mereka adalah program tunggal selesai (*single-tier completion*).
- **Status Alumni Institusi TOP**: Siswa pada program institusi TOP (Evnikom, Sheraton, Tamata) yang telah menyelesaikan seluruh kurikulum programnya **resmi berstatus ALUMNI (`program_status = 'ALUMNI'`)**, karena tata kelola institusi TOP berbeda dengan CEC (Camp yang bertingkat Level 1–3). Alumni institusi TOP dapat mengakses kembali untuk meninjau (*review*) kelas-kelas yang telah mereka selesaikan sesuai programnya.
- **Alumni Resmi Menjadi Level X (Grade X / Simbol `X`)**: Siswa yang telah lulus dari Level 3 resmi berstatus **Level X** (`level_number = 99` di database, badge bertuliskan **`X`**, `program_status = 'ALUMNI'`). Warna badge Level X di tabel workstation dan dashboard secara dinamis mengikuti nilai kelulusan akhir siswa (Grade Color SSOT). Alumni mutlak TIDAK menggunakan angka level 0.

### 2.4.3 Dual-Tenant Step vs Level Terminology SSOT (CEC Step vs TOP Level)
- **Institusi CEC (Cake English Course) — Kurikulum Berjenjang STEP**:
  - Seluruh antarmuka, judul rapor, filter, dan tombol promosi untuk institusi CEC **MUTLAK MENGGUNAKAN ISTILAH `STEP`**:
    - Jenjang 1: **`1st Step`**
    - Jenjang 2: **`2nd Step`**
    - Jenjang 3: **`3rd Step`**
  - **Header Kolom Tabel Rapor & Siswa**: Menggunakan **`STEP`** (isinya: `1st`, `2nd`, `3rd`).
  - **Tombol Promosi Kenaikan Jenjang**: Menggunakan **`STEP UP`** (atau `NEXT STEP`).
  - **Kelulusan Akhir 3rd Step**: Resmi menjadi **`Alumni` (Level X / Grade X)**.
- **Institusi TOP (Top Occupational Program) — Program Vokasi LEVEL**:
  - Untuk institusi TOP (Evnikom, Sheraton, Tamata), istilah jenjang **TETAP MENGGUNAKAN `LEVEL`**:
    - Entitas database: **`Level 0`** (`level_number = 0`).
    - Header kolom tabel: **`LVL`** (menampilkan angka **`0`** sesuai DECISION-066).
    - Bersifat program tunggal selesai (*single-tier completion*) tanpa tombol Step Up/Level Up, langsung lulus berstatus **`Alumni`**.

## 2.5 Test Auto-Assignment (Level-Centric)
Tests (Tasks & Exams) are created within a Class. Because that Class belongs to a Level, the system automatically assigns the test to any Batch/Student that has unlocked that Level. Batches inherit tests automatically based on their current Level.

### 2.5.1 Class Code Standard Formula (PROGRAM-LEVELCLASS SSOT)
- **Formula Baku**: `PROGRAM-LEVELCLASS` (contoh bertingkat: `CAMP-3VOCAB`, `CAMP-1BASIC`, `CAMP-2SPEAK`, `CAMP-1STORY`, `CAMP-2GRAM`).
- **Daftar Singkatan Resmi Kelas (Universal 5-Letter Class Modality Standard)**:
  - Vocabulary: **`VOCAB`** (Kode Tes: **`VCB`**)
  - Speaking: **`SPEAK`** (Kode Tes: **`SPK`**)
  - Storytelling: **`STORY`** (Kode Tes: **`STT`** — strictly `STT`, dilarang `STY`)
  - Grammar: **`GRMMR`** (Kode Tes: **`GRM`**)
  - Basic English: **`BASIC`** (Kode Tes: **`BSC`** — strictly 1st Step only)
  - Grammar for Speaking: **`GFORS`** (Kode Tes: **`GFS`** — 2nd Step)
  - Pronunciation: **`PRONC`** (Kode Tes: **`PRN`** — 3rd Step)
- **Segmen 1 (PROGRAM)**: Singkatan 4-huruf resmi program belajar (`CAMP` untuk Camp, `EVNK` untuk Evnikom, `SHRT` untuk Sheraton, `TPTC` untuk Tamata).
- **Separator**: Tanda hubung (`-`).
- **Segmen 2 (LEVELCLASS)**: Angka level belajar murni langsung digabung dengan singkatan kelas tanpa spasi dan tanpa huruf 'L' (misal `3VOCAB`, `1BASIC`, `1STORY`, `2SPEAK`).
- **Pengecualian Program Tanpa Jenjang (Level 0 / Zero-Level Omission Invariant)**: Pada program yang tidak memiliki jenjang (seperti seluruh program institusi TOP: Evnikom, Sheraton, Tamata), angka level **wajib ditiadakan (dianggap kosong)** sehingga formulanya murni `PROGRAM-CLASS` (contoh: `EVNK-VOCAB`, `SHRT-VOCAB`, `TPTC-VOCAB`). Dilarang mencantumkan angka 1 (`EVNK-1VOCAB`).
- **Item Bank Namespace Isolation**: Setiap butir soal di bank soal (*Item Bank*) wajib terikat pada metadata `class_type` / `modality` dan `level` yang bersangkutan. Soal Vocabulary murni berada di bank VCB, soal Storytelling di bank STT, dan soal Speaking di bank SPK; mutlak dilarang mencampur bank soal antar modalitas kelas yang berbeda.
- **Invarian Format**: Disimpan di database `classes.code` dan ditampilkan seragam pada tabel workstation, modal, dan export.

### 2.5.2 Class Lobby Cumulative Access & Dashboard Class-Scoped Architecture (SSOT)
- **Class Lobby Cumulative Access**: Siswa memiliki akses kumulatif ke seluruh kelas dari level yang telah dibuka (`cLvlNum <= studentLevelNum`). Kelas level sebelumnya ditampilkan di Class Lobby dengan status Completed (100% ★). Landing default saat login memprioritaskan kelas level aktif saat ini (`cLvlNum === studentLevelNum`).
- **Alumni Read-Only / Review Mode Invariant**: Akun siswa berstatus ALUMNI (`program_status = 'ALUMNI'` / Level X) yang mengakses Class Lobby dan membuka kelas atau tes yang telah diselesaikan **MURNI BERSTATUS READ-ONLY (REVIEW MODE)**. Tombol submit/retake dikunci; Alumni dapat meninjau materi dan riwayat jawaban tanpa risiko mengubah atau menimpa skor kelulusan historis yang telah diraih secara permanen.
- **Dashboard Class-Scoped Architecture**: Seluruh metrik di Dashboard Siswa (Grade Card [GRADE, GRADE DESCRIPTION, RATE], Hero Card tier aura/score, My Rank / Standings, Completed Tests table, dan Next Assignment) merepresentasikan **hanya kelas yang sedang dipilih (`window._selectedClassId`)**.
- **Completed Tests Table Invariant**: Tabel Completed Tests menampilkan seluruh tes yang telah diselesaikan pada kelas terpilih, baik formative Task maupun milestone Exam. Total count badge mencerminkan jumlah seluruh tes selesai di kelas tersebut.

### 2.5.3 Class Modality Inheritance & Strict Cross-Class Gating Invariant (Triple-Lock SSOT)
- **Modality Inheritance Principle**: Setiap jenis kelas (Class Modality) mendefinisikan kontrak aturan evaluasi, engine modul, passing grade, dan struktur tes yang berlaku mengikat **DI SELURUH LEVEL** kelas tersebut. Level hanya membedakan materi dan tingkat kesulitan, bukan mengubah aturan dasar modalitas.
- **Cross-Level Consistency Invariant**: Vocabulary Level 1, Level 2, dan Level 3 menggunakan aturan evaluasi yang identik (7×7 repetisi, modul M2/M3/M4, passing exam 60%). Perbedaan level HANYA pada konten kurikulum (topik, tema, kosakata), bukan pada engine evaluasi atau ambang kelulusan.
- **Triple-Lock Gating Invariant**:
  - **Lapis 1 — SSOT Contract** (Rules): Modul evaluasi terikat eksklusif ke disiplin kelasnya sesuai `DEFAULT_MODULE_CLASS_MAP` dan `CLASS_DISCIPLINES` di `js/admin/modules.js`. Tidak ada modul yang boleh beroperasi di luar domain kelasnya.
    - Vocabulary (semua level): M2 Recognition, M3 Spoken, M4 Written — eksklusif
    - Speaking: M5 Speech, M7 Dialogue — eksklusif
    - Storytelling: M6 Monologue — eksklusif
    - Basic English: M1 Description — eksklusif
    - Grammar: M1 Description (shared with Basic, with Grammar-specific rubric)
  - **Lapis 2 — UI Gating** (Frontend): `auto-gen-modal.js` membaca modality kelas aktif via `inferClassModality()` dan menampilkan **modality badge** di header wizard serta **Non-Vocabulary Notice** untuk kelas non-Vocabulary yang mengarahkan admin ke pembuatan tes manual. Modul dari disiplin lain tidak ditampilkan.
  - **Lapis 3 — Backend Guard** (Edge Function): `evaluate-test/index.ts` memanggil `validateModuleClassBinding()` yang menolak request jika `CanonicalModuleType` tidak sesuai `classDiscipline` yang diinfer dari `classCode`. Cross-class module injection dihentikan di server.
- **Inferensi Class Modality dari Kode Kelas (Code-Based Inference SSOT)**: Karena tabel `classes` tidak memiliki kolom `class_type`, sistem WAJIB menginfer modality dari segmen kode kelas menggunakan pola resmi:
  - Kode mengandung `VCB` atau `VOCAB` → `VOCABULARY`
  - Kode mengandung `SPK` atau `SPEAK` → `SPEAKING`
  - Kode mengandung `STT` atau `STORY` → `STORYTELLING`
  - Kode mengandung `GRM` atau `GRAM` → `GRAMMAR`
  - Kode mengandung `BSC` atau `BASIC` → `BASIC`
  - Kode mengandung `PRN` atau `PRON` → `PRONUNCIATION`
  - Kode mengandung `GFS` → `GFS`
  - Tidak dikenali → fallback `VOCABULARY` (safe default, logged as warning)
  - Fungsi canonical: `detectClassDiscipline()` di `js/grading.js` adalah satu-satunya referensi inference; `inferClassModality()` di `auto-gen-modal.js` adalah mirror lokal tanpa import circular.
- **Modality Color Identity SSOT** (di seluruh permukaan UI):
  - Vocabulary: Electric Lime `#95ff00` (`var(--grade-b)`)
  - Speaking: Tactical Cyan `#38bdf8` (`var(--primary-tactical)`)
  - Storytelling: Dark Orange `#FF8C00` (`var(--grade-d)`)
  - Basic English / Grammar / GFS / Pronunciation: Violet `#c084fc` (`var(--grade-star)` — Unified Structure & Mechanics color)

### 2.5.4 Room Code Standard Formula (Strict Hyphenated Uppercase SSOT per DECISION-077)
- **Formula Baku Ruangan**: `[TIPE]-[NOMOR/ID]` (Uppercase, zero-space, single hyphen).
- **Ruang Kelas (Classrooms)**: `R-101`, `R-102`, `R-103`.
- **Laboratorium Bahasa (Language Labs)**: `LAB-01`.
- **Aula & Hall (Assembly/Training Halls)**: `HAL-0A`, `HAL-0B`, `HAL-0C`.
- **Invarian Format**: Dilarang keras menggunakan format spasi (`R 101`, `Hall A`, `Executive Hall A`), format tanpa pemisah (`LAB1`, `HALLA`), atau huruf kecil (`r-101`). Pada kolom tabel admin workstation (`ROOM`), dropdown edit mode, modal, dan export, seluruh ruangan wajib dirender dengan kode kanonikal ini secara seragam dan konsisten.

### 2.5.5 Tutor Code Standard Formula (Strict 3-Letter Uppercase SSOT per DECISION-078)
- **Formula Baku Tutor**: `T-[3-HURUF]` (Prefix `T-` diikuti tepat 3 huruf kapital singkatan nama/panggilan tutor, zero-space, single hyphen).
- **Invarian Format**: Dilarang menggunakan angka (seperti `T-01`), spasi (`T TOP`), atau huruf kecil (`t-top`).
- **Daftar Kode Resmi Tutor**:
  - Mr. Top (Taufan Hadi): **`T-TOP`**
  - Mr. Amrul (Muhammad Amrullah): **`T-AMR`**
  - Miss Elysa (Elysa Supiani): **`T-ELY`**
  - Miss Nizan (Nizan): **`T-NIZ`**
  - Miss Amel (Amelia): **`T-AME`**
  - Miss Cita (Cita): **`T-CIT`**
  - Miss Siti (Siti Qori' Atun Hizbaeni - TOP): **`T-QOR`**
- **Tampilan Antarmuka & Pemilihan Tutor**: Kode tutor secara khusus diperuntukkan bagi sistem dan tabel `FACULTY & TUTORS` (kolom `CODE`, 55px monospace bold `#f8fafc`). Untuk dropdown pemilihan tutor pada jadwal/Academic Classes Matrix, tampilan tetap menggunakan nama/nickname tutor (`Mr. Top`, `Miss Elysa`, `Mr. Amrul`, `Miss Siti`) agar ramah pengguna (*clean & friendly callouts*), serta didukung input field uppercase pada modal Add & Edit Tutor.

### 2.5.6 Two-Tier Evaluation Architecture: Class-Daily Formative vs Batch-Weekly Report SSOT (DECISION-082)
- **Lapis 1 — Harian (Daily Formative / Tasks / Repetitions / Practice — Domain C Exclusivity)**:
  - Seluruh tugas formatif harian, repetisi kosakata (7×7 Words & Phrases), latihan dialog, dan latihan harian per pertemuan **EKSKLUSIF BERADA DI DALAM KELAS (DOMAIN C)**.
  - Berfungsi sebagai tempat latihan, pembentukan skill, dan *gating* (prasyarat) untuk membuka akses Ujian Mingguan.
  - **Mutlak Dilarang Masuk ke Rapor Siswa di Domain B**: Nilai latihan harian tidak pernah dicatat atau ditarik ke dalam tabel Rapor Siswa (`Student's Report`), agar kesalahan dalam proses latihan tidak merugikan capaian resmi siswa.
- **Lapis 2 — Mingguan & Periodik (Weekly Milestone & Periodic Exams — Domain B Aggregation)**:
  - Ujian resmi berkala (*Milestones*: `EX-1, EX-2, EX-3, EX-4`) dikerjakan di dalam kelas, dan hasil nilai ujian resmi inilah yang **DITARIK KE DOMAIN B (RAPOR SISWA / STUDENT'S REPORT)**.
  - Di Domain B, nilai ujian-ujian tersebut diagregasi menjadi Nilai Akhir mata pelajaran (**`SCORE`**, menggantikan singkatan lokal NA/TOTAL), dan seluruh SCORE mata pelajaran dirangkum menjadi **`AVG` (Average)** untuk menentukan kelulusan level / promosi rombongan belajar.
- **Peran Kolom OVERALL di Domain C**: Kolom `OVERALL` (`PTS` dan `GRD`) pada pojok kanan tabel Domain C adalah rekapitulasi poin mentah kumulatif dan grade akhir khusus untuk satu mata pelajaran tersebut, yang menjadi cerminan Nilai Akhir kelas (`SCORE`) yang dialirkan ke Domain B.

### 2.5.6 Universal Table Column Ordering & Zero Header-Repetition Invariant (SSOT per DECISION-079)
1. **Aturan Baku Penempatan Kolom KODE (Code Column Positioning Invariant)**:
   - **Tabel Berkolom Nomor/Urutan (`#`, `NO`, `LVL`)**: Kolom yang memuat **KODE (`CODE`, `CLASS CODE`, `TEST CODE`)** WAJIB diletakkan **TEPAT SETELAH kolom penomoran tersebut** sebelum kolom nama (`[NO / LVL] | [CODE] | [NAME] | ...`).
   - **Tabel Tanpa Kolom Nomor**: Kolom **`CODE`** WAJIB diletakkan sebagai **kolom pertama (paling kiri)** di tabel tersebut (`[CODE] | [NAME] | ...`).
   - **Penerapan Resmi**:
     - *Academic Classes Matrix*: `LVL | CODE | CLASS NAME | DAY | START | END | ROOM | TUTOR | STD | RATE | STATUS`.
     - *Faculty & Tutors*: `CODE | PIC | NAME | DoB | AGE | ACT`.
     - *Camp Rooms & Venues*: `CODE | ROOM NAME | CAP | TYPE | ACT`.
2. **Zero Header-Repetition in Data Cells (Header/Data Non-Redundancy SSOT)**:
   - Dilarang keras mengulang teks atau kata yang sudah tercantum di judul header kolom ke dalam isi sel data tabel.
   - **Penerapan Resmi pada Kolom BATCH**: Jika header kolom tabel adalah **`BATCH`**, maka isi sel kolom mutlak hanya menampilkan angka/nama pengenal murni (`135`, `134`, `123`, `EV-07`), DILARANG menambahkan awalan kata "Batch" (`Batch 135`, `Batch 134`) karena menciptakan redundansi visual (*visual clutter*). Seluruh awalan `Batch ` wajib di-strip secara konsisten.

### 2.5.7 Authoritative Multi-Level Assessment & Exam Regulations (SSOT per DECISION-078)
Sistem evaluasi akademik TopsCore LMS mengikat pada struktur titik pengujian dan 2 penilaian akhir resmi (dokumentasi lengkap di `docs/EXAM_ASSESSMENT_REGULATIONS.md` dan modul workstation `admin.html#exam-rules`):
1. **Diagnostic Phase (Placement Test)**:
   - 3 Indikator Baseline: Speaking (0–25), Vocabulary Baseline (Target awal: 30 kata), Grammar Baseline (Target awal: 25 poin).
   - Diujikan 1 kali di awal masuk camp melalui wawancara langsung 1-on-1 dengan penguji.
2. **1st Step (Bulan ke-1 / Level 1) — Total 52 Titik Data**:
   - Presensi Harian: 40 sesi (Senin–Jumat, 2 sesi/hari = 10 sesi/minggu).
   - Vocabulary Mastery (Target Kumulatif): 4 kali (W1: 60–90 kata, W2: 120–210 kata, W3: 180–300 kata, W4: 240–450 kata). Evaluasi mingguan; capaian di bawah target minimum ditandai merah.
   - Grammar Mastery: 2 kali (W1: 8–15 poin, W2: 12–20 poin).
   - Basic English Test: 2 kali (W1 & W2: skala 60–100).
   - Speaking Practice (Telling Story): 4 kali (W1, W2, W3, W4; 10–25 poin, rubrik skala 1–5).
3. **2nd Step (Bulan ke-2 / Level 2) — Total 51 Titik Data**:
   - Presensi Harian: 40 sesi (2 sesi/hari).
   - Vocabulary Mastery (Intermediate): 4 kali (W1: 75–120 kata, W2: 155–280 kata, W3: 235–440 kata, W4: 315–600 kata). Pemantauan repeater terisolasi.
   - Advanced Grammar Mastery: 2 kali (W1: 10–30 poin, W2: 17–30 poin).
   - GFS (Grammar for Speaking): 2 kali (W1 & W2: 12–20 poin). Mengukur penerapan tata bahasa langsung dalam percakapan.
   - Speaking Practice (Telling Story): 3 sesi utama (W1, W2, W3; 12–25 poin / rubrik 1–5).
4. **3rd Step (Bulan ke-3 / Level 3) — Total 11 Titik Nilai Akademik (+ 40 Sesi Presensi)**:
   - Vocabulary Mastery (Advanced / Tertinggi): 4 kali (W1: 90–150 kata, W2: 215–400 kata, W3: 340–650 kata, W4: 415–800 kata).
   - Complex Grammar Mastery: 2 kali (W1 & W2: 8–15 poin).
   - Pronunciation Mastery: 2 kali (W1 & W2: ketepatan bunyi fonetik dan intonasi kata).
   - Speaking Practice: 3 sesi (W1, W2, W3: evaluasi kelancaran dan tolak ukur kesiapan Ujian Akhir).
5. **Dual Final Evaluations (2 Penilaian Akhir Independen — Total 8 Parameter)**:
   - **1. Final Exam (Panel 1: Main Examiner / Penguji Utama)**:
     - 4 Parameter: Fluency (25), Pronunciation (25), Idea/Content (25), Grammar (25). Maksimal: **100 Poin**.
   - **2. Final Practice (Panel 2: Speaking Tutor / Tutor Pendamping)**:
     - 4 Parameter: Fluency (25), Pronunciation (25), Grammar (25), Comprehension (25). Maksimal: **100 Poin**.
   - Evaluasi tatap muka individual dengan topik/pertanyaan spontan; penilaian kedua panel bersifat independen tanpa saling mempengaruhi, dihitung rata-rata untuk sertifikat kelulusan.
6. **Rubrik Baku Telling Story (Skala 1–5)**:
   - 1 = Poor (Sangat Kurang), 2 = Fair (Kurang), 3 = Good (Cukup), 4 = Very Good (Baik), 5 = Excellent (Istimewa).

## 2.6 Test Naming & Code Standard Formula (SSOT)
Sistem identitas tes di TopsCore secara resmi HANYA menggunakan 2 identitas baku: **Test Code (`shell_code`)** dan **Test Name (`title`)**. Istilah `display_name` ditiadakan secara permanen agar tidak menimbulkan ambiguitas dan tumpang tindih.

### 2.6.1 Test Code Formula (`shell_code` — Machine & Admin SKU)
- **Formula Baku 4-Blok Simetris**: `PROGRAM-LEVEL_CLASS-CODE-TYPE` (SSOT per DECISION-077)
- **Segmen 1 (PROGRAM)**: Singkatan resmi 4-huruf program belajar (`CAMP` untuk Camp, `EVNK` untuk Evnikom, `SHRT` untuk Sheraton, `TPTC` untuk Tamata).
- **Segmen 2 (LEVEL_CLASS)**: Angka level belajar langsung digabung dengan 3-huruf singkatan kelas **tanpa huruf 'L'** (misal `3VCB` untuk Level 3 Vocabulary, `2VCB` untuk Level 2 Vocabulary, `2SPK` untuk Speaking, `1STT` untuk Storytelling [strictly `STT`]). Meniadakan huruf 'L' mencegah kerancuan tipografi font (seperti `L1` vs `11` vs `I1`). Pada program Non-Level (Level 0), segmen level pada singkatan kelas ditiadakan sehingga murni 3-huruf (`VCB`, `SPK`), sedangkan nomor level `0` disematkan pada segmen kode (Segmen 3: `0G1`, `0G`, `0A1`).
- **Segmen 3 (CODE)**:
  - Untuk Task: Kode tema dan nomor topik (misal `A1`, `A2`, `B1`, ..., `D4`, atau `0G1`, `0G2`, `0A1` untuk Level 0).
  - Untuk Exam: Huruf tema tunggal (misal `A`, `B`, `C`, `D`, atau `0G`, `0A` untuk Level 0).
- **Segmen 4 (TYPE)**: Strictly `TASK` atau `EXAM`.
- **Contoh Resmi**:
  - `CAMP-3VCB-A1-TASK` (Camp Level 3 Vocabulary Topic A1 Task)
  - `CAMP-3VCB-A-EXAM` (Camp Level 3 Vocabulary Theme A Exam)
  - `CAMP-3VCB-D-EXAM` (Camp Level 3 Vocabulary Theme D Exam)
  - `CAMP-2VCB-B2-TASK` (Camp Level 2 Vocabulary Topic B2 Task)
  - `CAMP-2SPK-A1-TASK` (Camp Level 2 Speaking Topic A1 Task)
  - `CAMP-1BSC-A-EXAM` (Camp Level 1 Basic English Theme A Exam)
  - `CAMP-1STT-A1-TASK` (Camp Level 1 Storytelling Topic A1 Task)
  - `EVNK-VCB-0G1-TASK` (Evnikom Level 0 Vocabulary Topic 0G1 Task)
  - `EVNK-VCB-0G-EXAM` (Evnikom Level 0 Vocabulary General 0G Exam)
  - `SHRT-VCB-0A1-TASK` (Sheraton Level 0 Vocabulary Topic 0A1 Task)
  - `TPTC-VCB-0A1-TASK` (Tamata Level 0 Vocabulary Topic 0A1 Task)

### 2.6.2 Test Name Formula (`title` SSOT)
- **Formula Baku Terpadu (Natural English Flow)**:
  ```text
  [LEVEL_ORDINAL] [CLASS_NAME] [TASK/EXAM] [CODE] - [TOPIC/THEME_NAME]
  ```
  - **Bebas Simbol Asing**: Tidak menggunakan kurung siku `[ ]` ataupun titik tengah `·`. Mengalir alami sesuai standar bahasa Inggris akademik.
  - **Task Standar**: `2nd Vocabulary Task A1 - Greetings & Basics`, `2nd Vocabulary Task B1 - Podcast Hosting & Introduction`, `3rd Vocabulary Task A1 - Job Hunting & Application`, `2nd Public Speaking Task A1 - Introduction & Delivery`.
  - **Exam Standar**: `2nd Vocabulary Exam D - Cooking Class`, `3rd Vocabulary Exam A - World of Work`, `1st Vocabulary Exam A - Foundational Communication`.
  - **Program Tanpa Jenjang (Level 0 per DECISION-061)**: Segmen `[LEVEL_ORDINAL]` ditiadakan (karena kurikulum tidak bertingkat), namun kode tetap menyertakan prefix `0` (`0G1`, `0G`, `0A1`): `[CLASS_NAME] [TASK/EXAM] [0_CODE] - [TOPIC/THEME_NAME]` (contoh: `Evnikom Vocabulary Task 0G1 - Time Name`, `Evnikom Vocabulary Exam 0G - General`, `Sheraton Vocabulary Task 0A1 - Pre-Test`). Dilarang mencantumkan kata `1st` pada judul tes program tanpa jenjang.
- **Universal 2-Line Test Title Architecture (SSOT Tampilan Card Dashboard & Header)**:
  Tampilan kartu ujian (Dashboard Next Assignment Hero Card) dan header ruang ujian dirender menjadi **2 Baris Terpisah** via pemisah ` - `:
  - **Baris 1 (Jenis & Kode Tes)**: `[TASK/EXAM] [CODE]` (misal `Task A1`, `Exam A`, `Exam D`). Ditampilkan tebal (Inter 800), warna putih bersih (`#FFFFFF` / `#F8FAFC`). Zero Class Redundancy: Nama kelas (seperti `2nd Vocabulary`) dilarang diulang pada Baris 1 karena sudah terpampang jelas di header atas halaman (`CAMP 3RD VOCABULARY`).
  - **Baris 2 (Nama Tema dan/atau Topik)**: `[NAMA_TEMA/TOPIK]` (misal `Greetings & Basics`, `Job Hunting & Application`, `World of Work`, `Cooking Class`). Ditampilkan di baris kedua secara mandiri dengan aksen Tactical Blue (`#38bdf8`) atau Slate Cerah (`#cbd5e1`), huruf rapi tanpa pemotongan teks atau elipsis (*zero truncation*).
- **Unifikasi Mutlak**: Tidak boleh mencantumkan kata `Words` atau `Phrases` di judul karena materi sudah disatukan (*Unified Topic Package* per DECISION-034).
- **Peniadaan `display_name`**: Seluruh referensi display name dihilangkan. Database dan sistem hanya mengenal `title` sebagai nama tes dan `shell_code` sebagai kode tes.

## 2.7 Module Progression & Prerequisites
Dynamic prerequisites supporting 0 to N parent modules with minimum score thresholds. Report cards store HIGHEST score. Global average counts unattempted available modules as 0.

### 2.7.1 Vocabulary Class Repetitive Mastery & Synchronization Safeguards (SSOT)
> **Ruang Lingkup Khusus (Vocabulary Domain Contract)**: Sub-aturan 7x7 repetisi dan ambang batas kelulusan tugas per-attempt 70% di bawah ini adalah **aturan baku khusus kurikulum kelas VOCABULARY**. Kelas-kelas modalitas lain (Speaking, Storytelling, Grammar, dll.) beroperasi dengan rubrik, durasi, dan sistem penilaian tersendiri sesuai modalitas pembelajarannya.

- **Struktur Repetisi Terpadu 7×7 (Unified Topics)**: Setiap tugas topik terpadu (*Unified Topic Task*, seperti pada Level 3 Vocabulary) memerlukan 14 repetisi tuntas: **7 repetisi Words** dan **7 repetisi Phrases**.
- **Penyebut Matriks Tugas Workstation (Zero Double-Multiplication SSOT)**: Penyebut target repetisi pada tabel workstation wajib selaras dengan struktur kurikulum tanpa penggandaan ganda:
  - **Topik Terpadu (Level 3 / Unified)**: Target per topik adalah **14** (`X/14`), target per tema (4 topik) adalah **56** (`X/56`).
  - **Topik Words-Only (Level 2 / Zero-Phrases)**: Target per topik adalah **7** (`X/7`), target per tema (4 topik) adalah **28** (`X/28`).
  - **Self-Normalizing Invariant**: Jika pengaturan `taskRepetitions` di database bernilai 14 (mewakili total topik), sistem secara otomatis menetapkan target per komponen adalah 7 (`compTargetReps = 7`), mutlak mencegah penyebut membengkak menjadi 28 atau 112.
- **Level 2 Words-Only 7 Repetitions Invariant (Zero-Phrases SSOT)**: Kurikulum Level 2 Vocabulary (`CMP-2VOCAB`) murni memuat **100% Words (nol frase)**. Setiap topik di Level 2 HANYA memerlukan **7 repetisi Words**. Tampilan ringkasan topik di workstation wajib menampilkan skala `X/7` (bukan `X/14`), dan detail per-topik hanya merender 7 kolom (`W1..W7`) tanpa kolom frase (`P1..P7`). Ujian Level 2 menggunakan 4 kolom standar (`RATE | PTS | GRD | STS`).
- **Invarian Kolom Attempt Query**: Seluruh query yang membaca data `attempts` (pada `api.js` dan `dashboard.js`) **WAJIB MENYERTAKAN** kolom `forgiven_reason`, `is_manual_override`, `forgiven_by`, dan `forgiven_at` agar metadata dispensasi dan repetisi manual selalu terbaca 100% konsisten antara admin dan dashboard siswa.
- **Symmetric Backend Partitioning (`adminApplyForgiven`)**: Penginputan nilai atau repetisi manual gabungan (> 7, misal 14) pada Unified Tasks **WAJIB SECARA OTOMATIS DIPECAH SECARA SIMETRIS** menjadi:
  - 7 repetisi `WORDS` (50 butir soal, passing penguasaan repetisi tugas 70% / Grade C, tag `[Admin] MANUAL_REPS: 7/7 WORDS`).
  - 7 repetisi `PHRASES` (10 butir soal, passing penguasaan repetisi tugas 70% / Grade C, tag `[Admin] MANUAL_REPS: 7/7 PHRASES`).
- **Self-Healing Balancer Invariant (Anti-Blockage Guard)**: Jika terdapat kegagalan pelabelan manual atau attempt tak bertag pada Unified Task di mana kelulusan Words $\ge 14$ sementara Phrases bernilai 0, sistem evaluasi kelulusan di `dashboard.js` (pada Next Assignment Hero Card, Leaderboard Standings, dan Completed Tests Table) **SECARA OTOMATIS MENYEIMBANGKAN** separuh repetisi tersebut ke Phrases (7 Words + 7 Phrases). Menjamin mutlak nol kasus frase hilang, nol chip kosong melompong, dan ruang ujian terbuka seketika (*Zero Exam Blockage*).
- **Automated Verification**: Seluruh proteksi ini dikunci dan diverifikasi oleh suite pengujian otomatis `scripts/test_repetitive_mastery_safeguards.mjs` yang terintegrasi langsung ke dalam `npm run test:fast`.

## 2.8 Overall score
Average of all Tests that are available/takeable under current rules and completed by the Student.

## 2.9 Question scoring & Points (PTS) Half-Up Whole Integer Invariant
- Every question is worth **1 point** (partial credit 0.5 for minor spelling/word form error).
- **Points Half-Up Whole Integer Invariant (Aturan Pembulatan Poin Penuh)**: Seluruh akumulasi poin dan nilai poin siswa/kelas (Theme Exam Points, Overall Points, Class Average Points) yang memiliki desimal **`.5` ke atas WAJIB dibulatkan ke atas** menjadi bilangan bulat penuh via `Math.round()` (misal `274.5` $\rightarrow$ `275`, `257.5` $\rightarrow$ `258`, `225.9` $\rightarrow$ `226`, `473.2` $\rightarrow$ `473`, `814.6` $\rightarrow$ `815`). Tidak boleh ada angka berkoma/pecahan desimal pada kolom dan metrik poin.
- **Ceiling Cap Exception (Pengecualian Batas Maksimal / Star Protection Invariant)**: Sebagai pengecualian tunggal atas pembulatan ke atas, jika nilai poin mendekati poin maksimal sempurna (`points >= maxPoints - 0.5` dan `points < maxPoints`), pembulatan **WAJIB DIBULATKAN KE BAWAH (`Math.floor()`)** (contoh: 49.5 dari 50 poin dibulatkan menjadi **49**, bukan 50). Hal ini secara mutlak melindungi integritas predikat **100% Star (★ / Perfect Mastery)** agar predikat bintang sempurna hanya berhak diraih oleh siswa yang benar-benar 100% tanpa kesalahan ejaan.
- **3-Letter 'PTS' Header Abbreviation Invariant**: Header kolom poin wajib menggunakan singkatan 3-huruf resmi **`PTS`** di seluruh resolusi tabel untuk mencegah tumpang tindih (*anti-crowding / zero text wrapping*).
- **5-Pillar Theme Matrix Compact Header Standards (SSOT)**: Seluruh subheader matriks tema kelas resmi menggunakan format ringkas 3–4 huruf: **`TASK`** (Formative Tasks), **`RATE`** (Exam Rate %), **`PTS`** (Exam Points whole integer), **`GRD`** (Exam Grade), dan **`STS`** (Exam/Administrative Status). Mencegah tumpang tindih teks (*anti-crowding*) pada tabel workstation desktop.
- **Overall Performance 3-Pillar Compact Header Standards (SSOT)**: Subheader performa keseluruhan di sisi kanan tabel resmi menggunakan format ringkas: **`DONE`** (Completion Rate %), **`PTS`** (Total Points whole integer), dan **`GRD`** (Overall Grade). Istilah `DONE` menggantikan `PROGRESS` / `PRGRS` untuk melenyapkan kerancuan dengan istilah Program (`PRG`).

## 2.10 Grade
Centralized authoritative grading (Official Grading Scale):

| Symbol | Predicate (Label) | Score Range | Main Color & Gradient | Hex Code |
|:---:|:---:|:---:|:---:|:---:|
| ★ | Excellent (Result Gimmick: Legend) | 100% | Pure Green (Result Gimmick: Purple) | `#00c000ff` (Gimmick: `#c084fc`) |
| A | Excellent | 90% – 99% | Pure Green | `#00c000ff` (`#00c000`) |
| B | Very Good | 80% – 89% | Electric Lime | `#95ff00ff` (`#95ff00`) |
| C | Good | 70% – 79% | Pure Yellow | `#FFFF00` |
| D | Enough | 60% – 69% | Dark Orange | `#FF8C00` |
| E | Less | 0% – 59% | Pure Red | `#FF0000` |

### Unified Color Rules:
- **SSOT One-Touch Global Propagation Protocol ("Rubah Satu Maka Rubah Semua")**:
  - **Semua Merah Ikut Grade E**: Seluruh elemen merah (error, delete, aksi bahaya, `*` wajib, alert kritis) WAJIB merujuk ke Grade E (`--grade-e`, `var(--grade-e)`, `TOPSCORE_COLORS.E`, `.text-fail`).
  - **Semua Kuning Ikut Grade C**: Seluruh elemen kuning (warning, latency alert, draft/pending) WAJIB merujuk ke Grade C (`--grade-c`, `var(--grade-c)`, `TOPSCORE_COLORS.C`, `.text-warning`).
  - **Semua Hijau Ikut Grade A / Star**: Seluruh elemen hijau (sukses, kelulusan, online, published) WAJIB merujuk ke Grade A / Star (`--grade-a`, `--grade-star`, `TOPSCORE_COLORS.A`, `TOPSCORE_COLORS.STAR`, `.text-success`).
  - **Strict No-Hardcoding**: DILARANG mengetik hex mentah (`#ff0000`, `#ffff00`, `#00c000`) lepas. Semua styling wajib memanggil variabel CSS atau `TOPSCORE_COLORS`.
  - **System Chrome Canvas**: Elemen non-semantik (kanvas `#090D16`, sidebar `#0F172A`, border `rgba(255,255,255,0.08)`, metadata slate `#94A3B8`, tactical blue `#38BDF8`, indigo `#6366F1`) menggunakan token palet sistem.
- **Star (★) System vs Student Result Gimmick**: Nilai 100% di seluruh sistem (Admin, Tutor Desk, Database, Dashboard, Rapor, Sertifikat) secara baku menggunakan warna **Hijau Murni (`#00c000ff`)** dengan predikat **EXCELLENT** (`--grade-star: #00c000ff` / `TOPSCORE_COLORS.STAR: '#00c000ff'`). Warna **Ungu (`#c084fc`)** dan predikat **LEGEND** HANYA digunakan secara eksklusif sebagai visual gimmick selebrasi pada Student Test Result Page (`result.html`).
- **Universal Dark Badge Text**: Round grade badges (`.grade-circle`) render dark slate (`#0F172A`) for ALL grade symbols (★, A, B, C, D, E).
- **Dynamic Points**: Points (PTS) dynamically follow `getGradeColorByScore()`.
- **Universal Percentage Metrics**:
  - **Positive Metrics (Score, Progress, Pass, Readiness, Accuracy, Attendance, Pacing %)**: Dinamis mengikuti `getGradeColorByScore(percentage)`.
  - **Negative Metrics (Error, Mistake, Fail, Timeout, Retake Rate %)**: Warnanya WAJIB DIBALIK (*Inverted Scale*) via `getInvertedGradeColor(percentage)`.
- **Special Grades & Action Tokens**:
  - **Grade R (Remedial)**: Pure Yellow / Kuning (`#FFFF00` / `var(--grade-c)`), skor hasil perbaikan capped maksimal 60%.
  - **Grade F (Forgiven / Waiver)**: Pure Red / Merah (`#FF0000` / `var(--grade-e)`), dispensasi kelulusan untuk membuka progression.
  - **Grade X / Level X (Alumni Graduation)**: Penanda resmi kelulusan siswa/batch ke status alumni (`level_number = 99`, `program_status = 'ALUMNI'`, simbol `X`). Warna badge `X` di tabel workstation dan dashboard secara dinamis mengikuti nilai kelulusan akhir siswa (Grade Color SSOT). Alumni mutlak dilarang menggunakan angka 0.
- **Proteksi Kolom Nilai (Score Column Lockdown Invariant)**:
  - Kolom nilai (PROGRESS, RATE, POINT, GRADE) terkunci dari Master Edit Mode inline text inputs default.
  - Kolom nilai HANYA dapat diakses dan dimutasi melalui 3 tombol aksi resmi di Sub Panel Student Test and Grade: **Edit Mode (Cyan `#38bdf8`)**, **Remedi (Kuning)**, dan **Forgive (Merah)**. Hasil pengeditan nilai mendapatkan grade dan warna standar sistem (★, A, B, C, D, E) tanpa token Grade M. Seluruh tombol Edit untuk tabel di seluruh sistem berformat seragam menggunakan warna Tactical Cyan `#38bdf8`.
- **Remedial Rules**: Capped at 60%. Letter "R" appears beside Score percentage on result and grade pages.

### 2.10.1 Standar Warna 4-Pillar (ABCD System & ABCD Tema)
Struktur 4 tahap, 4 tema kelas, atau 4 domain navigasi menetapkan palet resmi **Pink – Orange – Lime – Cyan**:
- **A (Tahap 1 / Domain A / Theme A / Exam 1)**: **Electric Pink (`#ff2d87`)** ➔ Token: `--quad-a`, `TOPSCORE_QUAD_COLORS.A`. *(Independen dari token Bintang Nilai ★)*.
- **B (Tahap 2 / Domain B / Theme B / Exam 2)**: **Dark Orange (`#FF8C00`)** ➔ Token: `--quad-b`, `var(--grade-d)`, `TOPSCORE_COLORS.D`, `TOPSCORE_QUAD_COLORS.B`.
- **C (Tahap 3 / Domain C / Theme C / Exam 3)**: **Electric Lime (`#95ff00`)** ➔ Token: `--quad-c`, `var(--grade-b)`, `TOPSCORE_COLORS.B`, `TOPSCORE_QUAD_COLORS.C`.
- **D (Tahap 4 / Domain D / Theme D / Exam 4)**: **Tactical Cyan / Blue (`#38bdf8`)** ➔ Token: `--quad-d`, `TOPSCORE_QUAD_COLORS.D`, `var(--primary-tactical)`.
- **Zero Raw Hex & Aksen Lembut**: Wajib token `var(--quad-*)` / `TOPSCORE_QUAD_COLORS`. Aksen teks, border, pill latar lembut (`rgba(..., 0.15)`), bukan blok solid pekat.

### 2.10.2 Standar Warna Komponen & Tipe Pengujian (Dual Pairs SSOT)
- **WORDS & TASK**: Menggunakan warna **Electric Lime (`#95ff00` / `var(--grade-b)` / `--words-color` / `--task-color`)**. Mewakili komponen kata dan tugas formatif harian. Konteks dengan Grade B dibedakan melalui bentuk elemen UI (chip/label teks vs badge rapor bulat).
- **PHRASES & EXAM**: Menggunakan warna **Electric Pink (`#ff2d87` / `var(--quad-a)` / `--phrases-color` / `--exam-color`)**. Mewakili komponen frasa dan ujian milestone tema resmi.
- **Universal 7-Step Rainbow Progress Pips (Merah s/d Ungu SSOT)**: Ketujuh kotak indikator progres (pips 1–7) pada WORDS dan PHRASES mengadopsi spektrum pelangi resmi dari token sistem TopsCore yang menyala secara sekuensial:
  1. **Pip 1 (Merah)**: `var(--grade-e)` (`#FF0000` / Grade E Fail)
  2. **Pip 2 (Jingga)**: `var(--grade-d)` (`#FF8C00` / Grade D Less / Quad B)
  3. **Pip 3 (Kuning)**: `var(--grade-c)` (`#FFFF00` / Grade C Enough)
  4. **Pip 4 (Hijau)**: `var(--grade-a)` (`#00c000` / Grade A Very Good)
  5. **Pip 5 (Biru)**: `var(--primary-tactical)` (`#38bdf8` / Tactical Blue)
  6. **Pip 6 (Nila)**: `var(--clr-accent-1)` (`#6366f1` / Royal Indigo)
  7. **Pip 7 (Ungu Spektrum)**: `var(--rainbow-step-7)` (`#C084FC` / Violet Mastery — independen dari token Pilar D)

### 2.10.3 Interface System (Pillar D Master UI & Design System Governance)
TopsCore menyediakan panel **Interface System** terpadu di dalam **Domain D (System Settings)** dengan arsitektur 3 sub-tab modular:
1. **Colours & Palette**: Kendali spektrum warna sistem (Sistem 4 Warna, Sistem 2 Warna, Sistem 3 Warna, Sistem 7 Warna Pelangi, dan Skala Nilai Akademik).
2. **Typography & Texts**: Pilihan kurasi font aman (Inter SSOT untuk UI dan JetBrains Mono untuk angka/timer) serta 3 tingkat kontras warna teks (`--clr-text-1` Pure White, `--clr-text-2` Light Slate, `--clr-text-3` Soft Slate). Batas minimal 12px dan tabular-nums terkunci otomatis.
3. **Surface & Chrome**: Warna kanvas workstation (`#090D16`), sidebar/topbar (`#0F172A`), kartu elevated (`#121c35`), kepekatan garis batas border, dan elevasi matte bersih tanpa pendaran neon.
- Seluruh input mendukung live picker & text hex dengan sinkronisasi realtime ke CSS variables (`:root`) serta persistensi global ke `site_settings` dan `localStorage`.

## 2.11 The 8 Test Evaluation Modules (Unification of Module & Answer Type SSOT)
TopsCore consolidates all legacy 'Module' and 'Answer Type' terminology into authoritative domain modules.
- **Class-Bound Module Isolation Invariant (Prinsip Keterikatan Modul Khusus Kelas)**:
  Modul evaluasi terikat secara eksklusif ke kelasnya masing-masing dan **MUTLAK TIDAK BISA DIPAKAI SILANG** di kelas lain. Sekalipun dua modul memiliki kemiripan interaksi (misalnya sama-sama menggunakan input suara/audio antara *Spoken Module* di Vocabulary, *Speech Module* di Speaking, dan *Monologue Module* di Storytelling), modul tersebut **hanya mirip secara teknis, bukan sama secara domain**. Setiap modul memiliki engine penilaian, rubrik, batas toleransi, dan bobot kelulusan tersendiri yang terkunci pada kelasnya.
- **Vocabulary Mastery Modules (Disiplin Vocabulary Eksklusif)**:
  Kelas Vocabulary secara khusus dan eksklusif HANYA menggunakan keluarga **Vocabulary Mastery Modules** yang terdiri dari 3 modul terpisah (kode legasi `M2, M3, M4` mutlak ditiadakan), diurutkan secara alfabetis (A–Z):
  1. **Recognition Module**: Evaluates 4-choice distractor recognition and contextual filtering.
  2. **Spoken Module**: Evaluates phonetic speech analysis and pronunciation verification.
  3. **Written Module**: Evaluates text typing, spelling recall, and semantic precision.
- **Modul Disiplin Khusus Lainnya (Non-Vocabulary Class Modalities)**:
  4. **Description Module** (Visual Context & Pronouns eksklusif untuk Basic English / `BSC`)
  5. **Speech Module** (Formal 5-Pillar Speaking Assessment eksklusif untuk Public Speaking / `SPK`)
  6. **Monologue Module** (Independent 3–5 min Narrative Speech eksklusif untuk Storytelling / `STT`)
  7. **Dialogue Module** (Turn-based Roleplay & Pair Live Conversation Room)
  8. **Interview Module** (Guided Sequential Q&A)

## 2.12 AI Scoring Pipeline (Stateless)
Stateless & Low-Egress. Audio/media processed transiently in browser/Edge Functions and discarded; Supabase stores only structured text/JSON scores, transcripts, and metadata.

## 2.13 Answer Tolerance & Partial Credit Engine
Authoritative evaluation matrix implemented in `js/grading.js`:
- Exact match: 1.0 pt (`correct`).
- 1–2 char edit distance (Damerau-Levenshtein $\le 2$): Spoken 1.0 pt (`correct`), Written 0.5 pt (`minor_spelling_error`).
- Function word dropped/added in 4+ word idiom: 1.0 pt (`correct`).
- Plural-s / -es mismatch across multi-word idiom: 1.0 pt (`correct`).
- Word form / POS root match (stem $\ge 5$): 0.5 pt (`minor_word_form_error`).
- Pronoun substitution or semantic mismatch: 0.0 pt (`incorrect`).

## 2.14 Test lifecycle
Statuses: Strictly `PUBLISHED` and `DRAFT`. Legacy statuses `UNPUBLISHED` and `ARCHIVED` normalize to `DRAFT`. Only `PUBLISHED` tests can be taken by students.
Test types: Strictly `TASK` (modular learning check) and `EXAM` (formal examination). Legacy `QUIZ` is eradicated.

## 2.15 Attempts
Statuses: `NOT_STARTED`, `IN_PROGRESS`, `SUBMITTED`, `AUTO_SUBMITTED`, `EXPIRED`, `CANCELLED`.
Page refresh resumes existing attempt; network drops do not create duplicates. Double-submit is idempotent.

## 2.16 Timer
Server-authoritative timer: client visual countdown is UI only. Server validates deadline on save/submit.

### 2.16.1 Standar Durasi & Pacing Ujian SSOT (Modality-Specific Pacing Invariant per DECISION-063)
- **Standar Pacing Otomatis Baku Khusus Vocabulary Class**:
  - **Per Kata (Words)**:
    - **Spoken**: **10 detik** per kata / soal.
    - **Written**: **15 detik** per kata / soal (memperhitungkan pengetikan dan pengejaan).
    - **Selection (Multiple Choice)**: **10 detik** per kata / soal.
  - **Per Frasa (Phrases)**:
    - **Spoken**: **20 detik** per frasa / idiom / kalimat (artikulasi kalimat lengkap).
    - **Selection (Multiple Choice)**: **10 detik** per frasa / soal (membaca & memilih 1 dari 5 opsi).
    - **Written**: **25 detik** per frasa / kalimat (multi-word idiom keyboarding & spelling).
- **Formula Durasi Ujian Terpadu (Unified Exam Benchmark)**:
  $$\text{Durasi (menit)} = \left\lceil \frac{(\text{Jumlah Kata} \times \text{Pace Kata}) + (\text{Jumlah Frasa} \times \text{Pace Frasa})}{60} \right\rceil$$
  - Contoh Ujian 200 Soal (160 Words Written @ 15s + 40 Phrases Selection @ 10s):
    $$(160 \times 15\text{s}) + (40 \times 10\text{s}) = 2.400\text{s} + 400\text{s} = 2.800\text{s} \longrightarrow \mathbf{47\text{ menit}}.$$
  - Contoh Ujian 200 Soal (160 Words Spoken @ 10s + 40 Phrases Spoken @ 20s):
    $$(160 \times 10\text{s}) + (40 \times 20\text{s}) = 1.600\text{s} + 800\text{s} = 2.400\text{s} \longrightarrow \mathbf{40\text{ menit}}.$$
  - Words Task (40 soal): Spoken = **7 menit**, Written = **10 menit**.
  - Phrases Task (10 soal): Spoken = **4 menit**, Selection = **2 menit**.
- **Mutlak Nol Pengali Arbitrer**: Dilarang keras menggunakan rumus lama arbitrer seperti `totalQ * 1.5` yang menghasilkan waktu 300 menit (5 jam) atau membatasi input durasi di `max="180"`.
- **Hak Override Manual Tutor (Tutor Manual Duration Override Authority)**:
  - Durasi terhitung otomatis tampil secara reaktif di modal buka sesi saat tutor mengganti pilihan modul Words/Phrases (`Auto: 47 min (...)`).
  - Tutor/Admin memiliki wewenang penuh untuk menentukan durasi secara manual (`working_duration_minutes`) jika kelas/sesi membutuhkan waktu khusus. Jika diset manual, nilai manual tutor selalu diutamakan (*precedence*).

## 2.17 Historical snapshot without Test Versions
No `TestVersion` entities. At attempt start, capture immutable snapshots of questions and accepted answers. Historical results are never recalculated by rereading today's records.

## 2.18 Soft delete
Business entities use soft delete (`deleted_at IS NULL`). Never hard-delete historical results or attempts.

## 2.19 Audit log
Material admin and security actions write structured audit records. Never log plaintext passwords or PINs.

---

## 2.20 Declarative UI, Spatial & Workflow Invariants
Operational, spatial, typographic, and workflow specifications are modularized into dedicated source-of-truth files detailed in [# 4. MODULAR SPECIFICATION MAP](#4-modular-specification-map).

## 2.21 Universal Zero-Truncation Invariant & 3-Tier Header Standards (SSOT)
All table columns, labels, titles, and metrics must display 100% in full without truncation or ellipsis (`...`). Calibrated column dimensions and 3-tier header abbreviations are authoritatively codified in [`.agents/rules/ui-invariants.md` Section 4.2](file:///.agents/rules/ui-invariants.md#42-aturan-text-wrap-universal-zero-truncation-invariant--standar-singkatan-header-3-tier-ssot).

## 2.22 Universal Master Edit Mode White Excel Gridlines Invariant & Sub Panel Edit Mode Standard
- **Mandatory Sub Panel Edit Mode Button**: Di setiap halaman/view pada workspace yang memiliki tabel di dalamnya, bagian **Sub Panel (Lower Panel 40px)** WAJIB memiliki tombol **"Edit Mode"** (yang berganti status/label menjadi `Done Editing` saat aktif).
- **Peniadaan Tombol Edit di Baris Tabel**: Dilarang keras membuat kolom `ACTIONS` atau tombol `Edit` di dalam baris tabel hanya untuk membuka modal edit, karena pengeditan dilakukan secara terpusat melalui tombol Edit Mode di Sub Panel untuk mode inline gridline Excel.
- **Excel Gridlines Activation**: Saat Master Edit Mode aktif (`body.global-edit-mode-on`), seluruh tabel me-render garis batas putih tegas khas Excel (`rgba(255, 255, 255, 0.45)`) dengan input dan select borderless transparan per [`.agents/rules/ui-invariants.md` §4.3](file:///.agents/rules/ui-invariants.md#43-universal-master-edit-mode-white-excel-gridlines-invariant-agentsmd-222).

## 2.23 Standard Student Name (`studentName`) & Dashboard-Only Title (`Mr.` / `Miss`)
- **Default Principle**: Authentic standard name (`studentName` / `name` / `session.student_name`) everywhere across system.
- **Single Location of Title Addition (Dashboard-Only)**: The **Student Dashboard** (`dashboard.html` / `js/dashboard.js`) is the SOLE location where gender honorific titles (`Mr.` / `Miss`) or batch champion titles (`King` / `Queen`) are prepended to `studentName` for greeting.
- **Universal Standard Name Everywhere Else**: Standard authentic name directly in database (`students.name`), session, admin tables, test/result/conversation rooms, dropdowns, and exports.

## 2.24 Authoritative Dummy Account Standard ("Top") & Ultra-Compact Avatars
- **Canonical Dummy Name**: Strictly **"Top"** (e.g. `Top`, `Top Evnikom`, `Top Anon`). "Test", "Test Student", "test_anon" are permanently deprecated.
- **Ultra-Compact Avatars**: Use zero-egress SVG data URI via `generateAvatarDataUri('Top')` (~500 B). Raster avatars $\le 2\text{ KB}$ ($120 \times 160$ px). Never upload raw images to Supabase for dummy accounts.

## 2.25 In-Browser Photo & Avatar Processing (Zero Supabase Storage Egress)
- All photos and avatars are processed strictly **client-side (browser)** via Canvas compression or SVG data URIs, never stored as raw uncompressed image files in Supabase Storage.

## 2.26 Minimal Supabase Footprint & Extreme Egress Minimization Priority (SSOT)
- **Extreme Minimization Priority**: Setiap perancangan fitur, arsitektur, dan perubahan alur kerja WAJIB mengutamakan peminimalisiran kuota Supabase (Egress Bandwidth, Database Requests/Operations, dan Storage) semaksimal dan seekstrem mungkin pada ambang batas teknis yang memungkinkan.
- **Strict Polling & Wire Transfer Guard**: Dilarang melakukan polling interval terhadap kolom besar (seperti `payload`, `snapshots`, atau array besar). Polling real-time/live WAJIB hanya men-select kolom skalar minimal (`id`, `status`, `expires_at`, `score`). Batas transfer maksimal 2–5 KB per siklus polling.
- **Client-Side Compute & Buffer First**: Jawaban ujian dan interaksi siswa wajib dibuffer di browser (`localStorage`/`sessionStorage`) dengan zero database spam. Sinkronisasi dilakukan secara batch atau final submit.
- **Lean Live Monitor**: Hilangkan fitur live monitoring yang membebani database (seperti polling berkala tabel jawaban/snapshots detail). Jika fitur live view siswa dirasa memberatkan kuota atau performa, fiturnya disederhanakan murni ke status attempt skalar (Online / In Progress / Finished / Expel).

## 2.27 Authoritative Entity Status & Type Standards (SSOT)
- **Student Status (`students.program_status` / `is_active`)**: Strictly **`ACTIVE`**, **`HOLD`**, **`ALUMNI`**, and **`INACTIVE`**. Legacy `graduated` and `completed` terms are eradicated and consolidated into `ALUMNI`. `HOLD` represents students paused or not advancing with their batch, serving as a dedicated roster target for batch transfers.
- **Class Status (`classes.is_active` / `status`)**: Strictly **`ACTIVE`** and **`INACTIVE`**.
- **Batch Status (`batches.is_active`)**: Strictly **`ACTIVE`** and **`INACTIVE`** (`completed` does not exist for batches).
- **Test Status (`tests.status`)**: Strictly **`PUBLISHED`** and **`DRAFT`** (`unpublished` and `archived` are normalized to `DRAFT`).
- **Test Type (`tests.test_type` / `tests.category`)**: Strictly **`TASK`** and **`EXAM`** (`quiz` is legacy and eradicated).

## 2.28 Dual-Viewport Ecosystem: Student Mobile-Locked (430px) vs Admin Desktop-Locked (100vh)
- **Student Realm (Strictly Mobile-Locked)**: Seluruh alur siswa (`index.html`, `dashboard.html`, `test.html`, `result.html`, `conversation.html`) WAJIB tampil dalam proporsi mobile terpusat (`max-width: 430px; margin: 0 auto;`), baik dibuka di perangkat mobile maupun browser laptop/PC desktop. Kanvas luar desktop menggunakan deep dark slate (`#060911`). Seluruh header, sticky navigation, dan fixed bottom bar terkunci dalam koridor 430px.
- **Admin & Tutor Realm (Strictly Desktop-Locked)**: Seluruh console admin (`admin.html`) WAJIB berformat desktop workstation (`100vh` locked single-screen, multi-kolom high-density data tables, Sub Panel 40px, 4-pillar quadrant).

## 2.29 Room-Exclusive Print Protocol (Zero Print in Student Result Page)
- Fitur cetak (print report, diagnostic summary, evaluasi) DILARANG berada di halaman hasil siswa (`result.html`).
- Seluruh fitur cetak resmi hanya boleh ada dan diakses melalui **Room** (Admin Console / Tutors Room / Live Room).

## 2.30 Enterprise Table Typography & Weight Hierarchy (SSOT Skala Ketebalan Huruf Tabel)
- **Skala Ketebalan Huruf Tabel Baku (Enterprise Weight Scale)**:
  1. **Sub-Header (Baris 2)**: **`font-weight: 400` (Regular, strictly not bold)** untuk seluruh label sub-kolom.
  2. **Isi Sel Normal (Standard Data Cells)**: **`font-weight: 500` (Inter Medium)** untuk angka, poin PTS, persentase rate %, dan teks status sel agar terbaca jernih, tajam, dan tidak pudar di tema gelap maupun terang.
  3. **Kolom Identitas / Sticky Key (Student Name, Batch Name, Code)**: **`font-weight: 600` (Inter SemiBold)** untuk penegasan pemindaian visual tanpa mendominasi header.
  4. **Super-Header (Baris 1) & Judul Section**: **`font-weight: 700` (Inter Bold)** untuk hirarki induk kelompok.
  5. **Brand Hero & Landmark (Level 0 / 30px Hero)**: **`font-weight: 800`–`900` (ExtraBold/Black)**.
- **Larangan Huruf Tebal Liar di Dalam Sel Data**: Dilarang keras menggunakan huruf tebal liar (`700`, `800`, `900`) pada sel-sel data angka atau teks umum baris tabel. Detail di [`.agents/rules/ui-invariants.md` §2.0, §4.1 & §4.11](file:///.agents/rules/ui-invariants.md#41-dimensi-tabel-baku--native-display-lock-universal-table-standardization-protocol--construction-blueprint).

## 2.31 Zero Table Capsule & Zero Table Glow Invariant (Isi Tabel Bebas Kapsul & Nol Glow SSOT)
- **Larangan Mutlak Kapsul/Pill/Badge Pada Seluruh Isi Sel Tabel**: Seluruh isi sel tabel (`table td`, `.datagrid-table td`, `.table-wrap td`, `.classes-hub-grid-row`, `.tree-grid-row`, `.matrix-table td`, modal tables) **MUTLAK TIDAK BOLEH** menggunakan kapsul, pill, badge, background fill (`background: transparent !important;`), border kotak kapsul (`.badge { border: none !important; }`), maupun padding badge (`padding: 0 !important;`). Status hanya boleh direpresentasikan melalui warna font teks tipografi (`color: ...`).
- **Ketegasan Garis Pembatas Kisi Sel (Adaptive Dual-Layer Gridlines)**: Larangan border kotak di atas khusus melarang elemen badge/kapsul di dalam sel, TETAPI sel tabel (`td`) itu sendiri **WAJIB memiliki garis pembatas kisi adaptif (Adaptive Dual-Layer Gridlines)** berupa `border-bottom` dan `border-right` halus antar-sel yang menyesuaikan secara cerdas per tema (`#e2e8f0` di Light, `#2d2d2d` di Charcoal Dark, `rgba(255, 255, 255, 0.05)` di Navy, dengan `:last-child { border-right: none; }`).
- **Mutlak Nol Glow di Seluruh Sistem**: Dilarang keras menggunakan efek glow, text-shadow, atau box-shadow pada teks maupun sel tabel (`text-shadow: none !important; box-shadow: none !important; filter: none !important;`). Teks wajib terbaca tegas, bersih (*crisp*), kontras tinggi, dan bebas blur per [`.agents/rules/ui-invariants.md` §4.9 & §4.13](file:///.agents/rules/ui-invariants.md#49-zero-table-capsule--zero-table-glow-invariant-ssot).

## 2.32 Standardized 50px Bottom Banner Invariant (`#bottom-ad-banner` / `.topscore-locked-banner`)
- **Strict 50px Height Lock**: Tinggi banner bawah di seluruh antarmuka aplikasi terkunci mati tepat **`50px`** (`height: 50px !important; min-height: 50px !important; max-height: 50px !important; box-sizing: border-box !important;`).
- **Centered Alignment SSOT**: Teks `"TopsCore by Mr. Top"` berada tepat di tengah (*centered*) secara mutlak di seluruh viewport (`justify-content: center !important; text-align: center !important; padding: 0 16px !important;`), baik pada kontainer banner maupun inner wrapper (`.banner-brand-wrap` & `.banner-brand-content`). Aturan lama yang menerapkan rata kiri (*left-aligned*) atau asymmetric padding kiri resmi dihapus dan dilarang.
- **Uniform 12px Font & Weight SSOT**:
  - Seluruh teks pada banner (`TopsCore` maupun `by Mr. Top`) wajib menggunakan ukuran seragam **`12px`** (`font-size: 12px !important;`), font baku tunggal `'Inter', sans-serif`, dan bobot identik **`font-weight: 700 !important;` (Bold)** (`letter-spacing: 0.04em`).
  - Aturan lama yang membedakan ukuran dan ketebalan font (16px vs 14px, 900 vs 800) resmi dihapus dan digantikan oleh standar 12px seragam demi kerapian visual.
  - Warna: `TopsCore` menggunakan Tactical Cyan (`#38bdf8`) dengan pendaran halus (`text-shadow: 0 0 8px rgba(56, 189, 248, 0.35)`), dan `by Mr. Top` menggunakan White Slate (`#f8fafc`).
- **Dual-Viewport Execution**:
  - Pada Student Realm (koridor mobile 430px), banner terkunci di dasar layar terpusat (`max-width: 430px; margin: 0 auto;`).
  - Pada Admin Desktop Realm (100vh workstation), konsol kerja `#admin-console` memotong tepat 50px (`height: calc(100vh - 50px) !important; max-height: calc(100vh - 50px) !important;`) untuk menjamin zero outer page scroll.
- **Strict 10px Clearance**: Elemen/tombol aksi di atas banner (seperti tombol `#back-dashboard-btn` pada `result.html`) berjarak tepat 10px dari tepi atas banner. Aturan detail diatur dalam [`.agents/rules/ui-invariants.md` §1.8](file:///.agents/rules/ui-invariants.md#18-standardized-50px-bottom-banner-invariant-bottom-ad-banner--topscore-locked-banner-ssot).

## 2.33 Single-Font Architecture (SSOT: Inter For Everything)
- **100% Inter Typeface**: Sistem TopsCore LMS secara mutlak hanya menggunakan **1 font saja: `Inter`** (`'Inter', sans-serif`).
- **Pemberantasan Total Font Outfit**: Font `Outfit` dihapus dan dilarang di seluruh sistem (judul halaman, title area modal, header tabel, tombol CTA, nilai hero metrics, kartu, hingga banner).
- Seluruh variabel CSS font display (`--font-display`, `--fm-font-display`) dan font body (`--font-sans`, `--font-body`, `--fm-font-sans`) dipetakan secara terpusat ke `'Inter', sans-serif`.
- Hierarki visual diatur secara murni melalui skala ukuran terpusat (20px, 16px, 14px, 12px, 30px, 40px) dan ketebalan font (*font-weight*: 400 untuk sel tabel regular, 700/800/900 untuk judul, hero metrics, dan tombol aksi).

## 2.34 Universal Two-Tier Themed Headers Architecture (Dark Surface with Category-Themed Colored Fonts Across All Tables SSOT)
- **Universal Two-Tier Themed Headers across ALL Tables in TopsCore (Font Saja Yang Berwarna)**:
  - Setiap tabel di seluruh sistem TopsCore (baik `#class-attendance-grid`, `student_roster_raport_grid_v2`, `student_roster_data_grid_v2`, `#blueprint-matrix-table`, `#vault-table`, maupun tabel modular/dinamis lainnya) yang memiliki dua tingkat header (Baris 1 Super-Header dan Baris 2 Sub-Header) **WAJIB menerapkan latar belakang gelap pekat solid (`#0b1120`, `#0f172a`, atau `#212121` di Charcoal) dengan HANYA FONT/TEKS YANG BERWARNA**, dan format pembingkaian gelap ini **BERLAKU SERAGAM DI SEMUA TEMA TERMASUK LIGHT MODE** (Solid Dark Header Framing with Category-Themed Fonts).
  - Dilarang menggunakan blok latar belakang neon/terang solid yang berat dan menyilaukan mata pada tema gelap (*no full bright solid background blocks*).
  - Sub-Header pada Baris 2 **MUTLAK MENGIKUTI 100% warna font/teks Super-Header induknya** di atas kanvas latar belakang gelap pekat yang sama.
- **Aturan Keselarasan Warna Super Header dan Sub Header (100% Exact Group Color Match Invariant)**:
  - Setiap super-header dan seluruh sub-header di bawah kelompok kolom yang sama WAJIB memiliki warna font/teks yang 100% PERSIS SAMA (satu kelompok = satu warna identik).
  - Dilarang keras super-header berwarna berbeda dari sub-headernya (misal: super-header kuning sementara sub-header pink).
  - Ujian tema (Exam) adalah anggota keluarga tak terpisahkan dari tema terkait, sehingga Super-Header Ujian (`THEME A EXAM`, `THEME B EXAM`, dst.) wajib menggunakan warna kuadran tema aktif (Electric Pink `#ff2d87` untuk Tema A, Dark Orange `#ff8c00` untuk Tema B, Electric Lime `#95ff00` untuk Tema C, Tactical Cyan `#38bdf8` untuk Tema D) dan dilarang keras di-override ke warna kuning/amber arbitrer.
- **Larangan Efek Opasitas Parsial (Anti-Muddy Background SSOT)**:
  - Latar belakang header wajib 100% solid opacity (`#0b1120` atau `#0f172a`) agar baris tabel yang di-scroll di bawahnya tidak tembus pandang (*no opacity bleed-through*). Dilarang keras menggunakan opasitas parsial (`rgba 0.5–0.9`).
- **Pemisah Antar-Tingkat (1px Inter-Tier Divider)**:
  - Garis horizontal pembatas antara Super-Header (Baris 1) dan Sub-Header (Baris 2) berukuran halus 1px (`border-bottom: 1px solid rgba(255, 255, 255, 0.18)`).
- **Anti-Double Divider Line Invariant**:
  - Garis pembatas vertikal antar-kelompok kolom yang berada pada jalur/sumbu pertemuan yang sama WAJIB DISATUKAN menjadi 1 garis tunggal 2px (`border-right: 2px solid rgba(255, 255, 255, 0.22); border-left: none !important;`). Dilarang border ganda 4px (`border-right` + `border-left`) yang membuat garis tampak menebal atau berhimpit.
- **Sub Panel Theme/Topic Navigation Architecture**:
  - Tombol navigasi tema dan topik wajib berada di Sub Panel (Lower Panel 40px) pada sisi paling kiri (`flex-start`) dengan ukuran seragam **95px** (`width: 95px !important; height: 30px !important;`), zero floating navigation bar.
- **Propagasi Otomatis di Tingkat Engine DataGrid (`js/admin/datagrid.js`)**:
  - Engine `DataGrid` secara otomatis menyalurkan gaya dan class tema (`col-subhdr-theme-*`, `col-subhdr-students-data`, `col-subhdr-demographic`, `col-subhdr-address`, `col-subhdr-security`, `col-subhdr-class`) dari `superHeaders` ke setiap anak kolom sub-header yang dinaunginya, menjamin konsistensi 100% di seluruh aplikasi. Detail lengkap dikodifikasi dalam [`.agents/rules/ui-invariants.md` §4.6 & §4.11](file:///.agents/rules/ui-invariants.md#411-universal-two-tier-themed-headers-architecture-dark-surface-with-category-themed-colored-fonts-across-all-tables-ssot).

## 2.35 Workspace Dual-Zone Rule (Card + Table Layout Invariant SSOT)
Ketika antarmuka workstation admin menggabungkan kartu ringkasan/governance/kontrol (*Cards/Panels*) dengan tabel data (*Datagrid*), sistem WAJIB menerapkan salah satu dari 2 arsitektur resmi:
1. **Cards Kiri & Tabel Kanan (Horizontal Split)**: Digunakan saat tabel berkolom ringkas ($\le 6$–7 kolom).
2. **Cards Atas & Tabel Bawah (Vertical Split)**: Digunakan saat tabel berkolom banyak ($\ge 8$–12 kolom, misal Curriculum Hub). Kartu-kartu berjejer rapi di baris atas (`flex: 0 0 auto`), dan tabel data membentang penuh (*full-width*, `flex: 1 1 0`) di bawahnya dengan scroll vertikal/horizontal hanya di dalam `.table-wrap`.
Dilarang keras menaruh toolbar liar di dalam workspace. Detail lengkap di [`.agents/rules/ui-invariants.md` §1.9](file:///.agents/rules/ui-invariants.md#19-workspace-dual-zone-rule-card--table-layout-invariant-ssot).

## 2.36 Alphabetical Ordering First Priority Invariant (SSOT Aturan Baku Pengurutan Alfabetis)
Setiap kali sistem melakukan pengurutan (*sorting*), menampilkan daftar modul pembelajaran/evaluasi, kartu komponen tata kelola, opsi dropdown, atau elemen antarmuka yang setara, **urutan alfabetis (Alphabetical A–Z) MUTLAK menjadi aturan baku yang dipertimbangkan pertama kali (First Priority Consideration)**:
1. **Vocabulary Mastery Modules**: Tiga modul evaluasi wajib tersusun alfabetis:
   - **Recognition Module** (R)
   - **Spoken Module** (S)
   - **Written Module** (W)
   Hal ini berlaku seragam pada kartu kontrol (*Governance Cards*), kartu pacing kata & frase, deskripsi engine pada kolom tabel workstation, modal pengaturan, dan definisi modul di `js/api.js`.
2. **Dropdowns & Option Lists**: Seluruh daftar pilihan dalam form input, dropdown filter, dan checklist yang tidak memiliki hierarki numerik bawaan (seperti Level 1, 2, 3) WAJIB disusun alfabetis (A–Z) guna memastikan konsistensi dan kecepatan pemindaian visual.
3. Detail operasional lengkap di [`.agents/rules/ui-invariants.md` §1.10](file:///.agents/rules/ui-invariants.md#110-alphabetical-ordering-first-priority-invariant-ssot-aturan-baku-pengurutan-alfabetis).

## 2.37 Universal 10px Full-Perimeter & Panel Boundary Invariant (Aturan Baku Jarak 10px 4-Sisi Panel)
- **Bukan Hanya Antar-Elemen**: Aturan jarak 10 pixel **BUKAN HANYA** berlaku antar-elemen (kartu, form, tombol, toolbar, tabel), melainkan juga berlaku **MUTLAK sebagai jarak pembatas (clearance/gap) dengan panel atas, bawah, dan samping**:
  1. **Panel Atas (Top Panel / Nav Tabs / Workspace Header)**: Jarak tepi atas elemen/kartu/tabel ke panel atas terkunci tepat **10px** (`padding-top: 10px;` atau `gap: 10px;`).
  2. **Panel Bawah (Sub Panel / Lower Panel 40px)**: Jarak tepi bawah elemen/kartu/tabel ke Sub Panel terkunci tepat **10px** (`padding-bottom: 10px;` atau `gap: 10px;`).
  3. **Panel Samping Kiri (Sidebar / Left Navigation)**: Jarak tepi kiri elemen/kartu/tabel ke sidebar terkunci tepat **10px** (`padding-left: 10px;`).
  4. **Panel Samping Kanan (Tepi Layar / Right Viewport Edge)**: Jarak tepi kanan elemen/kartu/tabel ke batas kanan monitor terkunci tepat **10px** (`padding-right: 10px;`).
- **Workspace Full-Perimeter Consistency**: Seluruh container workspace (`.admin-content`, `#mockup-table-canvas-wrap`, dsb.) wajib menerapkan `padding: 10px 10px 10px 10px !important; box-sizing: border-box !important; gap: 10px !important;` untuk menjamin kerapian simetris dan mutlak bebas dari jarak rapat 0px maupun gap ganda liar (20px–30px). Detail teknis di [`.agents/rules/ui-invariants.md` §1.2](file:///.agents/rules/ui-invariants.md#12-universal-10px-container-gap--4-way-panel-perimeter-invariant-ssot).

## 2.38 Faculty & Staff Identity Card Standards (Tutor & Staff ID Badge SSOT)
- **Arsitektur Kartu Tanda Pengenal (Physical ID Badge Style)**:
  - Seluruh kartu pengenal pengajar (Tutor), instruktur, dan staf di TopsCore wajib mengadopsi format **Kartu Tanda Pengenal Fisik**:
    - **Lanyard Clip Notch**: Lubang klip gantungan tali kartu di bagian atas tengah kartu.
    - **Avatar / Profil**: Ukuran 44px–48px dengan border aksen gender dan status dot online.
    - **Bidang Data Wajib**: `NAME`, `GENDER`, `DOB / AGE` (tanggal lahir + kalkulasi usia otomatis, e.g. `14 May 1995 (31 yrs)`), `ADDRESS` (alamat domisili/asal), `ASSIGNED CLASSES`, dan status tugas live.
    - **Security Stamp & Barcode**: Monospace ID stamp (`TC-CEC-TUTOR-###` / `TC-TOP-INST-###`) dan barcode visual.
- **Standar Pembeda Institusi (CEC vs TOP)**:
  - 🏛️ **CEC Campus Faculty Card (`.tenant-cec`)**: Header tag Tactical Cyan (`#38bdf8`) dengan badge `CEC ACADEMIC FACULTY`. Menampilkan jenjang level mengajar (`Level 1`, `Level 2`, `Level 3`) dan modalitas kurikulum. Lembaga: **Cake English Course**.
  - 🏨 **TOP Corporate Instructor Card (`.tenant-top`)**: Header tag Dark Orange (`#ff8c00`) dengan badge `TOP CORPORATE INSTRUCTOR`. Menampilkan penugasan program korporat (*Evnikom*, *Sheraton*, *Tamata*), fokus hospitality/perhotelan, dan penanda Level 0 (Non-Level). Lembaga: **Top Occupational Program**.
- **Aturan Baku Aksen Warna Gender (Gender Color Accent SSOT)**:
  - 🍏 **Tutor & Staf Pria (Male — `.gender-male`)**:
    - Aksen: **Electric Lime (`#95ff00` / `var(--grade-b)`)** pada border kiri kartu (4px solid), avatar frame, lanyard notch, dan badge gender.
    - Kontras teks: Wajib **Dark Slate (`#0f172a`)** tebal (Inter 800) pada background Lime.
  - 🌸 **Tutor & Staf Wanita (Female — `.gender-female`)**:
    - Aksen: **Electric Pink (`#ff2d87` / `var(--quad-a)`)** pada border kiri kartu (4px solid), avatar frame, lanyard notch, dan badge gender.
    - Kontras teks: Wajib **Crisp White (`#ffffff`)** tebal (Inter 800) pada background Pink.
- Rujukan teknis lengkap dikodifikasi dalam [`.agents/rules/ui-invariants.md` §5.5](file:///.agents/rules/ui-invariants.md#55-faculty--staff-identity-card-standards-tutor--staff-id-badge-ssot).

## 2.39 Universal 3-Theme Spectrum Architecture & Adaptive Gridlines SSOT
Sistem antarmuka TopsCore LMS mengelola 3 tema resmi yang didukung secara natif dan konsisten:
1. **Navy Mode (`data-theme="navy"`)**:
   - Canvas Viewport: `#090D16` (Deep Navy Abyssal)
   - Cards & Surface: `#0F172A` (Slate Card)
   - Table Headers: `#0F172A` (Solid Slate Framing)
   - Subtle Gridlines: `rgba(255, 255, 255, 0.05)`
2. **Charcoal / Black OLED Mode (`data-theme="dark"`)**:
   - Canvas Viewport: `#141414` / `#161616` (Pure Obsidian Charcoal)
   - Cards & Surface: `#212121` (Zinc Elevated Card)
   - Table Headers: `#2a2a2a` (Charcoal Neutral Framing)
   - Subtle Gridlines: `#2d2d2d` (antara sel `td`) & `#383838` (border kartu)
3. **Tiered Grey Light Mode (`data-theme="light"`)**:
   - Canvas Viewport: `#eef2f6` (Soft Calm Slate — Level 0 depth yang meniadakan efek silau 100% white void)
   - Cards & Table Paper: `#ffffff` (Pure Crisp White Paper card — Level 1 elevation dengan border pembatas `#cbd5e1`)
   - Sidebar & Framing: `#1e293b` (Sleek Light Charcoal / Slate Gray — lebih terang dan nyaman dibandingkan hitam pekat)
   - Table Headers & Framing: `#1e293b` (Solid Light Charcoal Framing dengan font berwarna per kategori tema)
   - Subtle Gridlines: `#cbd5e1` (antara sel `td`)
- **Pilar ke-13 Datagrid SSOT — Adaptive Dual-Layer Table Gridlines & Boundary Dividers**:
  Di seluruh tema, setiap sel data tabel (`td`) wajib memiliki garis kisi adaptif: `border-bottom: 1px solid var(--admin-border-subtle)` dan `border-right: 1px solid var(--admin-border-subtle)` dengan `td:last-child { border-right: none !important; }`. Pembatas antar-grup kategori (Super-Header Dividers / `.super-hdr-divider` dan `.col-sticky-2`) wajib menggunakan garis kontras tegas 2px: `var(--admin-border-divider)` (`#94a3b8` di Light, `#52525b` di Charcoal Dark, `rgba(255, 255, 255, 0.22)` di Navy). Garis tepi perimeter luar tabel wajib menggunakan `var(--admin-border-perimeter)` (`#64748b` di Light, `#52525b` di Charcoal Dark, `rgba(255, 255, 255, 0.28)` di Navy). Saat Master Edit Mode aktif, garis ini menguat menjadi garis putih tegas khas Excel (`var(--admin-border-active)` / `rgba(255, 255, 255, 0.45)`).
- **Universal Semantic Data Colors Invariant (Statuses, Percentages & Tactical Actions)**:
  Di SELURUH tabel sistem (Student Roster, Dashboard Matrix, Classes Hub, Board, Class Attendance):
  1. **Status Kolom (`STATUS`)**: Wajib berwarna semantik baku, DILARANG dipaksa menjadi hitam atau pudar.
     - `Active` / `ACTIVE`: Green (`#16a34a` di Light / `var(--grade-a)` `#00c000` di Dark/Navy).
     - `Inactive` / `INACTIVE`: Red (`#dc2626` di Light / `var(--grade-e)` `#ef4444` di Dark/Navy).
     - `Hold` / `HOLD` / `STANDBY`: Amber/Yellow (`#d97706` di Light / `var(--grade-c)` `#FFFF00` di Dark/Navy).
     - `Alumni` / `ALUMNI`: Purple (`#7c3aed` di Light / `var(--quad-d)` `#c084fc` di Dark/Navy).
     - `Ongoing` / `Live`: Tactical Cyan (`#0284c7` di Light / `#38bdf8` di Dark/Navy).
     - `Completed`: Green (`#16a34a` di Light / `var(--grade-a)` di Dark/Navy).
  2. **Nilai Persentase (`RATE`, `DONE %`, `WRD %`, `PHR %`, `TASK %`, `ACC`)**:
     - $\ge 80\%$: Hijau (`#16a34a` / `var(--grade-a)`).
     - $60\% - 79\%$: Kuning/Amber (`#d97706` / `var(--grade-c)`).
     - $< 60\%$: Merah (`#dc2626` / `var(--grade-e)`).
  3. **Tombol Promosi Level (`.btn-level-up-cell`)**: Menampilkan kapsul hijau taktis interaktif (`#dcfce7` bg / `#15803d` border & teks di Light Mode; `rgba(34, 197, 94, 0.18)` bg / `#4ade80` di Dark/Navy Mode).
- **Universal Matte Enterprise Palette SSOT (Mutlak Nol Glow di Seluruh Sistem)**:
  Di SELURUH antarmuka sistem TopsCore LMS (Student Dashboard, Result Screen, Test Engine, Admin Workspace, Modals, Tutor Room, dan Bottom Banner), pendaran cahaya (neon glow, ambient auras, radial glow gradients, dan text-shadows) DIHAPUS DAN DILARANG SECARA BAKU. Seluruh kontainer, kartu indikator, tombol standby/hover, lencana, metrik, dan tabel menerapkan elevasi matte presisi tinggi (*Flat Enterprise Precision*):
  - `box-shadow`: Dilarang menggunakan pendaran ambient neon (`0 0 Xpx [color]`). Gunakan elevasi matte bersih berbobot gelap seperti `box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35)` atau `box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4)` atau `none`.
  - `text-shadow`: Mutlak `text-shadow: none !important;` di seluruh tipografi, nilai persentase, angka skor, dan label.
  - `background`: Menggunakan warna datar pekat (*solid matte dark* seperti `#0f172a`, `#090d16`, `#070b19`). Dilarang menggunakan `radial-gradient` yang meniru efek neon aura.
  - `border`: Menggunakan garis batas solid dengan warna semantik token yang tegas (`1px` atau `1.5px solid var(--tier-color)` / `var(--grade-*)`) tanpa pendaran glow.
- **Flat Enterprise Precision (Zero Standby Neon Aura & Flat Elevation)**:
  Standby buttons, badges, dan cards berstatus mutlak flat (`box-shadow: none !important; text-shadow: none !important;`). Pada Light Mode, kartu kerja menggunakan elevasi mikro `box-shadow: 0 1px 3px rgba(0,0,0,0.04)`. Pendaran neon glow dilarang di seluruh sistem baik pada posisi standby maupun hover/active.

## 2.40 Tutor Desk Mobile Layout, 40px Switcher Dock, 30px Bottom Level Bar & Spreadsheet Score Matrix SSOT
- **Switcher Dock Height Invariant (Strict 40px Across All Areas)**:
  Bilah dock pengalih area kerja utama (`.tutor-master-dock` / `#tutor-master-dock`) dikunci mutlak dengan tinggi **`40px`** (`height: 40px !important; min-height: 40px !important; max-height: 40px !important; line-height: 40px !important; box-sizing: border-box;`) di seluruh area aplikasi. Tombol pengalih (`.dock-switch-btn`) berketinggian 32px (`height: 32px !important;`) dengan margin vertikal 4px yang presisi. Bilah ini menaungi 2 kluster kerja: `STUDY AREA` (Attendance & Scores) dan `ENGLISH AREA` (Fines & Payment).
- **Bottom Level Selector Bar Invariant (Strict 30px SSOT)**:
  Bilah pemilih level belajar (`.tutor-bottom-level-bar` / `#tutor-bottom-level-bar` dengan tombol `1st | 2nd | 3rd`) ditempatkan secara ergonomis di bagian bawah layar tepat di atas switcher dock 40px. Ketinggian bilah dikunci mutlak **`30px`** (`height: 30px !important; min-height: 30px !important; max-height: 30px !important; line-height: 28px !important;`). Tombol level berketinggian 26px (`flex: 1 1 33.333%`), kontras tinggi, dan tersinkronisasi di seluruh view (Attendance, Scores, Fines, Payment). Level bar atas pada panel tabel dihilangkan guna memaksimalkan ruang vertikal data.
- **Spreadsheet Grid Score Input Invariant (Zero Floating Capsule Boxes)**:
  Seluruh input nilai manual pada datagrid nilai (`.grade-manual-input` di kelas Vocabulary, Speaking, Storytelling, Grammar, Basic English, dsb.) WAJIB berformat **Spreadsheet Grid Cell murni**. Dilarang keras menggunakan kotak floating capsule, border terpisah, border-radius melengkung, atau latar belakang gelap terpisah di dalam sel data (`border: none !important; border-radius: 0 !important; background: transparent !important;`). Input mengisi 100% sel `<td>` dengan garis pembatas tabel adaptif. State fokus memberikan outline highlight Excel (`outline: none !important; background: rgba(56, 189, 248, 0.12) !important; box-shadow: inset 0 0 0 1.5px var(--primary-tactical, #38bdf8) !important;`). Browser number spinners disembunyikan sepenuhnya.

---

# 3. TARGET ARCHITECTURE

- **Frontend**: Static HTML5 + vanilla CSS3 + modular ES6 JavaScript (`js/` modules). Deployable on Netlify/Vercel.
- **Backend Services**: Supabase PostgreSQL database, Supabase Auth, Storage buckets, and Edge Functions (`supabase/functions/`).
- **Stateless AI Engine**: Media processed transiently; scores and transcripts stored in Supabase.
- **Explicitly Out of Scope**: Do NOT introduce Django, Docker, Celery, Redis, or a separate Node/Python web server.

---

# 4. MODULAR SPECIFICATION MAP

To prevent truncation under Antigravity's 24 KB per-file limit, detailed specifications are modularized into dedicated source-of-truth files:

| Topic | Modular File Reference | Key System Invariants Codified |
| :--- | :--- | :--- |
| **Product Roadmap** | [`docs/ROADMAP.md`](file:///docs/ROADMAP.md) | Historical and active evolution milestones. |
| **Live Project State** | [`docs/CURRENT_STATE.md`](file:///docs/CURRENT_STATE.md) | Authoritative restart point ($\le 120$ lines). |
| **Architectural Decisions** | [`docs/DECISIONS.md`](file:///docs/DECISIONS.md) | Permanent architectural decision records (ADRs). |
| **Database Schema & RLS** | [`docs/DATABASE_SCHEMA.md`](file:///docs/DATABASE_SCHEMA.md) | Schema, foreign keys, RLS policies, migrations. |
| **Edge Functions & Lifecycle** | [`docs/EDGE_FUNCTIONS.md`](file:///docs/EDGE_FUNCTIONS.md) | Edge Functions, attempt lifecycle, server scoring. |
| **Excel Ingestion Schemas** | [`docs/EXCEL_FORMATS.md`](file:///docs/EXCEL_FORMATS.md) | Roster, question bank, vocabulary Excel formats. |
| **AI Continuation System** | [`docs/CONTINUATION_SYSTEM.md`](file:///docs/CONTINUATION_SYSTEM.md) | AI handoff, continuation triggers, prompt templates. |
| **UI, Spatial & Tables** | [`.agents/rules/ui-invariants.md`](file:///.agents/rules/ui-invariants.md) | Single-screen 100vh lock, 10px gap, 40px Sub Panel, 3-level typographic scale, display: table, white Excel gridlines, and Centered loading states via canonical `getLoadingStateHtml(message)`. |
| **Agent Workflow & CLI** | [`.agents/rules/agent-workflow.md`](file:///.agents/rules/agent-workflow.md) | Lean agile workflow, no git commit/push gate, Windows CLI standards. |
| **Master Governance Rules** | [`.antigravityrules`](file:///.antigravityrules) | Master index and domain governance rules. |

---

# 5. ATOMIC WORK RULE & DO NOT DO LIST

## 5.1 Atomic Work Rule
Every change must be executed atomically:
1. Identify smallest safe next task.
2. Implement cleanly without regressions.
3. Run automated verification scripts.
4. Update `docs/CURRENT_STATE.md` and `docs/CHANGELOG.md`.

## 5.2 Do Not Do These Things
- DO NOT generate, create, modify, or delete any files, code, UI components, configs, or features that were NOT explicitly requested by the user (Strict Zero Unsolicited Action Invariant per §0.3).
- DO NOT bypass RLS or write plaintext PINs/passwords.
- DO NOT invent business Student IDs.
- DO NOT create Test Version entities.
- DO NOT hardcode colors outside `TOPSCORE_COLORS` / CSS variables.
- DO NOT prepend "Mr." or "Miss" titles to student names outside the Student Dashboard (strictly exclusive to Student Dashboard greeting per Rule 2.23).
- DO NOT use "Test", "Test Student", or "test_anon" for dummy accounts; strictly use "Top" (Rule 2.24).
- DO NOT upload large binary files or uncompressed avatars to Supabase; strictly client-side processing (Rule 2.25).
- DO NOT keep or upload oversized screenshots; max height ~600–800px (< 30 KB). WAJIB terapkan protokol Rolling Single Screenshot & Auto-Purge: saat screenshot baru dibuat, screenshot lama wajib langsung dihapus dari sistem untuk mencegah penumpukan file.
- DO NOT allow table cells, headers, or entity labels to truncate with ellipsis (`...`) when viewport space exists.
- DO NOT render non-white or missing gridlines when Master Edit Mode is active (Universal White Excel Gridlines).
- DO NOT use capsules, pills, badges, borders, or background fills in data table cells; status colors are strictly typographic (Rule 2.31 & ui-invariants.md §4.9).
- DO NOT apply glow, text-shadow, or box-shadow to data table cells, numbers, or text (Rule 2.31 & ui-invariants.md §4.9).
- DO NOT use unicode emojis in data tables/headers/cards; strictly use SVG vector icons via `getClassSvgIcon()`.
- DO NOT create ceremonial `/plan` files for standard UI/table tweaks (enforce Fast-Track UI Execution).
- DO NOT fragment table adjustments across multiple turns; always do single-pass updates (header, cells, edit mode).
- DO NOT run monolithic sequential tests for quick edits; use `npm run test:fast` (< 1.5s) or `npm run test:table` (~0.5s).
- DO NOT spawn headless browsers (Puppeteer/Playwright) to diagnose routine DOM clicks; diagnose statically or via JSDOM.
- DO NOT perform recursive DOM mutations inside `MutationObserver` without disconnect or re-entrancy flags.
- DO NOT re-query 8 structural tables on every tab switch; utilize in-memory session caching for reference data.
- DO NOT perform unbounded `git grep` sprees; target the authoritative rendering component directly.
- DO NOT edit governance files (`ui-invariants.md`, `AGENTS.md`) in the middle of micro-turns for trivial tweaks.
- DO NOT invoke bare `npm` in Windows PowerShell (`npm.ps1` block); use `npm.cmd run <script>`.
- DO NOT use PowerShell cmdlets (`Set-Content`, `Get-Content`) to modify code/docs; use native editor or Node.js.
- DO NOT commit or push to Git until explicit user command ("no commit until I say so!").
- DO NOT dump historical phase narratives into `docs/CURRENT_STATE.md` ($\le 120$ lines).
- DO NOT leave completed plans in `docs/plans/` (max 3 active) or scratch scripts in `scripts/`.
- DO NOT duplicate rules across documentation files; follow Hub & Spoke SSOT architecture.

## 5.3 Documentation Hygiene & Rolling Window Protocol
1. **`docs/CHANGELOG.md`**: Strict rolling window of **25 latest phases** in ultra-condensed format (Header + 2–3 high-signal deliverable bullets). Phases older than 25 must be flushed to `docs/archive/`.
2. **`docs/CURRENT_STATE.md`**: Strictly bounded to $\le 120$ lines as the authoritative restart point (current phase, system invariants, latest ~5–8 milestones, and next action). Historical phase narratives belong exclusively in `CHANGELOG.md`.
3. **`tasks.md` vs `docs/TODO.md`**: Active task checklist is strictly maintained in `tasks.md` in root. Never dump completed micro-tasks into `docs/TODO.md`.
4. **`docs/plans/` Plan Lifecycle**: Strict upper bound of $\le 3$ active plans. Completed or rejected plans must be purged or archived immediately upon phase conclusion.
5. **Workspace Hygiene & One-Off Eradication**: Any single-use script in `scripts/` must be deleted immediately after its run. Only permanent regression test suites linked in `package.json` may remain in the repository.
6. **`docs/SESSION_LOG.md`**: Deprecated / optional.

## 5.4 Hub & Spoke SSOT Architecture & Zero-Duplication Invariant
Every documentation topic belongs to exactly ONE authoritative file (Single Source of Truth). All other files MUST reference it via direct clickable link (`file:///...`), and MUST NOT copy-paste redundant rule text or tables:
- **🎨 Official Color & Grading SSOT**: [`AGENTS.md` Section 2.10](file:///AGENTS.md#210-grade).
- **📐 UI, Layout, Table & Typography SSOT**: [`.agents/rules/ui-invariants.md`](file:///.agents/rules/ui-invariants.md).
- **🤖 AI Agent Workflow & Protocol SSOT**: [`.agents/rules/agent-workflow.md`](file:///.agents/rules/agent-workflow.md).
- **🗄️ Database Schema & RLS Policies SSOT**: [`docs/DATABASE_SCHEMA.md`](file:///docs/DATABASE_SCHEMA.md).
- **🧭 Master Navigation & Quick Index**: [`.antigravityrules`](file:///.antigravityrules) at root.
