import { createClient } from '@supabase/supabase-js';
import { isWordFormAnswerMatch, damerauLevenshtein } from '../js/grading.js';

const SUPABASE_URL = 'https://oclajpyumehpojepcczg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

function classify5Factor(studentAnswer, targetCorrect, evaluationResult, questionPrompt) {
  const ans = String(studentAnswer || '').trim();
  const target = String(targetCorrect || '').trim();
  const prompt = String(questionPrompt || '').trim();

  // 1. Timeout / Blank
  if (!ans || ans === '[Blank / Timed Out]' || ans === '—' || ans === '-' || ans.toLowerCase() === 'null') {
    return 'timeout';
  }

  const normEval = String(evaluationResult || '').toLowerCase();
  if (normEval === 'minor_word_form_error') return 'word_form';
  if (normEval === 'minor_spelling_error') return 'spelling';

  const cleanAns = ans.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const targetVariants = target.split(/[;,/]/).map(t => t.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()).filter(Boolean);

  // 2. Word Form
  for (const variant of targetVariants) {
    if (isWordFormAnswerMatch(cleanAns, variant)) {
      return 'word_form';
    }
  }

  // 3. Spelling / Acoustic typo (1-2 char diff)
  for (const variant of targetVariants) {
    const vDist = damerauLevenshtein(cleanAns, variant);
    if (vDist > 0 && vDist <= 2) {
      return 'spelling';
    }
  }

  // 4. Literal Translation (Indonesian words or echo from prompt)
  const cleanPrompt = prompt.toLowerCase();
  const promptWords = cleanPrompt.split(/\s+/).filter(w => w.length >= 3);
  const ansWords = cleanAns.split(/\s+/);

  const hasIndoWord = ansWords.some(w => INDO_COMMON_WORDS.has(w) || promptWords.includes(w));
  if (hasIndoWord) {
    return 'literal';
  }

  // 5. Vocab Gap (Unrelated English word or unfamiliar idiom)
  return 'vocab_gap';
}

console.log('Testing 5-factor classification on sample active errors...');

// Fetch some wrong answers from Supabase
const { data: wrongAnswers } = await supabase
  .from('attempt_answers')
  .select('student_answer, correct_answer_snapshot, question_snapshot, evaluation_result')
  .eq('is_correct', false)
  .not('student_answer', 'is', null)
  .neq('student_answer', '')
  .neq('student_answer', '[Blank / Timed Out]')
  .limit(200);

const counts = { word_form: 0, spelling: 0, literal: 0, vocab_gap: 0, timeout: 0 };
const samples = { word_form: [], spelling: [], literal: [], vocab_gap: [] };

(wrongAnswers || []).forEach(a => {
  const ans = a.student_answer;
  const target = a.correct_answer_snapshot || a.question_snapshot?.correct_answer;
  const prompt = a.question_snapshot?.question_text;
  const cat = classify5Factor(ans, target, a.evaluation_result, prompt);
  counts[cat] = (counts[cat] || 0) + 1;
  if (samples[cat] && samples[cat].length < 3) {
    samples[cat].push({ ans, target, prompt });
  }
});

console.log('Counts:', counts);
console.log('\nSamples:');
console.log('Word Form:', samples.word_form);
console.log('Spelling:', samples.spelling);
console.log('Literal:', samples.literal);
console.log('Vocab Gap:', samples.vocab_gap);

