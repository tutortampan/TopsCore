// TOPS CORE — Authoritative Centralized Grading & Vocabulary Engine
// Phases 9, 10, 11, 15, 16

/**
 * Standard Damerau-Levenshtein Edit Distance
 */
export function damerauLevenshtein(a, b) {
  const la = a.length,
    lb = b.length;
  const dp = Array.from({ length: la + 1 }, (_, i) =>
    Array.from({ length: lb + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
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
export const ENGLISH_CONTRACTIONS = {
  // Pronoun + Be
  "i'm": 'i am',
  "you're": 'you are',
  "he's": 'he is',
  "she's": 'she is',
  "it's": 'it is',
  "we're": 'we are',
  "they're": 'they are',
  // Pronoun + Will
  "i'll": 'i will',
  "you'll": 'you will',
  "he'll": 'he will',
  "she'll": 'she will',
  "it'll": 'it will',
  "we'll": 'we will',
  "they'll": 'they will',
  // Pronoun + Have
  "i've": 'i have',
  "you've": 'you have',
  "we've": 'we have',
  "they've": 'they have',
  // Pronoun + Would / Had
  "i'd": 'i would',
  "you'd": 'you would',
  "he'd": 'he would',
  "she'd": 'she would',
  "we'd": 'we would',
  "they'd": 'they would',
  // Negations
  "can't": 'cannot',
  cannot: 'cannot',
  'can not': 'cannot',
  "don't": 'do not',
  "doesn't": 'does not',
  "didn't": 'did not',
  "won't": 'will not',
  "isn't": 'is not',
  "aren't": 'are not',
  "wasn't": 'was not',
  "weren't": 'were not',
  "haven't": 'have not',
  "hasn't": 'has not',
  "hadn't": 'had not',
  "wouldn't": 'would not',
  "shouldn't": 'should not',
  "couldn't": 'could not',
  // Phrasal / Question
  "let's": 'let us',
  "that's": 'that is',
  "there's": 'there is',
  "what's": 'what is',
  "who's": 'who is',
  "where's": 'where is',
};

/**
 * Normalize answer text, expand English contractions, and eliminate all punctuation:
 * - trim & lowercase
 * - normalize smart/curly apostrophes to standard ASCII '
 * - expand contractions (e.g. I'm -> I am, I'll -> I will, won't -> will not)
 * - strip symbols & punctuation (. , ! ? - – — _ ; : ( ) [ ] { } " ' ` ~ * & ^ % $ # @ + \ /)
 * - collapse multiple whitespaces into a single space
 */
export function cleanPunctuationAndSymbols(text) {
  if (text === null || text === undefined) return '';
  let s = String(text).toLowerCase().trim();

  // 1. Normalize all quote and apostrophe variants to standard ASCII single quote '
  s = s.replace(/[\u2018\u2019\u201A\u201B\u0060\u00B4]/g, "'");

  // 2. Normalize contractions BEFORE stripping punctuation
  for (const [contracted, expanded] of Object.entries(ENGLISH_CONTRACTIONS)) {
    const reg = new RegExp('\\b' + contracted.replace("'", "['’]?") + '\\b', 'gi');
    s = s.replace(reg, expanded);
  }

  // Also handle common speech-to-text / typed contractions that omit apostrophe
  s = s.replace(/\bim\b/g, 'i am');
  s = s.replace(/\bill\b/g, 'i will');
  s = s.replace(/\bdont\b/g, 'do not');
  s = s.replace(/\bcant\b/g, 'cannot');
  s = s.replace(/\bwont\b/g, 'will not');
  s = s.replace(/\byoure\b/g, 'you are');
  s = s.replace(/\btheyre\b/g, 'they are');
  s = s.replace(/\bweve\b/g, 'we have');
  s = s.replace(/\bive\b/g, 'i have');

  // 3. Strip all punctuation and typographical symbols
  s = s.replace(/[()[\]{}\-–—_.,;:!?'"`~*&^%$#@+\\/]/g, ' ');

  // 4. Collapse multiple spaces and trim
  return s.replace(/\s+/g, ' ').trim();
}

export function normalizeAnswerText(text) {
  return cleanPunctuationAndSymbols(text);
}

/**
 * Strip all punctuation and spaces for compact comparison:
 */
export function stripAllPunctuationAndSpaces(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
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
    const withoutParens = str
      .replace(/\([^)]*\)/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
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
    .flatMap((s) => String(s).split(/[;|/]/))
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((item) => {
      expandAnswerVariants(item).forEach((v) => allVariants.push(v));
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
    return {
      result: normStudent ? 'correct' : 'incorrect',
      score: normStudent ? 1.0 : 0.0,
      matchedAnswer: '',
    };
  }

  if (!normStudent && !compactStudent) {
    return { result: 'incorrect', score: 0.0, matchedAnswer: possibleAnswers[0] };
  }

  const isSpeech = answerType === 'speech_to_text' || answerType === 'spoken';
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

    const isWithin2Letters =
      (minLen >= 4 && dist <= 2) ||
      (minLen === 3 && dist <= 1) ||
      (minLen > 0 && dist <= 1 && distNorm <= 1);

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
 * ★ (S) : 100%       - Excellent (Green / Hijau #00c000ff)
 * A     : 90% – 99%  - Very Good (Rich Green #00c000ff)
 * B     : 80% – 89%  - Good (Lime / Yellow-Green #95ff00ff)
 * C     : 60% – 79%  - Enough (Yellow #fff000)
 * D     : 30% – 59%  - Less (Orange #Ff8c00)
 * E     : 0% – 29%   - Fail (Red #ff0000)
 */
export function calculateGrade(percentage) {
  const num = Number(percentage) || 0;
  if (num >= 100) return '★';
  const pct = Math.round(num);
  if (pct >= 90) return 'A';
  if (pct >= 80) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 30) return 'D';
  return 'E';
}

/**
 * Authoritative Student Overall Score & Grade (AGENTS.md §2.8 & §2.10)
 * Evaluates strictly across taken/unlocked tests.
 * Unopened/locked tests do NOT penalize or drag down student score.
 *
 * Formula: average_score = sum(best_percentage_on_taken) / count(taken_tests)
 * Grade: getGrade(average_score)
 *
 * @param {Array<number>} takenPercentages Array of best percentages on completed/taken tests
 * @returns {{ averageScore: number, grade: string, count: number }}
 */
export function calculateOverallStudentScore(takenPercentages = []) {
  if (!Array.isArray(takenPercentages) || takenPercentages.length === 0) {
    return { averageScore: 0, grade: '—', count: 0 };
  }
  const validPcts = takenPercentages.map((p) => Number(p) || 0);
  const sum = validPcts.reduce((acc, curr) => acc + curr, 0);
  const averageScore = Math.round(sum / validPcts.length);
  const grade = calculateGrade(averageScore);
  return { averageScore, grade, count: validPcts.length };
}

/**
 * Authoritative Helper to accurately identify milestone exams vs quizzes.
 * Canonical nomenclature: isExam (replaces legacy isWeeklyExam).
 * Used for exam-only points, academic score, and grade isolation across Admin Class Hub and Student Dashboard.
 */
export function isExam(test) {
  if (!test) return false;
  const t = String(test.test_type || test.type || '').toLowerCase();
  if (t === 'exam') return true;
  if (t === 'quiz') return false;
  const c = String(
    test.category || test.payload?.tier || test.payload?.category || ''
  ).toUpperCase();
  if (c === 'EXAM') return true;
  if (c === 'QUIZ' || c === 'TASK') return false;
  const shell = String(test.shell_code || test.payload?.shell_code || '').toUpperCase();
  if (shell.endsWith('-EXAM') || shell.includes('-EXAM-')) return true;
  if (shell.endsWith('-QUIZ') || shell.includes('-QUIZ-')) return false;
  if (shell.endsWith('-TEST') || shell.includes('-TEST-')) return true;
  if (shell.endsWith('-TASK') || shell.includes('-TASK-')) return false;
  return false;
}

export const isWeeklyExam = isExam; // Backward compatibility alias

/**
 * TOPSCORE SINGLE AUTHORITATIVE COLOR MASTER VAULT
 * Strictly 1 unified palette for all grades, scores, points, and answer evaluations.
 * No hardcoded hex codes may exist outside of this definition.
 */
export const TOPSCORE_COLORS = Object.freeze({
  // 1. Grade & Score Tiers (Nilai Ujian & Persentase)
  STAR: '#00c000ff', // 100% Star ★ (Pure Green - #00c000ff)
  STAR_8HEX: '#00c000ff', // 8-digit hex alias with alpha
  A: '#00c000ff', // 90–99% Grade A (Pure Green - Identical to Star)
  A_8HEX: '#00c000ff', // 8-digit hex alias with alpha
  B: '#95ff00ff', // 80–89% Grade B (Electric Lime - #95ff00ff)
  C: '#FFFF00', // 60–79% Grade C (Pure Yellow - 100% distinct from orange)
  D: '#FF8C00', // 30–59% Grade D (Dark Orange)
  E: '#FF0000', // 0–29% Grade E (Pure Red)

  // 2. RGB Equivalents for Opacities, Shadows, & Glows
  STAR_RGB: '0, 192, 0',
  A_RGB: '0, 192, 0',
  B_RGB: '149, 255, 0',
  C_RGB: '255, 255, 0',
  D_RGB: '255, 140, 0',
  E_RGB: '255, 0, 0',

  // 3. Question Answer Evaluation Status (Result Page)
  CORRECT: '#00c000ff', // Full point (1.0 pt)  -> Pure Green (Star / A)
  PARTIAL: '#FFFF00', // Half point (0.5 pt)  -> Pure Yellow (Grade C standard)
  INCORRECT: '#FF0000', // Zero point (0.0 pt)  -> Pure Red (Grade E fail tier)

  // 4. Grade Badge Text Contrast
  TEXT_STAR: '#FFFFFF', // White star symbol on ★ badge
  TEXT_DARK: '#0F172A', // Deep dark slate letters for A, B, C, D, E badges
});

/**
 * Authoritative Grade & Score Palette (6 Clean Tiers: ★, A, B, C, D, E)
 */
const STAR_THEME = {
  symbol: '★',
  label: 'Excellent',
  predicate: 'Excellent',
  color: TOPSCORE_COLORS.STAR,
  dark: '#006400',
  light: '#86efac',
  rgb: TOPSCORE_COLORS.STAR_RGB,
  glow: 'rgba(0, 192, 0, 0.5)',
  textColor: TOPSCORE_COLORS.TEXT_STAR,
  name: 'Excellent (100%)',
  minScore: 100,
  maxScore: 100,
  sparkle: true,
};

export const GRADE_PALETTE = {
  '★': STAR_THEME,
  S: STAR_THEME, // Backward-compatibility alias for historical records
  A: {
    symbol: 'A',
    label: 'Very Good',
    predicate: 'Very Good',
    color: TOPSCORE_COLORS.A,
    dark: '#006400',
    light: '#86efac',
    rgb: TOPSCORE_COLORS.A_RGB,
    glow: 'rgba(0, 192, 0, 0.35)',
    textColor: TOPSCORE_COLORS.TEXT_DARK,
    name: 'Very Good (90-99%)',
    minScore: 90,
    maxScore: 99,
    sparkle: false,
  },
  B: {
    symbol: 'B',
    label: 'Good',
    predicate: 'Good',
    color: TOPSCORE_COLORS.B,
    dark: '#5ebd00',
    light: '#d9f99d',
    rgb: TOPSCORE_COLORS.B_RGB,
    glow: 'rgba(149, 255, 0, 0.35)',
    textColor: TOPSCORE_COLORS.TEXT_DARK,
    name: 'Good (80-89%)',
    minScore: 80,
    maxScore: 89,
    sparkle: false,
  },
  C: {
    symbol: 'C',
    label: 'Enough',
    predicate: 'Enough',
    color: TOPSCORE_COLORS.C,
    dark: '#cccc00',
    light: '#ffff99',
    rgb: TOPSCORE_COLORS.C_RGB,
    glow: 'rgba(255, 255, 0, 0.35)',
    textColor: TOPSCORE_COLORS.TEXT_DARK,
    name: 'Enough (60-79%)',
    minScore: 60,
    maxScore: 79,
    sparkle: false,
  },
  D: {
    symbol: 'D',
    label: 'Less',
    predicate: 'Less',
    color: TOPSCORE_COLORS.D,
    dark: '#cc7000',
    light: '#fed7aa',
    rgb: TOPSCORE_COLORS.D_RGB,
    glow: 'rgba(255, 140, 0, 0.35)',
    textColor: TOPSCORE_COLORS.TEXT_DARK,
    name: 'Less (30-59%)',
    minScore: 30,
    maxScore: 59,
    sparkle: false,
  },
  E: {
    symbol: 'E',
    label: 'Fail',
    predicate: 'Fail',
    color: TOPSCORE_COLORS.E,
    dark: '#cc0000',
    light: '#ff9999',
    rgb: TOPSCORE_COLORS.E_RGB,
    glow: 'rgba(255, 0, 0, 0.35)',
    textColor: TOPSCORE_COLORS.TEXT_DARK,
    name: 'Fail (0-29%)',
    minScore: 0,
    maxScore: 29,
    sparkle: false,
  },
};

/**
 * Universal Grade Color Resolver by Percentage Score (Single Source of Truth)
 * Returns authoritative color hex for any given percentage score.
 *
 * @param {number|string} percentage Score percentage (0 - 100)
 * @returns {string} Hex color string
 */
export function getGradeColorByScore(percentage) {
  const p = Number(percentage);
  if (isNaN(p) || p < 0) return '#94a3b8';
  if (p >= 100) return TOPSCORE_COLORS.STAR;
  if (p >= 90) return TOPSCORE_COLORS.A;
  if (p >= 80) return TOPSCORE_COLORS.B;
  if (p >= 60) return TOPSCORE_COLORS.C;
  if (p >= 30) return TOPSCORE_COLORS.D;
  return TOPSCORE_COLORS.E;
}

export function getGradeColor(grade, isRemedial = false) {
  const g = String(grade || '').trim();
  if (g === '★' || g.toUpperCase() === 'S') return TOPSCORE_COLORS.STAR;
  return GRADE_PALETTE[g.toUpperCase()]?.color || '#94a3b8';
}

export function getScoreColor(percentage, isRemedial = false) {
  return getGradeColorByScore(percentage);
}

/**
 * Authoritative Evaluation Result Color Resolver (Single Source of Truth)
 * @param {'correct'|'minor_spelling_error'|'partial'|'incorrect'} category
 * @returns {string} Hex color
 */
export function getEvaluationColor(category) {
  const c = String(category || '').toLowerCase();
  if (c === 'correct' || c === 'full') return TOPSCORE_COLORS.CORRECT;
  if (c === 'minor_spelling_error' || c === 'partial' || c === 'half')
    return TOPSCORE_COLORS.PARTIAL;
  return TOPSCORE_COLORS.INCORRECT;
}

export function getGradeSymbol(grade, percentage = null, isRemedial = false) {
  if (percentage !== null && Number(percentage) >= 100) {
    return '★';
  }
  const g = String(grade || '').trim();
  if (g === '★' || g === '⭐' || g.toUpperCase() === 'S' || g.toUpperCase() === 'STAR') {
    return '★';
  }
  return GRADE_PALETTE[g.toUpperCase()]?.symbol || g || '—';
}

export function formatGradeBadgeHtml(grade, isRemedial = false, customStyle = '') {
  const g = String(grade || '').trim();
  const isStar = g === '★' || g === '⭐' || g.toUpperCase() === 'S' || g.toUpperCase() === 'STAR';
  if (isStar) {
    return `<span class="grade-circle grade-circle-star" title="Grade ★ (100% Excellent)" style="${customStyle}">★</span>`;
  }
  const cleanGrade = g.toUpperCase();
  const lowerG = cleanGrade.toLowerCase();
  const color = GRADE_PALETTE[cleanGrade]?.color || '#94a3b8';
  const textColor = GRADE_PALETTE[cleanGrade]?.textColor || TOPSCORE_COLORS.TEXT_DARK;
  return `<span class="grade-circle grade-circle-${lowerG}" style="background:${color}; color:${textColor}; ${customStyle}" title="Grade ${cleanGrade}">${cleanGrade}</span>`;
}

export function getGradeTheme(grade, isRemedial = false) {
  const g = String(grade || '').trim();
  const isStar = g === '★' || g === '⭐' || g.toUpperCase() === 'S' || g.toUpperCase() === 'STAR';
  const effectiveKey = isStar ? '★' : g.toUpperCase();
  const theme = GRADE_PALETTE[effectiveKey] || {
    symbol: isStar ? '★' : g || '—',
    color: isStar ? TOPSCORE_COLORS.STAR : '#94a3b8',
    dark: isStar ? '#006400' : '#64748b',
    light: isStar ? '#86efac' : '#cbd5e1',
    rgb: isStar ? TOPSCORE_COLORS.STAR_RGB : '148, 163, 184',
    glow: isStar ? 'rgba(0, 192, 0, 0.5)' : 'rgba(148, 163, 184, 0.25)',
    textColor: isStar ? TOPSCORE_COLORS.TEXT_STAR : TOPSCORE_COLORS.TEXT_DARK,
    name: isStar ? 'Excellent (100%)' : 'Standard',
    sparkle: isStar,
  };
  if (isRemedial) {
    return {
      ...theme,
      isRemedial: true,
      symbol: theme.symbol,
    };
  }
  return theme;
}

/**
 * Authoritative Achievement Status (Official Predicate)
 * Strictly 6 official tiers: FAIL (0-29%), LESS (30-59%), ENOUGH (60-79%), GOOD (80-89%), VERY GOOD (90-99%), EXCELLENT (100%).
 */
export function getAchievementStatus(grade, percentage = null) {
  const g = String(grade || '').trim();
  if (g === '★' || g === '⭐' || g.toUpperCase() === 'S' || g.toUpperCase() === 'STAR') {
    return 'EXCELLENT';
  }
  let effGrade = g.toUpperCase();
  if (!['A', 'B', 'C', 'D', 'E'].includes(effGrade)) {
    const p = parseFloat(percentage ?? 0);
    if (p >= 100) return 'EXCELLENT';
    if (p >= 90) effGrade = 'A';
    else if (p >= 80) effGrade = 'B';
    else if (p >= 60) effGrade = 'C';
    else if (p >= 30) effGrade = 'D';
    else effGrade = 'E';
  }
  const map = {
    A: 'VERY GOOD',
    B: 'GOOD',
    C: 'ENOUGH',
    D: 'LESS',
    E: 'FAIL',
  };
  return map[effGrade] || 'ENOUGH';
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
  const evaluatedAnswers = answers.map((ans) => {
    const evalRes = evaluateAnswer(ans.student_answer, ans.correct_answer, ans.answer_type);
    totalScore += evalRes.score;
    return {
      ...ans,
      score: evalRes.score,
      evaluation_result: evalRes.result,
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
    answers: evaluatedAnswers,
  };
}

/**
 * Authoritative Milestone Progression & Exam Mastery Engine (Phase 159).
 *
 * Rules:
 * 1. Evaluated EXCLUSIVELY from Exams (Quizzes excluded from academic score/points).
 * 2. Next Exam 0% Penalty:
 *    - Exams are grouped into Themes (A, B, C, D) in sequential order.
 *    - Once a student passes Milestone Theme N (>= 60%), Milestone Theme N+1 is
 *      automatically queued into the active denominator with 0 earned points,
 *      even if the student is not yet eligible to take it.
 *    - If Milestone Theme N was attempted but not passed (< 60%), Theme N is included
 *      in the denominator, but Theme N+1 is not queued yet.
 * 3. Zero-Exam Edge Case:
 *    - When 0 exams are completed, returns score: 0 (displays '—'), grade: '—', points: 0.
 *
 * @param {Array<{ effPoints: number, effPct: number, totalQ: number, test: object }>} examEntries - Student's best exam attempts
 * @param {Array<object>} allClassExams - All exam objects for the class
 * @returns {{ totalPoints: number, overallScore: number, grade: string, denominator: number, completedExamCount: number, completedWeeklyCount: number }}
 */
export function computeMilestoneExamMastery(examEntries = [], allClassExams = []) {
  const completedExamCount = Array.isArray(examEntries) ? examEntries.length : 0;
  const completedWeeklyCount = completedExamCount; // Backward compatibility alias

  // Riwayat Akumulasi Seluruh Poin (Arsip/Audit Track Record)
  const cumulativePoints =
    Math.round(examEntries.reduce((sum, e) => sum + Number(e.effPoints ?? e.points ?? 0), 0) * 10) /
    10;

  // Helper to extract theme code from test
  const helperThemeCode = (t) => {
    if (!t) return 'A';
    if (t.payload?.theme_code) return String(t.payload.theme_code).toUpperCase();
    const shell = String(t.shell_code || t.payload?.shell_code || '');
    const m = shell.match(/^[0-9]+([A-Za-z])/);
    if (m) return m[1].toUpperCase();
    const titleM = String(t.title || '').match(/Theme\s+([A-Za-z])|Vocabulary\s+([A-Za-z])/i);
    if (titleM) return (titleM[1] || titleM[2]).toUpperCase();
    return 'A';
  };

  const getExpectedMax = (t) => {
    if (t.payload?.total_questions) return Number(t.payload.total_questions);
    if (t.total_questions) return Number(t.total_questions);
    const ord = Number(t.display_order || 0);
    if (ord === 7) return 120;
    if (ord === 8) return 30;
    if (ord === 17) return 280;
    if (ord === 18) return 70;
    if (ord === 29) return 480;
    if (ord === 30) return 120;
    if (ord === 39) return 640;
    if (ord === 40) return 160;
    return 100;
  };

  // Group class exams by theme
  const themeExamsMap = {};
  (allClassExams || []).forEach((t) => {
    if (!isExam(t)) return;
    const tc = helperThemeCode(t);
    if (!themeExamsMap[tc]) themeExamsMap[tc] = [];
    themeExamsMap[tc].push(t);
  });

  const sortedThemes = Object.keys(themeExamsMap).sort();
  if (sortedThemes.length === 0 || completedExamCount === 0) {
    return {
      totalPoints: completedExamCount > 0 ? totalPoints : 0,
      overallScore: 0,
      grade: '—',
      denominator: 0,
      completedExamCount,
      completedWeeklyCount,
      activeThemeCode: null,
      themeStats: [],
      includedThemeCodes: [],
      includedExamIds: new Set(),
    };
  }

  // Pre-calculate theme max questions and student earned points per theme
  const themeStats = sortedThemes.map((tc, idx) => {
    const examsInTheme = themeExamsMap[tc];
    const examIds = new Set(examsInTheme.map((t) => t.id));

    const studentAttemptsInTheme = examEntries.filter((e) => {
      const eId = e.test?.id || e.testId || e.test_id;
      if (eId && examIds.has(eId)) return true;
      const tcAttempt = helperThemeCode(e.test);
      return tcAttempt === tc;
    });

    // Package calculation: each theme is 1 package.
    // For each exam in the theme package:
    // If student attempted it, use their attempt's actual total_questions (or totalQ).
    // If student did not attempt it, count as unattempted (0 pts) with default expected questions.
    let dynamicThemeMaxQ = 0;
    examsInTheme.forEach(t => {
      const att = studentAttemptsInTheme.find(e => {
        const eId = e.test?.id || e.testId || e.test_id;
        return eId === t.id;
      });
      if (att && (att.totalQ || att.total_questions)) {
        dynamicThemeMaxQ += Number(att.totalQ || att.total_questions);
      } else {
        dynamicThemeMaxQ += getExpectedMax(t);
      }
    });

    const maxQ = dynamicThemeMaxQ > 0 ? dynamicThemeMaxQ : examsInTheme.reduce((acc, t) => acc + getExpectedMax(t), 0);

    const earned = studentAttemptsInTheme.reduce(
      (sum, e) => sum + Number(e.effPoints ?? e.points ?? 0),
      0
    );
    const attempted = studentAttemptsInTheme.length > 0;
    const scorePct = maxQ > 0 ? Math.round((earned / maxQ) * 100) : 0;
    const passed = attempted && maxQ > 0 && earned / maxQ >= 0.6;

    return {
      themeCode: tc,
      index: idx,
      maxQ,
      earned,
      attempted,
      passed,
      scorePct,
    };
  });

  // 2. Authoritative Single Vocab Model: Latest Active Theme Score & Grade
  // Nilai Global (Overall Score & Grade) dihitung dari Tema Terakhir yang aktif dikerjakan siswa
  let latestAttemptedTheme = null;
  for (let i = themeStats.length - 1; i >= 0; i--) {
    if (themeStats[i].attempted) {
      latestAttemptedTheme = themeStats[i];
      break;
    }
  }

  let totalPoints = 0;
  let overallScore = 0;
  let grade = '—';
  let denominator = 0;

  if (latestAttemptedTheme) {
    // Sesi Ujian Tema Mutakhir: Poin dan Nilai murni merefleksikan capaian sesi tes terbaru (bukan akumulasi masa lalu)
    totalPoints = Math.round(latestAttemptedTheme.earned * 10) / 10;
    overallScore = latestAttemptedTheme.scorePct;
    grade = calculateGrade(overallScore);
    denominator = latestAttemptedTheme.maxQ;
  } else if (completedExamCount > 0) {
    const sumEarned = examEntries.reduce((sum, e) => sum + Number(e.effPoints ?? e.points ?? 0), 0);
    const sumMax = examEntries.reduce((sum, e) => sum + Number(e.totalQ ?? 0), 0);
    totalPoints = Math.round(sumEarned * 10) / 10;
    overallScore = sumMax > 0 ? Math.round((sumEarned / sumMax) * 100) : 0;
    grade = calculateGrade(overallScore);
    denominator = sumMax;
  }

  return {
    totalPoints,
    cumulativePoints,
    overallScore,
    grade,
    denominator,
    completedExamCount,
    completedWeeklyCount,
    activeThemeCode: latestAttemptedTheme?.themeCode || null,
    themeStats,
    // Backward compatibility aliases
    includedThemeCodes: latestAttemptedTheme ? [latestAttemptedTheme.themeCode] : [],
    includedExamIds: new Set(
      latestAttemptedTheme ? (themeExamsMap[latestAttemptedTheme.themeCode] || []).map((t) => t.id) : []
    ),
  };
}
