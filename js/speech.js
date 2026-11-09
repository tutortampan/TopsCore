// TOPS CORE — Web Speech Recognition Module
// Supports: English US, English UK. Audio is NOT stored.
// Provides: retry, permission, unsupported-browser states.

function getSpeechRecognitionClass() {
  if (typeof window !== 'undefined') {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }
  return null;
}

/**
 * Check if current client is iOS / iPadOS (Safari or WKWebView).
 */
export function isIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Check browser speech recognition support.
 */
export function isSpeechSupported() {
  return !!getSpeechRecognitionClass();
}

/**
 * Detect supported audio MIME types across Chrome, Safari, iOS, Android, Firefox.
 * Avoids hardcoding one format.
 */
export function getSupportedAudioMimeType() {
  if (typeof MediaRecorder === 'undefined') return null;
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/aac',
    'audio/ogg;codecs=opus',
    'audio/wav'
  ];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return ''; // Browser default
}

/**
 * Comprehensive Microphone Capability & Permission Detection (Phase 12)
 * Tests HTTPS, device presence, getUserMedia, and cleans up tracks immediately.
 */
export async function testMicrophoneCapability() {
  // 1. Security Context / HTTPS Check
  if (window.isSecureContext === false && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
    return {
      ok: false,
      state: 'insecure_context',
      message: 'Microphone requires a secure HTTPS connection. Please access via HTTPS.'
    };
  }

  // 2. API Support Check
  if (!navigator?.mediaDevices?.getUserMedia) {
    return {
      ok: false,
      state: 'unsupported_browser',
      message: 'Your browser or device does not support audio recording (getUserMedia is unavailable).'
    };
  }

  // 3. Permission Query (if supported by Permissions API)
  if (navigator.permissions && navigator.permissions.query) {
    try {
      const perm = await navigator.permissions.query({ name: 'microphone' });
      if (perm.state === 'denied') {
        return {
          ok: false,
          state: 'permission_denied',
          message: 'Microphone access is blocked in your browser settings. Please click the lock/settings icon in the address bar to allow microphone access.'
        };
      }
    } catch (_) {
      // Permissions API for microphone is not supported in all browsers (e.g. Safari), continue
    }
  }

  // 4. Active Device Stream Test & Immediate Cleanup
  let stream = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    // Check if audio tracks are active
    const audioTracks = stream.getAudioTracks();
    if (!audioTracks.length || !audioTracks[0].enabled) {
      throw new Error('No active audio tracks received from microphone.');
    }

    const mimeType = getSupportedAudioMimeType();

    return {
      ok: true,
      state: 'granted',
      mimeType,
      message: 'Microphone is active and working properly.'
    };
  } catch (err) {
    let state = 'hardware_error';
    let message = err.message || 'Microphone error.';

    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      state = 'permission_denied';
      message = 'Microphone permission was denied. Please allow microphone access to take speech Tests.';
    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      state = 'no_device';
      message = 'No microphone device was detected on your phone or computer. Please connect a microphone or headset.';
    } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      state = 'in_use';
      message = 'Microphone is already in use by another application. Please close other voice/call apps and try again.';
    } else if (err.name === 'OverconstrainedError') {
      state = 'unsupported_constraints';
      message = 'Requested microphone audio settings are not supported by your hardware.';
    }

    return { ok: false, state, message, error: err };
  } finally {
    // ALWAYS clean up tracks immediately so hardware indicator turns off
    if (stream) {
      try {
        stream.getTracks().forEach(track => {
          track.stop();
          stream.removeTrack(track);
        });
      } catch (_) {}
    }
  }
}

/**
 * Create a speech recognition session.
 * @param {Object} options
 * @param {string} options.lang - 'en-US' or 'en-GB'
 * @param {Function} options.onResult(transcript) - called with interim/final transcript
 * @param {Function} options.onFinal(transcript) - called on final result
 * @param {Function} options.onError(errorMessage) - called on error
 * @param {Function} options.onStart() - mic started
 * @param {Function} options.onEnd() - mic stopped
 * @returns {{ start, stop, isListening }}
 */
export function createSpeechSession({
  lang = 'en-US',
  onResult,
  onFinal,
  onError,
  onStart,
  onEnd,
} = {}) {
  if (!isSpeechSupported()) {
    onError?.('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
    return { start: () => {}, stop: () => {}, abort: () => {}, isListening: () => false, getState: () => 'idle' };
  }

  const SpeechRecClass = getSpeechRecognitionClass();
  const recognition = new SpeechRecClass();
  recognition.lang = lang;
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  const maxDurationSecs = parseInt(
    (typeof localStorage !== 'undefined' ? localStorage.getItem('ai_max_audio_duration_seconds') : null) ||
    (typeof window !== 'undefined' ? window.TOPSCORE_CONFIG?.maxAudioDuration : null) ||
    '180',
    10
  );
  let _maxDurationTimer = null;
  let _watchdogTimer = null;
  // Robust state machine: 'idle' | 'starting' | 'listening' | 'stopping'
  let _state = 'idle';
  let _isAborted = false;
  let _isStopping = false;
  let _latestInterim = '';

  function _clearWatchdog() {
    if (_watchdogTimer) {
      clearTimeout(_watchdogTimer);
      _watchdogTimer = null;
    }
  }

  recognition.onstart = () => {
    _clearWatchdog();
    _state = 'listening';
    onStart?.();

    // Cost Guard: Hard cap audio recording duration
    if (maxDurationSecs > 0) {
      if (_maxDurationTimer) clearTimeout(_maxDurationTimer);
      _maxDurationTimer = setTimeout(() => {
        if (_state === 'listening') {
          console.warn(`[Cost Guard] Maximum recording ceiling reached (${maxDurationSecs}s). Stopping recording.`);
          try { recognition.stop(); } catch(_) {}
          onError?.(`Cost Guard: Maximum recording limit of ${maxDurationSecs}s reached.`);
        }
      }, maxDurationSecs * 1000);
    }
  };

  recognition.onresult = (event) => {
    let interim = '';
    let final = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const t = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        final += t;
      } else {
        interim += t;
      }
    }
    if (interim) {
      _latestInterim = interim;
      onResult?.(interim);
    }
    if (final) {
      _latestInterim = final;
      onFinal?.(normalizeTranscript(final));
    }
  };

  recognition.onerror = (event) => {
    _clearWatchdog();
    _state = 'idle';
    if (_maxDurationTimer) {
      clearTimeout(_maxDurationTimer);
      _maxDurationTimer = null;
    }

    // Suppress errors if session was intentionally aborted or stopped
    if (_isAborted || _isStopping) {
      return;
    }

    // iOS WebKit Safari / Chrome Silence or Transient Abort Handling
    if (event.error === 'aborted') {
      // Auto-Commit Salvage: If student spoke words and WebKit aborted on pause, commit the text!
      if (_latestInterim && _latestInterim.trim()) {
        try {
          onFinal?.(normalizeTranscript(_latestInterim.trim()));
        } catch (_) {}
      }
      // Never display a disruptive warning toast for 'aborted'
      return;
    }

    const isApple = isIOS();
    let notAllowedMsg = 'Microphone permission was denied. Please allow access in browser settings.';
    let serviceNotAllowedMsg = 'Speech service not allowed. Please check browser settings.';
    let audioCaptureMsg = 'Microphone not found or busy. Please check your device settings.';

    if (isApple) {
      notAllowedMsg = 'Microphone blocked on iPhone. Tap "aA" in Safari address bar > Website Settings > Microphone > Allow, or tap "Type Instead".';
      serviceNotAllowedMsg = 'Dictation disabled on iPhone. Check Settings > General > Keyboard > Enable Dictation, or tap "Type Instead".';
      audioCaptureMsg = 'Microphone busy on iPhone. Please close other voice apps and tap to retry, or tap "Type Instead".';
    }

    const messages = {
      'no-speech':           isApple ? 'No speech detected. On iPhone, speak immediately after tapping mic.' : 'No speech was detected. Please tap mic and speak clearly.',
      'audio-capture':       audioCaptureMsg,
      'not-allowed':         notAllowedMsg,
      'network':             'Network error during recognition. Please check your internet connection.',
      'service-not-allowed': serviceNotAllowedMsg,
    };
    onError?.(messages[event.error] || `Recognition error: ${event.error}`);
  };

  recognition.onend = () => {
    _clearWatchdog();
    _state = 'idle';
    if (_maxDurationTimer) {
      clearTimeout(_maxDurationTimer);
      _maxDurationTimer = null;
    }
    if (_isAborted) {
      return;
    }
    onEnd?.();
  };

  return {
    start() {
      // Prevent concurrent/double starts
      if (_state !== 'idle') return false;
      _state = 'starting';
      _isAborted = false;
      _isStopping = false;

      // 4-second watchdog in case browser speech service hangs on start
      _clearWatchdog();
      _watchdogTimer = setTimeout(() => {
        if (_state === 'starting') {
          console.warn('[SpeechSession] Watchdog timeout: microphone initialization took >4s. Forcing abort.');
          _state = 'idle';
          try { recognition.abort(); } catch(_) {}
          onError?.('Microphone initialization timed out. Please tap to retry.');
        }
      }, 4000);

      try {
        recognition.start();
        return true;
      } catch (e) {
        if (e.name === 'InvalidStateError' || e.message?.includes('invalid state')) {
          // iOS Safari WebKit transient state: retry once after brief hardware release
          setTimeout(() => {
            if (_state === 'starting') {
              try {
                recognition.start();
              } catch (retryErr) {
                _clearWatchdog();
                _state = 'idle';
                onError?.(`Could not start recognition: ${retryErr.message}`);
              }
            }
          }, 80);
          return true;
        }
        _clearWatchdog();
        _state = 'idle';
        onError?.(`Could not start recognition: ${e.message}`);
        return false;
      }
    },
    stop() {
      _isStopping = true;
      _clearWatchdog();
      if (_maxDurationTimer) {
        clearTimeout(_maxDurationTimer);
        _maxDurationTimer = null;
      }
      if (_state === 'listening' || _state === 'starting') {
        _state = 'stopping';
        try { recognition.stop(); } catch (_) {}
      }
    },
    abort() {
      _isAborted = true;
      _clearWatchdog();
      if (_maxDurationTimer) {
        clearTimeout(_maxDurationTimer);
        _maxDurationTimer = null;
      }
      _state = 'idle';
      // CRITICAL: Strip all event listeners immediately to prevent asynchronous ghost events from destroying subsequent sessions
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try { recognition.abort(); } catch (_) {}
    },
    getState() { return _state; },
    isListening() { return _state === 'listening' || _state === 'starting'; },
  };
}

/**
 * Normalize transcript:
 * - lowercase, trim
 * - "I'm" -> "I am"
 * - "I've" -> "I have" etc. for common contractions
 */
function normalizeTranscript(text) {
  return text
    .trim()
    .replace(/\bi'm\b/gi, 'I am')
    .replace(/\bi've\b/gi, 'I have')
    .replace(/\bi'll\b/gi, 'I will')
    .replace(/\bi'd\b/gi, 'I would')
    .replace(/\bdon't\b/gi, 'do not')
    .replace(/\bdoesn't\b/gi, 'does not')
    .replace(/\bcan't\b/gi, 'cannot')
    .replace(/\bwon't\b/gi, 'will not')
    .replace(/\baren't\b/gi, 'are not')
    .replace(/\bwasn't\b/gi, 'was not')
    .replace(/\bweren't\b/gi, 'were not')
    .replace(/\bhasn't\b/gi, 'has not')
    .replace(/\bhaven't\b/gi, 'have not')
    .replace(/\bhadn't\b/gi, 'had not');
}
