<!DOCTYPE html>
<html lang="en" translate="no" class="notranslate">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="google" content="notranslate" />
  <meta name="googlebot" content="notranslate" />
  <meta name="robots" content="notranslate" />
  <title>ASSESSMENT â€” TOPS CORE</title>
  <meta name="description" content="Complete your English ASSESSMENT on TOPS CORE." />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="css/style.css" />
  <link rel="stylesheet" href="css/dashboard.css" />

  <style>
    /* ===== SPEECH-TO-TEXT CENTERED LAYOUT ===== */
    body.assessment-page {
      /* padding removed */
      background: linear-gradient(170deg, #021e33 0%, #032b43 30%, #01121d 100%);
      height: 100vh;
      max-height: 100vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      margin: 0;
      color: #fff;
    }
    
    .speech-center-layout {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      width: 100%;
      padding: 0 1rem;
      gap: 0;
    }

    /* Question Card â€” white body, blue header */
    .speech-question-card {
      width: 100%;
      max-width: 520px;
      background: #ffffff;
      border-radius: 16px;
      text-align: left;
      margin-bottom: 0.5rem;
      box-shadow: 0 8px 32px rgba(0,0,0,0.25);
      
    }

    .speech-question-number {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--clr-text-3);
      margin-bottom: 0.5rem;
    }

    .speech-question-text {
      font-family: 'Outfit', sans-serif;
      font-size: 1.6rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.01em;
      line-height: 1.25;
      margin-bottom: 0.75rem;
      word-break: break-word;
    }

    /* Transcript Card (Frosted Glass) */
    .speech-transcript-card {
      width: 100%;
      max-width: 520px;
      background: rgba(255,255,255,0.08);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 16px;
      padding: 1.5rem;
      color: #fff;
      margin-top: 0.5rem;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    }
    
    .speech-transcript-box {
      font-size: 1.05rem;
      font-weight: 500;
      color: #f1f5f9;
      min-height: 52px;
      text-align: left;
      line-height: 1.6;
      word-break: break-word;
    }
    .speech-transcript-placeholder {
      color: rgba(255,255,255,0.5);
      font-style: italic;
      font-size: 0.95rem;
    }

    /* MIC ZONE */
    .speech-mic-zone {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.4rem;
      margin-top: 1.5rem;
      position: relative;
      width: 100%;
      max-width: 520px;
    }

    .speech-mic-btn-lg {
      width: 76px;
      height: 76px;
      border-radius: 50%;
      border: 4px solid rgba(16, 185, 129, 0.4);
      background: linear-gradient(135deg, #10b981, #047857);
      color: #fff;
      font-size: 2.2rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 20px rgba(16, 185, 129, 0.4);
      transition: transform 0.15s, box-shadow 0.15s;
      position: relative;
      -webkit-tap-highlight-color: transparent;
    }
    .speech-mic-btn-lg:hover {
      transform: scale(1.05);
      box-shadow: 0 0 28px rgba(16, 185, 129, 0.6);
    }
    .speech-mic-btn-lg.listening {
      background: linear-gradient(135deg, #ef4444, #b91c1c);
      border-color: rgba(239,68,68,0.4);
      box-shadow: 0 0 20px rgba(239, 68, 68, 0.4);
      animation: micPulse 1.2s ease-in-out infinite;
    }
    @keyframes micPulse {
      0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); }
      70%  { box-shadow: 0 0 0 18px rgba(239,68,68,0); }
      100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
    }

    .speech-status-text {
      font-size: 0.8rem;
      font-weight: 500;
      color: rgba(255,255,255,0.7);
      text-align: center;
      min-height: 1.4em;
    }

    /* Nav buttons row */
    .speech-nav-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      max-width: 520px;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }

    /* Unanswered panel */
    .speech-unanswered-panel {
      width: 100%;
      max-width: 520px;
      background: rgba(239,68,68,0.06);
      border: 1px solid rgba(239,68,68,0.2);
      border-radius: 14px;
      padding: 0.75rem 1rem;
      margin-top: 0.75rem;
    }
    .speech-unanswered-title {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #f87171;
      margin-bottom: 0.5rem;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .speech-unanswered-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
    }
    .speech-unanswered-chip {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 3px 9px;
      border-radius: 20px;
      background: rgba(239,68,68,0.12);
      border: 1px solid rgba(239,68,68,0.3);
      color: #fca5a5;
      cursor: pointer;
      transition: background 0.15s;
    }
    .speech-unanswered-chip:hover {
      background: rgba(239,68,68,0.25);
    }
    .speech-all-answered-msg {
      font-size: 0.8rem;
      color: #34d399;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 5px;
    }

    /* GENERAL ASSESSMENT UI (FROSTED GLASS) */
    .mc-option {
      width: 100%;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 12px;
      padding: 1rem 1.25rem;
      margin-bottom: 0.75rem;
      color: #fff;
      font-size: 1.1rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      cursor: pointer;
      transition: all 0.2s ease;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      box-sizing: border-box;
    }
    .mc-option:hover {
      background: rgba(255,255,255,0.15);
      transform: translateY(-2px);
    }
    .mc-option.selected {
      background: rgba(52, 211, 153, 0.15);
      border-color: #34d399;
      box-shadow: 0 0 15px rgba(52, 211, 153, 0.2);
    }
    .mc-letter {
      background: rgba(255,255,255,0.15);
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.9rem;
      flex-shrink: 0;
    }
    .mc-option.selected .mc-letter {
      background: #34d399;
      color: #000;
    }

    .written-input {
      width: 100%;
      min-height: 120px;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 12px;
      padding: 1.25rem;
      color: #fff;
      font-size: 1.1rem;
      font-family: inherit;
      resize: vertical;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      box-sizing: border-box;
    }
    .written-input:focus {
      outline: none;
      border-color: #3b82f6;
      background: rgba(255,255,255,0.12);
    }

    select.form-control {
      width: 100%;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 12px;
      padding: 1rem 1.25rem;
      color: #fff;
      font-size: 1.1rem;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      box-sizing: border-box;
      appearance: none;
    }
    select.form-control option {
      background: #0f172a;
      color: #fff;
    }
  
    .frosted-input:focus, .form-control:focus {
      border-color: #34d399 !important;
      box-shadow: 0 0 15px rgba(52, 211, 153, 0.2) !important;
      background: rgba(255, 255, 255, 0.12) !important;
    }
  
    /* FOCUS MODE CSS */
    body.focus-mode header,
    body.focus-mode #progress-bar-toggle,
    body.focus-mode .bottom-nav-bar {
      opacity: 0.15 !important;
      pointer-events: none !important;
    }
    header, #progress-bar-toggle, .bottom-nav-bar {
      transition: opacity 0.5s ease;
    }

    .assessment-body {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      padding: 0 12px;
      box-sizing: border-box;
    }

    /* Virtual Keyboard */
    #virtual-keyboard-container { 
    flex-shrink: 0; 
    height: auto; 
    padding: 8px 6px; 
    background: rgba(10, 15, 30, 0.95); 
    border-top: 1px solid rgba(255,255,255,0.05); 
    backdrop-filter: blur(10px); 
    display: none; 
    flex-direction: column; 
    box-sizing: border-box; 
    z-index: 1000; 
    box-shadow: 0 -4px 15px rgba(0,0,0,0.3); 
} 
.vk-row { 
    display: flex; 
    justify-content: center; 
    gap: 6px; 
    margin-bottom: 6px; 
} 
.vk-row:last-child { 
    margin-bottom: 0; 
} 
.vk-key { 
    flex: 1; 
    aspect-ratio: 1 / 1; 
    max-height: 44px; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    max-width: 9%; 
    border-radius: 6px; 
    background: rgba(255,255,255,0.08); 
    border: 1px solid rgba(255,255,255,0.1); 
    color: #e2e8f0; 
    font-size: 1.15rem; 
    font-family: inherit; 
    font-weight: 500; 
    cursor: pointer; 
    -webkit-user-select: none; 
    user-select: none; 
    transition: all 0.1s ease; 
} 
.vk-key:active { 
    background: rgba(255,255,255,0.25); 
    transform: scale(0.95); 
    border-color: rgba(255,255,255,0.3); 
} 
.vk-key.special { 
    max-width: 15%; 
    background: rgba(99, 102, 241, 0.2); 
    color: #a5b4fc; 
    font-size: 0.95rem; 
    border-color: rgba(99, 102, 241, 0.3); 
} 
.vk-key.special:active { 
    background: rgba(99, 102, 241, 0.4); 
} 
.vk-key.space { 
    max-width: 45%; 
    aspect-ratio: unset; 
} 
</style>
</head>
<body class="assessment-page notranslate" translate="no">

  <div id="toast-container"></div>

    <header style="flex-shrink: 0; width:100%; max-width:800px; margin:0 auto; padding:12px; display:flex; flex-direction:column; gap:8px; box-sizing:border-box; position:relative; z-index:999;">
    <!-- Top Row: Timer, Submit -->
        <div style="display:flex; justify-content:space-between; align-items:center; width:100%; gap:8px;">
      <div class="assessment-timer" id="assessment-timer" style="display:inline-flex; align-items:center; gap:6px; background:rgba(255,255,255,0.15); padding:6px 12px; border-radius:12px; backdrop-filter:blur(10px); flex-shrink:0;">
        <span style="font-size:1.1rem;">⏳</span>
        <span id="timer-display" style="font-weight:800; color:#fca5a5; font-size:1.1rem; letter-spacing: 0.05em;">--:--</span>
      </div>
      <button onclick="window.openSubmitModal()" style="display:flex; align-items:center; gap:6px; background:#dc2626; color:#fff; border:none; border-radius:12px; padding:6px 12px; font-size:0.9rem; font-weight:800; cursor:pointer; flex-shrink:0; box-shadow:0 4px 12px rgba(0,0,0,0.3); transition: transform 0.2s;">
        <span>🏳️</span> Give up!
      </button>
    </div>

    <!-- Assessment Title Full Width -->
    <div style="width:100%; text-align:center; margin-bottom: 4px;">
       <h1 id="assessment-main-title" style="font-size:clamp(1rem, 3.5vw, 1.25rem); font-weight:800; color:#fff; font-family:'Outfit', sans-serif; line-height: 1.3; margin: 0; text-shadow:0 2px 4px rgba(0,0,0,0.5);">Assessment Title</h1>
    </div>

    <!-- Student Profile (Compact) -->
    <div style="display:flex; align-items:center; justify-content:flex-start; text-align:left; gap:12px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:10px; box-shadow:0 4px 12px rgba(0,0,0,0.15);">
      <img id="assessment-student-avatar" src="https://ui-avatars.com/api/?name=S&background=random" style="width:48px; height:48px; border-radius:12px; object-fit:cover; border:2px solid #06b6d4;" />
      <div style="display:flex; flex-direction:column; line-height:1.2; min-width: 0;">
        <span id="assessment-student-name" style="font-size:1.05rem; font-weight:800; color:#fff; font-family:'Outfit',sans-serif; margin-bottom:2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">-</span>
        <span id="assessment-student-details" style="font-size:0.75rem; font-weight:600; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Loading details...</span>
      </div>
    </div>
  </header>

  <!-- ASSESSMENT progress bar & Pop-up Grid -->
  <div style="width:100%; max-width:800px; margin:0 auto; padding:0 15px 15px; box-sizing:border-box; display:flex; flex-direction:column; align-items:center; position:relative; z-index:999;">
    <!-- Progress Bar (Clickable Toggle) -->
    <div id="progress-bar-toggle" style="width:100%; max-width:520px; cursor:pointer; position:relative;" onclick="document.getElementById('matrix-popup').style.display = document.getElementById('matrix-popup').style.display === 'none' ? 'block' : 'none'">
      <div style="display:flex; justify-content:space-between; margin-bottom:4px; padding:0 4px;">
        <span style="font-size:0.85rem; font-weight:600; color:#cbd5e1;">Progress (Tap to view grid)</span>
        <span id="progress-text-percent" style="font-size:0.85rem; font-weight:800; color:#34d399;">0%</span>
      </div>
      <div class="assessment-progress-wrap" style="height:18px; border-radius:10px; background:rgba(255,255,255,0.15); overflow:hidden;">
        <div class="assessment-progress-fill" id="assessment-progress-fill" style="width:0%; height:100%; background:linear-gradient(to right, #3b82f6, #34d399); transition:width 0.3s; border-radius:10px;"></div>
      </div>
    </div>
    
    <!-- Pop-up Question Matrix -->
    <div id="matrix-popup" style="display:none; position:absolute; top:55px; left:50%; transform:translateX(-50%); width:90%; max-width:400px; background:rgba(15,23,42,0.98); backdrop-filter:blur(12px); border:1px solid rgba(255,255,255,0.2); border-radius:12px; padding:15px; box-shadow:0 10px 35px rgba(0,0,0,0.7); z-index:9999;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <span style="font-size:0.85rem; font-weight:700; color:#fff;">Question Matrix</span>
        <button id="close-matrix-btn" style="background:transparent; border:none; color:#94a3b8; font-size:1.1rem; cursor:pointer;" onclick="document.getElementById('matrix-popup').style.display='none'">âœ•</button>
      </div>
      
      <!-- GRID CONTAINER: CSS must be grid with 10 columns -->
      <div style="max-height: 40vh; overflow-y: auto; padding-right: 4px;">
        <div class="q-nav-grid" id="q-nav-grid" role="navigation" aria-label="Jump to question" style="display:grid; grid-template-columns:repeat(10, 1fr); gap:6px;">
          <!-- Filled dynamically -->
        </div>
      </div>
      
      <div class="mt-3 pt-3" style="border-top:1px solid rgba(255,255,255,0.1); margin-top:12px; padding-top:12px; display:flex; flex-direction:column; gap:8px;">
        <button class="btn btn-secondary w-100 btn-sm" id="btn-sidebar-jump-unanswered" style="font-size:0.78rem;padding:8px;border-radius:8px;display:flex;align-items:center;justify-content:center;gap:6px;" onclick="document.getElementById('matrix-popup').style.display='none'">
          ðŸ” Jump to Next Unanswered
        </button>
        <button class="btn btn-success w-100" id="global-submit-btn" style="padding:10px;font-weight:600;">
          Submit ASSESSMENT ðŸ“‹
        </button>
      </div>
    </div>
  </div>

  <!-- ASSESSMENT body -->
    <div class="assessment-body">
    <!-- Main question area -->
    <main class="assessment-main-content" id="assessment-main" aria-live="polite" style="flex:1; display:flex; flex-direction:column; align-items:center;">
      <div class="question-card">
        <div class="empty-state">
          <div class="spinner"></div>
          <p>Loading ASSESSMENTâ€¦</p>
        </div>
      </div>
    </main>
  </div>

      <!-- Virtual Keyboard -->
  <div id="virtual-keyboard-container">
    <div class="vk-row">
      <button class="vk-key" data-key="q">q</button><button class="vk-key" data-key="w">w</button><button class="vk-key" data-key="e">e</button><button class="vk-key" data-key="r">r</button><button class="vk-key" data-key="t">t</button><button class="vk-key" data-key="y">y</button><button class="vk-key" data-key="u">u</button><button class="vk-key" data-key="i">i</button><button class="vk-key" data-key="o">o</button><button class="vk-key" data-key="p">p</button>
    </div>
    <div class="vk-row">
      <button class="vk-key" data-key="a">a</button><button class="vk-key" data-key="s">s</button><button class="vk-key" data-key="d">d</button><button class="vk-key" data-key="f">f</button><button class="vk-key" data-key="g">g</button><button class="vk-key" data-key="h">h</button><button class="vk-key" data-key="j">j</button><button class="vk-key" data-key="k">k</button><button class="vk-key" data-key="l">l</button>
    </div>
    <div class="vk-row">
      <button class="vk-key" data-key="-">-</button>
      <button class="vk-key" data-key="z">z</button><button class="vk-key" data-key="x">x</button><button class="vk-key" data-key="c">c</button><button class="vk-key" data-key="v">v</button><button class="vk-key" data-key="b">b</button><button class="vk-key" data-key="n">n</button><button class="vk-key" data-key="m">m</button>
      <button class="vk-key special" data-key="Backspace">⌫</button>
    </div>
    <div class="vk-row">
      <button class="vk-key special" data-key=",">,</button>
      <button class="vk-key space" data-key=" ">Space</button>
      <button class="vk-key special" data-key=".">.</button>
      <button class="vk-key special" data-key="Enter">⏎</button>
    </div>
    </div>
    </div>

    <!-- Bottom Nav Bar (Mobile) -->
  <div class="bottom-nav-bar" style="flex-shrink:0; position:relative; padding:12px 16px; margin-bottom: 0; background: transparent; display: flex; justify-content: space-between; align-items: center; gap:8px;">
    <button class="btn btn-secondary" id="bottom-prev-btn" style="padding:10px 16px; font-size:0.95rem; font-weight:700; border-radius:12px;" disabled>&larr; Prev</button>
    <div class="bottom-nav-status" id="question-counter" style="font-weight:700; font-size:0.9rem; color:#94a3b8; text-align:center; min-width:100px;">0/0</div>
    <button class="btn btn-primary" id="bottom-next-btn" style="padding:10px 16px; font-size:0.95rem; font-weight:700; border-radius:12px;">Next ➔</button>
  </div>
    </div>

  <!-- Anti-Cheat Flashing Overlay -->
  <div id="cheat-overlay" role="alertdialog" aria-modal="true" aria-labelledby="cheat-title">
    <div class="cheat-box">
      <h2 id="cheat-title" style="font-size:1.6rem;font-weight:800;color:#ffffff;margin-bottom:0.75rem;">ðŸš¨ CHEATING ATTEMPT DETECTED! ðŸš¨</h2>
      <p style="font-size:1rem;color:rgba(255,255,255,0.9);margin-bottom:1.5rem;" id="cheat-reason">You were detected trying to leave the ASSESSMENT page or using navigation buttons!</p>
      <div id="cheat-timer-count" style="font-size:4rem;font-weight:900;color:#fca5a5;margin-bottom:1.5rem;text-shadow:0 4px 20px rgba(0,0,0,0.5);"></div>
      <button class="btn btn-primary" id="dismiss-cheat-btn" style="background:#ffffff;color:#dc2626;font-weight:800;border:none;padding:0.75rem 2rem;font-size:1.05rem;box-shadow:0 10px 25px rgba(0,0,0,0.3);">
        Return to My ASSESSMENT
      </button>
    </div>
  </div>

  <!-- Submit confirm modal -->
  <div class="modal-backdrop hidden" id="submit-modal" role="dialog" aria-modal="true" aria-labelledby="submit-modal-title">
    <div class="modal-box" style="max-width:480px;text-align:center;">
      <div style="font-size:3rem;margin-bottom:var(--space-3);" id="submit-modal-icon">✅</div>
      <h3 id="submit-modal-title" class="mb-3">Submit ASSESSMENT?</h3>
      <div id="unanswered-warning-banner" class="hidden mb-4 p-3 rounded text-sm text-left" style="background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.4);color:#fca5a5;">
        <div class="fw-700 text-danger mb-1">âš ï¸  INCOMPLETE ASSESSMENT WARNING:</div>
        <p id="unanswered-warning-text" class="text-xs text-muted mb-0" style="color:rgba(255,255,255,0.9)!important;"></p>
      </div>
      <p class="text-muted text-sm mb-6" id="submit-modal-message">
        You have answered <strong id="answered-count">0</strong> of <strong id="total-count">0</strong> questions.
        Once submitted, you cannot change your answers.
      </p>
      <div style="display:flex; flex-direction:column; gap:12px;">
        <button class="btn btn-primary w-100" id="confirm-submit-btn" style="padding:12px;font-size:1rem;">Submit ASSESSMENT</button>
        <button class="btn btn-secondary w-100" id="cancel-submit-btn" style="padding:12px;font-size:1rem;">Keep Reviewing</button>
      </div>
    </div>
  </div>

  <script type="module">
    import { startASSESSMENT, saveAnswer, submitAssessment, logCheatingEvent, getServerTimeWita, checkAndTriggerLevelUp, getSecuritySettings } from './js/api.js?v=4.7.12';
    import { evaluateAnswer } from './js/grading.js?v=4.7.12';
    import { requireStudentSession } from './js/session.js?v=4.7.12';
    import { showToast, showLoading, hideLoading, formatTime, escapeHtml as appEscapeHtml, fixMojibake } from './js/app.js?v=4.7.12';
    import { startCountdown, isExpired } from './js/timer.js?v=4.7.12';
    import { createSpeechSession, isSpeechSupported } from './js/speech.js?v=4.7.12';
    import { SUPABASE_URL, SUPABASE_ANON_KEY, getSupabase } from './js/supabase.js?v=4.7.12';

    function escapeHtml(str) {
      if (typeof appEscapeHtml === 'function') return appEscapeHtml(str);
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
    window.escapeHtml = escapeHtml;

    const session = requireStudentSession();
    if (!session) throw new Error('Not authenticated');

    const urlParams = new URLSearchParams(window.location.search);
    // Case-insensitive assessment ID extraction â€” resilient across all URL param casings
    let assessmentId = urlParams.get('assessment_id') ||
                       urlParams.get('Assessment_id') ||
                       urlParams.get('ASSESSMENT_id') ||
                       sessionStorage.getItem('topscore_assessment_id') ||
                       sessionStorage.getItem('topscore_ASSESSMENT_id');

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

    // â€”â€” Anti-Cheat State & Functions â€”â€”
    let isAssessmentActive = false;
    let cheatInterval = null;
    let beepInterval = null;
    let audioCtx = null;
    let securityConfig = { enabled: false, soundEnabled: true, countdownSeconds: 10 };

    function playBeepSound() {
      try {
        if (!audioCtx) {
          audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(950, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
      } catch(e) {
        console.warn('Audio play failed:', e);
      }
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
          triggerCheatAlert('Browser Navigation / Back Button Pressed');
        }
      });
    }

    function triggerCheatAlert(reason) {
      if (!isAssessmentActive || cheatInterval || !securityConfig.enabled) return;

      logCheatingEvent(session.student_id, assessmentId, 'CHEAT_ATTEMPT', {
        reason: reason,
        url: location.href,
        user_agent: navigator.userAgent
      });

      const overlay = document.getElementById('cheat-overlay');
      const countEl = document.getElementById('cheat-timer-count');
      const reasonEl = document.getElementById('cheat-reason');

      if (reasonEl) reasonEl.textContent = `Warning: ${reason}!`;
      overlay.style.display = 'flex';

      if (securityConfig.soundEnabled) {
        playBeepSound();
        beepInterval = setInterval(playBeepSound, 800);
      }

      let secondsLeft = securityConfig.countdownSeconds;
      if (countEl) countEl.textContent = secondsLeft;

      cheatInterval = setInterval(() => {
        secondsLeft--;
        if (countEl) countEl.textContent = secondsLeft;
        if (secondsLeft <= 0) {
          clearInterval(cheatInterval);
          doSubmit(true);
        }
      }, 1000);
    }

    function dismissCheatAlert() {
      if (cheatInterval) { clearInterval(cheatInterval); cheatInterval = null; }
      if (beepInterval) { clearInterval(beepInterval); beepInterval = null; }
      const overlay = document.getElementById('cheat-overlay');
      if (overlay) overlay.style.display = 'none';
    }

    document.getElementById('dismiss-cheat-btn')?.addEventListener('click', dismissCheatAlert);
    document.getElementById('cheat-overlay')?.addEventListener('click', (e) => {
      if (e.target === document.getElementById('cheat-overlay')) dismissCheatAlert();
    });

    // Detect switching tab or minimizing browser
    document.addEventListener('visibilitychange', () => {
      if (!securityConfig.enabled) return;
      if (isAssessmentActive && document.hidden) {
        triggerCheatAlert('Leaving the Tab / Switching Applications');
        if (attemptData && attemptData.id && SUPABASE_URL && SUPABASE_ANON_KEY) {
          const payload = new Blob([JSON.stringify({ p_attempt_id: attemptData.id })], { type: 'application/json' });
          navigator.sendBeacon(`${SUPABASE_URL}/rest/v1/rpc/auto_close_expired_attempts?apikey=${SUPABASE_ANON_KEY}`, payload);
        }
      }
    });

    // Detect opening another app or losing window focus
    window.addEventListener('blur', () => {
      if (!securityConfig.enabled) return;
      if (isAssessmentActive) {
        triggerCheatAlert('Screen lost focus / Opened another application');
      }
    });

    // Auto-submit when closing tab or browser
    function submitOnPageExit() {
      if (!isAssessmentActive || !attemptData?.id) return;
      saveCurrentAnswer();
      isAssessmentActive = false;
      const token = sessionStorage.getItem('topscore_student_token') || '';
      const payload = JSON.stringify({
        attempt_id: attemptData.id,
        token: token,
        status: 'auto_submitted',
        answers: answeredMap
      });
      const blob = new Blob([payload], { type: 'application/json' });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/functions/v1/emergency-submit', blob);
      }
    }

    window.addEventListener('pagehide', submitOnPageExit);

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
      let seed = 0;
      for (let i = 0; i < seedStr.length; i++) {
        seed = (seed << 5) - seed + seedStr.charCodeAt(i);
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

    // â€”â€” Boot â€”â€”
    async function bootAssessment() {
      showLoading('Starting ASSESSMENTâ€¦');
      try {
        const fetchedConfig = await getSecuritySettings();
        if (fetchedConfig) { securityConfig = fetchedConfig; securityConfig.enabled = false; } // TEMPORARILY DISABLED BY REQUEST

        const result = await startASSESSMENT(session.student_id, assessmentId);
        attemptData = result.attempt;
        assessmentData = result.assessment || result.ASSESSMENT;
        assessmentSections = result.sections || [];
        allAnswerRows = result.answers || [];

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


        // Question order shuffle (if random)
        if (assessmentData?.question_order === 'random' && allAnswerRows.length > 1) {
          allAnswerRows = shuffleWithSeed(allAnswerRows, attemptData.id || assessmentId);
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
          assessmentDisplayName = parts.length > 0 ? parts.join(' • ') : (assessmentData?.assessment_title || 'ASSESSMENT');
        }

        try {
          const classEl = document.getElementById('assessment-class-name');
          if (classEl && assessmentData.classes?.name) classEl.textContent = assessmentData.classes.name;
          const titleEl = document.getElementById('assessment-main-title');
          if (titleEl) {
              const urlParams = new URLSearchParams(window.location.search);
              const fallbackTitle = urlParams.get('title') || sessionStorage.getItem('topscore_assessment_title');
              titleEl.textContent = fixMojibake(assessmentDisplayName || fallbackTitle || assessmentData?.title || assessmentData?.assessment_title || assessmentData?.name || 'Assessment');
            }
        } catch(e) {}

        // Fetch student info for header
        try {
          const nameEl = document.getElementById('assessment-student-name');
          const avatarEl = document.getElementById('assessment-student-avatar');
          const detailsEl = document.getElementById('assessment-student-details');

          if (nameEl) nameEl.textContent = session.student_name || 'Student';
          if (detailsEl && session.institution_name) {
              // Safely replace mojibake using unicode escapes
              const badRegex1 = new RegExp('\u00C3\u00A2\u20AC\u00A2', 'g'); // Ã¢€¢
              const badRegex2 = new RegExp('\u00E2\u20AC\u00A2', 'g'); // â€¢
              const badRegex3 = new RegExp('\u00C2\u00B7', 'g'); // Â·
              
              let cleanedInst = session.institution_name.replace(badRegex1, '•').replace(badRegex2, '•').replace(badRegex3, '•');
              let cleanedProg = (session.program_name || '').replace(badRegex1, '•').replace(badRegex2, '•').replace(badRegex3, '•');
              let cleanedBatch = (session.batch_name || '').replace(badRegex1, '•').replace(badRegex2, '•').replace(badRegex3, '•');
              
              detailsEl.textContent = cleanedInst + (cleanedProg ? ' • ' + cleanedProg : '') + (cleanedBatch ? ' • ' + cleanedBatch : '');
            }
          
          fetch(`${SUPABASE_URL}/rest/v1/students?id=eq.${session.student_id}&select=*,institutions(name),programs(name),batches(name),levels(name)`, {
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${sessionStorage.getItem('topscore_student_token') || SUPABASE_ANON_KEY}` }
          }).then(r => r.json()).then(stuRes => {
            if (stuRes && stuRes[0]) {
              const s = stuRes[0];
              if (s.photo_url && avatarEl) {
                avatarEl.src = s.photo_url;
              } else if (avatarEl) {
                avatarEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(session.student_name || 'S')}&background=random`;
              }
              
              let age = '';
              if (s.date_of_birth) {
                const ageNum = Math.floor((new Date() - new Date(s.date_of_birth)) / 31557600000);
                if (ageNum > 0) age = ageNum + ' y.o.';
              }
              
              const inst = s.institutions?.name || '';
              const prog = s.programs?.name || '';
              const batch = s.batches?.name || '';
              const lvl = s.levels?.name ? 'Lvl ' + s.levels.name : '';
              
              const details = [age, inst, prog, batch, lvl].filter(Boolean).join(' • ');
              if (detailsEl) detailsEl.textContent = fixMojibake(details);
            } else if (avatarEl) {
              avatarEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(session.student_name || 'S')}&background=random`;
            }
          }).catch(e => {
            console.warn("Failed to fetch student details", e);
            if (avatarEl) avatarEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(session.student_name || 'S')}&background=random`;
          });

        } catch (e) {
          console.warn("Failed to load student profile:", e);
        }

        // V1: If no answer rows at all, show error
        if (!allAnswerRows || allAnswerRows.length === 0) {
          hideLoading();
          document.getElementById('assessment-main').innerHTML = `
            <div class="question-card text-center" style="padding:3.5rem 1.5rem;text-align:center;">
              <div style="font-size:3.5rem;margin-bottom:1rem;">âš ï¸ </div>
              <h3 style="font-size:1.4rem;font-weight:700;margin-bottom:0.75rem;">No Questions Found</h3>
              <p class="text-muted" style="max-width:440px;margin:0 auto 1.5rem;line-height:1.6;">
                This assessment does not have any questions yet. Please inform your instructor or administrator.
              </p>
              <button class="btn btn-primary" onclick="window.location.href='dashboard.html'">Return to Dashboard</button>
            </div>
          `;
          return;
        }

        // V1 Snapshot fallback: if no legacy sections, synthesize a default section
        // so assessment_questions snapshot rows (which have no section_id) render correctly
        if (!assessmentSections || assessmentSections.length === 0) {
          assessmentSections = [{ id: 'default', title: assessmentData?.title || assessmentData?.assessment_title || 'Assessment', section_order: 1 }];
          allAnswerRows.forEach(row => {
            if (row.question_snapshot) {
              if (typeof row.question_snapshot === 'string') {
                try {
                  const parsed = JSON.parse(row.question_snapshot);
                  parsed.section_id = 'default';
                  row.question_snapshot = parsed;
                } catch (e) {
                  row.question_snapshot = { section_id: 'default' };
                }
              } else if (typeof row.question_snapshot === 'object') {
                row.question_snapshot.section_id = 'default';
              }
            } else {
              row.question_snapshot = { section_id: 'default' };
            }
          });
        }

        // Figure out current section
        const savedSecIndex = parseInt(sessionStorage.getItem(`topscore_sec_${attemptData.id}`), 10);
        if (!isNaN(savedSecIndex) && savedSecIndex >= 0 && savedSecIndex < assessmentSections.length) {
          currentSectionIndex = savedSecIndex;
        } else {
          currentSectionIndex = 0;
        }

        hideLoading();
        startSection(currentSectionIndex);

        // Activate Anti-Cheat System
        isAssessmentActive = true;
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
         return snap.section_id === currentSection.id;
       });

       const nameEl = document.getElementById('assessment-name');
       if (nameEl) nameEl.textContent = assessmentDisplayName + ` - ${currentSection.title || `Section ${index + 1}`}`;
       const metaEl = document.getElementById('assessment-meta');
       if (metaEl) metaEl.textContent = `${answerRows.length} Questions · ${session.student_name}`;

       buildNavGrid();
       startTimer(currentSection);
       renderQuestion(0);
    }

    // â€”â€” Timer â€”â€”
    function startTimer(currentSection) {
      if (timerController) timerController.stop();

      // V1 uses expires_at; legacy used expected_end_at â€” check both
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
          showToast('Time is up! Submitting your ASSESSMENTâ€¦', 'warning', 5000);
          autoSubmit();
       }
    }

    // â€”â€” Build Nav Grid â€”â€”
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
          if (window.innerWidth <= 768) {
            document.getElementById('qNavDrawer')?.classList.remove('open');
          }
        });
        grid.appendChild(btn);
      });
      updateNavGrid();
    }

    function updateNavGrid() {
      answerRows.forEach((row, idx) => {
        const btn = document.getElementById(`qnav-${idx}`);
        if (!btn) return;
        btn.classList.toggle('answered', !!answeredMap[row.id]);
        btn.classList.toggle('current', idx === currentIndex);
      });

      // Progress bar (global across all sections)
      const answered = Object.values(answeredMap).filter(v => v?.trim()).length;
      const pct = allAnswerRows.length > 0 ? (answered / allAnswerRows.length) * 100 : 0;
      document.getElementById('assessment-progress-fill').style.width = pct + '%';
        const ptp = document.getElementById('progress-text-percent');
        if(ptp) ptp.textContent = Math.round(pct) + '%';
      const counterEl = document.getElementById('question-counter');
      if(counterEl) counterEl.textContent = `${answered}/${allAnswerRows.length} answered`;
    }

    // â€”â€” Render Question â€”â€”
    