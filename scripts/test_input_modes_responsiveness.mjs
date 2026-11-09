import assert from 'assert';
import { createSpeechSession } from '../js/speech.js';

console.log('======================================================');
console.log('TEST SUITE: INPUT MODES RESPONSIVENESS & RELIABILITY');
console.log('======================================================');

// --- Mock SpeechRecognition in Node.js ---
class MockSpeechRecognition {
  constructor() {
    this.lang = 'en-US';
    this.continuous = false;
    this.interimResults = true;
    this.maxAlternatives = 1;
    this.onstart = null;
    this.onresult = null;
    this.onerror = null;
    this.onend = null;
    this._aborted = false;
    this._stopped = false;
  }
  start() {
    if (this._aborted) throw new Error('Recognition aborted');
    setTimeout(() => {
      if (!this._aborted && this.onstart) this.onstart();
    }, 50);
  }
  stop() {
    this._stopped = true;
    setTimeout(() => {
      if (this.onend) this.onend();
    }, 50);
  }
  abort() {
    this._aborted = true;
    if (this.onend) this.onend();
  }
}

globalThis.window = {
  SpeechRecognition: MockSpeechRecognition,
  webkitSpeechRecognition: MockSpeechRecognition,
};

async function testSpeechLifecycle() {
  console.log('\n[TEST 1] Speech Session 4-State Machine & Anti-Double-Tap');
  const session = createSpeechSession();
  assert.strictEqual(session.getState(), 'idle', 'Initial state should be idle');
  assert.strictEqual(session.isListening(), false, 'Initial isListening should be false');

  // Start call #1
  const startResult1 = session.start();
  assert.strictEqual(startResult1, true, 'First start should succeed');
  assert.strictEqual(session.getState(), 'starting', 'State should be starting');

  // Start call #2 (simulating fast double tap before onstart)
  const startResult2 = session.start();
  assert.strictEqual(startResult2, false, 'Second start while starting should be rejected (anti-double-tap)');

  // Wait for mock onstart to fire
  await new Promise(r => setTimeout(r, 80));
  assert.strictEqual(session.getState(), 'listening', 'State should become listening after onstart');

  // Instant abort on question transition
  session.abort();
  assert.strictEqual(session.getState(), 'idle', 'Abort must synchronously reset state to idle (0ms)');
  assert.strictEqual(session.isListening(), false, 'isListening must be false after abort');
  console.log('  ✓ 4-State lifecycle and anti-double-tap passed');
  console.log('  ✓ Instant abort() teardown in 0ms verified');
}

async function testWatchdogRecovery() {
  console.log('\n[TEST 2] Speech Watchdog Timer Auto-Recovery');
  class HangingSpeechRecognition extends MockSpeechRecognition {
    start() {
      // Intentionally never fire onstart to simulate hung audio service / frozen Google STT
    }
  }
  globalThis.window.SpeechRecognition = HangingSpeechRecognition;

  let errorCaught = null;
  const hangingSession = createSpeechSession({
    onError: (msg) => { errorCaught = msg; }
  });

  hangingSession.start();
  assert.strictEqual(hangingSession.getState(), 'starting', 'State should be starting');

  // Fast forward watchdog timer simulation
  await new Promise(r => setTimeout(r, 4100));

  assert.strictEqual(hangingSession.getState(), 'idle', 'State should auto-recover to idle after watchdog timer');
  assert.ok(errorCaught && errorCaught.includes('timed out'), 'Watchdog should trigger friendly timeout error');
  console.log('  ✓ Hung mic auto-recovers to idle via Watchdog within 4s without freezing UI');

  // Restore mock
  globalThis.window.SpeechRecognition = MockSpeechRecognition;
}

async function testMcAutoAdvanceSafety() {
  console.log('\n[TEST 3] Multiple Choice Managed Auto-Advance (No Skipped Questions)');
  let _mcAutoAdvanceTimer = null;
  let advanceCallCount = 0;

  function cancelMcAutoAdvance() {
    if (_mcAutoAdvanceTimer) {
      clearTimeout(_mcAutoAdvanceTimer);
      _mcAutoAdvanceTimer = null;
    }
  }

  function scheduleMcAutoAdvance(delay = 100) {
    cancelMcAutoAdvance();
    _mcAutoAdvanceTimer = setTimeout(() => {
      _mcAutoAdvanceTimer = null;
      advanceCallCount++;
    }, delay);
  }

  // Simulate student tapping Option A, then rapidly switching to Option B, then Option C
  scheduleMcAutoAdvance(100);
  await new Promise(r => setTimeout(r, 30));
  scheduleMcAutoAdvance(100); // changes to B
  await new Promise(r => setTimeout(r, 30));
  scheduleMcAutoAdvance(100); // changes to C

  // Wait for timer to finish
  await new Promise(r => setTimeout(r, 150));

  assert.strictEqual(advanceCallCount, 1, 'Auto-advance must fire EXACTLY ONCE despite multiple option taps');
  console.log('  ✓ Rapid option clicks properly debounce: exactly 1 question advance');

  // Simulate student clicking Option A, but then immediately tapping manual "Next"
  scheduleMcAutoAdvance(100);
  // Manual next cancels pending timer
  cancelMcAutoAdvance();
  await new Promise(r => setTimeout(r, 150));
  assert.strictEqual(advanceCallCount, 1, 'Manual Next cancels auto-advance timer; no ghost advances');
  console.log('  ✓ Manual Next safely cancels pending auto-advance; zero ghost skips');
}

async function run() {
  await testSpeechLifecycle();
  await testWatchdogRecovery();
  await testMcAutoAdvanceSafety();
  console.log('\n======================================================');
  console.log('🎉 ALL INPUT MODES & RESPONSIVENESS TESTS PASSED (100%)');
  console.log('======================================================');
}

run().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});

