/**
 * TopsCore LMS — Exam & Assessment Regulations Workstation (Domain A — Admin)
 * Authoritative Master Guide & Operational Execution Engine for Examination Points, Assessment Basis & Evaluation Protocols
 * Standardized 100% Datagrid Layout conforming to Single Perimeter Ownership and Direct Ceiling Docking.
 * Route: admin.html#exam-rules or admin.html#assessment-rules
 */

import { showToast, escHtml } from '../app.js?v=20261106_v160';
import { getSvgIcon } from '../svg-icons.js?v=20261114_v487';
import {
  EXAM_RULES_SCHEMA,
  getCertificatePredicate,
  calculateWeeklyVocabPercentage,
  calculateStepVocabAverage,
  calculateSubjectCompositeScore,
  calculateMainExaminerScore,
  calculateSpeakingTutorScore,
  generateStudentCertificateTranscript
} from './exam-rules-engine.js';

// Active UI State
let _activePhaseTab = 'MASTER_QUOTAS'; // 'MASTER_QUOTAS' | 'FORMULAS' | 'FINAL_PANELS' | 'WEEKLY_RUBRICS' | 'SPEAKING_5_AXIS' | 'SIMULATOR'
let _searchFilter = '';

// Top Panel Tabs
const PHASE_TABS = [
  { id: 'MASTER_QUOTAS', label: 'Master Quotas & Points', icon: 'grid', count: 18 },
  { id: 'FORMULAS', label: 'Scoring Formulas (NA)', icon: 'award', count: 5 },
  { id: 'FINAL_PANELS', label: 'Final Evaluations (2 Panels)', icon: 'check-circle', count: 8 },
  { id: 'WEEKLY_RUBRICS', label: 'Weekly Storytelling Rubrics', icon: 'book', count: 4 },
  { id: 'SPEAKING_5_AXIS', label: '5-Axis Speaking Rubric', icon: 'mic', count: 5 },
  { id: 'SIMULATOR', label: 'Live Grade Simulator', icon: 'play', count: 'TEST' }
];

// Flat Assessment Items for Master Quota Datagrid
export const ASSESSMENT_MASTER_DATA = [
  // ── 0. DIAGNOSTIC PHASE: PLACEMENT TEST ──
  {
    phaseKey: 'DIAGNOSTIC',
    phaseName: 'Placement Test (Diagnostic)',
    levelLabel: 'Pre-Camp',
    badgeColor: '#38bdf8', // Tactical Cyan
    component: 'Speaking Baseline (10 Prompts)',
    timing: 'Camp Admission (Day 1)',
    frequency: '1 Session (1-on-1)',
    targetMetric: '0 – 25 Score',
    evaluator: 'Diagnostic Examiner',
    protocol: '10 Interview Questions: 4 Introduction, 2 Hobbies, 1 Favorites, 2 Ambition, 1 Family Activity.',
    dataPoints: 1,
    weightCategory: 'Diagnostic Indicator'
  },
  {
    phaseKey: 'DIAGNOSTIC',
    phaseName: 'Placement Test (Diagnostic)',
    levelLabel: 'Pre-Camp',
    badgeColor: '#38bdf8',
    component: 'Vocabulary Baseline',
    timing: 'Camp Admission (Day 1)',
    frequency: '1 Session',
    targetMetric: 'Target: 30 Words',
    evaluator: 'Diagnostic Examiner',
    protocol: 'Initial vocabulary inventory check verifying active foundational English words upon admission.',
    dataPoints: 1,
    weightCategory: 'Diagnostic Indicator'
  },
  {
    phaseKey: 'DIAGNOSTIC',
    phaseName: 'Placement Test (Diagnostic)',
    levelLabel: 'Pre-Camp',
    badgeColor: '#38bdf8',
    component: 'Grammar Baseline',
    timing: 'Camp Admission (Day 1)',
    frequency: '1 Session',
    targetMetric: 'Target: 25 Points',
    evaluator: 'Diagnostic Examiner',
    protocol: 'Baseline sentence structure and core grammatical patterns diagnostic test.',
    dataPoints: 1,
    weightCategory: 'Diagnostic Indicator'
  },

  // ── 1. 1ST STEP (MONTH 1 / LEVEL 1) ──
  {
    phaseKey: 'STEP_1',
    phaseName: '1st Step (Month 1 / Level 1)',
    levelLabel: '1st Level',
    badgeColor: '#95ff00', // Electric Lime
    component: 'Daily Attendance (Presensi)',
    timing: 'Mon–Fri (2 Sessions/Day)',
    frequency: '40 Sessions (4 Wks × 10)',
    targetMetric: '100% Present / Quota',
    evaluator: 'Class Tutor',
    protocol: 'Daily morning and evening check-ins (10 sessions/week, 40 total monthly). Basis for attendance discipline.',
    dataPoints: 40,
    weightCategory: 'Discipline / Attendance'
  },
  {
    phaseKey: 'STEP_1',
    phaseName: '1st Step (Month 1 / Level 1)',
    levelLabel: '1st Level',
    badgeColor: '#95ff00',
    component: 'Vocabulary Mastery (W1–W4)',
    timing: 'Weekly (End of W1, W2, W3, W4)',
    frequency: '4 Assessments',
    targetMetric: 'W1: 60/90 | W2: 120/210 | W3: 180/300 | W4: 240/450 Words',
    evaluator: 'Vocabulary Tutor',
    protocol: 'Cumulative word deposit. Words real-tested with tutor. Scores below minimum (<60 W1) trigger red highlight.',
    dataPoints: 4,
    weightCategory: 'Academic Mastery'
  },
  {
    phaseKey: 'STEP_1',
    phaseName: '1st Step (Month 1 / Level 1)',
    levelLabel: '1st Level',
    badgeColor: '#95ff00',
    component: 'Grammar Mastery (W1–W2)',
    timing: 'Week 1 & Week 2',
    frequency: '2 Assessments',
    targetMetric: 'W1: 8/15 Pts | W2: 12/20 Pts',
    evaluator: 'Grammar Tutor',
    protocol: 'Foundational grammar tests evaluating basic sentence patterns and affirmative/negative structures.',
    dataPoints: 2,
    weightCategory: 'Academic Mastery'
  },
  {
    phaseKey: 'STEP_1',
    phaseName: '1st Step (Month 1 / Level 1)',
    levelLabel: '1st Level',
    badgeColor: '#95ff00',
    component: 'Basic English Test (W1–W2)',
    timing: 'Week 1 & Week 2',
    frequency: '2 Assessments',
    targetMetric: 'Scale: 60 – 100 Pts',
    evaluator: 'Basic English Tutor',
    protocol: 'Written and oral comprehension examination evaluating elementary English proficiency.',
    dataPoints: 2,
    weightCategory: 'Academic Mastery'
  },
  {
    phaseKey: 'STEP_1',
    phaseName: '1st Step (Month 1 / Level 1)',
    levelLabel: '1st Level',
    badgeColor: '#95ff00',
    component: 'Speaking / Telling Story (W1–W4)',
    timing: 'Weekly (W1, W2, W3, W4)',
    frequency: '4 Assessments (Inc. Practice)',
    targetMetric: 'Target 10/25 Pts | Rubric 1–5',
    evaluator: 'Storytelling Tutor',
    protocol: 'Student presents story in front of class. Evaluated against authoritative 1–5 criteria rubric.',
    dataPoints: 4,
    weightCategory: 'Practical Performance'
  },

  // ── 2. 2ND STEP (MONTH 2 / LEVEL 2) ──
  {
    phaseKey: 'STEP_2',
    phaseName: '2nd Step (Month 2 / Level 2)',
    levelLabel: '2nd Level',
    badgeColor: '#FF8C00', // Dark Orange
    component: 'Daily Attendance (Presensi)',
    timing: 'Mon–Fri (2 Sessions/Day)',
    frequency: '40 Sessions (4 Wks × 10)',
    targetMetric: '100% Present / Quota',
    evaluator: 'Class Tutor',
    protocol: 'Daily morning and evening check-ins (10 sessions/week, 40 total monthly).',
    dataPoints: 40,
    weightCategory: 'Discipline / Attendance'
  },
  {
    phaseKey: 'STEP_2',
    phaseName: '2nd Step (Month 2 / Level 2)',
    levelLabel: '2nd Level',
    badgeColor: '#FF8C00',
    component: 'Vocabulary Mastery (Intermediate)',
    timing: 'Weekly (End of W1, W2, W3, W4)',
    frequency: '4 Assessments',
    targetMetric: 'W1: 75/120 | W2: 155/280 | W3: 235/440 | W4: 315/600 Words',
    evaluator: 'Vocabulary Tutor',
    protocol: 'Escalated intermediate cumulative targets. Repeater students tracked in isolated monitoring section.',
    dataPoints: 4,
    weightCategory: 'Academic Mastery'
  },
  {
    phaseKey: 'STEP_2',
    phaseName: '2nd Step (Month 2 / Level 2)',
    levelLabel: '2nd Level',
    badgeColor: '#FF8C00',
    component: 'Advanced Grammar Mastery (W1–W2)',
    timing: 'Week 1 & Week 2',
    frequency: '2 Assessments',
    targetMetric: 'W1: 10/30 Pts | W2: 17/30 Pts',
    evaluator: 'Grammar Tutor',
    protocol: 'Intermediate grammar tests covering complex tenses, modal verbs, and conjunctions.',
    dataPoints: 2,
    weightCategory: 'Academic Mastery'
  },
  {
    phaseKey: 'STEP_2',
    phaseName: '2nd Step (Month 2 / Level 2)',
    levelLabel: '2nd Level',
    badgeColor: '#FF8C00',
    component: 'GFS (Grammar for Speaking)',
    timing: 'Week 1 & Week 2',
    frequency: '2 Assessments',
    targetMetric: 'Target: 12/20 Pts',
    evaluator: 'GFS Tutor',
    protocol: 'Measures live real-time grammatical accuracy applied directly within conversational speech.',
    dataPoints: 2,
    weightCategory: 'Applied Practical'
  },
  {
    phaseKey: 'STEP_2',
    phaseName: '2nd Step (Month 2 / Level 2)',
    levelLabel: '2nd Level',
    badgeColor: '#FF8C00',
    component: 'Speaking / Telling Story (W1–W3)',
    timing: 'Week 1, Week 2, Week 3',
    frequency: '3 Assessments',
    targetMetric: 'Target 12/25 Pts | Rubric 1–5',
    evaluator: 'Storytelling Tutor',
    protocol: 'Narrative presentation focusing on structured sentence integration and conversational fluency.',
    dataPoints: 3,
    weightCategory: 'Practical Performance'
  },

  // ── 3. 3RD STEP (MONTH 3 / LEVEL 3) ──
  {
    phaseKey: 'STEP_3',
    phaseName: '3rd Step (Month 3 / Level 3)',
    levelLabel: '3rd Level',
    badgeColor: '#c084fc', // Violet / Star
    component: 'Daily Attendance (Presensi)',
    timing: 'Mon–Fri (2 Sessions/Day)',
    frequency: '40 Sessions (4 Wks × 10)',
    targetMetric: '100% Present / Quota',
    evaluator: 'Class Tutor',
    protocol: 'Daily morning and evening check-ins (10 sessions/week, 40 total monthly).',
    dataPoints: 40,
    weightCategory: 'Discipline / Attendance'
  },
  {
    phaseKey: 'STEP_3',
    phaseName: '3rd Step (Month 3 / Level 3)',
    levelLabel: '3rd Level',
    badgeColor: '#c084fc',
    component: 'Vocabulary Mastery (Advanced)',
    timing: 'Weekly (End of W1, W2, W3, W4)',
    frequency: '4 Assessments',
    targetMetric: 'W1: 90/150 | W2: 215/400 | W3: 340/650 | W4: 415/800 Words',
    evaluator: 'Vocabulary Tutor',
    protocol: 'Highest cumulative target volume in the camp program. Rigorous verification before graduation.',
    dataPoints: 4,
    weightCategory: 'Academic Mastery'
  },
  {
    phaseKey: 'STEP_3',
    phaseName: '3rd Step (Month 3 / Level 3)',
    levelLabel: '3rd Level',
    badgeColor: '#c084fc',
    component: 'Complex Grammar Mastery (W1–W2)',
    timing: 'Week 1 & Week 2',
    frequency: '2 Assessments',
    targetMetric: 'W1: 8/15 Pts | W2: 8/15 Pts',
    evaluator: 'Grammar Tutor',
    protocol: 'Advanced syntactic structures, passive clauses, conditionals, and academic discourse grammar.',
    dataPoints: 2,
    weightCategory: 'Academic Mastery'
  },
  {
    phaseKey: 'STEP_3',
    phaseName: '3rd Step (Month 3 / Level 3)',
    levelLabel: '3rd Level',
    badgeColor: '#c084fc',
    component: 'Pronunciation Mastery (W1–W2)',
    timing: 'Week 1 & Week 2',
    frequency: '2 Assessments',
    targetMetric: 'Target: 10/25 Pts (Akurasi Fonetik)',
    evaluator: 'Pronunciation Tutor',
    protocol: 'Focuses specifically on phonetic clarity, vowel/consonant accuracy, intonation, and syllable stress.',
    dataPoints: 2,
    weightCategory: 'Phonetic Practical'
  },
  {
    phaseKey: 'STEP_3',
    phaseName: '3rd Step (Month 3 / Level 3)',
    levelLabel: '3rd Level',
    badgeColor: '#c084fc',
    component: 'Speaking Practice (W1–W3)',
    timing: 'Week 1, Week 2, Week 3',
    frequency: '3 Assessments',
    targetMetric: 'Target: 15/25 Pts (Topic Mastery)',
    evaluator: 'Speaking Tutor',
    protocol: 'Evaluates fluency, spontaneity, and topical command as definitive qualification for Final Examination.',
    dataPoints: 3,
    weightCategory: 'Practical Performance'
  },

  // ── 4. FINAL EVALUATIONS: 2 DISTINCT EXAMINATIONS ──
  {
    phaseKey: 'FINAL_EXAM',
    phaseName: 'Final Evaluations (Graduation)',
    levelLabel: 'Level X / Graduation',
    badgeColor: '#ff2d87', // Electric Pink (Domain A)
    component: '1. Final Exam — Main Examiner Panel',
    timing: 'End of Level 3 (Graduation Week)',
    frequency: '1 Board Session (4 Params)',
    targetMetric: 'Max 100 Pts (4 × 25 Pts)',
    evaluator: 'Main Examiner (Mr. Sigit / Ms. Yesy)',
    protocol: 'Theoretical & structural examination: 1. Fluency (25), 2. Pronunciation (25), 3. Idea/Content (25), 4. Grammar (25).',
    dataPoints: 4,
    weightCategory: 'Summative Final Exam'
  },
  {
    phaseKey: 'FINAL_EXAM',
    phaseName: 'Final Evaluations (Graduation)',
    levelLabel: 'Level X / Graduation',
    badgeColor: '#ff2d87',
    component: '2. Final Practice — Speaking Tutor Panel',
    timing: 'End of Level 3 (Graduation Week)',
    frequency: '1 Board Session (4 Params)',
    targetMetric: 'Max 100 Pts (4 × 25 Pts)',
    evaluator: 'Speaking Tutor (Mr. Adam)',
    protocol: 'Applied conversational performance: 1. Fluency (25), 2. Pronunciation (25), 3. Grammar (25), 4. Comprehension (25).',
    dataPoints: 4,
    weightCategory: 'Summative Final Practice'
  }
];

/**
 * Main Entry Point: renderExamRules(area)
 */
export async function renderExamRules(area) {
  if (!area) return;

  // Window bridge for tab switching
  window.switchExamRulesPhase = (tabId) => {
    _activePhaseTab = tabId;
    renderCurrentView(area);
  };

  window.handleExamRulesSearch = (val) => {
    _searchFilter = (val || '').toLowerCase().trim();
    renderCurrentView(area);
  };

  window.exportExamRulesMarkdown = () => {
    exportToMarkdown();
  };

  window.exportExamRulesCSV = () => {
    exportToCSV();
  };

  window.runLiveSimulatorCalculation = () => {
    executeSimulator();
  };

  renderCurrentView(area);
}

/**
 * Renders the view based on current tab state
 */
function renderCurrentView(area) {
  // 1. Sync Topbar Tabs via window.setTopbarTabs
  if (typeof window.setTopbarTabs === 'function') {
    const tabsData = PHASE_TABS.map(t => ({
      id: t.id,
      label: t.label,
      icon: getSvgIcon(t.icon, 14),
      val: t.count,
      valColor: t.id === 'FINAL_PANELS' ? '#ff2d87' : (t.id === 'SIMULATOR' ? '#38bdf8' : (t.id === 'FORMULAS' ? '#95ff00' : '#c084fc'))
    }));
    window.setTopbarTabs(tabsData, _activePhaseTab, 'window.switchExamRulesPhase');
  }

  // 2. Render appropriate sub-view HTML
  let contentHtml = '';

  switch (_activePhaseTab) {
    case 'FORMULAS':
      contentHtml = renderFormulasViewHtml();
      break;
    case 'FINAL_PANELS':
      contentHtml = renderFinalPanelsViewHtml();
      break;
    case 'WEEKLY_RUBRICS':
      contentHtml = renderWeeklyRubricsViewHtml();
      break;
    case 'SPEAKING_5_AXIS':
      contentHtml = renderSpeaking5AxisViewHtml();
      break;
    case 'SIMULATOR':
      contentHtml = renderSimulatorViewHtml();
      break;
    case 'MASTER_QUOTAS':
    default: {
      let filtered = ASSESSMENT_MASTER_DATA;
      if (_searchFilter) {
        filtered = filtered.filter(d =>
          d.phaseName.toLowerCase().includes(_searchFilter) ||
          d.component.toLowerCase().includes(_searchFilter) ||
          d.evaluator.toLowerCase().includes(_searchFilter) ||
          d.protocol.toLowerCase().includes(_searchFilter) ||
          d.targetMetric.toLowerCase().includes(_searchFilter)
        );
      }
      contentHtml = renderMasterQuotasViewHtml(filtered);
      break;
    }
  }

  area.innerHTML = `
    <div class="exam-rules-workstation-container" style="display:flex; flex-direction:column; height:100%; width:100%; overflow:hidden; box-sizing:border-box;">
      ${contentHtml}
    </div>
  `;

  // 3. Render Docked Sub Panel (Lower Panel 40px)
  renderSubPanel();
}

/**
 * Tab 1: Master Quotas & Points Table
 */
function renderMasterQuotasViewHtml(items) {
  return `
    <div class="table-wrap" style="flex:1 1 auto; overflow-y:auto; overflow-x:hidden; width:100%; border:1px solid rgba(255,255,255,0.08); border-radius:6px; background:#0b1120;">
      <table class="data-table" style="width:100%; border-collapse:collapse; font-size:12px; table-layout:fixed;">
        <thead style="position:sticky; top:0; z-index:10; background:#0f172a; border-bottom:1px solid #334155;">
          <tr>
            <th style="width:14%; text-align:left; padding:8px 10px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px;">Phase / Level</th>
            <th style="width:20%; text-align:left; padding:8px 10px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px;">Assessment Component</th>
            <th style="width:14%; text-align:center; padding:8px 10px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px;">Timing & Frequency</th>
            <th style="width:18%; text-align:left; padding:8px 10px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px;">Target Metric / Benchmark</th>
            <th style="width:14%; text-align:left; padding:8px 10px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px;">Evaluator / Panel</th>
            <th style="width:20%; text-align:left; padding:8px 10px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px;">Evaluation Protocol & Rules</th>
          </tr>
        </thead>
        <tbody>
          ${items.length === 0 ? `
            <tr>
              <td colspan="6" style="text-align:center; padding:30px; color:#64748b; font-weight:600;">
                No assessment rules found matching your filter.
              </td>
            </tr>
          ` : items.map((row, idx) => `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.05); background:${idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'}; transition:background 0.15s ease;" onmouseover="this.style.background='rgba(56,189,248,0.05)'" onmouseout="this.style.background='${idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'}'">
              <td style="padding:8px 10px; vertical-align:top;">
                <div style="display:inline-flex; align-items:center; gap:5px;">
                  <span class="badge" style="background:${row.badgeColor}22; color:${row.badgeColor}; border:1px solid ${row.badgeColor}44; font-size:11px; font-weight:800; padding:2px 6px; border-radius:3px;">
                    ${escHtml(row.levelLabel)}
                  </span>
                </div>
                <div style="font-size:11px; color:#64748b; margin-top:3px; font-weight:600;">
                  ${escHtml(row.weightCategory)}
                </div>
              </td>
              <td style="padding:8px 10px; vertical-align:top;">
                <div style="font-weight:700; color:#f8fafc; font-size:12px;">
                  ${escHtml(row.component)}
                </div>
                <div style="font-size:11px; color:#38bdf8; font-weight:600; margin-top:2px;">
                  ${row.dataPoints} Data Point${row.dataPoints > 1 ? 's' : ''}
                </div>
              </td>
              <td style="padding:8px 10px; vertical-align:top; text-align:center;">
                <div style="color:#e2e8f0; font-weight:700; font-size:11px;">
                  ${escHtml(row.timing)}
                </div>
                <div style="color:#94a3b8; font-size:11px; margin-top:2px;">
                  ${escHtml(row.frequency)}
                </div>
              </td>
              <td style="padding:8px 10px; vertical-align:top;">
                <div style="color:#facc15; font-weight:700; font-size:11px; font-family:monospace; background:rgba(250,204,21,0.08); padding:3px 6px; border-radius:4px; display:inline-block; border:1px solid rgba(250,204,21,0.2);">
                  ${escHtml(row.targetMetric)}
                </div>
              </td>
              <td style="padding:8px 10px; vertical-align:top;">
                <div style="color:#cbd5e1; font-weight:700; font-size:11px;">
                  ${escHtml(row.evaluator)}
                </div>
              </td>
              <td style="padding:8px 10px; vertical-align:top; color:#94a3b8; font-size:11px; line-height:1.45;">
                ${escHtml(row.protocol)}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Tab 2: Scoring Formulas (Kalkulasi Nilai Akhir) & Transcript Predicates
 */
function renderFormulasViewHtml() {
  return `
    <div style="flex:1 1 auto; overflow-y:auto; overflow-x:hidden; padding:12px; background:#0b1120; border:1px solid rgba(255,255,255,0.08); border-radius:6px; box-sizing:border-box;">
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:14px;">
        
        <!-- Formula Box: Vocabulary -->
        <div class="card" style="background:#0f172a; border:1px solid #334155; border-radius:6px; padding:12px;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
            <span style="font-weight:800; color:#95ff00; font-size:13px; text-transform:uppercase;">1. Vocabulary Mastery Formula</span>
            <span class="badge" style="background:#95ff0022; color:#95ff00; border:1px solid #95ff00; font-size:11px; font-weight:800;">4 Weeks Cumulative</span>
          </div>
          <p style="font-size:12px; color:#cbd5e1; line-height:1.5; margin:0 0 8px 0;">
            Weekly Percentage: <code>% = (Words Deposited / Week Denominator) × 100</code>.<br>
            <strong>NA Step</strong> = Average of 4 Weeks: <code>(W1% + W2% + W3% + W4%) / 4</code>.<br>
            <strong>NA Total Vocab</strong> = Composite Average of Active Steps: <code>(NA_L1 + NA_L2 + NA_L3) / 3</code>.
          </p>
          <div style="background:#070a13; border:1px solid rgba(255,255,255,0.06); padding:8px; border-radius:4px; font-family:monospace; font-size:11px; color:#38bdf8;">
            Step 1 Denominators: W1(98), W2(266), W3(431), W4(574)<br>
            Step 2 Denominators: W1(120), W2(280), W3(440), W4(600)<br>
            Step 3 Denominators: W1(150), W2(400), W3(650), W4(800)
          </div>
        </div>

        <!-- Formula Box: Grammar & Class Focus -->
        <div class="card" style="background:#0f172a; border:1px solid #334155; border-radius:6px; padding:12px;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
            <span style="font-weight:800; color:#38bdf8; font-size:13px; text-transform:uppercase;">2. Grammar & Structure Formula</span>
            <span class="badge" style="background:#38bdf822; color:#38bdf8; border:1px solid #38bdf8; font-size:11px; font-weight:800;">2 Tests per Step</span>
          </div>
          <p style="font-size:12px; color:#cbd5e1; line-height:1.5; margin:0 0 8px 0;">
            Test Percentage: <code>% = (Points Earned / Target Max) × 100</code>.<br>
            <strong>NA Step</strong> = Average of 2 Tests: <code>(Test1% + Test2%) / 2</code>.<br>
            <strong>NA Total Grammar</strong> = Composite Average of Active Steps: <code>(NA_L1 + NA_L2 + NA_L3) / 3</code>.
          </p>
          <div style="background:#070a13; border:1px solid rgba(255,255,255,0.06); padding:8px; border-radius:4px; font-family:monospace; font-size:11px; color:#38bdf8;">
            Step 1 Grammar: W1(15 pts), W2(20 pts) | Basic English: W1(100), W2(100)<br>
            Step 2 Grammar: W1(30 pts), W2(30 pts) | GFS: W1(20 pts), W2(20 pts)<br>
            Step 3 Grammar: W1(15 pts), W2(15 pts) | Pronunciation: W1(25), W2(25)
          </div>
        </div>

        <!-- Formula Box: Speaking Practice -->
        <div class="card" style="background:#0f172a; border:1px solid #334155; border-radius:6px; padding:12px;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
            <span style="font-weight:800; color:#FF8C00; font-size:13px; text-transform:uppercase;">3. Speaking & Telling Story Formula</span>
            <span class="badge" style="background:#FF8C0022; color:#FF8C00; border:1px solid #FF8C00; font-size:11px; font-weight:800;">Periodical Rubric</span>
          </div>
          <p style="font-size:12px; color:#cbd5e1; line-height:1.5; margin:0 0 8px 0;">
            Session Percentage: <code>% = (Points / 25) × 100</code>.<br>
            <strong>Step 1 NA</strong> = Average of 2 periodic tests (or 4 with practice).<br>
            <strong>Step 2 & 3 NA</strong> = Average of 3 Speaking sessions.<br>
            <strong>NA Total Speaking</strong> = Composite: <code>(NA_L1 + NA_L2 + NA_L3) / 3</code>.
          </p>
          <div style="background:#070a13; border:1px solid rgba(255,255,255,0.06); padding:8px; border-radius:4px; font-family:monospace; font-size:11px; color:#FF8C00;">
            Target Points: 10–25 (Step 1), 12–25 (Step 2), 15–25 (Step 3).<br>
            Tutor grades directly via 1–5 Rubric or 25-Point 5-Axis Index.
          </div>
        </div>

        <!-- Formula Box: Certificate Predicate Scale -->
        <div class="card" style="background:#0f172a; border:1px solid #334155; border-radius:6px; padding:12px;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
            <span style="font-weight:800; color:#c084fc; font-size:13px; text-transform:uppercase;">4. Official Certificate Predicate Scale</span>
            <span class="badge" style="background:#c084fc22; color:#c084fc; border:1px solid #c084fc; font-size:11px; font-weight:800;">Angket Sertifikat</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:4px; font-size:12px;">
            ${EXAM_RULES_SCHEMA.CERTIFICATE_PREDICATES.map(p => `
              <div style="display:flex; align-items:center; justify-content:space-between; padding:3px 6px; background:#070a13; border-radius:3px;">
                <span style="font-weight:800; color:${p.color};">${p.predicate} (${p.grade})</span>
                <span style="font-family:monospace; color:#cbd5e1;">Score: ${p.min.toFixed(0)}% – ${p.max.toFixed(0)}%</span>
              </div>
            `).join('')}
          </div>
        </div>

      </div>
    </div>
  `;
}

/**
 * Tab 3: Final Evaluations (2 Independent Panels)
 */
function renderFinalPanelsViewHtml() {
  const p1 = EXAM_RULES_SCHEMA.FINAL_EVALUATION.panels.mainExaminer;
  const p2 = EXAM_RULES_SCHEMA.FINAL_EVALUATION.panels.speakingTutor;

  return `
    <div style="flex:1 1 auto; overflow-y:auto; overflow-x:hidden; padding:12px; background:#0b1120; border:1px solid rgba(255,255,255,0.08); border-radius:6px; box-sizing:border-box;">
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
        
        <!-- Panel 1 -->
        <div class="card" style="background:#0f172a; border:2px solid #ff2d8744; border-radius:6px; padding:14px;">
          <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid #334155; padding-bottom:8px; margin-bottom:12px;">
            <div>
              <h3 style="margin:0; font-size:14px; font-weight:800; color:#ff2d87; text-transform:uppercase;">${escHtml(p1.title)}</h3>
              <div style="font-size:11px; color:#94a3b8; margin-top:2px;">Lead: ${p1.leadExaminers.join(' / ')}</div>
            </div>
            <span class="badge" style="background:#ff2d8722; color:#ff2d87; border:1px solid #ff2d87; font-size:13px; font-weight:900; padding:3px 8px;">Max 100 Pts</span>
          </div>

          <div style="display:flex; flex-direction:column; gap:8px;">
            ${p1.parameters.map((param, i) => `
              <div style="display:flex; align-items:center; justify-content:space-between; background:#070a13; border:1px solid #334155; padding:8px 10px; border-radius:4px;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <span style="font-weight:900; color:#ff2d87; font-size:13px;">${i + 1}.</span>
                  <span style="font-size:12px; font-weight:700; color:#f8fafc;">${escHtml(param.label)}</span>
                </div>
                <span class="badge" style="background:#1e293b; color:#cbd5e1; border:1px solid #475569; font-size:11px; font-weight:700;">1 – 25 Pts</span>
              </div>
            `).join('')}
          </div>
          <p style="font-size:11px; color:#94a3b8; line-height:1.45; margin:12px 0 0 0;">
            <strong>Protocol:</strong> Double-blind evaluation. Main examiner tests spontaneous oral expression, structure, and lexical logic. Results directly determine graduation honors.
          </p>
        </div>

        <!-- Panel 2 -->
        <div class="card" style="background:#0f172a; border:2px solid #38bdf844; border-radius:6px; padding:14px;">
          <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid #334155; padding-bottom:8px; margin-bottom:12px;">
            <div>
              <h3 style="margin:0; font-size:14px; font-weight:800; color:#38bdf8; text-transform:uppercase;">${escHtml(p2.title)}</h3>
              <div style="font-size:11px; color:#94a3b8; margin-top:2px;">Lead: ${p2.leadExaminers.join(' / ')}</div>
            </div>
            <span class="badge" style="background:#38bdf822; color:#38bdf8; border:1px solid #38bdf8; font-size:13px; font-weight:900; padding:3px 8px;">Max 100 Pts</span>
          </div>

          <div style="display:flex; flex-direction:column; gap:8px;">
            ${p2.parameters.map((param, i) => `
              <div style="display:flex; align-items:center; justify-content:space-between; background:#070a13; border:1px solid #334155; padding:8px 10px; border-radius:4px;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <span style="font-weight:900; color:#38bdf8; font-size:13px;">${i + 1}.</span>
                  <span style="font-size:12px; font-weight:700; color:#f8fafc;">${escHtml(param.label)}</span>
                </div>
                <span class="badge" style="background:#1e293b; color:#cbd5e1; border:1px solid #475569; font-size:11px; font-weight:700;">1 – 25 Pts</span>
              </div>
            `).join('')}
          </div>
          <p style="font-size:11px; color:#94a3b8; line-height:1.45; margin:12px 0 0 0;">
            <strong>Protocol:</strong> Practical performance panel. Speaking tutor evaluates practical conversational fluidity and real-time prompt comprehension.
          </p>
        </div>

      </div>
    </div>
  `;
}

/**
 * Tab 4: Weekly Storytelling Rubrics
 */
function renderWeeklyRubricsViewHtml() {
  const weeks = EXAM_RULES_SCHEMA.RUBRICS.TELLING_STORY_WEEKLY;

  return `
    <div style="flex:1 1 auto; overflow-y:auto; overflow-x:hidden; padding:12px; background:#0b1120; border:1px solid rgba(255,255,255,0.08); border-radius:6px; box-sizing:border-box;">
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        ${Object.keys(weeks).map(wKey => {
          const wObj = weeks[wKey];
          return `
            <div class="card" style="background:#0f172a; border:1px solid #334155; border-radius:6px; padding:12px;">
              <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; border-bottom:1px solid #1e293b; padding-bottom:6px;">
                <span style="font-weight:900; color:#FF8C00; font-size:13px; text-transform:uppercase;">${wKey} Storytelling Target</span>
                <span style="font-size:11px; color:#38bdf8; font-weight:700;">${escHtml(wObj.focus)}</span>
              </div>
              <div style="display:flex; flex-direction:column; gap:4px;">
                ${wObj.indicators.map(ind => `
                  <div style="display:flex; align-items:flex-start; gap:8px; padding:4px 6px; background:#070a13; border-radius:3px; font-size:11px;">
                    <span class="badge" style="background:#1e293b; color:#facc15; border:1px solid #334155; font-size:11px; font-weight:800; min-width:20px; text-align:center;">${ind.score}</span>
                    <span style="color:#e2e8f0; line-height:1.4;">${escHtml(ind.text)}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

/**
 * Tab 5: 5-Axis Analytical Speaking Matrix
 */
function renderSpeaking5AxisViewHtml() {
  const axes = EXAM_RULES_SCHEMA.RUBRICS.SPEAKING_5_AXIS;

  return `
    <div style="flex:1 1 auto; overflow-y:auto; overflow-x:hidden; padding:12px; background:#0b1120; border:1px solid rgba(255,255,255,0.08); border-radius:6px; box-sizing:border-box;">
      <div style="display:flex; flex-direction:column; gap:12px;">
        
        <div style="display:grid; grid-template-columns:repeat(5, 1fr); gap:8px;">
          ${['fluency', 'pronunciation', 'vocabulary', 'grammar', 'comprehension'].map(axisKey => `
            <div class="card" style="background:#0f172a; border:1px solid #334155; border-radius:6px; padding:10px;">
              <div style="font-weight:900; color:#38bdf8; font-size:12px; text-transform:uppercase; margin-bottom:6px; border-bottom:1px solid #1e293b; padding-bottom:4px;">
                ${axisKey}
              </div>
              <div style="display:flex; flex-direction:column; gap:4px;">
                ${axes[axisKey].map(ind => `
                  <div style="font-size:10.5px; padding:4px; background:#070a13; border-radius:3px; color:#cbd5e1; line-height:1.35;">
                    <strong style="color:#facc15;">${ind.score}.</strong> ${escHtml(ind.text)}
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Composite Bands -->
        <div class="card" style="background:#0f172a; border:1px solid #334155; border-radius:6px; padding:10px;">
          <div style="font-weight:800; color:#95ff00; font-size:12px; text-transform:uppercase; margin-bottom:6px;">
            Total Speaking Index Bands (Sum of 5 Parameters = 5–25 Points)
          </div>
          <div style="display:grid; grid-template-columns:repeat(5, 1fr); gap:6px;">
            ${axes.totalBands.map(b => `
              <div style="background:#070a13; border:1px solid #334155; border-radius:4px; padding:6px; text-align:center;">
                <div style="font-weight:800; color:#facc15; font-size:12px;">${b.min} – ${b.max} Pts</div>
                <div style="font-weight:700; color:#38bdf8; font-size:11px; margin-top:2px;">${b.predicate}</div>
              </div>
            `).join('')}
          </div>
        </div>

      </div>
    </div>
  `;
}

/**
 * Tab 6: Live Grade Simulator
 */
function renderSimulatorViewHtml() {
  return `
    <div style="flex:1 1 auto; overflow-y:auto; overflow-x:hidden; padding:12px; background:#0b1120; border:1px solid rgba(255,255,255,0.08); border-radius:6px; box-sizing:border-box;">
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        
        <!-- Input Form -->
        <div class="card" style="background:#0f172a; border:1px solid #334155; border-radius:6px; padding:12px;">
          <h3 style="margin:0 0 10px 0; font-size:13px; font-weight:800; color:#38bdf8; text-transform:uppercase;">
            Interactive Score Input
          </h3>

          <div style="display:flex; flex-direction:column; gap:8px; font-size:11px;">
            <div>
              <label style="color:#cbd5e1; font-weight:700;">Vocabulary Step Scores (%):</label>
              <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:6px; margin-top:3px;">
                <input type="number" id="sim-v1" placeholder="Step 1" value="70.5" style="background:#070a13; border:1px solid #334155; color:#fff; padding:4px 6px; border-radius:3px; font-size:11px;" />
                <input type="number" id="sim-v2" placeholder="Step 2" value="82.4" style="background:#070a13; border:1px solid #334155; color:#fff; padding:4px 6px; border-radius:3px; font-size:11px;" />
                <input type="number" id="sim-v3" placeholder="Step 3" value="80.7" style="background:#070a13; border:1px solid #334155; color:#fff; padding:4px 6px; border-radius:3px; font-size:11px;" />
              </div>
            </div>

            <div>
              <label style="color:#cbd5e1; font-weight:700;">Grammar Step Scores (%):</label>
              <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:6px; margin-top:3px;">
                <input type="number" id="sim-g1" placeholder="Step 1" value="85" style="background:#070a13; border:1px solid #334155; color:#fff; padding:4px 6px; border-radius:3px; font-size:11px;" />
                <input type="number" id="sim-g2" placeholder="Step 2" value="75" style="background:#070a13; border:1px solid #334155; color:#fff; padding:4px 6px; border-radius:3px; font-size:11px;" />
                <input type="number" id="sim-g3" placeholder="Step 3" value="80" style="background:#070a13; border:1px solid #334155; color:#fff; padding:4px 6px; border-radius:3px; font-size:11px;" />
              </div>
            </div>

            <div>
              <label style="color:#cbd5e1; font-weight:700;">Speaking Step Scores (%):</label>
              <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:6px; margin-top:3px;">
                <input type="number" id="sim-s1" placeholder="Step 1" value="65" style="background:#070a13; border:1px solid #334155; color:#fff; padding:4px 6px; border-radius:3px; font-size:11px;" />
                <input type="number" id="sim-s2" placeholder="Step 2" value="78" style="background:#070a13; border:1px solid #334155; color:#fff; padding:4px 6px; border-radius:3px; font-size:11px;" />
                <input type="number" id="sim-s3" placeholder="Step 3" value="68" style="background:#070a13; border:1px solid #334155; color:#fff; padding:4px 6px; border-radius:3px; font-size:11px;" />
              </div>
            </div>

            <div>
              <label style="color:#cbd5e1; font-weight:700;">Pronunciation Score (%):</label>
              <input type="number" id="sim-p3" placeholder="Step 3" value="65" style="width:100%; box-sizing:border-box; background:#070a13; border:1px solid #334155; color:#fff; padding:4px 6px; border-radius:3px; font-size:11px; margin-top:3px;" />
            </div>

            <div>
              <label style="color:#cbd5e1; font-weight:700;">Final Practice (Panel 2 - 100 Pts):</label>
              <input type="number" id="sim-practice" placeholder="0 - 100" value="85" style="width:100%; box-sizing:border-box; background:#070a13; border:1px solid #334155; color:#fff; padding:4px 6px; border-radius:3px; font-size:11px; margin-top:3px;" />
            </div>

            <button type="button" class="btn btn-primary btn-sm" onclick="window.runLiveSimulatorCalculation()" style="height:28px; line-height:26px; font-size:12px; font-weight:800; background:#0284c7; border:1px solid #38bdf8; color:#fff; border-radius:4px; cursor:pointer; margin-top:6px;">
              Calculate Official Transcript
            </button>
          </div>
        </div>

        <!-- Output Report Card -->
        <div class="card" style="background:#0f172a; border:1px solid #334155; border-radius:6px; padding:12px;">
          <h3 style="margin:0 0 10px 0; font-size:13px; font-weight:800; color:#95ff00; text-transform:uppercase;">
            Official Angket Sertifikat Preview
          </h3>
          <div id="sim-results-output">
            <div style="font-size:12px; color:#94a3b8; font-style:italic; padding:20px; text-align:center;">
              Click 'Calculate Official Transcript' to simulate the authoritative transcript dossier.
            </div>
          </div>
        </div>

      </div>
    </div>
  `;
}

/**
 * Executes the live simulator calculation
 */
function executeSimulator() {
  const v1 = parseFloat(document.getElementById('sim-v1')?.value) || 0;
  const v2 = parseFloat(document.getElementById('sim-v2')?.value) || 0;
  const v3 = parseFloat(document.getElementById('sim-v3')?.value) || 0;

  const g1 = parseFloat(document.getElementById('sim-g1')?.value) || 0;
  const g2 = parseFloat(document.getElementById('sim-g2')?.value) || 0;
  const g3 = parseFloat(document.getElementById('sim-g3')?.value) || 0;

  const s1 = parseFloat(document.getElementById('sim-s1')?.value) || 0;
  const s2 = parseFloat(document.getElementById('sim-s2')?.value) || 0;
  const s3 = parseFloat(document.getElementById('sim-s3')?.value) || 0;

  const p3 = parseFloat(document.getElementById('sim-p3')?.value) || 0;
  const prac = parseFloat(document.getElementById('sim-practice')?.value) || 0;

  const report = generateStudentCertificateTranscript({
    vocabScores: [v1, v2, v3],
    grammarScores: [g1, g2, g3],
    speakingScores: [s1, s2, s3],
    pronunciationScores: [p3],
    practiceFinalScore: prac
  });

  const getPredColor = (pred) => {
    switch (pred) {
      case 'EXCELLENT': return '#c084fc';
      case 'VERY GOOD': return '#00c000';
      case 'GOOD': return '#95ff00';
      case 'ENOUGH': return '#ffff00';
      default: return '#ff0000';
    }
  };

  const container = document.getElementById('sim-results-output');
  if (!container) return;

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:6px;">
      ${[
        { subject: 'VOCABULARY', data: report.vocabulary },
        { subject: 'GRAMMAR', data: report.grammar },
        { subject: 'SPEAKING', data: report.speaking },
        { subject: 'PRONUNCIATION', data: report.pronunciation },
        { subject: 'PRACTICE (FINAL EXAM)', data: report.practice }
      ].map(row => {
        const c = getPredColor(row.data.predicate);
        return `
          <div style="display:flex; align-items:center; justify-content:space-between; background:#070a13; border:1px solid #334155; padding:8px 10px; border-radius:4px;">
            <div>
              <span style="font-weight:800; color:#f8fafc; font-size:12px;">${row.subject}</span>
              <div style="font-size:11px; color:#94a3b8; font-family:monospace; margin-top:1px;">
                Score: ${row.data.score != null ? row.data.score.toFixed(2) + '%' : '—'}
              </div>
            </div>
            <span class="badge" style="background:${c}22; color:${c}; border:1px solid ${c}; font-size:12px; font-weight:900; padding:3px 8px; border-radius:3px;">
              ${row.data.predicate}
            </span>
          </div>
        `;
      }).join('')}
    </div>
  `;

  showToast('✓ Calculated transcript dossier successfully', 'success');
}

/**
 * Docked Sub Panel (Lower Panel 40px) Renderer via window.setBottomInfobar
 */
function renderSubPanel() {
  if (typeof window.setBottomInfobar !== 'function') return;

  // Left Sub Panel: Statistics metrics
  const leftHtml = `
    <div style="display:flex; align-items:center; gap:8px; flex-wrap:nowrap; overflow-x:auto; scrollbar-width:none; padding-right:8px;">
      <div style="display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:800; color:#f8fafc; white-space:nowrap; flex-shrink:0;">
        <span style="color:#ff2d87; display:inline-flex; align-items:center;">${getSvgIcon('award', 14)}</span>
        <span>EXAM RULES ENGINE</span>
      </div>
      <div style="width:1px; height:18px; background:rgba(255,255,255,0.12); flex-shrink:0;"></div>
      <div style="display:flex; align-items:center; gap:5px; flex-shrink:0;">
        <span class="badge" style="background:#1e293b; color:#95ff00; border:1px solid #334155; font-size:11px; font-weight:800; padding:1px 6px; border-radius:3px;">
          Step 1: 52 Pts
        </span>
        <span class="badge" style="background:#1e293b; color:#ff8c00; border:1px solid #334155; font-size:11px; font-weight:800; padding:1px 6px; border-radius:3px;">
          Step 2: 51 Pts
        </span>
        <span class="badge" style="background:#1e293b; color:#c084fc; border:1px solid #334155; font-size:11px; font-weight:800; padding:1px 6px; border-radius:3px;">
          Step 3: 11 Pts
        </span>
        <span class="badge" style="background:#1e293b; color:#ff2d87; border:1px solid #334155; font-size:11px; font-weight:800; padding:1px 6px; border-radius:3px;">
          Final: 2 Panels (8 Params)
        </span>
      </div>
    </div>
  `;

  // Right Sub Panel: Search and Export actions
  const rightHtml = `
    <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
      <!-- Search Input -->
      <div style="position:relative; width:160px;">
        <span style="position:absolute; left:7px; top:50%; transform:translateY(-50%); color:#64748b; display:flex; align-items:center;">
          ${getSvgIcon('search', 12)}
        </span>
        <input type="text" id="exam-rules-search-input" value="${escHtml(_searchFilter)}" placeholder="Filter rules..." oninput="window.handleExamRulesSearch(this.value)" style="width:100%; height:28px; box-sizing:border-box; background:#070a13; border:1px solid #334155; border-radius:4px; color:#f8fafc; font-size:12px; font-weight:500; padding:0 22px 0 24px; outline:none;" />
        ${_searchFilter ? `<button type="button" onclick="window.handleExamRulesSearch(''); document.getElementById('exam-rules-search-input').value='';" style="position:absolute; right:6px; top:50%; transform:translateY(-50%); background:none; border:none; color:#94a3b8; cursor:pointer; font-size:12px; font-weight:700;">×</button>` : ''}
      </div>

      <!-- Export Buttons -->
      <button type="button" class="btn btn-outline btn-sm" onclick="window.exportExamRulesMarkdown()" title="Export Regulations to Markdown" style="height:28px; line-height:26px; padding:0 8px; font-size:12px; font-weight:700; border-color:#334155; color:#cbd5e1; border-radius:4px;">
        .MD
      </button>
      <button type="button" class="btn btn-outline btn-sm" onclick="window.exportExamRulesCSV()" title="Export Assessment Matrix to CSV" style="height:28px; line-height:26px; padding:0 8px; font-size:12px; font-weight:700; border-color:#334155; color:#cbd5e1; border-radius:4px;">
        .CSV
      </button>
    </div>
  `;

  window.setBottomInfobar(leftHtml, rightHtml);
}

/**
 * Export helpers
 */
function exportToMarkdown() {
  const content = `# TopsCore LMS — Exam & Assessment Regulations Export\n\nGenerated on: ${new Date().toISOString()}\n\n` +
    `| Phase / Level | Assessment Component | Timing & Frequency | Target Metric | Evaluator | Protocol |\n` +
    `| :--- | :--- | :--- | :--- | :--- | :--- |\n` +
    ASSESSMENT_MASTER_DATA.map(r => `| ${r.levelLabel} | ${r.component} | ${r.timing} (${r.frequency}) | ${r.targetMetric} | ${r.evaluator} | ${r.protocol} |`).join('\n');

  downloadBlob(content, 'topscore_exam_regulations.md', 'text/markdown;charset=utf-8');
  showToast('✓ Exam regulations exported to Markdown (.md)', 'success');
}

function exportToCSV() {
  const headers = ['Phase', 'Level', 'Component', 'Timing', 'Frequency', 'Target Metric', 'Evaluator', 'Data Points', 'Protocol'];
  const rows = ASSESSMENT_MASTER_DATA.map(r => [
    `"${r.phaseName.replace(/"/g, '""')}"`,
    `"${r.levelLabel.replace(/"/g, '""')}"`,
    `"${r.component.replace(/"/g, '""')}"`,
    `"${r.timing.replace(/"/g, '""')}"`,
    `"${r.frequency.replace(/"/g, '""')}"`,
    `"${r.targetMetric.replace(/"/g, '""')}"`,
    `"${r.evaluator.replace(/"/g, '""')}"`,
    r.dataPoints,
    `"${r.protocol.replace(/"/g, '""')}"`
  ]);

  const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  downloadBlob(csv, 'topscore_assessment_matrix.csv', 'text/csv;charset=utf-8');
  showToast('✓ Assessment matrix exported to CSV (.csv)', 'success');
}

function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
