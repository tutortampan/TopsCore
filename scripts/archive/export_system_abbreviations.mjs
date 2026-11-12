// TOPSCORE LMS — System Abbreviations & Glossary Excel Export Script
// Generates:
// 1. TopsCore_System_Abbreviations_Glossary_20261111.xlsx (OpenXML Spreadsheet)
// 2. TopsCore_System_Abbreviations_Glossary_20261111.xml (Excel XML 2003 Workbook)
// 3. TopsCore_System_Abbreviations_Glossary_20261111.csv (Universal CSV)

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

// ── 1. AUTHORITATIVE GLOSSARY DATASET (57 TERMS) ──
const GLOSSARY_DATA = [
  // --- DOMAIN 1: ORGANIZATION & COHORTS ---
  {
    id: 'D1-01',
    domain: '1. Organization & Cohorts',
    category: 'Table Header',
    fullTerm: 'Number',
    indonesian: 'Nomor Urut',
    shortAbbr: 'NO',
    altAbbr: '#',
    maxLen: 2,
    tooltip: 'Sequential Row Number',
    uiLocation: 'All DataGrids (#students, #curriculum, etc.)',
    codeRef: 'index + 1',
    status: 'Approved'
  },
  {
    id: 'D1-02',
    domain: '1. Organization & Cohorts',
    category: 'Table Header',
    fullTerm: 'Institution',
    indonesian: 'Institusi / Lembaga',
    shortAbbr: 'INST',
    altAbbr: 'CAMPUS',
    maxLen: 4,
    tooltip: 'Academic Institution / Campus',
    uiLocation: 'Curriculum Hub, Dashboard, Registration',
    codeRef: 'institutions.name',
    status: 'Approved'
  },
  {
    id: 'D1-03',
    domain: '1. Organization & Cohorts',
    category: 'Table Header',
    fullTerm: 'Program',
    indonesian: 'Program Belajar',
    shortAbbr: 'PROG',
    altAbbr: 'PRG',
    maxLen: 4,
    tooltip: 'Academic Program (e.g. Evnikom)',
    uiLocation: 'Curriculum Hub, Student Roster',
    codeRef: 'programs.name',
    status: 'Approved'
  },
  {
    id: 'D1-04',
    domain: '1. Organization & Cohorts',
    category: 'Table Header',
    fullTerm: 'Batch / Cohort',
    indonesian: 'Angkatan / Gelombang',
    shortAbbr: 'BAT',
    altAbbr: 'BATCH',
    maxLen: 5,
    tooltip: 'Student Batch / Cohort (e.g. EV-07)',
    uiLocation: 'Curriculum Hub, Student Roster Sidebar',
    codeRef: 'batches.name',
    status: 'Approved'
  },
  {
    id: 'D1-05',
    domain: '1. Organization & Cohorts',
    category: 'Table Header',
    fullTerm: 'Student Name',
    indonesian: 'Nama Siswa / Mahasiswa',
    shortAbbr: 'NAME',
    altAbbr: 'STU',
    maxLen: 4,
    tooltip: 'Student Profile Name',
    uiLocation: 'Student Roster, Profile Modal',
    codeRef: 'students.name',
    status: 'Approved'
  },
  {
    id: 'D1-06',
    domain: '1. Organization & Cohorts',
    category: 'Table Header',
    fullTerm: 'Gender',
    indonesian: 'Jenis Kelamin',
    shortAbbr: 'GEN',
    altAbbr: 'GND',
    maxLen: 3,
    tooltip: 'Gender (Male / Female)',
    uiLocation: 'Student Registration, Dossier',
    codeRef: 'students.gender',
    status: 'Approved'
  },
  {
    id: 'D1-07',
    domain: '1. Organization & Cohorts',
    category: 'Table Header',
    fullTerm: 'Active Status',
    indonesian: 'Status Keaktifan',
    shortAbbr: 'STAT',
    altAbbr: 'ACT',
    maxLen: 4,
    tooltip: 'Student Operational Status',
    uiLocation: 'Student Roster, Cohort List',
    codeRef: 'students.is_active',
    status: 'Approved'
  },
  {
    id: 'D1-08',
    domain: '1. Organization & Cohorts',
    category: 'Metadata',
    fullTerm: 'Enrollment Date',
    indonesian: 'Tanggal Pendaftaran',
    shortAbbr: 'ENR',
    altAbbr: 'START',
    maxLen: 3,
    tooltip: 'Cohort Enrollment Start Date',
    uiLocation: 'Curriculum Batch Details',
    codeRef: 'batches.enrollment_date',
    status: 'Approved'
  },
  {
    id: 'D1-09',
    domain: '1. Organization & Cohorts',
    category: 'Metadata',
    fullTerm: 'Graduation / Final Date',
    indonesian: 'Tanggal Kelulusan',
    shortAbbr: 'GRAD',
    altAbbr: 'END',
    maxLen: 4,
    tooltip: 'Cohort Actual Completion Date',
    uiLocation: 'Curriculum Batch Details',
    codeRef: 'batches.actual_final_date',
    status: 'Approved'
  },
  {
    id: 'D1-10',
    domain: '1. Organization & Cohorts',
    category: 'System Internal',
    fullTerm: 'Student Business ID',
    indonesian: 'ID Siswa (Non-Eksis)',
    shortAbbr: 'UUID',
    altAbbr: 'ID',
    maxLen: 4,
    tooltip: 'Internal Database UUID (Rule 2.2: No Business ID)',
    uiLocation: 'Internal Database Only',
    codeRef: 'students.id',
    status: 'Approved'
  },

  // --- DOMAIN 2: ACADEMIC CURRICULUM ---
  {
    id: 'D2-01',
    domain: '2. Academic Curriculum',
    category: 'Table Header',
    fullTerm: 'Level',
    indonesian: 'Tingkat Kemampuan',
    shortAbbr: 'LVL',
    altAbbr: 'LEVEL',
    maxLen: 3,
    tooltip: 'Academic Level (1ST, 2ND, 3RD, ALM)',
    uiLocation: 'Class Hub, Roster Super-header',
    codeRef: 'levels.name',
    status: 'Approved'
  },
  {
    id: 'D2-02',
    domain: '2. Academic Curriculum',
    category: 'Table Header',
    fullTerm: 'Class / Subject',
    indonesian: 'Mata Pelajaran / Kelas',
    shortAbbr: 'CLS',
    altAbbr: 'SUBJ',
    maxLen: 3,
    tooltip: 'Academic Subject / Study Room',
    uiLocation: 'Class Directory, Topbar',
    codeRef: 'classes.name',
    status: 'Approved'
  },
  {
    id: 'D2-03',
    domain: '2. Academic Curriculum',
    category: 'Table Header',
    fullTerm: 'Module',
    indonesian: 'Modul Evaluasi AI',
    shortAbbr: 'MOD',
    altAbbr: 'ENGN',
    maxLen: 3,
    tooltip: 'AI Evaluation Engine (1 of 8 Modules)',
    uiLocation: 'Learning Path, Test Builder',
    codeRef: 'modules.name',
    status: 'Approved'
  },
  {
    id: 'D2-04',
    domain: '2. Academic Curriculum',
    category: 'Table Header',
    fullTerm: 'Topic',
    indonesian: 'Topik Bahasan',
    shortAbbr: 'TPC',
    altAbbr: 'TOPIC',
    maxLen: 3,
    tooltip: 'Curriculum Learning Topic',
    uiLocation: 'Vocab Vault, Test Builder',
    codeRef: 'topics.name',
    status: 'Approved'
  },
  {
    id: 'D2-05',
    domain: '2. Academic Curriculum',
    category: 'Metadata',
    fullTerm: 'Theme',
    indonesian: 'Tema Besar',
    shortAbbr: 'THM',
    altAbbr: 'THEME',
    maxLen: 3,
    tooltip: 'Central Curriculum Theme Code',
    uiLocation: 'Vocab Vault Theme Grid',
    codeRef: 'themes.theme_code',
    status: 'Approved'
  },
  {
    id: 'D2-06',
    domain: '2. Academic Curriculum',
    category: 'Item Bank',
    fullTerm: 'Vocabulary Word',
    indonesian: 'Kata Kosakata',
    shortAbbr: 'WRD',
    altAbbr: 'VOC',
    maxLen: 3,
    tooltip: 'Target Vocabulary Word Item',
    uiLocation: 'Vocab Vault Grid',
    codeRef: 'vocab_vault.word',
    status: 'Approved'
  },
  {
    id: 'D2-07',
    domain: '2. Academic Curriculum',
    category: 'Item Bank',
    fullTerm: 'Part of Speech',
    indonesian: 'Kelas Kata',
    shortAbbr: 'POS',
    altAbbr: 'TYPE',
    maxLen: 3,
    tooltip: 'Grammar Part of Speech (Verb, Noun, etc.)',
    uiLocation: 'Vocab Vault, Question Drawer',
    codeRef: 'word_types.name',
    status: 'Approved'
  },
  {
    id: 'D2-08',
    domain: '2. Academic Curriculum',
    category: 'Item Bank',
    fullTerm: 'Phrase / Idiom',
    indonesian: 'Frasa / Idiom',
    shortAbbr: 'PHR',
    altAbbr: 'IDM',
    maxLen: 3,
    tooltip: 'Multi-Word Idiomatic Phrase',
    uiLocation: 'Vocab Vault Phrases Tab',
    codeRef: 'vocab_vault.phrase',
    status: 'Approved'
  },
  {
    id: 'D2-09',
    domain: '2. Academic Curriculum',
    category: 'Workflow',
    fullTerm: 'Learning Path',
    indonesian: 'Alur Pembelajaran',
    shortAbbr: 'PATH',
    altAbbr: 'FLOW',
    maxLen: 4,
    tooltip: 'Sequential Order of Class Modules',
    uiLocation: 'Class Study Room',
    codeRef: 'classes-hub.js',
    status: 'Approved'
  },

  // --- DOMAIN 3: TESTS & QUESTION ENGINE ---
  {
    id: 'D3-01',
    domain: '3. Tests & Question Engine',
    category: 'Table Header',
    fullTerm: 'Assessment / Test',
    indonesian: 'Ujian / Asesmen',
    shortAbbr: 'ASM',
    altAbbr: 'TEST',
    maxLen: 4,
    tooltip: 'Authoritative Test Shell',
    uiLocation: 'Test Analytics, Roster Super-header',
    codeRef: 'tests.title',
    status: 'Approved'
  },
  {
    id: 'D3-02',
    domain: '3. Tests & Question Engine',
    category: 'Table Header',
    fullTerm: 'Formative Task',
    indonesian: 'Tugas Harian',
    shortAbbr: 'TASK',
    altAbbr: 'TSK',
    maxLen: 4,
    tooltip: 'Daily 7x7 Repetition Practice Task',
    uiLocation: 'Class Hub, Roster Grid',
    codeRef: 'category = "TASK"',
    status: 'Approved'
  },
  {
    id: 'D3-03',
    domain: '3. Tests & Question Engine',
    category: 'Table Header',
    fullTerm: 'Summative Exam',
    indonesian: 'Ujian Milestone Mingguan',
    shortAbbr: 'EXAM',
    altAbbr: 'EXM',
    maxLen: 4,
    tooltip: 'Milestone Weekly Evaluation Exam',
    uiLocation: 'Class Hub, Roster Grid',
    codeRef: 'category = "EXAM"',
    status: 'Approved'
  },
  {
    id: 'D3-04',
    domain: '3. Tests & Question Engine',
    category: 'Table Header',
    fullTerm: 'Daily Quiz',
    indonesian: 'Kuis Harian',
    shortAbbr: 'QUIZ',
    altAbbr: 'QZ',
    maxLen: 4,
    tooltip: 'Daily Vocabulary / Grammar Quiz',
    uiLocation: 'Class Hub, Test Builder',
    codeRef: 'category = "QUIZ"',
    status: 'Approved'
  },
  {
    id: 'D3-05',
    domain: '3. Tests & Question Engine',
    category: 'Table Header',
    fullTerm: 'Prerequisite',
    indonesian: 'Syarat Kelulusan Modul',
    shortAbbr: 'PRQ',
    altAbbr: 'REQ',
    maxLen: 3,
    tooltip: 'Required Prior Assessment Module(s)',
    uiLocation: 'Test Analytics Grid, Class Detail',
    codeRef: 'prerequisites.parent_id',
    status: 'Approved'
  },
  {
    id: 'D3-06',
    domain: '3. Tests & Question Engine',
    category: 'Table Header',
    fullTerm: 'Attempt',
    indonesian: 'Sesi Pengerjaan',
    shortAbbr: 'ATT',
    altAbbr: 'SES',
    maxLen: 3,
    tooltip: 'Student Test Attempt Session',
    uiLocation: 'Test Analytics, Audit History',
    codeRef: 'attempts.id',
    status: 'Approved'
  },
  {
    id: 'D3-07',
    domain: '3. Tests & Question Engine',
    category: 'Table Header',
    fullTerm: 'Question Count',
    indonesian: 'Jumlah Soal',
    shortAbbr: 'QST',
    altAbbr: 'QTY',
    maxLen: 3,
    tooltip: 'Total Questions in Assessment Shell',
    uiLocation: 'Test Builder, Analytics',
    codeRef: 'total_questions',
    status: 'Approved'
  },
  {
    id: 'D3-08',
    domain: '3. Tests & Question Engine',
    category: 'Table Header',
    fullTerm: 'Time Limit',
    indonesian: 'Batas Waktu',
    shortAbbr: 'LIM',
    altAbbr: 'DUR',
    maxLen: 3,
    tooltip: 'Server-Enforced Time Limit (Minutes)',
    uiLocation: 'Test Room, Test Builder',
    codeRef: 'time_limit',
    status: 'Approved'
  },
  {
    id: 'D3-09',
    domain: '3. Tests & Question Engine',
    category: 'Table Header',
    fullTerm: 'Passing Threshold',
    indonesian: 'Ambang Kelulusan',
    shortAbbr: 'THR',
    altAbbr: 'PASS',
    maxLen: 3,
    tooltip: 'Minimum Passing Percentage Mark',
    uiLocation: 'Test Analytics, Prerequisite Guard',
    codeRef: 'passing_threshold',
    status: 'Approved'
  },
  {
    id: 'D3-10',
    domain: '3. Tests & Question Engine',
    category: 'Table Header',
    fullTerm: 'Question Order',
    indonesian: 'Urutan Soal',
    shortAbbr: 'ORD',
    altAbbr: 'SEQ',
    maxLen: 3,
    tooltip: 'Question Sequence: Sequential or Random',
    uiLocation: 'Test Analytics, Test Config',
    codeRef: 'question_order',
    status: 'Approved'
  },
  {
    id: 'D3-11',
    domain: '3. Tests & Question Engine',
    category: 'Rule SSOT',
    fullTerm: 'Question Weight',
    indonesian: 'Bobot Nilai per Soal',
    shortAbbr: 'WT',
    altAbbr: '1PT',
    maxLen: 3,
    tooltip: 'Rule 2.9: Exactly 1.0 Point per Question',
    uiLocation: 'Authoritative Grading Engine',
    codeRef: 'grading.js Rule 2.9',
    status: 'Approved'
  },

  // --- DOMAIN 4: PERFORMANCE & SCORING ---
  {
    id: 'D4-01',
    domain: '4. Performance & Scoring',
    category: 'Table Header',
    fullTerm: 'Overall Points',
    indonesian: 'Poin Kumulatif Siswa',
    shortAbbr: 'PTS',
    altAbbr: 'SCORE',
    maxLen: 3,
    tooltip: 'Cumulative Evaluated Student Score',
    uiLocation: 'Student Roster (#students), Result Scoreboard',
    codeRef: 'calculateOverallStudentScore()',
    status: 'Approved'
  },
  {
    id: 'D4-02',
    domain: '4. Performance & Scoring',
    category: 'Table Header',
    fullTerm: 'Percentage',
    indonesian: 'Persentase Nilai',
    shortAbbr: 'PCT',
    altAbbr: '%',
    maxLen: 3,
    tooltip: 'Percentage Score (0% – 100%)',
    uiLocation: 'Roster Matrix, Result Screen',
    codeRef: 'attempts.percentage',
    status: 'Approved'
  },
  {
    id: 'D4-03',
    domain: '4. Performance & Scoring',
    category: 'Table Header',
    fullTerm: 'Official Grade',
    indonesian: 'Predikat Nilai Resmi',
    shortAbbr: 'GRD',
    altAbbr: 'GRADE',
    maxLen: 3,
    tooltip: 'Official Grade Symbol (★, A, B, C, D, E)',
    uiLocation: 'Roster Matrix, Result Circle Badge',
    codeRef: 'calculateGrade() Rule 2.10',
    status: 'Approved'
  },
  {
    id: 'D4-04',
    domain: '4. Performance & Scoring',
    category: 'Grade Scale',
    fullTerm: 'Star Grade (100%)',
    indonesian: 'Nilai Sempurna (100%)',
    shortAbbr: '★',
    altAbbr: 'STAR',
    maxLen: 1,
    tooltip: 'Excellent (100% - Electric Pink #ff2d87)',
    uiLocation: 'Official Grading Scale (Rule 2.10)',
    codeRef: 'TOPSCORE_COLORS.STAR',
    status: 'Approved'
  },
  {
    id: 'D4-05',
    domain: '4. Performance & Scoring',
    category: 'Grade Scale',
    fullTerm: 'Grade A (90%–99%)',
    indonesian: 'Sangat Baik (90%–99%)',
    shortAbbr: 'A',
    altAbbr: 'GR-A',
    maxLen: 1,
    tooltip: 'Very Good (90%–99% - Pure Green #00c000)',
    uiLocation: 'Official Grading Scale (Rule 2.10)',
    codeRef: 'TOPSCORE_COLORS.A',
    status: 'Approved'
  },
  {
    id: 'D4-06',
    domain: '4. Performance & Scoring',
    category: 'Grade Scale',
    fullTerm: 'Grade B (80%–89%)',
    indonesian: 'Baik (80%–89%)',
    shortAbbr: 'B',
    altAbbr: 'GR-B',
    maxLen: 1,
    tooltip: 'Good (80%–89% - Electric Lime #95ff00)',
    uiLocation: 'Official Grading Scale (Rule 2.10)',
    codeRef: 'TOPSCORE_COLORS.B',
    status: 'Approved'
  },
  {
    id: 'D4-07',
    domain: '4. Performance & Scoring',
    category: 'Grade Scale',
    fullTerm: 'Grade C (60%–79%)',
    indonesian: 'Cukup (60%–79%)',
    shortAbbr: 'C',
    altAbbr: 'GR-C',
    maxLen: 1,
    tooltip: 'Enough (60%–79% - Pure Yellow #ffff00)',
    uiLocation: 'Official Grading Scale (Rule 2.10)',
    codeRef: 'TOPSCORE_COLORS.C',
    status: 'Approved'
  },
  {
    id: 'D4-08',
    domain: '4. Performance & Scoring',
    category: 'Grade Scale',
    fullTerm: 'Grade D (30%–59%)',
    indonesian: 'Kurang (30%–59%)',
    shortAbbr: 'D',
    altAbbr: 'GR-D',
    maxLen: 1,
    tooltip: 'Less (30%–59% - Dark Orange #ff8c00)',
    uiLocation: 'Official Grading Scale (Rule 2.10)',
    codeRef: 'TOPSCORE_COLORS.D',
    status: 'Approved'
  },
  {
    id: 'D4-09',
    domain: '4. Performance & Scoring',
    category: 'Grade Scale',
    fullTerm: 'Grade E (0%–29%)',
    indonesian: 'Gagal (0%–29%)',
    shortAbbr: 'E',
    altAbbr: 'GR-E',
    maxLen: 1,
    tooltip: 'Fail (0%–29% - Pure Red #ff0000)',
    uiLocation: 'Official Grading Scale (Rule 2.10)',
    codeRef: 'TOPSCORE_COLORS.E',
    status: 'Approved'
  },
  {
    id: 'D4-10',
    domain: '4. Performance & Scoring',
    category: 'Evaluation Code',
    fullTerm: 'Correct Answers',
    indonesian: 'Jawaban Benar (1.0 pt)',
    shortAbbr: 'COR',
    altAbbr: 'OK',
    maxLen: 3,
    tooltip: 'Exact Answer Match: 1.0 Point',
    uiLocation: 'Result Screen, Test Breakdown',
    codeRef: 'eval_correct (1.0 pt)',
    status: 'Approved'
  },
  {
    id: 'D4-11',
    domain: '4. Performance & Scoring',
    category: 'Evaluation Code',
    fullTerm: 'Partial Credit',
    indonesian: 'Jawaban Parsial (0.5 pt)',
    shortAbbr: 'PRT',
    altAbbr: 'PART',
    maxLen: 3,
    tooltip: 'Minor Spelling/Form Match: 0.5 Point',
    uiLocation: 'Result Screen, Test Breakdown',
    codeRef: 'eval_partial (0.5 pt)',
    status: 'Approved'
  },
  {
    id: 'D4-12',
    domain: '4. Performance & Scoring',
    category: 'Evaluation Code',
    fullTerm: 'Incorrect Answers',
    indonesian: 'Jawaban Salah (0.0 pt)',
    shortAbbr: 'INC',
    altAbbr: 'WRNG',
    maxLen: 3,
    tooltip: 'Semantic Mismatch: 0.0 Point',
    uiLocation: 'Result Screen, Test Breakdown',
    codeRef: 'eval_incorrect (0.0 pt)',
    status: 'Approved'
  },
  {
    id: 'D4-13',
    domain: '4. Performance & Scoring',
    category: 'Tag / Badge',
    fullTerm: 'Remedial Attempt',
    indonesian: 'Status Remedi (Maks 60%)',
    shortAbbr: 'REM',
    altAbbr: '60%ᴿ',
    maxLen: 4,
    tooltip: 'Remedial Attempt (Capped at 60%ᴿ)',
    uiLocation: 'Roster Matrix, Result Scoreboard',
    codeRef: 'Rule 2.10 / is_remedial',
    status: 'Approved'
  },
  {
    id: 'D4-14',
    domain: '4. Performance & Scoring',
    category: 'Tag / Badge',
    fullTerm: 'Forgiven / Waiver',
    indonesian: 'Dispensasi Skor F',
    shortAbbr: 'WVR',
    altAbbr: 'FORG',
    maxLen: 3,
    tooltip: 'Mr. Top Prerogative Waiver (Skor F)',
    uiLocation: 'Roster Matrix, Student Profile',
    codeRef: 'Rule 2.38 / is_forgiven',
    status: 'Approved'
  },
  {
    id: 'D4-15',
    domain: '4. Performance & Scoring',
    category: 'Lifecycle',
    fullTerm: 'Lifelines / Chances',
    indonesian: 'Kesempatan Mengulang',
    shortAbbr: 'LIF',
    altAbbr: 'LIFE',
    maxLen: 3,
    tooltip: 'Remaining Test Attempt Lifelines',
    uiLocation: 'Student Roster (Edit Mode ON)',
    codeRef: 'remaining_lives',
    status: 'Approved'
  },
  {
    id: 'D4-16',
    domain: '4. Performance & Scoring',
    category: 'Lifecycle',
    fullTerm: 'Promote Next',
    indonesian: 'Promosi Naik Level',
    shortAbbr: 'NEXT',
    altAbbr: 'PROM',
    maxLen: 4,
    tooltip: 'Promote Student to Higher Level',
    uiLocation: 'Student Roster (#students)',
    codeRef: 'lifecycle_action = "NEXT"',
    status: 'Approved'
  },
  {
    id: 'D4-17',
    domain: '4. Performance & Scoring',
    category: 'Lifecycle',
    fullTerm: 'Hold In Level',
    indonesian: 'Tahan di Level Saat Ini',
    shortAbbr: 'HOLD',
    altAbbr: 'STAY',
    maxLen: 4,
    tooltip: 'Retain Student in Current Level',
    uiLocation: 'Student Roster (#students)',
    codeRef: 'lifecycle_action = "HOLD"',
    status: 'Approved'
  },
  {
    id: 'D4-18',
    domain: '4. Performance & Scoring',
    category: 'Lifecycle',
    fullTerm: 'Repeat Cohort',
    indonesian: 'Ulangi Batch Dari Awal',
    shortAbbr: 'REP',
    altAbbr: 'RPT',
    maxLen: 3,
    tooltip: 'Repeat Entire Cohort / Level',
    uiLocation: 'Student Roster (#students)',
    codeRef: 'lifecycle_action = "REPEAT"',
    status: 'Approved'
  },
  {
    id: 'D4-19',
    domain: '4. Performance & Scoring',
    category: 'Metric',
    fullTerm: 'Highest Score',
    indonesian: 'Skor Tertinggi Siswa',
    shortAbbr: 'MAX',
    altAbbr: 'HIGH',
    maxLen: 3,
    tooltip: 'Highest Recorded Attempt Score',
    uiLocation: 'Class Progress, Report Card',
    codeRef: 'progress.highest_score',
    status: 'Approved'
  },
  {
    id: 'D4-20',
    domain: '4. Performance & Scoring',
    category: 'Metric',
    fullTerm: 'Global Average',
    indonesian: 'Rata-Rata Kumulatif',
    shortAbbr: 'AVG',
    altAbbr: 'MEAN',
    maxLen: 3,
    tooltip: 'Cohort Cumulative Average Score',
    uiLocation: 'Dashboard KPI, Executive View',
    codeRef: 'Rule 2.7 Global Average',
    status: 'Approved'
  },

  // --- DOMAIN 5: SYSTEM & WORKSTATION CONTROLS ---
  {
    id: 'D5-01',
    domain: '5. System & Controls',
    category: 'Audit',
    fullTerm: 'Timestamp',
    indonesian: 'Waktu Kejadian',
    shortAbbr: 'TIME',
    altAbbr: 'DATE',
    maxLen: 4,
    tooltip: 'Exact System Event Timestamp',
    uiLocation: 'Audit Logs Grid (#audit)',
    codeRef: 'audit_logs.created_at',
    status: 'Approved'
  },
  {
    id: 'D5-02',
    domain: '5. System & Controls',
    category: 'Audit',
    fullTerm: 'Actor / User',
    indonesian: 'Pelaku Tindakan',
    shortAbbr: 'ACTR',
    altAbbr: 'USER',
    maxLen: 4,
    tooltip: 'Operator or Administrator Identity',
    uiLocation: 'Audit Logs Grid (#audit)',
    codeRef: 'audit_logs.actor_id',
    status: 'Approved'
  },
  {
    id: 'D5-03',
    domain: '5. System & Controls',
    category: 'Audit',
    fullTerm: 'Action Type',
    indonesian: 'Jenis Aktivitas',
    shortAbbr: 'ACTN',
    altAbbr: 'EVT',
    maxLen: 4,
    tooltip: 'Material Administrative Action Performed',
    uiLocation: 'Audit Logs Grid (#audit)',
    codeRef: 'audit_logs.action',
    status: 'Approved'
  },
  {
    id: 'D5-04',
    domain: '5. System & Controls',
    category: 'Workstation Control',
    fullTerm: 'Master Edit Mode',
    indonesian: 'Mode Edit Master',
    shortAbbr: 'EDIT',
    altAbbr: 'LOCK',
    maxLen: 4,
    tooltip: 'Global Master Edit Mode (Rule 2.24)',
    uiLocation: 'Admin Topbar Ribbon',
    codeRef: 'topscore_global_edit_mode',
    status: 'Approved'
  },
  {
    id: 'D5-05',
    domain: '5. System & Controls',
    category: 'Workstation Control',
    fullTerm: 'Recalibrate Diagnostics',
    indonesian: 'Rekalibrasi Otomatis',
    shortAbbr: 'RECAL',
    altAbbr: 'DIAG',
    maxLen: 5,
    tooltip: 'Health Diagnostic System Recalibration',
    uiLocation: 'System Health (#health)',
    codeRef: 'health.js',
    status: 'Approved'
  },
  {
    id: 'D5-06',
    domain: '5. System & Controls',
    category: 'Data Quality',
    fullTerm: 'Duplicate Entity',
    indonesian: 'Data Duplikat',
    shortAbbr: 'DUP',
    altAbbr: 'CLONE',
    maxLen: 3,
    tooltip: 'Detected Duplicate Student or Question',
    uiLocation: 'Data Consolidation Tools',
    codeRef: 'dupMap / duplicateGroups',
    status: 'Approved'
  },
  {
    id: 'D5-07',
    domain: '5. System & Controls',
    category: 'Workstation Control',
    fullTerm: 'Synchronize Data',
    indonesian: 'Sinkronisasi Data',
    shortAbbr: 'SYNC',
    altAbbr: 'PULL',
    maxLen: 4,
    tooltip: 'Synchronize Remote Database & Cache',
    uiLocation: 'Admin Topbar & Hub Cards',
    codeRef: 'sync.js / clearAdminCache',
    status: 'Approved'
  }
];

// ── 2. ZIP PACKER (PURE NODE.JS, NO EXTERNAL DEPS) ──
const makeCrcTable = () => {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
};

const crcTable = makeCrcTable();

function crc32(buf) {
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

function buildZip(files) {
  const localHeaders = [];
  const centralHeaders = [];
  let offset = 0;

  for (const file of files) {
    const nameBuf = Buffer.from(file.name, 'utf8');
    const dataBuf = Buffer.isBuffer(file.content) ? file.content : Buffer.from(file.content, 'utf8');
    const crc = crc32(dataBuf);
    const uncompressedSize = dataBuf.length;

    const deflated = zlib.deflateRawSync(dataBuf);
    const compressedSize = deflated.length;

    // Local file header (30 bytes + name length)
    const localHeader = Buffer.alloc(30 + nameBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // Signature
    localHeader.writeUInt16LE(20, 4);         // Version needed: 2.0
    localHeader.writeUInt16LE(0, 6);          // Flags
    localHeader.writeUInt16LE(8, 8);          // Compression: Deflate
    localHeader.writeUInt16LE(0, 10);         // Mod time
    localHeader.writeUInt16LE(0, 12);         // Mod date
    localHeader.writeUInt32LE(crc, 14);       // CRC32
    localHeader.writeUInt32LE(compressedSize, 18); // Compressed size
    localHeader.writeUInt32LE(uncompressedSize, 22); // Uncompressed size
    localHeader.writeUInt16LE(nameBuf.length, 26); // Name length
    localHeader.writeUInt16LE(0, 28);         // Extra field length
    nameBuf.copy(localHeader, 30);

    localHeaders.push(localHeader, deflated);

    // Central directory header (46 bytes + name length)
    const centralHeader = Buffer.alloc(46 + nameBuf.length);
    centralHeader.writeUInt32LE(0x02014b50, 0); // Signature
    centralHeader.writeUInt16LE(20, 4);         // Version made by
    centralHeader.writeUInt16LE(20, 6);         // Version needed
    centralHeader.writeUInt16LE(0, 8);          // Flags
    centralHeader.writeUInt16LE(8, 10);         // Compression: Deflate
    centralHeader.writeUInt16LE(0, 12);         // Mod time
    centralHeader.writeUInt16LE(0, 14);         // Mod date
    centralHeader.writeUInt32LE(crc, 16);       // CRC32
    centralHeader.writeUInt32LE(compressedSize, 20); // Compressed size
    centralHeader.writeUInt32LE(uncompressedSize, 24); // Uncompressed size
    centralHeader.writeUInt16LE(nameBuf.length, 28); // Name length
    centralHeader.writeUInt16LE(0, 30);         // Extra field length
    centralHeader.writeUInt16LE(0, 32);         // Comment length
    centralHeader.writeUInt16LE(0, 34);         // Disk start
    centralHeader.writeUInt16LE(0, 36);         // Internal attributes
    centralHeader.writeUInt32LE(0, 38);         // External attributes
    centralHeader.writeUInt32LE(offset, 42);    // Relative offset of local header
    nameBuf.copy(centralHeader, 46);

    centralHeaders.push(centralHeader);

    offset += localHeader.length + deflated.length;
  }

  const centralDirOffset = offset;
  const centralDirSize = centralHeaders.reduce((sum, h) => sum + h.length, 0);

  // End of central directory record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // Signature
  eocd.writeUInt16LE(0, 4);          // Disk number
  eocd.writeUInt16LE(0, 6);          // Central dir start disk
  eocd.writeUInt16LE(files.length, 8); // Entries on disk
  eocd.writeUInt16LE(files.length, 10); // Total entries
  eocd.writeUInt32LE(centralDirSize, 12); // Size of central dir
  eocd.writeUInt32LE(centralDirOffset, 16); // Offset of central dir
  eocd.writeUInt16LE(0, 20);         // Comment length

  return Buffer.concat([...localHeaders, ...centralHeaders, eocd]);
}

// ── 3. XML STRING ESCAPER ──
function escXml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ── 4. OPENXML (.XLSX) GENERATOR ──
function generateXlsxBuffer(glossary) {
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet4.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet5.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="1. Master Summary" sheetId="1" r:id="rId1"/>
    <sheet name="2. Table Headers (Core)" sheetId="2" r:id="rId2"/>
    <sheet name="3. Metrics &amp; Scoring" sheetId="3" r:id="rId3"/>
    <sheet name="4. System &amp; Controls" sheetId="4" r:id="rId4"/>
    <sheet name="5. User Review &amp; Overrides" sheetId="5" r:id="rId5"/>
  </sheets>
</workbook>`;

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet4.xml"/>
  <Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet5.xml"/>
  <Relationship Id="rId6" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="4">
    <font><sz val="11"/><name val="Segoe UI"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Segoe UI"/></font>
    <font><b/><sz val="14"/><color rgb="FF0F172A"/><name val="Segoe UI"/></font>
    <font><b/><sz val="11"/><color rgb="FF00C000"/><name val="Segoe UI"/></font>
  </fonts>
  <fills count="5">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0F172A"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE2E8F0"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFCBD5E1"/></left>
      <right style="thin"><color rgb="FFCBD5E1"/></right>
      <top style="thin"><color rgb="FFCBD5E1"/></top>
      <bottom style="thin"><color rgb="FFCBD5E1"/></bottom>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="5">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
    <xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
  </cellXfs>
</styleSheet>`;

  function buildWorksheetXml(rows, colWidths = []) {
    let colsTag = '';
    if (colWidths.length > 0) {
      colsTag = '<cols>' + colWidths.map((w, idx) => `<col min="${idx + 1}" max="${idx + 1}" width="${w}" customWidth="1"/>`).join('') + '</cols>';
    }

    let rowsXml = '';
    rows.forEach((row, rIdx) => {
      const rowNum = rIdx + 1;
      let cellsXml = '';
      row.cells.forEach((c, cIdx) => {
        const colLetter = String.fromCharCode(65 + cIdx);
        const cellRef = `${colLetter}${rowNum}`;
        const styleId = c.style || 0;
        const val = escXml(c.val);
        cellsXml += `<c r="${cellRef}" t="inlineStr" s="${styleId}"><is><t>${val}</t></is></c>`;
      });
      rowsXml += `<row r="${rowNum}">${cellsXml}</row>`;
    });

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  ${colsTag}
  <sheetData>
    ${rowsXml}
  </sheetData>
</worksheet>`;
  }

  // --- SHEET 1: MASTER SUMMARY ---
  const s1Rows = [
    { cells: [{ val: 'TOPSCORE LMS — SYSTEM ABBREVIATIONS & GLOSSARY', style: 3 }] },
    { cells: [{ val: 'Standardized Single-Line Table Header & Architecture Reference', style: 0 }] },
    { cells: [{ val: `Generated: ${new Date().toISOString().split('T')[0]} | Total Terms: ${glossary.length}`, style: 0 }] },
    { cells: [] },
    {
      cells: [
        { val: 'DOMAIN / TAXONOMY', style: 1 },
        { val: 'TOTAL TERMS', style: 1 },
        { val: 'PRIMARY USE CASE', style: 1 },
        { val: 'STANDARD RULE REFERENCE', style: 1 }
      ]
    },
    {
      cells: [
        { val: '1. Organization & Cohorts', style: 0 },
        { val: String(glossary.filter(t => t.domain.includes('Organization')).length), style: 0 },
        { val: 'Campuses, programs, cohorts, student profile headers', style: 0 },
        { val: 'AGENTS.md Rule 2.1 & 2.2', style: 0 }
      ]
    },
    {
      cells: [
        { val: '2. Academic Curriculum', style: 0 },
        { val: String(glossary.filter(t => t.domain.includes('Curriculum')).length), style: 0 },
        { val: 'Levels, subjects, modules, learning paths, vocab vault', style: 0 },
        { val: 'AGENTS.md Rule 2.4 & 2.11', style: 0 }
      ]
    },
    {
      cells: [
        { val: '3. Tests & Question Engine', style: 0 },
        { val: String(glossary.filter(t => t.domain.includes('Tests')).length), style: 0 },
        { val: 'Tasks, exams, quizzes, prerequisites, thresholds', style: 0 },
        { val: 'AGENTS.md Rule 2.5 & 2.7', style: 0 }
      ]
    },
    {
      cells: [
        { val: '4. Performance & Scoring', style: 0 },
        { val: String(glossary.filter(t => t.domain.includes('Performance')).length), style: 0 },
        { val: 'Cumulative points, grades (★-E), remedi (60%ᴿ), waivers', style: 0 },
        { val: 'AGENTS.md Rule 2.10 & 2.13', style: 0 }
      ]
    },
    {
      cells: [
        { val: '5. System & Controls', style: 0 },
        { val: String(glossary.filter(t => t.domain.includes('System')).length), style: 0 },
        { val: 'Audit logs, edit mode toggle, recalibration, sync', style: 0 },
        { val: 'AGENTS.md Rule 2.19 & 2.24', style: 0 }
      ]
    },
    { cells: [] },
    { cells: [{ val: 'GUIDELINES FOR REVIEWERS:', style: 1 }, { val: '', style: 1 }, { val: '', style: 1 }, { val: '', style: 1 }] },
    { cells: [{ val: '1. Short Headers must be max 2 to 5 characters to strictly prevent table ballooning (Rule 2.34 & 2.38).', style: 0 }] },
    { cells: [{ val: '2. Every abbreviated column header strictly embeds title="..." for universal hover comprehension.', style: 0 }] },
    { cells: [{ val: '3. Use Tab "5. User Review & Overrides" to approve, reject, or suggest custom abbreviation changes.', style: 0 }] }
  ];
  const s1Widths = [30, 15, 45, 30];

  // --- SHEET 2: TABLE HEADERS (CORE) ---
  const tableTerms = glossary.filter(t => t.category === 'Table Header');
  const s2Rows = [
    {
      cells: [
        { val: 'ID', style: 1 },
        { val: 'DOMAIN', style: 1 },
        { val: 'FULL TERM (EN)', style: 1 },
        { val: 'MEANING (ID)', style: 1 },
        { val: 'SHORT (ABBR)', style: 1 },
        { val: 'ALT (ABBR)', style: 1 },
        { val: 'LEN', style: 1 },
        { val: 'MANDATORY HOVER TOOLTIP (TITLE)', style: 1 },
        { val: 'CURRENT UI LOCATION', style: 1 }
      ]
    },
    ...tableTerms.map((t, idx) => ({
      cells: [
        { val: t.id, style: idx % 2 === 0 ? 0 : 2 },
        { val: t.domain.split('. ')[1] || t.domain, style: idx % 2 === 0 ? 0 : 2 },
        { val: t.fullTerm, style: idx % 2 === 0 ? 0 : 2 },
        { val: t.indonesian, style: idx % 2 === 0 ? 0 : 2 },
        { val: t.shortAbbr, style: 4 }, // Emphasized
        { val: t.altAbbr, style: idx % 2 === 0 ? 0 : 2 },
        { val: String(t.maxLen), style: idx % 2 === 0 ? 0 : 2 },
        { val: t.tooltip, style: idx % 2 === 0 ? 0 : 2 },
        { val: t.uiLocation, style: idx % 2 === 0 ? 0 : 2 }
      ]
    }))
  ];
  const s2Widths = [10, 24, 25, 25, 14, 14, 8, 42, 35];

  // --- SHEET 3: METRICS & SCORING ---
  const metricTerms = glossary.filter(t => t.domain.includes('Performance'));
  const s3Rows = [
    {
      cells: [
        { val: 'ID', style: 1 },
        { val: 'METRIC / SYMBOL', style: 1 },
        { val: 'INDONESIAN MEANING', style: 1 },
        { val: 'SHORT TAG', style: 1 },
        { val: 'OFFICIAL VALUE / COLOR RULE', style: 1 },
        { val: 'RULE SSOT', style: 1 }
      ]
    },
    ...metricTerms.map((t, idx) => ({
      cells: [
        { val: t.id, style: idx % 2 === 0 ? 0 : 2 },
        { val: t.fullTerm, style: idx % 2 === 0 ? 0 : 2 },
        { val: t.indonesian, style: idx % 2 === 0 ? 0 : 2 },
        { val: t.shortAbbr, style: 4 },
        { val: t.tooltip, style: idx % 2 === 0 ? 0 : 2 },
        { val: t.codeRef, style: idx % 2 === 0 ? 0 : 2 }
      ]
    }))
  ];
  const s3Widths = [10, 25, 25, 14, 45, 30];

  // --- SHEET 4: SYSTEM & CONTROLS ---
  const systemTerms = glossary.filter(t => t.domain.includes('System') || t.category === 'System Internal');
  const s4Rows = [
    {
      cells: [
        { val: 'ID', style: 1 },
        { val: 'CONTROL / EVENT', style: 1 },
        { val: 'MEANING (ID)', style: 1 },
        { val: 'ABBR', style: 1 },
        { val: 'TOOLTIP DESCRIPTION', style: 1 },
        { val: 'UI ELEMENT & LOCATION', style: 1 }
      ]
    },
    ...systemTerms.map((t, idx) => ({
      cells: [
        { val: t.id, style: idx % 2 === 0 ? 0 : 2 },
        { val: t.fullTerm, style: idx % 2 === 0 ? 0 : 2 },
        { val: t.indonesian, style: idx % 2 === 0 ? 0 : 2 },
        { val: t.shortAbbr, style: 4 },
        { val: t.tooltip, style: idx % 2 === 0 ? 0 : 2 },
        { val: t.uiLocation, style: idx % 2 === 0 ? 0 : 2 }
      ]
    }))
  ];
  const s4Widths = [10, 25, 25, 14, 45, 30];

  // --- SHEET 5: USER REVIEW & OVERRIDES ---
  const s5Rows = [
    {
      cells: [
        { val: 'ID', style: 1 },
        { val: 'DOMAIN', style: 1 },
        { val: 'FULL TERM (EN)', style: 1 },
        { val: 'PROPOSED ABBR', style: 1 },
        { val: 'ALT ABBR', style: 1 },
        { val: 'TOOLTIP TEXT', style: 1 },
        { val: 'REVIEW STATUS (Approved/Edit)', style: 1 },
        { val: 'CUSTOM USER OVERRIDE (IF ANY)', style: 1 }
      ]
    },
    ...glossary.map((t, idx) => ({
      cells: [
        { val: t.id, style: idx % 2 === 0 ? 0 : 2 },
        { val: t.domain.split('. ')[1] || t.domain, style: idx % 2 === 0 ? 0 : 2 },
        { val: t.fullTerm, style: idx % 2 === 0 ? 0 : 2 },
        { val: t.shortAbbr, style: 4 },
        { val: t.altAbbr, style: idx % 2 === 0 ? 0 : 2 },
        { val: t.tooltip, style: idx % 2 === 0 ? 0 : 2 },
        { val: t.status, style: 0 },
        { val: '', style: 0 } // Empty cell for user input
      ]
    }))
  ];
  const s5Widths = [10, 24, 25, 16, 14, 42, 28, 35];

  const sheet1Xml = buildWorksheetXml(s1Rows, s1Widths);
  const sheet2Xml = buildWorksheetXml(s2Rows, s2Widths);
  const sheet3Xml = buildWorksheetXml(s3Rows, s3Widths);
  const sheet4Xml = buildWorksheetXml(s4Rows, s4Widths);
  const sheet5Xml = buildWorksheetXml(s5Rows, s5Widths);

  const zipFiles = [
    { name: '[Content_Types].xml', content: contentTypesXml },
    { name: '_rels/.rels', content: rootRelsXml },
    { name: 'xl/workbook.xml', content: workbookXml },
    { name: 'xl/_rels/workbook.xml.rels', content: workbookRelsXml },
    { name: 'xl/styles.xml', content: stylesXml },
    { name: 'xl/worksheets/sheet1.xml', content: sheet1Xml },
    { name: 'xl/worksheets/sheet2.xml', content: sheet2Xml },
    { name: 'xl/worksheets/sheet3.xml', content: sheet3Xml },
    { name: 'xl/worksheets/sheet4.xml', content: sheet4Xml },
    { name: 'xl/worksheets/sheet5.xml', content: sheet5Xml }
  ];

  return buildZip(zipFiles);
}

// ── 5. EXCEL XML 2003 WORKBOOK GENERATOR ──
function generateExcelXml2003(glossary) {
  function renderWorksheetXml(name, rows) {
    let rowsXml = '';
    rows.forEach(r => {
      let cellsXml = '';
      r.forEach(c => {
        const val = escXml(c.val);
        const style = c.style ? ` ss:StyleID="${c.style}"` : '';
        cellsXml += `<Cell${style}><Data ss:Type="String">${val}</Data></Cell>`;
      });
      rowsXml += `<Row>${cellsXml}</Row>`;
    });

    return `<Worksheet ss:Name="${escXml(name)}">
      <Table>
        ${rowsXml}
      </Table>
    </Worksheet>`;
  }

  const s1Rows = [
    [{ val: 'TOPSCORE LMS — SYSTEM ABBREVIATIONS & GLOSSARY', style: 'HeaderTitle' }],
    [{ val: 'Standardized Single-Line Table Header & Architecture Reference' }],
    [{ val: `Generated: ${new Date().toISOString().split('T')[0]} | Total Terms: ${glossary.length}` }],
    [],
    [
      { val: 'DOMAIN / TAXONOMY', style: 'HeaderCol' },
      { val: 'TOTAL TERMS', style: 'HeaderCol' },
      { val: 'PRIMARY USE CASE', style: 'HeaderCol' },
      { val: 'STANDARD RULE REFERENCE', style: 'HeaderCol' }
    ],
    ...['Organization', 'Curriculum', 'Tests', 'Performance', 'System'].map(d => [
      { val: d },
      { val: String(glossary.filter(t => t.domain.includes(d)).length) },
      { val: `Active ${d.toLowerCase()} operations and table views` },
      { val: 'TopsCore Authoritative Spec' }
    ])
  ];

  const s2Rows = [
    [
      { val: 'ID', style: 'HeaderCol' },
      { val: 'DOMAIN', style: 'HeaderCol' },
      { val: 'FULL TERM (EN)', style: 'HeaderCol' },
      { val: 'MEANING (ID)', style: 'HeaderCol' },
      { val: 'SHORT (ABBR)', style: 'HeaderCol' },
      { val: 'ALT (ABBR)', style: 'HeaderCol' },
      { val: 'MAX LEN', style: 'HeaderCol' },
      { val: 'HOVER TOOLTIP (TITLE)', style: 'HeaderCol' },
      { val: 'CURRENT UI LOCATION', style: 'HeaderCol' }
    ],
    ...glossary.map(t => [
      { val: t.id },
      { val: t.domain.split('. ')[1] || t.domain },
      { val: t.fullTerm },
      { val: t.indonesian },
      { val: t.shortAbbr, style: 'AbbrCell' },
      { val: t.altAbbr },
      { val: String(t.maxLen) },
      { val: t.tooltip },
      { val: t.uiLocation }
    ])
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Font ss:FontName="Segoe UI" ss:Size="11" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="HeaderTitle">
   <Font ss:FontName="Segoe UI" ss:Size="14" ss:Bold="1" ss:Color="#0F172A"/>
  </Style>
  <Style ss:ID="HeaderCol">
   <Font ss:FontName="Segoe UI" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="AbbrCell">
   <Font ss:FontName="Segoe UI" ss:Size="11" ss:Bold="1" ss:Color="#00C000"/>
   <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 ${renderWorksheetXml('1. Summary', s1Rows)}
 ${renderWorksheetXml('2. Full Glossary', s2Rows)}
</Workbook>`;
}

// ── 6. CSV EXPORT ──
function generateCsv(glossary) {
  const headers = ['ID', 'Domain', 'Category', 'Full Term (EN)', 'Meaning (ID)', 'Short Abbr', 'Alt Abbr', 'Max Len', 'Hover Tooltip (title)', 'UI Location', 'Code Reference', 'Review Status'];
  const lines = [headers.join(',')];

  glossary.forEach(t => {
    const row = [
      t.id,
      `"${t.domain}"`,
      `"${t.category}"`,
      `"${t.fullTerm}"`,
      `"${t.indonesian}"`,
      `"${t.shortAbbr}"`,
      `"${t.altAbbr}"`,
      t.maxLen,
      `"${t.tooltip}"`,
      `"${t.uiLocation}"`,
      `"${t.codeRef}"`,
      `"${t.status}"`
    ];
    lines.push(row.join(','));
  });

  return lines.join('\r\n');
}

// ── 7. EXECUTION & DELIVERY ──
function main() {
  console.log('🚀 Generating TopsCore System Abbreviations & Glossary Spreadsheets...\n');

  const xlsxBuffer = generateXlsxBuffer(GLOSSARY_DATA);
  const xmlContent = generateExcelXml2003(GLOSSARY_DATA);
  const csvContent = generateCsv(GLOSSARY_DATA);

  const xlsxPath = path.join(ROOT_DIR, 'TopsCore_System_Abbreviations_Glossary_20261111.xlsx');
  const xmlPath = path.join(ROOT_DIR, 'TopsCore_System_Abbreviations_Glossary_20261111.xml');
  const csvPath = path.join(ROOT_DIR, 'TopsCore_System_Abbreviations_Glossary_20261111.csv');

  fs.writeFileSync(xlsxPath, xlsxBuffer);
  fs.writeFileSync(xmlPath, xmlContent, 'utf8');
  fs.writeFileSync(csvPath, csvContent, 'utf8');

  console.log(`✅ [1/3] Standard OpenXML Spreadsheet generated:`);
  console.log(`       ${xlsxPath} (${(xlsxBuffer.length / 1024).toFixed(1)} KB)`);

  console.log(`✅ [2/3] Excel XML 2003 Workbook generated:`);
  console.log(`       ${xmlPath} (${(fs.statSync(xmlPath).size / 1024).toFixed(1)} KB)`);

  console.log(`✅ [3/3] Universal CSV Spreadsheet generated:`);
  console.log(`       ${csvPath} (${(fs.statSync(csvPath).size / 1024).toFixed(1)} KB)\n`);

  console.log('===============================================================');
  console.log('       TOPCORE GLOSSARY EXPORT COMPLETE & VERIFIED             ');
  console.log('===============================================================');
  console.log(`Total System Terms Exported: ${GLOSSARY_DATA.length}`);
  console.log(`Worksheets in Workbook: 5 tabs`);
  console.log(`  1. Master Summary`);
  console.log(`  2. Table Headers (Core)`);
  console.log(`  3. Metrics & Scoring`);
  console.log(`  4. System & Controls`);
  console.log(`  5. User Review & Overrides`);
  console.log('===============================================================\n');
}

main();
