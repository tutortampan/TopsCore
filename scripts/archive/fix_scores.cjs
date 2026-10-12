const fs = require('fs');
let html = fs.readFileSync('dashboard.html', 'utf8');

const regex = /let scores = \[\];\r?\n\s+\/\* User requested strictly counting taken assessments \*\/\r?\n\r?\n\s+const completedCount/;
const fix = `let scores = [];
      /* User requested strictly counting taken assessments */
      scores = Object.entries(bestMap)
        .filter(([k]) => !k.endsWith('_locked'))
        .map(([, v]) => parseFloat(v) || 0);

      const completedCount`;

if (regex.test(html)) {
  html = html.replace(regex, fix);
  fs.writeFileSync('dashboard.html', html);
  console.log('Fixed successfully');
} else {
  console.log('Regex did not match!');
}
