// TOPS CORE — API Module (Stabilized & Synchronized)
// Centralized server & database interface for TOPS CORE LMS.
import { getSupabase, SUPABASE_URL, callEdgeFunction } from './supabase.js?v=4.7.5';
import { evaluateAnswer, calculatePercentage, isPassing, calculateGrade, parseCorrectAnswers, stripHyphens } from './grading.js?v=4.7.5';

export { evaluateAnswer, calculatePercentage, isPassing, calculateGrade, parseCorrectAnswers, stripHyphens, callEdgeFunction };

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
  let cleaned = String(name).trim().replace(/^(mr\.?|miss\.?|mrs\.?|ms\.?)\s+/i, '').trim();
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

async function sha256(str) {
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

export async function fetchBatches(programId, forceRefresh = false) {
  const cacheKey = `batches_${programId}`;
  if (forceRefresh) clearApiCache(cacheKey);
  return withCache(cacheKey, async () => {
    let list = MOCK_BATCHES.filter(b => b.program_id === programId);
    if (!isPlaceholderUrl()) {
      if (!programId || programId === 'undefined') {
        console.warn('Cannot fetch batches: programId is undefined');
        return [];
      }
      try {
        const sb = await getSupabase();
        const { data, error } = await sb.from('batches')
          .select('id, name, program_id, current_level_id')
          .eq('program_id', programId)
          
          
          .order('name');
        if (error) throw error;
        if (data && data.length) list = data;
      } catch (e) {
        console.warn('Supabase fetch batches failed, falling back to mock data:', e.message);
      }
    }
    return [...list].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  });
}

export async function fetchStudentsByProgram(programId, batchId = null) {
  let list = MOCK_STUDENTS.filter(s => s.program_id === programId && (!batchId || s.batch_id === batchId));
  if (!isPlaceholderUrl()) {
    try {
      const sb = await getSupabase();
      let query = sb.from('students')
        .select('id, name, gender, program_id, batch_id')
        .eq('program_id', programId)
        
        ;
      if (batchId) {
        query = query.eq('batch_id', batchId);
      }
      const { data, error } = await query.order('name');
      if (error) throw error;
      if (data && data.length) list = data;
    } catch (e) {
      console.warn('Supabase fetch students failed, falling back to mock data:', e.message);
    }
  }
  return list.map(s => ({
    ...s,
    name: formatStudentName(s.name, s.gender)
  })).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
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
      .order('name');
      
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
  const { data, error } = await sb.from('progress').select('*').eq('student_id', studentId);
  if (error) throw error;
  return data;
}

export async function fetchAssessmentsForStudentClass(programId, classId, institutionId, levelId) {
  const sb = await getSupabase();
  let query = sb.from('assessments')
    .select('*, levels(id, name, level_number)')
    .eq('class_id', classId)
    .eq('status', 'PUBLISHED')
    .is('deleted_at', null)
    .order('display_order', { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.warn('fetchAssessmentsForStudentClass notice:', error.message);
    return [];
  }
  
  let results = data || [];
  
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

export async function fetchAssessmentsForStudentLevel(programId, levelId, institutionId) {
  const sb = await getSupabase();
  let query = sb.from('assessments')
    .select('*, levels(id, name, level_number)')
    .eq('level_id', levelId)
    .eq('status', 'PUBLISHED')
    
    .order('title');

  if (institutionId) query = query.eq('institution_id', institutionId);

  try {
    const { data, error } = await query;
    if (!error && data) return data;
  } catch (_) {}
  return [];
}

export async function fetchAllStudentAttempts(studentId) {
  const sb = await getSupabase();
  const { data, error } = await sb.from('attempts')
    .select('id, assessment_id, score, percentage, grade, status, is_best_score, submitted_at, assessments(title, assessment_type, classes(name))')
    .eq('student_id', studentId)
    .in('status', ['submitted', 'auto_submitted', 'SUBMITTED', 'AUTO_SUBMITTED'])
    .order('submitted_at', { ascending: false });

  if (!error) return data || [];

  // Fallback 2-step jika foreign key cache Supabase belum sinkron
  const { data: attempts, error: attErr } = await sb.from('attempts')
    .select('id, assessment_id, score, percentage, grade, status, is_best_score, submitted_at')
    .eq('student_id', studentId)
    .in('status', ['submitted', 'auto_submitted', 'SUBMITTED', 'AUTO_SUBMITTED'])
    .order('submitted_at', { ascending: false });

  if (attErr || !attempts) return [];

  const assessmentIds = [...new Set(attempts.map(a => a.assessment_id).filter(Boolean))];
  let assessmentMap = {};
  if (assessmentIds.length > 0) {
    const { data: asmData } = await sb.from('assessments').select('id, title, assessment_type, classes(name)').in('id', assessmentIds);
    if (asmData) asmData.forEach(a => { assessmentMap[a.id] = a; });
  }

  return attempts.map(att => ({
    ...att,
    assessments: assessmentMap[att.assessment_id] || null
  }));
}

export async function fetchStudentAttemptsForAssessment(studentId, assessmentId) {
  const sb = await getSupabase();
  const { data, error } = await sb.from('attempts')
    .select('id, status, score, percentage, grade, submitted_at')
    .eq('student_id', studentId)
    .eq('assessment_id', assessmentId)
    .in('status', ['submitted', 'auto_submitted', 'SUBMITTED', 'AUTO_SUBMITTED'])
    .order('percentage', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ============================================================
// ASSESSMENT EXECUTION (RUNNER)
// ============================================================

export async function startAssessment(studentId, assessmentId) {
  try {
    return await callEdgeFunction('start-assessment', { student_id: studentId, assessment_id: assessmentId });
  } catch (edgeErr) {
    if (edgeErr.status >= 400 && edgeErr.status < 500) {
      throw edgeErr; // Re-throw business logic errors
    }
    console.warn('Edge Function start-assessment unavailable, using client DB fallback:', edgeErr.message);
  }

  const sb = await getSupabase();

  // 1. Ambil detail assessment
  const { data: asmData, error: asmErr } = await sb.from('assessments').select('*').eq('id', assessmentId).single();
  if (asmErr || !asmData) throw new Error('Assessment not found.');

  // Guard: Do NOT insert attempt or start countdown if tutor hasn't unlocked it yet
  if (asmData.schedule_mode === 'manual' && asmData.is_unlocked === false) {
    const lockErr = new Error('LOCKED_BY_TUTOR');
    lockErr.code = 'LOCKED_BY_TUTOR';
    throw lockErr;
  }

  const assessment = {
    ...asmData,
    name: asmData.title || asmData.name,
    time_limit_minutes: asmData.working_duration_minutes || asmData.time_limit_minutes || 60
  };

  // 2. Cek apakah ada attempt in_progress yang sedang berjalan (tanpa kueri ganda)
  const { data: existingAttempts } = await sb.from('attempts')
    .select('*')
    .eq('student_id', studentId)
    .eq('assessment_id', assessmentId)
    .in('status', ['in_progress', 'IN_PROGRESS'])
    .order('created_at', { ascending: false });

  let attempt = existingAttempts?.[0];

  if (!attempt) {
    const timeLimit = assessment.time_limit_minutes || 60;
    const now = new Date();
    const expectedEnd = new Date(now.getTime() + timeLimit * 60000);

    const { count: priorCount } = await sb.from('attempts')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .eq('assessment_id', assessmentId);

    const attemptNumber = (priorCount || 0) + 1;

    // Bersihkan: simpan assessment_id satu kali saja
    const { data: newAttempt, error: createErr } = await sb.from('attempts')
      .insert({
        student_id: studentId,
        assessment_id: assessmentId,
        attempt_number: attemptNumber,
        started_at: now.toISOString(),
        expires_at: expectedEnd.toISOString(),
        status: 'in_progress',
        score: 0,
        percentage: 0,
        grade: 'F',
        is_best_score: false
      })
      .select()
      .single();

    if (createErr) throw createErr;
    attempt = newAttempt;

    // Masukkan butir soal snapshot
    let questions = [];
    if (assessment.payload && assessment.payload.is_dynamic_shell) {
      const themeCode = assessment.payload.theme_code;
      const topicCode = assessment.payload.topic_code;
      const themes = assessment.payload.themes;
      
      let levelNum = 1;
      if (assessment.level_id) {
        const { data: levelRec } = await sb.from('levels').select('level_number').eq('id', assessment.level_id).single();
        if (levelRec?.level_number) levelNum = levelRec.level_number;
      }
      
      let query = sb.from('vocabulary_vault').select('*').is('deleted_at', null).eq('target_level', levelNum).range(0, 4999);
      if (themes && Array.isArray(themes) && themes.length > 0) {
          query = query.in('theme_code', themes);
      } else if (assessment.assessment_category === 'TEST' && themeCode) {
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
      
      let { data: vaultData } = await query;
      let vaultWords = vaultData || [];
      
      const category = assessment.payload.category || 'vocab';
      vaultWords = vaultWords.filter(w => {
         const wt = (w.word_type || '').toLowerCase();
         const isPhrase = ['expression', 'idiom', 'proverb', 'phrase'].includes(wt);
         return category === 'phrases' ? isPhrase : !isPhrase;
      });

      if (vaultWords && vaultWords.length > 0) {
        vaultWords.sort((a, b) => (a.indonesian || "").localeCompare(b.indonesian || ""));
        
        let allEnglishAnswers = [];
        let typeDistractorPools = {};
        const ansType = assessment.payload.answer_type || 'written';
        
        if (ansType.startsWith('dropdown') || ansType === 'multiple_choice' || ansType === 'phrase_recognition') {
            let allDataQuery = sb.from('vocabulary_vault').select('english, word_type').is('deleted_at', null);
            if (category === 'phrases' || assessment.assessment_type === 'PHRASE_TASK' || assessment.assessment_type === 'PHRASE_TEST') {
                allDataQuery = allDataQuery.eq('category', 'phrases');
            } else if (category === 'words' || category === 'vocab' || assessment.assessment_type === 'VOCAB_TASK' || assessment.assessment_type === 'VOCAB_TEST') {
                allDataQuery = allDataQuery.eq('category', 'words');
            }
            const { data: allData } = await allDataQuery;
            if (allData) {
                allEnglishAnswers = allData.map(r => (r.english||'').split('/')[0].trim()).filter(Boolean);
                allData.forEach(r => {
                    const wt = (r.word_type || 'Vocab').toLowerCase();
                    const eng = (r.english||'').split('/')[0].trim();
                    if (!eng) return;
                    if (!typeDistractorPools[wt]) typeDistractorPools[wt] = [];
                    typeDistractorPools[wt].push(eng);
                });
            }
        }
        
        const fisherYates = (arr) => {
          for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
          }
          return arr;
        };

        questions = vaultWords.map((vw, idx) => {
             const accepted = vw.english ? vw.english.split('/').map(s => s.trim()) : [];
             const correctAns = accepted[0] || "N/A";
             let optionsSnapshot = [];
             
             if (ansType.startsWith('dropdown') || ansType === 'multiple_choice' || ansType === 'phrase_recognition') {
                 const numDistractors = (ansType === 'dropdown_10' || ansType === 'phrase_recognition') ? 9 : 3;
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
                 question_text_snapshot: vw.indonesian || "N/A",
                 accepted_answers_snapshot: accepted,
                 options_snapshot: optionsSnapshot,
                 topic_snapshot: vw.topic || vw.topic_code || "General",
                 word_type_snapshot: vw.word_type,
                 display_order: idx + 1,
                 answer_type: ansType
             };
        });
      }
    } else {
      const { data } = await sb.from('assessment_questions')
        .select('*')
        .eq('assessment_id', assessmentId)
        .order('display_order');
      questions = data || [];
    }

    if (questions && questions.length > 0) {
      const answerRows = questions.map((sq, idx) => ({
        attempt_id: attempt.id,
        question_id: sq.question_id || null,
        question_snapshot: {
          question_text: sq.question_text_snapshot,
          word_type: sq.word_type_snapshot,
          topic: sq.topic_snapshot,
          display_order: sq.display_order ?? (idx + 1),
          answer_type: sq.answer_type || 'written',
          options_snapshot: sq.options_snapshot || [],
          accepted_answers: sq.accepted_answers_snapshot,
          correct_answer: Array.isArray(sq.accepted_answers_snapshot) ? sq.accepted_answers_snapshot[0] : sq.accepted_answers_snapshot
        },
        topic_snapshot: sq.topic_snapshot,
        accepted_answers_snapshot: sq.accepted_answers_snapshot,
        student_answer: null,
        score: 0
      }));
      const { error: ansInsertErr } = await sb.from('attempt_answers').insert(answerRows);
      if (ansInsertErr) console.error('Failed to insert attempt answers:', ansInsertErr);
    }
  }

  let { data: answers } = await sb.from('attempt_answers').select('*').eq('attempt_id', attempt.id);

  if (answers && answers.length > 0) {
    answers.sort((a, b) => {
      const orderA = a.question_snapshot?.question_order;
      const orderB = b.question_snapshot?.question_order;
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

  return {
    success: true,
    attempt: attempt,
    ASSESSMENT: assessment,
    sections: [{ id: 'default', title: assessment.name || 'Assessment', section_order: 1 }],
    answers: sanitizedAnswers,
    resumed: !!existingAttempts?.[0]
  };
}

/** ALIAS KRUSIAL: Mencegah SyntaxError crash di assessment.html */
export const startASSESSMENT = startAssessment;

export async function saveAnswer(attemptAnswerId, studentAnswer) {
  const sb = await getSupabase();
  const { error } = await sb.from('attempt_answers')
    .update({ student_answer: studentAnswer, updated_at: new Date().toISOString() })
    .eq('id', attemptAnswerId);
  if (error) throw error;
}

export async function submitAssessment(attemptId, answersMap, options = {}) {
  const targetStatus = options?.status || 'submitted';
  try {
    return await callEdgeFunction('submit-assessment', { attempt_id: attemptId, answers: answersMap, status: targetStatus });
  } catch (edgeErr) {
    console.warn('Edge Function submit-assessment unavailable, using client DB fallback:', edgeErr.message);
  }

  const sb = await getSupabase();

  if (answersMap && typeof answersMap === 'object') {
    const saveTasks = [];
    if (Array.isArray(answersMap)) {
      for (const item of answersMap) {
        if (item?.attempt_answer_id) {
          saveTasks.push(
            sb.from('attempt_answers').update({ student_answer: item.student_answer ?? '', updated_at: new Date().toISOString() }).eq('id', item.attempt_answer_id)
          );
        }
      }
    } else {
      for (const [ansId, ansVal] of Object.entries(answersMap)) {
        saveTasks.push(
          sb.from('attempt_answers').update({ student_answer: ansVal ?? '', updated_at: new Date().toISOString() }).eq('id', ansId)
        );
      }
    }
    if (saveTasks.length > 0) await Promise.all(saveTasks);
  }

  const { data: attemptAnswers, error: fetchErr } = await sb.from('attempt_answers').select('*').eq('attempt_id', attemptId);
  if (fetchErr) throw fetchErr;

  let totalPoints = 0;
  let correctCount = 0;
  let maxPoints = attemptAnswers?.length || 0;

  const evalTasks = [];
  for (const a of (attemptAnswers || [])) {
    let answerType = 'written';
    if (a.question_snapshot) {
      try {
        const qSnap = typeof a.question_snapshot === 'string' ? JSON.parse(a.question_snapshot) : a.question_snapshot;
        if (qSnap?.answer_type) answerType = qSnap.answer_type;
      } catch (_) {}
    }

    const validKey = a.accepted_answers_snapshot || a.correct_answer_snapshot;
    const evalRes = evaluateAnswer(a.student_answer, validKey, answerType);
    totalPoints += evalRes.score;
    if (evalRes.score >= 1.0) correctCount++;

    const isCorrect = evalRes.score >= 1.0;
    const simScore = evalRes.score >= 1.0 ? 1.0 : (evalRes.score === 0.5 ? 0.85 : 0);

    evalTasks.push(
      sb.from('attempt_answers').update({
        score: evalRes.score,
        evaluation_result: evalRes.result,
        is_correct: isCorrect,
        similarity_score: simScore,
        answered_at: new Date().toISOString()
      }).eq('id', a.id)
    );
  }
  if (evalTasks.length > 0) await Promise.all(evalTasks);

  const percentage = calculatePercentage(totalPoints, maxPoints);
  const grade = calculateGrade(percentage);

  const { data: updatedAttempt, error: updateErr } = await sb.from('attempts')
    .update({
      status: targetStatus,
      submitted_at: new Date().toISOString(),
      score: totalPoints,
      correct_count: correctCount,
      total_questions: maxPoints,
      percentage,
      grade,
      effective_score: percentage
    })
    .eq('id', attemptId)
    .select()
    .single();

  if (updateErr) throw updateErr;

  try {
    await recalculateBestScore(updatedAttempt.student_id, updatedAttempt.assessment_id);
  } catch (bsErr) {
    console.warn('Best score recalculation notice:', bsErr.message);
  }

  return { success: true, attempt: updatedAttempt };
}

// ============================================================
// RESULTS DISPLAY
// ============================================================

export async function fetchAttemptResult(attemptId) {
  const sb = await getSupabase();
  const { data, error } = await sb.from('attempts')
    .select(`
      id, status, score, percentage, grade, submitted_at, started_at,
      expires_at, assessment_id, is_best_score,
      assessments:assessment_id(id, title, assessment_type, classes(name), levels(name))
    `)
    .eq('id', attemptId)
    .single();
  if (error) throw error;
  return data;
}

export async function fetchAttemptAnswers(attemptId) {
  const sb = await getSupabase();
  const { data, error } = await sb.from('attempt_answers')
    .select('id, attempt_id, question_id, student_answer, score, evaluation_result, question_snapshot, topic_snapshot, question_type_snapshot, correct_answer_snapshot, accepted_answers_snapshot, created_at, updated_at')
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
  } else {
    _adminCache.clear();
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
      'modules'
    ];
    if (!noDeletedAtTables.includes(normTable)) {
      query = query.is('deleted_at', null);
    }

    for (const [key, val] of Object.entries(filters)) {
      const normKey = (key === 'Assessment_id') ? 'assessment_id' : key;
      query = query.eq(normKey, val);
    }
    
    let { data, error } = await query;
    if (error) throw error;
    
    _adminCache.set(cacheKey, JSON.parse(JSON.stringify(data || [])));
    return data || [];
  } catch (e) {
    console.warn(`adminFetchAll failed for ${table}:`, e.message);
    return [];
  }
}

async function enforceAssessmentSystemGuard(sb, payload, existingAssessment = null) {
  const merged = { ...existingAssessment, ...payload };
  if (!merged.module_id) return;
  
  const { data: mod } = await sb.from('modules').select('name').eq('id', merged.module_id).single();
  if (!mod) return;
  
  const modName = mod.name.toLowerCase();
  const isVocabMod = modName.includes('vocabulary mastery') || modName.includes('phrase recognition');
  
  if (isVocabMod) {
    if (merged.class_id) {
      const { data: cls } = await sb.from('classes').select('name').eq('id', merged.class_id).single();
      if (cls && !cls.name.toLowerCase().includes('vocab')) {
        throw new Error('SYSTEM GUARD: Modul Vocabulary Mastery dan Phrase Recognition dikunci secara mutlak hanya untuk Kelas Vocabulary.');
      }
    }
    if (merged.level_id) {
      const { data: lvl } = await sb.from('levels').select('level_number').eq('id', merged.level_id).single();
      if (lvl && ![0, 1, 2, 3].includes(lvl.level_number)) {
        throw new Error('SYSTEM GUARD: Modul Vocabulary hanya diizinkan untuk Level 0, 1, 2, 3.');
      }
    }
  }
}

export async function adminInsert(table, payload) {
  const normTable = (table || '').toLowerCase().replace('-', '_');
  const sb = await getSupabase();
  
  if (normTable === 'assessments') await enforceAssessmentSystemGuard(sb, payload);

  const { data, error } = await sb.from(normTable).insert(payload).select().single();
  if (error) throw error;
  clearAdminCache(normTable);
  return data;
}

export async function adminUpdate(table, id, payload) {
  const normTable = (table || '').toLowerCase().replace('-', '_');
  const sb = await getSupabase();

  if (normTable === 'assessments') {
    const { data: existing } = await sb.from('assessments').select('*').eq('id', id).single();
    await enforceAssessmentSystemGuard(sb, payload, existing);
  }

  const { data, error } = await sb.from(normTable).update(payload).eq('id', id).select().single();
  if (error) throw error;
  clearAdminCache(normTable);
  return data;
}

export async function adminSoftDelete(table, id) {
  const normTable = (table || '').toLowerCase().replace('-', '_');
  const sb = await getSupabase();
  if (normTable === 'assessments') {
    await sb.from('assessment_questions').delete().eq('assessment_id', id);
    const { error } = await sb.from('assessments').delete().eq('id', id);
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

export async function recalculateBestScore(studentId, assessmentId) {
  const sb = await getSupabase();
  const { data: attempts, error } = await sb.from('attempts')
    .select('id, score, percentage, created_at')
    .eq('student_id', studentId)
    .eq('assessment_id', assessmentId)
    .in('status', ['submitted', 'auto_submitted', 'SUBMITTED', 'AUTO_SUBMITTED'])
    .order('percentage', { ascending: false })
    .order('created_at', { ascending: false });

  if (error || !attempts || !attempts.length) return null;

  const bestAttemptId = attempts[0].id;
  for (const a of attempts) {
    await sb.from('attempts').update({ is_best_score: a.id === bestAttemptId }).eq('id', a.id);
  }
  return attempts[0];
}

export async function logCheatingEvent(studentId, assessmentId, action, detail) {
  try {
    const sb = await getSupabase();
    await sb.from('audit_logs').insert({
      actor_user_id: studentId,
      actor_role: 'student',
      action: action || 'CHEAT_ATTEMPT',
      entity_type: 'assessment',
      entity_id: assessmentId,
      new_value: detail,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Failed to insert audit log for cheating:', err);
  }
}

export async function fetchAssessments(filters = {}) {
  const sb = await getSupabase();
  try {
    let query = sb.from('assessments').select('*, classes(name), levels(name, level_number)');
    if (filters.class_id) query = query.eq('class_id', filters.class_id);
    
    const { data, error } = await query.order('display_order', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false });
    if (!error && data) return data;
  } catch (err) {
    console.warn('fetchAssessments fallback notice:', err.message);
  }
  return [];
}

export async function fetchAssignments(filters = {}) {
  const sb = await getSupabase();
  try {
    let query = sb.from('assignments').select('*, assessments(*, classes(name), levels(name, level_number))');
    
    let orConditions = [];
    if (filters.batch_id) orConditions.push(`batch_id.eq.${filters.batch_id}`);
    if (filters.student_id) orConditions.push(`student_id.eq.${filters.student_id}`);
    
    if (orConditions.length > 0) {
      query = query.or(orConditions.join(','));
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    const validAssessments = [];
    for (const a of data || []) {
      if (a.assessments && !a.assessments.deleted_at && a.assessments.status === 'PUBLISHED') {
        validAssessments.push({
          ...a.assessments,
          assignment_id: a.id,
          availability_start: a.availability_start,
          availability_end: a.availability_end
        });
      }
    }
    return validAssessments;
  } catch (err) {
    console.warn('fetchAssignments failed:', err.message);
    return [];
  }
}

// ============================================================
// ALIAS BERSIH UNTUK ADMIN COMPATIBILITY
// ============================================================
export async function publishAssessmentDefinition(id) {
  const sb = await getSupabase();
  const { data, error } = await sb.from('assessments').update({ status: 'PUBLISHED', updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) throw error;
  clearAdminCache('assessments');
  return data;
}



export async function createAssessmentInstance(payload) {
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
export async function detectDuplicateStudents(programId) {
  const sb = await getSupabase();
  let query = sb.from('students').select('id, name, program_id, batch_id, deleted_at');
  if (programId) query = query.eq('program_id', programId);
  const { data, error } = await query;
  if (error) throw error;
  const students = data || [];
  const groups = {};
  for (const s of students) {
    const key = (s.name || '').trim().toLowerCase() + '|' + (s.program_id || '');
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  }
  return Object.values(groups).filter(g => g.length > 1);
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
export async function detectDuplicateQuestions(assessmentId) {
  const sb = await getSupabase();
  let query = sb.from('questions').select('id, question_text, assessment_id, question_order');
  if (assessmentId) query = query.eq('assessment_id', assessmentId);
  const { data, error } = await query;
  if (error) throw error;
  const questions = data || [];
  const groups = {};
  for (const q of questions) {
    const key = (q.question_text || '').trim().toLowerCase() + '|' + (q.assessment_id || '');
    if (!groups[key]) groups[key] = [];
    groups[key].push(q);
  }
  return Object.values(groups).filter(g => g.length > 1);
}

export async function resequenceAssessmentQuestions(assessmentId) {
  const sb = await getSupabase();
  const { data, error } = await sb.from('questions').select('id').eq('assessment_id', assessmentId).order('question_order');
  if (error) throw error;
  const updates = (data || []).map((q, idx) =>
    sb.from('questions').update({ question_order: idx + 1 }).eq('id', q.id)
  );
  await Promise.all(updates);
  clearAdminCache('questions');
}

export async function resolveDuplicateQuestionGroup(group, keepId) {
  const sb = await getSupabase();
  const toDelete = (group || []).filter(q => q.id !== keepId);
  for (const q of toDelete) {
    await sb.from('questions').update({ deleted_at: new Date().toISOString() }).eq('id', q.id);
  }
  clearAdminCache('questions');
}

export async function batchResolveAssessmentDuplicateQuestions(assessmentId) {
  const groups = await detectDuplicateQuestions(assessmentId);
  for (const group of groups) {
    const keep = group[0];
    await resolveDuplicateQuestionGroup(group, keep.id);
  }
  if (assessmentId) await resequenceAssessmentQuestions(assessmentId);
  return { resolved: groups.length };
}

// --- Recalibration engine ---
export async function previewRecalibrateAssessment(assessmentId) {
  const sb = await getSupabase();
  const { data: attempts, error } = await sb.from('attempts')
    .select('id, student_id, score, percentage, grade, is_best_score')
    .eq('assessment_id', assessmentId)
    .in('status', ['submitted', 'auto_submitted', 'SUBMITTED', 'AUTO_SUBMITTED']);
  if (error) throw error;
  return { assessmentId, attempts: attempts || [], count: (attempts || []).length };
}

export async function applyRecalibrateAssessment(assessmentId) {
  const sb = await getSupabase();
  // Get all submitted attempts for this assessment
  const { data: attempts, error } = await sb.from('attempts')
    .select('id, student_id, score, percentage')
    .eq('assessment_id', assessmentId)
    .in('status', ['submitted', 'auto_submitted', 'SUBMITTED', 'AUTO_SUBMITTED'])
    .order('percentage', { ascending: false });
  if (error) throw error;
  // Re-mark best scores per student
  const bestByStudent = {};
  for (const att of (attempts || [])) {
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
  const { data, error } = await query.order('topic_order');
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
  if (filters.assessment_id) query = query.eq('assessment_id', filters.assessment_id);
  if (filters.class_id) query = query.eq('class_id', filters.class_id);
  if (filters.topic_id) query = query.eq('topic_id', filters.topic_id);
  const { data, error } = await query.order('question_order');
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

// --- Assessment definitions (admin CRUD) ---
export async function fetchAssessmentDefinitions(filters = {}) {
  const sb = await getSupabase();
  let query = sb.from('assessments').select('*, classes(name), levels(name, level_number)');
  if (filters.class_id) query = query.eq('class_id', filters.class_id);
  if (filters.institution_id) query = query.eq('institution_id', filters.institution_id);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createAssessmentDefinition(payload) {
  return await adminInsert('assessments', payload);
}

export async function createAssessmentDefinitionWithTopics(payload, topicIds = []) {
  const newAsm = await adminInsert('assessments', payload);
  if (topicIds && topicIds.length > 0) {
    const sb = await getSupabase();
    const topicPayload = topicIds.map(tid => ({ assessment_id: newAsm.id, topic_id: tid }));
    const { error } = await sb.from('assessment_topics').insert(topicPayload);
    if (error) throw error;
  }
  return newAsm;
}

export async function updateAssessmentDefinition(id, payload) {
  return await adminUpdate('assessments', id, { ...payload, updated_at: new Date().toISOString() });
}

export async function updateAssessmentWithTopics(id, payload, topicIds = []) {
  const updatedAsm = await adminUpdate('assessments', id, { ...payload, updated_at: new Date().toISOString() });
  const sb = await getSupabase();
  // Clear existing topics
  await sb.from('assessment_topics').delete().eq('assessment_id', id);
  // Insert new topics
  if (topicIds && topicIds.length > 0) {
    const topicPayload = topicIds.map(tid => ({ assessment_id: id, topic_id: tid }));
    const { error } = await sb.from('assessment_topics').insert(topicPayload);
    if (error) throw error;
  }
  return updatedAsm;
}

// --- Assessment instances ---
export async function fetchAssessmentInstances(filters = {}) {
  const sb = await getSupabase();
  let query = sb.from('assignments').select('*, batches(name), students(name), assessments(title, assessment_type)');
  if (filters.assessment_id) query = query.eq('assessment_id', filters.assessment_id);
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
  return await callEdgeFunction('evaluate-assessment', payload);
}

export async function fetchAssessmentResultsFromDB(filters = {}) {
  const sb = await getSupabase();
  let query = sb.from('attempts').select('*, students(name), assessments(title, classes(name))').in('status', ['submitted', 'auto_submitted', 'SUBMITTED', 'AUTO_SUBMITTED']);
  if (filters.assessment_id) query = query.eq('assessment_id', filters.assessment_id);
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
    .select('*')
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
// VOCABULARY MASTERY — Assessment Builder & Stratified Sampler
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

export async function createVocabMasteryAssessment(config) {
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
    assessmentType = 'VOCAB_MASTERY',
    // NEW: explicit category for the Task/Test binary taxonomy
    // Defaults derived from tier if not explicitly set
    assessment_category = null
  } = config;

  let vaultWords = [];
  let sourceTopics = [];

  // Determine Target Level safely
  let targetLevel = 1;
  let isAllLevels = false;
  try {
    const { data: lvlData } = await sb.from('levels').select('*').eq('id', levelId).single();
    if (lvlData) {
        targetLevel = lvlData.level_number || 1;
        if (lvlData.level_number === 0 || lvlData.level_number == null) isAllLevels = true;
    }
  } catch (e) {
    console.warn("Could not fetch level_number, defaulting to 1");
  }

  if (tier === 'TASK') {
    if (!sourceTopic) throw new Error('sourceTopic is required for TASK tier.');
    let q = sb.from('vocabulary_vault').select('*').eq('topic', sourceTopic).is('deleted_at', null);
    if (!isAllLevels) q = q.eq('target_level', targetLevel);
    
    if (assessmentType === 'IDIOM_PROVERB') {
      q = q.in('word_type', ['Idiom', 'Proverb', 'Expression', 'Phrase']);
    }
    
    const { data, error } = await q.order('topic').order('indonesian');
    if (error) throw error;
    vaultWords = data || [];
    sourceTopics = [sourceTopic];
  } else if (tier === 'TEST') {
    // 🔴 TEST TIER: Aggregates from selected TASK assessments (Cumulative theme/grand test)
    if (!sourceTaskIds || !sourceTaskIds.length) throw new Error('sourceTaskIds required for TEST tier aggregation.');

    // 1. Get all questions from the selected Tasks to extract their topics
    const { data: aqs, error: aqErr } = await sb.from('assessment_questions')
      .select('topic_snapshot')
      .in('assessment_id', sourceTaskIds);
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
    let q = sb.from('vocabulary_vault').select('*').in('topic', sourceTopics).is('deleted_at', null);
    if (!isAllLevels) q = q.eq('target_level', targetLevel);
    
    // Support PHRASE_RECOGNITION filtering
    if (assessmentType === 'IDIOM_PROVERB' || assessmentType === 'PHRASE_RECOGNITION') {
      q = q.in('word_type', ['Idiom', 'Proverb', 'Expression', 'Phrase']);
    }

    const { data, error } = await q.order('topic').order('indonesian');
    if (error) throw error;
    vaultWords = data || [];
  } else if (tier === 'QUIZ') {
    // @deprecated — Legacy tier. Use tier='TEST' for new assessments.
    // Kept for backward compatibility with existing student data.
    if (!sourceQuizIds.length) throw new Error('sourceQuizIds required for EXAM tier.');
    const { data: aqs } = await sb.from('assessment_questions').select('topic_snapshot').in('assessment_id', sourceQuizIds);
    const topicsSet = new Set();
    (aqs || []).forEach(aq => {
      if (aq.topic_snapshot) topicsSet.add(aq.topic_snapshot);
    });
    sourceTopics = [...topicsSet];
    let q = sb.from('vocabulary_vault').select('*').in('topic', sourceTopics).is('deleted_at', null);
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
  if (assessmentType === 'IDIOM_PROVERB') {
    selectedWords = fisherYates([...vaultWords]).slice(0, 10);
  } else if (quotaMode === 'custom' && customQuota && customQuota < totalGatheredWords) {
    const topicMap = new Map();
    for (const w of vaultWords) {
      if (!topicMap.has(w.topic)) topicMap.set(w.topic, []);
      topicMap.get(w.topic).push(w);
    }
    selectedWords = stratifiedSample(topicMap, customQuota);
  }

  // Resolve the final assessment_category:
  // - If caller explicitly passes 'TASK' or 'TEST', use that.
  // - Otherwise derive from tier for backward-compat with old QUIZ/EXAM callers.
  const resolvedCategory = assessment_category
    ? assessment_category
    : (tier === 'TASK' ? 'TASK' : 'TEST');

  let defaultAnswerType = answerType;
  if (assessmentType === 'IDIOM_PROVERB' || assessmentType === 'PHRASE_RECOGNITION') {
      defaultAnswerType = 'phrase_recognition';
  } else if (tier === 'TASK') {
      defaultAnswerType = 'speech_to_text';
  } else {
      defaultAnswerType = 'written';
  }

  const assessmentPayload = {
    institution_id:           institutionId,
    program_id:               programId,
    class_id:                 classId,
    level_id:                 levelId,
    assessment_type:          'VOCAB_' + tier,
    assessment_category:      resolvedCategory,
    title:                    title,
    description:              'Vocabulary Mastery (' + tier + '). Topics: ' + sourceTopics.join(', '),
    status:                   'PUBLISHED',
    availability_start:       windowStart || null,
    availability_end:         windowEnd || null,
    working_duration_minutes: durationMinutes || null,
    prerequisite_assessment_id:
      (tier === 'QUIZ' && sourceTaskIds.length > 0) ? sourceTaskIds[0] :
      (tier === 'EXAM' && sourceQuizIds.length > 0) ? sourceQuizIds[0] :
      (tier === 'TEST' && sourceTaskIds.length > 0) ? sourceTaskIds[sourceTaskIds.length - 1] : null,
    created_by:               'Admin (Vault)',
    created_at:               new Date().toISOString(),
    updated_at:               new Date().toISOString()
  };

  const { data: newAssessment, error: asmErr } = await sb.from('assessments').insert(assessmentPayload).select('id').single();
  if (asmErr) throw asmErr;
  const assessmentId = newAssessment.id;

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
      if (tier === 'TASK') currentAnswerType = 'speech_to_text';
      else if (tier === 'TEST' || tier === 'QUIZ' || tier === 'EXAM') currentAnswerType = 'written';
    }
    
    let optionsSnapshot = null;
    if (currentAnswerType.startsWith('dropdown') || currentAnswerType === 'phrase_recognition') {
      const correctAns = answers[0];
      const numDistractors = (currentAnswerType === 'dropdown_10' || currentAnswerType === 'phrase_recognition') ? 9 : 3;

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
      assessment_id:             assessmentId,
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
    const { error: qErr } = await sb.from('assessment_questions').insert(chunk);
    if (qErr) throw qErr;
  }

  clearApiCache('vault');
  clearApiCache('assessments');
  clearAdminCache('assessments');
  return { assessmentId, title, tier, totalWords: totalGatheredWords, sampledWords: selectedWords.length, sourceTopics };
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
  // The single test that counts is the most recently created TEST with >= 60% to advance
  const { data: exams, error: exErr } = await sb.from('assessments')
    .select('id, levels!inner(level_number)')
    .eq('level_id', currentLevelId)
    .neq('levels.level_number', 0)
    .eq('assessment_category', 'TEST')
    .eq('status', 'PUBLISHED')
    
    .order('created_at', { ascending: false })
    .limit(1); // Only the most recent TEST counts as the gating assessment
  if (exErr || !exams || exams.length === 0) return { levelUp: false, newLevel: null, status: 'NO_TESTS' };

  const examIds = exams.map(e => e.id);
  const { data: attempts, error: attErr } = await sb.from('attempts')
    .select('assessment_id, percentage')
    .eq('student_id', studentId)
    .in('assessment_id', examIds)
    .eq('is_best_score', true);
  if (attErr) return { levelUp: false, newLevel: null, status: 'ERROR' };

  const bestScoreMap = {};
  (attempts || []).forEach(a => {
    bestScoreMap[a.assessment_id] = Math.max(bestScoreMap[a.assessment_id] || 0, parseFloat(a.percentage || 0));
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

export async function upsertDynamicAssessmentShell(config) {
  const sb = await getSupabase();
  const {
    institutionId, programId, classId, levelId, levelNum,
    tier, themeName, topicName, description,
    themeCode, topicCode,
    modulePrefix = 'VOCAB',
    category = 'vocab',
    durationMinutes = 60,
    prerequisiteId = null,
    moduleId = null,
    answerType = 'speech_to_text',
    displayOrder = 1
  } = config;

  const code = tier === 'TEST' ? `${modulePrefix}-TEST-${themeCode}` : `${modulePrefix}-TASK-${themeCode}-${topicCode}`;
  
  const cleanTitle = (topicName || themeName || '').replace(/["']/g, '').trim();
  const levelLabel = toOrdinalLevel(levelNum);
  const catLabel = `${category === 'phrases' ? 'Phrases' : 'Words'} ${tier === 'TEST' ? 'Test' : 'Task'}`;
  const generatedTitle = tier === 'TEST' 
    ? `${levelLabel} Vocabulary - ${themeCode} ${category === 'phrases' ? 'Phrases' : 'Words'} Test - ${cleanTitle}`
    : `${levelLabel} Vocabulary - ${themeCode}${topicCode} ${category === 'phrases' ? 'Phrases' : 'Words'} Task - ${cleanTitle}`;

  // Dedup by shell_code + program + level
  let q = sb.from('assessments')
    .select('id')
    .eq('shell_code', code)
    .eq('program_id', programId)
    .eq('level_id', levelId);
  if (classId) q = q.eq('class_id', classId);
  const { data: existing } = await q.maybeSingle();

  const asmData = {
    institution_id:             institutionId,
    program_id:                 programId,
    class_id:                   classId,
    level_id:                   levelId,
    module_id:                  moduleId,
    assessment_type:            modulePrefix + '_' + tier,
    assessment_category:        tier,
    shell_code:                 code,
    title:                      generatedTitle,
    description:                description || `${tier}: ${themeCode}/${topicCode || 'ALL'}`,
    status:                     'PUBLISHED',
    working_duration_minutes:   durationMinutes,
    prerequisite_assessment_id: prerequisiteId,
    answer_type:                answerType,
    is_dynamic_shell:           true,
    display_order:              displayOrder,
    payload:                    { is_dynamic_shell: true, theme_code: themeCode, topic_code: topicCode || null, category: category, answer_type: answerType },
    created_by:                 'Auto-Generator',
    updated_at:                 new Date().toISOString()
  };

  if (existing) {
    const { error } = await sb.from('assessments').update(asmData).eq('id', existing.id);
    if (error) throw error;
    return { assessmentId: existing.id, action: 'updated' };
  } else {
    asmData.created_at = new Date().toISOString();
    const { data: newAsm, error } = await sb.from('assessments').insert(asmData).select('id').single();
    if (error) throw error;
    return { assessmentId: newAsm.id, action: 'inserted' };
  }
}

export async function autoGenerateAssessmentsHierarchy(targetLevels, config = {}) {
  const sb = await getSupabase();
  const results = { tasks: 0, tests: 0, updated: 0 };
  const { programId } = config;

  if (!programId) throw new Error("programId is required for auto-generation");

  const { data: progData, error: progErr } = await sb.from('programs')
    .select('id, institution_id, name, institutions(name)')
    .eq('id', programId).single();
    
  if (!progData || progErr) throw new Error(`Program not found.`);

  const institutionId = progData.institution_id;
  const rawInstName = progData.institutions ? progData.institutions.name : '';
  const instName = rawInstName ? (rawInstName.includes('CEC') ? 'CEC' : rawInstName) : 'Inst';
  const progShortName = progData.name ? (progData.name.split(' ')[0]) : 'Prog';

  const toOrdinal = (n) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

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
    }

    // We NO LONGER purge. We use UPSERT to preserve student submissions.

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

    for (const themeCode of sortedThemes) {
      const themeData = themeMap.get(themeCode);
      const sortedTopics = Array.from(themeData.topics.keys()).sort();
      
      let lastTaskId = null;
      let hasAnyVocab = false;
      let hasAnyPhrases = false;

      for (const topicCode of sortedTopics) {
         const topicObj = themeData.topics.get(topicCode);
         const topicName = topicObj.name;
         
         if (topicObj.hasVocab && (!config.category || config.category === 'words')) {
           hasAnyVocab = true;
           const { assessmentId, action } = await upsertDynamicAssessmentShell({
             institutionId, programId, levelId, classId: targetClassId, levelNum,
             tier: 'TASK', themeName: themeData.name, topicName: topicName,
             description: `Theme: ${themeData.name} | Topic: ${topicName}`,
             themeCode, topicCode,
             modulePrefix: 'VOCAB', category: 'vocab',
             moduleId: vocabModuleId,
             answerType: 'speech_to_text',
             prerequisiteId: lastTaskId,
             displayOrder: displayOrder++
           });
           if (action === 'inserted') results.tasks++;
           if (action === 'updated') results.updated++;
           lastTaskId = assessmentId;
         }
         
         if (topicObj.hasPhrases && (!config.category || config.category === 'phrases')) {
           hasAnyPhrases = true;
           const { assessmentId, action } = await upsertDynamicAssessmentShell({
             institutionId, programId, levelId, classId: targetClassId, levelNum,
             tier: 'TASK', themeName: themeData.name, topicName: topicName,
             description: `Theme: ${themeData.name} | Topic: ${topicName}`,
             themeCode, topicCode,
             modulePrefix: 'PHRASE', category: 'phrases',
             moduleId: phraseModuleId,
             answerType: 'dropdown',
             prerequisiteId: lastTaskId,
             displayOrder: displayOrder++
           });
           if (action === 'inserted') results.tasks++;
           if (action === 'updated') results.updated++;
           lastTaskId = assessmentId;
         }
      }
      
      if (hasAnyVocab && (!config.category || config.category === 'words')) {
        const { action } = await upsertDynamicAssessmentShell({
           institutionId, programId, levelId, classId: targetClassId, levelNum,
           tier: 'TEST', themeName: themeData.name, topicName: null,
           description: `Theme Test: ${themeData.name}`,
           themeCode, topicCode: null,
           modulePrefix: 'VOCAB', category: 'vocab',
           moduleId: vocabModuleId,
           answerType: 'written',
           durationMinutes: (sortedThemes.indexOf(themeCode) + 1) * 60,
           prerequisiteId: lastTaskId,
           displayOrder: displayOrder++
        });
        if (action === 'inserted') results.tests++;
        if (action === 'updated') results.updated++;
      }
      
      if (hasAnyPhrases && (!config.category || config.category === 'phrases')) {
        const { action } = await upsertDynamicAssessmentShell({
           institutionId, programId, levelId, classId: targetClassId, levelNum,
           tier: 'TEST', themeName: themeData.name, topicName: null,
           description: `Theme Test: ${themeData.name}`,
           themeCode, topicCode: null,
           modulePrefix: 'PHRASE', category: 'phrases',
           moduleId: phraseModuleId,
           answerType: 'dropdown',
           durationMinutes: (sortedThemes.indexOf(themeCode) + 1) * 60,
           prerequisiteId: lastTaskId,
           displayOrder: displayOrder++
        });
        if (action === 'inserted') results.tests++;
        if (action === 'updated') results.updated++;
      }
    }
  }

  clearApiCache('assessments');
  return results;
}

export async function autoGenerateWordsAssessments({ classId, levelId, programId, institutionId }) {
  if (!classId || !levelId || !programId) throw new Error("Missing required parameters for auto-generating words.");
  const { data: levelData } = await getSupabase().from('levels').select('level_number').eq('id', levelId).single();
  if (!levelData) throw new Error("Level not found.");
  return autoGenerateAssessmentsHierarchy([levelData.level_number], {
    programId,
    explicitClassId: classId,
    category: 'words'
  });
}

export async function autoGeneratePhrasesAssessments({ classId, levelId, programId, institutionId }) {
  if (!classId || !levelId || !programId) throw new Error("Missing required parameters for auto-generating phrases.");
  const { data: levelData } = await getSupabase().from('levels').select('level_number').eq('id', levelId).single();
  if (!levelData) throw new Error("Level not found.");
  return autoGenerateAssessmentsHierarchy([levelData.level_number], {
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

if (typeof window !== 'undefined') {
  window.adminFetchAll = adminFetchAll;
  window.adminUpdate = adminUpdate;
  window.adminInsert = adminInsert;
}
