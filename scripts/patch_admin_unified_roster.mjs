import fs from 'fs';

const filePath = 'js/admin/app.js';
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add import for computeUnifiedScore & computeTopicPassLevel
if (!content.includes('computeUnifiedScore')) {
  content = content.replace(
    "import { escapeHtml, escHtml, showToast, showLoading, hideLoading, getGrade, calculateGrade, getGradeColorByScore, getGradeColor, getGradeSymbol, GRADE_PALETTE, TOPSCORE_COLORS, isExam, isWeeklyExam, computeMilestoneExamMastery } from '../app.js?v=20261103_v105';",
    "import { escapeHtml, escHtml, showToast, showLoading, hideLoading, getGrade, calculateGrade, getGradeColorByScore, getGradeColor, getGradeSymbol, GRADE_PALETTE, TOPSCORE_COLORS, isExam, isWeeklyExam, computeMilestoneExamMastery } from '../app.js?v=20261103_v105';\nimport { computeUnifiedScore, computeTopicPassLevel } from '../grading.js?v=20261103_v105';"
  );
}

// 2. Track asmPassCounts in studentsGridData
const targetPassCountHook = `            asmScores[asm.id] = bestAtt ? { ...bestAtt } : null;
          });`;

const replacementPassCountHook = `            asmScores[asm.id] = bestAtt ? { ...bestAtt } : null;

            const submittedAttsForPass = (atts || []).filter(a => {
              const st = String(a.status || '').toLowerCase();
              return ['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(st);
            });
            const maxQForPass = getAsmExpectedMax(asm);
            const passCount = submittedAttsForPass.filter(a => {
              const tq = Number(a.total_questions || maxQForPass);
              const sc = a.score != null ? Math.min(Number(a.score), tq) : 0;
              const pct = tq > 0 ? (sc / tq) * 100 : 0;
              return pct >= 70;
            }).length;
            asmPassCounts[asm.id] = passCount;
          });`;

if (!content.includes('asmPassCounts')) {
  content = content.replace('const rowScoreSortVals = {};', 'const rowScoreSortVals = {};\n          const asmPassCounts = {};');
  content = content.replace(targetPassCountHook, replacementPassCountHook);
  content = content.replace('asmScores,', 'asmScores,\n            asmPassCounts,');
}

// Write intermediate file
fs.writeFileSync(filePath, content, 'utf-8');
console.log("Step 1 & 2 completed in js/admin/app.js!");
