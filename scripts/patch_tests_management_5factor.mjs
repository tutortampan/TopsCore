import fs from 'fs';

const filePath = 'd:/Drives/Tutor Tampan/TopsCore/js/admin/tests-management.js';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update import
content = content.replace(
  "import { TOPSCORE_COLORS, getGradeColor, getGradeColorByScore, calculateGrade, isWeeklyExam, damerauLevenshtein } from '../grading.js?v=20261031_v58';",
  "import { TOPSCORE_COLORS, getGradeColor, getGradeColorByScore, calculateGrade, isWeeklyExam, damerauLevenshtein, isWordFormAnswerMatch } from '../grading.js?v=20261031_v58';"
);

// 2. Define INDO_COMMON_WORDS and updated classifyStudentError
const oldClassifierStart = '// Student Error Classifier';
const oldClassifierEnd = 'export async function renderTests(area) {';
const startIndex = content.indexOf(oldClassifierStart);
const endIndex = content.indexOf(oldClassifierEnd);

if (startIndex === -1 || endIndex === -1) {
  console.error('Could not find classifier bounds!');
  process.exit(1);
}

const newClassifier = `// Student Error Classifier (5-Factor Pedagogical Diagnostics)
const INDO_COMMON_WORDS = new Set([
  'yang', 'dan', 'di', 'ke', 'dari', 'ini', 'itu', 'untuk', 'pada', 'adalah',
  'sebagai', 'dengan', 'bisa', 'tidak', 'ada', 'akan', 'juga', 'sudah', 'saya',
  'mereka', 'kita', 'kami', 'dia', 'kamu', 'apa', 'siapa', 'karena', 'lebih',
  'sangat', 'orang', 'waktu', 'hari', 'rumah', 'jalan', 'tempat', 'cara', 'hidup',
  'keluarga', 'sendiri', 'pilihan', 'selera', 'bebas', 'aman', 'berkuasa', 'timur',
  'barat', 'perbedaan', 'budaya', 'kebiasaan', 'penting', 'berhasil', 'tujuan',
  'karier', 'mendedikasi', 'kualifikasi', 'sopan', 'akurat', 'jeli', 'rute',
  'merelokasi', 'merefleksikan', 'wisata', 'ancaman'
]);

function classifyStudentError(studentAnswer, targetCorrect, evaluationResult, questionPrompt) {
  const ans = String(studentAnswer || '').trim();
  const target = String(targetCorrect || '').trim();
  const prompt = String(questionPrompt || '').trim();

  // 1. Timed Out / Blank
  if (!ans || ans === '[Blank / Timed Out]' || ans === '—' || ans === '-' || ans.toLowerCase() === 'null') {
    return 'timeout';
  }

  // 2. Explicit Evaluation Result from Engine
  const normEval = String(evaluationResult || '').toLowerCase();
  if (normEval === 'minor_word_form_error') {
    return 'word_form';
  }
  if (normEval === 'minor_spelling_error' || normEval === 'partial' || normEval === 'half') {
    return 'spelling';
  }

  const cleanAns = ans.toLowerCase().replace(/[^a-z0-9\\s]/g, '').trim();
  const targetVariants = target.split(/[;,/]/).map(t => t.toLowerCase().replace(/[^a-z0-9\\s]/g, '').trim()).filter(Boolean);

  // 3. Word Form / Part-of-Speech Confusion (Morphological Root Match)
  for (const variant of targetVariants) {
    if (isWordFormAnswerMatch(cleanAns, variant)) {
      return 'word_form';
    }
  }

  // 4. Minor Spelling Error / Typo (1-2 char edit distance)
  for (const variant of targetVariants) {
    const vDist = damerauLevenshtein(cleanAns, variant);
    if (vDist > 0 && vDist <= 2) {
      return 'spelling';
    }
  }

  // 5. Literal Translation (Indonesian Echo or Indonesian Stopword)
  const cleanPrompt = prompt.toLowerCase();
  const promptWords = cleanPrompt.split(/\\s+/).filter(w => w.length >= 3);
  const ansWords = cleanAns.split(/\\s+/);
  const hasIndoWord = ansWords.some(w => INDO_COMMON_WORDS.has(w) || promptWords.includes(w));
  if (hasIndoWord) {
    return 'literal';
  }

  // 6. Vocab Gap (Student produced an unrelated English word or unknown phrase)
  return 'vocab_gap';
}

`;

content = content.slice(0, startIndex) + newClassifier + content.slice(endIndex);

// 3. Update globalErrorDiagCounts
content = content.replace(
  'const globalErrorDiagCounts = { spelling: 0, literal: 0, word_form: 0 };',
  'const globalErrorDiagCounts = { spelling: 0, word_form: 0, vocab_gap: 0, literal: 0 };'
);

// 4. Update qMap[text].diagCounts
content = content.replace(
  'diagCounts: { spelling: 0, literal: 0, word_form: 0 },',
  'diagCounts: { spelling: 0, word_form: 0, vocab_gap: 0, literal: 0 },'
);

// 5. Update dominantError in themeTop20
const oldDominantStr = `      const dc = q.diagCounts;
      let dominantError = 'literal';
      let maxCnt = dc.literal || 0;
      if ((dc.spelling || 0) > maxCnt) { dominantError = 'spelling'; maxCnt = dc.spelling; }
      if ((dc.word_form || 0) > maxCnt) { dominantError = 'word_form'; maxCnt = dc.word_form; }

      const diagLabels = {
        spelling: '[🔤 Spelling]',
        literal: '[🇮🇩 Literal Translation]',
        word_form: '[🔄 Word Form]'
      };`;

const newDominantStr = `      const dc = q.diagCounts;
      let dominantError = 'vocab_gap';
      let maxCnt = dc.vocab_gap || 0;
      if ((dc.spelling || 0) > maxCnt) { dominantError = 'spelling'; maxCnt = dc.spelling; }
      if ((dc.word_form || 0) > maxCnt) { dominantError = 'word_form'; maxCnt = dc.word_form; }
      if ((dc.literal || 0) > maxCnt) { dominantError = 'literal'; maxCnt = dc.literal; }

      const diagLabels = {
        spelling: '[🔤 Spelling]',
        word_form: '[🔄 Word Form]',
        vocab_gap: '[💡 Vocab Gap]',
        literal: '[🇮🇩 Literal Translation]'
      };`;

content = content.replace(oldDominantStr, newDominantStr);

// 6. Update diagPcts
const oldPcts = `  const diagPcts = {
    spelling: Math.round((globalErrorDiagCounts.spelling / totalActiveErrors) * 100),
    literal: Math.round((globalErrorDiagCounts.literal / totalActiveErrors) * 100),
    word_form: Math.round((globalErrorDiagCounts.word_form / totalActiveErrors) * 100)
  };`;

const newPcts = `  const diagPcts = {
    spelling: Math.round((globalErrorDiagCounts.spelling / totalActiveErrors) * 100),
    word_form: Math.round((globalErrorDiagCounts.word_form / totalActiveErrors) * 100),
    vocab_gap: Math.round((globalErrorDiagCounts.vocab_gap / totalActiveErrors) * 100),
    literal: Math.round((globalErrorDiagCounts.literal / totalActiveErrors) * 100)
  };`;

content = content.replace(oldPcts, newPcts);

// 7. Update CSS for chip-vocabgap and diag-pill-vocab_gap
content = content.replace(
  `.tac-diag-chip.chip-literal {
        background: rgba(251, 113, 133, 0.08);
        border-color: rgba(251, 113, 133, 0.25);
        color: #fda4af;
      }`,
  `.tac-diag-chip.chip-literal {
        background: rgba(251, 113, 133, 0.08);
        border-color: rgba(251, 113, 133, 0.25);
        color: #fda4af;
      }
      .tac-diag-chip.chip-vocabgap {
        background: rgba(251, 146, 60, 0.08);
        border-color: rgba(251, 146, 60, 0.25);
        color: #fdba74;
      }`
);

content = content.replace(
  `.diag-pill-literal { background: rgba(251, 113, 133, 0.12); color: #fb7185; border: 1px solid rgba(251, 113, 133, 0.25); }`,
  `.diag-pill-literal { background: rgba(251, 113, 133, 0.12); color: #fb7185; border: 1px solid rgba(251, 113, 133, 0.25); }
      .diag-pill-vocab_gap { background: rgba(251, 146, 60, 0.12); color: #fb923c; border: 1px solid rgba(251, 146, 60, 0.25); }`
);

// 8. Update HTML chips in header
const oldChipsHtml = `          <div class="tac-diag-chips">
            <div class="tac-diag-chip chip-spelling" title="Minor typos and near-matches from typing or speaking">
              <span>🔤</span>
              <span>Spelling:</span>
              <strong>\${globalErrorDiagCounts.spelling} (\${diagPcts.spelling}%)</strong>
            </div>
            <div class="tac-diag-chip chip-literal" title="Literal Indonesian translation, semantic mistake, or incorrect selection">
              <span>🇮🇩</span>
              <span>Literal:</span>
              <strong>\${globalErrorDiagCounts.literal} (\${diagPcts.literal}%)</strong>
            </div>
            <div class="tac-diag-chip chip-wordform" title="Root stem correct, wrong grammatical part of speech">
              <span>🔄</span>
              <span>Word Form:</span>
              <strong>\${globalErrorDiagCounts.word_form} (\${diagPcts.word_form}%)</strong>
            </div>
            <div class="tac-diag-chip chip-timeout" title="Unanswered or timer deadline expired (Session pacing, not student answer)">
              <span>⏳</span>
              <span>Timed Out:</span>
              <strong>\${totalGlobalTimeouts} (Pacing)</strong>
            </div>
          </div>`;

const newChipsHtml = `          <div class="tac-diag-chips">
            <div class="tac-diag-chip chip-spelling" title="Minor typos and acoustic STT near-matches">
              <span>🔤</span>
              <span>Spelling:</span>
              <strong>\${globalErrorDiagCounts.spelling} (\${diagPcts.spelling}%)</strong>
            </div>
            <div class="tac-diag-chip chip-wordform" title="Root stem correct, wrong grammatical part of speech">
              <span>🔄</span>
              <span>Word Form:</span>
              <strong>\${globalErrorDiagCounts.word_form} (\${diagPcts.word_form}%)</strong>
            </div>
            <div class="tac-diag-chip chip-vocabgap" title="Unrelated English vocabulary or unfamiliar phrase">
              <span>💡</span>
              <span>Vocab Gap:</span>
              <strong>\${globalErrorDiagCounts.vocab_gap} (\${diagPcts.vocab_gap}%)</strong>
            </div>
            <div class="tac-diag-chip chip-literal" title="Literal Indonesian translation or prompt echo">
              <span>🇮🇩</span>
              <span>Literal:</span>
              <strong>\${globalErrorDiagCounts.literal} (\${diagPcts.literal}%)</strong>
            </div>
            <div class="tac-diag-chip chip-timeout" title="Unanswered or timer deadline expired (Session pacing, not student answer)">
              <span>⏳</span>
              <span>Timed Out:</span>
              <strong>\${totalGlobalTimeouts} (Pacing)</strong>
            </div>
          </div>`;

content = content.replace(oldChipsHtml, newChipsHtml);

fs.writeFileSync(filePath, content, 'utf8');
console.log('tests-management.js updated for Phase 222 (5-Factor Diagnostics)!');

