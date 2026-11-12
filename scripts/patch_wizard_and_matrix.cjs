'use strict';
const fs = require('fs');
const FILE = 'd:/Drives/Tutor Tampan/TopsCore/js/admin/tests-access.js';
let lines = fs.readFileSync(FILE, 'utf8').split('\n');

// ══════════════════════════════════════════════════════
// PART A: Replace Wizard modal — lines 358–437 (0-indexed: 357–436)
// ══════════════════════════════════════════════════════

// Verify anchor lines before replacing
const L358 = lines[357].trim();
const L437 = lines[436].trim();
console.log('L358 anchor:', L358.slice(0,60));
console.log('L437 anchor:', L437.slice(0,60));

const WIZARD_LINES = [
"    <!-- Modal 1: Open Test Session (Normal / Remedial) -->",
"    <div id=\"modal-theme-open-session\" class=\"modal-backdrop hidden\" style=\"position:fixed; inset:0; background:rgba(0,0,0,0.8); display:flex; align-items:center; justify-content:center; z-index:9999; padding:16px;\">",
"      <div class=\"modal-box card\" style=\"background:#0f172a; border:1px solid rgba(255,255,255,0.15); border-radius:12px; width:100%; max-width:820px; max-height:92vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 24px 50px rgba(0,0,0,0.8);\">",
"",
"        <!-- Modal Header -->",
"        <div style=\"padding:18px 24px; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:flex-start; flex-shrink:0;\">",
"          <div>",
"            <div id=\"open-modal-theme-badge\" style=\"display:inline-block; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:0.06em; padding:2px 8px; border-radius:4px; margin-bottom:4px;\">THEME A</div>",
"            <h3 id=\"open-modal-title\" style=\"margin:0; font-size:1.25rem; font-weight:800; color:#ffffff;\">Open Test Session</h3>",
"            <div id=\"open-modal-subtitle\" style=\"font-size:12px; color:#94a3b8; margin-top:2px;\">Words Exam &amp; Phrases Exam unlocked simultaneously.</div>",
"          </div>",
"          <button type=\"button\" class=\"btn btn-ghost btn-icon\" id=\"btn-close-open-modal\" style=\"color:#94a3b8; font-size:1.25rem; padding:4px 8px;\">✕</button>",
"        </div>",
"",
"        <!-- Modal Body: 2-column grid -->",
"        <div style=\"display:grid; grid-template-columns:1fr 1fr; gap:0; overflow:hidden; flex:1; min-height:0;\">",
"",
"          <!-- LEFT: Settings (Batch + Answering Mode + Duration) -->",
"          <div style=\"padding:20px 20px 20px 24px; overflow-y:auto; display:flex; flex-direction:column; gap:18px; border-right:1px solid rgba(255,255,255,0.07);\">",
"",
"            <!-- 1. Target Test Batch -->",
"            <div>",
"              <label class=\"form-label\" style=\"font-weight:800; font-size:11px; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:8px; display:block;\">1. Target Test Batch</label>",
"              <select id=\"open-modal-batch-select\" class=\"form-control\" style=\"width:100%; background:#1e293b; border:1px solid rgba(255,255,255,0.12); color:#ffffff; padding:9px 12px; border-radius:7px; font-weight:600; font-size:13px;\">",
"                ${activeBatches.map(b => `<option value=\"${b.id}\" ${b.id === _selectedBatchId ? 'selected' : ''}>Batch ${escapeHtml(b.name || b.id)}</option>`).join('')}",
"              </select>",
"              <div id=\"open-modal-mode-banner\" style=\"margin-top:10px; border-radius:7px; padding:9px 12px; font-size:12px; font-weight:600; line-height:1.4;\"><!-- populated dynamically --></div>",
"            </div>",
"",
"            <!-- 2. Answering Mode -->",
"            <div>",
"              <label class=\"form-label\" style=\"font-weight:800; font-size:11px; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:10px; display:block;\">2. Answering Mode</label>",
"              <div style=\"margin-bottom:12px;\">",
"                <div style=\"font-size:12px; font-weight:700; color:#93c5fd; margin-bottom:6px;\">📝 Words Exam</div>",
"                <div style=\"display:flex; gap:6px; flex-wrap:wrap;\" id=\"open-modal-words-mode-pills\">",
"                  <button type=\"button\" class=\"answer-mode-pill active\" data-exam=\"words\" data-mode=\"typing\" style=\"font-size:12px; padding:5px 12px; border-radius:5px; border:1px solid rgba(56,189,248,0.4); background:rgba(56,189,248,0.15); color:#38bdf8; font-weight:700; cursor:pointer;\">⌨️ Typing</button>",
"                  <button type=\"button\" class=\"answer-mode-pill\" data-exam=\"words\" data-mode=\"multiple_choice\" style=\"font-size:12px; padding:5px 12px; border-radius:5px; border:1px solid rgba(255,255,255,0.1); background:transparent; color:#94a3b8; font-weight:600; cursor:pointer;\">🔘 Multiple Choice</button>",
"                  <button type=\"button\" class=\"answer-mode-pill\" data-exam=\"words\" data-mode=\"voice\" style=\"font-size:12px; padding:5px 12px; border-radius:5px; border:1px solid rgba(255,255,255,0.1); background:transparent; color:#94a3b8; font-weight:600; cursor:pointer;\">🎙️ Voice</button>",
"                </div>",
"              </div>",
"              <div>",
"                <div style=\"font-size:12px; font-weight:700; color:#c4b5fd; margin-bottom:6px;\">💬 Phrases Exam</div>",
"                <div style=\"display:flex; gap:6px; flex-wrap:wrap;\" id=\"open-modal-phrases-mode-pills\">",
"                  <button type=\"button\" class=\"answer-mode-pill active\" data-exam=\"phrases\" data-mode=\"chips\" style=\"font-size:12px; padding:5px 12px; border-radius:5px; border:1px solid rgba(56,189,248,0.4); background:rgba(56,189,248,0.15); color:#38bdf8; font-weight:700; cursor:pointer;\">🧩 Chips</button>",
"                  <button type=\"button\" class=\"answer-mode-pill\" data-exam=\"phrases\" data-mode=\"typing\" style=\"font-size:12px; padding:5px 12px; border-radius:5px; border:1px solid rgba(255,255,255,0.1); background:transparent; color:#94a3b8; font-weight:600; cursor:pointer;\">⌨️ Typing</button>",
"                  <button type=\"button\" class=\"answer-mode-pill\" data-exam=\"phrases\" data-mode=\"voice\" style=\"font-size:12px; padding:5px 12px; border-radius:5px; border:1px solid rgba(255,255,255,0.1); background:transparent; color:#94a3b8; font-weight:600; cursor:pointer;\">🎙️ Voice</button>",
"                </div>",
"              </div>",
"            </div>",
"",
"            <!-- 3. Duration Allocation -->",
"            <div>",
"              <label class=\"form-label\" style=\"font-weight:800; font-size:11px; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:8px; display:block;\">3. Duration Allocation (Minutes)</label>",
"              <div id=\"open-modal-duration-suggestion\" style=\"font-size:12px; color:var(--grade-c,#fef08a); margin-bottom:8px; font-weight:600; display:flex; align-items:center; gap:6px;\">",
"                <span>⚡</span> <span id=\"open-modal-duration-suggestion-text\">Auto-calculating...</span>",
"              </div>",
"              <div style=\"display:flex; align-items:center; gap:10px;\">",
"                <input type=\"number\" id=\"open-modal-duration-input\" class=\"form-control\" value=\"60\" min=\"5\" max=\"180\" step=\"5\" style=\"width:100px; background:#1e293b; border:1px solid rgba(255,255,255,0.12); color:#ffffff; padding:9px 12px; border-radius:7px; font-weight:800; font-size:1.1rem;\">",
"                <span style=\"font-size:12px; color:#94a3b8; line-height:1.5;\">Minutes<br><span style=\"font-size:11px; color:#64748b;\">Timer syncs to this value</span></span>",
"              </div>",
"            </div>",
"",
"          </div>",
"",
"          <!-- RIGHT: Students -->",
"          <div style=\"padding:20px 24px 20px 20px; overflow-y:auto; display:flex; flex-direction:column; gap:12px;\">",
"",
"            <!-- Section header -->",
"            <div style=\"display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;\">",
"              <label class=\"form-label\" style=\"font-weight:800; font-size:11px; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; margin:0;\">",
"                4. Enrolled Students <span style=\"color:#38bdf8; font-weight:700; text-transform:none;\">(<span id=\"open-modal-student-count\">0</span> selected)</span>",
"              </label>",
"              <label id=\"open-modal-override-wrapper\" style=\"font-size:12px; color:var(--grade-c,#fef08a); display:inline-flex; align-items:center; gap:5px; cursor:pointer; background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.25); padding:4px 8px; border-radius:5px;\" title=\"Allow students who haven't completed quizzes to participate\">",
"                <input type=\"checkbox\" id=\"open-modal-override-checkbox\" style=\"cursor:pointer; width:13px; height:13px;\">",
"                <span>🛡️ Tutor Override</span>",
"              </label>",
"            </div>",
"",
"            <!-- Search + sort + select buttons -->",
"            <div style=\"display:flex; gap:6px; align-items:center; flex-wrap:wrap;\">",
"              <input type=\"text\" id=\"open-modal-student-search\" placeholder=\"🔍 Search student...\" class=\"form-control\" style=\"font-size:12px; padding:5px 10px; flex:1; min-width:70px; background:#1e293b; border:1px solid rgba(255,255,255,0.12); color:#ffffff; border-radius:5px;\">",
"              <button type=\"button\" class=\"btn btn-secondary btn-xs\" id=\"btn-open-modal-sort\" style=\"padding:5px 9px; font-size:12px; font-weight:600; white-space:nowrap;\">🔤 A→Z</button>",
"              <button type=\"button\" class=\"btn btn-secondary btn-xs\" id=\"btn-open-modal-select-all\" style=\"padding:5px 9px; font-size:12px; font-weight:600;\">✅ All</button>",
"              <button type=\"button\" class=\"btn btn-secondary btn-xs\" id=\"btn-open-modal-deselect-all\" style=\"padding:5px 9px; font-size:12px; font-weight:600;\">❌ None</button>",
"            </div>",
"",
"            <!-- Student list -->",
"            <div id=\"open-modal-students-list\" style=\"max-height:280px; overflow-y:auto; border:1px solid rgba(255,255,255,0.08); border-radius:8px; background:rgba(0,0,0,0.3); padding:8px; display:flex; flex-direction:column; gap:5px; flex:1;\">",
"              <!-- Populated dynamically -->",
"            </div>",
"",
"            <!-- Ineligible notice -->",
"            <div id=\"open-modal-ineligible-summary\" style=\"font-size:12px; color:#94a3b8; display:flex; justify-content:space-between; align-items:center;\">",
"              <span id=\"open-modal-ineligible-text\">ℹ️ Loading eligibility...</span>",
"              <button type=\"button\" id=\"btn-toggle-ineligible-view\" class=\"btn btn-ghost btn-xs\" style=\"font-size:11px; color:#38bdf8; padding:0 4px; text-decoration:underline;\">View Details</button>",
"            </div>",
"            <div id=\"open-modal-ineligible-details\" class=\"hidden\" style=\"max-height:120px; overflow-y:auto; background:rgba(0,0,0,0.4); border:1px dashed rgba(255,255,255,0.1); border-radius:6px; padding:8px; font-size:12px;\">",
"              <!-- Populated with ineligible list -->",
"            </div>",
"",
"          </div>",
"        </div>",
"",
"        <!-- Modal Footer -->",
"        <div style=\"padding:14px 24px; border-top:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.25); flex-shrink:0;\">",
"          <button type=\"button\" class=\"btn btn-ghost\" id=\"btn-cancel-open-modal\" style=\"color:#94a3b8; font-size:13px;\">Cancel</button>",
"          <button type=\"button\" class=\"btn btn-primary\" id=\"btn-confirm-open-session\" style=\"font-weight:700; padding:9px 24px; display:flex; align-items:center; gap:8px; font-size:13px;\">",
"            <span>🔓</span> Unlock Test Now",
"          </button>",
"        </div>",
"      </div>",
"    </div>",
];

// Replace lines 358–437 (0-indexed 357–436, inclusive) with new wizard
lines.splice(357, 437 - 357, ...WIZARD_LINES);
console.log('✅ PART A: Wizard lines spliced. New length:', lines.length);

// ══════════════════════════════════════════════════════
// PART B: Matrix — fix EXAM STATUS colors (Passed=Grade-A, Ready=Grade-C, Incomplete=Grade-E)
// Find and replace hardcoded exam status chip colors
// ══════════════════════════════════════════════════════
let code = lines.join('\n');

// PASSED chip — was using #38bdf8 (blue), now Grade-A (green)
const OLD_PASSED = `examStatusHtml = \`<span style="font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 4px; background: rgba(56,189,248,0.15); color: #38bdf8; border: 1px solid rgba(56,189,248,0.3);">✓ PASSED (\${Math.round(examBestPct)}%)</span>\``;
const NEW_PASSED = `examStatusHtml = \`<span style="font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 4px; background: rgba(var(--grade-a-rgb,0,192,0),0.15); color: var(--grade-a,#86efac); border: 1px solid rgba(var(--grade-a-rgb,0,192,0),0.4);">✓ Passed (\${Math.round(examBestPct)}%)</span>\``;

// READY chip — already has Grade-A, change to Grade-C (yellow = ready, not passed)
const OLD_READY = `examStatusHtml = \`<span style="font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 4px; background: rgba(var(--grade-a-rgb, 0,192,0),0.15); color: var(--grade-a, #86efac); border: 1px solid var(--grade-a, #00c000);">🟢 READY (NORMAL)</span>\``;
const NEW_READY = `examStatusHtml = \`<span style="font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; background: rgba(var(--grade-c-rgb,255,255,0),0.12); color: var(--grade-c,#fef08a); border: 1px solid rgba(var(--grade-c-rgb,255,255,0),0.35);">🟡 Ready</span>\``;

// INCOMPLETE chip — already uses Grade-E-ish but with hardcoded rgba(239,68,68)
const OLD_INCOMPLETE = `examStatusHtml = \`<span style="font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; background: rgba(239,68,68,0.1); color: #fca5a5; border: 1px solid rgba(239,68,68,0.25);">⚠️ INCOMPLETE (\${attemptedTasksCount}/\${tasks.length})</span>\``;
const NEW_INCOMPLETE = `examStatusHtml = \`<span style="font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; background: rgba(var(--grade-e-rgb,255,0,0),0.1); color: var(--grade-e,#fca5a5); border: 1px solid rgba(var(--grade-e-rgb,255,0,0),0.3);">⚠ Incomplete (\${attemptedTasksCount}/\${tasks.length})</span>\``;

if (code.includes(OLD_PASSED)) { code = code.replace(OLD_PASSED, NEW_PASSED); console.log('✅ PART B1: PASSED chip → Grade-A green'); }
else console.warn('⚠️ PART B1: PASSED chip not found');

if (code.includes(OLD_READY)) { code = code.replace(OLD_READY, NEW_READY); console.log('✅ PART B2: READY chip → Grade-C yellow'); }
else console.warn('⚠️ PART B2: READY chip not found');

if (code.includes(OLD_INCOMPLETE)) { code = code.replace(OLD_INCOMPLETE, NEW_INCOMPLETE); console.log('✅ PART B3: INCOMPLETE chip → Grade-E red'); }
else console.warn('⚠️ PART B3: INCOMPLETE chip not found');

// ══════════════════════════════════════════════════════
// PART C: Fix Select All — select ALL students when override ON
// ══════════════════════════════════════════════════════
const OLD_SEL = `    const targetList = tutorOverrideActive ? evaluated.filter(e => mode === 'normal' || !e.isAlreadyPassed) : evaluated.filter(e => e.isEligible);
    targetList.forEach(e => checkedStudentIds.add(e.student.id));`;
const NEW_SEL = `    // Override ON → select everyone in batch; Override OFF → eligible only
    if (tutorOverrideActive) {
      evaluated.forEach(e => checkedStudentIds.add(e.student.id));
    } else {
      evaluated.filter(e => e.isEligible).forEach(e => checkedStudentIds.add(e.student.id));
    }`;
if (code.includes(OLD_SEL)) { code = code.replace(OLD_SEL, NEW_SEL); console.log('✅ PART C: Select All fixed'); }
else console.warn('⚠️ PART C: Select All pattern not found');

// ══════════════════════════════════════════════════════
// PART D: Add answering mode pill JS + auto-duration inside openThemeSessionModal
// Find the durationInput setup line and prepend pill logic before it
// ══════════════════════════════════════════════════════
const PILL_ANCHOR = `  const durationInput = modal.querySelector('#open-modal-duration-input');`;
const PILL_INJECT = `  // ── Answering mode pill state ──────────────────────
  let _selectedAnswerModeWords = 'typing';
  let _selectedAnswerModePhrases = 'chips';
  modal.querySelectorAll('.answer-mode-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const exam = pill.dataset.exam;
      const mv = pill.dataset.mode;
      if (exam === 'words') _selectedAnswerModeWords = mv;
      else _selectedAnswerModePhrases = mv;
      const groupSel = exam === 'words' ? '#open-modal-words-mode-pills' : '#open-modal-phrases-mode-pills';
      modal.querySelectorAll(groupSel + ' .answer-mode-pill').forEach(p => {
        const on = p.dataset.mode === mv;
        p.style.background = on ? 'rgba(56,189,248,0.15)' : 'transparent';
        p.style.border = on ? '1px solid rgba(56,189,248,0.4)' : '1px solid rgba(255,255,255,0.1)';
        p.style.color = on ? '#38bdf8' : '#94a3b8';
        p.style.fontWeight = on ? '700' : '600';
      });
    });
  });

  // ── Auto-duration calculation ────────────────────────
  const _wordsQ = theme.wordsTest?.total_questions || 0;
  const _phrasesQ = theme.phrasesTest?.total_questions || 0;
  const _totalQ = _wordsQ + _phrasesQ;
  const _autoDur = _totalQ > 0 ? Math.max(10, Math.ceil(_totalQ * 1.5)) : (theme.wordsTest?.working_duration_minutes || theme.phrasesTest?.working_duration_minutes || 60);
  const _suggEl = modal.querySelector('#open-modal-duration-suggestion-text');
  if (_suggEl) {
    _suggEl.textContent = _totalQ > 0
      ? 'Auto: ' + _autoDur + ' min (' + _totalQ + ' questions × 1.5)'
      : 'Default: ' + _autoDur + ' min';
  }

  const durationInput = modal.querySelector('#open-modal-duration-input');
  if (durationInput && !durationInput.dataset.userSet) durationInput.value = _autoDur;
  if (durationInput) durationInput.addEventListener('change', () => { durationInput.dataset.userSet = '1'; });
`;

if (code.includes(PILL_ANCHOR)) {
  code = code.replace(PILL_ANCHOR, PILL_INJECT);
  console.log('✅ PART D: Pill logic + auto-duration injected');
} else {
  console.warn('⚠️ PART D: durationInput anchor not found');
}

// ══════════════════════════════════════════════════════
// PART E: Bump cache busters
// ══════════════════════════════════════════════════════
code = code.replace(/tests-access\.js\?v=\d+_v\d+/g, 'tests-access.js?v=20261113_v441');
console.log('✅ PART E: Cache buster → v441');

// ══════════════════════════════════════════════════════
// Write
// ══════════════════════════════════════════════════════
fs.writeFileSync(FILE, code, 'utf8');
console.log('\n✅ ALL DONE. Lines now:', code.split('\n').length);
