// TOPS CORE — API Module (Stabilized & Synchronized)
// Centralized server & database interface for TOPS CORE LMS.
import { getSupabase, SUPABASE_URL, callEdgeFunction, isEdgeFunctionOffline, markEdgeFunctionOffline } from './supabase.js?v=20261106_v160';
import { evaluateAnswer, calculatePercentage, isPassing, calculateGrade, calculateOverallStudentScore, parseCorrectAnswers, stripHyphens, TOPSCORE_COLORS, getEvaluationColor, GRADE_PALETTE, INSTITUTION_GRADING_SCALES, getGradeColor, getGradeColorByScore, getInvertedGradeColor, getScoreColor, getGradeSymbol, getGradeTheme, formatGradeBadgeHtml, isExam, isWeeklyExam, isPretest, isVocabQuiz, isNoRepetitionTest, computeMilestoneExamMastery, validateDescriptionSentence, classifyAdjective, ADJECTIVE_CATEGORIES, detectClassDiscipline, isVocabularyClass, resolveTaskRepTargets, resolveTestCapabilities } from './grading.js?v=20261127_v692';
import { stripHonorific, getStudentInitial } from './utils/avatar-engine.js?v=20261106_v160';
import { escapeHtml, escHtml, showToast } from './app.js?v=20261106_v160';

export function getGrade(pct, options) {
  return calculateGrade(pct, options);
}

export { evaluateAnswer, calculatePercentage, isPassing, calculateGrade, calculateOverallStudentScore, parseCorrectAnswers, stripHyphens, TOPSCORE_COLORS, getEvaluationColor, GRADE_PALETTE, INSTITUTION_GRADING_SCALES, getGradeColor, getGradeColorByScore, getInvertedGradeColor, getScoreColor, getGradeSymbol, getGradeTheme, formatGradeBadgeHtml, isExam, isWeeklyExam, isPretest, isVocabQuiz, isNoRepetitionTest, computeMilestoneExamMastery, validateDescriptionSentence, classifyAdjective, ADJECTIVE_CATEGORIES, detectClassDiscipline, isVocabularyClass, resolveTaskRepTargets, callEdgeFunction, stripHonorific, getStudentInitial, escapeHtml, escHtml, showToast };

// ============================================================
// AUTH / LOGIN & UTILITIES
// ============================================================

const MOCK_INSTITUTIONS = [
  { id: '11111111-1111-1111-1111-111111111111', code: 'CEC', name: 'CEC', full_name: 'Cake English Course' },
  { id: '11111111-1111-1111-1111-222222222222', code: 'TOP', name: 'TOP', full_name: 'Top Occupational Program' }
];

const MOCK_PROGRAMS = [
  { id: '22222222-2222-2222-2222-222222222222', institution_id: '11111111-1111-1111-1111-111111111111', name: 'Class A' },
  { id: '22222222-2222-2222-2222-333333333333', institution_id: '11111111-1111-1111-1111-111111111111', name: 'Class B' }
];

export function cleanStudentName(name) {
  if (!name) return '';
  const cleaned = stripHonorific(name);
  return cleaned.replace(/\s+/g, ' ').trim().toLowerCase().split(' ').map(word => {
    if (!word) return '';
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
}

export function toTitleCase(str) {
  if (!str) return '';
  return String(str)
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .split(' ')
    .map(word => {
      if (!word) return '';
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

const VAULT_PROPER_NOUNS = new Set([
  // Days & Months (English)
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
  // Days & Months (Indonesian)
  'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu',
  'januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember',
  // Languages & Nationalities & Countries
  'english', 'indonesian', 'indonesia', 'american', 'america', 'british', 'britain', 'japanese', 'japan', 'arabic'
]);

export function formatVaultTerm(str, isPhrase = false) {
  if (!str) return '';
  const parts = String(str).split(/\s*[/;|]\s*/).map(p => p.trim()).filter(Boolean);
  const formatted = parts.map(part => {
    const words = part.split(/\s+/);
    if (words.length === 1 && !isPhrase) {
      const lower = part.toLowerCase();
      if (VAULT_PROPER_NOUNS.has(lower)) {
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      }
      return lower;
    } else {
      let clean = part;
      if (part === part.toUpperCase() && /[A-Z]/.test(part)) {
        clean = part.toLowerCase();
      }
      clean = clean.charAt(0).toUpperCase() + clean.slice(1);
      clean = clean.replace(/\bi\b/g, 'I');
      clean = clean.split(' ').map((w, idx) => {
        if (idx === 0) return w;
        const stripped = w.replace(/^[^\w]+|[^\w]+$/g, '').toLowerCase();
        if (VAULT_PROPER_NOUNS.has(stripped)) {
          const lead = w.match(/^[^\w]+/)?.[0] || '';
          const trail = w.match(/[^\w]+$/)?.[0] || '';
          return `${lead}${stripped.charAt(0).toUpperCase() + stripped.slice(1)}${trail}`;
        }
        return w;
      }).join(' ');
      return clean;
    }
  });
  return [...new Set(formatted)].join(' / ');
}

export function formatStudentName(name) {
  // Rule 2.23: Standard student name everywhere across the system (strictly stripped of honorifics)
  return cleanStudentName(name);
}

export function formatStudentDashboardName(name, gender, isChampion = false) {
  // Rule 2.23: Mr. and Miss (plus King/Queen) are presented on the Student Dashboard (dashboard.html) and Result Page (result.html)
  if (!name) return '';
  const g = String(gender || '').toLowerCase().trim();
  const isMale = g === 'male' || g === 'm' || g === 'laki-laki' || g === 'l';
  const isFemale = g === 'female' || g === 'f' || g === 'perempuan' || g === 'p';
  if (isChampion) {
    if (isMale) return `King ${name}`;
    if (isFemale) return `Queen ${name}`;
    return name;
  }
  if (isMale) return `Mr. ${name}`;
  if (isFemale) return `Miss ${name}`;
  return name;
}

export function normalizeStudentNameForMatch(name) {
  if (!name) return '';
  const stripped = stripHonorific(name);
  return stripped.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Dual-Tier Institution Identity Architecture Helpers (SSOT per DECISION-076 & AGENTS.md §1.5)
 * Tier 1: Shortcode (CEC / TOP) for dense workstation tables, metadata, SKU, compact badges.
 * Tier 2: Fullname (Cake English Course / Top Occupational Program) for profile cards, certificates, modal headers.
 */
export function getInstitutionShortcode(inst) {
  if (!inst) return '—';
  if (typeof inst === 'string') {
    const s = inst.trim().toUpperCase();
    if (s.includes('CAKE') || s === 'CEC') return 'CEC';
    if (s.includes('TOP') || s.includes('OCCUPATIONAL') || s.includes('OPTIMAL')) return 'TOP';
    return inst;
  }
  if (inst.code) return inst.code.toUpperCase();
  if (inst.name) return getInstitutionShortcode(inst.name);
  return '—';
}

export function getInstitutionFullname(inst) {
  if (!inst) return '—';
  if (typeof inst === 'string') {
    const s = inst.trim().toUpperCase();
    if (s === 'CEC' || s.includes('CAKE')) return 'Cake English Course';
    if (s === 'TOP' || s.includes('OCCUPATIONAL') || s.includes('OPTIMAL')) return 'Top Occupational Program';
    return inst;
  }
  if (inst.code === 'CEC' || (inst.name && inst.name.toUpperCase().includes('CAKE'))) return 'Cake English Course';
  if (inst.code === 'TOP' || (inst.name && (inst.name.toUpperCase().includes('OCCUPATIONAL') || inst.name.toUpperCase().includes('TOP')))) return 'Top Occupational Program';
  return inst.name || inst.code || '—';
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
 * Detects whether a student, class, session, or program context belongs to Cake English Course (CEC) Camp.
 */
export function isCampContext(ctx) {
  if (!ctx) return false;
  const isEntityWithRelations = Boolean(ctx.birth_date || ctx.batch_id || ctx.program_id || ctx.programs || ctx.institutions || ctx.batches);
  const prog = ctx.program_name || ctx.program?.name || ctx.programs?.name || ctx.programName || (!isEntityWithRelations ? ctx.name : '') || '';
  const inst = ctx.institution_name || ctx.institution?.name || ctx.institutions?.name || ctx.institutionName || ctx.institution_code || ctx.institution?.code || ctx.institutions?.code || '';
  const batch = ctx.batch_name || ctx.batch?.name || ctx.batches?.name || ctx.batchName || '';
  const code = ctx.code || '';
  return /camp/i.test(prog) || /cec|cake/i.test(inst) || /camp/i.test(batch) || /^CAMP-/i.test(code);
}

/**
 * Resolves calendar year from batch/student/session context for Non-Level programs.
 */
export function resolveContextYear(ctx) {
  if (!ctx) return String(new Date().getFullYear());
  if (ctx.enrollment_date) {
    const yr = new Date(ctx.enrollment_date).getFullYear();
    if (!isNaN(yr) && yr > 2000) return String(yr);
  }
  if (ctx.batch_enrollment_date) {
    const yr = new Date(ctx.batch_enrollment_date).getFullYear();
    if (!isNaN(yr) && yr > 2000) return String(yr);
  }
  if (ctx.batches?.enrollment_date) {
    const yr = new Date(ctx.batches.enrollment_date).getFullYear();
    if (!isNaN(yr) && yr > 2000) return String(yr);
  }
  const batchName = String(ctx.batch_name || ctx.batch?.name || ctx.batchName || ctx.name || '');
  const matchFullYear = batchName.match(/\b(20\d{2})\b/);
  if (matchFullYear) return matchFullYear[1];
  const matchShortYear = batchName.match(/[-_](\d{2})$/);
  if (matchShortYear) return `20${matchShortYear[1]}`;
  if (ctx.created_at) {
    const yr = new Date(ctx.created_at).getFullYear();
    if (!isNaN(yr) && yr > 2000) return String(yr);
  }
  return String(new Date().getFullYear());
}

/**
 * Dual-tenant academic tier formatter (DECISION-083 & AGENTS.md §2.4.3 SSOT):
 * CEC / Camp: '1st Step', '2nd Step', '3rd Step', 'Alumni'
 * TOP / Non-Level: Displays batch enrollment year (e.g. '2026') or 'Alumni'
 */
export function formatAcademicTier(levelVal, isCamp = false, ctx = null) {
  const short = toShortLevel(levelVal);
  if (short === 'X' || short === '99' || String(levelVal).toLowerCase() === 'alumni') {
    return 'Alumni';
  }
  if (isCamp) {
    if (short === '0' || levelVal == null || levelVal === '' || levelVal === '—' || levelVal === '-') return '1st Step';
    return `${short} Step`;
  }
  // TOP / Non-Level: Replaces Level 0 / No Level with Enrollment Year per User Requirement
  if (short === '0' || String(levelVal).toLowerCase() === 'non-level' || String(levelVal).toLowerCase() === 'level 0' || levelVal == null || levelVal === '' || levelVal === '—' || levelVal === '-') {
    return resolveContextYear(ctx);
  }
  return `${short} Level`;
}

/**
 * Konversi nomor level menjadi teks ordinal baku:
 * 1 -> 1st Level, 2 -> 2nd Level, 3 -> 3rd Level, 4 -> 4th Level, dst.
 * 0, 'Non-Level', 'General' -> '0'
 * 99, 'Alumni', 'X' -> 'Alumni'
 * Jika short === true, memanggil toShortLevel: '1st', '2nd', '3rd', 'X', '0'
 * Jika isCamp === true, memanggil formatAcademicTier: '1st Step', '2nd Step', dst.
 */
export function toOrdinalLevel(num, short = false, isCamp = false) {
  if (short) return toShortLevel(num);
  if (isCamp) return formatAcademicTier(num, true);
  if (num == null) return '—';
  const str = String(num).trim().toLowerCase();
  if (str === '0' || str === 'non-level' || str === 'general') {
    return '0';
  }
  if (str === '—' || str === '-') {
    return '—';
  }
  if (str === 'alumni' || str === 'ex' || str === 'alumnus' || str === '99' || str === 'x') {
    return 'Alumni';
  }
  const n = parseInt(num, 10);
  if (isNaN(n)) return '1st Level';
  if (n === 0) return '0';
  if (n === 99) return 'Alumni';
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
 * 99, 'Alumni', 'Ex', 'X' -> 'X'
 * 0, '0', 'Non-Level', 'General', 'None' -> '0'
 * Menormalisasi string seperti '1st Level', '2nd Level', 'Level 3', 'LVL 2' menjadi '1st', '2nd', '3rd'.
 */
export function toShortLevel(val) {
  if (val == null || val === '') return '—';
  const str = String(val).trim();
  if (!str || str === '—' || str === '-') return '—';

  const lower = str.toLowerCase();
  if (lower === 'alumni' || lower === 'ex' || lower === 'alumnus' || str === '99' || lower === 'x') {
    return 'X';
  }
  if (str === '0' || lower === 'non-level' || lower === 'general' || lower === 'none' || lower === 'no level') {
    return '0';
  }

  let n = parseInt(str, 10);
  if (isNaN(n)) {
    const match = str.match(/\d+/);
    if (match) n = parseInt(match[0], 10);
  }

  if (isNaN(n)) return str;
  if (n === 0) return '0';
  if (n === 99) return 'X';
  if (n < 1) return '0';

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
  window.isCampContext = isCampContext;
  window.formatAcademicTier = formatAcademicTier;
  window.resolveContextYear = resolveContextYear;
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
const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5-minute in-memory cache for runtime lookups

// ── Persistent Device LocalStorage Engine (Zero-Egress & Instant Multi-Device Boot) ──
function _getPersistentStorage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    if (typeof localStorage !== 'undefined') return localStorage;
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) return globalThis.localStorage;
  } catch (_) {}
  return null;
}

const MASTER_STORAGE_PREFIX = 'topscore_mc_v696_';
const MASTER_STORAGE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7-day weekly academic cycle (Ahad to Ahad)

// Purge any stale legacy cache keys from previous versions on module initialization
try {
  const _initStorage = _getPersistentStorage();
  if (_initStorage) {
    const _staleKeys = [];
    for (let i = 0; i < _initStorage.length; i++) {
      const k = _initStorage.key(i);
      if (k && k.startsWith('topscore_mc_') && !k.startsWith(MASTER_STORAGE_PREFIX)) {
        _staleKeys.push(k);
      }
    }
    _staleKeys.forEach(k => _initStorage.removeItem(k));
  }
} catch (_) {}

// Sunday (Ahad) boundary reset helper in WITA (UTC+8)
function _isSundayExpired(cachedTimestamp, now = Date.now()) {
  const age = now - cachedTimestamp;
  if (age >= MASTER_STORAGE_TTL_MS) return true;

  const WITA_OFFSET_MS = 8 * 60 * 60 * 1000;
  const nowWita = new Date(now + WITA_OFFSET_MS);
  const dayOfWeek = nowWita.getUTCDay(); // 0 is Sunday

  const sundayStartWita = new Date(nowWita);
  sundayStartWita.setUTCDate(nowWita.getUTCDate() - dayOfWeek);
  sundayStartWita.setUTCHours(0, 0, 0, 0);
  const lastSundayTimestamp = sundayStartWita.getTime() - WITA_OFFSET_MS;

  return cachedTimestamp < lastSundayTimestamp;
}

function _readMasterStorage(cacheKey) {
  try {
    const storage = _getPersistentStorage();
    if (!storage) return null;
    const raw = storage.getItem(MASTER_STORAGE_PREFIX + cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.timestamp && parsed.data !== undefined) {
      if (!_isSundayExpired(parsed.timestamp)) {
        return parsed.data;
      }
      storage.removeItem(MASTER_STORAGE_PREFIX + cacheKey);
    }
  } catch (_) {}
  return null;
}

export function refreshWeeklyDeviceCache() {
  _clearMasterStorage();
  _apiCache.clear();
  clearAdminCache();
  console.log('[TopsCore] Weekly device cache successfully refreshed!');
}
if (typeof window !== 'undefined') {
  window.refreshWeeklyDeviceCache = refreshWeeklyDeviceCache;
}

function _writeMasterStorage(cacheKey, data) {
  try {
    const storage = _getPersistentStorage();
    if (!storage || data === undefined) return;
    storage.setItem(MASTER_STORAGE_PREFIX + cacheKey, JSON.stringify({
      timestamp: Date.now(),
      data
    }));
  } catch (_) {}
}

function _clearMasterStorage(table = null) {
  try {
    const storage = _getPersistentStorage();
    if (!storage) return;
    if (!table) {
      const keysToRemove = [];
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (k && k.startsWith(MASTER_STORAGE_PREFIX)) keysToRemove.push(k);
      }
      keysToRemove.forEach(k => storage.removeItem(k));
    } else {
      const normTable = (table || '').toLowerCase().replace('-', '_');
      const targetPrefix = MASTER_STORAGE_PREFIX + normTable;
      const keysToRemove = [];
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (k && (k.startsWith(targetPrefix + '|') || k === targetPrefix || k.startsWith(targetPrefix + '_'))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => storage.removeItem(k));
    }
  } catch (_) {}
}

let _isClearingApiCache = false;
export function clearApiCache(prefix = null, { keepPersistent = false } = {}) {
  if (_isClearingApiCache) return;
  _isClearingApiCache = true;
  try {
    if (!prefix) {
      _apiCache.clear();
      clearAdminCache();
      if (!keepPersistent) {
        _clearPersistentVaultCache();
        _clearMasterStorage();
      }
    } else {
      for (const key of _apiCache.keys()) {
        if (key.startsWith(prefix)) _apiCache.delete(key);
      }
      if (!keepPersistent) {
        _clearMasterStorage(prefix);
      }
      if (prefix === 'tests' || prefix.startsWith('tests')) {
      clearAdminCache('tests');
    }
      if (prefix === 'tests' || prefix.startsWith('tests')) {
        _clearMasterStorage('tests');
      }
      if ((prefix === 'vault' || prefix.startsWith('vault') || prefix === 'vocabulary_vault') && !keepPersistent) {
        _clearPersistentVaultCache();
        clearAdminCache('vocabulary_vault');
        _clearMasterStorage('vocabulary_vault');
      }
    }
  } finally {
    _isClearingApiCache = false;
  }
}

async function withCache(key, fetcher, ttl = DEFAULT_CACHE_TTL) {
  const cached = _apiCache.get(key);
  const now = Date.now();
  if (cached && (now - cached.timestamp < ttl)) {
    return Array.isArray(cached.data) ? [...cached.data] : { ...cached.data };
  }
  // Persistent device cache hit
  const persistent = _readMasterStorage(key);
  if (persistent !== null) {
    _apiCache.set(key, { data: persistent, timestamp: now });
    return Array.isArray(persistent) ? [...persistent] : { ...persistent };
  }
  const data = await fetcher();
  _apiCache.set(key, { data, timestamp: now });
  if (data) {
    _writeMasterStorage(key, data);
  }
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
  // Batches use short in-memory-only cache (90s) — NEVER persisted to localStorage.
  // Reason: Admin may create new batches at any time; a 7-day localStorage hit
  // would hide newly created batches from the student login gate dropdown.
  const BATCH_TTL = 90 * 1000;
  const existing = _apiCache.get(cacheKey);
  const now = Date.now();
  if (!forceRefresh && existing && (now - existing.timestamp < BATCH_TTL)) {
    return Array.isArray(existing.data) ? [...existing.data] : existing.data;
  }
  _apiCache.delete(cacheKey);
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
  const result = [...list].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  // In-memory only — skip _writeMasterStorage to prevent stale batch list on student HP
  _apiCache.set(cacheKey, { data: result, timestamp: now });
  return [...result];
}

export async function fetchStudentsByProgram(programId, batchId = null, activeOnly = true, forceRefresh = false) {
  const cacheKey = `students_prog_${programId}_${batchId}_${activeOnly}`;
  if (forceRefresh) clearApiCache(cacheKey);
  // Students use short in-memory-only cache (90s) — NEVER persisted to localStorage.
  // Reason: Admin may add/edit/deactivate students at any time; a 7-day localStorage
  // hit would hide new students from the login gate until students manually clear cache.
  const SHORT_TTL = 90 * 1000; // 90 seconds in-memory only
  const existing = _apiCache.get(cacheKey);
  const now = Date.now();
  if (!forceRefresh && existing && (now - existing.timestamp < SHORT_TTL)) {
    return Array.isArray(existing.data) ? [...existing.data] : existing.data;
  }
  _apiCache.delete(cacheKey); // always evict before re-fetch
  const fetcher = async () => {
    let list = MOCK_STUDENTS.filter(s => s.program_id === programId && (!batchId || s.batch_id === batchId) && (!activeOnly || (s.is_active !== false && (s.program_status || '').toUpperCase() !== 'INACTIVE')));
    if (!isPlaceholderUrl()) {
      try {
        const sb = await getSupabase();
        let query = sb.from('students')
          .select('id, name, nis, gender, program_id, batch_id, is_active, program_status, batches!batch_id(id, is_active)')
          .eq('program_id', programId)
          .is('deleted_at', null);
        if (activeOnly) {
          query = query.eq('is_active', true).neq('program_status', 'INACTIVE');
        }
        if (batchId) {
          query = query.eq('batch_id', batchId);
        }
        const { data, error } = await query.order('name');
        if (error) throw error;
        if (data && data.length) {
          list = data.filter(s => {
            if (activeOnly) {
              if (s.is_active === false || (s.program_status || '').toUpperCase() === 'INACTIVE') return false;
              if (!batchId && s.batches && s.batches.is_active === false) return false;
            }
            return true;
          });
        }
      } catch (e) {
        console.warn('Supabase fetch students failed, falling back to mock data:', e.message);
      }
    }
    return list.map(s => ({
      ...s,
      displayName: s.name,
      name: s.name
    })).sort((a, b) => {
      const nameA = a.name || a.displayName || '';
      const nameB = b.name || b.displayName || '';
      return nameA.localeCompare(nameB, undefined, { sensitivity: 'base', numeric: true });
    });
  };
  const data = await fetcher();
  // Store in-memory only — deliberately skip _writeMasterStorage to prevent
  // stale student lists surviving across sessions on student devices.
  _apiCache.set(cacheKey, { data, timestamp: now });
  return Array.isArray(data) ? [...data] : data;
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
        name: student.name,
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
      edgeRes.student = studentObj;
      return edgeRes;
    }
  } catch (edgeFnError) {
    console.warn('Edge Function student-login unavailable, using direct DB fallback:', edgeFnError.message);
  }

  const sb = await getSupabase();
  const { data: student, error } = await sb
    .from('students')
    .select('id, name, nis, gender, pin_hash, is_active, program_status, program_id, institution_id, batch_id, level_id, batches!batch_id(current_level_id)')
    .eq('id', studentId)
    .single();

  if (error || !student) throw new Error('Student not found.');
  if (!student.is_active || (student.program_status || '').toUpperCase() === 'INACTIVE') {
    throw new Error('This student account is inactive.');
  }
  if (student.program_id !== programId) throw new Error('Student does not belong to the selected program.');
  if (student.institution_id !== institutionId) throw new Error('Student does not belong to the selected institution.');
  if (batchId && student.batch_id && student.batch_id !== batchId) {
    throw new Error('Student does not belong to the selected batch.');
  }

  const pinHash = await sha256(pin);
  if (student.pin_hash !== pinHash) throw new Error('Invalid PIN. Please try again.');

  const effectiveLevelId = student.level_id || student.batches?.current_level_id || null;
  let levelNumber = null;
  let levelName = null;
  if (effectiveLevelId) {
    try {
      const { data: lvl } = await sb.from('levels').select('id, level_number, name').eq('id', effectiveLevelId).maybeSingle();
      if (lvl) {
        levelNumber = lvl.level_number;
        levelName = lvl.name;
      }
    } catch (_) {}
  }

  return {
    success: true,
    student: {
      id: student.id,
      nis: student.nis || null,
      name: student.name,
      gender: student.gender,
      batch_id: student.batch_id,
      level_id: effectiveLevelId,
      level_number: levelNumber,
      level_name: levelName
    }
  };
}

export async function updateStudentPin(studentId, oldPin, newPin) {
  if (!newPin || String(newPin).length < 4) throw new Error('New PIN must be at least 4 digits.');
  if (isPlaceholderUrl()) {
    const student = MOCK_STUDENTS.find(s => s.id === studentId);
    if (!student) throw new Error('Student data not found.');
    const oldPinHash = await sha256(String(oldPin));
    if (student.pin_hash && student.pin_hash !== oldPinHash && student.pin_hash !== String(oldPin)) {
      throw new Error('The old PIN you entered is incorrect.');
    }
    const newPinHash = await sha256(String(newPin));
    student.pin_hash = newPinHash;
    return { success: true };
  }

  const sb = await getSupabase();
  const { data: student, error } = await sb.from('students').select('pin_hash').eq('id', studentId).maybeSingle();
  if (error) throw new Error(error.message || 'Database error occurred.');
  if (!student) throw new Error('Student data not found.');

  const oldPinHash = await sha256(String(oldPin));
  if (student.pin_hash && student.pin_hash !== oldPinHash && student.pin_hash !== String(oldPin)) {
    throw new Error('The old PIN you entered is incorrect.');
  }

  const newPinHash = await sha256(String(newPin));
  const { error: updateErr } = await sb.from('students')
    .update({ pin_hash: newPinHash, pin: String(newPin), updated_at: new Date().toISOString() })
    .eq('id', studentId);

  if (updateErr) throw new Error(updateErr.message || 'Failed to update PIN.');
  return { success: true };
}

export const changePin = updateStudentPin;

export async function updateStudentGender(studentId, gender) {
  const g = (gender || '').toLowerCase().trim();
  if (g !== 'male' && g !== 'female') {
    throw new Error('Invalid gender selection. Choose Male or Female.');
  }

  const sb = await getSupabase();
  const { error } = await sb.from('students')
    .update({ gender: g, updated_at: new Date().toISOString() })
    .eq('id', studentId);

  if (error) throw error;
  return { success: true, gender: g };
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
    const { data: lvlData } = await sb.from('levels').select('level_number, name').eq('id', levelId).single();
    if (!lvlData || typeof lvlData.level_number !== 'number') {
      return data;
    }

    const studentLevelNum = lvlData.level_number;
    const isAlumni = studentLevelNum === 99 || (lvlData.name || '').toLowerCase() === 'alumni';
    const isNonLevel = studentLevelNum === 0 || (lvlData.name || '').toLowerCase() === 'non-level';

    // Level 99 (Alumni) receives Lifetime Universal Access across all program classes
    if (isAlumni) {
      return data;
    }

    // Level 0 (Non-Level) receives all classes for that program (with auto-heal)
    if (isNonLevel) {
      if (data.length > 0) return data;
      const { data: progClasses } = await sb.from('classes')
        .select('id, name, code, description, level_id, is_active, levels!classes_level_id_fkey(level_number, name)')
        .is('deleted_at', null)
        .eq('program_id', programId);
      if (progClasses && progClasses.length > 0) {
        const inactiveIds = progClasses.filter(c => !c.is_active).map(c => c.id);
        if (inactiveIds.length > 0) {
          await sb.from('classes').update({ is_active: true }).in('id', inactiveIds);
        }
        return progClasses.map(c => ({ ...c, is_active: true }));
      }
      return data;
    }

    // Cumulative Unlocked Classes: Return classes assigned to student's current and previous unlocked levels
    const matched = data.filter(c => {
      if (c.level_id === levelId) return true;
      const cLvlNum = c.levels?.level_number;
      if (cLvlNum != null && studentLevelNum != null) {
        return cLvlNum <= studentLevelNum;
      }
      return false;
    });

    // Resilient Level Check: Check if classes exist for the current level that need to be active
    const hasCurrentLvl = matched.some(c => c.level_id === levelId || c.levels?.level_number === studentLevelNum);
    if (!hasCurrentLvl && studentLevelNum != null && studentLevelNum > 0 && studentLevelNum < 99) {
      const { data: levelClasses } = await sb.from('classes')
        .select('id, name, code, description, level_id, is_active, levels!classes_level_id_fkey(level_number, name)')
        .is('deleted_at', null)
        .eq('program_id', programId);

      const foundLevelCls = (levelClasses || []).filter(c => c.level_id === levelId || c.levels?.level_number === studentLevelNum);
      if (foundLevelCls.length > 0) {
        // Auto-heal: Ensure current level class is active so student can progress
        const inactiveIds = foundLevelCls.filter(c => !c.is_active).map(c => c.id);
        if (inactiveIds.length > 0) {
          await sb.from('classes').update({ is_active: true }).in('id', inactiveIds);
        }
        matched.push(...foundLevelCls.map(c => ({ ...c, is_active: true })));
      }
    }

    if (matched.length > 0) return matched;

    return [];
  } catch (e) {
    console.warn('Classes query note:', e.message);
  }
  return [];
}

export async function fetchLevels(classId) {
  return withCache('levels', async () => {
    const sb = await getSupabase();
    const { data, error } = await sb.from('levels')
      .select('id, name, level_number')
      .order('level_number');
    if (error) throw error;
    return data;
  });
}

export async function fetchStudentProgress(studentId) {
  const sb = await getSupabase();
  const { data, error } = await sb
    .from('progress')
    .select('id, student_id, class_id, unlocked_level, highest_score, updated_at')
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
    .select('id, title, shell_code, payload, module_id, display_name, test_subtype, test_type, class_id, level_id, display_order, status, minimum_required_score, prerequisite_test_id, working_duration_minutes, schedule_mode, levels(id, name, level_number)')
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
    .select('id, title, shell_code, module_id, display_name, test_subtype, test_type, class_id, level_id, display_order, status, minimum_required_score, prerequisite_test_id, working_duration_minutes, schedule_mode, deleted_at, levels(id, name, level_number)')
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

function buildAttemptTestFallback(att) {
  if (att?.tests) return att.tests;
  if (!att?.test_title && !att?.test_shell_code) return null;
  return {
    id: att.test_id || null,
    class_id: att.class_id || null,
    level_id: att.level_id || null,
    title: att.test_title || att.test_shell_code || 'Archived Test',
    display_name: att.test_title || null,
    test_type: att.test_type || null,
    category: att.test_category || null,
    test_subtype: att.test_subtype || null,
    shell_code: att.test_shell_code || null,
    status: 'ARCHIVED',
    deleted_at: null,
    is_snapshot_fallback: true,
    payload: {
      shell_code: att.test_shell_code || null,
      category: att.test_category || null,
      theme_code: att.theme_code || null,
      topic_code: att.topic_code || null
    }
  };
}

export async function fetchAllStudentAttempts(studentId) {
  if (!studentId) return [];
  const sb = await getSupabase();
  const { data, error } = await sb.from('attempts')
    .select('id, test_id, score, correct_count, total_questions, percentage, effective_score, is_remedial_unlocked, is_remedial, is_forgiven, forgiven_reason, is_manual_override, forgiven_by, forgiven_at, grade, status, is_best_score, submitted_at, test_shell_code, test_title, test_type, test_subtype, test_category, class_id, level_id, theme_code, topic_code, tests(id, class_id, title, test_type, category, test_subtype, shell_code, payload, deleted_at, status, classes(name))')
    .eq('student_id', studentId)
    .in('status', ['submitted', 'auto_submitted', 'evaluated', 'SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED'])
    .order('submitted_at', { ascending: false });

  if (!error) return (data || []).map(att => ({ ...att, tests: buildAttemptTestFallback(att) }));

  // Fallback 2-step jika foreign key cache Supabase belum sinkron
  const { data: attempts, error: attErr } = await sb.from('attempts')
    .select('id, test_id, score, correct_count, total_questions, percentage, effective_score, is_remedial_unlocked, is_remedial, is_forgiven, forgiven_reason, is_manual_override, forgiven_by, forgiven_at, grade, status, is_best_score, submitted_at, test_shell_code, test_title, test_type, test_subtype, test_category, class_id, level_id, theme_code, topic_code')
    .eq('student_id', studentId)
    .in('status', ['submitted', 'auto_submitted', 'evaluated', 'SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED'])
    .order('submitted_at', { ascending: false });

  if (attErr || !attempts) return [];

  const testIds = [...new Set(attempts.map(a => a.test_id).filter(Boolean))];
  let testMap = {};
  if (testIds.length > 0) {
    const { data: asmData } = await sb.from('tests').select('id, class_id, title, test_type, category, test_subtype, shell_code, payload, deleted_at, status, classes(name)').in('id', testIds);
    if (asmData) asmData.forEach(a => { testMap[a.id] = a; });
  }

  return attempts.map(att => {
    const resolved = testMap[att.test_id] || null;
    return {
      ...att,
      tests: resolved || buildAttemptTestFallback(att)
    };
  });
}

export async function fetchStudentAttemptsForTest(studentId, testId) {
  if (!studentId || !testId) return [];
  const sb = await getSupabase();
  const { data, error } = await sb.from('attempts')
    .select('id, status, score, percentage, effective_score, is_remedial_unlocked, is_remedial, is_forgiven, forgiven_reason, is_manual_override, forgiven_by, forgiven_at, grade, submitted_at')
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
    taskMinScore: 60,
    examMinScore: 60,
    taskQuestionOrder: 'random',
    examQuestionOrder: 'random'
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

  // 1. If classId is specified, check class-specific site_settings first
  if (classId) {
    try {
      const { data, error } = await sb.from('site_settings')
        .select('key, value')
        .eq('key', `class_test_settings_${classId}`)
        .maybeSingle();

      if (!error && data && data.value) {
        const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        const res = {
          taskRepetitions: Math.max(1, parseInt(parsed.taskRepetitions, 10) || 7),
          taskMinScore: Math.min(100, Math.max(1, parseInt(parsed.taskMinScore, 10) || 60)),
          examMinScore: Math.min(100, Math.max(1, parseInt(parsed.examMinScore, 10) || 60)),
          taskQuestionOrder: parsed.taskQuestionOrder === 'sequential' ? 'sequential' : 'random',
          examQuestionOrder: parsed.examQuestionOrder === 'sequential' ? 'sequential' : 'random',
          wordsTaskQuestions: parsed.wordsTaskQuestions || '10',
          phrasesTaskQuestions: parsed.phrasesTaskQuestions || '10',
          wordsTaskAnswer: parsed.wordsTaskAnswer || 'spoken',
          phrasesTaskAnswer: parsed.phrasesTaskAnswer || 'spoken',
          wordsTaskPace: parseInt(parsed.wordsTaskPace, 10) || 15,
          phrasesTaskPace: parseInt(parsed.phrasesTaskPace, 10) || 20,
          wordsTaskDur: parseInt(parsed.wordsTaskDur, 10) || 5,
          phrasesTaskDur: parseInt(parsed.phrasesTaskDur, 10) || 4,
          wordsExamQuestions: parsed.wordsExamQuestions || '30',
          phrasesExamQuestions: parsed.phrasesExamQuestions || '10',
          wordsExamAnswer: parsed.wordsExamAnswer || 'spoken',
          phrasesExamAnswer: parsed.phrasesExamAnswer || 'selection',
          wordsExamPace: parseInt(parsed.wordsExamPace, 10) || 15,
          phrasesExamPace: parseInt(parsed.phrasesExamPace, 10) || 20,
          wordsExamDur: parseInt(parsed.wordsExamDur, 10) || 30,
          phrasesExamDur: parseInt(parsed.phrasesExamDur, 10) || 10
        };
        setLocal(`topscore_test_settings_${classId}`, JSON.stringify(res));
        return res;
      }
    } catch (e) {
      console.warn('[fetchClassTestSettings] class site_settings query error:', e);
    }

    // 1b. Check class-specific LocalStorage
    const local = getLocal(`topscore_test_settings_${classId}`);
    if (local) {
      try { return { ...defaultSettings, ...JSON.parse(local) }; } catch (_) {}
    }

    // 1c. Inspect existing class tests from DB (Ground Truth for this class)
    try {
      const { data: sampleTests } = await sb.from('tests')
        .select('payload, minimum_required_score, test_type, category, shell_code, title, question_order')
        .eq('class_id', classId)
        .is('deleted_at', null)
        .limit(30);

      if (sampleTests && sampleTests.length > 0) {
        const sampleTask = sampleTests.find(t => (t.category || t.test_type || '').toUpperCase() !== 'EXAM');
        const sampleExam = sampleTests.find(t => (t.category || t.test_type || '').toUpperCase() === 'EXAM');
        const taskScore = sampleTask ? (sampleTask.minimum_required_score ?? sampleTask.payload?.minimum_required_score ?? sampleTask.payload?.min_score) : null;
        const examScore = sampleExam ? (sampleExam.minimum_required_score ?? sampleExam.payload?.minimum_required_score ?? sampleExam.payload?.min_score) : null;

        const derived = {
          taskRepetitions: Math.max(1, parseInt(sampleTask?.payload?.task_repetitions, 10) || 7),
          taskMinScore: taskScore !== null && !isNaN(parseInt(taskScore, 10)) ? Math.min(100, Math.max(1, parseInt(taskScore, 10))) : 60,
          examMinScore: examScore !== null && !isNaN(parseInt(examScore, 10)) ? Math.min(100, Math.max(1, parseInt(examScore, 10))) : 60,
          taskQuestionOrder: (sampleTask?.question_order || sampleTask?.payload?.question_order) === 'sequential' ? 'sequential' : 'random',
          examQuestionOrder: (sampleExam?.question_order || sampleExam?.payload?.question_order) === 'sequential' ? 'sequential' : 'random'
        };
        setLocal(`topscore_test_settings_${classId}`, JSON.stringify(derived));
        return derived;
      }
    } catch (_) {}
  }

  // 2. Global fallback (when classId is null or class has no specific records)
  try {
    const { data, error } = await sb.from('site_settings')
      .select('key, value')
      .eq('key', 'default_test_system_settings')
      .maybeSingle();

    if (!error && data && data.value) {
      const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      return {
        taskRepetitions: Math.max(1, parseInt(parsed.taskRepetitions, 10) || 7),
        taskMinScore: Math.min(100, Math.max(1, parseInt(parsed.taskMinScore, 10) || 60)),
        examMinScore: Math.min(100, Math.max(1, parseInt(parsed.examMinScore, 10) || 60)),
        taskQuestionOrder: parsed.taskQuestionOrder === 'sequential' ? 'sequential' : 'random',
        examQuestionOrder: parsed.examQuestionOrder === 'sequential' ? 'sequential' : 'random'
      };
    }
  } catch (e) {
    console.warn('[fetchClassTestSettings] default site_settings error:', e);
  }

  const globalLocal = getLocal('topscore_test_settings_global');
  if (globalLocal) {
    try { return { ...defaultSettings, ...JSON.parse(globalLocal) }; } catch (_) {}
  }

  return defaultSettings;
}

export async function saveClassTestSettings(classId, settings = {}, applyToExisting = false) {
  const sb = await getSupabase();
  let existingSettings = null;
  try {
    const rawExisting = (typeof window !== 'undefined' && window.localStorage)
      ? window.localStorage.getItem(classId ? `topscore_test_settings_${classId}` : 'topscore_test_settings_global')
      : null;
    if (rawExisting) existingSettings = JSON.parse(rawExisting);
  } catch (_) {}

  const resolvedReps = settings.taskRepetitions != null
    ? Math.max(1, parseInt(settings.taskRepetitions, 10) || 7)
    : (existingSettings?.taskRepetitions ? Math.max(1, parseInt(existingSettings.taskRepetitions, 10) || 7) : 7);

  const cleanSettings = {
    taskRepetitions: resolvedReps,
    taskMinScore: settings.taskMinScore != null
      ? Math.min(100, Math.max(1, parseInt(settings.taskMinScore, 10) || 50))
      : (existingSettings?.taskMinScore ? Number(existingSettings.taskMinScore) : 50),
    examMinScore: settings.examMinScore != null
      ? Math.min(100, Math.max(1, parseInt(settings.examMinScore, 10) || 60))
      : (existingSettings?.examMinScore ? Number(existingSettings.examMinScore) : 60),
    taskQuestionOrder: (settings.taskQuestionOrder || existingSettings?.taskQuestionOrder) === 'sequential' ? 'sequential' : 'random',
    examQuestionOrder: (settings.examQuestionOrder || existingSettings?.examQuestionOrder) === 'sequential' ? 'sequential' : 'random',
    wordsTaskQuestions: settings.wordsTaskQuestions || existingSettings?.wordsTaskQuestions || '10',
    phrasesTaskQuestions: settings.phrasesTaskQuestions || existingSettings?.phrasesTaskQuestions || '10',
    wordsTaskAnswer: settings.wordsTaskAnswer || existingSettings?.wordsTaskAnswer || 'spoken',
    phrasesTaskAnswer: settings.phrasesTaskAnswer || existingSettings?.phrasesTaskAnswer || 'spoken',
    wordsTaskPace: parseInt(settings.wordsTaskPace, 10) || existingSettings?.wordsTaskPace || 15,
    phrasesTaskPace: parseInt(settings.phrasesTaskPace, 10) || existingSettings?.phrasesTaskPace || 20,
    wordsTaskDur: parseInt(settings.wordsTaskDur, 10) || existingSettings?.wordsTaskDur || 5,
    phrasesTaskDur: parseInt(settings.phrasesTaskDur, 10) || existingSettings?.phrasesTaskDur || 4,
    wordsExamQuestions: settings.wordsExamQuestions || existingSettings?.wordsExamQuestions || '30',
    phrasesExamQuestions: settings.phrasesExamQuestions || existingSettings?.phrasesExamQuestions || '10',
    wordsExamAnswer: settings.wordsExamAnswer || existingSettings?.wordsExamAnswer || 'spoken',
    phrasesExamAnswer: settings.phrasesExamAnswer || existingSettings?.phrasesExamAnswer || 'selection',
    wordsExamPace: parseInt(settings.wordsExamPace, 10) || existingSettings?.wordsExamPace || 15,
    phrasesExamPace: parseInt(settings.phrasesExamPace, 10) || existingSettings?.phrasesExamPace || 20,
    wordsExamDur: parseInt(settings.wordsExamDur, 10) || existingSettings?.wordsExamDur || 30,
    phrasesExamDur: parseInt(settings.phrasesExamDur, 10) || existingSettings?.phrasesExamDur || 10
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
          const isPhrase = String(t.category || t.payload?.category || t.shell_code || '').toLowerCase().includes('phrase');
          const newScore = isExamTest ? cleanSettings.examMinScore : cleanSettings.taskMinScore;
          const newOrder = isExamTest ? cleanSettings.examQuestionOrder : cleanSettings.taskQuestionOrder;
          const newAns = isExamTest
            ? (isPhrase ? cleanSettings.phrasesExamAnswer : cleanSettings.wordsExamAnswer)
            : (isPhrase ? cleanSettings.phrasesTaskAnswer : cleanSettings.wordsTaskAnswer);
          const newDur = isExamTest
            ? (isPhrase ? cleanSettings.phrasesExamDur : cleanSettings.wordsExamDur)
            : (isPhrase ? cleanSettings.phrasesTaskDur : cleanSettings.wordsTaskDur);

          const updatedPayload = {
            ...(t.payload || {}),
            minimum_required_score: newScore,
            min_score: newScore,
            task_repetitions: cleanSettings.taskRepetitions,
            question_order: newOrder,
            answer_type: newAns,
            working_duration_minutes: newDur,
            duration_minutes: newDur
          };

          const updateFields = {
            payload: updatedPayload,
            question_order: newOrder,
            answer_type: newAns,
            working_duration_minutes: newDur
          };
          if (applyToExisting) {
            updateFields.minimum_required_score = newScore;
          }

          await sb.from('tests').update(updateFields).eq('id', t.id);
          updatedCount++;
        }
      }
      clearApiCache('tests');
      clearApiCache('vault');
      clearAdminCache('tests');
      clearAdminCache('vocabulary_vault');
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
  clearApiCache('vault');
  clearAdminCache('tests');
  clearAdminCache('vocabulary_vault');
  return { success: true, newScore: validScore };
}

/**
 * Authoritative Class Discipline Governance Architecture (SSOT)
 * Provides centralized configuration for each class discipline.
 */
export const DEFAULT_DISCIPLINE_GOVERNANCE = {
  VOCABULARY: {
    discipline: 'VOCABULARY',
    name: 'Vocabulary',
    engineFamily: 'Vocabulary Mastery Modules',
    badge: 'Tiered Discipline',
    isTiered: true,
    levels: ['1st Level', '2nd Level', '3rd Level', 'Non-Level'],
    taskRepetitions: 7,
    taskMinScore: 70,
    examMinScore: 60,
    taskDuration: 11,
    examDuration: 54,
    numThemes: 4,
    wordsPacing: {
      written: 15,
      selection: 10,
      spoken: 10
    },
    phrasesPacing: {
      written: 25,
      selection: 10,
      spoken: 20
    },
    exclusiveModules: [
      'Recognition Module',
      'Spoken Module',
      'Written Module'
    ],
    levelRules: {
      LEVEL_1: {
        levelNumber: 1,
        name: '1st Level',
        sku: 'CAMP-1VOCAB',
        scope: 'Words & Phrases',
        scopeShort: 'Words & Phrases',
        taskRepetitions: 14,
        wordsReps: 7,
        phrasesReps: 7,
        numThemes: 4,
        numTopics: 16,
        engine: 'Vocabulary Mastery Modules',
        modules: ['Recognition Module', 'Spoken Module', 'Written Module'],
        taskMinScore: 70,
        examMinScore: 60,
        taskDuration: 11,
        examDuration: 54,
        description: 'Basic Vocabulary · Dual Repetition 7×7 (7 Words + 7 Phrases = 14 reps)'
      },
      LEVEL_2: {
        levelNumber: 2,
        name: '2nd Level',
        sku: 'CAMP-2VOCAB',
        scope: '100% Words Only',
        scopeShort: '100% Words Only',
        taskRepetitions: 7,
        wordsReps: 7,
        phrasesReps: 0,
        numThemes: 4,
        numTopics: 16,
        engine: 'Vocabulary Mastery Modules',
        modules: ['Recognition Module', 'Spoken Module', 'Written Module'],
        taskMinScore: 70,
        examMinScore: 60,
        taskDuration: 11,
        examDuration: 54,
        description: '100% Words Only (Zero-Phrases SSOT per § 2.7.1) · 7 Words Repetitions'
      },
      LEVEL_3: {
        levelNumber: 3,
        name: '3rd Level',
        sku: 'CAMP-3VOCAB',
        scope: 'Words & Phrases',
        scopeShort: 'Words & Phrases',
        taskRepetitions: 14,
        wordsReps: 7,
        phrasesReps: 7,
        numThemes: 4,
        numTopics: 16,
        engine: 'Vocabulary Mastery Modules',
        modules: ['Recognition Module', 'Spoken Module', 'Written Module'],
        taskMinScore: 70,
        examMinScore: 60,
        taskDuration: 11,
        examDuration: 54,
        description: 'Unified Topic Package · 7×7 Repetitive Mastery (7 Words + 7 Phrases = 14 reps)'
      },
      NON_LEVEL: {
        levelNumber: 0,
        name: 'Non-Level',
        sku: 'EVNK-VOCAB, SHRT-VOCAB, TPTC-VOCAB',
        scope: '100% Words Only',
        scopeShort: '100% Words Only',
        taskRepetitions: 7,
        wordsReps: 7,
        phrasesReps: 0,
        numThemes: 4,
        numTopics: 16,
        engine: 'Vocabulary Mastery Modules',
        modules: ['Recognition Module', 'Spoken Module', 'Written Module'],
        taskMinScore: 70,
        examMinScore: 60,
        taskDuration: 11,
        examDuration: 54,
        description: 'Single-Tier Institutional Curriculum · 100% Words Only (Zero Phrases SSOT) · Configurable 1–7 Repetitions'
      }
    },
    dataSource: 'vocabulary_vault',
    dataSourceLabel: 'Vocabulary Vault (Direct DB Link)',
    description: 'One continuous tiered discipline sharing identical systemic rules across all levels: 7×7 repetitive mastery, 4 themes (A–D), and exclusive Vocabulary Vault data binding.'
  },
  BASIC_ENGLISH: {
    discipline: 'BASIC_ENGLISH',
    name: 'Basic English',
    badge: 'Foundation Discipline',
    isTiered: false,
    levels: ['1st Level', 'Foundation'],
    taskRepetitions: 1,
    taskMinScore: 60,
    examMinScore: 60,
    taskDuration: 15,
    examDuration: 40,
    numThemes: 1,
    exclusiveModules: ['BASIC-M1-DESC (Point & Speak Photo Description)'],
    dataSource: 'grammar_demonstratives',
    dataSourceLabel: 'Demonstrative & Adjective Grammar Matrix',
    description: 'Dedicated demonstrative grammar rules (THIS, THAT, THESE, THOSE), adjective ordering, and camera photo capture evaluation engine.'
  },
  SPEAKING: {
    discipline: 'SPEAKING',
    name: 'Speaking',
    badge: 'Oral Performance Discipline',
    isTiered: true,
    levels: ['2nd Level', '3rd Level'],
    taskRepetitions: 1,
    taskMinScore: 60,
    examMinScore: 60,
    taskDuration: 15,
    examDuration: 30,
    numThemes: 2,
    exclusiveModules: ['SPEAK-M5-ORAL (Public Speaking Performance)', 'SPEAK-M7-DIALOGUE (Interactive Conversational)'],
    dataSource: 'speaking_prompts',
    dataSourceLabel: 'Oral Topic Prompts & Speech Rubrics',
    description: 'Oral speech presentation, pronunciation clarity, fluency pacing, and conversational dialogue scoring.'
  },
  STORYTELLING: {
    discipline: 'STORYTELLING',
    name: 'Storytelling',
    badge: 'Narrative Literature Discipline',
    isTiered: true,
    levels: ['1st Level', '2nd Level'],
    taskRepetitions: 1,
    taskMinScore: 60,
    examMinScore: 60,
    taskDuration: 15,
    examDuration: 30,
    numThemes: 2,
    exclusiveModules: ['STORY-M6-NARRATIVE (Story Reading & Comprehension)'],
    dataSource: 'narrative_texts',
    dataSourceLabel: 'Narrative Story Passages & Comprehension Banks',
    description: 'Story narrative comprehension, character dialogue, plot sequencing, and monologue retelling.'
  }
};

export async function fetchDisciplineGovernance(disciplineKey = 'VOCABULARY') {
  const disc = String(disciplineKey || 'VOCABULARY').toUpperCase();
  const defaultObj = DEFAULT_DISCIPLINE_GOVERNANCE[disc] || DEFAULT_DISCIPLINE_GOVERNANCE.VOCABULARY;
  const sb = await getSupabase();
  const cacheKey = `topscore_disc_gov_${disc}`;

  try {
    const local = localStorage.getItem(cacheKey);
    if (local) {
      try { return { ...defaultObj, ...JSON.parse(local) }; } catch (_) {}
    }
  } catch (_) {}

  try {
    const { data, error } = await sb.from('site_settings')
      .select('key, value')
      .eq('key', `discipline_rules_${disc}`)
      .maybeSingle();

    if (!error && data && data.value) {
      const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      const merged = { ...defaultObj, ...parsed };
      try { localStorage.setItem(cacheKey, JSON.stringify(merged)); } catch (_) {}
      return merged;
    }
  } catch (err) {
    console.warn('[fetchDisciplineGovernance] Error:', err?.message || err);
  }

  return defaultObj;
}

export async function saveDisciplineGovernance(disciplineKey, updates = {}) {
  const disc = String(disciplineKey || 'VOCABULARY').toUpperCase();
  const defaultObj = DEFAULT_DISCIPLINE_GOVERNANCE[disc] || DEFAULT_DISCIPLINE_GOVERNANCE.VOCABULARY;
  const merged = { ...defaultObj, ...updates, discipline: disc };
  const payloadStr = JSON.stringify(merged);
  const sb = await getSupabase();

  try {
    localStorage.setItem(`topscore_disc_gov_${disc}`, payloadStr);
  } catch (_) {}

  try {
    const { error } = await sb.from('site_settings').upsert({
      key: `discipline_rules_${disc}`,
      value: payloadStr,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });

    if (error) throw error;
  } catch (err) {
    console.warn('[saveDisciplineGovernance] Error:', err?.message || err);
    throw err;
  }

  return { success: true, data: merged };
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
  const isExplicitSelectionBank =
    String(test.test_subtype || '').toUpperCase() === 'BASIC_ENGLISH_SELECTION_EXAM' ||
    String(test.shell_code || '').toUpperCase().includes('1BSC-B') ||
    (Array.isArray(test.payload?.questions) && test.payload.questions.length > 0 && !test.payload?.is_dynamic_shell);

  const isDescriptionExam = !isExplicitSelectionBank && (
    String(test.answer_type || '').toLowerCase() === 'description' ||
    String(test.payload?.answer_type || '').toLowerCase() === 'description' ||
    String(test.payload?.module || '').toLowerCase() === 'description' ||
    String(test.payload?.module_type || '').toUpperCase() === 'POINT_AND_SPEAK' ||
    String(test.shell_code || '').toUpperCase().includes('1BSC-A') ||
    String(test.title || '').toLowerCase().includes('tell me what you see')
  );

  if (isDescriptionExam) {
    const dist = test.payload?.demonstrative_distribution || { this: 5, that: 5, these: 5, those: 5 };
    const promptsMap = {
      this: 'Take a photo of a nearby singular object and describe it using "THIS".',
      that: 'Take a photo of a distant singular object and describe it using "THAT".',
      these: 'Take a photo of nearby plural objects and describe them using "THESE".',
      those: 'Take a photo of distant plural objects and describe them using "THOSE".'
    };
    const pool = [];
    ['this', 'that', 'these', 'those'].forEach(demo => {
      const cnt = Math.max(0, Number(dist[demo] ?? 5));
      for (let i = 0; i < cnt; i++) {
        pool.push({
          question_id: null,
          question_text_snapshot: promptsMap[demo],
          accepted_answers_snapshot: [demo],
          options_snapshot: [],
          target_demonstrative: demo,
          topic_snapshot: 'Point & Speak',
          theme_snapshot: 'Tell Me What You See',
          theme_code: test.payload?.theme_code || 'A',
          category_snapshot: 'description',
          word_type_snapshot: demo.toUpperCase(),
          answer_type: 'description',
          module: 'description'
        });
      }
    });
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.map((item, idx) => ({ ...item, display_order: idx + 1 }));
  }

  if (test.payload && test.payload.is_dynamic_shell) {
    const themeCode = test.payload.theme_code;
    const topicCode = test.payload.topic_code;
    const themes = test.payload.themes;
    const titleParts = (test.title || '').split(' - ');
    const titleTopic = titleParts.length > 1 ? titleParts[1].trim() : null;

    let levelNum = 1;
    if (test.level_id) {
      const { data: levelRec } = await sb.from('levels').select('level_number').eq('id', test.level_id).single();
      if (levelRec && levelRec.level_number != null) levelNum = levelRec.level_number;
    }

    const isThemeTest = (test.category === 'EXAM' || test.category === 'TEST' || String(test.test_type).toLowerCase() === 'exam' || (test.shell_code && (test.shell_code.includes('-EXAM') || test.shell_code.includes('-TEST'))) || test.test_subtype === 'VOCAB_EXAM' || test.test_subtype === 'PHRASE_EXAM' || test.test_subtype === 'VOCAB_TEST' || test.test_subtype === 'PHRASE_TEST') && !topicCode;
    let testProgramId = test.program_id || test.programId;
    if (!testProgramId && test.class_id) {
      try {
        const { data: cRec } = await sb.from('classes').select('program_id').eq('id', test.class_id).maybeSingle();
        if (cRec?.program_id) testProgramId = cRec.program_id;
      } catch (_) {}
    }

    // High-speed cached vault retrieval (0ms & 0 egress fast-path)
    let vaultData = null;
    try {
      const cachedVault = await fetchVaultWords({ targetLevel: levelNum });
      if (cachedVault && cachedVault.length > 0) {
        let filtered = cachedVault;
        if (topicCode) {
          if (themeCode) filtered = filtered.filter(w => String(w.theme_code || '').toUpperCase() === String(themeCode).toUpperCase());
          const candidateCodes = [
            String(topicCode).toUpperCase(),
            (/^[0-9]+$/.test(String(topicCode)) && themeCode) ? `${String(themeCode).toUpperCase()}${topicCode}` : null,
            String(topicCode).replace(/^[A-Za-z]/, ''),
            (levelNum && themeCode && /^[0-9]+$/.test(String(topicCode))) ? `${levelNum}${String(themeCode).toUpperCase()}${topicCode}` : null,
            (levelNum && themeCode) ? `${levelNum}${String(themeCode).toUpperCase()}${String(topicCode).replace(/^[A-Za-z]/, '')}` : null
          ].filter(Boolean);
          filtered = filtered.filter(w => candidateCodes.includes(String(w.topic_code || '').toUpperCase()));
        } else if (themes && Array.isArray(themes) && themes.length > 0 && levelNum !== 0) {
          filtered = filtered.filter(w => themes.includes(w.theme_code));
        } else if (isThemeTest && themeCode) {
          if (levelNum === 0) {
            filtered = filtered.filter(w => String(w.theme_code || '').toUpperCase() === String(themeCode).toUpperCase());
          } else {
            const allThemes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
            const idx = allThemes.indexOf(String(themeCode).toUpperCase());
            if (idx !== -1) {
              const targetThemes = allThemes.slice(0, idx + 1);
              filtered = filtered.filter(w => targetThemes.includes(String(w.theme_code || '').toUpperCase()));
            } else {
              filtered = filtered.filter(w => String(w.theme_code || '').toUpperCase() === String(themeCode).toUpperCase());
            }
          }
        } else if (themeCode) {
          filtered = filtered.filter(w => String(w.theme_code || '').toUpperCase() === String(themeCode).toUpperCase());
        }
        if (filtered.length > 0) {
          vaultData = filtered;
        }
      }
    } catch (_) {}

    // Resilient vocabulary query fallback: try with category column first, fallback without category column
    if (!vaultData || vaultData.length === 0) {
      try {
        let query = sb.from('vocabulary_vault')
        .select('id, english, indonesian, word_type, topic, topic_code, theme, theme_code, target_level, category')
        .is('deleted_at', null)
        .eq('target_level', levelNum)
        .range(0, 4999);
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
      } else if (themes && Array.isArray(themes) && themes.length > 0 && levelNum !== 0) {
        query = query.in('theme_code', themes);
      } else if (isThemeTest && themeCode) {
        if (levelNum === 0) {
          query = query.eq('theme_code', themeCode);
        } else {
          const allThemes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
          const idx = allThemes.indexOf(String(themeCode).toUpperCase());
          if (idx !== -1) {
            const targetThemes = allThemes.slice(0, idx + 1);
            query = query.in('theme_code', targetThemes);
          } else {
            query = query.eq('theme_code', themeCode);
          }
        }
      } else if (themeCode) {
        query = query.eq('theme_code', themeCode);
      }
      const res = await query;
      if (!res.error && res.data && res.data.length > 0) {
        vaultData = res.data;
      }
    } catch (_) {}
  }

    if (!vaultData || vaultData.length === 0) {
      // Fallback query without category column (resilient across DB schemas)
      let queryNoCat = sb.from('vocabulary_vault')
        .select('id, english, indonesian, word_type, topic, topic_code, theme, theme_code, target_level')
        .is('deleted_at', null)
        .eq('target_level', levelNum)
        .range(0, 4999);
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
      } else if (themes && Array.isArray(themes) && themes.length > 0 && levelNum !== 0) {
        queryNoCat = queryNoCat.in('theme_code', themes);
      } else if (isThemeTest && themeCode) {
        if (levelNum === 0) {
          queryNoCat = queryNoCat.eq('theme_code', themeCode);
        } else {
          const allThemes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
          const idx = allThemes.indexOf(String(themeCode).toUpperCase());
          if (idx !== -1) {
            queryNoCat = queryNoCat.in('theme_code', allThemes.slice(0, idx + 1));
          } else {
            queryNoCat = queryNoCat.eq('theme_code', themeCode);
          }
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

    // Safety clamp: strictly respect configured total questions bounds for single-category tests (never truncate tail Phrases on Unified dynamic exams)
    const maxTargetQuestions = test.payload?.total_questions || test.total_questions;
    if (!isUnified && maxTargetQuestions && Number(maxTargetQuestions) > 0 && vaultWords.length > Number(maxTargetQuestions)) {
      vaultWords = vaultWords.slice(0, Number(maxTargetQuestions));
    }

    if (vaultWords && vaultWords.length > 0) {
      let allEnglishAnswers = [];
      let typeDistractorPools = {};
      const sessAnsweringMode = test.payload?.test_session?.answering_mode;
      const sessModes = test.payload?.test_session?.answering_modes;

      let classTestSettings = null;
      if (test.class_id) {
        try {
          classTestSettings = await fetchClassTestSettings(test.class_id);
        } catch (_) {}
      }
      const isExamShell = isWeeklyExam(test) || String(test.test_type || '').toLowerCase() === 'exam';
      const payloadWordsAns = test.payload?.words_answer_type || test.payload?.wordsAnswerType;
      const payloadPhrasesAns = test.payload?.phrases_answer_type || test.payload?.phrasesAnswerType;
      const settingsWordsAns = isExamShell ? classTestSettings?.wordsExamAnswer : classTestSettings?.wordsTaskAnswer;
      const settingsPhrasesAns = isExamShell ? classTestSettings?.phrasesExamAnswer : classTestSettings?.phrasesTaskAnswer;

      const baseAnsType = test.answer_type || test.payload?.answer_type || (test.test_subtype === 'PHRASE_TEST' ? 'selection' : 'spoken');
      const wordsAnsType = sessModes?.words || sessAnsweringMode || payloadWordsAns || settingsWordsAns || baseAnsType;
      const phrasesAnsType = sessModes?.phrases || sessAnsweringMode || payloadPhrasesAns || settingsPhrasesAns || (isUnified ? (baseAnsType === 'written' ? 'selection' : baseAnsType) : baseAnsType);

      const isWordsSelection = wordsAnsType.startsWith('dropdown') || wordsAnsType === 'multiple_choice' || wordsAnsType === 'selection';
      const isPhrasesSelection = phrasesAnsType.startsWith('dropdown') || phrasesAnsType === 'multiple_choice' || phrasesAnsType === 'selection';
      const needsDistractors = isWordsSelection || isPhrasesSelection;

      const buildBigrams = (str) => {
        const s = String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const set = new Set();
        for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
        return set;
      };
      const diceSim = (setA, setB) => {
        if (!setA.size || !setB.size) return 0;
        let inter = 0;
        for (const bg of setA) if (setB.has(bg)) inter++;
        return (2 * inter) / (setA.size + setB.size);
      };
      const buildIdWords = (str) => new Set(
        String(str || '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 3)
      );

      let preparedDistractorPool = [];
      if (needsDistractors) {
        let allDataQuery = sb.from('vocabulary_vault').select('english, indonesian, word_type, category, topic_code, theme_code').is('deleted_at', null);
        const { data: allData } = await allDataQuery;
        if (allData) {
          const seenEn = new Set();
          allData.forEach(r => {
            const eng = (r.english || '').split('/')[0].trim();
            if (!eng) return;
            const enLower = eng.toLowerCase();
            if (seenEn.has(enLower)) return;
            seenEn.add(enLower);
            const wt = (r.word_type || 'Vocab').toLowerCase();
            const ind = String(r.indonesian || '').trim();
            preparedDistractorPool.push({
              eng,
              enLower,
              wt,
              topicCode: String(r.topic_code || '').toUpperCase(),
              themeCode: String(r.theme_code || '').toUpperCase(),
              enBigrams: buildBigrams(enLower),
              idBigrams: buildBigrams(ind),
              idWords: buildIdWords(ind)
            });
            allEnglishAnswers.push(eng);
            if (!typeDistractorPools[wt]) typeDistractorPools[wt] = [];
            typeDistractorPools[wt].push(eng);
          });
        }
      }

      const selectSimilarDistractors = (vw, accepted, numDistractors) => {
        const acceptedSet = new Set(accepted.map(a => a.toLowerCase()));
        const targetEn = String(accepted[0] || '').toLowerCase();
        const targetInd = String(vw.indonesian || '').trim();
        const targetWt = String(vw.word_type || 'Vocab').toLowerCase();
        const targetTopic = String(vw.topic_code || '').toUpperCase();
        const targetTheme = String(vw.theme_code || '').toUpperCase();
        const targetEnBg = buildBigrams(targetEn);
        const targetIdBg = buildBigrams(targetInd);
        const targetIdWords = buildIdWords(targetInd);

        const scored = [];
        for (const cand of preparedDistractorPool) {
          if (acceptedSet.has(cand.enLower)) continue;
          let score = 0;
          if (cand.wt === targetWt) score += 40;
          if (targetTopic && cand.topicCode === targetTopic) score += 30;
          else if (targetTheme && cand.themeCode === targetTheme) score += 15;

          // Word form similarity (prefix, suffix, length, character bigrams)
          if (targetEn[0] && cand.enLower[0] === targetEn[0]) score += 12;
          if (targetEn.length >= 2 && cand.enLower.slice(0, 2) === targetEn.slice(0, 2)) score += 10;
          if (targetEn.length >= 2 && cand.enLower.slice(-2) === targetEn.slice(-2)) score += 8;
          score += Math.max(0, 10 - Math.abs(cand.enLower.length - targetEn.length) * 2);
          score += diceSim(targetEnBg, cand.enBigrams) * 25;

          // Meaning (Indonesian) similarity (shared words & character bigrams)
          let sharedWords = 0;
          for (const w of targetIdWords) if (cand.idWords.has(w)) sharedWords++;
          score += Math.min(35, sharedWords * 20);
          score += diceSim(targetIdBg, cand.idBigrams) * 20;

          // Slight tie-breaker jitter so identical-score candidates vary
          score += Math.random() * 4;
          scored.push({ eng: cand.eng, score });
        }
        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, numDistractors).map(x => x.eng);
      };

      questions = vaultWords.map((vw, idx) => {
        const accepted = vw.english ? vw.english.split('/').map(s => s.trim()) : [];
        const correctAns = accepted[0] || 'N/A';
        let optionsSnapshot = [];

        const isPhraseItem = vw.test_section === 'phrases' ||
                             vw.section_id === 'phrases' ||
                             vw.category === 'phrases' ||
                             /phrase/i.test(vw.section_label || '') ||
                             ['expression', 'idiom', 'proverb', 'phrase'].includes((vw.word_type || '').toLowerCase());
        const itemAnsType = isPhraseItem ? phrasesAnsType : wordsAnsType;

        const isItemSelection = itemAnsType.startsWith('dropdown') || itemAnsType === 'multiple_choice' || itemAnsType === 'selection';
        if (isItemSelection) {
          const numDistractors = (itemAnsType === 'dropdown_10') ? 9 : 4;
          const distractors = preparedDistractorPool.length > 0
            ? selectSimilarDistractors(vw, accepted, numDistractors)
            : [];
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
          category_snapshot: vw.category || (isPhraseItem ? 'phrases' : 'words'),
          word_type_snapshot: vw.word_type,
          display_order: idx + 1,
          answer_type: itemAnsType,
          test_section: vw.test_section || (isPhraseItem ? 'phrases' : 'words'),
          section_label: vw.section_label || (isPhraseItem ? 'Part 2: Phrases' : 'Part 1: Words')
        };
      });
    }
  } else {
    questions = test.payload?.questions || [];
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

  // 1. Ambil detail test & existing in_progress attempt in parallel (Zero-Waterfall Fast Path)
  const [testRes, existingAttemptsRes] = await Promise.all([
    sb.from('tests')
      .select('id, title, shell_code, status, deleted_at, test_subtype, test_type, answer_type, class_id, level_id, display_order, working_duration_minutes, schedule_mode, minimum_required_score, prerequisite_test_id, payload, module_id, question_order, classes(name), levels(name, level_number)')
      .eq('id', testId)
      .single(),
    sb.from('attempts')
      .select('id, student_id, test_id, status, started_at, expires_at, attempt_number, is_remedial_unlocked, created_at')
      .eq('student_id', studentId)
      .eq('test_id', testId)
      .in('status', ['in_progress'])
      .order('created_at', { ascending: false })
  ]);

  const asmData = testRes.data;
  if (testRes.error || !asmData) throw new Error('Test not found.');

  // Guard: Strict status and soft-delete check in client DB fallback (never allow soft-deleted or DRAFT attempts)
  const currentStatus = String(asmData.status || '').toUpperCase();
  if (asmData.deleted_at || (currentStatus !== 'PUBLISHED' && currentStatus !== 'ACTIVE')) {
    const pubErr = new Error('This test is unavailable or is in draft mode.');
    pubErr.code = 'TEST_UNAVAILABLE';
    pubErr.status = 403;
    throw pubErr;
  }

  const existingAttempts = existingAttemptsRes.data || [];
  let attempt = existingAttempts[0];
  const isResumed = !!attempt;
  let activeSession = null;

  const { data: currentStudentInfo } = await sb.from('students')
    .select('is_active, program_status, batch_id, levels(level_number)')
    .eq('id', studentId)
    .single();
  if (currentStudentInfo && (currentStudentInfo.is_active === false || (currentStudentInfo.program_status || '').toUpperCase() === 'INACTIVE')) {
    throw new Error('This student account is inactive and cannot take tests.');
  }
  const isAlumniStudent = (currentStudentInfo?.program_status || '').toUpperCase() === 'ALUMNI' || currentStudentInfo?.levels?.level_number === 99;

  // Formal Exam determination & schedule mode (Must be evaluated at root of startTest so both new & resumed attempts can access)
  const isExamSubtype = (asmData.test_subtype || '').toUpperCase().includes('TEST') || (asmData.test_subtype || '').toUpperCase().includes('EXAM');
  const isExamShell = (asmData.shell_code || '').toUpperCase().endsWith('-TEST') || (asmData.shell_code || '').toUpperCase().endsWith('-EXAM');
  const isExamTitle = ((asmData.title || '').toLowerCase().includes('test') || (asmData.title || '').toLowerCase().includes('exam')) && !(asmData.title || '').toLowerCase().includes('task');
  const isFormalExam = ((asmData.test_type || '').toLowerCase() === 'exam' || isExamSubtype || isExamShell || isExamTitle) &&
                       !(asmData.shell_code || '').toUpperCase().includes('-TASK') &&
                       !(asmData.test_subtype || '').toUpperCase().includes('TASK') &&
                       !(asmData.title || '').toLowerCase().includes('task') &&
                       !(asmData.test_type || '').toLowerCase().includes('task') &&
    !(asmData.test_type || '').toLowerCase().includes('quiz');
  const isFlexible = (asmData.schedule_mode || asmData.payload?.schedule_mode) === 'flexible';

  // Prerequisite & Whitelist gates only apply when initiating a NEW attempt for non-alumni (Alumni has Universal Lifetime Access)
  if (!attempt && !isAlumniStudent) {
    const isPretestFallback = isPretest(asmData);
    const isQuizFallback = !isPretestFallback && isVocabQuiz(asmData);
    const isStandaloneTryout = asmData.payload?.is_standalone_tryout === true ||
                               asmData.payload?.no_prerequisites === true ||
                               isPretestFallback ||
                               isQuizFallback;
    if (isPretestFallback) {
      const { count: preCount } = await sb.from('attempts')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .eq('test_id', asmData.id)
        .in('status', ['submitted', 'auto_submitted', 'evaluated', 'SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED']);
      if ((preCount || 0) >= 1) {
        const pErr = new Error('Pre-test can only be taken once (retake is not allowed).');
        pErr.code = 'MAX_ATTEMPTS_REACHED';
        throw pErr;
      }
    }
    const prereqId = asmData.prerequisite_test_id || asmData.prerequisite_id;
    if (prereqId && !isStandaloneTryout) {
    const [prereqAttRes, prereqTestRes] = await Promise.all([
      sb.from('attempts')
        .select('score, percentage, effective_score, status, is_forgiven, is_remedial_unlocked, is_remedial, total_questions, correct_count, forgiven_reason')
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
    const { wordsTarget, phrasesTarget, maxTarget: targetReps, label: repLabel } = resolveTaskRepTargets(prereqTest, testSettings);
    const defaultTaskMin = Number(testSettings?.taskMinScore) || 50;
    const defaultExamMin = Number(testSettings?.examMinScore) || 60;

    const isPrereqExam = prereqTest ? isWeeklyExam(prereqTest) : false;
    const isPrereqUnified = resolveTestCapabilities(prereqTest, null, testSettings).isUnified;

    // Prerequisite passing threshold:
    // Must evaluate the prerequisite test's threshold (prereqTest), NOT the current test's threshold (asmData).
    // For exams, the passing threshold is 60% (Grade C KKM).
    const explicitOverride = asmData.payload?.prerequisite_min_score ? parseFloat(asmData.payload.prerequisite_min_score) : null;
    const prereqMin = (prereqTest?.minimum_required_score && parseFloat(prereqTest.minimum_required_score) > 0)
      ? parseFloat(prereqTest.minimum_required_score)
      : (prereqTest?.payload?.min_score ? parseFloat(prereqTest.payload.min_score) : (isPrereqExam ? defaultExamMin : defaultTaskMin));
    const reqScore = explicitOverride !== null ? explicitOverride : prereqMin;

    let passCount = 0;
    let wordsPasses = 0;
    let phrasesPasses = 0;

    if (isPrereqUnified && !isPrereqExam) {
      prereqAttempts.forEach(a => {
        const fr = String(a.forgiven_reason || '');
        const mMatch = fr.match(/MANUAL_REPS:?\s*(\d+)(?:\/(\d+))?(?:\s*(WORDS|PHRASES))?/i);
        if (mMatch) {
          const rawM = parseInt(mMatch[1], 10);
          const comp = (mMatch[3] || '').toUpperCase();
          if (comp === 'PHRASES') phrasesPasses = Math.max(phrasesPasses, Math.min(phrasesTarget, rawM));
          else if (comp === 'WORDS') wordsPasses = Math.max(wordsPasses, Math.min(wordsTarget, rawM));
          else {
            wordsPasses = Math.max(wordsPasses, Math.min(wordsTarget, rawM));
            phrasesPasses = Math.max(phrasesPasses, Math.min(phrasesTarget, rawM));
          }
        }
        if (a.is_forgiven) {
          wordsPasses = Math.max(wordsPasses, wordsTarget);
          phrasesPasses = Math.max(phrasesPasses, phrasesTarget);
          return;
        }
        const pct = a.effective_score != null ? Number(a.effective_score) : Number(a.percentage || a.score || 0);
        const isRem = Boolean(a.is_remedial_unlocked || a.is_remedial);
        if (pct >= reqScore || (isRem && pct >= 60)) {
          const tQ = Number(a.total_questions || 0);
          const cCount = Number(a.correct_count || a.score || 0);
          const isPhrases = (tQ > 0 && tQ <= 20) || (cCount > 0 && cCount <= 10 && tQ <= 20) || /PHRASES/i.test(fr);
          if (isPhrases) phrasesPasses++;
          else wordsPasses++;
        }
      });
      passCount = (wordsPasses >= wordsTarget && phrasesPasses >= phrasesTarget) ? 1 : 0;
    } else {
      prereqAttempts.forEach(a => {
        const fr = String(a.forgiven_reason || '');
        const mMatch = fr.match(/MANUAL_REPS:?\s*(\d+)/i);
        if (mMatch) {
          passCount = Math.max(passCount, Math.min(targetReps, parseInt(mMatch[1], 10)));
        }
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
    }

    const prereqMet = isPrereqExam
      ? (passCount >= 1)
      : (isPrereqUnified ? (wordsPasses >= wordsTarget && phrasesPasses >= phrasesTarget) : (passCount >= targetReps));
    if (!prereqMet) {
      const pErr = isPrereqExam
        ? new Error(`Prerequisite not completed. You must pass "${prereqTest?.title || 'the prerequisite exam'}" with at least ${reqScore}% before starting this test.`)
        : (isPrereqUnified
            ? new Error(`Prerequisite not completed. You must achieve ${repLabel} Repetitive Mastery on both Words (${wordsPasses}/${wordsTarget}) and Phrases (${phrasesPasses}/${phrasesTarget}) with at least ${reqScore}% on "${prereqTest?.title || 'the prerequisite task'}" before starting this test.`)
            : new Error(`Prerequisite not completed. You must achieve Repetitive Mastery (${passCount}/${targetReps} passes with at least ${reqScore}%) on "${prereqTest?.title || 'the prerequisite task'}" before starting this test.`));
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
        .eq('status', 'PUBLISHED')
        .neq('id', asmData.id)
        .is('deleted_at', null);

      const themeTasks = (siblingTasks || []).filter(t => {
        if (isWeeklyExam(t)) return false;
        const tc = t.payload?.theme_code || (t.shell_code ? t.shell_code.replace(/^[0-9]+/, '').charAt(0) : '');
        return String(tc).toUpperCase() === String(themeCode).toUpperCase();
      });

      if (themeTasks.length > 0) {
        const testSettings = await fetchClassTestSettings(asmData.class_id);
        const taskMinScore = Number(testSettings?.taskMinScore) || 50;
        const taskMap = Object.fromEntries(themeTasks.map(t => [t.id, t]));

        const taskIds = themeTasks.map(t => t.id);
        const { data: taskAttempts } = await sb.from('attempts')
          .select('test_id, percentage, effective_score, status, is_forgiven, total_questions, correct_count, score, forgiven_reason')
          .eq('student_id', studentId)
          .in('test_id', taskIds)
          .in('status', ['submitted', 'auto_submitted', 'evaluated', 'SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED']);

        const passCountByTask = {};
        const wordsPassByTask = {};
        const phrasesPassByTask = {};
        (taskAttempts || []).forEach(att => {
          const tid = att.test_id;
          const tObj = taskMap[tid];
          const { wordsTarget: wT, phrasesTarget: pT, maxTarget: mT, isUnified: isUni } = resolveTestCapabilities(tObj, null, testSettings);
          if (att.is_forgiven) {
            passCountByTask[tid] = Math.max(passCountByTask[tid] || 0, mT);
            wordsPassByTask[tid] = Math.max(wordsPassByTask[tid] || 0, wT);
            phrasesPassByTask[tid] = Math.max(phrasesPassByTask[tid] || 0, pT);
          } else {
            const pct = att.effective_score != null ? Number(att.effective_score) : Number(att.percentage || 0);
            const minReq = Number(tObj?.minimum_required_score || tObj?.payload?.min_score || taskMinScore);
            if (pct >= minReq) {
              if (isUni) {
                const fr = String(att.forgiven_reason || '');
                const tQ = Number(att.total_questions || 0);
                const cCount = Number(att.correct_count || att.score || 0);
                const isPhrases = (tQ > 0 && tQ <= 20) || (cCount > 0 && cCount <= 10 && tQ <= 20) || /PHRASES/i.test(fr);
                if (isPhrases) phrasesPassByTask[tid] = (phrasesPassByTask[tid] || 0) + 1;
                else wordsPassByTask[tid] = (wordsPassByTask[tid] || 0) + 1;
              } else {
                passCountByTask[tid] = (passCountByTask[tid] || 0) + 1;
              }
            }
          }
        });

        const unmasteredTask = themeTasks.find(t => {
          const { wordsTarget: wT, phrasesTarget: pT, maxTarget: mT, isUnified: isUni } = resolveTestCapabilities(t, null, testSettings);
          if (isUni) {
            return (wordsPassByTask[t.id] || 0) < wT || (phrasesPassByTask[t.id] || 0) < pT;
          }
          return (passCountByTask[t.id] || 0) < mT;
        });
        if (unmasteredTask) {
          const { label: unmLabel } = resolveTaskRepTargets(unmasteredTask, testSettings);
          const mErr = new Error(`Prerequisite not completed. You must achieve Repetitive Mastery (${unmLabel} passes with at least ${taskMinScore}%) on all Theme Tasks before taking the Exam.`);
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
      .eq('status', 'PUBLISHED')
      .is('deleted_at', null)
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
      .eq('status', 'PUBLISHED')
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
      const rawTargetReps = Number(testSettings?.taskRepetitions) || 7;
      const targetReps = (rawTargetReps >= 14) ? Math.round(rawTargetReps / 2) : rawTargetReps;
      const priorTaskIds = filteredPriorTasks.map(t => t.id);
      const { data: priorTaskAttempts } = await sb.from('attempts')
        .select('test_id, percentage, effective_score, status, is_forgiven, total_questions, correct_count, score, forgiven_reason')
        .eq('student_id', studentId)
        .in('test_id', priorTaskIds)
        .in('status', ['submitted', 'auto_submitted', 'evaluated', 'SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED']);

      const taskMap = Object.fromEntries(filteredPriorTasks.map(t => [t.id, t]));
      const passCountByTask = {};
      const wordsPassByTask = {};
      const phrasesPassByTask = {};

      (priorTaskAttempts || []).forEach(att => {
        const tid = att.test_id;
        const tObj = taskMap[tid];
        const isUni = resolveTestCapabilities(tObj, null, testSettings).isUnified;
        const fr = String(att.forgiven_reason || '');
        const mMatch = fr.match(/MANUAL_REPS:?\s*(\d+)(?:\/(\d+))?(?:\s*(WORDS|PHRASES))?/i);

        if (mMatch) {
          const reps = Math.min(targetReps, parseInt(mMatch[1], 10));
          const comp = (mMatch[3] || '').toUpperCase();
          if (comp === 'PHRASES') phrasesPassByTask[tid] = Math.max(phrasesPassByTask[tid] || 0, reps);
          else if (comp === 'WORDS') wordsPassByTask[tid] = Math.max(wordsPassByTask[tid] || 0, reps);
          else {
            wordsPassByTask[tid] = Math.max(wordsPassByTask[tid] || 0, reps);
            phrasesPassByTask[tid] = Math.max(phrasesPassByTask[tid] || 0, reps);
          }
          passCountByTask[tid] = Math.max(passCountByTask[tid] || 0, reps);
        }

        if (att.is_forgiven) {
          passCountByTask[tid] = Math.max(passCountByTask[tid] || 0, targetReps);
          wordsPassByTask[tid] = Math.max(wordsPassByTask[tid] || 0, targetReps);
          phrasesPassByTask[tid] = Math.max(phrasesPassByTask[tid] || 0, targetReps);
          return;
        }

        const pct = att.effective_score != null ? Number(att.effective_score) : Number(att.percentage || 0);
        const minReq = Number(taskMap[tid]?.minimum_required_score || taskMap[tid]?.payload?.min_score || 50);
        if (pct >= minReq) {
          if (isUni) {
            const tQ = Number(att.total_questions || 0);
            const cCount = Number(att.correct_count || att.score || 0);
            const isPhrases = (tQ > 0 && tQ <= 20) || (cCount > 0 && cCount <= 10 && tQ <= 20) || /PHRASES/i.test(fr);
            if (isPhrases) phrasesPassByTask[tid] = (phrasesPassByTask[tid] || 0) + 1;
            else wordsPassByTask[tid] = (wordsPassByTask[tid] || 0) + 1;
          } else {
            passCountByTask[tid] = (passCountByTask[tid] || 0) + 1;
          }
        }
      });

      const unmasteredTask = filteredPriorTasks.find(t => {
        const { wordsTarget: wT, phrasesTarget: pT, maxTarget: mT, isUnified: isUni } = resolveTestCapabilities(t, null, testSettings);
        if (isUni) {
          return (wordsPassByTask[t.id] || 0) < wT || (phrasesPassByTask[t.id] || 0) < pT;
        }
        return (passCountByTask[t.id] || 0) < mT;
      });

      if (unmasteredTask) {
        const { wordsTarget: uW, phrasesTarget: uP, label: uLabel } = resolveTaskRepTargets(unmasteredTask, testSettings);
        const unmasteredMin = unmasteredTask.minimum_required_score || unmasteredTask.payload?.min_score || 50;
        const topErr = new Error(`Prerequisite not completed. You must achieve ${uLabel} Repetitive Mastery on Words (${uW}) and Phrases (${uP}) with at least ${unmasteredMin}% on Topic ${currentThemeFallback}${priorTopicNum} before starting Topic ${cleanTopicNumFallback}.`);
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

  // Guard: Strict Exam Session Access & Attendance Whitelist (ALL formal exams require active Tutor-opened session, even for Alumni or flexible mode)
  const isStandaloneExamExempt = isPretest(asmData) || isVocabQuiz(asmData) || asmData.payload?.is_standalone_tryout === true;
  if (isFormalExam && !isStandaloneExamExempt) {
    const accessCheck = await checkStudentTestAccess(studentId, testId);
    if (!accessCheck.allowed) {
      const err = new Error(accessCheck.message);
      err.code = accessCheck.reason;
      err.status = 403;
      throw err;
    }
    activeSession = accessCheck.session;
  }
  } // End if (!attempt && !isAlumniStudent)

  // Enforce strict session lock on ALL formal exams (both new & resumed attempts, and even for Alumni or missing test_session)
  const isStandaloneExamExemptOuter = isPretest(asmData) || isVocabQuiz(asmData) || asmData.payload?.is_standalone_tryout === true;
  if (isFormalExam && !isStandaloneExamExemptOuter) {
    const liveSess = asmData.payload?.test_session;
    const isSessOpen = liveSess && liveSess.status === 'UNLOCKED' && (!liveSess.auto_close_at || new Date(liveSess.auto_close_at) > new Date());
    const allowedIds = Array.isArray(liveSess?.allowed_student_ids) ? liveSess.allowed_student_ids : [];
    const isWhitelisted = isSessOpen && (allowedIds.length === 0 || allowedIds.includes(studentId));
    if (!isWhitelisted) {
      const lockErr = new Error('This exam session has not been opened by the Tutor or has already closed. Access is locked.');
      lockErr.code = 'SESSION_LOCKED';
      lockErr.status = 403;
      throw lockErr;
    }
  }

  const test = {
    ...asmData,
    answer_type: asmData.answer_type || asmData.payload?.test_session?.answering_mode || asmData.payload?.answer_type,
    name: asmData.title || asmData.name,
    question_order: asmData.question_order || asmData.payload?.question_order || 'random',
    time_limit_minutes: asmData.working_duration_minutes || asmData.time_limit_minutes || 60
  };

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
    const { data: pastRemedialAtt } = await sb.from('attempts')
      .select('id, is_remedial_unlocked, is_remedial')
      .eq('student_id', studentId)
      .eq('test_id', testId)
      .or('is_remedial_unlocked.eq.true,is_remedial.eq.true')
      .limit(1);

    const isRemedialSession = Boolean(
      activeSession?.is_remedial ||
      (Array.isArray(activeSession?.remedial_student_ids) && activeSession.remedial_student_ids.includes(studentId)) ||
      (pastRemedialAtt && pastRemedialAtt.length > 0)
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
        is_remedial_unlocked: isRemedialSession,
        is_remedial: isRemedialSession
      })
      .select()
      .single();

    if (createErr) throw createErr;
    attempt = newAttempt;
  }

  // 3. Ambil jawaban attempt atau self-heal jika attempt belum memiliki butir soal
  let { data: answers } = await sb.from('attempt_answers')
    .select('id, attempt_id, question_id, question_snapshot, topic_snapshot, question_type_snapshot, accepted_answers_snapshot, correct_answer_snapshot, student_answer, score')
    .eq('attempt_id', attempt.id);

  const isUuid = (val) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
  const mapQuestionsToAnswerRows = (qList, startOrderOffset = 0) => qList.map((sq, idx) => ({
    attempt_id: attempt.id,
    question_id: isUuid(sq.question_id) ? sq.question_id : null,
    question_snapshot: {
      item_code: sq.item_code || sq.question_id || null,
      question_text: sq.question_text_snapshot || sq.question_text || sq.prompt,
      word_type: sq.word_type_snapshot || sq.word_type,
      topic: sq.topic_snapshot || sq.topic,
      theme: sq.theme_snapshot || sq.theme || test.payload?.theme_code || "General",
      theme_code: sq.theme_code || test.payload?.theme_code,
      category: sq.category_snapshot || sq.category || test.payload?.category || 'vocab',
      display_order: startOrderOffset > 0 ? (startOrderOffset + idx + 1) : (sq.display_order ?? (idx + 1)),
      answer_type: sq.answer_type || test.answer_type || test.payload?.answer_type || 'spoken',
      options_snapshot: sq.options_snapshot || [],
      test_section: sq.test_section || null,
      section_label: sq.section_label || null,
      section_id: sq.test_section || 'default',
      target_demonstrative: sq.target_demonstrative || null,
      module: sq.module || test.payload?.module || (test.module_type === 'POINT_AND_SPEAK' ? 'description' : null),
      dynamic_type: sq.dynamic_type || null,
      is_bonus_round: Boolean(sq.is_bonus_round),
      fixed_option_order: Boolean(sq.fixed_option_order)
    },
    topic_snapshot: sq.topic_snapshot || sq.topic,
    question_type_snapshot: sq.word_type_snapshot || sq.word_type,
    accepted_answers_snapshot: sq.accepted_answers_snapshot || sq.accepted_answers,
    correct_answer_snapshot: Array.isArray(sq.accepted_answers_snapshot || sq.accepted_answers) ? (sq.accepted_answers_snapshot || sq.accepted_answers).join('; ') : String(sq.accepted_answers_snapshot || sq.accepted_answers || ''),
    student_answer: null,
    score: 0
  }));

  if (!answers || answers.length === 0) {
    const questions = await generateTestQuestions(sb, test);
    if (questions && questions.length > 0) {
      // Dynamic Classmate Name Hydration ({MEMBER_1}, {MEMBER_2}) per student & per question
      const needsMemberHydration = questions.some(sq => {
        const qt = String(sq.question_text_snapshot || sq.question_text || sq.prompt || '');
        return qt.includes('{MEMBER_1}') || qt.includes('{MEMBER_2}');
      });
      if (needsMemberHydration) {
        let memberPool = [];
        try {
          let memQuery = sb.from('students')
            .select('name, is_active, program_status')
            .eq('is_active', true)
            .is('deleted_at', null);
          if (currentStudentInfo?.batch_id) memQuery = memQuery.eq('batch_id', currentStudentInfo.batch_id);
          const { data: batchMembers } = await memQuery.limit(60);
          memberPool = (batchMembers || [])
            .filter(m => m.is_active === true && String(m.program_status || '').toUpperCase() !== 'INACTIVE')
            .map(m => stripHonorific(m.name || '').trim().split(/\s+/)[0])
            .filter(n => n && n.length > 1 && n.toLowerCase() !== 'test');
        } catch (_) {}
        if (memberPool.length < 2) {
          memberPool = ['Risma', 'Aditya', 'Zahira', 'Lucky', 'Faesal', 'Shinta', 'Amri'];
        }
        questions.forEach(sq => {
          const idx1 = Math.floor(Math.random() * memberPool.length);
          let idx2 = Math.floor(Math.random() * memberPool.length);
          if (memberPool.length > 1 && idx2 === idx1) idx2 = (idx1 + 1) % memberPool.length;
          const m1 = memberPool[idx1];
          const m2 = memberPool[idx2];
          if (sq.question_text_snapshot) sq.question_text_snapshot = String(sq.question_text_snapshot).replace(/\{MEMBER_1\}/g, m1).replace(/\{MEMBER_2\}/g, m2);
          if (sq.question_text) sq.question_text = String(sq.question_text).replace(/\{MEMBER_1\}/g, m1).replace(/\{MEMBER_2\}/g, m2);
          if (sq.prompt) sq.prompt = String(sq.prompt).replace(/\{MEMBER_1\}/g, m1).replace(/\{MEMBER_2\}/g, m2);
        });
      }
      const answerRows = mapQuestionsToAnswerRows(questions, 0);
      const { data: insertedAns, error: ansInsertErr } = await sb.from('attempt_answers')
        .insert(answerRows)
        .select('id, attempt_id, question_id, question_snapshot, topic_snapshot, question_type_snapshot, accepted_answers_snapshot, correct_answer_snapshot, student_answer, score');
      if (ansInsertErr) {
        console.error('Failed to insert attempt answers:', ansInsertErr);
      } else {
        answers = insertedAns || [];

        // Authoritative: Update total_questions on attempt in database and memory (exclude Warm-Up & Bonus Round)
        if (answers.length > 0) {
          const isUnscoredItem = (snap) => Boolean(
            snap?.is_bonus_round ||
            ['bonus_round', 'live_time', 'live_day', 'live_date'].includes(String(snap?.dynamic_type || '').toLowerCase())
          );
          const scoredTotal = answers.filter(a => !isUnscoredItem(a.question_snapshot)).length || answers.length;
          await sb.from('attempts').update({
            total_questions: scoredTotal,
            updated_at: new Date().toISOString()
          }).eq('id', attempt.id);
          attempt.total_questions = scoredTotal;
        }
      }
    }
  } else if (attempt.status === 'in_progress' && test.payload?.is_dynamic_shell && isFormalExam) {
    const testCat = String(test.payload?.category || '').toLowerCase();
    const isUnifiedExam = testCat === 'all' || testCat === 'unified' || test.payload?.is_unified === true || test.payload?.is_unified_test === true || test.test_subtype === 'UNIFIED_TEST';
    if (isUnifiedExam) {
      const phraseCountInAns = answers.filter(a => a.question_snapshot?.test_section === 'phrases' || a.question_snapshot?.category === 'phrases').length;
      const wordCountInAns = answers.length - phraseCountInAns;
      if (wordCountInAns > 0 && phraseCountInAns > 0 && phraseCountInAns < Math.round(wordCountInAns / 4)) {
        try {
          const fullQuestions = await generateTestQuestions(sb, test);
          const existingQIds = new Set(answers.map(a => a.question_id).filter(Boolean));
          const existingTexts = new Set(answers.map(a => String(a.question_snapshot?.question_text || '').trim().toLowerCase()).filter(Boolean));
          const missingPhrases = (fullQuestions || []).filter(q =>
            q.test_section === 'phrases' &&
            !(q.question_id && existingQIds.has(q.question_id)) &&
            !existingTexts.has(String(q.question_text_snapshot || q.question_text || '').trim().toLowerCase())
          );
          if (missingPhrases.length > 0) {
            const maxOrder = answers.reduce((mx, a) => Math.max(mx, Number(a.question_snapshot?.display_order || 0)), answers.length);
            const missingRows = mapQuestionsToAnswerRows(missingPhrases, maxOrder);
            const { data: appendedAns, error: appendErr } = await sb.from('attempt_answers')
              .insert(missingRows)
              .select('id, attempt_id, question_id, question_snapshot, topic_snapshot, question_type_snapshot, accepted_answers_snapshot, correct_answer_snapshot, student_answer, score');
            if (!appendErr && appendedAns && appendedAns.length > 0) {
              answers = [...answers, ...appendedAns];
              await sb.from('attempts').update({
                total_questions: answers.length,
                updated_at: new Date().toISOString()
              }).eq('id', attempt.id);
              attempt.total_questions = answers.length;
            }
          }
        } catch (healErr) {
          console.warn('Non-fatal phrase self-heal skipped:', healErr);
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

  const sessAnsweringModes = asmData.payload?.test_session?.answering_modes || {};
  const sessAnsweringMode = asmData.payload?.test_session?.answering_mode;
  let _csSync = null;
  if (asmData.class_id) {
    try { _csSync = await fetchClassTestSettings(asmData.class_id); } catch (_) {}
  }
  const resolvedWordsMode = sessAnsweringModes.words || sessAnsweringMode
    || asmData.payload?.words_answer_type || asmData.payload?.wordsAnswerType
    || (isFormalExam ? _csSync?.wordsExamAnswer : _csSync?.wordsTaskAnswer)
    || null;
  const resolvedPhrasesMode = sessAnsweringModes.phrases || sessAnsweringMode
    || asmData.payload?.phrases_answer_type || asmData.payload?.phrasesAnswerType
    || (isFormalExam ? _csSync?.phrasesExamAnswer : _csSync?.phrasesTaskAnswer)
    || null;

  // Distractor candidate pool from all attempt answers
  const candidatePool = [];
  (answers || []).forEach(a => {
    const acc = Array.isArray(a.accepted_answers_snapshot) ? a.accepted_answers_snapshot[0] : (typeof a.accepted_answers_snapshot === 'string' ? a.accepted_answers_snapshot.split(/[;,/]/)[0]?.trim() : (a.correct_answer_snapshot || ''));
    if (acc && !candidatePool.includes(acc)) candidatePool.push(acc);
  });

  const answersToPersist = [];

  // Sanitasi & sinkronisasi mode aktif agar resumed attempt selalu mengikuti mode sesi tutor terkini
  const sanitizedAnswers = (answers || []).map(a => {
    let snap = typeof a.question_snapshot === 'string'
      ? (() => { try { return JSON.parse(a.question_snapshot); } catch(_) { return {}; } })()
      : (a.question_snapshot ? { ...a.question_snapshot } : {});

    delete snap.correct_answer;
    delete snap.accepted_answers;

    const isPhrase = (
      snap.category === 'phrases' ||
      snap.test_section === 'phrases' ||
      snap.section_id === 'phrases' ||
      /phrase/i.test(snap.section_label || '') ||
      ['expression', 'idiom', 'proverb', 'phrase'].includes((snap.word_type || a.question_type_snapshot || '').toLowerCase())
    );
    const targetMode = isPhrase ? resolvedPhrasesMode : resolvedWordsMode;

    let changed = false;
    if (targetMode) {
      const targetAnsType = (targetMode === 'selection' || targetMode === 'multiple_choice') ? 'selection' : targetMode;
      if (snap.answer_type !== targetAnsType) {
        snap.answer_type = targetAnsType;
        changed = true;
      }
    }

    if (snap.answer_type === 'selection') {
      if (!Array.isArray(snap.options_snapshot) || snap.options_snapshot.length < 2) {
        const acc = Array.isArray(a.accepted_answers_snapshot) ? a.accepted_answers_snapshot[0] : (typeof a.accepted_answers_snapshot === 'string' ? a.accepted_answers_snapshot.split(/[;,/]/)[0]?.trim() : (a.correct_answer_snapshot || ''));
        if (acc) {
          const distractors = candidatePool.filter(c => c !== acc).sort(() => 0.5 - Math.random()).slice(0, 4);
          snap.options_snapshot = [acc, ...distractors].sort(() => 0.5 - Math.random());
          changed = true;
        }
      }
    }

    if (changed) {
      answersToPersist.push({ id: a.id, snap });
    }

    return {
      id: a.id,
      attempt_id: a.attempt_id,
      question_id: a.question_id,
      question_snapshot: snap,
      options_snapshot: snap.options_snapshot || a.options_snapshot,
      student_answer: a.student_answer,
      topic_snapshot: a.topic_snapshot,
      question_type_snapshot: a.question_type_snapshot
    };
  });

  if (answersToPersist.length > 0) {
    Promise.all(answersToPersist.map(item => sb.from('attempt_answers').update({ question_snapshot: item.snap }).eq('id', item.id))).catch(err => {
      console.warn('[startTest] Background option synchronization notice:', err?.message || err);
    });
  }

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
    resumed: isResumed
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

    // Pre-check: If this attempt contains Description module questions, PostgreSQL RPC does not contain
    // the Royal Order NLP grammar engine. Route directly to authoritative client NLP engine.
    let isDescriptionAttempt = false;
    try {
      const { data: sampleRow } = await sb.from('attempt_answers')
        .select('question_snapshot, question_type_snapshot')
        .eq('attempt_id', attemptId)
        .limit(1);
      if (sampleRow && sampleRow[0]) {
        const snap = typeof sampleRow[0].question_snapshot === 'string'
          ? JSON.parse(sampleRow[0].question_snapshot || '{}')
          : (sampleRow[0].question_snapshot || {});
        if (snap?.answer_type === 'description' || sampleRow[0].question_type_snapshot === 'Description' || snap?.module === 'description') {
          isDescriptionAttempt = true;
        }
      }
    } catch (_) {}

    if (!isDescriptionAttempt) {
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
      }
    }

    if (!result) {
      // Direct client evaluation fallback (guarantees student NEVER fails to submit or loses score)
      const { data: attempt } = await sb.from('attempts').select('id, is_remedial_unlocked').eq('id', attemptId).single();
      const { data: attemptAnswers } = await sb.from('attempt_answers').select('id, student_answer, accepted_answers_snapshot, correct_answer_snapshot, question_snapshot, question_type_snapshot').eq('attempt_id', attemptId);

      const answersList = Array.isArray(answersMap) ? answersMap : [];
      const answersDict = new Map(answersList.map(a => [a.attempt_answer_id, a.student_answer || '']));
      const submittedIds = new Set(answersList.map(a => a.attempt_answer_id).filter(Boolean));
      const isPartialSubmit = submittedIds.size > 0 && submittedIds.size < (attemptAnswers?.length || 0);

      const scoredRows = isPartialSubmit
        ? (attemptAnswers || []).filter(r => submittedIds.has(r.id))
        : (attemptAnswers || []);

      let totalPoints = 0;
      let correctCount = 0;
      const totalQuestions = scoredRows.length || 0;
      const clientUpdatePromises = [];

      for (const row of (attemptAnswers || [])) {
        const isInSubmit = !isPartialSubmit || submittedIds.has(row.id);
        if (!isInSubmit) continue; // Skip non-submitted rows (e.g. other section) to avoid overwriting or penalizing

        const studentAns = answersDict.has(row.id) ? answersDict.get(row.id) : (row.student_answer || '');
        const snap = typeof row.question_snapshot === 'string'
          ? (() => { try { return JSON.parse(row.question_snapshot); } catch { return {}; } })()
          : (row.question_snapshot || {});
        const qType = snap?.answer_type || row.question_type_snapshot || 'written';
        const targetDemo = snap?.target_demonstrative || row.accepted_answers_snapshot || row.correct_answer_snapshot;
        const evalRes = evaluateAnswer(studentAns, targetDemo, qType);
        const score = evalRes.score || (evalRes.is_correct ? 1 : 0);
        totalPoints += score;
        if (score >= 1) correctCount++;

        clientUpdatePromises.push(sb.from('attempt_answers').update({
          student_answer: studentAns,
          score: score,
          is_correct: score >= 1,
          evaluation_result: score >= 1 ? 'correct' : (score > 0 ? 'minor' : 'incorrect'),
          updated_at: new Date().toISOString()
        }).eq('id', row.id));
      }
      if (clientUpdatePromises.length > 0) {
        await Promise.all(clientUpdatePromises);
      }

      const pct = totalQuestions > 0 ? Math.round((totalPoints / totalQuestions) * 10000) / 100 : 0;
      let effectiveScore = pct;
      if (attempt?.is_remedial_unlocked) {
        effectiveScore = Math.min(pct, 60.0);
      }
      const grade = getGrade(effectiveScore);

      const attUpdateFields = {
        status: targetStatus,
        submitted_at: new Date().toISOString(),
        score: totalPoints,
        correct_count: correctCount,
        total_questions: totalQuestions,
        percentage: pct,
        effective_score: effectiveScore,
        grade: grade,
        updated_at: new Date().toISOString()
      };

      if (options?.section) {
        const secTag = options.section === 'phrases' ? '[SECTION: PHRASES]' : '[SECTION: WORDS]';
        const curFr = String(attempt?.forgiven_reason || '');
        attUpdateFields.forgiven_reason = curFr.includes('[SECTION:')
          ? curFr.replace(/\[SECTION:\s*[A-Z]+\]/gi, secTag)
          : (curFr ? `${curFr} ${secTag}` : secTag);
      }

      const { data: updAttempt, error: updAttErr } = await sb.from('attempts').update(attUpdateFields).eq('id', attemptId).select().single();

      if (updAttErr) throw updAttErr;
      result = updAttempt || { id: attemptId, status: targetStatus, percentage: pct, grade: grade, total_questions: totalQuestions, score: totalPoints, correct_count: correctCount };
    }
  }

  // Post-submit Answer Tolerance & Spelling Sync:
  // Verifies that answers scored by server RPC didn't penalize hyphens, letter spelling spaces, or valid word forms
  try {
    const sb = await getSupabase();
    const { data: attAnsList } = await sb.from('attempt_answers')
      .select('id, student_answer, accepted_answers_snapshot, correct_answer_snapshot, question_snapshot, question_type_snapshot, score, is_correct, evaluation_result')
      .eq('attempt_id', attemptId);

    const answersList = Array.isArray(answersMap) ? answersMap : [];
    const submittedIds = new Set(answersList.map(a => a.attempt_answer_id).filter(Boolean));
    const isPartialSubmit = submittedIds.size > 0 && submittedIds.size < (attAnsList?.length || 0);

    const scoredList = isPartialSubmit
      ? (attAnsList || []).filter(r => submittedIds.has(r.id))
      : (attAnsList || []);

    const totalQ = scoredList.length || 0;

    // In partial submissions (e.g. Words vs Phrases component tests), ensure unsubmitted sibling questions
    // are not penalized or marked as incorrect by server fallback
    if (isPartialSubmit && attAnsList && attAnsList.length > 0) {
      const unsubmittedRows = attAnsList.filter(r => !submittedIds.has(r.id));
      for (const unRow of unsubmittedRows) {
        if (unRow.evaluation_result != null || unRow.score != null) {
          await sb.from('attempt_answers').update({
            student_answer: null,
            score: null,
            is_correct: null,
            evaluation_result: null,
            updated_at: new Date().toISOString()
          }).eq('id', unRow.id);
        }
      }
    }

    // Check if previous attempt record had wrong denominator (e.g. 50 instead of 40)
    const { data: currentAtt } = await sb.from('attempts').select('total_questions, is_remedial_unlocked').eq('id', attemptId).maybeSingle();
    let needsRescore = Boolean(isPartialSubmit && currentAtt && currentAtt.total_questions !== totalQ);
    let newScore = 0;
    let newCorrect = 0;

    const rescoreUpdatePromises = [];
    for (const r of scoredList) {
      const snap = typeof r.question_snapshot === 'string'
        ? (() => { try { return JSON.parse(r.question_snapshot); } catch { return {}; } })()
        : (r.question_snapshot || {});
      const qType = snap?.answer_type || r.question_type_snapshot || 'written';
      const targetDemo = snap?.target_demonstrative || r.accepted_answers_snapshot || r.correct_answer_snapshot;
      const ev = evaluateAnswer(r.student_answer, targetDemo, qType);
      const trueScore = ev.score || 0;
      if (trueScore > (r.score || 0)) {
        needsRescore = true;
        rescoreUpdatePromises.push(sb.from('attempt_answers').update({
          score: trueScore,
          is_correct: trueScore >= 1,
          evaluation_result: ev.result || (trueScore >= 1 ? 'correct' : 'minor'),
          updated_at: new Date().toISOString()
        }).eq('id', r.id));
        newScore += trueScore;
        if (trueScore >= 1) newCorrect++;
      } else {
        newScore += (r.score || 0);
        if (r.is_correct || r.score >= 1) newCorrect++;
      }
    }
    if (rescoreUpdatePromises.length > 0) {
      await Promise.all(rescoreUpdatePromises);
    }

    if (needsRescore && totalQ > 0) {
      const pct = Math.round((newScore / totalQ) * 10000) / 100;
      const effScore = currentAtt?.is_remedial_unlocked ? Math.min(pct, 60.0) : pct;
      const grade = getGrade(effScore);
      const { data: fixedAtt } = await sb.from('attempts').update({
        score: newScore,
        correct_count: newCorrect,
        total_questions: totalQ,
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
      const remGrade = effPct >= 60 ? 'C' : (effPct >= 30 ? 'D' : 'E');
      await sb.from('attempts')
        .update({
          effective_score: effPct,
          grade: remGrade,
          updated_at: new Date().toISOString()
        })
        .eq('id', attemptId);
    }
  } catch (remedialErr) {
    console.warn('Post-submit remedial check notice:', remedialErr);
  }

  // Lean Storage & Best Score Guard Protocol (Option B):
  // 1. Resolve Best Score strictly per (student_id, test_id)
  // 2. Automatically purge superseded detailed answers from previous lower-scoring attempts
  //    guaranteeing at most 1 active answer set exists per student per test.
  try {
    const sb = await getSupabase();
    const { data: curAttempt } = await sb.from('attempts')
      .select('id, student_id, test_id, effective_score, percentage, status')
      .eq('id', attemptId)
      .single();

    if (curAttempt?.student_id && curAttempt?.test_id) {
      const curScore = Number(curAttempt.effective_score ?? curAttempt.percentage ?? 0);
      const { data: siblingAttempts } = await sb.from('attempts')
        .select('id, effective_score, percentage, is_best_score, is_forgiven')
        .eq('student_id', curAttempt.student_id)
        .eq('test_id', curAttempt.test_id)
        .in('status', ['submitted', 'auto_submitted', 'evaluated', 'graded'])
        .neq('id', attemptId);

      const isNewBest = !(siblingAttempts || []).some(s => {
        const sibScore = Number(s.effective_score ?? s.percentage ?? 0);
        // If current attempt is an authentic passing score (>=60%), it supersedes a 0% forgiven waiver
        if (curScore >= 60 && Boolean(s.is_forgiven) && sibScore < 60) return false;
        // If sibling is a forgiven waiver and current attempt failed (<60%), sibling remains best
        if (Boolean(s.is_forgiven) && curScore < 60) return true;
        return sibScore > curScore;
      });

      if (isNewBest) {
        // Mark current attempt as authoritative best score
        await sb.from('attempts').update({ is_best_score: true, updated_at: new Date().toISOString() }).eq('id', attemptId);

        if (siblingAttempts && siblingAttempts.length > 0) {
          const lowerIds = siblingAttempts.map(s => s.id);
          // Demote siblings
          await sb.from('attempts').update({ is_best_score: false, updated_at: new Date().toISOString() }).in('id', lowerIds);
        }
      } else {
        // Current attempt is a lower-scoring retake; mark as not best
        await sb.from('attempts').update({ is_best_score: false, updated_at: new Date().toISOString() }).eq('id', attemptId);
      }
    }
  } catch (purgeErr) {
    console.warn('Lean storage best-score sync notice:', purgeErr);
  }

  clearAdminCache('attempts');
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
      test_shell_code, test_title, test_type, test_subtype, test_category, class_id, level_id, theme_code, topic_code,
      tests:test_id(id, title, display_name, shell_code, status, test_subtype, test_type, class_id, classes(name), levels(name, level_number))
    `)
    .eq('id', attemptId)
    .single();
  if (error) throw error;
  if (data) data.tests = buildAttemptTestFallback(data);
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

let _isClearingAdminCache = false;
export function clearAdminCache(table = null) {
  if (_isClearingAdminCache) return;
  _isClearingAdminCache = true;
  try {
    if (table) {
      const normTable = (table || '').toLowerCase().replace('-', '_');
      for (const key of _adminCache.keys()) {
        if (key.startsWith(normTable + '|')) _adminCache.delete(key);
      }
      _clearMasterStorage(normTable);
      // Cross-table dependencies: if batches, programs, institutions or levels change,
      // clear students and progress caches which embed these related records
      if (['batches', 'programs', 'institutions', 'levels'].includes(normTable)) {
        for (const key of _adminCache.keys()) {
          if (key.startsWith('students|') || key.startsWith('progress|') || key.startsWith('classes|')) {
            _adminCache.delete(key);
          }
        }
        _clearMasterStorage('classes');
      }
      if (normTable === 'programs' && typeof window !== 'undefined' && typeof window.loadSidebarPrograms === 'function') {
        window.loadSidebarPrograms();
      }
      if (normTable === 'classes' && typeof window !== 'undefined' && typeof window.loadSidebarClasses === 'function') {
        window.loadSidebarClasses();
      }
      if (normTable === 'vocabulary_vault' || normTable === 'vocab') {
        _clearPersistentVaultCache();
        _clearMasterStorage('vocabulary_vault');
      }
    } else {
      _adminCache.clear();
      _clearMasterStorage();
      _clearPersistentVaultCache();
      if (typeof window !== 'undefined') {
        if (typeof window.loadSidebarPrograms === 'function') window.loadSidebarPrograms();
        if (typeof window.loadSidebarClasses === 'function') window.loadSidebarClasses();
      }
    }
  } finally {
    _isClearingAdminCache = false;
  }
}

function _safeClone(val) {
  if (val == null) return val;
  if (typeof structuredClone === 'function') {
    try { return structuredClone(val); } catch (_) {}
  }
  return JSON.parse(JSON.stringify(val));
}

const MASTER_TABLES_TTL = new Set([
  'institutions',
  'programs',
  'classes',
  'levels',
  'batches',
  'modules',
  'site_settings',
  'vocabulary_vault',
  'tests',
  'class_levels'
]);
const MASTER_CACHE_DURATION_MS = 5 * 60 * 1000; // 5-minute TTL for high-frequency in-memory catalogs
const DYNAMIC_TABLES_TTL = 3 * 60 * 1000; // 3-minute TTL for student rosters and transactional records

export async function adminFetchAll(table, select = '*', filters = {}, forceRefresh = false) {
  const normTable = (table || '').toLowerCase().replace('-', '_');
  const cacheKey = normTable + '|' + select + '|' + JSON.stringify(filters);
  const isMasterTable = MASTER_TABLES_TTL.has(normTable);

  if (!forceRefresh && _adminCache.has(cacheKey)) {
    const entry = _adminCache.get(cacheKey);
    const ttl = isMasterTable ? MASTER_CACHE_DURATION_MS : DYNAMIC_TABLES_TTL;
    if (entry && typeof entry === 'object' && entry.timestamp) {
      if (Date.now() - entry.timestamp < ttl) {
        return _safeClone(entry.data);
      } else {
        _adminCache.delete(cacheKey);
      }
    } else if (entry) {
      return _safeClone(entry);
    }
  }

  // 2. Persistent device localStorage hit (Master tables, instant boot across devices, ~1ms)
  if (!forceRefresh && isMasterTable) {
    const persistentData = _readMasterStorage(cacheKey);
    if (persistentData !== null) {
      _adminCache.set(cacheKey, {
        data: _safeClone(persistentData),
        timestamp: Date.now()
      });
      return _safeClone(persistentData);
    }
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
      'modules',
      'class_levels',   // junction table — no deleted_at column
      'student_academic_assessments',
      'student_final_examinations',
      'v_student_step_summaries',
      'tutor_profiles',
      'class_sessions',
      'session_attendance',
      'language_violations',
      'language_violation_payments',
      'test_topics',
      'test_results',
      'theme_program_assignments',
      'conversation_sessions',
      'word_types'
    ];
    if (!noDeletedAtTables.includes(normTable)) {
      query = query.is('deleted_at', null);
    }

    for (const [key, val] of Object.entries(filters)) {
      const normKey = (key === 'Test_id') ? 'test_id' : key;
      if (Array.isArray(val)) {
        if (val.length === 0) return [];
        query = query.in(normKey, val);
      } else if (val === null) {
        query = query.is(normKey, null);
      } else {
        query = query.eq(normKey, val);
      }
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

    _adminCache.set(cacheKey, {
      data: _safeClone(allData || []),
      timestamp: Date.now()
    });

    if (isMasterTable && allData && allData.length > 0) {
      _writeMasterStorage(cacheKey, allData);
    }

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
      if ('prerequisite_id' in payload) {
        if (!payload.prerequisite_test_id) {
          payload.prerequisite_test_id = payload.prerequisite_id;
        }
        delete payload.prerequisite_id;
      }
    }
    await enforceTestSystemGuard(sb, payload);
  }

  const { data, error } = await sb.from(normTable).insert(payload).select().single();
  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error(`Insert into '${normTable}' failed: row was not returned or insert permission was denied.`);
    }
    throw error;
  }
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
      if ('prerequisite_id' in payload) {
        if (!payload.prerequisite_test_id) {
          payload.prerequisite_test_id = payload.prerequisite_id;
        }
        delete payload.prerequisite_id;
      }
    }
    const { data: existing } = await sb.from('tests').select('id, module_id, class_id, level_id').eq('id', id).single();
    await enforceTestSystemGuard(sb, payload, existing);
  }

  const { data, error } = await sb.from(normTable).update(payload).eq('id', id).select().single();
  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error(`Record in '${normTable}' (id: ${id}) was not found or update permission was denied by database security.`);
    }
    throw error;
  }
  clearAdminCache(normTable);
  return data;
}

export async function adminSoftDelete(table, id) {
  const normTable = (table || '').toLowerCase().replace('-', '_');
  const sb = await getSupabase();
  if (normTable === 'tests') {
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
  // Client-Side Telemetry Lock: Never spam Supabase audit_logs with tab-switch / blur events.
  // Warning overlays, strikes (1-10), and auto-submit penalty run 100% in-browser via test.js.
  try {
    if (typeof sessionStorage !== 'undefined') {
      const key = `topscore_cheat_telemetry_${testId}`;
      const existing = JSON.parse(sessionStorage.getItem(key) || '[]');
      existing.push({
        action: action || 'CHEAT_ATTEMPT',
        strike: detail?.strike,
        reason: detail?.reason,
        timestamp: new Date().toISOString()
      });
      sessionStorage.setItem(key, JSON.stringify(existing));
    }
  } catch (_) {}
  console.info('[Telemetry] Student focus loss event handled locally:', action, detail?.reason, `Strike ${detail?.strike}`);
}

export async function fetchTests(filters = {}) {
  const cacheKey = 'tests|' + JSON.stringify(filters);
  // Tests use short in-memory-only cache (2 min) — NEVER persisted to localStorage.
  // Reason: Admin may publish/update tests at any time; a 7-day localStorage hit
  // would show stale test lists on student devices until manual cache clear.
  const TEST_TTL = 2 * 60 * 1000;
  const existing = _apiCache.get(cacheKey);
  const now = Date.now();
  if (existing && (now - existing.timestamp < TEST_TTL)) {
    return Array.isArray(existing.data) ? [...existing.data] : existing.data;
  }
  _apiCache.delete(cacheKey);
  const sb = await getSupabase();
  try {
    let query = sb.from('tests').select('id, title, display_name, test_subtype, category, payload, class_id, level_id, display_order, status, minimum_required_score, prerequisite_test_id, question_order, working_duration_minutes, schedule_mode, test_type, is_dynamic_shell, shell_code, max_attempts, retake_allowed, created_at, deleted_at, classes(name), levels(name, level_number)');
    if (filters.class_id) query = query.eq('class_id', filters.class_id);
    if (filters.class_ids && Array.isArray(filters.class_ids)) {
      if (filters.class_ids.length === 0) return [];
      query = query.in('class_id', filters.class_ids);
    }
    if (filters.level_id) query = query.eq('level_id', filters.level_id);
    if (filters.program_id) query = query.eq('program_id', filters.program_id);
    if (!filters.include_deleted) {
      query = query.is('deleted_at', null);
    }

    const { data, error } = await query.order('display_order', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false });
    if (!error && data) {
      const result = data.map(a => ({
        ...a,
        prerequisite_id: a.prerequisite_test_id || a.prerequisite_id,
        prerequisite_test_id: a.prerequisite_test_id || a.prerequisite_id
      }));
      // In-memory only — skip _writeMasterStorage to prevent stale test list on student HP
      _apiCache.set(cacheKey, { data: result, timestamp: now });
      return [...result];
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
  return null; // Deprecated
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
export async function detectDuplicateStudents(scope = 'all') {
  const sb = await getSupabase();
  const { data, error } = await sb.from('students')
    .select('id, name, program_id, batch_id, level_id, is_active, program_status, created_at, deleted_at, batches!batch_id(id, name), programs(id, name, institution_id, institutions(id, name, code)), levels(id, name, level_number)')
    .is('deleted_at', null);
  if (error) throw error;
  const students = data || [];
  const groups = {};
  for (const s of students) {
    const key = (s.name || '').trim().toLowerCase();
    if (!key) continue;
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  }

  let dupGroups = Object.values(groups).filter(g => g.length > 1);
  if (dupGroups.length === 0) return [];

  // Batch query attempt counts for all candidate IDs
  const candidateIds = dupGroups.flatMap(g => g.map(c => c.id));
  const attMap = {};
  if (candidateIds.length > 0) {
    try {
      const { data: attempts } = await sb.from('attempts').select('student_id').in('student_id', candidateIds);
      (attempts || []).forEach(a => {
        attMap[a.student_id] = (attMap[a.student_id] || 0) + 1;
      });
    } catch (attErr) {
      console.warn('Attempt count query warning:', attErr);
    }
  }

  const mapped = dupGroups.map(candidates => {
    // Enrich candidate fields for crystal-clear presentation
    candidates.forEach(c => {
      c.batchName = c.batches?.name ? `Batch ${c.batches.name.replace(/^batch\s*/i, '')}` : 'Unassigned';
      c.programName = c.programs?.name || '—';
      c.institutionName = c.programs?.institutions?.code || c.programs?.institutions?.name || '—';
      c.levelName = c.levels?.name || '—';
      c.attemptsCount = attMap[c.id] || 0;
    });

    // Determine similarity type: exact same batch or cross-batch/class
    const firstBatchId = candidates[0].batch_id;
    const isSameClass = candidates.every(c => c.batch_id === firstBatchId);
    const similarityType = isSameClass ? 'SAME_CLASS' : 'CROSS_CLASS';
    const similarityLabel = isSameClass ? 'Same Class' : 'Cross-Class';

    // Smart candidate sorting for recommended primary:
    // When candidates span different batches (cross-batch repeat / re-enrollment):
    // The student is currently studying in the NEWER/LATEST batch!
    // Therefore, the newer batch must be candidate[0] (PRIMARY TARGET).
    // The older batch becomes the origin batch whose historical attempts will be merged.
    candidates.sort((a, b) => {
      // 1. Batch sequence: Prefer newer/higher batch number (e.g. Batch 133 > Batch 130)
      const aBatchNum = parseInt((a.batches?.name || a.batchName || '').replace(/\D/g, ''), 10);
      const bBatchNum = parseInt((b.batches?.name || b.batchName || '').replace(/\D/g, ''), 10);
      if (!isNaN(aBatchNum) && !isNaN(bBatchNum) && aBatchNum !== bBatchNum) {
        return bBatchNum - aBatchNum; // Newer batch first!
      }

      // 2. Active batch assignment (assigned batches come before unassigned)
      const aHasBatch = (a.batch_id && a.batchName !== 'Unassigned') ? 1 : 0;
      const bHasBatch = (b.batch_id && b.batchName !== 'Unassigned') ? 1 : 0;
      if (bHasBatch !== aHasBatch) return bHasBatch - aHasBatch;

      // 3. Higher level progression (e.g. Level 3 > Level 1)
      const aLvl = a.levels?.level_number || 0;
      const bLvl = b.levels?.level_number || 0;
      if (bLvl !== aLvl) return bLvl - aLvl;

      // 4. Same batch duplicates: prefer record with highest attempts
      if ((b.attemptsCount || 0) !== (a.attemptsCount || 0)) {
        return (b.attemptsCount || 0) - (a.attemptsCount || 0);
      }

      // 5. Most recent registration (newest enrollment first)
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

    return {
      name: candidates[0].name,
      recommendedPrimaryId: candidates[0].id,
      similarityType,
      similarityLabel,
      isSameClass,
      candidates
    };
  });

  if (scope === 'same_class') {
    return mapped.filter(g => g.isSameClass);
  }
  if (scope === 'cross_class') {
    return mapped.filter(g => !g.isSameClass);
  }
  return mapped;
}

export async function mergeStudentPair(keepId, removeId) {
  const sb = await getSupabase();

  // Inspect profile fields to preserve any missing demographics on keepId
  const { data: pairData } = await sb.from('students')
    .select('id, batch_id, level_id, program_id, institution_id, birth_date, birthplace, gender, education, phone, pin_hash, pin, is_repeat, original_batch_id, program_status, created_at, batches!batch_id(name)')
    .in('id', [keepId, removeId]);

  const keepStudent = pairData?.find(s => s.id === keepId);
  const removeStudent = pairData?.find(s => s.id === removeId);
  const updates = {};
  if (keepStudent && removeStudent) {
    if (!keepStudent.batch_id && removeStudent.batch_id) updates.batch_id = removeStudent.batch_id;
    if (!keepStudent.level_id && removeStudent.level_id) updates.level_id = removeStudent.level_id;
    if (!keepStudent.program_id && removeStudent.program_id) updates.program_id = removeStudent.program_id;
    if (!keepStudent.institution_id && removeStudent.institution_id) updates.institution_id = removeStudent.institution_id;
    if (!keepStudent.birth_date && removeStudent.birth_date) updates.birth_date = removeStudent.birth_date;
    if (!keepStudent.birthplace && removeStudent.birthplace) updates.birthplace = removeStudent.birthplace;
    if (!keepStudent.gender && removeStudent.gender) updates.gender = removeStudent.gender;
    if (!keepStudent.education && removeStudent.education) updates.education = removeStudent.education;
    if (!keepStudent.phone && removeStudent.phone) updates.phone = removeStudent.phone;
    if (!keepStudent.pin_hash && removeStudent.pin_hash) updates.pin_hash = removeStudent.pin_hash;
    if (!keepStudent.pin && removeStudent.pin) updates.pin = removeStudent.pin;
    if (keepStudent.is_repeat == null && removeStudent.is_repeat != null) updates.is_repeat = removeStudent.is_repeat;
    if (!keepStudent.original_batch_id && removeStudent.original_batch_id) updates.original_batch_id = removeStudent.original_batch_id;

    // Cross-Batch Re-enrollment Recognition:
    // If keepStudent and removeStudent are from different batches, track origin batch & mark as repeat!
    if (keepStudent.batch_id && removeStudent.batch_id && keepStudent.batch_id !== removeStudent.batch_id) {
      const keepBatchName = keepStudent.batches?.name || '';
      const removeBatchName = removeStudent.batches?.name || '';
      const keepNum = parseInt(keepBatchName.replace(/\D/g, ''), 10);
      const removeNum = parseInt(removeBatchName.replace(/\D/g, ''), 10);

      // Determine which is the newer batch (current active enrollment):
      const isKeepNewer = (!isNaN(keepNum) && !isNaN(removeNum))
        ? keepNum > removeNum
        : new Date(keepStudent.created_at || 0) >= new Date(removeStudent.created_at || 0);

      if (isKeepNewer) {
        // keepStudent is in the newer batch; the earlier batch becomes original_batch_id
        updates.original_batch_id = removeStudent.batch_id;
        updates.is_repeat = true;
        // If keepStudent was previously flagged ALUMNI, reset to active studying in class
        if ((keepStudent.program_status || '').toUpperCase() === 'ALUMNI') {
          updates.program_status = 'IN_PROGRESS';
        }
      }
    }
  }

  // Reassign all attempts and progress records from removeId to keepId
  const ops = [
    sb.from('attempts').update({ student_id: keepId }).eq('student_id', removeId),
    sb.from('progress').update({ student_id: keepId }).eq('student_id', removeId),
    sb.from('students').update({ deleted_at: new Date().toISOString(), is_active: false, program_status: 'INACTIVE' }).eq('id', removeId)
  ];
  if (Object.keys(updates).length > 0) {
    ops.push(sb.from('students').update(updates).eq('id', keepId));
  }
  ops.push(sb.from('audit_logs').insert({
    actor_role: 'admin',
    action: 'MERGE_STUDENTS',
    entity_type: 'students',
    entity_id: keepId,
    old_value: { merged_from: removeId },
    new_value: { kept_id: keepId, removed_id: removeId, inherited_fields: updates },
    created_at: new Date().toISOString()
  }));

  await Promise.all(ops);
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

// --- Duplicate question detection & resequencing (Legacy Stubs) ---
export async function detectDuplicateQuestions(testId) {
  return { totalSameTestDupCount: 0, sameTestDuplicates: [], sameTestOrderConflicts: [], crossTestDuplicates: [] };
}
export async function resequenceTestQuestions(testId) { return; }
export async function resolveDuplicateQuestionGroup(groupOrPrimaryId, keepIdOrDuplicateId) { return; }
export async function batchResolveTestDuplicateQuestions(testId) { return { repointedCount: 0, deletedCount: 0 }; }

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

// --- Question bank (Unified into Vocabulary Vault) ---
export async function fetchCentralQuestions(filters = {}) { return []; }
export async function createCentralQuestion(payload) { return null; }
export async function updateCentralQuestion(id, payload) { return null; }
export async function deleteCentralQuestion(id) { return null; }

export async function getTestQuestions(testOrId) {
  if (!testOrId) return [];
  if (typeof testOrId === 'object' && testOrId.payload?.questions) {
    return testOrId.payload.questions;
  }
  const sb = await getSupabase();
  const testId = typeof testOrId === 'string' ? testOrId : testOrId?.id;
  if (!testId) return [];
  const { data } = await sb.from('tests').select('payload').eq('id', testId).single();
  return data?.payload?.questions || [];
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
  if (topicIds && topicIds.length > 0) {
    payload.payload = { ...(payload.payload || {}), topicIds };
  }
  return await adminInsert('tests', payload);
}

export async function updateTestDefinition(id, payload) {
  return await adminUpdate('tests', id, { ...payload, updated_at: new Date().toISOString() });
}

export async function updateTestWithTopics(id, payload, topicIds = []) {
  if (topicIds && topicIds.length > 0) {
    payload.payload = { ...(payload.payload || {}), topicIds };
  }
  return await adminUpdate('tests', id, { ...payload, updated_at: new Date().toISOString() });
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
// VOCABULARY VAULT — CRUD & IMPORT (OFFLINE-FIRST PERSISTENT CACHE)
// ============================================================
const VAULT_CACHE_KEY = 'vault_all_master_words';
const VAULT_STORAGE_KEY = 'topscore_vault_cache_v4';
const VAULT_STORAGE_TTL_MS = 24 * 60 * 60 * 1000; // 24-hour persistent offline cache
const VAULT_MEMORY_TTL_MS = 5 * 60 * 1000; // 5-minute in-memory refresh check

function _getVaultStorage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    if (typeof localStorage !== 'undefined') return localStorage;
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) return globalThis.localStorage;
  } catch (_) {}
  return null;
}

function _readPersistentVaultCache() {
  try {
    const storage = _getVaultStorage();
    if (!storage) return null;
    const raw = storage.getItem(VAULT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.data) && parsed.data.length > 0) {
      const age = Date.now() - (parsed.timestamp || 0);
      const isOffline = (typeof navigator !== 'undefined' && navigator.onLine === false);
      if (age < VAULT_STORAGE_TTL_MS || isOffline) {
        return parsed.data;
      }
    }
  } catch (err) {
    console.warn('[VaultCache] Persistent storage read notice:', err.message);
  }
  return null;
}

function _writePersistentVaultCache(data) {
  try {
    const storage = _getVaultStorage();
    if (!storage || !Array.isArray(data) || data.length === 0) return;
    storage.setItem(VAULT_STORAGE_KEY, JSON.stringify({
      timestamp: Date.now(),
      data
    }));
  } catch (err) {
    console.warn('[VaultCache] Persistent storage write notice:', err.message);
  }
}

function _clearPersistentVaultCache() {
  try {
    const storage = _getVaultStorage();
    if (storage) {
      storage.removeItem(VAULT_STORAGE_KEY);
    }
  } catch (_) {}
}

export async function fetchVaultWords({ topic = null, search = null, targetLevel = null, programId = null, institutionId = null, limit = 10000, offset = 0, forceRefresh = false } = {}) {
  let allData = [];

  // 1. In-memory cache hit (0ms & 0 egress)
  if (!forceRefresh && _apiCache.has(VAULT_CACHE_KEY)) {
    const cached = _apiCache.get(VAULT_CACHE_KEY);
    if (Date.now() - cached.timestamp < VAULT_MEMORY_TTL_MS && Array.isArray(cached.data)) {
      allData = cached.data;
    }
  }

  // 2. Persistent storage hit (Offline-First: 0ms Supabase roundtrip, 0 egress across sessions/tabs)
  if (!forceRefresh && (!allData || allData.length === 0)) {
    const persistent = _readPersistentVaultCache();
    if (persistent && persistent.length > 0) {
      allData = persistent;
      _apiCache.set(VAULT_CACHE_KEY, { data: allData, timestamp: Date.now() });
    }
  }

  // 3. Cache miss or forced refresh: fetch complete vault dataset from Supabase once
  if (!allData || allData.length === 0) {
    const persistentFallback = _readPersistentVaultCache();
    try {
      const sb = await getSupabase();
      const PAGE_SIZE = 1000;
      let curOffset = 0;
      allData = [];

      while (true) {
        const { data, error } = await sb.from('vocabulary_vault')
          .select('id, topic, indonesian, english, word_type, target_level, theme, theme_code, topic_code, category')
          .is('deleted_at', null)
          .order('target_level', { ascending: true })
          .order('theme_code', { ascending: true })
          .order('topic_code', { ascending: true })
          .order('word_type', { ascending: true })
          .order('indonesian', { ascending: true })
          .range(curOffset, curOffset + PAGE_SIZE - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;
        allData.push(...data);
        if (data.length < PAGE_SIZE) break;
        curOffset += data.length;
      }

      _apiCache.set(VAULT_CACHE_KEY, { data: allData, timestamp: Date.now() });
      _writePersistentVaultCache(allData);
    } catch (fetchErr) {
      // Offline fallback: if network fails or Supabase unreachable, fallback to persistent cache
      if (persistentFallback && persistentFallback.length > 0) {
        console.warn('[fetchVaultWords] Supabase unreachable, serving from offline persistent cache:', fetchErr.message);
        allData = persistentFallback;
        _apiCache.set(VAULT_CACHE_KEY, { data: allData, timestamp: Date.now() });
      } else {
        throw fetchErr;
      }
    }
  }

  // 3. High-speed in-memory filtering (0ms roundtrip)
  let filtered = allData;
  if (targetLevel !== null && targetLevel !== undefined && targetLevel !== '') {
    filtered = filtered.filter(w => Number(w.target_level) === Number(targetLevel));
  }
  if (programId) filtered = filtered.filter(w => !w.program_id || w.program_id === programId);
  if (institutionId) filtered = filtered.filter(w => !w.institution_id || w.institution_id === institutionId);
  if (topic) filtered = filtered.filter(w => w.topic === topic);
  if (search) {
    const term = search.trim().toLowerCase();
    filtered = filtered.filter(w =>
      (w.indonesian && w.indonesian.toLowerCase().includes(term)) ||
      (w.english && w.english.toLowerCase().includes(term)) ||
      (w.topic && w.topic.toLowerCase().includes(term))
    );
  }

  const start = offset || 0;
  const end = limit ? start + limit : filtered.length;
  return filtered.slice(start, end);
}

export async function fetchVaultTopics(targetLevelNum = null, programId = null) {
  // Use cached vault words when available for instant 0ms topic resolution
  let words = [];
  try {
    words = await fetchVaultWords({ targetLevel: targetLevelNum, programId });
  } catch (_) {}

  if (words && words.length > 0) {
    const topics = [...new Set(words.map(r => r.topic).filter(Boolean))];
    return topics.sort((a, b) => a.localeCompare(b));
  }

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

export async function checkVaultDuplicates(newRows, existingVaultWords = null) {
  let vault = existingVaultWords;
  if (!vault || !vault.length) {
    try {
      vault = await fetchVaultWords({ limit: 100000 });
    } catch (_) {
      const sb = await getSupabase();
      const { data: vaultData, error } = await sb.from('vocabulary_vault')
        .select('id, theme, topic, indonesian, english, target_level, word_type')
        .is('deleted_at', null);
      if (error) throw error;
      vault = vaultData || [];
    }
  }

  const cleanRows = [];
  const duplicateConflicts = [];
  const normStr = s => String(s || '').toLowerCase().trim().replace(/\s+/g, ' ');

  for (let i = 0; i < newRows.length; i++) {
    const row = newRows[i];
    const rowEng = normStr(row.english);
    const rowInd = normStr(row.indonesian);
    const rowTopic = normStr(row.topic);

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

  const thCode = String(row.theme_code || '').trim().replace(/\s+/g, ' ').toUpperCase();
  let topCode = String(row.topic_code || '').trim().replace(/\s+/g, ' ').toUpperCase();

  // If topCode is missing or just numeric, normalize it with themeCode
  if (!topCode && thCode) {
    topCode = `${thCode}1`;
  } else if (/^[0-9]+$/.test(topCode) && thCode) {
    topCode = `${thCode}${topCode}`;
  }

  const determinedCategory = cat ? (cat.includes('phrase') ? 'phrases' : 'words') : (['expression', 'idiom', 'proverb'].includes(wType.toLowerCase()) ? 'phrases' : 'words');
  const isPhraseCategory = determinedCategory === 'phrases';

  return {
    theme_code: thCode || (topCode ? topCode[0] : 'A'),
    theme:      toTitleCase(row.theme || ''),
    topic_code: topCode || 'A1',
    topic:      toTitleCase(row.topic || ''),
    indonesian: formatVaultTerm(row.indonesian || '', isPhraseCategory),
    english:    formatVaultTerm(canonicalEng, isPhraseCategory),
    word_type:  toTitleCase(wType),
    target_level: (() => {
      const rawLvl = (row.level !== undefined && row.level !== null && row.level !== '')
        ? row.level
        : ((row.target_level !== undefined && row.target_level !== null && row.target_level !== '') ? row.target_level : 1);
      const parsedLvl = parseInt(rawLvl, 10);
      return !isNaN(parsedLvl) ? parsedLvl : 1;
    })(),
    category:   determinedCategory
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
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const resolution = resolutionMap[i];
    if (resolution === 'skip') continue;

    const progId = row.program_id || row.programId;
    const thCode = String(row.theme_code || (row.topic_code ? row.topic_code[0] : 'A')).trim().toUpperCase();
    const rawTgt = (row.level !== undefined && row.level !== null && row.level !== '')
      ? row.level
      : ((row.target_level !== undefined && row.target_level !== null && row.target_level !== '') ? row.target_level : 1);
    const parsedTgt = parseInt(rawTgt, 10);
    const tgtLvl = !isNaN(parsedTgt) ? parsedTgt : 1;
    if (thCode && tgtLvl !== null && tgtLvl !== undefined && progId) {
      const key = `${thCode}_${tgtLvl}_${progId}`;
      if (!uniqueAssignments.has(key)) {
        uniqueAssignments.set(key, {
          theme_code: thCode,
          target_level: tgtLvl,
          program_id: progId,
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
  if (payload.theme) payload.theme = toTitleCase(payload.theme);
  if (payload.topic) payload.topic = toTitleCase(payload.topic);
  if (payload.word_type) payload.word_type = toTitleCase(payload.word_type);
  if (payload.theme_code) payload.theme_code = payload.theme_code.trim().toUpperCase();
  if (payload.topic_code) payload.topic_code = payload.topic_code.trim().toUpperCase();
  if (payload.indonesian || payload.english) {
    const isPhrase = payload.category === 'phrases' || ['expression', 'idiom', 'proverb'].includes((payload.word_type || '').toLowerCase());
    if (payload.indonesian) payload.indonesian = formatVaultTerm(payload.indonesian, isPhrase);
    if (payload.english) payload.english = formatVaultTerm(payload.english, isPhrase);
  }
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

  if (themeCode && (targetLevel !== null && targetLevel !== undefined)) {
    // Definitive composite key matching: guarantees update even if old theme was NULL, empty, or 'Unassigned'
    query = query.eq('theme_code', themeCode).eq('target_level', targetLevel);
  } else {
    if (targetLevel !== null && targetLevel !== undefined) query = query.eq('target_level', targetLevel);
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
  if (targetLevel !== null && targetLevel !== undefined) query = query.eq('target_level', targetLevel);
  const { error } = await query;
  if (error) throw error;

  // 2. Cascade to theme_program_assignments so assigned classes/programs are not orphaned
  try {
    let oldAssignQuery = sb.from('theme_program_assignments')
      .select('id, program_id, target_level')
      .eq('theme_code', cleanOld);
    if (targetLevel !== null && targetLevel !== undefined) oldAssignQuery = oldAssignQuery.eq('target_level', targetLevel);
    const { data: oldAssigns } = await oldAssignQuery;

    if (oldAssigns && oldAssigns.length > 0) {
      const nowIso = new Date().toISOString();
      for (const a of oldAssigns) {
        const { error: upErr } = await sb.from('theme_program_assignments')
          .upsert({
            theme_code: cleanNew,
            target_level: a.target_level,
            program_id: a.program_id,
            is_active: true,
            updated_at: nowIso
          }, { onConflict: 'theme_code,target_level,program_id' });
        if (!upErr) {
          await sb.from('theme_program_assignments').delete().eq('id', a.id);
        }
      }
    }
  } catch (err) {
    console.warn('[updateVaultThemeCodeCascade] assign cascade notice:', err);
  }

  // 3. Batch-update any topic_code that was prefixed with oldCode (e.g. A1 -> B1, G1 -> EEC1)
  try {
    let topicCodeQuery = sb.from('vocabulary_vault')
      .select('topic_code')
      .eq('theme_code', cleanNew)
      .is('deleted_at', null);
    if (targetLevel !== null && targetLevel !== undefined) topicCodeQuery = topicCodeQuery.eq('target_level', targetLevel);
    const { data: tpRows } = await topicCodeQuery;
    if (tpRows && tpRows.length > 0) {
      const distinctTpCodes = [...new Set(tpRows.map(r => r.topic_code).filter(tc => tc && tc.startsWith(cleanOld)))];
      for (const oldTpCode of distinctTpCodes) {
        const updatedTpCode = cleanNew + oldTpCode.slice(cleanOld.length);
        let batchUpd = sb.from('vocabulary_vault')
          .update({ topic_code: updatedTpCode, updated_at: new Date().toISOString() })
          .eq('theme_code', cleanNew)
          .eq('topic_code', oldTpCode)
          .is('deleted_at', null);
        if (targetLevel !== null && targetLevel !== undefined) batchUpd = batchUpd.eq('target_level', targetLevel);
        await batchUpd;
      }
    }
  } catch (_) {}

  clearApiCache('vault');
  return true;
}

export async function updateVaultThemeLevelCascade(themeCode, oldLevel, newLevel) {
  const sb = await getSupabase();
  const cleanCode = String(themeCode || '').trim().toUpperCase();
  const parsedOld = (oldLevel !== null && oldLevel !== undefined) ? Number(oldLevel) : null;
  const parsedNew = (newLevel !== null && newLevel !== undefined) ? Number(newLevel) : null;
  if (parsedNew === null || isNaN(parsedNew)) throw new Error('Invalid new level');

  // 1. Update vocabulary_vault
  let query = sb.from('vocabulary_vault')
    .update({ target_level: parsedNew, updated_at: new Date().toISOString() })
    .eq('theme_code', cleanCode)
    .is('deleted_at', null);
  if (parsedOld !== null && !isNaN(parsedOld)) query = query.eq('target_level', parsedOld);
  const { error } = await query;
  if (error) throw error;

  // 2. Cascade theme_program_assignments (upsert new + remove old to avoid unique constraint conflicts)
  try {
    let oldAssignQuery = sb.from('theme_program_assignments')
      .select('id, program_id, target_level')
      .eq('theme_code', cleanCode);
    if (parsedOld !== null && !isNaN(parsedOld)) oldAssignQuery = oldAssignQuery.eq('target_level', parsedOld);
    const { data: oldAssigns } = await oldAssignQuery;

    if (oldAssigns && oldAssigns.length > 0) {
      const nowIso = new Date().toISOString();
      for (const a of oldAssigns) {
        const { error: upErr } = await sb.from('theme_program_assignments')
          .upsert({
            theme_code: cleanCode,
            target_level: parsedNew,
            program_id: a.program_id,
            is_active: true,
            updated_at: nowIso
          }, { onConflict: 'theme_code,target_level,program_id' });
        if (!upErr) {
          await sb.from('theme_program_assignments').delete().eq('id', a.id);
        }
      }
    }
  } catch (err) {
    console.warn('[updateVaultThemeLevelCascade] assign cascade notice:', err);
  }

  clearApiCache('vault');
  return true;
}

export async function updateVaultTopicCascade(oldTopic, newTopic, targetLevel = null, themeCode = null) {
  const sb = await getSupabase();
  let query = sb.from('vocabulary_vault')
    .update({ topic: newTopic, updated_at: new Date().toISOString() })
    .ilike('topic', String(oldTopic || '').trim())
    .is('deleted_at', null);
  if (targetLevel !== null && targetLevel !== undefined) query = query.eq('target_level', targetLevel);
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
  if (targetLevel !== null && targetLevel !== undefined) query = query.eq('target_level', targetLevel);
  if (themeCode) query = query.eq('theme_code', themeCode);
  const { error } = await query;
  if (error) throw error;
  clearApiCache('vault');
  return true;
}

export async function updateVaultTopicLevelCascade(topic, oldLevel, newLevel, themeCode = null) {
  const sb = await getSupabase();
  const parsedOld = (oldLevel !== null && oldLevel !== undefined) ? Number(oldLevel) : null;
  const parsedNew = (newLevel !== null && newLevel !== undefined) ? Number(newLevel) : null;
  let query = sb.from('vocabulary_vault')
    .update({ target_level: parsedNew, updated_at: new Date().toISOString() })
    .ilike('topic', String(topic || '').trim())
    .is('deleted_at', null);
  if (parsedOld !== null && !isNaN(parsedOld)) query = query.eq('target_level', parsedOld);
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
  if (targetLevel !== null && targetLevel !== undefined) query = query.eq('target_level', targetLevel);
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
  if (themeCode && (targetLevel !== null && targetLevel !== undefined)) {
    query = query.eq('theme_code', themeCode).eq('target_level', targetLevel);
  } else {
    query = query.ilike('theme', String(theme || '').trim());
    if (targetLevel !== null && targetLevel !== undefined) query = query.eq('target_level', targetLevel);
  }
  const { error } = await query;
  if (error) throw error;
  if (themeCode) {
    try {
      let assignQuery = sb.from('theme_program_assignments').delete().eq('theme_code', themeCode);
      if (targetLevel !== null && targetLevel !== undefined) assignQuery = assignQuery.eq('target_level', targetLevel);
      await assignQuery;
    } catch (_) {}
  }
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
    test_type = null,
    isStandalone = false,
    selectedThemes = ['A', 'B', 'C', 'D'],
    category = 'words'
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

  const isQuizStandalone = tier === 'QUIZ';
  const isPretestTier = tier === 'PRETEST';
  const isTryoutTier = tier === 'TRYOUT' || isStandalone || isQuizStandalone || isPretestTier;

  if (isTryoutTier) {
    // STANDALONE / QUIZ / PRETEST / TRYOUT: Gather words across selected themes without prerequisites
    let q = sb.from('vocabulary_vault')
      .select('id, topic, indonesian, english, word_type, target_level, theme, theme_code, topic_code, category')
      .is('deleted_at', null);
    if (!isAllLevels) q = q.eq('target_level', targetLevel);

    const activeThemes = (selectedThemes && selectedThemes.length > 0) ? selectedThemes : ['A', 'B', 'C', 'D'];
    q = q.in('theme_code', activeThemes);

    if (category === 'phrases' || testType === 'IDIOM_PROVERB') {
      q = q.in('word_type', ['Idiom', 'Proverb', 'Expression', 'Phrase']);
    } else if (category === 'words') {
      q = q.not('word_type', 'in', '("Idiom","Proverb","Expression","Phrase")');
    }

    const { data, error } = await q.order('theme_code').order('topic_code').order('indonesian');
    if (error) throw error;
    vaultWords = data || [];
    sourceTopics = [...new Set(vaultWords.map(w => w.topic || w.theme).filter(Boolean))];
  } else if (tier === 'TASK') {
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
    // TEST TIER: Aggregates from selected TASK tests (Cumulative theme/grand test)
    if (!sourceTaskIds || !sourceTaskIds.length) throw new Error('sourceTaskIds required for TEST tier aggregation.');

    // 1. Extract unique topics from source tasks payload
    const { data: sourceTests } = await sb.from('tests')
      .select('payload')
      .in('id', sourceTaskIds);
    const topicsSet = new Set();
    (sourceTests || []).forEach(t => {
      const top = t.payload?.topic || t.payload?.topics;
      if (Array.isArray(top)) top.forEach(x => topicsSet.add(x));
      else if (top) topicsSet.add(top);
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
    if (!sourceQuizIds.length && !sourceTaskIds.length) throw new Error('sourceTaskIds required for EXAM tier.');
    const effectiveSourceIds = sourceTaskIds.length ? sourceTaskIds : sourceQuizIds;
    const { data: sourceTests } = await sb.from('tests').select('payload').in('id', effectiveSourceIds);
    const topicsSet = new Set();
    (sourceTests || []).forEach(t => {
      const top = t.payload?.topic || t.payload?.topics;
      if (Array.isArray(top)) top.forEach(x => topicsSet.add(x));
      else if (top) topicsSet.add(top);
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

  // Resolve the final test_type (PostgreSQL enum 'quiz' | 'exam') and category ('TASK' | 'EXAM' | 'QUIZ' | 'PRETEST'):
  const isQuizTier = (tier === 'QUIZ' || tier === 'PRETEST' || tier === 'TASK' || String(test_type).toLowerCase() === 'quiz' || String(test_type).toLowerCase() === 'task');
  const resolvedType = isQuizTier ? 'quiz' : 'exam';
  const resolvedCategory = isPretestTier ? 'PRETEST' : (isQuizStandalone ? 'QUIZ' : (isQuizTier ? 'TASK' : 'EXAM'));

  let defaultAnswerType = answerType;
  if (testType === 'IDIOM_PROVERB' ) {
      defaultAnswerType = 'phrase_recognition';
  } else if (isTryoutTier) {
      defaultAnswerType = answerType || 'written';
  } else if (isQuizTier) {
      defaultAnswerType = 'spoken';
  } else {
      defaultAnswerType = 'spoken';
  }

  const cleanThemesStr = (selectedThemes && Array.isArray(selectedThemes) && selectedThemes.length > 0) ? selectedThemes.join('') : 'ALL';
  const catShellTag = category === 'phrases' ? 'PHRASE' : (category === 'all' ? 'COMP' : 'VOCAB');
  const tsTag = Date.now().toString(36).slice(-4).toUpperCase();
  const generatedShellCode = isPretestTier
    ? `PRETEST-${catShellTag}-L${targetLevel}-${cleanThemesStr}-${tsTag}`
    : isQuizStandalone
      ? `QUIZ-${catShellTag}-L${targetLevel}-${cleanThemesStr}-${tsTag}`
      : isTryoutTier
        ? `TRYOUT-${category === 'phrases' ? 'PHRASE' : 'VOCAB'}-L${targetLevel}-${cleanThemesStr}-${tsTag}`
        : null;

  const resolvedSubtype = isPretestTier
    ? 'VOCAB_PRETEST'
    : isQuizStandalone
      ? 'VOCAB_QUIZ_TEST'
      : isTryoutTier
        ? (category === 'phrases' ? 'PHRASE_TEST' : 'VOCAB_TEST')
        : ('VOCAB_' + (isQuizTier ? 'TASK' : 'EXAM'));

  const resolvedScheduleMode = isTryoutTier ? (scheduleMode === 'manual' ? 'manual' : 'flexible') : (scheduleMode || 'batch');

  const testPayload = {
    institution_id:           institutionId,
    program_id:               programId,
    class_id:                 classId,
    level_id:                 levelId,
    test_subtype:             resolvedSubtype,
    test_type:                resolvedType,
    category:                 resolvedCategory,
    shell_code:               generatedShellCode,
    is_dynamic_shell:         isTryoutTier ? true : false,
    title:                    title,
    description:              isPretestTier
      ? `Vocabulary Pre-Test (No Repetition, 1 Attempt Only) across Themes: ${(selectedThemes || ['A','B','C','D']).join(', ')} (${category === 'phrases' ? 'Phrases' : (category === 'all' ? 'Comprehensive' : 'Words')})`
      : isQuizStandalone
        ? `Vocabulary Quiz (No Repetition, Retakes Allowed) across Themes: ${(selectedThemes || ['A','B','C','D']).join(', ')} (${category === 'phrases' ? 'Phrases' : (category === 'all' ? 'Comprehensive' : 'Words')})`
        : isTryoutTier
          ? `Placement / Standalone Try-Out across Themes: ${(selectedThemes || ['A','B','C','D']).join(', ')} (${category === 'phrases' ? 'Phrases' : (category === 'all' ? 'Comprehensive' : 'Words')})`
          : 'Vocabulary Mastery (' + (isQuizTier ? 'Task' : 'Exam') + '). Topics: ' + sourceTopics.join(', '),
    status:                   'PUBLISHED',
    schedule_mode:            resolvedScheduleMode,
    max_attempts:             isPretestTier ? 1 : null,
    availability_start:       windowStart || null,
    availability_end:         windowEnd || null,
    working_duration_minutes: durationMinutes || null,
    prerequisite_test_id:     isTryoutTier ? null : (
      ((tier === 'QUIZ' || tier === 'TASK') && sourceTaskIds.length > 0) ? sourceTaskIds[0] :
      (tier === 'EXAM' && (sourceTaskIds.length > 0 || sourceQuizIds.length > 0)) ? (sourceTaskIds[0] || sourceQuizIds[0]) :
      (tier === 'TEST' && sourceTaskIds.length > 0) ? sourceTaskIds[sourceTaskIds.length - 1] : null
    ),
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
      if (isTryoutTier) currentAnswerType = defaultAnswerType;
      else if (tier === 'TASK') currentAnswerType = 'spoken';
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

  // Modern tests store questions directly in payload
  const payloadToStore = {
    questions: aqRows,
    total_questions: aqRows.length,
    is_dynamic_shell: true,
    tier: tier,
    is_standalone_tryout: isTryoutTier,
    is_placement_test: tier === 'TRYOUT',
    no_repetition: isTryoutTier,
    no_prerequisites: isTryoutTier,
    include_in_score: isQuizStandalone ? true : (isPretestTier ? false : undefined),
    max_attempts: isPretestTier ? 1 : null,
    themes: isTryoutTier ? (selectedThemes || ['A', 'B', 'C', 'D']) : null,
    category: isTryoutTier ? category : (testType === 'IDIOM_PROVERB' ? 'phrases' : 'words'),
    duration_minutes: durationMinutes,
    working_duration_minutes: durationMinutes,
    answer_type: defaultAnswerType,
    question_order: questionOrder,
    schedule_mode: resolvedScheduleMode
  };

  await sb.from('tests').update({
    payload: payloadToStore
  }).eq('id', testId);

  clearApiCache('vault');
  clearApiCache('tests');
  clearApiCache('vault');
  clearAdminCache('tests');
  clearAdminCache('vocabulary_vault');
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

  const currentLevelNum = levelData.level_number != null ? levelData.level_number : 1;
  if (currentLevelNum === 0 || currentLevelNum === 99) {
    return { levelUp: false, newLevel: null, status: 'NO_NEXT_LEVEL' };
  }
  if (currentLevelNum >= 3) {
    const { data: alumniLvl } = await sb.from('levels').select('id, name').eq('level_number', 99).single();
    await sb.from('students').update({ program_status: 'ALUMNI', level_id: alumniLvl?.id || null }).eq('id', studentId);
    return { levelUp: true, newLevel: 'Alumni', status: 'ALUMNI' };
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

export async function fetchFullStudentProfile(studentId) {
  const sb = await getSupabase();
  const { data, error } = await sb.from('students')
    .select(`
      id, name, gender, birth_date, education, province, city, district, village, photo_url, photo_status,
      level_id,
      levels:level_id(id, level_number, name),
      batch_id,
      batches:batch_id(id, name, enrollment_date, current_level_id, levels:current_level_id(id, level_number, name)),
      program_id,
      programs:program_id(id, name, institution_id, institutions(id, name, code))
    `)
    .eq('id', studentId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("fetchFullStudentProfile Error:", error);
    return null;
  }

  const lvlId = data.level_id || data.batches?.current_level_id || null;
  const lvlNum = data.levels?.level_number != null ? data.levels.level_number : (data.batches?.levels?.level_number != null ? data.batches.levels.level_number : 1);
  const lvlName = data.levels?.name || data.batches?.levels?.name || (lvlNum === 0 ? 'Non-Level' : (lvlNum === 99 ? 'Alumni' : '1st Level'));

  return {
    ...data,
    resolved_level: { level_id: lvlId, level_number: lvlNum, level_name: lvlName }
  };
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
  const lvlNum = data.levels?.level_number != null ? data.levels.level_number : (data.batches?.levels?.level_number != null ? data.batches.levels.level_number : 1);
  const lvlName = data.levels?.name || data.batches?.levels?.name || (lvlNum === 0 ? 'Non-Level' : (lvlNum === 99 ? 'Alumni' : '1st Level'));
  return { level_id: lvlId, level_number: lvlNum, level_name: lvlName };
}

export async function exportVaultWords(mode = 'all') {
  const sb = await getSupabase();
  let query = sb.from('vocabulary_vault')
    .select('id, target_level, theme_code, theme, topic_code, topic, indonesian, english, word_type, created_at, category')
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
                const effGrade = effScore >= (totalQ * 0.6) ? 'C' : (effScore >= (totalQ * 0.3) ? 'D' : 'E');
                await sb.from('attempts')
                  .update({
                    is_remedial_unlocked: true,
                    effective_score: effScore,
                    grade: effGrade,
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

  // Helper to accurately identify milestone exams vs tasks
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
  await logAuditEvent({
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
 * Safe, non-blocking audit logging helper (Rule 2.19).
 * Validates UUID entity_id and suppresses RLS 401 permission errors so essential operations never fail.
 */
export async function logAuditEvent(logData) {
  if (!logData) return;
  try {
    const sb = await getSupabase();
    const isUuid = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    const safeEntityId = isUuid(logData.entity_id) ? logData.entity_id : null;

    const payload = {
      actor_role: logData.actor_role || 'ADMIN',
      action: logData.action || 'GENERAL_ACTION',
      entity_type: logData.entity_type || 'system',
      entity_id: safeEntityId,
      new_value: logData.new_value || null,
      old_value: logData.old_value || null,
      created_at: logData.created_at || new Date().toISOString()
    };

    const { error } = await sb.from('audit_logs').insert(payload);
    if (error) {
      console.warn('[logAuditEvent] Audit log write skipped (RLS/policy):', error.message || error);
    }
  } catch (err) {
    console.warn('[logAuditEvent] Audit log suppressed:', err?.message || err);
  }
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
  reason = 'Pacing Adjustment',
  skipAudit = false
}) {
  const sb = await getSupabase();
  if (!classId) throw new Error('classId is required for Forgiven / Override.');
  if (!studentIds.length) throw new Error('No students selected.');
  if (!testActions.length) throw new Error('No test actions specified.');

  const nowIso = new Date().toISOString();
  const inserts = [];
  const updates = [];
  const affectedSet = new Set();
  const claimedAttIds = new Set();

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
        const itemReason = (ta.reason || reason || 'Pacing Adjustment').trim();
        const forgiveReasonText = `[${adminLabel}] ${itemReason}`;
        const submittedAtts = existingAtts.filter(a =>
          ['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(String(a.status || '').toLowerCase())
        );

        if (submittedAtts.length > 0) {
          submittedAtts.sort((x, y) => Number(y.percentage || y.score || 0) - Number(x.percentage || x.score || 0));
          const topAtt = submittedAtts[0];
          const currPct = Number(topAtt.percentage || topAtt.score || 0);
          updates.push({
            id: topAtt.id,
            grade: _gradeForScore(currPct),
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

      } else if (action === 'manual_reps' || (action === 'manual' && ta.reason && ta.reason.includes('MANUAL_REPS'))) {
        const isUnifiedTask = !isExamTest && Boolean(
          (meta?.shell_code && meta.shell_code.includes('-TASK')) ||
          meta?.payload?.tier === 'TASK' ||
          meta?.category === 'TASK'
        );
        const parsedM = ta.reason ? String(ta.reason).match(/MANUAL_REPS:?\s*(\d+)(?:\/(\d+))?/i) : null;
        const requestedReps = ta.reps != null ? Number(ta.reps) : (parsedM ? parseInt(parsedM[1], 10) : 0);
        let defaultMax = (isUnifiedTask && requestedReps > 7) ? 14 : 7;
        let maxReps = Number(ta.maxReps || (parsedM && parsedM[2] ? parseInt(parsedM[2], 10) : defaultMax));
        let reps = Math.max(0, Math.min(maxReps, requestedReps));

        const passPct = 70.0; // Rule 2.4.1 / SSOT minimal passing 70% per process
        const sc = Math.round(totalQ * (passPct / 100));
        const compTag = ta.section
          ? ` ${String(ta.section).toUpperCase()}`
          : (ta.reason && /PHRASES?/i.test(ta.reason) ? ' PHRASES' : (ta.reason && /WORDS?/i.test(ta.reason) ? ' WORDS' : ''));
        const manualReason = `[${adminLabel}] MANUAL_REPS: ${reps}/${maxReps}${compTag}`;

        const submittedAtts = existingAtts.filter(a =>
          ['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(String(a.status || '').toLowerCase())
        );

        if (reps > 0) {
          // Provide minimal passing score (70% / Grade C) for each repetition process
          // Rule 2.6 SSOT: Unified Tasks require symmetric 7 Words + 7 Phrases partition
          const isSplitReps = reps > 7 || (isUnifiedTask && reps === 14) || (isUnifiedTask && reps > 0 && !compTag);
          for (let r = 0; r < reps; r++) {
            const isBest = (r === reps - 1);
            let itemReason = manualReason;
            let itemTotalQ = totalQ;
            let itemSc = sc;

            if (isSplitReps) {
              const halfMax = Math.max(1, Math.floor(reps / 2));
              const isWordHalf = r < halfMax;
              if (isWordHalf) {
                itemReason = `[${adminLabel}] MANUAL_REPS: ${halfMax}/${halfMax} WORDS`;
                itemTotalQ = totalQ;
                itemSc = sc;
              } else {
                itemReason = `[${adminLabel}] MANUAL_REPS: ${halfMax}/${halfMax} PHRASES`;
                itemTotalQ = Math.min(totalQ, 10);
                itemSc = Math.round(itemTotalQ * (passPct / 100));
              }
            }

            const usableAtt = (r < submittedAtts.length)
              ? submittedAtts[r]
              : existingAtts.find(a => !claimedAttIds.has(a.id));

            if (usableAtt) {
              claimedAttIds.add(usableAtt.id);
              updates.push({
                id: usableAtt.id,
                score: itemSc,
                correct_count: itemSc,
                total_questions: itemTotalQ,
                percentage: passPct,
                effective_score: passPct,
                grade: 'C',
                status: 'submitted',
                is_best_score: isBest,
                is_forgiven: false,
                forgiven_by: validForgivenBy,
                forgiven_at: nowIso,
                forgiven_reason: itemReason,
                submitted_at: usableAtt.submitted_at || nowIso,
                updated_at: nowIso
              });
            } else {
              const newAtt = {
                id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined,
                student_id: sId,
                test_id: testId,
                attempt_number: (existingAtts.length || 0) + 1,
                started_at: nowIso,
                expires_at: nowIso,
                submitted_at: nowIso,
                status: 'submitted',
                score: itemSc,
                correct_count: itemSc,
                total_questions: itemTotalQ,
                percentage: passPct,
                effective_score: passPct,
                grade: 'C',
                is_best_score: isBest,
                is_forgiven: false,
                forgiven_by: validForgivenBy,
                forgiven_at: nowIso,
                forgiven_reason: itemReason,
                created_at: nowIso,
                updated_at: nowIso
              };
              if (!newAtt.id) delete newAtt.id;
              else claimedAttIds.add(newAtt.id);
              inserts.push(newAtt);
              existingAtts.push(newAtt);
            }
          }
          // Any remaining attempts beyond reps: mark is_best_score = false
          for (let r = reps; r < submittedAtts.length; r++) {
            const att = submittedAtts[r];
            if (att.is_best_score) {
              updates.push({ id: att.id, is_best_score: false, updated_at: nowIso });
            }
          }
        } else if (reps === 0 && submittedAtts.length > 0) {
          // Clean up synthetic MANUAL_REPS attempts so reset-to-0 persists cleanly
          for (const att of submittedAtts) {
            if (att.forgiven_reason && att.forgiven_reason.includes('MANUAL_REPS')) {
              const { error: delErr } = await sb.from('attempts').delete().eq('id', att.id);
              if (delErr) throw delErr;
            }
          }
        }
        affectedSet.add(`${sId}_${testId}`);

      } else if (action === 'manual') {
        const isUnifiedTask = !isExamTest && Boolean(
          (meta?.shell_code && meta.shell_code.includes('-TASK')) ||
          meta?.payload?.tier === 'TASK' ||
          meta?.category === 'TASK'
        );
        const section = ta.section ? String(ta.section).toLowerCase() : null;
        const defaultExamTotalQ = section === 'words' ? 160 : (section === 'phrases' ? 40 : 200);
        let rawTotalQ = Number(ta.totalQ || (isExamTest ? defaultExamTotalQ : (meta?.payload?.total_questions || 40)));
        // Strict Exam Invariant Guard (Rule 2.5 SSOT):
        // Milestone exams can NEVER have total_questions = 10 (which is strictly for formative topic task repetitions).
        if (isExamTest) {
          if (section === 'phrases' || (rawTotalQ > 0 && rawTotalQ <= 40)) {
            rawTotalQ = 40;
          } else if (section === 'words' || (rawTotalQ > 40 && rawTotalQ <= 160)) {
            rawTotalQ = 160;
          } else if (!section && rawTotalQ < 120) {
            rawTotalQ = (meta?.payload?.total_questions && meta.payload.total_questions >= 120)
              ? Number(meta.payload.total_questions)
              : 200;
          }
        }
        const totalQ = rawTotalQ;
        const pct = Math.max(0, Math.min(100, Number(inputPct) || 0));
        let sc = inputScore != null
          ? Number(inputScore)
          : Math.round(totalQ * (pct / 100) * 10) / 10;
        // Anti-Loophole Guard: If an attempt was sent with a small score (e.g. 7 when denominator was 10) but percentage is >= 60, re-evaluate with the guarded denominator
        if (isExamTest && pct >= 60 && sc <= 10 && totalQ >= 40) {
          sc = Math.round(totalQ * (pct / 100));
        }
        const grade = _gradeForScore(pct);
        const itemReason = (ta.reason || reason || '').trim();
        const sectionTag = section ? `[SECTION: ${section.toUpperCase()}] ` : '';
        const baseManualReason = `${sectionTag}MANUAL_OVERRIDE: ${pct}% (${sc}/${totalQ} PTS) by ${adminLabel}${itemReason ? ': ' + itemReason : ''}`.trim();
        const manualReason = isUnifiedTask ? `${baseManualReason} [WORDS]` : baseManualReason;

        const submittedAtts = existingAtts.filter(a =>
          ['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(String(a.status || '').toLowerCase())
        );

        let targetAtt = null;
        if (section === 'words') {
          targetAtt = submittedAtts.find(a => {
            if (claimedAttIds.has(a.id)) return false;
            const fr = String(a.forgiven_reason || '');
            const tQ = Number(a.total_questions || 0);
            return fr.includes('[SECTION: WORDS]') || (tQ > 40 && tQ <= 160);
          });
        } else if (section === 'phrases') {
          targetAtt = submittedAtts.find(a => {
            if (claimedAttIds.has(a.id)) return false;
            const fr = String(a.forgiven_reason || '');
            const tQ = Number(a.total_questions || 0);
            return fr.includes('[SECTION: PHRASES]') || (tQ > 0 && tQ <= 40);
          });
        } else {
          targetAtt = submittedAtts.find(a => !claimedAttIds.has(a.id));
        }

        // Defensive: If no submitted attempt found, claim ANY existing attempt (such as 'in_progress' or unsubmitted)
        // so that in-progress attempts are cleanly repurposed to submitted rather than orphaned!
        if (!targetAtt) {
          targetAtt = existingAtts.find(a => !claimedAttIds.has(a.id));
        }

        if (targetAtt) {
          claimedAttIds.add(targetAtt.id);
          updates.push({
            id: targetAtt.id,
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
            submitted_at: targetAtt.submitted_at || nowIso,
            updated_at: nowIso
          });
          targetAtt.score = sc;
          targetAtt.correct_count = Math.round(sc);
          targetAtt.total_questions = totalQ;
          targetAtt.percentage = pct;
          targetAtt.effective_score = pct;
          targetAtt.grade = grade;
          targetAtt.status = 'submitted';
          targetAtt.is_best_score = true;
          targetAtt.forgiven_reason = manualReason;
          targetAtt.updated_at = nowIso;

          // Demote any other attempts for this test
          existingAtts.forEach(att => {
            if (att.id !== targetAtt.id && att.is_best_score) {
              updates.push({ id: att.id, is_best_score: false, updated_at: nowIso });
            }
          });
        } else {
          const newAtt = {
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined,
            student_id: sId,
            test_id: testId,
            attempt_number: (existingAtts.length || 0) + 1,
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
          };
          if (!newAtt.id) delete newAtt.id;
          else claimedAttIds.add(newAtt.id);
          inserts.push(newAtt);
          existingAtts.push(newAtt);

          // Demote existing attempts
          existingAtts.forEach(att => {
            if (att.id !== newAtt.id && att.is_best_score) {
              updates.push({ id: att.id, is_best_score: false, updated_at: nowIso });
            }
          });
        }

        // Rule 2.6 SSOT: For Unified Tasks only (NOT Exams), guarantee Phrases companion attempt is synchronized
        if (isUnifiedTask && !section && pct >= 60) {
          const phrAtts = submittedAtts.filter(a =>
            !claimedAttIds.has(a.id) && (
              (a.forgiven_reason && /PHRASES?/i.test(a.forgiven_reason)) ||
              (Number(a.total_questions || 0) > 0 && Number(a.total_questions || 0) <= 20)
            )
          );
          const phrTotalQ = 10;
          const phrSc = Math.round(phrTotalQ * (pct / 100));
          const phrReason = `${baseManualReason} [PHRASES]`;

          if (phrAtts.length > 0) {
            claimedAttIds.add(phrAtts[0].id);
            updates.push({
              id: phrAtts[0].id,
              score: phrSc,
              correct_count: phrSc,
              total_questions: phrTotalQ,
              percentage: pct,
              effective_score: pct,
              grade,
              status: 'submitted',
              is_best_score: false,
              is_forgiven: false,
              forgiven_by: validForgivenBy,
              forgiven_at: nowIso,
              forgiven_reason: phrReason,
              updated_at: nowIso
            });
            phrAtts[0].score = phrSc;
            phrAtts[0].total_questions = phrTotalQ;
            phrAtts[0].percentage = pct;
          } else {
            const newPhrAtt = {
              student_id: sId,
              test_id: testId,
              attempt_number: (existingAtts.length || 0) + 1,
              started_at: nowIso,
              expires_at: nowIso,
              submitted_at: nowIso,
              status: 'submitted',
              score: phrSc,
              correct_count: phrSc,
              total_questions: phrTotalQ,
              percentage: pct,
              effective_score: pct,
              grade,
              is_best_score: false,
              is_forgiven: false,
              forgiven_by: validForgivenBy,
              forgiven_at: nowIso,
              forgiven_reason: phrReason,
              created_at: nowIso,
              updated_at: nowIso
            };
            inserts.push(newPhrAtt);
            existingAtts.push(newPhrAtt);
          }
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

  // Audit log per Rule 2.19 (unless suppressed by batch caller)
  if (!skipAudit) {
    await logAuditEvent({
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
    const effPct = parseFloat(a.percentage ?? a.score ?? 0);
    const restoredGrade = a.is_remedial ? 'R' : getGrade(effPct);
    await sb.from('attempts').update({
      is_forgiven: false,
      forgiven_by: null,
      forgiven_at: null,
      forgiven_reason: null,
      effective_score: effPct,
      grade: restoredGrade,
      updated_at: nowIso
    }).eq('id', a.id);
  }

  // Re-resolve is_best_score for all affected (student_id, test_id) combinations
  const comboKeys = new Set();
  const affectedCombos = [];
  studentIds.forEach(sid => {
    testIds.forEach(tid => {
      const key = `${sid}_${tid}`;
      if (!comboKeys.has(key)) {
        comboKeys.add(key);
        affectedCombos.push({ studentId: sid, testId: tid });
      }
    });
  });

  for (const combo of affectedCombos) {
    const { data: remAtts } = await sb.from('attempts')
      .select('id, effective_score, percentage, is_forgiven, is_remedial, created_at')
      .eq('student_id', combo.studentId)
      .eq('test_id', combo.testId)
      .in('status', ['submitted', 'auto_submitted', 'evaluated']);
    if (remAtts && remAtts.length > 0) {
      remAtts.sort((a, b) => {
        const scoreA = Number(a.effective_score ?? a.percentage ?? 0);
        const scoreB = Number(b.effective_score ?? b.percentage ?? 0);
        const aQual = a.is_forgiven || scoreA >= 60;
        const bQual = b.is_forgiven || scoreB >= 60;
        if (aQual !== bQual) return bQual ? 1 : -1;
        if (scoreB !== scoreA) return scoreB - scoreA;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      const bestId = remAtts[0].id;
      for (const a of remAtts) {
        await sb.from('attempts').update({ is_best_score: a.id === bestId }).eq('id', a.id);
      }
    }
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
  if (n === 0 || n === '0' || n == null) return '';
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

/**
 * Authoritative mathematical duration calibration standard (SSOT DECISION-063 Khusus Vocabulary Class):
 * Working Duration (Minutes) = Math.ceil((questionCount * secondsPerQuestion) / 60)
 *
 * Rates:
 * - Words: 10s spoken, 15s written, 10s selection (multiple choice)
 * - Phrases: 20s spoken, 10s selection (multiple choice), 20s written
 *
 * @param {number} questionCount - Number of questions
 * @param {string} answerType - 'spoken', 'written', 'selection', 'multiple_choice', etc.
 * @param {string} category - 'words' or 'phrases'
 * @param {number|null} customPace - Optional custom seconds per item override
 * @param {number} minMinutes - Minimum allowed minutes (default 1)
 * @returns {number} Duration in minutes
 */
export function calculateAutoDurationMinutes(questionCount, answerType = 'spoken', category = 'words', customPace = null, minMinutes = 1) {
  const count = Number(questionCount) || 0;
  if (count <= 0) return Math.max(minMinutes, 1);

  const isPhrase = String(category).toLowerCase() === 'phrases' || String(answerType).toLowerCase().includes('phrase');
  const ansType = String(answerType || '').toLowerCase();

  // Uniform pacing for both Words and Phrases (15s written, 10s spoken/selection)
  let rate = (ansType === 'written') ? 15 : 10;

  if (customPace && Number(customPace) > 0) {
    rate = Number(customPace);
  }

  return Math.max(minMinutes, Math.ceil((count * rate) / 60));
}

/**
 * Calculate unified exam duration for Vocabulary Class combining Words and Phrases sections (DECISION-063 SSOT):
 * Words: 10s spoken, 15s written, 10s selection
 * Phrases: 20s spoken, 10s selection, 20s written
 */
export function calculateVocabUnifiedDurationMinutes({
  wordsCount = 160,
  phrasesCount = 40,
  wordsMode = 'written',
  phrasesMode = 'multiple_choice',
  minMinutes = 1
} = {}) {
  const wAns = String(wordsMode || 'written').toLowerCase();
  const pAns = String(phrasesMode || 'multiple_choice').toLowerCase();

  const wRate = (wAns === 'written') ? 15 : 10;
  const pRate = (pAns === 'selection' || pAns === 'multiple_choice') ? 10 : 20;

  const totalSeconds = (Number(wordsCount) * wRate) + (Number(phrasesCount) * pRate);
  return Math.max(minMinutes, Math.ceil(totalSeconds / 60));
}

export async function upsertDynamicTestShell(config) {
  const sb = await getSupabase();
  const {
    institutionId, programId, classId, levelId, levelNum = 3,
    tier, themeName, topicName, description,
    themeCode, topicCode,
    modulePrefix = 'VOCAB',
    category = 'words',
    durationMinutes = null,
    wordsDurationMinutes = null,
    phrasesDurationMinutes = null,
    wordsAnswerType = null,
    phrasesAnswerType = null,
    prerequisiteId = null,
    moduleId = null,
    answerType = null,
    displayOrder = 1,
    questionOrder = 'random'
  } = config;

  const isTest = tier === 'TEST' || tier === 'EXAM';
  const isPhrase = category === 'phrases' || modulePrefix === 'PHRASE';
  const isUnified = category === 'unified' || modulePrefix === 'UNIFIED';

  // Standardized Shell Code: PROGRAM-LEVEL_CLASS-CODE-TYPE (SSOT AGENTS.md § 2.6 / DECISION-077)
  // e.g. CAMP-3VCB-A1-TASK, CAMP-3VCB-D-EXAM
  const cleanTopCode = topicCode ? String(topicCode).replace(/^[A-Za-z]/, '') : '1';
  const cleanTitle = (topicName || themeName || '').replace(/["']/g, '').trim();

  let rawProgCode = (config.programCode || 'CAMP').toUpperCase();
  if (rawProgCode === 'CMP') rawProgCode = 'CAMP';
  else if (rawProgCode === 'EVN' || rawProgCode === 'EEC') rawProgCode = 'EVNK';
  else if (rawProgCode === 'SHR' || rawProgCode === 'SHERATON') rawProgCode = 'SHRT';
  else if (rawProgCode === 'TMT' || rawProgCode === 'TAMATA') rawProgCode = 'TPTC';
  const progCode = rawProgCode;
  const classShort = (config.classShort || (levelNum === 0 ? 'VCB' : `${levelNum}VCB`)).toUpperCase();

  const codeThemeTopic = levelNum === 0 ? `0${themeCode}${cleanTopCode}` : `${themeCode}${cleanTopCode}`;
  const codeThemeExam = levelNum === 0 ? `0${themeCode}` : `${themeCode}`;

  const code = (isUnified || levelNum === 2)
    ? (isTest ? `${progCode}-${classShort}-${codeThemeExam}-EXAM` : `${progCode}-${classShort}-${codeThemeTopic}-TASK`)
    : (isPhrase
        ? (isTest ? `${progCode}-${classShort}-${codeThemeExam}-PHRASES-EXAM` : `${progCode}-${classShort}-${codeThemeTopic}-PHRASES-TASK`)
        : (isTest ? `${progCode}-${classShort}-${codeThemeExam}-WORDS-EXAM` : `${progCode}-${classShort}-${codeThemeTopic}-WORDS-TASK`));

  // Standardized Test Name (SSOT AGENTS.md § 2.6 / DECISION-077):
  // Formula: [LEVEL_ORDINAL] [CLASS_NAME] [TASK/EXAM] [CODE] - [TOPIC/THEME_NAME]
  // On Level 0 (non-leveled), [LEVEL_ORDINAL] is omitted per Zero-Level Omission Invariant
  const ordinal = toOrdinal(levelNum);
  const prefix = ordinal ? `${ordinal} ` : '';
  const classTitlePart = (levelNum === 0 && config.className) ? config.className : 'Vocabulary';
  const generatedTitle = (isUnified || levelNum === 2)
    ? (isTest
        ? `${prefix}${classTitlePart} Exam ${codeThemeExam}${cleanTitle ? ' - ' + cleanTitle : ''}`
        : `${prefix}${classTitlePart} Task ${codeThemeTopic}${cleanTitle ? ' - ' + cleanTitle : ''}`)
    : (isPhrase
        ? (isTest
            ? `${prefix}${classTitlePart} Phrases Exam ${codeThemeExam}${cleanTitle ? ' - ' + cleanTitle : ''}`
            : `${prefix}${classTitlePart} Phrases Task ${codeThemeTopic}${cleanTitle ? ' - ' + cleanTitle : ''}`)
        : (isTest
            ? `${prefix}${classTitlePart} Words Exam ${codeThemeExam}${cleanTitle ? ' - ' + cleanTitle : ''}`
            : `${prefix}${classTitlePart} Words Task ${codeThemeTopic}${cleanTitle ? ' - ' + cleanTitle : ''}`));

  // Default answer types: Spoken for Tasks (Words & Phrases), Spoken for Words Exam, Selection for Phrases Exam
  const defaultAnswerType = isTest ? (isPhrase ? 'selection' : (isUnified ? 'spoken' : 'written')) : 'spoken';

  // Expected question counts (Cumulative per theme for exams)
  let expectedQuestions = (config.totalQuestions !== undefined && config.totalQuestions !== null && Number(config.totalQuestions) > 0)
    ? Number(config.totalQuestions)
    : 40;
  if (!config.totalQuestions) {
    if (levelNum === 0) {
      expectedQuestions = isUnified ? 50 : 40;
    } else if (isUnified) {
      if (!isTest) {
        expectedQuestions = 50;
      } else {
        const th = (themeCode || '').toUpperCase();
        if (th === 'A') expectedQuestions = 200;
        else if (th === 'B') expectedQuestions = 400;
        else if (th === 'C') expectedQuestions = 600;
        else if (th === 'D') expectedQuestions = 800;
        else expectedQuestions = 200;
      }
    } else if (!isTest) {
      expectedQuestions = isPhrase ? 10 : 40;
    } else {
      const th = (themeCode || '').toUpperCase();
      if (th === 'A') expectedQuestions = isPhrase ? 30 : 120;
      else if (th === 'B') expectedQuestions = isPhrase ? 70 : 280;
      else if (th === 'C') expectedQuestions = isPhrase ? 110 : 440;
      else if (th === 'D') expectedQuestions = isPhrase ? 150 : 600;
      else expectedQuestions = isPhrase ? 30 : 120;
    }
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
            `${progCode}-${classShort}-${codeThemeExam}-WORDS-EXAM`,
            `${progCode}-${classShort}-${codeThemeExam}-EXAM`,
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
            `${progCode}-${classShort}-${codeThemeTopic}-WORDS-TASK`,
            `${progCode}-${classShort}-${codeThemeTopic}-TASK`,
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

    const altProgPrefixes = ['EVN', 'CMP', 'SHR', 'TMT', 'EEC', 'CAMP', 'EVNK', 'SHRT', 'TPTC'];
    for (const altP of altProgPrefixes) {
      if (isTest) {
        legacyCodes.push(`${altP}-${classShort}-${codeThemeExam}-WORDS-EXAM`);
        legacyCodes.push(`${altP}-${classShort}-${codeThemeExam}-EXAM`);
        legacyCodes.push(`${altP}-${classShort}-${codeThemeExam}-PHRASES-EXAM`);
      } else {
        legacyCodes.push(`${altP}-${classShort}-${codeThemeTopic}-WORDS-TASK`);
        legacyCodes.push(`${altP}-${classShort}-${codeThemeTopic}-TASK`);
        legacyCodes.push(`${altP}-${classShort}-${codeThemeTopic}-PHRASES-TASK`);
      }
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
  const effectiveDurationMinutes = (durationMinutes !== null && durationMinutes !== undefined && Number(durationMinutes) > 0)
    ? Number(durationMinutes)
    : calculateAutoDurationMinutes(expectedQuestions, effectiveAnswerType, isPhrase ? 'phrases' : 'words');
  const effectiveMinScore = config.minimumRequiredScore !== undefined
    ? Number(config.minimumRequiredScore)
    : 60;

  // Cumulative theme determination for weekly milestone tests (Level 0 non-leveled programs stay strictly single-theme)
  const allThemesList = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const themeIdx = allThemesList.indexOf((themeCode || '').toUpperCase());
  const cumulativeThemes = (isTest && levelNum !== 0 && themeIdx !== -1)
    ? allThemesList.slice(0, themeIdx + 1)
    : (themeCode ? [themeCode.toUpperCase()] : []);

  const asmData = {
    institution_id:             institutionId,
    program_id:                 programId,
    class_id:                   classId || (existing ? existing.class_id : null),
    level_id:                   levelId,
    module_id:                  moduleId,
    test_subtype:               isUnified ? (isTest ? 'UNIFIED_EXAM' : 'UNIFIED_TASK') : (isTest ? (isPhrase ? 'PHRASE_EXAM' : 'VOCAB_EXAM') : (isPhrase ? 'PHRASE_TASK' : 'VOCAB_TASK')),
    test_type:                  isTest ? 'exam' : 'quiz',
    category:                   isTest ? 'EXAM' : 'TASK',
    shell_code:                 code,
    title:                      generatedTitle,
    display_name:               null,
    description:                description || `${isTest ? 'Exam' : 'Task'}: ${themeCode}/${topicCode || 'ALL'} (${isUnified ? 'Words & Phrases' : (isPhrase ? 'Phrases' : 'Words')})`,
    status:                     'PUBLISHED',
    working_duration_minutes:   effectiveDurationMinutes,
    minimum_required_score:     effectiveMinScore,
    prerequisite_test_id:       (existing && prerequisiteId === existing.id) ? null : prerequisiteId,
    answer_type:                effectiveAnswerType,
    question_order:             questionOrder,
    is_dynamic_shell:           true,
    display_order:              displayOrder,
    payload:                    {
      ...(existing?.payload || {}),
      is_dynamic_shell: true,
      is_unified: isUnified,
      is_unified_test: isUnified,
      theme_code: themeCode,
      themes: isTest ? cumulativeThemes : (themeCode ? [themeCode] : null),
      is_cumulative: isTest,
      topic_code: isTest ? null : (topicCode || null),
      category: isUnified ? 'unified' : (isPhrase ? 'phrases' : 'words'),
      answer_type: effectiveAnswerType,
      question_order: questionOrder,
      shell_code: code,
      tier: isTest ? 'EXAM' : 'TASK',
      working_duration_minutes: effectiveDurationMinutes,
      duration_minutes: effectiveDurationMinutes,
      ...(wordsDurationMinutes !== null && wordsDurationMinutes !== undefined ? { words_duration_minutes: Number(wordsDurationMinutes) } : {}),
      ...(phrasesDurationMinutes !== null && phrasesDurationMinutes !== undefined ? { phrases_duration_minutes: Number(phrasesDurationMinutes) } : {}),
      ...(wordsAnswerType ? { words_answer_type: wordsAnswerType } : {}),
      ...(phrasesAnswerType ? { phrases_answer_type: phrasesAnswerType } : {}),
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

    return { testId: existing.id, action: 'updated' };
  } else {
    asmData.created_at = new Date().toISOString();
    const { data: newTest, error } = await sb.from('tests').insert(asmData).select('id').single();
    if (error) throw error;
    return { testId: newTest.id, action: 'inserted' };
  }
}

function extractThemeCodeFromTestRow(row) {
  const rawPayloadCode = row?.payload?.theme_code;
  if (rawPayloadCode) return String(rawPayloadCode).trim().toUpperCase();
  const shellMatch = row?.shell_code && row.shell_code.match(/-\d?([A-Z])(?:\d+)?-(?:TASK|EXAM|TEST|QUIZ)/i);
  if (shellMatch) return shellMatch[1].toUpperCase();
  const titleMatch = row?.title && row.title.match(/(?:Task|Exam|Test|Vocabulary)\s+\d?([A-Z])(?:\d+)?/i);
  if (titleMatch) return titleMatch[1].toUpperCase();
  return '';
}

export async function updateClassTestsConfig(params = {}) {
  const sb = await getSupabase();
  const {
    classId,
    themeCodes = null,
    taskDurationMinutes = 15,
    wordsTaskDurationMinutes = 15,
    phrasesTaskDurationMinutes = 10,
    taskAnswerType = 'spoken',
    wordsTaskAnswerType,
    phrasesTaskAnswerType,
    taskPassingScore = 60,
    wordsTestAnswerType = 'spoken',
    phrasesTestAnswerType = 'selection',
    testPassingScore = 60,
    taskQuestionOrder = 'random',
    examQuestionOrder = 'random',
    taskRepetitions
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
  const allowedThemes = (Array.isArray(themeCodes) && themeCodes.length > 0)
    ? new Set(themeCodes.map(t => String(t).trim().toUpperCase()))
    : null;

  // Build actual Vault question count lookup per topic_code and theme_code for this class
  const vaultTopicWords = new Map();
  const vaultTopicPhrases = new Map();
  const vaultThemeWords = new Map();
  const vaultThemePhrases = new Map();
  try {
    const { data: clsInfo } = await sb.from('classes').select('program_id, levels!level_id(level_number)').eq('id', classId).maybeSingle();
    const lvlNum = clsInfo?.levels?.level_number;
    const progId = clsInfo?.program_id;
    if (lvlNum !== undefined && lvlNum !== null) {
      const { data: vWords } = await sb
        .from('vocabulary_vault')
        .select('theme_code, topic_code, word_type, category')
        .eq('target_level', lvlNum)
        .is('deleted_at', null);
      for (const w of (vWords || [])) {
        const tc = String(w.theme_code || '').trim().toUpperCase();
        const top = String(w.topic_code || '').trim().toUpperCase();
        const wt = String(w.word_type || '').toLowerCase();
        const isPhr = ['expression', 'idiom', 'proverb', 'phrase'].includes(wt) || w.category === 'phrases';
        if (tc) {
          if (isPhr) vaultThemePhrases.set(tc, (vaultThemePhrases.get(tc) || 0) + 1);
          else vaultThemeWords.set(tc, (vaultThemeWords.get(tc) || 0) + 1);
        }
        if (top) {
          if (isPhr) vaultTopicPhrases.set(top, (vaultTopicPhrases.get(top) || 0) + 1);
          else vaultTopicWords.set(top, (vaultTopicWords.get(top) || 0) + 1);
        }
      }
    }
  } catch (_) {}

  for (const row of rows) {
    if (allowedThemes) {
      const rowTheme = extractThemeCodeFromTestRow(row);
      if (!allowedThemes.has(rowTheme)) continue;
    }
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
    const isUnified = row.category === 'unified'
      || (row.payload && (row.payload.category === 'unified' || row.payload.is_unified === true || row.payload.is_unified_test === true))
      || (row.shell_code && row.shell_code.toUpperCase().includes('UNIFIED'))
      || (row.title && row.title.toLowerCase().includes('words & phrases'));

    const updateData = {};
    if (isTest) {
      updateData.minimum_required_score = Number(testPassingScore);
      const wordsAns = wordsTestAnswerType || 'spoken';
      const phrasesAns = phrasesTestAnswerType || 'selection';
      const testAns = isPhrase ? phrasesAns : wordsAns;
      updateData.answer_type = testAns;
      updateData.question_order = examQuestionOrder;

      // Extract theme code(s) to calculate actual Vault question count (supports cumulative themes)
      const thMatch = (row.shell_code && row.shell_code.match(/([A-H])(?:-|$)/i)) || (row.title && row.title.match(/Vocabulary\s+([A-H])/i));
      const th = (row.payload?.theme_code || extractThemeCodeFromTestRow(row) || (thMatch ? thMatch[1] : 'A')).toUpperCase();
      const themeList = (Array.isArray(row.payload?.themes) && row.payload.themes.length > 0)
        ? row.payload.themes.map(t => String(t).trim().toUpperCase())
        : [th];

      const sumVault = (map) => themeList.reduce((acc, t) => acc + (map.get(t) || 0), 0);
      const vaultWordsExamCount = sumVault(vaultThemeWords);
      const vaultPhrasesExamCount = sumVault(vaultThemePhrases);

      if (isUnified) {
        const wCount = vaultWordsExamCount || Number(row.payload?.words_count || 0) || (themeList.length * 160);
        const pCount = vaultPhrasesExamCount || Number(row.payload?.phrases_count || 0) || (themeList.length * 40);
        const wDur = (params.wordsExamDurationMinutes && Number(params.wordsExamDurationMinutes) > 0)
          ? Number(params.wordsExamDurationMinutes)
          : calculateAutoDurationMinutes(wCount, wordsAns, 'words', params.wordsExamPaceSeconds);
        const pDur = (params.phrasesExamDurationMinutes && Number(params.phrasesExamDurationMinutes) > 0)
          ? Number(params.phrasesExamDurationMinutes)
          : calculateAutoDurationMinutes(pCount, phrasesAns, 'phrases', params.phrasesExamPaceSeconds, 1);
        const totalExamDur = wDur + pDur;

        updateData.working_duration_minutes = totalExamDur;
        if (row.payload && typeof row.payload === 'object') {
          updateData.payload = {
            ...row.payload,
            minimum_required_score: Number(testPassingScore),
            answer_type: wordsAns,
            words_answer_type: wordsAns,
            phrases_answer_type: phrasesAns,
            words_duration_minutes: wDur,
            phrases_duration_minutes: pDur,
            working_duration_minutes: totalExamDur,
            duration_minutes: totalExamDur,
            total_questions: wCount + pCount,
            snapshot_question_count: wCount + pCount,
            question_order: examQuestionOrder
          };
        }
      } else {
        const vaultExamCount = isPhrase ? vaultPhrasesExamCount : vaultWordsExamCount;
        const payloadExamCount = Number(row.payload?.total_questions || row.payload?.words_count || 0);
        let qCount = vaultExamCount || payloadExamCount || 120;
        if (!vaultExamCount && !payloadExamCount) {
          if (th === 'A') qCount = isPhrase ? 30 : 120;
          else if (th === 'B') qCount = isPhrase ? 70 : 280;
          else if (th === 'C') qCount = isPhrase ? 110 : 440;
          else if (th === 'D') qCount = isPhrase ? 150 : 600;
          else qCount = isPhrase ? 30 : 120;
        }

        const customPace = isPhrase ? params.phrasesExamPaceSeconds : params.wordsExamPaceSeconds;
        const customDur = isPhrase ? params.phrasesExamDurationMinutes : params.wordsExamDurationMinutes;
        const examDur = (customDur && Number(customDur) > 0)
          ? Number(customDur)
          : calculateAutoDurationMinutes(qCount, testAns, isPhrase ? 'phrases' : 'words', customPace);

        updateData.working_duration_minutes = Number(examDur);
        if (row.payload && typeof row.payload === 'object') {
          updateData.payload = {
            ...row.payload,
            minimum_required_score: Number(testPassingScore),
            answer_type: testAns,
            working_duration_minutes: Number(examDur),
            duration_minutes: Number(examDur),
            ...(isPhrase ? { phrases_duration_minutes: Number(examDur) } : { words_duration_minutes: Number(examDur) }),
            question_order: examQuestionOrder
          };
        }
      }
      updatedTests++;
    } else {
      const wordsAns = wordsTaskAnswerType || taskAnswerType || 'spoken';
      const phrasesAns = phrasesTaskAnswerType || taskAnswerType || 'spoken';
      const taskAns = isPhrase ? phrasesAns : wordsAns;
      const topCode = String(row.payload?.topic_code || '').trim().toUpperCase();

      if (isUnified) {
        const wCount = (topCode ? (vaultTopicWords.get(topCode) || 0) : 0) || Number(row.payload?.words_count || 0) || 40;
        const pCount = (topCode ? (vaultTopicPhrases.get(topCode) || 0) : 0) || Number(row.payload?.phrases_count || 0) || 10;
        const wDur = (wordsTaskDurationMinutes && Number(wordsTaskDurationMinutes) > 0 && !params.wordsTaskPaceSeconds)
          ? Number(wordsTaskDurationMinutes)
          : calculateAutoDurationMinutes(wCount, wordsAns, 'words', params.wordsTaskPaceSeconds);
        const pDur = (phrasesTaskDurationMinutes && Number(phrasesTaskDurationMinutes) > 0 && !params.phrasesTaskPaceSeconds)
          ? Number(phrasesTaskDurationMinutes)
          : calculateAutoDurationMinutes(pCount, phrasesAns, 'phrases', params.phrasesTaskPaceSeconds, 1);
        const totalTaskDur = wDur + pDur;

        updateData.working_duration_minutes = totalTaskDur;
        updateData.minimum_required_score = Number(taskPassingScore);
        updateData.answer_type = wordsAns;
        updateData.question_order = taskQuestionOrder;
        if (row.payload && typeof row.payload === 'object') {
          updateData.payload = {
            ...row.payload,
            working_duration_minutes: totalTaskDur,
            duration_minutes: totalTaskDur,
            words_duration_minutes: wDur,
            phrases_duration_minutes: pDur,
            words_answer_type: wordsAns,
            phrases_answer_type: phrasesAns,
            minimum_required_score: Number(taskPassingScore),
            answer_type: wordsAns,
            question_order: taskQuestionOrder
          };
          if (taskRepetitions != null) {
            updateData.payload.task_repetitions = Math.max(1, Number(taskRepetitions));
          }
        }
      } else {
        const vaultTaskCount = topCode ? (isPhrase ? (vaultTopicPhrases.get(topCode) || 0) : (vaultTopicWords.get(topCode) || 0)) : 0;
        const payloadTaskCount = Number(row.payload?.total_questions || row.payload?.words_count || 0);
        const qCount = vaultTaskCount || payloadTaskCount || (isPhrase ? 10 : 40);
        const customPace = isPhrase ? params.phrasesTaskPaceSeconds : params.wordsTaskPaceSeconds;
        const customDur = isPhrase ? phrasesTaskDurationMinutes : (wordsTaskDurationMinutes || taskDurationMinutes);
        const dur = (customDur && Number(customDur) > 0 && !customPace)
          ? Number(customDur)
          : calculateAutoDurationMinutes(qCount, taskAns, isPhrase ? 'phrases' : 'words', customPace);

        updateData.working_duration_minutes = Number(dur);
        updateData.minimum_required_score = Number(taskPassingScore);
        updateData.answer_type = taskAns;
        updateData.question_order = taskQuestionOrder;
        if (row.payload && typeof row.payload === 'object') {
          updateData.payload = {
            ...row.payload,
            working_duration_minutes: Number(dur),
            duration_minutes: Number(dur),
            ...(isPhrase ? { phrases_duration_minutes: Number(dur) } : { words_duration_minutes: Number(dur) }),
            minimum_required_score: Number(taskPassingScore),
            answer_type: taskAns,
            question_order: taskQuestionOrder
          };
          if (taskRepetitions != null) {
            updateData.payload.task_repetitions = Math.max(1, Number(taskRepetitions));
          }
        }
      }
      updatedTasks++;
    }

    const { error: updErr } = await sb.from('tests').update(updateData).eq('id', row.id);
    if (updErr) throw updErr;
  }

  if (!allowedThemes) {
    try {
      const configSettings = {
        taskMinScore: taskPassingScore,
        examMinScore: testPassingScore,
        wordsTaskDur: wordsTaskDurationMinutes || taskDurationMinutes,
        phrasesTaskDur: phrasesTaskDurationMinutes,
        wordsTaskPace: params.wordsTaskPaceSeconds,
        phrasesTaskPace: params.phrasesTaskPaceSeconds,
        wordsExamPace: params.wordsExamPaceSeconds,
        phrasesExamPace: params.phrasesExamPaceSeconds,
        wordsTaskAnswer: wordsTaskAnswerType || taskAnswerType,
        phrasesTaskAnswer: phrasesTaskAnswerType || taskAnswerType,
        wordsExamAnswer: wordsTestAnswerType,
        phrasesExamAnswer: phrasesTestAnswerType,
        taskQuestionOrder,
        examQuestionOrder
      };
      if (taskRepetitions != null) {
        configSettings.taskRepetitions = Math.max(1, Number(taskRepetitions));
      }
      await saveClassTestSettings(classId, configSettings, false);
    } catch (_) {}
  }

  clearApiCache('tests');
  clearApiCache('vault');
  clearAdminCache('tests');
  clearAdminCache('vocabulary_vault');
  return { updatedTasks, updatedTests };
}

export async function autoGenerateTestsHierarchy(targetLevels, config = {}) {
  const sb = await getSupabase();
  const results = { tasks: 0, tests: 0, updated: 0 };
  const { programId } = config;

  if (!programId) throw new Error("programId is required for auto-generation");

  const { data: progData, error: progErr } = await sb.from('programs')
    .select('id, institution_id, name, code, institutions(name)')
    .eq('id', programId).single();

  if (!progData || progErr) throw new Error(`Program not found.`);

  const institutionId = progData.institution_id;
  const PROG_CODE_MAP = {
    'camp': 'CAMP',
    'evnikom': 'EVNK',
    'tamata': 'TPTC',
    'tamata persada': 'TPTC',
    'sheraton': 'SHRT',
    'english explorer': 'EXPR'
  };
  const progNormName = (progData.name || '').toLowerCase();
  const resolvedProgCode = PROG_CODE_MAP[progNormName] || (progData.code || 'CAMP').toUpperCase().slice(0, 4);

  // Pre-fetch Module IDs
  const { data: vocabModule } = await sb.from('modules').select('id').ilike('name', '%Vocabulary Mastery%').limit(1).maybeSingle();
  const { data: phraseModule } = await sb.from('modules').select('id').ilike('name', '%Phrase Recognition%').limit(1).maybeSingle();
  const vocabModuleId = vocabModule ? vocabModule.id : null;
  const phraseModuleId = phraseModule ? phraseModule.id : null;

  // Strict Class-Level Invariant Guard:
  // If an explicitClassId is provided, resolve the class's assigned level and STRICTLY constrain generation to that single level!
  let explicitClass = null;
  let explicitClassLevelNum = null;
  if (config.explicitClassId) {
    const { data: clsData } = await sb.from('classes')
      .select('id, name, code, program_id, level_id')
      .eq('id', config.explicitClassId)
      .maybeSingle();
    if (clsData) {
      explicitClass = clsData;
      if (clsData.level_id) {
        const { data: lvlRec } = await sb.from('levels').select('level_number').eq('id', clsData.level_id).maybeSingle();
        if (lvlRec?.level_number != null) explicitClassLevelNum = Number(lvlRec.level_number);
      }
    }
  }

  let effectiveLevels = targetLevels;
  if (explicitClass && explicitClassLevelNum != null) {
    if (targetLevels.length !== 1 || Number(targetLevels[0]) !== explicitClassLevelNum) {
      console.warn(`[autoGenerateTestsHierarchy] Target class "${explicitClass.name}" belongs strictly to Level ${explicitClassLevelNum}. Constraining targetLevels from [${targetLevels.join(', ')}] to [${explicitClassLevelNum}] to prevent cross-level test pollution.`);
    }
    effectiveLevels = [explicitClassLevelNum];
  }

  for (const levelNum of effectiveLevels) {
    // Determine level_id
    const { data: lvlData } = await sb.from('levels')
      .select('id, name')
      .eq('level_number', levelNum)
      .limit(1).single();
    if (!lvlData) continue;
    const levelId = lvlData.id;

    let targetClassId = null;
    let targetClassName = null;
    if (explicitClass && explicitClassLevelNum === levelNum) {
      if (!isVocabularyClass(explicitClass)) {
        console.warn(`[autoGenerateTestsHierarchy] Target class ${explicitClass.name} is not a Vocabulary class. Skipping vocabulary generation.`);
        continue;
      }
      targetClassId = explicitClass.id;
      targetClassName = explicitClass.name;
    } else {
      // Prioritize active vocabulary class assigned to this exact level and program
      const { data: classDataList } = await sb.from('classes')
        .select('id, name, code')
        .eq('program_id', programId)
        .eq('level_id', levelId)
        .eq('is_active', true)
        .is('deleted_at', null);

      const vocabClass = (classDataList || []).find(c => isVocabularyClass(c));
      if (!vocabClass) {
        console.warn(`[autoGenerateTestsHierarchy] No vocabulary class found for level ${levelNum}. Skipping.`);
        continue;
      }
      targetClassId = vocabClass.id;
      targetClassName = vocabClass.name;
    }

    const upsertShell = (shellCfg) => upsertDynamicTestShell({
      programCode: resolvedProgCode,
      className: targetClassName,
      ...shellCfg
    });

    // 1. Fetch Words for Level to know what themes and topics exist (Chunked Pagination Protected)
    let words = [];
    try {
      words = await fetchVaultWords({ targetLevel: levelNum, programId, limit: 10000 });
    } catch (_) {
      let vaultQuery = sb.from('vocabulary_vault')
        .select('theme_code, theme, topic_code, topic, word_type, category')
        .is('deleted_at', null)
        .eq('target_level', levelNum);

      const { data } = await vaultQuery;
      words = (data || []).filter(w => !w.program_id || w.program_id === programId);
    }

    // 1b. Enforce Program-Theme Isolation via theme_program_assignments (prevents cross-program leaks in shared Level 0)
    try {
      const { data: tpaRows } = await sb.from('theme_program_assignments')
        .select('theme_code, program_id')
        .eq('target_level', levelNum)
        .eq('is_active', true);
      if (tpaRows && tpaRows.length > 0) {
        const myThemes = new Set(tpaRows.filter(a => a.program_id === programId).map(a => String(a.theme_code || '').toUpperCase()));
        const claimedByOthers = new Set(tpaRows.filter(a => a.program_id !== programId).map(a => String(a.theme_code || '').toUpperCase()));
        if (myThemes.size > 0) {
          words = words.filter(w => myThemes.has(String(w.theme_code || '').toUpperCase()));
        } else if (claimedByOthers.size > 0) {
          words = words.filter(w => !claimedByOthers.has(String(w.theme_code || '').toUpperCase()));
        }
      }
    } catch (tpaErr) {
      console.warn('[autoGenerateTestsHierarchy] theme_program_assignments filter fallback:', tpaErr?.message);
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
         themeMap.set(w.theme_code, { name: w.theme, topics: new Map(), wordCount: 0, vocabCount: 0, phraseCount: 0 });
      }
      themeMap.get(w.theme_code).wordCount++;
      if (category === 'phrases') themeMap.get(w.theme_code).phraseCount++;
      else themeMap.get(w.theme_code).vocabCount++;

      const topicsMap = themeMap.get(w.theme_code).topics;
      if (!topicsMap.has(w.topic_code)) {
        topicsMap.set(w.topic_code, { name: w.topic, hasVocab: false, hasPhrases: false, wordCount: 0, vocabCount: 0, phraseCount: 0 });
      }
      topicsMap.get(w.topic_code).wordCount++;
      if (category === 'phrases') topicsMap.get(w.topic_code).phraseCount++;
      else topicsMap.get(w.topic_code).vocabCount++;

      if (category === 'phrases') topicsMap.get(w.topic_code).hasPhrases = true;
      if (category === 'vocab') topicsMap.get(w.topic_code).hasVocab = true;
    }

    const sortedThemes = Array.from(themeMap.keys()).sort();
    let displayOrder = 1;
    let lastTaskId = null;

    const taskDur = config.taskDurationMinutes !== undefined && config.taskDurationMinutes !== null ? Number(config.taskDurationMinutes) : null;
    const taskAns = config.taskAnswerType || 'spoken';
    const wordsTaskAns = config.wordsTaskAnswerType || taskAns || 'spoken';
    const phrasesTaskAns = config.phrasesTaskAnswerType || taskAns || 'spoken';
    const wordsTaskDur = config.wordsTaskDurationMinutes !== undefined && config.wordsTaskDurationMinutes !== null
      ? Number(config.wordsTaskDurationMinutes)
      : (taskDur || calculateAutoDurationMinutes(40, wordsTaskAns, 'words', config.wordsTaskPaceSeconds));
    const phrasesTaskDur = config.phrasesTaskDurationMinutes !== undefined && config.phrasesTaskDurationMinutes !== null
      ? Number(config.phrasesTaskDurationMinutes)
      : (taskDur || calculateAutoDurationMinutes(10, phrasesTaskAns, 'phrases', config.phrasesTaskPaceSeconds, 1));
    const taskPass = config.taskPassingScore !== undefined ? Number(config.taskPassingScore) : 70;
    const wordsTestAns = config.wordsTestAnswerType || 'spoken';
    const phrasesTestAns = config.phrasesTestAnswerType || 'selection';
    const testPass = config.testPassingScore !== undefined ? Number(config.testPassingScore) : (levelNum === 3 ? 70 : 60);
    const taskOrder = config.taskQuestionOrder || config.questionOrder || 'random';
    const examOrder = config.examQuestionOrder || config.questionOrder || 'random';

    const isWordsOnlyProgram = levelNum === 0 || levelNum === 2 || ['EVNK', 'SHRT', 'TPTC'].includes(resolvedProgCode);
    const isUnifiedMode = !isWordsOnlyProgram && (config.category === 'unified' || config.unified === true);

    const allowedThemes = (Array.isArray(config.themeCodes) && config.themeCodes.length > 0)
      ? new Set(config.themeCodes.map(t => String(t).trim().toUpperCase()))
      : null;

    let existingTestsByTheme = new Map();
    if (allowedThemes && targetClassId) {
      try {
        const { data: exTests } = await sb.from('tests')
          .select('id, shell_code, title, display_order, payload')
          .eq('class_id', targetClassId)
          .is('deleted_at', null)
          .order('display_order', { ascending: true });
        for (const et of (exTests || [])) {
          const etc = extractThemeCodeFromTestRow(et);
          if (!etc) continue;
          if (!existingTestsByTheme.has(etc)) existingTestsByTheme.set(etc, []);
          existingTestsByTheme.get(etc).push(et);
        }
      } catch (_) {}
    }

    // 3. Generate Tests in strict Linear Sequential Chain
    for (const themeCode of sortedThemes) {
      if (allowedThemes && !allowedThemes.has(String(themeCode).trim().toUpperCase())) {
        const exList = existingTestsByTheme.get(String(themeCode).trim().toUpperCase()) || [];
        if (exList.length > 0) {
          const lastEx = exList[exList.length - 1];
          lastTaskId = lastEx.id;
          const maxOrder = Math.max(...exList.map(x => Number(x.display_order) || 0));
          displayOrder = Math.max(displayOrder, maxOrder + 1);
        } else {
          const topicCount = themeMap.get(themeCode)?.topics?.size || 0;
          const mult = (isUnifiedMode || isWordsOnlyProgram) ? 1 : 2;
          displayOrder += (topicCount * mult) + mult;
        }
        continue;
      }
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

        if (isUnifiedMode) {
          hasAnyVocab = true;
          hasAnyPhrases = true;
          const topicWordsCount = topicObj.vocabCount || topicObj.wordCount || 40;
          const topicPhrasesCount = topicObj.phraseCount || 10;
          const dynamicWordsDur = (config.wordsTaskDurationMinutes !== undefined && config.wordsTaskDurationMinutes !== null)
            ? Number(config.wordsTaskDurationMinutes)
            : calculateAutoDurationMinutes(topicWordsCount, wordsTaskAns, 'words', config.wordsTaskPaceSeconds);
          const dynamicPhrasesDur = (config.phrasesTaskDurationMinutes !== undefined && config.phrasesTaskDurationMinutes !== null)
            ? Number(config.phrasesTaskDurationMinutes)
            : calculateAutoDurationMinutes(topicPhrasesCount, phrasesTaskAns, 'phrases', config.phrasesTaskPaceSeconds, 1);
          const { testId, action } = await upsertShell({
            institutionId, programId, levelId, classId: targetClassId, levelNum,
            tier: 'TASK', themeName: themeData.name, topicName: topicName,
            description: `Theme: ${themeData.name} | Topic: ${topicName} (Unified Words & Phrases)`,
            themeCode, topicCode,
            modulePrefix: 'UNIFIED', category: 'unified',
            moduleId: vocabModuleId,
            answerType: wordsTaskAns,
            wordsAnswerType: wordsTaskAns,
            phrasesAnswerType: phrasesTaskAns,
            durationMinutes: taskDur ? taskDur : (dynamicWordsDur + dynamicPhrasesDur),
            wordsDurationMinutes: dynamicWordsDur,
            phrasesDurationMinutes: dynamicPhrasesDur,
            minimumRequiredScore: taskPass,
            prerequisiteId: topicPrereqId,
            displayOrder: displayOrder++,
            questionOrder: taskOrder
          });
          if (action === 'inserted') results.tasks++;
          if (action === 'updated') results.updated++;
          thisTopicLastId = testId;
        } else {
          // 1. Words Task (First in topic pair)
          if (topicObj.hasVocab && (!config.category || config.category === 'all' || config.category === 'words')) {
            hasAnyVocab = true;
            const topicWordsCount = topicObj.vocabCount || topicObj.wordCount || 20;
            const dynamicWordsDur = (config.wordsTaskDurationMinutes !== undefined && config.wordsTaskDurationMinutes !== null)
              ? Number(config.wordsTaskDurationMinutes)
              : calculateAutoDurationMinutes(topicWordsCount, wordsTaskAns, 'words', config.wordsTaskPaceSeconds);
            const { testId, action } = await upsertShell({
              institutionId, programId, levelId, classId: targetClassId, levelNum,
              tier: 'TASK', themeName: themeData.name, topicName: topicName,
              description: `Theme: ${themeData.name} | Topic: ${topicName}`,
              themeCode, topicCode,
              modulePrefix: 'VOCAB', category: 'words',
              moduleId: vocabModuleId,
              answerType: wordsTaskAns,
              totalQuestions: (levelNum === 0 && topicObj.wordCount) ? topicObj.wordCount : undefined,
              durationMinutes: dynamicWordsDur,
              minimumRequiredScore: taskPass,
              prerequisiteId: topicPrereqId,
              displayOrder: displayOrder++,
              questionOrder: taskOrder
            });
            if (action === 'inserted') results.tasks++;
            if (action === 'updated') results.updated++;
            thisTopicLastId = testId;
          }

          // 2. Phrases Task (Peer in topic pair, shares same topicPrereqId) — Strictly skipped for Level 2 (Zero-Phrases SSOT per Rule 2.7.1)
          if (levelNum !== 2 && topicObj.hasPhrases && (!config.category || config.category === 'all' || config.category === 'phrases')) {
            hasAnyPhrases = true;
            const topicPhrasesCount = topicObj.phraseCount || 10;
            const dynamicPhrasesDur = (config.phrasesTaskDurationMinutes !== undefined && config.phrasesTaskDurationMinutes !== null)
              ? Number(config.phrasesTaskDurationMinutes)
              : calculateAutoDurationMinutes(topicPhrasesCount, phrasesTaskAns, 'phrases', config.phrasesTaskPaceSeconds, 1);
            const { testId, action } = await upsertShell({
              institutionId, programId, levelId, classId: targetClassId, levelNum,
              tier: 'TASK', themeName: themeData.name, topicName: topicName,
              description: `Theme: ${themeData.name} | Topic: ${topicName}`,
              themeCode, topicCode,
              modulePrefix: 'PHRASE', category: 'phrases',
              moduleId: phraseModuleId,
              answerType: phrasesTaskAns,
              durationMinutes: dynamicPhrasesDur,
              minimumRequiredScore: taskPass,
              prerequisiteId: topicPrereqId,
              displayOrder: displayOrder++,
              questionOrder: taskOrder
            });
            if (action === 'inserted') results.tasks++;
            if (action === 'updated') results.updated++;
            thisTopicLastId = testId;
          }
        }

        if (thisTopicLastId) {
          lastTaskId = thisTopicLastId;
        }
      }

      // Theme Exams: Both Words Exam and Phrases Exam are PEERS requiring all theme tasks
      const lastThemeTaskId = lastTaskId;
      let lastThemeExamId = null;

      if (isUnifiedMode) {
        const examQCount = (levelNum === 0 && themeData.wordCount) ? themeData.wordCount : null;
        const themeWordsCount = themeData.vocabCount || themeData.wordCount || 160;
        const themePhrasesCount = themeData.phraseCount || 40;
        const dynamicWordsExamDur = (config.wordsExamDurationMinutes !== undefined && config.wordsExamDurationMinutes !== null)
          ? Number(config.wordsExamDurationMinutes)
          : calculateAutoDurationMinutes(themeWordsCount, wordsTestAns, 'words', config.wordsExamPaceSeconds);
        const dynamicPhrasesExamDur = (config.phrasesExamDurationMinutes !== undefined && config.phrasesExamDurationMinutes !== null)
          ? Number(config.phrasesExamDurationMinutes)
          : calculateAutoDurationMinutes(themePhrasesCount, phrasesTestAns, 'phrases', config.phrasesExamPaceSeconds, 1);
        const examDuration = config.examDurationMinutes !== undefined && config.examDurationMinutes !== null
          ? Number(config.examDurationMinutes)
          : (dynamicWordsExamDur + dynamicPhrasesExamDur);
        const { testId, action } = await upsertShell({
          institutionId, programId, levelId, classId: targetClassId, levelNum,
          tier: 'EXAM', themeName: themeData.name, topicName: null,
          description: `Exam: ${themeData.name} (Unified Words & Phrases)`,
          themeCode, topicCode: null,
          modulePrefix: 'UNIFIED', category: 'unified',
          moduleId: vocabModuleId,
          answerType: wordsTestAns,
          wordsAnswerType: wordsTestAns,
          phrasesAnswerType: phrasesTestAns,
          totalQuestions: examQCount,
          durationMinutes: examDuration,
          wordsDurationMinutes: dynamicWordsExamDur,
          phrasesDurationMinutes: dynamicPhrasesExamDur,
          minimumRequiredScore: testPass,
          prerequisiteId: lastThemeTaskId,
          displayOrder: displayOrder++,
          questionOrder: examOrder
        });
        if (action === 'inserted') results.tests++;
        if (action === 'updated') results.updated++;
        lastThemeExamId = testId;
      } else {
        // 3. Words Exam (First in exam pair)
        if (hasAnyVocab && (!config.category || config.category === 'all' || config.category === 'words')) {
          const examQCount = (levelNum === 0 && themeData.wordCount) ? themeData.wordCount : undefined;
          const themeWordsCount = themeData.vocabCount || themeData.wordCount || 120;
          const dynamicWordsExamDur = (config.wordsExamDurationMinutes !== undefined && config.wordsExamDurationMinutes !== null)
            ? Number(config.wordsExamDurationMinutes)
            : calculateAutoDurationMinutes(themeWordsCount, wordsTestAns, 'words', config.wordsExamPaceSeconds);
          const { testId, action } = await upsertShell({
            institutionId, programId, levelId, classId: targetClassId, levelNum,
            tier: 'EXAM', themeName: themeData.name, topicName: null,
            description: `Exam: ${themeData.name}`,
            themeCode, topicCode: null,
            modulePrefix: 'VOCAB', category: 'words',
            moduleId: vocabModuleId,
            answerType: wordsTestAns,
            totalQuestions: examQCount,
            durationMinutes: dynamicWordsExamDur,
            minimumRequiredScore: testPass,
            prerequisiteId: lastThemeTaskId,
            displayOrder: displayOrder++,
            questionOrder: examOrder
          });
          if (action === 'inserted') results.tests++;
          if (action === 'updated') results.updated++;
          lastThemeExamId = testId;
        }

        // 4. Phrases Exam (Peer in exam pair, shares same lastThemeTaskId) — Strictly skipped for Level 2 (Zero-Phrases SSOT per Rule 2.7.1)
        if (levelNum !== 2 && hasAnyPhrases && (!config.category || config.category === 'all' || config.category === 'phrases')) {
          const themePhrasesCount = themeData.phraseCount || 30;
          const dynamicPhrasesExamDur = (config.phrasesExamDurationMinutes !== undefined && config.phrasesExamDurationMinutes !== null)
            ? Number(config.phrasesExamDurationMinutes)
            : calculateAutoDurationMinutes(themePhrasesCount, phrasesTestAns, 'phrases', config.phrasesExamPaceSeconds, 1);
          const { testId, action } = await upsertShell({
            institutionId, programId, levelId, classId: targetClassId, levelNum,
            tier: 'EXAM', themeName: themeData.name, topicName: null,
            description: `Exam: ${themeData.name}`,
            themeCode, topicCode: null,
            modulePrefix: 'PHRASE', category: 'phrases',
            moduleId: phraseModuleId,
            answerType: phrasesTestAns,
            durationMinutes: dynamicPhrasesExamDur,
            minimumRequiredScore: testPass,
            prerequisiteId: lastThemeTaskId,
            displayOrder: displayOrder++,
            questionOrder: examOrder
          });
          if (action === 'inserted') results.tests++;
          if (action === 'updated') results.updated++;
          lastThemeExamId = testId;
        }
      }

      if (lastThemeExamId) {
        lastTaskId = lastThemeExamId;
      }
    }
  }

  clearApiCache('tests');
  clearApiCache('vault');
  clearAdminCache('tests');
  clearAdminCache('vocabulary_vault');
  return results;
}

export async function autoGenerateWordsTests({ classId, levelId, programId, institutionId }) {
  if (!classId || !levelId || !programId) throw new Error("Missing required parameters for auto-generating words.");
  const sb = await getSupabase();
  const { data: levelData } = await sb.from('levels').select('level_number').eq('id', levelId).single();
  if (!levelData) throw new Error("Level not found.");
  return autoGenerateTestsHierarchy([levelData.level_number], {
    programId,
    explicitClassId: classId,
    category: 'words'
  });
}

export async function autoGeneratePhrasesTests({ classId, levelId, programId, institutionId }) {
  if (!classId || !levelId || !programId) throw new Error("Missing required parameters for auto-generating phrases.");
  const sb = await getSupabase();
  const { data: levelData } = await sb.from('levels').select('level_number').eq('id', levelId).single();
  if (!levelData) throw new Error("Level not found.");
  return autoGenerateTestsHierarchy([levelData.level_number], {
    programId,
    explicitClassId: classId,
    category: 'phrases'
  });
}

export async function autoGenerateUnifiedTests({ classId, levelId, programId, institutionId }) {
  if (!classId || !levelId || !programId) throw new Error("Missing required parameters for auto-generating unified tests.");
  const sb = await getSupabase();
  const { data: levelData } = await sb.from('levels').select('level_number').eq('id', levelId).single();
  if (!levelData) throw new Error("Level not found.");
  return autoGenerateTestsHierarchy([levelData.level_number], {
    programId,
    explicitClassId: classId,
    category: 'unified',
    unified: true
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

    if (levelNum === null || levelNum === undefined || !levelId) {
      return { synced: false, reason: 'level_not_found' };
    }

    // 2. Resolve programId
    let programId = optProgramId;
    if (!programId && explicitClassId) {
      const { data: cls } = await sb.from('classes').select('program_id').eq('id', explicitClassId).maybeSingle();
      programId = cls?.program_id;
    }
    if (!programId) {
      if (levelNum === 0) {
        const { data: clsWithLvl } = await sb.from('classes').select('program_id').eq('level_id', levelId).is('deleted_at', null).limit(1).maybeSingle();
        if (clsWithLvl?.program_id) programId = clsWithLvl.program_id;
      }
      if (!programId) {
        const { data: progs } = await sb.from('programs').select('id').order('created_at').limit(1);
        programId = progs?.[0]?.id || null;
      }
    }

    if (!programId) {
      return { synced: false, reason: 'program_not_found' };
    }

    // 3. Resolve targetClassId strictly for Vocabulary classes
    let targetClassId = explicitClassId;
    if (targetClassId) {
      const { data: targetCls } = await sb.from('classes').select('id, name, code').eq('id', targetClassId).maybeSingle();
      if (!targetCls || !isVocabularyClass(targetCls)) {
        return { synced: false, reason: 'not_a_vocabulary_class' };
      }
    } else {
      const { data: classList } = await sb.from('classes')
        .select('id, name, code')
        .eq('program_id', programId)
        .eq('level_id', levelId)
        .eq('is_active', true)
        .is('deleted_at', null);

      const vocabClass = (classList || []).find(c => isVocabularyClass(c));
      targetClassId = vocabClass?.id || null;
    }

    if (!targetClassId) {
      return { synced: false, reason: 'no_vocabulary_class_found' };
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

    // 6. Run autoGenerateTestsHierarchy (defaults to unified test mode for vocabulary classes)
    const isUnified = options.unified !== false;
    const res = await autoGenerateTestsHierarchy([levelNum], {
      programId,
      explicitClassId: targetClassId,
      unified: isUnified,
      category: isUnified ? 'unified' : (options.category || 'vocab'),
      taskPassingScore: 70,
      testPassingScore: levelNum === 3 ? 70 : 60,
      taskDurationMinutes: 15,
      examDurationMinutes: 40
    });

    clearApiCache('tests');
  clearApiCache('vault');
  clearAdminCache('tests');
  clearAdminCache('vocabulary_vault');

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

/**
 * Master One-Click Curriculum & Tests Synchronizer.
 * Scans Vocabulary Vault themes and topics, dynamically provisioning new test shells
 * and updating existing test shells to match current naming without losing student attempts.
 * When classId is supplied, it strictly scopes synchronization to tests for that specific class.
 *
 * @param {Object} options - { level, classId, force }
 * @returns {Promise<{synced: boolean, createdCount: number, updatedCount: number, levels: number[], classId?: string}>}
 */
export async function syncAllCurriculumTests({ level = null, classId = null, force = true } = {}) {
  const sb = await getSupabase();
  let levels = [];
  const targetClassId = classId || null;

  // If a specific classId is provided, verify it is a Vocabulary class and resolve its assigned level
  if (targetClassId && (level === null || level === undefined || level === 'ALL')) {
    try {
      const { data: cls } = await sb.from('classes')
        .select('id, name, code, level_id')
        .eq('id', targetClassId)
        .maybeSingle();

      if (!cls || !isVocabularyClass(cls)) {
        console.warn(`[syncAllCurriculumTests] Class ${targetClassId} is not a Vocabulary class. Sync cancelled.`);
        return { synced: false, reason: 'not_a_vocabulary_class', createdCount: 0, updatedCount: 0, levels: [] };
      }

      if (cls && cls.level_id) {
        const { data: lvl } = await sb.from('levels')
          .select('id, level_number')
          .eq('id', cls.level_id)
          .maybeSingle();
        if (lvl && lvl.level_number != null) {
          levels = [Number(lvl.level_number)];
        }
      }
    } catch (cErr) {
      console.warn('[syncAllCurriculumTests] Error resolving level from classId:', cErr);
    }
  }

  // Fallback to explicit level or all levels in vault
  if (levels.length === 0) {
    if (level !== null && level !== undefined && level !== 'ALL') {
      levels = [Number(level)];
    } else {
      try {
        const { data: vLevels } = await sb.from('vocabulary_vault')
          .select('target_level')
          .is('deleted_at', null);
        levels = Array.from(new Set((vLevels || []).map(r => Number(r.target_level)).filter(n => !isNaN(n) && n >= 0))).sort();
      } catch (_) {}
      if (levels.length === 0) levels = [1, 2, 3];
    }
  }

  let totalCreated = 0;
  let totalUpdated = 0;

  for (const lvl of levels) {
    try {
      const res = await autoSyncClassTestsForLevel(lvl, {
        explicitClassId: targetClassId,
        force: true
      });
      if (res && res.synced) {
        totalCreated += (res.tasks || 0) + (res.tests || 0);
        totalUpdated += (res.updated || 0);
      }
    } catch (lvlErr) {
      console.warn(`[syncAllCurriculumTests] Level ${lvl} sync notice:`, lvlErr);
    }
  }

  clearApiCache('tests');
  clearApiCache('vault');
  clearAdminCache('tests');
  clearAdminCache('vocabulary_vault');
  return {
    synced: true,
    createdCount: totalCreated,
    updatedCount: totalUpdated,
    levels,
    classId: targetClassId
  };
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
    countdownSeconds: parseInt(settings.anti_cheat_countdown_seconds || '10', 10) || 10,
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

  // Auto-sync: if session is marked UNLOCKED but its auto_close_at has expired,
  // update database status to LOCKED in background so historical state remains clean.
  if (session.status === 'UNLOCKED' && isExpired) {
    session.status = 'LOCKED';
    session.closed_at = now.toISOString();
    closeTestSession(testId).catch(() => {});
  }

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

export async function openTestSession({ testId, batchId, allocatedMinutes, allowedStudentIds = [], isRemedial = false, remedialStudentIds = [], answeringMode = null, answeringModes = null, dialogueRoomCode = null }) {
  const sb = await getSupabase();
  const { data: existing, error: fetchErr } = await sb.from('tests')
    .select('id, module_id, shell_code, payload')
    .eq('id', testId)
    .single();
  if (fetchErr || !existing) throw new Error('Test not found');

  const minutes = Math.max(1, parseInt(allocatedMinutes, 10) || 30);
  const now = new Date();
  const autoClose = new Date(now.getTime() + minutes * 60 * 1000);

  const isDialogue = (existing.module_id === 'c590c69f-44dc-4d26-9c19-263c6e7cbbec') ||
                     (existing.shell_code || '').includes('-DIAL') ||
                     (existing.payload?.module_type === 'TURN_BASED_ROLEPLAY') ||
                     (existing.payload?.module_code === 'm7');
  const code = dialogueRoomCode || (isDialogue ? ('DIAL-' + Math.floor(1000 + Math.random() * 9000)) : null);

  const testSession = {
    batch_id: batchId,
    status: 'UNLOCKED',
    allocated_minutes: minutes,
    unlocked_at: now.toISOString(),
    auto_close_at: autoClose.toISOString(),
    allowed_student_ids: Array.isArray(allowedStudentIds) ? allowedStudentIds : [],
    is_remedial: Boolean(isRemedial),
    remedial_student_ids: Array.isArray(remedialStudentIds) ? remedialStudentIds : [],
    answering_mode: answeringMode || null,
    ...(answeringModes ? { answering_modes: answeringModes } : {}),
    ...(code ? { dialogue_room_code: code } : {})
  };

  const updatedPayload = {
    ...(existing.payload || {}),
    ...(answeringMode ? { answer_type: answeringMode } : {}),
    test_session: testSession
  };

  const updateFields = {
    working_duration_minutes: minutes,
    availability_start: now.toISOString(),
    availability_end: autoClose.toISOString(),
    schedule_mode: 'strict',
    payload: updatedPayload
  };
  if (answeringMode) {
    updateFields.answer_type = answeringMode;
  }

  const updated = await adminUpdate('tests', testId, updateFields);

  // Authoritative Synchronization: Sync expires_at on all in_progress attempts for this session
  if (Array.isArray(allowedStudentIds) && allowedStudentIds.length > 0) {
    try {
      await sb.from('attempts')
        .update({
          expires_at: autoClose.toISOString(),
          updated_at: now.toISOString()
        })
        .eq('test_id', testId)
        .in('student_id', allowedStudentIds)
        .eq('status', 'in_progress');
    } catch (syncErr) {
      console.warn('[openTestSession] Error syncing in_progress attempts expires_at:', syncErr);
    }
  }

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

export async function updateLiveSessionModality({ testId, wordsMode = null, phrasesMode = null }) {
  const sb = await getSupabase();
  const { data: existing, error: fetchErr } = await sb.from('tests')
    .select('id, payload, answer_type')
    .eq('id', testId)
    .single();
  if (fetchErr || !existing) throw new Error('Test not found');

  const currentSession = existing.payload?.test_session || {};
  if (currentSession.status !== 'UNLOCKED') {
    throw new Error('This test session is inactive or has been closed.');
  }

  const existingModes = currentSession.answering_modes || {};
  const newWordsMode = wordsMode || existingModes.words || currentSession.answering_mode || 'written';
  const newPhrasesMode = phrasesMode || existingModes.phrases || currentSession.answering_mode || 'written';

  const updatedSession = {
    ...currentSession,
    answering_mode: newWordsMode,
    answering_modes: {
      words: newWordsMode,
      phrases: newPhrasesMode
    }
  };

  const updatedPayload = {
    ...(existing.payload || {}),
    answer_type: newWordsMode,
    test_session: updatedSession
  };

  const updateFields = {
    answer_type: newWordsMode,
    payload: updatedPayload
  };

  const updated = await adminUpdate('tests', testId, updateFields);

  // Propagate modality switch directly to all active in_progress attempts
  try {
    const { data: activeAtts } = await sb.from('attempts')
      .select('id')
      .eq('test_id', testId)
      .eq('status', 'in_progress');

    if (activeAtts && activeAtts.length > 0) {
      const attIds = activeAtts.map(a => a.id);
      const { data: allAns } = await sb.from('attempt_answers')
        .select('id, attempt_id, question_snapshot, question_type_snapshot, accepted_answers_snapshot, correct_answer_snapshot')
        .in('attempt_id', attIds);

      if (allAns && allAns.length > 0) {
        // Collect distractor candidates from allAns
        const pool = [];
        allAns.forEach(a => {
          const acc = Array.isArray(a.accepted_answers_snapshot)
            ? a.accepted_answers_snapshot[0]
            : (typeof a.accepted_answers_snapshot === 'string' ? a.accepted_answers_snapshot.split(/[;,/]/)[0]?.trim() : (a.correct_answer_snapshot || ''));
          if (acc && !pool.includes(acc)) pool.push(acc);
        });

        // Also query broader vocabulary_vault if pool is small
        if (pool.length < 5) {
          try {
            const { data: vaultItems } = await sb.from('vocabulary_vault').select('english').is('deleted_at', null).limit(100);
            (vaultItems || []).forEach(v => {
              const eng = (v.english || '').split(/[;,/]/)[0]?.trim();
              if (eng && !pool.includes(eng)) pool.push(eng);
            });
          } catch (_) {}
        }

        const updates = [];
        for (const a of allAns) {
          let snap = typeof a.question_snapshot === 'string'
            ? (() => { try { return JSON.parse(a.question_snapshot); } catch(_) { return {}; } })()
            : (a.question_snapshot ? { ...a.question_snapshot } : {});

          const isPhrase = (
            snap.category === 'phrases' ||
            snap.test_section === 'phrases' ||
            snap.section_id === 'phrases' ||
            /phrase/i.test(snap.section_label || '') ||
            ['expression', 'idiom', 'proverb', 'phrase'].includes((snap.word_type || a.question_type_snapshot || '').toLowerCase())
          );

          const targetMode = isPhrase ? newPhrasesMode : newWordsMode;
          const targetAnswerType = (targetMode === 'multiple_choice' || targetMode === 'selection') ? 'selection' : targetMode;

          let changed = false;
          if (snap.answer_type !== targetAnswerType) {
            snap.answer_type = targetAnswerType;
            changed = true;
          }

          if (targetAnswerType === 'selection') {
            if (!Array.isArray(snap.options_snapshot) || snap.options_snapshot.length < 2) {
              const acc = Array.isArray(a.accepted_answers_snapshot)
                ? a.accepted_answers_snapshot[0]
                : (typeof a.accepted_answers_snapshot === 'string' ? a.accepted_answers_snapshot.split(/[;,/]/)[0]?.trim() : (a.correct_answer_snapshot || ''));
              if (acc) {
                const distractors = pool.filter(cand => cand !== acc).sort(() => 0.5 - Math.random()).slice(0, 4);
                snap.options_snapshot = [acc, ...distractors].sort(() => 0.5 - Math.random());
                changed = true;
              }
            }
          }

          if (changed) {
            updates.push(sb.from('attempt_answers').update({ question_snapshot: snap }).eq('id', a.id));
          }
        }

        if (updates.length > 0) {
          await Promise.all(updates);
        }
      }
    }
  } catch (syncErr) {
    console.warn('[updateLiveSessionModality] Failed to propagate live attempts:', syncErr?.message || syncErr);
  }

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
  const grade = isRemedial ? 'R' : getGrade(effectiveScore);

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
    .select('id, effective_score, percentage, is_forgiven, is_remedial, created_at')
    .eq('student_id', att.student_id)
    .eq('test_id', att.test_id)
    .in('status', ['submitted', 'auto_submitted', 'evaluated']);

  if (allAttempts && allAttempts.length > 0) {
    allAttempts.sort((a, b) => {
      const scoreA = Number(a.effective_score ?? a.percentage ?? 0);
      const scoreB = Number(b.effective_score ?? b.percentage ?? 0);
      const aQual = a.is_forgiven || scoreA >= 60;
      const bQual = b.is_forgiven || scoreB >= 60;
      if (aQual !== bQual) return bQual ? 1 : -1;
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

  clearAdminCache('attempts');
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
    .select('id, effective_score, percentage, is_forgiven, is_remedial, created_at')
    .eq('student_id', att.student_id)
    .eq('test_id', att.test_id)
    .in('status', ['submitted', 'auto_submitted', 'evaluated']);

  if (allAttempts && allAttempts.length > 0) {
    allAttempts.sort((a, b) => {
      const scoreA = Number(a.effective_score ?? a.percentage ?? 0);
      const scoreB = Number(b.effective_score ?? b.percentage ?? 0);
      const aQual = a.is_forgiven || scoreA >= 60;
      const bQual = b.is_forgiven || scoreB >= 60;
      if (aQual !== bQual) return bQual ? 1 : -1;
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

  clearAdminCache('attempts');
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
  const grade = 'F';

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
    .select('id, effective_score, percentage, is_forgiven, is_remedial, created_at')
    .eq('student_id', att.student_id)
    .eq('test_id', att.test_id)
    .in('status', ['submitted', 'auto_submitted', 'evaluated']);

  if (allAttempts && allAttempts.length > 0) {
    allAttempts.sort((a, b) => {
      const scoreA = Number(a.effective_score ?? a.percentage ?? 0);
      const scoreB = Number(b.effective_score ?? b.percentage ?? 0);
      const aQual = a.is_forgiven || scoreA >= 60;
      const bQual = b.is_forgiven || scoreB >= 60;
      if (aQual !== bQual) return bQual ? 1 : -1;
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

  clearAdminCache('attempts');
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

  // Authoritative session termination: immediately expire all remaining in-progress attempts
  try {
    const nowIso = new Date().toISOString();
    await sb.from('attempts')
      .update({ expires_at: nowIso, updated_at: nowIso })
      .eq('test_id', testId)
      .eq('status', 'in_progress');
  } catch (attCloseErr) {
    console.warn('Failed to expire in-progress attempts on close session:', attCloseErr);
  }

  return { success: true, session: testSession, test: updated };
}

export async function checkStudentTestAccess(studentId, testId) {
  const sb = await getSupabase();

  const { data: student, error: studErr } = await sb.from('students')
    .select('id, name, batch_id, program_status, levels(level_number)')
    .eq('id', studentId)
    .single();
  if (studErr || !student) {
    return { allowed: false, reason: 'STUDENT_NOT_FOUND', message: 'Student record not found.' };
  }

  const isAlumni = (student.program_status || '').toUpperCase() === 'ALUMNI' || student.levels?.level_number === 99;
  if (isAlumni) {
    return { allowed: true, is_test: true, is_alumni: true };
  }

  const { data: asm, error: asmErr } = await sb.from('tests')
    .select('id, title, status, test_type, test_subtype, shell_code, payload')
    .eq('id', testId)
    .single();
  if (asmErr || !asm) {
    return { allowed: false, reason: 'NOT_FOUND', message: 'Test not found.' };
  }

  const isExamSubtype = (asm.test_subtype || '').toUpperCase().includes('TEST') || (asm.test_subtype || '').toUpperCase().includes('EXAM');
  const isExamShell = (asm.shell_code || '').toUpperCase().endsWith('-TEST') || (asm.shell_code || '').toUpperCase().endsWith('-EXAM');
  const isExamTitle = ((asm.title || '').toLowerCase().includes('test') || (asm.title || '').toLowerCase().includes('exam')) && !(asm.title || '').toLowerCase().includes('task');
  const isFormalExam = ((asm.test_type || '').toLowerCase() === 'exam' || isExamSubtype || isExamShell || isExamTitle) &&
                       !(asm.shell_code || '').toUpperCase().includes('-TASK') &&
                       !(asm.test_subtype || '').toUpperCase().includes('TASK') &&
                       !(asm.title || '').toLowerCase().includes('task') &&
                       !(asm.test_type || '').toLowerCase().includes('task') &&
    !(asm.test_type || '').toLowerCase().includes('quiz');

  if (!isFormalExam || isPretest(asm) || isVocabQuiz(asm) || asm.payload?.is_standalone_tryout === true) {
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
    .select('id, student_id, test_id, status, score, correct_count, total_questions, percentage, effective_score, grade, started_at, expires_at, submitted_at, updated_at, created_at')
    .in('test_id', testIds)
    .in('student_id', studentIds)
    .order('created_at', { ascending: false });

  // Safe session window: capture all attempts from this live exam session.
  // Uses a 4-hour lookback or at least 2 hours prior to unlockedAt to prevent cutting off students who started before session edit/re-unlock.
  const nowMs = Date.now();
  const unlockedMs = unlockedAt ? new Date(unlockedAt).getTime() : nowMs;
  const windowStartMs = Math.min(nowMs - 4 * 3600 * 1000, unlockedMs - 2 * 3600 * 1000);
  const windowStart = new Date(windowStartMs).toISOString();

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
    // Ultra-lean scalar projection: excludes snapshots and empty unattempted rows to protect egress quota
    const { data: answers } = await sb.from('attempt_answers')
      .select('attempt_id, is_correct, score, updated_at')
      .in('attempt_id', attemptIds)
      .not('student_answer', 'is', null)
      .neq('student_answer', '')
      .order('updated_at', { ascending: true });
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
  window.logAuditEvent = logAuditEvent;
  window.adminApplyForgiven = adminApplyForgiven;
  window.adminRevokeForgiven = adminRevokeForgiven;
  window.fetchClassTestSettings = fetchClassTestSettings;
  window.saveClassTestSettings = saveClassTestSettings;
  window.updateTestPassingScore = updateTestPassingScore;
  window.fetchDisciplineGovernance = fetchDisciplineGovernance;
  window.saveDisciplineGovernance = saveDisciplineGovernance;
  window.fetchThemeProgramAssignments = fetchThemeProgramAssignments;
  window.toggleThemeProgramAssignment = toggleThemeProgramAssignment;
}


