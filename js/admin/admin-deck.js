import { adminFetchAll, formatStudentName } from '../api.js?v=20261119_v633';
import { escHtml } from '../app.js?v=20261106_v160';
import { getSvgIcon } from '../svg-icons.js?v=20261114_v487';
import { getGradeColorByScore, getGradeSymbol } from '../grading.js?v=20261106_v160';

// ═══════════════════════════════════════════════════════════════
// TOPSCORE ADMIN — EXECUTIVE MASTER DASHBOARD
// SSOT Color Tokens (ui-invariants.md §3 / AGENTS.md §color-auditor)
// ═══════════════════════════════════════════════════════════════
const C = {
  STAR:    '#c084fc',   // ★ Excellent 100%
  A:       '#00c000',   // A Very Good 90–99%
  B:       '#95ff00',   // B Good 80–89%
  C:       '#ffff00',   // C Enough 60–79%
  D:       '#ff8c00',   // D Less 30–59%
  E:       '#ff0000',   // E Fail 0–29%
  TACT:    '#38bdf8',   // Tactical Cyan (primary)
  PINK:    '#ff2d87',   // Quad A — Admin
  ORANGE:  '#ff8c00',   // Quad B — Board
  LIME:    '#95ff00',   // Quad C — Class
  MUTED:   '#94a3b8',
  TEXT_DK: '#0f172a',
};

function gradeColor(pct) { return getGradeColorByScore(pct); }
function gradeSymbol(pct) { return getGradeSymbol(null, pct); }
function gradeTextColor(pct) {
  const p = Number(pct);
  if (p >= 80 || (p >= 30 && p < 60)) return C.TEXT_DK;
  return '#ffffff';
}
function fmtPct(v) { return isNaN(Number(v)) ? '—' : Math.round(Number(v)) + '%'; }
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}

// Mini bar graph (horizontal, inline SVG-less approach via CSS)
function miniBar(pct, color) {
  const w = Math.min(100, Math.max(0, Number(pct) || 0));
  return `<div style="display:flex;align-items:center;gap:5px;min-width:80px;">
    <div style="flex:1;height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden;">
      <div style="width:${w}%;height:100%;background:${color};border-radius:3px;transition:width .4s;"></div>
    </div>
    <span style="font-size:12px;font-weight:700;color:${color};min-width:34px;text-align:right;">${fmtPct(pct)}</span>
  </div>`;
}

// Grade badge (per ui-invariants §color-auditor)
function gradeBadge(pct, size = 22) {
  const col = gradeColor(pct);
  const txt = gradeTextColor(pct);
  const sym = gradeSymbol(pct);
  return `<span style="display:inline-flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:50%;background:${col};color:${txt};font-size:${size > 20 ? 11 : 10}px;font-weight:800;line-height:1;flex-shrink:0;">${sym}</span>`;
}

// Stat KPI card (top row)
function kpiCard(value, label, color) {
  return `
    <div class="glass-card" style="padding:10px !important;text-align:center;min-width:0;">
      <div style="font-size:28px;font-weight:800;color:${color};line-height:1.1;letter-spacing:-0.5px;">${value}</div>
      <div style="font-size:12px;color:${C.MUTED};text-transform:uppercase;font-weight:700;margin-top:4px;white-space:nowrap;">${label}</div>
    </div>`;
}

// Section header
function sectionHeader(title, action = '') {
  return `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;padding-bottom:5px;border-bottom:1px solid rgba(255,255,255,0.08);">
    <h3 style="margin:0;font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:#f8fafc;">${title}</h3>
    ${action}
  </div>`;
}

// Ghost button
function ghostBtn(label, onclick, color = C.TACT) {
  return `<button class="btn btn-ghost btn-sm" onclick="${onclick}" style="color:${color};font-weight:700;font-size:12px;padding:0 8px;height:30px;line-height:28px;">${label} →</button>`;
}

export async function renderDashboard(container) {
  container.innerHTML = `<div class="topscore-loading-center"><div class="spinner"></div><p class="loading-text">Loading Dashboard…</p></div>`;

  // ── Quota-minimized parallel fetch (lean column selects only) ──
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);  // YYYY-MM-DD
  const weekAgo  = new Date(today - 7 * 86400000).toISOString();

  const [students, classes, programs, batches, institutions, tests, attempts, progress] = await Promise.all([
    adminFetchAll('students',     'id, name, is_active, deleted_at, created_at, program_id, batch_id'),
    adminFetchAll('classes',      'id, name, code, is_active, program_id, deleted_at'),
    adminFetchAll('programs',     'id, name, is_active, institution_id'),
    adminFetchAll('batches',      'id, name, is_active, program_id'),
    adminFetchAll('institutions', 'id, name, is_active'),
    adminFetchAll('tests',        'id, title, shell_code, class_id, test_type, status, deleted_at'),
    adminFetchAll('attempts',     'id, student_id, test_id, percentage, grade, is_forgiven, submitted_at, status'),
    adminFetchAll('progress',     'id, student_id, class_id, unlocked_level, highest_score, updated_at'),
  ]);

  // ─── Pre-compute basic metrics ───────────────────────────────
  const activeStudents = students.filter(s => s.is_active && !s.deleted_at);
  const inactiveStudents = students.filter(s => !s.is_active && !s.deleted_at);
  const publishedTests  = tests.filter(t => t.status === 'PUBLISHED' && !t.deleted_at);
  const submittedAttempts = attempts.filter(a =>
    ['submitted', 'auto_submitted', 'evaluated', 'SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED'].includes(a.status)
  );

  const totalStudents   = activeStudents.length;
  const totalPrograms   = programs.filter(p => p.is_active).length;
  const totalBatches    = batches.filter(b => b.is_active).length;
  const totalInstitutions = institutions.length;
  const totalTests      = publishedTests.length;
  const totalAttempts   = submittedAttempts.length;

  // ─── Activity This Week ──────────────────────────────────────
  const weekAttempts = submittedAttempts.filter(a => a.submitted_at && a.submitted_at >= weekAgo);
  const todayAttempts = submittedAttempts.filter(a => a.submitted_at && a.submitted_at.slice(0, 10) === todayStr);

  // ─── Global pass rate ────────────────────────────────────────
  const passedAttempts = submittedAttempts.filter(a => {
    const p = Number(a.percentage);
    return p >= 60 || a.is_forgiven;
  });
  const globalPassRate = totalAttempts > 0 ? Math.round((passedAttempts.length / totalAttempts) * 100) : 0;

  // ─── Average score ───────────────────────────────────────────
  const pctValues = submittedAttempts.map(a => Number(a.percentage)).filter(p => !isNaN(p));
  const avgScore = pctValues.length > 0 ? Math.round(pctValues.reduce((s, p) => s + p, 0) / pctValues.length) : 0;

  // ─── Grade distribution ──────────────────────────────────────
  const gradeDist = { STAR: 0, A: 0, B: 0, C: 0, D: 0, E: 0 };
  submittedAttempts.forEach(a => {
    const p = Number(a.percentage);
    if (isNaN(p)) return;
    if (p >= 100) gradeDist.STAR++;
    else if (p >= 90) gradeDist.A++;
    else if (p >= 80) gradeDist.B++;
    else if (p >= 60) gradeDist.C++;
    else if (p >= 30) gradeDist.D++;
    else gradeDist.E++;
  });

  // ─── Batch status snapshots ───────────────────────────────────
  const activeBatches = batches.filter(b => b.is_active);
  const batchProgMap = {};
  programs.forEach(p => { batchProgMap[p.id] = p; });
  const batchSnaps = activeBatches.map(batch => {
    const bStudents = activeStudents.filter(s => s.batch_id === batch.id);
    const prog = batchProgMap[batch.program_id] || {};
    // All attempts from students in this batch
    const studentIds = new Set(bStudents.map(s => s.id));
    const bAttempts = submittedAttempts.filter(a => studentIds.has(a.student_id));
    const bPassed   = bAttempts.filter(a => Number(a.percentage) >= 60 || a.is_forgiven);
    const bPassRate = bAttempts.length > 0 ? Math.round((bPassed.length / bAttempts.length) * 100) : 0;
    const bPcts = bAttempts.map(a => Number(a.percentage)).filter(p => !isNaN(p));
    const bAvg  = bPcts.length > 0 ? Math.round(bPcts.reduce((s, p) => s + p, 0) / bPcts.length) : 0;
    // Students at risk: active but no attempts at all
    const studentsWithAttempts = new Set(bAttempts.map(a => a.student_id));
    const atRisk = bStudents.filter(s => !studentsWithAttempts.has(s.id)).length;
    return { batch, prog, bStudents, bAttempts, bPassRate, bAvg, atRisk };
  }).sort((a, b) => (a.batch.name || '').localeCompare(b.batch.name || '', undefined, { numeric: true }));

  // ─── Needs Attention: low-scoring active students ────────────
  const studentAttemptMap = {};
  submittedAttempts.forEach(a => {
    if (!studentAttemptMap[a.student_id]) studentAttemptMap[a.student_id] = [];
    studentAttemptMap[a.student_id].push(Number(a.percentage));
  });
  const needsAttention = activeStudents
    .map(s => {
      const scores = studentAttemptMap[s.id] || [];
      const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
      return { s, avg, attemptCount: scores.length };
    })
    .filter(x => x.avg !== null && x.avg < 60)
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 7);

  // ─── Recent Activity ──────────────────────────────────────────
  const testMap = {};
  tests.forEach(t => { testMap[t.id] = t; });
  const studentMap = {};
  students.forEach(s => { studentMap[s.id] = s; });
  const recentActivity = [...submittedAttempts]
    .sort((a, b) => (b.submitted_at || '').localeCompare(a.submitted_at || ''))
    .slice(0, 8);

  // ─── Class performance overview ───────────────────────────────
  const classAttemptMap = {};
  submittedAttempts.forEach(a => {
    const tst = testMap[a.test_id];
    if (!tst || !tst.class_id) return;
    if (!classAttemptMap[tst.class_id]) classAttemptMap[tst.class_id] = [];
    classAttemptMap[tst.class_id].push(Number(a.percentage));
  });
  const activeClasses = classes.filter(c => c.is_active && !c.deleted_at);
  const classPerf = activeClasses.map(cls => {
    const scores = classAttemptMap[cls.id] || [];
    const avg = scores.length > 0 ? Math.round(scores.reduce((s, p) => s + p, 0) / scores.length) : null;
    const passCount = scores.filter(p => p >= 60).length;
    const prog = programs.find(p => p.id === cls.program_id);
    return { cls, avg, total: scores.length, passCount, prog };
  }).filter(x => x.total > 0).sort((a, b) => (a.avg || 0) - (b.avg || 0));
  const classTop    = [...classPerf].sort((a, b) => (b.avg || 0) - (a.avg || 0)).slice(0, 5);
  const classBottom = classPerf.slice(0, 5);

  // ─── Grade distribution bar widths ──────────────────────────
  const gradeTotal = Object.values(gradeDist).reduce((s, v) => s + v, 0);
  function gdPct(k) { return gradeTotal > 0 ? Math.round((gradeDist[k] / gradeTotal) * 100) : 0; }

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:10px;padding:10px;box-sizing:border-box;height:100%;overflow-y:auto;overflow-x:hidden;">

      <!-- ── TITLE ROW ── -->
      <div style="display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
        <div>
          <h2 style="margin:0;font-size:20px;font-weight:800;color:#f8fafc;line-height:1;">Executive Dashboard</h2>
          <div style="font-size:12px;color:${C.MUTED};margin-top:3px;">Real-time operational snapshot · ${today.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="window.loadSection('curriculum')" style="color:${C.TACT};font-weight:700;font-size:12px;height:30px;line-height:28px;padding:0 10px;border:1px solid ${C.TACT};border-radius:4px;">Curriculum Hub →</button>
      </div>

      <!-- ══ ROW 1: KPI STRIP (8 cards) ══ -->
      <div style="display:grid;grid-template-columns:repeat(8,1fr);gap:10px;flex-shrink:0;">
        ${kpiCard(totalStudents,    'Students',    C.TACT)}
        ${kpiCard(activeStudents.length,  'Active',   C.A)}
        ${kpiCard(inactiveStudents.length,'Inactive', C.D)}
        ${kpiCard(totalBatches,     'Batches',     C.ORANGE)}
        ${kpiCard(totalPrograms,    'Programs',    C.PINK)}
        ${kpiCard(totalTests,       'Tests',       C.LIME)}
        ${kpiCard(weekAttempts.length,   'This Week', C.TACT)}
        ${kpiCard(todayAttempts.length,  'Today',    C.STAR)}
      </div>

      <!-- ══ ROW 2: PERFORMANCE OVERVIEW (3 panels) ══ -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;flex-shrink:0;">

        <!-- Global Score Card -->
        <div class="glass-card" style="padding:10px !important;">
          ${sectionHeader('Global Performance')}
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div style="text-align:center;padding:8px;background:rgba(255,255,255,0.03);border-radius:6px;border:1px solid rgba(255,255,255,0.06);">
              <div style="font-size:26px;font-weight:800;color:${gradeColor(avgScore)};line-height:1.1;">${avgScore}%</div>
              <div style="font-size:12px;color:${C.MUTED};margin-top:2px;">Avg Score</div>
            </div>
            <div style="text-align:center;padding:8px;background:rgba(255,255,255,0.03);border-radius:6px;border:1px solid rgba(255,255,255,0.06);">
              <div style="font-size:26px;font-weight:800;color:${gradeColor(globalPassRate)};line-height:1.1;">${globalPassRate}%</div>
              <div style="font-size:12px;color:${C.MUTED};margin-top:2px;">Pass Rate</div>
            </div>
          </div>
          <div style="margin-top:8px;display:flex;flex-direction:column;gap:4px;">
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;">
              <span style="color:${C.MUTED};">Total Attempts</span>
              <span style="font-weight:700;color:#f8fafc;">${totalAttempts.toLocaleString()}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;">
              <span style="color:${C.MUTED};">Passed</span>
              <span style="font-weight:700;color:${C.A};">${passedAttempts.length.toLocaleString()}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;">
              <span style="color:${C.MUTED};">Failed</span>
              <span style="font-weight:700;color:${C.E};">${(totalAttempts - passedAttempts.length).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <!-- Grade Distribution Panel -->
        <div class="glass-card" style="padding:10px !important;">
          ${sectionHeader('Grade Distribution')}
          <div style="display:flex;flex-direction:column;gap:5px;">
            ${[
              ['★', C.STAR, gdPct('STAR'), gradeDist.STAR, C.TEXT_DK],
              ['A',  C.A,    gdPct('A'),    gradeDist.A,    C.TEXT_DK],
              ['B',  C.B,    gdPct('B'),    gradeDist.B,    C.TEXT_DK],
              ['C',  C.C,    gdPct('C'),    gradeDist.C,    C.TEXT_DK],
              ['D',  C.D,    gdPct('D'),    gradeDist.D,    C.TEXT_DK],
              ['E',  C.E,    gdPct('E'),    gradeDist.E,    '#ffffff'],
            ].map(([sym, col, pct, cnt, txtcol]) => `
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:${col};color:${txtcol};font-size:10px;font-weight:800;flex-shrink:0;">${sym}</span>
                <div style="flex:1;height:14px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;">
                  <div style="width:${pct}%;height:100%;background:${col};border-radius:3px;"></div>
                </div>
                <span style="font-size:12px;font-weight:700;color:${col};min-width:28px;text-align:right;">${cnt}</span>
                <span style="font-size:12px;color:${C.MUTED};min-width:30px;text-align:right;">${pct}%</span>
              </div>`).join('')}
          </div>
        </div>

        <!-- Activity Pulse Panel -->
        <div class="glass-card" style="padding:10px !important;">
          ${sectionHeader('Activity Pulse')}
          <div style="display:flex;flex-direction:column;gap:6px;">
            <div style="padding:6px 8px;background:rgba(255,255,255,0.03);border-radius:6px;border:1px solid rgba(56,189,248,.15);">
              <div style="font-size:12px;color:${C.MUTED};margin-bottom:3px;">Today</div>
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="font-size:22px;font-weight:800;color:${C.TACT};">${todayAttempts.length}</span>
                <span style="font-size:12px;color:${C.MUTED};">attempts submitted</span>
              </div>
            </div>
            <div style="padding:6px 8px;background:rgba(255,255,255,0.03);border-radius:6px;border:1px solid rgba(255,140,0,.15);">
              <div style="font-size:12px;color:${C.MUTED};margin-bottom:3px;">This Week (7 days)</div>
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="font-size:22px;font-weight:800;color:${C.ORANGE};">${weekAttempts.length}</span>
                <span style="font-size:12px;color:${C.MUTED};">attempts submitted</span>
              </div>
            </div>
            <div style="padding:6px 8px;background:rgba(255,255,255,0.03);border-radius:6px;border:1px solid rgba(0,192,0,.15);">
              <div style="font-size:12px;color:${C.MUTED};margin-bottom:3px;">Total Students Active</div>
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="font-size:22px;font-weight:800;color:${C.A};">${activeStudents.length}</span>
                <span style="font-size:12px;color:${C.MUTED};">/ ${students.filter(s=>!s.deleted_at).length} enrolled</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ══ ROW 3: BATCH STATUS TABLE + RECENT ACTIVITY ══ -->
      <div style="display:grid;grid-template-columns:3fr 2fr;gap:10px;">

        <!-- Batch Status Snapshot Table -->
        <div class="glass-card" style="padding:10px !important;">
          ${sectionHeader('Batch Status Snapshot', ghostBtn('Manage Batches', "window.loadSection('students')", C.ORANGE))}
          <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
              <thead>
                <tr style="background:rgba(255,255,255,0.05);">
                  <th style="padding:5px 8px;text-align:left;font-weight:700;color:${C.MUTED};border-bottom:1px solid rgba(255,255,255,0.12);white-space:nowrap;">BATCH</th>
                  <th style="padding:5px 8px;text-align:left;font-weight:700;color:${C.MUTED};border-bottom:1px solid rgba(255,255,255,0.12);white-space:nowrap;">PROGRAM</th>
                  <th style="padding:5px 4px;text-align:center;font-weight:700;color:${C.MUTED};border-bottom:1px solid rgba(255,255,255,0.12);white-space:nowrap;">STUDENTS</th>
                  <th style="padding:5px 4px;text-align:center;font-weight:700;color:${C.MUTED};border-bottom:1px solid rgba(255,255,255,0.12);white-space:nowrap;">ATTEMPTS</th>
                  <th style="padding:5px 8px;text-align:left;font-weight:700;color:${C.MUTED};border-bottom:1px solid rgba(255,255,255,0.12);white-space:nowrap;">AVG SCORE</th>
                  <th style="padding:5px 8px;text-align:left;font-weight:700;color:${C.MUTED};border-bottom:1px solid rgba(255,255,255,0.12);white-space:nowrap;">PASS RATE</th>
                  <th style="padding:5px 4px;text-align:center;font-weight:700;color:${C.E};border-bottom:1px solid rgba(255,255,255,0.12);white-space:nowrap;">AT RISK</th>
                </tr>
              </thead>
              <tbody>
                ${batchSnaps.length === 0
                  ? `<tr><td colspan="7" style="padding:16px;text-align:center;color:${C.MUTED};">No active batches.</td></tr>`
                  : batchSnaps.map((x, i) => `
                  <tr style="border-bottom:1px solid rgba(255,255,255,0.06);${i % 2 === 1 ? 'background:rgba(255,255,255,0.02);' : ''}">
                    <td style="padding:5px 8px;font-weight:700;color:#f8fafc;white-space:nowrap;">${escHtml(x.batch.name || '—')}</td>
                    <td style="padding:5px 8px;color:${C.TACT};white-space:nowrap;">${escHtml(x.prog.name || '—')}</td>
                    <td style="padding:5px 4px;text-align:center;font-weight:700;color:#f8fafc;">${x.bStudents.length}</td>
                    <td style="padding:5px 4px;text-align:center;color:${C.MUTED};">${x.bAttempts.length}</td>
                    <td style="padding:5px 8px;">${x.bAttempts.length > 0 ? miniBar(x.bAvg, gradeColor(x.bAvg)) : '<span style="color:' + C.MUTED + ';font-size:12px;">—</span>'}</td>
                    <td style="padding:5px 8px;">${x.bAttempts.length > 0 ? miniBar(x.bPassRate, gradeColor(x.bPassRate)) : '<span style="color:' + C.MUTED + ';font-size:12px;">—</span>'}</td>
                    <td style="padding:5px 4px;text-align:center;">
                      ${x.atRisk > 0
                        ? `<span style="font-size:12px;font-weight:800;color:${C.E};padding:1px 6px;background:rgba(255,0,0,0.12);border-radius:3px;">${x.atRisk}</span>`
                        : `<span style="font-size:12px;color:${C.A};">✓</span>`}
                    </td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Recent Activity Feed -->
        <div class="glass-card" style="padding:10px !important;display:flex;flex-direction:column;">
          ${sectionHeader('Recent Activity')}
          <div style="display:flex;flex-direction:column;gap:4px;overflow-y:auto;flex:1;">
            ${recentActivity.length === 0
              ? `<div style="color:${C.MUTED};font-size:12px;padding:8px 0;">No activity yet.</div>`
              : recentActivity.map(a => {
                  const tst = testMap[a.test_id] || {};
                  const stu = studentMap[a.student_id] || {};
                  const pct = Number(a.percentage);
                  const col = gradeColor(pct);
                  return `
                  <div style="display:flex;align-items:center;gap:6px;padding:5px 7px;background:rgba(255,255,255,0.025);border-radius:5px;border:1px solid rgba(255,255,255,0.05);">
                    ${gradeBadge(pct, 22)}
                    <div style="flex:1;min-width:0;">
                      <div style="font-size:12px;font-weight:700;color:#f8fafc;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(formatStudentName(stu.name || 'Student'))}</div>
                      <div style="font-size:12px;color:${C.MUTED};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(tst.shell_code || tst.title || '—')}</div>
                    </div>
                    <div style="text-align:right;flex-shrink:0;">
                      <div style="font-size:12px;font-weight:800;color:${col};">${fmtPct(pct)}</div>
                      <div style="font-size:12px;color:${C.MUTED};">${a.submitted_at ? new Date(a.submitted_at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}) : '—'}</div>
                    </div>
                  </div>`;
                }).join('')}
          </div>
        </div>
      </div>

      <!-- ══ ROW 4: NEEDS ATTENTION + CLASS PERFORMANCE ══ -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">

        <!-- Needs Attention -->
        <div class="glass-card" style="padding:10px !important;">
          ${sectionHeader(`<span style="color:${C.E};">⚠ Needs Attention</span> <span style="font-size:12px;color:${C.MUTED};font-weight:400;">(avg &lt; 60%)</span>`, ghostBtn('All Students', "window.loadSection('students')", C.E))}
          ${needsAttention.length === 0
            ? `<div style="font-size:12px;color:${C.A};padding:8px 0;">✓ No students below passing threshold.</div>`
            : `<div style="overflow-x:auto;">
              <table style="width:100%;border-collapse:collapse;font-size:12px;">
                <thead>
                  <tr style="background:rgba(255,255,255,0.04);">
                    <th style="padding:4px 8px;text-align:left;color:${C.MUTED};font-weight:700;border-bottom:1px solid rgba(255,255,255,0.1);white-space:nowrap;">STUDENT</th>
                    <th style="padding:4px 4px;text-align:center;color:${C.MUTED};font-weight:700;border-bottom:1px solid rgba(255,255,255,0.1);white-space:nowrap;">ATTEMPTS</th>
                    <th style="padding:4px 8px;text-align:left;color:${C.MUTED};font-weight:700;border-bottom:1px solid rgba(255,255,255,0.1);white-space:nowrap;">AVG SCORE</th>
                    <th style="padding:4px 4px;text-align:center;color:${C.MUTED};font-weight:700;border-bottom:1px solid rgba(255,255,255,0.1);white-space:nowrap;">GRD</th>
                  </tr>
                </thead>
                <tbody>
                  ${needsAttention.map((x, i) => `
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.05);${i%2===1?'background:rgba(255,255,255,0.015);':''}">
                      <td style="padding:4px 8px;font-weight:700;color:#f8fafc;white-space:nowrap;">${escHtml(formatStudentName(x.s.name || 'Student'))}</td>
                      <td style="padding:4px 4px;text-align:center;color:${C.MUTED};">${x.attemptCount}</td>
                      <td style="padding:4px 8px;">${miniBar(x.avg, gradeColor(x.avg))}</td>
                      <td style="padding:4px 4px;text-align:center;">${gradeBadge(x.avg, 20)}</td>
                    </tr>`).join('')}
                </tbody>
              </table>
            </div>`}
        </div>

        <!-- Class Performance Overview -->
        <div class="glass-card" style="padding:10px !important;">
          ${sectionHeader('Class Performance', ghostBtn('All Classes', "window.loadSection('class-hub')", C.LIME))}
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">

            <!-- Top Performing -->
            <div>
              <div style="font-size:12px;font-weight:700;color:${C.A};text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px;">Top Performing</div>
              <div style="display:flex;flex-direction:column;gap:3px;">
                ${classTop.length === 0
                  ? `<div style="font-size:12px;color:${C.MUTED};">No data.</div>`
                  : classTop.map(x => `
                  <div style="display:flex;align-items:center;gap:5px;padding:3px 6px;background:rgba(0,192,0,0.05);border-radius:4px;border:1px solid rgba(0,192,0,0.1);">
                    ${gradeBadge(x.avg, 18)}
                    <div style="flex:1;min-width:0;">
                      <div style="font-size:12px;font-weight:700;color:#f8fafc;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(x.cls.name)}</div>
                      <div style="font-size:12px;color:${C.MUTED};white-space:nowrap;">${x.total} attempts</div>
                    </div>
                    <span style="font-size:12px;font-weight:800;color:${gradeColor(x.avg)};">${x.avg}%</span>
                  </div>`).join('')}
              </div>
            </div>

            <!-- Bottom Performing -->
            <div>
              <div style="font-size:12px;font-weight:700;color:${C.E};text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px;">Needs Focus</div>
              <div style="display:flex;flex-direction:column;gap:3px;">
                ${classBottom.length === 0
                  ? `<div style="font-size:12px;color:${C.MUTED};">No data.</div>`
                  : classBottom.map(x => `
                  <div style="display:flex;align-items:center;gap:5px;padding:3px 6px;background:rgba(255,0,0,0.04);border-radius:4px;border:1px solid rgba(255,0,0,0.1);">
                    ${gradeBadge(x.avg, 18)}
                    <div style="flex:1;min-width:0;">
                      <div style="font-size:12px;font-weight:700;color:#f8fafc;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(x.cls.name)}</div>
                      <div style="font-size:12px;color:${C.MUTED};white-space:nowrap;">${x.total} attempts</div>
                    </div>
                    <span style="font-size:12px;font-weight:800;color:${gradeColor(x.avg)};">${x.avg}%</span>
                  </div>`).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ══ ROW 5: ORGANIZATION HIERARCHY (compact) ══ -->
      <div class="glass-card" style="padding:10px !important;">
        ${sectionHeader('Organization Hierarchy', ghostBtn('Curriculum Hub', "window.loadSection('curriculum')", C.TACT))}
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          ${institutions.length === 0
            ? `<div style="font-size:12px;color:${C.MUTED};">No institutions configured.</div>`
            : institutions.map(inst => {
                const instProgs = programs.filter(p => p.institution_id === inst.id);
                return `
                  <div style="border:1px solid rgba(56,189,248,0.2);border-radius:6px;padding:8px 10px;background:rgba(56,189,248,0.04);min-width:180px;flex:1;">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;">
                      <span style="font-size:12px;font-weight:800;color:${C.TACT};">${escHtml(inst.name)}</span>
                      <span class="badge ${inst.is_active !== false ? 'badge-success' : 'badge-neutral'}" style="font-size:12px;">${inst.is_active !== false ? 'Active' : 'Inactive'}</span>
                    </div>
                    <div style="display:flex;flex-wrap:wrap;gap:3px;">
                      ${instProgs.map(p => {
                        const pBatches = batches.filter(b => b.program_id === p.id);
                        return `<span class="badge badge-neutral" style="font-size:12px;">${escHtml(p.name)} (${pBatches.length} batch)</span>`;
                      }).join('') || `<span style="font-size:12px;color:${C.MUTED};">No programs</span>`}
                    </div>
                  </div>`;
              }).join('')}
        </div>
      </div>

    </div>
  `;

  // ── Bottom Infobar ──────────────────────────────────────────
  if (typeof window.setBottomInfobar === 'function') {
    const leftHtml = `
      <div style="display:flex;align-items:center;gap:12px;font-size:12px;color:#94a3b8;font-weight:600;">
        <span><strong style="color:#f8fafc;">Domain A</strong> · Executive Master Dashboard</span>
        <span>·</span>
        <span style="color:var(--grade-a);font-weight:700;">● Online</span>
        <span>·</span>
        <span>${totalAttempts} attempts · ${activeStudents.length} active students</span>
      </div>`;
    window.setBottomInfobar(leftHtml, '');
  }
}
