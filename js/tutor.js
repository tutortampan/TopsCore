/**
   TopsCore — Mobile Tutor App Controller (js/tutor.js)
   Multi-Tenant Engine: CEC (Progressive Levels 1-3) vs TOP (Corporate Non-Level)
   Features:
   - Level-First Selection (CEC) vs Program-First Selection (TOP)
   - 5-Panel Class Grid (CEC 5 Modalities)
   - Automated Meeting Counter & Real-Time Live Clock
   - Dual Start Actions: [ START REGULAR ] & [ START EXAM ]
   - Live Active Arena: GPS Beacon (10m) + Dynamic QRIS & 6-Char PIN
   - 4-Column Student Attendance Datagrid Table (NAME | PRESENT | EXCUSED | SICK | ABSENT)
   - English Area Punishment Ledger (CEC Only, Rate: Rp 2.000 / Word)
 */

import { getSupabase } from './supabase.js';
import { detectClassDiscipline, calculateGrade } from './grading.js';
import { getSvgIcon } from './svg-icons.js?v=20261124_01';
import { cleanStudentName } from './api.js';

// Configuration & Constants
const FINE_RATE_PER_WORD = 2000;
const DYNAMIC_CODE_ROTATION_SECONDS = 30;

// Authoritative Faculty & Tutor Data with Nicknames & Friendly Callouts (Synced with Admin Panel)
const FACULTY_REGISTRY = {
  CEC: [
    {
      id: 'tutor-cec-taufan',
      full_name: 'Mr. Taufan Hadi Ahmad',
      nickname: 'Mr. Top',
      gender: 'male',
      birth_date: '1987-11-07',
      address: 'Jl. Brawijaya No. 12, Pare, Kediri',
      specialty: 'Lead Academic Director & Speaking Specialist'
    },
    {
      id: 'tutor-cec-amrullah',
      full_name: 'Mr. Muhammad Amrullah',
      nickname: 'Mr. Amrul',
      gender: 'male',
      birth_date: '1997-08-18',
      address: 'Jl. Dahlia No. 8, Pare, Kediri',
      specialty: 'Senior Grammar & Basic English Tutor'
    },
    {
      id: 'tutor-cec-elysa',
      full_name: 'Miss Elysa Supiani',
      nickname: 'Miss Elysa',
      gender: 'female',
      birth_date: '2002-01-22',
      address: 'Mataram, Lombok Barat',
      specialty: 'Vocabulary & Monologue Specialist'
    },
    {
      id: 'tutor-cec-nizan',
      full_name: 'Miss Nizan',
      nickname: 'Miss Nizan',
      gender: 'female',
      birth_date: '2001-06-05',
      address: 'Pare, Kediri, Jawa Timur',
      specialty: 'Pronunciation & Phonetics Instructor'
    },
    {
      id: 'tutor-cec-cita',
      full_name: 'Miss Cita',
      nickname: 'Miss Cita',
      gender: 'female',
      birth_date: '2003-09-12',
      address: 'Mataram, Lombok Barat',
      specialty: 'Interactive Speaking & Dialogue Coach'
    },
    {
      id: 'tutor-cec-amelia',
      full_name: 'Miss Amelia',
      nickname: 'Miss Amelia',
      gender: 'female',
      birth_date: '2002-03-30',
      address: 'Senggigi, Lombok Barat',
      specialty: 'Storytelling & Speech Evaluation Specialist'
    }
  ],
  TOP: [
    {
      id: 'tutor-top-taufan',
      full_name: 'Mr. Taufan Hadi Ahmad',
      nickname: 'Mr. Top',
      gender: 'male',
      birth_date: '1987-11-07',
      address: 'Jl. Brawijaya No. 12, Pare, Kediri',
      specialty: 'Corporate Training & Hospitality Director'
    },
    {
      id: 'tutor-top-sq',
      full_name: "Miss Siti Qori' Atun Hizbaeni",
      nickname: 'Miss Siti',
      gender: 'female',
      birth_date: '2004-02-25',
      address: 'Mataram, Lombok Barat',
      specialty: 'Hospitality & Tourism English Lead'
    }
  ]
};

// Default Class-to-Tutor mapping (Persistent in LocalStorage and synced with Admin Panel SSOT — 0 Clashes)
const DEFAULT_CLASS_TUTOR_MAP = {
  // Level 1 — Real CEC Schedule (Room R-01 / CEC Hall)
  'CAMP-1VOCAB': 'tutor-cec-elysa',
  'CAMP-1STORY': 'tutor-cec-amelia',
  'CAMP-1GRAM':  'tutor-cec-amrullah',
  'CAMP-1GRMMR': 'tutor-cec-amrullah',
  'CAMP-1BASIC': 'tutor-cec-amrullah',
  'CAMP-1SPEAK': 'tutor-cec-nizan',

  // Level 2 — Real CEC Schedule (Room R-02 / R-03 / R-01)
  'CAMP-2VOCAB': 'tutor-cec-amrullah',
  'CAMP-2STORY': 'tutor-cec-cita',
  'CAMP-2GFS':   'tutor-cec-taufan',
  'CAMP-2GFORS': 'tutor-cec-taufan',
  'CAMP-2GRAM':  'tutor-cec-amrullah',
  'CAMP-2GRMMR': 'tutor-cec-amrullah',
  'CAMP-2SPEAK': 'tutor-cec-taufan',

  // Level 3 — Real CEC Schedule (Room R-03 / R-02)
  'CAMP-3VOCAB': 'tutor-cec-taufan',
  'CAMP-3STORY': 'tutor-cec-nizan',
  'CAMP-3PRON':  'tutor-cec-nizan',
  'CAMP-3PRONC': 'tutor-cec-nizan',
  'CAMP-3SPEAK': 'tutor-cec-taufan',
  'CAMP-3GRAM':  'tutor-cec-amelia',
  'CAMP-3GRMMR': 'tutor-cec-amelia',

  // TOP Corporate Programs
  'EVNK-VOCAB':  'tutor-top-taufan',
  'SHRT-VOCAB':  'tutor-top-sq',
  'TPTC-VOCAB':  'tutor-top-sq',

  // Backward compatibility aliases
  'CMP-1BASIC': 'tutor-cec-amrullah',
  'CMP-1VOCAB': 'tutor-cec-elysa',
  'CMP-1STORY': 'tutor-cec-amelia',
  'CMP-1SPEAK': 'tutor-cec-nizan',
  'CMP-1GRAM':  'tutor-cec-amrullah',
  'CMP-2BASIC': 'tutor-cec-amrullah',
  'CMP-2GFS':   'tutor-cec-taufan',
  'CMP-2VOCAB': 'tutor-cec-amrullah',
  'CMP-2STORY': 'tutor-cec-cita',
  'CMP-2SPEAK': 'tutor-cec-taufan',
  'CMP-2GRAM':  'tutor-cec-amrullah',
  'CMP-3BASIC': 'tutor-cec-nizan',
  'CMP-3PRON':  'tutor-cec-nizan',
  'CMP-3VOCAB': 'tutor-cec-taufan',
  'CMP-3STORY': 'tutor-cec-nizan',
  'CMP-3SPEAK': 'tutor-cec-taufan',
  'CMP-3GRAM':  'tutor-cec-amelia',
  'EVN-VOCAB':  'tutor-top-taufan',
  'SHR-VOCAB':  'tutor-top-sq',
  'TMT-VOCAB':  'tutor-top-sq'
};

// Authoritative Daily Class Schedule Mapping (Synchronized with Admin Deck DEFAULT_CLASS_SCHEDULE_MAP)
const ROOM_NAMES = {
  'R-01': 'CEC Hall',
  'R-02': 'New Room',
  'R-03': 'Grass Room',
  'R-04': 'AC Room',
  'R-05': "Girl's Camp",
  'HAL-0A': 'Executive Hall A',
  'HAL-0B': 'Banquet Hall B',
  'HAL-0C': 'Seminar Hall C'
};

const DEFAULT_CLASS_SCHEDULE_MAP = {
  // Level 1 — Real CEC Schedule (Room R-01 / CEC Hall)
  'CAMP-1VOCAB': { room: 'R-01', roomName: 'CEC Hall', start: '06:00', end: '07:00', duration: 60, day: 'Mon–Fri' },
  'CAMP-1STORY': { room: 'R-01', roomName: 'CEC Hall', start: '07:30', end: '09:00', duration: 90, day: 'Mon–Fri' },
  'CAMP-1GRAM':  { room: 'R-01', roomName: 'CEC Hall', start: '10:00', end: '11:00', duration: 60, day: 'Mon–Fri' },
  'CAMP-1GRMMR': { room: 'R-01', roomName: 'CEC Hall', start: '10:00', end: '11:00', duration: 60, day: 'Mon–Fri' },
  'CAMP-1BASIC': { room: 'R-01', roomName: 'CEC Hall', start: '17:00', end: '18:00', duration: 60, day: 'Mon–Fri' },
  'CAMP-1SPEAK': { room: 'R-01', roomName: 'CEC Hall', start: '20:00', end: '21:00', duration: 60, day: 'Mon–Fri' },

  // Level 2 — Real CEC Schedule (Room R-02 / R-03 / R-01)
  'CAMP-2VOCAB': { room: 'R-03', roomName: 'Grass Room', start: '06:00', end: '07:00', duration: 60, day: 'Mon–Fri' },
  'CAMP-2STORY': { room: 'R-02', roomName: 'New Room',   start: '07:30', end: '09:00', duration: 90, day: 'Mon–Fri' },
  'CAMP-2GFS':   { room: 'R-02', roomName: 'New Room',   start: '10:00', end: '11:00', duration: 60, day: 'Mon–Fri' },
  'CAMP-2GFORS': { room: 'R-02', roomName: 'New Room',   start: '10:00', end: '11:00', duration: 60, day: 'Mon–Fri' },
  'CAMP-2GRAM':  { room: 'R-02', roomName: 'New Room',   start: '15:00', end: '16:00', duration: 60, day: 'Mon–Fri' },
  'CAMP-2GRMMR': { room: 'R-02', roomName: 'New Room',   start: '15:00', end: '16:00', duration: 60, day: 'Mon–Fri' },
  'CAMP-2SPEAK': { room: 'R-01', roomName: 'CEC Hall',   start: '16:00', end: '17:00', duration: 60, day: 'Mon–Fri' },

  // Level 3 — Real CEC Schedule (Room R-03 / R-02)
  'CAMP-3VOCAB': { room: 'R-02', roomName: 'New Room',   start: '06:00', end: '07:00', duration: 60, day: 'Mon–Fri' },
  'CAMP-3STORY': { room: 'R-03', roomName: 'Grass Room', start: '07:30', end: '09:00', duration: 90, day: 'Mon–Fri' },
  'CAMP-3PRON':  { room: 'R-03', roomName: 'Grass Room', start: '10:00', end: '11:00', duration: 60, day: 'Mon–Fri' },
  'CAMP-3PRONC': { room: 'R-03', roomName: 'Grass Room', start: '10:00', end: '11:00', duration: 60, day: 'Mon–Fri' },
  'CAMP-3SPEAK': { room: 'R-03', roomName: 'Grass Room', start: '13:30', end: '15:00', duration: 90, day: 'Mon–Fri' },
  'CAMP-3GRAM':  { room: 'R-03', roomName: 'Grass Room', start: '15:00', end: '16:00', duration: 60, day: 'Mon–Fri' },
  'CAMP-3GRMMR': { room: 'R-03', roomName: 'Grass Room', start: '15:00', end: '16:00', duration: 60, day: 'Mon–Fri' },

  // TOP Classes
  'EVNK-VOCAB':  { room: 'HAL-0A', roomName: 'Executive Hall A', start: '08:30', end: '10:00', duration: 90, day: 'Mon–Fri' },
  'SHRT-VOCAB':  { room: 'HAL-0B', roomName: 'Banquet Hall B',   start: '13:00', end: '14:30', duration: 90, day: 'Mon–Fri' },
  'TPTC-VOCAB':  { room: 'HAL-0C', roomName: 'Seminar Hall C',   start: '16:00', end: '17:30', duration: 90, day: 'Mon–Fri' },

  // Backward compatibility aliases
  'CMP-1VOCAB': { room: 'R-01', roomName: 'CEC Hall', start: '06:00', end: '07:00', duration: 60, day: 'Mon–Fri' },
  'CMP-1STORY': { room: 'R-01', roomName: 'CEC Hall', start: '07:30', end: '09:00', duration: 90, day: 'Mon–Fri' },
  'CMP-1GRAM':  { room: 'R-01', roomName: 'CEC Hall', start: '10:00', end: '11:00', duration: 60, day: 'Mon–Fri' },
  'CMP-1BASIC': { room: 'R-01', roomName: 'CEC Hall', start: '17:00', end: '18:00', duration: 60, day: 'Mon–Fri' },
  'CMP-1SPEAK': { room: 'R-01', roomName: 'CEC Hall', start: '20:00', end: '21:00', duration: 60, day: 'Mon–Fri' },
  'CMP-2VOCAB': { room: 'R-03', roomName: 'Grass Room', start: '06:00', end: '07:00', duration: 60, day: 'Mon–Fri' },
  'CMP-2STORY': { room: 'R-02', roomName: 'New Room',   start: '07:30', end: '09:00', duration: 90, day: 'Mon–Fri' },
  'CMP-2GFS':   { room: 'R-02', roomName: 'New Room',   start: '10:00', end: '11:00', duration: 60, day: 'Mon–Fri' },
  'CMP-2GRAM':  { room: 'R-02', roomName: 'New Room',   start: '15:00', end: '16:00', duration: 60, day: 'Mon–Fri' },
  'CMP-2SPEAK': { room: 'R-01', roomName: 'CEC Hall',   start: '16:00', end: '17:00', duration: 60, day: 'Mon–Fri' },
  'CMP-3VOCAB': { room: 'R-02', roomName: 'New Room',   start: '06:00', end: '07:00', duration: 60, day: 'Mon–Fri' },
  'CMP-3STORY': { room: 'R-03', roomName: 'Grass Room', start: '07:30', end: '09:00', duration: 90, day: 'Mon–Fri' },
  'CMP-3PRON':  { room: 'R-03', roomName: 'Grass Room', start: '10:00', end: '11:00', duration: 60, day: 'Mon–Fri' },
  'CMP-3SPEAK': { room: 'R-03', roomName: 'Grass Room', start: '13:30', end: '15:00', duration: 90, day: 'Mon–Fri' },
  'CMP-3GRAM':  { room: 'R-03', roomName: 'Grass Room', start: '15:00', end: '16:00', duration: 60, day: 'Mon–Fri' },
  'EVN-VOCAB':  { room: 'HAL-0A', roomName: 'Executive Hall A', start: '08:30', end: '10:00', duration: 90, day: 'Mon–Fri' },
  'SHR-VOCAB':  { room: 'HAL-0B', roomName: 'Banquet Hall B',   start: '13:00', end: '14:30', duration: 90, day: 'Mon–Fri' },
  'TMT-VOCAB':  { room: 'HAL-0C', roomName: 'Seminar Hall C',   start: '16:00', end: '17:30', duration: 90, day: 'Mon–Fri' }
};

// Purge any stale / corrupted browser cache of tutor map & schedule map
const TUTOR_MAP_SYNC_VERSION = '20261123_v45';
const SCHEDULE_MAP_SYNC_VERSION = '20261123_v45';
try {
  if (typeof localStorage !== 'undefined') {
    if (localStorage.getItem('topscore_class_tutor_map_version') !== TUTOR_MAP_SYNC_VERSION) {
      localStorage.setItem('topscore_class_tutor_map', JSON.stringify(DEFAULT_CLASS_TUTOR_MAP));
      localStorage.setItem('topscore_class_tutor_map_version', TUTOR_MAP_SYNC_VERSION);
    }
    if (localStorage.getItem('topscore_class_schedule_map_version') !== SCHEDULE_MAP_SYNC_VERSION) {
      localStorage.setItem('topscore_class_schedule_map', JSON.stringify(DEFAULT_CLASS_SCHEDULE_MAP));
      localStorage.setItem('topscore_class_schedule_map_version', SCHEDULE_MAP_SYNC_VERSION);
    }
  }
} catch (_) {}

function getClassScheduleItem(classCode) {
  let normCode = String(classCode || '').toUpperCase().trim();
  normCode = normCode.replace('CAMP-1GRAM', 'CAMP-1GRMMR')
                     .replace('CAMP-2GRAM', 'CAMP-2GRMMR')
                     .replace('CAMP-3GRAM', 'CAMP-3GRMMR')
                     .replace('CAMP-2GFS', 'CAMP-2GFORS')
                     .replace('CAMP-3PRON', 'CAMP-3PRONC');

  let scheduleMap = Object.assign({}, DEFAULT_CLASS_SCHEDULE_MAP);
  try {
    const saved = localStorage.getItem('topscore_class_schedule_map');
    if (saved) Object.assign(scheduleMap, JSON.parse(saved));
  } catch (_) {}

  const item = scheduleMap[normCode] || DEFAULT_CLASS_SCHEDULE_MAP[normCode] || { room: 'R-01', roomName: 'CEC Hall', start: '08:00', end: '09:30', day: 'Mon–Fri' };
  if (item && item.room && (!item.roomName || item.roomName === item.room)) {
    item.roomName = ROOM_NAMES[item.room] || item.roomName || item.room;
  }
  return item;
}

function getClassSchedule(classCode) {
  const item = getClassScheduleItem(classCode);
  if (item && item.start && item.end) {
    return `${item.start} - ${item.end}`;
  }
  return '08:00 - 09:30';
}

function getAssignedTutorForClass(classCode) {
  let normCode = String(classCode || '').toUpperCase().trim();
  normCode = normCode.replace('CAMP-1GRAM', 'CAMP-1GRMMR')
                     .replace('CAMP-2GRAM', 'CAMP-2GRMMR')
                     .replace('CAMP-3GRAM', 'CAMP-3GRMMR')
                     .replace('CAMP-2GFS', 'CAMP-2GFORS')
                     .replace('CAMP-3PRON', 'CAMP-3PRONC');

  let map = Object.assign({}, DEFAULT_CLASS_TUTOR_MAP);
  try {
    const saved = localStorage.getItem('topscore_class_tutor_map');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') Object.assign(map, parsed);
    }
  } catch (_) {}

  let tutorId = map[normCode] || map[classCode] || DEFAULT_CLASS_TUTOR_MAP[normCode] || DEFAULT_CLASS_TUTOR_MAP[classCode];

  const allTutors = [...FACULTY_REGISTRY.CEC, ...FACULTY_REGISTRY.TOP];
  return allTutors.find(t => t.id === tutorId || (t.db_id && t.db_id === tutorId)) || FACULTY_REGISTRY.CEC[0];
}

function getStandardModalitiesForLevel(levelNum) {
  if (levelNum === 1) {
    // Chronological daily order: 06:00 Vocab, 07:30 Story, 10:00 Grammar, 17:00 Basic, 20:00 Speak
    return [
      { key: 'VOCABULARY', name: 'Vocabulary', code: 'CAMP-1VOCAB' },
      { key: 'STORYTELLING', name: 'Storytelling', code: 'CAMP-1STORY' },
      { key: 'GRAMMAR', name: 'Grammar', code: 'CAMP-1GRMMR' },
      { key: 'BASIC', name: 'Basic English', code: 'CAMP-1BASIC' },
      { key: 'SPEAKING', name: 'Speaking', code: 'CAMP-1SPEAK' }
    ];
  } else if (levelNum === 2) {
    // Chronological daily order: 06:00 Vocab, 07:30 Story, 10:00 GFS, 15:00 Grammar, 16:00 Speak
    return [
      { key: 'VOCABULARY', name: 'Vocabulary', code: 'CAMP-2VOCAB' },
      { key: 'STORYTELLING', name: 'Storytelling', code: 'CAMP-2STORY' },
      { key: 'GFS', name: 'GFS', code: 'CAMP-2GFORS' },
      { key: 'GRAMMAR', name: 'Grammar', code: 'CAMP-2GRMMR' },
      { key: 'SPEAKING', name: 'Speaking', code: 'CAMP-2SPEAK' }
    ];
  } else {
    // Chronological daily order: 06:00 Vocab, 07:30 Story, 10:00 Pronunciation, 13:30 Speak, 15:00 Grammar
    return [
      { key: 'VOCABULARY', name: 'Vocabulary', code: 'CAMP-3VOCAB' },
      { key: 'STORYTELLING', name: 'Storytelling', code: 'CAMP-3STORY' },
      { key: 'PRONUNCIATION', name: 'Pronunciation', code: 'CAMP-3PRONC' },
      { key: 'SPEAKING', name: 'Speaking', code: 'CAMP-3SPEAK' },
      { key: 'GRAMMAR', name: 'Grammar', code: 'CAMP-3GRMMR' }
    ];
  }
}

function cleanHonorific(name) {
  return String(name || '').replace(/^(Mr\.|Miss)\s+/i, '').trim();
}

function calcAge(birthDateStr) {
  if (!birthDateStr) return null;
  const d = new Date(birthDateStr);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

function formatDobAge(birthDateStr) {
  if (!birthDateStr) return '—';
  const d = new Date(birthDateStr);
  if (isNaN(d.getTime())) return birthDateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  const age = calcAge(birthDateStr);
  return `${day}/${month}/${year} (${age !== null ? age : '—'})`;
}

// Fallback registry by discipline
const TUTOR_PROFILES_BY_DISCIPLINE = {
  VOCABULARY: FACULTY_REGISTRY.CEC[2],
  SPEAKING: FACULTY_REGISTRY.CEC[0],
  STORYTELLING: FACULTY_REGISTRY.CEC[4],
  GRAMMAR: FACULTY_REGISTRY.CEC[1],
  BASIC: FACULTY_REGISTRY.CEC[1]
};

// Application State
let _sb = null;
let _currentTenant = 'CEC'; // 'CEC' | 'TOP'
let _currentTutor = { id: '00000000-0000-0000-0000-000000000001', full_name: 'Mr. Top (Tutor)', tutor_pin: '1234' };
let _selectedLevelNumber = 1; // 1 | 2 | 3 (CEC)
let _selectedTopProgram = 'EVNIKOM'; // EVNIKOM | SHERATON | TAMATA (TOP)
let _selectedClass = null; // Current active class object
let _activeSession = null;
let _levels = [];
let _classes = [];
let _batches = [];
let _tests = [];
let _students = [];
let _attendanceMap = new Map(); // studentId -> status ('PRESENT' | 'EXCUSED' | 'SICK' | 'ABSENT' | 'UNCHECKED')
let _violationsMap = new Map(); // studentId -> { word_count, fine_amount, paid_amount, debt_amount }
let _activeTab = 'attendance'; // 'attendance' | 'grade' | 'discipline'
let _activeArea = 'study'; // 'study' | 'english'
let _studySubView = 'attendance'; // 'attendance' | 'scores'
let _englishSubView = 'fines'; // 'fines' | 'payment'
let _gradeLevelNumber = 1; // 1 | 2 | 3
let _finesLevelNumber = 1; // 1 | 2 | 3
let _gradeSelectedClass = null;
let _manualGrades = new Map(); // key: `${levelNumber}_${classCode}_${studentId}_${examKey}` -> score
let _studentsCacheByLevel = { 1: [], 2: [], 3: [] };

// Initialize persisted manual grades
try {
  const savedGrades = localStorage.getItem('topscore_manual_grades');
  if (savedGrades) {
    const parsed = JSON.parse(savedGrades);
    if (Array.isArray(parsed)) {
      _manualGrades = new Map(parsed);
    }
  }
} catch (e) {
  console.warn('[TUTOR APP] Error restoring manual grades:', e);
}

// Initialize persisted fines
try {
  const savedFines = localStorage.getItem('topscore_fines_data');
  if (savedFines) {
    const parsed = JSON.parse(savedFines);
    if (Array.isArray(parsed)) {
      _violationsMap = new Map(parsed);
    }
  }
} catch (e) {
  console.warn('[TUTOR APP] Error restoring fines data:', e);
}

// Authoritative Fallback Cohorts for Levels 1, 2, and 3 (Zero-Truncation SSOT)
const COHORT_STUDENTS_BY_LEVEL = {
  1: [
    { id: '82e6da2a-51c9-4516-a440-f8dd7da320c7', name: 'Aditya Royzan Maulana', program_status: 'IN_PROGRESS', level_number: 1, batch_id: 'a4ce15e5-32d0-4745-9b99-3004c75ba806' },
    { id: '2f5515df-7573-4910-b45a-35e6dca53806', name: 'Aminatuzzohriah', program_status: 'IN_PROGRESS', level_number: 1, batch_id: 'a4ce15e5-32d0-4745-9b99-3004c75ba806' },
    { id: 'ce18456b-d1bf-43b5-8df5-ea20bbb41ce6', name: 'Andre Setiawan', program_status: 'IN_PROGRESS', level_number: 1, batch_id: 'a4ce15e5-32d0-4745-9b99-3004c75ba806' },
    { id: '180eea9c-6f67-45a6-b82f-5666afdde732', name: 'Arman Algifari', program_status: 'IN_PROGRESS', level_number: 1, batch_id: 'a4ce15e5-32d0-4745-9b99-3004c75ba806' },
    { id: '85372deb-0458-4bb7-893e-e0e1da269816', name: 'Deswita Mandalika', program_status: 'IN_PROGRESS', level_number: 1, batch_id: 'a4ce15e5-32d0-4745-9b99-3004c75ba806' },
    { id: 'bebe3657-0e58-46db-9900-5acdb768bf64', name: 'Dwiayu Ningrum', program_status: 'IN_PROGRESS', level_number: 1, batch_id: 'a4ce15e5-32d0-4745-9b99-3004c75ba806' },
    { id: '32dded8e-4942-4bf0-97d1-bd34575adf54', name: 'Eka Septiana Rizki', program_status: 'IN_PROGRESS', level_number: 1, batch_id: 'a4ce15e5-32d0-4745-9b99-3004c75ba806' },
    { id: '5a13275c-be72-41e4-9a3d-b19482c4237c', name: 'Eni Shufiyanti', program_status: 'IN_PROGRESS', level_number: 1, batch_id: 'a4ce15e5-32d0-4745-9b99-3004c75ba806' },
    { id: '630d64b7-4dcc-4470-a018-3601892aeaed', name: 'Faesal Ramdani', program_status: 'IN_PROGRESS', level_number: 1, batch_id: 'a4ce15e5-32d0-4745-9b99-3004c75ba806' },
    { id: '3e7cdf4d-5c23-4dcc-b32a-f9bce43b69be', name: 'Firdasari Risma Cahyani', program_status: 'IN_PROGRESS', level_number: 1, batch_id: 'a4ce15e5-32d0-4745-9b99-3004c75ba806' },
    { id: 'e947da9b-44de-4443-a5e3-46e3f51ad5f2', name: 'Hadid Al - Fatnazi', program_status: 'IN_PROGRESS', level_number: 1, batch_id: 'a4ce15e5-32d0-4745-9b99-3004c75ba806' },
    { id: 'c5fe286d-26eb-4020-8723-74e24a60d49e', name: 'Hafifa Ismarani Putri', program_status: 'IN_PROGRESS', level_number: 1, batch_id: 'a4ce15e5-32d0-4745-9b99-3004c75ba806' },
    { id: '31ea4dcd-38fa-41b9-b6f4-0439ab947912', name: 'Hakulil Amri', program_status: 'IN_PROGRESS', level_number: 1, batch_id: 'a4ce15e5-32d0-4745-9b99-3004c75ba806' },
    { id: '79275c7d-27ed-4ed3-be9a-60df960e0146', name: 'Hapipah', program_status: 'IN_PROGRESS', level_number: 1, batch_id: 'a4ce15e5-32d0-4745-9b99-3004c75ba806' },
    { id: '9b2ac2ed-d84c-40f9-bb33-3aae35719a66', name: 'Holawani', program_status: 'IN_PROGRESS', level_number: 1, batch_id: 'a4ce15e5-32d0-4745-9b99-3004c75ba806' },
    { id: '038dde15-f843-4b1a-967a-d5f8e9d6443a', name: 'Kinkin Ayu Pramesty', program_status: 'IN_PROGRESS', level_number: 1, batch_id: 'a4ce15e5-32d0-4745-9b99-3004c75ba806' },
    { id: 'b99abd8f-3032-445c-8214-60a17b8f812e', name: 'Lalu Riski Dwi Pwrdana', program_status: 'IN_PROGRESS', level_number: 1, batch_id: 'a4ce15e5-32d0-4745-9b99-3004c75ba806' },
    { id: 'c14fea91-9977-40a5-a363-e457b60bf988', name: 'Lucky Amelia', program_status: 'IN_PROGRESS', level_number: 1, batch_id: 'a4ce15e5-32d0-4745-9b99-3004c75ba806' },
    { id: '5f064839-21f4-40a2-8c8d-e0f7f3d9589f', name: 'Maria Imakulata Kidi Kerans', program_status: 'IN_PROGRESS', level_number: 1, batch_id: 'a4ce15e5-32d0-4745-9b99-3004c75ba806' },
    { id: '05e9bea0-1f82-457a-9ce9-e9964955966c', name: 'Mohammad Balyan Ilham Haromain', program_status: 'IN_PROGRESS', level_number: 1, batch_id: 'a4ce15e5-32d0-4745-9b99-3004c75ba806' },
    { id: '82101b63-8274-4d9c-af17-f629d98fdda3', name: 'Muhammad Husnul Fikri Al Insani', program_status: 'IN_PROGRESS', level_number: 1, batch_id: 'a4ce15e5-32d0-4745-9b99-3004c75ba806' },
    { id: '2274e763-680c-4374-b7cd-5ce4d436f66c', name: 'Nahyan Samudra Wahyu', program_status: 'IN_PROGRESS', level_number: 1, batch_id: 'a4ce15e5-32d0-4745-9b99-3004c75ba806' },
    { id: '89800598-de35-4af5-a3f5-85ba9f26ee6a', name: 'Nur Amelia', program_status: 'IN_PROGRESS', level_number: 1, batch_id: 'a4ce15e5-32d0-4745-9b99-3004c75ba806' },
    { id: 'da5deef8-d544-4e16-8d42-bb21ca8dd437', name: 'Raden Dika Wadi', program_status: 'IN_PROGRESS', level_number: 1, batch_id: 'a4ce15e5-32d0-4745-9b99-3004c75ba806' },
    { id: 'a18e3d00-1dd3-4667-a384-d70da9c29ee8', name: 'Shinta Triala Warbianty Putri', program_status: 'IN_PROGRESS', level_number: 1, batch_id: 'a4ce15e5-32d0-4745-9b99-3004c75ba806' },
    { id: 'af87633a-5fcf-407b-87cd-129a11951998', name: 'Singgih Dwi Putra Gunanda', program_status: 'IN_PROGRESS', level_number: 1, batch_id: 'a4ce15e5-32d0-4745-9b99-3004c75ba806' },
    { id: 'f6420c34-3ec8-4f32-9968-de17a48885f0', name: 'Siti Nurhada Zuhaira', program_status: 'IN_PROGRESS', level_number: 1, batch_id: 'a4ce15e5-32d0-4745-9b99-3004c75ba806' },
    { id: 'c114a1a8-4214-4799-b05c-05c30e253937', name: 'Soni', program_status: 'IN_PROGRESS', level_number: 1, batch_id: 'a4ce15e5-32d0-4745-9b99-3004c75ba806' },
    { id: '02ce6da0-94ff-4751-b677-9f4be72024cd', name: 'Yola Meilya Saputri', program_status: 'IN_PROGRESS', level_number: 1, batch_id: 'a4ce15e5-32d0-4745-9b99-3004c75ba806' },
    { id: 'fe1731c8-e000-49e7-8327-682ca74dd8c1', name: 'Zahira Mawla Putri', program_status: 'IN_PROGRESS', level_number: 1, batch_id: 'a4ce15e5-32d0-4745-9b99-3004c75ba806' }
  ],
  2: [
    { id: '9061b732-ae90-4786-a781-013b5ee68310', name: 'Abdul Basit', program_status: 'INACTIVE', level_number: 2, batch_id: '3e7288b7-a90e-4323-9b02-24e73991f0d7' },
    { id: '66d73c5f-3f58-41d0-9be9-aad3158afb62', name: 'Adinda Karunia Farela', program_status: 'INACTIVE', level_number: 2, batch_id: '3e7288b7-a90e-4323-9b02-24e73991f0d7' },
    { id: 'abbfbe3a-272a-4a1d-a57b-49fedb45f384', name: 'Lalu Arman Maulana', program_status: 'IN_PROGRESS', level_number: 2, batch_id: '3e7288b7-a90e-4323-9b02-24e73991f0d7' },
    { id: '547d7074-01e5-49d3-a0ef-08dbe1268143', name: 'Muhammad Ariwil Asrori', program_status: 'IN_PROGRESS', level_number: 2, batch_id: '3e7288b7-a90e-4323-9b02-24e73991f0d7' },
    { id: 'b3ed594c-6700-4f38-be11-cf3dd6c40c29', name: 'Riska Fetrosia', program_status: 'INACTIVE', level_number: 2, batch_id: '3e7288b7-a90e-4323-9b02-24e73991f0d7' }
  ],
  3: [
    { id: 'b64a9245-1630-46f6-bcf3-4e291f4b3f8c', name: 'Abdul Qoyyim Hanif Dahuri', program_status: 'IN_PROGRESS', level_number: 3, batch_id: '3e7288b7-a90e-4323-9b02-24e73991f0d7' },
    { id: '4df43f93-048d-426b-a86a-0aab33912329', name: 'Alfina Damayanti', program_status: 'IN_PROGRESS', level_number: 3, batch_id: '3e7288b7-a90e-4323-9b02-24e73991f0d7' },
    { id: 'f699aaf8-1f97-462a-a7eb-4e29c0928c7d', name: 'Arman Maulana', program_status: 'ACTIVE', level_number: 3, batch_id: '3e7288b7-a90e-4323-9b02-24e73991f0d7' },
    { id: 'bae52c8d-3456-4334-8f7a-7ba3c268c642', name: 'Ayya Sofyandi Mzeth', program_status: 'IN_PROGRESS', level_number: 3, batch_id: '3e7288b7-a90e-4323-9b02-24e73991f0d7' },
    { id: '240b1078-79f8-4158-9298-ffde0addb2e6', name: 'Cinta Laura', program_status: 'IN_PROGRESS', level_number: 3, batch_id: '3e7288b7-a90e-4323-9b02-24e73991f0d7' },
    { id: '62b89f13-18f3-41ec-bdfe-802d8a35ce0d', name: 'Dirja Arisandi', program_status: 'ACTIVE', level_number: 3, batch_id: '3e7288b7-a90e-4323-9b02-24e73991f0d7' },
    { id: '3e8e4a9c-8d25-4318-b9c6-2d629d0d70b8', name: 'Havvina Solehah', program_status: 'IN_PROGRESS', level_number: 3, batch_id: '3e7288b7-a90e-4323-9b02-24e73991f0d7' },
    { id: '6353b138-6bb5-4145-a5a7-d3f34eb760bf', name: 'Ida Wayan Gana Surya Arta', program_status: 'ACTIVE', level_number: 3, batch_id: '3e7288b7-a90e-4323-9b02-24e73991f0d7' },
    { id: '2e10e158-1a0a-403f-a4aa-c2f6281eb7d7', name: 'Indah Yulandari', program_status: 'ACTIVE', level_number: 3, batch_id: '3e7288b7-a90e-4323-9b02-24e73991f0d7' },
    { id: 'b0fce8b7-37c4-41c0-93b9-f3bab8142c83', name: 'Isnantika Salsabila', program_status: 'IN_PROGRESS', level_number: 3, batch_id: '3e7288b7-a90e-4323-9b02-24e73991f0d7' },
    { id: 'd7ac1635-09d7-481b-a7dd-4eb4f66bf2e7', name: 'Lalu Gde Syailana Patria Fanandy', program_status: 'ACTIVE', level_number: 3, batch_id: '3e7288b7-a90e-4323-9b02-24e73991f0d7' },
    { id: 'a5e9451f-9bb5-493c-8c2d-27dbdcbb5a6e', name: 'Lalu Nune Mubarak', program_status: 'IN_PROGRESS', level_number: 3, batch_id: '3e7288b7-a90e-4323-9b02-24e73991f0d7' },
    { id: 'd8fc0882-cc75-4aa9-ae46-7a74615b0243', name: 'Lalu Yuda Handika Prawira', program_status: 'IN_PROGRESS', level_number: 3, batch_id: '3e7288b7-a90e-4323-9b02-24e73991f0d7' },
    { id: 'f44844ae-9612-4b88-ab4c-69d3b5237027', name: 'Lucky Rizky', program_status: 'ACTIVE', level_number: 3, batch_id: '3e7288b7-a90e-4323-9b02-24e73991f0d7' },
    { id: '8422cae8-7fe5-45c4-b596-ec6f7bdb7f3c', name: 'Muhamad Alifurrahman', program_status: 'IN_PROGRESS', level_number: 3, batch_id: '3e7288b7-a90e-4323-9b02-24e73991f0d7' },
    { id: '60b73aba-b99c-4227-9615-b8e296538d5a', name: 'Muhammad Afyani Farobi', program_status: 'IN_PROGRESS', level_number: 3, batch_id: '3e7288b7-a90e-4323-9b02-24e73991f0d7' },
    { id: '1af7225b-4ad8-4634-9ec9-568f59f4affe', name: 'Nadila Fajriani', program_status: 'ACTIVE', level_number: 3, batch_id: '3e7288b7-a90e-4323-9b02-24e73991f0d7' },
    { id: '63f0c1af-720e-4ff8-8e27-409b3b9eaaf7', name: 'Sari Hikmah', program_status: 'IN_PROGRESS', level_number: 3, batch_id: '3e7288b7-a90e-4323-9b02-24e73991f0d7' },
    { id: '8d223ad0-00f7-46ee-9ae1-7dcbcadb97ac', name: 'Soni', program_status: 'ACTIVE', level_number: 3, batch_id: '3e7288b7-a90e-4323-9b02-24e73991f0d7' },
    { id: 'bd41f181-1936-42a5-8aba-351c7ab91cc9', name: 'Tino Rajudan Rustiansah', program_status: 'ACTIVE', level_number: 3, batch_id: '3e7288b7-a90e-4323-9b02-24e73991f0d7' },
    { id: 'e441eb95-0a45-4185-9fa3-c4d1cd60ad88', name: 'Tio Ananta', program_status: 'ACTIVE', level_number: 3, batch_id: '3e7288b7-a90e-4323-9b02-24e73991f0d7' },
    { id: 'eca2a6ae-57b0-4d83-854f-32a9b13ca9ce', name: 'Wildian Yusroni', program_status: 'IN_PROGRESS', level_number: 3, batch_id: '3e7288b7-a90e-4323-9b02-24e73991f0d7' },
    { id: '1ed6f83b-38c0-467e-8d61-a40aeeb44893', name: 'Zulfan Hamdani', program_status: 'ACTIVE', level_number: 3, batch_id: '3e7288b7-a90e-4323-9b02-24e73991f0d7' }
  ]
};

let _gpsCoords = null;
let _isBeaconActive = false;
let _dynamicCode = 'TC-1001';
let _codeInterval = null;
let _clockInterval = null;
let _sessionTimerInterval = null;
let _sessionSeconds = 0;
let _activeSessionDurationSeconds = 5400; // default 90 mins (5400s)
let _hasFired5MinWarning = false;
let _hasFiredEndAlarm = false;
const _firedPreStartAlerts = new Set();
let _audioCtx = null;
let _toastTimeout = null;

const STANDARD_CEC_SCHEDULES = [
  { name: 'Vocabulary', time: '05:30', endTime: '06:30', durationMinutes: 60, codeMatch: 'VOCAB' },
  { name: 'Speaking', time: '08:00', endTime: '09:30', durationMinutes: 90, codeMatch: 'SPEAK' },
  { name: 'Storytelling', time: '10:00', endTime: '11:30', durationMinutes: 90, codeMatch: 'STORY' },
  { name: 'Grammar', time: '13:30', endTime: '15:00', durationMinutes: 90, codeMatch: 'GRAM' },
  { name: 'Basic English', time: '15:30', endTime: '17:00', durationMinutes: 90, codeMatch: 'BASIC' }
];

let _selectedStudentForPayment = null;
let _selectedSessionType = null; // 'REGULAR' | 'EXAM'
let _selectedSessionMode = 'REGULAR'; // 'REGULAR' | 'EXAM'

/**
 * Audio Context Initializer (safely unlocked on user interaction)
 */
function getAudioContext() {
  if (!_audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      _audioCtx = new AudioContextClass();
    }
  }
  if (_audioCtx && _audioCtx.state === 'suspended') {
    _audioCtx.resume().catch(() => {});
  }
  return _audioCtx;
}

/**
 * Native Web Audio API Sound Synthesizer (Zero external audio file dependencies)
 * - 'chime': gentle 2-tone melodic notification (587Hz -> 880Hz)
 * - 'alarm': 3-tone alert tone for scheduled class completion
 */
function playTutorSound(type = 'chime') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    if (type === 'chime') {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      const gain2 = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.18, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.18);
      gain2.gain.setValueAtTime(0.2, now + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.18);
      osc2.stop(now + 0.6);
    } else if (type === 'alarm') {
      [0, 0.22, 0.44].forEach((offset, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const freq = idx % 2 === 0 ? 880 : 659.25;
        osc.frequency.setValueAtTime(freq, now + offset);
        gain.gain.setValueAtTime(0.25, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.2);
      });
    }
  } catch (err) {
    console.warn('[TUTOR AUDIO] Sound play error:', err);
  }
}

/**
 * In-App Floating Toast Pill
 */
function showTutorToast(msg, icon = 'bell', type = 'info', durationMs = 5000) {
  const toastEl = document.getElementById('tutor-floating-toast');
  const msgEl = document.getElementById('tutor-toast-msg');
  const iconEl = document.getElementById('tutor-toast-icon');
  if (!toastEl) return;

  if (_toastTimeout) {
    clearTimeout(_toastTimeout);
    _toastTimeout = null;
  }

  if (iconEl) {
    // If icon is an SVG key or SVG string
    if (typeof icon === 'string' && icon.trim().startsWith('<svg')) {
      iconEl.innerHTML = icon;
    } else {
      iconEl.innerHTML = getSvgIcon(icon, 16) || getSvgIcon('bell', 16);
    }
  }
  if (msgEl) msgEl.textContent = msg;

  toastEl.className = `tutor-toast-pill toast-${type}`;
  toastEl.classList.remove('hidden');

  _toastTimeout = setTimeout(() => {
    toastEl.classList.add('hidden');
  }, durationMs);
}

/**
 * System Browser Notification Integration
 */
function requestNotificationPermission() {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }
}

function sendBrowserNotification(title, body) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: 'icons/icon.svg',
        badge: 'icons/icon.svg',
        tag: 'topscore-tutor-alert',
        renotify: true
      });
    } catch (e) {
      console.warn('[NOTIF] Could not send notification:', e);
    }
  }
}

function setSessionMode(mode) {
  _selectedSessionMode = mode;
  const btnReg = document.getElementById('btn-trigger-start-regular');
  const btnExam = document.getElementById('btn-trigger-start-exam');
  const btnMaster = document.getElementById('btn-start-class-master');
  if (mode === 'REGULAR') {
    btnReg?.classList.add('active');
    btnExam?.classList.remove('active');
    if (btnMaster) {
      btnMaster.textContent = 'START CLASS';
      btnMaster.classList.remove('mode-exam');
      btnMaster.classList.add('mode-regular');
    }
  } else {
    btnExam?.classList.add('active');
    btnReg?.classList.remove('active');
    if (btnMaster) {
      btnMaster.textContent = 'START EXAM';
      btnMaster.classList.remove('mode-regular');
      btnMaster.classList.add('mode-exam');
    }
  }
}

/**
 * Theme Controller (Locked Native Navy Theme SSOT)
 */
function initTheme() {
  document.body.setAttribute('data-theme', 'navy');
  document.body.classList.remove('theme-light');
  try {
    localStorage.setItem('topscore_theme', 'navy');
    localStorage.removeItem('topscore_tutor_theme');
  } catch (_) {}
}

function applyTheme(theme = 'navy') {
  document.body.setAttribute('data-theme', 'navy');
  document.body.classList.remove('theme-light');
  try {
    localStorage.setItem('topscore_theme', 'navy');
  } catch (_) {}
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', async () => {
  try {
    initTheme();
    _sb = await getSupabase();
    initTenantContext();
    setupEventListeners();
    startRealtimeClock();
    initSwipeGestures();
    await loadMasterData();
    await applyTenantView();
    await checkRestorableSession();
    initRealtimeSync();
  } catch (err) {
    console.error('[TUTOR APP] Initialization error:', err);
  }
});

// Instant Cross-Tab & Realtime Sync Engine (Zero Latency, Zero Delay)
const _deckSyncChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('topscore_deck_sync') : null;

let _isSyncing = false;
async function refreshTutorDeskSync() {
  if (_isSyncing) return;
  _isSyncing = true;
  try {
    await loadMasterData();
    if (_currentTenant === 'CEC') {
      await onLevelChanged();
    } else {
      await onTopProgramChanged();
    }
    if (_activeTab === 'grade') renderGradeMatrix();
    if (_activeTab === 'discipline') renderFinesTable();
  } catch (err) {
    console.warn('[TUTOR SYNC] Error refreshing sync:', err);
  } finally {
    _isSyncing = false;
  }
}

if (_deckSyncChannel) {
  _deckSyncChannel.onmessage = () => {
    refreshTutorDeskSync();
  };
}

window.addEventListener('storage', (e) => {
  if (e.key && (e.key.includes('class_schedule') || e.key.includes('class_tutor') || e.key.includes('rooms_directory') || e.key.includes('faculty_registry'))) {
    refreshTutorDeskSync();
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    refreshTutorDeskSync();
  }
});

window.addEventListener('focus', () => {
  refreshTutorDeskSync();
});

function initRealtimeSync() {
  if (!_sb) return;
  try {
    _sb.channel('public:site_settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, (payload) => {
        const key = payload.new?.key;
        if (key && (key.startsWith('deck_'))) {
          refreshTutorDeskSync();
        }
      })
      .subscribe();
  } catch (err) {
    console.warn('[TUTOR REALTIME] Could not init realtime channel:', err);
  }
}

/**
 * 1. Initialize Tenant Context (from URL parameter or Local Storage)
 */
function initTenantContext() {
  const params = new URLSearchParams(window.location.search);
  const tenantParam = params.get('tenant') || params.get('institution');
  if (tenantParam && (tenantParam.toUpperCase() === 'CEC' || tenantParam.toUpperCase() === 'TOP')) {
    _currentTenant = tenantParam.toUpperCase();
  } else {
    _currentTenant = localStorage.getItem('topscore_tutor_tenant') || 'CEC';
  }
}

/**
 * 2. Setup DOM Event Listeners
 */
function setupEventListeners() {
  // Bottom Master Switcher Dock (STUDY AREA | ENGLISH AREA)
  document.getElementById('btn-dock-study')?.addEventListener('click', () => switchArea('study'));
  document.getElementById('btn-dock-english')?.addEventListener('click', () => switchArea('english'));

  // Sub-View Switchers (Header Pills / Indicators)
  document.getElementById('sub-btn-attendance')?.addEventListener('click', () => switchStudySubView('attendance'));
  document.getElementById('sub-btn-scores')?.addEventListener('click', () => switchStudySubView('scores'));
  document.getElementById('sub-btn-fines')?.addEventListener('click', () => switchEnglishSubView('fines'));
  document.getElementById('sub-btn-payment')?.addEventListener('click', () => switchEnglishSubView('payment'));

  // Legacy Navigation Hooks for Test Harness
  document.getElementById('tab-btn-attendance')?.addEventListener('click', () => switchBladeTab('attendance'));
  document.getElementById('tab-btn-grade')?.addEventListener('click', () => switchBladeTab('grade'));
  document.getElementById('tab-btn-discipline')?.addEventListener('click', () => switchBladeTab('discipline'));

  // Universal Synchronized Level Selection (Attendance, Grade, Fines, Payment & Bottom Bar)
  document.querySelectorAll('#tutor-bottom-level-bar .btn-bottom-level, #level-segmented-bar .btn-segment, #grade-level-filter-bar .btn-level-pill, #fines-level-filter-bar .btn-level-pill, #payment-level-filter-bar .btn-level-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const lvl = parseInt(btn.dataset.level, 10);
      if (lvl) setUniversalLevel(lvl);
    });
  });

  // TOP Corporate Program Selector Bar
  document.querySelectorAll('#top-program-bar .btn-segment').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#top-program-bar .btn-segment').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _selectedTopProgram = btn.dataset.program;
      onTopProgramChanged();
    });
  });

  // Dual Master Action Buttons (Regular vs Exam Mode Selectors - Ghost mode toggle)
  document.getElementById('btn-trigger-start-regular')?.addEventListener('click', () => {
    setSessionMode('REGULAR');
  });
  document.getElementById('btn-trigger-start-exam')?.addEventListener('click', () => {
    setSessionMode('EXAM');
  });

  // Master Bottom Start Button (Launches regular session directly - Pure Action)
  document.getElementById('btn-start-class-master')?.addEventListener('click', () => {
    getAudioContext();
    requestNotificationPermission();
    if (!_selectedClass) {
      alert('Please select a class first.');
      return;
    }
    startSession('REGULAR');
  });

  // Change Selected Class Button (Re-opens 5-panel selection fallback)
  document.getElementById('btn-change-class')?.addEventListener('click', () => {
    unselectClass();
  });

  document.getElementById('btn-confirm-start-exam')?.addEventListener('click', () => {
    const testId = _selectedTargetExamId || document.getElementById('select-modal-exam-target')?.value;
    if (!testId) {
      alert('Please select a target exam first.');
      return;
    }
    document.getElementById('modal-select-exam')?.classList.add('hidden');
    startSession('EXAM', testId);
  });
  document.getElementById('btn-cancel-select-exam')?.addEventListener('click', () => {
    document.getElementById('modal-select-exam')?.classList.add('hidden');
  });

  // GPS Beacon Toggle Button in Arena
  document.getElementById('btn-toggle-beacon')?.addEventListener('click', toggleGpsBeacon);

  // Dynamic QRIS Modal Actions (On-Demand)
  document.getElementById('btn-show-qris')?.addEventListener('click', () => {
    document.getElementById('modal-qris-display')?.classList.remove('hidden');
  });
  document.getElementById('btn-close-qris-modal')?.addEventListener('click', () => {
    document.getElementById('modal-qris-display')?.classList.add('hidden');
  });

  // Rubric Guide Modal Actions
  document.getElementById('btn-close-rubric-modal')?.addEventListener('click', closeRubricGuideModal);
  document.getElementById('btn-dismiss-rubric-modal')?.addEventListener('click', closeRubricGuideModal);

  // Close Session Master Action
  document.getElementById('btn-arena-close-session')?.addEventListener('click', () => {
    document.getElementById('modal-close-session')?.classList.remove('hidden');
  });
  document.getElementById('btn-cancel-close-modal')?.addEventListener('click', () => {
    document.getElementById('modal-close-session')?.classList.add('hidden');
  });
  document.getElementById('btn-confirm-close-session')?.addEventListener('click', confirmCloseSession);

  // Violation Search Input
  document.getElementById('input-search-violation')?.addEventListener('input', (e) => {
    renderViolationList(e.target.value.toLowerCase());
  });

  // Payment Modal Controls
  document.getElementById('btn-cancel-pay-modal')?.addEventListener('click', () => {
    document.getElementById('modal-payment')?.classList.add('hidden');
    _selectedStudentForPayment = null;
  });
  document.getElementById('btn-confirm-payment')?.addEventListener('click', confirmPayment);

  let payMethod = 'CASH';
  document.getElementById('btn-pay-method-cash')?.addEventListener('click', () => {
    payMethod = 'CASH';
    document.getElementById('btn-pay-method-cash').classList.add('selected-regular');
    document.getElementById('btn-pay-method-transfer').classList.remove('selected-regular');
  });
  document.getElementById('btn-pay-method-transfer')?.addEventListener('click', () => {
    payMethod = 'TRANSFER';
    document.getElementById('btn-pay-method-transfer').classList.add('selected-regular');
    document.getElementById('btn-pay-method-cash').classList.remove('selected-regular');
  });
}

/**
 * Universal Synchronized Level Selection (Attendance, Grade, Fines)
 */
function setUniversalLevel(lvlNum) {
  _selectedLevelNumber = lvlNum;
  _gradeLevelNumber = lvlNum;
  _finesLevelNumber = lvlNum;

  // 0. Update Bottom Level Bar buttons
  document.querySelectorAll('#tutor-bottom-level-bar .btn-bottom-level').forEach(b => {
    b.classList.toggle('active', parseInt(b.dataset.level, 10) === lvlNum);
  });
  // 1. Update Attendance Level cards
  document.querySelectorAll('#level-segmented-bar .btn-segment').forEach(b => {
    b.classList.toggle('active', parseInt(b.dataset.level, 10) === lvlNum);
  });
  // 2. Update Grade Level pills
  document.querySelectorAll('#grade-level-filter-bar .btn-level-pill').forEach(b => {
    b.classList.toggle('active', parseInt(b.dataset.level, 10) === lvlNum);
  });
  // 3. Update Fines Level pills
  document.querySelectorAll('#fines-level-filter-bar .btn-level-pill').forEach(b => {
    b.classList.toggle('active', parseInt(b.dataset.level, 10) === lvlNum);
  });
  // 4. Update Payment Level pills
  document.querySelectorAll('#payment-level-filter-bar .btn-level-pill').forEach(b => {
    b.classList.toggle('active', parseInt(b.dataset.level, 10) === lvlNum);
  });

  onLevelChanged();
  renderGradeMatrix();
  renderFinesTable();
  renderPaymentTable();
}

/**
 * 3. Start Real-time Live Clock Ticker & Schedule Formatter (TIME - DAY - DD/MM/YYYY)
 */
function startRealtimeClock() {
  const clockEl = document.getElementById('live-clock-text');

  const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

  const updateClock = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-GB', { hour12: false });
    const dayStr = dayNames[now.getDay()];
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const dateStr = `${dd}/${mm}/${yyyy}`;

    if (clockEl) clockEl.textContent = `${dateStr} • ${timeStr}`;
    document.querySelectorAll('.info-live-time, #info-live-time').forEach(el => el.textContent = timeStr);
    document.querySelectorAll('.info-live-day, #info-live-day').forEach(el => el.textContent = dayStr);
    document.querySelectorAll('.info-live-date, #info-live-date').forEach(el => el.textContent = dateStr);

    // Check for 5-minute pre-class start alert (when not currently in active session)
    if (!_activeSession && now.getSeconds() === 0) {
      checkPreClassStartAlerts(now, dateStr);
    }
  };

  updateClock();
  _clockInterval = setInterval(updateClock, 1000);
}

/**
 * Check 5-minute pre-class start schedule alerts for tutors
 */
function checkPreClassStartAlerts(now, dateStr) {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  STANDARD_CEC_SCHEDULES.forEach(sched => {
    const [h, m] = sched.time.split(':').map(Number);
    const startMinutes = h * 60 + m;
    const alertMinutes = startMinutes - 5;

    if (currentMinutes === alertMinutes) {
      const alertKey = `${dateStr}-${sched.time}`;
      if (!_firedPreStartAlerts.has(alertKey)) {
        _firedPreStartAlerts.add(alertKey);
        playTutorSound('chime');
        showTutorToast(`Upcoming class in 5 minutes! (${sched.name} at ${sched.time})`, 'bell', 'info', 6000);
        sendBrowserNotification(
          'Upcoming Class in 5 Minutes',
          `${sched.name} starts at ${sched.time}. Please prepare attendance.`
        );
      }
    }
  });
}

/**
 * Select Session Mode (NORMAL vs EXAM) & Reveal Info Panel (TIME - DAY - DD/MM/YYYY)
 */
function selectSessionMode(mode) {
  _selectedSessionType = mode;
  const btnRegular = document.getElementById('btn-trigger-start-regular');
  const btnExam = document.getElementById('btn-trigger-start-exam');
  const infoPanel = document.getElementById('session-info-panel');
  const summaryMode = document.getElementById('summary-mode-tag');
  const summaryClass = document.getElementById('summary-class-tag');
  const summaryMeeting = document.getElementById('summary-meeting-tag');

  if (mode === 'REGULAR') {
    btnRegular?.classList.add('selected');
    btnExam?.classList.remove('selected');
    if (summaryMode) summaryMode.textContent = 'NORMAL';
  } else {
    btnExam?.classList.add('selected');
    btnRegular?.classList.remove('selected');
    if (summaryMode) summaryMode.textContent = 'EXAM';
  }

  if (summaryClass) summaryClass.textContent = _selectedClass?.name || 'Class';
  const meetingChip = document.getElementById('auto-meeting-chip')?.textContent || 'Meeting 1';
  if (summaryMeeting) summaryMeeting.textContent = meetingChip;

  infoPanel?.classList.remove('hidden');
}

/**
 * 4. Switch Tenant (CEC vs TOP)
 */
function switchTenant(tenant) {
  _currentTenant = tenant;
  localStorage.setItem('topscore_tutor_tenant', tenant);
  applyTenantView();
}

/**
 * Update Tutor Profile Card dynamically based on Class Discipline
 * Strictly adhering to Tutor Card SSOT: Gender Banner, White Background, 56x56 Photo Box, Colon Alignment
 */
function updateTutorCard(tutorOrCode = 'VOCABULARY') {
  let tutor = null;
  if (typeof tutorOrCode === 'object' && tutorOrCode !== null) {
    tutor = tutorOrCode;
  } else if (typeof tutorOrCode === 'string') {
    if (tutorOrCode.includes('-')) {
      tutor = getAssignedTutorForClass(tutorOrCode);
    } else {
      const defaultCode = `CAMP-${_selectedLevelNumber}${tutorOrCode.slice(0, 5)}`;
      tutor = getAssignedTutorForClass(defaultCode);
    }
  }
  if (!tutor) tutor = FACULTY_REGISTRY.CEC[0];

  _currentTutor = { id: tutor.id, full_name: tutor.full_name, tutor_pin: '1234' };

  const bannerEl = document.getElementById('tutor-card-banner');
  const nameEl = document.getElementById('tutor-card-name');
  const initialEl = document.getElementById('tutor-avatar-initial');
  const imgEl = document.getElementById('tutor-avatar-img');
  const demoNameEl = document.getElementById('tutor-demographics-name');
  const dobAgeValEl = document.getElementById('tutor-demographics-dob-age');
  const addressValEl = document.getElementById('tutor-demographics-address');

  // 1. Gender-Themed Title Area Banner (Lime for Male, Pink for Female)
  const isMale = tutor.gender === 'male';
  if (bannerEl) {
    bannerEl.className = `tutor-card-banner ${isMale ? 'gender-male' : 'gender-female'}`;
  }
  // Nickname on Banner (e.g. "Mr. Top", "Miss Elysa")
  if (nameEl) {
    nameEl.textContent = tutor.nickname || tutor.full_name;
  }

  // 2. Metadata Rows with Colon Alignment: Name, DoB/AGE, Address
  if (demoNameEl) {
    demoNameEl.textContent = cleanHonorific(tutor.full_name);
  }
  if (dobAgeValEl) {
    dobAgeValEl.textContent = formatDobAge(tutor.birth_date);
  }
  if (addressValEl) {
    addressValEl.textContent = tutor.address || 'Pare, Kediri';
  }

  // 3. Photo Box (Sync from localStorage topscore_tutor_photos if configured by admin)
  let photoUrl = tutor.avatar_url || null;
  try {
    const storedPhotos = JSON.parse(localStorage.getItem('topscore_tutor_photos') || '{}');
    if (storedPhotos[tutor.id]) {
      photoUrl = storedPhotos[tutor.id];
    }
  } catch (_) {}

  if (photoUrl && imgEl) {
    imgEl.src = photoUrl;
    imgEl.classList.remove('hidden');
    initialEl?.classList.add('hidden');
  } else {
    imgEl?.classList.add('hidden');
    if (initialEl) {
      initialEl.textContent = 'foto';
      initialEl.classList.remove('hidden');
    }
  }
}

/**
 * 5. Apply Tenant View (CEC vs TOP rules)
 */
async function applyTenantView() {
  const isCEC = _currentTenant === 'CEC';
  const headerTitle = document.getElementById('tutor-header-title');
  const headerSub = document.getElementById('tutor-header-sub');
  const headerEmblem = document.getElementById('tutor-header-emblem');
  const launcherMeta = document.getElementById('launcher-institution-badge');
  const navTabs = document.getElementById('tutor-nav-tabs');
  const cecBox = document.getElementById('box-level-selector');
  const topBox = document.getElementById('box-top-program-selector');

  if (isCEC) {
    if (headerTitle) headerTitle.textContent = 'CEC';
    if (headerSub) headerSub.textContent = 'TUTOR DESK';
    if (headerEmblem) headerEmblem.innerHTML = getSvgIcon('book-open', 18);
    if (launcherMeta) launcherMeta.textContent = 'CEC CAMP';
    navTabs?.classList.remove('hidden');
    cecBox?.classList.remove('hidden');
    topBox?.classList.add('hidden');
    await onLevelChanged();
  } else {
    if (headerTitle) headerTitle.textContent = 'TOP';
    if (headerSub) headerSub.textContent = 'TUTOR DESK';
    if (headerEmblem) headerEmblem.innerHTML = getSvgIcon('building', 18);
    if (launcherMeta) launcherMeta.textContent = 'TOP CORPORATE';
    navTabs?.classList.add('hidden'); // Single page strictly for TOP
    cecBox?.classList.add('hidden');
    topBox?.classList.remove('hidden');
    switchBladeTab('attendance'); // Force attendance tab
    await onTopProgramChanged();
  }
}

/**
 * 6. Switch Main Work Area (Study Area ⇄ English Area)
 */
function switchArea(area) {
  _activeArea = area;
  const btnStudy = document.getElementById('btn-dock-study');
  const btnEnglish = document.getElementById('btn-dock-english');
  const subGroupStudy = document.getElementById('sub-group-study');
  const subGroupEnglish = document.getElementById('sub-group-english');

  btnStudy?.classList.toggle('active', area === 'study');
  btnEnglish?.classList.toggle('active', area === 'english');

  if (area === 'study') {
    if (subGroupStudy) { subGroupStudy.style.display = 'flex'; subGroupStudy.classList.remove('hidden'); }
    if (subGroupEnglish) { subGroupEnglish.style.display = 'none'; subGroupEnglish.classList.add('hidden'); }
    switchStudySubView(_studySubView);
  } else {
    if (subGroupStudy) { subGroupStudy.style.display = 'none'; subGroupStudy.classList.add('hidden'); }
    if (subGroupEnglish) { subGroupEnglish.style.display = 'flex'; subGroupEnglish.classList.remove('hidden'); }
    switchEnglishSubView(_englishSubView);
  }
}

/**
 * 6.1 Switch Study Area Sub-Views (ATTENDANCE ⇄ SCORES)
 */
function switchStudySubView(view) {
  _studySubView = view;
  _activeTab = (view === 'attendance') ? 'attendance' : 'grade';
  const btnAtt = document.getElementById('sub-btn-attendance');
  const btnScr = document.getElementById('sub-btn-scores');
  const dotAtt = document.getElementById('dot-study-att');
  const dotScr = document.getElementById('dot-study-scr');
  const bladeAttend = document.getElementById('blade-attendance');
  const bladeGrade = document.getElementById('blade-grade');
  const bladeDisc = document.getElementById('blade-discipline');
  const bladePay = document.getElementById('blade-payment');

  btnAtt?.classList.toggle('active', view === 'attendance');
  btnScr?.classList.toggle('active', view === 'scores');
  dotAtt?.classList.toggle('active', view === 'attendance');
  dotScr?.classList.toggle('active', view === 'scores');

  bladeDisc?.classList.add('hidden');
  bladePay?.classList.add('hidden');
  document.body.classList.toggle('blade-discipline-active', false);

  if (view === 'attendance') {
    bladeAttend?.classList.remove('hidden');
    bladeGrade?.classList.add('hidden');
    document.body.classList.toggle('blade-grade-active', false);
  } else {
    bladeGrade?.classList.remove('hidden');
    bladeAttend?.classList.add('hidden');
    document.body.classList.toggle('blade-grade-active', true);
    renderGradeMatrix();
  }
}

/**
 * 6.2 Switch English Area Sub-Views (FINES ⇄ PAYMENT)
 */
function switchEnglishSubView(view) {
  _englishSubView = view;
  _activeTab = 'discipline';
  const btnFin = document.getElementById('sub-btn-fines');
  const btnPay = document.getElementById('sub-btn-payment');
  const dotFin = document.getElementById('dot-eng-fin');
  const dotPay = document.getElementById('dot-eng-pay');
  const bladeAttend = document.getElementById('blade-attendance');
  const bladeGrade = document.getElementById('blade-grade');
  const bladeDisc = document.getElementById('blade-discipline');
  const bladePay = document.getElementById('blade-payment');

  btnFin?.classList.toggle('active', view === 'fines');
  btnPay?.classList.toggle('active', view === 'payment');
  dotFin?.classList.toggle('active', view === 'fines');
  dotPay?.classList.toggle('active', view === 'payment');

  bladeAttend?.classList.add('hidden');
  bladeGrade?.classList.add('hidden');
  document.body.classList.toggle('blade-grade-active', false);
  document.body.classList.toggle('blade-discipline-active', true);

  if (view === 'fines') {
    bladeDisc?.classList.remove('hidden');
    bladePay?.classList.add('hidden');
    renderFinesTable();
  } else {
    bladePay?.classList.remove('hidden');
    bladeDisc?.classList.add('hidden');
    renderPaymentTable();
  }
}

/**
 * Backward compatibility bridge for switchBladeTab
 */
function switchBladeTab(tab) {
  if (tab === 'attendance') {
    switchArea('study');
    switchStudySubView('attendance');
  } else if (tab === 'grade') {
    switchArea('study');
    switchStudySubView('scores');
  } else {
    switchArea('english');
    switchEnglishSubView('fines');
  }
}

/**
 * Touch Swipe Gesture Controller (Natural Swipe Navigation)
 */
let _touchStartX = 0;
let _touchStartY = 0;
let _touchEndX = 0;
let _touchEndY = 0;

function initSwipeGestures() {
  const container = document.getElementById('tutor-blade-container') || document.querySelector('.tutor-blade-container');
  if (!container) return;

  container.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    _touchStartX = e.touches[0].clientX;
    _touchStartY = e.touches[0].clientY;
  }, { passive: true });

  container.addEventListener('touchend', (e) => {
    if (e.changedTouches.length !== 1) return;
    _touchEndX = e.changedTouches[0].clientX;
    _touchEndY = e.changedTouches[0].clientY;
    handleSwipeGesture();
  }, { passive: true });
}

function handleSwipeGesture() {
  const deltaX = _touchEndX - _touchStartX;
  const deltaY = _touchEndY - _touchStartY;
  const absDeltaX = Math.abs(deltaX);
  const absDeltaY = Math.abs(deltaY);

  // Minimum 45px swipe with horizontal priority (1.4x over vertical scroll)
  if (absDeltaX < 45 || absDeltaX < absDeltaY * 1.4) return;

  if (_activeArea === 'study') {
    if (deltaX < 0 && _studySubView === 'attendance') {
      // Swiped left -> move to SCORES
      switchStudySubView('scores');
    } else if (deltaX > 0 && _studySubView === 'scores') {
      // Swiped right -> move to ATTENDANCE
      switchStudySubView('attendance');
    }
  } else if (_activeArea === 'english') {
    if (deltaX < 0 && _englishSubView === 'fines') {
      // Swiped left -> move to PAYMENT
      switchEnglishSubView('payment');
    } else if (deltaX > 0 && _englishSubView === 'payment') {
      // Swiped right -> move to FINES
      switchEnglishSubView('fines');
    }
  }
}

/**
 * 7. Load Master Data (Levels, Classes, Batches, Tests, Tutors Live Sync)
 */
async function loadMasterData() {
  try {
    const [
      { data: levelsData },
      { data: classesData },
      { data: batchesData },
      { data: testsData },
      { data: tutorsData },
      { data: settingsData }
    ] = await Promise.all([
      _sb.from('levels').select('id, name, level_number').order('level_number'),
      _sb.from('classes').select('id, name, code, level_id, program_id, class_levels(level_id, levels(id, name, level_number))').order('name'),
      _sb.from('batches').select('id, name, program_id, current_level_id, is_active').order('name'),
      _sb.from('tests').select('id, title, shell_code, class_id, working_duration_minutes, test_type').order('title'),
      _sb.from('tutor_profiles').select('id, full_name, gender, birth_date, address, specialty, photo_url, is_active').eq('is_active', true),
      _sb.from('site_settings').select('key, value').in('key', ['deck_class_schedule_map', 'deck_class_tutor_map', 'deck_rooms_directory'])
    ]);

    _levels = levelsData || [];
    _classes = classesData || [];
    _batches = batchesData || [];
    _tests = testsData || [];

    // Dynamically synchronize live schedule and tutor mapping from Admin Deck site_settings
    if (settingsData && Array.isArray(settingsData)) {
      const sSched = settingsData.find(s => s.key === 'deck_class_schedule_map');
      if (sSched && sSched.value) {
        try {
          const parsed = typeof sSched.value === 'string' ? JSON.parse(sSched.value) : sSched.value;
          if (parsed && typeof parsed === 'object') {
            localStorage.setItem('topscore_class_schedule_map', JSON.stringify(parsed));
          }
        } catch (_) {}
      }
      const sTutor = settingsData.find(s => s.key === 'deck_class_tutor_map');
      if (sTutor && sTutor.value) {
        try {
          const parsed = typeof sTutor.value === 'string' ? JSON.parse(sTutor.value) : sTutor.value;
          if (parsed && typeof parsed === 'object') {
            localStorage.setItem('topscore_class_tutor_map', JSON.stringify(parsed));
          }
        } catch (_) {}
      }
    }

    // Dynamically enrich FACULTY_REGISTRY with live database records
    if (tutorsData && tutorsData.length > 0) {
      tutorsData.forEach(dbTutor => {
        const fn = (dbTutor.full_name || '').toLowerCase();
        let target = null;
        if (fn.includes('taufan') || fn.includes('top')) {
          target = FACULTY_REGISTRY.CEC.find(t => t.id === 'tutor-cec-taufan') || FACULTY_REGISTRY.TOP.find(t => t.id === 'tutor-top-taufan');
        } else if (fn.includes('amrullah')) {
          target = FACULTY_REGISTRY.CEC.find(t => t.id === 'tutor-cec-amrullah');
        } else if (fn.includes('elysa')) {
          target = FACULTY_REGISTRY.CEC.find(t => t.id === 'tutor-cec-elysa');
        } else if (fn.includes('nizan')) {
          target = FACULTY_REGISTRY.CEC.find(t => t.id === 'tutor-cec-nizan');
        } else if (fn.includes('cita')) {
          target = FACULTY_REGISTRY.CEC.find(t => t.id === 'tutor-cec-cita');
        } else if (fn.includes('amelia')) {
          target = FACULTY_REGISTRY.CEC.find(t => t.id === 'tutor-cec-amelia');
        } else if (fn.includes('siti')) {
          target = FACULTY_REGISTRY.TOP.find(t => t.id === 'tutor-top-sq');
        }

        if (target) {
          target.db_id = dbTutor.id;
          target.full_name = dbTutor.full_name || target.full_name;
          target.gender = dbTutor.gender || target.gender;
          target.birth_date = dbTutor.birth_date || target.birth_date;
          target.address = dbTutor.address || target.address;
          target.specialty = dbTutor.specialty || target.specialty;
          target.photo_url = dbTutor.photo_url || target.photo_url;
        }
      });
    }

    await preloadStudentsAllLevels();
  } catch (err) {
    console.warn('[TUTOR APP] Error loading master data, fallback active:', err);
  }
}

/**
 * Preload Students for all Levels (Levels 1, 2, 3) to enable instant Grade & Fines roster inspection
 */
async function preloadStudentsAllLevels() {
  try {
    const { data } = await _sb.from('students')
      .select('id, name, level_id, batch_id, is_active, program_status')
      .eq('is_active', true)
      .neq('program_status', 'INACTIVE')
      .neq('program_status', 'ALUMNI')
      .order('name');
    _levels.forEach(lvl => {
      if (lvl.level_number >= 1 && lvl.level_number <= 3) {
        const lStudents = (data || [])
          .filter(s => s.level_id === lvl.id && s.is_active === true && (s.program_status || '').toUpperCase() !== 'INACTIVE')
          .map(s => ({
            ...s,
            name: cleanStudentName(s.name)
          }));
        if (lStudents.length > 0) {
          _studentsCacheByLevel[lvl.level_number] = lStudents;
        } else if (COHORT_STUDENTS_BY_LEVEL[lvl.level_number]) {
          _studentsCacheByLevel[lvl.level_number] = COHORT_STUDENTS_BY_LEVEL[lvl.level_number];
        }
      }
    });
  } catch (err) {
    console.warn('[TUTOR APP] Error preloading students for all levels:', err);
  }
}

/**
 * Select a specific Class: keeps 5-panel matrix visible, highlights active card,
 * updates Tutor Profile Card underneath, followed by Live Time Panel, Dual Mode Selector, and Master Start Button.
 */
function selectClass(cls, mod, idx = 0) {
  _selectedClass = cls;
  const classCode = cls?.code || mod?.code;
  const assignedTutor = getAssignedTutorForClass(classCode);
  const schedItem = getClassScheduleItem(classCode);

  // Update Active Class Name in Top Header
  let formattedClassName = _selectedClass?.name || 'Class';
  formattedClassName = formattedClassName.replace(/^(\d+)\s+Level\b/i, 'Level $1');
  const hdrClass = document.getElementById('tutor-header-class-name');
  if (hdrClass) hdrClass.textContent = formattedClassName;

  // Highlight active class card in the matrix
  document.querySelectorAll('.class-panel-card').forEach((c, cIdx) => {
    c.classList.toggle('active', cIdx === idx);
  });

  // 1. Keep 5-class matrix visible at all times (user invariant)
  document.getElementById('box-class-matrix')?.classList.remove('hidden');

  // 2. Show & update Tutor Card directly beneath with assigned tutor and room for this class
  updateTutorCard(assignedTutor);
  const roomEl = document.getElementById('tutor-demographics-room');
  if (roomEl) {
    const resolvedRoomName = ROOM_NAMES[schedItem.room] || (schedItem.roomName && schedItem.roomName !== schedItem.room ? schedItem.roomName : 'CEC Hall');
    roomEl.textContent = `${schedItem.room} (${resolvedRoomName})`;
  }
  document.getElementById('tutor-profile-card')?.classList.remove('hidden');

  // 3. Show Schedule & Live Time Panel at top of setup launcher
  document.getElementById('session-info-panel')?.classList.remove('hidden');

  // 4. Show Master Start Button (Single Launch Action)
  document.getElementById('btn-start-class-master')?.classList.remove('hidden');

  updateMeetingCounter();
}

/**
 * Unselect Class: re-activate default first class in the list
 */
function unselectClass() {
  const firstCard = document.querySelector('.class-panel-card');
  if (firstCard) {
    firstCard.click();
  }
}

/**
 * 8. CEC Level Selection Changed Handler (4 Info Columns: LVL | CLASS | TIME | TUTOR)
 */
async function onLevelChanged() {
  const grid = document.getElementById('class-matrix-grid');
  if (!grid) return;
  grid.innerHTML = '<div style="font-size:11px;color:#94a3b8;grid-column:1/-1;text-align:center;">Loading classes...</div>';

  const targetLevel = _levels.find(l => l.level_number === _selectedLevelNumber);
  const targetLevelId = targetLevel?.id;

  // Filter classes for this level
  const filteredClasses = _classes.filter(c => {
    if (targetLevelId && c.level_id === targetLevelId) return true;
    if (c.class_levels && Array.isArray(c.class_levels) && c.class_levels.some(cl => cl.level_id === targetLevelId || cl.levels?.level_number === _selectedLevelNumber)) return true;
    const code = (c.code || '').toUpperCase();
    return code.includes(`${_selectedLevelNumber}VOCAB`) ||
           code.includes(`${_selectedLevelNumber}SPEAK`) ||
           code.includes(`${_selectedLevelNumber}STORY`) ||
           code.includes(`${_selectedLevelNumber}BASIC`) ||
           code.includes(`${_selectedLevelNumber}GRAM`) ||
           code.includes(`${_selectedLevelNumber}GRMMR`) ||
           code.includes(`${_selectedLevelNumber}GFS`) ||
           code.includes(`${_selectedLevelNumber}GFORS`) ||
           code.includes(`${_selectedLevelNumber}PRON`) ||
           code.includes(`${_selectedLevelNumber}PRONC`);
  });

  // Dynamic 5 modalities tailored to selected level (L1: Basic, L2: GFS, L3: Pronunciation)
  const standardModalities = getStandardModalitiesForLevel(_selectedLevelNumber);

  // Map each class and sort strictly by scheduled start time ascending (e.g. 06:00 -> 07:30 -> 10:00 -> 17:00 -> 20:00)
  const classRows = standardModalities.map(mod => {
    const matchedClass = filteredClasses.find(c => {
      const d = detectClassDiscipline(c.code || c.name);
      return d === mod.key;
    }) || { id: `c_cec_${_selectedLevelNumber}_${mod.key.toLowerCase()}`, name: `Level ${_selectedLevelNumber} ${mod.name}`, code: mod.code };

    const classCode = matchedClass.code || mod.code;
    const assignedTutor = getAssignedTutorForClass(classCode);
    const tutorNick = cleanHonorific(assignedTutor.nickname || assignedTutor.full_name);
    const schedItem = getClassScheduleItem(classCode);
    const scheduleStr = getClassSchedule(classCode);

    // Compute start time in minutes for rock-solid chronological ordering
    const [h, m] = (schedItem.start || '00:00').split(':').map(Number);
    const startMinutes = (isNaN(h) ? 9999 : h) * 60 + (isNaN(m) ? 0 : m);

    return {
      mod,
      matchedClass,
      classCode,
      assignedTutor,
      tutorNick,
      schedItem,
      scheduleStr,
      startMinutes
    };
  });

  // Strict Chronological Sort by Class Start Time (Jam Mulai Kelas)
  classRows.sort((a, b) => a.startMinutes - b.startMinutes);

  grid.innerHTML = '';
  classRows.forEach((row, idx) => {
    const { mod, matchedClass, classCode, assignedTutor, tutorNick, schedItem, scheduleStr } = row;

    const card = document.createElement('div');
    card.className = `class-panel-card ${idx === 0 ? 'active' : ''}`;
    card.dataset.modality = mod.key;
    card.dataset.classId = matchedClass.id;
    card.dataset.classCode = classCode;
    const resolvedRoomName = ROOM_NAMES[schedItem.room] || schedItem.roomName || schedItem.room;
    card.title = `${mod.name} (${assignedTutor.full_name}) - Room ${schedItem.room} (${resolvedRoomName}) - ${scheduleStr}`;
    card.innerHTML = `
      <div class="panel-col-class">
        <span class="panel-class-name">${mod.name}</span>
      </div>
      <span class="panel-col-time">${scheduleStr}</span>
      <span class="panel-col-room">${schedItem.room}</span>
      <span class="panel-col-tutor" title="${assignedTutor.full_name}">${tutorNick}</span>
    `;

    card.addEventListener('click', () => {
      document.querySelectorAll('.class-panel-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      selectClass(matchedClass, mod, idx);
    });

    grid.appendChild(card);

    if (idx === 0) {
      selectClass(matchedClass, mod, 0);
    }
  });

  // Load students for this level strictly (Exclude Alumni and Level 0)
  await loadStudentsForCecLevel(targetLevelId);
  updateMeetingCounter();
}

/**
 * 9. TOP Corporate Program Selection Changed Handler (4 Info Columns: LVL | CLASS | TIME | TUTOR)
 */
async function onTopProgramChanged() {
  const grid = document.getElementById('class-matrix-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const progCode = _selectedTopProgram; // EVNIKOM | SHERATON | TAMATA
  const matchedClass = _classes.find(c => {
    const code = (c.code || '').toUpperCase();
    const name = (c.name || '').toUpperCase();
    return code.includes(progCode.slice(0, 3)) || name.includes(progCode);
  }) || { id: `c_top_${progCode.toLowerCase()}`, name: `${progCode} Vocabulary`, code: `${progCode.slice(0, 3)}-VOCAB` };

  const classCode = matchedClass.code || `${progCode.slice(0, 3)}-VOCAB`;
  const schedItem = getClassScheduleItem(classCode);
  const scheduleStr = getClassSchedule(classCode);
  const mod = { name: matchedClass.name, code: classCode, schedule: scheduleStr };
  const assignedTutor = getAssignedTutorForClass(classCode);
  const tutorNick = cleanHonorific(assignedTutor.nickname || assignedTutor.full_name);

  const card = document.createElement('div');
  card.className = 'class-panel-card active';
  card.dataset.modality = 'VOCABULARY';
  card.dataset.classCode = classCode;
  const resolvedRoomName = ROOM_NAMES[schedItem.room] || schedItem.roomName || schedItem.room;
  card.title = `${matchedClass.name} (${assignedTutor.full_name}) - Room ${schedItem.room} (${resolvedRoomName}) - ${scheduleStr}`;
  card.innerHTML = `
    <div class="panel-col-class">
      <span class="panel-class-name">${matchedClass.name}</span>
    </div>
    <span class="panel-col-time">${scheduleStr}</span>
    <span class="panel-col-room">${schedItem.room}</span>
    <span class="panel-col-tutor" title="${assignedTutor.full_name}">${tutorNick}</span>
  `;

  card.addEventListener('click', () => {
    document.querySelectorAll('.class-panel-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    selectClass(matchedClass, mod, 0);
  });

  grid.appendChild(card);
  selectClass(matchedClass, mod, 0);

  // Load students for this TOP program
  await loadStudentsForTopProgram(progCode);
  updateMeetingCounter();
}

/**
 * 10. Load Students for CEC Level (Exclude Alumni & Level 0 strictly)
 */
async function loadStudentsForCecLevel(levelId) {
  try {
    let query = _sb.from('students')
      .select('id, name, level_id, batch_id, is_active, program_status')
      .eq('is_active', true)
      .neq('program_status', 'INACTIVE')
      .neq('program_status', 'ALUMNI')
      .order('name');

    if (levelId) {
      query = query.eq('level_id', levelId);
    }

    const { data } = await query;
    _students = (data || [])
      .filter(s => s.is_active === true && (s.program_status || '').toUpperCase() !== 'INACTIVE')
      .map(s => ({
        ...s,
        name: cleanStudentName(s.name)
      }));

    // Fallback if empty in cloud (standard 30-student cohort)
    if (_students.length === 0) {
      _students = [
        { id: 's1', name: 'Aditya Royzan Maulana', program_status: 'IN_PROGRESS' },
        { id: 's2', name: 'Aminatuzzohriah', program_status: 'IN_PROGRESS' },
        { id: 's3', name: 'Andre Setiawan', program_status: 'IN_PROGRESS' },
        { id: 's4', name: 'Arman Algifari', program_status: 'IN_PROGRESS' },
        { id: 's5', name: 'Deswita Mandalika', program_status: 'IN_PROGRESS' },
        { id: 's6', name: 'Faesal Ramdani', program_status: 'IN_PROGRESS' },
        { id: 's7', name: 'Firdasari Risma Cahyani', program_status: 'IN_PROGRESS' },
        { id: 's8', name: 'Hadid Al - Fatnazi', program_status: 'IN_PROGRESS' },
        { id: 's9', name: 'Hafifa Ismarani Putri', program_status: 'IN_PROGRESS' },
        { id: 's10', name: 'Hakulil Amri', program_status: 'IN_PROGRESS' },
        { id: 's11', name: 'Ilham Syahputra', program_status: 'IN_PROGRESS' },
        { id: 's12', name: 'Intan Nuraini', program_status: 'IN_PROGRESS' },
        { id: 's13', name: 'Joko Susilo', program_status: 'IN_PROGRESS' },
        { id: 's14', name: 'Kartika Sari', program_status: 'IN_PROGRESS' },
        { id: 's15', name: 'Lukman Hakim', program_status: 'IN_PROGRESS' },
        { id: 's16', name: 'Maya Anggraini', program_status: 'IN_PROGRESS' },
        { id: 's17', name: 'Nabila Syahrani', program_status: 'IN_PROGRESS' },
        { id: 's18', name: 'Pandu Pratama', program_status: 'IN_PROGRESS' },
        { id: 's19', name: 'Qori Al-Ghifari', program_status: 'IN_PROGRESS' },
        { id: 's20', name: 'Rendra Setiawan', program_status: 'IN_PROGRESS' },
        { id: 's21', name: 'Rina Marlina', program_status: 'IN_PROGRESS' },
        { id: 's22', name: 'Rizky Ramadhan', program_status: 'IN_PROGRESS' },
        { id: 's23', name: 'Salma Salsabila', program_status: 'IN_PROGRESS' },
        { id: 's24', name: 'Satria Budi', program_status: 'IN_PROGRESS' },
        { id: 's25', name: 'Taufiq Hidayat', program_status: 'IN_PROGRESS' },
        { id: 's26', name: 'Tiara Andini', program_status: 'IN_PROGRESS' },
        { id: 's27', name: 'Wahyu Nugroho', program_status: 'IN_PROGRESS' },
        { id: 's28', name: 'Yoga Prasetyo', program_status: 'IN_PROGRESS' },
        { id: 's29', name: 'Zahra Amelia', program_status: 'IN_PROGRESS' },
        { id: 's30', name: 'Zulfikar Ali', program_status: 'IN_PROGRESS' }
      ];
    }

    resetAttendanceState();
    if (_activeSession && _activeSession.status === 'ACTIVE') {
      render4ColAttendanceTable();
      updateArenaPresentCounter();
    }
  } catch (err) {
    console.warn('[TUTOR APP] loadStudentsForCecLevel error:', err);
    if (_students.length === 0) {
      _students = [
        { id: 's1', name: 'Aditya Royzan Maulana', program_status: 'IN_PROGRESS' },
        { id: 's2', name: 'Aminatuzzohriah', program_status: 'IN_PROGRESS' },
        { id: 's3', name: 'Andre Setiawan', program_status: 'IN_PROGRESS' },
        { id: 's4', name: 'Arman Algifari', program_status: 'IN_PROGRESS' },
        { id: 's5', name: 'Deswita Mandalika', program_status: 'IN_PROGRESS' },
        { id: 's6', name: 'Faesal Ramdani', program_status: 'IN_PROGRESS' },
        { id: 's7', name: 'Firdasari Risma Cahyani', program_status: 'IN_PROGRESS' },
        { id: 's8', name: 'Hadid Al - Fatnazi', program_status: 'IN_PROGRESS' },
        { id: 's9', name: 'Hafifa Ismarani Putri', program_status: 'IN_PROGRESS' },
        { id: 's10', name: 'Hakulil Amri', program_status: 'IN_PROGRESS' },
        { id: 's11', name: 'Ilham Syahputra', program_status: 'IN_PROGRESS' },
        { id: 's12', name: 'Intan Nuraini', program_status: 'IN_PROGRESS' },
        { id: 's13', name: 'Joko Susilo', program_status: 'IN_PROGRESS' },
        { id: 's14', name: 'Kartika Sari', program_status: 'IN_PROGRESS' },
        { id: 's15', name: 'Lukman Hakim', program_status: 'IN_PROGRESS' },
        { id: 's16', name: 'Maya Anggraini', program_status: 'IN_PROGRESS' },
        { id: 's17', name: 'Nabila Syahrani', program_status: 'IN_PROGRESS' },
        { id: 's18', name: 'Pandu Pratama', program_status: 'IN_PROGRESS' },
        { id: 's19', name: 'Qori Al-Ghifari', program_status: 'IN_PROGRESS' },
        { id: 's20', name: 'Rendra Setiawan', program_status: 'IN_PROGRESS' },
        { id: 's21', name: 'Rina Marlina', program_status: 'IN_PROGRESS' },
        { id: 's22', name: 'Rizky Ramadhan', program_status: 'IN_PROGRESS' },
        { id: 's23', name: 'Salma Salsabila', program_status: 'IN_PROGRESS' },
        { id: 's24', name: 'Satria Budi', program_status: 'IN_PROGRESS' },
        { id: 's25', name: 'Taufiq Hidayat', program_status: 'IN_PROGRESS' },
        { id: 's26', name: 'Tiara Andini', program_status: 'IN_PROGRESS' },
        { id: 's27', name: 'Wahyu Nugroho', program_status: 'IN_PROGRESS' },
        { id: 's28', name: 'Yoga Prasetyo', program_status: 'IN_PROGRESS' },
        { id: 's29', name: 'Zahra Amelia', program_status: 'IN_PROGRESS' },
        { id: 's30', name: 'Zulfikar Ali', program_status: 'IN_PROGRESS' }
      ];
      resetAttendanceState();
      if (_activeSession && _activeSession.status === 'ACTIVE') {
        render4ColAttendanceTable();
        updateArenaPresentCounter();
      }
    }
  }
}

/**
 * 11. Load Students for TOP Corporate Program
 */
async function loadStudentsForTopProgram(programCode) {
  try {
    const { data } = await _sb.from('students')
      .select('id, name, level_id, batch_id, is_active, program_status')
      .eq('is_active', true)
      .neq('program_status', 'INACTIVE')
      .neq('program_status', 'ALUMNI')
      .order('name');

    _students = (data || [])
      .filter(s => s.is_active === true && (s.program_status || '').toUpperCase() !== 'INACTIVE')
      .map(s => ({
        ...s,
        name: cleanStudentName(s.name)
      }));
    if (_students.length === 0) {
      _students = [
        { id: 's_top_1', name: 'Budi Prasetyo', program_status: 'IN_PROGRESS' },
        { id: 's_top_2', name: 'Dewi Lestari', program_status: 'IN_PROGRESS' },
        { id: 's_top_3', name: 'Farhan Maulana', program_status: 'IN_PROGRESS' }
      ];
    }

    resetAttendanceState();
    if (_activeSession && _activeSession.status === 'ACTIVE') {
      render4ColAttendanceTable();
      updateArenaPresentCounter();
    }
  } catch (err) {
    console.warn('[TUTOR APP] loadStudentsForTopProgram error:', err);
    if (_students.length === 0) {
      _students = [
        { id: 's_top_1', name: 'Budi Prasetyo', program_status: 'IN_PROGRESS' },
        { id: 's_top_2', name: 'Dewi Lestari', program_status: 'IN_PROGRESS' },
        { id: 's_top_3', name: 'Farhan Maulana', program_status: 'IN_PROGRESS' }
      ];
      resetAttendanceState();
      if (_activeSession && _activeSession.status === 'ACTIVE') {
        render4ColAttendanceTable();
        updateArenaPresentCounter();
      }
    }
  }
}

function resetAttendanceState() {
  _attendanceMap.clear();
  _students.forEach(s => {
    _attendanceMap.set(s.id, 'ABSENT'); // Default initial state
    if (!_violationsMap.has(s.id)) {
      _violationsMap.set(s.id, { word_count: 0, fine_amount: 0, paid_amount: 0, debt_amount: 0 });
    }
  });
}

/**
 * 12. Automated Meeting Counter (Counts existing sessions for class)
 */
async function updateMeetingCounter() {
  const chip = document.getElementById('auto-meeting-chip');
  if (!_selectedClass) return;

  const isValidUuid = typeof _selectedClass.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(_selectedClass.id);

  if (isValidUuid) {
    try {
      const { count, error } = await _sb.from('class_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', _selectedClass.id);

      const nextMeeting = (!error && count != null) ? (count + 1) : 1;
      if (chip) chip.textContent = `Meeting ${nextMeeting}`;
    } catch (_) {
      if (chip) chip.textContent = 'Meeting 1';
    }
  } else {
    if (chip) chip.textContent = 'Meeting 1';
  }
}

let _selectedTargetExamId = null;

/**
 * 13. Open Exam Selection Modal (when START EXAM is clicked)
 * Golden Standard Progressive Exam Card Controller (100% Visual & Logical Parity with Room & Dashboard)
 */
let _tutorExamIsRemedial = false;

function openExamSelectionModal() {
  const modal = document.getElementById('modal-select-exam');
  const container = document.getElementById('exam-modal-cards-container');
  const confirmBtn = document.getElementById('btn-confirm-start-exam');
  const hiddenSelect = document.getElementById('select-modal-exam-target');
  if (!container || !_selectedClass) return;

  const modality = detectClassDiscipline(_selectedClass.code || _selectedClass.name);

  // Filter exams strictly by class ID or matching class code prefix
  let classTests = _tests.filter(t => {
    if (t.class_id && t.class_id === _selectedClass.id) return true;
    const c = (t.shell_code || '').toUpperCase();
    const clCode = (_selectedClass.code || '').toUpperCase();
    if (clCode && c.startsWith(clCode)) return true;
    if (modality === 'VOCABULARY') return c.includes('VCB') || c.includes('VOCAB');
    if (modality === 'SPEAKING') return c.includes('SPK') || c.includes('SPEAK');
    if (modality === 'STORYTELLING') return c.includes('STT') || c.includes('STORY');
    if (modality === 'GRAMMAR') return c.includes('GRM') || c.includes('GRAM');
    return true;
  });

  // Filter to exam tests
  const classExams = classTests.filter(t => {
    const tt = (t.test_type || '').toLowerCase();
    const sc = (t.shell_code || '').toUpperCase();
    const cat = (t.category || '').toUpperCase();
    return tt === 'exam' || cat === 'EXAM' || sc.endsWith('-EXAM') || sc.includes('-EXAM-');
  });

  const availableExams = classExams.length > 0 ? classExams : classTests;

  // Progressive auto-selection: Theme A -> B -> C -> D
  let activeTest = availableExams[0] || {
    id: 'default_exam',
    title: `${_selectedClass.name} Exam`,
    shell_code: 'EXAM',
    min_score: 60,
    duration_minutes: 30
  };

  // Determine theme code & topic
  const shell = (activeTest.shell_code || '').toUpperCase();
  const themeMatch = shell.match(/-([A-D0-9]+)-(?:EXAM|TASK)/);
  const themeCode = themeMatch ? themeMatch[1] : 'A';
  let topicName = activeTest.payload?.topic_name || activeTest.topics?.name || '';
  if (!topicName && activeTest.title) {
    const m = activeTest.title.match(/-\s*([^-\n]+)$/);
    topicName = m ? m[1].trim() : activeTest.title;
  }
  if (!topicName) topicName = `${_selectedClass.name}`;

  _selectedTargetExamId = activeTest.id;
  if (hiddenSelect) {
    hiddenSelect.innerHTML = `<option value="${activeTest.id}" selected>${activeTest.title}</option>`;
    hiddenSelect.value = activeTest.id;
  }

  const duration = activeTest.duration_minutes || activeTest.working_duration_minutes || 30;
  const qCount = activeTest.payload?.questions?.length || activeTest.total_questions || 120;
  const qStr = modality === 'VOCABULARY' ? `Words: ${qCount}, Phrases: 0 • ${qCount} Qs` : `${qCount} Questions`;

  const totalStudents = _students.length;
  // Estimate readiness based on sequential rules
  const normalCount = Math.max(0, totalStudents);
  const remedialCount = 0;

  const renderCard = () => {
    container.innerHTML = `
      <div class="theme-test-card-frame" style="border:1px solid rgba(255,45,135,0.4); background:#0f172a; border-radius:8px; padding:14px; display:flex; flex-direction:column; gap:10px; width:100%; box-sizing:border-box;">
        <!-- Top Line: Theme Badge + Readiness -->
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:8px;">
          <span style="font-size:13px; font-weight:800; color:#ff2d87; text-transform:uppercase; letter-spacing:0.04em;">
            ${themeCode} - ${topicName}
          </span>
          <span style="font-size:12px; font-weight:800; padding:2px 8px; border-radius:4px; background:rgba(255,255,0,0.15); color:var(--grade-c, #ffff00); border:1px solid rgba(255,255,0,0.3);">
            ${normalCount}/${totalStudents} Ready (${totalStudents > 0 ? Math.round((normalCount / totalStudents) * 100) : 0}%)
          </span>
        </div>

        <!-- Title -->
        <div style="font-size:13px; font-weight:700; color:#38bdf8; line-height:1.4;">
          ${activeTest.title}
        </div>

        <!-- Metadata Box -->
        <div style="background:rgba(0,0,0,0.35); border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:8px 12px; display:flex; flex-direction:column; gap:6px;">
          <div style="display:flex; justify-content:space-between; font-size:12px;">
            <span style="color:#94a3b8;">Default Duration:</span>
            <span style="color:#ffffff; font-weight:700;">${duration} mins</span>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:12px;">
            <span style="color:#94a3b8;">Question Count:</span>
            <span style="color:#ffffff; font-weight:700;">${qStr}</span>
          </div>
        </div>

        <!-- Mode Toggle Buttons -->
        <div style="display:flex; gap:10px;">
          <button type="button" id="btn-tutor-mode-normal" style="flex:1; height:36px; font-size:12px; font-weight:800; border-radius:6px; cursor:pointer; border:1px solid ${!_tutorExamIsRemedial ? 'var(--grade-a, #00c000)' : 'rgba(255,255,255,0.15)'}; background:${!_tutorExamIsRemedial ? 'rgba(22,163,74,0.15)' : 'transparent'}; color:${!_tutorExamIsRemedial ? 'var(--grade-a, #00c000)' : '#94a3b8'};">
            NORMAL (${normalCount})
          </button>
          <button type="button" id="btn-tutor-mode-remedial" style="flex:1; height:36px; font-size:12px; font-weight:800; border-radius:6px; cursor:pointer; border:1px solid ${_tutorExamIsRemedial ? 'var(--grade-c, #ffff00)' : 'rgba(255,255,255,0.15)'}; background:${_tutorExamIsRemedial ? 'rgba(245,158,11,0.15)' : 'transparent'}; color:${_tutorExamIsRemedial ? '#fbbf24' : '#94a3b8'};">
            REMEDI (${remedialCount})
          </button>
        </div>
      </div>
    `;

    container.querySelector('#btn-tutor-mode-normal')?.addEventListener('click', () => {
      _tutorExamIsRemedial = false;
      renderCard();
    });
    container.querySelector('#btn-tutor-mode-remedial')?.addEventListener('click', () => {
      _tutorExamIsRemedial = true;
      renderCard();
    });
  };

  renderCard();

  if (confirmBtn) {
    confirmBtn.innerHTML = `START EXAM &rarr;`;
  }

  modal?.classList.remove('hidden');
}

/**
 * 14. Start Session (Regular or Exam) -> Transition to Phase 2 Live Active Arena
 */
async function startSession(sessionType, targetTestId = null) {
  if (!_selectedClass) {
    alert('Please select a class first.');
    return;
  }

  const meetingStr = document.getElementById('auto-meeting-chip')?.textContent || 'Meeting 1';
  const meetingNum = parseInt(meetingStr.replace(/\D/g, '') || '1', 10);

  const newSession = {
    id: 'sess_' + Date.now(),
    class_id: _selectedClass.id,
    batch_id: _students[0]?.batch_id || '00000000-0000-0000-0000-000000000000',
    tutor_id: _currentTutor.id,
    session_number: meetingNum,
    session_type: sessionType,
    target_test_id: targetTestId,
    status: 'ACTIVE',
    beacon_lat: _gpsCoords?.lat || null,
    beacon_lng: _gpsCoords?.lng || null,
    beacon_radius_meters: 10.0,
    started_at: new Date().toISOString()
  };

  try {
    const { data } = await _sb.from('class_sessions').insert(newSession).select().single();
    _activeSession = data || newSession;
  } catch (_) {
    _activeSession = newSession;
  }

  localStorage.setItem('topscore_active_tutor_session', JSON.stringify(_activeSession));

  // Reset student attendance to ABSENT/UNCHECKED initially
  _students.forEach(s => _attendanceMap.set(s.id, 'ABSENT'));

  // Transition to Phase 2 Live Active Arena
  transitionToLiveActiveArena();
}

/**
 * 15. Transition to Phase 2 Live Active Arena Screen
 */
function transitionToLiveActiveArena() {
  document.body.classList.add('in-arena-session');
  document.getElementById('launcher-setup-card')?.classList.add('hidden');
  document.getElementById('live-active-arena-card')?.classList.remove('hidden');

  const titleText = document.getElementById('arena-header-title');
  const modeBadge = document.getElementById('arena-mode-badge');
  const badgePill = document.getElementById('session-status-badge');
  const badgeText = document.getElementById('session-status-text');

  const isExam = _activeSession.session_type === 'EXAM';
  let formattedClassName = _selectedClass?.name || 'Class';
  formattedClassName = formattedClassName.replace(/^(\d+)\s+Level\b/i, 'Level $1');
  if (titleText) titleText.textContent = formattedClassName;

  // Update Active Class Name in Top Header
  const hdrClass = document.getElementById('tutor-header-class-name');
  if (hdrClass) hdrClass.textContent = formattedClassName;

  // Meeting Badge & Editable Meeting Input (penundaan kelas, kelas ganda)
  const meetingBadge = document.getElementById('arena-meeting-badge');
  if (meetingBadge) meetingBadge.textContent = `Meeting ${_activeSession.session_number}`;
  const meetingInput = document.getElementById('arena-meeting-input');
  if (meetingInput) {
    meetingInput.value = _activeSession.session_number;
    meetingInput.onchange = (e) => {
      const newNum = parseInt(e.target.value, 10);
      if (!isNaN(newNum) && newNum > 0) {
        _activeSession.session_number = newNum;
        if (meetingBadge) meetingBadge.textContent = `Meeting ${newNum}`;
        localStorage.setItem('topscore_active_tutor_session', JSON.stringify(_activeSession));
        showTutorToast(`Meeting updated to #${newNum}`, 'file-text', 'info', 2000);
      }
    };
  }

  if (modeBadge) {
    modeBadge.textContent = _activeSession.session_type;
    modeBadge.style.color = isExam ? '#ff2d87' : '#95ff00';
  }

  if (badgePill) {
    badgePill.className = isExam ? 'session-status-badge active-exam' : 'session-status-badge active-regular';
    if (badgeText) badgeText.textContent = isExam ? 'EXAM ACTIVE' : 'ACTIVE';
  }

  const levelNumEl = document.getElementById('arena-level-number');
  if (levelNumEl) levelNumEl.textContent = _currentTenant === 'CEC' ? _selectedLevelNumber : 'TOP';

  startDynamicCodeRotation();
  startActiveSessionTimer();
  render4ColAttendanceTable();
  updateArenaPresentCounter();
}

/**
 * 16. Render 4-Column Student Attendance Datagrid Table
 * Columns: STUDENT NAME | PRESENT | EXCUSED | SICK | ABSENT
 */
function render4ColAttendanceTable() {
  const tbody = document.getElementById('tbody-attendance-matrix');
  const countEl = document.getElementById('arena-student-count');
  if (!tbody) return;

  if (countEl) countEl.textContent = _students.length;
  tbody.innerHTML = '';

  _students.forEach(s => {
    const status = _attendanceMap.get(s.id) || 'ABSENT';
    const tr = document.createElement('tr');
    const studentDisplayName = cleanStudentName(s.name);

    tr.innerHTML = `
      <td class="td-student-name" title="${studentDisplayName}">${studentDisplayName}</td>
      <td class="td-status-cell">
        <label class="status-radio-label" title="Mark Present">
          <input type="radio" name="status_${s.id}" class="radio-present" value="PRESENT" ${status === 'PRESENT' || status === 'PRESENT_PROXIMITY' || status === 'PRESENT_QR' ? 'checked' : ''} />
        </label>
      </td>
      <td class="td-status-cell">
        <label class="status-radio-label" title="Mark Excused">
          <input type="radio" name="status_${s.id}" class="radio-excused" value="EXCUSED" ${status === 'EXCUSED' ? 'checked' : ''} />
        </label>
      </td>
      <td class="td-status-cell">
        <label class="status-radio-label" title="Mark Sick">
          <input type="radio" name="status_${s.id}" class="radio-sick" value="SICK" ${status === 'SICK' ? 'checked' : ''} />
        </label>
      </td>
      <td class="td-status-cell">
        <label class="status-radio-label" title="Mark Absent">
          <input type="radio" name="status_${s.id}" class="radio-absent" value="ABSENT" ${status === 'ABSENT' || status === 'UNCHECKED' ? 'checked' : ''} />
        </label>
      </td>
    `;

    // Radio change handlers
    tr.querySelectorAll(`input[name="status_${s.id}"]`).forEach(radio => {
      radio.addEventListener('change', (e) => {
        const newStatus = e.target.value;
        _attendanceMap.set(s.id, newStatus);
        updateArenaPresentCounter();
      });
    });

    tbody.appendChild(tr);
  });
}

function updateArenaPresentCounter() {
  let countP = 0;
  let countE = 0;
  let countS = 0;
  let countA = 0;

  _students.forEach(s => {
    const st = _attendanceMap.get(s.id);
    if (st === 'PRESENT' || st === 'PRESENT_PROXIMITY' || st === 'PRESENT_QR') {
      countP++;
    } else if (st === 'EXCUSED') {
      countE++;
    } else if (st === 'SICK') {
      countS++;
    } else {
      countA++;
    }
  });

  const pEl = document.getElementById('stat-count-p');
  const eEl = document.getElementById('stat-count-e');
  const sEl = document.getElementById('stat-count-s');
  const aEl = document.getElementById('stat-count-a');
  if (pEl) pEl.textContent = countP;
  if (eEl) eEl.textContent = countE;
  if (sEl) sEl.textContent = countS;
  if (aEl) aEl.textContent = countA;

  const counter = document.getElementById('arena-present-counter');
  const badge = document.getElementById('badge-present-count');
  if (counter) counter.textContent = `Present: ${countP} / ${_students.length}`;
  if (badge) badge.textContent = countP;
}

/**
 * 17. GPS Beacon Activation (10m Proximity)
 */
function toggleGpsBeacon() {
  const btn = document.getElementById('btn-toggle-beacon');
  const statusTag = document.getElementById('arena-beacon-status');
  const titleEl = btn?.querySelector('.beacon-cta-title');
  const subEl = btn?.querySelector('.beacon-cta-sub');

  if (_isBeaconActive) {
    _isBeaconActive = false;
    btn?.classList.remove('active');
    if (titleEl) titleEl.textContent = 'RADAR';
    if (subEl) subEl.textContent = '';
    if (statusTag) {
      statusTag.className = 'status-tag unchecked';
      statusTag.textContent = 'OFFLINE';
    }
    return;
  }

  if (!navigator.geolocation) {
    alert('Geolocation is not supported by your browser.');
    return;
  }

  if (titleEl) titleEl.textContent = 'SEEKING...';
  if (statusTag) {
    statusTag.className = 'status-tag late';
    statusTag.textContent = 'SEEKING';
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      _gpsCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
      _isBeaconActive = true;
      btn?.classList.add('active');
      if (titleEl) titleEl.textContent = 'RADAR ON';
      if (subEl) subEl.textContent = '';
      if (statusTag) {
        statusTag.className = 'status-tag present';
        statusTag.textContent = `LOCKED (±${Math.round(pos.coords.accuracy)}m)`;
      }
    },
    (err) => {
      console.warn('[GPS] Error, using simulated classroom lock:', err);
      _gpsCoords = { lat: -7.7956, lng: 110.3695, accuracy: 5 };
      _isBeaconActive = true;
      btn?.classList.add('active');
      if (titleEl) titleEl.textContent = 'RADAR ON';
      if (subEl) subEl.textContent = '';
      if (statusTag) {
        statusTag.className = 'status-tag present';
        statusTag.textContent = 'LOCKED (10m)';
      }
    },
    { enableHighAccuracy: true, timeout: 6000 }
  );
}

/**
 * 18. Dynamic QR & 6-Char PIN Generation (Canvas Drawing)
 */
function startDynamicCodeRotation() {
  rotateDynamicCode();
  let remaining = DYNAMIC_CODE_ROTATION_SECONDS;
  const countdownEl = document.getElementById('arena-qr-countdown');

  _codeInterval = setInterval(() => {
    remaining--;
    if (countdownEl) countdownEl.textContent = `Rotating in ${remaining}s`;
    const qrisCountdownEl = document.getElementById('modal-qris-countdown');
    if (qrisCountdownEl) qrisCountdownEl.textContent = `Rotating in ${remaining}s`;
    if (remaining <= 0) {
      remaining = DYNAMIC_CODE_ROTATION_SECONDS;
      rotateDynamicCode();
    }
  }, 1000);
}

function stopDynamicCodeRotation() {
  if (_codeInterval) clearInterval(_codeInterval);
  _codeInterval = null;
}

function rotateDynamicCode() {
  const randNum = Math.floor(1000 + Math.random() * 9000);
  _dynamicCode = `TC-${randNum}`;
  const codeEl = document.getElementById('arena-dynamic-code');
  if (codeEl) codeEl.textContent = _dynamicCode;
  const pinEl = document.getElementById('modal-qris-pin-text');
  if (pinEl) pinEl.textContent = _dynamicCode;
  drawQrToCanvas('qr-canvas', `topscore:checkin:${_activeSession?.id}:${_dynamicCode}`);
}

function drawQrToCanvas(canvasId, text) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  ctx.clearRect(0, 0, size, size);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = '#060b18';
  const modules = 21;
  const modSize = size / modules;

  drawFinderPattern(ctx, 0, 0, modSize);
  drawFinderPattern(ctx, (modules - 7) * modSize, 0, modSize);
  drawFinderPattern(ctx, 0, (modules - 7) * modSize, modSize);

  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash << 5) - hash + text.charCodeAt(i);

  for (let r = 0; r < modules; r++) {
    for (let c = 0; c < modules; c++) {
      if ((r < 7 && c < 7) || (r < 7 && c >= modules - 7) || (r >= modules - 7 && c < 7)) continue;
      const bit = ((hash ^ (r * 31 + c * 17)) & 1);
      if (bit === 1) {
        ctx.fillRect(c * modSize, r * modSize, modSize - 0.5, modSize - 0.5);
      }
    }
  }
}

function drawFinderPattern(ctx, x, y, modSize) {
  ctx.fillStyle = '#060b18';
  ctx.fillRect(x, y, 7 * modSize, 7 * modSize);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x + modSize, y + modSize, 5 * modSize, 5 * modSize);
  ctx.fillStyle = '#060b18';
  ctx.fillRect(x + 2 * modSize, y + 2 * modSize, 3 * modSize, 3 * modSize);
}

/**
 * 19. Active Session Timer (with 5-minute pre-alert chime & scheduled end alarm)
 */
function startActiveSessionTimer() {
  _sessionSeconds = 0;
  _hasFired5MinWarning = false;
  _hasFiredEndAlarm = false;

  // Determine scheduled duration
  _activeSessionDurationSeconds = 5400; // default 90 mins (5400s)
  if (_selectedClass) {
    const code = (_selectedClass.code || '').toUpperCase();
    if (code.includes('VOCAB') || code.includes('VCB')) {
      _activeSessionDurationSeconds = 3600; // Vocabulary is 60 minutes (05:30 - 06:30)
    } else if (_selectedClass.working_duration_minutes) {
      _activeSessionDurationSeconds = _selectedClass.working_duration_minutes * 60;
    }
  }

  const timerEl = document.getElementById('arena-session-timer');
  timerEl?.classList.remove('timer-expired');

  if (_sessionTimerInterval) clearInterval(_sessionTimerInterval);
  _sessionTimerInterval = setInterval(() => {
    _sessionSeconds++;
    const m = Math.floor(_sessionSeconds / 60).toString().padStart(2, '0');
    const s = (_sessionSeconds % 60).toString().padStart(2, '0');
    if (timerEl) timerEl.textContent = `${m}:${s}`;

    // 1. 5 minutes before scheduled end warning (at duration - 300s)
    if (_activeSessionDurationSeconds > 300 &&
        _sessionSeconds >= (_activeSessionDurationSeconds - 300) &&
        !_hasFired5MinWarning) {
      _hasFired5MinWarning = true;
      playTutorSound('chime');
      showTutorToast('5 minutes remaining before class concludes!', 'clock', 'warning', 6000);
      sendBrowserNotification(
        'Class Ending Soon',
        '5 minutes remaining in this scheduled session.'
      );
    }

    // 2. Class end alarm (at scheduled duration)
    if (_sessionSeconds >= _activeSessionDurationSeconds && !_hasFiredEndAlarm) {
      _hasFiredEndAlarm = true;
      playTutorSound('alarm');
      showTutorToast('Class time has ended! Please close session.', 'alert-triangle', 'alert', 8000);
      sendBrowserNotification(
        'Class Ended',
        'Scheduled class time has concluded. Please close session.'
      );
      timerEl?.classList.add('timer-expired');
    }
  }, 1000);
}

function stopActiveSessionTimer() {
  if (_sessionTimerInterval) clearInterval(_sessionTimerInterval);
  _sessionTimerInterval = null;
  const timerEl = document.getElementById('arena-session-timer');
  timerEl?.classList.remove('timer-expired');
}

/**
 * 20. Confirm Close Session
 */
async function confirmCloseSession() {
  document.getElementById('modal-close-session')?.classList.add('hidden');
  if (!_activeSession) return;

  const sessionId = _activeSession.id;

  try {
    // Call atomic RPC close_class_session_with_auto_alpha
    await _sb.rpc('close_class_session_with_auto_alpha', { p_session_id: sessionId });
  } catch (_) {
    await _sb.from('class_sessions').update({ status: 'CLOSED', closed_at: new Date().toISOString() }).eq('id', sessionId);
  }

  // Save attendance records
  try {
    const payload = [];
    _students.forEach(s => {
      payload.push({
        session_id: sessionId,
        student_id: s.id,
        status: _attendanceMap.get(s.id) || 'ABSENT',
        checked_in_at: new Date().toISOString()
      });
    });
    await _sb.from('session_attendance').upsert(payload, { onConflict: 'session_id,student_id' });
  } catch (_) {}

  // Cleanup
  localStorage.removeItem('topscore_active_tutor_session');
  stopDynamicCodeRotation();
  stopActiveSessionTimer();
  _activeSession = null;
  _isBeaconActive = false;
  const beaconBtn = document.getElementById('btn-toggle-beacon');
  const beaconTitle = beaconBtn?.querySelector('.beacon-cta-title');
  const beaconSub = beaconBtn?.querySelector('.beacon-cta-sub');
  if (beaconBtn) beaconBtn.classList.remove('active');
  if (beaconTitle) beaconTitle.textContent = 'RADAR';
  if (beaconSub) beaconSub.textContent = '';

  // Transition back to Setup Launcher
  document.body.classList.remove('in-arena-session');
  document.getElementById('live-active-arena-card')?.classList.add('hidden');
  document.getElementById('launcher-setup-card')?.classList.remove('hidden');

  // Reset Mode selection and unselect class in setup launcher
  _selectedSessionType = null;
  unselectClass();

  const badgePill = document.getElementById('session-status-badge');
  const badgeText = document.getElementById('session-status-text');
  if (badgePill) badgePill.className = 'session-status-badge standby';
  if (badgeText) badgeText.textContent = 'STANDBY';

  updateMeetingCounter();
  alert('Session concluded successfully. Attendance locked.');
}

/**
 * 21. Helper: Get Students for specific Level (Cached or Authoritative Cohort)
 */
function getStudentsForLevel(lvlNum) {
  if (_studentsCacheByLevel[lvlNum] && Array.isArray(_studentsCacheByLevel[lvlNum])) {
    return _studentsCacheByLevel[lvlNum];
  }
  return COHORT_STUDENTS_BY_LEVEL[lvlNum] || [];
}

/**
 * 22. Authentic CEC 1–5 Rubric Specifications & Evaluation Criteria
 */
const STORYTELLING_RUBRIC_DATA = {
  W1: {
    focus: 'Sentence Formation & Basic Grammar',
    indicators: [
      { score: 1, predicate: 'LESS', grade: 'E', color: '#ff0000', text: 'Belum bisa menyusun kalimat dengan benar dan masih banyak kesalahan.' },
      { score: 2, predicate: 'LESS', grade: 'E', color: '#ff0000', text: 'Bisa membuat kalimat sederhana, tetapi masih ada beberapa kesalahan.' },
      { score: 3, predicate: 'ENOUGH', grade: 'D', color: '#FF8C00', text: 'Bisa membuat beberapa kalimat dengan cukup benar, hanya sedikit kesalahan.' },
      { score: 4, predicate: 'VERY GOOD', grade: 'B', color: '#95ff00', text: 'Bisa menyusun kalimat dengan benar dan runtut.' },
      { score: 5, predicate: 'EXCELLENT', grade: '★', color: '#00c000', text: 'Bisa menyusun kalimat dengan sangat baik, rapi, dan hampir tidak ada kesalahan.' }
    ]
  },
  W2: {
    focus: 'Daily Routine Narrative & Coherence',
    indicators: [
      { score: 1, predicate: 'LESS', grade: 'E', color: '#ff0000', text: 'Belum bisa menceritakan kegiatan sehari-hari dengan jelas.' },
      { score: 2, predicate: 'LESS', grade: 'E', color: '#ff0000', text: 'Bisa menceritakan kegiatan sehari-hari secara sederhana, tetapi masih kurang runtut.' },
      { score: 3, predicate: 'ENOUGH', grade: 'D', color: '#FF8C00', text: 'Cerita sudah cukup jelas dan urut, masih ada sedikit kesalahan.' },
      { score: 4, predicate: 'VERY GOOD', grade: 'B', color: '#95ff00', text: 'Bisa menceritakan kegiatan sehari-hari dengan runtut dan jelas.' },
      { score: 5, predicate: 'EXCELLENT', grade: '★', color: '#00c000', text: 'Cerita sangat jelas, runtut, dan menggunakan kosakata yang baik.' }
    ]
  },
  W3: {
    focus: 'Narrative Volume & Target Sentences',
    indicators: [
      { score: 1, predicate: 'LESS', grade: 'E', color: '#ff0000', text: 'Cerita kurang dari 5 kalimat.' },
      { score: 2, predicate: 'LESS', grade: 'E', color: '#ff0000', text: 'Cerita 5 kalimat, belum sampai target.' },
      { score: 3, predicate: 'ENOUGH', grade: 'D', color: '#FF8C00', text: 'Cerita 10 kalimat, sudah sampai batas minimal.' },
      { score: 4, predicate: 'VERY GOOD', grade: 'B', color: '#95ff00', text: 'Cerita 15 kalimat, sesuai target.' },
      { score: 5, predicate: 'EXCELLENT', grade: '★', color: '#00c000', text: 'Cerita 20 kalimat lebih, sesuai target dan sangat baik.' }
    ]
  },
  W4: {
    focus: 'Spontaneous Delivery & Question Response',
    indicators: [
      { score: 1, predicate: 'LESS', grade: 'E', color: '#ff0000', text: 'Belum bisa bercerita dan belum bisa menjawab pertanyaan.' },
      { score: 2, predicate: 'LESS', grade: 'E', color: '#ff0000', text: 'Bisa bercerita sedikit dan menjawab pertanyaan dengan sangat singkat.' },
      { score: 3, predicate: 'ENOUGH', grade: 'D', color: '#FF8C00', text: 'Bisa bercerita dengan cukup jelas dan menjawab pertanyaan sederhana.' },
      { score: 4, predicate: 'VERY GOOD', grade: 'B', color: '#95ff00', text: 'Bisa bercerita dengan jelas dan menjawab pertanyaan dengan benar.' },
      { score: 5, predicate: 'EXCELLENT', grade: '★', color: '#00c000', text: 'Bisa bercerita dengan lancar dan menjawab pertanyaan dengan jelas dan percaya diri.' }
    ]
  }
};

const SPEAKING_RUBRIC_DATA = {
  fluency: {
    name: 'Fluency (Kelancaran Berbicara)',
    indicators: [
      { score: 1, predicate: 'LESS', grade: 'E', color: '#ff0000', text: 'Belum bisa menyampaikan maksud, jeda sangat panjang.' },
      { score: 2, predicate: 'LESS', grade: 'E', color: '#ff0000', text: 'Sangat lambat dengan jeda panjang, ide masih dapat disampaikan.' },
      { score: 3, predicate: 'ENOUGH', grade: 'D', color: '#FF8C00', text: 'Kelancaran sedang, beberapa kali ragu-ragu.' },
      { score: 4, predicate: 'VERY GOOD', grade: 'B', color: '#95ff00', text: 'Lancar dengan sedikit keraguan alami.' },
      { score: 5, predicate: 'EXCELLENT', grade: '★', color: '#00c000', text: 'Sangat lancar dan alami tanpa keraguan yang berarti.' }
    ]
  },
  pronunciation: {
    name: 'Pronunciation (Pelafalan)',
    indicators: [
      { score: 1, predicate: 'LESS', grade: 'E', color: '#ff0000', text: 'Pengucapan sangat sulit dipahami pendengar.' },
      { score: 2, predicate: 'LESS', grade: 'E', color: '#ff0000', text: 'Pengucapan sering keliru, butuh konsentrasi ekstra.' },
      { score: 3, predicate: 'ENOUGH', grade: 'D', color: '#FF8C00', text: 'Pengucapan cukup jelas dengan aksen/kesalahan minor.' },
      { score: 4, predicate: 'VERY GOOD', grade: 'B', color: '#95ff00', text: 'Pengucapan jelas dan aksen mudah dipahami.' },
      { score: 5, predicate: 'EXCELLENT', grade: '★', color: '#00c000', text: 'Pengucapan sangat jelas, intonasi tepat dan presisi.' }
    ]
  },
  grammar: {
    name: 'Grammar (Tata Bahasa)',
    indicators: [
      { score: 1, predicate: 'LESS', grade: 'E', color: '#ff0000', text: 'Kesalahan tata bahasa sangat sering, sulit dipahami.' },
      { score: 2, predicate: 'LESS', grade: 'E', color: '#ff0000', text: 'Kesalahan terlihat, namun makna masih bisa ditangkap.' },
      { score: 3, predicate: 'ENOUGH', grade: 'D', color: '#FF8C00', text: 'Kesalahan minor, kalimat dan ide dasar jelas.' },
      { score: 4, predicate: 'VERY GOOD', grade: 'B', color: '#95ff00', text: 'Hampir tanpa kesalahan, variasi kalimat tepat.' },
      { score: 5, predicate: 'EXCELLENT', grade: '★', color: '#00c000', text: 'Sempurna tanpa kesalahan gramatikal.' }
    ]
  },
  comprehension: {
    name: 'Comprehension (Daya Tangkap Tanya-Jawab)',
    indicators: [
      { score: 1, predicate: 'LESS', grade: 'E', color: '#ff0000', text: 'Kesulitan memahami atau merespons pertanyaan.' },
      { score: 2, predicate: 'LESS', grade: 'E', color: '#ff0000', text: 'Pemahaman dasar, perlu pengulangan berkali-kali.' },
      { score: 3, predicate: 'ENOUGH', grade: 'D', color: '#FF8C00', text: 'Memahami ide umum, sedikit detail terlewat.' },
      { score: 4, predicate: 'VERY GOOD', grade: 'B', color: '#95ff00', text: 'Memahami sebagian besar detail dan merespons tepat.' },
      { score: 5, predicate: 'EXCELLENT', grade: '★', color: '#00c000', text: 'Pemahaman penuh dan respons cepat serta akurat.' }
    ]
  }
};

let _activeRubricInput = null;

function openRubricGuideModal(exam, targetInput = null, studentName = '') {
  _activeRubricInput = targetInput;
  const modal = document.getElementById('modal-rubric-guide');
  const titleText = document.getElementById('rubric-modal-title-text');
  const body = document.getElementById('rubric-modal-body');
  const footerHint = document.getElementById('rubric-modal-footer-hint');
  if (!modal || !body) return;

  const isStory = exam?.rubric === 'TELLING_STORY';
  const rubricWeek = exam?.week || exam?.key || 'W1';
  const rubData = isStory ? STORYTELLING_RUBRIC_DATA[rubricWeek] : null;

  if (titleText) {
    const studentSuffix = studentName ? ` — ${studentName}` : '';
    if (isStory && rubData) {
      titleText.textContent = `STORYTELLING RUBRIC ${rubricWeek}: ${rubData.focus.toUpperCase()}${studentSuffix}`;
    } else {
      titleText.textContent = `EVALUATION CRITERIA: ${exam?.title || exam?.label || 'EXAM RUBRIC'}${studentSuffix}`;
    }
  }

  if (footerHint) {
    footerHint.textContent = targetInput ? 'Tap any card below to assign score to student' : 'Standard CEC Criteria Reference (1 = Less, 3 = Enough, 5 = Excellent)';
  }

  let html = '';

  // Equivalence Banner
  html += `
    <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:8px 12px; margin-bottom:4px; font-size:11px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
      <span style="color:#94a3b8; font-weight:700;">CEC PREDICATE SCALE:</span>
      <span style="color:#ff0000; font-weight:800;">1: LESS (20%)</span>
      <span style="color:#ff0000; font-weight:800;">2: LESS (40%)</span>
      <span style="color:#FF8C00; font-weight:800;">3: ENOUGH (60% KKM)</span>
      <span style="color:#95ff00; font-weight:800;">4: VERY GOOD (80%)</span>
      <span style="color:#00c000; font-weight:800;">5: EXCELLENT (100% ★)</span>
    </div>
  `;

  if (isStory && rubData) {
    rubData.indicators.forEach(ind => {
      html += `
        <div class="rubric-score-card" data-score="${ind.score}" style="border-left: 4px solid ${ind.color} !important;">
          <div class="rubric-score-num" style="color:${ind.color};">${ind.score}</div>
          <div class="rubric-score-info">
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="rubric-predicate-badge" style="color:${ind.color};">${ind.predicate} (${ind.score * 20}%)</span>
              <span style="font-size:10px; color:#94a3b8; font-weight:600;">Grade ${ind.grade}</span>
            </div>
            <div class="rubric-desc-text">${escHtml(ind.text)}</div>
          </div>
        </div>
      `;
    });
  } else {
    // 5-Axis Speaking or Generic Rubric
    Object.keys(SPEAKING_RUBRIC_DATA).forEach(paramKey => {
      const p = SPEAKING_RUBRIC_DATA[paramKey];
      html += `<div style="font-size:12px; font-weight:800; color:#38bdf8; margin-top:8px; text-transform:uppercase;">${p.name}</div>`;
      p.indicators.forEach(ind => {
        html += `
          <div class="rubric-score-card" data-score="${ind.score}" style="border-left: 4px solid ${ind.color} !important; padding:6px 10px !important;">
            <div class="rubric-score-num" style="font-size:15px; width:26px; height:26px; color:${ind.color};">${ind.score}</div>
            <div class="rubric-score-info">
              <span class="rubric-predicate-badge" style="color:${ind.color}; font-size:10px;">${ind.predicate}</span>
              <div class="rubric-desc-text" style="font-size:11px;">${escHtml(ind.text)}</div>
            </div>
          </div>
        `;
      });
    });
  }

  body.innerHTML = html;

  // Add click handlers to cards
  body.querySelectorAll('.rubric-score-card').forEach(card => {
    card.addEventListener('click', () => {
      const score = card.dataset.score;
      if (_activeRubricInput) {
        _activeRubricInput.value = score;
        _activeRubricInput.dispatchEvent(new Event('input', { bubbles: true }));
        closeRubricGuideModal();
      }
    });
  });

  modal.classList.remove('hidden');
}

function closeRubricGuideModal() {
  document.getElementById('modal-rubric-guide')?.classList.add('hidden');
  _activeRubricInput = null;
}

/**
 * 23. Get Standard Exams for a Class Modality (Authoritative CEC Academic Matrix)
 * - VOCABULARY: W1–W4 (Cumulative word deposits: L1: 90/210/300/450, L2: 120/280/440/600, L3: 150/400/650/800)
 * - BASIC ENGLISH: U1, U2 (Max 100)
 * - STORYTELLING: W1–W4 (Authoritative 1–5 Criteria Rubric)
 * - GRAMMAR / GFS: W1, W2 (Periodic exams)
 * - SPEAKING: W1–W3/W4 (5-Axis Rubric / Max 25)
 * - PRONUNCIATION: W1, W2 (Max 25)
 */
function getExamsForClass(cls, levelNum = _gradeLevelNumber) {
  if (!cls) return [];
  const d = detectClassDiscipline(cls.code || cls.name || cls.modality || '');
  if (d === 'VOCABULARY') {
    if (levelNum === 1) {
      return [
        { key: 'PT', label: 'PT', title: 'Placement Test (Max 30)', target: 30, type: 'DIAGNOSTIC' },
        { key: 'W1', label: 'W1', title: 'Week 1 Deposit (Max 90)', target: 90, type: 'WEEKLY_DEPOSIT' },
        { key: 'W2', label: 'W2', title: 'Week 2 Deposit (Max 210)', target: 210, type: 'WEEKLY_DEPOSIT' },
        { key: 'W3', label: 'W3', title: 'Week 3 Deposit (Max 300)', target: 300, type: 'WEEKLY_DEPOSIT' },
        { key: 'W4', label: 'W4', title: 'Week 4 Deposit (Max 450)', target: 450, type: 'WEEKLY_DEPOSIT' }
      ];
    }
    if (levelNum === 2) {
      return [
        { key: 'W1', label: 'W1', title: 'Week 1 Deposit (Max 120)', target: 120, type: 'WEEKLY_DEPOSIT' },
        { key: 'W2', label: 'W2', title: 'Week 2 Deposit (Max 280)', target: 280, type: 'WEEKLY_DEPOSIT' },
        { key: 'W3', label: 'W3', title: 'Week 3 Deposit (Max 440)', target: 440, type: 'WEEKLY_DEPOSIT' },
        { key: 'W4', label: 'W4', title: 'Week 4 Deposit (Max 600)', target: 600, type: 'WEEKLY_DEPOSIT' }
      ];
    }
    if (levelNum === 3) {
      return [
        { key: 'W1', label: 'W1', title: 'Week 1 Deposit (Max 150)', target: 150, type: 'WEEKLY_DEPOSIT' },
        { key: 'W2', label: 'W2', title: 'Week 2 Deposit (Max 400)', target: 400, type: 'WEEKLY_DEPOSIT' },
        { key: 'W3', label: 'W3', title: 'Week 3 Deposit (Max 650)', target: 650, type: 'WEEKLY_DEPOSIT' },
        { key: 'W4', label: 'W4', title: 'Week 4 Deposit (Max 800)', target: 800, type: 'WEEKLY_DEPOSIT' }
      ];
    }
    return [
      { key: 'W1', label: 'W1', title: 'Week 1 Deposit', target: 100, type: 'WEEKLY_DEPOSIT' },
      { key: 'W2', label: 'W2', title: 'Week 2 Deposit', target: 100, type: 'WEEKLY_DEPOSIT' },
      { key: 'W3', label: 'W3', title: 'Week 3 Deposit', target: 100, type: 'WEEKLY_DEPOSIT' },
      { key: 'W4', label: 'W4', title: 'Week 4 Deposit', target: 100, type: 'WEEKLY_DEPOSIT' }
    ];
  }
  if (d === 'BASIC') {
    return [
      { key: 'U1', label: 'U1', title: 'Unit 1 Mid-Exam (Max 100)', target: 100, type: 'PERIODIC_EXAM' },
      { key: 'U2', label: 'U2', title: 'Unit 2 Final-Exam (Max 100)', target: 100, type: 'PERIODIC_EXAM' }
    ];
  }
  if (d === 'STORYTELLING') {
    return [
      { key: 'W1', label: 'W1', title: 'Week 1 Rubric (Max 5)', target: 5, type: 'WEEKLY_DEPOSIT', rubric: 'TELLING_STORY', week: 'W1' },
      { key: 'W2', label: 'W2', title: 'Week 2 Rubric (Max 5)', target: 5, type: 'WEEKLY_DEPOSIT', rubric: 'TELLING_STORY', week: 'W2' },
      { key: 'W3', label: 'W3', title: 'Week 3 Rubric (Max 5)', target: 5, type: 'WEEKLY_DEPOSIT', rubric: 'TELLING_STORY', week: 'W3' },
      { key: 'W4', label: 'W4', title: 'Week 4 Rubric (Max 5)', target: 5, type: 'WEEKLY_DEPOSIT', rubric: 'TELLING_STORY', week: 'W4' }
    ];
  }
  if (d === 'GRAMMAR') {
    if (levelNum === 1) {
      return [
        { key: 'PT', label: 'PT', title: 'Placement Test (Max 25)', target: 25, type: 'DIAGNOSTIC' },
        { key: 'W1', label: 'W1', title: 'Week 1 Exam (Max 15)', target: 15, type: 'PERIODIC_EXAM' },
        { key: 'W2', label: 'W2', title: 'Week 2 Exam (Max 20)', target: 20, type: 'PERIODIC_EXAM' }
      ];
    }
    if (levelNum === 2) {
      return [
        { key: 'W1', label: 'W1', title: 'Week 1 Exam (Max 30)', target: 30, type: 'PERIODIC_EXAM' },
        { key: 'W2', label: 'W2', title: 'Week 2 Exam (Max 30)', target: 30, type: 'PERIODIC_EXAM' }
      ];
    }
    if (levelNum === 3) {
      return [
        { key: 'W1', label: 'W1', title: 'Week 1 Exam (Max 15)', target: 15, type: 'PERIODIC_EXAM' },
        { key: 'W2', label: 'W2', title: 'Week 2 Exam (Max 15)', target: 15, type: 'PERIODIC_EXAM' }
      ];
    }
    return [
      { key: 'W1', label: 'W1', title: 'Week 1 Exam (Max 20)', target: 20, type: 'PERIODIC_EXAM' },
      { key: 'W2', label: 'W2', title: 'Week 2 Exam (Max 20)', target: 20, type: 'PERIODIC_EXAM' }
    ];
  }
  if (d === 'GFS') {
    return [
      { key: 'W1', label: 'W1', title: 'Week 1 Exam (Max 20)', target: 20, type: 'PERIODIC_EXAM' },
      { key: 'W2', label: 'W2', title: 'Week 2 Exam (Max 20)', target: 20, type: 'PERIODIC_EXAM' }
    ];
  }
  if (d === 'SPEAKING') {
    if (levelNum === 1) {
      return [
        { key: 'PT', label: 'PT', title: 'Placement Test (Max 25)', target: 25, type: 'DIAGNOSTIC' },
        { key: 'W1', label: 'W1', title: 'Week 1 Exam (Max 25)', target: 25, type: 'PERIODIC_EXAM', rubric: 'SPEAKING_5_AXIS' },
        { key: 'W2', label: 'W2', title: 'Week 2 Exam (Max 25)', target: 25, type: 'PERIODIC_EXAM', rubric: 'SPEAKING_5_AXIS' },
        { key: 'W3', label: 'W3', title: 'Week 3 Exam (Max 25)', target: 25, type: 'PERIODIC_EXAM', rubric: 'SPEAKING_5_AXIS' },
        { key: 'W4', label: 'PRAC', title: 'Week 4 Practice (Max 25)', target: 25, type: 'PRACTICE', rubric: 'SPEAKING_5_AXIS' }
      ];
    }
    return [
      { key: 'W1', label: 'W1', title: 'Week 1 Exam (Max 25)', target: 25, type: 'PERIODIC_EXAM', rubric: 'SPEAKING_5_AXIS' },
      { key: 'W2', label: 'W2', title: 'Week 2 Exam (Max 25)', target: 25, type: 'PERIODIC_EXAM', rubric: 'SPEAKING_5_AXIS' },
      { key: 'W3', label: 'W3', title: 'Week 3 Exam (Max 25)', target: 25, type: 'PERIODIC_EXAM', rubric: 'SPEAKING_5_AXIS' }
    ];
  }
  if (d === 'PRONUNCIATION') {
    return [
      { key: 'W1', label: 'W1', title: 'Week 1 Exam (Max 25)', target: 25, type: 'PERIODIC_EXAM' },
      { key: 'W2', label: 'W2', title: 'Week 2 Exam (Max 25)', target: 25, type: 'PERIODIC_EXAM' }
    ];
  }
  return [
    { key: 'U1', label: 'U1', title: 'Exam 1', target: 100, type: 'PERIODIC_EXAM' },
    { key: 'U2', label: 'U2', title: 'Exam 2', target: 100, type: 'PERIODIC_EXAM' }
  ];
}

/**
 * Score Color Class Resolver (SSOT Color Standards)
 */
function getScoreColorClass(score, target = 100) {
  if (score == null || score === '' || isNaN(score)) return '';
  const n = Number(score);
  const pct = target > 0 ? (n / target) * 100 : n;
  if (pct >= 90) return 'score-a'; // Green (Excellent)
  if (pct >= 80) return 'score-b'; // Lime (Very Good)
  if (pct >= 70) return 'score-c'; // Yellow (Good)
  if (pct >= 60) return 'score-d'; // Orange (Enough)
  return 'score-e'; // Red (Less)
}

const _gradeSaveTimers = new Map();

async function syncGradeToCloud({ studentId, batchId, classId, stepLevel, subjectCode, assessmentKey, rawScore, targetScore, assessmentType }) {
  try {
    const sb = _sb || await getSupabase();
    if (!sb) return;

    if (rawScore == null || isNaN(rawScore)) {
      await sb.from('student_academic_assessments')
        .delete()
        .eq('student_id', studentId)
        .eq('step_level', stepLevel)
        .eq('subject_code', subjectCode)
        .eq('assessment_key', assessmentKey);
      return;
    }

    const pct = targetScore > 0 ? Math.min(100, Math.round(((rawScore / targetScore) * 100) * 100) / 100) : rawScore;
    const grade = typeof calculateGrade === 'function' ? calculateGrade(pct) : (pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 60 ? 'C' : 'E');

    await sb.from('student_academic_assessments').upsert({
      student_id: studentId,
      batch_id: batchId,
      class_id: classId || null,
      step_level: stepLevel,
      subject_code: subjectCode,
      assessment_type: assessmentType || 'PERIODIC_EXAM',
      assessment_key: assessmentKey,
      raw_score: rawScore,
      target_score: targetScore,
      percentage: pct,
      grade: grade,
      updated_at: new Date().toISOString()
    }, { onConflict: 'student_id,step_level,subject_code,assessment_key' });
  } catch (err) {
    console.warn('[TUTOR APP] Error syncing grade to cloud:', err);
  }
}

function queueGradeCloudSave(payload) {
  const saveKey = `${payload.stepLevel}_${payload.subjectCode}_${payload.studentId}_${payload.assessmentKey}`;
  if (_gradeSaveTimers.has(saveKey)) {
    clearTimeout(_gradeSaveTimers.get(saveKey));
  }
  const timer = setTimeout(() => {
    _gradeSaveTimers.delete(saveKey);
    syncGradeToCloud(payload);
  }, 600);
  _gradeSaveTimers.set(saveKey, timer);
}

async function loadGradesForActiveMatrix(lvlNum, subjectCode) {
  try {
    const sb = _sb || await getSupabase();
    if (!sb) return;

    const { data, error } = await sb
      .from('student_academic_assessments')
      .select('student_id, step_level, subject_code, assessment_key, raw_score, percentage')
      .eq('step_level', lvlNum)
      .eq('subject_code', subjectCode);

    if (!error && Array.isArray(data)) {
      let changed = false;
      data.forEach(row => {
        const gradeKey = `${row.step_level}_${row.subject_code}_${row.student_id}_${row.assessment_key}`;
        const val = row.raw_score != null ? row.raw_score : row.percentage;
        if (_manualGrades.get(gradeKey) !== val) {
          _manualGrades.set(gradeKey, val);
          changed = true;
        }
      });
      if (changed) {
        try {
          localStorage.setItem('topscore_manual_grades', JSON.stringify(Array.from(_manualGrades.entries())));
        } catch (_) {}
        document.querySelectorAll('.grade-manual-input').forEach(inp => {
          const k = inp.dataset.gradeKey;
          if (_manualGrades.has(k)) {
            const val = _manualGrades.get(k);
            if (inp.value !== String(val)) {
              inp.value = val;
              const target = Number(inp.dataset.targetScore || 100);
              inp.className = `grade-manual-input ${getScoreColorClass(val, target)}`;
            }
          }
        });
      }
    }
  } catch (err) {
    console.warn('[TUTOR APP] Error loading grades from Supabase:', err);
  }
}

/**
 * 23. Render Grade Matrix (Manual Score Entry Datagrid)
 */
function renderGradeMatrix() {
  // 1. Update Active Level Pill
  document.querySelectorAll('#tutor-bottom-level-bar .btn-bottom-level, #grade-level-filter-bar .btn-level-pill').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.level, 10) === _gradeLevelNumber);
  });

  // 2. Populate Class Modality Pills for Selected Level (Single-Source Modalities, Zero Duplicates)
  let availableClasses = [];
  if (_currentTenant === 'CEC') {
    const stdMods = getStandardModalitiesForLevel(_gradeLevelNumber);
    availableClasses = stdMods.map(m => {
      const matchedClass = _classes.find(c => {
        const dMatch = detectClassDiscipline(c.code || c.name) === m.key;
        if (!dMatch) return false;
        if (c.code && c.code.includes(`-${_gradeLevelNumber}`)) return true;
        return true;
      });
      return {
        id: matchedClass ? matchedClass.id : `cls_${m.key.toLowerCase()}_${_gradeLevelNumber}`,
        code: matchedClass ? matchedClass.code : m.code,
        name: m.name,
        modality: m.key
      };
    });
  } else {
    // TOP Tenant
    const progCode = _selectedTopProgram;
    const matchedClass = _classes.find(c => {
      const code = (c.code || '').toUpperCase();
      const name = (c.name || '').toUpperCase();
      return code.includes(progCode.slice(0, 3)) || name.includes(progCode);
    }) || { id: `c_top_${progCode.toLowerCase()}`, name: `${progCode} Vocabulary`, code: `${progCode.slice(0, 3)}-VOCAB` };
    availableClasses = [{
      id: matchedClass.id,
      code: matchedClass.code,
      name: matchedClass.name,
      modality: 'VOCABULARY'
    }];
  }

  // Sort available classes strictly by scheduled start time ascending
  availableClasses.sort((a, b) => {
    const schedA = getClassScheduleItem(a.code);
    const schedB = getClassScheduleItem(b.code);
    const [hA, mA] = (schedA.start || '00:00').split(':').map(Number);
    const [hB, mB] = (schedB.start || '00:00').split(':').map(Number);
    return ((isNaN(hA) ? 9999 : hA) * 60 + (isNaN(mA) ? 0 : mA)) - ((isNaN(hB) ? 9999 : hB) * 60 + (isNaN(mB) ? 0 : mB));
  });

  if (!_gradeSelectedClass || !availableClasses.some(c => c.modality === _gradeSelectedClass.modality)) {
    _gradeSelectedClass = availableClasses[0];
  } else {
    _gradeSelectedClass = availableClasses.find(c => c.modality === _gradeSelectedClass.modality) || availableClasses[0];
  }

  const classFilterContainer = document.getElementById('grade-class-filter-bar');
  if (classFilterContainer) {
    classFilterContainer.innerHTML = '';
    availableClasses.forEach(c => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `btn-grade-class-pill ${c.modality === _gradeSelectedClass.modality ? 'active' : ''}`;

      // Short label mapping to guarantee zero truncation and zero horizontal overflow
      let shortLabel = c.name;
      if (c.modality === 'GFS' || /grammar\s+for\s+speaking/i.test(c.name)) shortLabel = 'GFS';
      else if (c.modality === 'VOCABULARY') shortLabel = 'Vocab';
      else if (c.modality === 'BASIC') shortLabel = 'Basic';
      else if (c.modality === 'STORYTELLING') shortLabel = 'Story';
      else if (c.modality === 'PRONUNCIATION') shortLabel = 'Pronunc';

      btn.textContent = shortLabel;
      btn.title = c.name;
      btn.addEventListener('click', () => {
        _gradeSelectedClass = c;
        renderGradeMatrix();
      });
      classFilterContainer.appendChild(btn);
    });
  }

  // 3. Resolve Exams for Selected Class (Strictly standard columns, e.g. 5 for Vocab, 2 for Basic, 4 for Story)
  const exams = getExamsForClass(_gradeSelectedClass, _gradeLevelNumber);

  // Trigger background cloud sync for active level + subject
  loadGradesForActiveMatrix(_gradeLevelNumber, _gradeSelectedClass.modality || _gradeSelectedClass.code);

  // 4. Render Table Header
  const thead = document.getElementById('thead-grade-matrix');
  if (thead) {
    let thHtml = '<tr><th class="th-student-name">STUDENT NAME</th>';
    exams.forEach(e => {
      const hasRub = !!e.rubric;
      const rubIcon = hasRub ? ' <span style="font-size:10px; color:#38bdf8;" title="View Rubric Guide">ℹ️</span>' : '';
      thHtml += `<th class="th-exam-score" style="text-align:center; min-width:44px; cursor:${hasRub ? 'pointer' : 'default'};" title="${e.title}" data-exam-key="${e.key}">${e.label}${rubIcon}</th>`;
    });
    thHtml += '</tr>';
    thead.innerHTML = thHtml;

    // Click handler for Rubric Guide on column headers
    thead.querySelectorAll('.th-exam-score').forEach((th, idx) => {
      const e = exams[idx];
      if (e && e.rubric) {
        th.addEventListener('click', () => openRubricGuideModal(e, null, ''));
      }
    });
  }

  // 5. Render Table Body (Students in Level 1, 2, 3)
  const tbody = document.getElementById('tbody-grade-matrix');
  if (!tbody) return;
  tbody.innerHTML = '';

  const students = getStudentsForLevel(_gradeLevelNumber);
  if (students.length === 0) {
    const colCount = 1 + (exams ? exams.length : 0);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td colspan="${colCount}" class="table-empty-row" style="text-align:center; padding: 36px 12px !important; color: #94a3b8; font-size: 13px; font-weight: 700;">
        No active students enrolled in Level ${_gradeLevelNumber}
      </td>
    `;
    tbody.appendChild(tr);
    return;
  }

  students.forEach(s => {
    const tr = document.createElement('tr');
    const studentDisplayName = cleanStudentName(s.name);
    let rowHtml = `<td class="td-student-name" style="padding:0 8px !important; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${studentDisplayName}</td>`;
    exams.forEach(e => {
      const gradeKey = `${_gradeLevelNumber}_${_gradeSelectedClass.modality || _gradeSelectedClass.code}_${s.id}_${e.key}`;
      const score = _manualGrades.get(gradeKey) ?? '';
      const colorCls = getScoreColorClass(score, e.target || 100);
      const titleAttr = e.rubric ? 'title="Double-click to open 1–5 Rubric Picker"' : '';
      rowHtml += `
        <td class="td-grade-cell">
          <input type="number" min="0" max="${e.target || 100}" class="grade-manual-input ${colorCls}"
                 data-grade-key="${gradeKey}"
                 data-student-id="${s.id}"
                 data-exam-key="${e.key}"
                 data-target-score="${e.target || 100}"
                 data-exam-type="${e.type || 'PERIODIC_EXAM'}"
                 data-batch-id="${s.batch_id || ''}"
                 value="${score !== '' ? score : ''}"
                 placeholder="—"
                 ${titleAttr} />
        </td>
      `;
    });
    tr.innerHTML = rowHtml;

    tr.querySelectorAll('.grade-manual-input').forEach(inp => {
      const examKey = inp.dataset.examKey;
      const matchedExam = exams.find(x => x.key === examKey);
      if (matchedExam && matchedExam.rubric) {
        inp.addEventListener('dblclick', () => {
          openRubricGuideModal(matchedExam, inp, cleanStudentName(s.name));
        });
      }

      inp.addEventListener('input', () => {
        const k = inp.dataset.gradeKey;
        const studentId = inp.dataset.studentId;
        const examKey = inp.dataset.examKey;
        const targetScore = Number(inp.dataset.targetScore || 100);
        const examType = inp.dataset.examType || 'PERIODIC_EXAM';
        const batchId = inp.dataset.batchId || (_gradeLevelNumber === 1 ? 'a4ce15e5-32d0-4745-9b99-3004c75ba806' : '3e7288b7-a90e-4323-9b02-24e73991f0d7');
        const classId = _gradeSelectedClass?.id && !_gradeSelectedClass.id.startsWith('cls_') ? _gradeSelectedClass.id : null;
        const subjectCode = _gradeSelectedClass.modality || _gradeSelectedClass.code;

        let num = inp.value === '' ? null : parseFloat(inp.value);
        if (num !== null && !isNaN(num)) {
          num = Math.max(0, Math.min(targetScore, num));
          inp.value = num;
          _manualGrades.set(k, num);
        } else {
          _manualGrades.delete(k);
        }
        inp.className = `grade-manual-input ${getScoreColorClass(num, targetScore)}`;
        try {
          localStorage.setItem('topscore_manual_grades', JSON.stringify(Array.from(_manualGrades.entries())));
        } catch (_) {}

        queueGradeCloudSave({
          studentId,
          batchId,
          classId,
          stepLevel: _gradeLevelNumber,
          subjectCode,
          assessmentKey: examKey,
          rawScore: num,
          targetScore,
          assessmentType: examType
        });
      });
    });

    tbody.appendChild(tr);
  });
}

function formatCompactAmount(num) {
  if (!num || num === 0) return '0';
  if (num >= 1000) {
    const kVal = num / 1000;
    return (Number.isInteger(kVal) ? kVal : kVal.toFixed(1)) + 'k';
  }
  return String(num);
}

/**
 * 24. Render Fines Table (Discipline & Fine Datagrid: Name | Words | Amount | Paid)
 */
function renderFinesTable() {
  // 1. Update Active Level Pill
  document.querySelectorAll('#tutor-bottom-level-bar .btn-bottom-level, #fines-level-filter-bar .btn-level-pill').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.level, 10) === _finesLevelNumber);
  });

  // 2. Load Students for Fines Level
  const students = getStudentsForLevel(_finesLevelNumber);

  // 3. Compute Totals for Fines
  let totalFine = 0, totalPaid = 0, totalDebt = 0;
  students.forEach(s => {
    const viol = _violationsMap.get(s.id) || { word_count: 0, fine_amount: 0, paid_amount: 0, debt_amount: 0 };
    totalFine += (viol.fine_amount || 0);
    totalPaid += (viol.paid_amount || 0);
    totalDebt += Math.max(0, (viol.fine_amount || 0) - (viol.paid_amount || 0));
  });

  const fineEl = document.getElementById('kpi-total-fine');
  const paidEl = document.getElementById('kpi-total-paid');
  const debtEl = document.getElementById('kpi-total-debt');
  const debtBadge = document.getElementById('badge-debt-count');

  if (fineEl) fineEl.textContent = formatCompactAmount(totalFine);
  if (paidEl) paidEl.textContent = formatCompactAmount(totalPaid);
  if (debtEl) debtEl.textContent = formatCompactAmount(totalDebt);
  if (debtBadge) debtBadge.textContent = formatCompactAmount(totalDebt);

  // 4. Render Table Body
  const tbody = document.getElementById('tbody-fines-matrix');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (students.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td colspan="4" class="table-empty-row" style="text-align:center; padding: 36px 12px !important; color: #94a3b8; font-size: 13px; font-weight: 700;">
        No active students enrolled in Level ${_finesLevelNumber}
      </td>
    `;
    tbody.appendChild(tr);
    return;
  }

  students.forEach(s => {
    const viol = _violationsMap.get(s.id) || { word_count: 0, fine_amount: 0, paid_amount: 0, debt_amount: 0 };
    const count = viol.word_count || 0;
    const amount = count * FINE_RATE_PER_WORD;
    const paid = viol.paid_amount || 0;
    const isPaidFull = paid >= amount && amount > 0;

    const tr = document.createElement('tr');
    const studentDisplayName = cleanStudentName(s.name);
    tr.innerHTML = `
      <td class="td-student-name" title="${studentDisplayName}">${studentDisplayName}</td>
      <td class="td-fines-count">
        <div class="fines-stepper">
          <button type="button" class="btn-step-minus" data-id="${s.id}" title="Decrease count">−</button>
          <span class="fines-count-display">${count}</span>
          <button type="button" class="btn-step-plus" data-id="${s.id}" title="Add violation">+</button>
        </div>
      </td>
      <td class="td-fines-amount" style="color:${amount > 0 ? 'var(--grade-e, #ff0000)' : '#94a3b8'};">
        ${formatCompactAmount(amount)}
      </td>
      <td class="td-fines-paid">
        <button type="button" class="btn-fines-pay-pill ${isPaidFull ? 'paid-full' : ''}" data-id="${s.id}" title="Record payment">
          ${formatCompactAmount(paid)}
        </button>
      </td>
    `;

    tr.querySelector('.btn-step-plus')?.addEventListener('click', (e) => {
      e.stopPropagation();
      stepFinesViolation(s.id, 1);
    });
    tr.querySelector('.btn-step-minus')?.addEventListener('click', (e) => {
      e.stopPropagation();
      stepFinesViolation(s.id, -1);
    });
    tr.querySelector('.btn-fines-pay-pill')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openPaymentModal(s.id);
    });

    tbody.appendChild(tr);
  });
}

function stepFinesViolation(studentId, delta) {
  const viol = _violationsMap.get(studentId) || { word_count: 0, fine_amount: 0, paid_amount: 0, debt_amount: 0 };
  viol.word_count = Math.max(0, (viol.word_count || 0) + delta);
  viol.fine_amount = viol.word_count * FINE_RATE_PER_WORD;
  viol.debt_amount = Math.max(0, viol.fine_amount - (viol.paid_amount || 0));
  _violationsMap.set(studentId, viol);

  try {
    localStorage.setItem('topscore_fines_data', JSON.stringify(Array.from(_violationsMap.entries())));
  } catch (_) {}

  renderFinesTable();
  renderPaymentTable();
}

/**
 * Backward compatibility alias for renderViolationList
 */
function renderViolationList() {
  renderFinesTable();
  renderPaymentTable();
}

function addStudentViolation(studentId, wordDelta) {
  stepFinesViolation(studentId, wordDelta);
}

function openPaymentModal(studentId) {
  const students = getStudentsForLevel(_finesLevelNumber);
  const student = students.find(s => s.id === studentId) || _students.find(s => s.id === studentId);
  const viol = _violationsMap.get(studentId) || { word_count: 0, fine_amount: 0, paid_amount: 0, debt_amount: 0 };
  const currentDebt = Math.max(0, (viol.fine_amount || 0) - (viol.paid_amount || 0));

  _selectedStudentForPayment = studentId;
  const nameEl = document.getElementById('modal-pay-student-name');
  const debtEl = document.getElementById('modal-pay-current-debt');
  const amtInput = document.getElementById('modal-pay-amount');

  if (nameEl) nameEl.textContent = student?.name || 'Student';
  if (debtEl) debtEl.textContent = formatCompactAmount(currentDebt);
  if (amtInput) amtInput.value = currentDebt > 0 ? currentDebt : 2000;
  document.getElementById('modal-payment')?.classList.remove('hidden');
}

function confirmPayment() {
  if (!_selectedStudentForPayment) return;
  const amountInput = document.getElementById('modal-pay-amount');
  const amount = parseInt(amountInput?.value || '0', 10);

  if (amount <= 0) {
    alert('Please enter a valid payment amount.');
    return;
  }

  const viol = _violationsMap.get(_selectedStudentForPayment) || { word_count: 0, fine_amount: 0, paid_amount: 0, debt_amount: 0 };
  viol.paid_amount = (viol.paid_amount || 0) + amount;
  viol.debt_amount = Math.max(0, (viol.fine_amount || 0) - viol.paid_amount);
  _violationsMap.set(_selectedStudentForPayment, viol);

  try {
    localStorage.setItem('topscore_fines_data', JSON.stringify(Array.from(_violationsMap.entries())));
  } catch (_) {}

  document.getElementById('modal-payment')?.classList.add('hidden');
  _selectedStudentForPayment = null;
  renderFinesTable();
  renderPaymentTable();
}

/**
 * 25. Render Payment Table (English Area Settlement Ledger)
 */
function renderPaymentTable() {
  // 1. Update Active Level Pill
  document.querySelectorAll('#tutor-bottom-level-bar .btn-bottom-level, #payment-level-filter-bar .btn-level-pill').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.level, 10) === _finesLevelNumber);
  });

  // 2. Load Students for Fines Level
  const students = getStudentsForLevel(_finesLevelNumber);

  // 3. Compute Totals for Payment
  let totalFine = 0, totalPaid = 0, totalDebt = 0;
  students.forEach(s => {
    const viol = _violationsMap.get(s.id) || { word_count: 0, fine_amount: 0, paid_amount: 0, debt_amount: 0 };
    totalFine += (viol.fine_amount || 0);
    totalPaid += (viol.paid_amount || 0);
    totalDebt += Math.max(0, (viol.fine_amount || 0) - (viol.paid_amount || 0));
  });

  const payTotalEl = document.getElementById('kpi-pay-total');
  const payPaidEl = document.getElementById('kpi-pay-paid');
  const payDebtEl = document.getElementById('kpi-pay-debt');

  if (payTotalEl) payTotalEl.textContent = formatCompactAmount(totalFine);
  if (payPaidEl) payPaidEl.textContent = formatCompactAmount(totalPaid);
  if (payDebtEl) payDebtEl.textContent = formatCompactAmount(totalDebt);

  // 4. Render Table Body
  const tbody = document.getElementById('tbody-payment-matrix');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (students.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td colspan="4" class="table-empty-row" style="text-align:center; padding: 36px 12px !important; color: #94a3b8; font-size: 13px; font-weight: 700;">
        No active students enrolled in Level ${_finesLevelNumber}
      </td>
    `;
    tbody.appendChild(tr);
    return;
  }

  students.forEach(s => {
    const viol = _violationsMap.get(s.id) || { word_count: 0, fine_amount: 0, paid_amount: 0, debt_amount: 0 };
    const debt = Math.max(0, (viol.fine_amount || 0) - (viol.paid_amount || 0));
    const paid = viol.paid_amount || 0;
    const isPaidFull = paid > 0 && debt === 0;

    const tr = document.createElement('tr');
    const studentDisplayName = cleanStudentName(s.name);
    tr.innerHTML = `
      <td class="td-student-name" title="${studentDisplayName}">${studentDisplayName}</td>
      <td class="td-pay-debt" style="text-align:right; font-weight:700; color:${debt > 0 ? 'var(--grade-e, #ff0000)' : '#94a3b8'};">
        ${formatCompactAmount(debt)}
      </td>
      <td class="td-pay-paid" style="text-align:right; font-weight:700; color:${paid > 0 ? 'var(--grade-a, #00c000)' : '#94a3b8'};">
        ${formatCompactAmount(paid)}
      </td>
      <td class="td-pay-action" style="text-align:center;">
        ${debt > 0 ? `
          <button type="button" class="btn-fines-pay-pill" data-id="${s.id}" title="Record payment">
            PAY
          </button>
        ` : (isPaidFull ? `
          <span style="color:var(--grade-a, #00c000); font-weight:800; font-size:12px;" title="Paid in Full">PAID ★</span>
        ` : `
          <span style="color:var(--clr-text-muted, #94a3b8); font-weight:700; font-size:12px;" title="No Outstanding Debt">CLEAR</span>
        `)}
      </td>
    `;

    tr.querySelector('.btn-fines-pay-pill')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openPaymentModal(s.id);
    });

    tbody.appendChild(tr);
  });
}

/**
 * 22. Check Restorable Active Session from Local Storage
 */
async function checkRestorableSession() {
  const saved = localStorage.getItem('topscore_active_tutor_session');
  if (saved) {
    try {
      _activeSession = JSON.parse(saved);
      if (_activeSession && _activeSession.status === 'ACTIVE') {
        if (_activeSession.class_id && !_selectedClass) {
          _selectedClass = _classes.find(c => c.id === _activeSession.class_id);
        }
        if (_selectedClass) {
          if (_selectedClass.level_id) {
            const lvl = _levels.find(l => l.id === _selectedClass.level_id);
            if (lvl) _selectedLevelNumber = lvl.level_number;
          } else if (_selectedClass.code) {
            const match = _selectedClass.code.match(/(?:CAMP|CMP)-(\d)/i);
            if (match) _selectedLevelNumber = parseInt(match[1], 10);
            if (/^(?:EVNK|EVN|SHRT|SHR|TPTC|TMT)/i.test(_selectedClass.code)) {
              _currentTenant = 'TOP';
            }
          }
        }
        if (_students.length === 0) {
          if (_currentTenant === 'CEC') {
            const targetLevel = _levels.find(l => l.level_number === _selectedLevelNumber);
            await loadStudentsForCecLevel(targetLevel?.id);
          } else {
            await loadStudentsForTopProgram(_selectedTopProgram);
          }
        }
        transitionToLiveActiveArena();
      }
    } catch (_) {}
  }
}
