const fs = require('fs');

let html = fs.readFileSync('dashboard.html', 'utf8');

// Update .completed-Assessment-mobile-card inline styles
html = html.replace(
  /<div class="completed-Assessment-mobile-card" onclick="\$\{navLink\}" style="padding: 12px 14px; gap: 6px;">/g,
  '<div class="completed-Assessment-mobile-card" onclick="${navLink}" style="padding: 8px 12px; gap: 4px; margin-bottom: 6px;">'
);

// Also remove 'card' class from the outer sections to avoid double borders
html = html.replace(
  /<section id="up-next-section" class="hidden card"/g,
  '<section id="up-next-section" class="hidden"'
);

html = html.replace(
  /<section class="classes-section card"/g,
  '<section class="classes-section"'
);

html = html.replace(
  /<section class="completed-Assessments-section card"/g,
  '<section class="completed-Assessments-section"'
);

fs.writeFileSync('dashboard.html', html);
console.log('Updated dashboard.html card inline styles and removed double borders');
