import { DataGrid } from './datagrid.js?v=5.3.2';
import { escapeHtml, escHtml, showToast, showLoading, hideLoading, getGrade, calculateGrade, getGradeColorByScore, getGradeColor, getGradeSymbol, GRADE_PALETTE, isWeeklyExam } from '../app.js?v=20261027';

// =========================================================
// EXCEL-STYLE TABLE COLUMN RESIZER
// =========================================================
export function makeTableResizable(table, storageKey) {
  const cols = table.querySelectorAll('th');
  const cachedWidths = JSON.parse(localStorage.getItem(storageKey) || '{}');

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
    icon.style.fontSize = '0.7em';
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

export function setBottomInfobar(leftHtml = '', rightHtml = '') {
  const bar = document.getElementById('admin-bottom-infobar');
  if (!bar) return;
  if (!leftHtml && !rightHtml) {
    bar.classList.add('hidden');
    bar.innerHTML = '';
    return;
  }
  bar.classList.remove('hidden');
  bar.innerHTML = `
    <div class="bottom-infobar-left" id="bottom-infobar-left">${leftHtml || ''}</div>
    <div class="bottom-infobar-right" id="bottom-infobar-right">${rightHtml || ''}</div>
  `;
}
window.setBottomInfobar = setBottomInfobar;
import {
  adminFetchAll, adminInsert, adminUpdate, adminSoftDelete, adminHardDelete, clearAdminCache,
  adminFetchDeleted, adminRestore,
  mergeDuplicateStudents, detectDuplicateStudents, mergeStudentPair,
  detectDuplicateQuestions, resequenceTestQuestions, resolveDuplicateQuestionGroup, batchResolveTestDuplicateQuestions,
  fetchInstitutions, fetchPrograms, fetchBatches, formatStudentName, cleanStudentName, stripHonorific, getStudentInitial,
  testSupabaseConnection, previewRecalibrateTest, applyRecalibrateTest, isPassing, calculatePercentage, toLevelLetter
} from '../api.js?v=5.4.7';
import { parseExcelWorkbook, processStudentImportRows, processQuestionImportRows } from '../excel-parser.js?v=5.4.7';
import { setAdminSession, getAdminSession, clearAdminSession } from '../session.js?v=5.4.7';
import { getSupabase } from '../supabase.js?v=5.4.7';
import { renderStudents as _renderStudentsModule } from './student-management.js?v=5.4.7';
import { renderClasses as _renderClassesModule, loadClassLearningPath } from './classes-management.js?v=5.4.7';
import { renderBatches as _renderBatchesModule, renderUnifiedInstitutions } from './program-management.js?v=5.4.7';
import { renderTopics, renderWordTypes, renderCentralQuestionBank, renderAssignments, renderCentralQuestionImport, renderResults, renderProgressView, renderRecalibrator, renderClassInstances } from './class.js?v=5.4.7';
import { renderTests } from './tests-management.js?v=5.4.7';
import { renderTestAccess, renderClassTestSessions } from './tests-access.js?v=20261027d';
import { renderVocabularyVault } from './vocab-vault.js?v=5.4.8';
import { renderModules } from './modules.js?v=5.4.7';
import { renderAuditLog, renderSettings, renderDataHealth, renderRecycleBin } from './desk.js?v=5.4.7';
import { renderImportStudents, renderImportQuestions, renderExportQuestions } from './imports-exports.js?v=5.4.7';
import { openCrudModal, openDuplicateStudentsModal, openDuplicateQuestionsModal, openBulkEditTestsModal, hashPin } from './crud-modals.js?v=5.4.9';
import { renderCurriculum } from './curriculum-management.js?v=5.4.8';
import { renderClassesHub } from './classes-hub.js?v=5.4.7';
import { renderDashboard, renderAdminProfile, renderAdminSchedule, renderWorkRecords, renderCVGenerator } from './admin-deck.js?v=5.4.7';
import { openStudentFullEdit } from './student-management.js?v=5.4.7';
import { renderStudentsRegistration } from './student-registration.js?v=5.6.1';

    // -- Primary Tab Switching Variables --
    const mobileTabs = document.querySelectorAll('.mobile-tab');

    // ——— ABCD Primary Architecture Section Titles ———
    const sectionTitles = {
      dashboard: 'Executive Dashboard', profile: 'My Profile', schedule: 'Personal Schedule', work_records: 'Work Records', cv_generator: 'CV Generator',
      organization: 'Organization Structure',
      curriculum: 'Curriculum & Level Master',
      'classes-hub': 'Curriculum & Level Master',
      'class-hub': 'Class Hub',
      import_ai_tests: 'Import AI Tests',
      institutions: 'Batches', students: 'Students', 'import-students': 'Students Registration', 'student-registration': 'Students Registration', 'students-registration': 'Students Registration', 'progress-view': 'Student Progress',
      Classes: 'Curriculum & Classes', classes: 'Classes', 'classes-org': 'Organization Hub', class_instances: 'Class Instances', levels: 'Levels', topics: 'Topics', questions: 'Question Bank', vocab_vault: 'Vocabulary Vault', modules: 'Modules (Core Blocks)', 'import-questions': 'Import Questions', 'export-questions': 'Export Questions',
      tests: 'Tests Hub', 'test-access': 'Test Access', assignments: 'Assignments & Rosters', results: 'Test Results', recalibrator: 'Test Engine Recalibration', question_types: 'Validation Dictionary',
      audit: 'Activity & Audit Logs', settings: 'Site Settings & Cost Guard', recycle: 'Recycle Bin', health: 'Data Health & Connectivity',
      'class-panel': 'Class Panel'
    };

    // ABCD 4-Domain Mapping
    const sectionDomainMap = {
      dashboard: 'ADMIN', profile: 'ADMIN', schedule: 'ADMIN', work_records: 'ADMIN', cv_generator: 'ADMIN', organization: 'ADMIN',
      'classes-hub': 'ADMIN', curriculum: 'ADMIN',
      institutions: 'BOARD', students: 'BOARD', 'import-students': 'BOARD', 'student-registration': 'BOARD', 'students-registration': 'BOARD', 'progress-view': 'BOARD',
      Classes: 'CLASS', classes: 'CLASS', 'classes-org': 'CLASS', class_instances: 'CLASS', levels: 'CLASS', topics: 'CLASS', questions: 'CLASS', question_types: 'CLASS', 'import-questions': 'CLASS', 'export-questions': 'CLASS',
      tests: 'CLASS', 'test-access': 'CLASS', assignments: 'CLASS', results: 'CLASS', import_ai_tests: 'CLASS',
      'class-panel': 'CLASS', 'class-hub': 'CLASS', vocab_vault: 'CLASS',
      audit: 'DATA', settings: 'DATA', recycle: 'DATA', health: 'DATA', recalibrator: 'DATA', modules: 'DATA'
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
      board: 'institutions',
      class: 'classes',
      tests: 'classes', // Legacy alias
      desk: 'recycle',
      data: 'recycle',
      database: 'classes', student: 'students', Test: 'tests',
      academy: 'institutions'
    };

    // Section alias map to guarantee 100% backward compatibility
    const aliasSectionMap = {
      'academy-institutions': 'institutions',
      'academy-programs': 'programs',
      'academy-batches': 'batches',
      'academy-students': 'students',
      'academy-import': 'student-registration',
      'import-students': 'student-registration',
      'students-registration': 'student-registration',
      'board-Classes': 'classes',
      'board-topics': 'topics',
      'board-bank': 'questions',
      'board-wordtypes': 'question_types',
      'board-import': 'import-questions',
      'board-export': 'export-questions',
      'class-assignments': 'assignments',
      'class-results': 'results',
      'class-recalibrator': 'recalibrator',
      'tests-hub': 'tests',
      'tests-assignments': 'assignments',
      'tests-results': 'results',
      'tests-recalibrator': 'recalibrator',
      'desk-audit': 'audit',
      'desk-settings': 'settings',
      'desk-recycle': 'recycle',
      'desk-health': 'health'
    };

    async function updateAdminKpiBanner() {
      try {
        const [stds, asms, atts, profs] = await Promise.all([
          adminFetchAll('students', 'id, deleted_at'),
          adminFetchAll('tests', 'id, status, deleted_at'),
          adminFetchAll('attempts', 'id')
        ]);
        const kpiAcad = document.getElementById('kpi-board');
        if (kpiAcad) kpiAcad.textContent = stds.filter(s => !s.deleted_at).length;
        const kpiChal = document.getElementById('kpi-class') || document.getElementById('kpi-tests');
        if (kpiChal) kpiChal.textContent = asms.filter(a => !a.deleted_at && a.status === 'published').length;
        const kpiDesk = document.getElementById('kpi-desk');
        if (kpiDesk) kpiDesk.textContent = atts.length;
        const kpiAdmin = document.getElementById('kpi-admin');
        if (kpiAdmin) kpiAdmin.textContent = profs ? profs.length : 0;
      } catch (err) {
        console.warn('Could not refresh admin KPI banner:', err.message);
      }
    }



    // --- Auth ---
    const session = getAdminSession();
    if (session) showConsole();

    document.getElementById('admin-login-btn').addEventListener('click', async () => {
      const user = document.getElementById('admin-username').value.trim();
      const pass = document.getElementById('admin-password').value;
      if (!user || !pass) { showToast('Please enter credentials.', 'warning'); return; }

      showLoading('Authenticating...');
      try {
        // 1. Primary Check: Master credentials (admin / admin123) or custom saved password
        const savedCustomPass = localStorage.getItem('topscore_admin_custom_password');
        const normUser = user.toLowerCase();
        const isMasterUser = ['admin', 'administrator', 'superadmin', 'mr. top', 'mrtop'].includes(normUser);
        const isMaster = isMasterUser && (pass === 'admin123' || (savedCustomPass && pass === savedCustomPass));

        if (isMaster) {
          setAdminSession({ admin_id: 'admin-master', username: user });
          hideLoading();
          showToast('Welcome, Administrator!', 'success');
          showConsole();
          return;
        }
        // 2. Secondary Check: Supabase Auth (if user provided an email address registered in Supabase)
        if (user.includes('@')) {
          try {
            const sb = await getSupabase();
            const { data, error } = await sb.auth.signInWithPassword({ email: user, password: pass });
            if (!error && data?.user) {
              setAdminSession({ admin_id: data.user.id, username: user });
              hideLoading();
              showToast('Welcome, Administrator!', 'success');
              showConsole();
              return;
            }
          } catch(authErr) {
            console.warn('Supabase Auth attempt failed:', authErr);
          }
        }

        // Neither matched
        hideLoading();
        showToast('Invalid admin credentials. Please try again.', 'error');
      } catch(e) {
        hideLoading();
        console.error('Login flow error:', e);
        showToast(e.message || 'Authentication failed due to an internal error.', 'error');
      }
    });

    document.getElementById('admin-username')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('admin-password')?.focus();
    });

    document.getElementById('admin-password').addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('admin-login-btn').click();
    });

    document.getElementById('admin-logout-btn').addEventListener('click', () => {
      if (window.isProfileDirty) {
        if (!confirm('You have unsaved changes. Are you sure you want to logout?')) {
          return;
        }
      }
      clearAdminSession();
      document.getElementById('admin-console').classList.add('hidden');
      document.getElementById('admin-login-screen').classList.remove('hidden');
    });

    function showConsole() {
      document.getElementById('admin-login-screen').classList.add('hidden');
      document.getElementById('admin-console').classList.remove('hidden');
      updateAdminKpiBanner();
      if (window.loadSidebarClasses) window.loadSidebarClasses();
      if (window.loadSidebarPrograms) window.loadSidebarPrograms();
      const hash = window.location.hash.substring(1);
      const targetSec = aliasSectionMap[hash] || hash;
      const savedSec = localStorage.getItem('topscore_admin_last_section');
      const savedTargetSec = aliasSectionMap[savedSec] || savedSec;

      if (targetSec && (sectionTitles[targetSec] || targetSec === 'students')) {
        loadSection(targetSec, true);
      } else if (hash && hash.startsWith('profile-')) {
        const studentId = (hash || '').replace('profile-', '');
        activatePrimaryTab('board');
        openStudentProfile(studentId, [], true);
      } else if (savedTargetSec && (sectionTitles[savedTargetSec] || savedTargetSec === 'students')) {
        loadSection(savedSec, false);
      } else {
        activatePrimaryTab('class');
        loadSection('tests', true);
      }
      initConnectionBanner(); // Check live DB connection and show status banner
    }

    window.addEventListener('hashchange', () => {
      const h = window.location.hash.substring(1);
      if (h && h !== window._activeSectionAlias && h !== _currentSection) {
        loadSection(h, true);
      }
    });

    // --- SIDEBAR PROGRAMS LIST INJECTION (DOMAIN B) ---
    async function loadSidebarPrograms(autoSelectProgramId = null) {
      const container = document.getElementById('sidebar-programs-list');
      if (!container) return;

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
              window._filterProgramId = pid;
              window._selectedProgramName = pname;
              window._filterBatchId = null; // Reset batch selection when switching program
              try {
                localStorage.setItem('topscore_selected_program_id', pid);
                localStorage.setItem('topscore_selected_program_name', pname);
              } catch(err) {}
              loadSection('students');
            });
          });
        });
      };

      const renderPrograms = (programs) => {
        const activeList = (programs || []).filter(p => p.is_active !== false);
        const sortedPrograms = activeList.slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        const activeId = autoSelectProgramId || window._filterProgramId || localStorage.getItem('topscore_selected_program_id') || sortedPrograms[0]?.id;

        let html = `<div class="sidebar-program-group" style="display:flex; flex-direction:column; gap:2px;">`;
        if (sortedPrograms.length === 0) {
          html += `<div style="padding: 12px; color: var(--clr-text-muted); font-size: 0.8rem;">No active programs.</div>`;
        } else {
          sortedPrograms.forEach(prog => {
            const isActive = (activeId === prog.id && (_currentSection === 'students' || window._activeSectionAlias === 'students')) ? 'active' : '';
            html += `
              <div class="admin-nav-item sidebar-program-item ${isActive}" data-program-id="${prog.id}" data-program-name="${escapeHtml(prog.name)}" data-sub="students">
                <span class="nav-icon">👥</span>
                <span>${escapeHtml(prog.name)}</span>
              </div>
            `;
          });
        }
        html += `</div>`;
        container.innerHTML = html;
        bindEvents();

        if (!window._filterProgramId && sortedPrograms.length > 0) {
          const selProg = sortedPrograms.find(p => p.id === activeId) || sortedPrograms[0];
          window._filterProgramId = selProg.id;
          window._selectedProgramName = selProg.name;
          try {
            localStorage.setItem('topscore_selected_program_id', selProg.id);
            localStorage.setItem('topscore_selected_program_name', selProg.name);
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
            renderPrograms(cached);
          }
        } catch(e) {}
      }

      // 2. Fetch fresh programs from server (stale-while-revalidate)
      try {
        const programs = await adminFetchAll('programs', 'id, name, is_active, institution_id', { is_active: true });
        if (programs && programs.length > 0) {
          try {
            localStorage.setItem('topscore_cached_sidebar_programs', JSON.stringify(programs));
          } catch(err) {}
          renderPrograms(programs);
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
        const sortedClasses = (classes || []).slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        const activeId = window._selectedClassId || localStorage.getItem('topscore_selected_class_id') || sortedClasses[0]?.id;
        
        let html = `<div class="sidebar-class-group" style="display:flex; flex-direction:column; gap:2px;">`;
        if (sortedClasses.length === 0) {
          html += `<div style="padding: 12px; color: var(--clr-text-muted); font-size: 0.8rem;">No classes found.</div>`;
        } else {
          sortedClasses.forEach(cls => {
            const isActive = (activeId === cls.id && (_currentSection === 'class-hub' || window._activeSectionAlias === 'class-hub')) ? 'active' : '';
            html += `
              <div class="admin-nav-item sidebar-class-item ${isActive}" data-class-id="${cls.id}" data-class-name="${escapeHtml(cls.name)}">
                <span class="nav-icon">📘</span>
                <span>${escapeHtml(cls.name)}</span>
              </div>
            `;
          });
        }
        html += `</div>`;
        container.innerHTML = html;
        bindEvents();

        if (!window._selectedClassId && sortedClasses.length > 0) {
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
            renderClasses(cached);
          }
        } catch(e) {}
      }

      // 2. Fetch fresh classes from server (stale-while-revalidate)
      try {
        const classes = await adminFetchAll('classes', 'id, name, program_id', { is_active: true });
        if (classes && classes.length > 0) {
          try {
            localStorage.setItem('topscore_cached_sidebar_classes', JSON.stringify(classes));
          } catch(err) {}
          renderClasses(classes);
        }
      } catch(err) {
        console.warn('[loadSidebarClasses] server fetch failed, using cache:', err);
      }
    };
    window.loadSidebarClasses = loadSidebarClasses;
    // Call immediately to hydrate sidebar classes with zero delay
    loadSidebarClasses();

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
        const isFresh = cached && (Date.now() - cached.timestamp < 45000);
        if (!isFresh && (!area.querySelector('#class-attendance-grid') || area.dataset.currentClassId !== classId)) {
          area.innerHTML = `<div class="empty-state"><div class="spinner"></div><p>Loading Class Hub for ${escapeHtml(className)}...</p></div>`;
        }
        area.dataset.currentClassId = classId || '';

        // Fetch ALL data relevant to this class and detailed test mapping
        // OPTIMIZATION: Flat students query without heavy nested joins (prevents 500 statement timeouts)
        const [allClasses, allTests, allStudents, allPrograms, allBatches, allQuestions, allLevels, allVault, allAttempts, allInstitutions] = await Promise.all([
          adminFetchAll('classes', 'id, name, program_id').catch(() => []),
          adminFetchAll('tests').catch(() => []), 
          adminFetchAll('students', 'id, name, gender, birth_date, is_active, deleted_at, level_id, batch_id, program_id, institution_id').catch(() => []),
          adminFetchAll('programs', 'id, name, institution_id').catch(() => []),
          adminFetchAll('batches', 'id, name, is_active, program_id, current_level_id').catch(() => []),
          adminFetchAll('test_items', 'id, test_id, answer_type').catch(() => []),
          adminFetchAll('levels').catch(() => []),
          adminFetchAll('vocabulary_vault', 'id, target_level, theme_code, topic_code, word_type, deleted_at').catch(() => []),
          adminFetchAll('attempts').catch(() => []),
          adminFetchAll('institutions', 'id, name').catch(() => [])
        ]);

        if (!classId && allClasses && allClasses.length > 0) {
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

        const classMap = {};
        (allPrograms || []).forEach(c => { classMap[c.id] = c; });
        const instMap = {};
        (allInstitutions || []).forEach(i => { instMap[i.id] = i.name; });
        const levelMap = {};
        (allLevels || []).forEach(l => { levelMap[l.id] = l; });

        const classTests = (allTests || []).filter(a => a.class_id === classId);
        
        // Helper to accurately identify weekly milestone exams vs daily tasks/quizzes
        const isWeeklyExam = (asm) => {
          if (!asm) return false;
          if (asm.test_type === 'exam') return true;
          if (asm.test_type === 'quiz') return false;
          if (['EXAM', 'TEST'].includes(asm.category) || ['EXAM', 'TEST'].includes(asm.test_category)) return true;
          if (['EXAM', 'TEST'].includes(asm.payload?.category) || ['EXAM', 'TEST'].includes(asm.payload?.test_category)) return true;
          if (asm.payload?.is_unified_test === true) return true;
          const shell = String(asm.shell_code || asm.payload?.shell_code || '').toUpperCase();
          if (shell.endsWith('-EXAM') || shell.includes('-EXAM-') || shell.endsWith('-TEST') || shell.includes('-TEST-')) return true;
          if (shell.endsWith('-QUIZ') || shell.includes('-QUIZ-') || shell.endsWith('-TASK') || shell.includes('-TASK-')) return false;
          return /\b(EXAM|TEST)\b/i.test(asm.title || '');
        };
        // Find students that have access to this class's program
        const classProgramId = currentClass?.program_id;
        const programBatches = (allBatches || []).filter(b => b.program_id === classProgramId);
        const classStudents = (allStudents || []).filter(s => {
          if (s.deleted_at) return false;
          const batchObj = (allBatches || []).find(b => b.id === s.batch_id);
          const batchProgId = batchObj?.program_id;
          if (classProgramId && (s.program_id === classProgramId || batchProgId === classProgramId)) return true;
          return false;
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
          const isTest = (r?.category === 'TEST' || r?.test_category === 'TEST' || String(r?.test_type).toUpperCase() === 'TEST' || String(r?.test_type).toLowerCase() === 'exam' || (r?.shell_code && r.shell_code.includes('-TEST')) || r?.test_subtype === 'VOCAB_TEST' || r?.test_subtype === 'PHRASE_TEST') && !pl.topic_code;
          let themes = (pl.themes && Array.isArray(pl.themes) && pl.themes.length > 0) ? pl.themes : null;
          if (!themes && isTest && pl.theme_code) {
            const idx = _ALL_THEMES.indexOf(String(pl.theme_code).toUpperCase());
            themes = idx >= 0 ? _ALL_THEMES.slice(0, idx + 1) : [pl.theme_code];
          }
          return _vaultRows.filter(v => {
            if (Number(v.target_level) !== Number(lvlNumber)) return false;
            const isPhrase = _PHRASE_TYPES.includes(_norm(v.word_type));
            if (!isUnified && wantPhrases !== isPhrase) return false;
            if (themes) return themes.includes(v.theme_code);
            if (pl.theme_code && v.theme_code !== pl.theme_code) return false;
            if (pl.topic_code && v.topic_code !== pl.topic_code) return false;
            return true;
          }).length;
        };

        const formatAnswerType = (type) => {
          if (!type) return 'Multiple Choice';
          type = String(type).toUpperCase();
          if (type === 'MULTIPLE_CHOICE') return '✅ Selection';
          if (type === 'TEXT_MATCH') return '⌨️ Written';
          if (type === 'VOICE_MATCH' || type === 'SPOKEN') return '🗣️ Spoken';
          if (type === 'FILE_UPLOAD') return '📎 Upload';
          if (type === 'ESSAY') return '📝 Essay';
          if (type === 'ROLEPLAY') return '🎭 Roleplay';
          if (type === 'CODE') return '💻 Code';
          return type;
        };

        const statusColors = { published: 'badge-success', draft: 'badge-neutral', unpublished: 'badge-warning', archived: 'badge-danger' };

        // Calculate DataGrid format for Tests (Rich/Detailed)
        window._classHubRecords = {};
        const testsGridData = classTests.map(r => {
          window._classHubRecords[r.id] = r;
          const programName = (r?.program_id && classMap[r.program_id]?.name) ? classMap[r.program_id].name : 'All Programs';
          const prereqId = r?.prerequisite_test_id || r?.prerequisite_id;
          const prereqTest = (prereqId && allTests.find(a => a.id === prereqId)) || null;
          const boardName = (r?.class_id && boardClassMap[r.class_id]?.name) || r?.classes?.name || '—';
          const lvlObj = (r?.level_id && levelMap[r.level_id]) || r?.levels;
          const lvlNum = lvlObj?.level_number || 1;
          const levelDisplay = window.toLevelLetter ? window.toLevelLetter(lvlNum) : 'LVL ' + lvlNum;
          const prereqTitle = prereqTest?.shell_code || prereqTest?.title || prereqTest?.name || r?.prereq?.name || r?.prerequisite?.name || r?.prereq || '';
          
          const title = r?.title || r?.display_name || r?.name || 'Untitled';
          const status = r?.status || r?.test_type || 'draft';
          const TestCategory = r?.test_type || 'Daily';
          
          let answerType = r?.answer_type || '';
          const asmQs = (allQuestions || []).filter(q => q?.test_id === r?.id);
          if (!answerType && asmQs.length > 0) {
            const typeCounts = {};
            asmQs.forEach(q => {
              if (q.answer_type) typeCounts[q.answer_type] = (typeCounts[q.answer_type] || 0) + 1;
            });
            let max = 0;
            for (const t in typeCounts) {
              if (typeCounts[t] > max) { max = typeCounts[t]; answerType = t; }
            }
          }
          const timeLimit = r?.working_duration_minutes || r?.time_limit_minutes || Math.floor((r?.time_limit_seconds || 3600) / 60);
          const minScore = r?.minimum_required_score || 60;
          const _isDyn = !!(r?.payload && r.payload.is_dynamic_shell) || r?.is_dynamic_shell === true;
          const _vaultQ = _isDyn ? vaultCountFor(r, lvlNum) : 0;
          const qCount = (allQuestions || []).filter(q => q?.test_id === r?.id).length;

          return {
            id: r?.id || '',
            title,
            programName,
            classBoard: boardName,
            level: levelDisplay,
            order: r?.display_order ?? r?.order_index ?? 1,
            prereq: prereqTitle,
            answerType: formatAnswerType(answerType),
            questionOrder: r?.question_order === 'random' ? 'Random' : 'Seq',
            TestCategory,
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
          const isTest = asm.test_category === 'TEST' || 
                         asm.payload?.test_category === 'TEST' || 
                         asm.payload?.is_unified_test === true ||
                         /\bTEST\b/i.test(asm.shell_code || asm.payload?.shell_code || '') || 
                         /\bTEST\b/i.test(asm.title || '');
          const code = asm.payload?.shell_code || asm.shell_code || asm.title || '';
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

          let completedCount = 0;         // ALL activities (daily tasks/quizzes + weekly exams)
          let completedWeeklyCount = 0;   // Weekly exams ONLY
          let weeklyEarnedScore = 0;      // Points earned EXCLUSIVELY from weekly exams
          let weeklyMaxPossible = 0;      // Max points possible EXCLUSIVELY from weekly exams
          let sumWeeklyPercentages = 0;   // Sum of percentages EXCLUSIVELY from weekly exams

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
                // Sort by highest capped score, then highest percentage, then latest date
                submittedAtts.sort((x, y) => {
                  const xSc = Math.min(Number(x.score ?? 0), maxQ);
                  const ySc = Math.min(Number(y.score ?? 0), maxQ);
                  const scoreDiff = ySc - xSc;
                  if (scoreDiff !== 0) return scoreDiff;
                  const pctDiff = Number(y.percentage ?? 0) - Number(x.percentage ?? 0);
                  if (Math.abs(pctDiff) > 0.01) return pctDiff;
                  return new Date(y.submitted_at || y.created_at || 0) - new Date(x.submitted_at || x.created_at || 0);
                });
                const topAtt = submittedAtts[0];
                const markedBest = submittedAtts.find(a => a.is_best_score === true);
                if (markedBest && Math.min(Number(markedBest.score ?? 0), maxQ) >= Math.min(Number(topAtt.score ?? 0), maxQ) && Number(markedBest.percentage ?? 0) >= Number(topAtt.percentage ?? 0) - 0.01) {
                  bestAtt = markedBest;
                } else {
                  bestAtt = topAtt;
                }
              } else {
                bestAtt = atts[0];
              }
            }

            asmScores[asm.id] = bestAtt;
            const totalQ = Number(bestAtt?.total_questions || maxQ);
            const rawEarned = bestAtt?.score != null ? Math.min(Number(bestAtt.score), maxQ) : 0;
            const rawPct = bestAtt ? (bestAtt.percentage != null ? Number(bestAtt.percentage) : (totalQ > 0 ? (rawEarned / totalQ) * 100 : 0)) : -1;
            
            const isRem = Boolean(bestAtt?.is_remedial_unlocked);
            const maxRemPts = totalQ * 0.6;
            const effEarned = isRem ? Math.min(rawEarned, maxRemPts) : rawEarned;
            const effPct = isRem ? Math.min(rawPct, 60.0) : rawPct;

            rowScoreSortVals[`test_${asm.id}`] = bestAtt ? effEarned : -1;
            rowScoreSortVals[`test_${asm.id}_pts`] = bestAtt ? effEarned : -1;
            rowScoreSortVals[`test_${asm.id}_pct`] = bestAtt ? effPct : -1;

            if (bestAtt) {
              const st = String(bestAtt.status || '').toLowerCase();
              if (['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(st)) {
                completedCount++;
                if (isWeeklyExam(asm)) {
                  completedWeeklyCount++;
                  weeklyEarnedScore += effEarned;
                  weeklyMaxPossible += totalQ;
                  sumWeeklyPercentages += effPct;
                }
              }
            }
          });

          const totalClassTests = classTests.length || 40;
          // 1. PROG % (Completion Rate): Maintain calculation across ALL activities (daily tasks/quizzes + weekly exams)
          const progressPct = totalClassTests > 0 ? Math.round((completedCount / totalClassTests) * 100) : 0;
          const progressStr = `${progressPct}%`;

          // 2. Global SCORE % & Global GRD (Academic Mastery) & Global PTS:
          // Calculated EXCLUSIVELY from weekly exams (Theme TOT / milestone exam sessions).
          // Daily tasks/quizzes are excluded entirely from academic mastery scoring.
          // Edge-Case Handling (Unattempted Weekly Exams):
          // If a student has only completed daily tasks without taking weekly exams:
          // - PROG % reflects task completion.
          // - SCORE % displays 0% (or "-").
          // - GRD badge displays "-".
          // - PTS evaluates to 0.
          const averageScorePct = completedWeeklyCount > 0
            ? Math.round(sumWeeklyPercentages / completedWeeklyCount)
            : 0;
          const overallPct = averageScorePct;
          const curriculumGradePct = averageScorePct;
          const totalEarnedScore = completedWeeklyCount > 0 ? weeklyEarnedScore : 0;
          const totalMaxPossible = completedWeeklyCount > 0 ? weeklyMaxPossible : 0;

          let grade = '—';
          let gradeColor = 'rgba(255,255,255,0.4)';
          if (completedWeeklyCount > 0) {
            const g = typeof calculateGrade === 'function' ? calculateGrade(averageScorePct) : (typeof getGrade === 'function' ? getGrade(averageScorePct) : '—');
            grade = g;
            gradeColor = typeof getGradeColorByScore === 'function' ? getGradeColorByScore(averageScorePct) : (typeof getGradeColor === 'function' ? getGradeColor(g) : '#EAB308');
          }

          // Find latest submitted test
          let latestAsm = null;
          let latestScore = -1;
          const submittedAtts = classAttempts.filter(a => {
            const st = String(a.status || '').toLowerCase();
            return ['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(st);
          });
          if (submittedAtts.length > 0) {
            submittedAtts.sort((x, y) => {
              const diff = Number(y.score ?? 0) - Number(x.score ?? 0);
              if (diff !== 0) return diff;
              return new Date(y.submitted_at || y.created_at || 0) - new Date(x.submitted_at || x.created_at || 0);
            });
            const la = submittedAtts[0];
            const asm = classTests.find(a => a.id === (la.test_id || la.Test_id));
            const code = asm?.shell_code || asm?.title || 'Task';
            const sc = la.score != null ? Number(la.score) : 0;
            const totalQ = Number(la.total_questions || (asm?.is_dynamic_shell || asm?.payload?.is_dynamic_shell ? vaultCountFor(asm, (levelMap[asm?.level_id]?.level_number || 1)) : 50));
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
            displayName: (typeof formatStudentName === 'function') ? (formatStudentName(s.name, s.gender) || s.name || 'Unknown') : (s.name || 'Unknown'),
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
            completedWeeklyCount,
            totalClassTests,
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
            asmScores,
            pin: s.pin || '****',
            phone: s.phone || s.phone_number || '—',
            email: s.email || '—',
            isActive: s.is_active !== false,
            ...rowScoreSortVals,
            _raw: s
          };
        });

        // Leaderboard Sort Order:
        // Primary: PROG % DESC.
        // Secondary: Global SCORE % DESC.
        // Tertiary: Global PTS DESC.
        studentsGridData.sort((a, b) => {
          const aActive = a.isActive ? 1 : 0;
          const bActive = b.isActive ? 1 : 0;
          if (aActive !== bActive) return bActive - aActive;

          // 1. Primary: PROG % DESC
          const progA = Number(a.progressPct ?? 0);
          const progB = Number(b.progressPct ?? 0);
          if (progA !== progB) return progB - progA;

          // 2. Secondary: Global SCORE % DESC (unattempted weekly exams sort after completed)
          const scoreA = (a.completedWeeklyCount > 0) ? Number(a.averageScorePct ?? 0) : -1;
          const scoreB = (b.completedWeeklyCount > 0) ? Number(b.averageScorePct ?? 0) : -1;
          if (scoreA !== scoreB) return scoreB - scoreA;

          // 3. Tertiary: Global PTS DESC
          const ptsA = Number(a.totalEarnedScore ?? 0);
          const ptsB = Number(b.totalEarnedScore ?? 0);
          if (ptsA !== ptsB) return ptsB - ptsA;

          return (a.displayName || a.name || '').localeCompare(b.displayName || b.name || '', undefined, { sensitivity: 'base', numeric: true });
        });

        // State for active tab (Order: 1. Students Grade and Score, 2. Test Sessions, 3. Class Tests)
        if (!window._classHubActiveTab) window._classHubActiveTab = 'attendance';

        window._switchClassHubTab = (tabId) => {
          window._classHubActiveTab = tabId;
          window.renderClassHub(document.getElementById('admin-content-area'));
        };

        const activeBatchStudents = classStudents.filter(s => {
          const b = batchMap[s.batch_id];
          return b ? b.is_active !== false : true;
        });

        const taskTests = classTests.filter(a => a.test_type === 'quiz' || a.category === 'QUIZ' || a.category === 'TASK' || a.test_type === 'VOCAB_TASK' || a.test_type === 'PHRASE_TASK' || (a.test_subtype && a.test_subtype.includes('QUIZ')) || (a.test_subtype && a.test_subtype.includes('TASK')) || /\b(QUIZ|TASK)\b/i.test(a.title || ''));
        const testTests = classTests.filter(a => a.test_type === 'exam' || a.category === 'EXAM' || a.category === 'TEST' || a.test_type === 'VOCAB_TEST' || a.test_type === 'PHRASE_TEST' || (a.test_subtype && a.test_subtype.includes('EXAM')) || (a.test_subtype && a.test_subtype.includes('TEST')) || /\b(EXAM|TEST)\b/i.test(a.title || ''));

        const classHubTabs = [
          { id: 'attendance', icon: '📊', val: activeBatchStudents.length, label: 'Students Grade and Score' },
          { id: 'test-sessions', icon: '🔐', val: 4, label: 'Test Sessions' },
          { id: 'tests', icon: '📝', val: classTests.length, label: 'Class Tests' }
        ];

        if (window.setTopbarTabs) {
          window.setTopbarTabs(classHubTabs, window._classHubActiveTab, 'window._switchClassHubTab');
        }

        let html = `
          <div>
            <div id="class-hub-tab-content">
              ${window._classHubActiveTab === 'test-sessions' ? `
                <div id="class-test-sessions-container"></div>
              ` : (window._classHubActiveTab === 'tests' ? `
                <div class="card" style="padding: 0.85rem 1rem; background: var(--clr-surface); margin: 0;">
                  <!-- Sleek Tactical Toolbar for Class Tests -->
                  <div class="class-asm-toolbar" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                      <h3 style="margin: 0; font-size: 1.05rem; font-weight: 700; color: var(--clr-text-1);">📝 Class Tests</h3>
                      <div class="asm-meta-chips" style="display: inline-flex; align-items: center; gap: 6px;">
                        <span class="badge" style="background: rgba(250, 204, 21, 0.12); color: #facc15; font-size: 0.72rem; font-weight: 700; border: 1px solid rgba(250, 204, 21, 0.3);">⚡ ${taskTests.length} Quizzes (Daily)</span>
                        <span class="badge" style="background: rgba(244, 114, 182, 0.12); color: #f472b6; font-size: 0.72rem; font-weight: 700; border: 1px solid rgba(244, 114, 182, 0.3);">📝 ${testTests.length} Exams (Theme)</span>
                        <span class="badge" style="background: rgba(16, 185, 129, 0.12); color: #10b981; font-size: 0.72rem; font-weight: 700; border: 1px solid rgba(16, 185, 129, 0.3);">🎯 Min. 60%</span>
                      </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <button type="button" class="btn btn-secondary btn-sm" id="btn-open-blueprint-from-class" style="font-size: 0.75rem; font-weight: 600;" title="Buka Roadmap Kurikulum Lengkap di Test Blueprint">
                        🗺️ Buka Test Blueprint ↗
                      </button>
                      <button type="button" class="btn btn-primary btn-sm" id="btn-open-generator-from-class" style="font-size: 0.75rem; font-weight: 700; background: #4f46e5; border-color: #4f46e5;" title="Buka Wizard Generator &amp; Pengaturan Kurikulum">
                        ⚡ Generator &amp; Settings Wizard
                      </button>
                    </div>
                  </div>
                  <div id="class-tests-grid"></div>
                </div>
              ` : `
                <div id="class-attendance-container">
                  <div class="attendance-matrix-toolbar" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                      <div class="attendance-theme-pills" id="attendance-theme-pills-container">
                        <span style="font-size:0.7rem; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:0.04em; margin-right:2px;">THEME VIEW:</span>
                        <button type="button" class="attendance-theme-pill ${(!window._classAttendanceThemeFilter || window._classAttendanceThemeFilter === 'ALL') ? 'active' : ''}" onclick="window._setAttendanceThemeFilter('ALL')" data-theme="ALL">🌐 ALL (EXAMS ONLY)</button>
                        <button type="button" class="attendance-theme-pill theme-a ${window._classAttendanceThemeFilter === 'A' ? 'active' : ''}" onclick="window._setAttendanceThemeFilter('A')" data-theme="A">🟦 THEME A (8)</button>
                        <button type="button" class="attendance-theme-pill theme-b ${window._classAttendanceThemeFilter === 'B' ? 'active' : ''}" onclick="window._setAttendanceThemeFilter('B')" data-theme="B">🟪 THEME B (10)</button>
                        <button type="button" class="attendance-theme-pill theme-c ${window._classAttendanceThemeFilter === 'C' ? 'active' : ''}" onclick="window._setAttendanceThemeFilter('C')" data-theme="C">🟧 THEME C (12)</button>
                        <button type="button" class="attendance-theme-pill theme-d ${window._classAttendanceThemeFilter === 'D' ? 'active' : ''}" onclick="window._setAttendanceThemeFilter('D')" data-theme="D">🟩 THEME D (10)</button>
                      </div>

                      <div class="attendance-view-mode-pills" id="attendance-view-mode-container" style="display:flex; align-items:center; gap:4px; border-left:1px solid rgba(255,255,255,0.12); padding-left:8px;">
                        <span style="font-size:0.68rem; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:0.03em;">DISPLAY:</span>
                        <button type="button" class="attendance-theme-pill mode-fit ${(!window._attendanceViewMode || window._attendanceViewMode === 'fit') ? 'active' : ''}" onclick="window._toggleAttendanceViewMode('fit')" title="Scale tests to fit comfortably on screen" data-mode="fit">🔍 FIT SCREEN</button>
                        <button type="button" class="attendance-theme-pill mode-scroll ${window._attendanceViewMode === 'scroll' ? 'active' : ''}" onclick="window._toggleAttendanceViewMode('scroll')" title="100% full scale with smooth horizontal scroll and mouse wheel" data-mode="scroll">↔️ 100% SCROLL</button>
                      </div>

                      <div id="attendance-pan-controls" style="display:${window._attendanceViewMode === 'scroll' ? 'inline-flex' : 'none'}; align-items:center; gap:4px;">
                        <button type="button" class="btn btn-secondary btn-sm" onclick="window._panAttendanceMatrix(-400)" title="Pan Left" style="padding:2px 8px; font-size:0.75rem; height:24px; line-height:1;">◀</button>
                        <button type="button" class="btn btn-secondary btn-sm" onclick="window._panAttendanceMatrix(400)" title="Pan Right" style="padding:2px 8px; font-size:0.75rem; height:24px; line-height:1;">▶</button>
                      </div>
                    </div>

                    <div style="display:flex; align-items:center; gap:10px; font-size:0.68rem; color:#94a3b8;">
                      <button type="button" class="btn btn-secondary btn-sm" onclick="window._toggleFullWidthMatrix()" id="matrix-fullwidth-btn" title="Toggle Sidebar for maximum table width" style="padding:2px 8px; font-size:0.72rem; height:24px; line-height:1; display:inline-flex; align-items:center; gap:4px;">
                        <span>⇱</span> <span id="matrix-fullwidth-text">Full Width</span>
                      </button>
                      <span style="display:inline-flex; align-items:center; gap:3px;"><span style="color:#FFFF00; font-weight:800;">WRD</span> Word</span>
                      <span style="display:inline-flex; align-items:center; gap:3px;"><span style="color:#00FFFF; font-weight:800;">PHR</span> Phrase</span>
                      <span style="display:inline-flex; align-items:center; gap:3px;"><span style="color:#e2e8f0; font-weight:800;">PTS</span> Points</span>
                      <span style="display:inline-flex; align-items:center; gap:3px;"><span style="color:#e2e8f0; font-weight:800;">SCORE</span> %</span>
                      <span style="display:inline-flex; align-items:center; gap:3px;"><span style="color:#FFFF00; font-weight:800; font-size:0.75rem;">ᴿ</span> Remedi</span>
                      <span style="display:inline-flex; align-items:center; gap:3px;"><span class="grade-circle grade-circle-star" style="width:16px !important; height:16px !important; min-width:16px !important; min-height:16px !important; font-size:0.6rem !important;">★</span> ★ (100%)</span>
                    </div>
                  </div>
                  <div id="class-attendance-grid"></div>
                </div>
              `)}
            </div>
          </div>
        `;
        area.innerHTML = html;

        // Render content depending on tab
        if (window._classHubActiveTab === 'test-sessions') {
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
        } else if (window._classHubActiveTab === 'tests') {
          const classAsmGrid = new window.DataGrid({
            container: document.getElementById('class-tests-grid'),
            data: testsGridData,
            pageSize: 50,
            searchKeys: ['title', 'shellCode', 'status', 'TestCategory'],
            bulkActions: true,
            customBulkActions: [
              {
                label: '⚡ Bulk Edit',
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
                key: 'title', 
                label: 'TITLE', 
                sortable: true,
                render: (val, row) => {
                  let displayTitle = escapeHtml(row.title);
                  displayTitle = displayTitle.replace(/\b(Task)\b/gi, '<span style="color: #facc15;">$1</span>');
                  displayTitle = displayTitle.replace(/\b(Test)\b/gi, '<span style="color: #f472b6;">$1</span>');
                  return `<div class="fw-700" style="color:var(--clr-text-1); font-size:0.85rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:250px;" title="${escapeHtml(row.title)}">${displayTitle}</div>`;
                }
              },
              {
                key: 'order',
                label: 'CODE',
                sortable: true,
                render: (val, row) => {
                  if (row.shellCode) {
                    return `<div style="font-size:0.7rem; color:var(--clr-primary); font-family:monospace; font-weight:bold; white-space:nowrap; background:rgba(255,255,255,0.05); padding:2px 6px; border-radius:4px; border:1px solid rgba(255,255,255,0.1); display:inline-block; max-width:180px; overflow:hidden; text-overflow:ellipsis;" title="${escapeHtml(row.shellCode)}">${escapeHtml(row.shellCode)}</div>`;
                  }
                  return `<div style="font-size:0.75rem; color:var(--clr-text-2); white-space:nowrap;">ORD: ${row.order || '-'}</div>`;
                }
              },
              { 
                key: 'prereq', 
                label: 'PREREQUISITE', 
                sortable: true,
                render: (val, row) => {
                  const prereqDisplay = row.prereq || '';
                  if (!prereqDisplay) return '<span class="text-muted" style="font-size:0.75rem;">—</span>';
                  return `<div style="font-size:0.7rem; color:var(--clr-warning); font-family:monospace; font-weight:bold; white-space:nowrap; background:rgba(255,255,255,0.05); padding:2px 6px; border-radius:4px; border:1px solid rgba(255,255,255,0.1); display:inline-block; max-width:180px; overflow:hidden; text-overflow:ellipsis;" title="${escapeHtml(prereqDisplay)}">⚠️ ${escapeHtml(prereqDisplay)}</div>`;
                }
              },
              {
                key: 'classBoard',
                label: 'CLASS',
                sortable: true,
                render: (val, row) => `<div style="font-size:0.75rem; color:var(--clr-text-2); white-space:nowrap;">${escapeHtml(row.classBoard || '-')}</div>`
              },
              {
                key: 'level',
                label: 'LEVEL',
                sortable: true,
                render: (val, row) => `<div style="font-size:0.75rem; color:var(--clr-primary); font-weight:600; white-space:nowrap;">${escapeHtml(row.level || '-')}</div>`
              },
              {
                key: 'TestCategory',
                label: 'TYPE',
                sortable: true,
                render: (val, row) => {
                  let typeStr = escapeHtml(row.TestCategory || 'Daily');
                  typeStr = typeStr.replace(/(TASK)/ig, '<span style="color: #facc15; font-weight: 800;">$1</span>');
                  typeStr = typeStr.replace(/(TEST)/ig, '<span style="color: #f472b6; font-weight: 800;">$1</span>');
                  return `<div style="font-size:0.75rem; color:var(--clr-text-2); white-space:nowrap;">${typeStr}</div>`;
                }
              },
              { 
                key: 'answerType', 
                label: 'ANSWER', 
                sortable: true,
                render: (val, row) => `<div class="fw-600 text-info" style="font-size:0.75rem; white-space:nowrap;">${escapeHtml(row.answerType || 'Multiple Choice')}</div>`
              },
              {
                key: 'questionOrder',
                label: 'ACCESS',
                sortable: true,
                render: (val, row) => `<div style="font-size:0.75rem; color:var(--clr-text-2); white-space:nowrap;">${row.questionOrder === 'Random' ? '&#128256; Rand' : '&rarr; Seq'}</div>`
              },
              {
                key: 'timeLimit',
                label: 'DUR. (M)',
                sortable: true,
                render: (val, row) => `<div style="font-size:0.75rem; color:var(--clr-text-2); white-space:nowrap;">&#9201;&#65039; ${row.timeLimit || 60}</div>`
              },
              {
                key: 'minScore',
                label: 'PASS (%)',
                sortable: true,
                render: (val, row) => `<div style="font-size:0.75rem; color:var(--clr-text-2); white-space:nowrap;">&#127919; ${row.minScore || 60}</div>`
              },
              { 
                key: 'qCount', 
                label: 'QS', 
                sortable: true,
                render: (val, row) => {
                  const count = row.qCount || 0;
                  if (row.qIsVault) return `<span class="fw-700 ${count > 0 ? 'text-info' : 'text-danger'}" style="font-size:0.8rem;" title="Live count projected from Vocabulary Vault">&#9889; ${count} (Vault)</span>`;
                  return `<span class="fw-700 ${count > 0 ? 'text-info' : 'text-danger'}" style="font-size:0.8rem;">${count}</span>`;
                }
              },
              { 
                key: 'status', 
                label: 'STATUS', 
                sortable: true,
                render: (val, row) => {
                  const st = row.status || 'draft';
                  return `<span class="badge ${statusColors[String(st).toLowerCase()] || 'badge-neutral'} fw-700" style="font-size: 0.65rem; padding: 2px 6px; text-transform: uppercase;">${escapeHtml(st)}</span>`;
                }
              },
              { 
                key: 'actions', 
                label: '', 
                sortable: false,
                render: (val, row) => {
                  const id = row.id || '';
                  const st = String(row.status || 'draft').toLowerCase();
                  const isPub = st === 'published';
                  const pubBtnCls = isPub ? 'btn-danger' : 'btn-success';
                  const pubIcon = isPub ? '&#128065;&#65039;' : '&#128065;';
                  const safeTitle = (row.title || '').replace(/['"\\]/g, ' ');
                  return `
                    <div class="d-flex gap-1 justify-end align-center">
                      <button class="btn btn-ghost" style="padding: 2px 6px; font-size: 0.75rem;" title="View Results" onclick="window._filterTestResults='${id}'; window.loadSection('results');">&#128202;</button>
                      <button class="btn btn-ghost" style="padding: 2px 6px; font-size: 0.75rem;" title="Recalibrate" onclick="window._filterRecalibrateTest='${id}'; window.loadSection('health');">&#9878;&#65039;</button>
                      <button class="btn btn-secondary" style="padding: 2px 6px; font-size: 0.75rem;" onclick="window._duplicateTest('${id}')" title="Duplicate">&#128196;</button>
                      <button class="btn ${pubBtnCls}" style="padding: 2px 6px; font-size: 0.75rem;" onclick="window._publishTest('${id}', '${st}')">
                        ${pubIcon}
                      </button>
                      <button class="btn btn-secondary" style="padding: 2px 6px; font-size: 0.75rem;" onclick="window.openCrudModal('tests', window._classHubRecords['${id}'])">&#9999;&#65039;</button>
                      <button class="btn btn-secondary" style="padding: 2px 6px; font-size: 0.75rem; background-color: var(--clr-accent-1); color: white;" onclick="window._deleteRecord('tests', '${id}', '${safeTitle}')">&#128465;&#65039;</button>
                    </div>
                  `;
                }
              }
            ]
          });

          // Open Test Blueprint in Vocabulary Vault
          document.getElementById('btn-open-blueprint-from-class')?.addEventListener('click', () => {
            window._activeVaultTab = 'blueprint';
            window.location.hash = '#vocab_vault';
          });

          // Open Test Generator & Settings Wizard
          document.getElementById('btn-open-generator-from-class')?.addEventListener('click', async () => {
            try {
              const { openAutoGenerateModal } = await import('./auto-gen-modal.js?v=20261027c');
              await openAutoGenerateModal({
                explicitClassId: classId,
                onComplete: () => {
                  window.renderClassHub(document.getElementById('admin-content-area'));
                }
              });
            } catch (err) {
              console.error(err);
              showToast('Gagal membuka wizard: ' + err.message, 'error');
            }
          });
        } else {
          let attendanceGridInstance = null;
          const rosterBatchFilter = window._classRosterBatchFilter || 'active';
          const filterRosterData = (data, filterVal) => {
            if (filterVal === 'active') {
              return data.filter(s => {
                const b = batchMap[s._raw?.batch_id];
                return b ? b.is_active !== false : true;
              });
            } else if (filterVal === 'all') {
              return data;
            } else {
              return data.filter(s => s._raw?.batch_id === filterVal);
            }
          };

          const initialRosterData = filterRosterData(studentsGridData, rosterBatchFilter);

          // Dynamically compute theme headers and colSpans from actual classTests
          const themeCounts = {};
          const themeAsmCounts = { 'A': 0, 'B': 0, 'C': 0, 'D': 0 };
          const themeNames = {
            'A': 'WORKPLACE',
            'B': 'TOURISM',
            'C': 'CCU',
            'D': 'HIGH-FREQUENCY'
          };

          classTests.forEach(asm => {
            const isTest = isWeeklyExam(asm);
            const rawTheme = asm.payload?.theme_code || (asm.shell_code ? asm.shell_code.replace(/^[0-9]+/, '').charAt(0) : 'A');
            const themeCode = (rawTheme || 'A').toUpperCase();
            const colSpan = isTest ? 2 : 1;
            themeCounts[themeCode] = (themeCounts[themeCode] || 0) + colSpan;
            if (themeAsmCounts[themeCode] !== undefined) themeAsmCounts[themeCode]++;
            if (asm.payload?.theme_name && !themeNames[themeCode]) {
              themeNames[themeCode] = asm.payload.theme_name.toUpperCase();
            }
          });

          // Update theme filter pills labels with accurate test counts
          const themeContainer = document.getElementById('attendance-theme-pills-container');
          if (themeContainer) {
            const btnAll = themeContainer.querySelector('[data-theme="ALL"]');
            if (btnAll) btnAll.textContent = `🌐 ALL (TESTS ONLY)`;
            const btnA = themeContainer.querySelector('[data-theme="A"]');
            if (btnA) btnA.textContent = `🟦 THEME A (${themeAsmCounts['A'] || 8})`;
            const btnB = themeContainer.querySelector('[data-theme="B"]');
            if (btnB) btnB.textContent = `🟪 THEME B (${themeAsmCounts['B'] || 10})`;
            const btnC = themeContainer.querySelector('[data-theme="C"]');
            if (btnC) btnC.textContent = `🟧 THEME C (${themeAsmCounts['C'] || 12})`;
            const btnD = themeContainer.querySelector('[data-theme="D"]');
            if (btnD) btnD.textContent = `🟩 THEME D (${themeAsmCounts['D'] || 10})`;
          }

          // Function to build and mount the attendance grid based on selected theme
          const renderAttendanceGridMatrix = (selectedTheme = 'ALL') => {
            window._classAttendanceThemeFilter = selectedTheme;

            // Update active pill button state
            if (themeContainer) {
              themeContainer.querySelectorAll('.attendance-theme-pill').forEach(b => {
                b.classList.toggle('active', (b.dataset.theme || 'ALL') === selectedTheme);
              });
            }

            const isTestAsm = isWeeklyExam;

            // Filter tests if a specific theme is selected:
            // When ALL: only show Checkpoint Tests across all themes! (8 tests = 16 columns)
            // When specific theme (A, B, C, D): show all tasks and tests for that theme!
            const activeTests = selectedTheme === 'ALL'
              ? classTests.filter(isTestAsm)
              : classTests.filter(asm => {
                  const rawTheme = asm.payload?.theme_code || (asm.shell_code ? asm.shell_code.replace(/^[0-9]+/, '').charAt(0) : 'A');
                  return (rawTheme || 'A').toUpperCase() === selectedTheme;
                });

            // Group activeTests by theme and compute dynamic columns
            const themeGroups = {};
            activeTests.forEach(asm => {
              const rawTheme = asm.payload?.theme_code || (asm.shell_code ? asm.shell_code.replace(/^[0-9]+/, '').charAt(0) : 'A');
              const tc = (rawTheme || 'A').toUpperCase();
              if (!themeGroups[tc]) themeGroups[tc] = [];
              themeGroups[tc].push(asm);
            });

            const sortedActiveThemes = Object.keys(themeGroups).sort();

            // Pre-calculate theme total points for each student in studentsGridData
            sortedActiveThemes.forEach(tc => {
              const asmsInTheme = themeGroups[tc];
              studentsGridData.forEach(row => {
                let themeEarned = 0;
                let hasAtt = false;
                asmsInTheme.forEach(asm => {
                  const att = row.asmScores?.[asm.id];
                  if (att) {
                    const st = String(att.status || '').toLowerCase();
                    if (['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(st)) {
                      hasAtt = true;
                      const isRem = Boolean(att.is_remedial_unlocked);
                      const maxQ = getAsmExpectedMax(asm);
                      const sc = att.score != null ? Math.min(Number(att.score), maxQ) : 0;
                      const totalQ = Number(att.total_questions || maxQ);
                      const maxRemPts = totalQ * 0.6;
                      const effSc = isRem ? Math.min(sc, maxRemPts) : sc;
                      themeEarned += effSc;
                    }
                  }
                });
                row[`theme_${tc}_total_pts`] = hasAtt ? themeEarned : -1;
              });
            });

            // Dynamic super-headers
            const dynamicSuperHeaders = [
              { label: 'STUDENT DETAILS', colSpan: 8, className: 'super-hdr super-hdr-student' }
            ];

            const themeColorClasses = {
              'A': 'super-hdr super-hdr-theme super-hdr-theme-a',
              'B': 'super-hdr super-hdr-theme super-hdr-theme-b',
              'C': 'super-hdr super-hdr-theme super-hdr-theme-c',
              'D': 'super-hdr super-hdr-theme super-hdr-theme-d'
            };

            const sortedThemes = Object.keys(themeCounts).sort();
            if (selectedTheme === 'ALL') {
              sortedThemes.forEach(tc => {
                const tName = themeNames[tc] ? ` (${themeNames[tc]})` : '';
                const themeTests = activeTests.filter(asm => {
                  const rawTheme = asm.payload?.theme_code || (asm.shell_code ? asm.shell_code.replace(/^[0-9]+/, '').charAt(0) : 'A');
                  return (rawTheme || 'A').toUpperCase() === tc;
                });
                const colSpan = themeTests.length > 0 ? (themeTests.length * 2) + 1 : 0; // SCORE + PTS per test, PLUS 1 for Theme Total Points
                if (colSpan > 0) {
                  dynamicSuperHeaders.push({
                    label: `THEME ${tc}${tName}`,
                    colSpan: colSpan,
                    className: themeColorClasses[tc] || `super-hdr super-hdr-theme super-hdr-theme-${tc.toLowerCase()}`
                  });
                }
              });
            } else {
              const tName = themeNames[selectedTheme] ? ` (${themeNames[selectedTheme]})` : '';
              const colSpan = (themeCounts[selectedTheme] || activeTests.length) + 1; // All tasks + tests in theme, PLUS 1 for Theme Total Points
              dynamicSuperHeaders.push({
                label: `THEME ${selectedTheme}${tName}`,
                colSpan: colSpan,
                className: themeColorClasses[selectedTheme] || `super-hdr super-hdr-theme super-hdr-theme-${selectedTheme.toLowerCase()}`
              });
            }

            // Build dynamic test and theme total columns
            const dynamicAsmCols = [];
            sortedActiveThemes.forEach(tc => {
              const asmsInTheme = themeGroups[tc];

              asmsInTheme.forEach(asm => {
                const num = asm.display_order || (classTests.indexOf(asm) + 1);
                const isTest = asm.test_type === 'exam' ||
                               asm.category === 'EXAM' ||
                               asm.test_category === 'EXAM' || 
                               asm.test_category === 'TEST' || 
                               asm.category === 'TEST' ||
                               asm.payload?.test_category === 'EXAM' || 
                               asm.payload?.test_category === 'TEST' || 
                               asm.payload?.tier === 'EXAM' ||
                               asm.payload?.is_unified_test === true ||
                               /\b(EXAM|TEST)\b/i.test(asm.shell_code || asm.payload?.shell_code || '') || 
                               /\b(EXAM|TEST)\b/i.test(asm.title || '');
                const code = asm.payload?.shell_code || asm.shell_code || asm.title;
                const isPhrase = asm.payload?.category === 'phrases' || /PHRASES/i.test(code || '') || /phrase/i.test(asm.title || '');
                const tag = isTest ? (isPhrase ? 'PHRASE EXAM' : 'WORD EXAM') : (isPhrase ? 'PHRASE QUIZ' : 'WORD QUIZ');
                const cleanTitle = asm.title || asm.name || code || 'Test';
                const headerTooltip = (code && cleanTitle && !cleanTitle.toLowerCase().startsWith(code.toLowerCase()))
                  ? `${code}: ${cleanTitle}`
                  : cleanTitle;

                if (isTest) {
                  // 1. SCORE COLUMN FIRST (User requirement: "score, baru point")
                  dynamicAsmCols.push({
                    key: `test_${asm.id}_pct`,
                    className: 'col-asm col-exam col-exam-score',
                    width: '50px',
                    headerTitle: `${headerTooltip} (Score %)`,
                    title: `${headerTooltip} (Score %)`,
                    label: `
                      <div class="asm-hdr-cell">
                        <span class="test-num test-num-test" title="${escapeHtml(headerTooltip)}">${num}</span>
                        <span class="test-subtag test-subtag-test-score">SCORE</span>
                      </div>
                    `,
                    sortable: true,
                    align: 'center',
                    render: (val, row) => {
                      const att = row.asmScores?.[asm.id];
                      if (!att) return '<span class="asm-dot" title="Unattempted">&middot;</span>';
                      const st = String(att.status || '').toLowerCase();
                      if (st === 'in_progress') return `<span style="color:#FFFF00; font-size:0.65rem;" title="In Progress">⏳</span>`;
                      if (!['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(st)) return '<span class="asm-dot" title="Unattempted">&middot;</span>';
                      const isRem = Boolean(att.is_remedial_unlocked);
                      const maxQ = getAsmExpectedMax(asm);
                      const sc = att.score != null ? Math.min(Number(att.score), maxQ) : 0;
                      const totalQ = Number(att.total_questions || maxQ);
                      const rawPct = att.percentage != null ? Number(att.percentage) : (totalQ > 0 ? (sc / totalQ) * 100 : 0);
                      const maxRemPts = totalQ * 0.6;
                      const effSc = isRem ? Math.min(sc, maxRemPts) : sc;
                      const effPct = isRem ? Math.min(rawPct, 60.0) : rawPct;
                      const color = typeof getGradeColorByScore === 'function'
                        ? getGradeColorByScore(effPct)
                        : (effPct >= 100 ? '#22C55E' : (effPct >= 90 ? '#22C55E' : (effPct >= 80 ? '#BEF264' : (effPct >= 60 ? '#FDE047' : (effPct >= 30 ? '#FB923C' : '#F87171')))));
                      const attId = att.id || att.attempt_id;
                      const clickAttr = attId ? `onclick="window.open('result.html?attempt_id=${encodeURIComponent(attId)}&admin=1', '_blank'); event.stopPropagation();"` : '';
                      const cursorStyle = attId ? 'cursor:pointer;' : 'cursor:default;';

                      return `
                        <span class="asm-score asm-score-test ${isRem ? 'asm-score-remedial' : ''}" 
                              style="color:${color}; ${cursorStyle} font-weight:700; font-size:var(--matrix-font-size, 0.74rem);" 
                              ${clickAttr}
                              title="${num}. [${tag} SCORE] ${escapeHtml(code)}&#10;${escapeHtml(asm.title)}&#10;${isRem ? `🏷️ [REMEDIAL (MAX 60%)]&#10;Score: ${Math.round(effPct)}%` : `Score: ${Math.round(effPct)}%`}&#10;Click to open result">
                          ${Math.round(effPct)}%${isRem ? '<sup class="test-rem-sup">R</sup>' : ''}
                        </span>
                      `;
                    }
                  });

                  // 2. POINTS COLUMN SECOND
                  dynamicAsmCols.push({
                    key: `test_${asm.id}_pts`,
                    className: 'col-asm col-exam col-exam-pts',
                    width: '58px',
                    headerTitle: `${headerTooltip} (Points)`,
                    title: `${headerTooltip} (Points)`,
                    label: `
                      <div class="asm-hdr-cell">
                        <span class="test-num test-num-test" title="${escapeHtml(headerTooltip)}">${num}</span>
                        <span class="test-subtag test-subtag-test-pts">${isPhrase ? 'PHR' : 'WRD'} PTS</span>
                      </div>
                    `,
                    sortable: true,
                    align: 'center',
                    render: (val, row) => {
                      const att = row.asmScores?.[asm.id];
                      if (!att) return '<span class="asm-dot" title="Unattempted">&middot;</span>';
                      const st = String(att.status || '').toLowerCase();
                      if (st === 'in_progress') return `<span style="color:#eab308; font-size:0.65rem;" title="In Progress">⏳</span>`;
                      if (!['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(st)) return '<span class="asm-dot" title="Unattempted">&middot;</span>';
                      const isRem = Boolean(att.is_remedial_unlocked);
                      const maxQ = getAsmExpectedMax(asm);
                      const sc = att.score != null ? Math.min(Number(att.score), maxQ) : 0;
                      const totalQ = Number(att.total_questions || maxQ);
                      const rawPct = att.percentage != null ? Number(att.percentage) : (totalQ > 0 ? (sc / totalQ) * 100 : 0);
                      const maxRemPts = totalQ * 0.6;
                      const effSc = isRem ? Math.min(sc, maxRemPts) : sc;
                      const effPct = isRem ? Math.min(rawPct, 60.0) : rawPct;
                      const cleanEffSc = Math.round(effSc * 2) / 2;
                      const displayVal = (cleanEffSc % 1 !== 0) ? cleanEffSc.toFixed(1) : cleanEffSc.toString();
                      const color = typeof getGradeColorByScore === 'function'
                        ? getGradeColorByScore(effPct)
                        : (effPct >= 100 ? '#22C55E' : (effPct >= 90 ? '#22C55E' : (effPct >= 80 ? '#BEF264' : (effPct >= 60 ? '#FDE047' : (effPct >= 30 ? '#FB923C' : '#F87171')))));
                      const attId = att.id || att.attempt_id;
                      const clickAttr = attId ? `onclick="window.open('result.html?attempt_id=${encodeURIComponent(attId)}&admin=1', '_blank'); event.stopPropagation();"` : '';
                      const cursorStyle = attId ? 'cursor:pointer;' : 'cursor:default;';

                      return `
                        <span class="asm-score asm-score-test ${isRem ? 'asm-score-remedial' : ''}" 
                              style="color:${color}; ${cursorStyle}" 
                              ${clickAttr}
                              title="${num}. [${tag} PTS] ${escapeHtml(code)}&#10;${escapeHtml(asm.title)}&#10;${isRem ? `🏷️ [REMEDIAL (MAX 60%)]&#10;Points: ${displayVal}/${totalQ} pts` : `Points: ${displayVal}/${totalQ} pts`}&#10;Click to open result & manage remedial">
                          <span style="font-weight:800; font-size:var(--matrix-font-size, 0.74rem); letter-spacing:-0.02em;">
                            ${displayVal}
                          </span>
                        </span>
                      `;
                    }
                  });
                } else {
                  // Daily task column
                  dynamicAsmCols.push({
                    key: `test_${asm.id}`,
                    className: 'col-asm col-quiz',
                    width: '42px',
                    headerTitle: headerTooltip,
                    title: headerTooltip,
                    label: `
                      <div class="asm-hdr-cell">
                        <span class="test-num test-num-task" title="${escapeHtml(headerTooltip)}">${num}</span>
                        <span class="test-subtag ${isPhrase ? 'test-subtag-phr' : 'test-subtag-wrd'}">${isPhrase ? 'PHR' : 'WRD'}</span>
                      </div>
                    `,
                    sortable: true,
                    align: 'center',
                    render: (val, row) => {
                      const att = row.asmScores?.[asm.id];
                      if (!att) return '<span class="asm-dot" title="Unattempted">&middot;</span>';
                      const st = String(att.status || '').toLowerCase();
                      if (st === 'in_progress') return `<span style="color:#FFFF00; font-size:0.65rem;" title="In Progress">⏳</span>`;
                      if (!['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(st)) return '<span class="asm-dot" title="Unattempted">&middot;</span>';
                      const isRem = Boolean(att.is_remedial_unlocked);
                      const maxQ = getAsmExpectedMax(asm);
                      const sc = att.score != null ? Math.min(Number(att.score), maxQ) : 0;
                      const totalQ = Number(att.total_questions || maxQ);
                      const rawPct = att.percentage != null ? Number(att.percentage) : (totalQ > 0 ? (sc / totalQ) * 100 : 0);
                      const maxRemPts = totalQ * 0.6;
                      const effSc = isRem ? Math.min(sc, maxRemPts) : sc;
                      const effPct = isRem ? Math.min(rawPct, 60.0) : rawPct;
                      const cleanSc = Math.round(effSc * 2) / 2;
                      const displayVal = (cleanSc % 1 !== 0) ? cleanSc.toFixed(1) : cleanSc.toString();
                      const color = typeof getGradeColorByScore === 'function'
                        ? getGradeColorByScore(effPct)
                        : (effPct >= 100 ? '#22C55E' : (effPct >= 90 ? '#22C55E' : (effPct >= 80 ? '#BEF264' : (effPct >= 60 ? '#FDE047' : (effPct >= 30 ? '#FB923C' : '#F87171')))));
                      const attId = att.id || att.attempt_id;
                      const clickAttr = attId ? `onclick="window.open('result.html?attempt_id=${encodeURIComponent(attId)}&admin=1', '_blank'); event.stopPropagation();"` : '';
                      const cursorStyle = attId ? 'cursor:pointer;' : 'cursor:default;';

                      return `
                        <span class="asm-score asm-score-task ${isRem ? 'asm-score-remedial' : ''}" 
                              style="color:${color}; ${cursorStyle}" 
                              ${clickAttr}
                              title="${num}. [${tag}] ${escapeHtml(code)}&#10;${escapeHtml(asm.title)}&#10;${isRem ? `🏷️ [REMEDIAL (MAX 60%)]&#10;Points: ${displayVal}/${totalQ} pts` : `Points: ${displayVal}/${totalQ} pts`} (${Math.round(effPct)}%)&#10;Click to view result">
                          ${displayVal}
                        </span>
                      `;
                    }
                  });
                }
              });

              // 3. THEME TOTAL POINTS COLUMN (User requirement: "untuk tiap tema ada tambahan kolom berupa total point daro words dan phrases")
              dynamicAsmCols.push({
                key: `theme_${tc}_total_pts`,
                className: 'col-asm col-exam col-exam-pts col-test-theme-total',
                width: '60px',
                headerTitle: `Theme ${tc} Total Points (Words + Phrases)`,
                title: `Theme ${tc} Total Points (Words + Phrases)`,
                label: `
                  <div class="asm-hdr-cell">
                    <span class="test-num test-num-test test-num-total" title="Theme ${tc} Total Points (Words + Phrases)">TOT</span>
                    <span class="test-subtag test-subtag-test-pts">TOT PTS</span>
                  </div>
                `,
                sortable: true,
                align: 'center',
                render: (val, row) => {
                  const ptsVal = row[`theme_${tc}_total_pts`];
                  if (ptsVal === undefined || ptsVal === null || ptsVal < 0) {
                    return '<span class="asm-dot" title="Unattempted">&middot;</span>';
                  }

                  let themeMaxQ = 0;
                  asmsInTheme.forEach(asm => {
                    themeMaxQ += getAsmExpectedMax(asm);
                  });

                  const cleanTotal = Math.round(ptsVal * 2) / 2;
                  const displayVal = (cleanTotal % 1 !== 0) ? cleanTotal.toFixed(1) : cleanTotal.toString();
                  const themePct = themeMaxQ > 0 ? (ptsVal / themeMaxQ) * 100 : 0;
                  const color = typeof getGradeColorByScore === 'function'
                    ? getGradeColorByScore(themePct)
                    : (themePct >= 100 ? '#22C55E' : (themePct >= 90 ? '#22C55E' : (themePct >= 80 ? '#BEF264' : (themePct >= 60 ? '#FDE047' : (themePct >= 30 ? '#FB923C' : '#F87171')))));

                  return `
                    <span class="asm-score asm-score-test test-score-theme-total" 
                          style="color:${color}; font-weight:800; font-size:var(--matrix-font-size, 0.74rem); letter-spacing:-0.02em;"
                          title="Theme ${tc} Total Points: ${displayVal}/${themeMaxQ} pts (${Math.round(themePct)}%)">
                      ${displayVal}
                    </span>
                  `;
                }
              });
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
              searchKeys: ['instName', 'instShort', 'progName', 'batch', 'displayName', 'name', 'pin'],
              initialSortKey: 'progressPct',
              initialSortAsc: false,
              superHeaders: dynamicSuperHeaders,
              summaryRow: (visibleCols, filteredData) => {
                const totalStudents = filteredData.length;
                if (totalStudents === 0) return '';

                // Calculate class averages aligned with weekly-only metrics
                const avgProg = Math.round(filteredData.reduce((acc, s) => acc + (s.progressPct || 0), 0) / totalStudents);
                
                const weeklyCompletedStudents = filteredData.filter(s => (s.completedWeeklyCount || 0) > 0);
                const avgScore = weeklyCompletedStudents.length > 0 
                  ? Math.round(weeklyCompletedStudents.reduce((acc, s) => acc + (s.averageScorePct || 0), 0) / weeklyCompletedStudents.length) 
                  : 0;
                const avgPts = Math.round(filteredData.reduce((acc, s) => acc + (s.totalEarnedScore || 0), 0) / totalStudents);
                const avgGrade = weeklyCompletedStudents.length > 0 
                  ? (typeof calculateGrade === 'function' ? calculateGrade(avgScore) : (typeof getGrade === 'function' ? getGrade(avgScore) : '—'))
                  : '—';
                const avgGradeColor = weeklyCompletedStudents.length > 0 && typeof getGradeColorByScore === 'function'
                  ? getGradeColorByScore(avgScore)
                  : '#94a3b8';
                const isAvgGradeS = avgGrade === '★' || avgGrade === 'S';
                const avgBadgeStyle = isAvgGradeS
                  ? `background:rgba(34,197,94,0.18); color:#22C55E; font-weight:900; font-size:0.65rem; padding:0 5px; line-height:1.2; box-shadow:0 0 10px rgba(34,197,94,0.45); border:1px solid #22C55E;`
                  : `background:${avgGradeColor}; color:#000000; font-weight:800; font-size:0.65rem; padding:0 4px; line-height:1.2;`;

                let cellsHtml = '';
                visibleCols.forEach(col => {
                  if (col.key === 'instName') {
                    cellsHtml += `<td class="col-sticky col-sticky-1 text-center" style="font-weight:800; color:#FFFF00; font-size:0.75rem;">★</td>`;
                  } else if (col.key === 'progName' || col.key === 'batch') {
                    const stickyCls = col.key === 'progName' ? 'col-sticky-2' : 'col-sticky-3';
                    cellsHtml += `<td class="col-sticky ${stickyCls} text-center" style="color:#94a3b8; font-size:0.7rem;">—</td>`;
                  } else if (col.key === 'displayName') {
                    cellsHtml += `<td class="col-sticky col-sticky-4" style="font-weight:800; color:#FFFF00; font-size:0.75rem; white-space:nowrap; text-transform:uppercase; letter-spacing:0.02em;">★ CLASS AVERAGE</td>`;
                  } else if (col.key === 'progressPct') {
                    cellsHtml += `
                      <td class="col-sticky col-sticky-5 text-center">
                        <div class="fw-700 text-xs" style="color:#FFFF00; font-size:0.75rem;">${avgProg}%</div>
                      </td>
                    `;
                  } else if (col.key === 'averageScorePct') {
                    if (weeklyCompletedStudents.length === 0) {
                      cellsHtml += `
                        <td class="col-sticky col-sticky-6 text-center">
                          <div class="fw-700 text-xs text-muted" style="color:#94a3b8; font-size:0.75rem; line-height:1.1;">—</div>
                        </td>
                      `;
                    } else {
                      cellsHtml += `
                        <td class="col-sticky col-sticky-6 text-center">
                          <div class="fw-700 text-xs" style="color:${avgGradeColor}; font-size:0.75rem; line-height:1.1; ${isAvgGradeS ? 'filter:drop-shadow(0 0 6px rgba(34,197,94,0.6)); color:#22C55E;' : ''}">${avgScore}%</div>
                        </td>
                      `;
                    }
                  } else if (col.key === 'grade') {
                    if (weeklyCompletedStudents.length === 0 || avgGrade === '—' || avgGrade === '-') {
                      cellsHtml += `
                        <td class="col-sticky col-sticky-7 text-center">
                          <span class="text-muted" style="font-size:0.75rem;">—</span>
                        </td>
                      `;
                    } else {
                      const cleanAvgGrade = String(avgGrade || '').trim().toUpperCase();
                      const lowerAvgG = cleanAvgGrade.toLowerCase();
                      const avgTextColor = '#000000';
                      cellsHtml += `
                        <td class="col-sticky col-sticky-7 text-center">
                          ${isAvgGradeS 
                            ? '<span class="grade-circle grade-circle-star" title="Average Grade ★ (100%)">★</span>' 
                            : `<span class="grade-circle grade-circle-${lowerAvgG}" style="background:${avgGradeColor}; color:${avgTextColor};" title="Average Grade ${cleanAvgGrade}">${cleanAvgGrade}</span>`}
                        </td>
                      `;
                    }
                  } else if (col.key === 'totalEarnedScore') {
                    cellsHtml += `
                      <td class="col-sticky col-sticky-8 col-sticky-last text-center">
                        <div class="fw-700 text-xs" style="color:${weeklyCompletedStudents.length > 0 ? avgGradeColor : '#94a3b8'}; font-size:0.75rem; ${isAvgGradeS ? 'filter:drop-shadow(0 0 6px rgba(34,197,94,0.6)); color:#22C55E;' : ''}">${avgPts} <span style="font-size:0.6rem; color:#94a3b8; font-weight:normal;">pts</span></div>
                      </td>
                    `;
                  } else if (col.key && col.key.startsWith('asm_')) {
                    const isPtsCol = col.key.endsWith('_pts');
                    const isPctCol = col.key.endsWith('_pct');
                    const asmId = col.key.replace('asm_', '').replace('_pts', '').replace('_pct', '');
                    let count = 0;
                    let scoreSum = 0;
                    let pctSum = 0;
                    filteredData.forEach(s => {
                      const att = s.asmScores?.[asmId];
                      if (att && ['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(String(att.status || '').toLowerCase())) {
                        count++;
                        const sc = att.score != null ? Number(att.score) : 0;
                        const isRem = Boolean(att.is_remedial_unlocked);
                        const targetAsm = classTests.find(a => a.id === asmId);
                        const tq = Number(att.total_questions || targetAsm?.total_questions || 50);
                        const maxRemPts = tq * 0.6;
                        const effSc = isRem ? Math.min(sc, maxRemPts) : sc;
                        const rawPct = att.percentage != null ? Number(att.percentage) : (tq > 0 ? (sc / tq) * 100 : 0);
                        const effPct = isRem ? Math.min(rawPct, 60.0) : rawPct;
                        scoreSum += effSc;
                        pctSum += effPct;
                      }
                    });
                    const isTest = col.className && col.className.includes('col-exam');
                    const targetAsm = classTests.find(a => a.id === asmId);
                    const totalQ = Number(targetAsm?.total_questions || (isTest ? 150 : 50));
                    if (count > 0) {
                      const avgSc = (scoreSum / count).toFixed(1).replace(/\.0$/, '');
                      const avgPct = Math.round(pctSum / count);
                      const avgCol = typeof getGradeColorByScore === 'function'
                        ? getGradeColorByScore(avgPct)
                        : (avgPct >= 100 ? '#22C55E' : (avgPct >= 90 ? '#22C55E' : (avgPct >= 80 ? '#BEF264' : (avgPct >= 60 ? '#FDE047' : (avgPct >= 30 ? '#FB923C' : '#F87171')))));
                      if (isTest && isPctCol) {
                        cellsHtml += `
                          <td class="text-center ${col.className || ''}">
                            <span style="color:${avgCol}; font-weight:700; font-size:0.68rem;" title="Class Avg Score: ${avgPct}%">${avgPct}%</span>
                          </td>
                        `;
                      } else if (isTest && isPtsCol) {
                        cellsHtml += `
                          <td class="text-center ${col.className || ''}">
                            <span style="color:#e2e8f0; font-weight:700; font-size:0.72rem; font-family:monospace;" title="Class Avg Points: ${avgSc}/${totalQ} pts">${avgSc}</span>
                          </td>
                        `;
                      } else {
                        cellsHtml += `
                          <td class="text-center ${col.className || ''}">
                            <span style="color:#e2e8f0; font-weight:700; font-size:0.72rem; font-family:monospace;" title="Avg: ${avgSc} pts (${count} students)">${avgSc}</span>
                          </td>
                        `;
                      }
                    } else {
                      cellsHtml += `
                        <td class="text-center ${col.className || ''}">
                          <span style="color:rgba(255,255,255,0.22); font-weight:800; font-size:0.85rem; line-height:1;">&middot;</span>
                        </td>
                      `;
                    }
                  } else if (col.key && col.key.startsWith('theme_') && col.key.endsWith('_total_pts')) {
                    const tc = col.key.replace('theme_', '').replace('_total_pts', '');
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
                      const avgThemePts = (totalPtsSum / count).toFixed(1).replace(/\.0$/, '');
                      cellsHtml += `
                        <td class="text-center ${col.className || ''}">
                          <span style="color:#ffffff; font-weight:800; font-size:0.72rem; font-family:monospace;" title="Class Avg Theme ${tc} Points: ${avgThemePts} pts">${avgThemePts}</span>
                        </td>
                      `;
                    } else {
                      cellsHtml += `
                        <td class="text-center ${col.className || ''}">
                          <span style="color:rgba(255,255,255,0.22); font-weight:800; font-size:0.85rem; line-height:1;">&middot;</span>
                        </td>
                      `;
                    }
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

                // 1. Leaderboard Primary default sort: PROG % DESC, Secondary: Global SCORE % DESC, Tertiary: Global PTS DESC
                if (sortKey === 'progressPct' || sortKey === 'PROG') {
                  const pA = Number(a.progressPct ?? 0);
                  const pB = Number(b.progressPct ?? 0);
                  if (pA !== pB) return direction === 'asc' ? pA - pB : pB - pA;
                  const scoreA = (a.completedWeeklyCount > 0) ? Number(a.averageScorePct ?? 0) : -1;
                  const scoreB = (b.completedWeeklyCount > 0) ? Number(b.averageScorePct ?? 0) : -1;
                  if (scoreA !== scoreB) return scoreB - scoreA;
                  const sA = Number(a.totalEarnedScore ?? 0);
                  const sB = Number(b.totalEarnedScore ?? 0);
                  if (sA !== sB) return sB - sA;
                }

                if (sortKey === 'grade' || sortKey === 'GRD' || sortKey === 'SCORE' || sortKey === 'averageScorePct') {
                  const gA = (a.completedWeeklyCount > 0) ? Number(a.averageScorePct ?? 0) : -1;
                  const gB = (b.completedWeeklyCount > 0) ? Number(b.averageScorePct ?? 0) : -1;
                  if (gA !== gB) return direction === 'asc' ? gA - gB : gB - gA;
                  const pA = Number(a.progressPct ?? 0);
                  const pB = Number(b.progressPct ?? 0);
                  if (pA !== pB) return pB - pA;
                  const sA = Number(a.totalEarnedScore ?? 0);
                  const sB = Number(b.totalEarnedScore ?? 0);
                  if (sA !== sB) return sB - sA;
                }

                if (sortKey === 'totalEarnedScore' || sortKey === 'PTS') {
                  const sA = Number(a.totalEarnedScore ?? 0);
                  const sB = Number(b.totalEarnedScore ?? 0);
                  if (sA !== sB) return direction === 'asc' ? sA - sB : sB - sA;
                  const pA = Number(a.progressPct ?? 0);
                  const pB = Number(b.progressPct ?? 0);
                  if (pA !== pB) return pB - pA;
                  const scoreA = (a.completedWeeklyCount > 0) ? Number(a.averageScorePct ?? 0) : -1;
                  const scoreB = (b.completedWeeklyCount > 0) ? Number(b.averageScorePct ?? 0) : -1;
                  if (scoreA !== scoreB) return scoreB - scoreA;
                }

                if (sortKey && (sortKey.startsWith('asm_') || sortKey.startsWith('theme_'))) {
                  const scoreA = Number(a[sortKey] ?? -1);
                  const scoreB = Number(b[sortKey] ?? -1);
                  if (scoreA !== scoreB) {
                    return direction === 'asc' ? scoreA - scoreB : scoreB - scoreA;
                  }
                }

                if (sortKey === 'instName') {
                  const instCmp = (a.instName || '').localeCompare(b.instName || '', undefined, { sensitivity: 'base', numeric: true });
                  if (instCmp !== 0) return direction === 'desc' ? -instCmp : instCmp;
                }

                if (sortKey === 'progName') {
                  const progCmp = (a.progName || '').localeCompare(b.progName || '', undefined, { sensitivity: 'base', numeric: true });
                  if (progCmp !== 0) return direction === 'desc' ? -progCmp : progCmp;
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
                  key: 'instName',
                  label: 'INST',
                  className: 'col-sticky col-sticky-1',
                  sortable: true,
                  align: 'center',
                  width: '48px',
                  render: (val, row) => `<span class="badge" style="background:rgba(255,255,255,0.08); font-weight:700; font-family:monospace; font-size:0.7rem; padding:2px 4px;" title="${escapeHtml(row.instName)}">${escapeHtml(row.instShort || row.instName)}</span>`
                },
                {
                  key: 'progName',
                  label: 'PROGRAM',
                  className: 'col-sticky col-sticky-2',
                  sortable: true,
                  align: 'center',
                  width: '54px',
                  render: (val, row) => `<div class="text-xs" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:50px;" title="${escapeHtml(row.progName)}">${escapeHtml(row.progName)}</div>`
                },
                {
                  key: 'batch',
                  label: 'BATCH',
                  className: 'col-sticky col-sticky-3',
                  sortable: true,
                  align: 'center',
                  width: '48px',
                  render: (val, row) => `<span class="badge" style="background:rgba(56,189,248,0.12); color:#38bdf8; border:1px solid rgba(56,189,248,0.25); font-weight:700; font-size:0.7rem; padding:2px 5px; border-radius:10px;">${escapeHtml(row.batch)}</span>`
                },
                {
                  key: 'displayName',
                  label: 'STUDENT NAME',
                  className: 'col-sticky col-sticky-4',
                  sortable: true,
                  width: '140px',
                  render: (val, row) => `
                    <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:135px;" title="${escapeHtml(row.displayName)}&#10;PIN: ${escapeHtml(row.pin)}${row.hasRemedial ? '&#10;⚠️ Student has remedial score' : ''}">
                      <span class="fw-600 text-xs" style="color:var(--clr-text-1); font-size:0.78rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                        ${escapeHtml(row.displayName)}
                      </span>
                    </div>
                  `
                },
                {
                  key: 'progressPct',
                  label: 'PROG',
                  className: 'col-sticky col-sticky-5',
                  sortable: true,
                  align: 'center',
                  width: '46px',
                  render: (val, row) => `
                    <div class="fw-700 text-xs" style="color:var(--clr-text-1); font-size:var(--matrix-font-size, 0.75rem); line-height:1;" title="${row.completedCount}/${row.totalClassTests} Activities Done (${row.progressPct}%)">${row.progressPct}%</div>
                  `
                },
                {
                  key: 'averageScorePct',
                  label: 'SCORE',
                  className: 'col-sticky col-sticky-6',
                  sortable: true,
                  align: 'center',
                  width: '46px',
                  render: (val, row) => {
                    if (!row.completedWeeklyCount || row.completedWeeklyCount === 0) {
                      return '<span class="text-muted" style="font-size:0.75rem;" title="No weekly exams completed">—</span>';
                    }
                    const isGradeS = row.grade === '★' || row.grade === 'S';
                    const scoreColor = (typeof getGradeColorByScore === 'function')
                      ? getGradeColorByScore(row.averageScorePct)
                      : (isGradeS ? '#22C55E' : row.gradeColor);
                    return `
                      <div class="fw-700 text-xs ${isGradeS ? 'text-gold-champion' : ''}" style="color:${scoreColor}; font-size:0.75rem; line-height:1.1;" title="Weekly Exams Average: ${row.averageScorePct}% (${row.completedWeeklyCount} exams)">${row.averageScorePct}%</div>
                    `;
                  }
                },
                {
                  key: 'grade',
                  label: 'GRD',
                  className: 'col-sticky col-sticky-7',
                  sortable: true,
                  align: 'center',
                  width: '36px',
                  render: (val, row) => {
                    if (!row.completedWeeklyCount || row.completedWeeklyCount === 0 || row.grade === '—' || row.grade === '-') {
                      return '<span class="text-muted" style="font-size:0.75rem;" title="No weekly exams completed">&mdash;</span>';
                    }
                    const isGradeS = row.grade === 'S' || row.grade === '★';
                    if (isGradeS) {
                      return `<span class="grade-circle grade-circle-star" title="Weekly Exam Grade ★ (100% Excellent)">★</span>`;
                    }
                    const cleanGrade = String(row.grade || '').trim().toUpperCase();
                    const lowerG = cleanGrade.toLowerCase();
                    const badgeColor = (typeof getGradeColorByScore === 'function')
                      ? getGradeColorByScore(row.averageScorePct)
                      : (row.gradeColor || '#94a3b8');
                    const textColor = '#000000';
                    return `
                      <span class="grade-circle grade-circle-${lowerG}" style="background:${badgeColor}; color:${textColor};" title="Weekly Exam Grade ${cleanGrade}">${cleanGrade}</span>
                    `;
                  }
                },
                {
                  key: 'totalEarnedScore',
                  label: 'PTS',
                  className: 'col-sticky col-sticky-8 col-sticky-last',
                  sortable: true,
                  align: 'center',
                  width: '62px',
                  render: (val, row) => {
                    if (!row.completedWeeklyCount || row.completedWeeklyCount === 0) {
                      return `<div class="fw-700 text-xs text-muted" style="color:#94a3b8; font-size:0.75rem;" title="0 pts (No weekly exams completed)">0 <span style="font-size:0.6rem; color:#94a3b8; font-weight:normal;">pts</span></div>`;
                    }
                    const isGradeS = row.grade === '★' || row.grade === 'S';
                    const ptsColor = (typeof getGradeColorByScore === 'function')
                      ? getGradeColorByScore(row.averageScorePct)
                      : (isGradeS ? '#22C55E' : ((row.grade !== '—' && row.gradeColor) ? row.gradeColor : 'var(--clr-text-1)'));
                    const ptsVal = Number(row.totalEarnedScore ?? 0);
                    const formattedPts = (ptsVal % 1 !== 0) ? ptsVal.toFixed(1) : ptsVal;
                    return `
                      <div class="fw-700 text-xs ${isGradeS ? 'text-gold-champion' : ''}" style="color:${ptsColor}; font-size:0.75rem;" title="Weekly Exam Points: ${formattedPts} pts">${formattedPts} <span style="font-size:0.6rem; color:#94a3b8; font-weight:normal;">pts</span></div>
                    `;
                  }
                },
                ...dynamicAsmCols
              ]
            });

            requestAnimationFrame(() => {
              fitMatrixToScreen();
              setTimeout(fitMatrixToScreen, 60);
            });
          };

          // Dynamic responsive viewport sizing: fit all rows without vertical scroll & handle zoom fit
          const fitMatrixToScreen = () => {
            const grid = document.getElementById('class-attendance-grid');
            if (!grid) return;
            const rect = grid.getBoundingClientRect();
            const banner = document.getElementById('bottom-ad-banner');
            const bannerHeight = banner ? banner.offsetHeight : 38;
            // 20px extra breathing room so the summary row and horizontal scrollbar are NEVER cut off
            const availHeight = Math.max(260, window.innerHeight - rect.top - bannerHeight - 20);
            grid.style.height = `${availHeight}px`;

            const rows = grid.querySelectorAll('tbody tr');
            const count = rows.length || 25;
            const headerHeight = 44; // super-header (~20px) + column header (~22px)
            const footerHeight = 26; // summary row (~26px)
            const isScrollMode = (window._attendanceViewMode === 'scroll');
            const scrollbarHeight = isScrollMode ? 14 : 0;
            const rowHeight = Math.max(16, (availHeight - headerHeight - footerHeight - scrollbarHeight) / count);

            grid.style.setProperty('--matrix-row-height', `${rowHeight.toFixed(2)}px`);
            
            const fontSize = Math.min(13, Math.max(8.5, rowHeight * 0.44));
            const badgeFont = Math.min(11, Math.max(7.5, rowHeight * 0.38));
            const padY = Math.max(0, Math.min(3, Math.floor((rowHeight - 16) / 3)));

            grid.style.setProperty('--matrix-font-size', `${fontSize.toFixed(1)}px`);
            grid.style.setProperty('--matrix-badge-font', `${badgeFont.toFixed(1)}px`);
            grid.style.setProperty('--matrix-cell-padding', `${padY}px 2px`);

            // Apply fit-to-screen zoom or standard scrollable layout
            const wrap = grid.querySelector('.table-wrap');
            const tbl = wrap?.querySelector('table.datagrid-table');
            if (wrap && tbl) {
              const currentFilter = window._classAttendanceThemeFilter || 'ALL';
              const isFitMode = (!window._attendanceViewMode || window._attendanceViewMode === 'fit');
              
              if (isFitMode && currentFilter === 'ALL') {
                wrap.style.overflowX = 'hidden';
                tbl.style.zoom = '1';
                const naturalWidth = tbl.scrollWidth || 2688;
                const containerWidth = wrap.clientWidth || 1650;
                if (naturalWidth > containerWidth) {
                  const zoomRatio = (containerWidth / naturalWidth).toFixed(4);
                  tbl.style.zoom = String(zoomRatio);
                } else {
                  tbl.style.zoom = '1';
                }
              } else {
                wrap.style.overflowX = 'auto';
                tbl.style.zoom = '1';
              }

              // Attach mouse wheel horizontal scroll in scroll mode
              if (!wrap._wheelAttached) {
                wrap._wheelAttached = true;
                wrap.addEventListener('wheel', (e) => {
                  const isScroll = (window._attendanceViewMode === 'scroll') || (window._classAttendanceThemeFilter && window._classAttendanceThemeFilter !== 'ALL');
                  if (isScroll && e.deltaY !== 0 && wrap.scrollWidth > wrap.clientWidth) {
                    e.preventDefault();
                    wrap.scrollLeft += e.deltaY * 1.5;
                  }
                }, { passive: false });
              }
            }
          };

          window._setAttendanceThemeFilter = (targetTheme) => {
            renderAttendanceGridMatrix(targetTheme);
          };

          window._toggleAttendanceViewMode = (mode) => {
            window._attendanceViewMode = mode;
            try { localStorage.setItem('topscore_attendance_view_mode', mode); } catch(e) {}
            const container = document.getElementById('attendance-view-mode-container');
            if (container) {
              container.querySelectorAll('.attendance-theme-pill').forEach(b => {
                b.classList.toggle('active', (b.dataset.mode || 'fit') === mode);
              });
            }
            const panControls = document.getElementById('attendance-pan-controls');
            if (panControls) {
              panControls.style.display = (mode === 'scroll') ? 'inline-flex' : 'none';
            }
            fitMatrixToScreen();
          };

          window._panAttendanceMatrix = (offset) => {
            const wrap = document.querySelector('#class-attendance-grid .table-wrap');
            if (wrap) {
              wrap.scrollBy({ left: offset, behavior: 'smooth' });
            }
          };

          window._toggleFullWidthMatrix = () => {
            document.body.classList.toggle('sidebar-collapsed');
            const isCollapsed = document.body.classList.contains('sidebar-collapsed');
            const btnText = document.getElementById('matrix-fullwidth-text');
            if (btnText) btnText.textContent = isCollapsed ? 'Normal Width' : 'Full Width';
            setTimeout(fitMatrixToScreen, 150);
          };

          // Mount initial grid view with stored view mode (default: fit)
          if (!window._attendanceViewMode) {
            try { window._attendanceViewMode = localStorage.getItem('topscore_attendance_view_mode') || 'fit'; } catch(e) { window._attendanceViewMode = 'fit'; }
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
        window._classHubCache[classId] = { timestamp: Date.now() };

      } catch (e) {
        console.error('[renderClassHub error]:', e);
        area.innerHTML = `<div class="empty-state"><p style="color:#ef4444;">Failed to load class data: ${escapeHtml(e?.message || 'Unknown error')}</p></div>`;
      }
    }
    window.renderClassHub = renderClassHub;



    async function renderClassDetail(area) {
      if (!window.currentClassContext) {
        return loadSection('tests');
      }
      
      const { cid, lid, cname, lname, program, institution } = window.currentClassContext;
      const title = `${cname} - ${lname}`;
      const subtitle = program && institution ? `${institution} ➔ ${program}` : 'Manage tests and vocabulary for this class';
      
      area.innerHTML = `
        <div class="section-header">
          <div>
            <h2 class="section-title">${escapeHtml(title)}</h2>
            <p class="section-subtitle">${escapeHtml(subtitle)}</p>
          </div>
        </div>
        <div class="dashboard-grid mt-4">
          <div class="stat-card" style="cursor:pointer;" onclick="window.loadSection('tests')">
            <div class="stat-icon">&#128221;</div>
            <div class="stat-value">Manage Tests</div>
            <div class="stat-label">View all tests & assignments</div>
          </div>
          <div class="stat-card" style="cursor:pointer;" onclick="window.loadSection('vocab_vault')">
            <div class="stat-icon">&#128214;</div>
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
      const targetSec = aliasSectionMap[hash] || hash;
      if (targetSec && (sectionTitles[targetSec] || targetSec === 'students')) {
        loadSection(targetSec, true);
      } else if (hash && hash.startsWith('profile-')) {
        const studentId = (hash || '').replace('profile-', '');
        const batchStudentIds = e.state?.batchStudentIds || [];
        openStudentProfile(studentId, batchStudentIds, true);
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

    // Ã¢â€â‚¬Ã¢â€â‚¬ Topbar Domain Switcher Click (removed â€” no domain pill elements exist) Ã¢â€â‚¬Ã¢â€â‚¬

    // Ã¢â€â‚¬Ã¢â€â‚¬ Mobile Bottom Tab Switching Ã¢â€â‚¬Ã¢â€â‚¬
    mobileTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const panel = tab.dataset.panel;
        activatePrimaryTab(panel);
        loadSection(tabDefaultSections[panel]);
      });
    });

    // Ã¢â€â‚¬Ã¢â€â‚¬ Sidebar Toggle for Mobile Ã¢â€â‚¬Ã¢â€â‚¬
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

    // Ã¢â€â‚¬Ã¢â€â‚¬ Sub-nav item click Ã¢â€â‚¬Ã¢â€â‚¬
    document.querySelectorAll('.admin-nav-item').forEach(item => {
      item.addEventListener('click', () => {
        document.querySelectorAll('.admin-nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        loadSection(item.dataset.sub);
        if (window.innerWidth <= 1024) closeSidebar();
      });
    });

    // Ã¢â€â‚¬Ã¢â€â‚¬ Global String & HTML Utilities Ã¢â€â‚¬Ã¢â€â‚¬
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
      if (!Test) return 'â€”';
      const parts = [];
      if (Test.institutions?.name) parts.push(`[${Test.institutions.name}]`);
      if (classContext) parts.push(`[${classContext}]`);
      if (Test.classes?.name) parts.push(Test.classes.name);
      if (Test.levels?.name) {
        const lvl = String(Test.levels.name);
        parts.push(lvl.toLowerCase().includes('level') ? lvl : `Level ${lvl}`);
      }
      if (Test.test_type) parts.push(Test.test_type);
      if (Test.title) parts.push(Test.title);
      return parts.length > 0 ? parts.join(' &middot; ') : (Test.title || 'Test');
    }

    // â”€â”€ DB Connection Status Banner â”€â”€
    async function initConnectionBanner() {
      const banner = document.getElementById('db-connection-banner');
      const statusDot = document.getElementById('db-status-dot');
      const statusText = document.getElementById('db-status-text');
      if (!banner) return;

      // Show checking state â€” use CSS classes, not inline styles
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
          statusText.innerHTML = `<strong>Database Error</strong> &mdash; ${result.error}. <a href="docs/DATABASE.md" target="_blank" style="color:#f87171;">Check setup guide</a>`;
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
      const rawSection = section;
      section = aliasSectionMap[section] || section;
      const thisSeq = ++_loadSectionSeq;
      try {
        localStorage.setItem('topscore_admin_last_section', rawSection);
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

      // Reset topbar container with default section title (or views will elevate their KPI tabs)
      const topbarTabsEl = document.getElementById('topbar-tabs-container');
      if (topbarTabsEl) {
        const secTitle = (rawSection === 'students' && (window._selectedProgramName || localStorage.getItem('topscore_selected_program_name'))) 
          ? (window._selectedProgramName || localStorage.getItem('topscore_selected_program_name')) 
          : (sectionTitles[section] || section);
        topbarTabsEl.innerHTML = `<div class="topbar-default-title" id="topbar-title">${secTitle}</div>`;
      }
      // Reset bottom infobar by default on section change
      if (window.setBottomInfobar) window.setBottomInfobar(null, null);
      const area = document.getElementById('admin-content-area');
      area.innerHTML = '<div class="empty-state"><div class="spinner"></div><p>Loading...</p></div>';


      const addRecBtn = document.getElementById('add-record-btn');
      if (addRecBtn) addRecBtn.style.display = 'none';

      try {
        switch(section.toLowerCase()) {
          case 'organization':
          case 'curriculum-org':
            await renderCurriculum(area);
            break;
          case 'curriculum':
          case 'classes-hub':
            await renderClassesHub(area);
            break;
          case 'institutions':
          await renderUnifiedInstitutions(area);
          break;
          case 'classes':             await renderClassList(area); break;
          case 'classes-org':         await _renderClassesModule(area); break;
          case 'class_instances':     await renderClassInstances(area); break;
          case 'class-detail':        await renderClassDetail(area); break;
          case 'levels':              window.location.hash = '#classes'; break;
          case 'topics':              await renderTopics(area); break;
          case 'question_types':          await renderWordTypes(area); break;
          case 'vocab_vault':             await renderVocabularyVault(area); break;
          case 'modules':                 await renderModules(area); break;
          case 'students':
            window._switchStudentTab = () => window.loadSection('students');
            await _renderStudentsModule(area);
            break;

          case 'questions':           await renderCentralQuestionBank(area); break;

          case 'results':             await renderResults(area); break;
          case 'progress-view':       window.location.hash = '#students'; return loadSection('students');
          case 'audit':               await renderAuditLog(area); break;
          case 'health':              await renderDataHealth(area); break;
          case 'recycle':             await renderRecycleBin(area); break;
          case 'settings':
            const settingTabs = [
              { id: 'site',    icon: '⚙️',  title: 'Site Settings',  label: 'Cost Guard & Engine' },
              { id: 'audit',   icon: '📋',  title: 'Activity Logs',   label: 'Audit & Security Trail' },
              { id: 'health',  icon: '🩺',  title: 'Data Health',     label: 'Integrity Diagnostics' },
              { id: 'recycle', icon: '🗑️', title: 'Recycle Bin',     label: 'Restoration Vault' }
            ];
            let activeSettingTab = window._activeSettingTab || 'site';
            const renderSettingSection = async () => {
              // Elevate settings navigation to topbar
              if (window.setTopbarTabs) {
                window.setTopbarTabs(settingTabs, activeSettingTab, 'window._switchSettingTab');
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
              await renderSettingSection();
            };
            await renderSettingSection();
            break;
          case 'student-registration':
          case 'students-registration':
          case 'import-students':     await renderStudentsRegistration(area); break;
          case 'import-questions':    await renderCentralQuestionImport(area); break;
          case 'export-questions':    renderExportQuestions(area); break;
          case 'recalibrator':
            window.location.hash = '#health';
            return loadSection('health');
          case 'test-hub':      window.location.hash = '#tests'; break;
          case 'class-hub':           await renderClassHub(area); break;
          case 'tests':         await renderTests(area); break;
          case 'test-access':
            window._classHubActiveTab = 'test-sessions';
            window.location.hash = '#class-hub';
            await renderClassHub(area);
            break;
          case 'class-panel':         await renderClassPanel(area); break;
          case 'import_ai_tests': window.location.hash = '#tests'; break;
          case 'dashboard':           await renderDashboard(area); break;
          case 'profile':             await renderAdminProfile(area); break;
          case 'schedule':            await renderAdminSchedule(area); break;
          case 'work_records':        await renderWorkRecords(area); break;
          case 'cv_generator':        await renderCVGenerator(area); break;

          default: area.innerHTML = `<div class="empty-state"><div class="empty-state__icon">&#128679;</div><h3>${sectionTitles[section] || section}</h3><p>This section is under development.</p></div>`;
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
            <div style="font-size:2.5rem; margin-bottom:1rem;">&#9888;&#65039;</div>
            <h3 style="color:var(--clr-text-1); font-size:1.25rem; font-weight:700; margin-bottom:0.5rem;">Section Loading Interrupted</h3>
            <p class="text-danger text-sm" style="margin-bottom:1.5rem; word-break:break-word;">${escapeHtml(e?.message || 'An unexpected error occurred.')}</p>
            <div class="d-flex gap-3 justify-center">
              <button class="btn btn-primary btn-sm" onclick="window.loadSection('${section}')">&#8635; Retry Section</button>
              <button class="btn btn-secondary btn-sm" onclick="window.location.reload()">Reload Application</button>
            </div>
          </div>
        `;
      }
    }

    // â”€â”€ INSTITUTIONS â”€â”€

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

      list.innerHTML = '<div style="padding:0.5rem 1rem;font-size:0.72rem;color:var(--clr-text-muted);">Loading…</div>';
      try {
        const classes = await adminFetchAll('classes', 'id, name');
        list.innerHTML = '';
        if (!classes || !classes.length) {
          list.innerHTML = '<div style="padding:0.5rem 1rem;font-size:0.72rem;color:var(--clr-text-muted);">No classes</div>';
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
        list.innerHTML = '<div style="padding:0.5rem 1rem;font-size:0.72rem;color:#f87171;">Error loading classes</div>';
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
      area.innerHTML = '<div class="empty-state"><div class="spinner"></div><p>Loading classes...</p></div>';
      try {
        const [rawClasses, programs] = await Promise.all([
          adminFetchAll('classes', 'id, name, is_active, program_id, class_levels(levels(name))'),
          adminFetchAll('programs', 'id, name, institution_id, institutions(name)')
        ]);

        const classes = (rawClasses || []).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        area.innerHTML = `
          <div style="padding:1.5rem 2rem 0.5rem; border-bottom:1px solid var(--clr-border);">
            <h2 style="margin:0 0 0.25rem; font-size:1.25rem; font-weight:700; color:var(--clr-text-1);">
              Classes <span style="font-size:0.78rem; font-weight:400; color:var(--clr-text-muted); margin-left:0.5rem;">${classes.length} total</span>
            </h2>
            <p style="margin:0; font-size:0.82rem; color:var(--clr-text-muted);">Click a class to view its tests</p>
          </div>
          <div style="overflow-y:auto;">
            <table style="width:100%; border-collapse:collapse;">
              <thead>
                <tr style="border-bottom:2px solid var(--clr-border); background:var(--clr-surface);">
                  <th style="text-align:left; padding:0.6rem 2rem; font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--clr-text-muted);">Class Name</th>
                  <th style="text-align:left; padding:0.6rem 1rem; font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--clr-text-muted);">Program</th>
                  <th style="text-align:center; padding:0.6rem 1rem; font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--clr-text-muted); width:80px;">Status</th>
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
            <td style="padding:0.7rem 2rem; font-size:0.9rem; font-weight:600; color:var(--clr-text);">
              ${escapeHtml(cls.name)}
            </td>
            <td style="padding:0.7rem 1rem; font-size:0.8rem; color:var(--clr-text-muted);">
              ${instName ? `<span style="color:var(--clr-text-muted);font-size:0.72rem;">${escapeHtml(instName)} · </span>` : ''}${escapeHtml(progName)}
            </td>
            <td style="padding:0.7rem 1rem; text-align:center;">
              <span style="font-size:0.7rem; padding:0.15rem 0.5rem; border-radius:3px; font-weight:600;
                ${cls.is_active
                  ? 'background:rgba(16,185,129,0.12); color:#10b981;'
                  : 'background:rgba(100,116,139,0.12); color:var(--clr-text-muted);'}">
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
        area.innerHTML = `<div class="empty-state"><p style="color:#f87171;">Error: ${escapeHtml(e?.message || 'Unknown')}</p></div>`;
      }
    }

    // ── TEST HUB ──
    async function renderTestHub(area) {
      area.innerHTML = '<div class="empty-state"><div class="spinner"></div><p>Loading Test Hub...</p></div>';
      try {
        const [allTests, classes, results] = await Promise.all([
          adminFetchAll('tests', 'id, title, test_type, status, class_id, level_id, levels(name)'),
          adminFetchAll('classes', 'id, name'),
          adminFetchAll('test_results', 'final_score').catch(() => [])
        ]);
        
        const quizzes = (allTests || []).filter(a => a.test_type === 'quiz' || (a.test_subtype && a.test_subtype.includes('TASK')));
        const exams = (allTests || []).filter(a => a.test_type === 'exam' || (a.test_subtype && a.test_subtype.includes('TEST')));
        
        let passRate = "N/A";
        if (results && results.length > 0) {
            const passed = results.filter(r => (r.final_score || 0) >= 70).length;
            passRate = Math.round((passed / results.length) * 100) + "%";
        }

        let tableHtml = (allTests || []).map(a => {
           const c = (classes||[]).find(x => x.id === a.class_id);
           const badgeColor = a.test_category === 'TASK' ? 'background:rgba(245,158,11,0.15);color:#f59e0b;border:1px solid rgba(245,158,11,0.3);' : 'background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid rgba(239,68,68,0.3);';
           return `
             <tr style="border-bottom:1px solid var(--clr-border);">
               <td style="padding:0.75rem 1rem;font-weight:600;color:var(--clr-text);">${escapeHtml(a.title || 'Untitled')}</td>
               <td style="padding:0.75rem 1rem;"><span class="badge" style="${badgeColor}">${escapeHtml(a.test_category || 'TASK')}</span></td>
               <td style="padding:0.75rem 1rem;color:var(--clr-text-muted);font-size:0.8rem;">${escapeHtml(c?.name || '—')}</td>
               <td style="padding:0.75rem 1rem;color:var(--clr-text-muted);font-size:0.8rem;">${escapeHtml(a.levels?.name || '—')}</td>
               <td style="padding:0.75rem 1rem;">
                  ${a.modules?.name ? `<span class="badge badge-neutral">${escapeHtml(a.modules.name)}</span>` : '—'}
               </td>
             </tr>
           `;
        }).join('');

        area.innerHTML = `
          <div style="padding:1.5rem 2rem 1rem; border-bottom:1px solid var(--clr-border);">
            <h2 style="margin:0 0 0.5rem; font-size:1.5rem;">Test Hub</h2>
            <p style="margin:0; color:var(--clr-text-muted); font-size:0.85rem;">Global view of all tasks and tests across classes.</p>
          </div>
          
          <div style="padding:2rem;">
            <!-- Metric Cards -->
            <div style="display:flex; gap:1.5rem; margin-bottom:2rem; flex-wrap:wrap;">
              <div style="flex:1; min-width:200px; padding:1.5rem; background:var(--clr-surface); border:1px solid var(--clr-border); border-radius:12px; display:flex; align-items:center; gap:1rem;">
                <div style="width:48px;height:48px;border-radius:50%;background:rgba(245,158,11,0.1);display:flex;align-items:center;justify-content:center;font-size:1.5rem;color:#f59e0b;">📋</div>
                <div>
                  <div style="font-size:1.8rem; font-weight:800; color:var(--clr-text-1); line-height:1;">${tasks.length}</div>
                  <div style="font-size:0.75rem; color:var(--clr-text-muted); font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-top:4px;">Total Tasks</div>
                </div>
              </div>
              <div style="flex:1; min-width:200px; padding:1.5rem; background:var(--clr-surface); border:1px solid var(--clr-border); border-radius:12px; display:flex; align-items:center; gap:1rem;">
                <div style="width:48px;height:48px;border-radius:50%;background:rgba(239,68,68,0.1);display:flex;align-items:center;justify-content:center;font-size:1.5rem;color:#ef4444;">🏆</div>
                <div>
                  <div style="font-size:1.8rem; font-weight:800; color:var(--clr-text-1); line-height:1;">${tests.length}</div>
                  <div style="font-size:0.75rem; color:var(--clr-text-muted); font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-top:4px;">Total Tests</div>
                </div>
              </div>
              <div style="flex:1; min-width:200px; padding:1.5rem; background:var(--clr-surface); border:1px solid var(--clr-border); border-radius:12px; display:flex; align-items:center; gap:1rem;">
                <div style="width:48px;height:48px;border-radius:50%;background:rgba(16,185,129,0.1);display:flex;align-items:center;justify-content:center;font-size:1.5rem;color:#10b981;">📈</div>
                <div>
                  <div style="font-size:1.8rem; font-weight:800; color:var(--clr-text-1); line-height:1;">${passRate}</div>
                  <div style="font-size:0.75rem; color:var(--clr-text-muted); font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-top:4px;">Avg. Pass Rate</div>
                </div>
              </div>
            </div>

            <!-- Master Table -->
            <div style="background:var(--clr-surface); border:1px solid var(--clr-border); border-radius:12px; overflow:hidden;">
              <table style="width:100%; border-collapse:collapse;">
                <thead>
                  <tr style="background:var(--clr-bg-1); border-bottom:2px solid var(--clr-border);">
                    <th style="padding:0.75rem 1rem; text-align:left; font-size:0.75rem; font-weight:700; color:var(--clr-text-muted); text-transform:uppercase; letter-spacing:0.05em;">Test</th>
                    <th style="padding:0.75rem 1rem; text-align:left; font-size:0.75rem; font-weight:700; color:var(--clr-text-muted); text-transform:uppercase; letter-spacing:0.05em;">Type</th>
                    <th style="padding:0.75rem 1rem; text-align:left; font-size:0.75rem; font-weight:700; color:var(--clr-text-muted); text-transform:uppercase; letter-spacing:0.05em;">Class</th>
                    <th style="padding:0.75rem 1rem; text-align:left; font-size:0.75rem; font-weight:700; color:var(--clr-text-muted); text-transform:uppercase; letter-spacing:0.05em;">Level</th>
                    <th style="padding:0.75rem 1rem; text-align:left; font-size:0.75rem; font-weight:700; color:var(--clr-text-muted); text-transform:uppercase; letter-spacing:0.05em;">Module</th>
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
        area.innerHTML = `<div class="empty-state"><p style="color:#f87171;">Error loading Test Hub</p></div>`;
      }
    }


    // ── CLASS PANEL ── (per-class view, triggered from sidebar)
    async function renderClassPanel(area) {
      const classId   = window._selectedClassId;
      const className = window._selectedClassName || 'Class';

      if (!classId) {
        area.innerHTML = `<div class="empty-state"><div style="font-size:2.5rem;">🎓</div><p>Select a class from the sidebar.</p></div>`;
        return;
      }

      area.innerHTML = `<div class="empty-state"><div class="spinner"></div><p>Loading ${escapeHtml(className)}...</p></div>`;

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
           levelNames.push(cls.level);
        } else if (cls.class_levels?.length) {
           levelNames = cls.class_levels.map(cl => cl.levels?.name).filter(Boolean);
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
                <h2 style="margin:0 0 0.5rem; font-size:1.5rem; color:var(--clr-text-1);">${escapeHtml(className)}</h2>
                <div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-bottom:1.5rem;">
                  <span class="badge badge-neutral" style="font-size:0.72rem;">🏢 ${escapeHtml(instName)}</span>
                  <span class="badge badge-neutral" style="font-size:0.72rem;">📋 ${escapeHtml(progName)}</span>
                  <span class="badge badge-neutral" style="font-size:0.72rem;">⭐ ${escapeHtml(levelStr)}</span>
                  <span class="badge ${cls.is_active ? 'badge-success' : 'badge-neutral'}" style="font-size:0.72rem;">${cls.is_active ? 'Active' : 'Inactive'}</span>
                  <span class="badge badge-neutral" style="font-size:0.72rem;">👥 ${eligibleStudents.length} Eligible Students</span>
                </div>
              </div>
              <div style="display:flex; gap:0.5rem;">
                ${isVocabClass ? `
                  <button class="btn btn-sm" id="cpanel-auto-gen-words" style="background:var(--clr-primary);color:#fff;border:1px solid var(--clr-primary);font-weight:700;" title="Auto-Generate Vocabulary Tests">⚡ Gen Words</button>
                  <button class="btn btn-sm" id="cpanel-auto-gen-phrases" style="background:#10b981;color:#fff;border:1px solid #10b981;font-weight:700;" title="Auto-Generate Phrases & Idioms">⚡ Gen Phrases</button>
                ` : `
                  <button class="btn btn-sm" id="cpanel-auto-generate-btn" style="background:var(--clr-primary);color:#fff;border:1px solid var(--clr-primary);font-weight:700;" title="Auto-Generate Vocabulary Tests">⚡ Auto-Generate</button>
                `}
                <button class="btn btn-sm" id="cpanel-add-task-btn" style="background:rgba(245,158,11,0.9);color:#1a1a1a;border:1px solid rgba(245,158,11,0.4);font-weight:700;">📋 Add Task</button>
                <button class="btn btn-sm" id="cpanel-add-test-btn" style="background:rgba(239,68,68,0.9);color:#fff;border:1px solid rgba(239,68,68,0.4);font-weight:700;">🏆 Add Test</button>
              </div>
            </div>
            
            <!-- Tabs -->
            <div style="display:flex; gap:1.5rem; border-bottom:2px solid transparent;">
              <div class="cpanel-tab active" data-target="tab-path" style="padding:0.75rem 0; cursor:pointer; font-size:0.85rem; font-weight:600; color:var(--clr-primary); border-bottom:2px solid var(--clr-primary); margin-bottom:-1px;">Learning Path & Tasks</div>
              <div class="cpanel-tab" data-target="tab-students" style="padding:0.75rem 0; cursor:pointer; font-size:0.85rem; font-weight:600; color:var(--clr-text-muted); border-bottom:2px solid transparent; margin-bottom:-1px;">Eligible Students (${eligibleStudents.length})</div>
              <div class="cpanel-tab" data-target="tab-gradebook" style="padding:0.75rem 0; cursor:pointer; font-size:0.85rem; font-weight:600; color:var(--clr-text-muted); border-bottom:2px solid transparent; margin-bottom:-1px;">Gradebook</div>
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
                <div class="empty-state"><div style="font-size:2rem;margin-bottom:1rem;">🧑‍🎓</div><p>No students currently eligible for this class.</p></div>
              ` : `
                <div style="background:var(--clr-surface);border:1px solid var(--clr-border);border-radius:8px;overflow:hidden;">
                  <div style="padding:0.75rem 1.25rem;border-bottom:1px solid var(--clr-border);font-weight:700;font-size:0.85rem;color:var(--clr-text-1);display:flex;justify-content:space-between;align-items:center;">
                    <span>Eligible Students</span>
                    <span class="badge badge-success" style="font-size:0.75rem;">${eligibleStudents.length} Students</span>
                  </div>
                  <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
                    <thead>
                      <tr style="border-bottom:1px solid var(--clr-border);background:rgba(255,255,255,0.02);color:var(--clr-text-muted);font-size:0.72rem;text-transform:uppercase;">
                        <th style="padding:0.6rem 1rem;text-align:left;">Institution</th>
                        <th style="padding:0.6rem 1rem;text-align:left;">Program</th>
                        <th style="padding:0.6rem 1rem;text-align:left;">Batch</th>
                        <th style="padding:0.6rem 1rem;text-align:center;">Level</th>
                        <th style="padding:0.6rem 1.25rem;text-align:left;">Student Name</th>
                        <th style="padding:0.6rem 1rem;text-align:center;">Status</th>
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
                            <td style="padding:0.65rem 1rem;text-align:center;"><span class="badge badge-neutral" style="font-size:0.7rem;">${escapeHtml(sLvl)}</span></td>
                            <td style="padding:0.65rem 1.25rem;font-weight:600;color:var(--clr-text);">${escapeHtml(s.name)}</td>
                            <td style="padding:0.65rem 1rem;text-align:center;">
                              <span class="badge ${s.is_active !== false ? 'badge-success' : 'badge-neutral'}" style="font-size:0.7rem;">${s.is_active !== false ? 'Active' : 'Inactive'}</span>
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
              <div class="empty-state"><div style="font-size:2rem;margin-bottom:1rem;">📈</div><p>Gradebook will appear here.</p></div>
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
        area.innerHTML = `<div class="empty-state"><p style="color:#ef4444;">Failed to load class panel.</p></div>`;
      }
    }

        window.handleClassAutoGenerate = async (classId, levelId, category = null) => {
           if (!classId) return;
           try {
              const { openAutoGenerateModal } = await import('./auto-gen-modal.js?v=20261027c');
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
        <div class="section-header">
          <div>
            <h2 class="section-title">Institutions <span class="count-chip">${data.length} Total</span></h2>
            <p class="section-subtitle">Manage English learning institutions in alphabetical order</p>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th class="text-left">Institution Name</th>
                <th class="text-center">Status</th>
                <th class="text-center">Created Date</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody id="tbl-institutions"></tbody>
          </table>
        </div>
      `;
      const tbody = document.getElementById('tbl-institutions');
      if (!data.length) { tbody.innerHTML = '<tr><td colspan="4"><div class="empty-state"><div class="empty-state__icon">&#127963;</div><p>No institutions yet.</p></div></td></tr>'; return; }
      window._progRecords = {};
      data.forEach(r => {
        window._progRecords[r.id] = r;
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="fw-600">${escapeHtml(r.name)}</td>
          <td class="text-center"><span class="badge ${r.is_active ? 'badge-success' : 'badge-neutral'}">${r.is_active ? 'Active' : 'Inactive'}</span></td>
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

    // Ã¢â€â‚¬Ã¢â€â‚¬ CLASSES (Formerly Classes) Ã¢â€â‚¬Ã¢â€â‚¬
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
        <div class="section-header">
          <div>
            <h2 class="section-title">Classes & Blueprint <span class="count-chip">${data.length} in Tab</span></h2>
            <p class="section-subtitle">Manage class board grouped by level in alphabetical order</p>
          </div>
          <div class="d-flex gap-2 flex-wrap mt-3" style="width: 100%;">
             ${tabsHtml}
          </div>
        </div>

        <!-- C-CLASS TOOLS QUICK-ACCESS BAR -->
        <div class="card p-3 mt-3 mb-3" style="background:rgba(255,255,255,0.02);border:1px solid var(--clr-border);">
          <div class="text-xs fw-700 mb-2" style="color:var(--clr-text-2);letter-spacing:0.08em;">C &mdash; CLASS TOOLS</div>
          <div class="d-flex gap-2 flex-wrap">
            <button class="btn btn-ghost btn-sm" onclick="window.loadSection('levels')">&#128200; Levels</button>
            <button class="btn btn-ghost btn-sm" onclick="window.loadSection('topics')">&#127991;&#65039; Topics</button>
            <button class="btn btn-ghost btn-sm" onclick="window.loadSection('questions')">&#10067; Question Bank</button>
            <button class="btn btn-ghost btn-sm" onclick="window.loadSection('question_types')">&#128284; Validation Dictionary</button>
            <button class="btn btn-ghost btn-sm" onclick="window.loadSection('class_instances')">&#128197; Class Instances</button>
            <button class="btn btn-ghost btn-sm" onclick="window.loadSection('health')">&#9889; Recalibrator</button>
            <button class="btn btn-ghost btn-sm" onclick="window.loadSection('import-questions')">&#128229; Import Questions</button>
            <button class="btn btn-ghost btn-sm" onclick="window.loadSection('export-questions')">&#128228; Export Questions</button>
            <button class="btn btn-ghost btn-sm" onclick="window.loadSection('import_ai_tests')">&#129302; Import AI Tests</button>
          </div>
        </div>

        <div class="table-wrap mt-3">
          <table>
            <thead>
              <tr>
                <th class="text-left">Level</th>
                <th class="text-left">Class Name</th>
                <th class="text-center">Status</th>
                <th class="text-right">Actions</th>
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
              <td class="text-muted fw-600">${escapeHtml(r.levels?.name || '&mdash;')}</td>
              <td class="fw-600" style="color:var(--clr-text-1);">${escapeHtml(r.name)}</td>
              <td class="text-center"><span class="badge ${r.is_active ? 'badge-success' : 'badge-neutral'}">${r.is_active ? 'Active' : 'Inactive'}</span></td>
              <td class="text-right">
                <div class="d-flex gap-2 justify-end">
                  <button class="btn btn-outline btn-sm" data-nav-topics="${r.id}" title="View Topics in ${escapeHtml(r.name)}">Topics &rarr;</button>
                  <button class="btn btn-info btn-sm" data-nav-bank="${r.id}" title="Question Bank">&#10067; Question Bank</button>
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
          loadSection('questions');
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
          if (rec) window._deleteRecord('classes', sid, rec.name || 'Class Board');
        });
      });
    }

    // Ã¢â€â‚¬Ã¢â€â‚¬ LEVELS Ã¢â€â‚¬Ã¢â€â‚¬
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
        <div class="section-header">
          <div>
            <h2 class="section-title">Levels <span class="count-chip">${data.length} Total</span></h2>
            <p class="section-subtitle">Curriculum progression tiers ordered by program, class, Class, and level rank</p>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th class="text-left">Program</th>
                <th class="text-left">Class</th>
                <th class="text-left">Class Board</th>
                <th class="text-center">Level #</th>
                <th class="text-left">Level Name</th>
                <th class="text-center">Status</th>
                <th class="text-right">Actions</th>
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
        const progName = r.classes?.institutions?.name || 'â€”';
        const programName = (r.program_id && classMap[r.program_id]?.name) ? classMap[r.program_id].name : 'All Programs';
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><span class="badge badge-neutral">${escapeHtml(progName)}</span></td>
          <td><span class="badge badge-neutral">${escapeHtml(programName)}</span></td>
          <td class="text-muted fw-600">${escapeHtml(r.classes?.name || 'â€”')}</td>
          <td class="text-center"><span class="badge badge-primary">Level ${toLevelLetter(r.level_number)}</span></td>
          <td class="fw-600">${escapeHtml(r.name)}</td>
          <td class="text-center"><span class="badge ${r.is_active ? 'badge-success' : 'badge-neutral'}">${r.is_active ? 'Active' : 'Inactive'}</span></td>
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
      if (!birthDateStr) return 'â€”';
      const birthDate = new Date(birthDateStr);
      if (isNaN(birthDate.getTime())) return 'â€”';
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return (age && age > 0) ? `${age} yrs` : '—';
    }


    // Ã¢â€â‚¬Ã¢â€â‚¬ INDIVIDUAL STUDENT PROFILE (Detailed Progress, Correct/Incorrect Counts, Batch Navigation) Ã¢â€â‚¬Ã¢â€â‚¬
    // ─── INDIVIDUAL STUDENT PROFILE (Consolidated Modal Delegator) ───
    async function openStudentProfile(studentId, batchStudentIds = [], skipHistory = false) {
      if (typeof window.showStudentProfileModal === 'function') {
        return window.showStudentProfileModal(studentId);
      }
      const sm = await import('./student-management.js?v=5.3.2');
      if (typeof sm.showStudentProfileModal === 'function') {
        return sm.showStudentProfileModal(studentId);
      }
    }
    window.openStudentProfile = openStudentProfile;
    // --- Test MANAGEMENT HUB (Restored & Elevated) ---


// Global edit/delete handlers
window._editRecord = async (section, id, jsonStr) => {
  const record = JSON.parse(jsonStr);
  await openCrudModal(section, record);
};

let _deleteSection = null;
let _deleteId = null;
let _cascadeStudentIds = [];
let _cascadeBatchIds = [];
let _cascadeProgramIds = [];

window._deleteRecord = async (section, id, name) => {
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

  titleEl.textContent = `Delete ${(_deleteSection || 'Record').replace(/s$/, '').replace(/^\w/, c => c.toUpperCase())}?`;
  confirmBtn.textContent = 'Delete';
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
          <div style="text-align:left; background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.35); border-radius:8px; padding:12px; margin-bottom:12px;">
            <div style="font-weight:700; color:#ef4444; font-size:0.95rem; margin-bottom:6px;">⚠️ Connected Data Alert</div>
            <div style="font-size:0.85rem; color:var(--clr-text-1); margin-bottom:6px;">
              This Batch currently has <strong>${students.length} enrolled student(s)</strong>.
            </div>
            <div style="font-size:0.8rem; color:var(--clr-text-2); line-height:1.4;">
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
          <div style="text-align:left; background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.35); border-radius:8px; padding:12px; margin-bottom:12px;">
            <div style="font-weight:700; color:#ef4444; font-size:0.95rem; margin-bottom:6px;">⚠️ Connected Data Alert</div>
            <div style="font-size:0.85rem; color:var(--clr-text-1); margin-bottom:6px;">
              This Program contains <strong>${bIds.length} batch(es)</strong> and <strong>${studentCount} student(s)</strong>.
            </div>
            <div style="font-size:0.8rem; color:var(--clr-text-2); line-height:1.4;">
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
          <div style="text-align:left; background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.35); border-radius:8px; padding:12px; margin-bottom:12px;">
            <div style="font-weight:700; color:#ef4444; font-size:0.95rem; margin-bottom:6px;">⚠️ Connected Hierarchy Alert</div>
            <div style="font-size:0.85rem; color:var(--clr-text-1); margin-bottom:6px;">
              This Institution contains <strong>${pIds.length} program(s)</strong>, <strong>${bIds.length} batch(es)</strong>, and <strong>${studentCount} student(s)</strong>.
            </div>
            <div style="font-size:0.8rem; color:var(--clr-text-2); line-height:1.4;">
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
  msgEl.textContent = `Soft-delete "${name}"? Historical data is preserved.`;
  modal.classList.remove('hidden');
};

document.getElementById('delete-confirm-btn').addEventListener('click', async () => {
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

window.openCrudModal = openCrudModal;
window.openDuplicateStudentsModal = openDuplicateStudentsModal;
window.openDuplicateQuestionsModal = openDuplicateQuestionsModal;
window.loadSection = loadSection;
window.openStudentProfile = openStudentProfile;
