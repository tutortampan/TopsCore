import fs from 'fs';

const report = [];

function addEntry(realm, type, name, selector, file, height, font, padding, status, notes) {
  report.push({
    realm,
    type, // 'Header', 'Sub-Header', 'Footer'
    name,
    selector,
    file,
    height,
    font,
    padding,
    status, // 'Disepakati' vs 'Belum Disepakati / Bervariasi'
    notes
  });
}

// 1. PAGE TOPBARS / MAIN HEADERS
addEntry(
  "Tutor's Room (Admin)",
  "Header",
  "Admin Console Topbar",
  ".admin-topbar",
  "css/admin.css",
  "50px (Desktop) / min-height 56px (Mobile <900px)",
  "Inter 400 (base), Tabs 11px Inter 600",
  "0 16px (Desktop) / 8px 12px (Mobile)",
  "Belum Disepakati (Ada konflik media query 50px vs 56px)",
  "Menampung folder tabs level (.topbar-tab-card: 38px) dan tombol aksi/profil."
);

addEntry(
  "Student Room (Dashboard)",
  "Header",
  "Student Dashboard Topbar",
  ".dashboard-header / body.dashboard-page .dashboard-header",
  "css/dashboard.css",
  "50px !important (LOCKED)",
  "Outfit 800 (clamp 0.95rem - 1.15rem)",
  "0 14px !important",
  "Disepakati (50px Lock)",
  "Berisi tombol class lobby door, judul class, dan action buttons (conv room, logout)."
);

addEntry(
  "Test Room (Exam)",
  "Header",
  "Test Room Topbar",
  ".test-top-header / header.test-top-header",
  "css/test.css",
  "50px !important (LOCKED)",
  "Outfit 800 (clamp 1rem - 1.25rem)",
  "4px 12px !important",
  "Disepakati (50px Lock)",
  "Berisi test title, countdown timer, dan progress status."
);

addEntry(
  "Result Room (Report Card)",
  "Header",
  "Result Page Header",
  ".result-page .dashboard-header",
  "css/result.css",
  "50px !important (LOCKED)",
  "Outfit 800",
  "0 14px !important",
  "Disepakati (50px Lock)",
  "Berisi brand logo dan avatar trigger profile."
);

addEntry(
  "Student Gate (Login)",
  "Header",
  "Student Gate Cascade Header",
  ".cascade-header",
  "css/auth.css",
  "Fluid / Bervariasi (~54px - 62px)",
  "Outfit 800 (1.15rem), Subtitle Inter 500",
  "0.8rem 1.1rem (Desktop) / 0.55rem 0.85rem (Mobile)",
  "Belum Disepakati (Belum ada height lock eksplisit)",
  "Header kartu login cascade 4-step."
);

addEntry(
  "Speaking Room (Conversation)",
  "Header",
  "Conversation Topbar",
  ".conv-topbar",
  "css/conversation.css",
  "50px (flex 0 0 50px)",
  "Inter 600 / Outfit 800",
  "0 16px",
  "Disepakati (50px Lock)",
  "Berisi room brand, peer avatar counter, dan audio-call stats."
);

addEntry(
  "Tutor's Room (Admin Sidebar)",
  "Header",
  "Admin Sidebar Header & Domain Groups",
  ".admin-sidebar-header, .nav-domain-header",
  "css/admin.css",
  "Domain Header: fluid (~28px), Nav Item: fluid (~36px)",
  "Domain Header: 11px Inter 800, Nav Item: 13px Inter 500/700",
  "Domain Header: 0.35rem 0.65rem, Nav Item: 0.45rem 0.75rem",
  "Belum Disepakati (Tidak ada height lock eksplisit)",
  "Header pengelompokan navigasi ABCD (Admin, Board, Class, Data)."
);

// 2. SUB-HEADERS / TABS / TOOLBARS / CARDS
addEntry(
  "Tutor's Room (Admin)",
  "Sub-Header",
  "Topbar Tab Folders (Level Tabs)",
  ".topbar-tab-card, .topbar-tab-folder",
  "css/admin.css",
  "38px (LOCKED)",
  "11px Inter 600, Badge 11px Inter 700",
  "0 16px (Desktop) / 0 10px (Mobile)",
  "Disepakati (38px Lock)",
  "Tab folder level yang menempel pada dasar topbar 50px."
);

addEntry(
  "Tutor's Room (Admin)",
  "Sub-Header",
  "Domain & Workspace Section Header",
  ".workspace-header, .section-header, .section-sticky-header",
  "css/admin.css",
  "Fluid (~38px - 48px, padding-driven)",
  "Outfit 700 (16px, --tr-font-title)",
  "0.75rem 0",
  "Belum Disepakati (Bervariasi di tiap tab/modul)",
  "Header judul halaman modul di bawah topbar."
);

addEntry(
  "Tutor's Room (Admin)",
  "Sub-Header",
  "Admin Action & Filter Toolbars",
  ".admin-toolbar, .student-roster-toolbar, .datagrid-toolbar",
  "css/admin.css",
  "0px (Edit Mode OFF) / auto (~36px-44px) (Edit Mode ON)",
  "12px Inter 600 (--tr-font-control)",
  "0.5rem 0 atau 0 14px",
  "Disepakati (Dynamic Collapse Rule 1: 0px vs auto)",
  "Toolbar pencarian, tombol add, toggle filter."
);

addEntry(
  "Student Room (Dashboard)",
  "Sub-Header",
  "Standings Dock Tab Header",
  ".dock-tab-header, .standings-card-header",
  "css/dashboard.css",
  "38px !important (LOCKED)",
  "Inter 700 (12px)",
  "0 !important",
  "Disepakati (38px Lock)",
  "Tab switch 'Class Ranks' vs 'Recent Attempts'."
);

addEntry(
  "Student Room (Dashboard)",
  "Sub-Header",
  "Welcome Hero Banner",
  ".welcome-banner",
  "css/dashboard.css",
  "Fluid (~90px - 130px)",
  "Outfit 800 (Name 1.25rem), Points/Scores",
  "clamp(12px, 3vw, 18px)",
  "Belum Disepakati (Fluid hero card)",
  "Kartu profil, score ring, dan grade badge di dashboard murid."
);

addEntry(
  "Test Room (Exam)",
  "Sub-Header",
  "Question Matrix & Prompt Header",
  ".matrix-header, .prompt-header",
  "css/test.css",
  "Fluid (~32px - 40px)",
  "12px Inter 700 / Outfit 700",
  "6px 12px",
  "Belum Disepakati (Bervariasi)",
  "Header navigator nomor soal dan instruksi stimulus."
);

addEntry(
  "Student Gate (Login)",
  "Sub-Header",
  "Cascade Step Header",
  ".cascade-step-header",
  "css/auth.css",
  "Fluid (~38px - 44px)",
  "13px Inter 700, badge 28px round",
  "0.5rem 0.85rem",
  "Belum Disepakati (Belum distandardisasi)",
  "Header penunjuk langkah (Step 1, Step 2, Step 3, Step 4)."
);

addEntry(
  "Speaking Room (Conversation)",
  "Sub-Header",
  "Topic Banner & Card Headers",
  ".conv-topic-banner, .conv-card-header",
  "css/conversation.css",
  "Fluid (~46px - 54px)",
  "14px Inter 600, Subtext 12px Inter 400",
  "14px 16px",
  "Belum Disepakati (Fluid padding)",
  "Banner topik diskusi speaking."
);

// 3. TABLE HEADERS & SUB-HEADERS
addEntry(
  "Tutor's Room (Admin Tables)",
  "Header",
  "Table Super-Header (2-Tier Header Row 1)",
  "thead tr.super-header-row th, thead tr.datagrid-super-header-row th",
  "css/admin.css",
  "24px !important (LOCKED Rule 8.4)",
  "12px Inter 800 !important (--tr-font-table)",
  "3px 8px !important",
  "Disepakati (24px Lock, tapi ada bocoran 10px di bp-matrix)",
  "Header pengelompokan kolom (e.g., 'STUDENT DOSSIER', 'CLASS EXAMS', 'ATTENDANCE')."
);

addEntry(
  "Tutor's Room (Admin Tables)",
  "Sub-Header",
  "Table Sub-Header (2-Tier Header Row 2)",
  "thead tr.sub-header-row th, thead tr:nth-child(2) th",
  "css/admin.css",
  "24px !important (LOCKED Rule 8.4)",
  "12px Inter 700 !important (--tr-font-table)",
  "3px 6px !important",
  "Disepakati (24px Lock, tapi ada bocoran 20px/11px di class-attendance)",
  "Header kolom individual di bawah super-header (e.g., 'PHOTO', 'NAME', 'Exam 1')."
);

addEntry(
  "Tutor's Room (Admin Tables)",
  "Header",
  "Table Single Header (1-Tier Tables)",
  "thead th (when no super-header)",
  "css/admin.css, css/style.css",
  "28px !important (Rule 8.4) vs Fluid (style.css)",
  "12px Inter 700 !important vs 0.65rem (table-compact) vs 0.78rem",
  "4px 8px !important vs var(--space-3) var(--space-4)",
  "Belum Disepakati (Konflik style.css 0.78rem/0.65rem vs admin.css 12px/28px)",
  "Header tabel tunggal tanpa super-header (e.g., Vocab Vault, Question Bank)."
);

// 4. FOOTERS & LOWER PANELS
addEntry(
  "Universal All Rooms",
  "Footer",
  "Locked Bottom Ad Banner",
  "#bottom-ad-banner, .topscore-locked-banner",
  "css/style.css, css/admin.css, css/test.css, css/result.css",
  "60px !important (LOCKED SYSTEM-WIDE)",
  "Outfit 800/900, clamp(1rem, 2.8vw, 1.15rem)",
  "0 0 0 24px (Desktop)",
  "Disepakati (60px Strict Lock)",
  "Banner permanen hak cipta TopsCore di seluruh halaman (admin, dash, test, result, auth)."
);

addEntry(
  "Tutor's Room (Admin)",
  "Footer",
  "Workspace Lower Panel",
  ".workspace-lower-panel, #admin-lower-panel, #roster-lower-panel",
  "css/admin.css",
  "50px !important (LOCKED Rule 3 & 8)",
  "12px Inter 600 (--tr-font-control)",
  "0 14px !important, line-height: 50px",
  "Disepakati (50px Strict Lock)",
  "Panel bawah tempat tombol aksi utama ([🚀 NEXT], [➕ Add], [📥 Import]) dan search."
);

addEntry(
  "Tutor's Room (Admin)",
  "Footer",
  "Sidebar Footer (Logout / Profile)",
  ".sidebar-footer",
  "css/admin.css",
  "50px !important (LOCKED Rule 3)",
  "12px Inter 600",
  "0 1rem, line-height: 50px",
  "Disepakati (50px Strict Lock)",
  "Footer sidebar admin yang sejajar dengan Workspace Lower Panel 50px."
);

addEntry(
  "Tutor's Room (Admin Tables)",
  "Footer",
  "Table Footer / Summary Row (tfoot)",
  "tfoot, tfoot tr, tfoot td, .datagrid-summary-row",
  "css/admin.css",
  "50px !important (Admin.css line 400) vs 24px-32px (Rule 8.5 Anti-Ballooning)",
  "12px Inter 700 !important",
  "6px 8px !important (admin.css line 430) vs line-height 50px",
  "Belum Disepakati (KONFLIK BESAR: tfoot dipaksa 50px padahal tabel baris 24-32px!)",
  "Baris summary/total di bawah tabel (e.g., 'BATCH AVG', Total Words, Grand Total)."
);

addEntry(
  "Test Room (Exam)",
  "Footer",
  "Test Bottom Navigation Bar",
  ".bottom-nav-bar, .test-page .bottom-nav-bar",
  "css/test.css, css/dashboard.css",
  "40px !important (test.css) vs min-height 54px (dashboard.css)",
  "13px Inter 700 / Outfit 700",
  "0 (test.css) vs 10px var(--space-4)",
  "Belum Disepakati (Konflik 40px di test.css vs 54px di dashboard.css)",
  "Bar navigasi [Prev] [Next] [Submit] di Test Room."
);

addEntry(
  "Speaking Room (Conversation)",
  "Footer",
  "Conversation Bottom Action Panel",
  ".conv-bottom-panel",
  "css/conversation.css",
  "50px (flex 0 0 50px)",
  "12px Inter 600",
  "0 16px",
  "Disepakati (50px Lock)",
  "Bar kontrol audio, mic mute, push to talk, leave call."
);

// 5. MODAL HEADERS & FOOTERS
addEntry(
  "Modals (System-Wide)",
  "Header",
  "Standard Modal Header",
  ".modal-header, .modal-header-bordered",
  "css/admin.css, css/style.css",
  "Fluid (~44px - 56px, padding-driven)",
  "Outfit 800 (1.1rem - 1.25rem, --fm-font-display)",
  "0.75rem / 10px / var(--space-3)",
  "Belum Disepakati (Tinggi fluid tanpa standar seragam)",
  "Header popover/dialog modal di seluruh sistem."
);

addEntry(
  "Modals (System-Wide)",
  "Footer",
  "Standard Modal Footer",
  ".modal-footer, .modal-footer-bordered",
  "css/admin.css, css/style.css",
  "Fluid (~50px - 60px, button-driven)",
  "Button text 12px Inter 600",
  "10px / 0.75rem",
  "Belum Disepakati (Tidak ada height lock seragam)",
  "Footer tombol aksi modal ([Cancel], [Save], [Confirm])."
);

console.log(JSON.stringify(report, null, 2));
fs.writeFileSync('scripts/header_sub_footer_census.json', JSON.stringify(report, null, 2), 'utf8');
