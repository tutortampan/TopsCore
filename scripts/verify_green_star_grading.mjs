import fs from 'fs';
import { calculateGrade, GRADE_PALETTE, getGradeColor, getGradeColorByScore, getScoreColor, getGradeTheme, getAchievementStatus } from '../js/grading.js';

console.log('=== TEST SUITE: GREEN STAR TIER (★ / 100%) VERIFICATION ===\n');

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
console.log('[1] Checking js/grading.js:');
assert(calculateGrade(100) === '★', "calculateGrade(100) returns '★'");
assert(calculateGrade(105) === '★', "calculateGrade(105) returns '★'");
assert(calculateGrade(95) === 'A', "calculateGrade(95) returns 'A'");
assert(calculateGrade(85) === 'B', "calculateGrade(85) returns 'B'");
assert(calculateGrade(75) === 'C', "calculateGrade(75) returns 'C'");
assert(calculateGrade(50) === 'D', "calculateGrade(50) returns 'D'");
assert(calculateGrade(20) === 'E', "calculateGrade(20) returns 'E'");

assert(GRADE_PALETTE['★']?.color === '#22C55E', "GRADE_PALETTE['★'].color is #22C55E");
assert(GRADE_PALETTE['★']?.rgb === '34, 197, 94', "GRADE_PALETTE['★'].rgb is '34, 197, 94'");
assert(GRADE_PALETTE['★']?.glow === 'rgba(34, 197, 94, 0.45)', "GRADE_PALETTE['★'].glow matches green RGBA");
assert(GRADE_PALETTE.S?.color === '#22C55E', "GRADE_PALETTE.S alias color is #22C55E");

assert(getGradeColor('★') === '#22C55E', "getGradeColor('★') returns #22C55E");
assert(getGradeColor('S') === '#22C55E', "getGradeColor('S') returns #22C55E");
assert(getGradeColorByScore(100) === '#22C55E', "getGradeColorByScore(100) returns #22C55E");
assert(getScoreColor(100) === '#22C55E', "getScoreColor(100) returns #22C55E");

const themeStar = getGradeTheme('★');
assert(themeStar.color === '#22C55E', "getGradeTheme('★').color is #22C55E");
assert(themeStar.rgb === '34, 197, 94', "getGradeTheme('★').rgb is '34, 197, 94'");

const themeS = getGradeTheme('S');
assert(themeS.color === '#22C55E', "getGradeTheme('S').color is #22C55E");

assert(getAchievementStatus('★') === 'EXCELLENT', "getAchievementStatus('★') returns EXCELLENT");
assert(getAchievementStatus('S') === 'EXCELLENT', "getAchievementStatus('S') returns EXCELLENT");

// 2. Check Core Specifications and Guides
console.log('\n[2] Checking Core Documentation & Execution Contracts:');

const agentsMd = fs.readFileSync('AGENTS.md', 'utf-8');
assert(agentsMd.includes('| ★ | Excellent | 100% | Hijau (Rich Green) | `#22C55E` |'), "AGENTS.md has Green #22C55E in grading table");

const guideMd = fs.readFileSync('ANTIGRAVITY_GUIDE.md', 'utf-8');
assert(guideMd.includes('* `★` (100% - Hijau `#22C55E`)'), "ANTIGRAVITY_GUIDE.md has Hijau #22C55E for Star tier");
assert(!guideMd.includes('★ (100% - Ungu'), "ANTIGRAVITY_GUIDE.md no longer has '★ (100% - Ungu'");

assert(fs.existsSync('ANTIGRAVITY_COMMAND_CENTER.md'), "ANTIGRAVITY_COMMAND_CENTER.md exists on disk");
const cmdCenterMd = fs.readFileSync('ANTIGRAVITY_COMMAND_CENTER.md', 'utf-8');
assert(cmdCenterMd.includes('* `★` (100% - Hijau `#22C55E`)'), "ANTIGRAVITY_COMMAND_CENTER.md has Hijau #22C55E for Star tier");

const prodSpecMd = fs.readFileSync('docs/PRODUCT_SPEC.md', 'utf-8');
assert(prodSpecMd.includes("`★` (100%): \"Excellent\" | Rich Green (`#22C55E`)"), "PRODUCT_SPEC.md has Rich Green #22C55E");

const dbSpecMd = fs.readFileSync('docs/DATABASE.md', 'utf-8');
assert(dbSpecMd.includes("| **★** | Excellent | 100% | Green | `#22C55E` |"), "DATABASE.md has Green #22C55E");

// 3. Check CSS & JS Client files for Star tier color tokens
console.log('\n[3] Checking CSS & JS Client Files for Grading Consistency:');

const styleCss = fs.readFileSync('css/style.css', 'utf-8');
assert(styleCss.includes('.grade-star,') && styleCss.includes('#22C55E'), "css/style.css .grade-star uses #22C55E");

const resultCss = fs.readFileSync('css/result.css', 'utf-8');
assert(resultCss.includes('.pure-stamp.grade-S { color: #22C55E !important;'), "css/result.css pure-stamp uses #22C55E");
assert(resultCss.includes('--tier-color: #22C55E;'), "css/result.css result-identity-card default --tier-color is #22C55E");

const dashCss = fs.readFileSync('css/dashboard.css', 'utf-8');
assert(dashCss.includes('body.dashboard-page #welcome-banner-section[data-tier="★"]'), "css/dashboard.css supports data-tier='★'");
assert(dashCss.includes('rgba(34, 197, 94, 0.45)'), "css/dashboard.css uses rich green glow for Star tier");

const resultJs = fs.readFileSync('js/result.js', 'utf-8');
assert(resultJs.includes("'★': '#22c55e'"), "js/result.js maps '★' to #22c55e");
assert(!resultJs.includes("const colors = ['#fbbf24', '#f59e0b', '#10b981', '#38bdf8', '#ec4899', '#a855f7', '#ffffff']"), "js/result.js confetti does not contain #a855f7");

const dashJs = fs.readFileSync('js/dashboard.js', 'utf-8');
assert(dashJs.includes('starGreenDashGrad'), "js/dashboard.js uses starGreenDashGrad for SVG star vector");

console.log('\n======================================================');
if (failed) {
  console.error('❌ ONE OR MORE VERIFICATIONS FAILED');
  process.exit(1);
} else {
  console.log('✅ ALL VERIFICATIONS PASSED SUCCESSFULLY!');
  process.exit(0);
}
