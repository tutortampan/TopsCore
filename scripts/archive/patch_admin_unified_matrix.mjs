import fs from 'fs';

const filePath = 'js/admin/app.js';
let content = fs.readFileSync(filePath, 'utf-8');

// Target region for dynamicSuperHeaders & dynamicAsmCols
const superHeaderTarget = `            if (selectedTheme === 'ALL') {
              sortedActiveThemes.forEach(tc => {
                const tName = themeNames[tc] ? \` (\${themeNames[tc]})\` : '';
                const themeTests = themeGroups[tc] || [];
                // In ALL view: render all individual exams (Word Exam & Phrase Exam, SCORE % + PTS) PLUS Theme Total columns
                const colSpan = (themeTests.length * 2) + 2;
                dynamicSuperHeaders.push({
                  label: \`THEME \${tc}\${tName}\`,
                  colSpan: colSpan,
                  className: themeColorClasses[tc] || \`super-hdr super-hdr-theme super-hdr-theme-\${tc.toLowerCase()}\`
                });
              });
            } else {
              if (themeGroups[selectedTheme] && themeGroups[selectedTheme].length > 0) {
                const tName = themeNames[selectedTheme] ? \` (\${themeNames[selectedTheme]})\` : '';
                const asmsInTheme = themeGroups[selectedTheme];
                // All tasks + tests in theme (exams count for 2, quizzes count for 1), PLUS 2 for Theme Combined Score % & Total Points
                const colSpan = asmsInTheme.reduce((acc, asm) => acc + (isWeeklyExam(asm) ? 2 : 1), 0) + 2;
                dynamicSuperHeaders.push({
                  label: \`THEME \${selectedTheme}\${tName}\`,
                  colSpan: colSpan,
                  className: themeColorClasses[selectedTheme] || \`super-hdr super-hdr-theme super-hdr-theme-\${selectedTheme.toLowerCase()}\`
                });
              }
            }

            // Build dynamic test and exam columns
            const dynamicAsmCols = [];
            sortedActiveThemes.forEach(tc => {
              const asmsInTheme = themeGroups[tc];

              asmsInTheme.forEach(asm => {`;

const superHeaderReplacement = `            const hasPhrasesComponents = classTests.some(a => a.payload?.category === 'phrases' || /PHRASE/i.test(a.shell_code || a.title || ''));

            if (selectedTheme === 'ALL') {
              sortedActiveThemes.forEach(tc => {
                const tName = themeNames[tc] ? \` (\${themeNames[tc]})\` : '';
                const themeTests = themeGroups[tc] || [];
                // In ALL view: Unified Exam (SCR + PTS = 2) + Theme Total (SCR + PTS = 2) = 4 columns
                const colSpan = hasPhrasesComponents ? 4 : ((themeTests.length * 2) + 2);
                dynamicSuperHeaders.push({
                  label: \`THEME \${tc}\${tName}\`,
                  colSpan: colSpan,
                  className: themeColorClasses[tc] || \`super-hdr super-hdr-theme super-hdr-theme-\${tc.toLowerCase()}\`
                });
              });
            } else {
              if (themeGroups[selectedTheme] && themeGroups[selectedTheme].length > 0) {
                const tName = themeNames[selectedTheme] ? \` (\${themeNames[selectedTheme]})\` : '';
                const asmsInTheme = themeGroups[selectedTheme];
                const uniqueTopics = Array.from(new Set(asmsInTheme.filter(a => !isWeeklyExam(a)).map(a => String(a.payload?.topic_code || '1'))));
                // Unified Tasks (1 col per topic) + Unified Exam (2 cols) + Theme Total (2 cols) = uniqueTopics.length + 4
                const colSpan = hasPhrasesComponents
                  ? (uniqueTopics.length + 4)
                  : (asmsInTheme.reduce((acc, asm) => acc + (isWeeklyExam(asm) ? 2 : 1), 0) + 2);
                dynamicSuperHeaders.push({
                  label: \`THEME \${selectedTheme}\${tName}\`,
                  colSpan: colSpan,
                  className: themeColorClasses[selectedTheme] || \`super-hdr super-hdr-theme super-hdr-theme-\${selectedTheme.toLowerCase()}\`
                });
              }
            }

            // Build dynamic test and exam columns
            const dynamicAsmCols = [];
            sortedActiveThemes.forEach(tc => {
              const asmsInTheme = themeGroups[tc];

              if (hasPhrasesComponents) {
                // Phase 298: Unified Columns for 3rd Vocabulary
                // 1. Unified Tasks (Only in specific theme view, not ALL view)
                if (selectedTheme !== 'ALL') {
                  const topicCodes = Array.from(new Set(asmsInTheme.filter(a => !isWeeklyExam(a)).map(a => String(a.payload?.topic_code || '1')))).sort();
                  topicCodes.forEach(topCode => {
                    const wTask = asmsInTheme.find(a => !isWeeklyExam(a) && String(a.payload?.topic_code || '1') === topCode && !(a.payload?.category === 'phrases' || /PHRASE/i.test(a.shell_code || a.title || '')));
                    const pTask = asmsInTheme.find(a => !isWeeklyExam(a) && String(a.payload?.topic_code || '1') === topCode && (a.payload?.category === 'phrases' || /PHRASE/i.test(a.shell_code || a.title || '')));
                    const taskName = \`Theme \${tc} • Topic \${topCode} Task (50 PTS)\`;

                    dynamicAsmCols.push({
                      key: \`unified_\${tc}_\${topCode}_task\`,
                      className: 'col-asm col-task col-unified-task',
                      width: '42px',
                      headerTitle: taskName,
                      title: taskName,
                      label: \`
                        <div class="asm-hdr-cell">
                          <span class="test-num test-num-task" title="\${escapeHtml(taskName)}">\${tc}\${topCode}</span>
                          <span class="test-subtag test-subtag-task" style="color:var(--clr-accent-1, #6366f1); font-weight:700;">50p</span>
                        </div>
                      \`,
                      sortable: true,
                      align: 'center',
                      render: (val, row) => {
                        const wAtt = wTask ? row.asmScores?.[wTask.id] : null;
                        const pAtt = pTask ? row.asmScores?.[pTask.id] : null;
                        const wPass = wTask ? (row.asmPassCounts?.[wTask.id] || 0) : 0;
                        const pPass = pTask ? (row.asmPassCounts?.[pTask.id] || 0) : 0;
                        const topicLevel = typeof computeTopicPassLevel === 'function' ? computeTopicPassLevel(wPass, pPass, true) : Math.min(wPass, pPass);

                        const hasAny = wAtt || pAtt;
                        if (!hasAny) {
                          return '<span class="asm-dot" style="font-size:var(--matrix-font-size, 0.70rem); font-weight:400;" title="Unattempted">&middot;</span>';
                        }
                        const isAnyProgress = (wAtt?.status === 'in_progress') || (pAtt?.status === 'in_progress');
                        if (isAnyProgress) {
                          return \`<span style="color:\${TOPSCORE_COLORS.C}; font-size:calc(var(--matrix-font-size, 0.70rem) * 0.85);" title="In Progress">⏳</span>\`;
                        }

                        const unified = computeUnifiedScore({
                          wordsBest: wAtt,
                          phrasesBest: pAtt,
                          wordsMax: 40,
                          phrasesMax: 10,
                          hasPhrases: true
                        });

                        const attId = wAtt?.id || pAtt?.id || wAtt?.attempt_id || pAtt?.attempt_id;
                        const clickAttr = attId ? \`onclick="window.open('result.html?attempt_id=\${encodeURIComponent(attId)}&admin=1', '_blank'); event.stopPropagation();"\` : '';
                        const cursorStyle = attId ? 'cursor:pointer;' : 'cursor:default;';

                        return \`
                          <span class="asm-score asm-score-task"
                                style="color:\${unified.gradeColor}; \${cursorStyle} font-weight:600; font-size:var(--matrix-font-size, 0.70rem); font-variant-numeric:tabular-nums;"
                                \${clickAttr}
                                title="\${tc}\${topCode} Unified Task&#10;Score: \${unified.percentage}% (\${unified.totalPoints}/50 pts, Grade \${unified.grade})&#10;Words: \${unified.wordsPoints}/40 (\${wPass}/7 passes)&#10;Phrases: \${unified.phrasesPoints}/10 (\${pPass}/7 passes)&#10;Topic Mastery: Level \${topicLevel}/7&#10;Click to view result">
                            \${unified.percentage}%
                          </span>
                        \`;
                      }
                    });
                  });
                }

                // 2. Unified Exam Columns (Words + Phrases Exam: 150 PTS)
                const wExam = asmsInTheme.find(a => isWeeklyExam(a) && !(a.payload?.category === 'phrases' || /PHRASE/i.test(a.shell_code || a.title || '')));
                const pExam = asmsInTheme.find(a => isWeeklyExam(a) && (a.payload?.category === 'phrases' || /PHRASE/i.test(a.shell_code || a.title || '')));
                const examName = \`Theme \${tc} Exam Package (150 PTS: 120 Words + 30 Phrases)\`;

                // Unified Exam SCR Column
                dynamicAsmCols.push({
                  key: \`unified_\${tc}_exam_scr\`,
                  className: 'col-asm col-exam col-exam-score',
                  width: '38px',
                  headerTitle: \`\${examName} (Score %)\`,
                  title: \`\${examName} (Score %)\`,
                  label: \`
                    <div class="asm-hdr-cell">
                      <span class="test-num test-num-test" title="\${escapeHtml(examName)}">\${tc}</span>
                      <span class="test-subtag test-subtag-test-score">SCR</span>
                    </div>
                  \`,
                  sortable: true,
                  align: 'center',
                  render: (val, row) => {
                    const wAtt = wExam ? row.asmScores?.[wExam.id] : null;
                    const pAtt = pExam ? row.asmScores?.[pExam.id] : null;

                    const hasAny = wAtt || pAtt;
                    if (!hasAny) {
                      return '<span class="asm-dot" style="font-size:var(--matrix-font-size, 0.70rem); font-weight:400;" title="Unattempted">&middot;</span>';
                    }
                    const isAnyProgress = (wAtt?.status === 'in_progress') || (pAtt?.status === 'in_progress');
                    if (isAnyProgress) {
                      return \`<span style="color:\${TOPSCORE_COLORS.C}; font-size:calc(var(--matrix-font-size, 0.70rem) * 0.85);" title="In Progress">⏳</span>\`;
                    }

                    const unified = computeUnifiedScore({
                      wordsBest: wAtt,
                      phrasesBest: pAtt,
                      wordsMax: 120,
                      phrasesMax: 30,
                      hasPhrases: true
                    });

                    const attId = wAtt?.id || pAtt?.id || wAtt?.attempt_id || pAtt?.attempt_id;
                    const clickAttr = attId ? \`onclick="window.open('result.html?attempt_id=\${encodeURIComponent(attId)}&admin=1', '_blank'); event.stopPropagation();"\` : '';
                    const cursorStyle = attId ? 'cursor:pointer;' : 'cursor:default;';
                    const remSup = unified.isRemedial ? '<sup class="asm-rem-sup">R</sup>' : '';

                    return \`
                      <span class="asm-score asm-score-test"
                            style="color:\${unified.gradeColor}; \${cursorStyle} font-weight:600; font-size:var(--matrix-font-size, 0.70rem); font-variant-numeric:tabular-nums;"
                            \${clickAttr}
                            title="\${tc} Unified Exam&#10;Score: \${unified.percentage}% (Grade \${unified.grade})&#10;Words Exam: \${unified.wordsPoints}/120 (\${unified.wordsPct ?? 0}%)&#10;Phrases Exam: \${unified.phrasesPoints}/30 (\${unified.phrasesPct ?? 0}%)&#10;Total: \${unified.totalPoints}/150 pts&#10;Click to view result">
                        \${unified.percentage}%\${remSup}
                      </span>
                    \`;
                  }
                });

                // Unified Exam PTS Column
                dynamicAsmCols.push({
                  key: \`unified_\${tc}_exam_pts\`,
                  className: 'col-asm col-exam col-exam-pts',
                  width: '38px',
                  headerTitle: \`\${examName} (Points)\`,
                  title: \`\${examName} (Points)\`,
                  label: \`
                    <div class="asm-hdr-cell">
                      <span class="test-num test-num-test" title="\${escapeHtml(examName)}">\${tc}</span>
                      <span class="test-subtag test-subtag-test-pts">PTS</span>
                    </div>
                  \`,
                  sortable: true,
                  align: 'center',
                  render: (val, row) => {
                    const wAtt = wExam ? row.asmScores?.[wExam.id] : null;
                    const pAtt = pExam ? row.asmScores?.[pExam.id] : null;

                    const hasAny = wAtt || pAtt;
                    if (!hasAny) {
                      return '<span class="asm-dot" style="font-size:var(--matrix-font-size, 0.70rem); font-weight:400;" title="Unattempted">&middot;</span>';
                    }
                    const isAnyProgress = (wAtt?.status === 'in_progress') || (pAtt?.status === 'in_progress');
                    if (isAnyProgress) {
                      return \`<span style="color:\${TOPSCORE_COLORS.C}; font-size:calc(var(--matrix-font-size, 0.70rem) * 0.85);" title="In Progress">⏳</span>\`;
                    }

                    const unified = computeUnifiedScore({
                      wordsBest: wAtt,
                      phrasesBest: pAtt,
                      wordsMax: 120,
                      phrasesMax: 30,
                      hasPhrases: true
                    });

                    const attId = wAtt?.id || pAtt?.id || wAtt?.attempt_id || pAtt?.attempt_id;
                    const clickAttr = attId ? \`onclick="window.open('result.html?attempt_id=\${encodeURIComponent(attId)}&admin=1', '_blank'); event.stopPropagation();"\` : '';
                    const cursorStyle = attId ? 'cursor:pointer;' : 'cursor:default;';

                    return \`
                      <span class="asm-score asm-score-test"
                            style="color:\${unified.gradeColor} !important; \${cursorStyle}"
                            \${clickAttr}
                            title="\${tc} Unified Exam Points: \${unified.totalPoints}/150 pts (\${unified.percentage}%)">
                        <span style="font-weight:600; font-size:var(--matrix-font-size, 0.70rem); font-variant-numeric:tabular-nums; color:\${unified.gradeColor} !important;">
                          \${unified.totalPoints}
                        </span>
                      </span>
                    \`;
                  }
                });

              } else {
                // Fallback for classes without phrases (Words-only)
                asmsInTheme.forEach(asm => {`;

// Normalize line endings
const normContent = content.replace(/\r\n/g, '\n');
const normTarget = superHeaderTarget.replace(/\r\n/g, '\n');

if (!normContent.includes(normTarget)) {
  console.error("SuperHeader target not found!");
  process.exit(1);
}

// Also close the fallback branch before Theme Total columns
const totalHeaderTarget = `              // 3. THEME COMBINED SCORE COLUMN (User requirement: "Score dan pointanya dijadikan satu")`;
const totalHeaderReplacement = `              } // End of hasPhrasesComponents check

              // 3. THEME COMBINED SCORE COLUMN (User requirement: "Score dan pointanya dijadikan satu")`;

const normTotalTarget = totalHeaderTarget.replace(/\r\n/g, '\n');
if (!normContent.includes(normTotalTarget)) {
  console.error("TotalHeader target not found!");
  process.exit(1);
}

let patched = normContent.replace(normTarget, superHeaderReplacement);
patched = patched.replace(normTotalTarget, totalHeaderReplacement);

fs.writeFileSync(filePath, patched.replace(/\n/g, '\r\n'), 'utf-8');
console.log("Successfully patched Attendance Grid Matrix in js/admin/app.js!");
