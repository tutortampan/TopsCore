# CURRENT STATE — TOPSCORE LMS

> **Purpose:** Single authoritative restart point across sessions and restarts.
> **Last Updated:** 2026-11-19 07:00 UTC+8
> **Current Phase:** Phase 623 [COMPLETE] — Zero Table Capsule & Zero Table Glow Invariant (System-Wide)
> **Status:** READY FOR USER CONFIRMATION & REVIEW (ALL TEST SUITES 100% GREEN)

---

## 1. Active System Architecture & Invariants

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

- **Interactive LEVEL UP Status Action & Alumni Consolidation (Phase 611 — SSOT §1.4, §2.10, §2.27)**:
  - **Peniadaan Tombol Alumni Terpisah**: Tombol `Alumni` di Sub Panel bawah dihapus total. Kelulusan menjadi alumni merupakan puncak kenaikan level resmi (`Level 1` $\rightarrow$ `Level 2` $\rightarrow$ `Level 3` $\rightarrow$ `Level X / Alumni`).
  - **Status Interaktif `LEVEL UP` di Kolom Tabel**: Ketika siswa memenuhi kriteria kelulusan level (`row.isEligibleNext === true`), kolom STATUS menampilkan tombol interaktif beranimasi neon **`LEVEL UP`** dengan ikon SVG panah ganda ke atas (`chevrons-up`).
  - **Bulk Level-Up Action (`btn-promote-all-eligible`)**: Tombol aksi di Sub Panel bawah diperbarui menjadi **`LEVEL UP ALL (X Eligible)`** berikon SVG `chevrons-up` dengan palet hijau Grade A.
  - **Zero Movement Hover Invariant**: Tombol `.btn-level-up-cell` terkunci `transform: none !important;` dengan transisi ghost-to-solid neon glow.

- **Standing Operational Discipline (Rule 0.2 SSOT: Cepat, Cermat, Tepat, Akurat)**:
  - Setiap instruksi dieksekusi cepat tanpa seremonial dokumen berlebih, cermat memeriksa dampak sistemik, tepat sasaran sesuai konteks & SSOT, dan akurat lolos verifikasi 100% green.

---

## 2. Recent Active Milestones (Latest Rolling Window)

- **Phase 623**: Zero Table Capsule & Zero Table Glow Invariant across all tables & grids (`AGENTS.md` §2.31, `ui-invariants.md` §4.9).
- **Phase 622**: Unified Hero Card Architecture (Option A SSOT: Sex Above DoB, aligned colons, 64x84px portrait).
- **Phase 619**: RPC Error Elimination & Dashboard Address SSOT Formatting.
- **Phase 618**: NTB Comprehensive Administrative Hierarchy & Village Autocomplete Overhaul.
- **Phase 617**: Level Promotion Auto-Heal & Strict Level Isolation Engine.

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
