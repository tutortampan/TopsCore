# Master Architectural Audit & Blueprint: Multi-Tenant Program 'Evnikom' & Class 'Vocab' under Institution 'TOP'

**Document Version:** 2.0 (Authoritative Verification & Synthesis)  
**Workspace:** TopsCore LMS (`d:\Tutor Tampan\TopsCore`)  
**Target Action:** Creating Class `Vocab` under Program `Evnikom` (Institution `TOP`, `id: 637fea53-ca64-4e1c-8ff7-6fd4dbdd8260`)

---

## 1. Executive Summary & Verdict

### User Query:
> *"Kalau saya ingin membuat kelas baru di program lain, di TOP, program Evnikom, lalu saya buat kelas Vocab dengan sistem yang sama, apakah akan jadi masalah? Coba analisa menyeluruh semua sistem ini, apa saja celah, dan bug atau error yang muncul. Analisa buat rencana dulu yang SUPER LENGKAP."*

### 🚨 Authoritative Verdict:
**YA, JIKA DILAKUKAN SAAT INI TANPA PENYESUAIAN KODE, AKAN TERJADI KEGAGALAN SISTEM TOTAL (CATASTROPHIC MULTI-TENANT BREAKDOWN).**

Secara konseptual (`AGENTS.md` Rule 1.3), TopsCore dirancang berjenjang:
$$\text{INSTITUTION} \longrightarrow \text{PROGRAM} \longrightarrow \text{BATCHES \& CLASSES} \longrightarrow \text{TESTS} \longrightarrow \text{MODULES}$$

Namun, saat sistem ini diuji coba dan dikembangkan, seluruh data riil hanya berjalan di atas **1 institusi** (`CEC`) dan **1 program aktif** (`Camp`). 

Akibatnya, banyak modul inti (Student Roster, Progression Engine, Dynamic Question Generator, Test Builder, dan Vocab Vault) melakukan **asumsi single-program** dan hanya memfilter entitas berdasarkan `level_id` atau `level_number` secara global, tanpa menyertakan `program_id`.

Jika Program `Evnikom` dan Kelas `Vocab` dibuat hari ini di database:
1. **Promosi Level (Tombol `🚀 NEXT`) Terkunci Permanen (`HOLD`)** bagi seluruh siswa di Program Evnikom **DAN** seluruh siswa di Program CEC Camp.
2. **Skor Rapor & Grade Akademik Siswa Anjlok Drastis** karena mesin `computeMilestoneExamMastery` menganggap ujian dari program lain di level yang sama sebagai "ujian yang belum diambil" (skor 0).
3. **Soal Ujian Tertukar / Bocor Antar-Program** karena generator soal dinamis (`start-test` Edge Function dan Client Fallback `fetchTestQuestions`) mengambil kosakata dari `vocabulary_vault` hanya berdasarkan `target_level`, mengabaikan `institution_id` dan `program_id`.
4. **Test Generator Otomatis (Wizard) Salah Sasaran**, karena modal wizard meng-hardcode pembacaan institusi pertama (`institutions[0]` = CEC) dan program pertama (`programs[0]` = Camp), sehingga tes baru Evnikom akan terbuat di bawah Program Camp.
5. **Kelas Evnikom Hilang dari Navigasi Admin**, karena tab atas `tests-management.js` di-hardcode ke 6 kelas Camp dan memiliki logika deduplikasi nama yang membuang kelas baru jika namanya mirip.
6. **Auto-Promosi Angkatan Prematur** di Edge Function `submit-test`, yang menaikkan level satu angkatan penuh saat satu siswa lulus satu ujian.

---

## 2. Tabel Ringkasan Audit Kritis (12 Celah & Bug Terverifikasi)

| No | Modul / Titik Rawan | Lokasi File & Baris | Dampak Sistem | Tingkat Risiko |
|:--:|:--------------------|:-------------------|:--------------|:--------------:|
| 1 | **Logika Promosi NEXT** | `js/admin/student-management.js:293-312` | Kenaikan level terkunci permanen di semua program | **CRITICAL (P0)** |
| 2 | **Denominasi Skor Rapor & Grade** | `js/grading.js:1256-1285` & `student-management.js:250` | Nilai dan grade siswa hancur/anjlok (0% unattempted) | **CRITICAL (P0)** |
| 3 | **Client Fallback Dynamic Questions** | `js/api.js:955-1010, 1079, 1112` | Siswa Evnikom disajikan kosakata Camp (bocor) | **CRITICAL (P0)** |
| 4 | **Edge Function `start-test` Questions** | `supabase/functions/start-test/index.ts:561-588` | Pencampuran soal kosakata di serverless layer | **CRITICAL (P0)** |
| 5 | **Auto-Generate Wizard Context** | `js/admin/auto-gen-modal.js:41-45, 292` | Tes Evnikom salah dibuat ke dalam Program Camp | **HIGH (P1)** |
| 6 | **Form Import Excel Vocab Vault** | `js/admin/vocab-vault.js:610-618, 698-701` | Excel Evnikom dipaksa tersimpan sebagai milik Camp | **HIGH (P1)** |
| 7 | **Deduplikasi Topbar Tes Admin** | `js/admin/tests-management.js:560-574` | Kelas Evnikom terbuang/tidak muncul di navigasi atas | **HIGH (P1)** |
| 8 | **Hilangnya `classes.institution_id`** | `js/admin/crud-modals.js:55` & `api.js:2503` | `institution_id` NULL; `fetchClasses(instId)` return `[]` | **MEDIUM (P2)** |
| 9 | **Auto-Promosi Batch di `submit-test`** | `supabase/functions/submit-test/index.ts:571-586` | Seluruh batch naik level saat 1 siswa lulus 1 exam | **MEDIUM (P2)** |
| 10 | **Otorisasi Longgar di `start-test`** | `supabase/functions/start-test/index.ts:98-103` | Tidak ada cek `program_id` pada kelayakan tes | **MEDIUM (P2)** |
| 11 | **Topic Blueprint Merging di Vault** | `js/admin/vocab-vault.js:1441-1500` | Kosakata beda program dilebur jadi 1 tema di blueprint | **MEDIUM (P2)** |
| 12 | **Branding Hardcoded & Sanitasi Batch** | `js/dashboard.js:47-54` & `imports-exports.js:67-73` | Fallback 'CEC'/'Camp'; nama angkatan "EV-01" jadi "01" | **LOW (P3)** |

---

## 3. Investigasi Teknis Mendalam: Bedah Kode & Bukti Nyata

### Celah 1 & 2: Kenaikan Level (NEXT) Terkunci Permanen & Denominator Rapor Terdistorsi
* **File & Baris:**
  - [`js/admin/student-management.js:293-312`](file:///d:/Tutor%20Tampan/TopsCore/js/admin/student-management.js#L293-L312) (`currentLevelExams`)
  - [`js/admin/student-management.js:250-254`](file:///d:/Tutor%20Tampan/TopsCore/js/admin/student-management.js#L250-L254) (`studentLevelExams`)
  - [`js/grading.js:1256-1285`](file:///d:/Tutor%20Tampan/TopsCore/js/grading.js#L1256-L1285) (`computeMilestoneExamMastery`)
* **Bukti Kode di `student-management.js`:**
  ```javascript
  // Baris 294: Filter hanya berdasarkan level_id / level_number!
  const currentLevelExams = (allTests || []).filter(t => {
    const matchLvl = (studentLevelId && t.level_id === studentLevelId) || (t.levels?.level_number === studentLevelNum);
    return matchLvl && isWeeklyExam(t);
  });
  ```
  ```javascript
  // Baris 250: Filter milestone exams siswa juga mengabaikan program_id!
  const studentLevelExams = (allTests || []).filter(a => {
    if (studentLevelId && a.level_id && a.level_id !== studentLevelId) return false;
    return isWeeklyExam(a);
  });
  ```
* **Mekanisme Kerusakan:**
  1. Tabel `levels` bersifat global (Level 1 memiliki UUID `100120f3-ab12-4589-99da-cf65d11436b1`).
  2. Tes milik Camp di Level 1 dan tes milik Evnikom di Level 1 memiliki `level_id` yang sama persis.
  3. `allTests` memuat seluruh tes tanpa filter program. Maka untuk siswa Camp, `currentLevelExams` berisi:
     $$\text{4 Ujian Camp} + \text{4 Ujian Evnikom} = 8\text{ Ujian}$$
  4. Siswa Camp hanya mengerjakan 4 ujian Camp, tidak akan pernah mengerjakan 4 ujian Evnikom.
  5. Akibatnya, pada baris 300–310:
     ```javascript
     currentLevelExams.forEach(ex => {
       const best = bestByAsm.get(ex.id);
       if (!best) { allCurrentExamsPassed = false; return; }
       ...
     });
     ```
     `bestByAsm.get(ex.id)` bernilai `undefined` untuk 4 ujian Evnikom.
  6. Hasil akhir: `allCurrentExamsPassed = false`, `isEligibleNext = false`.
  7. **Tombol promosi `🚀 NEXT` berubah menjadi gembok abu-abu `🔒 HOLD` secara permanen bagi SELURUH siswa di CEC Camp DAN TOP Evnikom!**
  8. **Lebih parah lagi pada Rapor Siswa:** `studentLevelExams` dilempar ke `computeMilestoneExamMastery(studentExamEntries, allExamsList)`. Karena `allExamsList` memuat ujian dari program lain, fungsi di `js/grading.js:1272-1285` menganggap ujian program lain sebagai *unattempted exam* (0 poin) dan menambahkan bobot total pertanyaannya ke pembagi (`dynamicThemeMaxQ`). Nilai rata-rata dan grade siswa langsung anjlok (misal dari 95% ★ menjadi 47% E)!

---

### Celah 3 & 4: Kebocoran Soal Kosakata Dinamis (Client Fallback & Edge Function)
* **File & Baris:**
  - [`js/api.js:955-1010`](file:///d:/Tutor%20Tampan/TopsCore/js/api.js#L955-L1010) (`fetchTestQuestions`)
  - [`js/api.js:1079, 1112, 3269`](file:///d:/Tutor%20Tampan/TopsCore/js/api.js#L1079-L1112) (Distractor word pool)
  - [`supabase/functions/start-test/index.ts:561-588`](file:///d:/Tutor%20Tampan/TopsCore/supabase/functions/start-test/index.ts#L561-L588)
* **Bukti Database:**
  - Saat ini di database, tabel `questions` dan `test_items` memiliki **0 baris** data.
  - 100% dari 59 tes di TopsCore adalah **Dynamic Shell** (`is_dynamic_shell = true`).
  - Soal di-generate langsung dari tabel `vocabulary_vault` (saat ini berisi 2,030 kata terdaftar).
* **Mekanisme Kebocoran:**
  1. Di `js/supabase.js:5`, `start-test` terdaftar dalam `KNOWN_UNDEPLOYED_FUNCTIONS`. Artinya, di browser pengguna, TopsCore mengeksekusi Client Fallback di `js/api.js`!
  2. Di `js/api.js:955-959`:
     ```javascript
     let query = sb.from('vocabulary_vault')
       .select('id, english, indonesian, word_type, topic, topic_code, theme, theme_code, target_level, category')
       .is('deleted_at', null)
       .eq('target_level', levelNum)
       .range(0, 4999);
     ```
     Query sama sekali tidak memfilter `institution_id` atau `program_id`.
  3. Hal identik ada di Edge Function `start-test` baris 561:
     ```typescript
     let query = supabase.from("vocabulary_vault").select("*").is("deleted_at", null).eq("target_level", levelNum).range(0, 4999);
     ```
  4. **Akibat:** Siswa Evnikom yang membuka tes kosakata dinamis akan disajikan kata-kata milik CEC Camp. Jika Evnikom mengunggah kosakata baru dengan kode topik yang sama (`A1`), soal ujian siswa akan mencampur kata dari kedua program secara acak.

---

### Celah 5: Test Generator Wizard Terkunci ke CEC Camp
* **File & Baris:** [`js/admin/auto-gen-modal.js:41-45, 292, 333`](file:///d:/Tutor%20Tampan/TopsCore/js/admin/auto-gen-modal.js#L41-L333)
* **Bukti Kode:**
  ```javascript
  const instId = institutions[0].id; 
  const programs = await fetchPrograms(instId);
  ...
  <input type="hidden" id="wizard-prog-id" value="${window.currentProgId || programs[0].id}" />
  ```
  ```javascript
  const progId = overlay.querySelector('#wizard-prog-id').value;
  ...
  await autoGenerateTestsHierarchy(cfg.selectedLevels, { programId: cfg.progId, ... });
  ```
* **Mekanisme Bug:**
  Modal Auto-Generate di Class Hub mengambil institusi pertama (`institutions[0]` = CEC). Jika `window.currentProgId` kosong, input form jatuh ke `programs[0].id` (`11deb53c-...` = Camp).
  Bahkan jika admin membuka modal dari Kelas Evnikom, jika `programId` tidak diikat dari kelas tersebut (`matchedClass.program_id`), tes baru akan di-generate di bawah program Camp, bukan Evnikom!

---

### Celah 6: Form Import Excel Vault Di-Hardcode ke CEC Camp
* **File & Baris:** [`js/admin/vocab-vault.js:610-618, 652-653, 698-701`](file:///d:/Tutor%20Tampan/TopsCore/js/admin/vocab-vault.js#L610-L701)
* **Bukti Kode:**
  ```html
  <select id="vault-import-inst">
    <option value="f51d4c2c-7c24-42ef-8d8f-b0f3e524a447" selected>CEC (Central English Course)</option>
  </select>
  <select id="vault-import-prog">
    <option value="11deb53c-434a-44b0-83ca-1cc9b239cab3" selected>Camp</option>
  </select>
  ```
  ```javascript
  return {
    institution_id: fallbackInstId,
    program_id: fallbackProgId,
    level: normalized.LEVEL || normalized.TARGET_LEVEL || '1',
    ...
  };
  ```
* **Mekanisme Bug:**
  Dropdown pada modal import Excel di Vocab Vault hanya memiliki 1 opsi statis (CEC Camp). Kolom `INSTITUTION` dan `PROGRAM` dari spreadsheet diabaikan secara total. Admin tidak dapat mengunggah kosakata khusus Evnikom melalui antarmuka web.

---

### Celah 7: Topbar Manajemen Tes (`tests-management.js`) Membuang Kelas Evnikom
* **File & Baris:** [`js/admin/tests-management.js:560-574`](file:///d:/Tutor%20Tampan/TopsCore/js/admin/tests-management.js#L560-L574)
* **Bukti Kode:**
  ```javascript
  const availableClasses = [
    { id: 'ab33498a-90e6-44b7-83f4-5765f964543e', name: '3rd Vocabulary', ... },
    { id: 'd58ec3c9-5589-45e7-8eb2-42a921a001c8', name: '1st Storytelling', ... },
    ...
  ];
  (allBoardClasses || []).forEach(bc => {
    if (!availableClasses.some(ac => ac.id === bc.id || _norm(ac.name) === _norm(bc.name))) {
      availableClasses.push({ id: bc.id, name: bc.name, ... });
    }
  });
  ```
* **Mekanisme Bug:**
  Logika deduplikasi memeriksa `_norm(ac.name) === _norm(bc.name)`.
  Jika kelas Evnikom diberi nama "Vocabulary" atau "3rd Vocabulary", namanya cocok dengan kelas Camp yang sudah ada di array `availableClasses`. Kelas Evnikom langsung **dibuang** dan tidak pernah muncul di deretan tombol tab atas manajemen tes!

---

### Celah 8: Kolom `classes.institution_id` Bernilai NULL & Kerusakan `fetchClasses`
* **File & Baris:**
  - [`js/admin/crud-modals.js:55, 770`](file:///d:/Tutor%20Tampan/TopsCore/js/admin/crud-modals.js#L55)
  - [`js/api.js:2503`](file:///d:/Tutor%20Tampan/TopsCore/js/api.js#L2503)
* **Bukti Database:**
  - Database query membuktikan 12 dari 13 kelas saat ini memiliki `institution_id = NULL`.
* **Mekanisme Bug:**
  Di `crud-modals.js:55`, field `institution_id` diberi flag `uiOnly: true`. Baris 770 (`if (f.uiOnly) continue;`) membuat nilai `institution_id` tidak pernah disimpan ke database saat kelas baru dibuat.
  Akibatnya, fungsi `fetchClasses(institutionId)` di `js/api.js:2503`:
  ```javascript
  export async function fetchClasses(institutionId) {
    return await adminFetchAll('classes', '*', institutionId ? { institution_id: institutionId } : {});
  }
  ```
  mencari baris dengan `WHERE institution_id = :id` dan selalu mengembalikan array kosong `[]`!

---

### Celah 9: Auto-Promosi Prematur Seluruh Angkatan di Edge Function `submit-test`
* **File & Baris:** [`supabase/functions/submit-test/index.ts:571-586`](file:///d:/Tutor%20Tampan/TopsCore/supabase/functions/submit-test/index.ts#L571-L586)
* **Bukti Kode:**
  ```typescript
  if (testRec && testRec.test_type === 'exam' && roundedPct >= levelUpThreshold) {
    ...
    await supabase.from("batches").update({ current_level_id: nextLevel.id }).eq("id", studRec.batch_id);
  }
  ```
* **Mekanisme Bug:**
  Sisa kode legacy otomatis menaikkan `batches.current_level_id` saat **satu siswa** lulus **satu ujian**. Hal ini melanggar Master Plan di mana kenaikan level dievaluasi per siswa dan diaktifkan secara terkendali melalui tombol `🚀 NEXT` di Student Roster.

---

### Celah 10: Otorisasi Longgar pada Edge Function `start-test`
* **File & Baris:** [`supabase/functions/start-test/index.ts:98-103`](file:///d:/Tutor%20Tampan/TopsCore/supabase/functions/start-test/index.ts#L98-L103)
* **Bukti Kode:**
  ```typescript
  if (!isEligible && (!assignments || assignments.length === 0)) {
    if (!test.institution_id || test.institution_id === student.institution_id) {
      isEligible = true;
    }
  }
  ```
* **Mekanisme Bug:**
  Pengecekan kelayakan hanya memeriksa kesesuaian `institution_id` dan **tidak memeriksa `program_id`**. Siswa Evnikom dapat mengakses tes dari program lain di institusi yang sama, dan jika `test.institution_id` bernilai NULL, tes tersebut dapat dibuka oleh siswa dari institusi mana pun.

---

### Celah 11: Peleburan Topik di Topic Blueprint Vocab Vault
* **File & Baris:** [`js/admin/vocab-vault.js:1441-1500`](file:///d:/Tutor%20Tampan/TopsCore/js/admin/vocab-vault.js#L1441-L1500)
* **Mekanisme Bug:**
  Fungsi `_renderTopicBlueprintTab` mengelompokkan kata ke Map hanya menggunakan kunci `lvl -> themeCode -> (topicCode + '::' + topicName)`. Tidak ada isolasi program. Jika Evnikom memiliki Topik "Greetings" di Level 1 Theme A dan Camp juga memilikinya, kedua kelompok kata akan dilebur menjadi satu topik hibrida.

---

### Celah 12: Branding Hardcoded & Kerusakan Nama Angkatan di Dashboard Siswa
* **File & Baris:**
  - [`js/dashboard.js:47-54`](file:///d:/Tutor%20Tampan/TopsCore/js/dashboard.js#L47-L54)
  - [`js/admin/imports-exports.js:67-73`](file:///d:/Tutor%20Tampan/TopsCore/js/admin/imports-exports.js#L67-L73)
* **Mekanisme Bug:**
  Header dashboard siswa memiliki fallback hardcoded ke `'CEC'`, `'Camp'`, dan `'131'`. Selain itu, `session.batch_name.replace(/[^0-9]/g, '')` merusak nama angkatan yang memuat teks (misal: "EV-01" menjadi "01", atau "EVNIKOM" menjadi string kosong). Di modul ekspor Excel, kolom `PROGRAM` diisi nama institusi, dan `CLASS` diisi nama program (posisi terbalik).

---

## 4. Master Resolution Plan: Solusi Langkah demi Langkah (6 Fase)

Untuk memastikan pembuatan Program **Evnikom** dan Kelas **Vocab** di bawah Institusi **TOP** berjalan 100% mulus tanpa merusak sistem yang ada, berikut urutan eksekusi presisi:

```
┌────────────────────────────────────────────────────────┐
│ FASE 1: Core Engine & Multi-Tenant Isolation           │
│ (student-management.js, api.js, start-test)            │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ FASE 2: Admin UI, Wizard, & Topbar Dynamic Routing     │
│ (auto-gen-modal.js, vocab-vault.js, tests-mgmt.js)     │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ FASE 3: Database Provisioning (TOP, Evnikom, Vocab)    │
│ (Daftarkan Program, Classes, Batches via Supabase)     │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ FASE 4: Vocabulary Content Ingestion                   │
│ (Upload / Clone Kosakata Evnikom ke vocabulary_vault)  │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ FASE 5: Test Generation & Hierarchy Build              │
│ (Jalankan Auto-Generate dari Class Hub Evnikom)        │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ FASE 6: End-to-End Multi-Tenant Verification           │
│ (Login, Pengerjaan Soal, 7x7 Gating, Promosi NEXT)     │
└────────────────────────────────────────────────────────┘
```

---

### Rincian Tindakan per Fase:

#### Fase 1: Perbaikan Isolasi Multi-Tenant di Mesin Inti (Core Engine)
1. **Perbaiki `student-management.js` (Baris 78, 130, 250, 294):**
   - Sertakan `program_id` pada query `adminFetchAll('tests', ...)`.
   - Modifikasi `currentLevelExams` agar memfilter:
     ```javascript
     const currentLevelExams = (allTests || []).filter(t => {
       const matchProg = !t.program_id || !s.program_id || t.program_id === s.program_id;
       const matchLvl = (studentLevelId && t.level_id === studentLevelId) || (t.levels?.level_number === studentLevelNum);
       return matchProg && matchLvl && isWeeklyExam(t);
     });
     ```
   - Terapkan filter `matchProg` yang sama pada `levelAssesIds` (baris 130) dan `studentLevelExams` (baris 250). Ini secara instan memulihkan akurasi skor rapor dan membuka gembok promosi `🚀 NEXT`.
2. **Perbaiki Generator Soal Dinamis di `js/api.js` (Baris 955-1010, 2724-2755):**
   - Tambahkan parameter `{ institutionId, programId }` pada `fetchVaultWords` dan terapkan `.eq('program_id', programId)` jika disediakan.
   - Di `fetchTestQuestions` (`js/api.js`), baca `test.program_id` dan filter query `vocabulary_vault` dengan `.eq('program_id', test.program_id)`.
   - Terapkan hal yang sama pada distractor pool (baris 1079 & 1112).
3. **Perbaiki Edge Functions (`start-test` & `submit-test`):**
   - Di `supabase/functions/start-test/index.ts:100`, wajibkan kecocokan `test.program_id === student.program_id`.
   - Di baris 561 `start-test`, tambahkan filter `.eq('program_id', test.program_id)`.
   - Di `supabase/functions/submit-test/index.ts:571-586`, hapus kode mutasi batch level otomatis agar promosi batch tidak terjadi prematur.

#### Fase 2: Perbaikan Admin UI, Wizard, & Form Ingestion
1. **Dinamisasi Modal Auto-Generate (`auto-gen-modal.js`):**
   - Ambil `programId` dari kelas yang sedang aktif (`matchedClass.program_id`), jangan default ke `programs[0].id`.
   - Ambil `institutionId` dari relasi kelas tersebut.
2. **Dinamisasi Import Excel Vocab Vault (`vocab-vault.js`):**
   - Ganti opsi statis pada `#vault-import-inst` dan `#vault-import-prog` dengan data dinamis dari `fetchInstitutions()` dan `fetchPrograms()`.
   - Baca kolom `INSTITUTION` dan `PROGRAM` dari file Excel jika tersedia di baris data.
3. **Perbaikan Topbar Navigasi Tes (`tests-management.js`):**
   - Hapus inisialisasi hardcoded `availableClasses` di baris 560–567. Bangun daftar kelas murni dari database (`allBoardClasses`).
   - Ubah logika deduplikasi agar memeriksa kesesuaian unik `ac.id === bc.id` (bukan kesamaan string nama).
4. **Perbaikan Form CRUD Kelas (`crud-modals.js`):**
   - Hapus flag `uiOnly: true` pada `institution_id` di skema `classes`, sehingga `institution_id` tersimpan utuh di database.

#### Fase 3: Provisioning Data Program & Kelas Evnikom
1. Daftarkan Program **Evnikom** di bawah Institusi **TOP** (`id: 637fea53-ca64-4e1c-8ff7-6fd4dbdd8260`):
   ```sql
   INSERT INTO public.programs (id, institution_id, name, code, is_active)
   VALUES (gen_random_uuid(), '637fea53-ca64-4e1c-8ff7-6fd4dbdd8260', 'Evnikom', 'EVNIKOM', true);
   ```
2. Buat Kelas Kosakata Level 1 Evnikom (disarankan nama kanonikal `1st Vocabulary` dengan kode `EV_VOCAB_1` agar formula nama tes `AGENTS.md` Rule 2.5–2.6 rapi):
   ```sql
   INSERT INTO public.classes (id, institution_id, program_id, level_id, name, code, is_active)
   VALUES (gen_random_uuid(), '637fea53-ca64-4e1c-8ff7-6fd4dbdd8260', :evnikomProgId, '100120f3-ab12-4589-99da-cf65d11436b1', '1st Vocabulary', 'EV_VOCAB_1', true);
   ```
3. Buat Batch Perdana Evnikom (misal: `EV-01`):
   ```sql
   INSERT INTO public.batches (id, program_id, current_level_id, name, is_active)
   VALUES (gen_random_uuid(), :evnikomProgId, '100120f3-ab12-4589-99da-cf65d11436b1', 'EV-01', true);
   ```

#### Fase 4: Pengunggahan / Kloning Kosakata Evnikom
- **Jika Evnikom Menggunakan Silabus Sama:** Jalankan script kloning otomatis untuk menduplikasi baris kata dari CEC Camp ke TOP Evnikom di tabel `vocabulary_vault`.
- **Jika Evnikom Memiliki Materi Sendiri:** Unggah file Excel materi kosakata Evnikom menggunakan form import yang sudah diperbaiki pada Fase 2.

#### Fase 5: Auto-Generate Tes & Sinkronisasi Kurikulum
- Buka Class Hub di Admin, pilih kelas `1st Vocabulary` (Evnikom).
- Klik tombol **Auto-Gen**, pilih Level 1, dan konfirmasi parameter durasi dan passing score.
- Generator akan otomatis membangun hierarki Task 7×7 dan Exam (Words & Phrases) lengkap dengan penamaan standar:
  `TOP Evnikom 1st Vocabulary 1st Level Task ...`

#### Fase 6: Uji Coba Multi-Tenant End-to-End (E2E)
1. Daftarkan 2 siswa uji coba: Siswa A di Camp (`134`), Siswa B di Evnikom (`EV-01`).
2. Login sebagai Siswa B di portal siswa (`index.html`).
3. Pastikan header menampilkan: **TOP | EVNIKOM | EV-01 | 1st Level**.
4. Buka Task 1A1, verifikasi soal yang muncul 100% berasal dari bank kata Evnikom.
5. Selesaikan seluruh ujian Level 1 dengan nilai >= 70%.
6. Buka Student Roster di admin:
   - Verifikasi Siswa B berstatus `🚀 NEXT` hijau.
   - Verifikasi Siswa A di Camp tetap memiliki evaluasi independen (tidak terpengaruh ujian Siswa B).
7. Klik `🚀 NEXT` pada Siswa B, pastikan siswa terpromosi ke Level 2 dengan benar.

---

## 5. Remaining Questions & Gaps

1. **Strategi Bank Kosakata Evnikom:**
   Apakah Evnikom akan menggunakan materi kosakata yang **identik** dengan CEC Camp, atau memiliki daftar kata/topik bahasa Inggris yang berbeda?
   - *Rekomendasi:* Gunakan script duplikasi jika sama, atau siapkan Excel 11 kolom jika materi baru.
2. **Kebutuhan Kelas Level Lanjutan:**
   Apakah Evnikom saat ini hanya membuka **Level 1** (`1st Level`), atau langsung membutuhkan **Level 2 & 3** (`2nd Level` & `3rd Level`)?
   - Jika membutuhkan Level 2 & 3, kelas `2nd Vocabulary` dan `3rd Vocabulary` untuk Evnikom harus didaftarkan sekaligus di database agar siswa yang lulus Level 1 tidak menghadapi kelas kosong.
3. **Prioritas Tindakan Berikutnya:**
   Implementasi perbaikan wajib dimulai dari **Fase 1 (Celah 1, 2, & 3)** pada kode JavaScript sebelum data Program Evnikom dimasukkan ke database Supabase.
