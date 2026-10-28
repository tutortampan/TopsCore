// TOPSCORE LMS — Admin Initialization & Fast-Boot Controller
// Centralizes sidebar hydration, record drawer controls, auth gate, and service worker registration
import { DataGrid } from './datagrid.js?v=20261027d';
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

export function initSidebarCache() {
  try {
    // 1. Programs Hydration
    const rawProg = localStorage.getItem('topscore_cached_sidebar_programs');
    if (rawProg) {
      const list = JSON.parse(rawProg);
      if (Array.isArray(list) && list.length > 0) {
        const selId = localStorage.getItem('topscore_selected_program_id') || list[0].id;
        let h = '<div class="sidebar-program-group" style="display:flex; flex-direction:column; gap:2px;">';
        list.forEach(prog => {
          const isActive = (selId === prog.id && location.hash === '#students') ? 'active' : '';
          h += `<div class="admin-nav-item sidebar-program-item ${isActive}" data-program-id="${prog.id}" data-program-name="${(prog.name || '').replace(/"/g, '&quot;')}" data-sub="students"><span class="nav-icon">👥</span><span>${prog.name || ''}</span></div>`;
        });
        h += '</div>';
        const el = document.getElementById('sidebar-programs-list');
        if (el) el.innerHTML = h;
      }
    }

    // 2. Classes Hydration
    const rawClass = localStorage.getItem('topscore_cached_sidebar_classes');
    if (rawClass) {
      const list = JSON.parse(rawClass);
      if (Array.isArray(list) && list.length > 0) {
        const selId = localStorage.getItem('topscore_selected_class_id') || list[0].id;
        let h = '<div class="sidebar-class-group" style="display:flex; flex-direction:column; gap:2px;">';
        list.forEach(cls => {
          const isActive = (selId === cls.id && location.hash === '#class-hub') ? 'active' : '';
          h += `<div class="admin-nav-item sidebar-class-item ${isActive}" data-class-id="${cls.id}" data-class-name="${(cls.name || '').replace(/"/g, '&quot;')}"><span class="nav-icon">📘</span><span>${cls.name || ''}</span></div>`;
        });
        h += '</div>';
        const el = document.getElementById('sidebar-classes-list');
        if (el) el.innerHTML = h;
      }
    }
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

export function registerServiceWorker(swPath = 'sw.js?v=20261028_v16') {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(swPath)
        .then(reg => {
          reg.update();
        })
        .catch(err => console.warn('ServiceWorker registration failed:', err));
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
