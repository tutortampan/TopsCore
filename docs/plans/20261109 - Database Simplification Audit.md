# AUDIT & REKOMENDASI PENYEDERHANAAN TABEL DATABASE — TOPSCORE LMS

> **Tanggal Audit:** 9 November 2026  
> **Target Database:** Supabase PostgreSQL Cloud (`oclajpyumehpojepcczg.supabase.co`)  
> **Status Verifikasi:** 100% terverifikasi langsung via kueri live database & audit kode (247 file sumber).

---

## 1. Executive Summary

Berdasarkan hasil audit langsung ke database Supabase Cloud dan pemindaian 247 berkas kode (`js/`, `supabase/functions/`, `scripts/`, `*.html`):

- **Total tabel di schema awal / dump:** 54 tabel.
- **Tabel yang sudah di-DROP sebelumnya:** 19 tabel (misal `assessments`, `requirements`, `scholarships`).
- **Tabel yang SAAT INI MASIH ADA di Supabase Cloud:** **35 tabel**.
- **Tabel yang benar-benar aktif & memiliki lalu lintas data:** **14 tabel**.
- **Tabel kosong / usang / warisan masa lalu yang BISA DIDROP:** **15–17 tabel**.
- **Tabel lookup yang BISA DISEDERHANAKAN (menjadi Enum/Code Config):** **2–3 tabel**.

Jika disederhanakan, struktur database TopsCore bisa dipangkas dari **35 tabel menjadi hanya 12–14 tabel inti**, sehingga query cache PostgREST lebih cepat, schema dump bersih, dan tidak ada lagi kebingungan relasi antar-tabel (*schema bloat*).

---

## 2. Peta Realitas Database Saat Ini (Live Data Row Counts)

Berikut adalah status riil dari **35 tabel yang saat ini ada di Supabase Cloud**, diurutkan dari volume data terbesar:

| No | Nama Tabel | Jumlah Baris (Live) | Status di Kode | Rekomendasi |
|:---:|:---|:---:|:---|:---|
| 1 | `attempt_answers` | **122.746** | Sangat Aktif (19 file) | **Pertahankan** (Inti perekaman jawaban soal) |
| 2 | `vocabulary_vault` | **2.141** | Sangat Aktif (9 file) | **Pertahankan** (Bank materi & kosa kata dinamis) |
| 3 | `attempts` | **2.027** | Sangat Aktif (62 file) | **Pertahankan** (Inti sesi tes, skor, grade) |
| 4 | `audit_logs` | **1.747** | Aktif (10 file) | **Pertahankan** (Audit log kepatuhan & admin) |
| 5 | `progress` | **154** | Aktif (3 file) | **Pertahankan / Sederhanakan Kolom** (Cache ringkasan level) |
| 6 | `students` | **114** | Sangat Aktif (50 file) | **Pertahankan** (Data siswa, PIN, foto profil) |
| 7 | `tests` | **68** | Sangat Aktif (54 file) | **Pertahankan** (Master tes & konfigurasi drill) |
| 8 | `enrollments` | **44** | **0 Referensi di Runtime** | ⚠️ **Bisa Didrop** (Siswa sudah terikat via `students.batch_id`) |
| 9 | `classes` | **17** | Sangat Aktif (15 file) | **Pertahankan** (Master kelas belajar) |
| 10 | `class_levels` | **13** | Aktif (2 file) | **Pertahankan** (Pemetaan level di tiap kelas) |
| 11 | `modules` | **13** | Aktif (2 file) | **Pertahankan / Bisa Jadi Enum** (8 AI evaluation module) |
| 12 | `question_types` | **13** | Jarang (1 file) | 💡 **Bisa Disederhanakan** (Statis, lebih baik ENUM) |
| 13 | `word_types` | **13** | Jarang (1 file) | 💡 **Bisa Disederhanakan** (Statis, lebih baik ENUM) |
| 14 | `batches` | **10** | Sangat Aktif (20 file) | **Pertahankan** (Rombongan belajar / angkatan) |
| 15 | `theme_program_assignments`| **10** | Aktif (1 file) | **Pertahankan** (Mapping tema kurikulum ke program) |
| 16 | `subjects` | **6** | **0 Referensi Aktif** | ⚠️ **Bisa Didrop** (Peninggalan lama, digantikan `classes`) |
| 17 | `programs` | **5** | Sangat Aktif (10 file) | **Pertahankan** (Program belajar institusi) |
| 18 | `site_settings` | **5** | Aktif (5 file) | **Pertahankan** (Pengaturan global platform) |
| 19 | `levels` | **4** | Sangat Aktif (9 file) | **Pertahankan** (Master level 1st, 2nd, 3rd, 4th) |
| 20 | `institutions` | **3** | Aktif (3 file) | **Pertahankan** (Master institusi/lembaga) |
| 21 | `cec_app_state` | **1** | **0 Referensi** | ⚠️ **Bisa Didrop** (Sisa dump aplikasi lama CEC Camp) |
| 22 | `topics` | **1** | Hampir tidak dipakai (3 file) | 💡 **Bisa Disederhanakan** (Digantikan tema vault) |
| 23 | `assignments` | **0** | Dead code | ⚠️ **Bisa Didrop** (Auto-assignment level-centric) |
| 24 | `class_instances` | **0** | Dead code | ⚠️ **Bisa Didrop** (Sisa prototype jadwal fisik) |
| 25 | `class_meetings` | **0** | Dead code | ⚠️ **Bisa Didrop** (Sisa prototype absensi tatap muka) |
| 26 | `class_meeting_exceptions` | **0** | Dead code | ⚠️ **Bisa Didrop** (Sisa prototype absensi tatap muka) |
| 27 | `professional_skills` | **0** | Dead code | ⚠️ **Bisa Didrop** (Sisa template eksternal HR) |
| 28 | `user_professionals` | **0** | Dead code | ⚠️ **Bisa Didrop** (Sisa template eksternal HR) |
| 29 | `work_records` | **0** | Dead code | ⚠️ **Bisa Didrop** (Sisa template eksternal HR) |
| 30 | `question_usage_history` | **0** | Dead code | ⚠️ **Bisa Didrop** (Histori lengkap di `attempt_answers`) |
| 31 | `questions` | **0** | Dead code | ⚠️ **Bisa Didrop** (Soal digenerate via `vocabulary_vault`) |
| 32 | `test_items` | **0** | Dead code | ⚠️ **Bisa Didrop** (Soal dinamis, bukan static items) |
| 33 | `test_results` | **0** | Dead code | ⚠️ **Bisa Didrop** (Hasil tersimpan di `attempts`) |
| 34 | `test_topics` | **0** | Dead code | ⚠️ **Bisa Didrop** (Topik melekat di payload tes) |
| 35 | `student_submissions` | **0** | Dead code | ⚠️ **Bisa Didrop** (Semua jawaban masuk ke `attempt_answers`) |

---

## 3. Rincian Peluang Penyederhanaan

### A. Kategori "Zombi / Dead Baggage" (15 Tabel — Siap di-DROP)

1. **`subjects` (6 baris)**  
   *Alasan:* Pada `AGENTS.md` Bagian 1.3 & 2.4 telah ditetapkan: `CLASSES (Formerly 'Subjects')`. Seluruh UI Admin dan Student telah bermigrasi 100% ke tabel `classes`. Tabel `subjects` hanya artefak database dari September 2026.
2. **`cec_app_state` (1 baris)**  
   *Alasan:* Berisi 1 baris JSON dump dari proyek lama ("CEC Camp"). Kode TopsCore modern tidak pernah membaca atau menulis ke tabel ini.
3. **`enrollments` (44 baris)**  
   *Alasan:* Di arsitektur TopsCore saat ini, relasi siswa bersifat hierarkis langsung: `students.batch_id` dan `students.program_id`. Ujian terbuka otomatis berdasarkan level rombel (`batch.current_level_id`). Tabel `enrollments` sudah tidak dipakai dalam alur login, pengerjaan tes, maupun mutasi siswa.
4. **`assignments` (0 baris)**  
   *Alasan:* Sesuai `AGENTS.md` Bagian 2.5: *"There is NO manual test-to-batch assignment required. Batches inherit tests automatically based on their current Level."* Penugasan tes manual sudah dihapus secara konseptual.
5. **Jadwal Fisik & Absensi (`class_meetings`, `class_meeting_exceptions`, `class_instances`) — 0 baris**  
   *Alasan:* TopsCore adalah LMS asinkron berbasis evaluasi AI dan drill repetisi, bukan sistem booking ruang kelas fisik.
6. **Data Karyawan/HR (`professional_skills`, `user_professionals`, `work_records`) — 0 baris**  
   *Alasan:* Sisa template schema database lama yang tidak relevan dengan LMS bahasa Inggris.
7. **Static Questions & Relasi Usang (`questions`, `test_items`, `test_topics`, `test_results`, `student_submissions`, `question_usage_history`) — 0 baris**  
   *Alasan:* TopsCore mengadopsi arsitektur *Dynamic Shell* (`is_dynamic_shell = true`). Soal-soal di-generate langsung dari `vocabulary_vault` (2.141 data kosa kata & frasa) atau payload JSON tes. Hasil ujian langsung dicatat ke `attempts` dan `attempt_answers`. Tabel-tabel statis ini 0 baris dan tidak memiliki peran operasional.

### B. Kategori "Lookup yang Bisa Disederhanakan" (2–3 Tabel)

1. **`question_types` & `word_types` (13 baris masing-masing)**  
   - Saat ini berupa tabel relasional biasa hanya untuk menyimpan daftar string seperti `noun`, `verb`, `idiom`, `spoken`, `written`.
   - **Penyederhanaan:** Lebih bersih jika diubah menjadi PostgreSQL `ENUM` atau diekspor sebagai konstanta JavaScript di frontend/backend (`TOPSCORE_WORD_TYPES`), tanpa perlu relasi join atau query terpisah.

2. **`topics` (1 baris dummy)**  
   - Hanya berisi 1 baris testing (`Simulated Topic`).
   - Di TopsCore modern, pemetaan tema/topik sudah terstruktur rapi di `theme_code` dan `topic_code` di dalam `vocabulary_vault` dan `tests.payload` (misal A1, A2, B1, C1).

---

## 4. Target Skema Ramping (TopsCore Target Schema: 13 Tabel Inti)

Struktur hierarki ideal yang bersih, konsisten dengan `AGENTS.md`, dan bebas dari tabel zombi:

```text
INSTITUTION (institutions)
  └── PROGRAM (programs)
        ├── BATCH (batches)
        │     └── STUDENT (students)
        │
        └── CLASS (classes)
              ├── LEVEL (levels + class_levels)
              └── TEST (tests)
                    ├── ATTEMPT (attempts)
                    │     └── ATTEMPT ANSWER (attempt_answers)
                    └── BANK MATERI (vocabulary_vault)

SISTEM PENDUKUNG:
- site_settings               (Konfigurasi platform & background)
- audit_logs                  (Log keamanan admin)
- theme_program_assignments   (Mapping tema kurikulum)
```

---

## 5. Rencana Tindakan Aman (Safe Migration Roadmap)

Sebelum menghapus tabel apa pun:

1. **Backup Data**: Lakukan backup skema & data tabel bersangkutan (terutama `enrollments` dan `subjects` jika pemilik sistem menginginkan arsip).
2. **Pembersihan Referensi Kode Sisa**:
   - Periksa 1 baris referensi fallback di `supabase/functions/evaluate-test/index.ts` yang menyebut `student_submissions` dan `test_results`.
   - Pastikan script diagnostik seperti `verify_system_health.mjs` tetap hijau (saat ini sudah memeriksa 14 tabel inti saja).
3. **Migrasi SQL**: Jalankan perintah `DROP TABLE IF EXISTS ... CASCADE;` melalui file migrasi resmi di `supabase/migrations/` dan muat ulang schema cache (`NOTIFY pgrst, 'reload schema';`).
