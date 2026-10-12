const fs = require('fs');
let html = fs.readFileSync('dashboard.html', 'utf8');

// 1. Remove the duplicate block
const duplicateBlockRegex = /var avatarBox = document\.getElementById\('banner-avatar-container'\);\s*if \(avatarBox\) \{\s*var gradePalette = \{ S: '#f59e0b', A: '#10b981', B: '#3b82f6', C: '#f97316', D: '#eab308', E: '#ea580c', F: '#ef4444' \};\s*var targetColor = gradePalette\[overallGrade\] \|\| '#6366f1';\s*avatarBox\.style\.borderColor = targetColor;\s*avatarBox\.style\.boxShadow = `0 8px 24px \$\{targetColor\}40`;\s*\}/;

html = html.replace(duplicateBlockRegex, '');

// 2. Add horizontal line below Student Name (if not already added)
const hrHtml = `\n      <hr style="width: 100%; border: 0; border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 0;">\n`;
if (!html.includes('border-top: 1px solid rgba(255, 255, 255, 0.1)')) {
  html = html.replace(
    /(<h1 id="welcome-name"[^>]+>Student<\/h1>\s*<\/div>)/,
    `$1${hrHtml}`
  );
}

// 3. Fix program name to be Title Case (e.g., CAMP -> Camp)
html = html.replace(
  /const parts = \[\s*session\.institution_name,\s*session\.program_name,/g,
  `const progName = session.program_name ? session.program_name.toLowerCase().replace(/\\b\\w/g, c => c.toUpperCase()) : '';
  const parts = [
    session.institution_name,
    progName,`
);

fs.writeFileSync('dashboard.html', html);
console.log('Fixed syntax error, added divider, and title-cased program name');
