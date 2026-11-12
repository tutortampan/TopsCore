// TOPS CORE — API Module (Stabilized & Synchronized)
// Centralized server & database interface for TOPS CORE LMS.
import { getSupabase, SUPABASE_URL, callEdgeFunction, isEdgeFunctionOffline, markEdgeFunctionOffline } from './supabase.js?v=20261106_v160';
import { evaluateAnswer, calculatePercentage, isPassing, calculateGrade, calculateOverallStudentScore, parseCorrectAnswers, stripHyphens, TOPSCORE_COLORS, getEvaluationColor, GRADE_PALETTE, getGradeColor, getGradeColorByScore, getScoreColor, getGradeSymbol, getGradeTheme, formatGradeBadgeHtml, isExam, isWeeklyExam, computeMilestoneExamMastery } from './grading.js?v=20261106_v160';
import { stripHonorific, getStudentInitial } from './utils/avatar-engine.js?v=20261106_v160';
import { escapeHtml, escHtml, showToast } from './app.js?v=20261106_v160';

export function getGrade(pct) {
  return calculateGrade(pct);
}

export { evaluateAnswer, calculatePercentage, isPassing, calculateGrade, calculateOverallStudentScore, parseCorrectAnswers, stripHyphens, TOPSCORE_COLORS, getEvaluationColor, GRADE_PALETTE, getGradeColor, getGradeColorByScore, getScoreColor, getGradeSymbol, getGradeTheme, formatGradeBadgeHtml, isExam, isWeeklyExam, computeMilestoneExamMastery, callEdgeFunction, stripHonorific, getStudentInitial, escapeHtml, escHtml, showToast };

// ============================================================
// AUTH / LOGIN & UTILITIES
// ============================================================

const MOCK_INSTITUTIONS = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'General English Program' },
  { id: '11111111-1111-1111-1111-222222222222', name: 'Academic English Program' }
];

const MOCK_PROGRAMS = [
  { id: '22222222-2222-2222-2222-222222222222', institution_id: '11111111-1111-1111-1111-111111111111', name: 'Class A' },
  { id: '22222222-2222-2222-2222-333333333333', institution_id: '11111111-1111-1111-1111-111111111111', name: 'Class B' }
];

export function cleanStudentName(name) {
  if (!name) return '';
  const cleaned = stripHonorific(name);
  return cleaned.toLowerCase().split(' ').map(word => {
    if (!word) return '';
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
}

export function formatStudentName(name, gender) {
  const clean = cleanStudentName(name);
  const g = String(gender || '').toLowerCase().trim();
  if (g === 'female' || g === 'f' || g === 'perempuan' || g === 'p') return `Miss ${clean}`;
  if (g === 'male' || g === 'm' || g === 'laki-laki' || g === 'l') return `Mr. ${clean}`;
  return clean;
}

export function normalizeStudentNameForMatch(name) {
  if (!name) return '';
  const stripped = stripHonorific(name);
  return stripped.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Smart conditional abbreviation for student names displayed in dense matrix tables (Class Hub Attendance Matrix, etc.).
 * Rule: "Kalau pendek, jangan disingkat".
 * - If cleanName.length <= maxChars (default 19), returns original cleanName intact.
 * - Pass 1: Common titles/prefixes:
 *     Muhammad/Muhamad/Mohammad/Mochammad/Moch./Muh. -> M.
 *     Lalu -> L.
 *     Baiq -> Bq.
 *     Raden Mas -> R.M.
 *     Raden Ajeng -> R.A.
 *     Raden -> R.
 *   If length <= maxChars, returns result.
 * - Pass 2: Compound religious prefixes (if still too long):
 *     Abdul / Abdur -> Abd.
 *   If length <= maxChars, returns result.
 * - Pass 3: Middle name initials (for names with >= 3 words still > maxChars):
 *     Abbreviates middle word(s) between primary name and last name to single letter initial with dot
 *     (e.g. "Adinda Karunia Farela" -> "Adinda K. Farela", "L. Yuda Handika Prawira" -> "L. Yuda H. Prawira").
 *   Stops as soon as length <= maxChars.
 * - Preserves original casing format via cleanStudentName.
 */
export function formatMatrixStudentName(name, maxChars = 19) {
  if (!name) return '';
  const clean = cleanStudentName(name).trim();
  if (!clean || clean.length <= maxChars) return clean;

  let current = clean;

  // Pass 1: Titles & Nobility / Religious Prefixes
  // Muhammad variants
  current = current.replace(/^(Muhammad|Muhamad|Mohammad|Mochammad|Moch\.?|Muh\.?)\s+/i, 'M. ');
  if (current.length <= maxChars) return current;

  // Lalu -> L.
  current = current.replace(/^Lalu\s+/i, 'L. ');
  if (current.length <= maxChars) return current;

  // Baiq -> Bq.
  current = current.replace(/^Baiq\s+/i, 'Bq. ');
  if (current.length <= maxChars) return current;

  // Raden Mas -> R.M.
  current = current.replace(/^Raden\s+Mas\s+/i, 'R.M. ');
  if (current.length <= maxChars) return current;

  // Raden Ajeng -> R.A.
  current = current.replace(/^Raden\s+Ajeng\s+/i, 'R.A. ');
  if (current.length <= maxChars) return current;

  // Raden -> R.
  current = current.replace(/^Raden\s+/i, 'R. ');
  if (current.length <= maxChars) return current;

  // Pass 2: Religious compound prefix (Abdul / Abdur -> Abd.)
  current = current.replace(/^(Abdul|Abdur)\s+/i, 'Abd. ');
  if (current.length <= maxChars) return current;

  // Pass 3: Middle Name Initializing
  const words = current.split(/\s+/);
  if (words.length >= 3) {
    const firstIsTitle = words[0].endsWith('.') || words[0].length <= 3;
    const middleStart = firstIsTitle ? 2 : 1;
    const middleEnd = words.length - 2;

    if (middleStart <= middleEnd) {
      for (let i = middleEnd; i >= middleStart; i--) {
        if (words[i].length > 2 || !words[i].endsWith('.')) {
          words[i] = words[i].charAt(0).toUpperCase() + '.';
          const candidate = words.join(' ');
          if (candidate.length <= maxChars) return candidate;
        }
      }
    }

    if (words.join(' ').length > maxChars && firstIsTitle && words.length >= 3 && words[1].length > 2) {
      words[1] = words[1].charAt(0).toUpperCase() + '.';
      const candidate = words.join(' ');
      if (candidate.length <= maxChars) return candidate;
    }

    current = words.join(' ');
  }

  return current;
}

/**
 * Konversi nomor level menjadi teks ordinal baku:
 * 1 -> 1st Level, 2 -> 2nd Level, 3 -> 3rd Level, 4 -> 4th Level, dst.
 * 0 -> Alumni
 * Jika short === true, memanggil toShortLevel: '1st', '2nd', '3rd', 'Alumni'
 */
export function toOrdinalLevel(num, short = false) {
  if (short) return toShortLevel(num);
  const n = parseInt(num, 10);
  if (isNaN(n)) return '1st Level';
  if (n === 0) return 'Alumni';
  if (n < 0) return '1st Level';
  const j = n % 10;
  const k = n % 100;
  let suffix = 'th';
  if (j === 1 && k !== 11) suffix = 'st';
  else if (j === 2 && k !== 12) suffix = 'nd';
  else if (j === 3 && k !== 13) suffix = 'rd';
  return `${n}${suffix} Level`;
}

/**
 * Format teks level ringkas khusus untuk tabel & badge di seluruh panel admin:
 * 1 -> '1st', 2 -> '2nd', 3 -> '3rd', 4 -> '4th'
 * 0, 'Alumni', 'Ex' -> 'Alumni'
 * Menormalisasi string seperti '1st Level', '2nd Level', 'Level 3', 'LVL 2' menjadi '1st', '2nd', '3rd'.
 */
export function toShortLevel(val) {
  if (val == null || val === '') return '—';
  const str = String(val).trim();
  if (!str || str === '—' || str === '-') return '—';

  const lower = str.toLowerCase();
  if (lower === 'alumni' || lower === 'ex' || lower === 'alumnus' || str === '0') {
    return 'Alumni';
  }

  let n = parseInt(str, 10);
  if (isNaN(n)) {
    const match = str.match(/\d+/);
    if (match) n = parseInt(match[0], 10);
  }

  if (isNaN(n) || n < 1) return str;

  const j = n % 10;
  const k = n % 100;
  let suffix = 'th';
  if (j === 1 && k !== 11) suffix = 'st';
  else if (j === 2 && k !== 12) suffix = 'nd';
  else if (j === 3 && k !== 13) suffix = 'rd';

  return `${n}${suffix}`;
}

/** Alias kompatibilitas mundur jika ada tampilan lama yang memanggil huruf */
export function toLevelLetter(num) {
  return toShortLevel(num);
}

if (typeof window !== 'undefined') {
  window.toShortLevel = toShortLevel;
  window.toOrdinalLevel = toOrdinalLevel;
  window.toLevelLetter = toLevelLetter;
}

const MOCK_BATCHES = [
  { id: 'bbbbbbbb-1111-1111-1111-111111111111', program_id: '22222222-2222-2222-2222-222222222222', name: 'Batch 2026-A' },
  { id: 'bbbbbbbb-1111-1111-1111-111111111112', program_id: '22222222-2222-2222-2222-222222222222', name: 'Batch 2026-B' }
];

const MOCK_STUDENTS = [
  { id: '55555555-5555-5555-5555-555555555555', institution_id: '11111111-1111-1111-1111-111111111111', program_id: '22222222-2222-2222-2222-222222222222', batch_id: 'bbbbbbbb-1111-1111-1111-111111111111', name: 'John Doe', gender: 'male', is_active: true, pin_hash: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4' }
];

export async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function isPlaceholderUrl() {
  return !SUPABASE_URL || SUPABASE_URL.includes('YOUR_PROJECT');
}

const _apiCache = new Map();
const DEFAULT_CACHE_TTL = 60 * 1000;

export function clearApiCache(prefix = null) {
  if (!prefix) {
    _apiCache.clear();
  } else {
    for (const key of _apiCache.keys()) {
      if (key.startsWith(prefix)) _apiCache.delete(key);
    }
  }
}

async function withCache(key, fetcher, ttl = DEFAULT_CACHE_TTL) {
  const cached = _apiCache.get(key);
  const now = Date.now();
  if (cached && (now - cached.timestamp < ttl)) {
    return Array.isArray(cached.data) ? [...cached.data] : { ...cached.data };
  }
  const data = await fetcher();
  _apiCache.set(key, { data, timestamp: now });
  return Array.isArray(data) ? [...data] : { ...data };
}

export async function testSupabaseConnection() {
  if (isPlaceholderUrl()) return { connected: false, error: 'Placeholder URL' };
  try {
    const sb = await getSupabase();
    const { error } = await sb.from('institutions').select('id').limit(1);
    return { connected: !error, error };
  } catch (e) {
    return { connected: false, error: e.message };
  }
}

export async function fetchInstitutions(forceRefresh = false) {
  if (forceRefresh) clearApiCache('institutions');
  return withCache('institutions', async () => {
    let list = MOCK_INSTITUTIONS;
    if (!isPlaceholderUrl()) {
      try {
        const sb = await getSupabase();
        const { data, error } = await sb.from('institutions')
          .select('id, name')
          .is('deleted_at', null)
          .eq('is_active', true)
          .order('name');
        if (error) throw error;
        if (data && data.length) list = data;
      } catch (e) {
        console.warn('Supabase fetch institutions failed, falling back to mock data:', e.message);
      }
    }
    return [...list].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  });
}

export async function fetchPrograms(institutionId, forceRefresh = false) {
  const cacheKey = `programs_${institutionId}`;
  if (forceRefresh) clearApiCache(cacheKey);
  return withCache(cacheKey, async () => {
    let list = MOCK_PROGRAMS.filter(c => c.institution_id === institutionId);
    if (!isPlaceholderUrl()) {
      try {
        const sb = await getSupabase();
        const { data, error } = await sb.from('programs')
          .select('id, name, institution_id, is_active')
          .eq('institution_id', institutionId)
          .is('deleted_at', null)
          .order('name');
        if (error) throw error;
        if (data && data.length) list = data;
      } catch (e) {
        console.warn('Supabase fetch programs failed, falling back to mock data:', e.message);
      }
    }
    return [...list].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  });
}

export async function fetchBatches(programId, forceRefresh = false, activeOnly = true) {
  const cacheKey = `batches_${programId}_${activeOnly}`;
  if (forceRefresh) clearApiCache(cacheKey);
  return withCache(cacheKey, async () => {
    let list = MOCK_BATCHES.filter(b => b.program_id === programId && (!activeOnly || b.is_active !== false));
    if (!isPlaceholderUrl()) {
      if (!programId || programId === 'undefined') {
        console.warn('Cannot fetch batches: programId is undefined');
        return [];
      }
      try {
        const sb = await getSupabase();
        let query = sb.from('batches')
          .select('id, name, program_id, current_level_id, is_active')
          .eq('program_id', programId)
          .is('deleted_at', null);
        if (activeOnly) {
          query = query.eq('is_active', true);
        }
        const { data, error } = await query.order('name');
        if (error) throw error;
        if (data && data.length) list = data;
      } catch (e) {
        console.warn('Supabase fetch batches failed, falling back to mock data:', e.message);
      }
    }
    return [...list].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  });
}

export async function fetchStudentsByProgram(programId, batchId = null, activeOnly = true) {
  let list = MOCK_STUDENTS.filter(s => s.program_id === programId && (!batchId || s.batch_id === batchId) && (!activeOnly || s.is_active !== false));
  if (!isPlaceholderUrl()) {
    try {
      const sb = await getSupabase();
      let query = sb.from('students')
        .select('id, name, gender, program_id, batch_id, is_active, batches!batch_id(id, is_active)')
        .eq('program_id', programId)
        .is('deleted_at', null);
      if (activeOnly) {
        query = query.eq('is_active', true);
      }
      if (batchId) {
        query = query.eq('batch_id', batchId);
      }
      const { data, error } = await query.order('name');
      if (error) throw error;
      if (data && data.length) {
        list = (activeOnly && !batchId)
          ? data.filter(s => !s.batches || s.batches.is_active !== false)
          : data;
      }
    } catch (e) {
      console.warn('Supabase fetch students failed, falling back to mock data:', e.message);
    }
  }
  return list.map(s => ({
    ...s,
    displayName: formatStudentName(s.name, s.gender),
    name: formatStudentName(s.name, s.gender),
    cleanName: cleanStudentName(s.name)
  })).sort((a, b) => {
    const nameA = cleanStudentName(a.name || a.displayName || '');
    const nameB = cleanStudentName(b.name || b.displayName || '');
    return nameA.localeCompare(nameB, undefined, { sensitivity: 'base', numeric: true });
  });
}

export async function verifyStudentLogin({ institutionId, programId, batchId, studentId, pin }) {
  if (isPlaceholderUrl()) {
    const student = MOCK_STUDENTS.find(s => s.id === studentId);
    if (!student) throw new Error('Student not found.');
    const pinHash = await sha256(pin);
    if (student.pin_hash !== pinHash) throw new Error('Invalid PIN. Please try again.');
    return {
      success: true,
      student: {
        id: student.id,
        name: formatStudentName(student.name, student.gender),
        gender: student.gender,
        batch_id: student.batch_id
      }
    };
  }

  try {
    const edgeRes = await callEdgeFunction('student-login', { institutionId, programId, batchId, studentId, pin });
    if (edgeRes) {
      const studentObj = edgeRes.student || {
        id: edgeRes.student_id,
        name: edgeRes.student_name,
        gender: edgeRes.gender || null,
        batch_id: edgeRes.batch_id || null
      };
      studentObj.name = formatStudentName(studentObj.name, studentObj.gender);
      edgeRes.student = studentObj;
      return edgeRes;
    }
  } catch (edgeFnError) {
    console.warn('Edge Function student-login unavailable, using direct DB fallback:', edgeFnError.message);
  }

  const sb = await getSupabase();
  const { data: student, error } = await sb
    .from('students')
    .select('id, name, gender, pin_hash, is_active, program_id, institution_id, batch_id')
    .eq('id', studentId)
    .single();

  if (error || !student) throw new Error('Student not found.');
  if (!student.is_active) throw new Error('This student account is inactive.');
  if (student.program_id !== programId) throw new Error('Student does not belong to the selected program.');
  if (student.institution_id !== institutionId) throw new Error('Student does not belong to the selected institution.');
  if (batchId && student.batch_id && student.batch_id !== batchId) {
    throw new Error('Student does not belong to the selected batch.');
  }

  const pinHash = await sha256(pin);
  if (student.pin_hash !== pinHash) throw new Error('Invalid PIN. Please try again.');

  return {
    success: true,
    student: {
      id: student.id,
      name: formatStudentName(student.name, student.gender),
      gender: student.gender,
      batch_id: student.batch_id
    }
  };
}

export async function updateStudentPin(studentId, oldPin, newPin) {
  if (!newPin || newPin.length < 4) throw new Error('PIN baru minimal harus 4 digit.');
  const sb = await getSupabase();
  const { data: student, error } = await sb.from('students').select('pin_hash').eq('id', studentId).single();
  if (error || !student) throw new Error('Student data not found.');

  const oldPinHash = await sha256(oldPin);
  if (student.pin_hash && student.pin_hash !== oldPinHash) {
    throw new Error('The old PIN you entered is incorrect.');
  }

  const newPinHash = await sha256(newPin);
  const { error: updateErr } = await sb.from('students')
    .update({ pin_hash: newPinHash, updated_at: new Date().toISOString() })
    .eq('id', studentId);

  if (updateErr) throw updateErr;
  return { success: true };
}

export async function updateStudentGender(studentId, gender) {
  const g = (gender || '').toLowerCase().trim();
  if (g !== 'male' && g !== 'female') {
    throw new Error('Invalid gender selection. Choose Male or Female.');
  }

  const sb = await getSupabase();
  const { data: st, error: fetchErr } = await sb.from('students').select('name').eq('id', studentId).single();
  if (fetchErr) throw fetchErr;

  const rawClean = cleanStudentName(st?.name);
  const formattedName = formatStudentName(rawClean, g);

  const { error } = await sb.from('students')
    .update({ gender: g, name: formattedName, updated_at: new Date().toISOString() })
    .eq('id', studentId);

  if (error) throw error;
  return { success: true, gender: g, formattedName };
}

export async function updateStudentBirthday(studentId, birthDate) {
  if (!birthDate) throw new Error('Birth date is required');
  const sb = await getSupabase();
  const { error } = await sb.from('students').update({ birth_date: birthDate, updated_at: new Date().toISOString() }).eq('id', studentId);
  if (error) throw error;
  return { success: true };
}

export async function updateStudentEducation(studentId, educationLevel) {
  if (!educationLevel) throw new Error('Education level is required');
  const sb = await getSupabase();
  const { error } = await sb.from('students').update({ education: educationLevel, updated_at: new Date().toISOString() }).eq('id', studentId);
  if (error) throw error;
  return { success: true };
}

export async function uploadStudentPhoto(studentId, photoBase64OrUrl) {
  const sb = await getSupabase();
  const { error } = await sb.from('students')
    .update({ photo_url: photoBase64OrUrl, photo_status: 'set', updated_at: new Date().toISOString() })
    .eq('id', studentId);
  if (error) throw error;
  return { success: true };
}

// ============================================================
// STUDENT DASHBOARD & CURRICULUM
// ============================================================

export async function fetchStudentClasses(programId, institutionId, levelId = null) {
  const sb = await getSupabase();
  try {
    let query = sb.from('classes')
      .select('id, name, code, description, level_id, levels!classes_level_id_fkey(level_number, name)')
      .is('deleted_at', null)
      .eq('is_active', true)
      .order('name');
    if (programId) query = query.eq('program_id', programId);

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) return [];

    if (!levelId) return data;

    // Determine student level number
    const { data: lvlData } = await sb.from('levels').select('level_number').eq('id', levelId).single();
    if (!lvlData || typeof lvlData.level_number !== 'number') {
      return data;
    }

    const studentLevelNum = lvlData.level_number;
    // Level 0 (Alumni) receives Lifetime Universal Access across all program classes
    if (studentLevelNum === 0) {
      return data;
    }

    // Strict Level Isolation: Only return classes assigned to the student's current level
    return data.filter(c => {
      if (c.level_id === levelId) return true;
      const cLvlNum = c.levels?.level_number;
      if (cLvlNum != null && studentLevelNum != null) {
        return cLvlNum === studentLevelNum;
      }
      return false;
    });
  } catch (e) {
    console.warn('Classes query note:', e.message);
  }
  return [];
}

export async function fetchLevels(classId) {
  const sb = await getSupabase();
  const { data, error } = await sb.from('levels')
    .select('id, name, level_number')


    .order('level_number');
  if (error) throw error;
  return data;
}

export async function fetchStudentProgress(studentId) {
  const sb = await getSupabase();
  const { data, error } = await sb
    .from('progress')
    .select('id, student_id, class_id, unlocked_level, highest_score, level_status, level_completed_at, updated_at')
    .eq('student_id', studentId);
  if (error) {
    console.error('Progress fetch error:', error);
    return [];
  }
  return data || [];
}

export async function fetchTestsForStudentClass(programId, classId, institutionId, levelId) {
  const sb = await getSupabase();
  let query = sb.from('tests')
    .select('id, title, shell_code, payload, display_name, test_subtype, test_type, class_id, level_id, display_order, status, minimum_required_score, prerequisite_test_id, prerequisite_id, working_duration_minutes, schedule_mode, levels(id, name, level_number)')
    .eq('class_id', classId)
    .eq('status', 'PUBLISHED')
    .is('deleted_at', null)
    .order('display_order', { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.warn('fetchTestsForStudentClass notice:', error.message);
    return [];
  }

  let results = (data || []).map(a => ({
    ...a,
    prerequisite_id: a.prerequisite_test_id || a.prerequisite_id,
    prerequisite_test_id: a.prerequisite_test_id || a.prerequisite_id
  }));

  if (levelId) {
    const { data: lvlData } = await sb.from('levels').select('level_number').eq('id', levelId).single();
    if (lvlData && typeof lvlData.level_number === 'number') {
      const maxLvl = lvlData.level_number;
      // Alumni (Level 0) has Universal Access to all published tests in their program
      if (maxLvl > 0) {
        results = results.filter(a => !a.levels || typeof a.levels.level_number !== 'number' || a.levels.level_number <= maxLvl);
      }
    } else {
      results = results.filter(a => a.level_id === levelId);
    }
  }

  return results;
}

export async function fetchTestsForStudentLevel(programId, levelId, institutionId) {
  const sb = await getSupabase();
  let query = sb.from('tests')
    .select('id, title, shell_code, display_name, test_subtype, test_type, class_id, level_id, display_order, status, minimum_required_score, prerequisite_test_id, prerequisite_id, working_duration_minutes, schedule_mode, deleted_at, levels(id, name, level_number)')
    .eq('level_id', levelId)
    .eq('status', 'PUBLISHED')
    .is('deleted_at', null)
    .order('title');

  if (institutionId) query = query.eq('institution_id', institutionId);

  try {
    const { data, error } = await query;
    if (!error && data) {
      return data.map(a => ({
        ...a,
        prerequisite_id: a.prerequisite_test_id || a.prerequisite_id,
        prerequisite_test_id: a.prerequisite_test_id || a.prerequisite_id
      }));
    }
  } catch (_) {}
  return [];
}

export async function fetchAllStudentAttempts(studentId) {
  if (!studentId) return [];
  const sb = await getSupabase();
  try {
    await sb.rpc('auto_close_expired_attempts');
  } catch (_) {}
  const { data, error } = await sb.from('attempts')
    .select('id, test_id, score, percentage, effective_score, is_remedial_unlocked, is_remedial, is_forgiven, grade, status, is_best_score, submitted_at, tests(id, title, test_type, category, test_subtype, shell_code, payload, deleted_at, status, classes(name))')
    .eq('student_id', studentId)
    .in('status', ['submitted', 'auto_submitted', 'evaluated', 'SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED'])
    .order('submitted_at', { ascending: false });

  if (!error) return data || [];

  // Fallback 2-step jika foreign key cache Supabase belum sinkron
  const { data: attempts, error: attErr } = await sb.from('attempts')
    .select('id, test_id, score, percentage, effective_score, is_remedial_unlocked, is_remedial, is_forgiven, grade, status, is_best_score, submitted_at')
    .eq('student_id', studentId)
    .in('status', ['submitted', 'auto_submitted', 'evaluated', 'SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED'])
    .order('submitted_at', { ascending: false });

  if (attErr || !attempts) return [];

  const testIds = [...new Set(attempts.map(a => a.test_id).filter(Boolean))];
  let testMap = {};
  if (testIds.length > 0) {
    const { data: asmData } = await sb.from('tests').select('id, title, test_type, category, test_subtype, shell_code, payload, deleted_at, status, classes(name)').in('id', testIds);
    if (asmData) asmData.forEach(a => { testMap[a.id] = a; });
  }

  return attempts.map(att => ({
    ...att,
    tests: testMap[att.test_id] || null
  }));
}

export async function fetchStudentAttemptsForTest(studentId, testId) {
  if (!studentId || !testId) return [];
  const sb = await getSupabase();
  const { data, error } = await sb.from('attempts')
    .select('id, status, score, percentage, effective_score, is_remedial_unlocked, is_remedial, is_forgiven, grade, submitted_at')
    .eq('student_id', studentId)
    .eq('test_id', testId)
    .in('status', ['submitted', 'auto_submitted', 'evaluated', 'SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED'])
    .order('percentage', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ============================================================
// TEST SYSTEM SETTINGS & REPETITIVE MASTERY CONFIGURATION
// ============================================================

export async function fetchClassTestSettings(classId = null) {
  const sb = await getSupabase();
  const defaultSettings = {
    taskRepetitions: 7,
    taskMinScore: 50,
    examMinScore: 60
  };

  const getLocal = (k) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) return window.localStorage.getItem(k);
      if (typeof localStorage !== 'undefined') return localStorage.getItem(k);
    } catch (_) {}
    return null;
  };

  const setLocal = (k, v) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) window.localStorage.setItem(k, v);
      else if (typeof localStorage !== 'undefined') localStorage.setItem(k, v);
    } catch (_) {}
  };

  try {
    const keys = ['default_test_system_settings'];
    if (classId) keys.push(`class_test_settings_${classId}`);

    const { data, error } = await sb.from('site_settings')
      .select('key, value')
      .in('key', keys);

    if (!error && data && data.length > 0) {
      const map = Object.fromEntries(data.map(r => [r.key, r.value]));
      let raw = (classId && map[`class_test_settings_${classId}`]) || map['default_test_system_settings'];
      if (raw) {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        const res = {
          taskRepetitions: Math.max(1, parseInt(parsed.taskRepetitions, 10) || 7),
          taskMinScore: Math.min(100, Math.max(1, parseInt(parsed.taskMinScore, 10) || 50)),
          examMinScore: Math.min(100, Math.max(1, parseInt(parsed.examMinScore, 10) || 60))
        };
        if (classId) setLocal(`topscore_test_settings_${classId}`, JSON.stringify(res));
        return res;
      }
    }
  } catch (e) {
    console.warn('[fetchClassTestSettings] site_settings query error, falling back:', e);
  }

  // Fallback 1: LocalStorage cache
  if (classId) {
    const local = getLocal(`topscore_test_settings_${classId}`);
    if (local) {
      try { return { ...defaultSettings, ...JSON.parse(local) }; } catch (_) {}
    }
  }
  const globalLocal = getLocal('topscore_test_settings_global');
  if (globalLocal) {
    try { return { ...defaultSettings, ...JSON.parse(globalLocal) }; } catch (_) {}
  }

  // Fallback 2: Inspect existing class tests from DB
  if (classId) {
    try {
      const { data: sampleTests } = await sb.from('tests')
        .select('payload, minimum_required_score, test_type, shell_code, title')
        .eq('class_id', classId)
        .is('deleted_at', null)
        .limit(15);

      if (sampleTests && sampleTests.length > 0) {
        const sampleTask = sampleTests.find(t => !isWeeklyExam(t));
        const sampleExam = sampleTests.find(t => isWeeklyExam(t));
        const derived = {
          taskRepetitions: Math.max(1, parseInt(sampleTask?.payload?.task_repetitions, 10) || 7),
          taskMinScore: Math.min(100, Math.max(1, parseInt(sampleTask?.minimum_required_score || sampleTask?.payload?.minimum_required_score, 10) || 50)),
          examMinScore: Math.min(100, Math.max(1, parseInt(sampleExam?.minimum_required_score || sampleExam?.payload?.minimum_required_score, 10) || 60))
        };
        setLocal(`topscore_test_settings_${classId}`, JSON.stringify(derived));
        return derived;
      }
    } catch (_) {}
  }

  return defaultSettings;
}

export async function saveClassTestSettings(classId, settings = {}, applyToExisting = false) {
  const sb = await getSupabase();
  const cleanSettings = {
    taskRepetitions: Math.max(1, parseInt(settings.taskRepetitions, 10) || 7),
    taskMinScore: Math.min(100, Math.max(1, parseInt(settings.taskMinScore, 10) || 50)),
    examMinScore: Math.min(100, Math.max(1, parseInt(settings.examMinScore, 10) || 60))
  };
  const payloadStr = JSON.stringify(cleanSettings);

  const isGlobal = settings.isGlobal || !classId;
  const key = isGlobal ? 'default_test_system_settings' : `class_test_settings_${classId}`;

  const setLocal = (k, v) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) window.localStorage.setItem(k, v);
      else if (typeof localStorage !== 'undefined') localStorage.setItem(k, v);
    } catch (_) {}
  };

  // 1. Save to localStorage cache
  if (isGlobal) {
    setLocal('topscore_test_settings_global', payloadStr);
  }
  if (classId) {
    setLocal(`topscore_test_settings_${classId}`, payloadStr);
  }

  // 2. Try saving to site_settings (for production / authenticated)
  try {
    const { error } = await sb.from('site_settings').upsert({
      key,
      value: payloadStr,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });

    if (error) {
      console.warn('[saveClassTestSettings] site_settings upsert note:', error.message);
    }
  } catch (err) {
    console.warn('[saveClassTestSettings] Error:', err);
  }

  // 3. Persist into tests table for this class
  let updatedCount = 0;
  if (classId) {
    try {
      const { data: classTests } = await sb.from('tests')
        .select('id, test_type, category, shell_code, title, payload')
        .eq('class_id', classId)
        .is('deleted_at', null);

      if (classTests && classTests.length > 0) {
        for (const t of classTests) {
          const isExamTest = isWeeklyExam(t);
          const newScore = isExamTest ? cleanSettings.examMinScore : cleanSettings.taskMinScore;
          const updatedPayload = {
            ...(t.payload || {}),
            minimum_required_score: newScore,
            min_score: newScore,
            task_repetitions: cleanSettings.taskRepetitions
          };

          const updateFields = {
            payload: updatedPayload
          };
          if (applyToExisting) {
            updateFields.minimum_required_score = newScore;
          }

          await sb.from('tests').update(updateFields).eq('id', t.id);
          updatedCount++;
        }
      }
      clearApiCache('tests');
    } catch (err) {
      console.error('[saveClassTestSettings] Failed to apply to tests:', err);
    }
  }

  return { success: true, settings: cleanSettings, updatedCount };
}

export async function updateTestPassingScore(testId, newScore) {
  if (!testId) throw new Error('testId is required');
  const validScore = Math.min(Math.max(parseInt(newScore, 10) || 60, 1), 100);
  const sb = await getSupabase();

  const { data: t } = await sb.from('tests').select('id, payload').eq('id', testId).single();
  const updatedPayload = { ...(t?.payload || {}), minimum_required_score: validScore, min_score: validScore };

  const { error } = await sb.from('tests').update({
    minimum_required_score: validScore,
    payload: updatedPayload
  }).eq('id', testId);

  if (error) throw error;
  clearApiCache('tests');
  return { success: true, newScore: validScore };
}

/**
 * Fetches pass counts for tasks completed by a student.
 * Dynamically evaluates against class-configured task repetitions and minimum score.
 *
 * @param {string} studentId
 * @param {string|null} classId
 * @returns {Promise<Record<string, number>>} Map of test_id -> passCount
 */
export async function fetchStudentTaskPassCounts(studentId, classId = null) {
  if (!studentId) return {};
  const sb = await getSupabase();
  const testSettings = await fetchClassTestSettings(classId);
  const targetReps = Number(testSettings?.taskRepetitions) || 7;
  const taskMinScore = Number(testSettings?.taskMinScore) || 50;

  let query = sb.from('attempts')
    .select('test_id, percentage, effective_score, score, status, is_forgiven, tests!inner(id, class_id, test_type, category, test_subtype, minimum_required_score, payload)')
    .eq('student_id', studentId)
    .in('status', ['submitted', 'auto_submitted', 'evaluated', 'SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED']);

  if (classId) {
    query = query.eq('tests.class_id', classId);
  }

  const { data, error } = await query;
  if (error || !data) {
    // Fallback: fetch attempts directly without inner join
    const { data: fallbackAtts } = await sb.from('attempts')
      .select('test_id, percentage, effective_score, score, status, is_forgiven')
      .eq('student_id', studentId)
      .in('status', ['submitted', 'auto_submitted', 'evaluated', 'SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED']);
    const passCounts = {};
    for (const a of (fallbackAtts || [])) {
      if (!a.test_id) continue;
      if (a.is_forgiven) {
        passCounts[a.test_id] = Math.max(passCounts[a.test_id] || 0, targetReps);
      } else {
        const pct = a.effective_score != null ? Number(a.effective_score) : parseFloat(a.percentage ?? a.score ?? 0);
        if (pct >= taskMinScore) {
          passCounts[a.test_id] = (passCounts[a.test_id] || 0) + 1;
        }
      }
    }
    return passCounts;
  }

  const passCounts = {};
  for (const a of data) {
    if (!a.test_id) continue;
    if (a.is_forgiven) {
      passCounts[a.test_id] = Math.max(passCounts[a.test_id] || 0, targetReps);
    } else {
      const minReq = Number(a.tests?.minimum_required_score || a.tests?.payload?.min_score || taskMinScore);
      const pct = a.effective_score != null ? Number(a.effective_score) : parseFloat(a.percentage ?? a.score ?? 0);
      if (pct >= minReq) {
        passCounts[a.test_id] = (passCounts[a.test_id] || 0) + 1;
      }
    }
  }
  return passCounts;
}

// ============================================================
// TEST EXECUTION (RUNNER)
// ============================================================

export async function generateTestQuestions(sb, test) {
  let questions = [];
  if (test.payload && test.payload.is_dynamic_shell) {
    const themeCode = test.payload.theme_code;
    const topicCode = test.payload.topic_code;
    const themes = test.payload.themes;
    const titleParts = (test.title || '').split(' - ');
    const titleTopic = titleParts.length > 1 ? titleParts[1].trim() : null;

    let levelNum = 1;
    if (test.level_id) {
      const { data: levelRec } = await sb.from('levels').select('level_number').eq('id', test.level_id).single();
      if (levelRec?.level_number) levelNum = levelRec.level_number;
    }

    const isThemeTest = (test.category === 'EXAM' || test.category === 'TEST' || String(test.test_type).toLowerCase() === 'exam' || (test.shell_code && (test.shell_code.includes('-EXAM') || test.shell_code.includes('-TEST'))) || test.test_subtype === 'VOCAB_EXAM' || test.test_subtype === 'PHRASE_EXAM' || test.test_subtype === 'VOCAB_TEST' || test.test_subtype === 'PHRASE_TEST') && !topicCode;
    let testProgramId = test.program_id || test.programId;
    if (!testProgramId && test.class_id) {
      try {
        const { data: cRec } = await sb.from('classes').select('program_id').eq('id', test.class_id).maybeSingle();
        if (cRec?.program_id) testProgramId = cRec.program_id;
      } catch (_) {}
    }

    // Resilient vocabulary query: try with category column first, fallback without category column
    let vaultData = null;
    try {
      let query = sb.from('vocabulary_vault')
        .select('id, english, indonesian, word_type, topic, topic_code, theme, theme_code, target_level, category')
        .is('deleted_at', null)
        .eq('target_level', levelNum)
        .range(0, 4999);
      if (testProgramId) query = query.eq('program_id', testProgramId);
      if (topicCode) {
        if (themeCode) query = query.eq('theme_code', themeCode);
        const candidateCodes = [
          String(topicCode).toUpperCase(),
          (/^[0-9]+$/.test(String(topicCode)) && themeCode) ? `${String(themeCode).toUpperCase()}${topicCode}` : null,
          String(topicCode).replace(/^[A-Za-z]/, ''),
          (levelNum && themeCode && /^[0-9]+$/.test(String(topicCode))) ? `${levelNum}${String(themeCode).toUpperCase()}${topicCode}` : null,
          (levelNum && themeCode) ? `${levelNum}${String(themeCode).toUpperCase()}${String(topicCode).replace(/^[A-Za-z]/, '')}` : null
        ].filter(Boolean);
        query = query.in('topic_code', candidateCodes);
      } else if (themes && Array.isArray(themes) && themes.length > 0) {
        query = query.in('theme_code', themes);
      } else if (isThemeTest && themeCode) {
        const allThemes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        const idx = allThemes.indexOf(String(themeCode).toUpperCase());
        if (idx !== -1) {
          const targetThemes = allThemes.slice(0, idx + 1);
          query = query.in('theme_code', targetThemes);
        } else {
          query = query.eq('theme_code', themeCode);
        }
      } else if (themeCode) {
        query = query.eq('theme_code', themeCode);
      }
      const res = await query;
      if (!res.error && res.data && res.data.length > 0) {
        vaultData = res.data;
      }
    } catch (_) {}

    if (!vaultData || vaultData.length === 0) {
      // Fallback query without category column (resilient across DB schemas)
      let queryNoCat = sb.from('vocabulary_vault')
        .select('id, english, indonesian, word_type, topic, topic_code, theme, theme_code, target_level')
        .is('deleted_at', null)
        .eq('target_level', levelNum)
        .range(0, 4999);
      if (testProgramId) queryNoCat = queryNoCat.eq('program_id', testProgramId);
      if (topicCode) {
        if (themeCode) queryNoCat = queryNoCat.eq('theme_code', themeCode);
        const candidateCodes = [
          String(topicCode).toUpperCase(),
          (/^[0-9]+$/.test(String(topicCode)) && themeCode) ? `${String(themeCode).toUpperCase()}${topicCode}` : null,
          String(topicCode).replace(/^[A-Za-z]/, ''),
          (levelNum && themeCode && /^[0-9]+$/.test(String(topicCode))) ? `${levelNum}${String(themeCode).toUpperCase()}${topicCode}` : null,
          (levelNum && themeCode) ? `${levelNum}${String(themeCode).toUpperCase()}${String(topicCode).replace(/^[A-Za-z]/, '')}` : null
        ].filter(Boolean);
        queryNoCat = queryNoCat.in('topic_code', candidateCodes);
      } else if (themes && Array.isArray(themes) && themes.length > 0) {
        queryNoCat = queryNoCat.in('theme_code', themes);
      } else if (isThemeTest && themeCode) {
        const allThemes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        const idx = allThemes.indexOf(String(themeCode).toUpperCase());
        if (idx !== -1) {
          queryNoCat = queryNoCat.in('theme_code', allThemes.slice(0, idx + 1));
        } else {
          queryNoCat = queryNoCat.eq('theme_code', themeCode);
        }
      } else if (themeCode) {
        queryNoCat = queryNoCat.eq('theme_code', themeCode);
      }
      const res2 = await queryNoCat;
      if (!res2.error && res2.data) {
        vaultData = res2.data.map(w => {
          const wt = (w.word_type || '').toLowerCase();
          const isPhrase = ['expression', 'idiom', 'proverb', 'phrase'].includes(wt);
          return { ...w, category: isPhrase ? 'phrases' : 'words' };
        });
      }
    }

    if ((!vaultData || vaultData.length === 0) && titleTopic) {
      try {
        let topicNameQuery = sb.from('vocabulary_vault')
          .select('id, english, indonesian, word_type, topic, topic_code, theme, theme_code, target_level')
          .is('deleted_at', null)
          .eq('target_level', levelNum)
          .ilike('topic', `%${titleTopic}%`)
          .range(0, 4999);
        if (testProgramId) topicNameQuery = topicNameQuery.eq('program_id', testProgramId);
        const resTopic = await topicNameQuery;
        if (!resTopic.error && resTopic.data && resTopic.data.length > 0) {
          vaultData = resTopic.data.map(w => {
            const wt = (w.word_type || '').toLowerCase();
            const isPhrase = ['expression', 'idiom', 'proverb', 'phrase'].includes(wt);
            return { ...w, category: isPhrase ? 'phrases' : 'words' };
          });
        }
      } catch (_) {}
    }

    let vaultWords = vaultData || [];
    const category = test.payload?.category || 'vocab';
    const isUnified = category === 'all' ||
                      category === 'unified' ||
                      test.payload?.is_unified === true ||
                      test.payload?.is_unified_test === true ||
                      test.test_subtype === 'UNIFIED_TEST';

    const fisherYates = (arr) => {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };

    const orderSetting = String(test.question_order || test.payload?.question_order || 'random').toLowerCase();

    if (isUnified) {
      // TWO-STAGE SHUFFLING:
      // Stage 1: Words only (shuffled independently)
      let wordsPool = vaultWords.filter(w => {
        const wt = (w.word_type || '').toLowerCase();
        return !['expression', 'idiom', 'proverb', 'phrase'].includes(wt);
      });
      // Stage 2: Phrases only (shuffled independently)
      let phrasesPool = vaultWords.filter(w => {
        const wt = (w.word_type || '').toLowerCase();
        return ['expression', 'idiom', 'proverb', 'phrase'].includes(wt);
      });

      if (orderSetting === 'random') {
        fisherYates(wordsPool);
        fisherYates(phrasesPool);
      } else {
        wordsPool.sort((a, b) => (a.indonesian || '').localeCompare(b.indonesian || ''));
        phrasesPool.sort((a, b) => (a.indonesian || '').localeCompare(b.indonesian || ''));
      }

      const taggedWords = wordsPool.map(w => ({ ...w, test_section: 'words', section_label: 'Part 1: Words' }));
      const taggedPhrases = phrasesPool.map(p => ({ ...p, test_section: 'phrases', section_label: 'Part 2: Phrases' }));

      vaultWords = [...taggedWords, ...taggedPhrases];
    } else {
      vaultWords = vaultWords.filter(w => {
        const wt = (w.word_type || '').toLowerCase();
        const isPhrase = ['expression', 'idiom', 'proverb', 'phrase'].includes(wt);
        return category === 'phrases' ? isPhrase : !isPhrase;
      });

      // Secondary Safety Fallback:
      // STRICT TASK ISOLATION & ANTI CROSS-POLLINATION:
      // Specific topic tasks must NEVER blindly pull words from other topics across the entire level!
      const isTopicSpecificTask = Boolean(topicCode || (!isThemeTest && titleTopic));
      if (vaultWords.length === 0) {
        if (isTopicSpecificTask && titleTopic) {
          let topicQuery = sb.from('vocabulary_vault')
            .select('id, english, indonesian, word_type, topic, topic_code, theme, theme_code, target_level')
            .is('deleted_at', null)
            .eq('target_level', levelNum)
            .ilike('topic', `%${titleTopic}%`);
          if (testProgramId) topicQuery = topicQuery.eq('program_id', testProgramId);
          const { data: topicFallback } = await topicQuery.limit(100);
          if (topicFallback && topicFallback.length > 0) {
            vaultWords = topicFallback.filter(w => {
              const wt = (w.word_type || '').toLowerCase();
              const isPhrase = ['expression', 'idiom', 'proverb', 'phrase'].includes(wt);
              return category === 'phrases' ? isPhrase : !isPhrase;
            });
          }
        }

        // Only fallback to level-wide general words if this is a theme exam or level exam (never for single-topic tasks!)
        if (vaultWords.length === 0 && !isTopicSpecificTask) {
          console.warn(`[Vault Fallback] 0 words for theme ${themeCode}/topic ${topicCode}, pulling general level ${levelNum} vault items.`);
          let generalVaultQuery = sb.from('vocabulary_vault')
            .select('id, english, indonesian, word_type, topic, topic_code, theme, theme_code, target_level')
            .is('deleted_at', null)
            .eq('target_level', levelNum);
          if (testProgramId) generalVaultQuery = generalVaultQuery.eq('program_id', testProgramId);
          const { data: generalVault } = await generalVaultQuery.limit(100);
          if (generalVault && generalVault.length > 0) {
            vaultWords = generalVault.filter(w => {
              const wt = (w.word_type || '').toLowerCase();
              const isPhrase = ['expression', 'idiom', 'proverb', 'phrase'].includes(wt);
              return category === 'phrases' ? isPhrase : !isPhrase;
            });
          }
        }
      }

      if (orderSetting === 'random') {
        fisherYates(vaultWords);
      } else {
        vaultWords.sort((a, b) => (a.indonesian || '').localeCompare(b.indonesian || ''));
      }
    }

    // Safety clamp: strictly respect configured total questions bounds (e.g. 40 for task, 120 for exam)
    const maxTargetQuestions = test.payload?.total_questions || test.total_questions;
    if (maxTargetQuestions && Number(maxTargetQuestions) > 0 && vaultWords.length > Number(maxTargetQuestions)) {
      vaultWords = vaultWords.slice(0, Number(maxTargetQuestions));
    }

    if (vaultWords && vaultWords.length > 0) {
      let allEnglishAnswers = [];
      let typeDistractorPools = {};
      const ansType = test.answer_type || test.payload?.answer_type || (test.test_subtype === 'PHRASE_TEST' ? 'selection' : 'spoken');

      if (ansType.startsWith('dropdown') || ansType === 'multiple_choice' || ansType === 'selection') {
        let allDataQuery = sb.from('vocabulary_vault').select('english, word_type').is('deleted_at', null);
        if (testProgramId) allDataQuery = allDataQuery.eq('program_id', testProgramId);
        const { data: allData } = await allDataQuery;
        if (allData) {
          const isTargetPhrase = (category === 'phrases' || test.test_subtype === 'PHRASE_TASK' || test.test_subtype === 'PHRASE_TEST');
          const filteredAllData = allData.filter(r => {
            const wt = (r.word_type || '').toLowerCase();
            const isP = ['expression', 'idiom', 'proverb', 'phrase'].includes(wt);
            return isTargetPhrase ? isP : !isP;
          });
          allEnglishAnswers = filteredAllData.map(r => (r.english || '').split('/')[0].trim()).filter(Boolean);
          filteredAllData.forEach(r => {
            const wt = (r.word_type || 'Vocab').toLowerCase();
            const eng = (r.english || '').split('/')[0].trim();
            if (!eng) return;
            if (!typeDistractorPools[wt]) typeDistractorPools[wt] = [];
            typeDistractorPools[wt].push(eng);
          });
        }
      }

      questions = vaultWords.map((vw, idx) => {
        const accepted = vw.english ? vw.english.split('/').map(s => s.trim()) : [];
        const correctAns = accepted[0] || 'N/A';
        let optionsSnapshot = [];

        if (ansType.startsWith('dropdown') || ansType === 'multiple_choice' || ansType === 'selection') {
          const numDistractors = (ansType === 'dropdown_10') ? 9 : 4;
          const wordType = (vw.word_type || 'Vocab').toLowerCase();
          let sameTypePool = (typeDistractorPools[wordType] || []).filter(a => !accepted.includes(a));
          fisherYates(sameTypePool);
          const globalPool = allEnglishAnswers.filter(a => !accepted.includes(a) && !sameTypePool.includes(a));
          fisherYates(globalPool);
          const distractors = [...sameTypePool, ...globalPool].slice(0, numDistractors);
          optionsSnapshot = fisherYates([correctAns, ...distractors]);
        }

        return {
          question_id: vw.id,
          question_text_snapshot: vw.indonesian || 'N/A',
          accepted_answers_snapshot: accepted,
          options_snapshot: optionsSnapshot,
          topic_snapshot: vw.topic || vw.topic_code || 'General',
          theme_snapshot: vw.theme || vw.theme_code || test.payload?.theme_code || 'General',
          theme_code: vw.theme_code || test.payload?.theme_code,
          category_snapshot: vw.category || category,
          word_type_snapshot: vw.word_type,
          display_order: idx + 1,
          answer_type: ansType,
          test_section: vw.test_section || null,
          section_label: vw.section_label || null
        };
      });
    }
  } else {
    const { data } = await sb.from('test_items')
      .select('id, question_id, question_text_snapshot, word_type_snapshot, options_snapshot, topic_snapshot, display_order, answer_type')
      .eq('test_id', test.id)
      .order('display_order');
    questions = data || [];
  }
  return questions;
}

export function enrichTestSections(result) {
  if (!result || !result.answers || !Array.isArray(result.answers) || result.answers.length === 0) {
    return result;
  }

  // If valid sections with more than 1 item are already provided, keep them
  if (Array.isArray(result.sections) && result.sections.length > 1) {
    return result;
  }

  const answers = result.answers;
  // 1. Check for multiple themes (e.g. cumulative exam with Theme A, B, C, D)
  const themeCodes = [...new Set(answers.map(a => {
    const snap = (typeof a.question_snapshot === 'string')
      ? (() => { try { return JSON.parse(a.question_snapshot); } catch(_) { return {}; } })()
      : (a.question_snapshot || {});
    return snap?.theme_code;
  }).filter(Boolean))].sort();

  if (themeCodes.length > 1) {
    const themeNameMap = {
      'A': 'Workplace & Business',
      'B': 'Tourism & Hospitality',
      'C': 'Culture & Expressions',
      'D': 'Advanced & Academic'
    };
    const safeParseSnap = (snap) => {
      if (!snap) return {};
      if (typeof snap !== 'string') return snap;
      try { return JSON.parse(snap); } catch (_) { return {}; }
    };
    result.sections = themeCodes.map((tc, idx) => {
      const sampleSnap = answers.map(a => safeParseSnap(a.question_snapshot)).find(s => s?.theme_code === tc);
      const themeTitle = sampleSnap?.theme ? `Theme ${tc}: ${sampleSnap.theme}` : `Theme ${tc}: ${themeNameMap[tc] || `Section ${idx + 1}`}`;
      return {
        id: `theme_${tc}`,
        title: themeTitle,
        section_order: idx + 1
      };
    });
    // Tag each question snapshot with section_id
    answers.forEach(a => {
      let snap = a.question_snapshot;
      let isStr = false;
      if (typeof snap === 'string') {
        isStr = true;
        try { snap = JSON.parse(snap); } catch(_) { snap = {}; }
      }
      if (snap?.theme_code) {
        snap.section_id = `theme_${snap.theme_code}`;
        a.question_snapshot = isStr ? JSON.stringify(snap) : snap;
      }
    });
    return result;
  }

  // 2. Check for combined Words and Phrases
  const safeParseSnap = (snap) => {
    if (!snap) return {};
    if (typeof snap !== 'string') return snap;
    try { return JSON.parse(snap); } catch (_) { return {}; }
  };
  const hasWordsAndPhrases = answers.some(a => {
    const snap = safeParseSnap(a.question_snapshot);
    return snap?.test_section === 'words';
  }) && answers.some(a => {
    const snap = safeParseSnap(a.question_snapshot);
    return snap?.test_section === 'phrases';
  });

  if (hasWordsAndPhrases) {
    result.sections = [
      { id: 'words', title: 'Part 1: Words', section_order: 1 },
      { id: 'phrases', title: 'Part 2: Phrases', section_order: 2 }
    ];
    answers.forEach(a => {
      let snap = a.question_snapshot;
      let isStr = false;
      if (typeof snap === 'string') {
        isStr = true;
        try { snap = JSON.parse(snap); } catch(_) { snap = {}; }
      }
      if (snap?.test_section === 'phrases') {
        snap.section_id = 'phrases';
      } else if (snap?.test_section === 'words') {
        snap.section_id = 'words';
      }
      a.question_snapshot = isStr ? JSON.stringify(snap) : snap;
    });
    return result;
  }

  // 3. Fallback: Single Default Section
  result.sections = [{ id: 'default', title: result.test?.title || result.test?.name || 'Test', section_order: 1 }];
  return result;
}

export async function startTest(studentId, testId) {
  try {
    const edgeRes = await callEdgeFunction('start-test', { student_id: studentId, test_id: testId });
    if (edgeRes && edgeRes.attempt) {
      return enrichTestSections(edgeRes);
    }
    return edgeRes;
  } catch (edgeErr) {
    if (
      edgeErr.code === 'LOCKED_BY_TUTOR' ||
      edgeErr.message?.includes('LOCKED_BY_TUTOR') ||
      edgeErr.message?.includes('Prerequisite not completed') ||
      edgeErr.message?.includes('PREREQUISITE') ||
      edgeErr.message?.includes('not eligible') ||
      edgeErr.message?.includes('not available') ||
      edgeErr.message?.includes('not published') ||
      edgeErr.message?.includes('draft') ||
      edgeErr.message?.includes('Draft') ||
      edgeErr.message?.includes('DRAFT') ||
      edgeErr.code === 'TEST_NOT_PUBLISHED' ||
      edgeErr.code === 'PREREQUISITE_NOT_MET' ||
      edgeErr.status === 403
    ) {
      throw edgeErr; // Re-throw authoritative business logic, draft status & prerequisite access errors
    }
    if (typeof process === 'undefined' || !process.env || process.env.TOPSCORE_DIRECT_DB !== '1') {
      if (!isEdgeFunctionOffline('start-test')) {
        console.info('Edge Function start-test offline, switching seamlessly to client DB fallback.');
        markEdgeFunctionOffline('start-test');
      }
    }
  }

  const sb = await getSupabase();

  // 1. Ambil detail test
  const { data: asmData, error: asmErr } = await sb.from('tests')
    .select('id, title, status, deleted_at, test_subtype, test_type, class_id, level_id, display_order, working_duration_minutes, schedule_mode, minimum_required_score, prerequisite_test_id, prerequisite_id, payload, module_id, question_order')
    .eq('id', testId)
    .single();
  if (asmErr || !asmData) throw new Error('Test not found.');

  // Guard: Strict status and soft-delete check in client DB fallback (never allow soft-deleted or DRAFT attempts)
  const currentStatus = String(asmData.status || '').toUpperCase();
  if (asmData.deleted_at || (currentStatus !== 'PUBLISHED' && currentStatus !== 'ACTIVE')) {
    const pubErr = new Error('This test is unavailable or has been archived.');
    pubErr.code = 'TEST_UNAVAILABLE';
    pubErr.status = 403;
    throw pubErr;
  }

  // Guard: Prerequisite check in client DB fallback
  const isStandaloneTryout = asmData.payload?.is_standalone_tryout === true;
  const prereqId = asmData.prerequisite_test_id || asmData.prerequisite_id;
  if (prereqId && !isStandaloneTryout) {
    const [prereqAttRes, prereqTestRes] = await Promise.all([
      sb.from('attempts')
        .select('score, percentage, effective_score, status, is_forgiven, is_remedial_unlocked, is_remedial')
        .eq('student_id', studentId)
        .eq('test_id', prereqId)
        .in('status', ['submitted', 'auto_submitted', 'evaluated', 'SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED']),
      sb.from('tests')
        .select('id, title, test_type, test_subtype, category, shell_code, minimum_required_score, payload')
        .eq('id', prereqId)
        .single()
    ]);

    const prereqAttempts = prereqAttRes.data || [];
    const prereqTest = prereqTestRes.data;
    const testSettings = await fetchClassTestSettings(asmData.class_id);
    const targetReps = Number(testSettings?.taskRepetitions) || 7;
    const defaultTaskMin = Number(testSettings?.taskMinScore) || 50;
    const defaultExamMin = Number(testSettings?.examMinScore) || 60;

    const isPrereqExam = prereqTest ? isWeeklyExam(prereqTest) : false;

    // Prerequisite passing threshold:
    // Must evaluate the prerequisite test's threshold (prereqTest), NOT the current test's threshold (asmData).
    // For exams, the passing threshold is 60% (Grade C KKM).
    const explicitOverride = asmData.payload?.prerequisite_min_score ? parseFloat(asmData.payload.prerequisite_min_score) : null;
    const prereqMin = (prereqTest?.minimum_required_score && parseFloat(prereqTest.minimum_required_score) > 0)
      ? parseFloat(prereqTest.minimum_required_score)
      : (prereqTest?.payload?.min_score ? parseFloat(prereqTest.payload.min_score) : (isPrereqExam ? defaultExamMin : defaultTaskMin));
    const reqScore = explicitOverride !== null ? explicitOverride : prereqMin;

    let passCount = 0;
    prereqAttempts.forEach(a => {
      if (a.is_forgiven) {
        passCount = Math.max(passCount, targetReps);
      } else {
        const pct = a.effective_score != null ? Number(a.effective_score) : Number(a.percentage || a.score || 0);
        const isRem = Boolean(a.is_remedial_unlocked || a.is_remedial);
        if (pct >= reqScore || (isRem && pct >= 60)) {
          passCount++;
        }
      }
    });

    const requiredPasses = isPrereqExam ? 1 : targetReps;
    if (passCount < requiredPasses) {
      const pErr = isPrereqExam
        ? new Error(`Prerequisite not completed. You must pass "${prereqTest?.title || 'the prerequisite exam'}" with at least ${reqScore}% before starting this test.`)
        : new Error(`Prerequisite not completed. You must achieve 7×7 Repetitive Mastery (${passCount}/${requiredPasses} passes with at least ${reqScore}%) on "${prereqTest?.title || 'the prerequisite task'}" before starting this test.`);
      pErr.code = 'PREREQUISITE_NOT_MET';
      pErr.status = 403;
      pErr.prereqTestId = prereqTest?.id;
      pErr.prereqTitle = prereqTest?.title;
      throw pErr;
    }
  }

  // Guard: Repetitive Mastery Hard Gate: Taking an Exam requires dynamic target passes on all sibling Tasks
  if (isWeeklyExam(asmData) && !isStandaloneTryout) {
    const themeCode = asmData.payload?.theme_code || (asmData.shell_code ? asmData.shell_code.replace(/^[0-9]+/, '').charAt(0) : null);
    if (themeCode) {
      const { data: siblingTasks } = await sb.from('tests')
        .select('id, title, payload, shell_code, test_subtype, test_type, category')
        .eq('class_id', asmData.class_id)
        .eq('level_id', asmData.level_id)
        .neq('id', asmData.id)
        .is('deleted_at', null);

      const themeTasks = (siblingTasks || []).filter(t => {
        if (isWeeklyExam(t)) return false;
        const tc = t.payload?.theme_code || (t.shell_code ? t.shell_code.replace(/^[0-9]+/, '').charAt(0) : '');
        return String(tc).toUpperCase() === String(themeCode).toUpperCase();
      });

      if (themeTasks.length > 0) {
        const testSettings = await fetchClassTestSettings(asmData.class_id);
        const targetReps = Number(testSettings?.taskRepetitions) || 7;
        const taskMinScore = Number(testSettings?.taskMinScore) || 50;
        const taskMap = Object.fromEntries(themeTasks.map(t => [t.id, t]));

        const taskIds = themeTasks.map(t => t.id);
        const { data: taskAttempts } = await sb.from('attempts')
          .select('test_id, percentage, effective_score, status, is_forgiven')
          .eq('student_id', studentId)
          .in('test_id', taskIds)
          .in('status', ['submitted', 'auto_submitted', 'evaluated', 'SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED']);

        const passCountByTask = {};
        (taskAttempts || []).forEach(att => {
          if (att.is_forgiven) {
            passCountByTask[att.test_id] = Math.max(passCountByTask[att.test_id] || 0, targetReps);
          } else {
            const pct = att.effective_score != null ? Number(att.effective_score) : Number(att.percentage || 0);
            const minReq = Number(taskMap[att.test_id]?.minimum_required_score || taskMap[att.test_id]?.payload?.min_score || taskMinScore);
            if (pct >= minReq) {
              passCountByTask[att.test_id] = (passCountByTask[att.test_id] || 0) + 1;
            }
          }
        });

        const unmasteredTask = themeTasks.find(t => (passCountByTask[t.id] || 0) < targetReps);
        if (unmasteredTask) {
          const mErr = new Error(`Prerequisite not completed. You must achieve Repetitive Mastery (${targetReps} passes with at least ${taskMinScore}%) on all Theme Tasks before taking the Exam.`);
          mErr.code = 'MASTERY_REPETITION_NOT_MET';
          mErr.status = 403;
          throw mErr;
        }
      }
    }
  }

  // Phase 298: Intra-theme Words Exam and Phrases Exam are flexible PEERS (can be taken in either order).
  // Cross-Theme Prerequisite (Theme B requires Theme A) remains strictly enforced below.

  // Guard: Strict Cross-Theme Prerequisite:
  // Taking ANY test (Task or Exam) in Theme B, C, or D requires passing prior theme's exams with >= 70%
  const currentThemeFallback = String(asmData.payload?.theme_code || asmData.shell_code?.replace(/^[0-9]+/, '').charAt(0) || '').toUpperCase();
  const themeSeqFallback = ['A', 'B', 'C', 'D'];
  const curThemeIdxFallback = themeSeqFallback.indexOf(currentThemeFallback);

  const isRemedialSessionFallback = asmData.payload?.test_session?.is_remedial === true ||
    (Array.isArray(asmData.payload?.test_session?.remedial_student_ids) && asmData.payload.test_session.remedial_student_ids.includes(studentId));

  if (curThemeIdxFallback > 0 && !isStandaloneTryout && !isRemedialSessionFallback) {
    const priorTheme = themeSeqFallback[curThemeIdxFallback - 1];
    const { data: priorExams } = await sb.from('tests')
      .select('id, title, payload, shell_code, test_type, minimum_required_score')
      .eq('class_id', asmData.class_id)
      .eq('level_id', asmData.level_id)
      .eq('test_type', 'exam')
      .neq('id', asmData.id);

    const matchingPriorExams = (priorExams || []).filter(t => {
      const tc = t.payload?.theme_code || (t.shell_code ? t.shell_code.replace(/^[0-9]+/, '').charAt(0) : '');
      return String(tc).toUpperCase() === priorTheme && isWeeklyExam(t);
    });

    if (matchingPriorExams.length > 0) {
      const priorExamIds = matchingPriorExams.map(t => t.id);
      const { data: priorAttempts } = await sb.from('attempts')
        .select('test_id, percentage, effective_score, status, is_remedial_unlocked, is_remedial, is_forgiven')
        .eq('student_id', studentId)
        .in('test_id', priorExamIds)
        .in('status', ['submitted', 'auto_submitted', 'evaluated', 'SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED']);

      const passedPriorIds = new Set();
      (priorAttempts || []).forEach(att => {
        const pe = matchingPriorExams.find(e => e.id === att.test_id);
        const reqScore = Number(pe?.minimum_required_score) || Number(pe?.payload?.min_score) || 60;
        const pct = att.effective_score != null ? Number(att.effective_score) : Number(att.percentage || 0);
        const isRem = Boolean(att.is_remedial_unlocked || att.is_remedial);
        if (pct >= reqScore || (isRem && pct >= 60) || att.is_forgiven) {
          passedPriorIds.add(att.test_id);
        }
      });

      const failedAny = priorExamIds.some(id => !passedPriorIds.has(id));
      if (failedAny) {
        const unpassedExam = matchingPriorExams.find(e => !passedPriorIds.has(e.id));
        const reqScore = Number(unpassedExam?.minimum_required_score) || Number(unpassedExam?.payload?.min_score) || 60;
        const pErr = new Error(`Prerequisite not completed. You must pass all Theme ${priorTheme} Exams with at least ${reqScore}% before taking Theme ${currentThemeFallback} tests.`);
        pErr.code = 'PRIOR_THEME_EXAMS_REQUIRED';
        pErr.status = 403;
        pErr.prereqTestId = unpassedExam?.id;
        pErr.prereqTitle = unpassedExam?.title;
        throw pErr;
      }
    }
  }

  // Guard: Linear Topic Gating - Topic K requires 7/7 Mastery on Topic K-1
  const topicCodeFallback = asmData.payload?.topic_code;
  const cleanTopicNumFallback = parseInt(String(topicCodeFallback || '').replace(/^[A-Za-z]+/, ''), 10);
  if (!isWeeklyExam(asmData) && cleanTopicNumFallback > 1 && currentThemeFallback && !isStandaloneTryout && !isRemedialSessionFallback) {
    const priorTopicNum = cleanTopicNumFallback - 1;
    const { data: priorTopicTasks } = await sb.from('tests')
      .select('id, title, payload, shell_code, test_type, test_subtype, category, minimum_required_score')
      .eq('class_id', asmData.class_id)
      .eq('level_id', asmData.level_id)
      .is('deleted_at', null);

    const filteredPriorTasks = (priorTopicTasks || []).filter(t => {
      if (isWeeklyExam(t)) return false;
      const tc = t.payload?.theme_code || (t.shell_code ? t.shell_code.replace(/^[0-9]+/, '').charAt(0) : '');
      if (String(tc).toUpperCase() !== currentThemeFallback) return false;
      const topNum = parseInt(String(t.payload?.topic_code || '').replace(/^[A-Za-z]+/, ''), 10);
      return topNum === priorTopicNum;
    });

    if (filteredPriorTasks.length > 0) {
      const testSettings = await fetchClassTestSettings(asmData.class_id);
      const targetReps = Number(testSettings?.taskRepetitions) || 7;
      const priorTaskIds = filteredPriorTasks.map(t => t.id);
      const { data: priorTaskAttempts } = await sb.from('attempts')
        .select('test_id, percentage, effective_score, status, is_forgiven')
        .eq('student_id', studentId)
        .in('test_id', priorTaskIds)
        .in('status', ['submitted', 'auto_submitted', 'evaluated', 'SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED']);

      const taskMap = Object.fromEntries(filteredPriorTasks.map(t => [t.id, t]));
      const passCountByTask = {};
      (priorTaskAttempts || []).forEach(att => {
        if (att.is_forgiven) {
          passCountByTask[att.test_id] = Math.max(passCountByTask[att.test_id] || 0, targetReps);
        } else {
          const pct = att.effective_score != null ? Number(att.effective_score) : Number(att.percentage || 0);
          const minReq = Number(taskMap[att.test_id]?.minimum_required_score || taskMap[att.test_id]?.payload?.min_score || 50);
          if (pct >= minReq) {
            passCountByTask[att.test_id] = (passCountByTask[att.test_id] || 0) + 1;
          }
        }
      });

      const unmasteredTask = filteredPriorTasks.find(t => (passCountByTask[t.id] || 0) < targetReps);
      if (unmasteredTask) {
        const unmasteredMin = unmasteredTask.minimum_required_score || unmasteredTask.payload?.min_score || 50;
        const topErr = new Error(`Prerequisite not completed. You must achieve 7×7 Repetitive Mastery (${targetReps} passes with at least ${unmasteredMin}%) on Topic ${currentThemeFallback}${priorTopicNum} before starting Topic ${cleanTopicNumFallback}.`);
        topErr.code = 'TOPIC_MASTERY_NOT_MET';
        topErr.status = 403;
        topErr.prereqTestId = unmasteredTask?.id;
        topErr.prereqTitle = unmasteredTask?.title;
        throw topErr;
      }
    }
  }

  // Guard: Do NOT insert attempt or start countdown if tutor hasn't unlocked it yet
  if (asmData.schedule_mode === 'manual' && asmData.is_unlocked === false) {
    const lockErr = new Error('LOCKED_BY_TUTOR');
    lockErr.code = 'LOCKED_BY_TUTOR';
    throw lockErr;
  }

  // Guard: Test Session Access & Attendance Whitelist (for formal EXAM category)
  const isExamSubtype = (asmData.test_subtype || '').toUpperCase().includes('TEST');
  const isExamShell = (asmData.shell_code || '').toUpperCase().endsWith('-TEST');
  const isExamTitle = (asmData.title || '').toLowerCase().includes('test') && !(asmData.title || '').toLowerCase().includes('task');
  const isFormalExam = ((asmData.test_type || '').toLowerCase() === 'exam' || isExamSubtype || isExamShell || isExamTitle) &&
                       !(asmData.shell_code || '').toUpperCase().includes('-TASK') &&
                       !(asmData.test_subtype || '').toUpperCase().includes('TASK') &&
                       !(asmData.title || '').toLowerCase().includes('task') &&
                       (asmData.test_type || '').toLowerCase() !== 'quiz';

  let activeSession = null;
  const isFlexible = (asmData.schedule_mode || asmData.payload?.schedule_mode) === 'flexible';
  if (isFormalExam && !isFlexible && (asmData.schedule_mode === 'strict' || asmData.payload?.test_session)) {
    const accessCheck = await checkStudentTestAccess(studentId, testId);
    if (!accessCheck.allowed) {
      const err = new Error(accessCheck.message);
      err.code = accessCheck.reason;
      err.status = 403;
      throw err;
    }
    activeSession = accessCheck.session;
  }

  const test = {
    ...asmData,
    name: asmData.title || asmData.name,
    question_order: asmData.question_order || asmData.payload?.question_order || 'random',
    time_limit_minutes: asmData.working_duration_minutes || asmData.time_limit_minutes || 60
  };

  // 2. Cek apakah ada attempt in_progress yang sedang berjalan (tanpa kueri ganda)
  const { data: existingAttempts } = await sb.from('attempts')
    .select('id, student_id, test_id, status, started_at, expires_at, attempt_number, is_remedial_unlocked, created_at')
    .eq('student_id', studentId)
    .eq('test_id', testId)
    .in('status', ['in_progress'])
    .order('created_at', { ascending: false });

  let attempt = existingAttempts?.[0];

  if (!attempt) {
    let timeLimit = test.time_limit_minutes || 60;
    const now = new Date();
    let expectedEnd = new Date(now.getTime() + timeLimit * 60000);

    // If active test session exists, clamp timeLimit and expectedEnd dynamically!
    if (activeSession && activeSession.auto_close_at) {
      const sessionClose = new Date(activeSession.auto_close_at);
      if (sessionClose.getTime() > now.getTime()) {
        expectedEnd = sessionClose;
        timeLimit = Math.max(1, Math.round((expectedEnd.getTime() - now.getTime()) / 60000));
      }
    }

    const { count: priorCount } = await sb.from('attempts')
      .select('id', { count: 'exact', head: false })
      .limit(1)
      .eq('student_id', studentId)
      .eq('test_id', testId);

    const attemptNumber = (priorCount || 0) + 1;

    // Check if session or student is designated as remedial
    const isRemedialSession = Boolean(
      activeSession?.is_remedial ||
      (Array.isArray(activeSession?.remedial_student_ids) && activeSession.remedial_student_ids.includes(studentId))
    );

    // Bersihkan: simpan test_id satu kali saja
    const { data: newAttempt, error: createErr } = await sb.from('attempts')
      .insert({
        student_id: studentId,
        test_id: testId,
        attempt_number: attemptNumber,
        started_at: now.toISOString(),
        expires_at: expectedEnd.toISOString(),
        status: 'in_progress',
        score: 0,
        percentage: 0,
        grade: 'E',
        is_best_score: false,
        is_remedial_unlocked: isRemedialSession
      })
      .select()
      .single();

    if (createErr) throw createErr;
    attempt = newAttempt;
  }

  // 3. Ambil jawaban attempt atau self-heal jika attempt belum memiliki butir soal
  let { data: answers } = await sb.from('attempt_answers')
    .select('id, attempt_id, question_id, question_snapshot, topic_snapshot, question_type_snapshot, student_answer, score')
    .eq('attempt_id', attempt.id);

  if (!answers || answers.length === 0) {
    const questions = await generateTestQuestions(sb, test);
    if (questions && questions.length > 0) {
      const answerRows = questions.map((sq, idx) => ({
        attempt_id: attempt.id,
        question_id: sq.question_id || null,
        question_snapshot: {
          question_text: sq.question_text_snapshot,
          word_type: sq.word_type_snapshot,
          topic: sq.topic_snapshot,
          theme: sq.theme_snapshot || test.payload?.theme_code || "General",
          theme_code: sq.theme_code || test.payload?.theme_code,
          category: sq.category_snapshot || test.payload?.category || 'vocab',
          display_order: sq.display_order ?? (idx + 1),
          answer_type: sq.answer_type || 'spoken',
          options_snapshot: sq.options_snapshot || [],
          test_section: sq.test_section || null,
          section_label: sq.section_label || null,
          section_id: sq.test_section || 'default'
        },
        topic_snapshot: sq.topic_snapshot,
        accepted_answers_snapshot: sq.accepted_answers_snapshot,
        correct_answer_snapshot: Array.isArray(sq.accepted_answers_snapshot) ? sq.accepted_answers_snapshot.join('; ') : String(sq.accepted_answers_snapshot || ''),
        student_answer: null,
        score: 0
      }));
      const { error: ansInsertErr } = await sb.from('attempt_answers').insert(answerRows);
      if (ansInsertErr) {
        console.error('Failed to insert attempt answers:', ansInsertErr);
      } else {
        const { data: refetched } = await sb.from('attempt_answers')
          .select('id, attempt_id, question_id, question_snapshot, topic_snapshot, question_type_snapshot, student_answer, score')
          .eq('attempt_id', attempt.id);
        answers = refetched || [];

        // Authoritative: Update total_questions on attempt in database and memory
        if (answers.length > 0) {
          await sb.from('attempts').update({
            total_questions: answers.length,
            updated_at: new Date().toISOString()
          }).eq('id', attempt.id);
          attempt.total_questions = answers.length;
        }
      }
    }
  }

  // Self-heal: ensure attempt.total_questions matches answers.length
  if (attempt && (!attempt.total_questions || attempt.total_questions === 0) && answers && answers.length > 0) {
    try {
      await sb.from('attempts').update({
        total_questions: answers.length,
        updated_at: new Date().toISOString()
      }).eq('id', attempt.id);
      attempt.total_questions = answers.length;
    } catch (_) {}
  }

  if (answers && answers.length > 0) {
    answers.sort((a, b) => {
      const orderA = a.question_snapshot?.display_order ?? a.question_snapshot?.question_order;
      const orderB = b.question_snapshot?.display_order ?? b.question_snapshot?.question_order;
      if (orderA != null && orderB != null) return orderA - orderB;
      return new Date(a.created_at) - new Date(b.created_at);
    });
  }

  // Sanitasi jawaban agar kunci rahasia tidak bocor ke browser siswa
  const sanitizedAnswers = (answers || []).map(a => {
    let snap = typeof a.question_snapshot === 'string'
      ? (() => { try { return JSON.parse(a.question_snapshot); } catch(_) { return {}; } })()
      : (a.question_snapshot ? { ...a.question_snapshot } : {});

    delete snap.correct_answer;
    delete snap.accepted_answers;

    return {
      id: a.id,
      attempt_id: a.attempt_id,
      question_id: a.question_id,
      question_snapshot: snap,
      options_snapshot: a.options_snapshot,
      student_answer: a.student_answer,
      topic_snapshot: a.topic_snapshot,
      question_type_snapshot: a.question_type_snapshot
    };
  });

  const hasWordsAndPhrases = sanitizedAnswers.some(a => a.question_snapshot?.test_section === 'words') &&
                             sanitizedAnswers.some(a => a.question_snapshot?.test_section === 'phrases');
  const sections = hasWordsAndPhrases
    ? [
        { id: 'words', title: 'Part 1: Words', section_order: 1 },
        { id: 'phrases', title: 'Part 2: Phrases', section_order: 2 }
      ]
    : [{ id: 'default', title: test.name || test.title || 'Test', section_order: 1 }];

  return enrichTestSections({
    success: true,
    attempt: attempt,
    test: test,
    TEST: test,
    sections: sections,
    answers: sanitizedAnswers,
    resumed: !!existingAttempts?.[0]
  });
}

/** ALIAS KRUSIAL: Mencegah SyntaxError crash di test.html */
export const startTEST = startTest;

export async function saveAnswer(attemptAnswerId, studentAnswer) {
  const sb = await getSupabase();
  const { error } = await sb.from('attempt_answers')
    .update({ student_answer: studentAnswer, updated_at: new Date().toISOString() })
    .eq('id', attemptAnswerId);
  if (error) throw error;
}

export async function submitTest(attemptId, answersMap, options = {}) {
  const targetStatus = options?.status || 'submitted';
  let result = null;
  try {
    result = await callEdgeFunction('submit-test', { attempt_id: attemptId, answers: answersMap, status: targetStatus });
  } catch (edgeErr) {
    if (typeof process === 'undefined' || !process.env || process.env.TOPSCORE_DIRECT_DB !== '1') {
      console.warn('Edge Function submit-test unavailable, using server RPC fallback:', edgeErr.message);
    }
  }

  if (!result) {
    // Server-authoritative fallback via PostgreSQL RPC (strictly server-side scoring & RLS compliance)
    const sb = await getSupabase();
    try {
      const { data: rpcData, error: rpcErr } = await sb.rpc('emergency_submit_attempt', {
        p_attempt_id: attemptId,
        p_answers: answersMap,
        p_status: targetStatus
      });

      if (rpcErr) throw rpcErr;
      result = rpcData;
    } catch (rpcErr) {
      console.warn('PostgreSQL RPC fallback failed, executing direct client submit fallback:', rpcErr);

      // Direct client evaluation fallback (guarantees student NEVER fails to submit or loses score)
      const { data: attempt } = await sb.from('attempts').select('id, is_remedial_unlocked').eq('id', attemptId).single();
      const { data: attemptAnswers } = await sb.from('attempt_answers').select('id, student_answer, accepted_answers_snapshot, correct_answer_snapshot, question_snapshot, question_type_snapshot').eq('attempt_id', attemptId);

      let totalPoints = 0;
      let correctCount = 0;
      const totalQuestions = (attemptAnswers && attemptAnswers.length) || 0;

      const answersList = Array.isArray(answersMap) ? answersMap : [];
      const answersDict = new Map(answersList.map(a => [a.attempt_answer_id, a.student_answer || '']));

      for (const row of (attemptAnswers || [])) {
        const studentAns = answersDict.has(row.id) ? answersDict.get(row.id) : (row.student_answer || '');
        const qType = row.question_snapshot?.answer_type || row.question_type_snapshot || 'written';
        const evalRes = evaluateAnswer(studentAns, row.accepted_answers_snapshot || row.correct_answer_snapshot, qType);
        const score = evalRes.score || (evalRes.is_correct ? 1 : 0);
        totalPoints += score;
        if (score >= 1) correctCount++;

        await sb.from('attempt_answers').update({
          student_answer: studentAns,
          score: score,
          is_correct: score >= 1,
          evaluation_result: score >= 1 ? 'correct' : (score > 0 ? 'minor' : 'incorrect'),
          updated_at: new Date().toISOString()
        }).eq('id', row.id);
      }

      const pct = totalQuestions > 0 ? Math.round((totalPoints / totalQuestions) * 10000) / 100 : 0;
      let effectiveScore = pct;
      if (attempt?.is_remedial_unlocked) {
        effectiveScore = Math.min(pct, 60.0);
      }
      const grade = getGrade(effectiveScore);

      const { data: updAttempt, error: updAttErr } = await sb.from('attempts').update({
        status: targetStatus,
        submitted_at: new Date().toISOString(),
        score: totalPoints,
        correct_count: correctCount,
        total_questions: totalQuestions,
        percentage: pct,
        effective_score: effectiveScore,
        grade: grade,
        updated_at: new Date().toISOString()
      }).eq('id', attemptId).select().single();

      if (updAttErr) throw updAttErr;
      result = updAttempt || { id: attemptId, status: targetStatus, percentage: pct, grade: grade };
    }
  }

  // Post-submit Answer Tolerance & Spelling Sync:
  // Verifies that answers scored by server RPC didn't penalize hyphens, letter spelling spaces, or valid word forms
  try {
    const sb = await getSupabase();
    const { data: attAnsList } = await sb.from('attempt_answers')
      .select('id, student_answer, accepted_answers_snapshot, correct_answer_snapshot, question_snapshot, question_type_snapshot, score, is_correct, evaluation_result')
      .eq('attempt_id', attemptId);

    let needsRescore = false;
    let newScore = 0;
    let newCorrect = 0;
    const totalQ = attAnsList?.length || 0;

    for (const r of (attAnsList || [])) {
      const qType = r.question_snapshot?.answer_type || r.question_type_snapshot || 'written';
      const ev = evaluateAnswer(r.student_answer, r.accepted_answers_snapshot || r.correct_answer_snapshot, qType);
      const trueScore = ev.score || 0;
      if (trueScore > (r.score || 0)) {
        needsRescore = true;
        await sb.from('attempt_answers').update({
          score: trueScore,
          is_correct: trueScore >= 1,
          evaluation_result: ev.result || (trueScore >= 1 ? 'correct' : 'minor'),
          updated_at: new Date().toISOString()
        }).eq('id', r.id);
        newScore += trueScore;
        if (trueScore >= 1) newCorrect++;
      } else {
        newScore += (r.score || 0);
        if (r.is_correct || r.score >= 1) newCorrect++;
      }
    }

    if (needsRescore && totalQ > 0) {
      const pct = Math.round((newScore / totalQ) * 10000) / 100;
      const { data: attData } = await sb.from('attempts').select('is_remedial_unlocked').eq('id', attemptId).single();
      const effScore = attData?.is_remedial_unlocked ? Math.min(pct, 60.0) : pct;
      const grade = getGrade(effScore);
      const { data: fixedAtt } = await sb.from('attempts').update({
        score: newScore,
        correct_count: newCorrect,
        percentage: pct,
        effective_score: effScore,
        grade: grade,
        updated_at: new Date().toISOString()
      }).eq('id', attemptId).select().single();
      if (fixedAtt) result = fixedAtt;
    }
  } catch (syncErr) {
    console.warn('Post-submit tolerance check notice:', syncErr);
  }

  // Authoritative Remedial Sync (Remedial retains earned score, grade follows score)
  try {
    const sb = await getSupabase();
    const { data: att } = await sb.from('attempts')
      .select('id, is_remedial_unlocked, percentage, effective_score')
      .eq('id', attemptId)
      .single();
    if (att && att.is_remedial_unlocked) {
      const rawPct = parseFloat(att.percentage || 0);
      const effPct = Math.min(rawPct, 60.0);
      await sb.from('attempts')
        .update({
          effective_score: effPct,
          grade: getGrade(effPct),
          updated_at: new Date().toISOString()
        })
        .eq('id', attemptId);
    }
  } catch (remedialErr) {
    console.warn('Post-submit remedial check notice:', remedialErr);
  }

  return result;
}

// ============================================================
// RESULTS DISPLAY
// ============================================================

export async function fetchAttemptResult(attemptId) {
  const sb = await getSupabase();
  const { data, error } = await sb.from('attempts')
    .select(`
      id, student_id, status, score, total_questions, percentage, effective_score, is_remedial_unlocked, grade, submitted_at, started_at,
      expires_at, test_id, is_best_score,
      tests:test_id(id, title, shell_code, status, test_subtype, test_type, class_id, classes(name), levels(name))
    `)
    .eq('id', attemptId)
    .single();
  if (error) throw error;
  return data;
}

export async function fetchAttemptAnswers(attemptId) {
  const sb = await getSupabase();
  const { data, error } = await sb.from('attempt_answers')
    .select('id, attempt_id, question_id, student_answer, score, evaluation_result, is_correct, question_snapshot, correct_answer_snapshot')
    .eq('attempt_id', attemptId);
  if (error) throw error;
  return data || [];
}

// ============================================================
// ADMIN CRUD & COMMON OPERATIONS
// ============================================================

let _adminCache = new Map();

export function clearAdminCache(table = null) {
  if (table) {
    const normTable = (table || '').toLowerCase().replace('-', '_');
    for (const key of _adminCache.keys()) {
      if (key.startsWith(normTable + '|')) _adminCache.delete(key);
    }
    // Cross-table dependencies: if batches, programs, institutions or levels change,
    // clear students and progress caches which embed these related records
    if (['batches', 'programs', 'institutions', 'levels'].includes(normTable)) {
      for (const key of _adminCache.keys()) {
        if (key.startsWith('students|') || key.startsWith('progress|') || key.startsWith('classes|')) {
          _adminCache.delete(key);
        }
      }
    }
    if (normTable === 'programs' && typeof window !== 'undefined' && typeof window.loadSidebarPrograms === 'function') {
      window.loadSidebarPrograms();
    }
    if (normTable === 'classes' && typeof window !== 'undefined' && typeof window.loadSidebarClasses === 'function') {
      window.loadSidebarClasses();
    }
  } else {
    _adminCache.clear();
    if (typeof window !== 'undefined') {
      if (typeof window.loadSidebarPrograms === 'function') window.loadSidebarPrograms();
      if (typeof window.loadSidebarClasses === 'function') window.loadSidebarClasses();
    }
  }
}

export async function adminFetchAll(table, select = '*', filters = {}, forceRefresh = false) {
  const normTable = (table || '').toLowerCase().replace('-', '_');
  const cacheKey = normTable + '|' + select + '|' + JSON.stringify(filters);

  if (!forceRefresh && _adminCache.has(cacheKey)) {
    return JSON.parse(JSON.stringify(_adminCache.get(cacheKey)));
  }

  try {
    const sb = await getSupabase();
    if (normTable === 'attempts') {
      try {
        await sb.rpc('auto_close_expired_attempts');
      } catch (_) {}
    }
    let query = sb.from(normTable).select(select);

    const noDeletedAtTables = [
      'attempts',
      'attempt_answers',
      'progress',
      'audit_logs',
      'site_settings',
      'levels',
      'assignments',
      'user_professionals',
      'modules',
      'class_levels',   // junction table — no deleted_at column
      'class_meetings',
      'class_meeting_exceptions'
    ];
    if (!noDeletedAtTables.includes(normTable)) {
      query = query.is('deleted_at', null);
    }

    for (const [key, val] of Object.entries(filters)) {
      const normKey = (key === 'Test_id') ? 'test_id' : key;
      query = query.eq(normKey, val);
    }

        // Fetch all pages to overcome 1000 row limit
    let allData = [];
    let from = 0;
    const pageSize = 1000;

    // In Supabase JS v2, modifying query might not create a new object,
    // but .range() actually mutates the query builder if done in a chain.
    // Wait, .range() applies limits. We can just execute the base query with range().
    while (true) {
      // Supabase JS allows re-executing query object with new range?
      // Actually, building a new query or cloning is better, but .range(start, end)
      // returns a new builder? Wait! Supabase v2 `.range()` returns 'this', mutating it!
      // But we can just use pagination directly on `query`.

      const { data, error } = await query.range(from, from + pageSize - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      allData = allData.concat(data);
      if (data.length < pageSize) break;
      from += pageSize;
    }

    _adminCache.set(cacheKey, JSON.parse(JSON.stringify(allData || [])));
    return allData || [];
  } catch (e) {
    console.warn(`adminFetchAll failed for ${table}:`, e.message);
    return [];
  }
}

async function enforceTestSystemGuard(sb, payload, existingTest = null) {
  const merged = { ...existingTest, ...payload };
  if (!merged.module_id) return;

  const { data: mod } = await sb.from('modules').select('name').eq('id', merged.module_id).single();
  if (!mod) return;

  const modName = mod.name.toLowerCase();
  const isVocabMod = modName.includes('vocabulary mastery') || modName.includes('phrase recognition');

  if (isVocabMod) {
    if (merged.class_id) {
      const { data: cls } = await sb.from('classes').select('name').eq('id', merged.class_id).single();
      if (cls && !cls.name.toLowerCase().includes('vocab')) {
        throw new Error('SYSTEM GUARD: Vocabulary Mastery and Phrase Recognition modules are strictly locked to Vocabulary Class only.');
      }
    }
    if (merged.level_id) {
      const { data: lvl } = await sb.from('levels').select('level_number').eq('id', merged.level_id).single();
      if (lvl && ![0, 1, 2, 3].includes(lvl.level_number)) {
        throw new Error('SYSTEM GUARD: Vocabulary modules are only permitted for Levels 0, 1, 2, and 3.');
      }
    }
  }
}

export async function adminInsert(table, payload) {
  const normTable = (table || '').toLowerCase().replace('-', '_');
  const sb = await getSupabase();

  if (normTable === 'tests') {
    if (payload && typeof payload === 'object') {
      if ('duration_minutes' in payload) {
        if (payload.working_duration_minutes === undefined) {
          payload.working_duration_minutes = payload.duration_minutes;
        }
        delete payload.duration_minutes;
      }
      if ('prerequisite_test_id' in payload) {
        payload.prerequisite_id = payload.prerequisite_test_id;
      } else if ('prerequisite_id' in payload) {
        payload.prerequisite_test_id = payload.prerequisite_id;
      }
    }
    await enforceTestSystemGuard(sb, payload);
  }

  const { data, error } = await sb.from(normTable).insert(payload).select().single();
  if (error) throw error;
  clearAdminCache(normTable);
  return data;
}

export async function adminUpdate(table, id, payload) {
  const normTable = (table || '').toLowerCase().replace('-', '_');
  const sb = await getSupabase();

  if (normTable === 'tests') {
    if (payload && typeof payload === 'object') {
      if ('duration_minutes' in payload) {
        if (payload.working_duration_minutes === undefined) {
          payload.working_duration_minutes = payload.duration_minutes;
        }
        delete payload.duration_minutes;
      }
      if ('prerequisite_test_id' in payload) {
        payload.prerequisite_id = payload.prerequisite_test_id;
      } else if ('prerequisite_id' in payload) {
        payload.prerequisite_test_id = payload.prerequisite_id;
      }
    }
    const { data: existing } = await sb.from('tests').select('id, module_id, class_id, level_id').eq('id', id).single();
    await enforceTestSystemGuard(sb, payload, existing);
  }

  const { data, error } = await sb.from(normTable).update(payload).eq('id', id).select().single();
  if (error) throw error;
  clearAdminCache(normTable);
  return data;
}

export async function adminSoftDelete(table, id) {
  const normTable = (table || '').toLowerCase().replace('-', '_');
  const sb = await getSupabase();
  if (normTable === 'tests') {
    await sb.from('test_items').delete().eq('test_id', id);
    const { error } = await sb.from('tests').delete().eq('id', id);
    if (error) throw error;
    clearAdminCache(normTable);
    return;
  }
  const { error } = await sb.from(normTable).update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
  clearAdminCache(normTable);
}

export async function adminHardDelete(table, id) {
  const normTable = (table || '').replace('-', '_');
  const sb = await getSupabase();
  const { error } = await sb.from(normTable).delete().eq('id', id);
  if (error) throw error;
  clearAdminCache(normTable);
}

export async function recalculateBestScore(studentId, testId) {
  const sb = await getSupabase();
  const { data: attempts, error } = await sb.from('attempts')
    .select('id, score, percentage, created_at')
    .eq('student_id', studentId)
    .eq('test_id', testId)
    .in('status', ['submitted', 'auto_submitted'])
    .order('percentage', { ascending: false })
    .order('created_at', { ascending: false });

  if (error || !attempts || !attempts.length) return null;

  // Safe in-memory sort by percentage DESC, then created_at DESC
  attempts.sort((a, b) => {
    const scoreA = Number(a.percentage || 0);
    const scoreB = Number(b.percentage || 0);
    if (scoreB !== scoreA) return scoreB - scoreA;
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });

  const bestAttemptId = attempts[0].id;
  for (const a of attempts) {
    await sb.from('attempts').update({ is_best_score: a.id === bestAttemptId }).eq('id', a.id);
  }
  return attempts[0];
}

export async function logCheatingEvent(studentId, testId, action, detail) {
  try {
    const sb = await getSupabase();
    await sb.from('audit_logs').insert({
      actor_user_id: studentId,
      actor_role: 'student',
      action: action || 'CHEAT_ATTEMPT',
      entity_type: 'test',
      entity_id: testId,
      new_value: detail,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Failed to insert audit log for cheating:', err);
  }
}

export async function fetchTests(filters = {}) {
  const sb = await getSupabase();
  try {
    let query = sb.from('tests').select('id, title, display_name, test_subtype, category, payload, class_id, level_id, display_order, status, minimum_required_score, prerequisite_test_id, working_duration_minutes, schedule_mode, test_type, is_dynamic_shell, shell_code, max_attempts, retake_allowed, created_at, deleted_at, classes(name), levels(name, level_number)');
    if (filters.class_id) query = query.eq('class_id', filters.class_id);
    if (!filters.include_deleted) {
      query = query.is('deleted_at', null);
    }

    const { data, error } = await query.order('display_order', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false });
    if (!error && data) {
      return data.map(a => ({
        ...a,
        prerequisite_id: a.prerequisite_test_id || a.prerequisite_id,
        prerequisite_test_id: a.prerequisite_test_id || a.prerequisite_id
      }));
    }
  } catch (err) {
    console.warn('fetchTests fallback notice:', err.message);
  }
  return [];
}

export async function fetchAssignments(filters = {}) {
  // Legacy stub: Test assignment is level-centric & automatic (AGENTS.md 2.5)
  return [];
}

// ============================================================
// ALIAS BERSIH UNTUK ADMIN COMPATIBILITY
// ============================================================
export async function publishTestDefinition(id) {
  const sb = await getSupabase();
  const { data, error } = await sb.from('tests').update({ status: 'PUBLISHED', updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) throw error;
  clearAdminCache('tests');
  return data;
}



export async function createTestInstance(payload) {
  return await adminInsert('assignments', payload);
}



// ============================================================
// MISSING ADMIN EXPORTS — Previously caused module link crash
// that prevented admin-login-btn listener from being attached.
// ============================================================

// --- Soft-delete fetch & restore ---
export async function adminFetchDeleted(table) {
  const normTable = (table || '').replace('-', '_');
  const sb = await getSupabase();
  const { data, error } = await sb.from(normTable).select('*').not('deleted_at', 'is', null);
  if (error) throw error;
  return data || [];
}

export async function adminRestore(table, id) {
  const normTable = (table || '').replace('-', '_');
  const sb = await getSupabase();
  const { error } = await sb.from(normTable).update({ deleted_at: null }).eq('id', id);
  if (error) throw error;
  clearAdminCache(normTable);
}

// --- Duplicate student detection & merge ---
export async function detectDuplicateStudents(scope = 'same_class') {
  const sb = await getSupabase();
  let query = sb.from('students').select('id, name, program_id, batch_id, deleted_at').is('deleted_at', null);
  const { data, error } = await query;
  if (error) throw error;
  const students = data || [];
  const groups = {};
  for (const s of students) {
    let key;
    if (scope === 'same_class') {
      key = (s.name || '').trim().toLowerCase() + '|' + (s.batch_id || '');
    } else {
      key = (s.name || '').trim().toLowerCase();
    }
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  }
  return Object.values(groups).filter(g => g.length > 1).map(g => ({
    name: g[0].name,
    candidates: g
  }));
}

export async function mergeStudentPair(keepId, removeId) {
  const sb = await getSupabase();
  // Reassign all attempts and progress records from removeId to keepId
  await Promise.all([
    sb.from('attempts').update({ student_id: keepId }).eq('student_id', removeId),
    sb.from('progress').update({ student_id: keepId }).eq('student_id', removeId),
  ]);
  // Soft-delete the duplicate
  await sb.from('students').update({ deleted_at: new Date().toISOString() }).eq('id', removeId);
  clearAdminCache('students');
  return { merged: true, kept: keepId, removed: removeId };
}

export async function mergeDuplicateStudents(duplicateGroups) {
  const results = [];
  for (const group of (duplicateGroups || [])) {
    if (!group || group.length < 2) continue;
    const [keep, ...rest] = group;
    for (const dup of rest) {
      const r = await mergeStudentPair(keep.id, dup.id);
      results.push(r);
    }
  }
  return results;
}

// --- Duplicate question detection & resequencing ---
export async function detectDuplicateQuestions(testId) {
  const sb = await getSupabase();
  let query = sb.from('test_items')
    .select('id, question_text_snapshot, test_id, display_order, options_snapshot, accepted_answers_snapshot, answer_type, created_at, tests!test_id(id, title)')
    .is('deleted_at', null);
  if (testId) query = query.eq('test_id', testId);
  const { data, error } = await query;
  if (error) {
    console.warn('detectDuplicateQuestions query error:', error.message);
    return {
      totalSameTestDupCount: 0,
      sameTestDuplicates: [],
      sameTestOrderConflicts: [],
      crossTestDuplicates: []
    };
  }
  const questions = data || [];
  const groups = {};
  for (const q of questions) {
    const text = (q.question_text_snapshot || '').trim().toLowerCase();
    if (!text) continue;
    const key = text + '|' + (q.test_id || '');
    if (!groups[key]) groups[key] = [];
    groups[key].push({
      id: q.id,
      test_id: q.test_id,
      question_order: q.display_order,
      display_order: q.display_order,
      answer_type: q.answer_type || 'written',
      answersCount: 0,
      created_at: q.created_at,
      question_text: q.question_text_snapshot,
      options_json: q.options_snapshot,
      correct_answer: Array.isArray(q.accepted_answers_snapshot) ? q.accepted_answers_snapshot[0] : (q.accepted_answers_snapshot || ''),
      tests: q.tests
    });
  }

  const sameTestDuplicates = Object.values(groups)
    .filter(g => g.length > 1)
    .map(g => ({
      recommendedPrimaryId: g[0].id,
      testTitle: g[0].tests?.title || 'Test',
      testTitle: g[0].tests?.title || 'Test',
      testId: g[0].test_id,
      testId: g[0].test_id,
      candidates: g
    }));

  return {
    totalSameTestDupCount: sameTestDuplicates.length,
    sameTestDuplicates,
    sameTestOrderConflicts: [],
    crossTestDuplicates: []
  };
}

export async function resequenceTestQuestions(testId) {
  const sb = await getSupabase();
  const { data, error } = await sb.from('test_items')
    .select('id, display_order')
    .eq('test_id', testId)
    .is('deleted_at', null)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  const updates = (data || []).map((q, idx) =>
    sb.from('test_items').update({ display_order: idx + 1 }).eq('id', q.id)
  );
  await Promise.all(updates);
  clearAdminCache('test_items');
}

export async function resolveDuplicateQuestionGroup(groupOrPrimaryId, keepIdOrDuplicateId) {
  const sb = await getSupabase();
  if (Array.isArray(groupOrPrimaryId)) {
    const keepId = keepIdOrDuplicateId;
    const toDelete = groupOrPrimaryId.filter(q => q.id !== keepId);
    for (const q of toDelete) {
      await sb.from('test_items').update({ deleted_at: new Date().toISOString() }).eq('id', q.id);
    }
  } else {
    const primaryId = groupOrPrimaryId;
    const duplicateId = keepIdOrDuplicateId;
    try {
      await sb.from('attempt_answers').update({ question_id: primaryId }).eq('question_id', duplicateId);
    } catch (e) {
      console.warn('Could not repoint attempt answers:', e.message);
    }
    await sb.from('test_items').update({ deleted_at: new Date().toISOString() }).eq('id', duplicateId);
  }
  clearAdminCache('test_items');
}

export async function batchResolveTestDuplicateQuestions(testId) {
  const data = await detectDuplicateQuestions(testId);
  const groups = data.sameTestDuplicates || (Array.isArray(data) ? data : []);
  let repointedCount = 0;
  for (const group of groups) {
    const primaryId = group.recommendedPrimaryId || (group.candidates && group.candidates[0]?.id);
    if (!primaryId || !group.candidates) continue;
    for (const cand of group.candidates) {
      if (cand.id !== primaryId) {
        await resolveDuplicateQuestionGroup(primaryId, cand.id);
        repointedCount++;
      }
    }
  }
  if (testId) await resequenceTestQuestions(testId);
  return {
    resolved: groups.length,
    groupsResolved: groups.length,
    totalRepointedAnswers: repointedCount
  };
}

// --- Recalibration engine ---
export async function previewRecalibrateTest(testId) {
  const sb = await getSupabase();
  const { data: attempts, error } = await sb.from('attempts')
    .select('id, student_id, score, percentage, grade, is_best_score')
    .eq('test_id', testId)
    .in('status', ['submitted', 'auto_submitted']);
  if (error) throw error;
  return { testId, attempts: attempts || [], count: (attempts || []).length };
}

export async function applyRecalibrateTest(testId) {
  const sb = await getSupabase();
  // Get all submitted attempts for this test
  const { data: attempts, error } = await sb.from('attempts')
    .select('id, student_id, score, percentage')
    .eq('test_id', testId)
    .in('status', ['submitted', 'auto_submitted'])
    .order('percentage', { ascending: false });
  if (error) throw error;
  // Re-mark best scores per student
  const sorted = [...(attempts || [])].sort((a, b) => {
    const scoreA = Number(a.percentage || 0);
    const scoreB = Number(b.percentage || 0);
    if (scoreB !== scoreA) return scoreB - scoreA;
    return (b.id > a.id ? 1 : -1);
  });
  const bestByStudent = {};
  for (const att of sorted) {
    if (!bestByStudent[att.student_id]) bestByStudent[att.student_id] = att.id;
  }
  const updates = (attempts || []).map(att =>
    sb.from('attempts').update({ is_best_score: bestByStudent[att.student_id] === att.id }).eq('id', att.id)
  );
  await Promise.all(updates);
  return { recalibrated: (attempts || []).length };
}

// --- Classes & topics (curriculum hierarchy) ---
export async function fetchClasses(institutionId) {
  return await adminFetchAll('classes', '*', institutionId ? { institution_id: institutionId } : {});
}

export async function fetchGlobalClasses(institutionId) {
  return await fetchClasses(institutionId);
}

export async function fetchTopics(classId) {
  const sb = await getSupabase();
  // Include class name join so UI can display it without a second query
  let query = sb.from('topics').select('*, classes(name)');
  if (classId) query = query.eq('class_id', classId);
  const { data, error } = await query.order('name');
  if (error) throw error;
  return data || [];
}

export async function createTopic(payload) {
  return await adminInsert('topics', payload);
}

export async function updateTopic(id, payload) {
  return await adminUpdate('topics', id, payload);
}

export async function deleteTopic(id) {
  return await adminSoftDelete('topics', id);
}

// --- Word types (validation dictionary) ---
export async function fetchWordTypes(classId) {
  const sb = await getSupabase();
  // word_types table has no deleted_at, order by name column
  let query = sb.from('word_types').select('id, name, is_active, class_id').order('name');
  if (classId) query = query.eq('class_id', classId);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createWordType(payload) {
  return await adminInsert('word_types', payload);
}

export async function toggleWordType(id, isActive) {
  const sb = await getSupabase();
  const { error } = await sb.from('word_types').update({ is_active: isActive }).eq('id', id);
  if (error) throw error;
}

// --- Question bank ---
export async function fetchCentralQuestions(filters = {}) {
  const sb = await getSupabase();
  // Include topic name join so UI can display it
  let query = sb.from('questions').select('*, topics(name, class_id)');
  if (filters.test_id) query = query.eq('test_id', filters.test_id);
  if (filters.class_id) query = query.eq('class_id', filters.class_id);
  if (filters.topic_id) query = query.eq('topic_id', filters.topic_id);
  const { data, error } = await query.order('created_at');
  if (error) throw error;
  return data || [];
}

export async function createCentralQuestion(payload) {
  return await adminInsert('questions', payload);
}

export async function updateCentralQuestion(id, payload) {
  return await adminUpdate('questions', id, payload);
}

export async function deleteCentralQuestion(id) {
  return await adminSoftDelete('questions', id);
}

// --- Test definitions (admin CRUD) ---
export async function fetchTestDefinitions(filters = {}) {
  const sb = await getSupabase();
  let query = sb.from('tests').select('*, classes(name), levels(name, level_number)');
  if (filters.class_id) query = query.eq('class_id', filters.class_id);
  if (filters.institution_id) query = query.eq('institution_id', filters.institution_id);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createTestDefinition(payload) {
  return await adminInsert('tests', payload);
}

export async function reorderTest(testId, newOrder, classId) {
  const sb = await getSupabase();
  const { data, error } = await sb.rpc('reorder_test', {
    p_test_id: testId,
    p_new_order: parseInt(newOrder, 10),
    p_class_id: classId || null
  });
  if (error) throw error;
  clearAdminCache('tests');
  return data;
}

export async function createTestDefinitionWithTopics(payload, topicIds = []) {
  const newTest = await adminInsert('tests', payload);
  if (topicIds && topicIds.length > 0) {
    const sb = await getSupabase();
    const topicPayload = topicIds.map(tid => ({ test_id: newTest.id, topic_id: tid }));
    const { error } = await sb.from('test_topics').insert(topicPayload);
    if (error) throw error;
  }
  return newTest;
}

export async function updateTestDefinition(id, payload) {
  return await adminUpdate('tests', id, { ...payload, updated_at: new Date().toISOString() });
}

export async function updateTestWithTopics(id, payload, topicIds = []) {
  const updatedTest = await adminUpdate('tests', id, { ...payload, updated_at: new Date().toISOString() });
  const sb = await getSupabase();
  // Clear existing topics
  await sb.from('test_topics').delete().eq('test_id', id);
  // Insert new topics
  if (topicIds && topicIds.length > 0) {
    const topicPayload = topicIds.map(tid => ({ test_id: id, topic_id: tid }));
    const { error } = await sb.from('test_topics').insert(topicPayload);
    if (error) throw error;
  }
  return updatedTest;
}

// --- Legacy Stubs for Deprecated Scheduling ---
export async function fetchTestInstances(filters = {}) { return []; }
export async function fetchClassInstances(filters = {}) { return []; }
export async function fetchClassInstanceRoster(instanceId) { return []; }
export async function addAdditionalMember(instanceId, studentId) { return null; }
export async function fetchClassMeetings(filters = {}) { return []; }

export async function invokeAIEvaluation(payload) {
  return await callEdgeFunction('evaluate-test', payload);
}

export async function fetchTestResultsFromDB(filters = {}) {
  const sb = await getSupabase();
  let query = sb.from('attempts')
    .select('id, student_id, test_id, score, percentage, grade, status, started_at, submitted_at, is_best_score, students(name), tests(title, classes(name))')
    .in('status', ['submitted', 'auto_submitted']);
  if (filters.test_id) query = query.eq('test_id', filters.test_id);
  if (filters.student_id) query = query.eq('student_id', filters.student_id);
  const { data, error } = await query.order('submitted_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ============================================================
// VOCABULARY VAULT — Server Time & WITA Sync
// ============================================================
export async function getServerTimeWita() {
  try {
    const sb = await getSupabase();
    const { data, error } = await sb.rpc('get_server_time_wita');
    if (!error && data) {
      const isoString = typeof data === 'object' ? (data.utc_iso || data.wita_timestamp) : data;
      return new Date(isoString);
    }
  } catch (_) {}
  const now = new Date();
  return new Date(now.getTime() + (now.getTimezoneOffset() + 480) * 60000);
}

// ============================================================
// VOCABULARY VAULT — CRUD & IMPORT
// ============================================================
export async function fetchVaultWords({ topic = null, search = null, targetLevel = null, programId = null, institutionId = null, limit = 10000, offset = 0 } = {}) {
  const sb = await getSupabase();
  const PAGE_SIZE = 1000;
  let allData = [];
  let curOffset = offset;
  const maxToFetch = limit || 10000;

  while (allData.length < maxToFetch) {
    const chunkLimit = Math.min(PAGE_SIZE, maxToFetch - allData.length);
    let query = sb.from('vocabulary_vault')
      .select('id, topic, indonesian, english, word_type, target_level, theme, theme_code, topic_code, category, institution_id, program_id, institutions(id, name, code), programs(id, name, code)')
      .is('deleted_at', null)
      .order('target_level', { ascending: true })
      .order('theme_code', { ascending: true })
      .order('topic_code', { ascending: true })
      .order('word_type', { ascending: true })
      .order('indonesian', { ascending: true })
      .range(curOffset, curOffset + chunkLimit - 1);

    if (targetLevel !== null) query = query.eq('target_level', targetLevel);
    if (programId) query = query.eq('program_id', programId);
    if (institutionId) query = query.eq('institution_id', institutionId);
    if (topic) query = query.eq('topic', topic);
    if (search) {
      const term = search.trim();
      query = query.or(`indonesian.ilike.%${term}%,english.ilike.%${term}%,topic.ilike.%${term}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) break;
    allData.push(...data);
    if (data.length < chunkLimit) break;
    curOffset += data.length;
  }

  return allData;
}

export async function fetchVaultTopics(targetLevelNum = null, programId = null) {
  const sb = await getSupabase();
  let query = sb.from('vocabulary_vault')
    .select('topic')
    .is('deleted_at', null);

  if (targetLevelNum !== null) {
    query = query.eq('target_level', targetLevelNum);
  }
  if (programId) {
    query = query.eq('program_id', programId);
  }

  const { data, error } = await query.order('topic', { ascending: true });
  if (error) throw error;
  const topics = [...new Set((data || []).map(r => r.topic).filter(Boolean))];
  return topics.sort((a, b) => a.localeCompare(b));
}

// Bulk-move all words belonging to the given topic names to a new target level
export async function moveVaultTopicsToLevel(topicNames, targetLevel) {
  if (!topicNames?.length) throw new Error('No topics selected.');
  const sb = await getSupabase();
  const { error } = await sb
    .from('vocabulary_vault')
    .update({ target_level: parseInt(targetLevel, 10) })
    .in('topic', topicNames)
    ;
  if (error) throw error;
}

export async function fetchVaultStats() {
  const sb = await getSupabase();
  const { data, error } = await sb.from('vocabulary_vault')
    .select('target_level, topic')
    .is('deleted_at', null);
  if (error) throw error;

  const stats = {};
  for (const row of (data || [])) {
    const lvl = row.target_level || 1;
    if (!stats[lvl]) {
      stats[lvl] = { total_words: 0, unique_topics: new Set() };
    }
    stats[lvl].total_words++;
    if (row.topic) stats[lvl].unique_topics.add(row.topic);
  }

  for (const lvl in stats) {
    stats[lvl].topics_count = stats[lvl].unique_topics.size;
    delete stats[lvl].unique_topics;
  }
  return stats;
}

export async function checkVaultDuplicates(newRows) {
  const sb = await getSupabase();
  const { data: vaultData, error } = await sb.from('vocabulary_vault')
    .select('id, theme, topic, indonesian, english, target_level, word_type, program_id')
    .is('deleted_at', null);
  if (error) throw error;
  const vault = vaultData || [];

  const cleanRows = [];
  const duplicateConflicts = [];
  const normStr = s => String(s || '').toLowerCase().trim().replace(/\s+/g, ' ');

  for (let i = 0; i < newRows.length; i++) {
    const row = newRows[i];
    const rowEng = normStr(row.english);
    const rowInd = normStr(row.indonesian);
    const rowTopic = normStr(row.topic);
    const rowLevel = parseInt(row.level || row.target_level || 1, 10) || 1;

    const rowType = normStr(row.word_type || 'Verb');

    const conflict = vault.find(v =>
        (!row.program_id || !v.program_id || v.program_id === row.program_id) &&
        normStr(v.topic) === rowTopic &&
        (normStr(v.indonesian) === rowInd || normStr(v.english) === rowEng)
    );

    if (conflict) {
      const isExact = normStr(conflict.english) === rowEng;
      duplicateConflicts.push({ index: i, row, existingRecord: conflict, conflictType: isExact ? 'EXACT' : 'PARTIAL' });
      continue;
    }

    cleanRows.push({ index: i, row });
  }

  return { cleanRows, duplicateConflicts };
}

function canonicalizeSynonyms(str) {
  if (!str) return '';
  const parts = String(str).split(/\s*[/;|]\s*/).map(s => s.trim()).filter(Boolean);
  return [...new Set(parts)].join(' / ');
}

function sanitizeVaultRow(row) {
  const rawEnglish = String(row.english || '').trim();
  const canonicalEng = canonicalizeSynonyms(rawEnglish);

  let wType = String(row.word_type || '').trim().replace(/\s+/g, ' ');
  const cat = String(row.category || '').toLowerCase();

  // If category is explicit, trust it to set word_type appropriately if it conflicts
  if (cat.includes('phrase')) {
    if (!['expression', 'idiom', 'proverb'].includes(wType.toLowerCase())) {
      wType = 'Expression';
    }
  } else if (cat.includes('word') || cat.includes('vocab')) {
    if (['expression', 'idiom', 'proverb'].includes(wType.toLowerCase())) {
      wType = 'Vocab';
    }
  }

  // Auto-detection logic for phrases ONLY if category wasn't explicit
  const isGeneric = !wType || ['vocab', 'vocabulary'].includes(wType.toLowerCase());

  if (isGeneric && !cat) {
    // Check if any of the synonyms contains multiple words
    const hasMultiWord = rawEnglish.split(/\s*[/;|]\s*/).some(syn => syn.trim().split(/\s+/).length >= 2);
    if (hasMultiWord) {
      wType = 'Expression'; // Auto-classify as phrase
    } else if (!wType) {
      wType = 'Vocab';
    }
  }

  const thCode = String(row.theme_code || '').trim().replace(/\s+/g, ' ').toUpperCase();
  let topCode = String(row.topic_code || '').trim().replace(/\s+/g, ' ').toUpperCase();

  // If topCode is missing or just numeric, normalize it with themeCode
  if (!topCode && thCode) {
    topCode = `${thCode}1`;
  } else if (/^[0-9]+$/.test(topCode) && thCode) {
    topCode = `${thCode}${topCode}`;
  }

  return {
    institution_id: row.institution_id || row.institutionId || null,
    program_id: row.program_id || row.programId || null,
    theme_code: thCode || (topCode ? topCode[0] : 'A'),
    theme:      String(row.theme || '').trim().replace(/\s+/g, ' '),
    topic_code: topCode || 'A1',
    topic:      String(row.topic || '').trim().replace(/\s+/g, ' '),
    indonesian: String(row.indonesian || '').trim().replace(/\s+/g, ' '),
    english:    canonicalEng,
    word_type:  wType,
    target_level: parseInt(row.level || row.target_level || 1, 10) || 1
  };
}

export async function importVaultWords(rows, resolutionMap = {}, onProgress = null) {
  const sb = await getSupabase();
  const toInsert = [];
  const toUpdate = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const resolution = resolutionMap[i];
    const clean = sanitizeVaultRow(row);

    if (!resolution) {
      toInsert.push({ ...clean, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      continue;
    }
    if (resolution === 'skip') continue;
    if (resolution === 'overwrite') {
      toUpdate.push({ id: row._existingId, ...clean, updated_at: new Date().toISOString() });
      continue;
    }
    if (resolution === 'merge' && row._existingId) {
      const existingParts = (row._existingEnglish || '').split(' / ').map(s => s.trim()).filter(Boolean);
      const incomingParts = clean.english.split(' / ').map(s => s.trim()).filter(Boolean);
      const merged = [...new Set([...existingParts, ...incomingParts])].join(' / ');
      toUpdate.push({ id: row._existingId, english: merged, updated_at: new Date().toISOString() });
      continue;
    }
    toInsert.push({ ...clean, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  }

  const results = { inserted: 0, updated: 0, skipped: 0 };

  const CHUNK_SIZE = 50;
  const insertChunks = Math.ceil(toInsert.length / CHUNK_SIZE);
  const totalOps = insertChunks + toUpdate.length;
  let currentOps = 0;

  if (toInsert.length > 0) {
    for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
      const chunk = toInsert.slice(i, i + CHUNK_SIZE);
      if (onProgress) {
        currentOps++;
        onProgress((currentOps / totalOps) * 100, `Inserting new words (Batch ${Math.ceil(i/CHUNK_SIZE)+1}/${insertChunks})...`);
      }
      const { error } = await sb.from('vocabulary_vault').insert(chunk);
      if (error) throw error;
      results.inserted += chunk.length;
    }
  }

  let updIndex = 0;
  for (const upd of toUpdate) {
    updIndex++;
    if (onProgress) {
      currentOps++;
      onProgress((currentOps / totalOps) * 100, `Updating word ${updIndex} of ${toUpdate.length}...`);
    }
    const { id, ...fields } = upd;
    const { error } = await sb.from('vocabulary_vault').update(fields).eq('id', id);
    if (!error) results.updated++;
  }

  results.skipped = rows.length - results.inserted - results.updated;

  // Auto-register theme_program_assignments for imported themes with program_id
  const uniqueAssignments = new Map();
  for (const item of [...toInsert, ...toUpdate]) {
    if (item.theme_code && item.target_level && item.program_id) {
      const key = `${item.theme_code}_${item.target_level}_${item.program_id}`;
      if (!uniqueAssignments.has(key)) {
        uniqueAssignments.set(key, {
          theme_code: item.theme_code,
          target_level: item.target_level,
          program_id: item.program_id,
          is_active: true,
          updated_at: new Date().toISOString()
        });
      }
    }
  }

  if (uniqueAssignments.size > 0) {
    try {
      const assignmentList = Array.from(uniqueAssignments.values());
      const { error: assignErr } = await sb.from('theme_program_assignments')
        .upsert(assignmentList, { onConflict: 'theme_code, target_level, program_id' });
      if (assignErr) {
        console.warn('[importVaultWords] theme_program_assignments upsert error:', assignErr);
      }
    } catch (e) {
      console.warn('[importVaultWords] Failed to auto-register theme_program_assignments:', e);
    }
  }

  clearApiCache('vault');
  return results;
}


export async function mergeVaultDuplicates(groups) {
  const sb = await getSupabase();
  for (const group of groups) {
    const primary = group[0];
    const others = group.slice(1);

    let allEnglish = [];
    for (const w of group) {
      allEnglish.push(...(w.english || '').split(/\s*[/;|]\s*/).map(s => s.trim()).filter(Boolean));
    }
    const mergedEnglish = [...new Set(allEnglish)].join(' / ');

    const { error: updErr } = await sb.from('vocabulary_vault').update({
      english: mergedEnglish,
      updated_at: new Date().toISOString()
    }).eq('id', primary.id);
    if (updErr) throw updErr;

    for (const o of others) {
      await sb.from('vocabulary_vault').update({ deleted_at: new Date().toISOString() }).eq('id', o.id);
    }
  }
  clearApiCache('vault');
  return true;
}

export async function deleteVaultWord(id) {
  const sb = await getSupabase();
  const { error } = await sb.from('vocabulary_vault').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
  clearApiCache('vault');
  return true;
}

export async function updateVaultWord(id, payload) {
  const sb = await getSupabase();
  payload.updated_at = new Date().toISOString();
  const { error } = await sb.from('vocabulary_vault').update(payload).eq('id', id);
  if (error) throw error;
  clearApiCache('vault');
  return true;
}

export async function renameVaultTopic(oldTopic, newTopic) {
  const sb = await getSupabase();
  const { error } = await sb.from('vocabulary_vault')
    .update({ topic: newTopic, updated_at: new Date().toISOString() })
    .eq('topic', oldTopic)
    .is('deleted_at', null);
  if (error) throw error;
  clearApiCache('vault');
  return true;
}

export async function renameVaultTheme(oldTheme, newTheme) {
  const sb = await getSupabase();
  const { error } = await sb.from('vocabulary_vault')
    .update({ theme: newTheme, updated_at: new Date().toISOString() })
    .eq('theme', oldTheme)
    .is('deleted_at', null);
  if (error) throw error;
  clearApiCache('vault');
  return true;
}

export async function updateVaultThemeCascade(oldTheme, newTheme, targetLevel = null, themeCode = null) {
  const sb = await getSupabase();
  let query = sb.from('vocabulary_vault')
    .update({ theme: newTheme, updated_at: new Date().toISOString() })
    .is('deleted_at', null);

  if (themeCode && targetLevel) {
    // Definitive composite key matching: guarantees update even if old theme was NULL, empty, or 'Unassigned'
    query = query.eq('theme_code', themeCode).eq('target_level', targetLevel);
  } else {
    if (targetLevel) query = query.eq('target_level', targetLevel);
    if (!oldTheme || oldTheme.trim().toLowerCase() === 'unassigned') {
      query = query.or('theme.is.null,theme.eq.,theme.eq.Unassigned');
    } else {
      query = query.ilike('theme', oldTheme.trim());
    }
  }

  const { error } = await query;
  if (error) throw error;
  clearApiCache('vault');
  return true;
}

export async function updateVaultThemeCodeCascade(oldCode, newCode, targetLevel = null) {
  const sb = await getSupabase();
  const cleanOld = String(oldCode || '').trim().toUpperCase();
  const cleanNew = String(newCode || '').trim().toUpperCase();

  // 1. Update vocabulary_vault theme_code
  let query = sb.from('vocabulary_vault')
    .update({ theme_code: cleanNew, updated_at: new Date().toISOString() })
    .eq('theme_code', cleanOld)
    .is('deleted_at', null);
  if (targetLevel) query = query.eq('target_level', targetLevel);
  const { error } = await query;
  if (error) throw error;

  // 2. Cascade to theme_program_assignments so assigned classes/programs are not orphaned
  try {
    let assignQuery = sb.from('theme_program_assignments')
      .update({ theme_code: cleanNew, updated_at: new Date().toISOString() })
      .eq('theme_code', cleanOld);
    if (targetLevel) assignQuery = assignQuery.eq('target_level', targetLevel);
    await assignQuery;
  } catch (err) {
    console.warn('[updateVaultThemeCodeCascade] assign cascade notice:', err);
  }

  // 3. Update any topic_code that was prefixed with oldCode (e.g. A1 -> B1)
  try {
    let topicCodeQuery = sb.from('vocabulary_vault')
      .select('id, topic_code')
      .eq('theme_code', cleanNew)
      .is('deleted_at', null);
    if (targetLevel) topicCodeQuery = topicCodeQuery.eq('target_level', targetLevel);
    const { data: tpRows } = await topicCodeQuery;
    if (tpRows && tpRows.length > 0) {
      for (const row of tpRows) {
        if (row.topic_code && row.topic_code.startsWith(cleanOld)) {
          const updatedTpCode = cleanNew + row.topic_code.slice(cleanOld.length);
          await sb.from('vocabulary_vault').update({ topic_code: updatedTpCode }).eq('id', row.id);
        }
      }
    }
  } catch (_) {}

  clearApiCache('vault');
  return true;
}

export async function updateVaultTopicCascade(oldTopic, newTopic, targetLevel = null, themeCode = null) {
  const sb = await getSupabase();
  let query = sb.from('vocabulary_vault')
    .update({ topic: newTopic, updated_at: new Date().toISOString() })
    .ilike('topic', String(oldTopic || '').trim())
    .is('deleted_at', null);
  if (targetLevel) query = query.eq('target_level', targetLevel);
  if (themeCode) query = query.eq('theme_code', themeCode);
  const { error } = await query;
  if (error) throw error;
  clearApiCache('vault');
  return true;
}

export async function updateVaultTopicCodeCascade(oldCode, newCode, targetLevel = null, topic = null, themeCode = null) {
  const sb = await getSupabase();
  let query = sb.from('vocabulary_vault')
    .update({ topic_code: newCode, updated_at: new Date().toISOString() })
    .is('deleted_at', null);
  if (topic) query = query.ilike('topic', String(topic || '').trim());
  else if (oldCode) query = query.eq('topic_code', oldCode);
  if (targetLevel) query = query.eq('target_level', targetLevel);
  if (themeCode) query = query.eq('theme_code', themeCode);
  const { error } = await query;
  if (error) throw error;
  clearApiCache('vault');
  return true;
}

export async function updateVaultTopicLevelCascade(topic, oldLevel, newLevel, themeCode = null) {
  const sb = await getSupabase();
  let query = sb.from('vocabulary_vault')
    .update({ target_level: newLevel, updated_at: new Date().toISOString() })
    .ilike('topic', String(topic || '').trim())
    .is('deleted_at', null);
  if (oldLevel) query = query.eq('target_level', oldLevel);
  if (themeCode) query = query.eq('theme_code', themeCode);
  const { error } = await query;
  if (error) throw error;
  clearApiCache('vault');
  return true;
}

export async function deleteVaultTopic(topic, targetLevel = null, themeCode = null) {
  const sb = await getSupabase();
  let query = sb.from('vocabulary_vault')
    .update({ deleted_at: new Date().toISOString() })
    .ilike('topic', String(topic || '').trim())
    .is('deleted_at', null);
  if (targetLevel) query = query.eq('target_level', targetLevel);
  if (themeCode) query = query.eq('theme_code', themeCode);
  const { error } = await query;
  if (error) throw error;
  clearApiCache('vault');
  return true;
}

export async function deleteVaultTheme(theme, targetLevel = null, themeCode = null) {
  const sb = await getSupabase();
  let query = sb.from('vocabulary_vault')
    .update({ deleted_at: new Date().toISOString() })
    .is('deleted_at', null);
  if (themeCode && targetLevel) {
    query = query.eq('theme_code', themeCode).eq('target_level', targetLevel);
  } else {
    query = query.ilike('theme', String(theme || '').trim());
    if (targetLevel) query = query.eq('target_level', targetLevel);
  }
  const { error } = await query;
  if (error) throw error;
  clearApiCache('vault');
  return true;
}

// ─── Theme-Program Multi-Tenant Assignments ────────────────
export async function fetchThemeProgramAssignments() {
  const sb = await getSupabase();
  const { data, error } = await sb
    .from('theme_program_assignments')
    .select('id, theme_code, target_level, program_id, is_active')
    .is('is_active', true);
  if (error) {
    console.warn('fetchThemeProgramAssignments notice:', error.message);
    return [];
  }
  return data || [];
}

export async function toggleThemeProgramAssignment({ themeCode, targetLevel, programId, assign }) {
  const sb = await getSupabase();
  const thCode = String(themeCode).trim().toUpperCase();
  const lvl = parseInt(targetLevel, 10);

  if (assign) {
    const { error } = await sb
      .from('theme_program_assignments')
      .upsert({
        theme_code: thCode,
        target_level: lvl,
        program_id: programId,
        is_active: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'theme_code,target_level,program_id' });
    if (error) throw error;
  } else {
    const { error } = await sb
      .from('theme_program_assignments')
      .delete()
      .eq('theme_code', thCode)
      .eq('target_level', lvl)
      .eq('program_id', programId);
    if (error) throw error;
  }
  clearApiCache('vault');
  return true;
}

// ============================================================
// VOCABULARY MASTERY — Test Builder & Stratified Sampler
// ============================================================
function stratifiedSample(topicMap, quota) {
  const topics = [...topicMap.keys()];
  const totalWords = [...topicMap.values()].reduce((s, a) => s + a.length, 0);
  if (quota >= totalWords) return [...topicMap.values()].flat();

  const n = topics.length;
  const basePerTopic = Math.floor(quota / n);
  let remainder = quota - basePerTopic * n;
  const sortedTopics = [...topics].sort((a, b) => topicMap.get(b).length - topicMap.get(a).length);

  const result = [];
  for (const topic of topics) {
    const words = [...topicMap.get(topic)];
    let count = basePerTopic;
    if (remainder > 0 && sortedTopics.indexOf(topic) < remainder) count++;
    for (let i = words.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [words[i], words[j]] = [words[j], words[i]];
    }
    result.push(...words.slice(0, count));
  }
  return result;
}

export async function createVocabMasteryTest(config) {
  const sb = await getSupabase();
  const {
    institutionId, programId, classId, levelId,
    tier, title,
    questionOrder = 'random',
    scheduleMode = 'batch',
    windowStart = null, windowEnd = null,
    durationMinutes = 60,
    quotaMode = 'full', customQuota = null,
    sourceTopic = null, sourceTaskIds = [], sourceQuizIds = [],
    answerType = 'written',
    testType = 'VOCAB_MASTERY',
    // NEW: explicit category for the Task/Test binary taxonomy
    // Defaults derived from tier if not explicitly set
    test_type = null
  } = config;

  let vaultWords = [];
  let sourceTopics = [];

  // Determine Target Level safely
  let targetLevel = 1;
  let isAllLevels = false;
  try {
    const { data: lvlData } = await sb.from('levels').select('id, level_number').eq('id', levelId).single();
    if (lvlData) {
        targetLevel = typeof lvlData.level_number === 'number' ? lvlData.level_number : 1;
        if (lvlData.level_number == null) isAllLevels = true;
    }
  } catch (e) {
    console.warn("Could not fetch level_number, defaulting to 1");
  }

  if (tier === 'TASK') {
    if (!sourceTopic) throw new Error('sourceTopic is required for TASK tier.');
    let q = sb.from('vocabulary_vault')
      .select('id, topic, indonesian, english, word_type, target_level, theme, theme_code, topic_code')
      .eq('topic', sourceTopic)
      .is('deleted_at', null);
    if (!isAllLevels) q = q.eq('target_level', targetLevel);

    if (testType === 'IDIOM_PROVERB') {
      q = q.in('word_type', ['Idiom', 'Proverb', 'Expression', 'Phrase']);
    }

    const { data, error } = await q.order('topic').order('indonesian');
    if (error) throw error;
    vaultWords = data || [];
    sourceTopics = [sourceTopic];
  } else if (tier === 'TEST') {
    // 🔴 TEST TIER: Aggregates from selected TASK tests (Cumulative theme/grand test)
    if (!sourceTaskIds || !sourceTaskIds.length) throw new Error('sourceTaskIds required for TEST tier aggregation.');

    // 1. Get all questions from the selected Tasks to extract their topics
    const { data: aqs, error: aqErr } = await sb.from('test_items')
      .select('topic_snapshot')
      .in('test_id', sourceTaskIds);
    if (aqErr) throw aqErr;

    // 2. Extract unique topics
    const topicsSet = new Set();
    (aqs || []).forEach(aq => {
      if (aq.topic_snapshot) topicsSet.add(aq.topic_snapshot);
    });
    sourceTopics = [...topicsSet];

    if (sourceTopics.length === 0) {
      throw new Error('No topics found in the selected Tasks. Cannot generate Test.');
    }

    // 3. Fetch words for all accumulated topics
    let q = sb.from('vocabulary_vault')
      .select('id, topic, indonesian, english, word_type, target_level, theme, theme_code, topic_code')
      .in('topic', sourceTopics)
      .is('deleted_at', null);
    if (!isAllLevels) q = q.eq('target_level', targetLevel);

    // Support PHRASE_RECOGNITION filtering
    if (testType === 'IDIOM_PROVERB' ) {
      q = q.in('word_type', ['Idiom', 'Proverb', 'Expression', 'Phrase']);
    }

    const { data, error } = await q.order('topic').order('indonesian');
    if (error) throw error;
    vaultWords = data || [];
  } else if (tier === 'QUIZ') {
    // @deprecated — Legacy tier. Use tier='TEST' for new tests.
    // Kept for backward compatibility with existing student data.
    if (!sourceQuizIds.length) throw new Error('sourceQuizIds required for EXAM tier.');
    const { data: aqs } = await sb.from('test_items').select('topic_snapshot').in('test_id', sourceQuizIds);
    const topicsSet = new Set();
    (aqs || []).forEach(aq => {
      if (aq.topic_snapshot) topicsSet.add(aq.topic_snapshot);
    });
    sourceTopics = [...topicsSet];
    let q = sb.from('vocabulary_vault')
      .select('id, topic, indonesian, english, word_type, target_level, theme, theme_code, topic_code')
      .in('topic', sourceTopics)
      .is('deleted_at', null);
    if (!isAllLevels) q = q.eq('target_level', targetLevel);
    const { data, error } = await q.order('topic').order('indonesian');
    if (error) throw error;
    vaultWords = data || [];
  }

  const totalGatheredWords = vaultWords.length;
  if (!totalGatheredWords) throw new Error('No words found in Vault for the selected source.');

  // Shuffle helper
  const fisherYates = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  let selectedWords = vaultWords;
  // IDIOM_PROVERB: enforce exactly 10 random questions
  if (testType === 'IDIOM_PROVERB') {
    selectedWords = fisherYates([...vaultWords]).slice(0, 10);
  } else if (quotaMode === 'custom' && customQuota && customQuota < totalGatheredWords) {
    const topicMap = new Map();
    for (const w of vaultWords) {
      if (!topicMap.has(w.topic)) topicMap.set(w.topic, []);
      topicMap.get(w.topic).push(w);
    }
    selectedWords = stratifiedSample(topicMap, customQuota);
  }

  // Resolve the final test_type (PostgreSQL enum: 'quiz' | 'exam') and category ('TASK' | 'EXAM'):
  const isQuizTier = tier === 'QUIZ' || tier === 'TASK' || String(test_type).toLowerCase() === 'quiz' || test_type === 'TASK';
  const resolvedType = isQuizTier ? 'quiz' : 'exam';
  const resolvedCategory = isQuizTier ? 'TASK' : 'EXAM';

  let defaultAnswerType = answerType;
  if (testType === 'IDIOM_PROVERB' ) {
      defaultAnswerType = 'phrase_recognition';
  } else if (isQuizTier) {
      defaultAnswerType = 'spoken';
  } else {
      defaultAnswerType = 'spoken';
  }

  const testPayload = {
    institution_id:           institutionId,
    program_id:               programId,
    class_id:                 classId,
    level_id:                 levelId,
    test_subtype:          'VOCAB_' + (isQuizTier ? 'TASK' : 'EXAM'),
    test_type:                resolvedType,
    category:                 resolvedCategory,
    title:                    title,
    description:              'Vocabulary Mastery (' + (isQuizTier ? 'Task' : 'Exam') + '). Topics: ' + sourceTopics.join(', '),
    status:                   'PUBLISHED',
    availability_start:       windowStart || null,
    availability_end:         windowEnd || null,
    working_duration_minutes: durationMinutes || null,
    prerequisite_test_id:
      ((tier === 'QUIZ' || tier === 'TASK') && sourceTaskIds.length > 0) ? sourceTaskIds[0] :
      (tier === 'EXAM' && sourceQuizIds.length > 0) ? sourceQuizIds[0] :
      (tier === 'TEST' && sourceTaskIds.length > 0) ? sourceTaskIds[sourceTaskIds.length - 1] : null,
    created_by:               'Admin (Vault)',
    created_at:               new Date().toISOString(),
    updated_at:               new Date().toISOString()
  };

  const { data: newTest, error: asmErr } = await sb.from('tests').insert(testPayload).select('id').single();
  if (asmErr) throw asmErr;
  const testId = newTest.id;

  // Build global pool and per-type pools for distractor selection
  let distractorSource = vaultWords;

  // Fetch a universal pool to ensure we have enough same-type distractors (e.g. 9 Idioms)
  const needsDistractors = vaultWords.some(w => {
    const isPhrase = ['idiom', 'proverb', 'expression', 'phrase'].includes((w.word_type || '').toLowerCase());
    return isPhrase || (answerType || '').startsWith('dropdown');
  });

  if (needsDistractors) {
    const { data: universalWords } = await sb.from('vocabulary_vault').select('english, word_type').is('deleted_at', null);
    if (universalWords && universalWords.length > 0) {
      distractorSource = universalWords;
    }
  }

  const allEnglishAnswers = [...new Set(distractorSource.map(w => canonicalizeSynonyms(w.english).split(' / ')[0].trim()))];

  // Same-type distractor pools (for IDIOM_PROVERB: Expression / Idiom / Proverb stay separate)
  const typeDistractorPools = {};
  distractorSource.forEach(w => {
    const type = (w.word_type || 'Vocab').toLowerCase();
    if (!typeDistractorPools[type]) typeDistractorPools[type] = new Set();
    typeDistractorPools[type].add(canonicalizeSynonyms(w.english).split(' / ')[0].trim());
  });

  for (const type in typeDistractorPools) {
    typeDistractorPools[type] = Array.from(typeDistractorPools[type]);
  }

  const aqRows = selectedWords.map((word, idx) => {
    const answers = canonicalizeSynonyms(word.english).split(' / ').map(s => s.trim()).filter(Boolean);
    const isPhrase = ['idiom', 'proverb', 'expression', 'phrase'].includes((word.word_type || '').toLowerCase());

    let currentAnswerType = answerType;
    if (isPhrase) {
      currentAnswerType = 'phrase_recognition';
    } else {
      if (tier === 'TASK') currentAnswerType = 'spoken';
      else if (tier === 'TEST' || tier === 'QUIZ' || tier === 'EXAM') currentAnswerType = 'written';
    }

    let optionsSnapshot = null;
    if (currentAnswerType.startsWith('dropdown') || currentAnswerType === 'phrase_recognition') {
      const correctAns = answers[0];
      const numDistractors = (currentAnswerType === 'dropdown_10' || currentAnswerType === 'phrase_recognition') ? 9 : 4;

      // For IDIOM_PROVERB: prefer same-type distractors first
      const wordType = (word.word_type || 'Vocab').toLowerCase();
      let sameTypePool = (typeDistractorPools[wordType] || []).filter(a => !answers.includes(a));
      fisherYates(sameTypePool);

      // If same-type pool is too small, pad with global pool
      const globalPool = allEnglishAnswers.filter(a => !answers.includes(a) && !sameTypePool.includes(a));
      fisherYates(globalPool);
      const distractors = [...sameTypePool, ...globalPool].slice(0, numDistractors);

      // Combine correct answer + distractors and shuffle final list
      const finalOptions = fisherYates([correctAns, ...distractors]);
      optionsSnapshot = finalOptions;
    }

    return {
      test_id:             testId,
      question_id:               null,
      question_text_snapshot:    word.indonesian,
      accepted_answers_snapshot: answers,
      options_snapshot:          optionsSnapshot || [],
      topic_snapshot:            word.topic || 'General',
      word_type_snapshot:        word.word_type || 'Verb',
      answer_type:               currentAnswerType,
      display_order:             idx + 1,
      created_at: new Date().toISOString()
    };
  });

  const CHUNK = 200;
  for (let i = 0; i < aqRows.length; i += CHUNK) {
    const chunk = aqRows.slice(i, i + CHUNK);
    const { error: qErr } = await sb.from('test_items').insert(chunk);
    if (qErr) throw qErr;
  }

  clearApiCache('vault');
  clearApiCache('tests');
  clearAdminCache('tests');
  return { testId, title, tier, totalWords: totalGatheredWords, sampledWords: selectedWords.length, sourceTopics };
}

// ============================================================
// LEVEL-UP ENGINE (AUDITS ALL EXAMS IN CURRENT LEVEL)
// ============================================================
export async function checkAndTriggerLevelUp(studentId, currentLevelId) {
  const sb = await getSupabase();
  const { data: levelData, error: lvlErr } = await sb.from('levels')
    .select('id, level_number')
    .eq('id', currentLevelId)
    .single();
  if (lvlErr || !levelData) return { levelUp: false, newLevel: null, status: 'ERROR' };

  // Level-up gate: ONLY the Final Theme TEST (tier = TEST) for this level
  // The single test that counts is the highest display_order TEST with >= 60% to advance
  const { data: exams, error: exErr } = await sb.from('tests')
    .select('id, title, display_order, shell_code, levels!inner(level_number)')
    .eq('level_id', currentLevelId)
    .neq('levels.level_number', 0)
    .in('category', ['EXAM', 'TEST'])
    .eq('status', 'PUBLISHED')
    .order('display_order', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1); // Only the final TEST (highest display_order) counts as the gating test
  if (exErr || !exams || exams.length === 0) return { levelUp: false, newLevel: null, status: 'NO_TESTS' };

  const examIds = exams.map(e => e.id);
  const { data: attempts, error: attErr } = await sb.from('attempts')
    .select('test_id, percentage, effective_score')
    .eq('student_id', studentId)
    .in('test_id', examIds)
    .in('status', ['submitted', 'auto_submitted']);
  if (attErr) return { levelUp: false, newLevel: null, status: 'ERROR' };

  const bestScoreMap = {};
  (attempts || []).forEach(a => {
    const rawScore = a.effective_score !== null && a.effective_score !== undefined ? a.effective_score : a.percentage;
    bestScoreMap[a.test_id] = Math.max(bestScoreMap[a.test_id] || 0, parseFloat(rawScore || 0));
  });

  const allPassed = examIds.every(id => (bestScoreMap[id] || 0) >= 60);
  if (!allPassed) return { levelUp: false, newLevel: null, status: 'NOT_ALL_PASSED' };

  const currentLevelNum = levelData.level_number || 1;
  if (currentLevelNum >= 3) {
    await sb.from('students').update({ program_status: 'PROGRAM_COMPLETED' }).eq('id', studentId);
    return { levelUp: true, newLevel: null, status: 'PROGRAM_COMPLETED' };
  }

  const nextLevelNum = currentLevelNum + 1;
  const { data: nextLevel, error: nlErr } = await sb.from('levels')
    .select('id, name')
    .eq('level_number', nextLevelNum)
    .single();
  if (nlErr || !nextLevel) return { levelUp: false, newLevel: null, status: 'NEXT_LEVEL_NOT_FOUND' };

  await sb.from('students').update({ level_id: nextLevel.id }).eq('id', studentId);

  if (typeof sessionStorage !== 'undefined') {
    const sessionStr = sessionStorage.getItem('topscore_session');
    if (sessionStr) {
      try {
        const sessionObj = JSON.parse(sessionStr);
        sessionObj.level_id = nextLevel.id;
        sessionObj.level_name = nextLevel.name;
        sessionObj.level_number = nextLevelNum;
        sessionStorage.setItem('topscore_session', JSON.stringify(sessionObj));
      } catch (e) {
        console.error('Error updating session storage for level up', e);
      }
    }
    sessionStorage.setItem('topscore_pending_levelup_celebration', nextLevel.name);
  }

  return { levelUp: true, newLevel: nextLevel.name, status: 'LEVELED_UP' };
}

export async function fetchStudentLevel(studentId) {
  const sb = await getSupabase();
  const { data, error } = await sb.from('students')
    .select(`
      level_id,
      levels:level_id(id, level_number, name),
      batch_id,
      batches:batch_id(current_level_id, levels:current_level_id(id, level_number, name))
    `)
    .eq('id', studentId)
    .single();

  if (error || !data) {
    if (error) console.error("fetchStudentLevel Error:", error);
    return { level_id: null, level_number: 1, level_name: '1st Level' };
  }

  const lvlId = data.level_id || data.batches?.current_level_id || null;
  const lvlNum = data.levels?.level_number || data.batches?.levels?.level_number || 1;
  const lvlName = data.levels?.name || data.batches?.levels?.name || '1st Level';
  return { level_id: lvlId, level_number: lvlNum, level_name: lvlName };
}

export async function exportVaultWords(mode = 'all') {
  const sb = await getSupabase();
  let query = sb.from('vocabulary_vault')
    .select('institution_id, program_id, target_level, theme_code, theme, topic_code, topic, indonesian, english, word_type, created_at, institutions!institution_id(name), programs!program_id(name)')
    .is('deleted_at', null)
    .range(0, 99999)
    .order('target_level', { ascending: true })
    .order('theme_code', { ascending: true })
    .order('topic_code', { ascending: true })
    .order('word_type', { ascending: true })
    .order('indonesian', { ascending: true });

  const { data: words, error } = await query;

  if (error) throw new Error('Failed to fetch words for export: ' + error.message);
  if (!words || words.length === 0) throw new Error('No words found in Vault.');

  let filteredWords = words;
  if (mode === 'single_words') {
    filteredWords = words.filter(w => !['expression', 'idiom', 'proverb'].includes((w.word_type || '').toLowerCase()));
  } else if (mode === 'phrases') {
    filteredWords = words.filter(w => ['expression', 'idiom', 'proverb'].includes((w.word_type || '').toLowerCase()));
  }

  if (filteredWords.length === 0) throw new Error('No words found in Vault for this category.');

  // Format data for Excel - 10 Column Unified Standard
  const exportData = filteredWords.map(w => {
    const wt = (w.word_type || '').toLowerCase();
    const isPhrase = ['expression', 'idiom', 'proverb'].includes(wt);
    const code = (w.topic_code && w.topic_code.trim()) ? w.topic_code.trim() : ((w.theme_code || 'A') + '1');
    return {
      Institution: w.institutions?.name || 'CEC',
      Program: w.programs?.name || 'Camp',
      Level: w.target_level || '1',
      Category: isPhrase ? 'Phrases' : 'Words',
      Code: code,
      Theme: w.theme || '',
      Topic: w.topic || '',
      Type: w.word_type || 'Vocab',
      Indonesian: w.indonesian || '',
      English: w.english || ''
    };
  });

  // Create workbook and worksheet
  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "VaultWords");

  // Export
  XLSX.writeFile(wb, `Vocabulary_Vault_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export async function adminUnlockRemedialExam(attemptId) {
  const sb = await getSupabase();
  const { data: currentAtt } = await sb.from('attempts').select('id, student_id, test_id, is_remedial_unlocked').eq('id', attemptId).single();
  const { data, error } = await sb.from('attempts')
    .update({ is_remedial_unlocked: true, updated_at: new Date().toISOString() })
    .eq('id', attemptId)
    .select().single();
  if (error) throw error;

  // Rule 2.10: Paired Theme Exam Remedial Synchronization ("Satu Paket")
  // If this exam belongs to a theme package, also synchronize its paired sibling exam for this student
  if (currentAtt?.test_id && currentAtt?.student_id) {
    try {
      const { data: currentTest } = await sb.from('tests').select('id, class_id, shell_code, payload').eq('id', currentAtt.test_id).single();
      if (currentTest?.shell_code && currentTest.shell_code.includes('-EXAM')) {
        const rawTheme = currentTest.payload?.theme_code || currentTest.shell_code.replace(/^[0-9]+/, '').charAt(0) || 'A';
        const tc = rawTheme.toUpperCase();
        const { data: siblingTests } = await sb.from('tests')
          .select('id, shell_code, payload')
          .eq('class_id', currentTest.class_id)
          .ilike('shell_code', `%${tc}-%-EXAM%`)
          .neq('id', currentTest.id);

        if (siblingTests && siblingTests.length > 0) {
          for (const sTest of siblingTests) {
            const { data: siblingAtts } = await sb.from('attempts')
              .select('id, score, total_questions')
              .eq('student_id', currentAtt.student_id)
              .eq('test_id', sTest.id);

            if (siblingAtts && siblingAtts.length > 0) {
              for (const sAtt of siblingAtts) {
                const totalQ = Number(sAtt.total_questions || 70);
                const maxRemPts = totalQ * 0.6;
                const effScore = Math.min(Number(sAtt.score ?? 0), maxRemPts);
                await sb.from('attempts')
                  .update({
                    is_remedial_unlocked: true,
                    effective_score: effScore,
                    grade: 'C',
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', sAtt.id);
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('[adminUnlockRemedialExam] Sibling exam remedial sync warning:', e);
    }
  }

  clearAdminCache('attempts');
  return data;
}

export async function adminOverridePrerequisitesWithRemedial({
  classId,
  studentIds = [],
  selectedTestIds = null,       // NEW: explicit list of test IDs to override (null = use legacy targetThemeCode logic)
  targetScorePercent = 60,      // NEW: target fill score, default 60% (remedial)
  onlyFillEmpty = false,         // NEW: if true, skip students who have ANY attempt (even failed); default false = fill empty OR below target
  unlockLiveSessions = false,
  // Legacy params (kept for backward compat, used when selectedTestIds is null)
  targetThemeCode = 'ALL',
  targetExamId = null,
  includeWordsExamIfPhrasesSelected = true
}) {
  const sb = await getSupabase();

  if (!classId) throw new Error('classId is required for prerequisite override.');

  // 1. Fetch all tests for this class ordered by display_order
  const { data: allClassTests, error: testErr } = await sb
    .from('tests')
    .select('id, title, test_type, category, shell_code, display_order, payload, class_id, level_id')
    .eq('class_id', classId)
    .order('display_order', { ascending: true });

  if (testErr) throw testErr;
  if (!allClassTests || allClassTests.length === 0) {
    throw new Error('No tests found in this class.');
  }

  // Helper to accurately identify milestone exams vs quizzes
  const isWeeklyExam = (asm) => {
    if (!asm) return false;
    const t = String(asm.test_type || asm.type || '').toLowerCase();
    if (t === 'exam') return true;
    if (t === 'quiz') return false;
    const c = String(asm.category || asm.payload?.tier || asm.payload?.category || '').toUpperCase();
    if (c === 'EXAM') return true;
    if (c === 'QUIZ' || c === 'TASK') return false;
    const shell = String(asm.shell_code || asm.payload?.shell_code || '').toUpperCase();
    if (shell.endsWith('-EXAM') || shell.includes('-EXAM-')) return true;
    if (shell.endsWith('-QUIZ') || shell.includes('-QUIZ-')) return false;
    if (shell.endsWith('-TEST') || shell.includes('-TEST-')) return true;
    if (shell.endsWith('-TASK') || shell.includes('-TASK-')) return false;
    return false;
  };

  const getExpectedMax = (asm) => {
    if (!asm) return 40;
    if (asm.payload?.total_questions && Number(asm.payload.total_questions) > 0) {
      return Number(asm.payload.total_questions);
    }
    const isTest = isWeeklyExam(asm);
    return isTest ? 150 : 40;
  };

  // 2. Identify which tests to override
  // NEW FLOW: if selectedTestIds is provided, use it directly (any quiz or exam).
  let prerequisiteTests = [];
  let targetExams = [];

  const fillScore = Math.max(1, Math.min(100, Number(targetScorePercent) || 60));
  const isRemedial = fillScore <= 60; // Scores <= 60% are marked as remedial per Rule 2.10

  if (Array.isArray(selectedTestIds) && selectedTestIds.length > 0) {
    // NEW: user picked specific tests from the checklist
    prerequisiteTests = allClassTests.filter(t => selectedTestIds.includes(t.id));
    // Target exams = exams within selected tests (for session unlock)
    targetExams = prerequisiteTests.filter(isWeeklyExam);
  } else if (targetExamId) {
    const targetExam = allClassTests.find(t => t.id === targetExamId);
    if (!targetExam) throw new Error('Selected target exam not found.');
    targetExams = [targetExam];
    const targetOrder = targetExam.display_order ?? targetExam.order_index ?? 999;

    // Is target exam a Phrases Exam?
    const isPhrasesExam = Boolean(
      targetExam.payload?.category === 'phrases' ||
      /PHRASES/i.test(targetExam.shell_code || targetExam.payload?.shell_code || '') ||
      /phrase/i.test(targetExam.title || '') ||
      targetExam.test_subtype === 'PHRASE_EXAM' ||
      targetExam.test_subtype === 'PHRASE_TEST'
    );

    prerequisiteTests = allClassTests.filter(t => {
      if (t.id === targetExam.id) return false;
      const tOrder = t.display_order ?? t.order_index ?? 0;
      if (!isWeeklyExam(t)) return tOrder <= targetOrder;
      if (isPhrasesExam && includeWordsExamIfPhrasesSelected && isWeeklyExam(t) && tOrder < targetOrder) return true;
      return false;
    });
  } else if (targetThemeCode && targetThemeCode !== 'ALL') {
    const themeUpper = targetThemeCode.toUpperCase();
    targetExams = allClassTests.filter(t => {
      const rawTheme = t.payload?.theme_code || (t.shell_code ? t.shell_code.replace(/^[0-9]+/, '').charAt(0) : 'A');
      return isWeeklyExam(t) && (rawTheme || 'A').toUpperCase() === themeUpper;
    });

    const maxThemeOrder = targetExams.length > 0
      ? Math.max(...targetExams.map(t => t.display_order ?? t.order_index ?? 999))
      : 999;

    prerequisiteTests = allClassTests.filter(t => {
      const tOrder = t.display_order ?? t.order_index ?? 0;
      // All quizzes up to this theme's exams
      if (!isWeeklyExam(t)) {
        return tOrder <= maxThemeOrder;
      }

      return false;
    });
  } else {
    // ALL legacy: Override all quizzes and exams in the class
    targetExams = allClassTests.filter(isWeeklyExam);
    prerequisiteTests = allClassTests; // all tests including exams
  }

  if (prerequisiteTests.length === 0) {
    prerequisiteTests = allClassTests;
  }

  // 3. Ensure studentIds is populated scoped to this class
  let finalStudentIds = Array.isArray(studentIds) ? studentIds.filter(Boolean) : [];
  if (finalStudentIds.length === 0) {
    const { data: cls } = await sb.from('classes').select('id, program_id').eq('id', classId).single();
    if (cls?.program_id) {
      const { data: bData } = await sb.from('batches').select('id').eq('program_id', cls.program_id);
      const bIds = (bData || []).map(b => b.id);
      const { data: sData } = await sb.from('students')
        .select('id')
        .in('batch_id', bIds.length > 0 ? bIds : ['__dummy__'])
        .is('deleted_at', null)
        .eq('is_active', true);
      finalStudentIds = (sData || []).map(s => s.id);
    }
  }

  if (finalStudentIds.length === 0) {
    throw new Error('No students found to override.');
  }

  // 4. Fetch existing attempts for these students across prerequisiteTests
  const prereqIds = prerequisiteTests.map(t => t.id);
  const { data: existingAttempts, error: attErr } = await sb
    .from('attempts')
    .select('id, student_id, test_id, score, percentage, effective_score, total_questions, is_best_score, is_remedial_unlocked, status, attempt_number')
    .in('student_id', finalStudentIds)
    .in('test_id', prereqIds);

  if (attErr) throw attErr;

  const attemptsByStudentTest = {};
  (existingAttempts || []).forEach(att => {
    const key = `${att.student_id}_${att.test_id}`;
    if (!attemptsByStudentTest[key]) attemptsByStudentTest[key] = [];
    attemptsByStudentTest[key].push(att);
  });

  const now = new Date();
  const nowIso = now.toISOString();

  let createdCount = 0;
  let updatedCount = 0;
  const affectedStudentSet = new Set();
  const affectedTestSet = new Set();

  const inserts = [];
  const updates = [];

  // Determine the grade at the fill score (inline, no dynamic import)
  const _gradeForScore = (pct) => {
    if (pct >= 100) return '★';
    if (pct >= 90)  return 'A';
    if (pct >= 80)  return 'B';
    if (pct >= 60)  return 'C';
    if (pct >= 30)  return 'D';
    return 'E';
  };
  const fillGrade = _gradeForScore(fillScore);

  for (const sId of finalStudentIds) {
    for (const test of prerequisiteTests) {
      const key = `${sId}_${test.id}`;
      const atts = attemptsByStudentTest[key] || [];

      // Check if student already has score >= fillScore (never downgrade)
      const bestSubmittedPct = atts.reduce((best, a) => {
        const st = String(a.status || '').toLowerCase();
        const isSub = ['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(st);
        if (!isSub) return best;
        const pct = a.effective_score != null ? Number(a.effective_score) : Number(a.percentage || 0);
        return Math.max(best, pct);
      }, -1);

      if (bestSubmittedPct >= fillScore) {
        // Already at or above fill score — never downgrade
        continue;
      }

      // onlyFillEmpty mode: skip if any submitted attempt exists (regardless of score)
      if (onlyFillEmpty && atts.some(a => ['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(String(a.status || '').toLowerCase()))) {
        continue;
      }

      // Expected questions and fill score calculation
      const totalQ = Number(getExpectedMax(test) || 40);
      const remScore = Math.round(totalQ * (fillScore / 100) * 10) / 10;
      const remCorrect = Math.round(totalQ * (fillScore / 100));

      affectedStudentSet.add(sId);
      affectedTestSet.add(test.id);

      if (atts.length > 0) {
        atts.sort((x, y) => {
          const scX = Number(x.score ?? 0), scY = Number(y.score ?? 0);
          if (scY !== scX) return scY - scX;
          return new Date(y.submitted_at || y.created_at || 0) - new Date(x.submitted_at || x.created_at || 0);
        });
        const topAtt = atts[0];
        updates.push({
          id: topAtt.id,
          score: remScore,
          correct_count: remCorrect,
          total_questions: totalQ,
          percentage: fillScore,
          effective_score: fillScore,
          grade: fillGrade,
          status: 'submitted',
          is_best_score: true,
          is_remedial_unlocked: isRemedial,
          submitted_at: nowIso,
          updated_at: nowIso
        });
        updatedCount++;

        // Clear other attempts' is_best_score
        for (let i = 1; i < atts.length; i++) {
          if (atts[i].is_best_score) {
            updates.push({
              id: atts[i].id,
              is_best_score: false,
              updated_at: nowIso
            });
          }
        }
      } else {
        // Insert new completed attempt with fillScore Remedial
        inserts.push({
          student_id: sId,
          test_id: test.id,
          attempt_number: 1,
          started_at: nowIso,
          expires_at: nowIso,
          submitted_at: nowIso,
          status: 'submitted',
          score: remScore,
          correct_count: remCorrect,
          total_questions: totalQ,
          percentage: fillScore,
          effective_score: fillScore,
          grade: fillGrade,
          is_best_score: true,
          is_remedial_unlocked: isRemedial,
          created_at: nowIso,
          updated_at: nowIso
        });
        createdCount++;
      }
    }
  }

  // 5. Execute DB Inserts in safe chunks
  if (inserts.length > 0) {
    const chunk = 40;
    for (let i = 0; i < inserts.length; i += chunk) {
      const batch = inserts.slice(i, i + chunk);
      const { error: insErr } = await sb.from('attempts').insert(batch);
      if (insErr) {
        console.error('[adminOverridePrerequisitesWithRemedial] Insert error:', insErr);
        throw insErr;
      }
    }
  }

  // 6. Execute DB Updates
  if (updates.length > 0) {
    const chunk = 25;
    for (let i = 0; i < updates.length; i += chunk) {
      const batch = updates.slice(i, i + chunk);
      await Promise.all(batch.map(u =>
        sb.from('attempts').update({
          score: u.score,
          correct_count: u.correct_count,
          total_questions: u.total_questions,
          percentage: u.percentage,
          effective_score: u.effective_score,
          grade: u.grade,
          status: u.status,
          is_best_score: u.is_best_score,
          is_remedial_unlocked: u.is_remedial_unlocked,
          submitted_at: u.submitted_at,
          updated_at: u.updated_at
        }).eq('id', u.id)
      ));
    }
  }



  // 7. Whitelist and Unlock Test Sessions if requested
  if (unlockLiveSessions && targetExams.length > 0) {
    try {
      const sessionDurationMins = 180; // 3-hour window
      const autoClose = new Date(Date.now() + sessionDurationMins * 60 * 1000).toISOString();

      for (const asm of targetExams) {
        const payload = asm.payload || {};
        const sess = payload.test_session || {};
        const existingAllowed = Array.isArray(sess.allowed_student_ids) ? sess.allowed_student_ids : [];
        const mergedAllowed = [...new Set([...existingAllowed, ...finalStudentIds])];

        payload.test_session = {
          ...sess,
          status: 'UNLOCKED',
          is_unlocked: true,
          unlocked_at: nowIso,
          auto_close_at: (sess.auto_close_at && new Date(sess.auto_close_at) > now) ? sess.auto_close_at : autoClose,
          duration_minutes: sess.duration_minutes || sessionDurationMins,
          allowed_student_ids: mergedAllowed
        };

        await sb.from('tests').update({ payload, updated_at: nowIso }).eq('id', asm.id);
      }
    } catch (sessErr) {
      console.warn('[adminOverridePrerequisitesWithRemedial] Session unlock warning:', sessErr);
    }
  }

  // 8. Clear Admin Caches
  clearAdminCache('attempts');
  clearAdminCache('tests');

  // 9. Record Audit Log (Rule 2.19)
  try {
    await sb.from('audit_logs').insert({
      actor_role: 'ADMIN',
      action: 'OVERRIDE_PREREQUISITE_REMEDIAL',
      entity_type: 'class',
      entity_id: classId,
      new_value: {
        target_theme: targetThemeCode,
        target_exam_id: targetExamId,
        selected_test_ids: selectedTestIds,
        fill_score_percent: fillScore,
        only_fill_empty: onlyFillEmpty,
        is_remedial: isRemedial,
        student_count: finalStudentIds.length,
        affected_students: affectedStudentSet.size,
        affected_tests: affectedTestSet.size,
        created_attempts: createdCount,
        updated_attempts: updatedCount,
        grade: fillGrade
      }
    });
  } catch (auditErr) {
    console.warn('[adminOverridePrerequisitesWithRemedial] Audit log warning:', auditErr);
  }

  return {
    success: true,
    createdCount,
    updatedCount,
    affectedStudentsCount: affectedStudentSet.size,
    affectedTestsCount: affectedTestSet.size,
    totalOperations: createdCount + updatedCount,
    targetExamsCount: targetExams.length,
    fillScore,
    fillGrade,
    isRemedial
  };
}

/**
 * Phase 305: Forgiven & Exam Manual Override
 * Apply 'forgiven' flag to selected tests for selected students.
 * Also supports manual score input for EXAM type tests.
 */
export async function adminApplyForgiven({
  classId,
  studentIds = [],
  testActions = [],   // [{ testId, action: 'forgive'|'manual', percentage, score }]
  forgivenBy = 'Mr. Top',
  reason = 'Pacing Adjustment'
}) {
  const sb = await getSupabase();
  if (!classId) throw new Error('classId is required for Forgiven / Override.');
  if (!studentIds.length) throw new Error('No students selected.');
  if (!testActions.length) throw new Error('No test actions specified.');

  const nowIso = new Date().toISOString();
  const inserts = [];
  const updates = [];
  const affectedSet = new Set();

  const testIds = testActions.map(ta => ta.testId);
  const { data: existing, error: existErr } = await sb
    .from('attempts')
    .select('id, student_id, test_id, status, score, percentage, effective_score, total_questions, is_best_score, is_forgiven, forgiven_by, forgiven_at, forgiven_reason, is_remedial_unlocked')
    .in('student_id', studentIds)
    .in('test_id', testIds);
  if (existErr) throw existErr;

  const byStudentTest = {};
  (existing || []).forEach(a => {
    const k = `${a.student_id}_${a.test_id}`;
    if (!byStudentTest[k]) byStudentTest[k] = [];
    byStudentTest[k].push(a);
  });

  // Fetch test metadata for totalQ
  const { data: testMeta, error: metaErr } = await sb
    .from('tests')
    .select('id, shell_code, test_type, payload')
    .in('id', testIds);
  if (metaErr) throw metaErr;

  const testMetaMap = {};
  (testMeta || []).forEach(t => { testMetaMap[t.id] = t; });

  const _gradeForScore = (pct) => {
    if (pct >= 100) return '★';
    if (pct >= 90)  return 'A';
    if (pct >= 80)  return 'B';
    if (pct >= 60)  return 'C';
    if (pct >= 30)  return 'D';
    return 'E';
  };

  const isUuid = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
  const validForgivenBy = isUuid(forgivenBy) ? forgivenBy : null;
  const adminLabel = (forgivenBy || 'Mr. Top').trim();

  for (const sId of studentIds) {
    for (const ta of testActions) {
      const { testId, action, percentage: inputPct, score: inputScore } = ta;
      const k = `${sId}_${testId}`;
      const existingAtts = byStudentTest[k] || [];
      const meta = testMetaMap[testId];
      const isExamTest = isWeeklyExam(meta);
      const totalQ = Number(meta?.payload?.total_questions || (isExamTest ? 120 : 40));

      if (action === 'forgive') {
        const forgiveReasonText = `[${adminLabel}] ${(reason || 'Pacing Adjustment').trim()}`;
        const submittedAtts = existingAtts.filter(a =>
          ['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(String(a.status || '').toLowerCase())
        );

        if (submittedAtts.length > 0) {
          submittedAtts.sort((x, y) => Number(y.percentage || y.score || 0) - Number(x.percentage || x.score || 0));
          const topAtt = submittedAtts[0];
          updates.push({
            id: topAtt.id,
            is_forgiven: true,
            forgiven_by: validForgivenBy,
            forgiven_at: nowIso,
            forgiven_reason: forgiveReasonText,
            is_best_score: true,
            updated_at: nowIso
          });
          // Ensure other attempts for this test have is_best_score = false
          existingAtts.forEach(att => {
            if (att.id !== topAtt.id && att.is_best_score) {
              updates.push({ id: att.id, is_best_score: false, updated_at: nowIso });
            }
          });
        } else if (existingAtts.length > 0) {
          // Has existing non-submitted/in_progress attempt: complete it as forgiven
          const topAtt = existingAtts[0];
          updates.push({
            id: topAtt.id,
            status: 'submitted',
            score: 0,
            correct_count: 0,
            total_questions: totalQ,
            percentage: 0,
            effective_score: 0,
            grade: 'E',
            is_best_score: true,
            is_forgiven: true,
            forgiven_by: validForgivenBy,
            forgiven_at: nowIso,
            forgiven_reason: forgiveReasonText,
            updated_at: nowIso
          });
        } else {
          inserts.push({
            student_id: sId,
            test_id: testId,
            attempt_number: 1,
            started_at: nowIso,
            expires_at: nowIso,
            submitted_at: nowIso,
            status: 'submitted',
            score: 0,
            correct_count: 0,
            total_questions: totalQ,
            percentage: 0,
            effective_score: 0,
            grade: 'E',
            is_best_score: true,
            is_forgiven: true,
            forgiven_by: validForgivenBy,
            forgiven_at: nowIso,
            forgiven_reason: forgiveReasonText,
            created_at: nowIso,
            updated_at: nowIso
          });
        }
        affectedSet.add(`${sId}_${testId}`);

      } else if (action === 'manual') {
        const pct = Math.max(0, Math.min(100, Number(inputPct) || 0));
        const sc = inputScore != null
          ? Number(inputScore)
          : Math.round(totalQ * (pct / 100) * 10) / 10;
        const grade = _gradeForScore(pct);
        const manualReason = `MANUAL_OVERRIDE: ${pct}% (${sc}/${totalQ} PTS) by ${adminLabel}${reason ? ': ' + reason.trim() : ''}`;

        const submittedAtts = existingAtts.filter(a =>
          ['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(String(a.status || '').toLowerCase())
        );

        if (submittedAtts.length > 0) {
          submittedAtts.sort((x, y) => Number(y.percentage || y.score || 0) - Number(x.percentage || x.score || 0));
          const topAtt = submittedAtts[0];
          updates.push({
            id: topAtt.id,
            score: sc,
            correct_count: Math.round(sc),
            total_questions: totalQ,
            percentage: pct,
            effective_score: pct,
            grade,
            status: 'submitted',
            is_best_score: true,
            is_forgiven: false,
            forgiven_by: validForgivenBy,
            forgiven_at: nowIso,
            forgiven_reason: manualReason,
            updated_at: nowIso
          });
        } else {
          inserts.push({
            student_id: sId,
            test_id: testId,
            attempt_number: 1,
            started_at: nowIso,
            expires_at: nowIso,
            submitted_at: nowIso,
            status: 'submitted',
            score: sc,
            correct_count: Math.round(sc),
            total_questions: totalQ,
            percentage: pct,
            effective_score: pct,
            grade,
            is_best_score: true,
            is_forgiven: false,
            forgiven_by: validForgivenBy,
            forgiven_at: nowIso,
            forgiven_reason: manualReason,
            created_at: nowIso,
            updated_at: nowIso
          });
        }
        affectedSet.add(`${sId}_${testId}`);
      }
    }
  }

  // Execute inserts in safe chunks
  const CHUNK = 40;
  for (let i = 0; i < inserts.length; i += CHUNK) {
    const batch = inserts.slice(i, i + CHUNK);
    const { error: insErr } = await sb.from('attempts').insert(batch);
    if (insErr) {
      console.error('[adminApplyForgiven] Insert error:', insErr);
      throw insErr;
    }
  }

  // Execute updates
  for (const u of updates) {
    const { id, ...fields } = u;
    const { error: updErr } = await sb.from('attempts').update(fields).eq('id', id);
    if (updErr) {
      console.error('[adminApplyForgiven] Update error:', updErr);
      throw updErr;
    }
  }

  // Audit log per Rule 2.19
  try {
    await sb.from('audit_logs').insert({
      actor_role: 'ADMIN',
      action: 'FORGIVEN_OVERRIDE',
      entity_type: 'class',
      entity_id: classId,
      new_value: {
        forgivenBy,
        reason,
        studentCount: studentIds.length,
        testCount: testActions.length,
        actions: testActions.map(ta => ({ testId: ta.testId, action: ta.action })),
        createdCount: inserts.length,
        updatedCount: updates.length
      },
      created_at: nowIso
    });
  } catch (auditErr) {
    console.warn('[adminApplyForgiven] Audit log warning:', auditErr);
  }

  clearAdminCache('attempts');
  clearAdminCache('tests');

  return {
    success: true,
    createdCount: inserts.length,
    updatedCount: updates.length,
    affectedCount: affectedSet.size
  };
}

/**
 * Phase 305: Revoke all Forgiven/Manual attempts for selected students + tests.
 * Removes the is_forgiven flag or deletes synthetic attempts if score was 0.
 */
export async function adminRevokeForgiven({ classId, studentIds = [], testIds = [] }) {
  const sb = await getSupabase();
  if (!classId || !studentIds.length || !testIds.length) {
    throw new Error('classId, studentIds, and testIds are all required for revoke.');
  }

  const { data: targets, error } = await sb
    .from('attempts')
    .select('id, score, percentage, is_forgiven, forgiven_reason, forgiven_by')
    .in('student_id', studentIds)
    .in('test_id', testIds);
  if (error) throw error;

  const forgivenTargets = (targets || []).filter(a =>
    a.is_forgiven || (a.forgiven_reason && a.forgiven_reason.startsWith('MANUAL_OVERRIDE'))
  );

  const toDelete = forgivenTargets.filter(a => a.is_forgiven && Number(a.score || 0) === 0);
  const toReset = forgivenTargets.filter(a => !toDelete.includes(a));

  const nowIso = new Date().toISOString();

  if (toDelete.length > 0) {
    const { error: delErr } = await sb.from('attempts').delete().in('id', toDelete.map(a => a.id));
    if (delErr) throw delErr;
  }

  for (const a of toReset) {
    await sb.from('attempts').update({
      is_forgiven: false,
      forgiven_by: null,
      forgiven_at: null,
      forgiven_reason: null,
      updated_at: nowIso
    }).eq('id', a.id);
  }

  try {
    await sb.from('audit_logs').insert({
      actor_role: 'ADMIN',
      action: 'FORGIVEN_REVOKE',
      entity_type: 'class',
      entity_id: classId,
      new_value: { studentIds, testIds, deletedCount: toDelete.length, resetCount: toReset.length },
      created_at: nowIso
    });
  } catch (auditErr) {
    console.warn('[adminRevokeForgiven] Audit log warning:', auditErr);
  }

  clearAdminCache('attempts');
  clearAdminCache('tests');

  return { success: true, deletedCount: toDelete.length, resetCount: toReset.length };
}

export const toOrdinal = (n) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export async function upsertDynamicTestShell(config) {
  const sb = await getSupabase();
  const {
    institutionId, programId, classId, levelId, levelNum = 3,
    tier, themeName, topicName, description,
    themeCode, topicCode,
    modulePrefix = 'VOCAB',
    category = 'words',
    durationMinutes = null,
    prerequisiteId = null,
    moduleId = null,
    answerType = null,
    displayOrder = 1
  } = config;

  const isTest = tier === 'TEST' || tier === 'EXAM';
  const isPhrase = category === 'phrases' || modulePrefix === 'PHRASE';
  const effectiveDurationMinutes = durationMinutes !== null && durationMinutes !== undefined
    ? Number(durationMinutes)
    : (isTest ? 120 : 5);

  // Standardized Shell Code: e.g. 3A1-WORDS-TASK, 3A1-PHRASES-TASK, 3A-WORDS-EXAM, 3A-PHRASES-EXAM
  const cleanTopCode = topicCode ? String(topicCode).replace(/^[A-Za-z]/, '') : '1';
  const code = isPhrase
    ? (isTest ? `${levelNum}${themeCode}-PHRASES-EXAM` : `${levelNum}${themeCode}${cleanTopCode}-PHRASES-TASK`)
    : (isTest ? `${levelNum}${themeCode}-WORDS-EXAM` : `${levelNum}${themeCode}${cleanTopCode}-WORDS-TASK`);

  // Standardized Title: e.g. "3rd Vocabulary A1 Words Task - Professional Identity"
  const ordinal = toOrdinal(levelNum);
  const cleanTitle = (topicName || themeName || '').replace(/["']/g, '').trim();
  const generatedTitle = isPhrase
    ? (isTest
        ? `${ordinal} Vocabulary ${themeCode} Phrases Exam${cleanTitle ? ' - ' + cleanTitle : ''}`
        : `${ordinal} Vocabulary ${themeCode}${cleanTopCode} Phrases Task${cleanTitle ? ' - ' + cleanTitle : ''}`)
    : (isTest
        ? `${ordinal} Vocabulary ${themeCode} Words Exam${cleanTitle ? ' - ' + cleanTitle : ''}`
        : `${ordinal} Vocabulary ${themeCode}${cleanTopCode} Words Task${cleanTitle ? ' - ' + cleanTitle : ''}`);

  // Default answer types: Spoken for Tasks (Words & Phrases), Spoken for Words Exam, Selection for Phrases Exam
  const defaultAnswerType = isTest ? (isPhrase ? 'selection' : 'written') : 'spoken';

  // Expected question counts
  let expectedQuestions = 40;
  if (!isTest) {
    expectedQuestions = isPhrase ? 10 : 40;
  } else {
    const th = (themeCode || '').toUpperCase();
    if (th === 'A') expectedQuestions = isPhrase ? 30 : 120;
    else if (th === 'B') expectedQuestions = isPhrase ? 70 : 280;
    else if (th === 'C') expectedQuestions = isPhrase ? 120 : 480;
    else if (th === 'D') expectedQuestions = isPhrase ? 160 : 640;
    else expectedQuestions = isPhrase ? 30 : 120;
  }

  // Dedup: check by new standardized shell_code first
  let query = sb.from('tests')
    .select('id, class_id, answer_type, payload')
    .eq('shell_code', code)
    .eq('program_id', programId)
    .eq('level_id', levelId)
    .is('deleted_at', null);

  if (classId) {
    query = query.eq('class_id', classId);
  }

  let { data: existing } = await query.maybeSingle();

  if (!existing) {
    // Check legacy aliases strictly matching tier (EXAM with legacy EXAMs, TASK with legacy TASKs)
    let legacyCodes = [];
    if (isTest) {
      // EXAM legacy codes ONLY - strictly exams
      legacyCodes = isPhrase
        ? [
            `${levelNum}${themeCode}-PHRASES-EXAM`,
            `${levelNum}${themeCode}-PHRASES-TEST`,
            `${levelNum}${themeCode} Phrases Exam`,
            `${levelNum}${themeCode} Phrases Test`,
            `${levelNum}VOCAB-${themeCode}-TEST-PHR`,
            `3VOCAB-${themeCode}-TEST-PHR`
          ]
        : [
            `${levelNum}${themeCode}-WORDS-EXAM`,
            `${levelNum}${themeCode}-WORDS-TEST`,
            `${levelNum}${themeCode} Words Exam`,
            `${levelNum}${themeCode} Words Test`,
            `${levelNum}${themeCode} Vocab Test`,
            `${levelNum}VOCAB-${themeCode}-TEST-WOR`,
            `3VOCAB-${themeCode}-TEST-WOR`
          ];
    } else {
      // TASK legacy codes ONLY - strictly tasks/quizzes for this specific topic
      const rawCode = topicCode || '1';
      legacyCodes = isPhrase
        ? [
            `${levelNum}${themeCode}${cleanTopCode}-PHRASES-TASK`,
            `${levelNum}${themeCode}${cleanTopCode}-PHRASES-QUIZ`,
            `${levelNum}${themeCode}${rawCode}-PHRASES-TASK`,
            `${levelNum}${themeCode}${rawCode}-PHRASES-QUIZ`,
            `${levelNum}${themeCode}${cleanTopCode} Phrases Task`,
            `${levelNum}${themeCode}${cleanTopCode} Phrases Quiz`,
            `${levelNum}${themeCode}${rawCode} Phrases Task`,
            `${levelNum}${themeCode}${rawCode} Phrases Quiz`,
            `${levelNum}VOCAB-${themeCode}${cleanTopCode}-PHR`,
            `3VOCAB-${themeCode}${cleanTopCode}-PHR`
          ]
        : [
            `${levelNum}${themeCode}${cleanTopCode}-WORDS-TASK`,
            `${levelNum}${themeCode}${cleanTopCode}-WORDS-QUIZ`,
            `${levelNum}${themeCode}${rawCode}-WORDS-TASK`,
            `${levelNum}${themeCode}${rawCode}-WORDS-QUIZ`,
            `${levelNum}${themeCode}${cleanTopCode} Words Task`,
            `${levelNum}${themeCode}${cleanTopCode} Words Quiz`,
            `${levelNum}${themeCode}${rawCode} Words Task`,
            `${levelNum}${themeCode}${rawCode} Words Quiz`,
            `${levelNum}${themeCode}${cleanTopCode} Vocab Task`,
            `${levelNum}VOCAB-${themeCode}${cleanTopCode}-WOR`,
            `3VOCAB-${themeCode}${cleanTopCode}-WOR`
          ];
    }

    legacyCodes = Array.from(new Set(legacyCodes.filter(c => c !== code)));

    for (const leg of legacyCodes) {
      let q = sb.from('tests')
        .select('id, class_id, answer_type, payload')
        .eq('shell_code', leg)
        .eq('program_id', programId)
        .eq('level_id', levelId)
        .is('deleted_at', null);
      if (classId) q = q.eq('class_id', classId);
      const { data: legacy } = await q.maybeSingle();
      if (legacy) { existing = legacy; break; }
    }
  }

  // Prioritize explicitly passed answerType; Words Exam is strictly written (Rule 2.13)
  const effectiveAnswerType = answerType || ((isTest && !isPhrase) ? 'written' : (existing && existing.answer_type)) || defaultAnswerType;
  const effectiveMinScore = config.minimumRequiredScore !== undefined
    ? Number(config.minimumRequiredScore)
    : 70;

  // Cumulative theme determination for weekly milestone tests
  const allThemesList = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const themeIdx = allThemesList.indexOf((themeCode || '').toUpperCase());
  const cumulativeThemes = (isTest && themeIdx !== -1)
    ? allThemesList.slice(0, themeIdx + 1)
    : (themeCode ? [themeCode.toUpperCase()] : []);

  const asmData = {
    institution_id:             institutionId,
    program_id:                 programId,
    class_id:                   classId || (existing ? existing.class_id : null),
    level_id:                   levelId,
    module_id:                  moduleId,
    test_subtype:               isTest ? (isPhrase ? 'PHRASE_EXAM' : 'VOCAB_EXAM') : (isPhrase ? 'PHRASE_TASK' : 'VOCAB_TASK'),
    test_type:                  isTest ? 'exam' : 'quiz',
    category:                   isTest ? 'EXAM' : 'TASK',
    shell_code:                 code,
    title:                      generatedTitle,
    description:                description || `${isTest ? 'Exam' : 'Task'}: ${themeCode}/${topicCode || 'ALL'} (${isPhrase ? 'Phrases' : 'Words'})`,
    status:                     'PUBLISHED',
    working_duration_minutes:   effectiveDurationMinutes,
    minimum_required_score:     effectiveMinScore,
    prerequisite_test_id:       prerequisiteId,
    prerequisite_id:            prerequisiteId,
    answer_type:                effectiveAnswerType,
    is_dynamic_shell:           true,
    display_order:              displayOrder,
    payload:                    {
      ...(existing?.payload || {}),
      is_dynamic_shell: true,
      is_unified: false,
      is_unified_test: false,
      theme_code: themeCode,
      themes: isTest ? cumulativeThemes : (themeCode ? [themeCode] : null),
      is_cumulative: isTest,
      topic_code: isTest ? null : (topicCode || null),
      category: isPhrase ? 'phrases' : 'words',
      answer_type: effectiveAnswerType,
      shell_code: code,
      tier: isTest ? 'EXAM' : 'TASK',
      working_duration_minutes: effectiveDurationMinutes,
      duration_minutes: effectiveDurationMinutes,
      minimum_required_score: effectiveMinScore,
      total_questions: expectedQuestions,
      snapshot_question_count: expectedQuestions
    },
    created_by:                 'Auto-Generator',
    updated_at:                 new Date().toISOString()
  };

  delete asmData.duration_minutes;

  if (existing) {
    const { error } = await sb.from('tests').update(asmData).eq('id', existing.id);
    if (error) throw error;
    if (effectiveAnswerType) {
      try {
        await sb.from('test_items').update({ answer_type: effectiveAnswerType }).eq('test_id', existing.id);
      } catch (_) {}
    }
    return { testId: existing.id, action: 'updated' };
  } else {
    asmData.created_at = new Date().toISOString();
    const { data: newTest, error } = await sb.from('tests').insert(asmData).select('id').single();
    if (error) throw error;
    return { testId: newTest.id, action: 'inserted' };
  }
}

export async function updateClassTestsConfig(params = {}) {
  const sb = await getSupabase();
  const {
    classId,
    taskDurationMinutes = 15,
    wordsTaskDurationMinutes = 15,
    phrasesTaskDurationMinutes = 10,
    taskAnswerType = 'spoken',
    wordsTaskAnswerType,
    phrasesTaskAnswerType,
    taskPassingScore = 60,
    wordsTestAnswerType = 'spoken',
    phrasesTestAnswerType = 'selection',
    testPassingScore = 60
  } = params;

  if (!classId) throw new Error('classId is required.');

  const { data: rows, error: fetchErr } = await sb
    .from('tests')
    .select('id, test_type, category, payload, shell_code, title')
    .eq('class_id', classId)
    .is('deleted_at', null);

  if (fetchErr) throw fetchErr;
  if (!rows || rows.length === 0) return { updatedTasks: 0, updatedTests: 0 };

  let updatedTasks = 0;
  let updatedTests = 0;

  for (const row of rows) {
    const isTest = String(row.category).toUpperCase() === 'EXAM'
      || String(row.category).toUpperCase() === 'TEST'
      || String(row.test_type).toUpperCase() === 'EXAM'
      || String(row.test_type).toLowerCase() === 'exam'
      || (row.shell_code && (row.shell_code.endsWith('-EXAM') || row.shell_code.endsWith('-TEST')))
      || (row.title && (row.title.toUpperCase().includes(' EXAM') || row.title.toUpperCase().includes(' TEST')));
    const isPhrase = row.category === 'phrases'
      || (row.payload && row.payload.category === 'phrases')
      || (row.shell_code && row.shell_code.toUpperCase().includes('PHRASE'))
      || (row.title && row.title.toUpperCase().includes('PHRASE'));

    const updateData = {};
    if (isTest) {
      updateData.minimum_required_score = Number(testPassingScore);
      const testAns = isPhrase ? (phrasesTestAnswerType || 'selection') : (wordsTestAnswerType || 'spoken');
      updateData.answer_type = testAns;
      if (row.payload && typeof row.payload === 'object') {
        updateData.payload = {
          ...row.payload,
          minimum_required_score: Number(testPassingScore),
          answer_type: testAns
        };
      }
      updatedTests++;
    } else {
      const dur = isPhrase
        ? Number(phrasesTaskDurationMinutes || 10)
        : Number(wordsTaskDurationMinutes || taskDurationMinutes || 15);
      updateData.working_duration_minutes = dur;
      updateData.minimum_required_score = Number(taskPassingScore);
      const taskAns = isPhrase
        ? (phrasesTaskAnswerType || taskAnswerType || 'spoken')
        : (wordsTaskAnswerType || taskAnswerType || 'spoken');
      updateData.answer_type = taskAns;
      if (row.payload && typeof row.payload === 'object') {
        updateData.payload = {
          ...row.payload,
          working_duration_minutes: dur,
          duration_minutes: dur,
          minimum_required_score: Number(taskPassingScore),
          answer_type: taskAns
        };
      }
      updatedTasks++;
    }

    const { error: updErr } = await sb.from('tests').update(updateData).eq('id', row.id);
    if (updErr) throw updErr;

    // Keep test_questions in sync if answer_type changed
    if (updateData.answer_type) {
      try {
        await sb.from('test_items').update({ answer_type: updateData.answer_type }).eq('test_id', row.id);
      } catch (_) {}
    }
  }

  clearApiCache('tests');
  return { updatedTasks, updatedTests };
}

export async function autoGenerateTestsHierarchy(targetLevels, config = {}) {
  const sb = await getSupabase();
  const results = { tasks: 0, tests: 0, updated: 0 };
  const { programId } = config;

  if (!programId) throw new Error("programId is required for auto-generation");

  const { data: progData, error: progErr } = await sb.from('programs')
    .select('id, institution_id, name, institutions(name)')
    .eq('id', programId).single();

  if (!progData || progErr) throw new Error(`Program not found.`);

  const institutionId = progData.institution_id;

  // Pre-fetch Module IDs
  const { data: vocabModule } = await sb.from('modules').select('id').ilike('name', '%Vocabulary Mastery%').limit(1).maybeSingle();
  const { data: phraseModule } = await sb.from('modules').select('id').ilike('name', '%Phrase Recognition%').limit(1).maybeSingle();
  const vocabModuleId = vocabModule ? vocabModule.id : null;
  const phraseModuleId = phraseModule ? phraseModule.id : null;

  for (const levelNum of targetLevels) {
    // Determine level_id
    const { data: lvlData } = await sb.from('levels')
      .select('id, name')
      .eq('level_number', levelNum)
      .limit(1).single();
    if (!lvlData) continue;
    const levelId = lvlData.id;

    let targetClassId = config.explicitClassId || null;
    if (!targetClassId) {
      // Prioritize active vocabulary class assigned to this exact level and program
      const { data: classDataList } = await sb.from('classes')
        .select('id, name')
        .eq('program_id', programId)
        .eq('level_id', levelId)
        .eq('is_active', true)
        .ilike('name', '%Vocab%')
        .is('deleted_at', null);

      targetClassId = (classDataList && classDataList.length > 0) ? classDataList[0].id : null;
      if (!targetClassId) {
        const { data: anyClasses } = await sb.from('classes')
          .select('id')
          .eq('program_id', programId)
          .eq('level_id', levelId)
          .eq('is_active', true)
          .is('deleted_at', null)
          .limit(1);
        targetClassId = (anyClasses && anyClasses.length > 0) ? anyClasses[0].id : null;
      }
    }

    // 1. Fetch Words for Level to know what themes and topics exist (Chunked Pagination Protected)
    let words = [];
    try {
      words = await fetchVaultWords({ targetLevel: levelNum, programId, institutionId, limit: 10000 });
    } catch (_) {
      let vaultQuery = sb.from('vocabulary_vault')
        .select('theme_code, theme, topic_code, topic, word_type, category')
        .is('deleted_at', null)
        .eq('target_level', levelNum);

      if (institutionId) {
        vaultQuery = vaultQuery.eq('institution_id', institutionId);
      }
      if (programId) {
        vaultQuery = vaultQuery.eq('program_id', programId);
      }

      const { data } = await vaultQuery;
      words = data || [];
    }

    if (!words || words.length === 0) continue;

    // 2. Build a map of themes -> topics -> categories
    const themeMap = new Map();

    for (const w of words) {
      if (!w.theme_code || !w.topic_code) continue; // Skip legacy rows without codes

      const wt = (w.word_type || '').toLowerCase();
      const isPhrase = ['expression', 'idiom', 'proverb', 'phrase'].includes(wt) || w.category === 'phrases';
      const category = isPhrase ? 'phrases' : 'vocab';

      if (!themeMap.has(w.theme_code)) {
         themeMap.set(w.theme_code, { name: w.theme, topics: new Map() });
      }

      const topicsMap = themeMap.get(w.theme_code).topics;
      if (!topicsMap.has(w.topic_code)) {
        topicsMap.set(w.topic_code, { name: w.topic, hasVocab: false, hasPhrases: false });
      }

      if (category === 'phrases') topicsMap.get(w.topic_code).hasPhrases = true;
      if (category === 'vocab') topicsMap.get(w.topic_code).hasVocab = true;
    }

    const sortedThemes = Array.from(themeMap.keys()).sort();
    let displayOrder = 1;
    let lastTaskId = null;

    const taskDur = config.taskDurationMinutes !== undefined ? Number(config.taskDurationMinutes) : 15;
    const wordsTaskDur = config.wordsTaskDurationMinutes !== undefined ? Number(config.wordsTaskDurationMinutes) : (taskDur || 15);
    const phrasesTaskDur = config.phrasesTaskDurationMinutes !== undefined ? Number(config.phrasesTaskDurationMinutes) : 10;
    const taskAns = config.taskAnswerType || 'spoken';
    const wordsTaskAns = config.wordsTaskAnswerType || taskAns || 'spoken';
    const phrasesTaskAns = config.phrasesTaskAnswerType || taskAns || 'spoken';
    const taskPass = config.taskPassingScore !== undefined ? Number(config.taskPassingScore) : 60;
    const wordsTestAns = config.wordsTestAnswerType || 'spoken';
    const phrasesTestAns = config.phrasesTestAnswerType || 'selection';
    const testPass = config.testPassingScore !== undefined ? Number(config.testPassingScore) : 60;

    // 3. Generate Tests in strict Linear Sequential Chain
    for (const themeCode of sortedThemes) {
      const themeData = themeMap.get(themeCode);
      const sortedTopics = Array.from(themeData.topics.keys()).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

      let hasAnyVocab = false;
      let hasAnyPhrases = false;

      for (const topicCode of sortedTopics) {
        const topicObj = themeData.topics.get(topicCode);
        const topicName = topicObj.name;
        // Peer prerequisite: both Words and Phrases in this topic share the exact same prerequisite
        const topicPrereqId = lastTaskId;
        let thisTopicLastId = null;

        // 1. Words Task (First in topic pair)
        if (topicObj.hasVocab && (!config.category || config.category === 'all' || config.category === 'words')) {
          hasAnyVocab = true;
          const { testId, action } = await upsertDynamicTestShell({
            institutionId, programId, levelId, classId: targetClassId, levelNum,
            tier: 'TASK', themeName: themeData.name, topicName: topicName,
            description: `Theme: ${themeData.name} | Topic: ${topicName}`,
            themeCode, topicCode,
            modulePrefix: 'VOCAB', category: 'words',
            moduleId: vocabModuleId,
            answerType: wordsTaskAns,
            durationMinutes: wordsTaskDur,
            minimumRequiredScore: taskPass,
            prerequisiteId: topicPrereqId,
            displayOrder: displayOrder++
          });
          if (action === 'inserted') results.tasks++;
          if (action === 'updated') results.updated++;
          thisTopicLastId = testId;
        }

        // 2. Phrases Task (Peer in topic pair, shares same topicPrereqId)
        if (topicObj.hasPhrases && (!config.category || config.category === 'all' || config.category === 'phrases')) {
          hasAnyPhrases = true;
          const { testId, action } = await upsertDynamicTestShell({
            institutionId, programId, levelId, classId: targetClassId, levelNum,
            tier: 'TASK', themeName: themeData.name, topicName: topicName,
            description: `Theme: ${themeData.name} | Topic: ${topicName}`,
            themeCode, topicCode,
            modulePrefix: 'PHRASE', category: 'phrases',
            moduleId: phraseModuleId,
            answerType: phrasesTaskAns,
            durationMinutes: phrasesTaskDur,
            minimumRequiredScore: taskPass,
            prerequisiteId: topicPrereqId,
            displayOrder: displayOrder++
          });
          if (action === 'inserted') results.tasks++;
          if (action === 'updated') results.updated++;
          thisTopicLastId = testId;
        }

        if (thisTopicLastId) {
          lastTaskId = thisTopicLastId;
        }
      }

      // Theme Exams: Both Words Exam and Phrases Exam are PEERS requiring all theme tasks
      const lastThemeTaskId = lastTaskId;
      let lastThemeExamId = null;

      // 3. Words Exam (First in exam pair)
      if (hasAnyVocab && (!config.category || config.category === 'all' || config.category === 'words')) {
        const { testId, action } = await upsertDynamicTestShell({
          institutionId, programId, levelId, classId: targetClassId, levelNum,
          tier: 'EXAM', themeName: themeData.name, topicName: null,
          description: `Exam: ${themeData.name}`,
          themeCode, topicCode: null,
          modulePrefix: 'VOCAB', category: 'words',
          moduleId: vocabModuleId,
          answerType: wordsTestAns,
          durationMinutes: 120,
          minimumRequiredScore: testPass,
          prerequisiteId: lastThemeTaskId,
          displayOrder: displayOrder++
        });
        if (action === 'inserted') results.tests++;
        if (action === 'updated') results.updated++;
        lastThemeExamId = testId;
      }

      // 4. Phrases Exam (Peer in exam pair, shares same lastThemeTaskId)
      if (hasAnyPhrases && (!config.category || config.category === 'all' || config.category === 'phrases')) {
        const { testId, action } = await upsertDynamicTestShell({
          institutionId, programId, levelId, classId: targetClassId, levelNum,
          tier: 'EXAM', themeName: themeData.name, topicName: null,
          description: `Exam: ${themeData.name}`,
          themeCode, topicCode: null,
          modulePrefix: 'PHRASE', category: 'phrases',
          moduleId: phraseModuleId,
          answerType: phrasesTestAns,
          durationMinutes: 120,
          minimumRequiredScore: testPass,
          prerequisiteId: lastThemeTaskId,
          displayOrder: displayOrder++
        });
        if (action === 'inserted') results.tests++;
        if (action === 'updated') results.updated++;
        lastThemeExamId = testId;
      }

      if (lastThemeExamId) {
        lastTaskId = lastThemeExamId;
      }
    }
  }

  clearApiCache('tests');
  return results;
}

export async function autoGenerateWordsTests({ classId, levelId, programId, institutionId }) {
  if (!classId || !levelId || !programId) throw new Error("Missing required parameters for auto-generating words.");
  const { data: levelData } = await getSupabase().from('levels').select('level_number').eq('id', levelId).single();
  if (!levelData) throw new Error("Level not found.");
  return autoGenerateTestsHierarchy([levelData.level_number], {
    programId,
    explicitClassId: classId,
    category: 'words'
  });
}

export async function autoGeneratePhrasesTests({ classId, levelId, programId, institutionId }) {
  if (!classId || !levelId || !programId) throw new Error("Missing required parameters for auto-generating phrases.");
  const { data: levelData } = await getSupabase().from('levels').select('level_number').eq('id', levelId).single();
  if (!levelData) throw new Error("Level not found.");
  return autoGenerateTestsHierarchy([levelData.level_number], {
    programId,
    explicitClassId: classId,
    category: 'phrases'
  });
}

/**
 * Automatically provisions and synchronizes tests for a Vocabulary class based on Vocabulary Vault contents.
 * Safe, idempotent, zero-maintenance.
 *
 * @param {number|string} levelNumberOrId - Level number (e.g. 2, 3) or level UUID
 * @param {Object} options - Options { programId, explicitClassId, force }
 * @returns {Promise<{synced: boolean, tasks?: number, tests?: number, updated?: number, reason?: string, error?: string}>}
 */
export async function autoSyncClassTestsForLevel(levelNumberOrId, options = {}) {
  const sb = await getSupabase();
  const { programId: optProgramId, explicitClassId, force = false } = options;

  try {
    // 1. Resolve level number and level ID
    let levelNum = null;
    let levelId = null;

    if (typeof levelNumberOrId === 'number' || (!isNaN(Number(levelNumberOrId)) && String(levelNumberOrId).length <= 3)) {
      levelNum = Number(levelNumberOrId);
      const { data: lvl } = await sb.from('levels').select('id, level_number').eq('level_number', levelNum).maybeSingle();
      levelId = lvl?.id || null;
    } else {
      levelId = String(levelNumberOrId);
      const { data: lvl } = await sb.from('levels').select('id, level_number').eq('id', levelId).maybeSingle();
      levelNum = lvl?.level_number != null ? Number(lvl.level_number) : null;
    }

    if (!levelNum || !levelId) {
      return { synced: false, reason: 'level_not_found' };
    }

    // 2. Resolve programId
    let programId = optProgramId;
    if (!programId && explicitClassId) {
      const { data: cls } = await sb.from('classes').select('program_id').eq('id', explicitClassId).maybeSingle();
      programId = cls?.program_id;
    }
    if (!programId) {
      const { data: progs } = await sb.from('programs').select('id').order('created_at').limit(1);
      programId = progs?.[0]?.id || null;
    }

    if (!programId) {
      return { synced: false, reason: 'program_not_found' };
    }

    // 3. Resolve targetClassId
    let targetClassId = explicitClassId;
    if (!targetClassId) {
      const { data: classList } = await sb.from('classes')
        .select('id, name')
        .eq('program_id', programId)
        .eq('level_id', levelId)
        .eq('is_active', true)
        .ilike('name', '%Vocab%')
        .is('deleted_at', null);

      targetClassId = (classList && classList.length > 0) ? classList[0].id : null;
      if (!targetClassId) {
        const { data: anyClass } = await sb.from('classes')
          .select('id')
          .eq('program_id', programId)
          .eq('level_id', levelId)
          .eq('is_active', true)
          .is('deleted_at', null)
          .limit(1);
        targetClassId = anyClass?.[0]?.id || null;
      }
    }

    if (!targetClassId) {
      return { synced: false, reason: 'no_target_class_found' };
    }

    // 4. Check if vocabulary_vault has any words for this level
    const { data: vaultWords, error: vErr } = await sb.from('vocabulary_vault')
      .select('id, theme_code, topic_code')
      .eq('target_level', levelNum)
      .is('deleted_at', null)
      .limit(10);

    if (vErr || !vaultWords || vaultWords.length === 0) {
      return { synced: false, reason: 'no_vault_words' };
    }

    // 5. If not force, check if tests are already provisioned for this class
    if (!force) {
      const { count: existingCount } = await sb.from('tests')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', targetClassId)
        .is('deleted_at', null);

      if (existingCount && existingCount > 0) {
        return { synced: false, reason: 'already_provisioned', count: existingCount, classId: targetClassId };
      }
    }

    // 6. Run autoGenerateTestsHierarchy
    const res = await autoGenerateTestsHierarchy([levelNum], {
      programId,
      explicitClassId: targetClassId
    });

    clearApiCache('tests');

    return {
      synced: true,
      tasks: res.tasks,
      tests: res.tests,
      updated: res.updated,
      classId: targetClassId
    };
  } catch (err) {
    console.error('[autoSyncClassTestsForLevel] Error:', err);
    return { synced: false, error: err.message };
  }
}

export async function getSecuritySettings() {
  const sb = await getSupabase();
  const { data, error } = await sb.from('site_settings').select('key, value').in('key', ['anti_cheat_enabled', 'anti_cheat_sound_enabled', 'anti_cheat_countdown_seconds', 'anti_cheat_sound_type', 'anti_cheat_custom_sound_b64']);
  if (error) {
    console.error('Failed to load security settings:', error);
    return null;
  }
  const settings = Object.fromEntries((data || []).map(r => [r.key, r.value]));
  return {
    enabled: settings.anti_cheat_enabled !== 'false',
    soundEnabled: settings.anti_cheat_sound_enabled !== 'false',
    countdownSeconds: Math.max(parseInt(settings.anti_cheat_countdown_seconds || '30', 10), 25),
    soundType: settings.anti_cheat_sound_type || 'police_siren',
    customSoundB64: settings.anti_cheat_custom_sound_b64 || ''
  };
}

export async function fetchActiveTestSession(testId, batchId = null) {
  const sb = await getSupabase();
  const { data: asm, error } = await sb.from('tests')
    .select('id, title, test_type, test_subtype, working_duration_minutes, availability_start, availability_end, payload')
    .eq('id', testId)
    .single();
  if (error || !asm) return null;

  const session = asm.payload?.test_session || null;
  if (!session) return null;

  const now = new Date();
  const autoClose = session.auto_close_at ? new Date(session.auto_close_at) : null;
  const isExpired = autoClose && autoClose.getTime() <= now.getTime();
  const isUnlocked = session.status === 'UNLOCKED' && !isExpired;

  const batchMatches = !batchId || !session.batch_id || session.batch_id === batchId;
  const remainingMs = autoClose ? Math.max(0, autoClose.getTime() - now.getTime()) : 0;
  const remainingMinutes = Math.ceil(remainingMs / 60000);

  return {
    ...session,
    test_id: testId,
    is_unlocked: isUnlocked && batchMatches,
    is_expired: isExpired,
    remaining_minutes: remainingMinutes,
    remaining_seconds: Math.floor(remainingMs / 1000)
  };
}

export async function openTestSession({ testId, batchId, allocatedMinutes, allowedStudentIds = [], isRemedial = false, remedialStudentIds = [] }) {
  const sb = await getSupabase();
  const { data: existing, error: fetchErr } = await sb.from('tests')
    .select('id, payload')
    .eq('id', testId)
    .single();
  if (fetchErr || !existing) throw new Error('Test not found');

  const minutes = Math.max(1, parseInt(allocatedMinutes, 10) || 30);
  const now = new Date();
  const autoClose = new Date(now.getTime() + minutes * 60 * 1000);

  const testSession = {
    batch_id: batchId,
    status: 'UNLOCKED',
    allocated_minutes: minutes,
    unlocked_at: now.toISOString(),
    auto_close_at: autoClose.toISOString(),
    allowed_student_ids: Array.isArray(allowedStudentIds) ? allowedStudentIds : [],
    is_remedial: Boolean(isRemedial),
    remedial_student_ids: Array.isArray(remedialStudentIds) ? remedialStudentIds : []
  };

  const updatedPayload = {
    ...(existing.payload || {}),
    test_session: testSession
  };

  const updated = await adminUpdate('tests', testId, {
    working_duration_minutes: minutes,
    availability_start: now.toISOString(),
    availability_end: autoClose.toISOString(),
    schedule_mode: 'strict',
    payload: updatedPayload
  });

  return { success: true, session: testSession, test: updated };
}

export async function addLateStudentsToSession({ testId, studentIds = [], remedialStudentIds = [] }) {
  const sb = await getSupabase();
  const { data: existing, error: fetchErr } = await sb.from('tests')
    .select('id, payload')
    .eq('id', testId)
    .single();
  if (fetchErr || !existing) throw new Error('Test not found');

  const currentSession = existing.payload?.test_session;
  if (!currentSession || currentSession.status !== 'UNLOCKED') {
    throw new Error('This test session is inactive or has been closed.');
  }

  const existingAllowed = new Set(currentSession.allowed_student_ids || []);
  const existingRemedials = new Set(currentSession.remedial_student_ids || []);

  (studentIds || []).forEach(id => existingAllowed.add(id));
  (remedialStudentIds || []).forEach(id => existingRemedials.add(id));

  const updatedSession = {
    ...currentSession,
    allowed_student_ids: Array.from(existingAllowed),
    remedial_student_ids: Array.from(existingRemedials)
  };

  const updatedPayload = {
    ...(existing.payload || {}),
    test_session: updatedSession
  };

  const updated = await adminUpdate('tests', testId, {
    payload: updatedPayload
  });

  return { success: true, session: updatedSession, test: updated };
}

export async function labelAttemptRemedial(attemptId, isRemedial = true, cap = 60.0) {
  const sb = await getSupabase();
  const { data: att, error: attErr } = await sb.from('attempts')
    .select('id, student_id, test_id, percentage, score, total_questions')
    .eq('id', attemptId)
    .single();
  if (attErr || !att) throw new Error('Attempt not found');

  const rawPct = parseFloat(att.percentage || 0);
  const effectiveScore = isRemedial ? Math.min(rawPct, cap) : rawPct; // Remedial capped at max 60%
  const grade = getGrade(effectiveScore);

  const { data: updated, error: updErr } = await sb.from('attempts')
    .update({
      is_remedial: isRemedial,
      is_remedial_unlocked: isRemedial,
      is_forgiven: false,
      forgiven_reason: null,
      forgiven_at: null,
      forgiven_by: null,
      effective_score: effectiveScore,
      grade: grade,
      updated_at: new Date().toISOString()
    })
    .eq('id', attemptId)
    .select()
    .single();

  if (updErr) throw updErr;

  try {
    await sb.from('audit_logs').insert({
      actor_role: 'admin',
      action: isRemedial ? 'ATTEMPT_SET_REMEDIAL' : 'ATTEMPT_SET_NORMAL',
      entity_type: 'attempts',
      entity_id: attemptId,
      new_value: { is_remedial: isRemedial, effective_score: effectiveScore, grade },
      created_at: new Date().toISOString()
    });
  } catch (auditErr) {
    console.warn('[labelAttemptRemedial] Audit log failed (non-blocking):', auditErr);
  }

  // Resolve best score across attempts for this student & test
  const { data: allAttempts } = await sb.from('attempts')
    .select('id, effective_score, percentage, created_at')
    .eq('student_id', att.student_id)
    .eq('test_id', att.test_id)
    .in('status', ['submitted', 'auto_submitted', 'evaluated']);

  if (allAttempts && allAttempts.length > 0) {
    allAttempts.sort((a, b) => {
      const scoreA = Number(a.effective_score ?? a.percentage ?? 0);
      const scoreB = Number(b.effective_score ?? b.percentage ?? 0);
      if (scoreB !== scoreA) return scoreB - scoreA;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    const bestId = allAttempts[0].id;
    for (const a of allAttempts) {
      await sb.from('attempts')
        .update({ is_best_score: a.id === bestId })
        .eq('id', a.id);
    }
  }

  return { success: true, attempt: updated };
}

export async function labelAttemptNormal(attemptId) {
  const sb = await getSupabase();
  const { data: att, error: attErr } = await sb.from('attempts')
    .select('id, student_id, test_id, percentage, score, total_questions')
    .eq('id', attemptId)
    .single();
  if (attErr || !att) throw new Error('Attempt not found');

  const rawPct = parseFloat(att.percentage || 0);
  const effectiveScore = rawPct;
  const grade = getGrade(effectiveScore);

  const { data: updated, error: updErr } = await sb.from('attempts')
    .update({
      is_remedial: false,
      is_remedial_unlocked: false,
      is_forgiven: false,
      forgiven_reason: null,
      forgiven_at: null,
      forgiven_by: null,
      effective_score: effectiveScore,
      grade: grade,
      updated_at: new Date().toISOString()
    })
    .eq('id', attemptId)
    .select()
    .single();

  if (updErr) throw updErr;

  try {
    await sb.from('audit_logs').insert({
      actor_role: 'admin',
      action: 'ATTEMPT_SET_NORMAL',
      entity_type: 'attempts',
      entity_id: attemptId,
      new_value: { is_remedial: false, is_forgiven: false, effective_score: effectiveScore, grade },
      created_at: new Date().toISOString()
    });
  } catch (auditErr) {
    console.warn('[labelAttemptNormal] Audit log failed (non-blocking):', auditErr);
  }

  // Resolve best score across attempts for this student & test
  const { data: allAttempts } = await sb.from('attempts')
    .select('id, effective_score, percentage, created_at')
    .eq('student_id', att.student_id)
    .eq('test_id', att.test_id)
    .in('status', ['submitted', 'auto_submitted', 'evaluated']);

  if (allAttempts && allAttempts.length > 0) {
    allAttempts.sort((a, b) => {
      const scoreA = Number(a.effective_score ?? a.percentage ?? 0);
      const scoreB = Number(b.effective_score ?? b.percentage ?? 0);
      if (scoreB !== scoreA) return scoreB - scoreA;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    const bestId = allAttempts[0].id;
    for (const a of allAttempts) {
      await sb.from('attempts')
        .update({ is_best_score: a.id === bestId })
        .eq('id', a.id);
    }
  }

  return { success: true, attempt: updated };
}

export async function labelAttemptForgiven(attemptId, reason = 'Tutor Result Waiver') {
  const sb = await getSupabase();
  const { data: att, error: attErr } = await sb.from('attempts')
    .select('id, student_id, test_id, percentage, score, total_questions')
    .eq('id', attemptId)
    .single();
  if (attErr || !att) throw new Error('Attempt not found');

  const rawPct = parseFloat(att.percentage || 0);
  const effectiveScore = rawPct;
  const grade = getGrade(effectiveScore);

  const { data: updated, error: updErr } = await sb.from('attempts')
    .update({
      is_forgiven: true,
      forgiven_reason: (reason || 'Tutor Result Waiver').trim(),
      forgiven_at: new Date().toISOString(),
      forgiven_by: null,
      is_remedial: false,
      is_remedial_unlocked: false,
      effective_score: effectiveScore,
      grade: grade,
      updated_at: new Date().toISOString()
    })
    .eq('id', attemptId)
    .select()
    .single();

  if (updErr) throw updErr;

  try {
    await sb.from('audit_logs').insert({
      actor_role: 'admin',
      action: 'FORGIVEN_SCORE_GRANTED',
      entity_type: 'attempts',
      entity_id: attemptId,
      new_value: { is_forgiven: true, reason: (reason || 'Tutor Result Waiver').trim(), student_id: att.student_id, test_id: att.test_id },
      created_at: new Date().toISOString()
    });
  } catch (auditErr) {
    console.warn('[labelAttemptForgiven] Audit log failed (non-blocking):', auditErr);
  }

  // Resolve best score across attempts for this student & test
  const { data: allAttempts } = await sb.from('attempts')
    .select('id, effective_score, percentage, created_at')
    .eq('student_id', att.student_id)
    .eq('test_id', att.test_id)
    .in('status', ['submitted', 'auto_submitted', 'evaluated']);

  if (allAttempts && allAttempts.length > 0) {
    allAttempts.sort((a, b) => {
      const scoreA = Number(a.effective_score ?? a.percentage ?? 0);
      const scoreB = Number(b.effective_score ?? b.percentage ?? 0);
      if (scoreB !== scoreA) return scoreB - scoreA;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    const bestId = allAttempts[0].id;
    for (const a of allAttempts) {
      await sb.from('attempts')
        .update({ is_best_score: a.id === bestId })
        .eq('id', a.id);
    }
  }

  return { success: true, attempt: updated };
}

export async function closeTestSession(testId) {
  const sb = await getSupabase();
  const { data: existing, error: fetchErr } = await sb.from('tests')
    .select('id, payload')
    .eq('id', testId)
    .single();
  if (fetchErr || !existing) throw new Error('Test not found');

  const testSession = {
    ...(existing.payload?.test_session || {}),
    status: 'LOCKED',
    closed_at: new Date().toISOString()
  };

  const updatedPayload = {
    ...(existing.payload || {}),
    test_session: testSession
  };

  const updated = await adminUpdate('tests', testId, {
    availability_end: new Date().toISOString(),
    payload: updatedPayload
  });

  return { success: true, session: testSession, test: updated };
}

export async function checkStudentTestAccess(studentId, testId) {
  const sb = await getSupabase();

  const { data: student, error: studErr } = await sb.from('students')
    .select('id, name, batch_id')
    .eq('id', studentId)
    .single();
  if (studErr || !student) {
    return { allowed: false, reason: 'STUDENT_NOT_FOUND', message: 'Student record not found.' };
  }

  const { data: asm, error: asmErr } = await sb.from('tests')
    .select('id, title, status, test_type, test_subtype, shell_code, payload')
    .eq('id', testId)
    .single();
  if (asmErr || !asm) {
    return { allowed: false, reason: 'NOT_FOUND', message: 'Test not found.' };
  }

  const isExamSubtype = (asm.test_subtype || '').toUpperCase().includes('TEST');
  const isExamShell = (asm.shell_code || '').toUpperCase().endsWith('-TEST');
  const isExamTitle = (asm.title || '').toLowerCase().includes('test') && !(asm.title || '').toLowerCase().includes('task');
  const isFormalExam = ((asm.test_type || '').toLowerCase() === 'exam' || isExamSubtype || isExamShell || isExamTitle) &&
                       !(asm.shell_code || '').toUpperCase().includes('-TASK') &&
                       !(asm.test_subtype || '').toUpperCase().includes('TASK') &&
                       !(asm.title || '').toLowerCase().includes('task') &&
                       (asm.test_type || '').toLowerCase() !== 'quiz';

  if (!isFormalExam) {
    return { allowed: true, is_test: false };
  }

  const isFlexible = (asm.schedule_mode || asm.payload?.schedule_mode) === 'flexible';
  if (isFlexible) {
    return { allowed: true, is_test: true, is_flexible: true };
  }

  const session = asm.payload?.test_session;
  if (!session || session.status !== 'UNLOCKED') {
    return {
      allowed: false,
      is_test: true,
      reason: 'SESSION_LOCKED',
      message: 'This test session has not been opened by the Tutor yet. Please wait for instructions from the Tutor in class.'
    };
  }

  const now = new Date();
  const autoClose = session.auto_close_at ? new Date(session.auto_close_at) : null;
  if (autoClose && autoClose.getTime() <= now.getTime()) {
    return {
      allowed: false,
      is_test: true,
      reason: 'SESSION_EXPIRED',
      message: 'The test session has ended and access is locked.'
    };
  }

  const allowedList = session.allowed_student_ids || [];
  if (session.batch_id && student.batch_id && session.batch_id !== student.batch_id) {
    // If student is explicitly whitelisted in session, allow them even if batch_id differs
    if (!allowedList.includes(studentId)) {
      return {
        allowed: false,
        is_test: true,
        reason: 'WRONG_BATCH',
        message: 'This test session is designated for a different batch.'
      };
    }
  }

  if (Array.isArray(allowedList) && allowedList.length > 0 && !allowedList.includes(studentId)) {
    return {
      allowed: false,
      is_test: true,
      reason: 'NOT_WHITELISTED',
      message: "You are not on the attendance whitelist for today's test session. Please contact the Tutor in class."
    };
  }

  const remainingMs = autoClose ? Math.max(0, autoClose.getTime() - now.getTime()) : 0;
  return {
    allowed: true,
    is_test: true,
    session: session,
    remaining_minutes: Math.ceil(remainingMs / 60000),
    auto_close_at: session.auto_close_at
  };
}

export async function removeStudentFromTestSession({ testId, studentId, action = 'submit' }) {
  const sb = await getSupabase();
  const { data: existing, error: fetchErr } = await sb.from('tests')
    .select('id, payload')
    .eq('id', testId)
    .single();
  if (fetchErr || !existing) throw new Error('Test not found');

  const currentSession = existing.payload?.test_session;
  if (!currentSession) {
    throw new Error('No active test session found.');
  }

  const allowed = (currentSession.allowed_student_ids || []).filter(id => id !== studentId);
  const remedials = (currentSession.remedial_student_ids || []).filter(id => id !== studentId);

  const updatedSession = {
    ...currentSession,
    allowed_student_ids: allowed,
    remedial_student_ids: remedials
  };

  const updatedPayload = {
    ...(existing.payload || {}),
    test_session: updatedSession
  };

  await adminUpdate('tests', testId, {
    payload: updatedPayload
  });

  // Handle active in-progress attempt for this student & test
  const { data: activeAttempts } = await sb.from('attempts')
    .select('id, status, started_at, total_questions')
    .eq('student_id', studentId)
    .eq('test_id', testId)
    .eq('status', 'in_progress');

  if (activeAttempts && activeAttempts.length > 0) {
    for (const att of activeAttempts) {
      if (action === 'submit') {
        // Collect current answers from attempt_answers
        const { data: ansRows } = await sb.from('attempt_answers')
          .select('id, student_answer, accepted_answers_snapshot, correct_answer_snapshot')
          .eq('attempt_id', att.id);

        let correctCount = 0;
        (ansRows || []).forEach(r => {
          const ans = (r.student_answer || '').trim();
          if (ans) {
            let accepted = r.accepted_answers_snapshot || [];
            if (typeof accepted === 'string') {
              try { accepted = JSON.parse(accepted); } catch { accepted = []; }
            }
            const normAns = ans.toLowerCase();
            const isMatch = (accepted || []).some(a => String(a).trim().toLowerCase() === normAns) ||
              (r.correct_answer_snapshot && String(r.correct_answer_snapshot).trim().toLowerCase() === normAns);
            if (isMatch) correctCount++;
          }
        });

        const totalQ = att.total_questions || (ansRows ? ansRows.length : 1);
        const rawScore = totalQ > 0 ? (correctCount / totalQ) * 100 : 0;
        const isRem = Boolean(currentSession.is_remedial);
        const effectiveScore = isRem ? Math.min(rawScore, 60.0) : rawScore;
        const grade = getGrade(effectiveScore);

        await sb.from('attempts')
          .update({
            status: 'auto_submitted',
            score: correctCount,
            correct_count: correctCount,
            percentage: Math.round(rawScore * 10) / 10,
            effective_score: Math.round(effectiveScore * 10) / 10,
            grade: grade,
            submitted_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', att.id);
      } else if (action === 'cancel') {
        await sb.from('attempts')
          .update({
            status: 'cancelled',
            score: 0,
            percentage: 0,
            effective_score: 0,
            grade: 'E',
            submitted_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', att.id);
      }
    }
  }

  // Audit log
  try {
    await sb.from('audit_logs').insert({
      actor_role: 'admin',
      action: 'REMOVE_STUDENT_FROM_TEST_SESSION',
      entity_type: 'test',
      entity_id: testId,
      new_value: {
        student_id: studentId,
        action: action,
        timestamp: new Date().toISOString()
      },
      created_at: new Date().toISOString()
    });
  } catch (logErr) {
    console.warn('Failed to insert audit log for student removal:', logErr);
  }

  return { success: true, updatedSession };
}

/**
 * Extend or reduce active test session time and update active student attempts
 * Supports positive minutes (add time) and negative minutes (reduce time).
 */
export async function extendTestSessionTime(arg1, arg2) {
  const sb = await getSupabase();
  let testIds = [];
  let additionalMinutes = 10;

  if (typeof arg1 === 'object' && !Array.isArray(arg1) && arg1 !== null) {
    testIds = arg1.testIds || [];
    additionalMinutes = arg1.additionalMinutes ?? 10;
  } else if (Array.isArray(arg1)) {
    testIds = arg1;
    additionalMinutes = arg2 ?? 10;
  } else if (typeof arg1 === 'string') {
    testIds = [arg1];
    additionalMinutes = arg2 ?? 10;
  }

  const mins = parseInt(additionalMinutes, 10);
  if (isNaN(mins) || mins === 0) {
    throw new Error('Jumlah menit penyesuaian tidak valid (tidak boleh 0).');
  }

  if (!testIds.length) {
    throw new Error('No tests specified to adjust time.');
  }

  const { data: tests, error: fetchErr } = await sb.from('tests')
    .select('id, working_duration_minutes, availability_end, payload')
    .in('id', testIds);

  if (fetchErr || !tests?.length) throw new Error('Tests not found: ' + (fetchErr?.message || ''));

  let latestAutoClose = null;
  const now = Date.now();

  for (const t of tests) {
    const currentSession = t.payload?.test_session;
    if (!currentSession || currentSession.status !== 'UNLOCKED') continue;

    const baseCloseTime = currentSession.auto_close_at
      ? new Date(currentSession.auto_close_at).getTime()
      : (t.availability_end ? new Date(t.availability_end).getTime() : (now + 30 * 60 * 1000));

    // Calculate new close time: add or subtract
    let newCloseMs = (mins > 0)
      ? Math.max(now, baseCloseTime) + (mins * 60 * 1000)
      : baseCloseTime + (mins * 60 * 1000);

    // Safety guard: ensure the session remains open for at least 1 minute into the future
    const minSafeCloseMs = now + 60 * 1000;
    if (newCloseMs < minSafeCloseMs) {
      newCloseMs = minSafeCloseMs;
    }
    const newCloseIso = new Date(newCloseMs).toISOString();

    const updatedSession = {
      ...currentSession,
      auto_close_at: newCloseIso,
      allocated_minutes: Math.max(1, (currentSession.allocated_minutes || 0) + mins)
    };

    const updatedPayload = {
      ...(t.payload || {}),
      test_session: updatedSession
    };

    await sb.from('tests').update({
      availability_end: newCloseIso,
      working_duration_minutes: Math.max(1, (t.working_duration_minutes || 0) + mins),
      payload: updatedPayload
    }).eq('id', t.id);

    if (!latestAutoClose || newCloseMs > latestAutoClose) {
      latestAutoClose = newCloseMs;
    }
  }

  // Also adjust expires_at for all in_progress attempts belonging to these testIds
  if (latestAutoClose) {
    const { data: activeAttempts } = await sb.from('attempts')
      .select('id, expires_at')
      .in('test_id', testIds)
      .eq('status', 'in_progress');

    if (activeAttempts && activeAttempts.length > 0) {
      for (const att of activeAttempts) {
        const currentExp = att.expires_at ? new Date(att.expires_at).getTime() : now;
        let newAttExp = (mins > 0)
          ? Math.max(now, currentExp) + (mins * 60 * 1000)
          : currentExp + (mins * 60 * 1000);
        if (newAttExp < now + 60 * 1000) {
          newAttExp = now + 60 * 1000;
        }
        await sb.from('attempts').update({
          expires_at: new Date(newAttExp).toISOString(),
          updated_at: new Date().toISOString()
        }).eq('id', att.id);
      }
    }
  }

  const remainingMins = latestAutoClose ? Math.max(1, Math.ceil((latestAutoClose - now) / 60000)) : Math.max(1, Math.abs(mins));

  return {
    success: true,
    addedMinutes: mins,
    newAutoCloseAt: latestAutoClose ? new Date(latestAutoClose).toISOString() : null,
    remainingMinutes: remainingMins
  };
}

/**
 * Reset / forgive student anti-cheat alarms in active test session
 */
export async function resetStudentTestAlarms({ studentId, testIds = [] }) {
  const sb = await getSupabase();
  if (!studentId || !testIds.length) return { success: false };

  const { error } = await sb.from('audit_logs')
    .update({ action: 'CHEAT_FORGIVEN_BY_TUTOR' })
    .eq('action', 'CHEAT_ATTEMPT')
    .eq('actor_user_id', studentId)
    .in('entity_id', testIds);

  if (error) console.warn('Failed to forgive cheat logs:', error);
  return { success: !error };
}

export async function fetchLiveTestSessionData({ testIds = [], studentIds = [], unlockedAt = null }) {
  const sb = await getSupabase();
  if (!testIds.length || !studentIds.length) {
    return { attempts: [], cheatLogs: [], answers: [] };
  }

  let attemptsQuery = sb.from('attempts')
    .select('id, student_id, test_id, status, score, correct_count, total_questions, percentage, effective_score, grade, started_at, expires_at, submitted_at, updated_at')
    .in('test_id', testIds)
    .in('student_id', studentIds);

  // Safe window start: if unlockedAt provided, use it; otherwise default to past 3 hours to prevent leaking ancient historical attempts
  const safeUnlockedAt = unlockedAt || new Date(Date.now() - 3 * 3600 * 1000).toISOString();
  const windowStart = new Date(new Date(safeUnlockedAt).getTime() - 10 * 60 * 1000).toISOString();

  attemptsQuery = attemptsQuery.gte('created_at', windowStart);
  const { data: attempts } = await attemptsQuery;

  let cheatQuery = sb.from('audit_logs')
    .select('id, actor_user_id, entity_id, new_value, created_at')
    .eq('action', 'CHEAT_ATTEMPT')
    .in('entity_id', testIds)
    .in('actor_user_id', studentIds)
    .gte('created_at', windowStart);

  const { data: cheatLogs } = await cheatQuery;

  const attemptIds = (attempts || []).map(a => a.id);
  let answersData = [];
  if (attemptIds.length > 0) {
    const { data: answers } = await sb.from('attempt_answers')
      .select('id, attempt_id, student_answer, accepted_answers_snapshot, correct_answer_snapshot, is_correct, score, updated_at')
      .in('attempt_id', attemptIds);
    answersData = answers || [];
  }

  return {
    attempts: attempts || [],
    cheatLogs: cheatLogs || [],
    answers: answersData
  };
}

/**
 * Extend or reduce exam time for an individual student attempt (e.g. tech glitch recovery or correction)
 */
export async function extendIndividualAttemptTime(attemptId, additionalMinutes = 10) {
  const sb = await getSupabase();
  const mins = parseInt(additionalMinutes, 10);
  if (!attemptId || isNaN(mins) || mins === 0) throw new Error('attemptId and valid additionalMinutes required');

  const { data: att, error: fetchErr } = await sb
    .from('attempts')
    .select('id, expires_at, status')
    .eq('id', attemptId)
    .single();
  if (fetchErr) throw fetchErr;

  const now = Date.now();
  const currentExpiry = att.expires_at ? new Date(att.expires_at).getTime() : now;
  let newExpiryMs = (mins > 0)
    ? Math.max(now, currentExpiry) + (mins * 60000)
    : currentExpiry + (mins * 60000);
  if (newExpiryMs < now + 60000) {
    newExpiryMs = now + 60000;
  }
  const newExpiry = new Date(newExpiryMs).toISOString();

  const { error: updErr } = await sb
    .from('attempts')
    .update({ expires_at: newExpiry, updated_at: new Date().toISOString() })
    .eq('id', attemptId);
  if (updErr) throw updErr;

  return { success: true, newExpiry, addedMinutes: mins };
}

/**
 * Re-open an interrupted or auto-submitted attempt for a student to resume
 */
export async function reopenStudentAttempt(attemptId, additionalMinutes = 30) {
  const sb = await getSupabase();
  if (!attemptId) throw new Error('attemptId required');

  const newExpiry = new Date(Date.now() + additionalMinutes * 60000).toISOString();
  const { error } = await sb
    .from('attempts')
    .update({
      status: 'in_progress',
      submitted_at: null,
      expires_at: newExpiry,
      updated_at: new Date().toISOString()
    })
    .eq('id', attemptId);
  if (error) throw error;

  return { success: true, newExpiry };
}

if (typeof window !== 'undefined') {
  window.adminFetchAll = adminFetchAll;
  window.adminUpdate = adminUpdate;
  window.adminInsert = adminInsert;
  window.fetchActiveTestSession = fetchActiveTestSession;
  window.openTestSession = openTestSession;
  window.addLateStudentsToSession = addLateStudentsToSession;
  window.removeStudentFromTestSession = removeStudentFromTestSession;
  window.extendTestSessionTime = extendTestSessionTime;
  window.extendIndividualAttemptTime = extendIndividualAttemptTime;
  window.reopenStudentAttempt = reopenStudentAttempt;
  window.resetStudentTestAlarms = resetStudentTestAlarms;
  window.fetchLiveTestSessionData = fetchLiveTestSessionData;
  window.labelAttemptRemedial = labelAttemptRemedial;
  window.labelAttemptNormal = labelAttemptNormal;
  window.labelAttemptForgiven = labelAttemptForgiven;
  window.closeTestSession = closeTestSession;
  window.checkStudentTestAccess = checkStudentTestAccess;
  window.adminOverridePrerequisitesWithRemedial = adminOverridePrerequisitesWithRemedial;
  window.adminApplyForgiven = adminApplyForgiven;
  window.adminRevokeForgiven = adminRevokeForgiven;
  window.fetchClassTestSettings = fetchClassTestSettings;
  window.saveClassTestSettings = saveClassTestSettings;
  window.updateTestPassingScore = updateTestPassingScore;
  window.fetchThemeProgramAssignments = fetchThemeProgramAssignments;
  window.toggleThemeProgramAssignment = toggleThemeProgramAssignment;
}


