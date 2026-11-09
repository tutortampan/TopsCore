import { computeMilestoneExamMastery, calculateGrade } from '../js/grading.js';

// Simulate all class exams for 3rd Vocabulary
const mockExams = [
  { id: 't7', display_order: 7, title: '1st Vocabulary A Words Exam - Workplace', payload: { theme_code: 'A', total_questions: 120 } },
  { id: 't8', display_order: 8, title: '1st Vocabulary A Phrases Exam - Workplace', payload: { theme_code: 'A', total_questions: 30 } },
  { id: 't17', display_order: 17, title: '2nd Vocabulary B Words Exam - Tourism', payload: { theme_code: 'B', total_questions: 280 } },
  { id: 't18', display_order: 18, title: '2nd Vocabulary B Phrases Exam - Tourism', payload: { theme_code: 'B', total_questions: 70 } },
  { id: 't29', display_order: 29, title: '3rd Vocabulary C Words Exam - CCU', payload: { theme_code: 'C', total_questions: 480 } },
  { id: 't30', display_order: 30, title: '3rd Vocabulary C Phrases Exam - CCU', payload: { theme_code: 'C', total_questions: 120 } },
  { id: 't39', display_order: 39, title: '4th Vocabulary D Words Exam - High-Frequency', payload: { theme_code: 'D', total_questions: 640 } },
  { id: 't40', display_order: 40, title: '4th Vocabulary D Phrases Exam - High-Frequency', payload: { theme_code: 'D', total_questions: 160 } }
];

function testMilestone(examEntries = [], allClassExams = []) {
  const completedWeeklyCount = Array.isArray(examEntries) ? examEntries.length : 0;

  const helperThemeCode = (t) => {
    if (!t) return 'A';
    if (t.payload?.theme_code) return String(t.payload.theme_code).toUpperCase();
    const shell = String(t.shell_code || t.payload?.shell_code || '');
    const m = shell.match(/^[0-9]+([A-Za-z])/);
    if (m) return m[1].toUpperCase();
    const titleM = String(t.title || '').match(/Theme\s+([A-Za-z])|Vocabulary\s+([A-Za-z])/i);
    if (titleM) return (titleM[1] || titleM[2]).toUpperCase();
    return 'A';
  };

  const getExpectedMax = (t) => {
    if (t.payload?.total_questions) return Number(t.payload.total_questions);
    if (t.total_questions) return Number(t.total_questions);
    const ord = Number(t.display_order || 0);
    if (ord === 7) return 120;
    if (ord === 8) return 30;
    if (ord === 17) return 280;
    if (ord === 18) return 70;
    if (ord === 29) return 480;
    if (ord === 30) return 120;
    if (ord === 39) return 640;
    if (ord === 40) return 160;
    return 100;
  };

  const themeExamsMap = {};
  (allClassExams || []).forEach(t => {
    const tc = helperThemeCode(t);
    if (!themeExamsMap[tc]) themeExamsMap[tc] = [];
    themeExamsMap[tc].push(t);
  });

  const sortedThemes = Object.keys(themeExamsMap).sort();
  if (sortedThemes.length === 0) {
    return {
      totalPoints: 0,
      overallScore: 0,
      grade: '—',
      denominator: 0,
      completedWeeklyCount: 0,
      includedThemeCodes: [],
      includedExamIds: new Set()
    };
  }

  const totalPoints = Math.round(examEntries.reduce((sum, e) => sum + (Number(e.effPoints ?? e.points ?? 0)), 0) * 10) / 10;

  const themeStats = sortedThemes.map((tc, idx) => {
    const examsInTheme = themeExamsMap[tc];
    const maxQ = examsInTheme.reduce((acc, t) => acc + getExpectedMax(t), 0);
    const examIds = new Set(examsInTheme.map(t => t.id));
    
    const studentAttemptsInTheme = examEntries.filter(e => {
      const eId = e.test?.id || e.testId || e.test_id;
      if (eId && examIds.has(eId)) return true;
      const tcAttempt = helperThemeCode(e.test);
      return tcAttempt === tc;
    });

    const earned = studentAttemptsInTheme.reduce((sum, e) => sum + (Number(e.effPoints ?? e.points ?? 0)), 0);
    const attempted = studentAttemptsInTheme.length > 0;
    const passed = attempted && maxQ > 0 && (earned / maxQ) >= 0.6;

    return {
      themeCode: tc,
      index: idx,
      maxQ,
      earned,
      attempted,
      passed
    };
  });

  let highestAttemptedIdx = -1;
  themeStats.forEach((ts, idx) => {
    if (ts.attempted) highestAttemptedIdx = Math.max(highestAttemptedIdx, idx);
  });

  themeStats.forEach((ts, idx) => {
    if (idx < highestAttemptedIdx) {
      ts.passed = true;
    }
  });

  const includedIndices = new Set();
  themeStats.forEach((ts, idx) => {
    if (ts.attempted) includedIndices.add(idx);
    if (ts.passed && idx + 1 < themeStats.length) {
      includedIndices.add(idx + 1);
    }
  });

  if (includedIndices.size === 0) {
    // Student with 0 exams starts at Theme 1
    includedIndices.add(0);
  }

  let denominator = 0;
  includedIndices.forEach(idx => {
    denominator += themeStats[idx].maxQ;
  });

  const overallScore = denominator > 0 ? Math.round((totalPoints / denominator) * 100) : 0;
  const grade = calculateGrade(overallScore);

  const includedThemeCodes = Array.from(includedIndices).map(idx => themeStats[idx].themeCode);
  const includedExamIds = new Set();
  includedThemeCodes.forEach(tc => {
    (themeExamsMap[tc] || []).forEach(t => {
      if (t.id) includedExamIds.add(t.id);
    });
  });

  return {
    totalPoints,
    overallScore,
    grade,
    denominator,
    completedWeeklyCount,
    includedThemeCodes,
    includedExamIds
  };
}

console.log('Testing student with 0 exams (Rifky Ahmad / Alif Rezki):');
const res = testMilestone([], mockExams);
console.log('Proposed Result:', res);

