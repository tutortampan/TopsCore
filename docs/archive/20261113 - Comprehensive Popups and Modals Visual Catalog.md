# 🗂️ Katalog Visual Lengkap Seluruh Pop-Up & Modal Sistem TopsCore

> **Status Saat Ini:** Seluruh desain modal eksperimental telah dibatalkan dan dikembalikan utuh ke **desain semula** yang Anda sukai (*3-Tier Hazard Yellow & Orange Submit Modal*, *clean onboarding modals tanpa stepper*, dan *kontrol flashcard original*). Dokumen ini menyajikan inventaris lengkap seluruh pop-up dan modal yang ada di aplikasi beserta tangkapan layar langsung (*live capture*).

---

## 🎯 Status Khusus: Exam Incomplete Submit Modal Telah Diperbaiki

Desain **Exam Submission Intelligence Modal** (yang menampilkan dua kartu metrik hijau/merah dan tombol *Jump to Unanswered*) **telah sepenuhnya dicabut dan diperbaiki** kembali ke desain **3-Tier Hazard** yang Anda sukai:

![Restored 3-Tier Hazard Submit Modal](C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172/popup_01_test_incomplete_submit.png)

### Anatomi Desain yang Dipulihkan:
- **Tier 1 (Red Accent):** Tombol merah neon `🏳️ GIVE UP!` (`#danger-submit-btn`).
- **Tier 2 (Amber/Yellow Card):** Ikon neon segitiga bahaya SVG + `WARNING: INCOMPLETE TEST!` + strip kotak gelap `QUESTIONS ANSWERED 14 / 40` dengan garis progres.
- **Tier 3 (Green Accent):** Tombol hijau neon `BACK TO THE TEST` (`#cancel-submit-btn`).

---

## 📱 1. Daftar Pop-Up Ruang Ujian Siswa (`test.html`)

Ruang ujian berfokus pada mode layar penuh dan pengawasan ketat:

| No | Nama Pop-Up / Modal | Target ID | Screenshot Langsung | Deskripsi & Alur Interaksi |
| :---: | :--- | :--- | :---: | :--- |
| **01** | **Incomplete Submit Modal** *(Dipulihkan)* | `#submit-modal` (`#hazard-incomplete-wrap`) | ![Incomplete Submit](C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172/popup_01_test_incomplete_submit.png) | Muncul jika siswa menekan tombol kumpul saat masih ada soal kosong. Berisi tombol **GIVE UP!**, peringatan segitiga neon **14 / 40**, dan **BACK TO THE TEST**. |
| **02** | **Ready to Submit Modal** | `#submit-modal` (`#hazard-complete-wrap`) | ![Complete Submit](C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172/popup_02_test_complete_submit.png) | Muncul jika seluruh soal (40/40) sudah terjawab. Menampilkan centang hijau `READY TO SUBMIT`, tombol `SUBMIT TEST 📋`, dan `BACK TO TEST`. |
| **03** | **Pre-Exam Focus Briefing** | `#pre-exam-focus-modal` | ![Pre-Exam Focus](C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172/popup_03_test_pre_exam_focus.png) | Muncul sebelum ujian dimulai. Mengunci mode fokus, checklist aturan fullscreen & mikrofon, serta tombol `START TEST NOW`. |
| **04** | **Question Matrix Popup** | `#matrix-popup` | ![Question Matrix](C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172/popup_04_test_question_matrix.png) | Pop-up grid nomor soal (1–40). Menampilkan status terjawab (hijau), belum (abu-abu), posisi aktif (biru), dan tombol lompat. |
| **05** | **Anti-Cheat Warning Modal** | `#anti-cheat-modal` | *(Otomatis saat blur / pindah tab)* | Layar peringatan silau kuning/oranye menyala dengan hitung mundur darurat saat siswa terdeteksi berganti tab atau keluar fullscreen. |

---

## 🎓 2. Daftar Pop-Up Dasbor Siswa (`dashboard.html`)

Dasbor siswa menangani profil, orientasi awal (*onboarding*), dan latihan mandiri:

| No | Nama Pop-Up / Modal | Target ID | Screenshot Langsung | Deskripsi & Alur Interaksi |
| :---: | :--- | :--- | :---: | :--- |
| **06** | **Choose Your Avatar / Gender** | `#gender-setup-modal` | ![Avatar Setup](C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172/popup_05_dash_gender_setup.png) | Pilihan gender 2 kolom berdampingan (*Male: Mr.* vs *Female: Miss*) dengan ring biru taktis dan tombol `SAVE & CONTINUE →`. |
| **07** | **Date of Birth Setup** *(Dipulihkan)* | `#birthday-setup-modal` | ![Birthday Setup](C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172/popup_06_dash_birthday_setup.png) | Input tanggal lahir siswa bersih tanpa stepper dots (`dd/mm/yyyy`) dengan tombol `✓ Save & Continue`. |
| **08** | **Academic Background Setup** *(Dipulihkan)* | `#education-setup-modal` | ![Education Setup](C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172/popup_07_dash_education_setup.png) | Hard gate pengisian 2 jenjang pendidikan terakhir (level & tahun kelulusan) tanpa pil chip. Dilengkapi emoji `🎓`. |
| **09** | **Photo & Device Setup** *(Dipulihkan)* | `#photo-setup-modal` | ![Photo Setup](C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172/popup_08_dash_photo_setup.png) | Pengambilan foto webcam siswa dengan preview melingkar dan tombol `Save & Finish`. |
| **10** | **Flashcard Review Modal** *(Dipulihkan)* | `#flashcard-modal` | ![Flashcard Review](C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172/popup_09_dash_flashcard.png) | Kartu flip kosakata terlewat (Word depan vs Terjemahan belakang) dengan 3 tombol klasik: `← Prev`, `🔄 Flip`, dan `Next →`. |
| **11** | **Student Profile Drawer** | `#profile-modal` | ![Profile Modal](C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172/popup_10_dash_profile.png) | Pop-up data diri siswa, avatar, level, batch, dan fitur reset PIN pribadi. |
| **12** | **Logout Confirmation Modal** | `#custom-confirm-modal` | ![Custom Confirm](C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172/popup_11_dash_custom_confirm.png) | Dialog konfirmasi keluar sesi gelap bergaya kaca: `LOG OUT SESSION` dengan tombol `Cancel` vs `Log Out`. |
| **13** | **Classes Selector Modal** | `#classes-selector-modal` | *(Drawer daftar kelas)* | Memilih kelas aktif saat siswa mengklik bilah kelas 30px di header. |
| **14** | **Component Selector Modal** | `#component-selector-modal` | *(Pilihan komponen modul)* | Memilih komponen materi (Vocabulary, Dialogue, Sentence) untuk sesi belajar. |

---

## 📊 3. Daftar Pop-Up Halaman Hasil / Nilai (`result.html`)

| No | Nama Pop-Up / Modal | Target ID | Deskripsi & Alur Interaksi |
| :---: | :--- | :--- | :--- |
| **15** | **Flashcard Recovery Modal** | `#flashcard-modal` | Sama dengan dasbor: kartu kosakata salah dengan kontrol 3 tombol `← Prev`, `🔄 Flip`, `Next →`. |
| **16** | **Answers Breakdown Section** | `#answers-section` | Rincian jawaban benar, salah, dan nilai poin per nomor ujian. |

---

## 🛠️ 4. Daftar Pop-Up Admin Console (`admin.html`)

Panel administrasi menggunakan workstation gelap dan palet SSOT:

| No | Nama Pop-Up / Modal | Target ID | Screenshot Langsung | Deskripsi & Alur Interaksi |
| :---: | :--- | :--- | :---: | :--- |
| **17** | **Permanent Deletion Modal** | `#delete-modal` | ![Admin Delete Modal](C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172/popup_12_admin_delete_modal.png) | Dialog konfirmasi hapus data berstandar **SSOT Grade E Red** (`#FF0000`). Menampilkan badge peringatan, pil identitas item yang akan dihapus, tombol `Cancel`, dan `🗑️ Delete Record`. |
| **18** | **Entity Add / Edit CRUD Modal** | `#crud-modal` | *(Workstation Form Modal)* | Dialog serbaguna untuk input/edit Program, Batch, Kelas, Siswa, dan Modul. |
| **19** | **Duplicate Students Resolver** | `#duplicate-students-modal` | *(Tabel Deteksi Duplikat)* | Memeriksa kemiripan nama siswa dan memberikan opsi merger profil. |
| **20** | **Duplicate Questions Resolver** | `#duplicate-questions-modal` | *(Tabel Deteksi Soal Sama)* | Menemukan dan membersihkan duplikasi butir soal dalam bank soal. |
| **21** | **Class / Batch Roster Modal** | `#roster-modal` | *(Daftar Siswa Kelas)* | Menampilkan daftar siswa terdaftar pada suatu batch atau kelas. |
| **22** | **Bulk Edit Tests Modal** | `#bulk-edit-tests-modal` | *(Operasi Massal Ujian)* | Mengubah status publish, urutan, atau level beberapa ujian sekaligus. |

---

## 💡 Rangkuman Perubahan yang Telah Dibatalkan (*Rolled Back*):
1. ❌ **Exam Submission Intelligence**: DICABUT. Kembali ke **3-Tier Hazard Yellow & Orange Submit Modal** (`GIVE UP!` + `WARNING: INCOMPLETE TEST!` + `BACK TO THE TEST`).
2. ❌ **Onboarding Stepper Header (`● ○ ○ ○`)**: DICABUT. Kembali ke modal orientasi sederhana.
3. ❌ **Edu Chips (`SMA`, `SMK`, dll.)**: DICABUT. Kembali ke dropdown select standar.
4. ❌ **Flashcard Practice / Mastered Buttons**: DICABUT. Kembali ke 3 tombol standar (`Prev`, `Flip`, `Next`).
5. ❌ **Skor F Modal & Sticky CRUD**: DICABUT dari Admin Console.

Silakan periksa daftar dan tangkapan layar di atas. Jika ada modal tertentu yang ingin diubah tampilannya atau justru ingin dipertahankan apa adanya, beri tahu saya nomor atau nama pop-up tersebut!
