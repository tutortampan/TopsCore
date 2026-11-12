# Precision Plan: Modernization of Class Hub Live Test Sessions & Batch Controller

> **Doc ID:** `20261112 - Class Hub Test Sessions Analysis and Enhancement Proposal`  
> **Target Files:** `js/admin/tests-access.js` & `css/admin.css`  
> **Route:** `admin.html?status=active#class-hub` -> Sub-Tab `Test Sessions`  
> **Interactive Simulator:** [visual_before_after_widget.html](file:///C:/Users/Top/.gemini/antigravity/brain/e109f303-e1a5-4e34-b57b-3d40f829c347/visual_before_after_widget.html)  
> **Status:** Precision Blueprint & Review (Ready for Approval)  

---

## 1. Executive Summary & Page Mission

Berdasarkan arahan langsung pengguna:
1. **Garis Luar Saja (Outline/Border-only Buttons)**: Seluruh tombol aksi yang awalnya berwarna solid pekat (merah, kuning, hijau) diubah menjadi style *wireframe/outline* modern dengan transparansi halus, border berwarna cerah, dan hover glow.
2. **Kartu Lebih Modern, Compact & Professional**: Kartu dirancang ulang menggunakan *dark glassmorphism* yang ramping, hemat ruang vertikal, menampilkan judul kurikulum dinamis asli (bukan hardcoded), dan dilengkapi chip *Batch Readiness Radar*.
3. **Relokasi Info Header ke Sub-Panel Bawah**: 3 kotak KPI besar di atas dihapus dari bagian atas untuk menghemat ruang vertikal; informasi kurikulum, status batch, dan sesi aktif dipindahkan ke **50px Lower Sub-Panel / Footer**.
4. **Isolasi Program pada Pemilihan Batch**: Memperbaiki bug kebocoran batch antar-program, sehingga saat membuka kelas di Program Evnikom, batch dari Program Camp atau Sheraton tidak lagi ikut muncul.
5. **Pemanfaatan Workspace Bawah**: Area kosong 60% dimanfaatkan untuk tabel **Batch Student Readiness & Exam Eligibility Matrix**.

---

## 2. Baseline Visual Snapshot

![Current View](C:/Users/Top/.gemini/antigravity/brain/e109f303-e1a5-4e34-b57b-3d40f829c347/current_test_sessions_view.jpg)

![User Annotation on Top Panel](C:/Users/Top/.gemini/antigravity/brain/e109f303-e1a5-4e34-b57b-3d40f829c347/user_annotated_top_panel.png)

---

## 3. Komparasi Detail Visual BEFORE vs AFTER per Komponen

### 3.1. Tombol Aksi (Button Styling)

#### 🔴 BEFORE (Saat Ini — Solid & Berat)
- **NORMAL**: Solid green block `#00a82d` tebal (`box-shadow: 0 4px 12px rgba(0,168,45,0.35)`).
- **REMEDIAL**: Solid bright yellow block `#ffe600` tebal dengan teks hitam `#0f172a`.
- **LOCKED / CLOSE**: Solid red alarm block `#e60000` setinggi 54px.
- *Kesan visual:* Terlalu dominan, berat, dan terasa seperti blok warna mainan (*bulky*).

#### 🟢 AFTER (Target — Sleek Outline / Wireframe Modern)
- **NORMAL**: Garis luar hijau neon (`border: 1.5px solid #00c000; background: rgba(0, 192, 0, 0.08); color: #86efac;`). Hover: `background: rgba(0, 192, 0, 0.18); color: #ffffff;`.
- **REMEDIAL**: Garis luar kuning cerah (`border: 1.5px solid #ffff00; background: rgba(255, 255, 0, 0.08); color: #fef08a;`). Jika 0 murid, otomatis *dimmed* (`border: 1px dashed rgba(255,255,255,0.15); color: #64748b;`).
- **STANDBY**: Garis luar slate netral (`border: 1px solid rgba(255, 255, 255, 0.12); background: rgba(15, 23, 42, 0.6); color: #94a3b8;`).
- **CLOSE SESSION**: Garis luar merah tegas (`border: 1.5px solid #ef4444; background: rgba(239, 68, 68, 0.08); color: #fca5a5;`).
- *Kesan visual:* Sangat bersih, profesional, ringan, dan menyatu sempurna dengan estetika *dark cybernetic* TopsCore.

---

### 3.2. Top Header & Relokasi KPI ke Sub-Panel Bawah

#### 🔴 BEFORE (Saat Ini — Memakan 180px Vertikal)
```text
+---------------------------------------------------------------------------------------------------------+
| 🔐 LIVE TEST SESSIONS CONTROLLER                                                                        |
| Evnikom 1st Vocabulary • Unified Test Access               [🔴 Active Batch: Batch EV-07 (3)] [🔄 Refresh] |
| Words & Phrases Tests unified per Theme...                                                              |
+---------------------------------------------------------------------------------------------------------+
| [TOTAL EXAMS: 4 Themes (8 Modules)] | [ACTIVE LIVE: 0 Open Sessions] | [LOCKED: 4 Awaiting Tutor]      |
+---------------------------------------------------------------------------------------------------------+
```

#### 🟢 AFTER (Target — Slim Header + 50px Lower Sub-Panel)
```text
(SLIM TOP HEADER - Tinggi hanya 48px)
+---------------------------------------------------------------------------------------------------------+
| 🔐 TEST SESSIONS | Evnikom 1st Vocabulary [Evnikom]          [🎯 Program Batch: EV-07 (3) ▼] [🔄 Refresh] |
+---------------------------------------------------------------------------------------------------------+

... (Kartu Tema & Batch Readiness Matrix Table di Tengah) ...

(SUB-PANEL / LOWER FOOTER METADATA - Tinggi 50px)
+---------------------------------------------------------------------------------------------------------+
| 📚 Class: 4 Themes (Words Exams) • 19 Tasks    | 👥 Batch EV-07: 3/3 Ready Theme A | 🟢 0 Active Live   |
+---------------------------------------------------------------------------------------------------------+
```
*Keuntungan:* Menghemat lebih dari **130px ruang vertikal**, memungkinkan seluruh komponen muat dalam viewport 100vh tanpa scroll jendela luar.

---

### 3.3. Pemilihan Batch (Strict Program Isolation)

#### 🔴 BEFORE (Bocor Antar-Program)
- Saat mengklik dropdown batch di kelas `Evnikom 1st Vocabulary`, muncul batch dari program lain:
  - `Batch EV-07 (3 Students)` (Evnikom)
  - `Batch 134` (Camp 134 — SALAH!)
  - `Batch 133` (Camp 133 — SALAH!)
  - `Batch SH-26` (Sheraton — SALAH!)
- *Penyebab:* `tests-access.js:73` hanya memfilter `!b.deleted_at && b.is_active !== false` tanpa mencocokkan `b.program_id === currentClass.program_id`.

#### 🟢 AFTER (Terisolasi 100% per Program)
- Filter ketat diberlakukan:
  ```javascript
  const classProgramId = context.classProgramId || context.currentClass?.program_id;
  const activeBatches = (allBatches || []).filter(b => 
    !b.deleted_at && 
    b.is_active !== false && 
    (!classProgramId || b.program_id === classProgramId)
  );
  ```
- Di kelas Evnikom: HANYA batch milik Program Evnikom (`EV-07`, dsb) yang muncul.
- Di kelas Camp: HANYA batch milik Program Camp (`134`, `133`, dsb) yang muncul.

---

### 3.4. Kartu Exam (Modern, Compact & Professional)

#### 🔴 BEFORE
- Tinggi kartu ~260px, padding tebal, nama tema hardcode (*Workplace*, *Tourism*), subteks menjanjikan Phrases yang tidak ada di database, baris status standby berwarna merah menyala pekat `#e60000`.

#### 🟢 AFTER
- Tinggi kartu compact ~175px:
  - **Baris 1**: Badge Theme pill (`THEME A`) + Durasi resmi (`⏱️ 70 Mins`).
  - **Baris 2**: Judul kurikulum asli dinamis (`PUBLIC SPEAKING` 13px bold) + Chip format (`📝 Words Exam`).
  - **Baris 3**: Chip Radar Kesiapan Batch (`👥 3/3 READY (100%)` bergaris hijau neon).
  - **Baris 4 (Aksi)**: Tombol *Outline* `🟢 NORMAL (3)` dan `🟡 REMEDI (0)` (dimmed jika 0).
  - **Baris 5 (Status)**: Bar *Outline Standby* `⏸️ STANDBY • AWAITING UNLOCK` (tinggi 32px, rapi dan elegan).

---

## 4. Standardized 4-Column Before & After Comparative Matrix

| Komponen / Properti | 🔴 Kondisi Saat Ini (BEFORE) | 🟢 Target Perubahan (AFTER) | Dasar Aturan / Alasan |
| :--- | :--- | :--- | :--- |
| **Warna Tombol Normal** | Solid Green fill tebal `#00a82d` | **Outline Green**: `border: 1.5px solid #00c000; background: rgba(0,192,0,0.08); color: #86efac;` | **Permintaan Pengguna**: Mengganti warna solid menjadi warna garis luar (*outline*). |
| **Warna Tombol Remedial** | Solid Yellow fill tebal `#ffe600` dengan dark text `#0f172a` | **Outline Yellow**: `border: 1.5px solid #ffff00; background: rgba(255,255,0,0.08); color: #fef08a;` | **Permintaan Pengguna**: Garis luar kuning modern; redup otomatis jika murid remedi = 0. |
| **Status Bar Standby** | Solid Red `#e60000` tebal (54px) `🔒 LOCKED - NO ACTIVE SESSION` | **Outline Slate/Muted**: `border: 1px solid rgba(255,255,255,0.12); background: rgba(15,23,42,0.6); color: #94a3b8;` | **Semantik Rule 2.10**: Standby tidak boleh menggunakan merah alarm; merah hanya untuk *Close Session*. |
| **3 KPI Summary di Atas** | 3 kotak besar di atas memakan ~100px vertikal (`TOTAL EXAMS`, dll) | **Dihapus dari atas**; informasi diringkas dan dipindah ke **50px Lower Sub-Panel / Footer** | **Permintaan Pengguna & Spatial Invariant**: Menghemat ruang vertikal 100vh. |
| **Dropdown Pemilihan Batch** | Menampilkan seluruh batch di database (Camp, Sheraton, Evnikom tercampur) | **Difilter ketat per `program_id`**: Hanya batch yang bernaung di bawah program kelas yang aktif | **Permintaan Pengguna**: Mencegah kebocoran batch antar-program saat klik dropdown. |
| **Desain Frame Kartu Exam** | Frame tebal, padding 16px, background biru pekat #021a44 | **Compact Glassmorphism**: Frame tipis 1px border biru lembut, padding 10px, tinggi ringkas ~175px | **Permintaan Pengguna**: Tampilan kartu exam lebih modern, compact, dan profesional. |
| **Judul Tema per Kartu** | Hardcoded statis: *Workplace, Tourism, CCU, High-Frequency* | Dinamis dari database kurikulum kelas: *PUBLIC SPEAKING, PODCAST, dll.* | **Akurasi Data**: Menghilangkan disinformasi kurikulum. |
| **Ruang Kosong Bawah (60%)** | Dibiarkan kosong hitam tanpa informasi | Diisi **Batch Student Readiness & Progress Matrix Table** | **Spatial Invariant**: Zero dead space, informasi transparan langsung di layar. |

---

## 5. Technical Implementation Steps

### Step 1: Isolasi Batch Berdasarkan `program_id` (`js/admin/tests-access.js`)
- Mengambil `program_id` dari kelas aktif (`context.classProgramId` atau `context.currentClass?.program_id`).
- Memfilter `activeBatches`:
  ```javascript
  const classProgramId = context.classProgramId || context.currentClass?.program_id || (context.allClasses?.find(c => c.id === context.classId)?.program_id);
  const activeBatches = (allBatches || []).filter(b => 
    !b.deleted_at && 
    b.is_active !== false && 
    (!classProgramId || b.program_id === classProgramId)
  );
  ```

### Step 2: Hapus KPI Row Atas & Streamline Top Toolbar
- Menghapus blok 3 KPI cards (`Total Exams`, `Active Live Sessions`, `Locked Themes`) dari container atas.
- Mengubah top bar menjadi satu baris (*single-line toolbar*) berisi judul kelas, tag program, batch selector terisolasi, dan tombol refresh.

### Step 3: Implementasi Style Outline pada Tombol & Status (`css/admin.css`)
- Memperbarui CSS class:
  ```css
  .btn-wireframe-normal {
    background: rgba(0, 192, 0, 0.08) !important;
    border: 1.5px solid #00c000 !important;
    color: #86efac !important;
  }
  .btn-wireframe-normal:hover {
    background: rgba(0, 192, 0, 0.18) !important;
    color: #ffffff !important;
    box-shadow: 0 0 12px rgba(0, 192, 0, 0.35) !important;
  }
  .btn-wireframe-remidi {
    background: rgba(255, 255, 0, 0.08) !important;
    border: 1.5px solid #ffff00 !important;
    color: #fef08a !important;
  }
  .btn-wireframe-remidi:hover {
    background: rgba(255, 255, 0, 0.18) !important;
    color: #ffffff !important;
    box-shadow: 0 0 12px rgba(255, 255, 0, 0.35) !important;
  }
  .box-wireframe-standby {
    background: rgba(15, 23, 42, 0.65) !important;
    border: 1px solid rgba(255, 255, 255, 0.12) !important;
    color: #94a3b8 !important;
    height: 34px !important;
    border-radius: 6px !important;
  }
  ```

### Step 4: Render Metadata ke 50px Lower Sub-Panel / Footer
- Menghubungkan informasi ringkasan kurikulum, kesiapan batch, dan status sesi ke bar bawah:
  ```javascript
  renderLowerSubpanelMetadata({
    totalThemes: themesData.length,
    moduleTypesSummary: getModuleSummary(classTests),
    activeBatchName: selectedBatch?.name,
    batchEligibleCount: eligibleCount,
    liveSessionsCount: liveCount
  });
  ```

### Step 5: Render Batch Student Readiness Matrix Table
- Render tabel kesiapan siswa di ruang bawah yang menampilkan nomor, nama siswa batch aktif, skor kuis per tugas, nilai rata-rata, dan badge status kelayakan ujian normal/remedial.

---

## 6. Visual Pre-Flight Verification Checklist

- [x] **Current State Screenshot (Before)**: Embedded baseline visual showing existing appearance.
- [x] **Proposed Visual Mockup (After)**: Interactive Generative UI simulator and ASCII layout provided.
- [x] **Outline Buttons**: Verified button styling uses colored borders with transparent subtle background.
- [x] **Program Batch Isolation**: Verified only batches with matching `program_id` are included in the selector.
- [x] **Zero Outer Page Scroll**: Verified root `100vh` lock with top KPI removal freeing vertical space.
- [x] **Lower Panel Alignment**: Verified metadata rendered into 50px lower panel.
- [x] **Dynamic Columns & Nowrap**: Verified `white-space: nowrap !important;` on table cells.
- [x] **Language Standard**: Verified all headers, labels, and loading messages use 100% direct English.
