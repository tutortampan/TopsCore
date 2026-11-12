import fs from 'fs';
import path from 'path';

// Files to inspect
const cssFiles = [
  'css/style.css',
  'css/admin.css',
  'css/dashboard.css',
  'css/test.css',
  'css/result.css',
  'css/auth.css',
  'css/conversation.css'
];

const htmlFiles = [
  'admin.html',
  'dashboard.html',
  'test.html',
  'result.html',
  'index.html',
  'conversation.html'
];

const jsFiles = [
  'js/admin/datagrid.js',
  'js/admin/app.js',
  'js/admin/student-management.js',
  'js/admin/class.js',
  'js/admin/tests-access.js',
  'js/admin/vocab-vault.js',
  'js/admin/desk.js',
  'js/admin/crud-modals.js',
  'js/dashboard.js',
  'js/test.js',
  'js/result.js'
];

console.log('=== AUDITING CSS RULES FOR HEADERS, SUBHEADERS, FOOTERS ===');

const results = {
  headers: [],
  subheaders: [],
  footers: [],
  tables: [],
  modals: []
};

// Regex to capture CSS blocks
function auditCss(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Clean comments
  const cleanContent = content.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Match rules
  const ruleRegex = /([^{}]+)\{([^}]+)\}/g;
  let match;
  while ((match = ruleRegex.exec(cleanContent)) !== null) {
    const selector = match[1].trim();
    const body = match[2].trim();
    
    const lowerSel = selector.toLowerCase();
    
    // Check if relevant
    const isHeader = lowerSel.includes('header') || lowerSel.includes('topbar') || lowerSel.includes('super-header') || lowerSel.includes('thead') || lowerSel.includes('nav');
    const isSubHeader = lowerSel.includes('sub-header') || lowerSel.includes('subheader') || lowerSel.includes('toolbar') || lowerSel.includes('subnav') || lowerSel.includes('tab-bar') || lowerSel.includes('tabs-header');
    const isFooter = lowerSel.includes('footer') || lowerSel.includes('bottom') || lowerSel.includes('tfoot') || lowerSel.includes('lower-panel') || lowerSel.includes('action-bar');
    const isModal = lowerSel.includes('modal-header') || lowerSel.includes('modal-footer') || lowerSel.includes('dialog-header') || lowerSel.includes('dialog-footer');

    if (isHeader || isSubHeader || isFooter || isModal) {
      // Extract height, min-height, max-height, font-size, font-family, font-weight, line-height, padding
      const props = {};
      const lines = body.split(';');
      for (const line of lines) {
        const parts = line.split(':');
        if (parts.length >= 2) {
          const propName = parts[0].trim().toLowerCase();
          const propVal = parts.slice(1).join(':').trim();
          if (['height', 'min-height', 'max-height', 'font-size', 'font-family', 'font-weight', 'line-height', 'padding', 'gap', 'margin'].includes(propName)) {
            props[propName] = propVal;
          }
        }
      }

      if (Object.keys(props).length > 0) {
        const entry = { file: filePath, selector, props };
        if (isModal) results.modals.push(entry);
        else if (isSubHeader) results.subheaders.push(entry);
        else if (isHeader) results.headers.push(entry);
        else if (isFooter) results.footers.push(entry);
      }
    }
  }
}

for (const f of cssFiles) {
  auditCss(f);
}

console.log(`Audited CSS: found ${results.headers.length} headers, ${results.subheaders.length} subheaders, ${results.footers.length} footers, ${results.modals.length} modal headers/footers.`);

fs.writeFileSync('scripts/audit_headers_footers_css.json', JSON.stringify(results, null, 2), 'utf8');

// Now let's analyze live DOM via Playwright across the key rooms
console.log('Done CSS extraction.');
