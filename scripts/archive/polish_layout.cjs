const fs = require('fs');
let html = fs.readFileSync('dashboard.html', 'utf8');

// 1. Profile Card Dividers
html = html.replace(/<hr style="width: 100%; border: none; border-top: 1px solid rgba\(255, 255, 255, 0\.1\); margin: 24px 0;">/g, '<div style="width: 100%; height: 1px; background: rgba(148, 163, 184, 0.2); margin: 16px 0;"></div>');
html = html.replace(/<hr style="width: 100%; border: none; border-top: 1px solid rgba\(255, 255, 255, 0\.1\); margin: 24px 0 24px 0;">/g, '<div style="width: 100%; height: 1px; background: rgba(148, 163, 184, 0.2); margin: 16px 0;"></div>');

// 2. Avatar Proportions
html = html.replace(/width: 140px; height: 140px;/g, 'width: 108px; height: 108px;');
html = html.replace(/font-size: 3\.5rem;/g, 'font-size: 2.4rem;');

// 3. Typography & Consistency
html = html.replace(/if \(elProg\) elProg\.textContent = prgName;/g, 'if (elProg) elProg.textContent = prgName.toUpperCase();');
html = html.replace(/if \(gradeBadgeVal\) gradeBadgeVal\.textContent = 'â€”';/g, 'if (gradeBadgeVal) gradeBadgeVal.innerHTML = \'&mdash;\';');

// 4. Page Cleanliness: Remove leftover hr
html = html.replace(/<hr style="margin: 24px 0; border: none; border-top: 1px solid var\(--clr-border\);">\s*/g, '');

fs.writeFileSync('dashboard.html', html);
console.log('Polished dashboard.html layout');
