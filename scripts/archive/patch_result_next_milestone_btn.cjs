const fs = require('fs');
let code = fs.readFileSync('js/result.js', 'utf8');

const targetStr = `        const isTest = isExam(nextTest);

        const nextName = nextTest.title || nextTest.shell_code || 'Next Test';

        if (!isTest) {
          container.innerHTML = \`
            <button class="btn-next-milestone" id="btn-next-milestone" type="button">
              <span class="next-btn-tag">GO TO NEXT ASSESSMENT:</span>
              <span class="next-btn-title">\${escapeHtml(cleanTitle(nextName))} &rarr;</span>
            </button>
          \`;
          document.getElementById('btn-next-milestone').onclick = () => {
            sessionStorage.setItem('topscore_test_id', nextTest.id);
            sessionStorage.removeItem('topscore_attempt_id');
            window.location.href = \`test.html?id=\${nextTest.id}\`;
          };
        } else {
          const activeSession = await fetchActiveTestSession(nextTest.id, batchId).catch(() => null);
          const isUnlocked = activeSession?.is_unlocked === true;
          const isWhitelisted = !activeSession?.allowed_student_ids ||
                                activeSession.allowed_student_ids.length === 0 ||
                                activeSession.allowed_student_ids.includes(targetStudentId);

          if (isUnlocked && isWhitelisted) {
            container.innerHTML = \`
              <button class="btn-next-milestone btn-next-test" id="btn-next-milestone" type="button">
                <span class="next-btn-tag">GO TO NEXT ASSESSMENT:</span>
                <span class="next-btn-title">\${escapeHtml(cleanTitle(nextName))} &rarr;</span>
              </button>
            \`;`;

const newStr = `        const isTest = isExam(nextTest);
        const nextName = nextTest.title || nextTest.shell_code || 'Next Test';
        const gradeColor = getGradeColorByScore(parseFloat(attempt.effective_score ?? attempt.percentage ?? 0));

        if (!isTest) {
          container.innerHTML = \`
            <button class="btn-next-milestone" id="btn-next-milestone" type="button" style="--tier-color: \${gradeColor}; border-color: \${gradeColor}; box-shadow: 0 4px 14px \${gradeColor}55;">
              <span class="next-btn-tag">\${escapeHtml(actionTag)}</span>
              <span class="next-btn-title">\${escapeHtml(cleanTitle(nextName))} &rarr;</span>
            </button>
          \`;
          document.getElementById('btn-next-milestone').onclick = () => {
            sessionStorage.setItem('topscore_test_id', nextTest.id);
            sessionStorage.removeItem('topscore_attempt_id');
            window.location.href = \`test.html?id=\${nextTest.id}\`;
          };
        } else {
          const activeSession = await fetchActiveTestSession(nextTest.id, batchId).catch(() => null);
          const isUnlocked = activeSession?.is_unlocked === true;
          const isWhitelisted = !activeSession?.allowed_student_ids ||
                                activeSession.allowed_student_ids.length === 0 ||
                                activeSession.allowed_student_ids.includes(targetStudentId);

          if (isUnlocked && isWhitelisted) {
            container.innerHTML = \`
              <button class="btn-next-milestone btn-next-test" id="btn-next-milestone" type="button" style="--tier-color: \${gradeColor}; border-color: \${gradeColor}; box-shadow: 0 4px 14px \${gradeColor}55;">
                <span class="next-btn-tag">\${escapeHtml(actionTag)}</span>
                <span class="next-btn-title">\${escapeHtml(cleanTitle(nextName))} &rarr;</span>
              </button>
            \`;`;

const normCode = code.replace(/\r\n/g, '\n');
const normTarget = targetStr.replace(/\r\n/g, '\n');

if (normCode.includes(normTarget)) {
  const updated = normCode.replace(normTarget, newStr.replace(/\r\n/g, '\n'));
  fs.writeFileSync('js/result.js', updated, 'utf8');
  console.log('Patch 2 applied OK');
} else {
  console.error('Target string 2 not found');
}

