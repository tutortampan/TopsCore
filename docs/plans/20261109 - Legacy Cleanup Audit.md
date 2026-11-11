# AUDIT KOMPREHENSIF ASET & KODE LEGACY — TOPSCORE LMS

> **Tanggal Audit:** 9 November 2026  
> **Cakupan:** Edge Functions, Modul JavaScript (`js/`), Database RPC & Triggers, Kolom Redundan, Folder `scripts/`, dan Root Artifacts.

---

## 1. Edge Functions Mati / Tak Pernah Dipanggil (`supabase/functions/`)

Dari 8 Edge Functions yang ada di `supabase/functions/`, **4 di antaranya berstatus dead code** karena frontend sudah beralih menggunakan Supabase Client SDK secara langsung:

| Nama Edge Function | Alasan Mengapa Legacy | Rekomendasi |
|:---|:---|:---|
| `duplicate-test` | Tidak dipanggil frontend. Frontend menduplikasi tes langsung via Supabase SDK di `tests-management.js`. Di dalamnya juga terdapat bug kueri tabel `users` yang tidak ada. | **Hapus folder** |
| `generate-module-template` | Tidak pernah dipanggil frontend. Template AI Module digenerate langsung client-side di `test-builder.js`. | **Hapus folder** |
| `import-students` | Tidak pernah dipanggil frontend. Import Excel siswa dilakukan langsung oleh `student-registration.js` ke tabel `students`, `batches`, dan `progress`. | **Hapus folder** |
| `import-questions` | Tidak pernah dipanggil frontend. Sistem soal statis sudah ditinggalkan; TopsCore menggunakan dynamic shell dari `vocabulary_vault`. | **Hapus folder** |
| *Ghost Reference:* `generate-narrative` | Disebut di `js/api.js` (line 2708) dan circuit breaker `js/supabase.js`, tetapi foldernya **sama sekali tidak ada** di `supabase/functions/`. | **Bersihkan kode pemanggilnya** |

> **Edge Functions yang benar-benar AKTIF & VITAL:**
> - `start-test` (memulai sesi tes secara aman)
> - `submit-test` (evaluasi & penutupan sesi tes)
> - `student-login` (verifikasi PIN & hierarki student)
> - `evaluate-test` (pipeline AI evaluator audio & transkrip)

---

## 2. Modul JavaScript Tanpa Referensi (Orphaned Files di `js/`)

Hasil pemindaian dependensi ES Module di seluruh file sumber:

1. **`js/admin/panel-c-builder.js` (657 baris)**:
   - **Status:** 0 berkas yang meng-import berkas ini (bukan bagian dari bundel aktif).
   - **Konteks:** Merupakan prototype lama dari Panel C Builder sebelum dipecah dan digantikan oleh `js/admin/tests-management.js` dan `js/admin/test-builder.js`.
   - **Rekomendasi:** Hapus berkas untuk menghemat ~650 baris kode mati.

2. **`js/utils/dashboard_guards.js` (70 baris)**:
   - **Status:** 0 berkas yang meng-import berkas ini.
   - **Konteks:** Prototype dialog penjaga form ("unsaved profile changes") yang tidak pernah diintegrasikan ke `dashboard.js`.
   - **Rekomendasi:** Hapus berkas.

---

## 3. Database RPC Functions & Triggers Usang (PostgreSQL)

Beberapa fungsi tersimpan di database masih mengacu pada tabel dan kolom yang sudah lama dihapus:

1. **`validate_student_hierarchy()`**:
   - Memvalidasi kolom `students.class_id`. Kolom ini sudah tidak ada lagi di tabel `students` karena siswa terikat ke Batch.
2. **`merge_student_import()`**:
   - Masih menggunakan parameter `student_id` bisnis yang telah dilarang di `AGENTS.md 2.2`.
3. **`reorder_assessment()`**:
   - Mengoperasikan tabel `assessments` yang sudah di-drop sejak migrasi `20261027170000_final_legacy_assessment_purge.sql`.
4. **Trigger `trigger_student_batch_change`**:
   - Sudah di-drop di migrasi November karena memicu error 42P01 (`additional_members` tidak ada), namun fungsinya di database perlu dipastikan bersih.

---

## 4. Kolom Duplikat & Kolom 100% NULL di Tabel Aktif

Pada tabel yang aktif digunakan saat ini, terdapat sisa kolom hasil migrasi:

1. **Tabel `tests`**:
   - **`prerequisite_id` vs `prerequisite_test_id`**: Keduanya ada dan nilainya **100% identik**. Ini sisa transisi penggantian nama kolom. Cukup gunakan salah satu (`prerequisite_test_id`).
   - **`window_start` & `window_end`**: Bernilai **NULL di seluruh 68 baris data**, karena sistem resmi menggunakan kolom `availability_start` dan `availability_end`.
2. **Tabel `progress`**:
   - **`level_status` & `level_completed_at`**: Bernilai **NULL di seluruh 154 baris data**.

---

## 5. Folder `scripts/` (215 Skrip, ~195 Skrip Scratch Masa Lalu)

- **Kondisi:** Folder `scripts/` membengkak hingga **215 file** `.mjs` dan `.cjs`.
- **Penggunaan Riil:** Hanya **~20 file** yang didaftarkan di `package.json` untuk menjalankan test suite (`npm test`, `test:health`, `test:grading`, `test:prereq`, `test:manifest`, `test:syntax`, dll.).
- **Isi ~195 File Sisanya:** Merupakan skrip patch sekali pakai (*one-off scripts*) dari fase-fase lampau (misal: `analyze_batch133_numbers.mjs`, `audit_batch134_full_breakdown.mjs`, `apply_dashboard_css_patch.cjs`, `patch_queen_exam.mjs`).
- **Rekomendasi:** Pindahkan skrip patch sekali pakai ini ke folder arsip (misal `scripts/archive/` atau `scripts/legacy_patches/`), sehingga folder `scripts/` hanya berisi test suite dan verifikasi operasional aktif.

---

## 6. File Sampah di Root Directory

Di direktori utama project (`/`), terdapat berkas-berkas hasil pengujian sementara yang tertinggal:

1. **10 Gambar Screenshot Verifikasi (.png)**:
   - `dashboard_classes_selector_verified.png`
   - `proposal_proportional_layout.png`
   - `result_student_spec_verification.png`
   - `result_tutor_spec_verification.png`
   - `selection_mode_verification.png`
   - `test_full_spec_verification.png`
   - `test_layout_verification.png`
   - `test_page_mobile_inspection.png`
   - `test_question_mock_verification.png`
   - `written_mode_verification.png`
   *(Bisa dipindahkan ke `docs/screenshots/` atau dihapus jika tidak diperlukan lagi).*
2. **`update_session_log.mjs`**: Skrip utilitas yang berada di root alih-alih di dalam `scripts/`.
3. **`setup-storage.sql`**: Skrip SQL yang mengatur bucket `student-photos` (bucket yang aktif di cloud saat ini adalah `student-avatars`).
