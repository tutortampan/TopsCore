const fs = require('fs');

let html = fs.readFileSync('dashboard.html', 'utf8');

// 1. Clean Badge & Class Redundancy in populateUpNext
// Replace badge HTML block
html = html.replace(
  /const typeStr = nextAssessment\.assessment_type \|\| 'TEST';/g,
  `const rawType = nextAssessment.assessment_type || 'TEST';
          const cleanType = rawType.includes('_') ? rawType.split('_').pop() : rawType;
          const typeStr = cleanType.charAt(0).toUpperCase() + cleanType.slice(1).toLowerCase();`
);

html = html.replace(
  /<span class="badge badge-neutral"[^>]*>\s*\$\{escapeHtml\(className\)\}\s*<\/span>\s*<span class="badge badge-primary"/g,
  `<span class="badge badge-primary"`
);

// 2. Clean Class Redundancy in renderClasses
html = html.replace(
  /<div class="class-name">\$\{session\.level_name \? `\$\{session\.level_name\} - \$\{subj\.name\}` : subj\.name\}<\/div>/g,
  `<div class="class-name">\${subj.name}</div>`
);

// 3. Visual Glow Symmetry
// Need to find #stat-overall-grade-value and #bottom-stat-avg-score and ensure they have the same CSS classes.
// In dashboard.html: id="stat-overall-grade-value"
// Looking at earlier outputs, I'll update css/dashboard.css instead.

// 4. Header Emoji Spacing
// We will replace the titles directly.
html = html.replace(/<h2 class="section-title">ðŸŽ¯ Next Assessment<\/h2>/g, '<h2 class="section-title">ðŸŽ¯<span style="margin-left: 6px;">Next Assessment</span></h2>');
html = html.replace(/<h2 class="section-title">ðŸ“š Classes<\/h2>/g, '<h2 class="section-title">ðŸ“š<span style="margin-left: 6px;">Classes</span></h2>');
html = html.replace(/<h2 class="section-title" id="completed-Assessments-heading">ðŸ“‹ Completed Assessments<\/h2>/g, '<h2 class="section-title" id="completed-Assessments-heading">ðŸ“‹<span style="margin-left: 6px;">Completed Assessments</span></h2>');
html = html.replace(/<h2 class="section-title">ðŸ“‹ Completed Assessments<\/h2>/g, '<h2 class="section-title">ðŸ“‹<span style="margin-left: 6px;">Completed Assessments</span></h2>');

fs.writeFileSync('dashboard.html', html);
console.log('Updated dashboard.html with requested changes');

// CSS updates
let css = fs.readFileSync('css/dashboard.css', 'utf8');

// Ensure completed assessments cards are compact
if (!css.includes('.completed-Assessment-mobile-card')) {
  css += `\n
/* Compact Completed Assessments Cards */
.completed-Assessment-mobile-card {
  padding: 8px 12px !important;
  gap: 4px !important;
  margin-bottom: 8px !important;
}
`;
} else {
  // modify existing
  css = css.replace(/\.completed-Assessment-mobile-card\s*\{[^}]*\}/g, `.completed-Assessment-mobile-card {
  padding: 8px 12px !important;
  gap: 4px !important;
  margin-bottom: 8px !important;
}`);
}

// Add glow symmetry to grade value
if (!css.includes('#stat-overall-grade-value')) {
  css += `\n
#stat-overall-grade-value {
  filter: drop-shadow(0 0 12px rgba(255,255,255,0.4));
  text-shadow: 0 0 20px rgba(255,255,255,0.2);
}
#bottom-stat-avg-score {
  filter: drop-shadow(0 0 12px rgba(255,255,255,0.4));
  text-shadow: 0 0 20px rgba(255,255,255,0.2);
}
`;
}

// Add lighter progress bar track
css += `\n
.dashboard-page .score-bar-wrap {
  background: rgba(255, 255, 255, 0.1) !important;
}
`;

fs.writeFileSync('css/dashboard.css', css);
console.log('Updated css/dashboard.css with requested changes');

