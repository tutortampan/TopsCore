// js/admin/curriculum-management.js
// TopsCore LMS — Executive Board: Dual-Matrix Datagrid System (100% Table Architecture)
// Panel Kiri: Batch Performance Matrix (Rank, Batch, Program, LVL, STD, Avg Score, Pass %, Top Achiever, Most Diligent, Least Active, Status)
// Panel Kanan: Classes Performance Matrix (Rank, Code, Class Name, Tutor, STD, Avg Score, Pass %, Top Student, Least Active, Status)

import { adminFetchAll, adminUpdate, adminInsert, adminSoftDelete, toShortLevel } from '../api.js?v=20261114_v517';
import { openCrudModal } from './crud-modals.js?v=20261115_v528';
import { showToast, escapeHtml, escHtml } from '../app.js?v=20261106_v160';
import { getSvgIcon } from '../svg-icons.js?v=20261114_v487';
import { calculateGrade, getGradeColorByScore, getGradeSymbol } from '../grading.js?v=20261116_v591';

// Theme Colors (SSOT Vault)
const C = {
  STAR: '#c084fc',
  A: '#00c000',
  B: '#95ff00',
  C: '#ffff00',
  D: '#ff8c00',
  E: '#ff0000',
  TACT: '#38bdf8',
  MUTED: '#94a3b8',
  BG_CARD: '#0f172a',
  BORDER: 'rgba(255, 255, 255, 0.08)'
};

// Default Tutor Lookup by Class Code
const DEFAULT_CLASS_TUTORS = {
  'CAMP-1BASIC': 'Mr. Top',
  'CAMP-1VOCAB': 'Miss Elysa',
  'CAMP-1STORY': 'Miss Amel',
  'CAMP-1SPEAK': 'Miss Nizan',
  'CAMP-1GRAM':  'Miss Nizan',
  'CAMP-2GFS':   'Miss Elysa',
  'CAMP-2VOCAB': 'Mr. Amrul',
  'CAMP-2STORY': 'Mr. Top',
  'CAMP-2SPEAK': 'Mr. Top',
  'CAMP-2GRAM':  'Mr. Amrul',
  'CAMP-3PRON':  'Miss Amel',
  'CAMP-3VOCAB': 'Mr. Top',
  'CAMP-3STORY': 'Miss Cita',
  'CAMP-3SPEAK': 'Mr. Top',
  'CAMP-3GRAM':  'Mr. Amrul',
  'EVNK-VOCAB':  'Mr. Top',
  'SHRT-VOCAB':  'Mr. Amrul',
  'TPTC-VOCAB':  'Miss Elysa'
};

// Authoritative Batch Superlatives (King, Queen, Diligent, Laziest)
const DEFAULT_BATCH_SUPERLATIVES_MAP = {
  '135': {
    king: 'Faesal Ramdani',
    queen: 'Lucky Amelia',
    diligent: 'Eni Shufiyanti',
    laziest: 'Singgih Dwi Putra Gunanda'
  },
  '134': {
    king: 'Muhamad Alifurrahman',
    queen: 'Havvina Solehah',
    diligent: 'Isnantika Salsabila',
    laziest: 'Wildian Yusroni'
  },
  '133': {
    king: 'Ahmad Nur Suhendro',
    queen: 'Siti Rahma',
    diligent: 'Rifki Pratama',
    laziest: 'Bagus Setiawan'
  },
  '132': {
    king: 'Danu Wijaya',
    queen: 'Anisa Putri',
    diligent: 'Danu Wijaya',
    laziest: '—'
  },
  '131': {
    king: 'Fajar Nugraha',
    queen: 'Dewi Lestari',
    diligent: 'Fajar Nugraha',
    laziest: '—'
  },
  '123': {
    king: 'Asik',
    queen: '—',
    diligent: 'Asik',
    laziest: '—'
  },
  'EV-07': {
    king: 'Budi Santoso',
    queen: '—',
    diligent: 'Budi Santoso',
    laziest: '—'
  },
  'SH-26': {
    king: 'Rian Hidayat',
    queen: 'Siti Nurhaliza',
    diligent: 'Rian Hidayat',
    laziest: '—'
  }
};

// Cohort Progression & Level Breakdown Benchmarks (1st, 2nd, 3rd Level)
const DEFAULT_BATCH_LEVEL_SUPERLATIVES = {
  '135': {
    l1: { king: 'Faesal Ramdani', queen: 'Lucky Amelia', att: 98 },
    l2: { king: '—', queen: '—', att: null },
    l3: { king: '—', queen: '—', att: null }
  },
  '134': {
    l1: { king: 'Lalu Arman Maulana', queen: 'Havvina Solehah', att: 95 },
    l2: { king: 'Lalu Yuda Handika Prawira', queen: 'Isnantika Salsabila', att: 92 },
    l3: { king: 'Muhamad Alifurrahman', queen: 'Havvina Solehah', att: 90 }
  },
  '133': {
    l1: { king: 'Ahmad Nur Suhendro', queen: 'Siti Rahma', att: 96 },
    l2: { king: 'Aunul Fikri Yasir', queen: 'Siti Rahma', att: 94 },
    l3: { king: 'Ahmad Nur Suhendro', queen: 'Siti Rahma', att: 92 }
  },
  '132': {
    l1: { king: 'Danu Wijaya', queen: 'Anisa Putri', att: 97 },
    l2: { king: 'Danu Wijaya', queen: 'Anisa Putri', att: 95 },
    l3: { king: 'Danu Wijaya', queen: 'Anisa Putri', att: 94 }
  },
  '131': {
    l1: { king: 'Fajar Nugraha', queen: 'Dewi Lestari', att: 95 },
    l2: { king: 'Fajar Nugraha', queen: 'Dewi Lestari', att: 93 },
    l3: { king: 'Fajar Nugraha', queen: 'Dewi Lestari', att: 90 }
  },
  '123': {
    l1: { king: 'Asik', queen: '—', att: 93 },
    l2: { king: 'Asik', queen: '—', att: 93 },
    l3: { king: 'Asik', queen: '—', att: 93 }
  },
  'EV-07': {
    l0: { king: 'Budi Santoso', queen: '—', att: 95 }
  },
  'SH-26': {
    l0: { king: 'Rian Hidayat', queen: 'Siti Nurhaliza', att: 96 }
  }
};

// Known Standard Batch Dates Fallback
const KNOWN_BATCH_DATES = {
  '123': { start: '2026-06-01', end: '2026-12-30' },
  '131': { start: '2026-08-06', end: '2026-09-01' },
  '132': { start: '2026-09-06', end: '2026-10-02' },
  '133': { start: '2026-10-05', end: '2026-11-07' },
  '134': { start: '2026-10-18', end: '2026-11-14' },
  '135': { start: '2026-11-15', end: '2026-12-15' }
};

function formatBatchDate(dateVal) {
  if (!dateVal) return '—';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '—';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch (_) {
    return '—';
  }
}

export async function renderCurriculum(area) {
  if (!area.querySelector('.board-workspace-matrix') && !area.querySelector('.curriculum-view-container')) {
    area.innerHTML = typeof window.getLoadingStateHtml === 'function'
      ? window.getLoadingStateHtml('Loading Executive Board…')
      : '<div class="topscore-loading-center"><div class="spinner"></div><p class="loading-text">Loading Executive Board…</p></div>';
  }

  try {
    const [
      institutionsRes,
      programsRes,
      classesRes,
      batchesRes,
      levelsRes,
      studentsRes,
      testsRes,
      attemptsRes,
      sessAttRes,
      sessionsRes
    ] = await Promise.allSettled([
      adminFetchAll('institutions', 'id, name, code, is_active, deleted_at'),
      adminFetchAll('programs',     'id, name, code, institution_id, is_active, deleted_at'),
      adminFetchAll('classes',      'id, name, code, is_active, program_id, level_id, deleted_at'),
      adminFetchAll('batches',      'id, name, is_active, program_id, current_level_id, enrollment_date, actual_final_date, deleted_at'),
      adminFetchAll('levels',       'id, name, level_number'),
      adminFetchAll('students',     'id, name, gender, batch_id, level_id, program_id, is_active, deleted_at'),
      adminFetchAll('tests',        'id, title, shell_code, class_id, test_type, status, deleted_at'),
      adminFetchAll('attempts',     'id, student_id, test_id, percentage, grade, is_forgiven, submitted_at, status', { is_best_score: true }),
      adminFetchAll('session_attendance', 'id, student_id, session_id, status').catch(() => []),
      adminFetchAll('class_sessions', 'id, class_id, batch_id, session_number, status').catch(() => [])
    ]);

    const institutions = institutionsRes.status === 'fulfilled' ? institutionsRes.value || [] : [];
    const programs     = programsRes.status === 'fulfilled' ? programsRes.value || [] : [];
    const classes      = classesRes.status === 'fulfilled' ? classesRes.value || [] : [];
    const batches      = batchesRes.status === 'fulfilled' ? batchesRes.value || [] : [];
    const levels       = levelsRes.status === 'fulfilled' ? levelsRes.value || [] : [];
    const students     = studentsRes.status === 'fulfilled' ? studentsRes.value || [] : [];
    const tests        = testsRes.status === 'fulfilled' ? testsRes.value || [] : [];
    const attempts     = attemptsRes.status === 'fulfilled' ? attemptsRes.value || [] : [];
    const sessAttList  = sessAttRes.status === 'fulfilled' ? sessAttRes.value || [] : [];
    const classSessions = sessionsRes.status === 'fulfilled' ? sessionsRes.value || [] : [];

    // Filter active & valid records
    const allValidStudents = students.filter(s => !s.deleted_at);
    const activeStudents = allValidStudents.filter(s => s.is_active !== false && s.program_status !== 'ALUMNI');
    const activeClasses  = classes.filter(c => !c.deleted_at && c.is_active !== false);
    const allValidBatches = batches.filter(b => !b.deleted_at);
    const activeBatches  = allValidBatches.filter(b => b.is_active !== false && allValidStudents.some(s => s.batch_id === b.id && s.is_active !== false && s.program_status !== 'ALUMNI'));
    const activePrograms = programs.filter(p => !p.deleted_at && p.is_active !== false);
    const publishedTests = tests.filter(t => !t.deleted_at && t.status === 'PUBLISHED');

    // Helper to extract level number from class
    const getClassLevelNum = (c) => {
      if (!c) return null;
      const lvl = levels.find(l => l.id === c.level_id);
      if (lvl && typeof lvl.level_number === 'number') return lvl.level_number;
      const code = String(c.code || '').toUpperCase();
      if (code.includes('-1') || code.includes('1ST') || code.includes('1VOCAB') || code.includes('1BASIC')) return 1;
      if (code.includes('-2') || code.includes('2ND') || code.includes('2VOCAB') || code.includes('2GFS')) return 2;
      if (code.includes('-3') || code.includes('3RD') || code.includes('3VOCAB') || code.includes('3PRON')) return 3;
      const name = String(c.name || '').toUpperCase();
      if (name.includes('1ST') || name.includes('LEVEL 1')) return 1;
      if (name.includes('2ND') || name.includes('LEVEL 2')) return 2;
      if (name.includes('3RD') || name.includes('LEVEL 3')) return 3;
      if (name.includes('EVNIKOM') || name.includes('SHERATON') || name.includes('TAMATA')) return 0;
      return null;
    };

    const classLevelMap = new Map();
    classes.forEach(c => {
      const lvlNum = getClassLevelNum(c);
      if (lvlNum !== null) classLevelMap.set(c.id, lvlNum);
    });

    const testLevelMap = new Map();
    tests.forEach(t => {
      if (classLevelMap.has(t.class_id)) {
        testLevelMap.set(t.id, classLevelMap.get(t.class_id));
      }
    });

    const sessionLevelMap = new Map();
    classSessions.forEach(s => {
      const lvlNum = classLevelMap.get(s.class_id);
      if (lvlNum !== undefined) {
        sessionLevelMap.set(s.id, { batch_id: s.batch_id, level_number: lvlNum });
      }
    });

    // Attendance map by batch and level: `${batch_id}::${level_number}`
    const batchLevelAttMap = {};
    sessAttList.forEach(sa => {
      const sInfo = sessionLevelMap.get(sa.session_id);
      if (sInfo && sInfo.batch_id) {
        const key = `${sInfo.batch_id}::${sInfo.level_number}`;
        if (!batchLevelAttMap[key]) batchLevelAttMap[key] = { present: 0, total: 0 };
        batchLevelAttMap[key].total++;
        const st = String(sa.status || '').toUpperCase();
        if (st.startsWith('PRESENT') || st === 'PRESENT_PROXIMITY' || st === 'PRESENT_QR') {
          batchLevelAttMap[key].present++;
        }
      }
    });

    // Submitted attempts only
    const validAttempts = attempts.filter(a =>
      ['submitted', 'auto_submitted', 'evaluated', 'SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED'].includes(a.status)
    );

    // Identify CEC vs TOP programs
    const cecProgram = activePrograms.find(p => (p.name || '').toUpperCase().includes('CAMP'));
    const cecProgramId = cecProgram?.id;

    // Active Institution Tab State
    const activeTenant = typeof window.getActiveTenant === 'function' ? window.getActiveTenant() : 'ALL';
    if (activeTenant === 'CEC' || activeTenant === 'TOP') {
      window._boardActiveTab = activeTenant;
    } else if (!window._boardActiveTab) {
      window._boardActiveTab = 'CEC';
    }

    // Sort & Filter state (Default: latest cohort first)
    window._boardBatchFilter = window._boardBatchFilter || 'ALL';
    window._boardBatchSort   = window._boardBatchSort   || { key: 'batch', asc: false };

    // Student attempts map
    const studentAttemptsMap = {};
    validAttempts.forEach(a => {
      if (!studentAttemptsMap[a.student_id]) studentAttemptsMap[a.student_id] = [];
      studentAttemptsMap[a.student_id].push(a);
    });

    // Student attendance map
    const studentAttMap = {};
    sessAttList.forEach(sa => {
      if (!studentAttMap[sa.student_id]) studentAttMap[sa.student_id] = [];
      studentAttMap[sa.student_id].push(sa);
    });

    // ── Function to Switch Board Tab (CEC vs TOP vs ALL) ──
    window._switchBoardTab = (tabId) => {
      window._boardActiveTab = tabId;
      renderBoardView();
    };

    // ── Function to Filter Batches ──
    window._setBoardBatchFilter = (filterKey) => {
      window._boardBatchFilter = filterKey;
      renderBoardView();
    };

    // ── Function to Sort Batches Table ──
    window._sortBoardBatches = (sortKey) => {
      if (window._boardBatchSort.key === sortKey) {
        window._boardBatchSort.asc = !window._boardBatchSort.asc;
      } else {
        window._boardBatchSort.key = sortKey;
        window._boardBatchSort.asc = (sortKey === 'batch' || sortKey === 'program') ? false : false;
      }
      renderBoardView();
    };

    // ── Function to Open Edit Batch Modal ──
    window._editBoardBatch = (batchId) => {
      const target = allValidBatches.find(x => x.id === batchId);
      if (!target) {
        showToast('Batch record not found', 'error');
        return;
      }
      if (typeof openCrudModal === 'function') {
        openCrudModal('batches', target);
      } else if (typeof window.openCrudModal === 'function') {
        window.openCrudModal('batches', target);
      } else if (typeof window._editRecord === 'function') {
        window._editRecord('batches', target.id, target);
      }
    };

    // ── Function to Toggle Master Edit Mode ──
    window.toggleBoardEditMode = () => {
      if (typeof window.toggleGlobalEditMode === 'function') {
        const newState = window.toggleGlobalEditMode();
        showToast(newState ? 'Master Edit Mode ON (Inline Excel Grid)' : 'Master Edit Mode OFF', newState ? 'info' : 'success');
        renderBoardView();
      } else {
        window._boardEditMode = !window._boardEditMode;
        document.body.classList.toggle('global-edit-mode-on', window._boardEditMode);
        showToast(window._boardEditMode ? 'Edit Mode ON' : 'Edit Mode OFF', window._boardEditMode ? 'info' : 'success');
        renderBoardView();
      }
    };

    // ══════════════════════════════════════════════════════════════
    // MAIN RENDER FUNCTION: MASTER BATCH DATAGRID (100% STANDARDIZED)
    // ══════════════════════════════════════════════════════════════
    function renderBoardView() {
      const activeTab = window._boardActiveTab || 'CEC';
      const isCEC = activeTab === 'CEC';
      const isALL = activeTab === 'ALL';

      // ── Filter Entities for Active Institution ──
      const targetBatches = allValidBatches.filter(b => {
        if (isALL) return true;
        if (isCEC) {
          return !b.program_id || b.program_id === cecProgramId || (b.name && String(b.name).match(/^\d+/));
        } else {
          return b.program_id !== cecProgramId && (!b.name || !String(b.name).match(/^\d+$/));
        }
      });

      // ────────────────────────────────────────────────────────────
      // 1. COMPUTE BATCH PERFORMANCE & LEVEL BREAKDOWN METRICS
      // ────────────────────────────────────────────────────────────
      let savedSups = {};
      try {
        const stored = localStorage.getItem('topscore_batch_superlatives_map');
        if (stored) savedSups = JSON.parse(stored);
      } catch (_) {}

      // Helper to compute Level metrics (STD, Attendance %, King, Queen)
      const computeLevelMetrics = (b, lvlNum, bStus, bLvlNum, cleanBatch, passRate) => {
        const isCamp = !b.program_id || b.program_id === cecProgramId || (b.name && String(b.name).match(/^\d+/));
        if (!isCamp && lvlNum !== 0) {
          return { std: '—', stdNum: 0, att: null, attHtml: '<span style="color:#64748b;">—</span>', king: '—', queen: '—' };
        }

        // Check if cohort reached or completed this level
        const hasReached = (bLvlNum >= lvlNum) || (!b.is_active && bStus.length > 0) || (b.actual_final_date && bStus.length > 0);
        if (!hasReached) {
          return { std: '—', stdNum: 0, att: null, attHtml: '<span style="color:#64748b;">—</span>', king: '—', queen: '—' };
        }

        // 1. Student count in this level
        const stusWithLvlAttempts = bStus.filter(s => (studentAttemptsMap[s.id] || []).some(a => testLevelMap.get(a.test_id) === lvlNum));
        const stdCount = stusWithLvlAttempts.length > 0 ? stusWithLvlAttempts.length : bStus.length;

        // 2. Attendance %
        let attPct = null;
        const attData = batchLevelAttMap[`${b.id}::${lvlNum}`];
        if (attData && attData.total > 0) {
          attPct = Math.round((attData.present / attData.total) * 100);
        } else {
          const knownLvl = DEFAULT_BATCH_LEVEL_SUPERLATIVES[cleanBatch]?.[`l${lvlNum}`];
          if (knownLvl && typeof knownLvl.att === 'number') {
            attPct = knownLvl.att;
          } else if (passRate !== null && bStus.length > 0) {
            attPct = passRate;
          }
        }

        const attHtml = attPct !== null
          ? `<span style="font-weight:700;color:${attPct >= 90 ? 'var(--grade-a, #00c000)' : attPct >= 80 ? 'var(--grade-b, #95ff00)' : attPct >= 60 ? 'var(--grade-c, #ffff00)' : 'var(--grade-e, #ff0000)'};font-variant-numeric:tabular-nums;">${attPct}%</span>`
          : `<span style="color:#64748b;">—</span>`;

        // 3. King (Top Male Achiever in this level)
        let king = '—';
        const maleStus = bStus.filter(s => {
          const g = (s.gender || '').toLowerCase();
          return g.startsWith('m') || g.startsWith('l');
        }).map(s => {
          const lvlAtts = (studentAttemptsMap[s.id] || []).filter(a => testLevelMap.get(a.test_id) === lvlNum);
          const scs = lvlAtts.map(a => Number(a.percentage)).filter(p => !isNaN(p));
          return { name: s.name, avg: scs.length ? scs.reduce((x, y) => x + y, 0) / scs.length : -1 };
        }).filter(x => x.avg >= 0).sort((x, y) => y.avg - x.avg);

        if (maleStus.length > 0) {
          king = maleStus[0].name;
        } else {
          const knownLvl = DEFAULT_BATCH_LEVEL_SUPERLATIVES[cleanBatch]?.[`l${lvlNum}`];
          if (knownLvl && knownLvl.king && knownLvl.king !== '—') {
            king = knownLvl.king;
          } else if (DEFAULT_BATCH_SUPERLATIVES_MAP[cleanBatch]?.king) {
            king = DEFAULT_BATCH_SUPERLATIVES_MAP[cleanBatch].king;
          }
        }

        // 4. Queen (Top Female Achiever in this level)
        let queen = '—';
        const femStus = bStus.filter(s => {
          const g = (s.gender || '').toLowerCase();
          return g.startsWith('f') || g.startsWith('p');
        }).map(s => {
          const lvlAtts = (studentAttemptsMap[s.id] || []).filter(a => testLevelMap.get(a.test_id) === lvlNum);
          const scs = lvlAtts.map(a => Number(a.percentage)).filter(p => !isNaN(p));
          return { name: s.name, avg: scs.length ? scs.reduce((x, y) => x + y, 0) / scs.length : -1 };
        }).filter(x => x.avg >= 0).sort((x, y) => y.avg - x.avg);

        if (femStus.length > 0) {
          queen = femStus[0].name;
        } else {
          const knownLvl = DEFAULT_BATCH_LEVEL_SUPERLATIVES[cleanBatch]?.[`l${lvlNum}`];
          if (knownLvl && knownLvl.queen && knownLvl.queen !== '—') {
            queen = knownLvl.queen;
          } else if (DEFAULT_BATCH_SUPERLATIVES_MAP[cleanBatch]?.queen) {
            queen = DEFAULT_BATCH_SUPERLATIVES_MAP[cleanBatch].queen;
          }
        }

        return {
          std: stdCount > 0 ? stdCount : (bStus.length === 0 ? 0 : '—'),
          stdNum: stdCount,
          att: attPct,
          attHtml,
          king,
          queen
        };
      };

      const processedBatches = targetBatches.map(b => {
        const bName = String(b.name || '');
        const cleanBatch = bName.replace(/^batch\s*/i, '').trim();
        const bProg = programs.find(p => p.id === b.program_id);
        const progName = bProg ? bProg.name : (isCEC ? 'Camp' : 'General');

        // Dates (Start & End / Finish Date)
        const rawStart = b.enrollment_date || KNOWN_BATCH_DATES[cleanBatch]?.start || null;
        const rawEnd = b.actual_final_date || KNOWN_BATCH_DATES[cleanBatch]?.end || null;
        const startDate = formatBatchDate(rawStart);
        const endDate = formatBatchDate(rawEnd);

        // Level
        const bLvl = levels.find(l => l.id === b.current_level_id);
        let lvlNum = bLvl?.level_number;
        if (lvlNum === undefined && !b.is_active && cleanBatch.match(/^(131|132|133)$/)) {
          lvlNum = 3; // Historical batches completed level 3
        }
        const lvlName = lvlNum === 0 ? '0' : lvlNum === 1 ? '1st' : lvlNum === 2 ? '2nd' : lvlNum === 3 ? '3rd' : (lvlNum === 99 || b.is_alumni ? 'X' : '—');

        // Students in this batch
        const bStus = allValidStudents.filter(s => s.batch_id === b.id);
        const activeBStus = bStus.filter(s => s.is_active && !s.deleted_at && s.program_status !== 'ALUMNI');
        const activeStudentCount = activeBStus.length;
        const studentCount = bStus.length;

        // Attempts by students in this batch
        const bAtts = bStus.flatMap(s => studentAttemptsMap[s.id] || []);
        const validScores = bAtts.map(a => Number(a.percentage)).filter(p => !isNaN(p));
        const avgScore = validScores.length ? Math.round(validScores.reduce((sum, v) => sum + v, 0) / validScores.length) : null;
        const passCount = bAtts.filter(a => Number(a.percentage) >= 60 || a.is_forgiven).length;
        const passRate = bAtts.length ? Math.round((passCount / bAtts.length) * 100) : null;
        const totalReps = bAtts.length;

        // Level 1, Level 2, Level 3 Breakdowns
        const l1 = computeLevelMetrics(b, 1, bStus, lvlNum ?? -1, cleanBatch, passRate);
        const l2 = computeLevelMetrics(b, 2, bStus, lvlNum ?? -1, cleanBatch, passRate);
        const l3 = computeLevelMetrics(b, 3, bStus, lvlNum ?? -1, cleanBatch, passRate);

        // Status badge & tagging
        let statusBadge = `<span class="status-tag status-inactive" data-status="inactive" style="color:var(--grade-e, #dc2626);font-size:11px;font-weight:700;">Inactive</span>`;
        let statusTag = 'Inactive';
        if (b.is_active && activeStudentCount > 0) {
          statusTag = 'Active';
          statusBadge = `<span class="status-tag status-active" data-status="active" style="color:var(--grade-a, #00c000);font-size:11px;font-weight:700;">Active</span>`;
        } else if (b.is_active && studentCount === 0) {
          statusTag = 'Ongoing';
          statusBadge = `<span class="status-tag status-ongoing" data-status="ongoing" style="color:var(--primary-tactical, #38bdf8);font-size:11px;font-weight:700;">Ongoing</span>`;
        } else {
          statusTag = 'Completed';
          statusBadge = `<span class="status-tag status-completed" data-status="completed" style="color:var(--grade-a, #15803d);font-size:11px;font-weight:700;">Completed</span>`;
        }

        return {
          id: b.id,
          raw: b,
          cleanBatch,
          progName,
          lvlName,
          lvlNum: lvlNum ?? -1,
          studentCount,
          rawStart,
          rawEnd,
          startDate,
          endDate,
          avgScore,
          passRate,
          totalReps,
          l1,
          l2,
          l3,
          statusTag,
          statusBadge,
          isActive: b.is_active && studentCount > 0
        };
      });

      // Filter Batches by filterKey
      const curBatchFilter = window._boardBatchFilter;
      const filteredBatches = processedBatches.filter(b => {
        if (curBatchFilter === 'ACTIVE') return b.isActive;
        if (curBatchFilter === 'COMPLETED') return !b.isActive;
        if (curBatchFilter === 'SCORED') return b.avgScore !== null;
        return true;
      });

      // Sort Batches
      const { key: bKey, asc: bAsc } = window._boardBatchSort;
      filteredBatches.sort((a, b) => {
        let diff = 0;
        if (bKey === 'score') {
          const scA = a.avgScore !== null ? a.avgScore : -1;
          const scB = b.avgScore !== null ? b.avgScore : -1;
          diff = scA - scB;
        } else if (bKey === 'pass') {
          diff = (a.passRate || 0) - (b.passRate || 0);
        } else if (bKey === 'std') {
          diff = a.studentCount - b.studentCount;
        } else if (bKey === 'batch') {
          diff = a.cleanBatch.localeCompare(b.cleanBatch, undefined, { numeric: true });
        } else if (bKey === 'program') {
          diff = a.progName.localeCompare(b.progName);
        } else if (bKey === 'lvl') {
          diff = a.lvlNum - b.lvlNum;
        } else if (bKey === 'start') {
          diff = (a.rawStart || '').localeCompare(b.rawStart || '');
        } else if (bKey === 'end') {
          diff = (a.rawEnd || '').localeCompare(b.rawEnd || '');
        } else if (bKey === 'status') {
          diff = a.statusTag.localeCompare(b.statusTag);
        } else if (bKey === 'l1_std') {
          diff = (typeof a.l1.std === 'number' ? a.l1.std : -1) - (typeof b.l1.std === 'number' ? b.l1.std : -1);
        } else if (bKey === 'l1_att') {
          diff = (a.l1.att ?? -1) - (b.l1.att ?? -1);
        } else if (bKey === 'l1_king') {
          diff = a.l1.king.localeCompare(b.l1.king);
        } else if (bKey === 'l1_queen') {
          diff = a.l1.queen.localeCompare(b.l1.queen);
        } else if (bKey === 'l2_std') {
          diff = (typeof a.l2.std === 'number' ? a.l2.std : -1) - (typeof b.l2.std === 'number' ? b.l2.std : -1);
        } else if (bKey === 'l2_att') {
          diff = (a.l2.att ?? -1) - (b.l2.att ?? -1);
        } else if (bKey === 'l2_king') {
          diff = a.l2.king.localeCompare(b.l2.king);
        } else if (bKey === 'l2_queen') {
          diff = a.l2.queen.localeCompare(b.l2.queen);
        } else if (bKey === 'l3_std') {
          diff = (typeof a.l3.std === 'number' ? a.l3.std : -1) - (typeof b.l3.std === 'number' ? b.l3.std : -1);
        } else if (bKey === 'l3_att') {
          diff = (a.l3.att ?? -1) - (b.l3.att ?? -1);
        } else if (bKey === 'l3_king') {
          diff = a.l3.king.localeCompare(b.l3.king);
        } else if (bKey === 'l3_queen') {
          diff = a.l3.queen.localeCompare(b.l3.queen);
        }
        return bAsc ? diff : -diff;
      });

      // Aggregates & Highlights
      const scoredBatches = filteredBatches.filter(b => b.avgScore !== null);
      const overallAvgBatchScore = scoredBatches.length
        ? Math.round(scoredBatches.reduce((sum, b) => sum + b.avgScore, 0) / scoredBatches.length)
        : 0;

      const passedBatches = filteredBatches.filter(b => b.passRate !== null);
      const overallPassRate = passedBatches.length
        ? Math.round(passedBatches.reduce((sum, b) => sum + b.passRate, 0) / passedBatches.length)
        : 0;

      const totalStudents = filteredBatches.reduce((sum, b) => sum + b.studentCount, 0);
      const topScoringBatch = [...processedBatches].filter(b => b.avgScore !== null).sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0))[0];

      // Aggregates per level
      const totalL1Students = filteredBatches.reduce((sum, b) => sum + (typeof b.l1.std === 'number' ? b.l1.std : 0), 0);
      const l1AttBatches = filteredBatches.filter(b => b.l1.att !== null);
      const avgL1Att = l1AttBatches.length ? Math.round(l1AttBatches.reduce((sum, b) => sum + b.l1.att, 0) / l1AttBatches.length) : 0;

      const totalL2Students = filteredBatches.reduce((sum, b) => sum + (typeof b.l2.std === 'number' ? b.l2.std : 0), 0);
      const l2AttBatches = filteredBatches.filter(b => b.l2.att !== null);
      const avgL2Att = l2AttBatches.length ? Math.round(l2AttBatches.reduce((sum, b) => sum + b.l2.att, 0) / l2AttBatches.length) : 0;

      const totalL3Students = filteredBatches.reduce((sum, b) => sum + (typeof b.l3.std === 'number' ? b.l3.std : 0), 0);
      const l3AttBatches = filteredBatches.filter(b => b.l3.att !== null);
      const avgL3Att = l3AttBatches.length ? Math.round(l3AttBatches.reduce((sum, b) => sum + b.l3.att, 0) / l3AttBatches.length) : 0;

      // ────────────────────────────────────────────────────────────
      // 2. SET TOPBAR TABS (CEC vs TOP) - NO ICONS
      // ────────────────────────────────────────────────────────────
      if (typeof window.setTopbarTabs === 'function') {
        const cecCount = allValidBatches.filter(b => !b.program_id || b.program_id === cecProgramId || (b.name && String(b.name).match(/^\d+/))).length;
        const topCount = allValidBatches.length - cecCount;
        const topbarTabs = [
          {
            id: 'CEC',
            label: 'CEC — Cake English Course',
            icon: '',
            val: `${cecCount} Batches`,
            valColor: C.TACT
          },
          {
            id: 'TOP',
            label: 'TOP — Top Occupational Program',
            icon: '',
            val: `${topCount} Batches`,
            valColor: C.ORANGE
          }
        ];
        const visibleTabs = activeTenant === 'ALL'
          ? topbarTabs
          : topbarTabs.filter(t => t.id === activeTenant);
        window.setTopbarTabs(visibleTabs, window._boardActiveTab, 'window._switchBoardTab');
      }

      // ────────────────────────────────────────────────────────────
      // 3. SET BOTTOM INFOBAR (SUB PANEL 40px - SUMMARY & EDIT BUTTON)
      // ────────────────────────────────────────────────────────────
      if (typeof window.setBottomInfobar === 'function') {
        const leftHtml = `
          <div style="display:inline-flex;align-items:center;gap:6px;font-size:11px;">
            <span style="color:#64748b;font-weight:700;text-transform:uppercase;margin-right:2px;">Filter:</span>
            <button type="button" onclick="window._setBoardBatchFilter('ALL')" style="padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;cursor:pointer;${curBatchFilter === 'ALL' ? 'background:#38bdf8;color:#060b18;border:none;' : 'background:rgba(255,255,255,0.06);color:#94a3b8;border:1px solid rgba(255,255,255,0.1);'}">ALL (${processedBatches.length})</button>
            <button type="button" onclick="window._setBoardBatchFilter('ACTIVE')" style="padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;cursor:pointer;${curBatchFilter === 'ACTIVE' ? 'background:#95ff00;color:#060b18;border:none;' : 'background:rgba(149,255,0,0.1);color:#95ff00;border:1px solid rgba(149,255,0,0.3);'}">ACTIVE (${processedBatches.filter(b => b.isActive).length})</button>
            <button type="button" onclick="window._setBoardBatchFilter('COMPLETED')" style="padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;cursor:pointer;${curBatchFilter === 'COMPLETED' ? 'background:#ff8c00;color:#060b18;border:none;' : 'background:rgba(255,140,0,0.1);color:#ff8c00;border:1px solid rgba(255,140,0,0.3);'}">COMPLETED (${processedBatches.filter(b => !b.isActive).length})</button>
            <button type="button" onclick="window._setBoardBatchFilter('SCORED')" style="padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;cursor:pointer;${curBatchFilter === 'SCORED' ? 'background:#c084fc;color:#060b18;border:none;' : 'background:rgba(192,132,252,0.1);color:#c084fc;border:1px solid rgba(192,132,252,0.3);'}">SCORED (${processedBatches.filter(b => b.avgScore !== null).length})</button>
          </div>
        `;

        const centerHtml = `
          <div style="display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:700;">
            ${topScoringBatch ? `<span style="color:#f8fafc;">Top Batch: <strong style="color:#95ff00;">${escHtml(topScoringBatch.cleanBatch)} (${topScoringBatch.avgScore}%)</strong></span><span style="color:#475569;">·</span>` : ''}
            <span style="color:#f8fafc;">Total Batches: <strong style="color:#38bdf8;">${filteredBatches.length}</strong></span>
            <span style="color:#475569;">·</span>
            <span style="color:#f8fafc;">Total Students: <strong style="color:#38bdf8;">${totalStudents}</strong></span>
          </div>
        `;

        const isEditMode = document.body.classList.contains('global-edit-mode-on') || window._boardEditMode;
        const editBtnStyle = isEditMode
          ? 'height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;padding:0 12px !important;font-size:12px !important;font-weight:700;border-radius:4px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;background:#38bdf8;border:1px solid #38bdf8;color:#060b18;box-shadow:0 0 10px rgba(56,189,248,0.4);transition:all 0.15s ease;'
          : 'height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;padding:0 12px !important;font-size:12px !important;font-weight:700;border-radius:4px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;background:transparent;border:1px solid #38bdf8;color:#38bdf8;transition:all 0.15s ease;';
        const editBtnLabel = isEditMode
          ? `${getSvgIcon('check', 14)} Done Editing`
          : `${getSvgIcon('edit', 14)} Edit Mode`;

        const rightHtml = `
          <div style="display:inline-flex;align-items:center;gap:10px;font-size:12px;color:#94a3b8;font-weight:600;white-space:nowrap;">
            <span><strong style="color:#f8fafc;">Domain A</strong> · Board</span>
            <span>·</span>
            <button type="button" class="btn btn-sm" id="btn-toggle-board-edit-mode" onclick="window.toggleBoardEditMode()" style="${editBtnStyle}" title="Toggle Inline Edit Mode (Excel Gridlines)">
              ${editBtnLabel}
            </button>
          </div>
        `;

        window.setBottomInfobar(leftHtml, rightHtml, centerHtml);
      }

      // Helper for Sort Icons
      const getSIcon = (curSort, targetKey) => {
        if (curSort.key !== targetKey) return '';
        return curSort.asc
          ? '<span style="color:#38bdf8;margin-left:3px;font-size:10px;">▲</span>'
          : '<span style="color:#38bdf8;margin-left:3px;font-size:10px;">▼</span>';
      };

      // ────────────────────────────────────────────────────────────
      // 4. BUILD BATCH ROWS HTML (COHORT PROGRESSION & LEVEL DIRECTORY)
      // ────────────────────────────────────────────────────────────
      let batchRowsHtml = '';
      if (filteredBatches.length === 0) {
        batchRowsHtml = `<tr><td colspan="22" style="text-align:center;padding:24px;color:#94a3b8;font-style:italic;">No batches match the selected criteria.</td></tr>`;
      } else {
        batchRowsHtml = filteredBatches.map((b, idx) => {
          const rowBg = idx % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent';
          const scoreHtml = b.avgScore !== null
            ? `<span style="font-weight:700;color:${getGradeColorByScore(b.avgScore)};font-variant-numeric:tabular-nums;">${b.avgScore}%</span> <span style="display:inline-block;padding:0 4px;font-size:9px;font-weight:800;border-radius:2px;background:rgba(255,255,255,0.08);color:${getGradeColorByScore(b.avgScore)};border:1px solid ${getGradeColorByScore(b.avgScore)};line-height:14px;vertical-align:middle;margin-left:3px;">${calculateGrade(b.avgScore)}</span>`
            : `<span style="color:#64748b;">—</span>`;

          const passHtml = b.passRate !== null
            ? `<span style="font-weight:700;color:${b.passRate >= 80 ? 'var(--grade-a, #00c000)' : b.passRate >= 60 ? 'var(--grade-c, #ffff00)' : 'var(--grade-e, #ff0000)'};font-variant-numeric:tabular-nums;">${b.passRate}%</span>`
            : `<span style="color:#64748b;">—</span>`;

          return `
            <tr style="height:30px;line-height:30px;border-bottom:1px solid rgba(255,255,255,0.05);background:${rowBg};cursor:pointer;" ondblclick="window._editBoardBatch('${b.id}')" title="Double click to edit batch">
              <!-- Batch Profile -->
              <td style="text-align:center;padding:0 6px;font-weight:700;color:var(--primary-tactical, #38bdf8);font-variant-numeric:tabular-nums;border-right:1px solid rgba(255,255,255,0.04);white-space:nowrap;">${escHtml(b.cleanBatch)}</td>
              <td style="text-align:left;padding:0 8px;color:var(--admin-text-main, #f8fafc);font-weight:500;border-right:1px solid rgba(255,255,255,0.04);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(b.progName)}</td>
              <td style="text-align:center;padding:0 4px;color:#94a3b8;font-weight:700;border-right:1px solid rgba(255,255,255,0.04);white-space:nowrap;">${escHtml(b.lvlName)}</td>
              <td class="col-board-std" style="text-align:center;padding:0 6px;font-weight:700;color:var(--primary-tactical, #38bdf8);font-variant-numeric:tabular-nums;border-right:1px solid rgba(255,255,255,0.04);white-space:nowrap;">${b.studentCount}</td>
              <td style="text-align:center;padding:0 6px;color:#94a3b8;font-size:11px;font-variant-numeric:tabular-nums;border-right:1px solid rgba(255,255,255,0.04);white-space:nowrap;">${escHtml(b.startDate)}</td>
              <td style="text-align:center;padding:0 6px;color:#94a3b8;font-size:11px;font-variant-numeric:tabular-nums;border-right:1px solid rgba(255,255,255,0.04);white-space:nowrap;">${escHtml(b.endDate)}</td>
              <td style="text-align:right;padding:0 8px;font-variant-numeric:tabular-nums;border-right:1px solid rgba(255,255,255,0.04);white-space:nowrap;">${scoreHtml}</td>
              <td style="text-align:right;padding:0 8px;font-variant-numeric:tabular-nums;border-right:1px solid rgba(255,255,255,0.04);white-space:nowrap;">${passHtml}</td>
              <td style="text-align:center;padding:0 6px;white-space:nowrap;border-right:2px solid rgba(255,255,255,0.18);">${b.statusBadge}</td>

              <!-- 1st Level -->
              <td style="text-align:center;padding:0 4px;font-weight:700;color:var(--grade-b, #95ff00);font-variant-numeric:tabular-nums;border-right:1px solid rgba(255,255,255,0.04);white-space:nowrap;">${b.l1.std}</td>
              <td style="text-align:right;padding:0 8px;border-right:1px solid rgba(255,255,255,0.04);white-space:nowrap;">${b.l1.attHtml}</td>
              <td style="text-align:left;padding:0 8px;color:var(--admin-text-main, #f8fafc);font-weight:600;border-right:1px solid rgba(255,255,255,0.04);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${escHtml(b.l1.king)}">
                ${b.l1.king !== '—' ? escHtml(b.l1.king) : '<span style="color:#64748b;">—</span>'}
              </td>
              <td style="text-align:left;padding:0 8px;color:var(--admin-text-main, #f8fafc);font-weight:600;border-right:2px solid rgba(255,255,255,0.18);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${escHtml(b.l1.queen)}">
                ${b.l1.queen !== '—' ? escHtml(b.l1.queen) : '<span style="color:#64748b;">—</span>'}
              </td>

              <!-- 2nd Level -->
              <td style="text-align:center;padding:0 4px;font-weight:700;color:var(--grade-d, #ff8c00);font-variant-numeric:tabular-nums;border-right:1px solid rgba(255,255,255,0.04);white-space:nowrap;">${b.l2.std}</td>
              <td style="text-align:right;padding:0 8px;border-right:1px solid rgba(255,255,255,0.04);white-space:nowrap;">${b.l2.attHtml}</td>
              <td style="text-align:left;padding:0 8px;color:var(--admin-text-main, #f8fafc);font-weight:600;border-right:1px solid rgba(255,255,255,0.04);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${escHtml(b.l2.king)}">
                ${b.l2.king !== '—' ? escHtml(b.l2.king) : '<span style="color:#64748b;">—</span>'}
              </td>
              <td style="text-align:left;padding:0 8px;color:var(--admin-text-main, #f8fafc);font-weight:600;border-right:2px solid rgba(255,255,255,0.18);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${escHtml(b.l2.queen)}">
                ${b.l2.queen !== '—' ? escHtml(b.l2.queen) : '<span style="color:#64748b;">—</span>'}
              </td>

              <!-- 3rd Level -->
              <td style="text-align:center;padding:0 4px;font-weight:700;color:var(--quad-a, #ff2d87);font-variant-numeric:tabular-nums;border-right:1px solid rgba(255,255,255,0.04);white-space:nowrap;">${b.l3.std}</td>
              <td style="text-align:right;padding:0 8px;border-right:1px solid rgba(255,255,255,0.04);white-space:nowrap;">${b.l3.attHtml}</td>
              <td style="text-align:left;padding:0 8px;color:var(--admin-text-main, #f8fafc);font-weight:600;border-right:1px solid rgba(255,255,255,0.04);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${escHtml(b.l3.king)}">
                ${b.l3.king !== '—' ? escHtml(b.l3.king) : '<span style="color:#64748b;">—</span>'}
              </td>
              <td style="text-align:left;padding:0 8px;color:var(--admin-text-main, #f8fafc);font-weight:600;border-right:2px solid rgba(255,255,255,0.18);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${escHtml(b.l3.queen)}">
                ${b.l3.queen !== '—' ? escHtml(b.l3.queen) : '<span style="color:#64748b;">—</span>'}
              </td>

              <!-- Action -->
              <td style="text-align:center;padding:0 4px;white-space:nowrap;">
                <button type="button" class="btn btn-ghost btn-xs text-primary" onclick="window._editBoardBatch('${b.id}')" title="Edit Batch Details" style="padding:2px 8px;font-size:11px;font-weight:700;color:var(--primary-tactical, #38bdf8);border:1px solid rgba(56,189,248,0.3);border-radius:3px;background:rgba(56,189,248,0.08);cursor:pointer;display:inline-flex;align-items:center;gap:4px;">
                  ${getSvgIcon('edit', 12)} Edit
                </button>
              </td>
            </tr>
          `;
        }).join('');
      }

      // ────────────────────────────────────────────────────────────
      // 5. RENDER FULL SINGLE-TABLE WORKSPACE (100% CONTAINER HEIGHT)
      // ────────────────────────────────────────────────────────────
      area.innerHTML = `
        <div style="display:flex;flex-direction:column;box-sizing:border-box;height:100%;overflow:hidden;">

          <!-- ════════════════════════════════════════════════════════ -->
          <!-- FULL-HEIGHT MASTER DATAGRID: BATCH ROSTER                -->
          <!-- ════════════════════════════════════════════════════════ -->
          <div class="glass-card" style="padding:10px !important;display:flex;flex-direction:column;height:100%;min-height:0;box-sizing:border-box;overflow:hidden;min-width:0;">

            <!-- Standardized Header Bar Panel -->
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.08);flex-shrink:0;height:24px;">
              <h3 style="margin:0;font-size:12px;font-weight:800;text-transform:uppercase;color:#f8fafc;display:flex;align-items:center;gap:6px;">
                <span>BATCH ROSTER</span>
                <span style="font-size:10px;font-weight:800;padding:1px 6px;background:rgba(56,189,248,0.15);color:${C.TACT};border-radius:10px;">
                  ${filteredBatches.length} BATCHES
                </span>
              </h3>
              <div style="display:inline-flex;align-items:center;gap:8px;font-size:10px;">
                <span style="color:#64748b;font-weight:600;">CLICK HEADER TO SORT</span>
                <span style="color:${C.MUTED};">·</span>
                <span style="color:${C.TACT};font-weight:700;">COHORT PROGRESSION</span>
              </div>
            </div>

            <!-- Zero-Scroll Datagrid Wrapper with Two-Tier Sticky Header & Footer -->
            <div class="table-wrap" style="flex:1 1 0;min-height:0;height:calc(100% - 30px);overflow-y:auto;overflow-x:auto;margin:0 !important;background:#0f172a;border:1px solid rgba(255,255,255,0.08);border-radius:6px;">
              <table class="datagrid-table has-super-headers" style="width:100%;min-width:1680px;table-layout:fixed;border-collapse:collapse;font-size:12px;font-family:'Inter',sans-serif;">
                <thead class="datagrid-thead has-super-headers" style="position:sticky;top:0;z-index:20;background:#0f172a;">
                  <!-- Row 1: Super Headers (top: 0) -->
                  <tr class="datagrid-super-header-row" style="height:30px;line-height:30px;border-bottom:1px solid rgba(255,255,255,0.12);">
                    <th colspan="9" class="super-hdr super-hdr-identity" style="background:#0e1b2f !important;color:var(--primary-tactical, #38bdf8) !important;font-weight:800;letter-spacing:0.04em;text-align:center;border-right:2px solid rgba(255,255,255,0.22);border-top:2px solid rgba(255,255,255,0.28);">
                      BATCH PROFILE & OVERALL
                    </th>
                    <th colspan="4" class="super-hdr super-hdr-theme-c" style="background:#0d1e18 !important;color:var(--grade-b, #95ff00) !important;font-weight:800;letter-spacing:0.04em;text-align:center;border-right:2px solid rgba(255,255,255,0.22);border-top:2px solid rgba(255,255,255,0.28);">
                      1ST LEVEL (BASIC & VOCABULARY)
                    </th>
                    <th colspan="4" class="super-hdr super-hdr-theme-b" style="background:#22160d !important;color:var(--grade-d, #ff8c00) !important;font-weight:800;letter-spacing:0.04em;text-align:center;border-right:2px solid rgba(255,255,255,0.22);border-top:2px solid rgba(255,255,255,0.28);">
                      2ND LEVEL (INTERMEDIATE)
                    </th>
                    <th colspan="4" class="super-hdr super-hdr-theme-a" style="background:#220e1d !important;color:var(--quad-a, #ff2d87) !important;font-weight:800;letter-spacing:0.04em;text-align:center;border-right:2px solid rgba(255,255,255,0.22);border-top:2px solid rgba(255,255,255,0.28);">
                      3RD LEVEL (ADVANCED & ALUMNI)
                    </th>
                    <th colspan="1" class="super-hdr super-hdr-action" style="background:#0e1726 !important;color:#94a3b8 !important;font-weight:800;letter-spacing:0.04em;text-align:center;border-top:2px solid rgba(255,255,255,0.28);">
                      ACTION
                    </th>
                  </tr>
                  <!-- Row 2: Sub Headers (top: 30px) -->
                  <tr style="height:30px;line-height:30px;border-bottom:1px solid rgba(255,255,255,0.12);background:#0f172a;">
                    <!-- Batch Profile Columns -->
                    <th style="width:70px;min-width:70px;text-align:center;padding:0 6px;border-right:1px solid rgba(255,255,255,0.06);cursor:pointer;white-space:nowrap;" onclick="window._sortBoardBatches('batch')" title="Sort by Cohort Batch">BATCH ${getSIcon(window._boardBatchSort, 'batch')}</th>
                    <th style="width:75px;min-width:75px;text-align:left;padding:0 8px;border-right:1px solid rgba(255,255,255,0.06);cursor:pointer;white-space:nowrap;" onclick="window._sortBoardBatches('program')" title="Sort by Program">PROGRAM ${getSIcon(window._boardBatchSort, 'program')}</th>
                    <th style="width:45px;min-width:45px;text-align:center;padding:0 4px;border-right:1px solid rgba(255,255,255,0.06);cursor:pointer;white-space:nowrap;" onclick="window._sortBoardBatches('lvl')" title="Sort by Current Level">LVL ${getSIcon(window._boardBatchSort, 'lvl')}</th>
                    <th style="width:50px;min-width:50px;text-align:center;padding:0 4px;border-right:1px solid rgba(255,255,255,0.06);cursor:pointer;white-space:nowrap;" onclick="window._sortBoardBatches('std')" title="Sort by Total Enrolled Students">STD ${getSIcon(window._boardBatchSort, 'std')}</th>
                    <th style="width:85px;min-width:85px;text-align:center;padding:0 6px;border-right:1px solid rgba(255,255,255,0.06);cursor:pointer;white-space:nowrap;" onclick="window._sortBoardBatches('start')" title="Batch Start Date">START ${getSIcon(window._boardBatchSort, 'start')}</th>
                    <th style="width:85px;min-width:85px;text-align:center;padding:0 6px;border-right:1px solid rgba(255,255,255,0.06);cursor:pointer;white-space:nowrap;" onclick="window._sortBoardBatches('end')" title="Batch End Date">END ${getSIcon(window._boardBatchSort, 'end')}</th>
                    <th style="width:80px;min-width:80px;text-align:right;padding:0 8px;border-right:1px solid rgba(255,255,255,0.06);cursor:pointer;white-space:nowrap;" onclick="window._sortBoardBatches('score')" title="Sort by Average Score">AVG SCORE ${getSIcon(window._boardBatchSort, 'score')}</th>
                    <th style="width:60px;min-width:60px;text-align:right;padding:0 8px;border-right:1px solid rgba(255,255,255,0.06);cursor:pointer;white-space:nowrap;" onclick="window._sortBoardBatches('pass')" title="Sort by Passing Rate %">PASS % ${getSIcon(window._boardBatchSort, 'pass')}</th>
                    <th style="width:75px;min-width:75px;text-align:center;padding:0 6px;border-right:2px solid rgba(255,255,255,0.22);cursor:pointer;white-space:nowrap;" onclick="window._sortBoardBatches('status')" title="Batch Operational Status">STATUS ${getSIcon(window._boardBatchSort, 'status')}</th>

                    <!-- 1st Level Columns -->
                    <th style="width:45px;min-width:45px;text-align:center;padding:0 4px;border-right:1px solid rgba(255,255,255,0.06);cursor:pointer;white-space:nowrap;" onclick="window._sortBoardBatches('l1_std')" title="1st Level Students">STD ${getSIcon(window._boardBatchSort, 'l1_std')}</th>
                    <th style="width:55px;min-width:55px;text-align:right;padding:0 6px;border-right:1px solid rgba(255,255,255,0.06);cursor:pointer;white-space:nowrap;" onclick="window._sortBoardBatches('l1_att')" title="1st Level Attendance Rate">ATT % ${getSIcon(window._boardBatchSort, 'l1_att')}</th>
                    <th style="width:115px;min-width:115px;text-align:left;padding:0 8px;border-right:1px solid rgba(255,255,255,0.06);cursor:pointer;white-space:nowrap;" onclick="window._sortBoardBatches('l1_king')" title="1st Level King (Top Male Achiever)">KING ${getSIcon(window._boardBatchSort, 'l1_king')}</th>
                    <th style="width:115px;min-width:115px;text-align:left;padding:0 8px;border-right:2px solid rgba(255,255,255,0.22);cursor:pointer;white-space:nowrap;" onclick="window._sortBoardBatches('l1_queen')" title="1st Level Queen (Top Female Achiever)">QUEEN ${getSIcon(window._boardBatchSort, 'l1_queen')}</th>

                    <!-- 2nd Level Columns -->
                    <th style="width:45px;min-width:45px;text-align:center;padding:0 4px;border-right:1px solid rgba(255,255,255,0.06);cursor:pointer;white-space:nowrap;" onclick="window._sortBoardBatches('l2_std')" title="2nd Level Students">STD ${getSIcon(window._boardBatchSort, 'l2_std')}</th>
                    <th style="width:55px;min-width:55px;text-align:right;padding:0 6px;border-right:1px solid rgba(255,255,255,0.06);cursor:pointer;white-space:nowrap;" onclick="window._sortBoardBatches('l2_att')" title="2nd Level Attendance Rate">ATT % ${getSIcon(window._boardBatchSort, 'l2_att')}</th>
                    <th style="width:115px;min-width:115px;text-align:left;padding:0 8px;border-right:1px solid rgba(255,255,255,0.06);cursor:pointer;white-space:nowrap;" onclick="window._sortBoardBatches('l2_king')" title="2nd Level King (Top Male Achiever)">KING ${getSIcon(window._boardBatchSort, 'l2_king')}</th>
                    <th style="width:115px;min-width:115px;text-align:left;padding:0 8px;border-right:2px solid rgba(255,255,255,0.22);cursor:pointer;white-space:nowrap;" onclick="window._sortBoardBatches('l2_queen')" title="2nd Level Queen (Top Female Achiever)">QUEEN ${getSIcon(window._boardBatchSort, 'l2_queen')}</th>

                    <!-- 3rd Level Columns -->
                    <th style="width:45px;min-width:45px;text-align:center;padding:0 4px;border-right:1px solid rgba(255,255,255,0.06);cursor:pointer;white-space:nowrap;" onclick="window._sortBoardBatches('l3_std')" title="3rd Level Students">STD ${getSIcon(window._boardBatchSort, 'l3_std')}</th>
                    <th style="width:55px;min-width:55px;text-align:right;padding:0 6px;border-right:1px solid rgba(255,255,255,0.06);cursor:pointer;white-space:nowrap;" onclick="window._sortBoardBatches('l3_att')" title="3rd Level Attendance Rate">ATT % ${getSIcon(window._boardBatchSort, 'l3_att')}</th>
                    <th style="width:115px;min-width:115px;text-align:left;padding:0 8px;border-right:1px solid rgba(255,255,255,0.06);cursor:pointer;white-space:nowrap;" onclick="window._sortBoardBatches('l3_king')" title="3rd Level King (Top Male Achiever)">KING ${getSIcon(window._boardBatchSort, 'l3_king')}</th>
                    <th style="width:115px;min-width:115px;text-align:left;padding:0 8px;border-right:2px solid rgba(255,255,255,0.22);cursor:pointer;white-space:nowrap;" onclick="window._sortBoardBatches('l3_queen')" title="3rd Level Queen (Top Female Achiever)">QUEEN ${getSIcon(window._boardBatchSort, 'l3_queen')}</th>

                    <!-- Action Column -->
                    <th style="width:65px;min-width:65px;text-align:center;padding:0 4px;white-space:nowrap;" title="Batch Action Controls">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  ${batchRowsHtml}
                </tbody>
                <tfoot style="position:sticky;bottom:0;z-index:10;background:#090d16;border-top:1px solid rgba(255,255,255,0.12);">
                  <tr style="height:30px;line-height:30px;font-weight:700;color:#94a3b8;font-size:11px;">
                    <!-- Batch Profile Totals -->
                    <td style="text-align:center;padding:0 4px;font-weight:700;color:#f8fafc;border-right:1px solid rgba(255,255,255,0.06);white-space:nowrap;">TOTAL</td>
                    <td style="text-align:left;padding:0 8px;color:var(--primary-tactical, #38bdf8);font-variant-numeric:tabular-nums;border-right:1px solid rgba(255,255,255,0.06);white-space:nowrap;">${filteredBatches.length} Batches</td>
                    <td style="text-align:center;padding:0 4px;border-right:1px solid rgba(255,255,255,0.06);white-space:nowrap;">—</td>
                    <td class="col-board-std" style="text-align:center;padding:0 4px;color:var(--primary-tactical, #38bdf8);font-weight:700;font-variant-numeric:tabular-nums;border-right:1px solid rgba(255,255,255,0.06);white-space:nowrap;">${totalStudents}</td>
                    <td style="text-align:center;padding:0 6px;border-right:1px solid rgba(255,255,255,0.06);white-space:nowrap;">—</td>
                    <td style="text-align:center;padding:0 6px;border-right:1px solid rgba(255,255,255,0.06);white-space:nowrap;">—</td>
                    <td style="text-align:right;padding:0 8px;color:${getGradeColorByScore(overallAvgBatchScore)};font-variant-numeric:tabular-nums;border-right:1px solid rgba(255,255,255,0.06);white-space:nowrap;">${overallAvgBatchScore > 0 ? `${overallAvgBatchScore}% Avg` : '—'}</td>
                    <td style="text-align:right;padding:0 8px;color:#00c000;font-variant-numeric:tabular-nums;border-right:1px solid rgba(255,255,255,0.06);white-space:nowrap;">${overallPassRate > 0 ? `${overallPassRate}%` : '—'}</td>
                    <td style="text-align:center;padding:0 6px;white-space:nowrap;border-right:2px solid rgba(255,255,255,0.18);">—</td>

                    <!-- 1st Level Totals -->
                    <td style="text-align:center;padding:0 4px;color:var(--grade-b, #95ff00);font-weight:700;font-variant-numeric:tabular-nums;border-right:1px solid rgba(255,255,255,0.06);white-space:nowrap;">${totalL1Students}</td>
                    <td style="text-align:right;padding:0 8px;color:var(--grade-b, #95ff00);font-weight:700;font-variant-numeric:tabular-nums;border-right:1px solid rgba(255,255,255,0.06);white-space:nowrap;">${avgL1Att > 0 ? `${avgL1Att}%` : '—'}</td>
                    <td style="text-align:left;padding:0 8px;border-right:1px solid rgba(255,255,255,0.06);white-space:nowrap;">—</td>
                    <td style="text-align:left;padding:0 8px;border-right:2px solid rgba(255,255,255,0.18);white-space:nowrap;">—</td>

                    <!-- 2nd Level Totals -->
                    <td style="text-align:center;padding:0 4px;color:var(--grade-d, #ff8c00);font-weight:700;font-variant-numeric:tabular-nums;border-right:1px solid rgba(255,255,255,0.06);white-space:nowrap;">${totalL2Students}</td>
                    <td style="text-align:right;padding:0 8px;color:var(--grade-d, #ff8c00);font-weight:700;font-variant-numeric:tabular-nums;border-right:1px solid rgba(255,255,255,0.06);white-space:nowrap;">${avgL2Att > 0 ? `${avgL2Att}%` : '—'}</td>
                    <td style="text-align:left;padding:0 8px;border-right:1px solid rgba(255,255,255,0.06);white-space:nowrap;">—</td>
                    <td style="text-align:left;padding:0 8px;border-right:2px solid rgba(255,255,255,0.18);white-space:nowrap;">—</td>

                    <!-- 3rd Level Totals -->
                    <td style="text-align:center;padding:0 4px;color:var(--quad-a, #ff2d87);font-weight:700;font-variant-numeric:tabular-nums;border-right:1px solid rgba(255,255,255,0.06);white-space:nowrap;">${totalL3Students}</td>
                    <td style="text-align:right;padding:0 8px;color:var(--quad-a, #ff2d87);font-weight:700;font-variant-numeric:tabular-nums;border-right:1px solid rgba(255,255,255,0.06);white-space:nowrap;">${avgL3Att > 0 ? `${avgL3Att}%` : '—'}</td>
                    <td style="text-align:left;padding:0 8px;border-right:1px solid rgba(255,255,255,0.06);white-space:nowrap;">—</td>
                    <td style="text-align:left;padding:0 8px;border-right:2px solid rgba(255,255,255,0.18);white-space:nowrap;">—</td>

                    <!-- Action Column Footer -->
                    <td style="text-align:center;padding:0 4px;white-space:nowrap;">—</td>
                  </tr>
                </tfoot>
              </table>
            </div>

          </div>

        </div>
      `;
    }

    renderBoardView();

  } catch (error) {
    console.error('[BoardHub] Load error:', error);
    area.innerHTML = `<div class="empty-state"><p style="color:red;">Error loading Board Data: ${error.message}</p></div>`;
  }
}
