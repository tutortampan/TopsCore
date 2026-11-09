import fs from 'fs';

// 1. Patch js/dashboard.js
let dash = fs.readFileSync('js/dashboard.js', 'utf8');

// Patch 1: Remove isPrereqForgiven in first block
dash = dash.replace(
  /const isPrereqForgiven = Boolean\([\s\S]*?\);\s*prereqMet = isPrereqForgiven \|\| \(prereqPct !== null && prereqPct >= pMinScore\);/,
  'prereqMet = (prereqPct !== null && prereqPct >= pMinScore);'
);

// Patch 2: Remove isWordsForgiven in first block
dash = dash.replace(
  /const isWordsForgiven = Boolean\([\s\S]*?\);\s*if \(!isWordsForgiven && \(wPct === null \|\| wPct < wMin\)\) \{/,
  'if (wPct === null || wPct < wMin) {'
);

// Patch 3: In dynamic theme quizzes & sequential words exam, let isSessLive grant access directly
const oldBlock = `            const reqScore = asm.prerequisite_min_score || 60;
            for (const quiz of siblingQuizzes) {
              const quizBest = bestByTest[quiz.id];
              const quizPct = quizBest ? parseFloat(quizBest.percentage || 0) : null;
              const isQuizForgiven = Boolean(
                (quiz.payload?.forgiven_student_ids || []).includes(session?.student_id) ||
                (asm.payload?.forgiven_student_ids || []).includes(session?.student_id) ||
                quizBest?.is_forgiven ||
                quizBest?.grade === 'F'
              );
              if (!isQuizForgiven && (quizPct === null || quizPct < reqScore)) {
                prereqMet = false;
                prereqTitle = \`All Theme Quizzes (Required: ≥\${reqScore}%)\`;
                break;
              }
            }
          }

          // Sequential Intra-Theme Exam Prerequisite: Phrases Exam requires sibling Words Exam >= 60%
          // Note: If tutor has actively unlocked a live test session for this student, access is authorized by tutor!
          const liveSess = (asm.payload?.test_session);
          const isSessLive = liveSess?.status === 'UNLOCKED' &&
            (!liveSess.auto_close_at || new Date(liveSess.auto_close_at) > new Date()) &&
            (!Array.isArray(liveSess.allowed_student_ids) || liveSess.allowed_student_ids.length === 0 || liveSess.allowed_student_ids.includes(session?.student_id || session?.id));

          const isPhrasesExam = isExam(asm) && Boolean(
            asm.category === 'phrases' || asm.test_subtype === 'PHRASE_EXAM' ||
            (asm.title || '').toLowerCase().includes('phrase') ||
            (asm.shell_code || '').toUpperCase().includes('PHRASE') ||
            (asm.payload?.subtype || '').toUpperCase().includes('PHRASE')
          );
          if (isSessLive) {
            prereqMet = true;
          } else if (prereqMet && isPhrasesExam) {
            const siblingWordsExam = tests.find(a => 
              a.id !== asm.id &&
              isExam(a) &&
              a.level_id === asm.level_id &&
              a.class_id === asm.class_id &&
              (
                (themeCode && a.payload?.theme_code === themeCode) ||
                (!themeCode && (a.title || '').substring(0, 3).toLowerCase() === (asm.title || '').substring(0, 3).toLowerCase())
              ) &&
              (
                a.category === 'words' || a.test_subtype === 'VOCAB_EXAM' ||
                (a.title || '').toLowerCase().includes('word') ||
                (a.shell_code || '').toUpperCase().includes('WORD') ||
                (a.payload?.subtype || '').toUpperCase().includes('WORD')
              )
            );
            if (siblingWordsExam) {
              const wBest = bestByTest[siblingWordsExam.id];
              const wRawPct = wBest ? parseFloat(wBest.percentage || 0) : null;
              const wRem = Boolean(wBest && (wBest.is_remedial_unlocked || wBest.is_remedial));
              const wPct = wRem && wRawPct !== null ? Math.min(wRawPct, 60.0) : wRawPct;
              const wMin = siblingWordsExam.minimum_required_score || siblingWordsExam.pass_threshold || 60;
              const isWordsForgiven = Boolean(
                (siblingWordsExam.payload?.forgiven_student_ids || []).includes(session?.student_id || session?.id) ||
                (asm.payload?.forgiven_student_ids || []).includes(session?.student_id || session?.id) ||
                wBest?.is_forgiven ||
                wBest?.grade === 'F'
              );
              if (!isWordsForgiven && (wPct === null || wPct < wMin)) {
                prereqMet = false;
                prereqTitle = \`\${siblingWordsExam.display_name || siblingWordsExam.title || 'Words Exam'} (Score ≥\${wMin}% required)\`;
              }
            }
          }`;

const newBlock = `          // Sequential Intra-Theme Exam Prerequisite: Phrases Exam requires sibling Words Exam >= 60%
          // Note: If tutor has actively unlocked a live test session for this student, access is authorized by tutor!
          const liveSess = (asm.payload?.test_session);
          const isSessLive = liveSess?.status === 'UNLOCKED' &&
            (!liveSess.auto_close_at || new Date(liveSess.auto_close_at) > new Date()) &&
            (!Array.isArray(liveSess.allowed_student_ids) || liveSess.allowed_student_ids.length === 0 || liveSess.allowed_student_ids.includes(session?.student_id || session?.id));

          if (isSessLive) {
            prereqMet = true;
          } else {
            const reqScore = asm.prerequisite_min_score || 60;
            for (const quiz of siblingQuizzes) {
              const quizBest = bestByTest[quiz.id];
              const quizPct = quizBest ? parseFloat(quizBest.percentage || 0) : null;
              if (quizPct === null || quizPct < reqScore) {
                prereqMet = false;
                prereqTitle = \`All Theme Quizzes (Required: ≥\${reqScore}%)\`;
                break;
              }
            }

            const isPhrasesExam = isExam(asm) && Boolean(
              asm.category === 'phrases' || asm.test_subtype === 'PHRASE_EXAM' ||
              (asm.title || '').toLowerCase().includes('phrase') ||
              (asm.shell_code || '').toUpperCase().includes('PHRASE') ||
              (asm.payload?.subtype || '').toUpperCase().includes('PHRASE')
            );
            if (prereqMet && isPhrasesExam) {
              const siblingWordsExam = tests.find(a => 
                a.id !== asm.id &&
                isExam(a) &&
                a.level_id === asm.level_id &&
                a.class_id === asm.class_id &&
                (
                  (themeCode && a.payload?.theme_code === themeCode) ||
                  (!themeCode && (a.title || '').substring(0, 3).toLowerCase() === (asm.title || '').substring(0, 3).toLowerCase())
                ) &&
                (
                  a.category === 'words' || a.test_subtype === 'VOCAB_EXAM' ||
                  (a.title || '').toLowerCase().includes('word') ||
                  (a.shell_code || '').toUpperCase().includes('WORD') ||
                  (a.payload?.subtype || '').toUpperCase().includes('WORD')
                )
              );
              if (siblingWordsExam) {
                const wBest = bestByTest[siblingWordsExam.id];
                const wRawPct = wBest ? parseFloat(wBest.percentage || 0) : null;
                const wRem = Boolean(wBest && (wBest.is_remedial_unlocked || wBest.is_remedial));
                const wPct = wRem && wRawPct !== null ? Math.min(wRawPct, 60.0) : wRawPct;
                const wMin = siblingWordsExam.minimum_required_score || siblingWordsExam.pass_threshold || 60;
                if (wPct === null || wPct < wMin) {
                  prereqMet = false;
                  prereqTitle = \`\${siblingWordsExam.display_name || siblingWordsExam.title || 'Words Exam'} (Score ≥\${wMin}% required)\`;
                }
              }
            }
          }`;

dash = dash.replace(oldBlock, newBlock);
fs.writeFileSync('js/dashboard.js', dash, 'utf8');
console.log('js/dashboard.js patched successfully!');

// 2. Patch supabase/functions/start-test/index.ts
let fn = fs.readFileSync('supabase/functions/start-test/index.ts', 'utf8');

// Patch 1: Line 148 isPrereqForgiven
fn = fn.replace(
  /const isPrereqForgiven = Boolean\([\s\S]*?\);\s*const hasPassed = isPrereqForgiven \|\| \(prereqAttempts && prereqAttempts\.some\(\(a: any\) => \(a\.effective_score \|\| a\.percentage \|\| 0\) >= reqScore\)\);/,
  'const hasPassed = Boolean(prereqAttempts && prereqAttempts.some((a: any) => (a.effective_score || a.percentage || 0) >= reqScore));'
);

// Patch 2: Line 303 siblingQuizzes passedQuizIds
fn = fn.replace(
  /const passedQuizIds = new Set\(\);\s*siblingQuizzes\.forEach\(\(sq: any\) => \{\s*if \(sq\.payload\?\.forgiven_student_ids\?\.includes\(student_id\)\) \{\s*passedQuizIds\.add\(sq\.id\);\s*\}\s*\}\);/,
  'const passedQuizIds = new Set();'
);

// Patch 3: Line 362 isWordsForgiven
fn = fn.replace(
  /const isWordsForgiven = Boolean\(wordsExam\.payload\?\.forgiven_student_ids\?\.includes\(student_id\) \|\| test\.payload\?\.forgiven_student_ids\?\.includes\(student_id\)\);\s*const hasPassedWords = isWordsForgiven \|\| \(wordsAttempts \|\| \[\]\)\.some\(\(att: any\) => \{/,
  'const hasPassedWords = (wordsAttempts || []).some((att: any) => {'
);

fs.writeFileSync('supabase/functions/start-test/index.ts', fn, 'utf8');
console.log('supabase/functions/start-test/index.ts patched successfully!');

