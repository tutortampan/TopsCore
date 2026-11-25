/**
 * TopsCore — Test Result Viewer Module
 * v5.3.3 — 10 Feature Upgrades: Score Ring, Student Name, Motivation Msg,
 *           Rank in Batch, Attempt Counter, Improvement Delta, BG Particles,
 *           Time Taken, Tutor Note Card, Staggered Entrance Animations
 */

import { fetchAttemptResult, fetchAttemptAnswers, fetchAllStudentAttempts, fetchTestsForStudentLevel, fetchActiveTestSession, fetchStudentClasses, fetchClassTestSettings, startTest, submitTest, TOPSCORE_COLORS, getEvaluationColor, GRADE_PALETTE, getGradeColor, getScoreColor, getGradeTheme, labelAttemptRemedial, labelAttemptNormal, labelAttemptForgiven, cleanStudentName, formatAcademicTier, isCampContext } from './api.js?v=20261115_v541';
import { isExam, getGradeColorByScore, calculateGrade, formatTestDisplay, validateDescriptionSentence } from './grading.js?v=20261106_v160';
import { getStudentSession, getAdminSession } from './session.js?v=20261106_v160';
import { showToast, getGrade, showLoading, hideLoading, escapeHtml, escHtml } from './app.js?v=20261106_v160';
import { getSupabase } from './supabase.js?v=20261106_v160';
import { getSvgIcon } from './svg-icons.js?v=20261114_01';
import { formatProvinceName, formatCityDistrict, formatDistrictName, formatVillageName } from './indonesia-regions.js?v=20261117_v547';

const urlParams = new URLSearchParams(window.location.search);
const isAdminParam = urlParams.get('admin') === '1' || urlParams.get('is_admin') === 'true' || urlParams.get('from') === 'admin' || urlParams.get('mode') === 'tutor';

let session = getStudentSession();
if (!session) {
  const admin = getAdminSession();
  if (admin || isAdminParam) {
    session = { student_name: 'Administrator', is_admin: true };
  } else {
    window.location.replace('index.html');
    throw new Error('Not authenticated');
  }
}

// V1: support ?attempt_id= URL param (from dashboard "View Result" button)
let attemptId = urlParams.get('attempt_id') || sessionStorage.getItem('topscore_attempt_id');
if (attemptId === 'undefined' || attemptId === 'null') attemptId = null;
if (!attemptId) {
  window.location.href = (isAdminParam || session?.is_admin) ? 'admin.html#class-hub' : 'dashboard.html';
}

// ─── Universal Netlify Badge & External Floating Injections Purge ───
function purgeExternalBadges() {
  try {
    const netlifyEls = document.querySelectorAll('a[href*="netlify.com"], netlify-drawer, [data-netlify-badge], .netlify-badge, #netlify-badge');
    netlifyEls.forEach(el => {
      const container = el.closest('div') || el;
      container.remove();
    });
  } catch (_) {}
}
purgeExternalBadges();
setTimeout(purgeExternalBadges, 2000);

    // escapeHtml / escHtml imported canonically

    function getEvalCategory(a) {
      if (!a) return 'incorrect';
      const res = (a.evaluation_result || '').toLowerCase();
      const score = Number(a.score ?? 0);
      if (res === 'correct' || (!res && (a.is_correct === true || score >= 1))) {
        return 'correct';
      }
      if (res === 'minor_spelling_error' || res === 'minor_word_form_error' || res === 'partial' || (!res && score > 0 && score < 1)) {
        return 'minor_spelling_error';
      }
      return 'incorrect';
    }


    // Humanize raw test_type values from DB
    function humanizeType(raw) {
      if (!raw) return '';
      const map = {
        VOCABULARY: 'Vocabulary',
        GRAMMAR: 'Grammar',
        SPEAKING: 'Speaking',
        LISTENING: 'Listening',
        READING: 'Reading',
        WRITING: 'Writing',
        TEST: 'Exam',
        EXAM: 'Exam',
        QUIZ: 'Task',
        WORD_TASK: 'Word Task',
        PHRASE_TASK: 'Phrase Task',
        VOCAB_QUIZ: 'Word Task',
        PHRASE_QUIZ: 'Phrase Task',
        VOCAB_TEST: 'Vocab Exam',
        VOCAB_EXAM: 'Vocab Exam',
        WORDS_TEST: 'Word Exam',
        WORDS_EXAM: 'Word Exam',
        PHRASES_TEST: 'Phrase Exam',
        PHRASES_EXAM: 'Phrase Exam',
      };
      return map[raw.toUpperCase()] || raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }

    // Remove leading "N. " numbering from titles (e.g. "1. Building Your..." → "Building Your...")
    function cleanTitle(t) {
      if (!t) return '';
      return String(t).replace(/^\d+\.\s*/, '').trim();
    }

    // ═══════════════════════════════════════════════════════════
    // FEATURE 1: Grade-specific background particle field
    // ═══════════════════════════════════════════════════════════
    function launchBgParticles(grade) {
      const canvas = document.getElementById('bg-particle-canvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      // Color palette per grade (Matte Modern)
      const starColor = TOPSCORE_COLORS.STAR;
      const aColor = TOPSCORE_COLORS.A;
      const bColor = TOPSCORE_COLORS.B;
      const cColor = TOPSCORE_COLORS.C;
      const dColor = TOPSCORE_COLORS.D;
      const eColor = TOPSCORE_COLORS.E;
      const palettes = {
        '★': [starColor, '#d8b4fe', '#7e22ce', '#e9d5ff'],
        S: [starColor, '#d8b4fe', '#7e22ce', '#e9d5ff'],
        A: [aColor, aColor, aColor, aColor],
        B: [bColor, '#d9f99d', TOPSCORE_COLORS.B, '#bef264'],
        C: [cColor, '#ffff99', TOPSCORE_COLORS.C, 'var(--grade-c, #ffff00)'],
        D: [dColor, '#fed7aa', TOPSCORE_COLORS.D, 'var(--grade-d, #ff8c00)'],
        E: [eColor, '#ff9999', TOPSCORE_COLORS.E, 'var(--grade-e, #ff0000)'],
        F: [eColor, '#ff9999', TOPSCORE_COLORS.E, 'var(--grade-e, #ff0000)'],
        REMEDIAL: [cColor, '#ffff99', TOPSCORE_COLORS.C, 'var(--grade-c, #ffff00)'],
      };
      const colors = palettes[grade] || palettes.B;

      const particles = Array.from({ length: 28 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 2.5 + 0.5,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: Math.random() * 0.5 + 0.2,
      }));

      let running = true;
      function draw() {
        if (!running) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0) p.x = canvas.width;
          if (p.x > canvas.width) p.x = 0;
          if (p.y < 0) p.y = canvas.height;
          if (p.y > canvas.height) p.y = 0;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.opacity;
          ctx.fill();
          ctx.globalAlpha = 1;
        });
        requestAnimationFrame(draw);
      }
      draw();
      // Clean up on navigate
      window.addEventListener('beforeunload', () => { running = false; });
    }

    // ═══════════════════════════════════════════════════════════
    // FEATURE 2: SVG Score Ring Animation
    // ═══════════════════════════════════════════════════════════
    function animateScoreRing(pct, grade, isRemedial = false) {
      const circle = document.getElementById('ring-progress-circle');
      if (!circle) return;
      const r = 50;
      const circumference = 2 * Math.PI * r;
      circle.style.strokeDasharray = circumference;
      circle.style.strokeDashoffset = circumference; // start empty

      circle.style.stroke = (pct >= 100 || grade === '★' || grade === 'S' || grade === 'STAR')
        ? TOPSCORE_COLORS.STAR
        : (typeof getGradeColor === 'function' ? getGradeColor(grade) : TOPSCORE_COLORS.B);

      const duration = 1400;
      const start = performance.now();
      function step(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        const offset = circumference * (1 - (ease * pct / 100));
        circle.style.strokeDashoffset = offset;
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    // ═══════════════════════════════════════════════════════════
    // ═══════════════════════════════════════════════════════════
    // FEATURE 4: Achievement Status (Rule DECISION-018)
    // Strictly 6 states: FAIL, LESS, ENOUGH, GOOD, VERY GOOD, EXCELLENT.
    // REMEDIAL is an exam condition/status, NOT an Achievement Status!
    // ═══════════════════════════════════════════════════════════
    function getAchievementStatus(grade, pct = null) {
      let g = String(grade || '').toUpperCase();
      const p = pct != null && !isNaN(Number(pct)) ? parseFloat(pct) : null;
      if (p !== null && p >= 100) return 'LEGEND';
      if (g === 'S' || g === 'STAR' || g === '★' || g === '⭐') return 'LEGEND';

      if (g === 'R' || !['A', 'B', 'C', 'D', 'E', 'F'].includes(g)) {
        if (p !== null) {
          if (p >= 90) g = 'A';
          else if (p >= 80) g = 'B';
          else if (p >= 70) g = 'C';
          else if (p >= 60) g = 'D';
          else g = 'E';
        }
      }
      const map = {
        A: 'EXCELLENT',
        B: 'VERY GOOD',
        C: 'GOOD',
        D: 'ENOUGH',
        E: 'LESS',
        F: 'LESS'
      };
      return map[g] || 'ENOUGH';
    }
    const getEvaluationWord = (grade, isRemedial = false, pct = null) => getAchievementStatus(grade, pct);

    // FEATURE 5: Rank in Batch (Suppressed per user request: "card 3 elemen tambahan itu buang saja")
    // ═══════════════════════════════════════════════════════════
    async function renderRankInBatch(targetStudentId, batchId) {
      return; // Disabled per user request
    }

    // Victory Confetti Engine for Star (⭐) / 100%
    function launchConfetti() {
      const canvas = document.getElementById('confetti-canvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const colors = [TOPSCORE_COLORS.C, TOPSCORE_COLORS.D, TOPSCORE_COLORS.B, '#38bdf8', 'var(--grade-star, #a855f7)', TOPSCORE_COLORS.STAR, '#ffffff'];
      const particles = [];
      const count = 75;
      for (let i = 0; i < count; i++) {
        particles.push({
          x: canvas.width / 2 + (Math.random() - 0.5) * 200,
          y: canvas.height * 0.35,
          vx: (Math.random() - 0.5) * 12,
          vy: (Math.random() - 1.2) * 10 - 3,
          size: Math.random() * 8 + 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
          vRot: (Math.random() - 0.5) * 10,
          opacity: 1
        });
      }

      let start = performance.now();
      function animate(t) {
        const elapsed = t - start;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let alive = false;
        particles.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.28; // gravity
          p.rotation += p.vRot;
          if (elapsed > 1800) {
            p.opacity -= 0.02;
          }
          if (p.opacity > 0 && p.y < canvas.height + 50) {
            alive = true;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.globalAlpha = Math.max(0, p.opacity);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
            ctx.restore();
          }
        });
        if (alive && elapsed < 4000) {
          requestAnimationFrame(animate);
        } else {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      requestAnimationFrame(animate);
    }

    // ─── Universal Lightbox Modal for Photo Review (Ide A) ───
    window.previewPhotoInModal = (photoUrl) => {
      let lightbox = document.getElementById('photo-lightbox-modal');
      if (!lightbox) {
        lightbox = document.createElement('div');
        lightbox.id = 'photo-lightbox-modal';
        lightbox.style.cssText = 'position:fixed; inset:0; background:rgba(2,6,23,0.92); -webkit-backdrop-filter:blur(10px); backdrop-filter:blur(10px); z-index:100000; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:16px; box-sizing:border-box; animation:modal-pop-in 0.2s ease forwards;';
        lightbox.innerHTML = `
          <div style="position:relative; max-width:92vw; max-height:86vh; display:flex; flex-direction:column; align-items:center;">
            <img id="photo-lightbox-img" src="" alt="Enlarged Photo Review" style="max-width:100%; max-height:76vh; border-radius:12px; border:1.5px solid rgba(255,255,255,0.25); box-shadow:0 10px 40px rgba(0,0,0,0.85); object-fit:contain;" />
            <button type="button" id="photo-lightbox-close" style="margin-top:14px; background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.3); border-radius:6px; color:#fff; font-size:14px; font-weight:800; padding:8px 24px; cursor:pointer;">CLOSE PREVIEW</button>
          </div>
        `;
        document.body.appendChild(lightbox);
        lightbox.addEventListener('click', (e) => {
          if (e.target === lightbox || e.target.id === 'photo-lightbox-close') {
            lightbox.style.display = 'none';
          }
        });
      }
      const img = document.getElementById('photo-lightbox-img');
      if (img) img.src = photoUrl;
      lightbox.style.display = 'flex';
    };

    let currentFilterCallback = null;

    // ─── Answer Breakdown Renderer with Filter Tabs & Description Review Cards (Ide A) ───
    function renderAnswers(answers, asmData = null, activeFilter = 'all') {
      const container = document.getElementById('answers-list-container');
      if (!container) return;
      container.innerHTML = '';

      if (!Array.isArray(answers) || answers.length === 0) {
        container.innerHTML = `
          <div style="text-align:center; padding:2rem 1rem; color:#94a3b8; font-size:12px;">
            No question responses recorded for this attempt.
          </div>
        `;
        return;
      }

      window._allAttemptAnswers = answers;
      if (asmData) window._currentAsmData = asmData;
      const effectiveAsmData = asmData || window._currentAsmData;

      // Check if this is a P2P Conversation / Dialogue attempt
      const isDialogue = answers.some(a => a.question_type_snapshot === 'P2P_CONVERSATION');
      if (isDialogue) {
        const firstAns = answers.find(a => a.question_type_snapshot === 'P2P_CONVERSATION') || answers[0];
        let evalData = null;
        try {
          evalData = typeof firstAns.accepted_answers_snapshot === 'string'
            ? JSON.parse(firstAns.accepted_answers_snapshot)
            : firstAns.accepted_answers_snapshot;
        } catch (_) {}

        let turns = [];
        try {
          turns = typeof firstAns.student_answer === 'string'
            ? JSON.parse(firstAns.student_answer)
            : firstAns.student_answer;
        } catch (_) {}

        const pillars = evalData?.pillars || {};
        const pillarCards = [
          { name: 'Fluency', score: pillars.fluency?.score || 85 },
          { name: 'Vocab', score: pillars.vocabulary?.score || 85 },
          { name: 'Grammar', score: pillars.grammar?.score || 85 },
          { name: 'Relevance', score: pillars.relevance?.score || 85 },
          { name: 'Turn', score: pillars.turn_taking?.score || 85 }
        ];

        container.innerHTML = `
          <div style="display:flex; flex-direction:column; gap:12px; padding:10px 0;">
            <div style="display:grid; grid-template-columns:repeat(5, 1fr); gap:8px;">
              ${pillarCards.map(p => `
                <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:8px 4px; text-align:center;">
                  <div style="font-size:12px; color:#94a3b8; font-weight:700; text-transform:uppercase;">${p.name}</div>
                  <div style="font-size:16px; font-weight:800; color:var(--primary-tactical); margin-top:2px;">${p.score}%</div>
                </div>
              `).join('')}
            </div>
            ${evalData?.feedback ? `
              <div style="padding:10px 12px; background:rgba(56,189,248,0.06); border:1px solid rgba(56,189,248,0.2); border-radius:8px; font-size:12px; color:#cbd5e1; line-height:1.5;">
                <strong style="color:var(--primary-tactical);">AI Feedback:</strong> ${escapeHtml(evalData.feedback)}
              </div>
            ` : ''}
            ${Array.isArray(turns) && turns.length > 0 ? `
              <div style="font-size:12px; font-weight:700; color:#cbd5e1; margin-top:4px;">Recorded Speaking Turns (${turns.length}):</div>
              <div style="display:flex; flex-direction:column; gap:6px; max-height:220px; overflow-y:auto;">
                ${turns.map((t, idx) => `
                  <div style="padding:8px 10px; background:rgba(255,255,255,0.03); border-radius:6px; font-size:12px; color:#94a3b8; border-left:3px solid var(--primary-tactical);">
                    <span style="font-weight:700; color:#fff;">Turn ${idx + 1}:</span> "${escapeHtml(t)}"
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        `;
        return;
      }

      // Check if this attempt belongs to a Description test
      const isDescriptionTest = answers.some(a => {
        const snap = typeof a.question_snapshot === 'string'
          ? (() => { try { return JSON.parse(a.question_snapshot); } catch { return {}; } })()
          : (a.question_snapshot || {});
        return a.question_type_snapshot === 'Description' || snap.answer_type === 'description' || snap.module === 'description';
      }) || Boolean(effectiveAsmData?.title && (effectiveAsmData.title.includes('Tell Me What You See') || effectiveAsmData.title.includes('Basic English')));

      // Calculate category counts
      const totalCount = answers.length;
      const correctCount = answers.filter(a => getEvalCategory(a) === 'correct').length;
      const partialCount = answers.filter(a => getEvalCategory(a) === 'minor_spelling_error').length;
      const wrongCount = answers.filter(a => getEvalCategory(a) === 'incorrect').length;

      // Filter answers
      let filteredAnswers = answers;
      if (activeFilter === 'correct') {
        filteredAnswers = answers.filter(a => getEvalCategory(a) === 'correct');
      } else if (activeFilter === 'partial') {
        filteredAnswers = answers.filter(a => getEvalCategory(a) === 'minor_spelling_error');
      } else if (activeFilter === 'incorrect') {
        filteredAnswers = answers.filter(a => getEvalCategory(a) === 'incorrect');
      }

      // Build Top Filter Tabs Bar
      const filterBarHtml = `
        <div class="ans-filter-bar">
          <button type="button" class="ans-filter-btn ${activeFilter === 'all' ? 'active' : ''}" data-filter="all">ALL (${totalCount})</button>
          <button type="button" class="ans-filter-btn ${activeFilter === 'correct' ? 'active' : ''}" data-filter="correct" style="color:${activeFilter === 'correct' ? '#fff' : 'var(--grade-a)'};">CORRECT (${correctCount})</button>
          ${partialCount > 0 ? `<button type="button" class="ans-filter-btn ${activeFilter === 'partial' ? 'active' : ''}" data-filter="partial" style="color:${activeFilter === 'partial' ? '#fff' : 'var(--grade-c)'};">PARTIAL (${partialCount})</button>` : ''}
          <button type="button" class="ans-filter-btn ${activeFilter === 'incorrect' ? 'active' : ''}" data-filter="incorrect" style="color:${activeFilter === 'incorrect' ? '#fff' : 'var(--grade-e)'};">INCORRECT (${wrongCount})</button>
        </div>
      `;

      let contentHtml = '';

      if (filteredAnswers.length === 0) {
        contentHtml = `
          <div style="text-align:center; padding:2rem 1rem; color:#94a3b8; font-size:12px;">
            No ${escapeHtml(activeFilter)} answers recorded.
          </div>
        `;
      } else if (isDescriptionTest) {
        // Render Description Review Cards (Ide A)
        const cardsHtml = filteredAnswers.map((a, idx) => {
          const snap = typeof a.question_snapshot === 'string'
            ? (() => { try { return JSON.parse(a.question_snapshot); } catch { return {}; } })()
            : (a.question_snapshot || {});

          const qNum = a.question_index !== undefined ? (a.question_index + 1) : (idx + 1);
          let targetDemo = 'this';
          if (snap.target_demonstrative) {
            targetDemo = String(snap.target_demonstrative).toLowerCase().trim();
          } else if (snap.correct_answer && ['this', 'that', 'these', 'those'].includes(String(snap.correct_answer).toLowerCase().trim())) {
            targetDemo = String(snap.correct_answer).toLowerCase().trim();
          } else if (qNum > 15) {
            targetDemo = 'those';
          } else if (qNum > 10) {
            targetDemo = 'these';
          } else if (qNum > 5) {
            targetDemo = 'that';
          }

          const studentAns = (a.student_answer || '').trim();
          const cat = getEvalCategory(a);
          const isCorrect = cat === 'correct';
          const isPartial = cat === 'minor_spelling_error';
          const statusColor = isCorrect ? 'var(--grade-a, #00c000)' : isPartial ? 'var(--grade-c, #FFFF00)' : 'var(--grade-e, #FF0000)';
          const statusBg = isCorrect ? 'rgba(0, 192, 0, 0.12)' : isPartial ? 'rgba(255, 255, 0, 0.12)' : 'rgba(255, 0, 0, 0.12)';
          const statusBorder = isCorrect ? 'rgba(0, 192, 0, 0.35)' : isPartial ? 'rgba(255, 255, 0, 0.35)' : 'rgba(255, 0, 0, 0.35)';
          const rawScore = Number(a.score ?? 0);
          const pointStr = rawScore % 1 === 0 ? String(rawScore) : rawScore.toFixed(1);

          // Retrieve captured photo from localStorage / sessionStorage / snap
          const currAttId = attemptId || urlParams.get('attempt_id') || sessionStorage.getItem('topscore_attempt_id');
          let photoUrl = null;
          try {
            photoUrl = localStorage.getItem(`topscore_photo_${currAttId}_${a.id}`) ||
              sessionStorage.getItem(`topscore_photo_${a.id}`) ||
              (a.question_id ? localStorage.getItem(`topscore_photo_${currAttId}_${a.question_id}`) : null) ||
              (a.question_id ? sessionStorage.getItem(`topscore_photo_${a.question_id}`) : null) ||
              snap.photo_url || null;
          } catch (_) {}

          // Run Grammatical Diagnostics (Ide A)
          const valRes = typeof validateDescriptionSentence === 'function'
            ? validateDescriptionSentence(studentAns, targetDemo)
            : { valid: false, error: 'Validator unavailable' };

          const isSingular = (targetDemo === 'this' || targetDemo === 'that');
          const targetFormula = isSingular
            ? `${targetDemo.toUpperCase()} IS A/AN [3 ADJECTIVES] [NOUN]`
            : `${targetDemo.toUpperCase()} ARE [3 ADJECTIVES] [NOUNS]`;

          return `
            <div class="desc-review-card" style="border:1.5px solid ${statusBorder};">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; align-items:center; gap:6px;">
                  <span style="font-weight:800; font-size:12px; color:#F8FAFC;">Object #${qNum}</span>
                  <span style="font-size:12px; font-weight:800; color:var(--grade-star, #a855f7); background:rgba(192, 132, 252, 0.15); border:1px solid var(--grade-star, #a855f7); border-radius:4px; padding:1px 6px; letter-spacing:0.5px;">${targetDemo.toUpperCase()}</span>
                </div>
                <span style="font-size:12px; font-weight:800; color:${statusColor}; background:${statusBg}; border:1px solid ${statusBorder}; border-radius:6px; padding:2px 8px;">
                  ${pointStr} PTS
                </span>
              </div>

              <div style="display:flex; gap:10px; align-items:flex-start;">
                ${photoUrl ? `
                  <div style="position:relative; width:72px; height:72px; flex-shrink:0;">
                    <img src="${escapeHtml(photoUrl)}" alt="Object #${qNum}" class="desc-photo-thumb" onclick="window.previewPhotoInModal('${escapeHtml(photoUrl)}')" title="Click to enlarge" />
                    <div style="position:absolute; bottom:3px; right:3px; background:rgba(15,23,42,0.85); border-radius:3px; padding:1px 4px; font-size:12px; font-weight:800; color:#38bdf8; pointer-events:none;">ZOOM</div>
                  </div>
                ` : `
                  <div class="desc-photo-placeholder" style="width:72px; height:72px; flex-shrink:0; border-radius:8px; background:rgba(255,255,255,0.03); border:1px dashed rgba(255,255,255,0.15); display:flex; flex-direction:column; align-items:center; justify-content:center; color:#64748b; font-size:12px; text-align:center; padding:2px;">
                    ${getSvgIcon('camera', 16)}
                    <span style="margin-top:2px;">No Photo</span>
                  </div>
                `}

                <div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:3px;">
                  <div style="font-size:12px; color:#94a3b8; font-weight:600;">Spoken Sentence:</div>
                  <div style="font-size:14px; font-weight:700; color:${studentAns ? '#FFFFFF' : '#64748b'}; font-style:${studentAns ? 'normal' : 'italic'}; line-height:1.35; word-break:break-word;">
                    ${studentAns ? `"${escapeHtml(studentAns)}"` : 'No sentence recorded'}
                  </div>

                  ${valRes.valid ? `
                    <div style="background:rgba(0, 192, 0, 0.12); border:1px solid var(--grade-a); border-radius:6px; padding:4px 6px; font-size:12px; color:#f8fafc; margin-top:2px; line-height:1.3;">
                      <span style="font-weight:800; color:var(--grade-a); display:inline-flex; align-items:center; gap:4px;">${getSvgIcon('check-circle', 14)} Royal Order:</span> ${valRes.adjectives.map(adj => `<span style="color:#95ff00; font-weight:700;">${escapeHtml(adj.word)}</span> <span style="color:#94a3b8; font-size:12px;">(${escapeHtml(adj.category)})</span>`).join(' <span style="color:#64748b;">→</span> ')}
                    </div>
                  ` : studentAns ? `
                    <div style="background:rgba(255, 140, 0, 0.1); border:1px solid var(--grade-d, #ff8c00); border-radius:6px; padding:4px 6px; font-size:12px; color:#fed7aa; margin-top:2px; line-height:1.3;">
                      <span style="font-weight:800; color:var(--grade-d, #ff8c00);">Grammar:</span> ${escapeHtml(valRes.error)}
                    </div>
                  ` : `
                    <div style="background:rgba(56, 189, 248, 0.06); border:1px solid rgba(56, 189, 248, 0.2); border-radius:6px; padding:4px 6px; font-size:12px; color:#94a3b8; margin-top:2px;">
                      Pattern: <span style="color:#38bdf8; font-weight:700;">${targetFormula}</span>
                    </div>
                  `}
                </div>
              </div>
            </div>
          `;
        }).join('');

        contentHtml = `<div class="desc-review-list" style="display:flex; flex-direction:column; gap:2px;">${cardsHtml}</div>`;
      } else {
        // Standard 3-Column Table
        const rowsHtml = filteredAnswers.map((a, idx) => {
          const snap = typeof a.question_snapshot === 'string'
            ? (() => { try { return JSON.parse(a.question_snapshot); } catch { return {}; } })()
            : (a.question_snapshot || {});

          const cat = getEvalCategory(a);
          const isCorrect = cat === 'correct';
          const isPartial = cat === 'minor_spelling_error';
          const fontColor = isCorrect
            ? 'var(--grade-a, #00c000)'
            : isPartial
              ? 'var(--grade-c, #FFFF00)'
              : 'var(--grade-e, #FF0000)';

          const qNum = a.question_index !== undefined ? (a.question_index + 1) : (idx + 1);
          const qText = snap.question_text || snap.question || snap.indonesian || snap.english || `Question ${qNum}`;
          const studentAns = a.student_answer || '—';
          const rawScore = Number(a.score ?? 0);
          const pointStr = rawScore % 1 === 0 ? String(rawScore) : rawScore.toFixed(1);

          return `
            <tr class="answer-row" style="border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
              <td class="ans-col-q" style="padding: 10px 8px; font-size: 12px; color: #F8FAFC; font-weight: 600; text-align: left; vertical-align: middle;">
                <span style="color: #94A3B8; margin-right: 4px;">${qNum}.</span> ${escapeHtml(qText)}
              </td>
              <td class="ans-col-ans" style="padding: 10px 8px; font-size: 12px; font-weight: 700; color: ${fontColor}; text-align: left; vertical-align: middle; word-break: break-word;">
                ${escapeHtml(studentAns)}
              </td>
              <td class="ans-col-pts" style="padding: 10px 8px; font-size: 12px; font-weight: 800; color: ${fontColor}; text-align: center; vertical-align: middle; white-space: nowrap;">
                ${pointStr}
              </td>
            </tr>
          `;
        }).join('');

        contentHtml = `
          <div class="answers-table-wrap" style="width: 100%; overflow-x: auto;">
            <table class="answers-table" style="width: 100%; border-collapse: collapse; text-align: left;">
              <thead>
                <tr style="border-bottom: 1.5px solid rgba(255, 255, 255, 0.16); background: #0f172a;">
                  <th style="padding: 8px 8px; font-size: 12px; font-weight: 800; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px; text-align: left; width: 50%;">QUESTION</th>
                  <th style="padding: 8px 8px; font-size: 12px; font-weight: 800; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px; text-align: left; width: 35%;">YOUR ANSWER</th>
                  <th style="padding: 8px 8px; font-size: 12px; font-weight: 800; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px; text-align: center; width: 15%;">PTS</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>
        `;
      }

      container.innerHTML = filterBarHtml + contentHtml;

      // Attach filter tab click handlers
      const filterBtns = container.querySelectorAll('.ans-filter-btn');
      filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const targetF = btn.getAttribute('data-filter') || 'all';
          renderAnswers(answers, effectiveAsmData, targetF);
        });
      });
    }

    currentFilterCallback = (filterType) => {
      renderAnswers(window._allAttemptAnswers || [], window._currentAsmData || null, filterType);
    };

    function openAnswersModal(filterType = 'all') {
      const modal = document.getElementById('answers-section');
      if (modal) {
        modal.classList.remove('hidden');
      }
      if (typeof currentFilterCallback === 'function' && filterType) {
        currentFilterCallback(filterType);
      }
    }

    function closeAnswersModal() {
      const modal = document.getElementById('answers-section');
      if (modal) {
        modal.classList.add('hidden');
      }
    }

    function openBreakdownWithFilter(filterType) {
      openAnswersModal(filterType);
    }

    async function renderSmartNextAction(attempt, answers, pct) {
      const container = document.getElementById('smart-next-action-container');
      if (!container) return;

      const isAdmin = Boolean(getAdminSession()) || session?.is_admin === true || urlParams.get('admin') === '1' || urlParams.get('is_admin') === 'true' || urlParams.get('from') === 'admin' || urlParams.get('mode') === 'tutor';
      const isRemedial = Boolean(attempt.is_remedial_unlocked || attempt.is_remedial);

      const isForgiven = Boolean(attempt.is_forgiven);
      const isNormal = !isRemedial && !isForgiven;

      // IF ADMIN / TUTOR: Render the 3-COLUMN SPLIT SEGMENTED CONTROL [ NORMAL ] | [ REMIDI ] | [ FORGIVE ] directly in this slot
      if (isAdmin) {
        container.innerHTML = `
          <div class="tutor-remedial-segmented" role="group" aria-label="Exam Status Controls">
            <button type="button" class="remedial-segment-btn segment-normal ${isNormal ? 'active' : ''}" id="btn-segment-normal" title="Set Status: Normal Exam">
              <span>${isNormal ? '●' : '○'}</span> NORMAL
            </button>
            <button type="button" class="remedial-segment-btn segment-remidi ${isRemedial ? 'active' : ''}" id="btn-segment-remidi" title="Set Status: Remedial Exam (Max 60%)">
              <span>${isRemedial ? '●' : '○'}</span> REMEDIAL
            </button>
            <button type="button" class="remedial-segment-btn segment-forgive ${isForgiven ? 'active' : ''}" id="btn-segment-forgive" title="Set Status: Forgiven Waiver (Skor F)">
              <span>${isForgiven ? '●' : '○'}</span> FORGIVE
            </button>
          </div>
        `;
        const btnNormal = document.getElementById('btn-segment-normal');
        const btnRemidi = document.getElementById('btn-segment-remidi');
        const btnForgive = document.getElementById('btn-segment-forgive');

        if (btnNormal && btnRemidi && btnForgive) {
          btnNormal.onclick = async () => {
            if (isNormal) return;
            if (!confirm('Revert this test status to NORMAL (original evaluation without remedial cap or exemption)?')) return;
            try {
              showLoading();
              await labelAttemptNormal(attempt.id);
              showToast('Status successfully changed: NORMAL', 'success');
              setTimeout(() => window.location.reload(), 300);
            } catch (err) {
              console.error(err);
              showToast('Failed to change status: ' + err.message, 'error');
            } finally {
              hideLoading();
            }
          };

          btnRemidi.onclick = async () => {
            if (isRemedial) return;
            if (!confirm('Apply REMEDIAL status to this test (maximum rate capped at 60% / Grade R)?')) return;
            try {
              showLoading();
              await labelAttemptRemedial(attempt.id, true, 60);
              showToast('Status successfully changed: REMEDIAL (Grade R, Max 60%)', 'warning');
              setTimeout(() => window.location.reload(), 300);
            } catch (err) {
              console.error(err);
              showToast('Failed to change status: ' + err.message, 'error');
            } finally {
              hideLoading();
            }
          };

          btnForgive.onclick = async () => {
            if (isForgiven) return;
            if (!confirm('Grant GRADE EXEMPTION (FORGIVE) on this test so the student fulfills prerequisites for the next curriculum module?')) return;
            try {
              showLoading();
              await labelAttemptForgiven(attempt.id, 'Test Grade Exemption by Tutor');
              showToast('Status successfully changed: FORGIVEN (Grade F)', 'success');
              setTimeout(() => window.location.reload(), 300);
            } catch (err) {
              console.error(err);
              showToast('Failed to change status: ' + err.message, 'error');
            } finally {
              hideLoading();
            }
          };
        }
        return;
      }

      const targetStudentId = attempt.student_id || session.student_id;
      if (!targetStudentId) return;

      try {
        const supabase = await getSupabase();
        const { data: st } = await supabase.from('students').select('id, batch_id, level_id, program_id, institution_id').eq('id', targetStudentId).maybeSingle();
        if (!st) return;

        const programId = st.program_id || session.program_id;
        const levelId = st.level_id || session.level_id;
        const institutionId = st.institution_id || session.institution_id;
        const batchId = st.batch_id || session.batch_id;

        const [allAssms, allAtts, classes] = await Promise.all([
          fetchTestsForStudentLevel(programId, levelId, institutionId).catch(() => []),
          fetchAllStudentAttempts(targetStudentId).catch(() => []),
          fetchStudentClasses(programId, institutionId, levelId).catch(() => [])
        ]);

        const myClassIds = new Set((classes || []).map(c => c.id));

        const bestMap = {};
        const isForgivenByTest = {};
        const isRemedialByTest = {};
        (allAtts || []).forEach(a => {
          const aid = a.test_id;
          const p = parseFloat(a.effective_score != null ? a.effective_score : (a.percentage || 0));
          if (bestMap[aid] == null || p > bestMap[aid]) {
            bestMap[aid] = p;
          }
          if (a.is_forgiven) {
            isForgivenByTest[aid] = true;
          }
          if (a.is_remedial_unlocked || a.is_remedial) {
            isRemedialByTest[aid] = true;
          }
        });

        const asmData = attempt.tests || attempt.Tests;
        const currentClassId = asmData?.class_id;

        const published = (allAssms || []).filter(a => {
          if (a.deleted_at) return false;
          const status = (a.status || '').toUpperCase();
          if (status !== 'PUBLISHED' && status !== 'ACTIVE') return false;
          if (currentClassId) return a.class_id === currentClassId;
          return myClassIds.has(a.class_id);
        });

        published.sort((a, b) => {
          const ordA = a.display_order ?? 999;
          const ordB = b.display_order ?? 999;
          if (ordA !== ordB) return ordA - ordB;
          return (a.title || '').localeCompare(b.title || '');
        });

        const curAsm = attempt.tests || attempt.Tests;
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
        const targetReps = testSettings?.taskRepetitions != null ? Math.max(1, Number(testSettings.taskRepetitions)) : (isVocabClass ? 7 : 1);
        const minScore = Number(curAsm?.minimum_required_score) || Number(curAsm?.payload?.min_score) || Number(testSettings?.taskMinScore) || 50;

        // Determine current attempt component (words vs phrases)
        const urlSection = (urlParams.get('section') || urlParams.get('part') || '').toLowerCase();
        const getAttemptComp = (att) => {
          if (!att) return 'words';
          const raw = att?.payload?.section || att?.payload?.subtype || att?.test_section || att?.section;
          if (raw) {
            const s = String(raw).toLowerCase();
            if (s.includes('phrase') || s === 'phr') return 'phrases';
            if (s.includes('word') || s === 'wrd') return 'words';
          }
          const fr = String(att?.forgiven_reason || '');
          if (/\b(phrases?|phr)\b/i.test(fr)) return 'phrases';
          if (/\b(words?|wrd)\b/i.test(fr)) return 'words';
          const tq = Number(att?.total_questions || 0);
          const correctCount = Number(att?.correct_count || att?.score || 0);
          if (tq > 0 && tq <= 20) return 'phrases';
          if (tq > 20) return 'words';
          if (correctCount > 15) return 'words';
          if (correctCount > 0 && correctCount <= 10) return 'phrases';
          return 'words';
        };

        let currentComp = (urlSection === 'words' || urlSection === 'phrases') ? urlSection : null;
        if (!currentComp && Array.isArray(answers) && answers.length > 0) {
          const answeredRows = answers.filter(a => a.student_answer != null && a.student_answer !== '');
          const hasWordsAns = answeredRows.some(a => a.question_snapshot?.test_section === 'words');
          const hasPhrasesAns = answeredRows.some(a => a.question_snapshot?.test_section === 'phrases');
          if (hasWordsAns && !hasPhrasesAns) currentComp = 'words';
          else if (hasPhrasesAns && !hasWordsAns) currentComp = 'phrases';
        }
        if (!currentComp) currentComp = getAttemptComp(attempt);

        // Map pass counts & completion status across all published tests in this class
        const wordsBestByTest = {};
        const phrasesBestByTest = {};
        const wordsPassCountByTest = {};
        const phrasesPassCountByTest = {};
        const passCountByTest = {};
        const isPassedByTest = {};

        // Merge all student attempts including current attempt
        const combinedAtts = [...(allAtts || [])];
        if (attempt && !combinedAtts.some(a => a.id === attempt.id)) {
          combinedAtts.push(attempt);
        }

        combinedAtts.forEach(a => {
          const aid = a.test_id || a.Test_id;
          if (!aid) return;
          const st = String(a.status || '').toLowerCase();
          if (!['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(st)) return;

          const p = parseFloat(a.effective_score != null ? a.effective_score : (a.percentage || 0));
          const tObj = published.find(t => t.id === aid) || (aid === curAsm?.id ? curAsm : null);
          const tMin = Number(tObj?.minimum_required_score) || Number(tObj?.payload?.min_score) || (isExam(tObj) ? 60 : minScore);
          const isPass = Boolean(a.is_forgiven || (a.is_remedial_unlocked || a.is_remedial ? p >= 60 : p >= tMin));

          const sec = getAttemptComp(a);
          if (sec === 'phrases') {
            if (phrasesBestByTest[aid] == null || p > phrasesBestByTest[aid]) phrasesBestByTest[aid] = p;
            if (isPass) phrasesPassCountByTest[aid] = (phrasesPassCountByTest[aid] || 0) + 1;
          } else {
            if (wordsBestByTest[aid] == null || p > wordsBestByTest[aid]) wordsBestByTest[aid] = p;
            if (isPass) wordsPassCountByTest[aid] = (wordsPassCountByTest[aid] || 0) + 1;
          }
        });

        // Compute authoritative completion for all published tests
        (published || []).forEach(t => {
          const isUni = Boolean(t.payload?.is_unified || t.category === 'unified' || (t.test_subtype && t.test_subtype.startsWith('UNIFIED')));
          const req = Number(t.minimum_required_score) || Number(t.payload?.min_score) || (isExam(t) ? 60 : minScore);

          if (isExam(t)) {
            if (isUni) {
              const wScore = wordsBestByTest[t.id];
              const pScore = phrasesBestByTest[t.id];
              const isRem = Boolean(isRemedialByTest[t.id]);
              const wPass = (wScore != null && (wScore >= req || (isRem && wScore >= 60))) || Boolean(isForgivenByTest[t.id]);
              const pPass = (pScore != null && (pScore >= req || (isRem && pScore >= 60))) || Boolean(isForgivenByTest[t.id]);
              isPassedByTest[t.id] = Boolean((wPass && pPass) || isForgivenByTest[t.id]);
            } else {
              const score = bestMap[t.id];
              const isRem = Boolean(isRemedialByTest[t.id]);
              isPassedByTest[t.id] = Boolean((score != null && (score >= req || (isRem && score >= 60))) || isForgivenByTest[t.id]);
            }
          } else {
            if (isUni) {
              const wPasses = wordsPassCountByTest[t.id] || 0;
              const pPasses = phrasesPassCountByTest[t.id] || 0;
              passCountByTest[t.id] = Math.min(wPasses, pPasses);
              isPassedByTest[t.id] = Boolean((wPasses >= targetReps && pPasses >= targetReps) || isForgivenByTest[t.id]);
            } else {
              const passes = (allAtts || []).filter(at =>
                (at.test_id === t.id || at.Test_id === t.id) &&
                (at.is_forgiven || Boolean(at.is_remedial_unlocked || at.is_remedial) || parseFloat(at.percentage || 0) >= req || parseFloat(at.effective_score || 0) >= req)
              ).length;
              passCountByTest[t.id] = passes;
              isPassedByTest[t.id] = Boolean(passes >= targetReps || isForgivenByTest[t.id]);
            }
          }
        });

        // Current drill pass count & outcome
        const currentPassCount = passCountByTest[curAsm?.id] || 0;
        const currentAttemptPassed = Boolean(attempt.is_forgiven) || (parseFloat(attempt.percentage || 0) >= minScore) || (parseFloat(attempt.effective_score || 0) >= minScore);

        let nextTest = null;
        let actionTag = 'GO TO NEXT TEST:';
        let nextCustomTitle = null;
        let targetUrl = null;

        const curIsUni = Boolean(curAsm?.payload?.is_unified || curAsm?.category === 'unified' || (curAsm?.test_subtype && curAsm.test_subtype.startsWith('UNIFIED')));
        const examReq = Number(curAsm?.minimum_required_score) || Number(curAsm?.payload?.min_score) || 60;
        const curWordsPass = (wordsBestByTest[curAsm?.id] != null && wordsBestByTest[curAsm?.id] >= examReq) || Boolean(isForgivenByTest[curAsm?.id]);
        const curPhrasesPass = (phrasesBestByTest[curAsm?.id] != null && phrasesBestByTest[curAsm?.id] >= examReq) || Boolean(isForgivenByTest[curAsm?.id]);

        // 1. DUAL-COMPONENT INTRA-EXAM NAVIGATION GATE:
        // When completing Words Exam or Phrase Exam, if the other counterpart component is not yet passed,
        // MUST immediately direct to the remaining component ("Phrase Exam" or "Words Exam") rather than "Completed"!
        if (curIsExam && curIsUni) {
          if (currentComp === 'words' && !curPhrasesPass) {
            nextTest = curAsm;
            actionTag = 'NEXT EXAM COMPONENT:';
            nextCustomTitle = 'Phrase Exam';
            targetUrl = `test.html?id=${curAsm.id}&section=phrases`;
          } else if (currentComp === 'phrases' && !curWordsPass) {
            nextTest = curAsm;
            actionTag = 'NEXT EXAM COMPONENT:';
            nextCustomTitle = 'Words Exam';
            targetUrl = `test.html?id=${curAsm.id}&section=words`;
          }
        } else if (curIsExam && !curIsUni && curThemeCode) {
          // Check paired sibling exam in the same theme (e.g. separate Words Exam and Phrase Exam)
          const siblingExam = published.find(a =>
            isExam(a) &&
            a.id !== curAsm?.id &&
            String(a.payload?.theme_code || '').toUpperCase() === String(curThemeCode).toUpperCase()
          );
          if (siblingExam && !isPassedByTest[siblingExam.id]) {
            const sibIsPhrases = /phrase/i.test(siblingExam.title || '') || siblingExam.payload?.category === 'phrases';
            nextTest = siblingExam;
            actionTag = 'NEXT EXAM COMPONENT:';
            nextCustomTitle = sibIsPhrases ? 'Phrase Exam' : 'Words Exam';
            targetUrl = `test.html?id=${siblingExam.id}`;
          }
        }

        if (!nextTest) {
          // Find the true earliest uncompleted test in curriculum linear order
          const earliestUncompleted = published.find(t => !isPassedByTest[t.id]);
          const curIndex = published.findIndex(t => t.id === curAsm?.id);
          const earliestIndex = earliestUncompleted ? published.findIndex(t => t.id === earliestUncompleted.id) : -1;

          if (earliestIndex !== -1 && earliestIndex < curIndex) {
            // CRITICAL PREREQUISITE DEFICIT GUARD:
            // Direct student immediately to the unfulfilled prerequisite task!
            nextTest = earliestUncompleted;
            const prereqPasses = passCountByTest[earliestUncompleted.id] || 0;
            actionTag = `COMPLETE PREREQUISITE (${prereqPasses}/${targetReps}):`;
          } else if (!curIsExam && targetReps > 1 && currentPassCount < targetReps) {
            // 2. REPETITIVE DRILL LOOP: Current task has all prerequisites fulfilled, continue drill to targetReps
            nextTest = curAsm;
            if (curIsUni) {
              const curWPasses = wordsPassCountByTest[curAsm?.id] || 0;
              const curPPasses = phrasesPassCountByTest[curAsm?.id] || 0;
              if (currentComp === 'words' && curPPasses < targetReps) {
                actionTag = 'NEXT TASK COMPONENT:';
                nextCustomTitle = 'Phrases Task';
                targetUrl = `test.html?id=${curAsm.id}&section=phrases`;
              } else if (currentComp === 'phrases' && curWPasses < targetReps) {
                actionTag = 'NEXT TASK COMPONENT:';
                nextCustomTitle = 'Words Task';
                targetUrl = `test.html?id=${curAsm.id}&section=words`;
              } else if (currentAttemptPassed) {
                actionTag = `CONTINUE THE DRILL (${currentPassCount}/${targetReps}):`;
              } else {
                actionTag = `RETRY THE DRILL (${currentPassCount}/${targetReps}):`;
              }
            } else if (currentAttemptPassed) {
              actionTag = `CONTINUE THE DRILL (${currentPassCount}/${targetReps}):`;
            } else {
              actionTag = `RETRY THE DRILL (${currentPassCount}/${targetReps}):`;
            }
          } else {
            // 3. Current drill completed (or Exam completed): Advance to next sibling task, next topic task, or next exam
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
                const sibMin = Number(siblingTask.minimum_required_score) || Number(siblingTask.payload?.min_score) || minScore;
                const siblingPassCount = passCountByTest[siblingTask.id] || 0;
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
              if (siblingExam && !isPassedByTest[siblingExam.id]) {
                nextTest = siblingExam;
              }
            }

            if (!nextTest) {
              // Find next uncompleted test in published list
              nextTest = published.find(a => !isPassedByTest[a.id]);
            }

            // If nextTest is an exam and student just failed this same exam, label as RETAKE
            if (nextTest && isExam(nextTest) && nextTest.id === curAsm?.id && !currentAttemptPassed) {
              actionTag = 'RETAKE THE EXAM:';
            }
          }
        }
        if (!nextTest) {
          container.innerHTML = `
            <div class="result-complete-banner" style="width:100% !important; max-width:100% !important; height:50px !important; min-height:50px !important; max-height:50px !important; box-sizing:border-box !important; background:rgba(var(--grade-a-rgb, 0, 192, 0),0.12) !important; border:1.5px solid rgba(var(--grade-a-rgb, 0, 192, 0),0.45) !important; border-radius:10px !important; padding:4px 12px !important; display:flex !important; flex-direction:column !important; align-items:center !important; justify-content:center !important; text-align:center !important; margin:0 !important; box-shadow:0 4px 14px rgba(var(--grade-a-rgb, 0, 192, 0),0.20) !important;">
              <div style="font-size:12px !important; text-transform:uppercase !important; letter-spacing:0.08em !important; color:var(--grade-a) !important; font-weight:800 !important; line-height:1.2 !important;">Level Curriculum Complete</div>
              <div style="font-size:12px !important; font-weight:600 !important; color:#E2E8F0 !important; margin-top:2px !important; line-height:1.2 !important;">All tests completed!</div>
            </div>
          `;
          return;
        }

        const isTest = isExam(nextTest);
        const nextFormatted = formatTestDisplay(nextTest);
        const nextName = nextCustomTitle || nextFormatted.fullTitle || 'Next Test';
        const safeAttemptPct = (() => {
          const raw = Math.min(100.0, Math.max(0.0, parseFloat(attempt.percentage || 0)));
          const eff = attempt.effective_score != null ? parseFloat(attempt.effective_score) : raw;
          return (eff <= 100.0 && eff >= 0.0) ? eff : raw;
        })();
        const gradeColor = getGradeColorByScore(safeAttemptPct);
        const launchTargetUrl = targetUrl || `test.html?id=${nextTest.id}`;

        if (!isTest) {
          container.innerHTML = `
            <button class="btn-next-milestone" id="btn-next-milestone" type="button" style="--tier-color: ${gradeColor}; border-color: ${gradeColor}; box-shadow: 0 4px 14px ${gradeColor}55;">
              <span class="next-btn-tag">${escapeHtml(actionTag)}</span>
              <span class="next-btn-title">${escapeHtml(cleanTitle(nextName))} &rarr;</span>
            </button>
          `;
          document.getElementById('btn-next-milestone').onclick = () => {
            sessionStorage.setItem('topscore_test_id', nextTest.id);
            sessionStorage.removeItem('topscore_attempt_id');
            window.location.href = launchTargetUrl;
          };
        } else {
          // If continuing counterpart component of the SAME exam, session is already actively unlocked
          const isSameExamComponent = (nextTest.id === curAsm?.id);
          const activeSession = isSameExamComponent
            ? { is_unlocked: true }
            : await fetchActiveTestSession(nextTest.id, batchId).catch(() => null);
          const isUnlocked = activeSession?.is_unlocked === true;
          const isWhitelisted = isSameExamComponent || (
            !activeSession?.allowed_student_ids ||
            activeSession.allowed_student_ids.length === 0 ||
            activeSession.allowed_student_ids.includes(targetStudentId)
          );

          if (isUnlocked && isWhitelisted) {
            container.innerHTML = `
              <button class="btn-next-milestone btn-next-test" id="btn-next-milestone" type="button" style="--tier-color: ${gradeColor}; border-color: ${gradeColor}; box-shadow: 0 4px 14px ${gradeColor}55;">
                <span class="next-btn-tag">${escapeHtml(actionTag)}</span>
                <span class="next-btn-title">${escapeHtml(cleanTitle(nextName))} &rarr;</span>
              </button>
            `;
            document.getElementById('btn-next-milestone').onclick = () => {
              sessionStorage.setItem('topscore_test_id', nextTest.id);
              sessionStorage.removeItem('topscore_attempt_id');
              window.location.href = launchTargetUrl;
            };
          } else {
            container.innerHTML = `
              <div class="result-waiting-banner" style="width:100% !important; max-width:100% !important; height:50px !important; min-height:50px !important; max-height:50px !important; box-sizing:border-box !important; background:rgba(var(--grade-c-rgb, 255, 255, 0),0.10) !important; border:1.5px solid rgba(var(--grade-c-rgb, 255, 255, 0),0.35) !important; border-radius:10px !important; padding:4px 12px !important; display:flex !important; flex-direction:column !important; align-items:center !important; justify-content:center !important; text-align:center !important; margin:0 !important;">
                <div style="font-size:12px !important; text-transform:uppercase !important; letter-spacing:0.06em !important; color:var(--grade-c) !important; font-weight:800 !important; line-height:1.2 !important; white-space:nowrap !important; overflow:hidden !important; text-overflow:ellipsis !important; max-width:100% !important;">
                  Next Milestone: ${escapeHtml(cleanTitle(nextName))}
                </div>
                <div style="font-size:12px !important; color:#cbd5e1 !important; margin-top:2px !important; line-height:1.2 !important; white-space:nowrap !important; overflow:hidden !important; text-overflow:ellipsis !important; max-width:100% !important;">
                  Waiting for Tutor to unlock this test session during class.
                </div>
              </div>
            `;
          }
        }
      } catch (err) {
        console.warn('Could not calculate next milestone:', err);
      }
    }


    // Synchronized Tier Glow Trigger: Ignites ALL panels when evaluation description reveals
    function activateTierGlow(gradeColor, rgbColor, currentTier, isGradeSOr100) {
      document.body.classList.add('tier-glow-active');
      document.documentElement.style.setProperty('--tier-color', gradeColor);
      document.documentElement.style.setProperty('--tier-rgb', rgbColor);
      document.body.style.setProperty('--tier-color', gradeColor);
      document.body.style.setProperty('--tier-rgb', rgbColor);

      const heroEl = document.getElementById('result-hero-section') || document.querySelector('.result-hero');
      if (heroEl) {
        heroEl.className = `result-hero tier-${currentTier}`;
        heroEl.style.setProperty('--tier-color', gradeColor);
        heroEl.style.setProperty('--tier-rgb', rgbColor);
      }

      // 1. Identity & Metadata Card
      const idCard = document.getElementById('result-identity-card');
      if (idCard) {
        idCard.dataset.tier = currentTier;
        idCard.style.setProperty('--tier-color', gradeColor);
        idCard.style.setProperty('--tier-rgb', rgbColor);
        idCard.style.borderColor = `rgba(${rgbColor}, 0.75)`;
        idCard.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.35)';
      }

      // Divider inside Identity card
      const dividerEl = document.querySelector('.result-identity-card .hero-name-divider');
      if (dividerEl) {
        dividerEl.style.background = `linear-gradient(90deg, transparent 0%, rgba(${rgbColor}, 0.7) 20%, rgba(255, 255, 255, 0.9) 50%, rgba(${rgbColor}, 0.7) 80%, transparent 100%)`;
      }

      // 2. Avatar Container Ring
      const avatarCont = document.getElementById('result-avatar-container');
      if (avatarCont) {
        avatarCont.style.setProperty('--tier-color', gradeColor);
        if (isGradeSOr100) {
          avatarCont.style.background = `linear-gradient(135deg, ${TOPSCORE_COLORS.STAR} 0%, #7e22ce 100%)`;
          avatarCont.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.35)';
          avatarCont.style.border = `2.5px solid ${TOPSCORE_COLORS.STAR}`;
        } else {
          avatarCont.style.background = 'rgba(15, 23, 42, 0.9)';
          avatarCont.style.borderColor = gradeColor;
          avatarCont.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.35)';
        }
      }

      // 3. Test Full Title Panel in Top Header
      const titleCard = document.getElementById('result-Test-name-container');
      if (titleCard) {
        titleCard.dataset.tier = currentTier;
        titleCard.style.setProperty('--tier-color', gradeColor);
        titleCard.style.setProperty('--tier-rgb', rgbColor);
      }
      const pageHeader = document.getElementById('result-page-header');
      if (pageHeader) {
        pageHeader.style.setProperty('--tier-color', gradeColor);
        pageHeader.style.setProperty('--tier-rgb', rgbColor);
      }

      // Topic Row inside Title Panel
      const topicEl = document.getElementById('result-test-topic-row');
      if (topicEl) {
        topicEl.style.color = gradeColor;
        topicEl.style.textShadow = 'none';
      }

      // 4. Metrics Table Card
      const compositeCard = document.getElementById('result-metrics-bar') || document.getElementById('result-metrics-composite-card');
      if (compositeCard) {
        compositeCard.dataset.tier = currentTier;
        compositeCard.style.setProperty('--tier-color', gradeColor);
        compositeCard.style.setProperty('--tier-rgb', rgbColor);
        compositeCard.style.borderColor = `rgba(${rgbColor}, 0.75)`;
        compositeCard.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.35)';
      }

      // Dual Score & Grade Row (Row 5 - 40px)
      const scoreGradeRow = document.getElementById('result-score-grade-card');
      if (scoreGradeRow) {
        scoreGradeRow.dataset.tier = currentTier;
        scoreGradeRow.style.setProperty('--tier-color', gradeColor);
        scoreGradeRow.style.setProperty('--tier-rgb', rgbColor);
      }
      const scoreBox = document.getElementById('result-score-box');
      if (scoreBox) {
        scoreBox.style.borderColor = `rgba(${rgbColor}, 0.75)`;
        scoreBox.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.35)';
      }
      const gradeBox = document.getElementById('result-grade-box');
      if (gradeBox) {
        gradeBox.style.borderColor = `rgba(${rgbColor}, 0.75)`;
        gradeBox.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.35)';
      }

      // Score % and Points inside composite card
      const pctEl = document.getElementById('result-percentage');
      if (pctEl) {
        pctEl.style.setProperty('color', gradeColor, 'important');
        pctEl.style.setProperty('-webkit-text-fill-color', gradeColor, 'important');
        pctEl.style.setProperty('text-shadow', 'none', 'important');
      }
      const ptsEl = document.getElementById('res-points');
      if (ptsEl) {
        pctEl.style.setProperty('color', gradeColor, 'important');
        ptsEl.style.setProperty('color', gradeColor, 'important');
        ptsEl.style.setProperty('-webkit-text-fill-color', gradeColor, 'important');
        ptsEl.style.setProperty('text-shadow', 'none', 'important');
      }

      // 5. Evaluation Word Card (Row 6 - 50px: EXCELLENT, GOOD, ENOUGH, etc.)
      const motEl = document.getElementById('result-motivation-msg');
      if (motEl) {
        motEl.dataset.tier = currentTier;
        motEl.style.setProperty('--tier-color', gradeColor);
        motEl.style.setProperty('--tier-rgb', rgbColor);
        motEl.style.borderColor = `rgba(${rgbColor}, 0.85)`;
        motEl.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.35)';
        motEl.style.color = gradeColor;
        motEl.style.textShadow = 'none';
      }

      // 6. Next Milestone CTA Button
      const nextBtn = document.querySelector('.btn-next-milestone');
      if (nextBtn) {
        nextBtn.style.borderColor = gradeColor;
        nextBtn.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.35)';
      }
    }

    async function loadResult() {
      try {
        let [attempt, answers] = await Promise.all([
          fetchAttemptResult(attemptId),
          fetchAttemptAnswers(attemptId),
        ]);

        // Auto-Submit Recovery / Retry Engine:
        // If an attempt was auto_submitted or answers were not fully evaluated/saved
        // due to an Edge Function network timeout during submission, retry submission
        // using the safety buffer preserved in sessionStorage or localStorage.
        const fallbackRaw = sessionStorage.getItem('topscore_fallback_payload_' + attemptId);
        const localAnswersRaw = localStorage.getItem('topscore_local_answers_' + attemptId);

        let pendingPayload = null;
        if (fallbackRaw) {
          try {
            const parsed = JSON.parse(fallbackRaw);
            if (Array.isArray(parsed) && parsed.length > 0) pendingPayload = parsed;
          } catch (_) {}
        } else if (localAnswersRaw && Array.isArray(answers) && answers.length > 0) {
          try {
            const localMap = JSON.parse(localAnswersRaw) || {};
            if (Object.keys(localMap).length > 0) {
              pendingPayload = answers.map(a => ({
                attempt_answer_id: a.id,
                student_answer: localMap[a.id] || ''
              }));
            }
          } catch (_) {}
        }

        const isUnscored = !attempt.submitted_at || attempt.status === 'in_progress' || (answers.length > 0 && answers.every(a => a.student_answer == null));
        if (pendingPayload && pendingPayload.length > 0 && (attempt.status === 'auto_submitted' || isUnscored)) {
          try {
            showLoading('Finalizing and calculating your test score...');
            await submitTest(attemptId, pendingPayload, { status: 'submitted' });
            sessionStorage.removeItem('topscore_fallback_payload_' + attemptId);
            localStorage.removeItem('topscore_local_answers_' + attemptId);

            // Re-fetch authoritative attempt and evaluated answers
            const [refreshedAttempt, refreshedAnswers] = await Promise.all([
              fetchAttemptResult(attemptId),
              fetchAttemptAnswers(attemptId),
            ]);
            attempt = refreshedAttempt;
            answers = refreshedAnswers;
          } catch (retryErr) {
            console.warn('Auto-submit recovery failed:', retryErr);
          } finally {
            hideLoading();
          }
        }

        // Keep result-loading visible while all DOM data and asynchronous dependencies finish loading


        const asmData = attempt.tests || attempt.Tests;
        const testId = attempt.test_id || attempt.Test_id;

        // Section-Aware Filter for Unified Tests (Words vs Phrases separation on Result Page)
        const isUnified = asmData?.payload?.is_unified || asmData?.category === 'unified' || (asmData?.test_subtype && asmData.test_subtype.startsWith('UNIFIED'));
        const attTotalQ = Number(attempt.total_questions || 0);
        const urlSection = (urlParams.get('section') || urlParams.get('part') || '').toLowerCase();
        let activeSectionName = null;

        if (urlSection === 'words') activeSectionName = 'Words';
        else if (urlSection === 'phrases') activeSectionName = 'Phrases';
        else if (isUnified) {
          const fr = String(attempt.forgiven_reason || '');
          if (/\b(phrases?|phr)\b/i.test(fr)) activeSectionName = 'Phrases';
          else if (/\b(words?|wrd)\b/i.test(fr)) activeSectionName = 'Words';
          else if (attTotalQ > 0 && attTotalQ <= 20) activeSectionName = 'Phrases';
          else if (attTotalQ > 20) activeSectionName = 'Words';
        }

        if (isUnified && Array.isArray(answers) && answers.length > 0) {
          const answeredRows = answers.filter(a => a.student_answer != null && a.student_answer !== '');
          const hasWords = answeredRows.some(a => a.question_snapshot?.test_section === 'words');
          const hasPhrases = answeredRows.some(a => a.question_snapshot?.test_section === 'phrases');

          if (!activeSectionName) {
            if (hasWords && !hasPhrases) activeSectionName = 'Words';
            else if (hasPhrases && !hasWords) activeSectionName = 'Phrases';
          }

          if (activeSectionName === 'Words') {
            answers = answers.filter(a => a.question_snapshot?.test_section !== 'phrases');
          } else if (activeSectionName === 'Phrases') {
            answers = answers.filter(a => a.question_snapshot?.test_section === 'phrases');
          } else if (attTotalQ > 0 && attTotalQ < answers.length) {
            const wordsRows = answers.filter(a => a.question_snapshot?.test_section !== 'phrases');
            const phrasesRows = answers.filter(a => a.question_snapshot?.test_section === 'phrases');
            if (wordsRows.length === attTotalQ) {
              activeSectionName = 'Words';
              answers = wordsRows;
            } else if (phrasesRows.length === attTotalQ) {
              activeSectionName = 'Phrases';
              answers = phrasesRows;
            }
          }
        }
        const rawPct = Math.min(100.0, Math.max(0.0, parseFloat(attempt.percentage || 0)));
        const isRemedial = Boolean(attempt.is_remedial_unlocked || attempt.is_remedial);
        const isForgiven = Boolean(attempt.is_forgiven);

        // SAFE EFFECTIVE SCORE RESOLUTION:
        // effective_score represents percentage (0.0 to 100.0), NEVER raw question points!
        // If database contains raw points (> 100), fall back to rawPct.
        let effPct = rawPct;
        if (attempt.effective_score != null) {
          const parsedEff = parseFloat(attempt.effective_score);
          if (parsedEff <= 100.0 && parsedEff >= 0.0) {
            effPct = parsedEff;
          }
        }
        const isAdminSession = Boolean(getAdminSession()) || session?.is_admin === true || urlParams.get('admin') === '1' || urlParams.get('is_admin') === 'true' || urlParams.get('from') === 'admin' || urlParams.get('mode') === 'tutor';
        const pct = isRemedial ? Math.min(effPct, 60.0) : Math.min(effPct, 100.0);
        // Student always sees the official canonical grade based on their score percentage!
        const canonicalGrade = typeof calculateGrade === 'function' ? calculateGrade(pct) : getGrade(pct);
        const grade = (!isAdminSession)
          ? canonicalGrade
          : (isForgiven ? 'F' : (isRemedial ? 'R' : canonicalGrade));
        let gradeColor = (!isAdminSession)
          ? getGradeColorByScore(pct)
          : (isForgiven ? TOPSCORE_COLORS.E : (isRemedial ? TOPSCORE_COLORS.C : getGradeColorByScore(pct)));
        const theme = (typeof getGradeTheme === 'function' ? getGradeTheme(grade, !isAdminSession ? false : isRemedial) : null) || GRADE_PALETTE[grade] || GRADE_PALETTE['★'] || GRADE_PALETTE.E;
        const isGradeS = (grade === '★' || grade === 'S' || grade === 'STAR' || (pct >= 100 && (!isAdminSession || (!isRemedial && !isForgiven))));

        // Background particles and dynamic tier atmosphere are deferred to Step 5 (Grade Reveal)
        // to deliver the authentic surprise impact requested by the user.
        const heroSection = document.getElementById('result-hero-section') || document.querySelector('.result-hero');
        if (heroSection) {
          heroSection.className = 'result-hero';
        }

        // Wire up Top Header matching Student Dashboard / Lobby
        const headerBrand = document.getElementById('result-header-brand');
        if (headerBrand) headerBrand.textContent = 'RESULT PAGE';
        const profileBtn = document.getElementById('view-profile-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const headerAvatarInit = document.getElementById('header-avatar-initial');

        if (isAdminSession) {
          if (profileBtn) {
            profileBtn.title = "Back to Tutor's Room";
            profileBtn.onclick = () => location.href = 'admin.html#class-hub';
          }
          if (logoutBtn) {
            logoutBtn.onclick = () => {
              sessionStorage.clear();
              localStorage.removeItem('topscore_admin_session');
              location.href = 'admin.html';
            };
          }
          if (headerAvatarInit) headerAvatarInit.textContent = 'T';
          const backBtn = document.getElementById('back-dashboard-btn');
          if (backBtn) {
            backBtn.textContent = 'BACK TO ROOM';
            backBtn.href = 'admin.html#class-hub';
          }
        } else {
          if (profileBtn) {
            profileBtn.title = "Back to Class";
            profileBtn.onclick = () => location.href = 'dashboard.html';
          }
          if (logoutBtn) {
            logoutBtn.onclick = () => {
              sessionStorage.clear();
              localStorage.removeItem('topscore_student_session');
              location.href = 'index.html';
            };
          }
          const backBtn = document.getElementById('back-dashboard-btn');
          if (backBtn) {
            backBtn.textContent = 'BACK TO CLASS';
            backBtn.href = 'dashboard.html';
          }
        }

        // Fetch user photo + FEATURE 3: student name label
        // Fetch student identity, institutional metadata, and photo
        let studentFullName = session.student_name || 'Student';
        let studentGender = session.gender || '';
        let resolvedInstName = session.institution_name || 'Cake English Course';
        let resolvedProgName = (session.program_name || 'CAMP').toUpperCase();
        let resolvedBatchName = session.batch_name || '133';
        let resolvedLvlName = session.level_name || '3rd Level';

        const targetStudentId = attempt.student_id || session.student_id;
        try {
          const supabase = await getSupabase();
          if (targetStudentId) {
            const { data: st } = await supabase.from('students')
              .select('id, name, gender, birth_date, village, district, city, province, photo_url, batch_id, level_id, program_id, institution_id, institutions(name), programs(name), batches!batch_id(name), levels(name)')
              .eq('id', targetStudentId)
              .maybeSingle();
            if (st) {
              studentFullName = st.name || studentFullName;
              studentGender = st.gender || studentGender;

              // Populate institutional metadata hierarchy (Wireframe: Institution | Program | Batch | Level)
              const metaInstEl = document.getElementById('meta-inst');
              const metaProgEl = document.getElementById('meta-prog');
              const metaBatchEl = document.getElementById('meta-batch');
              const metaLvlEl = document.getElementById('meta-lvl');

              if (st.institutions?.name) resolvedInstName = st.institutions.name;
              if (st.programs?.name) resolvedProgName = st.programs.name.toUpperCase();
              if (st.batches?.name) resolvedBatchName = st.batches.name;
              if (asmData?.levels?.name || st.levels?.name) resolvedLvlName = asmData?.levels?.name || st.levels?.name;

              if (metaInstEl) metaInstEl.textContent = resolvedInstName;
              if (metaProgEl) metaProgEl.textContent = resolvedProgName;
              if (metaBatchEl) metaBatchEl.textContent = resolvedBatchName;
              if (metaLvlEl) {
                const isCamp = typeof isCampContext === 'function' ? isCampContext(st) : Boolean(/camp/i.test(resolvedProgName) || /cec|cake/i.test(resolvedInstName));
                const ctx = {
                  batch_name: resolvedBatchName,
                  enrollment_date: st.batches?.enrollment_date || st.enrollment_date,
                  created_at: st.created_at
                };
                metaLvlEl.textContent = (typeof formatAcademicTier === 'function' ? formatAcademicTier(resolvedLvlName, isCamp, ctx) : resolvedLvlName).toUpperCase();
              }

              // Unified Hero Card Biodata Table: Sex (above DoB) -> DoB -> Age -> Adr
              const resGenderEl = document.getElementById('result-hero-gender');
              const gRaw = (st.gender || session.gender || '').toLowerCase();
              const gText = gRaw === 'female' ? 'Female' : (gRaw === 'male' ? 'Male' : '—');
              if (resGenderEl) {
                resGenderEl.textContent = gText;
                if (gRaw === 'female') {
                  resGenderEl.style.color = '#ff2d87';
                } else if (gRaw === 'male') {
                  resGenderEl.style.color = '#38bdf8';
                } else {
                  resGenderEl.style.color = '#f8fafc';
                }
              }

              const resDobEl = document.getElementById('result-hero-dob');
              const resAgeEl = document.getElementById('result-hero-age');
              const rawDob = st.birth_date || st.dob || session.birth_date || session.dob;
              let ageText = '—';
              let dobText = '—';
              if (rawDob) {
                const parts = String(rawDob).split('-');
                if (parts.length === 3) {
                  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                  const mIdx = parseInt(parts[1], 10) - 1;
                  const day = parseInt(parts[2], 10);
                  const yr = parts[0];
                  const mName = months[mIdx] || '';
                  dobText = `${day} ${mName} ${yr}`;
                } else {
                  dobText = rawDob;
                }
                const d = new Date(rawDob);
                if (!isNaN(d.getTime())) {
                  const today = new Date();
                  let age = today.getFullYear() - d.getFullYear();
                  const m = today.getMonth() - d.getMonth();
                  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
                  if (age >= 0 && age <= 120) ageText = `${age} Years Old`;
                }
              }
              if (resDobEl) resDobEl.textContent = dobText;
              if (resAgeEl) resAgeEl.textContent = ageText;

              const resAdrEl = document.getElementById('result-hero-adr');
              if (resAdrEl) {
                const vRaw = st.village || session.village;
                const dRaw = st.district || session.district;
                const cRaw = st.city || session.city;
                const pRaw = st.province || session.province;
                const fVill = vRaw ? (typeof formatVillageName === 'function' ? formatVillageName(vRaw) : vRaw) : '';
                const fDist = dRaw ? (typeof formatDistrictName === 'function' ? formatDistrictName(dRaw) : dRaw) : '';
                const fCity = cRaw ? (typeof formatCityDistrict === 'function' ? formatCityDistrict(cRaw) : cRaw) : '';
                let fProv = pRaw || '';
                if (fProv === 'Nusa Tenggara Barat' || fProv === 'West Nusa Tenggara') {
                  fProv = 'NTB';
                } else if (typeof formatProvinceName === 'function') {
                  fProv = formatProvinceName(fProv);
                }
                const parts = [fVill, fDist, fCity, fProv].map(x => (x || '').trim()).filter(x => x && x !== '—');
                resAdrEl.textContent = parts.length > 0 ? parts.join(', ') : 'Mataram City, NTB';
              }

              // Dynamic Hero Photo Height Sync: Photo follows biodata height (3:4 ratio)
              const syncResultPhotoWithBio = () => {
                const bioTable = document.querySelector('.result-identity-card .hero-bio-table');
                const avatarBox = document.getElementById('result-avatar-container');
                const avatarWrap = document.getElementById('result-avatar-stage');
                if (bioTable && avatarBox) {
                  const h = bioTable.offsetHeight;
                  if (h >= 60 && h <= 140) {
                    const w = Math.round(h * 3 / 4);
                    avatarBox.style.setProperty('height', `${h}px`, 'important');
                    avatarBox.style.setProperty('width', `${w}px`, 'important');
                    avatarBox.style.setProperty('min-width', `${w}px`, 'important');
                    avatarBox.style.setProperty('min-height', `${h}px`, 'important');
                    if (avatarWrap) {
                      avatarWrap.style.setProperty('height', `${h}px`, 'important');
                      avatarWrap.style.setProperty('width', `${w}px`, 'important');
                    }
                  }
                }
              };
              requestAnimationFrame(syncResultPhotoWithBio);

              if (typeof ResizeObserver !== 'undefined' && !window.__resultHeroBioObserverBound) {
                window.__resultHeroBioObserverBound = true;
                const bioTable = document.querySelector('.result-identity-card .hero-bio-table');
                if (bioTable) {
                  new ResizeObserver(syncResultPhotoWithBio).observe(bioTable);
                }
              }
            }
            if (st && st.photo_url) {
              const avatarImg = document.getElementById('result-avatar-img');
              const avatarInitial = document.getElementById('result-avatar-initial');
              avatarImg.src = st.photo_url;
              avatarImg.onerror = () => {
                avatarImg.classList.add('hidden');
                avatarInitial?.classList.remove('hidden');
              };
              avatarImg.classList.remove('hidden');
              avatarInitial?.classList.add('hidden');

              // Also sync top header avatar
              const headerAvatarImg = document.getElementById('header-avatar-img');
              const headerAvatarInitEl = document.getElementById('header-avatar-initial');
              if (headerAvatarImg) {
                headerAvatarImg.src = st.photo_url;
                headerAvatarImg.onerror = () => {
                  headerAvatarImg.classList.add('hidden');
                  headerAvatarInitEl?.classList.remove('hidden');
                };
                headerAvatarImg.classList.remove('hidden');
              }
              if (headerAvatarInitEl) headerAvatarInitEl.classList.add('hidden');
            } else {
              const cleanStudentName = (st?.name || session.student_name || 'Student').replace(/^(mr\.?|miss\.?|mrs\.?|ms\.?)\s+/i, '').trim();
              const initLetter = cleanStudentName.charAt(0).toUpperCase() || 'S';
              document.getElementById('result-avatar-initial').textContent = initLetter;
              const headerAvatarInitEl = document.getElementById('header-avatar-initial');
              if (headerAvatarInitEl && !isAdminSession) headerAvatarInitEl.textContent = initLetter;
            }
          }
        } catch (err) {
          console.warn('Could not load student photo:', err);
        }

        // Render student name below divider in header card
        const nameLabel = document.getElementById('result-student-name-label');
        if (nameLabel && studentFullName) {
          nameLabel.textContent = studentFullName;
        }

        // Authoritative Standard Grading System (Official Scale)
        const hexToRgba = (hex, alpha) => {
          let c = String(hex || TOPSCORE_COLORS.STAR).replace('#', '').trim();
          if (c.length === 3) c = c.split('').map(x => x + x).join('');
          if (c.length === 8) c = c.substring(0, 6);
          const num = parseInt(c, 16);
          return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
        };

        const hexToRgbString = (hex) => {
          let c = String(hex || TOPSCORE_COLORS.STAR).replace('#', '').trim();
          if (c.length === 3) c = c.split('').map(x => x + x).join('');
          if (c.length === 8) c = c.substring(0, 6);
          const num = parseInt(c, 16);
          return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
        };

        const isGradeSOr100 = (pct >= 100 || grade === '★' || grade === 'S' || grade === 'STAR');
        const currentTier = isGradeSOr100 ? '★' : grade;
        if (isGradeSOr100) {
          gradeColor = TOPSCORE_COLORS.STAR;
        }
        const rgbColor = TOPSCORE_COLORS[`${isGradeSOr100 ? 'STAR' : (grade === '★' ? 'STAR' : grade)}_RGB`] || hexToRgbString(gradeColor);

        // Guaranteed Clean Slate for Entrance Animation:
        // Tier glow and background particles are held until Step 5 (Grade Reveal / Stamp Impact)
        // so the user experiences the true visceral surprise!
        document.body.classList.remove('tier-glow-active');

        // 5. Achievement Status (Prepared for Step 6 reveal)
        const motEl = document.getElementById('result-motivation-msg');
        if (motEl) {
          const statusText = getAchievementStatus(grade, pct);
          const predEl = document.getElementById('result-predicate-text');
          if (predEl) {
            predEl.textContent = statusText;
          } else {
            motEl.textContent = statusText;
          }
          motEl.style.display = 'none';
          motEl.classList.remove('cascade-revealed');
        }

        let displayGradeHtml = isGradeSOr100 ? `
            <svg class="pure-star-svg" width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: none; display:inline-block; vertical-align:middle;">
              <defs>
                <linearGradient id="starHeroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="${TOPSCORE_COLORS.STAR}" />
                  <stop offset="100%" stop-color="#7e22ce" />
                </linearGradient>
              </defs>
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="url(#starHeroGrad)" />
            </svg>
          ` : `${grade}`;

        // 1. Initial State for Student Avatar Container Ring: Neutral Slate
        const avatarContainer = document.getElementById('result-avatar-container');
        if (avatarContainer) {
          avatarContainer.style.background = 'rgba(15, 23, 42, 0.9)';
          avatarContainer.style.border = '2.5px solid rgba(255, 255, 255, 0.25)';
          avatarContainer.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.35)';
        }

        // Modern Pure Star Accent (★ Vector Badge for S / Star 100%, Letter for A-E / R)
        const gradeBadge = document.getElementById('result-grade-badge');
        if (gradeBadge) {
          if (isGradeSOr100) {
            gradeBadge.innerHTML = `
              <span style="display:inline-flex; align-items:center;">
                <svg class="star-accent-vector" width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="starGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="${TOPSCORE_COLORS.STAR}" />
                      <stop offset="100%" stop-color="#7e22ce" />
                    </linearGradient>
                  </defs>
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="url(#starGrad)" />
                </svg>
              </span>
            `;
          } else {
            gradeBadge.textContent = grade;
            gradeBadge.style.color = gradeColor;
          }
        }

        const gradeStamp = document.getElementById('result-grade-stamp');
        if (gradeStamp) {
          const stampClass = (grade === '★' || grade === 'S') ? 'grade-star' : `grade-${grade}`;
          gradeStamp.className = `result-grade-stamp pure-stamp ${stampClass}`;
          gradeStamp.textContent = grade;
          gradeStamp.style.color = gradeColor;
        }

        // 3. Percentage in Dual Score & Grade Card (Clean white text during count-up)
        const pctEl = document.getElementById('result-percentage');
        pctEl.className = 'result-percentage';

        // 4. Score Box Accent (Neutral border during count-up)
        const scoreBox = document.getElementById('result-score-box') || document.querySelector('.score-grade-box.score-box');
        if (scoreBox) {
          scoreBox.style.border = '1px solid rgba(255, 255, 255, 0.12)';
          scoreBox.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.25)';
        }

        pctEl.style.cssText = `font-family:'Inter', sans-serif !important;font-feature-settings:'tnum' on, 'lnum' on !important;letter-spacing:-0.01em !important;font-weight:900 !important;font-size:40px !important;line-height:1 !important;color:#F8FAFC !important;-webkit-text-fill-color:#F8FAFC !important;background:none !important;text-shadow:none !important;`;

        // 5. Grade Box & Value Accent (Neutral border during count-up, grade hidden)
        const gradeBox = document.getElementById('result-grade-box') || document.querySelector('.score-grade-box.grade-box');
        if (gradeBox) {
          gradeBox.style.border = '1px solid rgba(255, 255, 255, 0.12)';
          gradeBox.style.background = 'rgba(23, 33, 56, 0.8)';
          gradeBox.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.25)';
          gradeBox.classList.remove('pure-star-nobox');
          gradeBox.classList.remove('box-stamped');
        }

        const gradeValEl = document.getElementById('result-grade-val');
        if (gradeValEl) {
          gradeValEl.innerHTML = displayGradeHtml;
          if (isGradeSOr100) {
            gradeValEl.style.cssText = `display:inline-flex !important;align-items:center !important;justify-content:center !important;line-height:1 !important;border:none !important;background:none !important;`;
          } else {
            gradeValEl.style.cssText = `font-family:'Inter', sans-serif !important;font-weight:900 !important;font-size:40px !important;line-height:1 !important;color:${gradeColor} !important;-webkit-text-fill-color:${gradeColor} !important;text-shadow:none !important;`;
          }
          // Initial state: Delayed/Hidden until score animation completes
          gradeValEl.classList.add('grade-delayed');
          gradeValEl.classList.remove('grade-revealed');
        }

        // Hide stamp initially; slam it down when calculation reaches final score!
        if (gradeStamp) {
          gradeStamp.classList.remove('stamped');
        }

        // Initialize score to 0% for animated count-up sequence
        pctEl.textContent = '0%';

        // 2. Test Title: 2-Line Format (Line 1: Test Title, Line 2: Topic / Theme) via SSOT formatTestDisplay (AGENTS.md § 2.6 / DECISION-056)
        const asmRawTitle = asmData?.title || asmData?.name || 'Test';
        const formattedAsm = formatTestDisplay(asmData);
        const titleType = formattedAsm.line1 || 'TEST';
        const titleTopic = formattedAsm.line2 || '';

        const typeEl = document.getElementById('result-test-type-row') || document.getElementById('result-asm-type-row');
        const topicEl = document.getElementById('result-test-topic-row') || document.getElementById('result-asm-topic-row');
        const legacyNameEl = document.getElementById('result-Test-name');
        if (typeEl) {
          typeEl.textContent = titleType;
          typeEl.setAttribute('title', formattedAsm.fullTitle || titleType);
        }
        if (topicEl) {
          if (titleTopic) {
            topicEl.textContent = titleTopic;
            topicEl.setAttribute('title', titleTopic);
            topicEl.style.display = 'block';
            topicEl.style.color = '#cbd5e1';
            topicEl.style.textShadow = 'none';
          } else {
            topicEl.style.display = 'none';
          }
        }
        if (legacyNameEl) legacyNameEl.textContent = asmRawTitle;

        // Best score / not best score badge: Suppressed per user request ("tulisan best score atau not best score dihapus saja")
        const scoreBadgeEl = document.getElementById('result-best-score-badge');
        if (scoreBadgeEl) {
          scoreBadgeEl.innerHTML = '';
          scoreBadgeEl.style.display = 'none';
        }

        // Stats & Points (Linear / Apple Pill Row with Muted 0-Values)
        const attemptTotalQ = Number(attempt.total_questions || (answers.length > 0 ? answers.length : (activeSectionName === 'Phrases' ? 10 : 40)));
        const dbScore = Number(attempt.score ?? 0);
        const dbCorrect = Number(attempt.correct_count ?? (dbScore >= 1 ? Math.floor(dbScore) : 0));

        const correct = answers.length > 0 ? answers.filter(a => getEvalCategory(a) === 'correct').length : dbCorrect;
        const partial = answers.length > 0 ? answers.filter(a => getEvalCategory(a) === 'minor_spelling_error').length : 0;
        const wrong   = answers.length > 0 ? answers.filter(a => getEvalCategory(a) === 'incorrect').length : Math.max(0, attemptTotalQ - correct - partial);

        const rawTotalPoints = answers.length > 0 ? answers.reduce((sum, a) => sum + Number(a.score ?? 0), 0) : dbScore;
        const maxRemedialPts = attemptTotalQ * 0.6;
        const totalPoints = isRemedial ? Math.min(rawTotalPoints, maxRemedialPts) : rawTotalPoints;
        // Rule 2.10: Points Half-Up Whole Integer Invariant (Math.round)
        const formattedPoints = Math.round(Number(totalPoints || 0));

        const resPointsEl = document.getElementById('res-points');
        if (resPointsEl) {
          resPointsEl.textContent = '0';
          if (isRemedial) {
            resPointsEl.title = `Remedial capped at max 60% (${formattedPoints}/${attemptTotalQ} pts). Raw: ${rawTotalPoints} pts.`;
          }
          resPointsEl.style.color = '#F8FAFC';
          resPointsEl.style.fontWeight = '800';
        }

        const correctEl = document.getElementById('res-correct');
        if (correctEl) {
          correctEl.textContent = '0';
          correctEl.style.color = TOPSCORE_COLORS.CORRECT;
        }

        const partialEl = document.getElementById('res-partial');
        if (partialEl) {
          partialEl.textContent = '0';
          if (partial === 0) {
            partialEl.style.color = '#64748B';
            document.getElementById('card-filter-partial')?.style.setProperty('opacity', '0.65');
          } else {
            partialEl.style.color = TOPSCORE_COLORS.PARTIAL;
            document.getElementById('card-filter-partial')?.style.setProperty('opacity', '1');
          }
        }

        const wrongEl = document.getElementById('res-wrong');
        if (wrongEl) {
          wrongEl.textContent = '0';
          if (wrong === 0) {
            wrongEl.style.color = '#64748B';
            document.getElementById('card-filter-wrong')?.style.setProperty('opacity', '0.65');
          } else {
            wrongEl.style.color = TOPSCORE_COLORS.INCORRECT;
            document.getElementById('card-filter-wrong')?.style.setProperty('opacity', '1');
          }
        }

        // Breadcrumb & Card Header
        const crumbEl = document.getElementById('result-curriculum-crumb');
        if (crumbEl) {
          const className = asmData?.classes?.name || 'VOCABULARY';
          const levelName = asmData?.levels?.name || 'LEVEL 3';
          const asmCategory = (asmData?.category || asmData?.test_type || 'TASK').toUpperCase();
          crumbEl.textContent = `${className.toUpperCase()} • ${levelName.toUpperCase()} • ${humanizeType(asmCategory).toUpperCase()}`;
        }

        // Batch Champion Crown Check (King / Queen)
        try {
          const targetStudentId = attempt.student_id || session.student_id;
          if (targetStudentId) {
            const supabase = await getSupabase();
            const { data: stData } = await supabase.from('students').select('batch_id').eq('id', targetStudentId).maybeSingle();
            if (stData?.batch_id) {
              const { data: bAtts } = await supabase
                .from('attempts')
                .select('student_id, percentage')
                .in('status', ['submitted', 'auto_submitted', 'evaluated', 'graded']);
              const scoreMap = {};
              (bAtts || []).forEach(a => {
                scoreMap[a.student_id] = (scoreMap[a.student_id] || 0) + Number(a.percentage || 0);
              });
              const top = Object.entries(scoreMap).sort((a,b) => b[1] - a[1])[0];
              if (top && top[0] === targetStudentId) {
                document.getElementById('result-crown-badge')?.classList.remove('hidden');
              }
            }
          }
        } catch(_) {}

        // Accuracy Bar Computation
        const accuracyTotal = answers.length || attemptTotalQ || 1;
        const pctCorrect = ((correct / accuracyTotal) * 100).toFixed(1);
        const pctPartial = ((partial / accuracyTotal) * 100).toFixed(1);
        const pctWrong   = ((wrong / accuracyTotal) * 100).toFixed(1);

        const barCorrect = document.getElementById('acc-bar-correct');
        const barPartial = document.getElementById('acc-bar-partial');
        const barWrong   = document.getElementById('acc-bar-wrong');
        if (barCorrect) barCorrect.style.width = `${pctCorrect}%`;
        if (barPartial) barPartial.style.width = `${pctPartial}%`;
        if (barWrong)   barWrong.style.width = `${pctWrong}%`;

        const lblCorrect = document.getElementById('acc-lbl-correct');
        const lblWrong   = document.getElementById('acc-lbl-wrong');
        if (lblCorrect) lblCorrect.textContent = `${Math.round(pctCorrect)}% Correct`;
        if (lblWrong) {
          const missedPct = Math.round(Number(pctPartial) + Number(pctWrong));
          lblWrong.textContent = `${missedPct}% Missed`;
        }

        // Smart Next Milestone Action
        await renderSmartNextAction(attempt, answers, pct);

        // Clickable Summary Pills: jump into answer breakdown filtered
        document.getElementById('card-filter-correct')?.addEventListener('click', () => openBreakdownWithFilter('correct'));
        document.getElementById('card-filter-partial')?.addEventListener('click', () => openBreakdownWithFilter('partial'));
        document.getElementById('card-filter-wrong')?.addEventListener('click', () => openBreakdownWithFilter('incorrect'));
        document.getElementById('result-points-box')?.addEventListener('click', () => openBreakdownWithFilter('all'));
        document.getElementById('done-answers-modal-btn')?.addEventListener('click', closeAnswersModal);
        const answersModalEl = document.getElementById('answers-section');
        if (answersModalEl) {
          answersModalEl.addEventListener('click', (e) => {
            if (e.target === answersModalEl) closeAnswersModal();
          });
        }

        // FEATURE 9: Tutor note card (narrative_report support)
        if (attempt.narrative_report) {
          const heroSection = document.querySelector('.result-hero');
          if (heroSection && !document.getElementById('ai-narrative-card')) {
            const narrativeHtml = `
              <div id="ai-narrative-card" style="background:rgba(56,189,248,0.07); border:1px solid rgba(56,189,248,0.25); border-radius:12px; padding:0.85rem 1.1rem; margin:6px auto 0 auto; max-width:440px; text-align:left;">
                <div style="font-size:12px; font-weight:800; color:#38bdf8; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:5px;">${getSvgIcon('edit', 12)} Tutor Note</div>
                <p style="font-size:12px; color:#cbd5e1; line-height:1.55; margin:0;">${escapeHtml(attempt.narrative_report).replace(/\n/g, '<br>')}</p>
              </div>
            `;
            heroSection.insertAdjacentHTML('beforeend', narrativeHtml);
          }
        }

        // Render answer breakdown
        renderAnswers(answers, asmData);


        // Attempt history (all attempts for this test)
        if (testId) {
          try {
            const allAttempts = await fetchAllStudentAttempts(targetStudentId);
            const thisTestAttempts = allAttempts
              .filter(a => (a.test_id || a.Test_id) === testId && ['submitted','auto_submitted','SUBMITTED','AUTO_SUBMITTED'].includes(a.status))
              .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));

            if (thisTestAttempts.length > 1) {
              renderAttemptHistory(thisTestAttempts, attemptId);
            }
          } catch (histErr) {
            console.warn('Could not load attempt history:', histErr);
          }
        }


        // Wire up Try Again button with V1 test_id
        const tryAgainBtn = document.getElementById('try-again-btn');
        const asmStatus = (asmData?.status || 'PUBLISHED').toUpperCase();
        const isPublished = (asmStatus === 'PUBLISHED' || asmStatus === 'ACTIVE');

        if (tryAgainBtn) {
          tryAgainBtn.style.display = 'none';
        }

        // Back navigation customization for Admin
        if (isAdminSession) {
          const backBtn = document.getElementById('back-dashboard-btn');
          if (backBtn) {
            backBtn.textContent = 'BACK TO ROOM';
            backBtn.href = 'admin.html#class-hub';
          }
        }

        // Setup complete: Reveal content & hide centered loading overlay smoothly
        const loadingEl = document.getElementById('result-loading');
        const contentEl = document.getElementById('result-content');
        if (loadingEl) loadingEl.classList.add('hidden');
        if (contentEl) contentEl.classList.remove('hidden');

        // Launch unified top-to-bottom sequential cascade animation
        await runResultEntranceSequence({
          targetPct: pct,
          grade,
          isRemedial,
          correctCount: correct,
          partialCount: partial,
          wrongCount: wrong,
          formattedPoints,
          gradeColor,
          rgbColor,
          currentTier,
          isGradeSOr100
        });

      } catch(e) {
        showToast('Failed to load results: ' + e.message, 'error');
        document.getElementById('result-loading').innerHTML = `
          <div class="empty-state__icon" style="color:var(--grade-e, #FF0000);"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg></div>
          <h3>Could not load results</h3>
          <p class="text-muted">${escapeHtml(e.message)}</p>
          <a href="dashboard.html" class="btn btn-primary mt-4">Back to Class</a>
        `;
      }
    }

    function renderAttemptHistory(attempts, currentAttemptId) {
      // Create or find history container inside modal scroll body so it never stretches the zero-scroll main screen
      let histSection = document.getElementById('attempt-history-section');
      if (!histSection) {
        histSection = document.createElement('div');
        histSection.id = 'attempt-history-section';
        histSection.style.cssText = 'max-width:680px;margin:0 auto 1.25rem auto;';
        const listContainer = document.getElementById('answers-list-container');
        if (listContainer) {
          listContainer.parentNode.insertBefore(histSection, listContainer);
        }
      }

      const maxPct = attempts.length > 0 ? Math.max(...attempts.map(x => parseFloat(x.percentage || 0))) : 0;
      const bestAttempt = attempts.find(x => parseFloat(x.percentage || 0) === maxPct);

      const rows = attempts.map(a => {
        const apct = parseFloat(a.percentage || 0).toFixed(1);
        const isRemRow = Boolean(a.is_remedial_unlocked || a.is_remedial);
        const isForgivenRow = Boolean(a.is_forgiven);
        const ag = isForgivenRow ? 'F' : (isRemRow ? 'R' : (a.grade || getGrade(parseFloat(apct))));
        const isThis = a.id === currentAttemptId;
        const isBestRow = (a.is_best_score && parseFloat(a.percentage || 0) === maxPct) || (maxPct > 0 && a.id === bestAttempt?.id);
        const dateStr = a.submitted_at ? new Date(a.submitted_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';
        const aTheme = (typeof getGradeTheme === 'function' ? getGradeTheme(ag) : null) || GRADE_PALETTE[ag] || GRADE_PALETTE['★'] || GRADE_PALETTE.E;
        const isGradeS = (ag === '★' || ag === 'S' || ag === 'STAR');
        const displayGrade = isGradeS ? '★' : ag;
        const gradeColor = isGradeS ? TOPSCORE_COLORS.STAR : (aTheme.hex || aTheme.color);

        return `
          <tr style="${isThis ? 'background:rgba(56,189,248,0.07);' : ''}">
            <td style="padding:8px 12px;font-size:12px;color:var(--clr-text-3);">${escapeHtml(dateStr)}</td>
            <td style="padding:8px 12px;font-weight:700;color:${gradeColor};">${apct}%</td>
            <td style="padding:8px 12px;text-align:center;">
              <span style="font-weight:800;font-size:14px;color:${gradeColor};">${displayGrade}</span>
            </td>
            <td style="padding:8px 12px;">
              ${isBestRow ? `<span style="font-size:12px;font-weight:700;color:${TOPSCORE_COLORS.STAR};">Best</span>` : ''}
              ${isThis ? '<span style="font-size:12px;color:#38bdf8;">&larr; This attempt</span>' : `<a href="result.html?attempt_id=${escapeHtml(a.id)}" style="font-size:12px;color:var(--clr-text-3);text-decoration:underline;">View</a>`}
            </td>
          </tr>
        `;
      }).join('');

      histSection.innerHTML = `
        <div style="background:var(--clr-card,rgba(30,41,59,0.8));border:1px solid var(--clr-border,rgba(255,255,255,0.08));border-radius:14px;padding:1.25rem 1.5rem;margin-bottom:1.5rem;">
          <h3 style="font-size:16px;font-weight:700;color:var(--clr-text-1);margin:0 0 1rem;text-transform:uppercase;letter-spacing:0.04em;">Attempt History</h3>
          <div class="table-responsive" style="max-height:280px;overflow-y:auto;overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;">
              <thead>
                <tr style="border-bottom:1px solid var(--clr-border);">
                  <th style="padding:8px 12px;font-size:12px;color:#ffffff;text-align:left;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;position:sticky;top:0;z-index:10;background:#0f172a;box-shadow:0 1px 0 rgba(255,255,255,0.1);">DATE</th>
                  <th style="padding:8px 12px;font-size:12px;color:#ffffff;text-align:left;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;position:sticky;top:0;z-index:10;background:#0f172a;box-shadow:0 1px 0 rgba(255,255,255,0.1);">RATE</th>
                  <th style="padding:8px 12px;font-size:12px;color:#ffffff;text-align:left;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;position:sticky;top:0;z-index:10;background:#0f172a;box-shadow:0 1px 0 rgba(255,255,255,0.1);">GRADE</th>
                  <th style="padding:8px 12px;font-size:12px;color:#ffffff;text-align:left;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;position:sticky;top:0;z-index:10;background:#0f172a;box-shadow:0 1px 0 rgba(255,255,255,0.1);">ACTION</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      `;
    }

    function animateCount(el, target, isRemedial = false, onComplete) {
      let start = 0;
      const duration = 1100;
      const startTime = performance.now();
      function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        start = ease * target;
        el.textContent = (target % 1 === 0 ? Math.round(start) : start.toFixed(1)) + '%';
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          const finalVal = (target % 1 === 0 ? Math.round(target) : target.toFixed(1)) + '%';
          el.textContent = finalVal;
          if (typeof onComplete === 'function') onComplete();
        }
      }
      requestAnimationFrame(step);
    }

    async function runResultEntranceSequence({
      targetPct,
      grade,
      isRemedial,
      correctCount,
      partialCount,
      wrongCount,
      formattedPoints,
      gradeColor,
      rgbColor,
      currentTier,
      isGradeSOr100
    }) {
      const resolvedRgb = rgbColor || (TOPSCORE_COLORS && TOPSCORE_COLORS[`${isGradeSOr100 ? 'STAR' : (grade === '★' ? 'STAR' : grade)}_RGB`]) || '0, 192, 0';
      const resolvedTier = currentTier || (isGradeSOr100 ? '★' : grade);
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Immediate reveal if user prefers reduced motion
      if (prefersReducedMotion) {
        document.querySelectorAll('.cascade-item, .cascade-metric-row, .cascade-btn-item').forEach(el => {
          el.classList.add('cascade-revealed');
        });
        const pctEl = document.getElementById('result-percentage');
        if (pctEl) {
          const finalVal = (targetPct % 1 === 0 ? Math.round(targetPct) : targetPct.toFixed(1)) + '%';
          pctEl.textContent = finalVal;
        }
        const gradeValEl = document.getElementById('result-grade-val');
        if (gradeValEl) {
          gradeValEl.classList.remove('grade-delayed');
          gradeValEl.classList.add('grade-revealed');
        }
        const gradeBox = document.getElementById('result-grade-box');
        if (gradeBox) gradeBox.classList.add('box-stamped');
        const correctEl = document.getElementById('res-correct');
        if (correctEl) correctEl.textContent = correctCount;
        const partialEl = document.getElementById('res-partial');
        if (partialEl) partialEl.textContent = partialCount;
        const wrongEl = document.getElementById('res-wrong');
        if (wrongEl) wrongEl.textContent = wrongCount;
        const pointsEl = document.getElementById('res-points');
        if (pointsEl) pointsEl.textContent = formattedPoints;
        launchBgParticles(grade);
        activateTierGlow(gradeColor, resolvedRgb, resolvedTier, isGradeSOr100);
        return;
      }

      // Safety fallback: ensure all elements become visible even if unexpected error happens
      const safetyTimeout = setTimeout(() => {
        document.querySelectorAll('.cascade-item, .cascade-metric-row, .cascade-btn-item').forEach(el => {
          el.classList.add('cascade-revealed');
        });
        const gradeValEl = document.getElementById('result-grade-val');
        if (gradeValEl) {
          gradeValEl.classList.remove('grade-delayed');
          gradeValEl.classList.add('grade-revealed');
        }
        launchBgParticles(grade);
        activateTierGlow(gradeColor, resolvedRgb, resolvedTier, isGradeSOr100);
      }, 5000);

      const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

      function countUp(el, target, duration = 300, isFloat = false) {
        if (!el) return;
        const numTarget = Number(target);
        if (isNaN(numTarget) || numTarget === 0) {
          el.textContent = isFloat ? '0.0' : '0';
          return;
        }
        const start = performance.now();
        function step(now) {
          const elapsed = now - start;
          const p = Math.min(elapsed / duration, 1);
          const ease = 1 - Math.pow(1 - p, 3);
          const current = ease * numTarget;
          el.textContent = isFloat ? current.toFixed(1) : Math.round(current);
          if (p < 1) requestAnimationFrame(step);
          else el.textContent = target;
        }
        requestAnimationFrame(step);
      }

      // Step 1: Student Identity Card cascades in from top
      const idCard = document.getElementById('result-identity-card');
      if (idCard) idCard.classList.add('cascade-revealed');
      await sleep(180);

      // Step 2: Test Title cascades in
      const titleCard = document.getElementById('result-Test-name-container');
      if (titleCard) titleCard.classList.add('cascade-revealed');
      await sleep(180);

      // Step 3: Metrics Table container cascades in
      const compositeCard = document.getElementById('result-metrics-composite-card') || document.getElementById('result-metrics-bar');
      if (compositeCard) compositeCard.classList.add('cascade-revealed');
      await sleep(100);

      // Metric Row 1: CORRECT
      const rowCorrect = document.getElementById('card-filter-correct');
      if (rowCorrect) {
        rowCorrect.classList.add('cascade-revealed');
        countUp(document.getElementById('res-correct'), correctCount, 260);
      }
      await sleep(120);

      // Metric Row 2: PARTIAL
      const rowPartial = document.getElementById('card-filter-partial');
      if (rowPartial) {
        rowPartial.classList.add('cascade-revealed');
        countUp(document.getElementById('res-partial'), partialCount, 260);
      }
      await sleep(120);

      // Metric Row 3: INCORRECT
      const rowWrong = document.getElementById('card-filter-wrong');
      if (rowWrong) {
        rowWrong.classList.add('cascade-revealed');
        countUp(document.getElementById('res-wrong'), wrongCount, 260);
      }
      await sleep(140);

      // Metric Row 4: POINTS
      const rowPoints = document.getElementById('result-points-box');
      if (rowPoints) {
        rowPoints.classList.add('cascade-revealed');
        const isFloat = String(formattedPoints).includes('.');
        countUp(document.getElementById('res-points'), formattedPoints, 320, isFloat);
      }
      await sleep(180);

      // Step 4: Dual Score & Grade Card cascades in
      const scoreGradeCard = document.getElementById('result-score-grade-card');
      if (scoreGradeCard) scoreGradeCard.classList.add('cascade-revealed');
      await sleep(100);

      // Score starts at 0% and counts up to targetPct% over ~1100ms
      const pctEl = document.getElementById('result-percentage');
      const gradeValEl = document.getElementById('result-grade-val');
      const gradeBox = document.getElementById('result-grade-box');
      const gradeStamp = document.getElementById('result-grade-stamp');

      // Sync SVG score ring if present
      animateScoreRing(targetPct, grade, isRemedial);

      await new Promise(resolve => {
        animateCount(pctEl, targetPct, isRemedial, () => resolve());
      });

      // Step 5: The EXACT moment score count-up finishes -> Grade Stamp Impact & SURPRISE TIER IGNITION!
      if (gradeValEl) {
        gradeValEl.classList.remove('grade-delayed');
        gradeValEl.classList.add('grade-revealed');
      }
      if (gradeBox) {
        gradeBox.classList.add('box-stamped');
      }
      if (gradeStamp) {
        gradeStamp.classList.add('stamped');
      }

      // SURPRISE EFFECT: Ignite Tier Glow & Launch Particles at this exact moment!
      launchBgParticles(grade);
      activateTierGlow(gradeColor, resolvedRgb, resolvedTier, isGradeSOr100);

      if (isGradeSOr100 || targetPct >= 100) {
        launchConfetti();
      }

      // Step 6: 280ms after Grade Stamp -> Evaluation Word Card reveals
      await sleep(280);
      const evalCard = document.getElementById('result-motivation-msg');
      if (evalCard) {
        evalCard.style.display = 'flex';
        evalCard.classList.remove('hidden');
        evalCard.classList.add('cascade-revealed');
      }

      // Step 7: 220ms after Evaluation Word Card -> Action Buttons reveal in sequence
      await sleep(220);
      const actionsWrap = document.getElementById('result-actions-container') || document.querySelector('.result-action-buttons-wrap');
      if (actionsWrap) actionsWrap.classList.add('cascade-revealed');

      const smartNext = document.getElementById('smart-next-action-container');
      if (smartNext) smartNext.classList.add('cascade-revealed');
      await sleep(120);

      const backBtn = document.getElementById('back-dashboard-btn');
      if (backBtn) backBtn.classList.add('cascade-revealed');

      activateTierGlow(gradeColor, resolvedRgb, resolvedTier, isGradeSOr100);
      clearTimeout(safetyTimeout);
    }

    // Wire up Modal Open & Close Triggers
    document.getElementById('toggle-answers-btn')?.addEventListener('click', () => {
      openAnswersModal('all');
    });

    document.getElementById('close-answers-modal-btn')?.addEventListener('click', closeAnswersModal);
    document.getElementById('done-answers-modal-btn')?.addEventListener('click', closeAnswersModal);

    // Close on backdrop click (outside card)
    document.getElementById('answers-section')?.addEventListener('click', (e) => {
      if (e.target.id === 'answers-section') {
        closeAnswersModal();
      }
    });

    // Close on Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeAnswersModal();
      }
    });

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', loadResult);
    } else {
      loadResult();
    }

