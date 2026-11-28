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
let _cachedCbtTests = [];

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

function getMinMaxCellColor(raw, min, max) {
  if (raw === '' || raw === null || raw === undefined || isNaN(Number(raw))) return 'var(--clr-text-3)';
  const val = Number(raw);
  if (max != null && val >= max) return 'var(--grade-a, #00c000)';
  if (min != null) {
    if (val < min) return 'var(--grade-e, #ff0000)';
    // Borderline / pas-pasan: exactly at MIN or within 10% above MIN
    const range = (max || min) - min;
    const yellowCap = min + Math.max(1, Math.floor(range * 0.1));
    if (val <= yellowCap && val < (max || Infinity)) return 'var(--grade-c, #ffff00)';
    return 'var(--grade-a, #00c000)';
  }
  const pct = max > 0 ? (val / max) * 100 : 0;
  return getGradeColorByScore(pct);
}

/**
 * Schema definition for each subject's columns and assessment targets (Official Step 1/2/3 Min & Max SSOT)
 */
function getSubjectSchema(subjectCode, stepLevel) {
  switch (subjectCode) {
    case 'VOCABULARY': {
      const ptTarget = stepLevel === 1 ? 30 : 50;
      const vTargets = stepLevel === 2
        ? { W1: 120, W2: 280, W3: 440, W4: 600 }
        : (stepLevel === 3
            ? { W1: 150, W2: 400, W3: 650, W4: 800 }
            : { W1: 90, W2: 210, W3: 300, W4: 450 });
      const vMins = stepLevel === 2
        ? { W1: 75, W2: 155, W3: 235, W4: 315 }
        : (stepLevel === 3
            ? { W1: 90, W2: 215, W3: 340, W4: 415 }
            : { W1: 60, W2: 120, W3: 180, W4: 240 });
      return {
        groups: [
          {
            title: 'DIAGNOSTIC',
            colorVar: '--primary-tactical',
            cols: [
              { key: 'PT', type: 'DIAGNOSTIC', min: null, target: ptTarget, label: 'PT' }
            ]
          },
          {
            title: 'WEEKLY WORD DEPOSITS',
            colorVar: '--grade-b',
            cols: [
              { key: 'W1', type: 'WEEKLY_DEPOSIT', min: vMins.W1, target: vTargets.W1, label: 'W1' },
              { key: 'W2', type: 'WEEKLY_DEPOSIT', min: vMins.W2, target: vTargets.W2, label: 'W2' },
              { key: 'W3', type: 'WEEKLY_DEPOSIT', min: vMins.W3, target: vTargets.W3, label: 'W3' },
              { key: 'W4', type: 'WEEKLY_DEPOSIT', min: vMins.W4, target: vTargets.W4, label: 'W4' }
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
            title: 'WEEKLY PERFORMANCE EXAMS',
            colorVar: '--grade-d',
            cols: [
              { key: 'W1', type: 'WEEKLY_DEPOSIT', min: 3, target: 5, label: 'EX-1' },
              { key: 'W2', type: 'WEEKLY_DEPOSIT', min: 3, target: 5, label: 'EX-2' },
              { key: 'W3', type: 'WEEKLY_DEPOSIT', min: 3, target: 5, label: 'EX-3' },
              { key: 'W4', type: 'WEEKLY_DEPOSIT', min: 3, target: 5, label: 'EX-4' }
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

    case 'GFS':
      return {
        groups: [
          {
            title: 'PERIODICAL EXAMS',
            colorVar: '--grade-a',
            cols: [
              { key: 'U1', type: 'PERIODIC_EXAM', min: 12, target: 20, label: 'EX-1' },
              { key: 'U2', type: 'PERIODIC_EXAM', min: 12, target: 20, label: 'EX-2' }
            ]
          }
        ],
        calcFinal: (scores) => {
          const exams = ['U1', 'U2'].map(k => scores[k]?.raw_score).filter(v => v != null && v !== '').map(Number);
          if (!exams.length) return { score: null, pct: null, grade: '—' };
          const avg = exams.reduce((a, b) => a + b, 0) / exams.length;
          const pct = Math.min(100, Math.round((avg / 20) * 100));
          return { score: avg.toFixed(1), pct, grade: calculateGrade(pct) };
        }
      };

    case 'PRONUNCIATION':
      return {
        groups: [
          {
            title: 'PERIODICAL EXAMS',
            colorVar: '--grade-a',
            cols: [
              { key: 'U1', type: 'PERIODIC_EXAM', min: 10, target: 25, label: 'EX-1' },
              { key: 'U2', type: 'PERIODIC_EXAM', min: 10, target: 25, label: 'EX-2' }
            ]
          }
        ],
        calcFinal: (scores) => {
          const exams = ['U1', 'U2'].map(k => scores[k]?.raw_score).filter(v => v != null && v !== '').map(Number);
          if (!exams.length) return { score: null, pct: null, grade: '—' };
          const avg = exams.reduce((a, b) => a + b, 0) / exams.length;
          const pct = Math.min(100, Math.round((avg / 25) * 100));
          return { score: avg.toFixed(1), pct, grade: calculateGrade(pct) };
        }
      };

    case 'GRAMMAR': {
      const ptTarget = stepLevel === 2 ? 30 : (stepLevel === 3 ? 15 : 25);
      const ptMin = stepLevel === 2 ? 10 : null;
      const gU1Target = stepLevel === 2 ? 30 : 15;
      const gU2Target = stepLevel === 1 ? 20 : (stepLevel === 2 ? 30 : 15);
      const gU1Min = stepLevel === 2 ? 17 : 8;
      const gU2Min = stepLevel === 1 ? 12 : (stepLevel === 2 ? 17 : 8);
      return {
        groups: [
          {
            title: 'DIAGNOSTIC',
            colorVar: '--primary-tactical',
            cols: [
              { key: 'PT', type: 'DIAGNOSTIC', min: ptMin, target: ptTarget, label: 'PT' }
            ]
          },
          {
            title: 'PERIODICAL EXAMS',
            colorVar: '--grade-a',
            cols: [
              { key: 'U1', type: 'PERIODIC_EXAM', min: gU1Min, target: gU1Target, label: 'EX-1' },
              { key: 'U2', type: 'PERIODIC_EXAM', min: gU2Min, target: gU2Target, label: 'EX-2' }
            ]
          }
        ],
        calcFinal: (scores) => {
          const u1 = scores['U1']?.raw_score;
          const u2 = scores['U2']?.raw_score;
          const pcts = [];
          if (u1 != null && u1 !== '') pcts.push(Math.min(100, (Number(u1) / gU1Target) * 100));
          if (u2 != null && u2 !== '') pcts.push(Math.min(100, (Number(u2) / gU2Target) * 100));
          if (!pcts.length) return { score: null, pct: null, grade: '—' };
          const avgPct = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
          const avgRaw = ((u1 != null && u1 !== '' ? Number(u1) : 0) + (u2 != null && u2 !== '' ? Number(u2) : 0)) / pcts.length;
          return { score: avgRaw.toFixed(1), pct: avgPct, grade: calculateGrade(avgPct) };
        }
      };
    }

    case 'BASIC':
      return {
        groups: [
          {
            title: 'PERIODICAL EXAMS',
            colorVar: '--grade-a',
            cols: [
              { key: 'U1', type: 'PERIODIC_EXAM', min: 60, target: 100, label: 'EX-1' },
              { key: 'U2', type: 'PERIODIC_EXAM', min: 60, target: 100, label: 'EX-2' }
            ]
          }
        ],
        calcFinal: (scores) => {
          const exams = ['U1', 'U2'].map(k => scores[k]?.raw_score).filter(v => v != null && v !== '').map(Number);
          if (!exams.length) return { score: null, pct: null, grade: '—' };
          const avg = Math.round(exams.reduce((a, b) => a + b, 0) / exams.length);
          return { score: `${avg}%`, pct: avg, grade: calculateGrade(avg) };
        }
      };

    case 'SPEAKING':
    default: {
      const spkExamMin = stepLevel === 1 ? 10 : (stepLevel === 2 ? 12 : 15);
      return {
        groups: [
          {
            title: 'DIAGNOSTIC',
            colorVar: '--primary-tactical',
            cols: [
              { key: 'PT', type: 'DIAGNOSTIC', min: 5, target: 25, label: 'PT' }
            ]
          },
          {
            title: 'PERIODICAL EXAMS',
            colorVar: '--grade-a',
            cols: [
              { key: 'U1', type: 'PERIODIC_EXAM', min: spkExamMin, target: 25, label: 'EX-1' },
              { key: 'U2', type: 'PERIODIC_EXAM', min: spkExamMin, target: 25, label: 'EX-2' },
              ...(stepLevel === 1 ? [{ key: 'PRACTICE', type: 'PRACTICE', min: 5, target: 25, label: 'EX-3' }] : (stepLevel === 3 ? [{ key: 'U3', type: 'PERIODIC_EXAM', min: spkExamMin, target: 25, label: 'EX-3' }] : []))
            ]
          }
        ],
        calcFinal: (scores) => {
          const u1 = scores['U1']?.raw_score;
          const u2 = scores['U2']?.raw_score;
          const u3 = scores['U3']?.raw_score;
          const pr = scores['PRACTICE']?.raw_score;
          const exams = [u1, u2, u3, pr].filter(v => v != null && v !== '').map(Number);
          if (!exams.length) return { score: null, pct: null, grade: '—' };
          const avg = exams.reduce((a, b) => a + b, 0) / exams.length;
          const pct = Math.min(100, Math.round((avg / 25) * 100));
          return { score: avg.toFixed(1), pct, grade: calculateGrade(pct) };
        }
      };
    }
  }
}

export function getAcademicGradebookEditMode() {
  return _activeGradebookEditMode;
}

export function setAcademicGradebookEditMode(val) {
  _activeGradebookEditMode = Boolean(val);
}

/**
 * Main Renderer for Manual Academic Gradebook
 */
export async function renderAcademicGradebook({ container, currentClass, students = [], batchMap = {}, levelMap = {}, skipInfobar = false, cbtTests = null }) {
  if (!container || !currentClass) return;
  _activeClassId = currentClass.id;
  if (Array.isArray(cbtTests)) {
    _cachedCbtTests = cbtTests;
  }

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

  // Fallback for Basic English CBT exams (EX-1: Tell Me What You See, EX-2: 100 Questions Exam)
  if (subjectCode === 'BASIC' && _cachedCbtTests.length > 0 && studentIds.length > 0) {
    const examMap = {};
    _cachedCbtTests.forEach(t => {
      const code = String(t.shell_code || '').toUpperCase();
      const title = String(t.title || '').toLowerCase();
      const themeCode = String(t.payload?.theme_code || '').toUpperCase();
      if (title.includes('tell me') || code.includes('1BSC-A') || code.includes('1BAS-A') || themeCode === 'A') {
        examMap[t.id] = 'U1';
      } else if (title.includes('100 question') || title.includes('selection') || code.includes('1BSC-B') || code.includes('1BSC-C') || code.includes('1BAS-B') || code.includes('1BAS-C') || themeCode === 'B' || themeCode === 'C') {
        examMap[t.id] = 'U2';
      }
    });
    const examTestIds = Object.keys(examMap);
    if (examTestIds.length > 0) {
      const { data: cbtAtts } = await supabase
        .from('attempts')
        .select('student_id, test_id, score, total_questions, percentage, status')
        .in('student_id', studentIds)
        .in('test_id', examTestIds)
        .in('status', ['submitted', 'auto_submitted', 'evaluated', 'graded']);
      if (Array.isArray(cbtAtts)) {
        const bestByStudentKey = {};
        cbtAtts.forEach(att => {
          const uKey = examMap[att.test_id];
          if (!uKey) return;
          const tq = Number(att.total_questions || 100);
          const pct = att.percentage != null ? Number(att.percentage) : (tq > 0 ? (Number(att.score || 0) / tq) * 100 : 0);
          const rawScore = Math.round(pct);
          const mapKey = `${att.student_id}:${uKey}`;
          if (!bestByStudentKey[mapKey] || rawScore > bestByStudentKey[mapKey].raw_score) {
            bestByStudentKey[mapKey] = {
              student_id: att.student_id,
              assessment_key: uKey,
              raw_score: rawScore,
              percentage: Math.round(pct * 100) / 100,
              grade: calculateGrade(pct),
              is_cbt_fallback: true
            };
          }
        });
        Object.values(bestByStudentKey).forEach(fb => {
          const hasManual = assessments.some(a => a.student_id === fb.student_id && a.assessment_key === fb.assessment_key);
          if (!hasManual) {
            assessments.push(fb);
          }
        });
      }
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

  // Build HTML Table Matrix (Strict Single Perimeter Ownership & 3-Tier Sticky Header with PTS | MIN | MAX)
  let html = `
    <div class="academic-gradebook-wrapper table-wrap" style="flex:1 1 0; min-height:0; display:flex; flex-direction:column; overflow:auto; position:relative; background:var(--clr-surface-card); border-radius:6px; border:1px solid var(--clr-border);">
      <table class="topscore-table gradebook-table" id="academic-gradebook-grid" style="width:max-content; min-width:100%; border-collapse:collapse; font-size:12px !important; text-align:left;">
        <thead>
          <!-- TIER 1: GROUP SUPER-HEADERS (top:0, height:30px) -->
          <tr style="position:sticky; top:0; z-index:11; background:#0b1120;">
            <th colspan="3" style="height:30px; padding:0 8px; font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:0.4px; border-bottom:1px solid rgba(255,255,255,0.15); border-right:1px solid rgba(255,255,255,0.15); color:#f8fafc; text-align:center; background:#0b1120;">
              STUDENT DEMOGRAPHICS
            </th>
            ${schema.groups.map(g => {
              const gSpan = g.cols.reduce((acc, c) => acc + (c.min != null ? 3 : 2), 0);
              return `
                <th colspan="${gSpan}" style="height:30px; padding:0 8px; font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:0.4px; border-bottom:1px solid rgba(255,255,255,0.15); border-right:1px solid rgba(255,255,255,0.15); color:var(${g.colorVar || '--primary-tactical'}); text-align:center; background:#0b1120;">
                  ${escapeHtml(g.title)}
                </th>
              `;
            }).join('')}
            <th colspan="3" style="height:30px; padding:0 8px; font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:0.4px; border-bottom:1px solid rgba(255,255,255,0.15); color:var(--grade-star, #a855f7); text-align:center; background:#0b1120;">
              SUBJECT COMPOSITE
            </th>
          </tr>

          <!-- TIER 2: EXAM SUB-HEADERS (top:30px, height:26px) -->
          <tr style="position:sticky; top:30px; z-index:10; background:#0f172a;">
            <th rowspan="2" style="width:36px; min-width:36px; text-align:center; padding:0 4px; font-size:12px; font-weight:700; border-bottom:1px solid rgba(255,255,255,0.2); border-right:1px solid rgba(255,255,255,0.08); color:#64748b; background:#0f172a; white-space:nowrap;">NO</th>
            <th rowspan="2" style="min-width:240px; text-align:left !important; padding:0 10px; font-size:12px; font-weight:700; border-bottom:1px solid rgba(255,255,255,0.2); border-right:1px solid rgba(255,255,255,0.08); color:#f8fafc; background:#0f172a; white-space:nowrap;">STUDENT NAME</th>
            <th rowspan="2" style="width:56px; min-width:56px; text-align:center; padding:0 4px; font-size:12px; font-weight:700; border-bottom:1px solid rgba(255,255,255,0.2); border-right:1px solid rgba(255,255,255,0.15); color:#f8fafc; background:#0f172a; white-space:nowrap;">BATCH</th>

            ${allCols.map(col => {
              const cSpan = col.min != null ? 3 : 2;
              return `
                <th colspan="${cSpan}" style="text-align:center; height:26px; padding:0 4px; font-size:12px; font-weight:700; border-bottom:1px solid rgba(255,255,255,0.12); border-right:1px solid rgba(255,255,255,0.12); color:var(${col.groupColor || '--primary-tactical'}); background:#0f172a; white-space:nowrap;">
                  ${escapeHtml(col.label)}
                </th>
              `;
            }).join('')}

            <th rowspan="2" style="width:78px; min-width:74px; text-align:center; padding:0 6px; font-size:12px; font-weight:700; border-bottom:1px solid rgba(255,255,255,0.2); border-right:1px solid rgba(255,255,255,0.08); color:var(--grade-star, #a855f7); background:#0f172a; white-space:nowrap;">SCORE</th>
            <th rowspan="2" style="width:56px; min-width:54px; text-align:center; padding:0 4px; font-size:12px; font-weight:700; border-bottom:1px solid rgba(255,255,255,0.2); border-right:1px solid rgba(255,255,255,0.08); color:var(--grade-star, #a855f7); background:#0f172a; white-space:nowrap;">GRADE</th>
            <th rowspan="2" style="width:76px; min-width:72px; text-align:center; padding:0 4px; font-size:12px; font-weight:700; border-bottom:1px solid rgba(255,255,255,0.2); color:var(--grade-star, #a855f7); background:#0f172a; white-space:nowrap;">STATUS</th>
          </tr>

          <!-- TIER 3: PTS | MIN | MAX SUB-SUB HEADERS (top:56px, height:22px) -->
          <tr style="position:sticky; top:56px; z-index:9; background:#111827;">
            ${allCols.map(col => `
              <th style="width:46px; min-width:44px; text-align:center; height:22px; padding:0 3px; font-size:11px; font-weight:700; border-bottom:1px solid rgba(255,255,255,0.2); border-right:1px solid rgba(255,255,255,0.06); color:#f8fafc; background:#111827; white-space:nowrap;">PTS</th>
              ${col.min != null ? `<th style="width:38px; min-width:36px; text-align:center; height:22px; padding:0 3px; font-size:11px; font-weight:600; border-bottom:1px solid rgba(255,255,255,0.2); border-right:1px solid rgba(255,255,255,0.06); color:#64748b; background:#0b1120; white-space:nowrap;">MIN</th>` : ''}
              <th style="width:38px; min-width:36px; text-align:center; height:22px; padding:0 3px; font-size:11px; font-weight:600; border-bottom:1px solid rgba(255,255,255,0.2); border-right:1px solid rgba(255,255,255,0.12); color:#64748b; background:#0b1120; white-space:nowrap;">MAX</th>
            `).join('')}
          </tr>
        </thead>
        <tbody id="gradebook-tbody">
          ${rowStats.map((row, idx) => {
            const s = row.student;
            const bName = batchMap[s.batch_id]?.name || '134';
            const fin = row.final;
            const isPassed = fin.pct != null && fin.pct >= 60;
            const statusLabel = fin.pct == null ? '—' : (isPassed ? 'PASSED' : 'REMEDIAL');
            const statusColor = fin.pct == null ? 'var(--clr-text-3)' : (isPassed ? 'var(--grade-a)' : 'var(--grade-e)');

            return `
              <tr data-student-id="${s.id}" style="height:32px; border-bottom:1px solid rgba(255,255,255,0.06); transition:background 0.15s ease;">
                <td style="text-align:center; padding:0 4px; color:#64748b; background:rgba(2,6,23,0.35); font-weight:500; font-variant-numeric:tabular-nums; border-right:1px solid rgba(255,255,255,0.06);">${idx + 1}</td>
                <td style="text-align:left !important; padding:0 10px !important; font-weight:600; color:var(--clr-text-1); white-space:nowrap; border-right:1px solid rgba(255,255,255,0.06);">
                  ${escapeHtml(cleanStudentName(s.name))}
                </td>
                <td style="text-align:center; padding:0 4px; border-right:1px solid rgba(255,255,255,0.12); background:rgba(2,6,23,0.35); font-variant-numeric:tabular-nums;">
                  <span style="color:#64748b; font-size:12px; font-weight:500;">${escapeHtml(bName)}</span>
                </td>

                ${allCols.map(col => {
                  const item = row.scores[col.key];
                  const raw = item?.raw_score != null ? Number(item.raw_score) : '';
                  const cellId = `cell-${s.id}-${col.key}`;
                  const minCell = col.min != null
                    ? `<td style="text-align:center; padding:0 3px; font-size:12px; font-weight:500; font-variant-numeric:tabular-nums; color:#64748b; background:rgba(2,6,23,0.35); border-right:1px solid rgba(255,255,255,0.06);">${col.min}</td>`
                    : '';
                  const maxCell = `<td style="text-align:center; padding:0 3px; font-size:12px; font-weight:500; font-variant-numeric:tabular-nums; color:#64748b; background:rgba(2,6,23,0.35); border-right:1px solid rgba(255,255,255,0.12);">${col.target}</td>`;

                  if (_activeGradebookEditMode) {
                    return `
                      <td style="text-align:center; padding:2px 3px; border-right:1px solid rgba(255,255,255,0.06);">
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
                               style="width:42px; height:24px; text-align:center; background:#111827; border:1px solid #38bdf8; border-radius:4px; color:#fff; font-size:12px; font-weight:700;" />
                      </td>
                      ${minCell}
                      ${maxCell}
                    `;
                  } else {
                    const scoreDisplay = raw !== '' ? raw : '<span style="color:var(--clr-text-muted);">—</span>';
                    const ptsColor = raw !== '' ? getMinMaxCellColor(raw, col.min, col.target) : 'inherit';

                    return `
                      <td id="${cellId}"
                          class="gradebook-interactive-cell"
                          data-student-id="${s.id}"
                          data-key="${col.key}"
                          data-type="${col.type}"
                          data-target="${col.target}"
                          style="text-align:center; padding:0 4px; border-right:1px solid rgba(255,255,255,0.06); cursor:pointer; font-variant-numeric:tabular-nums;"
                          title="${col.label}: ${raw !== '' ? raw : '—'} (Min ${col.min ?? '—'} / Max ${col.target})">
                        <span style="font-weight:700; color:${ptsColor};">
                          ${scoreDisplay}
                        </span>
                      </td>
                      ${minCell}
                      ${maxCell}
                    `;
                  }
                }).join('')}

                <!-- COMPOSITE SCORE -->
                <td id="final-score-${s.id}" style="text-align:center; padding:6px; font-weight:700; color:var(--clr-text-1);">
                  ${fin.score != null ? (String(fin.score).includes('%') ? fin.score : `${fin.score} <span style="font-size:10px; font-weight:400; color:var(--clr-text-3);">(${fin.pct}%)</span>`) : '—'}
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
  if (!skipInfobar && typeof window.setBottomInfobar === 'function') {
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
        const { subjectCode, stepLevel } = resolveClassSubjectAndStep(currentClass, levelMap);
        await supabase
          .from('student_academic_assessments')
          .delete()
          .match({ student_id: studentId, step_level: stepLevel, subject_code: subjectCode, assessment_key: key });
        _cachedAssessments = _cachedAssessments.filter(a => !(a.student_id === studentId && a.assessment_key === key));
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
    scoreEl.innerHTML = fin.score != null ? (String(fin.score).includes('%') ? fin.score : `${fin.score} <span style="font-size:10px; font-weight:400; color:var(--clr-text-3);">(${fin.pct}%)</span>`) : '—';
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
