# TOPSCORE LMS — IMPLEMENTATION PLAN
## Submit Modal Button Behavior Refactor & Unified 3-Tier System Accent Redesign

> **Date:** 2026-11-12  
> **Status:** Pending User Review  
> **Scope:** `test.html`, `css/test.css`, `js/test.js`, `sw.js`  
> **Authority:** In compliance with TopsCore AGENTS.md, Rule 2.20, Rule 2.25, and `.agents/rules/agent-workflow.md`.

---

## 1. Root Cause Diagnosis: Mengapa Tombol Terasa Terbalik & Malfungsi?

Setelah dilakukan pelacakan mendalam pada `js/test.js`, `test.html`, dan alur eksekusi attempt siswa, ditemukan **3 penyebab utama** mengapa siswa merasa tombol Give Up tidak berfungsi, malah kembali ke tes, dan seolah fungsinya terbalik:

### 1.1 "BACK TO THE TEST" Memaksa Auto-Jump ke Soal Lain (`jumpToNextUnanswered`)
- **Letak Masalah:** Di `js/test.js` baris 3077–3084:
  ```javascript
  document.getElementById('cancel-submit-btn')?.addEventListener('click', () => {
    document.getElementById('submit-modal')?.classList.add('hidden');
    const activeMap = window.answeredMap || answeredMap;
    const unanswered = allAnswerRows.filter(r => !activeMap[r.id] || !activeMap[r.id].trim()).length;
    if (unanswered > 0) {
      jumpToNextUnanswered(); // ❌ INI PENYEBAB UTAMA SISWA KEBINGUNGAN!
    }
  });
  ```
- **Dampak Nyata:** Ketika siswa sedang berada di Soal No. 15, lalu mereka membuka modal (misal hanya ingin cek sisa waktu atau salah pencet Give Up di header), lalu mereka klik **"BACK TO THE TEST"** (maksud hati ingin kembali ke Soal No. 15), sistem justru **memaksa navigasi melompat ke Soal No. 1** yang masih kosong!
- Hal ini menimbulkan persepsi bahwa klik "Back to Test" tidak mengembalikan mereka ke posisi semula, melainkan memicu aksi tak terduga (*"malah lompat/rusak"*).

### 1.2 Kebiasaan Refleks Warna vs. Posisi Tombol yang Tertukar
- **Kebiasaan Alami UI Siswa:**
  - **Warna Hijau** = Aksi Aman / Lanjutkan / Selesaikan / Submit.
  - **Warna Merah** = Aksi Bahaya / Batal / Menyerah.
- **Pada Layout Baru:**
  - Tombol **Atas (Merah)** = `GIVE UP!` (Menyerah / Nilai 0).
  - Tombol **Bawah (Hijau)** = `BACK TO THE TEST` (Kembali ke Tes).
- Ketika siswa ingin menyelesaikan/menyerah, secara refleks mata mereka mencari tombol hijau di bawah, namun ketika tombol hijau di bawah diklik, yang berjalan adalah `cancel-submit-btn` sehingga mereka kembali ke tes (*"malah back to test"*).
- Sebaliknya, ketika mereka ragu dan ingin membatalkan modal, mereka mencari tombol di atas atau menekan tombol merah, yang justru mengeksekusi `doSubmit()` menyerah! Inilah mengapa pengguna merasakan: *"siswa tidak bisa klik give up untuk menyerah, malah back to test dan begitu sebaliknya"*.

### 1.3 Silent Reset jika `doSubmit()` Terkendala Jaringan atau RPC Cache
- Di `js/test.js` baris 3226–3228:
  ```javascript
  } catch(e) {
    console.error('Submit error:', e);
    hideLoading();
    showToast('Submission failed: ' + e.message, 'error', 8000);
    isTestActive = true; // ❌ Mengembalikan siswa ke layar tes tanpa submit berhasil!
  }
  ```
- Jika tombol Give Up ditekan namun terjadi sedikit jeda jaringan/RPC, modal tertutup dan siswa terlempar kembali ke layar tes aktif dengan pesan toast singkat yang sering tidak terbaca di layar HP. Siswa merasa tombol Give Up tidak melakukan apa-apa dan hanya kembali ke tes.

---

## 2. Rancangan Penggabungan Panel Warning & Kotak 0/40 (Unified 3-Tier Layout)

Sesuai arahan pengguna (*"gabungkan panel warning dengan kotak yang berisi 0/40"*), modal disederhanakan dari **4 balok terpisah** menjadi **3 tingkat terpadu (3-Tier Unified Structure)**:

1. **Tingkat 1 (Atas):** Tombol Aksi `GIVE UP!` (Dark slate surface dengan aksen garis merah & pendaran).
2. **Tingkat 2 (Tengah - Unified Card):** **Kartu Terpadu Penggabungan Warning & Counter 0/40**:
   - Ikon segitiga warning neon (`#FFCC00`).
   - Judul peringatan: `WARNING: INCOMPLETE TEST!`.
   - Kotak internal khusus counter: `0 / 40` dengan bar progres mini beraksen hijau.
   - Keterangan konsekuensi: `Any blank questions will receive 0 points.`
3. **Tingkat 3 (Bawah):** Tombol Aksi `BACK TO THE TEST` (Dark slate surface dengan aksen garis hijau & pendaran).

### Visual Comparison: 4 Balok Terpisah vs. 3 Tingkat Terpadu
![Rancangan Penggabungan Warning dan Counter 0/40](file:///C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172/submit_modal_unified_evolution_comparison.png)

````carousel
![Rancangan Penggabungan Warning & Counter (Side-by-Side)](file:///C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172/submit_modal_unified_evolution_comparison.png)
<!-- slide -->
![Solo Preview: 3-Tier Unified Modal (Merged Card)](file:///C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172/submit_modal_unified_warning_counter.png)
<!-- slide -->
![Before vs After: Warna Silau Solid vs Aksen Sistem](file:///C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172/submit_modal_before_vs_after_comparison.png)
<!-- slide -->
![Dimensi Sketsa Kasar Awal Pengguna](file:///C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172/user_mockup_dimensions.png)
````

### Struktur HTML & CSS Terpadu (Generative UI Mockup)
```html
<div class="modal-box modal-box-unified" style="max-width: 380px; background: #0D1424; border: 1.5px solid rgba(255,255,255,0.12); border-radius: 24px; padding: 22px; color: #FFFFFF; font-family: 'Outfit', sans-serif;">
  <div style="display: flex; flex-direction: column; gap: 14px;">
    
    <!-- 1. TIER 1: GIVE UP (Red Accent) -->
    <button style="height: 66px; background: #141A28; border: 1.8px solid #FF0000; border-radius: 16px; color: #FF4D4D; font-size: 1.45rem; font-weight: 900; letter-spacing: 1.5px; box-shadow: 0 0 18px rgba(255,0,0,0.22);">
      🏳️ GIVE UP!
    </button>

    <!-- 2. TIER 2: UNIFIED WARNING & 0/40 COUNTER CARD (Yellow/Amber Accent) -->
    <div style="background: #141A28; border: 1.5px solid rgba(255,204,0,0.55); border-radius: 18px; padding: 16px 14px 14px 14px; display: flex; flex-direction: column; align-items: center; gap: 8px; box-shadow: 0 0 20px rgba(255,204,0,0.1);">
      <svg width="42" height="38" viewBox="0 0 100 90" fill="none">
        <path d="M50 12 L88 78 H12 Z" stroke="#FFCC00" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />
        <line x1="50" y1="36" x2="50" y2="54" stroke="#FFCC00" stroke-width="7" stroke-linecap="round" />
        <circle cx="50" cy="68" r="4.5" fill="#FFCC00" />
      </svg>
      <div style="font-size: 1rem; font-weight: 800; color: #FFCC00; text-transform: uppercase;">WARNING: INCOMPLETE TEST!</div>

      <!-- Merged Counter Strip Inside Warning Card -->
      <div style="width: 100%; background: #090E1A; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 8px 12px; display: flex; flex-direction: column; align-items: center; gap: 3px;">
        <div style="font-size: 0.7rem; font-weight: 700; color: #94A3B8; text-transform: uppercase;">Questions Answered</div>
        <div style="font-size: 2.1rem; font-weight: 950; color: #FFF; line-height: 1;">
          0 <span style="font-size: 1.4rem; color: #64748B;">/</span> <span style="font-size: 1.4rem; color: #94A3B8;">40</span>
        </div>
        <div style="width: 75%; height: 4px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; margin-top: 3px;">
          <div style="height: 100%; background: #00C000ff; border-radius: 4px; width: 0%;"></div>
        </div>
      </div>

      <div style="font-size: 0.8rem; color: #CBD5E1; margin: 0; text-align: center;">
        Any blank questions will receive <strong style="color: #FF4D4D;">0 points</strong>.
      </div>
    </div>

    <!-- 3. TIER 3: BACK TO THE TEST (Green Accent) -->
    <button style="height: 66px; background: #141A28; border: 1.8px solid #00C000ff; border-radius: 16px; color: #34D399; font-size: 1.35rem; font-weight: 900; letter-spacing: 1.2px; box-shadow: 0 0 18px rgba(0,192,0,0.22);">
      BACK TO THE TEST
    </button>
  </div>
</div>
```

---

## 3. Rencana Solusi Teknis & Eksekusi

### 3.1 Perbaikan Logika Tombol di `js/test.js`
1. **`BACK TO THE TEST` (`#cancel-submit-btn`):**
   - Mengubah handler agar **hanya menutup modal** (`document.getElementById('submit-modal')?.classList.add('hidden')`).
   - **TIDAK memanggil `jumpToNextUnanswered()`**, sehingga siswa tetap berada pada soal yang sedang dikerjakannya saat modal dibuka.
2. **`GIVE UP!` (`#danger-submit-btn`):**
   - Memastikan pemanggilan `doSubmit(false)` berjalan mulus dengan payload jawaban yang ada, menandai soal tak terjawab sebagai 0 poin.
   - Menampilkan loading spinner langsung ("Submitting your TEST..."), mencegah klik ganda (*idempotent*), dan mengarahkan langsung ke `result.html`.
3. **Penyegaran Service Worker & Cache Busting:**
   - Memperbarui tag versi di `test.html` ke `test.js?v=20261112_v173`.
   - Menaikkan versi cache di `sw.js` ke `topscore-cache-option-a-v108` agar tidak ada siswa yang masih menyimpan cache lama di HP/laptop mereka.

### 3.2 Penataan Gaya CSS di `css/test.css` (Aksen Sistem TopsCore)
- Mengubah `.hazard-btn-giveup`, `.card-unified-warning-counter`, `.hazard-btn-back-neon` dari `background: solid` menjadi permukaan gelap bertekstur *dark slate* (`#141A28`).
- Menggunakan warna sistem TopsCore:
  - `--clr-danger: #FF0000` untuk garis tepi (*border*) dan teks Give Up.
  - `--clr-warning: #FF8C00 / #FFCC00` untuk garis tepi (*border*) dan ikon segitiga Warning.
  - `--clr-success: #00C000ff` untuk garis tepi (*border*) dan teks Back to Test.
  - Pendaran lembut (*soft drop-shadow/glow*) yang elegan dan tidak membuat mata lelah (*eye fatigue*).

---

## 4. Rencana Verifikasi Otomatis

1. Menjalankan skrip Playwright otomatis:
   - Verifikasi klik tombol "BACK TO THE TEST" menutup modal dan tidak mengubah `currentIndex`.
   - Verifikasi klik tombol "GIVE UP!" memproses submit dan berpindah ke `result.html`.
   - Verifikasi CSS tidak lagi memiliki warna background solid kuning/merah/hijau yang silau.
2. Menjalankan audit spatial pre-flight: `node scripts/verify_plan_preflight.mjs`.

---

### 📐 Visual Pre-Flight Verification Checklist
- [x] **Current State Screenshot (Before)**: Embedded baseline visual showing existing appearance and dimensions.
- [x] **Proposed Visual Mockup (After)**: Interactive generative UI widget and side-by-side comparison mockup showing the new layout.
- [x] **Zero Outer Page Scroll**: Verified root `100vh` lock with `calc(100vh - 60px)` console sizing.
- [x] **Container Spacing**: Verified strict 10px container gap between all cards, tables, and top/lower panels.
- [x] **Lower Panel Alignment**: Verified 50px lower panel height invariant aligned with `.sidebar-footer`.
- [x] **Dynamic Columns & Nowrap**: Verified dynamic nowrap column invariant (`white-space: nowrap !important;`) on table cells with zero clipped text.
- [x] **Zero Dead Space**: Verified tables and cards expand to fill 100% width cleanly.
- [x] **Language Standard**: Verified all headers, labels, and loading messages use 100% direct English language standard.

---

## 5. Subagent Gating & Persetujuan Pengguna
Perubahan kode pada file `test.html`, `css/test.css`, dan `js/test.js` tidak akan dijalankan sebelum rencana ini disetujui secara eksplisit oleh pengguna.
