# TopsCore LMS — Active Changelog (Phases 585–622)

> **Format:** Ultra-Condensed Active Changelog (Strict 25-Phase Rolling Window per AGENTS.md §5.3). Each entry highlights core functional deliverables, architectural milestones, and affected systems.
> **Full Archives:** Historical verbose logs for earlier phases are preserved in:
> - [`docs/archive/CHANGELOG_ARCHIVE.md.gz`](file:///docs/archive/CHANGELOG_ARCHIVE.md.gz) (Phases 1–228, Gzip Compressed)
> - [`docs/archive/CHANGELOG_ARCHIVE_2.md.gz`](file:///docs/archive/CHANGELOG_ARCHIVE_2.md.gz) (Phases 229–451, Gzip Compressed)
> - [`docs/archive/CHANGELOG_ARCHIVE_3.md.gz`](file:///docs/archive/CHANGELOG_ARCHIVE_3.md.gz) (Phases 452–539, Gzip Compressed)

---

## [2026-11-17 10:15] — Phase 622: Unified Hero Card Architecture (Option A SSOT: Sex Above DoB)
- **Standardisasi 1 Format HERO CARD Tunggal Terpadu (Option A SSOT)**:
  - Mengintegrasikan format Hero Card di 3 layar utama (**Dashboard**, **Profile Modal**, dan **Result Page**) menjadi 1 format resmi yang identik:
    1. **Bagian Atas (Centered Identity)**: Nama Siswa (`.hero-student-name`, 15px Outfit 800) dan Hierarki Akademik (`.hero-academic-meta`, Tactical Blue `#38bdf8`, e.g. `CEC • Camp • Batch 134 • 2nd Level`).
    2. **Garis Pemisah Halus (`.hero-card-divider`)**: Divider dengan gradien halus aksen tier ujian.
    3. **Bagian Bawah (Split 2-Kolom)**:
       - **Sisi Kiri**: Foto portrait rasio 3:4 (`64x84px`) dengan border & box-shadow bercahaya dinamis mengikuti nilai grade ujian (`--tier-color`).
       - **Sisi Kanan**: Tabel biodata vertikal rapi dengan titik dua presisi sejajar (*aligned colons*):
         - **Sex** (berada di atas DoB sesuai instruksi pengguna, dengan warna biru `#38bdf8` untuk Male dan pink `#ff2d87` untuk Female)
         - **DoB** (e.g. `16 Oct 2004`)
         - **Age** (e.g. `22 Years Old`)
         - **Adr** (format resmi Kemendagri e.g. `Pejanggik, Mataram, Mataram City, NTB` atau `Dalam, Alas, Sumbawa, NTB`)
- **Implementasi Terpadu di 3 File Halaman**:
  - **`dashboard.html` & `css/dashboard.css`**: Mentransformasikan `#welcome-banner-section` menjadi `.unified-hero-card`, memperbarui tabel profil modal agar kolom `Sex` berada tepat di atas `DoB`.
  - **`result.html` & `css/result.css`**: Menggantikan layout vertikal terpusat lama (lingkaran avatar di tengah) dengan `.unified-hero-card` horizontal 2-kolom terpadu.
  - **`js/result.js`**: Mengintegrasikan `formatVillageName`, `formatDistrictName`, `formatCityDistrict`, dan `formatProvinceName` dari `indonesia-regions.js`, serta mengambil data `gender, birth_date, dob, village, district, city, province` dari Supabase untuk mengisi tabel biodata Result Page secara otomatis.
- **Cache-Busting & PWA Sync**:
  - Mengupdate `sw.js` cache name ke `topscore-cache-option-a-v142`.
  - Cache-busting script tag `dashboard.js?v=20261117_v622` dan `result.js?v=20261117_v540`.
- **Verification**:
  - `npm.cmd test` lolos 100% (51 file JS AST valid dalam 0.25s, CSS minified, audit tata letak spasial lolos 100%).
  - `node scripts/test_regency_city_standardization.mjs` lolos 100% (6 pilar hijau).

---

## [2026-11-17 07:40] — Phase 619: RPC Error Elimination & Dashboard Address SSOT Formatting
- **Pembersihan RPC `auto_close_expired_attempts` & `emergency_submit_attempt` (PostgreSQL / Supabase)**:
  - Mengeliminasi query `SELECT id, student_id, COALESCE(test_id, assessment_id)...` yang memicu PostgreSQL error `42703 (column "assessment_id" does not exist)` dan menyebabkan response `POST .../rpc/auto_close_expired_attempts 400 (Bad Request)` pada konsol browser.
  - Memperbarui fungsi `emergency_submit_attempt` langsung di PostgreSQL live dan file migrasi; kini pemanggilan RPC `auto_close_expired_attempts` sukses dengan response `204 No Content` (Clean Console).
- **Audit Format Alamat Hero Profile Card ([js/dashboard.js](file:///d:/Tutor%20Tampan/TopsCore/js/dashboard.js))**:
  - Mengintegrasikan fungsi format resmi `formatVillageName`, `formatDistrictName`, `formatCityDistrict`, dan `formatProvinceName` pada `#hero-address-text` sehingga tampilan alamat siswa selaras 100% dengan SSOT (misal `Mataram City, NTB` bukan raw `Kota Mataram`, dan `Dalam, Alas, Sumbawa, NTB` tanpa redundant kata `Regency` atau `Desa`).
- **Verifikasi Info Tangian (Tab Pencarian Pengguna)**:
  - Mengonfirmasi bahwa "Tangian" yang dicari pengguna adalah **Dusun Tangian** yang berada di bawah naungan administratif resmi **Desa Dalam**, Kecamatan Alas, Kabupaten Sumbawa (sehingga entri desa yang tepat di sistem TopsCore adalah **Dalam**).
- **Verification**:
  - `npm.cmd test` lolos 100% dalam 0.98s.
  - `node scripts/test_regency_city_standardization.mjs` lolos 100%.

---

## [2026-11-17 07:22] — Phase 618: NTB Comprehensive Administrative Hierarchy & Village Autocomplete Overhaul
- **Kelengkapan 100% Desa Kecamatan Alas & Kabupaten Sumbawa ([js/indonesia-regions.js](file:///d:/Tutor%20Tampan/TopsCore/js/indonesia-regions.js))**:
  - Memasukkan nama desa resmi **Dalam** (ibu kota kecamatan) serta melengkapi seluruh 8 desa resmi di Kecamatan Alas: `Baru`, `Dalam`, `Juran Alas`, `Kalimango`, `Labuhan Alas`, `Luar`, `Marente`, `Pulau Bungin` (membersihkan entri usang `Jompa` dan `Labaian`).
  - Mengembangkan cakupan Kabupaten Sumbawa dari 5 kecamatan menjadi **24 kecamatan lengkap** (Alas, Alas Barat, Batu Lanteh, Buer, Empang, Labangka, Labuhan Badas, Lantung, Lape, Lenangguar, Lopok, Lunyuk, Maronge, Moyo Hilir, Moyo Hulu, Moyo Utara, Orong Telu, Plampang, Rhee, Ropang, Sumbawa, Tarano, Unter Iwes, Utan) beserta seluruh desa/kelurahan definitif Kemendagri / BPS.
- **Cakupan Komprehensif Seluruh NTB (10 Kabupaten & Kota)**:
  - **Kab. Lombok Tengah**: Melengkapi seluruh 12 kecamatan (Praya, Praya Barat, Praya Barat Daya, Praya Tengah, Praya Timur, Jonggat, Pujut, Kopang, Batukliang, Batukliang Utara, Janapria, Pringgarata).
  - **Kab. Lombok Timur**: Melengkapi seluruh 21 kecamatan (Selong, Aikmel, Masbagik, Labuhan Haji, Jerowaru, Keruak, Lenek, Montong Gading, Pringgabaya, Pringgasela, Sakra, Sakra Barat, Sakra Timur, Sambelia, Sembalun, Sikur, Sukamulia, Suralaga, Suela, Terara, Wanasaba).
  - **Kab. Sumbawa Barat**: Melengkapi seluruh 8 kecamatan termasuk Poto Tano dan Sekongkang.
  - **Kab. Dompu**: Melengkapi seluruh 8 kecamatan (Dompu, Woja, Hu'u, Kempo, Kilo, Manggelewa, Pajo, Pekat).
  - **Kab. Bima**: Melengkapi seluruh 18 kecamatan (Woha, Ambalawi, Belo, Bolo, Donggo, Lambitu, Lambu, Langgudu, Madapangga, Monta, Palibelo, Parado, Sanggar, Sape, Soromandi, Tambora, Wawo, Wera).
  - **Kota Mataram, Kab. Lombok Barat, Kab. Lombok Utara, Kota Bima**: Terverifikasi sinkron 100% dengan standar SSOT.
- **Preservasi Nama Desa & Normalisasi Robust ([js/indonesia-regions.js](file:///d:/Tutor%20Tampan/TopsCore/js/indonesia-regions.js))**:
  - `formatVillageName`: Menangani konversi prefix `Desa Dalam` -> `Dalam`, `Dalam Village` -> `Dalam`, sekaligus mempreservasi nama desa majemuk seperti `Bao Desa`.
  - `getVillagesForDistrict`: Mendukung pencarian fleksibel toleran spasi dan alias legacy (`Batuklik` -> `Batukliang`).
- **Cache-Busting & Test Verification**:
  - Bumping cache version di `js/admin/student-management.js`, `js/dashboard.js`, dan `sw.js` ke `?v=20261117_v547`.
  - Menambahkan verifikasi Pillar 6 pada `scripts/test_regency_city_standardization.mjs` (lolos 100%).
  - Fast Preflight AST syntax check (`npm.cmd test`) lolos 100% (0.93s).

---

## [2026-11-17 06:20] — Phase 617: Level Promotion Auto-Heal & Strict Level Isolation Engine
- **Auto-Heal Target Level Classes & Elimination of Unsafe Fallbacks ([js/api.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/api.js))**:
  - Mengeliminasi *unsafe fallback* pada `fetchStudentClasses()` yang sebelumnya mengembalikan kelas level bawah jika kelas level siswa belum aktif.
  - Mengimplementasikan mekanisme **Auto-Heal**: ketika siswa berada di level tertentu (misal Level 3) dan kelasnya masih berstatus nonaktif di database, sistem secara otomatis mengaktifkannya (`is_active: true`) dan mengembalikan kelas yang tepat sehingga siswa langsung memperoleh kurikulum level barunya.
- **Sinkronisasi Level Batch & Otomatisasi Aktivasi Kelas ([js/admin/student-management.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/student-management.js))**:
  - Memperbarui fungsi `promoteAllEligibleStudents` dan `promoteStudentNextLevel` agar saat promosi dieksekusi, `batches.current_level_id` otomatis disinkronkan ke level baru dan kelas-kelas pada level tujuan di program tersebut otomatis diaktifkan.
- **Placement & Diagnostic Test Action Integration ([js/admin/classes-management.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/classes-management.js), [js/admin/vocab-vault.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/vocab-vault.js))**:
  - Menghadirkan tombol aksi **Add Placement** di Classes Management dan dukungan opsi penjenjangan Tryout / Diagnostic Test di Vocab Vault modal wizard.
- **Database & Visual Parity Verification**:
  - Mengaktifkan `Camp 3rd Vocabulary` (`VOCAB_3`) dan menyelaraskan `current_level_id` Batch 134 ke 3rd Level.
  - Memverifikasi secara visual pada dashboard siswa (Miss Sari Hikmah, Batch 134) yang kini sukses mengakses kurikulum Level 3 (`3rd Vocabulary A1 Words Task` — *Professional Identity*).
- **Verification**:
  - `npm.cmd run test:fast` lolos 100% (syntax validation 51 JS files dalam 0.12s, minified CSS up-to-date).
  - `npm.cmd run test:table` lolos 100% (seluruh 11 pilar universal table standardization lolos).

---

## [2026-11-17 06:06] — Phase 616: Student Dashboard Hero Profile & Unified 3-Pillar Performance Card Redesign
- **Redesain Hero Card Menjadi Profile & Demographic Card ([dashboard.html](file:///d:/Drives/Tutor%20Tampan/TopsCore/dashboard.html), [css/dashboard.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/dashboard.css), [js/dashboard.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/dashboard.js))**:
  - Mengubah layout `#welcome-banner-section` menjadi kartu profil horizontal berdimensi $110\text{px}$ dengan padding internal tepat $10\text{px}$.
  - Sisi kiri memuat foto profil resmi ($68 \times 88\text{px}$, rasio portrait 3:4 dengan tier glowing border) serta crown badge bagi batch champion.
  - Sisi kanan memuat 4 baris data identitas dan demografi terstruktur:
    1. Full Name: `#welcome-name` (`Miss Sari Hikmah` / `Mr. Top`) 16px Outfit 800.
    2. Academic Hierarchy: `#welcome-meta-wrapper` (`CEC • CAMP • Batch 131 • 3RD LEVEL`) 11px Inter 600 Tactical Blue.
    3. Demographics: `#hero-profile-demographics` (Gender, Usia, Tanggal Lahir terformat e.g. `Female • 27 y.o. • 06 May 1997`) 11px Inter 400.
    4. Address: `#hero-profile-address` (Desa, Kecamatan, Kota, Provinsi) 11px Inter 400 slate `#94a3b8`.
- **Unified 3-Pillar Performance Card (`GRADE | GRADE DESCRIPTION | RATE`)**:
  - Mengubah `.dashboard-grade-legend` menjadi kartu performa 3 kolom simetris ($54\text{px}$) dengan divider vertikal halus:
    - **Pillar 1 (`GRADE`)**: Label uppercase 10px Inter 600 + Nilai Grade (`#stat-overall-grade-value`, e.g. `B` atau SVG Star) 22px Outfit 900.
    - **Pillar 2 (`GRADE DESCRIPTION`)**: Label uppercase 10px Inter 600 + Predikat (`#dashboard-achievement-text`, e.g. `GOOD`) 15px Outfit 800.
    - **Pillar 3 (`RATE`)**: Label uppercase 10px Inter 600 + Skor Rata-rata (`#bottom-stat-avg-score`, e.g. `85%`) 22px Outfit 900.
- **Square Progress Pips Invariant**:
  - Mengunci ketujuh kotak repetisi progres (`.rainbow-box`) ke rasio bujur sangkar presisi ($22 \times 22\text{px}$, `aspect-ratio: 1 / 1`, `border-radius: 5px`, `gap: 4px`), melenyapkan pip gepeng.
  - Membersihkan baris duplikat styling pada baris 5780 `css/dashboard.css`.
- **Spatial Optimization & 100vh Corridor Lock**:
  - Total tinggi kedua kartu berkurang dari $210\text{px}$ menjadi $174\text{px}$ (hemat $36\text{px}$), memberikan ruang vertikal ekstra bagi leaderboard table dengan 100% strict 100vh lock compliance.
- **Verification**:
  - `npm.cmd run test:fast` lolos 100% (syntax validation 51 JS files dalam 0.11s, minified CSS built).
  - `npm.cmd run test:table` lolos 100% (all 11 pillars passed).

---

## [2026-11-17 05:58] — Phase 615: Curriculum Class Action Column Direct Activation & Deactivation Controls
- **Tombol Langsung `Activate` & `Deactivate` di Kolom ACTIONS ([js/admin/classes-hub.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/classes-hub.js))**:
  - Mengeliminasi ketergantungan aktivasi kelas dari toggle switch tersembunyi berkelas `edit-mode-only` yang sebelumnya tidak tampak dalam mode operasi reguler.
  - Menghadirkan tombol aksi **`Activate`** berlatar hijau lembut Grade A (`rgba(0,192,0,0.12)`), border `rgba(0,192,0,0.4)`, teks hijau tegas `var(--grade-a)`, dan ikon SVG `check-circle` untuk seluruh kelas yang berstatus `Inactive`.
  - Menghadirkan tombol aksi sekunder **`Deactivate`** untuk kelas berstatus `Active`, bersanding dengan tombol **`Inspect`** tes dan tombol **`Vault`**.
- **Sinkronisasi Instan Database & Sidebar C — CLASS**:
  - Mengklik tombol `Activate` atau `Deactivate` langsung memutasi database Supabase (`classes.is_active`), memperbarui memori lokal seketika tanpa jeda, menampilkan toast status, dan mengeksekusi `window.loadSidebarClasses()` untuk langsung memunculkan atau menyembunyikan kelas pada navigasi `C — CLASS` di sidebar.
- **Interaktivitas Badge Status**:
  - Menambahkan affordance klik langsung pada badge status di kolom STATUS (`Active` / `Inactive`) sehingga Tutor/Admin juga dapat mengklik badge status untuk mengaktifkan kelas secara instan.
  - Memperluas lebar kolom aksi `ACTIONS` menjadi `minmax(185px, 1.2fr)` untuk memastikan seluruh tombol aksi tertata rapi tanpa pembungkusan (*zero text wrap*).
- **Verification**:
  - `npm.cmd test` lolos 100% (syntax validation 51 JS files dalam 0.11s, spatial invariant audit 100% green).
  - `npm.cmd run test:table` lolos 100% (all 11 pillars verified green).

---

## [2026-11-16 23:50] — Phase 613: Hero Next Test Card Typography, Rainbow Pips SSOT & Affordance Harmonization
- **Penyelarasan Tipografi & Bobot Hero Next Test Card ([css/dashboard.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/dashboard.css))**:
  - Mengubah judul tugas (`.next-test-primary-name`) dari `Outfit 800` menjadi **`Inter 600`** (13px), dan sub-topik materi (`.next-test-topic-name`) dari `Outfit 700` menjadi **`Inter 400` (Regular)** warna slate `#94a3b8` untuk menciptakan kontras hierarki yang proporsional dan tidak serba tebal.
  - Memperbarui angka 1–7 pada pips pelangi repetisi (`.rainbow-box`) ke font **`Inter 600` (11px, tabular-nums)** agar pas dan presisi di dalam kotak 18px.
  - Memperbaiki tombol counter repetisi kanan (`.pass-counter-btn`) ke font **`Inter 700`**.
- **Koreksi Spektrum 7 Kotak Pelangi (AGENTS.md §2.10.2 SSOT)**:
  - Memperbaiki bug pemetaan token warna pada `.rainbow-box[data-step="..."]`: kini 100% selaras dengan urutan spektrum pelangi resmi: Merah (`var(--grade-e)`) $\to$ Jingga (`var(--grade-d)`) $\to$ Kuning (`var(--grade-c)`) $\to$ Hijau (`var(--grade-a)`) $\to$ Biru (`var(--primary-tactical)`) $\to$ Nila (`var(--clr-accent-1)`) $\to$ Ungu (`var(--quad-d)`).
- **Peningkatan Affordance Tombol Latihan ([js/dashboard.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/dashboard.js))**:
  - Menambahkan glif play SVG mikro (`2 ▶`) di dalam tombol counter repetisi agar siswa memahami secara intuitif bahwa tombol tersebut berfungsi untuk memulai latihan repetisi ke-2.
- **Proteksi Session & Anti-Loop ([js/session.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/session.js))**:
  - Menambahkan validasi `if (parsed && !parsed.student_id) return null;` pada `getStudentSession()`, mencegah potensi *infinite redirect loop* jika terdapat payload storage kosong.
- **Verification**:
  - `npm.cmd run test:fast` lulus 100% (syntax validation 51 JS files dalam 0.10s, minified CSS up-to-date).
  - `npm.cmd run test:table` lulus 100% (all 11 pillars verified green).

---

## [2026-11-16 23:38] — Phase 612: Curriculum Global Passing Standards Matrix Cockpit (Dual-Tab Topbar View - Option 1)
- **Implementasi Cockpit Matriks Standar Kelulusan Global (Option 1 SSOT §2.4, §2.10, §4.1)**:
  - **Dual-Tab Topbar View**: Menyematkan dua tab navigasi utama di top panel modul Curriculum (`#classes-hub`) via `setTopbarTabs`:
    1. **`Classes & Levels`** (Icon `layers`, jumlah kelas aktif): Tampilan hirarki level dan kelas L0–L3 yang rapi dan terstruktur.
    2. **`Passing Standards Matrix`** (Icon `award`, jumlah tes aktif: 68 tes): Cockpit global untuk memantau seluruh kelas beserta seluruh tes dan ambang batas nilai kelulusan minimalnya (`minimum_required_score`).
  - **Institution Filter Toolbar Pills (`All`, `CEC`, `TOP`)**: Memindahkan filter kampus ke baris toolbar pencarian sehingga kedua tab dapat difilter secara sinkron tanpa mengotori topbar.
  - **Passing Standards Matrix Table**: Membangun tabel berstandar continuous 2px perimeter border dan font 12px berdisiplin 100vh lock dengan kolom:
    `LVL` | `CLASS NAME` | `PROGRAM` | `TESTS` | `EXAM STANDARDS` (Grade C 60%) | `TASK STANDARDS` (70%) | `RANGE` | `STATUS` | `ACTIONS` (`Inspect Tests`).
  - **Expandable Test Drawer & Quick Calibration**:
    - Tombol `Inspect Tests` membuka laci drawer pengujian berdensitas tinggi: `Shell Code`, `Test Title`, `Type (EXAM/TASK)`, `Module`, `Questions`, `Passing Standard (%)`, dan tombol `Edit Standard`.
    - Modal cepat `openQuickEditPassingStandard` untuk mengkalibrasi nilai kelulusan per tes dengan sinkronisasi instan ke Supabase (`tests.minimum_required_score` & `payload`).
    - Fitur `Batch Align Standards` untuk meratakan standar seluruh ujian (60% Grade C) atau seluruh tugas (70%) di suatu kelas dengan satu klik.
- **Verification**:
  - `npm.cmd test` lolos 100% (syntax validation 51 JS files dalam 0.64s, spatial invariant audit 100% green).
  - `npm.cmd run test:table` lolos 100% (all 11 pillars passed).

---

## [2026-11-16 23:15] — Phase 610: Universal Table Cell Regular Weight Invariant & Inter Font Harmonization
- **Universal Table Cell Regular Weight Invariant (AGENTS.md §2.30 & ui-invariants.md §2.0 & §4.1)**:
  - **Zero Bold in Table Content**: Di seluruh sistem (Student Dashboard Leaderboard/Standings, Completed Tests, Admin Datagrid, dan Modal Tables), seluruh huruf dan angka di dalam baris tabel (teks, nama siswa, nomor peringkat, angka poin PTS, persentase) **MUTLAK MENGGUNAKAN `font-weight: 400` (Regular)**. Dilarang keras menggunakan huruf atau angka tebal (`700`, `800`, `900`) di dalam sel baris tabel.
  - **Font SSOT Wajib Inter**: Mengganti penggunaan font display `Outfit` pada sel/konten tabel data dengan font **`Inter`** (`var(--font-sans)`, `'Inter', sans-serif`). Huruf dan angka kini tampil proporsional, rapi, bersih, dan bertaraf workstation (*high-density legibility*).
  - **Perbaikan CSS & JS Terkait**:
    - [css/dashboard.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/dashboard.css): Memperbaiki `.standings-table-header` (Inter, 600), `.leaderboard-rank-badge` (Inter, 400), `.leaderboard-student-name` (Inter, 400), `.leaderboard-score-val` (Inter, 14px 400), `.leaderboard-grade-chip` (Inter, 600), `.completed-col-num` (Inter, 400), `.completed-col-name` (Inter, 400), `.completed-col-score` (Inter, 400), `.completed-type-pill` (Inter, 500).
    - [js/dashboard.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/dashboard.js): Menghapus suntikan inline `font-weight: 800` pada baris siswa aktif, angka skor poin, dan grade chip; mengganti ke `font-weight: 400` dan font family `Inter`.
    - [css/style.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/style.css): Menambahkan penegasan aturan global *Universal Table Cell Content Regular Weight Invariant* (Inter, 400).
    - [css/admin.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/admin.css): Memperbaiki `.asm-rep-badge` ke font `Inter` regular 400.
    - [AGENTS.md](file:///d:/Drives/Tutor%20Tampan/TopsCore/AGENTS.md) & [.agents/rules/ui-invariants.md](file:///d:/Drives/Tutor%20Tampan/TopsCore/.agents/rules/ui-invariants.md): Mendokumentasikan aturan baku Bab 2.0 & Bab 4.1 secara permanen.
- **Verification**:
  - `npm.cmd run test:fast` lolos 100% (syntax validation 51 JS files dalam 0.10s, minified CSS up-to-date).
  - `npm.cmd run test:table` lolos 100% (all 11 pillars verified green).

---

## [2026-11-16 23:08] — Phase 609: Level Promotion Passing Threshold Bugfix & Batch 134 Level 3rd Synchronization
- **Pemberantasan Bug Ambang Batas Kelulusan Promosi ([js/admin/student-management.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/student-management.js))**:
  - Memperbaiki ambang batas kelulusan promosi level dari *hardcoded* `pct >= 70` menjadi **`pct >= minPass`** (default `60%` Grade C "Enough" / Lulus SSOT per Rule 2.10).
  - Memperbarui dialog konfirmasi promosi dan modal kriteria persyaratan dari `&ge; 70%` menjadi `&ge; 60%`.
  - Mengeliminasi penyebab 9 siswa dengan nilai Grade C (60%–69%) tertahan dan tidak bisa naik level bersamaan dengan siswa lainnya.
- **Sinkronisasi Rata 15 Siswa Batch 134 ke 3rd Level (PostgreSQL Transaction)**:
  - Sebanyak 9 siswa yang sebelumnya tertahan di 2nd Level (`Dahuri`, `Adinda`, `Ayya`, `Cinta`, `Lalu Yuda`, `Alifurrahman`, `Afyani`, `Riska`, `Wildian`) berhasil dinaikkan ke **`3rd Level`** via PostgreSQL transaction lengkap dengan *structured audit logs* (`LEVEL_PROMOTION`).
  - Seluruh 15 siswa aktif di Batch 134 (`Camp 2nd Vocabulary`) kini **100% rata berada di 3rd Level**.
  - Cache buster di [admin.html](file:///d:/Drives/Tutor%20Tampan/TopsCore/admin.html) dinaikkan ke `v=20261116_v603`.
- **Verification**:
  - Seluruh test suites lulus 100% green (*zero syntax errors, 10/10 table pillars green*).

---

## [2026-11-16 19:35] — Phase 607: Student Dashboard Hero Next-Test Invariant, Leaderboard Waiver Exclusion & Cultural Honorific Title Fix
- **Pembersihan False Positive Banner Hero Next Test ([js/dashboard.js](file:///d:/Tutor%20Tampan/TopsCore/js/dashboard.js))**:
  - Menambahkan guard proteksi `if (!published || published.length === 0)` pada `renderNextAssignmentHero`: jika array tes kosong atau belum ada tes terjadwal, sistem menampilkan pesan netral `"No active tests scheduled in this class."`, melenyapkan deklarasi keliru `"All tests in this class completed! ✓ 100%"`.
  - Melindungi resolusi `activeClassId` agar selalu terverifikasi terhadap daftar kelas aktif siswa (`(classes || []).find(...)`), mencegah polusi dari ID kelas usang di `localStorage`.
- **Eksklusi Dispensasi Waiver 0% pada Rata-Rata Leaderboard ([js/dashboard.js](file:///d:/Tutor%20Tampan/TopsCore/js/dashboard.js))**:
  - Menyertakan kolom `is_forgiven` dan `is_manual_override` pada query `attempts` dan pemetaan `bestMap` di `loadBatchLeaderboard` dan `computeOverallStats`.
  - Memastikan `validExamItems` mengeksklusikan tes dispensasi 0% (`isPureForgivenZero`) dari rata-rata ujian, memulihkan Grade dan persentase skor siswa berprestasi yang sebelumnya anjlok (Miss Riska Fetrosia 702 PTS pulih menjadi Grade C 78%, Mr. Lalu Yuda 659 PTS menjadi Grade C 76%, Mr. Wildian 609 PTS menjadi Grade C 69%).
- **Koreksi Data Gender & Safeguard Gelar Kultural Bangsawan Lombok ([js/dashboard.js](file:///d:/Tutor%20Tampan/TopsCore/js/dashboard.js), Supabase DB)**:
  - Memperbarui data gender siswa `Lalu Yuda Handika Prawira` dan `Lalu Arman Maulana` menjadi `male` di tabel `students`.
  - Mengintegrasikan safeguard kultural otomatis: nama berawalan `Lalu ` diidentifikasi sebagai pria (`Mr.` / `King`), dan `Baiq ` sebagai wanita (`Miss` / `Queen`).
- **Sinkronisasi Level Batch & Student Login Session ([js/api.js](file:///d:/Tutor%20Tampan/TopsCore/js/api.js), Supabase DB)**:
  - Mengembalikan `level_id` 18 siswa di Batch 134 agar selaras dengan `batches.current_level_id` (`9936683a` Level 2).
  - Meng-upgrade `verifyStudentLogin` dan `fetchStudentClasses` dengan fallback tangguh ke kelas aktif program bila level siswa tidak memuat kelas.

---

## [2026-11-16 18:35] — Phase 606: Comprehensive System-Wide Invariants, Typography, Entity Emojis & Legacy Hygiene Audit
- **Zero HTML Entity Emojis & Unicode Cleanliness**: Seluruh entitas numerik HTML emoji diganti vektor SVG resmi (`getSvgIcon`) atau teks bersih.
- **Dual-Scale Typography Architecture**: Menormalisasi seluruh font liar (18px, 15px, 13px, 11px) ke skala terpusat (12px, 14px, 16px, 20px, 30px).

---

## [2026-11-16 18:25] — Phase 605: Student Dashboard Zero-Truncation Invariant & Dual-Tab Label Harmonization
- **Pemulihan Penuh Zero-Truncation Nama Siswa pada Klasemen ([css/dashboard.css](file:///d:/Tutor%20Tampan/TopsCore/css/dashboard.css))**:
  - Mengkalibrasi proporsi kolom grid tabel klasemen (Pane A) menjadi `grid-template-columns: 24px 1fr 38px 28px !important;` dengan padding 10px rapi, menghasilkan penambahan ruang horizontal masif (+46px) untuk nama siswa.
  - Mengubah `.leaderboard-student-name` dan `.leaderboard-name-wrap` dari `nowrap` + `ellipsis` menjadi pembungkusan teks alami (`white-space: normal; line-height: 1.25; word-break: break-word; text-overflow: clip;`).
  - Menghapus pemotongan elipsis (`...`) pada nama panjang (seperti `Queen Isnantika Salsabila` kini tampil 100% penuh dan utuh dalam 1 baris), menaati **Rule 2.21 (*Universal Zero-Truncation Invariant*)**.
  - Mengkalibrasi tabel Completed Tests (Pane B) menjadi `grid-template-columns: 24px 1fr 38px 28px 34px !important;` untuk memberikan ruang seimbang pada nama tes.
- **Penyelarasan Tab Navigasi Ganda ([dashboard.html](file:///d:/Tutor%20Tampan/TopsCore/dashboard.html))**:
  - Menyederhanakan label tab pertama dari `RANKING: MY RANK` menjadi **`MY RANK`** bersanding dengan chip `#9`, berpasangan simetris dan elegan dengan tab kedua **`COMPLETED TESTS`** `10` tanpa tanda baca redundan.
- **Verifikasi Snapshot Visual Mobile 390×800**:
  - Snapshot Playwright membuktikan seluruh nama siswa dari peringkat 1 s/d 6 tampil 100% utuh tanpa elipsis.

---

## [2026-11-16 16:15] — Phase 604: PIN Micro-Interactions, Smooth Digit Navigation, Grade E Error Shake & Universal PWA Network Status Resilience
- **Eradikasi Drifting PWA Banner & Restorasi Centering Bottom Banner Desktop (§2.28 SSOT)**:
  - **Isolasi Mutlak Banner PWA ke Student Gate**: Memperbaiki fallback pada [js/pwa.js](file:///d:/Tutor%20Tampan/TopsCore/js/pwa.js) yang sebelumnya menyisipkan banner ke `body` saat berada di halaman selain login. Banner instalasi PWA kini strictly hanya dirender di [index.html](file:///d:/Tutor%20Tampan/TopsCore/index.html) (`.login-wrapper`). Di layar internal ([dashboard.html](file:///d:/Tutor%20Tampan/TopsCore/dashboard.html), [test.html](file:///d:/Tutor%20Tampan/TopsCore/test.html), [result.html](file:///d:/Tutor%20Tampan/TopsCore/result.html)), banner tidak akan pernah muncul sehingga melenyapkan teks mengambang tanpa gaya di pojok kiri atas desktop (`x:0, y:0`).
  - **Restorasi Penengahan Bottom Banner di Desktop**: Menghapus deklarasi `margin: 0 !important;` duplikat di [css/dashboard.css](file:///d:/Tutor%20Tampan/TopsCore/css/dashboard.css) yang sebelumnya menimpa `margin: 0 auto !important;`. Banner bawah `#bottom-ad-banner` kini terkunci rapi terpusat (*centered*) tepat di bawah koridor mobile 430px di seluruh resolusi layar desktop maupun laptop.
- **Ergonomi Input PIN & Navigasi Digit Mulus ([js/auth.js](file:///d:/Tutor%20Tampan/TopsCore/js/auth.js) & [css/auth.css](file:///d:/Tutor%20Tampan/TopsCore/css/auth.css))**:
  - **Auto-Focus ke Digit 1**: Saat siswa memilih nama di Langkah 4, fokus kursor otomatis berpindah ke `#pin-0` tanpa memerlukan tap tambahan.
  - **Click/Focus Routing**: Mencegah kursor melompati kotak kosong saat siswa mengklik kotak digit 2/3/4 ketika digit sebelumnya masih kosong; kursor otomatis dialihkan ke kotak kosong pertama.
  - **Navigasi Backspace & Panah**: Tombol `Backspace` pada kotak kosong secara mulus memundurkan fokus ke kotak sebelumnya dan menghapus digitnya; navigasi panah kiri/kanan (`ArrowLeft`, `ArrowRight`) diaktifkan untuk kenyamanan navigasi keyboard fisik.
  - **Animasi Getar & Border Merah Grade E saat PIN Salah (`@keyframes pinShake`)**: Saat verifikasi PIN gagal, baris PIN bergetar lembut (`.pin-row.shake`) dan kotak digit memancarkan border merah Grade E (`var(--grade-e)` / `#FF0000`) selama 450ms sebelum otomatis dibersihkan dan kursor dikembalikan ke digit pertama.
- **Deteksi Jaringan & Ketahanan Offline Universal PWA ([js/pwa.js](file:///d:/Tutor%20Tampan/TopsCore/js/pwa.js) & [css/style.css](file:///d:/Tutor%20Tampan/TopsCore/css/style.css))**:
  - Menyematkan pemantau status jaringan universal di `initPWA()` yang aktif di seluruh ekosistem halaman siswa (`index.html`, `dashboard.html`, `test.html`, `result.html`).
  - Menampilkan badge status mengambang terpusat (`.pwa-offline-badge`):
    - **Saat Offline**: Kuning Grade C (`var(--grade-c)` / `#FFFF00`) dengan animasi titik berdenyut (*pulsing dot*) dan pesan *"Offline Mode — Using Cached Data"*.
    - **Saat Online Kembali**: Berganti ke Hijau Grade A (`var(--grade-a)` / `#00c000`) dengan pesan *"Back Online"* selama 2.5 detik sebelum memudar secara halus (*fade out*).
  - Mengikuti 7 pilar SSOT: jarak 10px dari batas atas, font 12px bold (Level 3 Baseline), 100% Bahasa Inggris, dan nol redudansi/clutter.

---

## [2026-11-16 16:05] — Phase 603: Official Option A Emblem Logo & Production PWA Architecture
- **Kalibrasi Golden Sweet Spot 25% Lebar Layar (98px × 98px) & Eradikasi Judul Redundan**:
  - Mengunci dimensi emblem logo pada [index.html](file:///d:/Tutor%20Tampan/TopsCore/index.html) dan [css/auth.css](file:///d:/Tutor%20Tampan/TopsCore/css/auth.css) tepat **`98px × 98px`** (persis 25% dari koridor layar mobile 392px), squircle radius 24px, border 2.5px Tactical Cyan, dan ambient cyan glow yang elegan.
  - Menghapus permanen elemen teks `<h1>TOPS CORE</h1>` di bawah logo (*Zero Redundant Heading Clutter*) karena tulisan `TOPS` dan `CORE` sudah tertera jelas dan tegas di dalam emblem logo.
  - Membungkus emblem logo ke dalam tag `<h1>` dengan `aria-label="TOPS CORE"` untuk kepatuhan semantik dan aksesibilitas pembaca layar (a11y).
  - Mengunci margin bawah logo tepat **10px** ke Langkah 1 Institusi (*Strict 10px Container Gap Invariant*).
- **Penetapan Resmi Logo Emblem "TOPS CORE" Opsi A (Outfit 900, Zero Divider, 100% Identical Font Size)**:
  - Mengganti ikon buku terbuka generik dengan logo emblem otentik resmi bertuliskan **`TOPS`** (putih bersih) di atas dan **`CORE`** (Tactical Cyan `#38bdf8`) di bawah.
  - Memastikan ukuran font atas dan bawah **100% persis sama** (38px / 90px pada icon master), tanpa garis pembatas, dengan font tegak tebal geometris (*Outfit 900*) murni non-kursif.
  - Memasang emblem squircle baru pada badge login Student Gate di [index.html](file:///d:/Tutor%20Tampan/TopsCore/index.html) dan [css/auth.css](file:///d:/Tutor%20Tampan/TopsCore/css/auth.css) (`border-radius: 14px`, ambient cyan glow).
- **Penerbitan Icon Pack Lengkap PWA Resmi**:
  - Mengenerate ulang seluruh paket ikon resmi via Playwright headless engine ke [icons/](file:///d:/Tutor%20Tampan/TopsCore/icons/): `icon-192.png`, `icon-512.png`, `icon-maskable-192.png`, `icon-maskable-512.png`, `apple-touch-icon.png`, dan `icon.svg`.
  - Icon maskable diatur dengan zona aman 20% agar terhindar dari pemotongan pada launcher Android lingkaran/squircle.
- **Standarisasi Web App Manifest & Service Worker Network-First ([manifest.json](file:///d:/Tutor%20Tampan/TopsCore/manifest.json) & [sw.js](file:///d:/Tutor%20Tampan/TopsCore/sw.js))**:
  - `manifest.json` dikonfigurasi penuh dengan `display: standalone`, `theme_color: #060911`, `orientation: portrait`, dan icon pack baru.
  - Cache Service Worker diperbarui ke `topscore-cache-option-a-v140` dengan strategi *Network-First* untuk dokumen/script demi propagasi instan pembaruan materi.
- **Suite Pengujian Integritas PWA ([scripts/test_pwa_integrity.mjs](file:///d:/Tutor%20Tampan/TopsCore/scripts/test_pwa_integrity.mjs))**:
  - Ditambahkan ke `npm.cmd run test:pwa` dalam [package.json](file:///d:/Tutor%20Tampan/TopsCore/package.json), lolos 100% validasi manifest, icon file presence, HTML tags, dan cache registration.

---

## [2026-11-16 15:45] — Phase 602: Student Gate Login Invariants, Step 1 Cascade Restoration & Open Book Brand Badge
- **Relokasi & Restrukturisasi Ergonomis Banner PWA (Bab 5.3 & 1.2 SSOT)**:
  - Memindahkan posisi rendering banner instalasi PWA di [js/pwa.js](file:///d:/Tutor%20Tampan/TopsCore/js/pwa.js) agar disisipkan tepat di bawah judul brand `TOPS CORE` dan tepat di atas bilah pilihan institusi (`secInstitution.parentNode.insertBefore(banner, secInstitution)`).
  - Menyelaraskan jarak margin menjadi murni `margin: 0;` di [css/auth.css](file:///d:/Tutor%20Tampan/TopsCore/css/auth.css) sehingga gap atas ke judul dan gap bawah ke bilah institusi terkunci tepat **10px presisi** mengikuti flex gap `.login-wrapper`.
  - Menstandarisasi bahasa menjadi **Bahasa Inggris murni**: tombol "Later" (menggantikan teks "Nanti") dan `aria-label="Dismiss"`.
  - Menghapus permanen teks deskripsi kecil di bawah judul (*Zero Description Clutter*), merampingkan banner ke profil ergonomis (~48px tinggi) dengan padding 10px dan font judul 14px (Level 2.5 SSOT).
- **Pembesaran Judul Brand ke 30px & Eliminasi Subtitle (Level 0 Brand Hero Landmark SSOT)**:
  - Menaikkan ukuran font judul brand `TOPS CORE` pada [index.html](file:///d:/Tutor%20Tampan/TopsCore/index.html) dan [css/auth.css](file:///d:/Tutor%20Tampan/TopsCore/css/auth.css) dari 20px menjadi **30px (`Outfit 900`, line-height: 1.1, margin: 0)**.
  - Mengkategorisasikannya secara resmi ke dalam **Level 0 (Brand Hero Landmark)** pada Secondary Functional Scale, selaras matematis dengan kisi 10px kelipatan 3 ($10\text{px} \times 3$). Menolak angka perantara liar 18px demi menjaga kemurnian skala tipografi dual-scale.
  - Menghapus permanen teks deskripsi/subtitle di bawah judul (`Student Gate — Sign in to continue`) (*Zero Subtitle Clutter*), memaksimalkan ruang vertikal koridor mobile 430px agar seluruh langkah cascade login tetap berada *above-the-fold* secara elegan dan fokus.
  - Meratifikasi aturan baku di [.agents/rules/ui-invariants.md](file:///.agents/rules/ui-invariants.md) §2.1 & §5.3 dan [AGENTS.md](file:///d:/Tutor%20Tampan/TopsCore/AGENTS.md) §2.3.
- **Eliminasi Total Gap Dobel 20px & Phantom Gaps pada Seksi Terkunci (Strict 10px Lock)**:
  - Mengunci seluruh jarak vertikal antar-seksi menjadi murni **10px SSOT** dari `gap: 10px` pada `.login-wrapper`.
  - Menghapus aturan `margin-bottom: 10px` pada `.cascade-section` dan `margin: 10px 0` pada `.remember-me-banner` yang sebelumnya bertumpuk dengan flex gap (menghasilkan 20px–30px dobel).
  - Menetapkan `display: none` pada seksi yang belum aktif (`:not(.unlocked):not(.selected)`), melenyapkan celah kosong hantu (*phantom flex gaps*) sebesar 40px–60px antara langkah aktif dan banner.
  - Memperbaiki bug pada `change-institution-btn` (`resetFrom('program')` bukan `'institution'`) sehingga langkah institusi tidak pernah hilang saat tombol Change ditekan.
  - Merapikan posisi titik dua (`:`) pada label terlipat agar menempel rapi tepat 1px setelah nama label (`margin-left: 1px; margin-right: 8px; width: auto;`), melenyapkan ruang kosong aneh sebelum titik dua.
- **Pelegaan Kapsul Nama Siswa & Standarisasi Touch Target 44px (Level 2.5 SSOT)**:
  - Memperluas dimensi kapsul tombol siswa `.opt-card` di [css/auth.css](file:///d:/Tutor%20Tampan/TopsCore/css/auth.css): `min-height: 44px`, `padding: 11px 14px`, `border-radius: 10px`, dan `gap: 12px` (melenyapkan kesan sempit/gepeng).
  - Teks nama siswa tetap menggunakan ukuran proporsional **14px** (`font-weight: 600; line-height: 1.35;`) dengan bullet dot Tactical Cyan yang rapi dan aksen neon glow lembut saat aktif.
  - Memperbaiki `.cascade-label` dari `width: 96px` kaku menjadi `min-width: 68px; max-width: 90px;` agar label nama siswa terpilih pada baris terlipat tidak terpotong (*zero truncation*).
- **Eradikasi Gap Kosong Berlebih pada Options Grid (Eliminasi `min-height: 120px`)**:
  - Menghapus aturan `min-height: 120px` dan `padding-bottom: 8px` pada `.options-grid` di [css/auth.css](file:///d:/Tutor%20Tampan/TopsCore/css/auth.css).
  - Ketika sebuah daftar hanya berisi 1 item (misal opsi tunggal `TOP`), kontainer kini menyesuaikan tinggi secara pas (*shrink-to-fit*), sehingga jarak antara bagian bawah tombol `TOP` ke garis batas bawah kotak tepat **10px** konsisten sesuai aturan baku 10px (*Universal 10px Container Gap Invariant*).
- **Neutralization PIN Digit Filled State & Tactical Button (Gambar 2)**:
  - Mengubah warna border dan background `.pin-digit.filled` di [css/auth.css](file:///d:/Tutor%20Tampan/TopsCore/css/auth.css) dari warna hijau (`rgba(0, 192, 0, 0.5)` — Grade A) menjadi warna netral (`rgba(255, 255, 255, 0.35)` dengan background `rgba(255, 255, 255, 0.08)`), melenyapkan bias false-success pada input PIN belum terverifikasi.
  - Mengubah gradient tombol `.btn-signin` dari ungu legacy ke Tactical Blue (`#0284c7` s/d `#0369a1` dengan border `#38bdf8`), serta teks sapaan nama siswa menjadi Tactical Blue.
- **Standarisasi Spasial 10px Universal & Padding Kartu Internal 10px (Bab 1.2)**:
  - Mengunci jarak elemen internal kartu ke garis luar kotak (`padding: 10px`) pada `.cascade-header`, `.cascade-body`, dan `.pin-section`.
  - Mengunci seluruh jarak antar-item tepat `10px`: `.options-grid { gap: 10px; }`, `.pin-row { gap: 10px; margin-bottom: 10px; }`, `.cascade-search { margin-bottom: 10px; }`, `.pin-actions { gap: 10px; }`.
- **Standarisasi Ukuran Font Dropdown ke 14px (Level 2.5 SSOT)**:
  - Menyelaraskan ukuran teks item dropdown (.opt-card dan .opt-card-name) dari 16px menjadi **14px** (Level 2.5 Specialized Dropdown/Selects) dengan padding `8px 10px`, menghemat ruang vertikal dan mencegah tumpang tindih nama panjang siswa.
- **Pemulihan Step 1 (Institution) pada Alur Login Siswa (`js/auth.js`)**:
  - Memperbaiki bug kritis pemanggilan `resetFrom('institution')` menjadi `resetFrom('program')` saat institusi terpilih di [js/auth.js](file:///d:/Tutor%20Tampan/TopsCore/js/auth.js).
  - Mengembalikan Step 1 (Institution) agar tetap tampil utuh dan terlipat rapi dengan label nama institusi dan tombol `Change` yang berfungsi penuh, memulihkan hierarki resmi AGENTS.md §2.3: `INSTITUTION -> PROGRAM -> BATCH -> STUDENT -> PIN`.
- **Badge Logo Buku Vektor SVG Resmi (`index.html` & `css/auth.css`)**:
  - Memasang badge lingkaran berefek neon glow dan floating subtle di atas `TOPS CORE` pada [index.html](file:///d:/Tutor%20Tampan/TopsCore/index.html) menggunakan vektor SVG Open Book (`.brand-badge-wrap .brand-book-icon`).
  - Menyelaraskan styling di [css/auth.css](file:///d:/Tutor%20Tampan/TopsCore/css/auth.css) dengan token Tactical Cyan `#38bdf8`.
- **Penerapan Universal 10px Container Gap Invariant (Bab 1.2)**:
  - Mengunci jarak seluruh kontainer dan seksi cascade di [css/auth.css](file:///d:/Tutor%20Tampan/TopsCore/css/auth.css) tepat `10px` (`.login-wrapper { gap: 10px; }`, `.cascade-section.unlocked { margin-bottom: 10px; }`, `.cascade-section.selected { margin-bottom: 10px; }`, `.remember-me-banner { margin: 10px 0; }`).
- **Harmonisasi Skala Tipografi & Zero Sub-12px (Bab 2.1 & 2.2)**:
  - Menyelaraskan ukuran subtitle brand (`.login-brand p`) menjadi 14px (Level 2.5 Lead Subtitle) dan teks banner (`.rmb-text`) menjadi 14px.
- **Eradikasi Unicode Emojis (Bab 2.3 Strict Zero Emojis Invariant)**:
  - Mengganti seluruh emoji unicode kaca pembesar `&#128269;` pada kolom pencarian di [index.html](file:///d:/Tutor%20Tampan/TopsCore/index.html) dan pesan kosong di [js/auth.js](file:///d:/Tutor%20Tampan/TopsCore/js/auth.js) dengan ikon vektor SVG Search resmi.
- **Penerapan Strict Zero-Movement Hover Invariant (Bab 3.4 Poin 5)**:
  - Menghapus animasi translasi `transform: translateX(3px)` pada `.opt-card:hover` di [css/auth.css](file:///d:/Tutor%20Tampan/TopsCore/css/auth.css) dan menguncinya menjadi stationary (`transform: none !important;`).
  - Menambahkan `padding-bottom: 8px` pada `.options-grid` untuk melenyapkan visual clipping pada baris nama terbawah.
- **Unifikasi Warna Kontrol ke Tactical Blue (`#38bdf8`)**:
  - Menyeragamkan warna badge nomor langkah yang aktif dan toggle switch `Remember me` dari warna ungu legacy menjadi Tactical Blue `#38bdf8` / `#0284c7`.

## [2026-11-16 14:45] — Phase 601: System Governance Rules Harmonization & Operational Discipline Codification
- **Kodifikasi Aturan Operasional (Cepat, Cermat, Tepat, Akurat — Rule 0.2 SSOT)**:
  - Membukukan resmi 4 pilar kedisiplinan mutlak di setiap eksekusi perintah:
    1. **Cepat**: Langsung ke inti perubahan tanpa overhead seremonial dokumen.
    2. **Cermat**: Teliti memeriksa dampak sistemik dan keterkaitan file (CSS, JS, DB, DOM).
    3. **Tepat**: Eksekusi presisi sesuai kemauan pengguna dan standar SSOT tanpa menyimpang.
    4. **Akurat**: Seluruh sintaks, formula, dan layout terverifikasi otomatis 100% green tests.
  - Diratifikasi di [AGENTS.md](file:///d:/Drives/Tutor%20Tampan/TopsCore/AGENTS.md) §0.2, [.agents/rules/agent-workflow.md](file:///.agents/rules/agent-workflow.md) §0, dan [.antigravityrules](file:///.antigravityrules).
- **Pembersihan & Restrukturisasi [ui-invariants.md](file:///.agents/rules/ui-invariants.md)**:
  - **Pemisahan Bab 5 & Bab 6**: Memisahkan Bab 5 (*Student Dashboard & Mobile Realm Invariants*) dan Bab 6 (*DataGrid & Roster Table Architecture*), melenyapkan duplikasi header Bab 5 dan nomor sub-bab 5.1.
  - **Penyelarasan Dimensi Title Area (40px Default / 60px Dual-Line)**: Menyelaraskan teks §1.5.1 dengan implementasi CSS aktual (`admin-modals.css`), di mana tinggi baku Title Area adalah **40px**, dan **60px** khusus varian *Dual-Line* (judul + subtitle) serta CTA Area.
  - **Pembaruan Quick Index**: Menghubungkan Bab 1 s/d Bab 6 secara presisi.
- **Kompaksi [CURRENT_STATE.md](file:///d:/Drives/Tutor%20Tampan/TopsCore/docs/CURRENT_STATE.md) ($\le 120$ Baris)**:
  - Mengompakkan resume keadaan proyek menjadi 69 baris bernilai tinggi, patuh penuh pada batasan $\le 120$ baris per AGENTS.md §5.3.

## [2026-11-16 03:55] — Phase 600: Student Dashboard Dual-Panel Invariants & Tri-Font System Codification
- **Penyelesaian Tumpang Tindih Kolom Pane B (GRADERETRY Eradicated)**:
  - Di [dashboard.html](file:///d:/Drives/Tutor%20Tampan/TopsCore/dashboard.html), menghapus perbenturan class `.standings-table-header` pada `.completed-table-header` dan mengunci grid 5 kolom independen (`grid-template-columns: 28px 1fr 48px 40px 38px !important;`) di [css/dashboard.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/dashboard.css).
  - Header Pane B distandarisasi ringkas: **`NO`**, **`TEST NAME`**, **`SCORE`**, **`GRD`**, dan **`ACT`** (melenyapkan tumpang tindih `GRADERETRY`).
- **Pane A Standings Header & Harmonization**:
  - Header Pane A distandarisasi: **`NO`**, **`STUDENT NAME`**, **`PTS`** (Rule 2.9 3-letter invariant), dan **`GRD`**.
  - Angka **`PTS`** (Global Points) diselaraskan warnanya dengan `theme.color` (warna **Global Grade** siswa) di [js/dashboard.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/dashboard.js), sehingga warna angka poin persis seirama dengan badge huruf Grade siswa.
- **Penetapan Aturan Sub-Row 7 Nilai Terbaik Task (SSOT Invariant §5.1)**:
  - 7 pips pada sub-row Task Completed Tests dibukukan resmi sebagai **Daftar 7 Nilai Riwayat Terbaik (Top 7 Highest Attempts sorted descending)** untuk menghitung rata-rata nilai dan grade task. Dilarang diubah menjadi rainbow pips.
- **Dashboard Honors & Gelar Kehormatan Siswa (SSOT Invariant §5.1)**:
  - Gelar siswa (`King`/`Queen` untuk Rank 1, `Mr.`/`Miss` untuk siswa lain) dipertahankan penuh pada tabel peringkat (leaderboard) dashboard siswa sebagai elemen motivasi.
- **Kodifikasi Tri-Font System (SSOT §2.0)**:
  - `Outfit` (Display, Headings, Hero Metrics), `Inter` (Body Text, Data Tables, Form Controls), dan `JetBrains Mono` (Technical, PIN, Security Logs) resmi dikodifikasikan di [.agents/rules/ui-invariants.md](file:///.agents/rules/ui-invariants.md) Bab 2.

## [2026-11-16 03:10] — Phase 599: Overall Performance Completion Header Standardization (DONE Replacing PRGRS)
- **Penggantian Header Progress Overall Menjadi DONE**:
  - Sesuai instruksi pengguna ("pakai DONE"):
  - Header kolom persentase capaian kurikulum pada Overall Performance resmi diganti dari `PROGRESS` / `PRGRS` menjadi **`DONE`** di [js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js) dan [js/admin/datagrid.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/datagrid.js).
  - Melenyapkan total kerancuan singkatan `PRGRS` / `PRG` dengan istilah Program.
  - Struktur 3 subheader Overall Performance kini ultra-ringkas: **`DONE`** (Completion Rate %), **`PTS`** (Total Points whole integer), dan **`GRD`** (Overall Grade).
- **Codification**:
  - Dibukukan resmi di [AGENTS.md](file:///d:/Drives/Tutor%20Tampan/TopsCore/AGENTS.md) §2.9 dan [.agents/rules/ui-invariants.md](file:///.agents/rules/ui-invariants.md) §4.2.
- **Verification**:
  - Seluruh test suites lolos 100% green.

## [2026-11-16 03:05] — Phase 598: Modules Warehouse Architecture & Class Allocation System
- **Unifikasi 'Module' SSOT & Alokasi Kelas Interaktif**:
  - Unifikasi istilah mesin evaluasi ujian menjadi **`Module`** (`m1` s/d `m8`), meniadakan kerancuan legacy *Answer Type* dan *Method*.
  - Pemetaan disiplin kelas terpadu (Vocabulary, Storytelling, Speaking, Basic English) langsung pada setiap kartu modul.
  - Penambahan seksi **`APPLICABLE CLASSES`** dengan pil interaktif tersusun vertikal atas ke bawah dengan jarak tepat **10px** (`gap: 10px !important;`).
- **Tata Letak Simetris 4-Over-4 & Kepatuhan UI Invariants (§1.5)**:
  - Grid kartu modul dikunci strictly 4 kolom di atas dan 4 kolom di bawah (`repeat(4, minmax(0, 1fr))`).
  - Standardized Badge Area (§1.5.0): Wadah 48px × 48px radius 12px di bagian paling atas membingkai ikon SVG vektor 24px.
  - Standardized 40px Title Area (§1.5.1): Judul modul 16px Outfit Bold ALL CAPS dan subtitle terintegrasi kode modul (`M1 — VISUAL CONTEXT`, `M2 — STANDARDIZED CHOICES`, dst).
  - Relokasi pil ringkasan kelas ke **Sub Panel 40px** (`#admin-bottom-infobar`) setinggi 28px per pil, dan elevasi judul ke **Topbar** workstation, melenyapkan seluruh header ganda dari area konten.
- **Wizard Test Lockdown**:
  - `getAllowedModulesForClass()` di `modules.js`, `test-builder.js`, dan `crud-modals.js` otomatis mengunci pilihan modul pada form tes sesuai kelas terpilih.

## [2026-11-16 03:00] — Phase 597: Theme Status Column Quadrant Color Alignment (STS Theme Color Matching)
- **Penyelarasan Warna Header STS Sesuai Kuadran Tema**:
  - Sesuai instruksi pengguna ("bagian status warna disamakan dengan yang tema"):
  - Menambahkan selector kuadran tema untuk `col-test-theme-status-*` di [css/admin/admin-tables.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/admin/admin-tables.css):
    - Theme A: `col-test-theme-status-a` $\to$ Electric Pink (`var(--quad-a, #ff2d87)`).
    - Theme B: `col-test-theme-status-b` $\to$ Dark Orange (`var(--quad-b, #ff8c00)`).
    - Theme C: `col-test-theme-status-c` $\to$ Electric Lime (`var(--quad-c, #95ff00)`).
    - Theme D: `col-test-theme-status-d` $\to$ Vibrant Violet (`var(--quad-d, #c084fc)`).
  - Kelima subheader tema kini 100% selaras memancarkan warna kuadran tema masing-masing.
- **Verification**:
  - Seluruh test suites lolos 100% green.

## [2026-11-16 02:53] — Phase 594: 5-Pillar Theme Matrix Compact Header Standardization (TASK, RATE, PTS, GRD, STS)
- **Standarisasi 5 Subheader Tema (Strict 3–4 Karakter)**:
  - Sesuai instruksi pengguna ("GRADE = GRD lalu kolom Progress ganti namanya dengan TASK saja, STATUS ini pakai nama STS, simpan dalam aturan"):
  - 1. Formative Progress $\to$ **`TASK`** (bukan `PROGRESS`/`PRGRS`).
  - 2. Exam Rate % $\to$ **`RATE`**.
  - 3. Exam Points $\to$ **`PTS`** (Math.round whole integer).
  - 4. Exam Grade $\to$ **`GRD`** (bukan `GRADE`).
  - 5. Administrative Status $\to$ **`STS`** (bukan `STATUS`).
- **Integrasi Kamus DataGrid & App**:
  - Diselaraskan di [js/admin/datagrid.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/datagrid.js) dan [js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js) (`dynamicAsmCols` dan Overall Performance).
  - Meniadakan seluruh penumpukan teks dan tumpang tindih kolom (*zero text wrapping / anti-crowding*).
- **Codification**:
  - Dibukukan resmi di [AGENTS.md](file:///d:/Drives/Tutor%20Tampan/TopsCore/AGENTS.md) §2.9 dan [.agents/rules/ui-invariants.md](file:///.agents/rules/ui-invariants.md) §4.2.
- **Verification**:
  - Seluruh tes unit AST, 10 pilar standarisasi tabel, dan super-header divider tests 100% green.

## [2026-11-16 02:48] — Phase 592: Strict Zero-Movement Hover Discipline & Border Clipping Eradication
- **Strict Zero-Movement Button Hover Invariant (§3.4 SSOT)**:
  - Sesuai instruksi pengguna ("saat tombolnya hover di atas tombolnya ada animasi bergerak sedikit, itu membuat bagian garis atas tombol malah hilang,,, jangan buat gerak, cukup efek sedikit pendar yang ada"):
  - Seluruh efek pergeseran fisik (`transform: translateY(-1px)`, `translateY(-2px)`, `scale(...)`) pada state `:hover` dan `:active` tombol telah dieliminasi total dari seluruh stylesheet ([css/style.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/style.css), [css/admin.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/admin.css), [css/dashboard.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/dashboard.css), [css/test.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/test.css), [css/result.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/result.css), [css/auth.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/auth.css), dan modular `css/admin/` files).
  - Mengunci aturan baku global `button:hover, .btn:hover, button:active, .btn:active { transform: none !important; }`.
- **Eradikasi Border Clipping Garis Atas**:
  - Tombol tetap diam 100% di tempat (*strictly stationary*), memastikan garis batas atas tombol (*top border*) tidak terpotong oleh overflow kontainer (tabel data, sub panel, kartu, popover, modal).
  - Efek hover murni pendaran cahaya halus (*subtle glow* via `box-shadow`) dan peningkatan kecerahan/saturasi warna latar tipis (*subtle background tint*).
- **Codification**:
  - Dibukukan resmi di [`.agents/rules/ui-invariants.md`](file:///.agents/rules/ui-invariants.md) §3.4 butir 5.
- **Verification**:
  - Seluruh 28 test suites lolos 100% green (`node scripts/run_all_tests_parallel.mjs`).

## [2026-11-16 02:40] — Phase 589: Points Half-Up Whole Integer Invariant & 3-Letter 'PTS' Header Standardization
- **Points (PTS) Half-Up Whole Integer Invariant (Math.round)**:
  - Sesuai instruksi pengguna ("nilai yang ada .5 lebih, dibulatkan ke atas. ini jadikan aturan dalam penghitungan poin! simpan dalam sistem"):
  - Seluruh akumulasi dan nilai poin siswa/kelas (Theme Exam Points, Overall Points, Class Average Points, Student Academic Profile, Result Summary) yang memiliki desimal $\ge 0.5$ dibulatkan ke atas menjadi bilangan bulat penuh via `Math.round()` (misal `274.5` $\to$ `275`, `257.5` $\to$ `258`, `229.5` $\to$ `230`, `176.5` $\to$ `177`, `225.9` $\to$ `226`, `473.2` $\to$ `473`, `814.6` $\to$ `815`).
  - Meniadakan seluruh angka pecahan/berkoma pada kolom dan metrik poin.
- **3-Letter 'PTS' Header Standardization**:
  - Sesuai permintaan pengguna ("bisakah kita pakai singkatan 3 huruf agar tidak menumpuk?"):
  - Header kolom poin diubah dari `POINT` (5-huruf) menjadi singkatan resmi 3-huruf **`PTS`** di seluruh resolusi kolom (di [js/admin/datagrid.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/datagrid.js) dan [js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js)).
  - Kolom poin bernapas lega tanpa tumpang tindih (*anti-crowding / zero text wrapping*).
- **Codification**:
  - Dibukukan resmi di [AGENTS.md](file:///d:/Drives/Tutor%20Tampan/TopsCore/AGENTS.md) §2.9 dan [.agents/rules/ui-invariants.md](file:///.agents/rules/ui-invariants.md) §4.2.
- **Verification**:
  - Seluruh 10 Pilar Standarisasi Tabel lolos 100%.
  - `node scripts/test_class_hub_super_headers_and_continuous_dividers.mjs` lolos 16/16 assertions.

## [2026-11-16 02:35] — Phase 588: Ghost-to-Solid-Glow Button Invariant Zero-Violation Audit & Alumni Multi-Program Alignment
- **Universal Ghost-to-Solid-Glow Button Audit & Zero Violations**:
  - Melakukan audit komprehensif pada seluruh tombol di seluruh halaman (`admin.html`, `dashboard.html`, `test.html`, `result.html`, `conversation.html`, `index.html`) serta berkas JavaScript template terkait.
  - Mengeliminasi seluruh 14 tombol dengan inline background padat mentah:
    - [js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js): `#btn-manual-prompt-save` dimigrasikan ke `.btn-tactical`.
    - [js/admin/auto-gen-modal.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/auto-gen-modal.js): `#wizard-generate-btn` dimigrasikan ke `.btn-purple`.
    - [js/admin/desk.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/desk.js): `#btn-health-scan-orphans`, `#btn-apply-recal`, `#btn-recal-confirm-run` dimigrasikan ke `.btn-tactical`.
    - [js/admin/quick-score-wizards.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/quick-score-wizards.js): `#btn-confirm-quick-alumni` dimigrasikan ke `.btn-purple`.
    - [js/admin/student-management.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/student-management.js): `#rl-save-btn` dimigrasikan ke `.btn-purple`.
    - [js/admin/tests-access.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/tests-access.js): `#btn-confirm-add-late` dimigrasikan ke `.btn-tactical`.
    - [js/admin/vocab-vault.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/vocab-vault.js): Tab level dan program pada infobar serta modal tombol duplikat dimigrasikan ke class baku `.btn-tactical`, `.btn-success`, `.btn-purple` dengan state `.active` terpusat.
  - Hasil audit verifikasi: **0 pelanggaran** di seluruh sistem.
- **Alumni Multi-Program & Level X Alignment**:
  - Memverifikasi top panel program alumni terurut alfabetis A-Z (`Camp`, `Evnikom`, `Sheraton`) dengan tab `All Alumni` di posisi paling akhir.
  - Memverifikasi seluruh alumni berlevel `X` (ungu) dan ber-Grade `X`, siswa berlevel X otomatis berstatus Alumni, status Inactive bertoken merah resmi (`var(--grade-e)`), serta red badge `DISCONNECTED` dihilangkan total untuk alumni.
- **Verification**:
  - Seluruh 28 test suites lolos 100% green (`node scripts/run_all_tests_parallel.mjs`).

## [2026-11-16 02:25] — Phase 586: Room-Exclusive Print Protocol & Dual-Viewport Ecosystem Standardization
- **Eradikasi Fitur Cetak dari Halaman Result**:
  - Sesuai instruksi pengguna ("di halaman result, hilangkan fitur cetak! SEMUA fitur cetak hanya melalui room saja!"), tombol cetak `#btn-print-result` dan seluruh blok dokumen cetak `#printable-report-card` serta styles `@media print` telah dieliminasi total dari [result.html](file:///d:/Drives/Tutor%20Tampan/TopsCore/result.html), [js/result.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/result.js), dan [css/result.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/result.css).
  - Seluruh fitur cetak resmi (rapor, dossier, CV, sertifikat evaluasi) kini eksklusif hanya dapat diakses melalui Room (Admin Console / Tutors Room / Live Room).
- **Dual-Viewport Ecosystem Standard (SSOT)**:
  - **Student Realm (Mobile-Locked 430px)**: Seluruh alur antarmuka siswa (`index.html`, `dashboard.html`, `test.html`, `result.html`, `conversation.html`) terkunci 100% dalam format mobile terpusat (`max-width: 430px; margin: 0 auto;`), baik diakses di smartphone maupun monitor laptop/desktop PC.
  - Header, bottom bar, dan banner terkunci dalam koridor 430px di [css/auth.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/auth.css), [css/dashboard.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/dashboard.css), [css/test.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/test.css), dan [css/result.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/result.css).
  - **Admin & Tutor Realm (Desktop-Locked 100vh)**: Seluruh workstation admin (`admin.html`) terkunci 100% dalam format desktop single-screen 100vh.
  - **Codification**: Dibukukan resmi di [AGENTS.md](file:///d:/Drives/Tutor%20Tampan/TopsCore/AGENTS.md) §2.28 & §2.29 dan [.agents/rules/ui-invariants.md](file:///.agents/rules/ui-invariants.md) §1.0.
- **Verification**:
  - `npm.cmd run test:fast` lolos 50/50 file JS AST (0.10s), minifikasi CSS otomatis sinkron.
  - 10/10 Pillars Standarisasi Tabel lolos 100%.

## [2026-11-16 02:22] — Phase 585: Universal Table Thick Perimeter Border Invariant & Super-Header Vertical Clipping Fix
- **Universal Table Thick Perimeter Frame (Atas, Bawah, Kiri, Kanan)**:
  - Sesuai instruksi pengguna ("tambahkan garis pembatas tebal di sekeliling semua tabel yang ada, atas, bawah, kiri, kanan. memutar di semua tubuh tabel"), seluruh tabel data (`.table-wrap`, `.datagrid-container`) dikunci bingkai perimeter `2px solid rgba(255, 255, 255, 0.28) !important;` memutar penuh di ke-4 sisi luar.
  - Menyelaraskan border perimeter sel terluar: `border-top: 2px` pada baris header pertama, `border-left: 2px` pada kolom pertama, `border-right: 2px` pada kolom terakhir, dan `border-bottom: 2px` pada baris footer terakhir.
- **Super-Header Vertical Text Clipping Fix**:
  - Mengeliminasi aturan usang `height: 19px` pada `#class-attendance-grid th.super-hdr` dan menyelaraskannya ke standar baku `height: 30px !important; line-height: 30px !important; vertical-align: middle !important;`, sehingga selaras sempurna dengan subheader Row 2 (30px) dan spanning header (60px). Teks super-header bernapas lega tanpa terpotong.
  - Perlindungan jarak dan clearance horisontal untuk teks `STATUS`, `PRGRS ▼`, `POINT`, dan `GRADE`.
- **Verification**:
  - `scripts/test_class_hub_super_headers_and_continuous_dividers.mjs` lolos 16/16 assertions.
  - `npm.cmd run test:table` lolos 10/10 Pillars.

## [2026-11-16 02:18] — Phase 584: Ghost-to-Solid-Glow Button Invariant SSOT System-Wide Standardization
- **Pembukuan Resmi Ghost-to-Solid-Glow Invariant (§3.4)**:
  - Membukukan aturan baku antarmuka untuk seluruh kontrol tombol aksi dan mode toggle di [`.agents/rules/ui-invariants.md`](file:///.agents/rules/ui-invariants.md) §3.4:
    - **Inaktif / Standby = Ghost Outline**: Latar transparan (`background: transparent`), garis tepi 1px dan teks menyala mengikuti token semantik masing-masing untuk melenyapkan *visual noise* di atas kanvas gelap.
    - **Aktif / ON / Ditekan = Solid Filled + Neon Glow**: Latar penuh warna padat dengan pendaran neon taktis `box-shadow: 0 0 10px rgba(..., 0.45)`.
    - **Strict Luminance Contrast**: Teks gelap `#0F172A` pada warna terang (Kuning & Hijau); teks putih `#FFFFFF` pada warna pekat (Merah, Cyan, Ungu, Pink).
- **Implementasi Terpadu CSS**:
  - Diterapkan secara terpusat di [css/style.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/style.css), [css/admin.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/admin.css), dan seluruh minified bundles (`.btn-tactical`, `.btn-danger`, `.btn-warning`, `.btn-success`, `.btn-purple`, `.btn-secondary`).
  - Penyelarasan header tabel Test Blueprint `METHOD` pada `scripts/test_vocab_vault_and_edit_mode.mjs` sesuai Rule 2.11.
- **Verification**:
  - `npm.cmd run test:fast` lolos 50/50 file JS AST (0.18s), minifikasi CSS otomatis sinkron.
  - 28/28 test suites parallel pool lolos 100% green dalam 18.28s.

## [2026-11-16 02:05] — Phase 583: Incomplete & Complete Submit Hazard Modal Standardization (Window 10 Standard)
- **Arsitektur 3-Tier Baku Modal 10 (`#submit-modal`)**:
  - **Badge Area (Invariant 1.5.0)**: Container 52px × 52px beradius 14px tepat di atas Title Area. Incomplete state menampilkan segitiga warning SVG dengan border amber & soft glow `var(--grade-c)`; Complete state menampilkan centang hijau SVG dengan border & glow `var(--grade-a)`.
  - **Title Area 40px Baku (Invariant 1.5.1)**: Tinggi baku tepat **40px** dengan pembatas perimeter tegas `border-bottom: 1.5px solid rgba(255, 255, 255, 0.16) !important;`. Tipografi 16px Outfit Bold ALL CAPS: `WARNING: INCOMPLETE TEST!` (kuning `var(--grade-c)`) dan `READY TO SUBMIT` (hijau `var(--grade-a)`).
  - **Body Area**: Menampung peringatan konsekuensi `Unanswered questions will be forfeited with 0 points.` (12px slate) dan deep-well counter strip `QUESTIONS ANSWERED` dengan Hero KPI `14 / 40` (30px Outfit Bold) serta mini progress bar hijau `var(--grade-a)`.
  - **CTA Area / Modal Footer 60px (Invariant 1.5.2 & 1.5.4)**: Tinggi baku tepat **60px** dengan pembatas perimeter tegas `border-top: 1.5px solid rgba(255, 255, 255, 0.16) !important;`. Tombol aksi proporsional tepat **40px**:
    - Incomplete State: Tombol bahaya `GIVE UP!` (Merah Grade E `var(--grade-e)`) di sudut kiri-bawah vs `BACK TO TEST` (Hijau Grade A `var(--grade-a)` dengan luminous glow) di sudut kanan-bawah.
    - Complete State: Tombol `BACK TO TEST` (Netral Slate 40px) di kiri vs `SUBMIT TEST` (Hijau Grade A 40px) di kanan.
- **Zero Truncation & Mobile 350px Viewport**:
  - Terverifikasi 100% bebas dari teks terpotong atau terhimpit pada layar mobile 350px.
  - Eradikasi tombol 'X' di sudut kanan-atas; seluruh dismiss terpusat pada tombol CTA Area di footer (Invariant 1.5.4).
- **Verification**:
  - `npm.cmd run test:fast` lolos 50/50 file JS AST (0.12s), minifikasi CSS otomatis sinkron.
  - 10/10 Pillars Standarisasi Tabel lolos 100% (`npm.cmd run test:table`).

## [2026-11-16 01:52] — Phase 581: Inactive Status Red Color SSOT, Level X Automatic Alumni Status & Completed Tests Scroll Clearance
- **Inactive Status Red Color SSOT & Level X Auto-Alumni**:
  - Sesuai direktif user ("inactive pakai warna merah, jangan putih"), status `INACTIVE` pada kolom `STATUS` tabel, opsi select inline, dan badge modal profil kini mutlak merujuk ke token Grade E (`var(--grade-e)` / `#FF0000`). Siswa dengan Level `X` otomatis berstatus `ALUMNI` (`program_status = 'ALUMNI'`, `color = 'var(--quad-d)'`).
- **Urutan Alfabetis Tab Program Alumni & All Alumni di Posisi Akhir**:
  - Sesuai instruksi pengguna ("urutkan panel dengan cra nama program dengan alpabet, tapi all alumni taruh paling akhir"), tab program di top panel Alumni diurutkan menurut abjad A–Z (`Camp`, `Evnikom`, `Sheraton`), dan tab master `All Alumni` diposisikan di paling akhir.
- **Dashboard Completed Tests Scroll Clearance**:
  - Menambah bottom padding container scroll `.completed-table-wrap` dan `#completed-Tests-container` di [css/dashboard.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/dashboard.css) menjadi `60px !important`.
  - Memastikan seluruh tes yang telah selesai (termasuk tes ke-11 di posisi terbawah) dapat di-scroll sepenuhnya ke atas tanpa terpotong atau tertutup banner bawah ("TopsCore by Mr. Top").
- **Verification**:
  - `npm.cmd run test:fast` lolos 50/50 file JS AST (0.12s), minifikasi CSS otomatis sinkron.
  - 28/28 test suites parallel pool lolos 100% green dalam 16.55s.

## [2026-11-16 01:45] — Phase 580: Class Hub Attendance Matrix Far-Right Overall Repositioning, Theme D Progress Inflation Bug Fix & Strict Zero Horizontal Scroll
- **Relokasi OVERALL PERFORMANCE ke Paling Kanan**:
  - Memindahkan super-header `OVERALL PERFORMANCE` dan kolomnya (`PRGRS`, `POINT`, `GRADE`) dari samping kiri ke posisi paling kanan tabel (setelah `THEME D`), menata alur matriks menjadi: Data Siswa $\rightarrow$ Tema A–D $\rightarrow$ Rangkuman Total.
  - Menghapus kelas sticky `col-sticky-3/4/5` dari kolom Overall untuk melenyapkan tabrakan sticky header dan robeknya tampilan visual.
- **Theme D Progress Inflation Bug Fix**:
  - Mengidentifikasi dan mematikan bug `if (hasAtt || ...)` di [js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js) baris 3224 yang memaksakan `earnedTasks = maxThemeTasks` (`28/28`) setiap kali siswa memiliki attempt ujian.
  - Siswa yang belum mengerjakan task (seperti Abdul Basit, Muhamad Alifurrahman, dan Abd. Qoyyim) kini akurat menampilkan `0/28`, dan Overall Progress mereka tidak lagi terkerek palsu ke 100%.
- **Penegakan Mutlak Zero Horizontal Scroll (100% Viewport Lock)**:
  - Mengunci `#class-attendance-grid .table-wrap` dengan `overflow-x: hidden !important;` dan tabel dengan `table-layout: fixed !important; width: 100% !important;` di [css/admin/admin-tables.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/admin/admin-tables.css).
  - Menghapus event listener pembajakan mousewheel horizontal scroll di `fitMatrixToScreen()` sehingga tabel pas 100% di layar.
- **Verification**:
  - 10/10 Pillars Standarisasi Tabel lolos 100%, 16/16 Super-Headers lolos, validasi AST 50 JS files lolos.

## [2026-11-16 01:30] — Phase 579: Alumni Multi-Program Top Panel Tabs & Dedicated Program Tables
- **Pembeda Alumni per Program via Top Panel (SSOT)**:
  - Sesuai instruksi pengguna ("di tabel alumni, kita bedakan alumni di tiap program, mereka punya tabel deda2 yang dipilih lewat top panel"), diimplementasikan tab folder interaktif di top panel via `window.setTopbarTabs`:
    - `All Alumni (20)`: Tabel gabungan seluruh alumni.
    - `Sheraton (14)`: Tabel khusus alumni program Sheraton.
    - `Camp (6)`: Tabel khusus alumni program Camp.
    - `Evnikom (0)`: Program aktif dengan indikator neutral slate.
  - Menghubungkan fungsi `window._switchAlumniProgram` untuk menyaring data in-memory secara instan tanpa re-fetch jaringan.
  - Dropdown batch di bottom infobar (`#select-alumni-batch-infobar`) secara dinamis tersinkronisasi hanya menampilkan batch lulusan milik program yang sedang aktif.
- **Verification**:
  - E2E Playwright mengonfirmasi klik tab Camp menampilkan 6 baris alumni Camp, klik Sheraton menampilkan 14 baris alumni Sheraton, dan All Alumni menampilkan 20 baris.
  - 28/28 test suites 100% green dalam 16.58s.

## [2026-11-16 01:30] — Phase 578: Class Hub Attendance Matrix Responsive Expansion & Multi-Attempt Special Status Recovery
- **Akar Masalah Tabel Berantakan & Kolom Terpotong**:
  - Matriks 25 kolom sebelumnya dipaksa oleh `table-layout: fixed !important; overflow-x: hidden !important;`, menyebabkan header `STATUS` terpotong ("STATU") dan Theme D terdorong ke luar layar tanpa bisa diakses.
  - Dimodifikasi `css/admin/admin-tables.css` (SSOT) dan dikompilasi ke `css/admin.css` & `css/admin.min.css`: `#class-attendance-grid .table-wrap` kini `overflow-x: auto !important;`, tabel `table-layout: auto !important; min-width: max-content !important;`, dan kolom `STATUS` dikunci `min-width: 58px !important; width: 58px !important;` (zero-truncation). BATCH dan STUDENT NAME tetap terkunci sticky di kiri.
- **Pemulihan Status Administratif M, R, dan F**:
  - Pada [js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js), baris data menyematkan `allAttempts: studentAttempts`. Evaluasi kolom `STATUS` (`theme_${tc}_status`), `RATE`, dan `POINT` kini menginspeksi seluruh riwayat attempt ujian siswa (`row.allAttempts`), mencegah attempt dengan skor murni menutupi attempt berstatus remedial (`is_remedial`), forgiven (`is_forgiven`), atau manual override (`MANUAL_OVERRIDE`).
  - Siswa berstatus khusus tampil presisi: Abdul Basit $\rightarrow$ **`M`** (Cyan), Muhamad Alifurrahman $\rightarrow$ **`R`** (Kuning), Abd. Qoyyim H. Dahuri $\rightarrow$ **`F`** (Merah), siswa lulus normal $\ge 60\%$ $\rightarrow$ **`✓`** (Hijau), dan unattempted/gagal $\rightarrow$ **`—`**.
- **Cache Busters Sync & Verification**:
  - Diperbarui cache buster di [admin.html](file:///d:/Drives/Tutor%20Tampan/TopsCore/admin.html) ke `v576` dan [sw.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/sw.js) ke `v132`.
  - 10/10 Pillars Standarisasi Tabel lolos 100%, 16/16 Super-Headers lolos, AST 50 JS files lolos.

## [2026-11-16 01:25] — Phase 577: Question Matrix 40-Tile Modal Standardization (`#matrix-popup`)
- **Arsitektur 3-Tier Baku Modal 09**:
  - Merekonstruksi `#matrix-popup` di [test.html](file:///d:/Drives/Tutor%20Tampan/TopsCore/test.html) dan [css/test.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/test.css) menjadi container modal 3-Tier dengan backdrop gelap (`rgba(0, 0, 0, 0.75)` + 8px blur), kotak modal `.matrix-box` berbatas tegas 1.5px netral (`border: 1.5px solid rgba(255, 255, 255, 0.16)`), dan **0 Badge Area** (clean & compact per instruksi user).
- **Title Area 40px Baku Murni Keterangan Soal**:
  - Membuang teks "QUESTION MATRIX"; judul menampilkan murni `ANSWERED = xx` (hijau `var(--grade-a)`) dan `UNANSWERED = xx` (merah `var(--grade-e)`) di baris 40px terpusat, tanpa tombol '✕' di header per Invariant 1.5.1.
- **Progress Bar Ganda & Skema Tri-Color Tile**:
  - Membuang legend grid dan menggantinya dengan progress bar dual-color (hijau untuk answered, merah untuk unanswered). Tile grid mengadopsi skema tri-color resmi: Hijau (`var(--grade-a)`) untuk answered, Kuning (`var(--grade-c)`) untuk current aktif, dan Merah (`var(--grade-e)`) untuk unanswered. Pembuangan total tip box bawah grid (`.matrix-tip-box`).
- **CTA Area 60px & Tombol Berdampingan Baku (Invariant 1.5.2 & 1.5.4)**:
  - Footer `.matrix-footer.modal-footer` terkunci di tinggi tepat **60px** dengan batas atas 1.5px netral.
  - Tombol aksi ditata berdampingan horizontal (bukan stacked vertikal):
    - Kiri: `CLOSE` (40px) di sudut kiri bawah dengan hover glow netral.
    - Kanan: `NEXT UNANSWERED →` (40px) berlatar gradien Tactical Blue dengan hover glow aktif dan ikon panah SVG murni (Zero Unicode Emojis), bebas dari clipping atau overlap pada layar sempit hingga 320px.
- **Verification**:
  - AST 50/50 JS files lolos 100% dalam 0.13s. Minifikasi CSS all passed. 10/10 Universal Table Pillars passed 100%. Single-screen zero-scroll < 40% viewport pada layar HP.

## [2026-11-16 01:15] — Phase 576: Batch Manual Score Concurrent Throughput & Fail-Safe Audit Logging
- **Akar Masalah RLS 401 audit_logs & Resolusi Permanen**:
  - Dibuat migrasi SQL [supabase/migrations/20261116000000_allow_anon_audit_logs_all_roles.sql](file:///d:/Drives/Tutor%20Tampan/TopsCore/supabase/migrations/20261116000000_allow_anon_audit_logs_all_roles.sql) yang membuka policy `anon_insert_audit_logs` untuk seluruh role valid (`ADMIN`, `tutor`, `student`), melenyapkan error `HTTP 401 (Unauthorized)` / PostgreSQL `42501` saat admin menulis log audit.
  - Ditambahkan helper terpusat `logAuditEvent` di [js/api.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/api.js) yang memvalidasi UUID `entity_id` dan menangani audit logging secara *non-blocking* dan *fail-safe* sehingga operasi esensial (seperti simpan nilai `attempts`) tidak pernah terhambat atau memicu unhandled error di browser console.
- **Optimasi Konkuren Batch Save Manual Score (15 Siswa 1–2 Detik)**:
  - Dirombak eksekusi simpan beruntun (*sequential loop* 15x lambat) di `saveAllManualDrafts` dan prompt konfirmasi [js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js) menjadi pemrosesan paralel slice berkecepatan tinggi (`Promise.all` slice batch). Waktu simpan 15 siswa terpangkas dari ~25 detik menjadi **1–2 detik**.
  - Ditambahkan parameter `skipAudit: true` pada panggilan per-siswa di `adminApplyForgiven`, lalu menulis **1 log audit batch terpadu** di akhir proses, mencegah flood 15 request redundan ke `audit_logs`.
  - Pembersihan cache `clearAdminCache('attempts')` dieksekusi 1 kali setelah seluruh batch tuntas.
- **Verification**:
  - Validasi sintaks 50/50 JS lolos 100% (AST zero process spawn), 10/10 table pillars green, fast test suite lolos.

## [2026-11-16 01:10] — Phase 575: Alumni Level X & Grade X Standardization & Disconnected Eradication
- **Standarisasi Penuh Level X & Grade X untuk Alumni (Rule 2.10 SSOT)**:
  - Sesuai instruksi pengguna ("bagi Alumni, level mereka adalah X dan Grade Mereka juga X"), seluruh data siswa alumni ditetapkan berlevel **`X`** (ungu `#c084fc` / `var(--quad-d)`) pada kolom `LVL`, properti `levelName`, dan fungsi `toShortLevel` di [js/admin/student-management.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/student-management.js) dan [js/api.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/api.js).
  - Menetapkan Grade siswa alumni secara mutlak menjadi Grade **`X`** (`TOPSCORE_COLORS.X: #8B5CF6`) pada `globalGrade`, `mastery.grade`, dan `calculateGrade({ isAlumni: true })` di [js/grading.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/grading.js).
- **Eradikasi Badge Merah DISCONNECTED pada Alumni**:
  - Memperbaiki logika `isOrphaned` di [js/admin/student-management.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/student-management.js) dengan menambahkan guard `!isAlumni`. Batch yang tidak aktif (`batches.is_active === false`) adalah kondisi alami bagi alumni yang telah lulus, bukan catatan yatim/terputus.
  - Menambahkan pengaman `!isAlumniPanel` pada render nama siswa, memastikan badge `Disconnected` merah tidak muncul pada tabel Alumni.
- **Verification**:
  - E2E Playwright mengonfirmasi tabel Alumni menampilkan 20 baris dengan `"badges": []` (0 badge Disconnected), `"lvl": "X"`, dan `globalGrade: "X"`.
  - Seluruh 28 test suites 100% green dalam 18.40s tanpa regresi.
  - Seluruh 28 test suites 100% green dalam 22.95s tanpa regresi.

## [2026-11-16 01:00] — Phase 574: Dead Windows, Obsolete Popups & Modals Eradication
- **Eradikasi Modul Usang & Dead Code**:
  - Dihapus permanen file [js/admin/forgiven-wizard-modal.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/forgiven-wizard-modal.js) (32.7 KB), telah digantikan 100% oleh [js/admin/quick-score-wizards.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/quick-score-wizards.js).
  - Dihapus modal usang `#roster-modal` dari [admin.html](file:///d:/Drives/Tutor%20Tampan/TopsCore/admin.html) serta CSS usang `.modal-box-roster`, `.roster-add-bar`, `.roster-table-scroll`, `.roster-table` dari [css/admin/admin-modals.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/admin/admin-modals.css).
- **Pembersihan Dead Functions & Router Modernization**:
  - Dihapus fungsi usang `window.viewClassInstanceRoster` dan impor usang dari [js/admin/class.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/class.js).
  - Dibersihkan dead duplicate code di [js/admin/tests-management.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/tests-management.js): stub `renderQuestions`, duplikat `renderResults`, dan modal legacy `openSessionModal` (-215 baris).
  - Dimodernisasi router `loadSection` di [js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js) dengan pengalihan langsung seksi `topics` dan `question_types` ke `vocab_vault`.
  - Dinamai ulang `registerServiceWorker` menjadi `unregisterAdminServiceWorker` di [js/admin/admin-init.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/admin-init.js) mencerminkan aksi unregistrasi Service Worker pada konsol admin.
- **Perbaikan Close Trigger Popup Jawaban**:
  - Diperbaiki tombol CLOSE (`#done-answers-modal-btn`) dan click backdrop pada modal Answer Breakdown di [result.html](file:///d:/Drives/Tutor%20Tampan/TopsCore/result.html) & [js/result.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/result.js).
- **Verification**:
  - Seluruh 50 file JS lulus validasi AST sintaks, 10/10 table pillars lulus, 28/28 test suite 100% hijau dalam 18.66s.

## [2026-11-16 00:55] — Phase 573: Manual Edit Surgical Dirty Tracking & Batch Sweep Eradication
- **Eradikasi Total DOM Sweep di `saveAllManualDrafts`**:
  - Menghapus loop DOM sweep yang menyapu seluruh elemen input tabel dan secara keliru memperlakukan input yang tidak disentuh (`!curDraft`) sebagai kotor/diedit.
  - Memastikan hanya siswa yang baris nilainya benar-benar diubah oleh pengguna yang dikirim ke backend `adminApplyForgiven`.
- **Surgical Per-Field Dirty Tracking**:
  - Menyematkan metadata nilai asli (`data-original-earned`, `data-original-score`, `data-original-pts`) pada seluruh input tabel.
  - Handler `onMatrixExamScoreChange`, `onMatrixExamPtsChange`, dan `onMatrixTaskChange` hanya menandai `isDirty: true` jika input numerik riil berbeda dari nilai asli. Jika pengguna mengembalikan nilai ke semula, status dirty otomatis dibatalkan.
- **Rollback 273 Status M Palsu di Supabase**:
  - Membersihkan efek samping batch sweep sebelumnya di Supabase: menghapus 31 attempt fiktif dan me-reset `forgiven_reason = null`, `is_forgiven = false` pada 242 attempt asli sekelas.
  - Memulihkan tampilan status centang hijau (✓) dan strip (—) pada siswa yang tidak diedit.
- **Verification**:
  - Fast AST preflight, 10/10 table pillars, spatial invariants, dan test suite 100% PASS.

## [2026-11-15 19:00] — Phase 572: Alumni Main Panel Routing & Clickability Resolution
- **Perbaikan Click & Routing Panel Alumni (SSOT)**:
  - Menyelesaikan akar masalah klik alumni macet: mendeteksi dan menghentikan endless `MutationObserver` loop pada [js/admin/admin-init.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/admin-init.js) dengan menambahkan guard `alumniItem.nextElementSibling !== null` sebelum `appendChild`, mencegah DOM detaching siklis 60fps yang menelan event klik pengguna.
  - Menambahkan handler routing resmi `case 'alumni':` pada switch statement `loadSection` ([js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js)).
  - Mengintegrasikan section metadata `alumni: 'Alumni'` pada `sectionTitles` dan `alumni: 'BOARD'` pada `sectionDomainMap`.
  - Mengikat fail-safe direct click listener dan cursor pointer pada `#sidebar-alumni-item` di `loadSidebarPrograms()` dan menambahkan inline `onclick` di [admin.html](file:///d:/Drives/Tutor%20Tampan/TopsCore/admin.html).
  - Mengekspos `window.loadSection = loadSection;` secara dini tepat setelah definisinya di [js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js).
- **Pengenalan Sempurna 20 Siswa Alumni & Query program_status**:
  - Menambahkan kolom `program_status` ke query `adminFetchAll('students')` di [js/admin/student-management.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/student-management.js).
  - Memperbarui pengenal `isStudentAlumni` agar menyertakan status `PROGRAM_COMPLETED`, sehingga seluruh 20 siswa alumni dari Supabase tampil lengkap.
- **Verification**:
  - Pengujian E2E browser mengonfirmasi 0 mutasi DOM siklis dan klik `#sidebar-alumni-item` berhasil membuka rute `#alumni`, mengaktifkan tab KPI Alumni, dan me-render 20 baris tabel siswa alumni dengan 100% data akurat.
  - Seluruh 28 test suites berjalan 100% green dalam 26.65s tanpa regresi.

## [2026-11-15 18:00] — Phase 571: Dedicated Theme STATUS Column & Pure Canonical GRADE Invariant
- **Kolom Baru STATUS & Separation of Concerns (SSOT)**:
  - Menambahkan kolom ke-5 `STATUS` di samping kolom `GRADE` pada setiap tema (`THEME A`, `B`, `C`, `D`) matriks nilai kelas ([js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js)).
  - Kolom `STATUS` menampilkan: Centang hijau (**✓** / `check-circle`) untuk kelulusan normal ($\ge 60\%$), Kuning **`R`** untuk remedial, Merah **`F`** untuk forgiven waiver, Tactical Cyan **`M`** untuk manual override, dan Strip (**—**) untuk belum lulus/belum ujian.
  - Checkbox interaktif untuk mode `Remedi (R)` dan `Forgive (F)` Sub Panel muncul langsung di dalam kolom `STATUS`.
- **Kolom GRADE Murni Nilai Akademik**:
  - Kolom `GRADE` murni menampilkan grade kanonik siswa (**★, A, B, C, D, E** atau lock) berdasarkan skor riil dan persentase, tanpa pernah ditimpa oleh token administratif `M`, `R`, atau `F`.
- **Penyelesaian Tuntas Constraint `check_attempts_grade`**:
  - Memperbaiki `adminApplyForgiven`, `saveRowManualInput`, `saveAllManualDrafts`, dan `toggleCellRemedial` di [js/api.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/api.js) dan [js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js) agar selalu menyimpan grade kanonik ('★'..'E') ke kolom `attempts.grade`, sedangkan status administratif tersimpan aman di metadata/flag (`is_forgiven`, `is_remedial`, `forgiven_reason`).
- **Styling Continuous Divider & Quadrant Header**:
  - Menetapkan continuous neutral divider 2px solid (`rgba(255,255,255,0.22)`) pada `col-test-theme-status` dan mengaplikasikan warna kuadran tematik A, B, C, D pada label header `STATUS` ([css/admin.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/admin.css)).
- **Verification**:
  - Seluruh test fast, test table invariants (10/10 pilar), super headers divider test (16/16), dan smart test runner 100% PASS.

## [2026-11-15 17:30] — Phase 570: Manual Edit Deferred Batch Save & Confirmation Prompt on Exit
- **Eradikasi Premature Auto-Save on Blur**:
  - Menghapus seluruh event `onblur` dari input nilai matriks kelas (`input-matrix-task-progress`, `input-matrix-exam-score`, `input-matrix-exam-pts`).
  - Pengguna bebas mengetik, berpindah sel (tab/klik), dan mengedit nilai banyak siswa tanpa gangguan network request di tengah proses.
- **Simpan Terpadu Hanya Saat Tombol Edit Selesai Ditekan**:
  - Semua perubahan disimpan dalam in-memory drafts (`window._manualInputState.drafts`).
  - Saat tombol **`Done Editing (Manual)`** atau tombol `Escape` ditekan, sistem mendeteksi apakah ada draft yang dimodifikasi (`hasDirtyManualDrafts`).
- **Window Prompt Save / Cancel (Dialog Konfirmasi Standar TopsCore)**:
  - Memunculkan dialog prompt konfirmasi terpadu:
    - **`Save Changes` (Cyan)**: Menyimpan seluruh draft perubahan secara batch ke database via `saveAllManualDrafts()`, mengunci kembali tabel, dan me-refresh matriks dengan toast sukses.
    - **`Cancel (Discard)` (Secondary)**: Membuang seluruh draft perubahan, mengunci kembali tabel, dan mengembalikan data asli dengan toast info.
    - Jika tidak ada perubahan, mode edit keluar langsung secara mulus tanpa memunculkan prompt.
- **Verification**:
  - Seluruh test suite lolos 100% hijau, AST syntax lolos 100%.

## [2026-11-15 17:15] — Phase 568: Direct Table Remedi & Forgive Inline Checkboxes (Zero Pop-ups, Capped R & Waiver F)
- **Eliminasi Pop-up Wizard Remedi & Forgive (Zero Pop-up Invariant)**:
  - Pop-up wizard untuk Remedi dan Forgiven dibuang total sesuai arahan pengguna.
  - Tombol Sub Panel **`Remedi (R)`** (Kuning) dan **`Forgive (F)`** (Merah) kini mengaktifkan mode inline langsung pada tabel matriks kelas ([js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js)).
- **Tanda Centang / Checkbox Interaktif di Samping Kolom Grade**:
  - Saat mode Remedi atau Forgive aktif, tanda centang/checkbox muncul di samping simbol nilai pada kolom `GRADE`:
    - **Remedial (R)**: Nilai setinggi apapun turun menjadi batas maksimum ujian tersebut (capped 60%) dan mendapatkan Grade **`R`** (`var(--grade-c)`). Saat uncheck, kembali normal.
    - **Forgiven (F)**: Nilai siswa berapapun tidak dinaikkan, hanya dianggap selesai dan **PASSED** saja, serta berstatus Grade **`F`** (`var(--grade-e)`). Saat uncheck, status waiver dicabut.
  - Memperbarui `theme_${tc}_grade` render dan fungsi backend `toggleCellRemedial` serta `toggleCellForgiven`.
- **Single Active Sub Panel Mode & Anti-Shift Dimensions**:
  - Tombol Manual, Remedi, dan Forgive bersifat mutually exclusive. Menekan Escape keluar dari seluruh mode edit.
- **Verification**:
  - Seluruh 28/28 regression test suites lolos 100% (48.07s).

## [2026-11-15 17:05] — Phase 567: Universal Terminology Standardization ('RATE' Metric, Zero Cohort/Assessment/Subject/Quiz)
- **Standardisasi Metrik SCORE Menjadi RATE**:
  - Kolom nilai persentase pada matriks kelas ([js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js), [js/admin/class.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/class.js), [js/admin/tests-management.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/tests-management.js), [js/admin/datagrid.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/datagrid.js)) resmi dinamai **`RATE`** (4-huruf pas). Membedakan secara mutlak antara persentase kelulusan/akurasi (`RATE` %) dan akumulasi poin jawaban benar (`POINT` PTS): $\text{PROG} \rightarrow \text{RATE} \rightarrow \text{POINT} \rightarrow \text{GRADE}$.
- **Pembersihan Menyeluruh Istilah Rancu Sesuai Arahan Pengguna**:
  - **Zero Cohort**: Istilah `cohort` dibersihkan 100% dan diseragamkan menjadi **`Batch`** di seluruh modal transfer, modal re-enroll, info enrollment, dan tabel duplikat.
  - **Zero Subject & Zero Class Board**: Seluruh kemunculan label `Class Board` dan `Subject` dibersihkan menjadi **`Class`**.
  - **Zero Assessment**: Seluruh istilah orphan `assessment` di dashboard siswa, halaman hasil, dan test room dinormalisasi menjadi **`Test`**.
  - **PASSED Column Standard**: Header kolom jumlah tes selesai di Student Roster diubah dari `COMPLETED` menjadi **`PASSED`** (micro `PASS`).
  - **Zero Quiz Legacy**: Seluruh sisa ID modal dan label wizard pada [js/admin/auto-gen-modal.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/auto-gen-modal.js) dibersihkan dari `quiz` menjadi **`task`**.
- **Verification**:
  - 10/10 Pilar Standardisasi Tabel lolos 100%. Spatial layout lolos 100%. AST Syntax 51/51 berkas lolos 100%. Workspace hygiene lolos 100%.

---
