// TOPS CORE — Authoritative Centralized Grading & Vocabulary Engine
// Phases 9, 10, 11, 15, 16

/**
 * Standard Damerau-Levenshtein Edit Distance
 */
export function damerauLevenshtein(a, b) {
  const la = a.length, lb = b.length;
  const dp = Array.from({ length: la + 1 }, (_, i) =>
    Array.from({ length: lb + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + cost);
      }
    }
  }
  return dp[la][lb];
}

/**
 * Normalize answer text:
 * - trim
 * - lowercase
 * - collapse multiple whitespace to single space
 * - normalize contractions (e.g. i'm -> i am)
 */
/**
 * Normalize answer text and strip punctuation:
 * - trim & lowercase
 * - collapse multiple whitespace to single space
 * - strip symbols/punctuation like (), [], {}, -, --, _, ., ,, ;, :, !, ?, ', ", etc.
 * - normalize contractions (e.g. i'm -> i am)
 */
export function cleanPunctuationAndSymbols(text) {
  return String(text ?? '')
    .toLowerCase()
    .trim()
    .replace(/[()\[\]{}\-–—_.,;:!?'"`~*&^%$#@+\\/]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\bi'm\b/g, 'i am')
    .replace(/\bcan't\b/g, 'cannot')
    .replace(/\bdon't\b/g, 'do not')
    .trim();
}

export function normalizeAnswerText(text) {
  return cleanPunctuationAndSymbols(text);
}

/**
 * Strip all punctuation and spaces for compact comparison:
 */
export function stripAllPunctuationAndSpaces(text) {
  return String(text ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Strip hyphens for hyphen tolerance comparison:
 * e.g. "check-in" -> "checkin", "part-time" -> "parttime"
 */
export function stripHyphens(text) {
  return stripAllPunctuationAndSpaces(text);
}

/**
 * Expand variants from strings with parentheses:
 * e.g. "look (up)" -> ["look (up)", "look up", "look"]
 */
export function expandAnswerVariants(raw) {
  if (!raw) return [];
  const str = String(raw).trim();
  const variants = new Set();
  variants.add(str);
  if (str.includes('(') && str.includes(')')) {
    const withoutParens = str.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
    if (withoutParens) variants.add(withoutParens);
    const strippedParens = str.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
    if (strippedParens) variants.add(strippedParens);
  }
  return Array.from(variants);
}

/**
 * Parse correct answers from raw string supporting ; | and / delimiters.
 * e.g. "run;jog|sprint/dash" -> ["run", "jog", "sprint", "dash"]
 * All three delimiters are treated as equivalent "OR" separators.
 */
export function parseCorrectAnswers(rawAnswer) {
  if (rawAnswer === null || rawAnswer === undefined) return [];
  const list = Array.isArray(rawAnswer) ? rawAnswer : [rawAnswer];
  const allVariants = [];
  list
    .flatMap(s => String(s).split(/[;|/]/))
    .map(s => s.trim())
    .filter(Boolean)
    .forEach(item => {
      expandAnswerVariants(item).forEach(v => allVariants.push(v));
    });
  return allVariants;
}

/**
 * Single Authoritative Answer Evaluation (Written, Speech, Dropdown, Multiple Choice)
 * Evaluates student answer against raw correct answer snapshot.
 *
 * @param {string} studentAnswer
 * @param {string|string[]} rawCorrectAnswer
 * @param {string} answerType ('written' | 'speech_to_text' | 'spoken' | 'dropdown' | 'multiple_choice')
 * @returns {{ result: 'correct'|'minor_spelling_error'|'incorrect', score: number, matchedAnswer: string }}
 */
export function evaluateAnswer(studentAnswer, rawCorrectAnswer, answerType = 'written') {
  const normStudent = cleanPunctuationAndSymbols(studentAnswer);
  const compactStudent = stripAllPunctuationAndSpaces(studentAnswer);
  const possibleAnswers = parseCorrectAnswers(rawCorrectAnswer);

  if (possibleAnswers.length === 0) {
    return { result: normStudent ? 'correct' : 'incorrect', score: normStudent ? 1.0 : 0.0, matchedAnswer: '' };
  }

  if (!normStudent && !compactStudent) {
    return { result: 'incorrect', score: 0.0, matchedAnswer: possibleAnswers[0] };
  }

  const isSpeech = (answerType === 'speech_to_text' || answerType === 'spoken');
  let bestResult = { result: 'incorrect', score: 0.0, matchedAnswer: possibleAnswers[0] };

  for (const opt of possibleAnswers) {
    const normOpt = cleanPunctuationAndSymbols(opt);
    const compactOpt = stripAllPunctuationAndSpaces(opt);
    if (!normOpt && !compactOpt) continue;

    // 1. Direct Match with Punctuation & Spacing Normalization
    if (normStudent === normOpt || compactStudent === compactOpt) {
      return { result: 'correct', score: 1.0, matchedAnswer: opt };
    }

    // 2. Edit distance (Damerau-Levenshtein)
    const distNorm = damerauLevenshtein(normStudent, normOpt);
    const distCompact = damerauLevenshtein(compactStudent, compactOpt);
    const dist = Math.min(distNorm, distCompact);
    const minLen = Math.min(normStudent.length, normOpt.length);

    const isWithin2Letters = (minLen >= 4 && dist <= 2) || (minLen === 3 && dist <= 1) || (minLen > 0 && dist <= 1 && distNorm <= 1);

    if (isWithin2Letters) {
      if (isSpeech) {
        // FOR SPEECH: Full leeway of 1 or 2 letters & undetected punctuation is treated as CORRECT (1.0 pt)
        return { result: 'correct', score: 1.0, matchedAnswer: opt };
      } else {
        // FOR WRITTEN: standard minor spelling error (0.5 pt)
        if (bestResult.score < 0.5) {
          bestResult = { result: 'minor_spelling_error', score: 0.5, matchedAnswer: opt };
        }
      }
    }
  }

  return bestResult;
}

/**
 * Centralized Percentage Calculation
 */
export function calculatePercentage(score, totalPoints) {
  const tot = Number(totalPoints) || 0;
  const sc = Number(score) || 0;
  if (tot <= 0) return 0;
  const pct = (sc / tot) * 100;
  return Math.round(pct * 100) / 100;
}

/**
 * Authoritative Passing Score Engine (Phase 9)
 * percentage >= configuredPassingPercentage
 */
export function isPassing(percentage, passingThreshold = 60) {
  const pct = Number(percentage) || 0;
  const threshold = Number(passingThreshold) || 60;
  return pct >= threshold;
}

/**
 * Authoritative Prerequisite Engine (Phase 10)
 */
export function isPrerequisiteMet(studentBestPercentage, requiredPercentage = 60) {
  if (studentBestPercentage === null || studentBestPercentage === undefined) return false;
  const best = Number(studentBestPercentage) || 0;
  const req = Number(requiredPercentage) || 60;
  return best >= req;
}

/**
 * Centralized Authoritative Grade Engine (Official Scale)
 * ★ (S) : 100%       - Excellent (Purple #A855F7)
 * A     : 90% – 99%  - Very Good (Rich Green #10B981)
 * B     : 80% – 89%  - Good (Lime / Yellow-Green #84CC16)
 * C     : 60% – 79%  - Enough (Yellow #EAB308)
 * D     : 30% – 59%  - Less (Orange #F97316)
 * E     : 0% – 29%   - Fail (Red #EF4444)
 */
export function calculateGrade(percentage) {
  const num = Number(percentage) || 0;
  if (num >= 100) return 'S';
  const pct = Math.round(num);
  if (pct >= 90) return 'A';
  if (pct >= 80) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 30) return 'D';
  return 'E';
}

/**
 * Authoritative Student Overall Score & Grade (AGENTS.md §2.8 & §2.10)
 * Evaluates strictly across taken/unlocked assessments.
 * Unopened/locked assessments do NOT penalize or drag down student score.
 * 
 * Formula: average_score = sum(best_percentage_on_taken) / count(taken_assessments)
 * Grade: getGrade(average_score)
 * 
 * @param {Array<number>} takenPercentages Array of best percentages on completed/taken assessments
 * @returns {{ averageScore: number, grade: string, count: number }}
 */
export function calculateOverallStudentScore(takenPercentages = []) {
  if (!Array.isArray(takenPercentages) || takenPercentages.length === 0) {
    return { averageScore: 0, grade: '—', count: 0 };
  }
  const validPcts = takenPercentages.map(p => Number(p) || 0);
  const sum = validPcts.reduce((acc, curr) => acc + curr, 0);
  const averageScore = Math.round(sum / validPcts.length);
  const grade = calculateGrade(averageScore);
  return { averageScore, grade, count: validPcts.length };
}

/**
 * Authoritative Grade & Score Palette
 * ★ Excellent  100%       Ungu (Purple)           #A855F7
 * A Very Good  90% – 99%  Hijau (Rich Green)      #10B981
 * B Good       80% – 89%  Lime (Yellow-Green)     #84CC16
 * C Enough     60% – 79%  Kuning (Yellow)         #EAB308
 * D Less       30% – 59%  Jingga / Orange         #F97316
 * E Fail       0% – 29%   Merah (Red)             #EF4444
 */
export const GRADE_PALETTE = {
  S: {
    symbol: '★',
    label: 'Excellent',
    predicate: 'Excellent',
    color: '#a855f7',       // Ungu / Purple (100% Star)
    dark: '#7e22ce',
    light: '#c084fc',
    rgb: '168, 85, 247',
    glow: 'rgba(168, 85, 247, 0.45)',
    name: 'Excellent (100%)',
    minScore: 100,
    maxScore: 100,
    sparkle: true
  },
  A: {
    symbol: 'A',
    label: 'Very Good',
    predicate: 'Very Good',
    color: '#10b981',       // Hijau / Rich Green (90-99%)
    dark: '#059669',
    light: '#34d399',
    rgb: '16, 185, 129',
    glow: 'rgba(16, 185, 129, 0.35)',
    name: 'Very Good (90-99%)',
    minScore: 90,
    maxScore: 99,
    sparkle: false
  },
  B: {
    symbol: 'B',
    label: 'Good',
    predicate: 'Good',
    color: '#84cc16',       // Lime / Hijau Muda / Yellow-Green (80-89%)
    dark: '#65a30d',
    light: '#a3e635',
    rgb: '132, 204, 22',
    glow: 'rgba(132, 204, 22, 0.35)',
    name: 'Good (80-89%)',
    minScore: 80,
    maxScore: 89,
    sparkle: false
  },
  C: {
    symbol: 'C',
    label: 'Enough',
    predicate: 'Enough',
    color: '#eab308',       // Kuning / Yellow (60-79%)
    dark: '#ca8a04',
    light: '#fde047',
    rgb: '234, 179, 8',
    glow: 'rgba(234, 179, 8, 0.35)',
    name: 'Enough (60-79%)',
    minScore: 60,
    maxScore: 79,
    sparkle: false
  },
  D: {
    symbol: 'D',
    label: 'Less',
    predicate: 'Less',
    color: '#f97316',       // Jingga / Orange (30-59%)
    dark: '#ea580c',
    light: '#fb923c',
    rgb: '249, 115, 22',
    glow: 'rgba(249, 115, 22, 0.35)',
    name: 'Less (30-59%)',
    minScore: 30,
    maxScore: 59,
    sparkle: false
  },
  E: {
    symbol: 'E',
    label: 'Fail',
    predicate: 'Fail',
    color: '#ef4444',       // Merah / Red (0-29%)
    dark: '#dc2626',
    light: '#f87171',
    rgb: '239, 68, 68',
    glow: 'rgba(239, 68, 68, 0.35)',
    name: 'Fail (0-29%)',
    minScore: 0,
    maxScore: 29,
    sparkle: false
  },
  F: {
    symbol: 'E',            // Legacy Alias to E (Red)
    label: 'Fail',
    predicate: 'Fail',
    color: '#ef4444',
    dark: '#dc2626',
    light: '#f87171',
    rgb: '239, 68, 68',
    glow: 'rgba(239, 68, 68, 0.35)',
    name: 'Fail (Legacy Fallback)',
    minScore: 0,
    maxScore: 29,
    sparkle: false
  },
  R: {
    symbol: 'C',            // Remedial Max 60% falls in Grade C (Kuning #EAB308)
    label: 'Enough',
    predicate: 'Enough',
    color: '#eab308',
    dark: '#ca8a04',
    light: '#fde047',
    rgb: '234, 179, 8',
    glow: 'rgba(234, 179, 8, 0.35)',
    name: 'Remedial (Max 60% / Grade C)',
    minScore: 60,
    maxScore: 60,
    sparkle: false
  }
};

export function getGradeColor(grade, isRemedial = false) {
  const g = String(grade || '').toUpperCase();
  if (g === 'R') return GRADE_PALETTE.C?.color || '#eab308';
  return GRADE_PALETTE[g]?.color || '#94a3b8';
}

export function getScoreColor(percentage, isRemedial = false) {
  const grade = calculateGrade(percentage);
  return getGradeColor(grade, false);
}

export function getGradeSymbol(grade, percentage = null, isRemedial = false) {
  let baseSymbol;
  if (percentage !== null && Number(percentage) >= 100) {
    baseSymbol = '★';
  } else {
    const g = String(grade || '').toUpperCase();
    if (g === 'S' || g === 'STAR' || g === '★' || g === '⭐') baseSymbol = '★';
    else if (g === 'R') baseSymbol = 'C';
    else baseSymbol = GRADE_PALETTE[g]?.symbol || g || '—';
  }
  return isRemedial ? `${baseSymbol}ᴿ` : baseSymbol;
}

export function formatGradeBadgeHtml(grade, isRemedial = false, customStyle = '') {
  const g = String(grade || '').toUpperCase();
  const color = getGradeColor(g);
  const isS = g === 'S' || g === '★' || g === 'STAR' || g === '⭐';
  const displayLetter = isS ? '★' : (g === 'R' ? 'C' : g);
  const remTag = isRemedial ? '<sup style="font-size:0.65em; font-weight:900; margin-left:1px; vertical-align:super; line-height:0;">R</sup>' : '';
  
  if (isS) {
    return `<span class="badge" style="background:rgba(168,85,247,0.18); color:#A855F7; font-weight:900; box-shadow:0 0 10px rgba(168,85,247,0.45); border:1px solid #A855F7; padding:2px 7px; display:inline-flex; align-items:center; ${customStyle}">${displayLetter}${remTag}</span>`;
  }
  return `<span class="badge" style="background:${color}; color:#000; font-weight:800; padding:2px 7px; display:inline-flex; align-items:center; ${customStyle}">${displayLetter}${remTag}</span>`;
}

export function getGradeTheme(grade, isRemedial = false) {
  const g = String(grade || '').toUpperCase();
  const effectiveGrade = (g === 'STAR' || g === '★' || g === '⭐') ? 'S' : (g === 'R' ? 'C' : g);
  const theme = GRADE_PALETTE[effectiveGrade] || {
    symbol: g || '—',
    color: '#94a3b8',
    dark: '#64748b',
    light: '#cbd5e1',
    rgb: '148, 163, 184',
    glow: 'rgba(148, 163, 184, 0.25)',
    name: 'Standard',
    sparkle: false
  };
  if (isRemedial) {
    return {
      ...theme,
      isRemedial: true,
      symbol: (theme.symbol === '★' ? '★ᴿ' : `${theme.symbol}ᴿ`)
    };
  }
  return theme;
}

/**
 * Authoritative Achievement Status (Official Predicate)
 * Strictly 6 states: FAIL (0-29%), LESS (30-59%), ENOUGH (60-79%), GOOD (80-89%), VERY GOOD (90-99%), EXCELLENT (100%).
 * REMEDIAL is an exam condition/status, NOT an Achievement Status!
 */
export function getAchievementStatus(grade, percentage = null) {
  let g = String(grade || '').toUpperCase();
  if (g === 'R' || !['S', 'STAR', '★', 'A', 'B', 'C', 'D', 'E', 'F'].includes(g)) {
    const p = parseFloat(percentage ?? 0);
    if (p >= 100) g = 'S';
    else if (p >= 90) g = 'A';
    else if (p >= 80) g = 'B';
    else if (p >= 60) g = 'C';
    else if (p >= 30) g = 'D';
    else g = 'E';
  }
  const map = {
    S: 'EXCELLENT',
    STAR: 'EXCELLENT',
    '★': 'EXCELLENT',
    '⭐': 'EXCELLENT',
    A: 'VERY GOOD',
    B: 'GOOD',
    C: 'ENOUGH',
    D: 'LESS',
    E: 'FAIL',
    F: 'FAIL'
  };
  return map[g] || 'ENOUGH';
}

/** Alias for normalizeAnswerText */
export function normalizeWrittenAnswer(text) {
  return normalizeAnswerText(text);
}

/**
 * Authoritative Recalculate Attempt (Phases 15 & 16)
 * @param {Array<{student_answer, correct_answer, answer_type}>} answers
 * @param {number} passingThreshold
 */
export function recalculateAttempt(answers, passingThreshold = 60) {
  let totalScore = 0;
  const totalQuestions = answers.length;
  const evaluatedAnswers = answers.map(ans => {
    const evalRes = evaluateAnswer(ans.student_answer, ans.correct_answer, ans.answer_type);
    totalScore += evalRes.score;
    return {
      ...ans,
      score: evalRes.score,
      evaluation_result: evalRes.result
    };
  });
  const percentage = calculatePercentage(totalScore, totalQuestions);
  const grade = calculateGrade(percentage);
  const passed = isPassing(percentage, passingThreshold);
  return {
    score: totalScore,
    totalQuestions,
    percentage,
    grade,
    isPassing: passed,
    answers: evaluatedAnswers
  };
}


