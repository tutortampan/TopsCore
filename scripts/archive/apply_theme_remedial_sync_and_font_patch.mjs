import fs from 'fs';
import path from 'path';

console.log('=== APPLYING THEME REMEDIAL SYNC & ANTI-CROWDING PATCH ===');

// 1. PATCH js/admin/app.js
const appJsPath = path.resolve('js/admin/app.js');
let appJs = fs.readFileSync(appJsPath, 'utf8');

// A. Update student data computation loop in app.js
const targetAppScoresLoop = `          classTests.forEach(asm => {
            const atts = classAttempts.filter(a => (a.test_id || a.Test_id) === asm.id);
            const maxQ = getAsmExpectedMax(asm);
            let bestAtt = null;
            if (atts.length > 0) {
              const submittedAtts = atts.filter(a => {
                const st = String(a.status || '').toLowerCase();
                return ['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(st);
              });
              if (submittedAtts.length > 0) {
                // Rule 2.7: Report card stores HIGHEST valid score (protects students from zero-point auto-close sweeps)
                submittedAtts.sort((x, y) => {
                  const xTotal = Number(x.total_questions || maxQ);
                  const yTotal = Number(y.total_questions || maxQ);
                  const xSc = Math.min(Number(x.score ?? 0), xTotal);
                  const ySc = Math.min(Number(y.score ?? 0), yTotal);
                  const scoreDiff = ySc - xSc;
                  if (scoreDiff !== 0) return scoreDiff;
                  const pctDiff = Number(y.percentage ?? 0) - Number(x.percentage ?? 0);
                  if (Math.abs(pctDiff) > 0.01) return pctDiff;
                  return new Date(y.submitted_at || y.created_at || 0) - new Date(x.submitted_at || x.created_at || 0);
                });
                const topAtt = submittedAtts[0];
                const markedBest = submittedAtts.find(a => a.is_best_score === true);
                if (markedBest && Math.min(Number(markedBest.score ?? 0), Number(markedBest.total_questions || maxQ)) >= Math.min(Number(topAtt.score ?? 0), Number(topAtt.total_questions || maxQ)) && Number(markedBest.percentage ?? 0) >= Number(topAtt.percentage ?? 0) - 0.01) {
                  bestAtt = markedBest;
                } else {
                  bestAtt = topAtt;
                }
              } else {
                bestAtt = atts[0];
              }
            }

            asmScores[asm.id] = bestAtt;
            const totalQ = Number(bestAtt?.total_questions || maxQ);
            const rawEarned = bestAtt?.score != null ? Math.min(Number(bestAtt.score), totalQ) : 0;
            const rawPct = bestAtt ? (bestAtt.percentage != null ? Number(bestAtt.percentage) : (totalQ > 0 ? (rawEarned / totalQ) * 100 : 0)) : -1;

            const isRem = Boolean(bestAtt?.is_remedial_unlocked || bestAtt?.is_remedial);
            const maxRemPts = totalQ * 0.6;
            const effEarned = isRem ? Math.min(rawEarned, maxRemPts) : rawEarned;
            const effPct = isRem ? Math.min(rawPct, 60.0) : rawPct;

            rowScoreSortVals[\`test_\${asm.id}\`] = bestAtt ? effEarned : -1;
            rowScoreSortVals[\`test_\${asm.id}_pts\`] = bestAtt ? effEarned : -1;
            rowScoreSortVals[\`test_\${asm.id}_pct\`] = bestAtt ? effPct : -1;

            if (bestAtt) {
              const st = String(bestAtt.status || '').toLowerCase();
              if (['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(st)) {
                completedCount++;
                if (isWeeklyExam(asm)) {
                  studentExamEntries.push({
                    test: asm,
                    effPoints: effEarned,
                    effPct,
                    totalQ
                  });
                }
              }
            }
          });`;

const replacementAppScoresLoop = `          // Step 1: Map best attempt per activity
          classTests.forEach(asm => {
            const atts = classAttempts.filter(a => (a.test_id || a.Test_id) === asm.id);
            const maxQ = getAsmExpectedMax(asm);
            let bestAtt = null;
            if (atts.length > 0) {
              const submittedAtts = atts.filter(a => {
                const st = String(a.status || '').toLowerCase();
                return ['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(st);
              });
              if (submittedAtts.length > 0) {
                // Rule 2.7: Report card stores HIGHEST valid score (protects students from zero-point auto-close sweeps)
                submittedAtts.sort((x, y) => {
                  const xTotal = Number(x.total_questions || maxQ);
                  const yTotal = Number(y.total_questions || maxQ);
                  const xSc = Math.min(Number(x.score ?? 0), xTotal);
                  const ySc = Math.min(Number(y.score ?? 0), yTotal);
                  const scoreDiff = ySc - xSc;
                  if (scoreDiff !== 0) return scoreDiff;
                  const pctDiff = Number(y.percentage ?? 0) - Number(x.percentage ?? 0);
                  if (Math.abs(pctDiff) > 0.01) return pctDiff;
                  return new Date(y.submitted_at || y.created_at || 0) - new Date(x.submitted_at || x.created_at || 0);
                });
                const topAtt = submittedAtts[0];
                const markedBest = submittedAtts.find(a => a.is_best_score === true);
                if (markedBest && Math.min(Number(markedBest.score ?? 0), Number(markedBest.total_questions || maxQ)) >= Math.min(Number(topAtt.score ?? 0), Number(topAtt.total_questions || maxQ)) && Number(markedBest.percentage ?? 0) >= Number(topAtt.percentage ?? 0) - 0.01) {
                  bestAtt = markedBest;
                } else {
                  bestAtt = topAtt;
                }
              } else {
                bestAtt = atts[0];
              }
            }

            asmScores[asm.id] = bestAtt ? { ...bestAtt } : null;
          });

          // Step 2: Rule 2.10 Paired Theme Exam Remedial Synchronization ("Satu Paket")
          // In each theme (A, B, C, D), Words Exam and Phrases Exam are one package.
          // If either is remedial, BOTH are synchronized as remedial.
          const themeExamMap = {};
          classTests.filter(isWeeklyExam).forEach(asm => {
            const rawTheme = asm.payload?.theme_code || (asm.shell_code ? asm.shell_code.replace(/^[0-9]+/, '').charAt(0) : 'A');
            const tc = (rawTheme || 'A').toUpperCase();
            if (!themeExamMap[tc]) themeExamMap[tc] = [];
            themeExamMap[tc].push(asm);
          });
          Object.values(themeExamMap).forEach(asms => {
            if (asms.length < 2) return;
            const hasThemeRem = asms.some(asm => {
              const att = asmScores[asm.id];
              return Boolean(att?.is_remedial_unlocked || att?.is_remedial);
            });
            if (hasThemeRem) {
              asms.forEach(asm => {
                const att = asmScores[asm.id];
                if (att) {
                  att.is_remedial_unlocked = true;
                  att.is_remedial = true;
                }
              });
            }
          });

          // Step 3: Compute effective scores, completion, and sort values
          classTests.forEach(asm => {
            const bestAtt = asmScores[asm.id];
            const maxQ = getAsmExpectedMax(asm);
            const totalQ = Number(bestAtt?.total_questions || maxQ);
            const rawEarned = bestAtt?.score != null ? Math.min(Number(bestAtt.score), totalQ) : 0;
            const rawPct = bestAtt ? (bestAtt.percentage != null ? Number(bestAtt.percentage) : (totalQ > 0 ? (rawEarned / totalQ) * 100 : 0)) : -1;

            const isRem = Boolean(bestAtt?.is_remedial_unlocked || bestAtt?.is_remedial);
            const maxRemPts = totalQ * 0.6;
            const effEarned = isRem ? Math.min(rawEarned, maxRemPts) : rawEarned;
            const effPct = isRem ? Math.min(rawPct, 60.0) : rawPct;

            rowScoreSortVals[\`test_\${asm.id}\`] = bestAtt ? effEarned : -1;
            rowScoreSortVals[\`test_\${asm.id}_pts\`] = bestAtt ? effEarned : -1;
            rowScoreSortVals[\`test_\${asm.id}_pct\`] = bestAtt ? effPct : -1;

            if (bestAtt) {
              const st = String(bestAtt.status || '').toLowerCase();
              if (['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(st)) {
                completedCount++;
                if (isWeeklyExam(asm)) {
                  studentExamEntries.push({
                    test: asm,
                    effPoints: effEarned,
                    effPct,
                    totalQ
                  });
                }
              }
            }
          });`;

if (appJs.includes(targetAppScoresLoop)) {
  appJs = appJs.replace(targetAppScoresLoop, replacementAppScoresLoop);
  console.log('✓ Successfully patched student score loop in app.js');
} else {
  console.warn('⚠️ Could not find exact targetAppScoresLoop in app.js, checking with normalized line endings...');
  const normAppJs = appJs.replace(/\r\n/g, '\n');
  const normTarget = targetAppScoresLoop.replace(/\r\n/g, '\n');
  const normRepl = replacementAppScoresLoop.replace(/\r\n/g, '\n');
  if (normAppJs.includes(normTarget)) {
    appJs = normAppJs.replace(normTarget, normRepl);
    console.log('✓ Successfully patched student score loop in app.js (normalized)');
  } else {
    console.error('❌ Failed to locate targetAppScoresLoop in app.js');
  }
}

// B. Update renderAttendanceGridMatrix theme calculation
const targetThemeLoop = `              studentsGridData.forEach(row => {
                let themeEarned = 0;
                let hasAtt = false;
                let studentThemeMaxQ = 0;

                targetAsms.forEach(asm => {
                  const att = row.asmScores?.[asm.id];
                  const fallbackMax = getAsmExpectedMax(asm);
                  if (att) {
                    const st = String(att.status || '').toLowerCase();
                    if (['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(st)) {
                      hasAtt = true;
                      const isRem = Boolean(att.is_remedial_unlocked || att.is_remedial);
                      const totalQ = Number(att.total_questions || fallbackMax);
                      studentThemeMaxQ += totalQ;
                      const sc = att.score != null ? Math.min(Number(att.score), totalQ) : 0;
                      const maxRemPts = totalQ * 0.6;
                      const effSc = isRem ? Math.min(sc, maxRemPts) : sc;
                      themeEarned += effSc;
                      return;
                    }
                  }
                  // Package rule: unattempted exam adds its expected questions to the package denominator
                  studentThemeMaxQ += fallbackMax;
                });`;

const replacementThemeLoop = `              studentsGridData.forEach(row => {
                let themeEarned = 0;
                let hasAtt = false;
                let studentThemeMaxQ = 0;

                // Rule 2.10: Paired Theme Exam Remedial Synchronization ("Satu Paket")
                const hasThemeRem = targetAsms.some(asm => {
                  const att = row.asmScores?.[asm.id];
                  return Boolean(att?.is_remedial_unlocked || att?.is_remedial);
                });

                targetAsms.forEach(asm => {
                  const att = row.asmScores?.[asm.id];
                  const fallbackMax = getAsmExpectedMax(asm);
                  if (att) {
                    const st = String(att.status || '').toLowerCase();
                    if (['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(st)) {
                      hasAtt = true;
                      const isRem = hasThemeRem || Boolean(att.is_remedial_unlocked || att.is_remedial);
                      const totalQ = Number(att.total_questions || fallbackMax);
                      studentThemeMaxQ += totalQ;
                      const sc = att.score != null ? Math.min(Number(att.score), totalQ) : 0;
                      const maxRemPts = totalQ * 0.6;
                      const effSc = isRem ? Math.min(sc, maxRemPts) : sc;
                      themeEarned += effSc;
                      return;
                    }
                  }
                  // Package rule: unattempted exam adds its expected questions to the package denominator
                  studentThemeMaxQ += fallbackMax;
                });`;

if (appJs.includes(targetThemeLoop)) {
  appJs = appJs.replace(targetThemeLoop, replacementThemeLoop);
  console.log('✓ Successfully patched theme calculation loop in app.js');
} else {
  const normAppJs = appJs.replace(/\r\n/g, '\n');
  const normTarget = targetThemeLoop.replace(/\r\n/g, '\n');
  const normRepl = replacementThemeLoop.replace(/\r\n/g, '\n');
  if (normAppJs.includes(normTarget)) {
    appJs = normAppJs.replace(normTarget, normRepl);
    console.log('✓ Successfully patched theme calculation loop in app.js (normalized)');
  } else {
    console.error('❌ Failed to locate targetThemeLoop in app.js');
  }
}

// C. Update font size calculation and column widths
const targetFontSize = `            const fontSize = Math.min(12.5, Math.max(9.5, rowHeight * 0.44));
            const badgeFont = Math.min(10.5, Math.max(7.5, rowHeight * 0.38));
            const padY = Math.max(0, Math.min(3, Math.floor((rowHeight - 16) / 3)));`;

const replacementFontSize = `            // Anti-crowding: optimize font size and cell padding for Fit Screen mode
            const fontSize = Math.min(10.0, Math.max(7.5, rowHeight * 0.35));
            const badgeFont = Math.min(8.5, Math.max(6.5, rowHeight * 0.28));
            const padY = Math.max(0, Math.min(2, Math.floor((rowHeight - 16) / 4)));`;

if (appJs.includes(targetFontSize)) {
  appJs = appJs.replace(targetFontSize, replacementFontSize);
  console.log('✓ Successfully patched font size calculation in app.js');
} else {
  const normAppJs = appJs.replace(/\r\n/g, '\n');
  const normTarget = targetFontSize.replace(/\r\n/g, '\n');
  const normRepl = replacementFontSize.replace(/\r\n/g, '\n');
  if (normAppJs.includes(normTarget)) {
    appJs = normAppJs.replace(normTarget, normRepl);
    console.log('✓ Successfully patched font size calculation in app.js (normalized)');
  } else {
    console.error('❌ Failed to locate targetFontSize in app.js');
  }
}

// Column widths adjustments
appJs = appJs.replace(/key:\s*`test_\${asm\.id}_pct`,\s*className:\s*'col-asm col-exam col-exam-score',\s*width:\s*'50px'/g,
  "key: `test_${asm.id}_pct`,\n                    className: 'col-asm col-exam col-exam-score',\n                    width: '54px'");

appJs = appJs.replace(/key:\s*`test_\${asm\.id}_pts`,\s*className:\s*'col-asm col-exam col-exam-pts',\s*width:\s*'58px'/g,
  "key: `test_${asm.id}_pts`,\n                    className: 'col-asm col-exam col-exam-pts',\n                    width: '60px'");

appJs = appJs.replace(/key:\s*`theme_\${tc}_score`,\s*className:\s*`col-asm col-exam col-exam-score col-test-theme-score col-test-theme-score-\${tc\.toLowerCase\(\)}`,\s*width:\s*'52px'/g,
  "key: `theme_${tc}_score`,\n                className: `col-asm col-exam col-exam-score col-test-theme-score col-test-theme-score-${tc.toLowerCase()}`,\n                width: '54px'");

appJs = appJs.replace(/key:\s*`theme_\${tc}_total_pts`,\s*className:\s*`col-asm col-exam col-exam-pts col-test-theme-total col-test-theme-total-\${tc\.toLowerCase\(\)}`,\s*width:\s*'58px'/g,
  "key: `theme_${tc}_total_pts`,\n                className: `col-asm col-exam col-exam-pts col-test-theme-total col-test-theme-total-${tc.toLowerCase()}`,\n                width: '60px'");

// Ensure both Score and PTS column renderers check theme remedial
appJs = appJs.replace(/const isRem = Boolean\(att\.is_remedial_unlocked \|\| att\.is_remedial\);(\s*const maxQ = getAsmExpectedMax\(asm\);)/g,
  (match, p1) => {
    return `// Rule 2.10: Theme Exam Remedial Synchronization\n                      const rawTheme = asm.payload?.theme_code || (asm.shell_code ? asm.shell_code.replace(/^[0-9]+/, '').charAt(0) : 'A');\n                      const tc = (rawTheme || 'A').toUpperCase();\n                      const siblingExams = (themeGroups[tc] || []).filter(isWeeklyExam);\n                      const hasThemeRem = siblingExams.some(sAsm => {\n                        const sAtt = row.asmScores?.[sAsm.id];\n                        return Boolean(sAtt?.is_remedial_unlocked || sAtt?.is_remedial);\n                      });\n                      const isRem = hasThemeRem || Boolean(att.is_remedial_unlocked || att.is_remedial);${p1}`;
  });

fs.writeFileSync(appJsPath, appJs, 'utf8');
console.log('✓ app.js written successfully.');

// 2. PATCH js/api.js (adminUnlockRemedialExam)
const apiJsPath = path.resolve('js/api.js');
let apiJs = fs.readFileSync(apiJsPath, 'utf8');

const targetAdminUnlock = `export async function adminUnlockRemedialExam(attemptId) {
  const sb = await getSupabase();
  const { data, error } = await sb.from('attempts')
    .update({ is_remedial_unlocked: true, updated_at: new Date().toISOString() })
    .eq('id', attemptId)
    .select().single();
  if (error) throw error;
  clearAdminCache('attempts');
  return data;
}`;

const replacementAdminUnlock = `export async function adminUnlockRemedialExam(attemptId) {
  const sb = await getSupabase();
  const { data: currentAtt } = await sb.from('attempts').select('id, student_id, test_id, is_remedial_unlocked').eq('id', attemptId).single();
  const { data, error } = await sb.from('attempts')
    .update({ is_remedial_unlocked: true, is_remedial: true, updated_at: new Date().toISOString() })
    .eq('id', attemptId)
    .select().single();
  if (error) throw error;

  // Rule 2.10: Paired Theme Exam Remedial Synchronization ("Satu Paket")
  // If this exam belongs to a theme package, also synchronize its paired sibling exam for this student
  if (currentAtt?.test_id && currentAtt?.student_id) {
    try {
      const { data: currentTest } = await sb.from('tests').select('id, class_id, shell_code, payload').eq('id', currentAtt.test_id).single();
      if (currentTest?.shell_code && currentTest.shell_code.includes('-EXAM')) {
        const rawTheme = currentTest.payload?.theme_code || currentTest.shell_code.replace(/^[0-9]+/, '').charAt(0) || 'A';
        const tc = rawTheme.toUpperCase();
        const { data: siblingTests } = await sb.from('tests')
          .select('id, shell_code, payload')
          .eq('class_id', currentTest.class_id)
          .ilike('shell_code', \`%\${tc}-%-EXAM%\`)
          .neq('id', currentTest.id);

        if (siblingTests && siblingTests.length > 0) {
          for (const sTest of siblingTests) {
            const { data: siblingAtts } = await sb.from('attempts')
              .select('id, score, total_questions')
              .eq('student_id', currentAtt.student_id)
              .eq('test_id', sTest.id);

            if (siblingAtts && siblingAtts.length > 0) {
              for (const sAtt of siblingAtts) {
                const totalQ = Number(sAtt.total_questions || 70);
                const maxRemPts = totalQ * 0.6;
                const effScore = Math.min(Number(sAtt.score ?? 0), maxRemPts);
                await sb.from('attempts')
                  .update({
                    is_remedial_unlocked: true,
                    is_remedial: true,
                    effective_score: effScore,
                    grade: 'C',
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', sAtt.id);
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('[adminUnlockRemedialExam] Sibling exam remedial sync warning:', e);
    }
  }

  clearAdminCache('attempts');
  return data;
}`;

if (apiJs.includes(targetAdminUnlock)) {
  apiJs = apiJs.replace(targetAdminUnlock, replacementAdminUnlock);
  fs.writeFileSync(apiJsPath, apiJs, 'utf8');
  console.log('✓ Successfully patched adminUnlockRemedialExam in js/api.js');
} else {
  const normApiJs = apiJs.replace(/\r\n/g, '\n');
  const normTarget = targetAdminUnlock.replace(/\r\n/g, '\n');
  const normRepl = replacementAdminUnlock.replace(/\r\n/g, '\n');
  if (normApiJs.includes(normTarget)) {
    apiJs = normApiJs.replace(normTarget, normRepl);
    fs.writeFileSync(apiJsPath, apiJs, 'utf8');
    console.log('✓ Successfully patched adminUnlockRemedialExam in js/api.js (normalized)');
  } else {
    console.error('❌ Failed to locate targetAdminUnlock in js/api.js');
  }
}

// 3. PATCH js/admin/tests-management.js (5-Factor Error Diagnostics)
const tmJsPath = path.resolve('js/admin/tests-management.js');
let tmJs = fs.readFileSync(tmJsPath, 'utf8');

// Update diagPcts to include vocab_gap
const targetDiagPcts = `  const totalActiveErrors = Math.max(1, totalGlobalActiveErrors);
  const diagPcts = {
    spelling: Math.round((globalErrorDiagCounts.spelling / totalActiveErrors) * 100),
    literal: Math.round((globalErrorDiagCounts.literal / totalActiveErrors) * 100),
    word_form: Math.round((globalErrorDiagCounts.word_form / totalActiveErrors) * 100)
  };`;

const replacementDiagPcts = `  const totalActiveErrors = Math.max(1, totalGlobalActiveErrors);
  const diagPcts = {
    spelling: Math.round(((globalErrorDiagCounts.spelling || 0) / totalActiveErrors) * 100),
    literal: Math.round(((globalErrorDiagCounts.literal || 0) / totalActiveErrors) * 100),
    word_form: Math.round(((globalErrorDiagCounts.word_form || 0) / totalActiveErrors) * 100),
    vocab_gap: Math.round(((globalErrorDiagCounts.vocab_gap || 0) / totalActiveErrors) * 100)
  };`;

if (tmJs.includes(targetDiagPcts)) {
  tmJs = tmJs.replace(targetDiagPcts, replacementDiagPcts);
} else {
  const normTmJs = tmJs.replace(/\r\n/g, '\n');
  const normTarget = targetDiagPcts.replace(/\r\n/g, '\n');
  const normRepl = replacementDiagPcts.replace(/\r\n/g, '\n');
  if (normTmJs.includes(normTarget)) {
    tmJs = normTmJs.replace(normTarget, normRepl);
  }
}

// Update diagLabels
tmJs = tmJs.replace(
  `      const diagLabels = {\n        spelling: '[🔤 Spelling]',\n        literal: '[🇮🇩 Literal Translation]',\n        word_form: '[🔄 Word Form]'\n      };`,
  `      const diagLabels = {\n        spelling: '[🔤 Spelling]',\n        literal: '[🇮🇩 Literal Translation]',\n        word_form: '[🔄 Word Form]',\n        vocab_gap: '[💡 Vocab Gap]'\n      };`
);

// Update chips HTML
const targetChips = `            <div class="tac-diag-chip chip-wordform" title="Root stem correct, wrong grammatical part of speech">
              <span>🔄</span>
              <span>Word Form:</span>
              <strong>\${globalErrorDiagCounts.word_form} (\${diagPcts.word_form}%)</strong>
            </div>
            <div class="tac-diag-chip chip-timeout" title="Unanswered or timer deadline expired (Session pacing, not student answer)">`;

const replacementChips = `            <div class="tac-diag-chip chip-wordform" title="Root stem correct, wrong grammatical part of speech">
              <span>🔄</span>
              <span>Word Form:</span>
              <strong>\${globalErrorDiagCounts.word_form || 0} (\${diagPcts.word_form || 0}%)</strong>
            </div>
            <div class="tac-diag-chip chip-vocabgap" title="Unrelated English word, unknown phrase, or vocabulary deficit">
              <span>💡</span>
              <span>Vocab Gap:</span>
              <strong>\${globalErrorDiagCounts.vocab_gap || 0} (\${diagPcts.vocab_gap || 0}%)</strong>
            </div>
            <div class="tac-diag-chip chip-timeout" title="Unanswered or timer deadline expired (Session pacing, not student answer)">`;

if (tmJs.includes(targetChips)) {
  tmJs = tmJs.replace(targetChips, replacementChips);
  fs.writeFileSync(tmJsPath, tmJs, 'utf8');
  console.log('✓ Successfully patched tests-management.js for 5-factor chips');
} else {
  const normTmJs = tmJs.replace(/\r\n/g, '\n');
  const normTarget = targetChips.replace(/\r\n/g, '\n');
  const normRepl = replacementChips.replace(/\r\n/g, '\n');
  if (normTmJs.includes(normTarget)) {
    tmJs = normTmJs.replace(normTarget, normRepl);
    fs.writeFileSync(tmJsPath, tmJs, 'utf8');
    console.log('✓ Successfully patched tests-management.js for 5-factor chips (normalized)');
  } else {
    console.error('❌ Failed to locate targetChips in tests-management.js');
  }
}

// 4. PATCH css/admin.css for chip-vocabgap
const adminCssPath = path.resolve('css/admin.css');
let adminCss = fs.readFileSync(adminCssPath, 'utf8');
if (!adminCss.includes('.chip-vocabgap')) {
  adminCss += `\n/* 5-Factor Error Diagnostics: Vocab Gap Chip */\n.tac-diag-chip.chip-vocabgap {\n  background: rgba(168, 85, 247, 0.12) !important;\n  border-color: rgba(168, 85, 247, 0.3) !important;\n  color: #c084fc !important;\n}\n`;
  fs.writeFileSync(adminCssPath, adminCss, 'utf8');
  console.log('✓ Added .chip-vocabgap to css/admin.css');
}

console.log('=== PATCH APPLICATION COMPLETE ===');

