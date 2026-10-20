import { generateAvatarDataUri } from './utils/avatar-engine.js?v=5.3.2';
/**
 * TopsCore — Assessment Engine Module
 * Extracted from assessment.html
 */

import { startASSESSMENT, saveAnswer, submitAssessment, logCheatingEvent, getServerTimeWita, checkAndTriggerLevelUp, getSecuritySettings } from './api.js?v=5.3.2';
    import { requireStudentSession } from './session.js?v=5.3.2';
    import { showToast, showLoading, hideLoading, formatTime, escapeHtml, escHtml } from './app.js?v=5.3.2';
    import { startCountdown, isExpired } from './timer.js?v=5.3.2';
    import { createSpeechSession, isSpeechSupported } from './speech.js?v=5.3.2';
    import { SUPABASE_URL, SUPABASE_ANON_KEY, getSupabase } from './supabase.js?v=5.3.2';
    import { requestScreenWakeLock, releaseScreenWakeLock, bindWakeLockGestures, getWakeLockStatus } from './wake-lock.js?v=5.3.2';

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
    // Case-insensitive assessment ID extraction — resilient across all URL param casings
    let assessmentId = urlParams.get('id') ||
                       urlParams.get('assessment_id') ||
                       urlParams.get('Assessment_id') ||
                       urlParams.get('ASSESSMENT_id') ||
                       sessionStorage.getItem('topscore_assessment_id') ||
                       sessionStorage.getItem('topscore_ASSESSMENT_id');

    if (assessmentId === 'test-assessment-id') {
      sessionStorage.removeItem('topscore_assessment_id');
      sessionStorage.removeItem('topscore_ASSESSMENT_id');
      assessmentId = urlParams.get('id') || urlParams.get('assessment_id');
    }

    if (assessmentId) {
      // Normalize to lowercase key for consistency going forward
      sessionStorage.setItem('topscore_assessment_id', assessmentId);
    }
    if (urlParams.get('attempt_id')) {
      sessionStorage.setItem('topscore_attempt_id', urlParams.get('attempt_id'));
    }
    if (!assessmentId) {
      console.warn('No valid assessment ID found. Redirecting to dashboard.');
      window.location.href = 'dashboard.html';
    }

    let currentIndex = 0;
    let allAnswerRows = [];
    let answerRows = [];
    let assessmentSections = [];
    let currentSectionIndex = 0;
    let attemptData = null;
    let assessmentData = null;
    let assessmentDisplayName = '';
    let timerController = null;
    let answeredMap = {}; // attempt_answer_id -> student_answer
    window.answeredMap = answeredMap;

    // —— Anti-Cheat State & Police Siren Audio ——
    let isAssessmentActive = false;
    let cheatInterval = null;
    let audioCtx = null;
    let sirenOsc = null;
    let sirenGain = null;
    let securityConfig = { enabled: true, soundEnabled: true, countdownSeconds: 10 };

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

    function startPoliceSiren() {
      if (!securityConfig.soundEnabled) return;
      try {
        if (!audioCtx) {
          audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }
        stopPoliceSiren();

        sirenOsc = audioCtx.createOscillator();
        sirenGain = audioCtx.createGain();
        sirenOsc.type = 'sawtooth';

        const now = audioCtx.currentTime;
        sirenGain.gain.setValueAtTime(0.35, now);

        // Police Siren wail between 650Hz and 1250Hz in repeating cycles
        sirenOsc.frequency.setValueAtTime(650, now);
        const cycle = 0.5;
        for (let i = 0; i < 40; i++) {
          const t = now + (i * cycle * 2);
          sirenOsc.frequency.linearRampToValueAtTime(1250, t + cycle);
          sirenOsc.frequency.linearRampToValueAtTime(650, t + cycle * 2);
        }

        sirenOsc.connect(sirenGain);
        sirenGain.connect(audioCtx.destination);
        sirenOsc.start();

        // Phone haptic vibration alert matching siren wail
        if (navigator.vibrate) {
          try { navigator.vibrate([300, 150, 300, 150, 300, 150, 600]); } catch (_) {}
        }
      } catch (e) {
        console.warn('Police siren audio error:', e);
      }
    }

    function stopPoliceSiren() {
      try {
        if (sirenOsc) {
          sirenOsc.stop();
          sirenOsc.disconnect();
          sirenOsc = null;
        }
        if (sirenGain) {
          sirenGain.disconnect();
          sirenGain = null;
        }
        if (navigator.vibrate) {
          try { navigator.vibrate(0); } catch (_) {}
        }
      } catch (_) {}
    }

    // Intercept Back / Return Button
    function lockHistory() {
      for (let i = 0; i < 5; i++) {
        history.pushState({ ASSESSMENTLocked: true, step: i }, '', location.href);
      }
      window.addEventListener('popstate', () => {
        if (isAssessmentActive) {
          for (let i = 0; i < 3; i++) {
            history.pushState({ ASSESSMENTLocked: true, step: i }, '', location.href);
          }
          triggerCheatAlert('Return button pressed / Navigation attempted');
        }
      });
    }

    let cheatStrikes = 0;
    const MAX_STRIKES = 3;
    let isCheatAlertActive = false;
    let cheatDeadline = 0;
    let lastCheatTriggerTime = 0;

    function triggerCheatAlert(reason) {
      if (!isAssessmentActive || !securityConfig.enabled) return;

      const now = Date.now();
      // Cooldown & Active Guard: Prevent multi-event cascade (e.g. popstate + blur + visibilitychange firing in 1s on side panel or return button)
      if (isCheatAlertActive || (now - lastCheatTriggerTime < 2500)) {
        return;
      }
      lastCheatTriggerTime = now;
      isCheatAlertActive = true;

      cheatStrikes++;
      logCheatingEvent(session.student_id, assessmentId, 'CHEAT_ATTEMPT', {
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

      // Check if 3 warnings limit is exceeded (auto-submit on violation after 3 warnings)
      if (cheatStrikes > MAX_STRIKES) {
        if (strikeBadge) {
          strikeBadge.textContent = `LIMIT EXCEEDED (${MAX_STRIKES}/${MAX_STRIKES})`;
          strikeBadge.style.background = '#dc2626';
        }
        if (reasonEl) {
          reasonEl.textContent = `🚨 ASSESSMENT TERMINATED: Maximum warning limit (${MAX_STRIKES} warnings) exceeded!`;
        }
        if (countEl) countEl.textContent = '0';
        if (dismissBtn) dismissBtn.style.display = 'none';
        if (overlay) overlay.style.display = 'flex';
        startPoliceSiren();
        showToast('🚨 Exam terminated: Warning limit (3 strikes) exceeded.', 'error', 6000);
        setTimeout(() => {
          stopPoliceSiren();
          dismissCheatAlert();
          doSubmit(true);
        }, 1500);
        return;
      }

      // Display warning for Strike 1, 2, or 3 (3 is Final Warning)
      const isFinalWarning = (cheatStrikes === MAX_STRIKES);
      if (strikeBadge) {
        strikeBadge.textContent = isFinalWarning ? `STRIKE ${cheatStrikes} OF ${MAX_STRIKES} (FINAL WARNING)` : `STRIKE ${cheatStrikes} OF ${MAX_STRIKES}`;
        strikeBadge.style.background = isFinalWarning ? '#dc2626' : (cheatStrikes === 2 ? '#ea580c' : 'rgba(255, 255, 255, 0.25)');
      }

      if (reasonEl) {
        reasonEl.textContent = isFinalWarning
          ? `⚠️ FINAL WARNING: ${reason}! You have reached the maximum limit of 3 warnings. Any further navigation or countdown reaching 0 will terminate your exam!`
          : `Warning: ${reason}! (Strike ${cheatStrikes} of ${MAX_STRIKES} — Warning limit is 3 times. Reaching 0 or exceeding 3 warnings will auto-submit)`;
      }

      if (dismissBtn) {
        dismissBtn.style.display = 'inline-block';
        dismissBtn.textContent = isFinalWarning ? 'Return to My ASSESSMENT (Final)' : 'Return to My ASSESSMENT';
      }

      if (overlay) overlay.style.display = 'flex';

      startPoliceSiren();

      const durationSeconds = securityConfig.countdownSeconds || 10;
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

    function dismissCheatAlert() {
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
    }

    document.getElementById('dismiss-cheat-btn')?.addEventListener('click', (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      dismissCheatAlert();
    });
    document.getElementById('cheat-overlay')?.addEventListener('click', (e) => {
      if (e.target === document.getElementById('cheat-overlay')) {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        dismissCheatAlert();
      }
    });

    // Global Anti-Cheat Clipboard & Context Interception
    document.addEventListener('copy', (e) => {
      if (isAssessmentActive) {
        e.preventDefault();
        triggerCheatAlert('Clipboard Copy Attempt');
      }
    });

    document.addEventListener('cut', (e) => {
      if (isAssessmentActive) {
        e.preventDefault();
        triggerCheatAlert('Clipboard Cut Attempt');
      }
    });

    document.addEventListener('paste', (e) => {
      if (isAssessmentActive) {
        e.preventDefault();
        triggerCheatAlert('Clipboard Paste Attempt');
      }
    });

    document.addEventListener('selectstart', (e) => {
      if (isAssessmentActive && !e.target.matches('input, textarea')) {
        e.preventDefault();
      }
    });

    document.addEventListener('dragstart', (e) => {
      if (isAssessmentActive) e.preventDefault();
    });

    document.addEventListener('contextmenu', (e) => {
      if (isAssessmentActive) {
        e.preventDefault();
        triggerCheatAlert('Right-Click / Context Menu');
      }
    });

    // DevTools & Print/Save Keyboard Interception
    window.addEventListener('keydown', (e) => {
      if (!isAssessmentActive) return;

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

    // Screen Wake Lock & Keep-Awake Engine is managed via ./js/wake-lock.js

    // Detect switching tab or minimizing browser
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && isAssessmentActive) {
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
              startPoliceSiren();
            }
            const remaining = Math.max(0, Math.ceil((cheatDeadline - Date.now()) / 1000));
            const countEl = document.getElementById('cheat-timer-count');
            if (countEl) countEl.textContent = remaining;
          }
        }
      }
      if (!securityConfig.enabled) return;
      if (isAssessmentActive && document.hidden) {
        triggerCheatAlert('Leaving the tab / Minimizing browser');
      }
    });

    window.addEventListener('focus', () => {
      if (isAssessmentActive) {
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
              startPoliceSiren();
            }
          }
        }
      }
    });

    // Detect opening another app, side panel, or losing window focus
    window.addEventListener('blur', () => {
      if (!securityConfig.enabled) return;
      if (isAssessmentActive) {
        triggerCheatAlert('Screen lost focus / Side panel or external app opened');
      }
    });

    // On pagehide / minimize: safely buffer current answers to storage only.
    // Do NOT prematurely force-submit here because mobile browsers fire pagehide on normal Home press.
    window.addEventListener('pagehide', () => {
      if (isAssessmentActive && attemptData?.id) {
        saveCurrentAnswer();
      }
    });

    window.addEventListener('beforeunload', (e) => {
      if (isAssessmentActive) {
        // BUG FIX: Do NOT call submitOnPageExit() here! 
        // If the user clicks 'Cancel' on the browser's reload warning, they should be able to continue.
        // Actual forceful submission is handled reliably by the 'pagehide' event if they do leave.
        e.preventDefault();
        e.returnValue = 'ASSESSMENT is in progress! Closing or reloading this page will automatically submit the ASSESSMENT.';
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

    // Translation Detector: Alert if translation extensions or browser translation features alter the page
    const translationObserver = new MutationObserver(() => {
      if (
        document.documentElement.classList.contains('translated-ltr') ||
        document.documentElement.classList.contains('translated-rtl') ||
        document.querySelector('.goog-te-banner-frame, #goog-gt-, font[face], .skiptranslate')
      ) {
        triggerCheatAlert('Browser Translator Detected! Please disable Google/Browser Translate.');
      }
    });
    translationObserver.observe(document.documentElement, { attributes: true, childList: true, subtree: true });

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

    // —— Boot ——
    async function bootAssessment() {
      window.bootAssessment = bootAssessment;
      showLoading('Starting ASSESSMENT…');
      try {
        const fetchedConfig = await getSecuritySettings();
        if (fetchedConfig) securityConfig = fetchedConfig;

        const result = await startASSESSMENT(session.student_id, assessmentId);
        attemptData = result.attempt;
        assessmentData = result.assessment || result.ASSESSMENT || {};
        assessmentSections = result.sections || [];
        allAnswerRows = result.answers || [];
        window.attemptData = attemptData;
        window.allAnswerRows = allAnswerRows;

        // Status check: do not start if assessment has been soft-deleted or unpublished/drafted
        const asmStatus = String(assessmentData?.status || 'PUBLISHED').toUpperCase();
        if (assessmentData?.deleted_at || (asmStatus !== 'PUBLISHED' && asmStatus !== 'ACTIVE')) {
          const main = document.getElementById('assessment-main');
          if (main) {
            main.innerHTML = `
              <div class="glass-panel text-center p-5 mx-auto" style="max-width:500px;margin-top:10vh;">
                <h2 class="fw-800 text-xl mb-3" style="color:#f87171;">🔒 Assessment Unavailable</h2>
                <p class="text-sm" style="color:var(--clr-text-2);">This assessment is unavailable or has been archived by your tutor. Retakes are not available.</p>
                <button class="btn btn-primary mt-4" onclick="window.location.href='dashboard.html'">Return to Dashboard</button>
              </div>
            `;
          }
          hideLoading();
          return;
        }

        // Server time gate: Enforce WITA window check for schedule_mode === 'fixed'
        if (assessmentData?.schedule_mode === 'manual' && assessmentData?.is_unlocked === false) {
          const main = document.getElementById('assessment-main');
          if (main) {
            main.innerHTML = `
              <div class="glass-panel text-center p-5 mx-auto" style="max-width:500px;margin-top:10vh;">
                <h2 class="fw-800 text-xl mb-3" style="color:var(--clr-text-1);">🔒 Assessment Locked</h2>
                <p class="text-sm" style="color:var(--clr-text-2);">Waiting for your tutor to unlock this session in class.</p>
                <button class="btn btn-primary mt-4" onclick="window.location.href='dashboard.html'">Return to Dashboard</button>
              </div>
            `;
          }
          hideLoading();
          return;
        }
        
        if (assessmentData?.schedule_mode === 'fixed') {
          const witaNow = await getServerTimeWita();
          const witaStart = assessmentData.window_start ? new Date(assessmentData.window_start) : null;
          const witaEnd = assessmentData.window_end ? new Date(assessmentData.window_end) : null;
          
          if (witaStart && witaNow < witaStart) {
            hideLoading();
            alert('This assessment has not started yet. Please wait until ' + witaStart.toLocaleString());
            window.location.href = 'dashboard.html';
            return;
          }
          if (witaEnd && witaNow > witaEnd) {
            hideLoading();
            alert('This assessment has already expired.');
            window.location.href = 'dashboard.html';
            return;
          }
        }


        // Question order shuffle (if random, default in TopsCore)
        const orderSetting = String(assessmentData?.question_order || assessmentData?.payload?.question_order || 'random').toLowerCase();
        if (orderSetting === 'random' && allAnswerRows.length > 1) {
          const hasTwoSections = allAnswerRows.some(r => r.question_snapshot?.test_section === 'words') &&
                                allAnswerRows.some(r => r.question_snapshot?.test_section === 'phrases');
          if (hasTwoSections) {
            const wordRows = allAnswerRows.filter(r => r.question_snapshot?.test_section !== 'phrases');
            const phraseRows = allAnswerRows.filter(r => r.question_snapshot?.test_section === 'phrases');
            const shuffledWords = shuffleWithSeed(wordRows, (attemptData?.id || assessmentId) + '_words');
            const shuffledPhrases = shuffleWithSeed(phraseRows, (attemptData?.id || assessmentId) + '_phrases');
            allAnswerRows = [...shuffledWords, ...shuffledPhrases];
          } else {
            allAnswerRows = shuffleWithSeed(allAnswerRows, attemptData?.id || assessmentId);
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

        // Populate ASSESSMENT base name
        assessmentDisplayName = assessmentData?.display_name || assessmentData?.name || '';
        if (!assessmentDisplayName && assessmentData) {
          const parts = [
            session.institution_name || '',
            session.program_name || '',
            assessmentData.classes?.name || '',
            assessmentData.levels?.name ? (String(assessmentData.levels.name).toLowerCase().includes('level') ? assessmentData.levels.name : `Level ${assessmentData.levels.name}`) : '',
            assessmentData.assessment_type || '',
            assessmentData.assessment_title || ''
          ].filter(Boolean);
          assessmentDisplayName = parts.length > 0 ? parts.join(' · ') : (assessmentData.assessment_title || 'ASSESSMENT');
        }

        try {
          const classEl = document.getElementById('assessment-class-name');
          if (classEl && assessmentData?.classes?.name) classEl.textContent = assessmentData.classes.name;
          const titleEl = document.getElementById('assessment-main-title');
          if (titleEl) {
            const rawTitle = assessmentData?.title || assessmentData?.assessment_title || assessmentData?.name || assessmentDisplayName || 'Assessment';
            titleEl.textContent = rawTitle;
            titleEl.setAttribute('title', rawTitle);
          }
        } catch(e) {}

        // Fetch student info for header
        try {
          const nameEl = document.getElementById('assessment-student-name');
          const avatarEl = document.getElementById('assessment-student-avatar');
          const detailsEl = document.getElementById('assessment-student-details');

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
              } else if (avatarEl) {
                avatarEl.src = generateAvatarDataUri(session.student_name || 'S');
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
          const mainEl = document.getElementById('assessment-main');
          if (mainEl) {
            mainEl.style.justifyContent = 'center';
            mainEl.style.minHeight = '100%';
            mainEl.innerHTML = `
              <div class="question-card text-center" style="padding:2.5rem 1.5rem;text-align:center;width:100%;max-width:380px;margin:auto;">
                <div style="font-size:3.5rem;margin-bottom:1rem;">⚠️ </div>
                <h3 style="font-size:1.4rem;font-weight:700;margin-bottom:0.75rem;">No Questions Found</h3>
                <p class="text-muted" style="max-width:440px;margin:0 auto 1.5rem;line-height:1.6;">
                  This assessment does not have any questions yet or the session needs to be refreshed.
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

        // V1 Snapshot fallback: ensure every question has a valid section_id
        if (!assessmentSections || assessmentSections.length === 0) {
          assessmentSections = [{ id: 'default', title: assessmentData?.title || assessmentData?.assessment_title || 'Assessment', section_order: 1 }];
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
        if (!isNaN(savedSecIndex) && savedSecIndex >= 0 && savedSecIndex < assessmentSections.length) {
          currentSectionIndex = savedSecIndex;
        } else {
          currentSectionIndex = 0;
        }

        hideLoading();
        startSection(currentSectionIndex);

        // Activate Anti-Cheat System & Screen Wake Lock
        isAssessmentActive = true;
        requestScreenWakeLock();
        lockHistory();
      } catch(e) {
        hideLoading();
        showToast(e.message, 'error');
        setTimeout(() => window.location.href = 'dashboard.html', 2000);
      }
    }

    function startSection(index) {
       currentSectionIndex = index;
       sessionStorage.setItem(`topscore_sec_${attemptData.id}`, index);
       const currentSection = assessmentSections[index];

       answerRows = allAnswerRows.filter(row => {
         let snap = row.question_snapshot;
         if (typeof snap === 'string') {
            try { snap = JSON.parse(snap); } catch { snap = {}; }
         }
         const secId = snap?.section_id || 'default';
         return secId === currentSection.id;
       });
       window.answerRows = answerRows;

       const nameEl = document.getElementById('assessment-name');
       if (nameEl) nameEl.textContent = assessmentDisplayName + ` - ${currentSection.title || `Section ${index + 1}`}`;
       const metaEl = document.getElementById('assessment-meta');
       if (metaEl) metaEl.textContent = `${answerRows.length} Questions · ${session.student_name}`;

       buildNavGrid();
       startTimer(currentSection);
       renderQuestion(0);
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

      const timerEl = document.getElementById('assessment-timer');
      const display = document.getElementById('timer-display');
      timerEl.classList.remove('warning', 'critical');

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
      if (currentSectionIndex < assessmentSections.length - 1) {
         startSection(currentSectionIndex + 1);
      } else {
         openSubmitModal();
      }
    }

    function handleTimeUp(isSection) {
       if (isSection) {
          showToast('Section time is up! Moving to next section.', 'warning', 5000);
          if (currentSectionIndex < assessmentSections.length - 1) {
              startSection(currentSectionIndex + 1);
          } else {
              autoSubmit();
          }
       } else {
          showToast('Time is up! Submitting your ASSESSMENT…', 'warning', 5000);
          autoSubmit();
       }
    }

    // —— Build Nav Grid ——
    function buildNavGrid() {
      const grid = document.getElementById('q-nav-grid');
      grid.innerHTML = '';
      if (answerRows.length > 30) {
        grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(28px, 1fr))';
        grid.style.gap = '4px';
      } else {
        grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(32px, 1fr))';
        grid.style.gap = '5px';
      }
      answerRows.forEach((_, idx) => {
        const btn = document.createElement('button');
        btn.className = 'q-nav-btn';
        btn.id = `qnav-${idx}`;
        btn.textContent = idx + 1;
        btn.setAttribute('aria-label', `Question ${idx + 1}`);
        btn.addEventListener('click', () => {
          saveCurrentAnswer();
          renderQuestion(idx);
          if (typeof window.toggleMatrixPopup === 'function') {
            window.toggleMatrixPopup(false);
          }
        });
        grid.appendChild(btn);
      });
      updateNavGrid();
    }

    let _navProgressTimer = null;
    function updateProgressMetrics() {
      const activeMap = window.answeredMap || answeredMap;
      const answered = Object.values(activeMap).filter(v => v?.trim()).length;
      const pct = allAnswerRows.length > 0 ? (answered / allAnswerRows.length) * 100 : 0;
      const fillEl = document.getElementById('assessment-progress-fill');
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
      const btn = document.getElementById(`qnav-${currentIndex}`);
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
      answerRows.forEach((row, idx) => {
        const btn = document.getElementById(`qnav-${idx}`);
        if (!btn) return;
        btn.classList.toggle('answered', !!(activeMap[row.id] && activeMap[row.id].trim()));
        btn.classList.toggle('current', idx === currentIndex);
      });
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
      const row = answerRows[idx];
      if (!row) return;

      let snap = row.question_snapshot;
      if (typeof snap === 'string') {
        try { snap = JSON.parse(snap); } catch { snap = { question_text: snap, answer_type: 'written' }; }
      }
      const answerType = snap?.answer_type || row.answer_type || 'written';
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

      let themeCode = snap?.theme_code || snap?.metadata?.theme_code || row?.theme_code_snapshot || assessmentData?.payload?.theme_code || '';
      let themeName = snap?.theme || snap?.metadata?.theme || row?.theme_snapshot || '';

      if (themeName && themeName.length === 1 && /[A-Za-z]/.test(themeName)) {
        if (!themeCode) themeCode = themeName.toUpperCase();
        themeName = '';
      } else if (/^theme\s+([A-Za-z0-9]+)$/i.test(themeName)) {
        const m = themeName.match(/^theme\s+([A-Za-z0-9]+)$/i);
        if (!themeCode) themeCode = m[1].toUpperCase();
        themeName = '';
      }

      if (!themeCode && assessmentData?.title) {
        const matchTheme = assessmentData.title.match(/Theme\s+([A-D0-9]+)/i) || assessmentData.title.match(/Vocabulary\s+([A-D0-9]+)/i);
        if (matchTheme) themeCode = (matchTheme[1] || matchTheme[2]).toUpperCase();
      }

      if (!themeName && themeCode && THEME_NAMES[themeCode.toUpperCase()]) {
        themeName = THEME_NAMES[themeCode.toUpperCase()];
      }

      if (!themeName && assessmentData?.title) {
        if (/Workplace/i.test(assessmentData.title)) { themeName = 'Workplace'; if (!themeCode) themeCode = 'A'; }
        else if (/Tourism/i.test(assessmentData.title)) { themeName = 'Tourism'; if (!themeCode) themeCode = 'B'; }
        else if (/CCU/i.test(assessmentData.title)) { themeName = 'CCU'; if (!themeCode) themeCode = 'C'; }
        else if (/High-Frequency/i.test(assessmentData.title)) { themeName = 'High-Frequency'; if (!themeCode) themeCode = 'D'; }
      }

      let displayTheme = themeName || (themeCode ? ('Theme ' + themeCode) : 'General');
      if (themeName) {
        displayTheme = `${themeName}`;
      }

      let displayTopic = snap?.topic || snap?.metadata?.topic || row?.topic_snapshot || '';
      if (!displayTopic && assessmentData?.title) {
        const parts = assessmentData.title.split('-');
        if (parts.length > 1) displayTopic = parts.slice(1).join('-').trim();
      }
      if (!displayTopic) displayTopic = 'Vocabulary Mastery';

      let displayType = snap?.word_type || snap?.metadata?.word_type || snap?.metadata?.type || snap?.type || row?.word_type_snapshot || snap?.question_type || row?.question_type_snapshot || '';
      if (!displayType) {
        const cat = assessmentData?.payload?.category || '';
        if (cat === 'phrases' || assessmentData?.title?.toLowerCase().includes('phrase')) displayType = 'Phrase';
        else displayType = 'Word';
      }

      let displayCategory = snap?.category || snap?.metadata?.category || row?.category_snapshot || assessmentData?.payload?.category || '';
      if (!displayCategory && assessmentData?.assessment_type) {
        if (assessmentData.assessment_type.includes('PHRASE')) displayCategory = 'phrases';
        else if (assessmentData.assessment_type.includes('VOCAB') || assessmentData.assessment_type.includes('WORD')) displayCategory = 'words';
      }
      if (!displayCategory && assessmentData?.title) {
        if (/phrase/i.test(assessmentData.title)) displayCategory = 'phrases';
        else if (/word|vocab/i.test(assessmentData.title)) displayCategory = 'words';
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

      const main = document.getElementById('assessment-main');
      main.innerHTML = '';
      main.className = 'assessment-main-content flex-1 flex flex-col items-center min-h-0 w-full mx-auto';
      main.style.cssText = 'flex:1; display:flex; flex-direction:column; justify-content:flex-start; align-items:center; min-height:100%; height:100%; max-height:100%; overflow:hidden; width:100% !important; max-width:440px !important; margin:0 auto !important; padding:0; box-sizing:border-box; gap:6px;';

      const isWritten = (answerType === 'written');

      let answerArea, controlArea;

      if (isWritten) {
        // Upper Content Area taking 100% of remaining body height above locked keyboard
        const upperGroup = document.createElement('div');
        upperGroup.id = 'question-interaction-group';
        upperGroup.style.cssText = 'flex:1; min-height:0; display:flex; flex-direction:column; justify-content:space-between; gap:6px; overflow:hidden; width:100% !important; max-width:440px !important; margin:0 auto !important; box-sizing:border-box;';

        // 1. Question Box (3 units)
        const questionBox = document.createElement('div');
        questionBox.className = 'w-full flex flex-col shrink-0 question-box-prompt';
        questionBox.style.cssText = 'width:100% !important; max-width:440px !important; flex:3; min-height:0; display:flex; align-items:center; justify-content:center; text-align:center; overflow:hidden; box-sizing:border-box; padding:6px 14px; background:linear-gradient(180deg, rgba(26, 41, 74, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%); border:1px solid rgba(255, 255, 255, 0.14); border-radius:14px; box-shadow:0 8px 32px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.15); backdrop-filter:blur(16px);';
        questionBox.innerHTML = `
          <div class="speech-question-text" style="font-size:clamp(18px, 4.5vw, 26px); font-weight:800; color:#f8fafc; text-align:center; line-height:1.25; font-family:'Outfit',sans-serif; width:100%; word-break:break-word; margin:0; text-shadow:0 2px 10px rgba(0,0,0,0.5);">
            ${escapeHtml(questionText)}
          </div>
        `;
        upperGroup.appendChild(questionBox);

        // 2. Metadata Grid (1 unit = 1/3 of Question Box and Answer Box)
        const metadataTable = document.createElement('div');
        metadataTable.className = 'w-full shrink-0 metadata-grid';
        metadataTable.style.cssText = 'width:100% !important; max-width:440px !important; flex:1; min-height:0; display:grid; grid-template-columns:1fr 1fr; grid-template-rows:1fr 1fr; gap:3px; align-items:center; box-sizing:border-box; margin:0 auto !important;';
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
        upperGroup.appendChild(metadataTable);

        // 3. Answer Box (3 units = equal to Question Box)
        answerArea = document.createElement('div');
        answerArea.id = 'answer-container-written';
        answerArea.className = 'w-full flex flex-col justify-center items-center shrink-0';
        answerArea.style.cssText = 'width:100% !important; max-width:440px !important; flex:3; min-height:0; display:flex; flex-direction:column; justify-content:center; align-items:center; overflow-y:auto; box-sizing:border-box; padding:4px 12px; background:linear-gradient(180deg, rgba(20, 32, 58, 0.75) 0%, rgba(13, 20, 36, 0.9) 100%); border:1px solid rgba(56, 189, 248, 0.2); border-radius:12px; box-shadow:0 8px 24px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08); backdrop-filter:blur(14px); position:relative;';
        upperGroup.appendChild(answerArea);

        main.appendChild(upperGroup);

        // Child 2 of main: Virtual Keyboard Container (locked priority anchor)
        if (vk) {
          vk.style.display = 'flex';
          vk.style.cssText = 'flex-shrink:0 !important; height:auto !important; max-height:210px !important; margin:0 auto !important; box-sizing:border-box !important; width:100% !important; max-width:440px !important; display:flex !important; flex-direction:column !important; justify-content:space-between !important; padding:6px 4px !important; gap:4px !important; overflow:hidden !important;';
          main.appendChild(vk);
          controlArea = vk;
        }

        renderWritten(answerArea, controlArea, row, savedAnswer, snap, vk);
      } else {
        // Speech & MCQ mode: preserve existing layouts
        const questionBox = document.createElement('div');
        questionBox.className = 'w-full flex flex-col shrink-0';
        questionBox.style.cssText = `width:100% !important; max-width:440px !important; height:calc(30% - 3px); min-height:80px; max-height:120px; flex:0 0 auto; margin:0 auto !important; display:flex; align-items:center; justify-content:center; text-align:center; background:linear-gradient(180deg, rgba(26, 41, 74, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%); border:1px solid rgba(255, 255, 255, 0.14); border-radius:14px; box-shadow:0 8px 32px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.15); backdrop-filter:blur(16px); box-sizing:border-box; flex-shrink:0; padding:6px 14px; overflow:hidden;`;
        questionBox.innerHTML = `
          <div class="speech-question-text" style="font-size:clamp(20px, 5vw, 26px); font-weight:800; color:#f8fafc; text-align:center; line-height:1.25; font-family:'Outfit',sans-serif; width:100%; word-break:break-word; margin:0; text-shadow:0 2px 10px rgba(0,0,0,0.5);">
            ${escapeHtml(questionText)}
          </div>
        `;
        main.appendChild(questionBox);

        const metadataTable = document.createElement('div');
        metadataTable.className = 'w-full shrink-0 metadata-table';
        metadataTable.style.cssText = `width:100% !important; max-width:440px !important; height:calc(10% - 2px); min-height:calc(10% - 2px); max-height:calc(10% - 2px); margin:0 auto !important; display:grid; grid-template-columns:1fr 1fr; grid-template-rows:1fr 1fr; gap:3px; box-sizing:border-box; flex-shrink:0;`;
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
        // Speech & MCQ mode: keep interactionContainer for speech/MCQ
        const interH = 'calc(60% - 7px)';
        const interactionContainer = document.createElement('div');
        interactionContainer.id = 'interaction-container';
        interactionContainer.className = 'w-full flex-1 flex flex-col min-h-0';
        interactionContainer.style.cssText = `height:${interH}; min-height:${interH}; max-height:${interH}; width:100% !important; max-width:440px !important; margin:0 auto !important; display:flex; flex-direction:column; overflow:hidden; gap:5px; box-sizing:border-box; flex-shrink:0;`;
        main.appendChild(interactionContainer);

        if (answerType === 'speech_to_text' || answerType === 'spoken') {
          answerArea = document.createElement('div');
          answerArea.className = 'w-full flex flex-col justify-between';
          answerArea.style.cssText = 'height:calc(50% - 3px); min-height:calc(50% - 3px); max-height:calc(50% - 3px); overflow-y:auto; width:100% !important; max-width:440px !important; margin:0 auto !important; display:flex; flex-direction:column; align-items:center; justify-content:space-between; padding:8px 12px; background:linear-gradient(180deg, rgba(20, 32, 58, 0.75) 0%, rgba(13, 20, 36, 0.9) 100%); border:1px solid rgba(56, 189, 248, 0.2); border-radius:14px; box-shadow:0 8px 24px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08); backdrop-filter:blur(14px); box-sizing:border-box; position:relative;';
          interactionContainer.appendChild(answerArea);

          controlArea = document.createElement('div');
          controlArea.className = 'w-full flex flex-col items-center justify-center shrink-0';
          controlArea.style.cssText = 'height:calc(50% - 3px); min-height:calc(50% - 3px); max-height:calc(50% - 3px); flex-shrink:0; width:100% !important; max-width:440px !important; margin:0 auto !important; padding:6px 0; display:flex; flex-direction:column; align-items:center; justify-content:center; background:linear-gradient(180deg, rgba(15, 23, 42, 0.65) 0%, rgba(10, 16, 30, 0.85) 100%); border:1px solid rgba(255, 255, 255, 0.08); border-radius:14px; box-shadow:0 8px 24px rgba(0, 0, 0, 0.35); backdrop-filter:blur(14px); box-sizing:border-box;';
          interactionContainer.appendChild(controlArea);

          renderSpeech(answerArea, controlArea, row, savedAnswer, snap);
        } else if (answerType === 'multiple_choice' || answerType === 'selection') {
          answerArea = document.createElement('div');
          answerArea.className = 'w-full flex-1 flex flex-col';
          answerArea.style.cssText = 'height:100%; min-height:100%; max-height:100%; overflow-y:auto; width:100% !important; max-width:440px !important; margin:0 auto !important; display:flex; flex-direction:column; justify-content:space-between; gap:clamp(4px, 0.8vh, 8px); padding:6px 8px; background:linear-gradient(180deg, rgba(20, 32, 58, 0.75) 0%, rgba(13, 20, 36, 0.9) 100%); border:1px solid rgba(255, 255, 255, 0.12); border-radius:14px; -webkit-overflow-scrolling:touch; box-sizing:border-box; box-shadow:0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08); backdrop-filter:blur(16px);';
          interactionContainer.appendChild(answerArea);

          renderMC(answerArea, row, savedAnswer, snap);
        } else {
          answerArea = document.createElement('div');
          answerArea.className = 'w-full flex-1 flex flex-col';
          answerArea.style.cssText = 'height:100%; min-height:100%; max-height:100%; overflow-y:auto; width:100% !important; max-width:440px !important; margin:0 auto !important; display:flex; flex-direction:column; justify-content:space-between; gap:clamp(4px, 0.8vh, 8px); padding:6px 8px; background:linear-gradient(180deg, rgba(20, 32, 58, 0.75) 0%, rgba(13, 20, 36, 0.9) 100%); border:1px solid rgba(255, 255, 255, 0.12); border-radius:14px; -webkit-overflow-scrolling:touch; box-sizing:border-box; box-shadow:0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08); backdrop-filter:blur(16px);';
          interactionContainer.appendChild(answerArea);

          renderPhraseChips(answerArea, row, savedAnswer, snap);
        }
      }

      const bottomBar = document.querySelector('.bottom-nav-bar');
      if (bottomBar) bottomBar.style.display = 'flex';

      const bottomPrev = document.getElementById('bottom-prev-btn');
      const bottomNext = document.getElementById('bottom-next-btn');
      if (bottomPrev) {
        bottomPrev.disabled = idx === 0;
        bottomPrev.onclick = () => { saveCurrentAnswer(); renderQuestion(idx - 1); };
      }
      if (bottomNext) {
        const isLast = (idx === answerRows.length - 1);
        const isLastSection = (currentSectionIndex === assessmentSections.length - 1);
        if (isLast) {
          if (isLastSection) {
            bottomNext.textContent = 'Submit 📋';
            bottomNext.className = 'btn btn-success';
            bottomNext.style.background = '#059669';
            bottomNext.onclick = () => { saveCurrentAnswer(); openSubmitModal(); };
          } else {
            bottomNext.textContent = 'Next Sec ➔';
            bottomNext.className = 'btn btn-success';
            bottomNext.style.background = '#059669';
            bottomNext.onclick = () => { nextSection(); };
          }
        } else {
          bottomNext.textContent = 'Next ➔';
          bottomNext.className = 'btn btn-primary';
          bottomNext.style.background = '#152c4e';
          bottomNext.onclick = () => { saveCurrentAnswer(); let targetIdx = idx + 1; while(targetIdx < answerRows.length && answeredMap[answerRows[targetIdx].id] && answeredMap[answerRows[targetIdx].id].trim()) { targetIdx++; } if(targetIdx >= answerRows.length) targetIdx = idx + 1; renderQuestion(targetIdx); };
        }
      }
      updateNavGrid();
    }
    window.renderQuestion = renderQuestion;

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
        btn.style.cssText = `min-height:38px; height:clamp(38px, 5.5vh, 50px); display:flex; align-items:center; gap:10px; padding:4px 10px; border-radius:10px; border:${isSelected ? '1.5px solid #06b6d4' : '1px solid rgba(255,255,255,0.08)'}; background:${isSelected ? 'linear-gradient(135deg, rgba(6,182,212,0.2) 0%, rgba(16,185,129,0.2) 100%)' : 'rgba(255,255,255,0.04)'}; color:${isSelected ? '#ffffff' : '#e2e8f0'}; cursor:pointer; font-size:clamp(12.5px, 3.2vw, 14.5px); font-weight:600; box-sizing:border-box; transition:all 0.15s ease; box-shadow:${isSelected ? '0 0 16px rgba(6,182,212,0.25)' : '0 2px 6px rgba(0,0,0,0.2)'}; -webkit-tap-highlight-color:transparent; flex-shrink:0;`;
        
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
          btn.style.background = 'linear-gradient(135deg, rgba(6,182,212,0.2) 0%, rgba(16,185,129,0.2) 100%)';
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
        btn.style.cssText = `min-height:38px; height:clamp(38px, 5.5vh, 50px); display:flex; align-items:center; justify-content:center; padding:4px 10px; border-radius:10px; border:${isSelected ? '1.5px solid #06b6d4' : '1px solid rgba(255,255,255,0.08)'}; background:${isSelected ? 'linear-gradient(135deg, rgba(6,182,212,0.2) 0%, rgba(16,185,129,0.2) 100%)' : 'rgba(255,255,255,0.04)'}; color:${isSelected ? '#ffffff' : '#e2e8f0'}; font-weight:600; font-size:clamp(12.5px, 3.2vw, 14.5px); cursor:pointer; text-align:center; box-sizing:border-box; transition:all 0.15s ease; box-shadow:${isSelected ? '0 0 16px rgba(6,182,212,0.25)' : '0 2px 6px rgba(0,0,0,0.2)'}; flex-shrink:0;`;
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

      area.addEventListener('click', () => {
        ta.focus();
        window.activeKeyboardInput = ta;
      });

      window.activeKeyboardInput = ta;

      ta.addEventListener('input', () => {
        answeredMap[row.id] = ta.value;
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
      statusEl.style.cssText = 'font-weight:700; font-size:11.5px; color:#94a3b8;';
      statusEl.textContent = savedAnswer ? '✅ Recorded' : '● Ready';
      if (savedAnswer) statusEl.style.color = '#34d399';
      topRow.appendChild(langSelect); topRow.appendChild(statusEl);
      area.appendChild(topRow);

      const transcriptBox = document.createElement('div');
      transcriptBox.style.cssText = 'flex:1; display:flex; align-items:center; justify-content:center; font-size:22px; font-weight:800; color:#38bdf8; text-align:center; width:100%; word-break:break-word; min-height:48px; text-shadow:0 2px 10px rgba(56,189,248,0.35); font-family:\'Outfit\',sans-serif;';
      if (savedAnswer) transcriptBox.textContent = savedAnswer;
      else transcriptBox.innerHTML = '<span style="color:rgba(255,255,255,0.35); font-style:italic;">Listening...</span>';
      area.appendChild(transcriptBox);

      const micBtn = document.createElement('button');
      micBtn.className = 'speech-mic-btn-lg';
      micBtn.style.cssText = 'width:clamp(56px, 14vw, 72px); height:clamp(56px, 14vw, 72px); border-radius:50%; border:3px solid rgba(52,211,153,0.45); background:linear-gradient(135deg,#10b981 0%,#059669 100%); color:#fff; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.2s cubic-bezier(0.4, 0, 0.2, 1); outline:none; box-shadow:0 0 24px rgba(16,185,129,0.45), 0 8px 16px rgba(0,0,0,0.35); flex-shrink:0;';
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
            micBtn.style.background = 'linear-gradient(135deg, #ef4444, #b91c1c)';
            micBtn.style.borderColor = 'rgba(239,68,68,0.5)';
            micBtn.innerHTML = '<svg style="width:clamp(18px, 4.5vw, 24px); height:clamp(18px, 4.5vw, 24px);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><rect x="6" y="6" width="12" height="12" rx="2" ry="2"></rect></svg>';
            statusEl.textContent = '● Listening';
            statusEl.style.color = '#ef4444';
            micHelp.textContent = 'Listening...';
            transcriptBox.innerHTML = '<span style="color:rgba(255,255,255,0.4); font-style:italic;">Listening...</span>';
          },
          onResult(interim) { transcriptBox.textContent = interim; },
          onFinal(transcript) {
            transcriptBox.textContent = transcript;
            answeredMap[row.id] = transcript;
            updateNavGrid();
            persistLocalBuffer();
            autoSave(row.id, transcript);
          },
          onEnd() {
            micBtn.style.background = 'linear-gradient(135deg,#10b981 0%,#059669 100%)';
            micBtn.style.borderColor = 'rgba(52,211,153,0.45)';
            micBtn.innerHTML = '<svg style="width:clamp(22px, 5.5vw, 30px); height:clamp(22px, 5.5vw, 30px);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>';
            const hasAns = !!answeredMap[row.id];
            statusEl.textContent = hasAns ? '✅ Recorded' : '● Ready';
            statusEl.style.color = hasAns ? '#34d399' : '#94a3b8';
            micHelp.textContent = 'Tap to Speak';
          },
          onError(msg) {
            micBtn.style.background = 'linear-gradient(135deg,#10b981 0%,#059669 100%)';
            micBtn.style.borderColor = 'rgba(52,211,153,0.45)';
            micBtn.innerHTML = '<svg style="width:clamp(22px, 5.5vw, 30px); height:clamp(22px, 5.5vw, 30px);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>';
            statusEl.textContent = `⚠️ ${msg}`;
            statusEl.style.color = '#f43f5e';
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
        if (syncDot) syncDot.style.background = '#10b981';
      } catch(e) {
        if (statusText) statusText.textContent = 'Saved (Offline)';
        if (syncDot) syncDot.style.background = '#fbbf24';
      }
    }

    // Flush local buffer before unload
    window.addEventListener('beforeunload', () => {
      saveCurrentAnswer();
      persistLocalBuffer();
    });

    window.toggleMatrixPopup = function(show) {
      const popup = document.getElementById('matrix-popup');
      if (!popup) return;
      const isCurrentlyShown = popup.style.display !== 'none';
      const shouldShow = typeof show !== 'undefined' ? show : !isCurrentlyShown;
      
      popup.style.display = shouldShow ? 'flex' : 'none';
      
      const mainContent = document.getElementById('assessment-main');
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
             const answerType = snap?.answer_type || row.answer_type || 'written';
             if ((answerType === 'written' || answerType.includes('written')) && vk) {
               vk.style.display = 'flex';
             }
           }
        }
      }
    };

    function saveCurrentAnswer() {
      const row = answerRows[currentIndex];
      if (!row) return;
      const ta = document.getElementById(`written-${row.id}`) || document.getElementById(`speech-text-${row.id}`);
      if (ta) answeredMap[row.id] = ta.value;
      const dd = document.getElementById(`dropdown-${row.id}`);
      if (dd) answeredMap[row.id] = dd.value;
      persistLocalBuffer();
    }

    // —— Submit Modal ——
    function openSubmitModal() {
      const activeMap = window.answeredMap || answeredMap;
      const answered = Object.values(activeMap).filter(v => v?.trim()).length;
      const total = allAnswerRows.length;
      const unanswered = total - answered;

      document.getElementById('answered-count').textContent = answered;
      document.getElementById('total-count').textContent = total;

      const warningBanner = document.getElementById('unanswered-warning-banner');
      const warningText = document.getElementById('unanswered-warning-text');
      const confirmBtn = document.getElementById('confirm-submit-btn');
      const modalIcon = document.getElementById('submit-modal-icon');

      if (unanswered > 0) {
        document.getElementById('unanswered-warning-banner')?.classList.remove('hidden');
        if (warningText) {
          warningText.innerHTML = `You have <strong>${unanswered}</strong> question(s) that have not been answered! <br/><button id="btn-jump-unanswered" class="btn btn-secondary btn-sm mt-2" style="padding:4px 10px;font-size:0.75rem;font-weight:700;">🔍  Review Unanswered Questions</button>`;
          document.getElementById('btn-jump-unanswered')?.addEventListener('click', () => {
            document.getElementById('submit-modal').classList.add('hidden');
            jumpToNextUnanswered();
          });
        }
        confirmBtn?.classList.remove('btn-primary');
        confirmBtn?.classList.add('btn-danger');
        if (confirmBtn) confirmBtn.textContent = `Submit Anyway (${unanswered} Unanswered)`;
        if (modalIcon) modalIcon.textContent = '⚠️ ';
      } else {
        warningBanner?.classList.add('hidden');
        confirmBtn?.classList.remove('btn-danger');
        confirmBtn?.classList.add('btn-primary');
        if (confirmBtn) confirmBtn.textContent = 'Submit ASSESSMENT 📋';
        if (modalIcon) modalIcon.textContent = '✅';
      }

      document.getElementById('submit-modal').classList.remove('hidden');
    }

    function jumpToNextUnanswered() {
      saveCurrentAnswer();
      const firstUnansweredIdx = answerRows.findIndex(r => !answeredMap[r.id] || !answeredMap[r.id].trim());
      if (firstUnansweredIdx >= 0) {
        renderQuestion(firstUnansweredIdx);
        showToast(`Jumped to Question ${firstUnansweredIdx + 1}`, 'info');
      } else {
        showToast('All questions in this section are answered! Great job!', 'success');
      }
      document.getElementById('qNavDrawer')?.classList.remove('open');
      if (window.toggleMatrixPopup) window.toggleMatrixPopup(false);
    }

    document.getElementById('btn-sidebar-jump-unanswered')?.addEventListener('click', () => {
      jumpToNextUnanswered();
    });

    document.getElementById('cancel-submit-btn').addEventListener('click', () => {
      document.getElementById('submit-modal').classList.add('hidden');
    });

    document.getElementById('confirm-submit-btn').addEventListener('click', async () => {
      document.getElementById('submit-modal').classList.add('hidden');
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
      isAssessmentActive = false; // Disable anti-cheat alerts on submission
      releaseScreenWakeLock();
      timerController?.stop();
      saveCurrentAnswer();
      if (attemptData?.id) {
        sessionStorage.setItem('topscore_attempt_id', attemptData.id);
      }
      showLoading(isAuto ? 'Time is up. Auto-submitting the ASSESSMENT.' : 'Submitting your ASSESSMENT.');

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
        const result = await submitAssessment(attemptData.id, payload, { status: targetStatus });
        
        if (assessmentData?.assessment_type === 'EXAM') {
          try {
            await checkAndTriggerLevelUp(session.student_id, assessmentData.level_id);
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
          // Call server-authoritative auto_close RPC if primary submit failed
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
          isAssessmentActive = true;
        } else {
          showToast('Submission failed: ' + e.message, 'error', 8000);
          isAssessmentActive = true;
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

    bootAssessment();
