/**
 * TopsCore — Assessment Result Viewer Module
 * v5.3.3 — 10 Feature Upgrades: Score Ring, Student Name, Motivation Msg,
 *           Rank in Batch, Attempt Counter, Improvement Delta, BG Particles,
 *           Time Taken, Tutor Note Card, Staggered Entrance Animations
 */

import { fetchAttemptResult, fetchAttemptAnswers, fetchAllStudentAttempts, fetchAssessmentsForStudentLevel, fetchActiveTestSession, fetchStudentClasses, startAssessment, submitAssessment, GRADE_PALETTE, getGradeColor, getScoreColor, getGradeTheme, labelAttemptRemedial } from './api.js?v=5.3.2';
import { getStudentSession, getAdminSession } from './session.js?v=5.3.2';
import { showToast, getGrade, showLoading, hideLoading, escapeHtml, escHtml } from './app.js?v=5.3.2';
import { getSupabase } from './supabase.js?v=5.3.2';

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

    const gradeColors = { S: '#fbbf24', A: '#10b981', B: '#84cc16', C: '#eab308', D: '#f97316', E: '#ef4444', F: '#ef4444' };

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

      // Color palette per grade
      const palettes = {
        S: ['#fbbf24', '#fef08a', '#f59e0b', '#ffd700'],
        A: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0'],
        B: ['#84cc16', '#a3e635', '#bef264', '#d9f99d'],
        C: ['#eab308', '#fde047', '#fef08a', '#fef9c3'],
        D: ['#f97316', '#fb923c', '#fdba74', '#fff7ed'],
        E: ['#ef4444', '#f87171', '#fca5a5', '#fee2e2'],
        F: ['#ef4444', '#f87171', '#fca5a5', '#fee2e2'],
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
    function animateScoreRing(pct, grade) {
      const circle = document.getElementById('ring-progress-circle');
      if (!circle) return;
      const r = 50;
      const circumference = 2 * Math.PI * r;
      circle.style.strokeDasharray = circumference;
      circle.style.strokeDashoffset = circumference; // start empty

      const gradeRingColors = {
        S: '#fbbf24', A: '#10b981', B: '#38bdf8',
        C: '#a78bfa', D: '#fb923c', E: '#f87171', F: '#ef4444'
      };
      circle.style.stroke = gradeRingColors[grade] || '#38bdf8';

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
    // FEATURE 4: Grade-specific Motivational Messages
    // ═══════════════════════════════════════════════════════════
    function getMotivationMsg(grade, pct) {
      const msgs = {
        S: { text: '🏆 PERFECT MASTERY! Truly exceptional!', color: '#fbbf24' },
        A: { text: '🌟 Outstanding! You nailed it!', color: '#10b981' },
        B: { text: '💪 Great work! Keep pushing higher!', color: '#38bdf8' },
        C: { text: '👍 Good effort! Room to grow!', color: '#a78bfa' },
        D: { text: '📚 Keep studying — you can do better!', color: '#fb923c' },
        E: { text: '⚡ Don\'t give up — review and retry!', color: '#f87171' },
        F: { text: '🔄 Practice more before retaking.', color: '#ef4444' },
      };
      return msgs[grade] || msgs.C;
    }

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
    // FEATURE 5: Rank in Batch
    // ═══════════════════════════════════════════════════════════
    async function renderRankInBatch(targetStudentId, batchId) {
      const el = document.getElementById('result-rank-badge');
      if (!el || !batchId) return;
      try {
        const supabase = await getSupabase();
        // Get all students in the batch
        const { data: batchStudents } = await supabase
          .from('students')
          .select('id')
          .eq('batch_id', batchId)
          .is('deleted_at', null);

        if (!batchStudents || batchStudents.length < 2) return;
        const batchStudentIds = batchStudents.map(s => s.id);

        // Get all submitted attempts for these students (including points and remedial state)
        const { data: bAtts } = await supabase
          .from('attempts')
          .select('student_id, assessment_id, score, total_questions, percentage, effective_score, is_remedial_unlocked')
          .in('status', ['submitted', 'auto_submitted'])
          .in('student_id', batchStudentIds);

        if (!bAtts || bAtts.length === 0) return;

        // Compute best score & points map per student (Points-Centric Ranking)
        const studentBestMap = {};
        batchStudentIds.forEach(sid => { studentBestMap[sid] = {}; });

        bAtts.forEach(a => {
          const sid = a.student_id;
          const aid = a.assessment_id;
          if (!sid || !aid || !studentBestMap[sid]) return;
          const rawPct = parseFloat(a.percentage || 0);
          const isRem = Boolean(a.is_remedial_unlocked);
          const effPct = isRem ? Math.min(rawPct, 60.0) : parseFloat(a.effective_score ?? rawPct);
          const rawScore = parseFloat(a.score != null ? a.score : (rawPct * (a.total_questions || 100) / 100));
          const maxRemPts = a.total_questions ? (a.total_questions * 0.6) : (rawScore * 0.6);
          const effPoints = isRem ? Math.min(rawScore, maxRemPts) : rawScore;

          if (!studentBestMap[sid][aid] || effPct > studentBestMap[sid][aid].effPct || (effPct === studentBestMap[sid][aid].effPct && effPoints > studentBestMap[sid][aid].points)) {
            studentBestMap[sid][aid] = { effPct, points: effPoints };
          }
        });

        const ranked = batchStudentIds.map(sid => {
          const items = Object.values(studentBestMap[sid] || {});
          const totalPts = Math.round(items.reduce((sum, it) => sum + (it.points || 0), 0) * 10) / 10;
          const avgPct = items.length > 0 ? items.reduce((sum, it) => sum + (it.effPct || 0), 0) / items.length : 0;
          return { sid, totalPts, avgPct };
        }).sort((a, b) => {
          if (b.totalPts !== a.totalPts) return b.totalPts - a.totalPts;
          return b.avgPct - a.avgPct;
        });

        const myData = ranked.find(r => r.sid === targetStudentId);
        if (!myData) return;

        // Points-centric dense ranking
        const higherCount = ranked.filter(r => r.totalPts > myData.totalPts).length;
        const myRank = higherCount + 1;
        const total = ranked.length;

        const medal = myRank === 1 ? '🥇 ' : myRank === 2 ? '🥈 ' : myRank === 3 ? '🥉 ' : '';
        el.innerHTML = `${medal}Batch #${myRank}<span style="font-size:0.7rem;color:#94a3b8;">/${total}</span>`;
        el.classList.remove('hidden');
      } catch (err) {
        console.warn('Rank calculation failed:', err);
      }
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

      const targetStudentId = attempt.student_id || session.student_id;
      if (!targetStudentId || session.is_admin) return;

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

        const published = (allAssms || []).filter(a => {
          if (a.deleted_at) return false;
          const status = (a.status || '').toUpperCase();
          if (status !== 'PUBLISHED' && status !== 'ACTIVE') return false;
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

        const nextName = nextAsm.shell_code || nextAsm.title || 'Next Assessment';

        if (!isTest) {
          container.innerHTML = `
            <button class="btn-next-milestone" id="btn-next-milestone" type="button">
              <span class="next-btn-tag">🚀 Up Next Milestone</span>
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
                <span class="next-btn-tag">🟢 Test Session Unlocked</span>
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

        document.getElementById('result-loading').classList.add('hidden');
        document.getElementById('result-content').classList.remove('hidden');

        const rawPct = parseFloat(attempt.percentage || 0);
        const isRemedial = Boolean(attempt.is_remedial_unlocked);
        const pct = isRemedial ? Math.min(rawPct, 60.0) : parseFloat(attempt.effective_score ?? rawPct);
        const grade = isRemedial && rawPct > 60 ? 'B' : (attempt.grade || getGrade(pct));
        const theme = (typeof getGradeTheme === 'function' ? getGradeTheme(grade) : null) || GRADE_PALETTE[grade] || GRADE_PALETTE.F;
        const isGradeS = (grade === 'S' || grade === 'STAR');

        // FEATURE 1: Launch grade-specific background particles
        launchBgParticles(grade);

        // Dynamic Tier Atmosphere on Result Hero
        const heroSection = document.getElementById('result-hero-section') || document.querySelector('.result-hero');
        if (heroSection) {
          heroSection.className = `result-hero tier-${grade}`;
        }

        // Fetch user photo + FEATURE 3: student name label
        let studentFullName = session.student_name || 'Student';
        const targetStudentId = attempt.student_id || session.student_id;
        try {
          const supabase = await getSupabase();
          if (targetStudentId) {
            const { data: st } = await supabase.from('students').select('name, photo_url, batch_id').eq('id', targetStudentId).single();
            if (st) {
              studentFullName = st.name || studentFullName;
              // FEATURE 5: Rank in batch (async, non-blocking)
              if (st.batch_id) {
                renderRankInBatch(targetStudentId, st.batch_id);
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
            } else {
              const cleanStudentName = (st?.name || session.student_name || 'Student').replace(/^(mr\.?|miss\.?|mrs\.?|ms\.?)\s+/i, '').trim();
              document.getElementById('result-avatar-initial').textContent = cleanStudentName.charAt(0).toUpperCase() || 'S';
            }
          }
        } catch (err) {
          console.warn('Could not load student photo:', err);
        }

        // Render student name below avatar
        const nameLabel = document.getElementById('result-student-name-label');
        if (nameLabel && studentFullName) {
          nameLabel.textContent = studentFullName;
        }

        // FEATURE 4: Grade-specific motivational message (Suppressed per user request — no additional comment text)
        const motEl = document.getElementById('result-motivation-msg');
        if (motEl) {
          motEl.textContent = '';
          motEl.style.display = 'none';
        }

        // Avatar container tier styling & Grade S sparkling gold aura
        const avatarContainer = document.getElementById('result-avatar-container');
        if (avatarContainer) {
          if (grade === 'S') {
            avatarContainer.style.borderColor = '#fbbf24';
            avatarContainer.style.boxShadow = '0 0 25px rgba(245, 158, 11, 0.75), 0 0 10px rgba(251, 191, 36, 0.8), 0 8px 24px rgba(0,0,0,0.5)';
            avatarContainer.style.animation = 'gold-badge-sparkle 2.2s infinite ease-in-out';
          } else {
            const bCol = theme.color || theme.hex || gradeColors[grade] || 'rgba(255,255,255,0.2)';
            avatarContainer.style.borderColor = bCol;
            avatarContainer.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)';
            avatarContainer.style.animation = 'none';
          }
        }

        // Modern Gold Star Accent (★ Vector Badge for S / Star 100%, Letter for A-E)
        const gradeBadge = document.getElementById('result-grade-badge');
        if (gradeBadge) {
          if (grade === 'S') {
            gradeBadge.innerHTML = `
              <svg class="star-accent-vector" width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="starGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#FDE047" />
                    <stop offset="100%" stop-color="#EAB308" />
                  </linearGradient>
                </defs>
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="url(#starGoldGrad)" />
              </svg>
            `;
          } else {
            gradeBadge.textContent = grade;
          }
        }

        const gradeStamp = document.getElementById('result-grade-stamp');
        if (gradeStamp) {
          gradeStamp.className = `result-grade-stamp pure-stamp grade-${grade}`;
        }

        // Percentage (animated count up) under photo
        const pctEl = document.getElementById('result-percentage');
        pctEl.className = `result-percentage text-grade-${grade}`;

        // Hide stamp initially; slam it down when calculation reaches final score!
        if (gradeStamp) {
          gradeStamp.classList.remove('stamped');
        }

        // FEATURE 2: Start SVG score ring animation simultaneously
        animateScoreRing(pct, grade);

        animateCount(pctEl, pct, () => {
          if (gradeStamp) {
            gradeStamp.classList.add('stamped');
          }
          if (isGradeS) {
            launchConfetti();
          }
        });

        // Sleek Typography: Score Numbers (100.0%)
        // font-feature-settings: 'tnum' on, 'lnum' on; letter-spacing: -0.03em; font-weight: 800; color: #F8FAFC; text-shadow: 0 0 24px rgba(250, 204, 21, 0.35);
        pctEl.style.cssText = `font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif !important;font-feature-settings:'tnum' on, 'lnum' on !important;letter-spacing:-0.03em !important;font-weight:800 !important;color:#F8FAFC !important;-webkit-text-fill-color:#F8FAFC !important;background:none !important;text-shadow:0 0 24px rgba(250, 204, 21, 0.35) !important;`;

        // V1: title from assessments or legacy Assessments join
        const asmData  = attempt.assessments || attempt.Assessments;
        const asmTitle = asmData?.title || asmData?.name || 'Assessment';
        document.getElementById('result-Assessment-name').textContent = asmTitle;

        // V1: Best score badge
        const assessmentId = attempt.assessment_id || attempt.Assessment_id;
        const isBest = attempt.is_best_score === true || pct >= 100;

        // Inject best-score indicator near the grade badge if we have it
        const scoreBadgeEl = document.getElementById('result-best-score-badge');
        if (scoreBadgeEl) {
          if (isRemedial) {
            scoreBadgeEl.innerHTML = `<span class="result-badge-subtle" style="background:rgba(245,158,11,0.15); border:1px solid rgba(245,158,11,0.4); color:#fbbf24; font-weight:700;">🟡 Remedial Attempt (KKM Capped at 60%)</span>`;
          } else if (isBest) {
            scoreBadgeEl.innerHTML = `<span class="result-badge-best">★ Best Score</span>`;
          } else {
            scoreBadgeEl.innerHTML = `<span class="result-badge-subtle">Completed Attempt</span>`;
          }
        }

        // Stats & Points (Linear / Apple Pill Row with Muted 0-Values)
        const correct = answers.filter(a => getEvalCategory(a) === 'correct').length;
        const partial = answers.filter(a => getEvalCategory(a) === 'minor_spelling_error').length;
        const wrong   = answers.filter(a => getEvalCategory(a) === 'incorrect').length;
        
        const totalPoints = answers.reduce((sum, a) => sum + Number(a.score ?? 0), 0);
        const formattedPoints = (totalPoints % 1 !== 0) ? totalPoints.toFixed(1) : totalPoints;
        
        const resPointsEl = document.getElementById('res-points');
        if (resPointsEl) {
          resPointsEl.textContent = `${formattedPoints} PTS`;
          resPointsEl.style.color = '#F8FAFC';
        }

        const correctEl = document.getElementById('res-correct');
        if (correctEl) {
          correctEl.textContent = correct;
          correctEl.style.color = '#34D399';
        }

        const partialEl = document.getElementById('res-partial');
        if (partialEl) {
          partialEl.textContent = partial;
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
          wrongEl.textContent = wrong;
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
          crumbEl.textContent = `${className.toUpperCase()} • ${levelName.toUpperCase()} • ${asmCategory}`;
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
        const totalQ = answers.length || 1;
        const pctCorrect = ((correct / totalQ) * 100).toFixed(1);
        const pctPartial = ((partial / totalQ) * 100).toFixed(1);
        const pctWrong   = ((wrong / totalQ) * 100).toFixed(1);

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

            // Calibrate best score pill dynamically based on historical best
            if (scoreBadgeEl && thisAssessmentAttempts.length > 0) {
              const maxPct = Math.max(...thisAssessmentAttempts.map(x => parseFloat(x.percentage || 0)));
              if (pct >= maxPct || pct >= 100) {
                scoreBadgeEl.innerHTML = `<span class="result-badge-best">★ Best Score</span>`;
              } else {
                scoreBadgeEl.innerHTML = `<span class="result-badge-subtle">Best: ${maxPct.toFixed(1)}%</span>`;
              }
            }

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

        if (!isPublished) {
          tryAgainBtn.outerHTML = `
            <div class="security-policy-card" style="color:#f87171 !important;">
              <span>🔒</span> Retakes currently unavailable for this assessment.
            </div>
          `;
        } else if (
          (asmData?.assessment_type || '').toUpperCase() === 'EXAM' ||
          (asmData?.assessment_type || '').toUpperCase() === 'TEST' ||
          (asmData?.assessment_category || '').toUpperCase() === 'TEST' ||
          (asmData?.title || '').toUpperCase().includes('TEST')
        ) {
          tryAgainBtn.outerHTML = `
            <div class="security-policy-card">
              <span>🔒</span> Official Test attempt locked & final upon submission.
            </div>
          `;
        } else {
          tryAgainBtn.onclick = async () => {
            try {
              showLoading('Starting new attempt...');
              const eid = assessmentId;
              if (!eid) throw new Error('No assessment ID found.');
              sessionStorage.setItem('topscore_assessment_id', eid);
              sessionStorage.removeItem('topscore_attempt_id');
              window.location.href = 'assessment.html';
            } catch(e) {
              hideLoading();
              showToast(e.message, 'error');
            }
          };
        }

        // ─── ADMIN REMEDIAL CONTROL CARD (Gambar 3) ───
        const isAdmin = Boolean(getAdminSession()) || session?.is_admin === true || urlParams.get('admin') === '1' || urlParams.get('is_admin') === 'true';
        let adminContainer = document.getElementById('admin-remedial-control-container');
        if (!adminContainer) {
          adminContainer = document.createElement('div');
          adminContainer.id = 'admin-remedial-control-container';
          const buttonsWrap = document.querySelector('.result-action-buttons-wrap');
          if (buttonsWrap) {
            buttonsWrap.parentNode.insertBefore(adminContainer, buttonsWrap);
          }
        }

        if (isAdmin && adminContainer) {
          adminContainer.innerHTML = `
            <div style="margin: 14px auto 6px auto; max-width: 380px; width: 100%; padding: 14px 18px; border-radius: 12px; background: rgba(15, 23, 42, 0.85); border: 1.5px solid ${isRemedial ? '#f59e0b' : 'rgba(99, 102, 241, 0.4)'}; box-shadow: 0 8px 24px rgba(0,0,0,0.5); text-align: center;">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px;">
                <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; color: #94a3b8; font-weight: 700; display:flex; align-items:center; gap:5px;">
                  <span>🛡️</span> Admin Grade Control
                </div>
                <span class="badge" style="font-size: 0.72rem; font-weight: 700; padding: 2px 8px; border-radius: 6px; ${isRemedial ? 'background:rgba(245,158,11,0.2); color:#fbbf24; border:1px solid #f59e0b;' : 'background:rgba(52,211,153,0.15); color:#34d399; border:1px solid #10b981;'}">
                  ${isRemedial ? '🟡 REMEDIAL (KKM 60%)' : '🟢 NORMAL (NILAI PENUH)'}
                </span>
              </div>
              <div style="font-size: 0.82rem; color: #cbd5e1; margin-bottom: 12px; line-height: 1.4;">
                ${isRemedial 
                  ? 'Nilai ini dibatasi maksimal <strong>60.0% (Grade B)</strong> sesuai batas KKM Remidi.' 
                  : 'Nilai ujian ini saat ini berstatus <strong>Normal</strong> (perolehan murni ' + rawPct.toFixed(1) + '%).'}
              </div>
              ${isRemedial ? `
                <button id="btn-toggle-remedial-admin" type="button" class="btn btn-secondary" style="width: 100%; font-weight: 700; background: rgba(245,158,11,0.15); border: 1px solid #f59e0b; color: #fbbf24; padding: 9px 16px; font-size: 0.85rem; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
                  ↩️ Batalkan Status Remidi (Kembalikan ke Normal)
                </button>
              ` : `
                <button id="btn-toggle-remedial-admin" type="button" class="btn btn-warning" style="width: 100%; font-weight: 800; background: #f59e0b; border: 1px solid #d97706; color: #000; padding: 9px 16px; font-size: 0.85rem; border-radius: 8px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 14px rgba(245,158,11,0.35);">
                  🏷️ Tandai Nilai Ini Sebagai Hasil Remidi (KKM 60%)
                </button>
              `}
            </div>
          `;

          const toggleBtn = adminContainer.querySelector('#btn-toggle-remedial-admin');
          if (toggleBtn) {
            toggleBtn.onclick = async () => {
              const targetRemedial = !isRemedial;
              const msg = targetRemedial
                ? 'Tandai nilai ini sebagai hasil REMEDIAL (otomatis dibatasi maksimal KKM 60% / Grade B)?'
                : 'Kembalikan nilai ini ke status NORMAL (menghapus batas KKM 60%)?';
              if (!confirm(msg)) return;
              try {
                showLoading('Menyimpan perubahan status...');
                await labelAttemptRemedial(attemptId, targetRemedial, 60);
                showToast(targetRemedial ? '🏷️ Berhasil dilabel sebagai Remidi (KKM 60%).' : '↩️ Status remidi berhasil dikembalikan ke Normal.', 'success');
                setTimeout(() => {
                  window.location.reload();
                }, 300);
              } catch(err) {
                console.error('Error toggling remedial:', err);
                showToast('Gagal mengubah status: ' + err.message, 'error');
              } finally {
                hideLoading();
              }
            };
          }

          const backBtn = document.getElementById('back-dashboard-btn');
          if (backBtn) {
            backBtn.textContent = '← Kembali ke Class Hub';
            backBtn.href = 'admin.html#class-hub';
          }
        }

      } catch(e) {
        showToast('Failed to load results: ' + e.message, 'error');
        document.getElementById('result-loading').innerHTML = `
          <div class="empty-state__icon">&#10060;</div>
          <h3>Could not load results</h3>
          <p class="text-muted">${escapeHtml(e.message)}</p>
          <a href="dashboard.html" class="btn btn-primary mt-4">Back to Dashboard</a>
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
      const duration = 1200;
      const startTime = performance.now();
      function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        start = ease * target;
        el.textContent = start.toFixed(1) + '%';
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          el.textContent = target.toFixed(1) + '%';
          if (typeof onComplete === 'function') onComplete();
        }
      }
      requestAnimationFrame(step);
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
