# Plan: Student Roster Flex Primary Layout & Initial Load Column Proportion

Menjawab tuntas penyebab ketidaksesuaian tampilan kolom saat pertama kali masuk ke Student Roster (`#students`), mengapa mengklik kolom/sort baru membuatnya membaik, dan mengapa saat masuk kembali posisinya kembali rusak. Rencana ini menetapkan arsitektur **Flex Primary Column Pattern** sehingga tabel langsung tampil proporsional sempurna (100% lebar layar, nol scrollbar, nol teks terpotong) secara default sejak detik pertama tanpa harus diklik terlebih dahulu.

---

## 🎯 Perbaikan Perintah
> **Perintah Pengguna:**
> *"tampilan 1 adalah tam[ilan saat masuk ke student rooster, ada ukuran kolom yang kurang sesuai degnagn isinya, dll. gambar dua adalah setelah saya klik untuk coba auto resisze,, baru tampilannya membaik. kenapa saya harus klik dulu baru amemebiak, dan tampilan aslinya tidak? seebab saat saya masuk lagi nanti posoiinya sama dengan gambar 1. cari tahu sebabnya, analisa /plan n"*
>
> **Interpretasi Terstruktur & Rekomendasi:**
> *"Tampilan 1 adalah tampilan saat pertama kali masuk ke Student Roster: ukuran kolom kurang sesuai (kolom Nama menyempit dan terpotong `Abdul Ba...`, footer `★ BATC...` terpotong). Gambar 2 adalah setelah kolom diklik/di-auto-resize, baru tampilannya membaik (kolom Nama melebar dan terbaca utuh). Kenapa harus diklik dulu baru membaik, sedangkan tampilan bawaannya tidak? Dan kenapa saat keluar lalu masuk kembali, posisinya berulang kembali rusak? Temukan akar masalahnya, buat analisa mendalam dan /plan perbaikannya."*

---

## 🔍 Jawaban Langsung Atas Pertanyaan Pengguna

### 1. Kenapa harus klik dulu baru membaik?
Pada saat pertama kali masuk ke halaman `#students`, komponen `studentGrid` dijalankan dengan konfigurasi `autoFitOnMount: true` (`js/admin/student-management.js:2265`).
1. Saat mount selesai, `DataGrid` mengeksekusi `this.autoFitColumns(false)` (`js/admin/datagrid.js:448`).
2. Fungsi `autoFitColumns` mengukur teks baris data menggunakan canvas 2D. Namun, algoritma ini **hanya mengukur sel `<tbody>` teratas** dan **sama sekali tidak membaca sel footer summary** (`★ BATCH AVERAGE (16 Students)` yang membutuhkan 215px).
3. Akibatnya, `autoFitColumns` menimpa lebar kolom Name yang seharusnya lebar menjadi hanya **~180px**, sementara kolom-kolom kecil seperti Level, Photo, dan Gender malah diberi ruang berlebih (60px, 63px, 72px). Hal ini menyebabkan seluruh nama siswa terpotong dengan elipsis (`Abdul Ba...`, `Alfina Da...`, `Muham...`) dan footer terpotong menjadi `★ BATC...` (Gambar 1 pengguna).
4. **Ketika pengguna mengklik header kolom `NAME` (untuk sort atau resize):**
   Fungsi `renderHeaders()` di `DataGrid` terpanggil. Fungsi ini men-generate ulang tag `<col>` **langsung dari definisi kolom asli** (`this.columns`), di mana kolom Name didefinisikan sebesar `320px`, **tanpa menjalankan ulang `autoFitColumns`**.
   Seketika kolom Name langsung melebar ke 320px dan nama siswa langsung tampak utuh sempurna (Gambar 2 pengguna).

### 2. Kenapa saat masuk lagi posisinya kembali rusak ke Gambar 1?
Karena `autoFitColumns(false)` dipanggil dengan parameter `persist = false` (tidak disimpan ke memori `localStorage`), maka setiap kali pengguna berpindah tab/halaman atau me-refresh dan kembali ke `#students`:
- Fungsi `renderStudents()` membuat instance `new DataGrid` baru dari awal.
- Lifecycle mount kembali memicu `autoFitOnMount: true` -> `autoFitColumns(false)`.
- Lebar kolom Name kembali ditimpa secara paksa menjadi sempit (~180px), dan siklus kerusakan berulang terus.

### 3. Mengapa tidak menggunakan lebar tetap 320px secara permanen?
Jika kolom Name dipaksa bernilai tetap `width: 320px` bersama kolom lainnya yang bernilai tetap (`50 + 48 + 65 + 320 + 95 + 65 + 110 + 85*4 + 90`), total lebar tabel menjadi **1183px**.
Pada layar laptop 1366x768 dengan sidebar terbuka (lebar kontainer efektif 1144px), **1183px > 1144px**. Hal ini memicu munculnya scrollbar horizontal cyan di bagian bawah tabel (seperti yang terlihat pada tangkapan layar 23:06).

---

## 💡 Solusi Permanen: Flex Primary Column Pattern

Untuk menyelesaikan masalah ini secara tuntas tanpa bergantung pada event klik dan tanpa scrollbar:

1. **Matikan `autoFitOnMount: false` pada Student Roster:**
   Hapus ketergantungan pada kalkulasi canvas pasca-render yang tidak stabil dan menimpa lebar kolom.
2. **Terapkan Flex Primary Column pada Kolom Name:**
   Dalam CSS `table-layout: fixed; width: 100%`, jika 11 kolom lainnya memiliki lebar tetap yang telah dikalibrasi ketat, dan kolom `sortName` (Name) **dibiarkan fleksibel (`delete col.width; minWidth: '220px'`)**:
   - Chromium secara native akan mengalokasikan **100% sisa ruang kontainer** langsung ke kolom Name!
   - Pada layar 1366px, kolom Name otomatis mendapatkan **350px–376px** (nama terpanjang 25 karakter hanya butuh ~210px, footer hanya butuh ~220px -> **ZERO TRUNCATION**).
   - Pada layar 1920px, kolom Name otomatis melebar hingga ~700px+ menyerap seluruh kanvas monitor tanpa celah kosong.
   - Total lebar tabel **persis sama dengan lebar kontainer (1142px vs 1144px)** -> **ZERO HORIZONTAL SCROLLBAR**.
3. **Kalibrasi Presisi 11 Kolom Non-Name:**
   - `levelName`: `46px` (Label: "2nd", "AVG" -> pas tanpa elipsis)
   - `photo_url`: `42px` (Avatar 30px -> pas tanpa dead space)
   - `gender`: `68px` (Label: "Mister", "Miss", footer: "9 M · 7 F" -> pas tanpa elipsis)
   - `sortName` (Name): **FLEX / AUTO** (menyerap sisa ~350px-700px)
   - `birth_date`: `96px` ("16 Oct 2004" -> pas tanpa elipsis)
   - `ageDisplay`: `66px` ("22 yrs", footer: "21.1 yrs" -> pas tanpa elipsis)
   - `education`: `94px` ("SMA (2026)", "S1 (2026)" -> pas tanpa elipsis)
   - `_cls_exam1..4`: `74px` masing-masing ("136.5 pts" -> pas tanpa elipsis)
   - `program_status`: `84px` ("In Progress" -> pas tanpa elipsis)
4. **Sempurnakan `calculateColumnAutoWidth` di `datagrid.js`:**
   Jika pengguna suatu hari melakukan double-click manual pada resize handle, kalkulasi canvas wajib menyertakan sel `.datagrid-summary-row td` agar tidak mengecilkan kolom di bawah kebutuhan teks footer.
5. **Tambahkan atribut `id` pada `<table class="datagrid-table">`:**
   Pastikan tabel memiliki `id="student_roster_grid"` agar sinkronisasi `localStorage` antara DataGrid internal dan universal observer tidak saling bertabrakan.

---

## 📊 4-Column Before & After Visual Planning Matrix

| Metric / Komponen | Visual State Saat Ini (Before) | Target Visual Baru (After) | Alasan Perubahan & Dampak |
| :--- | :--- | :--- | :--- |
| **Lebar Kolom Name pada Initial Load** | Terpotong elipsis `~180px` (`Abdul Ba...`, `Muham...`, `★ BATC...`) | Fleksibel **`~350px – 376px`** pada 1366px, **`~750px`** pada 1920px | Zero truncation; seluruh nama siswa dan footer summary terbaca utuh sejak pertama kali halaman dibuka. |
| **Ketergantungan Klik / Interaksi** | Pengguna harus mengklik header kolom Name untuk memicu lebar normal | **100% Otomatis sejak render pertama** tanpa perlu klik manual | Menghilangkan friksi UX pengguna ("kenapa harus klik dulu baru membaik"). |
| **Status Scrollbar Horizontal** | Antara muncul scrollbar cyan (1183px) atau kolom mengecil (1016px) | **Zero horizontal scrollbar** (`scrollWidth === clientWidth`, diff 0) | Mematuhi aturan strict 100vh lock dan zero table horizontal scroll. |
| **Konsistensi Navigasi & Reload** | Kembali menyempit dan rusak setiap kali berpindah menu / reload | **Stabil permanen** pada setiap navigasi, pergantian batch, dan reload | Mematikan `autoFitOnMount: false` sehingga browser selalu menggunakan aturan flex layout yang deterministik. |

---

## 🛠️ Rencana Aksi (Execution Steps)

### Step 1: Kalibrasi Definisi Kolom & Matikan `autoFitOnMount` di `student-management.js`
- Lokasi: `js/admin/student-management.js`
- Ubah `autoFitOnMount: true` menjadi `autoFitOnMount: false`.
- Hapus `width: '320px'` pada kolom `sortName`, ganti menjadi tanpa properti `width` (flex column) dengan `minWidth: '220px'`.
- Kalibrasi 11 kolom lainnya ke angka optimal (`level: 46px`, `photo: 42px`, `gender: 68px`, `dob: 96px`, `age: 66px`, `education: 94px`, `exams: 74px`, `status: 84px`).

### Step 2: Perbaiki `calculateColumnAutoWidth` & Sinkronisasi Table ID di `datagrid.js`
- Lokasi: `js/admin/datagrid.js`
- Perbarui `calculateColumnAutoWidth` agar memeriksa juga sel summary footer (`tfoot` atau `.datagrid-summary-row td`) ketika mengukur lebar otomatis kolom.
- Pastikan elemen `<table class="datagrid-table">` menyematkan atribut `id="${this.tableId}"` agar storage key konsisten.

### Step 3: Verifikasi Otomatis Menyeluruh (Playwright & E2E)
- Jalankan script Playwright untuk memvalidasi:
  1. Halaman `#students` dibuka pertama kali: pastikan `truncatedCount === 0` pada seluruh 16 baris siswa dan footer.
  2. Pastikan lebar tabel `offsetWidth <= clientWidth` (nol horizontal scroll).
  3. Klik header Name untuk sort: pastikan lebar tetap stabil dan nama tetap utuh tanpa pergeseran drastis.
  4. Pindah ke tab lain (contoh: `#dashboard`) lalu kembali ke `#students`: pastikan tampilan tetap sempurna dan tidak kembali mengecil.
- Jalankan `npm.cmd test` untuk memastikan 20 test suite dan spatial checker tetap 100% PASS.
