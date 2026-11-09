// TOPSCORE LMS — Admin Initialization & Fast-Boot Controller
// Centralizes sidebar hydration, record drawer controls, auth gate, and service worker registration
import { DataGrid } from './datagrid.js?v=20261106_v160';
if (typeof window !== 'undefined') {
  window.DataGrid = DataGrid;
}

export function initAuthGate() {
  const hasSession = sessionStorage.getItem('topscore_admin_session') || localStorage.getItem('topscore_admin_session');
  const loginScreen = document.getElementById('admin-login-screen');
  const adminConsole = document.getElementById('admin-console');

  if (!hasSession) {
    loginScreen?.classList.remove('hidden');
    adminConsole?.classList.add('hidden');
  } else {
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

export function sortAllSidebarDomains() {
  document.querySelectorAll('.nav-domain-group').forEach(group => {
    const header = group.querySelector('.nav-domain-header');
    if (header) header.style.order = '0';

    const items = Array.from(group.querySelectorAll('.admin-nav-item'));
    if (items.length <= 1) return;

    items.sort((a, b) => {
      const textA = getSidebarNavItemLabel(a);
      const textB = getSidebarNavItemLabel(b);
      return textA.localeCompare(textB, undefined, { numeric: true, sensitivity: 'base' });
    });

    items.forEach((item, idx) => {
      item.style.order = String(idx + 1);
    });
  });
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
    const hasChildChanges = mutations.some(m => m.type === 'childList');
    if (!hasChildChanges) return;
    if (debounceTimer) cancelAnimationFrame(debounceTimer);
    debounceTimer = requestAnimationFrame(() => {
      sortAllSidebarDomains();
    });
  });
  observer.observe(nav, { childList: true, subtree: true });
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
            h += `<div class="admin-nav-item sidebar-program-item ${isActive}" data-program-id="${pid}" data-batch-id="${bid}" data-program-name="${pname.replace(/"/g, '&quot;')}" data-batch-name="${bname.replace(/"/g, '&quot;')}" data-sidebar-label="${label.replace(/"/g, '&quot;')}" data-sub="students"><span class="nav-icon">👥</span><span>${label}</span></div>`;
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
          h += `<div class="admin-nav-item sidebar-class-item ${isActive}" data-class-id="${cls.id}" data-class-name="${(cls.name || '').replace(/"/g, '&quot;')}"><span class="nav-icon">📘</span><span>${cls.name || ''}</span></div>`;
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
    if (footerEl) footerEl.innerHTML = footerHTML || '<button class="btn btn-secondary" onclick="closeRecordDrawer()">Close</button>';

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
      initSidebarCache();
      initRecordDrawer();
      registerServiceWorker();
    });
  } else {
    initAuthGate();
    initSidebarCache();
    initRecordDrawer();
    registerServiceWorker();
  }
}
