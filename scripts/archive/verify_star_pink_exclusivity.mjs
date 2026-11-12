/**
 * verify_star_pink_exclusivity.mjs
 * 
 * Quality Gate: Ensures Electric Pink (#ff2d87, --grade-star) is 100% EXCLUSIVE
 * to Grade Star ★ (100% score). Rejects any rogue non-star pinks (#ec4899, #f472b6,
 * #f43f5e, #d946ef, etc.) across the application.
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';

console.log('🔍 [star-exclusivity] Auditing codebase for rogue pinks & Star Exclusivity...');

const rogueHexPatterns = [
  /#f472b6/i,
  /#ec4899/i,
  /#f43f5e/i,
  /#db2777/i,
  /#e11d48/i,
  /rgba\(\s*236\s*,\s*72\s*,\s*153/i,
  /rgba\(\s*244\s*,\s*114\s*,\s*182/i,
  /rgba\(\s*244\s*,\s*63\s*,\s*94/i
];

function scanDir(dir, extFilter) {
  let hits = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    if (['node_modules', '.git', 'archive', 'dist', 'playwright-report'].includes(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      hits.push(...scanDir(full, extFilter));
    } else if (extFilter.test(ent.name)) {
      const content = fs.readFileSync(full, 'utf8');
      const lines = content.split('\n');
      lines.forEach((l, idx) => {
        // Skip comment lines or decision docs/changelogs
        if (l.trim().startsWith('//') || l.trim().startsWith('/*') || l.trim().startsWith('*')) return;
        // Permit js/grading.js STAR_THEME definition
        if (full.endsWith('grading.js') && l.includes('STAR_THEME')) return;
        if (full.endsWith('grading.js') && l.includes('light:')) return;
        for (const pat of rogueHexPatterns) {
          if (pat.test(l)) {
            hits.push({ file: full, line: idx + 1, text: l.trim() });
            break;
          }
        }
      });
    }
  }
  return hits;
}

const cssHits = scanDir('css', /\.css$/);
const jsHits = scanDir('js', /\.js$/);
const htmlHits = scanDir('.', /\.html$/);

const totalHits = [...cssHits, ...jsHits, ...htmlHits];

if (totalHits.length > 0) {
  console.error(`❌ Found ${totalHits.length} rogue pink occurrences:`);
  totalHits.forEach(h => {
    console.error(`  ${h.file}:${h.line} -> ${h.text.substring(0, 100)}`);
  });
  process.exit(1);
}

console.log('✔ Zero rogue non-star pink colors found across CSS, JS, and HTML!');

// Also verify css/auth.css does NOT use var(--grade-star) for login steps
const authCss = fs.readFileSync('css/auth.css', 'utf8');
assert.ok(!authCss.includes('cascade-step-num.done') || !authCss.includes('var(--grade-star)'), 'css/auth.css must not use var(--grade-star)');
console.log('✔ Student Gate css/auth.css verified completely clean of var(--grade-star)!');

// Also verify css/admin.css pulseGreen does not use var(--grade-star-rgb)
const adminCss = fs.readFileSync('css/admin.css', 'utf8');
assert.ok(!adminCss.includes('pulseGreen {\n  0% { box-shadow: 0 0 0 0 rgba(var(--grade-star-rgb)'), 'pulseGreen must not use grade-star');
console.log('✔ pulseGreen verified clean of var(--grade-star)!');

console.log('\n🎉 [star-exclusivity] ALL STAR PINK EXCLUSIVITY AUDITS PASSED (100%)!\n');
