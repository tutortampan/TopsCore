# TopsCore — Vocab Class System Plan 7×7

**Status:** APPROVED — Awaiting Implementation
**Created:** 2026-11-02
**Owner:** Product Owner (Top)
**Agent:** Antigravity

---

## 1. Overview

Peningkatan sistem ujian Vocabulary menjadi lebih intensif dan terstruktur, terdiri dari 3 perubahan utama:

1. **Sistem 7×7 Quiz** — Setiap topik Quiz harus diulang minimal **7 kali** dengan skor **≥ 70%** untuk dinyatakan "lulus topik".
2. **Exam Words → Written** — Format ujian kata dari speech (ucap) diubah menjadi tulisan (text input), dengan skor minimum lulus **≥ 70%**.
3. **Class Baru: 2nd Vocabulary** — Kelas baru dengan 2 Tema awal (A & B).

---

## 2. Keputusan Desain (Hasil Sesi Wawancara)

### 2.1 Sistem Quiz 7×7 Per-Topik

| Aspek | Keputusan |
|-------|-----------|
| **Istilah** | Tetap **Quiz** (tidak diganti Drill/Task) |
| **Target lulus** | **7 attempt** dengan skor **≥ 70%** per attempt |
| **Attempt gagal** | Attempt dengan skor < 70% **TIDAK dihitung** ke progress counter |
| **Batas attempt** | **Tidak ada** batas maksimum — siswa boleh mencoba sebanyak mungkin |
| **Scope** | Berlaku untuk **semua kelas Vocabulary** (termasuk 3rd Vocabulary yang aktif) |
| **Prioritas** | Ini dikerjakan **PERTAMA** sebelum perubahan lainnya |

**Contoh Logika:**

```
Attempt 1: skor 65% → GAGAL (tidak dihitung) → Progress: 0/7
Attempt 2: skor 80% → LULUS ✓               → Progress: 1/7
Attempt 3: skor 72% → LULUS ✓               → Progress: 2/7
Attempt 4: skor 55% → GAGAL (tidak dihitung) → Progress: 2/7
Attempt 5: skor 90% → LULUS ✓               → Progress: 3/7
... (lanjut sampai 7 attempt lulus)
Setelah 7 attempt lulus: Topik dinyatakan COMPLETE ✅
```

### 2.2 Tampilan Progress untuk Siswa

- **Badge per topik:** `3/7 ✓` ditampilkan di samping nama topik
- **Lokasi:** Dashboard siswa (class card / test card per topik Quiz)
- **Warna progress:**
  - `0/7` → abu-abu netral
  - `1/7 – 6/7` → kuning / oranye (in-progress)
  - `7/7` → hijau `#00c000` (warna `--grade-star`, complete)

### 2.3 Penyimpanan Progress

- **Metode:** Hitung **realtime** dari tabel `attempts` yang sudah ada
- **Query:** `COUNT(attempts) WHERE test_id = X AND student_id = Y AND score_pct >= 0.70`
- **Tidak perlu:** Tabel baru, kolom baru, atau migration khusus untuk counter

### 2.4 Hubungan Quiz → Exam

- Quiz 7×7 **BUKAN prerequisite** untuk membuka Exam
- Exam Words tetap **dibuka manual oleh tutor** seperti sistem saat ini
- Badge `7/7 ✓` berfungsi sebagai **indikator kesiapan siswa** (visual guidance), bukan kunci akses

---

### 2.5 Perubahan Exam Words: Written + Minimum 70%

| Aspek | Keputusan |
|-------|-----------|
| **Format sebelumnya** | Speech-to-text (ucap) |
| **Format baru** | **Text input** (siswa mengetik jawaban) |
| **Arah soal** | **Bahasa Indonesia → Inggris** (konsisten dengan format vault saat ini) |
| **Toleransi ejaan** | **Rule 2.13 Written Mode** aktif (partial credit 0.5 pt untuk typo ≤ 2 karakter) |
| **Skor minimum lulus** | **≥ 70%** |

**Contoh soal:**
```
Soal:  "Kepercayaan diri"   →   Jawaban siswa: "self confidence"    → 1.0 pt ✓
Soal:  "Mengelola"          →   Jawaban siswa: "manage"             → 1.0 pt ✓
```

**Partial Credit (Rule 2.13 Written):**
```
Jawaban benar:  "confident"
Jawaban siswa:  "confidant"   →  Edit distance = 1  →  0.5 pt (minor spelling)
Jawaban siswa:  "confiden"    →  Edit distance = 2  →  0.5 pt (minor spelling)
Jawaban siswa:  "trust"       →  Semantic mismatch  →  0.0 pt
```

---

### 2.6 Class Baru: 2nd Vocabulary

| Aspek | Keputusan |
|-------|-----------|
| **Nama kelas** | `2nd Vocabulary` |
| **Class code** | `VOCAB_2ND` (baru — bukan mengaktifkan `VOCABULARY_2` yang lama) |
| **Tema awal** | **2 Tema: A dan B** (kode huruf, konsisten dengan 3rd Vocabulary) |
| **Topik per tema** | Ditentukan nanti setelah konten dirancang |
| **Program** | Menyusul setelah class dibuat |

---

## 3. Aturan Bisnis Baru yang Ditambahkan ke AGENTS.md

> [!IMPORTANT]
> Kedua aturan berikut berlaku serentak untuk **semua kelas Vocabulary**:

### Rule A — Quiz Completion: 7×7 System
```
Quiz dianggap LULUS (satu attempt valid) jika:
  score_pct >= 70%

Quiz TIDAK dihitung ke progress jika:
  score_pct < 70%

Topik dinyatakan COMPLETE jika:
  COUNT(passed_attempts) >= 7
  (passed_attempts = attempts dengan score_pct >= 70%)
```

### Rule B — Vocab Exam Minimum Score
```
Vocab Exam (Words Exam / Phrases Exam) dianggap LULUS jika:
  score_pct >= 70%

Di bawah 70% = BELUM LULUS (meskipun sudah submit dan tercatat di history)
Threshold ini berlaku untuk: prerequisite check, progress bar, dan grade progression.
```

> [!NOTE]
> Sebelumnya threshold Exam mengikuti `minimum_required_score` per-record yang bisa bervariasi (misal: 60%). Dengan aturan baru ini, **70% adalah floor minimum** yang wajib untuk semua Vocab Exam, kecuali admin secara eksplisit menetapkan threshold lebih tinggi.

---

## 4. Urutan Implementasi

### 🔴 Fase 1 — Sistem 7×7 Quiz (PRIORITAS PERTAMA)

- [ ] **FE-001** Buat fungsi `getQuizPassCount(testId, studentId)` yang query `attempts` table dan hitung `score_pct >= 0.70`
- [ ] **FE-002** Tampilkan badge `X/7 ✓` di dashboard siswa per topik Quiz (di class card dan test list)
- [ ] **FE-003** Update styling badge progress:
  - Abu-abu → in-progress kuning → complete hijau `#00c000`
- [ ] **FE-004** Update aggregasi Class Card: tampilkan jumlah topik yang sudah `7/7` dari total topik
- [ ] **BE-001** Pastikan query filter `score_pct >= 0.70` benar (perhatikan: skor disimpan sebagai 0–1 atau 0–100?)
- [ ] **TEST-001** Unit test:
  - Attempt skor 69% → tidak dihitung ✓
  - Attempt skor 70% → dihitung ✓
  - Setelah 7 attempt lulus → status complete ✓
  - Attempt ke-8 setelah complete → badge tetap `7/7` (tidak berubah) ✓

### 🟡 Fase 2 — Exam Words: Written

- [ ] **BE-002** Update `answer_type` dari `speech_to_text` ke `written` untuk semua Vocab Words Exam di DB
- [ ] **FE-005** Pastikan `test.js` merender `<input type="text">` (bukan speech recorder) saat `answer_type = 'written'`
- [ ] **FE-006** Pastikan evaluasi jawaban menggunakan `evaluateAnswer()` mode `written` (Rule 2.13)
- [ ] **FE-007** Update `result.js`: tampilkan jawaban tertulis siswa di review hasil
- [ ] **BE-003** Update `seed.sql`: ganti `answer_type = 'speech_to_text'` → `'written'` untuk semua VOCAB_TASK Words
- [ ] **TEST-002** Test partial credit 0.5 pt untuk typo 1–2 karakter pada Written mode

### 🟡 Fase 3 — Minimum Score Exam 70%

- [ ] **BE-004** Update semua Vocab Exam record di DB: set `minimum_required_score = 70` (jika belum)
- [ ] **BE-005** Update `seed.sql`: set `minimum_required_score = 70` untuk semua Vocab Exam
- [ ] **FE-008** Pastikan prerequisite check menggunakan `score_pct >= 0.70` untuk Vocab Exam
- [ ] **TEST-003** Test prerequisite: skor 69% → blocked, skor 70% → allowed ✓

### 🟢 Fase 4 — Class 2nd Vocabulary (Independen, bisa kapan saja)

- [ ] **DB-001** Buat class record baru `2nd Vocabulary` (code: `VOCAB_2ND`) via admin panel
- [ ] **DB-002** Buat 2 Tema (A dan B) di Vocabulary Vault untuk class baru
- [ ] **DB-003** Rancang topik dan populasi kata untuk Tema A dan B
- [ ] **FE-009** Pastikan class `2nd Vocabulary` muncul di admin Class Hub dan Vocabulary Vault
- [ ] **FE-010** Pastikan sistem 7×7 otomatis berlaku untuk Quiz di kelas ini (karena sama-sama Vocab class)

---

## 5. File yang Akan Terpengaruh

| File | Perubahan |
|------|-----------|
| `js/dashboard.js` | Tambah fungsi `getQuizPassCount()`, render badge `X/7` per Quiz |
| `js/test.js` | Render `<input type="text">` untuk `answer_type = 'written'` |
| `js/result.js` | Tampilkan jawaban tertulis di review hasil |
| `js/grading.js` | Pastikan `evaluateAnswer()` Written mode (Rule 2.13) aktif |
| `css/dashboard.css` | Style badge progress `X/7` (abu-abu → kuning → hijau) |
| `supabase/seed.sql` | Update `answer_type` dan `minimum_required_score` Vocab records |
| `docs/AGENTS.md` | Tambahkan Rule 7×7 dan Rule minimum 70% Exam ke dokumen kontrak |

---

## 6. Risiko & Catatan

> [!WARNING]
> **Dampak ke data siswa aktif:** Siswa 3rd Vocabulary yang sudah mengerjakan Quiz dengan skor ≥ 70% sebelumnya akan **langsung mendapat kredit historis** — attempt lama dihitung otomatis. Ini menguntungkan siswa, bukan merugikan. Namun perlu dikomunikasikan kepada tutor agar tidak bingung.

> [!CAUTION]
> **Perubahan `answer_type` Exam Words** dari `speech_to_text` ke `written` berdampak langsung pada siswa yang sedang in-progress. Pastikan **tidak ada attempt `IN_PROGRESS`** untuk Vocab Words Exam sebelum mengeksekusi Fase 2.

> [!CAUTION]
> **Threshold minimum 70% Exam** dapat memblokir siswa yang sebelumnya dianggap "lulus" dengan skor 60–69%. Perlu dikonfirmasi apakah ada siswa dengan status lulus di rentang tersebut sebelum Fase 3 dieksekusi.

> [!NOTE]
> **Class 2nd Vocabulary** tidak memiliki siswa atau data historis, sehingga Fase 4 adalah **zero-risk** dan dapat dilakukan kapan saja secara independen dari Fase 1–3.

---

## 7. Definisi Selesai (Definition of Done)

Implementasi V2 dinyatakan **COMPLETE** jika semua checklist berikut terpenuhi:

- [ ] Badge `X/7` muncul di dashboard siswa untuk semua Quiz Vocabulary
- [ ] Attempt < 70% **tidak** menambah counter progress
- [ ] Setelah 7 attempt lulus, badge berubah menjadi `7/7 ✓` dengan warna hijau `#00c000`
- [ ] Semua Vocab Words Exam merender **text input** (bukan speech recorder)
- [ ] Evaluasi written menggunakan Rule 2.13 (partial credit 0.5 pt aktif)
- [ ] Skor minimum **70%** berlaku untuk lulus Vocab Exam (prerequisite check)
- [ ] Class `2nd Vocabulary` (code: `VOCAB_2ND`) muncul di admin panel dan Vocab Vault
- [ ] Test suite lulus: `check_all_js_syntax.cjs` + `verify_green_star_grading.mjs` + parity tests
- [ ] `docs/CURRENT_STATE.md` diupdate dengan status Fase yang selesai

---

*Last updated: 2026-11-02 15:50 UTC+8*
*Approved by: Product Owner*
*Next action: Eksekusi Fase 1 — Sistem 7×7 Quiz*

