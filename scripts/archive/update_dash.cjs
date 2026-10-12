const fs = require('fs');
let c = fs.readFileSync('d:/TopsCore/dashboard.html', 'utf8');

c = c.replace(/if \(!prereqMet\) \{\s*continue;\s*\/\/\s*Hide locked assessments completely\s*\} else if \(!inWindow\) \{/, 
`const isLocked = !prereqMet;

        if (isLocked) {
          statusBadge = \`<span class="badge" style="background:rgba(255,255,255,0.1);color:#a1a1aa;border:1px solid rgba(255,255,255,0.2);">🔒 Locked</span>\`;
          actionBtn = \`<div style="text-align:right;">
                         <span style="font-size:0.7rem;color:var(--clr-text-3);">Complete <b>\${escapeHtml(prereqTitle)}</b><br>to unlock.</span>
                       </div>\`;
        } else if (!inWindow) {`);

c = c.replace(/transition:\s*border-color\s*0\.2s;/, 
`transition: border-color 0.2s;
            \${isLocked ? 'opacity: 0.65; filter: grayscale(100%); pointer-events: none;' : ''}`);

fs.writeFileSync('d:/TopsCore/dashboard.html', c);
console.log('Done');
