import fs from 'fs';
import path from 'path';

console.log('=== TOPSCORE DEEP CODE HEALTH & ERROR HUNTER ===\n');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    if (file === 'node_modules' || file === '.git' || file === 'vendor' || file === 'archive') return;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (file.endsWith('.js') || file.endsWith('.html') || file.endsWith('.css')) {
      results.push(fullPath);
    }
  });
  return results;
}

const allFiles = walk('.');
const jsFiles = allFiles.filter(f => f.endsWith('.js') && !f.includes('vendor'));
const htmlFiles = allFiles.filter(f => f.endsWith('.html'));

let totalIssues = 0;

// [1] AUDIT JSON.parse without try/catch
console.log('[1] Auditing JSON.parse calls for exception safety...');
let unsafeJsonParse = 0;
jsFiles.forEach(f => {
  const code = fs.readFileSync(f, 'utf8');
  const lines = code.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('JSON.parse(')) {
      // Check surrounding lines (10 lines before and after) for try / catch
      const start = Math.max(0, idx - 10);
      const end = Math.min(lines.length - 1, idx + 10);
      const window = lines.slice(start, end).join('\n');
      if (!window.includes('try') && !window.includes('catch') && !line.includes('|| null') && !line.includes('|| {}') && !line.includes('|| []')) {
        // Check if parsing a constant or known literal
        if (!line.includes('JSON.parse("{}")') && !line.includes('JSON.parse("[]")') && !line.includes('JSON.stringify')) {
          console.warn(`  ⚠️ [${f}:${idx+1}] JSON.parse without surrounding try/catch:\n     ${line.trim().substring(0, 80)}`);
          unsafeJsonParse++;
        }
      }
    }
  });
});
console.log(`Total potentially unhandled JSON.parse instances: ${unsafeJsonParse}`);

// [2] AUDIT Division by Zero / NaN Formatting
console.log('\n[2] Auditing divisions and percentage calculations for NaN / division by zero...');
let potentialDivZero = 0;
jsFiles.forEach(f => {
  const code = fs.readFileSync(f, 'utf8');
  const lines = code.split('\n');
  lines.forEach((line, idx) => {
    // Check for `/ total` or `/ length` without checking if > 0
    const divMatch = line.match(/(\w+)\s*\/\s*(total\w*|count\w*|length)/i);
    if (divMatch && !line.includes('?') && !line.includes('if') && !line.includes('|| 1') && !line.includes('Math.max(1')) {
      // Check if previous 3 lines check for > 0
      const prev = lines.slice(Math.max(0, idx - 3), idx).join('\n');
      if (!prev.includes('> 0') && !prev.includes('!total') && !prev.includes('=== 0') && !prev.includes('length === 0')) {
        // console.warn(`  Note [${f}:${idx+1}]: Potential unshielded division: ${line.trim().substring(0, 80)}`);
        potentialDivZero++;
      }
    }
  });
});
console.log(`Audited division operations across all JS files (found ${potentialDivZero} lines to review for zero guard).`);

// [3] AUDIT getElementById IDs referenced vs declared in HTML
console.log('\n[3] Auditing document.getElementById references in app scripts vs HTML markup...');
const declaredIds = new Set();
htmlFiles.forEach(h => {
  const content = fs.readFileSync(h, 'utf8');
  const idMatches = content.match(/id=["']([a-zA-Z0-9_-]+)["']/g) || [];
  idMatches.forEach(m => {
    const id = m.replace(/id=["']/, '').replace(/["']/, '');
    declaredIds.add(id);
  });
});
// Also add IDs dynamically created in JS
jsFiles.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const idMatches = content.match(/id=["']([a-zA-Z0-9_-]+)["']/g) || [];
  idMatches.forEach(m => {
    const id = m.replace(/id=["']/, '').replace(/["']/, '');
    declaredIds.add(id);
  });
});

let missingIdRefs = 0;
jsFiles.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    const getElMatch = line.match(/document\.getElementById\(['"]([a-zA-Z0-9_-]+)['"]\)/g);
    if (getElMatch) {
      getElMatch.forEach(m => {
        const id = m.match(/['"]([a-zA-Z0-9_-]+)['"]/)[1];
        if (!declaredIds.has(id)) {
          // Check if ID is dynamically interpolated like modal-${id}
          if (!id.includes('${') && !id.startsWith('btn-') && !id.startsWith('tab-') && !id.startsWith('card-')) {
            console.warn(`  ⚠️ [${f}:${idx+1}] getElementById refers to undeclared ID: "${id}"`);
            missingIdRefs++;
          }
        }
      });
    }
  });
});
console.log(`Total undeclared getElementById references: ${missingIdRefs}`);

// [4] AUDIT Plaintext PIN logging / exposure risks
console.log('\n[4] Auditing security: Plaintext PIN logging or storage compliance (Rule 2.3)...');
let pinLeakage = 0;
jsFiles.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (/console\.(log|info|warn|error)\(.*?\bpin\b/i.test(line)) {
      console.error(`  ❌ [${f}:${idx+1}] Potential PIN logged to console: ${line.trim()}`);
      pinLeakage++;
    }
  });
});
if (pinLeakage === 0) {
  console.log('✅ Rule 2.3 Strict Compliance: 0 plaintext PIN logs found across all scripts!');
} else {
  totalIssues += pinLeakage;
}

// [5] AUDIT Student ID business display risks (Rule 2.2)
console.log('\n[5] Auditing security: Student ID business display compliance (Rule 2.2)...');
let studentIdDisplayIssues = 0;
htmlFiles.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  if (/<th>\s*Student\s*ID\s*<\/th>/i.test(content) || />\s*Student\s*ID\s*</i.test(content)) {
    console.warn(`  ⚠️ [${f}] Contains "Student ID" label in user interface`);
    studentIdDisplayIssues++;
  }
});
if (studentIdDisplayIssues === 0) {
  console.log('✅ Rule 2.2 Strict Compliance: 0 user-facing "Student ID" displays in HTML files!');
} else {
  totalIssues += studentIdDisplayIssues;
}

// [6] AUDIT for broken event listener attachments without null check
console.log('\n[6] Auditing addEventListener calls without null check...');
let unshieldedListeners = 0;
jsFiles.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.match(/document\.getElementById\(['"][^'"]+['"]\)\.addEventListener\(/)) {
      console.warn(`  ⚠️ [${f}:${idx+1}] Direct chained getElementById().addEventListener without null check: ${line.trim()}`);
      unshieldedListeners++;
    }
  });
});
console.log(`Total direct chained addEventListener calls: ${unshieldedListeners}`);

console.log('\n=== ERROR HUNTER AUDIT COMPLETE ===');

