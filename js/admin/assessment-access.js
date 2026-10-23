/**
 * TopsCore — Assessment Access & Live Test Sessions Controller
 * Dedicated panel under Domain C (Class) for controlling formal Tests across all classes.
 * Features:
 * - Filtered strictly to assessments of category 'TEST'.
 * - Live Session Controller: manual/timed opening with dynamic countdown allocation.
 * - Active Batch filter (only active enrolled batches).
 * - Attendance checklist (Select All + per-student exclusion) to prevent remote access by absentees.
 */

import {
  adminFetchAll,
  openTestSession,
  addLateStudentsToSession,
  closeTestSession,
  fetchActiveTestSession
} from '../api.js?v=5.3.2';
import { showToast, showLoading, hideLoading, escapeHtml, escHtml } from '../app.js?v=5.3.2';

let _cachedAssessments = [];
let _cachedClasses = [];
let _cachedLevels = [];
let _cachedBatches = [];
let _cachedStudents = [];
let _cachedPrograms = [];
let _activeSessionModalAsm = null;
let _activeLateModalAsm = null;

export async function renderAssessmentAccess(area) {
  showLoading();
  try {
    const [rawAssessments, classes, levels, batches, students, programs] = await Promise.all([
      adminFetchAll('assessments'),
      adminFetchAll('classes', 'id, name, program_id, level_id').catch(() => []),
      adminFetchAll('levels', 'id, name, level_number').catch(() => []),
      adminFetchAll('batches', 'id, name, program_id, current_level_id, is_active, deleted_at').catch(() => []),
      adminFetchAll('students', 'id, name, batch_id, is_active, deleted_at').catch(() => []),
      adminFetchAll('programs', 'id, name, institution_id').catch(() => [])
    ]);

    _cachedAssessments = rawAssessments || [];
    _cachedClasses = classes || [];
    _cachedLevels = levels || [];
    _cachedBatches = batches || [];
    _cachedStudents = students || [];
    _cachedPrograms = programs || [];

    const classMap = Object.fromEntries(_cachedClasses.map(c => [c.id, c]));
    const levelMap = Object.fromEntries(_cachedLevels.map(l => [l.id, l]));
    const batchMap = Object.fromEntries(_cachedBatches.map(b => [b.id, b]));
    const programMap = Object.fromEntries(_cachedPrograms.map(p => [p.id, p]));

    // Filter only tests across all classes and sort alphabetically by default
    const tests = _cachedAssessments.filter(a => {
      if (a.deleted_at) return false;
      const cat = (a.assessment_category || '').toUpperCase();
      const type = (a.assessment_type || '').toUpperCase();
      const title = (a.title || '').toUpperCase();
      return cat === 'TEST' || type.includes('TEST') || title.includes('TEST');
    });

    tests.sort((a, b) => (a.title || '').localeCompare(b.title || '', undefined, { numeric: true, sensitivity: 'base' }));

    // Check live session status for each test
    const now = new Date();
    tests.forEach(t => {
      const sess = t.payload?.test_session;
      if (sess && sess.status === 'UNLOCKED') {
        const autoClose = sess.auto_close_at ? new Date(sess.auto_close_at) : null;
        if (autoClose && autoClose.getTime() > now.getTime()) {
          t._isLive = true;
          const remainingMs = autoClose.getTime() - now.getTime();
          t._remainingMinutes = Math.ceil(remainingMs / 60000);
          t._batchName = batchMap[sess.batch_id]?.name || 'Batch ' + (sess.batch_id || '');
          t._allowedCount = Array.isArray(sess.allowed_student_ids) ? sess.allowed_student_ids.length : 0;
          t._isRemedial = Boolean(sess.is_remedial);
          t._autoCloseAt = sess.auto_close_at;
          t._allowedStudentIds = sess.allowed_student_ids || [];
          t._remedialStudentIds = sess.remedial_student_ids || [];
        } else {
          t._isLive = false;
        }
      } else {
        t._isLive = false;
      }
    });

    const liveCount = tests.filter(t => t._isLive).length;
    const lockedCount = tests.length - liveCount;

    area.innerHTML = `
      <div class="section-header d-flex justify-between align-center flex-wrap gap-3 mb-4">
        <div>
          <h2 class="section-title text-gradient" style="display:flex; align-items:center; gap:8px;">
            <span>🔐</span> Assessment Access & Live Test Sessions
          </h2>
          <p class="section-subtitle">
            Dedicated control room for all Tests across all classes. Unlock live testing sessions with dynamic duration and student attendance whitelists.
          </p>
        </div>
        <div class="d-flex gap-2 align-center">
          <button class="btn btn-secondary btn-sm" id="btn-refresh-access">🔄 Refresh Status</button>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:16px; margin-bottom:24px;">
        <div class="card p-3" style="background:var(--fm-bg-panel); border:1px solid var(--fm-border-subtle); border-radius:8px;">
          <div class="text-xs text-muted" style="text-transform:uppercase; letter-spacing:0.05em; font-weight:600;">Total Tests</div>
          <div style="font-size:2rem; font-weight:800; color:var(--fm-text-primary); margin-top:4px;">${tests.length}</div>
          <div class="text-xs text-muted" style="margin-top:2px;">Across all curriculum classes</div>
        </div>

        <div class="card p-3" style="background:var(--fm-bg-panel); border:1px solid ${liveCount > 0 ? 'var(--fm-accent-pitch)' : 'var(--fm-border-subtle)'}; border-radius:8px;">
          <div class="text-xs text-muted" style="text-transform:uppercase; letter-spacing:0.05em; font-weight:600; color:${liveCount > 0 ? '#10b981' : ''};">
            🟢 Active / Unlocked Sessions
          </div>
          <div style="font-size:2rem; font-weight:800; color:${liveCount > 0 ? '#10b981' : 'var(--fm-text-primary)'}; margin-top:4px;">
            ${liveCount}
          </div>
          <div class="text-xs text-muted" style="margin-top:2px;">Currently accessible to whitelisted students</div>
        </div>

        <div class="card p-3" style="background:var(--fm-bg-panel); border:1px solid var(--fm-border-subtle); border-radius:8px;">
          <div class="text-xs text-muted" style="text-transform:uppercase; letter-spacing:0.05em; font-weight:600;">🔒 Locked / Inactive Tests</div>
          <div style="font-size:2rem; font-weight:800; color:var(--fm-accent-amber); margin-top:4px;">${lockedCount}</div>
          <div class="text-xs text-muted" style="margin-top:2px;">Waiting for tutor unlock</div>
        </div>
      </div>

      <!-- Tests Grid / Table -->
      <div class="card" style="background:var(--fm-bg-panel); border:1px solid var(--fm-border-subtle); border-radius:8px; overflow:hidden;">
        <div style="padding:16px 20px; border-bottom:1px solid var(--fm-border-subtle); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div style="font-weight:700; font-size:1.1rem; color:var(--fm-text-primary);">All Test Assessments</div>
          <div style="display:flex; align-items:center; gap:8px;">
            <select id="access-sort-select" class="form-control" style="font-size:0.85rem; padding:6px 10px; background:var(--fm-bg-input); border:1px solid var(--fm-border-subtle); color:var(--fm-text-primary); border-radius:6px; cursor:pointer;">
              <option value="title-asc">🔤 Sort: Title (A → Z)</option>
              <option value="title-desc">🔤 Sort: Title (Z → A)</option>
              <option value="class-asc">📚 Sort: Class Name (A → Z)</option>
              <option value="live-first">🟢 Sort: Active Sessions First</option>
            </select>
            <input type="text" id="access-search-input" placeholder="Search test name or class..." class="form-control" style="max-width:220px; font-size:0.85rem; padding:6px 12px; background:var(--fm-bg-input); border:1px solid var(--fm-border-subtle); color:var(--fm-text-primary); border-radius:6px;">
          </div>
        </div>

        <div style="overflow-x:auto;">
          <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.9rem;" id="access-tests-table">
            <thead>
              <tr style="background:rgba(255,255,255,0.02); border-bottom:1px solid var(--fm-border-subtle); color:var(--fm-text-secondary); font-size:0.8rem; text-transform:uppercase; letter-spacing:0.05em;">
                <th style="padding:12px 16px; cursor:pointer; user-select:none;" class="th-sortable" data-sort="title" title="Click to toggle Title A-Z / Z-A">
                  Test Assessment Title <span class="sort-icon-title" style="opacity:0.6; font-size:0.75rem;">↕</span>
                </th>
                <th style="padding:12px 16px; cursor:pointer; user-select:none;" class="th-sortable" data-sort="class" title="Click to sort by Class Name">
                  Class & Level <span class="sort-icon-class" style="opacity:0.6; font-size:0.75rem;">↕</span>
                </th>
                <th style="padding:12px 16px;">Publication</th>
                <th style="padding:12px 16px; cursor:pointer; user-select:none;" class="th-sortable" data-sort="live" title="Click to sort by Live Sessions First">
                  Session State <span class="sort-icon-live" style="opacity:0.6; font-size:0.75rem;">↕</span>
                </th>
                <th style="padding:12px 16px; text-align:right;">Control Action</th>
              </tr>
            </thead>
            <tbody id="access-tests-tbody">
              ${renderTestRows(tests, classMap, levelMap)}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Test Session Controller Modal -->
      <div id="modal-test-session-controller" class="modal-backdrop hidden" style="position:fixed; inset:0; background:rgba(0,0,0,0.75); display:flex; align-items:center; justify-content:center; z-index:9999; padding:16px;">
        <div class="modal-box card" style="background:var(--fm-bg-panel); border:1px solid var(--fm-border-medium); border-radius:12px; width:100%; max-width:540px; max-height:90vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 20px 40px rgba(0,0,0,0.6);">
          <div style="padding:20px; border-bottom:1px solid var(--fm-border-subtle); display:flex; justify-content:between; align-items:flex-start;">
            <div>
              <div style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.08em; color:var(--fm-accent-tactical); font-weight:700;">Live Session Controller</div>
              <h3 id="session-modal-test-title" style="margin:4px 0 0; font-size:1.25rem; font-weight:800; color:var(--fm-text-primary);">Test Name</h3>
              <div id="session-modal-test-meta" class="text-xs text-muted" style="margin-top:2px;">Class | Level</div>
            </div>
            <button class="btn btn-ghost btn-icon" id="btn-close-session-modal" style="color:var(--fm-text-secondary); font-size:1.25rem;">✕</button>
          </div>

          <div style="padding:20px; overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:16px;">
            <!-- Batch Selection -->
            <div>
              <label class="form-label" style="font-weight:600; font-size:0.85rem; color:var(--fm-text-primary); margin-bottom:6px; display:block;">
                1. Target Active Batch
              </label>
              <select id="session-batch-select" class="form-control" style="width:100%; background:var(--fm-bg-input); border:1px solid var(--fm-border-subtle); color:var(--fm-text-primary); padding:8px 12px; border-radius:6px;">
                <option value="">Select active batch...</option>
              </select>
            </div>

            <!-- Allocated Duration -->
            <div>
              <label class="form-label" style="font-weight:600; font-size:0.85rem; color:var(--fm-text-primary); margin-bottom:6px; display:block;">
                2. Allocated Test Duration (Minutes)
              </label>
              <div style="display:flex; align-items:center; gap:8px;">
                <input type="number" id="session-duration-input" class="form-control" value="30" min="5" max="180" step="5" style="width:110px; background:var(--fm-bg-input); border:1px solid var(--fm-border-subtle); color:var(--fm-text-primary); padding:8px 12px; border-radius:6px; font-weight:700; font-size:1rem;">
                <span class="text-sm text-muted">Minutes (Student countdown dynamically synchronizes to this duration)</span>
              </div>
            </div>

            <!-- Session Type: Normal vs Remedial -->
            <div>
              <label class="form-label" style="font-weight:600; font-size:0.85rem; color:var(--fm-text-primary); margin-bottom:6px; display:block;">
                3. Tipe Sesi Ujian
              </label>
              <div style="display:flex; gap:16px; align-items:center; background:rgba(255,255,255,0.02); padding:10px 12px; border-radius:6px; border:1px solid var(--fm-border-subtle); flex-wrap:wrap;">
                <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:0.85rem; color:var(--fm-text-primary);">
                  <input type="radio" name="session-mode" value="normal" checked style="cursor:pointer;">
                  <span>🟢 Normal (Nilai Penuh)</span>
                </label>
                <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:0.85rem; color:#fbbf24; font-weight:600;">
                  <input type="radio" name="session-mode" value="remedial" style="cursor:pointer;">
                  <span>🟡 Remedial (Batas Maksimal KKM 60%)</span>
                </label>
              </div>
              <div class="text-xs text-muted" style="margin-top:4px;">
                Jika Remedial dipilih, nilai efektif siswa pada sesi ini otomatis dibatasi maksimal KKM 60% (Grade B).
              </div>
            </div>

            <!-- Student Attendance Checklist -->
            <div>
              <div style="display:flex; justify-content:between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:8px;">
                <label class="form-label" style="font-weight:600; font-size:0.85rem; color:var(--fm-text-primary); margin:0;">
                  4. Student Presence & Attendance Whitelist (<span id="session-student-count">0</span>)
                </label>
                <div class="d-flex gap-2 align-center" style="flex-wrap:wrap;">
                  <input type="text" id="session-student-search" placeholder="🔍 Filter student..." class="form-control" style="font-size:0.75rem; padding:3px 8px; width:110px; background:var(--fm-bg-input); border:1px solid var(--fm-border-subtle); color:var(--fm-text-primary); border-radius:4px;">
                  <button type="button" class="btn btn-secondary btn-xs" id="btn-sort-students" title="Click to toggle alphabetical sort A-Z / Z-A" style="padding:4px 8px; font-size:0.75rem; display:inline-flex; align-items:center; gap:4px; font-weight:600;">
                    <span id="sort-students-icon">🔤</span> <span id="sort-students-text">A → Z</span>
                  </button>
                  <button type="button" class="btn btn-secondary btn-xs" id="btn-select-all-students" style="padding:4px 8px; font-size:0.75rem;">✅ All</button>
                  <button type="button" class="btn btn-secondary btn-xs" id="btn-deselect-all-students" style="padding:4px 8px; font-size:0.75rem;">❌ None</button>
                </div>
              </div>
              <div class="text-xs text-muted" style="margin-bottom:8px;">
                Only checked students in the physical room will have access. Uncheck students who are absent.
              </div>

              <div id="session-students-list" style="max-height:180px; overflow-y:auto; border:1px solid var(--fm-border-subtle); border-radius:6px; background:rgba(0,0,0,0.2); padding:8px; display:flex; flex-direction:column; gap:6px;">
                <div class="text-xs text-muted p-2 text-center">Please select a batch above to load enrolled students.</div>
              </div>
            </div>
          </div>

          <div style="padding:16px 20px; border-top:1px solid var(--fm-border-subtle); display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.15);">
            <button class="btn btn-ghost" id="btn-cancel-session-modal">Cancel</button>
            <button class="btn btn-primary" id="btn-confirm-open-session" style="background:#10b981; border-color:#059669; font-weight:700; padding:8px 18px; display:flex; align-items:center; gap:6px;">
              <span>🔓</span> Unlock Test Now
            </button>
          </div>
        </div>
      </div>

      <!-- Modal Tambah Siswa Susulan / Remedial ke Sesi Berjalan -->
      <div id="modal-add-late-student" class="modal-backdrop hidden" style="position:fixed; inset:0; background:rgba(0,0,0,0.75); display:flex; align-items:center; justify-content:center; z-index:9999; padding:16px;">
        <div class="modal-box card" style="background:var(--fm-bg-panel); border:1px solid var(--fm-border-medium); border-radius:12px; width:100%; max-width:560px; max-height:90vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 20px 40px rgba(0,0,0,0.6);">
          <div style="padding:20px; border-bottom:1px solid var(--fm-border-subtle); display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <div style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.08em; color:#a5b4fc; font-weight:700;">👥 Sesi Ujian Berjalan</div>
              <h3 id="late-modal-test-title" style="margin:4px 0 0; font-size:1.2rem; font-weight:800; color:var(--fm-text-primary);">Test Name</h3>
              <div id="late-modal-meta" class="text-xs text-muted" style="margin-top:2px;">Batch Name</div>
            </div>
            <button class="btn btn-ghost btn-icon" id="btn-close-late-modal" style="color:var(--fm-text-secondary); font-size:1.25rem;">✕</button>
          </div>

          <div style="padding:20px; overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:16px;">
            <!-- Live Global Countdown Notice -->
            <div style="background:rgba(99, 102, 241, 0.12); border:1px solid rgba(99, 102, 241, 0.35); border-radius:8px; padding:12px 14px;">
              <div style="font-size:0.85rem; font-weight:700; color:#a5b4fc; display:flex; align-items:center; gap:6px;">
                <span>⏳ Sisa Waktu Sesi Global:</span>
                <span id="late-modal-remaining" style="color:#ffffff; font-size:1rem; font-weight:800;">-- Menit</span>
              </div>
              <div class="text-xs" style="color:#cbd5e1; margin-top:4px; line-height:1.4;">
                Waktu pengerjaan siswa susulan <strong>mengacu pada sisa waktu berjalan ini</strong>. Waktu tidak bertambah/tidak di-reset agar adil bagi siswa yang masuk tepat waktu.
              </div>
            </div>

            <!-- Student Selection List -->
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:8px;">
                <label class="form-label" style="font-weight:600; font-size:0.85rem; color:var(--fm-text-primary); margin:0;">
                  Pilih Siswa Susulan (<span id="late-student-selected-count">0</span> terpilih)
                </label>
                <div class="d-flex gap-2 align-center">
                  <input type="text" id="late-student-search" placeholder="🔍 Cari nama..." class="form-control" style="font-size:0.75rem; padding:3px 8px; width:120px; background:var(--fm-bg-input); border:1px solid var(--fm-border-subtle); color:var(--fm-text-primary); border-radius:4px;">
                  <button type="button" class="btn btn-secondary btn-xs" id="btn-late-select-all" style="padding:4px 8px; font-size:0.75rem;">✅ Semua</button>
                  <button type="button" class="btn btn-secondary btn-xs" id="btn-late-deselect-all" style="padding:4px 8px; font-size:0.75rem;">❌ Kosong</button>
                </div>
              </div>

              <!-- Remedial Global Checkbox -->
              <div style="background:rgba(245, 158, 11, 0.08); border:1px solid rgba(245, 158, 11, 0.25); border-radius:6px; padding:8px 10px; margin-bottom:8px; display:flex; align-items:center; gap:8px;">
                <input type="checkbox" id="late-all-remedial-toggle" style="width:16px; height:16px; cursor:pointer;">
                <label for="late-all-remedial-toggle" style="font-size:0.8rem; font-weight:600; color:#fbbf24; cursor:pointer; margin:0;">
                  Tandai siswa yang ditambahkan sebagai REMEDIAL (Batas Maksimal KKM 60%)
                </label>
              </div>

              <div id="late-students-list" style="max-height:220px; overflow-y:auto; border:1px solid var(--fm-border-subtle); border-radius:6px; background:rgba(0,0,0,0.2); padding:8px; display:flex; flex-direction:column; gap:6px;">
                <!-- Populated dynamically -->
              </div>
            </div>
          </div>

          <div style="padding:16px 20px; border-top:1px solid var(--fm-border-subtle); display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.15);">
            <button class="btn btn-ghost" id="btn-cancel-late-modal">Batal</button>
            <button class="btn btn-primary" id="btn-confirm-add-late" style="background:#6366f1; border-color:#4f46e5; font-weight:700; padding:8px 18px; display:flex; align-items:center; gap:6px;">
              <span>💾</span> Tambahkan Siswa ke Sesi
            </button>
          </div>
        </div>
      </div>
    `;

    bindAccessEvents(area, tests, classMap, levelMap, batchMap, programMap);
  } catch (err) {
    console.error('Error rendering Assessment Access:', err);
    area.innerHTML = `
      <div class="glass-panel text-center p-5 mx-auto" style="max-width:500px; margin-top:5vh;">
        <h3 class="text-danger mb-2">Failed to load Assessment Access</h3>
        <p class="text-muted text-sm">${escapeHtml(err.message)}</p>
        <button class="btn btn-primary btn-sm mt-3" onclick="window.loadSection('assessment-access')">Retry</button>
      </div>
    `;
  } finally {
    hideLoading();
  }
}

function renderTestRows(tests, classMap, levelMap) {
  if (!tests || tests.length === 0) {
    return `<tr><td colspan="5" class="text-center text-muted" style="padding:32px;">No tests found in curriculum.</td></tr>`;
  }

  return tests.map(t => {
    const targetClass = classMap[t.class_id];
    const effLevelId = t.level_id || targetClass?.level_id;
    const cls = targetClass?.name || 'All Classes';
    const lvl = levelMap[effLevelId]?.name ? (String(levelMap[effLevelId].name).toLowerCase().includes('level') ? levelMap[effLevelId].name : `Level ${levelMap[effLevelId].name}`) : 'Level 1';
    const isPub = (t.status || '').toUpperCase() === 'PUBLISHED';

    let stateBadge = '';
    if (t._isLive) {
      stateBadge = `
        <span style="display:inline-flex; align-items:center; gap:6px; background:rgba(16, 185, 129, 0.15); border:1px solid rgba(16, 185, 129, 0.4); color:#34d399; padding:4px 8px; border-radius:6px; font-weight:700; font-size:0.8rem; flex-wrap:wrap;">
          <span style="width:8px; height:8px; border-radius:50%; background:#10b981; box-shadow:0 0 8px #10b981; animation:pulse 1.5s infinite;"></span>
          LIVE (${t._remainingMinutes}m left) &bull; ${escapeHtml(t._batchName)} (${t._allowedCount} students)
          ${t._isRemedial ? '<span style="margin-left:4px; padding:1px 6px; background:rgba(245,158,11,0.2); border:1px solid #f59e0b; color:#fbbf24; border-radius:4px; font-size:0.7rem;">REMIDIAL (KKM 60%)</span>' : ''}
        </span>
      `;
    } else {
      stateBadge = `
        <span style="display:inline-flex; align-items:center; gap:4px; background:rgba(245, 158, 11, 0.1); border:1px solid rgba(245, 158, 11, 0.3); color:#fbbf24; padding:4px 8px; border-radius:6px; font-weight:600; font-size:0.8rem;">
          🔒 LOCKED
        </span>
      `;
    }

    let actionBtn = '';
    if (t._isLive) {
      actionBtn = `
        <div style="display:flex; gap:6px; justify-content:flex-end; align-items:center; flex-wrap:wrap;">
          <button class="btn btn-secondary btn-xs btn-add-late-modal" data-id="${t.id}" style="font-weight:600; padding:6px 10px; background:rgba(99, 102, 241, 0.2); border:1px solid #6366f1; color:#a5b4fc;" title="Tambah Siswa Susulan / Remedial ke Sesi Berjalan">
            👥 + Susulan / Remidi
          </button>
          <button class="btn btn-danger btn-xs btn-lock-session" data-id="${t.id}" style="background:#ef4444; border-color:#dc2626; color:#ffffff; font-weight:600; padding:6px 12px;">
            🔒 Close Session
          </button>
        </div>
      `;
    } else {
      actionBtn = `
        <button class="btn btn-primary btn-xs btn-open-session-modal" data-id="${t.id}" style="font-weight:600; padding:6px 12px; background:var(--fm-accent-tactical);">
          🎮 Manage & Unlock
        </button>
      `;
    }

    return `
      <tr style="border-bottom:1px solid var(--fm-border-subtle); transition:background 0.15s;" onmouseover="this.style.background='var(--fm-bg-hover)'" onmouseout="this.style.background='transparent'">
        <td style="padding:14px 16px; font-weight:700; color:var(--fm-text-primary);">
          ${escapeHtml(t.title || 'Untitled Test')}
          ${t.payload?.is_unified || t.assessment_type === 'UNIFIED_TEST' ? '<span style="font-size:0.7rem; margin-left:6px; padding:2px 6px; background:#6366f1; color:#fff; border-radius:4px; font-weight:700;">UNIFIED</span>' : ''}
        </td>
        <td style="padding:14px 16px; color:var(--fm-text-secondary); font-size:0.85rem;">
          ${escapeHtml(cls)} &bull; ${escapeHtml(lvl)}
        </td>
        <td style="padding:14px 16px;">
          <span style="font-size:0.75rem; padding:3px 8px; border-radius:4px; font-weight:700; ${isPub ? 'background:rgba(52, 211, 153, 0.15); color:#34d399;' : 'background:rgba(251, 191, 36, 0.15); color:#fbbf24;'}">
            ${isPub ? 'PUBLISHED' : 'DRAFT'}
          </span>
        </td>
        <td style="padding:14px 16px;">
          ${stateBadge}
        </td>
        <td style="padding:14px 16px; text-align:right;">
          ${actionBtn}
        </td>
      </tr>
    `;
  }).join('');
}

function bindAccessEvents(area, tests, classMap, levelMap, batchMap, programMap) {
  // --- 1. Tests Table Sorting & Search ---
  const searchInput = area.querySelector('#access-search-input');
  const sortSelect = area.querySelector('#access-sort-select');
  const tbody = area.querySelector('#access-tests-tbody');
  let currentSort = 'title-asc';
  let searchQuery = '';

  function getSortedAndFiltered() {
    let result = tests.filter(t => {
      if (!searchQuery) return true;
      const title = (t.title || '').toLowerCase();
      const cls = (classMap[t.class_id]?.name || '').toLowerCase();
      return title.includes(searchQuery) || cls.includes(searchQuery);
    });

    result.sort((a, b) => {
      if (currentSort === 'title-asc') {
        return (a.title || '').localeCompare(b.title || '', undefined, { numeric: true, sensitivity: 'base' });
      }
      if (currentSort === 'title-desc') {
        return (b.title || '').localeCompare(a.title || '', undefined, { numeric: true, sensitivity: 'base' });
      }
      if (currentSort === 'class-asc') {
        const cA = classMap[a.class_id]?.name || '';
        const cB = classMap[b.class_id]?.name || '';
        const cmp = cA.localeCompare(cB, undefined, { numeric: true, sensitivity: 'base' });
        return cmp !== 0 ? cmp : (a.title || '').localeCompare(b.title || '', undefined, { numeric: true, sensitivity: 'base' });
      }
      if (currentSort === 'live-first') {
        const aLive = a._isLive ? 1 : 0;
        const bLive = b._isLive ? 1 : 0;
        if (aLive !== bLive) return bLive - aLive;
        return (a.title || '').localeCompare(b.title || '', undefined, { numeric: true, sensitivity: 'base' });
      }
      return 0;
    });

    return result;
  }

  function updateTable() {
    if (!tbody) return;
    tbody.innerHTML = renderTestRows(getSortedAndFiltered(), classMap, levelMap);
    bindRowActions();
  }

  searchInput?.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    updateTable();
  });

  sortSelect?.addEventListener('change', (e) => {
    currentSort = e.target.value;
    updateTable();
  });

  // Clickable sortable table headers
  area.querySelectorAll('.th-sortable').forEach(th => {
    th.addEventListener('click', () => {
      const sortType = th.getAttribute('data-sort');
      if (sortType === 'title') {
        currentSort = (currentSort === 'title-asc') ? 'title-desc' : 'title-asc';
      } else if (sortType === 'class') {
        currentSort = (currentSort === 'class-asc') ? 'title-asc' : 'class-asc';
      } else if (sortType === 'live') {
        currentSort = (currentSort === 'live-first') ? 'title-asc' : 'live-first';
      }
      if (sortSelect) sortSelect.value = currentSort;
      updateTable();
    });
  });

  // Refresh status button
  area.querySelector('#btn-refresh-access')?.addEventListener('click', () => {
    renderAssessmentAccess(area);
  });

  // --- 2. Live Session Controller Modal ---
  const modal = area.querySelector('#modal-test-session-controller');
  const btnCloseModal = area.querySelector('#btn-close-session-modal');
  const btnCancelModal = area.querySelector('#btn-cancel-session-modal');
  const batchSelect = area.querySelector('#session-batch-select');
  const studentsListEl = area.querySelector('#session-students-list');
  const studentCountEl = area.querySelector('#session-student-count');
  const durationInput = area.querySelector('#session-duration-input');
  const btnSelectAll = area.querySelector('#btn-select-all-students');
  const btnDeselectAll = area.querySelector('#btn-deselect-all-students');
  const btnConfirmOpen = area.querySelector('#btn-confirm-open-session');
  const btnSortStudents = area.querySelector('#btn-sort-students');
  const sortStudentsText = area.querySelector('#sort-students-text');
  const searchStudentInput = area.querySelector('#session-student-search');

  let _whitelistSortOrder = 'asc'; // 'asc' = A-Z, 'desc' = Z-A
  let _currentBatchStudents = [];
  let _checkedStudentIds = new Set();
  let _whitelistSearchQuery = '';

  const renderStudentWhitelist = () => {
    if (!studentsListEl) return;
    if (_currentBatchStudents.length === 0) {
      studentsListEl.innerHTML = `<div class="text-xs text-muted p-2 text-center">Please select a batch above to load enrolled students.</div>`;
      if (studentCountEl) studentCountEl.textContent = '0';
      return;
    }

    // Filter by search query if any
    let list = _currentBatchStudents;
    const q = _whitelistSearchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(s => (s.name || '').toLowerCase().includes(q));
    }

    // Sort alphabetically by name
    list = [...list].sort((a, b) => {
      const nameA = (a.name || '').trim();
      const nameB = (b.name || '').trim();
      const cmp = nameA.localeCompare(nameB, undefined, { sensitivity: 'base', numeric: true });
      return _whitelistSortOrder === 'asc' ? cmp : -cmp;
    });

    if (studentCountEl) {
      studentCountEl.textContent = String(_checkedStudentIds.size);
    }

    if (list.length === 0) {
      studentsListEl.innerHTML = `<div class="text-xs text-muted p-2 text-center">No students matching "${escapeHtml(q)}".</div>`;
      return;
    }

    studentsListEl.innerHTML = list.map(s => {
      const isChecked = _checkedStudentIds.has(s.id);
      return `
      <label style="display:flex; align-items:center; gap:10px; padding:6px 8px; border-radius:4px; background:rgba(255,255,255,0.03); cursor:pointer;">
        <input type="checkbox" class="session-student-checkbox" value="${s.id}" ${isChecked ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;">
        <span style="width:24px; height:24px; border-radius:50%; background:var(--fm-accent-tactical); color:#fff; display:flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:700;">
          ${(s.name || 'S').charAt(0).toUpperCase()}
        </span>
        <span style="font-size:0.85rem; font-weight:600; color:var(--fm-text-primary);">${escapeHtml(s.name || 'Unnamed')}</span>
      </label>
    `;
    }).join('');
  };

  // Checkbox state tracking
  studentsListEl?.addEventListener('change', (e) => {
    if (e.target.classList.contains('session-student-checkbox')) {
      if (e.target.checked) {
        _checkedStudentIds.add(e.target.value);
      } else {
        _checkedStudentIds.delete(e.target.value);
      }
      if (studentCountEl) {
        studentCountEl.textContent = String(_checkedStudentIds.size);
      }
    }
  });

  // Alphabetical sort toggle A-Z <-> Z-A
  btnSortStudents?.addEventListener('click', () => {
    _whitelistSortOrder = _whitelistSortOrder === 'asc' ? 'desc' : 'asc';
    if (sortStudentsText) {
      sortStudentsText.textContent = _whitelistSortOrder === 'asc' ? 'A → Z' : 'Z → A';
    }
    renderStudentWhitelist();
  });

  // Instant student search filter
  searchStudentInput?.addEventListener('input', (e) => {
    _whitelistSearchQuery = e.target.value;
    renderStudentWhitelist();
  });

  const closeModal = () => {
    modal.classList.add('hidden');
    _activeSessionModalAsm = null;
  };

  btnCloseModal?.addEventListener('click', closeModal);
  btnCancelModal?.addEventListener('click', closeModal);

  // Populate students when batch changes
  batchSelect?.addEventListener('change', () => {
    const selectedBatchId = batchSelect.value;
    if (!selectedBatchId) {
      _currentBatchStudents = [];
      _checkedStudentIds.clear();
      renderStudentWhitelist();
      return;
    }

    _currentBatchStudents = _cachedStudents.filter(s => s.batch_id === selectedBatchId && !s.deleted_at && s.is_active !== false);

    const allowedList = _activeSessionModalAsm?.payload?.test_session?.allowed_student_ids;
    const allowedSet = (Array.isArray(allowedList) && allowedList.length > 0) ? new Set(allowedList) : null;

    _checkedStudentIds = new Set();
    _currentBatchStudents.forEach(s => {
      if (!allowedSet || allowedSet.has(s.id)) {
        _checkedStudentIds.add(s.id);
      }
    });

    renderStudentWhitelist();
  });

  // Select all / deselect all
  btnSelectAll?.addEventListener('click', () => {
    const visibleBoxes = studentsListEl.querySelectorAll('.session-student-checkbox');
    visibleBoxes.forEach(cb => {
      cb.checked = true;
      _checkedStudentIds.add(cb.value);
    });
    if (!_whitelistSearchQuery.trim()) {
      _currentBatchStudents.forEach(s => _checkedStudentIds.add(s.id));
    }
    if (studentCountEl) studentCountEl.textContent = String(_checkedStudentIds.size);
  });

  btnDeselectAll?.addEventListener('click', () => {
    const visibleBoxes = studentsListEl.querySelectorAll('.session-student-checkbox');
    visibleBoxes.forEach(cb => {
      cb.checked = false;
      _checkedStudentIds.delete(cb.value);
    });
    if (!_whitelistSearchQuery.trim()) {
      _checkedStudentIds.clear();
    }
    if (studentCountEl) studentCountEl.textContent = String(_checkedStudentIds.size);
  });

  // Confirm Unlock Test
  btnConfirmOpen?.addEventListener('click', async () => {
    if (!_activeSessionModalAsm) return;
    const batchId = batchSelect.value;
    if (!batchId) {
      showToast('Please select a target batch first.', 'error');
      return;
    }

    const allocatedMinutes = parseInt(durationInput.value, 10) || 30;
    const allowedStudentIds = Array.from(_checkedStudentIds);
    const isRemedial = area.querySelector('input[name="session-mode"]:checked')?.value === 'remedial';

    if (allowedStudentIds.length === 0) {
      showToast('Please select at least 1 student to allow access.', 'error');
      return;
    }

    showLoading();
    try {
      await openTestSession({
        assessmentId: _activeSessionModalAsm.id,
        batchId: batchId,
        allocatedMinutes: allocatedMinutes,
        allowedStudentIds: allowedStudentIds,
        isRemedial: isRemedial,
        remedialStudentIds: isRemedial ? allowedStudentIds : []
      });
      showToast(`🔓 Live test unlocked for ${allocatedMinutes} minutes (${allowedStudentIds.length} students)${isRemedial ? ' [REMEDIAL MODE]' : ''}`, 'success');
      closeModal();
      renderAssessmentAccess(area);
    } catch (err) {
      console.error('Failed to open test session:', err);
      showToast('Failed to unlock session: ' + err.message, 'error');
    } finally {
      hideLoading();
    }
  });

  // --- 3. Live Sesi Tambah Siswa Susulan / Remedial Modal ---
  const modalLate = area.querySelector('#modal-add-late-student');
  const btnCloseLate = area.querySelector('#btn-close-late-modal');
  const btnCancelLate = area.querySelector('#btn-cancel-late-modal');
  const lateListEl = area.querySelector('#late-students-list');
  const lateCountEl = area.querySelector('#late-student-selected-count');
  const lateSearchInput = area.querySelector('#late-student-search');
  const btnLateSelectAll = area.querySelector('#btn-late-select-all');
  const btnLateDeselectAll = area.querySelector('#btn-late-deselect-all');
  const lateAllRemedialToggle = area.querySelector('#late-all-remedial-toggle');
  const btnConfirmAddLate = area.querySelector('#btn-confirm-add-late');

  let _currentLateBatchStudents = [];
  let _checkedLateStudentIds = new Set();
  let _remedialLateStudentIds = new Set();
  let _lateSearchQuery = '';

  const closeLateModal = () => {
    modalLate?.classList.add('hidden');
    _activeLateModalAsm = null;
    _checkedLateStudentIds.clear();
    _remedialLateStudentIds.clear();
  };

  btnCloseLate?.addEventListener('click', closeLateModal);
  btnCancelLate?.addEventListener('click', closeLateModal);

  const renderLateStudentList = () => {
    if (!lateListEl) return;
    if (_currentLateBatchStudents.length === 0) {
      lateListEl.innerHTML = `<div class="text-xs text-muted p-2 text-center">Tidak ada data siswa dalam batch ini.</div>`;
      if (lateCountEl) lateCountEl.textContent = '0';
      return;
    }

    let list = _currentLateBatchStudents;
    const q = _lateSearchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(s => (s.name || '').toLowerCase().includes(q));
    }

    list = [...list].sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base', numeric: true }));

    if (lateCountEl) lateCountEl.textContent = String(_checkedLateStudentIds.size);

    if (list.length === 0) {
      lateListEl.innerHTML = `<div class="text-xs text-muted p-2 text-center">Tidak ada siswa yang cocok dengan "${escapeHtml(q)}".</div>`;
      return;
    }

    const sess = _activeLateModalAsm?.payload?.test_session;
    const existingAllowed = new Set(sess?.allowed_student_ids || []);

    lateListEl.innerHTML = list.map(s => {
      const isAlreadyAllowed = existingAllowed.has(s.id);
      const isChecked = _checkedLateStudentIds.has(s.id);
      const isRemedial = _remedialLateStudentIds.has(s.id);

      if (isAlreadyAllowed) {
        return `
          <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding:6px 10px; border-radius:6px; background:rgba(255,255,255,0.02); opacity:0.6;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="color:#10b981; font-size:0.9rem;">✅</span>
              <span style="font-size:0.85rem; font-weight:600; color:var(--fm-text-secondary);">${escapeHtml(s.name || 'Unnamed')}</span>
            </div>
            <span class="badge badge-success" style="font-size:0.65rem;">Sudah Diizinkan</span>
          </div>
        `;
      }

      return `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; padding:6px 10px; border-radius:6px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06);">
          <label style="display:flex; align-items:center; gap:10px; cursor:pointer; flex:1; margin:0;">
            <input type="checkbox" class="late-student-checkbox" value="${s.id}" ${isChecked ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;">
            <span style="font-size:0.85rem; font-weight:600; color:var(--fm-text-primary);">${escapeHtml(s.name || 'Unnamed')}</span>
          </label>
          <label style="display:flex; align-items:center; gap:4px; font-size:0.75rem; color:#fbbf24; cursor:pointer; margin:0;" title="Batas maksimal nilai siswa ini dibatasi KKM 60%">
            <input type="checkbox" class="late-student-remedial-checkbox" data-student-id="${s.id}" ${isRemedial ? 'checked' : ''} style="width:14px; height:14px; cursor:pointer;">
            <span>Remidi (60%)</span>
          </label>
        </div>
      `;
    }).join('');
  };

  lateListEl?.addEventListener('change', (e) => {
    if (e.target.classList.contains('late-student-checkbox')) {
      const sid = e.target.value;
      if (e.target.checked) {
        _checkedLateStudentIds.add(sid);
        if (lateAllRemedialToggle?.checked) {
          _remedialLateStudentIds.add(sid);
        }
      } else {
        _checkedLateStudentIds.delete(sid);
        _remedialLateStudentIds.delete(sid);
      }
      renderLateStudentList();
    } else if (e.target.classList.contains('late-student-remedial-checkbox')) {
      const sid = e.target.getAttribute('data-student-id');
      if (e.target.checked) {
        _remedialLateStudentIds.add(sid);
        _checkedLateStudentIds.add(sid);
      } else {
        _remedialLateStudentIds.delete(sid);
      }
      renderLateStudentList();
    }
  });

  lateSearchInput?.addEventListener('input', (e) => {
    _lateSearchQuery = e.target.value;
    renderLateStudentList();
  });

  lateAllRemedialToggle?.addEventListener('change', (e) => {
    const isAllRem = e.target.checked;
    _checkedLateStudentIds.forEach(id => {
      if (isAllRem) _remedialLateStudentIds.add(id);
      else _remedialLateStudentIds.delete(id);
    });
    renderLateStudentList();
  });

  btnLateSelectAll?.addEventListener('click', () => {
    const sess = _activeLateModalAsm?.payload?.test_session;
    const existingAllowed = new Set(sess?.allowed_student_ids || []);
    _currentLateBatchStudents.forEach(s => {
      if (!existingAllowed.has(s.id)) {
        _checkedLateStudentIds.add(s.id);
        if (lateAllRemedialToggle?.checked) {
          _remedialLateStudentIds.add(s.id);
        }
      }
    });
    renderLateStudentList();
  });

  btnLateDeselectAll?.addEventListener('click', () => {
    _checkedLateStudentIds.clear();
    _remedialLateStudentIds.clear();
    renderLateStudentList();
  });

  btnConfirmAddLate?.addEventListener('click', async () => {
    if (!_activeLateModalAsm) return;
    const studentIds = Array.from(_checkedLateStudentIds);
    if (studentIds.length === 0) {
      showToast('Pilih setidaknya 1 siswa susulan untuk ditambahkan.', 'warning');
      return;
    }

    const remedialStudentIds = Array.from(_remedialLateStudentIds).filter(id => _checkedLateStudentIds.has(id));

    showLoading();
    try {
      await addLateStudentsToSession({
        assessmentId: _activeLateModalAsm.id,
        studentIds: studentIds,
        remedialStudentIds: remedialStudentIds
      });

      const remCount = remedialStudentIds.length;
      showToast(`👥 Berhasil menambahkan ${studentIds.length} siswa susulan! (${remCount} siswa remedial KKM 60%)`, 'success');
      closeLateModal();
      renderAssessmentAccess(area);
    } catch (err) {
      console.error('Failed to add late students:', err);
      showToast('Gagal menambahkan siswa susulan: ' + err.message, 'error');
    } finally {
      hideLoading();
    }
  });

  function bindRowActions() {
    // Open session modal button
    area.querySelectorAll('.btn-open-session-modal').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const asmId = e.currentTarget.getAttribute('data-id');
        const asm = tests.find(t => t.id === asmId);
        if (!asm) return;

        _activeSessionModalAsm = asm;
        area.querySelector('#session-modal-test-title').textContent = asm.title || 'Untitled Test';
        const targetClass = classMap[asm.class_id];
        const targetLevelId = asm.level_id || targetClass?.level_id;
        const targetProgramId = targetClass?.program_id;

        const clsName = targetClass?.name || 'All Classes';
        const lvlName = levelMap[targetLevelId]?.name || 'Level 1';
        area.querySelector('#session-modal-test-meta').textContent = `${clsName} | ${lvlName}`;

        const targetLevelObj = levelMap[targetLevelId];
        const targetLevelNum = (targetLevelObj && typeof targetLevelObj.level_number === 'number')
          ? targetLevelObj.level_number
          : null;

        // ONLY list active batches! Inactive means INACTIVE.
        const availableBatches = _cachedBatches.filter(b => !b.deleted_at && b.is_active !== false);

        const relatedBatches = [];
        const otherBatches = [];

        availableBatches.forEach(b => {
          const bLevelObj = levelMap[b.current_level_id];
          const bLevelNum = (bLevelObj && typeof bLevelObj.level_number === 'number')
            ? bLevelObj.level_number
            : null;

          // Level 0 is under Level 1: do NOT show Level 0 batches for Level 1, 2, or 3 tests!
          if (targetLevelNum != null && targetLevelNum >= 1 && bLevelNum === 0) {
            return;
          }

          // If the test is explicitly Level 0, do not show batches that are Level 1, 2, or 3
          if (targetLevelNum === 0 && bLevelNum != null && bLevelNum > 0) {
            return;
          }

          const isLevelMatch = Boolean(targetLevelId && b.current_level_id === targetLevelId);
          const isProgMatch = Boolean(targetProgramId && b.program_id === targetProgramId);
          const isRelated = isLevelMatch || isProgMatch;

          const activeStuds = _cachedStudents.filter(s => s.batch_id === b.id && !s.deleted_at && s.is_active !== false).length;
          const progName = programMap[b.program_id]?.name || '';
          let lvlTitle = bLevelObj?.name || '';
          if (lvlTitle.toLowerCase() === 'all levels') {
            lvlTitle = 'Level 0';
          }

          const metaParts = [];
          if (activeStuds > 0) metaParts.push(`${activeStuds} Students`);
          else metaParts.push('0 Students');
          if (progName) metaParts.push(progName);
          if (lvlTitle) metaParts.push(lvlTitle.toLowerCase().includes('level') ? lvlTitle : `Level ${lvlTitle}`);
          const metaStr = metaParts.length > 0 ? ` (${metaParts.join(' • ')})` : '';

          const item = {
            id: b.id,
            name: b.name || b.id,
            label: `${b.name ? (b.name.toLowerCase().startsWith('batch') ? b.name : 'Batch ' + b.name) : 'Batch ' + b.id}${metaStr}`,
            isRelated,
            isDirect: isLevelMatch && isProgMatch,
            isLevelMatch,
            isProgMatch,
            activeStuds,
            isActive: true
          };

          if (isRelated) {
            relatedBatches.push(item);
          } else {
            otherBatches.push(item);
          }
        });

        // Sort: direct matches first, then natural alphabetical/numeric order
        relatedBatches.sort((a, b) => {
          if (a.isDirect !== b.isDirect) return b.isDirect ? 1 : -1;
          if (a.isLevelMatch !== b.isLevelMatch) return b.isLevelMatch ? 1 : -1;
          return (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' });
        });

        otherBatches.sort((a, b) => {
          return (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' });
        });

        let optionsHtml = '<option value="">Select target batch...</option>';
        if (relatedBatches.length > 0) {
          optionsHtml += `
            <optgroup label="🎯 Related Batches (${escapeHtml(clsName)} • ${escapeHtml(lvlName)})">
              ${relatedBatches.map(b => `<option value="${b.id}">${escapeHtml(b.label)}</option>`).join('')}
            </optgroup>
          `;
        }
        if (otherBatches.length > 0) {
          optionsHtml += `
            <optgroup label="Other Batches">
              ${otherBatches.map(b => `<option value="${b.id}">${escapeHtml(b.label)}</option>`).join('')}
            </optgroup>
          `;
        }
        batchSelect.innerHTML = optionsHtml;

        // Auto-select session batch if already unlocked, or the best matching related batch
        const currentSessionBatchId = asm.payload?.test_session?.batch_id;
        const defaultBatch = (currentSessionBatchId && availableBatches.some(b => b.id === currentSessionBatchId))
          ? { id: currentSessionBatchId }
          : (relatedBatches.find(b => b.isActive && b.activeStuds > 0) || relatedBatches[0] || otherBatches.find(b => b.isActive && b.activeStuds > 0));

        if (defaultBatch) {
          batchSelect.value = defaultBatch.id;
        } else {
          batchSelect.value = '';
        }

        durationInput.value = asm.working_duration_minutes || 30;

        // Reset student whitelist sort and search
        _whitelistSortOrder = 'asc';
        if (sortStudentsText) sortStudentsText.textContent = 'A → Z';
        _whitelistSearchQuery = '';
        if (searchStudentInput) searchStudentInput.value = '';

        // Auto-trigger change event to populate enrolled students immediately
        batchSelect.dispatchEvent(new Event('change'));

        modal.classList.remove('hidden');
      });
    });

    // Add Late Student Button
    area.querySelectorAll('.btn-add-late-modal').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const asmId = e.currentTarget.getAttribute('data-id');
        const asm = tests.find(t => t.id === asmId);
        if (!asm) return;

        const sess = asm.payload?.test_session;
        if (!sess || sess.status !== 'UNLOCKED') {
          showToast('Sesi ujian ini tidak aktif.', 'warning');
          return;
        }

        const autoClose = sess.auto_close_at ? new Date(sess.auto_close_at) : null;
        const now = new Date();
        const remainingMinutes = autoClose ? Math.max(0, Math.ceil((autoClose.getTime() - now.getTime()) / 60000)) : 0;

        _activeLateModalAsm = asm;
        area.querySelector('#late-modal-test-title').textContent = asm.title || 'Untitled Test';
        
        const bName = batchMap[sess.batch_id]?.name || 'Batch ' + (sess.batch_id || '');
        const endTimeStr = autoClose ? autoClose.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
        area.querySelector('#late-modal-meta').textContent = `${bName} • Berakhir Pukul ${endTimeStr}`;
        area.querySelector('#late-modal-remaining').textContent = `${remainingMinutes} Menit`;

        // Pre-check if entire session is remedial
        if (lateAllRemedialToggle) {
          lateAllRemedialToggle.checked = Boolean(sess.is_remedial);
        }

        // Get all active students for this batch
        _currentLateBatchStudents = _cachedStudents.filter(s => s.batch_id === sess.batch_id && !s.deleted_at && s.is_active !== false);
        _checkedLateStudentIds.clear();
        _remedialLateStudentIds.clear();
        _lateSearchQuery = '';
        if (lateSearchInput) lateSearchInput.value = '';

        renderLateStudentList();
        modalLate?.classList.remove('hidden');
      });
    });

    // Close session button
    area.querySelectorAll('.btn-lock-session').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const asmId = e.currentTarget.getAttribute('data-id');
        if (!confirm('Are you sure you want to close/lock this test session immediately?')) return;
        showLoading();
        try {
          await closeTestSession(asmId);
          showToast('🔒 Test session locked successfully.', 'info');
          renderAssessmentAccess(area);
        } catch (err) {
          console.error('Failed to close session:', err);
          showToast('Failed to lock session: ' + err.message, 'error');
        } finally {
          hideLoading();
        }
      });
    });
  }

  bindRowActions();
}
