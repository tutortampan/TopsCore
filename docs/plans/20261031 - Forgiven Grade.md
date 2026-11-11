# Plan: Fitur Grade "F" (Forgiven) & Pemulihan Ranking Total Poin Semua Exam

## 1. Ringkasan & Tujuan

Berdasarkan arahan langsung dari User:
1. **Membedakan Override dari Remedial**:
   - Remedial (`R`, Kuning `#FFFF00`) adalah untuk siswa yang **mengerjakan ujian sendiri** namun mendapatkan skor maksimal 60% sesuai aturan pedagogis.
   - Override admin diubah menjadi **Grade Khusus `F` (Forgiven)** dengan warna **MERAH `#FF0000`** (bukan sekadar persentase atau superscript kecil).
2. **Eksklusi Penuh dari Akumulasi Nilai**:
   - Nilai dari tes yang berstatus `F` (Forgiven) **TIDAK DIMASUKKAN** ke dalam:
     - `PROG %` (Completion Rate / Progres Siswa)
     - `SCORE %` (Akumulasi / Rata-rata Skor Akademik)
     - `PTS` (Total Akumulasi Poin Siswa)
   - Status `F` semata-mata berfungsi untuk **membuka gembok prasyarat** agar siswa bisa langsung mengerjakan ujian target tanpa mendistorsi peringkat maupun rapor akademik.
3. **Pemulihan PTS Kiri Menjadi TOTAL POIN SEMUA EXAM**:
   - Kolom `PTS` di tabel sebelah kiri dikembalikan menjadi **Total Poin Seluruh Exam** yang dikerjakan sah oleh siswa.
   - Poin total semua exam ini menjadi **sumber utama perangkingan siswa** (peringkat 1 = siswa dengan total poin exam tertinggi).
4. **Audit & Proteksi Siswa Lulus Sah (Kasus Syazida)**:
   - Siswa seperti **Syazida Shinda Debi** yang sudah lulus semua prasyarat secara mandiri **TIDAK BOLEH** mendapatkan logo / kode `F` (Forgiven).
   - Record sintetis yang sempat terinjeksi pada eksekusi sebelumnya dibersihkan sehingga skor asli Syazida (100% ★, 95% A, dsb.) kembali aktif bersih.

---

## 2. User Review Required

> [!IMPORTANT]
> **Jaminan Akses Ujian (Prerequisite Satisfaction Guarantee)**:
> **Ya, siswa yang mendapat Grade `F` (Forgiven) DIJAMIN 100% TETAP BISA MENGIKUTI EXAM!**
> Meskipun nilai akademiknya 0 dan tidak dihitung ke poin/progres, sistem gating prasyarat (baik di server Edge Function `start-test`, Student Dashboard `dashboard.js`, maupun Client API `api.js`) mengenali status `is_forgiven === true || grade === 'F'` sebagai **prasyarat yang telah terpenuhi/dimaafkan oleh tutor**. Tombol exam di dashboard siswa akan menyala hijau aktif dan siswa dapat langsung memulai ujian tanpa terhalang pesan error 403.

> [!IMPORTANT]
> **Tampilan Sel di Matriks**:
> Sel kuis/ujian yang di-forgive akan menampilkan huruf tebal **`F`** berwarna **MERAH (`#FF0000`)**.
> Kolom PTS per-tes untuk tes yang di-forgive akan menampilkan `0` (atau `-`) dan bernilai 0 poin.

> [!IMPORTANT]
> **Hirarki Perangkingan Baru**:
> 1. **Primary**: `PTS DESC` (Total Poin dari Seluruh Exam yang Dikerjakan Sah).
> 2. **Secondary**: `SCORE % DESC` (Rata-rata Skor Akademik dari Tes yang Dikerjakan Sah).
> 3. **Tertiary**: `PROG % DESC` (Progres Penyelesaian Aktivitas Sah).
> 4. **Quaternary**: Timestamp Submission & Nama Siswa.

> [!WARNING]
> **Pembersihan Data Syazida**:
> Sebanyak 28 attempt sintetis yang terinjeksi ke akun Syazida pada sesi sebelumnya akan dihapus/dibersihkan dari DB Supabase, mengembalikan skor 100% ★ dan 95% A aslinya.

---

## 3. Matriks Perbandingan Status Tes

| Atribut | Tes Normal | Remedial (`R`) | Forgiven (`F`) |
| :--- | :---: | :---: | :---: |
| **Kode / Tampilan Sel** | Persentase Nilai (e.g. `85%`, `100%`) | `60%ᴿ` | **`F`** |
| **Warna Teks** | Sesuai Grade Palette (`#00c000`, dll) | Kuning Cerah (`#FFFF00`) | **Merah Cerah (`#FF0000`)** |
| **Grade Huruf** | `★`, `A`, `B`, `C`, `D`, `E` | `C` | **`F`** |
| **Bobot Poin (PTS)** | Poin Penuh | Maksimal 60% Poin | **0 Poin** |
| **Dihitung di PROG %** | ✅ Ya | ✅ Ya | ❌ **Tidak (0% Progres)** |
| **Dihitung di SCORE %** | ✅ Ya | ✅ Ya (cap 60%) | ❌ **Tidak (Dikecualikan)** |
| **Membuka Prasyarat** | ✅ Jika $\ge 60\%$ | ✅ Jika $\ge 60\%$ | ✅ **Ya (Bypass Langsung)** |

---

## 4. Analisis Data Siswa: Siapa yang Butuh Forgiveness vs Siapa yang Tidak

Dari hasil query langsung ke database Supabase kelas `3rd Vocabulary` (Batch 133, 40 Tes):

1. **Kelompok 1: Lulus Mandiri (TIDAK BOLEH DIBERIKAN FORGIVEN)**
   - **Miss Syazida Shinda Debi**: Telah mengerjakan 75 attempt secara sah (banyak mendapat 100% ★ dan 95% A). Tidak boleh ada kode `F` sama sekali.
   - **Miss Latifa Maulidya**: Memiliki total 794.5 PTS sah dari Theme A (90), Theme B (210), Theme C (494.5).
   - **Mr. Aunul Fikri Yasir**, **Miss Wardatul Husna**, **Mr. Gagan Tara Deswari**, **Mr. Ari Wahyu Darma**: Telah menyelesaikan prasyarat secara mandiri.
2. **Kelompok 2: Membutuhkan Forgiveness untuk Mengakses Ujian**
   - Siswa yang memiliki celah (gap) pada kuis 1–6 (Theme A), 9–16 (Theme B), atau 19–28 (Theme C) sehingga terblokir saat ingin mengikuti Words/Phrases Exam.
   - Fitur Override di Class Hub akan memberikan tutor kemampuan mencentang kuis/exam yang ingin di-forgive dengan kode `F` merah, tanpa menambah skor atau poin semu ke siswa tersebut.

---

## 5. Rencana Perubahan Komponen

### Component 1: Database Migration & Data Cleanup

#### [NEW] `supabase/migrations/20261031100000_add_is_forgiven_and_clean_syazida.sql`
- Tambahkan kolom `is_forgiven BOOLEAN DEFAULT FALSE` pada tabel `attempts`.
- Tambahkan indeks pada `attempts(is_forgiven) WHERE is_forgiven = TRUE`.
- **Data Cleanup**:
  - Hapus attempt sintetis yang terinjeksi ke Syazida (`b829d934-00a5-428d-87aa-e1aa6ae87f3b`) di mana ia sudah memiliki attempt sah sebelumnya.
  - Setel attempt sah Syazida yang bernilai tinggi kembali menjadi `is_best_score = TRUE`.

---

### Component 2: `js/grading.js` (Core Grading Engine)

#### [MODIFY] `js/grading.js`
1. **Konstanta Warna**:
   - Tambahkan `FORGIVEN: '#FF0000'` di `TOPSCORE_COLORS`.
2. **`computeMilestoneExamMastery`**:
   - Filter `examEntries`: hanya masukkan attempt yang **BUKAN** `is_forgiven` dan **BUKAN** grade `F`.
   - Hitung `cumulativePoints`: penjumlahan seluruh poin exam sah dari Theme A sampai D.
   - Kembalikan `cumulativePoints` sebagai total poin akumulatif seluruh exam.

---

### Component 3: `js/admin/app.js` (Class Hub & Attendance Matrix)

#### [MODIFY] `js/admin/app.js`
1. **Perhitungan Data Siswa (`studentsGridData`)**:
   - `completedCount`: Abaikan tes dengan status `is_forgiven === true` atau `grade === 'F'`.
   - `totalEarnedScore`: Gunakan `mastery.cumulativePoints` (Total Poin Seluruh Exam Sah).
   - `studentExamEntries`: Jangan masukkan tes dengan `is_forgiven`.
2. **Perangkingan (Sorting Leaderboard)**:
   - **1. Primary**: `totalEarnedScore DESC` (Total Poin Semua Exam).
   - **2. Secondary**: `averageScorePct DESC`.
   - **3. Tertiary**: `progressPct DESC`.
3. **Kolom PTS Sebelah Kiri**:
   - Tampilkan Total Poin Semua Exam (`row.totalEarnedScore`).
   - Title tooltip: `"Total Exam Points (All Completed Exams): X pts"`.
4. **Render Sel Tes (Kuis & Ujian)**:
   - Jika `is_forgiven`:
     ```html
     <span class="asm-score asm-score-forgiven" 
           style="color:#FF0000; font-weight:800; font-size:var(--matrix-font-size, 0.75rem);" 
           title="[FORGIVEN] Prasyarat dibebaskan oleh Tutor (0 Pts / Tidak dihitung di akumulasi)">
       F
     </span>
     ```
   - Jika remedial sah: tetap `${effPct}%<sup class="test-rem-sup">R</sup>` kuning `#FFFF00`.
   - Jika normal: nilai persentase reguler sesuai grade tier.
5. **Legend Bar**:
   - Tampilkan `<span style="color:#FF0000; font-weight:900;">F</span> Forgiven` dan `<span style="color:#FFFF00; font-weight:800;">ᴿ</span> Remedi`.

---

### Component 4: `js/api.js` (Override Engine)

#### [MODIFY] `js/api.js`
1. Perbarui `adminOverridePrerequisitesWithRemedial`:
   - Simpan attempt dengan `grade: 'F'`, `is_forgiven: true`, `is_remedial_unlocked: false`, `score: 0`, `effective_score: 0`, `percentage: 0` (atau flag bypass).
   - Sertakan opsi proteksi: Jika siswa sudah memiliki attempt sah $\ge 60\%$, **JANGAN PERNAH** timpa atau inject `F`.

---

### Component 4: Prerequisite Gating Engine (`start-test`, `dashboard.js`, `api.js`)

#### [MODIFY] `supabase/functions/start-test/index.ts`
Perbarui pengecekan prasyarat di Edge Function server-side:
```typescript
// Sibling quizzes check:
const isPassedOrForgiven = (att.effective_score || att.percentage || 0) >= reqScore || att.is_forgiven === true || att.grade === 'F';
if (isPassedOrForgiven) {
  passedQuizIds.add(att.test_id);
}

// Words Exam sequential check (untuk Phrases Exam):
const hasPassedWords = (wordsAttempts || []).some((att: any) => {
  const pct = att.effective_score != null ? Number(att.effective_score) : Number(att.percentage || 0);
  return pct >= reqScore || att.is_forgiven === true || att.grade === 'F';
});
```

#### [MODIFY] `js/dashboard.js`
Perbarui pengecekan prasyarat di Student Lobby:
```javascript
// Gating kuis & tes prasyarat:
const isPrereqSatisfied = (prereqPct !== null && prereqPct >= pMinScore) || Boolean(prereqBest?.is_forgiven || prereqBest?.grade === 'F');
prereqMet = isPrereqSatisfied;

// Gating Words Exam untuk Phrases Exam:
const isWordsSatisfied = (wPct !== null && wPct >= wMin) || Boolean(wBest?.is_forgiven || wBest?.grade === 'F');
if (!isWordsSatisfied) {
  prereqMet = false;
}
```

#### [MODIFY] `js/api.js`
Perbarui pengecekan prasyarat di client fallback:
```javascript
const hasPassed = prereqAttempts && prereqAttempts.some(a => (parseFloat(a.percentage || a.score || 0) >= reqScore) || Boolean(a.is_forgiven || a.grade === 'F'));
```

---

### Component 5: CSS & Cache Buster

#### [MODIFY] `css/admin.css`
- Tambahkan style `.asm-score-forgiven`:
  ```css
  .asm-score-forgiven {
    color: #FF0000 !important;
    font-weight: 800;
    text-shadow: 0 0 6px rgba(255, 0, 0, 0.4);
    letter-spacing: 0.02em;
  }
  ```
#### [MODIFY] `admin.html`
- Bump cache buster ke `v=20261031_v64`.

---

## 6. Verification Plan

### Automated Tests
1. Script verifikasi Supabase: memastikan Syazida bersih dari attempt `F` dan skor sahnya aktif.
2. `node --check js/api.js` dan `node --check js/admin/app.js`.
3. `npm test` (Memastikan seluruh 40 file JS valid secara sintaks dan 100% parity test lulus).

### Manual Verification
1. Buka `admin.html#class-hub` (Ctrl + F5).
2. Lihat kolom `PTS` sebelah kiri: Menampilkan total akumulasi poin seluruh exam (misal Latifa = 794.5 pts, ranking #1).
3. Cek baris Syazida Shinda Debi: Tidak ada kode `F`, nilai Theme A, B, C tampil bersih sesuai hasil aslinya.
4. Cek sel yang di-override tutor: Menampilkan huruf **`F`** berwarna **Merah**.
5. Cek Legend di bawah tabel: Menampilkan simbol `F` Forgiven dan `ᴿ` Remedi secara terpisah dan jelas.
