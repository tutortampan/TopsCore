import fs from 'fs';

const cssFiles = [
  { name: 'admin.css', path: 'css/admin.css' },
  { name: 'style.css', path: 'css/style.css' },
  { name: 'dashboard.css', path: 'css/dashboard.css' },
  { name: 'test.css', path: 'css/test.css' },
  { name: 'result.css', path: 'css/result.css' },
  { name: 'auth.css', path: 'css/auth.css' },
  { name: 'conversation.css', path: 'css/conversation.css' }
];

const targets = [
  // Page Topbars / Headers
  { label: 'Admin Topbar', selector: '.admin-topbar' },
  { label: 'Admin Topbar Tabs Container', selector: '.topbar-tabs-container' },
  { label: 'Admin Topbar Tab Card/Folder', selector: '.topbar-tab-card' },
  { label: 'Sidebar Header', selector: '.sidebar-header, .admin-sidebar-header, .brand-header' },
  { label: 'Sidebar Footer', selector: '.sidebar-footer' },
  { label: 'Domain Nav Header', selector: '.nav-domain-header' },
  { label: 'Admin Nav Item', selector: '.admin-nav-item' },
  { label: 'Dashboard Header', selector: '.dashboard-header' },
  { label: 'Dashboard Topbar Actions / Buttons', selector: '.header-action-btn' },
  { label: 'Test Top Header', selector: '.test-top-header, .test-header' },
  { label: 'Conversation Topbar', selector: '.conv-topbar' },
  { label: 'Gate Header (Login)', selector: '.cascade-header, .auth-header' },
  
  // Subheaders / Subnavs / Toolbars
  { label: 'Domain Subnav (Admin A/B/C/D)', selector: '.domain-subnav, .admin-subnav' },
  { label: 'Workspace / Section Header', selector: '.workspace-header, .section-header' },
  { label: 'Admin Toolbar / Roster Toolbar', selector: '.admin-toolbar, .student-roster-toolbar, .attendance-matrix-toolbar' },
  { label: 'Datagrid Toolbar', selector: '.datagrid-toolbar' },
  { label: 'Dashboard Tab / Standings Header', selector: '.standings-card-header, .dock-tab-header, .dashboard-tabs' },
  { label: 'Conversation Topic Banner', selector: '.conv-topic-banner' },
  { label: 'Test Question / Prompt Header', selector: '.matrix-header, .question-header' },
  { label: 'Gate Step Header', selector: '.cascade-step-header, .step-header' },

  // Table Super-Headers, Sub-Headers & Single Headers
  { label: 'Table Super-Header (24px spec)', selector: 'super-header' },
  { label: 'Table Sub-Header (24px spec)', selector: 'sub-header' },
  { label: 'Table Single-Header (28px spec)', selector: 'thead th' },
  { label: 'Table Summary / Footer (tfoot)', selector: 'tfoot' },
  
  // Workspace Footers & Lower Panels
  { label: 'Workspace Lower Panel (50px spec)', selector: '.workspace-lower-panel, #admin-lower-panel, #roster-lower-panel' },
  { label: 'Bottom Ad Banner (60px locked)', selector: '#bottom-ad-banner, .topscore-locked-banner' },
  { label: 'Test Bottom Nav Bar', selector: '.bottom-nav-bar, .test-bottom-bar, .test-footer' },
  { label: 'Conversation Bottom Panel', selector: '.conv-bottom-panel' },
  
  // Modal Headers & Footers
  { label: 'Modal Header', selector: '.modal-header' },
  { label: 'Modal Footer', selector: '.modal-footer' },
  { label: 'Flashcard Modal Header', selector: '.flashcard-modal-header' },
  { label: 'Flashcard Footer Controls', selector: '.flashcard-footer-controls' }
];

console.log('=== DEEP CSS RULE EXTRACTION FOR ALL HEADERS, SUBHEADERS, AND FOOTERS ===\n');

for (const t of targets) {
  console.log(`\n------------------------------------------------------------`);
  console.log(`🎯 TARGET: ${t.label} (Query: "${t.selector}")`);
  console.log(`------------------------------------------------------------`);

  let found = false;

  for (const f of cssFiles) {
    if (!fs.existsSync(f.path)) continue;
    const content = fs.readFileSync(f.path, 'utf8');

    // Split into rules
    const clean = content.replace(/\/\*[\s\S]*?\*\//g, '');
    const ruleRegex = /([^{}]+)\{([^}]+)\}/g;
    let match;

    while ((match = ruleRegex.exec(clean)) !== null) {
      const sel = match[1].trim();
      const body = match[2].trim();

      // Check if sel matches target query
      const queries = t.selector.split(',').map(s => s.trim().toLowerCase());
      const matchesQuery = queries.some(q => sel.toLowerCase().includes(q));

      if (matchesQuery) {
        // Extract dimensions, fonts, padding
        const props = {};
        for (const line of body.split(';')) {
          const parts = line.split(':');
          if (parts.length >= 2) {
            const k = parts[0].trim().toLowerCase();
            const v = parts.slice(1).join(':').trim();
            if ([
              'height', 'min-height', 'max-height',
              'font-size', 'font-family', 'font-weight', 'line-height',
              'padding', 'padding-top', 'padding-bottom',
              'gap', 'box-sizing', 'border-top', 'border-bottom'
            ].includes(k)) {
              props[k] = v;
            }
          }
        }

        if (Object.keys(props).length > 0) {
          found = true;
          console.log(`[${f.name}] ${sel}`);
          for (const [k, v] of Object.entries(props)) {
            console.log(`   ${k}: ${v}`);
          }
        }
      }
    }
  }

  if (!found) {
    console.log(`  (No direct CSS rules found matching selector in stylesheets)`);
  }
}
