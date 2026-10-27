// TOPS CORE — API Module (Stabilized & Synchronized)
// Centralized server & database interface for TOPS CORE LMS.
import { getSupabase, SUPABASE_URL, callEdgeFunction } from './supabase.js?v=5.3.2';
import { evaluateAnswer, calculatePercentage, isPassing, calculateGrade, calculateOverallStudentScore, parseCorrectAnswers, stripHyphens, GRADE_PALETTE, getGradeColor, getScoreColor, getGradeSymbol, getGradeTheme, formatGradeBadgeHtml } from './grading.js?v=5.6.5';
import { stripHonorific, getStudentInitial } from './utils/avatar-engine.js?v=5.3.2';
import { escapeHtml, escHtml } from './app.js?v=5.3.2';

export function getGrade(pct) {
  return calculateGrade(pct);
}

export { evaluateAnswer, calculatePercentage, isPassing, calculateGrade, calculateOverallStudentScore, parseCorrectAnswers, stripHyphens, GRADE_PALETTE, getGradeColor, getScoreColor, getGradeSymbol, getGradeTheme, formatGradeBadgeHtml, callEdgeFunction, stripHonorific, getStudentInitial, escapeHtml, escHtml };

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
 * Konversi nomor level menjadi teks ordinal baku:
 * 1 -> 1st Level, 2 -> 2nd Level, 3 -> 3rd Level, 4 -> 4th Level, dst.
 */
export function toOrdinalLevel(num) {
  const n = parseInt(num, 10);
  if (isNaN(n)) return '1st Level';
  if (n === 0) return 'General';
  if (n < 0) return '1st Level';
  const j = n % 10;
  const k = n % 100;
  let suffix = 'th';
  if (j === 1 && k !== 11) suffix = 'st';
  else if (j === 2 && k !== 12) suffix = 'nd';
  else if (j === 3 && k !== 13) suffix = 'rd';
  return `${n}${suffix} Level`;
}

/** Alias kompatibilitas mundur jika ada tampilan lama yang memanggil huruf */
export function toLevelLetter(num) {
  return toOrdinalLevel(num);
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
      .select('id, name, code, description, level_id, levels!classes_level_id_fkey(level_number)')
      .is('deleted_at', null)
        .eq('is_active', true)
        .order('name');
      if (programId) query = query.eq('program_id', programId)
        .is('deleted_at', null);
      if (levelId) query = query.eq('level_id', levelId);
      
    // Classes do not have institution_id directly, they are global or program-specific via class_programs
    
    const { data, error } = await query;
    if (error) throw error;
    
    if (!error && data && data.length > 0) return data;
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
    .select('id, title, display_name, test_subtype, test_type, class_id, level_id, display_order, status, minimum_required_score, prerequisite_test_id, prerequisite_id, working_duration_minutes, schedule_mode, levels(id, name, level_number)')
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
      results = results.filter(a => !a.levels || typeof a.levels.level_number !== 'number' || a.levels.level_number <= maxLvl);
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
  const { data, error } = await sb.from('attempts')
    .select('id, test_id, score, percentage, grade, status, is_best_score, submitted_at, tests(id, title, test_subtype, deleted_at, status, classes(name))')
    .eq('student_id', studentId)
    .in('status', ['submitted', 'auto_submitted'])
    .order('submitted_at', { ascending: false });

  if (!error) return data || [];

  // Fallback 2-step jika foreign key cache Supabase belum sinkron
  const { data: attempts, error: attErr } = await sb.from('attempts')
    .select('id, test_id, score, percentage, grade, status, is_best_score, submitted_at')
    .eq('student_id', studentId)
    .in('status', ['submitted', 'auto_submitted'])
    .order('submitted_at', { ascending: false });

  if (attErr || !attempts) return [];

  const testIds = [...new Set(attempts.map(a => a.test_id).filter(Boolean))];
  let testMap = {};
  if (testIds.length > 0) {
    const { data: asmData } = await sb.from('tests').select('id, title, test_subtype, deleted_at, status, classes(name)').in('id', testIds);
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
    .select('id, status, score, percentage, grade, submitted_at')
    .eq('student_id', studentId)
    .eq('test_id', testId)
    .in('status', ['submitted', 'auto_submitted'])
    .order('percentage', { ascending: false });
  if (error) throw error;
  return data || [];
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
    
    let levelNum = 1;
    if (test.level_id) {
      const { data: levelRec } = await sb.from('levels').select('level_number').eq('id', test.level_id).single();
      if (levelRec?.level_number) levelNum = levelRec.level_number;
    }
    
    // Resilient vocabulary query: try with category column first, fallback without category column
    let vaultData = null;
    try {
      let query = sb.from('vocabulary_vault')
        .select('id, english, indonesian, word_type, topic, topic_code, theme, theme_code, target_level, category')
        .is('deleted_at', null)
        .eq('target_level', levelNum)
        .range(0, 4999);
      if (themes && Array.isArray(themes) && themes.length > 0) {
        query = query.in('theme_code', themes);
      } else if (test.test_type === 'TEST' && themeCode) {
        const allThemes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        const idx = allThemes.indexOf(themeCode);
        if (idx !== -1) {
          const targetThemes = allThemes.slice(0, idx + 1);
          query = query.in('theme_code', targetThemes);
        } else {
          query = query.eq('theme_code', themeCode);
        }
      } else {
        if (themeCode) query = query.eq('theme_code', themeCode);
        if (topicCode) query = query.eq('topic_code', topicCode);
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
      if (themes && Array.isArray(themes) && themes.length > 0) {
        queryNoCat = queryNoCat.in('theme_code', themes);
      } else if (test.test_type === 'TEST' && themeCode) {
        const allThemes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        const idx = allThemes.indexOf(themeCode);
        if (idx !== -1) {
          queryNoCat = queryNoCat.in('theme_code', allThemes.slice(0, idx + 1));
        } else {
          queryNoCat = queryNoCat.eq('theme_code', themeCode);
        }
      } else {
        if (themeCode) queryNoCat = queryNoCat.eq('theme_code', themeCode);
        if (topicCode) queryNoCat = queryNoCat.eq('topic_code', topicCode);
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

      // Secondary Safety Fallback: If strict theme/topic yielded 0 words, fallback to general words for this level
      if (vaultWords.length === 0) {
        console.warn(`[Vault Fallback] 0 words for theme ${themeCode}/topic ${topicCode}, pulling general level ${levelNum} vault items.`);
        const { data: generalVault } = await sb.from('vocabulary_vault')
          .select('id, english, indonesian, word_type, topic, topic_code, theme, theme_code, target_level')
          .is('deleted_at', null)
          .eq('target_level', levelNum)
          .limit(100);
        if (generalVault && generalVault.length > 0) {
          vaultWords = generalVault.filter(w => {
            const wt = (w.word_type || '').toLowerCase();
            const isPhrase = ['expression', 'idiom', 'proverb', 'phrase'].includes(wt);
            return category === 'phrases' ? isPhrase : !isPhrase;
          });
        }
      }

      if (orderSetting === 'random') {
        fisherYates(vaultWords);
      } else {
        vaultWords.sort((a, b) => (a.indonesian || '').localeCompare(b.indonesian || ''));
      }
    }
      
    if (vaultWords && vaultWords.length > 0) {
      let allEnglishAnswers = [];
      let typeDistractorPools = {};
      const ansType = test.answer_type || test.payload?.answer_type || 'written';
      
      if (ansType.startsWith('dropdown') || ansType === 'multiple_choice' || ansType === 'selection') {
        let allDataQuery = sb.from('vocabulary_vault').select('english, word_type').is('deleted_at', null);
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

export async function startTest(studentId, testId) {
  try {
    return await callEdgeFunction('start-test', { student_id: studentId, test_id: testId });
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
    console.warn('Edge Function start-test unavailable, using client DB fallback:', edgeErr.message);
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
    const { data: prereqAttempts } = await sb.from('attempts')
      .select('score, percentage, status')
      .eq('student_id', studentId)
      .eq('test_id', prereqId)
      .in('status', ['submitted', 'auto_submitted', 'evaluated', 'SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED']);
    
    const reqScore = (asmData.minimum_required_score && parseFloat(asmData.minimum_required_score) > 0)
      ? parseFloat(asmData.minimum_required_score)
      : 60;
    const hasPassed = prereqAttempts && prereqAttempts.some(a => (parseFloat(a.percentage || a.score || 0)) >= reqScore);
    if (!hasPassed) {
      const pErr = new Error(`Prerequisite not completed. You must score at least ${reqScore}% on the prerequisite test.`);
      pErr.code = 'PREREQUISITE_NOT_MET';
      pErr.status = 403;
      throw pErr;
    }
  }

  // Guard: Do NOT insert attempt or start countdown if tutor hasn't unlocked it yet
  if (asmData.schedule_mode === 'manual' && asmData.is_unlocked === false) {
    const lockErr = new Error('LOCKED_BY_TUTOR');
    lockErr.code = 'LOCKED_BY_TUTOR';
    throw lockErr;
  }

  // Guard: Test Session Access & Attendance Whitelist (for TEST category)
  const isTest = (asmData.test_type || '').toUpperCase() === 'TEST' ||
                 (asmData.test_subtype || a.test_type || '').toUpperCase().includes('TEST') ||
                 (asmData.title || '').toUpperCase().includes('TEST');

  let activeSession = null;
  if (isTest) {
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
      .select('*', { count: 'exact', head: true })
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
        grade: 'F',
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
          answer_type: sq.answer_type || 'written',
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
      }
    }
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

  return {
    success: true,
    attempt: attempt,
    test: test,
    TEST: test,
    sections: sections,
    answers: sanitizedAnswers,
    resumed: !!existingAttempts?.[0]
  };
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
    console.warn('Edge Function submit-test unavailable, using server RPC fallback:', edgeErr.message);
  }

  if (!result) {
    // Server-authoritative fallback via PostgreSQL RPC (strictly server-side scoring & RLS compliance)
    const sb = await getSupabase();
    const { data: rpcData, error: rpcErr } = await sb.rpc('emergency_submit_attempt', {
      p_attempt_id: attemptId,
      p_answers: answersMap,
      p_status: targetStatus
    });

    if (rpcErr) throw rpcErr;
    result = rpcData;
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
    }
    const { data: existing } = await sb.from('tests').select('*').eq('id', id).single();
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
    let query = sb.from('tests').select('id, title, display_name, test_subtype, class_id, level_id, display_order, status, minimum_required_score, prerequisite_test_id, working_duration_minutes, schedule_mode, test_type, is_dynamic_shell, shell_code, max_attempts, retake_allowed, created_at, deleted_at, classes(name), levels(name, level_number)');
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
  const sb = await getSupabase();
  try {
    let query = sb.from('assignments').select('*, tests(*, classes(name), levels(name, level_number))');
    
    let orConditions = [];
    if (filters.batch_id) orConditions.push(`batch_id.eq.${filters.batch_id}`);
    if (filters.student_id) orConditions.push(`student_id.eq.${filters.student_id}`);
    
    if (orConditions.length > 0) {
      query = query.or(orConditions.join(','));
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    const validTests = [];
    for (const a of data || []) {
      if (a.tests && !a.tests.deleted_at && a.tests.status === 'PUBLISHED') {
        validTests.push({
          ...a.tests,
          assignment_id: a.id,
          availability_start: a.availability_start,
          availability_end: a.availability_end
        });
      }
    }
    return validTests;
  } catch (err) {
    console.warn('fetchAssignments failed:', err.message);
    return [];
  }
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
  let query = sb.from('word_types').select('*').order('name');
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

// --- Test instances ---
export async function fetchTestInstances(filters = {}) {
  const sb = await getSupabase();
  let query = sb.from('assignments').select('*, batches(name), students(name), tests(title, test_subtype)');
  if (filters.test_id) query = query.eq('test_id', filters.test_id);
  if (filters.batch_id) query = query.eq('batch_id', filters.batch_id);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// --- Class instances (scheduling) ---
export async function fetchClassInstances(filters = {}) {
  const sb = await getSupabase();
  let query = sb.from('class_instances').select('*');
  if (filters.class_id) query = query.eq('class_id', filters.class_id);
  if (filters.batch_id) query = query.eq('batch_id', filters.batch_id);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchClassInstanceRoster(instanceId) {
  const sb = await getSupabase();
  const { data, error } = await sb.from('class_instance_roster').select('*, students(id, name, gender)').eq('class_instance_id', instanceId);
  if (error) throw error;
  return data || [];
}

export async function addAdditionalMember(instanceId, studentId) {
  const sb = await getSupabase();
  const { data, error } = await sb.from('class_instance_roster').insert({ class_instance_id: instanceId, student_id: studentId, enrollment_type: 'manual' }).select().single();
  if (error) throw error;
  return data;
}

// --- Additional Admin Functions ---
export async function fetchClassMeetings(filters = {}) {
  const sb = await getSupabase();
  let query = sb.from('class_meetings').select('*');
  if (filters.class_instance_id) query = query.eq('class_instance_id', filters.class_instance_id);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

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

export async function generateAttemptNarrative(attemptId) {
  return await callEdgeFunction('generate-narrative', { attempt_id: attemptId });
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
export async function fetchVaultWords({ topic = null, search = null, targetLevel = null, limit = 2500, offset = 0 } = {}) {
  const sb = await getSupabase();
  let query = sb.from('vocabulary_vault')
    .select('id, topic, indonesian, english, word_type, target_level, theme, theme_code, topic_code')
    .is('deleted_at', null)
    .order('target_level', { ascending: true })
    .order('theme_code', { ascending: true })
    .order('topic_code', { ascending: true })
    .order('word_type', { ascending: true })
    .order('indonesian', { ascending: true })
    .range(offset, offset + limit - 1);

  if (targetLevel !== null) query = query.eq('target_level', targetLevel);
  if (topic) query = query.eq('topic', topic);
  if (search) {
    const term = search.trim();
    query = query.or(`indonesian.ilike.%${term}%,english.ilike.%${term}%,topic.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function fetchVaultTopics(targetLevelNum = null) {
  const sb = await getSupabase();
  let query = sb.from('vocabulary_vault')
    .select('topic')
    .is('deleted_at', null);
    
  if (targetLevelNum !== null) {
    query = query.eq('target_level', targetLevelNum);
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
    .select('id, theme, topic, indonesian, english, target_level, word_type')
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

  return {
    theme_code: String(row.theme_code || '').trim().replace(/\s+/g, ' ').toUpperCase(),
    theme:      String(row.theme || '').trim().replace(/\s+/g, ' '),
    topic_code: String(row.topic_code || '').trim().replace(/\s+/g, ' ').toUpperCase(),
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

export async function deleteVaultTopic(topic) {
  const sb = await getSupabase();
  const { error } = await sb.from('vocabulary_vault')
    .update({ deleted_at: new Date().toISOString() })
    .eq('topic', topic)
    .is('deleted_at', null);
  if (error) throw error;
  clearApiCache('vault');
  return true;
}

export async function deleteVaultTheme(theme) {
  const sb = await getSupabase();
  const { error } = await sb.from('vocabulary_vault')
    .update({ deleted_at: new Date().toISOString() })
    .eq('theme', theme)
    .is('deleted_at', null);
  if (error) throw error;
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
    const { data: lvlData } = await sb.from('levels').select('*').eq('id', levelId).single();
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

  // Resolve the final test_type:
  // - If caller explicitly passes 'TASK' or 'TEST', use that.
  // - Otherwise derive from tier for backward-compat with old QUIZ/EXAM callers.
  const resolvedCategory = test_type
    ? test_type
    : (tier === 'TASK' ? 'TASK' : 'TEST');

  let defaultAnswerType = answerType;
  if (testType === 'IDIOM_PROVERB' ) {
      defaultAnswerType = 'phrase_recognition';
  } else if (tier === 'TASK') {
      defaultAnswerType = 'spoken';
  } else {
      defaultAnswerType = 'written';
  }

  const testPayload = {
    institution_id:           institutionId,
    program_id:               programId,
    class_id:                 classId,
    level_id:                 levelId,
    test_subtype:          'VOCAB_' + tier,
    test_type:      resolvedCategory,
    title:                    title,
    description:              'Vocabulary Mastery (' + tier + '). Topics: ' + sourceTopics.join(', '),
    status:                   'PUBLISHED',
    availability_start:       windowStart || null,
    availability_end:         windowEnd || null,
    working_duration_minutes: durationMinutes || null,
    prerequisite_test_id:
      (tier === 'QUIZ' && sourceTaskIds.length > 0) ? sourceTaskIds[0] :
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
    .select('id, level_number, program_id')
    .eq('id', currentLevelId)
    .single();
  if (lvlErr || !levelData) return { levelUp: false, newLevel: null, status: 'ERROR' };

  // Level-up gate: ONLY the Final Theme TEST (tier = TEST) for this level
  // The single test that counts is the highest display_order TEST with >= 60% to advance
  const { data: exams, error: exErr } = await sb.from('tests')
    .select('id, title, display_order, shell_code, levels!inner(level_number)')
    .eq('level_id', currentLevelId)
    .neq('levels.level_number', 0)
    .eq('test_type', 'TEST')
    .eq('status', 'PUBLISHED')
    .order('display_order', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1); // Only the final TEST (highest display_order) counts as the gating test
  if (exErr || !exams || exams.length === 0) return { levelUp: false, newLevel: null, status: 'NO_TESTS' };

  const examIds = exams.map(e => e.id);
  const { data: attempts, error: attErr } = await sb.from('attempts')
    .select('test_id, percentage')
    .eq('student_id', studentId)
    .in('test_id', examIds)
    .eq('is_best_score', true);
  if (attErr) return { levelUp: false, newLevel: null, status: 'ERROR' };

  const bestScoreMap = {};
  (attempts || []).forEach(a => {
    bestScoreMap[a.test_id] = Math.max(bestScoreMap[a.test_id] || 0, parseFloat(a.percentage || 0));
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
    .eq('program_id', levelData.program_id)
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
      batch_id,
      batches:batch_id(current_level_id, levels:current_level_id(id, level_number, name))
    `)
    .eq('id', studentId)
    .single();
  
  if (error || !data) {
    if (error) console.error("fetchStudentLevel Error:", error);
    return { level_id: null, level_number: 1, level_name: '1st Level' };
  }
  
  const lvlId = data.batches?.current_level_id || null;
  const lvlNum = data.batches?.levels?.level_number || 1;
  const lvlName = data.batches?.levels?.name || '1st Level';
  return { level_id: lvlId, level_number: lvlNum, level_name: lvlName };
}

export async function exportVaultWords(mode = 'all') {
  const sb = await getSupabase();
  let query = sb.from('vocabulary_vault')
    .select('target_level, theme_code, theme, topic_code, topic, indonesian, english, word_type, created_at')
    .is('deleted_at', null)
    .order('target_level', { ascending: true })
    .order('theme_code', { ascending: true })
    .order('topic_code', { ascending: true })
    .order('word_type', { ascending: true })
    .order('indonesian', { ascending: true });

  if (mode === 'single_words') {
    // Exclude phrases
    // We cannot use NOT IN easily if some are NULL, but we can do it if word_type is not null
    // or just fetch all and filter in JS if simpler, but let's filter in JS to be safe with NULLs.
  }

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

  // Format data for Excel
  const exportData = filteredWords.map(w => {
    const wt = (w.word_type || '').toLowerCase();
    const isPhrase = ['expression', 'idiom', 'proverb'].includes(wt);
    return {
      Category: isPhrase ? 'Phrases' : 'Words',
      Level: w.target_level || '1',
      'Theme Code': w.theme_code || '',
      Theme: w.theme || '',
      'Topic Code': w.topic_code || '',
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
  const { data, error } = await sb.from('attempts')
    .update({ is_remedial_unlocked: true, updated_at: new Date().toISOString() })
    .eq('id', attemptId)
    .select().single();
  if (error) throw error;
  clearAdminCache('attempts');
  return data;
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

  const isTest = tier === 'TEST';
  const isPhrase = category === 'phrases' || modulePrefix === 'PHRASE';
  const effectiveDurationMinutes = durationMinutes !== null && durationMinutes !== undefined
    ? Number(durationMinutes)
    : (isTest ? 120 : 5);

  // Standardized Shell Code: e.g. 3A1-WORDS-TASK, 3A1-PHRASES-TASK, 3A-WORDS-TEST, 3A-PHRASES-TEST
  const code = isPhrase
    ? (isTest ? `${levelNum}${themeCode}-PHRASES-TEST` : `${levelNum}${themeCode}${topicCode || '1'}-PHRASES-TASK`)
    : (isTest ? `${levelNum}${themeCode}-WORDS-TEST` : `${levelNum}${themeCode}${topicCode || '1'}-WORDS-TASK`);

  // Standardized Title: e.g. "3rd Vocabulary A1 Words Task - Professional Identity"
  const ordinal = toOrdinal(levelNum);
  const cleanTitle = (topicName || themeName || '').replace(/["']/g, '').trim();
  const generatedTitle = isPhrase
    ? (isTest
        ? `${ordinal} Vocabulary ${themeCode} Phrases Test${cleanTitle ? ' - ' + cleanTitle : ''}`
        : `${ordinal} Vocabulary ${themeCode}${topicCode || '1'} Phrases Task${cleanTitle ? ' - ' + cleanTitle : ''}`)
    : (isTest
        ? `${ordinal} Vocabulary ${themeCode} Words Test${cleanTitle ? ' - ' + cleanTitle : ''}`
        : `${ordinal} Vocabulary ${themeCode}${topicCode || '1'} Words Task${cleanTitle ? ' - ' + cleanTitle : ''}`);

  // Default answer types: Spoken for Tasks (Words & Phrases), Written for Words Test, Selection for Phrases Test
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
  let { data: existing } = await sb.from('tests')
    .select('id, class_id, answer_type, payload')
    .eq('shell_code', code)
    .eq('program_id', programId)
    .eq('level_id', levelId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!existing) {
    // Check legacy aliases
    const legacyCodes = isPhrase
      ? [
          isTest ? `${levelNum}${themeCode} Phrases Test` : `${levelNum}${themeCode}${topicCode || '1'} Phrases Task`,
          isTest ? `3VOCAB-${themeCode}-TEST-PHR` : `3VOCAB-${themeCode}${topicCode || '1'}-PHR`
        ]
      : [
          isTest ? `${levelNum}${themeCode} Vocab Test` : `${levelNum}${themeCode}${topicCode || '1'} Vocab Task`,
          isTest ? `3VOCAB-${themeCode}-TEST-WOR` : `3VOCAB-${themeCode}${topicCode || '1'}-WOR`
        ];
    for (const leg of legacyCodes) {
      const { data: legacy } = await sb.from('tests')
        .select('id, class_id, answer_type, payload')
        .eq('shell_code', leg)
        .eq('program_id', programId)
        .eq('level_id', levelId)
        .is('deleted_at', null)
        .maybeSingle();
      if (legacy) { existing = legacy; break; }
    }
  }

  // Prioritize explicitly passed answerType, otherwise check existing or use defaultAnswerType
  const effectiveAnswerType = answerType || (existing && existing.answer_type) || defaultAnswerType;
  const effectiveMinScore = config.minimumRequiredScore !== undefined 
    ? Number(config.minimumRequiredScore) 
    : (existing?.minimum_required_score || 60);

  const asmData = {
    institution_id:             institutionId,
    program_id:                 programId,
    class_id:                   classId || (existing ? existing.class_id : null),
    level_id:                   levelId,
    module_id:                  moduleId,
    test_subtype:            isTest ? (isPhrase ? 'PHRASE_TEST' : 'VOCAB_TEST') : (isPhrase ? 'PHRASE_TASK' : 'VOCAB_TASK'),
    test_type:        tier,
    shell_code:                 code,
    title:                      generatedTitle,
    description:                description || `${tier}: ${themeCode}/${topicCode || 'ALL'} (${isPhrase ? 'Phrases' : 'Words'})`,
    status:                     'PUBLISHED',
    working_duration_minutes:   effectiveDurationMinutes,
    minimum_required_score:     effectiveMinScore,
    prerequisite_test_id: prerequisiteId,
    answer_type:                effectiveAnswerType,
    is_dynamic_shell:           true,
    display_order:              displayOrder,
    payload:                    { 
      ...(existing?.payload || {}), 
      is_dynamic_shell: true, 
      is_unified: false,
      is_unified_test: false,
      theme_code: themeCode, 
      topic_code: isTest ? null : (topicCode || null), 
      category: isPhrase ? 'phrases' : 'words', 
      answer_type: effectiveAnswerType, 
      shell_code: code,
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
      await sb.from('test_items').update({ answer_type: effectiveAnswerType }).eq('test_id', existing.id).catch(() => {});
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
    taskDurationMinutes = 5,
    taskAnswerType = 'spoken',
    wordsTaskAnswerType,
    phrasesTaskAnswerType,
    taskPassingScore = 60,
    wordsTestAnswerType = 'written',
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
    const isTest = String(row.test_type).toUpperCase() === 'TEST';
    const isPhrase = row.category === 'phrases' 
      || (row.payload && row.payload.category === 'phrases') 
      || (row.shell_code && row.shell_code.toUpperCase().includes('PHRASE'))
      || (row.title && row.title.toUpperCase().includes('PHRASE'));
    
    const updateData = {};
    if (isTest) {
      updateData.minimum_required_score = Number(testPassingScore);
      const testAns = isPhrase ? (phrasesTestAnswerType || 'selection') : (wordsTestAnswerType || 'written');
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
      updateData.working_duration_minutes = Number(taskDurationMinutes);
      updateData.minimum_required_score = Number(taskPassingScore);
      const taskAns = isPhrase 
        ? (phrasesTaskAnswerType || taskAnswerType || 'spoken') 
        : (wordsTaskAnswerType || taskAnswerType || 'spoken');
      updateData.answer_type = taskAns;
      if (row.payload && typeof row.payload === 'object') {
        updateData.payload = {
          ...row.payload,
          working_duration_minutes: Number(taskDurationMinutes),
          duration_minutes: Number(taskDurationMinutes),
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
      await sb.from('test_items').update({ answer_type: updateData.answer_type }).eq('test_id', row.id).catch(() => {});
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
      const { data: classDataList } = await sb.from('classes')
        .select('id')
        .eq('program_id', programId)
        .ilike('name', '%Vocab%')
        .is('deleted_at', null);
        
      targetClassId = (classDataList && classDataList.length > 0) ? classDataList[0].id : null;
      if (!targetClassId) {
        const { data: anyClasses } = await sb.from('classes')
          .select('id')
          .eq('program_id', programId)
          .is('deleted_at', null)
          .limit(1);
        targetClassId = (anyClasses && anyClasses.length > 0) ? anyClasses[0].id : null;
      }
    }

    // 1. Fetch Words for Level to know what themes and topics exist
    const { data: words, error } = await sb.from('vocabulary_vault')
      .select('theme_code, theme, topic_code, topic, word_type')
      .is('deleted_at', null)
      .eq('target_level', levelNum);

    if (error || !words || words.length === 0) continue;

    // 2. Build a map of themes -> topics -> categories
    const themeMap = new Map(); 
    
    for (const w of words) {
      if (!w.theme_code || !w.topic_code) continue; // Skip legacy rows without codes
      
      const wt = (w.word_type || '').toLowerCase();
      const isPhrase = ['expression', 'idiom', 'proverb', 'phrase'].includes(wt);
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

    const taskDur = config.taskDurationMinutes !== undefined ? Number(config.taskDurationMinutes) : 5;
    const taskAns = config.taskAnswerType || 'spoken';
    const wordsTaskAns = config.wordsTaskAnswerType || taskAns;
    const phrasesTaskAns = config.phrasesTaskAnswerType || taskAns;
    const taskPass = config.taskPassingScore !== undefined ? Number(config.taskPassingScore) : 60;
    const wordsTestAns = config.wordsTestAnswerType || 'written';
    const phrasesTestAns = config.phrasesTestAnswerType || 'selection';
    const testPass = config.testPassingScore !== undefined ? Number(config.testPassingScore) : 60;

    // 3. Generate 40 Tests (20 Words + 20 Phrases) in strict Linear Sequential Chain
    for (const themeCode of sortedThemes) {
      const themeData = themeMap.get(themeCode);
      const sortedTopics = Array.from(themeData.topics.keys()).sort();
      
      let hasAnyVocab = false;
      let hasAnyPhrases = false;

      for (const topicCode of sortedTopics) {
        const topicObj = themeData.topics.get(topicCode);
        const topicName = topicObj.name;
        
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
            durationMinutes: taskDur,
            minimumRequiredScore: taskPass,
            prerequisiteId: lastTaskId,
            displayOrder: displayOrder++
          });
          if (action === 'inserted') results.tasks++;
          if (action === 'updated') results.updated++;
          lastTaskId = testId;
        }

        // 2. Phrases Task (Second in topic pair, chained to Word Task)
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
            durationMinutes: taskDur,
            minimumRequiredScore: taskPass,
            prerequisiteId: lastTaskId,
            displayOrder: displayOrder++
          });
          if (action === 'inserted') results.tasks++;
          if (action === 'updated') results.updated++;
          lastTaskId = testId;
        }
      }

      // 3. Words Test (First in theme test pair)
      if (hasAnyVocab && (!config.category || config.category === 'all' || config.category === 'words')) {
        const { testId, action } = await upsertDynamicTestShell({
          institutionId, programId, levelId, classId: targetClassId, levelNum,
          tier: 'TEST', themeName: themeData.name, topicName: null,
          description: `Theme Test: ${themeData.name}`,
          themeCode, topicCode: null,
          modulePrefix: 'VOCAB', category: 'words',
          moduleId: vocabModuleId,
          answerType: wordsTestAns,
          durationMinutes: 120,
          minimumRequiredScore: testPass,
          prerequisiteId: lastTaskId,
          displayOrder: displayOrder++
        });
        if (action === 'inserted') results.tests++;
        if (action === 'updated') results.updated++;
        lastTaskId = testId;
      }

      // 4. Phrases Test (Second in theme test pair, chained to Word Test)
      if (hasAnyPhrases && (!config.category || config.category === 'all' || config.category === 'phrases')) {
        const { testId, action } = await upsertDynamicTestShell({
          institutionId, programId, levelId, classId: targetClassId, levelNum,
          tier: 'TEST', themeName: themeData.name, topicName: null,
          description: `Theme Test: ${themeData.name}`,
          themeCode, topicCode: null,
          modulePrefix: 'PHRASE', category: 'phrases',
          moduleId: phraseModuleId,
          answerType: phrasesTestAns,
          durationMinutes: 120,
          minimumRequiredScore: testPass,
          prerequisiteId: lastTaskId,
          displayOrder: displayOrder++
        });
        if (action === 'inserted') results.tests++;
        if (action === 'updated') results.updated++;
        lastTaskId = testId;
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

export async function getSecuritySettings() {
  const sb = await getSupabase();
  const { data, error } = await sb.from('site_settings').select('key, value').in('key', ['anti_cheat_enabled', 'anti_cheat_sound_enabled', 'anti_cheat_countdown_seconds']);
  if (error) {
    console.error('Failed to load security settings:', error);
    return null;
  }
  const settings = Object.fromEntries((data || []).map(r => [r.key, r.value]));
  return {
    enabled: settings.anti_cheat_enabled !== 'false',
    soundEnabled: settings.anti_cheat_sound_enabled !== 'false',
    countdownSeconds: parseInt(settings.anti_cheat_countdown_seconds || '10', 10)
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

export async function labelAttemptRemedial(attemptId, isRemedial = true) {
  const sb = await getSupabase();
  const { data: att, error: attErr } = await sb.from('attempts')
    .select('id, student_id, test_id, percentage, score, total_questions')
    .eq('id', attemptId)
    .single();
  if (attErr || !att) throw new Error('Attempt not found');

  const rawPct = parseFloat(att.percentage || 0);
  const effectiveScore = isRemedial ? Math.min(rawPct, 60.0) : rawPct; // Remedial capped at max 60%
  const grade = getGrade(effectiveScore);

  const { data: updated, error: updErr } = await sb.from('attempts')
    .update({
      is_remedial_unlocked: isRemedial,
      effective_score: effectiveScore,
      grade: grade,
      updated_at: new Date().toISOString()
    })
    .eq('id', attemptId)
    .select()
    .single();

  if (updErr) throw updErr;

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
    .select('id, title, status, test_type, test_subtype, payload')
    .eq('id', testId)
    .single();
  if (asmErr || !asm) {
    return { allowed: false, reason: 'NOT_FOUND', message: 'Test not found.' };
  }

  const isTest = (asm.test_type || '').toUpperCase() === 'TEST' ||
                 (asm.test_subtype || asm.test_type || '').toUpperCase().includes('TEST') ||
                 (asm.title || '').toUpperCase().includes('TEST');

  if (!isTest) {
    return { allowed: true, is_test: false };
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

  if (session.batch_id && student.batch_id && session.batch_id !== student.batch_id) {
    return {
      allowed: false,
      is_test: true,
      reason: 'WRONG_BATCH',
      message: 'This test session is designated for a different batch.'
    };
  }

  const allowedList = session.allowed_student_ids || [];
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

export async function fetchLiveTestSessionData({ testIds = [], studentIds = [], unlockedAt = null }) {
  const sb = await getSupabase();
  if (!testIds.length || !studentIds.length) {
    return { attempts: [], cheatLogs: [], answers: [] };
  }

  let attemptsQuery = sb.from('attempts')
    .select('id, student_id, test_id, status, score, correct_count, total_questions, percentage, effective_score, grade, started_at, submitted_at, updated_at')
    .in('test_id', testIds)
    .in('student_id', studentIds);

  if (unlockedAt) {
    const windowStart = new Date(new Date(unlockedAt).getTime() - 10 * 60 * 1000).toISOString();
    attemptsQuery = attemptsQuery.gte('created_at', windowStart);
  }

  const { data: attempts } = await attemptsQuery;

  let cheatQuery = sb.from('audit_logs')
    .select('id, actor_user_id, entity_id, new_value, created_at')
    .eq('action', 'CHEAT_ATTEMPT')
    .in('entity_id', testIds)
    .in('actor_user_id', studentIds);

  if (unlockedAt) {
    const windowStart = new Date(new Date(unlockedAt).getTime() - 10 * 60 * 1000).toISOString();
    cheatQuery = cheatQuery.gte('created_at', windowStart);
  }

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

if (typeof window !== 'undefined') {
  window.adminFetchAll = adminFetchAll;
  window.adminUpdate = adminUpdate;
  window.adminInsert = adminInsert;
  window.fetchActiveTestSession = fetchActiveTestSession;
  window.openTestSession = openTestSession;
  window.addLateStudentsToSession = addLateStudentsToSession;
  window.removeStudentFromTestSession = removeStudentFromTestSession;
  window.fetchLiveTestSessionData = fetchLiveTestSessionData;
  window.labelAttemptRemedial = labelAttemptRemedial;
  window.closeTestSession = closeTestSession;
  window.checkStudentTestAccess = checkStudentTestAccess;
}


