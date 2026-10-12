const fs = require('fs');
const files = ['admin.html', 'dashboard.html', 'index.html', 'result.html', 'assessment.html'];

const duplicateFooterRegex = /<div id="bottom-ad-banner" style="position: fixed; bottom: 0; left: 0; width: 100%; height: 50px; background: #000000; color: #94a3b8; display: flex; align-items: center; justify-content: center; font-size: 0\.8rem; z-index: 10000; font-family: 'Outfit', sans-serif; font-weight: 600;">\s*TopsCore &copy; 2026 \| Created by Mr\. Top\s*<\/div>/g;

files.forEach(file => {
  if (fs.existsSync(file)) {
    let html = fs.readFileSync(file, 'utf8');
    if (html.match(duplicateFooterRegex)) {
      html = html.replace(duplicateFooterRegex, '');
      fs.writeFileSync(file, html);
      console.log('Cleaned duplicate banner in ' + file);
    }
  }
});

let assessHtml = fs.readFileSync('assessment.html', 'utf8');
if (!assessHtml.includes("document.getElementById('progress-text-percent').textContent = Math.round(pct) + '%';")) {
  assessHtml = assessHtml.replace(
    "document.getElementById('assessment-progress-fill').style.width = pct + '%';",
    "document.getElementById('assessment-progress-fill').style.width = pct + '%';\n    const progressTextEl = document.getElementById('progress-text-percent');\n    if (progressTextEl) progressTextEl.textContent = Math.round(pct) + '%';"
  );
  fs.writeFileSync('assessment.html', assessHtml);
  console.log('Fixed progress text in assessment.html');
}
