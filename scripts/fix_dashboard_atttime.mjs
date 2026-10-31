import fs from 'fs';
import path from 'path';

console.log('=== FIXING DASHBOARD attTime REFERENCE ERROR & BUMPING CACHE BUSTER ===');

// 1. PATCH js/dashboard.js
const dashPath = path.resolve('js/dashboard.js');
let dashJs = fs.readFileSync(dashPath, 'utf8');

// Fix attTime in attempts.forEach
const targetLoop = `        const rawPct = parseFloat(att.percentage || 0);
        const isRem = Boolean(att.is_remedial_unlocked || att.is_remedial);
        const effPct = isRem ? Math.min(rawPct, 60.0) : rawPct;

        if (allBestMap[uniqueKey] == null || effPct > allBestMap[uniqueKey]) {`;

const replLoop = `        const rawPct = parseFloat(att.percentage || 0);
        const isRem = Boolean(att.is_remedial_unlocked || att.is_remedial);
        const effPct = isRem ? Math.min(rawPct, 60.0) : rawPct;
        const attTime = new Date(att.submitted_at || att.created_at || 0).getTime();

        if (allBestMap[uniqueKey] == null || effPct > allBestMap[uniqueKey]) {`;

if (dashJs.includes(targetLoop)) {
  dashJs = dashJs.replace(targetLoop, replLoop);
  console.log('✓ Fixed missing attTime declaration in js/dashboard.js');
} else {
  const normDash = dashJs.replace(/\r\n/g, '\n');
  const normTarget = targetLoop.replace(/\r\n/g, '\n');
  const normRepl = replLoop.replace(/\r\n/g, '\n');
  if (normDash.includes(normTarget)) {
    dashJs = normDash.replace(normTarget, normRepl);
    console.log('✓ Fixed missing attTime declaration in js/dashboard.js (normalized)');
  } else {
    console.error('❌ Could not locate targetLoop in js/dashboard.js');
  }
}

// Add Paired Theme Exam Remedial Synchronization in student view
const targetRemCheck = `          for (const Test of sortedTests) {
            const best      = bestByTest[Test.id];
            const inProg    = inProgByTest[Test.id];
            const isRem       = Boolean(best && (best.is_remedial_unlocked || best.is_remedial));`;

const replRemCheck = `          for (const Test of sortedTests) {
            const best      = bestByTest[Test.id];
            const inProg    = inProgByTest[Test.id];
            // Rule 2.10: Paired Theme Exam Remedial Synchronization ("Satu Paket")
            let hasThemeRemedial = false;
            if (isExam(Test)) {
              const rawTheme = Test.payload?.theme_code || (Test.shell_code ? Test.shell_code.replace(/^[0-9]+/, '').charAt(0) : 'A');
              const tc = (rawTheme || 'A').toUpperCase();
              const siblingExams = sortedTests.filter(t => isExam(t) && ((t.payload?.theme_code || (t.shell_code ? t.shell_code.replace(/^[0-9]+/, '').charAt(0) : 'A')).toUpperCase() === tc));
              hasThemeRemedial = siblingExams.some(sTest => {
                const sBest = bestByTest[sTest.id];
                return Boolean(sBest && (sBest.is_remedial_unlocked || sBest.is_remedial));
              });
            }
            const isRem       = hasThemeRemedial || Boolean(best && (best.is_remedial_unlocked || best.is_remedial));`;

if (dashJs.includes(targetRemCheck)) {
  dashJs = dashJs.replace(targetRemCheck, replRemCheck);
  console.log('✓ Added paired theme exam remedial sync in student dashboard assessment loop');
} else {
  const normDash = dashJs.replace(/\r\n/g, '\n');
  const normTarget = targetRemCheck.replace(/\r\n/g, '\n');
  const normRepl = replRemCheck.replace(/\r\n/g, '\n');
  if (normDash.includes(normTarget)) {
    dashJs = normDash.replace(normTarget, normRepl);
    console.log('✓ Added paired theme exam remedial sync in student dashboard assessment loop (normalized)');
  }
}

fs.writeFileSync(dashPath, dashJs, 'utf8');

// 2. PATCH dashboard.html cache buster
const dashHtmlPath = path.resolve('dashboard.html');
let dashHtml = fs.readFileSync(dashHtmlPath, 'utf8');
dashHtml = dashHtml.replace(/dashboard\.js\?v=[^"']+/g, 'dashboard.js?v=20261031_v61');
fs.writeFileSync(dashHtmlPath, dashHtml, 'utf8');
console.log('✓ Bumped cache buster in dashboard.html to v=20261031_v61');

console.log('=== FIX COMPLETE ===');

