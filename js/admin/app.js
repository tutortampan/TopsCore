import { DataGrid } from './datagrid.js?v=20261114_v500';
import { escapeHtml, escHtml, showToast, showLoading, hideLoading, getGrade, calculateGrade, getGradeColorByScore, getGradeColor, getGradeSymbol, GRADE_PALETTE, TOPSCORE_COLORS, isExam, isWeeklyExam, computeMilestoneExamMastery } from '../app.js?v=20261106_v160';
import { computeUnifiedScore, computeTopicPassLevel, detectClassDiscipline, isVocabularyClass, isManualEvaluationClass, isCbtEvaluationClass } from '../grading.js?v=20261106_v160';
import { fetchClassTestSettings, updateTestPassingScore, saveClassTestSettings, formatMatrixStudentName, adminApplyForgiven, logAuditEvent, calculateAutoDurationMinutes } from '../api.js?v=20261124_v683';
import { getSvgIcon } from '../svg-icons.js?v=20261114_v487';

if (typeof window !== 'undefined') {
  window.showToast = showToast;
}

// =========================================================
// UNIVERSAL CENTERED LOADING STATE HELPER (Rule 22 / Rule 2.35)
// =========================================================
export function getLoadingStateHtml(message = 'Loading...') {
  const safeMsg = escapeHtml(message || 'Loading...');
  return `
    <div class="topscore-loading-center">
      <div class="spinner"></div>
      <p class="loading-text">${safeMsg}</p>
    </div>
  `;
}
if (typeof window !== 'undefined') {
  window.getLoadingStateHtml = getLoadingStateHtml;
}

// =========================================================
// EXCEL-STYLE TABLE COLUMN RESIZER
// =========================================================
export function makeTableResizable(table, storageKey) {
  const cols = table.querySelectorAll('th');
  let cachedWidths = {};
  try {
    cachedWidths = JSON.parse(localStorage.getItem(storageKey) || '{}');
  } catch (_) {
    cachedWidths = {};
  }

  [].forEach.call(cols, function (col, index) {
    if (cachedWidths[index]) {
      col.style.width = cachedWidths[index];
    }
    const resizer = document.createElement('div');
    resizer.classList.add('col-resizer');
    col.appendChild(resizer);

    let x = 0;
    let w = 0;

    const mouseDownHandler = function (e) {
      x = e.clientX;
      const styles = window.getComputedStyle(col);
      w = parseInt(styles.width, 10);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      resizer.classList.add('active');
      document.addEventListener('mousemove', mouseMoveHandler);
      document.addEventListener('mouseup', mouseUpHandler);
    };

    const mouseMoveHandler = function (e) {
      const dx = e.clientX - x;
      col.style.width = `${w + dx}px`;
    };

    const mouseUpHandler = function () {
      resizer.classList.remove('active');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
      const newWidths = {};
      [].forEach.call(cols, (th, idx) => {
        newWidths[idx] = window.getComputedStyle(th).width;
      });
      localStorage.setItem(storageKey, JSON.stringify(newWidths));
    };

    resizer.addEventListener('mousedown', mouseDownHandler);
  });
}

// =========================================================
// GENERIC GLOBAL TABLE SORTER
// =========================================================
document.addEventListener('click', (e) => {
  const th = e.target.closest('th');
  if (!th) return;
  const table = th.closest('table');
  if (!table) return;

  // Ignore datagrid, explicitly ignored tables, or custom sortable tables
  if (table.classList.contains('datagrid-table') || table.classList.contains('no-sort')) return;
  if (th.classList.contains('sortable') || th.classList.contains('no-sort')) return;

  const text = th.textContent.replace(/▲|▼/g, '').trim().toLowerCase();
  if (!text || text === 'actions' || text === 'action') return;

  const tbody = table.querySelector('tbody');
  if (!tbody) return;

  const tr = th.closest('tr');
  const index = Array.from(tr.children).indexOf(th);

  const isAsc = th.dataset.sortDir !== 'asc';

  // Reset other headers
  table.querySelectorAll('th').forEach(header => {
    if (header !== th) {
      header.dataset.sortDir = '';
      const icon = header.querySelector('.global-sort-icon');
      if (icon) icon.remove();
    }
  });

  th.dataset.sortDir = isAsc ? 'asc' : 'desc';
  let icon = th.querySelector('.global-sort-icon');
  if (!icon) {
    icon = document.createElement('span');
    icon.className = 'global-sort-icon';
    icon.style.fontSize = '12px';
    icon.style.opacity = '0.6';
    icon.style.marginLeft = '4px';
    th.appendChild(icon);
  }
  icon.innerHTML = isAsc ? '&#9650;' : '&#9660;';

  const rows = Array.from(tbody.querySelectorAll('tr'));
  // Filter out empty state rows
  const dataRows = rows.filter(r => !r.querySelector('.empty-state, [colspan]'));
  if (dataRows.length <= 1) return;

  dataRows.sort((a, b) => {
    const tdA = a.children[index];
    const tdB = b.children[index];
    if (!tdA || !tdB) return 0;

    // Dataset sort-val takes precedence over text content
    let valA = tdA.dataset.sortVal !== undefined ? tdA.dataset.sortVal : tdA.textContent.trim();
    let valB = tdB.dataset.sortVal !== undefined ? tdB.dataset.sortVal : tdB.textContent.trim();

    // Try numeric sort first
    const numA = parseFloat(valA.replace(/,/g, ''));
    const numB = parseFloat(valB.replace(/,/g, ''));
    if (!isNaN(numA) && !isNaN(numB) && valA !== '' && valB !== '') {
      valA = numA;
      valB = numB;
    } else {
      valA = String(valA).toLowerCase();
      valB = String(valB).toLowerCase();
    }

    if (valA < valB) return isAsc ? -1 : 1;
    if (valA > valB) return isAsc ? 1 : -1;
    return 0;
  });

  // Re-append sorted rows
  dataRows.forEach(row => tbody.appendChild(row));
});

// Inject global styling for sortable generic headers
const sortableStyle = document.createElement('style');
sortableStyle.textContent = `
  table:not(.datagrid-table) th:not(.no-sort):not(.sortable) {
    cursor: pointer;
    user-select: none;
    transition: background-color 0.2s;
  }
  table:not(.datagrid-table) th:not(.no-sort):not(.sortable):hover {
    background-color: rgba(255,255,255,0.05);
  }
`;
document.head.appendChild(sortableStyle);

// =========================================================
// GENERIC GLOBAL TABLE COLUMN REORDERING
// =========================================================
document.addEventListener('mousedown', (e) => {
  const th = e.target.closest('th');
  if (!th || th.closest('.datagrid-table')) return;
  if (e.target.classList.contains('col-resizer')) return;
  th.setAttribute('draggable', 'true');
});

document.addEventListener('dragstart', (e) => {
  const th = e.target.closest('th');
  if (!th || !th.closest('table:not(.datagrid-table)')) return;
  if (e.target.classList.contains('col-resizer')) {
    e.preventDefault();
    return;
  }
  e.dataTransfer.effectAllowed = 'move';
  const tr = th.closest('tr');
  th.dataset.dragSourceIdx = Array.from(tr.children).indexOf(th);
  th.style.opacity = '0.5';
});

document.addEventListener('dragover', (e) => {
  const th = e.target.closest('th');
  if (!th || !th.closest('table:not(.datagrid-table)')) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  th.style.borderLeft = '2px solid var(--clr-primary)';
});

document.addEventListener('dragleave', (e) => {
  const th = e.target.closest('th');
  if (!th || !th.closest('table:not(.datagrid-table)')) return;
  th.style.borderLeft = '';
});

document.addEventListener('dragend', (e) => {
  const th = e.target.closest('th');
  if (!th) return;
  th.style.opacity = '1';
  document.querySelectorAll('th').forEach(t => t.style.borderLeft = '');
});

document.addEventListener('drop', (e) => {
  const th = e.target.closest('th');
  if (!th || !th.closest('table:not(.datagrid-table)')) return;
  e.preventDefault();
  th.style.borderLeft = '';

  const table = th.closest('table');
  const sourceTh = table.querySelector('th[data-drag-source-idx]');
  if (!sourceTh) return;

  const fromIdx = parseInt(sourceTh.dataset.dragSourceIdx, 10);
  sourceTh.removeAttribute('data-drag-source-idx');

  const tr = th.closest('tr');
  const toIdx = Array.from(tr.children).indexOf(th);

  if (fromIdx === toIdx) return;

  if (toIdx > fromIdx) {
    tr.insertBefore(sourceTh, th.nextSibling);
  } else {
    tr.insertBefore(sourceTh, th);
  }

  table.querySelectorAll('tbody tr').forEach(row => {
    const cells = Array.from(row.children);
    if (cells.length > Math.max(fromIdx, toIdx)) {
      const sourceTd = cells[fromIdx];
      const targetTd = cells[toIdx];
      if (toIdx > fromIdx) {
        row.insertBefore(sourceTd, targetTd.nextSibling);
      } else {
        row.insertBefore(sourceTd, targetTd);
      }
    }
  });
});

// =========================================================
// GLOBAL AUTO-RESIZER OBSERVER
// =========================================================
const tableObserver = new MutationObserver((mutations) => {
  for (const m of mutations) {
    if (m.addedNodes) {
      m.addedNodes.forEach(node => {
        if (node.nodeType === 1) {
          const tables = node.tagName === 'TABLE' ? [node] : Array.from(node.querySelectorAll('table:not(.datagrid-table)'));
          tables.forEach(table => {
            if (!table.dataset.resizableInit && table.querySelector('th')) {
              table.dataset.resizableInit = '1';
              setTimeout(() => {
                const sid = table.id || Math.random().toString(36).substring(7);
                makeTableResizable(table, 'global-table-w-' + sid);
              }, 100);
            }
          });
        }
      });
    }
  }
});
tableObserver.observe(document.body, { childList: true, subtree: true });

window.makeTableResizable = makeTableResizable;
window.DataGrid = DataGrid;
window.adminFetchAll = adminFetchAll;
window.adminUpdate = adminUpdate;
window.adminInsert = adminInsert;

export function buildSectionTabBar({ tabs = [], activeId = null, onSelect = null, isStatOnly = false, className = '', extraStyle = '' } = {}) {
  const _esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const count = tabs.length;
  const itemsHtml = tabs.map(tab => {
    const isActive = !isStatOnly && activeId && String(tab.id) === String(activeId);
    const isClickable = !isStatOnly && tab.clickable !== false && !!onSelect;

    let clickAttr = '';
    if (isClickable) {
      if (typeof onSelect === 'string') {
        clickAttr = `onclick="${onSelect}('${tab.id}')"`;
      } else if (typeof onSelect === 'function') {
        const cbKey = '_tabCb_' + Math.random().toString(36).substring(7);
        window[cbKey] = () => onSelect(tab.id);
        clickAttr = `onclick="window['${cbKey}']()"`;
      }
    }

    const activeCls = isActive ? 'active' : '';
    const statCls = (!isClickable && isStatOnly) || tab.clickable === false ? 'is-stat' : '';
    const valHtml = tab.val !== undefined && tab.val !== null ? `<div class="section-tab-val" ${tab.valColor ? `style="color:${tab.valColor};"` : ''}>${tab.val}</div>` : '';
    const titleHtml = tab.title ? `<div class="section-tab-title">${_esc(tab.title)}</div>` : '';
    const lblHtml = tab.label ? `<div class="section-tab-lbl">${_esc(tab.label)}</div>` : '';
    const iconStyle = tab.iconColor ? `style="color:${tab.iconColor};"` : '';
    const iconHtml = tab.icon ? `<div class="section-tab-icon" ${iconStyle}>${tab.icon}</div>` : '';

    return `
      <div class="section-tab ${activeCls} ${statCls}" data-tab-id="${tab.id || ''}" ${clickAttr} ${tab.extraStyle ? `style="${tab.extraStyle}"` : ''}>
        ${iconHtml}
        <div>
          ${valHtml}
          ${titleHtml}
          ${lblHtml}
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="section-tab-bar ${className}" data-tabs="${count}" style="--tab-count: ${count}; ${extraStyle}">
      ${itemsHtml}
    </div>
  `;
}
window.buildSectionTabBar = buildSectionTabBar;

export function setTopbarTabs(tabs = [], activeId = null, onSelect = null) {
  const container = document.getElementById('topbar-tabs-container');
  if (!container) return;
  if (!tabs || tabs.length === 0) {
    container.innerHTML = '';
    return;
  }
  const _esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  container.innerHTML = tabs.map(tab => {
    const isActive = activeId && String(tab.id) === String(activeId);
    const isClickable = tab.clickable !== false && !!onSelect;
    let clickAttr = '';
    if (isClickable) {
      if (typeof onSelect === 'string') {
        clickAttr = `onclick="${onSelect}('${tab.id}')"`;
      } else if (typeof onSelect === 'function') {
        const cbKey = '_topbarCb_' + Math.random().toString(36).substring(7);
        window[cbKey] = () => onSelect(tab.id);
        clickAttr = `onclick="window['${cbKey}']()"`;
      }
    }
    const activeCls = isActive ? 'active' : '';
    const statCls = !isClickable ? 'is-stat' : '';
    const valColor = tab.valColor ? `style="color:${tab.valColor};"` : '';
    const label = tab.label || tab.title || '';
    const icon = tab.icon || '';
    const hasVal = tab.val !== undefined && tab.val !== null;
    const badgeHtml = hasVal ? `<span class="topbar-tab-val topbar-tab-badge" ${valColor}>${tab.val}</span>` : '';
    return `
      <div class="topbar-tab-card topbar-tab-folder ${activeCls} ${statCls}" data-tab-id="${tab.id || ''}" ${clickAttr} title="${_esc(label)}">
        <div class="topbar-tab-left">
          ${icon ? `<span class="topbar-tab-icon">${icon}</span>` : ''}
          <span class="topbar-tab-label">${_esc(label)}</span>
        </div>
        ${badgeHtml}
      </div>
    `;
  }).join('');
}
window.setTopbarTabs = setTopbarTabs;

export function setBottomInfobar(leftHtml = '', rightHtml = '', centerHtml = '') {
  const bar = document.getElementById('admin-bottom-infobar');
  if (!bar) return;
  bar.classList.remove('hidden');
  const defaultLeft = `<span style="font-size:12px; color:#94a3b8; font-weight:500;">TopsCore ABCD System</span>`;
  const defaultRight = `<span style="font-size: 12px; color:#64748b; font-weight:600;">Status: Operational</span>`;
  const finalLeft = (leftHtml !== null && leftHtml !== undefined && leftHtml !== '') ? leftHtml : (!rightHtml && !centerHtml ? defaultLeft : '');
  const finalRight = (rightHtml !== null && rightHtml !== undefined && rightHtml !== '') ? rightHtml : (!leftHtml && !centerHtml ? defaultRight : '');
  bar.innerHTML = `
    <div class="bottom-infobar-left" id="bottom-infobar-left">${finalLeft}</div>
    ${centerHtml ? `<div class="bottom-infobar-center" id="bottom-infobar-center">${centerHtml}</div>` : ''}
    <div class="bottom-infobar-right" id="bottom-infobar-right">${finalRight}</div>
  `;
}
window.setBottomInfobar = setBottomInfobar;
import {
  adminFetchAll, adminInsert, adminUpdate, adminSoftDelete, adminHardDelete, clearAdminCache,
  adminFetchDeleted, adminRestore,
  mergeDuplicateStudents, detectDuplicateStudents, mergeStudentPair,
  detectDuplicateQuestions, resequenceTestQuestions, resolveDuplicateQuestionGroup, batchResolveTestDuplicateQuestions,
  fetchInstitutions, fetchPrograms, fetchBatches, formatStudentName, cleanStudentName, stripHonorific, getStudentInitial,
  testSupabaseConnection, previewRecalibrateTest, applyRecalibrateTest, isPassing, calculatePercentage, toLevelLetter, toShortLevel,
  adminOverridePrerequisitesWithRemedial, autoSyncClassTestsForLevel
} from '../api.js?v=20261124_v683';
import { parseExcelWorkbook, processStudentImportRows, processQuestionImportRows } from '../excel-parser.js?v=20261106_v160';
import { setAdminSession, getAdminSession, clearAdminSession, isTutorRole, isAdminRole, getAdminRole } from '../session.js?v=20261106_v160';
import { getSupabase } from '../supabase.js?v=20261106_v160';
import { renderStudents as _renderStudentsModule } from './student-management.js?v=20261123_v677';
import { renderClasses as _renderClassesModule, loadClassLearningPath } from './classes-management.js?v=20261114_v465';
import { renderBatches as _renderBatchesModule, renderUnifiedInstitutions } from './program-management.js?v=20261121_v665';
import { renderResults } from './class.js?v=20261116_v572';
import { renderTests } from './tests-management.js?v=20261121_v665';
import { renderTestAccess, renderClassTestSessions } from './tests-access.js?v=20261123_v678';
import { renderClassVocabularyAnalytics } from './class-analytics.js?v=20261113_v450';
import { renderVocabularyVault } from './vocab-vault.js?v=20261125_v686';
import { renderModules } from './modules.js?v=20261106_v160';
import { renderAuditLog, renderSettings, renderInterfaceSettings, renderDataHealth, renderRecycleBin } from './desk.js?v=20261121_v665';
import { renderSystemArchitecture } from './system-architecture.js?v=20261121_v656';
import { renderSystemGlossary } from './system-glossary.js?v=20261121_v105';
import { renderExamRules } from './exam-rules.js?v=20261122_v1';
import { renderTableDesigns, initGlobalTableDimensions } from './table-designs.js?v=20261121_v106';
import { renderClassMeetingsAttendance, getMeetingsConfigForClass } from './class-attendance.js?v=20261123_v678';
import { renderExportQuestions } from './imports-exports.js?v=20261106_v160';
import { openCrudModal, openDuplicateStudentsModal, openDuplicateQuestionsModal, openBulkEditTestsModal, hashPin } from './crud-modals.js?v=20261115_v528';
import { renderCurriculum } from './curriculum-management.js?v=20261106_v160';
import { renderClassesHub } from './classes-hub.js?v=20261124_v680';
import { renderDashboard } from './admin-deck.js?v=20261121_v655';
import { openStudentFullEdit } from './student-management.js?v=20261123_v677';
import { renderStudentsRegistration } from './student-registration.js?v=20261120_v640';
import { renderAcademicGradebook } from './academic-gradebook.js?v=20261123_v678';

if (typeof window !== 'undefined') {
  window.renderAcademicGradebook = renderAcademicGradebook;
  window.renderStudentsRegistration = renderStudentsRegistration;
  window.openStudentFullEdit = openStudentFullEdit;
  window.renderSystemGlossary = renderSystemGlossary;
  window.renderExamRules = renderExamRules;
}

    // -- Primary Tab Switching Variables --
    const mobileTabs = document.querySelectorAll('.mobile-tab');

    // ——— ABCD Primary Architecture Section Titles ———
    const sectionTitles = {
      dashboard: 'Attendance',
      organization: 'Board',
      board: 'Board',
      curriculum: 'Curriculum & Level Master',
      'classes-hub': 'Curriculum & Level Master',
      'exam-rules': 'Exam Regulations', 'exam_rules': 'Exam Regulations', 'assessment-rules': 'Exam Regulations', 'assessment_rules': 'Exam Regulations', 'assessment-matrix': 'Exam Regulations',
      'class-hub': 'Class Hub',
      import_ai_tests: 'Import AI Tests',
      institutions: 'Batches', students: 'Students', alumni: 'Alumni', 'import-students': 'Students Registration', 'student-registration': 'Students Registration', 'students-registration': 'Students Registration', 'progress-view': 'Student Progress',
      Classes: 'Curriculum & Classes', classes: 'Classes', 'classes-org': 'Organization Hub', class_instances: 'Class Instances', levels: 'Levels', topics: 'Topics', questions: 'Question Bank', vocab_vault: 'Vocabulary Vault', modules: 'Modules (Core Engines)', 'import-questions': 'Import Questions', 'export-questions': 'Export Questions',
      tests: 'Test Analytics', 'test-access': 'Test Access', assignments: 'Assignments & Rosters', results: 'Test Results', recalibrator: 'Test Engine Recalibration', question_types: 'Validation Dictionary',
      audit: 'Activity & Audit Logs', settings: 'Site Settings & Cost Guard', 'interface-settings': 'System Designs', 'system-designs': 'System Designs', 'system-palette': 'System Designs', palette: 'System Designs', interface: 'System Designs', 'interface-setting': 'System Designs', 'system-glossary': 'System Glossary', 'system_glossary': 'System Glossary', glossary: 'System Glossary', recycle: 'Recycle Bin', health: 'Data Health & Connectivity',
      'class-panel': 'Class Panel'
    };

    // ABCD 4-Domain Mapping
    const sectionDomainMap = {
      dashboard: 'ADMIN', organization: 'ADMIN', board: 'ADMIN',
      'classes-hub': 'ADMIN', curriculum: 'ADMIN',
      'exam-rules': 'ADMIN', 'exam_rules': 'ADMIN', 'assessment-rules': 'ADMIN', 'assessment_rules': 'ADMIN', 'assessment-matrix': 'ADMIN',
      institutions: 'BOARD', students: 'BOARD', alumni: 'BOARD', 'import-students': 'BOARD', 'student-registration': 'BOARD', 'students-registration': 'BOARD', 'progress-view': 'BOARD',
      Classes: 'CLASS', classes: 'CLASS', 'classes-org': 'CLASS', class_instances: 'CLASS', levels: 'CLASS', topics: 'CLASS', questions: 'CLASS', question_types: 'CLASS', 'import-questions': 'CLASS', 'export-questions': 'CLASS',
      tests: 'CLASS', 'test-access': 'CLASS', assignments: 'CLASS', results: 'CLASS', import_ai_tests: 'CLASS',
      'class-panel': 'CLASS', 'class-hub': 'CLASS',
      audit: 'DATA', settings: 'DATA', 'interface-settings': 'DATA', 'system-palette': 'DATA', palette: 'DATA', interface: 'DATA', 'interface-setting': 'DATA', 'system-glossary': 'DATA', 'system_glossary': 'DATA', glossary: 'DATA', recycle: 'DATA', health: 'DATA', recalibrator: 'DATA', modules: 'DATA', vocab_vault: 'DATA'
    };

    // Mobile Bottom Tab Panels -> Primary Domain
    const domainToPanelMap = {
      ADMIN: 'admin', BOARD: 'board', CLASS: 'class', DATA: 'desk', DESK: 'desk',
      TESTS: 'class', // Legacy alias
      DATABASE: 'board', STUDENT: 'board', Test: 'class',
      ACADEMY: 'board'
    };

    const tabDefaultSections = {
      admin: 'dashboard',
      board: 'students',
      class: 'class-hub',
      tests: 'tests', // Legacy alias
      desk: 'settings',
      data: 'settings',
      database: 'class-hub', student: 'students', Test: 'tests',
      academy: 'students'
    };

    // Section alias map to guarantee 100% backward compatibility & resilient routing
    const aliasSectionMap = {
      // Vocabulary Vault
      'vocabulary': 'vocab_vault',
      'vocab': 'vocab_vault',
      'vault': 'vocab_vault',
      'vocab-vault': 'vocab_vault',

      // Settings & System Data
      'system-settings': 'settings',
      'system_settings': 'settings',
      'site-settings': 'settings',
      'desk-settings': 'settings',
      'audit': 'settings',
      'desk-audit': 'settings',
      'health': 'settings',
      'desk-health': 'settings',
      'recycle': 'settings',
      'desk-recycle': 'settings',
      'recalibrator': 'settings',
      'class-recalibrator': 'settings',
      'tests-recalibrator': 'settings',

      // System Designs (Pillar D)
      'system-designs': 'interface-settings',
      'system_designs': 'interface-settings',
      'system-palette': 'interface-settings',
      'palette': 'interface-settings',
      'interface': 'interface-settings',
      'interface-setting': 'interface-settings',
      'interface_settings': 'interface-settings',
      'interface-system': 'interface-settings',
      'desk-interface': 'interface-settings',
      'system_glossary': 'system-glossary',
      'glossary': 'system-glossary',

      // Curriculum & Classes
      'board': 'organization',
      'curriculum': 'classes-hub',
      'class-system': 'classes-hub',
      'discipline-governance': 'classes-hub',
      'curriculum-org': 'organization',
      'classes': 'class-hub',
      'class': 'class-hub',
      'Classes': 'class-hub',
      'board-Classes': 'class-hub',
      'test-access': 'class-hub',
      'class-panel': 'class-hub',
      'class-detail': 'class-hub',

      // Tests & Analytics
      'tests-hub': 'tests',
      'test-hub': 'tests',
      'test': 'tests',
      'analytics': 'tests',
      'test-analytics': 'tests',
      'import_ai_tests': 'tests',

      // Students
      'student': 'students',
      'progress-view': 'students',
      'academy-students': 'students',

      // Registration
      'academy-import': 'student-registration',
      'import-students': 'student-registration',
      'students-registration': 'student-registration',

      // Batches & Programs
      'batches': 'institutions',
      'batch': 'institutions',
      'programs': 'institutions',
      'program': 'institutions',
      'academy-institutions': 'institutions',
      'academy-programs': 'institutions',
      'academy-batches': 'institutions',

      // Questions & Topics
      'board-bank': 'vocab_vault',
      'board-wordtypes': 'question_types',
      'board-topics': 'topics',
      'board-import': 'vocab_vault',
      'board-export': 'vocab_vault',
      'class-assignments': 'class-hub',
      'tests-assignments': 'class-hub',
      'class-results': 'results',
      'tests-results': 'results',
      'levels': 'class-hub',
      'import-ai-tests': 'tests',
      'question-types': 'question_types',
      'word-types': 'question_types',
      'wordtypes': 'question_types'
    };

    function parseHashRoute(hashStr) {
      let raw = (hashStr || '').replace(/^#\/?/, '').trim();
      if (!raw) return { section: '', subTab: null, params: {} };

      if (raw.startsWith('profile-') || raw.startsWith('dossier-')) {
        return { section: 'profile-student', studentId: raw.replace(/^(profile|dossier)-/, ''), subTab: null, params: {} };
      }

      let sectionPart = raw;
      let queryPart = '';
      if (raw.includes('?')) {
        const parts = raw.split('?');
        sectionPart = parts[0];
        queryPart = parts[1] || '';
      }

      let subTab = null;
      if (sectionPart.includes('/')) {
        const slashParts = sectionPart.split('/');
        sectionPart = slashParts[0];
        subTab = slashParts[1] || null;
      } else if (sectionPart.includes(':')) {
        const colonParts = sectionPart.split(':');
        sectionPart = colonParts[0];
        subTab = colonParts[1] || null;
      }

      const params = {};
      if (typeof window !== 'undefined' && window.location && window.location.search) {
        try {
          const spSearch = new URLSearchParams(window.location.search);
          for (const [k, v] of spSearch.entries()) {
            params[k] = v;
            if ((k === 'tab' || k === 'status') && !subTab) subTab = v;
          }
        } catch (_) {}
      }

      if (queryPart) {
        try {
          const sp = new URLSearchParams(queryPart);
          for (const [k, v] of sp.entries()) {
            params[k] = v;
            if ((k === 'tab' || k === 'status') && !subTab) subTab = v;
          }
        } catch (_) {}
      }

      return { section: sectionPart, subTab, params };
    }

    function applySubRouteState(targetSec, subTab, params = {}, rawSec = '') {
      if (targetSec === 'settings') {
        const tab = (rawSec === 'health' || rawSec === 'desk-health' || rawSec === 'recalibrator' || rawSec === 'class-recalibrator' || rawSec === 'tests-recalibrator') ? 'health'
          : (rawSec === 'audit' || rawSec === 'desk-audit') ? 'audit'
          : (rawSec === 'recycle' || rawSec === 'desk-recycle') ? 'recycle'
          : (subTab || localStorage.getItem('topscore_admin_settings_tab') || 'site');
        window._activeSettingTab = tab;
        try { localStorage.setItem('topscore_admin_settings_tab', tab); } catch(_) {}
      } else if (targetSec === 'class-hub') {
        let tab = (rawSec === 'test-access') ? 'test-sessions'
          : (rawSec === 'tests' || rawSec === 'test-hub') ? 'tests'
          : (rawSec === 'analytics' || subTab === 'analytics') ? 'analytics'
          : (subTab || localStorage.getItem('topscore_admin_class_hub_tab') || 'attendance');
        if (isTutorRole() && (tab === 'tests' || tab === 'analytics')) {
          tab = 'test-sessions';
        }
        window._classHubActiveTab = tab;
        try { localStorage.setItem('topscore_admin_class_hub_tab', tab); } catch(_) {}
        if (params && params.class_id) {
          window._selectedClassId = params.class_id;
          try { localStorage.setItem('topscore_selected_class_id', params.class_id); } catch(_) {}
        }
      } else if (targetSec === 'vocab_vault') {
        const tab = subTab || localStorage.getItem('topscore_admin_vault_tab') || 'theme_manager';
        window._activeVaultTab = tab;
        try { localStorage.setItem('topscore_admin_vault_tab', tab); } catch(_) {}
      } else if (targetSec === 'student-registration') {
        const tab = subTab || localStorage.getItem('topscore_admin_student_reg_tab') || 'bulk';
        window._activeStudentRegTab = tab;
        try { localStorage.setItem('topscore_admin_student_reg_tab', tab); } catch(_) {}
      } else if (targetSec === 'tests') {
        if (params && params.class_id) {
          window._activeTestClassId = params.class_id;
          try { localStorage.setItem('topscore_admin_tests_class_id', params.class_id); } catch(_) {}
        } else if (!window._activeTestClassId) {
          window._activeTestClassId = localStorage.getItem('topscore_admin_tests_class_id') || 'all';
        }
      } else if (targetSec === 'students') {
        if (params && params.program_id) {
          window._filterProgramId = params.program_id;
          try { localStorage.setItem('topscore_selected_program_id', params.program_id); } catch(_) {}
        }
        if (params && params.batch_id) {
          window._filterBatchId = params.batch_id;
          try { localStorage.setItem('topscore_selected_batch_id', params.batch_id); } catch(_) {}
        } else if (!window._filterBatchId) {
          window._filterBatchId = localStorage.getItem('topscore_selected_batch_id') || null;
        }
        const allowedStatuses = ['active', 'inactive', 'alumni', 'all'];
        const targetStatus = (params && params.status && allowedStatuses.includes(params.status)) ? params.status : (subTab && allowedStatuses.includes(subTab) ? subTab : null);
        if (targetStatus) {
          window._filterBatchStatus = targetStatus;
        } else {
          const stored = localStorage.getItem('topscore_student_status_tab');
          window._filterBatchStatus = allowedStatuses.includes(stored) ? stored : 'active';
        }
        try { localStorage.setItem('topscore_student_status_tab', window._filterBatchStatus); } catch(_) {}
      }
    }

    async function updateAdminKpiBanner() {
      try {
        const sb = await getSupabase();
        const [stds, asms, attCountRes] = await Promise.all([
          adminFetchAll('students', 'id, deleted_at'),
          adminFetchAll('tests', 'id, status, deleted_at'),
          sb ? sb.from('attempts').select('*', { count: 'exact', head: true }) : Promise.resolve({ count: 0 })
        ]);
        const kpiAcad = document.getElementById('kpi-board');
        if (kpiAcad) kpiAcad.textContent = stds.filter(s => !s.deleted_at).length;
        const kpiChal = document.getElementById('kpi-class') || document.getElementById('kpi-tests');
        if (kpiChal) kpiChal.textContent = asms.filter(a => !a.deleted_at && a.status === 'published').length;
        const kpiDesk = document.getElementById('kpi-desk');
        if (kpiDesk) kpiDesk.textContent = attCountRes?.count ?? 0;
        const kpiAdmin = document.getElementById('kpi-admin');
        if (kpiAdmin) kpiAdmin.textContent = 0;
      } catch (err) {
        console.warn('Could not refresh admin KPI banner:', err.message);
      }
    }



    // --- Auth ---
    const session = getAdminSession();
    if (session) showConsole();

    document.getElementById('admin-login-btn')?.addEventListener('click', async () => {
      const user = document.getElementById('admin-username').value.trim();
      const pass = document.getElementById('admin-password').value;
      if (!user || !pass) { showToast('Please enter credentials.', 'warning'); return; }

      showLoading('Authenticating...');
      try {
        const savedCustomPass = localStorage.getItem('topscore_admin_custom_password');
        const savedTutorPass = localStorage.getItem('topscore_tutor_custom_password');
        const normUser = user.toLowerCase();

        // 1. Primary Check: Master admin credentials (admin / admin123 or custom saved password)
        const isAdminUser = ['admin', 'administrator', 'superadmin', 'mr. top', 'mrtop'].includes(normUser);
        const isMasterAdmin = isAdminUser && (pass === 'admin123' || (savedCustomPass && pass === savedCustomPass));

        if (isMasterAdmin) {
          setAdminSession({ admin_id: 'admin-master', username: user, role: 'admin' });
          hideLoading();
          showToast('Welcome, Administrator!', 'success');
          showConsole();
          return;
        }

        // 1b. Check Tutor Credentials (tutor / tutor123 or custom saved password)
        const isTutorUser = ['tutor', 'guru', 'proctor', 'pengawas'].includes(normUser);
        const isMasterTutor = isTutorUser && (savedTutorPass ? pass === savedTutorPass : pass === 'tutor123');

        if (isMasterTutor) {
          setAdminSession({ admin_id: 'tutor-proctor', username: user, role: 'tutor' });
          hideLoading();
          showToast('Welcome, Tutor! Proctoring Mode Active.', 'success');
          showConsole();
          return;
        }

        // 2. Secondary Check: Supabase Auth (if user provided an email address registered in Supabase)
        if (user.includes('@')) {
          try {
            const sb = await getSupabase();
            const { data, error } = await sb.auth.signInWithPassword({ email: user, password: pass });
            if (!error && data?.user) {
              const userRole = data.user.user_metadata?.role === 'tutor' ? 'tutor' : 'admin';
              setAdminSession({ admin_id: data.user.id, username: user, role: userRole });
              hideLoading();
              showToast(userRole === 'tutor' ? 'Welcome, Tutor! Proctoring Mode Active.' : 'Welcome, Administrator!', 'success');
              showConsole();
              return;
            }
          } catch(authErr) {
            console.warn('Supabase Auth attempt failed:', authErr);
          }
        }

        // Neither matched
        hideLoading();
        showToast('Invalid credentials. Please enter valid Admin or Tutor username and password.', 'error');
      } catch(e) {
        hideLoading();
        console.error('Login flow error:', e);
        showToast(e.message || 'Authentication failed due to an internal error.', 'error');
      }
    });

    document.getElementById('admin-username')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('admin-password')?.focus();
    });

    document.getElementById('admin-password')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('admin-login-btn')?.click();
    });

    document.getElementById('admin-logout-btn')?.addEventListener('click', () => {
      if (window.isProfileDirty) {
        if (!confirm('You have unsaved changes. Are you sure you want to logout?')) {
          return;
        }
      }
      clearAdminSession();
      document.body.classList.remove('role-tutor');
      document.getElementById('admin-console').classList.add('hidden');
      document.getElementById('admin-login-screen').classList.remove('hidden');
    });

    function getActiveTenant() {
      return sessionStorage.getItem('topscore_active_tenant') || 'ALL';
    }

    function isProgramInTenant(progName, instId, tenant) {
      if (!tenant || tenant === 'ALL') return true;
      const p = (progName || '').toLowerCase();
      const isTop = instId === '637fea53-ca64-4e1c-8ff7-6fd4dbdd8260' || p.includes('evnikom') || p.includes('sheraton') || p.includes('tamata');
      return tenant === 'TOP' ? isTop : !isTop;
    }

    function isClassInTenant(className, tenant) {
      if (!tenant || tenant === 'ALL') return true;
      const c = (className || '').toLowerCase();
      const isTop = c.includes('evnikom') || c.includes('sheraton') || c.includes('tamata');
      return tenant === 'TOP' ? isTop : !isTop;
    }

    function applyTenantFilter(tenant, userInitiated = false) {
      sessionStorage.setItem('topscore_active_tenant', tenant);

      // 1. Update body tenant class
      document.body.classList.remove('tenant-all', 'tenant-cec', 'tenant-top');
      if (tenant === 'CEC') {
        document.body.classList.add('tenant-cec');
      } else if (tenant === 'TOP') {
        document.body.classList.add('tenant-top');
      } else {
        document.body.classList.add('tenant-all');
      }

      // 2. Update role chip in top header corner
      const topRoleLabel = document.getElementById('sidebar-user-role-label');
      if (topRoleLabel) {
        const span = topRoleLabel.querySelector('.corner-main-label') || topRoleLabel;
        if (tenant === 'CEC') span.textContent = 'CEC ADMIN';
        else if (tenant === 'TOP') span.textContent = 'TOP ADMIN';
        else span.textContent = 'SUPER ADMIN';
      }

      // 3. Update buttons active state
      const buttons = document.querySelectorAll('.btn-tenant-toggle');
      buttons.forEach(btn => btn.classList.toggle('active', btn.dataset.tenant === tenant));

      // 4. Re-render/filter sidebar domains B & C
      if (window.loadSidebarPrograms) window.loadSidebarPrograms();
      if (window.loadSidebarClasses) window.loadSidebarClasses();

      // 5. Section restriction / Auto-redirection
      // 'dashboard' (Attendance) is accessible by both CEC and TOP regular admins
      const forbiddenForRegular = ['classes-hub', 'organization', 'board', 'modules', 'interface-settings', 'system-glossary', 'settings', 'vocab_vault'];
      const curSec = window._currentSection || window._activeSectionAlias || 'dashboard';

      if (tenant !== 'ALL' && forbiddenForRegular.includes(curSec)) {
        if (typeof window.loadSection === 'function') {
          window.loadSection('dashboard', true);
        }
      } else if (userInitiated && typeof window.loadSection === 'function') {
        window.loadSection(curSec, true);
      }
    }

    function setupTenantSwitcher() {
      const buttons = document.querySelectorAll('.btn-tenant-toggle');
      if (!buttons.length) return;
      const currentTenant = getActiveTenant();
      applyTenantFilter(currentTenant, false);

      buttons.forEach(b => {
        b.onclick = () => {
          const tenant = b.dataset.tenant || 'ALL';
          applyTenantFilter(tenant, true);
          if (typeof showToast === 'function') {
            const label = tenant === 'ALL' ? 'SUPER ADMIN (ALL INSTITUTIONS)' : `${tenant} REGULAR ADMIN`;
            showToast(`Mode switched: ${label}`, 'info');
          }
        };
      });

      const tutorRoomBtn = document.getElementById('sidebar-tutor-room-item');
      if (tutorRoomBtn) {
        tutorRoomBtn.onclick = (e) => {
          e.preventDefault();
          const tenant = getActiveTenant();
          const url = 'tutor.html' + (tenant !== 'ALL' ? '?tenant=' + tenant : '');
          window.open(url, '_blank');
        };
      }
    }

    function setupThemeSwitcher() {
      const buttons = document.querySelectorAll('.btn-theme-toggle');
      if (!buttons.length) return;
      let currentTheme = localStorage.getItem('topscore_theme') || 'navy';
      if (currentTheme === 'black') currentTheme = 'dark';

      function apply(theme) {
        if (!['light', 'navy', 'dark'].includes(theme)) theme = 'navy';
        document.documentElement.setAttribute('data-theme', theme);
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('topscore_theme', theme);

        buttons.forEach(btn => {
          if (btn.dataset.theme === theme) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        });
      }

      apply(currentTheme);

      buttons.forEach(b => {
        b.onclick = () => {
          const targetTheme = b.dataset.theme || 'navy';
          apply(targetTheme);
          if (typeof showToast === 'function') {
            const labels = { light: 'Light Theme', navy: 'Navy Theme', dark: 'Dark Theme' };
            showToast(`Theme switched: ${labels[targetTheme] || targetTheme}`, 'info');
          }
        };
      });
    }

    async function showConsole() {
      document.getElementById('admin-login-screen').classList.add('hidden');
      document.getElementById('admin-console').classList.remove('hidden');

      const isTutor = isTutorRole();
      document.body.classList.toggle('role-tutor', isTutor);

      const avatarEl = document.querySelector('.admin-user-chip .user-avatar');
      const nameEl = document.querySelector('.admin-user-chip .user-name');
      const roleEl = document.querySelector('.admin-user-chip .user-role');
      const session = getAdminSession();
      if (avatarEl) avatarEl.textContent = isTutor ? 'T' : 'A';
      if (nameEl) nameEl.textContent = "Tutor's Room";
      if (roleEl) roleEl.textContent = isTutor ? 'tutor' : 'admin';

      const topRoleLabel = document.getElementById('sidebar-user-role-label');
      if (topRoleLabel) {
        const span = topRoleLabel.querySelector('.corner-main-label') || topRoleLabel;
        span.textContent = isTutor ? 'TUTOR' : 'ADMIN';
      }

      // Initialize Top Corner Tenant Switcher (ALL | CEC | TOP)
      setupTenantSwitcher();

      // Initialize Low Corner Theme Switcher (Light | Navy | Dark)
      setupThemeSwitcher();

      if (!isTutor) {
        updateAdminKpiBanner();
      }
      if (window.loadSidebarClasses) window.loadSidebarClasses();
      if (!isTutor && window.loadSidebarPrograms) window.loadSidebarPrograms();

      const rawHash = window.location.hash;
      const parsed = parseHashRoute(rawHash);

      if (isTutor) {
        // Tutors are strictly locked to class-hub (test-sessions or attendance)
        const subTab = (parsed.subTab === 'attendance') ? 'attendance' : 'test-sessions';
        window._classHubActiveTab = subTab;
        try { localStorage.setItem('topscore_admin_class_hub_tab', subTab); } catch (_) {}
        await loadSection('class-hub', true);
        initConnectionBanner();
        return;
      }

      // 1. If hash is student profile (#profile-studentId)
      if (parsed.section === 'profile-student' && parsed.studentId) {
        const savedSec = localStorage.getItem('topscore_admin_last_section') || sessionStorage.getItem('topscore_admin_last_section') || 'students';
        const bgParsed = parseHashRoute(savedSec);
        const bgTarget = aliasSectionMap[bgParsed.section] || bgParsed.section || 'students';
        applySubRouteState(bgTarget, bgParsed.subTab, bgParsed.params, bgParsed.section);
        await loadSection(bgTarget, true);
        openStudentProfile(parsed.studentId, [], true);
        initConnectionBanner();
        return;
      }

      // 2. Direct section from URL hash or fallback to last saved section
      const targetSec = aliasSectionMap[parsed.section] || parsed.section;
      const savedSec = localStorage.getItem('topscore_admin_last_section') || sessionStorage.getItem('topscore_admin_last_section');
      const savedParsed = parseHashRoute(savedSec);
      const savedTargetSec = aliasSectionMap[savedParsed.section] || savedParsed.section;

      const isValidSection = (sec) => !!(sec && (sectionTitles[sec] || sec === 'students' || sec === 'class-hub' || sec === 'settings' || sec === 'vocab_vault' || sec === 'classes-hub' || sec === 'classes' || sec === 'institutions' || sec === 'modules' || sec === 'organization' || sec === 'board' || sec === 'curriculum' || sec === 'system-glossary' || sec === 'glossary'));

      if (isValidSection(targetSec)) {
        applySubRouteState(targetSec, parsed.subTab, parsed.params, parsed.section);
        loadSection(targetSec, true);
      } else if (isValidSection(savedTargetSec)) {
        applySubRouteState(savedTargetSec, savedParsed.subTab, savedParsed.params, savedParsed.section);
        loadSection(savedTargetSec, false);
      } else {
        activatePrimaryTab('class');
        loadSection('tests', true);
      }
      initConnectionBanner(); // Check live DB connection and show status banner
    }

    window.addEventListener('hashchange', () => {
      const h = window.location.hash.substring(1);
      const parsed = parseHashRoute(h);
      if (parsed.section === 'profile-student' && parsed.studentId) {
        if (isTutorRole()) {
          showToast('Restricted: Student profile direct access is limited to Class Hub.', 'warning');
          return;
        }
        openStudentProfile(parsed.studentId, [], true);
        return;
      }
      let targetSec = aliasSectionMap[parsed.section] || parsed.section;
      if (isTutorRole() && !['class-hub', 'test-access'].includes(targetSec)) {
        showToast('Restricted: Tutor access is limited to Class Hub (Test Sessions & Grades).', 'warning');
        targetSec = 'class-hub';
        if (window.location.hash !== '#class-hub') {
          window.location.hash = '#class-hub';
          return;
        }
      }
      if (targetSec && (targetSec !== _currentSection || window._activeSectionAlias !== parsed.section)) {
        applySubRouteState(targetSec, parsed.subTab, parsed.params, parsed.section);
        loadSection(targetSec, true);
      }
    });

    // --- SIDEBAR PROGRAMS & BATCHES LIST INJECTION (DOMAIN B) ---
    async function loadSidebarPrograms(autoSelectProgramId = null, autoSelectBatchId = null) {
      const container = document.getElementById('sidebar-programs-list');
      if (!container) return;

      const formatSidebarBatchLabel = (progName, batchName) => {
        const p = (progName || '').trim();
        const b = (batchName || '').trim();
        if (!b) return p;
        if (b.toLowerCase().startsWith(p.toLowerCase())) return b;
        return `${p} ${b}`;
      };

      const handleSidebarClick = (item, action) => {
        document.querySelectorAll('.admin-nav-item:not(.sidebar-class-item)').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        action();
      };

      const bindEvents = () => {
        container.querySelectorAll('.sidebar-program-item').forEach(item => {
          if (item._hasClickBound) return;
          item._hasClickBound = true;
          item.addEventListener('click', (e) => {
            handleSidebarClick(e.currentTarget, () => {
              const pid = item.getAttribute('data-program-id');
              const pname = item.getAttribute('data-program-name');
              const bid = item.getAttribute('data-batch-id') || null;
              const bname = item.getAttribute('data-batch-name') || null;
              const label = item.getAttribute('data-sidebar-label') || pname;

              window._filterProgramId = pid;
              window._selectedProgramName = pname;
              window._filterBatchId = bid;
              window._filterBatchName = bname;
              window._selectedSidebarLabel = label;
              window._isAlumniMainPanel = false;
              // User requirement: Always default to Active Students tab when entering student roster
              window._filterBatchStatus = 'active';

              try {
                localStorage.setItem('topscore_student_status_tab', 'active');
                localStorage.setItem('topscore_selected_program_id', pid);
                localStorage.setItem('topscore_selected_program_name', pname);
                if (bid) {
                  localStorage.setItem('topscore_selected_batch_id', bid);
                  localStorage.setItem('topscore_selected_batch_name', bname);
                } else {
                  localStorage.removeItem('topscore_selected_batch_id');
                  localStorage.removeItem('topscore_selected_batch_name');
                }
                localStorage.setItem('topscore_selected_sidebar_label', label);

                if (window.history && window.history.replaceState) {
                  const bParam = bid ? `?batch_id=${bid}` : (pid ? `?program_id=${pid}` : '');
                  window.history.replaceState(null, '', `#students${bParam}`);
                }
              } catch(err) {}

              loadSection('students');
            });
          });
        });
      };

      const renderItems = (items) => {
        const currentTenant = getActiveTenant();
        let filteredByTenant = (items || []).filter(it => isProgramInTenant(it.program_name || it.name, it.institution_id, currentTenant));

        // Strictly filter to active batches only per user directive: "bagian ini hnaya tempilkan batch yang aktif saja, uyng tidak aktif sembunyikan"
        const activeItems = filteredByTenant.filter(it => it.is_active !== false);
        // Strictly sort batches/programs alphabetically ascending (A-Z) with numeric support
        activeItems.sort((a, b) => (a.label || a.name || '').localeCompare(b.label || b.name || '', undefined, { numeric: true, sensitivity: 'base' }));

        const alumniItem = document.getElementById('sidebar-alumni-item');
        if (alumniItem) {
          alumniItem.style.display = (currentTenant === 'TOP') ? 'none' : '';
        }

        if (!activeItems || activeItems.length === 0) {
          container.innerHTML = `<div style="padding: 12px; color: var(--clr-text-muted); font-size: 12px;">No active batches.</div>`;
          return;
        }

        const activeBatchId = autoSelectBatchId || window._filterBatchId || localStorage.getItem('topscore_selected_batch_id');
        const activeProgId = autoSelectProgramId || window._filterProgramId || localStorage.getItem('topscore_selected_program_id');

        let matched = null;
        if (activeBatchId) {
          matched = activeItems.find(it => it.batch_id === activeBatchId);
        }
        if (!matched && activeProgId) {
          matched = activeItems.find(it => it.program_id === activeProgId);
        }
        if (!matched && activeItems.length > 0) {
          matched = activeItems[0];
        }

        const isStudentsActive = _currentSection === 'students' || window._activeSectionAlias === 'students';

        let html = `<div class="sidebar-program-group" style="display:flex; flex-direction:column; gap:6px;">`;
        activeItems.forEach(it => {
          const isItemActive = isStudentsActive && matched && (
            (matched.batch_id && it.batch_id === matched.batch_id) ||
            (!matched.batch_id && it.program_id === matched.program_id)
          );
          const activeCls = isItemActive ? 'active' : '';
          const itemTenant = isProgramInTenant(it.program_name, it.institution_id, 'TOP') ? 'TOP' : 'CEC';
          const usersSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sidebar-svg-icon"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`;
          html += `
            <div class="admin-nav-item sidebar-program-item ${activeCls}"
                 data-program-id="${it.program_id || it.id}"
                 data-batch-id="${it.batch_id || ''}"
                 data-program-name="${escapeHtml(it.program_name || it.name || '')}"
                 data-batch-name="${escapeHtml(it.batch_name || '')}"
                 data-sidebar-label="${escapeHtml(it.label || it.name || '')}"
                 data-tenant="${itemTenant}"
                 data-sub="students">
              <span class="nav-icon">${usersSvg}</span>
              <span>${escapeHtml(it.label || it.name || '')}</span>
            </div>
          `;
        });
        html += `</div>`;
        container.innerHTML = html;
        bindEvents();
        if (typeof window !== 'undefined' && window.sortAllSidebarDomains) {
          window.sortAllSidebarDomains();
        }

        if (matched) {
          window._filterProgramId = matched.program_id;
          window._selectedProgramName = matched.program_name;
          window._filterBatchId = matched.batch_id || null;
          window._filterBatchName = matched.batch_name || null;
          window._selectedSidebarLabel = matched.label;
          try {
            localStorage.setItem('topscore_selected_program_id', matched.program_id);
            localStorage.setItem('topscore_selected_program_name', matched.program_name);
            if (matched.batch_id) {
              localStorage.setItem('topscore_selected_batch_id', matched.batch_id);
              localStorage.setItem('topscore_selected_batch_name', matched.batch_name || '');
            }
            localStorage.setItem('topscore_selected_sidebar_label', matched.label);
          } catch(err) {}
        }
      };

      // 1. If DOM already has items from HTML pre-render, just bind clicks immediately
      if (container.firstElementChild) {
        bindEvents();
      } else {
        // Hydrate from localStorage cache
        try {
          const cached = JSON.parse(localStorage.getItem('topscore_cached_sidebar_programs') || '[]');
          if (Array.isArray(cached) && cached.length > 0) {
            renderItems(cached);
          }
        } catch(e) {}
      }

      // 2. Fetch fresh programs and batches from server (stale-while-revalidate)
      try {
        const [programs, batches, students] = await Promise.all([
          adminFetchAll('programs', 'id, name, is_active, institution_id'),
          adminFetchAll('batches', 'id, name, is_active, program_id, deleted_at').catch(() => []),
          adminFetchAll('students', 'id, batch_id, is_active, program_status, deleted_at').catch(() => [])
        ]);

        const validBatches = (batches || []).filter(b => !b.deleted_at);
        const validStudents = (students || []).filter(s => !s.deleted_at && s.is_active !== false && (s.program_status || '').toUpperCase() !== 'INACTIVE' && s.program_status !== 'ALUMNI');
        // Only active batches with at least 1 active non-alumni student per user directive
        const activeBatches = validBatches.filter(b => b.is_active !== false && validStudents.some(s => s.batch_id === b.id));

        // Include active programs that have active batches (or active programs without batches)
        const activePrograms = (programs || []).filter(p => p.is_active !== false && (activeBatches.some(b => b.program_id === p.id) || !validBatches.some(b => b.program_id === p.id)));
        activePrograms.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        const items = [];
        activePrograms.forEach(prog => {
          const pActiveBatches = activeBatches.filter(b => b.program_id === prog.id);
          if (pActiveBatches.length > 0) {
            // Strictly sort active batches alphabetically ascending (e.g. 132, 133, 134)
            pActiveBatches.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' }));
            pActiveBatches.forEach(b => {
              const label = formatSidebarBatchLabel(prog.name, b.name);
              items.push({
                id: `${prog.id}::${b.id}`,
                program_id: prog.id,
                program_name: prog.name,
                batch_id: b.id,
                batch_name: b.name,
                label: label,
                is_active: true
              });
            });
          } else if (!validBatches.some(b => b.program_id === prog.id)) {
            items.push({
              id: prog.id,
              program_id: prog.id,
              program_name: prog.name,
              batch_id: null,
              batch_name: null,
              label: prog.name,
              is_active: true
            });
          }
        });

        // Strictly sort all items alphabetically ascending
        items.sort((a, b) => (a.label || a.name || '').localeCompare(b.label || b.name || '', undefined, { numeric: true, sensitivity: 'base' }));

        if (items.length > 0) {
          try {
            localStorage.setItem('topscore_cached_sidebar_programs', JSON.stringify(items));
          } catch(err) {}
          renderItems(items);
        }
      } catch(err) {
        console.warn('[loadSidebarPrograms] server fetch failed, using cache:', err);
      }
    }
    window.loadSidebarPrograms = loadSidebarPrograms;
    // Call immediately to hydrate sidebar programs with zero delay
    loadSidebarPrograms();

    // --- SIDEBAR CLASSES LIST INJECTION ---
    async function loadSidebarClasses(autoSelectClassId = null) {
      const container = document.getElementById('sidebar-classes-list');
      if (!container) return;

      const handleSidebarClick = (item, action) => {
        document.querySelectorAll('.admin-nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        action();
      };

      const bindEvents = () => {
        container.querySelectorAll('.sidebar-class-item').forEach(item => {
          if (item._hasClickBound) return;
          item._hasClickBound = true;
          item.addEventListener('click', (e) => {
            handleSidebarClick(e.currentTarget, () => {
              const cid = item.getAttribute('data-class-id');
              const cname = item.getAttribute('data-class-name');
              window._selectedClassId = cid;
              window._selectedClassName = cname;
              try {
                localStorage.setItem('topscore_selected_class_id', cid);
                localStorage.setItem('topscore_selected_class_name', cname);
              } catch(err) {}
              window._selectedLevelId = null;
              loadSection('class-hub');
            });
          });
        });
      };

      const renderClasses = (classes) => {
        const currentTenant = getActiveTenant();
        let tenantClasses = (classes || []).filter(cls => isClassInTenant(cls.name, currentTenant) && cls.is_active !== false);
        const sortedClasses = tenantClasses.slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        let activeId = window._selectedClassId || localStorage.getItem('topscore_selected_class_id');

        if (!sortedClasses.some(c => c.id === activeId) && sortedClasses.length > 0) {
          activeId = sortedClasses[0].id;
          window._selectedClassId = activeId;
          window._selectedClassName = sortedClasses[0].name;
          try {
            localStorage.setItem('topscore_selected_class_id', activeId);
            localStorage.setItem('topscore_selected_class_name', sortedClasses[0].name);
          } catch(err) {}
        }

        let html = `<div class="sidebar-class-group" style="display:flex; flex-direction:column; gap:6px;">`;
        if (sortedClasses.length === 0) {
          html += `<div style="padding: 12px; color: var(--clr-text-muted); font-size: 12px;">No classes found.</div>`;
        } else {
          sortedClasses.forEach(cls => {
            const isActive = (activeId === cls.id && (_currentSection === 'class-hub' || window._activeSectionAlias === 'class-hub')) ? 'active' : '';
            const classTenant = isClassInTenant(cls.name, 'TOP') ? 'TOP' : 'CEC';
            const classSvg = (typeof getClassSvgIcon === 'function')
              ? getClassSvgIcon(cls.name, 14, 'currentColor')
              : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sidebar-svg-icon"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`;
            html += `
              <div class="admin-nav-item sidebar-class-item ${isActive}" data-class-id="${cls.id}" data-class-name="${escapeHtml(cls.name)}" data-tenant="${classTenant}">
                <span class="nav-icon">${classSvg}</span>
                <span>${escapeHtml(cls.name)}</span>
              </div>
            `;
          });
        }
        html += `</div>`;
        container.innerHTML = html;
        bindEvents();
        if (typeof window !== 'undefined' && window.sortAllSidebarDomains) {
          window.sortAllSidebarDomains();
        }

        if (sortedClasses.length > 0 && (!window._selectedClassId || !sortedClasses.some(c => c.id === window._selectedClassId))) {
          const selCls = sortedClasses.find(c => c.id === activeId) || sortedClasses[0];
          window._selectedClassId = selCls.id;
          window._selectedClassName = selCls.name;
          try {
            localStorage.setItem('topscore_selected_class_id', selCls.id);
            localStorage.setItem('topscore_selected_class_name', selCls.name);
          } catch(err) {}
        }
      };

      // 1. If DOM already has items from HTML pre-render, just bind clicks immediately
      if (container.firstElementChild) {
        bindEvents();
      } else {
        // Hydrate from localStorage cache
        try {
          const cached = JSON.parse(localStorage.getItem('topscore_cached_sidebar_classes') || '[]');
          if (Array.isArray(cached) && cached.length > 0) {
            renderClasses(cached.filter(c => c.is_active !== false));
          }
        } catch(e) {}
      }

      // 2. Fetch fresh classes from server (stale-while-revalidate with forceRefresh)
      try {
        const classes = await adminFetchAll('classes', 'id, name, program_id, is_active', { is_active: true }, true);
        if (classes && classes.length > 0) {
          const activeClasses = classes.filter(c => c.is_active !== false);
          activeClasses.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' }));
          try {
            localStorage.setItem('topscore_cached_sidebar_classes', JSON.stringify(activeClasses));
          } catch(err) {}
          renderClasses(activeClasses);
        }
      } catch(err) {
        console.warn('[loadSidebarClasses] server fetch failed, using cache:', err);
      }
    };
    window.loadSidebarClasses = loadSidebarClasses;
    // Call immediately to hydrate sidebar classes with zero delay
    loadSidebarClasses();

    // Automatic Deactivation Safeguard: Batches with 0 active students and Classes with 0 members
    async function syncActiveCohortsAndClasses() {
      try {
        const sb = await getSupabase();
        if (!sb) return;
        const [
          { data: classes },
          { data: students },
          { data: batches },
          { data: classLevels }
        ] = await Promise.all([
          sb.from('classes').select('id, name, code, is_active, program_id, level_id'),
          sb.from('students').select('id, batch_id, level_id, program_id, is_active, program_status, deleted_at'),
          sb.from('batches').select('id, name, is_active, current_level_id, program_id, deleted_at'),
          Promise.resolve(sb.from('class_levels').select('class_id, level_id')).catch(() => ({ data: [] }))
        ]);

        if (!classes || !students || !batches) return;

        const activeStudents = students.filter(s => s.is_active && !s.deleted_at && (s.program_status || '').toUpperCase() !== 'INACTIVE' && s.program_status !== 'ALUMNI');
        const batchMap = new Map(batches.map(b => [b.id, b]));

        // 1. Check batches: If 0 active non-alumni students and currently is_active = true, deactivate
        for (const b of batches) {
          if (b.deleted_at) continue;
          const activeCount = activeStudents.filter(s => s.batch_id === b.id).length;
          if (activeCount === 0 && b.is_active) {
            await sb.from('batches').update({ is_active: false }).eq('id', b.id);
            b.is_active = false;
          }
        }

        // 2. Classes SSOT: Curriculum classes are permanent academic entities and must remain active.
        // Auto-heal: Ensure all non-deleted curriculum classes remain is_active: true.
        for (const cls of classes) {
          if (!cls.is_active && !cls.deleted_at) {
            await sb.from('classes').update({ is_active: true }).eq('id', cls.id);
            cls.is_active = true;
          }
        }
      } catch (e) {
        console.warn('[syncActiveCohortsAndClasses] background check error:', e);
      }
    }
    window.syncActiveCohortsAndClasses = syncActiveCohortsAndClasses;
    // Run periodically / upon init without blocking UI
    setTimeout(syncActiveCohortsAndClasses, 2500);

    window._classHubCache = window._classHubCache || {};

    // ── CLASS HUB (MAIN CONTENT AREA) ──
    async function renderClassHub(area) {
      window.renderClassHub = renderClassHub;
      window._classHubCache = window._classHubCache || {};

      if (!window._selectedClassId) {
        try {
          window._selectedClassId = localStorage.getItem('topscore_selected_class_id');
          window._selectedClassName = localStorage.getItem('topscore_selected_class_name') || 'Vocabulary';
        } catch(e) {}
      }

      let classId = window._selectedClassId;
      let className = window._selectedClassName || 'Vocabulary';

      try {
        const breadcrumb = document.getElementById('admin-breadcrumb');
        if (breadcrumb) {
          breadcrumb.innerHTML = `<span style="color:var(--clr-primary); font-weight:700;">CLASS</span> <span style="color:var(--clr-border); margin:0 0.5rem;">/</span> <span style="color:#fff; font-weight:600;">${escapeHtml(className)}</span>`;
        }

        // Fast in-memory check: if already showing or recently loaded, avoid full wipe spinner
        const cached = classId ? window._classHubCache[classId] : null;
        const isFresh = cached && (Date.now() - cached.timestamp < 120000);
        if (!isFresh && (!area.querySelector('#class-attendance-grid') || area.dataset.currentClassId !== classId)) {
          area.innerHTML = getLoadingStateHtml(`Loading Class Hub for ${className}...`);
        }
        area.dataset.currentClassId = classId || '';

        // Fetch master tables relevant to this class and curriculum structure
        // OPTIMIZATION: attempts query is deferred and strictly scoped to this class's tests (pruning 95%+ egress & avoiding 9x pagination loops)
        let [allClasses, allTests, allStudents, allPrograms, allBatches, allLevels, allVault, allInstitutions, allClassLevels] = await Promise.all([
          adminFetchAll('classes', 'id, name, program_id, level_id').catch(() => []),
          adminFetchAll('tests', 'id, title, category, test_type, test_subtype, shell_code, class_id, level_id, display_order, status, minimum_required_score, prerequisite_test_id, question_order, payload, deleted_at, created_at', {}, true).catch(() => []),
          adminFetchAll('students', 'id, name, gender, birth_date, is_active, deleted_at, level_id, batch_id, program_id, institution_id').catch(() => []),
          adminFetchAll('programs', 'id, name, institution_id').catch(() => []),
          adminFetchAll('batches', 'id, name, is_active, program_id, current_level_id').catch(() => []),
          adminFetchAll('levels').catch(() => []),
          adminFetchAll('vocabulary_vault', 'id, target_level, theme, theme_code, topic, topic_code, word_type, deleted_at').catch(() => []),
          adminFetchAll('institutions', 'id, name').catch(() => []),
          adminFetchAll('class_levels', 'class_id, level_id').catch(() => [])
        ]);

        const currentTenant = getActiveTenant();
        if (currentTenant !== 'ALL') {
          allClasses = (allClasses || []).filter(c => isClassInTenant(c.name, currentTenant));
        }

        if ((!classId || !allClasses.some(c => c.id === classId)) && allClasses && allClasses.length > 0) {
          const sorted = allClasses.slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
          window._selectedClassId = sorted[0].id;
          window._selectedClassName = sorted[0].name;
          classId = window._selectedClassId;
          className = window._selectedClassName;
          try {
            localStorage.setItem('topscore_selected_class_id', classId);
            localStorage.setItem('topscore_selected_class_name', className);
          } catch(e) {}
        }

        const currentClass = (allClasses || []).find(c => c.id === classId) || null;
        const boardClassMap = {};
        (allClasses || []).forEach(c => { boardClassMap[c.id] = c; });

        // Scoped attempts fetch strictly for tests of current class (ultra-lean single query instead of 8,827 rows)
        const relevantTestIds = (allTests || []).filter(t => t.class_id === classId && !t.deleted_at).map(t => t.id);
        let allAttempts = [];
        if (relevantTestIds.length > 0) {
          const CHUNK_SIZE = 80;
          if (relevantTestIds.length <= CHUNK_SIZE) {
            allAttempts = await adminFetchAll('attempts', 'id, student_id, test_id, attempt_number, status, score, correct_count, total_questions, percentage, effective_score, grade, is_best_score, is_forgiven, forgiven_reason, is_manual_override, forgiven_by, forgiven_at, is_remedial_unlocked, created_at, submitted_at', { test_id: relevantTestIds }).catch(() => []);
          } else {
            const chunks = [];
            for (let i = 0; i < relevantTestIds.length; i += CHUNK_SIZE) {
              chunks.push(relevantTestIds.slice(i, i + CHUNK_SIZE));
            }
            const chunkPromises = chunks.map(chunk =>
              adminFetchAll('attempts', 'id, student_id, test_id, attempt_number, status, score, correct_count, total_questions, percentage, effective_score, grade, is_best_score, is_forgiven, forgiven_reason, is_manual_override, forgiven_by, forgiven_at, is_remedial_unlocked, created_at, submitted_at', { test_id: chunk }).catch(() => [])
            );
            const chunkResults = await Promise.all(chunkPromises);
            allAttempts = chunkResults.flat();
          }
        }

        const classMap = {};
        (allPrograms || []).forEach(c => { classMap[c.id] = c; });
        const instMap = {};
        (allInstitutions || []).forEach(i => { instMap[i.id] = i.name; });
        const levelMap = {};
        (allLevels || []).forEach(l => { levelMap[l.id] = l; });

        const isManualClass = currentClass ? isManualEvaluationClass(currentClass) : false;
        const isCbtClass = !isManualClass;
        const isVocab = isCbtClass && (currentClass ? isVocabularyClass(currentClass) : false);
        const discipline = currentClass ? detectClassDiscipline(currentClass) : 'GENERAL';
        const classLevelId = currentClass?.level_id;
        const classLevelRec = classLevelId ? (allLevels || []).find(l => l.id === classLevelId) : null;
        const detectedLvlMatch = String(currentClass?.code || currentClass?.name || '').match(/(\d+)/);
        const fallbackLvlNum = detectedLvlMatch ? Number(detectedLvlMatch[1]) : null;
        const classLevelNum = (classLevelRec?.level_number != null) ? Number(classLevelRec.level_number) : fallbackLvlNum;
        const isLevel2Vocab = isVocab && (classLevelNum === 2);

        // Authoritative helpers to determine if a topic or theme contains Phrases (Level 2 is strictly Words-only SSOT)
        const checkTopicHasPhrases = (matchingTasks) => {
          if (isLevel2Vocab) return false;
          return (matchingTasks || []).some(a =>
            a.payload?.is_unified ||
            a.payload?.category === 'phrases' ||
            a.payload?.category === 'unified' ||
            /PHRASE/i.test(a.shell_code || a.title || '')
          );
        };

        const checkThemeHasPhrases = (taskAsmsInTheme) => {
          if (isLevel2Vocab) return false;
          const hasTaskPhrases = (taskAsmsInTheme || []).some(a =>
            a.payload?.is_unified ||
            a.payload?.category === 'phrases' ||
            a.payload?.category === 'unified' ||
            /PHRASE/i.test(a.shell_code || a.title || '')
          );
          if (hasTaskPhrases) return true;
          if (isVocab && classLevelNum === 3) return true;
          return false;
        };

        let classTests = (allTests || []).filter(a => {
          if (a.class_id !== classId) return false;
          if (a.deleted_at) return false;
          // Discipline Gating: Vocabulary tests must not appear in non-vocabulary classes
          if (!isVocab) {
            const shell = String(a.shell_code || '').toUpperCase();
            const title = String(a.title || '').toLowerCase();
            if (shell.includes('-VCB-') || title.includes('vocabulary task') || title.includes('vocabulary exam')) {
              return false;
            }
          }
          return true;
        });

        // Filter to published tests when present so obsolete draft/legacy test rows do not pollute the matrix
        const publishedClassTests = classTests.filter(a => String(a.status || '').toLowerCase() === 'published');
        if (publishedClassTests.length > 0) {
          classTests = publishedClassTests;
        }

        // Auto Cache-Bust: if cached test array has 0 items for this class, force-refresh tests directly from DB
        if (classTests.length === 0 && classId) {
          const freshTests = await adminFetchAll('tests', 'id, title, category, test_type, test_subtype, shell_code, class_id, level_id, display_order, status, minimum_required_score, prerequisite_test_id, question_order, payload, deleted_at, created_at', {}, true).catch(() => []);
          const freshClassTests = (freshTests || []).filter(a => a.class_id === classId && !a.deleted_at);
          if (freshClassTests.length > 0) {
            allTests = freshTests;
            const pubFresh = freshClassTests.filter(a => String(a.status || '').toLowerCase() === 'published');
            classTests = pubFresh.length > 0 ? pubFresh : freshClassTests;
          }
        }

        // Self-Healing / Auto-Provisioning: Strictly for Vocabulary classes only!
        if (classTests.length === 0 && currentClass && isVocab) {
          if (classLevelNum !== null && classLevelNum !== undefined) {
            const hasVaultData = (allVault || []).some(v => Number(v.target_level) === Number(classLevelNum) && !v.deleted_at);
            if (hasVaultData) {
              try {
                const syncRes = await autoSyncClassTestsForLevel(classLevelNum, {
                  programId: currentClass.program_id,
                  explicitClassId: classId
                });
                if (syncRes && syncRes.synced) {
                  const freshTests = await adminFetchAll('tests');
                  if (freshTests && freshTests.length > 0) {
                    allTests = freshTests;
                    classTests = allTests.filter(a => a.class_id === classId);
                  }
                }
              } catch (syncErr) {
                console.warn('[renderClassHub] Auto-provision failed:', syncErr);
              }
            }
          }
        }

        // Helper to accurately identify milestone exams vs tasks (Strict Exam Filter)
        const isWeeklyExam = (asm) => {
          if (!asm) return false;
          const t = String(asm.test_type || asm.type || '').toLowerCase();
          if (t === 'exam') return true;
          if (t === 'quiz') return false;
          const c = String(asm.category || asm.payload?.tier || asm.payload?.category || '').toUpperCase();
          if (c === 'EXAM') return true;
          if (c === 'QUIZ' || c === 'TASK') return false;
          const shell = String(asm.shell_code || asm.payload?.shell_code || '').toUpperCase();
          if (shell.endsWith('-EXAM') || shell.includes('-EXAM-')) return true;
          if (shell.endsWith('-QUIZ') || shell.includes('-QUIZ-')) return false;
          if (shell.endsWith('-TEST') || shell.includes('-TEST-')) return true;
          if (shell.endsWith('-TASK') || shell.includes('-TASK-')) return false;
          return false;
        };
        const isExam = isWeeklyExam;

        // Authoritative helper to distinguish Words vs Phrases attempts (Rule 2.10.2 "Berbeda tapi satu")
        const getAttemptSection = (att) => {
          if (att?.payload?.section === 'phrases' || att?.payload?.subtype === 'phrases' || att?.test_section === 'phrases') return 'phrases';
          if (att?.forgiven_reason && /PHRASES?/i.test(att.forgiven_reason)) return 'phrases';
          if (att?.forgiven_reason && /WORDS?/i.test(att.forgiven_reason)) return 'words';
          const totalQ = Number(att?.total_questions || 0);
          const correctCount = Number(att?.correct_count || att?.score || 0);
          if (totalQ > 0 && totalQ <= 20) return 'phrases';
          if (totalQ > 20) return 'words';
          if (correctCount > 15) return 'words';
          if (correctCount > 0 && correctCount <= 10) return 'phrases';
          return 'words';
        };
        const allClassExams = classTests.filter(isWeeklyExam);
        const totalClassExams = allClassExams.length || 8;
        // Find students that have access to this class's program AND level
        const classProgramId = currentClass?.program_id;
        const programBatches = (allBatches || []).filter(b => b.program_id === classProgramId);

        // Build the set of valid level IDs for this class (class_levels junction table, fallback to class.level_id)
        const classLevelIds = new Set(
          (allClassLevels || [])
            .filter(cl => cl.class_id === classId)
            .map(cl => cl.level_id)
        );
        if (classLevelIds.size === 0 && currentClass?.level_id) {
          classLevelIds.add(currentClass.level_id);
        }

        const classStudents = (allStudents || []).filter(s => {
          if (s.deleted_at) return false;
          if (s.is_active === false || (s.program_status || '').toUpperCase() === 'INACTIVE') return false;

          const batchObj = (allBatches || []).find(b => b.id === s.batch_id);
          const batchProgId = batchObj?.program_id;

          // Program must match
          const progMatch = classProgramId && (s.program_id === classProgramId || batchProgId === classProgramId);
          if (!progMatch) return false;

          // Level must match: student.level_id first, fallback to batch.current_level_id
          // If no class level is defined, include all program students (safe fallback)
          if (classLevelIds.size === 0) return true;
          const studentEffectiveLevelId = s.level_id || batchObj?.current_level_id || null;
          if (!studentEffectiveLevelId) return true; // No level data on student → include (safe fallback)
          return classLevelIds.has(studentEffectiveLevelId);
        });

        const activeStudents = classStudents.filter(s => s.is_active !== false);

        const _norm = (v) => String(v || '').toLowerCase();
        const _ALL_THEMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        const _PHRASE_TYPES = ['expression', 'idiom', 'proverb', 'phrase'];
        const _vaultRows = (allVault || []).filter(v => !v.deleted_at);
        const vaultCountFor = (r, lvlNumber) => {
          const pl = r?.payload || {};
          const isUnified = pl.category === 'unified' || pl.is_unified === true || pl.is_unified_test === true || r?.test_type === 'UNIFIED_TEST';
          const wantPhrases = pl.category === 'phrases';
          // isTest = true when this test is a cumulative Exam/Test (not a topic-level Task)
          const isTest = (r?.category === 'EXAM' || r?.category === 'TEST' || String(r?.test_type).toLowerCase() === 'exam' || (r?.shell_code && (r.shell_code.includes('-TEST') || r.shell_code.includes('-EXAM'))) || r?.test_subtype?.includes('EXAM') || r?.test_subtype?.includes('TEST')) && !pl.topic_code;
          // For cumulative exams, build the full set of themes they cover
          let themes = (pl.themes && Array.isArray(pl.themes) && pl.themes.length > 0) ? pl.themes : null;
          if (!themes && isTest && pl.theme_code) {
            const idx = _ALL_THEMES.indexOf(String(pl.theme_code).toUpperCase());
            themes = idx >= 0 ? _ALL_THEMES.slice(0, idx + 1) : [pl.theme_code];
          }
          return _vaultRows.filter(v => {
            if (Number(v.target_level) !== Number(lvlNumber)) return false;
            const isPhrase = _PHRASE_TYPES.includes(_norm(v.word_type));
            if (!isUnified && wantPhrases !== isPhrase) return false;
            if (isTest) {
              // Cumulative exams: include all words in the themes array (A, A+B, A+B+C, etc.)
              if (themes && !themes.includes(v.theme_code)) return false;
            } else {
              // Tasks: single-theme filter — only words matching this exact theme/topic
              if (pl.theme_code && v.theme_code !== pl.theme_code) return false;
              if (pl.topic_code) {
                const normPlCode = (/^[A-Za-z]/.test(String(pl.topic_code))) ? String(pl.topic_code).toUpperCase() : `${String(pl.theme_code || '').toUpperCase()}${pl.topic_code}`;
                const normVCode = (/^[A-Za-z]/.test(String(v.topic_code))) ? String(v.topic_code).toUpperCase() : `${String(v.theme_code || '').toUpperCase()}${v.topic_code}`;
                if (normVCode !== normPlCode && String(v.topic_code).toUpperCase() !== String(pl.topic_code).toUpperCase()) return false;
              }
            }
            return true;
          }).length;
        };

        const formatAnswerType = (type) => {
          if (!type) return 'Recognition';
          const t = String(type).toLowerCase().replace(/_/g, ' ').trim();
          if (t === 'multiple choice' || t === 'selection' || t === 'recognition' || t === 'm2') return 'Recognition';
          if (t === 'voice match' || t === 'spoken' || t === 'm3') return 'Spoken';
          if (t === 'text match' || t === 'written' || t === 'm4') return 'Written';
          if (t === 'description' || t === 'point & speak' || t === 'm1') return 'Description';
          if (t === 'speech' || t === 'speaking performance' || t === 'm5') return 'Speech';
          if (t === 'monologue' || t === 'storytelling' || t === 'm6') return 'Monologue';
          if (t === 'dialogue' || t === 'roleplay' || t === 'm7') return 'Dialogue';
          if (t === 'interview' || t === 'conversation' || t === 'm8') return 'Interview';
          return t.charAt(0).toUpperCase() + t.slice(1);
        };

        const statusColors = { published: 'badge-success', draft: 'badge-neutral' };

        // Calculate DataGrid format for Tests (Rich/Detailed)
        window._classHubRecords = {};
        const testsGridData = classTests.map(r => {
          window._classHubRecords[r.id] = r;
          const programName = (r?.program_id && classMap[r.program_id]?.name) ? classMap[r.program_id].name : 'All Programs';
          const prereqId = r?.prerequisite_test_id || r?.prerequisite_id;
          const prereqTest = (prereqId && allTests.find(a => a.id === prereqId)) || null;
          const boardName = (r?.class_id && boardClassMap[r.class_id]?.name) || r?.classes?.name || '—';
          const lvlObj = (r?.level_id && levelMap[r.level_id]) || r?.levels;
          const lvlNum = lvlObj?.level_number != null ? lvlObj.level_number : (currentClass?.level_id && levelMap[currentClass.level_id]?.level_number != null ? levelMap[currentClass.level_id].level_number : 1);
          const cleanLvlNum = lvlNum != null ? lvlNum : 1;
          const levelDisplay = window.toLevelLetter ? window.toLevelLetter(cleanLvlNum) : (cleanLvlNum === 0 ? 'LVL 0' : 'LVL ' + cleanLvlNum);
          const prereqTitle = prereqTest?.shell_code || prereqTest?.title || prereqTest?.name || r?.prereq?.name || r?.prerequisite?.name || r?.prereq || '';

          const title = r?.title || r?.display_name || r?.name || 'Untitled';
          const status = r?.status || r?.test_type || 'draft';
          const TestCategory = (r?.category || r?.test_type || 'Task');

          const rawAns = r?.answer_type || 'spoken';
          const isPhrase = r?.payload?.category === 'phrases'
            || r?.test_subtype?.includes('PHRASE')
            || (r?.shell_code && r.shell_code.includes('PHRASE'))
            || String(r?.title || '').toLowerCase().includes('phrase');
          const isUnified = r?.payload?.category === 'unified'
            || r?.test_subtype?.includes('UNIFIED')
            || (r?.shell_code && r.shell_code.includes('UNIFIED'))
            || String(r?.title || '').toLowerCase().includes('words & phrases');
          const category = isPhrase ? 'phrases' : (isUnified ? 'unified' : 'words');

          const minScore = r?.minimum_required_score || 60;
          const _isDyn = !!(r?.payload && r.payload.is_dynamic_shell) || r?.is_dynamic_shell === true;
          const _vaultQ = _isDyn ? vaultCountFor(r, cleanLvlNum) : 0;
          const qCount = r?.total_questions || r?.payload?.total_questions || (r?.test_type === 'exam' ? 120 : 40);
          const effectiveQCount = _isDyn ? _vaultQ : qCount;

          // Repetitions Calculation (DECISION-084 / Rule 2.4.1)
          let classTaskReps = null;
          try {
            const cachedSettings = (typeof window !== 'undefined' && window.localStorage) ? window.localStorage.getItem(`topscore_test_settings_${classId}`) : null;
            if (cachedSettings) {
              const parsed = JSON.parse(cachedSettings);
              if (parsed.taskRepetitions) classTaskReps = Number(parsed.taskRepetitions);
            }
          } catch (_) {}
          const isExamTest = String(r?.category || r?.test_type || '').toLowerCase().includes('exam') || String(r?.title || '').toLowerCase().includes('exam');
          const repetitions = isExamTest ? 1 : Math.max(1, parseInt(r?.payload?.task_repetitions || r?.required_repetitions || classTaskReps, 10) || 7);

          // Words vs Phrases Count Calculation
          const isVocab = typeof isVocabularyClass === 'function' ? isVocabularyClass(currentClass) : true;
          const isWordsOnlyClass = cleanLvlNum === 0 || cleanLvlNum === 2 || /^(SHRT|EVNK|TPTC)-VOCAB/i.test(currentClass?.code || '') || /^(SHRT|EVNK|TPTC)-VCB/i.test(r?.shell_code || '');
          let wordsCount = 0;
          let phrasesCount = 0;
          if (isWordsOnlyClass) {
            wordsCount = effectiveQCount;
            phrasesCount = 0;
          } else if (isPhrase) {
            wordsCount = 0;
            phrasesCount = effectiveQCount;
          } else if (isUnified) {
            wordsCount = Number(r?.payload?.words_count) || Math.round(effectiveQCount * 0.8);
            phrasesCount = Number(r?.payload?.phrases_count) || (effectiveQCount - wordsCount);
          } else {
            wordsCount = effectiveQCount;
            phrasesCount = 0;
          }

          // Real-time dynamic duration calculation (SSOT DECISION-062):
          // Prioritizes tutor's manual working_duration_minutes, otherwise calculates from 10s/word & 20s/phrase
          const manualDur = Number(r?.working_duration_minutes || r?.payload?.working_duration_minutes || r?.time_limit_minutes || 0);
          const timeLimit = manualDur > 0
            ? manualDur
            : (effectiveQCount > 0
                ? calculateAutoDurationMinutes(effectiveQCount, rawAns, category)
                : Math.floor((r?.time_limit_seconds || 3600) / 60));

          return {
            id: r?.id || '',
            title,
            programName,
            classBoard: boardName,
            level: levelDisplay,
            order: r?.display_order ?? r?.order_index ?? 1,
            prereq: prereqTitle,
            answerType: formatAnswerType(rawAns),
            questionOrder: (String(r?.question_order || r?.payload?.question_order || 'random').toLowerCase() === 'sequential') ? 'Seq' : 'Random',
            TestCategory,
            repetitions,
            isVocab,
            wordsCount,
            phrasesCount,
            timeLimit,
            minScore,
            qCount: _isDyn ? _vaultQ : qCount,
            qIsVault: _isDyn,
            status,
            shellCode: r?.shell_code || '',
            _raw: r || {}
          };
        });

        // Sort classTests sequentially by display_order / order_index
        classTests.sort((a, b) => (a.display_order ?? a.order_index ?? 999) - (b.display_order ?? b.order_index ?? 999));

        const getAsmExpectedMax = (asm) => {
          if (!asm) return 40;
          if (asm.payload?.total_questions && Number(asm.payload.total_questions) > 0) {
            return Number(asm.payload.total_questions);
          }
          if (asm.total_questions && Number(asm.total_questions) > 0) {
            return Number(asm.total_questions);
          }
          const isTest = isWeeklyExam(asm);
          const code = String(asm.payload?.shell_code || asm.shell_code || asm.title || '');
          const isPhrase = asm.payload?.category === 'phrases' || /PHRASES/i.test(code) || /phrase/i.test(asm.title || '');
          if (!isTest) return isPhrase ? 10 : 40;
          if (/3A/i.test(code) || /Workplace/i.test(code)) return isPhrase ? 30 : 120;
          if (/3B/i.test(code) || /Tourism/i.test(code)) return isPhrase ? 70 : 280;
          if (/3C/i.test(code) || /CCU/i.test(code)) return isPhrase ? 120 : 480;
          if (/3D/i.test(code) || /High-Frequency/i.test(code)) return isPhrase ? 160 : 640;
          return isPhrase ? 30 : 120;
        };

        // Calculate total possible points in curriculum across all tests for cumulative mastery
        let curriculumTotalMaxPoints = 0;
        classTests.forEach(asm => {
          const q = Number(asm.total_questions || getAsmExpectedMax(asm));
          curriculumTotalMaxPoints += q;
        });
        if (curriculumTotalMaxPoints === 0) curriculumTotalMaxPoints = (classTests.length || 20) * 50;

        // Fetch dynamic test system settings for this class (target repetitions & pass threshold)
        const classTestSettings = (typeof fetchClassTestSettings === 'function')
          ? await fetchClassTestSettings(classId || cid).catch(() => ({ taskRepetitions: 7, taskMinScore: 60, examMinScore: 60 }))
          : { taskRepetitions: 7, taskMinScore: 60, examMinScore: 60 };
        const targetReps = Math.max(1, Number(classTestSettings?.taskRepetitions) || 7);
        // Per-component repetition target (Words or Phrases individually — dynamic from class settings)
        const compTargetReps = (targetReps >= 14) ? Math.round(targetReps / 2) : targetReps;
        const taskMinScore = Number(classTestSettings?.taskMinScore) || 60;
        const examMinScore = Number(classTestSettings?.examMinScore) || 60;

        // Calculate DataGrid format for Students
        window._classStudentsMap = {};
        const batchMap = {};
        (allBatches || []).forEach(b => { batchMap[b.id] = b; });

        const studentsGridData = classStudents.map(s => {
          window._classStudentsMap[s.id] = s;

          const batchObj = batchMap[s.batch_id];
          const instName = s.institutions?.name || (s.institution_id ? instMap[s.institution_id] : '') || (s.program_id && classMap[s.program_id]?.institution_id ? instMap[classMap[s.program_id].institution_id] : '') || (s.programs?.institution_id ? instMap[s.programs.institution_id] : '') || '—';
          let instShort = instName;
          const normInst = instName.toLowerCase();
          if (normInst.includes('cake')) instShort = 'CEC';
          else if (normInst.includes('top')) instShort = 'TOP';
          else if (instName.length > 5) {
            const parts = instName.replace(/[^a-zA-Z0-9 ]/g, '').split(/\s+/).filter(Boolean);
            if (parts.length > 1) instShort = parts.map(p => p[0].toUpperCase()).join('');
            else instShort = instName.slice(0, 4).toUpperCase();
          }
          const progName = s.programs?.name || (s.program_id ? classMap[s.program_id]?.name : '') || '—';

          // Age calculation
          let ageDisplay = '—';
          if (s.birth_date) {
            const bd = new Date(s.birth_date);
            if (!isNaN(bd.getTime())) {
              const today = new Date();
              let age = today.getFullYear() - bd.getFullYear();
              const m = today.getMonth() - bd.getMonth();
              if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--;
              if (age && age > 0) ageDisplay = `${age} yrs`;
            }
          }

          // Level calculation
          let levelName = '—';
          if (s.level_id && levelMap[s.level_id]) {
            levelName = levelMap[s.level_id].name;
          } else if (batchObj?.current_level_id && levelMap[batchObj.current_level_id]) {
            levelName = levelMap[batchObj.current_level_id].name;
          } else if (s.batches?.current_level_id && levelMap[s.batches.current_level_id]) {
            levelName = levelMap[s.batches.current_level_id].name;
          }

          // Attempts and Progress calculation for this class
          const studentAttempts = (allAttempts || []).filter(a => a.student_id === s.id);
          const classTestIds = new Set(classTests.map(a => a.id));
          const classAttempts = studentAttempts.filter(a => classTestIds.has(a.test_id || a.Test_id));

          // Map best attempt per test (Rule 2.7: report card stores HIGHEST score)
          const asmScores = {};
          const rowScoreSortVals = {};
          const asmPassCounts = {};
          const asmWordsPassCounts = {};
          const asmPhrasesPassCounts = {};

          let completedCount = 0;         // ALL activities (tasks + exams)
          const studentExamEntries = [];

          // Step 1: Map best attempt per activity
          classTests.forEach(asm => {
            const atts = classAttempts.filter(a => (a.test_id || a.Test_id) === asm.id);
            const maxQ = getAsmExpectedMax(asm);
            let bestAtt = null;
            if (atts.length > 0) {
              const submittedAtts = atts.filter(a => {
                const st = String(a.status || '').toLowerCase();
                return ['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(st);
              });
              if (submittedAtts.length > 0) {
                // Rule 2.7: Report card stores HIGHEST valid score (protects students from zero-point auto-close sweeps)
                submittedAtts.sort((x, y) => {
                  const xTotal = Number(x.total_questions || maxQ);
                  const yTotal = Number(y.total_questions || maxQ);
                  const xSc = Math.min(Number(x.score ?? 0), xTotal);
                  const ySc = Math.min(Number(y.score ?? 0), yTotal);
                  const scoreDiff = ySc - xSc;
                  if (scoreDiff !== 0) return scoreDiff;
                  const pctDiff = Number(y.percentage ?? 0) - Number(x.percentage ?? 0);
                  if (Math.abs(pctDiff) > 0.01) return pctDiff;
                  return new Date(y.submitted_at || y.created_at || 0) - new Date(x.submitted_at || x.created_at || 0);
                });
                const topAtt = submittedAtts[0];
                const markedBest = submittedAtts.find(a => a.is_best_score === true);
                if (markedBest && Math.min(Number(markedBest.score ?? 0), Number(markedBest.total_questions || maxQ)) >= Math.min(Number(topAtt.score ?? 0), Number(topAtt.total_questions || maxQ)) && Number(markedBest.percentage ?? 0) >= Number(topAtt.percentage ?? 0) - 0.01) {
                  bestAtt = markedBest;
                } else {
                  bestAtt = topAtt;
                }
              } else {
                bestAtt = atts[0];
              }
            }

            asmScores[asm.id] = bestAtt ? { ...bestAtt } : null;

            const submittedAttsForPass = (atts || []).filter(a => {
              const st = String(a.status || '').toLowerCase();
              return ['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(st);
            });
            const maxQForPass = getAsmExpectedMax(asm);
            let wordsPasses = 0;
            let phrasesPasses = 0;
            let manualRepsW = null;
            let manualRepsP = null;
            let hasForgiven = false;

            submittedAttsForPass.forEach(a => {
              if (a.is_forgiven) hasForgiven = true;
              const fr = String(a.forgiven_reason || '');
              const mMatch = fr.match(/MANUAL_REPS:?\s*(\d+)(?:\/(\d+))?(?:\s*(WORDS|PHRASES))?/i);
              if (mMatch) {
                const reps = Math.min(compTargetReps, parseInt(mMatch[1], 10));
                const comp = (mMatch[3] || '').toUpperCase();
                if (comp === 'PHRASES') {
                  manualRepsP = Math.max(manualRepsP || 0, reps);
                } else if (comp === 'WORDS') {
                  manualRepsW = Math.max(manualRepsW || 0, reps);
                } else {
                  manualRepsW = Math.max(manualRepsW || 0, reps);
                  manualRepsP = Math.max(manualRepsP || 0, reps);
                }
              }

              const tq = Number(a.total_questions || maxQForPass);
              const sc = a.score != null ? Math.min(Number(a.score), tq) : 0;
              const pct = tq > 0 ? (sc / tq) * 100 : 0;
              const passes = pct >= taskMinScore || a.is_forgiven;
              if (passes) {
                const sec = typeof getAttemptSection === 'function' ? getAttemptSection(a) : 'words';
                if (sec === 'phrases') phrasesPasses++;
                else wordsPasses++;
              }
            });

            if (manualRepsW != null) wordsPasses = manualRepsW;
            if (manualRepsP != null) phrasesPasses = manualRepsP;
            if (hasForgiven) {
              wordsPasses = Math.max(wordsPasses, compTargetReps);
              phrasesPasses = Math.max(phrasesPasses, compTargetReps);
            }

            asmWordsPassCounts[asm.id] = Math.min(compTargetReps, wordsPasses);
            asmPhrasesPassCounts[asm.id] = Math.min(compTargetReps, phrasesPasses);
            asmPassCounts[asm.id] = Math.min(compTargetReps, Math.min(wordsPasses, phrasesPasses));
          });

          // Step 2: Rule 2.10 Paired Theme Exam Remedial Synchronization ("Satu Paket")
          // In each theme (A, B, C, D), Words Exam and Phrases Exam are one package.
          // If either is remedial, BOTH are synchronized as remedial.
          const themeExamMap = {};
          classTests.filter(isWeeklyExam).forEach(asm => {
            const rawTheme = asm.payload?.theme_code || (asm.shell_code ? asm.shell_code.replace(/^[0-9]+/, '').charAt(0) : 'A');
            const tc = (rawTheme || 'A').toUpperCase();
            if (!themeExamMap[tc]) themeExamMap[tc] = [];
            themeExamMap[tc].push(asm);
          });
          // Step 3: Compute effective scores, completion, and sort values
          classTests.forEach(asm => {
            const bestAtt = asmScores[asm.id];
            const maxQ = getAsmExpectedMax(asm);
            const totalQ = Number(bestAtt?.total_questions || maxQ);
            const rawEarned = bestAtt?.score != null ? Math.min(Number(bestAtt.score), totalQ) : 0;
            const rawPct = bestAtt ? (bestAtt.percentage != null ? Number(bestAtt.percentage) : (totalQ > 0 ? (rawEarned / totalQ) * 100 : 0)) : -1;
            const hasRealAtt = bestAtt && ['submitted','auto_submitted','evaluated','graded'].includes(String(bestAtt?.status||'').toLowerCase());

            if (hasRealAtt) {
              completedCount++;
              const isRem = Boolean(bestAtt?.is_remedial_unlocked || bestAtt?.is_remedial);
              const effEarned = isRem ? Math.min(rawEarned, totalQ * 0.6) : rawEarned;
              const effPct = isRem ? Math.min(rawPct, 60.0) : rawPct;

              if (isWeeklyExam(asm)) {
                studentExamEntries.push({
                  test: asm,
                  effPoints: effEarned,
                  effPct,
                  totalQ,
                  isForgiven: Boolean(bestAtt?.is_forgiven)
                });
              }

              rowScoreSortVals[`test_${asm.id}`] = effEarned;
              rowScoreSortVals[`test_${asm.id}_pts`] = effEarned;
              rowScoreSortVals[`test_${asm.id}_pct`] = effPct;
            } else {
              rowScoreSortVals[`test_${asm.id}`] = -1;
              rowScoreSortVals[`test_${asm.id}_pts`] = -1;
              rowScoreSortVals[`test_${asm.id}_pct`] = -1;
            }
          });

          const totalClassTests = classTests.length || 40;

          // 1. PROG % (Completion Rate): Maintain calculation across ALL activities (tasks + exams)
          const allActProgressPct = totalClassTests > 0 ? Math.round((completedCount / totalClassTests) * 100) : 0;
          const examProgressPct = totalClassExams > 0 ? Math.round((studentExamEntries.length / totalClassExams) * 100) : 0;
          const progressPct = allActProgressPct;
          const progressStr = `${progressPct}%`;

          // 2. Milestone Progression Engine (Next Exam 0% Penalty):
          // Evaluates EXCLUSIVELY from Exams via authoritative computeMilestoneExamMastery.
          // When a student passes Theme N (>= 60%), Theme N+1 is queued into the denominator with 0% score.
          const mastery = (typeof computeMilestoneExamMastery === 'function')
            ? computeMilestoneExamMastery(studentExamEntries, allClassExams)
            : {
                totalPoints: studentExamEntries.reduce((acc, c) => acc + (c.effPoints || 0), 0),
                overallScore: 0,
                grade: '—',
                denominator: 0,
                completedExamCount: studentExamEntries.length,
                completedWeeklyCount: studentExamEntries.length
              };

          const completedExamCount = mastery.completedExamCount ?? mastery.completedWeeklyCount ?? studentExamEntries.length;
          const completedWeeklyCount = completedExamCount;
          const calibratedExamProgPct = totalClassExams > 0 ? Math.round((completedExamCount / totalClassExams) * 100) : 0;

          // Rule 2.8 & Gradebook: Calculate student's average exam score and grade from completed exams
          const validExamEntries = studentExamEntries.filter(e => {
            const isPureForgivenZero = Boolean(e.isForgiven) && Number(e.effPoints ?? e.points ?? 0) === 0;
            return !isPureForgivenZero;
          });
          const averageScorePct = validExamEntries.length > 0
            ? Math.round(validExamEntries.reduce((sum, e) => sum + Number(e.effPct ?? 0), 0) / validExamEntries.length)
            : 0;
          const grade = validExamEntries.length > 0
            ? (typeof calculateGrade === 'function' ? calculateGrade(averageScorePct) : '—')
            : '—';
          const totalEarnedScore = validExamEntries.reduce((sum, e) => sum + Number(e.effPoints ?? 0), 0);
          const overallPct = averageScorePct;
          const curriculumGradePct = averageScorePct;
          const totalMaxPossible = validExamEntries.reduce((sum, e) => sum + Number(e.totalQ || 120), 0);

          let gradeColor = 'rgba(255,255,255,0.4)';
          if (grade && grade !== '—' && grade !== '-') {
            gradeColor = typeof getGradeColorByScore === 'function' ? getGradeColorByScore(averageScorePct) : (typeof getGradeColor === 'function' ? getGradeColor(grade) : (TOPSCORE_COLORS?.E || 'var(--grade-e)'));
          }

          // Find latest submitted test
          let latestAsm = null;
          let latestScore = -1;
          let lastSubmittedAt = null;
          const submittedAtts = classAttempts.filter(a => {
            const st = String(a.status || '').toLowerCase();
            return ['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(st);
          });
          if (submittedAtts.length > 0) {
            for (const att of submittedAtts) {
              const dt = att.submitted_at || att.created_at;
              if (dt && (!lastSubmittedAt || new Date(dt) > new Date(lastSubmittedAt))) {
                lastSubmittedAt = dt;
              }
            }
            submittedAtts.sort((x, y) => {
              const diff = Number(y.score ?? 0) - Number(x.score ?? 0);
              if (diff !== 0) return diff;
              return new Date(y.submitted_at || y.created_at || 0) - new Date(x.submitted_at || x.created_at || 0);
            });
            const la = submittedAtts[0];
            const asm = classTests.find(a => a.id === (la.test_id || la.Test_id));
            const code = asm?.shell_code || asm?.title || 'Task';
            const sc = la.score != null ? Number(la.score) : 0;
            const asmLevelNum = levelMap[asm?.level_id]?.level_number != null ? levelMap[asm?.level_id].level_number : 1;
            const totalQ = Number(la.total_questions || (asm?.is_dynamic_shell || asm?.payload?.is_dynamic_shell ? vaultCountFor(asm, asmLevelNum) : 50));
            const pct = Math.round(la.percentage != null ? Number(la.percentage) : (totalQ > 0 ? (sc / totalQ) * 100 : 0));
            const g = la.grade || (typeof getGrade === 'function' ? getGrade(pct) : (pct >= 90 ? 'S' : pct >= 70 ? 'B' : pct >= 50 ? 'C' : 'D'));
            latestScore = sc;
            latestAsm = {
              title: asm?.title || code,
              code,
              score: sc,
              total: totalQ,
              pct,
              grade: g,
              status: la.status
            };
          }

          const isBatchActive = s.batches ? s.batches.is_active !== false : false;

          // Check if student has any unlocked remedial test
          const hasRemedial = Object.values(asmScores).some(att => Boolean(att?.is_remedial_unlocked));

          return {
            id: s.id,
            name: s.name || 'Unknown',
            displayName: (typeof cleanStudentName === 'function') ? (cleanStudentName(s.name) || s.name || 'Unknown') : (s.name || 'Unknown'),
            instName,
            instShort,
            progName,
            photoUrl: s.photo_url || '',
            initial: getStudentInitial(s.name),
            gender: s.gender || '',
            ageDisplay,
            batch: batchObj?.name || s.batches?.name || (s.batch_id ? batchMap[s.batch_id]?.name : '') || '—',
            isBatchActive,
            levelName,
            hasRemedial,
            completedCount,
            completedExamCount,
            completedWeeklyCount,
            totalClassTests,
            totalClassExams,
            allActProgressPct,
            examProgressPct: calibratedExamProgPct,
            progressPct,
            progressStr,
            averageScorePct,
            curriculumGradePct,
            overallPct,
            totalEarnedScore,
            totalMaxPossible,
            grade,
            gradeColor,
            latestAsm,
            latestScore,
            lastSubmittedAt,
            asmScores,
            asmPassCounts,
            asmWordsPassCounts,
            asmPhrasesPassCounts,
            allAttempts: studentAttempts,
            activeThemeCode: mastery.activeThemeCode || null,
            includedThemeCodes: mastery.includedThemeCodes || [],
            includedExamIds: mastery.includedExamIds || new Set(),
            pin: s.pin || '****',
            phone: s.phone || s.phone_number || '—',
            email: s.email || '—',
            isActive: s.is_active !== false,
            ...rowScoreSortVals,
            _raw: s
          };
        });

        // Leaderboard Sort Order (Milestone Exam Progress-First Primary, Total Points Secondary per User Specification):
        // 1. Primary: Exam Milestone Progress DESC (Progression through Milestone Exams)
        // 2. Secondary: Global PTS DESC (Total points from ALL completed exams)
        // 3. Tertiary: Global SCORE % DESC (Curriculum accuracy percentage)
        // 4. Quaternary: Earliest lastSubmittedAt ASC
        // 5. Clean student name ASC
        studentsGridData.sort((a, b) => {
          const aActive = a.isActive ? 1 : 0;
          const bActive = b.isActive ? 1 : 0;
          if (aActive !== bActive) return bActive - aActive;

          // 1. Primary: Exam Milestone Progress DESC (Progress first)
          const progA = Number(a.examProgressPct ?? a.progressPct ?? 0);
          const progB = Number(b.examProgressPct ?? b.progressPct ?? 0);
          if (progA !== progB) return progB - progA;

          // 2. Secondary: Global PTS DESC (Total points from ALL completed exams)
          const ptsA = Number(a.totalEarnedScore ?? 0);
          const ptsB = Number(b.totalEarnedScore ?? 0);
          if (ptsA !== ptsB) return ptsB - ptsA;

          // 3. Tertiary: Global SCORE % DESC
          const examCountA = a.completedExamCount ?? a.completedWeeklyCount ?? 0;
          const examCountB = b.completedExamCount ?? b.completedWeeklyCount ?? 0;
          const scoreA = (examCountA > 0) ? Number(a.averageScorePct ?? 0) : -1;
          const scoreB = (examCountB > 0) ? Number(b.averageScorePct ?? 0) : -1;
          if (scoreA !== scoreB) return scoreB - scoreA;

          // 4. Earliest last submission timestamp
          if (a.lastSubmittedAt && b.lastSubmittedAt) {
            const diff = new Date(a.lastSubmittedAt) - new Date(b.lastSubmittedAt);
            if (diff !== 0) return diff;
          }

          return (a.displayName || a.name || '').localeCompare(b.displayName || b.name || '', undefined, { sensitivity: 'base', numeric: true });
        });


        // State for active tab (Order: 1. Students Grade and Score, 2. Test Sessions, 3. Class Tests)
        if (!window._classHubActiveTab) {
          window._classHubActiveTab = localStorage.getItem('topscore_admin_class_hub_tab') || 'attendance';
        }

        window._switchClassHubTab = (tabId) => {
          window._classHubActiveTab = tabId;
          try {
            localStorage.setItem('topscore_admin_class_hub_tab', tabId);
            if (window.history && window.history.replaceState) {
              window.history.replaceState(null, '', `#class-hub?tab=${tabId}`);
            }
          } catch(_) {}
          window.renderClassHub(document.getElementById('admin-content-area'));
        };

        const activeBatchStudents = classStudents.filter(s => {
          const b = batchMap[s.batch_id];
          return (b ? b.is_active !== false : true) && s.is_active !== false && (s.program_status || '').toUpperCase() !== 'INACTIVE';
        });

        const taskTests = classTests.filter(a => a.test_type === 'quiz' || a.category === 'QUIZ' || a.category === 'TASK' || a.test_type === 'VOCAB_TASK' || a.test_type === 'PHRASE_TASK' || (a.test_subtype && a.test_subtype.includes('QUIZ')) || (a.test_subtype && a.test_subtype.includes('TASK')) || /\b(QUIZ|TASK)\b/i.test(a.title || ''));
        const testTests = classTests.filter(a => a.test_type === 'exam' || a.category === 'EXAM' || a.category === 'TEST' || a.test_type === 'VOCAB_TEST' || a.test_type === 'PHRASE_TEST' || (a.test_subtype && a.test_subtype.includes('EXAM')) || (a.test_subtype && a.test_subtype.includes('TEST')) || /\b(EXAM|TEST)\b/i.test(a.title || ''));

        const totalMeetingsCount = (currentClass && isVocabularyClass(currentClass)) ? 24 : 20;

        let classHubTabs = [];
        if (!isCbtClass) {
          classHubTabs = [
            { id: 'attendance', icon: getSvgIcon('clipboard', 14), val: activeBatchStudents.length, label: 'Student Grade' },
            { id: 'class-attendance', icon: getSvgIcon('clock', 14), val: `${totalMeetingsCount} Meetings`, label: 'Student Attendance' },
            { id: 'test-sessions', icon: getSvgIcon('calendar', 14), val: totalMeetingsCount, label: 'Class Sessions' }
          ];
          if (window._classHubActiveTab === 'tests' || window._classHubActiveTab === 'analytics') {
            window._classHubActiveTab = 'attendance';
          }
        } else {
          classHubTabs = [
            { id: 'attendance', icon: getSvgIcon('user', 14), val: activeBatchStudents.length, label: 'Students Grade and Rate' },
            { id: 'class-attendance', icon: getSvgIcon('clock', 14), val: `${totalMeetingsCount} Meetings`, label: 'Class Attendance' },
            { id: 'test-sessions', icon: getSvgIcon('clock', 14), val: 2, label: 'Class Sessions' },
            { id: 'tests', icon: getSvgIcon('clipboard', 14), val: classTests.length, label: 'Class Tests' },
            { id: 'analytics', icon: getSvgIcon('trending-up', 14), val: 'Insights', label: 'Test Analytics' }
          ];

          if (isTutorRole()) {
            classHubTabs = classHubTabs.filter(t => t.id === 'test-sessions' || t.id === 'attendance' || t.id === 'class-attendance');
            if (window._classHubActiveTab === 'tests' || window._classHubActiveTab === 'analytics') {
              window._classHubActiveTab = 'test-sessions';
            }
          }
        }

        if (window.setTopbarTabs) {
          window.setTopbarTabs(classHubTabs, window._classHubActiveTab, 'window._switchClassHubTab');
        }

        let html = `
          <div style="display:flex; flex-direction:column; flex:1 1 0; min-height:0; height:100%; overflow:hidden;">
            <div id="class-hub-tab-content" style="display:flex; flex-direction:column; flex:1 1 0; min-height:0; height:100%; overflow:hidden;">
              ${window._classHubActiveTab === 'class-attendance' ? `
                <div id="class-meetings-attendance-container" style="display:flex; flex-direction:column; flex:1 1 0; min-height:0; overflow:hidden;"></div>
              ` : (window._classHubActiveTab === 'test-sessions' ? `
                <div id="class-test-sessions-container" style="display:flex; flex-direction:column; flex:1 1 0; min-height:0; overflow:hidden;"></div>
              ` : (window._classHubActiveTab === 'analytics' ? `
                <div id="class-analytics-container" style="display:flex; flex-direction:column; flex:1 1 0; min-height:0; overflow:hidden;"></div>
              ` : (window._classHubActiveTab === 'tests' ? `
                <div id="class-tests-container" style="display:flex; flex-direction:column; flex:1 1 0; min-height:0; overflow:hidden;">
                  <div id="class-tests-grid" style="flex:1 1 0; min-height:0; display:flex; flex-direction:column; overflow:hidden;"></div>
                </div>
              ` : `
                <div id="class-attendance-container" style="display:flex; flex-direction:column; flex:1 1 0; min-height:0; overflow:hidden;">
                  <div id="class-attendance-grid" style="flex:1 1 0; min-height:0; display:flex; flex-direction:column; overflow:hidden;"></div>
                </div>
              `)))}
            </div>
          </div>
        `;
        area.innerHTML = html;

        // Authoritative Lower Panel Sync for Class Hub (Phase 419 Universal 5-Panel Architecture)
        const themeNames = {};
        const topicNames = {};
        const themeGroups = {};
        classTests.forEach(asm => {
          const rawTheme = asm.payload?.theme_code || (asm.shell_code ? asm.shell_code.replace(/^[0-9]+/, '').charAt(0) : 'A');
          const tc = (rawTheme || 'A').toUpperCase();
          if (!themeGroups[tc]) themeGroups[tc] = [];
          themeGroups[tc].push(asm);

          const parts = (asm.title || '').split(' - ');
          const nameAfterDash = parts.length > 1 ? parts.slice(1).join(' - ').trim() : '';
          const isExam = asm.test_type === 'exam' || /EXAM/i.test(asm.shell_code || asm.title || '');

          if (asm.payload?.theme_name) {
            themeNames[tc] = asm.payload.theme_name.trim();
          } else if (isExam && nameAfterDash) {
            themeNames[tc] = nameAfterDash;
          }

          const rawTopCode = asm.payload?.topic_code || (asm.shell_code ? asm.shell_code.split('-')[2] : '');
          const topCode = String(rawTopCode || '').toUpperCase();
          if (topCode) {
            if (asm.payload?.topic_name) {
              topicNames[topCode] = asm.payload.topic_name.trim();
            } else if (!isExam && nameAfterDash) {
              topicNames[topCode] = nameAfterDash;
            }
          }
        });

        // Vault fallbacks if any theme or topic name is missing
        (allVault || []).forEach(v => {
          const tc = String(v.theme_code || '').toUpperCase();
          if (tc && v.theme && !themeNames[tc]) themeNames[tc] = v.theme.trim();
          const topCode = String(v.topic_code || '').toUpperCase();
          if (topCode && v.topic && !topicNames[topCode]) topicNames[topCode] = v.topic.trim();
        });

        const sortedThemes = Object.keys(themeGroups).sort();
        if (sortedThemes.length === 0) sortedThemes.push('A', 'B', 'C', 'D');

        const themeBtnColors = {
          'A': { border: 'var(--quad-a, #ff2d87)', bg: 'var(--quad-a, #ff2d87)', text: '#ffffff', glow: 'rgba(255,45,135,0.45)' },
          'B': { border: 'var(--grade-d, #FF8C00)', bg: 'var(--grade-d, #FF8C00)', text: '#0f172a', glow: 'rgba(255,140,0,0.45)' },
          'C': { border: 'var(--grade-b, #95ff00)', bg: 'var(--grade-b, #95ff00)', text: '#0f172a', glow: 'rgba(149,255,0,0.45)' },
          'D': { border: 'var(--quad-d, #a855f7)', bg: 'var(--quad-d, #a855f7)', text: '#0f172a', glow: 'rgba(192,132,252,0.45)' }
        };

        // Render Top Panel for Theme Navigation (Deprecated: moved 100% to Sub Panel per strict 2-panel SSOT)
        const renderAttendanceTopPanel = () => {};

        const syncClassHubLowerPanel = (activeTab) => {
          if (activeTab === 'attendance') {
            const isManualOn = Boolean(window._classManualScoreEditMode);
            const isRemedialOn = Boolean(window._classRemedialEditMode);
            const isForgivenOn = Boolean(window._classForgivenEditMode);

            const currentTheme = window._classAttendanceThemeFilter || 'ALL';
            const currentTopic = window._classAttendanceTopicFilter || 'ALL';
            const isThemeOverview = currentTheme === 'ALL' || currentTheme === 'OVERVIEW';

            // Authoritative Sub Panel In-Panel Equal-Width Navigation Buttons (30px Height, 95px Equal-Width)
            const navBtnBase = 'height: 30px !important; min-height: 30px !important; max-height: 30px !important; line-height: 28px !important; box-sizing: border-box !important; padding: 0 6px !important; font-size: 12px !important; font-weight: 700 !important; font-family: var(--fm-font-sans, Inter, sans-serif) !important; border-radius: 4px !important; cursor: pointer !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; text-transform: uppercase !important; letter-spacing: 0.03em !important; white-space: nowrap !important; transition: all 0.15s ease !important; width: 95px !important; min-width: 95px !important; max-width: 95px !important;';

            let navButtonsHtml = '';
            if (isThemeOverview) {
              // Master Overview: 5 Equal-Width Buttons (OVERVIEW + THEME A..D) docked at the FAR LEFT
              const ovBtnStyle = `${navBtnBase} background: #38bdf8 !important; border: 1px solid #38bdf8 !important; color: #090d16 !important; box-shadow: 0 0 10px rgba(56,189,248,0.45) !important;`;
              const ovBtnHtml = `<button type="button" class="btn btn-sm btn-subpanel-nav btn-subpanel-theme active" onclick="window.switchClassAttendanceTheme('ALL')" style="${ovBtnStyle}" title="Master Overview (All Themes Matrix)">OVERVIEW</button>`;

              const themeBtnsHtml = sortedThemes.map(tc => {
                const colCfg = themeBtnColors[tc] || { border: '#38bdf8', bg: '#38bdf8', text: '#090d16', glow: 'rgba(56,189,248,0.45)' };
                const tName = themeNames[tc] ? `${tc} - ${themeNames[tc]}` : `THEME ${tc}`;
                const btnStyle = `${navBtnBase} background: transparent !important; border: 1px solid ${colCfg.border} !important; color: ${colCfg.border} !important;`;
                return `<button type="button" class="btn btn-sm btn-subpanel-nav btn-subpanel-theme" onclick="window.switchClassAttendanceTheme('${tc}')" style="${btnStyle}" title="${tName} (Inspect Topics &amp; Detail)">THEME ${tc}</button>`;
              }).join('');

              navButtonsHtml = `
                <div class="attendance-topic-subpanel-group" style="display:inline-flex; align-items:center; gap:8px;">
                  ${ovBtnHtml}
                  ${themeBtnsHtml}
                </div>
              `;
            } else {
              // Dedicated Theme Selected: Render Equal-Width Buttons (← ALL + OVERVIEW + TOPIC A1..An) docked at the FAR LEFT
              const asmsInTheme = themeGroups[currentTheme] || [];
              const taskAsmsInTheme = asmsInTheme.filter(a => !isWeeklyExam(a));
              const rawTCodes = taskAsmsInTheme.map(a => String(a.payload?.topic_code || a.shell_code?.split('-')[2] || ''));
              let tCodes = Array.from(new Set(rawTCodes.filter(Boolean)));
              if (tCodes.length === 0) {
                tCodes = taskAsmsInTheme.map((a, idx) => `${currentTheme}${idx + 1}`);
              }
              tCodes.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

              const colCfg = themeBtnColors[currentTheme] || { border: '#38bdf8', bg: '#38bdf8', text: '#090d16', glow: 'rgba(56,189,248,0.45)' };
              const isTopicAllActive = currentTopic === 'ALL' || currentTopic === 'OVERVIEW';

              // 1. Back to Master Overview (← ALL)
              const backBtnStyle = `${navBtnBase} background: transparent !important; border: 1px solid #38bdf8 !important; color: #38bdf8 !important;`;
              const backBtnHtml = `<button type="button" class="btn btn-sm btn-subpanel-nav" onclick="window.switchClassAttendanceTheme('ALL')" style="${backBtnStyle}" title="Return to Master Overview (All Themes)">← ALL</button>`;

              // 2. Theme Topics Overview
              const themeOvStyle = isTopicAllActive
                ? `${navBtnBase} background: ${colCfg.bg} !important; border: 1px solid ${colCfg.border} !important; color: ${colCfg.text} !important; box-shadow: 0 0 10px ${colCfg.glow} !important;`
                : `${navBtnBase} background: transparent !important; border: 1px solid ${colCfg.border} !important; color: ${colCfg.border} !important;`;
              const themeOvBtnHtml = `<button type="button" class="btn btn-sm btn-subpanel-nav btn-subpanel-topic ${isTopicAllActive ? 'active' : ''}" onclick="window.switchClassAttendanceTopic('ALL')" style="${themeOvStyle}" title="Theme ${currentTheme} Topics Overview">OVERVIEW</button>`;

              // 3. Individual Topic Buttons (e.g. A1, A2, A3, A4)
              const topicBtnsHtml = tCodes.map(topCode => {
                const isTopActive = !isTopicAllActive && currentTopic.toUpperCase() === topCode.toUpperCase();
                const topName = topicNames[topCode.toUpperCase()] || topicNames[topCode] || '';
                const displayCode = topCode.toUpperCase().startsWith(currentTheme) ? topCode.toUpperCase() : `${currentTheme}${topCode.toUpperCase()}`;
                const label = `TOPIC ${displayCode}`;

                const topBtnStyle = isTopActive
                  ? `${navBtnBase} background: ${colCfg.bg} !important; border: 1px solid ${colCfg.border} !important; color: ${colCfg.text} !important; box-shadow: 0 0 10px ${colCfg.glow} !important;`
                  : `${navBtnBase} background: transparent !important; border: 1px solid ${colCfg.border} !important; color: ${colCfg.border} !important;`;

                return `<button type="button" class="btn btn-sm btn-subpanel-nav btn-subpanel-topic ${isTopActive ? 'active' : ''}" onclick="window.switchClassAttendanceTopic('${topCode}')" style="${topBtnStyle}" title="${label}: ${topName} (Inspect 7x7 Words &amp; Phrases)">${label}</button>`;
              }).join('');

              navButtonsHtml = `
                <div class="attendance-topic-subpanel-group" style="display:inline-flex; align-items:center; gap:8px;">
                  ${backBtnHtml}
                  ${themeOvBtnHtml}
                  ${topicBtnsHtml}
                </div>
              `;
            }

            const leftHtml = `
              <div class="attendance-nav-left-cluster" style="display:inline-flex; align-items:center; gap:10px;">
                ${navButtonsHtml}
                <div class="attendance-summary-cluster" style="display:inline-flex; align-items:center; gap:8px; margin-left:4px; font-size:12px; color:#94a3b8; font-weight:600; white-space:nowrap;">
                  <span style="color:rgba(255,255,255,0.18);">|</span>
                  <span id="class-roster-count-badge">${activeBatchStudents.length} Enrolled</span>
                </div>
              </div>
            `;

            // 1. Manual / Edit Mode Button (Cyan #38bdf8 / var(--primary-tactical, #38bdf8))
            const manualBtnStyle = isManualOn
              ? 'height: 30px !important; min-height: 30px !important; max-height: 30px !important; line-height: 28px !important; padding: 0 12px !important; font-size: 12px !important; font-weight: 700; border-radius: 4px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px; background: #38bdf8; border: 1px solid #38bdf8; color: #090d16; box-shadow: 0 0 10px rgba(56,189,248,0.45); transition: all 0.15s ease;'
              : 'height: 30px !important; min-height: 30px !important; max-height: 30px !important; line-height: 28px !important; padding: 0 12px !important; font-size: 12px !important; font-weight: 700; border-radius: 4px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px; background: transparent; border: 1px solid #38bdf8; color: #38bdf8; transition: all 0.15s ease;';
            const manualBtnLabel = isManualOn
              ? `${getSvgIcon('check-circle', 14)} Done Editing`
              : `${getSvgIcon('edit', 14)} Edit Mode`;
            const manualBtnHtml = `<button type="button" class="btn btn-sm" id="btn-subpanel-manual" style="${manualBtnStyle}" title="Toggle Inline Edit Mode (Excel Gridlines)">${manualBtnLabel}</button>`;

            // 2. Remedial Button (Pure Yellow #FFFF00 / Grade R)
            const remedialBtnStyle = isRemedialOn
              ? 'width: 155px; min-width: 155px; max-width: 155px; height: 30px; min-height: 30px; max-height: 30px; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; gap: 6px; font-size: 12px; font-weight: 700; white-space: nowrap; background: var(--grade-c); border: 1px solid var(--grade-c); color: #0f172a; padding: 0 10px; cursor: pointer; border-radius: 4px; box-shadow: 0 0 10px rgba(255,255,0,0.45); transition: all 0.15s ease;'
              : 'width: 155px; min-width: 155px; max-width: 155px; height: 30px; min-height: 30px; max-height: 30px; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; gap: 6px; font-size: 12px; font-weight: 700; white-space: nowrap; background: transparent; border: 1px solid var(--grade-c); color: var(--grade-c); padding: 0 10px; cursor: pointer; border-radius: 4px; transition: all 0.15s ease;';
            const remedialBtnLabel = isRemedialOn
              ? `${getSvgIcon('check-circle', 14)} Done Remedi (R)`
              : `${getSvgIcon('refresh', 14)} Remedi (R)`;
            const remedialBtnHtml = `<button type="button" class="btn btn-sm" id="btn-subpanel-remedial" style="${remedialBtnStyle}" title="Toggle Remedial Table Mode (Grade R - Yellow, Cap 60%)">${remedialBtnLabel}</button>`;

            // 3. Forgiven Button (Pure Red #FF0000 / Grade F)
            const forgivenBtnStyle = isForgivenOn
              ? 'width: 155px; min-width: 155px; max-width: 155px; height: 30px; min-height: 30px; max-height: 30px; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; gap: 6px; font-size: 12px; font-weight: 700; white-space: nowrap; background: var(--grade-e); border: 1px solid var(--grade-e); color: #ffffff; padding: 0 10px; cursor: pointer; border-radius: 4px; box-shadow: 0 0 10px rgba(255,0,0,0.45); transition: all 0.15s ease;'
              : 'width: 155px; min-width: 155px; max-width: 155px; height: 30px; min-height: 30px; max-height: 30px; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; gap: 6px; font-size: 12px; font-weight: 700; white-space: nowrap; background: transparent; border: 1px solid var(--grade-e); color: var(--grade-e); padding: 0 10px; cursor: pointer; border-radius: 4px; transition: all 0.15s ease;';
            const forgivenBtnLabel = isForgivenOn
              ? `${getSvgIcon('check-circle', 14)} Done Forgive (F)`
              : `${getSvgIcon('shield', 14)} Forgive (F)`;
            const forgivenBtnHtml = `<button type="button" class="btn btn-sm" id="btn-subpanel-forgiven" style="${forgivenBtnStyle}" title="Toggle Forgiven Waiver Mode (Grade F - Red)">${forgivenBtnLabel}</button>`;

            const rightHtml = `
              <div class="attendance-actions-cluster" style="display:inline-flex; align-items:center; gap:8px;">
                ${manualBtnHtml}
                ${remedialBtnHtml}
                ${forgivenBtnHtml}
              </div>
            `;
            setBottomInfobar(leftHtml, rightHtml, '');
          } else if (activeTab === 'tests') {
            const isEditOn = document.body.classList.contains('global-edit-mode-on') || (typeof window.isGlobalEditModeActive === 'function' && window.isGlobalEditModeActive());
            const editBtnStyle = isEditOn
              ? 'width: 140px; min-width: 140px; max-width: 140px; height: 30px; min-height: 30px; max-height: 30px; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; gap: 6px; font-size: 12px; font-weight: 700; white-space: nowrap; background: #38bdf8; border: 1px solid #38bdf8; color: #090d16; padding: 0 10px; cursor: pointer; border-radius: 4px; box-shadow: 0 0 10px rgba(56,189,248,0.45); transition: all 0.15s ease;'
              : 'width: 140px; min-width: 140px; max-width: 140px; height: 30px; min-height: 30px; max-height: 30px; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; gap: 6px; font-size: 12px; font-weight: 700; white-space: nowrap; background: transparent; border: 1px solid #38bdf8; color: #38bdf8; padding: 0 10px; cursor: pointer; border-radius: 4px; transition: all 0.15s ease;';
            const editBtnLabel = isEditOn
              ? `${getSvgIcon('check-circle', 14)} Done Editing`
              : `${getSvgIcon('edit', 14)} Edit Mode`;

            const leftHtml = `
              <div class="class-tests-summary-cluster" style="display:inline-flex; align-items:center; gap:12px; font-size:12px; color:#94a3b8; font-weight:600;">
                <span>Total Tests: <strong style="color:#f8fafc;">${classTests.length}</strong></span>
                ${isEditOn ? '<span class="badge" style="background:rgba(56,189,248,0.18); color:#38bdf8; border:1px solid rgba(56,189,248,0.4); font-size:11px; font-weight:700;">EDIT MODE ACTIVE</span>' : ''}
              </div>
            `;
            const rightHtml = isVocab ? `
              <div class="class-tests-actions-cluster" style="display:inline-flex; align-items:center; gap:8px;">
                <button type="button" class="btn btn-sm" id="btn-class-tests-toggle-edit" onclick="window.toggleClassTestsEditMode()" style="${editBtnStyle}" title="Toggle Master Edit Mode (Inline Table Editing &amp; Delete)">
                  ${editBtnLabel}
                </button>
                <button type="button" class="btn btn-secondary btn-sm" id="btn-sync-class-tests" style="height:30px !important; line-height:28px !important; padding:0 10px !important; font-size:12px !important; font-weight:700; border-radius:4px; cursor:pointer;" title="Sync tests for this class with Vocabulary Vault themes &amp; topics">
                  ${getSvgIcon('refresh', 14)} Sync Tests
                </button>
                <button type="button" class="btn btn-primary btn-sm" id="btn-open-generator-from-class" style="height:30px !important; line-height:28px !important; padding:0 12px !important; font-size:12px !important; font-weight:700; border-radius:4px; cursor:pointer; background:rgba(56,189,248,0.15); border:1.5px solid #38bdf8; color:#38bdf8;" title="Open Vocabulary System Master Matrix Studio">
                  ${getSvgIcon('settings', 14)} Vocabulary System
                </button>
              </div>
            ` : `
              <div class="class-tests-actions-cluster" style="display:inline-flex; align-items:center; gap:8px;">
                <button type="button" class="btn btn-sm" id="btn-class-tests-toggle-edit" onclick="window.toggleClassTestsEditMode()" style="${editBtnStyle}" title="Toggle Master Edit Mode (Inline Table Editing &amp; Delete)">
                  ${editBtnLabel}
                </button>
                <button type="button" class="btn btn-secondary btn-sm" onclick="window.renderClassHub(document.getElementById('admin-content-area'))" style="height:30px !important; line-height:28px !important; padding:0 10px !important; font-size:12px !important; font-weight:700; border-radius:4px; cursor:pointer;" title="Refresh Class Tests">
                  ${getSvgIcon('refresh', 14)} Refresh Tests
                </button>
              </div>
            `;
            setBottomInfobar(leftHtml, rightHtml);
          } else if (activeTab === 'test-sessions') {
            const leftHtml = `
              <div style="display:inline-flex; align-items:center; gap:8px; font-size:12px; color:#94a3b8; font-weight:600;">
                <span>Class Sessions (Attendance &amp; Progressive Exam)</span>
              </div>
            `;
            const rightHtml = `
              <div style="display:inline-flex; align-items:center; gap:8px;">
                <span class="badge" style="background:rgba(56,189,248,0.12); color:#38bdf8; border:1px solid rgba(56,189,248,0.25); font-size: 12px; font-weight:700;">● SESSIONS READY</span>
              </div>
            `;
            setBottomInfobar(leftHtml, rightHtml);
          } else if (activeTab === 'analytics') {
            const leftHtml = `
              <div style="display:inline-flex; align-items:center; gap:8px; font-size:12px; color:#94a3b8; font-weight:600;">
                <span>Class Vocabulary &amp; Error Analytics</span>
              </div>
            `;
            const rightHtml = `
              <div style="display:inline-flex; align-items:center; gap:8px;">
                <span class="badge" style="background:rgba(var(--grade-a-rgb),0.15); color:var(--grade-a); border:1px solid rgba(var(--grade-a-rgb),0.3); font-size: 12px; font-weight:700;">● ANALYTICS ACTIVE</span>
              </div>
            `;
            setBottomInfobar(leftHtml, rightHtml);
          }
        };

        window.syncClassHubLowerPanel = syncClassHubLowerPanel;
        window.renderAttendanceTopPanel = renderAttendanceTopPanel;

        window.toggleClassTestsEditMode = () => {
          if (typeof window.toggleGlobalEditMode === 'function') {
            const newState = window.toggleGlobalEditMode();
            showToast(newState ? 'Master Edit Mode ON (Inline Table Standards)' : 'Master Edit Mode OFF', newState ? 'info' : 'success');
            syncClassHubLowerPanel('tests');
            if (window._classAsmGridInstance) {
              window._classAsmGridInstance.render();
            }
          }
        };

        window.switchClassAttendanceTheme = (targetTheme) => {
          window._classAttendanceThemeFilter = targetTheme;
          window._classAttendanceTopicFilter = 'ALL';
          renderAttendanceTopPanel();
          syncClassHubLowerPanel('attendance');
          if (typeof window.renderAttendanceGridMatrix === 'function') {
            window.renderAttendanceGridMatrix(targetTheme);
          }
        };

        window.switchClassAttendanceTopic = (targetTopic) => {
          window._classAttendanceTopicFilter = targetTopic;
          syncClassHubLowerPanel('attendance');
          if (typeof window.renderAttendanceGridMatrix === 'function') {
            window.renderAttendanceGridMatrix(window._classAttendanceThemeFilter || 'ALL');
          }
        };

        syncClassHubLowerPanel(window._classHubActiveTab);

        let renderAttendanceGridMatrix = null;

        // Render content depending on tab
        if (!isCbtClass && window._classHubActiveTab === 'attendance') {
          const classAttContainer = document.getElementById('class-attendance-grid');
          if (classAttContainer) {
            window._currentClassStudents = activeBatchStudents;
            await renderAcademicGradebook({
              container: classAttContainer,
              currentClass,
              students: activeBatchStudents,
              batchMap,
              levelMap
            });
          }
          return;
        }

        if (window._classHubActiveTab === 'class-attendance') {
          const classAttContainer = document.getElementById('class-meetings-attendance-container');
          if (classAttContainer) {
            await renderClassMeetingsAttendance(classAttContainer, {
              classId,
              className,
              currentClass,
              batchId: window._selectedBatchId || null,
              activeBatchStudents,
              allBatches,
              allLevels,
              batchMap,
              levelMap,
              showPic: false
            });
          }
        } else if (window._classHubActiveTab === 'test-sessions') {
          const testSessionContainer = document.getElementById('class-test-sessions-container');
          if (testSessionContainer) {
            await renderClassTestSessions(testSessionContainer, {
              classId,
              className,
              currentClass,
              classTests,
              allStudents,
              classStudents,
              allBatches,
              allLevels,
              allAttempts,
              batchMap,
              levelMap
            });
          }
        } else if (window._classHubActiveTab === 'analytics') {
          const analyticsContainer = document.getElementById('class-analytics-container');
          if (analyticsContainer) {
            await renderClassVocabularyAnalytics(analyticsContainer, {
              classId,
              className,
              currentClass,
              classTests,
              allStudents: classStudents,
              allBatches,
              batchMap
            });
          }
        } else if (window._classHubActiveTab === 'tests') {
          const classAsmGrid = new window.DataGrid({
            container: document.getElementById('class-tests-grid'),
            tableId: 'class-tests-table',
            tableLayout: 'fixed',
            data: testsGridData,
            pageSize: 50,
            hideToolbar: true,
            autoFitOnMount: false,
            searchKeys: ['title', 'shellCode', 'status', 'TestCategory'],
            bulkActions: false,  // Rule 13: Checkbox columns purged
            customBulkActions: [
              {
                label: `${getSvgIcon('zap', 14)} Bulk Edit`,
                className: 'btn-primary',
                onClick: (selectedIds) => {
                  window.openBulkEditTestsModal(selectedIds, () => {
                    window.renderClassHub(document.getElementById('admin-content-area'));
                  });
                }
              }
            ],
            sortComparator: (sortKey, direction, a, b) => {
              if (sortKey === 'title' || sortKey === 'TITLE' || sortKey === 'order') {
                return direction === 'asc'
                  ? (a.order ?? 0) - (b.order ?? 0)
                  : (b.order ?? 0) - (a.order ?? 0);
              }
            },
            initialSortKey: 'order',
            initialSortAsc: true,
            columns: [
              {
                key: 'level',
                label: 'LEVEL',
                sortable: true,
                width: '60px',
                align: 'center',
                render: (val, row) => `<span style="font-size:12px; color:var(--clr-text-2); font-weight:500; white-space:nowrap;">${escapeHtml(row.level || '—')}</span>`
              },
              {
                key: 'order',
                label: 'CODE',
                sortable: true,
                width: '205px',
                align: 'center',
                render: (val, row) => {
                  if (row.shellCode) {
                    return `<span style="font-size:12px; color:var(--clr-text-2, #cbd5e1); font-family:var(--font-mono, monospace); font-weight:500; white-space:nowrap;" title="${escapeHtml(row.shellCode)}">${escapeHtml(row.shellCode)}</span>`;
                  }
                  return `<span style="font-size:12px; color:var(--clr-text-3, #94a3b8); font-weight:500; white-space:nowrap;">${row.order || '—'}</span>`;
                }
              },
              {
                // Flex Primary Column — absorbs all remaining viewport space (§TABLE-FLEX-PRIMARY)
                key: 'title',
                label: 'TITLE',
                sortable: true,
                minWidth: '240px',
                render: (val, row) => {
                  const isEditOn = document.body.classList.contains('global-edit-mode-on') || (typeof window.isGlobalEditModeActive === 'function' && window.isGlobalEditModeActive());
                  if (isEditOn) {
                    return `<input type="text" class="form-control form-control-sm input-test-title" data-test-id="${row.id}" data-original-val="${escapeHtml(row.title || '')}" value="${escapeHtml(row.title || '')}" style="height:24px !important; font-size:12px; font-weight:600; width:100%; min-width:240px; background:#090d16; border:1px solid rgba(56,189,248,0.4); border-radius:4px; color:#f8fafc; padding:0 6px; box-sizing:border-box;" />`;
                  }
                  return `<div class="fw-600" style="color:var(--clr-text-1); font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:240px;" title="${escapeHtml(row.title)}">${escapeHtml(row.title)}</div>`;
                }
              },
              {
                key: 'prereq',
                label: 'PREREQUISITE',
                sortable: true,
                width: '205px',
                align: 'center',
                render: (val, row) => {
                  const prereqDisplay = row.prereq || '';
                  if (!prereqDisplay) return '<span class="text-muted" style="font-size:12px; font-weight:500;">—</span>';
                  return `<span style="font-size:12px; color:var(--clr-text-2, #cbd5e1); font-family:var(--font-mono, monospace); font-weight:500; white-space:nowrap;" title="${escapeHtml(prereqDisplay)}">${escapeHtml(prereqDisplay)}</span>`;
                }
              },
              {
                key: 'TestCategory',
                label: 'TYPE',
                sortable: true,
                width: '75px',
                align: 'center',
                render: (val, row) => {
                  const rawType = String(row.TestCategory || row._raw?.test_type || 'Task').toLowerCase();
                  const isExam = rawType.includes('exam');
                  const label = isExam ? 'Exam' : 'Task';
                  const color = isExam ? 'var(--exam-color, #ff2d87)' : 'var(--task-color, #95ff00)';
                  return `<span style="font-size:12px; color:${color}; font-weight:600; white-space:nowrap;">${label}</span>`;
                }
              },
              {
                key: 'repetitions',
                label: 'REPETITIONS',
                shortLabel: 'REPS',
                microLabel: 'REP',
                sortable: true,
                width: '85px',
                align: 'center',
                render: (val, row) => {
                  const isExam = String(row.TestCategory || '').toLowerCase().includes('exam');
                  if (isExam) {
                    return `<span style="font-size:12px; font-weight:700; color:var(--clr-text-3, #94a3b8); font-variant-numeric:tabular-nums;" title="Milestone Exam (1x Final)">1x</span>`;
                  }
                  const rCount = row.repetitions || 7;
                  return `<span style="font-size:12px; font-weight:700; color:var(--clr-text-1, #f8fafc); font-variant-numeric:tabular-nums;" title="${rCount}x Repetitions Target">${rCount}x</span>`;
                }
              },
              {
                key: 'answerType',
                label: 'ANSWER',
                sortable: true,
                width: '90px',
                align: 'center',
                render: (val, row) => {
                  const ans = String(row.answerType || 'Selection');
                  const cleanAns = ans.replace(/[^\w\s]/gi, '').trim();
                  const titleCaseAns = cleanAns.charAt(0).toUpperCase() + cleanAns.slice(1);
                  return `<span class="fw-500" style="font-size:12px; color:var(--clr-text-1); white-space:nowrap;">${escapeHtml(titleCaseAns)}</span>`;
                }
              },
              {
                key: 'questionOrder',
                label: 'ORDER',
                sortable: true,
                width: '85px',
                align: 'center',
                render: (val, row) => {
                  const isEditOn = document.body.classList.contains('global-edit-mode-on') || (typeof window.isGlobalEditModeActive === 'function' && window.isGlobalEditModeActive());
                  const isRand = String(row.questionOrder || '').toLowerCase().includes('rand');
                  if (isEditOn) {
                    return `<select class="form-control form-control-sm select-test-order" data-test-id="${row.id}" style="height:24px !important; font-size:12px; font-weight:600; width:100%; background:#090d16; border:1px solid rgba(56,189,248,0.4); border-radius:4px; color:${isRand ? '#38bdf8' : '#94a3b8'}; padding:0 4px; box-sizing:border-box;">
                      <option value="random" ${isRand ? 'selected' : ''}>Random</option>
                      <option value="sequential" ${!isRand ? 'selected' : ''}>Sequential</option>
                    </select>`;
                  }
                  const accessLabel = isRand ? 'Random' : 'Sequential';
                  return `<span style="font-size:12px; color:var(--clr-text-2); white-space:nowrap; font-weight:500;">${accessLabel}</span>`;
                }
              },
              {
                key: 'timeLimit',
                label: 'DURATION',
                sortable: true,
                width: '85px',
                align: 'center',
                render: (val, row) => `<span style="font-size:12px; color:var(--clr-text-2); white-space:nowrap; font-weight:500; font-variant-numeric:tabular-nums;">${row.timeLimit || 60} min</span>`
              },
              {
                key: 'minScore',
                label: 'PASS RATE',
                sortable: true,
                width: '85px',
                align: 'center',
                render: (val, row) => {
                  const currentMin = row.minScore || 60;
                  const passColor = typeof getGradeColorByScore === 'function' ? getGradeColorByScore(currentMin) : 'var(--grade-c)';
                  const isEditOn = document.body.classList.contains('global-edit-mode-on') || (typeof window.isGlobalEditModeActive === 'function' && window.isGlobalEditModeActive());
                  if (isEditOn) {
                    return `<div style="display:inline-flex; align-items:center; gap:3px;">
                      <input type="number" min="1" max="100" class="form-control form-control-sm input-test-pass-score" data-test-id="${row.id}" data-original-val="${currentMin}" value="${currentMin}" style="width:52px; height:24px !important; text-align:center; font-weight:700; color:${passColor}; background:#090d16; border:1px solid rgba(56,189,248,0.4); border-radius:4px; font-size:12px; padding:0 4px;" />
                      <span style="font-size:12px; color:#94a3b8; font-weight:700;">%</span>
                    </div>`;
                  }
                  return `<span style="font-size:12px; font-weight:600; font-variant-numeric:tabular-nums; color:${passColor};">${currentMin}%</span>`;
                }
              },
              {
                key: 'qCount',
                label: 'QUESTIONS',
                sortable: true,
                width: '105px',
                align: 'center',
                render: (val, row) => {
                  const count = row.qCount || 0;
                  const isVault = !!row.qIsVault;
                  const label = isVault ? `${count} (Vault)` : `${count}`;
                  return `<span class="fw-500" style="color:var(--clr-text-2); font-size:12px; white-space:nowrap; font-variant-numeric:tabular-nums;" title="${isVault ? 'Live question count projected from Vocabulary Vault' : 'Question bank total'}">${label}</span>`;
                }
              },
              {
                key: 'wordsCount',
                label: 'WORDS',
                shortLabel: 'WORD',
                sortable: true,
                width: '75px',
                align: 'center',
                render: (val, row) => {
                  if (row.isVocab === false) return `<span class="text-muted" style="font-size:12px;">—</span>`;
                  const count = row.wordsCount || 0;
                  if (count <= 0) return `<span style="font-size:12px; color:var(--clr-text-3, #64748b);">—</span>`;
                  return `<span style="font-size:12px; font-weight:700; color:var(--clr-text-1, #f8fafc); font-variant-numeric:tabular-nums;" title="${count} Words in test">${count}</span>`;
                }
              },
              {
                key: 'phrasesCount',
                label: 'PHRASES',
                shortLabel: 'PHR',
                sortable: true,
                width: '75px',
                align: 'center',
                render: (val, row) => {
                  if (row.isVocab === false) return `<span class="text-muted" style="font-size:12px;">—</span>`;
                  const count = row.phrasesCount || 0;
                  if (count <= 0) return `<span style="font-size:12px; color:var(--clr-text-3, #64748b);">—</span>`;
                  return `<span style="font-size:12px; font-weight:700; color:var(--clr-text-1, #f8fafc); font-variant-numeric:tabular-nums;" title="${count} Phrases in test">${count}</span>`;
                }
              },
              {
                key: 'status',
                label: 'STATUS',
                shortLabel: 'STS',
                microLabel: 'STS',
                sortable: true,
                width: '100px',
                align: 'center',
                render: (val, row) => {
                  const st = String(row.status || 'draft').toLowerCase();
                  const isPub = st === 'published';
                  const isEditOn = document.body.classList.contains('global-edit-mode-on') || (typeof window.isGlobalEditModeActive === 'function' && window.isGlobalEditModeActive());
                  if (isEditOn) {
                    return `<select class="form-control form-control-sm input-test-status-select" data-test-id="${row.id}" data-test-title="${escapeHtml(row.title || 'Test')}" data-original-status="${st}" style="height:24px !important; font-size:12px; font-weight:700; background:#090d16; border:1px solid rgba(56,189,248,0.4); border-radius:4px; color:${isPub ? 'var(--grade-a)' : '#94a3b8'}; padding:0 4px; width:100%; box-sizing:border-box;">
                      <option value="published" ${isPub ? 'selected' : ''} style="color:var(--grade-a); background:#0f172a;">Published</option>
                      <option value="draft" ${!isPub ? 'selected' : ''} style="color:#94a3b8; background:#0f172a;">Draft</option>
                      <option value="delete" style="color:var(--grade-e, #ff0000); background:#0f172a; font-weight:800;">🗑 Delete</option>
                    </select>`;
                  }
                  const displayStatus = st.charAt(0).toUpperCase() + st.slice(1);
                  return `<span style="font-size:12px; font-weight:500; color:${isPub ? 'var(--grade-a)' : '#94a3b8'};">${escapeHtml(displayStatus)}</span>`;
                }
              }
            ]
          });

          window._classAsmGridInstance = classAsmGrid;

          // Wire Edit Mode change listener to update Class Tests DataGrid
          if (!window._classTestsEditModeBound) {
            window._classTestsEditModeBound = true;
            window.addEventListener('admin-edit-mode-changed', () => {
              if (document.getElementById('class-tests-grid') && window._classAsmGridInstance) {
                window._classAsmGridInstance.render();
              }
              if (window._classHubActiveTab === 'tests' && typeof window.syncClassHubLowerPanel === 'function') {
                window.syncClassHubLowerPanel('tests');
              }
            });
          }


          // Sync Class Tests directly from Vocabulary Vault (Scoped strictly to this Class only)
          document.getElementById('btn-sync-class-tests')?.addEventListener('click', async () => {
            const btn = document.getElementById('btn-sync-class-tests');
            if (!btn) return;
            const targetClassId = classId || cid;
            if (!targetClassId) {
              if (window.showToast) window.showToast('Class ID not found.', 'error');
              return;
            }

            try {
              const oldHtml = btn.innerHTML;
              btn.innerHTML = `${getSvgIcon('clock', 14)} Syncing...`;
              btn.disabled = true;
              if (window.showLoading) window.showLoading(`Synchronizing tests for ${currentClass?.name || 'Class'}...`);

              const { syncAllCurriculumTests, clearAdminCache, clearApiCache } = await import('../api.js?v=20261124_v683');
              if (window._classHubCache) delete window._classHubCache[targetClassId];
              clearAdminCache();
              clearApiCache();
              const res = await syncAllCurriculumTests({ classId: targetClassId, force: true });
              clearAdminCache();
              clearApiCache();
              if (window._classHubCache) delete window._classHubCache[targetClassId];

              if (window.hideLoading) window.hideLoading();
              btn.innerHTML = oldHtml;
              btn.disabled = false;

              const msg = `Class Tests synced: ${res.createdCount} new test shells created, ${res.updatedCount} updated!`;
              if (window.showToast) window.showToast(msg, 'success');
              else alert(msg);

              if (window.renderClassHub) {
                window.renderClassHub(document.getElementById('admin-content-area'));
              }
            } catch (err) {
              if (window.hideLoading) window.hideLoading();
              btn.innerHTML = `${getSvgIcon('refresh', 14)} Sync Tests`;
              btn.disabled = false;
              console.error(err);
              if (window.showToast) window.showToast('Sync failed: ' + err.message, 'error');
              else alert('Sync failed: ' + err.message);
            }
          });


          // Open Generator & Curriculum Settings Wizard
          document.getElementById('btn-open-generator-from-class')?.addEventListener('click', async () => {
            try {
              const { openAutoGenerateModal } = await import('./auto-gen-modal.js?v=20261106_v140');
              await openAutoGenerateModal({
                explicitClassId: classId,
                onComplete: () => {
                  if (window._classHubCache) delete window._classHubCache[classId];
                  window.renderClassHub(document.getElementById('admin-content-area'));
                }
              });
            } catch (err) {
              console.error(err);
              showToast('Failed to open wizard: ' + err.message, 'error');
            }
          });

          // Inline Test Passing Score, Status Dropdown, and Rename listener on #class-tests-grid
          const classTestsGridEl = document.getElementById('class-tests-grid');
          if (classTestsGridEl) {
            classTestsGridEl.addEventListener('change', async (e) => {
              // 1. Pass score change
              const passInput = e.target.closest('.input-test-pass-score');
              if (passInput) {
                const testId = passInput.dataset.testId;
                const origVal = parseFloat(passInput.dataset.originalVal) || 60;
                const rawVal = parseFloat(passInput.value);
                if (isNaN(rawVal) || rawVal < 1 || rawVal > 100) {
                  showToast('Passing rate percentage must be between 1% and 100%', 'error');
                  passInput.value = origVal;
                  return;
                }
                const newVal = Math.round(rawVal);
                passInput.value = newVal;
                try {
                  passInput.disabled = true;
                  await updateTestPassingScore(testId, newVal);
                  passInput.dataset.originalVal = newVal;
                  showToast(`Passing rate successfully updated to ${newVal}%`, 'success');
                } catch (err) {
                  console.error(err);
                  showToast('Failed to update passing rate: ' + err.message, 'error');
                  passInput.value = origVal;
                } finally {
                  passInput.disabled = false;
                }
                return;
              }

              // 2. Status select change (published / draft / delete)
              const statusSelect = e.target.closest('.input-test-status-select');
              if (statusSelect) {
                const testId = statusSelect.dataset.testId;
                const testTitle = statusSelect.dataset.testTitle || 'Test';
                const origStatus = statusSelect.dataset.originalStatus || 'draft';
                const newVal = statusSelect.value;

                if (newVal === 'delete') {
                  const confirmDelete = window.confirm(`Are you sure you want to delete test "${testTitle}"?\nThis action will soft-delete the test.`);
                  if (confirmDelete) {
                    try {
                      statusSelect.disabled = true;
                      await window._deleteRecord('tests', testId, testTitle);
                      window.renderClassHub(document.getElementById('admin-content-area'));
                    } catch (err) {
                      console.error(err);
                      showToast('Failed to delete test: ' + err.message, 'error');
                      statusSelect.value = origStatus;
                      statusSelect.disabled = false;
                    }
                  } else {
                    statusSelect.value = origStatus;
                    statusSelect.style.color = origStatus === 'published' ? 'var(--grade-a)' : '#94a3b8';
                  }
                  return;
                }

                if (newVal === 'published' || newVal === 'draft') {
                  try {
                    statusSelect.disabled = true;
                    await adminUpdate('tests', testId, { status: newVal.toUpperCase() });
                    statusSelect.dataset.originalStatus = newVal;
                    statusSelect.style.color = newVal === 'published' ? 'var(--grade-a)' : '#94a3b8';
                    const targetRow = testsGridData.find(t => t.id === testId);
                    if (targetRow) targetRow.status = newVal;
                    if (window._classHubRecords && window._classHubRecords[testId]) {
                      window._classHubRecords[testId].status = newVal.toUpperCase();
                    }
                    showToast(`Test status updated to ${newVal.toUpperCase()}`, 'success');
                  } catch (err) {
                    console.error(err);
                    showToast('Failed to update test status: ' + err.message, 'error');
                    statusSelect.value = origStatus;
                  } finally {
                    statusSelect.disabled = false;
                  }
                }
                return;
              }

              // 3. Title rename change
              const titleInput = e.target.closest('.input-test-title');
              if (titleInput) {
                const testId = titleInput.dataset.testId;
                const origTitle = titleInput.dataset.originalVal || '';
                const newTitle = titleInput.value.trim();
                if (!newTitle) {
                  titleInput.value = origTitle;
                  return;
                }
                if (newTitle === origTitle) return;
                try {
                  titleInput.disabled = true;
                  await adminUpdate('tests', testId, { title: newTitle });
                  titleInput.dataset.originalVal = newTitle;
                  const targetRow = testsGridData.find(t => t.id === testId);
                  if (targetRow) targetRow.title = newTitle;
                  if (window._classHubRecords && window._classHubRecords[testId]) {
                    window._classHubRecords[testId].title = newTitle;
                  }
                  showToast(`Test renamed to "${newTitle}"`, 'success');
                } catch (err) {
                  console.error(err);
                  showToast('Failed to rename test: ' + err.message, 'error');
                  titleInput.value = origTitle;
                } finally {
                  titleInput.disabled = false;
                }
                return;
              }

              // 4. Order change (random / sequential)
              const orderSelect = e.target.closest('.select-test-order');
              if (orderSelect) {
                const testId = orderSelect.dataset.testId;
                const newVal = orderSelect.value;
                try {
                  orderSelect.disabled = true;
                  const testRecord = window._classHubRecords && window._classHubRecords[testId];
                  const updatedPayload = {
                    ...(testRecord?.payload || {}),
                    question_order: newVal
                  };
                  await adminUpdate('tests', testId, { question_order: newVal, payload: updatedPayload });
                  orderSelect.style.color = newVal === 'random' ? '#38bdf8' : '#94a3b8';
                  const targetRow = testsGridData.find(t => t.id === testId);
                  if (targetRow) targetRow.questionOrder = newVal;
                  if (testRecord) {
                    testRecord.question_order = newVal;
                    testRecord.payload = updatedPayload;
                  }
                  showToast(`Test question order set to ${newVal.toUpperCase()}`, 'success');
                } catch (err) {
                  console.error(err);
                  showToast('Failed to update question order: ' + err.message, 'error');
                } finally {
                  orderSelect.disabled = false;
                }
                return;
              }
            });

            classTestsGridEl.addEventListener('keydown', (e) => {
              if (e.key === 'Enter') {
                const passInput = e.target.closest('.input-test-pass-score');
                if (passInput) passInput.blur();
                const titleInput = e.target.closest('.input-test-title');
                if (titleInput) titleInput.blur();
              }
            });
          }
        } else {
          let attendanceGridInstance = null;
          const rosterBatchFilter = window._classRosterBatchFilter || 'active';
          const filterRosterData = (data, filterVal) => {
            if (filterVal === 'active') {
              return data.filter(s => {
                const b = batchMap[s._raw?.batch_id];
                return (b ? b.is_active !== false : true) && ((s._raw || s).is_active !== false);
              });
            } else if (filterVal === 'all') {
              return data.filter(s => ((s._raw || s).is_active !== false));
            } else {
              return data.filter(s => s._raw?.batch_id === filterVal && ((s._raw || s).is_active !== false));
            }
          };

          const initialRosterData = filterRosterData(studentsGridData, rosterBatchFilter);

          // Dynamically compute theme headers and colSpans from actual classTests
          const themeCounts = {};
          const themeAsmCounts = { 'A': 0, 'B': 0, 'C': 0, 'D': 0 };
          const themeNames = {};

          classTests.forEach(asm => {
            const isTest = isWeeklyExam(asm);
            const rawTheme = asm.payload?.theme_code || (asm.shell_code ? asm.shell_code.replace(/^[0-9]+/, '').charAt(0) : 'A');
            const themeCode = (rawTheme || 'A').toUpperCase();
            const colSpan = isTest ? 2 : 1;
            themeCounts[themeCode] = (themeCounts[themeCode] || 0) + colSpan;
            if (themeAsmCounts[themeCode] !== undefined) themeAsmCounts[themeCode]++;

            const parts = (asm.title || '').split(' - ');
            const nameAfterDash = parts.length > 1 ? parts.slice(1).join(' - ').trim() : '';
            if (asm.payload?.theme_name) {
              themeNames[themeCode] = asm.payload.theme_name.trim();
            } else if (isTest && nameAfterDash) {
              themeNames[themeCode] = nameAfterDash;
            }
          });

          (allVault || []).forEach(v => {
            const tc = String(v.theme_code || '').toUpperCase();
            if (tc && v.theme && !themeNames[tc]) themeNames[tc] = v.theme.trim();
          });

          // Update theme filter pills labels with accurate test counts
          const themeContainer = document.getElementById('attendance-theme-pills-container');
          if (themeContainer) {
            const btnAll = themeContainer.querySelector('[data-theme="ALL"]');
            if (btnAll) btnAll.innerHTML = `${getSvgIcon('globe', 12)} ALL (EXAMS ONLY)`;
            const btnA = themeContainer.querySelector('[data-theme="A"]');
            if (btnA) btnA.innerHTML = `<span class="status-dot" style="display:inline-block;width:7px;height:7px;border-radius:2px;background:var(--quad-a);margin-right:5px;"></span> THEME A (${themeAsmCounts['A'] || 8})`;
            const btnB = themeContainer.querySelector('[data-theme="B"]');
            if (btnB) btnB.innerHTML = `<span class="status-dot" style="display:inline-block;width:7px;height:7px;border-radius:2px;background:var(--quad-b);margin-right:5px;"></span> THEME B (${themeAsmCounts['B'] || 10})`;
            const btnC = themeContainer.querySelector('[data-theme="C"]');
            if (btnC) btnC.innerHTML = `<span class="status-dot" style="display:inline-block;width:7px;height:7px;border-radius:2px;background:var(--quad-c);margin-right:5px;"></span> THEME C (${themeAsmCounts['C'] || 12})`;
            const btnD = themeContainer.querySelector('[data-theme="D"]');
            if (btnD) btnD.innerHTML = `<span class="status-dot" style="display:inline-block;width:7px;height:7px;border-radius:2px;background:var(--quad-d);margin-right:5px;"></span> THEME D (${themeAsmCounts['D'] || 10})`;
          }

          // Manual Input Grade Controller State & Handlers
          if (!window._manualInputState) {
            window._manualInputState = {
              activeStudentIds: new Set(),
              drafts: {} // studentId -> { [testId]: { score, pts, totalQ, isDirty } }
            };
          }

          window.isStudentManualInputActive = (studentId) => {
            return Boolean(window._manualInputState?.activeStudentIds?.has(studentId));
          };

          window.onMatrixExamScoreChange = (studentId, testId, totalQ, valStr) => {
            if (!window._manualInputState.drafts[studentId]) {
              window._manualInputState.drafts[studentId] = {};
            }
            const input = document.querySelector(`.input-matrix-exam-score-${studentId}-${testId}`);
            const origScoreStr = input?.dataset?.originalScore ?? '';

            if (!valStr || valStr.trim() === '') {
              const isDirty = origScoreStr !== '';
              window._manualInputState.drafts[studentId][testId] = { score: null, pts: null, totalQ, isDirty };
              const ptsInput = document.querySelector(`.input-matrix-exam-pts-${studentId}-${testId}`);
              if (ptsInput) ptsInput.value = '';
              return;
            }
            const valNum = Number(valStr);
            const clampedPct = Math.max(0, Math.min(100, isNaN(valNum) ? 0 : valNum));
            // Rule 2.10: Points Half-Up Whole Integer Invariant (Math.round)
            const calcPts = Math.round(totalQ * (clampedPct / 100));
            const isDirty = origScoreStr === '' || Number(origScoreStr) !== clampedPct;

            window._manualInputState.drafts[studentId][testId] = {
              score: clampedPct,
              pts: calcPts,
              totalQ,
              isDirty
            };

            const ptsInput = document.querySelector(`.input-matrix-exam-pts-${studentId}-${testId}`);
            if (ptsInput) {
              ptsInput.value = calcPts.toString();
            }
          };

          window.onMatrixSectionExamChange = (studentId, testId, section, totalQ, valStr, isPts, otherTotalQ, themeCode) => {
            if (!window._manualInputState) {
              window._manualInputState = { activeStudentIds: new Set(), drafts: {} };
            }
            if (!window._manualInputState.drafts[studentId]) {
              window._manualInputState.drafts[studentId] = {};
            }
            const tcLower = String(themeCode || '').toLowerCase();
            const draftKey = `exam_${testId}_${section}`;
            const rateInput = document.querySelector(`.input-matrix-${section}-rate-${studentId}-${tcLower}`);
            const ptsInput = document.querySelector(`.input-matrix-${section}-pts-${studentId}-${tcLower}`);
            const origRateStr = rateInput?.dataset?.originalScore ?? '';
            const origPtsStr = ptsInput?.dataset?.originalPts ?? '';

            const updateSectionLiveFeedback = (sId, tcLow, curSec, curTotQ, othTotQ) => {
              const wordsPtsInput = document.querySelector(`.input-matrix-words-pts-${sId}-${tcLow}`);
              const phrasesPtsInput = document.querySelector(`.input-matrix-phrases-pts-${sId}-${tcLow}`);
              const wPtsVal = wordsPtsInput ? (wordsPtsInput.value !== '' ? Number(wordsPtsInput.value) : null) : null;
              const pPtsVal = phrasesPtsInput ? (phrasesPtsInput.value !== '' ? Number(phrasesPtsInput.value) : null) : null;

              const totalPtsSpan = document.querySelector(`.test-score-theme-total-${sId}-${tcLow}`);
              const gradeSpan = document.querySelector(`.grid-grade-val-${sId}-${tcLow}`);

              if (wPtsVal !== null || pPtsVal !== null) {
                const wordsDenom = curSec === 'words' ? curTotQ : othTotQ;
                const phrasesDenom = curSec === 'phrases' ? curTotQ : othTotQ;
                const totalExamQ = (wordsDenom || 160) + (phrasesDenom || 40);
                const sumPts = (wPtsVal || 0) + (pPtsVal || 0);
                const calcThemePct = totalExamQ > 0 ? Math.round((sumPts / totalExamQ) * 100) : 0;
                const newGrade = typeof calculateGrade === 'function' ? calculateGrade(calcThemePct) : 'C';
                const newGradeColor = typeof getGradeColorByScore === 'function' ? getGradeColorByScore(calcThemePct) : '#ffffff';

                if (totalPtsSpan) {
                  totalPtsSpan.textContent = sumPts.toString();
                  totalPtsSpan.style.color = newGradeColor;
                }
                if (gradeSpan) {
                  const cleanGrade = String(newGrade || '').trim().toUpperCase();
                  if (cleanGrade === '★' || cleanGrade === 'S') {
                    gradeSpan.className = `grid-grade-val grid-grade-val-${sId}-${tcLow} grid-grade-star`;
                    gradeSpan.textContent = '★';
                    gradeSpan.style.color = 'var(--grade-star)';
                  } else {
                    gradeSpan.className = `grid-grade-val grid-grade-val-${sId}-${tcLow}`;
                    gradeSpan.textContent = cleanGrade;
                    gradeSpan.style.color = newGradeColor;
                  }
                }
              }
            };

            if (!valStr || valStr.trim() === '') {
              const isDirty = (origRateStr !== '' || origPtsStr !== '');
              window._manualInputState.drafts[studentId][draftKey] = {
                testId,
                section,
                score: null,
                pts: null,
                totalQ,
                isDirty
              };
              if (isPts && rateInput) rateInput.value = '';
              if (!isPts && ptsInput) ptsInput.value = '';
              updateSectionLiveFeedback(studentId, tcLower, section, totalQ, otherTotalQ);
              return;
            }

            const valNum = Number(valStr);
            let calcScore, calcPts;
            if (isPts) {
              calcPts = Math.round(Math.max(0, Math.min(totalQ, isNaN(valNum) ? 0 : valNum)));
              calcScore = totalQ > 0 ? Math.round((calcPts / totalQ) * 100) : 0;
              if (rateInput) rateInput.value = calcScore.toString();
            } else {
              calcScore = Math.max(0, Math.min(100, isNaN(valNum) ? 0 : valNum));
              calcPts = Math.round(totalQ * (calcScore / 100));
              if (ptsInput) ptsInput.value = calcPts.toString();
            }

            const isDirty = origRateStr === '' || Number(origRateStr) !== calcScore || Math.abs(Number(origPtsStr) - calcPts) >= 0.5;

            window._manualInputState.drafts[studentId][draftKey] = {
              testId,
              section,
              score: calcScore,
              pts: calcPts,
              totalQ,
              isDirty
            };

            updateSectionLiveFeedback(studentId, tcLower, section, totalQ, otherTotalQ);
          };

          window.onMatrixExamPtsChange = (studentId, testId, totalQ, valStr) => {
            if (!window._manualInputState.drafts[studentId]) {
              window._manualInputState.drafts[studentId] = {};
            }
            const input = document.querySelector(`.input-matrix-exam-pts-${studentId}-${testId}`);
            const origPtsStr = input?.dataset?.originalPts ?? '';

            if (!valStr || valStr.trim() === '') {
              const isDirty = origPtsStr !== '';
              window._manualInputState.drafts[studentId][testId] = { score: null, pts: null, totalQ, isDirty };
              const scoreInput = document.querySelector(`.input-matrix-exam-score-${studentId}-${testId}`);
              if (scoreInput) scoreInput.value = '';
              return;
            }
            const valNum = Number(valStr);
            // Rule 2.10: Points Half-Up Whole Integer Invariant (Math.round)
            const clampedPts = Math.round(Math.max(0, Math.min(totalQ, isNaN(valNum) ? 0 : valNum)));
            const calcScore = totalQ > 0 ? Math.round((clampedPts / totalQ) * 100) : 0;
            const isDirty = origPtsStr === '' || Math.abs(Number(origPtsStr) - clampedPts) >= 0.5;

            window._manualInputState.drafts[studentId][testId] = {
              score: calcScore,
              pts: clampedPts,
              totalQ,
              isDirty
            };

            const scoreInput = document.querySelector(`.input-matrix-exam-score-${studentId}-${testId}`);
            if (scoreInput) {
              scoreInput.value = calcScore.toString();
            }
          };

          window.onMatrixTaskChange = (studentId, themeCode, maxTasks, valStr) => {
            if (!window._manualInputState.drafts[studentId]) {
              window._manualInputState.drafts[studentId] = {};
            }
            const taskKey = `task_${themeCode}`;
            const input = document.querySelector(`.input-matrix-task-progress-${studentId}-${themeCode.toLowerCase()}`);
            const origEarnedStr = input?.dataset?.originalEarned ?? '';

            if (!valStr || valStr.trim() === '') {
              const isDirty = origEarnedStr !== '';
              window._manualInputState.drafts[studentId][taskKey] = { earned: null, maxTasks, isDirty };
              return;
            }
            const valNum = parseInt(valStr, 10);
            const clampedEarned = Math.max(0, Math.min(maxTasks, isNaN(valNum) ? 0 : valNum));
            const isDirty = origEarnedStr === '' || Number(origEarnedStr) !== clampedEarned;
            window._manualInputState.drafts[studentId][taskKey] = {
              earned: clampedEarned,
              maxTasks,
              isDirty
            };
          };

          window.onMatrixTopicTaskChange = (studentId, themeCode, topicCode, targetReps, valStr, component = 'words') => {
            if (!window._manualInputState.drafts[studentId]) {
              window._manualInputState.drafts[studentId] = {};
            }
            const taskKey = `task_${themeCode}_${topicCode}_${component}`;
            const input = document.querySelector(`.input-matrix-topic-reps-${studentId}-${themeCode.toLowerCase()}-${topicCode.toLowerCase()}-${component}`) ||
                          document.querySelector(`.input-matrix-topic-reps-${studentId}-${themeCode.toLowerCase()}-${topicCode.toLowerCase()}`);
            const origRepsStr = input?.dataset?.originalReps ?? '';

            if (!valStr || valStr.trim() === '') {
              const isDirty = origRepsStr !== '' && origRepsStr !== '0';
              window._manualInputState.drafts[studentId][taskKey] = { reps: null, targetReps, themeCode, topicCode, component, isDirty };
              return;
            }
            const valNum = parseInt(valStr, 10);
            const clampedReps = Math.max(0, Math.min(targetReps, isNaN(valNum) ? 0 : valNum));
            const isDirty = origRepsStr === '' || Number(origRepsStr) !== clampedReps;
            window._manualInputState.drafts[studentId][taskKey] = {
              reps: clampedReps,
              targetReps,
              themeCode,
              topicCode,
              component,
              isDirty
            };
          };

          window.onMatrixRepRateChange = (studentId, themeCode, topicCode, component, repIdx, taskId, attemptId, totalQ, valStr) => {
            if (!window._manualInputState) {
              window._manualInputState = { activeStudentIds: new Set(), drafts: {} };
            }
            if (!window._manualInputState.drafts[studentId]) {
              window._manualInputState.drafts[studentId] = {};
            }
            const draftKey = `rep_${taskId}_${component}_${repIdx}`;
            const input = document.querySelector(`.input-matrix-rep-rate-${studentId}-${themeCode.toLowerCase()}-${topicCode.toLowerCase()}-${component}-${repIdx}`);
            const origPctStr = input?.dataset?.originalPct ?? '';

            if (!valStr || valStr.trim() === '') {
              const isDirty = origPctStr !== '';
              window._manualInputState.drafts[studentId][draftKey] = {
                type: 'repetition',
                taskId,
                themeCode,
                topicCode,
                component,
                repIdx,
                attemptId: attemptId || null,
                pct: null,
                totalQ,
                isDirty
              };
              return;
            }

            const valNum = Number(valStr);
            const clampedPct = Math.max(0, Math.min(100, isNaN(valNum) ? 0 : valNum));
            const isDirty = origPctStr === '' || Number(origPctStr) !== clampedPct;

            window._manualInputState.drafts[studentId][draftKey] = {
              type: 'repetition',
              taskId,
              themeCode,
              topicCode,
              component,
              repIdx,
              attemptId: attemptId || null,
              pct: clampedPct,
              totalQ,
              rawScore: Math.round(totalQ * (clampedPct / 100)),
              isDirty
            };
          };

          window.saveRowManualTaskInput = async (studentId, themeCode, maxTasks) => {
            if (isTutorRole()) {
              if (typeof showToast === 'function') showToast('Permission denied: Tutor accounts cannot manually modify student tasks.', 'warning');
              return;
            }
            const taskKey = `task_${themeCode}`;
            const studentDraft = window._manualInputState.drafts[studentId] || {};
            let draft = studentDraft[taskKey];

            if (!draft) {
              const inputEl = document.querySelector(`.input-matrix-task-progress-${studentId}-${themeCode.toLowerCase()}`);
              if (inputEl && inputEl.value !== '') {
                window.onMatrixTaskChange(studentId, themeCode, maxTasks, inputEl.value);
                draft = window._manualInputState.drafts[studentId]?.[taskKey];
              }
            }

            if (draft && draft.isDirty && draft.earned != null) {
              const earnedVal = Number(draft.earned);
              const taskAsms = window._themeTaskAsmsMap?.[themeCode] || [];
              if (taskAsms.length > 0) {
                if (typeof showLoading === 'function') showLoading(`Saving Theme ${themeCode} task progress (${earnedVal}/${maxTasks})...`);
                try {
                  const testActions = taskAsms.map(t => {
                    const isComplete = earnedVal >= maxTasks;
                    const pct = isComplete ? 100 : Math.round((earnedVal / maxTasks) * 100);
                    const maxQ = getAsmExpectedMax(t) || 40;
                    const score = isComplete ? maxQ : Math.round(maxQ * (pct / 100) * 10) / 10;
                    return {
                      testId: t.id,
                      action: isComplete ? 'forgive' : 'manual',
                      percentage: pct,
                      score
                    };
                  });

                  await adminApplyForgiven({
                    classId: window._selectedClassId || classId || cid,
                    studentIds: [studentId],
                    testActions,
                    forgivenBy: 'Mr. Top',
                    reason: `Manual Task Progress Input: ${earnedVal}/${maxTasks}`
                  });

                  if (typeof clearAdminCache === 'function') {
                  clearAdminCache('attempts');
                  clearAdminCache('tests');
                }
                if (window._classHubCache && targetClassId) {
                  delete window._classHubCache[targetClassId];
                }
                  if (typeof showToast === 'function') showToast(`✓ Theme ${themeCode} task progress (${earnedVal}/${maxTasks}) saved successfully!`, 'success');
                } catch (err) {
                  console.error('Save manual task progress error:', err);
                  if (typeof showToast === 'function') showToast('Failed to save task progress: ' + (err.message || err), 'error');
                  if (typeof hideLoading === 'function') hideLoading();
                  return;
                } finally {
                  if (typeof hideLoading === 'function') hideLoading();
                }
              }
              draft.isDirty = false;
            }

            window._manualInputState.activeStudentIds.delete(studentId);
            delete window._manualInputState.drafts[studentId]?.[taskKey];

            if (window.renderClassHub) {
              await window.renderClassHub(document.getElementById('admin-content-area'));
            }
          };

          window.saveRowManualTopicTaskInput = async (studentId, themeCode, topicCode, targetReps, component = 'words') => {
            if (isTutorRole()) {
              if (typeof showToast === 'function') showToast('Permission denied: Tutor accounts cannot manually modify student tasks.', 'warning');
              return;
            }
            const taskKey = `task_${themeCode}_${topicCode}_${component}`;
            const studentDraft = window._manualInputState.drafts[studentId] || {};
            let draft = studentDraft[taskKey] || studentDraft[`task_${themeCode}_${topicCode}`];

            if (!draft) {
              const inputEl = document.querySelector(`.input-matrix-topic-reps-${studentId}-${themeCode.toLowerCase()}-${topicCode.toLowerCase()}-${component}`) ||
                              document.querySelector(`.input-matrix-topic-reps-${studentId}-${themeCode.toLowerCase()}-${topicCode.toLowerCase()}`);
              if (inputEl && inputEl.value !== '') {
                window.onMatrixTopicTaskChange(studentId, themeCode, topicCode, targetReps, inputEl.value, component);
                draft = window._manualInputState.drafts[studentId]?.[taskKey];
              }
            }

            if (draft && draft.isDirty && draft.reps != null) {
              const reps = Number(draft.reps);
              const maxReps = Number(draft.targetReps || targetReps || 7);
              const taskAsmsInTheme = window._themeTaskAsmsMap?.[themeCode] || [];
              const targetTasks = taskAsmsInTheme.filter(a => String(a.payload?.topic_code || '') === topicCode);
              const tasksToUpdate = targetTasks.length > 0 ? targetTasks : taskAsmsInTheme;

              if (tasksToUpdate.length > 0) {
                const compLabel = component === 'phrases' ? 'Phrases' : 'Words';
                if (typeof showLoading === 'function') showLoading(`Saving Topic ${topicCode} ${compLabel} repetitions (${reps}/${maxReps})...`);
                try {
                  const compUpper = (component || 'words').toUpperCase();
                  const mReason = `MANUAL_REPS: ${reps}/${maxReps} ${compUpper}`;
                  const testActions = tasksToUpdate.map(t => ({
                    testId: t.id,
                    action: 'manual_reps',
                    reps,
                    maxReps,
                    section: component,
                    percentage: 70, // SSOT minimal passing 70% per process
                    reason: mReason
                  }));

                  await adminApplyForgiven({
                    classId: window._selectedClassId || classId || cid,
                    studentIds: [studentId],
                    testActions,
                    forgivenBy: 'Mr. Top',
                    reason: mReason
                  });

                  if (typeof clearAdminCache === 'function') {
                  clearAdminCache('attempts');
                  clearAdminCache('tests');
                }
                if (window._classHubCache && targetClassId) {
                  delete window._classHubCache[targetClassId];
                }
                  if (typeof showToast === 'function') showToast(`✓ Topic ${topicCode} ${compLabel} repetitions (${reps}/${maxReps}) saved successfully!`, 'success');
                } catch (err) {
                  console.error('Save manual topic repetitions error:', err);
                  if (typeof showToast === 'function') showToast('Failed to save topic repetitions: ' + (err.message || err), 'error');
                  if (typeof hideLoading === 'function') hideLoading();
                  return;
                } finally {
                  if (typeof hideLoading === 'function') hideLoading();
                }
              }
              draft.isDirty = false;
            }

            delete window._manualInputState.drafts[studentId]?.[taskKey];

            if (window.renderClassHub) {
              await window.renderClassHub(document.getElementById('admin-content-area'));
            }
          };

          window.saveRowManualInput = async (studentId, testId, totalQ) => {
            if (isTutorRole()) {
              if (typeof showToast === 'function') showToast('Permission denied: Tutor accounts cannot manually modify exam grades.', 'warning');
              return;
            }
            const studentDraft = window._manualInputState.drafts[studentId] || {};
            let dirtyTestIds = Object.keys(studentDraft).filter(tId => studentDraft[tId]?.isDirty);

            if (testId && !dirtyTestIds.includes(testId)) {
              const scoreInput = document.querySelector(`.input-matrix-exam-score-${studentId}-${testId}`);
              const ptsInput = document.querySelector(`.input-matrix-exam-pts-${studentId}-${testId}`);
              if (scoreInput && scoreInput.value !== '') {
                window.onMatrixExamScoreChange(studentId, testId, totalQ, scoreInput.value);
                if (window._manualInputState.drafts?.[studentId]?.[testId]?.isDirty) {
                  dirtyTestIds.push(testId);
                }
              } else if (ptsInput && ptsInput.value !== '') {
                window.onMatrixExamPtsChange(studentId, testId, totalQ, ptsInput.value);
                if (window._manualInputState.drafts?.[studentId]?.[testId]?.isDirty) {
                  dirtyTestIds.push(testId);
                }
              }
            }

            if (dirtyTestIds.length > 0) {
              if (typeof showLoading === 'function') showLoading('Saving exam rate...');
              try {
                const testActions = dirtyTestIds.map(tId => {
                  const d = studentDraft[tId];
                  const pct = Math.max(0, Math.min(100, Number(d?.score || 0)));
                  // Rule 2.10: Points Half-Up Whole Integer Invariant (Math.round)
                  const pts = d?.pts != null ? Math.round(Number(d.pts)) : Math.round((d?.totalQ || totalQ || 120) * (pct / 100));
                  const g = typeof calculateGrade === 'function' ? calculateGrade(pct) : (typeof getGrade === 'function' ? getGrade(pct) : 'E');
                  return {
                    testId: tId,
                    action: 'manual',
                    percentage: pct,
                    score: pts,
                    grade: g
                  };
                });

                await adminApplyForgiven({
                  classId: window._selectedClassId || classId || cid,
                  studentIds: [studentId],
                  testActions,
                  forgivenBy: 'Mr. Top',
                  reason: 'Score Edit'
                });

                if (typeof showToast === 'function') showToast('✓ Exam rate saved successfully!', 'success');
              } catch (err) {
                console.error('Save exam rate error:', err);
                if (typeof showToast === 'function') showToast('Failed to save rate: ' + (err.message || err), 'error');
                if (typeof hideLoading === 'function') hideLoading();
                return;
              } finally {
                if (typeof hideLoading === 'function') hideLoading();
              }
            }

            window._manualInputState.activeStudentIds.delete(studentId);
            delete window._manualInputState.drafts[studentId];

            if (window.renderClassHub) {
              await window.renderClassHub(document.getElementById('admin-content-area'));
            }
          };

          window.toggleRowManualInput = async (studentId, testId, totalQ) => {
            if (isTutorRole()) {
              if (typeof showToast === 'function') showToast('Permission denied: Tutor accounts cannot manually modify exam grades.', 'warning');
              return;
            }
            const isCurrentlyActive = window._manualInputState.activeStudentIds.has(studentId);

            if (isCurrentlyActive) {
              await window.saveRowManualInput(studentId, testId, totalQ);
            } else {
              window._manualInputState.activeStudentIds.add(studentId);
              if (typeof renderAttendanceGridMatrix === 'function') {
                if (typeof renderAttendanceTopPanel === 'function') {
            renderAttendanceTopPanel();
          }
          renderAttendanceGridMatrix(window._classAttendanceThemeFilter || 'ALL');
              }
              setTimeout(() => {
                const selector = testId
                  ? `.input-matrix-exam-score-${studentId}-${testId}`
                  : `.input-matrix-exam-score[data-student-id="${studentId}"]`;
                const firstInput = document.querySelector(selector);
                if (firstInput) {
                  firstInput.focus();
                  firstInput.select();
                }
              }, 60);
            }
          };

          window.toggleAllManualInputMode = async () => {
            if (isTutorRole()) {
              if (typeof showToast === 'function') showToast('Permission denied: Tutor accounts cannot manually modify exam grades.', 'warning');
              return;
            }
            const hasActive = window._manualInputState.activeStudentIds.size > 0;

            if (hasActive) {
              const allActiveIds = Array.from(window._manualInputState.activeStudentIds);
              const updatesByStudent = [];

              allActiveIds.forEach(sId => {
                const studentDraft = window._manualInputState.drafts[sId] || {};
                const dirtyKeys = Object.keys(studentDraft).filter(k => studentDraft[k]?.isDirty);
                const testActions = [];

                dirtyKeys.forEach(k => {
                  if (k.startsWith('task_')) {
                    const d = studentDraft[k];
                    const parts = k.replace('task_', '').split('_');
                    const tc = d?.themeCode || parts[0];
                    const topCode = d?.topicCode || (parts.length > 1 ? parts.slice(1).join('_') : null);
                    const reps = Number(d?.reps != null ? d.reps : (d?.earned != null ? d.earned : 0));
                    const maxReps = Number(d?.targetReps || d?.maxTasks || targetReps || 7);

                    const taskAsmsInTheme = window._themeTaskAsmsMap?.[tc] || [];
                    let targetTasks = [];
                    if (topCode) {
                      targetTasks = taskAsmsInTheme.filter(a => String(a.payload?.topic_code || '') === topCode);
                    }
                    if (targetTasks.length === 0) {
                      targetTasks = taskAsmsInTheme;
                    }

                    targetTasks.forEach(t => {
                      testActions.push({
                        testId: t.id,
                        action: 'manual_reps',
                        reps,
                        maxReps,
                        percentage: 70, // SSOT minimal passing 70% per process
                        reason: `MANUAL_REPS: ${reps}/${maxReps}`
                      });
                    });
                  } else {
                    const d = studentDraft[k];
                    const pct = Math.max(0, Math.min(100, Number(d?.score || 0)));
                    // Rule 2.10: Points Half-Up Whole Integer Invariant (Math.round)
                    const pts = d?.pts != null ? Math.round(Number(d.pts)) : Math.round((d?.totalQ || 120) * (pct / 100));
                    testActions.push({ testId: k, action: 'manual', percentage: pct, score: pts });
                  }
                });

                if (testActions.length > 0) {
                  updatesByStudent.push({ studentId: sId, testActions });
                }
              });

              if (updatesByStudent.length > 0) {
                if (typeof showLoading === 'function') showLoading(`Saving scores for ${updatesByStudent.length} student(s)...`);
                const targetClassId = window._selectedClassId || classId || cid || window._currentClassHubContext?.classId;
                try {
                  const BATCH_SIZE = 5;
                  for (let i = 0; i < updatesByStudent.length; i += BATCH_SIZE) {
                    const slice = updatesByStudent.slice(i, i + BATCH_SIZE);
                    await Promise.all(slice.map(item => adminApplyForgiven({
                      classId: targetClassId,
                      studentIds: [item.studentId],
                      testActions: item.testActions,
                      forgivenBy: 'Mr. Top',
                      reason: 'Score Edit Batch',
                      skipAudit: true
                    })));
                  }

                  if (typeof logAuditEvent === 'function') {
                    await logAuditEvent({
                      actor_role: 'ADMIN',
                      action: 'SCORE_EDIT_BATCH',
                      entity_type: 'class',
                      entity_id: targetClassId,
                      new_value: {
                        studentCount: updatesByStudent.length,
                        reason: 'Score Edit Batch'
                      }
                    });
                  }

                  if (typeof clearAdminCache === 'function') {
                  clearAdminCache('attempts');
                  clearAdminCache('tests');
                }
                if (window._classHubCache && targetClassId) {
                  delete window._classHubCache[targetClassId];
                }
                  if (typeof showToast === 'function') showToast(`✓ Scores saved successfully for ${updatesByStudent.length} student(s)!`, 'success');
                } catch (err) {
                  console.error('Batch save error:', err);
                  if (typeof showToast === 'function') showToast('Failed to save scores: ' + (err.message || err), 'error');
                } finally {
                  if (typeof hideLoading === 'function') hideLoading();
                }
              }

              window._manualInputState.activeStudentIds.clear();
              window._manualInputState.drafts = {};

              if (window.renderClassHub) {
                await window.renderClassHub(document.getElementById('admin-content-area'));
              }
            } else {
              const visibleStudents = studentsGridData || [];
              visibleStudents.forEach(s => window._manualInputState.activeStudentIds.add(s.id));
              if (typeof renderAttendanceGridMatrix === 'function') {
                if (typeof renderAttendanceTopPanel === 'function') {
            renderAttendanceTopPanel();
          }
          renderAttendanceGridMatrix(window._classAttendanceThemeFilter || 'ALL');
              }
              if (typeof showToast === 'function') showToast('Manual input mode ACTIVE for all students.', 'info');
            }
          };

          window.hasDirtyManualDrafts = () => {
            const drafts = window._manualInputState?.drafts || {};
            for (const sId of Object.keys(drafts)) {
              const sDraft = drafts[sId] || {};
              for (const k of Object.keys(sDraft)) {
                if (sDraft[k]?.isDirty) return true;
              }
            }
            return false;
          };

          window.saveAllManualDrafts = async () => {
            if (isTutorRole()) {
              if (typeof showToast === 'function') showToast('Permission denied: Tutor accounts cannot manually modify exam grades.', 'warning');
              return;
            }

            const drafts = window._manualInputState?.drafts || {};
            const studentIds = Object.keys(drafts);
            const updatesByStudent = [];
            const repetitionActions = [];

            studentIds.forEach(sId => {
              const studentDraft = drafts[sId] || {};
              const dirtyKeys = Object.keys(studentDraft).filter(k => studentDraft[k]?.isDirty);
              const testActions = [];

              dirtyKeys.forEach(k => {
                if (k.startsWith('rep_')) {
                  const d = studentDraft[k];
                  repetitionActions.push({ studentId: sId, ...d });
                } else if (k.startsWith('task_')) {
                  const d = studentDraft[k];
                  const parts = k.replace('task_', '').split('_');
                  const tc = d?.themeCode || parts[0];
                  const topCode = d?.topicCode || (parts.length > 1 ? parts.slice(1).join('_') : null);
                  const reps = Number(d?.reps != null ? d.reps : (d?.earned != null ? d.earned : 0));
                  const maxReps = Number(d?.targetReps || d?.maxTasks || 7);

                  const taskAsmsInTheme = window._themeTaskAsmsMap?.[tc] || [];
                  let targetTasks = [];
                  if (topCode) {
                    targetTasks = taskAsmsInTheme.filter(a => {
                      const topic = String(a.payload?.topic_code || a.topic_code || '').toUpperCase();
                      const code = String(a.shell_code || a.test_code || a.code || '').toUpperCase();
                      const targetTop = String(topCode).toUpperCase();
                      return topic === targetTop || code.includes(`-${targetTop}-`) || code.endsWith(`-${targetTop}`) || topic.includes(targetTop);
                    });
                  }
                  if (targetTasks.length === 0) {
                    if (taskAsmsInTheme.length > 0) {
                      targetTasks = taskAsmsInTheme;
                    } else {
                      const allClassTests = (window._currentClassHubContext?.classTests || classTests || []);
                      const nonExams = allClassTests.filter(a => !isWeeklyExam(a));
                      if (topCode) {
                        targetTasks = nonExams.filter(a => {
                          const topic = String(a.payload?.topic_code || a.topic_code || '').toUpperCase();
                          const code = String(a.shell_code || a.test_code || a.code || '').toUpperCase();
                          const targetTop = String(topCode).toUpperCase();
                          return topic === targetTop || code.includes(`-${targetTop}-`) || code.endsWith(`-${targetTop}`) || topic.includes(targetTop);
                        });
                      }
                      if (targetTasks.length === 0) {
                        targetTasks = nonExams;
                      }
                    }
                  }

                  targetTasks.forEach(t => {
                    testActions.push({
                      testId: t.id,
                      action: 'manual_reps',
                      reps,
                      maxReps,
                      percentage: 70, // SSOT minimal passing 70% per process
                      reason: `MANUAL_REPS: ${reps}/${maxReps}`
                    });
                  });
                } else if (k.startsWith('exam_')) {
                  const d = studentDraft[k];
                  const pct = Math.max(0, Math.min(100, Number(d?.score || 0)));
                  const defaultDenom = d?.section === 'words' ? 160 : (d?.section === 'phrases' ? 40 : 120);
                  const pts = d?.pts != null ? Math.round(Number(d.pts)) : Math.round((d?.totalQ || defaultDenom) * (pct / 100));
                  const g = typeof calculateGrade === 'function' ? calculateGrade(pct) : (typeof getGrade === 'function' ? getGrade(pct) : 'E');
                  testActions.push({
                    testId: d.testId,
                    section: d.section,
                    totalQ: d.totalQ || defaultDenom,
                    action: 'manual',
                    percentage: pct,
                    score: pts,
                    grade: g
                  });
                } else {
                  const d = studentDraft[k];
                  const pct = Math.max(0, Math.min(100, Number(d?.score || 0)));
                  // Rule 2.10: Points Half-Up Whole Integer Invariant (Math.round)
                  const pts = d?.pts != null ? Math.round(Number(d.pts)) : Math.round((d?.totalQ || 120) * (pct / 100));
                  const g = typeof calculateGrade === 'function' ? calculateGrade(pct) : (typeof getGrade === 'function' ? getGrade(pct) : 'E');
                  testActions.push({ testId: k, action: 'manual', percentage: pct, score: pts, grade: g });
                }
              });

              if (testActions.length > 0) {
                updatesByStudent.push({ studentId: sId, testActions });
              }
            });

            if (updatesByStudent.length > 0) {
              if (typeof showLoading === 'function') showLoading(`Saving scores for ${updatesByStudent.length} student(s)...`);
              const targetClassId = window._selectedClassId || window._currentClassHubContext?.classId;
              try {
                // Execute students concurrently in parallel slices (max 5 concurrent) for ultra-fast throughput
                const BATCH_SIZE = 5;
                for (let i = 0; i < updatesByStudent.length; i += BATCH_SIZE) {
                  const slice = updatesByStudent.slice(i, i + BATCH_SIZE);
                  await Promise.all(slice.map(item => adminApplyForgiven({
                    classId: targetClassId,
                    studentIds: [item.studentId],
                    testActions: item.testActions,
                    forgivenBy: 'Mr. Top',
                    reason: 'Score Edit Batch',
                    skipAudit: true
                  })));
                }

                // Single consolidated audit log for the entire batch (non-blocking)
                if (typeof logAuditEvent === 'function') {
                  await logAuditEvent({
                    actor_role: 'ADMIN',
                    action: 'SCORE_EDIT_BATCH',
                    entity_type: 'class',
                    entity_id: targetClassId,
                    new_value: {
                      studentCount: updatesByStudent.length,
                      reason: 'Score Edit Batch'
                    }
                  });
                }

                if (typeof clearAdminCache === 'function') {
                  clearAdminCache('attempts');
                  clearAdminCache('tests');
                }
                if (window._classHubCache && targetClassId) {
                  delete window._classHubCache[targetClassId];
                }
                if (typeof showToast === 'function') showToast(`✓ Scores saved successfully for ${updatesByStudent.length} student(s)!`, 'success');
              } catch (err) {
                console.error('Batch save score error:', err);
                if (typeof showToast === 'function') showToast('Failed to save scores: ' + (err.message || err), 'error');
                throw err;
              } finally {
                if (typeof hideLoading === 'function') hideLoading();
              }
            }

            if (repetitionActions.length > 0) {
              if (typeof showLoading === 'function') showLoading(`Saving ${repetitionActions.length} repetition score(s)...`);
              try {
                const sb = await getSupabase();
                for (const item of repetitionActions) {
                  if (item.pct !== null) {
                    const g = typeof calculateGrade === 'function' ? calculateGrade(item.pct) : (typeof getGrade === 'function' ? getGrade(item.pct) : 'C');
                    const now = new Date().toISOString();
                    if (item.attemptId) {
                      await sb.from('attempts').update({
                        percentage: item.pct,
                        score: item.rawScore,
                        grade: g,
                        status: 'evaluated',
                        updated_at: now
                      }).eq('id', item.attemptId);
                    } else {
                      await sb.from('attempts').insert({
                        student_id: item.studentId,
                        test_id: item.taskId,
                        total_questions: item.totalQ,
                        score: item.rawScore,
                        percentage: item.pct,
                        grade: g,
                        status: 'evaluated',
                        started_at: now,
                        submitted_at: now,
                        created_at: now,
                        forgiven_reason: `MANUAL_REPS: 1/1 ${String(item.component || 'words').toUpperCase()}`
                      });
                    }
                  } else if (item.attemptId) {
                    await sb.from('attempts').update({
                      percentage: 0,
                      score: 0,
                      grade: 'E',
                      status: 'evaluated',
                      updated_at: new Date().toISOString()
                    }).eq('id', item.attemptId);
                  }
                }
                if (typeof clearAdminCache === 'function') {
                  clearAdminCache('attempts');
                  clearAdminCache('tests');
                }
                if (window._classHubCache && targetClassId) {
                  delete window._classHubCache[targetClassId];
                }
                if (typeof showToast === 'function') showToast(`✓ ${repetitionActions.length} repetition score(s) saved!`, 'success');
              } catch (repErr) {
                console.error('Repetition save error:', repErr);
                if (typeof showToast === 'function') showToast('Failed to save repetition attempts: ' + (repErr.message || repErr), 'error');
                throw repErr;
              } finally {
                if (typeof hideLoading === 'function') hideLoading();
              }
            }

            window._manualInputState.drafts = {};
            window._manualInputState.activeStudentIds.clear();
          };

          window.openManualSavePrompt = (onConfirmSave, onConfirmCancel) => {
            document.getElementById('manual-score-save-prompt-overlay')?.remove();

            const overlay = document.createElement('div');
            overlay.id = 'manual-score-save-prompt-overlay';
            overlay.className = 'topscore-modal-overlay';
            overlay.style.cssText = `
              position: fixed; inset: 0; background: rgba(9, 13, 22, 0.88); backdrop-filter: blur(6px);
              z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box;
            `;

            overlay.innerHTML = `
              <div class="modal-card" style="
                background: #0f172a; border: 1.5px solid rgba(56, 189, 248, 0.4); border-radius: 12px;
                width: 100%; max-width: 440px; box-shadow: 0 20px 40px rgba(0,0,0,0.6), 0 0 24px rgba(56,189,248,0.25);
                overflow: hidden; display: flex; flex-direction: column;
              ">
                <!-- Title Area (60px Strict Invariant & Centered Title § 1.5.1) -->
                <div class="title-area accent-cyan" style="
                  height: 60px !important; min-height: 60px !important; max-height: 60px !important;
                  box-sizing: border-box !important; display: flex !important; align-items: center !important;
                  justify-content: center !important; text-align: center !important; margin-bottom: 0 !important;
                  padding: 0 16px !important; background: rgba(56, 189, 248, 0.18) !important;
                  border-bottom: 1.5px solid rgba(56, 189, 248, 0.4) !important; flex-shrink: 0 !important;
                ">
                  <h3 style="
                    margin: 0 !important; font-size: 16px !important; font-weight: 800 !important;
                    font-family: var(--fm-font-display, 'Inter', sans-serif) !important;
                    color: #FFFFFF !important; text-transform: uppercase !important; letter-spacing: 0.05em !important;
                  ">SAVE EDIT CHANGES</h3>
                </div>

                <!-- Body (10px–20px standard padding & Level 2.5 typography) -->
                <div style="padding: 24px 20px; font-size: 14px; font-weight: 500; font-family: 'Inter', sans-serif; color: #cbd5e1; line-height: 1.5; text-align: center;">
                  Do you want to save all modified scores and task repetitions to the database, or discard the changes?
                </div>

                <!-- CTA Area (60px Strict Invariant, 40px Buttons, Dual-Button Flush Ends § 1.5.2 & § 1.5.4) -->
                <div class="cta-area" style="
                  height: 60px !important; min-height: 60px !important; max-height: 60px !important;
                  box-sizing: border-box !important; display: flex !important; align-items: center !important;
                  justify-content: space-between !important; padding: 10px 16px !important; margin-top: 0 !important;
                  border-top: 1.5px solid rgba(255, 255, 255, 0.16) !important; background: rgba(15, 23, 42, 0.6) !important;
                  flex-shrink: 0 !important;
                ">
                  <!-- Universal Left-Anchored CLOSE Button Standard (Zero 'Cancel' Invariant § 1.5.4) -->
                  <button type="button" id="btn-manual-prompt-cancel" class="btn btn-secondary" style="
                    height: 40px !important; min-height: 40px !important; max-height: 40px !important;
                    padding: 0 20px !important; font-size: 14px !important; font-weight: 800 !important;
                    font-family: var(--fm-font-display, 'Inter', sans-serif) !important;
                    border: 1px solid rgba(255, 255, 255, 0.2) !important; background: transparent !important;
                    color: #94a3b8 !important; cursor: pointer !important; border-radius: 6px !important;
                    letter-spacing: 0.04em !important; text-transform: uppercase !important; transition: all 0.15s ease;
                  ">
                    CLOSE
                  </button>

                  <!-- Primary Action: SAVE CHANGES (Tactical Blue, 40px, Glow) -->
                  <button type="button" id="btn-manual-prompt-save" class="btn btn-tactical" style="
                    height: 40px !important; min-height: 40px !important; max-height: 40px !important;
                    padding: 0 20px !important; font-size: 14px !important; font-weight: 800 !important;
                    font-family: var(--fm-font-display, 'Inter', sans-serif) !important;
                    display: inline-flex !important; align-items: center !important; justify-content: center !important;
                    gap: 8px !important; border-radius: 6px !important; background: #38bdf8 !important;
                    border: 1px solid #38bdf8 !important; color: #090d16 !important; cursor: pointer !important;
                    box-shadow: 0 0 14px rgba(56, 189, 248, 0.45) !important; letter-spacing: 0.04em !important;
                    text-transform: uppercase !important; transition: all 0.15s ease;
                  ">
                    ${getSvgIcon('check-circle', 16)} SAVE CHANGES
                  </button>
                </div>
              </div>
            `;

            document.body.appendChild(overlay);

            overlay.querySelector('#btn-manual-prompt-save').onclick = async () => {
              overlay.remove();
              if (typeof onConfirmSave === 'function') await onConfirmSave();
            };

            overlay.querySelector('#btn-manual-prompt-cancel').onclick = () => {
              overlay.remove();
              if (typeof onConfirmCancel === 'function') onConfirmCancel();
            };
          };

          window.toggleCellRemedial = async (studentId, testIdsInput, isChecked) => {
            if (isTutorRole()) {
              if (typeof showToast === 'function') showToast('Permission denied: Tutor accounts cannot modify grades.', 'warning');
              return;
            }
            const testIds = Array.isArray(testIdsInput) ? testIdsInput : [testIdsInput];
            if (!studentId || !testIds.length) return;

            try {
              if (typeof showLoading === 'function') showLoading(isChecked ? 'Applying Remedial (Grade R)...' : 'Removing Remedial...');
              const sb = await getSupabase();
              const nowIso = new Date().toISOString();

              for (const testId of testIds) {
                const { data: atts, error: fetchErr } = await sb
                  .from('attempts')
                  .select('id, percentage, score, total_questions, status, is_remedial, is_forgiven, grade, effective_score')
                  .eq('student_id', studentId)
                  .eq('test_id', testId)
                  .order('created_at', { ascending: false });

                if (fetchErr) throw fetchErr;

                if (isChecked) {
                  if (atts && atts.length > 0) {
                    const sorted = [...atts].sort((a, b) => Number(b.percentage || b.score || 0) - Number(a.percentage || a.score || 0));
                    const topAtt = sorted[0];
                    const rawPct = parseFloat(topAtt.percentage || topAtt.score || 0);
                    const cappedScore = Math.min(rawPct, 60.0);
                    const cappedGrade = typeof calculateGrade === 'function' ? calculateGrade(cappedScore) : 'C';

                    const { error: updErr } = await sb
                      .from('attempts')
                      .update({
                        is_remedial: true,
                        is_remedial_unlocked: true,
                        is_forgiven: false,
                        effective_score: cappedScore,
                        grade: cappedGrade,
                        is_best_score: true,
                        updated_at: nowIso
                      })
                      .eq('id', topAtt.id);

                    if (updErr) throw updErr;

                    for (const other of atts) {
                      if (other.id !== topAtt.id && other.is_best_score) {
                        await sb.from('attempts').update({ is_best_score: false, updated_at: nowIso }).eq('id', other.id);
                      }
                    }
                  } else {
                    const totalQ = 120;
                    const pts = Math.round(totalQ * 0.6);
                    const { error: insErr } = await sb
                      .from('attempts')
                      .insert({
                        student_id: studentId,
                        test_id: testId,
                        attempt_number: 1,
                        started_at: nowIso,
                        expires_at: nowIso,
                        submitted_at: nowIso,
                        status: 'submitted',
                        score: pts,
                        correct_count: pts,
                        total_questions: totalQ,
                        percentage: 60.0,
                        effective_score: 60.0,
                        grade: 'C',
                        is_best_score: true,
                        is_remedial: true,
                        is_remedial_unlocked: true,
                        is_forgiven: false,
                        created_at: nowIso,
                        updated_at: nowIso
                      });
                    if (insErr) throw insErr;
                  }
                } else {
                  // Uncheck: revert remedial
                  if (atts && atts.length > 0) {
                    for (const att of atts) {
                      if (att.is_remedial || att.grade === 'R') {
                        const rawPct = parseFloat(att.percentage || att.score || 0);
                        const normalGrade = typeof calculateGrade === 'function' ? calculateGrade(rawPct) : (typeof getGrade === 'function' ? getGrade(rawPct) : '—');
                        await sb
                          .from('attempts')
                          .update({
                            is_remedial: false,
                            is_remedial_unlocked: false,
                            effective_score: rawPct,
                            grade: normalGrade,
                            updated_at: nowIso
                          })
                          .eq('id', att.id);
                      }
                    }
                  }
                }
              }

              if (typeof clearAdminCache === 'function') clearAdminCache('attempts');
              if (typeof showToast === 'function') showToast(isChecked ? '✓ Remedial (Grade R, cap 60%) applied' : '✓ Remedial removed', 'success');

              if (window.renderClassHub) {
                await window.renderClassHub(document.getElementById('admin-content-area'));
              }
            } catch (err) {
              console.error('Error in toggleCellRemedial:', err);
              if (typeof showToast === 'function') showToast('Failed to update remedial: ' + (err.message || err), 'error');
            } finally {
              if (typeof hideLoading === 'function') hideLoading();
            }
          };

          window.toggleCellForgiven = async (studentId, testIdsInput, isChecked) => {
            if (isTutorRole()) {
              if (typeof showToast === 'function') showToast('Permission denied: Tutor accounts cannot modify grades.', 'warning');
              return;
            }
            const testIds = Array.isArray(testIdsInput) ? testIdsInput : [testIdsInput];
            if (!studentId || !testIds.length) return;

            try {
              if (typeof showLoading === 'function') showLoading(isChecked ? 'Granting Forgiven Waiver (Grade F)...' : 'Removing Forgiven Waiver...');
              const sb = await getSupabase();
              const nowIso = new Date().toISOString();

              if (isChecked) {
                // User directive: "saat diberikan nilai F maka berarpun nilainya dianggap selesai tapi tidak dinaikkan , hanya dianggap paSSED saja."
                const testActions = testIds.map(tId => ({ testId: tId, action: 'forgive' }));
                await adminApplyForgiven({
                  classId: window._selectedClassId || window._currentClassHubContext?.classId,
                  studentIds: [studentId],
                  testActions,
                  forgivenBy: 'Mr. Top',
                  reason: 'Tutor Result Waiver'
                });
                if (typeof clearAdminCache === 'function') {
                  clearAdminCache('attempts');
                  clearAdminCache('tests');
                }
                if (window._classHubCache && targetClassId) {
                  delete window._classHubCache[targetClassId];
                }
                if (typeof showToast === 'function') showToast('✓ Forgiven waiver (Grade F - Passed) granted', 'success');
              } else {
                // Uncheck: revoke waiver
                for (const testId of testIds) {
                  const { data: atts, error: fetchErr } = await sb
                    .from('attempts')
                    .select('id, percentage, score, total_questions, is_forgiven, grade')
                    .eq('student_id', studentId)
                    .eq('test_id', testId);

                  if (fetchErr) throw fetchErr;

                  if (atts && atts.length > 0) {
                    for (const att of atts) {
                      if (att.is_forgiven || att.grade === 'F') {
                        const rawPct = parseFloat(att.percentage || att.score || 0);
                        const normalGrade = typeof calculateGrade === 'function' ? calculateGrade(rawPct) : (typeof getGrade === 'function' ? getGrade(rawPct) : '—');
                        await sb
                          .from('attempts')
                          .update({
                            is_forgiven: false,
                            forgiven_reason: null,
                            forgiven_at: null,
                            forgiven_by: null,
                            grade: normalGrade,
                            updated_at: nowIso
                          })
                          .eq('id', att.id);
                      }
                    }
                  }
                }
                if (typeof clearAdminCache === 'function') {
                  clearAdminCache('attempts');
                  clearAdminCache('tests');
                }
                if (window._classHubCache && targetClassId) {
                  delete window._classHubCache[targetClassId];
                }
                if (typeof showToast === 'function') showToast('✓ Forgiven waiver removed', 'info');
              }

              if (window.renderClassHub) {
                await window.renderClassHub(document.getElementById('admin-content-area'));
              }
            } catch (err) {
              console.error('Error in toggleCellForgiven:', err);
              if (typeof showToast === 'function') showToast('Failed to update waiver: ' + (err.message || err), 'error');
            } finally {
              if (typeof hideLoading === 'function') hideLoading();
            }
          };

          // Function to build and mount the attendance grid based on selected theme
          renderAttendanceGridMatrix = (selectedTheme = 'ALL') => {
            window._classAttendanceThemeFilter = selectedTheme;

            // Update active pill button state
            if (themeContainer) {
              themeContainer.querySelectorAll('.attendance-theme-pill').forEach(b => {
                b.classList.toggle('active', (b.dataset.theme || 'ALL') === selectedTheme);
              });
            }

            const isTestAsm = isWeeklyExam;

            // Group all class tests by theme (Tasks & Exams)
            const themeGroups = {};
            classTests.forEach(asm => {
              const rawTheme = asm.payload?.theme_code || (asm.shell_code ? asm.shell_code.replace(/^[0-9]+/, '').charAt(0) : 'A');
              const tc = (rawTheme || 'A').toUpperCase();
              if (!themeGroups[tc]) themeGroups[tc] = [];
              themeGroups[tc].push(asm);
            });

            const sortedActiveThemes = Object.keys(themeGroups).sort();

            // Pre-calculate accumulated task progress and exam points/score for each student in studentsGridData
            sortedActiveThemes.forEach(tc => {
              const asmsInTheme = themeGroups[tc] || [];
              const taskAsmsInTheme = asmsInTheme.filter(a => !isWeeklyExam(a));
              const examAsmsInTheme = asmsInTheme.filter(isWeeklyExam);
              const targetAsms = examAsmsInTheme.length > 0 ? examAsmsInTheme : asmsInTheme;

              // Determine number of topics in theme
              const hasPhrasesInTheme = checkThemeHasPhrases(taskAsmsInTheme);
              let topicCodes = [];
              if (hasPhrasesInTheme) {
                topicCodes = Array.from(new Set(taskAsmsInTheme.map(a => String(a.payload?.topic_code || a.shell_code?.split('-')[2] || '1'))));
              } else {
                topicCodes = taskAsmsInTheme.map((a, idx) => String(a.payload?.topic_code || (idx + 1)));
              }
              topicCodes.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
              const numTopics = topicCodes.length;
              const topicTargetReps = hasPhrasesInTheme ? (compTargetReps * 2) : compTargetReps;
              const maxThemeTasks = numTopics * topicTargetReps;

              studentsGridData.forEach(row => {
                // 1. Exam Points & Score Calculation
                const themeHasExamPhrases = isVocab && !isLevel2Vocab && (hasPhrasesInTheme || examAsmsInTheme.some(e => e.payload?.is_unified || e.payload?.category === 'phrases' || /PHRASE/i.test(e.shell_code || e.title || '')));
                if (themeHasExamPhrases) {
                  const examTestIds = new Set(examAsmsInTheme.map(e => e.id));
                  const studentExamAtts = (row.allAttempts || []).filter(a => {
                    const tid = a.test_id || a.Test_id;
                    return examTestIds.has(tid);
                  }).filter(a => ['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(String(a.status || '').toLowerCase()));

                  // A. Words attempts
                  const wordsAtts = studentExamAtts.filter(a => {
                    const fr = String(a.forgiven_reason || '');
                    const tQ = Number(a.total_questions || 0);
                    return fr.includes('[SECTION: WORDS]') || (tQ > 40 && tQ <= 160);
                  });
                  wordsAtts.sort((x, y) => {
                    const pctX = Number(x.percentage != null ? x.percentage : (x.total_questions ? (x.score / x.total_questions) * 100 : 0));
                    const pctY = Number(y.percentage != null ? y.percentage : (y.total_questions ? (y.score / y.total_questions) * 100 : 0));
                    if (Math.abs(pctY - pctX) > 0.01) return pctY - pctX;
                    return new Date(y.updated_at || y.created_at || 0) - new Date(x.updated_at || x.created_at || 0);
                  });
                  const bestWords = wordsAtts[0] || null;

                  // B. Phrases attempts
                  const phrasesAtts = studentExamAtts.filter(a => {
                    const fr = String(a.forgiven_reason || '');
                    const tQ = Number(a.total_questions || 0);
                    return fr.includes('[SECTION: PHRASES]') || (tQ > 0 && tQ <= 40);
                  });
                  phrasesAtts.sort((x, y) => {
                    const pctX = Number(x.percentage != null ? x.percentage : (x.total_questions ? (x.score / x.total_questions) * 100 : 0));
                    const pctY = Number(y.percentage != null ? y.percentage : (y.total_questions ? (y.score / y.total_questions) * 100 : 0));
                    if (Math.abs(pctY - pctX) > 0.01) return pctY - pctX;
                    return new Date(y.updated_at || y.created_at || 0) - new Date(x.updated_at || x.created_at || 0);
                  });
                  const bestPhrases = phrasesAtts[0] || null;

                  // C. Full 200Q attempts fallback
                  const fullAtts = studentExamAtts.filter(a => Number(a.total_questions || 0) > 160);
                  fullAtts.sort((x, y) => {
                    const pctX = Number(x.percentage != null ? x.percentage : (x.total_questions ? (x.score / x.total_questions) * 100 : 0));
                    const pctY = Number(y.percentage != null ? y.percentage : (y.total_questions ? (y.score / y.total_questions) * 100 : 0));
                    if (Math.abs(pctY - pctX) > 0.01) return pctY - pctX;
                    return new Date(y.updated_at || y.created_at || 0) - new Date(x.updated_at || x.created_at || 0);
                  });
                  const bestFull = fullAtts[0] || null;

                  let wordsRate = null, wordsPts = null;
                  let phrasesRate = null, phrasesPts = null;
                  let accPts = null, accRate = null;

                  // Candidate words: pick highest between words-only attempt and full attempt
                  const candidateWords = [];
                  if (bestWords) {
                    const bPct = Number(bestWords.percentage != null ? bestWords.percentage : (bestWords.total_questions ? (bestWords.score / bestWords.total_questions) * 100 : 0));
                    const bPts = bestWords.total_questions === 160 ? Math.round(Number(bestWords.score || 0)) : Math.round(160 * (bPct / 100));
                    candidateWords.push({
                      pts: bPts,
                      pct: Math.round(bPct)
                    });
                  }
                  if (bestFull) {
                    const wSc = Math.min(160, Number(bestFull.score || 0));
                    candidateWords.push({
                      pts: Math.round(wSc),
                      pct: Math.round((wSc / 160) * 100)
                    });
                  }
                  if (candidateWords.length > 0) {
                    candidateWords.sort((a, b) => b.pts - a.pts);
                    wordsPts = candidateWords[0].pts;
                    wordsRate = candidateWords[0].pct;
                  }

                  // Candidate phrases: pick highest between phrases-only attempt and full attempt
                  const candidatePhrases = [];
                  if (bestPhrases) {
                    const bPct = Number(bestPhrases.percentage != null ? bestPhrases.percentage : (bestPhrases.total_questions ? (bestPhrases.score / bestPhrases.total_questions) * 100 : 0));
                    const bPts = bestPhrases.total_questions === 40 ? Math.round(Number(bestPhrases.score || 0)) : Math.round(40 * (bPct / 100));
                    candidatePhrases.push({
                      pts: bPts,
                      pct: Math.round(bPct)
                    });
                  }
                  if (bestFull && Number(bestFull.score || 0) > 160) {
                    const pSc = Math.min(40, Number(bestFull.score || 0) - 160);
                    candidatePhrases.push({
                      pts: Math.round(pSc),
                      pct: Math.round((pSc / 40) * 100)
                    });
                  }
                  if (candidatePhrases.length > 0) {
                    candidatePhrases.sort((a, b) => b.pts - a.pts);
                    phrasesPts = candidatePhrases[0].pts;
                    phrasesRate = candidatePhrases[0].pct;
                  }

                  const hasAnyExamAtt = (wordsPts != null || phrasesPts != null);
                  if (hasAnyExamAtt) {
                    accPts = (wordsPts || 0) + (phrasesPts || 0);
                    accRate = Math.round((accPts / 200) * 100);
                  }

                  row[`theme_${tc}_words_pts`] = wordsPts;
                  row[`theme_${tc}_words_rate`] = wordsRate;
                  row[`theme_${tc}_phrases_pts`] = phrasesPts;
                  row[`theme_${tc}_phrases_rate`] = phrasesRate;
                  row[`theme_${tc}_total_pts`] = hasAnyExamAtt ? accPts : -1;
                  row[`theme_${tc}_score`] = hasAnyExamAtt ? accRate : -1;
                  row[`theme_${tc}_grade`] = hasAnyExamAtt ? accRate : -1;
                  row[`theme_${tc}_max_q`] = 200;
                  row[`theme_${tc}_has_exam_att`] = hasAnyExamAtt;
                } else {
                  let themeEarned = 0;
                  let hasAtt = false;
                  let studentThemeMaxQ = 0;

                  targetAsms.forEach(asm => {
                    const att = row.asmScores?.[asm.id];
                    const fallbackMax = getAsmExpectedMax(asm);

                    if (att) {
                      const st = String(att.status || '').toLowerCase();
                      if (['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(st)) {
                        hasAtt = true;
                        const totalQ = Number(att.total_questions || fallbackMax);
                        studentThemeMaxQ += totalQ;
                        const sc = att.score != null ? Math.min(Number(att.score), totalQ) : 0;
                        themeEarned += sc;
                      }
                    }
                  });

                  // Rule 2.10: Points Half-Up Whole Integer Invariant (Math.round)
                  const cleanThemeEarned = Math.round(themeEarned);
                  const themePct = (hasAtt && studentThemeMaxQ > 0) ? Math.round((cleanThemeEarned / studentThemeMaxQ) * 100) : -1;
                  row[`theme_${tc}_total_pts`] = hasAtt ? cleanThemeEarned : -1;
                  row[`theme_${tc}_score`] = hasAtt ? themePct : -1;
                  row[`theme_${tc}_grade`] = hasAtt ? themePct : -1;
                  row[`theme_${tc}_max_q`] = studentThemeMaxQ;
                  row[`theme_${tc}_has_exam_att`] = hasAtt;
                }

                // 2. Formative Task Progress Calculation per Topic (1 to targetReps in 7x7 system)
                let earnedTasks = 0;
                let topicsPassedCount = 0;

                topicCodes.forEach((topCode, idx) => {
                  let topicLevel = 0;
                  let wPass = 0;
                  let pPass = 0;

                  if (hasPhrasesInTheme) {
                    const matchingTasks = taskAsmsInTheme.filter(a => String(a.payload?.topic_code || '').toUpperCase() === topCode.toUpperCase() || (a.shell_code && a.shell_code.includes(topCode)));
                    const wTask = matchingTasks.find(a => !(a.payload?.category === 'phrases' || /PHRASE/i.test(a.shell_code || a.title || ''))) || matchingTasks[0];
                    const pTask = matchingTasks.find(a => (a.payload?.category === 'phrases' || /PHRASE/i.test(a.shell_code || a.title || ''))) || matchingTasks[0];

                    if (wTask && pTask && wTask.id !== pTask.id) {
                      wPass = row.asmWordsPassCounts?.[wTask.id] ?? row.asmPassCounts?.[wTask.id] ?? 0;
                      pPass = row.asmPhrasesPassCounts?.[pTask.id] ?? row.asmPassCounts?.[pTask.id] ?? 0;
                    } else if (wTask) {
                      wPass = row.asmWordsPassCounts?.[wTask.id] ?? 0;
                      pPass = row.asmPhrasesPassCounts?.[wTask.id] ?? 0;
                    }

                    wPass = Math.min(Math.max(0, wPass), compTargetReps);
                    pPass = Math.min(Math.max(0, pPass), compTargetReps);
                    topicLevel = Math.min(wPass, pPass);

                    row[`theme_${tc}_topic_${topCode}_words_reps`] = wPass;
                    row[`theme_${tc}_topic_${topCode}_phrases_reps`] = pPass;
                    row[`theme_${tc}_topic_${topCode}_reps`] = topicLevel;
                    earnedTasks += (wPass + pPass);
                    if (wPass >= compTargetReps && pPass >= compTargetReps) topicsPassedCount++;
                  } else {
                    const asm = taskAsmsInTheme.find(a => String(a.payload?.topic_code || (idx + 1)) === topCode) || taskAsmsInTheme[idx];
                    topicLevel = asm ? (row.asmPassCounts?.[asm.id] || 0) : 0;
                    const repsEarned = Math.min(Math.max(0, topicLevel), compTargetReps);
                    row[`theme_${tc}_topic_${topCode}_reps`] = repsEarned;
                    earnedTasks += repsEarned;
                    if (repsEarned >= compTargetReps) topicsPassedCount++;
                  }
                });

                const isTaskCompleted = maxThemeTasks > 0 ? (topicsPassedCount >= numTopics && earnedTasks >= maxThemeTasks) : true;
                row[`theme_${tc}_task`] = earnedTasks;
                row[`theme_${tc}_task_progress`] = earnedTasks;
                row[`theme_${tc}_task_max`] = maxThemeTasks;
                row[`theme_${tc}_task_completed`] = isTaskCompleted;
                row[`theme_${tc}_task_str`] = maxThemeTasks > 0 ? `${earnedTasks}/${maxThemeTasks}` : '—';
              });
            });

            // Calibrate master milestone progression progressPct and tooltip
            studentsGridData.forEach(row => {
              const totalExams = allClassExams.length || 8;
              row.progressPct = totalExams > 0 ? Math.round(((row.completedExamCount || 0) / totalExams) * 100) : 0;
              row.progressStr = `${row.progressPct}%`;
              row.progressTooltip = `${row.completedExamCount || 0}/${totalExams} Milestone Exams Done (${row.progressPct}%)`;

              // Recalculate totalEarnedScore from theme accumulative exam points across active themes
              let totalThemePts = 0;
              let totalThemePossible = 0;
              let hasAnyThemeExam = false;
              sortedActiveThemes.forEach(tc => {
                if (row[`theme_${tc}_has_exam_att`] && row[`theme_${tc}_total_pts`] != null && row[`theme_${tc}_total_pts`] >= 0) {
                  hasAnyThemeExam = true;
                  totalThemePts += Number(row[`theme_${tc}_total_pts`]);
                  totalThemePossible += Number(row[`theme_${tc}_max_q`] || 200);
                }
              });
              if (hasAnyThemeExam) {
                row.totalEarnedScore = Math.round(totalThemePts);
                if (totalThemePossible > 0) {
                  const themeAvgPct = Math.round((totalThemePts / totalThemePossible) * 100);
                  row.averageScorePct = themeAvgPct;
                  row.grade = typeof calculateGrade === 'function' ? calculateGrade(themeAvgPct) : row.grade;
                }
              }
            });

            // Check active theme view mode
            const isOverviewMode = !selectedTheme || selectedTheme === 'ALL' || selectedTheme === 'OVERVIEW';

            // Dynamically extract themeNames and topicNames from classTests and allVault
            const themeNames = {};
            const topicNames = {};
            classTests.forEach(asm => {
              const rawTc = asm.payload?.theme_code || (asm.shell_code ? asm.shell_code.replace(/^[0-9]+/, '').charAt(0) : '');
              const tc = String(rawTc || '').toUpperCase();
              const parts = (asm.title || '').split(' - ');
              const nameAfterDash = parts.length > 1 ? parts.slice(1).join(' - ').trim() : '';
              const isExam = asm.test_type === 'exam' || /EXAM/i.test(asm.shell_code || asm.title || '');

              if (tc) {
                if (asm.payload?.theme_name) {
                  themeNames[tc] = asm.payload.theme_name.trim();
                } else if (isExam && nameAfterDash) {
                  themeNames[tc] = nameAfterDash;
                }
              }

              const rawTopCode = asm.payload?.topic_code || (asm.shell_code ? asm.shell_code.split('-')[2] : '');
              const topCode = String(rawTopCode || '').toUpperCase();
              if (topCode) {
                if (asm.payload?.topic_name) {
                  topicNames[topCode] = asm.payload.topic_name.trim();
                } else if (!isExam && nameAfterDash) {
                  topicNames[topCode] = nameAfterDash;
                }
              }
            });

            (allVault || []).forEach(v => {
              const tc = String(v.theme_code || '').toUpperCase();
              if (tc && v.theme && !themeNames[tc]) themeNames[tc] = v.theme.trim();
              const topCode = String(v.topic_code || '').toUpperCase();
              if (topCode && v.topic && !topicNames[topCode]) topicNames[topCode] = v.topic.trim();
            });

            // Dynamic super-headers: STUDENTS DATA (2 cols: BATCH & STUDENT NAME), active themes, and OVERALL (3 cols) at the far right
            const themeStyles = {
              'A': 'background: #0b1120 !important; color: var(--quad-a, #ff2d87) !important;',
              'B': 'background: #0b1120 !important; color: var(--quad-b, #ff8c00) !important;',
              'C': 'background: #0b1120 !important; color: var(--quad-c, #95ff00) !important;',
              'D': 'background: #0b1120 !important; color: var(--quad-d, #38bdf8) !important;'
            };

            const themeSubHeaderStyles = {
              'A': 'background: #0b1120 !important; color: var(--quad-a, #ff2d87) !important;',
              'B': 'background: #0b1120 !important; color: var(--quad-b, #ff8c00) !important;',
              'C': 'background: #0b1120 !important; color: var(--quad-c, #95ff00) !important;',
              'D': 'background: #0b1120 !important; color: var(--quad-d, #38bdf8) !important;'
            };

            const dynamicSuperHeaders = [
              { label: 'STUDENTS DATA', colSpan: 2, className: 'super-hdr super-hdr-identity super-hdr-students-data', style: 'background: #0b1120 !important; color: #ffffff !important;' }
            ];

            const themeColorClasses = {
              'A': 'super-hdr super-hdr-theme super-hdr-theme-a',
              'B': 'super-hdr super-hdr-theme super-hdr-theme-b',
              'C': 'super-hdr super-hdr-theme super-hdr-theme-c',
              'D': 'super-hdr super-hdr-theme super-hdr-theme-d'
            };

            const selectedTopic = window._classAttendanceTopicFilter || 'ALL';
            const isTopicOverview = selectedTopic === 'ALL' || selectedTopic === 'OVERVIEW';

            if (isOverviewMode) {
              // Master Overview Super-Headers (8 cols for Vocab with Phrases or 5 cols per active theme + 3 cols OVERALL)
              sortedActiveThemes.forEach(tc => {
                const tName = themeNames[tc] ? ` (${themeNames[tc].toUpperCase()})` : '';
                const asmsInTheme = themeGroups[tc] || [];
                const taskAsms = asmsInTheme.filter(a => !isWeeklyExam(a));
                const examAsms = asmsInTheme.filter(isWeeklyExam);
                const themeHasExamPhrases = isVocab && !isLevel2Vocab && (checkThemeHasPhrases(taskAsms) || examAsms.some(e => e.payload?.is_unified || e.payload?.category === 'phrases' || /PHRASE/i.test(e.shell_code || e.title || '')));
                dynamicSuperHeaders.push({
                  label: `THEME ${tc}${tName}`,
                  colSpan: themeHasExamPhrases ? 8 : 5,
                  className: themeColorClasses[tc] || `super-hdr super-hdr-theme super-hdr-theme-${tc.toLowerCase()}`,
                  style: themeStyles[tc] || ''
                });
              });
              dynamicSuperHeaders.push({ label: 'OVERALL', colSpan: 3, className: 'super-hdr super-hdr-overall', style: 'background: #0b1120 !important; color: var(--grade-star, #a855f7) !important;' });
            } else {
              const activeThemeCode = sortedActiveThemes.includes(selectedTheme) ? selectedTheme : (sortedActiveThemes[0] || 'A');
              const asmsInTheme = themeGroups[activeThemeCode] || [];
              const taskAsmsInTheme = asmsInTheme.filter(a => !isWeeklyExam(a));
              const examAsmsInTheme = asmsInTheme.filter(isWeeklyExam);
              const tName = themeNames[activeThemeCode] ? ` (${themeNames[activeThemeCode].toUpperCase()})` : '';

              const rawTCodes = taskAsmsInTheme.map(a => String(a.payload?.topic_code || a.shell_code?.split('-')[2] || ''));
              let tCodes = Array.from(new Set(rawTCodes.filter(Boolean)));
              if (tCodes.length === 0) {
                tCodes = taskAsmsInTheme.map((a, idx) => `${activeThemeCode}${idx + 1}`);
              }
              tCodes.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

              if (isTopicOverview) {
                // Mode 2: General Theme Overview (1 summary column per topic)
                dynamicSuperHeaders.push({
                  label: `THEME ${activeThemeCode}${tName} - TOPICS OVERVIEW`,
                  colSpan: tCodes.length,
                  className: themeColorClasses[activeThemeCode] || `super-hdr super-hdr-theme super-hdr-theme-${activeThemeCode.toLowerCase()}`,
                  style: themeStyles[activeThemeCode] || ''
                });
              } else {
                // Mode 3: Detailed Progress for Single Selected Topic
                const targetTopCode = selectedTopic.toUpperCase();
                const matchingTasks = taskAsmsInTheme.filter(a =>
                  String(a.payload?.topic_code || '').toUpperCase() === targetTopCode ||
                  (a.shell_code && a.shell_code.includes(targetTopCode))
                );
                const hasPhrasesInTopic = checkTopicHasPhrases(matchingTasks);
                const topName = topicNames[targetTopCode] || topicNames[selectedTopic] || '';
                const superHdrText = topName
                  ? `TOPIC ${targetTopCode}: ${topName.toUpperCase()}`
                  : `TOPIC ${targetTopCode}`;

                dynamicSuperHeaders.push({
                  label: superHdrText,
                  colSpan: hasPhrasesInTopic ? 14 : 7,
                  className: themeColorClasses[activeThemeCode] || `super-hdr super-hdr-theme super-hdr-theme-${activeThemeCode.toLowerCase()}`,
                  style: themeStyles[activeThemeCode] || ''
                });
              }

              const activeExamHasPhrases = isVocab && !isLevel2Vocab && (examAsmsInTheme.some(e => e.payload?.is_unified || e.payload?.category === 'phrases' || /PHRASE/i.test(e.shell_code || e.title || '')) || checkThemeHasPhrases(taskAsmsInTheme));
              dynamicSuperHeaders.push({
                label: `THEME ${activeThemeCode}${tName} EXAM`,
                colSpan: activeExamHasPhrases ? 7 : 4,
                className: `${themeColorClasses[activeThemeCode] || 'super-hdr super-hdr-theme'} super-hdr-exam super-hdr-exam-${activeThemeCode.toLowerCase()}`,
                style: themeStyles[activeThemeCode] || 'background: #0b1120 !important;'
              });
            }

            // Build dynamic test and exam columns across active theme(s) (Progress | Score | Points | Grade)
            const dynamicAsmCols = [];
            window._themeTaskAsmsMap = window._themeTaskAsmsMap || {};

            sortedActiveThemes.forEach(tc => {
              const asmsInTheme = themeGroups[tc] || [];
              const taskAsmsInTheme = asmsInTheme.filter(a => !isWeeklyExam(a));
              window._themeTaskAsmsMap[tc] = taskAsmsInTheme;
            });

            const targetThemesToRender = isOverviewMode
              ? sortedActiveThemes
              : [sortedActiveThemes.includes(selectedTheme) ? selectedTheme : (sortedActiveThemes[0] || 'A')];

            targetThemesToRender.forEach(tc => {
              const asmsInTheme = themeGroups[tc] || [];
              const taskAsmsInTheme = asmsInTheme.filter(a => !isWeeklyExam(a));
              const examAsms = asmsInTheme.filter(isWeeklyExam);
              const examAsm = examAsms[0];
              const totalQ = Number(examAsm?.total_questions || (examAsm ? getAsmExpectedMax(examAsm) : 120)) || 120;

              const rawTopicCodes = taskAsmsInTheme.map(a => String(a.payload?.topic_code || a.shell_code?.split('-')[2] || ''));
              let topicCodes = Array.from(new Set(rawTopicCodes.filter(Boolean)));
              if (topicCodes.length === 0) {
                topicCodes = taskAsmsInTheme.map((a, idx) => `${tc}${idx + 1}`);
              }
              topicCodes.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

              // 1. In Overview Mode: render single summary TASK column; in Detail Mode: render 7x7 attempt rate columns per topic
              if (isOverviewMode) {
                dynamicAsmCols.push({
                  key: `theme_${tc}_task`,
                  className: `col-asm col-task col-theme-task col-theme-task-${tc.toLowerCase()}`,
                  width: '58px',
                  minWidth: '48px',
                  headerTitle: `Theme ${tc} Task Progress Percentage (0-100%)`,
                  title: `Theme ${tc} Tasks %`,
                  label: 'TASK %',
                  shortLabel: 'TASK %',
                  microLabel: 'TASK %',
                  sortable: true,
                  align: 'center',
                  render: (val, row) => {
                    const isManualMode = Boolean(window._classManualScoreEditMode);
                    const earned = row[`theme_${tc}_task_progress`] || 0;
                    const maxT = row[`theme_${tc}_task_max`] || 0;
                    const isComplete = Boolean(row[`theme_${tc}_task_completed`]);
                    const pct = maxT > 0 ? Math.min(100, Math.round((earned / maxT) * 100)) : 0;

                    if (isManualMode && maxT > 0) {
                      const taskKey = `task_${tc}`;
                      const currentDraft = window._manualInputState?.drafts?.[row.id]?.[taskKey];
                      const displayVal = currentDraft?.earned != null ? currentDraft.earned : earned;
                      return `
                        <div style="display:flex; align-items:center; justify-content:center; padding:1px 0; width:100%; height:100%;">
                          <input type="number" min="0" max="${maxT}" step="1"
                                 class="input-matrix-task-progress input-matrix-task-progress-${row.id}-${tc.toLowerCase()}"
                                 data-student-id="${row.id}"
                                 data-theme-code="${tc}"
                                 data-max-tasks="${maxT}"
                                 data-original-earned="${earned}"
                                 value="${displayVal}"
                                 placeholder="${maxT}"
                                 oninput="window.onMatrixTaskChange('${row.id}', '${tc}', ${maxT}, this.value)"
                                 onkeydown="if(event.key==='Enter'){this.blur();}"
                                 onclick="event.stopPropagation();"
                                 style="width:100%; height:100%; background:transparent; border:none; outline:none; color:#38bdf8; font-weight:700; font-size:12px; text-align:center; border-radius:0; padding:0 2px;">
                        </div>
                      `;
                    }

                    if (maxT === 0) return '<span class="asm-dot" style="font-size:12px; font-weight:700;" title="No tasks required">&middot;</span>';
                    const color = typeof getGradeColorByScore === 'function' ? getGradeColorByScore(pct) : (isComplete ? 'var(--grade-a)' : (pct >= 60 ? 'var(--grade-c)' : (pct > 0 ? 'var(--grade-d)' : '#64748b')));
                    return `
                      <div class="asm-cell-task-wrap" style="display:flex; align-items:center; justify-content:center; cursor:pointer;"
                           ondblclick="event.stopPropagation(); if(typeof window.toggleAttendanceManualEditMode==='function') window.toggleAttendanceManualEditMode(true);"
                           title="Theme ${tc} Tasks: ${pct}% (${earned}/${maxT} reps)${isComplete ? ' — Completed' : ''} - Double click to edit">
                        <span class="asm-rep-badge ${isComplete ? 'rep-complete' : ''}" style="font-size:12px; font-weight:700; color:${color}; font-variant-numeric:tabular-nums;">
                          ${pct}%
                        </span>
                      </div>
                    `;
                  }
                });
              } else if (isTopicOverview) {
                // Mode 2: General Theme Overview (1 summary column per topic in active theme)
                topicCodes.forEach((topCode, topIdx) => {
                  const matchingTasks = taskAsmsInTheme.filter(a =>
                    String(a.payload?.topic_code || '').toUpperCase() === topCode.toUpperCase() ||
                    (a.shell_code && a.shell_code.includes(topCode))
                  );
                  const topName = topicNames[topCode.toUpperCase()] || topicNames[topCode] || '';
                  const hasPhrases = checkTopicHasPhrases(matchingTasks);
                  const maxTopicReps = hasPhrases ? (compTargetReps * 2) : compTargetReps;
                  const isEndCol = topIdx === topicCodes.length - 1;

                  dynamicAsmCols.push({
                    key: `theme_${tc}_topic_${topCode}_summary`,
                    className: `col-asm col-task col-theme-topic-summary col-theme-topic-${tc.toLowerCase()}${isEndCol ? ' col-theme-topic-att-end' : ''}`,
                    width: '65px',
                    minWidth: '55px',
                    headerTitle: `Topic ${topCode}: ${topName} (Click to inspect detailed attempts)`,
                    title: topCode,
                    label: topCode,
                    shortLabel: topCode,
                    microLabel: topCode,
                    sortable: true,
                    align: 'center',
                    render: (val, row) => {
                      const isManualMode = Boolean(window._classManualScoreEditMode);
                      let earned = 0;
                      if (hasPhrases) {
                        earned = (row[`theme_${tc}_topic_${topCode}_words_reps`] || 0) + (row[`theme_${tc}_topic_${topCode}_phrases_reps`] || 0);
                      } else {
                        earned = row[`theme_${tc}_topic_${topCode}_reps`] || 0;
                      }

                      if (isManualMode && maxTopicReps > 0) {
                        const taskKey = `task_${tc}_${topCode}`;
                        const currentDraft = window._manualInputState?.drafts?.[row.id]?.[taskKey];
                        const displayVal = currentDraft?.reps != null ? currentDraft.reps : earned;
                        return `
                          <div style="display:flex; align-items:center; justify-content:center; padding:1px 0; width:100%; height:100%;">
                            <input type="number" min="0" max="${maxTopicReps}" step="1"
                                   class="input-matrix-topic-reps input-matrix-topic-reps-${row.id}-${tc.toLowerCase()}-${topCode.toLowerCase()}"
                                   data-student-id="${row.id}"
                                   data-theme-code="${tc}"
                                   data-topic-code="${topCode}"
                                   data-target-reps="${maxTopicReps}"
                                   data-original-reps="${earned}"
                                   value="${displayVal}"
                                   placeholder="${maxTopicReps}"
                                   oninput="window.onMatrixTopicTaskChange('${row.id}', '${tc}', '${topCode}', ${maxTopicReps}, this.value)"
                                   onkeydown="if(event.key==='Enter'){this.blur();}"
                                   onclick="event.stopPropagation();"
                                   style="width:100%; height:100%; background:transparent; border:none; outline:none; color:#38bdf8; font-weight:700; font-size:12px; text-align:center; border-radius:0; padding:0 2px;">
                          </div>
                        `;
                      }

                      const isComplete = earned >= maxTopicReps && maxTopicReps > 0;
                      const color = isComplete ? 'var(--grade-a)' : (earned > 0 ? '#38bdf8' : '#64748b');
                      return `
                        <div class="asm-cell-task-wrap" style="display:flex; align-items:center; justify-content:center; cursor:pointer;"
                             onclick="event.stopPropagation(); window.switchClassAttendanceTopic('${topCode}');"
                             ondblclick="event.stopPropagation(); if(typeof window.toggleAttendanceManualEditMode==='function') window.toggleAttendanceManualEditMode(true);"
                             title="Topic ${topCode} (${topName}): ${earned}/${maxTopicReps} reps completed - Click to inspect detailed attempts">
                          <span class="asm-rep-badge ${isComplete ? 'rep-complete' : ''}" style="font-size:12px; font-weight:700; color:${color}; font-variant-numeric:tabular-nums;">
                            ${earned}/${maxTopicReps}
                          </span>
                        </div>
                      `;
                    }
                  });
                });
              } else if (topicCodes.length > 0) {
                // Mode 3: Detailed Progress for Single Selected Topic
                const targetTopCode = selectedTopic.toUpperCase();
                const topicCodesToRender = topicCodes.includes(targetTopCode) ? [targetTopCode] : [topicCodes[0]];

                // Topic Repetitions Helper to partition Words vs Phrases accurately
                const getTopicAttemptsForComp = (studentAttsList, mTasks, compType) => {
                  const comp = compType === 'phrases' ? 'phrases' : 'words';
                  const explicitPhrasesTask = mTasks.find(a => a.payload?.category === 'phrases' || /PHRASE/i.test(a.shell_code || a.title || ''));
                  const explicitWordsTask = mTasks.find(a => !(a.payload?.category === 'phrases' || /PHRASE/i.test(a.shell_code || a.title || '')));

                  if (comp === 'phrases' && explicitPhrasesTask && explicitWordsTask && explicitPhrasesTask.id !== explicitWordsTask.id) {
                    const atts = (studentAttsList || []).filter(a =>
                      (a.test_id || a.Test_id) === explicitPhrasesTask.id &&
                      ['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(String(a.status || '').toLowerCase())
                    );
                    atts.sort((x, y) => new Date(x.created_at || x.submitted_at || 0) - new Date(y.created_at || y.submitted_at || 0));
                    return { task: explicitPhrasesTask, taskId: explicitPhrasesTask.id, attempts: atts };
                  }

                  if (comp === 'words' && explicitPhrasesTask && explicitWordsTask && explicitPhrasesTask.id !== explicitWordsTask.id) {
                    const atts = (studentAttsList || []).filter(a =>
                      (a.test_id || a.Test_id) === explicitWordsTask.id &&
                      ['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(String(a.status || '').toLowerCase())
                    );
                    atts.sort((x, y) => new Date(x.created_at || x.submitted_at || 0) - new Date(y.created_at || y.submitted_at || 0));
                    return { task: explicitWordsTask, taskId: explicitWordsTask.id, attempts: atts };
                  }

                  // Unified or single task fallback:
                  const task = explicitWordsTask || mTasks[0];
                  const taskId = task?.id || '';
                  const atts = (studentAttsList || []).filter(a => {
                    if ((a.test_id || a.Test_id) !== taskId) return false;
                    const st = String(a.status || '').toLowerCase();
                    if (!['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(st)) return false;
                    const sec = typeof getAttemptSection === 'function' ? getAttemptSection(a) : 'words';
                    return comp === 'phrases' ? sec === 'phrases' : sec !== 'phrases';
                  });
                  atts.sort((x, y) => new Date(x.created_at || x.submitted_at || 0) - new Date(y.created_at || y.submitted_at || 0));
                  return { task, taskId, attempts: atts };
                };

                topicCodesToRender.forEach((topCode, topIdx) => {
                  const matchingTasks = taskAsmsInTheme.filter(a =>
                    String(a.payload?.topic_code || '').toUpperCase() === topCode.toUpperCase() ||
                    (a.shell_code && a.shell_code.includes(topCode))
                  );
                  const phrasesTask = matchingTasks.find(a => a.payload?.category === 'phrases' || /PHRASE/i.test(a.shell_code || a.title || ''));
                  const hasPhrasesInTopic = checkTopicHasPhrases(matchingTasks);

                  // Dynamic columns for Words: W1..W{compTargetReps}
                  for (let rep = 1; rep <= compTargetReps; rep++) {
                    const repIdx = rep - 1;
                    const isEndCol = !hasPhrasesInTopic && rep === compTargetReps;
                    dynamicAsmCols.push({
                      key: `theme_${tc}_topic_${topCode}_words_att_${repIdx}`,
                      className: `col-asm col-task col-theme-topic-att col-theme-topic-att-${tc.toLowerCase()} col-rep-${rep} col-comp-words${isEndCol ? ' col-theme-topic-att-end' : ''}`,
                      headerTitle: `Topic ${topCode} Words - Attempt ${rep} (Rate %)`,
                      title: `W${rep}`,
                      label: `W${rep}`,
                      shortLabel: `W${rep}`,
                      microLabel: `W${rep}`,
                      sortable: true,
                      align: 'center',
                      render: (val, row) => {
                        const isManualMode = Boolean(window._classManualScoreEditMode);
                        const { task, taskId, attempts } = getTopicAttemptsForComp(row.allAttempts, matchingTasks, 'words');
                        const att = attempts[repIdx];
                        const totalQ = Number(att?.total_questions || getAsmExpectedMax(task) || 10);
                        const rawScore = att ? Number(att.score ?? 0) : null;
                        const origPct = att != null
                          ? Math.round(Number(att.percentage ?? (totalQ > 0 ? (rawScore / totalQ) * 100 : 0)))
                          : (repIdx < (row[`theme_${tc}_topic_${topCode}_words_reps`] || 0) ? 70 : null);

                        const draftKey = `rep_${taskId}_words_${repIdx}`;
                        const currentDraft = window._manualInputState?.drafts?.[row.id]?.[draftKey];
                        const displayPct = currentDraft?.pct != null ? currentDraft.pct : origPct;

                        if (isManualMode) {
                          const displayVal = displayPct != null ? displayPct : '';
                          return `
                            <div style="display:flex; align-items:center; justify-content:center; padding:1px 0; width:100%; height:100%;">
                              <input type="number" min="0" max="100"
                                     class="input-matrix-rep-rate input-matrix-rep-rate-${row.id}-${tc.toLowerCase()}-${topCode.toLowerCase()}-words-${repIdx}"
                                     data-student-id="${row.id}"
                                     data-theme-code="${tc}"
                                     data-topic-code="${topCode}"
                                     data-component="words"
                                     data-rep-idx="${repIdx}"
                                     data-task-id="${taskId}"
                                     data-attempt-id="${att?.id || ''}"
                                     data-total-q="${totalQ}"
                                     data-original-pct="${origPct != null ? origPct : ''}"
                                     value="${displayVal}"
                                     placeholder="%"
                                     oninput="window.onMatrixRepRateChange('${row.id}', '${tc}', '${topCode}', 'words', ${repIdx}, '${taskId}', '${att?.id || ''}', ${totalQ}, this.value)"
                                     onkeydown="if(event.key==='Enter'){this.blur();}"
                                     onclick="event.stopPropagation();"
                                     style="width:100%; height:100%; background:transparent; border:none; outline:none; color:#38bdf8; font-weight:700; font-size:12px; text-align:center; border-radius:0; padding:0 2px;">
                            </div>
                          `;
                        }

                        if (att) {
                          const pct = origPct;
                          const rateColor = typeof getGradeColorByScore === 'function' ? getGradeColorByScore(pct) : '#ffffff';
                          const gradeSym = String(att.grade || (typeof calculateGrade === 'function' ? calculateGrade(pct) : 'C')).trim();

                          return `
                            <div class="asm-cell-rep-rate" style="display:flex; align-items:center; justify-content:center; cursor:pointer;"
                                 onclick="event.stopPropagation(); if(typeof window.showStudentTopicAttemptsModal==='function') window.showStudentTopicAttemptsModal('${row.id}', '${escapeHtml(row.displayName)}', '${tc}', '${topCode}', 'words', '${taskId}');"
                                 ondblclick="event.stopPropagation(); if(typeof window.toggleAttendanceManualEditMode==='function') window.toggleAttendanceManualEditMode(true);"
                                 title="Topic ${topCode} Words Attempt #${rep}: ${rawScore}/${totalQ} (${pct}% Grade ${gradeSym}) - Click to inspect all attempts, double-click to edit">
                              <span style="font-size:12px; font-weight:700; color:${rateColor}; font-variant-numeric:tabular-nums;">
                                ${pct}%
                              </span>
                            </div>
                          `;
                        }

                        // Waived / Manual pass fallback: if reps passed, render passing rate (70%)
                        const wordsRepsPassed = row[`theme_${tc}_topic_${topCode}_words_reps`] || 0;
                        if (repIdx < wordsRepsPassed) {
                          const rateColor = 'var(--grade-c)';
                          return `
                            <div class="asm-cell-rep-rate" style="display:flex; align-items:center; justify-content:center; cursor:pointer;"
                                 onclick="event.stopPropagation(); if(typeof window.showStudentTopicAttemptsModal==='function') window.showStudentTopicAttemptsModal('${row.id}', '${escapeHtml(row.displayName)}', '${tc}', '${topCode}', 'words', '${taskId}');"
                                 ondblclick="event.stopPropagation(); if(typeof window.toggleAttendanceManualEditMode==='function') window.toggleAttendanceManualEditMode(true);"
                                 title="Topic ${topCode} Words Repetition #${rep}: Passed (Waived/Approved) - Double-click to edit">
                              <span style="font-size:12px; font-weight:700; color:${rateColor}; font-variant-numeric:tabular-nums;">
                                70%
                              </span>
                            </div>
                          `;
                        }

                        return `
                          <div class="asm-cell-rep-rate" style="display:flex; align-items:center; justify-content:center; cursor:pointer;"
                               onclick="event.stopPropagation(); if(typeof window.showStudentTopicAttemptsModal==='function') window.showStudentTopicAttemptsModal('${row.id}', '${escapeHtml(row.displayName)}', '${tc}', '${topCode}', 'words', '${taskId}');"
                               ondblclick="event.stopPropagation(); if(typeof window.toggleAttendanceManualEditMode==='function') window.toggleAttendanceManualEditMode(true);"
                               title="Topic ${topCode} Words Attempt #${rep}: Not attempted yet - Double-click to edit">
                            <span style="font-size:12px; font-weight:600; color:#64748b;">—</span>
                          </div>
                        `;
                      }
                    });
                  }

                  // Dynamic columns for Phrases: P1..P{compTargetReps} (Rendered whenever topic contains phrases)
                  if (hasPhrasesInTopic) {
                    for (let rep = 1; rep <= compTargetReps; rep++) {
                      const repIdx = rep - 1;
                      const isEndCol = rep === compTargetReps;
                      dynamicAsmCols.push({
                        key: `theme_${tc}_topic_${topCode}_phrases_att_${repIdx}`,
                        className: `col-asm col-task col-theme-topic-att col-theme-topic-att-${tc.toLowerCase()} col-rep-${rep} col-comp-phrases${isEndCol ? ' col-theme-topic-att-end' : ''}`,
                        headerTitle: `Topic ${topCode} Phrases - Attempt ${rep} (Rate %)`,
                        title: `P${rep}`,
                        label: `P${rep}`,
                        shortLabel: `P${rep}`,
                        microLabel: `P${rep}`,
                        sortable: true,
                        align: 'center',
                        render: (val, row) => {
                          const isManualMode = Boolean(window._classManualScoreEditMode);
                          const { task, taskId, attempts } = getTopicAttemptsForComp(row.allAttempts, matchingTasks, 'phrases');
                          const att = attempts[repIdx];
                          const totalQ = Number(att?.total_questions || getAsmExpectedMax(task) || 10);
                          const rawScore = att ? Number(att.score ?? 0) : null;
                          const origPct = att != null
                            ? Math.round(Number(att.percentage ?? (totalQ > 0 ? (rawScore / totalQ) * 100 : 0)))
                            : (repIdx < (row[`theme_${tc}_topic_${topCode}_phrases_reps`] || 0) ? 70 : null);

                          const draftKey = `rep_${taskId}_phrases_${repIdx}`;
                          const currentDraft = window._manualInputState?.drafts?.[row.id]?.[draftKey];
                          const displayPct = currentDraft?.pct != null ? currentDraft.pct : origPct;

                          if (isManualMode) {
                            const displayVal = displayPct != null ? displayPct : '';
                            return `
                              <div style="display:flex; align-items:center; justify-content:center; padding:1px 0; width:100%; height:100%;">
                                <input type="number" min="0" max="100"
                                       class="input-matrix-rep-rate input-matrix-rep-rate-${row.id}-${tc.toLowerCase()}-${topCode.toLowerCase()}-phrases-${repIdx}"
                                       data-student-id="${row.id}"
                                       data-theme-code="${tc}"
                                       data-topic-code="${topCode}"
                                       data-component="phrases"
                                       data-rep-idx="${repIdx}"
                                       data-task-id="${taskId}"
                                       data-attempt-id="${att?.id || ''}"
                                       data-total-q="${totalQ}"
                                       data-original-pct="${origPct != null ? origPct : ''}"
                                       value="${displayVal}"
                                       placeholder="%"
                                       oninput="window.onMatrixRepRateChange('${row.id}', '${tc}', '${topCode}', 'phrases', ${repIdx}, '${taskId}', '${att?.id || ''}', ${totalQ}, this.value)"
                                       onkeydown="if(event.key==='Enter'){this.blur();}"
                                       onclick="event.stopPropagation();"
                                       style="width:100%; height:100%; background:transparent; border:none; outline:none; color:var(--quad-d, #a855f7); font-weight:700; font-size:12px; text-align:center; border-radius:0; padding:0 2px;">
                              </div>
                            `;
                          }

                          if (att) {
                            const pct = origPct;
                            const rateColor = typeof getGradeColorByScore === 'function' ? getGradeColorByScore(pct) : '#ffffff';
                            const gradeSym = String(att.grade || (typeof calculateGrade === 'function' ? calculateGrade(pct) : 'C')).trim();

                            return `
                              <div class="asm-cell-rep-rate" style="display:flex; align-items:center; justify-content:center; cursor:pointer;"
                                   onclick="event.stopPropagation(); if(typeof window.showStudentTopicAttemptsModal==='function') window.showStudentTopicAttemptsModal('${row.id}', '${escapeHtml(row.displayName)}', '${tc}', '${topCode}', 'phrases', '${taskId}');"
                                   ondblclick="event.stopPropagation(); if(typeof window.toggleAttendanceManualEditMode==='function') window.toggleAttendanceManualEditMode(true);"
                                   title="Topic ${topCode} Phrases Attempt #${rep}: ${rawScore}/${totalQ} (${pct}% Grade ${gradeSym}) - Click to inspect all attempts, double-click to edit">
                                <span style="font-size:12px; font-weight:700; color:${rateColor}; font-variant-numeric:tabular-nums;">
                                  ${pct}%
                                </span>
                              </div>
                            `;
                          }

                          // Waived / Manual pass fallback: if reps passed, render passing rate (70%)
                          const phrasesRepsPassed = row[`theme_${tc}_topic_${topCode}_phrases_reps`] || 0;
                          if (repIdx < phrasesRepsPassed) {
                            const rateColor = 'var(--grade-c)';
                            return `
                              <div class="asm-cell-rep-rate" style="display:flex; align-items:center; justify-content:center; cursor:pointer;"
                                   onclick="event.stopPropagation(); if(typeof window.showStudentTopicAttemptsModal==='function') window.showStudentTopicAttemptsModal('${row.id}', '${escapeHtml(row.displayName)}', '${tc}', '${topCode}', 'phrases', '${taskId}');"
                                   ondblclick="event.stopPropagation(); if(typeof window.toggleAttendanceManualEditMode==='function') window.toggleAttendanceManualEditMode(true);"
                                   title="Topic ${topCode} Phrases Repetition #${rep}: Passed (Waived/Approved) - Double-click to edit">
                                <span style="font-size:12px; font-weight:700; color:${rateColor}; font-variant-numeric:tabular-nums;">
                                  70%
                                </span>
                              </div>
                            `;
                          }

                          return `
                            <div class="asm-cell-rep-rate" style="display:flex; align-items:center; justify-content:center; cursor:pointer;"
                                 onclick="event.stopPropagation(); if(typeof window.showStudentTopicAttemptsModal==='function') window.showStudentTopicAttemptsModal('${row.id}', '${escapeHtml(row.displayName)}', '${tc}', '${topCode}', 'phrases', '${taskId}');"
                                 ondblclick="event.stopPropagation(); if(typeof window.toggleAttendanceManualEditMode==='function') window.toggleAttendanceManualEditMode(true);"
                                 title="Topic ${topCode} Phrases Attempt #${rep}: Not attempted yet - Double-click to edit">
                              <span style="font-size:12px; font-weight:600; color:#64748b;">—</span>
                            </div>
                          `;
                        }
                      });
                    }
                  }
                });
              }

              const hasExamPhrases = isVocab && !isLevel2Vocab && (examAsms.some(e => e.payload?.is_unified || e.payload?.category === 'phrases' || /PHRASE/i.test(e.shell_code || e.title || '')) || checkThemeHasPhrases(taskAsmsInTheme));
              const wordsExam = examAsms.find(e => e.payload?.category === 'words' || /WORDS/i.test(e.shell_code || e.title || '')) ||
                                examAsms.find(e => e.payload?.is_unified || /EXAM/i.test(e.shell_code || '')) ||
                                examAsm;
              const phrasesExam = examAsms.find(e => e.payload?.category === 'phrases' || /PHRASE/i.test(e.shell_code || e.title || '')) ||
                                  examAsms.find(e => e.payload?.is_unified || /EXAM/i.test(e.shell_code || '')) ||
                                  examAsm;
              const isUnifiedExam = Boolean(wordsExam && phrasesExam && wordsExam.id === phrasesExam.id);
              const wordsTotalQ = (isVocab && !isLevel2Vocab) ? 160 : (isUnifiedExam ? 160 : (Number(wordsExam?.payload?.total_questions || wordsExam?.total_questions || 160) || 160));
              const phrasesTotalQ = (isVocab && !isLevel2Vocab) ? 40 : (isUnifiedExam ? 40 : (Number(phrasesExam?.payload?.total_questions || phrasesExam?.total_questions || 40) || 40));

              if (hasExamPhrases) {
                // 1. WRD RATE (Words Exam Rate %)
                dynamicAsmCols.push({
                  key: `theme_${tc}_words_rate`,
                  className: `col-asm col-exam col-exam-wrd-rate col-test-theme-score col-test-theme-score-${tc.toLowerCase()}`,
                  width: '48px',
                  minWidth: '40px',
                  headerTitle: `Theme ${tc} Words Rate %`,
                  title: `Words Rate`,
                  label: 'WRD RATE',
                  shortLabel: 'WRD %',
                  microLabel: 'WRD %',
                  sortable: true,
                  align: 'center',
                  render: (val, row) => {
                    const isManualMode = Boolean(window._classManualScoreEditMode);
                    const wRate = row[`theme_${tc}_words_rate`];
                    const isTaskCompleted = Boolean(row[`theme_${tc}_task_completed`]);
                    const earnedTasks = row[`theme_${tc}_task_progress`] || 0;
                    const maxTasks = row[`theme_${tc}_task_max`] || 0;

                    if (isManualMode && wordsExam) {
                      const draftKey = `exam_${wordsExam.id}_words`;
                      const currentDraft = window._manualInputState?.drafts?.[row.id]?.[draftKey];
                      const displayScore = currentDraft?.score != null ? currentDraft.score : (wRate != null && wRate >= 0 ? wRate : '');
                      return `
                        <div style="display:flex; align-items:center; justify-content:center; padding:1px 0; width:100%; height:100%;">
                          <input type="number" min="0" max="100" class="input-matrix-words-rate input-matrix-words-rate-${row.id}-${tc.toLowerCase()}"
                                 data-student-id="${row.id}"
                                 data-test-id="${wordsExam.id}"
                                 data-section="words"
                                 data-total-q="${wordsTotalQ}"
                                 data-original-score="${wRate != null && wRate >= 0 ? wRate : ''}"
                                 value="${displayScore}"
                                 placeholder="%"
                                 oninput="window.onMatrixSectionExamChange('${row.id}', '${wordsExam.id}', 'words', ${wordsTotalQ}, this.value, false, ${phrasesTotalQ}, '${tc}')"
                                 onkeydown="if(event.key==='Enter'){this.blur();}"
                                 onclick="event.stopPropagation();"
                                 style="width:100%; height:100%; background:transparent; border:none; outline:none; color:var(--grade-b, #95ff00); font-weight:700; font-size:12px; text-align:center; border-radius:0; padding:0 2px;">
                        </div>
                      `;
                    }

                    if (wRate != null && wRate >= 0) {
                      const color = typeof getGradeColorByScore === 'function' ? getGradeColorByScore(wRate) : '#ffffff';
                      return `
                        <span class="asm-score asm-score-test test-score-theme-wrd-rate"
                              style="color:${color}; font-weight:700; font-size:12px; font-variant-numeric:tabular-nums;"
                              title="Theme ${tc} Words Rate: ${wRate}%">
                          ${wRate}%
                        </span>
                      `;
                    }
                    if (!isTaskCompleted) {
                      return `
                        <div style="display:flex; align-items:center; justify-content:center;" title="Tasks Incomplete (${earnedTasks}/${maxTasks}). Complete all tasks to unlock exam.">
                          <span style="color:var(--grade-e); display:inline-flex; align-items:center;">${getSvgIcon('lock', 12)}</span>
                        </div>
                      `;
                    }
                    return `<span style="font-size:12px; font-weight:600; color:#64748b;">—</span>`;
                  }
                });

                // 2. WRD PTS (Words Points)
                dynamicAsmCols.push({
                  key: `theme_${tc}_words_pts`,
                  className: `col-asm col-exam col-exam-wrd-pts col-test-theme-total col-test-theme-total-${tc.toLowerCase()}`,
                  width: '44px',
                  minWidth: '36px',
                  headerTitle: `Theme ${tc} Words Points`,
                  title: `Words Points`,
                  label: 'WRD PTS',
                  shortLabel: 'W-PTS',
                  microLabel: 'W-PTS',
                  sortable: true,
                  align: 'center',
                  render: (val, row) => {
                    const isManualMode = Boolean(window._classManualScoreEditMode);
                    const wPts = row[`theme_${tc}_words_pts`];
                    const wRate = row[`theme_${tc}_words_rate`] || 0;

                    if (isManualMode && wordsExam) {
                      const draftKey = `exam_${wordsExam.id}_words`;
                      const currentDraft = window._manualInputState?.drafts?.[row.id]?.[draftKey];
                      const cleanPts = wPts != null && wPts >= 0 ? Math.round(Number(wPts)) : '';
                      const displayPts = currentDraft?.pts != null ? Math.round(Number(currentDraft.pts)) : cleanPts;
                      return `
                        <div style="display:flex; align-items:center; justify-content:center; padding:1px 0; width:100%; height:100%;">
                          <input type="number" min="0" max="${wordsTotalQ}" class="input-matrix-words-pts input-matrix-words-pts-${row.id}-${tc.toLowerCase()}"
                                 data-student-id="${row.id}"
                                 data-test-id="${wordsExam.id}"
                                 data-section="words"
                                 data-total-q="${wordsTotalQ}"
                                 data-original-pts="${cleanPts}"
                                 value="${displayPts}"
                                 placeholder="${wordsTotalQ}"
                                 oninput="window.onMatrixSectionExamChange('${row.id}', '${wordsExam.id}', 'words', ${wordsTotalQ}, this.value, true, ${phrasesTotalQ}, '${tc}')"
                                 onkeydown="if(event.key==='Enter'){this.blur();}"
                                 onclick="event.stopPropagation();"
                                 style="width:100%; height:100%; background:transparent; border:none; outline:none; color:#ffffff; font-weight:700; font-size:12px; text-align:center; border-radius:0; padding:0 2px;">
                        </div>
                      `;
                    }

                    if (wPts != null && wPts >= 0) {
                      const color = typeof getGradeColorByScore === 'function' ? getGradeColorByScore(wRate) : '#ffffff';
                      return `
                        <span class="asm-score asm-score-test test-score-theme-wrd-pts"
                              style="color:${color}; font-weight:700; font-size:12px; font-variant-numeric:tabular-nums;"
                              title="Theme ${tc} Words Points: ${wPts}">
                          ${wPts}
                        </span>
                      `;
                    }
                    return `<span style="font-size:12px; font-weight:600; color:#64748b;">—</span>`;
                  }
                });

                // 3. PHR RATE (Phrase Exam Rate %)
                dynamicAsmCols.push({
                  key: `theme_${tc}_phrases_rate`,
                  className: `col-asm col-exam col-exam-phr-rate col-test-theme-score col-test-theme-score-${tc.toLowerCase()}`,
                  width: '48px',
                  minWidth: '40px',
                  headerTitle: `Theme ${tc} Phrase Rate %`,
                  title: `Phrase Rate`,
                  label: 'PHR RATE',
                  shortLabel: 'PHR %',
                  microLabel: 'PHR %',
                  sortable: true,
                  align: 'center',
                  render: (val, row) => {
                    const isManualMode = Boolean(window._classManualScoreEditMode);
                    const pRate = row[`theme_${tc}_phrases_rate`];
                    const wRate = row[`theme_${tc}_words_rate`];

                    if (isManualMode && phrasesExam) {
                      const draftKey = `exam_${phrasesExam.id}_phrases`;
                      const currentDraft = window._manualInputState?.drafts?.[row.id]?.[draftKey];
                      const displayScore = currentDraft?.score != null ? currentDraft.score : (pRate != null && pRate >= 0 ? pRate : '');
                      return `
                        <div style="display:flex; align-items:center; justify-content:center; padding:1px 0; width:100%; height:100%;">
                          <input type="number" min="0" max="100" class="input-matrix-phrases-rate input-matrix-phrases-rate-${row.id}-${tc.toLowerCase()}"
                                 data-student-id="${row.id}"
                                 data-test-id="${phrasesExam.id}"
                                 data-section="phrases"
                                 data-total-q="${phrasesTotalQ}"
                                 data-original-score="${pRate != null && pRate >= 0 ? pRate : ''}"
                                 value="${displayScore}"
                                 placeholder="%"
                                 oninput="window.onMatrixSectionExamChange('${row.id}', '${phrasesExam.id}', 'phrases', ${phrasesTotalQ}, this.value, false, ${wordsTotalQ}, '${tc}')"
                                 onkeydown="if(event.key==='Enter'){this.blur();}"
                                 onclick="event.stopPropagation();"
                                 style="width:100%; height:100%; background:transparent; border:none; outline:none; color:var(--grade-d, #FF8C00); font-weight:700; font-size:12px; text-align:center; border-radius:0; padding:0 2px;">
                        </div>
                      `;
                    }

                    if (pRate != null && pRate >= 0) {
                      const color = typeof getGradeColorByScore === 'function' ? getGradeColorByScore(pRate) : '#ffffff';
                      return `
                        <span class="asm-score asm-score-test test-score-theme-phr-rate"
                              style="color:${color}; font-weight:700; font-size:12px; font-variant-numeric:tabular-nums;"
                              title="Theme ${tc} Phrase Rate: ${pRate}%">
                          ${pRate}%
                        </span>
                      `;
                    }
                    if (wRate != null && wRate >= 0) {
                      return `<span class="badge-rem-tag" style="display:inline-block; font-size:12px; font-weight:800; color:var(--grade-d); background:rgba(255,140,0,0.15); border:1px solid rgba(255,140,0,0.3); border-radius:3px; padding:1px 3px;" title="Phrases not completed or cut-off (Needs Remedial)">REM</span>`;
                    }
                    return `<span style="font-size:12px; font-weight:600; color:#64748b;">—</span>`;
                  }
                });

                // 4. PHR PTS (Phrase Points)
                dynamicAsmCols.push({
                  key: `theme_${tc}_phrases_pts`,
                  className: `col-asm col-exam col-exam-phr-pts col-test-theme-total col-test-theme-total-${tc.toLowerCase()}`,
                  width: '44px',
                  minWidth: '36px',
                  headerTitle: `Theme ${tc} Phrase Points`,
                  title: `Phrase Points`,
                  label: 'PHR PTS',
                  shortLabel: 'P-PTS',
                  microLabel: 'P-PTS',
                  sortable: true,
                  align: 'center',
                  render: (val, row) => {
                    const isManualMode = Boolean(window._classManualScoreEditMode);
                    const pPts = row[`theme_${tc}_phrases_pts`];
                    const pRate = row[`theme_${tc}_phrases_rate`] || 0;

                    if (isManualMode && phrasesExam) {
                      const draftKey = `exam_${phrasesExam.id}_phrases`;
                      const currentDraft = window._manualInputState?.drafts?.[row.id]?.[draftKey];
                      const cleanPts = pPts != null && pPts >= 0 ? Math.round(Number(pPts)) : '';
                      const displayPts = currentDraft?.pts != null ? Math.round(Number(currentDraft.pts)) : cleanPts;
                      return `
                        <div style="display:flex; align-items:center; justify-content:center; padding:1px 0; width:100%; height:100%;">
                          <input type="number" min="0" max="${phrasesTotalQ}" class="input-matrix-phrases-pts input-matrix-phrases-pts-${row.id}-${tc.toLowerCase()}"
                                 data-student-id="${row.id}"
                                 data-test-id="${phrasesExam.id}"
                                 data-section="phrases"
                                 data-total-q="${phrasesTotalQ}"
                                 data-original-pts="${cleanPts}"
                                 value="${displayPts}"
                                 placeholder="${phrasesTotalQ}"
                                 oninput="window.onMatrixSectionExamChange('${row.id}', '${phrasesExam.id}', 'phrases', ${phrasesTotalQ}, this.value, true, ${wordsTotalQ}, '${tc}')"
                                 onkeydown="if(event.key==='Enter'){this.blur();}"
                                 onclick="event.stopPropagation();"
                                 style="width:100%; height:100%; background:transparent; border:none; outline:none; color:#ffffff; font-weight:700; font-size:12px; text-align:center; border-radius:0; padding:0 2px;">
                        </div>
                      `;
                    }

                    if (pPts != null && pPts >= 0) {
                      const color = typeof getGradeColorByScore === 'function' ? getGradeColorByScore(pRate) : '#ffffff';
                      return `
                        <span class="asm-score asm-score-test test-score-theme-phr-pts"
                              style="color:${color}; font-weight:700; font-size:12px; font-variant-numeric:tabular-nums;"
                              title="Theme ${tc} Phrase Points: ${pPts}">
                          ${pPts}
                        </span>
                      `;
                    }
                    return `<span style="font-size:12px; font-weight:600; color:#64748b;">—</span>`;
                  }
                });

                // 5. ACC PTS (Accumulative Points)
                dynamicAsmCols.push({
                  key: `theme_${tc}_total_pts`,
                  className: `col-asm col-exam col-exam-pts col-test-theme-total col-test-theme-total-${tc.toLowerCase()}`,
                  width: '46px',
                  minWidth: '38px',
                  headerTitle: `Theme ${tc} Accumulative Exam Points`,
                  title: `Accumulative Points`,
                  label: 'ACC PTS',
                  shortLabel: 'ACC',
                  microLabel: 'ACC',
                  sortable: true,
                  align: 'center',
                  render: (val, row) => {
                    const ptsVal = row[`theme_${tc}_total_pts`];
                    const hasExamAttempt = Boolean(row[`theme_${tc}_has_exam_att`]);
                    if (hasExamAttempt && ptsVal != null && ptsVal >= 0) {
                      const cleanTotal = Math.round(Number(ptsVal || 0));
                      const themePct = row[`theme_${tc}_score`] != null && row[`theme_${tc}_score`] >= 0 ? row[`theme_${tc}_score`] : 0;
                      const color = typeof getGradeColorByScore === 'function' ? getGradeColorByScore(themePct) : '#ffffff';
                      return `
                        <span class="asm-score asm-score-test test-score-theme-total test-score-theme-total-${row.id}-${tc.toLowerCase()}"
                              style="color:${color}; font-weight:800; font-size:12px; font-variant-numeric:tabular-nums;"
                              title="Theme ${tc} Accumulative Points: ${cleanTotal}">
                          ${cleanTotal}
                        </span>
                      `;
                    }
                    return `<span class="asm-score asm-score-test test-score-theme-total test-score-theme-total-${row.id}-${tc.toLowerCase()}" style="font-size:12px; font-weight:600; color:#64748b;">—</span>`;
                  }
                });

                // 6. GRADE (Theme Grade Column)
                dynamicAsmCols.push({
                  key: `theme_${tc}_grade`,
                  className: `col-asm col-exam col-exam-grade col-test-theme-grade col-test-theme-grade-${tc.toLowerCase()}`,
                  width: '34px',
                  minWidth: '28px',
                  headerTitle: `Theme ${tc} Exam Grade`,
                  title: `Theme ${tc} Grade`,
                  label: 'GRD',
                  shortLabel: 'GRD',
                  microLabel: 'GRD',
                  sortable: true,
                  align: 'center',
                  render: (val, row) => {
                    const scoreVal = row[`theme_${tc}_score`];
                    const hasExamAttempt = Boolean(row[`theme_${tc}_has_exam_att`]);
                    if (hasExamAttempt && scoreVal != null && scoreVal >= 0) {
                      const themeGrade = typeof calculateGrade === 'function' ? calculateGrade(scoreVal) : 'C';
                      const cleanGrade = String(themeGrade || '').trim().toUpperCase();
                      const gradeColor = typeof getGradeColorByScore === 'function' ? getGradeColorByScore(scoreVal) : '#94a3b8';
                      const isGradeS = cleanGrade === '★' || cleanGrade === 'S';
                      if (isGradeS) {
                        return `
                          <div style="display:flex; align-items:center; justify-content:center;">
                            <span class="grid-grade-val grid-grade-val-${row.id}-${tc.toLowerCase()} grid-grade-star" style="color:var(--grade-star); font-size:12px; font-weight:700; text-shadow:0 0 6px var(--grade-star-glow, rgba(255,45,135,0.4)); line-height:1;" title="Theme ${tc} Grade ★ (100% Excellent)">★</span>
                          </div>
                        `;
                      }
                      return `
                        <div style="display:flex; align-items:center; justify-content:center;">
                          <span class="grid-grade-val grid-grade-val-${row.id}-${tc.toLowerCase()}" style="color:${gradeColor}; font-weight:700; font-size:12px; line-height:1;" title="Theme ${tc} Grade ${cleanGrade}">${cleanGrade}</span>
                        </div>
                      `;
                    }
                    return `<div style="display:flex; align-items:center; justify-content:center;"><span class="grid-grade-val grid-grade-val-${row.id}-${tc.toLowerCase()}" style="font-size:12px; font-weight:600; color:#64748b;">—</span></div>`;
                  }
                });

                // 7. STATUS (Theme Status Column)
                dynamicAsmCols.push({
                  key: `theme_${tc}_status`,
                  className: `col-asm col-exam col-exam-status col-test-theme-status col-test-theme-status-${tc.toLowerCase()} super-hdr-divider`,
                  width: '34px',
                  minWidth: '28px',
                  headerTitle: `Theme ${tc} Exam Status`,
                  title: `Theme ${tc} Status`,
                  label: 'STS',
                  shortLabel: 'STS',
                  microLabel: 'STS',
                  sortable: true,
                  align: 'center',
                  render: (val, row) => {
                    const scoreVal = row[`theme_${tc}_score`];
                    const pRate = row[`theme_${tc}_phrases_rate`];
                    const wRate = row[`theme_${tc}_words_rate`];
                    const hasExamAttempt = Boolean(row[`theme_${tc}_has_exam_att`]);
                    const examTestIds = new Set(examAsms.map(e => e.id));
                    const studentAtts = (row.allAttempts || []).filter(a => examTestIds.has(a.test_id || a.Test_id));
                    const bestAtts = examAsms.map(e => row.asmScores?.[e.id]).filter(Boolean);
                    const themeAtts = studentAtts.length > 0 ? studentAtts : bestAtts;
                    const isForgiven = themeAtts.length > 0 && themeAtts.some(att => Boolean(att?.is_forgiven || att?.grade === 'F'));
                    const isRem = (themeAtts.length > 0 && themeAtts.some(att => Boolean(att?.is_remedial_unlocked || att?.is_remedial || att?.grade === 'R'))) || (wRate != null && (pRate == null || pRate < 60));
                    const isPassed = ((scoreVal != null && scoreVal >= 60 && pRate != null && pRate >= 60) || isForgiven);

                    const isRemMode = Boolean(window._classRemedialEditMode);
                    const isForgiveMode = Boolean(window._classForgivenEditMode);

                    if ((isRemMode || isForgiveMode) && examAsms.length > 0) {
                      const examTestIdsArr = examAsms.map(e => e.id);
                      const examTestIdsJson = JSON.stringify(examTestIdsArr).replace(/"/g, '&quot;');
                      if (isRemMode) {
                        return `
                          <div style="display:flex; align-items:center; justify-content:center; gap:4px; width:100%; height:100%;">
                            <input type="checkbox"
                                   class="table-remedial-check"
                                   data-student-id="${row.id}"
                                   ${isRem ? 'checked' : ''}
                                   title="Click to toggle Remedial"
                                   onclick="event.stopPropagation(); window.toggleCellRemedial('${row.id}', ${examTestIdsJson}, this.checked);"
                                   style="cursor:pointer; width:14px; height:14px; accent-color:var(--grade-c); margin:0;">
                            ${isRem ? '<span style="font-weight:700; font-size:12px; color:var(--grade-c);">R</span>' : ''}
                          </div>
                        `;
                      }
                      if (isForgiveMode) {
                        return `
                          <div style="display:flex; align-items:center; justify-content:center; gap:4px; width:100%; height:100%;">
                            <input type="checkbox"
                                   class="table-forgiven-check"
                                   data-student-id="${row.id}"
                                   ${isForgiven ? 'checked' : ''}
                                   title="Click to toggle Forgiven Waiver"
                                   onclick="event.stopPropagation(); window.toggleCellForgiven('${row.id}', ${examTestIdsJson}, this.checked);"
                                   style="cursor:pointer; width:14px; height:14px; accent-color:var(--grade-e); margin:0;">
                            ${isForgiven ? '<span style="font-weight:700; font-size:12px; color:var(--grade-e);">F</span>' : ''}
                          </div>
                        `;
                      }
                    }

                    if (isRem && !isPassed) {
                      return `
                        <div style="display:flex; align-items:center; justify-content:center;" title="Needs Remedial (Phrases or Exam incomplete)">
                          <span class="status-badge-rem" style="color:var(--grade-d); font-weight:700; font-size:12px; background:rgba(255,140,0,0.15); border:1px solid rgba(255,140,0,0.3); border-radius:3px; padding:1px 3px;">REM</span>
                        </div>
                      `;
                    }
                    if (isForgiven) {
                      return `
                        <div style="display:flex; align-items:center; justify-content:center;" title="Forgiven Waiver Granted (Grade F - Passed)">
                          <span class="status-badge-forgive" style="color:var(--grade-e); font-weight:700; font-size:12px;">F</span>
                        </div>
                      `;
                    }
                    if (hasExamAttempt && isPassed) {
                      return `
                        <div style="display:flex; align-items:center; justify-content:center;" title="Passed (${scoreVal}%)">
                          <span style="color:var(--grade-a); display:inline-flex; align-items:center;">${getSvgIcon('check-circle', 14)}</span>
                        </div>
                      `;
                    }
                    if (hasExamAttempt && !isPassed) {
                      return `
                        <div style="display:flex; align-items:center; justify-content:center;" title="Failed (${scoreVal}%)">
                          <span style="color:var(--grade-e); font-weight:700; font-size:12px;">—</span>
                        </div>
                      `;
                    }
                    return `
                      <div style="display:flex; align-items:center; justify-content:center;" title="Exam Not Attempted">
                        <span style="color:#64748b; font-size:12px;">—</span>
                      </div>
                    `;
                  }
                });
              } else {
              // 2. Theme Exam RATE Column
              dynamicAsmCols.push({
                key: `theme_${tc}_score`,
                className: `col-asm col-exam col-exam-score col-test-theme-score col-test-theme-score-${tc.toLowerCase()}`,
                width: '45px',
                minWidth: '36px',
                headerTitle: `Theme ${tc} Exam Rate %`,
                title: `Theme ${tc} Exam Rate %`,
                label: 'RATE',
                shortLabel: 'RATE',
                microLabel: 'RATE',
                sortable: true,
                align: 'center',
                render: (val, row) => {
                  const isManualMode = Boolean(window._classManualScoreEditMode);
                  const scoreVal = row[`theme_${tc}_score`];
                  const hasExamAttempt = Boolean(row[`theme_${tc}_has_exam_att`]);
                  const isTaskCompleted = Boolean(row[`theme_${tc}_task_completed`]);
                  const earnedTasks = row[`theme_${tc}_task_progress`] || 0;
                  const maxTasks = row[`theme_${tc}_task_max`] || 0;

                  // Manual Mode ON: render inline Excel-style input
                  if (isManualMode && examAsm) {
                    const currentDraft = window._manualInputState?.drafts?.[row.id]?.[examAsm.id];
                    const displayScore = currentDraft?.score != null ? currentDraft.score : (scoreVal != null && scoreVal >= 0 ? scoreVal : '');
                    return `
                      <div style="display:flex; align-items:center; justify-content:center; padding:1px 0; width:100%; height:100%;">
                        <input type="number" min="0" max="100" class="input-matrix-exam-score input-matrix-exam-score-${row.id}-${examAsm.id}"
                               data-student-id="${row.id}"
                               data-test-id="${examAsm.id}"
                               data-total-q="${totalQ}"
                               data-original-score="${scoreVal != null && scoreVal >= 0 ? scoreVal : ''}"
                               value="${displayScore}"
                               placeholder="%"
                               oninput="window.onMatrixExamScoreChange('${row.id}', '${examAsm.id}', ${totalQ}, this.value)"
                               onkeydown="if(event.key==='Enter'){this.blur();}"
                               onclick="event.stopPropagation();"
                               style="width:100%; height:100%; background:transparent; border:none; outline:none; color:#ffffff; font-weight:700; font-size:12px; text-align:center; border-radius:0; padding:0 2px;">
                      </div>
                    `;
                  }

                  // 3-State Gated Display:
                  if (hasExamAttempt && scoreVal !== undefined && scoreVal !== null && scoreVal >= 0) {
                    const studentExamAtts = examAsm ? (row.allAttempts || []).filter(a => (a.test_id || a.Test_id) === examAsm.id) : [];
                    const examAtt = studentExamAtts.find(a => a.is_forgiven || a.is_remedial_unlocked || a.is_remedial) || (examAsm ? row.asmScores?.[examAsm.id] : null);
                    const isForgiven = Boolean(examAtt?.is_forgiven);
                    const isRem = Boolean(examAtt?.is_remedial_unlocked || examAtt?.is_remedial);

                    let cellColor = typeof getGradeColorByScore === 'function' ? getGradeColorByScore(scoreVal) : '#94a3b8';
                    if (isForgiven && scoreVal === 0) {
                      cellColor = 'var(--grade-e)';
                    } else if (isRem) {
                      cellColor = 'var(--grade-c)';
                    }

                    return `
                      <span class="asm-score asm-score-test test-score-theme-pct"
                            style="color:${cellColor}; font-weight:500; font-size:12px; font-variant-numeric:tabular-nums;"
                            title="Theme ${tc} Exam Rate: ${scoreVal}%">
                        ${scoreVal}%
                      </span>
                    `;
                  }

                  if (!isTaskCompleted) {
                    return `
                      <div style="display:flex; align-items:center; justify-content:center;" title="Tasks Incomplete (${earnedTasks}/${maxTasks}). Complete all tasks to unlock exam.">
                        <span style="color:var(--grade-e); display:inline-flex; align-items:center;">${getSvgIcon('lock', 12)}</span>
                      </div>
                    `;
                  }

                  return `
                    <div style="display:flex; align-items:center; justify-content:center;" title="Exam Ready & Unlocked (${earnedTasks}/${maxTasks} Tasks Done). Waiting for student attempt.">
                      <span style="color:var(--grade-c); display:inline-flex; align-items:center;">${getSvgIcon('lock', 12)}</span>
                    </div>
                  `;
                }
              });

              // 3. Theme Exam POINTS Column
              dynamicAsmCols.push({
                key: `theme_${tc}_total_pts`,
                className: `col-asm col-exam col-exam-pts col-test-theme-total col-test-theme-total-${tc.toLowerCase()}`,
                width: '42px',
                minWidth: '34px',
                headerTitle: `Theme ${tc} Exam Points`,
                title: `Theme ${tc} Exam Points`,
                label: 'PTS',
                shortLabel: 'PTS',
                microLabel: 'PTS',
                sortable: true,
                align: 'center',
                render: (val, row) => {
                  const isManualMode = Boolean(window._classManualScoreEditMode);
                  const ptsVal = row[`theme_${tc}_total_pts`];
                  const hasExamAttempt = Boolean(row[`theme_${tc}_has_exam_att`]);
                  const isTaskCompleted = Boolean(row[`theme_${tc}_task_completed`]);
                  const earnedTasks = row[`theme_${tc}_task_progress`] || 0;
                  const maxTasks = row[`theme_${tc}_task_max`] || 0;

                  // Manual Mode ON: render inline Excel-style input
                  if (isManualMode && examAsm) {
                    const currentDraft = window._manualInputState?.drafts?.[row.id]?.[examAsm.id];
                    // Rule 2.10: Points Half-Up Whole Integer Invariant
                    const cleanTotal = ptsVal != null && ptsVal >= 0 ? Math.round(Number(ptsVal)) : '';
                    const displayPts = currentDraft?.pts != null ? Math.round(Number(currentDraft.pts)) : cleanTotal;
                    return `
                      <div style="display:flex; align-items:center; justify-content:center; padding:1px 0; width:100%; height:100%;">
                        <input type="number" min="0" max="${totalQ}" step="1" class="input-matrix-exam-pts input-matrix-exam-pts-${row.id}-${examAsm.id}"
                               data-student-id="${row.id}"
                               data-test-id="${examAsm.id}"
                               data-total-q="${totalQ}"
                               data-original-pts="${cleanTotal !== '' ? cleanTotal : ''}"
                               value="${displayPts}"
                               placeholder="pts"
                               oninput="window.onMatrixExamPtsChange('${row.id}', '${examAsm.id}', ${totalQ}, this.value)"
                               onkeydown="if(event.key==='Enter'){this.blur();}"
                               onclick="event.stopPropagation();"
                               style="width:100%; height:100%; background:transparent; border:none; outline:none; color:#ffffff; font-weight:700; font-size:12px; text-align:center; border-radius:0; padding:0 2px;">
                      </div>
                    `;
                  }

                  // 3-State Gated Display:
                  if (hasExamAttempt && ptsVal !== undefined && ptsVal !== null && ptsVal >= 0) {
                    // Rule 2.10: Points Half-Up Whole Integer Invariant (Math.round)
                    const cleanTotal = Math.round(Number(ptsVal || 0));
                    const displayVal = cleanTotal.toString();
                    const themePct = row[`theme_${tc}_score`] != null && row[`theme_${tc}_score`] >= 0
                      ? row[`theme_${tc}_score`]
                      : 0;

                    let color = typeof getGradeColorByScore === 'function'
                      ? getGradeColorByScore(themePct)
                      : (themePct >= 60 ? 'var(--grade-c)' : 'var(--grade-e)');

                    return `
                      <span class="asm-score asm-score-test test-score-theme-total"
                            style="color:${color}; font-weight:500; font-size:12px; font-variant-numeric:tabular-nums;"
                            title="Theme ${tc} Total Exam Points: ${displayVal}">
                        ${displayVal}
                      </span>
                    `;
                  }

                  if (!isTaskCompleted) {
                    return `
                      <div style="display:flex; align-items:center; justify-content:center;" title="Tasks Incomplete (${earnedTasks}/${maxTasks}). Complete all tasks to unlock exam.">
                        <span style="color:var(--grade-e); display:inline-flex; align-items:center;">${getSvgIcon('lock', 12)}</span>
                      </div>
                    `;
                  }

                  return `
                    <div style="display:flex; align-items:center; justify-content:center;" title="Exam Ready & Unlocked (${earnedTasks}/${maxTasks} Tasks Done). Waiting for student attempt.">
                      <span style="color:var(--grade-c); display:inline-flex; align-items:center;">${getSvgIcon('lock', 12)}</span>
                    </div>
                  `;
                }});

              // 4. Theme Exam GRADE Column (Authentic Canonical Grade strictly)
              dynamicAsmCols.push({
                key: `theme_${tc}_grade`,
                className: `col-asm col-exam col-exam-grade col-test-theme-grade col-test-theme-grade-${tc.toLowerCase()}`,
                width: '32px',
                minWidth: '26px',
                headerTitle: `Theme ${tc} Exam Grade`,
                title: `Theme ${tc} Exam Grade`,
                label: 'GRD',
                shortLabel: 'GRD',
                microLabel: 'GRD',
                sortable: true,
                align: 'center',
                render: (val, row) => {
                  const scoreVal = row[`theme_${tc}_score`];
                  const hasExamAttempt = Boolean(row[`theme_${tc}_has_exam_att`]);
                  const isTaskCompleted = Boolean(row[`theme_${tc}_task_completed`]);
                  const earnedTasks = row[`theme_${tc}_task_progress`] || 0;
                  const maxTasks = row[`theme_${tc}_task_max`] || 0;

                  // State 1: Exam taken -> Render Authentic Canonical Grade (★, A, B, C, D, E)
                  if (hasExamAttempt && scoreVal !== undefined && scoreVal !== null && scoreVal >= 0) {
                    const themeGrade = typeof calculateGrade === 'function' ? calculateGrade(scoreVal) : (typeof getGrade === 'function' ? getGrade(scoreVal) : '—');
                    const cleanGrade = String(themeGrade || '').trim().toUpperCase();
                    const gradeColor = typeof getGradeColorByScore === 'function' ? getGradeColorByScore(scoreVal) : '#94a3b8';
                    const isGradeS = cleanGrade === '★' || cleanGrade === 'S';

                    if (isGradeS) {
                      return `
                        <div style="display:flex; align-items:center; justify-content:center;">
                          <span class="grid-grade-val grid-grade-star" style="color:var(--grade-star); font-size:12px; font-weight:700; text-shadow:0 0 6px var(--grade-star-glow, rgba(255,45,135,0.4)); line-height:1;" title="Theme ${tc} Grade ★ (100% Excellent)">★</span>
                        </div>
                      `;
                    }
                    return `
                      <div style="display:flex; align-items:center; justify-content:center;">
                        <span class="grid-grade-val" style="color:${gradeColor}; font-weight:700; font-size:12px; line-height:1;" title="Theme ${tc} Grade ${cleanGrade}">${cleanGrade}</span>
                      </div>
                    `;
                  }

                  // State 2: Exam not taken & Incomplete tasks -> Red Lock / Incomplete Icon
                  if (!isTaskCompleted) {
                    return `
                      <div style="display:flex; align-items:center; justify-content:center;" title="Tasks Incomplete (${earnedTasks}/${maxTasks}). Complete all tasks to unlock exam.">
                        <span style="display:inline-flex;color:var(--grade-e);">${getSvgIcon('lock', 12)}</span>
                      </div>
                    `;
                  }

                  // State 3: Exam not taken & Tasks completed -> Yellow Lock Icon
                  return `
                    <div style="display:flex; align-items:center; justify-content:center;" title="Exam Ready & Unlocked (${earnedTasks}/${maxTasks} Tasks Done). Waiting for student attempt.">
                      <span style="display:inline-flex;color:var(--grade-c);filter:drop-shadow(0 0 2px rgba(255,255,0,0.4));">${getSvgIcon('lock', 13)}</span>
                    </div>
                  `;
                }});

              // 5. Theme Exam STATUS Column (Administrative Status: Passed, R, F, M & Checkboxes)
              dynamicAsmCols.push({
                key: `theme_${tc}_status`,
                className: `col-asm col-exam col-exam-status col-test-theme-status col-test-theme-status-${tc.toLowerCase()} super-hdr-divider`,
                width: '34px',
                minWidth: '28px',
                headerTitle: `Theme ${tc} Exam Status`,
                title: `Theme ${tc} Exam Status`,
                label: 'STS',
                shortLabel: 'STS',
                microLabel: 'STS',
                sortable: true,
                align: 'center',
                render: (val, row) => {
                  const scoreVal = row[`theme_${tc}_score`];
                  const hasExamAttempt = Boolean(row[`theme_${tc}_has_exam_att`]);
                  const examTestIds = new Set(examAsms.map(e => e.id));
                  const studentAtts = (row.allAttempts || []).filter(a => examTestIds.has(a.test_id || a.Test_id));
                  const bestAtts = examAsms.map(e => row.asmScores?.[e.id]).filter(Boolean);
                  const themeAtts = studentAtts.length > 0 ? studentAtts : bestAtts;
                  const isForgiven = themeAtts.length > 0 && themeAtts.some(att => Boolean(att?.is_forgiven || att?.grade === 'F'));
                  const isRem = themeAtts.length > 0 && themeAtts.some(att => Boolean(att?.is_remedial_unlocked || att?.is_remedial || att?.grade === 'R'));
                  const isPassed = (scoreVal !== undefined && scoreVal !== null && scoreVal >= 60) || isForgiven;

                  const isRemMode = Boolean(window._classRemedialEditMode);
                  const isForgiveMode = Boolean(window._classForgivenEditMode);

                  // Interactive Sub Panel Checkbox Modes
                  if ((isRemMode || isForgiveMode) && examAsms.length > 0) {
                    const examTestIds = examAsms.map(e => e.id);
                    const examTestIdsJson = JSON.stringify(examTestIds).replace(/"/g, '&quot;');

                    if (isRemMode) {
                      return `
                        <div style="display:flex; align-items:center; justify-content:center; gap:4px; width:100%; height:100%;">
                          <input type="checkbox"
                                 class="table-remedial-check"
                                 data-student-id="${row.id}"
                                 ${isRem ? 'checked' : ''}
                                 title="Click to toggle Remedial (Grade R, cap 60%)"
                                 onclick="event.stopPropagation(); window.toggleCellRemedial('${row.id}', ${examTestIdsJson}, this.checked);"
                                 style="cursor:pointer; width:14px; height:14px; accent-color:var(--grade-c); margin:0;">
                          ${isRem ? '<span style="font-weight:700; font-size:12px; color:var(--grade-c);">R</span>' : ''}
                        </div>
                      `;
                    }

                    if (isForgiveMode) {
                      return `
                        <div style="display:flex; align-items:center; justify-content:center; gap:4px; width:100%; height:100%;">
                          <input type="checkbox"
                                 class="table-forgiven-check"
                                 data-student-id="${row.id}"
                                 ${isForgiven ? 'checked' : ''}
                                 title="Click to toggle Forgiven Waiver (Grade F - Passed)"
                                 onclick="event.stopPropagation(); window.toggleCellForgiven('${row.id}', ${examTestIdsJson}, this.checked);"
                                 style="cursor:pointer; width:14px; height:14px; accent-color:var(--grade-e); margin:0;">
                          ${isForgiven ? '<span style="font-weight:700; font-size:12px; color:var(--grade-e);">F</span>' : ''}
                        </div>
                      `;
                    }
                  }

                  // Normal Display State:
                  if (isRem) {
                    return `
                      <div style="display:flex; align-items:center; justify-content:center;" title="Remedial (Grade R, rate capped at 60%)">
                        <span class="status-badge-rem" style="color:var(--grade-c); font-weight:700; font-size:12px;">R</span>
                      </div>
                    `;
                  }

                  if (isForgiven) {
                    return `
                      <div style="display:flex; align-items:center; justify-content:center;" title="Forgiven Waiver Granted (Grade F - Passed)">
                        <span class="status-badge-forgive" style="color:var(--grade-e); font-weight:700; font-size:12px;">F</span>
                      </div>
                    `;
                  }

                  if (hasExamAttempt && isPassed) {
                    return `
                      <div style="display:flex; align-items:center; justify-content:center;" title="Passed (${scoreVal}%)">
                        <span style="color:var(--grade-a); display:inline-flex; align-items:center;">${getSvgIcon('check-circle', 14)}</span>
                      </div>
                    `;
                  }

                  if (hasExamAttempt && !isPassed) {
                    return `
                      <div style="display:flex; align-items:center; justify-content:center;" title="Failed (${scoreVal}%)">
                        <span style="color:var(--grade-e); font-weight:700; font-size:12px;">—</span>
                      </div>
                    `;
                  }

                  return `
                    <div style="display:flex; align-items:center; justify-content:center;" title="Exam Not Attempted">
                      <span style="color:#64748b; font-size:12px;">—</span>
                    </div>
                  `;
                }});
              }
            });

            // Synchronize Sub-Header background with Super-Header parent quadrant (100% Solid Card-Title)
            dynamicAsmCols.forEach(col => {
              const match = String(col.key || '').match(/^theme_([A-Za-z])_/i);
              const tc = match ? match[1].toUpperCase() : null;
              if (tc && themeSubHeaderStyles[tc]) {
                col.headerStyle = themeSubHeaderStyles[tc];
                col.className = (col.className || '') + ` col-subhdr-theme-${tc.toLowerCase()}`;
              }
            });

            // Clean destruction of previous instance if any
            const gridContainer = document.getElementById('class-attendance-grid');
            if (gridContainer && gridContainer._datagridInstance) {
              gridContainer._datagridInstance.destroy();
            }

            attendanceGridInstance = new window.DataGrid({
              container: gridContainer,
              data: initialRosterData,
              pageSize: 50,
              stickyActionCol: false,
              tableLayout: 'fixed',
              hideToolbar: true,
              rowClassName: (row) => row.hasRemedial ? 'row-remedial' : '',
              searchKeys: [],
              initialSortKey: 'progressPct',
              initialSortAsc: false,
              sortComparator: (key, direction, a, b) => {
                const dir = direction === 'asc' ? 1 : -1;
                if (key === 'progressPct') {
                  const pA = Number(a.progressPct ?? 0);
                  const pB = Number(b.progressPct ?? 0);
                  if (pA !== pB) return (pA - pB) * dir;
                  // Tie-breaker 1: Total PTS DESC
                  const ptsA = Number(a.totalEarnedScore ?? 0);
                  const ptsB = Number(b.totalEarnedScore ?? 0);
                  if (ptsA !== ptsB) return ptsB - ptsA;
                  // Tie-breaker 2: Curriculum Score DESC
                  const scA = Number(a.curriculumGradePct ?? a.averageScorePct ?? 0);
                  const scB = Number(b.curriculumGradePct ?? b.averageScorePct ?? 0);
                  if (scA !== scB) return scB - scA;
                  // Tie-breaker 3: Earliest lastSubmittedAt ASC
                  if (a.lastSubmittedAt && b.lastSubmittedAt) {
                    const diff = new Date(a.lastSubmittedAt) - new Date(b.lastSubmittedAt);
                    if (diff !== 0) return diff;
                  }
                  return (a.displayName || a.name || '').localeCompare(b.displayName || b.name || '', undefined, { numeric: true });
                }
                if (key === 'totalEarnedScore') {
                  const ptsA = Number(a.totalEarnedScore ?? 0);
                  const ptsB = Number(b.totalEarnedScore ?? 0);
                  if (ptsA !== ptsB) return (ptsA - ptsB) * dir;
                  // Tie-breaker: PROG DESC
                  const pA = Number(a.progressPct ?? 0);
                  const pB = Number(b.progressPct ?? 0);
                  if (pA !== pB) return pB - pA;
                  return (a.displayName || a.name || '').localeCompare(b.displayName || b.name || '', undefined, { numeric: true });
                }
                if (key && key.includes('_summary')) {
                  const parts = key.split('_');
                  const tc = parts[1];
                  const topCode = parts[3];
                  const earnedA = (a[`theme_${tc}_topic_${topCode}_words_reps`] || 0) + (a[`theme_${tc}_topic_${topCode}_phrases_reps`] || 0) + (a[`theme_${tc}_topic_${topCode}_reps`] || 0);
                  const earnedB = (b[`theme_${tc}_topic_${topCode}_words_reps`] || 0) + (b[`theme_${tc}_topic_${topCode}_phrases_reps`] || 0) + (b[`theme_${tc}_topic_${topCode}_reps`] || 0);
                  if (earnedA !== earnedB) return (earnedA - earnedB) * dir;
                }
                if (key && key.includes('_att_')) {
                  const keyParts = key.split('_');
                  const tc = keyParts[1];
                  const topCode = keyParts[3];
                  const compType = keyParts[4];
                  const repIdx = parseInt(keyParts[6], 10);

                  const getAttPct = (student) => {
                    const asmsInTheme = themeGroups[tc] || [];
                    const taskAsmsInTheme = asmsInTheme.filter(a => !isWeeklyExam(a));
                    const matchingTasks = taskAsmsInTheme.filter(a =>
                      String(a.payload?.topic_code || '').toUpperCase() === topCode.toUpperCase() ||
                      (a.shell_code && a.shell_code.includes(topCode))
                    );
                    const comp = compType === 'phrases' ? 'phrases' : 'words';
                    const explicitPhrasesTask = matchingTasks.find(a => a.payload?.category === 'phrases' || /PHRASE/i.test(a.shell_code || a.title || ''));
                    const explicitWordsTask = matchingTasks.find(a => !(a.payload?.category === 'phrases' || /PHRASE/i.test(a.shell_code || a.title || '')));

                    let targetTaskId = '';
                    let studentAtts = [];

                    if (comp === 'phrases' && explicitPhrasesTask && explicitWordsTask && explicitPhrasesTask.id !== explicitWordsTask.id) {
                      targetTaskId = explicitPhrasesTask.id;
                      studentAtts = (student.allAttempts || []).filter(a =>
                        (a.test_id || a.Test_id) === targetTaskId &&
                        ['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(String(a.status || '').toLowerCase())
                      );
                    } else if (comp === 'words' && explicitPhrasesTask && explicitWordsTask && explicitPhrasesTask.id !== explicitWordsTask.id) {
                      targetTaskId = explicitWordsTask.id;
                      studentAtts = (student.allAttempts || []).filter(a =>
                        (a.test_id || a.Test_id) === targetTaskId &&
                        ['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(String(a.status || '').toLowerCase())
                      );
                    } else {
                      targetTaskId = (explicitWordsTask || matchingTasks[0])?.id || '';
                      studentAtts = (student.allAttempts || []).filter(a => {
                        if ((a.test_id || a.Test_id) !== targetTaskId) return false;
                        const st = String(a.status || '').toLowerCase();
                        if (!['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(st)) return false;
                        const sec = typeof getAttemptSection === 'function' ? getAttemptSection(a) : 'words';
                        return comp === 'phrases' ? sec === 'phrases' : sec !== 'phrases';
                      });
                    }

                    studentAtts.sort((x, y) => new Date(x.created_at || x.submitted_at || 0) - new Date(y.created_at || y.submitted_at || 0));
                    const att = studentAtts[repIdx];
                    if (att) {
                      const totalQ = Number(att.total_questions || 10);
                      const rawScore = Number(att.score ?? 0);
                      return Number(att.percentage ?? (totalQ > 0 ? (rawScore / totalQ) * 100 : 0));
                    }
                    const repsPassed = student[`theme_${tc}_topic_${topCode}_${comp}_reps`] || 0;
                    if (repIdx < repsPassed) return 70;
                    return -1;
                  };

                  const pctA = getAttPct(a);
                  const pctB = getAttPct(b);
                  if (pctA !== pctB) return (pctA - pctB) * dir;
                }
                return null;
              },
              superHeaders: dynamicSuperHeaders,
              summaryRow: (visibleCols, filteredData) => {
                const totalStudents = filteredData.length;
                if (totalStudents === 0) return '';

                // Calculate class averages aligned with weekly-only metrics
                const avgProg = Math.round(filteredData.reduce((acc, s) => acc + (s.progressPct || 0), 0) / totalStudents);
                const examCompletedStudents = filteredData.filter(s => (s.completedExamCount || s.completedWeeklyCount || 0) > 0);
                const weeklyCompletedStudents = examCompletedStudents;
                const avgScore = totalStudents > 0
                  ? Math.round(filteredData.reduce((acc, s) => acc + (s.averageScorePct || 0), 0) / totalStudents)
                  : 0;
                const avgPts = Math.round(filteredData.reduce((acc, s) => acc + (s.totalEarnedScore || 0), 0) / totalStudents);
                const avgGrade = typeof calculateGrade === 'function' ? calculateGrade(avgScore) : (typeof getGrade === 'function' ? getGrade(avgScore) : '—');
                const avgGradeColor = typeof getGradeColorByScore === 'function'
                  ? getGradeColorByScore(avgScore)
                  : '#94a3b8';
                const isAvgGradeS = avgGrade === '★' || avgGrade === 'S';
                const avgBadgeStyle = isAvgGradeS
                  ? `background:rgba(${TOPSCORE_COLORS.STAR_RGB},0.18); color:${TOPSCORE_COLORS.STAR}; font-weight:900; font-size: 12px; padding:0 5px; line-height:1.2; box-shadow:0 0 10px rgba(${TOPSCORE_COLORS.STAR_RGB},0.45); border:1px solid ${TOPSCORE_COLORS.STAR};`
                  : `background:${avgGradeColor}; color:${TOPSCORE_COLORS.TEXT_DARK}; font-weight:800; font-size: 12px; padding:0 4px; line-height:1.2;`;

                let cellsHtml = '';
                visibleCols.forEach(col => {
                  if (col.key === 'batch') {
                    cellsHtml += `<td class="col-sticky col-sticky-1 text-center" style="font-weight:700; color:var(--grade-c); font-size:12px;"></td>`;
                  } else if (col.key === 'displayName') {
                    cellsHtml += `<td class="col-sticky col-sticky-2" style="font-weight:700; color:var(--grade-c); font-size:12px; white-space:nowrap; text-transform:uppercase; letter-spacing:0.02em;">CLASS AVERAGE</td>`;
                  } else if (col.key === 'progressPct') {
                    const avgProgColor = typeof getGradeColorByScore === 'function' ? getGradeColorByScore(avgProg) : '#ffffff';
                    cellsHtml += `
                      <td class="col-overall col-overall-prog text-center">
                        <div style="color:${avgProgColor}; font-weight:600; font-size:12px; font-variant-numeric:tabular-nums; line-height:1;">${avgProg}%</div>
                      </td>
                    `;
                  } else if (col.key === 'totalEarnedScore') {
                    const avgPtsColor = typeof getGradeColorByScore === 'function' ? getGradeColorByScore(avgScore) : '#ffffff';
                    cellsHtml += `
                      <td class="col-overall col-overall-pts text-center">
                        <div style="font-weight:700; font-size:12px; font-variant-numeric:tabular-nums; line-height:1; color:${avgPtsColor};" title="Class Avg Exam Points: ${avgPts}">
                          ${avgPts}
                        </div>
                      </td>
                    `;
                  } else if (col.key === 'grade') {
                    if (totalStudents === 0 || avgGrade === '—' || avgGrade === '-') {
                      cellsHtml += `
                        <td class="col-overall col-overall-grade text-center">
                          <span class="text-muted" style="font-size:12px;">—</span>
                        </td>
                      `;
                    } else {
                      const cleanAvgGrade = String(avgGrade || '').trim().toUpperCase();
                      cellsHtml += `
                        <td class="col-overall col-overall-grade text-center">
                          ${isAvgGradeS
                            ? '<span class="grid-grade-val grid-grade-star" style="color:var(--grade-star); font-size:12px; font-weight:700; text-shadow:0 0 6px var(--grade-star-glow, rgba(255,45,135,0.4)); line-height:1;" title="Average Grade ★ (100%)">★</span>'
                            : `<span class="grid-grade-val" style="color:${avgGradeColor}; font-weight:700; font-size:12px; line-height:1;" title="Average Grade ${cleanAvgGrade}">${cleanAvgGrade}</span>`}
                        </td>
                      `;
                    }
                  } else if (col.key === 'action_button') {
                    cellsHtml += `<td class="text-center"></td>`;
                  } else if (col.key && (col.key.startsWith('test_') || col.key.startsWith('asm_'))) {
                    const isPtsCol = col.key.endsWith('_pts');
                    const isPctCol = col.key.endsWith('_pct');
                    const asmId = col.key.replace(/^test_/, '').replace(/^asm_/, '').replace('_pts', '').replace('_pct', '');
                    let count = 0;
                    let scoreSum = 0;
                    let pctSum = 0;
                    filteredData.forEach(s => {
                      const att = s.asmScores?.[asmId];
                      if (att && ['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(String(att.status || '').toLowerCase())) {
                        const targetAsmForAvg = classTests.find(a => a.id === asmId);
                        const maxQ = getAsmExpectedMax(targetAsmForAvg);
                        const tq = Number(att.total_questions || maxQ || 50);
                        const sc = att.score != null ? Math.min(Number(att.score), tq) : 0;
                        const rawPct = att.percentage != null ? Number(att.percentage) : (tq > 0 ? (sc / tq) * 100 : 0);
                        count++;
                        const isRem = Boolean(att.is_remedial_unlocked || att.is_remedial);
                        const maxRemPts = tq * 0.6;
                        const effSc = isRem ? Math.min(sc, maxRemPts) : sc;
                        const effPct = isRem ? Math.min(rawPct, 60.0) : rawPct;
                        scoreSum += effSc;
                        pctSum += effPct;
                      }
                    });
                    const isTest = col.className && col.className.includes('col-exam');
                    const targetAsm = classTests.find(a => a.id === asmId);
                    const totalQ = Number(targetAsm?.total_questions || getAsmExpectedMax(targetAsm) || (isTest ? 150 : 50));
                    if (count > 0) {
                      const avgSc = (scoreSum / count).toFixed(1).replace(/\.0$/, '');
                      const avgPct = Math.round(pctSum / count);
                      const avgCol = typeof getGradeColorByScore === 'function'
                        ? getGradeColorByScore(avgPct)
                        : (avgPct >= 60 ? 'var(--grade-c)' : 'var(--grade-e)');
                      if (isTest && isPctCol) {
                        cellsHtml += `
                          <td class="text-center ${col.className || ''}">
                            <span style="color:${avgCol}; font-weight:600; font-size:12px; font-variant-numeric:tabular-nums;" title="Class Avg Rate: ${avgPct}%">${avgPct}%</span>
                          </td>
                        `;
                      } else if (isTest && isPtsCol) {
                        cellsHtml += `
                          <td class="text-center ${col.className || ''}">
                            <span style="color:${avgCol}; font-weight:600; font-size:12px; font-variant-numeric:tabular-nums;" title="Class Avg Points: ${avgSc}/${totalQ} pts (${avgPct}%)">${avgSc}</span>
                          </td>
                        `;
                      } else {
                        cellsHtml += `
                          <td class="text-center ${col.className || ''}">
                            <span style="color:${avgCol}; font-weight:600; font-size:12px; font-variant-numeric:tabular-nums;" title="Class Avg Task Rate: ${avgPct}% (${count} students)">${avgPct}%</span>
                          </td>
                        `;
                      }
                    } else {
                      cellsHtml += `
                        <td class="text-center ${col.className || ''}">
                          <span class="asm-dot" style="color:rgba(255,255,255,0.22); font-weight:700; font-size:12px; line-height:1;" title="Unattempted">&middot;</span>
                        </td>
                      `;
                    }
                  } else if (col.key && col.key.startsWith('theme_') && col.key.includes('_summary')) {
                    const parts = col.key.split('_');
                    const tc = parts[1];
                    const topCode = parts[3];
                    let repsSum = 0;
                    filteredData.forEach(s => {
                      const wR = s[`theme_${tc}_topic_${topCode}_words_reps`] || 0;
                      const pR = s[`theme_${tc}_topic_${topCode}_phrases_reps`] || 0;
                      if (wR > 0 || pR > 0) {
                        repsSum += (wR + pR);
                      } else {
                        repsSum += (s[`theme_${tc}_topic_${topCode}_reps`] || 0);
                      }
                    });
                    if (totalStudents > 0 && repsSum > 0) {
                      const avgReps = (repsSum / totalStudents).toFixed(1).replace(/\.0$/, '');
                      cellsHtml += `
                        <td class="text-center ${col.className || ''}">
                          <span style="color:#38bdf8; font-weight:700; font-size:12px; font-variant-numeric:tabular-nums;" title="Class Avg Topic ${topCode} Reps: ${avgReps}">${avgReps}</span>
                        </td>
                      `;
                    } else {
                      cellsHtml += `
                        <td class="text-center ${col.className || ''}">
                          <span class="asm-dot" style="color:rgba(255,255,255,0.22); font-weight:700; font-size:12px; line-height:1;" title="0 Reps">&middot;</span>
                        </td>
                      `;
                    }
                  } else if (col.key && col.key.startsWith('theme_') && col.key.includes('_att_')) {
                    const keyParts = col.key.split('_');
                    const tc = keyParts[1];
                    const topCode = keyParts[3];
                    const compType = keyParts[4]; // 'words' or 'phrases'
                    const repIdx = parseInt(keyParts[6], 10);

                    const asmsInTheme = themeGroups[tc] || [];
                    const taskAsmsInTheme = asmsInTheme.filter(a => !isWeeklyExam(a));
                    const matchingTasks = taskAsmsInTheme.filter(a =>
                      String(a.payload?.topic_code || '').toUpperCase() === topCode.toUpperCase() ||
                      (a.shell_code && a.shell_code.includes(topCode))
                    );
                    const comp = compType === 'phrases' ? 'phrases' : 'words';
                    const explicitPhrasesTask = matchingTasks.find(a => a.payload?.category === 'phrases' || /PHRASE/i.test(a.shell_code || a.title || ''));
                    const explicitWordsTask = matchingTasks.find(a => !(a.payload?.category === 'phrases' || /PHRASE/i.test(a.shell_code || a.title || '')));

                    let targetTaskId = '';
                    let count = 0;
                    let sumPct = 0;

                    filteredData.forEach(s => {
                      let studentAtts = [];
                      if (comp === 'phrases' && explicitPhrasesTask && explicitWordsTask && explicitPhrasesTask.id !== explicitWordsTask.id) {
                        targetTaskId = explicitPhrasesTask.id;
                        studentAtts = (s.allAttempts || []).filter(a =>
                          (a.test_id || a.Test_id) === targetTaskId &&
                          ['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(String(a.status || '').toLowerCase())
                        );
                      } else if (comp === 'words' && explicitPhrasesTask && explicitWordsTask && explicitPhrasesTask.id !== explicitWordsTask.id) {
                        targetTaskId = explicitWordsTask.id;
                        studentAtts = (s.allAttempts || []).filter(a =>
                          (a.test_id || a.Test_id) === targetTaskId &&
                          ['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(String(a.status || '').toLowerCase())
                        );
                      } else {
                        targetTaskId = (explicitWordsTask || matchingTasks[0])?.id || '';
                        studentAtts = (s.allAttempts || []).filter(a => {
                          if ((a.test_id || a.Test_id) !== targetTaskId) return false;
                          const st = String(a.status || '').toLowerCase();
                          if (!['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(st)) return false;
                          const sec = typeof getAttemptSection === 'function' ? getAttemptSection(a) : 'words';
                          return comp === 'phrases' ? sec === 'phrases' : sec !== 'phrases';
                        });
                      }

                      studentAtts.sort((a, b) => new Date(a.created_at || a.submitted_at || 0) - new Date(b.created_at || b.submitted_at || 0));
                      const att = studentAtts[repIdx];
                      if (att) {
                        const totalQ = Number(att.total_questions || 10);
                        const rawScore = Number(att.score ?? 0);
                        const pct = Math.round(Number(att.percentage ?? (totalQ > 0 ? (rawScore / totalQ) * 100 : 0)));
                        count++;
                        sumPct += pct;
                      } else {
                        const repsPassed = s[`theme_${tc}_topic_${topCode}_${comp}_reps`] || 0;
                        if (repIdx < repsPassed) {
                          count++;
                          sumPct += 70;
                        }
                      }
                    });

                    if (count > 0) {
                      const avgPct = Math.round(sumPct / count);
                      const avgColor = typeof getGradeColorByScore === 'function' ? getGradeColorByScore(avgPct) : '#ffffff';
                      cellsHtml += `
                        <td class="text-center ${col.className || ''}">
                          <span style="color:${avgColor}; font-weight:700; font-size:12px; font-variant-numeric:tabular-nums;" title="Class Avg Attempt Rate: ${avgPct}% (${count} students)">${avgPct}%</span>
                        </td>
                      `;
                    } else {
                      cellsHtml += `
                        <td class="text-center ${col.className || ''}">
                          <span style="color:#64748b; font-size:12px;">—</span>
                        </td>
                      `;
                    }
                  } else if (col.key && col.key.startsWith('theme_') && col.key.includes('_topic_') && (col.key.endsWith('_task') || col.key.endsWith('_words_task') || col.key.endsWith('_phrases_task'))) {
                    let repsKey = '';
                    let label = col.label || 'Topic';
                    if (col.key.endsWith('_words_task')) {
                      repsKey = col.key.replace('_words_task', '_words_reps');
                    } else if (col.key.endsWith('_phrases_task')) {
                      repsKey = col.key.replace('_phrases_task', '_phrases_reps');
                    } else {
                      repsKey = col.key.replace('_task', '_reps');
                    }
                    let repsSum = 0;
                    filteredData.forEach(s => {
                      repsSum += (s[repsKey] || 0);
                    });
                    if (totalStudents > 0 && repsSum > 0) {
                      const avgReps = (repsSum / totalStudents).toFixed(1).replace(/\.0$/, '');
                      const avgRepsNum = repsSum / totalStudents;
                      const avgColor = avgRepsNum >= compTargetReps ? 'var(--grade-a)' : (avgRepsNum >= Math.ceil(compTargetReps / 2) ? '#38bdf8' : 'var(--grade-c)');
                      cellsHtml += `
                        <td class="text-center ${col.className || ''}">
                          <span style="color:${avgColor}; font-weight:700; font-size:12px; font-variant-numeric:tabular-nums;" title="Class Avg ${label} Repetitions: ${avgReps}/${compTargetReps}">${avgReps}</span>
                        </td>
                      `;
                    } else {
                      cellsHtml += `
                        <td class="text-center ${col.className || ''}">
                          <span class="asm-dot" style="color:rgba(255,255,255,0.22); font-weight:700; font-size:12px; line-height:1;" title="0 Repetitions">&middot;</span>
                        </td>
                      `;
                    }
                  } else if (col.key && col.key.startsWith('theme_') && col.key.endsWith('_task')) {
                    const tc = col.key.replace('theme_', '').replace('_task', '');
                    let sumTasks = 0;
                    let sumMax = 0;
                    filteredData.forEach(s => {
                      sumTasks += (s[`theme_${tc}_task_progress`] || 0);
                      sumMax += (s[`theme_${tc}_task_max`] || 0);
                    });
                    if (sumMax > 0) {
                      const avgTaskPct = Math.round((sumTasks / sumMax) * 100);
                      const avgTaskCol = typeof getGradeColorByScore === 'function' ? getGradeColorByScore(avgTaskPct) : (TOPSCORE_COLORS?.C || 'var(--grade-c)');
                      cellsHtml += `
                        <td class="text-center ${col.className || ''}">
                          <span style="color:${avgTaskCol}; font-weight:600; font-size:12px; font-variant-numeric:tabular-nums;" title="Class Avg Theme ${tc} Tasks Progress: ${avgTaskPct}% (${sumTasks}/${sumMax})">${avgTaskPct}%</span>
                        </td>
                      `;
                    } else {
                      cellsHtml += `
                        <td class="text-center ${col.className || ''}">
                          <span class="asm-dot" style="color:rgba(255,255,255,0.22); font-weight:700; font-size:12px; line-height:1;" title="Unattempted">&middot;</span>
                        </td>
                      `;
                    }
                  } else if (col.key && col.key.startsWith('theme_') && col.key.endsWith('_words_rate')) {
                    const tc = col.key.replace('theme_', '').replace('_words_rate', '');
                    let count = 0;
                    let totalScoreSum = 0;
                    filteredData.forEach(s => {
                      const val = s[col.key];
                      if (val !== undefined && val !== null && val >= 0) {
                        count++;
                        totalScoreSum += Number(val);
                      }
                    });
                    if (count > 0) {
                      const avgWrdRate = Math.round(totalScoreSum / count);
                      const avgScoreCol = typeof getGradeColorByScore === 'function' ? getGradeColorByScore(avgWrdRate) : (TOPSCORE_COLORS?.C || 'var(--grade-c)');
                      cellsHtml += `
                        <td class="text-center ${col.className || ''}">
                          <span style="color:${avgScoreCol}; font-weight:600; font-size:12px; font-variant-numeric:tabular-nums;" title="Class Avg Theme ${tc} Words Rate: ${avgWrdRate}%">${avgWrdRate}%</span>
                        </td>
                      `;
                    } else {
                      cellsHtml += `
                        <td class="text-center ${col.className || ''}">
                          <span class="asm-dot" style="color:rgba(255,255,255,0.22); font-weight:700; font-size:12px; line-height:1;" title="Unattempted">&middot;</span>
                        </td>
                      `;
                    }
                  } else if (col.key && col.key.startsWith('theme_') && col.key.endsWith('_words_pts')) {
                    const tc = col.key.replace('theme_', '').replace('_words_pts', '');
                    let count = 0;
                    let totalPtsSum = 0;
                    filteredData.forEach(s => {
                      const val = s[col.key];
                      if (val !== undefined && val !== null && val >= 0) {
                        count++;
                        totalPtsSum += Number(val);
                      }
                    });
                    if (count > 0) {
                      const avgWrdPts = Math.round(totalPtsSum / count);
                      const avgWrdPct = Math.min(100, Math.round((avgWrdPts / 160) * 100));
                      const avgColor = typeof getGradeColorByScore === 'function' ? getGradeColorByScore(avgWrdPct) : '#ffffff';
                      cellsHtml += `
                        <td class="text-center ${col.className || ''}">
                          <span style="color:${avgColor}; font-weight:600; font-size:12px; font-variant-numeric:tabular-nums;" title="Class Avg Theme ${tc} Words Points: ${avgWrdPts} pts">${avgWrdPts}</span>
                        </td>
                      `;
                    } else {
                      cellsHtml += `
                        <td class="text-center ${col.className || ''}">
                          <span class="asm-dot" style="color:rgba(255,255,255,0.22); font-weight:700; font-size:12px; line-height:1;" title="Unattempted">&middot;</span>
                        </td>
                      `;
                    }
                  } else if (col.key && col.key.startsWith('theme_') && col.key.endsWith('_phrases_rate')) {
                    const tc = col.key.replace('theme_', '').replace('_phrases_rate', '');
                    let count = 0;
                    let totalScoreSum = 0;
                    filteredData.forEach(s => {
                      const val = s[col.key];
                      if (val !== undefined && val !== null && val >= 0) {
                        count++;
                        totalScoreSum += Number(val);
                      }
                    });
                    if (count > 0) {
                      const avgPhrRate = Math.round(totalScoreSum / count);
                      const avgScoreCol = typeof getGradeColorByScore === 'function' ? getGradeColorByScore(avgPhrRate) : (TOPSCORE_COLORS?.C || 'var(--grade-c)');
                      cellsHtml += `
                        <td class="text-center ${col.className || ''}">
                          <span style="color:${avgScoreCol}; font-weight:600; font-size:12px; font-variant-numeric:tabular-nums;" title="Class Avg Theme ${tc} Phrase Rate: ${avgPhrRate}%">${avgPhrRate}%</span>
                        </td>
                      `;
                    } else {
                      cellsHtml += `
                        <td class="text-center ${col.className || ''}">
                          <span class="asm-dot" style="color:rgba(255,255,255,0.22); font-weight:700; font-size:12px; line-height:1;" title="Unattempted">&middot;</span>
                        </td>
                      `;
                    }
                  } else if (col.key && col.key.startsWith('theme_') && col.key.endsWith('_phrases_pts')) {
                    const tc = col.key.replace('theme_', '').replace('_phrases_pts', '');
                    let count = 0;
                    let totalPtsSum = 0;
                    filteredData.forEach(s => {
                      const val = s[col.key];
                      if (val !== undefined && val !== null && val >= 0) {
                        count++;
                        totalPtsSum += Number(val);
                      }
                    });
                    if (count > 0) {
                      const avgPhrPts = Math.round(totalPtsSum / count);
                      const avgPhrPct = Math.min(100, Math.round((avgPhrPts / 40) * 100));
                      const avgColor = typeof getGradeColorByScore === 'function' ? getGradeColorByScore(avgPhrPct) : '#ffffff';
                      cellsHtml += `
                        <td class="text-center ${col.className || ''}">
                          <span style="color:${avgColor}; font-weight:600; font-size:12px; font-variant-numeric:tabular-nums;" title="Class Avg Theme ${tc} Phrase Points: ${avgPhrPts} pts">${avgPhrPts}</span>
                        </td>
                      `;
                    } else {
                      cellsHtml += `
                        <td class="text-center ${col.className || ''}">
                          <span class="asm-dot" style="color:rgba(255,255,255,0.22); font-weight:700; font-size:12px; line-height:1;" title="Unattempted">&middot;</span>
                        </td>
                      `;
                    }
                  } else if (col.key && col.key.startsWith('theme_') && col.key.endsWith('_score')) {
                    const tc = col.key.replace('theme_', '').replace('_score', '');
                    let count = 0;
                    let totalScoreSum = 0;
                    filteredData.forEach(s => {
                      const val = s[col.key];
                      if (val !== undefined && val !== null && val >= 0) {
                        count++;
                        totalScoreSum += Number(val);
                      }
                    });
                    if (count > 0) {
                      const avgThemeScore = Math.round(totalScoreSum / count);
                      const avgScoreCol = typeof getGradeColorByScore === 'function' ? getGradeColorByScore(avgThemeScore) : (TOPSCORE_COLORS?.C || 'var(--grade-c)');
                      cellsHtml += `
                        <td class="text-center ${col.className || ''}">
                          <span style="color:${avgScoreCol}; font-weight:600; font-size:12px; font-variant-numeric:tabular-nums;" title="Class Avg Theme ${tc} Rate: ${avgThemeScore}%">${avgThemeScore}%</span>
                        </td>
                      `;
                    } else {
                      cellsHtml += `
                        <td class="text-center ${col.className || ''}">
                          <span class="asm-dot" style="color:rgba(255,255,255,0.22); font-weight:700; font-size:12px; line-height:1;" title="Unattempted">&middot;</span>
                        </td>
                      `;
                    }
                  } else if (col.key && col.key.startsWith('theme_') && col.key.endsWith('_total_pts')) {
                    const tc = col.key.replace('theme_', '').replace('_total_pts', '');
                    let count = 0;
                    let totalPtsSum = 0;
                    let totalMaxQSum = 0;
                    filteredData.forEach(s => {
                      const val = s[col.key];
                      if (val !== undefined && val !== null && val >= 0) {
                        count++;
                        totalPtsSum += Number(val);
                        totalMaxQSum += Number(s[`theme_${tc}_max_q`] || (tc === 'A' ? 150 : tc === 'B' ? 350 : tc === 'C' ? 600 : 800));
                      }
                    });
                    if (count > 0) {
                      // Rule 2.10: Points Half-Up Whole Integer Invariant (Math.round)
                      const avgThemePts = Math.round(totalPtsSum / count);
                      const avgThemePct = totalMaxQSum > 0 ? Math.round((totalPtsSum / totalMaxQSum) * 100) : 0;
                      const avgThemeColor = typeof getGradeColorByScore === 'function' ? getGradeColorByScore(avgThemePct) : '#ffffff';
                      cellsHtml += `
                        <td class="text-center ${col.className || ''}">
                          <span style="color:${avgThemeColor}; font-weight:600; font-size:12px; font-variant-numeric:tabular-nums;" title="Class Avg Theme ${tc} Points: ${avgThemePts} pts (${avgThemePct}%)">${avgThemePts}</span>
                        </td>
                      `;
                    } else {
                      cellsHtml += `
                        <td class="text-center ${col.className || ''}">
                          <span class="asm-dot" style="color:rgba(255,255,255,0.22); font-weight:700; font-size:12px; line-height:1;" title="Unattempted">&middot;</span>
                        </td>
                      `;
                    }
                  } else if (col.key && col.key.startsWith('theme_') && col.key.endsWith('_grade')) {
                    const tc = col.key.replace('theme_', '').replace('_grade', '');
                    let count = 0;
                    let totalScoreSum = 0;
                    filteredData.forEach(s => {
                      const val = s[`theme_${tc}_score`];
                      if (val !== undefined && val !== null && val >= 0) {
                        count++;
                        totalScoreSum += Number(val);
                      }
                    });
                    if (count > 0) {
                      const avgThemeScore = Math.round(totalScoreSum / count);
                      const avgThemeGrade = typeof calculateGrade === 'function' ? calculateGrade(avgThemeScore) : (typeof getGrade === 'function' ? getGrade(avgThemeScore) : '—');
                      const isAvgThemeGradeS = avgThemeGrade === '★' || avgThemeGrade === 'S';
                      const cleanAvgThemeGrade = String(avgThemeGrade || '').trim().toUpperCase();
                      const avgThemeGradeColor = typeof getGradeColorByScore === 'function' ? getGradeColorByScore(avgThemeScore) : '#94a3b8';
                      cellsHtml += `
                        <td class="text-center ${col.className || ''}">
                          ${isAvgThemeGradeS
                            ? `<span class="grid-grade-val grid-grade-star" style="color:var(--grade-star); font-size:12px; font-weight:700; line-height:1;" title="Class Avg Theme ${tc} Grade ★">★</span>`
                            : `<span class="grid-grade-val" style="color:${avgThemeGradeColor}; font-weight:700; font-size:12px; line-height:1;" title="Class Avg Theme ${tc} Grade ${cleanAvgThemeGrade}">${cleanAvgThemeGrade}</span>`}
                        </td>
                      `;
                    } else {
                      cellsHtml += `
                        <td class="text-center ${col.className || ''}">
                          <span class="asm-dot" style="color:rgba(255,255,255,0.22); font-weight:700; font-size:12px; line-height:1;" title="Unattempted">&middot;</span>
                        </td>
                      `;
                    }
                  } else if (col.key === 'manual_input_action' || col.key === 'action_button') {
                    cellsHtml += `<td class="text-center ${col.className || ''}"><span style="color:#64748b; font-size:12px;">—</span></td>`;
                  } else {
                    cellsHtml += `<td></td>`;
                  }
                });

                return `<tr class="datagrid-summary-row">${cellsHtml}</tr>`;
              },
              sortComparator: (sortKey, direction, a, b) => {
                const aActive = a.isActive ? 1 : 0;
                const bActive = b.isActive ? 1 : 0;
                if (aActive !== bActive) return bActive - aActive;

                // 1. Leaderboard Primary default sort: Global PTS DESC -> Global SCORE % DESC -> PROG % DESC
                if (sortKey === 'totalEarnedScore' || sortKey === 'PTS') {
                  const sA = Number(a.totalEarnedScore ?? 0);
                  const sB = Number(b.totalEarnedScore ?? 0);
                  if (sA !== sB) return direction === 'asc' ? sA - sB : sB - sA;
                  const pA = Number(a.progressPct ?? 0);
                  const pB = Number(b.progressPct ?? 0);
                  if (pA !== pB) return pB - pA;
                  const countA = a.completedExamCount ?? a.completedWeeklyCount ?? 0;
                  const countB = b.completedExamCount ?? b.completedWeeklyCount ?? 0;
                  const scoreA = (countA > 0) ? Number(a.averageScorePct ?? 0) : -1;
                  const scoreB = (countB > 0) ? Number(b.averageScorePct ?? 0) : -1;
                  if (scoreA !== scoreB) return scoreB - scoreA;
                  if (a.lastSubmittedAt && b.lastSubmittedAt) {
                    const diff = new Date(a.lastSubmittedAt) - new Date(b.lastSubmittedAt);
                    if (diff !== 0) return diff;
                  }
                  return (a.displayName || a.name || '').localeCompare(b.displayName || b.name || '', undefined, { sensitivity: 'base', numeric: true });
                }

                if (sortKey === 'grade' || sortKey === 'GRD' || sortKey === 'SCORE' || sortKey === 'averageScorePct') {
                  const countA = a.completedExamCount ?? a.completedWeeklyCount ?? 0;
                  const countB = b.completedExamCount ?? b.completedWeeklyCount ?? 0;
                  const gA = (countA > 0) ? Number(a.averageScorePct ?? 0) : -1;
                  const gB = (countB > 0) ? Number(b.averageScorePct ?? 0) : -1;
                  if (gA !== gB) return direction === 'asc' ? gA - gB : gB - gA;
                  const pA = Number(a.progressPct ?? 0);
                  const pB = Number(b.progressPct ?? 0);
                  if (pA !== pB) return pB - pA;
                  const sA = Number(a.totalEarnedScore ?? 0);
                  const sB = Number(b.totalEarnedScore ?? 0);
                  if (sA !== sB) return sB - sA;
                  if (a.lastSubmittedAt && b.lastSubmittedAt) {
                    const diff = new Date(a.lastSubmittedAt) - new Date(b.lastSubmittedAt);
                    if (diff !== 0) return diff;
                  }
                  return (a.displayName || a.name || '').localeCompare(b.displayName || b.name || '', undefined, { sensitivity: 'base', numeric: true });
                }

                if (sortKey === 'progressPct' || sortKey === 'DONE' || sortKey === 'PROG' || sortKey === 'PRGRS' || sortKey === 'PGS') {
                  const pA = Number(a.progressPct ?? 0);
                  const pB = Number(b.progressPct ?? 0);
                  if (pA !== pB) return direction === 'asc' ? pA - pB : pB - pA;
                  const sA = Number(a.totalEarnedScore ?? 0);
                  const sB = Number(b.totalEarnedScore ?? 0);
                  if (sA !== sB) return sB - sA;
                  const countA = a.completedExamCount ?? a.completedWeeklyCount ?? 0;
                  const countB = b.completedExamCount ?? b.completedWeeklyCount ?? 0;
                  const scoreA = (countA > 0) ? Number(a.averageScorePct ?? 0) : -1;
                  const scoreB = (countB > 0) ? Number(b.averageScorePct ?? 0) : -1;
                  if (scoreA !== scoreB) return scoreB - scoreA;
                  if (a.lastSubmittedAt && b.lastSubmittedAt) {
                    const diff = new Date(a.lastSubmittedAt) - new Date(b.lastSubmittedAt);
                    if (diff !== 0) return diff;
                  }
                  return (a.displayName || a.name || '').localeCompare(b.displayName || b.name || '', undefined, { sensitivity: 'base', numeric: true });
                }


                if (sortKey && (sortKey.startsWith('test_') || sortKey.startsWith('asm_') || sortKey.startsWith('theme_'))) {
                  const scoreA = Number(a[sortKey] ?? -1);
                  const scoreB = Number(b[sortKey] ?? -1);
                  if (scoreA !== scoreB) {
                    return direction === 'asc' ? scoreA - scoreB : scoreB - scoreA;
                  }
                }

                if (sortKey === 'batch') {
                  const batchCmp = (a.batch || '').localeCompare(b.batch || '', undefined, { sensitivity: 'base', numeric: true });
                  if (batchCmp !== 0) return direction === 'desc' ? -batchCmp : batchCmp;
                }

                if (sortKey === 'displayName') {
                  const nameCmp = (a.displayName || a.name || '').localeCompare(b.displayName || b.name || '', undefined, { sensitivity: 'base', numeric: true });
                  return direction === 'desc' ? -nameCmp : nameCmp;
                }

                let valA = a[sortKey];
                let valB = b[sortKey];
                if (typeof valA === 'string') valA = valA.toLowerCase();
                if (typeof valB === 'string') valB = valB.toLowerCase();
                if (valA < valB) return direction === 'asc' ? -1 : 1;
                if (valA > valB) return direction === 'asc' ? 1 : -1;
                return 0;
              },
              columns: [
                {
                  key: 'batch',
                  label: 'BTC',
                  className: 'col-sticky col-sticky-1 col-subhdr-students-data',
                  headerStyle: 'background: #1e293b !important; color: #ffffff !important;',
                  sortable: true,
                  align: 'center',
                  width: '45px',
                  minWidth: '36px',
                  render: (val, row) => `<span style="color:#38bdf8; font-weight:400; font-size:12px; font-variant-numeric:tabular-nums; line-height:1;" title="Batch ${escapeHtml(row.batch)}">${escapeHtml(row.batch)}</span>`
                },
                {
                  key: 'displayName',
                  label: 'STUDENT NAME',
                  className: 'col-sticky col-sticky-2 col-subhdr-students-data',
                  headerStyle: 'background: #1e293b !important; color: #ffffff !important;',
                  sortable: true,
                  width: '180px',
                  minWidth: '140px',
                  render: (val, row) => {
                    const origName = row.displayName || row.name || '';
                    const matrixName = (typeof formatMatrixStudentName === 'function')
                      ? formatMatrixStudentName(origName, 22)
                      : origName;
                    return `
                      <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; width:100%; display:flex; align-items:center; gap:2px; cursor:pointer;"
                           onclick="event.stopPropagation(); if (typeof window.showStudentDossierModal === 'function') window.showStudentDossierModal('${row.id}');"
                           title="${escapeHtml(origName)}&#10;PIN: ${escapeHtml(row.pin)}${row.hasRemedial ? '&#10;[Remedial] Student has remedial rate' : ''}&#10;Click to view official academic report">
                        <span style="color:var(--clr-text-1); font-size:12px; font-weight:400; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;">
                          ${escapeHtml(matrixName)}
                        </span>
                      </div>
                    `;
                  }
                },
                ...dynamicAsmCols,
                ...(isOverviewMode ? [
                  {
                    key: 'progressPct',
                    label: 'DONE',
                    shortLabel: 'DONE',
                    microLabel: 'DONE',
                    headerTitle: 'Overall Completion Rate % (Exams & Activities Completed)',
                    title: 'Overall Completion Rate %',
                    className: 'col-overall col-overall-prog col-subhdr-theme-overall',
                    headerStyle: 'background: #1e3a5f !important; color: #ffffff !important;',
                    sortable: true,
                    align: 'center',
                    width: '45px',
                    minWidth: '36px',
                    render: (val, row) => {
                      const progVal = Number(row.progressPct ?? 0);
                      const progColor = ((row.completedExamCount > 0 || row.completedCount > 0) && typeof getGradeColorByScore === 'function')
                        ? getGradeColorByScore(progVal)
                        : 'var(--clr-text-3)';
                      const tip = row.progressTooltip || `${row.completedCount}/${row.totalClassTests} Activities Done (${row.progressPct}%)`;
                      return `
                        <div style="color:${progColor}; font-size:12px; font-weight:400; font-variant-numeric:tabular-nums; line-height:1;" title="${escapeHtml(tip)}">${row.progressPct}%</div>
                      `;
                    }
                  },
                  {
                    key: 'totalEarnedScore',
                    label: 'PTS',
                    shortLabel: 'PTS',
                    microLabel: 'PTS',
                    className: 'col-overall col-overall-pts col-subhdr-theme-overall',
                    headerStyle: 'background: #1e3a5f !important; color: #ffffff !important;',
                    sortable: true,
                    align: 'center',
                    width: '42px',
                    minWidth: '34px',
                    render: (val, row) => {
                      const isExamTaken = (row.completedExamCount || row.completedWeeklyCount || 0) > 0;
                      if (!isExamTaken && (!val || val === 0)) {
                        return '<span class="text-muted" style="font-size:12px;">—</span>';
                      }
                      const scoreColor = (typeof getGradeColorByScore === 'function')
                        ? getGradeColorByScore(row.averageScorePct)
                        : '#ffffff';
                      // Rule 2.10: Points Half-Up Whole Integer Invariant (Math.round)
                      const displayScore = Math.round(Number(val || 0)).toString();
                      return `
                        <div style="font-weight:400; font-size:12px; font-variant-numeric:tabular-nums; line-height:1; color:${scoreColor};" title="Total Exam Points (All Completed Exams): ${displayScore} pts">
                          ${displayScore}
                        </div>
                      `;
                    }
                  },
                  {
                    key: 'grade',
                    label: 'GRD',
                    shortLabel: 'GRD',
                    microLabel: 'GRD',
                    className: 'col-overall col-overall-grade col-subhdr-theme-overall',
                    headerStyle: 'background: #1e3a5f !important; color: #ffffff !important;',
                    sortable: true,
                    align: 'center',
                    width: '32px',
                    minWidth: '26px',
                    render: (val, row) => {
                      if (!row.grade || row.grade === '—' || row.grade === '-') {
                        return '<span class="text-muted" style="font-size:12px;" title="No exams completed">&mdash;</span>';
                      }
                      const isGradeS = row.grade === 'S' || row.grade === '★';
                      if (isGradeS) {
                        return `<span class="grid-grade-val grid-grade-star" style="color:var(--grade-star); font-size:12px; font-weight:700; text-shadow:0 0 6px var(--grade-star-glow, rgba(255,45,135,0.4)); line-height:1;" title="Exam Grade ★ (100% Excellent)">★</span>`;
                      }
                      const cleanGrade = String(row.grade || '').trim().toUpperCase();
                      const gradeColor = (typeof getGradeColorByScore === 'function')
                        ? getGradeColorByScore(row.averageScorePct)
                        : (row.gradeColor || '#94a3b8');
                      return `
                        <span class="grid-grade-val" style="color:${gradeColor}; font-weight:700; font-size:12px; line-height:1;" title="Exam Grade ${cleanGrade}">${cleanGrade}</span>
                      `;
                    }
                  }
                ] : [])
              ]
            });

            requestAnimationFrame(() => {
              fitMatrixToScreen();
              setTimeout(fitMatrixToScreen, 60);
            });
          };

          // Dynamic responsive viewport sizing: fit all rows without vertical scroll & handle dynamic column width allocation
          const fitMatrixToScreen = () => {
            const grid = document.getElementById('class-attendance-grid');
            if (!grid) return;
            const rect = grid.getBoundingClientRect();
            const banner = document.getElementById('bottom-ad-banner');
            const bannerHeight = banner ? banner.offsetHeight : 80;
            const lowerPanel = document.querySelector('.attendance-matrix-toolbar.workspace-lower-panel');
            const isEditOn = Boolean(window._classManualScoreEditMode);
            const lowerPanelHeight = (isEditOn && lowerPanel && lowerPanel.offsetHeight > 0) ? (lowerPanel.offsetHeight + 10) : 0;
            // When Edit Mode is OFF, table footer sits flush as the sole 50px lower panel perfectly aligned with .sidebar-footer
            const availHeight = Math.max(260, window.innerHeight - rect.top - bannerHeight - lowerPanelHeight);
            grid.style.height = `${availHeight}px`;

            const rows = grid.querySelectorAll('tbody tr');
            const count = rows.length || 25;
            const headerHeight = 48; // super-header (~24px) + column header (~24px)
            const footerHeight = 50; // summary row strictly 50px height
            const scrollbarHeight = 14;
            const minRowHeight = 24;
            const maxRowHeight = 32;
            const calculatedHeight = (availHeight - headerHeight - footerHeight - scrollbarHeight) / count;
            const rowHeight = Math.min(maxRowHeight, Math.max(minRowHeight, calculatedHeight));

            grid.style.setProperty('--matrix-row-height', `${rowHeight.toFixed(2)}px`);

            // Standard uniform 12px font size and clean cell padding
            grid.style.setProperty('--matrix-font-size', '12px');
            grid.style.setProperty('--matrix-badge-font', '12px');
            grid.style.setProperty('--matrix-cell-padding', '3px 4px');

            // Dynamic horizontal column width allocation across available table width
            const wrap = grid.querySelector('.table-wrap');
            const tbl = wrap?.querySelector('table.datagrid-table');
            if (wrap && tbl) {
              const availWidth = wrap.clientWidth;
              const colgroup = tbl.querySelector('.datagrid-colgroup');
              const cols = colgroup ? Array.from(colgroup.querySelectorAll('col')) : [];
              const ths = Array.from(tbl.querySelectorAll('thead tr:not(.datagrid-super-header-row) th, thead tr.datagrid-super-header-row th[rowspan="2"]'));

              if (availWidth > 0 && cols.length > 0) {
                // Determine weight and minWidth for each column
                const colWeights = cols.map((c, idx) => {
                  const th = ths[idx];
                  const cls = ((c.className || '') + ' ' + (th?.className || '') + ' ' + (th?.getAttribute('data-key') || '')).toLowerCase();
                  if (cls.includes('col-sticky-2')) return { weight: 4.2, min: 140, isName: true };
                  if (cls.includes('col-sticky-1')) return { weight: 1.1, min: 36, isBatch: true };
                  if (cls.includes('col-theme-topic-task') || cls.includes('col-task')) return { weight: 0.65, min: 22 };
                  if (cls.includes('col-theme-task')) return { weight: 1.2, min: 40 };
                  if (cls.includes('col-exam-score') || cls.includes('col-test-theme-score') || cls.includes('col-overall-prog')) return { weight: 1.15, min: 36 };
                  if (cls.includes('col-exam-pts') || cls.includes('col-test-theme-total') || cls.includes('col-overall-pts')) return { weight: 1.05, min: 34 };
                  if (cls.includes('col-exam-grade') || cls.includes('col-test-theme-grade') || cls.includes('col-overall-grade')) return { weight: 0.82, min: 26 };
                  if (cls.includes('col-exam-status') || cls.includes('col-test-theme-status')) return { weight: 0.88, min: 28 };
                  return { weight: 1.0, min: 30 };
                });

                const totalWeight = colWeights.reduce((sum, w) => sum + w.weight, 0);
                let allocatedWidths = colWeights.map(w => Math.floor((w.weight / totalWeight) * availWidth));

                // Clamp each column to its calibrated minimum
                let totalAllocated = 0;
                allocatedWidths = allocatedWidths.map((w, idx) => {
                  const clamped = Math.max(colWeights[idx].min, w);
                  totalAllocated += clamped;
                  return clamped;
                });

                // Re-balance difference into flex-primary columns (especially Student Name) or non-clamped columns
                let diff = availWidth - totalAllocated;
                if (diff !== 0) {
                  const nameIdx = colWeights.findIndex(w => w.isName);
                  if (nameIdx >= 0 && (allocatedWidths[nameIdx] + diff) >= colWeights[nameIdx].min) {
                    allocatedWidths[nameIdx] += diff;
                  } else {
                    const flexCols = allocatedWidths.map((w, idx) => (!colWeights[idx].isBatch ? idx : -1)).filter(i => i >= 0);
                    const perCol = Math.floor(diff / (flexCols.length || 1));
                    let rem = diff - (perCol * flexCols.length);
                    flexCols.forEach(idx => {
                      allocatedWidths[idx] = Math.max(colWeights[idx].min, allocatedWidths[idx] + perCol);
                    });
                    if (rem !== 0 && flexCols.length > 0) {
                      allocatedWidths[flexCols[0]] += rem;
                    }
                  }
                }

                // Apply widths to <col> and <th>
                let currentBatchWidth = 45;
                cols.forEach((col, idx) => {
                  const w = allocatedWidths[idx];
                  col.style.setProperty('width', `${w}px`, 'important');
                  if (ths[idx]) {
                    ths[idx].style.setProperty('width', `${w}px`, 'important');
                    ths[idx].style.setProperty('min-width', `${colWeights[idx].min}px`, 'important');
                  }
                  if (colWeights[idx].isBatch) {
                    currentBatchWidth = w;
                  }
                });

                // Synchronize sticky offset for Student Name (.col-sticky-2)
                grid.style.setProperty('--batch-col-width', `${currentBatchWidth}px`);
                const sticky2Els = tbl.querySelectorAll('.col-sticky-2');
                sticky2Els.forEach(el => {
                  el.style.setProperty('left', `${currentBatchWidth}px`, 'important');
                });
              }

              // Clean standard scrollable layout (no forced zoom shrinking)
              wrap.style.overflowX = (wrap.scrollWidth > wrap.clientWidth + 2) ? 'auto' : 'hidden';
              const totalTableHeight = headerHeight + (count * rowHeight) + footerHeight;
              wrap.style.overflowY = totalTableHeight <= (availHeight - 5) ? 'hidden' : 'auto';
              tbl.style.zoom = '1';
            }

            if (!grid._matrixResizeObserver && typeof ResizeObserver !== 'undefined') {
              grid._matrixResizeObserver = new ResizeObserver(() => {
                requestAnimationFrame(fitMatrixToScreen);
              });
              grid._matrixResizeObserver.observe(grid);
            }
          };

          window._setAttendanceThemeFilter = (targetTheme) => {
            renderAttendanceGridMatrix(targetTheme);
          };

          window.renderAttendanceGridMatrix = renderAttendanceGridMatrix;

          if (!window._attendanceGridEditModeBound) {
            window._attendanceGridEditModeBound = true;
            window.addEventListener('admin-edit-mode-changed', () => {
              if (document.getElementById('class-attendance-grid') && typeof window.renderAttendanceGridMatrix === 'function') {
                window.renderAttendanceGridMatrix(window._classAttendanceThemeFilter || 'ALL');
              }
            });
          }

          if (typeof renderAttendanceTopPanel === 'function') {
            renderAttendanceTopPanel();
          }
          renderAttendanceGridMatrix(window._classAttendanceThemeFilter || 'ALL');

          if (window._attendanceResizeHandler) {
            window.removeEventListener('resize', window._attendanceResizeHandler);
          }
          window._attendanceResizeHandler = fitMatrixToScreen;
          window.addEventListener('resize', window._attendanceResizeHandler);

          const countBadge = document.getElementById('class-roster-count-badge');
          if (countBadge) countBadge.textContent = `${initialRosterData.length} Enrolled`;

          const batchFilterSelect = document.getElementById('class-roster-batch-filter');
          if (batchFilterSelect) {
            batchFilterSelect.addEventListener('change', (e) => {
              window._classRosterBatchFilter = e.target.value;
              const filtered = filterRosterData(studentsGridData, window._classRosterBatchFilter);
              if (attendanceGridInstance) attendanceGridInstance.updateData(filtered);
              if (countBadge) countBadge.textContent = `${filtered.length} Enrolled`;
              requestAnimationFrame(fitMatrixToScreen);
            });
          }


        }

        window._currentClassHubContext = {
          classId: classId || cid,
          classTests,
          studentsGridData,
          allAttempts,
          classTestSettings
        };
        window.syncClassHubLowerPanel = syncClassHubLowerPanel;
        window.renderAttendanceGridMatrix = renderAttendanceGridMatrix;

        window.showStudentTopicAttemptsModal = async function(studentId, studentName, themeCode, topicCode, component, targetTaskId) {
          const tc = String(themeCode || '').trim().toUpperCase();
          const comp = String(component || 'words').toLowerCase();
          const compLabel = comp === 'phrases' ? 'Phrases' : 'Words';

          // Quadrant color mapping
          const quadColors = {
            'A': (typeof TOPSCORE_QUAD_COLORS !== 'undefined' && TOPSCORE_QUAD_COLORS.A) || '#ff2d87',
            'B': (typeof TOPSCORE_QUAD_COLORS !== 'undefined' && TOPSCORE_QUAD_COLORS.B) || '#FF8C00',
            'C': (typeof TOPSCORE_QUAD_COLORS !== 'undefined' && TOPSCORE_QUAD_COLORS.C) || '#95ff00',
            'D': (typeof TOPSCORE_QUAD_COLORS !== 'undefined' && TOPSCORE_QUAD_COLORS.D) || 'var(--grade-star, #a855f7)'
          };
          const themeColor = quadColors[tc] || '#38bdf8';

          // Find task info from current class hub context or fallback
          const contextTests = window._currentClassHubContext?.classTests || [];
          let currentTask = contextTests.find(t => t.id === targetTaskId);
          if (!currentTask) {
            const topicMatches = contextTests.filter(t => String(t.payload?.topic_code || '').toUpperCase() === String(topicCode).toUpperCase() || (t.shell_code && t.shell_code.includes(topicCode)));
            if (comp === 'phrases') {
              currentTask = topicMatches.find(t => t.payload?.category === 'phrases' || /PHRASE/i.test(t.shell_code || t.title || '')) || topicMatches[0];
            } else {
              currentTask = topicMatches.find(t => !(t.payload?.category === 'phrases' || /PHRASE/i.test(t.shell_code || t.title || ''))) || topicMatches[0];
            }
          }
          const taskId = currentTask?.id || targetTaskId || '';
          const taskTitle = currentTask?.title || `Theme ${tc} Topic ${topicCode} ${compLabel}`;
          const taskCode = currentTask?.shell_code || `TOPIC-${topicCode}-${compLabel.toUpperCase()}`;
          const expectedMaxQ = (typeof getAsmExpectedMax === 'function' ? getAsmExpectedMax(currentTask) : (Number(currentTask?.payload?.total_questions || currentTask?.total_questions || 10))) || 10;
          // Dynamic target: read from task payload, then class context settings, fallback 7
          const _modalTaskReps = Number(currentTask?.payload?.task_repetitions || 0);
          const _modalCtxReps = Number(window._currentClassHubContext?.classTestSettings?.taskRepetitions || 0);
          const targetReps = _modalTaskReps || _modalCtxReps || 7;

          // Collect attempts from memory context
          const memoryAttempts = (window._currentClassHubContext?.allAttempts || []).filter(a => {
            if (a.student_id !== studentId) return false;
            if (taskId && (a.test_id === taskId || a.Test_id === taskId)) return true;
            if (currentTask && (a.test_id === currentTask.id || a.Test_id === currentTask.id)) return true;
            return false;
          });

          // Fetch freshest attempts directly from Supabase DB to ensure 100% accuracy
          let studentAttempts = [...memoryAttempts];
          try {
            const sb = await getSupabase();
            if (sb && (taskId || studentId)) {
              let q = sb.from('attempts')
                .select('id, test_id, score, total_questions, percentage, grade, status, started_at, submitted_at, created_at, forgiven_reason, is_forgiven')
                .eq('student_id', studentId);
              if (taskId) {
                q = q.eq('test_id', taskId);
              }
              const { data: dbAtts } = await q.order('created_at', { ascending: true });
              if (dbAtts && dbAtts.length > 0) {
                studentAttempts = dbAtts;
              }
            }
          } catch (err) {
            console.warn('Error fetching fresh attempts for modal:', err);
          }

          // Filter only valid submitted / evaluated attempts matching requested component (words vs phrases)
          const validAttempts = studentAttempts.filter(a => {
            const st = String(a.status || '').toLowerCase();
            if (!['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(st)) return false;
            const sec = typeof getAttemptSection === 'function' ? getAttemptSection(a) : 'words';
            return comp === 'phrases' ? sec === 'phrases' : sec !== 'phrases';
          });

          // Find best attempt
          let bestAttempt = null;
          validAttempts.forEach(a => {
            const aTotal = Number(a.total_questions || expectedMaxQ);
            const aScore = Number(a.score ?? 0);
            const aPct = Number(a.percentage ?? (aTotal > 0 ? (aScore / aTotal) * 100 : 0));
            if (!bestAttempt) {
              bestAttempt = { ...a, total: aTotal, score: aScore, pct: aPct };
            } else {
              const bScoreDiff = aScore - bestAttempt.score;
              if (bScoreDiff > 0 || (bScoreDiff === 0 && aPct > bestAttempt.pct)) {
                bestAttempt = { ...a, total: aTotal, score: aScore, pct: aPct };
              }
            }
          });

          const completedReps = validAttempts.length;
          const isTargetReached = completedReps >= targetReps;

          // Remove any existing modal
          const existing = document.getElementById('student-topic-attempts-modal-backdrop');
          if (existing) existing.remove();

          // Helper: format date
          function formatAttemptDate(dateStr) {
            if (!dateStr) return '—';
            try {
              const d = new Date(dateStr);
              if (isNaN(d.getTime())) return dateStr;
              const day = String(d.getDate()).padStart(2, '0');
              const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              const month = months[d.getMonth()];
              const year = d.getFullYear();
              const hours = String(d.getHours()).padStart(2, '0');
              const mins = String(d.getMinutes()).padStart(2, '0');
              return `${day} ${month} ${year}, ${hours}:${mins}`;
            } catch (_) {
              return dateStr;
            }
          }

          // Create Backdrop
          const backdrop = document.createElement('div');
          backdrop.id = 'student-topic-attempts-modal-backdrop';
          backdrop.className = 'modal-backdrop-custom';
          backdrop.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(5,8,15,0.78);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;animation:fadeIn 0.15s ease-out;';

          backdrop.innerHTML = `
            <div class="topic-attempts-dialog" style="max-width:820px; width:94vw; max-height:80vh; background:#0f172a; border:1.5px solid rgba(255,255,255,0.16); border-radius:12px; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 25px 60px -15px rgba(0,0,0,0.85);">
              <!-- Standardized 60px Title Area (§1.5.1 Centered Title & Perimeter Border) -->
              <div class="modal-header title-area" style="height:60px !important; min-height:60px !important; max-height:60px !important; padding:0 20px !important; border-bottom:1.5px solid rgba(255,255,255,0.16) !important; display:flex !important; align-items:center !important; justify-content:center !important; text-align:center !important; background:#1e293b !important; box-sizing:border-box !important; flex-shrink:0 !important; margin:0 !important;">
                <div style="display:inline-flex; align-items:center; gap:10px;">
                  <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${themeColor}; box-shadow:0 0 10px ${themeColor}; flex-shrink:0;"></span>
                  <h3 class="modal-title" style="margin:0 !important; font-family:var(--fm-font-display,'Inter',sans-serif) !important; font-size:16px !important; font-weight:800 !important; color:#ffffff !important; line-height:1 !important; letter-spacing:0.04em !important; text-transform:uppercase !important;">
                    THEME ${escapeHtml(tc)} · TOPIC ${escapeHtml(topicCode)} ${escapeHtml(compLabel).toUpperCase()} — ATTEMPT DETAILS
                  </h3>
                </div>
              </div>

              <!-- Scrollable Body (§1.5.3 Single-Screen Max Height Limit) -->
              <div class="modal-body" style="flex:1; overflow-y:auto; padding:20px 24px; background:#090d16; display:flex; flex-direction:column; gap:16px;">
                <!-- Header Summary Card -->
                <div style="background:#131c2e; border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:16px 20px; display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:16px;">
                  <div style="display:flex; flex-direction:column; gap:4px; min-width:200px;">
                    <div style="font-size:12px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.05em;">Student</div>
                    <div style="font-family:var(--fm-font-display,'Inter',sans-serif); font-size:16px; font-weight:800; color:#ffffff;">
                      ${escapeHtml(studentName)}
                    </div>
                    <div style="font-size:12px; color:#94a3b8; font-weight:500;">
                      ${escapeHtml(taskTitle)} <span style="color:#64748b;">(${escapeHtml(taskCode)})</span>
                    </div>
                  </div>

                  <!-- Quick Stats Strip -->
                  <div style="display:flex; align-items:center; gap:20px; flex-wrap:wrap;">
                    <!-- Repetitions Progress -->
                    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:8px 14px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:6px;">
                      <span style="font-size:12px; font-weight:700; color:#94a3b8; text-transform:uppercase;">Repetitions</span>
                      <span style="font-family:var(--fm-font-display,'Inter',sans-serif); font-size:16px; font-weight:800; color:${isTargetReached ? 'var(--grade-a)' : (completedReps > 0 ? '#38bdf8' : '#94a3b8')}; font-variant-numeric:tabular-nums;">
                        ${completedReps} / ${targetReps}
                      </span>
                    </div>

                    <!-- Best Rate -->
                    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:8px 14px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:6px;">
                      <span style="font-size:12px; font-weight:700; color:#94a3b8; text-transform:uppercase;">Best Rate</span>
                      <span style="font-family:var(--fm-font-display,'Inter',sans-serif); font-size:16px; font-weight:800; color:${bestAttempt ? (typeof getGradeColorByScore === 'function' ? getGradeColorByScore(bestAttempt.pct) : '#ffffff') : '#94a3b8'}; font-variant-numeric:tabular-nums;">
                        ${bestAttempt ? `${Math.round(bestAttempt.pct)}%` : '—'}
                      </span>
                    </div>

                    <!-- Best Grade Badge -->
                    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:8px 14px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:6px;">
                      <span style="font-size:12px; font-weight:700; color:#94a3b8; text-transform:uppercase; margin-bottom:2px;">Grade</span>
                      ${(() => {
                        if (!bestAttempt) return '<span style="color:#64748b; font-size:16px;">—</span>';
                        const gSym = String(bestAttempt.grade || (typeof calculateGrade === 'function' ? calculateGrade(bestAttempt.pct) : 'C')).trim();
                        const gColor = typeof getGradeColor === 'function' ? getGradeColor(gSym) : (TOPSCORE_COLORS[gSym] || '#94a3b8');
                        return `<span class="grade-circle" style="display:inline-flex; width:26px; height:26px; border-radius:50%; align-items:center; justify-content:center; font-family:var(--fm-font-display,'Inter',sans-serif); font-weight:900; font-size:12px; color:#0f172a; background:${gColor}; box-shadow:0 1px 4px rgba(0,0,0,0.3);">${escapeHtml(gSym)}</span>`;
                      })()}
                    </div>
                  </div>
                </div>

                <!-- Attempts Table Section -->
                <div style="border:1px solid rgba(255,255,255,0.08); border-radius:8px; overflow:hidden; background:#0f172a;">
                  <table class="topic-attempts-table" style="width:100%; border-collapse:collapse;">
                    <thead>
                      <tr>
                        <th style="width:60px; text-align:center;">ATTEMPT</th>
                        <th style="text-align:left; padding-left:16px;">SUBMISSION TIME</th>
                        <th style="width:90px; text-align:center;">ITEMS</th>
                        <th style="width:80px; text-align:center;">RATE</th>
                        <th style="width:80px; text-align:center;">PTS</th>
                        <th style="width:70px; text-align:center;">GRD</th>
                        <th style="width:120px; text-align:center;">STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${validAttempts.length > 0 ? validAttempts.map((att, idx) => {
                        const totalQ = Number(att.total_questions || expectedMaxQ);
                        const rawScore = Number(att.score ?? 0);
                        const pctVal = Number(att.percentage ?? (totalQ > 0 ? Math.round((rawScore / totalQ) * 100) : 0));
                        const roundedPts = Math.round(rawScore);
                        const gradeSym = String(att.grade || (typeof calculateGrade === 'function' ? calculateGrade(pctVal) : 'C')).trim();
                        const gradeBg = typeof getGradeColor === 'function' ? getGradeColor(gradeSym) : (TOPSCORE_COLORS[gradeSym] || '#94a3b8');
                        const rateColor = typeof getGradeColorByScore === 'function' ? getGradeColorByScore(pctVal) : '#ffffff';
                        const isBest = bestAttempt && att.id === bestAttempt.id;
                        const dateFormatted = formatAttemptDate(att.submitted_at || att.created_at);

                        return `
                          <tr class="${isBest ? 'is-best-attempt' : ''}">
                            <td style="font-weight:700; color:#ffffff;">
                              #${idx + 1}
                              ${isBest ? '<span style="font-size:12px; font-weight:800; color:var(--grade-a); margin-left:4px;">★ BEST</span>' : ''}
                            </td>
                            <td style="text-align:left; padding-left:16px; color:#cbd5e1; font-size:12px;">
                              ${escapeHtml(dateFormatted)}
                            </td>
                            <td style="font-weight:600; color:#ffffff;">
                              ${rawScore} / ${totalQ}
                            </td>
                            <td style="font-weight:700; color:${rateColor};">
                              ${pctVal}%
                            </td>
                            <td style="font-weight:700; color:${rateColor};">
                              ${roundedPts}
                            </td>
                            <td>
                              <span class="grade-circle" style="display:inline-flex; width:24px; height:24px; border-radius:50%; align-items:center; justify-content:center; font-family:var(--fm-font-display,'Inter',sans-serif); font-weight:900; font-size:12px; color:#0f172a; background:${gradeBg};">
                                ${escapeHtml(gradeSym)}
                              </span>
                            </td>
                            <td>
                              <span style="display:inline-flex; align-items:center; gap:4px; font-weight:700; font-size:12px; color:var(--grade-a);">
                                ${getSvgIcon('check-circle', 13)} COMPLETED
                              </span>
                            </td>
                          </tr>
                        `;
                      }).join('') : `
                        <tr>
                          <td colspan="7" style="padding:36px 20px; text-align:center; color:#64748b; font-style:italic;">
                            No submitted attempts recorded yet for ${escapeHtml(studentName)} on this topic component.
                          </td>
                        </tr>
                      `}
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Standardized 60px CTA Area (§1.5.2 & §1.5.4 Centered Single Button SSOT) -->
              <div class="modal-footer cta-area" style="height:60px !important; min-height:60px !important; max-height:60px !important; border-top:1.5px solid rgba(255,255,255,0.16) !important; display:flex !important; align-items:center !important; justify-content:center !important; background:#0f172a !important; flex-shrink:0 !important; margin:0 !important; padding:0 24px !important;">
                <button type="button" id="btn-close-topic-attempts-modal" style="height:36px; padding:0 36px; border-radius:6px; font-family:var(--fm-font-sans,'Inter',sans-serif); font-size:14px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; background:rgba(255,255,255,0.06); border:1.5px solid rgba(255,255,255,0.22); color:#f8fafc; cursor:pointer; transition:all 0.15s ease;">
                  CLOSE
                </button>
              </div>
            </div>
          `;

          // Close modal function
          function closeModal() {
            backdrop.remove();
            document.removeEventListener('keydown', handleKeyDown);
          }

          function handleKeyDown(e) {
            if (e.key === 'Escape') {
              closeModal();
            }
          }

          // Attach listeners
          backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) closeModal();
          });

          const closeBtn = backdrop.querySelector('#btn-close-topic-attempts-modal');
          if (closeBtn) {
            closeBtn.onclick = (e) => {
              e.stopPropagation();
              closeModal();
            };
          }

          document.addEventListener('keydown', handleKeyDown);
          document.body.appendChild(backdrop);
        };

        window.toggleAttendanceManualEditMode = (forceState = null) => {
          const btn = document.getElementById('btn-subpanel-manual');
          if (btn) {
            btn.click();
          } else if (forceState !== null) {
            window._classManualScoreEditMode = Boolean(forceState);
            if (window._classManualScoreEditMode) {
              document.body.classList.add('class-manual-edit-on');
            } else {
              document.body.classList.remove('class-manual-edit-on');
            }
            if (typeof window.syncClassHubLowerPanel === 'function') window.syncClassHubLowerPanel('attendance');
            if (typeof window.renderAttendanceGridMatrix === 'function') window.renderAttendanceGridMatrix(window._classAttendanceThemeFilter || 'ALL');
          }
        };

        // Delegated listener for the 3 Sub Panel Action Buttons: Manual (Cyan), Remedi (Yellow), Forgive (Red)
        if (!window._classHubSubpanelDelegationBound) {
          window._classHubSubpanelDelegationBound = true;
          document.addEventListener('click', async (e) => {
            const manualBtn = e.target.closest('#btn-subpanel-manual');
            if (manualBtn) {
              e.preventDefault();
              e.stopPropagation();

              if (window._classManualScoreEditMode) {
                // User pressed Done Editing (Manual)
                if (window.hasDirtyManualDrafts && window.hasDirtyManualDrafts()) {
                  window.openManualSavePrompt(
                    // Save action
                    async () => {
                      try {
                        await window.saveAllManualDrafts();
                        window._classManualScoreEditMode = false;
                        document.body.classList.remove('class-manual-edit-on');
                        if (typeof window.syncClassHubLowerPanel === 'function') {
                          window.syncClassHubLowerPanel('attendance');
                        }
                        if (window.renderClassHub) {
                          await window.renderClassHub(document.getElementById('admin-content-area'));
                        }
                      } catch (err) {
                        console.error('Failed to save manual edits:', err);
                      }
                    },
                    // Cancel / Discard action
                    () => {
                      window._manualInputState.drafts = {};
                      window._classManualScoreEditMode = false;
                      document.body.classList.remove('class-manual-edit-on');
                      if (typeof showToast === 'function') showToast('Edit changes discarded.', 'info');
                      if (typeof window.syncClassHubLowerPanel === 'function') {
                        window.syncClassHubLowerPanel('attendance');
                      }
                      if (typeof window.renderAttendanceGridMatrix === 'function') {
                        window.renderAttendanceGridMatrix(window._classAttendanceThemeFilter || 'ALL');
                      }
                    }
                  );
                } else {
                  window._classManualScoreEditMode = false;
                  document.body.classList.remove('class-manual-edit-on');
                  if (typeof showToast === 'function') showToast('Table Edit completed and locked.', 'info');
                  if (typeof window.renderAttendanceGridMatrix === 'function') {
                    window.renderAttendanceGridMatrix(window._classAttendanceThemeFilter || 'ALL');
                  }
                  if (typeof window.syncClassHubLowerPanel === 'function') {
                    window.syncClassHubLowerPanel('attendance');
                  }
                }
              } else {
                window._classManualScoreEditMode = true;
                window._classRemedialEditMode = false;
                window._classForgivenEditMode = false;
                document.body.classList.add('class-manual-edit-on');
                if (typeof showToast === 'function') showToast('Table Edit Mode ACTIVE: Enter scores/points directly. Press "Done Editing" when finished to save.', 'info');
                if (typeof window.renderAttendanceGridMatrix === 'function') {
                  window.renderAttendanceGridMatrix(window._classAttendanceThemeFilter || 'ALL');
                }
                if (typeof window.syncClassHubLowerPanel === 'function') {
                  window.syncClassHubLowerPanel('attendance');
                }
              }
              return;
            }

            const remBtn = e.target.closest('#btn-subpanel-remedial');
            if (remBtn) {
              e.preventDefault();
              e.stopPropagation();
              window._classRemedialEditMode = !window._classRemedialEditMode;
              if (window._classRemedialEditMode) {
                window._classManualScoreEditMode = false;
                window._classForgivenEditMode = false;
                document.body.classList.remove('class-manual-edit-on');
                if (typeof showToast === 'function') showToast('Remedial Table Mode ACTIVE: Check the box beside any Grade to apply Remedial (Grade R, cap 60%).', 'info');
              } else {
                if (typeof showToast === 'function') showToast('Remedial Table Mode closed.', 'info');
              }
              if (typeof window.renderAttendanceGridMatrix === 'function') {
                window.renderAttendanceGridMatrix(window._classAttendanceThemeFilter || 'ALL');
              }
              if (typeof window.syncClassHubLowerPanel === 'function') {
                window.syncClassHubLowerPanel('attendance');
              }
              return;
            }

            const forgiveBtn = e.target.closest('#btn-subpanel-forgiven');
            if (forgiveBtn) {
              e.preventDefault();
              e.stopPropagation();
              window._classForgivenEditMode = !window._classForgivenEditMode;
              if (window._classForgivenEditMode) {
                window._classManualScoreEditMode = false;
                window._classRemedialEditMode = false;
                document.body.classList.remove('class-manual-edit-on');
                if (typeof showToast === 'function') showToast('Forgiven Table Mode ACTIVE: Check the box beside any Grade to grant Forgiven Waiver (Grade F).', 'info');
              } else {
                if (typeof showToast === 'function') showToast('Forgiven Table Mode closed.', 'info');
              }
              if (typeof window.renderAttendanceGridMatrix === 'function') {
                window.renderAttendanceGridMatrix(window._classAttendanceThemeFilter || 'ALL');
              }
              if (typeof window.syncClassHubLowerPanel === 'function') {
                window.syncClassHubLowerPanel('attendance');
              }
              return;
            }
          });

          window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
              if (window._classManualScoreEditMode) {
                if (window.hasDirtyManualDrafts && window.hasDirtyManualDrafts()) {
                  window.openManualSavePrompt(
                    async () => {
                      try {
                        await window.saveAllManualDrafts();
                        window._classManualScoreEditMode = false;
                        document.body.classList.remove('class-manual-edit-on');
                        if (typeof window.syncClassHubLowerPanel === 'function') {
                          window.syncClassHubLowerPanel('attendance');
                        }
                        if (window.renderClassHub) {
                          await window.renderClassHub(document.getElementById('admin-content-area'));
                        }
                      } catch (err) {
                        console.error('Failed to save manual edits:', err);
                      }
                    },
                    () => {
                      window._manualInputState.drafts = {};
                      window._classManualScoreEditMode = false;
                      document.body.classList.remove('class-manual-edit-on');
                      if (typeof showToast === 'function') showToast('Edit changes discarded.', 'info');
                      if (typeof window.syncClassHubLowerPanel === 'function') {
                        window.syncClassHubLowerPanel('attendance');
                      }
                      if (typeof window.renderAttendanceGridMatrix === 'function') {
                        window.renderAttendanceGridMatrix(window._classAttendanceThemeFilter || 'ALL');
                      }
                    }
                  );
                } else {
                  window._classManualScoreEditMode = false;
                  document.body.classList.remove('class-manual-edit-on');
                  if (typeof window.renderAttendanceGridMatrix === 'function') {
                    window.renderAttendanceGridMatrix(window._classAttendanceThemeFilter || 'ALL');
                  }
                  if (typeof window.syncClassHubLowerPanel === 'function') {
                    window.syncClassHubLowerPanel('attendance');
                  }
                }
              } else if (window._classRemedialEditMode || window._classForgivenEditMode) {
                window._classRemedialEditMode = false;
                window._classForgivenEditMode = false;
                if (typeof window.renderAttendanceGridMatrix === 'function') {
                  window.renderAttendanceGridMatrix(window._classAttendanceThemeFilter || 'ALL');
                }
                if (typeof window.syncClassHubLowerPanel === 'function') {
                  window.syncClassHubLowerPanel('attendance');
                }
              }
            }
          });
        }

        document.getElementById('btn-sync-class-tests')?.addEventListener('click', async () => {
          const btn = document.getElementById('btn-sync-class-tests');
          if (!btn) return;
          const targetClassId = classId || cid;
          if (!targetClassId) return;

          try {
            const oldHtml = btn.innerHTML;
            btn.innerHTML = `${getSvgIcon('clock', 14)} Syncing...`;
            btn.disabled = true;
            if (window.showLoading) window.showLoading(`Synchronizing tests for ${currentClass?.name || 'Class'}...`);

            const { syncAllCurriculumTests, clearAdminCache, clearApiCache } = await import('../api.js?v=20261124_v683');
            if (window._classHubCache) delete window._classHubCache[targetClassId];
            clearAdminCache();
            clearApiCache();
            const res = await syncAllCurriculumTests({ classId: targetClassId, force: true });
            clearAdminCache();
            clearApiCache();
            if (window._classHubCache) delete window._classHubCache[targetClassId];

            if (window.hideLoading) window.hideLoading();
            btn.innerHTML = oldHtml;
            btn.disabled = false;

            const msg = `Class Tests synced: ${res.createdCount} new test shells created, ${res.updatedCount} updated!`;
            if (window.showToast) window.showToast(msg, 'success');
            else alert(msg);

            if (window.renderClassHub) {
              window.renderClassHub(document.getElementById('admin-content-area'));
            }
          } catch (err) {
            if (window.hideLoading) window.hideLoading();
            btn.innerHTML = `${getSvgIcon('refresh', 14)} Sync Tests`;
            btn.disabled = false;
            console.error(err);
            if (window.showToast) window.showToast('Sync failed: ' + err.message, 'error');
            else alert('Sync failed: ' + err.message);
          }
        });


        document.getElementById('btn-open-generator-from-class')?.addEventListener('click', async () => {
          try {
            const { openAutoGenerateModal } = await import('./auto-gen-modal.js?v=20261106_v140');
            await openAutoGenerateModal({
              explicitClassId: classId,
              onComplete: () => {
                if (window._classHubCache) delete window._classHubCache[classId];
                window.renderClassHub(document.getElementById('admin-content-area'));
              }
            });
          } catch (err) {
            console.error(err);
            showToast('Failed to open wizard: ' + err.message, 'error');
          }
        });

        window._classHubCache[classId] = { timestamp: Date.now() };

      } catch (e) {
        console.error('[renderClassHub error]:', e);
        area.innerHTML = `<div class="empty-state"><p style="color:var(--grade-e);">Failed to load class data: ${escapeHtml(e?.message || 'Unknown error')}</p></div>`;
      }
    }
    window.renderClassHub = renderClassHub;

    // ── CLASS HUB OVERRIDE PREREQUISITE & REMEDIAL MODAL (DISABLED FOR PURE ACADEMIC DATA) ──
    window._openClassOverridePrereqModal = function(opts = {}) {
      return;
    };



    async function renderClassDetail(area) {
      if (!window.currentClassContext) {
        try {
          const savedCtx = sessionStorage.getItem('topscore_current_class_context');
          if (savedCtx) window.currentClassContext = JSON.parse(savedCtx);
        } catch (_) {}
      }
      if (!window.currentClassContext) {
        return loadSection('class-hub');
      }

      const { cid, lid, cname, lname, program, institution } = window.currentClassContext;
      try {
        sessionStorage.setItem('topscore_current_class_context', JSON.stringify(window.currentClassContext));
      } catch (_) {}
      const title = `${cname} - ${lname}`;
      const subtitle = program && institution ? `${institution} → ${program}` : 'Manage tests and vocabulary for this class';

      area.innerHTML = `
        <div class="section-header">
          <div>
            <h2 class="section-title">${escapeHtml(title)}</h2>
            <p class="section-subtitle">${escapeHtml(subtitle)}</p>
          </div>
        </div>
        <div class="dashboard-grid mt-4">
          <div class="stat-card" style="cursor:pointer;" onclick="window.loadSection('tests')">
            <div class="stat-icon">${getSvgIcon('file-text', 24)}</div>
            <div class="stat-value">Manage Tests</div>
            <div class="stat-label">View all tests & assignments</div>
          </div>
          <div class="stat-card" style="cursor:pointer;" onclick="window.loadSection('vocab_vault')">
            <div class="stat-icon">${getSvgIcon('book-open', 24)}</div>
            <div class="stat-value">Vocab Vault</div>
            <div class="stat-label">Manage word lists & phrases</div>
          </div>
        </div>
        <div class="card mt-4" style="padding: 2rem; text-align: center;">
          <h3 style="margin-bottom: 1rem;">Context Loaded: ${escapeHtml(title)}</h3>
          <p class="text-muted">You can navigate to <strong>Manage Tests</strong> or <strong>Vocab Vault</strong> from the buttons above, or use the sidebar.</p>
        </div>
      `;
    }

    window.addEventListener('popstate', (e) => {
      const hash = window.location.hash.substring(1);
      const parsed = parseHashRoute(hash);
      if (parsed.section === 'profile-student' && parsed.studentId) {
        const batchStudentIds = e.state?.batchStudentIds || [];
        openStudentProfile(parsed.studentId, batchStudentIds, true);
        return;
      }
      const targetSec = aliasSectionMap[parsed.section] || parsed.section;
      if (targetSec) {
        applySubRouteState(targetSec, parsed.subTab, parsed.params, parsed.section);
        loadSection(targetSec, true);
      }
    });

    function activatePrimaryTab(panel) {
      // Update mobile bottom tabs (these exist in the DOM)
      mobileTabs.forEach(t => t.classList.toggle('active', t.dataset.panel === panel));
      // Update topbar breadcrumb domain label
      const domainEl = document.getElementById('topbar-domain');
      if (domainEl) {
        const domainNameMap = {
          admin: 'ADMIN',
          board: 'BOARD',
          class: 'CLASS',
          tests: 'CLASS', // Legacy fallback
          desk: 'DATA',
          data: 'DATA',
          academy: 'BOARD' // Legacy fallback
        };
        domainEl.textContent = domainNameMap[panel.toLowerCase()] || panel.toUpperCase();
      }
    }

    // ──── Topbar Domain Switcher Click (removed — no domain pill elements exist) ────

    // ──── Mobile Bottom Tab Switching ────
    mobileTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const panel = tab.dataset.panel;
        activatePrimaryTab(panel);
        loadSection(tabDefaultSections[panel]);
      });
    });

    // ──── Sidebar Toggle for Mobile ────
    const sidebarToggleBtn = document.getElementById('sidebar-toggle');
    const adminSidebar = document.getElementById('admin-sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    function openSidebar() {
      adminSidebar.classList.add('open');
      sidebarOverlay.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }
    function closeSidebar() {
      adminSidebar.classList.remove('open');
      sidebarOverlay.classList.add('hidden');
      document.body.style.overflow = '';
    }

    sidebarToggleBtn?.addEventListener('click', () => {
      adminSidebar.classList.contains('open') ? closeSidebar() : openSidebar();
    });
    sidebarOverlay?.addEventListener('click', closeSidebar);

    // ──── Sub-nav item click ────
    document.querySelectorAll('.admin-nav-item').forEach(item => {
      item.addEventListener('click', () => {
        document.querySelectorAll('.admin-nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        loadSection(item.dataset.sub);
        if (window.innerWidth <= 1024) closeSidebar();
      });
    });

    // ──── Global String & HTML Utilities ────
    // escapeHtml / escHtml imported canonically

    function getRowVal(row, possibleKeys) {
      if (!row || typeof row !== 'object') return '';
      const rowKeys = Object.keys(row);
      for (const k of possibleKeys) {
        const targetNorm = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const rk of rowKeys) {
          if (rk.toLowerCase().replace(/[^a-z0-9]/g, '') === targetNorm) {
            const v = row[rk];
            if (v !== undefined && v !== null && String(v).trim() !== '') {
              return String(v).trim();
            }
          }
        }
      }
      return '';
    }

    function formatTestDisplayName(Test, classContext = '') {
      if (!Test) return '—';
      if (typeof formatTestDisplay === 'function') {
        const formatted = formatTestDisplay(Test);
        if (formatted?.fullTitle) return formatted.fullTitle;
      }
      return Test.title || Test.name || 'Test';
    }
    window.formatTestDisplayName = formatTestDisplayName;

    // ── DB Connection Status Banner ──
    async function initConnectionBanner() {
      const banner = document.getElementById('db-connection-banner');
      const statusDot = document.getElementById('db-status-dot');
      const statusText = document.getElementById('db-status-text');
      if (!banner) return;

      // Show checking state — use CSS classes, not inline styles
      statusText.textContent = 'Checking database connection...';

      const result = await testSupabaseConnection();
      if (result.connected) {
        statusDot.classList.add('connected');
        banner.classList.add('connected');
        statusText.innerHTML = `<strong>Connected to Supabase</strong> &mdash; data is saved permanently to the cloud`;
        setTimeout(() => { banner.style.display = 'none'; }, 4000); // Auto-hide when connected
      } else {
        statusDot.classList.add('error');
        banner.classList.add('error');
        if (result.mode === 'demo') {
          statusText.innerHTML = `<strong>Demo / Offline Mode</strong> &mdash; data is in-memory only and will be lost on page reload`;
        } else {
          statusText.innerHTML = `<strong>Database Error</strong> &mdash; ${result.error}. <a href="docs/DATABASE_SCHEMA.md" target="_blank" style="color:var(--grade-e);">Check setup guide</a>`;
        }
      }
    }

    function formatAnswerType(atype) {
      if (!atype) return 'Written Test';
      if (atype === 'speech_to_text' || atype === 'spoken') return 'Speaking Test';
      if (atype === 'written') return 'Written Test';
      if (atype === 'multiple_choice' || atype === 'selection') return 'Selection';
      if (atype === 'dropdown') return 'Dropdown';
      return atype.replace('_', ' ');
    }

    var _currentSection = null;
    var _loadSectionSeq = 0;
    async function loadSection(section, skipHistory = false) {
      if (!section) return;
      if (isTutorRole()) {
        const allowedSections = ['class-hub', 'test-access'];
        if (!allowedSections.includes(section)) {
          showToast('Restricted: Tutor access is limited to Class Hub (Test Sessions & Grades).', 'warning');
          section = 'class-hub';
        }
      }
      const activeTenant = getActiveTenant();
      if (activeTenant !== 'ALL') {
        const allowedForRegularAdmin = ['class-hub', 'test-access', 'students', 'progress-view', 'alumni'];
        if (!allowedForRegularAdmin.includes(section)) {
          showToast(`Restricted: ${activeTenant} Regular Admin access is limited to Classes and Student Rosters.`, 'warning');
          section = 'class-hub';
        }
      }
      const parsed = parseHashRoute(section);
      let rawSection = parsed.section || section;
      section = aliasSectionMap[rawSection] || rawSection;
      if (isTutorRole() && !['class-hub', 'test-access'].includes(section)) {
        section = 'class-hub';
        rawSection = 'class-hub';
      }
      applySubRouteState(section, parsed.subTab, parsed.params, rawSection);

      const thisSeq = ++_loadSectionSeq;
      try {
        localStorage.setItem('topscore_admin_last_section', rawSection);
        sessionStorage.setItem('topscore_admin_last_section', rawSection);
      } catch (err) {}
      if (!skipHistory && window.location.hash.substring(1) !== rawSection) {
        window.history.pushState(null, '', `#${rawSection}`);
      }
      _currentSection = section;
      window._activeSectionAlias = rawSection; // the hash alias
      window._activeSection = section; // the actual section

      if (typeof window._cleanupProfileView === 'function') {
        window._cleanupProfileView();
        window._cleanupProfileView = null;
      }
      if (section !== 'tests') {
        const d1 = document.getElementById('tac-pacing-drawer');
        if (d1) d1.remove();
        const d2 = document.getElementById('tac-pacing-drawer-backdrop');
        if (d2) d2.remove();
      }
      const domain = sectionDomainMap[section] || 'BOARD';
      const panel = domainToPanelMap[domain] || domain.toLowerCase();
      activatePrimaryTab(panel);

      // Highlight active sub-nav item (support direct key and alias), excluding dynamic sidebar class and program items
      document.querySelectorAll('.admin-nav-item:not(.sidebar-class-item):not(.sidebar-program-item)').forEach(i => {
        const sub = i.dataset.sub;
        const mappedSub = aliasSectionMap[sub] || sub;
        i.classList.toggle('active', sub === rawSection || sub === section || mappedSub === section);
      });
      // If we navigate away from class-hub, clear the active state of all class items
      if (rawSection !== 'class-hub') {
        document.querySelectorAll('.sidebar-class-item').forEach(i => i.classList.remove('active'));
      } else {
        const selId = window._selectedClassId;
        document.querySelectorAll('.sidebar-class-item').forEach(i => {
          i.classList.toggle('active', !selId || i.getAttribute('data-class-id') === selId);
        });
      }

      // If we navigate away from students, clear the active state of all program items
      if (rawSection !== 'students') {
        document.querySelectorAll('.sidebar-program-item').forEach(i => i.classList.remove('active'));
      } else {
        const selProgId = window._filterProgramId || localStorage.getItem('topscore_selected_program_id');
        document.querySelectorAll('.sidebar-program-item').forEach(i => {
          i.classList.toggle('active', !selProgId || i.getAttribute('data-program-id') === selProgId);
        });
      }
      const alumniNav = document.querySelector('.admin-nav-item[data-sub="alumni"]');
      if (alumniNav) {
        alumniNav.classList.toggle('active', rawSection === 'alumni' || section === 'alumni');
      }

      // Reset topbar container with default section title (or views will elevate their KPI tabs)
      const topbarTabsEl = document.getElementById('topbar-tabs-container');
      if (topbarTabsEl) {
        let secTitle = sectionTitles[section] || section;
        if (rawSection === 'alumni' || section === 'alumni') {
          secTitle = 'Alumni';
        } else if (rawSection === 'students' && (window._selectedProgramName || localStorage.getItem('topscore_selected_program_name'))) {
          secTitle = (window._selectedProgramName || localStorage.getItem('topscore_selected_program_name'));
        }
        topbarTabsEl.innerHTML = `<div class="topbar-default-title" id="topbar-title">${secTitle}</div>`;
      }
      // Reset bottom infobar by default on section change
      if (window.setBottomInfobar) window.setBottomInfobar(null, null);
      const area = document.getElementById('admin-content-area');
      const isSwitchingToClassHub = section === 'class-hub';
      const isSameSection = area.dataset.currentSection === section;
      // Do not wipe area with blanket spinner if entering class-hub (it has intelligent fresh-cache rendering)
      // or if re-rendering within the same section/subtab
      if (!isSwitchingToClassHub && (!isSameSection || !area.children.length)) {
        area.innerHTML = getLoadingStateHtml('Loading...');
      }
      area.dataset.currentSection = section;


      const addRecBtn = document.getElementById('add-record-btn');
      if (addRecBtn) addRecBtn.style.display = 'none';

      try {
        switch(section.toLowerCase()) {
          case 'board':
          case 'organization':
          case 'curriculum-org':
            await renderCurriculum(area);
            break;
          case 'curriculum':
          case 'classes-hub':
            await renderClassesHub(area);
            break;
          case 'institutions':
          case 'batches':
            return window.loadSection ? window.loadSection('organization') : renderCurriculum(area);
          case 'levels':
          case 'classes':             await renderClassList(area); break;
          case 'classes-org':         await _renderClassesModule(area); break;
          case 'class_instances':     return loadSection('class-hub');
          case 'class-detail':        await renderClassDetail(area); break;
          case 'topics':
          case 'question_types':
          case 'vocab_vault':             await renderVocabularyVault(area); break;
          case 'modules':                 await renderModules(area); break;
          case 'alumni':
            window._switchStudentTab = () => window.loadSection('alumni');
            window._isAlumniMainPanel = true;
            window._filterBatchStatus = 'alumni';
            await _renderStudentsModule(area, { isAlumniPanel: true });
            break;
          case 'students':
            window._isAlumniMainPanel = false;
            window._switchStudentTab = () => window.loadSection('students');
            await _renderStudentsModule(area);
            break;

          case 'questions':
          case 'import-questions':
          case 'export-questions':    return loadSection('vocab_vault');

          case 'results':             await renderResults(area); break;
          case 'progress-view':       return loadSection('students');
          case 'audit':
            window._activeSettingTab = 'audit';
            try { localStorage.setItem('topscore_admin_settings_tab', 'audit'); } catch (_) {}
            return loadSection('settings');
          case 'health':
          case 'recalibrator':
            window._activeSettingTab = 'health';
            try { localStorage.setItem('topscore_admin_settings_tab', 'health'); } catch (_) {}
            return loadSection('settings');
          case 'recycle':
            window._activeSettingTab = 'recycle';
            try { localStorage.setItem('topscore_admin_settings_tab', 'recycle'); } catch (_) {}
            return loadSection('settings');
          case 'settings':
            const settingTabs = [
              { id: 'site',    icon: getSvgIcon('lock', 14),  title: 'Site Settings',  label: 'Cost Guard & Engine' },
              { id: 'audit',   icon: getSvgIcon('shield', 14),  title: 'Activity Logs',   label: 'Audit & Security Trail' },
              { id: 'health',  icon: getSvgIcon('activity', 14),  title: 'Data Health',     label: 'Integrity Diagnostics' },
              { id: 'recycle', icon: getSvgIcon('trash', 14), title: 'Recycle Bin',     label: 'Restoration Vault' }
            ];
            let activeSettingTab = window._activeSettingTab || localStorage.getItem('topscore_admin_settings_tab') || 'site';
            const renderSettingSection = async () => {
              // Elevate settings navigation to topbar
              if (window.setTopbarTabs) {
                window.setTopbarTabs(settingTabs, activeSettingTab, 'window._switchSettingTab');
              }
              if (window.setBottomInfobar) {
                window.setBottomInfobar(
                  `<div style="display:inline-flex; align-items:center; gap:8px; font-size:12px; color:#94a3b8; font-weight:600;"><span>${getSvgIcon('lock', 14)} TopsCore System Settings &amp; Security Protocols</span></div>`,
                  `<div style="display:inline-flex; align-items:center; gap:8px;"><span style="font-size: 12px; color:#64748b; font-weight:600;">Build 2026.11 • Operational</span></div>`
                );
              }
              area.innerHTML = `<div id="unified-settings-content" style="padding-top: 0.75rem;"></div>`;
              const sArea = area.querySelector('#unified-settings-content');
              if (activeSettingTab === 'site') await renderSettings(sArea);
              else if (activeSettingTab === 'audit') await renderAuditLog(sArea);
              else if (activeSettingTab === 'health') await renderDataHealth(sArea);
              else if (activeSettingTab === 'recycle') await renderRecycleBin(sArea);
            };
            window._switchSettingTab = async (tabId) => {
              activeSettingTab = tabId;
              window._activeSettingTab = tabId;
              try {
                localStorage.setItem('topscore_admin_settings_tab', tabId);
                if (window.history && window.history.replaceState) {
                  window.history.replaceState(null, '', `#settings?tab=${tabId}`);
                }
              } catch (_) {}
              await renderSettingSection();
            };
            await renderSettingSection();
            break;
          case 'system-palette':
          case 'palette':
          case 'interface':
          case 'interface-settings':
          case 'interface-setting':
            const interfaceTabs = [
              { id: 'settings', label: 'Colour Designs' },
              { id: 'architecture', label: 'Architecture Designs' },
              { id: 'table_designs', label: 'Table Designs' }
            ];
            window._activeInterfaceTab = window._activeInterfaceTab || 'settings';
            if (window.setTopbarTabs) {
              window.setTopbarTabs(interfaceTabs, window._activeInterfaceTab, 'window._switchInterfaceTab');
            }
            window._switchInterfaceTab = async (tabId) => {
              window._activeInterfaceTab = tabId;
              if (window.setTopbarTabs) {
                window.setTopbarTabs(interfaceTabs, tabId, 'window._switchInterfaceTab');
              }
              const iArea = area.querySelector('#unified-interface-content');
              if (!iArea) return;
              if (tabId === 'architecture') {
                await renderSystemArchitecture(iArea);
              } else if (tabId === 'table_designs') {
                await renderTableDesigns(iArea);
              } else {
                await renderInterfaceSettings(iArea);
              }
            };
            area.innerHTML = `<div id="unified-interface-content" style="height:100%; min-height:0; display:flex; flex-direction:column; box-sizing:border-box; overflow:hidden;"></div>`;
            const iArea = area.querySelector('#unified-interface-content');
            if (window._activeInterfaceTab === 'architecture') {
              await renderSystemArchitecture(iArea);
            } else if (window._activeInterfaceTab === 'table_designs') {
              await renderTableDesigns(iArea);
            } else {
              await renderInterfaceSettings(iArea);
            }
            break;
          case 'system-glossary':
          case 'system_glossary':
          case 'glossary':
            await renderSystemGlossary(area);
            break;
          case 'exam-rules':
          case 'exam_rules':
          case 'assessment-rules':
          case 'assessment_rules':
          case 'assessment-matrix':
            await renderExamRules(area);
            break;
          case 'student-registration':
          case 'students-registration':
          case 'import-students':
            await renderStudentsRegistration(area);
            break;
          case 'test-hub':
          case 'import_ai_tests':
          case 'tests':
            window._classHubActiveTab = 'tests';
            try { localStorage.setItem('topscore_admin_class_hub_tab', 'tests'); } catch (_) {}
            await renderClassHub(area);
            break;
          case 'class-hub':           await renderClassHub(area); break;
          case 'test-access':
            window._classHubActiveTab = 'test-sessions';
            try { localStorage.setItem('topscore_admin_class_hub_tab', 'test-sessions'); } catch (_) {}
            await renderClassHub(area);
            break;
          case 'class-panel':         await renderClassPanel(area); break;
          case 'dashboard':           await renderDashboard(area); break;

          default: area.innerHTML = `<div class="empty-state"><div class="empty-state__icon" style="color:#64748b;">${getSvgIcon('settings', 32)}</div><h3>${sectionTitles[section] || section}</h3><p>This section is under development.</p></div>`;
        }
      } catch(e) {
        console.error('[loadSection] CAUGHT ERROR:', e);
        if (thisSeq !== _loadSectionSeq) {
          console.warn('[loadSection] superseded during loading:', section);
          return;
        }
        console.error('[loadSection] error:', section, e);
        area.innerHTML = `
          <div class="empty-state card mt-4" style="padding:3.5rem 1.5rem; text-align:center; max-width:600px; margin:2rem auto; border:1px solid rgba(239,68,68,0.3); background:rgba(239,68,68,0.04);">
            <div style="font-size: 30px; margin-bottom:1rem; color:var(--grade-e);">${getSvgIcon('alert-triangle', 30)}</div>
            <h3 style="color:var(--clr-text-1); font-size: 16px; font-weight:700; margin-bottom:0.5rem;">Section Loading Interrupted</h3>
            <p class="text-danger text-sm" style="margin-bottom:1.5rem; word-break:break-word;">${escapeHtml(e?.message || 'An unexpected error occurred.')}</p>
            <div class="d-flex gap-3 justify-center">
              <button class="btn btn-primary btn-sm" onclick="window.loadSection('${section}')">&#8635; Retry Section</button>
              <button class="btn btn-secondary btn-sm" onclick="window.location.reload()">Reload Application</button>
            </div>
          </div>
        `;
      }
    }

    // ── INSTITUTIONS ──

    // ── CLASS NAV PANEL (secondary left panel within CLASS domain) ──
    let _classNavLoaded = false;

    async function initClassNavPanel() {
      const list = document.getElementById('cnav-class-list');
      if (!list) return;

      // Wire fixed items only once
      if (!_classNavLoaded) {
        document.querySelectorAll('#cnav-fixed .cnav-item').forEach(el => {
          el.addEventListener('click', () => {
            setActiveCnavItem(el);
            loadSection(el.dataset.cnav);
          });
        });
      }

      syncCnavActive();
      if (_classNavLoaded) return;
      _classNavLoaded = true;

      list.innerHTML = '<div style="padding:0.5rem 1rem;font-size: 12px;color:var(--clr-text-muted);">Loading…</div>';
      try {
        const classes = await adminFetchAll('classes', 'id, name');
        list.innerHTML = '';
        if (!classes || !classes.length) {
          list.innerHTML = '<div style="padding:0.5rem 1rem;font-size: 12px;color:var(--clr-text-muted);">No classes</div>';
          return;
        }
        classes.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        classes.forEach(cls => {
          const el = document.createElement('div');
          el.className = 'cnav-item';
          el.dataset.classId = cls.id;
          el.textContent = cls.name;
          el.addEventListener('click', () => {
            setActiveCnavItem(el);
            window._selectedClassId   = cls.id;
            window._selectedClassName = cls.name;
            loadSection('class-panel');
          });
          list.appendChild(el);
        });
        syncCnavActive();
      } catch(e) {
        list.innerHTML = '<div style="padding:0.5rem 1rem;font-size: 12px;color:var(--grade-e);">Error loading classes</div>';
        console.error('[initClassNavPanel]', e);
      }
    }

    function setActiveCnavItem(el) {
      document.querySelectorAll('.cnav-item').forEach(i => i.classList.remove('active'));
      if (el) el.classList.add('active');
    }

    function syncCnavActive() {
      const sec = _currentSection;
      // Sync fixed items
      document.querySelectorAll('#cnav-fixed .cnav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.cnav === sec);
      });
      // Sync class items
      if (sec === 'class-panel' && window._selectedClassId) {
        document.querySelectorAll('#cnav-class-list .cnav-item').forEach(el => {
          el.classList.toggle('active', el.dataset.classId === window._selectedClassId);
        });
      }
    }

    // ── CLASS LIST ── simple alphabetical list of all classes in main content area
    async function renderClassList(area) {
      area.innerHTML = getLoadingStateHtml('Loading classes...');
      try {
        const [rawClasses, programs] = await Promise.all([
          adminFetchAll('classes', 'id, name, is_active, program_id, class_levels(levels(name))'),
          adminFetchAll('programs', 'id, name, institution_id, institutions(name)')
        ]);

        const classes = (rawClasses || []).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        area.innerHTML = `
          <div style="padding:1.5rem 2rem 0.5rem; border-bottom:1px solid var(--clr-border);">
            <h2 style="margin:0 0 0.25rem; font-size: 16px; font-weight:700; color:var(--clr-text-1);">
              Classes <span style="font-size: 12px; font-weight:400; color:var(--clr-text-muted); margin-left:0.5rem;">${classes.length} total</span>
            </h2>
            <p style="margin:0; font-size: 12px; color:var(--clr-text-muted);">Click a class to view its tests</p>
          </div>
          <div style="overflow-y:auto;">
            <table style="width:100%; border-collapse:collapse;">
              <thead>
                <tr style="border-bottom:2px solid var(--clr-border); background:var(--clr-surface);">
                  <th style="text-align:left; padding:0.6rem 1rem; font-size: 12px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--clr-text-muted);">PROGRAM</th>
                  <th style="text-align:left; padding:0.6rem 2rem; font-size: 12px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--clr-text-muted);">CLASS NAME</th>
                  <th style="text-align:center; padding:0.6rem 1rem; font-size: 12px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--clr-text-muted); width:80px;">STATUS</th>
                </tr>
              </thead>
              <tbody id="class-list-tbody"></tbody>
            </table>
          </div>
        `;

        const tbody = document.getElementById('class-list-tbody');
        if (!classes.length) {
          tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:3rem;color:var(--clr-text-muted);">No classes yet.</td></tr>';
          return;
        }

        classes.forEach((cls, idx) => {
          const prog = (programs || []).find(p => p.id === cls.program_id);
          const progName = prog?.name || '—';
          const instName = prog?.institutions?.name || '';

          const tr = document.createElement('tr');
          tr.style.cssText = `
            border-bottom:1px solid var(--clr-border);
            cursor:pointer;
            transition:background 0.1s;
          `;
          tr.innerHTML = `
            <td style="padding:0.7rem 1rem; font-size: 12px; color:var(--clr-text-muted);">
              ${instName ? `<span style="color:var(--clr-text-muted);font-size: 12px;">${escapeHtml(instName)} · </span>` : ''}${escapeHtml(progName)}
            </td>
            <td style="padding:0.7rem 2rem; font-size:12px; font-weight:600; color:var(--clr-text);">
              ${escapeHtml(cls.name)}
            </td>
            <td style="padding:0.7rem 1rem; text-align:center;">
              <span style="font-size: 12px; font-weight:700; color:${cls.is_active ? 'var(--grade-a)' : 'var(--grade-e)'};">
                ${cls.is_active ? 'Active' : 'Inactive'}
              </span>
            </td>
          `;
          tr.addEventListener('mouseenter', () => tr.style.background = 'var(--clr-surface)');
          tr.addEventListener('mouseleave', () => tr.style.background = '');
          tr.addEventListener('click', () => {
            // Sync sidebar active state
            document.querySelectorAll('.sidebar-class-item').forEach(el => {
              el.classList.toggle('active', el.dataset.classId === cls.id);
            });
            window._selectedClassId   = cls.id;
            window._selectedClassName = cls.name;
            loadSection('class-panel');
          });
          tbody.appendChild(tr);
        });

      } catch(e) {
        console.error('[renderClassList]', e);
        area.innerHTML = `<div class="empty-state"><p style="color:var(--grade-e);">Error: ${escapeHtml(e?.message || 'Unknown')}</p></div>`;
      }
    }

    // ── TEST HUB ──
    async function renderTestHub(area) {
      area.innerHTML = getLoadingStateHtml('Loading Test Hub...');
      try {
        const [allTests, classes] = await Promise.all([
          adminFetchAll('tests', 'id, title, test_type, status, class_id, level_id, levels(name)'),
          adminFetchAll('classes', 'id, name')
        ]);

        const tasks = (allTests || []).filter(a => a.test_type === 'quiz' || a.category === 'TASK' || (a.test_subtype && a.test_subtype.includes('TASK')));
        const tests = (allTests || []).filter(a => a.test_type === 'exam' || a.category === 'EXAM' || (a.test_subtype && (a.test_subtype.includes('TEST') || a.test_subtype.includes('EXAM'))));

        let passRate = "—";

        let tableHtml = (allTests || []).map(a => {
           const c = (classes||[]).find(x => x.id === a.class_id);
           const isExam = isWeeklyExam(a);
           const catLabel = isExam ? 'Exam' : 'Task';
           const badgeColor = !isExam ? 'background:rgba(var(--grade-d-rgb, 255,140,0),0.15);color:var(--grade-d);border:1px solid rgba(var(--grade-d-rgb, 255,140,0),0.3);' : 'background:rgba(var(--grade-e-rgb),0.15);color:var(--grade-e);border:1px solid rgba(var(--grade-e-rgb),0.3);';
           return `
             <tr style="border-bottom:1px solid var(--clr-border);">
               <td style="padding:0.75rem 1rem;text-align:center;"><span style="color:#f8fafc;font-size: 12px;font-weight:700;white-space:nowrap;">${escapeHtml(typeof toShortLevel === 'function' ? toShortLevel(a.levels?.name || a.levels?.level_number) : (a.levels?.name || '—'))}</span></td>
               <td style="padding:0.75rem 1rem;color:var(--clr-text-muted);font-size: 12px;">${escapeHtml(c?.name || '—')}</td>
               <td style="padding:0.75rem 1rem;font-weight:600;color:var(--clr-text);">${escapeHtml(a.title || 'Untitled')}</td>
               <td style="padding:0.75rem 1rem;"><span style="color:${!isExam ? 'var(--grade-d)' : 'var(--grade-e)'}; font-size:12px; font-weight:700;">${catLabel}</span></td>
               <td style="padding:0.75rem 1rem;">
                  ${a.modules?.name ? `<span style="color:#38bdf8; font-size:12px; font-weight:600;">${escapeHtml(a.modules.name)}</span>` : '—'}
               </td>
             </tr>
           `;
        }).join('');

        area.innerHTML = `
          <div style="padding:1.5rem 2rem 1rem; border-bottom:1px solid var(--clr-border);">
            <h2 style="margin:0 0 0.5rem; font-size: 20px;">Test Hub</h2>
            <p style="margin:0; color:var(--clr-text-muted); font-size: 12px;">Global view of all tasks and tests across classes.</p>
          </div>

          <div style="padding:2rem;">
            <!-- Metric Cards -->
            <div style="display:flex; gap:1.5rem; margin-bottom:2rem; flex-wrap:wrap;">
              <div style="flex:1; min-width:200px; padding:1.5rem; background:var(--clr-surface); border:1px solid var(--clr-border); border-radius:12px; display:flex; align-items:center; gap:1rem;">
                <div style="width:48px;height:48px;border-radius:50%;background:rgba(var(--grade-c-rgb),0.1);display:flex;align-items:center;justify-content:center;color:var(--grade-c);">${getSvgIcon('clipboard', 22)}</div>
                <div>
                  <div style="font-size: 20px; font-weight:800; color:var(--clr-text-1); line-height:1;">${tasks.length}</div>
                  <div style="font-size: 12px; color:var(--clr-text-muted); font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-top:4px;">Total Tasks</div>
                </div>
              </div>
              <div style="flex:1; min-width:200px; padding:1.5rem; background:var(--clr-surface); border:1px solid var(--clr-border); border-radius:12px; display:flex; align-items:center; gap:1rem;">
                <div style="width:48px;height:48px;border-radius:50%;background:rgba(var(--grade-e-rgb),0.1);display:flex;align-items:center;justify-content:center;color:var(--grade-e);">${getSvgIcon('award', 22)}</div>
                <div>
                  <div style="font-size: 20px; font-weight:800; color:var(--clr-text-1); line-height:1;">${tests.length}</div>
                  <div style="font-size: 12px; color:var(--clr-text-muted); font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-top:4px;">Total Tests</div>
                </div>
              </div>
              <div style="flex:1; min-width:200px; padding:1.5rem; background:var(--clr-surface); border:1px solid var(--clr-border); border-radius:12px; display:flex; align-items:center; gap:1rem;">
                <div style="width:48px;height:48px;border-radius:50%;background:rgba(56,189,248,0.12);display:flex;align-items:center;justify-content:center;color:#38bdf8;">${getSvgIcon('trending-up', 22)}</div>
                <div>
                  <div style="font-size: 20px; font-weight:800; color:var(--clr-text-1); line-height:1;">${passRate}</div>
                  <div style="font-size: 12px; color:var(--clr-text-muted); font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-top:4px;">Avg. Pass Rate</div>
                </div>
              </div>
            </div>

            <!-- Master Table -->
            <div style="background:var(--clr-surface); border:1px solid var(--clr-border); border-radius:12px; overflow:hidden;">
              <table style="width:100%; border-collapse:collapse;">
                <thead>
                  <tr style="background:var(--clr-bg-1); border-bottom:2px solid var(--clr-border);">
                    <th style="padding:0.75rem 1rem; text-align:center; font-size: 12px; font-weight:700; color:var(--clr-text-muted); text-transform:uppercase; letter-spacing:0.05em; width:80px;">LEVEL</th>
                    <th style="padding:0.75rem 1rem; text-align:left; font-size: 12px; font-weight:700; color:var(--clr-text-muted); text-transform:uppercase; letter-spacing:0.05em;">CLASS</th>
                    <th style="padding:0.75rem 1rem; text-align:left; font-size: 12px; font-weight:700; color:var(--clr-text-muted); text-transform:uppercase; letter-spacing:0.05em;">TEST</th>
                    <th style="padding:0.75rem 1rem; text-align:left; font-size: 12px; font-weight:700; color:var(--clr-text-muted); text-transform:uppercase; letter-spacing:0.05em; width:90px;">TYPE</th>
                    <th style="padding:0.75rem 1rem; text-align:left; font-size: 12px; font-weight:700; color:var(--clr-text-muted); text-transform:uppercase; letter-spacing:0.05em;">MODULE</th>
                  </tr>
                </thead>
                <tbody>
                  ${tableHtml || '<tr><td colspan="5" style="padding:2rem;text-align:center;color:var(--clr-text-muted);">No tests found</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        `;
      } catch (e) {
        console.error(e);
        area.innerHTML = `<div class="empty-state"><p style="color:var(--grade-e);">Error loading Test Hub</p></div>`;
      }
    }


    // ── CLASS PANEL ── (per-class view, triggered from sidebar)
    async function renderClassPanel(area) {
      const classId   = window._selectedClassId;
      const className = window._selectedClassName || 'Class';

      if (!classId) {
        area.innerHTML = `<div class="empty-state"><div style="margin-bottom:0.5rem; color:#94a3b8;">${getSvgIcon('graduation-cap', 35)}</div><p>Select a class from the sidebar.</p></div>`;
        return;
      }

      area.innerHTML = getLoadingStateHtml(`Loading ${className}...`);

      try {
        const [classRows, programs, students, batches, institutions, allLevels] = await Promise.all([
          adminFetchAll('classes', '*, class_levels(levels(name, id))'),
          adminFetchAll('programs', 'id, name, institution_id, institutions(name)'),
          adminFetchAll('students', 'id, name, program_id, batch_id, level_id, is_active, deleted_at, institution_id, programs!program_id(name, institutions!institution_id(name)), institutions!institution_id(name)').catch(() => []),
          adminFetchAll('batches', 'id, name, program_id, current_level_id, is_active, deleted_at').catch(() => []),
          adminFetchAll('institutions', 'id, name').catch(() => []),
          adminFetchAll('levels', 'id, name, level_number').catch(() => [])
        ]);

        const cls = (classRows || []).find(c => c.id === classId);
        if (!cls) { area.innerHTML = `<div class="empty-state"><p>Class not found.</p></div>`; return; }

        const prog     = (programs || []).find(p => p.id === cls.program_id);
        const progName = prog?.name || 'Unassigned Program';
        const instName = prog?.institutions?.name || 'TopsCore Global';

        const instLookup = {};
        (institutions || []).forEach(i => { instLookup[i.id] = i.name; });
        const levelLookup = {};
        (allLevels || []).forEach(l => { levelLookup[l.id] = l.name; });

        let levelNames = [];
        const classLevelIds = new Set();
        if (cls.level_id) classLevelIds.add(cls.level_id);
        if (cls.level) {
           levelNames.push(typeof toShortLevel === 'function' ? toShortLevel(cls.level) : cls.level);
        } else if (cls.class_levels?.length) {
           levelNames = cls.class_levels.map(cl => typeof toShortLevel === 'function' ? toShortLevel(cl.levels?.name || cl.levels?.level_number) : cl.levels?.name).filter(Boolean);
           cls.class_levels.forEach(cl => {
             if (cl.level_id) classLevelIds.add(cl.level_id);
             if (cl.levels?.id) classLevelIds.add(cl.levels.id);
           });
        }
        const levelStr = levelNames.join(', ') || 'Unassigned Level';

        const batchMap = new Map((batches || []).filter(b => !b.deleted_at).map(b => [b.id, b]));
        const nonDeletedStudents = (students || []).filter(s => !s.deleted_at);

        const eligibleStudents = nonDeletedStudents.filter(s => {
          if (cls.program_id && s.program_id && s.program_id !== cls.program_id) return false;
          const studentLevel = s.level_id || (s.batch_id ? batchMap.get(s.batch_id)?.current_level_id : null);
          if (classLevelIds.size > 0) {
            return studentLevel && classLevelIds.has(studentLevel);
          }
          return true;
        });

        eligibleStudents.sort((a, b) => {
          const aActive = a.is_active !== false ? 1 : 0;
          const bActive = b.is_active !== false ? 1 : 0;
          if (aActive !== bActive) return bActive - aActive;

          const aInst = a.institutions?.name || (a.institution_id ? instLookup[a.institution_id] : '') || a.programs?.institutions?.name || instName || '';
          const bInst = b.institutions?.name || (b.institution_id ? instLookup[b.institution_id] : '') || b.programs?.institutions?.name || instName || '';
          const instCmp = aInst.localeCompare(bInst, undefined, { sensitivity: 'base', numeric: true });
          if (instCmp !== 0) return instCmp;

          const aProg = a.programs?.name || (a.program_id === cls.program_id ? progName : '') || '';
          const bProg = b.programs?.name || (b.program_id === cls.program_id ? progName : '') || '';
          const progCmp = aProg.localeCompare(bProg, undefined, { sensitivity: 'base', numeric: true });
          if (progCmp !== 0) return progCmp;

          const aBatch = a.batch_id ? (batchMap.get(a.batch_id)?.name || '') : '';
          const bBatch = b.batch_id ? (batchMap.get(b.batch_id)?.name || '') : '';
          const batchCmp = aBatch.localeCompare(bBatch, undefined, { sensitivity: 'base', numeric: true });
          if (batchCmp !== 0) return batchCmp;

          const aLvl = a.level_id ? (levelLookup[a.level_id] || '') : (a.batch_id ? (levelLookup[batchMap.get(a.batch_id)?.current_level_id] || '') : '');
          const bLvl = b.level_id ? (levelLookup[b.level_id] || '') : (b.batch_id ? (levelLookup[batchMap.get(b.batch_id)?.current_level_id] || '') : '');
          const lvlCmp = aLvl.localeCompare(bLvl, undefined, { sensitivity: 'base', numeric: true });
          if (lvlCmp !== 0) return lvlCmp;

          return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base', numeric: true });
        });

        const isVocabClass = className.toLowerCase().includes('vocab');

        area.innerHTML = `
          <!-- Header -->
          <div style="padding:1.5rem 2rem 0; border-bottom:1px solid var(--clr-border); background:var(--clr-surface);">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <div>
                <h2 style="margin:0 0 0.5rem; font-size: 20px; color:var(--clr-text-1);">${escapeHtml(className)}</h2>
                <div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-bottom:1.5rem;">
                  <span class="badge badge-neutral" style="font-size: 12px;">${escapeHtml(instName)}</span>
                  <span class="badge badge-neutral" style="font-size: 12px;">${escapeHtml(progName)}</span>
                  <span class="badge badge-neutral" style="font-size: 12px;">${escapeHtml(levelStr)}</span>
                  <span class="badge ${cls.is_active ? 'badge-success' : 'badge-neutral'}" style="font-size: 12px;">${cls.is_active ? 'Active' : 'Inactive'}</span>
                  <span class="badge badge-neutral" style="font-size: 12px;">${eligibleStudents.length} Eligible Students</span>
                </div>
              </div>
              <div style="display:flex; gap:0.5rem;">
                ${isVocabClass ? `
                  <button class="btn btn-tactical btn-sm" id="cpanel-auto-gen-words" style="font-weight:700;" title="Auto-Generate Vocabulary Tests">Gen Words</button>
                  <button class="btn btn-purple btn-sm" id="cpanel-auto-gen-phrases" style="font-weight:700;" title="Auto-Generate Phrases & Idioms">${getSvgIcon('zap', 14)} Gen Phrases</button>
                ` : `
                  <button class="btn btn-tactical btn-sm" id="cpanel-auto-generate-btn" style="font-weight:700;" title="Auto-Generate Vocabulary Tests">${getSvgIcon('zap', 14)} Auto-Generate</button>
                `}
                <button class="btn btn-warning btn-sm" id="cpanel-add-task-btn" style="font-weight:700;">${getSvgIcon('plus', 14)} Add Task</button>
                <button class="btn btn-danger btn-sm" id="cpanel-add-test-btn" style="font-weight:700;">${getSvgIcon('plus', 14)} Add Test</button>
              </div>
            </div>

            <!-- Tabs -->
            <div style="display:flex; gap:1.5rem; border-bottom:2px solid transparent;">
              <div class="cpanel-tab active" data-target="tab-path" style="padding:0.75rem 0; cursor:pointer; font-size: 12px; font-weight:600; color:var(--clr-primary); border-bottom:2px solid var(--clr-primary); margin-bottom:-1px;">Learning Path & Tasks</div>
              <div class="cpanel-tab" data-target="tab-students" style="padding:0.75rem 0; cursor:pointer; font-size: 12px; font-weight:600; color:var(--clr-text-muted); border-bottom:2px solid transparent; margin-bottom:-1px;">Eligible Students (${eligibleStudents.length})</div>
              <div class="cpanel-tab" data-target="tab-gradebook" style="padding:0.75rem 0; cursor:pointer; font-size: 12px; font-weight:600; color:var(--clr-text-muted); border-bottom:2px solid transparent; margin-bottom:-1px;">Gradebook</div>
            </div>
          </div>

          <!-- Content -->
          <div style="padding:2rem;">
            <!-- Learning Path Tab -->
            <div id="tab-path" class="cpanel-content-area" style="display:block;">
              <div id="class-learning-path-container"></div>
            </div>

            <!-- Students Tab -->
            <div id="tab-students" class="cpanel-content-area" style="display:none;">
              ${eligibleStudents.length === 0 ? `
                <div class="empty-state"><div style="margin-bottom:1rem; color:#94a3b8;">${getSvgIcon('users', 32)}</div><p>No students currently eligible for this class.</p></div>
              ` : `
                <div style="background:var(--clr-surface);border:1px solid var(--clr-border);border-radius:8px;overflow:hidden;">
                  <div style="padding:0.75rem 1.25rem;border-bottom:1px solid var(--clr-border);font-weight:700;font-size: 12px;color:var(--clr-text-1);display:flex;justify-content:space-between;align-items:center;">
                    <span>Eligible Students</span>
                    <span class="badge badge-success" style="font-size: 12px;">${eligibleStudents.length} Students</span>
                  </div>
                  <table style="width:100%;border-collapse:collapse;font-size: 12px;">
                    <thead>
                      <tr style="border-bottom:1px solid var(--clr-border);background:#1e293b;color:#ffffff;font-size: 12px;text-transform:uppercase;">
                        <th style="padding:0.6rem 1rem;text-align:left;">INSTITUTION</th>
                        <th style="padding:0.6rem 1rem;text-align:left;">PROGRAM</th>
                        <th style="padding:0.6rem 1rem;text-align:left;">BATCH</th>
                        <th style="padding:0.6rem 1rem;text-align:center;">LEVEL</th>
                        <th style="padding:0.6rem 1.25rem;text-align:left;">STUDENT NAME</th>
                        <th style="padding:0.6rem 1rem;text-align:center;">STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${eligibleStudents.map(s => {
                        const b = s.batch_id ? batchMap.get(s.batch_id) : null;
                        const sInst = s.institutions?.name || (s.institution_id ? instLookup[s.institution_id] : '') || s.programs?.institutions?.name || instName;
                        const sProg = s.programs?.name || (s.program_id === cls.program_id ? progName : '—');
                        const sLvl = s.level_id ? (levelLookup[s.level_id] || '—') : (b?.current_level_id ? (levelLookup[b.current_level_id] || '—') : '—');
                        return `
                          <tr style="border-bottom:1px solid var(--clr-border);">
                            <td style="padding:0.65rem 1rem;color:var(--clr-text-muted);">${escapeHtml(sInst)}</td>
                            <td style="padding:0.65rem 1rem;color:var(--clr-text-muted);">${escapeHtml(sProg)}</td>
                            <td style="padding:0.65rem 1rem;color:var(--clr-text-muted);">${b ? escapeHtml(b.name) : '—'}</td>
                            <td style="padding:0.65rem 1rem;text-align:center;"><span style="color:#f8fafc;font-size: 12px;font-weight:700;white-space:nowrap;">${escapeHtml(typeof toShortLevel === 'function' ? toShortLevel(sLvl) : sLvl)}</span></td>
                            <td style="padding:0.65rem 1.25rem;font-weight:600;color:var(--clr-text);">${escapeHtml(s.name)}</td>
                            <td style="padding:0.65rem 1rem;text-align:center;">
                              <span style="font-size: 12px; font-weight:700; color:${s.is_active !== false ? 'var(--grade-a)' : 'var(--grade-e)'};">${s.is_active !== false ? 'Active' : 'Inactive'}</span>
                            </td>
                          </tr>
                        `;
                      }).join('')}
                    </tbody>
                  </table>
                </div>
              `}
            </div>

            <!-- Gradebook Tab -->
            <div id="tab-gradebook" class="cpanel-content-area" style="display:none;">
              <div class="empty-state"><div style="margin-bottom:1rem; color:#94a3b8;">${getSvgIcon('trending-up', 32)}</div><p>Gradebook will appear here.</p></div>
            </div>
          </div>
        `;

        // Tab Switching Logic
        const tabs = area.querySelectorAll('.cpanel-tab');
        const contents = area.querySelectorAll('.cpanel-content-area');
        tabs.forEach(tab => {
          tab.addEventListener('click', () => {
            tabs.forEach(t => {
              t.classList.remove('active');
              t.style.color = 'var(--clr-text-muted)';
              t.style.borderBottomColor = 'transparent';
            });
            contents.forEach(c => c.style.display = 'none');

            tab.classList.add('active');
            tab.style.color = 'var(--clr-primary)';
            tab.style.borderBottomColor = 'var(--clr-primary)';

            area.querySelector('#' + tab.dataset.target).style.display = 'block';
          });
        });

        document.getElementById('cpanel-add-task-btn')?.addEventListener('click', () => {
          if (window.handleAddTask) window.handleAddTask(classId, className);
        });
        document.getElementById('cpanel-add-test-btn')?.addEventListener('click', () => {
          if (window.handleAddTest) window.handleAddTest(classId, className);
        });

        if (isVocabClass) {
          document.getElementById('cpanel-auto-gen-words')?.addEventListener('click', async () => {
            if (window.handleClassAutoGenerate) window.handleClassAutoGenerate(classId, window._selectedLevelId, 'words');
          });
          document.getElementById('cpanel-auto-gen-phrases')?.addEventListener('click', async () => {
            if (window.handleClassAutoGenerate) window.handleClassAutoGenerate(classId, window._selectedLevelId, 'phrases');
          });
        } else {
          document.getElementById('cpanel-auto-generate-btn')?.addEventListener('click', async () => {
            if (window.handleClassAutoGenerate) window.handleClassAutoGenerate(classId, window._selectedLevelId);
          });
        }

        try {
          await loadClassLearningPath(classId);
        } catch (e) {
           console.warn('loadClassLearningPath failed', e);
        }

      } catch (e) {
        console.error(e);
        area.innerHTML = `<div class="empty-state"><p style="color:var(--grade-e);">Failed to load class panel.</p></div>`;
      }
    }

        window.handleClassAutoGenerate = async (classId, levelId, category = null) => {
           if (!classId) return;
           try {
              const { openAutoGenerateModal } = await import('./auto-gen-modal.js?v=20261106_v140');
              await openAutoGenerateModal({
                 explicitClassId: classId,
                 category: category,
                 onComplete: (res) => {
                    renderClassPanel(area);
                 }
              });
           } catch(e) {
              console.error(e);
              if (window.showToast) window.showToast('Error opening generator: ' + e.message, 'error');
           }
        };

    async function renderPrograms(area) {
      const rawData = await adminFetchAll('institutions');

      // Enforce strict alphabetical ordering
      const data = [...rawData].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      area.innerHTML = `
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th class="text-left">INSTITUTION NAME</th>
                <th class="text-center">STATUS</th>
                <th class="text-center">CREATED DATE</th>
                <th class="text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody id="tbl-institutions"></tbody>
          </table>
        </div>
      `;
      const tbody = document.getElementById('tbl-institutions');
      if (!data.length) { tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><div class="empty-state__icon" style="color:#64748b;">${getSvgIcon('building', 32)}</div><p>No institutions yet.</p></div></td></tr>`; return; }
      window._progRecords = {};
      data.forEach(r => {
        window._progRecords[r.id] = r;
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="fw-600">${escapeHtml(r.name)}</td>
          <td class="text-center"><span style="font-size:12px; font-weight:700; color:${r.is_active ? 'var(--grade-a)' : 'var(--grade-e)'};">${r.is_active ? 'Active' : 'Inactive'}</span></td>
          <td class="text-center text-muted text-sm">${new Date(r.created_at).toLocaleDateString()}</td>
          <td class="text-right">
            <div class="d-flex gap-2 justify-end">
              <button class="btn btn-outline btn-sm" data-nav-progs="${r.id}" title="View Programs in ${escapeHtml(r.name)}">Programs &rarr;</button>
              <button class="btn btn-secondary btn-sm" data-edit-prog="${r.id}">Edit</button>
              <button class="btn btn-danger btn-sm" data-del-prog="${r.id}">Delete</button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });

      tbody.querySelectorAll('[data-nav-progs]').forEach(btn => {
        btn.addEventListener('click', () => {
          const pid = btn.getAttribute('data-nav-progs');
          const rec = window._progRecords[pid];
          window._filterInstitutionId = pid;
          window._filterInstitutionName = rec ? rec.name : '';
          loadSection('programs');
        });
      });
      tbody.querySelectorAll('[data-edit-prog]').forEach(btn => {
        btn.addEventListener('click', () => {
          const pid = btn.getAttribute('data-edit-prog');
          const rec = window._progRecords[pid];
          if (rec) openCrudModal('institutions', rec);
        });
      });
      tbody.querySelectorAll('[data-del-prog]').forEach(btn => {
        btn.addEventListener('click', () => {
          const pid = btn.getAttribute('data-del-prog');
          const rec = window._progRecords[pid];
          if (rec) window._deleteRecord('institutions', pid, rec.name || 'Program');
        });
      });
    }

    // ──── CLASSES (Formerly Classes) ────
    async function renderClasses(area) {
      const [rawData, institutions, levelsData] = await Promise.all([
        adminFetchAll('classes', '*, levels!classes_level_id_fkey(*)'),
        adminFetchAll('institutions'),
        adminFetchAll('levels', '*', { order: 'level_number', ascending: true })
      ]);

      // Group levels by name to merge duplicate tabs
      const uniqueLevels = [];
      const seen = new Set();
      for (const l of levelsData) {
        if (!seen.has(l.name)) {
          seen.add(l.name);
          uniqueLevels.push(l);
        }
      }


      if (!window._activeClassLevelTab && uniqueLevels.length > 0) {
        window._activeClassLevelTab = uniqueLevels[0].name;
      }
      const activeTabName = window._activeClassLevelTab;

      const data = [...rawData].filter(r => r.levels?.name === activeTabName || r.level_id === activeTabName).sort((a, b) => {
        return (a.name || '').localeCompare(b.name || '');
      });

      const tabsHtml = uniqueLevels.map(l =>
        `<button class="btn ${activeTabName === l.name ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="window._activeClassLevelTab='${l.name.replace(/'/g, "\\\'")}'; window.loadSection('classes');">${escapeHtml(l.name)}</button>`
      ).join(' ');

      area.innerHTML = `
        <!-- C-CLASS TOOLS QUICK-ACCESS BAR -->
        <div class="card p-3 mb-3" style="background:rgba(255,255,255,0.02);border:1px solid var(--clr-border);">
          <div class="d-flex gap-2 flex-wrap mb-3">
             ${tabsHtml}
          </div>
          <div class="text-xs fw-700 mb-2" style="color:var(--clr-text-2);letter-spacing:0.08em;">C &mdash; CLASS TOOLS</div>
          <div class="d-flex gap-2 flex-wrap">
            <button class="btn btn-ghost btn-sm" onclick="window.loadSection('levels')">${getSvgIcon('trending-up', 14)} Levels</button>
            <button class="btn btn-ghost btn-sm" onclick="window.loadSection('topics')">${getSvgIcon('tag', 14)} Topics</button>
            <button class="btn btn-ghost btn-sm" onclick="window.loadSection('vocab_vault')">${getSvgIcon('book-open', 14)} Vocabulary Vault</button>
            <button class="btn btn-ghost btn-sm" onclick="window.loadSection('question_types')">${getSvgIcon('check-circle', 14)} Validation Dictionary</button>
            <button class="btn btn-ghost btn-sm" onclick="window.loadSection('class-hub')">${getSvgIcon('calendar', 14)} Class Hub</button>
            <button class="btn btn-ghost btn-sm" onclick="window.loadSection('health')">${getSvgIcon('zap', 14)} Recalibrator</button>
            <button class="btn btn-ghost btn-sm" onclick="window.loadSection('vocab_vault')">${getSvgIcon('upload', 14)} Import Vault</button>
            <button class="btn btn-ghost btn-sm" onclick="window.loadSection('vocab_vault')">${getSvgIcon('download', 14)} Export Vault</button>
            <button class="btn btn-ghost btn-sm" onclick="window.loadSection('import_ai_tests')">${getSvgIcon('cpu', 14)} Import AI Tests</button>
          </div>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th class="text-left">LEVEL</th>
                <th class="text-left">CLASS NAME</th>
                <th class="text-center">STATUS</th>
                <th class="text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody id="tbl-Classes"></tbody>
          </table>
        </div>
      `;
      const tbody = document.getElementById('tbl-Classes');
      if (!data.length) { tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted p-4">No classes in this level yet.</td></tr>'; }
      else {
          window._subjRecords = {};
          data.forEach(r => {
            window._subjRecords[r.id] = r;
            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td><span style="color:#f8fafc;font-size: 12px;font-weight:700;white-space:nowrap;">${escapeHtml(typeof toShortLevel === 'function' ? toShortLevel(r.levels?.name || r.levels?.level_number) : (r.levels?.name || '&mdash;'))}</span></td>
              <td class="fw-600" style="color:var(--clr-text-1);">${escapeHtml(r.name)}</td>
              <td class="text-center"><span style="font-size:12px; font-weight:700; color:${r.is_active ? 'var(--grade-a)' : 'var(--grade-e)'};">${r.is_active ? 'Active' : 'Inactive'}</span></td>
              <td class="text-right">
                <div class="d-flex gap-2 justify-end">
                  <button class="btn btn-outline btn-sm" data-nav-topics="${r.id}" title="View Topics in ${escapeHtml(r.name)}">Topics &rarr;</button>
                  <button class="btn btn-info btn-sm" data-nav-bank="${r.id}" title="Vocabulary Vault">${getSvgIcon('book-open', 14)} Vault</button>
                  <button class="btn btn-secondary btn-sm" data-edit-subj="${r.id}">Edit</button>
                  <button class="btn btn-danger btn-sm" data-del-subj="${r.id}">Delete</button>
                </div>
              </td>
            `;
            tbody.appendChild(tr);
          });
      }

      tbody.querySelectorAll('[data-nav-topics]').forEach(btn => {
        btn.addEventListener('click', () => {
          const sid = btn.getAttribute('data-nav-topics');
          const rec = window._subjRecords[sid];
          window._filterClassId = sid;
          window._filterClassName = rec ? rec.name : '';
          loadSection('topics');
        });
      });
      tbody.querySelectorAll('[data-nav-bank]').forEach(btn => {
        btn.addEventListener('click', () => {
          const sid = btn.getAttribute('data-nav-bank');
          const rec = window._subjRecords[sid];
          window._filterClassId = sid;
          window._filterClassName = rec ? rec.name : '';
          loadSection('vocab_vault');
        });
      });
      tbody.querySelectorAll('[data-edit-subj]').forEach(btn => {
        btn.addEventListener('click', () => {
          const sid = btn.getAttribute('data-edit-subj');
          const rec = window._subjRecords[sid];
          if (rec) openCrudModal('classes', rec);
        });
      });
      tbody.querySelectorAll('[data-del-subj]').forEach(btn => {
        btn.addEventListener('click', () => {
          const sid = btn.getAttribute('data-del-subj');
          const rec = window._subjRecords[sid];
          if (rec) window._deleteRecord('classes', sid, rec.name || 'Class');
        });
      });
    }

    // ──── LEVELS ────
    async function renderLevels(area) {
      const [rawData, allClasses] = await Promise.all([
        adminFetchAll('levels', '*'),
        adminFetchAll('programs', 'id, name, institution_id')
      ]);
      const classMap = {};
      allClasses.forEach(c => { classMap[c.id] = c; });

      // Sort by Institution Name (A-Z), Program Name, Class Name (A-Z), then level_number ascending
      const data = [...rawData].sort((a, b) => {
        const pA = a.classes?.institutions?.name || '';
        const pB = b.classes?.institutions?.name || '';
        const cA = (a.program_id && classMap[a.program_id]?.name) || '';
        const cB = (b.program_id && classMap[b.program_id]?.name) || '';
        const sA = a.classes?.name || '';
        const sB = b.classes?.name || '';
        return pA.localeCompare(pB) || cA.localeCompare(cB) || sA.localeCompare(sB) || (a.level_number - b.level_number) || (a.name || '').localeCompare(b.name || '');
      });

      area.innerHTML = `
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th class="text-left">INSTITUTION</th>
                <th class="text-left">PROGRAM</th>
                <th class="text-left">CLASS</th>
                <th class="text-center">LEVEL #</th>
                <th class="text-left">LEVEL NAME</th>
                <th class="text-center">STATUS</th>
                <th class="text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody id="tbl-levels"></tbody>
          </table>
        </div>
      `;
      const tbody = document.getElementById('tbl-levels');
      if (!data.length) { tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted p-4">No levels yet.</td></tr>'; return; }

      window._levelRecords = {};
      data.forEach(r => {
        if (!r.institution_id && r.classes?.institution_id) {
          r.institution_id = r.classes.institution_id;
        }
        window._levelRecords[r.id] = r;
      });

      data.forEach(r => {
        const progName = r.classes?.institutions?.name || '—';
        const programName = (r.program_id && classMap[r.program_id]?.name) ? classMap[r.program_id].name : 'All Programs';
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><span style="color:#94a3b8; font-size:12px; font-weight:600;">${escapeHtml(progName)}</span></td>
          <td><span style="color:#94a3b8; font-size:12px; font-weight:600;">${escapeHtml(programName)}</span></td>
          <td class="text-muted fw-600">${escapeHtml(r.classes?.name || '—')}</td>
          <td class="text-center"><span style="color:var(--primary-tactical, #38bdf8); font-size:12px; font-weight:700; white-space:nowrap;">${typeof toShortLevel === 'function' ? toShortLevel(r.level_number) : toLevelLetter(r.level_number)}</span></td>
          <td class="fw-600">${escapeHtml(r.name)}</td>
          <td class="text-center"><span style="font-size:12px; font-weight:700; color:${r.is_active ? 'var(--grade-a)' : 'var(--grade-e)'};">${r.is_active ? 'Active' : 'Inactive'}</span></td>
          <td class="text-right">
            <div class="d-flex gap-2 justify-end">
              <button class="btn btn-secondary btn-sm" data-edit-level="${r.id}">Edit</button>
              <button class="btn btn-danger btn-sm" data-del-level="${r.id}">Delete</button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });

      tbody.querySelectorAll('[data-edit-level]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const lid = btn.getAttribute('data-edit-level');
          const rec = window._levelRecords[lid];
          if (rec) await openCrudModal('levels', rec);
        });
      });
      tbody.querySelectorAll('[data-del-level]').forEach(btn => {
        btn.addEventListener('click', () => {
          const lid = btn.getAttribute('data-del-level');
          const rec = window._levelRecords[lid];
          if (rec) window._deleteRecord('levels', lid, rec.name || 'Level');
        });
      });
    }

    // Helper function to calculate age from birth date string (YYYY-MM-DD)
    function calculateAgeFromBirthDate(birthDateStr) {
      if (!birthDateStr) return '—';
      const birthDate = new Date(birthDateStr);
      if (isNaN(birthDate.getTime())) return '—';
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return (age && age > 0) ? `${age} yrs` : '—';
    }


    // ──── INDIVIDUAL STUDENT PROFILE (Detailed Progress, Correct/Incorrect Counts, Batch Navigation) ────
    // ─── INDIVIDUAL STUDENT REPORT (A4 Printable Dossier Delegator) ───
    async function openStudentProfile(studentId, batchStudentIds = [], skipHistory = false) {
      if (typeof window.showStudentDossierModal === 'function') {
        return window.showStudentDossierModal(studentId);
      }
      const sm = await import('./student-management.js?v=20261123_v677');
      if (typeof sm.showStudentDossierModal === 'function') {
        return sm.showStudentDossierModal(studentId);
      }
    }
    window.openStudentProfile = openStudentProfile;
    // --- Test MANAGEMENT HUB (Restored & Elevated) ---


// Global edit/delete handlers
window._editRecord = async (section, id, jsonStr) => {
  if (isTutorRole()) {
    showToast('Permission denied: Tutor accounts cannot edit records.', 'warning');
    return;
  }
  let record;
  try {
    record = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
  } catch (err) {
    console.error('Failed to parse record JSON for edit:', err);
    return;
  }
  await openCrudModal(section, record);
};

let _deleteSection = null;
let _deleteId = null;
let _cascadeStudentIds = [];
let _cascadeBatchIds = [];
let _cascadeProgramIds = [];

window._deleteRecord = async (section, id, name) => {
  if (isTutorRole()) {
    showToast('Permission denied: Tutor accounts cannot delete records.', 'warning');
    return;
  }
  _deleteSection = section || window._currentSection || 'batches';
  _deleteId = id;
  _cascadeStudentIds = [];
  _cascadeBatchIds = [];
  _cascadeProgramIds = [];

  const modal = document.getElementById('delete-modal');
  const msgEl = document.getElementById('delete-modal-message');
  const titleEl = document.getElementById('delete-modal-title');
  const confirmBtn = document.getElementById('delete-confirm-btn');

  if (!modal || !msgEl) return;

  titleEl.textContent = 'PERMANENT DELETION';
  const targetValEl = document.getElementById('delete-target-val');
  if (targetValEl) {
    const secLabel = (_deleteSection || 'Record').replace(/s$/, '').toUpperCase();
    const displayName = name ? `${name}` : '';
    const idSnippet = id ? `(ID: ${id.substring(0, 8)}...)` : '';
    targetValEl.textContent = `${secLabel}: ${displayName} ${idSnippet}`.trim();
  }
  confirmBtn.innerHTML = `${getSvgIcon('trash', 14)} Delete Record`;
  confirmBtn.disabled = false;
  confirmBtn.className = 'btn btn-danger';

  // Check dependencies for batches, programs, and institutions
  if (_deleteSection === 'batches') {
    msgEl.innerHTML = `<span class="loader"></span> Checking enrolled students...`;
    modal.classList.remove('hidden');

    try {
      const sb = await getSupabase();
      const { data: students } = await sb.from('students')
        .select('id, name')
        .eq('batch_id', id)
        .is('deleted_at', null);

      if (students && students.length > 0) {
        _cascadeStudentIds = students.map(s => s.id);
        titleEl.textContent = `Delete Batch "${escapeHtml(name)}"?`;
        msgEl.innerHTML = `
          <div style="text-align:left; background:rgba(var(--grade-e-rgb),0.12); border:1px solid rgba(var(--grade-e-rgb),0.35); border-radius:8px; padding:12px; margin-bottom:12px;">
            <div style="font-weight:700; color:var(--grade-e); font-size: 16px; margin-bottom:6px;">${getSvgIcon('alert-triangle', 16)} Connected Data Alert</div>
            <div style="font-size: 12px; color:var(--clr-text-1); margin-bottom:6px;">
              This Batch currently has <strong>${students.length} enrolled student(s)</strong>.
            </div>
            <div style="font-size: 12px; color:var(--clr-text-2); line-height:1.4;">
              To prevent loose/orphaned data, deleting this batch will cascade soft-delete all <strong>${students.length} student(s)</strong>. All historical attempt logs and grades are preserved in the database.
            </div>
          </div>
          <p class="text-xs text-muted" style="margin:0;">Are you sure you want to proceed with cascade deletion?</p>
        `;
        confirmBtn.textContent = `Delete Batch & ${students.length} Student(s)`;
        return;
      }
    } catch (e) {
      console.warn('Error checking batch students:', e);
    }
  } else if (_deleteSection === 'programs') {
    msgEl.innerHTML = `<span class="loader"></span> Checking program connections...`;
    modal.classList.remove('hidden');

    try {
      const sb = await getSupabase();
      const { data: batches } = await sb.from('batches')
        .select('id, name')
        .eq('program_id', id)
        .is('deleted_at', null);

      const bIds = (batches || []).map(b => b.id);
      _cascadeBatchIds = bIds;

      let filterStr = `program_id.eq.${id}`;
      if (bIds.length > 0) filterStr += `,batch_id.in.(${bIds.join(',')})`;

      const { data: students } = await sb.from('students')
        .select('id, name')
        .or(filterStr)
        .is('deleted_at', null);

      const studentCount = students ? students.length : 0;
      if (students) _cascadeStudentIds = students.map(s => s.id);

      if (bIds.length > 0 || studentCount > 0) {
        titleEl.textContent = `Delete Program "${escapeHtml(name)}"?`;
        msgEl.innerHTML = `
          <div style="text-align:left; background:rgba(var(--grade-e-rgb),0.12); border:1px solid rgba(var(--grade-e-rgb),0.35); border-radius:8px; padding:12px; margin-bottom:12px;">
            <div style="font-weight:700; color:var(--grade-e); font-size: 16px; margin-bottom:6px;">${getSvgIcon('alert-triangle', 16)} Connected Data Alert</div>
            <div style="font-size: 12px; color:var(--clr-text-1); margin-bottom:6px;">
              This Program contains <strong>${bIds.length} batch(es)</strong> and <strong>${studentCount} student(s)</strong>.
            </div>
            <div style="font-size: 12px; color:var(--clr-text-2); line-height:1.4;">
              Deleting this program will cascade soft-delete all <strong>${bIds.length} batch(es)</strong> and <strong>${studentCount} student(s)</strong> so no loose or disconnected records remain.
            </div>
          </div>
          <p class="text-xs text-muted" style="margin:0;">Are you sure you want to proceed with cascade deletion?</p>
        `;
        confirmBtn.textContent = `Delete Program & Everything In It`;
        return;
      }
    } catch (e) {
      console.warn('Error checking program dependencies:', e);
    }
  } else if (_deleteSection === 'institutions') {
    msgEl.innerHTML = `<span class="loader"></span> Checking institution connections...`;
    modal.classList.remove('hidden');

    try {
      const sb = await getSupabase();
      const { data: progs } = await sb.from('programs')
        .select('id, name')
        .eq('institution_id', id)
        .is('deleted_at', null);

      const pIds = (progs || []).map(p => p.id);
      _cascadeProgramIds = pIds;

      let bIds = [];
      if (pIds.length > 0) {
        const { data: batches } = await sb.from('batches')
          .select('id, name')
          .in('program_id', pIds)
          .is('deleted_at', null);
        bIds = (batches || []).map(b => b.id);
      }
      _cascadeBatchIds = bIds;

      let filterStr = `institution_id.eq.${id}`;
      if (pIds.length > 0) filterStr += `,program_id.in.(${pIds.join(',')})`;
      if (bIds.length > 0) filterStr += `,batch_id.in.(${bIds.join(',')})`;

      const { data: students } = await sb.from('students')
        .select('id, name')
        .or(filterStr)
        .is('deleted_at', null);

      const studentCount = students ? students.length : 0;
      if (students) _cascadeStudentIds = students.map(s => s.id);

      if (pIds.length > 0 || bIds.length > 0 || studentCount > 0) {
        titleEl.textContent = `Delete Institution "${escapeHtml(name)}"?`;
        msgEl.innerHTML = `
          <div style="text-align:left; background:rgba(var(--grade-e-rgb),0.12); border:1px solid rgba(var(--grade-e-rgb),0.35); border-radius:8px; padding:12px; margin-bottom:12px;">
            <div style="font-weight:700; color:var(--grade-e); font-size: 16px; margin-bottom:6px;">${getSvgIcon('alert-triangle', 16)} Connected Hierarchy Alert</div>
            <div style="font-size: 12px; color:var(--clr-text-1); margin-bottom:6px;">
              This Institution contains <strong>${pIds.length} program(s)</strong>, <strong>${bIds.length} batch(es)</strong>, and <strong>${studentCount} student(s)</strong>.
            </div>
            <div style="font-size: 12px; color:var(--clr-text-2); line-height:1.4;">
              Deleting this institution will cascade soft-delete all connected programs, batches, and students. No loose data will remain.
            </div>
          </div>
          <p class="text-xs text-muted" style="margin:0;">Are you sure you want to proceed?</p>
        `;
        confirmBtn.textContent = `Delete Institution & All Connected Data`;
        return;
      }
    } catch (e) {
      console.warn('Error checking institution dependencies:', e);
    }
  }

  // Default simple soft delete message
  msgEl.textContent = `Are you sure you want to delete this record? This action will remove the record from active view. Historical data is preserved.`;
  modal.classList.remove('hidden');
};

document.getElementById('delete-confirm-btn')?.addEventListener('click', async () => {
  if (!_deleteSection || !_deleteId) return;
  const btn = document.getElementById('delete-confirm-btn');
  btn.disabled = true;
  btn.textContent = 'Deleting...';

  try {
    // 1. Cascade soft-delete students
    if (_cascadeStudentIds && _cascadeStudentIds.length > 0) {
      for (const sid of _cascadeStudentIds) {
        await adminSoftDelete('students', sid);
      }
    }

    // 2. Cascade soft-delete batches
    if (_cascadeBatchIds && _cascadeBatchIds.length > 0) {
      for (const bid of _cascadeBatchIds) {
        await adminSoftDelete('batches', bid);
      }
    }

    // 3. Cascade soft-delete programs
    if (_cascadeProgramIds && _cascadeProgramIds.length > 0) {
      for (const pid of _cascadeProgramIds) {
        await adminSoftDelete('programs', pid);
      }
    }

    // 4. Soft-delete primary record
    await adminSoftDelete(_deleteSection, _deleteId);

    // Clear caches
    clearAdminCache('students');
    clearAdminCache('batches');
    clearAdminCache('programs');
    clearAdminCache('institutions');

    showToast('Record and connected data safely deleted.', 'success');
    document.getElementById('delete-modal').classList.add('hidden');
    if (window._currentSection) loadSection(window._currentSection);
  } catch(e) {
    showToast(e.message, 'error');
  } finally {
    _deleteSection = null;
    _deleteId = null;
    _cascadeStudentIds = [];
    _cascadeBatchIds = [];
    _cascadeProgramIds = [];
    btn.disabled = false;
  }
});

// Modal close handlers
['close-crud-modal','crud-cancel-btn'].forEach(id => document.getElementById(id)?.addEventListener('click', () => document.getElementById('crud-modal')?.classList.add('hidden')));
['delete-cancel-btn'].forEach(id => document.getElementById(id)?.addEventListener('click', () => document.getElementById('delete-modal')?.classList.add('hidden')));

const _origOpenCrudModal = openCrudModal;
window.openCrudModal = async function(...args) {
  if (isTutorRole()) {
    showToast('Permission denied: Tutor accounts cannot edit records.', 'warning');
    return;
  }
  return _origOpenCrudModal(...args);
};
window.openDuplicateStudentsModal = openDuplicateStudentsModal;
window.openDuplicateQuestionsModal = openDuplicateQuestionsModal;
window.loadSection = loadSection;
window.openStudentProfile = openStudentProfile;
