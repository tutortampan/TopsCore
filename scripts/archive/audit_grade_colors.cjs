const fs = require('fs');
const path = require('path');

const gradePatterns = [
  { name: 'STAR (#ff2d87)', regex: /#ff2d87|grade-star/i },
  { name: 'GRADE A (#00c000)', regex: /#00c000|grade-a\b/i },
  { name: 'GRADE B (#95ff00)', regex: /#95ff00|grade-b\b/i },
  { name: 'GRADE C (#ffff00)', regex: /#ffff00|grade-c\b/i },
  { name: 'GRADE D (#ff8c00)', regex: /#ff8c00|grade-d\b/i },
  { name: 'GRADE E (#ff0000)', regex: /#ff0000|grade-e\b/i }
];

function scan(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    if (['node_modules', '.git', 'archive', 'dist', 'playwright-report'].includes(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      results.push(...scan(full));
    } else if (/\.(css|js|html)$/.test(ent.name)) {
      if (full.endsWith('grading.js')) continue;
      const content = fs.readFileSync(full, 'utf8');
      const lines = content.split('\n');
      lines.forEach((l, idx) => {
        const tr = l.trim();
        if (tr.startsWith('//') || tr.startsWith('/*') || tr.startsWith('*')) return;
        for (const gp of gradePatterns) {
          if (gp.regex.test(l)) {
            results.push({ file: full, line: idx + 1, type: gp.name, text: tr });
            break;
          }
        }
      });
    }
  }
  return results;
}

const hits = scan('.');
console.log('Total Grade Color Usages across codebase (excluding grading.js): ' + hits.length);

const byFile = {};
hits.forEach(h => {
  if (!byFile[h.file]) byFile[h.file] = [];
  byFile[h.file].push(h);
});

Object.keys(byFile).sort().forEach(f => {
  console.log('\n--- ' + f + ' (' + byFile[f].length + ' occurrences) ---');
  byFile[f].forEach(h => {
    // Categorize: is it student grade/score related or system UI related?
    console.log('  L' + h.line + ' [' + h.type + ']: ' + h.text.substring(0, 120));
  });
});
