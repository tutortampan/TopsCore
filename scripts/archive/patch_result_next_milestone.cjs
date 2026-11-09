const fs = require('fs');
let code = fs.readFileSync('js/result.js', 'utf8');

const targetStr = `        let nextTest = published.find(a => !isPassed(a));

        // Phase 298: Component Smart Peer Transition (Words vs Phrases)
        const curAsm = attempt.tests || attempt.Tests;
        const curThemeCode = curAsm?.payload?.theme_code || (curAsm?.shell_code ? curAsm.shell_code.replace(/^[0-9]+/, '').charAt(0) : '');
        const curTopicCode = curAsm?.payload?.topic_code != null ? String(curAsm.payload.topic_code) : null;
        const curIsExam = isExam(curAsm);

        if (curThemeCode) {
          if (!curIsExam && curTopicCode) {
            // Task: Sibling component in the same topic needs balancing
            const siblingTask = published.find(a =>
              !isExam(a) &&
              a.id !== curAsm?.id &&
              String(a.payload?.theme_code || '').toUpperCase() === String(curThemeCode).toUpperCase() &&
              String(a.payload?.topic_code || '') === String(curTopicCode)
            );
            if (siblingTask) {
              const siblingPassCount = (allAtts || []).filter(at => at.test_id === siblingTask.id && (parseFloat(at.percentage || 0) >= 70)).length;
              const currentPassCount = (allAtts || []).filter(at => at.test_id === curAsm?.id && (parseFloat(at.percentage || 0) >= 70)).length;
              if (siblingPassCount < currentPassCount || (siblingPassCount < 7 && currentPassCount >= 7)) {
                nextTest = siblingTask;
              }
            }
          } else if (curIsExam) {
            // Exam: Sibling exam in the same theme
            const siblingExam = published.find(a =>
              isExam(a) &&
              a.id !== curAsm?.id &&
              String(a.payload?.theme_code || '').toUpperCase() === String(curThemeCode).toUpperCase()
            );
            if (siblingExam && !isPassed(siblingExam)) {
              nextTest = siblingExam;
            }
          }
        }
        if (!nextTest) {`;

const newStr = `        const curAsm = attempt.tests || attempt.Tests;
        const curThemeCode = curAsm?.payload?.theme_code || (curAsm?.shell_code ? curAsm.shell_code.replace(/^[0-9]+/, '').charAt(0) : '');
        const curTopicCode = curAsm?.payload?.topic_code != null ? String(curAsm.payload.topic_code) : null;
        const curIsExam = isExam(curAsm);

        // Fetch dynamic test system settings for this class (target repetitions & pass threshold)
        const currentClass = (classes || []).find(c => c.id === currentClassId);
        const isVocabClass = currentClass && (
          /vocab/i.test(currentClass.name || '') ||
          (allAssms || []).some(t => t.class_id === currentClassId && (/WORDS|PHRASE/i.test(t.shell_code || '') || /words|phrases/i.test(t.payload?.category || '')))
        );
        const testSettings = currentClassId ? await fetchClassTestSettings(currentClassId).catch(() => null) : null;
        const targetReps = Number(testSettings?.taskRepetitions) || (isVocabClass ? 7 : 1);
        const minScore = Number(testSettings?.taskMinScore) || 70;

        // Current drill pass count & outcome
        const currentPassCount = (allAtts || []).filter(at =>
          at.test_id === curAsm?.id &&
          (parseFloat(at.percentage || 0) >= minScore || parseFloat(at.effective_score || 0) >= minScore)
        ).length;
        const currentAttemptPassed = (parseFloat(attempt.percentage || 0) >= minScore) || (parseFloat(attempt.effective_score || 0) >= minScore);

        let nextTest = null;
        let actionTag = 'GO TO NEXT ASSESSMENT:';

        // 1. REPETITIVE DRILL LOOP: Stay on current task until target repetitions (e.g. 7 passes) are achieved
        if (!curIsExam && targetReps > 1 && currentPassCount < targetReps) {
          nextTest = curAsm;
          if (currentAttemptPassed) {
            actionTag = \`CONTINUE THE DRILL (\${currentPassCount}/\${targetReps}):\`;
          } else {
            actionTag = \`RETRY THE DRILL (\${currentPassCount}/\${targetReps}):\`;
          }
        } else {
          // 2. Current drill completed (or Exam completed): Advance to next sibling task, next topic task, or next exam
          actionTag = 'ADVANCE TO NEXT TASK:';

          if (curThemeCode && !curIsExam && curTopicCode) {
            // Task: Sibling component in same topic (e.g. phrases) needs balancing to target repetitions
            const siblingTask = published.find(a =>
              !isExam(a) &&
              a.id !== curAsm?.id &&
              String(a.payload?.theme_code || '').toUpperCase() === String(curThemeCode).toUpperCase() &&
              String(a.payload?.topic_code || '') === String(curTopicCode)
            );
            if (siblingTask) {
              const siblingPassCount = (allAtts || []).filter(at => at.test_id === siblingTask.id && (parseFloat(at.percentage || 0) >= minScore || parseFloat(at.effective_score || 0) >= minScore)).length;
              if (siblingPassCount < targetReps) {
                nextTest = siblingTask;
              }
            }
          }

          if (!nextTest && curIsExam && curThemeCode) {
            // Exam: Sibling exam in the same theme
            const siblingExam = published.find(a =>
              isExam(a) &&
              a.id !== curAsm?.id &&
              String(a.payload?.theme_code || '').toUpperCase() === String(curThemeCode).toUpperCase()
            );
            if (siblingExam && !isPassed(siblingExam)) {
              nextTest = siblingExam;
            }
          }

          if (!nextTest) {
            // Find next uncompleted test in published list
            nextTest = published.find(a => {
              if (isExam(a)) return !isPassed(a);
              const passes = (allAtts || []).filter(at => at.test_id === a.id && (parseFloat(at.percentage || 0) >= minScore || parseFloat(at.effective_score || 0) >= minScore)).length;
              return passes < targetReps;
            });
          }
        }
        if (!nextTest) {`;

// Normalize line endings for replacement
const normCode = code.replace(/\r\n/g, '\n');
const normTarget = targetStr.replace(/\r\n/g, '\n');

if (normCode.includes(normTarget)) {
  const updated = normCode.replace(normTarget, newStr.replace(/\r\n/g, '\n'));
  fs.writeFileSync('js/result.js', updated, 'utf8');
  console.log('Patch 1 applied OK');
} else {
  console.error('Target string not found in normCode');
}

