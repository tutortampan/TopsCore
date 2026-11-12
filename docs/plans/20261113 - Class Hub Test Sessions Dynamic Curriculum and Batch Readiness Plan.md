# Implementation Plan: Class Hub Live Test Sessions Dynamic Curriculum & Batch Readiness Radar

> **Doc ID:** `20261113 - Class Hub Test Sessions Dynamic Curriculum and Batch Readiness Plan`  
> **Target Files:** `js/admin/tests-access.js` & `css/admin.css`  
> **Route:** `admin.html?status=active#class-hub` -> Sub-Tab `Test Sessions`  
> **Visual Simulator:** [visual_before_after_widget.html](file:///C:/Users/Top/.gemini/antigravity/brain/d4f889f3-a8cf-44a1-950c-332f5a831ef9/visual_before_after_widget.html)  
> **Status:** Ready for User Review & Approval  

---

## 1. Executive Summary & Page Mission

The **Live Test Sessions Controller** (`#class-hub` tab **Test Sessions**) is the mission-critical cockpit for Tutors to:
1. **Monitor Batch Readiness (Batch Readiness Radar)** before unlocking exam sessions.
2. **Control Session Unlocks**:
   - `NORMAL`: Regular exam access for students who completed prerequisite quizzes ($\ge 60\%$).
   - `REMEDIAL`: Retake exam access capped at 60% (Rule 2.10).
3. **Live Monitoring**: Realtime synced countdown, late student admissions (*+Late Students*), time adjustments (*+/- Minutes*), and *Close Session*.

Currently, the controller suffers from hardcoded themes, misleading module chips, glaring red standby bars, and a 60% black viewport void in the lower screen. This plan transforms it into an accurate, informative, and high-productivity operational cockpit.

---

## 2. Visual Baseline (Current State)

![Current Test Sessions View](file:///C:/Users/Top/.gemini/antigravity/brain/d4f889f3-a8cf-44a1-950c-332f5a831ef9/current_test_sessions_view.jpg)

---

## 3. Mandatory 4-Column Before & After Comparative Matrix

| Komponen / Properti | 🔴 Kondisi Saat Ini (BEFORE) | 🟢 Target Perubahan (AFTER) | Dasar Aturan / Alasan |
| :--- | :--- | :--- | :--- |
| **Judul Tema Card** | Hardcoded statis: *Workplace, Tourism, CCU, High-Frequency* | Dinamis dari database kurikulum kelas: *PUBLIC SPEAKING, PODCAST, SHOPPING, COOKING* | **Integritas Data**: Judul tema wajib mencerminkan kelas aktif, bukan hardcoded array kelas lain. |
| **Tipe Modul Card** | Hardcoded statis: *■ Words (Written) • ■ Phrases (Dropdown)* | Dinamis: Hanya merender chip untuk modul yang benar-benar ada di database | **Transparansi Sistem**: Menghilangkan indikasi modul fiktif yang tidak ada di database. |
| **Batch Readiness Info** | Teks prasyarat statis: *Prerequisites: 3 Quizzes Theme A (Min 60%)* | Radar Kesiapan Realtime: `👥 Batch EV-07: 3/3 Ready (100%)` | **Ergonomi Tutor**: Tutor mengetahui kesiapan seluruh batch seketika tanpa membuka modal. |
| **Tombol Normal & Remedial** | Tombol polos tanpa angka siswa: `[ NORMAL ]` & `[ REMEDIAL ]` | Tombol dengan count badge siswa eligible: `[ NORMAL (3) ]` & `[ REMEDI (0) ]` | **Efisiensi Alur Kerja**: Tombol remedial otomatis redup/nol jika belum ada siswa remedial. |
| **Status Bar Idle (Row 3)** | Blok merah solid `#e60000` tebal: `🔒 LOCKED - NO ACTIVE SESSION` | Blok status standby netral: `⏸️ STANDBY • AWAITING UNLOCK` beraksen slate/cyan | **Semantik Warna Rule 2.10**: Merah pekat hanya untuk aksi kritis/bahaya (*Close Session*). |
| **Pemanfaatan Ruang Bawah** | Ruang kosong hitam melompong (60% dead space viewport) | **Batch Readiness & Progress Table** (Daftar siswa batch, nilai kuis per tema, skor avg, status ujian) | **Spatial Invariant Rule 2.20**: 100vh lock, zero dead space, rich informative cockpit. |
| **KPI Module Counter** | Menampilkan `(8 Modules)` secara hardcoded | Menghitung modul riil: `(4 Words Exams)` sesuai data kelas aktif | **Integritas Metrik**: Data agregat wajib akurat sesuai relasi database. |

---

## 4. Implementation Phases

### Phase 1: Dynamic Curriculum Metadata Extraction (`js/admin/tests-access.js`)
- Replace static `THEME_DEFINITIONS` with dynamic theme generator derived from active `classTests`.
- Extract clean topic names from exam titles (e.g. stripping prefix `2nd Vocabulary A Words Exam - ` to yield `PUBLIC SPEAKING`).
- Detect whether the class includes Phrases exams, Words exams, or both, and render honest module chips.

### Phase 2: Batch Readiness Radar Engine (`js/admin/tests-access.js`)
- Calculate student completion and eligibility per theme for the currently selected batch:
  ```javascript
  const eligibleStudents = getEligibleStudentsForTheme(batchId, themeCode, classTests, allAttempts);
  const isReady = eligibleStudents.length === batchTotalStudents;
  ```
- Render live readiness badge `👥 Ready (X/Y)` on card header.
- Inject real-time counts into buttons: `🟢 NORMAL (X)` and `🟡 REMEDI (Y)` (dimmed when 0).

### Phase 3: Standby Neutral Styling & Card Wireframe Cleanup (`css/admin.css`)
- Introduce `.box-wireframe-standby` with subtle translucent slate background (`rgba(15, 23, 42, 0.8)`) and cyan border accent.
- Reserve solid red `#e60000` strictly for `.btn-wireframe-close` when an exam session is actively live.

### Phase 4: Batch Student Readiness & Eligibility Matrix Table (`js/admin/tests-access.js`)
- Render native `display: table` inside lower container with internal `.table-wrap` scrolling.
- Display: No, Student Name, Quiz 1, Quiz 2, Quiz 3 scores with official TopsCore grade badges/colors, Theme Average, and Readiness status pill (`🟢 READY` or `⏳ PENDING QUIZZES`).
- Connect table to theme filter pill dropdown so tutors can switch views between Theme A, B, C, and D.

### Phase 5: Automated Verification & Invariant Audit (`scripts/verify_test_sessions_overhaul.mjs`)
- Build automated regression script validating:
  1. Zero hardcoded theme names.
  2. Accurate module counts matching active class.
  3. Dynamic count reflection on Normal/Remedial buttons.
  4. 100vh viewport lock and zero outer scrollbar.
  5. Official TopsCore grade colors on student quiz badges.

---

## Visual Pre-Flight Verification Checklist

- [x] **Current State Baseline (Before)**: Embedded [current_test_sessions_view.jpg](file:///C:/Users/Top/.gemini/antigravity/brain/d4f889f3-a8cf-44a1-950c-332f5a831ef9/current_test_sessions_view.jpg).
- [x] **Proposed Visual Mockup (After)**: Interactive simulator provided in [visual_before_after_widget.html](file:///C:/Users/Top/.gemini/antigravity/brain/d4f889f3-a8cf-44a1-950c-332f5a831ef9/visual_before_after_widget.html).
- [x] **Zero Outer Page Scroll**: Strict root `100vh` lock with `calc(100vh - 60px)` console sizing.
- [x] **Container Spacing**: Strict 10px gap between all cards, tables, and panels.
- [x] **Lower Panel Alignment**: Fixed 50px lower panel height preserved.
- [x] **Single-Line Text & Proportional Sizing**: Table cells enforce `white-space: nowrap !important;`.
- [x] **Zero Dead Space**: Lower 60% viewport occupied by Batch Student Readiness Matrix Table.
- [x] **English Standard**: 100% direct English across all labels and badges.
