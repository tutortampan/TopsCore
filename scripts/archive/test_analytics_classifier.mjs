import { damerauLevenshtein } from '../js/grading.js';

// Replicate tests-management.js current classifyStudentError
function levenshteinDistance(s1, s2) {
  if (s1 === s2) return 0;
  if (!s1.length) return s2.length;
  if (!s2.length) return s1.length;
  const d = [];
  for (let i = 0; i <= s1.length; i++) d[i] = [i];
  for (let j = 0; j <= s2.length; j++) d[0][j] = j;
  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    }
  }
  return d[s1.length][s2.length];
}

function classifyStudentError(studentAnswer, targetCorrect, evaluationResult, questionPrompt) {
  const ans = String(studentAnswer || '').trim();
  const target = String(targetCorrect || '').trim();
  const prompt = String(questionPrompt || '').trim();

  // 1. Timed Out / Blank
  if (!ans || ans === '[Blank / Timed Out]' || ans === '—' || ans === '-' || ans.toLowerCase() === 'null') {
    return 'timeout';
  }

  const normEval = String(evaluationResult || '').toLowerCase();
  // 2. Minor Spelling Error / Typo (explicit evaluation from engine)
  if (normEval === 'minor_spelling_error' || normEval === 'partial' || normEval === 'half') {
    return 'spelling';
  }

  const cleanAns = ans.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const cleanTarget = target.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const targetVariants = target.split(/[;,/]/).map(t => t.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()).filter(Boolean);

  // Check 1-2 edit distance typos directly against all target variants
  for (const variant of targetVariants) {
    const vDist = damerauLevenshtein(cleanAns, variant);
    if (vDist > 0 && vDist <= 2) {
      return 'spelling';
    }
  }

  // 3. Word Form / Part-of-Speech Confusion
  const posSuffixes = ['tion', 'sion', 'ion', 'ation', 'ition', 'ment', 'ness', 'ity', 'ing', 'ed', 'er', 'or', 'ly', 'ful', 'able', 'ible', 'ive', 'al', 'ous', 'ize', 'ise', 'ate', 'est', 's', 'es', 'ance', 'ence', 'ant', 'ent'];
  const hasStemMatch = targetVariants.some(tv => {
    // Only check word form stem match if words match structure (e.g. single word to single word, or last word of phrase)
    const tvWords = tv.split(/\s+/);
    const ansWords = cleanAns.split(/\s+/);
    if (tvWords.length !== ansWords.length) return false;

    return tvWords.some((tvW, idx) => {
      const ansW = ansWords[idx] || '';
      if (tvW.length >= 3 && ansW.length >= 3 && tvW !== ansW) {
        let commonPrefixLen = 0;
        while (commonPrefixLen < tvW.length && commonPrefixLen < ansW.length && tvW[commonPrefixLen] === ansW[commonPrefixLen]) {
          commonPrefixLen++;
        }
        if (commonPrefixLen >= 3) {
          const tvRest = tvW.slice(commonPrefixLen);
          const ansRest = ansW.slice(commonPrefixLen);
          const isTvSuffix = tvRest === '' || tvRest === 'e' || posSuffixes.some(s => tvRest === s);
          const isAnsSuffix = ansRest === '' || ansRest === 'e' || posSuffixes.some(s => ansRest === s);
          if (isTvSuffix && isAnsSuffix) {
            return true;
          }
        }
      }
      return false;
    });
  });

  if (hasStemMatch) {
    return 'word_form';
  }

  // 4. Literal Translation (Indonesian echo, circumlocution, or common translation patterns)
  const cleanPrompt = prompt.toLowerCase();
  const isIndoEcho = cleanPrompt.split(/\s+/).some(w => w.length >= 3 && cleanAns.includes(w));
  const isCircumlocution = cleanAns.split(/\s+/).length >= 2 && cleanTarget.split(/\s+/).length === 1;
  const commonLiteralWords = ['again', 'back', 'take', 'make', 'do', 'give', 'get', 'story', 'tell', 'talk', 'walk', 'put', 'hand', 'eye', 'heart', 'house', 'water', 'road', 'time', 'day', 'wind', 'enter', 'out'];
  const containsLiteral = commonLiteralWords.some(w => cleanAns.split(/\s+/).includes(w));

  if (isIndoEcho || isCircumlocution || containsLiteral) {
    return 'literal';
  }

  const dist = damerauLevenshtein(cleanAns, cleanTarget);
  if (dist <= Math.max(3, Math.floor(cleanTarget.length * 0.35))) {
    return 'spelling';
  }

  return 'literal';
}

const testCases = [
  { ans: 'story again', target: 'retell; recount', evalRes: null, prompt: 'menceritakan kembali', expected: 'literal' },
  { ans: 'telling back', target: 'retell; recount', evalRes: null, prompt: 'menceritakan kembali', expected: 'literal' },
  { ans: 'celebration', target: 'celebrate', evalRes: null, prompt: 'merayakan', expected: 'word_form' },
  { ans: 'profesionall goal', target: 'professional goal', evalRes: null, prompt: 'tujuan karir', expected: 'spelling' },
  { ans: '', target: 'retell', evalRes: null, prompt: 'menceritakan kembali', expected: 'timeout' },
  { ans: 'resourcfull', target: 'resourceful', evalRes: 'minor_spelling_error', prompt: 'banyak akal', expected: 'spelling' },
  { ans: 'resourcfull', target: 'resourceful', evalRes: 'partial', prompt: 'banyak akal', expected: 'spelling' },
  // Case with 3 edit distance where backend marked partial / minor_spelling_error
  { ans: 'resourcfullness', target: 'resourceful', evalRes: 'partial', prompt: 'banyak akal', expected: 'spelling' },
  // Multi-word phrase with 3 typos on a 25-char target phrase (dist 3, dist <= floor(25 * 0.35) = 8)
  { ans: 'taking care of someonee', target: 'taking care of someone', evalRes: null, prompt: 'merawat seseorang', expected: 'spelling' },
  // Multi-word phrase with 3 typos where target has 2 words
  { ans: 'profesionall goall', target: 'professional goal', evalRes: null, prompt: 'tujuan karir', expected: 'spelling' },
  // Indonesian prompt echo
  { ans: 'menghibur with friend', target: 'entertain', evalRes: null, prompt: 'menghibur teman', expected: 'literal' },
  // Student answer is null
  { ans: null, target: 'retell', evalRes: null, prompt: 'menceritakan kembali', expected: 'timeout' },
  // Student answer is whitespace
  { ans: '   ', target: 'retell', evalRes: null, prompt: 'menceritakan kembali', expected: 'timeout' },
];

let failed = 0;
testCases.forEach((t, i) => {
  const actual = classifyStudentError(t.ans, t.target, t.evalRes, t.prompt);
  const pass = actual === t.expected;
  if (!pass) failed++;
  console.log(`Test #${i + 1}: ans="${t.ans}" -> actual="${actual}" vs expected="${t.expected}" [${pass ? 'PASS' : 'FAIL'}]`);
});
console.log(`\nTotal Failed: ${failed}`);
