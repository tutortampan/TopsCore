// TOPSCORE LMS — Admin Initialization & Fast-Boot Controller
// Centralizes sidebar hydration, record drawer controls, auth gate, and service worker registration
import { DataGrid } from './datagrid.js?v=20261106_v160';
if (typeof window !== 'undefined') {
  window.DataGrid = DataGrid;
}

export function initGlobalEditModeToggle() {
  // Deprecated: Bottom-left master edit mode toggle purged per Phase 556
}

export function initAuthGate() {
  const hasSession = sessionStorage.getItem('topscore_admin_session') || localStorage.getItem('topscore_admin_session');
  const loginScreen = document.getElementById('admin-login-screen');
  const adminConsole = document.getElementById('admin-console');

  if (!hasSession) {
    loginScreen?.classList.remove('hidden');
    adminConsole?.classList.add('hidden');
  } else {
    try {
      const sess = JSON.parse(hasSession);
      const isTutor = (sess && sess.role === 'tutor');
      if (isTutor) {
        document.body.classList.add('role-tutor');
      }
      const roleLabel = document.getElementById('sidebar-user-role-label');
      if (roleLabel) {
        const span = roleLabel.querySelector('.corner-main-label') || roleLabel;
        span.textContent = isTutor ? 'TUTOR' : 'ADMIN';
      }
    } catch (_) {}
    loginScreen?.classList.add('hidden');
    adminConsole?.classList.remove('hidden');
  }
}

export function getSidebarNavItemLabel(el) {
  if (!el) return '';
  const labelAttr = el.getAttribute('data-sidebar-label') || el.getAttribute('data-class-name');
  if (labelAttr && labelAttr.trim()) return labelAttr.trim();

  // Spans excluding .nav-icon
  const spans = Array.from(el.querySelectorAll('span:not(.nav-icon)'));
  if (spans.length > 0) {
    const text = spans.map(s => s.textContent || '').join(' ').trim();
    if (text) return text;
  }

  // Clone node and strip .nav-icon
  const clone = el.cloneNode(true);
  const icon = clone.querySelector('.nav-icon');
  if (icon) icon.remove();
  return (clone.textContent || '').replace(/^[^\w\d]+/gu, '').trim();
}

let _isSorting = false;

export function sortAllSidebarDomains() {
  if (_isSorting) return;
  _isSorting = true;
  try {
    document.querySelectorAll('.nav-domain-group').forEach(group => {
      // Exclude special pinned items like Alumni so it always docks at the bottom of Domain B
      const items = Array.from(group.querySelectorAll('.admin-nav-item:not([data-sub="alumni"])'));
      if (items.length > 1) {
        const sorted = [...items].sort((a, b) => {
          const textA = getSidebarNavItemLabel(a);
          const textB = getSidebarNavItemLabel(b);
          return textA.localeCompare(textB, undefined, { numeric: true, sensitivity: 'base' });
        });

        // Strict check if order actually changed to prevent pointless DOM mutations
        let needsReorder = false;
        for (let i = 0; i < items.length; i++) {
          if (items[i] !== sorted[i]) {
            needsReorder = true;
            break;
          }
        }
        if (needsReorder) {
          sorted.forEach(item => {
            if (item.parentNode) {
              item.parentNode.appendChild(item);
            }
          });
        }
      }

      // Ensure Alumni item stays docked at the bottom of Board domain
      const alumniItem = group.querySelector('.admin-nav-item[data-sub="alumni"]');
      if (alumniItem && alumniItem.parentNode) {
        alumniItem.parentNode.appendChild(alumniItem);
      }
    });
  } finally {
    _isSorting = false;
  }
}
if (typeof window !== 'undefined') {
  window.sortAllSidebarDomains = sortAllSidebarDomains;
  window.getSidebarNavItemLabel = getSidebarNavItemLabel;
}

export function initSidebarAlphabeticalObserver() {
  const nav = document.querySelector('.admin-nav');
  if (!nav || nav._hasAlphabeticalObserver) return;
  nav._hasAlphabeticalObserver = true;

  let debounceTimer = null;
  const observer = new MutationObserver((mutations) => {
    if (_isSorting) return;
    const hasChildChanges = mutations.some(m => m.type === 'childList');
    if (!hasChildChanges) return;
    if (debounceTimer) cancelAnimationFrame(debounceTimer);
    debounceTimer = requestAnimationFrame(() => {
      sortAllSidebarDomains();
    });
  });
  observer.observe(nav, { childList: true, subtree: true });
}

export function initSidebarDelegation() {
  const nav = document.querySelector('.admin-nav');
  if (!nav || nav._hasSidebarDelegation) return;
  nav._hasSidebarDelegation = true;

  nav.addEventListener('click', (e) => {
    // 1. Program / Batch items
    const progItem = e.target.closest('.sidebar-program-item');
    if (progItem && nav.contains(progItem)) {
      e.preventDefault();
      e.stopPropagation();

      const pid = progItem.getAttribute('data-program-id');
      const pname = progItem.getAttribute('data-program-name');
      const bid = progItem.getAttribute('data-batch-id') || null;
      const bname = progItem.getAttribute('data-batch-name') || null;
      const label = progItem.getAttribute('data-sidebar-label') || pname;

      window._filterProgramId = pid;
      window._selectedProgramName = pname;
      window._filterBatchId = bid;
      window._filterBatchName = bname;
      window._selectedSidebarLabel = label;
      window._filterBatchStatus = 'active';

      try {
        localStorage.setItem('topscore_student_status_tab', 'active');
        if (pid) localStorage.setItem('topscore_selected_program_id', pid);
        if (pname) localStorage.setItem('topscore_selected_program_name', pname);
        if (bid) {
          localStorage.setItem('topscore_selected_batch_id', bid);
          localStorage.setItem('topscore_selected_batch_name', bname);
        } else {
          localStorage.removeItem('topscore_selected_batch_id');
          localStorage.removeItem('topscore_selected_batch_name');
        }
        if (label) localStorage.setItem('topscore_selected_sidebar_label', label);

        if (window.history && window.history.replaceState) {
          const bParam = bid ? `?batch_id=${bid}` : (pid ? `?program_id=${pid}` : '');
          window.history.replaceState(null, '', `#students${bParam}`);
        }
      } catch (_) {}

      document.querySelectorAll('.admin-nav-item').forEach(i => i.classList.remove('active'));
      progItem.classList.add('active');

      if (typeof window.loadSection === 'function') {
        window.loadSection('students');
      } else {
        window.location.hash = '#students';
      }
      return;
    }

    // 2. Class items
    const classItem = e.target.closest('.sidebar-class-item');
    if (classItem && nav.contains(classItem)) {
      e.preventDefault();
      e.stopPropagation();

      const cid = classItem.getAttribute('data-class-id');
      const cname = classItem.getAttribute('data-class-name');
      window._selectedClassId = cid;
      window._selectedClassName = cname;
      try {
        if (cid) localStorage.setItem('topscore_selected_class_id', cid);
        if (cname) localStorage.setItem('topscore_selected_class_name', cname);
      } catch (_) {}
      window._selectedLevelId = null;

      document.querySelectorAll('.admin-nav-item').forEach(i => i.classList.remove('active'));
      classItem.classList.add('active');

      if (typeof window.loadSection === 'function') {
        window.loadSection('class-hub');
      } else {
        window.location.hash = '#class-hub';
      }
      return;
    }

    // 3. Domain header clicks (Domain A -> dashboard, B -> students, C -> class-hub, D -> modules)
    const domainHeader = e.target.closest('.nav-domain-header');
    if (domainHeader && nav.contains(domainHeader)) {
      const group = domainHeader.closest('.nav-domain-group');
      const domain = group ? group.getAttribute('data-domain') : null;
      if (!domain) return;

      e.preventDefault();
      e.stopPropagation();

      if (domain === 'board') {
        if (typeof window.loadSection === 'function') window.loadSection('students');
        else window.location.hash = '#students';
      } else if (domain === 'class') {
        if (typeof window.loadSection === 'function') window.loadSection('class-hub');
        else window.location.hash = '#class-hub';
      } else if (domain === 'admin') {
        if (typeof window.loadSection === 'function') window.loadSection('dashboard');
        else window.location.hash = '#dashboard';
      } else if (domain === 'desk') {
        if (typeof window.loadSection === 'function') window.loadSection('modules');
        else window.location.hash = '#modules';
      }
      return;
    }

    // 4. Standard admin-nav-item with data-sub
    const navItem = e.target.closest('.admin-nav-item');
    if (navItem && nav.contains(navItem) && navItem.dataset.sub) {
      e.preventDefault();
      e.stopPropagation();

      document.querySelectorAll('.admin-nav-item').forEach(i => i.classList.remove('active'));
      navItem.classList.add('active');

      if (typeof window.loadSection === 'function') {
        window.loadSection(navItem.dataset.sub);
      } else {
        const targetHash = `#${navItem.dataset.sub}`;
        if (window.location.hash === targetHash) {
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        } else {
          window.location.hash = targetHash;
        }
      }
    }
  });
}

export function initSidebarCache() {
  try {
    const curHash = location.hash ? location.hash.substring(1).split('?')[0].split('/')[0] : (localStorage.getItem('topscore_admin_last_section') || '');
    if (curHash && curHash !== 'dashboard') {
      const dashItem = document.querySelector('.admin-nav-item[data-sub="dashboard"]');
      if (dashItem) dashItem.classList.remove('active');
    }

    // 1. Programs & Batches Hydration
    const rawProg = localStorage.getItem('topscore_cached_sidebar_programs');
    if (rawProg) {
      try {
        const list = JSON.parse(rawProg);
        const activeList = Array.isArray(list) ? list.filter(item => item.is_active !== false) : [];
        if (activeList.length > 0) {
          activeList.sort((a, b) => (a.label || a.name || '').localeCompare(b.label || b.name || '', undefined, { numeric: true, sensitivity: 'base' }));
          const selBatchId = localStorage.getItem('topscore_selected_batch_id');
          const selProgId = localStorage.getItem('topscore_selected_program_id');
          const isProgActive = curHash === 'students';
          let h = '<div class="sidebar-program-group" style="display:flex; flex-direction:column; gap:2px;">';
          activeList.forEach(item => {
            const isMatch = selBatchId
              ? (item.batch_id === selBatchId)
              : ((item.program_id && item.program_id === selProgId) || (item.id && item.id === selProgId));
            const isActive = (isMatch && isProgActive) ? 'active' : '';
            const label = item.label || item.name || '';
            const pid = item.program_id || item.id || '';
            const bid = item.batch_id || '';
            const pname = item.program_name || item.name || '';
            const bname = item.batch_name || '';
            const usersIconSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sidebar-svg-icon"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`;
            h += `<div class="admin-nav-item sidebar-program-item ${isActive}" data-program-id="${pid}" data-batch-id="${bid}" data-program-name="${pname.replace(/"/g, '&quot;')}" data-batch-name="${bname.replace(/"/g, '&quot;')}" data-sidebar-label="${label.replace(/"/g, '&quot;')}" data-sub="students"><span class="nav-icon">${usersIconSvg}</span><span>${label}</span></div>`;
          });
          h += '</div>';
          const el = document.getElementById('sidebar-programs-list');
          if (el) el.innerHTML = h;
        }
      } catch (e) {}
    }

    // 2. Classes Hydration
    const rawClass = localStorage.getItem('topscore_cached_sidebar_classes');
    if (rawClass) {
      const list = JSON.parse(rawClass);
      if (Array.isArray(list) && list.length > 0) {
        list.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' }));
        const selId = localStorage.getItem('topscore_selected_class_id') || list[0].id;
        const isClassActive = curHash === 'class-hub' || curHash === 'classes';
        let h = '<div class="sidebar-class-group" style="display:flex; flex-direction:column; gap:2px;">';
        list.forEach(cls => {
          const isActive = (selId === cls.id && isClassActive) ? 'active' : '';
          const classIconSvg = (typeof getClassSvgIcon === 'function')
            ? getClassSvgIcon(cls.name, 14, 'currentColor')
            : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sidebar-svg-icon"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`;
          h += `<div class="admin-nav-item sidebar-class-item ${isActive}" data-class-id="${cls.id}" data-class-name="${(cls.name || '').replace(/"/g, '&quot;')}"><span class="nav-icon">${classIconSvg}</span><span>${cls.name || ''}</span></div>`;
        });
        h += '</div>';
        const el = document.getElementById('sidebar-classes-list');
        if (el) el.innerHTML = h;
      }
    }
    // Authoritatively sort all sidebar domains & start observer
    sortAllSidebarDomains();
    initSidebarAlphabeticalObserver();
  } catch (err) {
    console.warn('[AdminInit] Sidebar cache hydration failed:', err);
  }
}

export function initRecordDrawer() {
  window.openRecordDrawer = function(title, bodyHTML, footerHTML) {
    const titleEl = document.getElementById('drawer-title');
    const bodyEl = document.getElementById('drawer-body');
    const footerEl = document.getElementById('drawer-footer');
    const overlay = document.getElementById('datagrid-drawer-overlay');
    const drawer = document.getElementById('datagrid-drawer');

    if (titleEl) titleEl.textContent = title || 'Details';
    if (bodyEl) bodyEl.innerHTML = bodyHTML || '';
    if (footerEl) footerEl.innerHTML = footerHTML || '<button type="button" class="btn btn-secondary btn-sm btn-modal-close-left" onclick="closeRecordDrawer()">Close</button>';

    overlay?.classList.remove('hidden');
    setTimeout(() => {
      drawer?.classList.add('open');
    }, 10);
  };

  window.closeRecordDrawer = function() {
    const overlay = document.getElementById('datagrid-drawer-overlay');
    const drawer = document.getElementById('datagrid-drawer');
    drawer?.classList.remove('open');
    setTimeout(() => {
      overlay?.classList.add('hidden');
    }, 300);
  };
}

export function registerServiceWorker() {
  // Tutor's Room Admin Console must NEVER be cached by Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(regs => {
      regs.forEach(reg => reg.unregister());
    });
  }
  if ('caches' in window) {
    caches.keys().then(keys => {
      keys.forEach(k => {
        if (k.startsWith('topscore-cache')) caches.delete(k);
      });
    });
  }
}

// Auto-run on DOM ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initAuthGate();
      initGlobalEditModeToggle();
      initSidebarCache();
      initSidebarDelegation();
      initRecordDrawer();
      registerServiceWorker();
    });
  } else {
    initAuthGate();
    initGlobalEditModeToggle();
    initSidebarCache();
    initSidebarDelegation();
    initRecordDrawer();
    registerServiceWorker();
  }
}
