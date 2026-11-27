import { adminFetchAll, formatStudentName } from '../api.js?v=20261125_v688';
import { escHtml, showToast } from '../app.js?v=20261106_v160';
import { getSvgIcon } from '../svg-icons.js?v=20261114_v487';
import { getGradeColorByScore, getGradeSymbol, detectClassDiscipline } from '../grading.js?v=20261106_v160';
import { getSupabase } from '../supabase.js?v=20261106_v160';

// ═══════════════════════════════════════════════════════════════
// TOPSCORE ADMIN — EXECUTIVE MASTER DASHBOARD
// Top Panel: Tabs (CEC vs TOP) | Sub Panel: Toolbar & Inst Profile
// Main Canvas: 50-50 Vertical Split (15 Classes | Faculty ID Badges)
// ═══════════════════════════════════════════════════════════════
const C = {
  STAR:    '#a855f7',   // ★ Excellent 100%
  A:       '#00c000',   // A Very Good 90–99%
  B:       '#95ff00',   // B Good 80–89% (Male Tutor Lime Accent)
  C:       '#ffff00',   // C Enough 60–79%
  D:       '#ff8c00',   // D Less 30–59%
  E:       '#ff0000',   // E Fail 0–29%
  TACT:    '#38bdf8',   // Tactical Cyan (primary)
  PINK:    '#ff2d87',   // Quad A — Admin (Female Tutor Pink Accent)
  ORANGE:  '#ff8c00',   // Quad B — Board
  LIME:    '#95ff00',   // Quad C — Class
  MUTED:   '#94a3b8',
  TEXT_DK: '#0f172a',
};

// Canonicalize class codes to 5-letter standard & normalize aliases
function canonicalizeClassCode(code) {
  if (!code) return '';
  let c = String(code).trim().toUpperCase();
  if (c.startsWith('CMP-')) c = c.replace('CMP-', 'CAMP-');
  if (c.startsWith('EVN-')) c = c.replace('EVN-', 'EVNK-');
  if (c.startsWith('SHR-')) c = c.replace('SHR-', 'SHRT-');
  if (c.startsWith('TMT-')) c = c.replace('TMT-', 'TPTC-');
  if (c === 'CAMP-1GRAM') c = 'CAMP-1GRMMR';
  if (c === 'CAMP-2GFS') c = 'CAMP-2GFORS';
  if (c === 'CAMP-2GRAM') c = 'CAMP-2GRMMR';
  if (c === 'CAMP-3PRON') c = 'CAMP-3PRONC';
  if (c === 'CAMP-3GRAM') c = 'CAMP-3GRMMR';
  return c;
}

// Instant Cross-Tab Realtime Broadcast Channel
const _deckSyncChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('topscore_deck_sync') : null;
function notifyDeckSync() {
  if (_deckSyncChannel) {
    try {
      _deckSyncChannel.postMessage({ type: 'DECK_UPDATE', timestamp: Date.now() });
    } catch (_) {}
  }
}

// Permanent cloud synchronization helper to Supabase site_settings
async function saveSettingToSupabase(key, value) {
  notifyDeckSync();
  try {
    const sb = await getSupabase();
    if (!sb) return;
    const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
    const { error } = await sb.from('site_settings').upsert({
      key,
      value: valueStr,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });
    if (error) {
      console.warn(`[admin-deck] site_settings upsert error for ${key}:`, error.message);
    }
  } catch (err) {
    console.warn(`[admin-deck] saveSettingToSupabase error for ${key}:`, err);
  }
}

// 15 Canonical Classes for CEC Curriculum (3 Levels × 5 Modalities)
const CEC_15_CURRICULUM_CLASSES = [
  // ── Level 1 (1st Step) ──
  { code: 'CAMP-1BASIC', name: 'Camp 1st Basic English',        level: 1, modality: 'BASIC' },
  { code: 'CAMP-1VOCAB', name: 'Camp 1st Vocabulary',           level: 1, modality: 'VOCABULARY' },
  { code: 'CAMP-1STORY', name: 'Camp 1st Storytelling',         level: 1, modality: 'STORYTELLING' },
  { code: 'CAMP-1SPEAK', name: 'Camp 1st Speaking',             level: 1, modality: 'SPEAKING' },
  { code: 'CAMP-1GRMMR', legacyCode: 'CAMP-1GRAM', name: 'Camp 1st Grammar', level: 1, modality: 'GRAMMAR' },
  // ── Level 2 (2nd Step) ──
  { code: 'CAMP-2GFORS', legacyCode: 'CAMP-2GFS', name: 'Camp 2nd Grammar for Speaking', level: 2, modality: 'GFS' },
  { code: 'CAMP-2VOCAB', name: 'Camp 2nd Vocabulary',           level: 2, modality: 'VOCABULARY' },
  { code: 'CAMP-2STORY', name: 'Camp 2nd Storytelling',         level: 2, modality: 'STORYTELLING' },
  { code: 'CAMP-2SPEAK', name: 'Camp 2nd Speaking',             level: 2, modality: 'SPEAKING' },
  { code: 'CAMP-2GRMMR', legacyCode: 'CAMP-2GRAM', name: 'Camp 2nd Grammar', level: 2, modality: 'GRAMMAR' },
  // ── Level 3 (3rd Step) ──
  { code: 'CAMP-3PRONC', legacyCode: 'CAMP-3PRON', name: 'Camp 3rd Pronunciation', level: 3, modality: 'PRON' },
  { code: 'CAMP-3VOCAB', name: 'Camp 3rd Vocabulary',           level: 3, modality: 'VOCABULARY' },
  { code: 'CAMP-3STORY', name: 'Camp 3rd Storytelling',         level: 3, modality: 'STORYTELLING' },
  { code: 'CAMP-3SPEAK', name: 'Camp 3rd Speaking',             level: 3, modality: 'SPEAKING' },
  { code: 'CAMP-3GRMMR', legacyCode: 'CAMP-3GRAM', name: 'Camp 3rd Grammar', level: 3, modality: 'GRAMMAR' },
];

// Authoritative Faculty & Tutor Data with Nicknames & Friendly Callouts
// Tutor Code SSOT Standard: 'T-XXX' (Strictly 3 uppercase letters e.g. T-TOP, T-AMR, T-ELY, T-NIZ, T-AME, T-CIT)
function generateTutorCodeFromName(nickname, fullName) {
  const clean = (nickname || fullName || '')
    .replace(/^(Mr\.|Miss|Mrs\.|Ms\.)\s*/i, '')
    .replace(/[^A-Za-z]/g, '')
    .toUpperCase();
  const tri = (clean.slice(0, 3) || 'TUT').padEnd(3, 'X');
  return `T-${tri}`;
}

const DEFAULT_FACULTY_REGISTRY = {
  CEC: [
    {
      id: 'tutor-cec-taufan',
      code: 'T-TOP',
      full_name: 'Mr. Taufan Hadi Ahmad',
      nickname: 'Mr. Top',
      gender: 'male',
      birth_date: '1987-11-07',
      address: 'Jl. Brawijaya No. 12, Pare, Kediri',
      specialty: 'Lead Academic Director & Speaking Specialist',
      institution_name: 'CAMP ENGLISH COURSE (CEC)',
      assigned_classes: ['CAMP-2GFORS', 'CAMP-2SPEAK', 'CAMP-3VOCAB', 'CAMP-3SPEAK']
    },
    {
      id: 'tutor-cec-amrullah',
      code: 'T-AMR',
      full_name: 'Mr. Muhammad Amrullah',
      nickname: 'Mr. Amrul',
      gender: 'male',
      birth_date: '1997-08-18',
      address: 'Jl. Dahlia No. 8, Pare, Kediri',
      specialty: 'Senior Grammar & Basic English Tutor',
      institution_name: 'CAMP ENGLISH COURSE (CEC)',
      assigned_classes: ['CAMP-1BASIC', 'CAMP-1GRMMR', 'CAMP-2VOCAB', 'CAMP-2GRMMR']
    },
    {
      id: 'tutor-cec-elysa',
      code: 'T-ELY',
      full_name: 'Miss Elysa Supiani',
      nickname: 'Miss Elysa',
      gender: 'female',
      birth_date: '1998-06-22',
      address: 'Mataram, Lombok Barat',
      specialty: 'Vocabulary & Monologue Specialist',
      institution_name: 'CAMP ENGLISH COURSE (CEC)',
      assigned_classes: ['CAMP-1VOCAB']
    },
    {
      id: 'tutor-cec-nizan',
      code: 'T-NIZ',
      full_name: 'Miss Nizan (Nizan)',
      nickname: 'Miss Nizan',
      gender: 'female',
      birth_date: '2001-06-05',
      address: 'Pare, Kediri, Jawa Timur',
      specialty: 'Pronunciation & Phonetics Instructor',
      institution_name: 'CAMP ENGLISH COURSE (CEC)',
      assigned_classes: ['CAMP-1SPEAK', 'CAMP-3STORY', 'CAMP-3PRONC']
    },
    {
      id: 'tutor-cec-cita',
      code: 'T-CIT',
      full_name: 'Miss Cita (Cita Santuni)',
      nickname: 'Miss Cita',
      gender: 'female',
      birth_date: '2003-09-12',
      address: 'Mataram, Lombok Barat',
      specialty: 'Interactive Speaking & Dialogue Coach',
      institution_name: 'CAMP ENGLISH COURSE (CEC)',
      assigned_classes: ['CAMP-2STORY']
    },
    {
      id: 'tutor-cec-amelia',
      code: 'T-AME',
      full_name: 'Miss Amel (Amelia)',
      nickname: 'Miss Amel',
      gender: 'female',
      birth_date: '2002-03-30',
      address: 'Senggigi, Lombok Barat',
      specialty: 'Storytelling & Speech Evaluation Specialist',
      institution_name: 'CAMP ENGLISH COURSE (CEC)',
      assigned_classes: ['CAMP-1STORY', 'CAMP-3GRMMR']
    }
  ],
  TOP: [
    {
      id: 'tutor-top-taufan',
      code: 'T-TOP',
      full_name: 'Mr. Taufan Hadi Ahmad',
      nickname: 'Mr. Top',
      gender: 'male',
      birth_date: '1987-11-07',
      address: 'Jl. Brawijaya No. 12, Pare, Kediri',
      specialty: 'Corporate Training & Hospitality Director',
      institution_name: 'TOPS OCCUPATIONAL PROGRAM (TOP)',
      assigned_classes: ['EVNK-VOCAB', 'SHRT-VOCAB']
    },
    {
      id: 'tutor-top-sq',
      code: 'T-QOR',
      full_name: "Miss Siti Qori' Atun Hizbaeni",
      nickname: 'Miss Siti',
      gender: 'female',
      birth_date: '2004-02-25',
      address: 'Mataram, Lombok Barat',
      specialty: 'Hospitality & Tourism English Lead',
      institution_name: 'TOPS OCCUPATIONAL PROGRAM (TOP)',
      assigned_classes: ['SHRT-VOCAB', 'TPTC-VOCAB']
    }
  ]
};

function getSavedFacultyRegistry() {
  try {
    const saved = localStorage.getItem('topscore_faculty_registry');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.CEC && parsed.TOP) {
        let modified = false;
        const defaultCodesCEC = {
          'tutor-cec-taufan': 'T-TOP',
          'tutor-cec-amrullah': 'T-AMR',
          'tutor-cec-elysa': 'T-ELY',
          'tutor-cec-nizan': 'T-NIZ',
          'tutor-cec-cita': 'T-CIT',
          'tutor-cec-amelia': 'T-AME'
        };
        const defaultCodesTOP = {
          'tutor-top-taufan': 'T-TOP',
          'tutor-top-sq': 'T-QOR'
        };
        parsed.CEC.forEach((t) => {
          if (!t.code || /^T-\d+$/i.test(t.code)) {
            t.code = defaultCodesCEC[t.id] || generateTutorCodeFromName(t.nickname, t.full_name);
            modified = true;
          }
        });
        parsed.TOP.forEach((t) => {
          if (!t.code || /^T-\d+$/i.test(t.code) || t.code === 'T-SIT') {
            t.code = defaultCodesTOP[t.id] || generateTutorCodeFromName(t.nickname, t.full_name);
            modified = true;
          }
        });
        if (modified) {
          try {
            localStorage.setItem('topscore_faculty_registry', JSON.stringify(parsed));
          } catch (_) {}
        }
        return parsed;
      }
    }
  } catch (_) {}
  return JSON.parse(JSON.stringify(DEFAULT_FACULTY_REGISTRY));
}

let FACULTY_REGISTRY = getSavedFacultyRegistry();

function saveFacultyRegistry() {
  try {
    localStorage.setItem('topscore_faculty_registry', JSON.stringify(FACULTY_REGISTRY));
  } catch (_) {}
  saveSettingToSupabase('deck_faculty_registry', FACULTY_REGISTRY);
}

// Authoritative Rooms Directory (Persistent in Supabase & LocalStorage)
const DEFAULT_ROOMS_DIRECTORY = {
  CEC: [
    { code: 'R-01', name: 'CEC Hall', capacity: 50, type: 'Classroom' },
    { code: 'R-02', name: 'New Room', capacity: 40, type: 'Classroom' },
    { code: 'R-03', name: 'Grass Room', capacity: 25, type: 'Classroom' },
    { code: 'R-04', name: 'AC Room', capacity: 25, type: 'Classroom' },
    { code: 'R-05', name: "Girl's Camp", capacity: 20, type: 'Classroom' }
  ],
  TOP: [
    { code: 'HAL-0A', name: 'Executive Hall A', capacity: 50, type: 'Corporate Training' },
    { code: 'HAL-0B', name: 'Banquet Hall B', capacity: 80, type: 'Hospitality Lab' },
    { code: 'HAL-0C', name: 'Seminar Hall C', capacity: 40, type: 'Workshop Suite' }
  ]
};

function getSavedRoomsDirectory() {
  try {
    const saved = localStorage.getItem('topscore_rooms_directory');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.CEC && parsed.TOP) return parsed;
    }
  } catch (_) {}
  return JSON.parse(JSON.stringify(DEFAULT_ROOMS_DIRECTORY));
}

let _roomsDirectory = getSavedRoomsDirectory();

function saveRoomsDirectory() {
  try {
    localStorage.setItem('topscore_rooms_directory', JSON.stringify(_roomsDirectory));
  } catch (_) {}
  saveSettingToSupabase('deck_rooms_directory', _roomsDirectory);
}

// Active Tab state in Attendance ('CEC' | 'TOP')
let _currentDashboardTab = 'CEC';
let _isDashboardEditMode = false;

// Class Mode SSOT ('System' | 'Manual')
const DEFAULT_CLASS_MODE_MAP = {
  'CAMP-1BASIC': 'System',
  'CAMP-1VOCAB': 'Manual',
  'CAMP-1STORY': 'Manual',
  'CAMP-1SPEAK': 'Manual',
  'CAMP-1GRMMR': 'Manual',
  'CAMP-2GFORS': 'Manual',
  'CAMP-2VOCAB': 'Manual',
  'CAMP-2STORY': 'Manual',
  'CAMP-2SPEAK': 'Manual',
  'CAMP-2GRMMR': 'Manual',
  'CAMP-3PRONC': 'Manual',
  'CAMP-3VOCAB': 'System',
  'CAMP-3STORY': 'Manual',
  'CAMP-3SPEAK': 'Manual',
  'CAMP-3GRMMR': 'Manual',
  'EVNK-VOCAB':  'System',
  'SHRT-VOCAB':  'System',
  'TPTC-VOCAB':  'System',
};

function getSavedClassModeMap() {
  try {
    const saved = localStorage.getItem('topscore_class_mode_map');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        return Object.assign({}, DEFAULT_CLASS_MODE_MAP, parsed);
      }
    }
  } catch (_) {}
  return Object.assign({}, DEFAULT_CLASS_MODE_MAP);
}

let _classModeMap = getSavedClassModeMap();

function getClassMode(code) {
  const cCode = canonicalizeClassCode(code);
  const val = _classModeMap[cCode] || _classModeMap[code] || 'Manual';
  return /^system|cbt$/i.test(val) ? 'System' : 'Manual';
}

function saveClassModeMap() {
  try {
    localStorage.setItem('topscore_class_mode_map', JSON.stringify(_classModeMap));
  } catch (_) {}
  saveSettingToSupabase('deck_class_mode_map', _classModeMap);
}

// Default Class-to-Tutor mapping (Persistent in Supabase & LocalStorage — 0 Clashes SSOT)
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
  'CMP-2GFS':   'tutor-cec-taufan',
  'CMP-2VOCAB': 'tutor-cec-amrullah',
  'CMP-2STORY': 'tutor-cec-cita',
  'CMP-2SPEAK': 'tutor-cec-taufan',
  'CMP-2GRAM':  'tutor-cec-amrullah',
  'CMP-3PRON':  'tutor-cec-nizan',
  'CMP-3VOCAB': 'tutor-cec-taufan',
  'CMP-3STORY': 'tutor-cec-nizan',
  'CMP-3SPEAK': 'tutor-cec-taufan',
  'CMP-3GRAM':  'tutor-cec-amelia',
  'EVN-VOCAB':  'tutor-top-taufan',
  'SHR-VOCAB':  'tutor-top-sq',
  'TMT-VOCAB':  'tutor-top-sq'
};

function getSavedTutorMap() {
  try {
    const saved = localStorage.getItem('topscore_class_tutor_map');
    if (saved) return Object.assign({}, DEFAULT_CLASS_TUTOR_MAP, JSON.parse(saved));
  } catch (_) {}
  return Object.assign({}, DEFAULT_CLASS_TUTOR_MAP);
}

let _classTutorMap = getSavedTutorMap();

// ── Authoritative Batch Superlatives (King, Queen, English Area Violator, Least Att, Diligent, Active) ──
const DEFAULT_BATCH_SUPERLATIVES_MAP = {
  '135': {
    king: 'Faesal Ramdani',
    queen: 'Lucky Amelia',
    violator: 'Singgih Dwi Putra Gunanda',
    least_att: 'Yola Meilya Saputri',
    diligent: 'Eni Shufiyanti',
    active: 'M.husnul Fikri Al Insani'
  },
  '134': {
    king: 'Muhamad Alifurrahman',
    queen: 'Havvina Solehah',
    violator: 'Wildian Yusroni',
    least_att: 'Alfina Damayanti',
    diligent: 'Isnantika Salsabila',
    active: 'Cinta Laura'
  }
};

function getSavedBatchSuperlatives() {
  try {
    const saved = localStorage.getItem('topscore_batch_superlatives_map');
    if (saved) return Object.assign({}, DEFAULT_BATCH_SUPERLATIVES_MAP, JSON.parse(saved));
  } catch (_) {}
  return JSON.parse(JSON.stringify(DEFAULT_BATCH_SUPERLATIVES_MAP));
}

let _batchSuperlativesMap = getSavedBatchSuperlatives();

window._onDashboardBatchSuperlativeChange = (batchName, field, val) => {
  if (!_batchSuperlativesMap[batchName]) _batchSuperlativesMap[batchName] = {};
  _batchSuperlativesMap[batchName][field] = val || '—';
  try {
    localStorage.setItem('topscore_batch_superlatives_map', JSON.stringify(_batchSuperlativesMap));
  } catch (_) {}
  if (typeof window._rerenderDashboardView === 'function') {
    window._rerenderDashboardView();
  }
};

// Strict Hyphenated Room Code SSOT (e.g. R-01, R-02, R-03, R-04, R-05, HAL-0A, HAL-0B, HAL-0C)
function resolveRoomCode(roomVal) {
  if (!roomVal || roomVal === '—') return '—';
  const val = String(roomVal).trim();
  if (/^R-?0?1$/i.test(val) || /CEC\s*Hall/i.test(val)) return 'R-01';
  if (/^R-?0?2$/i.test(val) || /New\s*Room/i.test(val)) return 'R-02';
  if (/^R-?0?3$/i.test(val) || /Grass\s*Room/i.test(val)) return 'R-03';
  if (/^R-?0?4$/i.test(val) || /AC\s*Room/i.test(val)) return 'R-04';
  if (/^R-?0?5$/i.test(val) || /Girl'?s?\s*Camp/i.test(val)) return 'R-05';
  if (/^R-?101$/i.test(val) || /^Room\s*101$/i.test(val)) return 'R-01';
  if (/^R-?102$/i.test(val) || /^Room\s*102$/i.test(val)) return 'R-02';
  if (/^R-?103$/i.test(val) || /^Room\s*103$/i.test(val)) return 'R-03';
  if (/^LAB-?0?1$/i.test(val) || /Language\s*Lab/i.test(val)) return 'LAB-01';
  if (/^HAL-?0?A$/i.test(val) || /Executive\s*Hall\s*A/i.test(val) || /Main\s*Camp\s*Hall/i.test(val) || /^HALL-?A$/i.test(val) || /^Hall\s*A$/i.test(val)) return 'HAL-0A';
  if (/^HAL-?0?B$/i.test(val) || /Banquet\s*Hall\s*B/i.test(val) || /^HALL-?B$/i.test(val) || /^Hall\s*B$/i.test(val)) return 'HAL-0B';
  if (/^HAL-?0?C$/i.test(val) || /Seminar\s*Hall\s*C/i.test(val) || /^HALL-?C$/i.test(val) || /^Hall\s*C$/i.test(val)) return 'HAL-0C';
  return val.toUpperCase();
}

function resolveRoomName(roomVal) {
  if (!roomVal || roomVal === '—') return '—';
  const code = resolveRoomCode(roomVal);
  const cecRooms = (_roomsDirectory && _roomsDirectory.CEC) || DEFAULT_ROOMS_DIRECTORY.CEC;
  const topRooms = (_roomsDirectory && _roomsDirectory.TOP) || DEFAULT_ROOMS_DIRECTORY.TOP;
  const allRooms = [...cecRooms, ...topRooms];
  const matched = allRooms.find(r => r.code === code || r.name.toUpperCase() === String(roomVal).toUpperCase());
  if (matched) return matched.name;
  if (code === 'R-01') return 'CEC Hall';
  if (code === 'R-02') return 'New Room';
  if (code === 'R-03') return 'Grass Room';
  if (code === 'R-04') return 'AC Room';
  if (code === 'R-05') return "Girl's Camp";
  if (code === 'HAL-0A') return 'Executive Hall A';
  if (code === 'HAL-0B') return 'Banquet Hall B';
  if (code === 'HAL-0C') return 'Seminar Hall C';
  return roomVal;
}

// Calculate class duration in minutes: Storytelling = 90 mins (1.5 hrs), TOP classes = 90 mins (1.5 hrs), all others = 60 mins (1 hr)
function getClassDefaultDurationMinutes(classCode, className = '') {
  const code = String(classCode || '').toUpperCase();
  const name = String(className || '').toUpperCase();
  if (code.includes('STORY') || code.includes('STT') || name.includes('STORYTELLING') || name.includes('STORY')) {
    return 90;
  }
  if (code.startsWith('EVN') || code.startsWith('SHR') || code.startsWith('TMT') || name.includes('EVNIKOM') || name.includes('SHERATON') || name.includes('TAMATA')) {
    return 90;
  }
  return 60;
}

// Add minutes to time string "HH:mm" with 24-hour wrap
function addMinutesToTime(timeStr, minutesToAdd) {
  if (!timeStr || !timeStr.includes(':')) return '—';
  const parts = timeStr.trim().split(':');
  let h = parseInt(parts[0], 10);
  let m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return '—';

  let totalMinutes = h * 60 + m + minutesToAdd;
  totalMinutes = ((totalMinutes % 1440) + 1440) % 1440;

  const newH = Math.floor(totalMinutes / 60);
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

// ── Quarter-Hour (15-min) Schedule Slots: 00, 15, 30, 45 (06:00 to 22:00) ──
function getQuarterHourTimeSlots() {
  const slots = [];
  for (let h = 6; h <= 22; h++) {
    const hh = String(h).padStart(2, '0');
    for (const m of [0, 15, 30, 45]) {
      if (h === 22 && m > 0) break;
      const mm = String(m).padStart(2, '0');
      slots.push(`${hh}:${mm}`);
    }
  }
  return slots;
}

const QUARTER_HOUR_TIME_SLOTS = getQuarterHourTimeSlots();

// ── Schedule Day Options ──
const CLASS_DAY_OPTIONS = [
  'Mon–Fri',
  'Mon–Sat',
  'Daily',
  'Mon/Wed/Fri',
  'Tue/Thu',
  'Mon–Thu',
  'Fri–Sat',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

function doDaysOverlap(day1, day2) {
  const d1 = (day1 || 'Mon–Fri').trim();
  const d2 = (day2 || 'Mon–Fri').trim();
  if (d1 === 'Daily' || d2 === 'Daily') return true;
  if (d1 === d2) return true;

  const parseDays = (d) => {
    if (d === 'Mon–Fri') return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    if (d === 'Mon–Sat') return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    if (d === 'Mon–Thu') return ['Mon', 'Tue', 'Wed', 'Thu'];
    if (d === 'Mon/Wed/Fri') return ['Mon', 'Wed', 'Fri'];
    if (d === 'Tue/Thu') return ['Tue', 'Thu'];
    if (d === 'Fri–Sat') return ['Fri', 'Sat'];
    return [d.slice(0, 3)];
  };

  const set1 = parseDays(d1);
  const set2 = parseDays(d2);
  return set1.some(day => set2.includes(day));
}

function renderQuarterHourTimeSelect(selectedValue, onchangeCode, customStyle = '', isWarning = false) {
  const currentVal = (selectedValue || '').trim();
  let found = false;
  const optionsHtml = QUARTER_HOUR_TIME_SLOTS.map(t => {
    const sel = (t === currentVal) ? 'selected' : '';
    if (sel) found = true;
    return `<option value="${t}" ${sel} style="background:#0f172a;color:#f8fafc;">${t}</option>`;
  }).join('');

  // If current value is custom/not in 15-min slots, preserve it seamlessly
  const extraOpt = (!found && currentVal && currentVal !== '—')
    ? `<option value="${escHtml(currentVal)}" selected style="background:#0f172a;color:#f8fafc;">${escHtml(currentVal)}</option>`
    : '';

  const borderStyle = isWarning
    ? 'border:1px solid var(--grade-e, #ff0000) !important;background:rgba(255,0,0,0.15) !important;color:var(--grade-e, #ff0000) !important;'
    : 'border:none;background:transparent;color:#f8fafc;';

  return `
    <select onchange="${onchangeCode}" style="height:100%;width:100%;padding:0 2px;font-size:12px !important;font-family:'Inter',sans-serif !important;font-weight:500;outline:none;box-sizing:border-box;text-align:center;cursor:pointer;${borderStyle}${customStyle}">
      <option value="—" style="background:#0f172a;color:#94a3b8;">—</option>
      ${extraOpt}
      ${optionsHtml}
    </select>
  `;
}

// ── Schedule & Room Conflict Audit Engine ──
function timeToMinutes(tStr) {
  if (!tStr || typeof tStr !== 'string' || !tStr.includes(':')) return null;
  const parts = tStr.trim().split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

// Calculate duration in minutes between start and end (wrapped at 24h if overnight)
function getScheduleDurationMinutes(start, end) {
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  if (s === null || e === null) return 60;
  let diff = e - s;
  if (diff <= 0) diff += 1440;
  return diff;
}

function doTimeRangesOverlap(s1, e1, s2, e2) {
  if (s1 === null || e1 === null || s2 === null || e2 === null) return false;
  const end1 = e1 <= s1 ? e1 + 1440 : e1;
  const end2 = e2 <= s2 ? e2 + 1440 : e2;
  return s1 < end2 && s2 < end1;
}

function auditScheduleAndCapacity(classesList, activeRooms, activeTutors) {
  const auditResults = {};
  classesList.forEach(c => {
    auditResults[c.code] = {
      tutorClashes: [],
      roomClashes: [],
      capacityIssue: null
    };
  });

  // 1. Pairwise check for Tutor & Room clashes
  for (let i = 0; i < classesList.length; i++) {
    const c1 = classesList[i];
    const s1 = _classScheduleMap[c1.code] || {};
    const t1Id = _classTutorMap[c1.code];
    const r1Name = resolveRoomName(s1.room);
    const start1 = timeToMinutes(s1.start);
    const end1 = timeToMinutes(s1.end);
    const day1 = s1.day || 'Mon–Fri';

    for (let j = i + 1; j < classesList.length; j++) {
      const c2 = classesList[j];
      const s2 = _classScheduleMap[c2.code] || {};
      const t2Id = _classTutorMap[c2.code];
      const r2Name = resolveRoomName(s2.room);
      const start2 = timeToMinutes(s2.start);
      const end2 = timeToMinutes(s2.end);
      const day2 = s2.day || 'Mon–Fri';

      if (doDaysOverlap(day1, day2) && doTimeRangesOverlap(start1, end1, start2, end2)) {
        // Tutor Clash
        if (t1Id && t2Id && t1Id === t2Id) {
          const tutorObj = activeTutors.find(t => t.id === t1Id);
          const tutorNick = tutorObj ? tutorObj.nickname : 'Tutor';
          auditResults[c1.code].tutorClashes.push({
            otherCode: c2.code,
            otherName: c2.name,
            tutorName: tutorNick,
            otherTime: `${day2} ${s2.start || '?'}–${s2.end || '?'}`
          });
          auditResults[c2.code].tutorClashes.push({
            otherCode: c1.code,
            otherName: c1.name,
            tutorName: tutorNick,
            otherTime: `${day1} ${s1.start || '?'}–${s1.end || '?'}`
          });
        }

        // Room Clash
        if (r1Name && r1Name !== '—' && r2Name && r2Name !== '—' && r1Name.toUpperCase() === r2Name.toUpperCase()) {
          auditResults[c1.code].roomClashes.push({
            otherCode: c2.code,
            otherName: c2.name,
            roomName: r1Name,
            otherTime: `${day2} ${s2.start || '?'}–${s2.end || '?'}`
          });
          auditResults[c2.code].roomClashes.push({
            otherCode: c1.code,
            otherName: c1.name,
            roomName: r2Name,
            otherTime: `${day1} ${s1.start || '?'}–${s1.end || '?'}`
          });
        }
      }
    }

    // 2. Room Capacity check
    if (r1Name && r1Name !== '—') {
      const roomObj = activeRooms.find(r => r.name.toUpperCase() === r1Name.toUpperCase() || r.code.toUpperCase() === r1Name.toUpperCase());
      const cap = roomObj && roomObj.capacity ? Number(roomObj.capacity) : 0;
      const stdCount = Number(c1.studentCount) || 0;
      if (cap > 0 && stdCount > cap) {
        auditResults[c1.code].capacityIssue = {
          studentCount: stdCount,
          capacity: cap,
          roomName: r1Name,
          diff: stdCount - cap
        };
      }
    }
  }

  let rawTutorCount = 0;
  let rawRoomCount = 0;
  let totalCapacityIssues = 0;

  Object.values(auditResults).forEach(res => {
    rawTutorCount += res.tutorClashes.length;
    rawRoomCount += res.roomClashes.length;
    if (res.capacityIssue) totalCapacityIssues++;
  });

  const totalTutorClashes = Math.round(rawTutorCount / 2);
  const totalRoomClashes = Math.round(rawRoomCount / 2);
  const totalConflicts = totalTutorClashes + totalRoomClashes + totalCapacityIssues;

  return {
    byClass: auditResults,
    totalConflicts,
    totalTutorClashes,
    totalRoomClashes,
    totalCapacityIssues
  };
}

// Default Room & Daily Schedule mapping (Strict Hyphenated Room Codes SSOT: R-01, R-02, R-03, R-04, R-05, HAL-0A, HAL-0B, HAL-0C)
const DEFAULT_CLASS_SCHEDULE_MAP = {
  // Level 1 — Real CEC Schedule (06:00 Vocab, 07:30 Story, 10:00 Grammar, 17:00 Basic, 20:00 Speak)
  'CAMP-1VOCAB': { room: 'R-01', start: '06:00', end: '07:00', duration: 60, day: 'Mon–Fri' },
  'CAMP-1STORY': { room: 'R-01', start: '07:30', end: '09:00', duration: 90, day: 'Mon–Fri' },
  'CAMP-1GRAM':  { room: 'R-01', start: '10:00', end: '11:00', duration: 60, day: 'Mon–Fri' },
  'CAMP-1GRMMR': { room: 'R-01', start: '10:00', end: '11:00', duration: 60, day: 'Mon–Fri' },
  'CAMP-1BASIC': { room: 'R-01', start: '17:00', end: '18:00', duration: 60, day: 'Mon–Fri' },
  'CAMP-1SPEAK': { room: 'R-01', start: '20:00', end: '21:00', duration: 60, day: 'Mon–Fri' },
  // Level 2 — Real CEC Schedule (06:00 Vocab, 07:30 Story, 10:00 GFS, 15:00 Grammar, 16:00 Speak)
  'CAMP-2VOCAB': { room: 'R-03', start: '06:00', end: '07:00', duration: 60, day: 'Mon–Fri' },
  'CAMP-2STORY': { room: 'R-02', start: '07:30', end: '09:00', duration: 90, day: 'Mon–Fri' },
  'CAMP-2GFS':   { room: 'R-02', start: '10:00', end: '11:00', duration: 60, day: 'Mon–Fri' },
  'CAMP-2GFORS': { room: 'R-02', start: '10:00', end: '11:00', duration: 60, day: 'Mon–Fri' },
  'CAMP-2GRAM':  { room: 'R-02', start: '15:00', end: '16:00', duration: 60, day: 'Mon–Fri' },
  'CAMP-2GRMMR': { room: 'R-02', start: '15:00', end: '16:00', duration: 60, day: 'Mon–Fri' },
  'CAMP-2SPEAK': { room: 'R-01', start: '16:00', end: '17:00', duration: 60, day: 'Mon–Fri' },
  // Level 3 — Real CEC Schedule (06:00 Vocab, 07:30 Story, 10:00 Pronunciation, 13:30 Speak, 15:00 Grammar)
  'CAMP-3VOCAB': { room: 'R-02', start: '06:00', end: '07:00', duration: 60, day: 'Mon–Fri' },
  'CAMP-3STORY': { room: 'R-03', start: '07:30', end: '09:00', duration: 90, day: 'Mon–Fri' },
  'CAMP-3PRON':  { room: 'R-03', start: '10:00', end: '11:00', duration: 60, day: 'Mon–Fri' },
  'CAMP-3PRONC': { room: 'R-03', start: '10:00', end: '11:00', duration: 60, day: 'Mon–Fri' },
  'CAMP-3SPEAK': { room: 'R-03', start: '13:30', end: '15:00', duration: 90, day: 'Mon–Fri' },
  'CAMP-3GRAM':  { room: 'R-03', start: '15:00', end: '16:00', duration: 60, day: 'Mon–Fri' },
  'CAMP-3GRMMR': { room: 'R-03', start: '15:00', end: '16:00', duration: 60, day: 'Mon–Fri' },
  // TOP Classes — 1.5 hrs average
  'EVNK-VOCAB':  { room: 'HAL-0A', start: '08:30', end: '10:00', duration: 90, day: 'Mon–Fri' },
  'SHRT-VOCAB':  { room: 'HAL-0B', start: '13:00', end: '14:30', duration: 90, day: 'Mon–Fri' },
  'TPTC-VOCAB':  { room: 'HAL-0C', start: '16:00', end: '17:30', duration: 90, day: 'Mon–Fri' },
  // Backward compatibility aliases
  'CMP-1VOCAB': { room: 'R-01', start: '06:00', end: '07:00', duration: 60, day: 'Mon–Fri' },
  'CMP-1STORY': { room: 'R-01', start: '07:30', end: '09:00', duration: 90, day: 'Mon–Fri' },
  'CMP-1GRAM':  { room: '—',    start: '10:00', end: '11:00', duration: 60, day: 'Mon–Fri' },
  'CMP-1BASIC': { room: 'R-01', start: '17:00', end: '18:00', duration: 60, day: 'Mon–Fri' },
  'CMP-1SPEAK': { room: 'R-01', start: '20:00', end: '21:00', duration: 60, day: 'Mon–Fri' },
  'CMP-2VOCAB': { room: 'R-03', start: '06:00', end: '07:00', duration: 60, day: 'Mon–Fri' },
  'CMP-2STORY': { room: 'R-02', start: '07:30', end: '09:00', duration: 90, day: 'Mon–Fri' },
  'CMP-2GFS':   { room: '—',    start: '10:00', end: '11:00', duration: 60, day: 'Mon–Fri' },
  'CMP-2GRAM':  { room: '—',    start: '15:00', end: '16:00', duration: 60, day: 'Mon–Fri' },
  'CMP-2SPEAK': { room: 'R-01', start: '16:00', end: '17:00', duration: 60, day: 'Mon–Fri' },
  'CMP-3VOCAB': { room: 'R-02', start: '06:00', end: '07:00', duration: 60, day: 'Mon–Fri' },
  'CMP-3STORY': { room: 'R-03', start: '07:30', end: '09:00', duration: 90, day: 'Mon–Fri' },
  'CMP-3PRON':  { room: '—',    start: '10:00', end: '11:00', duration: 60, day: 'Mon–Fri' },
  'CMP-3SPEAK': { room: 'R-03', start: '13:30', end: '15:00', duration: 90, day: 'Mon–Fri' },
  'CMP-3GRAM':  { room: '—',    start: '15:00', end: '16:00', duration: 60, day: 'Mon–Fri' },
  'EVN-VOCAB':  { room: 'HAL-0A', start: '08:30', end: '10:00', duration: 90, day: 'Mon–Fri' },
  'SHR-VOCAB':  { room: 'HAL-0B', start: '13:00', end: '14:30', duration: 90, day: 'Mon–Fri' },
  'TMT-VOCAB':  { room: 'HAL-0C', start: '16:00', end: '17:30', duration: 90, day: 'Mon–Fri' }
};

function getSavedScheduleMap() {
  try {
    const saved = localStorage.getItem('topscore_class_schedule_map');
    if (saved) {
      const parsed = JSON.parse(saved);
      const res = JSON.parse(JSON.stringify(DEFAULT_CLASS_SCHEDULE_MAP));
      Object.entries(parsed).forEach(([k, v]) => {
        const canonicalKey = canonicalizeClassCode(k);
        if (!res[canonicalKey]) res[canonicalKey] = { room: '—', start: '08:00', end: '09:00', day: 'Mon–Fri' };
        if (v.room) res[canonicalKey].room = resolveRoomCode(v.room);
        if (v.day) res[canonicalKey].day = v.day;
        if (v.start) res[canonicalKey].start = v.start;
        if (v.end) res[canonicalKey].end = v.end;
        if (v.duration) res[canonicalKey].duration = parseInt(v.duration, 10);
        if (v.time && (!res[canonicalKey].start || !res[canonicalKey].end)) {
          const parts = String(v.time).split(/[-–—]/);
          if (parts[0]) res[canonicalKey].start = parts[0].trim();
          if (parts[1]) res[canonicalKey].end = parts[1].trim();
        }
        // Mirror to original key if different
        if (canonicalKey !== k) {
          res[k] = Object.assign({}, res[canonicalKey]);
        }
      });
      return res;
    }
  } catch (_) {}
  return JSON.parse(JSON.stringify(DEFAULT_CLASS_SCHEDULE_MAP));
}

let _classScheduleMap = getSavedScheduleMap();

window._onDashboardScheduleChange = (classCode, field, value) => {
  const cCode = canonicalizeClassCode(classCode);
  if (!_classScheduleMap[cCode]) _classScheduleMap[cCode] = { room: '—', start: '08:00', end: '09:00', day: 'Mon–Fri', duration: 60 };
  if (!_classScheduleMap[classCode]) _classScheduleMap[classCode] = _classScheduleMap[cCode];
  const cleanVal = String(value).trim() || '—';

  if (field === 'start') {
    _classScheduleMap[cCode].start = cleanVal;
    _classScheduleMap[classCode].start = cleanVal;
    if (cleanVal && cleanVal !== '—') {
      const currentDur = _classScheduleMap[cCode].duration || getScheduleDurationMinutes(cleanVal, _classScheduleMap[cCode].end) || 60;
      const computedEnd = addMinutesToTime(cleanVal, currentDur);
      _classScheduleMap[cCode].end = computedEnd;
      _classScheduleMap[classCode].end = computedEnd;
    }
  } else if (field === 'end') {
    // Explicit manual edit for END time ("tapi bisa diedit")
    _classScheduleMap[cCode].end = cleanVal;
    _classScheduleMap[classCode].end = cleanVal;
    if (cleanVal && cleanVal !== '—' && _classScheduleMap[cCode].start && _classScheduleMap[cCode].start !== '—') {
      const computedDur = getScheduleDurationMinutes(_classScheduleMap[cCode].start, cleanVal);
      if (computedDur >= 60 && computedDur <= 180) {
        _classScheduleMap[cCode].duration = computedDur;
        _classScheduleMap[classCode].duration = computedDur;
      }
    }
  } else if (field === 'duration') {
    const durNum = parseInt(cleanVal, 10);
    const validDur = (!isNaN(durNum) && durNum >= 60 && durNum <= 180) ? durNum : 60;
    _classScheduleMap[cCode].duration = validDur;
    _classScheduleMap[classCode].duration = validDur;
    if (_classScheduleMap[cCode].start && _classScheduleMap[cCode].start !== '—') {
      const computedEnd = addMinutesToTime(_classScheduleMap[cCode].start, validDur);
      _classScheduleMap[cCode].end = computedEnd;
      _classScheduleMap[classCode].end = computedEnd;
    }
  } else if (field === 'room') {
    const rCode = resolveRoomCode(cleanVal);
    _classScheduleMap[cCode].room = rCode;
    _classScheduleMap[classCode].room = rCode;
  } else if (field === 'day') {
    _classScheduleMap[cCode].day = cleanVal;
    _classScheduleMap[classCode].day = cleanVal;
  }

  try {
    localStorage.setItem('topscore_class_schedule_map', JSON.stringify(_classScheduleMap));
  } catch (_) {}
  saveSettingToSupabase('deck_class_schedule_map', _classScheduleMap);

  if (typeof window._rerenderDashboardView === 'function') {
    window._rerenderDashboardView();
  }
};

function syncFacultyAssignedClasses() {
  const allTutors = [...FACULTY_REGISTRY.CEC, ...FACULTY_REGISTRY.TOP];
  allTutors.forEach(t => {
    t.assigned_classes = Object.entries(_classTutorMap)
      .filter(([_, tid]) => tid === t.id)
      .map(([code]) => code);
  });
}
syncFacultyAssignedClasses();

window._onDashboardTutorChange = (classCode, newTutorId) => {
  const cCode = canonicalizeClassCode(classCode);
  _classTutorMap[cCode] = newTutorId || null;
  _classTutorMap[classCode] = newTutorId || null;

  try {
    localStorage.setItem('topscore_class_tutor_map', JSON.stringify(_classTutorMap));
  } catch (_) {}
  saveSettingToSupabase('deck_class_tutor_map', _classTutorMap);

  syncFacultyAssignedClasses();
  if (typeof window._rerenderDashboardView === 'function') {
    window._rerenderDashboardView();
  }
};

// ── Strict Multi-Tier Sorting: Level Ascending, then Start Time Ascending (User SSOT) ──
function sortClassesByLevelAndTime(classesList) {
  return [...classesList].sort((a, b) => {
    // 1. Primary: Level ascending (1, 2, 3... 0 at natural level)
    const lvlA = Number(a.level) || 0;
    const lvlB = Number(b.level) || 0;
    if (lvlA !== lvlB) return lvlA - lvlB;

    // 2. Secondary: Start time ascending (06:00, 07:30, 08:00, ..., 99999 for unassigned)
    const cCodeA = canonicalizeClassCode(a.code);
    const cCodeB = canonicalizeClassCode(b.code);
    const schedA = _classScheduleMap[a.code] || _classScheduleMap[cCodeA] || {};
    const schedB = _classScheduleMap[b.code] || _classScheduleMap[cCodeB] || {};

    const timeA = timeToMinutes(schedA.start) ?? 99999;
    const timeB = timeToMinutes(schedB.start) ?? 99999;
    if (timeA !== timeB) return timeA - timeB;

    // 3. Tertiary: End time ascending
    const endA = timeToMinutes(schedA.end) ?? 99999;
    const endB = timeToMinutes(schedB.end) ?? 99999;
    if (endA !== endB) return endA - endB;

    // 4. Stable tie-breaker: Class name / Code
    return String(a.name || a.code).localeCompare(String(b.name || b.code));
  });
}

// Master Edit Mode Synchronization (Rule §4.3 SSOT)
window._toggleDashboardEditMode = () => {
  if (typeof window.toggleGlobalEditMode === 'function') {
    _isDashboardEditMode = !!window.toggleGlobalEditMode();
  } else {
    _isDashboardEditMode = !_isDashboardEditMode;
  }
  if (typeof window._rerenderDashboardView === 'function') {
    window._rerenderDashboardView();
  }
};

if (typeof window !== 'undefined' && !window._adminDeckEditModeBound) {
  window._adminDeckEditModeBound = true;
  window.addEventListener('admin-edit-mode-changed', (e) => {
    if (e && e.detail && typeof e.detail.isEditMode === 'boolean') {
      _isDashboardEditMode = e.detail.isEditMode;
    } else if (typeof window.getGlobalEditMode === 'function') {
      _isDashboardEditMode = window.getGlobalEditMode();
    }
    if (typeof window._rerenderDashboardView === 'function') {
      window._rerenderDashboardView();
    }
  });
}

function gradeColor(pct) { return getGradeColorByScore(pct); }
function gradeSymbol(pct) { return getGradeSymbol(null, pct); }
function gradeTextColor(pct) {
  const p = Number(pct);
  if (p >= 80 || (p >= 30 && p < 60)) return C.TEXT_DK;
  return '#ffffff';
}
function fmtPct(v) { return isNaN(Number(v)) ? '—' : Math.round(Number(v)) + '%'; }
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Calculate age from date of birth
function calcAge(dobStr) {
  if (!dobStr) return null;
  const dob = new Date(dobStr);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

// Remove honorific title from full name (e.g. "Mr. Taufan Hadi Ahmad" -> "Taufan Hadi Ahmad")
function cleanFullName(fullName) {
  return String(fullName || '').replace(/^(Mr\.|Miss)\s+/i, '').trim();
}

// Compact date formatting DD/MM/YY for tutor table
function formatDobOnly(birthDateStr) {
  if (!birthDateStr) return '—';
  const d = new Date(birthDateStr);
  if (isNaN(d.getTime())) return birthDateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

function syncFacultyPhotos() {
  try {
    const photos = JSON.parse(localStorage.getItem('topscore_tutor_photos') || '{}');
    const allTutors = [...FACULTY_REGISTRY.CEC, ...FACULTY_REGISTRY.TOP];
    allTutors.forEach(t => {
      if (photos[t.id]) t.avatar_url = photos[t.id];
    });
  } catch (_) {}
}
syncFacultyPhotos();

window._editTutorPhoto = (tutorId) => {
  window._openEditTutorModal(tutorId);
};

// ── Master Tutor Image Compression (100% Client-Side Web-Only, Zero Supabase Quota) ──
window._compressImageFileToDataUrl = (file, maxDim = 120, quality = 0.75) => {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('Selected file is not an image'));
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > h) {
          if (w > maxDim) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          }
        } else {
          if (h > maxDim) {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        try {
          const webp = canvas.toDataURL('image/webp', quality);
          if (webp.startsWith('data:image/webp')) {
            resolve(webp);
            return;
          }
        } catch (_) {}
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

window._handleTutorPhotoUpload = async (fileInput, previewImgId, previewMonoId, valInputId) => {
  const file = fileInput.files && fileInput.files[0];
  if (!file) return;
  try {
    const compressedDataUrl = await window._compressImageFileToDataUrl(file, 120, 0.75);
    const imgEl = document.getElementById(previewImgId);
    const monoEl = document.getElementById(previewMonoId);
    const valEl = document.getElementById(valInputId);
    if (imgEl) {
      imgEl.src = compressedDataUrl;
      imgEl.style.display = 'block';
    }
    if (monoEl) monoEl.style.display = 'none';
    if (valEl) valEl.value = compressedDataUrl;
  } catch (err) {
    console.error('Error compressing tutor photo:', err);
  }
};

window._clearTutorPhotoUpload = (previewImgId, previewMonoId, valInputId) => {
  const imgEl = document.getElementById(previewImgId);
  const monoEl = document.getElementById(previewMonoId);
  const valEl = document.getElementById(valInputId);
  if (imgEl) {
    imgEl.src = '';
    imgEl.style.display = 'none';
  }
  if (monoEl) monoEl.style.display = 'block';
  if (valEl) valEl.value = '';
};

// ── Master Tutor & Room Modal Management (Full CRUD in LocalStorage) ──
window._openEditTutorModal = (tutorId) => {
  const allTutors = [...FACULTY_REGISTRY.CEC, ...FACULTY_REGISTRY.TOP];
  const tutor = allTutors.find(t => t.id === tutorId);
  if (!tutor) return;

  const modalId = 'modal-edit-tutor';
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();

  const modalHtml = `
    <div id="${modalId}" style="position:fixed;inset:0;background:rgba(0,0,0,0.78);z-index:99999;display:flex;align-items:center;justify-content:center;padding:15px;backdrop-filter:blur(3px);">
      <div style="background:#0f172a;border:1px solid rgba(255,255,255,0.2);border-radius:8px;padding:18px;width:100%;max-width:390px;box-shadow:0 20px 40px rgba(0,0,0,0.6);font-family:'Inter',sans-serif;color:#f8fafc;">
        <div style="display:flex;align-items:center;margin-bottom:14px;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:10px;">
          <h4 style="margin:0;font-size:16px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;color:#f8fafc;">EDIT TUTOR · ${escHtml(tutor.nickname)}</h4>
        </div>
        <form id="form-edit-tutor" onsubmit="event.preventDefault(); window._saveTutorEdit('${escHtml(tutor.id)}');">
          <div style="margin-bottom:10px;display:flex;gap:10px;">
            <div style="flex:0 0 100px;">
              <label style="display:block;font-size:12px;font-weight:700;color:#94a3b8;margin-bottom:4px;">TUTOR CODE</label>
              <input type="text" id="tutor-edit-code" value="${escHtml(tutor.code || '')}" placeholder="e.g. T-TOP" required maxlength="10" style="width:100%;height:36px;background:#1e293b;border:1px solid rgba(255,255,255,0.2);border-radius:4px;color:#f8fafc;padding:0 8px;font-size:12px;font-family:monospace;font-weight:700;box-sizing:border-box;outline:none;text-transform:uppercase;" />
            </div>
            <div style="flex:1 1 0;">
              <label style="display:block;font-size:12px;font-weight:700;color:#94a3b8;margin-bottom:4px;">NICKNAME / CALLOUT</label>
              <input type="text" id="tutor-edit-nickname" value="${escHtml(tutor.nickname || '')}" required style="width:100%;height:36px;background:#1e293b;border:1px solid rgba(255,255,255,0.2);border-radius:4px;color:#f8fafc;padding:0 8px;font-size:12px;box-sizing:border-box;outline:none;" />
            </div>
          </div>
          <div style="margin-bottom:10px;">
            <label style="display:block;font-size:12px;font-weight:700;color:#94a3b8;margin-bottom:4px;">FULL NAME</label>
            <input type="text" id="tutor-edit-fullname" value="${escHtml(tutor.full_name || '')}" required style="width:100%;height:36px;background:#1e293b;border:1px solid rgba(255,255,255,0.2);border-radius:4px;color:#f8fafc;padding:0 8px;font-size:12px;box-sizing:border-box;outline:none;" />
          </div>
          <div style="margin-bottom:10px;">
            <label style="display:block;font-size:12px;font-weight:700;color:#94a3b8;margin-bottom:4px;">DATE OF BIRTH (DoB)</label>
            <input type="date" id="tutor-edit-dob" value="${escHtml(tutor.birth_date || '')}" required style="width:100%;height:36px;background:#1e293b;border:1px solid rgba(255,255,255,0.2);border-radius:4px;color:#f8fafc;padding:0 8px;font-size:12px;box-sizing:border-box;outline:none;" />
          </div>
          <div style="margin-bottom:14px;">
            <label style="display:block;font-size:12px;font-weight:700;color:#94a3b8;margin-bottom:6px;">TUTOR PHOTO (WEB-COMPRESSED)</label>
            <div style="display:flex;align-items:center;gap:12px;background:#1e293b;border:1px solid rgba(255,255,255,0.15);border-radius:6px;padding:8px 10px;">
              <div id="tutor-edit-preview-box" style="width:42px;height:42px;border-radius:6px;border:1px solid rgba(255,255,255,0.25);overflow:hidden;background:rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <img id="tutor-edit-preview-img" src="${escHtml(tutor.avatar_url || '')}" alt="${escHtml(tutor.nickname)}" style="width:100%;height:100%;object-fit:cover;display:${tutor.avatar_url ? 'block' : 'none'};" />
                <span id="tutor-edit-preview-mono" style="font-size:12px;font-weight:800;color:#f8fafc;display:${tutor.avatar_url ? 'none' : 'block'};">
                  ${tutor.nickname.replace(/^(Mr\.|Miss)\s*/i, '').slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div style="flex:1 1 0;min-width:0;display:flex;flex-direction:column;gap:4px;">
                <input type="file" id="tutor-edit-photo-file" accept="image/*" style="display:none;" onchange="window._handleTutorPhotoUpload(this, 'tutor-edit-preview-img', 'tutor-edit-preview-mono', 'tutor-edit-photo-val')" />
                <input type="hidden" id="tutor-edit-photo-val" value="${escHtml(tutor.avatar_url || '')}" />
                <div style="display:flex;align-items:center;gap:6px;">
                  <button type="button" onclick="document.getElementById('tutor-edit-photo-file').click()" style="height:32px;padding:0 12px;background:#38bdf8;border:1px solid #38bdf8;color:#090d16;border-radius:4px;font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:4px;">
                    <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg></span>
                    <span>Upload Image</span>
                  </button>
                  <button type="button" onclick="window._clearTutorPhotoUpload('tutor-edit-preview-img', 'tutor-edit-preview-mono', 'tutor-edit-photo-val')" style="height:32px;padding:0 10px;background:transparent;border:1px solid rgba(255,255,255,0.2);color:#94a3b8;border-radius:4px;font-size:12px;cursor:pointer;">
                    Remove
                  </button>
                </div>
                <span style="font-size:12px;color:#64748b;">Client-compressed (Zero Supabase quota)</span>
              </div>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid rgba(255,255,255,0.1);padding-top:12px;margin-top:10px;">
            <button type="button" onclick="document.getElementById('${modalId}').remove()" style="height:36px;padding:0 14px;background:transparent;border:1px solid rgba(255,255,255,0.2);color:#94a3b8;border-radius:4px;font-size:12px;font-weight:700;cursor:pointer;">CLOSE</button>
            <button type="submit" style="height:36px;padding:0 16px;background:#38bdf8;border:1px solid #38bdf8;color:#090d16;border-radius:4px;font-size:12px;font-weight:700;cursor:pointer;">SAVE TUTOR</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window._saveTutorEdit = (tutorId) => {
  const allTutors = [...FACULTY_REGISTRY.CEC, ...FACULTY_REGISTRY.TOP];
  const tutor = allTutors.find(t => t.id === tutorId);
  if (!tutor) return;

  const code = document.getElementById('tutor-edit-code')?.value.trim().toUpperCase();
  const nick = document.getElementById('tutor-edit-nickname')?.value.trim();
  const full = document.getElementById('tutor-edit-fullname')?.value.trim();
  const dob = document.getElementById('tutor-edit-dob')?.value.trim();
  const photo = document.getElementById('tutor-edit-photo-val')?.value.trim();

  if (code) tutor.code = code;
  if (nick) tutor.nickname = nick;
  if (full) tutor.full_name = full;
  if (dob) tutor.birth_date = dob;
  tutor.avatar_url = photo || '';

  saveFacultyRegistry();
  const modal = document.getElementById('modal-edit-tutor');
  if (modal) modal.remove();
  if (typeof window._rerenderDashboardView === 'function') {
    window._rerenderDashboardView();
  }
};

window._openAddTutorModal = () => {
  const tab = _currentDashboardTab || 'CEC';
  const modalId = 'modal-add-tutor';
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();

  const modalHtml = `
    <div id="${modalId}" style="position:fixed;inset:0;background:rgba(0,0,0,0.78);z-index:99999;display:flex;align-items:center;justify-content:center;padding:15px;backdrop-filter:blur(3px);">
      <div style="background:#0f172a;border:1px solid rgba(255,255,255,0.2);border-radius:8px;padding:18px;width:100%;max-width:390px;box-shadow:0 20px 40px rgba(0,0,0,0.6);font-family:'Inter',sans-serif;color:#f8fafc;">
        <div style="display:flex;align-items:center;margin-bottom:14px;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:10px;">
          <h4 style="margin:0;font-size:16px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;color:#f8fafc;">ADD NEW TUTOR (${tab})</h4>
        </div>
        <form id="form-add-tutor" onsubmit="event.preventDefault(); window._saveNewTutor();">
          <div style="margin-bottom:10px;display:flex;gap:10px;">
            <div style="flex:0 0 100px;">
              <label style="display:block;font-size:12px;font-weight:700;color:#94a3b8;margin-bottom:4px;">TUTOR CODE</label>
              <input type="text" id="tutor-add-code" placeholder="e.g. T-AME" required maxlength="10" style="width:100%;height:36px;background:#1e293b;border:1px solid rgba(255,255,255,0.2);border-radius:4px;color:#f8fafc;padding:0 8px;font-size:12px;font-family:monospace;font-weight:700;box-sizing:border-box;outline:none;text-transform:uppercase;" />
            </div>
            <div style="flex:1 1 0;">
              <label style="display:block;font-size:12px;font-weight:700;color:#94a3b8;margin-bottom:4px;">NICKNAME / CALLOUT</label>
              <input type="text" id="tutor-add-nickname" placeholder="e.g. Miss Sarah" required style="width:100%;height:36px;background:#1e293b;border:1px solid rgba(255,255,255,0.2);border-radius:4px;color:#f8fafc;padding:0 8px;font-size:12px;box-sizing:border-box;outline:none;" />
            </div>
          </div>
          <div style="margin-bottom:10px;">
            <label style="display:block;font-size:12px;font-weight:700;color:#94a3b8;margin-bottom:4px;">FULL NAME</label>
            <input type="text" id="tutor-add-fullname" placeholder="e.g. Sarah Azhari" required style="width:100%;height:36px;background:#1e293b;border:1px solid rgba(255,255,255,0.2);border-radius:4px;color:#f8fafc;padding:0 8px;font-size:12px;box-sizing:border-box;outline:none;" />
          </div>
          <div style="margin-bottom:10px;">
            <label style="display:block;font-size:12px;font-weight:700;color:#94a3b8;margin-bottom:4px;">DATE OF BIRTH (DoB)</label>
            <input type="date" id="tutor-add-dob" value="2000-01-01" required style="width:100%;height:36px;background:#1e293b;border:1px solid rgba(255,255,255,0.2);border-radius:4px;color:#f8fafc;padding:0 8px;font-size:12px;box-sizing:border-box;outline:none;" />
          </div>
          <div style="margin-bottom:14px;">
            <label style="display:block;font-size:12px;font-weight:700;color:#94a3b8;margin-bottom:6px;">TUTOR PHOTO (WEB-COMPRESSED)</label>
            <div style="display:flex;align-items:center;gap:12px;background:#1e293b;border:1px solid rgba(255,255,255,0.15);border-radius:6px;padding:8px 10px;">
              <div id="tutor-add-preview-box" style="width:42px;height:42px;border-radius:6px;border:1px solid rgba(255,255,255,0.25);overflow:hidden;background:rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <img id="tutor-add-preview-img" src="" alt="Preview" style="width:100%;height:100%;object-fit:cover;display:none;" />
                <span id="tutor-add-preview-mono" style="font-size:12px;font-weight:800;color:#f8fafc;display:block;">
                  TU
                </span>
              </div>
              <div style="flex:1 1 0;min-width:0;display:flex;flex-direction:column;gap:4px;">
                <input type="file" id="tutor-add-photo-file" accept="image/*" style="display:none;" onchange="window._handleTutorPhotoUpload(this, 'tutor-add-preview-img', 'tutor-add-preview-mono', 'tutor-add-photo-val')" />
                <input type="hidden" id="tutor-add-photo-val" value="" />
                <div style="display:flex;align-items:center;gap:6px;">
                  <button type="button" onclick="document.getElementById('tutor-add-photo-file').click()" style="height:32px;padding:0 12px;background:#38bdf8;border:1px solid #38bdf8;color:#090d16;border-radius:4px;font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:4px;">
                    <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg></span>
                    <span>Upload Image</span>
                  </button>
                  <button type="button" onclick="window._clearTutorPhotoUpload('tutor-add-preview-img', 'tutor-add-preview-mono', 'tutor-add-photo-val')" style="height:32px;padding:0 10px;background:transparent;border:1px solid rgba(255,255,255,0.2);color:#94a3b8;border-radius:4px;font-size:12px;cursor:pointer;">
                    Remove
                  </button>
                </div>
                <span style="font-size:12px;color:#64748b;">Client-compressed (Zero Supabase quota)</span>
              </div>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid rgba(255,255,255,0.1);padding-top:12px;margin-top:10px;">
            <button type="button" onclick="document.getElementById('${modalId}').remove()" style="height:36px;padding:0 14px;background:transparent;border:1px solid rgba(255,255,255,0.2);color:#94a3b8;border-radius:4px;font-size:12px;font-weight:700;cursor:pointer;">CLOSE</button>
            <button type="submit" style="height:36px;padding:0 16px;background:#38bdf8;border:1px solid #38bdf8;color:#090d16;border-radius:4px;font-size:12px;font-weight:700;cursor:pointer;">ADD TUTOR</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window._saveNewTutor = () => {
  const tab = _currentDashboardTab || 'CEC';
  const code = document.getElementById('tutor-add-code')?.value.trim().toUpperCase();
  const nick = document.getElementById('tutor-add-nickname')?.value.trim();
  const full = document.getElementById('tutor-add-fullname')?.value.trim();
  const dob = document.getElementById('tutor-add-dob')?.value.trim();
  const photo = document.getElementById('tutor-add-photo-val')?.value.trim();

  if (!nick || !full) return;

  const newTutor = {
    id: `tutor-${tab.toLowerCase()}-${Date.now()}`,
    code: code || generateTutorCodeFromName(nick, full),
    nickname: nick,
    full_name: full,
    gender: 'female',
    birth_date: dob || '2000-01-01',
    address: 'Pare, Kediri',
    specialty: 'Faculty Instructor',
    institution_name: tab === 'CEC' ? 'CAMP ENGLISH COURSE (CEC)' : 'TOPS OCCUPATIONAL PROGRAM (TOP)',
    assigned_classes: [],
    avatar_url: photo || ''
  };

  if (!FACULTY_REGISTRY[tab]) FACULTY_REGISTRY[tab] = [];
  FACULTY_REGISTRY[tab].push(newTutor);
  saveFacultyRegistry();

  const modal = document.getElementById('modal-add-tutor');
  if (modal) modal.remove();
  if (typeof window._rerenderDashboardView === 'function') {
    window._rerenderDashboardView();
  }
};

window._openEditRoomModal = (roomCode) => {
  const tab = _currentDashboardTab || 'CEC';
  const list = _roomsDirectory[tab] || [];
  const room = list.find(r => r.code === roomCode);
  if (!room) return;

  const modalId = 'modal-edit-room';
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();

  const modalHtml = `
    <div id="${modalId}" style="position:fixed;inset:0;background:rgba(0,0,0,0.78);z-index:99999;display:flex;align-items:center;justify-content:center;padding:15px;backdrop-filter:blur(3px);">
      <div style="background:#0f172a;border:1px solid rgba(255,255,255,0.2);border-radius:8px;padding:18px;width:100%;max-width:360px;box-shadow:0 20px 40px rgba(0,0,0,0.6);font-family:'Inter',sans-serif;color:#f8fafc;">
        <div style="display:flex;align-items:center;margin-bottom:14px;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:10px;">
          <h4 style="margin:0;font-size:16px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;color:#f8fafc;">EDIT ROOM · ${escHtml(room.code)}</h4>
        </div>
        <form id="form-edit-room" onsubmit="event.preventDefault(); window._saveRoomEdit('${escHtml(room.code)}');">
          <div style="margin-bottom:10px;">
            <label style="display:block;font-size:12px;font-weight:700;color:#94a3b8;margin-bottom:4px;">ROOM CODE</label>
            <input type="text" id="room-edit-code" value="${escHtml(room.code || '')}" required style="width:100%;height:36px;background:#1e293b;border:1px solid rgba(255,255,255,0.2);border-radius:4px;color:#f8fafc;padding:0 8px;font-size:12px;box-sizing:border-box;outline:none;" />
          </div>
          <div style="margin-bottom:10px;">
            <label style="display:block;font-size:12px;font-weight:700;color:#94a3b8;margin-bottom:4px;">ROOM NAME</label>
            <input type="text" id="room-edit-name" value="${escHtml(room.name || '')}" required style="width:100%;height:36px;background:#1e293b;border:1px solid rgba(255,255,255,0.2);border-radius:4px;color:#f8fafc;padding:0 8px;font-size:12px;box-sizing:border-box;outline:none;" />
          </div>
          <div style="margin-bottom:10px;">
            <label style="display:block;font-size:12px;font-weight:700;color:#94a3b8;margin-bottom:4px;">CAPACITY (STUDENTS)</label>
            <input type="number" id="room-edit-cap" value="${room.capacity || 30}" min="1" max="500" required style="width:100%;height:36px;background:#1e293b;border:1px solid rgba(255,255,255,0.2);border-radius:4px;color:#f8fafc;padding:0 8px;font-size:12px;box-sizing:border-box;outline:none;" />
          </div>
          <div style="margin-bottom:14px;">
            <label style="display:block;font-size:12px;font-weight:700;color:#94a3b8;margin-bottom:4px;">ROOM TYPE / USAGE</label>
            <input type="text" id="room-edit-type" value="${escHtml(room.type || 'Classroom')}" required style="width:100%;height:36px;background:#1e293b;border:1px solid rgba(255,255,255,0.2);border-radius:4px;color:#f8fafc;padding:0 8px;font-size:12px;box-sizing:border-box;outline:none;" />
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid rgba(255,255,255,0.1);padding-top:12px;margin-top:10px;">
            <button type="button" onclick="document.getElementById('${modalId}').remove()" style="height:36px;padding:0 14px;background:transparent;border:1px solid rgba(255,255,255,0.2);color:#94a3b8;border-radius:4px;font-size:12px;font-weight:700;cursor:pointer;">CLOSE</button>
            <button type="submit" style="height:36px;padding:0 16px;background:#38bdf8;border:1px solid #38bdf8;color:#090d16;border-radius:4px;font-size:12px;font-weight:700;cursor:pointer;">SAVE ROOM</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window._saveRoomEdit = (oldRoomCode) => {
  const tab = _currentDashboardTab || 'CEC';
  const list = _roomsDirectory[tab] || [];
  const room = list.find(r => r.code === oldRoomCode);
  if (!room) return;

  const newCode = document.getElementById('room-edit-code')?.value.trim();
  const newName = document.getElementById('room-edit-name')?.value.trim();
  const newCap = parseInt(document.getElementById('room-edit-cap')?.value, 10);
  const newType = document.getElementById('room-edit-type')?.value.trim();

  if (!newCode || !newName) return;

  // If room code changed, also update assigned class schedule map
  if (newCode !== oldRoomCode) {
    Object.keys(_classScheduleMap).forEach(cCode => {
      if (_classScheduleMap[cCode].room === oldRoomCode) {
        _classScheduleMap[cCode].room = newCode;
      }
    });
    try {
      localStorage.setItem('topscore_class_schedule_map', JSON.stringify(_classScheduleMap));
    } catch (_) {}
    saveSettingToSupabase('deck_class_schedule_map', _classScheduleMap);
  }

  room.code = newCode;
  room.name = newName;
  room.capacity = isNaN(newCap) ? 30 : newCap;
  room.type = newType || 'Classroom';

  saveRoomsDirectory();
  const modal = document.getElementById('modal-edit-room');
  if (modal) modal.remove();
  if (typeof window._rerenderDashboardView === 'function') {
    window._rerenderDashboardView();
  }
};

window._openAddRoomModal = () => {
  const tab = _currentDashboardTab || 'CEC';
  const modalId = 'modal-add-room';
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();

  const modalHtml = `
    <div id="${modalId}" style="position:fixed;inset:0;background:rgba(0,0,0,0.78);z-index:99999;display:flex;align-items:center;justify-content:center;padding:15px;backdrop-filter:blur(3px);">
      <div style="background:#0f172a;border:1px solid rgba(255,255,255,0.2);border-radius:8px;padding:18px;width:100%;max-width:360px;box-shadow:0 20px 40px rgba(0,0,0,0.6);font-family:'Inter',sans-serif;color:#f8fafc;">
        <div style="display:flex;align-items:center;margin-bottom:14px;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:10px;">
          <h4 style="margin:0;font-size:16px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;color:#f8fafc;">ADD NEW ROOM (${tab})</h4>
        </div>
        <form id="form-add-room" onsubmit="event.preventDefault(); window._saveNewRoom();">
          <div style="margin-bottom:10px;">
            <label style="display:block;font-size:12px;font-weight:700;color:#94a3b8;margin-bottom:4px;">ROOM CODE</label>
            <input type="text" id="room-add-code" placeholder="e.g. R-104" required style="width:100%;height:36px;background:#1e293b;border:1px solid rgba(255,255,255,0.2);border-radius:4px;color:#f8fafc;padding:0 8px;font-size:12px;box-sizing:border-box;outline:none;" />
          </div>
          <div style="margin-bottom:10px;">
            <label style="display:block;font-size:12px;font-weight:700;color:#94a3b8;margin-bottom:4px;">ROOM NAME</label>
            <input type="text" id="room-add-name" placeholder="e.g. Room 104" required style="width:100%;height:36px;background:#1e293b;border:1px solid rgba(255,255,255,0.2);border-radius:4px;color:#f8fafc;padding:0 8px;font-size:12px;box-sizing:border-box;outline:none;" />
          </div>
          <div style="margin-bottom:10px;">
            <label style="display:block;font-size:12px;font-weight:700;color:#94a3b8;margin-bottom:4px;">CAPACITY (STUDENTS)</label>
            <input type="number" id="room-add-cap" value="35" min="1" max="500" required style="width:100%;height:36px;background:#1e293b;border:1px solid rgba(255,255,255,0.2);border-radius:4px;color:#f8fafc;padding:0 8px;font-size:12px;box-sizing:border-box;outline:none;" />
          </div>
          <div style="margin-bottom:14px;">
            <label style="display:block;font-size:12px;font-weight:700;color:#94a3b8;margin-bottom:4px;">ROOM TYPE / USAGE</label>
            <input type="text" id="room-add-type" placeholder="e.g. Classroom" value="Classroom" required style="width:100%;height:36px;background:#1e293b;border:1px solid rgba(255,255,255,0.2);border-radius:4px;color:#f8fafc;padding:0 8px;font-size:12px;box-sizing:border-box;outline:none;" />
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid rgba(255,255,255,0.1);padding-top:12px;margin-top:10px;">
            <button type="button" onclick="document.getElementById('${modalId}').remove()" style="height:36px;padding:0 14px;background:transparent;border:1px solid rgba(255,255,255,0.2);color:#94a3b8;border-radius:4px;font-size:12px;font-weight:700;cursor:pointer;">CLOSE</button>
            <button type="submit" style="height:36px;padding:0 16px;background:#38bdf8;border:1px solid #38bdf8;color:#090d16;border-radius:4px;font-size:12px;font-weight:700;cursor:pointer;">ADD ROOM</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window._saveNewRoom = () => {
  const tab = _currentDashboardTab || 'CEC';
  const code = document.getElementById('room-add-code')?.value.trim();
  const name = document.getElementById('room-add-name')?.value.trim();
  const cap = parseInt(document.getElementById('room-add-cap')?.value, 10);
  const type = document.getElementById('room-add-type')?.value.trim();

  if (!code || !name) return;

  const newRoom = {
    code,
    name,
    capacity: isNaN(cap) ? 30 : cap,
    type: type || 'Classroom'
  };

  if (!_roomsDirectory[tab]) _roomsDirectory[tab] = [];
  _roomsDirectory[tab].push(newRoom);
  saveRoomsDirectory();

  const modal = document.getElementById('modal-add-room');
  if (modal) modal.remove();
  if (typeof window._rerenderDashboardView === 'function') {
    window._rerenderDashboardView();
  }
};

window._deleteRoom = (roomCode) => {
  const tab = _currentDashboardTab || 'CEC';
  if (!confirm(`Are you sure you want to delete room "${roomCode}"?`)) return;
  _roomsDirectory[tab] = (_roomsDirectory[tab] || []).filter(r => r.code !== roomCode);
  saveRoomsDirectory();
  if (typeof window._rerenderDashboardView === 'function') {
    window._rerenderDashboardView();
  }
};

// Modality semantic color per SSOT (Zero Capsule Invariant per §4.9 - plain typography only)
function modalityColor(modality) {
  const m = String(modality || '').toUpperCase();
  if (m === 'SPEAKING') return C.TACT;
  if (m === 'STORYTELLING') return C.ORANGE;
  if (m === 'BASIC' || m === 'GRAMMAR' || m === 'GFS' || m === 'PRON' || m === 'PRONUNCIATION') return C.STAR;
  return C.LIME;
}

export async function renderDashboard(container) {
  container.innerHTML = `<div class="topscore-loading-center"><div class="spinner"></div><p class="loading-text">Loading Attendance Dashboard…</p></div>`;

  const today = new Date();

  // ── Quota-minimized parallel single fetch (standard tables only, zero dead DB calls) ──
  const [studentsRes, classesRes, programsRes, batchesRes, institutionsRes, levelsRes, testsRes, attemptsRes, progressRes, sessionsRes, attendanceRes, siteSettingsRes] = await Promise.allSettled([
    adminFetchAll('students',           'id, name, is_active, deleted_at, created_at, program_id, batch_id, level_id'),
    adminFetchAll('classes',            'id, name, code, is_active, program_id, level_id, deleted_at', {}, true),
    adminFetchAll('programs',           'id, name, is_active, institution_id'),
    adminFetchAll('batches',            'id, name, is_active, program_id'),
    adminFetchAll('institutions',       'id, name, is_active'),
    adminFetchAll('levels',             'id, name, level_number'),
    adminFetchAll('tests',              'id, title, shell_code, class_id, test_type, status, deleted_at'),
    adminFetchAll('attempts',           'id, student_id, test_id, percentage, grade, is_forgiven, submitted_at, status', { is_best_score: true }),
    adminFetchAll('progress',           'id, student_id, class_id, unlocked_level, highest_score, updated_at'),
    adminFetchAll('class_sessions',     'id, class_id, batch_id, session_number'),
    adminFetchAll('session_attendance', 'id, session_id, student_id, status'),
    adminFetchAll('site_settings',      'key, value'),
  ]);

  const students          = studentsRes.status === 'fulfilled' ? studentsRes.value || [] : [];
  const classes           = classesRes.status === 'fulfilled' ? classesRes.value || [] : [];
  const programs          = programsRes.status === 'fulfilled' ? programsRes.value || [] : [];
  const batches           = batchesRes.status === 'fulfilled' ? batchesRes.value || [] : [];
  const institutions      = institutionsRes.status === 'fulfilled' ? institutionsRes.value || [] : [];
  const levels            = levelsRes.status === 'fulfilled' ? levelsRes.value || [] : [];
  const tests             = testsRes.status === 'fulfilled' ? testsRes.value || [] : [];
  const attempts          = attemptsRes.status === 'fulfilled' ? attemptsRes.value || [] : [];
  const progress          = progressRes.status === 'fulfilled' ? progressRes.value || [] : [];
  const sessions          = sessionsRes.status === 'fulfilled' ? sessionsRes.value || [] : [];
  const attendanceRecords = attendanceRes.status === 'fulfilled' ? attendanceRes.value || [] : [];
  const siteSettings      = siteSettingsRes.status === 'fulfilled' ? siteSettingsRes.value || [] : [];

  // Hydrate faculty, rooms, schedules & tutors from Supabase site_settings (Cloud SSOT)
  if (Array.isArray(siteSettings) && siteSettings.length > 0) {
    const facultySetting = siteSettings.find(s => s.key === 'deck_faculty_registry');
    if (facultySetting && facultySetting.value) {
      try {
        const parsed = typeof facultySetting.value === 'string' ? JSON.parse(facultySetting.value) : facultySetting.value;
        if (parsed && parsed.CEC && parsed.TOP) {
          FACULTY_REGISTRY = parsed;
          try { localStorage.setItem('topscore_faculty_registry', JSON.stringify(parsed)); } catch (_) {}
        }
      } catch (_) {}
    } else {
      saveSettingToSupabase('deck_faculty_registry', FACULTY_REGISTRY);
    }

    const roomsSetting = siteSettings.find(s => s.key === 'deck_rooms_directory');
    if (roomsSetting && roomsSetting.value) {
      try {
        const parsed = typeof roomsSetting.value === 'string' ? JSON.parse(roomsSetting.value) : roomsSetting.value;
        if (parsed && parsed.CEC && parsed.TOP) {
          _roomsDirectory = parsed;
          try { localStorage.setItem('topscore_rooms_directory', JSON.stringify(parsed)); } catch (_) {}
        }
      } catch (_) {}
    } else {
      saveSettingToSupabase('deck_rooms_directory', _roomsDirectory);
    }

    const schedSetting = siteSettings.find(s => s.key === 'deck_class_schedule_map');
    if (schedSetting && schedSetting.value) {
      try {
        const parsed = typeof schedSetting.value === 'string' ? JSON.parse(schedSetting.value) : schedSetting.value;
        if (parsed && typeof parsed === 'object') {
          _classScheduleMap = Object.assign({}, DEFAULT_CLASS_SCHEDULE_MAP, _classScheduleMap, parsed);
          try { localStorage.setItem('topscore_class_schedule_map', JSON.stringify(_classScheduleMap)); } catch (_) {}
        }
      } catch (_) {}
    } else {
      saveSettingToSupabase('deck_class_schedule_map', _classScheduleMap);
    }

    const tutorMapSetting = siteSettings.find(s => s.key === 'deck_class_tutor_map');
    if (tutorMapSetting && tutorMapSetting.value) {
      try {
        const parsed = typeof tutorMapSetting.value === 'string' ? JSON.parse(tutorMapSetting.value) : tutorMapSetting.value;
        if (parsed && typeof parsed === 'object') {
          _classTutorMap = Object.assign({}, DEFAULT_CLASS_TUTOR_MAP, _classTutorMap, parsed);
          try { localStorage.setItem('topscore_class_tutor_map', JSON.stringify(_classTutorMap)); } catch (_) {}
        }
      } catch (_) {}
    } else {
      saveSettingToSupabase('deck_class_tutor_map', _classTutorMap);
    }

    const modeMapSetting = siteSettings.find(s => s.key === 'deck_class_mode_map');
    if (modeMapSetting && modeMapSetting.value) {
      try {
        const parsed = typeof modeMapSetting.value === 'string' ? JSON.parse(modeMapSetting.value) : modeMapSetting.value;
        if (parsed && typeof parsed === 'object') {
          _classModeMap = Object.assign({}, DEFAULT_CLASS_MODE_MAP, _classModeMap, parsed);
          try { localStorage.setItem('topscore_class_mode_map', JSON.stringify(_classModeMap)); } catch (_) {}
        }
      } catch (_) {}
    } else {
      saveSettingToSupabase('deck_class_mode_map', _classModeMap);
    }
  } else {
    // Seed Supabase if settings don't exist yet
    saveSettingToSupabase('deck_faculty_registry', FACULTY_REGISTRY);
    saveSettingToSupabase('deck_rooms_directory', _roomsDirectory);
    saveSettingToSupabase('deck_class_schedule_map', _classScheduleMap);
    saveSettingToSupabase('deck_class_tutor_map', _classTutorMap);
    saveSettingToSupabase('deck_class_mode_map', _classModeMap);
  }
  syncFacultyAssignedClasses();

  const studentMap = {};
  students.forEach(s => { studentMap[s.id] = s; });

  const activeStudents = students.filter(s => s.is_active && !s.deleted_at && (s.program_status || '').toUpperCase() !== 'INACTIVE' && s.program_status !== 'ALUMNI');
  const activeClasses  = classes.filter(c => c.is_active && !c.deleted_at);
  const publishedTests = tests.filter(t => t.status === 'PUBLISHED' && !t.deleted_at);
  const submittedAttempts = attempts.filter(a =>
    ['submitted', 'auto_submitted', 'evaluated', 'SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED'].includes(a.status)
  );

  // Helper to resolve performance, attendance rate & top student for any class
  function resolveClassPerformance(clsId, clsCode, levelNum, programId) {
    const enrolledIds = new Set();
    progress.forEach(p => {
      if (p.class_id === clsId) enrolledIds.add(p.student_id);
    });
    activeStudents.forEach(s => {
      if (s.program_id === programId) {
        if (!levelNum || s.level_id === levelNum) {
          enrolledIds.add(s.id);
        }
      }
    });
    const clsStudents = activeStudents.filter(s => enrolledIds.has(s.id));

    // Calculate Class Attendance Rate (Strict Attendance Rate SSOT)
    const clsSessions = (sessions || []).filter(s => s.class_id === clsId);
    const clsSessionIds = new Set(clsSessions.map(s => s.id));
    const clsAttendance = (attendanceRecords || []).filter(a => clsSessionIds.has(a.session_id));
    const presentRecords = clsAttendance.filter(a => a.status === 'PRESENT');
    const attendanceRate = clsAttendance.length > 0
      ? Math.round((presentRecords.length / clsAttendance.length) * 100)
      : null;

    const clsTests = publishedTests.filter(t => t.class_id === clsId);
    const clsTestIds = new Set(clsTests.map(t => t.id));
    const clsAttempts = submittedAttempts.filter(a => clsTestIds.has(a.test_id));
    const clsPassed = clsAttempts.filter(a => Number(a.percentage) >= 60 || a.is_forgiven);
    const passRate = clsAttempts.length > 0 ? Math.round((clsPassed.length / clsAttempts.length) * 100) : null;

    const stuAttemptsMap = {};
    clsAttempts.forEach(a => {
      if (!stuAttemptsMap[a.student_id]) stuAttemptsMap[a.student_id] = [];
      stuAttemptsMap[a.student_id].push(a);
    });

    let topStudent = null;
    let topAvg = -1;
    let topMax = -1;
    let topCount = 0;

    Object.entries(stuAttemptsMap).forEach(([sId, sAtts]) => {
      const stu = studentMap[sId];
      if (!stu) return;
      const scores = sAtts.map(a => Number(a.percentage)).filter(p => !isNaN(p));
      if (scores.length === 0) return;
      const sAvg = scores.reduce((sum, v) => sum + v, 0) / scores.length;
      const sMax = Math.max(...scores);

      if (sAvg > topAvg || (sAvg === topAvg && sMax > topMax) || (sAvg === topAvg && sMax === topMax && scores.length > topCount)) {
        topStudent = stu;
        topAvg = sAvg;
        topMax = sMax;
        topCount = scores.length;
      }
    });

    return {
      studentCount: clsStudents.length,
      attendanceRate,
      passRate,
      topStudent,
      topAvg: topAvg >= 0 ? Math.round(topAvg) : null,
      attemptsCount: clsAttempts.length
    };
  }

  // ─── Build Complete 15 CEC Classes List ───────────────────────
  const cecProgram = programs.find(p => (p.name || '').toUpperCase().includes('CAMP'));
  const cecProgramId = cecProgram?.id;

  // Strict Active Student Count by Level (Only Active Batches) for Scheduling & Room Capacity SSOT
  const activeBatchIds = new Set(batches.filter(b => b.is_active && !b.deleted_at).map(b => b.id));
  const activeCECStudents = activeStudents.filter(s =>
    (!s.program_id || s.program_id === cecProgramId) &&
    s.program_status !== 'ALUMNI' &&
    s.batch_id && activeBatchIds.has(s.batch_id)
  );
  const activeLevel1Students = activeCECStudents.filter(s => {
    const lvl = levels.find(l => l.id === s.level_id);
    return lvl && lvl.level_number === 1;
  }).length;

  const activeLevel2Students = activeCECStudents.filter(s => {
    const lvl = levels.find(l => l.id === s.level_id);
    return lvl && lvl.level_number === 2;
  }).length;

  const activeLevel3Students = activeCECStudents.filter(s => {
    const lvl = levels.find(l => l.id === s.level_id);
    return lvl && lvl.level_number === 3;
  }).length;

  const getActiveStudentCountForLevel = (lvlNum) => {
    if (lvlNum === 1) return activeLevel1Students;
    if (lvlNum === 2) return activeLevel2Students;
    if (lvlNum === 3) return activeLevel3Students;
    return 0;
  };

  const cec15Classes = CEC_15_CURRICULUM_CLASSES.map(def => {
    const dbClass = classes.find(c => {
      const cCode = (c.code || '').toUpperCase();
      const cName = (c.name || '').toUpperCase();
      return cCode === def.code || (def.legacyCode && cCode === def.legacyCode) || cName === def.name.toUpperCase();
    });

    const activeCount = getActiveStudentCountForLevel(def.level);
    const isClassActive = Boolean(dbClass && dbClass.is_active !== false && activeCount > 0);

    if (dbClass) {
      const perf = resolveClassPerformance(dbClass.id, dbClass.code, dbClass.level_id, dbClass.program_id);
      return {
        id: dbClass.id,
        code: dbClass.code || def.code,
        name: dbClass.name || def.name,
        level: def.level,
        modality: def.modality,
        studentCount: activeCount,
        attendanceRate: perf.attendanceRate,
        passRate: perf.passRate,
        topStudent: perf.topStudent,
        topAvg: perf.topAvg,
        isReal: true,
        isActive: isClassActive
      };
    } else {
      return {
        id: null,
        code: def.code,
        name: def.name,
        level: def.level,
        modality: def.modality,
        studentCount: activeCount,
        attendanceRate: null,
        passRate: null,
        topStudent: null,
        topAvg: null,
        isReal: false,
        isActive: false
      };
    }
  });

  // ─── Build TOP Classes List ───────────────────────────────────
  const topPrograms = programs.filter(p => !p.name?.toUpperCase().includes('CAMP'));
  const topProgramIds = new Set(topPrograms.map(p => p.id));
  const topClassesRaw = classes.filter(c => topProgramIds.has(c.program_id) || c.code?.includes('EVN') || c.code?.includes('SHR') || c.code?.includes('TMT'));

  const topClasses = [
    { code: 'EVNK-VOCAB', legacyCode: 'EVN-VOCAB', name: 'Evnikom Vocabulary', program: 'Evnikom' },
    { code: 'SHRT-VOCAB', legacyCode: 'SHR-VOCAB', name: 'Sheraton Vocabulary', program: 'Sheraton Hotel' },
    { code: 'TPTC-VOCAB', legacyCode: 'TMT-VOCAB', name: 'Tamata Vocabulary', program: 'Tamata Persada' },
  ].map(def => {
    const dbClass = topClassesRaw.find(c => {
      const cCode = (c.code || '').toUpperCase();
      const cName = (c.name || '').toUpperCase();
      return cCode === def.code || cCode === def.legacyCode || cName.includes(def.name.toUpperCase());
    });
    if (dbClass) {
      const perf = resolveClassPerformance(dbClass.id, dbClass.code, dbClass.level_id, dbClass.program_id);
      const studentCount = perf.studentCount || (def.code.includes('EVN') ? 3 : def.code.includes('SHR') ? 70 : 0);
      const isClassActive = Boolean(dbClass.is_active !== false && studentCount > 0);
      return {
        id: dbClass.id,
        code: dbClass.code || def.code,
        name: dbClass.name || def.name,
        program: def.program,
        level: 0,
        modality: 'VOCABULARY',
        studentCount,
        attendanceRate: perf.attendanceRate,
        passRate: perf.passRate,
        topStudent: perf.topStudent,
        topAvg: perf.topAvg,
        isReal: true,
        isActive: isClassActive
      };
    } else {
      const studentCount = def.code.includes('EVN') ? 3 : def.code.includes('SHR') ? 70 : 0;
      return {
        id: null,
        code: def.code,
        name: def.name,
        program: def.program,
        level: 0,
        modality: 'VOCABULARY',
        studentCount,
        attendanceRate: null,
        passRate: null,
        topStudent: null,
        topAvg: null,
        isReal: false,
        isActive: studentCount > 0
      };
    }
  });

  const cecTotalStudents = 133;
  const topTotalStudents = 73;

  // ══════════════════════════════════════════════════════════════
  // RENDER DUAL-PANEL 50-50 SPLIT (WITH TOPBAR TABS & TOOLBAR SUBPANEL)
  // ══════════════════════════════════════════════════════════════
  const activeTenant = typeof window.getActiveTenant === 'function' ? window.getActiveTenant() : 'ALL';
  if (activeTenant === 'CEC' || activeTenant === 'TOP') {
    _currentDashboardTab = activeTenant;
  }

  function renderView() {
    const isCEC = _currentDashboardTab === 'CEC';
    const activeTutors = isCEC ? FACULTY_REGISTRY.CEC : FACULTY_REGISTRY.TOP;
    const activeRooms = _roomsDirectory[isCEC ? 'CEC' : 'TOP'] || [];
    const rawClasses = isCEC ? cec15Classes : topClasses;
    const currentClasses = sortClassesByLevelAndTime(rawClasses);
    const currentStudentCount = isCEC ? cecTotalStudents : topTotalStudents;
    const isEditOn = typeof window.getGlobalEditMode === 'function' ? window.getGlobalEditMode() : _isDashboardEditMode;
    _isDashboardEditMode = isEditOn;

    // Real-Time Schedule, Room Collision & Capacity Conflict Audit
    const audit = auditScheduleAndCapacity(currentClasses, activeRooms, activeTutors);
    const conflictParts = [];
    if (audit.totalTutorClashes > 0) conflictParts.push(`${audit.totalTutorClashes} Tutor Clash${audit.totalTutorClashes > 1 ? 'es' : ''}`);
    if (audit.totalRoomClashes > 0) conflictParts.push(`${audit.totalRoomClashes} Room Double-Booking${audit.totalRoomClashes > 1 ? 's' : ''}`);
    if (audit.totalCapacityIssues > 0) conflictParts.push(`${audit.totalCapacityIssues} Overcapacity Issue${audit.totalCapacityIssues > 1 ? 's' : ''}`);
    const conflictSummaryTitle = conflictParts.length > 0
      ? `Schedule Conflicts: ${conflictParts.join(', ')}`
      : 'All schedules, tutors, and rooms are synchronized without conflicts.';

    // Filter active batches for current institution / program:
    // Only batches marked is_active AND having at least 1 active non-alumni student
    const activeBatchesList = (isCEC
      ? batches.filter(b => b.is_active && (!b.program_id || b.program_id === cecProgramId))
      : batches.filter(b => b.is_active && b.program_id !== cecProgramId)
    ).filter(b => {
      const bStudents = activeStudents.filter(s => s.batch_id === b.id && s.program_status !== 'ALUMNI');
      return bStudents.length > 0;
    }).sort((a, b) => String(b.name).localeCompare(String(a.name), undefined, { numeric: true }));

    // Fallback if no active batches in DB
    const displayBatches = activeBatchesList.length > 0 ? activeBatchesList : (isCEC ? [
      { id: 'b-135', name: '135' },
      { id: 'b-134', name: '134' }
    ] : [
      { id: 'b-ev07', name: 'EV-07' },
      { id: 'b-sh26', name: 'SH-26' }
    ]);

    // Calculate level counts for each active batch
    const batchRowsData = displayBatches.map(b => {
      const bStudents = activeStudents.filter(s => s.batch_id === b.id && s.program_status !== 'ALUMNI');
      const c1 = bStudents.filter(s => {
        const lvl = levels.find(l => l.id === s.level_id);
        return lvl && lvl.level_number === 1;
      }).length;
      const c2 = bStudents.filter(s => {
        const lvl = levels.find(l => l.id === s.level_id);
        return lvl && lvl.level_number === 2;
      }).length;
      const c3 = bStudents.filter(s => {
        const lvl = levels.find(l => l.id === s.level_id);
        return lvl && lvl.level_number === 3;
      }).length;

      // Clean fallback if student DB rows are mapped via known defaults
      const finalC1 = c1 || (b.name === '135' ? 30 : 0);
      const finalC2 = c2;
      const finalC3 = c3 || (b.name === '134' ? 21 : 0);

      return {
        batch: b,
        l1: finalC1,
        l2: finalC2,
        l3: finalC3,
        total: finalC1 + finalC2 + finalC3,
        students: bStudents
      };
    });

    const sumL1 = batchRowsData.reduce((acc, r) => acc + r.l1, 0);
    const sumL2 = batchRowsData.reduce((acc, r) => acc + r.l2, 0);
    const sumL3 = batchRowsData.reduce((acc, r) => acc + r.l3, 0);

    window._rerenderDashboardView = renderView;

    window._onDashboardModeChange = (classCode, newMode) => {
      const cCode = canonicalizeClassCode(classCode);
      const val = /^system|cbt$/i.test(newMode) ? 'System' : 'Manual';
      _classModeMap[cCode] = val;
      if (classCode !== cCode) _classModeMap[classCode] = val;
      saveClassModeMap();
      if (typeof window.loadSidebarClasses === 'function') {
        window.loadSidebarClasses();
      }
      if (typeof showToast === 'function') {
        showToast(`${classCode} mode set to ${val}`, 'success');
      }
      renderView();
    };

    // ── 1. REGISTER TOP PANEL TABS IN #topbar-tabs-container (SSOT Point 1) ──
    window._switchDashboardTab = (tabId) => {
      if (_currentDashboardTab !== tabId) {
        _currentDashboardTab = tabId;
        renderView();
      }
    };

    if (typeof window.setTopbarTabs === 'function') {
      const activeTenant = typeof window.getActiveTenant === 'function' ? window.getActiveTenant() : 'ALL';
      const allTabs = [
        {
          id: 'CEC',
          label: 'CEC — Cake English Course',
          val: `${cecTotalStudents} Students`,
          valColor: C.TACT
        },
        {
          id: 'TOP',
          label: 'TOP — Top Occupational Program',
          val: `${topTotalStudents} Students`,
          valColor: C.ORANGE
        }
      ];
      const topbarTabs = activeTenant === 'ALL'
        ? allTabs
        : allTabs.filter(t => t.id === activeTenant);
      window.setTopbarTabs(topbarTabs, _currentDashboardTab, 'window._switchDashboardTab');
    }

    // ── 2. REGISTER SUB PANEL (TOOLBAR / LOWER PANEL 40px - CLEAN & STREAMLINED) ──
    if (typeof window.setBottomInfobar === 'function') {
      const leftToolbarHtml = isCEC ? `
        <div style="display:inline-flex;align-items:center;gap:8px;font-size:12px;white-space:nowrap;">
          <span style="font-weight:800;color:#f8fafc;display:inline-flex;align-items:center;gap:6px;">
            <span>Cake English Course</span>
            <span style="font-size:10px;font-weight:800;background:#38bdf8;color:#0f172a;padding:1px 6px;border-radius:3px;">CEC</span>
          </span>
          <span style="color:#475569;">·</span>
          <span style="color:#38bdf8;font-weight:700;">${cecTotalStudents} Students</span>
          <span style="color:#475569;">·</span>
          ${audit.totalConflicts === 0 ? `
            <span style="color:#00c000;font-size:11px;font-weight:700;display:inline-flex;align-items:center;gap:4px;" title="Schedule synchronized with zero conflicts">
              <span>●</span> Schedule Clear
            </span>
          ` : `
            <span style="color:var(--grade-e, #ff0000);background:rgba(255,0,0,0.15);border:1px solid rgba(255,0,0,0.35);padding:1px 7px;border-radius:4px;font-size:11px;font-weight:700;display:inline-flex;align-items:center;gap:4px;cursor:pointer;" title="${escHtml(conflictSummaryTitle)}" onclick="window._toggleDashboardEditMode()">
              ⚠ ${audit.totalConflicts} Schedule Alert${audit.totalConflicts > 1 ? 's' : ''}
            </span>
          `}
        </div>
      ` : `
        <div style="display:inline-flex;align-items:center;gap:8px;font-size:12px;white-space:nowrap;">
          <span style="font-weight:800;color:#f8fafc;display:inline-flex;align-items:center;gap:6px;">
            <span>Top Occupational Program</span>
            <span style="font-size:10px;font-weight:800;background:#ff8c00;color:#0f172a;padding:1px 6px;border-radius:3px;">TOP</span>
          </span>
          <span style="color:#475569;">·</span>
          <span style="color:#ff8c00;font-weight:700;">${topTotalStudents} Students</span>
          <span style="color:#475569;">·</span>
          ${audit.totalConflicts === 0 ? `
            <span style="color:#00c000;font-size:11px;font-weight:700;display:inline-flex;align-items:center;gap:4px;" title="Schedule synchronized with zero conflicts">
              <span>●</span> Schedule Clear
            </span>
          ` : `
            <span style="color:var(--grade-e, #ff0000);background:rgba(255,0,0,0.15);border:1px solid rgba(255,0,0,0.35);padding:1px 7px;border-radius:4px;font-size:11px;font-weight:700;display:inline-flex;align-items:center;gap:4px;cursor:pointer;" title="${escHtml(conflictSummaryTitle)}" onclick="window._toggleDashboardEditMode()">
              ⚠ ${audit.totalConflicts} Schedule Alert${audit.totalConflicts > 1 ? 's' : ''}
            </span>
          `}
        </div>
      `;

      const centerToolbarHtml = `
        <div style="display:inline-flex;align-items:center;gap:8px;">
          <button type="button" class="btn btn-sm toolbar-btn-30" id="btn-toggle-dashboard-edit-mode" onclick="window._toggleDashboardEditMode()" style="${isEditOn ? 'background:#38bdf8;border:1px solid #38bdf8;color:#090d16;box-shadow:0 0 8px rgba(56,189,248,0.4);' : 'background:transparent;border:1px solid rgba(255,255,255,0.25);color:#ffffff;'}font-weight:700;font-size:12px;height:30px;line-height:28px;padding:0 14px;border-radius:4px;cursor:pointer;" title="Toggle Edit Mode to Assign Tutors & Edit Schedules">${isEditOn ? '✓ Done Editing' : '✎ Edit Mode'}</button>
        </div>
      `;

      const rightToolbarHtml = `
        <div style="display:inline-flex;align-items:center;gap:8px;font-size:12px;color:#94a3b8;font-weight:600;white-space:nowrap;">
          <span><strong style="color:#f8fafc;">Domain A</strong> · Attendance</span>
          <span>·</span>
          <span style="color:${C.A};font-weight:700;">● Online</span>
        </div>
      `;

      window.setBottomInfobar(leftToolbarHtml, rightToolbarHtml, centerToolbarHtml);
    }

    // ── 3. RENDER DYNAMIC WORKSPACE SPLIT (CLASSES MATRIX + COMPACT TUTOR & ROOMS DIRECTORY) ──
    // Single Perimeter Ownership SSOT: #admin-content-area provides the 10px perimeter padding. Zero nested padding.
    container.innerHTML = `
      <div style="display:grid;grid-template-columns:minmax(0, 2.35fr) minmax(0, 0.95fr);gap:10px;box-sizing:border-box;height:100%;overflow:hidden;">

        <!-- ────────────────────────────────────────────────────────── -->
        <!-- PANEL KIRI (LARGER): 15 KELAS CEC / TOP CLASSES MATRIX     -->
        <!-- ────────────────────────────────────────────────────────── -->
        <div class="table-wrap" style="display:flex;flex-direction:column;height:100%;min-height:0;box-sizing:border-box;overflow-y:auto;overflow-x:auto;min-width:0;margin:0 !important;background:#0f172a;border:2px solid rgba(255,255,255,0.28) !important;border-radius:6px;">
            <style>
              .dashboard-academic-table {
                width: 100%;
                height: 100%;
                border-collapse: separate;
                border-spacing: 0;
                table-layout: auto !important;
                font-size: 12px !important;
                font-family: 'Inter', sans-serif !important;
              }
              .dashboard-academic-table th {
                padding: 0 6px !important;
                vertical-align: middle !important;
                font-size: 12px !important;
                font-weight: 700 !important;
                color: #94a3b8 !important;
                font-family: 'Inter', sans-serif !important;
                border-right: 1px solid rgba(255, 255, 255, 0.12) !important;
                border-bottom: 2px solid rgba(255, 255, 255, 0.22) !important;
                background: #0f172a !important;
                height: 30px;
                white-space: nowrap !important;
              }
              .dashboard-academic-table th:last-child {
                border-right: none !important;
              }
              .dashboard-academic-table td {
                padding: 0 6px !important;
                vertical-align: middle !important;
                font-size: 12px !important;
                font-weight: 500 !important;
                color: var(--admin-text-main, #f8fafc) !important;
                border-bottom: 1px solid var(--admin-border-subtle, rgba(255, 255, 255, 0.05)) !important;
                border-right: 1px solid var(--admin-border-subtle, rgba(255, 255, 255, 0.08)) !important;
                font-family: 'Inter', sans-serif !important;
                white-space: nowrap !important;
              }
              .dashboard-academic-table td:last-child {
                border-right: none !important;
              }
              .dashboard-academic-table input,
              .dashboard-academic-table select {
                font-family: 'Inter', sans-serif !important;
                font-size: 12px !important;
                color: #f8fafc !important;
              }
              /* Universal Crisp White Excel Gridlines Invariant (SSOT §4.3) */
              body.global-edit-mode-on .dashboard-academic-table th,
              body.global-edit-mode-on .dashboard-academic-table td {
                border-right: 1px solid var(--admin-border-active, rgba(255, 255, 255, 0.50)) !important;
                border-bottom: 1px solid var(--admin-border-active, rgba(255, 255, 255, 0.50)) !important;
              }
              body.global-edit-mode-on .dashboard-academic-table th:first-child,
              body.global-edit-mode-on .dashboard-academic-table td:first-child {
                border-left: 1px solid var(--admin-border-active, rgba(255, 255, 255, 0.50)) !important;
              }
              body.global-edit-mode-on .dashboard-academic-table thead tr:first-child th {
                border-top: 1px solid var(--admin-border-active, rgba(255, 255, 255, 0.50)) !important;
              }
              body.global-edit-mode-on .dashboard-academic-table td:focus-within {
                background: rgba(255, 255, 255, 0.08) !important;
              }
            </style>
            <table class="dashboard-academic-table">
              <thead style="position:sticky;top:0;z-index:10;background:#0f172a;">
                <tr style="height:30px;">
                  <th style="text-align:center;min-width:38px;">LVL</th>
                  <th style="text-align:left;min-width:108px;">CODE</th>
                  <th style="text-align:left;min-width:200px;">CLASS NAME</th>
                  <th style="text-align:center;min-width:72px;">DAY</th>
                  <th style="text-align:center;min-width:54px;">START</th>
                  <th style="text-align:center;min-width:54px;">END</th>
                  <th style="text-align:center;min-width:48px;" title="Class Duration (Minutes: 60, 90, 120, 150, 180)">DUR</th>
                  <th style="text-align:left;min-width:96px;">ROOM</th>
                  <th style="text-align:left;min-width:90px;">TUTOR</th>
                  <th style="text-align:center;min-width:48px;">STD</th>
                  <th style="text-align:right;min-width:52px;" title="Class Attendance Rate (%)">RATE</th>
                  <th style="text-align:center;min-width:68px;">STATUS</th>
                  <th style="text-align:center;min-width:64px;">MODE</th>
                </tr>
              </thead>
              <tbody>
                ${currentClasses.map((item, idx) => {
                  const lvlStr = item.level === 0 ? '—' : item.level === 1 ? '1st' : item.level === 2 ? '2nd' : '3rd';
                  const cCode = canonicalizeClassCode(item.code);
                  const clsMode = getClassMode(item.code);
                  const assignedTutorId = _classTutorMap[item.code] || _classTutorMap[cCode];
                  const assignedTutor = activeTutors.find(t => t.id === assignedTutorId);
                  const sched = _classScheduleMap[item.code] || _classScheduleMap[cCode] || { room: '—', start: '08:00', end: '09:30', day: 'Mon–Fri' };
                  const schedDur = sched.duration || getScheduleDurationMinutes(sched.start, sched.end) || 60;
                  const rowBg = idx % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent';
                  const schedRoomCode = resolveRoomCode(sched.room);
                  const schedRoomName = resolveRoomName(sched.room);

                  const rowAudit = (audit.byClass && (audit.byClass[item.code] || audit.byClass[cCode])) || { tutorClashes: [], roomClashes: [], capacityIssue: null };
                  const hasTutorClash = rowAudit.tutorClashes.length > 0;
                  const hasRoomClash = rowAudit.roomClashes.length > 0;
                  const hasCapIssue = !!rowAudit.capacityIssue;
                  const hasTimeClash = hasTutorClash || hasRoomClash;

                  const timeClashDetails = [
                    ...rowAudit.tutorClashes.map(tc => `Tutor ${tc.tutorName} double-booked with ${tc.otherCode} (${tc.otherTime})`),
                    ...rowAudit.roomClashes.map(rc => `Room ${rc.roomName} double-booked with ${rc.otherCode} (${rc.otherTime})`)
                  ].join('; ');

                  const rowBorderLeft = (hasTutorClash || hasRoomClash)
                    ? 'border-left:3px solid var(--grade-e, #ff0000) !important;'
                    : hasCapIssue
                    ? 'border-left:3px solid var(--grade-c, #ffff00) !important;'
                    : '';

                  return `
                    <tr class="dashboard-class-row" data-class-code="${escHtml(item.code || '')}" data-class-id="${item.id || ''}" data-orig-bg="${rowBg}" style="background:${rowBg};transition:background .15s;${rowBorderLeft}">
                      <!-- 1. LVL -->
                      <td style="text-align:center;font-weight:600;font-size:12px;color:var(--admin-text-main, #f8fafc);font-variant-numeric:tabular-nums;white-space:nowrap;">
                        ${lvlStr}
                      </td>

                      <!-- 2. CODE (Tepat Setelah Kolom Numbering LVL) -->
                      <td style="text-align:left;font-family:monospace;font-size:12px;color:var(--admin-text-main, #f8fafc);font-weight:600;white-space:nowrap;">
                        ${escHtml(item.code || '—')}
                      </td>

                      <!-- 3. CLASS NAME (12px, Zero Truncation) -->
                      <td style="text-align:left;font-weight:400;font-size:12px;color:var(--admin-text-main, #f8fafc);white-space:nowrap;" title="${escHtml(item.name)}">
                        ${escHtml(item.name)}
                      </td>

                      <!-- 4. DAY (Schedule Day Selector in Edit Mode) -->
                      <td style="text-align:center;font-weight:500;font-size:12px;color:var(--admin-text-main, #f8fafc);white-space:nowrap;">
                        ${isEditOn ? `
                          <select onchange="window._onDashboardScheduleChange('${escHtml(item.code)}', 'day', this.value)" style="height:100%;width:100%;padding:0 2px;font-size:12px !important;font-family:'Inter',sans-serif !important;font-weight:500;background:transparent;border:none;outline:none;color:var(--admin-text-main, #f8fafc);box-sizing:border-box;text-align:center;cursor:pointer;">
                            ${CLASS_DAY_OPTIONS.map(d => `<option value="${d}" ${(sched.day || 'Mon–Fri') === d ? 'selected' : ''} style="background:#0f172a;color:#f8fafc;">${d}</option>`).join('')}
                          </select>
                        ` : `
                          <span style="font-size:12px;font-weight:500;color:var(--admin-text-main, #f8fafc);">${escHtml(sched.day || 'Mon–Fri')}</span>
                        `}
                      </td>

                      <!-- 5. START (Quarter-Hour Dropdown 00, 15, 30, 45 in Edit Mode) -->
                      <td style="text-align:center;font-weight:500;font-size:12px;color:var(--admin-text-main, #f8fafc);font-variant-numeric:tabular-nums;white-space:nowrap;">
                        ${isEditOn ? `
                          ${renderQuarterHourTimeSelect(sched.start || '07:30', `window._onDashboardScheduleChange('${escHtml(item.code)}', 'start', this.value)`, '', hasTimeClash)}
                        ` : `
                          <span style="font-size:12px;font-weight:500;color:${hasTimeClash ? 'var(--grade-e, #ff0000)' : 'var(--admin-text-main, #f8fafc)'};" ${hasTimeClash ? `title="⚠ Time Conflict: ${escHtml(timeClashDetails)}"` : ''}>${escHtml(sched.start || '—')}</span>
                        `}
                      </td>

                      <!-- 6. END (Quarter-Hour Dropdown 00, 15, 30, 45 in Edit Mode) -->
                      <td style="text-align:center;font-weight:500;font-size:12px;color:var(--admin-text-main, #f8fafc);font-variant-numeric:tabular-nums;white-space:nowrap;">
                        ${isEditOn ? `
                          ${renderQuarterHourTimeSelect(sched.end || '09:00', `window._onDashboardScheduleChange('${escHtml(item.code)}', 'end', this.value)`, '', hasTimeClash)}
                        ` : `
                          <span style="font-size:12px;font-weight:500;color:${hasTimeClash ? 'var(--grade-e, #ff0000)' : 'var(--admin-text-main, #f8fafc)'};" ${hasTimeClash ? `title="⚠ Time Conflict: ${escHtml(timeClashDetails)}"` : ''}>${escHtml(sched.end || '—')}</span>
                        `}
                      </td>

                      <!-- 7. DUR (Class Duration: 60m min, +30m step up to 180m max) -->
                      <td style="text-align:center;white-space:nowrap;">
                        ${isEditOn ? `
                          <select onchange="window._onDashboardScheduleChange('${escHtml(item.code)}', 'duration', this.value)" style="height:100%;width:100%;padding:0 2px;font-size:12px !important;font-family:'Inter',sans-serif !important;font-weight:600;background:transparent;border:none;outline:none;color:var(--admin-text-main, #f8fafc);cursor:pointer;box-sizing:border-box;text-align:center;" title="Select Duration (60–180 min)">
                            <option value="60" ${schedDur === 60 ? 'selected' : ''} style="background:#0f172a;color:#f8fafc;">60m</option>
                            <option value="90" ${schedDur === 90 ? 'selected' : ''} style="background:#0f172a;color:#f8fafc;">90m</option>
                            <option value="120" ${schedDur === 120 ? 'selected' : ''} style="background:#0f172a;color:#f8fafc;">120m</option>
                            <option value="150" ${schedDur === 150 ? 'selected' : ''} style="background:#0f172a;color:#f8fafc;">150m</option>
                            <option value="180" ${schedDur === 180 ? 'selected' : ''} style="background:#0f172a;color:#f8fafc;">180m</option>
                            ${![60, 90, 120, 150, 180].includes(schedDur) && schedDur > 0 ? `<option value="${schedDur}" selected style="background:#0f172a;color:#f8fafc;">${schedDur}m</option>` : ''}
                          </select>
                        ` : `
                          <span style="font-size:12px;font-weight:600;color:var(--admin-text-main, #f8fafc);font-variant-numeric:tabular-nums;cursor:pointer;" onclick="window._toggleDashboardEditMode()" title="Duration: ${schedDur} minutes (Click Edit Mode to modify)">${schedDur}m</span>
                        `}
                      </td>

                      <!-- 8. ROOM (Room Name Display, Dropdown with Capacity in Edit Mode) -->
                      <td style="text-align:left;font-weight:500;font-size:12px;color:var(--admin-text-main, #f8fafc);white-space:nowrap;">
                        ${isEditOn ? `
                          <select onchange="window._onDashboardScheduleChange('${escHtml(item.code)}', 'room', this.value)" style="height:100%;width:100%;padding:0 2px;font-size:12px !important;font-family:'Inter',sans-serif !important;font-weight:500;background:transparent;border:${hasRoomClash ? '1px solid var(--grade-e, #ff0000) !important' : hasCapIssue ? '1px solid var(--grade-c, #ffff00) !important' : 'none'};outline:none;color:${hasRoomClash ? 'var(--grade-e, #ff0000)' : hasCapIssue ? 'var(--grade-c, #ffff00)' : 'var(--admin-text-main, #f8fafc)'};box-sizing:border-box;text-align:left;cursor:pointer;" title="${hasRoomClash ? `⚠ Room Clash: ${schedRoomName} double-booked at this time!` : hasCapIssue ? `⚠ Overcapacity: ${item.studentCount} students exceed room capacity (${rowAudit.capacityIssue.capacity} max)` : 'Select Room'}">
                            <option value="—" style="background:#0f172a;color:#f8fafc;">— None —</option>
                            ${activeRooms.map(r => `<option value="${escHtml(r.code)}" ${schedRoomCode === r.code ? 'selected' : ''} style="background:#0f172a;color:#f8fafc;">${escHtml(r.name || r.code)} (${r.capacity || '—'})</option>`).join('')}
                          </select>
                        ` : `
                          ${hasRoomClash ? `
                            <span style="font-size:12px;font-weight:700;color:var(--grade-e, #ff0000);display:inline-flex;align-items:center;gap:3px;cursor:pointer;" title="⚠ Room Clash: ${escHtml(schedRoomName)} (${escHtml(schedRoomCode)}) is also booked by ${escHtml(rowAudit.roomClashes.map(c => c.otherCode + ' [' + c.otherTime + ']').join(', '))}" onclick="window._toggleDashboardEditMode()">
                              <span>⚠</span>
                              <span>${escHtml(schedRoomName)}</span>
                            </span>
                          ` : hasCapIssue ? `
                            <span style="font-size:12px;font-weight:600;color:var(--grade-c, #ffff00);display:inline-flex;align-items:center;gap:3px;cursor:pointer;" title="⚠ Overcapacity: ${item.studentCount} students exceed ${escHtml(schedRoomName)} capacity (${rowAudit.capacityIssue.capacity} max by +${rowAudit.capacityIssue.diff})" onclick="window._toggleDashboardEditMode()">
                              <span>⚠</span>
                              <span>${escHtml(schedRoomName)}</span>
                            </span>
                          ` : `
                            <span style="font-size:12px;font-weight:500;color:var(--admin-text-main, #f8fafc);" title="Room Code: ${escHtml(schedRoomCode)}">${escHtml(schedRoomName)}</span>
                          `}
                        `}
                      </td>

                      <!-- 9. TUTOR (Tanpa Titik/Dot, Dropdown with Conflict Detection in Edit Mode) -->
                      <td style="text-align:left;white-space:nowrap;">
                        ${isEditOn ? `
                          <select class="dashboard-tutor-select" onchange="window._onDashboardTutorChange('${escHtml(item.code)}', this.value)" style="height:100%;width:100%;padding:0 2px;font-size:12px !important;font-family:'Inter',sans-serif !important;font-weight:600;background:transparent;border:${hasTutorClash ? '1px solid var(--grade-e, #ff0000) !important' : 'none'};outline:none;color:${hasTutorClash ? 'var(--grade-e, #ff0000)' : 'var(--admin-text-main, #f8fafc)'};cursor:pointer;box-sizing:border-box;" title="${hasTutorClash ? `⚠ Tutor Clash: ${assignedTutor ? assignedTutor.nickname : 'Tutor'} double-booked at this time!` : 'Select Tutor'}">
                            <option value="" style="background:#0f172a;color:#f8fafc;">— None —</option>
                            ${activeTutors.map(t => `<option value="${t.id}" ${assignedTutorId === t.id ? 'selected' : ''} style="background:#0f172a;color:#f8fafc;">${t.nickname}</option>`).join('')}
                          </select>
                        ` : `
                          ${hasTutorClash ? `
                            <span style="color:var(--grade-e, #ff0000);font-weight:700;font-size:12px;display:inline-flex;align-items:center;gap:3px;cursor:pointer;" title="⚠ Tutor Clash: ${escHtml(assignedTutor ? assignedTutor.nickname : 'Tutor')} is also teaching ${escHtml(rowAudit.tutorClashes.map(c => c.otherCode + ' [' + c.otherTime + ']').join(', '))}" onclick="window._toggleDashboardEditMode()">
                              <span>⚠</span>
                              <span>${escHtml(assignedTutor ? assignedTutor.nickname : 'Tutor')}</span>
                            </span>
                          ` : assignedTutor ? `
                            <span style="color:var(--admin-text-main, #f8fafc);font-weight:600;font-size:12px;cursor:pointer;" title="Tutor: ${escHtml(assignedTutor.full_name)} (Click Edit Mode to reassign)" onclick="window._toggleDashboardEditMode()">${escHtml(assignedTutor.nickname)}</span>
                          ` : `
                            <span style="color:#64748b;font-size:12px;cursor:pointer;" onclick="window._toggleDashboardEditMode()" title="Click Edit Mode to assign tutor">—</span>
                          `}
                        `}
                      </td>

                      <!-- 10. STD (Highlight if Overcapacity) -->
                      <td style="text-align:center;font-weight:${hasCapIssue ? '700' : '400'};font-size:12px;color:${hasCapIssue ? 'var(--grade-c, #ffff00)' : 'var(--admin-text-main, #f8fafc)'};font-variant-numeric:tabular-nums;white-space:nowrap;">
                        ${hasCapIssue ? `
                          <span style="display:inline-flex;align-items:center;gap:2px;cursor:pointer;" title="⚠ Overcapacity: ${item.studentCount} students exceed room capacity (${rowAudit.capacityIssue.capacity} max)" onclick="window._toggleDashboardEditMode()">
                            <span>${item.studentCount}</span>
                            <span style="font-size:12px;">⚠</span>
                          </span>
                        ` : `
                          ${item.studentCount}
                        `}
                      </td>

                      <!-- 11. ATTENDANCE RATE (Strictly Attendance Rate SSOT) -->
                      <td style="text-align:right;white-space:nowrap;">
                        ${item.attendanceRate !== null && item.attendanceRate !== undefined ? `
                          <span class="metric-pct ${item.attendanceRate >= 80 ? 'pct-high' : item.attendanceRate >= 60 ? 'pct-mid' : 'pct-low'}" data-pct-tier="${item.attendanceRate >= 80 ? 'high' : item.attendanceRate >= 60 ? 'mid' : 'low'}" style="color:${gradeColor(item.attendanceRate)};font-weight:700;font-size:12px;font-variant-numeric:tabular-nums;" title="Class Attendance Rate: ${item.attendanceRate}%">${item.attendanceRate}%</span>
                        ` : `
                          <span style="color:#64748b;font-size:12px;" title="No attendance recorded yet">—</span>
                        `}
                      </td>

                      <!-- 12. STATUS (Active = #00c000 Green, Inactive = var(--grade-e, #ff0000) Red) -->
                      <td style="text-align:center;white-space:nowrap;">
                        ${item.isActive ? `
                          <span class="status-tag status-active" data-status="active" style="color:var(--grade-a, #00c000);font-weight:700;font-size:12px;">Active</span>
                        ` : `
                          <span class="status-tag status-inactive" data-status="inactive" style="color:var(--grade-e, #ff0000);font-weight:700;font-size:12px;">Inactive</span>
                        `}
                      </td>

                      <!-- 13. MODE (Manual | System - Far Right Next to Status) -->
                      <td style="text-align:center;white-space:nowrap;">
                        ${isEditOn ? `
                          <select onchange="window._onDashboardModeChange('${escHtml(item.code)}', this.value)" style="height:100%;width:100%;padding:0 2px;font-size:12px !important;font-family:'Inter',sans-serif !important;font-weight:700;background:transparent;border:none;outline:none;color:${clsMode === 'System' ? '#38bdf8' : '#ff8c00'};box-sizing:border-box;text-align:center;cursor:pointer;">
                            <option value="Manual" ${clsMode === 'Manual' ? 'selected' : ''} style="background:#0f172a;color:#ff8c00;">Manual</option>
                            <option value="System" ${clsMode === 'System' ? 'selected' : ''} style="background:#0f172a;color:#38bdf8;">System</option>
                          </select>
                        ` : `
                          <span style="font-size:12px;font-weight:700;color:${clsMode === 'System' ? '#38bdf8' : '#ff8c00'};">${clsMode}</span>
                        `}
                      </td>

                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
        </div>

        <!-- ────────────────────────────────────────────────────────── -->
        <!-- PANEL KANAN: TRIPLE TABLES (TUTORS + ROOMS + BATCHES)      -->
        <!-- ────────────────────────────────────────────────────────── -->
        <div style="display:flex;flex-direction:column;gap:10px;height:100%;box-sizing:border-box;overflow:hidden;min-width:0;">

          <!-- 1. UPPER CARD: FACULTY & TUTORS -->
          <div class="glass-card" style="padding:10px !important;display:flex;flex-direction:column;flex:1.1 1 0;min-height:0;box-sizing:border-box;overflow:hidden;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.08);flex-shrink:0;height:24px;">
              <h3 style="margin:0;font-size:12px;font-weight:800;text-transform:uppercase;color:var(--admin-text-main, #f8fafc);display:flex;align-items:center;gap:6px;">
                <span>${isCEC ? 'FACULTY &amp; TUTORS' : 'TOP INSTRUCTORS'}</span>
                <span style="font-size:10px;font-weight:800;padding:1px 6px;background:${isCEC ? 'rgba(56,189,248,0.15)' : 'rgba(255,140,0,0.15)'};color:${isCEC ? C.TACT : C.ORANGE};border-radius:10px;">
                  ${activeTutors.length} TUTORS ON DUTY
                </span>
              </h3>
              <div style="display:inline-flex;align-items:center;gap:6px;">
                ${isEditOn ? `
                  <button type="button" class="btn btn-ghost btn-sm" onclick="window._openAddTutorModal()" style="color:#38bdf8;font-size:11px;height:20px;line-height:18px;padding:0 6px;border:1px solid rgba(56,189,248,0.4);border-radius:3px;cursor:pointer;font-weight:700;">+ Add Tutor</button>
                ` : ''}
                <span style="font-size:10px;color:${C.MUTED};font-weight:600;">TUTOR ROSTER</span>
              </div>
            </div>

            <!-- Compact Tutor Datagrid Table (Code + Photo/Pic Display + Name + DoB + Age + Act) -->
            <div style="flex:1 1 0;min-height:0;height:calc(100% - 30px);overflow-y:auto;overflow-x:hidden;margin-bottom:0 !important;display:flex;flex-direction:column;">
              <table class="dashboard-academic-table faculty-table" style="width:100%;height:100%;border-collapse:collapse;display:flex;flex-direction:column;">
                <thead style="flex-shrink:0;background:#0f172a;border-bottom:2px solid rgba(255,255,255,0.22);display:table;width:100%;table-layout:fixed;">
                  <tr style="height:24px;">
                    <th style="padding:0 4px;text-align:left;width:55px;white-space:nowrap;">CODE</th>
                    <th style="padding:0 4px;text-align:center;width:34px;white-space:nowrap;">PIC</th>
                    <th style="padding:0 6px;text-align:left;width:40%;min-width:110px;white-space:nowrap;">NAME</th>
                    <th style="padding:0 4px;text-align:center;width:66px;white-space:nowrap;">DoB</th>
                    <th style="padding:0 4px;text-align:center;width:36px;white-space:nowrap;">AGE</th>
                    <th style="padding:0 4px;text-align:center;width:44px;white-space:nowrap;">ACT</th>
                  </tr>
                </thead>
                <tbody style="flex:1 1 0;min-height:0;display:flex;flex-direction:column;justify-content:flex-start;overflow-y:auto;">
                  ${activeTutors.map((t, idx) => {
                    const assignedList = Array.isArray(t.assigned_classes) ? t.assigned_classes : [];
                    const age = calcAge(t.birth_date);
                    const ageStr = age !== null ? `${age}` : '—';
                    const rowBg = idx % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent';

                    return `
                      <tr class="dashboard-tutor-row" data-tutor-id="${escHtml(t.id)}" data-tutor-code="${escHtml(t.code || '')}" data-assigned-classes="${escHtml(assignedList.join(','))}" data-orig-bg="${rowBg}" style="display:table;width:100%;table-layout:fixed;height:28px;min-height:28px;border-bottom:1px solid rgba(255,255,255,0.04);background:${rowBg};transition:background .15s;align-items:center;">

                        <!-- 1. CODE (Monospace 12px, matching CAMP ROOMS & VENUES CODE column) -->
                        <td class="col-tutor-code" style="padding:1px 4px;text-align:left;font-family:monospace;font-size:12px;color:var(--admin-text-main, #f8fafc);font-weight:700;white-space:nowrap;width:55px;vertical-align:middle;">
                          ${escHtml(t.code || '—')}
                        </td>

                        <!-- 2. PHOTO/PIC DISPLAY (CLICKABLE TO EDIT) -->
                        <td style="padding:1px 4px;text-align:center;width:34px;vertical-align:middle;">
                          <div onclick="window._openEditTutorModal('${escHtml(t.id)}')" title="Click to view/edit profile for ${escHtml(t.nickname)}" style="width:22px;height:22px;border-radius:4px;border:1px solid rgba(255,255,255,0.22);display:inline-flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.06);overflow:hidden;cursor:pointer;margin:0 auto;transition:border-color .15s, transform .15s;">
                            ${t.avatar_url ? `
                              <img src="${escHtml(t.avatar_url)}" alt="${escHtml(t.nickname)}" style="width:100%;height:100%;object-fit:cover;">
                            ` : `
                              <span style="font-size:10px;font-weight:800;color:var(--admin-text-main, #f8fafc);">${t.nickname.replace(/^(Mr\.|Miss)\s*/i, '').slice(0, 2).toUpperCase()}</span>
                            `}
                          </div>
                        </td>

                        <!-- 3. NAME (NO Dot, Nickname + Full Name) -->
                        <td style="padding:1px 6px;text-align:left;width:40%;min-width:110px;vertical-align:middle;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                          <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                            <span style="font-weight:700;color:var(--admin-text-main, #f8fafc);font-size:12px;">${escHtml(t.nickname)}</span>
                            <span style="color:var(--admin-text-muted, #94a3b8);font-size:11px;margin-left:4px;">(${escHtml(cleanFullName(t.full_name))})</span>
                          </div>
                        </td>

                        <!-- 4. DoB (Compact DD/MM/YY 12px) -->
                        <td style="padding:1px 4px;text-align:center;width:66px;vertical-align:middle;color:var(--admin-text-main, #f8fafc);font-size:12px;font-variant-numeric:tabular-nums;white-space:nowrap;">
                          ${formatDobOnly(t.birth_date)}
                        </td>

                        <!-- 5. AGE (12px) -->
                        <td style="padding:1px 4px;text-align:center;width:36px;vertical-align:middle;color:var(--admin-text-main, #f8fafc);font-weight:700;font-size:12px;font-variant-numeric:tabular-nums;white-space:nowrap;">
                          ${ageStr}
                        </td>

                        <!-- 6. ACT -->
                        <td style="padding:1px 4px;text-align:center;width:44px;vertical-align:middle;white-space:nowrap;">
                          <button type="button" class="btn btn-ghost btn-sm" onclick="window._openEditTutorModal('${escHtml(t.id)}')" style="color:var(--admin-text-main, #f8fafc);font-size:11px;height:20px;line-height:18px;padding:0 5px;border:1px solid var(--admin-border-subtle, rgba(255,255,255,0.25));border-radius:3px;cursor:pointer;" title="Edit Tutor Profile & DoB">Edit</button>
                        </td>

                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- 2. MIDDLE CARD: CAMP ROOMS & VENUES -->
          <div class="glass-card" style="padding:10px !important;display:flex;flex-direction:column;flex:0.95 1 0;min-height:0;box-sizing:border-box;overflow:hidden;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.08);flex-shrink:0;height:24px;">
              <h3 style="margin:0;font-size:12px;font-weight:800;text-transform:uppercase;color:var(--admin-text-main, #f8fafc);display:flex;align-items:center;gap:6px;">
                <span>${isCEC ? 'CAMP ROOMS &amp; VENUES' : 'TOP VENUES &amp; ROOMS'}</span>
                <span style="font-size:10px;font-weight:800;padding:1px 6px;background:${isCEC ? 'rgba(56,189,248,0.15)' : 'rgba(255,140,0,0.15)'};color:${isCEC ? C.TACT : C.ORANGE};border-radius:10px;">
                  ${activeRooms.length} ROOMS
                </span>
              </h3>
              <div style="display:inline-flex;align-items:center;gap:6px;">
                ${isEditOn ? `
                  <button type="button" class="btn btn-ghost btn-sm" onclick="window._openAddRoomModal()" style="color:#38bdf8;font-size:11px;height:20px;line-height:18px;padding:0 6px;border:1px solid rgba(56,189,248,0.4);border-radius:3px;cursor:pointer;font-weight:700;">+ Add Room</button>
                ` : ''}
                <span style="font-size:10px;color:${C.MUTED};font-weight:600;">VENUE DIRECTORY</span>
              </div>
            </div>

            <!-- Rooms Datagrid Table (Code + Room Name + Capacity + Type + Act) -->
            <div style="flex:1 1 0;min-height:0;height:calc(100% - 30px);overflow-y:auto;overflow-x:hidden;margin-bottom:0 !important;display:flex;flex-direction:column;">
              <table class="dashboard-academic-table room-table" style="width:100%;height:100%;border-collapse:collapse;display:flex;flex-direction:column;">
                <thead style="flex-shrink:0;background:#0f172a;border-bottom:2px solid rgba(255,255,255,0.22);display:table;width:100%;table-layout:fixed;">
                  <tr style="height:30px;">
                    <th style="padding:0 4px;text-align:left;width:55px;white-space:nowrap;">CODE</th>
                    <th style="padding:0 6px;text-align:left;width:40%;min-width:110px;white-space:nowrap;">ROOM NAME</th>
                    <th style="padding:0 4px;text-align:center;width:38px;white-space:nowrap;">CAP</th>
                    <th style="padding:0 4px;text-align:left;width:30%;min-width:80px;white-space:nowrap;">TYPE</th>
                    <th style="padding:0 4px;text-align:center;width:44px;white-space:nowrap;">ACT</th>
                  </tr>
                </thead>
                <tbody style="flex:1 1 0;min-height:0;display:flex;flex-direction:column;justify-content:flex-start;overflow-y:auto;">
                  ${activeRooms.map((r, idx) => {
                    const rowBg = idx % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent';
                    return `
                      <tr class="dashboard-room-row" data-room-code="${escHtml(r.code)}" data-room-name="${escHtml(r.name)}" data-orig-bg="${rowBg}" style="display:table;width:100%;table-layout:fixed;height:30px;min-height:30px;border-bottom:1px solid rgba(255,255,255,0.04);background:${rowBg};transition:background .15s;align-items:center;">
                        <!-- CODE (12px) -->
                        <td class="col-room-code" style="padding:1px 4px;text-align:left;font-family:monospace;font-size:12px;color:var(--admin-text-main, #f8fafc);font-weight:700;white-space:nowrap;width:55px;vertical-align:middle;">
                          ${escHtml(r.code)}
                        </td>
                        <!-- ROOM NAME (12px) -->
                        <td style="padding:1px 6px;text-align:left;width:40%;min-width:110px;vertical-align:middle;color:var(--admin-text-main, #f8fafc);font-weight:500;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                          ${escHtml(r.name)}
                        </td>
                        <!-- CAPACITY (12px) -->
                        <td style="padding:1px 4px;text-align:center;width:38px;vertical-align:middle;color:var(--admin-text-main, #f8fafc);font-size:12px;font-variant-numeric:tabular-nums;white-space:nowrap;">
                          ${r.capacity || '—'}
                        </td>
                        <!-- TYPE (12px) -->
                        <td style="padding:1px 4px;text-align:left;width:30%;min-width:80px;vertical-align:middle;color:var(--admin-text-muted, #94a3b8);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                          ${escHtml(r.type || 'Classroom')}
                        </td>
                        <!-- ACT -->
                        <td style="padding:1px 4px;text-align:center;width:44px;vertical-align:middle;white-space:nowrap;">
                          <button type="button" class="btn btn-ghost btn-sm" onclick="window._openEditRoomModal('${escHtml(r.code)}')" style="color:var(--admin-text-main, #f8fafc);font-size:11px;height:20px;line-height:18px;padding:0 5px;border:1px solid var(--admin-border-subtle, rgba(255,255,255,0.25));border-radius:3px;cursor:pointer;" title="Edit Room">Edit</button>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- 3. BOTTOM CARD: ACTIVE BATCHES & LEVEL BREAKDOWN -->
          <div class="glass-card" style="padding:10px !important;display:flex;flex-direction:column;flex:1.05 1 0;min-height:0;box-sizing:border-box;overflow:hidden;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.08);flex-shrink:0;height:24px;">
              <h3 style="margin:0;font-size:12px;font-weight:800;text-transform:uppercase;color:var(--admin-text-main, #f8fafc);display:flex;align-items:center;gap:6px;">
                <span>${isCEC ? 'ACTIVE BATCHES' : 'TOP BATCHES'}</span>
                <span style="font-size:10px;font-weight:800;padding:1px 6px;background:${isCEC ? 'rgba(56,189,248,0.15)' : 'rgba(255,140,0,0.15)'};color:${isCEC ? C.TACT : C.ORANGE};border-radius:10px;">
                  ${displayBatches.length} BATCHES
                </span>
              </h3>
              <span style="font-size:10px;color:${C.MUTED};font-weight:600;">BATCH ROSTER</span>
            </div>

            <!-- Batch Datagrid Table (BATCH | 1 | 2 | 3 | KING | QUEEN) -->
            <div style="flex:1 1 0;min-height:0;height:calc(100% - 30px);overflow-y:auto;overflow-x:hidden;margin-bottom:0 !important;display:flex;flex-direction:column;">
              <table class="dashboard-academic-table" style="width:100%;height:100%;border-collapse:collapse;display:flex;flex-direction:column;">
                <thead style="flex-shrink:0;background:#0f172a;border-bottom:2px solid rgba(255,255,255,0.22);display:table;width:100%;table-layout:fixed;">
                  <tr style="height:30px;">
                    <th style="padding:0 6px;text-align:left;width:55px;white-space:nowrap;">BATCH</th>
                    <th style="padding:0 2px;text-align:center;width:32px;white-space:nowrap;">1</th>
                    <th style="padding:0 2px;text-align:center;width:32px;white-space:nowrap;">2</th>
                    <th style="padding:0 2px;text-align:center;width:32px;white-space:nowrap;">3</th>
                    <th style="padding:0 6px;text-align:left;width:50%;min-width:140px;white-space:nowrap;" title="Batch King (Best Male Student)">KING</th>
                    <th style="padding:0 6px;text-align:left;width:50%;min-width:140px;white-space:nowrap;" title="Batch Queen (Best Female Student)">QUEEN</th>
                  </tr>
                </thead>
                <tbody style="flex:1 1 0;min-height:0;display:flex;flex-direction:column;justify-content:flex-start;overflow-y:auto;">
                  ${batchRowsData.map((r, idx) => {
                    const rowBg = idx % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent';
                    const bName = String(r.batch.name || '');
                    const cleanBatch = bName.replace(/^batch\s*/i, '').trim();
                    const sups = _batchSuperlativesMap[bName] || _batchSuperlativesMap[r.batch.id] || DEFAULT_BATCH_SUPERLATIVES_MAP[bName] || {};
                    const bStus = r.students || [];

                    const renderCell = (field, defaultVal) => {
                      const cur = sups[field] !== undefined ? sups[field] : defaultVal;
                      if (isEditOn) {
                        return `
                          <select onchange="window._onDashboardBatchSuperlativeChange('${escHtml(bName)}', '${field}', this.value)" style="height:100%;width:100%;padding:0 2px;font-size:12px !important;font-family:'Inter',sans-serif !important;font-weight:500;background:transparent;border:none;outline:none;color:var(--admin-text-main, #f8fafc);box-sizing:border-box;cursor:pointer;">
                            <option value="—" style="background:#0f172a;color:#f8fafc;">— None —</option>
                            ${bStus.map(s => `<option value="${escHtml(s.name)}" ${cur === s.name ? 'selected' : ''} style="background:#0f172a;color:#f8fafc;">${escHtml(s.name)}</option>`).join('')}
                          </select>
                        `;
                      }
                      return `<span style="font-size:12px;font-weight:500;color:var(--admin-text-main, #f8fafc);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;" title="${escHtml(cur || '—')}">${escHtml(cur || '—')}</span>`;
                    };

                    return `
                      <tr class="dashboard-batch-row" data-batch-id="${escHtml(r.batch.id)}" data-orig-bg="${rowBg}" style="display:table;width:100%;table-layout:fixed;height:30px;min-height:30px;border-bottom:1px solid rgba(255,255,255,0.04);background:${rowBg};transition:background .15s;align-items:center;">
                        <!-- BATCH (Clean Name/Number Only without redundant 'Batch' header prefix) -->
                        <td style="padding:1px 6px;text-align:left;width:55px;vertical-align:middle;color:var(--admin-text-main, #f8fafc);font-weight:700;font-size:12px;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                          ${escHtml(cleanBatch)}
                        </td>
                        <!-- 1 (Level 1 Active Students) -->
                        <td style="padding:1px 2px;text-align:center;width:32px;vertical-align:middle;font-size:12px;font-variant-numeric:tabular-nums;white-space:nowrap;">
                          ${r.l1 > 0 ? `<span style="font-weight:700;color:var(--admin-text-main, #f8fafc);">${r.l1}</span>` : `<span style="color:#64748b;">0</span>`}
                        </td>
                        <!-- 2 (Level 2 Active Students) -->
                        <td style="padding:1px 2px;text-align:center;width:32px;vertical-align:middle;font-size:12px;font-variant-numeric:tabular-nums;white-space:nowrap;">
                          ${r.l2 > 0 ? `<span style="font-weight:700;color:var(--admin-text-main, #f8fafc);">${r.l2}</span>` : `<span style="color:#64748b;">0</span>`}
                        </td>
                        <!-- 3 (Level 3 Active Students) -->
                        <td style="padding:1px 2px;text-align:center;width:32px;vertical-align:middle;font-size:12px;font-variant-numeric:tabular-nums;white-space:nowrap;">
                          ${r.l3 > 0 ? `<span style="font-weight:700;color:var(--admin-text-main, #f8fafc);">${r.l3}</span>` : `<span style="color:#64748b;">0</span>`}
                        </td>
                        <!-- KING -->
                        <td style="padding:1px 6px;text-align:left;width:50%;min-width:140px;vertical-align:middle;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                          ${renderCell('king', '—')}
                        </td>
                        <!-- QUEEN -->
                        <td style="padding:1px 6px;text-align:left;width:50%;min-width:140px;vertical-align:middle;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                          ${renderCell('queen', '—')}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
                <tfoot style="flex-shrink:0;background:rgba(15,23,42,0.95);border-top:1px solid rgba(255,255,255,0.15);display:table;width:100%;table-layout:fixed;">
                  <tr style="height:24px;">
                    <td style="padding:1px 6px;text-align:left;font-weight:800;font-size:11px;color:#94a3b8;width:55px;text-transform:uppercase;">TOTAL</td>
                    <td style="padding:1px 2px;text-align:center;font-weight:700;font-size:12px;color:#38bdf8;width:32px;font-variant-numeric:tabular-nums;">${sumL1}</td>
                    <td style="padding:1px 2px;text-align:center;font-weight:700;font-size:12px;color:#38bdf8;width:32px;font-variant-numeric:tabular-nums;">${sumL2}</td>
                    <td style="padding:1px 2px;text-align:center;font-weight:700;font-size:12px;color:#38bdf8;width:32px;font-variant-numeric:tabular-nums;">${sumL3}</td>
                    <td style="padding:1px 6px;text-align:left;color:#64748b;font-size:11px;width:50%;min-width:140px;">—</td>
                    <td style="padding:1px 6px;text-align:left;color:#64748b;font-size:11px;width:50%;min-width:140px;">—</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

        </div>

      </div>
    `;

    // ── Attach Interactive Cross-Highlighting Between Classes, Tutors & Rooms ──
    const tutorRows = container.querySelectorAll('.dashboard-tutor-row');
    const roomRows = container.querySelectorAll('.dashboard-room-row');
    const classRows = container.querySelectorAll('.dashboard-class-row');

    tutorRows.forEach(tRow => {
      const assignedStr = tRow.dataset.assignedClasses || '';
      const assignedList = assignedStr.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

      tRow.addEventListener('mouseenter', () => {
        classRows.forEach(row => {
          const rowCode = (row.dataset.classCode || '').toUpperCase();
          if (assignedList.some(code => rowCode.includes(code) || code.includes(rowCode))) {
            row.style.background = 'rgba(255, 255, 255, 0.12)';
            row.style.outline = '1px solid rgba(255, 255, 255, 0.35)';
          } else {
            row.style.opacity = '0.35';
          }
        });
        tRow.style.outline = '2px solid #38bdf8';
        tRow.style.boxShadow = '0 4px 12px rgba(56, 189, 248, 0.35)';
        tRow.style.transform = 'translateY(-1px)';
      });

      tRow.addEventListener('mouseleave', () => {
        classRows.forEach(row => {
          row.style.background = row.dataset.origBg || '';
          row.style.outline = '';
          row.style.opacity = '1';
        });
        tRow.style.outline = '';
        tRow.style.boxShadow = '';
        tRow.style.transform = '';
      });
    });

    roomRows.forEach(rRow => {
      const rCode = (rRow.dataset.roomCode || '').toUpperCase();
      const rName = (rRow.dataset.roomName || '').toUpperCase();

      rRow.addEventListener('mouseenter', () => {
        classRows.forEach(row => {
          const rowCode = row.dataset.classCode;
          const sched = _classScheduleMap[rowCode];
          const curRoomName = sched ? resolveRoomName(sched.room).toUpperCase() : '';
          if (curRoomName && (curRoomName === rName || curRoomName === rCode)) {
            row.style.background = 'rgba(255, 255, 255, 0.12)';
            row.style.outline = '1px solid rgba(255, 255, 255, 0.35)';
          } else {
            row.style.opacity = '0.35';
          }
        });
        rRow.style.outline = '2px solid #38bdf8';
        rRow.style.boxShadow = '0 4px 12px rgba(56, 189, 248, 0.35)';
        rRow.style.transform = 'translateY(-1px)';
      });

      rRow.addEventListener('mouseleave', () => {
        classRows.forEach(row => {
          row.style.background = row.dataset.origBg || '';
          row.style.outline = '';
          row.style.opacity = '1';
        });
        rRow.style.outline = '';
        rRow.style.boxShadow = '';
        rRow.style.transform = '';
      });
    });

    classRows.forEach(row => {
      const rowCode = (row.dataset.classCode || '').toUpperCase();
      const sched = _classScheduleMap[rowCode];
      const curRoom = sched ? resolveRoomName(sched.room).toUpperCase() : '';

      row.addEventListener('mouseenter', () => {
        tutorRows.forEach(tRow => {
          const assignedStr = tRow.dataset.assignedClasses || '';
          const assignedList = assignedStr.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
          if (assignedList.some(code => rowCode.includes(code) || code.includes(rowCode))) {
            tRow.style.outline = '2px solid #38bdf8';
            tRow.style.boxShadow = '0 4px 12px rgba(56, 189, 248, 0.35)';
            tRow.style.transform = 'translateY(-1px)';
          } else {
            tRow.style.opacity = '0.35';
          }
        });
        roomRows.forEach(rRow => {
          const rCode = (rRow.dataset.roomCode || '').toUpperCase();
          const rName = (rRow.dataset.roomName || '').toUpperCase();
          if (curRoom && (rCode === curRoom || rName === curRoom)) {
            rRow.style.outline = '2px solid #38bdf8';
            rRow.style.boxShadow = '0 4px 12px rgba(56, 189, 248, 0.35)';
            rRow.style.transform = 'translateY(-1px)';
          } else {
            rRow.style.opacity = '0.35';
          }
        });
        row.style.background = 'rgba(255, 255, 255, 0.1)';
      });

      row.addEventListener('mouseleave', () => {
        tutorRows.forEach(tRow => {
          tRow.style.outline = '';
          tRow.style.boxShadow = '';
          tRow.style.transform = '';
          tRow.style.opacity = '1';
        });
        roomRows.forEach(rRow => {
          rRow.style.outline = '';
          rRow.style.boxShadow = '';
          rRow.style.transform = '';
          rRow.style.opacity = '1';
        });
        row.style.background = row.dataset.origBg || '';
      });
    });
  }

  // Initial render
  renderView();
}
