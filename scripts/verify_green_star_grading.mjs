import fs from 'fs';
import { calculateGrade, GRADE_PALETTE, TOPSCORE_COLORS, getGradeColor, getGradeColorByScore, getScoreColor, getGradeTheme, getAchievementStatus, getEvaluationColor } from '../js/grading.js';

console.log('=== TEST SUITE: GREEN STAR & UNIFIED COLOR VAULT VERIFICATION ===\n');

let failed = false;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failed = true;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

// 1. Check grading.js logic and tokens
console.log('[1] Checking js/grading.js and TOPSCORE_COLORS Master Vault:');
assert(calculateGrade(100) === '★', "calculateGrade(100) returns '★'");
assert(calculateGrade(105) === '★', "calculateGrade(105) returns '★'");
assert(calculateGrade(95) === 'A', "calculateGrade(95) returns 'A'");
assert(calculateGrade(85) === 'B', "calculateGrade(85) returns 'B'");
assert(calculateGrade(75) === 'C', "calculateGrade(75) returns 'C'");
assert(calculateGrade(50) === 'D', "calculateGrade(50) returns 'D'");
assert(calculateGrade(20) === 'E', "calculateGrade(20) returns 'E'");

// TOPSCORE_COLORS Master Vault verification
assert(TOPSCORE_COLORS.STAR.toLowerCase().startsWith('#00c000'), "TOPSCORE_COLORS.STAR is #00c000ff");
assert(TOPSCORE_COLORS.A.toLowerCase().startsWith('#00c000'), "TOPSCORE_COLORS.A is #00c000ff (Unified with Star)");
assert(TOPSCORE_COLORS.B.toLowerCase().startsWith('#95ff00'), "TOPSCORE_COLORS.B is #95ff00ff (Electric Lime)");
assert(TOPSCORE_COLORS.C === '#FFFF00', "TOPSCORE_COLORS.C is #FFFF00 (Pure Yellow)");
assert(TOPSCORE_COLORS.D === '#FF8C00', "TOPSCORE_COLORS.D is #FF8C00 (Dark Orange)");
assert(TOPSCORE_COLORS.E === '#FF0000', "TOPSCORE_COLORS.E is #FF0000 (Pure Red)");

assert(TOPSCORE_COLORS.CORRECT.toLowerCase().startsWith('#00c000'), "TOPSCORE_COLORS.CORRECT is #00c000ff");
assert(TOPSCORE_COLORS.PARTIAL === '#FFFF00', "TOPSCORE_COLORS.PARTIAL is #FFFF00");
assert(TOPSCORE_COLORS.INCORRECT === '#FF0000', "TOPSCORE_COLORS.INCORRECT is #FF0000");

assert(TOPSCORE_COLORS.TEXT_STAR === '#FFFFFF', "TOPSCORE_COLORS.TEXT_STAR is #FFFFFF");
assert(TOPSCORE_COLORS.TEXT_DARK === '#0F172A', "TOPSCORE_COLORS.TEXT_DARK is #0F172A");

assert(GRADE_PALETTE['★']?.color?.toLowerCase().startsWith('#00c000'), "GRADE_PALETTE['★'].color is #00c000ff");
assert(GRADE_PALETTE.A?.color?.toLowerCase().startsWith('#00c000'), "GRADE_PALETTE.A.color is #00c000ff");
assert(GRADE_PALETTE.B?.color?.toLowerCase().startsWith('#95ff00'), "GRADE_PALETTE.B.color is #95ff00ff");
assert(GRADE_PALETTE.C?.color === '#FFFF00', "GRADE_PALETTE.C.color is #FFFF00");
assert(GRADE_PALETTE.D?.color === '#FF8C00', "GRADE_PALETTE.D.color is #FF8C00");
assert(GRADE_PALETTE.E?.color === '#FF0000', "GRADE_PALETTE.E.color is #FF0000");

assert(getGradeColor('★').toLowerCase().startsWith('#00c000'), "getGradeColor('★') returns #00c000ff");
assert(getGradeColor('A').toLowerCase().startsWith('#00c000'), "getGradeColor('A') returns #00c000ff");
assert(getGradeColor('B').toLowerCase().startsWith('#95ff00'), "getGradeColor('B') returns #95ff00ff");
assert(getGradeColor('C') === '#FFFF00', "getGradeColor('C') returns #FFFF00");
assert(getGradeColor('D') === '#FF8C00', "getGradeColor('D') returns #FF8C00");
assert(getGradeColor('E') === '#FF0000', "getGradeColor('E') returns #FF0000");

assert(getEvaluationColor('correct').toLowerCase().startsWith('#00c000'), "getEvaluationColor('correct') returns #00c000ff");
assert(getEvaluationColor('minor_spelling_error') === '#FFFF00', "getEvaluationColor('minor_spelling_error') returns #FFFF00");
assert(getEvaluationColor('partial') === '#FFFF00', "getEvaluationColor('partial') returns #FFFF00");
assert(getEvaluationColor('incorrect') === '#FF0000', "getEvaluationColor('incorrect') returns #FF0000");

assert(getAchievementStatus('★') === 'EXCELLENT', "getAchievementStatus('★') returns EXCELLENT");
assert(getAchievementStatus('A') === 'VERY GOOD', "getAchievementStatus('A') returns VERY GOOD");

// 2. Check Core Specifications and Guides
console.log('\n[2] Checking Core Documentation & Execution Contracts:');

const agentsMd = fs.readFileSync('AGENTS.md', 'utf-8');
assert(agentsMd.includes('#00c000ff'), "AGENTS.md has Pure Green #00c000ff for Star");
assert(agentsMd.includes('| C | Enough | 60% – 79% | Pure Yellow | `#FFFF00` |'), "AGENTS.md has Pure Yellow #FFFF00 for Grade C");

const antigravityRules = fs.readFileSync('.antigravityrules', 'utf-8');
assert(antigravityRules.includes('SINGLE SOURCE OF TRUTH COLORING'), ".antigravityrules enforces Rule 11 (Single Source of Truth Coloring)");

// 3. Check CSS & JS Client files for Star tier color tokens
console.log('\n[3] Checking CSS & JS Client Files for Grading Consistency:');

const styleCss = fs.readFileSync('css/style.css', 'utf-8');
assert(styleCss.includes('--grade-star: #00c000ff;'), "css/style.css defines --grade-star: #00c000ff");
assert(styleCss.includes('--grade-a: #00c000ff;'), "css/style.css defines --grade-a: #00c000ff");
assert(styleCss.includes('--eval-correct: #00c000ff;'), "css/style.css defines --eval-correct");
assert(styleCss.includes('--eval-partial: #ffff00;'), "css/style.css defines --eval-partial");

const adminCss = fs.readFileSync('css/admin.css', 'utf-8');
assert(adminCss.includes('var(--grade-star)'), "css/admin.css references var(--grade-star)");
assert(adminCss.includes('var(--grade-a)'), "css/admin.css references var(--grade-a)");

const resultJs = fs.readFileSync('js/result.js', 'utf-8');
assert(resultJs.includes('TOPSCORE_COLORS.CORRECT'), "js/result.js uses TOPSCORE_COLORS.CORRECT");
assert(resultJs.includes('TOPSCORE_COLORS.PARTIAL'), "js/result.js uses TOPSCORE_COLORS.PARTIAL");
assert(resultJs.includes('getGradeColorByScore(attemptPct)'), "js/result.js sets dynamic points color via getGradeColorByScore");

console.log('\n======================================================');
if (failed) {
  console.error('❌ ONE OR MORE VERIFICATIONS FAILED');
  process.exit(1);
} else {
  console.log('✅ ALL VERIFICATIONS PASSED SUCCESSFULLY!');
  process.exit(0);
}
