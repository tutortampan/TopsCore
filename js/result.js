/**
 * TopsCore — Assessment Result Viewer Module
 * v5.3.3 — 10 Feature Upgrades: Score Ring, Student Name, Motivation Msg,
 *           Rank in Batch, Attempt Counter, Improvement Delta, BG Particles,
 *           Time Taken, Tutor Note Card, Staggered Entrance Animations
 */

import { fetchAttemptResult, fetchAttemptAnswers, fetchAllStudentAttempts, fetchAssessmentsForStudentLevel, fetchActiveTestSession, fetchStudentClasses, startAssessment, submitAssessment, GRADE_PALETTE, getGradeColor, getScoreColor, getGradeTheme, labelAttemptRemedial } from './api.js?v=5.6.5';
import { getStudentSession, getAdminSession } from './session.js?v=5.5.8';
import { showToast, getGrade, showLoading, hideLoading, escapeHtml, escHtml } from './app.js?v=5.5.8';
import { getSupabase } from './supabase.js?v=5.5.8';

let session = getStudentSession();
if (!session) {
  const admin = getAdminSession();
  if (admin) {
    session = { student_name: 'Administrator', is_admin: true };
  } else {
    window.location.replace('index.html');
    throw new Error('Not authenticated');
  }
}

    // V1: support ?attempt_id= URL param (from dashboard "View Result" button)
    const urlParams = new URLSearchParams(window.location.search);
    const attemptId = urlParams.get('attempt_id') || sessionStorage.getItem('topscore_attempt_id');
    if (!attemptId) { window.location.href = 'dashboard.html'; }

    // escapeHtml / escHtml imported canonically

    function getEvalCategory(a) {
      if (!a) return 'incorrect';
      const res = (a.evaluation_result || '').toLowerCase();
      const score = Number(a.score ?? 0);
      if (res === 'correct' || (!res && (a.is_correct === true || score >= 1))) {
        return 'correct';
      }
      if (res === 'minor_spelling_error' || res === 'partial' || (!res && score > 0 && score < 1)) {
        return 'minor_spelling_error';
      }
      return 'incorrect';
    }

    const gradeColors = { S: '#a855f7', A: '#10b981', B: '#38bdf8', C: '#f59e0b', D: '#f97316', E: '#ef4444', F: '#ef4444' };

    // Humanize raw assessment_type values from DB
    function humanizeType(raw) {
      if (!raw) return '';
      const map = {
        VOCABULARY: 'Vocabulary',
        GRAMMAR: 'Grammar',
        SPEAKING: 'Speaking',
        LISTENING: 'Listening',
        READING: 'Reading',
        WRITING: 'Writing',
        TASK: 'Task',
        TEST: 'Test',
        EXAM: 'Exam',
        QUIZ: 'Quiz',
        WORD_TASK: 'Word Task',
        PHRASE_TASK: 'Phrase Task',
        VOCAB_TEST: 'Vocab Test',
        WORDS_TEST: 'Word Test',
        PHRASES_TEST: 'Phrase Test',
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
      const palettes = {
        S: ['#a855f7', '#c084fc', '#9333ea', '#e9d5ff'],
        A: ['#10b981', '#34d399', '#059669', '#6ee7b7'],
        B: ['#38bdf8', '#7dd3fc', '#0284c7', '#bae6fd'],
        C: ['#f59e0b', '#fbbf24', '#d97706', '#fde68a'],
        D: ['#f97316', '#fb923c', '#ea580c', '#fed7aa'],
        E: ['#ef4444', '#f87171', '#dc2626', '#fca5a5'],
        F: ['#ef4444', '#f87171', '#dc2626', '#fca5a5'],
        REMEDIAL: ['#f59e0b', '#fbbf24', '#d97706', '#fde68a'],
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

      const gradeRingColors = {
        S: '#a855f7', A: '#10b981', B: '#38bdf8',
        C: '#f59e0b', D: '#f97316', E: '#ef4444', F: '#ef4444'
      };
      circle.style.stroke = isRemedial ? '#f59e0b' : (gradeRingColors[grade] || '#38bdf8');

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
      if (g === 'R' || !['S', 'STAR', 'A', 'B', 'C', 'D', 'E', 'F'].includes(g)) {
        const p = parseFloat(pct || 0);
        if (p >= 100) g = 'S';
        else if (p >= 80) g = 'A';
        else if (p >= 60) g = 'B';
        else if (p >= 40) g = 'C';
        else if (p >= 20) g = 'D';
        else g = 'E';
      }
      const map = {
        S: 'EXCELLENT',
        STAR: 'EXCELLENT',
        A: 'VERY GOOD',
        B: 'GOOD',
        C: 'ENOUGH',
        D: 'LESS',
        E: 'FAIL',
        F: 'FAIL'
      };
      return map[g] || 'ENOUGH';
    }
    const getEvaluationWord = (grade, isRemedial = false, pct = null) => getAchievementStatus(grade, pct);

    // ═══════════════════════════════════════════════════════════
    // FEATURE 3 / 7: Improvement Indicator (delta vs last attempt)
    // ═══════════════════════════════════════════════════════════
    function renderAttemptMeta(attempts, currentAttemptId, currentPct) {
      const el = document.getElementById('result-attempt-meta');
      if (!el || !attempts || attempts.length === 0) return;

      const idx = attempts.findIndex(a => a.id === currentAttemptId);
      const attemptNum = idx >= 0 ? attempts.length - idx : attempts.length;
      const totalAttempts = attempts.length;

      let deltaHtml = '';
      // Previous attempt is the one after this one in the desc-sorted list
      if (idx >= 0 && idx < attempts.length - 1) {
        const prev = attempts[idx + 1];
        const prevPct = parseFloat(prev.percentage || 0);
        const delta = currentPct - prevPct;
        if (Math.abs(delta) > 0.05) {
          const sign = delta > 0 ? '▲' : '▼';
          const color = delta > 0 ? '#10b981' : '#f87171';
          const absDelta = Math.abs(delta).toFixed(1);
          deltaHtml = `<div style="font-size:0.68rem; font-weight:800; color:${color}; margin-top:3px;">${sign} ${absDelta}% from last</div>`;
        }
      }

      el.innerHTML = `
        <div style="text-align:center; padding-left: 14px;">
          <div style="font-size:0.68rem; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.06em;">Attempt</div>
          <div style="font-size:1.1rem; font-weight:900; color:#f8fafc; line-height:1;">${attemptNum}<span style="font-size:0.72rem; color:#94a3b8;">/${totalAttempts}</span></div>
          ${deltaHtml}
        </div>
      `;
    }

    // ═══════════════════════════════════════════════════════════
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

      const colors = ['#fbbf24', '#f59e0b', '#10b981', '#38bdf8', '#ec4899', '#a855f7', '#ffffff'];
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

    let currentFilterCallback = null;
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

      const isAdmin = Boolean(getAdminSession()) || session?.is_admin === true || urlParams.get('admin') === '1' || urlParams.get('is_admin') === 'true' || urlParams.get('from') === 'admin';
      const isRemedial = Boolean(attempt.is_remedial_unlocked || attempt.is_remedial);

      // IF ADMIN / TUTOR: Render the 2-COLUMN SPLIT SEGMENTED CONTROL [ NORMAL ] | [ REMIDI ] directly in this slot
      if (isAdmin) {
        container.innerHTML = `
          <div class="tutor-remedial-segmented" role="group" aria-label="Exam Remedial Status">
            <button type="button" class="remedial-segment-btn segment-normal ${!isRemedial ? 'active' : ''}" id="btn-segment-normal" title="Set Status: Normal Exam">
              <span>${!isRemedial ? '●' : '○'}</span> NORMAL
            </button>
            <button type="button" class="remedial-segment-btn segment-remidi ${isRemedial ? 'active' : ''}" id="btn-segment-remidi" title="Set Status: Remedial Exam">
              <span>${isRemedial ? '●' : '○'}</span> REMEDIAL
            </button>
          </div>
        `;
        const btnNormal = document.getElementById('btn-segment-normal');
        const btnRemidi = document.getElementById('btn-segment-remidi');
        if (btnNormal && btnRemidi) {
          btnNormal.onclick = async () => {
            if (!isRemedial) return;
            try {
              showLoading();
              await labelAttemptRemedial(attempt.id, false, 60);
              showToast('Status updated: NORMAL', 'success');
              setTimeout(() => window.location.reload(), 300);
            } catch (err) {
              console.error(err);
              showToast('Failed to update status', 'error');
            } finally {
              hideLoading();
            }
          };
          btnRemidi.onclick = async () => {
            if (isRemedial) return;
            try {
              showLoading();
              await labelAttemptRemedial(attempt.id, true, 60);
              showToast('Status updated: REMEDIAL', 'warning');
              setTimeout(() => window.location.reload(), 300);
            } catch (err) {
              console.error(err);
              showToast('Failed to update status', 'error');
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
        const { data: st } = await supabase.from('students').select('id, batch_id, level_id, program_id, institution_id').eq('id', targetStudentId).single();
        if (!st) return;

        const programId = st.program_id || session.program_id;
        const levelId = st.level_id || session.level_id;
        const institutionId = st.institution_id || session.institution_id;
        const batchId = st.batch_id || session.batch_id;

        const [allAssms, allAtts, classes] = await Promise.all([
          fetchAssessmentsForStudentLevel(programId, levelId, institutionId).catch(() => []),
          fetchAllStudentAttempts(targetStudentId).catch(() => []),
          fetchStudentClasses(programId, institutionId, levelId).catch(() => [])
        ]);

        const myClassIds = new Set((classes || []).map(c => c.id));

        const bestMap = {};
        (allAtts || []).forEach(a => {
          const aid = a.assessment_id;
          const p = parseFloat(a.percentage || 0);
          if (bestMap[aid] == null || p > bestMap[aid]) {
            bestMap[aid] = p;
          }
        });

        const asmData = attempt.assessments || attempt.Assessments;
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

        const isPassed = (asm) => {
          const score = bestMap[asm.id];
          if (score == null) return false;
          const req = asm.minimum_required_score || 60;
          return score >= req;
        };

        const nextAsm = published.find(a => !isPassed(a));
        if (!nextAsm) {
          container.innerHTML = `
            <div style="background:rgba(52,211,153,0.08); border:1px solid rgba(52,211,153,0.22); border-radius:10px; padding:6px 12px; text-align:center; margin-bottom:4px;">
              <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.08em; color:#34D399; font-weight:700;">🎉 Level Curriculum Complete</div>
              <div style="font-size:12px; font-weight:600; color:#E2E8F0; margin-top:2px;">All tasks and tests completed!</div>
            </div>
          `;
          return;
        }

        const isTest = (nextAsm.assessment_category || '').toUpperCase() === 'TEST' ||
                       (nextAsm.assessment_type || '').toUpperCase().includes('TEST') ||
                       (nextAsm.title || '').toUpperCase().includes('TEST');

        const nextName = nextAsm.title || nextAsm.shell_code || 'Next Assessment';

        if (!isTest) {
          container.innerHTML = `
            <button class="btn-next-milestone" id="btn-next-milestone" type="button">
              <span class="next-btn-tag">GO TO NEXT ASSESSMENT:</span>
              <span class="next-btn-title">${escapeHtml(cleanTitle(nextName))} &rarr;</span>
            </button>
          `;
          document.getElementById('btn-next-milestone').onclick = () => {
            sessionStorage.setItem('topscore_assessment_id', nextAsm.id);
            sessionStorage.removeItem('topscore_attempt_id');
            window.location.href = `assessment.html?id=${nextAsm.id}`;
          };
        } else {
          const activeSession = await fetchActiveTestSession(nextAsm.id, batchId).catch(() => null);
          const isUnlocked = activeSession?.is_unlocked === true;
          const isWhitelisted = !activeSession?.allowed_student_ids || 
                                activeSession.allowed_student_ids.length === 0 || 
                                activeSession.allowed_student_ids.includes(targetStudentId);

          if (isUnlocked && isWhitelisted) {
            container.innerHTML = `
              <button class="btn-next-milestone btn-next-test" id="btn-next-milestone" type="button">
                <span class="next-btn-tag">GO TO NEXT ASSESSMENT:</span>
                <span class="next-btn-title">${escapeHtml(cleanTitle(nextName))} &rarr;</span>
              </button>
            `;
            document.getElementById('btn-next-milestone').onclick = () => {
              sessionStorage.setItem('topscore_assessment_id', nextAsm.id);
              sessionStorage.removeItem('topscore_attempt_id');
              window.location.href = `assessment.html?id=${nextAsm.id}`;
            };
          } else {
            container.innerHTML = `
              <div style="background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.35); border-radius:10px; padding:10px 14px; text-align:center;">
                <div style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.06em; color:#f59e0b; font-weight:800;">
                  🔒 Next Milestone: ${escapeHtml(cleanTitle(nextName))}
                </div>
                <div style="font-size:0.8rem; color:#cbd5e1; margin-top:2px;">
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
            showLoading('Finalizing and calculating your assessment score...');
            await submitAssessment(attemptId, pendingPayload, { status: 'submitted' });
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


        const asmData = attempt.assessments || attempt.Assessments;
        const assessmentId = attempt.assessment_id || attempt.Assessment_id;
        const rawPct = parseFloat(attempt.percentage || 0);
        const isRemedial = Boolean(attempt.is_remedial_unlocked);
        const pct = isRemedial ? Math.min(rawPct, 60.0) : parseFloat(attempt.effective_score ?? rawPct);
        const grade = isRemedial ? 'R' : (attempt.grade || getGrade(pct));
        const theme = (typeof getGradeTheme === 'function' ? getGradeTheme(grade, isRemedial) : null) || GRADE_PALETTE[grade] || GRADE_PALETTE.F;
        const isGradeS = (grade === 'S' || grade === 'STAR') && !isRemedial;

        // FEATURE 1: Launch grade-specific background particles
        launchBgParticles(isRemedial ? 'REMEDIAL' : grade);

        // Dynamic Tier Atmosphere on Result Hero
        const heroSection = document.getElementById('result-hero-section') || document.querySelector('.result-hero');
        if (heroSection) {
          heroSection.className = isRemedial ? `result-hero tier-R` : `result-hero tier-${grade}`;
        }

        // Wire up Top Header matching Student Dashboard / Lobby
        const isAdminSession = Boolean(getAdminSession()) || session?.is_admin === true || urlParams.get('admin') === '1' || urlParams.get('is_admin') === 'true' || urlParams.get('from') === 'admin';
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
            profileBtn.title = "Back to Student's Lobby";
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
            backBtn.textContent = 'BACK TO LOBBY';
            backBtn.href = 'dashboard.html';
          }
        }

        // Fetch user photo + FEATURE 3: student name label
        // Fetch student identity, institutional metadata, and photo
        let studentFullName = session.student_name || 'Student';
        const targetStudentId = attempt.student_id || session.student_id;
        try {
          const supabase = await getSupabase();
          if (targetStudentId) {
            const { data: st } = await supabase.from('students')
              .select('id, name, photo_url, batch_id, level_id, program_id, institution_id, institutions(name), programs(name), batches(name), levels(name)')
              .eq('id', targetStudentId)
              .single();
            if (st) {
              studentFullName = st.name || studentFullName;

              // Populate institutional metadata hierarchy (Wireframe: Institution | Program | Batch | Level)
              const metaInstEl = document.getElementById('meta-inst');
              const metaProgEl = document.getElementById('meta-prog');
              const metaBatchEl = document.getElementById('meta-batch');
              const metaLvlEl = document.getElementById('meta-lvl');

              const instName = st.institutions?.name || session.institution_name || 'Cake English Course';
              const progName = (st.programs?.name || session.program_name || 'CAMP').toUpperCase();
              const batchName = st.batches?.name || session.batch_name || '133';
              const lvlName = asmData?.levels?.name || st.levels?.name || session.level_name || '3rd Level';

              if (metaInstEl) metaInstEl.textContent = instName;
              if (metaProgEl) metaProgEl.textContent = progName;
              if (metaBatchEl) metaBatchEl.textContent = batchName;
              if (metaLvlEl) metaLvlEl.textContent = lvlName;
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

        // Authoritative Standard Grading System (Matte Modern Palette)
        // S = #a855f7, A = #10b981, B = #38bdf8, C = #f59e0b, D = #f97316, E/F = #ef4444, R = #FFFF00
        const standardGradeColors = {
          S: '#a855f7', // 💜 Electric Violet / Purple Glow (100% & Grade S)
          A: '#10b981', // 💚 Emerald Green
          B: '#38bdf8', // 🩵 Sky Blue
          C: '#f59e0b', // 💛 Warm Amber
          D: '#f97316', // 🧡 Matte Orange
          E: '#ef4444', // ❤️ Crimson Red
          F: '#ef4444', // ❤️ Crimson Red
          R: '#FFFF00'  // 💛 Kuning Murni (Remedial)
        };

        const hexToRgba = (hex, alpha) => {
          let c = String(hex || '#a855f7').replace('#', '');
          if (c.length === 3) c = c.split('').map(x => x + x).join('');
          const num = parseInt(c, 16);
          return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
        };

        const hexToRgbString = (hex) => {
          let c = String(hex || '#a855f7').replace('#', '');
          if (c.length === 3) c = c.split('').map(x => x + x).join('');
          const num = parseInt(c, 16);
          return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
        };

        const isGradeSOr100 = (pct >= 100 || grade === 'S' || grade === 'STAR') && !isRemedial;
        const currentTier = isGradeSOr100 ? 'S' : (isRemedial ? 'R' : grade);
        let gradeColor = isRemedial ? '#FFFF00' : (standardGradeColors[grade] || '#a855f7');
        const rgbColor = hexToRgbString(gradeColor);

        // 5. Achievement Status (Rule DECISION-018: strictly FAIL, LESS, ENOUGH, GOOD, VERY GOOD, EXCELLENT)
        const motEl = document.getElementById('result-motivation-msg');
        if (motEl) {
          motEl.textContent = getAchievementStatus(grade, pct);
          motEl.style.display = 'flex';
          motEl.classList.remove('hidden');
          motEl.dataset.tier = currentTier;
          motEl.style.setProperty('--tier-color', gradeColor);
          motEl.style.setProperty('--tier-rgb', rgbColor);
        }

        let displayGradeHtml = grade;
        if (isRemedial) {
          displayGradeHtml = 'R';
          gradeColor = '#FFFF00';
        } else if (isGradeSOr100) {
          displayGradeHtml = `
            <svg class="pure-star-svg" width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 0 16px rgba(168, 85, 247, 0.95)) drop-shadow(0 0 28px rgba(192, 132, 252, 0.65)); display:inline-block; vertical-align:middle;">
              <defs>
                <linearGradient id="starPurpleHeroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#c084fc" />
                  <stop offset="50%" stop-color="#a855f7" />
                  <stop offset="100%" stop-color="#7e22ce" />
                </linearGradient>
              </defs>
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="url(#starPurpleHeroGrad)" />
            </svg>
          `;
          gradeColor = '#a855f7';
        } else {
          displayGradeHtml = grade;
          gradeColor = standardGradeColors[grade] || '#a855f7';
        }

        // 1. Ambient Hero Banner Aura & Modular CSS Variables (1:1 with Dashboard)
        const identityCard = document.getElementById('result-identity-card');
        if (identityCard) {
          identityCard.dataset.tier = currentTier;
          identityCard.style.setProperty('--tier-color', gradeColor);
          identityCard.style.setProperty('--tier-rgb', rgbColor);
          if (isGradeSOr100) {
            identityCard.style.borderColor = 'rgba(168, 85, 247, 0.55)';
            identityCard.style.boxShadow = '0 0 35px rgba(168, 85, 247, 0.45), 0 15px 35px -8px rgba(0, 0, 0, 0.5)';
            identityCard.style.background = 'radial-gradient(ellipse 90% 70% at 50% 0%, rgba(168, 85, 247, 0.22), transparent 75%), #0f172a';
          } else if (isRemedial) {
            identityCard.style.borderColor = 'rgba(255, 255, 0, 0.55)';
            identityCard.style.boxShadow = '0 0 25px rgba(255, 255, 0, 0.35), 0 10px 25px -5px rgba(0, 0, 0, 0.35)';
            identityCard.style.background = 'radial-gradient(ellipse 90% 70% at 50% 0%, rgba(255, 255, 0, 0.15), transparent 75%), #0f172a';
          } else {
            identityCard.style.borderColor = `rgba(${rgbColor}, 0.55)`;
            identityCard.style.boxShadow = `0 0 20px rgba(${rgbColor}, 0.25), 0 10px 25px -5px rgba(0, 0, 0, 0.35)`;
            identityCard.style.background = `radial-gradient(ellipse 90% 70% at 50% 0%, rgba(${rgbColor}, 0.14), transparent 75%), #0f172a`;
          }
        }

        // Propagate tier color & border aura to all cards (Wireframe Rule)
        const asmTitleWrap = document.getElementById('result-Assessment-name-container');
        if (asmTitleWrap) {
          asmTitleWrap.dataset.tier = currentTier;
          asmTitleWrap.style.setProperty('--tier-color', gradeColor);
          asmTitleWrap.style.setProperty('--tier-rgb', rgbColor);
        }
        const metricsTable = document.getElementById('result-metrics-bar');
        if (metricsTable) {
          metricsTable.dataset.tier = currentTier;
          metricsTable.style.setProperty('--tier-color', gradeColor);
          metricsTable.style.setProperty('--tier-rgb', rgbColor);
        }
        const scoreGradeCard = document.getElementById('result-score-grade-card');
        if (scoreGradeCard) {
          scoreGradeCard.dataset.tier = currentTier;
          scoreGradeCard.style.setProperty('--tier-color', gradeColor);
          scoreGradeCard.style.setProperty('--tier-rgb', rgbColor);
        }

        // 2. Student Avatar Container Ring & Glow: Dynamically 100% follows student's Grade (1:1 Dashboard)
        const avatarContainer = document.getElementById('result-avatar-container');
        if (avatarContainer) {
          avatarContainer.style.setProperty('--tier-color', gradeColor);
          if (isGradeSOr100) {
            avatarContainer.style.background = 'linear-gradient(135deg, #c084fc 0%, #a855f7 45%, #7e22ce 100%)';
            avatarContainer.style.boxShadow = '0 0 25px rgba(168, 85, 247, 0.85), 0 0 45px rgba(192, 132, 252, 0.45)';
            avatarContainer.style.border = '2.5px solid #c084fc';
          } else if (isRemedial) {
            avatarContainer.style.background = 'rgba(15, 23, 42, 0.9)';
            avatarContainer.style.border = '2.5px solid #FFFF00';
            avatarContainer.style.boxShadow = '0 0 18px rgba(255, 255, 0, 0.5), 0 4px 14px rgba(0, 0, 0, 0.35)';
          } else {
            avatarContainer.style.background = 'rgba(15, 23, 42, 0.9)';
            avatarContainer.style.border = `2.5px solid ${gradeColor}`;
            avatarContainer.style.boxShadow = `0 0 16px rgba(${rgbColor}, 0.45), 0 4px 14px rgba(0, 0, 0, 0.35)`;
          }
        }

        // Modern Pure Star Accent (★ Vector Badge for S / Star 100%, Letter for A-E / R)
        const gradeBadge = document.getElementById('result-grade-badge');
        if (gradeBadge) {
          if (isRemedial) {
            gradeBadge.textContent = 'R';
            gradeBadge.style.color = '#FFFF00';
          } else if (isGradeSOr100) {
            gradeBadge.innerHTML = `
              <svg class="star-accent-vector" width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="starPurpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#C084FC" />
                    <stop offset="100%" stop-color="#A855F7" />
                  </linearGradient>
                </defs>
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="url(#starPurpleGrad)" />
              </svg>
            `;
          } else {
            gradeBadge.textContent = grade;
            gradeBadge.style.color = gradeColor;
          }
        }

        const gradeStamp = document.getElementById('result-grade-stamp');
        if (gradeStamp) {
          gradeStamp.className = isRemedial
            ? `result-grade-stamp pure-stamp grade-remedial`
            : `result-grade-stamp pure-stamp grade-${grade}`;
          if (isRemedial) {
            gradeStamp.textContent = 'R';
            gradeStamp.style.color = '#FFFF00';
          }
        }

        // 3. Percentage in Dual Score & Grade Card (Synchronized font color with Grade)
        const pctEl = document.getElementById('result-percentage');
        pctEl.className = isRemedial ? 'result-percentage' : `result-percentage text-grade-${grade}`;

        const scoreColor = isRemedial ? '#FFFF00' : gradeColor;
        const scoreGlow = `0 0 16px ${hexToRgba(scoreColor, 0.65)}, 0 0 32px ${hexToRgba(scoreColor, 0.35)}`;

        // 4. Score Box Accent
        const scoreBox = document.getElementById('result-score-box') || document.querySelector('.score-grade-box.score-box');
        if (scoreBox) {
          scoreBox.style.borderColor = isGradeSOr100 ? 'rgba(168, 85, 247, 0.6)' : `rgba(${rgbColor}, 0.55)`;
          scoreBox.style.boxShadow = isGradeSOr100
            ? '0 0 18px rgba(168, 85, 247, 0.35), 0 6px 16px rgba(0, 0, 0, 0.25)'
            : `0 0 12px rgba(${rgbColor}, 0.25), 0 4px 14px rgba(0, 0, 0, 0.2)`;
        }

        pctEl.style.cssText = `font-family:'Outfit','Inter',-apple-system,BlinkMacSystemFont,sans-serif !important;font-feature-settings:'tnum' on, 'lnum' on !important;letter-spacing:-0.01em !important;font-weight:900 !important;font-size:clamp(1.5rem, 3.8vw, 1.85rem) !important;line-height:1 !important;color:${scoreColor} !important;-webkit-text-fill-color:${scoreColor} !important;background:none !important;text-shadow:${scoreGlow} !important;`;

        // 5. Grade Box & Value Accent (Kotak Grade simetris dengan Kotak Skor, TANPA .pure-star-nobox)
        const gradeBox = document.getElementById('result-grade-box') || document.querySelector('.score-grade-box.grade-box');
        if (gradeBox) {
          gradeBox.style.borderColor = isGradeSOr100 ? 'rgba(168, 85, 247, 0.6)' : `rgba(${rgbColor}, 0.55)`;
          gradeBox.style.background = 'rgba(23, 33, 56, 0.8)';
          gradeBox.style.boxShadow = isGradeSOr100
            ? '0 0 18px rgba(168, 85, 247, 0.35), 0 6px 16px rgba(0, 0, 0, 0.25)'
            : `0 0 12px rgba(${rgbColor}, 0.25), 0 4px 14px rgba(0, 0, 0, 0.2)`;
          gradeBox.classList.remove('pure-star-nobox');
          gradeBox.classList.remove('box-stamped');
        }

        const gradeValEl = document.getElementById('result-grade-val');
        if (gradeValEl) {
          gradeValEl.innerHTML = displayGradeHtml;
          if (isGradeSOr100) {
            gradeValEl.style.cssText = `display:inline-flex !important;align-items:center !important;justify-content:center !important;line-height:1 !important;border:none !important;background:none !important;`;
          } else {
            const glow1 = hexToRgba(gradeColor, 0.95);
            const glow2 = hexToRgba(gradeColor, 0.70);
            const vibrantTextGlow = `0 0 12px ${glow1}, 0 0 24px ${glow2}`;
            gradeValEl.style.cssText = `font-family:'Outfit','Inter',-apple-system,BlinkMacSystemFont,sans-serif !important;font-weight:900 !important;font-size:clamp(1.5rem, 3.8vw, 1.85rem) !important;line-height:1 !important;color:${gradeColor} !important;-webkit-text-fill-color:${gradeColor} !important;text-shadow:${vibrantTextGlow} !important;`;
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

        // 2. Assessment Title: 2-Line Format (Line 1: Assessment Title, Line 2: Topic / Theme)
        const asmRawTitle = asmData?.title || asmData?.name || 'Assessment';
        const parts = asmRawTitle.split(/\s*[-—]\s*/);
        let titleType = '';
        let titleTopic = '';
        if (parts.length >= 2) {
          titleType = cleanTitle(parts[0]).trim();
          titleTopic = parts.slice(1).join(' - ').trim();
        } else {
          titleType = cleanTitle(asmRawTitle).trim();
          titleTopic = asmData?.topic || asmData?.theme || asmData?.assessment_type || '';
        }

        const typeEl = document.getElementById('result-asm-type-row');
        const topicEl = document.getElementById('result-asm-topic-row');
        const legacyNameEl = document.getElementById('result-Assessment-name');
        if (typeEl) typeEl.textContent = titleType.toUpperCase();
        if (topicEl) {
          if (titleTopic) {
            topicEl.textContent = titleTopic.toUpperCase();
            topicEl.style.display = 'block';
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
        const correct = answers.filter(a => getEvalCategory(a) === 'correct').length;
        const partial = answers.filter(a => getEvalCategory(a) === 'minor_spelling_error').length;
        const wrong   = answers.filter(a => getEvalCategory(a) === 'incorrect').length;
        
        const rawTotalPoints = answers.reduce((sum, a) => sum + Number(a.score ?? 0), 0);
        const attemptTotalQ = Number(attempt.total_questions || answers.length || 50);
        const maxRemedialPts = attemptTotalQ * 0.6;
        const totalPoints = isRemedial ? Math.min(rawTotalPoints, maxRemedialPts) : rawTotalPoints;
        const formattedPoints = (totalPoints % 1 !== 0) ? totalPoints.toFixed(1) : totalPoints;
        
        const resPointsEl = document.getElementById('res-points');
        if (resPointsEl) {
          resPointsEl.textContent = '0';
          if (isRemedial) {
            resPointsEl.style.color = '#FFFF00';
            const ptsRow = document.getElementById('result-points-box');
            if (ptsRow) {
              const lbl = ptsRow.querySelector('.metric-stacked-lbl');
              if (lbl) lbl.style.color = '#FFFF00';
            }
            resPointsEl.title = `Capped at KKM 60% (${formattedPoints}/${attemptTotalQ} pts). Raw attempt: ${rawTotalPoints} pts.`;
          } else {
            resPointsEl.style.color = '#F8FAFC';
          }
        }

        const correctEl = document.getElementById('res-correct');
        if (correctEl) {
          correctEl.textContent = '0';
          correctEl.style.color = '#34D399';
        }

        const partialEl = document.getElementById('res-partial');
        if (partialEl) {
          partialEl.textContent = '0';
          if (partial === 0) {
            partialEl.style.color = '#64748B';
            document.getElementById('card-filter-partial')?.style.setProperty('opacity', '0.65');
          } else {
            partialEl.style.color = '#FBBF24';
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
            wrongEl.style.color = '#F87171';
            document.getElementById('card-filter-wrong')?.style.setProperty('opacity', '1');
          }
        }

        // Breadcrumb & Card Header
        const crumbEl = document.getElementById('result-curriculum-crumb');
        if (crumbEl) {
          const className = asmData?.classes?.name || 'VOCABULARY';
          const levelName = asmData?.levels?.name || 'LEVEL 3';
          const asmCategory = (asmData?.assessment_category || asmData?.assessment_type || 'TASK').toUpperCase();
          crumbEl.textContent = `${className.toUpperCase()} • ${levelName.toUpperCase()} • ${humanizeType(asmCategory).toUpperCase()}`;
        }

        // Batch Champion Crown Check (King / Queen)
        try {
          const targetStudentId = attempt.student_id || session.student_id;
          if (targetStudentId) {
            const supabase = await getSupabase();
            const { data: stData } = await supabase.from('students').select('batch_id').eq('id', targetStudentId).single();
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

        // FEATURE 9: Tutor note card (narrative_report support)
        if (attempt.narrative_report) {
          const heroSection = document.querySelector('.result-hero');
          if (heroSection && !document.getElementById('ai-narrative-card')) {
            const narrativeHtml = `
              <div id="ai-narrative-card" style="background:rgba(56,189,248,0.07); border:1px solid rgba(56,189,248,0.25); border-radius:12px; padding:0.85rem 1.1rem; margin:6px auto 0 auto; max-width:440px; text-align:left;">
                <div style="font-size:0.7rem; font-weight:800; color:#38bdf8; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:5px;">✏️ Tutor Note</div>
                <p style="font-size:0.82rem; color:#cbd5e1; line-height:1.55; margin:0;">${escapeHtml(attempt.narrative_report).replace(/\n/g, '<br>')}</p>
              </div>
            `;
            heroSection.insertAdjacentHTML('beforeend', narrativeHtml);
          }
        }

        // Render answer breakdown
        renderAnswers(answers);

        // Attempt history (all attempts for this assessment)
        if (assessmentId) {
          try {
            const allAttempts = await fetchAllStudentAttempts(targetStudentId);
            const thisAssessmentAttempts = allAttempts
              .filter(a => (a.assessment_id || a.Assessment_id) === assessmentId && ['submitted','auto_submitted','SUBMITTED','AUTO_SUBMITTED'].includes(a.status))
              .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));

            // FEATURE 6: Attempt counter + improvement indicator beside stamp
            renderAttemptMeta(thisAssessmentAttempts, attemptId, pct);

            if (thisAssessmentAttempts.length > 1) {
              renderAttemptHistory(thisAssessmentAttempts, attemptId);
            }
          } catch (histErr) {
            console.warn('Could not load attempt history:', histErr);
          }
        }


        // Wire up Try Again button with V1 assessment_id
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
          isGradeSOr100
        });

      } catch(e) {
        showToast('Failed to load results: ' + e.message, 'error');
        document.getElementById('result-loading').innerHTML = `
          <div class="empty-state__icon">&#10060;</div>
          <h3>Could not load results</h3>
          <p class="text-muted">${escapeHtml(e.message)}</p>
          <a href="dashboard.html" class="btn btn-primary mt-4">Back to Student's Lobby</a>
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
        const ag   = a.grade || getGrade(parseFloat(apct));
        const isThis = a.id === currentAttemptId;
        const isBestRow = (a.is_best_score && parseFloat(a.percentage || 0) === maxPct) || (maxPct > 0 && a.id === bestAttempt?.id);
        const dateStr = a.submitted_at ? new Date(a.submitted_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';
        const aTheme = (typeof getGradeTheme === 'function' ? getGradeTheme(ag) : null) || GRADE_PALETTE[ag] || GRADE_PALETTE.F;
        const isGradeS = (ag === 'S' || ag === 'STAR');
        const displayGrade = isGradeS ? '⭐' : ag;
        const badgeStyle = isGradeS
          ? 'background:linear-gradient(135deg, #f59e0b, #fbbf24, #fef08a);color:#78350f;border:1px solid #fef08a;box-shadow:0 0 10px rgba(245,158,11,0.6);animation:gold-badge-sparkle 2.2s infinite ease-in-out;'
          : `background:${aTheme.hex}18;border:1.5px solid ${aTheme.border};color:${aTheme.hex};box-shadow:0 0 8px ${aTheme.glow};`;

        return `
          <tr style="${isThis ? 'background:rgba(56,189,248,0.07);' : ''}">
            <td style="padding:8px 12px;font-size:0.82rem;color:var(--clr-text-3);">${escapeHtml(dateStr)}</td>
            <td style="padding:8px 12px;font-weight:700;color:${aTheme.hex};${isGradeS ? 'text-shadow:0 0 8px rgba(251,191,36,0.6);' : ''}">${apct}%</td>
            <td style="padding:8px 12px;">
              <span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:7px;font-weight:800;font-size:0.85rem;${badgeStyle}">${displayGrade}</span>
            </td>
            <td style="padding:8px 12px;">
              ${isBestRow ? '<span style="font-size:0.72rem;font-weight:700;color:#10b981;">&#11088; Best</span>' : ''}
              ${isThis ? '<span style="font-size:0.72rem;color:#38bdf8;">&larr; This attempt</span>' : `<a href="result.html?attempt_id=${escapeHtml(a.id)}" style="font-size:0.72rem;color:var(--clr-text-3);text-decoration:underline;">View</a>`}
            </td>
          </tr>
        `;
      }).join('');

      histSection.innerHTML = `
        <div style="background:var(--clr-card,rgba(30,41,59,0.8));border:1px solid var(--clr-border,rgba(255,255,255,0.08));border-radius:14px;padding:1.25rem 1.5rem;margin-bottom:1.5rem;">
          <h3 style="font-size:0.9rem;font-weight:700;color:var(--clr-text-1);margin:0 0 1rem;">&#128203; Attempt History</h3>
          <div class="table-responsive">
            <table style="width:100%;border-collapse:collapse;">
              <thead>
                <tr style="border-bottom:1px solid var(--clr-border);">
                  <th style="padding:6px 12px;font-size:0.75rem;color:var(--clr-text-3);text-align:left;font-weight:600;">Date</th>
                  <th style="padding:6px 12px;font-size:0.75rem;color:var(--clr-text-3);text-align:left;font-weight:600;">Score</th>
                  <th style="padding:6px 12px;font-size:0.75rem;color:var(--clr-text-3);text-align:left;font-weight:600;">Grade</th>
                  <th style="padding:6px 12px;font-size:0.75rem;color:var(--clr-text-3);text-align:left;font-weight:600;"></th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      `;
    }

    function animateCount(el, target, onComplete) {
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
          el.textContent = (target % 1 === 0 ? Math.round(target) : target.toFixed(1)) + '%';
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
      isGradeSOr100
    }) {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Immediate reveal if user prefers reduced motion
      if (prefersReducedMotion) {
        document.querySelectorAll('.cascade-item, .cascade-metric-row, .cascade-btn-item').forEach(el => {
          el.classList.add('cascade-revealed');
        });
        const pctEl = document.getElementById('result-percentage');
        if (pctEl) pctEl.textContent = (targetPct % 1 === 0 ? Math.round(targetPct) : targetPct.toFixed(1)) + '%';
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

      // Step 2: Assessment Title cascades in
      const titleCard = document.getElementById('result-Assessment-name-container');
      if (titleCard) titleCard.classList.add('cascade-revealed');
      await sleep(180);

      // Step 3: Metrics Table container cascades in
      const metricsBar = document.getElementById('result-metrics-bar');
      if (metricsBar) metricsBar.classList.add('cascade-revealed');
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
        animateCount(pctEl, targetPct, () => resolve());
      });

      // Step 5: The EXACT moment score count-up finishes -> Grade Stamp Impact!
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
      if (isGradeSOr100 || targetPct >= 100) {
        launchConfetti();
      }

      // Step 6: 280ms after Grade Stamp -> Evaluation Word Card reveals
      await sleep(280);
      const evalCard = document.getElementById('result-motivation-msg');
      if (evalCard) {
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
      await sleep(120);

      const breakdownBtn = document.getElementById('toggle-answers-btn');
      if (breakdownBtn) breakdownBtn.classList.add('cascade-revealed');

      clearTimeout(safetyTimeout);
    }

    function renderAnswers(answers) {
      const container = document.getElementById('answers-list-container');
      container.innerHTML = '';

      // Sorting
      const order = { 'incorrect': 1, 'minor_spelling_error': 2, 'correct': 3 };
      answers.sort((a, b) => (order[getEvalCategory(a)] || 99) - (order[getEvalCategory(b)] || 99));

      const correctCount = answers.filter(a => getEvalCategory(a) === 'correct').length;
      const partialCount = answers.filter(a => getEvalCategory(a) === 'minor_spelling_error').length;
      const wrongCount = answers.filter(a => getEvalCategory(a) === 'incorrect').length;

      // Identify words vs phrases for section tabs
      const phraseItems = answers.filter(a => {
        const snap = typeof a.question_snapshot === 'string' ? (() => { try { return JSON.parse(a.question_snapshot); } catch(_) { return {}; } })() : (a.question_snapshot || {});
        const wt = (snap.word_type || '').toLowerCase();
        const sec = (snap.test_section || '').toLowerCase();
        return sec === 'phrases' || ['phrase', 'expression', 'idiom', 'proverb'].includes(wt);
      });
      const wordItems = answers.filter(a => !phraseItems.includes(a));
      const hasSections = phraseItems.length > 0 && wordItems.length > 0;

      let sectionFilter = 'all'; // 'all', 'words', 'phrases'
      let currentFilter = 'all';  // 'all', 'incorrect', 'partial', 'correct'
      let searchQuery = '';
      let currentPage = 1;
      const itemsPerPage = 50;

      // Search and Filters Bar
      const filterHtml = `
        <div style="max-width: 680px; margin: 0 auto 1.5rem auto; display: flex; flex-direction: column; gap: 10px;">
          <!-- Search Input -->
          <div style="position: relative; width: 100%;">
            <input type="search" id="ans-search-input" placeholder="Search question, prompt, or answer..." style="width: 100%; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 10px; padding: 10px 14px 10px 38px; color: #f8fafc; font-size: 0.88rem; outline: none; transition: border-color 0.2s;" />
            <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); opacity: 0.5; pointer-events: none; font-size: 0.85rem;">🔍</span>
          </div>

          ${hasSections ? `
          <!-- Section Tabs (Words vs Phrases) -->
          <div class="d-flex flex-wrap gap-2 justify-center" id="section-filter-group">
            <button class="ans-section-btn active" data-section="all">
              All Sections (${answers.length})
            </button>
            <button class="ans-section-btn" data-section="words">
              Part 1: Words (${wordItems.length})
            </button>
            <button class="ans-section-btn" data-section="phrases">
              Part 2: Phrases (${phraseItems.length})
            </button>
          </div>
          ` : ''}

          <!-- Status Filter Chips -->
          <div class="d-flex flex-wrap gap-2 justify-center" id="status-filter-group">
            <button class="ans-filter-btn active" data-filter="all">All (${answers.length})</button>
            <button class="ans-filter-btn" data-filter="incorrect">Incorrect (${wrongCount})</button>
            <button class="ans-filter-btn" data-filter="partial">Partial (${partialCount})</button>
            <button class="ans-filter-btn" data-filter="correct">Correct (${correctCount})</button>
          </div>
        </div>
      `;
      container.insertAdjacentHTML('beforeend', filterHtml);

      const listContainer = document.createElement('div');
      listContainer.id = 'answers-list-items';
      container.appendChild(listContainer);

      function renderList() {
        let filtered = answers;

        // Filter by section
        if (sectionFilter === 'words') {
          filtered = filtered.filter(a => wordItems.includes(a));
        } else if (sectionFilter === 'phrases') {
          filtered = filtered.filter(a => phraseItems.includes(a));
        }

        // Filter by status
        if (currentFilter !== 'all') {
          filtered = filtered.filter(a => {
            if (currentFilter === 'incorrect') return getEvalCategory(a) === 'incorrect';
            if (currentFilter === 'partial') return getEvalCategory(a) === 'minor_spelling_error';
            if (currentFilter === 'correct') return getEvalCategory(a) === 'correct';
            return true;
          });
        }

        // Filter by search query
        if (searchQuery) {
          const q = searchQuery.toLowerCase().trim();
          filtered = filtered.filter(a => {
            const snap = typeof a.question_snapshot === 'string' ? (() => { try { return JSON.parse(a.question_snapshot); } catch(_) { return {}; } })() : (a.question_snapshot || {});
            const qText = String(snap.question_text || snap.question || snap.indonesian || '').toLowerCase();
            const sAns = String(a.student_answer || '').toLowerCase();
            const cAns = String(a.correct_answer_snapshot || snap.english || '').toLowerCase();
            return qText.includes(q) || sAns.includes(q) || cAns.includes(q);
          });
        }

        const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
        if (currentPage > totalPages) currentPage = totalPages;
        
        const startIdx = (currentPage - 1) * itemsPerPage;
        const pageItems = filtered.slice(startIdx, startIdx + itemsPerPage);

        if (pageItems.length === 0) {
          listContainer.innerHTML = `
            <div style="text-align: center; padding: 2.5rem 1rem; color: #94a3b8; font-size: 0.9rem;">
              No matching questions found for current search and filters.
            </div>
          `;
          return;
        }

        let currentSection = '';
        const listHtml = pageItems.map((a, idx) => {
            const snap = typeof a.question_snapshot === 'string'
            ? (() => { try { return JSON.parse(a.question_snapshot); } catch { return {}; } })()
            : (a.question_snapshot || {});
            
            const cat = getEvalCategory(a);
            const isCorrect = cat === 'correct';
            const isPartial = cat === 'minor_spelling_error';

            const resultText  = isCorrect ? 'Correct' : isPartial ? 'Partial' : 'Incorrect';
            const typeStr = isCorrect ? 'correct' : isPartial ? 'partial' : 'incorrect';
            const colorHex = isCorrect ? '#10b981' : isPartial ? '#f59e0b' : '#ef4444';
            
            const qNum = a.question_index !== undefined ? a.question_index + 1 : answers.indexOf(a) + 1;

            const isPhrase = phraseItems.includes(a);
            const partTag = hasSections
              ? `<span style="font-size:0.68rem; font-weight:700; color:${isPhrase ? '#ec4899' : '#38bdf8'}; background:rgba(255,255,255,0.06); padding:2px 6px; border-radius:4px; margin-right:6px;">${isPhrase ? 'Part 2: Phrase' : 'Part 1: Word'}</span>`
              : '';

            let headerHtml = '';
            if (currentSection !== typeStr && !searchQuery) {
               currentSection = typeStr;
               const title = isCorrect ? 'CORRECT' : isPartial ? 'PARTIAL' : 'INCORRECT';
               const count = isCorrect ? correctCount : isPartial ? partialCount : wrongCount;
               headerHtml = `
                <div class="answer-section-header" style="margin: 1.5rem 0 0.75rem; text-align: center; color: #94a3b8; font-size: 0.75rem; font-weight: 700; letter-spacing: 2px;">
                  ─── ${title} (${count}) ───
                </div>
               `;
            }

            const statusIcon = isCorrect ? '✅' : isPartial ? '⚠️' : '❌';

            return `
              ${headerHtml}
              <div class="answer-row-compact" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-left:4px solid ${colorHex}; border-radius:10px; padding:10px 14px; margin-bottom:8px; display:flex; flex-direction:column; gap:6px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <div style="font-size:0.86rem; font-weight:700; color:#f8fafc; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                    <span style="margin-right:4px;">${statusIcon}</span> ${partTag}Q${qNum}. ${escapeHtml(snap.question_text || snap.question || snap.indonesian || 'Question')}
                  </div>
                  <div style="font-size:0.75rem; font-weight:700; color:${colorHex}; background:rgba(255,255,255,0.06); padding:2px 8px; border-radius:6px; margin-left:10px; white-space:nowrap;">
                    ${resultText} ${a.score ?? 0}pt
                  </div>
                </div>
                <div style="display:flex; flex-wrap:wrap; align-items:center; gap:8px; font-size:0.8rem;">
                  <span style="background:rgba(255,255,255,0.05); padding:3px 8px; border-radius:5px; color:#cbd5e1;">
                    Your: <strong style="color:${isCorrect ? '#34d399' : '#f87171'};">${escapeHtml(a.student_answer || '—')}</strong>
                  </span>
                  ${!isCorrect ? `
                  <span style="background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.25); padding:3px 8px; border-radius:5px; color:#a7f3d0;">
                    Correct: <strong style="color:#10b981;">${escapeHtml(String(a.correct_answer_snapshot || snap.english || ''))}</strong>
                  </span>
                  ` : ''}
                </div>
              </div>
            `;
        }).join('');

        let paginationHtml = '';
        if (totalPages > 1) {
            paginationHtml = `
              <div class="d-flex align-center justify-center gap-3 mt-5 mb-4">
                <button class="btn btn-secondary btn-sm ${currentPage === 1 ? 'opacity-50' : ''}" style="border:1px solid rgba(255,255,255,0.1);" onclick="window.changePage(-1)" ${currentPage === 1 ? 'disabled' : ''}>&larr; Prev</button>
                <span style="font-size:0.85rem; font-weight: 600; color:#94a3b8;">Page ${currentPage} of ${totalPages} (${filtered.length} items)</span>
                <button class="btn btn-secondary btn-sm ${currentPage === totalPages ? 'opacity-50' : ''}" style="border:1px solid rgba(255,255,255,0.1);" onclick="window.changePage(1)" ${currentPage === totalPages ? 'disabled' : ''}>Next &rarr;</button>
              </div>
            `;
        }

        listContainer.innerHTML = listHtml + paginationHtml;
      }

      window.changePage = (dir) => {
        currentPage += dir;
        renderList();
        document.getElementById('answers-section')?.scrollIntoView({ behavior: 'smooth' });
      };

      renderList();

      // Search Input Listener
      const searchInput = document.getElementById('ans-search-input');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          searchQuery = e.target.value;
          currentPage = 1;
          renderList();
        });
      }

      // Section Tabs Listener
      const sectionBtns = container.querySelectorAll('.ans-section-btn');
      sectionBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          sectionBtns.forEach(b => b.classList.remove('active'));
          e.target.classList.add('active');
          sectionFilter = e.target.dataset.section;
          currentPage = 1;
          renderList();
        });
      });

      // Status Filter Chips Listener
      const filterBtns = container.querySelectorAll('.ans-filter-btn');
      filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          filterBtns.forEach(b => b.classList.remove('active'));
          e.target.classList.add('active');
          currentFilter = e.target.dataset.filter;
          currentPage = 1;
          renderList();
        });
      });

      // Expose callback for clickable summary cards
      currentFilterCallback = (newFilter) => {
        currentFilter = newFilter;
        currentPage = 1;
        filterBtns.forEach(b => {
          b.classList.toggle('active', b.dataset.filter === newFilter);
        });
        renderList();
      };
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

    loadResult();
