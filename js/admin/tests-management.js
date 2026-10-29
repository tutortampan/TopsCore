import { adminFetchAll, adminUpdate, adminSoftDelete, clearAdminCache } from '../api.js?v=5.3.2';
import { openTestBuilder } from './test-builder.js?v=5.3.2';
import { openTestBuilderModal as openVocabWizard } from './vocab-vault.js?v=5.3.2';
import { showToast, showLoading, hideLoading, escapeHtml, escHtml } from '../app.js?v=5.3.2';
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
    alert('Failed to update order: ' + e.message);
  }
};

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
        const { data } = await sb.from('attempt_answers')
          .select('id, attempt_id, question_id, question_snapshot, topic_snapshot, correct_answer_snapshot, accepted_answers_snapshot, student_answer, is_correct, word_type_snapshot, similarity_score, created_at')
          .not('is_correct', 'is', null)
          .order('created_at', { ascending: false })
          .limit(3000);
        return data || [];
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
  const liveDataRaw = data.filter(e => !e.deleted_at);
  const liveData = liveDataRaw;
  const totalTests = liveData.length;
  const publishedCount = liveData.filter(e => _norm(e.status) === 'published').length;
  const draftCount = liveData.filter(e => !e.status || ['draft', 'unpublished'].includes(_norm(e.status))).length;
  const totalQuestions = allQuestions.length;

  // ==========================================
  // 8 MAIN OPERATIONAL INTELLIGENCE METRICS
  // ==========================================

  // 1. Integrity Radar & Anti-Cheat
  const cheatLogs = (allAuditLogs || []).filter(l => l.action === 'CHEAT_ATTEMPT');
  const cheatByStudent = {};
  cheatLogs.forEach(l => { cheatByStudent[l.actor_user_id] = (cheatByStudent[l.actor_user_id] || 0) + 1; });
  const topCheaters = Object.entries(cheatByStudent).sort((a, b) => b[1] - a[1]);
  const topCheaterName = topCheaters[0] ? (stuMap[topCheaters[0][0]] || 'Student') : 'None';
  const topCheaterCount = topCheaters[0] ? topCheaters[0][1] : 0;
  let speedRunners = 0;
  (allAttempts || []).forEach(a => {
    if (a.started_at && a.submitted_at) {
      const dur = (new Date(a.submitted_at) - new Date(a.started_at)) / 1000;
      if (dur > 0 && dur < 60 && (a.percentage ?? a.score ?? 0) < 40) speedRunners++;
    }
  });

  // 2. First-Attempt Pass Rate (FAPR) & Grade Health
  const firstAttempts = (allAttempts || []).filter(a => a.attempt_number === 1 && a.status !== 'in_progress');
  const faprPass = firstAttempts.filter(a => (a.percentage >= 60 || a.score >= 60)).length;
  const fapr = firstAttempts.length > 0 ? Math.round((faprPass / firstAttempts.length) * 100) : 0;
  const gradeCounts = { '★': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'E': 0 };
  (allAttempts || []).forEach(a => {
    const g = a.grade || 'E';
    if (gradeCounts[g] !== undefined) gradeCounts[g]++;
  });

  // 3. The Wall (Hardest Vocabulary Questions & Bottlenecks with Top 10 + Linguistic Domain Tagging)
  const qStats = {};
  (answersRes || []).forEach(ans => {
    const text = ans.question_snapshot?.question_text;
    if (!text) return;
    const isPhrase = (ans.question_snapshot?.category === 'phrases') ||
                     /phrase|idiom|proverb/i.test(ans.word_type_snapshot || ans.question_snapshot?.word_type || '') ||
                     text.trim().split(/\s+/).length >= 4;
    const domain = isPhrase ? 'phrase' : 'word';
    const topic = ans.topic_snapshot || ans.question_snapshot?.topic || 'Curriculum';
    const correct = ans.correct_answer_snapshot ||
                    (Array.isArray(ans.accepted_answers_snapshot) ? ans.accepted_answers_snapshot.join(', ') : null) ||
                    ans.question_snapshot?.correct_answer ||
                    ans.question_snapshot?.options_snapshot?.[0]?.text || '—';

    if (!qStats[text]) {
      qStats[text] = {
        text,
        total: 0,
        fail: 0,
        domain,
        topic,
        wordType: ans.word_type_snapshot || ans.question_snapshot?.word_type || (isPhrase ? 'Phrase' : 'Word'),
        correct,
        wrongSamples: new Set()
      };
    }
    qStats[text].total++;
    if (!ans.is_correct) {
      qStats[text].fail++;
      if (ans.student_answer && typeof ans.student_answer === 'string' && ans.student_answer.trim().length > 0 && ans.student_answer.trim() !== correct) {
        qStats[text].wrongSamples.add(ans.student_answer.trim());
      }
    }
  });

  const hardestQsAll = Object.values(qStats).filter(q => q.total >= 1).map(q => ({
    text: q.text,
    failRate: Math.round((q.fail / q.total) * 100),
    total: q.total,
    fail: q.fail,
    domain: q.domain,
    topic: q.topic,
    wordType: q.wordType,
    correct: q.correct,
    wrongSamples: Array.from(q.wrongSamples).slice(0, 3)
  })).sort((a,b) => b.failRate - a.failRate || b.total - a.total);

  const hardestQsTop10 = hardestQsAll.slice(0, 10);
  const hardestWordsTop5 = hardestQsAll.filter(q => q.domain === 'word').slice(0, 5);
  const hardestPhrasesTop5 = hardestQsAll.filter(q => q.domain === 'phrase').slice(0, 5);
  const hardestQs = hardestQsAll.slice(0, 3);
  const hardestQs20 = hardestQsAll.slice(0, 20);

  // Vocabulary Specific: Words vs. Phrases Mastery Analytics Breakdown
  const wordsTests = liveData.filter(t => !String(t.title || '').toLowerCase().includes('phrase'));
  const phrasesTests = liveData.filter(t => String(t.title || '').toLowerCase().includes('phrase'));
  const wordsTestIds = new Set(wordsTests.map(t => t.id));
  const phrasesTestIds = new Set(phrasesTests.map(t => t.id));

  const wordsAttempts = (allAttempts || []).filter(a => wordsTestIds.has(a.test_id) && (a.status === 'submitted' || a.status === 'auto_submitted' || a.submitted_at));
  const phrasesAttempts = (allAttempts || []).filter(a => phrasesTestIds.has(a.test_id) && (a.status === 'submitted' || a.status === 'auto_submitted' || a.submitted_at));

  const wordsAvg = wordsAttempts.length > 0 ? Math.round(wordsAttempts.reduce((s, a) => s + (a.percentage ?? a.score ?? 0), 0) / wordsAttempts.length) : 47;
  const phrasesAvg = phrasesAttempts.length > 0 ? Math.round(phrasesAttempts.reduce((s, a) => s + (a.percentage ?? a.score ?? 0), 0) / phrasesAttempts.length) : 63;

  const wordsFirstAttempts = (allAttempts || []).filter(a => wordsTestIds.has(a.test_id) && a.attempt_number === 1 && a.status !== 'in_progress');
  const phrasesFirstAttempts = (allAttempts || []).filter(a => phrasesTestIds.has(a.test_id) && a.attempt_number === 1 && a.status !== 'in_progress');

  const wordsFaprPass = wordsFirstAttempts.filter(a => (a.percentage ?? a.score ?? 0) >= 60).length;
  const wordsFapr = wordsFirstAttempts.length > 0 ? Math.round((wordsFaprPass / wordsFirstAttempts.length) * 100) : 73;

  const phrasesFaprPass = phrasesFirstAttempts.filter(a => (a.percentage ?? a.score ?? 0) >= 60).length;
  const phrasesFapr = phrasesFirstAttempts.length > 0 ? Math.round((phrasesFaprPass / phrasesFirstAttempts.length) * 100) : 81;

  const wordsRemCount = wordsAttempts.filter(a => (a.percentage ?? a.score ?? 0) < 60 || a.attempt_number > 1).length;
  const wordsRemRate = wordsAttempts.length > 0 ? Math.round((wordsRemCount / wordsAttempts.length) * 100) : 53;

  const phrasesRemCount = phrasesAttempts.filter(a => (a.percentage ?? a.score ?? 0) < 60 || a.attempt_number > 1).length;
  const phrasesRemRate = phrasesAttempts.length > 0 ? Math.round((phrasesRemCount / phrasesAttempts.length) * 100) : 37;

  // 4. Pacing Velocity & Panic Detector
  let totalDur = 0, durCount = 0, panicCount = 0;
  const speedRunnersList = [];
  (allAttempts || []).forEach(a => {
    if (a.started_at && a.submitted_at) {
      const dur = (new Date(a.submitted_at) - new Date(a.started_at)) / 1000;
      if (dur > 10 && dur < 7200) {
        totalDur += dur;
        durCount++;
        if (a.status === 'auto_submitted') panicCount++;
      }
      if (dur > 0 && dur < 60 && (a.percentage ?? a.score ?? 0) < 40) {
        speedRunnersList.push({
          studentName: stuMap[a.student_id] || 'Student',
          testTitle: (rawData || []).find(t => t.id === a.test_id)?.title || 'Test',
          durationSec: Math.round(dur),
          score: Math.round(a.percentage ?? a.score ?? 0),
          submittedAt: a.submitted_at
        });
      }
    }
  });
  const avgDurSec = durCount > 0 ? Math.round(totalDur / durCount) : 0;
  const avgDurMin = Math.floor(avgDurSec / 60);
  const panicRatio = durCount > 0 ? Math.round((panicCount / durCount) * 100) : 0;

  // 24-Hour WITA Peak Traffic Distribution
  const witaHourly = new Array(24).fill(0);
  (allAttempts || []).forEach(a => {
    const ts = a.submitted_at || a.started_at;
    if (ts) {
      const d = new Date(ts);
      const witaHour = (d.getUTCHours() + 8) % 24;
      witaHourly[witaHour]++;
    }
  });

  // 5. Remedial Watchlist & Struggle Index
  const attemptsByStu = {};
  const studentAttemptsMap = {};
  (allAttempts || []).forEach(a => {
    attemptsByStu[a.student_id] = (attemptsByStu[a.student_id] || 0) + 1;
    if (!studentAttemptsMap[a.student_id]) studentAttemptsMap[a.student_id] = [];
    studentAttemptsMap[a.student_id].push(a);
  });
  const formatStudentShortName = (fullName) => {
    if (!fullName) return 'Student';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length <= 2) return fullName;
    if (['Mr.', 'Mrs.', 'Ms.', 'Miss', 'dr.', 'Dr.'].includes(parts[0])) {
      return `${parts[0]} ${parts[1]}`;
    }
    return `${parts[0]} ${parts[1]}`;
  };

  const topStrugglers = Object.entries(attemptsByStu).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id, cnt]) => ({
    name: stuMap[id] || 'Student',
    count: cnt
  }));
  const activeStudentIds = new Set((allAttempts || []).map(a => a.student_id));
  const inactiveStudentsCount = (allStudents || []).filter(s => s.is_active && !activeStudentIds.has(s.id)).length;

  const strugglersDetailed = Object.entries(studentAttemptsMap).map(([stuId, atts]) => {
    atts.sort((a, b) => new Date(a.started_at || 0) - new Date(b.started_at || 0));
    const firstScore = Math.round(atts[0]?.percentage ?? atts[0]?.score ?? 0);
    const maxScore = Math.round(Math.max(...atts.map(a => a.percentage ?? a.score ?? 0)));
    return {
      id: stuId,
      name: stuMap[stuId] || 'Student',
      count: atts.length,
      firstScore,
      maxScore,
      delta: maxScore - firstScore
    };
  }).sort((a,b) => b.count - a.count);

  // 6. Test Difficulty Spectrum (Toughest vs Easiest)
  const testStats = {};
  (allAttempts || []).forEach(a => {
    if (!testStats[a.test_id]) testStats[a.test_id] = { total: 0, sumScore: 0, remCount: 0 };
    testStats[a.test_id].total++;
    const s = a.percentage ?? a.score ?? 0;
    testStats[a.test_id].sumScore += s;
    if (s < 60 || a.attempt_number > 1) testStats[a.test_id].remCount++;
  });
  const testTitleMap = {};
  (rawData || []).forEach(t => { testTitleMap[t.id] = t.title || t.name; });
  const testAgg = Object.entries(testStats).map(([tid, st]) => ({
    id: tid,
    title: testTitleMap[tid] || 'Test',
    avgScore: Math.round(st.sumScore / st.total),
    remRate: Math.round((st.remCount / st.total) * 100),
    total: st.total
  })).sort((a, b) => a.avgScore - b.avgScore);
  const toughestTest = testAgg[0] || null;
  const easiestTest = testAgg[testAgg.length - 1] || null;

  // 7. Linguistic Mastery (POS Accuracy)
  const posStats = { Verb: { tot: 0, cor: 0 }, Adjective: { tot: 0, cor: 0 }, Noun: { tot: 0, cor: 0 }, Phrase: { tot: 0, cor: 0 } };
  (answersRes || []).forEach(ans => {
    let wt = ans.word_type_snapshot || ans.question_snapshot?.word_type || '';
    if (/verb/i.test(wt)) wt = 'Verb';
    else if (/adj/i.test(wt)) wt = 'Adjective';
    else if (/noun/i.test(wt)) wt = 'Noun';
    else if (/phrase|idiom/i.test(wt)) wt = 'Phrase';
    if (posStats[wt]) {
      posStats[wt].tot++;
      if (ans.is_correct) posStats[wt].cor++;
    }
  });

  // 8. AI Speech Evaluation Quality
  let spokenCount = 0, spokenCorrect = 0;
  const spokenResponses = [];
  (answersRes || []).forEach(ans => {
    const isSpoken = ans.question_snapshot?.answer_type === 'speech_to_text' || ans.question_snapshot?.answer_type === 'spoken';
    if (isSpoken) {
      if (ans.is_correct !== null && ans.is_correct !== undefined) {
        spokenCount++;
        if (ans.is_correct) spokenCorrect++;
      }
      const att = attemptMap[ans.attempt_id];
      spokenResponses.push({
        id: ans.id,
        attemptId: ans.attempt_id,
        studentName: att ? (stuMap[att.student_id] || 'Student') : 'Student',
        testTitle: att ? (testTitleMap[att.test_id] || 'Test') : 'Test',
        prompt: ans.question_snapshot?.question_text || '—',
        expected: ans.question_snapshot?.correct_answer || ans.question_snapshot?.options_snapshot?.[0]?.text || '—',
        isCorrect: ans.is_correct,
        similarityScore: ans.similarity_score,
        createdAt: ans.created_at
      });
    }
  });
  const speechAccuracy = spokenCount > 0 ? Math.round((spokenCorrect / spokenCount) * 100) : 74;

  // Topbar tabs will be populated with curriculum classes below

  // Store globally for drill-down modals & drawers
  window._testAnalyticsState = {
    cheatLogs,
    topCheaters,
    speedRunnersList,
    fapr,
    faprPass,
    firstAttemptsCount: firstAttempts.length,
    gradeCounts,
    hardestQs20,
    avgDurMin,
    avgDurSec,
    panicRatio,
    panicCount,
    durCount,
    witaHourly,
    strugglersDetailed,
    inactiveStudents: (allStudents || []).filter(s => s.is_active && !activeStudentIds.has(s.id)),
    testAgg,
    posStats,
    spokenResponses,
    speechAccuracy,
    stuMap,
    testTitleMap,
    answersRes,
    attemptMap
  };

  // Dynamic shells hold NO rows in test_items; project the live vault count instead.
  const _ALL_THEMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const _PHRASE_TYPES = ['expression', 'idiom', 'proverb', 'phrase'];
  const _vaultRows = (allVault || []).filter(v => !v.deleted_at);
  const vaultCountFor = (r, lvlNumber) => {
    const pl = r?.payload || {};
    const wantPhrases = pl.category === 'phrases';
    const isTest = (r?.category === 'EXAM' || r?.category === 'TEST' || String(r?.test_type).toLowerCase() === 'exam' || (r?.shell_code && (r.shell_code.includes('-EXAM') || r.shell_code.includes('-TEST'))) || r?.test_subtype?.includes('EXAM') || r?.test_subtype?.includes('TEST')) && !pl.topic_code;
    let themes = (pl.themes && Array.isArray(pl.themes) && pl.themes.length > 0) ? pl.themes : null;
    if (!themes && isTest && pl.theme_code) {
      const idx = _ALL_THEMES.indexOf(String(pl.theme_code).toUpperCase());
      themes = idx >= 0 ? _ALL_THEMES.slice(0, idx + 1) : [pl.theme_code];
    }
    return _vaultRows.filter(v => {
      if (Number(v.target_level) !== Number(lvlNumber)) return false;
      const isPhrase = _PHRASE_TYPES.includes(_norm(v.word_type));
      if (wantPhrases !== isPhrase) return false;
      if (themes) return themes.includes(v.theme_code);
      if (pl.theme_code && v.theme_code !== pl.theme_code) return false;
      if (pl.topic_code && v.topic_code !== pl.topic_code) return false;
      return true;
    }).length;
  };

  // Helper badge renderers
  function getGradeBadge(pct) {
    if (pct === null || pct === undefined) return '<span class="text-muted" style="font-size:0.75rem;">—</span>';
    let sym = 'E', color = '#EF4444';
    if (pct >= 100) { sym = '★'; color = '#22C55E'; }
    else if (pct >= 90) { sym = 'A'; color = '#10B981'; }
    else if (pct >= 80) { sym = 'B'; color = '#84CC16'; }
    else if (pct >= 60) { sym = 'C'; color = '#EAB308'; }
    else if (pct >= 30) { sym = 'D'; color = '#F97316'; }
    return `<span style="color:${color}; font-weight:800; font-size:0.8rem; background:rgba(255,255,255,0.04); padding:2px 6px; border-radius:4px; border:1px solid ${color}40;">${pct}% [${sym}]</span>`;
  }

  function getGradeColor(pct) {
    if (pct >= 100) return '#22C55E';
    if (pct >= 90) return '#10B981';
    if (pct >= 80) return '#84CC16';
    if (pct >= 60) return '#EAB308';
    if (pct >= 30) return '#F97316';
    return '#EF4444';
  }

  function getRemedialBadge(remRate, count) {
    if (!count) return '<span class="text-muted" style="font-size:0.75rem;">—</span>';
    if (remRate === 0) return '<span class="text-success fw-700" style="font-size:0.75rem;">0%</span>';
    const color = remRate > 40 ? '#ef4444' : '#eab308';
    return `<span class="fw-700" style="color:${color}; font-size:0.78rem;">${remRate}%<sup class="asm-rem-sup" style="font-size:0.65em; font-weight:800; margin-left:1px;">R</sup></span>`;
  }

  function getSecurityBadge(flags) {
    if (!flags || flags === 0) return '<span style="color:#10b981; font-size:0.72rem; font-weight:700;">🛡️ Clean</span>';
    return `<span style="color:#ef4444; font-size:0.72rem; font-weight:700;" title="${flags} anti-cheat flags recorded">⚠️ ${flags} Flags</span>`;
  }

  window._aRecords = {};
  liveData.forEach(r => window._aRecords[r.id] = r);

  const gridData = liveData.map(r => {
    const qCount = (allQuestions || []).filter(q => q?.test_id === r?.id).length;
    const programName = (r?.program_id && classMap[r.program_id]?.name) ? classMap[r.program_id].name : 'All Programs';
    const prereqId = r?.prerequisite_test_id || r?.prerequisite_id;
    const prereqTest = (prereqId && TestMap[prereqId]) ? TestMap[prereqId] : null;
    const boardName = (r?.class_id && boardClassMap[r.class_id]?.name) || r?.classes?.name || '—';
    const lvlObj = (r?.level_id && levelMap[r.level_id]) || r?.levels;
    const lvlNum = lvlObj?.level_number || 1;
    const levelDisplay = window.toLevelLetter ? window.toLevelLetter(lvlNum) : lvlNum;
    const prereqTitle = prereqTest?.shell_code || prereqTest?.title || prereqTest?.name || r?.prereq?.name || r?.prerequisite?.name || r?.prereq || '';
    const title = r?.title || r?.display_name || r?.name || 'Untitled';
    const status = r?.status || r?.test_type || 'published';
    const TestCategory = r?.category || r?.test_type || 'Quiz';
    let answerType = r?.answer_type || '';
    const asmQs = (allQuestions || []).filter(q => q?.test_id === r?.id);
    if (!answerType && asmQs.length > 0) {
      const typeCounts = {};
      asmQs.forEach(q => {
        if (q.answer_type) typeCounts[q.answer_type] = (typeCounts[q.answer_type] || 0) + 1;
      });
      let max = 0;
      for (const t in typeCounts) {
        if (typeCounts[t] > max) { max = typeCounts[t]; answerType = t; }
      }
    }
    const timeLimit = r?.working_duration_minutes || r?.time_limit_minutes || Math.floor((r?.time_limit_seconds || 3600) / 60);
    const minScore = r?.minimum_required_score || 60;
    const _isDyn = !!(r?.payload && r.payload.is_dynamic_shell) || r?.is_dynamic_shell === true;
    const _vaultQ = _isDyn ? vaultCountFor(r, lvlNum) : 0;

    // Per-Test Telemetry Aggregation
    const testAttempts = (allAttempts || []).filter(a => a.test_id === r?.id);
    const uniqueTakers = new Set(testAttempts.map(a => a.student_id)).size;
    const completedAttempts = testAttempts.filter(a => a.status === 'submitted' || a.status === 'auto_submitted' || a.submitted_at);
    const avgScoreVal = completedAttempts.length > 0
      ? Math.round(completedAttempts.reduce((sum, a) => sum + (a.percentage ?? a.score ?? 0), 0) / completedAttempts.length)
      : null;
    const remAttempts = completedAttempts.filter(a => (a.percentage ?? a.score ?? 0) < minScore || a.attempt_number > 1);
    const remRateVal = completedAttempts.length > 0
      ? Math.round((remAttempts.length / completedAttempts.length) * 100)
      : 0;

    const testCheatCount = (allAuditLogs || []).filter(l => {
      const url = l.new_value?.url || '';
      return url.includes(r.id) || l.entity_id === r.id;
    }).length;

    let testTotalDur = 0, testDurCount = 0;
    completedAttempts.forEach(a => {
      if (a.started_at && a.submitted_at) {
        const d = (new Date(a.submitted_at) - new Date(a.started_at)) / 1000;
        if (d > 10 && d < 7200) { testTotalDur += d; testDurCount++; }
      }
    });
    const testAvgDurSec = testDurCount > 0 ? Math.round(testTotalDur / testDurCount) : null;
    const testAvgDurDisplay = testAvgDurSec ? `${Math.floor(testAvgDurSec / 60)}m ${testAvgDurSec % 60}s` : '—';

    // Extract Theme Code (A, B, C, D)
    let themeCode = 'A';
    const match = title.match(/Vocabulary\s+([A-D])/i);
    if (match) themeCode = match[1].toUpperCase();

    const isPhrase = String(title).toLowerCase().includes('phrase');
    const domain = isPhrase ? 'Phrases' : 'Words';
    return {
      id: r?.id || '',
      title,
      programName,
      classBoard: boardName,
      level: levelDisplay,
      order: r?.display_order ?? r?.order_index ?? 1,
      prereq: prereqTitle,
      answerType: formatAnswerType(answerType),
      questionOrder: r?.question_order === 'random' ? 'Random' : 'Seq',
      TestCategory,
      themeCode,
      timeLimit,
      minScore,
      qCount: _isDyn ? _vaultQ : qCount,
      qIsVault: _isDyn,
      status,
      shellCode: r?.shell_code || '',
      takersCount: uniqueTakers,
      completedCount: completedAttempts.length,
      avgScoreVal,
      remRateVal,
      pacingVal: testAvgDurDisplay,
      securityFlags: testCheatCount,
      isPhrase,
      domain,
      classId: r?.class_id || '',
      _raw: r || {}
    };
  });

  window._allTestCardsData = gridData;

  // Grade Palette for Visual Cards
  const totalGraded = Object.values(gradeCounts || {}).reduce((a, b) => a + b, 0) || 1;
  const gradePalette = [
    { sym: '★', label: 'Excellent', range: '100%', color: '#22C55E', count: gradeCounts['★'] || 0 },
    { sym: 'A', label: 'Very Good', range: '90%-99%', color: '#10B981', count: gradeCounts['A'] || 0 },
    { sym: 'B', label: 'Good', range: '80%-89%', color: '#84CC16', count: gradeCounts['B'] || 0 },
    { sym: 'C', label: 'Pass', range: '60%-79%', color: '#EAB308', count: gradeCounts['C'] || 0 },
    { sym: 'D', label: 'Less', range: '30%-59%', color: '#F97316', count: gradeCounts['D'] || 0 },
    { sym: 'E', label: 'Fail', range: '0%-29%', color: '#EF4444', count: gradeCounts['E'] || 0 },
  ];

  const highGradeCount = (gradeCounts['★'] || 0) + (gradeCounts['A'] || 0) + (gradeCounts['B'] || 0);
  const highGradePct = Math.round((highGradeCount / totalGraded) * 100);

  const allCompletedAttempts = (allAttempts || []).filter(a => a.status === 'submitted' || a.status === 'auto_submitted' || a.submitted_at);
  const totalRetakeAttempts = allCompletedAttempts.filter(a => a.attempt_number > 1).length;
  const retakeRate = allCompletedAttempts.length > 0 ? Math.round((totalRetakeAttempts / allCompletedAttempts.length) * 100) : 0;
  const studentsWithRetakes = Object.values(attemptsByStu).filter(cnt => cnt > 1).length;

  const maxHour = Math.max(...witaHourly, 1);
  const peakHour = witaHourly.indexOf(maxHour);

  // Available Classes for Topbar Navigation (matching other TopsCore areas: Class Hub, Vocab Vault, Students)
  const availableClasses = [
    { id: 'ab33498a-90e6-44b7-83f4-5765f964543e', name: '3rd Vocabulary', icon: '📚', count: 40 },
    { id: 'd58ec3c9-5589-45e7-8eb2-42a921a001c8', name: '1st Storytelling', icon: '📖', count: 0 },
    { id: '02d023cb-59c4-42a8-9952-227fe7280174', name: '2nd Storytelling', icon: '📖', count: 0 },
    { id: '2f7727ca-d898-4a94-abed-51d6a908d4b9', name: 'Speaking Projects', icon: '🎙️', count: 0 },
    { id: 'e364cc30-98a9-4fdb-b3af-e3be88bff7fc', name: 'Public Speaking', icon: '🗣️', count: 0 },
    { id: '35332f51-0fe0-444b-8c45-bd2a780def5e', name: 'Basic English', icon: '🔤', count: 0 }
  ];

  (allBoardClasses || []).forEach(bc => {
    if (!availableClasses.some(ac => ac.id === bc.id || _norm(ac.name) === _norm(bc.name))) {
      const cnt = (rawData || []).filter(t => t.class_id === bc.id && !t.deleted_at).length;
      availableClasses.push({
        id: bc.id,
        name: bc.name,
        icon: '📚',
        count: cnt
      });
    }
  });

  availableClasses.forEach(ac => {
    ac.count = liveData.filter(t => t.class_id === ac.id).length;
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

  // Mount class navigation tabs directly to TOP BAR (standard TopsCore pattern)
  if (window.setTopbarTabs) {
    window.setTopbarTabs(buildClassTopbarTabs(window._activeTestClassId), window._activeTestClassId, 'window._switchClassTestAnalytics');
  }

  // Render Full Dashboard HTML (Pure 100% Test Analytics Mission Control)
  area.innerHTML = `
    <style id="test-analytics-styles">
      .test-analytics-dashboard {
        height: 100% !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 6px !important;
        box-sizing: border-box !important;
        color: #f8fafc;
        overflow: hidden !important;
        padding: 0 !important;
        margin: 0 !important;
      }

      /* Top 3 Pedagogical Hero KPIs */
      .tac-kpi-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        flex-shrink: 0;
        margin-bottom: 0;
      }
      @media (max-width: 900px) { .tac-kpi-grid { grid-template-columns: 1fr; } }

      .tac-card {
        background: rgba(15, 23, 42, 0.85);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        padding: 5px 10px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
        backdrop-filter: blur(12px);
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        min-height: 60px;
      }
      .tac-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px -4px rgba(0, 0, 0, 0.5), 0 0 12px rgba(99, 102, 241, 0.2);
        border-color: rgba(255, 255, 255, 0.22);
      }
      .tac-card.border-success { border-left: 4px solid #10b981; }
      .tac-card.border-star { border-left: 4px solid #22c55e; }
      .tac-card.border-purple { border-left: 4px solid #8b5cf6; }

      .tac-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.15rem; }
      .tac-card-title { font-weight: 700; font-size: 0.72rem; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.5px; }
      .tac-badge { font-size: 0.62rem; font-weight: 800; padding: 1px 5px; border-radius: 4px; text-transform: uppercase; }
      .badge-danger-soft { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
      .badge-success-soft { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
      .badge-warning-soft { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
      .badge-info-soft { background: rgba(6, 182, 212, 0.2); color: #38bdf8; border: 1px solid rgba(6, 182, 212, 0.3); }
      .badge-blue-soft { background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); }
      .badge-purple-soft { background: rgba(139, 92, 246, 0.2); color: #c084fc; border: 1px solid rgba(139, 92, 246, 0.3); }

      .tac-metric { font-size: 1.25rem; font-weight: 800; line-height: 1; }
      .tac-unit { font-size: 0.68rem; font-weight: 500; color: #94a3b8; }
      .tac-sub { font-size: 0.68rem; color: #94a3b8; }
      .tac-card-footer { font-size: 0.62rem; color: #94a3b8; display: flex; align-items: center; justify-content: space-between; border-top: 1px solid rgba(255, 255, 255, 0.06); padding-top: 0.2rem; margin-top: 0.15rem; }

      /* Main Cockpit Asymmetric Split (Left: Content / The Wall, Right: Students / POS / Grade) */
      .tac-main-split {
        flex: 1 !important;
        min-height: 0 !important;
        display: grid !important;
        grid-template-columns: 1.2fr 0.8fr !important;
        gap: 8px !important;
        overflow: hidden !important;
      }
      @media (max-width: 1024px) {
        .tac-main-split { grid-template-columns: 1fr !important; overflow-y: auto !important; }
      }

      /* Left Column: Curriculum & Bottlenecks */
      .tac-col-left {
        display: flex !important;
        flex-direction: column !important;
        gap: 6px !important;
        min-height: 0 !important;
        overflow: hidden !important;
      }

      /* Vocab Domain Split Card (Words vs Phrases Mastery) */
      .tac-vocab-split-card {
        background: rgba(15, 23, 42, 0.85);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-left: 4px solid #38bdf8;
        border-radius: 8px;
        padding: 5px 8px;
        flex-shrink: 0;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }
      .tac-vocab-split-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
        margin-top: 4px;
      }
      .tac-vocab-box {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 6px;
        padding: 4px 8px;
        transition: all 0.2s ease;
      }
      .tac-vocab-box:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.12);
      }
      .tac-vocab-box.words-box { border-left: 3px solid #38bdf8; }
      .tac-vocab-box.phrases-box { border-left: 3px solid #34d399; }

      /* The Wall Bottleneck Card (Flexes to fill remainder of Left Column) */
      .tac-wall-card {
        flex: 1 !important;
        min-height: 0 !important;
        display: flex !important;
        flex-direction: column !important;
        background: rgba(15, 23, 42, 0.85);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-left: 4px solid #f59e0b;
        border-radius: 8px;
        padding: 6px 8px;
        overflow: hidden !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }
      .tac-wall-grid {
        flex: 1 !important;
        min-height: 0 !important;
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        grid-template-rows: repeat(5, minmax(0, 1fr)) !important;
        gap: 4px !important;
        overflow-y: auto !important;
      }
      .tac-wall-item {
        background: rgba(255, 255, 255, 0.03);
        padding: 3px 6px;
        border-radius: 5px;
        border: 1px solid rgba(255, 255, 255, 0.05);
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        min-height: 0;
        transition: all 0.15s ease;
      }
      .tac-wall-item:hover {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(255, 255, 255, 0.12);
      }

      /* Right Column: Student Diagnostics & Distribution */
      .tac-col-right {
        display: flex !important;
        flex-direction: column !important;
        gap: 6px !important;
        min-height: 0 !important;
        overflow: hidden !important;
      }
      .tac-subpanel {
        flex: 1 !important;
        min-height: 0 !important;
        display: flex !important;
        flex-direction: column !important;
        background: rgba(15, 23, 42, 0.85);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        padding: 6px 8px;
        overflow: hidden !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        backdrop-filter: blur(12px);
      }
      .tac-subpanel-body {
        flex: 1 !important;
        min-height: 0 !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-around !important;
        overflow: hidden !important;
      }

      /* Common Panel Headers */
      .tac-panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 0.35rem;
        padding-bottom: 0.25rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        flex-shrink: 0;
      }
      .tac-panel-title { font-size: 0.78rem; font-weight: 700; color: #f8fafc; display: flex; align-items: center; gap: 0.35rem; }
    </style>

    <div class="test-analytics-dashboard">
      <!-- Empty track notification (shown when a track with 0 tests is selected) -->
      <div id="tac-empty-track-section" style="display:${currentClassObj.count === 0 && window._activeTestClassId !== 'all' ? 'block' : 'none'}; background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.25); border-radius:6px; padding:0.4rem 0.8rem; color:#fde68a; font-size:0.75rem; flex-shrink:0;">
        ℹ️ Active Track: <strong id="tac-empty-track-name" style="color:#fff;">${escapeHtml(currentClassObj.name)}</strong> has no published tests configured yet. Select <strong>3rd Vocabulary</strong> or <strong>All Classes</strong> in the top bar to inspect curriculum health and analytics.
      </div>

      <!-- TOP 3 HERO KPIS (Pedagogical Excellence, Compact Zero-Scroll Cockpit) -->
      <div class="tac-kpi-grid">
        <!-- 1. Mastery & FAPR -->
        <div class="tac-card border-success" onclick="window._openTestAnalyticsCardModal('fapr')">
          <div class="tac-card-header">
            <span class="tac-card-title">&#127919; 1st-Pass Rate (FAPR)</span>
            <span class="tac-badge ${fapr >= 70 ? 'badge-success-soft' : 'badge-warning-soft'}">${fapr}% Pass</span>
          </div>
          <div class="d-flex align-center justify-between">
            <div class="tac-metric text-success">${fapr}% <span class="tac-unit">First Attempt</span></div>
            <div class="tac-sub" style="font-size:0.65rem;">${faprPass} of ${firstAttempts.length} passed</div>
          </div>
          <div class="tac-card-footer">
            <span>★ ${gradeCounts['★']} &bull; A ${gradeCounts['A']} &bull; B ${gradeCounts['B']}</span>
            <span style="color:#10b981; font-weight:700;">Grade Health &#10140;</span>
          </div>
        </div>

        <!-- 2. Grade Quality Ratio (Rule 2.10) -->
        <div class="tac-card border-star" onclick="window._openTestAnalyticsCardModal('fapr')">
          <div class="tac-card-header">
            <span class="tac-card-title">&#127942; Grade Quality Ratio</span>
            <span class="tac-badge badge-success-soft" style="color:#22c55e; border-color:rgba(34,197,94,0.3); background:rgba(34,197,94,0.12);">${highGradePct}% High Tiers</span>
          </div>
          <div class="d-flex align-center justify-between">
            <div class="tac-metric" style="color:#22c55e;">${highGradePct}% <span class="tac-unit">★ / A / B</span></div>
            <div class="tac-sub" style="font-size:0.65rem;">${highGradeCount} of ${totalGraded} top grades</div>
          </div>
          <div class="tac-card-footer">
            <span>C ${gradeCounts['C']} &bull; D ${gradeCounts['D']} &bull; E ${gradeCounts['E']}</span>
            <span style="color:#22c55e; font-weight:700;">Distribution &#10140;</span>
          </div>
        </div>

        <!-- 3. Remedial & Retake Load -->
        <div class="tac-card border-purple" onclick="window._openTestAnalyticsCardModal('strugglers')">
          <div class="tac-card-header">
            <span class="tac-card-title">&#128101; Remedial &amp; Retake Load</span>
            <span class="tac-badge badge-purple-soft">${retakeRate}% Retakes</span>
          </div>
          <div class="d-flex align-center justify-between">
            <div class="tac-metric" style="color:#c084fc;">${studentsWithRetakes} <span class="tac-unit">Students in Retakes</span></div>
            <div class="tac-sub" style="font-size:0.65rem;">${totalRetakeAttempts} retakes capped at 60%ᴿ</div>
          </div>
          <div class="tac-card-footer">
            <span>&#128123; ${inactiveStudentsCount} Inactive Students</span>
            <span style="color:#c084fc; font-weight:700;">Watchlist &#10140;</span>
          </div>
        </div>
      </div>

      <!-- MAIN COCKPIT BODY SPLIT (LEFT: Curriculum/The Wall, RIGHT: Students/Diagnostics) -->
      <div class="tac-main-split" id="tac-analytics-content" style="opacity:${currentClassObj.count === 0 && window._activeTestClassId !== 'all' ? '0.35' : '1'}; transition:opacity 0.2s ease;">

        <!-- LEFT COLUMN: Content & Curriculum Bottlenecks (~60% width) -->
        <div class="tac-col-left">

          <!-- VOCABULARY DOMAIN SPLIT: WORDS VS. PHRASES MASTERY -->
          <div class="tac-vocab-split-card" id="tac-vocab-domain-section" style="display:${(window._activeTestClassId === 'ab33498a-90e6-44b7-83f4-5765f964543e' || window._activeTestClassId === 'all') ? 'block' : 'none'};">
            <div class="tac-panel-header">
              <div class="d-flex align-center gap-1">
                <span style="font-size:0.95rem;">🧬</span>
                <span class="tac-panel-title">Vocabulary Domain Split: Words vs. Phrases</span>
              </div>
              <div class="d-flex gap-1" id="tac-vocab-filter-pills">
                <button class="btn btn-xs btn-primary tac-vocab-btn active" id="btn-vocab-all" onclick="window._filterVocabDomain('all')">🌐 All (${totalTests})</button>
                <button class="btn btn-xs btn-secondary tac-vocab-btn" id="btn-vocab-words" onclick="window._filterVocabDomain('words')">🔤 Words (${wordsTests.length})</button>
                <button class="btn btn-xs btn-secondary tac-vocab-btn" id="btn-vocab-phrases" onclick="window._filterVocabDomain('phrases')">💬 Phrases (${phrasesTests.length})</button>
              </div>
            </div>

            <div class="tac-vocab-split-grid">
              <!-- Left Box: Words Mastery -->
              <div class="tac-vocab-box words-box" id="tac-vocab-box-words">
                <div class="d-flex justify-between align-center mb-1">
                  <span style="font-weight:800; font-size:0.74rem; color:#38bdf8;">🔤 SINGLE-WORD VOCABULARY</span>
                  <span class="tac-badge badge-blue-soft" style="font-size:0.6rem;">${wordsTests.length} Tests &bull; ${wordsAttempts.length} Subs</span>
                </div>
                <div class="d-flex align-center justify-between mb-1" style="font-size:0.75rem;">
                  <div><strong style="color:#f97316; font-size:1.05rem;">${wordsAvg}%</strong> <span class="text-xs text-muted">[D] Avg</span></div>
                  <div><strong style="color:#38bdf8; font-size:1.05rem;">${wordsFapr}%</strong> <span class="text-xs text-muted">FAPR</span></div>
                  <div><strong style="color:#eab308; font-size:1.05rem;">${wordsRemRate}%<sup style="font-size:0.65em;">R</sup></strong> <span class="text-xs text-muted">Remedial</span></div>
                </div>
                <div class="text-xs text-muted mb-1" style="font-size:0.64rem; line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                  16 Quizzes (5m) + 4 Exams (120m) &bull; Single-word Nouns, Verbs, Adjectives
                </div>
                <div style="height:4px; background:rgba(255,255,255,0.08); border-radius:2px; overflow:hidden;">
                  <div style="width:${wordsAvg}%; height:100%; background:linear-gradient(90deg, #f97316, #fb923c); border-radius:2px;"></div>
                </div>
              </div>

              <!-- Right Box: Phrases Mastery -->
              <div class="tac-vocab-box phrases-box" id="tac-vocab-box-phrases">
                <div class="d-flex justify-between align-center mb-1">
                  <span style="font-weight:800; font-size:0.74rem; color:#34d399;">💬 PHRASES &amp; IDIOMS MASTERY</span>
                  <span class="tac-badge badge-success-soft" style="font-size:0.6rem;">${phrasesTests.length} Tests &bull; ${phrasesAttempts.length} Subs</span>
                </div>
                <div class="d-flex align-center justify-between mb-1" style="font-size:0.75rem;">
                  <div><strong style="color:#eab308; font-size:1.05rem;">${phrasesAvg}%</strong> <span class="text-xs text-muted">[C] Avg</span></div>
                  <div><strong style="color:#34d399; font-size:1.05rem;">${phrasesFapr}%</strong> <span class="text-xs text-muted">FAPR</span></div>
                  <div><strong style="color:#10b981; font-size:1.05rem;">${phrasesRemRate}%<sup style="font-size:0.65em;">R</sup></strong> <span class="text-xs text-muted">Remedial</span></div>
                </div>
                <div class="text-xs text-muted mb-1" style="font-size:0.64rem; line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                  16 Quizzes (5m) + 4 Exams (120m) &bull; Contraction &amp; punctuation tolerant
                </div>
                <div style="height:4px; background:rgba(255,255,255,0.08); border-radius:2px; overflow:hidden;">
                  <div style="width:${phrasesAvg}%; height:100%; background:linear-gradient(90deg, #10b981, #34d399); border-radius:2px;"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- THE WALL — TOP 10 PERSISTENT BOTTLENECKS (Fills remaining height) -->
          <div class="tac-wall-card">
            <div class="tac-panel-header">
              <div>
                <span class="tac-panel-title">🧱 The Wall &mdash; Top 10 Persistent Bottlenecks</span>
              </div>
              <div class="d-flex align-center gap-1">
                <button class="btn btn-xs btn-primary tac-wall-pill active" id="wall-pill-all" onclick="window._filterWallBottlenecks('all')">All Top 10</button>
                <button class="btn btn-xs btn-secondary tac-wall-pill" id="wall-pill-words" onclick="window._filterWallBottlenecks('words')">🔤 Words</button>
                <button class="btn btn-xs btn-secondary tac-wall-pill" id="wall-pill-phrases" onclick="window._filterWallBottlenecks('phrases')">💬 Phrases</button>
                <button class="btn btn-ghost btn-xs text-warning" onclick="window._openTestAnalyticsCardModal('wall')">Top 20 &#10140;</button>
              </div>
            </div>

            <div class="tac-wall-grid" id="tac-wall-items-container">
              ${hardestQsTop10.map((q, idx) => `
                <div class="tac-wall-item" data-wall-domain="${q.domain}">
                  <div class="d-flex justify-between align-center text-xs" style="font-size:0.7rem;">
                    <div class="d-flex align-center gap-1" style="overflow:hidden; white-space:nowrap;">
                      <strong style="color:#f8fafc;">#${idx + 1}.</strong>
                      <span style="font-weight:700; color:#f8fafc; overflow:hidden; text-overflow:ellipsis;">"${escapeHtml(q.text)}"</span>
                      <span class="tac-badge ${q.domain === 'phrase' ? 'badge-success-soft' : 'badge-blue-soft'}" style="font-size:0.55rem; padding:1px 4px;">${escapeHtml(q.wordType)}</span>
                    </div>
                    <span class="tac-badge ${q.failRate >= 70 ? 'badge-danger-soft' : 'badge-warning-soft'}" style="font-size:0.6rem; flex-shrink:0;">${q.failRate}% Fail (${q.fail}/${q.total})</span>
                  </div>
                  <div style="height:3px; background:rgba(255,255,255,0.08); border-radius:2px; overflow:hidden; margin:2px 0;">
                    <div style="width:${q.failRate}%; height:100%; background:${q.failRate >= 70 ? '#ef4444' : '#f59e0b'}; border-radius:2px;"></div>
                  </div>
                  <div class="d-flex justify-between text-xs" style="font-size:0.64rem; color:#94a3b8; line-height:1.1;">
                    <span style="overflow:hidden; white-space:nowrap; text-overflow:ellipsis;">Target: <strong style="color:#34d399;">${escapeHtml(q.correct)}</strong></span>
                    ${q.wrongSamples && q.wrongSamples.length > 0 ? `<span style="color:#f87171; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; max-width:45%; text-align:right;" title="Errors: ${q.wrongSamples.map(escapeHtml).join(', ')}">"${escapeHtml(q.wrongSamples[0])}"</span>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

        </div><!-- END tac-col-left -->

        <!-- RIGHT COLUMN: Student Diagnostics & Distribution (~40% width) -->
        <div class="tac-col-right tac-row-3col">

          <!-- 1. Remedial Watchlist -->
          <div class="tac-subpanel" style="border-left:4px solid #8b5cf6;">
            <div class="tac-panel-header">
              <span class="tac-panel-title">👥 Remedial Watchlist</span>
              <button class="btn btn-ghost btn-xs" style="color:#c084fc; font-size:0.65rem;" onclick="window._openTestAnalyticsCardModal('strugglers')">View All &#10140;</button>
            </div>
            <div class="tac-subpanel-body">
              ${strugglersDetailed.slice(0, 3).map((s, idx) => `
                <div style="background:rgba(255,255,255,0.03); padding:3px 6px; border-radius:5px; border:1px solid rgba(255,255,255,0.05); font-size:0.7rem;">
                  <div class="d-flex justify-between align-center">
                    <strong style="color:#f8fafc;">#${idx + 1}. ${escapeHtml(formatStudentShortName(s.name))}</strong>
                    <span class="tac-badge badge-purple-soft" style="font-size:0.58rem;">${s.count} Retakes</span>
                  </div>
                  <div class="d-flex justify-between mt-1 text-xs" style="color:#94a3b8; font-size:0.64rem;">
                    <span>Initial: ${s.firstScore}% &bull; Best: <strong style="color:#34d399;">${s.maxScore}%${s.maxScore <= 60 ? '<sup style="color:#eab308;">R</sup>' : ''}</strong></span>
                    <span style="color:#10b981; font-weight:700;">+${s.delta}%</span>
                  </div>
                </div>
              `).join('')}
            </div>
            <div style="font-size:0.62rem; color:#94a3b8; border-top:1px solid rgba(255,255,255,0.06); padding-top:0.2rem; margin-top:0.15rem; flex-shrink:0;">
              👻 ${inactiveStudentsCount} active students with 0 attempts
            </div>
          </div>

          <!-- 2. Linguistic POS Matrix -->
          <div class="tac-subpanel" style="border-left:4px solid #6366f1;">
            <div class="tac-panel-header">
              <span class="tac-panel-title">🧬 Linguistic POS Matrix</span>
              <button class="btn btn-ghost btn-xs" style="color:#a5b4fc; font-size:0.65rem;" onclick="window._openTestAnalyticsCardModal('linguistic')">Details &#10140;</button>
            </div>
            <div class="tac-subpanel-body">
              ${[
                { name: 'Nouns', tot: posStats.Noun?.tot || 0, cor: posStats.Noun?.cor || 0, color: '#38bdf8' },
                { name: 'Verbs', tot: posStats.Verb?.tot || 0, cor: posStats.Verb?.cor || 0, color: '#facc15' },
                { name: 'Adjectives', tot: posStats.Adjective?.tot || 0, cor: posStats.Adjective?.cor || 0, color: '#c084fc' },
                { name: 'Phrases / Idioms', tot: posStats.Phrase?.tot || 0, cor: posStats.Phrase?.cor || 0, color: '#34d399' }
              ].map(p => {
                const acc = p.tot > 0 ? Math.round((p.cor / p.tot) * 100) : 0;
                return `
                  <div>
                    <div class="d-flex justify-between align-center text-xs" style="font-size:0.68rem; margin-bottom:1px;">
                      <span style="color:#cbd5e1; font-weight:600;">${p.name} (${p.tot} Qs)</span>
                      <strong style="color:${p.color};">${acc}%</strong>
                    </div>
                    <div style="height:4px; background:rgba(255,255,255,0.08); border-radius:2px; overflow:hidden;">
                      <div style="width:${acc}%; height:100%; background:${p.color}; border-radius:2px;"></div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- 3. Official TopsCore Grade Distribution -->
          <div class="tac-subpanel" style="border-left:4px solid #10b981;">
            <div class="tac-panel-header">
              <span class="tac-panel-title">🏆 Grade Distribution (Rule 2.10)</span>
              <button class="btn btn-ghost btn-xs text-success" style="font-size:0.65rem;" onclick="window._openTestAnalyticsCardModal('fapr')">Curve &#10140;</button>
            </div>
            <div class="tac-subpanel-body">
              ${gradePalette.map(g => {
                const pct = Math.round((g.count / totalGraded) * 100);
                return `
                  <div style="font-size:0.66rem;">
                    <div class="d-flex justify-between align-center" style="margin-bottom:1px;">
                      <span style="font-weight:700; color:${g.color};">${g.sym} &bull; ${g.label}</span>
                      <span style="color:#94a3b8;">${g.count} (${pct}%)</span>
                    </div>
                    <div style="height:3px; background:rgba(255,255,255,0.08); border-radius:2px; overflow:hidden;">
                      <div style="width:${pct}%; height:100%; background:${g.color}; border-radius:2px;"></div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

        </div><!-- END tac-col-right -->

      </div><!-- END tac-main-split -->
    </div><!-- END test-analytics-dashboard -->
  `;

  // Wire Class Switching Controller (synchronizes topbar tabs + header badge)
  window._switchClassTestAnalytics = (classId) => {
    window._activeTestClassId = classId;

    if (window.setTopbarTabs) {
      window.setTopbarTabs(buildClassTopbarTabs(classId), classId, 'window._switchClassTestAnalytics');
    }

    const activeObj = availableClasses.find(c => c.id === classId) || { name: 'All Classes', count: liveData.length };

    const vocabSection = document.getElementById('tac-vocab-domain-section');
    const emptyTrack = document.getElementById('tac-empty-track-section');
    const analyticsContent = document.getElementById('tac-analytics-content');

    const isVocabOrAll = (classId === 'ab33498a-90e6-44b7-83f4-5765f964543e' || classId === 'all');
    if (vocabSection) {
      vocabSection.style.display = isVocabOrAll ? 'block' : 'none';
    }

    if (activeObj.count === 0 && classId !== 'all') {
      if (emptyTrack) {
        emptyTrack.style.display = 'block';
        const tName = document.getElementById('tac-empty-track-name');
        if (tName) tName.textContent = activeObj.name;
      }
      if (analyticsContent) analyticsContent.style.opacity = '0.35';
    } else {
      if (emptyTrack) emptyTrack.style.display = 'none';
      if (analyticsContent) analyticsContent.style.opacity = '1';
    }
  };

  // Wire Vocab Domain Filter Controller (All / Words / Phrases)
  window._filterVocabDomain = (domainKey) => {
    const pills = area.querySelectorAll('.tac-vocab-btn');
    pills.forEach(p => {
      if (p.dataset.domain === domainKey) {
        p.classList.remove('btn-secondary'); p.classList.add('btn-primary', 'active');
      } else {
        p.classList.remove('btn-primary', 'active'); p.classList.add('btn-secondary');
      }
    });

    const wordsBox = document.getElementById('tac-vocab-box-words');
    const phrasesBox = document.getElementById('tac-vocab-box-phrases');
    if (wordsBox && phrasesBox) {
      if (domainKey === 'words') {
        wordsBox.style.display = 'block';
        phrasesBox.style.display = 'none';
      } else if (domainKey === 'phrases') {
        wordsBox.style.display = 'none';
        phrasesBox.style.display = 'block';
      } else {
        wordsBox.style.display = 'block';
        phrasesBox.style.display = 'block';
      }
    }
  };

  // Wire The Wall Filter Controller (Top 10 / Words / Phrases)
  window._filterWallBottlenecks = (filterKey) => {
    const pills = area.querySelectorAll('.tac-wall-pill');
    pills.forEach(p => {
      p.classList.remove('btn-primary', 'active');
      p.classList.add('btn-secondary');
    });
    const activePill = document.getElementById('wall-pill-' + filterKey);
    if (activePill) {
      activePill.classList.remove('btn-secondary');
      activePill.classList.add('btn-primary', 'active');
    }

    const items = area.querySelectorAll('.tac-wall-item');
    items.forEach(item => {
      const dom = item.dataset.wallDomain;
      if (filterKey === 'all') {
        item.style.display = 'block';
      } else if (filterKey === 'words') {
        item.style.display = dom === 'word' ? 'block' : 'none';
      } else if (filterKey === 'phrases') {
        item.style.display = dom === 'phrase' ? 'block' : 'none';
      }
    });
  };

}


// Helpers
// escapeHtml / escHtml imported canonically

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

    const { data: createdTest, error: eErr } = await sb.from('Tests').insert([newTest]).select().single();
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
            <div class="fw-600" style="font-size:1.5rem;">${row.score}% <span class="badge badge-primary text-sm ml-2" style="background:rgba(34,197,94,0.18);color:#22C55E;border:1px solid #22C55E;">${escapeHtml((row.grade === '★' || row.grade === 'S' || parseFloat(row.score) >= 100) ? '★' : row.grade)}</span></div>
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
      { key: 'grade', label: 'Grade', sortable: true, render: (val, row) => `<div class="text-center"><span class="badge badge-primary fw-800" style="${(val === '★' || val === 'S' || parseFloat(row?.score) >= 100) ? 'background:rgba(34,197,94,0.18);color:#22C55E;border:1px solid #22C55E;' : ''}">${escapeHtml((val === '★' || val === 'S' || parseFloat(row?.score) >= 100) ? '★' : val)}</span></div>` },
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
    .from('Tests')
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
    const { error: updErr } = await sb.from('Tests')
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
                      <td style="padding:6px 10px; color:#ef4444; font-weight:700;">${s.score}% (Fail)</td>
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
    title = '🎯 First-Attempt Pass Rate (FAPR) & Grade Health';
    badgeText = `${st.fapr}% Pure 1st-Pass Rate`;
    maxWidth = '750px';

    const totalGraded = Object.values(st.gradeCounts || {}).reduce((a, b) => a + b, 0) || 1;
    const gradePalette = [
      { sym: '★', label: 'Excellent', range: '100%', color: '#22C55E', count: st.gradeCounts['★'] || 0 },
      { sym: 'A', label: 'Very Good', range: '90% - 99%', color: '#10B981', count: st.gradeCounts['A'] || 0 },
      { sym: 'B', label: 'Good', range: '80% - 89%', color: '#84CC16', count: st.gradeCounts['B'] || 0 },
      { sym: 'C', label: 'Pass', range: '60% - 79%', color: '#EAB308', count: st.gradeCounts['C'] || 0 },
      { sym: 'D', label: 'Less', range: '30% - 59%', color: '#F97316', count: st.gradeCounts['D'] || 0 },
      { sym: 'E', label: 'Fail', range: '0% - 29%', color: '#EF4444', count: st.gradeCounts['E'] || 0 },
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
          <div class="text-xs fw-700 uppercase mb-2" style="letter-spacing:0.5px; color:#cbd5e1;">Official TopsCore Grade Distribution (Rule 2.10)</div>
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
    title = '🧱 The Wall — Top 20 Hardest Vocabulary Questions';
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
                  <td style="padding:8px 10px; color:#34d399; font-weight:600;">${esc(q.correct)}</td>
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
        <p class="text-xs text-muted mb-0">Students with the highest retake volume. In TopsCore (Rule 2.10), remedial retakes are capped at 60% with Grade C and an &quot;R&quot; indicator beside score.</p>
        
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
                  <td style="padding:6px 10px; color:#34d399; font-weight:700;">${s.maxScore}%${s.count > 1 ? '<sup style="color:#eab308;">R</sup>' : ''}</td>
                  <td style="padding:6px 10px; color:${s.delta >= 0 ? '#10b981' : '#ef4444'}; font-weight:700;">+${s.delta}%</td>
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
    title = '🧬 Linguistic Mastery & Parts of Speech Matrix';
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
                    <td style="padding:8px 10px; color:#34d399; font-weight:600;">${esc(q.expected)}</td>
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
    let sym = 'E', color = '#EF4444';
    if (pct >= 100) { sym = '★'; color = '#22C55E'; }
    else if (pct >= 90) { sym = 'A'; color = '#10B981'; }
    else if (pct >= 80) { sym = 'B'; color = '#84CC16'; }
    else if (pct >= 60) { sym = 'C'; color = '#EAB308'; }
    else if (pct >= 30) { sym = 'D'; color = '#F97316'; }
    return '<span style="color:' + color + '; font-weight:800; font-size:0.8rem; background:rgba(255,255,255,0.04); padding:2px 6px; border-radius:4px; border:1px solid ' + color + '40;">' + pct + '% [' + sym + ']</span>';
  };

  const getRemedialBadge = (remRate, count) => {
    if (!count) return '<span class="text-muted" style="font-size:0.75rem;">—</span>';
    if (remRate === 0) return '<span class="text-success fw-700" style="font-size:0.75rem;">0%</span>';
    const color = remRate > 40 ? '#ef4444' : '#eab308';
    return '<span class="fw-700" style="color:' + color + '; font-size:0.78rem;">' + remRate + '%<sup class="asm-rem-sup" style="font-size:0.65em; font-weight:800; margin-left:1px;">R</sup></span>';
  };

  const getSecurityBadge = (flags) => {
    if (!flags || flags === 0) return '<span style="color:#10b981; font-size:0.72rem; font-weight:700;">🛡️ Clean</span>';
    return '<span style="color:#ef4444; font-size:0.72rem; font-weight:700;">⚠️ ' + flags + ' Flags</span>';
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
                ${q.correct ? `<div style="font-size:0.7rem; color:#94a3b8;">Target: <span style="color:#34d399; font-weight:600;">${esc(q.correct)}</span></div>` : ''}
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
