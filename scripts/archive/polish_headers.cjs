const fs = require('fs');
let css = fs.readFileSync('css/dashboard.css', 'utf8');

// Update .section-title font size and margins
css = css.replace(
  /\.dashboard-page \.section-title\s*{[^}]*}/g,
  `.dashboard-page .section-title {
  font-size: 1rem;
  font-weight: 800;
  gap: 0.4rem;
  margin-bottom: 6px;
}`
);

// Update section header margins
css = css.replace(
  /\.classes-section \.section-header,\s*\.completed-Assessments-section \.section-header\s*{[^}]*}/g,
  `.classes-section .section-header,
.completed-Assessments-section .section-header,
#up-next-section .section-header {
  margin-bottom: 6px;
}`
);

fs.writeFileSync('css/dashboard.css', css);
console.log('Updated css/dashboard.css');

let html = fs.readFileSync('dashboard.html', 'utf8');
// ensure any inline margin-bottoms on section-titles are also stripped out or replaced to avoid overriding
html = html.replace(/<h2 class=\"section-title d-flex align-center gap-2\" id=\"completed-Assessments-heading\" style=\"margin-bottom:var\(--space-1\);\">/g, '<h2 class="section-title d-flex align-center gap-2" id="completed-Assessments-heading">');
fs.writeFileSync('dashboard.html', html);
console.log('Updated dashboard.html spacing.');
