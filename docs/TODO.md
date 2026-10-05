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

---
# ðŸš€ MASTER DEV TASK LIST (TOPSCORE SYSTEM)

---

# ðŸ“œ GRAND ROADMAP (PHASE 1 - 11)

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
- [ ] **11.3.** Student Flow â€” End-to-End Test: Selesaikan satu percobaan penuh Vocabulary Task (Dynamic Shell) dan konfirmasi kata-kata Vault termuat benar.
- [x] **11.4.** Clean Up Test Data: Deleted 6 mock vault rows + 2 assessment shells (TEST_TH_1 / TEST_TP_1) from Level 1. âœ…
- [x] **11.5.** Admin Security Review: Pastikan route admin-only (Vault, Blueprint, Assessment Builder) sudah diproteksi RLS dan Edge Function auth.

