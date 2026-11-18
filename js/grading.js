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

  // 3. Strip all punctuation and typographical symbols (including unicode hyphens/dashes)
  s = s.replace(/[()[\]{}\-–—\u2010-\u2015\u2212\uFE63\uFF0D_.,;:!?'"`~*&^%$#@+\\/]/g, ' ');

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
 * Known derivational suffixes for morphological stem matching (Part-of-Speech variants).
 * Matches word-form transformations like locate/location, dedicate/dedicated, create/creative.
 */
const POS_DERIVATIONAL_SUFFIXES = new Set([
  'tion', 'sion', 'ion', 'ation', 'ition', 'ution', 'ication',
  'ment', 'ness', 'ity', 'ety', 'ing', 'ed', 'er', 'or',
  'ly', 'ful', 'iful', 'y', 'able', 'ible', 'ive', 'al',
  'ous', 'ious', 'ize', 'ise', 'ate', 'est', 's', 'es',
  'ance', 'ence', 'ant', 'ent', 'ic', 'ical', 'less', 'ss',
  't', 'ce', 'se', 'd', 'e'
]);

/**
 * Irregular morphological word families sharing common conceptual roots.
 */
const IRREGULAR_WORD_FAMILIES = [
  ['succeed', 'success', 'successful', 'successfully'],
  ['choose', 'choice'],
  ['decide', 'decision', 'decisive'],
  ['describe', 'description', 'descriptive'],
  ['conclude', 'conclusion', 'conclusive'],
  ['provide', 'provision'],
  ['apply', 'application', 'applicant'],
  ['know', 'knowledge'],
  ['fly', 'flight'],
  ['die', 'death', 'dead'],
  ['grow', 'growth'],
  ['strong', 'strength'],
  ['long', 'length'],
  ['wide', 'width'],
  ['deep', 'depth'],
  ['high', 'height'],
];

/**
 * Check if two single words share a morphological root / part-of-speech family.
 */
export function isSingleWordFormMatch(sW, tW) {
  if (!sW || !tW || sW === tW) return false;

  for (const fam of IRREGULAR_WORD_FAMILIES) {
    if (fam.includes(sW) && fam.includes(tW)) return true;
  }

  if (sW.length < 4 || tW.length < 4) return false;

  let commonPrefixLen = 0;
  while (
    commonPrefixLen < sW.length &&
    commonPrefixLen < tW.length &&
    sW[commonPrefixLen] === tW[commonPrefixLen]
  ) {
    commonPrefixLen++;
  }

  if (commonPrefixLen >= 4) {
    const sRest = sW.slice(commonPrefixLen);
    const tRest = tW.slice(commonPrefixLen);
    const isSuffix = (rest) => rest === '' || POS_DERIVATIONAL_SUFFIXES.has(rest);
    if (isSuffix(sRest) && isSuffix(tRest)) return true;
  }

  return false;
}

/**
 * Check if two answer phrases share morphological word-form stems across their words.
 */
export function isWordFormAnswerMatch(studentText, optText) {
  const s = String(studentText || '').toLowerCase().trim();
  const t = String(optText || '').toLowerCase().trim();
  if (!s || !t || s === t) return false;

  const sWords = s.split(/\s+/).filter(Boolean);
  const tWords = t.split(/\s+/).filter(Boolean);
  if (sWords.length !== tWords.length || sWords.length === 0) return false;

  let hasFormDiff = false;
  for (let i = 0; i < sWords.length; i++) {
    const sw = sWords[i];
    const tw = tWords[i];
    if (sw === tw) continue;
    if (isSingleWordFormMatch(sw, tw)) {
      hasFormDiff = true;
    } else {
      return false;
    }
  }
  return hasFormDiff;
}

/**
 * Curated Acoustic Homophone Pairs for Spoken Assessment
 * When students pronounce words correctly into a speech-to-text engine,
 * the engine frequently produces phonetic homophones (e.g. "buy" -> "bye" or "by",
 * "wrap" -> "rap", "sea" -> "see", "hear" -> "here").
 * Evaluated ONLY in Spoken / Speech-to-Text modes.
 */
export const HOMOPHONE_MAP = {
  'buy': ['bye', 'by'],
  'bye': ['buy', 'by'],
  'by': ['buy', 'bye'],
  'wrap': ['rap'],
  'rap': ['wrap'],
  'sea': ['see'],
  'see': ['sea'],
  'hear': ['here'],
  'here': ['hear'],
  'right': ['write'],
  'write': ['right'],
  'meat': ['meet'],
  'meet': ['meat'],
  'flour': ['flower'],
  'flower': ['flour'],
  'hour': ['our'],
  'our': ['hour'],
  'son': ['sun'],
  'sun': ['son'],
  'piece': ['peace'],
  'peace': ['piece'],
  'whole': ['hole'],
  'hole': ['whole'],
  'wait': ['weight'],
  'weight': ['wait'],
  'break': ['brake'],
  'brake': ['break'],
  'stair': ['stare'],
  'stare': ['stair'],
  'tail': ['tale'],
  'tale': ['tail'],
  'bare': ['bear'],
  'bear': ['bare'],
  'weather': ['whether'],
  'whether': ['weather'],
  'knight': ['night'],
  'night': ['knight'],
  'week': ['weak'],
  'weak': ['week'],
  'road': ['rode'],
  'rode': ['road'],
  'mail': ['male'],
  'male': ['mail'],
  'to': ['too', 'two'],
  'too': ['to', 'two'],
  'two': ['to', 'too'],
  'there': ['their', "they're"],
  'their': ['there', "they're"],
  "they're": ['there', 'their'],
  'pair': ['pear'],
  'pear': ['pair'],
  'plain': ['plane'],
  'plane': ['plain'],
  'sail': ['sale'],
  'sale': ['sail'],
  'steal': ['steel'],
  'steel': ['steal'],
  'blew': ['blue'],
  'blue': ['blew'],
  'know': ['no'],
  'no': ['know'],
  'knew': ['new'],
  'new': ['knew'],
  'one': ['won'],
  'won': ['one'],
  'wear': ['where'],
  'where': ['wear'],
  'which': ['witch'],
  'witch': ['which'],
  'wood': ['would'],
  'would': ['wood'],
  'eight': ['ate'],
  'ate': ['eight'],
  'dear': ['deer'],
  'deer': ['dear'],
  'die': ['dye'],
  'dye': ['die'],
  'fair': ['fare'],
  'fare': ['fair'],
  'heal': ['heel'],
  'heel': ['heal'],
  'idle': ['idol'],
  'idol': ['idle'],
  'knot': ['not'],
  'not': ['knot'],
  'made': ['maid'],
  'maid': ['made'],
  'main': ['mane'],
  'mane': ['main'],
  'pale': ['pail'],
  'pail': ['pale'],
  'past': ['passed'],
  'passed': ['past'],
  'poor': ['pour'],
  'pour': ['poor'],
  'pray': ['prey'],
  'prey': ['pray'],
  'root': ['route'],
  'route': ['root'],
  'scene': ['seen'],
  'seen': ['scene'],
  'sight': ['site'],
  'site': ['sight'],
  'sole': ['soul'],
  'soul': ['sole'],
  'some': ['sum'],
  'sum': ['some'],
  'toe': ['tow'],
  'tow': ['toe'],
  'waist': ['waste'],
  'waste': ['waist'],
  'warn': ['worn'],
  'worn': ['warn']
};

/**
 * Check if two answer strings match either directly or via acoustic homophones (per word).
 */
export function isAcousticHomophoneMatch(studentText, targetText) {
  const normS = cleanPunctuationAndSymbols(studentText).toLowerCase().trim();
  const normT = cleanPunctuationAndSymbols(targetText).toLowerCase().trim();
  if (!normS || !normT) return false;
  if (normS === normT) return true;

  const sWords = normS.split(/\s+/).filter(Boolean);
  const tWords = normT.split(/\s+/).filter(Boolean);
  if (sWords.length !== tWords.length || sWords.length === 0) return false;

  let hasHomophone = false;
  for (let i = 0; i < tWords.length; i++) {
    const sw = sWords[i];
    const tw = tWords[i];
    if (sw === tw) continue;
    const homophones = HOMOPHONE_MAP[tw];
    if (homophones && homophones.includes(sw)) {
      hasHomophone = true;
      continue;
    }
    return false;
  }
  return hasHomophone;
}

/**
 * Single Authoritative Answer Evaluation (Written, Speech, Dropdown, Multiple Choice)
 * Evaluates student answer against raw correct answer snapshot.
 *
 * @param {string} studentAnswer
 * @param {string|string[]} rawCorrectAnswer
 * @param {string} answerType ('written' | 'speech_to_text' | 'spoken' | 'dropdown' | 'multiple_choice')
 * @returns {{ result: 'correct'|'minor_spelling_error'|'minor_word_form_error'|'incorrect', score: number, matchedAnswer: string }}
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

    // 1b. Acoustic Homophone Engine (Spoken / Speech-to-Text Mode Only)
    // When students speak, STT engines frequently transcribe phonetic homophones
    // (e.g. "buy" -> "bye" / "by", "wrap" -> "rap", "sea" -> "see", "hear" -> "here").
    // Under Spoken mode, this is awarded 1.0 pt (correct) because pronunciation was valid.
    if (isSpeech && isAcousticHomophoneMatch(normStudent, normOpt)) {
      return { result: 'correct', score: 1.0, matchedAnswer: opt, is_homophone: true };
    }

    // 2. Word Form / Part-of-Speech Matching (Morphological Stem Matching)
    // Awards 0.5 pt partial credit when beginner student demonstrates knowledge of the
    // root word family but produces an intentional grammatical variation (e.g. "success"
    // vs "succeed", "dedicate" vs "dedicated", "location" vs "locate").
    // Evaluated before acoustic typo leniency to distinguish morphological errors from
    // acoustic microphone noise. Applies across BOTH spoken and written modalities.
    const isWordForm = isWordFormAnswerMatch(normStudent, normOpt);
    if (isWordForm) {
      if (bestResult.score < 0.5) {
        bestResult = { result: 'minor_word_form_error', score: 0.5, matchedAnswer: opt };
      }
      continue; // do not treat intentional grammatical word form variations as acoustic typos
    }

    // 3. Edit distance (Damerau-Levenshtein)
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

    // 4. Function-Word + Plural-S Tolerance (spoken only, multi-word idioms/phrases)
    // Covers STT dropping/inserting unstressed articles, prepositions, conjunctions,
    // and minor plural-s mismatches across multiple content words.
    // e.g. "cost an arm and leg" vs "cost an arm and a leg"        (function word)
    //      "back to drawing board" vs "back to the drawing board"   (function word)
    //      "cats dogs and birds"  vs "cat dog and bird"             (plural-s on 3 words, LD=3)
    //      "differences and similarities" vs "difference and similarity" (plural-s)
    // Only applied when the target is 4+ words to avoid false positives on short answers.
    if (isSpeech) {
      const FW_RE = /\b(a|an|the|to|in|on|of|at|for|from|with|by|as|up|out|off|over|into|onto|upon|and|or|but|so|yet|nor|both|just|very|too)\b/g;
      const optWordCount = normOpt.split(/\s+/).length;

      if (optWordCount >= 4) {
        // Strip function words first
        const contentStudent = normStudent.replace(FW_RE, ' ').replace(/\s+/g, ' ').trim();
        const contentOpt    = normOpt.replace(FW_RE, ' ').replace(/\s+/g, ' ').trim();

        // S-stem: strip trailing -s / -es / -ies from words ≥4 chars (safe — avoids "bus"→"bu")
        // "ies" → "y" (e.g. similarities→similarity), "es" → "" (e.g. boxes→box), "s" → "" (e.g. cats→cat)
        const sstem = (str) =>
          str.split(/\s+/).map(w =>
            w.length >= 4
              ? w.endsWith('ies') ? w.slice(0, -3) + 'y'
              : w.endsWith('es')  ? w.slice(0, -2)
              : w.endsWith('s')   ? w.slice(0, -1)
              : w
              : w
          ).join(' ');

        const stemStudent = sstem(contentStudent);
        const stemOpt     = sstem(contentOpt);

        if (contentStudent && contentOpt) {
          // Pass A — exact content-word match (function words stripped only)
          if (contentStudent === contentOpt) {
            return { result: 'correct', score: 1.0, matchedAnswer: opt };
          }
          // Pass B — exact stem match (function words + plural-s stripped)
          if (stemStudent === stemOpt) {
            return { result: 'correct', score: 1.0, matchedAnswer: opt };
          }
          // Pass C — near-miss on stems (≤2 LD) → correct (speech leniency)
          const stemDist   = damerauLevenshtein(stemStudent, stemOpt);
          const stemMinLen = Math.min(stemStudent.length, stemOpt.length);
          if (stemDist <= 2 && stemMinLen >= 4) {
            return { result: 'correct', score: 1.0, matchedAnswer: opt };
          }
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
export function calculateGrade(percentage, options = {}) {
  const isAlumni = Boolean(options?.isAlumni);
  const isManual = Boolean(options?.isManual);
  const isForgiven = Boolean(options?.isForgiven);
  const isRem = typeof options === 'boolean' ? options : Boolean(options?.isRemedial);

  if (isAlumni) return 'X';
  if (isManual) return 'M';
  if (isForgiven) return 'F';
  if (isRem) return 'R';

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
 * Authoritative Helper to accurately identify milestone exams vs tasks.
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
  STAR: '#ff2d87', // 100% Star ★ (Electric Pink - #ff2d87)
  STAR_8HEX: '#ff2d87ff', // 8-digit hex alias with alpha
  A: '#00c000ff', // 90–99% Grade A (Pure Green - Identical to Star)
  A_8HEX: '#00c000ff', // 8-digit hex alias with alpha
  B: '#95ff00ff', // 80–89% Grade B (Electric Lime - #95ff00ff)
  C: '#FFFF00', // 60–79% Grade C (Pure Yellow - 100% distinct from orange)
  D: '#FF8C00', // 30–59% Grade D (Dark Orange)
  E: '#FF0000', // 0–29% Grade E (Pure Red)
  REMEDIAL: '#FFFF00', // Remedial Exam Grade R (Pure Yellow - identical to Grade C)
  FORGIVEN: '#FF0000', // Admin-Forgiven Prerequisite Override Grade F (Pure Red #FF0000 - identical to Grade E)
  X: '#8B5CF6', // Special Grade X for Alumni (Purple)
  PURPLE: '#8B5CF6',
  NEUTRAL: '#94a3b8', // Neutral Slate Gray for Cold Start / LET'S GO / Placeholder
  NEUTRAL_RGB: '148, 163, 184',

  // 2. RGB Equivalents for Opacities, Shadows, & Glows
  STAR_RGB: '255, 45, 135',
  A_RGB: '0, 192, 0',
  B_RGB: '149, 255, 0',
  C_RGB: '255, 255, 0',
  D_RGB: '255, 140, 0',
  E_RGB: '255, 0, 0',
  REMEDIAL_RGB: '255, 255, 0',
  FORGIVEN_RGB: '255, 0, 0',
  X_RGB: '139, 92, 246',
  PURPLE_RGB: '139, 92, 246',
  NEUTRAL_RGB: '148, 163, 184',

  // 3. Question Answer Evaluation Status (Result Page)
  CORRECT: '#00c000ff', // Full point (1.0 pt)  -> Pure Green (Strictly referencing Grade A, never Star)
  PARTIAL: '#FFFF00', // Half point (0.5 pt)  -> Pure Yellow (Grade C standard)
  INCORRECT: '#FF0000', // Zero point (0.0 pt)  -> Pure Red (Grade E fail tier)

  // 4. Grade Badge Text Contrast
  TEXT_STAR: '#0F172A', // Deep dark slate star symbol on ★ badge (Universal Dark Standard)
  TEXT_DARK: '#0F172A', // Deep dark slate letters for A, B, C, D, E badges
});

/**
 * 4-Pillar Progression & ABCD System Colors (SSOT Rule 2.10.1: Pink -> Orange -> Lime -> Purple)
 * A: Electric Pink (#ff2d87 - Independent SSOT token source, decoupled from Grade Star)
 * B: Dark Orange (Grade D, #ff8c00)
 * C: Electric Lime (Grade B, #95ff00)
 * D: Vibrant Purple / Violet (#c084fc)
 */
export const TOPSCORE_QUAD_COLORS = Object.freeze({
  A: '#ff2d87',
  B: TOPSCORE_COLORS.D, // #FF8C00 (Dark Orange)
  C: TOPSCORE_COLORS.B, // #95ff00ff (Electric Lime)
  D: '#c084fc',
  A_RGB: '255, 45, 135',
  B_RGB: TOPSCORE_COLORS.D_RGB,
  C_RGB: TOPSCORE_COLORS.B_RGB,
  D_RGB: '192, 132, 252'
});

/**
 * Authoritative Grade & Score Palette (6 Clean Tiers: ★, A, B, C, D, E)
 */
const STAR_THEME = {
  symbol: '★',
  label: 'Excellent',
  predicate: 'Excellent',
  color: TOPSCORE_COLORS.STAR,
  dark: '#be185d',
  light: '#f472b6',
  rgb: TOPSCORE_COLORS.STAR_RGB,
  glow: 'rgba(255, 45, 135, 0.5)',
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
  R: {
    symbol: 'R',
    label: 'Remedial',
    predicate: 'Remedial',
    color: TOPSCORE_COLORS.C, // Kuning seperti Grade C (#FFFF00)
    dark: '#cccc00',
    light: '#ffff99',
    rgb: TOPSCORE_COLORS.C_RGB,
    glow: 'rgba(255, 255, 0, 0.35)',
    textColor: TOPSCORE_COLORS.TEXT_DARK,
    name: 'Remedial (60%)',
    minScore: 0,
    maxScore: 60,
    sparkle: false,
  },
  F: {
    symbol: 'F',
    label: 'Forgiven',
    predicate: 'Forgiven',
    color: TOPSCORE_COLORS.E, // Merah seperti Grade E (#FF0000)
    dark: '#cc0000',
    light: '#ff9999',
    rgb: TOPSCORE_COLORS.E_RGB,
    glow: 'rgba(255, 0, 0, 0.35)',
    textColor: TOPSCORE_COLORS.TEXT_DARK,
    name: 'Forgiven',
    minScore: 0,
    maxScore: 0,
    sparkle: false,
  },
  M: {
    symbol: 'M',
    label: 'Manual',
    predicate: 'Manual Score',
    color: '#38bdf8', // Cyan (#38bdf8 / Tactical Blue)
    dark: '#0284c7',
    light: '#bae6fd',
    rgb: '56, 189, 248',
    glow: 'rgba(56, 189, 248, 0.35)',
    textColor: '#0F172A',
    name: 'Manual Score',
    minScore: 0,
    maxScore: 100,
    sparkle: false,
  },
  X: {
    symbol: 'X',
    label: 'Alumni',
    predicate: 'Alumni',
    color: '#8B5CF6',
    dark: '#6d28d9',
    light: '#c4b5fd',
    rgb: '139, 92, 246',
    glow: 'rgba(139, 92, 246, 0.4)',
    textColor: '#FFFFFF',
    name: 'Alumni',
    minScore: null,
    maxScore: null,
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
  if (isRemedial) return TOPSCORE_COLORS.C; // Grade R Remedial is Yellow (Grade C)
  const g = String(grade || '').trim();
  if (g.toUpperCase() === 'R' || g.toUpperCase() === 'REMEDIAL') return TOPSCORE_COLORS.C;
  if (g.toUpperCase() === 'F' || g.toUpperCase() === 'FORGIVEN') return TOPSCORE_COLORS.E;
  if (g.toUpperCase() === 'M' || g.toUpperCase() === 'MANUAL') return '#38bdf8'; // Grade M is Cyan (#38bdf8)
  if (g === '★' || g.toUpperCase() === 'S') return TOPSCORE_COLORS.STAR;
  if (g.toUpperCase() === 'X' || g.toUpperCase() === 'ALUMNI') return TOPSCORE_COLORS.X;
  if (g.toUpperCase() === "LET'S GO" || g.toUpperCase() === 'LETS GO' || g === '—' || g === '-') return TOPSCORE_COLORS.NEUTRAL;
  return GRADE_PALETTE[g.toUpperCase()]?.color || TOPSCORE_COLORS.NEUTRAL;
}

export function getScoreColor(percentage, isRemedial = false) {
  return getGradeColorByScore(percentage);
}

/**
 * Authoritative Inverted Grade Color Resolver for Negative Metrics (Single Source of Truth)
 * Used for metrics where lower values represent better outcomes (error rate, mistake rate, fail rate, timeout rate).
 * Inverted Scale:
 * - 0% - 10% error -> Pure Green (Grade A, preserving Star exclusivity for 100% exam score)
 * - 11% - 20% error -> Electric Lime (Grade B)
 * - 21% - 40% error -> Pure Yellow (Grade C)
 * - 41% - 70% error -> Dark Orange (Grade D)
 * - > 70% error -> Pure Red (Grade E)
 * @param {number|string} percentage - Negative metric percentage (0 - 100)
 * @returns {string} Hex color string
 */
export function getInvertedGradeColor(percentage) {
  const p = Number(percentage);
  if (isNaN(p) || p < 0) return '#94a3b8';
  if (p <= 10) return TOPSCORE_COLORS.A;
  if (p <= 20) return TOPSCORE_COLORS.B;
  if (p <= 40) return TOPSCORE_COLORS.C;
  if (p <= 70) return TOPSCORE_COLORS.D;
  return TOPSCORE_COLORS.E;
}

/**
 * Authoritative Evaluation Result Color Resolver (Single Source of Truth)
 * @param {'correct'|'minor_spelling_error'|'partial'|'incorrect'} category
 * @returns {string} Hex color
 */
export function getEvaluationColor(category) {
  const c = String(category || '').toLowerCase();
  if (c === 'correct' || c === 'full') return TOPSCORE_COLORS.CORRECT;
  if (c === 'minor_spelling_error' || c === 'minor_word_form_error' || c === 'partial' || c === 'half')
    return TOPSCORE_COLORS.PARTIAL;
  return TOPSCORE_COLORS.INCORRECT;
}

export function getGradeSymbol(grade, percentage = null, isRemedial = false) {
  if (percentage !== null && !isNaN(Number(percentage))) {
    const num = Number(percentage);
    if (num >= 100) return '★';
    const pct = Math.round(num);
    if (pct >= 90) return 'A';
    if (pct >= 80) return 'B';
    if (pct >= 60) return 'C';
    if (pct >= 30) return 'D';
    return 'E';
  }
  if (isRemedial) return 'R';
  const g = String(grade || '').trim();
  if (g.toUpperCase() === 'R' || g.toUpperCase() === 'REMEDIAL') return 'R';
  if (g.toUpperCase() === 'F' || g.toUpperCase() === 'FORGIVEN') return 'F';
  if (g.toUpperCase() === 'M' || g.toUpperCase() === 'MANUAL') return 'M';
  if (g === '★' || g === '⭐' || g.toUpperCase() === 'S' || g.toUpperCase() === 'STAR') {
    return '★';
  }
  return GRADE_PALETTE[g.toUpperCase()]?.symbol || g || '—';
}

export function formatGradeBadgeHtml(grade, isRemedial = false, customStyle = '') {
  if (isRemedial) {
    return `<span class="grade-circle grade-circle-r" style="background:${TOPSCORE_COLORS.C}; color:${TOPSCORE_COLORS.TEXT_DARK}; ${customStyle}" title="Grade R (Remedial)">R</span>`;
  }
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
  let g = String(grade || '').trim();
  if (isRemedial) g = 'R';
  const isStar = g === '★' || g === '⭐' || g.toUpperCase() === 'S' || g.toUpperCase() === 'STAR';
  const effectiveKey = isStar ? '★' : g.toUpperCase();
  const theme = GRADE_PALETTE[effectiveKey] || {
    symbol: isStar ? '★' : g || '—',
    color: isStar ? TOPSCORE_COLORS.STAR : '#94a3b8',
    dark: isStar ? '#be185d' : '#64748b',
    light: isStar ? '#f472b6' : '#cbd5e1',
    rgb: isStar ? TOPSCORE_COLORS.STAR_RGB : '148, 163, 184',
    glow: isStar ? 'rgba(255, 45, 135, 0.5)' : 'rgba(148, 163, 184, 0.25)',
    textColor: isStar ? TOPSCORE_COLORS.TEXT_STAR : TOPSCORE_COLORS.TEXT_DARK,
    name: isStar ? 'Excellent (100%)' : 'Standard',
    sparkle: isStar,
  };
  if (isRemedial || effectiveKey === 'R') {
    return {
      ...theme,
      isRemedial: true,
      symbol: 'R',
    };
  }
  return theme;
}

/**
 * Authoritative Achievement Status (Official Predicate)
 * Strictly 8 official tiers: FAIL (0-29%), LESS (30-59%), ENOUGH (60-79%), GOOD (80-89%), VERY GOOD (90-99%), EXCELLENT (100%), REMEDIAL (Grade R), FORGIVEN (Grade F).
 */
export function getAchievementStatus(grade, percentage = null) {
  const g = String(grade || '').trim().toUpperCase();
  if (g === '★' || g === '⭐' || g === 'S' || g === 'STAR') {
    return 'EXCELLENT';
  }
  if (g === 'X' || g === 'ALUMNI') {
    return 'ALUMNI';
  }
  if (g === 'R' || g === 'REMEDIAL') {
    return 'REMEDIAL';
  }
  if (g === 'F' || g === 'FORGIVEN') {
    return 'FORGIVEN';
  }
  if (g === "LET'S GO" || g === 'LETS GO' || g === '—' || g === '-') {
    return "LET'S GO";
  }
  let effGrade = g;
  if (!['A', 'B', 'C', 'D', 'E', 'R', 'F'].includes(effGrade)) {
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
    R: 'REMEDIAL',
    F: 'FORGIVEN',
  };
  return map[effGrade] || "LET'S GO";
}

/**
 * 7×7 Repetitive Mastery Progress Visual Resolver
 * Returns the exact chip text, colors, tier class, and complete state based on pass count (0..7).
 *
 * @param {number} passCount Number of successful attempts (percentage >= 70%)
 * @returns {{ count: number, text: string, color: string, bg: string, border: string, tierClass: string, isComplete: boolean }}
 */
export function getTaskProgressVisual(passCount, targetReps = 7) {
  const maxR = Number(targetReps) || 7;
  const count = Math.min(Math.max(Number(passCount) || 0, 0), maxR);
  if (count >= maxR) {
    return {
      count: maxR,
      text: `${maxR}/${maxR} ✓ Complete`,
      color: TOPSCORE_COLORS.STAR,
      bg: `rgba(${TOPSCORE_COLORS.STAR_RGB}, 0.15)`,
      border: `rgba(${TOPSCORE_COLORS.STAR_RGB}, 0.45)`,
      tierClass: `tier-${maxR}`,
      isComplete: true
    };
  } else if (count >= Math.ceil(maxR * 0.7)) {
    return {
      count,
      text: `${count}/${maxR}`,
      color: TOPSCORE_COLORS.B,
      bg: `rgba(${TOPSCORE_COLORS.B_RGB}, 0.15)`,
      border: `rgba(${TOPSCORE_COLORS.B_RGB}, 0.45)`,
      tierClass: `tier-${count}`,
      isComplete: false
    };
  } else if (count >= Math.ceil(maxR * 0.4)) {
    return {
      count,
      text: `${count}/${maxR}`,
      color: TOPSCORE_COLORS.C,
      bg: `rgba(${TOPSCORE_COLORS.C_RGB}, 0.15)`,
      border: `rgba(${TOPSCORE_COLORS.C_RGB}, 0.45)`,
      tierClass: `tier-${count}`,
      isComplete: false
    };
  } else if (count >= 1) {
    return {
      count,
      text: `${count}/${maxR}`,
      color: TOPSCORE_COLORS.D,
      bg: `rgba(${TOPSCORE_COLORS.D_RGB}, 0.15)`,
      border: `rgba(${TOPSCORE_COLORS.D_RGB}, 0.45)`,
      tierClass: `tier-${count}`,
      isComplete: false
    };
  } else {
    return {
      count: 0,
      text: `0/${maxR}`,
      color: TOPSCORE_COLORS.E,
      bg: `rgba(${TOPSCORE_COLORS.E_RGB}, 0.15)`,
      border: `rgba(${TOPSCORE_COLORS.E_RGB}, 0.45)`,
      tierClass: 'tier-0',
      isComplete: false
    };
  }
}

/**
 * Authoritative Unified Topic & Exam Score Computer (Phase 298)
 * Aggregates Best Points from Words and Phrases into a unified score and percentage (Rule 2.7).
 *
 * @param {Object} params
 * @param {Object|null} params.wordsBest Best attempt record for Words component
 * @param {Object|null} params.phrasesBest Best attempt record for Phrases component
 * @param {number} [params.wordsMax=40] Maximum points for Words component (40 for Task, 120 for Exam)
 * @param {number} [params.phrasesMax=10] Maximum points for Phrases component (10 for Task, 30 for Exam)
 * @param {boolean} [params.hasPhrases=true] Whether this topic/class has a phrases component
 * @returns {{
 *   totalPoints: number,
 *   maxPoints: number,
 *   percentage: number,
 *   grade: string,
 *   gradeColor: string,
 *   wordsPoints: number,
 *   phrasesPoints: number,
 *   wordsPct: number|null,
 *   phrasesPct: number|null,
 *   isRemedial: boolean,
 *   isAttempted: boolean
 * }}
 */
export function computeUnifiedScore({
  wordsBest = null,
  phrasesBest = null,
  wordsMax = 40,
  phrasesMax = 10,
  hasPhrases = true
} = {}) {
  const parseAttemptPoints = (att, max) => {
    if (!att) return null;
    if (att.points_awarded !== undefined && att.points_awarded !== null) {
      return Number(att.points_awarded);
    }
    if (att.points !== undefined && att.points !== null) {
      return Number(att.points);
    }
    const pct = att.effective_score !== undefined && att.effective_score !== null
      ? Number(att.effective_score)
      : (att.percentage !== undefined && att.percentage !== null
          ? Number(att.percentage)
          : (att.total_questions && att.score !== undefined
              ? (Number(att.score) / Number(att.total_questions)) * 100
              : null));
    if (pct !== null) {
      return Math.round((pct / 100) * max * 10) / 10;
    }
    if (att.score !== undefined && att.score !== null) {
      return Math.min(Number(att.score), max);
    }
    return 0;
  };

  const parseAttemptPct = (att, max = 0) => {
    if (!att) return null;
    if (att.effective_score !== undefined && att.effective_score !== null) return Number(att.effective_score);
    if (att.percentage !== undefined && att.percentage !== null) return Number(att.percentage);
    if (att.score !== undefined && att.score !== null && max > 0) {
      return Math.round((Number(att.score) / max) * 100);
    }
    return null;
  };

  const wordsPts = parseAttemptPoints(wordsBest, wordsMax);
  const phrasesPts = hasPhrases ? parseAttemptPoints(phrasesBest, phrasesMax) : 0;
  const wordsPct = parseAttemptPct(wordsBest, wordsMax);
  const phrasesPct = hasPhrases ? parseAttemptPct(phrasesBest, phrasesMax) : null;

  const isAttempted = wordsBest != null || (hasPhrases && phrasesBest != null);
  const effectiveWordsPts = wordsPts ?? 0;
  const effectivePhrasesPts = phrasesPts ?? 0;

  // Rule 2.10: Points Half-Up Whole Integer Invariant (Math.round)
  const totalPoints = Math.round(effectiveWordsPts + effectivePhrasesPts);
  const maxPoints = hasPhrases ? (wordsMax + phrasesMax) : wordsMax;
  const percentage = (isAttempted && maxPoints > 0) ? Math.round((totalPoints / maxPoints) * 100) : 0;
  const isRemedial = Boolean(
    wordsBest?.is_remedial || wordsBest?.is_remedial_unlocked ||
    (hasPhrases && (phrasesBest?.is_remedial || phrasesBest?.is_remedial_unlocked))
  );
  const isForgiven = Boolean(
    wordsBest?.is_forgiven || (hasPhrases && phrasesBest?.is_forgiven)
  );

  const grade = isAttempted ? calculateGrade(percentage, { isRemedial, isForgiven }) : '—';
  const gradeColor = isAttempted ? getGradeColor(grade, isRemedial) : '#94a3b8';

  return {
    totalPoints,
    maxPoints,
    percentage,
    grade,
    gradeColor,
    wordsPoints: effectiveWordsPts,
    phrasesPoints: effectivePhrasesPts,
    wordsPct,
    phrasesPct,
    isRemedial,
    isForgiven,
    isAttempted
  };
}

/**
 * 7×7 Repetitive Mastery Topic Pass Level Resolver (Phase 298)
 * Implements Synchronized Leveling via Math.min (WordsPasses, PhrasesPasses).
 *
 * @param {number} wordsPasses Successful pass count for Words (>= 70%)
 * @param {number} phrasesPasses Successful pass count for Phrases (>= 70%)
 * @param {boolean} [hasPhrases=true] Whether topic includes phrases
 * @returns {number} Topic pass level (0..7)
 */
export function computeTopicPassLevel(wordsPasses = 0, phrasesPasses = 0, hasPhrases = true, targetReps = 7) {
  const maxR = Number(targetReps) || 7;
  const w = Math.min(Math.max(Number(wordsPasses) || 0, 0), maxR);
  if (!hasPhrases) return w;
  const p = Math.min(Math.max(Number(phrasesPasses) || 0, 0), maxR);
  return Math.min(w, p);
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
export function recalculateAttempt(answers, passingThreshold = 60, options = {}) {
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
  const grade = calculateGrade(percentage, options);
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
 * 1. Evaluated EXCLUSIVELY from Exams (Tasks excluded from academic score/points).
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
  // Exclude Forgiven 0% exam entries from academic points and mastery calculations.
  // Manual override exam scores (e.g., from offline paper) are authentic scores and must be included.
  const cleanExamEntries = (Array.isArray(examEntries) ? examEntries : []).filter(e => {
    if (!e) return false;
    const isPureForgivenZero = Boolean(e.isForgiven) && !e.isManual && Number(e.effPoints ?? e.points ?? 0) === 0;
    if (isPureForgivenZero) return false;
    return true;
  });

  const completedExamCount = cleanExamEntries.length;
  const completedWeeklyCount = completedExamCount; // Backward compatibility alias

  // Riwayat Akumulasi Seluruh Poin (Rule 2.10: Points Half-Up Whole Integer Invariant)
  const cumulativePoints =
    Math.round(cleanExamEntries.reduce((sum, e) => sum + Number(e.effPoints ?? e.points ?? 0), 0));

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
      totalPoints: 0,
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

    const studentAttemptsInTheme = cleanExamEntries.filter((e) => {
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
      const canonicalMax = getExpectedMax(t);
      const att = studentAttemptsInTheme.find(e => {
        const eId = e.test?.id || e.testId || e.test_id;
        return eId === t.id;
      });
      if (att && (att.totalQ || att.total_questions)) {
        dynamicThemeMaxQ += Math.max(canonicalMax, Number(att.totalQ || att.total_questions));
      } else {
        dynamicThemeMaxQ += canonicalMax;
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

  // 2. Authoritative Full Curriculum Cumulative Mastery Model
  // Nilai Global (Overall Score & Grade) dihitung dari Total Poin yang Diperoleh
  // dibanding Total Poin Kurikulum Seharusnya (misal 1.900 poin penuh pada 3rd Vocab)
  const totalCurriculumExpectedPoints = themeStats.reduce((sum, ts) => sum + (ts.maxQ || 0), 0);

  let overallScore = 0;
  let grade = '—';
  let denominator = totalCurriculumExpectedPoints;

  if (completedExamCount > 0 && totalCurriculumExpectedPoints > 0) {
    overallScore = Math.round((cumulativePoints / totalCurriculumExpectedPoints) * 100);
    grade = calculateGrade(overallScore);
  } else if (completedExamCount === 0) {
    overallScore = 0;
    grade = '—';
  }

  // Find latest attempted theme for contextual reference
  let latestAttemptedTheme = null;
  for (let i = themeStats.length - 1; i >= 0; i--) {
    if (themeStats[i].attempted) {
      latestAttemptedTheme = themeStats[i];
      break;
    }
  }
  const latestThemePoints = latestAttemptedTheme ? Math.round(latestAttemptedTheme.earned) : 0;

  return {
    totalPoints: cumulativePoints, // Authoritative: Total points earned from all completed exams
    latestThemePoints,
    cumulativePoints,
    overallScore,
    grade,
    denominator: totalCurriculumExpectedPoints,
    completedExamCount,
    completedWeeklyCount,
    activeThemeCode: latestAttemptedTheme?.themeCode || null,
    themeStats,
    includedThemeCodes: sortedThemes,
    includedExamIds: new Set((allClassExams || []).filter(isExam).map(t => t.id))
  };
}

// ============================================================
// VAULT DISTRACTOR SELECTION & SIMILARITY ENGINE (PHASE 357)
// ============================================================

/**
 * Calculates a multi-attribute similarity score between a target vault item and a candidate distractor.
 * Higher score = more plausible and pedagogically effective distractor.
 *
 * Dimensions:
 * 1. Topic & Theme Proximity (0 to 35 pts)
 * 2. Word Type / POS Match (0 to 25 pts)
 * 3. Length & Structural Parity (0 to 20 pts)
 * 4. Lexical / Syntactic Overlap (0 to 15 pts)
 * 5. Tie-Breaker Jitter (0 to 3 pts)
 *
 * @param {Object} target Target vault item being tested
 * @param {Object} candidate Candidate item from vault
 * @returns {number} Composite similarity score
 */
export function scoreDistractorSimilarity(target, candidate) {
  if (!target || !candidate) return 0;
  let score = 0;

  // 1. Topic & Theme Proximity (Max 35 pts)
  const targetTopic = (target.topic || target.topic_code || '').trim().toLowerCase();
  const candTopic = (candidate.topic || candidate.topic_code || '').trim().toLowerCase();
  const targetTheme = (target.theme || target.theme_code || '').trim().toLowerCase();
  const candTheme = (candidate.theme || candidate.theme_code || '').trim().toLowerCase();

  if (targetTopic && candTopic && targetTopic === candTopic) {
    score += 35;
  } else if (targetTheme && candTheme && targetTheme === candTheme) {
    score += 15;
  }

  // 2. Part of Speech / Word Type Match (Max 25 pts)
  const targetType = (target.word_type || '').trim().toLowerCase();
  const candType = (candidate.word_type || '').trim().toLowerCase();
  if (targetType && candType) {
    if (targetType === candType) {
      score += 25;
    } else {
      const verbGroup = ['verb', 'phrasal verb', 'irregular verb'];
      const modifierGroup = ['adjective', 'adverb'];
      if ((verbGroup.includes(targetType) && verbGroup.includes(candType)) ||
          (modifierGroup.includes(targetType) && modifierGroup.includes(candType))) {
        score += 12;
      }
    }
  }

  // 3. Length & Structural Parity (Max 20 pts)
  const targetEng = (target.english || '').split('/')[0].trim();
  const candEng = (candidate.english || '').split('/')[0].trim();
  const targetWords = targetEng.split(/\s+/).filter(Boolean);
  const candWords = candEng.split(/\s+/).filter(Boolean);

  if (targetWords.length > 1 || candWords.length > 1) {
    // Multi-word phrase/idiom matching
    const wordDiff = Math.abs(targetWords.length - candWords.length);
    if (wordDiff === 0) {
      score += 20;
    } else if (wordDiff === 1) {
      score += 10;
    }
  } else {
    // Single word length parity
    const charDiff = Math.abs(targetEng.length - candEng.length);
    if (charDiff <= 2) {
      score += 15;
    } else if (charDiff <= 4) {
      score += 8;
    }
  }

  // 4. Lexical / Syntactic Overlap & Collocation (Max 15 pts)
  const tLower = targetEng.toLowerCase();
  const cLower = candEng.toLowerCase();

  if (targetWords.length > 1 && candWords.length > 1) {
    const tFirst = targetWords[0].toLowerCase();
    const cFirst = candWords[0].toLowerCase();
    const tLast = targetWords[targetWords.length - 1].toLowerCase();
    const cLast = candWords[candWords.length - 1].toLowerCase();

    if (tFirst === cFirst || tLast === cLast) {
      score += 15;
    } else {
      const tTokens = new Set(targetWords.map(w => w.toLowerCase()));
      const hasOverlap = candWords.some(w => tTokens.has(w.toLowerCase()));
      if (hasOverlap) score += 8;
    }
  } else {
    // Single words: shared common prefix or suffix (>= 3 chars)
    if (tLower.length >= 4 && cLower.length >= 4) {
      if (tLower.slice(0, 3) === cLower.slice(0, 3) || tLower.slice(-3) === cLower.slice(-3)) {
        score += 10;
      }
    }
  }

  // 5. Deterministic tie-breaker / jitter (0 to 3 pts)
  score += Math.random() * 3;

  return score;
}

/**
 * Selects and ranks the top distractors from a candidate pool for a target vault item.
 * Strictly enforces anti-leak filters, Indonesian synonym protection, and modality bounds.
 *
 * @param {Object} target Target vault item
 * @param {Array<Object>} candidatePool Pool of vault items
 * @param {number} count Number of distractors needed (default: 4 for 5-option MCQ)
 * @returns {Array<string>} Top ranked distractor English strings
 */
export function rankDistractorsForVaultItem(target, candidatePool, count = 4) {
  if (!target || !Array.isArray(candidatePool) || candidatePool.length === 0) {
    return [];
  }

  const accepted = (target.english ? target.english.split('/') : [])
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
  const targetIndo = (target.indonesian || '').trim().toLowerCase();
  const phraseTypes = ['expression', 'idiom', 'proverb', 'phrase'];
  const isTargetPhrase = phraseTypes.includes((target.word_type || '').toLowerCase()) || target.category === 'phrases';

  // 1. Strict Eligibility & Anti-Leak Filtering
  const seenCandidates = new Set();
  const eligible = candidatePool.filter(cand => {
    if (!cand) return false;
    const candEng = (cand.english || '').split('/')[0].trim();
    if (!candEng) return false;
    const candEngLower = candEng.toLowerCase();
    if (seenCandidates.has(candEngLower)) return false;

    // Anti-leak: cannot match any accepted answer
    if (accepted.includes(candEngLower)) return false;
    const candVariants = (cand.english || '').split('/').map(s => s.trim().toLowerCase()).filter(Boolean);
    if (candVariants.some(v => accepted.includes(v))) return false;

    // Indonesian translation collision check
    if (targetIndo && (cand.indonesian || '').trim().toLowerCase() === targetIndo) return false;

    // Modality alignment: words only compete with words, phrases only with phrases
    const isCandPhrase = phraseTypes.includes((cand.word_type || '').toLowerCase()) || cand.category === 'phrases';
    if (isTargetPhrase !== isCandPhrase) return false;

    seenCandidates.add(candEngLower);
    return true;
  });

  if (eligible.length === 0) return [];

  // 2. Score all eligible candidates
  const scored = eligible.map(cand => ({
    candidate: cand,
    english: (cand.english || '').split('/')[0].trim(),
    score: scoreDistractorSimilarity(target, cand)
  }));

  // 3. Sort descending by similarity score
  scored.sort((a, b) => b.score - a.score);

  // 4. Return top `count` items as strings
  return scored.slice(0, count).map(s => s.english);
}

/**
 * Universal Vector SVG Icon Standard for Classes & Categories (Zero Emojis System)
 * Centralizes crisp, professional vector icons with smart keyword matching across the system.
 */
export function getClassSvgIcon(name = '', size = 18, strokeColor = '#38bdf8') {
  const n = String(name || '').toLowerCase();

  // 1. Vocabulary / Lexicon / Word Bank / Vault
  if (n.includes('vocab') || n.includes('lexic') || n.includes('word') || n.includes('vault') || n.includes('lexis')) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="class-svg-icon" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`;
  }
  // 2. Pronunciation / Accent / Phonetics
  if (n.includes('pronun') || n.includes('accent') || n.includes('phonet') || n.includes('intonat')) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="class-svg-icon" aria-hidden="true"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>`;
  }
  // 3. Listening / Audio / Sound
  if (n.includes('listen') || n.includes('audio') || n.includes('hear') || n.includes('sound')) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="class-svg-icon" aria-hidden="true"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>`;
  }
  // 4. Grammar / Structure / Writing / Composition / Basic
  if (n.includes('gramm') || n.includes('struct') || n.includes('writ') || n.includes('compos') || n.includes('basic')) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="class-svg-icon" aria-hidden="true"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>`;
  }
  // 5. Presentation / Public / Business
  if (n.includes('present') || n.includes('public') || n.includes('busin') || n.includes('pitch')) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="class-svg-icon" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`;
  }
  // 6. Storytelling / Reading / Literature / Narrative
  if (n.includes('story') || n.includes('read') || n.includes('litera') || n.includes('narrat')) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="class-svg-icon" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>`;
  }
  // 7. Speaking / Conversation / Roleplay / Oral
  if (n.includes('speak') || n.includes('convers') || n.includes('talk') || n.includes('oral') || n.includes('roleplay')) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="class-svg-icon" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;
  }
  // 8. General / Fallback / Globe
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="class-svg-icon" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`;
}

// Global attachment for seamless hybrid / non-module access
if (typeof window !== 'undefined') {
  window.getClassSvgIcon = getClassSvgIcon;
  window.TOPSCORE_QUAD_COLORS = TOPSCORE_QUAD_COLORS;
  window.formatTestDisplay = formatTestDisplay;
  window.formatTestTitleHtml = formatTestTitleHtml;
}

/**
 * Authoritative Test Display Name Formatter (SSOT AGENTS.md § 2.6 / DECISION-056)
 * Generates clean, zero-redundancy student presentation labels:
 * - Task: "[Code] Task - [Topic Name]" (e.g. "A1 Task - Greetings & Basics")
 * - Exam: "[Code] Exam - [Theme Name]" (e.g. "D Exam - Cooking Class")
 * Supports 2-line layout (for Dashboard Hero) and 1-line layout (Header, Modals, Results).
 */
export function formatTestDisplay(test) {
  if (!test) return { typeLabel: 'Task', topicOrTheme: '', fullTitle: 'Task', line1: 'Task', line2: '' };

  // 1. If explicit display_name exists in database and is not empty, respect it
  if (test.display_name && String(test.display_name).trim()) {
    const dName = String(test.display_name).trim();
    const parts = dName.split(/\s*[-–]\s*/);
    if (parts.length > 1) {
      const typeLabel = parts[0].trim();
      const topicOrTheme = parts.slice(1).join(' - ').trim();
      return {
        typeLabel,
        topicOrTheme,
        fullTitle: `${typeLabel} - ${topicOrTheme}`,
        line1: typeLabel,
        line2: topicOrTheme
      };
    }
    return {
      typeLabel: dName,
      topicOrTheme: '',
      fullTitle: dName,
      line1: dName,
      line2: ''
    };
  }

  const rawTitle = String(test.title || test.name || '').trim();
  const shell = String(test.shell_code || '').toUpperCase();
  const isExam = test.test_type === 'exam' || test.category === 'EXAM' || shell.endsWith('-EXAM') || /Exam/i.test(rawTitle);

  // 2. Extract Topic or Theme from rawTitle
  let topicOrTheme = '';
  const dashIdx = rawTitle.search(/\s+[-–:]\s+/);
  if (dashIdx !== -1) {
    topicOrTheme = rawTitle.substring(dashIdx).replace(/^[\s-–:]+/, '').trim();
  } else {
    // If no dash, strip common class prefixes like "1st Vocabulary ", "2nd Vocabulary ", etc.
    topicOrTheme = rawTitle.replace(/^\d+(st|nd|rd|th)?\s+Vocabulary\s+/i, '')
                           .replace(/^(Theme\s+[A-D]\s+)?(Words\s+|Phrases\s+)?(Task|Exam)\s*/i, '')
                           .trim();
  }

  // Capitalize nicely if all uppercase (e.g. "COOKING CLASS" -> "Cooking Class")
  if (topicOrTheme && topicOrTheme === topicOrTheme.toUpperCase() && topicOrTheme.length > 3) {
    topicOrTheme = topicOrTheme.split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  // 3. Extract Theme letter & Topic number
  // Supports new format: CMP-3VCB-A1-TASK -> segments[2] = "A1", CMP-3VCB-D-EXAM -> segments[2] = "D"
  // As well as legacy formats: 3A1-TASK, 2D-WORDS-EXAM, 1A1-PHRASES-TASK
  let themeLetter = '';
  let topicNum = '';

  // Check 4-part format: PROGRAM-CLASS-CODE-TYPE
  const segments = shell.split('-');
  if (segments.length >= 4) {
    const codePart = segments[2]; // e.g. "A1" or "D"
    const m = codePart.match(/^([A-D])([0-9]?)$/);
    if (m) {
      themeLetter = m[1];
      topicNum = m[2] || '';
    }
  }

  // Fallback to legacy regex on shell: ^([0-9]?)([A-D])([0-9]?)-
  if (!themeLetter) {
    const legacyMatch = shell.match(/^([0-9]?)([A-D])([0-9]?)-/);
    if (legacyMatch) {
      themeLetter = legacyMatch[2];
      topicNum = legacyMatch[3] || '';
    }
  }

  // Fallback to rawTitle matching:
  if (!themeLetter) {
    const titleThemeMatch = rawTitle.match(/Theme\s+([A-D])/i) || rawTitle.match(/\b([A-D])([0-9]?)\b/);
    if (titleThemeMatch) {
      themeLetter = (titleThemeMatch[1] || '').toUpperCase();
      topicNum = titleThemeMatch[2] || '';
    }
  }

  // 4. Construct Class & Level Context (e.g. "2nd Vocabulary" or "1st Basic English")
  let levelOrdinal = '';
  let className = 'Vocabulary';

  if (test.levels?.level_number) {
    const num = test.levels.level_number;
    levelOrdinal = num === 1 ? '1st' : num === 2 ? '2nd' : num === 3 ? '3rd' : `${num}th`;
  }
  if (test.classes?.name) {
    const cn = test.classes.name
      .replace(/^(Camp|Evnikom|Sheraton|Tamata)\s+/i, '')
      .replace(/^(\d+(st|nd|rd|th)?|Level\s*\d+)\s+/i, '')
      .trim();
    if (cn) className = cn;
  }

  // Fallback from rawTitle (e.g. "2nd Vocabulary" or "1st Basic English")
  const lvlMatch = rawTitle.match(/^(\d+(st|nd|rd|th)?)\s+([A-Za-z\s]+?)(?=\s+[A-D0-9]|\s+Theme|\s+Words|\s+Phrases|\s+Task|\s+Exam)/i);
  if (lvlMatch) {
    if (!levelOrdinal) levelOrdinal = lvlMatch[1];
    if (lvlMatch[3] && !test.classes?.name) className = lvlMatch[3].trim();
  }

  // Fallback from shell_code (e.g. "CMP-3VCB-...", "2B1-...", "3A-...")
  if (!levelOrdinal) {
    const shellLvl = shell.match(/(?:CMP-)?(\d)/);
    if (shellLvl) {
      const n = parseInt(shellLvl[1]);
      levelOrdinal = n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`;
    } else {
      levelOrdinal = '1st';
    }
  }

  // 5. Construct SSOT Format:
  // "2nd Vocabulary A1 Task - Topic Name"
  // "2nd Vocabulary D Exam - Theme Name"
  const codePart = isExam ? (themeLetter || 'A') : `${themeLetter || 'A'}${topicNum || '1'}`;
  const typePart = isExam ? 'Exam' : 'Task';

  const classPrefix = `${levelOrdinal} ${className}`.trim();
  const typeLabel = `${classPrefix} ${codePart} ${typePart}`.trim();
  const fullTitle = topicOrTheme ? `${typeLabel} - ${topicOrTheme}` : typeLabel;

  return {
    typeLabel,
    topicOrTheme,
    fullTitle,
    line1: typeLabel,
    line2: topicOrTheme
  };
}

export function formatTestTitleHtml(test) {
  const { line1, line2 } = formatTestDisplay(test);
  const esc1 = String(line1 || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const esc2 = String(line2 || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  if (esc2) {
    return `
      <span class="next-test-primary-name" title="${esc1}">${esc1}</span>
      <span class="next-test-topic-name" title="${esc2}">${esc2}</span>
    `;
  }
  return `<span class="next-test-primary-name" title="${esc1}">${esc1}</span>`;
}

