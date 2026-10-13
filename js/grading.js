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
 * Centralized Grade Engine (AGENTS.md §2.10)
 */
export function calculateGrade(percentage) {
  const pct = Math.round(Number(percentage) || 0);
  if (pct >= 100) return 'S';
  if (pct >= 91) return 'A';
  if (pct >= 71) return 'B';
  if (pct >= 51) return 'C';
  if (pct >= 31) return 'D';
  if (pct >= 11) return 'E';
  return 'F';
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

