const fs = require('fs');
let html = fs.readFileSync('dashboard.html', 'utf8');

html = html.replace(/<section id="up-next-section" class="hidden"/g, '<section id="up-next-section" class="hidden card"');
html = html.replace(/<section class="classes-section"/g, '<section class="classes-section card"');
html = html.replace(/<section class="completed-Assessments-section"/g, '<section class="completed-Assessments-section card"');

// Add horizontal lines
html = html.replace(/(<section id="up-next-section")/g, '<hr style="margin: 24px 0; border: none; border-top: 1px solid var(--clr-border);">\n      $1');
html = html.replace(/(<section class="classes-section card")/g, '<hr style="margin: 24px 0; border: none; border-top: 1px solid var(--clr-border);">\n      $1');
html = html.replace(/(<section class="completed-Assessments-section card")/g, '<hr style="margin: 24px 0; border: none; border-top: 1px solid var(--clr-border);">\n      $1');

fs.writeFileSync('dashboard.html', html);
console.log('Added cards and dividers');
