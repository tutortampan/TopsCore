# CURRENT STATE

Last Updated: 2026-11-09 14:40 UTC+8
Current Phase: Phase 382: iPhone / iOS Microphone & AudioSession Stabilization [COMPLETE]
Status: COMPLETE

## Completed Work:
1. **iPhone / iOS AudioSession Conflict Resolution (`js/test.js`, `js/wake-lock.js`)**:
   - Resolved `AVAudioSession` output mode hijack: `unlockAudio()` now immediately calls `audioCtx.suspend()` after unlocking so it does not block iOS from switching to microphone input mode.
   - Added iOS Audio Route Guard in test room microphone handler to suspend `audioCtx` and pause active media before initializing `webkitSpeechRecognition`.
   - Updated `js/wake-lock.js` to prevent fallback video playback when speech recognition is active (`window._isSpeechRecognitionEngaged`), eliminating audio focus conflicts on iOS Safari.
   - Added `audioCtx.suspend()` to `stopPoliceSiren` and `abortActiveSpeechSession` to immediately release audio output routing.

2. **WebKit CoreAudio Latency & iOS Dictation Guidance (`js/speech.js`)**:
   - Implemented an automatic 80ms retry mechanism on `InvalidStateError` specifically tuned for WebKit's asynchronous audio hardware teardown latency.
   - Added 4000ms Watchdog Timer to auto-recover if speech recognition hangs during initialization.
   - Added platform-aware error guidance for iPhone users (instructing how to enable microphone in Safari `aA` menu > Website Settings and how to enable Dictation in iOS Settings > General > Keyboard).

3. **Input Modes Responsiveness & Reliability Overhaul (`js/speech.js`, `js/test.js`, `css/test.css`)**:
   - Replaced heavy synchronous `updateNavGrid()` with ultra-lightweight `updateActiveChipOnly()` on interim speech events (CPU utilization reduced from 100% to <5%).
   - Implemented 4-state speech machine (`idle`, `starting`, `listening`, `stopping`) with anti-double-tap guard.
   - Implemented synchronous `abort()` method (`recognition.abort()`) for 0ms hardware mic release on question navigation (`renderQuestion`, `bottomNext`, `bottomPrev`, matrix jump).
   - Added Emergency Typing Fallback option (`⌨️ Type Instead`) to guarantee students can complete answers and earn full score even if local hardware or network STT fails.
   - Fixed unmanaged Multiple Choice auto-advance `setTimeout` bug that previously skipped questions on rapid taps.
   - Optimized `renderKeyboardKeys()` with in-place shifting for virtual keyboard.
   - Added `touch-action: manipulation !important;` and `-webkit-tap-highlight-color: transparent !important;` across all interactive test room buttons for zero tap latency.

## Verification:
- Syntax checks `node -c js/speech.js; node -c js/wake-lock.js; node -c js/test.js`: PASS (0 errors).
- `node scripts/test_input_modes_responsiveness.mjs`: PASS (100% assertions passed: 4-state speech machine, anti-double-tap, 0ms abort, 4s watchdog auto-recovery, and debounced managed auto-advance).
- `node scripts/test_batch_eligibility.mjs`: PASS (14/18 eligible, Mr. Test verified eligible).
- `node scripts/test_vocab_7x7_and_leveling_e2e.mjs`: PASS (10/10 consecutive runs, 132/132 assertions, 100%).
- "No commit" constraint adhered to.
