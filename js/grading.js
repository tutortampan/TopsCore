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
 * Centralized Grade Engine (Reorganized: E, D, C, B, A, Star ⭐)
 */
export function calculateGrade(percentage) {
  const pct = Math.round(Number(percentage) || 0);
  if (pct >= 100) return 'S';
  if (pct >= 80) return 'A';
  if (pct >= 60) return 'B';
  if (pct >= 40) return 'C';
  if (pct >= 20) return 'D';
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
 * Order: E 0-19 (Merah), D 20-39 (Oranye), C 40-59 (Kuning), B 60-79 (Lime), A 80-99 (Hijau), Star ⭐ 100 (Emas Asli Berkilau)
 */
export const GRADE_PALETTE = {
  S: {
    symbol: '⭐',
    color: '#fbbf24',       // Emas Asli Berkilau (Gold Champion, 100%)
    dark: '#d97706',        // Deep Gold
    light: '#fef08a',       // Shimmer Highlight
    rgb: '251, 191, 36',
    glow: 'rgba(245, 158, 11, 0.95)',
    name: 'Emas Asli Berkilau (Gold Champion)',
    sparkle: true
  },
  A: {
    symbol: 'A',
    color: '#10b981',       // Hijau (Emerald Green, 80-99%)
    dark: '#059669',
    light: '#6ee7b7',
    rgb: '16, 185, 129',
    glow: 'rgba(16, 185, 129, 0.45)',
    name: 'Hijau (Emerald Green)',
    sparkle: false
  },
  B: {
    symbol: 'B',
    color: '#84cc16',       // Antara Kuning dan Hijau (Lime / Yellow-Green, 60-79%)
    dark: '#65a30d',
    light: '#bef264',
    rgb: '132, 204, 22',
    glow: 'rgba(132, 204, 22, 0.45)',
    name: 'Lime (Kuning-Hijau)',
    sparkle: false
  },
  C: {
    symbol: 'C',
    color: '#eab308',       // Kuning (Warm Sun Yellow, 40-59%)
    dark: '#ca8a04',
    light: '#fef08a',
    rgb: '234, 179, 8',
    glow: 'rgba(234, 179, 8, 0.45)',
    name: 'Kuning (Warm Yellow)',
    sparkle: false
  },
  D: {
    symbol: 'D',
    color: '#f97316',       // Oranye (Flame Orange, 20-39%)
    dark: '#ea580c',
    light: '#fdba74',
    rgb: '249, 115, 22',
    glow: 'rgba(249, 115, 22, 0.45)',
    name: 'Oranye (Flame Orange)',
    sparkle: false
  },
  E: {
    symbol: 'E',
    color: '#ef4444',       // Merah (Crimson Red, 0-19%)
    dark: '#dc2626',
    light: '#fca5a5',
    rgb: '239, 68, 68',
    glow: 'rgba(239, 68, 68, 0.45)',
    name: 'Merah (Crimson Alert)',
    sparkle: false
  },
  F: {
    symbol: 'E',            // Legacy Alias to E (Merah)
    color: '#ef4444',
    dark: '#dc2626',
    light: '#fca5a5',
    rgb: '239, 68, 68',
    glow: 'rgba(239, 68, 68, 0.45)',
    name: 'Merah (Legacy Fallback)',
    sparkle: false
  }
};

export function getGradeColor(grade) {
  const g = String(grade || '').toUpperCase();
  return GRADE_PALETTE[g]?.color || '#94a3b8';
}

export function getScoreColor(percentage) {
  const grade = calculateGrade(percentage);
  return getGradeColor(grade);
}

export function getGradeSymbol(grade, percentage = null) {
  if (percentage !== null && Number(percentage) >= 100) return '⭐';
  const g = String(grade || '').toUpperCase();
  if (g === 'S') return '⭐';
  return GRADE_PALETTE[g]?.symbol || g || '—';
}

export function getGradeTheme(grade) {
  const g = String(grade || '').toUpperCase();
  return GRADE_PALETTE[g] || {
    symbol: g || '—',
    color: '#94a3b8',
    dark: '#64748b',
    light: '#cbd5e1',
    rgb: '148, 163, 184',
    glow: 'rgba(148, 163, 184, 0.25)',
    name: 'Standard',
    sparkle: false
  };
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


