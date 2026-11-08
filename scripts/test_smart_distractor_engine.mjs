// TOPSCORE LMS — Test Suite: Vault Intelligent Distractor Selection Engine (Phase 357)
// Verifies semantic topic matching, part-of-speech parity, length parity,
// lexical overlap, strict anti-leak filtering, and 5-option MCQ standardization.

import { scoreDistractorSimilarity, rankDistractorsForVaultItem } from '../js/grading.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

console.log('=== TEST SUITE: VAULT INTELLIGENT DISTRACTOR SELECTION ENGINE ===\n');

// -------------------------------------------------------------
// 1. Topic & Theme Proximity Priority
// -------------------------------------------------------------
console.log('--- 1. Testing Topic & Theme Proximity Priority ---');

const targetMedicalWord = {
  id: 'vault-1',
  english: 'stethoscope',
  indonesian: 'stetoskop',
  word_type: 'Noun',
  topic: 'Medical Equipment',
  topic_code: 'MED_EQ',
  theme: 'Health & Science',
  theme_code: 'HEALTH',
  category: 'words',
  target_level: 2
};

const candSameTopic = {
  id: 'cand-1',
  english: 'thermometer',
  indonesian: 'termometer',
  word_type: 'Noun',
  topic: 'Medical Equipment',
  topic_code: 'MED_EQ',
  theme: 'Health & Science',
  theme_code: 'HEALTH',
  category: 'words',
  target_level: 2
};

const candDiffTopicSameTheme = {
  id: 'cand-2',
  english: 'prescription',
  indonesian: 'resep obat',
  word_type: 'Noun',
  topic: 'Pharmacy',
  topic_code: 'PHARM',
  theme: 'Health & Science',
  theme_code: 'HEALTH',
  category: 'words',
  target_level: 2
};

const candCompletelyUnrelated = {
  id: 'cand-3',
  english: 'helicopter',
  indonesian: 'helikopter',
  word_type: 'Noun',
  topic: 'Aviation',
  topic_code: 'AVIA',
  theme: 'Transportation',
  theme_code: 'TRANS',
  category: 'words',
  target_level: 2
};

const scoreSameTopic = scoreDistractorSimilarity(targetMedicalWord, candSameTopic);
const scoreSameTheme = scoreDistractorSimilarity(targetMedicalWord, candDiffTopicSameTheme);
const scoreUnrelated = scoreDistractorSimilarity(targetMedicalWord, candCompletelyUnrelated);

console.log(`  Scores -> Same Topic: ${scoreSameTopic.toFixed(1)} | Same Theme: ${scoreSameTheme.toFixed(1)} | Unrelated: ${scoreUnrelated.toFixed(1)}`);
assert(scoreSameTopic > scoreSameTheme, 'Same Topic score is higher than Different Topic (Same Theme)');
assert(scoreSameTheme > scoreUnrelated, 'Same Theme score is higher than Completely Unrelated Topic');

// -------------------------------------------------------------
// 2. Part-of-Speech / Word Type Match Priority
// -------------------------------------------------------------
console.log('\n--- 2. Testing Part of Speech / Word Type Priority ---');

const targetVerb = {
  id: 'vault-verb-1',
  english: 'prescribe',
  indonesian: 'meresepkan',
  word_type: 'Verb',
  topic: 'Medical Procedures',
  category: 'words'
};

const candVerb = {
  id: 'cand-v',
  english: 'diagnose',
  indonesian: 'mendiagnosis',
  word_type: 'Verb',
  topic: 'Medical Procedures',
  category: 'words'
};

const candNoun = {
  id: 'cand-n',
  english: 'hospital',
  indonesian: 'rumah sakit',
  word_type: 'Noun',
  topic: 'Medical Procedures',
  category: 'words'
};

const scoreVerbMatch = scoreDistractorSimilarity(targetVerb, candVerb);
const scoreNounMismatch = scoreDistractorSimilarity(targetVerb, candNoun);

console.log(`  Scores -> Verb: ${scoreVerbMatch.toFixed(1)} | Noun: ${scoreNounMismatch.toFixed(1)}`);
assert(scoreVerbMatch > scoreNounMismatch, 'Verb candidate ranks significantly higher than Noun candidate for a target Verb');

// -------------------------------------------------------------
// 3. Structural & Word Count Parity (Phrases & Single Words)
// -------------------------------------------------------------
console.log('\n--- 3. Testing Structural & Word Count Parity ---');

const targetPhrase5Words = {
  id: 'vault-ph-1',
  english: 'take charge of the emergency',
  indonesian: 'mengambil alih kendali situasi darurat',
  word_type: 'Phrase',
  topic: 'Leadership & Crisis',
  category: 'phrases'
};

const cand5Words = {
  id: 'cand-5w',
  english: 'take control of the incident',
  indonesian: 'mengambil kendali atas insiden tersebut',
  word_type: 'Phrase',
  topic: 'Leadership & Crisis',
  category: 'phrases'
};

const cand2Words = {
  id: 'cand-2w',
  english: 'step in',
  indonesian: 'turun tangan',
  word_type: 'Phrase',
  topic: 'Leadership & Crisis',
  category: 'phrases'
};

const score5W = scoreDistractorSimilarity(targetPhrase5Words, cand5Words);
const score2W = scoreDistractorSimilarity(targetPhrase5Words, cand2Words);

console.log(`  Phrase Scores -> 5 Words: ${score5W.toFixed(1)} | 2 Words: ${score2W.toFixed(1)}`);
assert(score5W > score2W, 'Exact word count match (+20 pts) scores higher than 2-word phrase');

// -------------------------------------------------------------
// 4. Lexical Overlap & Collocation / Particle Match
// -------------------------------------------------------------
console.log('\n--- 4. Testing Lexical / Particle Overlap ---');

const targetPhrasalVerb = {
  id: 'vault-pv',
  english: 'turn down',
  indonesian: 'menolak',
  word_type: 'Phrase',
  topic: 'Offers & Negotiations',
  category: 'phrases'
};

const candSharedHead = {
  id: 'cand-sh',
  english: 'turn up',
  indonesian: 'tiba atau muncul',
  word_type: 'Phrase',
  topic: 'Offers & Negotiations',
  category: 'phrases'
};

const candNoOverlap = {
  id: 'cand-no',
  english: 'give away',
  indonesian: 'memberikan cuma-cuma',
  word_type: 'Phrase',
  topic: 'Offers & Negotiations',
  category: 'phrases'
};

const scoreSharedHead = scoreDistractorSimilarity(targetPhrasalVerb, candSharedHead);
const scoreNoOverlap = scoreDistractorSimilarity(targetPhrasalVerb, candNoOverlap);

console.log(`  Scores -> Shared "turn": ${scoreSharedHead.toFixed(1)} | "give away": ${scoreNoOverlap.toFixed(1)}`);
assert(scoreSharedHead > scoreNoOverlap, 'Shared head-verb "turn" scores higher than completely different head-verb');

// -------------------------------------------------------------
// 5. Strict Anti-Leak & Safety Guards
// -------------------------------------------------------------
console.log('\n--- 5. Testing Anti-Leak & Safety Guards ---');

const targetMultiVariant = {
  id: 'target-slash',
  english: 'shut down / close / terminate',
  indonesian: 'menutup atau mematikan',
  word_type: 'Verb',
  topic: 'Business Operations',
  category: 'words'
};

const simulatedPool = [
  { id: 'leak-1', english: 'shut down', indonesian: 'menutup', word_type: 'Verb', topic: 'Business Operations', category: 'words' },
  { id: 'leak-2', english: 'close', indonesian: 'tutup', word_type: 'Verb', topic: 'Business Operations', category: 'words' },
  { id: 'leak-3', english: 'terminate', indonesian: 'mengakhiri', word_type: 'Verb', topic: 'Business Operations', category: 'words' },
  { id: 'leak-4', english: 'ShUt DoWn', indonesian: 'menutup', word_type: 'Verb', topic: 'Business Operations', category: 'words' },
  { id: 'leak-5', english: 'halt', indonesian: 'menutup atau mematikan', word_type: 'Verb', topic: 'Business Operations', category: 'words' }, // Same Indonesian translation
  { id: 'leak-6', english: 'break the ice', indonesian: 'mencairkan suasana', word_type: 'Phrase', topic: 'Business Operations', category: 'phrases' }, // Cross-category phrase vs word
  { id: 'valid-1', english: 'liquidate', indonesian: 'melikuidasi', word_type: 'Verb', topic: 'Business Operations', category: 'words' },
  { id: 'valid-2', english: 'suspend', indonesian: 'menangguhkan', word_type: 'Verb', topic: 'Business Operations', category: 'words' },
  { id: 'valid-3', english: 'restructure', indonesian: 'merestrukturisasi', word_type: 'Verb', topic: 'Business Operations', category: 'words' },
  { id: 'valid-4', english: 'downsize', indonesian: 'merampingkan', word_type: 'Verb', topic: 'Business Operations', category: 'words' },
  { id: 'valid-5', english: 'merge', indonesian: 'menggabungkan', word_type: 'Verb', topic: 'Business Operations', category: 'words' },
];

const selectedDistractors = rankDistractorsForVaultItem(targetMultiVariant, simulatedPool, 4);
console.log('  Selected Distractors:', selectedDistractors);

assert(selectedDistractors.length === 4, 'Selected exactly 4 distractors');
assert(!selectedDistractors.includes('shut down'), 'Anti-leak: Primary English translation excluded');
assert(!selectedDistractors.includes('close'), 'Anti-leak: Slash synonym variant excluded');
assert(!selectedDistractors.includes('terminate'), 'Anti-leak: Secondary slash synonym variant excluded');
assert(!selectedDistractors.includes('halt'), 'Anti-leak: Candidate with matching Indonesian translation excluded');
assert(!selectedDistractors.includes('break the ice'), 'Category Isolation: Phrases never chosen for Words questions');
assert(new Set(selectedDistractors).size === 4, 'All 4 chosen distractors are unique (no duplicates)');

// -------------------------------------------------------------
// 6. 5-Option MCQ Composition & Formatting
// -------------------------------------------------------------
console.log('\n--- 6. Testing 5-Option MCQ Standardization ---');

const primaryAnswer = targetMultiVariant.english.split('/')[0].trim();
const fullOptions = [primaryAnswer, ...selectedDistractors];

assert(fullOptions.length === 5, 'Standard MCQ generates exactly 5 options (1 correct + 4 distractors)');
assert(fullOptions.includes(primaryAnswer), 'MCQ options contain the correct answer');
assert(new Set(fullOptions).size === 5, 'All 5 MCQ options are distinct');

// -------------------------------------------------------------
// 7. Small Pool Graceful Degradation
// -------------------------------------------------------------
console.log('\n--- 7. Testing Small Pool Fallback Resilience ---');

const smallPool = [
  { id: 'sp-1', english: 'liquidate', indonesian: 'melikuidasi', word_type: 'Verb', topic: 'Business Operations', category: 'words' },
  { id: 'sp-2', english: 'suspend', indonesian: 'menangguhkan', word_type: 'Verb', topic: 'Business Operations', category: 'words' }
];

const smallDistractors = rankDistractorsForVaultItem(targetMultiVariant, smallPool, 4);
console.log('  Small Pool Distractors:', smallDistractors);
assert(smallDistractors.length === 2, 'Gracefully returns all available valid candidates when pool < 4 without throwing');

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log(`\n========================================`);
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log(`========================================`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('All Smart Distractor Engine tests passed successfully!\n');
}
