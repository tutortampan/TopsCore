const fs = require('fs');
const path = require('path');

const files = [];
function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'archive', 'dist', 'playwright-report'].includes(ent.name)) continue;
    const f = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(f);
    else if (/\.(css|js|html)$/.test(ent.name) && !f.endsWith('grading.js') && !f.includes('test/')) files.push(f);
  }
}
walk('.');

// Patterns for colors
const gradeHexes = [
  { name: 'STAR_PINK', regex: /#ff2d87|grade-star\b/i },
  { name: 'GRADE_A_GREEN', regex: /#00c000\b|grade-a\b/i },
  { name: 'GRADE_B_LIME', regex: /#95ff00\b|grade-b\b/i },
  { name: 'GRADE_C_YELLOW', regex: /#ffff00\b|grade-c\b|#fde047|#facc15|#eab308|#ffe600/i },
  { name: 'GRADE_D_ORANGE', regex: /#ff8c00\b|grade-d\b|#f97316|#fb923c/i },
  { name: 'GRADE_E_RED', regex: /#ff0000\b|grade-e\b/i }
];

const results = {
  STAR_PINK: [],
  GRADE_A_GREEN: [],
  GRADE_B_LIME: [],
  GRADE_C_YELLOW: [],
  GRADE_D_ORANGE: [],
  GRADE_E_RED: []
};

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((l, idx) => {
    const tr = l.trim();
    if (tr.startsWith('//') || tr.startsWith('/*') || tr.startsWith('*')) return;
    gradeHexes.forEach(gh => {
      if (gh.regex.test(l)) {
        // Check context: is it student grade/result/score or system UI?
        const isAcademicContext = /score|attempt|result|report|grade_circle|grade-circle|badge-grade|grid-grade|letter-grade|ranking|exam-score|quiz-score|avgError|accuracy/i.test(l) ||
                                  /result\.js|result\.html|result\.css/.test(f);
        results[gh.name].push({
          file: f,
          line: idx + 1,
          isAcademic: isAcademicContext,
          text: tr
        });
      }
    });
  });
});

console.log('========================================================');
console.log('TOPSCORE DEEP COLOR AUDIT (ACADEMIC VS SYSTEM UI LEAKAGE)');
console.log('========================================================');

Object.keys(results).forEach(k => {
  const all = results[k];
  const systemLeakage = all.filter(r => !r.isAcademic);
  const academic = all.filter(r => r.isAcademic);
  console.log(`\n▶ ${k}: Total = ${all.length} (Academic = ${academic.length}, System UI Leakage = ${systemLeakage.length})`);
  
  if (systemLeakage.length > 0) {
    console.log(`  --- System UI Leakages (${systemLeakage.length}) ---`);
    // Group by file
    const byFile = {};
    systemLeakage.forEach(s => {
      if (!byFile[s.file]) byFile[s.file] = [];
      byFile[s.file].push(s);
    });
    Object.keys(byFile).forEach(f => {
      console.log(`    📁 ${f} (${byFile[f].length}):`);
      byFile[f].slice(0, 10).forEach(item => {
        console.log(`      L${item.line}: ${item.text.substring(0, 100)}`);
      });
      if (byFile[f].length > 10) console.log(`      ... and ${byFile[f].length - 10} more lines`);
    });
  }
});
