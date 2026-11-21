/**
 * TOPSCORE LMS — SYSTEM GLOSSARY (HEADER & UI TERMINOLOGY SSOT)
 * Authoritative Master Guide for Table Headers, Sub-Headers, Columns & Screen Labels
 * Exclusively covers user-facing header abbreviations, matrix terms, visual tokens, and sample values.
 */

export const DEFAULT_SYSTEM_GLOSSARY = [
  // =========================================================================
  // 1. SUPER-HEADER (Header Tabel Tingkat 1 - Kategori Induk)
  // =========================================================================
  {
    id: 'sh_roster_data',
    group: 'Super-Header (Tingkat 1)',
    term: 'ROSTER DATA',
    function_desc: 'Header tingkat 1 di sisi kiri tabel workstation kelas. Memayungi kolom identitas siswa (Nomor, Nama Lengkap Siswa, Batch, dan Level).',
    color_code: '#0f172a',
    color_token: 'var(--fm-bg-header)',
    sample_val: '1 | Ahmad Fauzi | Camp 123 | 3rd',
    ssot_ref: 'AGENTS.md §2.9 & ui-invariants.md §4.3'
  },
  {
    id: 'sh_theme_a',
    group: 'Super-Header (Tingkat 1)',
    term: 'THEME A · WORLD OF WORK',
    function_desc: 'Header tingkat 1 blok tema pertama kurikulum. Memayungi seluruh matriks tugas harian (TASK) dan ujian tema A (RATE, PTS, GRD, STS).',
    color_code: '#38bdf8',
    color_token: 'var(--quad-d, #38bdf8)',
    sample_val: '14/14 | 95% | 285 | A | PASS',
    ssot_ref: 'AGENTS.md §2.6 & §2.9'
  },
  {
    id: 'sh_theme_b',
    group: 'Super-Header (Tingkat 1)',
    term: 'THEME B · [THEME NAME]',
    function_desc: 'Header tingkat 1 blok tema kedua kurikulum. Memayungi tugas harian dan ujian tema B beraksen Electric Lime.',
    color_code: '#95ff00',
    color_token: 'var(--quad-c, #95ff00)',
    sample_val: '14/14 | 88% | 264 | B | PASS',
    ssot_ref: 'AGENTS.md §2.6 & §2.9'
  },
  {
    id: 'sh_theme_c',
    group: 'Super-Header (Tingkat 1)',
    term: 'THEME C · [THEME NAME]',
    function_desc: 'Header tingkat 1 blok tema ketiga kurikulum. Memayungi tugas harian dan ujian tema C beraksen Dark Orange.',
    color_code: '#ff8c00',
    color_token: 'var(--quad-b, #ff8c00)',
    sample_val: '14/14 | 75% | 225 | C | PASS',
    ssot_ref: 'AGENTS.md §2.6 & §2.9'
  },
  {
    id: 'sh_theme_d',
    group: 'Super-Header (Tingkat 1)',
    term: 'THEME D · [THEME NAME]',
    function_desc: 'Header tingkat 1 blok tema keempat (final). Memayungi tugas harian dan ujian tema D beraksen Electric Pink.',
    color_code: '#ff2d87',
    color_token: 'var(--quad-a, #ff2d87)',
    sample_val: '14/14 | 100% | 300 | ★ | PASS',
    ssot_ref: 'AGENTS.md §2.6 & §2.9'
  },
  {
    id: 'sh_overall',
    group: 'Super-Header (Tingkat 1)',
    term: 'OVERALL / PERFORMANCE',
    function_desc: 'Header tingkat 1 di sisi kanan tabel. Memayungi metrik akumulasi akhir kelas (Rata-rata Skor %, Total Poin Bulat, Predikat Akhir, dan Status Kelulusan Level).',
    color_code: '#1e3a5f',
    color_token: 'Navy Solid Super-Header',
    sample_val: '89.5% | 1074 | B | ELIGIBLE',
    ssot_ref: 'AGENTS.md §2.8 & §2.9'
  },

  // =========================================================================
  // 2. SUB-HEADER (Header Kolom Matriks Tema & Nilai)
  // =========================================================================
  {
    id: 'sub_task',
    group: 'Sub-Header (Matriks Tema)',
    term: 'TASK (Formative Reps)',
    function_desc: 'Header kolom progres tugas formatif per tema. Menampilkan rasio repetisi yang telah diselesaikan terhadap target (contoh: Level 3 = 14/14 per topik atau 56/56 per tema; Level 2 = 7/7).',
    color_code: '#95ff00',
    color_token: 'var(--task-color, #95ff00)',
    sample_val: '14/14 atau 56/56',
    ssot_ref: 'AGENTS.md §2.7.1 & §2.9'
  },
  {
    id: 'sub_rate',
    group: 'Sub-Header (Matriks Tema)',
    term: 'RATE (Exam Score %)',
    function_desc: 'Header 4-huruf resmi untuk persentase nilai ujian tema (0%–100%). Menggunakan format angka tabular tanpa elipsis.',
    color_code: '#38bdf8',
    color_token: 'var(--primary-tactical, #38bdf8)',
    sample_val: '95%',
    ssot_ref: 'AGENTS.md §2.9'
  },
  {
    id: 'sub_pts',
    group: 'Sub-Header (Matriks Tema)',
    term: 'PTS (Points Whole Integer)',
    function_desc: 'Header 3-huruf resmi untuk poin nilai ujian. Sesuai Half-Up Whole Integer Invariant, nilai desimal ≥ .5 wajib dibulatkan ke bilangan bulat penuh (dilarang ada koma/desimal).',
    color_code: '#ffffff',
    color_token: 'Math.round(points)',
    sample_val: '285 (bukan 284.6)',
    ssot_ref: 'AGENTS.md §2.9'
  },
  {
    id: 'sub_grd',
    group: 'Sub-Header (Matriks Tema)',
    term: 'GRD (Grade Predicate)',
    function_desc: 'Header 3-huruf resmi untuk kolom huruf predikat hasil ujian (★, A, B, C, D, E, F, R, X). Mencegah teks terpotong pada tabel padat.',
    color_code: '#94a3b8',
    color_token: 'var(--clr-text-2)',
    sample_val: 'A atau ★',
    ssot_ref: 'AGENTS.md §2.9'
  },
  {
    id: 'sub_sts',
    group: 'Sub-Header (Matriks Tema)',
    term: 'STS (Exam Status)',
    function_desc: 'Header 3-huruf resmi untuk status administratif ujian (PASS, FAIL, LOCKED, ACTIVE).',
    color_code: '#64748b',
    color_token: 'var(--clr-text-3)',
    sample_val: 'PASS',
    ssot_ref: 'AGENTS.md §2.9'
  },
  {
    id: 'sub_done',
    group: 'Sub-Header (Matriks Tema)',
    term: 'DONE / COMPLETED',
    function_desc: 'Header kolom status penuntasan kumulatif kelas. Ditandai ikon bintang atau persentase jika seluruh syarat telah tuntas.',
    color_code: '#95ff00',
    color_token: 'var(--grade-b)',
    sample_val: '100% ★',
    ssot_ref: 'AGENTS.md §2.5.2'
  },
  {
    id: 'sub_w1_w7',
    group: 'Sub-Header (Matriks Tema)',
    term: 'W1 – W7 (Words Repetitions)',
    function_desc: 'Header kolom detail repetisi kosa kata (Words 1 s/d 7). Masing-masing bernilai 50 soal pilihan ganda dengan passing minimal Grade C (70%).',
    color_code: '#95ff00',
    color_token: 'var(--words-color)',
    sample_val: 'W1: 96% | W2: 92%',
    ssot_ref: 'AGENTS.md §2.7.1'
  },
  {
    id: 'sub_p1_p7',
    group: 'Sub-Header (Matriks Tema)',
    term: 'P1 – P7 (Phrases Repetitions)',
    function_desc: 'Header kolom detail repetisi frase (Phrases 1 s/d 7). Masing-masing bernilai 10 soal dengan passing minimal Grade C (70%). Ditiadakan di Level 2.',
    color_code: '#ff2d87',
    color_token: 'var(--phrases-color)',
    sample_val: 'P1: 100% | P2: 90%',
    ssot_ref: 'AGENTS.md §2.7.1'
  },

  // =========================================================================
  // 3. HEADER KOLOM ROSTER & SISWA
  // =========================================================================
  {
    id: 'col_student',
    group: 'Header Kolom Roster',
    term: 'STUDENT (Nama Siswa)',
    function_desc: 'Header kolom identitas nama lengkap siswa. Teks wajib dicetak tebal (Inter 700/800) warna putih bersih (#ffffff) tanpa pemotongan nama (zero truncation).',
    color_code: '#ffffff',
    color_token: 'var(--clr-text-1)',
    sample_val: 'Ahmad Fauzi Pratama',
    ssot_ref: 'AGENTS.md §2.2 & ui-invariants.md §1.5'
  },
  {
    id: 'col_batch',
    group: 'Header Kolom Roster',
    term: 'BATCH (Rombongan Belajar)',
    function_desc: 'Header kolom nama kelompok belajar siswa (misal Camp 123, Camp 134, Evnikom EV-07).',
    color_code: '#ff8c00',
    color_token: 'var(--quad-b)',
    sample_val: 'Camp 123',
    ssot_ref: 'AGENTS.md §1.3'
  },
  {
    id: 'col_lvl',
    group: 'Header Kolom Roster',
    term: 'LVL (Level Belajar)',
    function_desc: 'Header 3-huruf resmi kolom tingkatan level siswa (1st, 2nd, 3rd). Untuk program non-level ditampilkan angka 0 murni, dan alumni lulusan level 3 bertuliskan X.',
    color_code: '#38bdf8',
    color_token: 'DECISION-066 (Angka 0) & DECISION-061',
    sample_val: '0 / 1st / 2nd / 3rd / X',
    ssot_ref: 'AGENTS.md §2.4.2'
  },
  {
    id: 'col_status',
    group: 'Header Kolom Roster',
    term: 'STATUS (Keaktifan Siswa)',
    function_desc: 'Header kolom status operasional siswa: ACTIVE (hijau pudar), INACTIVE (abu-abu), atau ALUMNI (badge ungu/cyan).',
    color_code: '#94a3b8',
    color_token: 'var(--clr-text-2)',
    sample_val: 'ACTIVE',
    ssot_ref: 'AGENTS.md §1.4'
  },
  {
    id: 'col_actions',
    group: 'Header Kolom Roster',
    term: 'ACTIONS (Tombol Aksi)',
    function_desc: 'Header kolom tombol operasional (Edit Profil Siswa, Reset PIN, Raport PDF, atau Hapus).',
    color_code: '#64748b',
    color_token: 'var(--clr-text-3)',
    sample_val: '[Profile] [PIN] [PDF]',
    ssot_ref: 'ui-invariants.md §4.1'
  },

  // =========================================================================
  // 4. HEADER GRADING & PREDIKAT RESMI
  // =========================================================================
  {
    id: 'grd_star',
    group: 'Header Grading & Predikat',
    term: '★ 100% EXCELLENT (Grade Star)',
    function_desc: 'Predikat nilai sempurna 100%. Warna ungu neon (#c084fc) secara eksklusif hanya boleh digunakan untuk predikat ini di seluruh antarmuka.',
    color_code: '#c084fc',
    color_token: 'var(--grade-star, #c084fc)',
    sample_val: '★ 100% EXCELLENT',
    ssot_ref: 'AGENTS.md §2.10'
  },
  {
    id: 'grd_a',
    group: 'Header Grading & Predikat',
    term: 'A 90–99% VERY GOOD (Grade A)',
    function_desc: 'Predikat tingkat penguasaan sangat baik (skor 90% hingga 99%). Menggunakan warna Electric Green (#00c000).',
    color_code: '#00c000',
    color_token: 'var(--grade-a, #00c000)',
    sample_val: 'A 95% VERY GOOD',
    ssot_ref: 'AGENTS.md §2.10'
  },
  {
    id: 'grd_b',
    group: 'Header Grading & Predikat',
    term: 'B 80–89% GOOD (Grade B)',
    function_desc: 'Predikat tingkat penguasaan baik (skor 80% hingga 89%). Menggunakan warna Electric Lime (#95ff00).',
    color_code: '#95ff00',
    color_token: 'var(--grade-b, #95ff00)',
    sample_val: 'B 85% GOOD',
    ssot_ref: 'AGENTS.md §2.10'
  },
  {
    id: 'grd_c',
    group: 'Header Grading & Predikat',
    term: 'C 60–79% ENOUGH (Passing Threshold)',
    function_desc: 'Batas kelulusan resmi TopsCore (skor 60% hingga 79%). Siswa dengan Grade C resmi lulus dan mutlak berhak naik level. Dilarang menggunakan angka liar 70%.',
    color_code: '#ffff00',
    color_token: 'var(--grade-c, #ffff00)',
    sample_val: 'C 70% ENOUGH',
    ssot_ref: 'AGENTS.md §2.10 & §2.4.1'
  },
  {
    id: 'grd_d',
    group: 'Header Grading & Predikat',
    term: 'D 30–59% LESS (Grade D)',
    function_desc: 'Predikat kurang / belum lulus (skor 30% hingga 59%). Membutuhkan ujian ulang atau remedial.',
    color_code: '#ff8c00',
    color_token: 'var(--grade-d, #ff8c00)',
    sample_val: 'D 45% LESS',
    ssot_ref: 'AGENTS.md §2.10'
  },
  {
    id: 'grd_e',
    group: 'Header Grading & Predikat',
    term: 'E 0–29% FAIL (Grade E)',
    function_desc: 'Predikat gagal total (skor 0% hingga 29%). Siswa tidak memenuhi syarat kelulusan.',
    color_code: '#ff0000',
    color_token: 'var(--grade-e, #ff0000)',
    sample_val: 'E 20% FAIL',
    ssot_ref: 'AGENTS.md §2.10'
  },
  {
    id: 'grd_f',
    group: 'Header Grading & Predikat',
    term: 'F FORGIVEN (Dispensasi)',
    function_desc: 'Predikat dispensasi administratif resmi (is_forgiven = true). Diberikan oleh pimpinan agar siswa dapat naik level bersama rombongan batch.',
    color_code: '#f59e0b',
    color_token: 'var(--grade-f, #f59e0b)',
    sample_val: 'F FORGIVEN (Approved)',
    ssot_ref: 'AGENTS.md §2.4.1'
  },
  {
    id: 'grd_r',
    group: 'Header Grading & Predikat',
    term: 'R REMEDIAL (Remedial Selesai)',
    function_desc: 'Predikat penyelesaian remedial. Diberikan saat siswa berhasil menuntaskan tes remedial untuk melengkapi syarat kenaikan level.',
    color_code: '#06b6d4',
    color_token: 'var(--grade-r, #06b6d4)',
    sample_val: 'R 60% REMEDIAL',
    ssot_ref: 'AGENTS.md §2.4.1'
  },
  {
    id: 'grd_x',
    group: 'Header Grading & Predikat',
    term: 'X ALUMNI (Lulusan Level 3)',
    function_desc: 'Simbol predikat dan jenjang bagi alumni yang telah lulus dari Level 3. Warna badge mengikuti nilai kelulusan akhir.',
    color_code: '#38bdf8',
    color_token: 'var(--grade-x, #38bdf8)',
    sample_val: 'X ALUMNI (Score: 92%)',
    ssot_ref: 'AGENTS.md §2.4.2'
  },

  // =========================================================================
  // 5. HEADER DASHBOARD SISWA & RUANG UJIAN
  // =========================================================================
  {
    id: 'dash_hero_card',
    group: 'Header Dashboard Siswa',
    term: 'NEXT ASSIGNMENT (Hero Card)',
    function_desc: 'Header kartu ujian utama di dashboard siswa. Menampilkan tugas formatif atau ujian berikutnya dalam 2 baris terpisah (Baris 1: Kode Tes, Baris 2: Nama Topik).',
    color_code: '#38bdf8',
    color_token: 'Dashboard Hero Landmark',
    sample_val: 'Task A1 / Greetings & Basics',
    ssot_ref: 'AGENTS.md §2.6.2'
  },
  {
    id: 'dash_grade_card',
    group: 'Header Dashboard Siswa',
    term: 'GRADE / GRADE DESCRIPTION',
    function_desc: 'Header kartu predikat di dashboard siswa. Menampilkan huruf predikat aktif dan uraian kualitatif (EXCELLENT, VERY GOOD, GOOD, ENOUGH, LESS, FAIL).',
    color_code: '#95ff00',
    color_token: 'Dashboard Grade Card',
    sample_val: 'B / GOOD (Rate: 85%)',
    ssot_ref: 'AGENTS.md §2.5.2'
  },
  {
    id: 'dash_standings',
    group: 'Header Dashboard Siswa',
    term: 'MY RANK / STANDINGS',
    function_desc: 'Header kartu klasemen peringkat siswa dalam batch dan kelas yang dipilih. Menampilkan posisi ranking dan total poin terkumpul.',
    color_code: '#ff8c00',
    color_token: 'Dashboard Leaderboard Card',
    sample_val: '#1 dari 24 Siswa (1074 PTS)',
    ssot_ref: 'AGENTS.md §2.5.2'
  },
  {
    id: 'dash_completed_tests',
    group: 'Header Dashboard Siswa',
    term: 'COMPLETED TESTS (Tabel Riwayat)',
    function_desc: 'Header tabel riwayat ujian yang telah diselesaikan pada kelas terpilih. Kolom mencakup Nama Tes, Tipe (Task/Exam), Tanggal, Skor %, Poin, dan Grade.',
    color_code: '#0f172a',
    color_token: 'Completed Tests Table Header',
    sample_val: 'Task A1 | 100% | 50 PTS | ★',
    ssot_ref: 'AGENTS.md §2.5.2'
  },
  {
    id: 'dash_class_lobby',
    group: 'Header Dashboard Siswa',
    term: 'CLASS LOBBY (Pilihan Kelas)',
    function_desc: 'Header area pemilihan kelas di dashboard siswa. Menampilkan kartu seluruh kelas dari level yang telah dibuka secara kumulatif.',
    color_code: '#0284c7',
    color_token: 'Class Lobby Container',
    sample_val: 'Camp 3rd Vocab (Active)',
    ssot_ref: 'AGENTS.md §2.5.2'
  },

  // =========================================================================
  // 6. HEADER LIVE SESSION MONITOR (Pengawas Ujian)
  // =========================================================================
  {
    id: 'mon_session_hdr',
    group: 'Header Live Monitor',
    term: 'LIVE MONITOR (Supervisi Real-Time)',
    function_desc: 'Header utama workstation pantauan ujian langsung. Menampilkan jumlah siswa aktif di ruang ujian, koneksi socket, dan durasi.',
    color_code: '#059669',
    color_token: 'Live Monitor Table Header',
    sample_val: '18 Active / 2 Finished',
    ssot_ref: 'AGENTS.md §2.12'
  },
  {
    id: 'mon_duration',
    group: 'Header Live Monitor',
    term: 'DURATION / TIME REMAINING',
    function_desc: 'Header kolom sisa waktu pengerjaan soal siswa secara langsung (countdown). Berwarna merah menyala saat sisa waktu < 5 menit.',
    color_code: '#ef4444',
    color_token: 'Countdown Timer State',
    sample_val: '24:30 tersisa',
    ssot_ref: 'AGENTS.md §2.12'
  },
  {
    id: 'mon_integrity',
    group: 'Header Live Monitor',
    term: 'ALARM / INTEGRITY STATUS',
    function_desc: 'Header kolom status kecurangan ujian. Memunculkan badge alarm merah jika siswa berpindah tab atau meminimalkan jendela ujian.',
    color_code: '#ef4444',
    color_token: 'Anti-Cheat Violation Badge',
    sample_val: 'ALARM (2x Defocus)',
    ssot_ref: 'AGENTS.md §2.12.5'
  },
  {
    id: 'mon_actions',
    group: 'Header Live Monitor',
    term: 'PROCTOR ACTIONS (Aksi Pengawas)',
    function_desc: 'Header kolom tombol tindakan pengawas langsung: Late Entry (beri izin terlambat), Retake (izin ulang), atau Kick / Dismiss (keluarkan pelanggar).',
    color_code: '#f59e0b',
    color_token: 'Live Monitor Action Buttons',
    sample_val: '[Late] [Kick] [Extend]',
    ssot_ref: 'AGENTS.md §2.12.3 & §2.12.4'
  },

  // =========================================================================
  // 7. HEADER NAVIGASI & KUADRAN SISTEM
  // =========================================================================
  {
    id: 'nav_quad_a',
    group: 'Header Navigasi & Quadrant',
    term: 'A — ADMIN (Header Sidebar)',
    function_desc: 'Header domain navigasi A (Warna Electric Pink #ff2d87). Memuat menu Curriculum & Level Master, Dashboard Eksekutif, dan Organisasi.',
    color_code: '#ff2d87',
    color_token: 'var(--quad-a, #ff2d87)',
    sample_val: 'A — ADMIN (Executive)',
    ssot_ref: 'AGENTS.md §2.1'
  },
  {
    id: 'nav_quad_b',
    group: 'Header Navigasi & Quadrant',
    term: 'B — BOARD (Header Sidebar)',
    function_desc: 'Header domain navigasi B (Warna Dark Orange #ff8c00). Memuat menu Batches, Student Rosters, Progress View, dan Alumni.',
    color_code: '#ff8c00',
    color_token: 'var(--quad-b, #ff8c00)',
    sample_val: 'B — BOARD (Batches)',
    ssot_ref: 'AGENTS.md §2.1'
  },
  {
    id: 'nav_quad_c',
    group: 'Header Navigasi & Quadrant',
    term: 'C — CLASS (Header Sidebar)',
    function_desc: 'Header domain navigasi C (Warna Electric Lime #95ff00). Memuat menu Kelas Aktif, Jadwal Sesi Belajar, dan Ujian Kelas.',
    color_code: '#95ff00',
    color_token: 'var(--quad-c, #95ff00)',
    sample_val: 'C — CLASS (Active Sessions)',
    ssot_ref: 'AGENTS.md §2.1'
  },
  {
    id: 'nav_quad_d',
    group: 'Header Navigasi & Quadrant',
    term: 'D — DATA (Header Sidebar)',
    function_desc: 'Header domain navigasi D (Warna Tactical Cyan #38bdf8). Memuat menu Vocabulary Vault, Core Engines, System Designs, System Glossary, dan Settings.',
    color_code: '#38bdf8',
    color_token: 'var(--quad-d, #38bdf8)',
    sample_val: 'D — DATA (Vault & Settings)',
    ssot_ref: 'AGENTS.md §2.1'
  }
];
