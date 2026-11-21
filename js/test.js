import { generateAvatarDataUri } from './utils/avatar-engine.js?v=20261106_v160';
/**
 * TopsCore — Test Engine Module
 * Extracted from test.html
 */

import { startTest, saveAnswer, submitTest, logCheatingEvent, getServerTimeWita, checkAndTriggerLevelUp, getSecuritySettings } from './api.js?v=20261117_v549';
    import { requireStudentSession } from './session.js?v=20261106_v160';
    import { showToast, showLoading, hideLoading, formatTime, escapeHtml, escHtml } from './app.js?v=20261106_v160';
    import { startCountdown, isExpired } from './timer.js?v=20261106_v160';
    import { createSpeechSession, isSpeechSupported } from './speech.js?v=20261106_v160';
    import { SUPABASE_URL, SUPABASE_ANON_KEY, getSupabase } from './supabase.js?v=20261106_v160';
    import { requestScreenWakeLock, releaseScreenWakeLock, bindWakeLockGestures, getWakeLockStatus } from './wake-lock.js?v=20261106_v160';
import { getSvgIcon } from './svg-icons.js?v=20261114_v487';
import { formatTestDisplay, isExam, validateDescriptionSentence } from './grading.js?v=20261106_v160';

    // Arm wake lock gestures on first interaction
    bindWakeLockGestures();
    window.getWakeLockStatus = getWakeLockStatus;
    window.requestScreenWakeLock = requestScreenWakeLock;
    window.releaseScreenWakeLock = releaseScreenWakeLock;

    // escapeHtml / escHtml imported canonically
    window.escapeHtml = escapeHtml;

    window.openSubmitModal = openSubmitModal;

    const session = requireStudentSession();
    if (!session) throw new Error('Not authenticated');

    const urlParams = new URLSearchParams(window.location.search);
    // Case-insensitive test ID extraction — resilient across all URL param casings
    let testId = urlParams.get('id') ||
                       urlParams.get('test_id') ||
                       urlParams.get('Test_id') ||
                       urlParams.get('TEST_id') ||
                       sessionStorage.getItem('topscore_test_id') ||
                       sessionStorage.getItem('topscore_TEST_id');

    if (testId === 'test-test-id') {
      sessionStorage.removeItem('topscore_test_id');
      sessionStorage.removeItem('topscore_TEST_id');
      testId = urlParams.get('id') || urlParams.get('test_id');
    }

    if (testId) {
      // Normalize to lowercase key for consistency going forward
      sessionStorage.setItem('topscore_test_id', testId);
    }
    if (urlParams.get('attempt_id')) {
      sessionStorage.setItem('topscore_attempt_id', urlParams.get('attempt_id'));
    }
    if (!testId) {
      console.warn('No valid test ID found. Redirecting to dashboard.');
      window.location.href = 'dashboard.html';
    }

    let currentIndex = 0;
    let allAnswerRows = [];
    let answerRows = [];
    let testsections = [];
    let currentSectionIndex = 0;
    let attemptData = null;
    let testData = null;
    let testDisplayName = '';
    let timerController = null;
    let answeredMap = {}; // attempt_answer_id -> student_answer
    window.answeredMap = answeredMap;
    let requestedSection = (urlParams.get('section') || urlParams.get('part') || '').toLowerCase();

    // —— Global Speech Session & Auto-Advance Controllers ——
    let currentActiveSpeechSession = null;
    let _mcAutoAdvanceTimer = null;

    // In-Browser Camera & Media State (Zero Supabase Storage Egress per DECISION-054)
    window._activeCameraStream = null;
    window._capturedPhotos = window._capturedPhotos || {};

    function stopActiveCameraStream() {
      if (window._activeCameraStream) {
        try {
          window._activeCameraStream.getTracks().forEach(t => t.stop());
        } catch (_) {}
        window._activeCameraStream = null;
      }
    }

    function abortActiveSpeechSession() {
      stopActiveCameraStream();
      if (currentActiveSpeechSession) {
        try { currentActiveSpeechSession.abort(); } catch (_) {}
        currentActiveSpeechSession = null;
      }
      window._isSpeechRecognitionEngaged = false;
      // Release iOS AVAudioSession from any active AudioContext output lock
      if (audioCtx && audioCtx.state === 'running') {
        try { audioCtx.suspend().catch(() => {}); } catch (_) {}
      }
    }

    function cancelMcAutoAdvance() {
      if (_mcAutoAdvanceTimer) {
        clearTimeout(_mcAutoAdvanceTimer);
        _mcAutoAdvanceTimer = null;
      }
    }

    function scheduleMcAutoAdvance(delay = 400) {
      cancelMcAutoAdvance();
      _mcAutoAdvanceTimer = setTimeout(() => {
        _mcAutoAdvanceTimer = null;
        const nextBtn = document.getElementById('bottom-next-btn');
        if (nextBtn && nextBtn.textContent.includes('Next') && !nextBtn.disabled) {
          nextBtn.click();
        }
      }, delay);
    }

    // —— Anti-Cheat State & Multi-Sound Alert Engine ——
    let isTestActive = false;
    let cheatInterval = null;
    let audioCtx = null;
    let _activeOscNodes = []; // track all active oscillator/source nodes for clean stop
    let _activeGainNodes = [];
    let _activeAudioSource = null; // for custom audio buffer source
    let securityConfig = { enabled: true, soundEnabled: true, countdownSeconds: 10, soundType: 'police_siren', customSoundB64: '' };

    // Mobile Audio Unlock on first interaction (iOS / Android Safe)
    // Strictly lazy: do NOT instantiate AudioContext until an anti-cheat siren or tone is explicitly needed!
    const unlockAudio = () => {
      // AudioContext pre-allocation eliminated to keep iOS AVAudioSession free for microphone
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
    document.addEventListener('click', unlockAudio, { once: true, passive: true });
    document.addEventListener('touchstart', unlockAudio, { once: true, passive: true });

    // ─── Sound Engine Helpers ──────────────────────────────────────
    function _getCtx() {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      return audioCtx;
    }

    function _makeOsc(type, freq, gainVal, ctx) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      g.gain.value = gainVal;
      osc.connect(g);
      g.connect(ctx.destination);
      _activeOscNodes.push(osc);
      _activeGainNodes.push(g);
      return { osc, g };
    }

    // ─── Individual Sound Implementations ────────────────────────
    const CHEAT_SOUNDS = {

      // 1. Police Siren (original, improved)
      police_siren(ctx) {
        const { osc, g } = _makeOsc('sawtooth', 650, 0.35, ctx);
        const now = ctx.currentTime;
        const cycle = 0.5;
        for (let i = 0; i < 40; i++) {
          const t = now + i * cycle * 2;
          osc.frequency.linearRampToValueAtTime(1250, t + cycle);
          osc.frequency.linearRampToValueAtTime(650, t + cycle * 2);
        }
        osc.start();
      },

      // 2. Alarm Beeps — sharp repeating beeps like a door alarm
      alarm_beep(ctx) {
        const now = ctx.currentTime;
        for (let i = 0; i < 20; i++) {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'square';
          osc.frequency.value = 880;
          g.gain.setValueAtTime(0, now + i * 0.35);
          g.gain.linearRampToValueAtTime(0.4, now + i * 0.35 + 0.02);
          g.gain.setValueAtTime(0.4, now + i * 0.35 + 0.18);
          g.gain.linearRampToValueAtTime(0, now + i * 0.35 + 0.22);
          osc.connect(g); g.connect(ctx.destination);
          osc.start(now + i * 0.35);
          osc.stop(now + i * 0.35 + 0.25);
          _activeOscNodes.push(osc); _activeGainNodes.push(g);
        }
      },

      // 3. Red Alert — Star-Trek-style descending wail
      red_alert(ctx) {
        const { osc, g } = _makeOsc('sawtooth', 1100, 0.3, ctx);
        const now = ctx.currentTime;
        const cycle = 0.8;
        for (let i = 0; i < 24; i++) {
          const t = now + i * cycle;
          osc.frequency.setValueAtTime(1100, t);
          osc.frequency.exponentialRampToValueAtTime(400, t + cycle * 0.8);
        }
        osc.start();
      },

      // 4. Buzzer — harsh exam-room buzzer
      buzzer(ctx) {
        const { osc, g } = _makeOsc('square', 110, 0.45, ctx);
        const now = ctx.currentTime;
        g.gain.setValueAtTime(0.45, now);
        for (let i = 0; i < 10; i++) {
          g.gain.setValueAtTime(0.45, now + i * 0.3);
          g.gain.setValueAtTime(0, now + i * 0.3 + 0.15);
        }
        osc.start();
        osc.stop(now + 3.5);
      },

      // 5. Warning Tone — calm but insistent dual-tone
      warning_tone(ctx) {
        const now = ctx.currentTime;
        [660, 880].forEach((freq, idx) => {
          const { osc, g } = _makeOsc('sine', freq, 0.28, ctx);
          const offset = idx * 0.5;
          for (let i = 0; i < 16; i++) {
            g.gain.setValueAtTime(0, now + offset + i * 1.0);
            g.gain.linearRampToValueAtTime(0.28, now + offset + i * 1.0 + 0.05);
            g.gain.setValueAtTime(0.28, now + offset + i * 1.0 + 0.38);
            g.gain.linearRampToValueAtTime(0, now + offset + i * 1.0 + 0.45);
          }
          osc.start();
        });
      },

      // 6. Laser Blast — sci-fi descending laser
      laser_blast(ctx) {
        const now = ctx.currentTime;
        for (let i = 0; i < 12; i++) {
          const { osc, g } = _makeOsc('sawtooth', 1200, 0.3, ctx);
          const t = now + i * 0.4;
          osc.frequency.setValueAtTime(1200, t);
          osc.frequency.exponentialRampToValueAtTime(200, t + 0.3);
          g.gain.setValueAtTime(0.3, t);
          g.gain.linearRampToValueAtTime(0, t + 0.32);
          osc.start(t); osc.stop(t + 0.35);
        }
      },

      // 7. Rapid Fire — machine-gun pulse
      rapid_fire(ctx) {
        const now = ctx.currentTime;
        for (let i = 0; i < 30; i++) {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.value = 300 + Math.random() * 400;
          const t = now + i * 0.12;
          g.gain.setValueAtTime(0.3, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
          osc.connect(g); g.connect(ctx.destination);
          osc.start(t); osc.stop(t + 0.12);
          _activeOscNodes.push(osc); _activeGainNodes.push(g);
        }
      },

      // 8. Dramatic Klaxon — low pulsing klaxon like a ship alarm
      klaxon(ctx) {
        const now = ctx.currentTime;
        for (let i = 0; i < 12; i++) {
          const { osc, g } = _makeOsc('square', i % 2 === 0 ? 220 : 180, 0.4, ctx);
          const t = now + i * 0.35;
          g.gain.setValueAtTime(0.4, t);
          g.gain.setValueAtTime(0, t + 0.28);
          osc.start(t); osc.stop(t + 0.32);
        }
      },

      // 9. High-Pitch Whistle — sharp penalty-whistle sound
      whistle(ctx) {
        const { osc, g } = _makeOsc('sine', 2800, 0.0, ctx);
        const now = ctx.currentTime;
        const blastDur = 0.35;
        const gap = 0.2;
        for (let i = 0; i < 8; i++) {
          const t = now + i * (blastDur + gap);
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(0.35, t + 0.04);
          g.gain.setValueAtTime(0.35, t + blastDur - 0.05);
          g.gain.linearRampToValueAtTime(0, t + blastDur);
          osc.frequency.setValueAtTime(2800, t);
          osc.frequency.linearRampToValueAtTime(3200, t + blastDur * 0.5);
          osc.frequency.linearRampToValueAtTime(2600, t + blastDur);
        }
        osc.start();
      },

      // 10. DJ Drop — rising synth stab with reverb-like decay (energetic DJ cue)
      dj_drop(ctx) {
        const now = ctx.currentTime;
        // Bass kick
        for (let i = 0; i < 4; i++) {
          const kick = ctx.createOscillator();
          const kg = ctx.createGain();
          kick.type = 'sine';
          const t = now + i * 0.25;
          kick.frequency.setValueAtTime(150, t);
          kick.frequency.exponentialRampToValueAtTime(40, t + 0.2);
          kg.gain.setValueAtTime(0.6, t);
          kg.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
          kick.connect(kg); kg.connect(ctx.destination);
          kick.start(t); kick.stop(t + 0.25);
          _activeOscNodes.push(kick); _activeGainNodes.push(kg);
        }
        // Rising synth arp
        const freqs = [220, 330, 440, 660, 880, 1100, 1320, 1760];
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.value = freq;
          const t = now + 1.0 + idx * 0.08;
          g.gain.setValueAtTime(0.25, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
          osc.connect(g); g.connect(ctx.destination);
          osc.start(t); osc.stop(t + 0.4);
          _activeOscNodes.push(osc); _activeGainNodes.push(g);
        });
        // Final stab chord (3 oscillators)
        [440, 550, 660].forEach((freq) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.value = freq;
          const t = now + 1.7;
          g.gain.setValueAtTime(0.3, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
          osc.connect(g); g.connect(ctx.destination);
          osc.start(t); osc.stop(t + 1.3);
          _activeOscNodes.push(osc); _activeGainNodes.push(g);
        });
      },

      // Custom: play base64-encoded audio file uploaded by admin
      async custom(ctx, b64) {
        if (!b64) return CHEAT_SOUNDS.police_siren(ctx);
        try {
          const binary = atob(b64.split(',').pop());
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const buffer = await ctx.decodeAudioData(bytes.buffer);
          const src = ctx.createBufferSource();
          src.buffer = buffer;
          src.loop = true;
          src.connect(ctx.destination);
          src.start();
          _activeAudioSource = src;
        } catch (_) {
          CHEAT_SOUNDS.police_siren(ctx); // fallback
        }
      }
    };

    // ─── Public play / stop ───────────────────────────────────────
    function startPoliceSiren() {
      if (!securityConfig.soundEnabled) return;
      try {
        const ctx = _getCtx();
        stopPoliceSiren();
        const type = securityConfig.soundType || 'police_siren';
        const fn = CHEAT_SOUNDS[type] || CHEAT_SOUNDS.police_siren;
        if (type === 'custom') {
          fn(ctx, securityConfig.customSoundB64);
        } else {
          fn(ctx);
        }
        // Phone haptic vibration
        if (navigator.vibrate) {
          try { navigator.vibrate([300, 150, 300, 150, 300, 150, 600]); } catch (_) {}
        }
      } catch (e) {
        console.warn('Cheat sound error:', e);
      }
    }

    function startCalmTone() {
      if (!securityConfig.soundEnabled) return;
      try {
        const ctx = _getCtx();
        stopPoliceSiren();
        CHEAT_SOUNDS.warning_tone(ctx);
        if (navigator.vibrate) {
          try { navigator.vibrate([200, 100, 200]); } catch (_) {}
        }
      } catch (e) {
        console.warn('Calm tone error:', e);
      }
    }

    function stopPoliceSiren() {
      try {
        _activeOscNodes.forEach(n => { try { n.stop(); n.disconnect(); } catch (_) {} });
        _activeGainNodes.forEach(g => { try { g.disconnect(); } catch (_) {} });
        _activeOscNodes = [];
        _activeGainNodes = [];
        if (_activeAudioSource) {
          try { _activeAudioSource.stop(); _activeAudioSource.disconnect(); } catch (_) {}
          _activeAudioSource = null;
        }
        if (navigator.vibrate) {
          try { navigator.vibrate(0); } catch (_) {}
        }
        if (audioCtx && audioCtx.state === 'running') {
          try { audioCtx.suspend().catch(() => {}); } catch (_) {}
        }
      } catch (_) {}
    }

    function playSuccessChime() {
      try {
        const ctx = _getCtx();
        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const g = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(659.25, now); // E5
        osc1.frequency.exponentialRampToValueAtTime(830.61, now + 0.12); // G#5

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(1318.5, now + 0.08); // E6 sparkle overtone

        g.gain.setValueAtTime(0.01, now);
        g.gain.linearRampToValueAtTime(0.18, now + 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc1.connect(g);
        osc2.connect(g);
        g.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now + 0.08);
        osc1.stop(now + 0.45);
        osc2.stop(now + 0.45);
      } catch (_) {}
    }

    function playCameraShutterSound() {
      try {
        const ctx = _getCtx();
        const now = ctx.currentTime;
        const click = (time, freq) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, time);
          osc.frequency.exponentialRampToValueAtTime(120, time + 0.03);
          g.gain.setValueAtTime(0.2, time);
          g.gain.exponentialRampToValueAtTime(0.001, time + 0.035);
          osc.connect(g);
          g.connect(ctx.destination);
          osc.start(time);
          osc.stop(time + 0.04);
        };
        click(now, 1400);
        click(now + 0.06, 800);
      } catch (_) {}
    }

    function triggerHapticFeedback(pattern = [35]) {
      try {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(pattern);
        }
      } catch (_) {}
    }

    // Intercept Back / Return Button
    function lockHistory() {
      for (let i = 0; i < 5; i++) {
        history.pushState({ TESTLocked: true, step: i }, '', location.href);
      }
      window.addEventListener('popstate', () => {
        if (isTestActive) {
          for (let i = 0; i < 3; i++) {
            history.pushState({ TESTLocked: true, step: i }, '', location.href);
          }
          triggerCheatAlert('Back button pressed / Fullscreen exit attempted');
        }
      });
    }

    let cheatStrikes = 0;
    const MAX_STRIKES = 10;
    let isCheatAlertActive = false;
    let cheatDeadline = 0;
    let lastCheatTriggerTime = 0;

    // Restore persistent strike count across page refreshes for this attempt
    try {
      const currentAttId = attemptData?.id || sessionStorage.getItem('topscore_attempt_id');
      if (currentAttId) {
        const savedStrikes = parseInt(sessionStorage.getItem(`topscore_strikes_${currentAttId}`), 10);
        if (!isNaN(savedStrikes) && savedStrikes > 0) {
          cheatStrikes = savedStrikes;
        }
      }
    } catch (_) {}

    function triggerCheatAlert(reason) {
      if (!isTestActive || !securityConfig.enabled) return;

      // Guard 1: Ignore blur events if speech recognition or mic is active (prevents false alarms on Android/Chrome OS intent)
      if (window._isSpeechRecognitionEngaged && (reason.includes('focus') || reason.includes('blur'))) {
        return;
      }

      const now = Date.now();
      // Cooldown & Active Guard: Prevent multi-event cascade (e.g. popstate + blur + visibilitychange firing in 1s on side panel or return button)
      if (isCheatAlertActive || (now - lastCheatTriggerTime < 2500)) {
        return;
      }
      lastCheatTriggerTime = now;
      isCheatAlertActive = true;

      cheatStrikes++;
      try {
        const currentAttId = attemptData?.id || sessionStorage.getItem('topscore_attempt_id');
        if (currentAttId) {
          sessionStorage.setItem(`topscore_strikes_${currentAttId}`, String(cheatStrikes));
        }
      } catch (_) {}

      logCheatingEvent(session.student_id, testId, 'CHEAT_ATTEMPT', {
        reason: reason,
        strike: cheatStrikes,
        max_strikes: MAX_STRIKES,
        url: location.href,
        user_agent: navigator.userAgent
      });

      // Safely buffer and persist answers immediately
      saveCurrentAnswer();

      const overlay = document.getElementById('cheat-overlay');
      const countEl = document.getElementById('cheat-timer-count');
      const reasonEl = document.getElementById('cheat-reason');
      const strikeBadge = document.getElementById('cheat-strikes-badge');
      const dismissBtn = document.getElementById('dismiss-cheat-btn');

      // Check if 10 warnings limit is exceeded (auto-submit on violation after 10 warnings)
      if (cheatStrikes > MAX_STRIKES) {
        if (strikeBadge) {
          strikeBadge.textContent = `{ LIMIT EXCEEDED (${MAX_STRIKES}/${MAX_STRIKES}) }`;
        }
        if (reasonEl) {
          reasonEl.textContent = `TEST TERMINATED: Maximum warning limit (${MAX_STRIKES} warnings) exceeded!`;
        }
        if (countEl) countEl.textContent = '0';
        if (dismissBtn) dismissBtn.style.display = 'none';
        if (overlay) overlay.style.display = 'flex';
        startPoliceSiren();
        showToast(`Exam terminated: Warning limit (${MAX_STRIKES} strikes) exceeded.`, 'error', 6000);
        setTimeout(() => {
          stopPoliceSiren();
          dismissCheatAlert();
          doSubmit(true);
        }, 1500);
        return;
      }

      // Display warning for Strike 1 to 10 (Option B: Ultra Clean Equal-Spacing Card - Phase 426)
      const isFinalWarning = (cheatStrikes === MAX_STRIKES);
      if (strikeBadge) {
        strikeBadge.textContent = isFinalWarning ? `{ FINAL WARNING (${cheatStrikes}/${MAX_STRIKES}) }` : `{ STRIKE ${cheatStrikes} / ${MAX_STRIKES} }`;
      }

      if (reasonEl) {
        reasonEl.textContent = isFinalWarning
          ? `FINAL WARNING: ${reason}! You have reached the maximum limit of ${MAX_STRIKES} warnings.`
          : `WARNING: ${reason}!`;
      }

      if (dismissBtn) {
        dismissBtn.style.display = 'flex';
        dismissBtn.innerHTML = isFinalWarning
          ? '<span>RETURN TO TEST (FINAL)</span>'
          : '<span>RETURN TO TEST</span>';
      }

      if (overlay) overlay.style.display = 'flex';

      // Always play warning sound on security alert
      startPoliceSiren();

      const durationSeconds = 10; // Phase 426: Authoritative 10s auto-submit countdown
      cheatDeadline = Date.now() + (durationSeconds * 1000);
      if (countEl) countEl.textContent = durationSeconds;

      if (cheatInterval) clearInterval(cheatInterval);
      cheatInterval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((cheatDeadline - Date.now()) / 1000));
        if (countEl) countEl.textContent = remaining;
        if (remaining <= 0) {
          clearInterval(cheatInterval);
          cheatInterval = null;
          isCheatAlertActive = false;
          stopPoliceSiren();
          dismissCheatAlert();
          showToast('Exam terminated: Warning countdown reached 0.', 'error', 6000);
          doSubmit(true);
        }
      }, 500);
    }

    async function dismissCheatAlert() {
      // Re-verify translator state — do NOT permit dismiss if translation is still actively altering the page!
      const activeTrans = checkTranslationArtifacts();
      if (activeTrans) {
        showToast(`Translation active (${activeTrans})! Please turn off Translate in your browser.`, 'error', 6000);
        const reasonEl = document.getElementById('cheat-reason');
        if (reasonEl) {
          reasonEl.textContent = `CANNOT RESUME: ${activeTrans}! Please disable Translation (select "Show original English") to continue your exam.`;
        }
        return false;
      }

      // Re-enter Fullscreen mode to restore the secure test container
      if (isFullscreenSupported() && !isFullscreenActive()) {
        try {
          await requestFullscreenMode();
        } catch (err) {
          console.warn('Could not re-enter fullscreen:', err);
        }
      }
      setTimeout(initScreenSizeBaseline, 500);

      // Restore question readability
      const main = document.getElementById('test-main');
      if (main) {
        main.style.filter = '';
        main.style.pointerEvents = '';
      }

      if (cheatInterval) { clearInterval(cheatInterval); cheatInterval = null; }
      stopPoliceSiren();
      isCheatAlertActive = false;
      cheatDeadline = 0;
      const overlay = document.getElementById('cheat-overlay');
      if (overlay) overlay.style.display = 'none';
      const dismissBtn = document.getElementById('dismiss-cheat-btn');
      if (dismissBtn) dismissBtn.style.display = 'flex';
      if (window.activeKeyboardInput) {
        try { window.activeKeyboardInput.focus(); } catch (_) {}
      }
      return true;
    }

    document.getElementById('dismiss-cheat-btn')?.addEventListener('click', async (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      await dismissCheatAlert();
    });

    // Global Anti-Cheat Clipboard & Context Interception
    document.addEventListener('copy', (e) => {
      if (isTestActive) {
        e.preventDefault();
        triggerCheatAlert('Clipboard Copy Attempt');
      }
    });

    document.addEventListener('cut', (e) => {
      if (isTestActive) {
        e.preventDefault();
        triggerCheatAlert('Clipboard Cut Attempt');
      }
    });

    document.addEventListener('paste', (e) => {
      if (isTestActive) {
        e.preventDefault();
        triggerCheatAlert('Clipboard Paste Attempt');
      }
    });

    document.addEventListener('selectstart', (e) => {
      if (isTestActive && !e.target.matches('input, textarea')) {
        e.preventDefault();
      }
    });

    document.addEventListener('dragstart', (e) => {
      if (isTestActive) e.preventDefault();
    });

    // Context Menu Interception (Touch-Guard: Suppress menu without false alarm strikes on mobile long-press)
    document.addEventListener('contextmenu', (e) => {
      if (isTestActive) {
        e.preventDefault();
      }
    });

    // DevTools & Print/Save Keyboard Interception
    window.addEventListener('keydown', (e) => {
      if (!isTestActive) return;

      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      const key = (e.key || '').toUpperCase();

      // F12 Developer Tools
      if (e.key === 'F12') {
        e.preventDefault();
        e.stopPropagation();
        triggerCheatAlert('DevTools Key (F12)');
        return;
      }

      // Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C (Inspect Element, Console)
      if (isCtrlOrMeta && isShift && (key === 'I' || key === 'J' || key === 'C')) {
        e.preventDefault();
        e.stopPropagation();
        triggerCheatAlert('DevTools Shortcut');
        return;
      }

      // Ctrl+U (View Source), Ctrl+S (Save Page), Ctrl+P (Print Page)
      if (isCtrlOrMeta && (key === 'U' || key === 'S' || key === 'P')) {
        e.preventDefault();
        e.stopPropagation();
        triggerCheatAlert(`Shortcut Intercepted (${key})`);
        return;
      }
    }, true);

    // Screen Capture & Media Sharing Interception (Anti-Discord / Anti-ScreenShare)
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        const origGetDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
        navigator.mediaDevices.getDisplayMedia = async function(...args) {
          if (isTestActive) {
            triggerCheatAlert('Screen Recording or Screen Share Detected');
            logCheatingEvent(session.student_id, testId, 'SCREEN_CAPTURE_ATTEMPT', {
              timestamp: new Date().toISOString()
            });
            throw new Error('Screen capture is prohibited during examinations.');
          }
          return origGetDisplayMedia(...args);
        };
      }
    } catch (_) {}

    // Screen Wake Lock & Keep-Awake Engine is managed via ./js/wake-lock.js

    // ─── Dual-Defense Anti-Cheat Focus & Screen Coverage Engine ─────────────
    let _blurGraceTimer = null;
    let _focusLostTimestamp = null;
    let _tabSwitchCount = 0; // Tab-switch / focus-loss counter per attempt

    // Screen Area Covered / Split-Screen Detection (25%–100% reduction)
    let baselineViewportHeight = 0;
    let baselineViewportWidth = 0;

    function initScreenSizeBaseline() {
      const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      const w = window.visualViewport ? window.visualViewport.width : window.innerWidth;
      if (h > 50 && w > 50) {
        baselineViewportHeight = h;
        baselineViewportWidth = w;
      }
    }

    function checkScreenSizeCovered() {
      if (!isTestActive || !securityConfig.enabled || isCheatAlertActive) return;
      const curH = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      const curW = window.visualViewport ? window.visualViewport.width : window.innerWidth;

      if (baselineViewportHeight > 50 && baselineViewportWidth > 50 && curH > 0 && curW > 0) {
        const baselineArea = baselineViewportHeight * baselineViewportWidth;
        const curArea = curH * curW;
        const areaReduction = (baselineArea - curArea) / baselineArea;

        const sameOrientation = (baselineViewportHeight >= baselineViewportWidth) === (curH >= curW);
        const hReduction = (baselineViewportHeight - curH) / baselineViewportHeight;
        const wReduction = (baselineViewportWidth - curW) / baselineViewportWidth;

        // Triggers if display area is reduced by >= 25% (Split Screen, floating app, multi-window)
        const isCovered = (sameOrientation && (hReduction >= 0.25 || wReduction >= 0.25)) || (areaReduction >= 0.25);

        if (isCovered) {
          const percent = Math.round(Math.max(areaReduction, sameOrientation ? Math.max(hReduction, wReduction) : 0) * 100);
          triggerCheatAlert(`Screen Area Covered / Split-Screen Detected (${percent}% reduction)`);
        }
      }
    }

    window.addEventListener('resize', checkScreenSizeCovered);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', checkScreenSizeCovered);
    }

    function incrementTabSwitchCount(reason) {
      _tabSwitchCount++;
      try {
        const attId = attemptData?.id || sessionStorage.getItem('topscore_attempt_id');
        if (attId) sessionStorage.setItem(`topscore_tab_switches_${attId}`, String(_tabSwitchCount));
      } catch (_) {}
      // Log to audit_logs every 3rd unpenalised focus-loss so admin can spot repeat offenders
      if (_tabSwitchCount % 3 === 0) {
        logCheatingEvent(session.student_id, testId, 'REPEATED_FOCUS_LOSS', {
          tab_switch_count: _tabSwitchCount,
          reason,
          timestamp: new Date().toISOString()
        });
      }
    }

    function handleFocusLost(reason) {
      if (!isTestActive || !securityConfig.enabled) return;
      if (isCheatAlertActive) return;

      saveCurrentAnswer();
      incrementTabSwitchCount(reason);

      if (!_focusLostTimestamp) {
        _focusLostTimestamp = Date.now();
      }

      if (_blurGraceTimer) {
        clearTimeout(_blurGraceTimer);
        _blurGraceTimer = null;
      }

      // Zero-Tolerance (Direct Enforcement): Immediately sound alarm and trigger 10s countdown without delay
      triggerCheatAlert(reason);
    }

    function handleFocusRestored() {
      if (_blurGraceTimer) {
        clearTimeout(_blurGraceTimer);
        _blurGraceTimer = null;
      }
      if (_focusLostTimestamp) {
        const awayDurationMs = Date.now() - _focusLostTimestamp;
        _focusLostTimestamp = null;
        if (!isCheatAlertActive) {
          triggerCheatAlert(`Left exam screen for ${(awayDurationMs / 1000).toFixed(1)}s`);
        }
      }
    }

    // Detect switching tab or minimizing browser
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && isTestActive) {
        handleFocusRestored();
        checkScreenSizeCovered();
        requestScreenWakeLock();
        saveCurrentAnswer();

        if (isCheatAlertActive && cheatDeadline > 0) {
          if (Date.now() >= cheatDeadline) {
            stopPoliceSiren();
            dismissCheatAlert();
            showToast('Exam terminated: Warning countdown expired while away.', 'error', 6000);
            doSubmit(true);
            return;
          } else {
            if (audioCtx && audioCtx.state === 'suspended') {
              audioCtx.resume();
            }
            if (!sirenOsc) {
              if (cheatStrikes <= 3) startCalmTone();
              else startPoliceSiren();
            }
            const remaining = Math.max(0, Math.ceil((cheatDeadline - Date.now()) / 1000));
            const countEl = document.getElementById('cheat-timer-count');
            if (countEl) countEl.textContent = remaining;
          }
        }
      }
      if (!securityConfig.enabled) return;
      if (isTestActive && document.hidden) {
        handleFocusLost('Leaving the tab / Minimizing browser');
      }
    });

    window.addEventListener('focus', () => {
      handleFocusRestored();
      if (isTestActive) {
        checkScreenSizeCovered();
        saveCurrentAnswer();
        if (isCheatAlertActive && cheatDeadline > 0) {
          if (Date.now() >= cheatDeadline) {
            stopPoliceSiren();
            dismissCheatAlert();
            showToast('Exam terminated: Warning countdown expired while away.', 'error', 6000);
            doSubmit(true);
            return;
          } else {
            if (audioCtx && audioCtx.state === 'suspended') {
              audioCtx.resume();
            }
            if (!sirenOsc) {
              if (cheatStrikes <= 3) startCalmTone();
              else startPoliceSiren();
            }
          }
        }
      }
    });

    // Detect opening another app, side panel, or losing window focus
    window.addEventListener('blur', () => {
      if (!securityConfig.enabled) return;
      if (!isTestActive) return;

      // Always safe to skip if speech mic is active (mic permission dialog or recognition intent fires blur on Android/ChromeOS)
      if (window._isSpeechRecognitionEngaged) return;

      handleFocusLost('Screen lost focus / External app or dialog opened');
    });

    // On pagehide / minimize: safely buffer current answers to storage only.
    // Do NOT prematurely force-submit here because mobile browsers fire pagehide on normal Home press.
    window.addEventListener('pagehide', () => {
      if (isTestActive && attemptData?.id) {
        saveCurrentAnswer();
      }
    });

    window.addEventListener('beforeunload', (e) => {
      if (isTestActive) {
        // BUG FIX: Do NOT call submitOnPageExit() here!
        // If the user clicks 'Cancel' on the browser's reload warning, they should be able to continue.
        // Actual forceful submission is handled reliably by the 'pagehide' event if they do leave.
        e.preventDefault();
        e.returnValue = 'TEST is in progress! Closing or reloading this page will automatically submit the TEST.';
        return e.returnValue;
      }
    });

    // Block context menu on questions to prevent translation menu
    document.addEventListener('contextmenu', (e) => {
      if (!['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        e.preventDefault();
        return false;
      }
    });

    // ─── Authoritative Multi-Engine Translation Lockdown ─────────────
    function checkTranslationArtifacts() {
      const html = document.documentElement;
      const body = document.body;
      if (!html || !body) return null;

      // 1. Google Chrome & Chromium translation state (classes on html/body)
      if (
        html.classList.contains('translated-ltr') ||
        html.classList.contains('translated-rtl') ||
        body.classList.contains('translated-ltr') ||
        body.classList.contains('translated-rtl')
      ) {
        return 'Google Chrome page translation active';
      }

      // 2. Language attribute manipulation (TopsCore is strictly English: en)
      const currentLang = (html.getAttribute('lang') || '').toLowerCase();
      if (currentLang && !currentLang.startsWith('en')) {
        return `Language tag altered to "${currentLang}"`;
      }

      // 3. Google Translate DOM wrappers (<font> elements, banners, frames)
      // TopsCore never emits legacy <font> tags; any <font> in DOM is an automated translation wrapper
      if (document.querySelector('font, .goog-te-banner-frame, #goog-gt-, .goog-te-combo, .skiptranslate, [class*="goog-te"], .VIpgJd-yAWneB-L7tpub')) {
        return 'Google Translate DOM elements detected';
      }

      // 4. Microsoft Edge Translator attributes
      if (document.querySelector('[_msthash], [_msttexthash], [_mstmutation]')) {
        return 'Microsoft Edge Translator detected';
      }

      // 5. Apple Safari Translate
      if (
        html.classList.contains('apple-webpage-translation-mode-translated') ||
        body.classList.contains('apple-webpage-translation-mode-translated') ||
        document.querySelector('[class*="apple-webpage-translation"]')
      ) {
        return 'Safari Webpage Translation detected';
      }

      // 6. Third-party extensions (DeepL, Immersive Translate, etc.)
      if (document.querySelector('deepl-inline-translate, [class*="deepl-"], [class*="immersive-translate"], [data-immersive-translate]')) {
        return 'Third-party Translator Extension detected';
      }

      return null;
    }

    function handleTranslationDetected(reason) {
      if (!isTestActive || !securityConfig.enabled) return;

      // Blur the question area immediately to prevent reading translated questions
      const main = document.getElementById('test-main');
      if (main) {
        main.style.filter = 'blur(28px)';
        main.style.pointerEvents = 'none';
      }

      triggerCheatAlert(`Browser Translator Detected (${reason})! Please restore original English.`);

      logCheatingEvent(session.student_id, testId, 'TRANSLATION_ATTEMPT', {
        reason: reason,
        timestamp: new Date().toISOString()
      });
    }

    const translationObserver = new MutationObserver(() => {
      if (!isTestActive) return;
      const reason = checkTranslationArtifacts();
      if (reason) {
        handleTranslationDetected(reason);
      }
    });
    translationObserver.observe(document.documentElement, {
      attributes: true,
      childList: true,
      subtree: true
    });

    // ─── Universal Netlify Badge & External Floating Injections Purge ───
    function purgeExternalBadges() {
      try {
        const netlifyEls = document.querySelectorAll('a[href*="netlify.com"], netlify-drawer, [data-netlify-badge], .netlify-badge, #netlify-badge');
        netlifyEls.forEach(el => {
          const container = el.closest('div') || el;
          container.remove();
        });
      } catch (_) {}
    }
    purgeExternalBadges();
    try {
      const badgeObserver = new MutationObserver(() => purgeExternalBadges());
      badgeObserver.observe(document.body || document.documentElement, { childList: true, subtree: true });
    } catch (_) {}

    // Seeded shuffle for question_order = 'random'
    function shuffleWithSeed(array, seedStr) {
      if (!Array.isArray(array) || array.length <= 1) return array || [];
      const s = String(seedStr || 'default_seed');
      let seed = 0;
      for (let i = 0; i < s.length; i++) {
        seed = (seed << 5) - seed + s.charCodeAt(i);
        seed |= 0;
      }
      const random = () => {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
      };
      const result = [...array];
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    }

    // ─── Smart Web Proctored Shield: Fullscreen Helpers ─────────────
    async function requestFullscreenMode() {
      try {
        const docEl = document.documentElement;
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        } else if (docEl.mozRequestFullScreen) {
          await docEl.mozRequestFullScreen();
        } else if (docEl.msRequestFullscreen) {
          await docEl.msRequestFullscreen();
        }
      } catch (err) {
        console.warn('Fullscreen request bypassed or denied:', err);
      }
    }

    function isFullscreenSupported() {
      const docEl = document.documentElement;
      return !!(
        document.fullscreenEnabled ||
        document.webkitFullscreenEnabled ||
        document.mozFullScreenEnabled ||
        document.msFullscreenEnabled ||
        docEl?.requestFullscreen ||
        docEl?.webkitRequestFullscreen ||
        docEl?.mozRequestFullScreen ||
        docEl?.msRequestFullscreen
      );
    }

    function isFullscreenActive() {
      return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
    }

    function handleFullscreenChange() {
      if (!isTestActive || !isFullscreenSupported()) return;

      if (!isFullscreenActive()) {
        triggerCheatAlert('Fullscreen Mode Exited / Left Exam Area');
      } else {
        setTimeout(initScreenSizeBaseline, 500);
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    // —— Boot ——
    async function bootTest() {
      window.bootTest = bootTest;
      window.doSubmit = doSubmit;
      showLoading('Starting TEST…');
      try {
        const [fetchedConfig, result] = await Promise.all([
          getSecuritySettings().catch(() => null),
          startTest(session.student_id, testId)
        ]);
        if (fetchedConfig) securityConfig = fetchedConfig;
        attemptData = result.attempt;
        // Restore tab-switch counter from previous session (attempt resume)
        try {
          const attId = attemptData?.id;
          if (attId) {
            const saved = parseInt(sessionStorage.getItem(`topscore_tab_switches_${attId}`), 10);
            if (!isNaN(saved) && saved > 0) _tabSwitchCount = saved;
          }
        } catch (_) {}
        testData = result.test || result.TEST || {};
        testsections = result.sections || [];
        allAnswerRows = result.answers || [];
        window.attemptData = attemptData;
        window.allAnswerRows = allAnswerRows;

        // Module Redirect: If this is a Dialogue test, redirect to live dialogue room
        if (testData?.answer_type === 'dialogue' || testData?.module === 'dialogue' || testData?.module_type === 'CONVERSATIONAL' || testData?.test_type === 'conversation' || testData?.payload?.is_conversation) {
          window.location.replace(`conversation.html?test_id=${encodeURIComponent(testId)}&attempt_id=${encodeURIComponent(attemptData?.id || '')}`);
          return;
        }

        // Status check: do not start if test has been soft-deleted or unpublished/drafted
        const asmStatus = String(testData?.status || 'PUBLISHED').toUpperCase();
        if (testData?.deleted_at || (asmStatus !== 'PUBLISHED' && asmStatus !== 'ACTIVE')) {
          const main = document.getElementById('test-main');
          if (main) {
            main.innerHTML = `
              <div class="glass-panel text-center p-5 mx-auto" style="max-width:500px;margin-top:10vh;">
                <h2 class="fw-800 text-xl mb-3" style="color:var(--grade-e);">${getSvgIcon('lock', 20)} Test Unavailable</h2>
                <p class="text-sm" style="color:var(--clr-text-2);">This test is unavailable or is in draft mode. Retakes are not available.</p>
                <button class="btn btn-primary mt-4" onclick="window.location.href='dashboard.html'">Return to Dashboard</button>
              </div>
            `;
          }
          hideLoading();
          return;
        }

        // Server time gate: Enforce WITA window check for schedule_mode === 'fixed'
        const isAlumni = session.level_number === 99 || (session.program_status || '').toUpperCase() === 'ALUMNI';

        // Session Lock Gate: Enforce closed session lock for formal exams
        const isExamSubtype = (testData?.test_subtype || '').toUpperCase().includes('TEST') || (testData?.test_subtype || '').toUpperCase().includes('EXAM');
        const isExamShell = (testData?.shell_code || '').toUpperCase().endsWith('-TEST') || (testData?.shell_code || '').toUpperCase().endsWith('-EXAM');
        const isExamTitle = ((testData?.title || '').toLowerCase().includes('test') || (testData?.title || '').toLowerCase().includes('exam')) && !(testData?.title || '').toLowerCase().includes('task');
        const isFormalExam = ((testData?.test_type || '').toLowerCase() === 'exam' || isExamSubtype || isExamShell || isExamTitle) &&
                             !(testData?.shell_code || '').toUpperCase().includes('-TASK') &&
                             !(testData?.test_subtype || '').toUpperCase().includes('TASK') &&
                             !(testData?.title || '').toLowerCase().includes('task') &&
                             !(testData?.test_type || '').toLowerCase().includes('task') &&
          !(testData?.test_type || '').toLowerCase().includes('quiz');

        const liveSession = testData?.payload?.test_session;
        if (!isAlumni && isFormalExam && liveSession) {
          const isSessClosed = liveSession.status === 'LOCKED' || (liveSession.auto_close_at && new Date(liveSession.auto_close_at) <= new Date());
          if (isSessClosed) {
            const main = document.getElementById('test-main');
            if (main) {
              main.innerHTML = `
                <div class="glass-panel text-center p-5 mx-auto" style="max-width:500px;margin-top:10vh;">
                  <h2 class="fw-800 text-xl mb-3" style="color:var(--grade-e);">${getSvgIcon('lock', 20)} Session Closed</h2>
                  <p class="text-sm" style="color:var(--clr-text-2);">This test session has been closed by the Tutor. Access is locked.</p>
                  <button class="btn btn-primary mt-4" onclick="window.location.href='dashboard.html'">Return to Dashboard</button>
                </div>
              `;
            }
            hideLoading();
            return;
          }
        }
        if (!isAlumni && testData?.schedule_mode === 'manual' && testData?.is_unlocked === false) {
          const main = document.getElementById('test-main');
          if (main) {
            main.innerHTML = `
              <div class="glass-panel text-center p-5 mx-auto" style="max-width:500px;margin-top:10vh;">
                <h2 class="fw-800 text-xl mb-3" style="color:var(--clr-text-1);">${getSvgIcon('lock', 20)} Test Locked</h2>
                <p class="text-sm" style="color:var(--clr-text-2);">Waiting for your tutor to unlock this session in class.</p>
                <button class="btn btn-primary mt-4" onclick="window.location.href='dashboard.html'">Return to Dashboard</button>
              </div>
            `;
          }
          hideLoading();
          return;
        }

        if (testData?.schedule_mode === 'fixed') {
          const witaNow = await getServerTimeWita();
          const witaStart = testData.window_start ? new Date(testData.window_start) : null;
          const witaEnd = testData.window_end ? new Date(testData.window_end) : null;

          if (witaStart && witaNow < witaStart) {
            hideLoading();
            alert('This test has not started yet. Please wait until ' + witaStart.toLocaleString());
            window.location.href = 'dashboard.html';
            return;
          }
          if (witaEnd && witaNow > witaEnd) {
            hideLoading();
            alert('This test has already expired.');
            window.location.href = 'dashboard.html';
            return;
          }
        }


        // Helper function for robust phrase row detection
        const isPhraseRowUnified = (r) => {
          const snap = (typeof r?.question_snapshot === 'string')
            ? (() => { try { return JSON.parse(r.question_snapshot); } catch(_) { return {}; } })()
            : (r?.question_snapshot || {});
          const cat = (r?.category || snap?.category || '').toLowerCase();
          const sec = (snap?.test_section || snap?.section_id || '').toLowerCase();
          const lbl = (snap?.section_label || '').toLowerCase();
          const top = (snap?.topic || '').toLowerCase();
          const wt = (snap?.word_type || r?.question_type_snapshot || '').toLowerCase();
          return sec === 'phrases' || cat === 'phrases' || lbl.includes('phrase') || top.includes('phrase') || ['expression', 'idiom', 'proverb', 'phrase'].includes(wt);
        };

        // Question order shuffle (if random, default in TopsCore)
        const orderSetting = String(testData?.question_order || testData?.payload?.question_order || 'random').toLowerCase();
        if (orderSetting === 'random' && allAnswerRows.length > 1) {
          const hasTwoSections = allAnswerRows.some(r => !isPhraseRowUnified(r)) &&
                                allAnswerRows.some(r => isPhraseRowUnified(r));
          if (hasTwoSections) {
            const wordRows = allAnswerRows.filter(r => !isPhraseRowUnified(r));
            const phraseRows = allAnswerRows.filter(r => isPhraseRowUnified(r));
            const shuffledWords = shuffleWithSeed(wordRows, (attemptData?.id || testId) + '_words');
            const shuffledPhrases = shuffleWithSeed(phraseRows, (attemptData?.id || testId) + '_phrases');
            allAnswerRows = [...shuffledWords, ...shuffledPhrases];
          } else {
            allAnswerRows = shuffleWithSeed(allAnswerRows, attemptData?.id || testId);
          }
          window.allAnswerRows = allAnswerRows;
        }

        // Section / Component Filter for Unified Tests (Option B: Words or Phrases selection)
        requestedSection = (urlParams.get('section') || urlParams.get('part') || requestedSection || '').toLowerCase();
        const hasTwoSections = allAnswerRows.some(r => !isPhraseRowUnified(r)) &&
                              allAnswerRows.some(r => isPhraseRowUnified(r));

        const applySectionFilter = async (sectionKey) => {
          if (sectionKey === 'words') {
            allAnswerRows = allAnswerRows.filter(r => !isPhraseRowUnified(r));
          } else if (sectionKey === 'phrases') {
            allAnswerRows = allAnswerRows.filter(r => isPhraseRowUnified(r));
          }
          window.allAnswerRows = allAnswerRows;
          answerRows = allAnswerRows;

          if (attemptData) {
            // Standar Pacing SSOT (DECISION-063 Khusus Vocabulary Class):
            // Words: 10s spoken / 15s written / 10s selection
            // Phrases: 20s spoken / 10s selection / 20s written
            const manualDur = Number(testData?.working_duration_minutes || testData?.payload?.working_duration_minutes || 0);
            const isPhraseSection = sectionKey === 'phrases';
            const sessModes = testData?.payload?.test_session?.answering_modes;
            const sessMode = testData?.payload?.test_session?.answering_mode;
            const curMode = isPhraseSection
              ? (sessModes?.phrases || sessMode || 'selection')
              : (sessModes?.words || sessMode || 'written');
            let pace = 10;
            if (isPhraseSection) {
              pace = (curMode === 'selection' || curMode === 'multiple_choice') ? 10 : 20;
            } else {
              pace = (curMode === 'written') ? 15 : 10;
            }
            const autoCalcDur = Math.max(1, Math.ceil((allAnswerRows.length * pace) / 60));
            const sectionDur = manualDur > 0 ? manualDur : autoCalcDur;
            const startedAt = attemptData?.started_at ? new Date(attemptData.started_at) : new Date();
            attemptData.expires_at = new Date(startedAt.getTime() + sectionDur * 60000).toISOString();
            _lastKnownServerExpMs = new Date(attemptData.expires_at).getTime();

            // Sync authoritative section expiration and count to database attempt record
            if (attemptData.id) {
              try {
                const sb = await getSupabase();
                const secTag = sectionKey === 'phrases' ? '[SECTION: PHRASES]' : '[SECTION: WORDS]';
                const curFr = String(attemptData.forgiven_reason || '');
                const updatedFr = curFr.includes('[SECTION:')
                  ? curFr.replace(/\[SECTION:\s*[A-Z]+\]/gi, secTag)
                  : (curFr ? `${curFr} ${secTag}` : secTag);
                attemptData.forgiven_reason = updatedFr;
                await sb.from('attempts').update({
                  expires_at: attemptData.expires_at,
                  total_questions: allAnswerRows.length,
                  forgiven_reason: updatedFr
                }).eq('id', attemptData.id);
              } catch (_) {}
            }
          }

          const formatted = formatTestDisplay(testData);
          const l1 = formatted.line1 || 'Test';
          testDisplayName = l1;
          // Authoritative synchronization: lock testsections to single unified section to prevent ghost empty sections in matrix modal
          testsections = [{ id: 'default', title: testDisplayName, section_order: 1 }];
          allAnswerRows.forEach(row => {
            let snap = row.question_snapshot;
            if (typeof snap === 'string') {
              try { snap = JSON.parse(snap); } catch(_) { snap = {}; }
            }
            if (snap && typeof snap === 'object') {
              snap.section_id = 'default';
              row.question_snapshot = snap;
            }
          });
          const mainTitleEl = document.getElementById('test-main-title');
          if (mainTitleEl) {
            mainTitleEl.textContent = l1;
            mainTitleEl.setAttribute('title', formatted.fullTitle || l1);
          }
        };

        if (requestedSection === 'words' || requestedSection === 'phrases') {
          await applySectionFilter(requestedSection);
        }

        // Prefill any existing answers (resume from server)
        if (result.resumed) {
          allAnswerRows.forEach(row => {
            if (row.student_answer) answeredMap[row.id] = row.student_answer;
          });
          showToast('Resuming your previous attempt.', 'info');
        }

        // Reconcile with client Write-Ahead Buffer (prevents data loss across reloads/disconnects)
        try {
          const localBufferRaw = localStorage.getItem(`topscore_local_answers_${attemptData.id}`);
          if (localBufferRaw) {
            const localBuffer = JSON.parse(localBufferRaw);
            let restoredCount = 0;
            for (const [ansId, ansVal] of Object.entries(localBuffer)) {
              if (ansVal && !answeredMap[ansId]) {
                const cleanAns = typeof ansVal === 'string'
                  ? ansVal
                  : (ansVal?.text || ansVal?.student_answer || ansVal?.answer || (typeof ansVal === 'object' ? JSON.stringify(ansVal) : String(ansVal)));
                answeredMap[ansId] = cleanAns;
                restoredCount++;
              }
            }
            if (restoredCount > 0) {
              showToast(`Restored ${restoredCount} unsaved answer(s) from safety buffer.`, 'info');
            }
          }
        } catch (_) {}

        // Populate TEST display name via authoritative formatTestDisplay (SSOT AGENTS.md § 2.6.2 / ui-invariants.md § 5.4)
        const formattedTest = formatTestDisplay(testData);
        const line1Title = formattedTest.line1 || 'Test';
        testDisplayName = line1Title;

        try {
          const classEl = document.getElementById('test-class-name');
          if (classEl && testData?.classes?.name) classEl.textContent = testData.classes.name;
          const titleEl = document.getElementById('test-main-title');
          if (titleEl) {
            titleEl.textContent = line1Title;
            titleEl.setAttribute('title', formattedTest.fullTitle || line1Title);
          }
          // Populate 2nd-line subtitle: Theme and/or Topic (SSOT AGENTS.md § 2.6.2)
          const subEl = document.getElementById('test-title-sub');
          if (subEl) {
            if (formattedTest.line2) {
              subEl.textContent = formattedTest.line2;
              subEl.setAttribute('title', formattedTest.line2);
              subEl.style.display = 'block';
            } else {
              subEl.style.display = 'none';
            }
          }
        } catch(e) {}

        // Fetch student info for header
        try {
          const nameEl = document.getElementById('test-student-name');
          const avatarEl = document.getElementById('test-student-avatar');
          const detailsEl = document.getElementById('test-student-details');

          if (nameEl) nameEl.textContent = session.student_name || 'Student';
          if (detailsEl) {
            const fallbackParts = [session.batch_name ? `Batch ${session.batch_name}` : '', session.program_name].filter(Boolean);
            detailsEl.textContent = fallbackParts.length ? fallbackParts.join(' • ') : 'Cake English Course';
          }

          fetch(`${SUPABASE_URL}/rest/v1/students?id=eq.${session.student_id}&select=*,institutions(name),programs(name),batches(name),levels(name)`, {
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
          }).then(r => r.json()).then(stuRes => {
            if (stuRes && stuRes[0]) {
              const s = stuRes[0];
              if (s.photo_url && avatarEl) {
                avatarEl.src = s.photo_url;
                avatarEl.onerror = () => {
                  avatarEl.src = generateAvatarDataUri(session.student_name || 'S', s.gender);
                };
              } else if (avatarEl) {
                avatarEl.src = generateAvatarDataUri(session.student_name || 'S', s.gender);
              }

              let age = '';
              if (s.date_of_birth) {
                const ageNum = Math.floor((new Date() - new Date(s.date_of_birth)) / 31557600000);
                if (ageNum > 0) age = ageNum + 'thn';
              }

              const inst = s.institutions?.name || '';
              const prog = s.programs?.name || '';
              const batch = s.batches?.name || '';
              const lvl = s.levels?.name ? 'Lvl ' + s.levels.name : '';

              const details = [age, inst, prog, batch, lvl].filter(Boolean).join(' • ');
              if (detailsEl) detailsEl.textContent = details;
            } else if (avatarEl) {
              avatarEl.src = generateAvatarDataUri(session.student_name || 'S');
            }
          }).catch(e => {
            console.warn("Failed to fetch student details", e);
            if (avatarEl) avatarEl.src = generateAvatarDataUri(session.student_name || 'S');
          });

        } catch (e) {
          console.warn("Failed to load student profile:", e);
        }

        // V1: If no answer rows at all, show recovery state
        if (!allAnswerRows || allAnswerRows.length === 0) {
          hideLoading();
          sessionStorage.removeItem('topscore_attempt_id');
          if (attemptData?.id) {
            sessionStorage.removeItem(`topscore_sec_${attemptData.id}`);
          }
          const mainEl = document.getElementById('test-main');
          if (mainEl) {
            mainEl.style.justifyContent = 'center';
            mainEl.style.minHeight = '100%';
            mainEl.innerHTML = `
              <div class="question-card text-center" style="padding:2.5rem 1.5rem;text-align:center;width:100%;max-width:380px;margin:auto;">
                <div style="margin-bottom:1rem; color:var(--grade-c);">${getSvgIcon('alert-triangle', 40)}</div>
                <h3 style="font-size:20px;font-weight:700;margin-bottom:0.75rem;">No Questions Found</h3>
                <p class="text-muted" style="max-width:440px;margin:0 auto 1.5rem;line-height:1.6;">
                  This test does not have any questions yet or the session needs to be refreshed.
                </p>
                <div style="display:flex;gap:10px;justify-content:center;">
                  <button class="btn btn-secondary" onclick="window.location.reload()">Retry Loading</button>
                  <button class="btn btn-primary" onclick="window.location.href='dashboard.html'">Return to Dashboard</button>
                </div>
              </div>
            `;
          }
          return;
        }

        // Auto-chunk multi-theme exams (e.g. Theme D cumulative 640 questions) into manageable milestone sections
        if (!testsections || testsections.length === 0) {
          const themesMap = new Map();
          allAnswerRows.forEach(row => {
            let snap = row.question_snapshot;
            if (typeof snap === 'string') {
              try { snap = JSON.parse(snap); } catch { snap = {}; }
            }
            const tc = (snap?.theme_code || snap?.theme || '').toUpperCase();
            if (tc) {
              if (!themesMap.has(tc)) themesMap.set(tc, 0);
              themesMap.set(tc, themesMap.get(tc) + 1);
            }
          });

          const uniqueThemes = Array.from(themesMap.keys()).sort();
          if (uniqueThemes.length > 1 && allAnswerRows.length >= 80) {
            const themeLabels = {
              'A': 'Milestone 1 — Theme A (Workplace)',
              'B': 'Milestone 2 — Theme B (Tourism)',
              'C': 'Milestone 3 — Theme C (CCU & Culture)',
              'D': 'Milestone 4 — Theme D (High-Frequency)',
              'E': 'Milestone 5 — Theme E (General)',
              'F': 'Milestone 6 — Theme F (Idioms & Advanced)'
            };
            testsections = uniqueThemes.map((tc, idx) => ({
              id: `theme_${tc}`,
              theme_code: tc,
              title: themeLabels[tc] || `Theme ${tc}`,
              section_order: idx + 1
            }));

            // Assign matching section_id to row snapshots
            allAnswerRows.forEach(row => {
              let snap = row.question_snapshot;
              if (typeof snap === 'string') {
                try { snap = JSON.parse(snap); } catch { snap = {}; }
              } else if (!snap || typeof snap !== 'object') {
                snap = {};
              }
              const tc = (snap.theme_code || snap.theme || '').toUpperCase();
              snap.section_id = tc ? `theme_${tc}` : (testsections[0]?.id || 'default');
              row.question_snapshot = snap;
            });
          } else {
            testsections = [{ id: 'default', title: testData?.title || testData?.test_title || 'Test', section_order: 1 }];
          }
        }
        allAnswerRows.forEach(row => {
          if (row.question_snapshot) {
            if (typeof row.question_snapshot === 'string') {
              try {
                const parsed = JSON.parse(row.question_snapshot);
                if (!parsed.section_id) parsed.section_id = 'default';
                row.question_snapshot = parsed;
              } catch (e) {
                row.question_snapshot = { section_id: 'default' };
              }
            } else if (typeof row.question_snapshot === 'object') {
              if (!row.question_snapshot.section_id) row.question_snapshot.section_id = 'default';
            }
          } else {
            row.question_snapshot = { section_id: 'default' };
          }
        });

        // Figure out current section
        const savedSecIndex = parseInt(sessionStorage.getItem(`topscore_sec_${attemptData.id}`), 10);
        if (!isNaN(savedSecIndex) && savedSecIndex >= 0 && savedSecIndex < testsections.length) {
          currentSectionIndex = savedSecIndex;
        } else {
          currentSectionIndex = 0;
        }

        hideLoading();

        const preExamModal = document.getElementById('pre-exam-focus-modal');
        if (preExamModal) preExamModal.classList.add('hidden');

        const proceedStartExam = async () => {
          if (preExamModal) preExamModal.classList.add('hidden');
          startSection(currentSectionIndex);
          isTestActive = true;
          requestScreenWakeLock();
          lockHistory();
          startSessionHeartbeatGuard();
          setTimeout(initScreenSizeBaseline, 500);
          // Immediate translation check on exam start
          const initialTrans = checkTranslationArtifacts();
          if (initialTrans) {
            handleTranslationDetected(initialTrans);
          }
        };

        // Option B: Words vs Phrases Selection for Unified Tests
        if (hasTwoSections && !requestedSection) {
          const compModal = document.getElementById('component-selector-modal');
          if (compModal) {
            let chosenPart = 'words';
            const modalTitleEl = document.getElementById('component-modal-title');
            const wordsCard = document.getElementById('component-opt-words');
            const phrasesCard = document.getElementById('component-opt-phrases');
            const confirmBtn = document.getElementById('btn-confirm-component-selection');
            const closeBtn = document.getElementById('close-component-modal');

            if (modalTitleEl) {
              const rawTTitle = String(testData.title || testData.name || 'Topic Test').replace(/\s+(?:Words|Phrases)\s+/i, ' ').trim();
              const tParts = rawTTitle.split(/\s+[-–:]\s+/);
              if (tParts.length > 1) {
                const tLine1 = tParts[0].trim();
                const tLine2 = tParts.slice(1).join(' - ').trim();
                modalTitleEl.innerHTML = `<span style="display:block;font-size:16px;font-weight:800;color:#fff;line-height:1.2;">${escHtml(tLine1)}</span><span style="display:block;font-size:12px;font-weight:700;color:#38bdf8;line-height:1.2;margin-top:2px;">${escHtml(tLine2)}</span>`;
              } else {
                modalTitleEl.textContent = rawTTitle;
              }
            }

            const updateModalSelection = () => {
              if (wordsCard) {
                wordsCard.classList.toggle('selected', chosenPart === 'words');
                wordsCard.setAttribute('aria-pressed', chosenPart === 'words' ? 'true' : 'false');
              }
              if (phrasesCard) {
                phrasesCard.classList.toggle('selected', chosenPart === 'phrases');
                phrasesCard.setAttribute('aria-pressed', chosenPart === 'phrases' ? 'true' : 'false');
              }
              if (confirmBtn) {
                const isEx = isExam(testData);
                confirmBtn.innerHTML = `START ${chosenPart === 'words' ? (isEx ? 'WRD EXAM' : 'WRD') : (isEx ? 'PHR EXAM' : 'PHR')} &rarr;`;
              }
            };

            const startWithChoice = async () => {
              compModal.classList.add('hidden');
              requestedSection = chosenPart;
              await applySectionFilter(chosenPart);
              try {
                const url = new URL(window.location.href);
                url.searchParams.set('section', chosenPart);
                window.history.replaceState(null, '', url.toString());
              } catch (_) {}
              if (isFullscreenSupported() && !isFullscreenActive()) {
                try { await requestFullscreenMode(); } catch (_) {}
              }
              await proceedStartExam();
            };

            if (wordsCard) {
              wordsCard.onclick = () => {
                if (chosenPart === 'words') {
                  startWithChoice();
                } else {
                  chosenPart = 'words';
                  updateModalSelection();
                }
              };
            }
            if (phrasesCard) {
              phrasesCard.onclick = () => {
                if (chosenPart === 'phrases') {
                  startWithChoice();
                } else {
                  chosenPart = 'phrases';
                  updateModalSelection();
                }
              };
            }

            if (confirmBtn) {
              confirmBtn.onclick = () => startWithChoice();
            }

            if (closeBtn) {
              closeBtn.onclick = () => {
                window.location.href = 'dashboard.html';
              };
            }

            try {
              const sb = await getSupabase();
              const { data: pastAtts } = await sb.from('attempts')
                .select('id, score, correct_count, total_questions, percentage, effective_score, status, is_forgiven')
                .eq('student_id', session.student_id)
                .eq('test_id', testData.id)
                .in('status', ['submitted', 'auto_submitted', 'evaluated', 'graded']);
              let wPasses = 0;
              let pPasses = 0;
              let wBestPct = null;
              let pBestPct = null;
              const minReq = Number(testData.minimum_required_score || testData.payload?.min_score || 60);
              (pastAtts || []).forEach(pa => {
                const pct = parseFloat(pa.effective_score ?? pa.percentage ?? 0);
                const isPass = pa.is_forgiven || pct >= minReq;
                const tQ = Number(pa.total_questions || 0);
                const cC = Number(pa.correct_count || pa.score || 0);
                const fr = String(pa.forgiven_reason || '');
                const isPhr = (tQ > 0 && tQ <= 40) || (cC > 0 && cC <= 10 && tQ <= 40) || /\b(phrases?|phr)\b/i.test(fr);
                if (isPhr) {
                  if (isPass) pPasses++;
                  if (pBestPct == null || pct > pBestPct) pBestPct = pct;
                } else {
                  if (isPass) wPasses++;
                  if (wBestPct == null || pct > wBestPct) wBestPct = pct;
                }
              });

              const isEx = isExam(testData);
              const wordsPips = document.getElementById('component-words-pips');
              const phrasesPips = document.getElementById('component-phrases-pips');
              const wordsExamView = document.getElementById('component-words-exam-view');
              const phrasesExamView = document.getElementById('component-phrases-exam-view');
              const wStat = document.getElementById('component-words-status');
              const pStat = document.getElementById('component-phrases-status');

              if (isEx) {
                if (wordsPips) wordsPips.classList.add('hidden');
                if (phrasesPips) phrasesPips.classList.add('hidden');
                if (wordsExamView) {
                  wordsExamView.classList.remove('hidden');
                  wordsExamView.style.display = 'flex';
                  if (wBestPct != null) {
                    const clr = typeof getGradeColorByScore === 'function' ? getGradeColorByScore(wBestPct) : (wBestPct >= minReq ? 'var(--grade-a)' : 'var(--grade-d)');
                    wordsExamView.innerHTML = `<span style="color:${clr};font-size:14px;font-weight:800;">Best: ${Math.round(wBestPct)}% ${wBestPct >= minReq ? '✓' : ''}</span>`;
                  } else {
                    wordsExamView.innerHTML = `<span style="color:var(--clr-text-3);font-size:12px;font-weight:600;">Not Taken Yet</span>`;
                  }
                }
                if (phrasesExamView) {
                  phrasesExamView.classList.remove('hidden');
                  phrasesExamView.style.display = 'flex';
                  if (pBestPct != null) {
                    const clr = typeof getGradeColorByScore === 'function' ? getGradeColorByScore(pBestPct) : (pBestPct >= minReq ? 'var(--grade-a)' : 'var(--grade-d)');
                    phrasesExamView.innerHTML = `<span style="color:${clr};font-size:14px;font-weight:800;">Best: ${Math.round(pBestPct)}% ${pBestPct >= minReq ? '✓' : ''}</span>`;
                  } else {
                    phrasesExamView.innerHTML = `<span style="color:var(--clr-text-3);font-size:12px;font-weight:600;">Not Taken Yet</span>`;
                  }
                }
                if (wStat) wStat.textContent = '';
                if (pStat) pStat.textContent = '';
              } else {
                if (wordsPips) wordsPips.classList.remove('hidden');
                if (phrasesPips) phrasesPips.classList.remove('hidden');
                if (wordsExamView) wordsExamView.classList.add('hidden');
                if (phrasesExamView) phrasesExamView.classList.add('hidden');
                const renderPips = (elId, cnt) => {
                  const el = document.getElementById(elId);
                  if (el) el.querySelectorAll('.pip-box').forEach((pip, i) => pip.classList.toggle('active', i < cnt));
                };
                renderPips('component-words-pips', wPasses);
                renderPips('component-phrases-pips', pPasses);
                if (wStat) wStat.textContent = `${wPasses}/7`;
                if (pStat) pStat.textContent = `${pPasses}/7`;
              }
            } catch (_) {}

            updateModalSelection();
            compModal.classList.remove('hidden');
            return;
          }
        }

        // Direct exam start without blocking fullscreen modal prompt
        if (isFullscreenSupported() && !isFullscreenActive()) {
          try { await requestFullscreenMode(); } catch (_) {}
        }
        await proceedStartExam();
      } catch(e) {
        hideLoading();
        // Clear cached IDs in sessionStorage so invalid or blocked tests don't poison subsequent sessions
        sessionStorage.removeItem('topscore_test_id');
        sessionStorage.removeItem('topscore_attempt_id');

        const errMsg = e?.message || String(e) || 'Unable to start test.';
        const isPrereqIssue = errMsg.includes('Prerequisite') ||
                              errMsg.includes('Repetitive Mastery') ||
                              errMsg.includes('PREREQUISITE') ||
                              errMsg.includes('TOPIC_MASTERY') ||
                              errMsg.includes('PRIOR_THEME_EXAMS_REQUIRED');

        if (isPrereqIssue) {
          const main = document.getElementById('test-main');
          if (main) {
            main.style.display = 'flex';
            main.style.justifyContent = 'center';
            main.style.alignItems = 'center';
            main.style.minHeight = '70vh';
            main.innerHTML = `
              <div class="glass-panel text-center p-5 mx-auto" style="max-width:540px;background:rgba(18,24,38,0.96);border:1px solid rgba(var(--grade-c-rgb),0.35);border-radius:16px;box-shadow:0 20px 45px rgba(0,0,0,0.6);padding:2.5rem 1.75rem;text-align:center;">
                <div style="margin-bottom:1rem; color:var(--grade-c);">${getSvgIcon('alert-triangle', 40)}</div>
                <h2 class="fw-800 text-xl mb-3" style="color:var(--grade-c);font-size:20px;font-weight:800;margin-bottom:0.75rem;">Prerequisite Incomplete</h2>
                <p class="text-sm" style="color:#e2e8f0;line-height:1.6;margin-bottom:1.75rem;font-size:16px;">
                  ${escapeHtml(errMsg.replace(/^Error:\s*/, ''))}
                </p>
                <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
                  ${e?.prereqTestId ? `
                    <button class="btn btn-primary" onclick="window.location.href='test.html?id=${e.prereqTestId}'" style="background:linear-gradient(135deg,var(--grade-a) 0%,#009900 100%);color:#fff;font-weight:700;padding:10px 24px;border:none;border-radius:8px;cursor:pointer;box-shadow:0 4px 14px rgba(var(--grade-a-rgb),0.35);">
                      Go to Prerequisite Task &rarr;
                    </button>
                  ` : ''}
                  <button class="btn btn-secondary" onclick="window.location.href='dashboard.html'" style="background:linear-gradient(135deg,#3b82f6 0%,#2563eb 100%);color:#fff;font-weight:700;padding:10px 24px;border:none;border-radius:8px;cursor:pointer;">
                    Return to Dashboard
                  </button>
                </div>
              </div>
            `;
            return;
          }
        }

        showToast(errMsg, 'error');
        setTimeout(() => window.location.href = 'dashboard.html', 3000);
      }
    }

    let _sessionHeartbeatTimer = null;
    let _lastKnownServerExpMs = 0;
    function startSessionHeartbeatGuard() {
      if (_sessionHeartbeatTimer) clearInterval(_sessionHeartbeatTimer);
      if (attemptData?.expires_at) {
        _lastKnownServerExpMs = new Date(attemptData.expires_at).getTime();
      }
      _sessionHeartbeatTimer = setInterval(async () => {
        if (!isTestActive || !attemptData?.id) return;
        try {
          const sb = await getSupabase();
          // 1. Check attempt status & dynamic time extensions from tutor
          const { data: att } = await sb.from('attempts')
            .select('status, expires_at')
            .eq('id', attemptData.id)
            .maybeSingle();

          if (att) {
            const st = String(att.status || '').toLowerCase();
            if (st === 'cancelled') {
              isTestActive = false;
              clearInterval(_sessionHeartbeatTimer);
              alert('Your test session has been cancelled or terminated by the Proctor/Tutor.');
              window.location.href = 'dashboard.html';
              return;
            }
            if (st === 'auto_submitted') {
              isTestActive = false;
              clearInterval(_sessionHeartbeatTimer);
              alert('Your test session has been submitted by the Proctor/Tutor.');
              window.location.href = `result.html?attempt_id=${attemptData.id}`;
              return;
            }

            // Real-time time adjustment detection from Tutor Live Controller (both extensions & reductions)
            // Compares against _lastKnownServerExpMs to prevent false alarms on test startup
            if (att.expires_at) {
              const serverExp = new Date(att.expires_at).getTime();
              if (!_lastKnownServerExpMs) {
                _lastKnownServerExpMs = serverExp;
              } else if (Math.abs(serverExp - _lastKnownServerExpMs) > 15000) {
                const diffMinutes = Math.round((serverExp - _lastKnownServerExpMs) / 60000);
                _lastKnownServerExpMs = serverExp;
                attemptData.expires_at = att.expires_at;
                const currentSec = (testsections && testsections[currentSectionIndex]) || null;
                startTimer(currentSec);
                const toastMsg = diffMinutes > 0
                  ? `Your test time has been extended by the Tutor (+${diffMinutes} minutes)!`
                  : `Your test time has been adjusted by the Tutor (${diffMinutes} minutes).`;
                showToast(toastMsg, 'info', 6000);
              }
            }
          }

          // 2. Check test session status, expiration, and attendance whitelist
          if (testId) {
            const { data: asm } = await sb.from('tests')
              .select('payload')
              .eq('id', testId)
              .maybeSingle();
            const sess = asm?.payload?.test_session;
            const isAlumniStudent = session.level_number === 99 || (session.program_status || '').toUpperCase() === 'ALUMNI';

            if (!isAlumniStudent && sess) {
              // A. If Tutor closed/locked the session: Immediately eject and auto-submit!
              if (sess.status === 'LOCKED') {
                isTestActive = false;
                if (_sessionHeartbeatTimer) clearInterval(_sessionHeartbeatTimer);
                alert('This test session has been closed by the Proctor/Tutor. Submitting your answers now...');
                try {
                  await doSubmit('auto_submitted');
                } catch (_) {}
                window.location.href = 'dashboard.html';
                return;
              }

              // B. If Session auto_close_at reached: Immediately eject and auto-submit!
              if (sess.auto_close_at && new Date(sess.auto_close_at) <= new Date()) {
                isTestActive = false;
                if (_sessionHeartbeatTimer) clearInterval(_sessionHeartbeatTimer);
                alert('The test session time has expired. Submitting your answers now...');
                try {
                  await doSubmit('auto_submitted');
                } catch (_) {}
                window.location.href = 'dashboard.html';
                return;
              }

              // C. If student was removed from allowed_student_ids: Eject!
              if (sess.status === 'UNLOCKED') {
                const allowed = sess.allowed_student_ids || [];
                if (Array.isArray(allowed) && allowed.length > 0 && !allowed.includes(session.student_id)) {
                  isTestActive = false;
                  if (_sessionHeartbeatTimer) clearInterval(_sessionHeartbeatTimer);
                  alert('Your access to this test session has been revoked by the Proctor/Tutor.');
                  window.location.href = 'dashboard.html';
                  return;
                }
              }
            }
          }
        } catch (_) {}
      }, 8000);
    }

    function startSection(index, initialIdx = 0) {
       currentSectionIndex = index;
       sessionStorage.setItem(`topscore_sec_${attemptData.id}`, index);
       const currentSection = testsections[index];

       if (!testsections || testsections.length <= 1 || currentSection?.id === 'default') {
         answerRows = allAnswerRows;
       } else {
         answerRows = allAnswerRows.filter(row => {
           let snap = row.question_snapshot;
           if (typeof snap === 'string') {
              try { snap = JSON.parse(snap); } catch { snap = {}; }
           }
           const secId = snap?.section_id || 'default';
           return secId === currentSection.id;
         });
         // Safety: If filtering by section produced 0 questions while allAnswerRows has questions, never strand student on empty state
         if (answerRows.length === 0 && allAnswerRows.length > 0) {
           answerRows = allAnswerRows;
         }
       }
       window.answerRows = answerRows;

       const nameEl = document.getElementById('test-main-title') || document.getElementById('test-name');
       if (nameEl) {
         nameEl.textContent = testDisplayName;
         nameEl.setAttribute('title', (formatTestDisplay(testData)?.fullTitle) || testDisplayName);
       }
       const subEl = document.getElementById('test-title-sub');
       if (subEl) {
         const formatted = formatTestDisplay(testData);
         if (formatted.line2) {
           subEl.textContent = formatted.line2;
           subEl.setAttribute('title', formatted.line2);
           subEl.style.display = 'block';
         } else {
           subEl.style.display = 'none';
         }
       }
       const metaEl = document.getElementById('test-meta');
       if (metaEl) metaEl.textContent = `${allAnswerRows.length} Questions · ${session.student_name || 'Student'}`;

       buildNavGrid();
       startTimer(currentSection);

       let targetIdx = initialIdx;
       if (targetIdx < 0) {
         targetIdx = answerRows.length + targetIdx; // -1 becomes answerRows.length - 1
       }
       if (targetIdx < 0 || targetIdx >= answerRows.length) {
         targetIdx = 0;
       }
       renderQuestion(targetIdx);
    }

    // —— Timer ——
    function startTimer(currentSection) {
      if (timerController) timerController.stop();

      // V1 uses expires_at; legacy used expected_end_at — check both
      const globalEndAt = attemptData?.expires_at
        ? new Date(attemptData.expires_at)
        : attemptData?.expected_end_at
          ? new Date(attemptData.expected_end_at)
          : null;

      let sectionEndAt = null;
      if (currentSection && currentSection.time_limit_minutes) {
         let secStartedStr = localStorage.getItem(`topscore_sec_started_${attemptData.id}_${currentSectionIndex}`);
         let secStarted;
         if (!secStartedStr) {
            secStarted = new Date();
            localStorage.setItem(`topscore_sec_started_${attemptData.id}_${currentSectionIndex}`, secStarted.toISOString());
         } else {
            secStarted = new Date(secStartedStr);
         }
         sectionEndAt = new Date(secStarted.getTime() + currentSection.time_limit_minutes * 60000);
      }

      let activeEndAt = globalEndAt;
      let isSectionTimer = false;

      if (sectionEndAt && (!globalEndAt || sectionEndAt < globalEndAt)) {
          activeEndAt = sectionEndAt;
          isSectionTimer = true;
      }

      if (!activeEndAt) return;

      if (isExpired(activeEndAt.toISOString())) {
        handleTimeUp(isSectionTimer);
        return;
      }

      const timerEl = document.getElementById('test-timer');
      const display = document.getElementById('timer-display');
      timerEl.classList.remove('warning', 'critical');


    // Pacing badge removed

      timerController = startCountdown(activeEndAt.toISOString(), {
        onTick(remaining) {
          display.textContent = formatTime(remaining);
          },
        onWarning(remaining) {
          if (remaining <= 120) {
            timerEl.classList.add('critical');
            showToast('Less than 2 minutes remaining!', 'warning', 5000);
          } else {
            timerEl.classList.add('warning');
            showToast('5 minutes remaining.', 'warning', 4000);
          }
        },
        onExpire() {
          handleTimeUp(isSectionTimer);
        }
      });
    }

    async function nextSection() {
      saveCurrentAnswer();
      await syncLiveSessionModality(true);
      if (currentSectionIndex < testsections.length - 1) {
         startSection(currentSectionIndex + 1);
      } else {
         openSubmitModal();
      }
    }

    function proceedTimeUp(isSection) {
       if (isSection) {
          showToast('Section time is up! Moving to next section.', 'warning', 5000);
          if (currentSectionIndex < testsections.length - 1) {
              startSection(currentSectionIndex + 1);
          } else {
              autoSubmit();
          }
       } else {
          showToast('Time is up! Submitting your TEST…', 'warning', 5000);
          autoSubmit();
       }
    }

    function handleTimeUp(isSection) {
       saveCurrentAnswer();
       // Speech Grace Buffer (+1.5s): Stop active speech session and allow in-flight transcription to flush cleanly
       if (window.currentActiveSpeechSession) {
          try { window.currentActiveSpeechSession.stop(); } catch(_) {}
       }
       showToast('⏱️ Finalizing your speech recording...', 'info', 1500);
       setTimeout(() => {
          saveCurrentAnswer();
          proceedTimeUp(isSection);
       }, 1500);
    }

    // —— Build Nav Grid (Display All Questions & Group by Section) ——
    function buildNavGrid() {
      const grid = document.getElementById('q-nav-grid');
      if (!grid) return;
      grid.innerHTML = '';

      const matrixPill = document.getElementById('matrix-progress-pill');
      if (matrixPill) {
        matrixPill.textContent = `0 / ${allAnswerRows.length}`;
      }
      const titleAnsweredEl = document.getElementById('matrix-title-answered');
      if (titleAnsweredEl) titleAnsweredEl.textContent = '0';
      const titleUnansweredEl = document.getElementById('matrix-title-unanswered');
      if (titleUnansweredEl) titleUnansweredEl.textContent = String(allAnswerRows.length);
      const barAnswered = document.getElementById('matrix-bar-answered');
      const barUnanswered = document.getElementById('matrix-bar-unanswered');
      if (barAnswered && barUnanswered) {
        barAnswered.style.width = '0%';
        barUnanswered.style.width = '100%';
      }

      // Filter testsections to only those that actually have matching questions in allAnswerRows
      const activeSections = (testsections || []).filter(sec => {
        return allAnswerRows.some(row => {
          let snap = row.question_snapshot;
          if (typeof snap === 'string') {
            try { snap = JSON.parse(snap); } catch { snap = {}; }
          }
          const secId = snap?.section_id || 'default';
          return secId === sec.id || (sec.id === 'default' && (!secId || secId === 'default'));
        });
      });

      if (activeSections.length > 0) {
        testsections = activeSections;
      } else {
        testsections = [{ id: 'default', title: testDisplayName, section_order: 1 }];
      }

      const isMultiSection = testsections.length > 1;

      if (!isMultiSection) {
        // Single continuous 8-column sleek grid
        grid.classList.remove('multi-section');
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(8, 1fr)';
        grid.style.gap = '6px';

        allAnswerRows.forEach((row, globalIdx) => {
          const btn = document.createElement('button');
          btn.className = 'q-nav-btn';
          btn.id = `qnav-row-${row.id}`;
          btn.dataset.rowId = row.id;
          btn.dataset.globalIdx = globalIdx;
          btn.textContent = globalIdx + 1;
          btn.setAttribute('aria-label', `Question ${globalIdx + 1}`);
          btn.addEventListener('click', () => {
            saveCurrentAnswer();
            renderQuestion(globalIdx);
            if (typeof window.toggleMatrixPopup === 'function') {
              window.toggleMatrixPopup(false);
            }
          });
          grid.appendChild(btn);
        });
      } else {
        // Multi-section layout: Group by Section
        grid.classList.add('multi-section');
        grid.style.display = 'flex';
        grid.style.flexDirection = 'column';
        grid.style.gap = '12px';

        let globalCounter = 0;

        activeSections.forEach((sec, secIdx) => {
          const secRows = allAnswerRows.filter(row => {
            let snap = row.question_snapshot;
            if (typeof snap === 'string') {
              try { snap = JSON.parse(snap); } catch { snap = {}; }
            }
            const secId = snap?.section_id || 'default';
            return secId === sec.id || (sec.id === 'default' && (!secId || secId === 'default'));
          });
          if (secRows.length === 0) return; // Strict safety: never render empty section card

          const secBlock = document.createElement('div');
          secBlock.className = 'matrix-sec-block';
          secBlock.style.cssText = (secIdx === currentSectionIndex)
            ? 'background:rgba(56, 189, 248, 0.08); border:1px solid rgba(56, 189, 248, 0.4); border-radius:10px; padding:8px 10px 10px 10px; width:100%; box-sizing:border-box;'
            : 'background:rgba(15, 23, 42, 0.6); border:1px solid rgba(255, 255, 255, 0.08); border-radius:10px; padding:8px 10px 10px 10px; width:100%; box-sizing:border-box;';

          const secHeader = document.createElement('div');
          secHeader.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding-bottom:4px; border-bottom:1px solid rgba(255, 255, 255, 0.08);';

          const titleSpan = document.createElement('span');
          titleSpan.style.cssText = `font-size:12px; font-weight:800; color:${(secIdx === currentSectionIndex) ? '#38bdf8' : '#e2e8f0'}; letter-spacing:0.3px; display:inline-flex; align-items:center; gap:6px;`;
          const activeTag = (secIdx === currentSectionIndex) ? '<span style="font-size:12px;background:#0284c7;color:#ffffff;padding:2px 6px;border-radius:4px;font-weight:700;">ACTIVE</span>' : '';
          titleSpan.innerHTML = `${sec.title || `Section ${secIdx + 1}`} (${secRows.length} Questions) ${activeTag}`;

          const progressSpan = document.createElement('span');
          progressSpan.id = `matrix-sec-count-${secIdx}`;
          progressSpan.style.cssText = 'font-size:12px; color:#94a3b8; font-weight:600;';

          secHeader.appendChild(titleSpan);
          secHeader.appendChild(progressSpan);
          secBlock.appendChild(secHeader);

          const subGrid = document.createElement('div');
          subGrid.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fill, minmax(32px, 1fr)); gap:5px;';

          secRows.forEach((row, localIdx) => {
            const thisGlobalIdx = globalCounter++;
            const btn = document.createElement('button');
            btn.className = 'q-nav-btn';
            btn.id = `qnav-row-${row.id}`;
            btn.dataset.rowId = row.id;
            btn.dataset.secIdx = secIdx;
            btn.dataset.localIdx = localIdx;
            btn.dataset.globalIdx = thisGlobalIdx;
            btn.textContent = thisGlobalIdx + 1; // Continuous 1..50
            btn.setAttribute('aria-label', `Question ${thisGlobalIdx + 1}`);

            btn.addEventListener('click', () => {
              saveCurrentAnswer();
              if (currentSectionIndex !== secIdx) {
                startSection(secIdx, localIdx);
              } else {
                renderQuestion(localIdx);
              }
              if (typeof window.toggleMatrixPopup === 'function') {
                window.toggleMatrixPopup(false);
              }
            });

            subGrid.appendChild(btn);
          });

          secBlock.appendChild(subGrid);
          grid.appendChild(secBlock);
        });
      }

      updateNavGrid();
    }

    function hasAnswer(val) {
      if (val == null) return false;
      if (typeof val === 'string') return val.trim().length > 0;
      if (typeof val === 'number') return true;
      if (typeof val === 'object') {
        const str = (val.text || val.student_answer || val.answer || '');
        return typeof str === 'string' && str.trim().length > 0;
      }
      return false;
    }

    let _navProgressTimer = null;
    function updateProgressMetrics() {
      const activeMap = window.answeredMap || answeredMap;
      const answered = Object.values(activeMap).filter(hasAnswer).length;
      const pct = allAnswerRows.length > 0 ? (answered / allAnswerRows.length) * 100 : 0;
      const fillEl = document.getElementById('test-progress-fill');
      if (fillEl) fillEl.style.width = pct + '%';
      const progressTextEl = document.getElementById('progress-text-percent');
      if (progressTextEl) progressTextEl.textContent = Math.round(pct) + '%';
      const counterTextEl = document.getElementById('question-counter-text');
      if (counterTextEl) {
        counterTextEl.textContent = `${answered}/${allAnswerRows.length} Answered`;
      } else {
        const counterEl = document.getElementById('question-counter');
        if (counterEl) counterEl.textContent = `${answered}/${allAnswerRows.length} answered`;
      }
    }

    function updateActiveChipOnly(rowId, val) {
      const activeMap = window.answeredMap || answeredMap;
      activeMap[rowId] = val;
      const btn = document.getElementById(`qnav-row-${rowId}`) || document.getElementById(`qnav-${currentIndex}`);
      if (btn) {
        btn.classList.toggle('answered', hasAnswer(val));
      }
      if (_navProgressTimer) clearTimeout(_navProgressTimer);
      _navProgressTimer = setTimeout(() => {
        _navProgressTimer = null;
        updateProgressMetrics();
      }, 300);
    }

    function updateNavGrid() {
      const activeMap = window.answeredMap || answeredMap;

      // Update all buttons by data-row-id
      const allButtons = document.querySelectorAll('.q-nav-btn[data-row-id]');
      if (allButtons.length > 0) {
        allButtons.forEach(btn => {
          const rowId = btn.dataset.rowId;
          if (!rowId) return;
          const isAnswered = hasAnswer(activeMap[rowId]);
          btn.classList.toggle('answered', isAnswered);

          const isCurrent = (rowId === answerRows[currentIndex]?.id);
          btn.classList.toggle('current', isCurrent);
        });
      } else {
        answerRows.forEach((row, idx) => {
          const btn = document.getElementById(`qnav-${idx}`);
          if (!btn) return;
          btn.classList.toggle('answered', hasAnswer(activeMap[row.id]));
          btn.classList.toggle('current', idx === currentIndex);
        });
      }

      // Update per-section answered counters
      if (testsections && testsections.length > 1) {
        testsections.forEach((sec, secIdx) => {
          const secRows = allAnswerRows.filter(row => {
            let snap = row.question_snapshot;
            if (typeof snap === 'string') {
              try { snap = JSON.parse(snap); } catch { snap = {}; }
            }
            const secId = snap?.section_id || 'default';
            return secId === sec.id || (sec.id === 'default' && (!secId || secId === 'default'));
          });
          const secAnswered = secRows.filter(r => hasAnswer(activeMap[r.id])).length;
          const countEl = document.getElementById(`matrix-sec-count-${secIdx}`);
          if (countEl) {
            countEl.textContent = `${secAnswered}/${secRows.length} answered`;
          }
        });
      }

      // Update Question Matrix header counts and progress bar
      const totalAnswered = Object.values(activeMap).filter(hasAnswer).length;
      const totalQuestions = allAnswerRows.length;
      const totalUnanswered = Math.max(0, totalQuestions - totalAnswered);

      const titleAnsweredEl = document.getElementById('matrix-title-answered');
      if (titleAnsweredEl) titleAnsweredEl.textContent = totalAnswered;
      const titleUnansweredEl = document.getElementById('matrix-title-unanswered');
      if (titleUnansweredEl) titleUnansweredEl.textContent = totalUnanswered;

      const barAnswered = document.getElementById('matrix-bar-answered');
      const barUnanswered = document.getElementById('matrix-bar-unanswered');
      if (barAnswered && barUnanswered) {
        const answeredPct = totalQuestions > 0 ? (totalAnswered / totalQuestions) * 100 : 0;
        const unansweredPct = totalQuestions > 0 ? (totalUnanswered / totalQuestions) * 100 : 100;
        barAnswered.style.width = `${answeredPct}%`;
        barUnanswered.style.width = `${unansweredPct}%`;
      }

      const matrixPill = document.getElementById('matrix-progress-pill');
      if (matrixPill) {
        matrixPill.textContent = `${totalAnswered} / ${totalQuestions}`;
      }
      const legendAnswered = document.getElementById('matrix-legend-answered');
      if (legendAnswered) legendAnswered.textContent = totalAnswered;
      const legendBlank = document.getElementById('matrix-legend-blank');
      if (legendBlank) legendBlank.textContent = totalUnanswered;

      updateProgressMetrics();
    }
    window.updateNavGrid = updateNavGrid;

    // —— Safe Virtual Keyboard Anchor / Provider (Gboard 1:1 Layout) ——
    let isShifted = false;
    let isSymbolMode = false;

    function renderKeyboardKeys() {
      const vk = document.getElementById('virtual-keyboard-container');
      if (!vk) return;
      if (isSymbolMode) {
        vk.innerHTML = `
          <div class="vk-row vk-row-1">
            <button class="vk-key" data-key="1">1</button><button class="vk-key" data-key="2">2</button><button class="vk-key" data-key="3">3</button><button class="vk-key" data-key="4">4</button><button class="vk-key" data-key="5">5</button><button class="vk-key" data-key="6">6</button><button class="vk-key" data-key="7">7</button><button class="vk-key" data-key="8">8</button><button class="vk-key" data-key="9">9</button><button class="vk-key" data-key="0">0</button>
          </div>
          <div class="vk-row vk-row-2">
            <button class="vk-key" data-key="@">@</button><button class="vk-key" data-key="#">#</button><button class="vk-key" data-key="$">$</button><button class="vk-key" data-key="%">%</button><button class="vk-key" data-key="&">&</button><button class="vk-key" data-key="-">-</button><button class="vk-key" data-key="+">+</button><button class="vk-key" data-key="(">(</button><button class="vk-key" data-key=")">)</button>
          </div>
          <div class="vk-row vk-row-3">
            <button class="vk-key special vk-shift" data-key="Shift" title="Shift">⇧</button>
            <button class="vk-key" data-key="*">*</button><button class="vk-key" data-key="&quot;">"</button><button class="vk-key" data-key="'">'</button><button class="vk-key" data-key=":">:</button><button class="vk-key" data-key=";">;</button><button class="vk-key" data-key="!">!</button><button class="vk-key" data-key="?">?</button>
            <button class="vk-key special vk-backspace" data-key="Backspace" title="Backspace">⌫</button>
          </div>
          <div class="vk-row vk-row-4">
            <button class="vk-key special vk-mode" data-key="ABC">ABC</button>
            <button class="vk-key vk-comma" data-key=",">,</button>
            <button class="vk-key space" data-key=" ">Space</button>
            <button class="vk-key vk-dot" data-key=".">.</button>
            <button class="vk-key special vk-enter" data-key="Enter">↵</button>
          </div>
        `;
      } else {
        const letters = isShifted
          ? ['Q','W','E','R','T','Y','U','I','O','P','A','S','D','F','G','H','J','K','L','Z','X','C','V','B','N','M']
          : ['q','w','e','r','t','y','u','i','o','p','a','s','d','f','g','h','j','k','l','z','x','c','v','b','n','m'];

        // Fast path: In-place update if keyboard layout already has letter keys (zero DOM recreation)
        const existingLetterKeys = vk.querySelectorAll('.vk-key:not(.special):not(.vk-comma):not(.vk-dot):not(.space)');
        if (existingLetterKeys.length === 26) {
          existingLetterKeys.forEach((btn, idx) => {
            btn.setAttribute('data-key', letters[idx]);
            btn.textContent = letters[idx];
          });
          const shiftBtn = vk.querySelector('.vk-shift');
          if (shiftBtn) shiftBtn.classList.toggle('active', isShifted);
          return;
        }

        vk.innerHTML = `
          <div class="vk-row vk-row-1">
            <button class="vk-key" data-key="${letters[0]}">${letters[0]}</button><button class="vk-key" data-key="${letters[1]}">${letters[1]}</button><button class="vk-key" data-key="${letters[2]}">${letters[2]}</button><button class="vk-key" data-key="${letters[3]}">${letters[3]}</button><button class="vk-key" data-key="${letters[4]}">${letters[4]}</button><button class="vk-key" data-key="${letters[5]}">${letters[5]}</button><button class="vk-key" data-key="${letters[6]}">${letters[6]}</button><button class="vk-key" data-key="${letters[7]}">${letters[7]}</button><button class="vk-key" data-key="${letters[8]}">${letters[8]}</button><button class="vk-key" data-key="${letters[9]}">${letters[9]}</button>
          </div>
          <div class="vk-row vk-row-2">
            <button class="vk-key" data-key="${letters[10]}">${letters[10]}</button><button class="vk-key" data-key="${letters[11]}">${letters[11]}</button><button class="vk-key" data-key="${letters[12]}">${letters[12]}</button><button class="vk-key" data-key="${letters[13]}">${letters[13]}</button><button class="vk-key" data-key="${letters[14]}">${letters[14]}</button><button class="vk-key" data-key="${letters[15]}">${letters[15]}</button><button class="vk-key" data-key="${letters[16]}">${letters[16]}</button><button class="vk-key" data-key="${letters[17]}">${letters[17]}</button><button class="vk-key" data-key="${letters[18]}">${letters[18]}</button>
          </div>
          <div class="vk-row vk-row-3">
            <button class="vk-key special vk-shift ${isShifted ? 'active' : ''}" data-key="Shift" title="Shift">⇧</button>
            <button class="vk-key" data-key="${letters[19]}">${letters[19]}</button><button class="vk-key" data-key="${letters[20]}">${letters[20]}</button><button class="vk-key" data-key="${letters[21]}">${letters[21]}</button><button class="vk-key" data-key="${letters[22]}">${letters[22]}</button><button class="vk-key" data-key="${letters[23]}">${letters[23]}</button><button class="vk-key" data-key="${letters[24]}">${letters[24]}</button><button class="vk-key" data-key="${letters[25]}">${letters[25]}</button>
            <button class="vk-key special vk-backspace" data-key="Backspace" title="Backspace">⌫</button>
          </div>
          <div class="vk-row vk-row-4">
            <button class="vk-key special vk-mode" data-key="?123">?123</button>
            <button class="vk-key vk-comma" data-key=",">,</button>
            <button class="vk-key space" data-key=" ">Space</button>
            <button class="vk-key vk-dot" data-key=".">.</button>
            <button class="vk-key special vk-enter" data-key="Enter">↵</button>
          </div>
        `;
      }
    }

    function getVirtualKeyboard() {
      let vk = document.getElementById('virtual-keyboard-container');
      if (!vk) {
        vk = document.createElement('div');
        vk.id = 'virtual-keyboard-container';
        vk.style.display = 'none';
        document.body.appendChild(vk);
      }
      renderKeyboardKeys();
      return vk;
    }
    window.getVirtualKeyboard = getVirtualKeyboard;

    let _lastSessionCheckTime = 0;
    async function syncLiveSessionModality(force = false) {
      const now = Date.now();
      // Throttle live check to at most once every 2 seconds for high responsiveness & low egress
      if (!force && (now - _lastSessionCheckTime < 2000)) return;
      _lastSessionCheckTime = now;
      try {
        const sb = await getSupabase();
        if (!sb || !testId) return;
        const { data } = await sb.from('tests')
          .select('payload, answer_type')
          .eq('id', testId)
          .single();
        if (data && data.payload?.test_session) {
          if (!testData) testData = {};
          if (!testData.payload) testData.payload = {};
          testData.payload.test_session = data.payload.test_session;
          if (data.answer_type) testData.answer_type = data.answer_type;
        }
      } catch (_) {}
    }
    window.syncLiveSessionModality = syncLiveSessionModality;

    // —— Render Question ——
    function renderQuestion(idx) {
      abortActiveSpeechSession();
      cancelMcAutoAdvance();
      currentIndex = idx;
      let row = answerRows[idx];
      if (!row && allAnswerRows && allAnswerRows.length > 0) {
        answerRows = allAnswerRows;
        row = answerRows[idx] || answerRows[0];
        currentIndex = 0;
      }
      if (!row) {
        const main = document.getElementById('test-main');
        if (main) {
          main.innerHTML = `
            <div class="question-card text-center" style="padding:2.5rem 1.5rem;text-align:center;width:100%;max-width:380px;margin:auto;">
              <div style="margin-bottom:1rem; color:var(--grade-c);">${getSvgIcon('alert-triangle', 40)}</div>
              <h3 style="font-size:16px;font-weight:700;margin-bottom:0.75rem;">Question Unavailable</h3>
              <p class="text-muted" style="font-size:12px;margin-bottom:1.5rem;">Could not load question item. Please return to dashboard or retry.</p>
              <button class="btn btn-primary" onclick="window.location.href='dashboard.html'">Return to Dashboard</button>
            </div>
          `;
        }
        return;
      }

      // Pacing Assistance (Anti-Timeout Guard):
      // If student remains stuck on an unanswered question for > 45s, gently advise skipping.
      if (window._questionPacingTimer) clearTimeout(window._questionPacingTimer);
      const isCurrentlyUnanswered = !hasAnswer(answeredMap[row.id]);
      if (isCurrentlyUnanswered && isTestActive) {
        window._questionPacingTimer = setTimeout(() => {
          if (currentIndex === idx && !hasAnswer(answeredMap[row.id]) && isTestActive) {
            showToast('Stuck? Tap Next to skip and return later before time runs out!', 'info', 6000);
          }
        }, 45000);
      }

      let snap = row.question_snapshot;
      if (typeof snap === 'string') {
        try { snap = JSON.parse(snap); } catch { snap = { question_text: snap, answer_type: 'spoken' }; }
      }
      const sessAnsweringMode = testData?.payload?.test_session?.answering_mode;
      const sessModes = testData?.payload?.test_session?.answering_modes;
      const isPhraseRow = (row?.category || snap?.category || '').toLowerCase() === 'phrases' ||
                          /phrase/i.test(row?.topics?.name || snap?.topic || '') ||
                          /phrase/i.test(snap?.section_label || '') ||
                          snap?.test_section === 'phrases' ||
                          snap?.section_id === 'phrases' ||
                          (typeof requestedSection !== 'undefined' && requestedSection === 'phrases') ||
                          (testsections && testsections[currentSectionIndex]?.id === 'phrases') ||
                          ['expression', 'idiom', 'proverb', 'phrase'].includes((snap?.word_type || row?.question_type_snapshot || '').toLowerCase()) ||
                          ((testData?.test_subtype || testData?.shell_code || '').toUpperCase().includes('PHRASE'));
      const sessTargetMode = isPhraseRow ? (sessModes?.phrases || sessAnsweringMode) : (sessModes?.words || sessAnsweringMode);

      let answerType = sessTargetMode || snap?.answer_type || row?.answer_type || testData?.answer_type || testData?.payload?.answer_type || 'spoken';

      if (testData?.answer_type === 'written' || (testData?.shell_code && testData.shell_code.endsWith('-WORDS-EXAM')) || (testData?.title && testData.title.toUpperCase().includes('WORDS EXAM'))) {
        answerType = sessTargetMode || 'written';
      }
      if (testData?.answer_type === 'description' || testData?.module === 'description' || testData?.module_type === 'POINT_AND_SPEAK' || snap?.module === 'description' || snap?.answer_type === 'description' || (testData?.title && testData.title.includes('Tell Me What You See'))) {
        answerType = 'description';
      }
      const questionText = snap?.question_text || snap?.questionText || snap?.question || snap?.text || snap?.soal || snap?.indonesia || row.question_text_snapshot || (typeof row.question_snapshot === 'string' ? row.question_snapshot : '') || 'Question text unavailable';
      // Extract Theme (Name + Code), Topic, Category, and Type for 4 corners
      const THEME_NAMES = {
        'A': 'Workplace',
        'B': 'Tourism',
        'C': 'CCU',
        'D': 'High-Frequency',
        'TH1': 'Theme 1',
        'TH2': 'Theme 2',
        'TH3': 'Theme 3'
      };

      let themeCode = snap?.theme_code || snap?.metadata?.theme_code || row?.theme_code_snapshot || testData?.payload?.theme_code || '';
      let themeName = snap?.theme || snap?.metadata?.theme || row?.theme_snapshot || '';

      if (themeName && themeName.length === 1 && /[A-Za-z]/.test(themeName)) {
        if (!themeCode) themeCode = themeName.toUpperCase();
        themeName = '';
      } else if (/^theme\s+([A-Za-z0-9]+)$/i.test(themeName)) {
        const m = themeName.match(/^theme\s+([A-Za-z0-9]+)$/i);
        if (!themeCode) themeCode = m[1].toUpperCase();
        themeName = '';
      }

      if (!themeCode && testData?.title) {
        const matchTheme = testData.title.match(/Theme\s+([A-D0-9]+)/i) || testData.title.match(/Vocabulary\s+([A-D0-9]+)/i);
        if (matchTheme) themeCode = (matchTheme[1] || matchTheme[2]).toUpperCase();
      }

      if (!themeName && themeCode && THEME_NAMES[themeCode.toUpperCase()]) {
        themeName = THEME_NAMES[themeCode.toUpperCase()];
      }

      if (!themeName && testData?.title) {
        if (/Workplace/i.test(testData.title)) { themeName = 'Workplace'; if (!themeCode) themeCode = 'A'; }
        else if (/Tourism/i.test(testData.title)) { themeName = 'Tourism'; if (!themeCode) themeCode = 'B'; }
        else if (/CCU/i.test(testData.title)) { themeName = 'CCU'; if (!themeCode) themeCode = 'C'; }
        else if (/High-Frequency/i.test(testData.title)) { themeName = 'High-Frequency'; if (!themeCode) themeCode = 'D'; }
      }

      let displayTheme = themeName || (themeCode ? ('Theme ' + themeCode) : 'General');
      if (themeName) {
        displayTheme = `${themeName}`;
      }
      displayTheme = displayTheme.replace(/\bEESSENTIALS\b/gi, "ESSENTIALS");

      let displayTopic = snap?.topic || snap?.metadata?.topic || row?.topic_snapshot || '';
      if (!displayTopic && testData?.title) {
        const parts = testData.title.split('-');
        if (parts.length > 1) displayTopic = parts.slice(1).join('-').trim();
      }
      if (!displayTopic) displayTopic = 'Vocabulary Mastery';

      let displayType = snap?.word_type || snap?.metadata?.word_type || snap?.metadata?.type || snap?.type || row?.word_type_snapshot || snap?.question_type || row?.question_type_snapshot || '';
      if (!displayType) {
        const cat = testData?.payload?.category || '';
        if (cat === 'phrases' || testData?.title?.toLowerCase().includes('phrase')) displayType = 'Phrase';
        else displayType = 'Word';
      }

      let displayCategory = snap?.category || snap?.metadata?.category || row?.category_snapshot || testData?.payload?.category || '';
      if (!displayCategory) {
        const sub = (testData?.test_subtype || testData?.shell_code || testData?.test_type || '').toUpperCase();
        if (sub.includes('PHRASE')) displayCategory = 'phrases';
        else if (sub.includes('VOCAB') || sub.includes('WORD')) displayCategory = 'words';
      }
      if (!displayCategory && testData?.title) {
        if (/phrase/i.test(testData.title)) displayCategory = 'phrases';
        else if (/word|vocab/i.test(testData.title)) displayCategory = 'words';
      }
      if (!displayCategory && displayType) {
        const isPhrase = ['expression', 'idiom', 'proverb', 'phrase'].includes(displayType.toLowerCase());
        displayCategory = isPhrase ? 'phrases' : 'words';
      }
      if (snap?.section_label) {
        displayCategory = snap.section_label;
      } else if (snap?.test_section === 'phrases') {
        displayCategory = 'Part 2: Phrases';
      } else if (snap?.test_section === 'words') {
        displayCategory = 'Part 1: Words';
      } else if (displayCategory.toLowerCase() === 'phrases') displayCategory = 'Phrases';
      else if (displayCategory.toLowerCase() === 'words' || displayCategory.toLowerCase() === 'vocab') displayCategory = 'Words';
      else if (displayCategory) displayCategory = displayCategory.charAt(0).toUpperCase() + displayCategory.slice(1);
      else displayCategory = 'Vocabulary';

      const savedAnswer = answeredMap[row.id] || '';

      // CRITICAL FIX: Safely park virtual keyboard in document.body BEFORE clearing main,
      // preventing it from being destroyed when main.innerHTML = '' runs.
      const vk = getVirtualKeyboard();
      if (vk) {
        vk.style.display = 'none';
        if (vk.parentElement && vk.parentElement !== document.body) {
          document.body.appendChild(vk);
        }
      }

      const main = document.getElementById('test-main');
      main.innerHTML = '';
      main.className = 'test-main-content notranslate flex-1 flex flex-col items-center min-h-0 w-full mx-auto';
      main.setAttribute('translate', 'no');
      main.style.cssText = 'flex:1; display:flex; flex-direction:column; justify-content:flex-start; align-items:center; min-height:100%; height:100%; max-height:100%; overflow:hidden; width:100% !important; max-width:440px !important; margin:0 auto !important; padding:0; box-sizing:border-box; gap:6px;';

      // Preemptive translation check on question change
      const activeTrans = checkTranslationArtifacts();
      if (activeTrans) {
        handleTranslationDetected(activeTrans);
      }

      let answerArea, controlArea;
      const isWritten = (answerType === 'written');

      if (answerType === 'description') {
        // Description Mode: Strict 3 Equal-Sized Cards (Camera -> Answer Display -> Speech/Mic)
        main.style.cssText = 'flex:1; display:flex; flex-direction:column; justify-content:space-between; align-items:center; min-height:100%; height:100%; max-height:100%; overflow:hidden; width:100% !important; max-width:440px !important; margin:0 auto !important; padding:0; box-sizing:border-box; gap:10px;';
        renderDescription(main, row, savedAnswer, snap, idx);
      } else if (isWritten) {
        // 1. Metadata Grid (Unified height: Flex 1) — rendered ABOVE question box for context-first reading

        const metadataTable = document.createElement('div');
        metadataTable.className = 'w-full metadata-grid metadata-table notranslate';
        metadataTable.setAttribute('translate', 'no');
        metadataTable.style.cssText = 'width:100% !important; max-width:440px !important; flex:1 1 0 !important; min-height:32px !important; max-height:42px !important; display:grid; grid-template-columns:1fr 1fr; grid-template-rows:1fr 1fr; gap:3px; align-items:center; box-sizing:border-box; margin:0 auto !important;';
        metadataTable.innerHTML = `
          <!-- Row 1 Left: Theme name only -->
          <div style="height:100%; min-height:100%; max-height:100%; display:flex; align-items:center; justify-content:center; padding:0 8px; background:rgba(15, 23, 42, 0.75); border:1px solid rgba(255, 255, 255, 0.08); border-radius:6px; box-sizing:border-box; backdrop-filter:blur(10px);">
            <span style="color:#38bdf8; font-size:12px; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; width:100%; text-align:center;" title="${escapeHtml(displayTheme)}">${escapeHtml(displayTheme)}</span>
          </div>
          <!-- Row 1 Right: Category name only -->
          <div style="height:100%; min-height:100%; max-height:100%; display:flex; align-items:center; justify-content:center; padding:0 8px; background:rgba(15, 23, 42, 0.75); border:1px solid rgba(255, 255, 255, 0.08); border-radius:6px; box-sizing:border-box; backdrop-filter:blur(10px);">
            <span style="color:var(--grade-a); font-size:12px; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; width:100%; text-align:center;" title="${escapeHtml(displayCategory)}">${escapeHtml(displayCategory)}</span>
          </div>
          <!-- Row 2 Left: Topic name only -->
          <div style="height:100%; min-height:100%; max-height:100%; display:flex; align-items:center; justify-content:center; padding:0 8px; background:rgba(15, 23, 42, 0.75); border:1px solid rgba(255, 255, 255, 0.08); border-radius:6px; box-sizing:border-box; backdrop-filter:blur(10px);">
            <span style="color:#f8fafc; font-size:12px; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; width:100%; text-align:center;" title="${escapeHtml(displayTopic)}">${escapeHtml(displayTopic)}</span>
          </div>
          <!-- Row 2 Right: Type name only -->
          <div style="height:100%; min-height:100%; max-height:100%; display:flex; align-items:center; justify-content:center; padding:0 8px; background:rgba(15, 23, 42, 0.75); border:1px solid rgba(255, 255, 255, 0.08); border-radius:6px; box-sizing:border-box; backdrop-filter:blur(10px);">
            <span style="color:#cbd5e1; font-size:12px; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; width:100%; text-align:center;" title="${escapeHtml(displayType)}">${escapeHtml(displayType)}</span>
          </div>
        `;
        main.appendChild(metadataTable);

        // 2. Question Box (Unified Adaptive Specification: Flex 3)
        const questionBox = document.createElement('div');
        questionBox.id = 'question-box-prompt';
        questionBox.className = 'w-full flex flex-col question-box-prompt notranslate';
        questionBox.setAttribute('translate', 'no');
        questionBox.style.cssText = 'width:100% !important; max-width:440px !important; flex:3 1 0 !important; min-height:60px !important; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; overflow:hidden; box-sizing:border-box; padding:6px 14px; background:#ffffff !important; border:1.5px solid #e2e8f0 !important; border-radius:14px; box-shadow:0 4px 20px rgba(0, 0, 0, 0.12) !important; margin:0 auto !important;';
        questionBox.innerHTML = `
          <div class="speech-question-text notranslate" translate="no" style="font-size:20px; font-weight:800; color:#000000 !important; text-align:center; line-height:1.25; font-family:'Inter',sans-serif; width:100%; word-break:break-word; margin:auto; display:flex; align-items:center; justify-content:center; text-shadow:none !important;">
            ${escapeHtml(questionText)}
          </div>
        `;
        main.appendChild(questionBox);

        // 3. Answer Box (Flex 3: Matches questionBox 1:1)
        answerArea = document.createElement('div');
        answerArea.id = 'answer-container-written';
        answerArea.className = 'w-full flex flex-col justify-center items-center notranslate';
        answerArea.setAttribute('translate', 'no');
        answerArea.style.cssText = 'width:100% !important; max-width:440px !important; flex:3 1 0 !important; min-height:60px !important; display:flex; flex-direction:column; justify-content:center; align-items:center; overflow-y:auto; box-sizing:border-box; padding:6px 12px; background:#ffffff !important; border:1.5px solid #e2e8f0 !important; border-radius:12px; box-shadow:0 4px 20px rgba(0, 0, 0, 0.12) !important; position:relative; margin:0 auto !important;';
        main.appendChild(answerArea);

        // 4. Virtual Keyboard Container (Flex 3: Matches questionBox & answerArea 1:1)
        if (vk) {
          vk.style.display = 'flex';
          vk.style.cssText = 'width:100% !important; max-width:440px !important; flex:3 1 0 !important; min-height:110px !important; max-height:220px !important; margin:0 auto !important; box-sizing:border-box !important; display:flex !important; flex-direction:column !important; justify-content:space-between !important; padding:6px 4px !important; gap:4px !important; overflow:hidden !important;';
          main.appendChild(vk);
          controlArea = vk;
        }

        renderWritten(answerArea, controlArea, row, savedAnswer, snap, vk);
      } else {
        // 1. Metadata Grid (Unified height: Flex 1) — rendered ABOVE question box for context-first reading
        const metadataTable = document.createElement('div');
        metadataTable.className = 'w-full metadata-grid metadata-table notranslate';
        metadataTable.setAttribute('translate', 'no');
        metadataTable.style.cssText = 'width:100% !important; max-width:440px !important; flex:1 1 0 !important; min-height:32px !important; max-height:42px !important; display:grid; grid-template-columns:1fr 1fr; grid-template-rows:1fr 1fr; gap:3px; align-items:center; box-sizing:border-box; margin:0 auto !important;';
        metadataTable.innerHTML = `
          <div style="height:100%; min-height:100%; max-height:100%; display:flex; align-items:center; justify-content:center; padding:0 8px; background:rgba(15, 23, 42, 0.75); border:1px solid rgba(255, 255, 255, 0.08); border-radius:6px; box-sizing:border-box; backdrop-filter:blur(10px);">
            <span style="color:#38bdf8; font-size:12px; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; width:100%; text-align:center;" title="${escapeHtml(displayTheme)}">${escapeHtml(displayTheme)}</span>
          </div>
          <div style="height:100%; min-height:100%; max-height:100%; display:flex; align-items:center; justify-content:center; padding:0 8px; background:rgba(15, 23, 42, 0.75); border:1px solid rgba(255, 255, 255, 0.08); border-radius:6px; box-sizing:border-box; backdrop-filter:blur(10px);">
            <span style="color:var(--grade-a); font-size:12px; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; width:100%; text-align:center;" title="${escapeHtml(displayCategory)}">${escapeHtml(displayCategory)}</span>
          </div>
          <div style="height:100%; min-height:100%; max-height:100%; display:flex; align-items:center; justify-content:center; padding:0 8px; background:rgba(15, 23, 42, 0.75); border:1px solid rgba(255, 255, 255, 0.08); border-radius:6px; box-sizing:border-box; backdrop-filter:blur(10px);">
            <span style="color:#f8fafc; font-size:12px; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; width:100%; text-align:center;" title="${escapeHtml(displayTopic)}">${escapeHtml(displayTopic)}</span>
          </div>
          <div style="height:100%; min-height:100%; max-height:100%; display:flex; align-items:center; justify-content:center; padding:0 8px; background:rgba(15, 23, 42, 0.75); border:1px solid rgba(255, 255, 255, 0.08); border-radius:6px; box-sizing:border-box; backdrop-filter:blur(10px);">
            <span style="color:#cbd5e1; font-size:12px; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; width:100%; text-align:center;" title="${escapeHtml(displayType)}">${escapeHtml(displayType)}</span>
          </div>
        `;
        main.appendChild(metadataTable);

        // 2. Question Box (Unified Adaptive Specification: Flex 3)
        const questionBox = document.createElement('div');
        questionBox.id = 'question-box-prompt';
        questionBox.className = 'w-full flex flex-col question-box-prompt notranslate';
        questionBox.setAttribute('translate', 'no');
        questionBox.style.cssText = 'width:100% !important; max-width:440px !important; flex:3 1 0 !important; min-height:60px !important; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; overflow:hidden; box-sizing:border-box; padding:6px 14px; background:#ffffff !important; border:1.5px solid #e2e8f0 !important; border-radius:14px; box-shadow:0 4px 20px rgba(0, 0, 0, 0.12) !important; margin:0 auto !important;';
        questionBox.innerHTML = `
          <div class="speech-question-text notranslate" translate="no" style="font-size:20px; font-weight:800; color:#000000 !important; text-align:center; line-height:1.25; font-family:'Inter',sans-serif; width:100%; word-break:break-word; margin:auto; display:flex; align-items:center; justify-content:center; text-shadow:none !important;">
            ${escapeHtml(questionText)}
          </div>
        `;
        main.appendChild(questionBox);

        if (answerType === 'speech_to_text' || answerType === 'spoken') {
          // 3. Speaking Answer Transcript Box (Flex 3: Matches questionBox 1:1)
          answerArea = document.createElement('div');
          answerArea.id = 'speech-answer-container';
          answerArea.className = 'w-full flex flex-col justify-between';
          answerArea.style.cssText = 'width:100% !important; max-width:440px !important; flex:3 1 0 !important; min-height:60px !important; overflow-y:auto; margin:0 auto !important; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:6px 12px; background:#ffffff !important; border:1.5px solid #e2e8f0 !important; border-radius:14px; box-shadow:0 4px 20px rgba(0, 0, 0, 0.12) !important; box-sizing:border-box; position:relative;';
          main.appendChild(answerArea);

          // 4. Speaking Mic Control Panel (Flex 3: Matches questionBox & answerArea 1:1)
          controlArea = document.createElement('div');
          controlArea.id = 'speech-control-container';
          controlArea.className = 'w-full flex flex-col items-center justify-center speech-mic-panel';
          controlArea.style.cssText = 'width:100% !important; max-width:440px !important; flex:3 1 0 !important; min-height:70px !important; margin:0 auto !important; padding:6px 16px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; background:linear-gradient(180deg, rgba(15, 23, 42, 0.65) 0%, rgba(10, 16, 30, 0.85) 100%); border:1px solid rgba(255, 255, 255, 0.08); border-radius:14px; box-shadow:0 8px 24px rgba(0, 0, 0, 0.35); backdrop-filter:blur(14px); box-sizing:border-box; position:relative;';
          main.appendChild(controlArea);

          renderSpeech(answerArea, controlArea, row, savedAnswer, snap);
        } else if (answerType === 'multiple_choice' || answerType === 'selection') {
          // 3. Multiple Choice Options Container (Flex 6: Full options area)
          answerArea = document.createElement('div');
          answerArea.id = 'answer-container-mc';
          answerArea.className = 'w-full flex flex-col';
          answerArea.style.cssText = 'width:100% !important; max-width:440px !important; flex:6 1 0 !important; min-height:28px !important; overflow-y:auto; margin:0 auto !important; display:flex; flex-direction:column; justify-content:space-between; gap:clamp(4px, 0.8vh, 8px); padding:13px 8px; background:linear-gradient(180deg, rgba(20, 32, 58, 0.75) 0%, rgba(13, 20, 36, 0.9) 100%); border:1px solid rgba(255, 255, 255, 0.12); border-radius:14px; -webkit-overflow-scrolling:touch; box-sizing:border-box; box-shadow:0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08); backdrop-filter:blur(16px); margin-bottom:6px !important;';
          main.appendChild(answerArea);

          renderMC(answerArea, row, savedAnswer, snap);
        } else {
          // 3. Phrase Chips Container (Flex 6: Full chips area)
          answerArea = document.createElement('div');
          answerArea.id = 'answer-container-chips';
          answerArea.className = 'w-full flex flex-col';
          answerArea.style.cssText = 'width:100% !important; max-width:440px !important; flex:6 1 0 !important; min-height:28px !important; overflow-y:auto; margin:0 auto !important; display:flex; flex-direction:column; justify-content:space-between; gap:clamp(4px, 0.8vh, 8px); padding:13px 8px; background:linear-gradient(180deg, rgba(20, 32, 58, 0.75) 0%, rgba(13, 20, 36, 0.9) 100%); border:1px solid rgba(255, 255, 255, 0.12); border-radius:14px; -webkit-overflow-scrolling:touch; box-sizing:border-box; box-shadow:0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08); backdrop-filter:blur(16px); margin-bottom:6px !important;';
          main.appendChild(answerArea);

          renderPhraseChips(answerArea, row, savedAnswer, snap);
        }
      }

      const bottomBar = document.querySelector('.bottom-nav-bar');
      if (bottomBar) bottomBar.style.display = 'flex';

      const bottomPrev = document.getElementById('bottom-prev-btn');
      const bottomNext = document.getElementById('bottom-next-btn');
      if (bottomPrev) {
        const canGoPrev = (idx > 0) || (currentSectionIndex > 0);
        bottomPrev.disabled = !canGoPrev;
        bottomPrev.onclick = async () => {
          cancelMcAutoAdvance();
          abortActiveSpeechSession();
          saveCurrentAnswer();
          await syncLiveSessionModality();
          if (idx > 0) {
            renderQuestion(idx - 1);
          } else if (currentSectionIndex > 0) {
            // Smoothly jump back to the last question of previous section
            startSection(currentSectionIndex - 1, -1);
          }
        };
      }
      if (bottomNext) {
        const isLast = (idx === answerRows.length - 1);
        const isLastSection = (currentSectionIndex === testsections.length - 1);
        if (isLast) {
          if (isLastSection) {
            bottomNext.textContent = 'Submit';
            bottomNext.className = 'btn-nav-next is-submit';
            bottomNext.style.background = '';
            bottomNext.style.color = '';
            bottomNext.style.borderColor = '';
            bottomNext.onclick = () => {
              cancelMcAutoAdvance();
              abortActiveSpeechSession();
              saveCurrentAnswer();
              openSubmitModal();
            };
          } else {
            bottomNext.innerHTML = `Next Sec ${getSvgIcon('arrow-right', 14)}`;
            bottomNext.className = 'btn-nav-next is-next-sec';
            bottomNext.style.background = '';
            bottomNext.style.color = '';
            bottomNext.style.borderColor = '';
            bottomNext.onclick = async () => {
              cancelMcAutoAdvance();
              abortActiveSpeechSession();
              await nextSection();
            };
          }
        } else {
          bottomNext.innerHTML = `Next ${getSvgIcon('arrow-right', 14)}`;
          bottomNext.className = 'btn-nav-next';
          bottomNext.style.background = '';
          bottomNext.style.color = '';
          bottomNext.style.borderColor = '';
          bottomNext.onclick = async () => {
            cancelMcAutoAdvance();
            abortActiveSpeechSession();
            saveCurrentAnswer();
            await syncLiveSessionModality();
            if (idx < answerRows.length - 1) {
              renderQuestion(idx + 1);
            }
          };
        }
      }
      updateNavGrid();
    }
    window.renderQuestion = renderQuestion;

    // Visual Testing & Catalog Harness Hook (Zero-mutation instant scenario rendering)
    window.__renderTestScenario = function(scenario) {
      document.getElementById('loading-overlay')?.classList.add('hidden');
      document.getElementById('pre-exam-focus-modal')?.classList.add('hidden');
      document.getElementById('fullscreen-pause-modal')?.classList.add('hidden');

      testData = scenario.testData || { title: 'Test', status: 'PUBLISHED' };
      const formattedScenario = formatTestDisplay(testData);
      testDisplayName = formattedScenario.line1 || testData.title || 'Test';
      allAnswerRows = scenario.rows || [scenario.row];
      answerRows = scenario.rows || [scenario.row];
      testsections = scenario.sections || [{ id: 'default', title: 'Part 1: Test' }];
      currentSectionIndex = 0;
      isTestActive = true;

      const titleEl = document.getElementById('test-title') || document.getElementById('test-main-title') || document.getElementById('test-name');
      if (titleEl) titleEl.textContent = testDisplayName;
      const subEl = document.getElementById('test-title-sub');
      if (subEl) {
        if (formattedScenario.line2) {
          subEl.textContent = formattedScenario.line2;
          subEl.setAttribute('title', formattedScenario.line2);
          subEl.style.display = 'block';
        } else {
          subEl.style.display = 'none';
        }
      }
      const progressEl = document.getElementById('question-progress');
      if (progressEl) progressEl.textContent = `Q 1/${answerRows.length}`;
      const timerEl = document.getElementById('timer-display');
      if (timerEl) timerEl.textContent = '14:59';
      const metaEl = document.getElementById('test-meta');
      if (metaEl) metaEl.textContent = `${answerRows.length} Questions · Student`;

      renderQuestion(0);
    };

    function renderUnansweredPanel(container, currentIdx) {
      container.innerHTML = '';
      const unanswered = answerRows.map((r, i) => ({ r, i })).filter(({ r }) => !hasAnswer(answeredMap[r.id]));
      if (unanswered.length === 0) {
        container.innerHTML = `<div class="speech-unanswered-panel" style="border-color:rgba(52,211,153,0.25);background:rgba(52,211,153,0.06);"><div class="speech-all-answered-msg">All ${answerRows.length} questions answered!</div></div>`;
        return;
      }
      const panel = document.createElement('div');
      panel.className = 'speech-unanswered-panel';
      panel.innerHTML = `<div class="speech-unanswered-title">${unanswered.length} unanswered — tap to jump</div><div class="speech-unanswered-chips" id="unanswered-chips"></div>`;
      container.appendChild(panel);
      const chipsEl = panel.querySelector('#unanswered-chips');
      unanswered.forEach(({ i }) => {
        const chip = document.createElement('button');
        chip.className = 'speech-unanswered-chip' + (i === currentIdx ? ' current' : '');
        chip.textContent = i + 1;
        chip.addEventListener('click', async () => {
          saveCurrentAnswer();
          await syncLiveSessionModality();
          renderQuestion(i);
        });
        chipsEl.appendChild(chip);
      });
    }

    function parseSnapshotOptions(rawOptions) {
      if (Array.isArray(rawOptions)) return rawOptions;
      if (!rawOptions) return [];
      if (typeof rawOptions === 'string') {
        const trimmed = rawOptions.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) return parsed;
          } catch (_) {}
        }
        if (/[;/|]/.test(trimmed)) return trimmed.split(/[;/|]/).map(s => s.trim()).filter(Boolean);
        return trimmed.split(',').map(s => s.trim()).filter(Boolean);
      }
      return [];
    }

    function renderMC(area, row, savedAnswer, snap = {}) {
      const rawOptions = parseSnapshotOptions(snap.options_snapshot || row.options_snapshot);
      let options = [...rawOptions];

      // Dynamic Distractor Self-Healing:
      // If snapshot options are empty (e.g. attempt initialized prior to modality selection),
      // dynamically construct distractors from other questions in this attempt
      if (options.length === 0) {
        const accepted = snap?.accepted_answers || snap?.accepted_answers_snapshot || row?.accepted_answers_snapshot || row?.accepted_answers;
        const correctOpt = Array.isArray(accepted) ? accepted[0] : (snap?.correct_answer || row?.correct_answer_snapshot || row?.correct_answer || '');
        if (correctOpt) {
          const pool = [];
          (allAnswerRows || []).forEach(r => {
            const s = typeof r.question_snapshot === 'string' ? (() => { try { return JSON.parse(r.question_snapshot); } catch(_) { return {}; } })() : (r.question_snapshot || {});
            const acc = s.accepted_answers || s.accepted_answers_snapshot || r.accepted_answers_snapshot || r.accepted_answers;
            const cand = Array.isArray(acc) ? acc[0] : (s.correct_answer || r.correct_answer_snapshot || '');
            if (cand && cand !== correctOpt && !pool.includes(cand)) {
              pool.push(cand);
            }
          });
          pool.sort(() => 0.5 - Math.random());
          const distractors = pool.slice(0, 4);
          options = [correctOpt, ...distractors].sort(() => 0.5 - Math.random());
        }
      }

      if (options.length > 5) {
        const correctOpt = snap?.correct_answer || row.correct_answer_snapshot || row.correct_answer;
        let correctItem = options.find(o => (typeof o === 'string' ? o : o.text || o.value) === correctOpt);
        if (!correctItem && options.length > 0) correctItem = options[0];
        let distractors = options.filter(o => o !== correctItem).sort(() => 0.5 - Math.random()).slice(0, 4);
        options = correctItem ? [...distractors, correctItem] : distractors;
      }
      options = options.sort(() => 0.5 - Math.random());

      const letters = ['A','B','C','D','E','F','G','H','I','J'];
      options.forEach((opt, i) => {
        const optText = typeof opt === 'string' ? opt : opt.text || opt.value || JSON.stringify(opt);
        const isSelected = (savedAnswer === optText);
        const btn = document.createElement('div');
        btn.className = `mc-option ${isSelected ? 'selected' : ''}`;
        btn.setAttribute('role', 'radio');
        btn.setAttribute('aria-checked', isSelected ? 'true' : 'false');
        btn.setAttribute('tabindex', '0');
        btn.style.cssText = `min-height:38px; height:clamp(38px, 5.5vh, 50px); display:flex; align-items:center; gap:10px; padding:4px 10px; border-radius:10px; border:${isSelected ? '1.5px solid #06b6d4' : '1px solid rgba(255,255,255,0.08)'}; background:${isSelected ? 'linear-gradient(135deg, rgba(6,182,212,0.2) 0%, rgba(16, 185, 129, 0.2) 100%)' : 'rgba(255,255,255,0.04)'}; color:${isSelected ? '#ffffff' : '#e2e8f0'}; cursor:pointer; font-size:12px; font-weight:600; box-sizing:border-box; transition:all 0.15s ease; box-shadow:${isSelected ? '0 0 16px rgba(6,182,212,0.25)' : '0 2px 6px rgba(0,0,0,0.2)'}; -webkit-tap-highlight-color:transparent; flex-shrink:0;`;

        btn.innerHTML = `<div class="mc-letter" style="background:${isSelected ? '#06b6d4' : 'rgba(255,255,255,0.08)'}; color:${isSelected ? '#000000' : '#94a3b8'}; border-radius:8px; width:24px; height:24px; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:12px; font-weight:800;">${letters[i] || i+1}</div><div style="flex:1; white-space:normal; word-break:break-word; line-height:1.25; text-align:left;">${optText}</div>`;

        btn.addEventListener('click', () => {
          area.querySelectorAll('.mc-option').forEach(o => {
            o.classList.remove('selected');
            o.setAttribute('aria-checked', 'false');
            o.style.border = '1px solid rgba(255,255,255,0.08)';
            o.style.background = 'rgba(255,255,255,0.04)';
            o.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
            o.style.color = '#e2e8f0';
            const letterEl = o.querySelector('.mc-letter');
            if (letterEl) { letterEl.style.background = 'rgba(255,255,255,0.08)'; letterEl.style.color = '#94a3b8'; }
          });
          btn.classList.add('selected');
          btn.setAttribute('aria-checked', 'true');
          btn.style.border = '1.5px solid #06b6d4';
          btn.style.background = 'linear-gradient(135deg, rgba(6,182,212,0.2) 0%, rgba(16, 185, 129, 0.2) 100%)';
          btn.style.boxShadow = '0 0 16px rgba(6,182,212,0.25)';
          btn.style.color = '#ffffff';
          const activeLetter = btn.querySelector('.mc-letter');
          if (activeLetter) { activeLetter.style.background = '#06b6d4'; activeLetter.style.color = '#000000'; }

          answeredMap[row.id] = optText;
          updateActiveChipOnly(row.id, optText);
          scheduleDebouncedAutoSave(row.id, optText, 400);
          scheduleMcAutoAdvance(400);
        });
        area.appendChild(btn);
      });
    }

    function renderPhraseChips(area, row, savedAnswer, snap = {}) {
      const rawOptions = parseSnapshotOptions(snap.options_snapshot || row.options_snapshot);
      let options = [...rawOptions];
      if (options.length > 5) {
        const correctOpt = snap?.correct_answer || row.correct_answer_snapshot || row.correct_answer;
        let correctItem = options.find(o => (typeof o === 'string' ? o : o.text || o.value) === correctOpt);
        if (!correctItem && options.length > 0) correctItem = options[0];
        let distractors = options.filter(o => o !== correctItem).sort(() => 0.5 - Math.random()).slice(0, 4);
        options = correctItem ? [...distractors, correctItem] : distractors;
      }
      options = options.sort(() => 0.5 - Math.random());
      options.forEach((opt, i) => {
        const optText = typeof opt === 'string' ? opt : opt.text || opt.value || JSON.stringify(opt);
        const isSelected = (savedAnswer === optText);
        const btn = document.createElement('div');
        btn.className = `mc-option ${isSelected ? 'selected' : ''}`;
        btn.setAttribute('role', 'radio');
        btn.setAttribute('aria-checked', isSelected ? 'true' : 'false');
        btn.style.cssText = `min-height:38px; height:clamp(38px, 5.5vh, 50px); display:flex; align-items:center; justify-content:center; padding:4px 10px; border-radius:10px; border:${isSelected ? '1.5px solid #06b6d4' : '1px solid rgba(255,255,255,0.08)'}; background:${isSelected ? 'linear-gradient(135deg, rgba(6,182,212,0.2) 0%, rgba(16, 185, 129, 0.2) 100%)' : 'rgba(255,255,255,0.04)'}; color:${isSelected ? '#ffffff' : '#e2e8f0'}; font-weight:600; font-size:12px; cursor:pointer; text-align:center; box-sizing:border-box; transition:all 0.15s ease; box-shadow:${isSelected ? '0 0 16px rgba(6,182,212,0.25)' : '0 2px 6px rgba(0,0,0,0.2)'}; flex-shrink:0;`;
        btn.innerHTML = `<div style="flex:1; white-space:normal; word-break:break-word; line-height:1.25;">${optText}</div>`;
        btn.addEventListener('click', () => {
          area.querySelectorAll('.mc-option').forEach(o => {
            o.classList.remove('selected');
            o.setAttribute('aria-checked', 'false');
            o.style.border = '1px solid rgba(255,255,255,0.08)';
            o.style.background = 'rgba(255,255,255,0.04)';
            o.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
            o.style.color = '#e2e8f0';
          });
          btn.classList.add('selected');
          btn.setAttribute('aria-checked', 'true');
          btn.style.border = '1.5px solid #06b6d4';
          btn.style.background = 'linear-gradient(135deg, rgba(6,182,212,0.2) 0%, rgba(16,185,129,0.2) 100%)';
          btn.style.boxShadow = '0 0 16px rgba(6,182,212,0.25)';
          btn.style.color = '#ffffff';
          answeredMap[row.id] = optText;
          updateActiveChipOnly(row.id, optText);
          scheduleDebouncedAutoSave(row.id, optText, 400);
          scheduleMcAutoAdvance(400);
        });
        area.appendChild(btn);
      });
    }


    function getTargetPhraseWordCount(snap = {}, row = {}) {
      const ans = (snap?.correct_answer || snap?.answer || row?.correct_answer_snapshot || '').trim();
      if (!ans) return 0;
      const primary = ans.split(/[;/,|]/)[0].trim();
      const words = primary.split(/\s+/).filter(Boolean).length;
      return words >= 2 ? words : 0;
    }

    function renderWritten(area, controlArea, row, savedAnswer, snap = {}, vk) {
      area.innerHTML = '';
      area.style.display = 'flex';
      area.style.flexDirection = 'column';
      area.style.alignItems = 'center';
      area.style.justifyContent = 'center';
      area.style.cursor = 'text';

      const ta = document.createElement('textarea');
      ta.className = 'written-input';
      ta.style.cssText = 'width:100%; height:100%; min-height:0; background:transparent; border:none; color:#000000 !important; font-size:20px; font-weight:800; text-align:center; resize:none; outline:none; font-family:\'Inter\',sans-serif; padding:4px 0; margin:auto; line-height:1.25; display:flex; align-items:center; justify-content:center; box-sizing:border-box; text-shadow:none !important;';
      ta.id = `written-${row.id}`;
      ta.placeholder = 'Type here...';
      ta.value = savedAnswer || '';
      ta.rows = 1;
      ta.setAttribute('readonly', 'true');
      ta.setAttribute('inputmode', 'none');
      ta.setAttribute('autocomplete', 'off');
      ta.setAttribute('autocorrect', 'off');
      ta.setAttribute('autocapitalize', 'off');
      ta.setAttribute('spellcheck', 'false');
      ta.addEventListener('paste', e => e.preventDefault());
      ta.addEventListener('copy', e => e.preventDefault());
      ta.addEventListener('cut', e => e.preventDefault());
      ta.addEventListener('contextmenu', e => e.preventDefault());

      area.appendChild(ta);

      // Phrase Progress Word-Counter (Pilar 2 Enhancement)
      const targetPhraseWords = getTargetPhraseWordCount(snap, row);
      let wordCounter = null;
      let updateWordCount = null;
      if (targetPhraseWords >= 2) {
        wordCounter = document.createElement('div');
        wordCounter.className = 'phrase-word-counter';
        wordCounter.style.cssText = 'font-size:12px; font-weight:700; color:#475569; margin-top:2px; display:inline-flex; align-items:center; gap:5px; padding:2px 8px; border-radius:6px; background:#f1f5f9; border:1px solid #cbd5e1;';
        updateWordCount = (val) => {
          const words = (val || '').trim().split(/\s+/).filter(Boolean).length;
          const isDone = words >= targetPhraseWords;
          wordCounter.innerHTML = `<span style="color:${isDone ? 'var(--clr-success)' : '#0284c7'}; font-weight:800;">${words}</span> / ${targetPhraseWords} words`;
        };
        updateWordCount(ta.value);
        area.appendChild(wordCounter);
      }

      // Task Practice Scaffolding: First-Letter Hint (Tasks only, strictly disabled for Exams)
      const isTaskPractice = !(String(testData?.test_type).toLowerCase() === 'exam' || ['EXAM', 'TEST'].includes(testData?.category));
      const targetAns = (snap?.correct_answer || snap?.answer || row?.correct_answer_snapshot || '').trim();
      const primaryTarget = targetAns.split(/[;/,|]/)[0].trim();
      if (isTaskPractice && primaryTarget.length >= 3) {
        const hintBtn = document.createElement('button');
        hintBtn.type = 'button';
        hintBtn.className = 'task-hint-btn';
        hintBtn.innerHTML = 'Hint';
        hintBtn.title = 'Get first-letter clue (Task practice only)';
        hintBtn.style.cssText = 'font-size:12px; font-weight:700; color:#854d0e; background:#fef08a; border:1px solid #ca8a04; border-radius:6px; padding:2px 10px; cursor:pointer; margin-top:4px; transition:all 0.2s;';

        const hintDisplay = document.createElement('div');
        hintDisplay.style.cssText = 'font-size:12px; font-weight:800; letter-spacing:0.18em; color:#854d0e; margin-top:3px; display:none;';
        const mask = primaryTarget.split(' ').map(w => {
          if (w.length <= 2) return w;
          return w[0].toUpperCase() + ' ' + '_ '.repeat(w.length - 1).trim();
        }).join('   ');
        hintDisplay.textContent = mask;

        hintBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          hintDisplay.style.display = 'block';
          hintBtn.style.display = 'none';
        });

        area.appendChild(hintBtn);
        area.appendChild(hintDisplay);
      }

      area.addEventListener('click', () => {
        ta.focus();
        window.activeKeyboardInput = ta;
      });

      window.activeKeyboardInput = ta;

      ta.addEventListener('input', () => {
        answeredMap[row.id] = ta.value;
        if (wordCounter && typeof updateWordCount === 'function') {
          updateWordCount(ta.value);
        }
        updateActiveChipOnly(row.id, ta.value);
        scheduleDebouncedAutoSave(row.id, ta.value, 800);
      });
      ta.addEventListener('focus', () => {
        window.activeKeyboardInput = ta;
      });
      ta.addEventListener('blur', () => {
        persistLocalBuffer();
        autoSave(row.id, ta.value);
      });
    }

    function renderDescription(main, row, savedAnswer, snap = {}, questionIdx = 0) {
      stopActiveCameraStream();

      // Determine Target Demonstrative:
      // 1-5 (idx 0-4): this
      // 6-10 (idx 5-9): that
      // 11-15 (idx 10-14): these
      // 16-20 (idx 15-19): those
      let targetDemo = 'this';
      if (snap?.target_demonstrative) {
        targetDemo = String(snap.target_demonstrative).toLowerCase().trim();
      } else if (snap?.correct_answer && ['this', 'that', 'these', 'those'].includes(String(snap.correct_answer).toLowerCase().trim())) {
        targetDemo = String(snap.correct_answer).toLowerCase().trim();
      } else if (questionIdx >= 15) {
        targetDemo = 'those';
      } else if (questionIdx >= 10) {
        targetDemo = 'these';
      } else if (questionIdx >= 5) {
        targetDemo = 'that';
      } else {
        targetDemo = 'this';
      }

      const isSingular = (targetDemo === 'this' || targetDemo === 'that');
      const targetLabel = targetDemo.toUpperCase();
      const formulaPattern = isSingular ? `${targetLabel} IS A/AN [3 ADJECTIVES] [NOUN]` : `${targetLabel} ARE [3 ADJECTIVES] [NOUNS]`;
      const placeholderExample = isSingular ? `${targetDemo} is a small shiny red car` : `${targetDemo} are small shiny red cars`;
      const existingPhoto = window._capturedPhotos[row.id] || null;

      // =========================================================================
      // CARD 1: CAMERA & PHOTO CARD (Icon Camera -> Snap/Upload -> Photo Appears Here)
      // =========================================================================
      const card1 = document.createElement('div');
      card1.id = `desc-camera-card-${row.id}`;
      card1.className = 'desc-card desc-card-camera notranslate';
      card1.setAttribute('translate', 'no');
      card1.style.cssText = 'width:100% !important; max-width:440px !important; flex:1 1 0 !important; min-height:0 !important; margin:0 auto !important; box-sizing:border-box !important; background:linear-gradient(180deg, rgba(15, 23, 42, 0.85) 0%, rgba(10, 16, 30, 0.98) 100%) !important; border:1.5px solid rgba(56, 189, 248, 0.3) !important; border-radius:12px; display:flex; flex-direction:column; align-items:center; justify-content:center; position:relative; overflow:hidden; padding:6px; box-shadow:0 4px 16px rgba(0,0,0,0.3);';

      // Header Tag: Object number & target demonstrative
      const objBadge = document.createElement('div');
      objBadge.style.cssText = 'position:absolute; top:6px; left:8px; z-index:10; font-size:12px; font-weight:800; color:#38bdf8; background:rgba(15, 23, 42, 0.85); border:1px solid rgba(56, 189, 248, 0.4); border-radius:6px; padding:2px 8px; pointer-events:none;';
      objBadge.textContent = `Object #${snap?.display_order || questionIdx + 1} (${targetLabel})`;
      card1.appendChild(objBadge);

      // Hidden file input for camera/file fallback
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.capture = 'environment';
      fileInput.style.display = 'none';
      card1.appendChild(fileInput);

      // Live Video element
      const videoEl = document.createElement('video');
      videoEl.autoplay = true;
      videoEl.playsInline = true;
      videoEl.muted = true;
      videoEl.style.cssText = 'width:100%; height:100%; object-fit:cover; border-radius:8px; display:none; background:#000;';
      card1.appendChild(videoEl);

      // Captured Image Preview element
      const previewImg = document.createElement('img');
      previewImg.style.cssText = 'width:100%; height:100%; object-fit:cover; border-radius:8px; display:none; border:2px solid var(--grade-a);';
      previewImg.alt = 'Captured Object';
      card1.appendChild(previewImg);

      // Idle State Container (Centered Icon Camera & Action Buttons)
      const idleState = document.createElement('div');
      idleState.style.cssText = 'display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; width:100%; height:100%; cursor:pointer;';
      idleState.innerHTML = `
        <div style="width:42px; height:42px; border-radius:50%; background:rgba(56, 189, 248, 0.15); border:1.5px solid #38bdf8; display:flex; align-items:center; justify-content:center; color:#38bdf8;">
          ${getSvgIcon('camera', 22)}
        </div>
        <div style="font-size:12px; font-weight:700; color:#f8fafc; text-align:center;">
          Tap to Open Camera
        </div>
        <div style="display:flex; align-items:center; gap:6px; margin-top:2px;">
          <button type="button" class="btn-cam-open-trigger" style="padding:4px 12px; border-radius:6px; border:1px solid #38bdf8; background:linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color:#fff; font-size:12px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:4px;">
            ${getSvgIcon('camera', 13)} Take Photo
          </button>
          <button type="button" class="btn-cam-upload-trigger" style="padding:4px 8px; border-radius:6px; border:1px solid rgba(255,255,255,0.15); background:rgba(255,255,255,0.06); color:#94a3b8; font-size:12px; font-weight:600; cursor:pointer;">
            Upload
          </button>
        </div>
      `;
      card1.appendChild(idleState);

      // Live Viewfinder Controls Bar (shown when camera is streaming)
      const liveControls = document.createElement('div');
      liveControls.style.cssText = 'position:absolute; bottom:8px; left:0; width:100%; display:none; align-items:center; justify-content:center; gap:8px; z-index:10;';
      const snapBtn = document.createElement('button');
      snapBtn.type = 'button';
      snapBtn.style.cssText = 'padding:6px 14px; border-radius:6px; border:1px solid var(--grade-a); background:linear-gradient(135deg, var(--grade-a) 0%, #009900 100%); color:#0f172a; font-size:12px; font-weight:800; cursor:pointer; display:flex; align-items:center; gap:6px; box-shadow:0 4px 12px rgba(0,0,0,0.4);';
      snapBtn.innerHTML = `${getSvgIcon('check-circle', 14)} Snap Frame`;
      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.style.cssText = 'padding:6px 10px; border-radius:6px; border:1px solid rgba(255,255,255,0.25); background:rgba(15, 23, 42, 0.85); color:#cbd5e1; font-size:12px; font-weight:600; cursor:pointer;';
      cancelBtn.textContent = 'Cancel';
      liveControls.appendChild(snapBtn);
      liveControls.appendChild(cancelBtn);
      card1.appendChild(liveControls);

      // Captured State Overlay (Badge & Retake button)
      const capturedBadge = document.createElement('div');
      capturedBadge.style.cssText = 'position:absolute; top:6px; right:8px; z-index:10; font-size:12px; font-weight:800; color:var(--grade-a); background:rgba(15, 23, 42, 0.85); border:1px solid var(--grade-a); border-radius:6px; padding:2px 8px; display:none; pointer-events:none;';
      capturedBadge.innerHTML = `<span style="display:inline-flex; align-items:center; gap:4px;">${getSvgIcon('check-circle', 12)} Captured</span>`;
      card1.appendChild(capturedBadge);

      const retakeBtn = document.createElement('button');
      retakeBtn.type = 'button';
      retakeBtn.style.cssText = 'position:absolute; bottom:6px; right:8px; z-index:10; font-size:12px; font-weight:700; color:#fff; background:rgba(15, 23, 42, 0.85); border:1px solid rgba(255,255,255,0.25); border-radius:6px; padding:3px 8px; cursor:pointer; display:none; align-items:center; gap:4px;';
      retakeBtn.innerHTML = `${getSvgIcon('camera', 12)} Retake`;
      card1.appendChild(retakeBtn);

      main.appendChild(card1);

      // Helper to toggle photo states in Card 1
      const updatePhotoView = (dataUrl, isInitial = false) => {
        if (dataUrl) {
          window._capturedPhotos[row.id] = dataUrl;
          if (typeof attemptData !== 'undefined' && attemptData?.id) {
            try {
              localStorage.setItem(`topscore_photo_${attemptData.id}_${row.id}`, dataUrl);
              sessionStorage.setItem(`topscore_photo_${row.id}`, dataUrl);
            } catch (_) {}
          }
          stopActiveCameraStream();
          videoEl.style.display = 'none';
          liveControls.style.display = 'none';
          idleState.style.display = 'none';
          previewImg.src = dataUrl;
          previewImg.style.display = 'block';
          capturedBadge.style.display = 'block';
          retakeBtn.style.display = 'flex';
          card1.style.borderColor = 'var(--grade-a)';
          card1.style.boxShadow = '0 0 16px rgba(0, 192, 0, 0.35)';
          if (!isInitial) {
            playCameraShutterSound();
            triggerHapticFeedback([40]);
          }
        } else {
          stopActiveCameraStream();
          videoEl.style.display = 'none';
          liveControls.style.display = 'none';
          previewImg.style.display = 'none';
          capturedBadge.style.display = 'none';
          retakeBtn.style.display = 'none';
          idleState.style.display = 'flex';
          card1.style.borderColor = 'rgba(56, 189, 248, 0.3)';
          card1.style.boxShadow = '0 4px 16px rgba(0,0,0,0.3)';
        }
      };

      const startCamera = async () => {
        try {
          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: { ideal: 'environment' } },
              audio: false
            });
            window._activeCameraStream = stream;
            videoEl.srcObject = stream;
            idleState.style.display = 'none';
            previewImg.style.display = 'none';
            capturedBadge.style.display = 'none';
            retakeBtn.style.display = 'none';
            videoEl.style.display = 'block';
            liveControls.style.display = 'flex';
          } else {
            fileInput.click();
          }
        } catch (err) {
          console.warn('getUserMedia unavailable, falling back to camera input:', err);
          fileInput.click();
        }
      };

      idleState.addEventListener('click', (e) => {
        if (e.target.closest('.btn-cam-upload-trigger')) {
          fileInput.click();
        } else {
          startCamera();
        }
      });
      retakeBtn.addEventListener('click', () => startCamera());
      cancelBtn.addEventListener('click', () => {
        updatePhotoView(window._capturedPhotos[row.id] || null);
      });
      snapBtn.addEventListener('click', () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = videoEl.videoWidth || 640;
          canvas.height = videoEl.videoHeight || 480;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          updatePhotoView(dataUrl);
        } catch (err) {
          console.error('Snapshot failed:', err);
          fileInput.click();
        }
      });
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => updatePhotoView(ev.target.result);
          reader.readAsDataURL(file);
        }
      });

      // =========================================================================
      // CARD 2: ANSWER DISPLAY CARD (Formula Pattern + Answer Box + Validator)
      // =========================================================================
      const card2 = document.createElement('div');
      card2.id = `desc-answer-card-${row.id}`;
      card2.className = 'desc-card desc-card-answer notranslate';
      card2.setAttribute('translate', 'no');
      card2.style.cssText = 'width:100% !important; max-width:440px !important; flex:1 1 0 !important; min-height:0 !important; margin:0 auto !important; box-sizing:border-box !important; background:linear-gradient(180deg, rgba(15, 23, 42, 0.85) 0%, rgba(10, 16, 30, 0.98) 100%) !important; border:1.5px solid rgba(255, 255, 255, 0.12) !important; border-radius:12px; display:flex; flex-direction:column; justify-content:space-between; align-items:center; position:relative; overflow:hidden; padding:8px 10px; box-shadow:0 4px 16px rgba(0,0,0,0.3);';

      // Header: Formula Pattern Pill
      const formulaPill = document.createElement('div');
      formulaPill.style.cssText = 'font-size:12px; font-weight:800; color:#c084fc; letter-spacing:0.04em; background:rgba(192, 132, 252, 0.14); border:1px solid #c084fc; border-radius:6px; padding:2px 8px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:95%; text-align:center;';
      formulaPill.textContent = `Formula: ${formulaPattern}`;
      card2.appendChild(formulaPill);

      // Main Answer Input / Display (Clickable & Editable directly or via speech)
      const transcriptInput = document.createElement('textarea');
      transcriptInput.id = `desc-transcript-${row.id}`;
      transcriptInput.placeholder = `Your answer will appear here... (e.g. ${placeholderExample})`;
      transcriptInput.value = savedAnswer || '';
      transcriptInput.style.cssText = 'width:100%; flex:1; min-height:36px; border:none; outline:none; background:transparent; color:#ffffff !important; font-size:14px; font-weight:700; text-align:center; font-family:"Inter",sans-serif; resize:none; padding:4px 6px; box-sizing:border-box; line-height:1.35; margin:2px 0;';
      card2.appendChild(transcriptInput);

      // Bottom Live Validator Strip
      const validatorCard = document.createElement('div');
      validatorCard.id = `desc-validator-${row.id}`;
      validatorCard.style.cssText = 'width:100%; border-radius:6px; padding:4px 8px; font-size:12px; line-height:1.25; box-sizing:border-box; text-align:center; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';
      card2.appendChild(validatorCard);

      main.appendChild(card2);

      let hasTriggeredSuccess = false;
      const runLiveValidation = (text, isInitial = false) => {
        answeredMap[row.id] = text;
        const valRes = typeof validateDescriptionSentence === 'function' ? validateDescriptionSentence(text, targetDemo) : { valid: false, error: 'Loading validator...' };
        if (valRes.valid) {
          card2.style.borderColor = 'var(--grade-a)';
          card2.style.boxShadow = '0 0 20px rgba(0, 192, 0, 0.45)';
          validatorCard.style.background = 'rgba(0, 192, 0, 0.15)';
          validatorCard.style.border = '1px solid var(--grade-a)';
          validatorCard.style.color = '#f8fafc';
          validatorCard.innerHTML = `<span style="font-weight:800; color:var(--grade-a);">${getSvgIcon('check-circle', 13)} Perfect:</span> ${valRes.adjectives.map(a => `<span style="color:#95ff00;font-weight:700;">${a.word}</span> <span style="color:#94a3b8;">(${a.category})</span>`).join(' → ')}`;
          if (!hasTriggeredSuccess && !isInitial) {
            hasTriggeredSuccess = true;
            playSuccessChime();
            triggerHapticFeedback([40, 30, 60]);
          }
        } else if (text && text.trim().length > 0) {
          hasTriggeredSuccess = false;
          card2.style.borderColor = '#ea580c';
          card2.style.boxShadow = '0 0 16px rgba(234, 88, 12, 0.25)';
          validatorCard.style.background = 'rgba(255, 140, 0, 0.12)';
          validatorCard.style.border = '1px solid #ea580c';
          validatorCard.style.color = '#fed7aa';
          validatorCard.innerHTML = `<span style="font-weight:700; color:#ea580c;">Notice:</span> ${escapeHtml(valRes.error)}`;
        } else {
          hasTriggeredSuccess = false;
          card2.style.borderColor = 'rgba(255, 255, 255, 0.12)';
          card2.style.boxShadow = '0 4px 16px rgba(0,0,0,0.3)';
          validatorCard.style.background = 'rgba(56, 189, 248, 0.08)';
          validatorCard.style.border = '1px solid rgba(56, 189, 248, 0.25)';
          validatorCard.style.color = '#bae6fd';
          validatorCard.innerHTML = `<span>Pattern: <strong>${formulaPattern}</strong></span>`;
        }
      };

      transcriptInput.addEventListener('input', () => {
        runLiveValidation(transcriptInput.value);
        updateActiveChipOnly(row.id, transcriptInput.value);
        scheduleDebouncedAutoSave(row.id, transcriptInput.value, 800);
      });
      transcriptInput.addEventListener('blur', () => {
        answeredMap[row.id] = transcriptInput.value.trim();
        persistLocalBuffer();
        autoSave(row.id, transcriptInput.value.trim());
      });

      // =========================================================================
      // CARD 3: SPEECH INPUT / MIC CARD (Language Select + Big Mic Button + Live Speech)
      // =========================================================================
      const card3 = document.createElement('div');
      card3.id = `desc-mic-card-${row.id}`;
      card3.className = 'desc-card desc-card-mic notranslate';
      card3.setAttribute('translate', 'no');
      card3.style.cssText = 'width:100% !important; max-width:440px !important; flex:1 1 0 !important; min-height:0 !important; margin:0 auto !important; box-sizing:border-box !important; background:linear-gradient(180deg, rgba(15, 23, 42, 0.85) 0%, rgba(10, 16, 30, 0.98) 100%) !important; border:1.5px solid rgba(0, 192, 0, 0.25) !important; border-radius:12px; display:flex; flex-direction:column; align-items:center; justify-content:center; position:relative; gap:6px; padding:8px 10px; box-shadow:0 4px 16px rgba(0,0,0,0.3);';

      // Language Select pill in top-right of Card 3
      const langSelect = document.createElement('select');
      langSelect.className = 'speech-lang-select';
      langSelect.style.cssText = 'position:absolute; top:8px; right:8px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); border-radius:6px; color:#fff; padding:2px 6px; font-size:12px; font-weight:700; outline:none; height:24px; cursor:pointer;';
      langSelect.innerHTML = `<option value="en-US">EN-US</option><option value="en-GB">EN-UK</option>`;
      card3.appendChild(langSelect);

      // Large Prominent Microphone Button
      const micBtn = document.createElement('button');
      micBtn.type = 'button';
      micBtn.className = 'speech-mic-btn-lg';
      micBtn.title = 'Speak your description sentence';
      micBtn.style.cssText = 'width:52px; height:52px; border-radius:50%; border:3px solid rgba(0,192,0,0.45); background:linear-gradient(135deg, var(--grade-a) 0%, #009900 100%); color:#0F172A; display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; transition:all 0.2s ease; box-shadow:0 4px 16px rgba(0,192,0,0.3);';
      micBtn.innerHTML = '<svg style="width:24px; height:24px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>';
      card3.appendChild(micBtn);

      // Mic Status Text
      const micStatus = document.createElement('div');
      micStatus.style.cssText = 'font-size:12px; font-weight:700; color:#94a3b8; text-align:center;';
      micStatus.textContent = 'Tap to Speak (Speech-to-Text)';
      card3.appendChild(micStatus);

      main.appendChild(card3);

      // Mic Speech Recognition Handler
      micBtn.addEventListener('click', () => {
        if (currentActiveSpeechSession?.isListening()) {
          currentActiveSpeechSession.stop();
          micBtn.style.transform = 'scale(1)';
          micBtn.style.boxShadow = '0 4px 16px rgba(0,192,0,0.3)';
          micStatus.innerHTML = '<span style="color:#94a3b8;">Tap to Speak (Speech-to-Text)</span>';
          return;
        }

        abortActiveSpeechSession();
        micBtn.style.transform = 'scale(1.1)';
        micBtn.style.boxShadow = '0 0 20px rgba(0,255,0,0.6)';
        micStatus.innerHTML = '<span style="color:var(--grade-a);font-weight:800;">● Listening... Speak your description</span>';

        currentActiveSpeechSession = createSpeechSession({
          lang: langSelect.value,
          onResult: (transcript, isFinal) => {
            transcriptInput.value = transcript;
            answeredMap[row.id] = transcript;
            updateActiveChipOnly(row.id, transcript);
            runLiveValidation(transcript);
            if (isFinal) {
              autoSave(row.id, transcript);
            }
          },
          onEnd: () => {
            micBtn.style.transform = 'scale(1)';
            micBtn.style.boxShadow = '0 4px 16px rgba(0,192,0,0.3)';
            if (transcriptInput.value && transcriptInput.value.trim().length > 0) {
              micStatus.innerHTML = '<span style="color:var(--grade-a);font-weight:700;">● Speech Captured</span>';
            } else {
              micStatus.innerHTML = '<span style="color:#94a3b8;">Tap to Speak (Speech-to-Text)</span>';
            }
          },
          onError: (err) => {
            console.warn('Speech recognition error:', err);
            micBtn.style.transform = 'scale(1)';
            micBtn.style.boxShadow = '0 4px 16px rgba(0,192,0,0.3)';
            micStatus.innerHTML = '<span style="color:#ef4444;">Mic Error — Tap to Retry</span>';
          }
        });

        currentActiveSpeechSession.start();
      });

      // Initial State
      updatePhotoView(existingPhoto, true);
      runLiveValidation(savedAnswer || '', true);
    }

    function renderSpeech(area, controlArea, row, savedAnswer, snap = {}) {
      if (!isSpeechSupported()) {
        area.innerHTML = '<div style="color:var(--grade-c); text-align:center; font-size:12px; font-weight:700;">Speech Unavailable</div>';
        renderWritten(area, controlArea, row, savedAnswer, snap, getVirtualKeyboard());
        return;
      }

      const topRow = document.createElement('div');
      topRow.style.cssText = 'display:flex; justify-content:space-between; align-items:center; width:100%; flex-shrink:0;';
      const langSelect = document.createElement('select');
      langSelect.className = 'speech-lang-select';
      langSelect.style.cssText = 'background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); border-radius:6px; color:#fff; padding:2px 8px; font-size:12px; font-weight:600; outline:none;';
      langSelect.innerHTML = `<option value="en-US">EN-US</option><option value="en-GB">EN-UK</option>`;
      const statusEl = document.createElement('div');
      statusEl.style.cssText = 'font-weight:700; font-size:12px; color:#94a3b8; display:flex; align-items:center; gap:8px;';
      statusEl.textContent = savedAnswer ? '● Recorded' : '● Ready';
      if (savedAnswer) statusEl.style.color = 'var(--clr-success)';

      // Spoken Phrase Word-Counter
      const speechTargetPhraseWords = getTargetPhraseWordCount(snap, row);
      let speechWordCounter = null;
      let updateSpeechWordCount = null;
      if (speechTargetPhraseWords >= 2) {
        speechWordCounter = document.createElement('span');
        speechWordCounter.style.cssText = 'font-size:12px; font-weight:700; padding:1px 6px; border-radius:4px; background:rgba(15,23,42,0.6); border:1px solid rgba(255,255,255,0.08);';
        updateSpeechWordCount = (val) => {
          const words = (val || '').trim().split(/\s+/).filter(Boolean).length;
          const isDone = words >= speechTargetPhraseWords;
          speechWordCounter.innerHTML = `<span style="color:${isDone ? 'var(--clr-success)' : '#38bdf8'}; font-weight:800;">${words}</span> / ${speechTargetPhraseWords} words`;
        };
        updateSpeechWordCount(savedAnswer || '');
        statusEl.appendChild(speechWordCounter);
      }

      topRow.appendChild(langSelect); topRow.appendChild(statusEl);
      controlArea.appendChild(topRow);

      const transcriptBox = document.createElement('div');
      transcriptBox.id = `speech-transcript-${row.id}`;
      transcriptBox.style.cssText = 'flex:1; display:flex; align-items:center; justify-content:center; font-size:20px; font-weight:800; color:#000000 !important; text-align:center; width:100%; word-break:break-word; min-height:48px; text-shadow:none !important; font-family:\'Inter\',sans-serif; margin:auto;';
      if (savedAnswer) transcriptBox.textContent = savedAnswer;
      else transcriptBox.innerHTML = '<span style="color:#94a3b8; font-style:italic;">Listening...</span>';
      area.appendChild(transcriptBox);

      // Task Practice Scaffolding: First-Letter Clue (Tasks only, strictly disabled for Exams)
      const isTaskPractice = !(String(testData?.test_type).toLowerCase() === 'exam' || ['EXAM', 'TEST'].includes(testData?.category));
      const isQuizPractice = isTaskPractice; // Backward compatibility
      const targetAns = (snap?.correct_answer || snap?.answer || row?.correct_answer_snapshot || '').trim();
      const primaryTarget = targetAns.split(/[;/,|]/)[0].trim();
      if (isTaskPractice && primaryTarget.length >= 3) {
        const hintBtn = document.createElement('button');
        hintBtn.type = 'button';
        hintBtn.className = 'task-hint-btn';
        hintBtn.innerHTML = 'Hint';
        hintBtn.title = 'Get first-letter clue (Task practice only)';
        hintBtn.style.cssText = 'font-size:12px; font-weight:700; color:#854d0e; background:#fef08a; border:1px solid #ca8a04; border-radius:6px; padding:2px 10px; cursor:pointer; margin-top:4px; transition:all 0.2s;';

        const hintDisplay = document.createElement('div');
        hintDisplay.style.cssText = 'font-size:12px; font-weight:800; letter-spacing:0.18em; color:#854d0e; margin-top:3px; display:none;';
        const mask = primaryTarget.split(' ').map(w => {
          if (w.length <= 2) return w;
          return w[0].toUpperCase() + ' ' + '_ '.repeat(w.length - 1).trim();
        }).join('   ');
        hintDisplay.textContent = mask;

        hintBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          hintDisplay.style.display = 'block';
          hintBtn.style.display = 'none';
        });

        area.appendChild(hintBtn);
        area.appendChild(hintDisplay);
      }

      const micBtn = document.createElement('button');
      micBtn.className = 'speech-mic-btn-lg';
      micBtn.style.cssText = 'width:clamp(56px, 14vw, 72px); height:clamp(56px, 14vw, 72px); border-radius:50%; border:3px solid rgba(var(--grade-a-rgb), 0.45); background:linear-gradient(135deg, var(--grade-a) 0%, #009900 100%); color:#0F172A; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.2s cubic-bezier(0.4, 0, 0.2, 1); outline:none; box-shadow:0 0 24px rgba(var(--grade-a-rgb), 0.45), 0 8px 16px rgba(0,0,0,0.35); flex-shrink:0; touch-action:manipulation;';
      micBtn.innerHTML = '<svg style="width:clamp(22px, 5.5vw, 30px); height:clamp(22px, 5.5vw, 30px);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>';

      const micHelp = document.createElement('div');
      micHelp.style.cssText = 'margin-top:4px; font-size:12px; color:#94a3b8; font-weight:700; letter-spacing:0.04em;';
      micHelp.textContent = 'Tap to Speak';

      controlArea.appendChild(micBtn);
      controlArea.appendChild(micHelp);

      micBtn.addEventListener('click', () => {
        if (currentActiveSpeechSession?.isListening()) {
          micHelp.textContent = 'Processing...';
          statusEl.textContent = '● Processing...';
          currentActiveSpeechSession.stop();
          return;
        }

        // Clean any stale session synchronously before starting
        abortActiveSpeechSession();

        // iOS Audio Route Guard: Suspend audioCtx and pause any background media before starting mic
        if (audioCtx && audioCtx.state === 'running') {
          try { audioCtx.suspend().catch(() => {}); } catch (_) {}
        }
        const fbv = document.querySelector('video[webkit-playsinline]');
        if (fbv && !fbv.paused) {
          try { fbv.pause(); } catch (_) {}
        }

        micHelp.textContent = 'Connecting...';
        statusEl.textContent = '● Connecting mic...';

        currentActiveSpeechSession = createSpeechSession({
          lang: langSelect.value,
          onStart() {
            window._isSpeechRecognitionEngaged = true;
            micBtn.classList.add('listening');
            micBtn.style.background = 'linear-gradient(135deg, var(--grade-e) 0%, #990000 100%)';
            micBtn.style.borderColor = 'var(--grade-e)';
            micBtn.style.boxShadow = '0 0 24px rgba(var(--grade-e-rgb), 0.75), 0 8px 16px rgba(0, 0, 0, 0.5)';
            micBtn.style.color = '#ffffff';
            micBtn.innerHTML = '<svg style="width:clamp(18px, 4.5vw, 24px); height:clamp(18px, 4.5vw, 24px);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><rect x="6" y="6" width="12" height="12" rx="2" ry="2"></rect></svg>';
            statusEl.innerHTML = '● Listening <span class="speech-wave-bars"><span class="speech-wave-bar"></span><span class="speech-wave-bar"></span><span class="speech-wave-bar"></span><span class="speech-wave-bar"></span></span>';
            if (speechWordCounter) statusEl.appendChild(speechWordCounter);
            statusEl.style.color = 'var(--grade-e)';
            micHelp.textContent = 'Listening... (Tap to stop)';
            transcriptBox.innerHTML = '<span style="color:#94a3b8; font-style:italic;">Listening...</span>';
          },
          onResult(interim) {
            transcriptBox.textContent = interim;
            if (speechWordCounter && typeof updateSpeechWordCount === 'function') {
              updateSpeechWordCount(interim);
            }
            // Ultra-lightweight interim update: update ONLY active chip (no DOM tree thrashing)
            if (interim && interim.trim()) {
              answeredMap[row.id] = interim.trim();
              updateActiveChipOnly(row.id, interim.trim());
            }
          },
          onFinal(transcript) {
            transcriptBox.textContent = transcript;
            if (speechWordCounter && typeof updateSpeechWordCount === 'function') {
              updateSpeechWordCount(transcript);
            }
            answeredMap[row.id] = transcript;
            updateActiveChipOnly(row.id, transcript);
            persistLocalBuffer();
            scheduleDebouncedAutoSave(row.id, transcript, 600);
          },
          onEnd() {
            window._isSpeechRecognitionEngaged = false;
            currentActiveSpeechSession = null;
            micBtn.classList.remove('listening');
            micBtn.style.background = 'linear-gradient(135deg, var(--grade-a) 0%, #009900 100%)';
            micBtn.style.borderColor = 'rgba(var(--grade-a-rgb), 0.45)';
            micBtn.style.color = '#0F172A';
            micBtn.innerHTML = '<svg style="width:clamp(22px, 5.5vw, 30px); height:clamp(22px, 5.5vw, 30px);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>';

            // Fail-safe commit: If interim transcript exists in box but onFinal never fired, commit it!
            const boxText = (transcriptBox.textContent || '').trim();
            if (boxText && !boxText.includes('Listening...') && !boxText.includes('Tap to Speak')) {
              if (!answeredMap[row.id] || answeredMap[row.id] !== boxText) {
                answeredMap[row.id] = boxText;
                updateActiveChipOnly(row.id, boxText);
                persistLocalBuffer();
                scheduleDebouncedAutoSave(row.id, boxText, 600);
              }
            }

            const hasAns = !!answeredMap[row.id];
            statusEl.innerHTML = hasAns ? '● Recorded' : '● Ready';
            if (speechWordCounter) statusEl.appendChild(speechWordCounter);
            statusEl.style.color = hasAns ? 'var(--clr-success)' : '#94a3b8';
            micHelp.textContent = 'Tap to Speak';
          },
          onError(msg) {
            window._isSpeechRecognitionEngaged = false;
            currentActiveSpeechSession = null;
            micBtn.classList.remove('listening');
            micBtn.style.background = 'linear-gradient(135deg, var(--grade-a) 0%, #009900 100%)';
            micBtn.style.borderColor = 'rgba(var(--grade-a-rgb), 0.45)';
            micBtn.style.color = '#0F172A';
            micBtn.innerHTML = '<svg style="width:clamp(22px, 5.5vw, 30px); height:clamp(22px, 5.5vw, 30px);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>';

            // Suppress disruptive toasts for normal stops or intentional aborts
            const isNormalStop = !msg || msg.includes('stopped') || msg.includes('aborted');
            if (isNormalStop) {
              const hasAns = !!answeredMap[row.id];
              statusEl.innerHTML = hasAns ? '● Recorded' : '● Ready';
              if (speechWordCounter) statusEl.appendChild(speechWordCounter);
              statusEl.style.color = hasAns ? 'var(--clr-success)' : '#94a3b8';
              micHelp.textContent = 'Tap to Speak';
              return;
            }

            statusEl.innerHTML = `● ${escapeHtml(msg || 'Retry')}`;
            if (speechWordCounter) statusEl.appendChild(speechWordCounter);
            statusEl.style.color = 'var(--grade-e)';
            micHelp.textContent = 'Tap to Retry';
            showToast(msg, 'warning');
          }
        });
        currentActiveSpeechSession.start();
      });
    }

    let _persistBufferTimer = null;
    let _autoSaveTimer = null;

    function persistLocalBuffer() {
      if (_persistBufferTimer) {
        clearTimeout(_persistBufferTimer);
        _persistBufferTimer = null;
      }
      if (typeof attemptData !== 'undefined' && attemptData?.id) {
        try {
          localStorage.setItem(`topscore_local_answers_${attemptData.id}`, JSON.stringify(answeredMap));
        } catch (e) {
          console.warn('[WriteAheadBuffer] Failed to persist answers to localStorage:', e);
        }
      }
    }

    function scheduleDebouncedPersist(delay = 400) {
      if (_persistBufferTimer) clearTimeout(_persistBufferTimer);
      _persistBufferTimer = setTimeout(() => {
        _persistBufferTimer = null;
        if (typeof attemptData !== 'undefined' && attemptData?.id) {
          try {
            localStorage.setItem(`topscore_local_answers_${attemptData.id}`, JSON.stringify(answeredMap));
          } catch (e) {
            console.warn('[WriteAheadBuffer] Debounced persist failed:', e);
          }
        }
      }, delay);
    }

    function scheduleDebouncedAutoSave(attemptAnswerId, studentAnswer, delay = 800) {
      scheduleDebouncedPersist(400);
      if (_autoSaveTimer) clearTimeout(_autoSaveTimer);
      const statusText = document.getElementById('sync-status-text');
      const syncDot = document.getElementById('sync-dot');
      if (statusText) statusText.textContent = 'Typing…';
      if (syncDot) syncDot.style.background = '#38bdf8';
      _autoSaveTimer = setTimeout(() => {
        _autoSaveTimer = null;
        autoSave(attemptAnswerId, studentAnswer);
      }, delay);
    }

    async function autoSave(attemptAnswerId, studentAnswer) {
      persistLocalBuffer();
      const statusText = document.getElementById('sync-status-text');
      const syncDot = document.getElementById('sync-dot');
      if (statusText) statusText.textContent = 'Saving…';
      if (syncDot) syncDot.style.background = '#38bdf8';
      try {
        await saveAnswer(attemptAnswerId, studentAnswer);
        if (statusText) statusText.textContent = 'Saved';
        if (syncDot) syncDot.style.background = 'var(--clr-success)';
      } catch(e) {
        if (statusText) statusText.textContent = 'Saved (Offline)';
        if (syncDot) syncDot.style.background = 'var(--clr-warning)';
      }
    }

    // Flush local buffer before unload
    window.addEventListener('beforeunload', () => {
      saveCurrentAnswer();
      persistLocalBuffer();
    });

    // Network resilience: Offline buffer & auto-reconnect sync (Pilar 3)
    window.addEventListener('offline', () => {
      const statusText = document.getElementById('sync-status-text');
      const syncDot = document.getElementById('sync-dot');
      if (statusText) statusText.textContent = 'Offline (Buffered)';
      if (syncDot) syncDot.style.background = 'var(--clr-warning)';
      if (typeof showToast === 'function') {
        showToast('Connection lost. Answers are buffered locally and safe.', 'warning');
      }
    });

    window.addEventListener('online', async () => {
      const statusText = document.getElementById('sync-status-text');
      const syncDot = document.getElementById('sync-dot');
      if (statusText) statusText.textContent = 'Syncing…';
      if (syncDot) syncDot.style.background = '#38bdf8';
      if (typeof showToast === 'function') {
        showToast('Connection restored! Syncing answers to server…', 'info');
      }
      try {
        saveCurrentAnswer();
        persistLocalBuffer();
        const activeAnswers = window.answeredMap || answeredMap;
        const promises = [];
        for (const [ansId, ansVal] of Object.entries(activeAnswers)) {
          if (ansVal && typeof ansVal === 'string' && ansVal.trim()) {
            promises.push(saveAnswer(ansId, ansVal.trim()));
          }
        }
        await Promise.allSettled(promises);
        if (statusText) statusText.textContent = 'Saved';
        if (syncDot) syncDot.style.background = 'var(--clr-success)';
      } catch (syncErr) {
        console.warn('[OnlineSync] Reconnect sync error:', syncErr);
      }
    });

    window.toggleMatrixPopup = function(show) {
      const popup = document.getElementById('matrix-popup');
      if (!popup) return;
      const isCurrentlyShown = popup.style.display === 'flex' || (!popup.classList.contains('hidden') && popup.style.display !== 'none');
      const shouldShow = typeof show !== 'undefined' ? show : !isCurrentlyShown;

      popup.style.display = shouldShow ? 'flex' : 'none';
      popup.classList.toggle('hidden', !shouldShow);
      if (shouldShow && typeof updateNavGrid === 'function') {
        updateNavGrid();
      }

      const mainContent = document.getElementById('test-main');
      if (mainContent) {
        if (shouldShow) {
          mainContent.style.pointerEvents = 'none';
        } else {
          mainContent.style.pointerEvents = 'auto';
        }
      }

      const vk = getVirtualKeyboard();
      if (vk) {
        if (shouldShow) {
           vk.style.display = 'none';
        } else {
           const row = answerRows[currentIndex];
           if (row) {
             let snap = row.question_snapshot;
             if (typeof snap === 'string') {
               try { snap = JSON.parse(snap); } catch { snap = {}; }
             }
             const sessAnsweringMode = testData?.payload?.test_session?.answering_mode;
             const sessModes = testData?.payload?.test_session?.answering_modes;
             const isPhraseRow = (row?.category || snap?.category || '').toLowerCase() === 'phrases' ||
                                 /phrase/i.test(row?.topics?.name || snap?.topic || '') ||
                                 /phrase/i.test(snap?.section_label || '') ||
                                 snap?.test_section === 'phrases' ||
                                 snap?.section_id === 'phrases' ||
                                 (typeof requestedSection !== 'undefined' && requestedSection === 'phrases') ||
                                 (testsections && testsections[currentSectionIndex]?.id === 'phrases') ||
                                 ['expression', 'idiom', 'proverb', 'phrase'].includes((snap?.word_type || row?.question_type_snapshot || '').toLowerCase()) ||
                                 ((testData?.test_subtype || testData?.shell_code || '').toUpperCase().includes('PHRASE'));
             const sessTargetMode = isPhraseRow ? (sessModes?.phrases || sessAnsweringMode) : (sessModes?.words || sessAnsweringMode);
             let answerType = sessTargetMode || snap?.answer_type || row?.answer_type || testData?.answer_type || 'written';
             if (testData?.answer_type === 'written' || (testData?.shell_code && testData.shell_code.endsWith('-WORDS-EXAM')) || (testData?.title && testData.title.toUpperCase().includes('WORDS EXAM'))) {
               answerType = sessTargetMode || 'written';
             }
             if ((answerType === 'written' || answerType.includes('written')) && vk) {
               vk.style.display = 'flex';
             }
           }
        }
      }
    };

    function saveCurrentAnswer() {
      if (window._questionPacingTimer) clearTimeout(window._questionPacingTimer);
      const row = answerRows[currentIndex];
      if (!row) return;

      // 1. Written Input
      const writtenEl = document.getElementById(`written-${row.id}`);
      if (writtenEl && writtenEl.value != null && writtenEl.value.trim()) {
        answeredMap[row.id] = writtenEl.value.trim();
      }

      // 2. Spoken / Speech Recognition Transcript Box
      const transcriptEl = document.getElementById(`speech-transcript-${row.id}`) || document.getElementById(`speech-text-${row.id}`);
      if (transcriptEl) {
        const text = (transcriptEl.textContent || transcriptEl.value || '').trim();
        if (text && !text.includes('Listening...') && !text.includes('Tap to Speak')) {
          answeredMap[row.id] = text;
        }
      }

      // 3. Selection / Dropdown
      const dd = document.getElementById(`dropdown-${row.id}`);
      if (dd && dd.value != null && dd.value.trim()) {
        answeredMap[row.id] = dd.value.trim();
      }

      // 4. Description / Point & Speak Transcript Input
      const descEl = document.getElementById(`desc-transcript-${row.id}`);
      if (descEl && descEl.value != null && descEl.value.trim()) {
        answeredMap[row.id] = descEl.value.trim();
      }

      persistLocalBuffer();
    }

    // —— Submit Modal ——
    function openSubmitModal() {
      cancelMcAutoAdvance();
      abortActiveSpeechSession();
      const activeMap = window.answeredMap || answeredMap;
      const answered = allAnswerRows.filter(r => hasAnswer(activeMap[r.id])).length;
      const total = allAnswerRows.length;
      const unanswered = total - answered;

      const answeredCountEl = document.getElementById('answered-count');
      const totalCountEl = document.getElementById('total-count');
      const totalCountReadyEl = document.getElementById('total-count-ready');
      if (answeredCountEl) answeredCountEl.textContent = answered;
      if (totalCountEl) totalCountEl.textContent = total;
      if (totalCountReadyEl) totalCountReadyEl.textContent = total;

      const pct = total > 0 ? Math.round((answered / total) * 100) : 0;
      const miniProgEl = document.getElementById('hazard-mini-progress-bar');
      if (miniProgEl) miniProgEl.style.width = pct + '%';

      const modalBox = document.getElementById('submit-modal-box') || document.querySelector('#submit-modal .modal-box');
      const incompleteWrap = document.getElementById('hazard-incomplete-wrap');
      const completeWrap = document.getElementById('hazard-complete-wrap');

      if (unanswered > 0) {
        // Incomplete State (Hazard Yellow & Orange)
        if (modalBox) {
          modalBox.classList.add('modal-box-hazard');
        }
        if (incompleteWrap) incompleteWrap.classList.remove('hidden');
        if (completeWrap) completeWrap.classList.add('hidden');
      } else {
        // All Questions Answered: Ready State
        if (incompleteWrap) incompleteWrap.classList.add('hidden');
        if (completeWrap) completeWrap.classList.remove('hidden');
      }

      document.getElementById('submit-modal')?.classList.remove('hidden');
    }

    function jumpToNextUnanswered() {
      saveCurrentAnswer();
      const activeMap = window.answeredMap || answeredMap;

      // 1. Check if there is an unanswered question in the current section starting after currentIndex
      let targetLocalIdx = -1;
      for (let i = currentIndex + 1; i < answerRows.length; i++) {
        const r = answerRows[i];
        if (!hasAnswer(activeMap[r.id])) {
          targetLocalIdx = i;
          break;
        }
      }

      // 2. If not found after currentIndex, wrap around in the current section (from 0 to currentIndex)
      if (targetLocalIdx === -1) {
        for (let i = 0; i <= currentIndex; i++) {
          const r = answerRows[i];
          if (!hasAnswer(activeMap[r.id])) {
            targetLocalIdx = i;
            break;
          }
        }
      }

      if (targetLocalIdx !== -1) {
        renderQuestion(targetLocalIdx);
        // Calculate global question number
        let globalNum = targetLocalIdx + 1;
        if (testsections && testsections.length > 1) {
          let countBefore = 0;
          for (let s = 0; s < currentSectionIndex; s++) {
            const sec = testsections[s];
            countBefore += allAnswerRows.filter(r => {
              let snap = r.question_snapshot;
              if (typeof snap === 'string') { try { snap = JSON.parse(snap); } catch { snap = {}; } }
              return (snap?.section_id || 'default') === sec.id;
            }).length;
          }
          globalNum = countBefore + targetLocalIdx + 1;
        }
        showToast(`Jumped to Question ${globalNum}`, 'info');
      } else if (testsections && testsections.length > 1) {
        // 3. Current section is completely answered! Look across allAnswerRows for other sections
        const nextUnansweredRow = allAnswerRows.find(r => !hasAnswer(activeMap[r.id]));
        if (nextUnansweredRow) {
          let snap = nextUnansweredRow.question_snapshot;
          if (typeof snap === 'string') { try { snap = JSON.parse(snap); } catch { snap = {}; } }
          const targetSecId = snap?.section_id || 'default';
          const targetSecIdx = testsections.findIndex(s => s.id === targetSecId);

          if (targetSecIdx >= 0) {
            const secRows = allAnswerRows.filter(r => {
              let s = r.question_snapshot;
              if (typeof s === 'string') { try { s = JSON.parse(s); } catch { s = {}; } }
              return (s?.section_id || 'default') === targetSecId;
            });
            const localIdx = secRows.findIndex(r => r.id === nextUnansweredRow.id);
            const globalIdx = allAnswerRows.findIndex(r => r.id === nextUnansweredRow.id);

            startSection(targetSecIdx, Math.max(0, localIdx));
            showToast(`Jumped to Question ${globalIdx + 1} (${testsections[targetSecIdx].title || `Section ${targetSecIdx + 1}`})`, 'info');
          }
        } else {
          showToast(`All ${allAnswerRows.length} questions answered! Great job!`, 'success');
        }
      } else {
        showToast('All questions answered! Great job!', 'success');
      }

      document.getElementById('qNavDrawer')?.classList.remove('open');
      if (window.toggleMatrixPopup) window.toggleMatrixPopup(false);
    }

    document.getElementById('btn-sidebar-jump-unanswered')?.addEventListener('click', () => {
      jumpToNextUnanswered();
    });

    document.getElementById('cancel-submit-btn')?.addEventListener('click', (e) => {
      e?.preventDefault();
      e?.stopPropagation();
      document.getElementById('submit-modal')?.classList.add('hidden');
    });

    document.getElementById('cancel-ready-btn')?.addEventListener('click', (e) => {
      e?.preventDefault();
      e?.stopPropagation();
      document.getElementById('submit-modal')?.classList.add('hidden');
    });

    document.getElementById('close-submit-modal-btn')?.addEventListener('click', (e) => {
      e?.preventDefault();
      e?.stopPropagation();
      document.getElementById('submit-modal')?.classList.add('hidden');
    });

    document.getElementById('confirm-submit-btn')?.addEventListener('click', async (e) => {
      e?.preventDefault();
      e?.stopPropagation();
      document.getElementById('submit-modal')?.classList.add('hidden');
      await doSubmit(false);
    });

    document.getElementById('btn-jump-incomplete-action')?.addEventListener('click', (e) => {
      e?.preventDefault();
      e?.stopPropagation();
      document.getElementById('submit-modal')?.classList.add('hidden');
      jumpToNextUnanswered();
    });

    document.getElementById('danger-submit-btn')?.addEventListener('click', async (e) => {
      e?.preventDefault();
      e?.stopPropagation();
      document.getElementById('submit-modal')?.classList.add('hidden');
      await doSubmit(false);
    });

    document.getElementById('global-submit-btn')?.addEventListener('click', () => {
      saveCurrentAnswer();
      openSubmitModal();
    });

    // Drawer toggles
    document.getElementById('qnav-toggle-btn')?.addEventListener('click', () => {
      document.getElementById('qNavDrawer')?.classList.add('open');
    });
    document.getElementById('qnav-close-btn')?.addEventListener('click', () => {
      document.getElementById('qNavDrawer')?.classList.remove('open');
    });

    async function doSubmit(isAuto = false) {
      window.doSubmit = doSubmit;
      isTestActive = false; // Disable anti-cheat alerts on submission
      // Maintain fullscreen seamlessly into Result Page per user specification
      if (false && isFullscreenActive()) {
        try {
          if (document.exitFullscreen) await document.exitFullscreen();
          else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
        } catch (_) {}
      }
      if (_sessionHeartbeatTimer) { clearInterval(_sessionHeartbeatTimer); _sessionHeartbeatTimer = null; }
      releaseScreenWakeLock();
      timerController?.stop();
      saveCurrentAnswer();
      if (attemptData?.id) {
        sessionStorage.setItem('topscore_attempt_id', attemptData.id);
      }
      showLoading(isAuto ? 'Time is up. Auto-submitting the TEST.' : 'Submitting your TEST.');

      const activeAnswers = window.answeredMap || answeredMap;
      const payload = allAnswerRows.map(row => ({
        attempt_answer_id: row.id,
        student_answer: (activeAnswers && activeAnswers[row.id]) || answeredMap[row.id] || '',
      }));

      // Safety buffer for fallback if Edge function fails
      try {
        sessionStorage.setItem('topscore_fallback_payload_' + attemptData.id, JSON.stringify(payload));
      } catch (_) {}

      const targetStatus = isAuto ? 'auto_submitted' : 'submitted';
      const activeSec = (typeof requestedSection !== 'undefined' ? requestedSection : '') || (urlParams.get('section') || urlParams.get('part') || '').toLowerCase();
      const secParam = activeSec ? `&section=${encodeURIComponent(activeSec)}` : '';

      try {
        const result = await submitTest(attemptData.id, payload, { status: targetStatus, section: activeSec });

        if (String(testData?.test_type).toLowerCase() === 'exam' || ['EXAM', 'TEST'].includes(testData?.category)) {
          try {
            await checkAndTriggerLevelUp(session.student_id, testData.level_id);
          } catch (e) {
            console.error('Level up check failed:', e);
          }
          // Photo retake gating: Passing an Exam grants 1 photo retake credit (non-accumulative)
          try {
            const finalPct = parseFloat(result?.percentage ?? attemptData?.percentage ?? 0);
            if (finalPct >= 60.0) {
              localStorage.setItem(`stu_photo_retake_eligible_${session.student_id}`, 'true');
              if (session) {
                session.photo_retake_eligible = true;
                const { setStudentSession } = await import('./session.js?v=20261106_v160');
                setStudentSession(session);
              }
            }
          } catch (retakeErr) {
            console.warn('Failed to update photo retake eligibility:', retakeErr);
          }
        }

        // Clean up safety buffers on successful submission
        try {
          localStorage.removeItem(`topscore_local_answers_${attemptData.id}`);
          sessionStorage.removeItem(`topscore_fallback_payload_${attemptData.id}`);
        } catch (_) {}

        hideLoading();
        sessionStorage.setItem('topscore_attempt_id', attemptData.id);
        window.location.href = `result.html?attempt_id=${encodeURIComponent(attemptData.id)}${secParam}`;
      } catch(e) {
        console.error('Submit error:', e);
        hideLoading();
        if (isAuto) {
          // 1. First fallback: Call server-authoritative emergency_submit_attempt RPC to score answers in PostgreSQL
          try {
            const sbKey = SUPABASE_ANON_KEY;
            const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/emergency_submit_attempt`, {
              method: 'POST',
              headers: {
                'apikey': sbKey,
                'Authorization': `Bearer ${sbKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                p_attempt_id: attemptData.id,
                p_answers: payload,
                p_status: 'auto_submitted'
              }),
              keepalive: true
            });
            if (rpcRes.ok) {
              sessionStorage.setItem('topscore_attempt_id', attemptData.id);
              window.location.href = `result.html?attempt_id=${encodeURIComponent(attemptData.id)}${secParam}`;
              return;
            }
          } catch (rpcErr) {
            console.error('emergency_submit fallback failed:', rpcErr);
          }

          // 2. Second fallback: auto_close RPC if emergency_submit failed
          try {
            const sbKey = SUPABASE_ANON_KEY;
            const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/auto_close_expired_attempts`, {
              method: 'POST',
              headers: {
                'apikey': sbKey,
                'Authorization': `Bearer ${sbKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ p_attempt_id: attemptData.id }),
              keepalive: true
            });
            if (rpcRes.ok) {
              sessionStorage.setItem('topscore_attempt_id', attemptData.id);
              window.location.href = `result.html?attempt_id=${encodeURIComponent(attemptData.id)}`;
              return;
            }
          } catch (rpcErr) {
            console.error('auto_close fallback failed:', rpcErr);
          }
          // If both submit and auto_close fail, keep answers safe in local buffer and alert user
          showToast('Connection interrupted during submission. Your answers are safely saved. Please click Submit to retry.', 'error', 10000);
          isTestActive = true;
        } else {
          showToast('Submission failed: ' + e.message, 'error', 8000);
          isTestActive = true;
        }
      }
    }

    async function autoSubmit() {
      await doSubmit(true);
    }

    // Trigger voice loading early for Chrome
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }

    // Virtual Keyboard Logic (Delegated event listener ensures keys always work even when re-parented)
    document.addEventListener('click', (e) => {
      const k = e.target.closest('.vk-key');
      if (!k) return;
      e.preventDefault();
      if (!window.activeKeyboardInput) return;
      const key = k.getAttribute('data-key');
      if (key === 'Shift') {
        isShifted = !isShifted;
        renderKeyboardKeys();
        return;
      }
      if (key === '?123') {
        isSymbolMode = true;
        renderKeyboardKeys();
        return;
      }
      if (key === 'ABC') {
        isSymbolMode = false;
        renderKeyboardKeys();
        return;
      }
      if (key === 'Backspace') {
        window.activeKeyboardInput.value = window.activeKeyboardInput.value.slice(0, -1);
      } else if (key === 'Enter') {
        window.activeKeyboardInput.value += '\n';
      } else {
        window.activeKeyboardInput.value += key;
        if (isShifted) {
          isShifted = false;
          renderKeyboardKeys();
        }
      }
      window.activeKeyboardInput.dispatchEvent(new Event('input'));
    });

    document.addEventListener('mousedown', (e) => {
      if (e.target.closest('.vk-key')) {
        e.preventDefault(); // Prevents input from losing focus on key click
      }
    });

    // Physical Keyboard Listener (allows laptop typing while keeping textarea readonly)
    document.addEventListener('keydown', (e) => {
      if(!window.activeKeyboardInput) return;
      // Do not intercept if the user is using modifier keys (like Ctrl+R, F5, etc.)
      if(e.ctrlKey || e.altKey || e.metaKey) return;

      const vkContainer = getVirtualKeyboard();
      if (!vkContainer || vkContainer.style.display === 'none') return; // Only if written question is active

      if (e.key === 'Backspace') {
        e.preventDefault();
        window.activeKeyboardInput.value = window.activeKeyboardInput.value.slice(0, -1);
        window.activeKeyboardInput.dispatchEvent(new Event('input'));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        window.activeKeyboardInput.value += '\n';
        window.activeKeyboardInput.dispatchEvent(new Event('input'));
      } else if (e.key.length === 1) {
        // Single character key
        e.preventDefault();
        window.activeKeyboardInput.value += e.key;
        window.activeKeyboardInput.dispatchEvent(new Event('input'));
      }
    });

    bootTest();
