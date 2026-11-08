import { generateAvatarDataUri } from './utils/avatar-engine.js?v=20261106_v160';
/**
 * TopsCore — Test Engine Module
 * Extracted from test.html
 */

import { startTest, saveAnswer, submitTest, logCheatingEvent, getServerTimeWita, checkAndTriggerLevelUp, getSecuritySettings } from './api.js?v=20261106_v160';
    import { requireStudentSession } from './session.js?v=20261106_v160';
    import { showToast, showLoading, hideLoading, formatTime, escapeHtml, escHtml } from './app.js?v=20261106_v160';
    import { startCountdown, isExpired } from './timer.js?v=20261106_v160';
    import { createSpeechSession, isSpeechSupported } from './speech.js?v=20261106_v160';
    import { SUPABASE_URL, SUPABASE_ANON_KEY, getSupabase } from './supabase.js?v=20261106_v160';
    import { requestScreenWakeLock, releaseScreenWakeLock, bindWakeLockGestures, getWakeLockStatus } from './wake-lock.js?v=20261106_v160';

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

    // —— Anti-Cheat State & Multi-Sound Alert Engine ——
    let isTestActive = false;
    let cheatInterval = null;
    let audioCtx = null;
    let _activeOscNodes = []; // track all active oscillator/source nodes for clean stop
    let _activeGainNodes = [];
    let _activeAudioSource = null; // for custom audio buffer source
    let securityConfig = { enabled: true, soundEnabled: true, countdownSeconds: 5, soundType: 'police_siren', customSoundB64: '' };

    // Mobile Audio Unlock on first interaction
    const unlockAudio = () => {
      try {
        if (!audioCtx) {
          audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx && audioCtx.state === 'suspended') {
          audioCtx.resume();
        }
      } catch (_) {}
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
          strikeBadge.textContent = `🚨 LIMIT EXCEEDED (${MAX_STRIKES}/${MAX_STRIKES})`;
          strikeBadge.style.background = 'var(--grade-e, #FF0000)';
          strikeBadge.style.color = '#ffffff';
          strikeBadge.style.boxShadow = '0 0 20px rgba(var(--grade-e-rgb, 255, 0, 0), 0.95)';
          strikeBadge.style.border = '2px solid #ffffff';
        }
        if (reasonEl) {
          reasonEl.style.color = '#ffffff';
          reasonEl.textContent = `🚨 TEST TERMINATED: Maximum warning limit (${MAX_STRIKES} warnings) exceeded!`;
        }
        if (countEl) countEl.textContent = '0';
        if (dismissBtn) dismissBtn.style.display = 'none';
        if (overlay) overlay.style.display = 'flex';
        startPoliceSiren();
        showToast(`🚨 Exam terminated: Warning limit (${MAX_STRIKES} strikes) exceeded.`, 'error', 6000);
        setTimeout(() => {
          stopPoliceSiren();
          dismissCheatAlert();
          doSubmit(true);
        }, 1500);
        return;
      }

      // Display warning for Strike 1 to 10 (PERINGATAN MERAH SEMUA)
      const isFinalWarning = (cheatStrikes === MAX_STRIKES);
      if (strikeBadge) {
        strikeBadge.textContent = isFinalWarning ? `🚨 STRIKE ${cheatStrikes} OF ${MAX_STRIKES} (FINAL WARNING)` : `🚨 STRIKE ${cheatStrikes} OF ${MAX_STRIKES}`;
        strikeBadge.style.background = 'var(--grade-e, #FF0000)'; // Merah canonical untuk strike 1-10!
        strikeBadge.style.color = '#ffffff';
        strikeBadge.style.boxShadow = '0 0 20px rgba(var(--grade-e-rgb, 255, 0, 0), 0.95)';
        strikeBadge.style.border = '2px solid #ffffff';
      }

      if (reasonEl) {
        reasonEl.style.color = '#ffffff';
        reasonEl.textContent = isFinalWarning
          ? `🚨 FINAL WARNING: ${reason}! You have reached the maximum limit of ${MAX_STRIKES} warnings. Any further navigation or countdown reaching 0 will terminate your exam!`
          : `🚨 WARNING (STRIKE ${cheatStrikes} OF ${MAX_STRIKES}): ${reason}! (Reaching 0 or exceeding ${MAX_STRIKES} warnings will auto-submit your test)`;
      }

      if (dismissBtn) {
        dismissBtn.style.display = 'inline-block';
        dismissBtn.style.background = 'var(--grade-e, #FF0000)';
        dismissBtn.style.color = '#ffffff';
        dismissBtn.style.border = '2px solid #ffffff';
        dismissBtn.style.boxShadow = '0 0 25px rgba(var(--grade-e-rgb, 255, 0, 0), 0.85)';
        dismissBtn.textContent = isFinalWarning ? '⛶ Resume Fullscreen (Final Warning)' : '⛶ Resume Fullscreen & Return to TEST';
      }

      if (overlay) overlay.style.display = 'flex';

      // Smart Proctor Tone: Play calm chime on early warnings, reserving loud siren for severe violations
      if (cheatStrikes <= 3) {
        startCalmTone();
      } else {
        startPoliceSiren();
      }

      const durationSeconds = 5; // User requirement: exact 5s countdown
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
          showToast('🚨 Exam terminated: Warning countdown reached 0.', 'error', 6000);
          doSubmit(true);
        }
      }, 500);
    }

    async function dismissCheatAlert() {
      // Re-verify translator state — do NOT permit dismiss if translation is still actively altering the page!
      const activeTrans = checkTranslationArtifacts();
      if (activeTrans) {
        showToast(`🚨 Translation active (${activeTrans})! Please turn off Translate in your browser.`, 'error', 6000);
        const reasonEl = document.getElementById('cheat-reason');
        if (reasonEl) {
          reasonEl.textContent = `🚨 CANNOT RESUME: ${activeTrans}! Please disable Translation (select "Show original English") to continue your exam.`;
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
      if (dismissBtn) dismissBtn.style.display = 'inline-block';
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

      if (_blurGraceTimer) clearTimeout(_blurGraceTimer);
      _blurGraceTimer = setTimeout(() => {
        if (document.hidden || !document.hasFocus()) {
          triggerCheatAlert(reason);
        }
        _blurGraceTimer = null;
      }, 3000); // 3s buffer absorbs transient audio intents, but flags external apps & intent dialogs
    }

    function handleFocusRestored() {
      if (_focusLostTimestamp) {
        const awayDurationMs = Date.now() - _focusLostTimestamp;
        _focusLostTimestamp = null;
        if (_blurGraceTimer) {
          clearTimeout(_blurGraceTimer);
          _blurGraceTimer = null;
        }
        // Dual-Defense against OS timer suspension:
        // If student was away for >= 3.0s, trigger immediately upon wake-up!
        if (awayDurationMs >= 3000) {
          triggerCheatAlert(`Left exam screen for ${(awayDurationMs / 1000).toFixed(1)}s`);
          return;
        }
      }
      if (_blurGraceTimer) {
        clearTimeout(_blurGraceTimer);
        _blurGraceTimer = null;
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
            showToast('🚨 Exam terminated: Warning countdown expired while away.', 'error', 6000);
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
            showToast('🚨 Exam terminated: Warning countdown expired while away.', 'error', 6000);
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
      showLoading('Starting TEST…');
      try {
        const fetchedConfig = await getSecuritySettings();
        if (fetchedConfig) securityConfig = fetchedConfig;

        const result = await startTest(session.student_id, testId);
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

        // Status check: do not start if test has been soft-deleted or unpublished/drafted
        const asmStatus = String(testData?.status || 'PUBLISHED').toUpperCase();
        if (testData?.deleted_at || (asmStatus !== 'PUBLISHED' && asmStatus !== 'ACTIVE')) {
          const main = document.getElementById('test-main');
          if (main) {
            main.innerHTML = `
              <div class="glass-panel text-center p-5 mx-auto" style="max-width:500px;margin-top:10vh;">
                <h2 class="fw-800 text-xl mb-3" style="color:#f87171;">🔒 Test Unavailable</h2>
                <p class="text-sm" style="color:var(--clr-text-2);">This test is unavailable or has been archived by your tutor. Retakes are not available.</p>
                <button class="btn btn-primary mt-4" onclick="window.location.href='dashboard.html'">Return to Dashboard</button>
              </div>
            `;
          }
          hideLoading();
          return;
        }

        // Server time gate: Enforce WITA window check for schedule_mode === 'fixed'
        if (testData?.schedule_mode === 'manual' && testData?.is_unlocked === false) {
          const main = document.getElementById('test-main');
          if (main) {
            main.innerHTML = `
              <div class="glass-panel text-center p-5 mx-auto" style="max-width:500px;margin-top:10vh;">
                <h2 class="fw-800 text-xl mb-3" style="color:var(--clr-text-1);">🔒 Test Locked</h2>
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


        // Question order shuffle (if random, default in TopsCore)
        const orderSetting = String(testData?.question_order || testData?.payload?.question_order || 'random').toLowerCase();
        if (orderSetting === 'random' && allAnswerRows.length > 1) {
          const hasTwoSections = allAnswerRows.some(r => r.question_snapshot?.test_section === 'words') &&
                                allAnswerRows.some(r => r.question_snapshot?.test_section === 'phrases');
          if (hasTwoSections) {
            const wordRows = allAnswerRows.filter(r => r.question_snapshot?.test_section !== 'phrases');
            const phraseRows = allAnswerRows.filter(r => r.question_snapshot?.test_section === 'phrases');
            const shuffledWords = shuffleWithSeed(wordRows, (attemptData?.id || testId) + '_words');
            const shuffledPhrases = shuffleWithSeed(phraseRows, (attemptData?.id || testId) + '_phrases');
            allAnswerRows = [...shuffledWords, ...shuffledPhrases];
          } else {
            allAnswerRows = shuffleWithSeed(allAnswerRows, attemptData?.id || testId);
          }
          window.allAnswerRows = allAnswerRows;
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
                answeredMap[ansId] = ansVal;
                restoredCount++;
              }
            }
            if (restoredCount > 0) {
              showToast(`Restored ${restoredCount} unsaved answer(s) from safety buffer.`, 'info');
            }
          }
        } catch (_) {}

        // Populate TEST base name
        testDisplayName = testData?.display_name || testData?.name || '';
        if (!testDisplayName && testData) {
          const parts = [
            session.institution_name || '',
            session.program_name || '',
            testData.classes?.name || '',
            testData.levels?.name ? (String(testData.levels.name).toLowerCase().includes('level') ? testData.levels.name : `Level ${testData.levels.name}`) : '',
            testData.test_type || '',
            testData.test_title || ''
          ].filter(Boolean);
          testDisplayName = parts.length > 0 ? parts.join(' · ') : (testData.test_title || 'TEST');
        }

        try {
          const classEl = document.getElementById('test-class-name');
          if (classEl && testData?.classes?.name) classEl.textContent = testData.classes.name;
          const titleEl = document.getElementById('test-main-title');
          if (titleEl) {
            const rawTitle = testData?.title || testData?.test_title || testData?.name || testDisplayName || 'Test';
            titleEl.textContent = rawTitle;
            titleEl.setAttribute('title', rawTitle);
          }
          // Populate 2nd-line subtitle: class name + level
          const subEl = document.getElementById('test-title-sub');
          if (subEl) {
            const subParts = [
              testData?.classes?.name || '',
              testData?.levels?.name ? (String(testData.levels.name).toLowerCase().includes('level') ? testData.levels.name : 'Level ' + testData.levels.name) : ''
            ].filter(Boolean);
            subEl.textContent = subParts.length ? subParts.join(' \u00b7 ') : '';
            subEl.style.display = subEl.textContent ? '' : 'none';
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
                <div style="font-size:3.5rem;margin-bottom:1rem;">⚠️ </div>
                <h3 style="font-size:1.4rem;font-weight:700;margin-bottom:0.75rem;">No Questions Found</h3>
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

        if (preExamModal && !isFullscreenActive()) {
          preExamModal.classList.remove('hidden');
          document.getElementById('btn-enter-fullscreen-start')?.addEventListener('click', async () => {
            try {
              await requestFullscreenMode();
            } catch (_) {}
            await proceedStartExam();
          }, { once: true });
        } else {
          await proceedStartExam();
        }
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
              <div class="glass-panel text-center p-5 mx-auto" style="max-width:540px;background:rgba(18,24,38,0.96);border:1px solid rgba(245,158,11,0.35);border-radius:16px;box-shadow:0 20px 45px rgba(0,0,0,0.6);padding:2.5rem 1.75rem;text-align:center;">
                <div style="font-size:3rem;margin-bottom:1rem;">⚠️</div>
                <h2 class="fw-800 text-xl mb-3" style="color:#fbbf24;font-size:1.4rem;font-weight:800;margin-bottom:0.75rem;">Prerequisite Incomplete</h2>
                <p class="text-sm" style="color:#e2e8f0;line-height:1.6;margin-bottom:1.75rem;font-size:0.95rem;">
                  ${escapeHtml(errMsg.replace(/^Error:\s*/, ''))}
                </p>
                <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
                  ${e?.prereqTestId ? `
                    <button class="btn btn-primary" onclick="window.location.href='test.html?id=${e.prereqTestId}'" style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:#fff;font-weight:700;padding:10px 24px;border:none;border-radius:8px;cursor:pointer;box-shadow:0 4px 14px rgba(16,185,129,0.35);">
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
    function startSessionHeartbeatGuard() {
      if (_sessionHeartbeatTimer) clearInterval(_sessionHeartbeatTimer);
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
              alert('🚨 Sesi ujian Anda telah dibatalkan / dihentikan oleh Pengawas / Tutor.');
              window.location.href = 'dashboard.html';
              return;
            }
            if (st === 'auto_submitted') {
              isTestActive = false;
              clearInterval(_sessionHeartbeatTimer);
              alert('🚨 Sesi ujian Anda telah dikumpulkan oleh Pengawas / Tutor.');
              window.location.href = `result.html?attempt_id=${attemptData.id}`;
              return;
            }

            // Real-time time extension detection from Tutor Live Controller
            if (att.expires_at) {
              const serverExp = new Date(att.expires_at).getTime();
              const localExp = attemptData.expires_at ? new Date(attemptData.expires_at).getTime() : 0;
              if (serverExp > localExp + 30000) {
                const addedMinutes = Math.round((serverExp - localExp) / 60000);
                attemptData.expires_at = att.expires_at;
                const currentSec = (testsections && testsections[currentSectionIndex]) || null;
                startTimer(currentSec);
                showToast(`⏱️ Waktu ujian Anda telah diperpanjang oleh Tutor (+${addedMinutes} menit)!`, 'success', 6000);
              }
            }
          }

          // 2. Check if student was removed from test_session.allowed_student_ids
          if (testId) {
            const { data: asm } = await sb.from('tests')
              .select('payload')
              .eq('id', testId)
              .maybeSingle();
            const sess = asm?.payload?.test_session;
            if (sess && sess.status === 'UNLOCKED') {
              const allowed = sess.allowed_student_ids || [];
              if (Array.isArray(allowed) && allowed.length > 0 && !allowed.includes(session.student_id)) {
                isTestActive = false;
                clearInterval(_sessionHeartbeatTimer);
                alert('🚨 Akses Anda ke sesi ujian ini telah dicabut oleh Pengawas / Tutor.');
                window.location.href = 'dashboard.html';
                return;
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
       if (nameEl) nameEl.textContent = testDisplayName + (testsections.length > 1 ? ` - ${currentSection?.title || `Section ${index + 1}`}` : '');
       const metaEl = document.getElementById('test-meta');
       if (metaEl) metaEl.textContent = `${allAnswerRows.length} Questions · ${session.student_name}`;

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
            showToast('&#9888;&#65039; Less than 2 minutes remaining!', 'warning', 5000);
          } else {
            timerEl.classList.add('warning');
            showToast('&#9201; 5 minutes remaining.', 'warning', 4000);
          }
        },
        onExpire() {
          handleTimeUp(isSectionTimer);
        }
      });
    }

    function nextSection() {
      saveCurrentAnswer();
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
       // Speech Grace Buffer (+3s): Allow in-flight speech recognition to finalize transcribing
       if (window._isSpeechRecognitionEngaged) {
          showToast('⏱️ Finalizing your speech recording...', 'info', 3000);
          setTimeout(() => {
             saveCurrentAnswer();
             proceedTimeUp(isSection);
          }, 3000);
          return;
       }
       proceedTimeUp(isSection);
    }

    // —— Build Nav Grid (Display All Questions & Group by Section) ——
    function buildNavGrid() {
      const grid = document.getElementById('q-nav-grid');
      if (!grid) return;
      grid.innerHTML = '';

      const matrixTitle = document.getElementById('matrix-popup-title') || document.querySelector('#matrix-popup span');
      if (matrixTitle) {
        matrixTitle.textContent = `Question Matrix (${allAnswerRows.length} Questions)`;
      }

      const isMultiSection = testsections && testsections.length > 1;

      if (!isMultiSection) {
        // Single continuous grid
        grid.style.display = 'grid';
        if (allAnswerRows.length > 30) {
          grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(28px, 1fr))';
          grid.style.gap = '4px';
        } else {
          grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(32px, 1fr))';
          grid.style.gap = '5px';
        }

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
        grid.style.display = 'flex';
        grid.style.flexDirection = 'column';
        grid.style.gap = '12px';

        let globalCounter = 0;

        testsections.forEach((sec, secIdx) => {
          const secRows = allAnswerRows.filter(row => {
            let snap = row.question_snapshot;
            if (typeof snap === 'string') {
              try { snap = JSON.parse(snap); } catch { snap = {}; }
            }
            return (snap?.section_id || 'default') === sec.id;
          });

          const secBlock = document.createElement('div');
          secBlock.className = 'matrix-sec-block';
          secBlock.style.cssText = (secIdx === currentSectionIndex)
            ? 'background:rgba(56, 189, 248, 0.08); border:1px solid rgba(56, 189, 248, 0.4); border-radius:10px; padding:8px 10px 10px 10px;'
            : 'background:rgba(15, 23, 42, 0.6); border:1px solid rgba(255, 255, 255, 0.08); border-radius:10px; padding:8px 10px 10px 10px;';

          const secHeader = document.createElement('div');
          secHeader.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding-bottom:4px; border-bottom:1px solid rgba(255, 255, 255, 0.08);';

          const titleSpan = document.createElement('span');
          titleSpan.style.cssText = `font-size:0.82rem; font-weight:800; color:${(secIdx === currentSectionIndex) ? '#38bdf8' : '#e2e8f0'}; letter-spacing:0.3px; display:inline-flex; align-items:center; gap:6px;`;
          const activeTag = (secIdx === currentSectionIndex) ? '<span style="font-size:0.65rem;background:#0284c7;color:#ffffff;padding:2px 6px;border-radius:4px;font-weight:700;">ACTIVE</span>' : '';
          titleSpan.innerHTML = `${sec.title || `Section ${secIdx + 1}`} (${secRows.length} Questions) ${activeTag}`;

          const progressSpan = document.createElement('span');
          progressSpan.id = `matrix-sec-count-${secIdx}`;
          progressSpan.style.cssText = 'font-size:0.74rem; color:#94a3b8; font-weight:600;';

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

    let _navProgressTimer = null;
    function updateProgressMetrics() {
      const activeMap = window.answeredMap || answeredMap;
      const answered = Object.values(activeMap).filter(v => v?.trim()).length;
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
        btn.classList.toggle('answered', !!(val && val.trim()));
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
          const isAnswered = !!(activeMap[rowId] && activeMap[rowId].trim());
          btn.classList.toggle('answered', isAnswered);

          const isCurrent = (rowId === answerRows[currentIndex]?.id);
          btn.classList.toggle('current', isCurrent);
        });
      } else {
        answerRows.forEach((row, idx) => {
          const btn = document.getElementById(`qnav-${idx}`);
          if (!btn) return;
          btn.classList.toggle('answered', !!(activeMap[row.id] && activeMap[row.id].trim()));
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
            return (snap?.section_id || 'default') === sec.id;
          });
          const secAnswered = secRows.filter(r => !!(activeMap[r.id] && activeMap[r.id].trim())).length;
          const countEl = document.getElementById(`matrix-sec-count-${secIdx}`);
          if (countEl) {
            countEl.textContent = `${secAnswered}/${secRows.length} answered`;
          }
        });
      }

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

    // —— Render Question ——
    function renderQuestion(idx) {
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
              <div style="font-size:3rem;margin-bottom:1rem;">⚠️</div>
              <h3 style="font-size:1.3rem;font-weight:700;margin-bottom:0.75rem;">Question Unavailable</h3>
              <p class="text-muted" style="font-size:0.88rem;margin-bottom:1.5rem;">Could not load question item. Please return to dashboard or retry.</p>
              <button class="btn btn-primary" onclick="window.location.href='dashboard.html'">Return to Dashboard</button>
            </div>
          `;
        }
        return;
      }

      // Pacing Assistance (Anti-Timeout Guard):
      // If student remains stuck on an unanswered question for > 45s, gently advise skipping.
      if (window._questionPacingTimer) clearTimeout(window._questionPacingTimer);
      const isCurrentlyUnanswered = !answeredMap[row.id] || !answeredMap[row.id].trim();
      if (isCurrentlyUnanswered && isTestActive) {
        window._questionPacingTimer = setTimeout(() => {
          if (currentIndex === idx && (!answeredMap[row.id] || !answeredMap[row.id].trim()) && isTestActive) {
            showToast('💡 Stuck? Tap Next to skip and return later before time runs out!', 'info', 6000);
          }
        }, 45000);
      }

      let snap = row.question_snapshot;
      if (typeof snap === 'string') {
        try { snap = JSON.parse(snap); } catch { snap = { question_text: snap, answer_type: 'spoken' }; }
      }
      let answerType = snap?.answer_type || row.answer_type || testData?.answer_type || testData?.payload?.answer_type || 'spoken';
      if (testData?.answer_type === 'written' || (testData?.shell_code && testData.shell_code.endsWith('-WORDS-EXAM')) || (testData?.title && testData.title.toUpperCase().includes('WORDS EXAM'))) {
        answerType = 'written';
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

      const isWritten = (answerType === 'written');

      let answerArea, controlArea;

      if (isWritten) {
        // 1. Metadata Grid (Unified height: Flex 1) — rendered ABOVE question box for context-first reading

        const metadataTable = document.createElement('div');
        metadataTable.className = 'w-full metadata-grid metadata-table notranslate';
        metadataTable.setAttribute('translate', 'no');
        metadataTable.style.cssText = 'width:100% !important; max-width:440px !important; flex:1 1 0 !important; min-height:32px !important; max-height:42px !important; display:grid; grid-template-columns:1fr 1fr; grid-template-rows:1fr 1fr; gap:3px; align-items:center; box-sizing:border-box; margin:0 auto !important;';
        metadataTable.innerHTML = `
          <!-- Row 1 Left: Theme name only -->
          <div style="height:100%; min-height:100%; max-height:100%; display:flex; align-items:center; justify-content:center; padding:0 8px; background:rgba(15, 23, 42, 0.75); border:1px solid rgba(255, 255, 255, 0.08); border-radius:6px; box-sizing:border-box; backdrop-filter:blur(10px);">
            <span style="color:#38bdf8; font-size:10px; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; width:100%; text-align:center;" title="${escapeHtml(displayTheme)}">${escapeHtml(displayTheme)}</span>
          </div>
          <!-- Row 1 Right: Category name only -->
          <div style="height:100%; min-height:100%; max-height:100%; display:flex; align-items:center; justify-content:center; padding:0 8px; background:rgba(15, 23, 42, 0.75); border:1px solid rgba(255, 255, 255, 0.08); border-radius:6px; box-sizing:border-box; backdrop-filter:blur(10px);">
            <span style="color:#34d399; font-size:10px; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; width:100%; text-align:center;" title="${escapeHtml(displayCategory)}">${escapeHtml(displayCategory)}</span>
          </div>
          <!-- Row 2 Left: Topic name only -->
          <div style="height:100%; min-height:100%; max-height:100%; display:flex; align-items:center; justify-content:center; padding:0 8px; background:rgba(15, 23, 42, 0.75); border:1px solid rgba(255, 255, 255, 0.08); border-radius:6px; box-sizing:border-box; backdrop-filter:blur(10px);">
            <span style="color:#f8fafc; font-size:10px; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; width:100%; text-align:center;" title="${escapeHtml(displayTopic)}">${escapeHtml(displayTopic)}</span>
          </div>
          <!-- Row 2 Right: Type name only -->
          <div style="height:100%; min-height:100%; max-height:100%; display:flex; align-items:center; justify-content:center; padding:0 8px; background:rgba(15, 23, 42, 0.75); border:1px solid rgba(255, 255, 255, 0.08); border-radius:6px; box-sizing:border-box; backdrop-filter:blur(10px);">
            <span style="color:#cbd5e1; font-size:10px; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; width:100%; text-align:center;" title="${escapeHtml(displayType)}">${escapeHtml(displayType)}</span>
          </div>
        `;
        main.appendChild(metadataTable);

        // 2. Question Box (Unified Adaptive Specification: Flex 3)
        const questionBox = document.createElement('div');
        questionBox.id = 'question-box-prompt';
        questionBox.className = 'w-full flex flex-col question-box-prompt notranslate';
        questionBox.setAttribute('translate', 'no');
        questionBox.style.cssText = 'width:100% !important; max-width:440px !important; flex:3 1 0 !important; min-height:80px !important; display:flex; align-items:center; justify-content:center; text-align:center; overflow:hidden; box-sizing:border-box; padding:6px 14px; background:linear-gradient(180deg, rgba(26, 41, 74, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%); border:1px solid rgba(255, 255, 255, 0.14); border-radius:14px; box-shadow:0 8px 32px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.15); backdrop-filter:blur(16px); margin:0 auto !important;';
        questionBox.innerHTML = `
          <div class="speech-question-text notranslate" translate="no" style="font-size:clamp(18px, 4.5vw, 24px); font-weight:800; color:#f8fafc; text-align:center; line-height:1.25; font-family:'Outfit',sans-serif; width:100%; word-break:break-word; margin:0; text-shadow:0 2px 10px rgba(0,0,0,0.5);">
            ${escapeHtml(questionText)}
          </div>
        `;
        main.appendChild(questionBox);

        // 3. Answer Box (Flex 3: Matches questionBox 1:1)
        answerArea = document.createElement('div');
        answerArea.id = 'answer-container-written';
        answerArea.className = 'w-full flex flex-col justify-center items-center notranslate';
        answerArea.setAttribute('translate', 'no');
        answerArea.style.cssText = 'width:100% !important; max-width:440px !important; flex:3 1 0 !important; min-height:80px !important; display:flex; flex-direction:column; justify-content:center; align-items:center; overflow-y:auto; box-sizing:border-box; padding:6px 12px; background:linear-gradient(180deg, rgba(20, 32, 58, 0.75) 0%, rgba(13, 20, 36, 0.9) 100%); border:1px solid rgba(56, 189, 248, 0.2); border-radius:12px; box-shadow:0 8px 24px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08); backdrop-filter:blur(14px); position:relative; margin:0 auto !important;';
        main.appendChild(answerArea);

        // 4. Virtual Keyboard Container (Flex 3: Matches questionBox & answerArea 1:1)
        if (vk) {
          vk.style.display = 'flex';
          vk.style.cssText = 'width:100% !important; max-width:440px !important; flex:3 1 0 !important; min-height:140px !important; max-height:220px !important; margin:0 auto !important; box-sizing:border-box !important; display:flex !important; flex-direction:column !important; justify-content:space-between !important; padding:6px 4px !important; gap:4px !important; overflow:hidden !important;';
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
            <span style="color:#38bdf8; font-size:10px; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; width:100%; text-align:center;" title="${escapeHtml(displayTheme)}">${escapeHtml(displayTheme)}</span>
          </div>
          <div style="height:100%; min-height:100%; max-height:100%; display:flex; align-items:center; justify-content:center; padding:0 8px; background:rgba(15, 23, 42, 0.75); border:1px solid rgba(255, 255, 255, 0.08); border-radius:6px; box-sizing:border-box; backdrop-filter:blur(10px);">
            <span style="color:#34d399; font-size:10px; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; width:100%; text-align:center;" title="${escapeHtml(displayCategory)}">${escapeHtml(displayCategory)}</span>
          </div>
          <div style="height:100%; min-height:100%; max-height:100%; display:flex; align-items:center; justify-content:center; padding:0 8px; background:rgba(15, 23, 42, 0.75); border:1px solid rgba(255, 255, 255, 0.08); border-radius:6px; box-sizing:border-box; backdrop-filter:blur(10px);">
            <span style="color:#f8fafc; font-size:10px; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; width:100%; text-align:center;" title="${escapeHtml(displayTopic)}">${escapeHtml(displayTopic)}</span>
          </div>
          <div style="height:100%; min-height:100%; max-height:100%; display:flex; align-items:center; justify-content:center; padding:0 8px; background:rgba(15, 23, 42, 0.75); border:1px solid rgba(255, 255, 255, 0.08); border-radius:6px; box-sizing:border-box; backdrop-filter:blur(10px);">
            <span style="color:#cbd5e1; font-size:10px; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; width:100%; text-align:center;" title="${escapeHtml(displayType)}">${escapeHtml(displayType)}</span>
          </div>
        `;
        main.appendChild(metadataTable);

        // 2. Question Box (Unified Adaptive Specification: Flex 3)
        const questionBox = document.createElement('div');
        questionBox.id = 'question-box-prompt';
        questionBox.className = 'w-full flex flex-col question-box-prompt notranslate';
        questionBox.setAttribute('translate', 'no');
        questionBox.style.cssText = 'width:100% !important; max-width:440px !important; flex:3 1 0 !important; min-height:80px !important; display:flex; align-items:center; justify-content:center; text-align:center; overflow:hidden; box-sizing:border-box; padding:6px 14px; background:linear-gradient(180deg, rgba(26, 41, 74, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%); border:1px solid rgba(255, 255, 255, 0.14); border-radius:14px; box-shadow:0 8px 32px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.15); backdrop-filter:blur(16px); margin:0 auto !important;';
        questionBox.innerHTML = `
          <div class="speech-question-text notranslate" translate="no" style="font-size:clamp(18px, 4.5vw, 24px); font-weight:800; color:#f8fafc; text-align:center; line-height:1.25; font-family:'Outfit',sans-serif; width:100%; word-break:break-word; margin:0; text-shadow:0 2px 10px rgba(0,0,0,0.5);">
            ${escapeHtml(questionText)}
          </div>
        `;
        main.appendChild(questionBox);

        if (answerType === 'speech_to_text' || answerType === 'spoken') {
          // 3. Speaking Answer Transcript Box (Flex 3: Matches questionBox 1:1)
          answerArea = document.createElement('div');
          answerArea.id = 'speech-answer-container';
          answerArea.className = 'w-full flex flex-col justify-between';
          answerArea.style.cssText = 'width:100% !important; max-width:440px !important; flex:3 1 0 !important; min-height:80px !important; overflow-y:auto; margin:0 auto !important; display:flex; flex-direction:column; align-items:center; justify-content:space-between; padding:6px 12px; background:linear-gradient(180deg, rgba(20, 32, 58, 0.75) 0%, rgba(13, 20, 36, 0.9) 100%); border:1px solid rgba(56, 189, 248, 0.2); border-radius:14px; box-shadow:0 8px 24px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08); backdrop-filter:blur(14px); box-sizing:border-box; position:relative;';
          main.appendChild(answerArea);

          // 4. Speaking Mic Control Panel (Flex 3: Matches questionBox & answerArea 1:1)
          controlArea = document.createElement('div');
          controlArea.id = 'speech-control-container';
          controlArea.className = 'w-full flex flex-col items-center justify-center speech-mic-panel';
          controlArea.style.cssText = 'width:100% !important; max-width:440px !important; flex:3 1 0 !important; min-height:80px !important; margin:0 auto !important; padding:6px 16px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; background:linear-gradient(180deg, rgba(15, 23, 42, 0.65) 0%, rgba(10, 16, 30, 0.85) 100%); border:1px solid rgba(255, 255, 255, 0.08); border-radius:14px; box-shadow:0 8px 24px rgba(0, 0, 0, 0.35); backdrop-filter:blur(14px); box-sizing:border-box; position:relative;';
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
        bottomPrev.onclick = () => {
          saveCurrentAnswer();
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
            bottomNext.textContent = 'Submit 📋';
            bottomNext.className = 'btn-nav-next is-submit';
            bottomNext.style.background = '';
            bottomNext.style.color = '';
            bottomNext.style.borderColor = '';
            bottomNext.onclick = () => { saveCurrentAnswer(); openSubmitModal(); };
          } else {
            bottomNext.textContent = 'Next Sec ➔';
            bottomNext.className = 'btn-nav-next is-next-sec';
            bottomNext.style.background = '';
            bottomNext.style.color = '';
            bottomNext.style.borderColor = '';
            bottomNext.onclick = () => { nextSection(); };
          }
        } else {
          bottomNext.textContent = 'Next ➔';
          bottomNext.className = 'btn-nav-next';
          bottomNext.style.background = '';
          bottomNext.style.color = '';
          bottomNext.style.borderColor = '';
          bottomNext.onclick = () => {
            saveCurrentAnswer();
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

      testData = scenario.testData || { title: 'Assessment', status: 'PUBLISHED' };
      testDisplayName = testData.title || 'Assessment';
      allAnswerRows = scenario.rows || [scenario.row];
      answerRows = scenario.rows || [scenario.row];
      testsections = scenario.sections || [{ id: 'default', title: 'Part 1: Assessment' }];
      currentSectionIndex = 0;
      isTestActive = true;

      const titleEl = document.getElementById('test-title') || document.getElementById('test-main-title') || document.getElementById('test-name');
      if (titleEl) titleEl.textContent = testData.title;
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
      const unanswered = answerRows.map((r, i) => ({ r, i })).filter(({ r }) => !answeredMap[r.id] || !answeredMap[r.id].trim());
      if (unanswered.length === 0) {
        container.innerHTML = `<div class="speech-unanswered-panel" style="border-color:rgba(52,211,153,0.25);background:rgba(52,211,153,0.06);"><div class="speech-all-answered-msg">✅ All ${answerRows.length} questions answered!</div></div>`;
        return;
      }
      const panel = document.createElement('div');
      panel.className = 'speech-unanswered-panel';
      panel.innerHTML = `<div class="speech-unanswered-title">⚡ ${unanswered.length} unanswered — tap to jump</div><div class="speech-unanswered-chips" id="unanswered-chips"></div>`;
      container.appendChild(panel);
      const chipsEl = panel.querySelector('#unanswered-chips');
      unanswered.forEach(({ i }) => {
        const chip = document.createElement('button');
        chip.className = 'speech-unanswered-chip' + (i === currentIdx ? ' current' : '');
        chip.textContent = i + 1;
        chip.addEventListener('click', () => { saveCurrentAnswer(); renderQuestion(i); });
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
        btn.style.cssText = `min-height:38px; height:clamp(38px, 5.5vh, 50px); display:flex; align-items:center; gap:10px; padding:4px 10px; border-radius:10px; border:${isSelected ? '1.5px solid #06b6d4' : '1px solid rgba(255,255,255,0.08)'}; background:${isSelected ? 'linear-gradient(135deg, rgba(6,182,212,0.2) 0%, rgba(16, 185, 129, 0.2) 100%)' : 'rgba(255,255,255,0.04)'}; color:${isSelected ? '#ffffff' : '#e2e8f0'}; cursor:pointer; font-size:clamp(12.5px, 3.2vw, 14.5px); font-weight:600; box-sizing:border-box; transition:all 0.15s ease; box-shadow:${isSelected ? '0 0 16px rgba(6,182,212,0.25)' : '0 2px 6px rgba(0,0,0,0.2)'}; -webkit-tap-highlight-color:transparent; flex-shrink:0;`;

        btn.innerHTML = `<div class="mc-letter" style="background:${isSelected ? '#06b6d4' : 'rgba(255,255,255,0.08)'}; color:${isSelected ? '#000000' : '#94a3b8'}; border-radius:8px; width:24px; height:24px; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:11.5px; font-weight:800;">${letters[i] || i+1}</div><div style="flex:1; white-space:normal; word-break:break-word; line-height:1.25; text-align:left;">${optText}</div>`;

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
          updateNavGrid();
          autoSave(row.id, optText);
          const nextBtn = document.getElementById('bottom-next-btn');
          if (nextBtn && nextBtn.textContent.includes('Next')) setTimeout(() => nextBtn.click(), 400);
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
        btn.style.cssText = `min-height:38px; height:clamp(38px, 5.5vh, 50px); display:flex; align-items:center; justify-content:center; padding:4px 10px; border-radius:10px; border:${isSelected ? '1.5px solid #06b6d4' : '1px solid rgba(255,255,255,0.08)'}; background:${isSelected ? 'linear-gradient(135deg, rgba(6,182,212,0.2) 0%, rgba(16, 185, 129, 0.2) 100%)' : 'rgba(255,255,255,0.04)'}; color:${isSelected ? '#ffffff' : '#e2e8f0'}; font-weight:600; font-size:clamp(12.5px, 3.2vw, 14.5px); cursor:pointer; text-align:center; box-sizing:border-box; transition:all 0.15s ease; box-shadow:${isSelected ? '0 0 16px rgba(6,182,212,0.25)' : '0 2px 6px rgba(0,0,0,0.2)'}; flex-shrink:0;`;
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
          updateNavGrid();
          autoSave(row.id, optText);
          const nextBtn = document.getElementById('bottom-next-btn');
          if (nextBtn && nextBtn.textContent.includes('Next')) setTimeout(() => nextBtn.click(), 400);
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
      ta.style.cssText = 'width:100%; height:100%; min-height:0; background:transparent; border:none; color:#ffffff; font-size:clamp(20px, 5vw, 28px); font-weight:800; text-align:center; resize:none; outline:none; font-family:\'Outfit\',sans-serif; padding:4px 0; margin:auto; line-height:1.25; display:flex; align-items:center; justify-content:center; box-sizing:border-box; text-shadow:0 2px 10px rgba(56,189,248,0.3);';
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
        wordCounter.style.cssText = 'font-size:11.5px; font-weight:700; color:#94a3b8; margin-top:2px; display:inline-flex; align-items:center; gap:5px; padding:2px 8px; border-radius:10px; background:rgba(15,23,42,0.6); border:1px solid rgba(255,255,255,0.08);';
        updateWordCount = (val) => {
          const words = (val || '').trim().split(/\s+/).filter(Boolean).length;
          const isDone = words >= targetPhraseWords;
          wordCounter.innerHTML = `✍️ <span style="color:${isDone ? 'var(--clr-success, #00c000ff)' : '#38bdf8'}; font-weight:800;">${words}</span> / ${targetPhraseWords} words`;
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
        hintBtn.innerHTML = '💡 Hint';
        hintBtn.title = 'Get first-letter clue (Task practice only)';
        hintBtn.style.cssText = 'font-size:11px; font-weight:700; color:#fbbf24; background:rgba(251,191,36,0.12); border:1px solid rgba(251,191,36,0.3); border-radius:12px; padding:2px 10px; cursor:pointer; margin-top:4px; transition:all 0.2s;';

        const hintDisplay = document.createElement('div');
        hintDisplay.style.cssText = 'font-size:12px; font-weight:800; letter-spacing:0.18em; color:#fbbf24; margin-top:3px; display:none;';
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

    function renderSpeech(area, controlArea, row, savedAnswer, snap = {}) {
      if (!isSpeechSupported()) {
        area.innerHTML = '<div style="color:#fbbf24; text-align:center; font-size:14px; font-weight:700;">Speech Unavailable</div>';
        renderWritten(area, controlArea, row, savedAnswer, snap, getVirtualKeyboard());
        return;
      }

      const topRow = document.createElement('div');
      topRow.style.cssText = 'display:flex; justify-content:space-between; align-items:center; width:100%; flex-shrink:0;';
      const langSelect = document.createElement('select');
      langSelect.className = 'speech-lang-select';
      langSelect.style.cssText = 'background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); border-radius:6px; color:#fff; padding:2px 8px; font-size:11.5px; font-weight:600; outline:none;';
      langSelect.innerHTML = `<option value="en-US">🇺🇸 EN-US</option><option value="en-GB">🇬🇧 EN-UK</option>`;
      const statusEl = document.createElement('div');
      statusEl.style.cssText = 'font-weight:700; font-size:11.5px; color:#94a3b8; display:flex; align-items:center; gap:8px;';
      statusEl.textContent = savedAnswer ? '✅ Recorded' : '● Ready';
      if (savedAnswer) statusEl.style.color = 'var(--clr-success, #00c000ff)';

      // Spoken Phrase Word-Counter
      const speechTargetPhraseWords = getTargetPhraseWordCount(snap, row);
      let speechWordCounter = null;
      let updateSpeechWordCount = null;
      if (speechTargetPhraseWords >= 2) {
        speechWordCounter = document.createElement('span');
        speechWordCounter.style.cssText = 'font-size:11px; font-weight:700; padding:1px 6px; border-radius:8px; background:rgba(15,23,42,0.6); border:1px solid rgba(255,255,255,0.08);';
        updateSpeechWordCount = (val) => {
          const words = (val || '').trim().split(/\s+/).filter(Boolean).length;
          const isDone = words >= speechTargetPhraseWords;
          speechWordCounter.innerHTML = `🎙️ <span style="color:${isDone ? 'var(--clr-success, #00c000ff)' : '#38bdf8'}; font-weight:800;">${words}</span> / ${speechTargetPhraseWords} words`;
        };
        updateSpeechWordCount(savedAnswer || '');
        statusEl.appendChild(speechWordCounter);
      }

      topRow.appendChild(langSelect); topRow.appendChild(statusEl);
      controlArea.appendChild(topRow);

      const transcriptBox = document.createElement('div');
      transcriptBox.id = `speech-transcript-${row.id}`;
      transcriptBox.style.cssText = 'flex:1; display:flex; align-items:center; justify-content:center; font-size:22px; font-weight:800; color:#38bdf8; text-align:center; width:100%; word-break:break-word; min-height:48px; text-shadow:0 2px 10px rgba(56,189,248,0.35); font-family:\'Outfit\',sans-serif;';
      if (savedAnswer) transcriptBox.textContent = savedAnswer;
      else transcriptBox.innerHTML = '<span style="color:rgba(255,255,255,0.35); font-style:italic;">Listening...</span>';
      area.appendChild(transcriptBox);

      // Quiz Practice Scaffolding: First-Letter Clue (Quizzes only, strictly disabled for Exams)
      const isQuizPractice = !(String(testData?.test_type).toLowerCase() === 'exam' || ['EXAM', 'TEST'].includes(testData?.category));
      const targetAns = (snap?.correct_answer || snap?.answer || row?.correct_answer_snapshot || '').trim();
      const primaryTarget = targetAns.split(/[;/,|]/)[0].trim();
      if (isQuizPractice && primaryTarget.length >= 3) {
        const hintBtn = document.createElement('button');
        hintBtn.type = 'button';
        hintBtn.className = 'quiz-hint-btn';
        hintBtn.innerHTML = '💡 Hint';
        hintBtn.title = 'Get first-letter clue (Quiz practice only)';
        hintBtn.style.cssText = 'font-size:11px; font-weight:700; color:#fbbf24; background:rgba(251,191,36,0.12); border:1px solid rgba(251,191,36,0.3); border-radius:12px; padding:2px 10px; cursor:pointer; margin-top:4px; transition:all 0.2s;';

        const hintDisplay = document.createElement('div');
        hintDisplay.style.cssText = 'font-size:12px; font-weight:800; letter-spacing:0.18em; color:#fbbf24; margin-top:3px; display:none;';
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
      micBtn.style.cssText = 'width:clamp(56px, 14vw, 72px); height:clamp(56px, 14vw, 72px); border-radius:50%; border:3px solid rgba(22, 163, 74, 0.45); background:linear-gradient(135deg, #4ade80 0%, #16a34a 100%); color:#0F172A; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.2s cubic-bezier(0.4, 0, 0.2, 1); outline:none; box-shadow:0 0 24px rgba(22, 163, 74, 0.45), 0 8px 16px rgba(0,0,0,0.35); flex-shrink:0;';
      micBtn.innerHTML = '<svg style="width:clamp(22px, 5.5vw, 30px); height:clamp(22px, 5.5vw, 30px);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>';

      const micHelp = document.createElement('div');
      micHelp.style.cssText = 'margin-top:4px; font-size:clamp(11px, 2.5vw, 13px); color:#94a3b8; font-weight:700; letter-spacing:0.04em;';
      micHelp.textContent = 'Tap to Speak';

      controlArea.appendChild(micBtn);
      controlArea.appendChild(micHelp);

      let speechSessionObj = null;
      micBtn.addEventListener('click', () => {
        if (speechSessionObj?.isListening()) { speechSessionObj.stop(); return; }
        speechSessionObj = createSpeechSession({
          lang: langSelect.value,
          onStart() {
            window._isSpeechRecognitionEngaged = true;
            micBtn.classList.add('listening');
            micBtn.style.background = 'linear-gradient(135deg, var(--grade-e, #FF0000), #990000)';
            micBtn.style.borderColor = 'rgba(var(--grade-e-rgb, 255, 0, 0), 0.5)';
            micBtn.style.color = '#ffffff';
            micBtn.innerHTML = '<svg style="width:clamp(18px, 4.5vw, 24px); height:clamp(18px, 4.5vw, 24px);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><rect x="6" y="6" width="12" height="12" rx="2" ry="2"></rect></svg>';
            statusEl.innerHTML = '● Listening <span class="speech-wave-bars"><span class="speech-wave-bar"></span><span class="speech-wave-bar"></span><span class="speech-wave-bar"></span><span class="speech-wave-bar"></span></span>';
            if (speechWordCounter) statusEl.appendChild(speechWordCounter);
            statusEl.style.color = 'var(--grade-e, #FF0000)';
            micHelp.textContent = 'Listening...';
            transcriptBox.innerHTML = '<span style="color:rgba(255,255,255,0.4); font-style:italic;">Listening...</span>';
          },
          onResult(interim) {
            transcriptBox.textContent = interim;
            if (speechWordCounter && typeof updateSpeechWordCount === 'function') {
              updateSpeechWordCount(interim);
            }
            // Real-time interim commit (guarantees student speech is never lost on sudden timeout or navigation)
            if (interim && interim.trim()) {
              answeredMap[row.id] = interim.trim();
              updateNavGrid();
            }
          },
          onFinal(transcript) {
            transcriptBox.textContent = transcript;
            if (speechWordCounter && typeof updateSpeechWordCount === 'function') {
              updateSpeechWordCount(transcript);
            }
            answeredMap[row.id] = transcript;
            updateNavGrid();
            persistLocalBuffer();
            autoSave(row.id, transcript);
          },
          onEnd() {
            setTimeout(() => { window._isSpeechRecognitionEngaged = false; }, 1500);
            micBtn.classList.remove('listening');
            micBtn.style.background = 'linear-gradient(135deg, #4ade80 0%, #16a34a 100%)';
            micBtn.style.borderColor = 'rgba(22, 163, 74, 0.45)';
            micBtn.style.color = '#0F172A';
            micBtn.innerHTML = '<svg style="width:clamp(22px, 5.5vw, 30px); height:clamp(22px, 5.5vw, 30px);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>';

            // Fail-safe commit: If interim transcript exists in box but onFinal never fired, commit it!
            const boxText = (transcriptBox.textContent || '').trim();
            if (boxText && !boxText.includes('Listening...') && !boxText.includes('Tap to Speak')) {
              if (!answeredMap[row.id] || answeredMap[row.id] !== boxText) {
                answeredMap[row.id] = boxText;
                updateNavGrid();
                persistLocalBuffer();
                autoSave(row.id, boxText);
              }
            }

            const hasAns = !!answeredMap[row.id];
            statusEl.innerHTML = hasAns ? '✅ Recorded' : '● Ready';
            if (speechWordCounter) statusEl.appendChild(speechWordCounter);
            statusEl.style.color = hasAns ? 'var(--clr-success, #00c000ff)' : '#94a3b8';
            micHelp.textContent = 'Tap to Speak';
          },
          onError(msg) {
            setTimeout(() => { window._isSpeechRecognitionEngaged = false; }, 1500);
            micBtn.classList.remove('listening');
            micBtn.style.background = 'linear-gradient(135deg, #4ade80 0%, #16a34a 100%)';
            micBtn.style.borderColor = 'rgba(22, 163, 74, 0.45)';
            micBtn.style.color = '#0F172A';
            micBtn.innerHTML = '<svg style="width:clamp(22px, 5.5vw, 30px); height:clamp(22px, 5.5vw, 30px);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>';
            statusEl.innerHTML = `⚠️ ${escapeHtml(msg || 'Retry')}`;
            if (speechWordCounter) statusEl.appendChild(speechWordCounter);
            statusEl.style.color = 'var(--grade-e, #FF0000)';
            micHelp.textContent = 'Tap to Retry';
            showToast(msg, 'warning');
          }
        });
        speechSessionObj.start();
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
        if (syncDot) syncDot.style.background = 'var(--clr-success, #00c000ff)';
      } catch(e) {
        if (statusText) statusText.textContent = 'Saved (Offline)';
        if (syncDot) syncDot.style.background = 'var(--clr-warning, #FFFF00)';
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
      if (syncDot) syncDot.style.background = 'var(--clr-warning, #FFFF00)';
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
        if (syncDot) syncDot.style.background = 'var(--clr-success, #00c000ff)';
      } catch (syncErr) {
        console.warn('[OnlineSync] Reconnect sync error:', syncErr);
      }
    });

    window.toggleMatrixPopup = function(show) {
      const popup = document.getElementById('matrix-popup');
      if (!popup) return;
      const isCurrentlyShown = popup.style.display !== 'none';
      const shouldShow = typeof show !== 'undefined' ? show : !isCurrentlyShown;

      popup.style.display = shouldShow ? 'flex' : 'none';

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
             let answerType = snap?.answer_type || row.answer_type || testData?.answer_type || 'written';
             if (testData?.answer_type === 'written' || (testData?.shell_code && testData.shell_code.endsWith('-WORDS-EXAM')) || (testData?.title && testData.title.toUpperCase().includes('WORDS EXAM'))) {
               answerType = 'written';
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

      persistLocalBuffer();
    }

    // —— Submit Modal ——
    function openSubmitModal() {
      const activeMap = window.answeredMap || answeredMap;
      const answered = allAnswerRows.filter(r => !!(activeMap[r.id] && activeMap[r.id].trim())).length;
      const total = allAnswerRows.length;
      const unanswered = total - answered;

      const answeredCountEl = document.getElementById('answered-count');
      const totalCountEl = document.getElementById('total-count');
      if (answeredCountEl) answeredCountEl.textContent = answered;
      if (totalCountEl) totalCountEl.textContent = total;

      const modalBox = document.getElementById('submit-modal-box') || document.querySelector('#submit-modal .modal-box');
      const warningBanner = document.getElementById('unanswered-warning-banner');
      const warningHeading = document.getElementById('unanswered-warning-heading');
      const unansweredBadge = document.getElementById('unanswered-count-badge');
      const modalIcon = document.getElementById('submit-modal-icon');
      const modalTitle = document.getElementById('submit-modal-title');
      const jumpIncompleteBtn = document.getElementById('btn-jump-incomplete-action');
      const dangerSubmitBtn = document.getElementById('danger-submit-btn');
      const confirmSubmitBtn = document.getElementById('confirm-submit-btn');

      if (unanswered > 0) {
        // Red Emergency Warning State ("PERINGATAN MERAH SEMUA")
        if (modalBox) {
          modalBox.style.border = '2px solid var(--grade-e, #FF0000)';
          modalBox.style.boxShadow = '0 0 50px rgba(var(--grade-e-rgb, 255, 0, 0), 0.45), 0 20px 50px rgba(0,0,0,0.9)';
        }
        if (modalIcon) modalIcon.textContent = '🚨';
        if (modalTitle) {
          modalTitle.textContent = '🚨 INCOMPLETE TEST!';
          modalTitle.style.color = '#fca5a5';
        }
        if (warningBanner) warningBanner.classList.remove('hidden');
        if (warningHeading) warningHeading.textContent = `🚨 WARNING: ${unanswered} UNANSWERED QUESTION${unanswered > 1 ? 'S' : ''}!`;
        if (unansweredBadge) unansweredBadge.textContent = unanswered;

        // Show safe jump action & danger submit action; hide normal submit button
        if (jumpIncompleteBtn) jumpIncompleteBtn.style.display = 'flex';
        if (dangerSubmitBtn) {
          dangerSubmitBtn.style.display = 'block';
          dangerSubmitBtn.textContent = `⚠️ Submit Anyway (${unanswered} Blank = 0 Points)`;
        }
        if (confirmSubmitBtn) confirmSubmitBtn.style.display = 'none';
      } else {
        // All Questions Answered: Success State
        if (modalBox) {
          modalBox.style.border = '1px solid rgba(16, 185, 129, 0.5)';
          modalBox.style.boxShadow = '0 0 35px rgba(16, 185, 129, 0.25), 0 20px 50px rgba(0,0,0,0.85)';
        }
        if (modalIcon) modalIcon.textContent = '✅';
        if (modalTitle) {
          modalTitle.textContent = 'Submit TEST?';
          modalTitle.style.color = '#ffffff';
        }
        if (warningBanner) warningBanner.classList.add('hidden');

        // Hide incomplete warning buttons; show normal submit button
        if (jumpIncompleteBtn) jumpIncompleteBtn.style.display = 'none';
        if (dangerSubmitBtn) dangerSubmitBtn.style.display = 'none';
        if (confirmSubmitBtn) confirmSubmitBtn.style.display = 'flex';
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
        if (!activeMap[r.id] || !activeMap[r.id].trim()) {
          targetLocalIdx = i;
          break;
        }
      }

      // 2. If not found after currentIndex, wrap around in the current section (from 0 to currentIndex)
      if (targetLocalIdx === -1) {
        for (let i = 0; i <= currentIndex; i++) {
          const r = answerRows[i];
          if (!activeMap[r.id] || !activeMap[r.id].trim()) {
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
        const nextUnansweredRow = allAnswerRows.find(r => !activeMap[r.id] || !activeMap[r.id].trim());
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

    document.getElementById('cancel-submit-btn')?.addEventListener('click', () => {
      document.getElementById('submit-modal')?.classList.add('hidden');
    });

    document.getElementById('confirm-submit-btn')?.addEventListener('click', async () => {
      document.getElementById('submit-modal')?.classList.add('hidden');
      await doSubmit();
    });

    document.getElementById('btn-jump-incomplete-action')?.addEventListener('click', () => {
      document.getElementById('submit-modal')?.classList.add('hidden');
      jumpToNextUnanswered();
    });

    document.getElementById('danger-submit-btn')?.addEventListener('click', async () => {
      document.getElementById('submit-modal')?.classList.add('hidden');
      await doSubmit();
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

      try {
        const targetStatus = isAuto ? 'auto_submitted' : 'submitted';
        const result = await submitTest(attemptData.id, payload, { status: targetStatus });

        if (String(testData?.test_type).toLowerCase() === 'exam' || ['EXAM', 'TEST'].includes(testData?.category)) {
          try {
            await checkAndTriggerLevelUp(session.student_id, testData.level_id);
          } catch (e) {
            console.error('Level up check failed:', e);
          }
        }

        // Clean up safety buffers on successful submission
        try {
          localStorage.removeItem(`topscore_local_answers_${attemptData.id}`);
          sessionStorage.removeItem(`topscore_fallback_payload_${attemptData.id}`);
        } catch (_) {}

        hideLoading();
        sessionStorage.setItem('topscore_attempt_id', attemptData.id);
        window.location.href = 'result.html';
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
              window.location.href = 'result.html';
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
              window.location.href = 'result.html';
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
