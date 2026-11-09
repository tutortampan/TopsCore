import assert from 'assert';

console.log('=== TESTING PAIRED EXAM REMEDIAL SYNCHRONIZATION LOGIC ===\n');

// Mock exams for Theme B
const mockClassTests = [
  { id: 'asm-1', title: '3rd Vocab B Words Exam', shell_code: '3B-WORDS-EXAM', test_type: 'exam', payload: { theme_code: 'B' } },
  { id: 'asm-2', title: '3rd Vocab B Phrases Exam', shell_code: '3B-PHRASES-EXAM', test_type: 'exam', payload: { theme_code: 'B' } },
];

function isWeeklyExam(t) {
  return (t.shell_code || '').includes('EXAM');
}

function simulateSync(asmScores) {
  const themeExamMap = {};
  mockClassTests.filter(isWeeklyExam).forEach(asm => {
    const rawTheme = asm.payload?.theme_code || (asm.shell_code ? asm.shell_code.replace(/^[0-9]+/, '').charAt(0) : 'A');
    const tc = (rawTheme || 'A').toUpperCase();
    if (!themeExamMap[tc]) themeExamMap[tc] = [];
    themeExamMap[tc].push(asm);
  });

  Object.values(themeExamMap).forEach(asms => {
    if (asms.length < 2) return;
    const hasThemeRem = asms.some(asm => {
      const att = asmScores[asm.id];
      return Boolean(att?.is_remedial_unlocked || att?.is_remedial);
    });
    if (hasThemeRem) {
      asms.forEach(asm => {
        const att = asmScores[asm.id];
        if (att) {
          att.is_remedial_unlocked = true;
          att.is_remedial = true;
        }
      });
    }
  });

  return asmScores;
}

// Test Case 1: Words Remedial (e.g. Asmul Kholid), Phrases initially Normal
console.log('Test 1: Words remedial + Phrases normal');
const scores1 = {
  'asm-1': { id: 'att-1', score: 168, total_questions: 280, is_remedial_unlocked: true, is_remedial: true },
  'asm-2': { id: 'att-2', score: 70, total_questions: 70, is_remedial_unlocked: false, is_remedial: false }
};
simulateSync(scores1);
assert.strictEqual(scores1['asm-1'].is_remedial_unlocked, true);
assert.strictEqual(scores1['asm-2'].is_remedial_unlocked, true);
console.log('  ✓ Phrases Exam was correctly synchronized to remedial status!');

// Test Case 2: Phrases Remedial, Words initially Normal
console.log('Test 2: Phrases remedial + Words normal');
const scores2 = {
  'asm-1': { id: 'att-1', score: 250, total_questions: 280, is_remedial_unlocked: false, is_remedial: false },
  'asm-2': { id: 'att-2', score: 40, total_questions: 70, is_remedial_unlocked: true, is_remedial: true }
};
simulateSync(scores2);
assert.strictEqual(scores2['asm-1'].is_remedial_unlocked, true);
assert.strictEqual(scores2['asm-2'].is_remedial_unlocked, true);
console.log('  ✓ Words Exam was correctly synchronized to remedial status!');

// Test Case 3: Both Normal
console.log('Test 3: Both normal');
const scores3 = {
  'asm-1': { id: 'att-1', score: 260, total_questions: 280, is_remedial_unlocked: false, is_remedial: false },
  'asm-2': { id: 'att-2', score: 68, total_questions: 70, is_remedial_unlocked: false, is_remedial: false }
};
simulateSync(scores3);
assert.strictEqual(scores3['asm-1'].is_remedial_unlocked, false);
assert.strictEqual(scores3['asm-2'].is_remedial_unlocked, false);
console.log('  ✓ Both normal exams correctly remained normal!');

console.log('\nALL 3 LOGIC TESTS PASSED WITH 100% ACCURACY!');

