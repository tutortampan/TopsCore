import fs from 'fs';

const studentFiles = [
  { name: 'dashboard.css', path: 'css/dashboard.css' },
  { name: 'test.css', path: 'css/test.css' },
  { name: 'result.css', path: 'css/result.css' },
  { name: 'auth.css', path: 'css/auth.css' },
  { name: 'conversation.css', path: 'css/conversation.css' }
];

const studentTargets = [
  // Dashboard
  '.dashboard-header',
  '.dashboard-header-brand',
  '.header-action-btn',
  '.welcome-banner',
  '#banner-score-box',
  '.dock-tab-header',
  '.standings-card-header',
  '.standings-table-header',
  '.test-card-header',
  
  // Test Room
  '.test-top-header',
  '#test-title',
  '#timer',
  '.matrix-header',
  '.matrix-footer',
  '.bottom-nav-bar',
  '.btn-nav-prev',
  '.btn-nav-next',
  
  // Result Room
  '.result-header',
  '.result-hero',
  '.answers-modal-header',
  '.answers-modal-footer',
  '.result-actions',
  '.btn-next-milestone',
  
  // Student Gate
  '.cascade-header',
  '.cascade-step-header',
  '.remember-me-banner',
  
  // Universal
  '#bottom-ad-banner',
  '.topscore-locked-banner',
  '.modal-header',
  '.modal-footer',
  '.profile-modal-header',
  '.flashcard-modal-header',
  '.flashcard-footer-controls'
];

console.log('=== AUDITING STUDENT AREA HEADERS, SUBHEADERS, FOOTERS ===\n');

for (const t of studentTargets) {
  let matched = [];
  for (const f of studentFiles) {
    if (!fs.existsSync(f.path)) continue;
    const content = fs.readFileSync(f.path, 'utf8');
    const clean = content.replace(/\/\*[\s\S]*?\*\//g, '');
    const ruleRegex = /([^{}]+)\{([^}]+)\}/g;
    let match;

    while ((match = ruleRegex.exec(clean)) !== null) {
      const sel = match[1].trim();
      const body = match[2].trim();

      if (sel.toLowerCase().includes(t.toLowerCase())) {
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
          matched.push({ file: f.name, selector: sel, props });
        }
      }
    }
  }

  if (matched.length > 0) {
    console.log(`\n🎯 TARGET: ${t}`);
    for (const m of matched) {
      console.log(`  [${m.file}] ${m.selector}`);
      for (const [k, v] of Object.entries(m.props)) {
        console.log(`     ${k}: ${v}`);
      }
    }
  }
}

