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
- **Minimal Supabase Footprint**: Zero uncompressed storage, select scalar columns, in-memory reference caching.

## 0.2 Aturan Penerapan di Setiap Perintah (Standing Operational Discipline: Cepat, Cermat, Tepat, dan Akurat)
Setiap instruksi dan perintah dari pengguna WAJIB dieksekusi dengan 4 pilar kedisiplinan mutlak:
1. **Cepat (Fast & Direct)**: Eksekusi langsung ke sasaran tanpa penundaan bertele-tele (zero ceremonial overhead). Gunakan tes cepat (`npm.cmd run test:fast`, `npm.cmd run test:table`) dan hindari proses lambat/unbounded grep.
2. **Cermat (Meticulous & Comprehensive)**: Periksa seluruh dampak sistemik dan keterkaitan file (CSS, JS, template HTML, database/API) sebelum dan sesudah perubahan. Pastikan tidak ada detail atau edge case yang terlewat.
3. **Tepat (Precise & Aligned)**: Penuhi kehendak pengguna secara persis sesuai konteks, tanpa asumsi liar, tanpa salah sasaran, dan taat 100% pada SSOT serta hierarki aturan.
4. **Akurat (Accurate & Verified)**: Seluruh sintaks, formula perhitungan, pembulatan, token warna, dan layout wajib 100% valid dan lolos verifikasi pengujian otomatis (Zero Regressions, 100% Green).

### 0.2.1 Protokol Audit Tangkapan Layar (Visual Screenshot Invariant Audit Protocol)
Setiap kali pengguna mengunggah tangkapan layar (screenshot), agen WAJIB secara proaktif melakukan audit visual menyeluruh berdasarkan 7 pilar tanpa menunggu diminta:
1. **Spacing & Gaps (Strict 10px Lock)**: Jarak antar-elemen dan antar-seksi tepat 10px (bebas gap ganda 20px–30px atau phantom gaps).
2. **Card Internal Padding (Strict 10px Lock)**: Jarak konten dalam kartu ke garis border luar tepat 10px.
3. **Dual-Scale Typography Architecture**: Skala terpusat (12px, 14px, 16px, 20px, 30px, 40px); mutlak nol font sub-12px dan nol angka perantara liar (18px, 13px, 15px).
4. **Punctuation & Zero-Truncation**: Titik dua wajib menempel ke kata tanpa spasi (`Label:` bukan `Label :`), teks tidak terpotong (*zero truncation/ellipsis*).
5. **Color SSOT & Semantic Precision**: Menggunakan token resmi (`#38bdf8` Tactical Blue), dilarang menggunakan warna hijau Grade A pada status input belum terverifikasi.
6. **Language Purity (100% English)**: Seluruh label, judul, tombol, dan pesan instruksi wajib dalam bahasa Inggris murni (zero mixed languages).
7. **Clutter & Redundancy Eradication**: Mutlak nol deskripsi redundan (*Zero Subtitle Clutter* & *Zero Description Clutter*).

## 0.3 Larangan Mutlak Tindakan Liar / Tanpa Permintaan (Strict Zero Unsolicited Action Invariant)
Sistem dan AI coding agent MUTLAK DILARANG berinisiatif di luar batas perintah:
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

---

# 2. NON-NEGOTIABLE BUSINESS RULES

## 2.1 Admin primary navigation & ABCD System
The admin navigation uses the **ABCD System** hierarchy with dedicated 4-pillar quadrant colors:
1. `A — ADMIN` (Executive Dashboard, Profiles, Curriculum & Level Master, Organization) — **Electric Pink (`#ff2d87` / `var(--quad-a)`)**
2. `B — BOARD` (Batches, Rosters, Progress, Student Attendance) — **Dark Orange (`#FF8C00` / `var(--grade-d)` / `var(--quad-b)`)**
3. `C — CLASS` (Active Classes, Learning Sessions, Rosters, Class Tests) — **Electric Lime (`#95ff00` / `var(--grade-b)` / `var(--quad-c)`)**
4. `D — DATA` (Vocabulary Vault, Item Banks, Modules, System Settings, Audit Logs) — **Vibrant Purple / Violet (`#C084FC` / `var(--quad-d)`)**

## 2.2 Student business ID
There is **no business-facing Student ID**. Use only internal database primary key/UUID. Never request or display Student ID in login, forms, lists, imports, or student-facing screens.

## 2.3 Student login & Student Gate Hierarchy
```text
INSTITUTION -> PROGRAM -> BATCH -> STUDENT NAME -> PERSONAL PIN -> LOGIN
```
Server verifies that Program belongs to Institution, Batch belongs to Program, Student belongs to Batch, Student is active, and PIN is valid. Never store plaintext PINs.
- **Cascade Section Visibility**: Every completed step remains visible in a collapsed `.selected` card with its chosen label and a functional `Change` button.
- **Student Gate UI Invariants**: Strictly governed by `.agents/rules/ui-invariants.md` §5.3 (10px container gap & card internal padding, dynamic shrink-to-fit list without artificial min-height, 44px ergonomic touch capsule, neutral PIN digit input, 30px Outfit 900 brand header as Level 0 Brand Hero Landmark, vector SVG Open Book badge, and Zero Subtitle Clutter).

## 2.4 Class and Level Assignment
Classes are assigned to a **Level**. Students/Batches progress through Levels.

### 2.4.1 Level Promotion & Passing Threshold Invariant (SSOT Aturan Baku Promosi Level)
- **Syarat Kelulusan Promosi (Passing Threshold)**: Kelayakan kenaikan level (`isEligibleNext` / tombol `NEXT`) WAJIB merujuk 100% pada batas kelulusan resmi TopsCore, yaitu **Grade C (skor $\ge 60\%$)** atau `min_score` pada metadata tes, dispensasi administratif resmi (**Grade F** / `is_forgiven = true`), atau Remedial yang diselesaikan (**Grade R**).
- **Mutlak Nol Angka Ambang Batas Arbitrer**: DILARANG KERAS menggunakan angka ambang batas arbitrer atau hardcoded di luar SSOT (seperti angka liar `70%`). Siswa yang telah mencapai Grade C (60%–79%) telah resmi lulus (*Enough*) dan mutlak berhak dipromosikan bersamaan tanpa ada yang tertahan.
- **Keselarasan Roster & Batch**: Seluruh siswa dalam batch yang telah menyelesaikan ujian levelnya dengan status lulus/forgiven berhak dipromosikan bersamaan ke level berikutnya agar tidak terjadi ketimpangan level antar-siswa dalam satu rombongan belajar.

## 2.5 Test Auto-Assignment (Level-Centric)
Tests (Tasks & Exams) are created within a Class. Because that Class belongs to a Level, the system automatically assigns the test to any Batch/Student that has unlocked that Level. Batches inherit tests automatically based on their current Level.

## 2.6 Test name formula
```text
INSTITUTION + PROGRAM + CLASS + LEVEL + TEST TYPE + TEST TITLE
```
Store structured fields separately and generate/display the name dynamically from components.

## 2.7 Module Progression & Prerequisites
Dynamic prerequisites supporting 0 to N parent modules with minimum score thresholds. Report cards store HIGHEST score. Global average counts unattempted available modules as 0.

## 2.8 Overall score
Average of all Tests that are available/takeable under current rules and completed by the Student.

## 2.9 Question scoring & Points (PTS) Half-Up Whole Integer Invariant
- Every question is worth **1 point** (partial credit 0.5 for minor spelling/word form error).
- **Points Half-Up Whole Integer Invariant (Aturan Pembulatan Poin Penuh)**: Seluruh akumulasi poin dan nilai poin siswa/kelas (Theme Exam Points, Overall Points, Class Average Points) yang memiliki desimal **`.5` ke atas WAJIB dibulatkan ke atas** menjadi bilangan bulat penuh via `Math.round()` (misal `274.5` $\rightarrow$ `275`, `257.5` $\rightarrow$ `258`, `225.9` $\rightarrow$ `226`, `473.2` $\rightarrow$ `473`, `814.6` $\rightarrow$ `815`). Tidak boleh ada angka berkoma/pecahan desimal pada kolom dan metrik poin.
- **3-Letter 'PTS' Header Abbreviation Invariant**: Header kolom poin wajib menggunakan singkatan 3-huruf resmi **`PTS`** di seluruh resolusi tabel untuk mencegah tumpang tindih (*anti-crowding / zero text wrapping*).
- **5-Pillar Theme Matrix Compact Header Standards (SSOT)**: Seluruh subheader matriks tema kelas resmi menggunakan format ringkas 3–4 huruf: **`TASK`** (Formative Tasks), **`RATE`** (Exam Rate %), **`PTS`** (Exam Points whole integer), **`GRD`** (Exam Grade), dan **`STS`** (Exam/Administrative Status). Mencegah tumpang tindih teks (*anti-crowding*) pada tabel workstation desktop.
- **Overall Performance 3-Pillar Compact Header Standards (SSOT)**: Subheader performa keseluruhan di sisi kanan tabel resmi menggunakan format ringkas: **`DONE`** (Completion Rate %), **`PTS`** (Total Points whole integer), dan **`GRD`** (Overall Grade). Istilah `DONE` menggantikan `PROGRESS` / `PRGRS` untuk melenyapkan kerancuan dengan istilah Program (`PRG`).

## 2.10 Grade
Centralized authoritative grading (Official Grading Scale):

| Symbol | Predicate (Label) | Score Range | Main Color & Gradient | Hex Code |
|:---:|:---:|:---:|:---:|:---:|
| ★ | Excellent | 100% | Electric Pink | `#ff2d87` (`#ff2d87ff`) |
| A | Very Good | 90% – 99% | Pure Green | `#00c000ff` (`#00c000`) |
| B | Good | 80% – 89% | Electric Lime | `#95ff00ff` (`#95ff00`) |
| C | Enough | 60% – 79% | Pure Yellow | `#FFFF00` |
| D | Less | 30% – 59% | Dark Orange | `#FF8C00` |
| E | Fail | 0% – 29% | Pure Red | `#FF0000` |

### Unified Color Rules:
- **SSOT One-Touch Global Propagation Protocol ("Rubah Satu Maka Rubah Semua")**:
  - **Semua Merah Ikut Grade E**: Seluruh elemen merah (error, delete, aksi bahaya, `*` wajib, alert kritis) WAJIB merujuk ke Grade E (`--grade-e`, `var(--grade-e)`, `TOPSCORE_COLORS.E`, `.text-fail`).
  - **Semua Kuning Ikut Grade C**: Seluruh elemen kuning (warning, latency alert, draft/pending) WAJIB merujuk ke Grade C (`--grade-c`, `var(--grade-c)`, `TOPSCORE_COLORS.C`, `.text-warning`).
  - **Semua Hijau Ikut Grade A**: Seluruh elemen hijau (sukses, kelulusan, online, published) WAJIB merujuk ke Grade A (`--grade-a`, `var(--grade-a)`, `TOPSCORE_COLORS.A`, `.text-success`).
  - **Strict No-Hardcoding**: DILARANG mengetik hex mentah (`#ff0000`, `#ffff00`, `#00c000`) lepas. Semua styling wajib memanggil variabel CSS atau `TOPSCORE_COLORS`.
  - **System Chrome Canvas**: Elemen non-semantik (kanvas `#090D16`, sidebar `#0F172A`, border `rgba(255,255,255,0.08)`, metadata slate `#94A3B8`, tactical blue `#38BDF8`, indigo `#6366F1`) menggunakan token palet sistem.
- **Star (★) Independence & Exclusivity**: Nilai 100% (★ / Excellent) menggunakan token mandiri `--grade-star: #ff2d87` / `TOPSCORE_COLORS.STAR: '#ff2d87'`.
- **Green Color Policy**: Green elements reference **Grade A (`#00c000ff`)**, never Star.
- **Universal Dark Badge Text**: Round grade badges (`.grade-circle`) render dark slate (`#0F172A`) for ALL grade symbols (★, A, B, C, D, E).
- **Dynamic Points**: Points (PTS) dynamically follow `getGradeColorByScore()`.
- **Universal Percentage Metrics**:
  - **Positive Metrics (Score, Progress, Pass, Readiness, Accuracy, Attendance, Pacing %)**: Dinamis mengikuti `getGradeColorByScore(percentage)`.
  - **Negative Metrics (Error, Mistake, Fail, Timeout, Retake Rate %)**: Warnanya WAJIB DIBALIK (*Inverted Scale*) via `getInvertedGradeColor(percentage)`.
- **Special Grades & Action Tokens**:
  - **Grade R (Remedial)**: Pure Yellow / Kuning (`#FFFF00` / `var(--grade-c)`), skor hasil perbaikan capped maksimal 60%.
  - **Grade F (Forgiven / Waiver)**: Pure Red / Merah (`#FF0000` / `var(--grade-e)`), dispensasi kelulusan untuk membuka progression.
  - **Grade M (Manual Score)**: Tactical Cyan (`#38bdf8`), skor hasil input atau override manual oleh Admin.
  - **Grade X (Alumni Graduation)**: Vibrant Purple / Ungu (`#8b5cf6` / `#C084FC`), penanda kelulusan batch/siswa ke status alumni.
- **Proteksi Kolom Nilai (Score Column Lockdown Invariant)**:
  - Kolom nilai (PROGRESS, RATE, POINT, GRADE) terkunci dari Master Edit Mode inline text inputs.
  - Kolom nilai HANYA dapat diakses dan dimutasi melalui 3 tombol aksi resmi di Sub Panel Student Test and Grade: **Manual (Cyan)**, **Remedi (Kuning)**, dan **Forgive (Merah)**.
- **Remedial Rules**: Capped at 60%. Letter "R" appears beside Score percentage on result and grade pages.

### 2.10.1 Standar Warna 4-Pillar (ABCD System & ABCD Tema)
Struktur 4 tahap, 4 tema kelas, atau 4 domain navigasi menetapkan palet resmi **Pink – Orange – Lime – Ungu**:
- **A (Tahap 1 / Domain A / Theme A / Exam 1)**: **Electric Pink (`#ff2d87`)** ➔ Token: `--quad-a`, `TOPSCORE_QUAD_COLORS.A`. *(Independen dari token Bintang Nilai ★)*.
- **B (Tahap 2 / Domain B / Theme B / Exam 2)**: **Dark Orange (`#FF8C00`)** ➔ Token: `--quad-b`, `var(--grade-d)`, `TOPSCORE_COLORS.D`, `TOPSCORE_QUAD_COLORS.B`.
- **C (Tahap 3 / Domain C / Theme C / Exam 3)**: **Electric Lime (`#95ff00`)** ➔ Token: `--quad-c`, `var(--grade-b)`, `TOPSCORE_COLORS.B`, `TOPSCORE_QUAD_COLORS.C`.
- **D (Tahap 4 / Domain D / Theme D / Exam 4)**: **Vibrant Purple / Violet (`#C084FC`)** ➔ Token: `--quad-d`, `TOPSCORE_QUAD_COLORS.D`.
- **Zero Raw Hex & Aksen Lembut**: Wajib token `var(--quad-*)` / `TOPSCORE_QUAD_COLORS`. Aksen teks, border, pill latar lembut (`rgba(..., 0.15)`), bukan blok solid pekat.

### 2.10.2 Standar Warna Komponen Pembelajaran (Words & Phrases SSOT)
- **Frame Kartu, Judul, Ikon & CTA**: Menggunakan standar terpadu **Tactical Blue / Cyan (`#38bdf8` / `var(--primary-tactical)`)** untuk frame kartu, teks judul, ikon SVG, garis pembatas, dan tombol aksi footer (elegan, modern, dan bebas dari kesan tacky).
- **Universal 7-Step Rainbow Progress Pips (Merah s/d Ungu SSOT)**: Ketujuh kotak indikator progres (pips 1–7) pada WORDS dan PHRASES mengadopsi spektrum pelangi resmi dari token sistem TopsCore yang menyala secara sekuensial:
  1. **Pip 1 (Merah)**: `var(--grade-e)` (`#FF0000` / Grade E Fail)
  2. **Pip 2 (Jingga)**: `var(--grade-d)` (`#FF8C00` / Grade D Less / Quad B)
  3. **Pip 3 (Kuning)**: `var(--grade-c)` (`#FFFF00` / Grade C Enough)
  4. **Pip 4 (Hijau)**: `var(--grade-a)` (`#00c000` / Grade A Very Good)
  5. **Pip 5 (Biru)**: `var(--primary-tactical)` (`#38bdf8` / Tactical Blue)
  6. **Pip 6 (Nila)**: `var(--clr-accent-1)` (`#6366f1` / Royal Indigo)
  7. **Pip 7 (Ungu)**: `var(--quad-d)` (`#C084FC` / Quad D Violet Mastery)

## 2.11 The 8 Test Evaluation Modules (Unification of Module & Answer Type SSOT)
TopsCore consolidates all legacy 'Module' and 'Answer Type' terminology into a single authoritative concept: **Module** (`m1`–`m8`):
1. **Description** (`m1`, formerly *Point & Speak!* — Visual Context & Pronouns)
2. **Selection** (`m2`, formerly *Multiple Choice* — Standardized Multi-Option Choices)
3. **Written** (`m3`, formerly *Vocabulary Mastery* — Text, Spelling & Lexical Precision)
4. **Spoken** (`m4`, formerly *Read Aloud / Pronunciation* — Speech & Phonetic Analysis)
5. **Speech** (`m5`, formerly *Speaking Performance* — Formal 5-Pillar Speaking Assessment)
6. **Monologue** (`m6`, formerly *Storytelling* — Independent 3–5 min Narrative Speech)
7. **Dialogue** (`m7`, formerly *Turn-based Roleplay* — Pair Live Conversation Room via WebRTC)
8. **Interview** (`m8`, formerly *Conversation-based* — Guided Sequential Q&A)

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

## 2.22 Universal Master Edit Mode White Excel Gridlines Invariant
When Master Edit Mode is active (`body.global-edit-mode-on`), every table renders crisp white Excel gridlines (`rgba(255, 255, 255, 0.45)`) with borderless, transparent inputs per [`.agents/rules/ui-invariants.md`](file:///.agents/rules/ui-invariants.md).

## 2.23 Standard Student Name (`studentName`) & Dashboard-Only Title (`Mr.` / `Miss`)
- **Default Principle**: Authentic standard name (`studentName` / `name` / `session.student_name`) everywhere across system.
- **Single Location of Title Addition (Dashboard-Only)**: The **Student Dashboard** (`dashboard.html` / `js/dashboard.js`) is the SOLE location where gender honorific titles (`Mr.` / `Miss`) or batch champion titles (`King` / `Queen`) are prepended to `studentName` for greeting.
- **Universal Standard Name Everywhere Else**: Standard authentic name directly in database (`students.name`), session, admin tables, test/result/conversation rooms, dropdowns, and exports.

## 2.24 Authoritative Dummy Account Standard ("Top") & Ultra-Compact Avatars
- **Canonical Dummy Name**: Strictly **"Top"** (e.g. `Top`, `Top Evnikom`, `Top Anon`). "Test", "Test Student", "test_anon" are permanently deprecated.
- **Ultra-Compact Avatars**: Use zero-egress SVG data URI via `generateAvatarDataUri('Top')` (~500 B). Raster avatars $\le 2\text{ KB}$ ($120 \times 160$ px). Never upload raw images to Supabase for dummy accounts.

## 2.25 In-Browser Photo & Avatar Processing (Zero Supabase Storage Egress)
- All photos and avatars are processed strictly **client-side (browser)** via Canvas compression or SVG data URIs, never stored as raw uncompressed image files in Supabase Storage.

## 2.26 Minimal Supabase Footprint & Ultra-Lean Architecture (SSOT)
- Minimize bandwidth/egress. Audit every call. Max 2–5 KB per polling cycle (no blobs in intervals). Client-side compute first; Supabase strictly for structured relational persistence.

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

## 2.30 Universal Table Cell Regular Weight Invariant (Aturan Konten Baris Tabel Wajib Regular 400 & Inter Font)
- **Zero Bold in Table Content**: Di seluruh sistem (Admin Workstation Datagrid, Student Dashboard Standings & Completed Tests, Modal Tables), seluruh huruf dan angka di dalam baris tabel (teks, nama siswa, nomor urut/peringkat, nilai poin PTS, persentase) **MUTLAK MENGGUNAKAN `font-weight: 400` (Regular)**. Dilarang keras menggunakan huruf atau angka tebal (`700`, `800`, `900`) di dalam sel baris tabel.
- **Font SSOT Wajib Inter**: Seluruh tabel wajib mengimplementasikan font **`Inter`** (`var(--font-sans)`, `'Inter', sans-serif`). Font display geometris membulat (`Outfit`) dilarang keras digunakan di dalam baris/sel data tabel.
- **Pengecualian**: Header utama tabel (`thead th`) diizinkan `font-weight: 600–700`, dan glif simbol grade di dalam lingkaran kecil (22px–24px) diizinkan `font-weight: 500–600`.

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
