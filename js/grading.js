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
 * Royal Order of Adjectives Categories (OSASCOMP):
 * 1. Opinion / Quality
 * 2. Size
 * 3. Physical Quality / Texture / State
 * 4. Shape
 * 5. Age
 * 6. Color
 * 7. Origin
 * 8. Material
 * 9. Purpose / Qualifier
 */
export const ADJECTIVE_CATEGORIES = {
  1: {
    name: 'opinion',
    words: new Set([
      'beautiful', 'handsome', 'ugly', 'lovely', 'pretty', 'nice', 'cute', 'attractive',
      'wonderful', 'great', 'excellent', 'fantastic', 'cool', 'good', 'bad', 'awful',
      'terrible', 'horrible', 'dirty', 'clean', 'neat', 'tidy', 'messy', 'delicious',
      'tasty', 'yummy', 'fresh', 'sweet', 'bitter', 'sour', 'spicy', 'rich', 'poor',
      'comfortable', 'uncomfortable', 'cheap', 'expensive', 'precious', 'valuable',
      'simple', 'complex', 'funny', 'boring', 'interesting', 'exciting',
      'strange', 'weird', 'unique', 'perfect', 'normal', 'usual', 'unusual', 'favorite',
      'wild', 'calm', 'smart', 'clever', 'brave', 'strong', 'weak'
    ])
  },
  2: {
    name: 'size',
    words: new Set([
      'big', 'small', 'little', 'tiny', 'huge', 'giant', 'gigantic', 'massive', 'large',
      'mini', 'tall', 'short', 'high', 'low', 'long', 'medium', 'slender', 'slim',
      'thin', 'fat', 'thick', 'wide', 'broad', 'narrow', 'deep', 'shallow'
    ])
  },
  3: {
    name: 'physical',
    words: new Set([
      'hard', 'soft', 'rough', 'smooth', 'heavy', 'light', 'sharp', 'blunt', 'wet',
      'dry', 'moist', 'hot', 'warm', 'cold', 'cool', 'freezing', 'boiling', 'sticky',
      'slippery', 'greasy', 'oily', 'stiff', 'flexible', 'fragile', 'solid', 'hollow',
      'fluffy', 'silky', 'shiny', 'dull', 'bright', 'dark', 'fast', 'slow', 'snowy', 'loud', 'quiet'
    ])
  },
  4: {
    name: 'shape',
    words: new Set([
      'round', 'circular', 'square', 'rectangular', 'triangular', 'oval', 'cylindrical',
      'conical', 'spherical', 'flat', 'curved', 'straight', 'crooked', 'bent', 'wavy'
    ])
  },
  5: {
    name: 'age',
    words: new Set([
      'new', 'old', 'young', 'antique', 'ancient', 'vintage', 'modern', 'contemporary',
      'fresh', 'brand-new', 'elderly', 'mature'
    ])
  },
  6: {
    name: 'color',
    words: new Set([
      'red', 'blue', 'green', 'yellow', 'black', 'white', 'brown', 'grey', 'gray',
      'purple', 'pink', 'orange', 'violet', 'indigo', 'golden', 'silver', 'bronze',
      'navy', 'beige', 'cyan', 'magenta', 'maroon', 'blonde', 'turquoise'
    ])
  },
  7: {
    name: 'origin',
    words: new Set([
      'indonesian', 'english', 'american', 'japanese', 'chinese', 'korean', 'italian',
      'french', 'german', 'spanish', 'australian', 'indian', 'asian', 'european',
      'african', 'western', 'eastern', 'oriental', 'local', 'foreign', 'native', 'traditional'
    ])
  },
  8: {
    name: 'material',
    words: new Set([
      'wooden', 'plastic', 'metallic', 'metal', 'iron', 'steel', 'leather', 'paper',
      'cotton', 'silk', 'woolen', 'wool', 'glass', 'ceramic', 'stone', 'marble',
      'clay', 'rubber', 'cardboard', 'wax', 'diamond', 'concrete'
    ])
  },
  9: {
    name: 'purpose',
    words: new Set([
      'cooking', 'sleeping', 'reading', 'writing', 'swimming', 'running', 'walking',
      'dining', 'coffee', 'tea', 'sports', 'racing', 'travel', 'school', 'office',
      'work', 'shopping', 'wedding', 'winter', 'summer', 'water', 'storage', 'kitchen'
    ])
  }
};

const IRREGULAR_PLURALS = new Set(['people', 'men', 'women', 'children', 'teeth', 'feet', 'mice', 'geese', 'oxen']);

export function isPluralNoun(noun) {
  const n = String(noun || '').toLowerCase().trim();
  if (IRREGULAR_PLURALS.has(n)) return true;
  return n.endsWith('s') || n.endsWith('es') || n.endsWith('ies');
}

export function classifyAdjective(word) {
  const w = String(word || '').toLowerCase().trim();
  for (const [order, cat] of Object.entries(ADJECTIVE_CATEGORIES)) {
    if (cat.words.has(w)) return { order: Number(order), category: cat.name };
  }
  return null;
}

/**
 * Validate Description Sentence against:
 * [This/That/These/Those] + [is/are] + (a/an) + [3 Adjectives in Royal Order] + [Noun]
 */
export function validateDescriptionSentence(sentence, targetDemonstrative = null) {
  const clean = String(sentence || '').trim().replace(/[.,!?;:]+$/, '').toLowerCase();
  const tokens = clean.split(/\s+/).filter(Boolean);
  if (tokens.length < 5) {
    return { valid: false, error: 'Sentence too short. Formula: [This/That/These/Those] [is/are] (a/an) [3 Adjectives] [Noun]' };
  }

  // 1. Demonstrative
  const demo = tokens[0];
  if (!['this', 'that', 'these', 'those'].includes(demo)) {
    return { valid: false, error: 'Must begin with a demonstrative pronoun (This, That, These, or Those).' };
  }

  if (targetDemonstrative && demo !== targetDemonstrative.toLowerCase().trim()) {
    return { valid: false, error: `This item requires demonstrative "${targetDemonstrative.toUpperCase()}" (you used "${demo}").` };
  }

  const isSingular = (demo === 'this' || demo === 'that');

  // 2. To-Be
  const tobe = tokens[1];
  if (isSingular && tobe !== 'is') {
    return { valid: false, error: `Singular demonstrative (${demo.toUpperCase()}) requires "is" (not "${tobe}").` };
  }
  if (!isSingular && tobe !== 'are') {
    return { valid: false, error: `Plural demonstrative (${demo.toUpperCase()}) requires "are" (not "${tobe}").` };
  }

  let idx = 2;
  // 3. Article (a/an) for singular
  if (isSingular) {
    if (tokens[idx] === 'a' || tokens[idx] === 'an') {
      idx++;
    }
  }

  // Remaining tokens: adjectives + noun
  const remaining = tokens.slice(idx);
  if (remaining.length < 4) {
    return { valid: false, error: 'Must include exactly 3 adjectives and 1 noun.' };
  }

  const noun = remaining[remaining.length - 1];
  const adjTokens = remaining.slice(0, remaining.length - 1);

  if (adjTokens.length !== 3) {
    return { valid: false, error: `Must include exactly 3 adjectives. Detected ${adjTokens.length}: "${adjTokens.join(', ')}".` };
  }

  // Check noun plurality agreement
  const nounPlural = isPluralNoun(noun);
  if (isSingular && nounPlural) {
    return { valid: false, error: `Noun "${noun}" is plural, which conflicts with "${demo} is". Use a singular noun.` };
  }
  if (!isSingular && !nounPlural) {
    return { valid: false, error: `Noun "${noun}" is singular, which conflicts with "${demo} are". Use a plural noun (add -s/-es).` };
  }

  const classified = [];
  for (const adj of adjTokens) {
    const c = classifyAdjective(adj);
    if (!c) {
      return { valid: false, error: `Adjective "${adj}" is not recognized in standard dictionary. Use common adjectives (opinion, size, age, shape, color, origin, material).` };
    }
    classified.push({ word: adj, ...c });
  }

  // Check strict increasing order
  for (let i = 0; i < classified.length - 1; i++) {
    if (classified[i].order >= classified[i + 1].order) {
      return {
        valid: false,
        error: `Adjective order violation: "${classified[i].word}" (${classified[i].category}) cannot precede "${classified[i + 1].word}" (${classified[i + 1].category}). Royal Order: Opinion → Size → Physical → Shape → Age → Color → Origin → Material → Purpose.`
      };
    }
  }

  return {
    valid: true,
    demonstrative: demo,
    tobe,
    adjectives: classified,
    noun,
    formatted: demo.charAt(0).toUpperCase() + demo.slice(1) + ' ' + tobe + ' ' + (isSingular ? (tokens[2] === 'an' ? 'an ' : 'a ') : '') + adjTokens.join(' ') + ' ' + noun
  };
}

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
  // Description Module (m1 / Point & Speak): Evaluates Demonstrative + To-Be + 3 Adjectives in Royal Order + Noun
  if (answerType === 'description') {
    const rawStr = Array.isArray(rawCorrectAnswer) ? (rawCorrectAnswer[0] || '') : String(rawCorrectAnswer || '');
    let targetDemo = null;
    const cleanRaw = rawStr.toLowerCase().trim();
    if (['this', 'that', 'these', 'those'].includes(cleanRaw)) {
      targetDemo = cleanRaw;
    } else {
      const matchDemo = cleanRaw.match(/\b(this|that|these|those)\b/);
      if (matchDemo) targetDemo = matchDemo[1];
    }

    const vRes = validateDescriptionSentence(studentAnswer, targetDemo);
    if (vRes.valid) {
      return {
        result: 'correct',
        score: 1.0,
        is_correct: true,
        matchedAnswer: vRes.formatted,
        similarity_score: 1.0,
        feedback: 'Valid grammatical order'
      };
    } else {
      return {
        result: 'incorrect',
        score: 0.0,
        is_correct: false,
        matchedAnswer: targetDemo ? `${targetDemo.toUpperCase()} + 3 Adjectives + Noun` : '',
        similarity_score: 0.0,
        error: vRes.error
      };
    }
  }

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
 * Authoritative Points Rounder with Ceiling-Cap Star Protection (Rule 2.9 SSOT)
 * Normal half-up rounding (Math.round for >= .5), except when points approach
 * maximum points without fully reaching it (e.g. 49.5 out of 50 -> 49 via Math.floor)
 * to strictly protect 100% Star (★) integrity.
 *
 * @param {number} points
 * @param {number} [maxPoints=0]
 * @returns {number}
 */
export function roundPointsWithCeilingCap(points, maxPoints = 0) {
  const p = Number(points) || 0;
  const m = Number(maxPoints) || 0;
  if (m > 0 && p < m && p >= m - 0.5) {
    return Math.floor(p);
  }
  return Math.round(p);
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
  const isForgiven = Boolean(options?.isForgiven);
  const isRem = typeof options === 'boolean' ? options : Boolean(options?.isRemedial);

  if (isAlumni) return 'X';
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
export const TOPSCORE_COLORS = {
  // 1. Grade & Score Tiers (Nilai Ujian & Persentase)
  STAR: '#c084fc', // 100% Star ★ (Vibrant Purple - #c084fc)
  STAR_8HEX: '#c084fcff', // 8-digit hex alias with alpha
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
  NEUTRAL: '#94a3b8', // Neutral Slate Gray for Cold Start / START / Placeholder
  NEUTRAL_RGB: '148, 163, 184',

  // 2. RGB Equivalents for Opacities, Shadows, & Glows
  STAR_RGB: '192, 132, 252',
  A_RGB: '0, 192, 0',
  B_RGB: '149, 255, 0',
  C_RGB: '255, 255, 0',
  D_RGB: '255, 140, 0',
  E_RGB: '255, 0, 0',
  REMEDIAL_RGB: '255, 255, 0',
  FORGIVEN_RGB: '255, 0, 0',
  X_RGB: '139, 92, 246',
  PURPLE_RGB: '139, 92, 246',

  // 3. Question Answer Evaluation Status (Result Page)
  CORRECT: '#00c000ff', // Full point (1.0 pt)  -> Pure Green (Strictly referencing Grade A, never Star)
  PARTIAL: '#FFFF00', // Half point (0.5 pt)  -> Pure Yellow (Grade C standard)
  INCORRECT: '#FF0000', // Zero point (0.0 pt)  -> Pure Red (Grade E fail tier)

  // 4. Grade Badge Text Contrast
  TEXT_STAR: '#0F172A', // Deep dark slate star symbol on ★ badge (Universal Dark Standard)
  TEXT_DARK: '#0F172A', // Deep dark slate letters for A, B, C, D, E badges
};

/**
 * 4-Pillar Progression & ABCD System Colors (SSOT Rule 2.10.1: Pink -> Orange -> Lime -> Cyan)
 * A: Electric Pink (#ff2d87 - Independent SSOT token source, decoupled from Grade Star)
 * B: Dark Orange (Grade D, #ff8c00)
 * C: Electric Lime (Grade B, #95ff00)
 * D: Tactical Cyan / Blue (#38bdf8)
 */
export const TOPSCORE_QUAD_COLORS = {
  A: '#ff2d87',
  B: TOPSCORE_COLORS.D, // #FF8C00 (Dark Orange)
  C: TOPSCORE_COLORS.B, // #95ff00ff (Electric Lime)
  D: '#38bdf8', // Tactical Cyan
  A_RGB: '255, 45, 135',
  B_RGB: TOPSCORE_COLORS.D_RGB,
  C_RGB: TOPSCORE_COLORS.B_RGB,
  D_RGB: '56, 189, 248'
};

/**
 * Authoritative Grade & Score Palette (6 Clean Tiers: ★, A, B, C, D, E)
 */
export const STAR_THEME = {
  symbol: '★',
  label: 'Excellent',
  predicate: 'Excellent',
  color: TOPSCORE_COLORS.STAR,
  dark: '#7e22ce',
  light: '#d8b4fe',
  rgb: TOPSCORE_COLORS.STAR_RGB,
  glow: 'rgba(192, 132, 252, 0.5)',
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
 * Authoritative Canonical Default Color System (SSOT)
 */
export const DEFAULT_COLOR_SYSTEM = Object.freeze({
  // 1. 4-Pillar Architecture (ABCD System & Themes)
  quadA: '#ff2d87', // Pilar A (ADMIN & Theme A)
  quadB: '#FF8C00', // Pilar B (BOARD & Theme B)
  quadC: '#95ff00', // Pilar C (CLASS & Theme C)
  quadD: '#38bdf8', // Pilar D (DATA & Theme D)

  // 2. Dual Pairs (Components & Test Types)
  words: '#95ff00', // Words (WRD) -> Lime
  phrases: '#ff2d87', // Phrases (PHR) -> Pink
  task: '#95ff00', // Task (Formatif) -> Lime
  exam: '#ff2d87', // Exam (Milestone) -> Pink

  // 3. 3-Pillar Evaluations & Semantic Alerts
  correct: '#00c000', // Correct (1.0 pt) & Status Sukses/Aktif
  partial: '#FFFF00', // Partial (0.5 pt) & Status Warning/Pending/Remedi
  incorrect: '#FF0000', // Incorrect (0.0 pt) & Status Danger/Hapus/Forgive

  // 4. Action Buttons (Primary CTA & Permanent Danger)
  btnPrimary: '#0284c7', // Primary Action CTA (Save, Proceed, Submit)
  btnDanger: '#dc2626',  // Permanent Danger Action (Delete, Purge, Kick)

  // 5. 7-Step Repetition Rainbow Spectrum (Pips 1-7)
  rainbow1: '#FF0000', // Pip 1: Merah
  rainbow2: '#FF8C00', // Pip 2: Jingga
  rainbow3: '#FFFF00', // Pip 3: Kuning
  rainbow4: '#00c000', // Pip 4: Hijau
  rainbow5: '#38bdf8', // Pip 5: Biru
  rainbow6: '#6366f1', // Pip 6: Nila
  rainbow7: '#C084FC', // Pip 7: Ungu Spektrum (Tetap Ungu)

  // 5. Academic Grade Scale (Rapor Siswa)
  gradeStar: '#c084fc', // Grade Star ★ (100%)
  gradeA: '#00c000', // Grade A (90-99%)
  gradeB: '#95ff00', // Grade B (80-89%)
  gradeC: '#FFFF00', // Grade C (60-79%)
  gradeD: '#FF8C00', // Grade D (30-59%)
  gradeE: '#FF0000'  // Grade E (0-29%)
});

/**
 * Convert Hex color string to comma-separated RGB string
 * @param {string} hex
 * @returns {string} e.g. "56, 189, 248"
 */
export function hexToRgbString(hex) {
  if (!hex || typeof hex !== 'string') return '148, 163, 184';
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16) || 0;
    const g = parseInt(clean[1] + clean[1], 16) || 0;
    const b = parseInt(clean[2] + clean[2], 16) || 0;
    return `${r}, ${g}, ${b}`;
  }
  if (clean.length >= 6) {
    const r = parseInt(clean.substring(0, 2), 16) || 0;
    const g = parseInt(clean.substring(2, 4), 16) || 0;
    const b = parseInt(clean.substring(4, 6), 16) || 0;
    return `${r}, ${g}, ${b}`;
  }
  return '148, 163, 184';
}

/**
 * Apply color system overrides globally to document CSS variables (:root)
 * and mutate JavaScript memory constants (TOPSCORE_COLORS, GRADE_PALETTE, STAR_THEME)
 * so all dynamic JavaScript views, table formatters, and CSS rules update immediately.
 * @param {Object} overrides
 */
export function applyGlobalColorSystem(overrides = {}) {
  const cfg = { ...DEFAULT_COLOR_SYSTEM, ...overrides };

  // 1. Mutate TOPSCORE_COLORS & palettes in memory so JS callers (getGradeColor, getGradeTheme, formatGradeBadgeHtml)
  // immediately return the updated colors without requiring page reloads
  if (cfg.gradeStar) {
    TOPSCORE_COLORS.STAR = cfg.gradeStar;
    TOPSCORE_COLORS.STAR_8HEX = cfg.gradeStar.length === 7 ? cfg.gradeStar + 'ff' : cfg.gradeStar;
    TOPSCORE_COLORS.STAR_RGB = hexToRgbString(cfg.gradeStar);
    if (typeof STAR_THEME !== 'undefined' && STAR_THEME) {
      STAR_THEME.color = cfg.gradeStar;
      STAR_THEME.rgb = TOPSCORE_COLORS.STAR_RGB;
      STAR_THEME.glow = `rgba(${TOPSCORE_COLORS.STAR_RGB}, 0.5)`;
    }
    if (typeof GRADE_PALETTE !== 'undefined' && GRADE_PALETTE) {
      if (GRADE_PALETTE['★']) {
        GRADE_PALETTE['★'].color = cfg.gradeStar;
        GRADE_PALETTE['★'].rgb = TOPSCORE_COLORS.STAR_RGB;
        GRADE_PALETTE['★'].glow = `rgba(${TOPSCORE_COLORS.STAR_RGB}, 0.5)`;
      }
      if (GRADE_PALETTE['S']) {
        GRADE_PALETTE['S'].color = cfg.gradeStar;
        GRADE_PALETTE['S'].rgb = TOPSCORE_COLORS.STAR_RGB;
        GRADE_PALETTE['S'].glow = `rgba(${TOPSCORE_COLORS.STAR_RGB}, 0.5)`;
      }
    }
  }

  if (cfg.gradeA) {
    TOPSCORE_COLORS.A = cfg.gradeA;
    TOPSCORE_COLORS.A_8HEX = cfg.gradeA.length === 7 ? cfg.gradeA + 'ff' : cfg.gradeA;
    TOPSCORE_COLORS.A_RGB = hexToRgbString(cfg.gradeA);
    if (typeof GRADE_PALETTE !== 'undefined' && GRADE_PALETTE && GRADE_PALETTE['A']) {
      GRADE_PALETTE['A'].color = cfg.gradeA;
      GRADE_PALETTE['A'].rgb = TOPSCORE_COLORS.A_RGB;
    }
  }

  if (cfg.gradeB) {
    TOPSCORE_COLORS.B = cfg.gradeB;
    TOPSCORE_COLORS.B_8HEX = cfg.gradeB.length === 7 ? cfg.gradeB + 'ff' : cfg.gradeB;
    TOPSCORE_COLORS.B_RGB = hexToRgbString(cfg.gradeB);
    if (typeof GRADE_PALETTE !== 'undefined' && GRADE_PALETTE && GRADE_PALETTE['B']) {
      GRADE_PALETTE['B'].color = cfg.gradeB;
      GRADE_PALETTE['B'].rgb = TOPSCORE_COLORS.B_RGB;
    }
  }

  if (cfg.gradeC) {
    TOPSCORE_COLORS.C = cfg.gradeC;
    TOPSCORE_COLORS.C_RGB = hexToRgbString(cfg.gradeC);
    TOPSCORE_COLORS.REMEDIAL = cfg.gradeC;
    TOPSCORE_COLORS.REMEDIAL_RGB = TOPSCORE_COLORS.C_RGB;
    if (typeof GRADE_PALETTE !== 'undefined' && GRADE_PALETTE) {
      if (GRADE_PALETTE['C']) {
        GRADE_PALETTE['C'].color = cfg.gradeC;
        GRADE_PALETTE['C'].rgb = TOPSCORE_COLORS.C_RGB;
      }
      if (GRADE_PALETTE['R']) {
        GRADE_PALETTE['R'].color = cfg.gradeC;
        GRADE_PALETTE['R'].rgb = TOPSCORE_COLORS.C_RGB;
      }
    }
  }

  if (cfg.gradeD) {
    TOPSCORE_COLORS.D = cfg.gradeD;
    TOPSCORE_COLORS.D_RGB = hexToRgbString(cfg.gradeD);
    if (typeof GRADE_PALETTE !== 'undefined' && GRADE_PALETTE && GRADE_PALETTE['D']) {
      GRADE_PALETTE['D'].color = cfg.gradeD;
      GRADE_PALETTE['D'].rgb = TOPSCORE_COLORS.D_RGB;
    }
  }

  if (cfg.gradeE) {
    TOPSCORE_COLORS.E = cfg.gradeE;
    TOPSCORE_COLORS.E_RGB = hexToRgbString(cfg.gradeE);
    TOPSCORE_COLORS.FORGIVEN = cfg.gradeE;
    TOPSCORE_COLORS.FORGIVEN_RGB = TOPSCORE_COLORS.E_RGB;
    if (typeof GRADE_PALETTE !== 'undefined' && GRADE_PALETTE) {
      if (GRADE_PALETTE['E']) {
        GRADE_PALETTE['E'].color = cfg.gradeE;
        GRADE_PALETTE['E'].rgb = TOPSCORE_COLORS.E_RGB;
      }
      if (GRADE_PALETTE['F']) {
        GRADE_PALETTE['F'].color = cfg.gradeE;
        GRADE_PALETTE['F'].rgb = TOPSCORE_COLORS.E_RGB;
      }
    }
  }

  if (cfg.correct) TOPSCORE_COLORS.CORRECT = cfg.correct;
  if (cfg.partial) TOPSCORE_COLORS.PARTIAL = cfg.partial;
  if (cfg.incorrect) TOPSCORE_COLORS.INCORRECT = cfg.incorrect;

  if (typeof TOPSCORE_QUAD_COLORS !== 'undefined' && TOPSCORE_QUAD_COLORS) {
    if (cfg.quadA) TOPSCORE_QUAD_COLORS.A = cfg.quadA;
    if (cfg.quadB) TOPSCORE_QUAD_COLORS.B = cfg.quadB;
    if (cfg.quadC) TOPSCORE_QUAD_COLORS.C = cfg.quadC;
    if (cfg.quadD) TOPSCORE_QUAD_COLORS.D = cfg.quadD;
  }

  const root = document.documentElement;
  if (!root || !root.style) return;

  // 4-Pillar
  root.style.setProperty('--quad-a', cfg.quadA);
  root.style.setProperty('--quad-a-rgb', hexToRgbString(cfg.quadA));
  root.style.setProperty('--quad-b', cfg.quadB);
  root.style.setProperty('--quad-b-rgb', hexToRgbString(cfg.quadB));
  root.style.setProperty('--quad-c', cfg.quadC);
  root.style.setProperty('--quad-c-rgb', hexToRgbString(cfg.quadC));
  root.style.setProperty('--quad-d', cfg.quadD);
  root.style.setProperty('--quad-d-rgb', hexToRgbString(cfg.quadD));

  // Dual Pairs
  root.style.setProperty('--words-color', cfg.words);
  root.style.setProperty('--words-color-rgb', hexToRgbString(cfg.words));
  root.style.setProperty('--phrases-color', cfg.phrases);
  root.style.setProperty('--phrases-color-rgb', hexToRgbString(cfg.phrases));
  root.style.setProperty('--task-color', cfg.task);
  root.style.setProperty('--task-color-rgb', hexToRgbString(cfg.task));
  root.style.setProperty('--exam-color', cfg.exam);
  root.style.setProperty('--exam-color-rgb', hexToRgbString(cfg.exam));

  // 3-Pillar & Evaluation
  root.style.setProperty('--eval-correct', cfg.correct);
  root.style.setProperty('--eval-correct-rgb', hexToRgbString(cfg.correct));
  root.style.setProperty('--eval-partial', cfg.partial);
  root.style.setProperty('--eval-partial-rgb', hexToRgbString(cfg.partial));
  root.style.setProperty('--eval-incorrect', cfg.incorrect);
  root.style.setProperty('--eval-incorrect-rgb', hexToRgbString(cfg.incorrect));

  // 7 Rainbow Steps
  root.style.setProperty('--rainbow-step-1', cfg.rainbow1);
  root.style.setProperty('--rainbow-step-1-rgb', hexToRgbString(cfg.rainbow1));
  root.style.setProperty('--rainbow-step-2', cfg.rainbow2);
  root.style.setProperty('--rainbow-step-2-rgb', hexToRgbString(cfg.rainbow2));
  root.style.setProperty('--rainbow-step-3', cfg.rainbow3);
  root.style.setProperty('--rainbow-step-3-rgb', hexToRgbString(cfg.rainbow3));
  root.style.setProperty('--rainbow-step-4', cfg.rainbow4);
  root.style.setProperty('--rainbow-step-4-rgb', hexToRgbString(cfg.rainbow4));
  root.style.setProperty('--rainbow-step-5', cfg.rainbow5);
  root.style.setProperty('--rainbow-step-5-rgb', hexToRgbString(cfg.rainbow5));
  root.style.setProperty('--rainbow-step-6', cfg.rainbow6);
  root.style.setProperty('--rainbow-step-6-rgb', hexToRgbString(cfg.rainbow6));
  root.style.setProperty('--rainbow-step-7', cfg.rainbow7);
  root.style.setProperty('--rainbow-step-7-rgb', hexToRgbString(cfg.rainbow7));

  // Academic Grade Scale
  root.style.setProperty('--grade-star', cfg.gradeStar);
  root.style.setProperty('--grade-star-rgb', hexToRgbString(cfg.gradeStar));
  root.style.setProperty('--grade-star-glow', `rgba(${hexToRgbString(cfg.gradeStar)}, 0.45)`);
  root.style.setProperty('--grade-a', cfg.gradeA);
  root.style.setProperty('--grade-a-rgb', hexToRgbString(cfg.gradeA));
  root.style.setProperty('--grade-b', cfg.gradeB);
  root.style.setProperty('--grade-b-rgb', hexToRgbString(cfg.gradeB));
  root.style.setProperty('--grade-c', cfg.gradeC);
  root.style.setProperty('--grade-c-rgb', hexToRgbString(cfg.gradeC));
  root.style.setProperty('--grade-d', cfg.gradeD);
  root.style.setProperty('--grade-d-rgb', hexToRgbString(cfg.gradeD));
  root.style.setProperty('--grade-e', cfg.gradeE);
  root.style.setProperty('--grade-e-rgb', hexToRgbString(cfg.gradeE));

  // Action Buttons
  if (cfg.btnPrimary) {
    root.style.setProperty('--btn-primary-bg', cfg.btnPrimary);
    root.style.setProperty('--btn-primary-rgb', hexToRgbString(cfg.btnPrimary));
  }
  if (cfg.btnDanger) {
    root.style.setProperty('--btn-danger-bg', cfg.btnDanger);
    root.style.setProperty('--btn-danger-rgb', hexToRgbString(cfg.btnDanger));
  }
}

/**
 * Authoritative Canonical Default Interface System (SSOT)
 * Comprehensive 3-Pillar UI Governance: Colours, Typography, Surfaces
 */
export const DEFAULT_INTERFACE_SYSTEM = Object.freeze({
  colors: { ...DEFAULT_COLOR_SYSTEM },
  typography: {
    fontSans: "'Inter', sans-serif",
    fontMono: "'JetBrains Mono', 'Fira Code', monospace",
    text1: '#ffffff',
    text2: '#e2e8f0',
    text3: '#94a3b8'
  },
  surface: {
    bgMain: '#090D16',
    bgSidebar: '#0F172A',
    bgCard: '#121c35',
    bgStudent: '#060911',
    bgBanner: '#030a12',
    borderOpacity: '0.08',
    glowIntensity: '1.0'
  }
});

/**
 * Apply interface system overrides globally to document CSS variables (:root)
 * @param {Object} custom
 */
export function applyGlobalInterfaceSystem(custom = {}) {
  const cfg = {
    colors: { ...DEFAULT_INTERFACE_SYSTEM.colors, ...(custom.colors || {}) },
    typography: { ...DEFAULT_INTERFACE_SYSTEM.typography, ...(custom.typography || {}) },
    surface: { ...DEFAULT_INTERFACE_SYSTEM.surface, ...(custom.surface || {}) }
  };

  // 1. Apply colours
  applyGlobalColorSystem(cfg.colors);

  const root = document.documentElement;
  if (!root || !root.style) return;

  // 2. Apply typography
  if (cfg.typography.fontSans) {
    root.style.setProperty('--font-sans', cfg.typography.fontSans);
    root.style.setProperty('--font-body', cfg.typography.fontSans);
    root.style.setProperty('--font-display', cfg.typography.fontSans);
  }
  if (cfg.typography.fontMono) {
    root.style.setProperty('--font-mono', cfg.typography.fontMono);
  }
  if (cfg.typography.text1) root.style.setProperty('--clr-text-1', cfg.typography.text1);
  if (cfg.typography.text2) root.style.setProperty('--clr-text-2', cfg.typography.text2);
  if (cfg.typography.text3) root.style.setProperty('--clr-text-3', cfg.typography.text3);

  // 3. Apply surface
  if (cfg.surface.bgMain) root.style.setProperty('--fm-bg-main', cfg.surface.bgMain);
  if (cfg.surface.bgSidebar) root.style.setProperty('--fm-bg-sidebar', cfg.surface.bgSidebar);
  if (cfg.surface.bgCard) root.style.setProperty('--clr-surface', cfg.surface.bgCard);
  if (cfg.surface.bgStudent) root.style.setProperty('--fm-bg-student', cfg.surface.bgStudent);
  if (cfg.surface.bgBanner) root.style.setProperty('--fm-bg-banner', cfg.surface.bgBanner);
  if (cfg.surface.borderOpacity) {
    root.style.setProperty('--clr-border', `rgba(255, 255, 255, ${cfg.surface.borderOpacity})`);
  }
}

/**
 * Load saved interface system from localStorage and apply to :root
 */
export function loadAndApplyGlobalInterfaceSystem() {
  try {
    const cached = localStorage.getItem('topscore_interface_system');
    if (cached) {
      const parsed = JSON.parse(cached);
      applyGlobalInterfaceSystem(parsed);
      return;
    }
    const legacyColors = localStorage.getItem('topscore_color_system');
    if (legacyColors) {
      applyGlobalColorSystem(JSON.parse(legacyColors));
      return;
    }
  } catch (e) {
    console.warn('Failed to load interface system settings:', e);
  }
  applyGlobalInterfaceSystem(DEFAULT_INTERFACE_SYSTEM);
}

/**
 * Load saved color system from localStorage / site_settings and apply to :root
 */
export function loadAndApplyGlobalColorSystem() {
  loadAndApplyGlobalInterfaceSystem();
}

// Auto-apply on script evaluation
if (typeof document !== 'undefined') {
  loadAndApplyGlobalInterfaceSystem();
}

// Cross-tab synchronization
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'topscore_interface_system' || e.key === 'topscore_color_system') {
      loadAndApplyGlobalInterfaceSystem();
    }
  });
}

// Auto-apply on script evaluation
if (typeof document !== 'undefined') {
  loadAndApplyGlobalInterfaceSystem();
}

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
  if (g === '★' || g.toUpperCase() === 'S') return TOPSCORE_COLORS.STAR;
  if (g.toUpperCase() === 'X' || g.toUpperCase() === 'ALUMNI') return TOPSCORE_COLORS.X;
  if (g.toUpperCase() === "LET'S GO" || g.toUpperCase() === 'LETS GO' || g === '—' || g === '-' || g.toUpperCase() === 'START') return TOPSCORE_COLORS.NEUTRAL;
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
    dark: isStar ? '#7e22ce' : '#64748b',
    light: isStar ? '#d8b4fe' : '#cbd5e1',
    rgb: isStar ? TOPSCORE_COLORS.STAR_RGB : '148, 163, 184',
    glow: isStar ? 'rgba(192, 132, 252, 0.5)' : 'rgba(148, 163, 184, 0.25)',
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
  if (g === "LET'S GO" || g === 'LETS GO' || g === '—' || g === '-' || g === 'START') {
    return 'START';
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
  return map[effGrade] || 'START';
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

  // Rule 2.9: Points Half-Up Whole Integer Invariant with Ceiling Cap Exception
  const maxPoints = hasPhrases ? (wordsMax + phrasesMax) : wordsMax;
  const rawSum = effectiveWordsPts + effectivePhrasesPts;
  const totalPoints = roundPointsWithCeilingCap(rawSum, maxPoints);
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
  const cleanExamEntries = (Array.isArray(examEntries) ? examEntries : []).filter(e => {
    if (!e) return false;
    const isPureForgivenZero = Boolean(e.isForgiven) && Number(e.effPoints ?? e.points ?? 0) === 0;
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

  const rawTitle = String(test.title || test.name || '').trim();
  const shell = String(test.shell_code || '').toUpperCase();
  const isEx = (test.test_type || '').toLowerCase() === 'exam' ||
               (test.category || '').toUpperCase() === 'EXAM' ||
               shell.endsWith('-EXAM') ||
               /\bExam\b/i.test(rawTitle);

  const typePart = isEx ? 'Exam' : 'Task';

  // 1. Extract Topic / Theme (after dash)
  let topicOrTheme = '';
  const dashIdx = rawTitle.search(/\s+[-–:]\s+/);
  if (dashIdx !== -1) {
    topicOrTheme = rawTitle.substring(dashIdx).replace(/^[\s-–:]+/, '').trim();
  } else {
    topicOrTheme = rawTitle.replace(/^\d+(st|nd|rd|th)?\s+Vocabulary\s+/i, '')
                           .replace(/^(Theme\s+[A-Z0-9]+\s+)?(Words\s+|Phrases\s+)?(Task|Exam)\s*/i, '')
                           .trim();
  }
  // Sanitize common typos in topic/theme names
  topicOrTheme = topicOrTheme.replace(/\bDialy\b/gi, 'Daily');

  // Capitalize nicely if all uppercase (e.g. "COOKING CLASS" -> "Cooking Class")
  if (topicOrTheme && topicOrTheme === topicOrTheme.toUpperCase() && topicOrTheme.length > 3) {
    topicOrTheme = topicOrTheme.split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  // 2. Extract Code (e.g. A1, B2, D4, D, G1, G, 0A1, 0A)
  let codePart = '';
  const segments = shell.split('-');
  if (segments.length >= 4) {
    codePart = segments[2]; // e.g. "A1", "D", "0A1", "G1"
  } else if (shell) {
    const mLegacy = shell.match(/^([0-9]?[A-Z]+[0-9]?)-/);
    if (mLegacy) {
      codePart = mLegacy[1].replace(/^[123]/, ''); // remove level prefix e.g. "3A1" -> "A1", "3D" -> "D"
    }
  }

  if (!codePart && rawTitle) {
    // Check "Task A1", "Exam D", "Task 0A1", "Exam 0A"
    const mForward = rawTitle.match(/\b(?:Task|Exam)\s+([0-9]?[A-Z]+[0-9]?)\b/i);
    if (mForward) {
      codePart = mForward[1].toUpperCase();
    } else {
      // Check legacy "A1 Task", "D Exam", "A1 Words Task", "D Phrases Exam"
      const mBackward = rawTitle.match(/\b([0-9]?[A-Z]+[0-9]?)\s+(?:Words\s+|Phrases\s+)?(?:Task|Exam)\b/i);
      if (mBackward) {
        codePart = mBackward[1].toUpperCase();
      } else {
        const mTheme = rawTitle.match(/\bTheme\s+([A-Z]+[0-9]?)\b/i);
        if (mTheme) {
          codePart = mTheme[1].toUpperCase();
        }
      }
    }
  }

  // Fallback if codePart still empty
  if (!codePart) {
    codePart = isEx ? 'A' : 'A1';
  }

  // 3. Determine Level and Class Name
  const isLevel0 = test.levels?.level_number === 0 ||
                   String(test.levels?.name || '').toLowerCase().includes('non-level') ||
                   shell.startsWith('EVNK-') || shell.startsWith('EVN-') || shell.startsWith('SHRT-') || shell.startsWith('SHR-') || shell.startsWith('TPTC-') || shell.startsWith('TMT-') ||
                   /^(Evnikom|Sheraton|Tamata)/i.test(rawTitle) ||
                   /^(Evnikom|Sheraton|Tamata)/i.test(test.classes?.name || '');

  let levelOrdinal = '';
  let className = 'Vocabulary';

  if (isLevel0) {
    levelOrdinal = '';
    if (test.classes?.name) {
      className = test.classes.name.trim();
    } else {
      const instMatch = rawTitle.match(/^(Evnikom|Sheraton|Tamata)\s+([A-Za-z\s]+?)(?=\s+[0-9A-Z]|\s+Task|\s+Exam|\s+-|$)/i);
      if (instMatch) {
        className = `${instMatch[1]} ${instMatch[2]}`.trim();
      } else {
        className = 'Vocabulary';
      }
    }
  } else {
    // Regular levels 1, 2, 3
    if (test.levels?.level_number != null && test.levels.level_number > 0) {
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

    // Fallback from rawTitle (e.g. "Camp 2nd Vocabulary" or "2nd Vocabulary")
    if (!levelOrdinal) {
      const lvlMatch = rawTitle.match(/(?:Camp\s+)?(\d+)(st|nd|rd|th)?\s+([A-Za-z\s]+?)(?=\s+[A-D0-9]|\s+Theme|\s+Words|\s+Phrases|\s+Task|\s+Exam)/i);
      if (lvlMatch) {
        const n = parseInt(lvlMatch[1], 10);
        levelOrdinal = n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`;
        if (lvlMatch[3] && !test.classes?.name) className = lvlMatch[3].trim();
      }
    }

    // Fallback from shell_code (e.g. "CAMP-3VCB-...", "CMP-3VCB-...", "2B1-...", "3A-...")
    if (!levelOrdinal) {
      const shellLvl = shell.match(/(?:CAMP-|CMP-)?([123])/);
      if (shellLvl) {
        const n = parseInt(shellLvl[1], 10);
        levelOrdinal = n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`;
      } else {
        levelOrdinal = '1st';
      }
    }
  }

  // 4. Construct SSOT Format:
  // Task: "2nd Vocabulary Task A1 - Topic Name"
  // Exam: "2nd Vocabulary Exam A - Theme Name"
  const classPrefix = `${levelOrdinal} ${className}`.trim();
  const typeLabel = `${classPrefix} ${typePart} ${codePart}`.trim();
  let fullTitle = topicOrTheme ? `${typeLabel} - ${topicOrTheme}` : typeLabel;
  let line1 = `${typePart} ${codePart}`; // Zero Class Redundancy for standard mobile 2-line rendering: "Task A1" / "Exam A"
  const line2 = topicOrTheme;

  // If rawTitle explicitly starts with Program name and has dash (e.g. "Camp 1st Basic English Exam - Tell Me What You See"),
  // preserve the user-determined title and line1 verbatim:
  if (dashIdx !== -1 && /^(Camp|Evnikom|Sheraton|Tamata)/i.test(rawTitle)) {
    const customLine1 = rawTitle.substring(0, dashIdx).trim();
    if (customLine1) {
      line1 = customLine1;
      fullTitle = rawTitle;
    }
  }

  return {
    typeLabel,
    topicOrTheme,
    fullTitle,
    line1,
    line2
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

/**
 * Authoritative Discipline / Subject Classifier for Classes.
 * Guarantees strict separation between Vocabulary, Basic English, Speaking, Storytelling, etc.
 * @param {Object|string} classObjOrName - Class object with { name, code } or class name string.
 * @returns {'VOCABULARY'|'BASIC_ENGLISH'|'SPEAKING'|'STORYTELLING'|'GENERAL'}
 */
export function detectClassDiscipline(classObjOrName) {
  if (!classObjOrName) return 'GENERAL';
  const name = typeof classObjOrName === 'string' ? classObjOrName : (classObjOrName.name || '');
  const code = typeof classObjOrName === 'object' ? (classObjOrName.code || '') : '';

  if (/\b(vocab|vocabulary)\b/i.test(name) || /-(?:[0-9]*VCB|VOCAB)\b/i.test(code)) {
    return 'VOCABULARY';
  }
  if (/\b(basic\s*english|basic)\b/i.test(name) || /-(?:[0-9]*BAS|BASIC|BSC)\b/i.test(code)) {
    return 'BASIC_ENGLISH';
  }
  if (/\b(speaking|public\s*speaking)\b/i.test(name) || /-(?:[0-9]*SPK|SPEAK)\b/i.test(code)) {
    return 'SPEAKING';
  }
  if (/\b(storytelling|story)\b/i.test(name) || /-(?:[0-9]*STT|STORY)\b/i.test(code)) {
    return 'STORYTELLING';
  }
  if (/\bgrammar\s*for\s*speaking\b/i.test(name) || /-(?:[0-9]*GFS|GFORS)\b/i.test(code)) {
    return 'GFS';
  }
  if (/\bpronunciation\b/i.test(name) || /-(?:[0-9]*PRN|PRON|PRONC)\b/i.test(code)) {
    return 'PRONUNCIATION';
  }
  if (/\bgrammar\b/i.test(name) || /-(?:[0-9]*GRM|GRAM|GRMMR)\b/i.test(code)) {
    return 'GRAMMAR';
  }
  return 'GENERAL';
}

/**
 * Strict boolean guard: is this class exclusively for Vocabulary Vault?
 * @param {Object|string} classObjOrName
 * @returns {boolean}
 */
export function isVocabularyClass(classObjOrName) {
  return detectClassDiscipline(classObjOrName) === 'VOCABULARY';
}

/**
 * Strict boolean guard: is this class evaluated manually by tutors rather than online TopsCore CBT tests?
 * - All Speaking, Storytelling, Grammar, GFS, Pronunciation classes are MANUAL
 * - Vocabulary 1st Step (Vocab 1) is MANUAL (weekly word deposits W1..W4 + PT)
 * - Vocabulary 2nd & 3rd Step + Non-level Vocab + Basic English are CBT
 * @param {Object|string} classObjOrName
 * @returns {boolean}
 */
export function isManualEvaluationClass(classObjOrName) {
  if (!classObjOrName) return false;
  const discipline = detectClassDiscipline(classObjOrName);
  if (discipline === 'BASIC_ENGLISH') return false; // Basic English uses CBT Module M1

  const name = typeof classObjOrName === 'string' ? classObjOrName : (classObjOrName.name || '');
  const code = typeof classObjOrName === 'object' ? (classObjOrName.code || '') : '';
  
  if (discipline === 'VOCABULARY') {
    // Vocab 1st Step is Manual per official curriculum rules
    const isLevel1 = /\b1st\b|level\s*1|-1(?:VCB|VOCAB)/i.test(name) || /-1(?:VCB|VOCAB)/i.test(code);
    return isLevel1;
  }

  return true;
}

export function isCbtEvaluationClass(classObjOrName) {
  return !isManualEvaluationClass(classObjOrName);
}

// ── EXAM RULES & FINAL ASSESSMENT SSOT ENGINE ──
export {
  EXAM_RULES_SCHEMA,
  getCertificatePredicate,
  calculateWeeklyVocabPercentage,
  calculateStepVocabAverage,
  calculateSubjectCompositeScore,
  calculateMainExaminerScore,
  calculateSpeakingTutorScore,
  generateStudentCertificateTranscript
} from './admin/exam-rules-engine.js';


