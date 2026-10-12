const fs = require('fs');
let html = fs.readFileSync('dashboard.html', 'utf8');

// Next Assessment CTA
html = html.replace(/<button onclick="\$\{navLink\}" class="btn btn-primary" style="padding: 8px 16px; border-radius: 8px; font-weight: 700; white-space: nowrap;">Start Now<\/button>/g, '<button onclick="${navLink}" class="btn btn-primary" style="padding: 6px 14px; font-size: 0.8rem; border-radius: 8px; font-weight: 700; white-space: nowrap;">Start Now</button>');

// Subtle borders 0.06
html = html.replace(/border: 1px solid rgba\(255, 255, 255, 0\.05\);/g, 'border: 1px solid rgba(255, 255, 255, 0.06);');
html = html.replace(/border: 1px solid rgba\(255, 255, 255, 0\.08\);/g, 'border: 1px solid rgba(255, 255, 255, 0.06);');

fs.writeFileSync('dashboard.html', html);
console.log('Final polish done.');
