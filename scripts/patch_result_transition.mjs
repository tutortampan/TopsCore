import fs from 'fs';

const filePath = 'js/result.js';
let content = fs.readFileSync(filePath, 'utf-8');

const target = `        // Theme Exam Pair Transition: If nextTest is Words Exam but student already has an attempt on it,
        // and sibling Phrases Exam has NO attempt yet, prioritize Phrases Exam so the student
        // completes both parts of the theme exam package!
        if (nextTest && isExam(nextTest) && bestMap[nextTest.id] != null) {
          const tc = nextTest.payload?.theme_code;
          const siblingPhrase = published.find(a =>
            a.id !== nextTest.id && isExam(a) &&
            (tc ? a.payload?.theme_code === tc : (a.title || '').substring(0, 3).toLowerCase() === (nextTest.title || '').substring(0, 3).toLowerCase()) &&
            (a.category === 'phrases' || a.test_subtype === 'PHRASE_EXAM' || (a.title || '').toLowerCase().includes('phrase') || (a.shell_code || '').toUpperCase().includes('PHRASE')) &&
            bestMap[a.id] == null
          );
          if (siblingPhrase) {
            nextTest = siblingPhrase;
          }
        }`;

const replacement = `        // Phase 298: Component Smart Peer Transition (Words vs Phrases)
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
        }`;

// Normalize line endings for replacement
const normalizedContent = content.replace(/\r\n/g, '\n');
const normalizedTarget = target.replace(/\r\n/g, '\n');

if (!normalizedContent.includes(normalizedTarget)) {
  console.error("Target NOT found in js/result.js!");
  process.exit(1);
}

const newContent = normalizedContent.replace(normalizedTarget, replacement);
fs.writeFileSync(filePath, newContent.replace(/\n/g, '\r\n'), 'utf-8');
console.log("Successfully patched js/result.js!");
