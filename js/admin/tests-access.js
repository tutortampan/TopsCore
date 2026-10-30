/**
 * TopsCore — Test Access & Live Test Sessions Controller (v5.8.0)
 * Integrated under Domain C: Class Hub (Vocabulary Class & Curriculum).
 * 
 * Features:
 * 1. Unified Theme Test Cards (Theme A, B, C, D): Words Test & Phrases Test unified into 1 Theme Card.
 * 2. 2 Distinct Session Opening Triggers: "🟢 Buka Sesi Normal" & "🟡 Buka Sesi Remidi".
 * 3. Smart Eligibility Engine:
 *    - Normal Mode: Prerequisite quizzes tuntas (>= 60%). Siswa yang sudah lulus tetap muncul untuk perbaikan nilai.
 *    - Remedial Mode: Prerequisite quizzes tuntas (>= 60%) & belum lulus (< 60% atau belum pernah ikut). Siswa yang sudah lulus TIDAK masuk remidi.
 * 4. Late Student Addition (+ Susulan):
 *    - HANYA menampilkan siswa eligible yang BELUM terdaftar di dalam sesi ujian.
 *    - Siswa yang sudah terdaftar 100% disembunyikan.
 *    - Otomatis mewarisi mode sesi (Normal / Remedial) tanpa centang manual.
 *    - Sisa waktu mengacu pada sisa waktu berjalan sesi global.
 * 5. 1-Click Dual Activation: Membuka/menutup Words Test dan Phrases Test secara serempak di database.
 */

import {
  openTestSession,
  addLateStudentsToSession,
  removeStudentFromTestSession,
  fetchLiveTestSessionData,
  closeTestSession,
  getGrade
} from '../api.js?v=20261030_v34';
import { getGradeColorByScore, GRADE_PALETTE } from '../grading.js?v=20261030_v34';
import { showToast, showLoading, hideLoading, escapeHtml, escHtml } from '../app.js?v=20261030_v34';

const THEME_DEFINITIONS = [
  { code: 'A', name: 'Workplace', color: '#3b82f6', bgRgba: 'rgba(59, 130, 246, 0.08)', borderRgba: 'rgba(59, 130, 246, 0.25)' },
  { code: 'B', name: 'Tourism', color: '#a855f7', bgRgba: 'rgba(168, 85, 247, 0.08)', borderRgba: 'rgba(168, 85, 247, 0.25)' },
  { code: 'C', name: 'CCU', color: '#f97316', bgRgba: 'rgba(249, 115, 22, 0.08)', borderRgba: 'rgba(249, 115, 22, 0.25)' },
  { code: 'D', name: 'High-Frequency', color: '#10b981', bgRgba: 'rgba(16, 185, 129, 0.08)', borderRgba: 'rgba(16, 185, 129, 0.25)' }
];

let _activeClassHubContext = null;
let _selectedBatchId = null;
let _currentOpenModalTheme = null;
let _currentOpenModalMode = 'normal'; // 'normal' | 'remedial'
let _currentLateModalTheme = null;

// Backward-compatibility delegator for loadSection('test-access')
export async function renderTestAccess(area) {
  window._classHubActiveTab = 'test-sessions';
  if (window.loadSection) {
    window.loadSection('class-hub');
  }
}

/**
 * Main renderer inside Class Hub: Tab "Test Sessions"
 */
export async function renderClassTestSessions(container, context = {}) {
  _activeClassHubContext = context;
  const {
    classId,
    className,
    classTests = [],
    allStudents = [],
    classStudents = [],
    allBatches = [],
    allLevels = [],
    allAttempts = [],
    batchMap = {},
    levelMap = {}
  } = context;

  // Active batches for batch selection
  const activeBatches = (allBatches || []).filter(b => !b.deleted_at && b.is_active !== false);
  
  if (!_selectedBatchId || !activeBatches.some(b => b.id === _selectedBatchId)) {
    // Default to the first active batch with students or active batch in storage
    const saved = localStorage.getItem('topscore_active_test_batch');
    if (saved && activeBatches.some(b => b.id === saved)) {
      _selectedBatchId = saved;
    } else {
      _selectedBatchId = activeBatches[0]?.id || '';
    }
  }

  // Group class tests into Themes
  const themesData = THEME_DEFINITIONS.map(def => {
    const code = def.code;
    const wordsTest = classTests.find(a => {
      const pl = a.payload || {};
      const tc = (pl.theme_code || '').toUpperCase();
      const cat = (pl.category || '').toLowerCase();
      const type = (a.test_type || '').toLowerCase();
      const subtype = (a.test_subtype || '').toUpperCase();
      const shell = (a.shell_code || pl.shell_code || '').toUpperCase();
      const title = (a.title || '').toLowerCase();

      const isTask = type === 'quiz' || a.category === 'QUIZ' || a.category === 'TASK' || subtype.includes('QUIZ') || subtype.includes('TASK') || shell.includes('-QUIZ') || shell.includes('-TASK') || title.includes('quiz') || title.includes('task');
      if (isTask) return false;

      const isExam = type === 'exam' || a.category === 'EXAM' || a.category === 'TEST' || subtype.includes('EXAM') || subtype.includes('TEST') || shell.endsWith('-EXAM') || shell.endsWith('-TEST') || title.includes('exam') || title.includes('test');
      return tc === code && isExam && (cat === 'words' || subtype === 'VOCAB_EXAM' || subtype === 'VOCAB_TEST' || shell.includes('WORDS-EXAM') || shell.includes('WORDS-TEST') || title.includes('words exam') || title.includes('words test'));
    });

    const phrasesTest = classTests.find(a => {
      const pl = a.payload || {};
      const tc = (pl.theme_code || '').toUpperCase();
      const cat = (pl.category || '').toLowerCase();
      const type = (a.test_type || '').toLowerCase();
      const subtype = (a.test_subtype || '').toUpperCase();
      const shell = (a.shell_code || pl.shell_code || '').toUpperCase();
      const title = (a.title || '').toLowerCase();

      const isTask = type === 'quiz' || a.category === 'QUIZ' || a.category === 'TASK' || subtype.includes('QUIZ') || subtype.includes('TASK') || shell.includes('-QUIZ') || shell.includes('-TASK') || title.includes('quiz') || title.includes('task');
      if (isTask) return false;

      const isExam = type === 'exam' || a.category === 'EXAM' || a.category === 'TEST' || subtype.includes('EXAM') || subtype.includes('TEST') || shell.endsWith('-EXAM') || shell.endsWith('-TEST') || title.includes('exam') || title.includes('test');
      return tc === code && isExam && (cat === 'phrases' || subtype === 'PHRASE_EXAM' || subtype === 'PHRASE_TEST' || shell.includes('PHRASES-EXAM') || shell.includes('PHRASES-TEST') || title.includes('phrases exam') || title.includes('phrases test'));
    });

    const tasks = classTests.filter(a => {
      const pl = a.payload || {};
      const tc = (pl.theme_code || '').toUpperCase();
      const type = (a.test_type || '').toLowerCase();
      const subtype = (a.test_subtype || '').toUpperCase();
      const shell = (a.shell_code || pl.shell_code || '').toUpperCase();
      const title = (a.title || '').toLowerCase();
      const isTask = type === 'quiz' || a.category === 'QUIZ' || a.category === 'TASK' || subtype.includes('QUIZ') || subtype.includes('TASK') || shell.includes('-QUIZ') || shell.includes('-TASK') || title.includes('quiz') || title.includes('task');
      return tc === code && isTask;
    });

    // Check live state
    const now = Date.now();
    const sessW = wordsTest?.payload?.test_session;
    const sessP = phrasesTest?.payload?.test_session;
    const sess = (sessW && sessW.status === 'UNLOCKED') ? sessW : ((sessP && sessP.status === 'UNLOCKED') ? sessP : null);

    let isLive = false;
    let remainingMinutes = 0;
    let liveBatchId = null;
    let liveBatchName = '';
    let allowedStudentIds = [];
    let isRemedial = false;

    if (sess && sess.status === 'UNLOCKED') {
      const autoClose = sess.auto_close_at ? new Date(sess.auto_close_at).getTime() : 0;
      if (autoClose > now) {
        isLive = true;
        remainingMinutes = Math.max(1, Math.ceil((autoClose - now) / 60000));
        liveBatchId = sess.batch_id;
        liveBatchName = batchMap[sess.batch_id]?.name || 'Batch ' + (sess.batch_id || '');
        allowedStudentIds = sess.allowed_student_ids || [];
        isRemedial = Boolean(sess.is_remedial);
      }
    }

    return {
      ...def,
      wordsTest,
      phrasesTest,
      tasks,
      isLive,
      remainingMinutes,
      liveBatchId,
      liveBatchName,
      allowedStudentIds,
      isRemedial,
      unlockedAt: sess?.unlocked_at || null
    };
  });

  // Count active sessions
  const liveCount = themesData.filter(t => t.isLive).length;

  container.innerHTML = `
    <div class="test-sessions-tab-wrapper" style="padding: 4px 0 24px;">
      <!-- Top Control Bar -->
      <div style="background: var(--fm-bg-panel, #0f172a); border: 1px solid var(--fm-border-subtle, rgba(255,255,255,0.08)); border-radius: 10px; padding: 14px 18px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
        <div>
          <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; color: #38bdf8; display: flex; align-items: center; gap: 6px;">
            <span>🔐</span> Live Test Sessions Controller
          </div>
          <div style="font-size: 1.15rem; font-weight: 800; color: #ffffff; margin-top: 2px;">
            ${escapeHtml(className || 'Vocabulary')} &bull; Unified Test Access
          </div>
          <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 2px;">
            Words & Phrases Tests unified per Theme. Open normal or remedial test sessions with duration allocation and eligible student whitelist.
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <label for="test-session-batch-select" style="font-size: 0.8rem; font-weight: 700; color: #cbd5e1; margin: 0; white-space: nowrap;">
              🎯 Active Batch:
            </label>
            <select id="test-session-batch-select" class="form-control" style="background: #1e293b; border: 1px solid rgba(255,255,255,0.15); color: #ffffff; padding: 6px 12px; border-radius: 6px; font-weight: 600; font-size: 0.85rem; min-width: 200px; cursor: pointer;">
              ${activeBatches.map(b => {
                const bStuds = allStudents.filter(s => s.batch_id === b.id && !s.deleted_at && s.is_active !== false).length;
                const isSel = b.id === _selectedBatchId;
                return `<option value="${b.id}" ${isSel ? 'selected' : ''}>Batch ${escapeHtml(b.name || b.id)} (${bStuds} Students)</option>`;
              }).join('')}
            </select>
          </div>

          <button type="button" class="btn btn-secondary btn-sm" id="btn-refresh-test-sessions" style="padding: 6px 12px; font-size: 0.8rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;">
            <span>🔄</span> Refresh Status
          </button>
        </div>
      </div>

      <!-- KPI Summary Pills -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-bottom: 20px;">
        <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 12px 16px;">
          <div style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; color: #94a3b8;">Total Exams</div>
          <div style="font-size: 1.6rem; font-weight: 800; color: #ffffff; margin-top: 4px;">4 Themes <span style="font-size: 0.85rem; font-weight: 500; color: #64748b;">(8 Modules)</span></div>
        </div>

        <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid ${liveCount > 0 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255,255,255,0.06)'}; border-radius: 8px; padding: 12px 16px;">
          <div style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; color: ${liveCount > 0 ? '#34d399' : '#94a3b8'};">
            🟢 Active Live Sessions
          </div>
          <div style="font-size: 1.6rem; font-weight: 800; color: ${liveCount > 0 ? '#34d399' : '#ffffff'}; margin-top: 4px;">
            ${liveCount} <span style="font-size: 0.85rem; font-weight: 500; color: #64748b;">Open Sessions</span>
          </div>
        </div>

        <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 12px 16px;">
          <div style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; color: #94a3b8;">🔒 Locked Themes</div>
          <div style="font-size: 1.6rem; font-weight: 800; color: #fbbf24; margin-top: 4px;">
            ${4 - liveCount} <span style="font-size: 0.85rem; font-weight: 500; color: #64748b;">Awaiting Tutor</span>
          </div>
        </div>
      </div>

      <!-- Theme Cards Grid (2x2 Spacious Clean Layout) -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 18px;">
        ${themesData.map(theme => renderThemeCard(theme, context)).join('')}
      </div>
    </div>

    <!-- Modal 1: Open Test Session (Normal / Remedial) -->
    <div id="modal-theme-open-session" class="modal-backdrop hidden" style="position:fixed; inset:0; background:rgba(0,0,0,0.8); display:flex; align-items:center; justify-content:center; z-index:9999; padding:16px;">
      <div class="modal-box card" style="background:#0f172a; border:1px solid rgba(255,255,255,0.15); border-radius:12px; width:100%; max-width:600px; max-height:92vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 24px 50px rgba(0,0,0,0.8);">
        <div style="padding:18px 20px; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <div id="open-modal-theme-badge" style="display:inline-block; font-size:0.7rem; font-weight:800; text-transform:uppercase; letter-spacing:0.06em; padding:2px 8px; border-radius:4px; margin-bottom:4px;">THEME A</div>
            <h3 id="open-modal-title" style="margin:0; font-size:1.25rem; font-weight:800; color:#ffffff;">Open Test Session</h3>
            <div id="open-modal-subtitle" style="font-size:0.8rem; color:#94a3b8; margin-top:2px;">Words Exam & Phrases Exam unlocked simultaneously.</div>
          </div>
          <button type="button" class="btn btn-ghost btn-icon" id="btn-close-open-modal" style="color:#94a3b8; font-size:1.25rem; padding:4px 8px;">✕</button>
        </div>

        <div style="padding:20px; overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:16px;">
          <!-- 1. Target Batch -->
          <div>
            <label class="form-label" style="font-weight:700; font-size:0.85rem; color:#ffffff; margin-bottom:6px; display:block;">
              1. Target Test Batch
            </label>
            <select id="open-modal-batch-select" class="form-control" style="width:100%; background:#1e293b; border:1px solid rgba(255,255,255,0.12); color:#ffffff; padding:8px 12px; border-radius:6px; font-weight:600;">
              ${activeBatches.map(b => `<option value="${b.id}" ${b.id === _selectedBatchId ? 'selected' : ''}>Batch ${escapeHtml(b.name || b.id)}</option>`).join('')}
            </select>
          </div>

          <!-- 2. Test Duration -->
          <div>
            <label class="form-label" style="font-weight:700; font-size:0.85rem; color:#ffffff; margin-bottom:6px; display:block;">
              2. Test Duration Allocation (Minutes)
            </label>
            <div style="display:flex; align-items:center; gap:10px;">
              <input type="number" id="open-modal-duration-input" class="form-control" value="60" min="5" max="180" step="5" style="width:110px; background:#1e293b; border:1px solid rgba(255,255,255,0.12); color:#ffffff; padding:8px 12px; border-radius:6px; font-weight:800; font-size:1.05rem;">
              <span style="font-size:0.8rem; color:#94a3b8;">Minutes (Student countdown synchronizes with this duration)</span>
            </div>
          </div>

          <!-- 3. Session Status Banner (Locked Mode) -->
          <div id="open-modal-mode-banner" style="border-radius:8px; padding:10px 14px; font-size:0.82rem; font-weight:600;">
            <!-- Populated dynamically -->
          </div>

          <!-- 4. Whitelist Attendance for Eligible Students -->
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:8px;">
              <label class="form-label" style="font-weight:700; font-size:0.85rem; color:#ffffff; margin:0;">
                4. Enrolled Students (<span id="open-modal-student-count" style="color:#38bdf8;">0</span> Selected)
              </label>
              <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
                <label id="open-modal-override-wrapper" style="font-size:0.75rem; color:#fbbf24; display:inline-flex; align-items:center; gap:5px; cursor:pointer; background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.25); padding:3px 6px; border-radius:4px;" title="Tutor Override allows students who haven't finished quizzes yet to participate">
                  <input type="checkbox" id="open-modal-override-checkbox" style="cursor:pointer; width:13px; height:13px;">
                  <span>🛡️ Tutor Override</span>
                </label>
                <input type="text" id="open-modal-student-search" placeholder="🔍 Search student..." class="form-control" style="font-size:0.75rem; padding:4px 8px; width:110px; background:#1e293b; border:1px solid rgba(255,255,255,0.12); color:#ffffff; border-radius:4px;">
                <button type="button" class="btn btn-secondary btn-xs" id="btn-open-modal-sort" style="padding:4px 8px; font-size:0.75rem; font-weight:600;">🔤 A → Z</button>
                <button type="button" class="btn btn-secondary btn-xs" id="btn-open-modal-select-all" style="padding:4px 8px; font-size:0.75rem;">✅ All</button>
                <button type="button" class="btn btn-secondary btn-xs" id="btn-open-modal-deselect-all" style="padding:4px 8px; font-size:0.75rem;">❌ None</button>
              </div>
            </div>

            <div id="open-modal-students-list" style="max-height:220px; overflow-y:auto; border:1px solid rgba(255,255,255,0.08); border-radius:8px; background:rgba(0,0,0,0.3); padding:8px; display:flex; flex-direction:column; gap:6px;">
              <!-- Populated dynamically -->
            </div>

            <!-- Ineligible notice & toggle -->
            <div id="open-modal-ineligible-summary" style="margin-top:8px; font-size:0.78rem; color:#94a3b8; display:flex; justify-content:space-between; align-items:center;">
              <span id="open-modal-ineligible-text">ℹ️ Loading student eligibility...</span>
              <button type="button" id="btn-toggle-ineligible-view" class="btn btn-ghost btn-xs" style="font-size:0.72rem; color:#38bdf8; padding:0 4px; text-decoration:underline;">View Details</button>
            </div>
            <div id="open-modal-ineligible-details" class="hidden" style="margin-top:6px; max-height:120px; overflow-y:auto; background:rgba(0,0,0,0.4); border:1px dashed rgba(255,255,255,0.1); border-radius:6px; padding:8px; font-size:0.75rem;">
              <!-- Populated with ineligible list -->
            </div>
          </div>
        </div>

        <div style="padding:14px 20px; border-top:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.25);">
          <button type="button" class="btn btn-ghost" id="btn-cancel-open-modal" style="color:#94a3b8;">Cancel</button>
          <button type="button" class="btn btn-primary" id="btn-confirm-open-session" style="font-weight:700; padding:8px 20px; display:flex; align-items:center; gap:8px;">
            <span>🔓</span> Unlock Test Now
          </button>
        </div>
      </div>
    </div>

    <!-- Modal 2: Add Late Arrival Students to Live Session -->
    <div id="modal-theme-add-late" class="modal-backdrop hidden" style="position:fixed; inset:0; background:rgba(0,0,0,0.8); display:flex; align-items:center; justify-content:center; z-index:9999; padding:16px;">
      <div class="modal-box card" style="background:#0f172a; border:1px solid rgba(255,255,255,0.15); border-radius:12px; width:100%; max-width:580px; max-height:92vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 24px 50px rgba(0,0,0,0.8);">
        <div style="padding:18px 20px; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <div style="font-size:0.72rem; text-transform:uppercase; letter-spacing:0.08em; color:#a5b4fc; font-weight:800;">👥 Live Test Session in Progress</div>
            <h3 id="late-modal-theme-title" style="margin:2px 0 0; font-size:1.25rem; font-weight:800; color:#ffffff;">Theme Test Name</h3>
            <div id="late-modal-batch-name" style="font-size:0.8rem; color:#94a3b8; margin-top:2px;">Batch Name</div>
          </div>
          <button type="button" class="btn btn-ghost btn-icon" id="btn-close-late-modal" style="color:#94a3b8; font-size:1.25rem; padding:4px 8px;">✕</button>
        </div>

        <div style="padding:20px; overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:16px;">
          <!-- Live Global Countdown & Mode Alert -->
          <div style="background:rgba(99, 102, 241, 0.12); border:1px solid rgba(99, 102, 241, 0.35); border-radius:8px; padding:12px 14px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
              <div style="font-size:0.85rem; font-weight:700; color:#a5b4fc; display:flex; align-items:center; gap:6px;">
                <span>⏳ Global Remaining Session Time:</span>
                <span id="late-modal-remaining-time" style="color:#ffffff; font-size:1.05rem; font-weight:800;">-- Mins</span>
              </div>
              <div id="late-modal-mode-badge" style="font-size:0.75rem; font-weight:700; padding:2px 8px; border-radius:4px;">
                NORMAL
              </div>
            </div>
            <div class="text-xs" style="color:#cbd5e1; margin-top:6px; line-height:1.4;">
              Late arrival students <strong>automatically inherit session status</strong> and work time refers to this remaining live duration to ensure fairness.
            </div>
          </div>

          <!-- Unenrolled Eligible Students Checklist -->
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:8px;">
              <label class="form-label" style="font-weight:700; font-size:0.85rem; color:#ffffff; margin:0;">
                Select Late Arrival Students (<span id="late-modal-selected-count" style="color:#38bdf8;">0</span> Selected)
              </label>
              <div style="display:flex; gap:6px; align-items:center;">
                <input type="text" id="late-modal-search" placeholder="🔍 Search name..." class="form-control" style="font-size:0.75rem; padding:4px 8px; width:120px; background:#1e293b; border:1px solid rgba(255,255,255,0.12); color:#ffffff; border-radius:4px;">
                <button type="button" class="btn btn-secondary btn-xs" id="btn-late-modal-select-all" style="padding:4px 8px; font-size:0.75rem;">✅ All</button>
                <button type="button" class="btn btn-secondary btn-xs" id="btn-late-modal-deselect-all" style="padding:4px 8px; font-size:0.75rem;">❌ None</button>
              </div>
            </div>

            <div id="late-modal-students-list" style="max-height:220px; overflow-y:auto; border:1px solid rgba(255,255,255,0.08); border-radius:8px; background:rgba(0,0,0,0.3); padding:8px; display:flex; flex-direction:column; gap:6px;">
              <!-- Populated dynamically with UNENROLLED ELIGIBLE students only -->
            </div>
            <div class="text-xs" style="color:#94a3b8; margin-top:6px;">
              * Students already enrolled in this session are automatically filtered out and hidden above.
            </div>
          </div>
        </div>

        <div style="padding:14px 20px; border-top:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.25);">
          <button type="button" class="btn btn-ghost" id="btn-cancel-late-modal" style="color:#94a3b8;">Cancel</button>
          <button type="button" class="btn btn-primary" id="btn-confirm-add-late" style="background:#6366f1; border-color:#4f46e5; font-weight:700; padding:8px 20px; display:flex; align-items:center; gap:8px;">
            <span>💾</span> Add Students to Test
          </button>
        </div>
      </div>
    </div>

    <!-- Modal 3: Live Test Session Monitor & Student Controller -->
    <div id="modal-theme-live-monitor" class="modal-backdrop hidden" style="position:fixed; inset:0; background:rgba(0,0,0,0.85); display:flex; align-items:center; justify-content:center; z-index:9999; padding:16px;">
      <div class="modal-box card" style="background:#0b1329; border:1px solid rgba(255,255,255,0.18); border-radius:14px; width:100%; max-width:1050px; max-height:92vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 24px 60px rgba(0,0,0,0.9);">
        <!-- Modal Header -->
        <div style="padding:18px 24px; border-bottom:1px solid rgba(255,255,255,0.1); display:flex; justify-content:space-between; align-items:center; background:rgba(15,23,42,0.85); flex-wrap:wrap; gap:12px;">
          <div style="display:flex; align-items:center; gap:12px;">
            <span id="live-modal-theme-badge" style="font-size:0.75rem; font-weight:800; text-transform:uppercase; letter-spacing:0.06em; padding:4px 10px; border-radius:6px; background:rgba(59,130,246,0.15); color:#60a5fa; border:1px solid rgba(59,130,246,0.3);">THEME A</span>
            <div>
              <h3 id="live-modal-title" style="margin:0; font-size:1.25rem; font-weight:800; color:#ffffff; display:flex; align-items:center; gap:8px;">
                <span>👁️</span> Live Test Session Monitor
              </h3>
              <div id="live-modal-subtitle" style="font-size:0.8rem; color:#94a3b8; margin-top:2px;">
                Workplace Test &bull; Batch SH-26 &bull; Real-time Progress, Alarm & Scoring
              </div>
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
            <div id="live-modal-mode-badge" style="font-size:0.75rem; font-weight:800; padding:4px 10px; border-radius:6px; background:rgba(16,185,129,0.15); border:1px solid #10b981; color:#34d399;">
              NORMAL
            </div>
            <div style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:4px 10px; font-size:0.8rem; font-weight:700; color:#38bdf8; display:flex; align-items:center; gap:6px;">
              <span>⏳ Sisa:</span>
              <span id="live-modal-remaining" style="color:#ffffff; font-weight:800;">--m</span>
            </div>

            <!-- Quick Add Time Dropdown -->
            <div style="position:relative; display:inline-block;" id="live-modal-add-time-wrapper">
              <button type="button" class="btn btn-sm" id="btn-live-modal-add-time" style="padding:5px 12px; font-size:0.8rem; font-weight:700; background:linear-gradient(135deg, #10b981, #059669); border:1px solid #34d399; color:#ffffff; border-radius:6px; display:inline-flex; align-items:center; gap:6px; box-shadow:0 2px 8px rgba(16,185,129,0.3); cursor:pointer;">
                <span>⏱️ + Tambah Waktu</span>
                <span style="font-size:0.65rem;">▼</span>
              </button>
              <div id="live-modal-add-time-menu" class="hidden" style="position:absolute; right:0; top:calc(100% + 5px); background:#0f172a; border:1px solid rgba(255,255,255,0.18); border-radius:8px; box-shadow:0 12px 30px rgba(0,0,0,0.85); z-index:99999; min-width:190px; padding:6px; display:none; flex-direction:column; gap:4px;">
                <div style="font-size:0.7rem; font-weight:700; color:#94a3b8; padding:4px 8px; border-bottom:1px solid rgba(255,255,255,0.08);">Perpanjang Sisa Ujian:</div>
                <button type="button" class="btn-add-time-option" data-mins="5" style="text-align:left; background:transparent; border:none; color:#ffffff; padding:7px 10px; border-radius:6px; font-size:0.8rem; font-weight:600; cursor:pointer; display:flex; justify-content:space-between; align-items:center; transition:background 0.15s;" onmouseover="this.style.background='rgba(56,189,248,0.15)'" onmouseout="this.style.background='transparent'">
                  <span>⚡ +5 Menit</span>
                  <span style="font-size:0.7rem; color:#38bdf8;">Quick</span>
                </button>
                <button type="button" class="btn-add-time-option" data-mins="10" style="text-align:left; background:transparent; border:none; color:#ffffff; padding:7px 10px; border-radius:6px; font-size:0.8rem; font-weight:600; cursor:pointer; display:flex; justify-content:space-between; align-items:center; transition:background 0.15s;" onmouseover="this.style.background='rgba(56,189,248,0.15)'" onmouseout="this.style.background='transparent'">
                  <span>⏱️ +10 Menit</span>
                  <span style="font-size:0.7rem; color:#34d399;">Populer</span>
                </button>
                <button type="button" class="btn-add-time-option" data-mins="15" style="text-align:left; background:transparent; border:none; color:#ffffff; padding:7px 10px; border-radius:6px; font-size:0.8rem; font-weight:600; cursor:pointer; display:flex; justify-content:space-between; align-items:center; transition:background 0.15s;" onmouseover="this.style.background='rgba(56,189,248,0.15)'" onmouseout="this.style.background='transparent'">
                  <span>⏱️ +15 Menit</span>
                </button>
                <button type="button" class="btn-add-time-option" data-mins="30" style="text-align:left; background:transparent; border:none; color:#ffffff; padding:7px 10px; border-radius:6px; font-size:0.8rem; font-weight:600; cursor:pointer; display:flex; justify-content:space-between; align-items:center; transition:background 0.15s;" onmouseover="this.style.background='rgba(56,189,248,0.15)'" onmouseout="this.style.background='transparent'">
                  <span>⏱️ +30 Menit</span>
                </button>
                <div style="border-top:1px solid rgba(255,255,255,0.08); padding-top:4px; margin-top:2px;">
                  <button type="button" id="btn-add-time-custom" style="width:100%; text-align:left; background:transparent; border:none; color:#fbbf24; padding:7px 10px; border-radius:6px; font-size:0.8rem; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:6px; transition:background 0.15s;" onmouseover="this.style.background='rgba(251,191,36,0.15)'" onmouseout="this.style.background='transparent'">
                    <span>⚙️ Kustom Menit...</span>
                  </button>
                </div>
              </div>
            </div>

            <button type="button" class="btn btn-secondary btn-sm" id="btn-live-modal-refresh" style="padding:5px 12px; font-size:0.8rem; font-weight:700; display:inline-flex; align-items:center; gap:6px;">
              <span>🔄</span> Refresh
            </button>
            <button type="button" class="btn btn-ghost btn-icon" id="btn-close-live-modal" style="color:#94a3b8; font-size:1.3rem; padding:4px 8px;">✕</button>
          </div>
        </div>

        <!-- KPI Summary Grid -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:12px; padding:14px 24px; background:rgba(0,0,0,0.3); border-bottom:1px solid rgba(255,255,255,0.06);">
          <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:10px 14px;">
            <div style="font-size:0.7rem; font-weight:700; color:#94a3b8; text-transform:uppercase;">👥 Total Siswa</div>
            <div id="kpi-live-total" style="font-size:1.4rem; font-weight:800; color:#ffffff; margin-top:2px;">0</div>
          </div>
          <div style="background:rgba(59,130,246,0.08); border:1px solid rgba(59,130,246,0.25); border-radius:8px; padding:10px 14px;">
            <div style="font-size:0.7rem; font-weight:700; color:#60a5fa; text-transform:uppercase;">🟢 Sedang Mengerjakan</div>
            <div id="kpi-live-in-progress" style="font-size:1.4rem; font-weight:800; color:#38bdf8; margin-top:2px;">0</div>
          </div>
          <div style="background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.25); border-radius:8px; padding:10px 14px;">
            <div style="font-size:0.7rem; font-weight:700; color:#34d399; text-transform:uppercase;">✅ Sudah Selesai</div>
            <div id="kpi-live-submitted" style="font-size:1.4rem; font-weight:800; color:#10b981; margin-top:2px;">0</div>
          </div>
          <div style="background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.25); border-radius:8px; padding:10px 14px;">
            <div style="font-size:0.7rem; font-weight:700; color:#fbbf24; text-transform:uppercase;">⏳ Belum Mulai</div>
            <div id="kpi-live-not-started" style="font-size:1.4rem; font-weight:800; color:#fbbf24; margin-top:2px;">0</div>
          </div>
          <div style="background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.25); border-radius:8px; padding:10px 14px;">
            <div style="font-size:0.7rem; font-weight:700; color:#f87171; text-transform:uppercase;">🚨 Total Alarm</div>
            <div id="kpi-live-alarms" style="font-size:1.4rem; font-weight:800; color:#ef4444; margin-top:2px;">0</div>
          </div>
        </div>

        <!-- Filter & Search Bar -->
        <div style="padding:12px 24px; display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; background:rgba(15,23,42,0.4); border-bottom:1px solid rgba(255,255,255,0.06);">
          <div style="display:flex; gap:6px; flex-wrap:wrap;" id="live-modal-filter-tabs">
            <button type="button" class="btn btn-xs btn-primary live-filter-btn active" data-filter="all">Semua (<span id="tab-cnt-all">0</span>)</button>
            <button type="button" class="btn btn-xs btn-secondary live-filter-btn" data-filter="in_progress">🟢 Sedang Mengerjakan (<span id="tab-cnt-in-progress">0</span>)</button>
            <button type="button" class="btn btn-xs btn-secondary live-filter-btn" data-filter="submitted">✅ Selesai (<span id="tab-cnt-submitted">0</span>)</button>
            <button type="button" class="btn btn-xs btn-secondary live-filter-btn" data-filter="not_started">⏳ Belum Mulai (<span id="tab-cnt-not-started">0</span>)</button>
            <button type="button" class="btn btn-xs btn-secondary live-filter-btn" data-filter="alarm">🚨 Ada Alarm (<span id="tab-cnt-alarm">0</span>)</button>
          </div>

          <div style="display:flex; align-items:center; gap:10px;">
            <label style="display:flex; align-items:center; gap:6px; font-size:0.75rem; color:#cbd5e1; cursor:pointer;">
              <input type="checkbox" id="live-modal-auto-poll" checked style="cursor:pointer;">
              <span>⚡ Auto-Refresh (5s)</span>
            </label>
            <input type="text" id="live-modal-search" placeholder="🔍 Cari siswa..." class="form-control" style="font-size:0.78rem; padding:4px 10px; width:150px; background:#1e293b; border:1px solid rgba(255,255,255,0.12); color:#ffffff; border-radius:6px;">
          </div>
        </div>

        <!-- Student Cards Container -->
        <div id="live-modal-students-container" style="padding:16px 24px; overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:10px;">
          <!-- Populated dynamically -->
        </div>

        <!-- Modal Footer -->
        <div style="padding:12px 24px; border-top:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.3); font-size:0.78rem; color:#94a3b8;">
          <span id="live-modal-footer-info">Status ujian diperbarui secara real-time.</span>
          <div style="display:flex; gap:8px;">
            <button type="button" class="btn btn-ghost btn-sm" id="btn-close-live-modal-footer" style="color:#cbd5e1;">Tutup</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal 4: Kick Student Confirmation Modal -->
    <div id="modal-kick-student-confirm" class="modal-backdrop hidden" style="position:fixed; inset:0; background:rgba(0,0,0,0.85); display:flex; align-items:center; justify-content:center; z-index:10005; padding:16px;">
      <div class="modal-box card" style="background:#0f172a; border:2px solid #ef4444; border-radius:12px; width:100%; max-width:480px; overflow:hidden; box-shadow:0 20px 50px rgba(239,68,68,0.35);">
        <div style="padding:18px 20px; border-bottom:1px solid rgba(255,255,255,0.1); display:flex; align-items:center; gap:12px;">
          <span style="font-size:1.6rem;">🚨</span>
          <div>
            <h4 style="margin:0; font-size:1.15rem; font-weight:800; color:#f87171;">Keluarkan Siswa dari Ujian</h4>
            <div id="kick-confirm-student-name" style="font-size:0.85rem; color:#cbd5e1; margin-top:2px;">Nama Siswa</div>
          </div>
        </div>
        <div style="padding:20px; font-size:0.85rem; color:#cbd5e1; display:flex; flex-direction:column; gap:12px;">
          <div>Pilih tindakan untuk berkas ujian siswa yang sedang berlangsung:</div>
          <label style="display:flex; align-items:flex-start; gap:10px; background:rgba(255,255,255,0.04); padding:10px 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.08); cursor:pointer;">
            <input type="radio" name="kick_action" value="submit" checked style="margin-top:3px; cursor:pointer;">
            <div>
              <div style="font-weight:700; color:#ffffff;">📥 Kumpulkan & Nilai Jawaban Saat Ini</div>
              <div style="font-size:0.75rem; color:#94a3b8; margin-top:2px;">Ujian siswa dihentikan seketika. Jawaban yang sudah diisi disimpan dan dinilai secara otomatis.</div>
            </div>
          </label>
          <label style="display:flex; align-items:flex-start; gap:10px; background:rgba(255,255,255,0.04); padding:10px 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.08); cursor:pointer;">
            <input type="radio" name="kick_action" value="cancel" style="margin-top:3px; cursor:pointer;">
            <div>
              <div style="font-weight:700; color:#f87171;">⛔ Batalkan Ujian (Skor 0 / Cancelled)</div>
              <div style="font-size:0.75rem; color:#94a3b8; margin-top:2px;">Ujian siswa dibatalkan dan status berkas menjadi 'cancelled' dengan skor 0.</div>
            </div>
          </label>
        </div>
        <div style="padding:14px 20px; border-top:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.25);">
          <button type="button" class="btn btn-ghost" id="btn-cancel-kick" style="color:#94a3b8;">Batal</button>
          <button type="button" class="btn btn-danger" id="btn-confirm-kick" style="background:#dc2626; border-color:#b91c1c; font-weight:800; padding:8px 18px; display:inline-flex; align-items:center; gap:6px;">
            <span>🚫</span> Keluarkan Sekarang
          </button>
        </div>
      </div>
    </div>

    <!-- Modal 5: Student Alarm Detail & Forgive Modal -->
    <div id="modal-student-alarm-detail" class="modal-backdrop hidden" style="position:fixed; inset:0; background:rgba(0,0,0,0.85); backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; z-index:10010; padding:16px;">
      <div class="modal-box card" style="background:#0f172a; border:1px solid rgba(239,68,68,0.35); border-radius:12px; width:100%; max-width:540px; overflow:hidden; box-shadow:0 24px 60px rgba(0,0,0,0.9);">
        <div style="padding:16px 20px; border-bottom:1px solid rgba(255,255,255,0.1); display:flex; justify-content:space-between; align-items:center; background:rgba(239,68,68,0.12);">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:1.5rem;">🚨</span>
            <div>
              <h4 id="alarm-detail-student-name" style="margin:0; font-size:1.1rem; font-weight:800; color:#ffffff;">Log Alarm Anti-Cheat</h4>
              <div id="alarm-detail-meta" style="font-size:0.75rem; color:#fca5a5; margin-top:2px;">Riwayat peringatan integritas ujian</div>
            </div>
          </div>
          <button type="button" class="btn btn-ghost btn-icon" id="btn-close-alarm-detail" style="color:#94a3b8; font-size:1.3rem;">✕</button>
        </div>
        <div id="alarm-detail-logs-list" style="padding:16px 20px; max-height:50vh; overflow-y:auto; display:flex; flex-direction:column; gap:8px;">
          <!-- Items injected dynamically -->
        </div>
        <div style="padding:14px 20px; border-top:1px solid rgba(255,255,255,0.08); background:rgba(0,0,0,0.3); display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
          <button type="button" class="btn btn-sm" id="btn-clear-student-alarms" style="background:rgba(245,158,11,0.2); border:1px solid #f59e0b; color:#fbbf24; font-size:0.78rem; font-weight:700; padding:6px 12px; border-radius:6px; cursor:pointer;">
            🔄 Reset / Ampuni Alarm Siswa
          </button>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-dismiss-alarm-detail" style="font-size:0.78rem; padding:6px 14px;">Tutup</button>
        </div>
      </div>
    </div>
  `;

  bindTestSessionsEvents(container, themesData, context);
}

/**
 * Renders a single unified Theme Card
 */
function renderThemeCard(theme, context) {
  const { code, name, color, bgRgba, borderRgba, wordsTest, phrasesTest, tasks, isLive, remainingMinutes, liveBatchName, allowedStudentIds, isRemedial } = theme;
  
  let stateContent = '';
  let actionButtons = '';

  if (isLive) {
    stateContent = `
      <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 12px 14px; margin: 12px 0 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span style="display: inline-flex; align-items: center; gap: 6px; font-size: 0.85rem; font-weight: 800; color: #34d399;">
            <span class="status-dot dot-live" style="width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px #10b981;"></span>
            LIVE (${remainingMinutes}m remaining)
          </span>
          <span style="font-size: 0.72rem; font-weight: 800; padding: 2px 7px; border-radius: 4px; ${isRemedial ? 'background: rgba(245, 158, 11, 0.2); border: 1px solid #f59e0b; color: #fbbf24;' : 'background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; color: #34d399;'}">
            ${isRemedial ? 'REMEDIAL (MAX 60%)' : 'NORMAL (FULL SCORE)'}
          </span>
        </div>
        <div style="font-size: 0.82rem; color: #cbd5e1; font-weight: 600;">
          👥 ${escapeHtml(liveBatchName)} &bull; ${allowedStudentIds.length} Enrolled Students
        </div>
      </div>
    `;

    actionButtons = `
      <div style="display: flex; flex-direction: column; gap: 8px; margin-top: auto;">
        <button type="button" class="btn btn-sm btn-theme-live-monitor" data-theme="${code}" style="background: linear-gradient(135deg, #2563eb, #1d4ed8); border: 1px solid #3b82f6; color: #ffffff; font-weight: 700; width: 100%; padding: 8px 12px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 4px 12px rgba(37,99,235,0.35);">
          <span>👁️</span> Monitor Live & Status Ujian (${allowedStudentIds.length})
        </button>
        <div style="display: flex; gap: 8px; align-items: center;">
          <button type="button" class="btn btn-sm btn-theme-add-late" data-theme="${code}" style="background: #4f46e5; border-color: #4338ca; color: #ffffff; font-weight: 700; flex: 1; padding: 7px 10px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
            <span>👥</span> + Susulan
          </button>
          <button type="button" class="btn btn-sm btn-theme-close-session" data-theme="${code}" style="background: #ef4444; border-color: #dc2626; color: #ffffff; font-weight: 700; flex: 1; padding: 7px 10px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
            <span>🔒</span> Tutup Sesi
          </button>
        </div>
      </div>
    `;
  } else {
    stateContent = `
      <div style="background: rgba(245, 158, 11, 0.05); border: 1px solid rgba(245, 158, 11, 0.18); border-radius: 8px; padding: 12px 14px; margin: 12px 0 16px;">
        <div style="display: flex; align-items: center; gap: 6px; font-size: 0.82rem; font-weight: 700; color: #fbbf24;">
          <span>🔒</span> LOCKED &bull; No Active Session
        </div>
        <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 4px;">
          Prerequisites: ${tasks.length} Quizzes Theme ${code} (Min 60%)
        </div>
      </div>
    `;

    actionButtons = `
      <div style="display: flex; gap: 8px; align-items: center; margin-top: auto;">
        <button type="button" class="btn btn-sm btn-theme-open-session" data-theme="${code}" data-mode="normal" style="background: #10b981; border-color: #059669; color: #ffffff; font-weight: 700; flex: 1; padding: 8px 10px; border-radius: 6px; font-size: 0.8rem; display: inline-flex; align-items: center; justify-content: center; gap: 4px;" title="Open normal test session (full score) for eligible students">
          <span>🟢</span> Open Normal
        </button>
        <button type="button" class="btn btn-sm btn-theme-open-session" data-theme="${code}" data-mode="remedial" style="background: rgba(245, 158, 11, 0.15); border: 1px solid #f59e0b; color: #fbbf24; font-weight: 700; flex: 1; padding: 8px 10px; border-radius: 6px; font-size: 0.8rem; display: inline-flex; align-items: center; justify-content: center; gap: 4px;" title="Open remedial session (max 60% score) for students needing retake">
          <span>🟡</span> Open Remedial
        </button>
      </div>
    `;
  }

  return `
    <div class="card theme-test-card" style="background: var(--fm-bg-panel, #0f172a); border: 1px solid ${borderRgba}; border-radius: 10px; padding: 18px 20px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 4px 16px rgba(0,0,0,0.25); position: relative; overflow: hidden;">
      <div style="position: absolute; top: 0; left: 0; right: 0; height: 3px; background: ${color};"></div>
      
      <div>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
          <span style="font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; padding: 2px 8px; border-radius: 4px; background: ${bgRgba}; color: ${color}; border: 1px solid ${borderRgba};">
            THEME ${code}
          </span>
          <span style="font-size: 0.75rem; color: #94a3b8; font-weight: 600;">2 Simultaneous Modules</span>
        </div>

        <h4 style="margin: 4px 0 0; font-size: 1.15rem; font-weight: 800; color: #ffffff;">
          ${escapeHtml(name)} Test
        </h4>
        <div style="font-size: 0.78rem; color: #94a3b8; margin-top: 3px; display: flex; gap: 8px;">
          <span>📝 Words (Written)</span>
          <span>&bull;</span>
          <span>💬 Phrases (Dropdown)</span>
        </div>

        ${stateContent}
      </div>

      ${actionButtons}
    </div>
  `;
}

/**
 * Event binding and interactive modal controller
 */
function bindTestSessionsEvents(container, themesData, context) {
  const { allStudents = [], allAttempts = [], batchMap = {} } = context;

  // 1. Batch Selection Toolbar
  const batchSelect = container.querySelector('#test-session-batch-select');
  batchSelect?.addEventListener('change', (e) => {
    _selectedBatchId = e.target.value;
    try {
      localStorage.setItem('topscore_active_test_batch', _selectedBatchId);
    } catch(err) {}
    renderClassTestSessions(container, context);
  });

  // Refresh status
  container.querySelector('#btn-refresh-test-sessions')?.addEventListener('click', () => {
    if (window.renderClassHub) {
      window.renderClassHub(document.getElementById('admin-content-area'));
    }
  });

  // 2. Open Session Triggers
  container.querySelectorAll('.btn-theme-open-session').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const themeCode = e.currentTarget.getAttribute('data-theme');
      const mode = e.currentTarget.getAttribute('data-mode') || 'normal';
      const theme = themesData.find(t => t.code === themeCode);
      if (!theme) return;

      openThemeSessionModal(container, theme, mode, context);
    });
  });

  // 3. Add Late Student Triggers
  container.querySelectorAll('.btn-theme-add-late').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const themeCode = e.currentTarget.getAttribute('data-theme');
      const theme = themesData.find(t => t.code === themeCode);
      if (!theme) return;

      openThemeLateModal(container, theme, context);
    });
  });

  // 3b. Live Monitor Triggers
  container.querySelectorAll('.btn-theme-live-monitor').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const themeCode = e.currentTarget.getAttribute('data-theme');
      const theme = themesData.find(t => t.code === themeCode);
      if (!theme) return;

      openThemeLiveMonitorModal(container, theme, context);
    });
  });

  // 4. Close Session Triggers
  container.querySelectorAll('.btn-theme-close-session').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const themeCode = e.currentTarget.getAttribute('data-theme');
      const theme = themesData.find(t => t.code === themeCode);
      if (!theme) return;

      const confirmed = confirm(`Close test session for THEME ${theme.code} (${theme.name}) for ${theme.liveBatchName}?\nStudents will no longer be able to access the test once closed.`);
      if (!confirmed) return;

      showLoading();
      try {
        const promises = [];
        if (theme.wordsTest) promises.push(closeTestSession(theme.wordsTest.id));
        if (theme.phrasesTest) promises.push(closeTestSession(theme.phrasesTest.id));
        await Promise.all(promises);

        showToast(`🔒 Test session Theme ${theme.code} closed successfully.`, 'success');
        if (window.renderClassHub) {
          window.renderClassHub(document.getElementById('admin-content-area'));
        }
      } catch (err) {
        console.error('Error closing test session:', err);
        showToast('Failed to close session: ' + err.message, 'error');
      } finally {
        hideLoading();
      }
    });
  });
}

/**
 * Open Modal: Buka Sesi Ujian (Normal / Remidi)
 */
function openThemeSessionModal(container, theme, mode, context) {
  _currentOpenModalTheme = theme;
  _currentOpenModalMode = mode;

  const modal = container.querySelector('#modal-theme-open-session');
  if (!modal) return;

  const titleEl = modal.querySelector('#open-modal-title');
  const badgeEl = modal.querySelector('#open-modal-theme-badge');
  const bannerEl = modal.querySelector('#open-modal-mode-banner');
  const batchSelect = modal.querySelector('#open-modal-batch-select');
  const durationInput = modal.querySelector('#open-modal-duration-input');
  const confirmBtn = modal.querySelector('#btn-confirm-open-session');

  badgeEl.textContent = `THEME ${theme.code} • ${theme.name}`;
  badgeEl.style.background = theme.bgRgba;
  badgeEl.style.color = theme.color;
  badgeEl.style.border = `1px solid ${theme.borderRgba}`;

  if (mode === 'normal') {
    titleEl.innerHTML = `<span style="color:#10b981;">🟢 Open Normal Test Session</span>: Theme ${theme.code}`;
    bannerEl.style.background = 'rgba(16, 185, 129, 0.12)';
    bannerEl.style.border = '1px solid rgba(16, 185, 129, 0.35)';
    bannerEl.style.color = '#34d399';
    bannerEl.innerHTML = `
      🟢 <strong>NORMAL SESSION (FULL SCORE)</strong>: Eligible students take the test for full curriculum scores. Students who already passed may retake to improve their highest score.
    `;
    confirmBtn.style.background = '#10b981';
    confirmBtn.style.borderColor = '#059669';
  } else {
    titleEl.innerHTML = `<span style="color:#fbbf24;">🟡 Open Remedial Test Session</span>: Theme ${theme.code}`;
    bannerEl.style.background = 'rgba(245, 158, 11, 0.12)';
    bannerEl.style.border = '1px solid rgba(245, 158, 11, 0.35)';
    bannerEl.style.color = '#fbbf24';
    bannerEl.innerHTML = `
      🟡 <strong>REMEDIAL SESSION (MAX 60% CAP)</strong>: Designated for students who have not passed (< 60%) or have not taken the test yet. Final effective score is capped at 60% (Grade C).
    `;
    confirmBtn.style.background = '#f59e0b';
    confirmBtn.style.borderColor = '#d97706';
  }

  // Set selected batch
  if (_selectedBatchId) {
    batchSelect.value = _selectedBatchId;
  }

  // State for student checklist inside modal
  let checkedStudentIds = new Set();
  let studentSearchQuery = '';
  let studentSortOrder = 'asc';
  let showIneligible = false;
  let tutorOverrideActive = false;

  const overrideCheckbox = modal.querySelector('#open-modal-override-checkbox');

  let lastEvaluatedStudents = [];

  const renderModalStudents = () => {
    const curBatchId = batchSelect.value;
    const batchStudents = (context.allStudents || []).filter(s => s.batch_id === curBatchId && !s.deleted_at && s.is_active !== false);
    
    // Evaluate eligibility
    const evaluated = evaluateStudentsEligibility({
      students: batchStudents,
      theme,
      themeTasks: theme.tasks,
      wordsTest: theme.wordsTest,
      phrasesTest: theme.phrasesTest,
      allAttempts: context.allAttempts || [],
      mode
    });
    lastEvaluatedStudents = evaluated;

    const eligibleList = evaluated.filter(e => e.isEligible);
    const ineligibleList = evaluated.filter(e => !e.isEligible);

    // Tutor Override is strictly manual (never auto-activated) so prerequisites are always respected by default
    tutorOverrideActive = Boolean(overrideCheckbox && overrideCheckbox.checked);

    // Determine selectable list:
    // If Tutor Override is active, include all students except those who already passed in Remedial mode
    let selectableList = eligibleList;
    if (tutorOverrideActive) {
      selectableList = evaluated.filter(e => mode === 'normal' || !e.isAlreadyPassed);
    }

    // Initial check all selectable by default if first time
    if (checkedStudentIds.size === 0 && selectableList.length > 0) {
      selectableList.forEach(e => checkedStudentIds.add(e.student.id));
    }

    // Update count display
    const countEl = modal.querySelector('#open-modal-student-count');
    if (countEl) countEl.textContent = `${checkedStudentIds.size} / ${selectableList.length}`;

    // Filter by search
    let displayList = selectableList;
    const q = studentSearchQuery.trim().toLowerCase();
    if (q) {
      displayList = displayList.filter(e => (e.student.name || '').toLowerCase().includes(q));
    }

    // Sort
    displayList.sort((a, b) => {
      const nA = (a.student.name || '').trim();
      const nB = (b.student.name || '').trim();
      const cmp = nA.localeCompare(nB, undefined, { sensitivity: 'base', numeric: true });
      return studentSortOrder === 'asc' ? cmp : -cmp;
    });

    const listContainer = modal.querySelector('#open-modal-students-list');
    if (!listContainer) return;

    if (displayList.length === 0) {
      listContainer.innerHTML = `
        <div style="padding:16px; text-align:center; color:#94a3b8; font-size:0.8rem;">
          ${q ? `No students match "${escapeHtml(q)}".` : 'No eligible students found in this batch. Check 🛡️ Tutor Override to bypass quiz prerequisites.'}
        </div>
      `;
    } else {
      listContainer.innerHTML = displayList.map(item => {
        const s = item.student;
        const isChecked = checkedStudentIds.has(s.id);
        const initial = (s.name || 'S').charAt(0).toUpperCase();

        let badgeBg = 'rgba(56, 189, 248, 0.15)';
        let badgeColor = '#38bdf8';
        if (item.statusType === 'success') {
          badgeBg = 'rgba(16, 185, 129, 0.15)';
          badgeColor = '#34d399';
        } else if (item.statusType === 'amber') {
          badgeBg = 'rgba(245, 158, 11, 0.15)';
          badgeColor = '#fbbf24';
        } else if (item.statusType === 'danger') {
          badgeBg = 'rgba(239, 68, 68, 0.15)';
          badgeColor = '#f87171';
        }

        return `
          <label style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding:7px 10px; border-radius:6px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05); cursor:pointer;">
            <div style="display:flex; align-items:center; gap:10px;">
              <input type="checkbox" class="open-student-checkbox" value="${s.id}" ${isChecked ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;">
              <span style="width:24px; height:24px; border-radius:50%; background:var(--fm-accent-tactical, #2563eb); color:#fff; display:flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:700;">
                ${initial}
              </span>
              <span style="font-size:0.85rem; font-weight:600; color:#ffffff;">${escapeHtml(s.name || 'Unnamed')}</span>
            </div>
            <span style="font-size:0.72rem; font-weight:700; padding:2px 8px; border-radius:4px; background:${badgeBg}; color:${badgeColor}; white-space:nowrap;">
              ${escapeHtml(item.statusLabel)}
            </span>
          </label>
        `;
      }).join('');
    }

    // Ineligible summary notice
    const ineligTextEl = modal.querySelector('#open-modal-ineligible-text');
    const ineligDetailsEl = modal.querySelector('#open-modal-ineligible-details');
    if (ineligTextEl) {
      if (tutorOverrideActive) {
        ineligTextEl.textContent = `🛡️ Tutor Override Active (${selectableList.length} selectable). Prerequisite quizzes bypassed.`;
      } else {
        ineligTextEl.textContent = `ℹ️ ${ineligibleList.length} Ineligible students hidden.`;
      }
    }
    if (ineligDetailsEl) {
      if (ineligibleList.length === 0) {
        ineligDetailsEl.innerHTML = `<span style="color:#94a3b8;">All students in this batch meet the eligibility criteria.</span>`;
      } else {
        ineligDetailsEl.innerHTML = ineligibleList.map(item => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:3px 0; border-bottom:1px solid rgba(255,255,255,0.04); color:#94a3b8;">
            <span>${escapeHtml(item.student.name || '')}</span>
            <span style="color:#f87171;">${escapeHtml(item.statusLabel)}</span>
          </div>
        `).join('');
      }
    }
  };

  // Checkbox listener
  modal.querySelector('#open-modal-students-list')?.addEventListener('change', (e) => {
    if (e.target.classList.contains('open-student-checkbox')) {
      if (e.target.checked) checkedStudentIds.add(e.target.value);
      else checkedStudentIds.delete(e.target.value);
      renderModalStudents();
    }
  });

  // Override checkbox listener
  if (overrideCheckbox) {
    overrideCheckbox.onchange = (e) => {
      overrideCheckbox.dataset.userInteracted = 'true';
      tutorOverrideActive = e.target.checked;
      renderModalStudents();
    };
  }

  // Batch changed
  batchSelect.onchange = () => {
    checkedStudentIds.clear();
    if (overrideCheckbox) delete overrideCheckbox.dataset.userInteracted;
    renderModalStudents();
  };

  // Search input
  modal.querySelector('#open-modal-student-search').oninput = (e) => {
    studentSearchQuery = e.target.value;
    renderModalStudents();
  };

  // Sort toggle
  const sortBtn = modal.querySelector('#btn-open-modal-sort');
  sortBtn.onclick = () => {
    studentSortOrder = studentSortOrder === 'asc' ? 'desc' : 'asc';
    sortBtn.textContent = studentSortOrder === 'asc' ? '🔤 A → Z' : '🔤 Z → A';
    renderModalStudents();
  };

  // Select all / deselect all
  modal.querySelector('#btn-open-modal-select-all').onclick = () => {
    const curBatchId = batchSelect.value;
    const batchStudents = (context.allStudents || []).filter(s => s.batch_id === curBatchId && !s.deleted_at && s.is_active !== false);
    const evaluated = evaluateStudentsEligibility({
      students: batchStudents,
      theme,
      themeTasks: theme.tasks,
      wordsTest: theme.wordsTest,
      phrasesTest: theme.phrasesTest,
      allAttempts: context.allAttempts || [],
      mode
    });
    const targetList = tutorOverrideActive ? evaluated.filter(e => mode === 'normal' || !e.isAlreadyPassed) : evaluated.filter(e => e.isEligible);
    targetList.forEach(e => checkedStudentIds.add(e.student.id));
    renderModalStudents();
  };

  modal.querySelector('#btn-open-modal-deselect-all').onclick = () => {
    checkedStudentIds.clear();
    renderModalStudents();
  };

  // Toggle ineligible view
  const toggleIneligBtn = modal.querySelector('#btn-toggle-ineligible-view');
  toggleIneligBtn.onclick = () => {
    const details = modal.querySelector('#open-modal-ineligible-details');
    showIneligible = !showIneligible;
    if (showIneligible) {
      details.classList.remove('hidden');
      toggleIneligBtn.textContent = 'Hide Details';
    } else {
      details.classList.add('hidden');
      toggleIneligBtn.textContent = 'View Details';
    }
  };

  // Close handlers
  const closeModal = () => modal.classList.add('hidden');
  modal.querySelector('#btn-close-open-modal').onclick = closeModal;
  modal.querySelector('#btn-cancel-open-modal').onclick = closeModal;

  // Confirm Unlock Session
  confirmBtn.onclick = async () => {
    const targetBatchId = batchSelect.value;
    if (!targetBatchId) {
      showToast('Please select a target batch first.', 'error');
      return;
    }

    const allowedStudentIds = Array.from(checkedStudentIds);
    if (allowedStudentIds.length === 0) {
      showToast('Please select at least 1 eligible student for the test.', 'warning');
      return;
    }

    const duration = parseInt(durationInput.value, 10) || 60;
    const isRemedial = (mode === 'remedial');

    showLoading();
    try {
      const promises = [];
      if (theme.wordsTest) {
        promises.push(openTestSession({
          testId: theme.wordsTest.id,
          batchId: targetBatchId,
          allocatedMinutes: duration,
          allowedStudentIds: allowedStudentIds,
          isRemedial: isRemedial,
          remedialStudentIds: isRemedial ? allowedStudentIds : []
        }));
      }
      if (theme.phrasesTest) {
        // Words Exam prerequisite rule:
        // A student is whitelisted for Phrases Exam ONLY if they have passed Words Exam (>= 60%),
        // UNLESS the tutor has explicitly enabled Tutor Override.
        let phrasesAllowedIds = allowedStudentIds;
        if (!tutorOverrideActive && theme.wordsTest) {
          const evalMap = new Map(lastEvaluatedStudents.map(e => [e.student.id, e]));
          phrasesAllowedIds = allowedStudentIds.filter(id => {
            const ev = evalMap.get(id);
            return ev && ev.wordsPassed;
          });
        }
        promises.push(openTestSession({
          testId: theme.phrasesTest.id,
          batchId: targetBatchId,
          allocatedMinutes: duration,
          allowedStudentIds: phrasesAllowedIds,
          isRemedial: isRemedial,
          remedialStudentIds: isRemedial ? phrasesAllowedIds : []
        }));
      }

      if (promises.length === 0) {
        throw new Error(`No Words or Phrases test modules found for Theme ${theme.code}.`);
      }

      await Promise.all(promises);

      showToast(`🔓 Test session Theme ${theme.code} (${mode.toUpperCase()}) successfully opened for ${allowedStudentIds.length} students (${duration} mins)!`, 'success');
      closeModal();
      if (window.renderClassHub) {
        window.renderClassHub(document.getElementById('admin-content-area'));
      }
    } catch (err) {
      console.error('Error unlocking session:', err);
      showToast('Failed to open test session: ' + err.message, 'error');
    } finally {
      hideLoading();
    }
  };

  renderModalStudents();
  modal.classList.remove('hidden');
}

/**
 * Open Modal: Tambah Siswa Susulan ke Sesi Berjalan
 */
function openThemeLateModal(container, theme, context) {
  _currentLateModalTheme = theme;
  const modal = container.querySelector('#modal-theme-add-late');
  if (!modal) return;

  const titleEl = modal.querySelector('#late-modal-theme-title');
  const batchNameEl = modal.querySelector('#late-modal-batch-name');
  const remainingEl = modal.querySelector('#late-modal-remaining-time');
  const modeBadgeEl = modal.querySelector('#late-modal-mode-badge');
  const confirmBtn = modal.querySelector('#btn-confirm-add-late');

  titleEl.textContent = `Theme ${theme.code} • ${theme.name}`;
  batchNameEl.textContent = `${theme.liveBatchName} (${theme.allowedStudentIds.length} Enrolled Students)`;
  remainingEl.textContent = `${theme.remainingMinutes} Mins`;

  if (theme.isRemedial) {
    modeBadgeEl.style.background = 'rgba(245, 158, 11, 0.2)';
    modeBadgeEl.style.border = '1px solid #f59e0b';
    modeBadgeEl.style.color = '#fbbf24';
    modeBadgeEl.textContent = '🟡 REMEDIAL (MAX 60%)';
  } else {
    modeBadgeEl.style.background = 'rgba(16, 185, 129, 0.2)';
    modeBadgeEl.style.border = '1px solid #10b981';
    modeBadgeEl.style.color = '#34d399';
    modeBadgeEl.textContent = '🟢 NORMAL (FULL SCORE)';
  }

  // Filter ONLY unenrolled batch students who are eligible!
  const targetBatchId = theme.liveBatchId;
  const batchStudents = (context.allStudents || []).filter(s => s.batch_id === targetBatchId && !s.deleted_at && s.is_active !== false);
  const enrolledSet = new Set(theme.allowedStudentIds || []);

  // Exclude enrolled students completely!
  const unenrolledStudents = batchStudents.filter(s => !enrolledSet.has(s.id));

  // Evaluate eligibility for the session mode
  const mode = theme.isRemedial ? 'remedial' : 'normal';
  const evaluated = evaluateStudentsEligibility({
    students: unenrolledStudents,
    theme,
    themeTasks: theme.tasks,
    wordsTest: theme.wordsTest,
    phrasesTest: theme.phrasesTest,
    allAttempts: context.allAttempts || [],
    mode
  });

  const eligibleLateList = evaluated.filter(e => e.isEligible);

  let checkedLateIds = new Set();
  let lateSearchQuery = '';

  const renderLateList = () => {
    let list = eligibleLateList;
    const q = lateSearchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(e => (e.student.name || '').toLowerCase().includes(q));
    }

    list.sort((a, b) => (a.student.name || '').localeCompare(b.student.name || '', undefined, { sensitivity: 'base', numeric: true }));

    const selectedCountEl = modal.querySelector('#late-modal-selected-count');
    if (selectedCountEl) selectedCountEl.textContent = String(checkedLateIds.size);

    const listContainer = modal.querySelector('#late-modal-students-list');
    if (!listContainer) return;

    if (list.length === 0) {
      listContainer.innerHTML = `
        <div style="padding:16px; text-align:center; color:#94a3b8; font-size:0.8rem;">
          ${q ? `No students match "${escapeHtml(q)}".` : 'All eligible students in this batch are already enrolled in the test.'}
        </div>
      `;
      return;
    }

    listContainer.innerHTML = list.map(item => {
      const s = item.student;
      const isChecked = checkedLateIds.has(s.id);
      const initial = (s.name || 'S').charAt(0).toUpperCase();

      return `
        <label style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding:7px 10px; border-radius:6px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05); cursor:pointer;">
          <div style="display:flex; align-items:center; gap:10px;">
            <input type="checkbox" class="late-student-checkbox" value="${s.id}" ${isChecked ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;">
            <span style="width:24px; height:24px; border-radius:50%; background:#6366f1; color:#fff; display:flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:700;">
              ${initial}
            </span>
            <span style="font-size:0.85rem; font-weight:600; color:#ffffff;">${escapeHtml(s.name || 'Unnamed')}</span>
          </div>
          <span style="font-size:0.72rem; font-weight:700; padding:2px 8px; border-radius:4px; background:rgba(99, 102, 241, 0.2); color:#a5b4fc;">
            ${escapeHtml(item.statusLabel)}
          </span>
        </label>
      `;
    }).join('');
  };

  modal.querySelector('#late-modal-students-list')?.addEventListener('change', (e) => {
    if (e.target.classList.contains('late-student-checkbox')) {
      if (e.target.checked) checkedLateIds.add(e.target.value);
      else checkedLateIds.delete(e.target.value);
      renderLateList();
    }
  });

  modal.querySelector('#late-modal-search').oninput = (e) => {
    lateSearchQuery = e.target.value;
    renderLateList();
  };

  modal.querySelector('#btn-late-modal-select-all').onclick = () => {
    eligibleLateList.forEach(e => checkedLateIds.add(e.student.id));
    renderLateList();
  };

  modal.querySelector('#btn-late-modal-deselect-all').onclick = () => {
    checkedLateIds.clear();
    renderLateList();
  };

  const closeModal = () => modal.classList.add('hidden');
  modal.querySelector('#btn-close-late-modal').onclick = closeModal;
  modal.querySelector('#btn-cancel-late-modal').onclick = closeModal;

  confirmBtn.onclick = async () => {
    const studentIds = Array.from(checkedLateIds);
    if (studentIds.length === 0) {
      showToast('Please select at least 1 late arrival student to add.', 'warning');
      return;
    }

    const isRem = theme.isRemedial;
    showLoading();
    try {
      const promises = [];
      if (theme.wordsTest) {
        promises.push(addLateStudentsToSession({
          testId: theme.wordsTest.id,
          studentIds: studentIds,
          remedialStudentIds: isRem ? studentIds : []
        }));
      }
      if (theme.phrasesTest) {
        let phrasesLateIds = studentIds;
        if (theme.wordsTest) {
          const evalMap = new Map(evaluated.map(e => [e.student.id, e]));
          phrasesLateIds = studentIds.filter(id => {
            const ev = evalMap.get(id);
            return ev && ev.wordsPassed;
          });
        }
        promises.push(addLateStudentsToSession({
          testId: theme.phrasesTest.id,
          studentIds: phrasesLateIds,
          remedialStudentIds: isRem ? phrasesLateIds : []
        }));
      }

      await Promise.all(promises);

      showToast(`👥 Successfully added ${studentIds.length} late student(s) to Theme ${theme.code}! (${isRem ? 'Status: REMEDIAL' : 'Status: NORMAL'})`, 'success');
      closeModal();
      if (window.renderClassHub) {
        window.renderClassHub(document.getElementById('admin-content-area'));
      }
    } catch (err) {
      console.error('Error adding late students:', err);
      showToast('Failed to add late arrival students: ' + err.message, 'error');
    } finally {
      hideLoading();
    }
  };

  renderLateList();
  modal.classList.remove('hidden');
}

let _livePollingTimer = null;
let _liveMonitorActiveFilter = 'all';
let _liveMonitorSearchQuery = '';

/**
 * Open Modal: Live Test Session Monitor & Student Controller
 */
/**
 * Open Modal: Live Test Session Monitor & Student Controller
 */
async function openThemeLiveMonitorModal(container, theme, context) {
  const modal = container.querySelector('#modal-theme-live-monitor');
  if (!modal) return;

  if (_livePollingTimer) {
    clearInterval(_livePollingTimer);
    _livePollingTimer = null;
  }

  // Header Elements
  const themeBadgeEl = modal.querySelector('#live-modal-theme-badge');
  const titleEl = modal.querySelector('#live-modal-title');
  const subtitleEl = modal.querySelector('#live-modal-subtitle');
  const modeBadgeEl = modal.querySelector('#live-modal-mode-badge');
  const remainingEl = modal.querySelector('#live-modal-remaining');
  const studentsContainer = modal.querySelector('#live-modal-students-container');
  const autoPollCheckbox = modal.querySelector('#live-modal-auto-poll');
  const searchInput = modal.querySelector('#live-modal-search');
  const refreshBtn = modal.querySelector('#btn-live-modal-refresh');
  const footerInfoEl = modal.querySelector('#live-modal-footer-info');

  themeBadgeEl.textContent = `THEME ${theme.code}`;
  themeBadgeEl.style.background = theme.bgRgba;
  themeBadgeEl.style.color = theme.color;
  themeBadgeEl.style.border = `1px solid ${theme.borderRgba}`;

  titleEl.innerHTML = `<span>👁️</span> Live Test Session Monitor: Theme ${theme.code}`;
  subtitleEl.textContent = `${theme.name} Test • ${theme.liveBatchName} • Words & Phrases Modules`;

  if (theme.isRemedial) {
    modeBadgeEl.style.background = 'rgba(245, 158, 11, 0.2)';
    modeBadgeEl.style.border = '1px solid #f59e0b';
    modeBadgeEl.style.color = '#fbbf24';
    modeBadgeEl.textContent = '🟡 REMEDIAL (MAX 60%)';
  } else {
    modeBadgeEl.style.background = 'rgba(16, 185, 129, 0.2)';
    modeBadgeEl.style.border = '1px solid #10b981';
    modeBadgeEl.style.color = '#34d399';
    modeBadgeEl.textContent = '🟢 NORMAL (FULL SCORE)';
  }

  remainingEl.textContent = `${theme.remainingMinutes}m`;
  if (searchInput) searchInput.value = '';
  _liveMonitorSearchQuery = '';
  _liveMonitorActiveFilter = 'all';

  let processedStudents = [];
  let _realtimeChannel = null;
  let _realtimeDebounce = null;

  // Question count reference per Theme (cumulative vault sizes)
  const THEME_EXPECTED_COUNTS = {
    'A': { words: 120, phrases: 30 },
    'B': { words: 280, phrases: 70 },
    'C': { words: 480, phrases: 120 },
    'D': { words: 640, phrases: 160 }
  };

  function countCorrectAnswers(answersList) {
    let count = 0;
    (answersList || []).forEach(ans => {
      const val = (ans.student_answer || '').trim().toLowerCase();
      if (!val) return;
      if (ans.is_correct === true || ans.score >= 1) {
        count++;
        return;
      }
      let accepted = ans.accepted_answers_snapshot || [];
      if (typeof accepted === 'string') {
        try { accepted = JSON.parse(accepted); } catch { accepted = []; }
      }
      if (!Array.isArray(accepted) && typeof accepted === 'string') {
        accepted = [accepted];
      }
      const correctSnap = String(ans.correct_answer_snapshot || '').split(/[;/|,]/).map(s => s.trim().toLowerCase()).filter(Boolean);
      const acceptedClean = (accepted || []).flatMap(s => String(s).split(/[;/|,]/)).map(s => s.trim().toLowerCase()).filter(Boolean);
      const allValid = [...new Set([...correctSnap, ...acceptedClean])];
      if (allValid.includes(val)) {
        count++;
      }
    });
    return count;
  }

  async function loadLiveData(silent = false) {
    if (!silent) {
      studentsContainer.innerHTML = `
        <div style="padding: 40px; text-align: center; color: #94a3b8;">
          <div class="loading-spinner" style="margin: 0 auto 12px; width: 32px; height: 32px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #38bdf8; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
          <div style="font-size: 0.9rem; font-weight: 600;">Mengambil status live siswa, progres jawaban, & alarm...</div>
        </div>
      `;
    }

    try {
      const testIds = [theme.wordsTest?.id, theme.phrasesTest?.id].filter(Boolean);
      const studentIds = theme.allowedStudentIds || [];
      const sessionData = await fetchLiveTestSessionData({
        testIds,
        studentIds,
        unlockedAt: theme.unlockedAt
      });

      const allStudents = context.allStudents || [];
      const enrolledStudents = allStudents.filter(s => studentIds.includes(s.id));

      const themeCodeUpper = (theme.code || 'B').toUpperCase();
      const themeCounts = THEME_EXPECTED_COUNTS[themeCodeUpper] || { words: 280, phrases: 70 };

      processedStudents = enrolledStudents.map(student => {
        const studAttempts = (sessionData.attempts || []).filter(a => a.student_id === student.id);
        const wAtt = studAttempts.find(a => a.test_id === theme.wordsTest?.id);
        const pAtt = studAttempts.find(a => a.test_id === theme.phrasesTest?.id);

        const inProgressAtt = [wAtt, pAtt].find(a => a && a.status === 'in_progress');
        const hasSubmitted = [wAtt, pAtt].some(a => a && ['submitted', 'auto_submitted', 'evaluated'].includes(a.status));
        const hasCancelled = [wAtt, pAtt].some(a => a && a.status === 'cancelled');

        let status = 'not_started';
        let statusText = 'Belum Mulai';
        let statusColor = '#fbbf24';

        if (inProgressAtt) {
          status = 'in_progress';
          statusText = 'Sedang Mengerjakan';
          statusColor = '#38bdf8';
        } else if (hasSubmitted) {
          status = 'submitted';
          statusText = 'Sudah Selesai';
          statusColor = '#10b981';
        } else if (hasCancelled) {
          status = 'cancelled';
          statusText = 'Dibatalkan / Kicked';
          statusColor = '#ef4444';
        }

        // Active module identification
        let activeModule = 'None';
        let targetAtt = null;
        if (inProgressAtt) {
          targetAtt = inProgressAtt;
          activeModule = (inProgressAtt.test_id === theme.wordsTest?.id) ? 'Words Exam' : 'Phrases Exam';
        } else if (hasSubmitted) {
          targetAtt = pAtt || wAtt;
          activeModule = (wAtt && pAtt) ? 'Words & Phrases' : (wAtt ? 'Words Exam' : 'Phrases Exam');
        }

        // Answers belonging specifically to target attempt
        const targetAnswers = targetAtt
          ? (sessionData.answers || []).filter(ans => ans.attempt_id === targetAtt.id)
          : (studAttempts.length > 0 
              ? (sessionData.answers || []).filter(ans => studAttempts.some(a => a.id === ans.attempt_id)) 
              : []);

        const answeredCount = targetAnswers.filter(ans => ans.student_answer && ans.student_answer.trim()).length;
        
        // Accurate total questions calculation
        let totalQuestions = 0;
        if (targetAtt && targetAtt.total_questions > 0) {
          totalQuestions = targetAtt.total_questions;
        } else if (targetAnswers.length > 0) {
          totalQuestions = targetAnswers.length;
        } else if (studAttempts.length > 0) {
          totalQuestions = studAttempts.reduce((acc, a) => acc + (a.total_questions || 0), 0);
        }

        if (totalQuestions === 0) {
          const isPhrases = inProgressAtt ? (inProgressAtt.test_id === theme.phrasesTest?.id) : false;
          totalQuestions = isPhrases ? themeCounts.phrases : themeCounts.words;
        }

        const answeredPercent = totalQuestions > 0 ? Math.min(100, Math.round((answeredCount / totalQuestions) * 100)) : 0;

        // Real-time Score calculation
        let rawScore = 0;
        let effectiveScore = 0;
        let isEvaluated = false;

        if (status === 'submitted') {
          const validSub = [wAtt, pAtt].filter(a => a && ['submitted', 'auto_submitted', 'evaluated'].includes(a.status));
          if (validSub.length > 0) {
            let sumEff = 0;
            validSub.forEach(a => {
              let eff = parseFloat(a.effective_score ?? a.percentage ?? 0);
              // Self-heal: If recorded score is 0 but student answered questions, compute on the fly
              if (eff === 0) {
                const subAnswers = (sessionData.answers || []).filter(ans => ans.attempt_id === a.id);
                const subAnswered = subAnswers.filter(ans => ans.student_answer && ans.student_answer.trim()).length;
                if (subAnswered > 0) {
                  const correct = countCorrectAnswers(subAnswers);
                  const tq = a.total_questions || subAnswers.length || 1;
                  const recomputedPct = Math.round((correct / tq) * 100);
                  eff = theme.isRemedial ? Math.min(recomputedPct, 60) : recomputedPct;
                }
              }
              sumEff += eff;
            });
            effectiveScore = Math.round(sumEff / validSub.length);
            rawScore = effectiveScore;
            isEvaluated = true;
          }
        } else if (status === 'in_progress' && targetAtt) {
          const correctCount = countCorrectAnswers(targetAnswers);
          rawScore = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
          effectiveScore = theme.isRemedial ? Math.min(rawScore, 60) : rawScore;
          isEvaluated = true;
        }

        const grade = getGrade(effectiveScore);

        // Alarms / Anti-cheat details
        const studCheats = (sessionData.cheatLogs || []).filter(c => c.actor_user_id === student.id);
        const alarmCount = studCheats.length;
        const alarmList = studCheats.map(c => ({
          reason: c.new_value?.reason || 'Security Warning',
          time: c.created_at,
          strike: c.new_value?.strike || 1
        }));

        return {
          student,
          status,
          statusText,
          statusColor,
          activeModule,
          answeredCount,
          totalQuestions,
          answeredPercent,
          rawScore,
          effectiveScore,
          isEvaluated,
          grade,
          alarmCount,
          alarmList,
          hasAttempts: studAttempts.length > 0
        };
      });

      renderLiveMonitorUI();

      if (footerInfoEl) {
        const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        footerInfoEl.textContent = `Terakhir diperbarui: ${timeStr} WITA • Data real-time sinkron`;
      }
    } catch (err) {
      console.error('Error loading live test session data:', err);
      studentsContainer.innerHTML = `
        <div style="padding: 30px; text-align: center; color: #f87171;">
          <div>⚠️ Gagal memuat data live monitor: ${escapeHtml(err.message)}</div>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-retry-live-load" style="margin-top: 10px;">Coba Lagi</button>
        </div>
      `;
      modal.querySelector('#btn-retry-live-load')?.addEventListener('click', () => loadLiveData(false));
    }
  }

  function renderLiveMonitorUI() {
    // 1. Update KPI numbers
    const total = processedStudents.length;
    const inProgress = processedStudents.filter(s => s.status === 'in_progress').length;
    const submitted = processedStudents.filter(s => s.status === 'submitted').length;
    const notStarted = processedStudents.filter(s => s.status === 'not_started').length;
    const totalAlarms = processedStudents.reduce((acc, s) => acc + s.alarmCount, 0);
    const studentsWithAlarms = processedStudents.filter(s => s.alarmCount > 0).length;

    modal.querySelector('#kpi-live-total').textContent = String(total);
    modal.querySelector('#kpi-live-in-progress').textContent = String(inProgress);
    modal.querySelector('#kpi-live-submitted').textContent = String(submitted);
    modal.querySelector('#kpi-live-not-started').textContent = String(notStarted);
    modal.querySelector('#kpi-live-alarms').innerHTML = `${totalAlarms} <span style="font-size:0.75rem; font-weight:600; color:#cbd5e1;">(${studentsWithAlarms} Siswa)</span>`;

    modal.querySelector('#tab-cnt-all').textContent = String(total);
    modal.querySelector('#tab-cnt-in-progress').textContent = String(inProgress);
    modal.querySelector('#tab-cnt-submitted').textContent = String(submitted);
    modal.querySelector('#tab-cnt-not-started').textContent = String(notStarted);
    modal.querySelector('#tab-cnt-alarm').textContent = String(studentsWithAlarms);

    // 2. Filter tabs active class
    modal.querySelectorAll('.live-filter-btn').forEach(btn => {
      const f = btn.getAttribute('data-filter');
      if (f === _liveMonitorActiveFilter) {
        btn.classList.add('btn-primary', 'active');
        btn.classList.remove('btn-secondary');
      } else {
        btn.classList.add('btn-secondary');
        btn.classList.remove('btn-primary', 'active');
      }
    });

    // 3. Filter & Search
    let displayList = processedStudents;
    if (_liveMonitorActiveFilter === 'in_progress') {
      displayList = displayList.filter(s => s.status === 'in_progress');
    } else if (_liveMonitorActiveFilter === 'submitted') {
      displayList = displayList.filter(s => s.status === 'submitted');
    } else if (_liveMonitorActiveFilter === 'not_started') {
      displayList = displayList.filter(s => s.status === 'not_started');
    } else if (_liveMonitorActiveFilter === 'alarm') {
      displayList = displayList.filter(s => s.alarmCount > 0);
    }

    const q = _liveMonitorSearchQuery.trim().toLowerCase();
    if (q) {
      displayList = displayList.filter(s => (s.student.name || '').toLowerCase().includes(q));
    }

    // Sort: alarms first, then in_progress, then submitted, then not_started
    displayList.sort((a, b) => {
      if (b.alarmCount !== a.alarmCount) return b.alarmCount - a.alarmCount;
      const order = { 'in_progress': 1, 'submitted': 2, 'not_started': 3, 'cancelled': 4 };
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
      return (a.student.name || '').localeCompare(b.student.name || '');
    });

    if (displayList.length === 0) {
      studentsContainer.innerHTML = `
        <div style="padding: 30px; text-align: center; color: #94a3b8; font-size: 0.85rem;">
          ${q ? `Tidak ada siswa yang cocok dengan "${escapeHtml(q)}".` : 'Tidak ada siswa pada filter ini.'}
        </div>
      `;
      return;
    }

    studentsContainer.innerHTML = displayList.map(item => {
      const s = item.student;
      const initial = (s.name || 'S').charAt(0).toUpperCase();
      const scoreColor = getGradeColorByScore(item.effectiveScore);
      const isRemedialCap = theme.isRemedial;
      const scoreDisplay = item.isEvaluated 
        ? `${item.effectiveScore}%${isRemedialCap ? '<sup style="font-size:0.65em; font-weight:900; color:inherit; margin-left:1px;">R</sup>' : ''}`
        : '--';

      const isStar = item.grade === '★' || item.grade === 'Star' || item.grade === 'S' || item.effectiveScore === 100;
      const gradeText = isStar ? '★' : item.grade;
      const circleText = isStar ? '#ffffff' : '#0f172a';
      const circleClass = isStar ? 'grade-circle-star' : `grade-circle-${(item.grade || 'e').toLowerCase()}`;

      const gradeCircleHtml = item.isEvaluated ? `
        <div class="grade-circle ${circleClass}" style="width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.78rem; font-weight: 800; background: ${scoreColor}; color: ${circleText}; box-shadow: 0 0 8px ${scoreColor}; flex-shrink: 0;">
          ${gradeText}
        </div>
      ` : `
        <div style="width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; background: rgba(255,255,255,0.06); color: #64748b; border: 1px dashed rgba(255,255,255,0.15); flex-shrink: 0;">
          -
        </div>
      `;

      return `
        <div class="live-student-card" style="background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap;">
          <!-- 1. Student Identity -->
          <div style="display: flex; align-items: center; gap: 12px; min-width: 220px;">
            <div style="width: 36px; height: 36px; border-radius: 50%; background: #2563eb; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 0.95rem; font-weight: 800; box-shadow: 0 2px 8px rgba(0,0,0,0.3); flex-shrink: 0;">
              ${initial}
            </div>
            <div>
              <div style="font-size: 0.92rem; font-weight: 700; color: #ffffff;">${escapeHtml(s.name || 'Unnamed')}</div>
              <div style="font-size: 0.75rem; color: #94a3b8; display: flex; align-items: center; gap: 6px; margin-top: 2px;">
                <span>${escapeHtml(theme.liveBatchName)}</span>
                <span>&bull;</span>
                <span style="color: ${item.statusColor}; font-weight: 700;">${item.statusText}</span>
                ${item.activeModule !== 'None' ? `<span style="background:rgba(255,255,255,0.06); padding:1px 6px; border-radius:4px; font-size:0.7rem; color:#cbd5e1;">${escapeHtml(item.activeModule)}</span>` : ''}
              </div>
            </div>
          </div>

          <!-- 2. Soal Terjawab (Progress Bar) -->
          <div style="min-width: 170px; flex: 1;">
            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 5px;">
              <span style="color: #94a3b8;">Soal Terjawab:</span>
              <span style="font-weight: 800; color: #ffffff;">${item.answeredCount} / ${item.totalQuestions} (${item.answeredPercent}%)</span>
            </div>
            <div style="height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
              <div style="height: 100%; width: ${item.answeredPercent}%; background: linear-gradient(90deg, #3b82f6, #10b981); border-radius: 3px; transition: width 0.3s ease;"></div>
            </div>
          </div>

          <!-- 3. Alarm / Anti-Cheat Status (Clickable for details) -->
          <div style="min-width: 120px; text-align: center;">
            ${item.alarmCount === 0 ? `
              <span style="font-size: 0.75rem; font-weight: 700; color: #34d399; background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.3); padding: 4px 10px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px;">
                🛡️ 0x Bersih
              </span>
            ` : `
              <span class="btn-inspect-student-alarms" data-student-id="${s.id}" data-student-name="${escapeHtml(s.name || '')}" style="font-size: 0.75rem; font-weight: 800; color: #ef4444; background: rgba(239,68,68,0.2); border: 1px solid #ef4444; padding: 4px 10px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 0 10px rgba(239,68,68,0.3); cursor: pointer; transition: transform 0.15s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" title="Klik untuk lihat rincian ${item.alarmCount}x alarm anti-cheat">
                🚨 ${item.alarmCount}x ALARM 🔍
              </span>
            `}
          </div>

          <!-- 4. Skor Real-Time -->
          <div style="min-width: 120px; display: flex; align-items: center; gap: 8px; justify-content: flex-end;">
            <div style="text-align: right;">
              <div style="font-size: 0.95rem; font-weight: 800; color: ${scoreColor};">
                ${scoreDisplay}
              </div>
              <div style="font-size: 0.7rem; color: #94a3b8;">
                ${item.isEvaluated ? `${item.effectiveScore >= 60 ? 'Passing' : 'Below Passing'}` : 'Belum Ada Skor'}
              </div>
            </div>
            ${gradeCircleHtml}
          </div>

          <!-- 5. Tombol Keluarkan (Kick) -->
          <div style="display: flex; align-items: center;">
            <button type="button" class="btn btn-sm btn-kick-student" data-student-id="${s.id}" data-student-name="${escapeHtml(s.name || '')}" style="background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.4); color: #f87171; font-weight: 700; font-size: 0.75rem; padding: 6px 12px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#dc2626'; this.style.color='#fff';" onmouseout="this.style.background='rgba(239,68,68,0.15)'; this.style.color='#f87171';">
              <span>🚫</span> Keluarkan
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach kick listener
    studentsContainer.querySelectorAll('.btn-kick-student').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const studentId = e.currentTarget.getAttribute('data-student-id');
        const studentName = e.currentTarget.getAttribute('data-student-name');
        if (!studentId) return;

        openKickConfirmationModal(container, studentId, studentName, theme, async () => {
          theme.allowedStudentIds = (theme.allowedStudentIds || []).filter(id => id !== studentId);
          await loadLiveData(false);
          const enrolledLabel = container.querySelector(`.btn-theme-live-monitor[data-theme="${theme.code}"]`);
          if (enrolledLabel) enrolledLabel.innerHTML = `<span>👁️</span> Monitor Live & Status Ujian (${theme.allowedStudentIds.length})`;
          if (window.renderClassHub) {
            // Background sync Class Hub if open
          }
        });
      });
    });

    // Attach inspect alarm detail listener
    studentsContainer.querySelectorAll('.btn-inspect-student-alarms').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const studentId = e.currentTarget.getAttribute('data-student-id');
        const found = processedStudents.find(p => p.student.id === studentId);
        if (found) {
          openStudentAlarmDetailModal(container, found.student, found.alarmList, theme, async () => {
            await loadLiveData(true);
          });
        }
      });
    });
  }

  // Filter tab listeners
  modal.querySelectorAll('.live-filter-btn').forEach(btn => {
    btn.onclick = () => {
      _liveMonitorActiveFilter = btn.getAttribute('data-filter') || 'all';
      renderLiveMonitorUI();
    };
  });

  // Search input
  if (searchInput) {
    searchInput.oninput = (e) => {
      _liveMonitorSearchQuery = e.target.value;
      renderLiveMonitorUI();
    };
  }

  // Refresh button
  if (refreshBtn) {
    refreshBtn.onclick = () => loadLiveData(false);
  }

  // Time Extension Controls (+ Tambah Waktu)
  const addTimeBtn = modal.querySelector('#btn-live-modal-add-time');
  const addTimeMenu = modal.querySelector('#live-modal-add-time-menu');

  if (addTimeBtn && addTimeMenu) {
    addTimeBtn.onclick = (e) => {
      e.stopPropagation();
      const isHidden = addTimeMenu.style.display === 'none' || addTimeMenu.classList.contains('hidden');
      addTimeMenu.style.display = isHidden ? 'flex' : 'none';
      addTimeMenu.classList.toggle('hidden', !isHidden);
    };

    document.addEventListener('click', () => {
      addTimeMenu.style.display = 'none';
      addTimeMenu.classList.add('hidden');
    });

    modal.querySelectorAll('.btn-add-time-option').forEach(opt => {
      opt.onclick = async (e) => {
        e.stopPropagation();
        const mins = parseInt(opt.getAttribute('data-mins'), 10);
        addTimeMenu.style.display = 'none';
        addTimeMenu.classList.add('hidden');
        await doExtendTime(mins);
      };
    });

    const customBtn = modal.querySelector('#btn-add-time-custom');
    if (customBtn) {
      customBtn.onclick = async (e) => {
        e.stopPropagation();
        addTimeMenu.style.display = 'none';
        addTimeMenu.classList.add('hidden');
        const inputStr = prompt('Masukkan jumlah menit tambahan (contoh: 20):', '20');
        if (!inputStr) return;
        const mins = parseInt(inputStr.trim(), 10);
        if (isNaN(mins) || mins <= 0) {
          alert('Jumlah menit harus berupa angka positif.');
          return;
        }
        await doExtendTime(mins);
      };
    }
  }

  async function doExtendTime(mins) {
    const testIds = [theme.wordsTest?.id, theme.phrasesTest?.id].filter(Boolean);
    if (!testIds.length) {
      showToast('Tidak ada tes yang aktif untuk diperpanjang.', 'error');
      return;
    }

    try {
      showToast(`Memperpanjang waktu ujian +${mins} menit...`, 'info', 3000);
      const res = await extendTestSessionTime({ testIds, additionalMinutes: mins });
      if (res.success) {
        theme.remainingMinutes = res.remainingMinutes;
        remainingEl.textContent = `${res.remainingMinutes}m`;
        showToast(`⏱️ Waktu ujian berhasil diperpanjang +${mins} menit! Sisa waktu sekarang: ${res.remainingMinutes}m`, 'success', 5000);
        await loadLiveData(true);
        if (window.renderClassHub) {
          // Background sync
        }
      }
    } catch (err) {
      console.error('Failed to extend test time:', err);
      showToast('Gagal menambah waktu ujian: ' + err.message, 'error');
    }
  }

  // Supabase Realtime Subscription setup
  const debouncedRealtimeLoad = () => {
    if (_realtimeDebounce) clearTimeout(_realtimeDebounce);
    _realtimeDebounce = setTimeout(() => {
      if (!modal.classList.contains('hidden')) {
        loadLiveData(true);
      }
    }, 400);
  };

  async function setupRealtimeSubscription() {
    try {
      const sb = await getSupabase();
      if (!sb || typeof sb.channel !== 'function') return;
      const testIds = [theme.wordsTest?.id, theme.phrasesTest?.id].filter(Boolean);
      if (!testIds.length) return;

      const channelId = `live-monitor-${theme.code}-${Date.now()}`;
      _realtimeChannel = sb.channel(channelId)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'attempts' }, (payload) => {
          if (testIds.includes(payload.new?.test_id || payload.old?.test_id)) {
            debouncedRealtimeLoad();
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'attempt_answers' }, () => {
          debouncedRealtimeLoad();
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, (payload) => {
          if (payload.new?.action === 'CHEAT_ATTEMPT' && testIds.includes(payload.new?.entity_id)) {
            debouncedRealtimeLoad();
          }
        })
        .subscribe();
    } catch (e) {
      console.warn('Realtime subscription not available, falling back to auto-poll:', e);
    }
  }

  // Close handlers
  const closeModal = () => {
    if (_livePollingTimer) {
      clearInterval(_livePollingTimer);
      _livePollingTimer = null;
    }
    if (_realtimeChannel) {
      try {
        getSupabase().then(sb => sb.removeChannel(_realtimeChannel));
      } catch (_) {}
      _realtimeChannel = null;
    }
    modal.classList.add('hidden');
  };

  modal.querySelector('#btn-close-live-modal').onclick = closeModal;
  modal.querySelector('#btn-close-live-modal-footer').onclick = closeModal;

  // Auto-poll interval handling (5s heartbeat safety)
  const setupAutoPoll = () => {
    if (_livePollingTimer) {
      clearInterval(_livePollingTimer);
      _livePollingTimer = null;
    }
    if (autoPollCheckbox && autoPollCheckbox.checked) {
      _livePollingTimer = setInterval(() => {
        if (!modal.classList.contains('hidden')) {
          loadLiveData(true);
        } else {
          clearInterval(_livePollingTimer);
          _livePollingTimer = null;
        }
      }, 5000);
    }
  };

  if (autoPollCheckbox) {
    autoPollCheckbox.onchange = setupAutoPoll;
  }

  await loadLiveData(false);
  setupAutoPoll();
  setupRealtimeSubscription();
  modal.classList.remove('hidden');
}

/**
 * Open Modal: Rincian Alarm Anti-Cheat & Opsi Reset / Ampuni Siswa
 */
function openStudentAlarmDetailModal(container, student, alarmsList = [], theme, onDone) {
  const alarmModal = container.querySelector('#modal-student-alarm-detail');
  if (!alarmModal) return;

  const nameEl = alarmModal.querySelector('#alarm-detail-student-name');
  const metaEl = alarmModal.querySelector('#alarm-detail-meta');
  const listEl = alarmModal.querySelector('#alarm-detail-logs-list');

  if (nameEl) nameEl.textContent = `${student.name || 'Siswa'} (${alarmsList.length}x ALARM)`;
  if (metaEl) metaEl.textContent = `Batch ${theme.liveBatchName} • Theme ${theme.code} (${theme.name})`;

  if (listEl) {
    if (alarmsList.length === 0) {
      listEl.innerHTML = `
        <div style="text-align:center; color:#34d399; padding:24px 10px; font-weight:700;">
          🛡️ Tidak ada catatan alarm integritas untuk siswa ini.
        </div>
      `;
    } else {
      listEl.innerHTML = alarmsList.map((item, idx) => {
        const timeStr = item.time 
          ? new Date(item.time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WITA' 
          : '-';
        return `
          <div style="background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.25); border-radius:8px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center; gap:10px;">
            <div>
              <div style="font-weight:700; color:#ffffff; font-size:0.85rem; display:flex; align-items:center; gap:6px;">
                <span style="color:#ef4444;">⚠️ Incident #${idx + 1}</span>
                <span style="font-size:0.75rem; color:#fca5a5;">(Strike ${item.strike || 1})</span>
              </div>
              <div style="font-size:0.78rem; color:#cbd5e1; margin-top:3px;">${escapeHtml(item.reason)}</div>
            </div>
            <div style="font-size:0.75rem; font-weight:700; color:#94a3b8; white-space:nowrap;">
              ${timeStr}
            </div>
          </div>
        `;
      }).join('');
    }
  }

  const closeAlarmModal = () => alarmModal.classList.add('hidden');
  alarmModal.querySelector('#btn-close-alarm-detail').onclick = closeAlarmModal;
  alarmModal.querySelector('#btn-dismiss-alarm-detail').onclick = closeAlarmModal;

  const resetBtn = alarmModal.querySelector('#btn-clear-student-alarms');
  if (resetBtn) {
    resetBtn.onclick = async () => {
      const testIds = [theme.wordsTest?.id, theme.phrasesTest?.id].filter(Boolean);
      if (!confirm(`Reset semua alarm anti-cheat untuk ${student.name}? Tindakan ini akan menganggap peringatan sebelumnya sebagai false alarm.`)) return;

      try {
        await resetStudentTestAlarms({ studentId: student.id, testIds });
        showToast(`✅ Seluruh alarm untuk ${student.name} berhasil di-reset.`, 'success');
        closeAlarmModal();
        if (onDone) onDone();
      } catch (err) {
        showToast('Gagal me-reset alarm: ' + err.message, 'error');
      }
    };
  }

  alarmModal.classList.remove('hidden');
}

/**
 * Open Modal: Konfirmasi Keluarkan Siswa (Kick Student)
 */
function openKickConfirmationModal(container, studentId, studentName, theme, onDone) {
  const kickModal = container.querySelector('#modal-kick-student-confirm');
  if (!kickModal) return;

  const nameEl = kickModal.querySelector('#kick-confirm-student-name');
  if (nameEl) {
    nameEl.textContent = `${studentName} • Theme ${theme.code} (${theme.name})`;
  }

  const cancelBtn = kickModal.querySelector('#btn-cancel-kick');
  const confirmBtn = kickModal.querySelector('#btn-confirm-kick');

  const closeKickModal = () => kickModal.classList.add('hidden');
  cancelBtn.onclick = closeKickModal;

  confirmBtn.onclick = async () => {
    const actionRadios = kickModal.querySelectorAll('input[name="kick_action"]');
    let chosenAction = 'submit';
    actionRadios.forEach(r => {
      if (r.checked) chosenAction = r.value;
    });

    closeKickModal();
    showLoading();
    try {
      const promises = [];
      if (theme.wordsTest) {
        promises.push(removeStudentFromTestSession({
          testId: theme.wordsTest.id,
          studentId: studentId,
          action: chosenAction
        }));
      }
      if (theme.phrasesTest) {
        promises.push(removeStudentFromTestSession({
          testId: theme.phrasesTest.id,
          studentId: studentId,
          action: chosenAction
        }));
      }

      await Promise.all(promises);

      const actionText = chosenAction === 'submit' ? 'Jawaban Dikumpulkan & Dinilai' : 'Ujian Dibatalkan (Skor 0)';
      showToast(`🚫 ${studentName} berhasil dikeluarkan dari sesi ujian (${actionText}).`, 'success');
      if (typeof onDone === 'function') {
        await onDone();
      }
    } catch (err) {
      console.error('Error kicking student:', err);
      showToast('Gagal mengeluarkan siswa: ' + err.message, 'error');
    } finally {
      hideLoading();
    }
  };

  kickModal.classList.remove('hidden');
}

/**
 * Smart Eligibility Engine:
 * Evaluates whether students meet prerequisite quizzes and prior exam status.
 */
function evaluateStudentsEligibility({ students, theme, themeTasks, themeQuizzes, wordsTest, phrasesTest, allAttempts = [], mode }) {
  const results = [];
  const activeQuizzes = themeQuizzes || themeTasks || theme?.quizzes || theme?.tasks || [];

  students.forEach(student => {
    const studAtts = (allAttempts || []).filter(a => a.student_id === student.id);

    // 1. Prerequisite quizzes check:
    let prereqMet = true;
    let completedQuizCount = 0;

    if (activeQuizzes.length > 0) {
      for (const quiz of activeQuizzes) {
        const quizAtts = studAtts.filter(a => (a.test_id || a.Test_id) === quiz.id);
        const passedAtt = quizAtts.find(a => {
          const st = String(a.status || '').toLowerCase();
          const isSub = ['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(st);
          const pct = parseFloat(a.percentage ?? 0);
          return isSub && pct >= 60;
        });

        if (passedAtt) {
          completedQuizCount++;
        } else {
          prereqMet = false;
        }
      }
    }

    // 2. Prior exam attempts on words & phrases:
    let wBestPct = null;
    let pBestPct = null;
    if (wordsTest) {
      const wAtts = studAtts.filter(a => (a.test_id || a.Test_id) === wordsTest.id);
      const subW = wAtts.filter(a => ['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(String(a.status || '').toLowerCase()));
      if (subW.length > 0) {
        wBestPct = Math.max(...subW.map(a => parseFloat(a.percentage ?? 0)));
      }
    }
    if (phrasesTest) {
      const pAtts = studAtts.filter(a => (a.test_id || a.Test_id) === phrasesTest.id);
      const subP = pAtts.filter(a => ['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(String(a.status || '').toLowerCase()));
      if (subP.length > 0) {
        pBestPct = Math.max(...subP.map(a => parseFloat(a.percentage ?? 0)));
      }
    }

    const hasTakenWords = wBestPct !== null;
    const hasTakenPhrases = pBestPct !== null;
    const wordsPassed = hasTakenWords && wBestPct >= 60;
    const phrasesPassed = hasTakenPhrases && pBestPct >= 60;
    const isAlreadyPassed = (hasTakenWords || hasTakenPhrases) && (wordsPassed && phrasesPassed);

    let avgScore = null;
    if (hasTakenWords && hasTakenPhrases) avgScore = Math.round((wBestPct + pBestPct) / 2);
    else if (hasTakenWords) avgScore = Math.round(wBestPct);
    else if (hasTakenPhrases) avgScore = Math.round(pBestPct);

    let isEligible = false;
    let statusLabel = '';
    let statusType = 'neutral';
    let reason = '';

    if (mode === 'normal') {
      // Normal Mode:
      // - Prereq must be met.
      // - If already passed: STILL eligible per user rule ("siapa tahu dia ingin mencoba lagi untuk nilai yang lebih baik").
      // - If prereq not met: NOT eligible unless tutor overrides.
      if (!prereqMet) {
        isEligible = false;
        statusType = 'danger';
        statusLabel = `⚠️ Incomplete Quizzes (${completedQuizCount}/${activeQuizzes.length})`;
        reason = `Incomplete prerequisite quizzes for Theme ${theme.code}.`;
      } else {
        isEligible = true;
        if (isAlreadyPassed) {
          statusType = 'success';
          statusLabel = `✓ Passed (${avgScore}%) • Score Improvement`;
          reason = `Passed with ${avgScore}%. Eligible to retake for higher score.`;
        } else {
          statusType = 'cyan';
          statusLabel = `✓ Quizzes Completed (Exam Ready)`;
          reason = `All ${activeQuizzes.length} prerequisite quizzes passed >= 60%.`;
        }
      }
    } else {
      // Remedial Mode:
      // - Must meet prerequisites first (all quizzes >= 60%).
      // - If prereq NOT met: NOT ELIGIBLE (must finish quizzes first).
      // - If already passed (>= 60%): NOT ELIGIBLE for remedial.
      // - Eligible ONLY if prereq met AND previous exam score < 60% (needs remedial).
      if (!prereqMet) {
        isEligible = false;
        statusType = 'danger';
        statusLabel = `⚠️ Incomplete Quizzes (${completedQuizCount}/${activeQuizzes.length})`;
        reason = `Prerequisite quizzes must be passed (≥60%) before taking remedial exam.`;
      } else if (isAlreadyPassed) {
        isEligible = false;
        statusType = 'warning';
        statusLabel = `Passed (${avgScore}%) — Remedial Ineligible`;
        reason = `Student already passed normal exam (>= 60%), ineligible for remedial.`;
      } else {
        isEligible = true;
        statusType = 'amber';
        if (avgScore !== null) {
          statusLabel = `🟡 Remedial (Previous Score: ${avgScore}%)`;
          reason = `Previous score ${avgScore}% (< 60%). Eligible for remedial exam.`;
        } else {
          statusLabel = `🟡 Remedial (Quizzes Completed)`;
          reason = `Prerequisites completed (≥60%), eligible for remedial/makeup exam.`;
        }
      }
    }

    results.push({
      student,
      isEligible,
      statusLabel,
      statusType,
      reason,
      avgScore,
      completedQuizCount,
      completedTaskCount: completedQuizCount,
      totalQuizzes: activeQuizzes.length,
      totalTasks: activeQuizzes.length,
      prereqMet,
      isAlreadyPassed,
      wordsPassed,
      phrasesPassed,
      hasTakenWords,
      hasTakenPhrases,
      wBestPct,
      pBestPct
    });
  });

  return results;
}
