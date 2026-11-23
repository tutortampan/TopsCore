/**
 * TopsCore LMS — Academic Gradebook for Manual Input Classes
 * (Speaking, Storytelling, Grammar, Grammar for Speaking, Pronunciation)
 * 
 * Rules:
 * - Direct manual input & evaluation by tutors/admins
 * - 100% English SSOT, 12px uniform typography, 100vh locked datagrid
 * - Single Perimeter Ownership: Zero nested container padding
 * - Two-tier sticky header (Super-headers top:0, Sub-headers top:30px)
 * - Live auto-save to student_academic_assessments table
 */

import { getSupabase } from '../supabase.js';
import { getSvgIcon } from '../svg-icons.js';
import { detectClassDiscipline, calculateGrade, formatGradeBadgeHtml, getGradeColorByScore } from '../grading.js';

let _activeGradebookEditMode = false;
let _cachedAssessments = [];
let _activeClassId = null;

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function cleanStudentName(name) {
  if (!name) return 'Unknown';
  return name.replace(/\s+/g, ' ').trim();
}

/**
 * Infer subject_code and step_level for database matching
 */
function resolveClassSubjectAndStep(currentClass, levelMap = {}) {
  const discipline = detectClassDiscipline(currentClass);
  let subjectCode = 'SPEAKING';
  if (discipline === 'STORYTELLING') subjectCode = 'STORYTELLING';
  else if (discipline === 'GRAMMAR') subjectCode = 'GRAMMAR';
  else if (discipline === 'GFS') subjectCode = 'GFS';
  else if (discipline === 'PRONUNCIATION') subjectCode = 'PRONUNCIATION';
  else if (discipline === 'VOCABULARY') subjectCode = 'VOCABULARY';
  else if (discipline === 'BASIC_ENGLISH') subjectCode = 'BASIC';

  let stepLevel = 1;
  if (currentClass?.level_id && levelMap[currentClass.level_id]?.level_number) {
    stepLevel = levelMap[currentClass.level_id].level_number;
  } else if (/2nd|level\s*2|-2/i.test(currentClass?.name || '') || /-2/i.test(currentClass?.code || '')) {
    stepLevel = 2;
  } else if (/3rd|level\s*3|-3/i.test(currentClass?.name || '') || /-3/i.test(currentClass?.code || '')) {
    stepLevel = 3;
  }
  return { discipline, subjectCode, stepLevel };
}

/**
 * Schema definition for each subject's columns and assessment targets
 */
function getSubjectSchema(subjectCode, stepLevel) {
  switch (subjectCode) {
    case 'VOCABULARY': {
      const vTargets = stepLevel === 2
        ? { W1: 120, W2: 280, W3: 440, W4: 600 }
        : (stepLevel === 3
            ? { W1: 150, W2: 400, W3: 650, W4: 800 }
            : { W1: 98, W2: 266, W3: 431, W4: 574 });
      return {
        groups: [
          {
            title: 'DIAGNOSTIC',
            colorVar: '--primary-tactical',
            cols: [
              { key: 'PT', type: 'DIAGNOSTIC', target: 30, label: 'PT' }
            ]
          },
          {
            title: 'WEEKLY WORD DEPOSITS',
            colorVar: '--grade-b',
            cols: [
              { key: 'W1', type: 'WEEKLY_DEPOSIT', target: vTargets.W1, label: 'W1' },
              { key: 'W2', type: 'WEEKLY_DEPOSIT', target: vTargets.W2, label: 'W2' },
              { key: 'W3', type: 'WEEKLY_DEPOSIT', target: vTargets.W3, label: 'W3' },
              { key: 'W4', type: 'WEEKLY_DEPOSIT', target: vTargets.W4, label: 'W4' }
            ]
          }
        ],
        calcFinal: (scores) => {
          const wKeys = ['W1', 'W2', 'W3', 'W4'];
          const pcts = [];
          wKeys.forEach(k => {
            const raw = scores[k]?.raw_score;
            if (raw != null && raw !== '') {
              const p = Math.min(100, Math.round((Number(raw) / vTargets[k]) * 100));
              pcts.push(p);
            }
          });
          if (!pcts.length) return { score: null, pct: null, grade: '—' };
          const avgPct = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
          const latestRaw = scores['W4']?.raw_score || scores['W3']?.raw_score || scores['W2']?.raw_score || scores['W1']?.raw_score;
          return { score: `${latestRaw || 0} wds`, pct: avgPct, grade: calculateGrade(avgPct) };
        }
      };
    }

    case 'STORYTELLING':
      return {
        groups: [
          {
            title: 'WEEKLY PERFORMANCE EXAMS (SCALE 1–5)',
            colorVar: '--grade-d',
            cols: [
              { key: 'W1', type: 'WEEKLY_DEPOSIT', target: 5, label: 'EX-1' },
              { key: 'W2', type: 'WEEKLY_DEPOSIT', target: 5, label: 'EX-2' },
              { key: 'W3', type: 'WEEKLY_DEPOSIT', target: 5, label: 'EX-3' },
              { key: 'W4', type: 'WEEKLY_DEPOSIT', target: 5, label: 'EX-4' }
            ]
          }
        ],
        calcFinal: (scores) => {
          const keys = ['W1', 'W2', 'W3', 'W4'];
          const valid = keys.map(k => scores[k]?.raw_score).filter(v => v != null && v !== '');
          if (!valid.length) return { score: null, pct: null, grade: '—' };
          const avg = valid.reduce((a, b) => a + Number(b), 0) / valid.length;
          const pct = Math.round((avg / 5) * 100);
          return { score: avg.toFixed(2), pct, grade: calculateGrade(pct) };
        }
      };

    case 'GRAMMAR':
    case 'GFS': {
      const gU1Target = (stepLevel === 1 ? 15 : (stepLevel === 2 ? 30 : 15));
      const gU2Target = (stepLevel === 1 ? 20 : (stepLevel === 2 ? 30 : 15));
      return {
        groups: [
          {
            title: 'DIAGNOSTIC',
            colorVar: '--primary-tactical',
            cols: [
              { key: 'PT', type: 'DIAGNOSTIC', target: 25, label: 'PT' }
            ]
          },
          ...(stepLevel === 3 ? [{
            title: 'WEEKLY ATTENDANCE',
            colorVar: '--grade-b',
            cols: [
              { key: 'W1', type: 'WEEKLY_DEPOSIT', target: 5, label: 'W1' },
              { key: 'W2', type: 'WEEKLY_DEPOSIT', target: 5, label: 'W2' },
              { key: 'W3', type: 'WEEKLY_DEPOSIT', target: 5, label: 'W3' },
              { key: 'W4', type: 'WEEKLY_DEPOSIT', target: 5, label: 'W4' }
            ]
          }] : []),
          {
            title: 'PERIODICAL EXAMS',
            colorVar: '--grade-a',
            cols: [
              { key: 'U1', type: 'PERIODIC_EXAM', target: gU1Target, label: `EX-1 (Max ${gU1Target})` },
              { key: 'U2', type: 'PERIODIC_EXAM', target: gU2Target, label: `EX-2 (Max ${gU2Target})` }
            ]
          }
        ],
        calcFinal: (scores) => {
          const u1 = scores['U1']?.raw_score;
          const u2 = scores['U2']?.raw_score;
          const pcts = [];
          if (u1 != null && u1 !== '') pcts.push(Math.min(100, (Number(u1) / gU1Target) * 100));
          if (u2 != null && u2 !== '') pcts.push(Math.min(100, (Number(u2) / gU2Target) * 100));
          if (!pcts.length) {
            const wKeys = ['W1', 'W2', 'W3', 'W4'];
            const wVals = wKeys.map(k => scores[k]?.raw_score).filter(v => v != null && v !== '').map(Number);
            if (wVals.length) {
              const avgW = wVals.reduce((a, b) => a + b, 0) / wVals.length;
              const pct = Math.round((avgW / 5) * 100);
              return { score: avgW.toFixed(2), pct, grade: calculateGrade(pct) };
            }
            return { score: null, pct: null, grade: '—' };
          }
          const avgPct = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
          const avgRaw = ((u1 != null && u1 !== '' ? Number(u1) : 0) + (u2 != null && u2 !== '' ? Number(u2) : 0)) / pcts.length;
          return { score: avgRaw.toFixed(1), pct: avgPct, grade: calculateGrade(avgPct) };
        }
      };
    }

    case 'SPEAKING':
    default:
      return {
        groups: [
          {
            title: 'DIAGNOSTIC',
            colorVar: '--primary-tactical',
            cols: [
              { key: 'PT', type: 'DIAGNOSTIC', target: 25, label: 'PT' }
            ]
          },
          ...(stepLevel === 3 ? [{
            title: 'WEEKLY ATTENDANCE',
            colorVar: '--grade-b',
            cols: [
              { key: 'W1', type: 'WEEKLY_DEPOSIT', target: 5, label: 'W1' },
              { key: 'W2', type: 'WEEKLY_DEPOSIT', target: 5, label: 'W2' },
              { key: 'W3', type: 'WEEKLY_DEPOSIT', target: 5, label: 'W3' },
              { key: 'W4', type: 'WEEKLY_DEPOSIT', target: 5, label: 'W4' }
            ]
          }] : []),
          {
            title: 'PERIODICAL EXAMS',
            colorVar: '--grade-a',
            cols: [
              { key: 'U1', type: 'PERIODIC_EXAM', target: 25, label: 'EX-1 (Max 25)' },
              { key: 'U2', type: 'PERIODIC_EXAM', target: 25, label: 'EX-2 (Max 25)' },
              ...(stepLevel === 1 ? [{ key: 'PRACTICE', type: 'PRACTICE', target: 25, label: 'EX-3 (Practice)' }] : (stepLevel === 3 ? [{ key: 'U3', type: 'PERIODIC_EXAM', target: 25, label: 'EX-3 (Max 25)' }] : []))
            ]
          }
        ],
        calcFinal: (scores) => {
          const u1 = scores['U1']?.raw_score;
          const u2 = scores['U2']?.raw_score;
          const u3 = scores['U3']?.raw_score;
          const pr = scores['PRACTICE']?.raw_score;
          const exams = [u1, u2, u3, pr].filter(v => v != null && v !== '').map(Number);
          if (!exams.length) {
            const wKeys = ['W1', 'W2', 'W3', 'W4'];
            const wVals = wKeys.map(k => scores[k]?.raw_score).filter(v => v != null && v !== '').map(Number);
            if (wVals.length) {
              const avgW = wVals.reduce((a, b) => a + b, 0) / wVals.length;
              const pct = Math.round((avgW / 5) * 100);
              return { score: avgW.toFixed(2), pct, grade: calculateGrade(pct) };
            }
            return { score: null, pct: null, grade: '—' };
          }
          const avg = exams.reduce((a, b) => a + b, 0) / exams.length;
          const pct = Math.min(100, Math.round((avg / 25) * 100));
          return { score: avg.toFixed(1), pct, grade: calculateGrade(pct) };
        }
      };
  }
}

/**
 * Main Renderer for Manual Academic Gradebook
 */
export async function renderAcademicGradebook({ container, currentClass, students = [], batchMap = {}, levelMap = {} }) {
  if (!container || !currentClass) return;
  _activeClassId = currentClass.id;

  const { discipline, subjectCode, stepLevel } = resolveClassSubjectAndStep(currentClass, levelMap);
  const schema = getSubjectSchema(subjectCode, stepLevel);

  // Fetch assessments from database for students in this class
  const supabase = await getSupabase();
  const studentIds = students.map(s => s.id);

  let assessments = [];
  if (studentIds.length > 0) {
    const { data, error } = await supabase
      .from('student_academic_assessments')
      .select('*')
      .in('student_id', studentIds)
      .eq('step_level', stepLevel)
      .eq('subject_code', subjectCode);
    if (!error && data) {
      assessments = data;
    }
  }
  _cachedAssessments = assessments;

  // Build map: studentId -> { [key]: record }
  const studentScoreMap = {};
  students.forEach(s => { studentScoreMap[s.id] = {}; });
  assessments.forEach(a => {
    if (!studentScoreMap[a.student_id]) studentScoreMap[a.student_id] = {};
    studentScoreMap[a.student_id][a.assessment_key] = a;
  });

  // Calculate final scores for stats
  const rowStats = students.map(s => {
    const scores = studentScoreMap[s.id] || {};
    const final = schema.calcFinal(scores);
    return { student: s, scores, final };
  });

  const validPcts = rowStats.map(r => r.final.pct).filter(p => p != null && !isNaN(p));
  const classAvgPct = validPcts.length ? Math.round(validPcts.reduce((a, b) => a + b, 0) / validPcts.length) : 0;
  const passedCount = validPcts.filter(p => p >= 60).length;
  const passRate = validPcts.length ? Math.round((passedCount / validPcts.length) * 100) : 0;

  // Flatten cols for thead & tbody
  const allCols = [];
  schema.groups.forEach(g => {
    g.cols.forEach(c => allCols.push({ ...c, groupTitle: g.title, groupColor: g.colorVar }));
  });

  // Build HTML Table Matrix (Strict Single Perimeter Ownership & Two-Tier Sticky Header)
  let html = `
    <div class="academic-gradebook-wrapper table-wrap" style="flex:1 1 0; min-height:0; display:flex; flex-direction:column; overflow:auto; position:relative; background:var(--clr-surface-card); border-radius:6px; border:1px solid var(--clr-border);">
      <table class="topscore-table gradebook-table" id="academic-gradebook-grid" style="width:100%; border-collapse:collapse; font-size:12px; text-align:left;">
        <thead>
          <!-- TIER 1: SUPER-HEADERS (top:0, height:30px) -->
          <tr style="position:sticky; top:0; z-index:10; background:var(--clr-surface-elevated);">
            <th colspan="4" style="height:30px; padding:4px 8px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid var(--clr-border); border-right:1px solid var(--clr-border); color:var(--clr-text-2);">
              STUDENT DEMOGRAPHICS
            </th>
            ${schema.groups.map(g => `
              <th colspan="${g.cols.length}" style="height:30px; padding:4px 8px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid var(--clr-border); border-right:1px solid var(--clr-border); color:var(${g.colorVar || '--clr-primary'}); text-align:center;">
                ${escapeHtml(g.title)}
              </th>
            `).join('')}
            <th colspan="3" style="height:30px; padding:4px 8px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid var(--clr-border); color:var(--grade-a); text-align:center;">
              SUBJECT COMPOSITE
            </th>
          </tr>

          <!-- TIER 2: SUB-HEADERS (top:30px, height:30px) -->
          <tr style="position:sticky; top:30px; z-index:9; background:var(--clr-surface-muted);">
            <th style="width:40px; text-align:center; height:30px; padding:4px 6px; border-bottom:1px solid var(--clr-border); color:var(--clr-text-3);">NO</th>
            <th style="width:75px; text-align:center; height:30px; padding:4px 6px; border-bottom:1px solid var(--clr-border); color:var(--clr-text-3);">NIS</th>
            <th style="min-width:180px; height:30px; padding:4px 8px; border-bottom:1px solid var(--clr-border); color:var(--clr-text-1);">STUDENT NAME</th>
            <th style="width:65px; text-align:center; height:30px; padding:4px 6px; border-bottom:1px solid var(--clr-border); border-right:1px solid var(--clr-border); color:var(--clr-text-3);">BATCH</th>
            
            ${allCols.map(col => `
              <th style="width:70px; text-align:center; height:30px; padding:4px 6px; border-bottom:1px solid var(--clr-border); border-right:1px solid var(--clr-border); color:var(--clr-text-2);">
                ${escapeHtml(col.label)}
                <span style="font-size:10px; color:var(--clr-text-3); display:block; font-weight:400;">/${col.target}</span>
              </th>
            `).join('')}

            <th style="width:80px; text-align:center; height:30px; padding:4px 6px; border-bottom:1px solid var(--clr-border); color:var(--clr-text-2);">SCORE</th>
            <th style="width:65px; text-align:center; height:30px; padding:4px 6px; border-bottom:1px solid var(--clr-border); color:var(--clr-text-2);">GRADE</th>
            <th style="width:85px; text-align:center; height:30px; padding:4px 6px; border-bottom:1px solid var(--clr-border); color:var(--clr-text-2);">STATUS</th>
          </tr>
        </thead>
        <tbody id="gradebook-tbody">
          ${rowStats.map((row, idx) => {
            const s = row.student;
            const nis = s.nis || '—';
            const bName = batchMap[s.batch_id]?.name || '134';
            const fin = row.final;
            const isPassed = fin.pct != null && fin.pct >= 60;
            const statusLabel = fin.pct == null ? '—' : (isPassed ? 'PASSED' : 'REMEDIAL');
            const statusColor = fin.pct == null ? 'var(--clr-text-3)' : (isPassed ? 'var(--grade-a)' : 'var(--grade-e)');

            return `
              <tr data-student-id="${s.id}" style="border-bottom:1px solid var(--clr-border-muted); transition:background 0.15s ease;">
                <td style="text-align:center; padding:6px; color:var(--clr-text-3);">${idx + 1}</td>
                <td style="text-align:center; padding:6px; font-family:monospace; font-size:11px; color:var(--clr-text-2);">${escapeHtml(nis)}</td>
                <td style="padding:6px 8px; font-weight:600; color:var(--clr-text-1);">
                  ${escapeHtml(cleanStudentName(s.name))}
                </td>
                <td style="text-align:center; padding:6px; border-right:1px solid var(--clr-border-muted);">
                  <span class="badge" style="background:rgba(255,255,255,0.06); padding:2px 6px; border-radius:4px; font-size:11px;">${escapeHtml(bName)}</span>
                </td>

                ${allCols.map(col => {
                  const item = row.scores[col.key];
                  const raw = item?.raw_score != null ? Number(item.raw_score) : '';
                  const cellId = `cell-${s.id}-${col.key}`;

                  if (_activeGradebookEditMode) {
                    return `
                      <td style="text-align:center; padding:3px; border-right:1px solid var(--clr-border-muted);">
                        <input type="number" 
                               step="0.5" 
                               min="0" 
                               max="${col.target * 1.5}" 
                               class="gradebook-cell-input" 
                               id="${cellId}"
                               data-student-id="${s.id}"
                               data-key="${col.key}"
                               data-type="${col.type}"
                               data-target="${col.target}"
                               value="${raw}"
                               placeholder="—"
                               style="width:54px; height:26px; text-align:center; background:#111827; border:1px solid #374151; border-radius:4px; color:#fff; font-size:12px; font-weight:600;" />
                      </td>
                    `;
                  } else {
                    const scoreDisplay = raw !== '' ? raw : '<span style="color:var(--clr-text-muted);">—</span>';
                    const pctVal = item?.percentage != null ? item.percentage : (raw !== '' && col.target > 0 ? (raw / col.target) * 100 : null);
                    const pillColor = pctVal != null ? getGradeColorByScore(pctVal) : 'transparent';

                    return `
                      <td id="${cellId}" 
                          class="gradebook-interactive-cell"
                          data-student-id="${s.id}"
                          data-key="${col.key}"
                          data-type="${col.type}"
                          data-target="${col.target}"
                          style="text-align:center; padding:6px; border-right:1px solid var(--clr-border-muted); cursor:pointer;"
                          title="Click to edit ${col.label}">
                        <span style="font-weight:600; color:${pctVal != null ? pillColor : 'inherit'};">
                          ${scoreDisplay}
                        </span>
                      </td>
                    `;
                  }
                }).join('')}

                <!-- COMPOSITE SCORE -->
                <td id="final-score-${s.id}" style="text-align:center; padding:6px; font-weight:700; color:var(--clr-text-1);">
                  ${fin.score != null ? `${fin.score} <span style="font-size:10px; font-weight:400; color:var(--clr-text-3);">(${fin.pct}%)</span>` : '—'}
                </td>
                
                <!-- COMPOSITE GRADE -->
                <td id="final-grade-${s.id}" style="text-align:center; padding:6px;">
                  ${fin.grade !== '—' ? formatGradeBadgeHtml(fin.grade, fin.pct) : '<span style="color:var(--clr-text-muted);">—</span>'}
                </td>

                <!-- COMPOSITE STATUS -->
                <td id="final-status-${s.id}" style="text-align:center; padding:6px; font-weight:700; font-size:11px; color:${statusColor};">
                  ${statusLabel}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = html;

  // Bind Inline Auto-Save and Edit Handlers
  setupGradebookInteractions(container, currentClass, batchMap, levelMap, schema);

  // Sync Authoritative Sub-Panel (40px Lower Panel SSOT)
  if (typeof window.setBottomInfobar === 'function') {
    const leftHtml = `
      <div style="display:flex; align-items:center; gap:8px;">
        <span class="badge" style="background:var(--primary-tactical); color:#000; font-weight:700; padding:3px 8px; border-radius:4px; font-size:11px;">
          ${escapeHtml(discipline)} MANUAL GRADEBOOK
        </span>
        <span style="color:var(--clr-text-2); font-size:12px;">
          ${students.length} Enrolled • Step ${stepLevel}
        </span>
      </div>
    `;

    const centerHtml = `
      <div style="display:flex; align-items:center; gap:16px; font-size:12px;">
        <span>Class Avg: <strong style="color:var(--grade-a);">${classAvgPct}%</strong></span>
        <span>Passing Rate: <strong style="color:${passRate >= 70 ? 'var(--grade-a)' : 'var(--grade-d)'};">${passRate}%</strong></span>
      </div>
    `;

    const rightHtml = `
      <div style="display:flex; align-items:center; gap:8px;">
        <button type="button" class="btn btn-sm ${_activeGradebookEditMode ? 'btn-primary' : 'btn-secondary'}" id="btn-toggle-gb-edit" style="height:28px; padding:0 12px; font-size:11px; font-weight:600;">
          ${_activeGradebookEditMode ? 'Finish Editing' : 'Toggle Edit Mode (M)'}
        </button>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-export-gb-csv" style="height:28px; padding:0 12px; font-size:11px; font-weight:600;">
          ${getSvgIcon('download', 12)} Export CSV
        </button>
      </div>
    `;

    window.setBottomInfobar(leftHtml, rightHtml, centerHtml);

    // Bind bottom infobar buttons
    document.getElementById('btn-toggle-gb-edit')?.addEventListener('click', () => {
      _activeGradebookEditMode = !_activeGradebookEditMode;
      renderAcademicGradebook({ container, currentClass, students, batchMap, levelMap });
    });

    document.getElementById('btn-export-gb-csv')?.addEventListener('click', () => {
      exportGradebookCsv(currentClass, rowStats, allCols);
    });
  }
}

/**
 * Setup interactions: live input change, blur auto-save, and keyboard navigation
 */
function setupGradebookInteractions(container, currentClass, batchMap, levelMap, schema) {
  const inputs = container.querySelectorAll('.gradebook-cell-input');

  inputs.forEach(input => {
    input.addEventListener('change', async (e) => {
      const el = e.target;
      const studentId = el.dataset.studentId;
      const key = el.dataset.key;
      const type = el.dataset.type;
      const target = Number(el.dataset.target) || 20;
      const rawVal = el.value.trim();

      const supabase = await getSupabase();
      if (!supabase) return;

      if (rawVal === '') {
        // Clear assessment
        await supabase
          .from('student_academic_assessments')
          .delete()
          .match({ student_id: studentId, step_level: currentClass.level_number || 1, subject_code: currentClass.code?.split('-')[1] || 'SPEAKING', assessment_key: key });
        recalcStudentRow(studentId, schema);
        return;
      }

      const numVal = parseFloat(rawVal);
      if (isNaN(numVal) || numVal < 0) {
        el.style.borderColor = 'var(--grade-e)';
        return;
      }

      const pct = target > 0 ? Math.min(100, Math.round((numVal / target) * 10000) / 100) : 0;
      const grade = calculateGrade(pct);
      const { subjectCode, stepLevel } = resolveClassSubjectAndStep(currentClass, levelMap);

      el.style.borderColor = 'var(--grade-b)';
      el.style.background = 'rgba(149, 255, 0, 0.15)';

      const { data, error } = await supabase
        .from('student_academic_assessments')
        .upsert({
          student_id: studentId,
          batch_id: currentClass.batch_id || '3e7288b7-a90e-4323-9b02-24e73991f0d7',
          class_id: currentClass.id,
          step_level: stepLevel,
          subject_code: subjectCode,
          assessment_type: type,
          assessment_key: key,
          raw_score: numVal,
          target_score: target,
          percentage: pct,
          grade: grade,
          updated_at: new Date().toISOString()
        }, { onConflict: 'student_id,step_level,subject_code,assessment_key' });

      setTimeout(() => {
        el.style.borderColor = '#374151';
        el.style.background = '#111827';
      }, 800);

      if (!error) {
        // Update in-memory cached assessment
        let found = _cachedAssessments.find(a => a.student_id === studentId && a.assessment_key === key);
        if (found) {
          found.raw_score = numVal;
          found.percentage = pct;
          found.grade = grade;
        } else {
          _cachedAssessments.push({ student_id: studentId, assessment_key: key, raw_score: numVal, percentage: pct, grade: grade });
        }
        recalcStudentRow(studentId, schema);
      }
    });
  });

  // Click on interactive non-edit cells to turn into edit mode
  container.querySelectorAll('.gradebook-interactive-cell').forEach(cell => {
    cell.addEventListener('dblclick', () => {
      _activeGradebookEditMode = true;
      renderAcademicGradebook({ container, currentClass, students: window._currentClassStudents || [], batchMap, levelMap });
    });
  });
}

/**
 * Live recalculation of student row after inline edit
 */
function recalcStudentRow(studentId, schema) {
  const studentAssessments = _cachedAssessments.filter(a => a.student_id === studentId);
  const scores = {};
  studentAssessments.forEach(a => { scores[a.assessment_key] = a; });
  const fin = schema.calcFinal(scores);

  const scoreEl = document.getElementById(`final-score-${studentId}`);
  const gradeEl = document.getElementById(`final-grade-${studentId}`);
  const statusEl = document.getElementById(`final-status-${studentId}`);

  if (scoreEl) {
    scoreEl.innerHTML = fin.score != null ? `${fin.score} <span style="font-size:10px; font-weight:400; color:var(--clr-text-3);">(${fin.pct}%)</span>` : '—';
  }
  if (gradeEl) {
    gradeEl.innerHTML = fin.grade !== '—' ? formatGradeBadgeHtml(fin.grade, fin.pct) : '<span style="color:var(--clr-text-muted);">—</span>';
  }
  if (statusEl) {
    const isPassed = fin.pct != null && fin.pct >= 60;
    statusEl.textContent = fin.pct == null ? '—' : (isPassed ? 'PASSED' : 'REMEDIAL');
    statusEl.style.color = fin.pct == null ? 'var(--clr-text-3)' : (isPassed ? 'var(--grade-a)' : 'var(--grade-e)');
  }
}

/**
 * Export Gradebook to CSV
 */
function exportGradebookCsv(currentClass, rowStats, allCols) {
  const headers = ['NO', 'NIS', 'STUDENT NAME', 'BATCH', ...allCols.map(c => `${c.label} (/${c.target})`), 'SCORE', 'GRADE', 'STATUS'];
  const lines = [headers.join(',')];

  rowStats.forEach((r, idx) => {
    const s = r.student;
    const row = [
      idx + 1,
      `"${s.nis || ''}"`,
      `"${cleanStudentName(s.name)}"`,
      `"${s.batch_name || '134'}"`,
      ...allCols.map(c => r.scores[c.key]?.raw_score ?? ''),
      r.final.score ?? '',
      r.final.grade ?? '',
      r.final.pct != null && r.final.pct >= 60 ? 'PASSED' : 'REMEDIAL'
    ];
    lines.push(row.join(','));
  });

  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Gradebook_${currentClass.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
