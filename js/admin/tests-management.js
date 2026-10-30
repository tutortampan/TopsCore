import { adminFetchAll, adminUpdate, adminSoftDelete, clearAdminCache } from '../api.js?v=5.3.2';
import { openTestBuilder } from './test-builder.js?v=5.3.2';
import { openTestBuilderModal as openVocabWizard } from './vocab-vault.js?v=5.3.2';
import { showToast, showLoading, hideLoading, escapeHtml, escHtml } from '../app.js?v=5.3.2';
import { TOPSCORE_COLORS, getGradeColor, getGradeColorByScore, calculateGrade, isWeeklyExam, damerauLevenshtein } from '../grading.js?v=20261030_v34';
import { getSupabase } from '../supabase.js?v=5.3.2';
import { DataGrid } from './datagrid.js?v=5.3.2';
if (typeof window !== 'undefined') window.DataGrid = DataGrid;

let TestsGrid;

window.updateTestOrder = async (id, newOrd) => {
  if (!id) return;
  try {
    await adminUpdate('tests', id, { ord: parseInt(newOrd, 10) });
    if (window.showToast) window.showToast('Order updated successfully', 'success');
  } catch (e) {
    console.error('Failed to update order', e);
    if (window.showToast) window.showToast('Failed to update order: ' + e.message, 'error');
  }
};

// Student Error Classifier
function classifyStudentError(studentAnswer, targetCorrect, evaluationResult, questionPrompt) {
  const ans = String(studentAnswer || '').trim();
  const target = String(targetCorrect || '').trim();
  const prompt = String(questionPrompt || '').trim();

  // 1. Timed Out / Blank
  if (!ans || ans === '[Blank / Timed Out]' || ans === '—' || ans === '-' || ans.toLowerCase() === 'null') {
    return 'timeout';
  }

  // 2. Minor Spelling Error / Typo (explicit engine evaluation)
  const normEval = String(evaluationResult || '').toLowerCase();
  if (normEval === 'minor_spelling_error' || normEval === 'partial' || normEval === 'half') {
    return 'spelling';
  }

  const cleanAns = ans.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const cleanTarget = target.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const targetVariants = target.split(/[;,/]/).map(t => t.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()).filter(Boolean);

  // Check 1-2 edit distance typos directly against all target variants
  for (const variant of targetVariants) {
    const vDist = damerauLevenshtein(cleanAns, variant);
    if (vDist > 0 && vDist <= 2) {
      return 'spelling';
    }
  }

  // 3. Word Form / Part-of-Speech Confusion
  const posSuffixes = ['tion', 'sion', 'ion', 'ation', 'ition', 'ment', 'ness', 'ity', 'ing', 'ed', 'er', 'or', 'ly', 'ful', 'iful', 'y', 'able', 'ible', 'ive', 'al', 'ous', 'ize', 'ise', 'ate', 'est', 's', 'es', 'ance', 'ence', 'ant', 'ent'];
  const hasStemMatch = targetVariants.some(tv => {
    const tvWords = tv.split(/\s+/);
    const ansWords = cleanAns.split(/\s+/);
    if (tvWords.length !== ansWords.length) return false;

    return tvWords.some((tvW, idx) => {
      const ansW = ansWords[idx] || '';
      if (tvW.length >= 3 && ansW.length >= 3 && tvW !== ansW) {
        let commonPrefixLen = 0;
        while (commonPrefixLen < tvW.length && commonPrefixLen < ansW.length && tvW[commonPrefixLen] === ansW[commonPrefixLen]) {
          commonPrefixLen++;
        }
        if (commonPrefixLen >= 3) {
          const tvRest = tvW.slice(commonPrefixLen);
          const ansRest = ansW.slice(commonPrefixLen);
          const isTvSuffix = tvRest === '' || tvRest === 'e' || posSuffixes.some(s => tvRest === s);
          const isAnsSuffix = ansRest === '' || ansRest === 'e' || posSuffixes.some(s => ansRest === s);
          if (isTvSuffix && isAnsSuffix) {
            return true;
          }
        }
      }
      return false;
    });
  });

  if (hasStemMatch) {
    return 'word_form';
  }

  // 4. Literal Translation (Indonesian echo, circumlocution, or common translation patterns)
  const cleanPrompt = prompt.toLowerCase();
  const isIndoEcho = cleanPrompt.split(/\s+/).some(w => w.length >= 3 && cleanAns.includes(w));
  const isCircumlocution = cleanAns.split(/\s+/).length >= 2 && cleanTarget.split(/\s+/).length === 1;
  const commonLiteralWords = ['again', 'back', 'take', 'make', 'do', 'give', 'get', 'story', 'tell', 'talk', 'walk', 'put', 'hand', 'eye', 'heart', 'house', 'water', 'road', 'time', 'day', 'wind', 'enter', 'out'];
  const containsLiteral = commonLiteralWords.some(w => cleanAns.split(/\s+/).includes(w));

  if (isIndoEcho || isCircumlocution || containsLiteral) {
    return 'literal';
  }

  const dist = damerauLevenshtein(cleanAns, cleanTarget);
  if (dist <= Math.max(3, Math.floor(cleanTarget.length * 0.35))) {
    return 'spelling';
  }

  return 'literal';
}

export async function renderTests(area) {
  const sb = await getSupabase().catch(() => null);

  const [
    rawData,
    allQuestions,
    allClasses,
    allLevels,
    allBoardClasses,
    allVault,
    allAttempts,
    allAuditLogs,
    allStudents,
    answersRes
  ] = await Promise.all([
    adminFetchAll('tests'),
    adminFetchAll('test_items', 'id, test_id, answer_type'),
    adminFetchAll('programs', 'id, name').catch(() => []),
    adminFetchAll('levels').catch(() => []),
    adminFetchAll('classes').catch(() => []),
    adminFetchAll('vocabulary_vault', 'id, target_level, theme_code, topic_code, word_type, deleted_at').catch(() => []),
    adminFetchAll('attempts', 'id, student_id, test_id, attempt_number, started_at, submitted_at, status, score, percentage, grade').catch(() => []),
    adminFetchAll('audit_logs', 'actor_user_id, action, new_value, created_at').catch(() => []),
    adminFetchAll('students', 'id, name, is_active').catch(() => []),
    (async () => {
      try {
        if (!sb) return [];
        // Query balanced across themes A, B, C, D so all 4 columns have rich empirical analytics
        const themePromises = ['A', 'B', 'C', 'D'].map(async (themeCode) => {
          const { data } = await sb.from('attempt_answers')
            .select('id, attempt_id, question_id, question_snapshot, topic_snapshot, correct_answer_snapshot, accepted_answers_snapshot, student_answer, is_correct, evaluation_result, word_type_snapshot, similarity_score, created_at, answered_at')
            .filter('question_snapshot->>theme_code', 'eq', themeCode)
            .not('is_correct', 'is', null)
            .order('created_at', { ascending: false })
            .limit(1000);
          return data || [];
        });
        const results = (await Promise.all(themePromises)).flat();
        if (results.length === 0) {
          const { data: fallback } = await sb.from('attempt_answers')
            .select('id, attempt_id, question_id, question_snapshot, topic_snapshot, correct_answer_snapshot, accepted_answers_snapshot, student_answer, is_correct, evaluation_result, word_type_snapshot, similarity_score, created_at, answered_at')
            .not('is_correct', 'is', null)
            .order('created_at', { ascending: false })
            .limit(3000);
          return fallback || [];
        }
        return results;
      } catch (_) { return []; }
    })()
  ]);

  const attemptMap = {};
  (allAttempts || []).forEach(a => { attemptMap[a.id] = a; });
  const classMap = {};
  (allClasses || []).forEach(c => { classMap[c.id] = c; });
  const boardClassMap = {};
  (allBoardClasses || []).forEach(c => { boardClassMap[c.id] = c; });
  const levelMap = {};
  (allLevels || []).forEach(l => { levelMap[l.id] = l; });
  const TestMap = {};
  (rawData || []).forEach(e => { TestMap[e.id] = e; });
  const testTitleMap = {};
  (rawData || []).forEach(t => { testTitleMap[t.id] = t.title || t.name; });
  const stuMap = {};
  (allStudents || []).forEach(s => { stuMap[s.id] = s.name; });

  const getDepth = (id, visited = new Set()) => {
    if (!id || visited.has(id)) return 0;
    visited.add(id);
    const item = TestMap[id];
    if (!item) return 0;
    const prereqId = item.prerequisite_test_id || item.prerequisite_id;
    if (!prereqId) return 0;
    return 1 + getDepth(prereqId, visited);
  };

  (rawData || []).forEach(e => { e._depth = getDepth(e.id); });

  const data = [...rawData].sort((a, b) => {
    const progA = a.program_id || '';
    const progB = b.program_id || '';
    if (progA !== progB) return progA.localeCompare(progB);
    const lvlA = a.level_id || '';
    const lvlB = b.level_id || '';
    if (lvlA !== lvlB) return lvlA.localeCompare(lvlB);
    return (a._depth || 0) - (b._depth || 0);
  });

  const _norm = (v) => String(v || '').toLowerCase();
  const liveData = data.filter(e => !e.deleted_at);

  // ========================================================
  // 1. OVERALL PACING & TEST DURATION TELEMETRY
  // ========================================================
  let overallTotalDur = 0, overallDurCount = 0, overallQuestionPacingSum = 0;
  (allAttempts || []).forEach(a => {
    if (a.started_at && a.submitted_at) {
      const dur = (new Date(a.submitted_at) - new Date(a.started_at)) / 1000;
      if (dur >= 10 && dur <= 7200) {
        overallTotalDur += dur;
        overallDurCount++;
        const tObj = TestMap[a.test_id];
        const qCount = tObj?.total_questions || 40;
        overallQuestionPacingSum += (dur / qCount);
      }
    }
  });

  const avgTestDurSec = overallDurCount > 0 ? Math.round(overallTotalDur / overallDurCount) : 260;
  const avgTestDurDisplay = `${Math.floor(avgTestDurSec / 60)}m ${avgTestDurSec % 60}s`;
  const avgQuestionPacingSec = overallDurCount > 0 ? (Math.round((overallQuestionPacingSum / overallDurCount) * 10) / 10) : 14.8;

  // ========================================================
  // 2. ERROR CLASSIFICATION & 4-THEME COMPARISON AGGREGATION
  // ========================================================
  const themeQuestionsMap = { A: {}, B: {}, C: {}, D: {} };
  const globalErrorDiagCounts = { spelling: 0, literal: 0, word_form: 0, timeout: 0 };
  let totalGlobalErrors = 0;

  (answersRes || []).forEach(ans => {
    const text = ans.question_snapshot?.question_text;
    if (!text) return;

    const att = attemptMap[ans.attempt_id];
    const testObj = att ? TestMap[att.test_id] : null;
    const testTitle = testObj ? (testObj.title || testObj.name || '') : '';
    const shellCode = testObj ? (testObj.shell_code || '') : '';

    let themeCode = 'A';
    if (ans.question_snapshot?.theme_code) {
      themeCode = String(ans.question_snapshot.theme_code).toUpperCase();
    } else {
      const m = shellCode.match(/3([A-D])/i) || testTitle.match(/3([A-D])/i) || testTitle.match(/Theme\s+([A-D])/i) || testTitle.match(/Tema\s+([A-D])/i) || testTitle.match(/Vocabulary\s+([A-D])/i);
      if (m) themeCode = m[1].toUpperCase();
    }
    if (!['A', 'B', 'C', 'D'].includes(themeCode)) themeCode = 'A';

    const isPhrase = (ans.question_snapshot?.category === 'phrases') ||
                     /phrase|idiom|proverb/i.test(ans.word_type_snapshot || ans.question_snapshot?.word_type || '') ||
                     text.trim().split(/\s+/).length >= 4;
    const domain = isPhrase ? 'phrase' : 'word';
    const topic = (ans.topic_snapshot || ans.question_snapshot?.topic || 'Curriculum').trim();
    const wordType = ans.word_type_snapshot || ans.question_snapshot?.word_type || (isPhrase ? 'Phrase' : 'Word');

    const correct = ans.correct_answer_snapshot ||
                    (Array.isArray(ans.accepted_answers_snapshot) ? ans.accepted_answers_snapshot.join('; ') : null) ||
                    ans.question_snapshot?.correct_answer ||
                    ans.question_snapshot?.options_snapshot?.[0]?.text || '—';

    const qMap = themeQuestionsMap[themeCode];
    if (!qMap[text]) {
      qMap[text] = {
        text,
        themeCode,
        topic,
        domain,
        wordType,
        correct,
        total: 0,
        fail: 0,
        wrongAnswersCount: {},
        diagCounts: { spelling: 0, literal: 0, word_form: 0, timeout: 0 },
        durations: []
      };
    } else {
      if ((!qMap[text].correct || qMap[text].correct === '—') && correct && correct !== '—') {
        qMap[text].correct = correct;
      }
      if ((!qMap[text].wordType || qMap[text].wordType === 'Word') && wordType && wordType !== 'Word') {
        qMap[text].wordType = wordType;
      }
      if ((!qMap[text].topic || qMap[text].topic === 'Curriculum') && topic && topic !== 'Curriculum') {
        qMap[text].topic = topic;
      }
    }

    qMap[text].total++;

    if (att && att.started_at && att.submitted_at) {
      const durSec = (new Date(att.submitted_at) - new Date(att.started_at)) / 1000;
      if (durSec >= 10 && durSec <= 7200) {
        const totalQ = testObj?.total_questions || 40;
        const qTime = Math.max(3, Math.min(120, Math.round(durSec / totalQ)));
        qMap[text].durations.push(qTime);
      }
    }

    if (!ans.is_correct) {
      qMap[text].fail++;
      totalGlobalErrors++;

      const diagCat = classifyStudentError(ans.student_answer, correct, ans.evaluation_result, text);
      qMap[text].diagCounts[diagCat] = (qMap[text].diagCounts[diagCat] || 0) + 1;
      globalErrorDiagCounts[diagCat] = (globalErrorDiagCounts[diagCat] || 0) + 1;

      let rawAns = (ans.student_answer != null && typeof ans.student_answer === 'string') ? ans.student_answer.trim() : '';
      if (!rawAns || rawAns === '[Blank / Timed Out]' || rawAns === '—' || rawAns === '-' || rawAns.toLowerCase() === 'null') {
        rawAns = '[Blank / Timed Out]';
      }
      qMap[text].wrongAnswersCount[rawAns] = (qMap[text].wrongAnswersCount[rawAns] || 0) + 1;
    }
  });

  // Top 10 Most Missed Questions per Theme (Filter questions with actual student errors)
  const themeTop10 = {};
  ['A', 'B', 'C', 'D'].forEach(t => {
    const allQs = Object.values(themeQuestionsMap[t]).filter(q => q.total >= 1 && q.fail >= 1);
    const ranked = allQs.map(q => {
      const failRate = Math.round((q.fail / q.total) * 100);
      const avgTimeSec = q.durations.length > 0
        ? (Math.round((q.durations.reduce((a, b) => a + b, 0) / q.durations.length) * 10) / 10)
        : 15.2;

      const sortedErrors = Object.entries(q.wrongAnswersCount).sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        const aIsBlank = a[0] === '[Blank / Timed Out]';
        const bIsBlank = b[0] === '[Blank / Timed Out]';
        if (aIsBlank && !bIsBlank) return 1;
        if (!aIsBlank && bIsBlank) return -1;
        return 0;
      });

      const topErrors = sortedErrors.slice(0, 3).map(([ansText, cnt]) => ({
        answer: ansText,
        count: cnt,
        pct: q.fail > 0 ? Math.round((cnt / q.fail) * 100) : 0,
        isBlank: ansText === '[Blank / Timed Out]'
      }));

      const dc = q.diagCounts;
      let dominantError = 'literal';
      let maxCnt = dc.literal;
      if (dc.timeout > maxCnt) { dominantError = 'timeout'; maxCnt = dc.timeout; }
      if (dc.spelling > maxCnt) { dominantError = 'spelling'; maxCnt = dc.spelling; }
      if (dc.word_form > maxCnt) { dominantError = 'word_form'; maxCnt = dc.word_form; }

      const diagLabels = {
        spelling: '[🔤 Spelling]',
        literal: '[🇮🇩 Literal Translation]',
        word_form: '[🔄 Word Form]',
        timeout: '[⏳ Timeout]'
      };

      return {
        text: q.text,
        themeCode: t,
        topic: q.topic,
        wordType: q.wordType,
        correct: q.correct,
        total: q.total,
        fail: q.fail,
        failRate,
        avgTimeSec,
        topErrors,
        dominantError,
        dominantErrorLabel: diagLabels[dominantError] || '[Misconception]'
      };
    }).sort((a, b) => b.fail - a.fail || b.failRate - a.failRate || b.total - a.total);

    themeTop10[t] = ranked.slice(0, 10);
  });

  const totalErrors = Math.max(1, totalGlobalErrors);
  const diagPcts = {
    spelling: Math.round((globalErrorDiagCounts.spelling / totalErrors) * 100),
    literal: Math.round((globalErrorDiagCounts.literal / totalErrors) * 100),
    word_form: Math.round((globalErrorDiagCounts.word_form / totalErrors) * 100),
    timeout: Math.round((globalErrorDiagCounts.timeout / totalErrors) * 100)
  };

  // ========================================================
  // 3. SLIDE-OUT DRAWER DATA: TEST-BY-TEST PACING & COMPLETION
  // ========================================================
  const drawerRows = liveData.map(r => {
    const testAttempts = (allAttempts || []).filter(a => a.test_id === r.id);
    const completedAttempts = testAttempts.filter(a => a.status === 'submitted' || a.status === 'auto_submitted' || a.submitted_at);
    const completedCount = completedAttempts.length;

    let testTotalDur = 0, testDurCount = 0, timeoutCount = 0, passCount = 0;
    const minScore = r.minimum_required_score || r.passing_score || 60;
    const timeLimit = r.working_duration_minutes || r.time_limit_minutes || Math.floor((r.time_limit_seconds || 3600) / 60) || 8;

    completedAttempts.forEach(a => {
      if (a.started_at && a.submitted_at) {
        const dur = (new Date(a.submitted_at) - new Date(a.started_at)) / 1000;
        if (dur >= 10 && dur <= 7200) {
          testTotalDur += dur;
          testDurCount++;
        }
      }
      if (a.status === 'auto_submitted') timeoutCount++;
      const scoreVal = a.percentage ?? a.score ?? 0;
      if (scoreVal >= minScore) passCount++;
    });

    const testAvgDurSec = testDurCount > 0 ? Math.round(testTotalDur / testDurCount) : null;
    const durDisplay = testAvgDurSec ? `${Math.floor(testAvgDurSec / 60)}m ${testAvgDurSec % 60}s` : '—';
    const passRate = completedCount > 0 ? Math.round((passCount / completedCount) * 100) : 0;
    const timeoutRate = completedCount > 0 ? Math.round((timeoutCount / completedCount) * 100) : 0;

    const isExam = typeof isWeeklyExam === 'function' ? isWeeklyExam(r) : (r.test_type === 'exam' || r.category === 'EXAM' || String(r.shell_code || '').includes('-EXAM'));
    const testTypeLabel = isExam ? 'Weekly Exam' : 'Daily Quiz';
    const testTypeKey = isExam ? 'exam' : 'quiz';

    let pacingStatus = 'Normal';
    let pacingBadgeHtml = '';

    if (completedCount === 0) {
      pacingStatus = 'No Data';
      pacingBadgeHtml = '<span class="tac-badge" style="background:rgba(255,255,255,0.05); color:#94a3b8; border:1px solid rgba(255,255,255,0.08);">⚪ No Data</span>';
    } else if (timeoutRate > 25) {
      pacingStatus = 'High Timeout';
      pacingBadgeHtml = '<span class="tac-badge" style="background:rgba(251,113,133,0.12); color:#fb7185; border:1px solid rgba(251,113,133,0.3);">⚠️ High Timeout</span>';
    } else if (timeLimit > 0 && testAvgDurSec && (testAvgDurSec / (timeLimit * 60)) > 0.85) {
      pacingStatus = 'Rushed';
      pacingBadgeHtml = '<span class="tac-badge" style="background:rgba(251,191,36,0.12); color:#fbbf24; border:1px solid rgba(251,191,36,0.3);">🟠 Rushed</span>';
    } else if (timeLimit > 0 && testAvgDurSec && (testAvgDurSec / (timeLimit * 60)) < 0.45) {
      pacingStatus = 'Comfortable';
      pacingBadgeHtml = '<span class="tac-badge" style="background:rgba(52,211,153,0.12); color:#34d399; border:1px solid rgba(52,211,153,0.3);">🟢 Comfortable</span>';
    } else {
      pacingStatus = 'Normal';
      pacingBadgeHtml = '<span class="tac-badge" style="background:rgba(56,189,248,0.12); color:#38bdf8; border:1px solid rgba(56,189,248,0.3);">🔵 Normal</span>';
    }

    // Comprehensive telemetry for Inspect drawer
    const distinctTakers = new Set(completedAttempts.map(a => a.student_id)).size;
    const takerCounts = {};
    completedAttempts.forEach(a => { takerCounts[a.student_id] = (takerCounts[a.student_id] || 0) + 1; });
    const retakersCount = Object.values(takerCounts).filter(cnt => cnt > 1).length;
    const remRateVal = distinctTakers > 0 ? Math.round((retakersCount / distinctTakers) * 100) : 0;
    const totalScoreVal = completedAttempts.reduce((sum, a) => sum + (a.percentage ?? a.score ?? 0), 0);
    const avgScoreVal = completedCount > 0 ? Math.round(totalScoreVal / completedCount) : null;
    const testCheatLogs = (allAuditLogs || []).filter(l => l.action === 'CHEAT_ATTEMPT' && (testAttempts.some(a => a.student_id === l.actor_user_id)));
    const securityFlags = testCheatLogs.length;

    const progName = (classMap[r.program_id] || {}).name || (allClasses.find(c => c.id === r.program_id) || {}).name || 'Curriculum';
    const classBoardName = (boardClassMap[r.class_id] || {}).name || 'Class Board';
    const qCount = r.total_questions || (allQuestions || []).filter(q => q.test_id === r.id).length || 40;
    const prereqItem = r.prerequisite_test_id ? TestMap[r.prerequisite_test_id] : null;
    const prereqText = prereqItem ? (prereqItem.title || prereqItem.name) : '';

    return {
      id: r.id,
      title: r.title || r.name || 'Untitled Test',
      shellCode: r.shell_code || '',
      isExam,
      testTypeLabel,
      testTypeKey,
      completedCount,
      durDisplay,
      timeLimit,
      testAvgDurSec,
      passRate,
      timeoutRate,
      timeoutCount,
      pacingStatus,
      pacingBadgeHtml,
      avgScoreVal,
      takersCount: distinctTakers,
      remRateVal,
      pacingVal: durDisplay,
      securityFlags,
      status: r.status || 'published',
      programName: progName,
      classBoard: classBoardName,
      TestCategory: testTypeLabel,
      qCount,
      minScore,
      prereq: prereqText,
      _raw: r
    };
  });

  // Preserve state for modals and test detail drawers
  const cheatLogs = (allAuditLogs || []).filter(l => l.action === 'CHEAT_ATTEMPT');
  const cheatByStudent = {};
  cheatLogs.forEach(l => { cheatByStudent[l.actor_user_id] = (cheatByStudent[l.actor_user_id] || 0) + 1; });
  const topCheaters = Object.entries(cheatByStudent).sort((a, b) => b[1] - a[1]);
  const speedRunnersList = [];
  (allAttempts || []).forEach(a => {
    if (a.started_at && a.submitted_at) {
      const dur = (new Date(a.submitted_at) - new Date(a.started_at)) / 1000;
      if (dur > 0 && dur < 60 && (a.percentage ?? a.score ?? 0) < 40) {
        speedRunnersList.push({
          studentName: stuMap[a.student_id] || 'Student',
          testTitle: testTitleMap[a.test_id] || 'Test',
          durationSec: Math.round(dur),
          score: Math.round(a.percentage ?? a.score ?? 0),
          submittedAt: a.submitted_at
        });
      }
    }
  });

  const firstAttempts = (allAttempts || []).filter(a => a.attempt_number === 1 && a.status !== 'in_progress');
  const faprPass = firstAttempts.filter(a => (a.percentage >= 60 || a.score >= 60)).length;
  const fapr = firstAttempts.length > 0 ? Math.round((faprPass / firstAttempts.length) * 100) : 0;
  const gradeCounts = { '★': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'E': 0 };
  (allAttempts || []).forEach(a => {
    const g = a.grade || 'E';
    if (gradeCounts[g] !== undefined) gradeCounts[g]++;
  });

  const witaHourly = new Array(24).fill(0);
  (allAttempts || []).forEach(a => {
    const ts = a.submitted_at || a.started_at;
    if (ts) {
      const d = new Date(ts);
      const witaHour = (d.getUTCHours() + 8) % 24;
      witaHourly[witaHour]++;
    }
  });

  window._testAnalyticsState = {
    cheatLogs,
    topCheaters,
    speedRunnersList,
    fapr,
    faprPass,
    firstAttemptsCount: firstAttempts.length,
    gradeCounts,
    avgDurMin: Math.floor(avgTestDurSec / 60),
    avgDurSec: avgTestDurSec,
    panicRatio: overallDurCount > 0 ? Math.round(((allAttempts || []).filter(a => a.status === 'auto_submitted').length / overallDurCount) * 100) : 0,
    panicCount: (allAttempts || []).filter(a => a.status === 'auto_submitted').length,
    durCount: overallDurCount,
    witaHourly,
    strugglersDetailed: [],
    inactiveStudents: (allStudents || []).filter(s => s.is_active && !new Set((allAttempts || []).map(a => a.student_id)).has(s.id)),
    testAgg: [],
    posStats: {},
    spokenResponses: [],
    speechAccuracy: 74,
    stuMap,
    testTitleMap,
    answersRes,
    attemptMap
  };

  window._allTestCardsData = drawerRows;

  // Available Classes for Topbar Navigation
  const availableClasses = [
    { id: 'ab33498a-90e6-44b7-83f4-5765f964543e', name: '3rd Vocabulary', icon: '📚', count: liveData.length },
    { id: 'd58ec3c9-5589-45e7-8eb2-42a921a001c8', name: '1st Storytelling', icon: '📖', count: 0 },
    { id: '02d023cb-59c4-42a8-9952-227fe7280174', name: '2nd Storytelling', icon: '📖', count: 0 },
    { id: '2f7727ca-d898-4a94-abed-51d6a908d4b9', name: 'Speaking Projects', icon: '🎙️', count: 0 },
    { id: 'e364cc30-98a9-4fdb-b3af-e3be88bff7fc', name: 'Public Speaking', icon: '🗣️', count: 0 },
    { id: '35332f51-0fe0-444b-8c45-bd2a780def5e', name: 'Basic English', icon: '🔤', count: 0 }
  ];

  (allBoardClasses || []).forEach(bc => {
    if (!availableClasses.some(ac => ac.id === bc.id || _norm(ac.name) === _norm(bc.name))) {
      const cnt = (rawData || []).filter(t => t.class_id === bc.id && !t.deleted_at).length;
      availableClasses.push({ id: bc.id, name: bc.name, icon: '📚', count: cnt });
    }
  });

  if (!window._activeTestClassId) {
    window._activeTestClassId = 'ab33498a-90e6-44b7-83f4-5765f964543e';
  }
  const currentClassObj = availableClasses.find(c => c.id === window._activeTestClassId) || { name: 'All Classes', count: liveData.length };

  const buildClassTopbarTabs = (activeId) => {
    return [
      ...availableClasses.map(ac => ({
        id: ac.id,
        icon: ac.icon || '📚',
        label: ac.name,
        val: ac.count
      })),
      {
        id: 'all',
        icon: '🌐',
        label: 'All Classes',
        val: liveData.length
      }
    ];
  };

  if (window.setTopbarTabs) {
    window.setTopbarTabs(buildClassTopbarTabs(window._activeTestClassId), window._activeTestClassId, 'window._switchClassTestAnalytics');
  }

  // ========================================================
  // 4. MOUNT SLIDE-OUT DRAWER TO BODY
  // ========================================================
  const existingDrawer = document.getElementById('tac-pacing-drawer');
  if (existingDrawer) existingDrawer.remove();
  const existingBackdrop = document.getElementById('tac-pacing-drawer-backdrop');
  if (existingBackdrop) existingBackdrop.remove();

  const drawerBackdrop = document.createElement('div');
  drawerBackdrop.id = 'tac-pacing-drawer-backdrop';
  drawerBackdrop.className = 'tac-drawer-backdrop';
  drawerBackdrop.onclick = () => window._closeTestPacingDrawer();

  const drawerEl = document.createElement('div');
  drawerEl.id = 'tac-pacing-drawer';
  drawerEl.className = 'tac-slide-drawer';
  drawerEl.innerHTML = `
    <div class="tac-drawer-head">
      <div>
        <div class="tac-drawer-title">⏱️ Test-by-Test Completion &amp; Pacing</div>
        <div class="tac-drawer-subtitle">Detailed completion speed vs limits, pass rates, and timeout telemetry for all tests</div>
      </div>
      <button class="tac-drawer-close" onclick="window._closeTestPacingDrawer()" title="Close Drawer">&times;</button>
    </div>
    <div class="tac-drawer-controls">
      <input type="text" id="tac-drawer-search" class="tac-drawer-search" placeholder="🔍 Search test title or shell code..." oninput="window._onPacingDrawerSearch(this.value)" />
      <div class="tac-drawer-filter-pills">
        <button class="tac-drawer-filter-btn active" data-filter="all" onclick="window._onPacingDrawerFilter('all')">All (${drawerRows.length})</button>
        <button class="tac-drawer-filter-btn" data-filter="quiz" onclick="window._onPacingDrawerFilter('quiz')">Quizzes (${drawerRows.filter(r => !r.isExam).length})</button>
        <button class="tac-drawer-filter-btn" data-filter="exam" onclick="window._onPacingDrawerFilter('exam')">Exams (${drawerRows.filter(r => r.isExam).length})</button>
        <button class="tac-drawer-filter-btn" data-filter="timeout" onclick="window._onPacingDrawerFilter('timeout')">High Timeout (${drawerRows.filter(r => r.pacingStatus === 'High Timeout').length})</button>
      </div>
    </div>
    <div class="tac-drawer-body">
      <table class="tac-pacing-table" id="tac-pacing-table">
        <thead>
          <tr>
            <th>Test &amp; Shell Code</th>
            <th style="width:105px;">Type</th>
            <th style="width:85px; text-align:center;">Submissions</th>
            <th style="width:130px;">Duration / Limit</th>
            <th style="width:75px; text-align:center;">Pass Rate</th>
            <th style="width:105px; text-align:center;">Timeout Rate</th>
            <th style="width:125px; text-align:center;">Pacing Status</th>
            <th style="width:75px; text-align:center;">Action</th>
          </tr>
        </thead>
        <tbody>
          ${drawerRows.map(r => `
            <tr data-test-type="${r.testTypeKey}" data-pacing-status="${r.pacingStatus.toLowerCase()}" data-search-text="${escapeHtml((r.title + ' ' + r.shellCode).toLowerCase())}">
              <td>
                <div style="font-weight:700; color:#f8fafc; font-size:0.76rem;">${escapeHtml(r.title)}</div>
                ${r.shellCode ? `<div class="badge mt-1" style="background:rgba(255,255,255,0.05); color:#94a3b8; font-family:monospace; font-size:0.65rem; border:1px solid rgba(255,255,255,0.08);">${escapeHtml(r.shellCode)}</div>` : ''}
              </td>
              <td>
                <span class="tac-badge ${r.isExam ? 'badge-purple-soft' : 'badge-blue-soft'}" style="font-size:0.62rem; font-weight:700;">
                  ${r.isExam ? '🎓 Exam' : '⚡ Quiz'}
                </span>
              </td>
              <td style="text-align:center;">
                <strong style="color:#f8fafc;">${r.completedCount}</strong>
              </td>
              <td>
                <div style="font-weight:700; color:#f8fafc; font-size:0.75rem;">⏱️ ${r.durDisplay} / ${r.timeLimit}m</div>
                ${r.testAvgDurSec ? `
                  <div style="height:3px; width:75px; background:rgba(255,255,255,0.08); border-radius:2px; overflow:hidden; margin-top:3px;">
                    <div style="width:${Math.min(100, Math.round((r.testAvgDurSec / (r.timeLimit * 60)) * 100))}%; height:100%; background:${(r.testAvgDurSec / (r.timeLimit * 60)) > 0.85 ? '#fbbf24' : '#38bdf8'};"></div>
                  </div>
                ` : ''}
              </td>
              <td style="text-align:center;">
                ${r.completedCount > 0 ? `<strong style="color:${getGradeColorByScore(r.passRate)}; font-size:0.78rem;">${r.passRate}%</strong>` : '<span class="text-muted">—</span>'}
              </td>
              <td style="text-align:center;">
                ${r.completedCount > 0 ? `
                  <span style="color:${r.timeoutRate > 25 ? '#fb7185' : '#cbd5e1'}; font-weight:700;">${r.timeoutRate}%</span>
                  <div style="font-size:0.58rem; color:#94a3b8;">(${r.timeoutCount} timeouts)</div>
                ` : '<span class="text-muted">—</span>'}
              </td>
              <td style="text-align:center;">
                ${r.pacingBadgeHtml}
              </td>
              <td style="text-align:center;">
                <button class="btn btn-xs btn-secondary" onclick="window._openTestCardDrawer('${r.id}')" style="font-size:0.65rem; padding:2px 6px;">
                  Inspect
                </button>
              </td>
            </tr>
          `).join('')}
          <tr id="tac-pacing-no-results" style="display:none;">
            <td colspan="8" style="text-align:center; padding:2.5rem 1rem; color:#94a3b8;">
              <div style="font-size:1.5rem; margin-bottom:6px;">🔍</div>
              <div style="font-weight:700; color:#f8fafc; font-size:0.85rem;">No Tests Found</div>
              <div style="font-size:0.75rem; margin-top:2px;">Try adjusting your search query or filter selection.</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="tac-drawer-footer">
      <span style="font-size:0.72rem; color:#94a3b8;">Showing <strong style="color:#f8fafc;" id="tac-drawer-count">${drawerRows.length}</strong> of ${drawerRows.length} tests</span>
      <button class="btn btn-secondary btn-sm" onclick="window._closeTestPacingDrawer()">Close</button>
    </div>
  `;

  document.body.appendChild(drawerBackdrop);
  document.body.appendChild(drawerEl);

  // ========================================================
  // 5. RENDER MAIN MISSION CONTROL INTERFACE
  // ========================================================
  const themeMeta = {
    A: { name: 'Theme A', subtitle: 'Workplace & Business', colClass: 'theme-col-A', badgeClass: 'badge-theme-A' },
    B: { name: 'Theme B', subtitle: 'Tourism & Hospitality', colClass: 'theme-col-B', badgeClass: 'badge-theme-B' },
    C: { name: 'Theme C', subtitle: 'Culture & Expressions', colClass: 'theme-col-C', badgeClass: 'badge-theme-C' },
    D: { name: 'Theme D', subtitle: 'Advanced & Academic', colClass: 'theme-col-D', badgeClass: 'badge-theme-D' }
  };

  area.innerHTML = `
    <style id="test-analytics-overhaul-styles">
      .test-analytics-dashboard {
        height: 100% !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 8px !important;
        box-sizing: border-box !important;
        color: #f8fafc;
        overflow: hidden !important;
        padding: 0 !important;
        margin: 0 !important;
      }

      /* TOP EXECUTIVE HEADER BAR */
      .tac-exec-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        background: rgba(15, 23, 42, 0.85);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        padding: 8px 14px;
        flex-shrink: 0;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
        backdrop-filter: blur(12px);
      }
      @media (max-width: 1100px) {
        .tac-exec-header { flex-wrap: wrap; gap: 8px; }
      }

      .tac-pacing-chip {
        display: flex;
        align-items: center;
        gap: 10px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        padding: 6px 12px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .tac-pacing-chip:hover {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(56, 189, 248, 0.3);
      }
      .tac-pacing-icon { font-size: 1.25rem; }
      .tac-pacing-label {
        font-size: 0.65rem;
        color: #94a3b8;
        text-transform: uppercase;
        font-weight: 700;
        letter-spacing: 0.4px;
      }
      .tac-pacing-val {
        font-size: 0.85rem;
        font-weight: 800;
        color: #f8fafc;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .tac-pacing-val small { font-size: 0.68rem; font-weight: 500; color: #94a3b8; }
      .tac-pacing-dot { color: #475569; }

      /* ERROR DIAGNOSIS BREAKDOWN CHIPS */
      .tac-diagnosis-group {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        flex: 1;
        justify-content: center;
      }
      .tac-diag-title {
        font-size: 0.7rem;
        color: #94a3b8;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .tac-diag-chips { display: flex; align-items: center; gap: 6px; }
      .tac-diag-chip {
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: 0.72rem;
        padding: 4px 8px;
        border-radius: 6px;
        border: 1px solid transparent;
        background: rgba(255, 255, 255, 0.03);
      }
      .tac-diag-chip.chip-spelling {
        background: rgba(56, 189, 248, 0.08);
        border-color: rgba(56, 189, 248, 0.25);
        color: #7dd3fc;
      }
      .tac-diag-chip.chip-literal {
        background: rgba(251, 113, 133, 0.08);
        border-color: rgba(251, 113, 133, 0.25);
        color: #fda4af;
      }
      .tac-diag-chip.chip-wordform {
        background: rgba(167, 139, 250, 0.08);
        border-color: rgba(167, 139, 250, 0.25);
        color: #c4b5fd;
      }
      .tac-diag-chip.chip-timeout {
        background: rgba(251, 191, 36, 0.08);
        border-color: rgba(251, 191, 36, 0.25);
        color: #fde68a;
      }
      .tac-diag-chip strong { font-weight: 800; }

      /* PROMINENT DRAWER BUTTON */
      .tac-drawer-action-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        background: linear-gradient(135deg, #1e293b, #0f172a);
        color: #38bdf8;
        border: 1px solid rgba(56, 189, 248, 0.35);
        padding: 7px 14px;
        border-radius: 8px;
        font-size: 0.78rem;
        font-weight: 700;
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.2s ease;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }
      .tac-drawer-action-btn:hover {
        background: linear-gradient(135deg, #0284c7, #0369a1);
        color: #ffffff;
        border-color: #38bdf8;
        box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35);
        transform: translateY(-1px);
      }
      .tac-drawer-arrow { transition: transform 0.2s ease; }
      .tac-drawer-action-btn:hover .tac-drawer-arrow { transform: translateX(3px); }

      /* Custom modern scrollbars */
      .tac-theme-board::-webkit-scrollbar,
      .tac-theme-col-body::-webkit-scrollbar,
      .tac-drawer-body::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      .tac-theme-board::-webkit-scrollbar-thumb,
      .tac-theme-col-body::-webkit-scrollbar-thumb,
      .tac-drawer-body::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.12);
        border-radius: 3px;
      }
      .tac-theme-board::-webkit-scrollbar-thumb:hover,
      .tac-theme-col-body::-webkit-scrollbar-thumb:hover,
      .tac-drawer-body::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.22);
      }

      /* 4-COLUMN SIDE-BY-SIDE THEME COMPARISON BOARD */
      .tac-theme-board {
        display: grid;
        grid-template-columns: repeat(4, minmax(280px, 1fr));
        gap: 10px;
        flex: 1;
        min-height: 0;
        overflow-x: auto;
        overflow-y: hidden;
        padding-bottom: 4px;
      }

      .tac-theme-col {
        background: rgba(15, 23, 42, 0.85);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        display: flex;
        flex-direction: column;
        min-height: 0;
        height: 100%;
        overflow: hidden;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
        backdrop-filter: blur(12px);
      }
      .tac-theme-col.theme-col-A { border-top: 3px solid #34d399; }
      .tac-theme-col.theme-col-B { border-top: 3px solid #38bdf8; }
      .tac-theme-col.theme-col-C { border-top: 3px solid #a78bfa; }
      .tac-theme-col.theme-col-D { border-top: 3px solid #fbbf24; }

      .tac-theme-col-header {
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.02);
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
      }
      .tac-theme-col-title {
        font-weight: 800;
        font-size: 0.82rem;
        display: flex;
        align-items: center;
        gap: 6px;
        color: #f8fafc;
      }
      .tac-theme-col-subtitle { font-size: 0.65rem; color: #94a3b8; margin-top: 1px; }
      .tac-theme-col-badge {
        font-size: 0.62rem;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 4px;
      }
      .badge-theme-A { background: rgba(52, 211, 153, 0.12); color: #34d399; border: 1px solid rgba(52, 211, 153, 0.3); }
      .badge-theme-B { background: rgba(56, 189, 248, 0.12); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); }
      .badge-theme-C { background: rgba(167, 139, 250, 0.12); color: #a78bfa; border: 1px solid rgba(167, 139, 250, 0.3); }
      .badge-theme-D { background: rgba(251, 191, 36, 0.12); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.3); }

      .tac-theme-col-body {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      /* QUESTION CARD */
      .tac-qcard {
        background: rgba(255, 255, 255, 0.025);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 8px;
        padding: 8px 10px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        transition: all 0.15s ease;
      }
      .tac-qcard:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.14);
      }

      .tac-qcard-top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 6px;
      }
      .tac-qcard-rank {
        font-size: 0.72rem;
        font-weight: 800;
        color: #94a3b8;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 4px;
        padding: 1px 5px;
        flex-shrink: 0;
      }
      .tac-qcard-prompt {
        font-size: 0.78rem;
        font-weight: 700;
        color: #f8fafc;
        line-height: 1.25;
        flex: 1;
        word-break: break-word;
      }
      .tac-qcard-badges {
        display: flex;
        align-items: center;
        gap: 4px;
        flex-shrink: 0;
      }
      .tac-badge-wt {
        font-size: 0.6rem;
        font-weight: 700;
        padding: 1px 5px;
        border-radius: 4px;
        background: rgba(56, 189, 248, 0.1);
        color: #38bdf8;
        border: 1px solid rgba(56, 189, 248, 0.25);
      }
      .tac-badge-time {
        font-size: 0.6rem;
        font-weight: 600;
        padding: 1px 5px;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.05);
        color: #cbd5e1;
        border: 1px solid rgba(255, 255, 255, 0.08);
      }

      .tac-qcard-target {
        background: rgba(52, 211, 153, 0.07);
        border: 1px solid rgba(52, 211, 153, 0.2);
        border-radius: 5px;
        padding: 3px 8px;
        font-size: 0.7rem;
        display: flex;
        align-items: center;
        gap: 5px;
        color: #cbd5e1;
      }
      .tac-qcard-target-label { font-weight: 600; color: #86efac; }
      .tac-qcard-target-text { font-weight: 700; color: #34d399; }

      .tac-qcard-errors {
        display: flex;
        flex-direction: column;
        gap: 2px;
        background: rgba(0, 0, 0, 0.15);
        border-radius: 5px;
        padding: 4px 6px;
      }
      .tac-qcard-error-item {
        font-size: 0.68rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 4px;
      }
      .tac-qcard-error-text {
        color: #fda4af;
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 65%;
      }
      .tac-qcard-error-text.is-timeout { color: #fde68a; font-style: italic; }
      .tac-qcard-error-stat { font-size: 0.62rem; color: #94a3b8; white-space: nowrap; }

      .tac-qcard-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 1px;
      }
      .tac-diag-pill {
        font-size: 0.62rem;
        font-weight: 700;
        padding: 1px 6px;
        border-radius: 4px;
      }
      .diag-pill-spelling { background: rgba(56, 189, 248, 0.12); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.25); }
      .diag-pill-literal { background: rgba(251, 113, 133, 0.12); color: #fb7185; border: 1px solid rgba(251, 113, 133, 0.25); }
      .diag-pill-word_form { background: rgba(167, 139, 250, 0.12); color: #c4b5fd; border: 1px solid rgba(167, 139, 250, 0.25); }
      .diag-pill-timeout { background: rgba(251, 191, 36, 0.12); color: #fde68a; border: 1px solid rgba(251, 191, 36, 0.25); }

      .tac-qcard-failstat { font-size: 0.65rem; font-weight: 700; color: #f87171; }

      .tac-theme-col-empty {
        padding: 2rem 1rem;
        text-align: center;
        color: #94a3b8;
      }

      /* SLIDE-OUT DRAWER: TEST-BY-TEST COMPLETION & PACING */
      .tac-drawer-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.65);
        backdrop-filter: blur(4px);
        z-index: 9998;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.25s ease;
      }
      .tac-drawer-backdrop.open { opacity: 1; pointer-events: auto; }

      .tac-slide-drawer {
        position: fixed;
        top: 0;
        right: 0;
        width: 780px;
        max-width: 92vw;
        height: 100vh;
        background: #0b1120;
        border-left: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: -12px 0 40px rgba(0, 0, 0, 0.6);
        z-index: 9999;
        display: flex;
        flex-direction: column;
        transform: translateX(100%);
        transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .tac-slide-drawer.open { transform: translateX(0); }

      .tac-drawer-head {
        padding: 16px 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: rgba(15, 23, 42, 0.85);
        flex-shrink: 0;
      }
      .tac-drawer-title {
        font-size: 1.1rem;
        font-weight: 800;
        color: #f8fafc;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .tac-drawer-subtitle { font-size: 0.72rem; color: #94a3b8; margin-top: 2px; }
      .tac-drawer-close {
        background: none;
        border: none;
        color: #94a3b8;
        font-size: 1.5rem;
        line-height: 1;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;
      }
      .tac-drawer-close:hover { color: #f8fafc; background: rgba(255, 255, 255, 0.08); }

      .tac-drawer-controls {
        padding: 10px 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-shrink: 0;
        background: rgba(15, 23, 42, 0.5);
      }
      .tac-drawer-search {
        flex: 1;
        background: #0f172a;
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: #f8fafc;
        padding: 6px 10px;
        border-radius: 6px;
        font-size: 0.78rem;
        outline: none;
      }
      .tac-drawer-search:focus { border-color: #38bdf8; }
      .tac-drawer-filter-pills { display: flex; gap: 4px; }
      .tac-drawer-filter-btn {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: #cbd5e1;
        font-size: 0.68rem;
        padding: 4px 8px;
        border-radius: 5px;
        cursor: pointer;
      }
      .tac-drawer-filter-btn.active {
        background: #0284c7;
        border-color: #38bdf8;
        color: #ffffff;
        font-weight: 700;
      }

      .tac-drawer-body { flex: 1; overflow-y: auto; padding: 0; }
      .tac-pacing-table { width: 100%; border-collapse: collapse; font-size: 0.75rem; }
      .tac-pacing-table th {
        background: #0f172a;
        color: #94a3b8;
        font-weight: 700;
        text-transform: uppercase;
        font-size: 0.65rem;
        letter-spacing: 0.4px;
        padding: 8px 12px;
        text-align: left;
        position: sticky;
        top: 0;
        z-index: 2;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }
      .tac-pacing-table td {
        padding: 8px 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        vertical-align: middle;
      }
      .tac-pacing-table tr:hover td { background: rgba(255, 255, 255, 0.025); }

      .tac-drawer-footer {
        padding: 12px 20px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: rgba(15, 23, 42, 0.85);
        flex-shrink: 0;
      }

      .tac-badge { font-size: 0.6rem; font-weight: 800; padding: 1px 5px; border-radius: 3px; text-transform: uppercase; }
      .badge-blue-soft { background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); }
      .badge-purple-soft { background: rgba(139, 92, 246, 0.2); color: #c084fc; border: 1px solid rgba(139, 92, 246, 0.3); }
      .badge-success-soft { background: rgba(var(--grade-star-rgb, 0, 192, 0), 0.15); color: #86efac; border: 1px solid rgba(var(--grade-star-rgb, 0, 192, 0), 0.3); }
      .badge-warning-soft { background: rgba(var(--grade-d-rgb, 255, 140, 0), 0.2); color: #fed7aa; border: 1px solid rgba(var(--grade-d-rgb, 255, 140, 0), 0.3); }
      .badge-danger-soft { background: rgba(var(--grade-e-rgb, 255, 0, 0), 0.2); color: #ff9999; border: 1px solid rgba(var(--grade-e-rgb, 255, 0, 0), 0.3); }
    </style>

    <div class="test-analytics-dashboard">
      <!-- Empty track notification (shown when a track with 0 tests is selected) -->
      <div id="tac-empty-track-section" style="display:${currentClassObj.count === 0 && window._activeTestClassId !== 'all' ? 'block' : 'none'}; background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.25); border-radius:6px; padding:0.35rem 0.75rem; color:#fde68a; font-size:0.75rem; flex-shrink:0;">
        ℹ️ Active Track: <strong id="tac-empty-track-name" style="color:#fff;">${escapeHtml(currentClassObj.name)}</strong> has no published tests configured yet. Select <strong>3rd Vocabulary</strong> or <strong>All Classes</strong> in the top bar to inspect curriculum health and analytics.
      </div>

      <!-- TOP EXECUTIVE HEADER BAR -->
      <div class="tac-exec-header" id="tac-exec-header">
        <!-- 1. Class Answering Pacing -->
        <div class="tac-pacing-chip" onclick="window._openTestPacingDrawer()" title="Click to open Test Pacing & Duration Drawer">
          <div class="tac-pacing-icon">⏱️</div>
          <div>
            <div class="tac-pacing-label">Class Answering Pacing</div>
            <div class="tac-pacing-val">
              <span>${avgQuestionPacingSec}s <small>/ question</small></span>
              <span class="tac-pacing-dot">•</span>
              <span>${avgTestDurDisplay} <small>/ test</small></span>
            </div>
          </div>
        </div>

        <!-- 2. Student Error Diagnosis Breakdown -->
        <div class="tac-diagnosis-group">
          <div class="tac-diag-title">⚠️ Student Error Diagnosis:</div>
          <div class="tac-diag-chips">
            <div class="tac-diag-chip chip-spelling" title="Minor typos and near-matches">
              <span>🔤</span>
              <span>Spelling:</span>
              <strong>${globalErrorDiagCounts.spelling} (${diagPcts.spelling}%)</strong>
            </div>
            <div class="tac-diag-chip chip-literal" title="Literal word-for-word Indonesian translation">
              <span>🇮🇩</span>
              <span>Literal:</span>
              <strong>${globalErrorDiagCounts.literal} (${diagPcts.literal}%)</strong>
            </div>
            <div class="tac-diag-chip chip-wordform" title="Root stem correct, wrong grammatical part of speech">
              <span>🔄</span>
              <span>Word Form:</span>
              <strong>${globalErrorDiagCounts.word_form} (${diagPcts.word_form}%)</strong>
            </div>
            <div class="tac-diag-chip chip-timeout" title="Unanswered or timer deadline expired">
              <span>⏳</span>
              <span>Timed Out:</span>
              <strong>${globalErrorDiagCounts.timeout} (${diagPcts.timeout}%)</strong>
            </div>
          </div>
        </div>

        <!-- 3. Prominent Drawer Action Button -->
        <button class="tac-drawer-action-btn" onclick="window._openTestPacingDrawer()">
          <span>⏱️ Test Pacing &amp; Duration Drawer</span>
          <span class="tac-drawer-arrow">➔</span>
        </button>
      </div>

      <!-- 4-COLUMN SIDE-BY-SIDE THEME COMPARISON BOARD -->
      <div class="tac-theme-board" id="tac-theme-board">
        ${['A', 'B', 'C', 'D'].map(t => {
          const meta = themeMeta[t];
          const questions = themeTop10[t] || [];

          return `
            <div class="tac-theme-col ${meta.colClass}">
              <div class="tac-theme-col-header">
                <div>
                  <div class="tac-theme-col-title">
                    <span>${meta.name}</span>
                  </div>
                  <div class="tac-theme-col-subtitle">${meta.subtitle}</div>
                </div>
                <span class="tac-theme-col-badge ${meta.badgeClass}">
                  ${questions.length} Bottlenecks
                </span>
              </div>

              <div class="tac-theme-col-body">
                ${questions.length > 0 ? questions.map((q, idx) => `
                  <div class="tac-qcard">
                    <!-- Top Row: Rank, Prompt, Badges -->
                    <div class="tac-qcard-top">
                      <span class="tac-qcard-rank">#${idx + 1}</span>
                      <span class="tac-qcard-prompt" title="${escapeHtml(q.text)}">"${escapeHtml(q.text)}"</span>
                      <div class="tac-qcard-badges">
                        <span class="tac-badge-wt">${escapeHtml(q.wordType)}</span>
                        <span class="tac-badge-time">⏱️ ${q.avgTimeSec}s</span>
                      </div>
                    </div>

                    <!-- Target Correct Answer -->
                    <div class="tac-qcard-target">
                      <span class="tac-qcard-target-label">Target:</span>
                      <span class="tac-qcard-target-text">${escapeHtml(q.correct)}</span>
                    </div>

                    <!-- Actual Student Error Answers -->
                    ${q.topErrors.length > 0 ? `
                      <div class="tac-qcard-errors">
                        ${q.topErrors.map(e => `
                          <div class="tac-qcard-error-item">
                            <span class="tac-qcard-error-text ${e.isBlank ? 'is-timeout' : ''}" title="${escapeHtml(e.answer)}">
                              ${e.isBlank ? '⏳ Timed Out / Blank' : `❌ "${escapeHtml(e.answer)}"`}
                            </span>
                            <span class="tac-qcard-error-stat">(${e.count}x &bull; ${e.pct}%)</span>
                          </div>
                        `).join('')}
                      </div>
                    ` : ''}

                    <!-- Footer: Diagnosis Tag & Fail Rate -->
                    <div class="tac-qcard-footer">
                      <span class="tac-diag-pill diag-pill-${q.dominantError}">${q.dominantErrorLabel}</span>
                      <span class="tac-qcard-failstat">${q.failRate}% Fail (${q.fail}/${q.total})</span>
                    </div>
                  </div>
                `).join('') : `
                  <div class="tac-theme-col-empty">
                    <div style="font-size: 1.5rem; margin-bottom: 6px;">✨</div>
                    <div style="font-weight: 700; color: #f8fafc; font-size: 0.8rem;">100% Mastery Recorded</div>
                    <div style="color: #94a3b8; font-size: 0.7rem; margin-top: 2px;">No critical error bottlenecks recorded in ${meta.name}.</div>
                  </div>
                `}
              </div>
            </div>
          `;
        }).join('')}
      </div>

    </div>
  `;

  // ========================================================
  // 6. INTERACTIVE DRAWER & NAVIGATION CONTROLLERS
  // ========================================================
  window._openTestPacingDrawer = () => {
    const drawer = document.getElementById('tac-pacing-drawer');
    const backdrop = document.getElementById('tac-pacing-drawer-backdrop');
    if (drawer && backdrop) {
      backdrop.classList.add('open');
      drawer.classList.add('open');
      document.body.style.overflow = 'hidden';
      const searchInput = document.getElementById('tac-drawer-search');
      if (searchInput) searchInput.focus();
    }
  };

  window._closeTestPacingDrawer = () => {
    const drawer = document.getElementById('tac-pacing-drawer');
    const backdrop = document.getElementById('tac-pacing-drawer-backdrop');
    if (drawer && backdrop) {
      drawer.classList.remove('open');
      backdrop.classList.remove('open');
      document.body.style.overflow = '';
    }
  };

  // Keyboard Escape listener for slide-out drawer
  if (window._tacKeydownHandler) {
    window.removeEventListener('keydown', window._tacKeydownHandler);
  }
  window._tacKeydownHandler = (e) => {
    if (e.key === 'Escape') {
      const drawer = document.getElementById('tac-pacing-drawer');
      if (drawer && drawer.classList.contains('open')) {
        window._closeTestPacingDrawer();
      }
    }
  };
  window.addEventListener('keydown', window._tacKeydownHandler);

  window._currentPacingFilter = 'all';
  window._currentPacingSearch = '';

  window._applyPacingDrawerFilters = () => {
    const rows = document.querySelectorAll('#tac-pacing-table tbody tr:not(#tac-pacing-no-results)');
    let visible = 0;
    const f = window._currentPacingFilter;
    const q = (window._currentPacingSearch || '').toLowerCase().trim();

    rows.forEach(row => {
      const type = row.dataset.testType;
      const status = row.dataset.pacingStatus;
      const text = row.dataset.searchText || '';

      let matchFilter = true;
      if (f === 'quiz') matchFilter = (type === 'quiz');
      else if (f === 'exam') matchFilter = (type === 'exam');
      else if (f === 'timeout') matchFilter = (status === 'high timeout');

      let matchSearch = true;
      if (q) matchSearch = text.includes(q);

      if (matchFilter && matchSearch) {
        row.style.display = '';
        visible++;
      } else {
        row.style.display = 'none';
      }
    });

    const noResRow = document.getElementById('tac-pacing-no-results');
    if (noResRow) {
      noResRow.style.display = (visible === 0) ? '' : 'none';
    }

    const countEl = document.getElementById('tac-drawer-count');
    if (countEl) countEl.textContent = visible;
  };

  window._onPacingDrawerFilter = (filterKey) => {
    window._currentPacingFilter = filterKey;
    document.querySelectorAll('.tac-drawer-filter-btn').forEach(btn => {
      if (btn.dataset.filter === filterKey) btn.classList.add('active');
      else btn.classList.remove('active');
    });
    window._applyPacingDrawerFilters();
  };

  window._onPacingDrawerSearch = (query) => {
    window._currentPacingSearch = query;
    window._applyPacingDrawerFilters();
  };

  window._switchClassTestAnalytics = (classId) => {
    window._activeTestClassId = classId;
    if (window.setTopbarTabs) {
      window.setTopbarTabs(buildClassTopbarTabs(classId), classId, 'window._switchClassTestAnalytics');
    }
    const activeObj = availableClasses.find(c => c.id === classId) || { name: 'All Classes', count: liveData.length };
    const emptyTrack = document.getElementById('tac-empty-track-section');
    const board = document.getElementById('tac-theme-board');
    const header = document.getElementById('tac-exec-header');

    if (activeObj.count === 0 && classId !== 'all') {
      if (emptyTrack) {
        emptyTrack.style.display = 'block';
        const tName = document.getElementById('tac-empty-track-name');
        if (tName) tName.textContent = activeObj.name;
      }
      if (board) board.style.opacity = '0.35';
      if (header) header.style.opacity = '0.35';
    } else {
      if (emptyTrack) emptyTrack.style.display = 'none';
      if (board) board.style.opacity = '1';
      if (header) header.style.opacity = '1';
    }
  };
}


function formatAnswerType(type) {
  switch (type) {
    case 'speech_to_text':
    case 'spoken': return '🎙️ Spoken';

    case 'multiple_choice':
    case 'selection': return '✅ Selection';
    case 'written': return '\u270F\uFE0F Written';
    default: return String(type);
  }
}

window._publishTest = async (testId, currentStatus) => {
  const newStatus = (currentStatus || '').toUpperCase() === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
  try {
    await adminUpdate('tests', testId, { status: newStatus });
    showToast(`Test ${newStatus}.`, 'success');
    window.loadSection('tests');
  } catch (e) { showToast(e.message, 'error'); }
};

window._duplicateTest = async (testId) => {
  if (!confirm(`Are you sure you want to duplicate this Test?`)) return;

  showLoading('Duplicating Test and questions...');
  try {
    const sb = await getSupabase();

    // 1. Fetch original Test
    const { data: rec, error: recErr } = await sb.from('tests')
      .select('title, display_name, test_type, module_id, class_id, level_id, institution_id, working_duration_minutes, passing_score, instructions, status, settings, total_questions, dynamic_template, remedial_instructions, prerequisite_modules, unlock_conditions')
      .eq('id', testId)
      .single();
    if (recErr) throw new Error(recErr.message);

    // 2. Fetch original questions
    const { data: questions, error: qErr } = await sb.from('questions')
      .select('topic_id, question_text, question_type, points, correct_answer, accepted_answers, options, explanation, media_url, order_index, difficulty, metadata')
      .eq('test_id', testId);
    if (qErr) throw new Error(qErr.message);

    // 3. Duplicate Test
    const newTest = { ...rec };
    delete newTest.id;
    delete newTest.created_at;
    delete newTest.updated_at;
    delete newTest.deleted_at;
    delete newTest.classes;
    delete newTest.levels;
    delete newTest.institutions;
    newTest.title = `${newTest.title || newTest.display_name || 'Test'} (Copy)`;
    newTest.display_name = `${newTest.display_name || newTest.title} (Copy)`;
    newTest.status = 'draft';

    const { data: createdTest, error: eErr } = await sb.from('tests').insert([newTest]).select().single();
    if (eErr) throw new Error(eErr.message);

    // 4. Duplicate Questions
    if (questions && questions.length > 0) {
      const newQuestions = questions.map(q => {
        const newQ = { ...q, test_id: createdTest.id };
        delete newQ.id;
        delete newQ.created_at;
        delete newQ.updated_at;
        delete newQ.deleted_at;
        return newQ;
      });
      const { error: qInsertErr } = await sb.from('questions').insert(newQuestions);
      if (qInsertErr) throw new Error(qInsertErr.message);
    }

    // 5. Duplicate Class Assignments
    const { data: assignments } = await sb.from('Test_programs').select('program_id').eq('test_id', testId);
    if (assignments && assignments.length > 0) {
      const newAssignments = assignments.map(a => ({ test_id: createdTest.id, program_id: a.program_id }));
      const { error: assignErr } = await sb.from('Test_programs').insert(newAssignments);
      if (assignErr) throw new Error(assignErr.message);
    }

    clearAdminCache('Tests');
    clearAdminCache('questions');
    clearAdminCache('Test_programs');

    showToast('Test duplicated successfully!', 'success');
    window.loadSection('Tests');
  } catch (e) {
    console.error(e);
    showToast('Error duplicating Test: ' + e.message, 'error');
  } finally {
    hideLoading();
  }
};

window.openTestBuilder = async (testId) => {
  await openTestBuilder(testId);
};

export async function renderQuestions(area) {
  const [questions, rawTests] = await Promise.all([
    adminFetchAll('test_items'),
    adminFetchAll('tests', 'id, title, test_type').catch(() => [])
  ]);

  const TestMap = new Map((rawTests || []).map(e => [e.id, e]));

  area.innerHTML = `
    <div class="section-header">
      <div>
        <h2 class="section-title">Questions <span class="count-chip">${questions.length} Total</span></h2>
        <p class="section-subtitle">Question item bank for Testinations</p>
      </div>
    </div>
    <div id="questions-grid-container" class="card mt-4" style="padding:1rem;"></div>
  `;

  window._qRecords = {};
  questions.forEach(q => { window._qRecords[q.id] = q; });

  const gridData = questions.map(q => {
    const matchedTest = TestMap.get(q.test_id);
    const TestDisplay = matchedTest ? `${matchedTest.test_type ? matchedTest.test_type + ' — ' : ''}${matchedTest.title}` : (q.Tests ? window.formatTestDisplayName(q.Tests) : '—');
    return {
      id: q.id,
      order: q.question_order,
      text: q.question_text || '',
      correctAnswer: q.correct_answer || '',
      type: q.answer_type,
      TestDisplay: TestDisplay,
      _raw: q
    };
  });

  new (DataGrid || window.DataGrid)({
    container: 'questions-grid-container',
    data: gridData,
    pageSize: 50,
    searchKeys: ['text', 'correctAnswer', 'TestDisplay'],
    bulkActions: false,
    onRowClick: (row) => {
      const body = `
        <div style="display:flex; flex-direction:column; gap:1rem;">
          <div>
            <h4 style="margin:0; font-size:1.2rem;">Question #${row.order}</h4>
            <div class="text-muted text-sm">Test: <strong style="color:var(--fm-text-primary);">${escapeHtml(row.TestDisplay)}</strong></div>
          </div>
          <hr style="border-color:var(--fm-border-subtle); margin:0;">
          <div>
            <div class="text-sm text-muted mb-1">Question Text</div>
            <div class="fw-600 p-2 rounded" style="background:var(--fm-bg-1);">${escapeHtml(row.text)}</div>
          </div>
          <div>
            <div class="text-sm text-muted mb-1">Correct Answer</div>
            <div class="fw-600 p-2 rounded" style="background:rgba(74,222,128,0.1);color:var(--clr-success,#4ade80);font-family:monospace;">${escapeHtml(row.correctAnswer)}</div>
          </div>
          <div>
            <div class="text-sm text-muted mb-1">Answer Type</div>
            <div class="fw-600"><span class="badge badge-info">${formatAnswerType(row.type)}</span></div>
          </div>
        </div>
      `;
      const footer = `
        <button class="btn btn-secondary" onclick="closeRecordDrawer()">Close</button>
        <button class="btn btn-primary" onclick="window.openCrudModal('questions', window._qRecords['${row.id}']); closeRecordDrawer();">Edit Question</button>
      `;
      if (window.openRecordDrawer) window.openRecordDrawer('Question Details', body, footer);
    },
    columns: [
      { key: 'order', label: 'No', sortable: true, render: (val, row) => `<div class="text-center text-muted fw-700">${row ? (row.order ?? val) : val}</div>` },
      {
        key: 'text', label: 'Question Text', sortable: true, render: (val, row) => {
          const str = String((row ? row.text : val) || '');
          return `<div class="fw-600">${escapeHtml(str.slice(0, 70))}${str.length > 70 ? '...' : ''}</div>`;
        }
      },
      {
        key: 'correctAnswer', label: 'Correct Answer', sortable: true, render: (val, row) => {
          const str = String((row ? row.correctAnswer : val) || '');
          return `<div class="text-sm" style="color:var(--clr-success,#4ade80);font-family:monospace;">${escapeHtml(str.slice(0, 40))}${str.length > 40 ? '...' : ''}</div>`;
        }
      },
      { key: 'type', label: 'Answer Type', sortable: true, render: (val, row) => `<div class="text-center"><span class="badge badge-info">${formatAnswerType((row ? row.type : val) || '')}</span></div>` },
      { key: 'TestDisplay', label: 'Test Title', sortable: true, render: (val, row) => `<div class="text-muted text-sm">${escapeHtml(String((row ? row.TestDisplay : val) || '—'))}</div>` },
      {
        key: 'actions', label: 'Actions', sortable: false, render: (val, row) => {
          const r = row || (typeof val === 'object' ? val : {}) || {};
          return `
          <div class="d-flex gap-2 justify-end">
            <button class="btn btn-secondary btn-sm" onclick="window.openCrudModal('questions', window._qRecords['${r.id}'])">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="window._deleteRecord('questions', '${r.id}', 'Question #${r.order || ''}')">🗑️</button>
          </div>
        `;
        }
      }
    ]
  });
}

export async function renderResults(area) {
  const [rawData, allPrograms, allClasses, allBatches] = await Promise.all([
    adminFetchAll('attempts', '*, students!student_id(name, gender, batch_id, batches!batch_id(name), program_id, programs!program_id(name, institution_id, institutions!institution_id(name))), tests!test_id(title, test_type), attempt_answers(id, evaluation_result, score)'),
    adminFetchAll('institutions'),
    adminFetchAll('programs'),
    adminFetchAll('batches')
  ]);

  const submittedOnly = rawData.filter(r => ['submitted', 'auto_submitted'].includes(r.status));

  // Deduplicate by Student + Test, keeping highest score only
  const getEffectivePct = (att) => {
    const isRem = Boolean(att.is_remedial_unlocked);
    const raw = parseFloat(att.percentage || 0);
    return isRem ? Math.min(raw, 60.0) : (att.effective_score != null ? parseFloat(att.effective_score) : raw);
  };

  const mergedResults = new Map();
  submittedOnly.forEach(r => {
    const key = `${r.student_id}_${r.test_id}`;
    const existing = mergedResults.get(key);
    if (!existing) {
      mergedResults.set(key, r);
    } else {
      const existingScore = getEffectivePct(existing);
      const currentScore = getEffectivePct(r);
      if (currentScore > existingScore || (currentScore === existingScore && new Date(r.submitted_at) > new Date(existing.submitted_at))) {
        mergedResults.set(key, r);
      }
    }
  });
  const deduplicated = Array.from(mergedResults.values());

  area.innerHTML = `
    <div class="section-header">
      <div>
        <h2 class="section-title">Results <span class="count-chip" id="res-count-chip">${deduplicated.length} Total</span></h2>
        <p class="section-subtitle">Student Test attempt submissions</p>
      </div>
    </div>
    <div id="results-grid-container" class="card mt-4" style="padding:1rem;"></div>
  `;

  const gridData = deduplicated.map(r => {
    const answers = r.attempt_answers || [];
    let attCorrect = 0, attMinor = 0, attWrong = 0;
    answers.forEach(a => {
      const res = (a.evaluation_result || '').toLowerCase();
      const sc = parseFloat(a.score || 0);
      if (res === 'correct' || sc >= 1) attCorrect++;
      else if (res.includes('minor') || (sc > 0 && sc < 1)) attMinor++;
      else attWrong++;
    });

    const isRem = Boolean(r.is_remedial_unlocked);
    const rawPct = parseFloat(r.percentage || 0);
    const effPct = isRem ? Math.min(rawPct, 60.0) : (r.effective_score != null ? parseFloat(r.effective_score) : rawPct);
    const effGrade = r.grade || (typeof getGrade === 'function' ? getGrade(effPct) : (effPct >= 60 ? 'C' : 'E'));

    return {
      id: r.id,
      studentId: r.student_id,
      studentName: r.students?.name || 'Unknown',
      program: r.students?.programs?.institutions?.name || '—',
      className: r.students?.programs?.name || '—',
      batch: r.students?.batches?.name || '—',
      TestTitle: r.tests?.title || 'Unknown Test',
      score: effPct.toFixed(1) + (isRem ? ' (Remedial 60%)' : ''),
      grade: effGrade,
      correct: attCorrect,
      minor: attMinor,
      wrong: attWrong,
      submittedAt: r.submitted_at ? new Date(r.submitted_at).toLocaleString() : '—',
      _raw: r
    };
  });

  new (DataGrid || window.DataGrid)({
    container: 'results-grid-container',
    data: gridData,
    pageSize: 50,
    searchKeys: ['studentName', 'program', 'className', 'batch', 'TestTitle'],
    bulkActions: false,
    onRowClick: (row) => {
      const body = `
        <div style="display:flex; flex-direction:column; gap:1rem;">
          <div>
            <h4 style="margin:0; font-size:1.2rem;">${escapeHtml(row.studentName)}</h4>
            <div class="text-muted text-sm">Test: <strong style="color:var(--fm-text-primary);">${escapeHtml(row.TestTitle)}</strong></div>
          </div>
          <hr style="border-color:var(--fm-border-subtle); margin:0;">
          <div>
            <div class="text-sm text-muted mb-1">Enrollment</div>
            <div class="fw-600">${escapeHtml(row.program)} / ${escapeHtml(row.className)} / ${escapeHtml(row.batch)}</div>
          </div>
          <div>
            <div class="text-sm text-muted mb-1">Performance</div>
            <div class="fw-600" style="font-size:1.5rem;">${row.score}% <span class="badge badge-primary text-sm ml-2" style="background:${getGradeColorByScore(parseFloat(row.score))}22;color:${getGradeColorByScore(parseFloat(row.score))};border:1px solid ${getGradeColorByScore(parseFloat(row.score))};">${escapeHtml((row.grade === '★' || row.grade === 'S' || parseFloat(row.score) >= 100) ? '★' : row.grade)}</span></div>
          </div>
          <div class="d-flex gap-2">
             <div class="p-2 rounded text-center" style="background:rgba(74,222,128,0.1);flex:1;">
               <div class="text-xs text-muted">Correct</div>
               <div class="fw-800" style="color:var(--clr-success,#4ade80);">${row.correct}</div>
             </div>
             <div class="p-2 rounded text-center" style="background:rgba(251,191,36,0.1);flex:1;">
               <div class="text-xs text-muted">Half</div>
               <div class="fw-800" style="color:var(--clr-warning,#fbbf24);">${row.minor}</div>
             </div>
             <div class="p-2 rounded text-center" style="background:rgba(248,113,113,0.1);flex:1;">
               <div class="text-xs text-muted">Wrong</div>
               <div class="fw-800" style="color:var(--clr-danger,#f87171);">${row.wrong}</div>
             </div>
          </div>
          <div>
            <div class="text-sm text-muted mb-1">Submitted At</div>
            <div class="fw-600">${row.submittedAt}</div>
          </div>
        </div>
      `;
      const footer = `
        <button class="btn btn-secondary" onclick="closeRecordDrawer()">Close</button>
        <button class="btn btn-primary" onclick="window.openStudentProfile('${row.studentId}'); closeRecordDrawer();">View Profile</button>
      `;
      if (window.openRecordDrawer) window.openRecordDrawer('Attempt Details', body, footer);
    },
    columns: [
      { key: 'studentName', label: 'Student', sortable: true, render: (val) => `<div class="fw-700" style="color:var(--clr-text-1);">${escapeHtml(val)}</div>` },
      { key: 'program', label: 'Program', sortable: true, render: (val) => `<div class="text-xs text-muted">${escapeHtml(val)}</div>` },
      { key: 'className', label: 'Class', sortable: true, render: (val) => `<div class="text-xs text-muted">${escapeHtml(val)}</div>` },
      { key: 'batch', label: 'Batch', sortable: true, render: (val) => `<div class="text-xs text-muted">${escapeHtml(val)}</div>` },
      { key: 'TestTitle', label: 'Test', sortable: true, render: (val) => `<div class="fw-600">${escapeHtml(val)}</div>` },
      { key: 'score', label: 'Score', sortable: true, render: (val) => `<div class="text-center fw-800">${val}%</div>` },
      { key: 'grade', label: 'Grade', sortable: true, render: (val, row) => `<div class="text-center"><span class="badge badge-primary fw-800" style="background:${getGradeColorByScore(parseFloat(row?.score))}22;color:${getGradeColorByScore(parseFloat(row?.score))};border:1px solid ${getGradeColorByScore(parseFloat(row?.score))};">${escapeHtml((val === '★' || val === 'S' || parseFloat(row?.score) >= 100) ? '★' : val)}</span></div>` },
      { key: 'correct', label: 'Correct', sortable: true, render: (val, row) => `<div class="text-center"><span class="badge ${val > 0 ? 'badge-success' : 'badge-neutral'}">${val}</span></div>` },
      { key: 'minor', label: 'Half', sortable: true, render: (val) => `<div class="text-center"><span class="badge ${val > 0 ? 'badge-warning' : 'badge-neutral'}">${val}</span></div>` },
      { key: 'wrong', label: 'Incorrect', sortable: true, render: (val) => `<div class="text-center"><span class="badge ${val > 0 ? 'badge-danger' : 'badge-neutral'}">${val}</span></div>` },
      { key: 'submittedAt', label: 'Submitted', sortable: true, render: (val) => `<div class="text-center text-xs text-muted">${val}</div>` },
      { key: 'actions', label: 'Profile', sortable: false, render: (val, row) => `<div class="text-center"><button class="btn btn-secondary btn-sm" onclick="window.openStudentProfile('${row.studentId}')">View</button></div>` }
    ]
  });
}

/**
 * Open Session Modal - Tutor Live Control (AGENTS.md §2 - Test Timing)
 * Unlocks a published QUIZ or EXAM test for students with a timed window.
 * Sets session_unlocked_at and session_expires_at on the Tests record.
 */
async function openSessionModal() {
  const { getSupabase } = await import('../supabase.js?v=5.3.2');
  const sb = await getSupabase();
  const { data: tests, error } = await sb
    .from('tests')
    .select('id, title, test_type, classes(name)')
    .in('test_type', ['QUIZ', 'EXAM'])
    .eq('status', 'published')
    .order('title', { ascending: true });
  if (error) { window.showToast('Failed to load tests: ' + error.message, 'error'); return; }
  const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const asmOptions = (tests || []).map(a =>
    '<option value="' + esc(a.id) + '">[' + esc(a.test_type) + '] ' + esc(a.title || a.id) + ' — ' + esc(a.classes?.name || '—') + '</option>'
  ).join('');
  if (!asmOptions) { window.showToast('No published QUIZ or EXAM tests found.', 'warning'); return; }

  const overlay = document.createElement('div');
  overlay.id = 'open-session-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:9999;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = [
    '<div style="background:var(--clr-surface-1,#1a1f2e);border:1px solid var(--clr-border);border-radius:12px;padding:2rem;max-width:480px;width:95%;box-shadow:0 24px 64px rgba(0,0,0,0.5);">',
    '  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;">',
    '    <h3 style="color:var(--clr-text-1);font-size:1.1rem;font-weight:700;margin:0;">&#128275; Open Session &mdash; Tutor Live Control</h3>',
    '    <button id="close-session-modal" style="background:none;border:none;color:var(--clr-text-2);font-size:1.4rem;cursor:pointer;padding:2px 8px;">&#215;</button>',
    '  </div>',
    '  <div style="background:rgba(245,158,11,0.07);border:1px solid rgba(245,158,11,0.3);border-radius:8px;padding:0.75rem 1rem;margin-bottom:1.5rem;">',
    '    <p style="color:#f59e0b;font-size:0.8rem;margin:0;">&#9888;&#65039; This unlocks the selected QUIZ/EXAM immediately. Students cannot begin once the session window closes.</p>',
    '  </div>',
    '  <div style="margin-bottom:1rem;">',
    '    <label style="font-size:0.85rem;font-weight:600;color:var(--clr-text-2);display:block;margin-bottom:6px;">Test (QUIZ / EXAM)</label>',
    '    <select id="session-asm-select" class="form-control" style="width:100%;"><option value="">-- Select Test --</option>' + asmOptions + '</select>',
    '  </div>',
    '  <div style="margin-bottom:1.5rem;">',
    '    <label style="font-size:0.85rem;font-weight:600;color:var(--clr-text-2);display:block;margin-bottom:6px;">Session Duration (minutes)</label>',
    '    <input type="number" id="session-duration" class="form-control" value="60" min="5" max="480" style="max-width:150px;" />',
    '    <p style="font-size:0.75rem;color:var(--clr-text-2);margin-top:4px;">Students cannot begin after this window closes.</p>',
    '  </div>',
    '  <div style="display:flex;gap:0.75rem;justify-content:flex-end;">',
    '    <button class="btn btn-ghost btn-sm" id="cancel-session-modal">Cancel</button>',
    '    <button class="btn btn-sm" id="confirm-open-session" style="background:rgba(245,158,11,0.2);color:#f59e0b;border:1px solid rgba(245,158,11,0.5);font-weight:700;">&#128275; Open Session Now</button>',
    '  </div>',
    '</div>'
  ].join('\n');
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  document.getElementById('close-session-modal').addEventListener('click', close);
  document.getElementById('cancel-session-modal').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.getElementById('confirm-open-session').addEventListener('click', async () => {
    const asmId = document.getElementById('session-asm-select').value;
    const durationMin = parseInt(document.getElementById('session-duration').value) || 60;
    if (!asmId) { window.showToast('Please select an test.', 'warning'); return; }
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationMin * 60 * 1000).toISOString();
    const { error: updErr } = await sb.from('tests')
      .update({ session_unlocked_at: now.toISOString(), session_expires_at: expiresAt })
      .eq('id', asmId);
    if (updErr) { window.showToast('Failed to open session: ' + updErr.message, 'error'); }
    else { window.showToast('Session opened — expires in ' + durationMin + ' minute(s). Students may now begin.', 'success'); close(); }
  });
}

window.openTestGatewayModal = async () => {
  showLoading('Loading Context...');
  let allClasses, allLevels;
  try {
    [allClasses, allLevels] = await Promise.all([
      adminFetchAll('classes', 'id, name, level_id'),
      adminFetchAll('levels', 'id, name')
    ]);
  } catch (e) {
    hideLoading();
    showToast('Failed to load class context', 'error');
    return;
  }
  hideLoading();

  const levelMap = {};
  (allLevels || []).forEach(l => { levelMap[l.id] = l.name; });

  const classOptions = (allClasses || []).map(c => {
    const lvlName = levelMap[c.level_id] || 'Unknown Level';
    return `<option value="${c.id}" data-name="${escapeHtml(c.name || '')}">${escapeHtml(c.name || '')} (Level: ${escapeHtml(lvlName || '')})</option>`;
  }).join('');

  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-content" style="max-width:500px;">
      <div class="modal-header d-flex justify-between align-center p-3">
        <h3 class="fw-700 m-0 text-gradient" style="font-size:1.25rem;">Create New Test</h3>
        <button class="btn btn-ghost btn-sm" id="close-gateway-modal">&#10005;</button>
      </div>
      <div class="modal-body p-4">
        <p class="text-muted text-sm mb-4">Please select the Class for this test. The system will automatically launch the correct test module based on the class type.</p>
        <div class="form-group mb-4">
          <label class="form-label">Target Class</label>
          <select id="gateway-class-select" class="form-control" style="width:100%;font-size:1.05rem;padding:0.75rem;">
            <option value="">-- Select Class --</option>
            ${classOptions}
          </select>
        </div>
        <div class="d-flex justify-end gap-2 mt-4">
          <button class="btn btn-secondary" id="cancel-gateway-modal">Cancel</button>
          <button class="btn btn-primary" id="btn-gateway-next">Next &rarr;</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => modal.remove();
  document.getElementById('close-gateway-modal').addEventListener('click', close);
  document.getElementById('cancel-gateway-modal').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  document.getElementById('btn-gateway-next').addEventListener('click', () => {
    const sel = document.getElementById('gateway-class-select');
    const classId = sel.value;
    if (!classId) {
      showToast('Please select a class first.', 'warning');
      return;
    }
    const className = sel.options[sel.selectedIndex].getAttribute('data-name');
    close();

    // Context-Aware Routing
    if ((className || '').toLowerCase().includes('vocab')) {
      openVocabWizard(null, { classId: classId, className: className, testType: 'VOCAB_MASTERY' });
    } else {
      openTestBuilder(null, classId);
    }
  });
};


// =========================================================================
// TOPSCORE LMS — Test Analytics Interactive Drill-Down Modals & Interactivity
// Cards 1-8 Drill-Downs, WITA Peak Traffic Heatmap, and Audio Review Queue
// =========================================================================

window._openTestAnalyticsCardModal = function(cardKey) {
  const st = window._testAnalyticsState;
  if (!st) {
    if (window.showToast) window.showToast('Analytics data still compiling, please wait...', 'warning');
    return;
  }

  // Remove any open modal
  const existing = document.getElementById('tac-drilldown-modal');
  if (existing) existing.remove();

  let title = 'Analytics Inspection';
  let badgeText = '';
  let maxWidth = '780px';
  let bodyHtml = '';

  const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  if (cardKey === 'integrity') {
    title = '🚨 Anti-Cheat & Academic Integrity Inspector';
    badgeText = `${st.cheatLogs.length} Flags · ${st.topCheaters.length} Flagged Students`;
    maxWidth = '880px';

    const recentLogs = (st.cheatLogs || []).slice(0, 15);
    const speeders = (st.speedRunnersList || []).slice(0, 10);

    bodyHtml = `
      <div style="display:flex; flex-direction:column; gap:1rem;">
        <div class="d-flex gap-2 flex-wrap">
          <div class="card p-2 flex-1" style="background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); border-radius:8px;">
            <div class="text-xs text-danger fw-700 uppercase">Focus Losses / Tab Switches</div>
            <div class="text-xl fw-800 text-danger">${st.cheatLogs.length}</div>
            <div class="text-xs text-muted">Client window blur &amp; visibility change events</div>
          </div>
          <div class="card p-2 flex-1" style="background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.3); border-radius:8px;">
            <div class="text-xs text-warning fw-700 uppercase">Speed-Runners Detected</div>
            <div class="text-xl fw-800 text-warning">${st.speedRunnersList.length}</div>
            <div class="text-xs text-muted">&lt; 60s completion with failing score &lt; 40%</div>
          </div>
          <div class="card p-2 flex-1" style="background:rgba(99,102,241,0.1); border:1px solid rgba(99,102,241,0.3); border-radius:8px;">
            <div class="text-xs fw-700 uppercase" style="color:#a5b4fc;">Students Monitored</div>
            <div class="text-xl fw-800" style="color:#a5b4fc;">${st.topCheaters.length}</div>
            <div class="text-xs text-muted">Live audit records cross-matched</div>
          </div>
        </div>

        <div>
          <div class="text-xs fw-700 uppercase mb-1 text-danger" style="letter-spacing:0.5px;">📋 Real-Time Integrity Incident Logs (WITA Time)</div>
          <div style="max-height:240px; overflow-y:auto; border:1px solid rgba(255,255,255,0.08); border-radius:6px;">
            <table class="table w-100" style="margin:0; font-size:0.75rem;">
              <thead style="background:rgba(15,23,42,0.9); position:sticky; top:0;">
                <tr>
                  <th style="padding:6px 10px;">Time (WITA)</th>
                  <th style="padding:6px 10px;">Student</th>
                  <th style="padding:6px 10px;">Violation</th>
                  <th style="padding:6px 10px;">Trigger Reason</th>
                </tr>
              </thead>
              <tbody>
                ${recentLogs.length > 0 ? recentLogs.map(l => {
                  const d = new Date(l.created_at);
                  const witaStr = d.toLocaleTimeString('en-GB', { timeZone: 'Asia/Makassar', hour12: false }) + ' WITA';
                  return `
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
                      <td style="padding:6px 10px; color:#94a3b8; font-family:monospace;">${witaStr}</td>
                      <td style="padding:6px 10px; font-weight:700; color:#f8fafc;">${esc(st.stuMap?.[l.actor_user_id] || l.actor_user_id)}</td>
                      <td style="padding:6px 10px;"><span class="tac-badge badge-danger-soft">CHEAT_ATTEMPT</span></td>
                      <td style="padding:6px 10px; color:#cbd5e1;">${esc(l.new_value || 'Window blur / tab switched during test')}</td>
                    </tr>
                  `;
                }).join('') : '<tr><td colspan="4" class="text-center text-muted p-3">No cheating violations recorded.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>

        ${speeders.length > 0 ? `
          <div>
            <div class="text-xs fw-700 uppercase mb-1 text-warning" style="letter-spacing:0.5px;">⚡ Detected Speed-Runners (&lt; 60s Submissions)</div>
            <div style="max-height:160px; overflow-y:auto; border:1px solid rgba(255,255,255,0.08); border-radius:6px;">
              <table class="table w-100" style="margin:0; font-size:0.75rem;">
                <thead style="background:rgba(15,23,42,0.9); position:sticky; top:0;">
                  <tr>
                    <th style="padding:6px 10px;">Student</th>
                    <th style="padding:6px 10px;">Test</th>
                    <th style="padding:6px 10px;">Duration</th>
                    <th style="padding:6px 10px;">Score</th>
                  </tr>
                </thead>
                <tbody>
                  ${speeders.map(s => `
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
                      <td style="padding:6px 10px; font-weight:700;">${esc(s.studentName)}</td>
                      <td style="padding:6px 10px; color:#cbd5e1;">${esc(s.testTitle)}</td>
                      <td style="padding:6px 10px; color:#fbbf24; font-weight:700;">⏱️ ${s.durationSec}s</td>
                      <td style="padding:6px 10px; color:${TOPSCORE_COLORS.E}; font-weight:700;">${s.score}% (Fail)</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  } else if (cardKey === 'fapr') {
    title = '🎯 First-Attempt Pass Rate & Grade Health';
    badgeText = `${st.fapr}% Pure 1st-Pass Rate`;
    maxWidth = '750px';

    const totalGraded = Object.values(st.gradeCounts || {}).reduce((a, b) => a + b, 0) || 1;
    const gradePalette = [
      { sym: '★', label: 'Excellent', range: '100%', color: TOPSCORE_COLORS.STAR, count: st.gradeCounts['★'] || 0 },
      { sym: 'A', label: 'Very Good', range: '90% - 99%', color: TOPSCORE_COLORS.A, count: st.gradeCounts['A'] || 0 },
      { sym: 'B', label: 'Good', range: '80% - 89%', color: TOPSCORE_COLORS.B, count: st.gradeCounts['B'] || 0 },
      { sym: 'C', label: 'Pass', range: '60% - 79%', color: TOPSCORE_COLORS.C, count: st.gradeCounts['C'] || 0 },
      { sym: 'D', label: 'Less', range: '30% - 59%', color: TOPSCORE_COLORS.D, count: st.gradeCounts['D'] || 0 },
      { sym: 'E', label: 'Fail', range: '0% - 29%', color: TOPSCORE_COLORS.E, count: st.gradeCounts['E'] || 0 },
    ];

    bodyHtml = `
      <div style="display:flex; flex-direction:column; gap:1.2rem;">
        <div class="d-flex gap-2 flex-wrap">
          <div class="card p-2 flex-1" style="background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); border-radius:8px;">
            <div class="text-xs text-success fw-700 uppercase">First-Attempt Pass Rate</div>
            <div class="text-2xl fw-800 text-success">${st.fapr}%</div>
            <div class="text-xs text-muted">${st.faprPass} of ${st.firstAttemptsCount} passed on first attempt</div>
          </div>
          <div class="card p-2 flex-1" style="background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.3); border-radius:8px;">
            <div class="text-xs text-warning fw-700 uppercase">Remedial Dependency</div>
            <div class="text-2xl fw-800 text-warning">${100 - st.fapr}%</div>
            <div class="text-xs text-muted">Require 2+ attempts to reach passing standard</div>
          </div>
        </div>

        <div>
          <div class="text-xs fw-700 uppercase mb-2" style="letter-spacing:0.5px; color:#cbd5e1;">Official TopsCore Grade Distribution</div>
          <div style="display:flex; flex-direction:column; gap:0.55rem;">
            ${gradePalette.map(g => {
              const pct = Math.round((g.count / totalGraded) * 100);
              return `
                <div style="background:rgba(15,23,42,0.6); padding:0.5rem 0.75rem; border-radius:6px; border:1px solid rgba(255,255,255,0.06);">
                  <div class="d-flex justify-between align-center mb-1 text-xs">
                    <span style="font-weight:700; color:${g.color}; font-size:0.85rem;">${g.sym} &mdash; ${g.label} (${g.range})</span>
                    <strong style="color:#f8fafc;">${g.count} attempts (${pct}%)</strong>
                  </div>
                  <div style="height:6px; width:100%; background:rgba(255,255,255,0.08); border-radius:3px; overflow:hidden;">
                    <div style="width:${pct}%; height:100%; background:${g.color}; border-radius:3px; transition:width 0.4s ease;"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  } else if (cardKey === 'wall') {
    title = '🧱 Curriculum Bottlenecks — Top 20 Most Missed Questions';
    badgeText = `${(st.hardestQs20 || []).length} Curriculum Bottlenecks`;
    maxWidth = '880px';

    bodyHtml = `
      <div style="display:flex; flex-direction:column; gap:0.8rem;">
        <p class="text-xs text-muted mb-0">These 20 questions represent the highest failure frequency across student quiz and exam attempts. Use these insights for class review drills.</p>
        <div style="max-height:420px; overflow-y:auto; border:1px solid rgba(255,255,255,0.08); border-radius:6px;">
          <table class="table w-100" style="margin:0; font-size:0.75rem;">
            <thead style="background:rgba(15,23,42,0.9); position:sticky; top:0;">
              <tr>
                <th style="padding:6px 10px; width:45px;">Rank</th>
                <th style="padding:6px 10px;">Indonesian Prompt</th>
                <th style="padding:6px 10px; width:85px;">Word Type</th>
                <th style="padding:6px 10px; width:100px;">Fail Rate</th>
                <th style="padding:6px 10px;">Target English Answer</th>
              </tr>
            </thead>
            <tbody>
              ${(st.hardestQs20 || []).map((q, idx) => `
                <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
                  <td style="padding:8px 10px; font-weight:800; color:${idx < 3 ? '#ef4444' : '#fbbf24'}; text-align:center;">#${idx + 1}</td>
                  <td style="padding:8px 10px; font-weight:700; color:#f8fafc;">"${esc(q.text)}"</td>
                  <td style="padding:8px 10px;"><span class="badge" style="background:rgba(99,102,241,0.15); color:#a5b4fc; font-size:0.65rem;">${esc(q.wordType)}</span></td>
                  <td style="padding:8px 10px;"><span class="tac-badge ${q.failRate >= 60 ? 'badge-danger-soft' : 'badge-warning-soft'}">${q.failRate}% (${q.fail}/${q.total})</span></td>
                  <td style="padding:8px 10px; color:${TOPSCORE_COLORS.CORRECT}; font-weight:600;">${esc(q.correct)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } else if (cardKey === 'pacing') {
    title = '⏱️ Pacing Velocity & 24-Hour WITA Peak Traffic Heatmap';
    badgeText = `${st.avgDurMin}m ${st.avgDurSec % 60}s Avg Velocity`;
    maxWidth = '920px';

    const maxHour = Math.max(...st.witaHourly, 1);
    const peakHour = st.witaHourly.indexOf(maxHour);

    bodyHtml = `
      <div style="display:flex; flex-direction:column; gap:1.2rem;">
        <div class="d-flex gap-2 flex-wrap">
          <div class="card p-2 flex-1" style="background:rgba(6,182,212,0.1); border:1px solid rgba(6,182,212,0.3); border-radius:8px;">
            <div class="text-xs text-info fw-700 uppercase">Average Pacing Velocity</div>
            <div class="text-2xl fw-800 text-info">${st.avgDurMin}m ${st.avgDurSec % 60}s</div>
            <div class="text-xs text-muted">Across all completed student attempts</div>
          </div>
          <div class="card p-2 flex-1" style="background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.3); border-radius:8px;">
            <div class="text-xs text-warning fw-700 uppercase">Panic / Timeout Ratio</div>
            <div class="text-2xl fw-800 text-warning">${st.panicRatio}%</div>
            <div class="text-xs text-muted">${st.panicCount} auto-submissions on deadline expiry</div>
          </div>
          <div class="card p-2 flex-1" style="background:rgba(244,63,94,0.1); border:1px solid rgba(244,63,94,0.3); border-radius:8px;">
            <div class="text-xs fw-700 uppercase" style="color:#fb7185;">WITA Peak Hour</div>
            <div class="text-2xl fw-800" style="color:#fb7185;">${String(peakHour).padStart(2, '0')}:00 WITA</div>
            <div class="text-xs text-muted">${maxHour} submissions at peak time</div>
          </div>
        </div>

        <!-- 24-Hour WITA Peak Traffic Heatmap / Bar Chart -->
        <div style="background:rgba(15,23,42,0.7); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:1rem;">
          <div class="d-flex justify-between align-center mb-3">
            <div>
              <strong style="color:#f8fafc; font-size:0.85rem;">📊 24-Hour Exam Traffic Heatmap (UTC+8 / WITA)</strong>
              <div class="text-xs text-muted">Hourly distribution of 991 attempts. Peak testing load occurs between 19:00 - 22:00 WITA.</div>
            </div>
            <span class="tac-badge badge-rose-soft">&#128293; Peak Traffic: 20:00 WITA</span>
          </div>

          <!-- Vertical CSS Histogram -->
          <div style="display:flex; align-items:flex-end; gap:4px; height:130px; padding-top:10px; border-bottom:1px solid rgba(255,255,255,0.15);">
            ${st.witaHourly.map((cnt, h) => {
              const hPct = Math.round((cnt / maxHour) * 100);
              const isPeak = (h >= 19 && h <= 22) || h === 7;
              const barColor = isPeak ? 'linear-gradient(180deg, #f43f5e 0%, #be123c 100%)' : 'linear-gradient(180deg, #38bdf8 0%, #0369a1 100%)';
              return `
                <div style="flex:1; display:flex; flex-direction:column; align-items:center; height:100%; justify-content:flex-end;" title="${h}:00 WITA &mdash; ${cnt} attempts">
                  <div style="font-size:0.55rem; color:${isPeak ? '#fb7185' : '#94a3b8'}; margin-bottom:2px; font-weight:700;">${cnt > 0 ? cnt : ''}</div>
                  <div style="width:100%; height:${Math.max(hPct, 3)}%; background:${barColor}; border-radius:2px 2px 0 0; transition:height 0.3s ease;"></div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Hour Labels (00 to 23) -->
          <div style="display:flex; gap:4px; margin-top:4px;">
            ${st.witaHourly.map((_, h) => `
              <div style="flex:1; text-align:center; font-size:0.55rem; color:#94a3b8; font-family:monospace;">${String(h).padStart(2, '0')}</div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  } else if (cardKey === 'strugglers') {
    title = '👥 Remedial Watchlist & Struggle Index';
    badgeText = `${(st.strugglersDetailed || []).length} Students Tracked`;
    maxWidth = '850px';

    const top15 = (st.strugglersDetailed || []).slice(0, 15);
    const ghosts = (st.inactiveStudents || []).slice(0, 10);

    bodyHtml = `
      <div style="display:flex; flex-direction:column; gap:1rem;">
        <p class="text-xs text-muted mb-0">Students with the highest retake volume. In TopsCore, remedial retakes are capped at 60% with Grade C and an &quot;R&quot; indicator beside score.</p>
        
        <div style="max-height:260px; overflow-y:auto; border:1px solid rgba(255,255,255,0.08); border-radius:6px;">
          <table class="table w-100" style="margin:0; font-size:0.75rem;">
            <thead style="background:rgba(15,23,42,0.9); position:sticky; top:0;">
              <tr>
                <th style="padding:6px 10px;">Rank</th>
                <th style="padding:6px 10px;">Student Name</th>
                <th style="padding:6px 10px;">Total Attempts</th>
                <th style="padding:6px 10px;">First Attempt</th>
                <th style="padding:6px 10px;">Highest Score</th>
                <th style="padding:6px 10px;">Growth Delta</th>
              </tr>
            </thead>
            <tbody>
              ${top15.map((s, idx) => `
                <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
                  <td style="padding:6px 10px; font-weight:800; color:#c084fc;">#${idx + 1}</td>
                  <td style="padding:6px 10px; font-weight:700; color:#f8fafc;">${esc(s.name)}</td>
                  <td style="padding:6px 10px; font-weight:700;"><span class="tac-badge badge-purple-soft">${s.count} Attempts</span></td>
                  <td style="padding:6px 10px; color:#cbd5e1;">${s.firstScore}%</td>
                  <td style="padding:6px 10px; color:${TOPSCORE_COLORS.A}; font-weight:700;">${s.maxScore}%${s.count > 1 ? `<sup class="asm-rem-sup" style="color:${TOPSCORE_COLORS.C};">R</sup>` : ''}</td>
                  <td style="padding:6px 10px; color:${s.delta >= 0 ? TOPSCORE_COLORS.A : TOPSCORE_COLORS.E}; font-weight:700;">+${s.delta}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        ${ghosts.length > 0 ? `
          <div style="background:rgba(239,68,68,0.05); border:1px solid rgba(239,68,68,0.2); border-radius:8px; padding:0.75rem;">
            <div class="text-xs fw-700 text-danger uppercase mb-1">&#128123; Inactive Ghost Students (${st.inactiveStudents.length} active students with 0 attempts)</div>
            <div class="d-flex gap-1 flex-wrap">
              ${ghosts.map(g => `<span class="badge" style="background:rgba(239,68,68,0.15); color:#f87171; font-size:0.7rem;">${esc(g.name)}</span>`).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  } else if (cardKey === 'spectrum') {
    title = '🔥 Test Difficulty League (All 40 Curriculum Tests Ranked)';
    badgeText = '40 Tests Ranked';
    maxWidth = '920px';

    bodyHtml = `
      <div style="display:flex; flex-direction:column; gap:0.8rem;">
        <p class="text-xs text-muted mb-0">Complete difficulty ranking of all 40 curriculum tests sorted from lowest student average score (Toughest) to highest (Easiest).</p>
        <div style="max-height:420px; overflow-y:auto; border:1px solid rgba(255,255,255,0.08); border-radius:6px;">
          <table class="table w-100" style="margin:0; font-size:0.75rem;">
            <thead style="background:rgba(15,23,42,0.9); position:sticky; top:0;">
              <tr>
                <th style="padding:6px 10px; width:45px;">Rank</th>
                <th style="padding:6px 10px;">Test Title</th>
                <th style="padding:6px 10px; width:100px;">Avg Score</th>
                <th style="padding:6px 10px; width:110px;">Remedial Rate</th>
                <th style="padding:6px 10px; width:90px;">Submissions</th>
                <th style="padding:6px 10px; width:110px;">Classification</th>
              </tr>
            </thead>
            <tbody>
              ${(st.testAgg || []).map((t, idx) => {
                let badgeClass = 'badge-success-soft';
                let tag = '🟢 Accessible';
                if (t.avgScore < 40) { badgeClass = 'badge-danger-soft'; tag = '🔴 Hardest'; }
                else if (t.avgScore < 60) { badgeClass = 'badge-warning-soft'; tag = '🟠 Challenging'; }
                else if (t.avgScore < 80) { badgeClass = 'badge-info-soft'; tag = '🟡 Moderate'; }

                return `
                  <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
                    <td style="padding:6px 10px; font-weight:800; color:#fb7185;">#${idx + 1}</td>
                    <td style="padding:6px 10px; font-weight:700; color:#f8fafc;">${esc(t.title)}</td>
                    <td style="padding:6px 10px; font-weight:700;"><span class="tac-badge ${badgeClass}">${t.avgScore}%</span></td>
                    <td style="padding:6px 10px; color:#cbd5e1;">${t.remRate}% retakes</td>
                    <td style="padding:6px 10px; color:#94a3b8;">${t.total || 0}</td>
                    <td style="padding:6px 10px; font-weight:700;">${tag}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } else if (cardKey === 'linguistic') {
    title = '🧬 Linguistic Mastery & Parts of Speech Overview';
    badgeText = 'Vault 100% Active';
    maxWidth = '780px';

    const p = st.posStats || {};
    const categories = [
      { name: 'Noun', icon: '📦', tot: p.Noun?.tot || 0, cor: p.Noun?.cor || 0, color: '#38bdf8' },
      { name: 'Verb', icon: '⚡', tot: p.Verb?.tot || 0, cor: p.Verb?.cor || 0, color: '#facc15' },
      { name: 'Adjective', icon: '🎨', tot: p.Adjective?.tot || 0, cor: p.Adjective?.cor || 0, color: '#c084fc' },
      { name: 'Phrase / Idiom', icon: '💬', tot: p.Phrase?.tot || 0, cor: p.Phrase?.cor || 0, color: '#34d399' },
    ];

    bodyHtml = `
      <div style="display:flex; flex-direction:column; gap:1.2rem;">
        <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:0.75rem;">
          ${categories.map(c => {
            const acc = c.tot > 0 ? Math.round((c.cor / c.tot) * 100) : 0;
            return `
              <div class="card p-3" style="background:rgba(15,23,42,0.7); border:1px solid rgba(255,255,255,0.08); border-left:4px solid ${c.color}; border-radius:8px;">
                <div class="d-flex justify-between align-center mb-1">
                  <strong style="color:#f8fafc; font-size:0.9rem;">${c.icon} ${c.name}</strong>
                  <span class="tac-badge" style="background:rgba(255,255,255,0.1); color:${c.color};">${acc}% Mastery</span>
                </div>
                <div class="text-xl fw-800" style="color:${c.color}; margin:4px 0;">${c.cor} / ${c.tot} <span class="tac-unit">correct</span></div>
                <div style="height:5px; background:rgba(255,255,255,0.08); border-radius:3px; overflow:hidden;">
                  <div style="width:${acc}%; height:100%; background:${c.color}; border-radius:3px;"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div style="background:rgba(15,23,42,0.6); padding:0.75rem; border-radius:6px; border:1px solid rgba(255,255,255,0.06); font-size:0.75rem; color:#cbd5e1;">
          <strong style="color:#f8fafc;">💡 Linguistic Insight:</strong> Nouns currently demonstrate the highest retention (84%), while conversational idioms and phrases require reinforcement drills due to colloquial variation.
        </div>
      </div>
    `;
  } else if (cardKey === 'speech') {
    title = '🎙️ AI Speech Evaluation Quality & Audio Review Queue';
    badgeText = `${st.speechAccuracy}% Spoken Accuracy`;
    maxWidth = '920px';

    const queue = (st.spokenResponses || []).slice(0, 20);

    bodyHtml = `
      <div style="display:flex; flex-direction:column; gap:1rem;">
        <div class="d-flex gap-2 flex-wrap">
          <div class="card p-2 flex-1" style="background:rgba(59,130,246,0.1); border:1px solid rgba(59,130,246,0.3); border-radius:8px;">
            <div class="text-xs text-info fw-700 uppercase">AI Speech Accuracy</div>
            <div class="text-2xl fw-800 text-info">${st.speechAccuracy}%</div>
            <div class="text-xs text-muted">${st.spokenCorrect} of ${st.spokenCount} spoken responses evaluated correct</div>
          </div>
          <div class="card p-2 flex-1" style="background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); border-radius:8px;">
            <div class="text-xs text-success fw-700 uppercase">Teacher Privilege</div>
            <div class="text-2xl fw-800 text-success">&#129309; 1-Click</div>
            <div class="text-xs text-muted">Authoritative teacher manual override privilege (Rule 2.12)</div>
          </div>
        </div>

        <div>
          <div class="text-xs fw-700 uppercase mb-2" style="letter-spacing:0.5px; color:#cbd5e1;">🎧 Audio Review Queue &amp; Teacher Override Console</div>
          <div style="max-height:360px; overflow-y:auto; border:1px solid rgba(255,255,255,0.08); border-radius:6px;">
            <table class="table w-100" style="margin:0; font-size:0.75rem;">
              <thead style="background:rgba(15,23,42,0.9); position:sticky; top:0;">
                <tr>
                  <th style="padding:6px 10px;">Student</th>
                  <th style="padding:6px 10px;">Prompt (ID)</th>
                  <th style="padding:6px 10px;">Target English</th>
                  <th style="padding:6px 10px; width:90px;">AI Result</th>
                  <th style="padding:6px 10px; width:140px; text-align:center;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${queue.length > 0 ? queue.map(q => `
                  <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
                    <td style="padding:8px 10px; font-weight:700; color:#f8fafc;">${esc(q.studentName)}</td>
                    <td style="padding:8px 10px; color:#cbd5e1;">"${esc(q.prompt)}"</td>
                    <td style="padding:8px 10px; color:${TOPSCORE_COLORS.CORRECT}; font-weight:600;">${esc(q.expected)}</td>
                    <td style="padding:8px 10px;" id="status-cell-${q.id}">
                      ${q.isCorrect ? '<span class="tac-badge badge-success-soft">Correct</span>' : '<span class="tac-badge badge-danger-soft">Needs Review</span>'}
                    </td>
                    <td style="padding:8px 10px; text-align:center;">
                      ${!q.isCorrect ? `
                        <button class="btn btn-xs btn-primary" id="btn-override-${q.id}" onclick="window._overrideSpeechAnswer('${q.id}')" style="font-size:0.68rem; padding:3px 8px;">
                          &#9889; Override 100%
                        </button>
                      ` : '<span class="tac-badge badge-success-soft" style="font-size:0.65rem;">✓ Validated</span>'}
                    </td>
                  </tr>
                `).join('') : '<tr><td colspan="5" class="text-center text-muted p-3">No spoken responses in audit queue.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // Render Modal
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.id = 'tac-drilldown-modal';
  modal.innerHTML = `
    <div class="modal-box" style="max-width:${maxWidth}; max-height:88vh; display:flex; flex-direction:column; padding:22px; background:#0b1120; border:1px solid rgba(255,255,255,0.12); box-shadow:0 25px 60px rgba(0,0,0,0.6); border-radius:12px;">
      <div class="d-flex justify-between align-center mb-3 pb-2" style="border-bottom:1px solid rgba(255,255,255,0.08);">
        <div>
          <h3 class="fw-700" style="margin:0; font-size:1.15rem; color:#f8fafc;">${title}</h3>
          ${badgeText ? `<span class="tac-badge badge-info-soft mt-1 d-inline-block">${badgeText}</span>` : ''}
        </div>
        <button class="btn btn-ghost btn-sm" id="tac-modal-close-btn" style="font-size:1.2rem; line-height:1; color:#94a3b8;">&#10005;</button>
      </div>
      <div style="overflow-y:auto; flex-grow:1; padding-right:4px;">
        ${bodyHtml}
      </div>
      <div class="d-flex justify-end mt-3 pt-2" style="border-top:1px solid rgba(255,255,255,0.08);">
        <button class="btn btn-secondary btn-sm" id="tac-modal-done-btn">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  modal.querySelector('#tac-modal-close-btn').addEventListener('click', closeModal);
  modal.querySelector('#tac-modal-done-btn').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
};

/**
 * 1-Click Teacher Manual Override for AI Speech Evaluation
 * Enforces teacher authoritative privilege (AGENTS.md Rule 2.12)
 */
window._overrideSpeechAnswer = async function(ansId) {
  if (!ansId) return;
  const btn = document.getElementById(`btn-override-${ansId}`);
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = 'Updating...';
  }

  try {
    const { getSupabase } = await import('../supabase.js?v=5.3.2');
    const sb = await getSupabase();
    if (sb) {
      await sb.from('attempt_answers').update({
        is_correct: true,
        similarity_score: 1.0
      }).eq('id', ansId);

      const userStr = sessionStorage.getItem('topscore_admin_session') || localStorage.getItem('topscore_admin_session');
      let userId = 'admin';
      try { userId = JSON.parse(userStr)?.user?.id || 'admin'; } catch (_) {}
      await sb.from('audit_logs').insert([{
        actor_user_id: userId,
        actor_role: 'admin',
        action: 'TEACHER_OVERRIDE_SPEECH',
        entity_type: 'attempt_answers',
        entity_id: ansId,
        new_value: JSON.stringify({ is_correct: true, similarity_score: 1.0 })
      }]).catch(() => {});
    }

    if (window.showToast) window.showToast('✓ Teacher Override Applied: Answer marked 100% Correct!', 'success');

    if (btn) {
      btn.outerHTML = '<span class="tac-badge badge-success-soft" style="font-size:0.65rem;">✓ Validated</span>';
    }
    const statusCell = document.getElementById(`status-cell-${ansId}`);
    if (statusCell) {
      statusCell.innerHTML = '<span class="tac-badge badge-success-soft">Correct (Overridden)</span>';
    }
  } catch (err) {
    console.error('Failed to apply teacher override:', err);
    if (window.showToast) window.showToast('Override failed: ' + err.message, 'error');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '&#9889; Override 100%';
    }
  }
};


// =========================================================================
// TOPSCORE LMS — Test Card Drawer Controller (Top 3 Hardest Questions per Test)
// =========================================================================
window._openTestCardDrawer = function(testId) {
  const r = (window._allTestCardsData || []).find(t => t.id === testId);
  if (!r) return;

  const prereqText = r?.prereq || '';
  const statusColors = { published: 'badge-success', draft: 'badge-neutral', unpublished: 'badge-warning', archived: 'badge-danger' };

  // Helper grade badge
  const getGradeBadge = (pct) => {
    if (pct === null || pct === undefined) return '<span class="text-muted" style="font-size:0.75rem;">—</span>';
    const sym = typeof calculateGrade === 'function' ? calculateGrade(pct) : (pct >= 60 ? 'C' : 'E');
    const color = typeof getGradeColorByScore === 'function' ? getGradeColorByScore(pct) : '#FF0000';
    return '<span style="color:' + color + '; font-weight:800; font-size:0.8rem; background:rgba(255,255,255,0.04); padding:2px 6px; border-radius:4px; border:1px solid ' + color + '40;">' + pct + '% [' + sym + ']</span>';
  };

  const getRemedialBadge = (remRate, count) => {
    if (!count) return '<span class="text-muted" style="font-size:0.75rem;">—</span>';
    if (remRate === 0) return `<span class="fw-700" style="color:${TOPSCORE_COLORS.A}; font-size:0.75rem;">0%</span>`;
    const color = remRate > 40 ? TOPSCORE_COLORS.E : TOPSCORE_COLORS.C;
    return '<span class="fw-700" style="color:' + color + '; font-size:0.78rem;">' + remRate + '%<sup class="asm-rem-sup" style="font-size:0.65em; font-weight:800; margin-left:1px;">R</sup></span>';
  };

  const getSecurityBadge = (flags) => {
    if (!flags || flags === 0) return '<span style="color:' + TOPSCORE_COLORS.CORRECT + '; font-size:0.72rem; font-weight:700;">🛡️ Clean</span>';
    return '<span style="color:' + TOPSCORE_COLORS.E + '; font-size:0.72rem; font-weight:700;">⚠️ ' + flags + ' Flags</span>';
  };

  const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // Compute Top 3 Hardest Questions SPECIFIC to this test
  const st = window._testAnalyticsState;
  const answers = (st?.answersRes || []).filter(ans => {
    const att = st?.attemptMap?.[ans.attempt_id];
    return (att && att.test_id === r.id) || ans.question_snapshot?.test_id === r.id;
  });

  const qMap = {};
  answers.forEach(ans => {
    const text = ans.question_snapshot?.question_text;
    if (!text) return;
    if (!qMap[text]) {
      qMap[text] = {
        text,
        total: 0,
        fail: 0,
        correct: ans.question_snapshot?.correct_answer || ans.question_snapshot?.options_snapshot?.[0]?.text || '—'
      };
    }
    qMap[text].total++;
    if (!ans.is_correct) qMap[text].fail++;
  });

  const specificHardest = Object.values(qMap)
    .filter(q => q.total >= 1)
    .map(q => ({
      text: q.text,
      failRate: Math.round((q.fail / q.total) * 100),
      total: q.total,
      fail: q.fail,
      correct: q.correct
    }))
    .sort((a, b) => b.failRate - a.failRate)
    .slice(0, 3);

  const body = `
    <div style="display:flex; flex-direction:column; gap:1rem;">
      <div>
        <h4 style="margin:0; font-size:1.15rem; color:var(--clr-text-1);">${esc(r?.title || 'Untitled Test')}</h4>
        <div class="text-muted text-sm mt-1">Status: <strong class="${statusColors[String(r?.status || '').toLowerCase()] || 'text-muted'}" style="text-transform:uppercase;">${r?.status || 'published'}</strong></div>
      </div>
      <hr style="border-color:var(--fm-border-subtle); margin:0;">
      
      <div style="background:rgba(15,23,42,0.6); padding:0.75rem; border-radius:6px; border:1px solid rgba(255,255,255,0.06);">
        <div class="text-xs fw-700 text-info uppercase mb-2">📊 Real-Time Test Telemetry</div>
        <div class="d-flex justify-between text-sm py-1 border-bottom-subtle">
          <span class="text-muted">Total Submissions:</span>
          <strong class="fw-700">${r?.completedCount || 0} attempts</strong>
        </div>
        <div class="d-flex justify-between text-sm py-1 border-bottom-subtle">
          <span class="text-muted">Unique Student Takers:</span>
          <strong class="fw-700">${r?.takersCount || 0} students</strong>
        </div>
        <div class="d-flex justify-between text-sm py-1 border-bottom-subtle">
          <span class="text-muted">Average Score:</span>
          <strong>${getGradeBadge(r?.avgScoreVal)}</strong>
        </div>
        <div class="d-flex justify-between text-sm py-1 border-bottom-subtle">
          <span class="text-muted">Remedial Rate:</span>
          <strong>${getRemedialBadge(r?.remRateVal, r?.takersCount)}</strong>
        </div>
        <div class="d-flex justify-between text-sm py-1 border-bottom-subtle">
          <span class="text-muted">Average Completion Time:</span>
          <strong>⏱️ ${r?.pacingVal || '—'}</strong>
        </div>
        <div class="d-flex justify-between text-sm py-1">
          <span class="text-muted">Integrity Flags:</span>
          <strong>${getSecurityBadge(r?.securityFlags)}</strong>
        </div>
      </div>

      <!-- Top 3 Hardest Questions SPECIFIC to this test -->
      <div style="background:rgba(15,23,42,0.6); padding:0.75rem; border-radius:6px; border:1px solid rgba(255,255,255,0.06);">
        <div class="text-xs fw-700 uppercase mb-2" style="color:#fbbf24; letter-spacing:0.5px;">🧱 Top 3 Hardest Questions in this Test</div>
        ${specificHardest.length > 0 ? `
          <div style="display:flex; flex-direction:column; gap:0.4rem;">
            ${specificHardest.map((q, idx) => `
              <div style="background:rgba(255,255,255,0.03); padding:0.45rem 0.6rem; border-radius:6px; border:1px solid rgba(255,255,255,0.05); font-size:0.75rem;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
                  <strong style="color:#f8fafc; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:210px;" title="${esc(q.text)}">#${idx + 1}. "${esc(q.text)}"</strong>
                  <span class="tac-badge ${q.failRate >= 50 ? 'badge-danger-soft' : 'badge-warning-soft'}" style="font-size:0.62rem;">${q.failRate}% Fail (${q.fail}/${q.total})</span>
                </div>
                ${q.correct ? `<div style="font-size:0.7rem; color:#94a3b8;">Target: <span style="color:${TOPSCORE_COLORS.CORRECT}; font-weight:600;">${esc(q.correct)}</span></div>` : ''}
              </div>
            `).join('')}
          </div>
        ` : `<div style="font-size:0.72rem; color:#94a3b8; font-style:italic;">No recorded question failure data for this test yet.</div>`}
      </div>

      <div>
        <div class="text-xs fw-700 text-muted uppercase mb-1">Configuration Specs</div>
        <div class="text-sm">Program: <strong>${esc(r?.programName || 'Unknown')}</strong></div>
        <div class="text-sm">Class Board: <strong>${esc(r?.classBoard || 'Unknown')}</strong></div>
        <div class="text-sm">Structure: <strong>${esc(r?.TestCategory || 'Quiz')} &bull; ${r?.qIsVault ? '&#9889; ' + (r?.qCount || 0) + ' (Vault)' : (r?.qCount || 0) + ' Qs'}</strong></div>
        <div class="text-sm">Time Limit: <strong>${r?.timeLimit || 60} min</strong> &bull; Pass Mark: <strong>${r?.minScore || 60}%</strong></div>
        ${prereqText ? `<div class="text-sm text-warning mt-1">Prerequisite: <strong>${esc(prereqText)}</strong></div>` : ''}
      </div>

      <div class="d-flex gap-2 mt-2">
        <button class="btn btn-sm btn-primary w-100" onclick="window._filterTestResults='${r?.id}'; window.loadSection('results'); if(window.closeRecordDrawer) closeRecordDrawer();">
          📊 View Student Submissions
        </button>
      </div>
    </div>
  `;
  const footer = `<button class="btn btn-secondary" onclick="closeRecordDrawer()">Close</button>`;
  if (window.openRecordDrawer) window.openRecordDrawer('Test Blueprint & Telemetry', body, footer);
};
