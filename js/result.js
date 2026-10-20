/**
 * TopsCore — Assessment Result Viewer Module
 * Extracted from result.html
 */

import { fetchAttemptResult, fetchAttemptAnswers, fetchAllStudentAttempts, startAssessment, submitAssessment, GRADE_PALETTE, getGradeColor, getScoreColor, getGradeTheme } from './api.js?v=5.3.2';
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

    const gradeColors = { S: '#fbbf24', A: '#10b981', B: '#0ea5e9', C: '#c7c18c', D: '#f97316', E: '#f43f5e', F: '#ef4444' };

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

        const pct = parseFloat(attempt.percentage || 0);
        const grade = attempt.grade || getGrade(pct);
        const theme = (typeof getGradeTheme === 'function' ? getGradeTheme(grade) : null) || GRADE_PALETTE[grade] || GRADE_PALETTE.F;

        // Dynamic Tier Atmosphere on Result Hero
        const heroSection = document.getElementById('result-hero-section') || document.querySelector('.result-hero');
        if (heroSection) {
          heroSection.className = `result-hero tier-${grade}`;
        }

        // Fetch user photo
        try {
          const supabase = await getSupabase();
          const targetStudentId = attempt.student_id || session.student_id;
          if (targetStudentId) {
            const { data: st } = await supabase.from('students').select('name, photo_url').eq('id', targetStudentId).single();
            if (st && st.photo_url) {
              const avatarImg = document.getElementById('result-avatar-img');
              const avatarInitial = document.getElementById('result-avatar-initial');
              avatarImg.src = st.photo_url;
              avatarImg.classList.remove('hidden');
              avatarInitial.classList.add('hidden');
            } else {
              const cleanStudentName = (st?.name || session.student_name || 'Student').replace(/^(mr\.?|miss\.?|mrs\.?|ms\.?)\s+/i, '').trim();
              document.getElementById('result-avatar-initial').textContent = cleanStudentName.charAt(0).toUpperCase() || 'S';
            }
          }
        } catch (err) {
          console.warn('Could not load student photo:', err);
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

        // Grade badge
        const gradeBadge = document.getElementById('result-grade-badge');
        gradeBadge.textContent = grade;
        gradeBadge.className = `result-grade-display grade-${grade}`;

        // Percentage (animated)
        const pctEl = document.getElementById('result-percentage');
        pctEl.className = `result-percentage text-grade-${grade}`;
        animateCount(pctEl, pct);

        // Grade S: glowing sparkling gold text effect! Other grades: crisp color, no glow
        if (grade === 'S') {
          pctEl.style.cssText = `background:linear-gradient(135deg, #fbbf24 0%, #fef08a 50%, #f59e0b 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;color:#fbbf24;filter:drop-shadow(0 0 20px rgba(251,191,36,0.9)) drop-shadow(0 0 35px rgba(245,158,11,0.6));animation:gold-text-gleam 2.5s infinite ease-in-out;`;
        } else {
          const gCol = theme.color || theme.hex || gradeColors[grade] || '#94a3b8';
          pctEl.style.cssText = `background:none;-webkit-text-fill-color:${gCol};color:${gCol};filter:none;text-shadow:none;`;
        }

        // V1: title from assessments or legacy Assessments join
        const asmData  = attempt.assessments || attempt.Assessments;
        const asmTitle = asmData?.title || asmData?.name || 'Assessment';
        document.getElementById('result-Assessment-name').textContent = asmTitle;

        // V1: Best score badge
        const assessmentId = attempt.assessment_id || attempt.Assessment_id;
        const isBest = attempt.is_best_score === true;

        // Inject best-score indicator near the grade badge if we have it
        const scoreBadgeEl = document.getElementById('result-best-score-badge');
        if (scoreBadgeEl) {
          if (isBest) {
            scoreBadgeEl.innerHTML = `<span style="display:inline-flex;align-items:center;gap:4px;font-size:0.78rem;font-weight:700;color:#10b981;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.3);border-radius:8px;padding:3px 10px;">⭐ Best Score</span>`;
          } else {
            scoreBadgeEl.innerHTML = `<span style="font-size:0.75rem;color:var(--clr-text-3);">Not your best score</span>`;
          }
        }

        // Stats & Points (Glow ONLY on Grade S)
        const correct = answers.filter(a => getEvalCategory(a) === 'correct').length;
        const partial = answers.filter(a => getEvalCategory(a) === 'minor_spelling_error').length;
        const wrong   = answers.filter(a => getEvalCategory(a) === 'incorrect').length;
        
        const totalPoints = answers.reduce((sum, a) => sum + Number(a.score ?? 0), 0);
        
        const resPointsEl = document.getElementById('res-points');
        const pointsBoxEl = document.getElementById('result-points-box');
        resPointsEl.textContent = totalPoints;
        if (grade === 'S') {
          resPointsEl.style.color = '#fbbf24';
          resPointsEl.style.textShadow = '0 0 14px rgba(251, 191, 36, 0.85)';
          if (pointsBoxEl) {
            pointsBoxEl.style.background = 'rgba(245, 158, 11, 0.15)';
            pointsBoxEl.style.borderColor = 'rgba(251, 191, 36, 0.5)';
            pointsBoxEl.style.boxShadow = '0 0 20px rgba(245, 158, 11, 0.35)';
          }
        } else {
          const tColor = theme.color || theme.hex || gradeColors[grade] || '#94a3b8';
          resPointsEl.style.color = tColor;
          resPointsEl.style.textShadow = 'none';
          if (pointsBoxEl) {
            pointsBoxEl.style.background = 'rgba(255, 255, 255, 0.05)';
            pointsBoxEl.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            pointsBoxEl.style.boxShadow = 'none';
          }
        }

        document.getElementById('res-correct').textContent = correct;
        document.getElementById('res-partial').textContent = partial;
        document.getElementById('res-wrong').textContent   = wrong;

        // AI Narrative Report Injection
        if (attempt.narrative_report) {

          const heroSection = document.querySelector('.result-hero');
          if (heroSection && !document.getElementById('ai-narrative-card')) {
            const narrativeHtml = `
              <div id="ai-narrative-card" class="glass-card p-5 mt-4 mb-5" style="max-width:680px; margin:0 auto; border-top:3px solid var(--clr-primary);">
                <h3 class="fw-700 text-sm mb-2" style="color:var(--clr-text-1);">✨ Teacher's Evaluation Notes</h3>
                <p class="text-muted" style="line-height:1.6; font-size:0.95rem;">${escapeHtml(attempt.narrative_report).replace(/\\n/g, '<br>')}</p>
              </div>
            `;
            heroSection.insertAdjacentHTML('afterend', narrativeHtml);
          }
        }

        // Render answer breakdown
        renderAnswers(answers);

        // V1: Attempt history (all attempts for this assessment)
        if (assessmentId) {
          try {
            const allAttempts = await fetchAllStudentAttempts(targetStudentId);
            const thisAssessmentAttempts = allAttempts
              .filter(a => (a.assessment_id || a.Assessment_id) === assessmentId && ['submitted','auto_submitted','SUBMITTED','AUTO_SUBMITTED'].includes(a.status))
              .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));

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
          const parent = tryAgainBtn.parentElement;
          tryAgainBtn.remove();
          parent.insertAdjacentHTML('beforeend', `
            <div class="security-policy-card" style="margin-top:1.5rem; background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.3); border-radius:8px; padding:1rem; color:#f87171; text-align:center;">
              <div style="font-weight:700; font-size:0.85rem; text-transform:uppercase; margin-bottom:0.4rem; display:flex; align-items:center; justify-content:center; gap:0.4rem;">
                <span>🔒</span> Retake Unavailable
              </div>
              <p style="font-size:0.8rem; margin:0; line-height:1.4; color:#cbd5e1;">
                This assessment is currently in Draft or has been closed by your tutor. Retakes are not permitted at this time.
              </p>
            </div>
          `);
        } else if (asmData?.assessment_type === 'EXAM') {
          const parent = tryAgainBtn.parentElement;
          tryAgainBtn.remove();
          parent.insertAdjacentHTML('beforeend', `
            <div class="security-policy-card" style="margin-top:1.5rem; background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.3); border-radius:8px; padding:1rem; color:#f59e0b;">
              <div style="font-weight:700; font-size:0.85rem; text-transform:uppercase; margin-bottom:0.4rem; display:flex; align-items:center; gap:0.4rem;">
                <span>🔒</span> Security Policy
              </div>
              <p style="font-size:0.8rem; margin:0; line-height:1.4;">
                Official Exam attempts are locked and final upon submission. If you experienced a technical issue or require a remedial attempt, please contact your tutor for authorization.
              </p>
            </div>
          `);
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
      // Create or find history container
      let histSection = document.getElementById('attempt-history-section');
      if (!histSection) {
        histSection = document.createElement('section');
        histSection.id = 'attempt-history-section';
        histSection.style.cssText = 'max-width:680px;margin:1.5rem auto 0;padding:0 1rem;';
        const answersSection = document.getElementById('answers-section');
        if (answersSection) {
          answersSection.parentNode.insertBefore(histSection, answersSection);
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
        const isGradeS = ag === 'S';
        const badgeStyle = isGradeS
          ? 'background:linear-gradient(135deg, #f59e0b, #fbbf24, #fef08a);color:#78350f;border:1px solid #fef08a;box-shadow:0 0 10px rgba(245,158,11,0.6);animation:gold-badge-sparkle 2.2s infinite ease-in-out;'
          : `background:${aTheme.hex}18;border:1.5px solid ${aTheme.border};color:${aTheme.hex};box-shadow:0 0 8px ${aTheme.glow};`;

        return `
          <tr style="${isThis ? 'background:rgba(56,189,248,0.07);' : ''}">
            <td style="padding:8px 12px;font-size:0.82rem;color:var(--clr-text-3);">${escapeHtml(dateStr)}</td>
            <td style="padding:8px 12px;font-weight:700;color:${aTheme.hex};${isGradeS ? 'text-shadow:0 0 8px rgba(251,191,36,0.6);' : ''}">${apct}%</td>
            <td style="padding:8px 12px;">
              <span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:7px;font-weight:800;font-size:0.78rem;${badgeStyle}">${ag}</span>
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

    function animateCount(el, target) {
      let start = 0;
      const duration = 1200;
      const startTime = performance.now();
      function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        start = ease * target;
        el.textContent = start.toFixed(1) + '%';
        if (progress < 1) requestAnimationFrame(step);
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

      const filterHtml = `
        <div class="d-flex flex-wrap gap-2 justify-center mb-5">
          <button class="ans-filter-btn active" data-filter="all">All (${answers.length})</button>
          <button class="ans-filter-btn" data-filter="incorrect">Incorrect (${wrongCount})</button>
          <button class="ans-filter-btn" data-filter="partial">Partial (${partialCount})</button>
          <button class="ans-filter-btn" data-filter="correct">Correct (${correctCount})</button>
        </div>
      `;
      container.insertAdjacentHTML('beforeend', filterHtml);

      const listContainer = document.createElement('div');
      listContainer.id = 'answers-list-items';
      container.appendChild(listContainer);

      let currentFilter = 'all';
      let currentPage = 1;
      const itemsPerPage = 50;

      function renderList() {
        let filtered = answers;
        if (currentFilter !== 'all') {
            filtered = answers.filter(a => {
                if (currentFilter === 'incorrect') return getEvalCategory(a) === 'incorrect';
                if (currentFilter === 'partial') return getEvalCategory(a) === 'minor_spelling_error';
                if (currentFilter === 'correct') return getEvalCategory(a) === 'correct';
                return true;
            });
        }

        const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
        if (currentPage > totalPages) currentPage = totalPages;
        
        const startIdx = (currentPage - 1) * itemsPerPage;
        const pageItems = filtered.slice(startIdx, startIdx + itemsPerPage);

        let currentSection = '';
        const listHtml = pageItems.map((a, idx) => {
            const sortedIdx = startIdx + idx;
            const snap = typeof a.question_snapshot === 'string'
            ? (() => { try { return JSON.parse(a.question_snapshot); } catch { return {}; } })()
            : (a.question_snapshot || {});
            
            const cat = getEvalCategory(a);
            const isCorrect = cat === 'correct';
            const isPartial = cat === 'minor_spelling_error';
            const isWrong   = cat === 'incorrect';

            const resultText  = isCorrect ? 'Correct' : isPartial ? 'Partial' : 'Incorrect';
            const typeStr = isCorrect ? 'correct' : isPartial ? 'partial' : 'incorrect';
            const colorHex = isCorrect ? '#10b981' : isPartial ? '#f59e0b' : '#ef4444';
            
            const qNum = a.question_index !== undefined ? a.question_index + 1 : answers.indexOf(a) + 1;

            let headerHtml = '';
            if (currentSection !== typeStr) {
               currentSection = typeStr;
               const title = isCorrect ? 'CORRECT' : isPartial ? 'PARTIAL' : 'INCORRECT';
               const count = isCorrect ? correctCount : isPartial ? partialCount : wrongCount;
               headerHtml = `
                <div class="answer-section-header" style="margin: 1.5rem 0 0.75rem; text-align: center; color: #94a3b8; font-size: 0.75rem; font-weight: 700; letter-spacing: 2px;">
                  ─── ${title} (${count}) ───
                </div>
               `;
            }

            return `
              ${headerHtml}
              <div class="answer-row-compact" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-left:4px solid ${colorHex}; border-radius:8px; padding:10px 14px; margin-bottom:8px; display:flex; flex-direction:column; gap:4px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <div style="font-size:0.85rem; font-weight:700; color:#f8fafc; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                    Q${qNum}. ${escapeHtml(snap.question_text || snap.question || 'Question')}
                  </div>
                  <div style="font-size:0.75rem; font-weight:600; color:${colorHex}; background:rgba(255,255,255,0.05); padding:2px 8px; border-radius:4px; margin-left:10px; white-space:nowrap;">
                    ${resultText} ${a.score ?? 0}pt
                  </div>
                </div>
                <div style="font-size:0.8rem; color:#cbd5e1; display:flex; gap:10px;">
                  <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width: 45%;">Your: <strong style="color:#fff;">${escapeHtml(a.student_answer || '—')}</strong></span>
                  <span style="color:#64748b; flex-shrink:0;">•</span>
                  <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1;">Correct: <strong style="color:#10b981;">${escapeHtml(String(a.correct_answer_snapshot || ''))}</strong></span>
                </div>
              </div>
            `;
        }).join('');

        let paginationHtml = '';
        if (totalPages > 1) {
            paginationHtml = `
              <div class="d-flex align-center justify-center gap-3 mt-5 mb-4">
                <button class="btn btn-secondary btn-sm ${currentPage === 1 ? 'opacity-50' : ''}" style="border:1px solid rgba(255,255,255,0.1);" onclick="window.changePage(-1)" ${currentPage === 1 ? 'disabled' : ''}>&larr; Prev</button>
                <span style="font-size:0.85rem; font-weight: 600; color:#94a3b8;">Page ${currentPage} of ${totalPages}</span>
                <button class="btn btn-secondary btn-sm ${currentPage === totalPages ? 'opacity-50' : ''}" style="border:1px solid rgba(255,255,255,0.1);" onclick="window.changePage(1)" ${currentPage === totalPages ? 'disabled' : ''}>Next &rarr;</button>
              </div>
            `;
        }

        listContainer.innerHTML = listHtml + paginationHtml;
      }

      window.changePage = (dir) => {
        currentPage += dir;
        renderList();
        // scroll to top of list
        document.getElementById('answers-section').scrollIntoView({ behavior: 'smooth' });
      };

      renderList();

      // Filter Logic
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
    }



    document.getElementById('toggle-answers-btn').addEventListener('click', () => {
      const section = document.getElementById('answers-section');
      const isHidden = section.classList.toggle('hidden');
      document.getElementById('toggle-answers-btn').textContent =
        isHidden ? 'View Answer Breakdown' : 'Hide Breakdown';
    });

    document.getElementById('print-result-btn')?.addEventListener('click', () => {
      // Ensure answer breakdown is visible when printing
      document.getElementById('answers-section')?.classList.remove('hidden');
      window.print();
    });

    loadResult();
