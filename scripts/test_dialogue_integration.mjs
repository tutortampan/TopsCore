// Setup browser mocks before importing client modules
if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    location: { href: '', search: '', pathname: '/', hostname: 'localhost' },
    addEventListener: () => {},
    removeEventListener: () => {}
  };
  globalThis.sessionStorage = {
    getItem: (k) => k === 'topscore_session' ? JSON.stringify({ student_id: 'test_std', student_name: 'Top' }) : null,
    setItem: () => {},
    removeItem: () => {}
  };
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  };
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  globalThis.document = {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {}
  };
}

import assert from 'node:assert';
const { isDialogueTest, getTestLaunchUrl } = await import('../js/dashboard.js');

console.log('🧪 Testing Dialogue Room Integration (Module M7)...');

// Test 1: isDialogueTest detection signatures
console.log('--- Test 1: Dialogue Module Detection Signatures ---');
assert.strictEqual(isDialogueTest({ module_id: 'c590c69f-44dc-4d26-9c19-263c6e7cbbec' }), true, 'Should detect by module_id');
assert.strictEqual(isDialogueTest({ shell_code: '2A-SPEAK-DIAL' }), true, 'Should detect by shell_code ending with -DIAL');
assert.strictEqual(isDialogueTest({ shell_code: '3B-M7-TASK' }), true, 'Should detect by shell_code containing -M7-');
assert.strictEqual(isDialogueTest({ test_subtype: 'DIALOGUE' }), true, 'Should detect by test_subtype DIALOGUE');
assert.strictEqual(isDialogueTest({ test_subtype: 'TURN_BASED_ROLEPLAY' }), true, 'Should detect by test_subtype ROLEPLAY');
assert.strictEqual(isDialogueTest({ module_code: 'm7' }), true, 'Should detect by module_code m7');
assert.strictEqual(isDialogueTest({ answer_type: 'dialogue' }), true, 'Should detect by answer_type dialogue');
assert.strictEqual(isDialogueTest({ payload: { module_type: 'TURN_BASED_ROLEPLAY' } }), true, 'Should detect by payload module_type');
assert.strictEqual(isDialogueTest({ title: 'P2P Dialogue Room Practice' }), true, 'Should detect by title');

// Negative tests: standard tests must NOT be flagged as dialogue
assert.strictEqual(isDialogueTest({ shell_code: '1G1-WORDS-TASK', module_id: '4a57ae11-9e60-461f-969a-0c4ba7981681' }), false, 'Words task should not be dialogue');
assert.strictEqual(isDialogueTest({ shell_code: '2D-PHRASES-EXAM' }), false, 'Phrases exam should not be dialogue');
assert.strictEqual(isDialogueTest(null), false, 'Null test should return false');
console.log('  ✅ PASS: All 9 Dialogue signatures recognized; non-dialogue tests unaffected.');

// Test 2: getTestLaunchUrl routing
console.log('--- Test 2: Test Launch URL Resolution ---');
const dialTest = {
  id: 'test-dial-123',
  class_id: 'class-conv-456',
  title: 'Workplace Negotiation Dialogue',
  module_code: 'm7'
};
const standardTest = {
  id: 'test-std-789',
  class_id: 'class-vocab-001',
  title: '1st Vocabulary Words Task'
};

const dialUrlNoRoom = getTestLaunchUrl(dialTest);
assert.ok(dialUrlNoRoom.startsWith('conversation.html?test_id=test-dial-123'), 'Dialogue test should route to conversation.html');
assert.ok(dialUrlNoRoom.includes('class_id=class-conv-456'), 'Should include class_id in URL');
assert.ok(dialUrlNoRoom.includes('title=Workplace%20Negotiation%20Dialogue'), 'Should include encoded title in URL');

const activeSession = { dialogue_room_code: 'DIAL-9988' };
const dialUrlWithRoom = getTestLaunchUrl(dialTest, activeSession);
assert.ok(dialUrlWithRoom.includes('&room=DIAL-9988'), 'Should append room code if active in test session');

const stdUrl = getTestLaunchUrl(standardTest);
assert.strictEqual(stdUrl, 'test.html?id=test-std-789', 'Standard test should route to test.html');
console.log('  ✅ PASS: URL resolution properly directs M7 to conversation.html and standard to test.html.');

console.log('\n🎉 ALL DIALOGUE INTEGRATION TESTS PASSED 100%!');
process.exit(0);
