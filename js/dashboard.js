/**
 * TopsCore — Student Dashboard Module
 * Extracted from dashboard.html
 */

import { fetchStudentClasses, fetchStudentProgress, fetchTestsForStudentClass, fetchStudentAttemptsForTest, fetchAllStudentAttempts, fetchAttemptAnswers, updateStudentPin, uploadStudentPhoto, updateStudentGender, updateStudentBirthday, updateStudentEducation, formatStudentName, cleanStudentName, fetchAssignments, fetchTests, toOrdinalLevel, fetchBatches, fetchStudentLevel, fetchActiveTestSession, fetchClassTestSettings } from './api.js?v=20261106_v160';
    import { requireStudentSession, clearStudentSession, updateStudentSessionGender, setStudentSession } from './session.js?v=20261106_v160';
    import { showToast, showLoading, hideLoading, getGrade, withTimeout, escapeHtml, escHtml } from './app.js?v=20261106_v160';
    import { testMicrophoneCapability } from './speech.js?v=20261106_v160';
    import { processAndCompressAvatar } from './utils/avatar-engine.js?v=20261106_v160';
    import { TOPSCORE_COLORS, GRADE_PALETTE, getGradeSymbol, getGradeColor, getScoreColor, getGradeColorByScore, getAchievementStatus, getTaskProgressVisual, isExam, isWeeklyExam, calculateGrade, computeMilestoneExamMastery, computeUnifiedScore, computeTopicPassLevel } from './grading.js?v=20261106_v160';

    window._isBatchChampion = false;

    function parseHexRgb(hex) {
      if (!hex) return '56, 189, 248';
      let clean = String(hex).replace('#', '').trim();
      if (clean.length === 8) clean = clean.slice(0, 6);
      if (clean.length === 3) clean = clean.split('').map(c => c + c).join('');
      if (clean.length !== 6) return '56, 189, 248';
      const num = parseInt(clean, 16);
      return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
    }


    // escapeHtml imported from app.js
    const session = requireStudentSession();
    if (!session) throw new Error('Not authenticated');

    // Populate header & Welcome Banner
    let initFormattedName = (session.student_name || 'Student').trim();
    const initGender = (session.gender || '').toLowerCase();
    const nameParts = initFormattedName.split(/\s+/);
    const firstWord = (nameParts[0] || '').toLowerCase();
    if (!['mr.', 'mr', 'miss', 'ms.', 'ms', 'mrs.', 'mrs', 'king', 'queen'].includes(firstWord)) {
      if (initGender === 'male') initFormattedName = `Mr. ${initFormattedName}`;
      else if (initGender === 'female') initFormattedName = `Miss ${initFormattedName}`;
    }
    const headerStudentNameEl = document.getElementById('header-student-name');
    if (headerStudentNameEl) headerStudentNameEl.textContent = initFormattedName;
    const welcomeNameEl = document.getElementById('welcome-name');
    if (welcomeNameEl) welcomeNameEl.textContent = initFormattedName;
    const elInst = document.getElementById('meta-inst');
  const elProg = document.getElementById('meta-prog');
  const elBatch = document.getElementById('meta-batch');
  const elLvl = document.getElementById('meta-lvl');
  if (elInst) elInst.textContent = session.institution_name || session.institution?.name || 'TOP';

  // Title case for program
  const prgName = session.program_name ? session.program_name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : 'Evnikom';
  if (elProg) elProg.textContent = prgName.toUpperCase();

  if (elBatch) {
    const rawB = session.batch_name || '';
    elBatch.textContent = rawB.replace(/^batch\s*/i, '') || rawB || '—';
  }
  if (elLvl) elLvl.textContent = session.level_name ? (session.level_name.toLowerCase().includes('level') ? session.level_name : session.level_name + ' Level') : '1st Level';

  // Suppress old welcome-meta logic
  const welcomeMetaEl = document.getElementById('welcome-meta');
  if(welcomeMetaEl) welcomeMetaEl.innerHTML = '';



    function clearPhotoEverywhere() {
      try {
        localStorage.removeItem(`stu_photo_${session.student_id}`);
      } catch (_) {}

      const targets = [
        { img: 'banner-avatar-img', init: 'banner-avatar-initial' },
        { img: 'header-avatar-img', init: 'header-avatar-initial' },
        { img: 'prof-photo-img', init: 'avatar-icon' }
      ];
      targets.forEach(({ img, init }) => {
        const imgEl = document.getElementById(img);
        const initEl = document.getElementById(init);
        if (imgEl) {
          imgEl.src = '';
          imgEl.removeAttribute('src');
          imgEl.classList.add('hidden');
        }
        if (initEl) {
          initEl.classList.remove('hidden');
        }
      });
    }

    function applyPhotoEverywhere(url) {
      if (!url) {
        clearPhotoEverywhere();
        return;
      }

      // Synchronize in localStorage so page refresh never reads stale old photo
      try {
        localStorage.setItem(`stu_photo_${session.student_id}`, url);
      } catch (_) {}

      const targets = [
        { img: 'banner-avatar-img', init: 'banner-avatar-initial' },
        { img: 'header-avatar-img', init: 'header-avatar-initial' },
        { img: 'prof-photo-img', init: 'avatar-icon' }
      ];
      targets.forEach(({ img, init }) => {
        const imgEl = document.getElementById(img);
        const initEl = document.getElementById(init);
        if (imgEl) {
          imgEl.src = url;
          imgEl.classList.remove('hidden');
        }
        if (initEl) {
          initEl.classList.add('hidden');
        }
      });
    }

    function applyStudentGenderUI(g) {
      const nameStr = (session.student_name || session.name || session.full_name || '').trim();
      let parts = nameStr.split(/\s+/).filter(Boolean);

      const firstLower = (parts[0] || '').toLowerCase();
      if (['mr.', 'mr', 'miss', 'ms.', 'ms', 'mrs.', 'mrs', 'king', 'queen'].includes(firstLower)) {
         parts.shift();
      }

      const cleanFullName = parts.join(' ').trim() || nameStr;
      let formattedName = cleanFullName;

      const isLeader = Boolean(window._isBatchChampion);
      if (isLeader) {
        if (g === 'male') {
          formattedName = `King ${cleanFullName}`;
        } else if (g === 'female') {
          formattedName = `Queen ${cleanFullName}`;
        } else {
          formattedName = `👑 ${cleanFullName}`;
        }
      } else {
        if (g === 'male') {
          formattedName = `Mr. ${cleanFullName}`;
        } else if (g === 'female') {
          formattedName = `Miss ${cleanFullName}`;
        }
      }

      const isAlumni = session.level_number === 0 || (session.level_name || '').toLowerCase() === 'alumni';
      const crownEl = document.getElementById('banner-avatar-crown');
      if (crownEl) {
        if (isAlumni) {
          crownEl.textContent = '🎓';
          crownEl.title = 'Alumni Graduate';
          crownEl.classList.remove('hidden');
        } else {
          crownEl.textContent = '👑';
          crownEl.title = 'Batch Champion';
          crownEl.classList.toggle('hidden', !isLeader);
        }
      }

      const hdrNameEl = document.getElementById('header-student-name');
      if (hdrNameEl) hdrNameEl.textContent = formattedName;
      const welcNameEl = document.getElementById('welcome-name');
      if (welcNameEl) welcNameEl.textContent = formattedName;
      const profName = document.getElementById('prof-student-name');
      if (profName) profName.textContent = formattedName;

      session.gender = g;
      session.student_name = formattedName;
      setStudentSession(session);

      // Update initials
      const initChar = cleanFullName ? cleanFullName.charAt(0).toUpperCase() : 'S';
      const bInit = document.getElementById('banner-avatar-initial');
      const hInit = document.getElementById('header-avatar-initial');
      if (bInit) bInit.textContent = initChar;
      if (hInit) hInit.textContent = initChar;

      const badge = document.getElementById('prof-gender-badge');
      if (badge) {
        if (g === 'male') {
          badge.className = 'badge badge-primary';
          badge.textContent = isLeader ? '👑 King (Male)' : '👨 Male (Mr.)';
        } else if (g === 'female') {
          badge.className = 'badge badge-accent';
          badge.textContent = isLeader ? '👑 Queen (Female)' : '👩 Female (Miss)';
        } else {
          badge.className = 'badge badge-neutral';
          badge.textContent = '⏳ Unassigned';
        }
      }

      const btnMale = document.getElementById('btn-prof-male');
      const btnFemale = document.getElementById('btn-prof-female');
      if (btnMale && btnFemale) {
        btnMale.classList.toggle('btn-primary', g === 'male');
        btnMale.classList.toggle('btn-secondary', g !== 'male');
        btnFemale.classList.toggle('btn-primary', g === 'female');
        btnFemale.classList.toggle('btn-secondary', g !== 'female');
      }
    }

    async function checkAndPromptGender() {
      let currentGender = session.gender;
      if (!currentGender) {
        try {
          const sb = await (await import('./supabase.js?v=20261106_v154')).getSupabase();
          const { data: st } = await sb.from('students').select('gender, name').eq('id', session.student_id).maybeSingle();
          if (st?.gender) {
            currentGender = st.gender;
          }
        } catch (err) {
          console.warn('Could not verify gender from DB:', err);
        }
      }

      if (currentGender) {
        applyStudentGenderUI(currentGender);
        return;
      }

      // Gender is unassigned — trigger First-Entry Gender Setup Modal
      hideLoading();
      const modal = document.getElementById('gender-setup-modal');
      const optMale = document.getElementById('opt-gender-male');
      const optFemale = document.getElementById('opt-gender-female');
      const confirmBtn = document.getElementById('btn-confirm-gender');
      let selectedGender = null;

      modal.classList.remove('hidden');

      return new Promise((resolve) => {
        let isResolved = false;
        const doResolve = () => {
          if (!isResolved) {
            isResolved = true;
            modal.classList.add('hidden');
            resolve();
          }
        };

        // Hard Gate: No skip allowed. Gender/Honorific is mandatory.
        optMale.onclick = () => {
          selectedGender = 'male';
          optMale.style.borderColor = 'var(--clr-primary)';
          optMale.style.background = 'rgba(99, 102, 241, 0.15)';
          optMale.style.boxShadow = '0 0 0 2px var(--clr-primary)';
          optFemale.style.borderColor = 'var(--clr-border)';
          optFemale.style.background = 'rgba(255, 255, 255, 0.03)';
          optFemale.style.boxShadow = 'none';
          confirmBtn.disabled = false;
          confirmBtn.textContent = 'Confirm as Male (Mr.) ✓';
        };

        optFemale.onclick = () => {
          selectedGender = 'female';
          optFemale.style.borderColor = 'var(--clr-accent-1)';
          optFemale.style.background = 'rgba(236, 72, 153, 0.15)';
          optFemale.style.boxShadow = '0 0 0 2px var(--clr-accent-1)';
          optMale.style.borderColor = 'var(--clr-border)';
          optMale.style.background = 'rgba(255, 255, 255, 0.03)';
          optMale.style.boxShadow = 'none';
          confirmBtn.disabled = false;
          confirmBtn.textContent = 'Confirm as Female (Miss) ✓';
        };

        confirmBtn.onclick = async () => {
          if (!selectedGender) return;
          confirmBtn.disabled = true;
          confirmBtn.textContent = 'Saving…';
          try {
            await updateStudentGender(session.student_id, selectedGender);
            applyStudentGenderUI(selectedGender);
            showToast(`Welcome, ${session.student_name}! Your title has been personalized.`, 'success');
          } catch (err) {
            console.warn('Failed to save gender:', err);
            showToast('Continuing to dashboard: ' + err.message, 'warning');
          } finally {
            doResolve();
          }
        };
      });
    }

    // ── First-Entry Photo & Microphone Onboarding (Phase 12) ──
    let webcamStream = null;
    let onboardPhotoData = null;

    async function startOnboardWebcam() {
      const video = document.getElementById('webcam-stream');
      const overlay = document.getElementById('camera-loading-overlay');
      const confirmBtn = document.getElementById('btn-confirm-photo-setup');
      if (!video) return;

      if (overlay) overlay.classList.remove('hidden');
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          webcamStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 480 }, height: { ideal: 480 }, facingMode: 'user' }
          });
          video.setAttribute('playsinline', '');
          video.playsInline = true;
          video.srcObject = webcamStream;
          video.classList.remove('hidden');
          if (overlay) overlay.classList.add('hidden');
          if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = '✓ Save Photo & Enter Dashboard';
          }
        } else {
          throw new Error('Webcam not supported.');
        }
      } catch (err) {
        console.warn('Webcam initialization notice:', err.message);
        if (overlay) {
          overlay.innerHTML = `<span style="text-align:center;padding:10px;">📷 Camera preview unavailable.<br><span class="text-xs text-muted">Please use "Upload Image File" below or click Skip.</span></span>`;
        }
        if (confirmBtn) {
          confirmBtn.disabled = false;
          confirmBtn.textContent = 'Continue to Dashboard ←’';
        }
      }
    }

    function stopOnboardWebcam() {
      if (webcamStream) {
        try {
          webcamStream.getTracks().forEach(t => t.stop());
        } catch {}
        webcamStream = null;
      }
    }

    function updateHeaderMicStatus(res) {
      const headerMic = document.getElementById('header-mic-status') || document.querySelector('.header-mic-badge');
      if (!headerMic) return;
      headerMic.textContent = res?.ok ? '🎤 Ready' : '🎤 Check';
      headerMic.className = res?.ok ? 'header-mic-badge active' : 'header-mic-badge warning';
    }

    async function checkMicrophoneOnEntry() {
      const titleEl = document.getElementById('mic-status-title');
      const descEl = document.getElementById('mic-status-desc');
      const iconEl = document.getElementById('mic-status-icon');
      const cardEl = document.getElementById('mic-status-card');

      try {
        const res = await testMicrophoneCapability();
        updateHeaderMicStatus(res);
        if (res.ok) {
          if (titleEl) titleEl.textContent = 'Microphone Ready (Active)';
          if (descEl) descEl.textContent = 'Device tested and verified for speaking tests.';
          if (iconEl) iconEl.textContent = '✅';
          if (cardEl) {
            cardEl.style.borderColor = 'rgba(16, 185, 129, 0.4)';
            cardEl.style.background = 'rgba(16, 185, 129, 0.08)';
          }
        } else {
          if (titleEl) titleEl.textContent = res.state === 'permission_denied' ? 'Microphone Permission Needed' : 'Microphone Check';
          if (descEl) descEl.textContent = res.message;
          if (iconEl) iconEl.textContent = '⚠️ ';
          if (cardEl) {
            cardEl.style.borderColor = 'rgba(245, 158, 11, 0.4)';
            cardEl.style.background = 'rgba(245, 158, 11, 0.08)';
          }
        }
        return res;
      } catch (err) {
        console.warn('Microphone entry test error:', err);
      }
    }

    document.getElementById('btn-retry-mic')?.addEventListener('click', checkMicrophoneOnEntry);

    // Snapshot button
    document.getElementById('btn-snap-photo')?.addEventListener('click', () => {
      const video = document.getElementById('webcam-stream');
      const canvas = document.getElementById('webcam-canvas');
      const img = document.getElementById('webcam-snapshot');
      if (!video || !canvas || !img) return;

      canvas.width = 240;
      canvas.height = 320;
      const ctx = canvas.getContext('2d');
      // Mirror to match user perspective
      ctx.translate(240, 0);
      ctx.scale(-1, 1);

      // Center-crop webcam video stream to 3:4 aspect ratio
      const vw = video.videoWidth || 320;
      const vh = video.videoHeight || 320;
      const vRatio = vw / vh;
      const tRatio = 240 / 320;
      let sx = 0, sy = 0, sw = vw, sh = vh;
      if (vRatio > tRatio) {
        sw = vh * tRatio;
        sx = (vw - sw) / 2;
      } else {
        sh = vw / tRatio;
        sy = (vh - sh) * 0.35;
      }
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, 240, 320);

      let dataUrl = canvas.toDataURL('image/webp', 0.75);
      if (!dataUrl.startsWith('data:image/webp')) {
        dataUrl = canvas.toDataURL('image/jpeg', 0.75);
      }
      onboardPhotoData = dataUrl;
      img.src = onboardPhotoData;
      img.classList.remove('hidden');
      video.classList.add('hidden');

      document.getElementById('btn-snap-photo').classList.add('hidden');
      document.getElementById('btn-retake-photo').classList.remove('hidden');
      document.getElementById('btn-confirm-photo-setup').disabled = false;
      stopOnboardWebcam();
    });

    // Retake button
    document.getElementById('btn-retake-photo')?.addEventListener('click', async () => {
      onboardPhotoData = null;
      const img = document.getElementById('webcam-snapshot');
      if (img) {
        img.src = '';
        img.removeAttribute('src');
        img.classList.add('hidden');
      }
      document.getElementById('btn-retake-photo').classList.add('hidden');
      document.getElementById('btn-snap-photo').classList.remove('hidden');
      document.getElementById('btn-confirm-photo-setup').disabled = true;
      await startOnboardWebcam();
    });

    // File upload fallback
    document.getElementById('onboard-photo-file')?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) {
        showToast('Image file is too large (max 10MB).', 'warning');
        return;
      }
      // Hapus snapshot lama seketika agar tidak terlihat sekilas
      const img = document.getElementById('webcam-snapshot');
      if (img) {
        img.src = '';
        img.removeAttribute('src');
        img.classList.add('hidden');
      }
      onboardPhotoData = null;
      document.getElementById('btn-confirm-photo-setup').disabled = true;

      try {
        const compressedDataUrl = await processAndCompressAvatar(file, 'student');
        onboardPhotoData = compressedDataUrl;
        if (img) {
          img.src = onboardPhotoData;
          img.classList.remove('hidden');
        }
        document.getElementById('webcam-stream').classList.add('hidden');
        const overlay = document.getElementById('camera-loading-overlay');
        if (overlay) overlay.classList.add('hidden');
        document.getElementById('btn-snap-photo').classList.add('hidden');
        document.getElementById('btn-retake-photo').classList.remove('hidden');
        document.getElementById('btn-confirm-photo-setup').disabled = false;
        stopOnboardWebcam();
      } catch (compErr) {
        console.error('Photo compression error:', compErr);
        showToast('Failed to process photo. Please choose a valid image file.', 'error');
      } finally {
        e.target.value = '';
      }
    });

    // Save and enter dashboard
    document.getElementById('btn-confirm-photo-setup')?.addEventListener('click', async () => {
      const btn = document.getElementById('btn-confirm-photo-setup');
      btn.disabled = true;
      btn.textContent = 'Entering dashboard…';

      try {
        // If student did not manually click "Capture Photo", auto-capture from active webcam stream!
        if (!onboardPhotoData) {
          const video = document.getElementById('webcam-stream');
          const canvas = document.getElementById('webcam-canvas');
          if (video && canvas && webcamStream) {
            try {
              canvas.width = 240;
              canvas.height = 320;
              const ctx = canvas.getContext('2d');
              ctx.translate(240, 0);
              ctx.scale(-1, 1);
              const vw = video.videoWidth || 320;
              const vh = video.videoHeight || 320;
              const vRatio = vw / vh;
              const tRatio = 240 / 320;
              let sx = 0, sy = 0, sw = vw, sh = vh;
              if (vRatio > tRatio) {
                sw = vh * tRatio;
                sx = (vw - sw) / 2;
              } else {
                sh = vw / tRatio;
                sy = (vh - sh) * 0.35;
              }
              ctx.drawImage(video, sx, sy, sw, sh, 0, 0, 240, 320);
              let dataUrl = canvas.toDataURL('image/webp', 0.75);
              if (!dataUrl.startsWith('data:image/webp')) {
                dataUrl = canvas.toDataURL('image/jpeg', 0.75);
              }
              onboardPhotoData = dataUrl;
            } catch (snapErr) {
              console.warn('Auto-snapshot capture failed:', snapErr);
            }
          }
        }

        if (onboardPhotoData) {
          btn.textContent = 'Saving photo…';
          let finalPhotoUrl = onboardPhotoData;
          try {
            // Option 1: Strictly compress to lightweight 3:4 WebP Base64 (<30KB)
            finalPhotoUrl = await processAndCompressAvatar(onboardPhotoData, 'student');
          } catch (compErr) {
            console.warn('Avatar compression notice:', compErr);
            finalPhotoUrl = onboardPhotoData;
          }

          try {
            await uploadStudentPhoto(session.student_id, finalPhotoUrl);
            applyPhotoEverywhere(finalPhotoUrl);
            showToast('Profile photo registered successfully! Welcome to your dashboard.', 'success');
          } catch (uploadErr) {
            console.warn('Photo upload warning:', uploadErr);
            applyPhotoEverywhere(finalPhotoUrl);
            showToast('Photo captured! Continuing to dashboard.', 'info');
          }
        }
      } catch (err) {
        console.warn('Photo setup flow error:', err);
      } finally {
        stopOnboardWebcam();
        onboardPhotoData = null;
        const fileInp = document.getElementById('onboard-photo-file');
        if (fileInp) fileInp.value = '';
        const img = document.getElementById('webcam-snapshot');
        if (img) {
          img.src = '';
          img.removeAttribute('src');
          img.classList.add('hidden');
        }
        document.getElementById('photo-setup-modal').classList.add('hidden');
      }
    });

    // Skip photo setup fallback
    document.getElementById('btn-skip-photo-setup')?.addEventListener('click', () => {
      stopOnboardWebcam();
      onboardPhotoData = null;
      const fileInp = document.getElementById('onboard-photo-file');
      if (fileInp) fileInp.value = '';
      const img = document.getElementById('webcam-snapshot');
      if (img) {
        img.src = '';
        img.removeAttribute('src');
        img.classList.add('hidden');
      }
      document.getElementById('photo-setup-modal').classList.add('hidden');
    });

    async function checkAndPromptPhoto() {
      let photoUrl = localStorage.getItem(`stu_photo_${session.student_id}`);
      if (!photoUrl) {
        try {
          const sb = await (await import('./supabase.js?v=20261106_v154')).getSupabase();
          const { data: st } = await sb.from('students').select('photo_url, photo_status').eq('id', session.student_id).maybeSingle();
          if (st && st.photo_url) {
            photoUrl = st.photo_url;
            localStorage.setItem(`stu_photo_${session.student_id}`, photoUrl);
          }
        } catch (err) {
          console.warn('Could not check photo status from DB:', err);
        }
      }

      if (photoUrl) {
        applyPhotoEverywhere(photoUrl);
        // Test mic upfront on entry so browser permission is established before Tests
        checkMicrophoneOnEntry();

        // Background sync: memastikan localStorage selalu sinkron dengan database terbaru
        (async () => {
          try {
            const sb = await (await import('./supabase.js?v=20261106_v154')).getSupabase();
            const { data: st } = await sb.from('students').select('photo_url').eq('id', session.student_id).maybeSingle();
            if (st && st.photo_url !== photoUrl) {
              if (st.photo_url) {
                applyPhotoEverywhere(st.photo_url);
              } else {
                clearPhotoEverywhere();
              }
            }
          } catch (_) {}
        })();
        return;
      }

      // No photo registered! Clean state and show Photo & Mic Setup Modal
      hideLoading();
      onboardPhotoData = null;
      const fileInp = document.getElementById('onboard-photo-file');
      if (fileInp) fileInp.value = '';
      const snapshotImg = document.getElementById('webcam-snapshot');
      if (snapshotImg) {
        snapshotImg.src = '';
        snapshotImg.removeAttribute('src');
        snapshotImg.classList.add('hidden');
      }
      const snapBtn = document.getElementById('btn-snap-photo');
      if (snapBtn) snapBtn.classList.remove('hidden');
      const retakeBtn = document.getElementById('btn-retake-photo');
      if (retakeBtn) retakeBtn.classList.add('hidden');
      const confirmBtn = document.getElementById('btn-confirm-photo-setup');
      if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = '✓ Save Photo & Enter Dashboard';
      }

      const modal = document.getElementById('photo-setup-modal');
      modal.classList.remove('hidden');
      await startOnboardWebcam();
      await checkMicrophoneOnEntry();

      return new Promise((resolve) => {
        const interval = setInterval(() => {
          if (modal.classList.contains('hidden')) {
            clearInterval(interval);
            resolve();
          }
        }, 300);
      });
    }

    async function checkAndPromptBirthday() {
      let hasBirthday = localStorage.getItem(`stu_bd_${session.student_id}`) === 'true';
      if (!hasBirthday) {
        try {
          const sb = await (await import('./supabase.js?v=20261106_v154')).getSupabase();
          const { data: st } = await sb.from('students').select('birth_date').eq('id', session.student_id).maybeSingle();
          if (st && st.birth_date) {
            hasBirthday = true;
            localStorage.setItem(`stu_bd_${session.student_id}`, 'true');
            const diff = Date.now() - new Date(st.birth_date).getTime();
            const age = Math.abs(new Date(diff).getUTCFullYear() - 1970);
            const ageEl = document.getElementById('welcome-age');
            if (ageEl) ageEl.textContent = `${age} y.o. • `;
          }
        } catch (err) {
          console.warn('Could not check birthday status from DB:', err);
        }
      }

      if (hasBirthday) return;

      hideLoading();
      const modal = document.getElementById('birthday-setup-modal');
      modal.classList.remove('hidden');

      return new Promise((resolve) => {
        let isResolved = false;
        const doResolve = () => {
          if (!isResolved) {
            isResolved = true;
            modal.classList.add('hidden');
            resolve();
          }
        };

        // Hard Gate: Birthday is mandatory before dashboard access
        document.getElementById('btn-confirm-birthday-setup')?.addEventListener('click', async () => {
          const bdInput = document.getElementById('onboard-birth-date');
          const bd = bdInput?.value;
          if (!bd) {
            showToast('Date of Birth is mandatory. Please enter your birth date to continue.', 'warning');
            return;
          }

          const btn = document.getElementById('btn-confirm-birthday-setup');
          btn.disabled = true;
          btn.textContent = 'Saving...';

          try {
            await updateStudentBirthday(session.student_id, bd);
            const diff = Date.now() - new Date(bd).getTime();
            const age = Math.abs(new Date(diff).getUTCFullYear() - 1970);
            const ageEl = document.getElementById('welcome-age');
            if (ageEl) ageEl.textContent = `${age} y.o. • `;

            showToast('Birthday registered successfully!', 'success');
            doResolve();
          } catch (err) {
            console.warn('Error saving birthday:', err);
            showToast('Could not save birthday: ' + err.message, 'error');
            btn.disabled = false;
            btn.textContent = 'Save & Continue';
          }
        });
      });
    }

    async function checkAndPromptEducation() {
      let hasEducation = false;
      try {
        const sb = await (await import('./supabase.js?v=20261106_v154')).getSupabase();
        const { data: st } = await sb.from('students').select('education').eq('id', session.student_id).maybeSingle();
        if (st && st.education) {
          if (Array.isArray(st.education) && st.education.length > 0) {
            hasEducation = true;
          } else if (typeof st.education === 'string' && st.education.trim().length > 0) {
            hasEducation = true;
          }
          if (hasEducation && !session.education) {
             session.education = st.education;
             const { setStudentSession } = await import('./session.js?v=20261106_v154');
             setStudentSession(session);
          }
        }
      } catch (err) {
        console.warn('Could not check education status from DB:', err);
      }

      if (hasEducation) return;

      hideLoading();
      const modal = document.getElementById('education-setup-modal');
      modal.classList.remove('hidden');

      return new Promise((resolve) => {
        let isResolved = false;
        const doResolve = () => {
          if (!isResolved) {
            isResolved = true;
            modal.classList.add('hidden');
            resolve();
          }
        };

        // Hard Gate: Strictly max 2 latest entries: Institution & Year only
        document.getElementById('btn-confirm-education-setup')?.addEventListener('click', async () => {
          const inst1 = document.getElementById('onboard-edu-inst-1')?.value.trim();
          const year1 = document.getElementById('onboard-edu-year-1')?.value.trim();
          if (!inst1 || !year1) {
            showToast('Please provide your latest academic institution and year.', 'warning');
            return;
          }

          const eduList = [
            { institution: inst1, year: parseInt(year1, 10) || year1 }
          ];

          const inst2 = document.getElementById('onboard-edu-inst-2')?.value.trim();
          const year2 = document.getElementById('onboard-edu-year-2')?.value.trim();
          if (inst2 && year2) {
            eduList.push({ institution: inst2, year: parseInt(year2, 10) || year2 });
          }

          const btn = document.getElementById('btn-confirm-education-setup');
          btn.disabled = true;
          btn.textContent = 'Verifying & Saving...';

          try {
            await updateStudentEducation(session.student_id, eduList);
            session.education = eduList;
            const { setStudentSession } = await import('./session.js?v=20261106_v154');
            setStudentSession(session);
            showToast('Academic background verified!', 'success');
            doResolve();
          } catch (err) {
            console.warn('Error saving education level:', err);
            showToast('Could not save education: ' + err.message, 'error');
            btn.disabled = false;
            btn.textContent = '✓ Save Academic Background & Continue';
          }
        });
      });
    }

    // ── Load Classes & Dashboard ──
    async function loadDashboard() {
      try {
        hideLoading();
        await checkAndPromptGender();
        await checkAndPromptPhoto();
        await checkAndPromptBirthday();
        await checkAndPromptEducation();

        showLoading('Loading your dashboard…');

        const studentLvl = await fetchStudentLevel(session.student_id);
        if (studentLvl.level_id) {
          session.level_id = studentLvl.level_id;
          session.level_number = studentLvl.level_number;
          session.level_name = studentLvl.level_name;
          sessionStorage.setItem('topscore_session', JSON.stringify(session));

          const welcomeMetaEl = document.getElementById('welcome-meta');
          if (welcomeMetaEl) {
            const progName = session.program_name ? session.program_name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : '';
  const parts = [
    session.institution_name,
    progName,
              session.batch_name ? (String(session.batch_name).toLowerCase().startsWith('batch') ? session.batch_name : 'Batch ' + session.batch_name) : null
            ].filter(Boolean);

            welcomeMetaEl.innerHTML = '';
            parts.forEach((part, index) => {
              const span = document.createElement('span');
              span.textContent = part;
              if (index === 0) {
                span.className = "text-xs font-bold text-slate-200 tracking-wide";
                span.style.cssText = "font-size: 0.75rem; font-weight: 700; color: #e2e8f0; letter-spacing: 0.025em;";
              } else {
                span.className = "text-xs font-semibold text-slate-400 tracking-wide";
                span.style.cssText = "font-size: 0.75rem; font-weight: 600; color: #94a3b8; letter-spacing: 0.025em;";
              }
              welcomeMetaEl.appendChild(span);
              if (index < parts.length - 1) {
                const dot = document.createElement('span');
                dot.className = "w-1 h-1 rounded-full bg-slate-600";
                dot.style.cssText = "width: 4px; height: 4px; border-radius: 50%; background-color: #475569; display: block; margin: 2px 0;";
                welcomeMetaEl.appendChild(dot);
              }
            });

          }
          const welcomeLevelPanelEl = document.getElementById('welcome-level-panel');
          const welcomeLevelEl = document.getElementById('welcome-level');
          if (welcomeLevelPanelEl && welcomeLevelEl) {
            const isAlumni = session.level_number === 0 || (session.level_name || '').toLowerCase() === 'alumni';
            welcomeLevelEl.textContent = isAlumni ? 'Alumni 🎓' : (session.level_name.toLowerCase().includes('level') ? session.level_name : session.level_name + ' Level');
            welcomeLevelPanelEl.classList.remove('hidden');
          }
        }

        // Check for Level-Up Celebration
        const celebration = sessionStorage.getItem('topscore_pending_levelup_celebration');
        if (celebration) {
          sessionStorage.removeItem('topscore_pending_levelup_celebration');
          setTimeout(() => {
            if (typeof window.Swal !== 'undefined') {
              Swal.fire({
                title: '🎉 Level Up!',
                text: `Congratulations! You have unlocked ${celebration}.`,
                icon: 'success',
                confirmButtonColor: '#6366f1'
              });
            } else {
              showToast(`🎉 Congratulations! You have unlocked ${celebration}.`, 'success');
            }
          }, 1000);
        }

        const [Classes, progress, attempts, assignmentsRaw, testsRaw] = await withTimeout(
          Promise.all([
            fetchStudentClasses(session.program_id, session.institution_id, session.level_id),
            fetchStudentProgress(session.student_id),
            fetchAllStudentAttempts(session.student_id),
            Promise.resolve([]),
            fetchTests({ class_id: null }).catch(() => [])
          ]),
          20000,
          'Fetching dashboard data'
        );

        hideLoading();
        renderClasses(Classes, progress, testsRaw, attempts);
        await renderNextAssignmentHero(testsRaw, attempts, Classes);

        const myClassIds = Classes.map(c => c.id);
        const myTests = testsRaw.filter(a => myClassIds.includes(a.class_id) || myClassIds.includes(a.Class_id));
        window._batchTests = myTests;
        await computeOverallStats(attempts, myTests);
        await loadBatchLeaderboard();
        setupProfileModal(attempts);
        setupLobbyFlashcards(attempts);
      } catch(e) {
        hideLoading();
        showToast('Failed to load dashboard: ' + e.message, 'error');
        // Clear loading placeholders if there's an error
        renderClasses([], [], [], []);
        renderCompletedTestsBottom([], 0);
        await loadBatchLeaderboard().catch(() => {});
        setupProfileModal([]);
        setupLobbyFlashcards([]);
      }
    }

        async function renderRepetitionMasteryRow(allTests = [], attempts = [], classes = []) {
      const leftEl = document.getElementById('repetition-deck-left');
      const rightEl = document.getElementById('repetition-deck-right');
      if (!leftEl || !rightEl) return;

      const activeClassId = window._selectedClassId || (classes && classes[0]?.id);
      const activeClass = (classes || []).find(c => c.id === activeClassId) || (classes && classes[0]);
      const isVocab = activeClass && (
        /vocab/i.test(activeClass.name || '') ||
        (allTests || []).some(t => t.class_id === activeClassId && (/WORDS|PHRASE/i.test(t.shell_code || '') || /words|phrases/i.test(t.payload?.category || '')))
      );

      if (isVocab) {
        // 1. Vocabulary Class: 7 boxes of color & 0/7 up to 7/7
        let targetReps = 7;
        let minScore = 50;
        try {
          if (typeof fetchClassTestSettings === 'function' && activeClassId) {
            const settings = await fetchClassTestSettings(activeClassId).catch(() => null);
            if (settings?.taskRepetitions) targetReps = Number(settings.taskRepetitions) || 7;
            if (settings?.taskMinScore) minScore = Number(settings.taskMinScore) || 50;
          }
        } catch (_) {}

        // Find published tasks in this active class (matching up-next task list)
        const classTasks = (allTests || []).filter(t => {
          if (t.deleted_at) return false;
          const status = (t.status || '').toUpperCase();
          if (status !== 'PUBLISHED' && status !== 'ACTIVE') return false;
          return t.class_id === activeClassId && !isExam(t);
        });
        classTasks.sort((a, b) => {
          const ordA = a.display_order ?? 999;
          const ordB = b.display_order ?? 999;
          if (ordA !== ordB) return ordA - ordB;
          return (a.title || '').localeCompare(b.title || '');
        });
        const taskAttemptsMap = {};
        (attempts || []).forEach(att => {
          const tid = att.test_id || att.Test_id;
          if (!tid) return;
          if (!taskAttemptsMap[tid]) taskAttemptsMap[tid] = [];
          taskAttemptsMap[tid].push(att);
        });

        // Compute passes per task
        const passCountByTask = {};
        classTasks.forEach(t => {
          const atts = taskAttemptsMap[t.id] || [];
          let passes = 0;
          const tMin = Number(t.minimum_required_score) || Number(t.payload?.min_score) || minScore;
          atts.forEach(a => {
            const pct = parseFloat(a.effective_score ?? a.percentage ?? 0);
            const st = (a.status || '').toLowerCase();
            if (st === 'submitted' || st === 'auto_submitted' || st === 'evaluated') {
              if (a.is_forgiven || pct >= tMin) passes++;
            }
          });
          passCountByTask[t.id] = passes;
        });

        // Current active task is the first task not yet reaching targetReps
        const activeTask = classTasks.find(t => (passCountByTask[t.id] || 0) < targetReps);
        let activePasses = 0;
        if (activeTask) {
          activePasses = passCountByTask[activeTask.id] || 0;
        } else if (classTasks.length > 0) {
          activePasses = targetReps;
        }

        const displayPasses = Math.min(activePasses, targetReps);

        let boxesHtml = '<div class="rep-boxes-wrap">';
        for (let i = 1; i <= targetReps; i++) {
          const isPassed = i <= displayPasses;
          boxesHtml += `<span class="rep-box ${isPassed ? 'is-passed' : 'is-empty'}" title="Pass ${i} of ${targetReps}">${isPassed ? '✓' : i}</span>`;
        }
        boxesHtml += '</div>';

        leftEl.innerHTML = boxesHtml;
        rightEl.innerHTML = `<span class="rep-counter-pill">${displayPasses}/${targetReps}</span>`;
      } else {
        // 2. Non-Vocab Class: Last Assessment Name on left, Last Score on right
        const classAttempts = (attempts || []).filter(a => {
          const t = (allTests || []).find(x => x.id === (a.test_id || a.Test_id));
          return t && t.class_id === activeClassId;
        });

        classAttempts.sort((a, b) => new Date(b.submitted_at || 0) - new Date(a.submitted_at || 0));
        const lastAttempt = classAttempts[0];

        if (lastAttempt) {
          const t = (allTests || []).find(x => x.id === (lastAttempt.test_id || lastAttempt.Test_id));
          const title = t?.title || 'Last Assessment';
          const pct = parseFloat(lastAttempt.percentage || 0).toFixed(0);
          leftEl.innerHTML = `<span class="last-asm-title" title="${escapeHtml(title)}">Last: ${escapeHtml(title)}</span>`;
          rightEl.innerHTML = `<span class="last-asm-score">${pct}%</span>`;
        } else {
          leftEl.innerHTML = `<span class="last-asm-title text-muted">No assessments taken yet</span>`;
          rightEl.innerHTML = `<span class="last-asm-score text-muted">—</span>`;
        }
      }
    }

    async function renderNextAssignmentHero(allTests = [], attempts = [], classes = []) {
      const section = document.getElementById('up-next-section');
      const container = document.getElementById('up-next-container');
      if (!section || !container) return;

      section.classList.remove('hidden');
      await renderRepetitionMasteryRow(allTests, attempts, classes).catch(() => {});

      const classMap = Object.fromEntries((classes || []).map(c => [c.id, c]));
      const activeClassId = window._selectedClassId || (classes && classes[0]?.id);
      const myClassIds = new Set((classes || []).map(c => c.id));

      // Target repetitions & minimum score threshold
      let targetReps = 7;
      let minScore = 50;
      try {
        if (typeof fetchClassTestSettings === 'function' && activeClassId) {
          const settings = await fetchClassTestSettings(activeClassId).catch(() => null);
          if (settings?.taskRepetitions) targetReps = Number(settings.taskRepetitions) || 7;
          if (settings?.taskMinScore) minScore = Number(settings.taskMinScore) || 50;
        }
      } catch (_) {}

      const allTestsMap = Object.fromEntries((allTests || []).map(t => [t.id, t]));
      const bestMap = {};
      const passCountByTest = {};
      const isForgivenByTest = {};

      (attempts || []).forEach(a => {
        const aid = a.test_id || a.Test_id;
        if (!aid) return;
        const pct = parseFloat(a.effective_score ?? a.percentage ?? 0);
        if (bestMap[aid] == null || pct > bestMap[aid]) {
          bestMap[aid] = pct;
        }
        if (a.is_forgiven) {
          isForgivenByTest[aid] = true;
        }
        const st = (a.status || '').toLowerCase();
        if (st === 'submitted' || st === 'auto_submitted' || st === 'evaluated' || st === 'graded') {
          if (a.is_forgiven) {
            passCountByTest[aid] = Math.max(passCountByTest[aid] || 0, targetReps);
          } else {
            const tMin = Number(allTestsMap[aid]?.minimum_required_score) || Number(allTestsMap[aid]?.payload?.min_score) || minScore;
            if (pct >= tMin) {
              passCountByTest[aid] = (passCountByTest[aid] || 0) + 1;
            }
          }
        }
      });

      let published = (allTests || []).filter(a => {
        if (a.deleted_at) return false;
        const status = (a.status || '').toUpperCase();
        if (status !== 'PUBLISHED' && status !== 'ACTIVE') return false;
        if (activeClassId) return a.class_id === activeClassId;
        return myClassIds.has(a.class_id);
      });

      published.sort((a, b) => {
        const ordA = a.display_order ?? 999;
        const ordB = b.display_order ?? 999;
        if (ordA !== ordB) return ordA - ordB;
        return (a.title || '').localeCompare(b.title || '');
      });

      const isPassed = (t) => {
        if (isForgivenByTest[t.id]) return true;
        if (isExam(t)) {
          const score = bestMap[t.id];
          if (score == null) return false;
          const req = t.minimum_required_score || 60;
          return score >= req;
        } else {
          // Task: Strictly requires targetReps (7 passes >= minScore)
          return (passCountByTest[t.id] || 0) >= targetReps;
        }
      };

      let nextTest = published.find(a => !isPassed(a));

      // Theme Exam Pair Transition: If nextTest is Words Exam but student already has an attempt on it,
      // and sibling Phrases Exam has NO attempt yet, prioritize Phrases Exam so the student
      // completes both parts of the theme exam package!
      if (nextTest && isExam(nextTest) && bestMap[nextTest.id] != null) {
        const tc = nextTest.payload?.theme_code;
        const siblingPhrase = published.find(a =>
          a.id !== nextTest.id && isExam(a) &&
          (tc ? a.payload?.theme_code === tc : (a.title || '').substring(0, 3).toLowerCase() === (nextTest.title || '').substring(0, 3).toLowerCase()) &&
          (a.category === 'phrases' || a.test_subtype === 'PHRASE_EXAM' || (a.title || '').toLowerCase().includes('phrase') || (a.shell_code || '').toUpperCase().includes('PHRASE')) &&
          bestMap[a.id] == null
        );
        if (siblingPhrase) {
          nextTest = siblingPhrase;
        }
      }

      if (!nextTest) {
        container.innerHTML = `
          <div class="next-test-left next-asm-left">
            <span class="next-test-icon next-asm-icon">🏆</span>
            <span class="next-test-title next-asm-title">All tests in this class completed!</span>
          </div>
          <span style="font-size:0.75rem; font-weight:800; color:${TOPSCORE_COLORS.STAR}; padding:2px 8px; border-radius:4px; background:rgba(${TOPSCORE_COLORS.STAR_RGB},0.15);">✓ 100%</span>
        `;
        return;
      }

      const className = classMap[nextTest.class_id]?.name || 'Class Module';
      const isTest = isExam(nextTest);

      // Selected Icons: 1A (Solid Yellow Padlock), 2B (Red Rotate Undo), 3C (Green Circle Play), 4D (White Forward Arrow)
      const ICON_1A_YELLOW_LOCK = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M7 10V7a5 5 0 0 1 10 0v3" stroke="#ffff00" stroke-width="2.6" stroke-linecap="round"/><rect x="4.5" y="10" width="15" height="11.5" rx="3" fill="#ffff00" stroke="#cccc00" stroke-width="1"/><circle cx="12" cy="14.8" r="1.5" fill="#713f12"/><path d="M12 15.5v2.2" stroke="#713f12" stroke-width="1.6" stroke-linecap="round"/></svg>';
      const ICON_2B_RED_RETAKE  = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>';
      const ICON_3C_GREEN_PLAY  = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8" fill="#ffffff"/></svg>';
      const ICON_4D_WHITE_ARROW_RIGHT = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>';

      function formatNextTestTitleHtml(rawTitle) {
        const titleStr = (rawTitle || '').trim();
        // Check for common separators: " - ", " – ", " : "
        const parts = titleStr.split(/\s+[-–:]\s+/);
        if (parts.length > 1) {
          const line1 = parts[0].trim();
          const line2 = parts.slice(1).join(' - ').trim();
          return `
            <span class="next-test-primary-name" title="${escapeHtml(line1)}">${escapeHtml(line1)}</span>
            <span class="next-test-topic-name" title="${escapeHtml(line2)}">${escapeHtml(line2)}</span>
          `;
        }
        return `<span class="next-test-primary-name" title="${escapeHtml(titleStr)}">${escapeHtml(titleStr)}</span>`;
      }

      if (!isTest) {
        const currentPasses = passCountByTest[nextTest.id] || 0;
        const displayStep = Math.max(1, Math.min(currentPasses + 1, targetReps));

        let rainbowHtml = '<div class="rainbow-pass-bar">';
        for (let s = 1; s <= 7; s++) {
          const isLit = s <= currentPasses;
          rainbowHtml += `<span class="rainbow-box ${isLit ? 'is-lit' : 'is-dim'}" data-step="${s}">${s}</span>`;
        }
        rainbowHtml += '</div>';

        container.innerHTML = `
          <div class="next-test-col-left">
            <div class="next-test-title-wrap">
              ${formatNextTestTitleHtml(nextTest.title || 'Task')}
            </div>
            ${rainbowHtml}
          </div>
          <div class="next-test-col-right" title="Repetition Pass ${currentPasses}/${targetReps} - Click to practice">
            <button type="button" class="next-test-go-btn next-asm-go-btn pass-counter-btn rainbow-step-${displayStep}">
              ${displayStep}
            </button>
          </div>
        `;
        container.onclick = () => { window.location.href = `test.html?id=${nextTest.id}`; };
      } else {
        const activeSession = await fetchActiveTestSession(nextTest.id, session.batch_id).catch(() => null);
        const isUnlocked = activeSession?.is_unlocked === true;
        const isWhitelisted = !activeSession?.allowed_student_ids ||
                              activeSession.allowed_student_ids.length === 0 ||
                              activeSession.allowed_student_ids.includes(session.student_id);

        let rainbowHtml = '<div class="rainbow-pass-bar is-full-glow">';
        for (let s = 1; s <= 7; s++) {
          rainbowHtml += `<span class="rainbow-box is-lit" data-step="${s}">${s}</span>`;
        }
        rainbowHtml += '</div>';

        if (isUnlocked && isWhitelisted) {
          const remMin = activeSession.remaining_minutes || 30;
          container.innerHTML = `
            <div class="next-test-col-left">
              <div class="next-test-title-wrap">
                ${formatNextTestTitleHtml(nextTest.title || 'Official Exam')}
              </div>
              ${rainbowHtml}
            </div>
            <div class="next-test-col-right" title="Start Exam (${remMin}m left)">
              <button type="button" class="next-test-go-btn next-asm-go-btn is-exam-play">
                ${ICON_3C_GREEN_PLAY}
              </button>
            </div>
          `;
          container.onclick = () => { window.location.href = `test.html?id=${nextTest.id}`; };
        } else {
          container.innerHTML = `
            <div class="next-test-col-left">
              <div class="next-test-title-wrap">
                ${formatNextTestTitleHtml(nextTest.title || 'Official Exam')}
              </div>
              ${rainbowHtml}
            </div>
            <div class="next-test-col-right" title="Waiting for Tutor to unlock Exam">
              <span class="next-test-status-icon next-asm-status-icon is-exam-lock">
                ${ICON_1A_YELLOW_LOCK}
              </span>
            </div>
          `;
          container.onclick = null;
        }
      }
    }
    function renderClasses(rawClasses, progress, allTests = [], allAttempts = []) {
      window._loadedClasses = rawClasses;
      window._classesProgress = progress;
      window._allTests = allTests;
      window._allAttempts = allAttempts;

      const subjCountEl = document.getElementById('overview-classes-count');
      if (subjCountEl) subjCountEl.textContent = rawClasses.length;

      const grid = document.getElementById('classes-grid');
      if (grid) grid.innerHTML = '';

      if (!rawClasses.length) {
        if (grid) {
          grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
            <div class="empty-state__icon">📚</div>
            <h3>No Classes assigned</h3>
            <p>Your class doesn't have any Classes assigned yet. Please contact your teacher.</p>
          </div>`;
        }
        updateClassesBarUI();
        populateClassesSelectorModal([]);
        return;
      }

      const activeClasses = [];
      const completedClasses = [];
      const studentLevelNum = session.level_number != null ? session.level_number : 1;
      const studentLevelId = session.level_id;
      const isAlumni = studentLevelNum === 0 || (session.level_name || '').toLowerCase() === 'alumni';

      rawClasses.forEach(c => {
        const cLvlNum = c.levels?.level_number;
        const isCurrentLevel = (studentLevelId && c.level_id === studentLevelId) || (studentLevelNum && cLvlNum === studentLevelNum);

        // Alumni receives universal access to all program classes
        if (isAlumni) {
          activeClasses.push(c);
        } else if (isCurrentLevel || (cLvlNum == null && studentLevelNum === 0)) {
          activeClasses.push(c);
        } else if (studentLevelNum != null && cLvlNum != null && cLvlNum < studentLevelNum) {
          // Previous level classes remain tracked in completedClasses for history/levels overview modal only
          c._isRetroactive = true;
          completedClasses.push(c);
        }
      });

      // Strict alphabetical sorting (A to Z)
      activeClasses.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      completedClasses.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      const classIcons = ['📚', '✍️', '🗣️', '🎧', '📈', '🌍', '📖', '💬'];

      if (activeClasses.length === 0) {
        if (grid) {
          grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
            <div class="empty-state__icon">📚</div>
            <h3>No Active Classes</h3>
            <p>You don't have any active classes for your current level.</p>
          </div>`;
        }
      } else {
        activeClasses.forEach((subj, idx) => {
          const subjProgress = (progress || []).filter(p => (p.class_id || p.Class_id) === subj.id);
          const dbCompleted = subjProgress.some(p => p.is_completed || p.level_status === 'Level Completed');

          const classAssms = (allTests || []).filter(a => {
            if (a.deleted_at) return false;
            const matchClass = (a.class_id || a.Class_id) === subj.id;
            const matchStatus = (a.status || 'PUBLISHED').toUpperCase() === 'PUBLISHED';
            if (!matchClass || !matchStatus) return false;
            const aLvlNum = a.levels?.level_number;
            if (aLvlNum != null && studentLevelNum != null) {
              return aLvlNum <= studentLevelNum;
            }
            return true;
          });

          let completedCount = 0;
          if (classAssms.length > 0) {
            const completedAssmIds = new Set(
              (allAttempts || [])
                .filter(att => {
                  const s = (att.status || '').toLowerCase();
                  return s === 'submitted' || s === 'completed' || s === 'auto_submitted';
                })
                .map(att => att.test_id || att.Test_id)
                .filter(Boolean)
            );
            completedCount = classAssms.filter(a => completedAssmIds.has(a.id)).length;
          }

          let pct = 0;
          if (dbCompleted) {
            pct = 100;
          } else if (classAssms.length > 0) {
            pct = Math.round((completedCount / classAssms.length) * 100);
          } else if (subjProgress.length > 0 && subjProgress[0].highest_score != null) {
            pct = Math.min(100, Math.round(subjProgress[0].highest_score));
          }

          const isCompleted = dbCompleted || (classAssms.length > 0 && completedCount >= classAssms.length);
          if (isCompleted) pct = 100;

          const statusText = isCompleted ? "Completed" : (pct > 0 ? `${pct}%` : "In Progress");

          subj._pct = pct;
          subj._isCompleted = isCompleted;
          subj._statusText = statusText;

          if (grid) {
            const card = document.createElement('div');
            card.className = 'class-card';
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.setAttribute('aria-label', `Class: ${subj.name}`);
            card.innerHTML = `
              <div class="class-icon">${classIcons[idx % classIcons.length]}</div>
              <div class="class-name">${subj.name}</div>
              <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
                <div class="text-xs text-muted mb-0">${statusText}</div>
                <div class="score-bar-wrap" style="width: 80px;" title="${pct}%">
                  <div class="score-bar" style="width:${pct}%; background: ${isCompleted ? 'var(--clr-success, #00c000ff)' : 'var(--clr-primary, #6366f1)'};"></div>
                </div>
              </div>
            `;
            card.addEventListener('click', () => openClassModal(subj, progress));
            card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openClassModal(subj, progress); });
            grid.appendChild(card);
          }
        });
      }

      window._activeClasses = activeClasses;
      const isValidSelected = activeClasses.some(c => c.id === window._selectedClassId);
      if (!isValidSelected && activeClasses.length > 0) {
        const savedCid = localStorage.getItem('topscore_student_last_class_id');
        const found = savedCid && activeClasses.find(c => c.id === savedCid);
        window._selectedClassId = found ? found.id : activeClasses[0].id;
      }

      updateClassesBarUI();
      renderClassesBoxes(activeClasses);
      populateClassesSelectorModal(activeClasses);
    }

    function renderClassesBoxes(activeClasses = []) {
      const container = document.getElementById('dashboard-classes-boxes');
      if (!container) return;
      const count = Math.min(Math.max(activeClasses.length, 1), 3);
      container.dataset.count = String(count);
      if (window._tierColor) {
        container.style.setProperty('--tier-color', window._tierColor);
        container.style.setProperty('--tier-rgb', window._tierRgb);
      }

      const classIcons = ['📚', '✍️', '🗣️', '🎧', '📈', '🌍', '📖', '💬'];
      let html = '';
      (activeClasses || []).forEach((c, idx) => {
        const isSelected = c.id === window._selectedClassId;
        const icon = classIcons[idx % classIcons.length];
        const pct = c._pct != null ? c._pct : 0;
        const activeStyle = (isSelected && window._tierColor)
          ? `style="border-color:${window._tierColor} !important; box-shadow:0 0 16px rgba(${window._tierRgb}, 0.45) !important;"`
          : '';
        html += `
          <div class="class-deck-box ${isSelected ? 'active' : ''}" data-cid="${c.id}" role="button" tabindex="0" ${activeStyle}>
            <div class="class-deck-title">${icon} ${escapeHtml(c.name)}</div>
            <div class="class-deck-progress">${pct}%</div>
          </div>
        `;
      });
      container.innerHTML = html || '<div class="class-deck-box active"><div class="class-deck-title">No Class Assigned</div><div class="class-deck-progress">0%</div></div>';

      container.querySelectorAll('.class-deck-box').forEach(box => {
        box.addEventListener('click', () => {
          const cid = box.dataset.cid;
          if (!cid) return;
          window._selectedClassId = cid;
          try { localStorage.setItem('topscore_student_last_class_id', cid); } catch (_) {}
          renderClassesBoxes(window._activeClasses);
          updateClassesBarUI();
          renderNextAssignmentHero(window._allTests, window._allAttempts, window._loadedClasses);
        });
      });
    }

    function updateClassesBarUI() {
      const activeClass = (window._activeClasses || []).find(c => c.id === window._selectedClassId) || (window._activeClasses || [])[0];
      const nameEl = document.getElementById('classes-bar-current-name');
      const pctEl = document.getElementById('classes-bar-progress-val');
      const headerClassNameEl = document.getElementById('dashboard-header-class-name');
      if (activeClass) {
        if (nameEl) nameEl.textContent = activeClass.name;
        if (headerClassNameEl) headerClassNameEl.textContent = String(activeClass.name || '').toUpperCase();
        if (pctEl) pctEl.textContent = `${activeClass._pct != null ? activeClass._pct : 0}%`;
      } else {
        if (nameEl) nameEl.textContent = 'No Classes Assigned';
        if (headerClassNameEl) headerClassNameEl.textContent = 'Select Class';
        if (pctEl) pctEl.textContent = '0%';
      }
    }

    function populateClassesSelectorModal(activeClasses = []) {
      const listEl = document.getElementById('classes-selector-modal-list');
      if (!listEl) return;
      const classIcons = ['📚', '✍️', '🗣️', '🎧', '📈', '🌍', '📖', '💬'];
      let html = '';
      (activeClasses || []).forEach((c, idx) => {
        const isSelected = c.id === window._selectedClassId;
        const icon = classIcons[idx % classIcons.length];
        const pct = c._pct != null ? c._pct : 0;
        const status = c._statusText || (pct > 0 ? `${pct}%` : 'In Progress');
        html += `
          <div class="classes-selector-item ${isSelected ? 'selected' : ''}" data-cid="${c.id}" role="button" tabindex="0">
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="font-size:1.3rem;">${icon}</span>
              <div>
                <div style="font-weight:800; font-size:0.9rem; color:#fff;">${escapeHtml(c.name)}</div>
                <div style="font-size:0.75rem; color:#94a3b8;">${escapeHtml(status)}</div>
              </div>
            </div>
            <div style="font-weight:800; font-size:0.88rem; color:var(--tier-color, #38bdf8);">${pct}%</div>
          </div>
        `;
      });
      listEl.innerHTML = html || '<div class="text-muted p-4 text-center">No active classes.</div>';

      listEl.querySelectorAll('.classes-selector-item').forEach(item => {
        item.addEventListener('click', () => {
          const cid = item.dataset.cid;
          window._selectedClassId = cid;
          try { localStorage.setItem('topscore_student_last_class_id', cid); } catch (_) {}
          updateClassesBarUI();
          populateClassesSelectorModal(window._activeClasses);
          renderNextAssignmentHero(window._allTests, window._allAttempts, window._loadedClasses);
          if (typeof renderCompletedTests === 'function') {
            renderCompletedTests(window._allTests, window._allAttempts);
          }
          if (typeof renderLeaderboard === 'function' && window._loadedStudents) {
            renderLeaderboard(window._loadedStudents, window._allAttempts, window._allTests);
          }
          closeSelectorModal();
        });
      });

      // Wire modal events once
      const openSelectorModal = () => {
        populateClassesSelectorModal(window._activeClasses);
        document.getElementById('classes-selector-modal')?.classList.remove('hidden');
        try { window.location.hash = '#select-class'; } catch (_) {}
      };

      const closeSelectorModal = () => {
        document.getElementById('classes-selector-modal')?.classList.add('hidden');
        if (window.location.hash === '#select-class') {
          try { history.replaceState(null, '', window.location.pathname + window.location.search); } catch (_) {}
        }
      };

      const classesBar = document.getElementById('dashboard-classes-bar');
      if (classesBar && !classesBar._hasClickListener) {
        classesBar._hasClickListener = true;
        classesBar.addEventListener('click', openSelectorModal);
        classesBar.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') openSelectorModal();
        });
      }
      const doorBtn = document.getElementById('btn-change-class');
      if (doorBtn && !doorBtn._hasClickListener) {
        doorBtn._hasClickListener = true;
        doorBtn.addEventListener('click', openSelectorModal);
      }
      const closeBtn = document.getElementById('close-classes-selector-modal');
      if (closeBtn && !closeBtn._hasClickListener) {
        closeBtn._hasClickListener = true;
        closeBtn.addEventListener('click', closeSelectorModal);
      }
      const selectorModal = document.getElementById('classes-selector-modal');
      if (selectorModal && !selectorModal._hasBackdropListener) {
        selectorModal._hasBackdropListener = true;
        selectorModal.addEventListener('click', (e) => {
          if (e.target === selectorModal) closeSelectorModal();
        });
      }
    }

    // Phase 298: Component Selector Modal Trigger
    window.triggerComponentChoiceModal = function(encodedData) {
      try {
        const data = JSON.parse(decodeURIComponent(encodedData));
        const modal = document.getElementById('component-selector-modal');
        if (!modal) return;

        const badgeEl = document.getElementById('component-modal-badge');
        const titleEl = document.getElementById('component-modal-title');
        const subtitleEl = document.getElementById('component-modal-subtitle');

        if (badgeEl) badgeEl.textContent = data.badge || 'TOPIC ASSESSMENT';
        if (titleEl) titleEl.textContent = data.title || 'Topic Assessment';
        if (subtitleEl) subtitleEl.textContent = data.subtitle || 'Pilih bagian yang ingin Anda kerjakan terlebih dahulu:';

        const wordsCard = document.getElementById('component-opt-words');
        const wordsTitle = document.getElementById('component-words-title');
        const wordsBadge = document.getElementById('component-words-badge');
        const wordsStatus = document.getElementById('component-words-status');
        const wordsBestEl = document.getElementById('component-words-best');

        if (data.wordsTestId) {
          wordsCard.style.display = 'block';
          if (wordsTitle) wordsTitle.textContent = data.isExam ? 'Words Exam' : 'Words Task';
          if (wordsBadge) wordsBadge.textContent = data.isExam ? '120 Soal (Written Mode)' : '40 Soal (Speaking)';
          if (wordsStatus) {
            wordsStatus.textContent = data.isExam
              ? (data.wordsBest ? `Score: ${Number(data.wordsBest.percentage || 0).toFixed(0)}%` : 'Belum Dikerjakan')
              : `Progres: ${data.wordsPasses || 0}/7 Passes`;
          }
          if (wordsBestEl) {
            wordsBestEl.textContent = data.wordsBest
              ? `Best: ${Number(data.wordsBest.percentage || 0).toFixed(0)}% (${Number(data.wordsBest.points_awarded ?? data.wordsBest.points ?? 0)} PTS)`
              : 'Best: —';
          }
          wordsCard.onclick = () => {
            modal.classList.add('hidden');
            location.href = `test.html?test_id=${data.wordsTestId}`;
          };
        } else {
          wordsCard.style.display = 'none';
        }

        const phrasesCard = document.getElementById('component-opt-phrases');
        const phrasesTitle = document.getElementById('component-phrases-title');
        const phrasesBadge = document.getElementById('component-phrases-badge');
        const phrasesStatus = document.getElementById('component-phrases-status');
        const phrasesBestEl = document.getElementById('component-phrases-best');

        if (data.phrasesTestId) {
          phrasesCard.style.display = 'block';
          if (phrasesTitle) phrasesTitle.textContent = data.isExam ? 'Phrases Exam' : 'Phrases Task';
          if (phrasesBadge) phrasesBadge.textContent = data.isExam ? '30 Soal (Selection Mode)' : '10 Soal (Speaking)';
          if (phrasesStatus) {
            phrasesStatus.textContent = data.isExam
              ? (data.phrasesBest ? `Score: ${Number(data.phrasesBest.percentage || 0).toFixed(0)}%` : 'Belum Dikerjakan')
              : `Progres: ${data.phrasesPasses || 0}/7 Passes`;
          }
          if (phrasesBestEl) {
            phrasesBestEl.textContent = data.phrasesBest
              ? `Best: ${Number(data.phrasesBest.percentage || 0).toFixed(0)}% (${Number(data.phrasesBest.points_awarded ?? data.phrasesBest.points ?? 0)} PTS)`
              : 'Best: —';
          }
          phrasesCard.onclick = () => {
            modal.classList.add('hidden');
            location.href = `test.html?test_id=${data.phrasesTestId}`;
          };
        } else {
          phrasesCard.style.display = 'none';
        }

        modal.classList.remove('hidden');

        const closeBtn = document.getElementById('close-component-modal');
        if (closeBtn && !closeBtn._hasListener) {
          closeBtn._hasListener = true;
          closeBtn.onclick = () => modal.classList.add('hidden');
        }
        if (!modal._hasBackdropListener) {
          modal._hasBackdropListener = true;
          modal.onclick = (e) => {
            if (e.target === modal) modal.classList.add('hidden');
          };
        }
      } catch (err) {
        console.error('[triggerComponentChoiceModal] Error:', err);
      }
    };

    // ── openClassModal: Opens the Level Modal for a Class ──
    // Called when a student clicks a Class card on the dashboard.
    async function openClassModal(subj, progress) {
      const modal       = document.getElementById('level-modal');
      const titleEl     = document.getElementById('level-modal-title');
      const classEl   = document.getElementById('level-modal-class');
      const container   = document.getElementById('levels-container');
      if (!modal || !container) return;

      // Open modal immediately with a loading state
      titleEl.textContent  = (subj.name || 'Class') + ' Tests';
      classEl.textContent = 'Select an available test below.';
      container.innerHTML  = `<div style="padding:2rem;text-align:center;color:var(--clr-text-3);">
        <div class="spinner" style="margin:0 auto 1rem;"></div>
        <p>Loading Tests…</p></div>`;
      modal.classList.remove('hidden');
      try { window.location.hash = '#levels-' + subj.id; } catch (_) {}

      try {
        const Tests = await fetchTestsForStudentClass(
          session.program_id, subj.id, session.institution_id, session.level_id
        );

        if (!Tests || Tests.length === 0) {
          container.innerHTML = `<div style="padding:2.5rem 1.5rem;text-align:center;color:var(--clr-text-3);">
            <div style="font-size:2.5rem;margin-bottom:0.75rem;">📈</div>
            <p style="font-size:0.9rem;">No published Tests available in this Class yet.</p></div>`;
          return;
        }

        // Group Tests by level (level_id or level name)
        const levelMap = new Map();
        for (const Test of Tests) {
          const lvlId   = Test.level_id || '_default';
          const lvlNum  = Test.levels?.level_number ?? null;
          // Use toOrdinalLevel for proper "1st Level", "2nd Level", etc.
          // Fall back to existing name, then derive from level_number, then 'Unleveled'
          const lvlName = lvlNum != null
            ? toOrdinalLevel(lvlNum)
            : (Test.levels?.name || Test.level_name || (lvlId === '_default' ? 'Unleveled' : `Level ${lvlId}`));
          const lvlOrder = Test.levels?.level_number ?? Test.level_order ?? 99;
          if (!levelMap.has(lvlId)) levelMap.set(lvlId, { name: lvlName, order: lvlOrder, Tests: [] });
          levelMap.get(lvlId).Tests.push(Test);
        }

        // Sort levels by order
        const sortedLevels = [...levelMap.values()].sort((a, b) => a.order - b.order);

        // Fetch dynamic test system settings for this class (target repetitions & pass threshold)
        const testSettings = (typeof fetchClassTestSettings === 'function')
          ? await fetchClassTestSettings(subj.id).catch(() => ({ taskRepetitions: 7, taskMinScore: 50, examMinScore: 60 }))
          : { taskRepetitions: 7, taskMinScore: 50, examMinScore: 60 };
        const targetReps = Number(testSettings?.taskRepetitions) || 7;
        const taskMinScore = Number(testSettings?.taskMinScore) || 50;

        // Build attempts quick-lookup for this student
        const attemptsRaw = await fetchAllStudentAttempts(session.student_id).catch(() => []);
        const testsMap = Object.fromEntries(Tests.map(t => [t.id, t]));
        const bestByTest = {};
        const inProgByTest = {};
        const passCountByTest = {};
        for (const att of attemptsRaw) {
          const eid = att.test_id || att.Test_id;
          if (!eid) continue;
          const pct = parseFloat(att.effective_score ?? att.percentage ?? 0);
          const st  = (att.status || '').toLowerCase();
          if (st === 'in_progress') { inProgByTest[eid] = att; continue; }
          if (st === 'submitted' || st === 'auto_submitted' || st === 'evaluated') {
            if (att.is_forgiven) {
              passCountByTest[eid] = Math.max(passCountByTest[eid] || 0, targetReps);
            } else {
              const tMin = Number(testsMap[eid]?.minimum_required_score) || Number(testsMap[eid]?.payload?.min_score) || taskMinScore;
              if (pct >= tMin) {
                passCountByTest[eid] = (passCountByTest[eid] || 0) + 1;
              }
            }
          }
          if (!bestByTest[eid] || pct > parseFloat(bestByTest[eid].percentage || 0) || (pct === parseFloat(bestByTest[eid].percentage || 0) && new Date(att.submitted_at || 0) > new Date(bestByTest[eid].submitted_at || 0)) || (att.is_forgiven && !bestByTest[eid])) {
            bestByTest[eid] = att;
          }
        }

        // Render
        let html = '';
        for (const lvl of sortedLevels) {
          let lvlHtml = '';

          const hasVocabComponents = lvl.Tests.some(t =>
            t.payload?.category === 'words' || t.payload?.category === 'phrases' ||
            /WORDS|PHRASE/i.test(t.shell_code || '') ||
            (t.title || '').toLowerCase().includes('word') ||
            (t.title || '').toLowerCase().includes('phrase')
          );

          if (hasVocabComponents) {
            // Phase 298: Virtual Unified Task & Exam Presentation
            const groups = [];
            const groupMap = new Map();

            for (const t of lvl.Tests) {
              const isEx = isExam(t);
              // Robust theme/topic extraction with multi-source fallbacks
              let _tc = t.payload?.theme_code || (t.shell_code ? t.shell_code.replace(/^[0-9]+/, '').charAt(0) : null);
              if (!_tc && t.title) {
                const _tm = t.title.match(/Theme\s+([A-D0-9]+)/i) || t.title.match(/Vocabulary\s+C([A-D0-9]+)/i);
                if (_tm) _tc = _tm[1];
              }
              const tc = (_tc || 'A').toUpperCase();

              let topCode = t.payload?.topic_code != null ? String(t.payload.topic_code) : null;
              if (!topCode && t.shell_code) {
                const _tm2 = t.shell_code.match(/^[0-9]+([A-D][0-9]+)/i);
                if (_tm2) topCode = _tm2[1].toUpperCase();
              }
              if (!topCode && t.title) {
                const _tm3 = t.title.match(/Vocabulary\s+([A-D][0-9]+)/i);
                if (_tm3) topCode = _tm3[1].toUpperCase();
              }
              const isPhrase = t.payload?.category === 'phrases' || /PHRASE/i.test(t.shell_code || '') || (t.title || '').toLowerCase().includes('phrase');

              const key = isEx ? `exam_${tc}` : `task_${tc}_${topCode || '0'}`;

              if (!groupMap.has(key)) {
                const grp = {
                  key,
                  isExam: isEx,
                  themeCode: tc,
                  topicCode: topCode,
                  themeName: t.payload?.theme_name || t.theme || null,
                  topicName: t.payload?.topic_name || t.topic || null,
                  displayOrder: t.display_order || 0,
                  wordsTest: null,
                  phrasesTest: null
                };
                groupMap.set(key, grp);
                groups.push(grp);
              }

              const grp = groupMap.get(key);
              if (isPhrase) {
                grp.phrasesTest = t;
              } else {
                grp.wordsTest = t;
              }
              if (t.display_order && (!grp.displayOrder || t.display_order < grp.displayOrder)) {
                grp.displayOrder = t.display_order;
              }
              if (!grp.topicName && (t.payload?.topic_name || t.topic)) {
                grp.topicName = t.payload?.topic_name || t.topic;
              }
              if (!grp.themeName && (t.payload?.theme_name || t.theme)) {
                grp.themeName = t.payload?.theme_name || t.theme;
              }
            }

            groups.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

            for (const grp of groups) {
              const wordsTest = grp.wordsTest;
              const phrasesTest = grp.phrasesTest;
              const hasPhrases = Boolean(phrasesTest);
              if (!wordsTest && !phrasesTest) continue;

              const primaryTest = wordsTest || phrasesTest;

              const wBest = wordsTest ? bestByTest[wordsTest.id] : null;
              const pBest = phrasesTest ? bestByTest[phrasesTest.id] : null;

              const wInProg = wordsTest ? inProgByTest[wordsTest.id] : null;
              const pInProg = phrasesTest ? inProgByTest[phrasesTest.id] : null;
              const activeInProg = wInProg || pInProg;

              const wPasses = wordsTest ? (passCountByTest[wordsTest.id] || 0) : 0;
              const pPasses = phrasesTest ? (passCountByTest[phrasesTest.id] || 0) : 0;

              const topicLevel = computeTopicPassLevel(wPasses, pPasses, hasPhrases);
              const taskVisual = !grp.isExam ? getTaskProgressVisual(topicLevel) : null;

              const wordsMax = grp.isExam ? 120 : (hasPhrases ? 40 : 10);
              const phrasesMax = grp.isExam ? 30 : 10;
              const unifiedScore = computeUnifiedScore({
                wordsBest: wBest,
                phrasesBest: pBest,
                wordsMax,
                phrasesMax,
                hasPhrases
              });

              const liveSess = (wordsTest?.payload?.test_session) || (phrasesTest?.payload?.test_session);
              const isRemedialSession = liveSess?.is_remedial === true ||
                (Array.isArray(liveSess?.remedial_student_ids) && liveSess.remedial_student_ids.includes(session?.student_id));
              const isStudentRemedialUnlocked = Boolean(
                (wBest && (wBest.is_remedial_unlocked || wBest.is_remedial)) ||
                (pBest && (pBest.is_remedial_unlocked || pBest.is_remedial))
              );

              let grpPrereqMet = true;
              let grpPrereqTitle = '';

              // 1. Inter-Theme Gating: Theme B, C, D requires all prior theme's exams passed (>= 70%)
              const themeSeq = ['A', 'B', 'C', 'D'];
              const curThemeIdx = themeSeq.indexOf(grp.themeCode);
              if (curThemeIdx > 0 && !isRemedialSession && !isStudentRemedialUnlocked) {
                const priorTheme = themeSeq[curThemeIdx - 1];
                const priorExams = lvl.Tests.filter(t => isExam(t) && String(t.payload?.theme_code || (t.shell_code ? t.shell_code.replace(/^[0-9]+/, '').charAt(0) : '')).toUpperCase() === priorTheme);
                for (const pe of priorExams) {
                  const peBest = bestByTest[pe.id];
                  const peRawPct = peBest ? parseFloat(peBest.percentage || 0) : null;
                  const peRem = Boolean(peBest && (peBest.is_remedial_unlocked || peBest.is_remedial));
                  const pePct = peRem && peRawPct !== null ? Math.min(peRawPct, 60.0) : peRawPct;
                  const peMin = pe.minimum_required_score || pe.pass_threshold || 70;
                  const pePassed = Boolean(peBest?.is_forgiven) || (pePct !== null && (pePct >= peMin || (peRem && pePct >= 60)));
                  if (!pePassed) {
                    grpPrereqMet = false;
                    grpPrereqTitle = `Theme ${priorTheme} Exams (Passed ≥${peMin}% required)`;
                    break;
                  }
                }
              }

              // 2. Exam Gating: Theme Exam requires all tasks in this theme to reach target passes
              if (grpPrereqMet && grp.isExam && !isRemedialSession && !isStudentRemedialUnlocked) {
                const siblingTasks = lvl.Tests.filter(t => !isExam(t) && String(t.payload?.theme_code || (t.shell_code ? t.shell_code.replace(/^[0-9]+/, '').charAt(0) : '')).toUpperCase() === grp.themeCode);
                for (const st of siblingTasks) {
                  const pCount = passCountByTest[st.id] || 0;
                  if (pCount < targetReps) {
                    grpPrereqMet = false;
                    grpPrereqTitle = `All Theme ${grp.themeCode} Tasks (${targetReps}/${targetReps} Passes Required)`;
                    break;
                  }
                }
              }

              // 3. Linear Topic Gating: Topic K requires Topic K-1 to reach target passes
              if (grpPrereqMet && !grp.isExam && !isRemedialSession && !isStudentRemedialUnlocked) {
                const curTopNum = parseInt(String(grp.topicCode || '').replace(/^[A-Za-z]+/, ''), 10);
                if (curTopNum > 1) {
                  const priorTopicNum = curTopNum - 1;
                  const priorTasks = lvl.Tests.filter(t => {
                    if (isExam(t)) return false;
                    const tTheme = String(t.payload?.theme_code || (t.shell_code ? t.shell_code.replace(/^[0-9]+/, '').charAt(0) : '')).toUpperCase();
                    if (tTheme !== grp.themeCode) return false;
                    const tTopNum = parseInt(String(t.payload?.topic_code || '').replace(/^[A-Za-z]+/, ''), 10);
                    return tTopNum === priorTopicNum;
                  });
                  for (const pt of priorTasks) {
                    const pCount = passCountByTest[pt.id] || 0;
                    if (pCount < targetReps) {
                      grpPrereqMet = false;
                      const remaining = targetReps - pCount;
                      grpPrereqTitle = `Topic ${grp.themeCode}${priorTopicNum} (${pCount}/${targetReps} passes — ${remaining} more needed)`;
                      break;
                    }
                  }
                }
              }

              const cardOpacity = grpPrereqMet ? '1' : '0.5';
              const cardFilter = grpPrereqMet ? 'none' : 'grayscale(100%)';

              const fallbackTopicName = (primaryTest.title || '')
                .replace(/^.*?-\s*\d+[a-z]{2}\s+Level\s*-\s*/i, '')
                .replace(/3rd Vocabulary\s+[A-D][0-9]*\s*(Words|Phrases)?\s*(Task|Exam)?\s*-\s*/i, '')
                .replace(/2nd Vocabulary\s+[A-D][0-9]*\s*(Words)?\s*(Task|Exam)?\s*-\s*/i, '')
                .replace(/Vocabulary Mastery /i, '')
                .trim();

              const resolvedTopicTitle = grp.topicName || fallbackTopicName || `Topic ${grp.topicCode || '1'}`;
              const resolvedThemeTitle = grp.themeName || fallbackTopicName || `Theme ${grp.themeCode}`;

              const displayTitle = grp.isExam
                ? `Theme ${grp.themeCode} Exam — ${resolvedThemeTitle}`
                : (grp.topicCode
                    ? `Theme ${grp.themeCode} • Topic ${grp.topicCode}: ${resolvedTopicTitle}`
                    : `Theme ${grp.themeCode}: ${resolvedTopicTitle}`);

              const metaItems = `${unifiedScore.maxPoints} Items • ${unifiedScore.maxPoints} PTS`;

              let statusBadgeHtml = '';
              let actionBtnHtml = '';

              if (!grpPrereqMet) {
                statusBadgeHtml = `<span style="background:rgba(245,158,11,0.12);color:#fbbf24;border:1px solid rgba(245,158,11,0.3);padding:3px 8px;border-radius:4px;font-size:0.68rem;font-weight:700;text-transform:uppercase;">🔒 Locked</span>`;
                actionBtnHtml = `<div style="text-align:right;max-width:240px;line-height:1.3;">
                  <span style="font-size:0.72rem;color:#cbd5e1;">Needs <b>${escapeHtml(grpPrereqTitle)}</b></span>
                </div>`;
              } else if (activeInProg) {
                statusBadgeHtml = `<span style="background:rgba(${TOPSCORE_COLORS.D_RGB},0.15);color:${TOPSCORE_COLORS.D};border:1px solid rgba(${TOPSCORE_COLORS.D_RGB},0.35);padding:3px 8px;border-radius:4px;font-size:0.68rem;font-weight:700;text-transform:uppercase;">⏳ In Progress</span>`;
                actionBtnHtml = `<button onclick="location.href='test.html?attempt_id=${activeInProg.id}&test_id=${activeInProg.test_id || ''}'"
                                  style="background:var(--clr-accent-1);color:#fff;border:none;padding:6px 14px;border-radius:6px;font-size:0.78rem;font-weight:700;cursor:pointer;">Resume ←</button>`;
              } else {
                if (grp.isExam) {
                  if (unifiedScore.isAttempted) {
                    statusBadgeHtml = `<span style="background:${unifiedScore.gradeColor}18;color:${unifiedScore.gradeColor};border:1px solid ${unifiedScore.gradeColor}44;padding:3px 8px;border-radius:4px;font-size:0.68rem;font-weight:800;">${unifiedScore.percentage}% (${unifiedScore.totalPoints}/${unifiedScore.maxPoints}p)</span>`;
                  } else {
                    statusBadgeHtml = `<span style="background:rgba(99,102,241,0.12);color:#a5b4fc;border:1px solid rgba(99,102,241,0.3);padding:3px 8px;border-radius:4px;font-size:0.68rem;font-weight:700;text-transform:uppercase;">Not Started</span>`;
                  }

                  if (hasPhrases) {
                    const modalData = encodeURIComponent(JSON.stringify({
                      badge: `THEME ${grp.themeCode} OFFICIAL EXAM`,
                      title: `Theme ${grp.themeCode} Exam — ${resolvedThemeTitle}`,
                      subtitle: 'Pilih bagian yang ingin Anda kerjakan terlebih dahulu:',
                      wordsTestId: wordsTest?.id,
                      phrasesTestId: phrasesTest?.id,
                      wordsBest: wBest,
                      phrasesBest: pBest,
                      isExam: true
                    }));
                    actionBtnHtml = `<button type="button" onclick="window.triggerComponentChoiceModal('${modalData}')"
                                      style="background:linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);color:#fff;border:none;padding:7px 15px;border-radius:7px;font-size:0.78rem;font-weight:800;cursor:pointer;box-shadow:0 2px 8px rgba(37,99,235,0.35);">
                                      ${unifiedScore.isAttempted ? 'Kerjakan Exam' : 'Mulai Exam 🚀'}
                                    </button>`;
                  } else {
                    actionBtnHtml = `<button onclick="location.href='test.html?test_id=${wordsTest.id}'"
                                      style="background:linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);color:#fff;border:none;padding:7px 15px;border-radius:7px;font-size:0.78rem;font-weight:800;cursor:pointer;box-shadow:0 2px 8px rgba(37,99,235,0.35);">
                                      ${unifiedScore.isAttempted ? 'Kerjakan Exam' : 'Mulai Exam 🚀'}
                                    </button>`;
                  }
                } else {
                  // Task
                  const drillLabel = topicLevel >= 7 ? 'Drill Lagi 7×7' : (topicLevel > 0 ? 'Lanjut Drill' : 'Mulai Task 🚀');

                  if (hasPhrases) {
                    const modalData = encodeURIComponent(JSON.stringify({
                      badge: `THEME ${grp.themeCode} • TOPIC ${grp.topicCode} DRILL`,
                      title: `Topic ${grp.topicCode}: ${resolvedTopicTitle}`,
                      subtitle: 'Pilih bagian yang ingin Anda kerjakan terlebih dahulu:',
                      wordsTestId: wordsTest?.id,
                      phrasesTestId: phrasesTest?.id,
                      wordsBest: wBest,
                      phrasesBest: pBest,
                      wordsPasses: wPasses,
                      phrasesPasses: pPasses,
                      isExam: false
                    }));
                    actionBtnHtml = `<button type="button" onclick="window.triggerComponentChoiceModal('${modalData}')"
                                      style="background:linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);color:#fff;border:none;padding:7px 15px;border-radius:7px;font-size:0.78rem;font-weight:800;cursor:pointer;box-shadow:0 2px 8px rgba(37,99,235,0.35);">
                                      ${drillLabel}
                                    </button>`;
                  } else {
                    actionBtnHtml = `<button onclick="location.href='test.html?test_id=${wordsTest.id}'"
                                      style="background:linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);color:#fff;border:none;padding:7px 15px;border-radius:7px;font-size:0.78rem;font-weight:800;cursor:pointer;box-shadow:0 2px 8px rgba(37,99,235,0.35);">
                                      ${drillLabel}
                                    </button>`;
                  }
                }
              }

              const taskProgressBadge = taskVisual
                ? `<span class="task-progress-chip ${taskVisual.tierClass}" style="background:${taskVisual.bg};color:${taskVisual.color};border:1px solid ${taskVisual.border};">${taskVisual.text}</span>`
                : '';

              const gradeChip = (grp.isExam && unifiedScore.isAttempted)
                ? `<span style="background:${unifiedScore.gradeColor}22;color:${unifiedScore.gradeColor};border:1px solid ${unifiedScore.gradeColor}44;padding:2px 7px;border-radius:4px;font-size:0.72rem;font-weight:800;">${getGradeSymbol(unifiedScore.grade)}</span>`
                : '';

              lvlHtml += `<div class="asm-modal-row" style="opacity:${cardOpacity}; filter:${cardFilter}; display:flex; justify-content:space-between; align-items:center; padding:10px 14px; margin-bottom:8px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:10px;">
                <div class="asm-modal-info" style="flex:1;">
                  <div style="font-size:0.88rem;font-weight:700;color:var(--clr-text-1);margin-bottom:3px;">
                    ${escapeHtml(displayTitle)}
                  </div>
                  <div style="font-size:0.72rem;color:var(--clr-text-3);display:flex;flex-wrap:wrap;gap:12px;align-items:center;">
                    <span>⚡ ${metaItems}</span>
                    ${hasPhrases ? `
                      <span>📝 Words: <b>${grp.isExam ? (wBest ? `${Number(wBest.percentage).toFixed(0)}%` : '—') : `${wPasses}/7`}</b></span>
                      <span>💬 Phrases: <b>${grp.isExam ? (pBest ? `${Number(pBest.percentage).toFixed(0)}%` : '—') : `${pPasses}/7`}</b></span>
                      ${unifiedScore.isAttempted ? `<span style="color:#f8fafc;">🏆 Total: <b>${unifiedScore.totalPoints}/${unifiedScore.maxPoints} PTS (${unifiedScore.percentage}%)</b></span>` : ''}
                    ` : ''}
                  </div>
                </div>
                <div class="asm-modal-actions" style="display:flex;align-items:center;gap:10px;flex-shrink:0;">
                  ${!grp.isExam ? taskProgressBadge : gradeChip}
                  ${statusBadgeHtml}
                  ${actionBtnHtml}
                </div>
              </div>`;
            }
          } else {
            // Sort tests: last-attempted (most recent submitted_at / started_at) floats to top
            const sortedTests = [...lvl.Tests].sort((a, b) => {
              const aAtt = bestByTest[a.id] || inProgByTest[a.id];
              const bAtt = bestByTest[b.id] || inProgByTest[b.id];
              const aTime = aAtt ? new Date(aAtt.submitted_at || aAtt.started_at || 0).getTime() : 0;
              const bTime = bAtt ? new Date(bAtt.submitted_at || bAtt.started_at || 0).getTime() : 0;
              if (aTime !== bTime) return bTime - aTime;
              return 0;
            });

            for (const Test of sortedTests) {
              const best      = bestByTest[Test.id];
              const inProg    = inProgByTest[Test.id];
              let hasThemeRemedial = false;
              if (isExam(Test)) {
                const rawTheme = Test.payload?.theme_code || (Test.shell_code ? Test.shell_code.replace(/^[0-9]+/, '').charAt(0) : 'A');
                const tc = (rawTheme || 'A').toUpperCase();
                const siblingExams = sortedTests.filter(t => isExam(t) && ((t.payload?.theme_code || (t.shell_code ? t.shell_code.replace(/^[0-9]+/, '').charAt(0) : 'A')).toUpperCase() === tc));
                hasThemeRemedial = siblingExams.some(sTest => {
                  const sBest = bestByTest[sTest.id];
                  return Boolean(sBest && (sBest.is_remedial_unlocked || sBest.is_remedial));
                });
              }
              const isRem       = hasThemeRemedial || Boolean(best && (best.is_remedial_unlocked || best.is_remedial));
              const rawBestPct  = best ? parseFloat(best.percentage || 0) : null;
              const bestPct     = isRem && rawBestPct !== null ? Math.min(rawBestPct, 60.0) : rawBestPct;
              const passed      = bestPct !== null && bestPct >= (Test.minimum_required_score || Test.pass_threshold || 60);
              const grade       = bestPct !== null ? getGrade(bestPct) : null;
              const gradeColor  = grade ? getGradeColorByScore(bestPct) : null;

              // Prerequisite Gating Logic
              let prereqMet = true;
              let prereqTitle = '';
              const prereqId = Test.prerequisite_test_id || Test.prerequisite_id;
              if (prereqId) {
                 const prereqBest = bestByTest[prereqId];
                 const prereqPct = prereqBest ? parseFloat(prereqBest.percentage || 0) : null;
                 const pObj = Tests.find(a => a.id === prereqId);
                 const pMinScore = pObj ? (pObj.minimum_required_score || pObj.pass_threshold || 60) : 60;
                 prereqMet = Boolean(prereqBest?.is_forgiven) || (prereqPct !== null && prereqPct >= pMinScore);
                 prereqTitle = pObj ? (pObj.display_name || pObj.title || pObj.name || 'Prerequisite') : 'Prerequisite Test';
              }

              const liveSess = (Test.payload?.test_session);
              const isRemedialSession = liveSess?.is_remedial === true ||
                (Array.isArray(liveSess?.remedial_student_ids) && liveSess.remedial_student_ids.includes(session?.student_id));
              const isStudentRemedialUnlocked = Boolean(bestByTest[Test.id]?.is_remedial_unlocked || bestByTest[Test.id]?.is_remedial);

              if (isExam(Test) && !isRemedialSession && !isStudentRemedialUnlocked) {
                const currentThemeCode = String(Test.payload?.theme_code || (Test.shell_code ? Test.shell_code.replace(/^[0-9]+/, '').charAt(0) : '')).toUpperCase();
                if (currentThemeCode) {
                  const siblingTasks = sortedTests.filter(a =>
                    !isExam(a) &&
                    String(a.payload?.theme_code || (a.shell_code ? a.shell_code.replace(/^[0-9]+/, '').charAt(0) : '')).toUpperCase() === currentThemeCode
                  );
                  for (const st of siblingTasks) {
                    const pCount = passCountByTest[st.id] || 0;
                    if (pCount < targetReps) {
                      prereqMet = false;
                      prereqTitle = `All Theme ${currentThemeCode} Tasks (${targetReps}/${targetReps} Passes Required)`;
                      break;
                    }
                  }
                }
              }

              if (prereqMet && !isExam(Test) && !isRemedialSession && !isStudentRemedialUnlocked) {
                const currentThemeCode = String(Test.payload?.theme_code || (Test.shell_code ? Test.shell_code.replace(/^[0-9]+/, '').charAt(0) : '')).toUpperCase();
                const curTopNum = parseInt(String(Test.payload?.topic_code || '').replace(/^[A-Za-z]+/, ''), 10);
                if (curTopNum > 1 && currentThemeCode) {
                  const priorTopicNum = curTopNum - 1;
                  const priorTasks = sortedTests.filter(a => {
                    if (isExam(a)) return false;
                    const aTheme = String(a.payload?.theme_code || (a.shell_code ? a.shell_code.replace(/^[0-9]+/, '').charAt(0) : '')).toUpperCase();
                    if (aTheme !== currentThemeCode) return false;
                    const aTopNum = parseInt(String(a.payload?.topic_code || '').replace(/^[A-Za-z]+/, ''), 10);
                    return aTopNum === priorTopicNum;
                  });
                  for (const pt of priorTasks) {
                    const pCount = passCountByTest[pt.id] || 0;
                    if (pCount < targetReps) {
                      prereqMet = false;
                      const remaining = targetReps - pCount;
                      prereqTitle = `Topic ${currentThemeCode}${priorTopicNum} (${pCount}/${targetReps} passes — ${remaining} more needed)`;
                      break;
                    }
                  }
                }
              }

              if (isRemedialSession || isStudentRemedialUnlocked) {
                prereqMet = true;
              }

              let statusBadge = '';
              let actionBtn   = '';
              let cardOpacity = '1';
              let cardFilter = 'none';

              if (!prereqMet) {
                cardOpacity = '0.5';
                cardFilter = 'grayscale(100%)';
                statusBadge = `<span style="background:rgba(255,255,255,0.1);color:#a1a1aa;border:1px solid rgba(255,255,255,0.2);padding:2px 8px;border-radius:4px;font-size:0.68rem;font-weight:700;text-transform:uppercase;">🔒 Locked</span>`;
                actionBtn = `<div style="text-align:right;">
                               <span style="font-size:0.7rem;color:var(--clr-text-3);">Complete <b>${prereqTitle}</b><br>to unlock this test.</span>
                             </div>`;
              } else if (inProg) {
                statusBadge = `<span style="background:rgba(${TOPSCORE_COLORS.D_RGB},0.15);color:${TOPSCORE_COLORS.D};border:1px solid rgba(${TOPSCORE_COLORS.D_RGB},0.35);padding:2px 8px;border-radius:4px;font-size:0.68rem;font-weight:700;text-transform:uppercase;">&#9203; In Progress</span>`;
                actionBtn   = `<button onclick="location.href='test.html?attempt_id=${inProg.id}&test_id=${inProg.test_id || ''}'"
                                style="background:var(--clr-accent-1);color:#fff;border:none;padding:6px 14px;border-radius:6px;font-size:0.78rem;font-weight:700;cursor:pointer;">Resume ←</button>`;
              } else if (best) {
                const isForgivenBest = Boolean(best.is_forgiven);
                const isManualBest = Boolean(best.is_manual_override || (best.forgiven_reason && best.forgiven_reason.startsWith('MANUAL_OVERRIDE')));
                const isRemedialBest = Boolean(best.is_remedial_unlocked || best.is_remedial);

                if (isForgivenBest && Number(bestPct || 0) === 0) {
                  statusBadge = `<span style="background:rgba(245,158,11,0.15);color:#f59e0b;border:1px solid rgba(245,158,11,0.35);padding:2px 8px;border-radius:4px;font-size:0.68rem;font-weight:700;text-transform:uppercase;">
                                  0%<sup class="asm-forgiven-sup" style="color:#f59e0b;font-weight:900;font-size:0.65em;" title="Dimaafkan oleh Tutor — Tes telah dilewati">ᶠ</sup> FORGIVEN</span>`;
                  actionBtn = `<div style="display:flex; align-items:center; gap:6px;">
                                 <button onclick="location.href='test.html?test_id=${Test.id}'"
                                  class="btn btn-practice"
                                  style="background:rgba(245,158,11,0.12);color:#f59e0b;border:1px solid rgba(245,158,11,0.4);padding:6px 14px;border-radius:6px;font-size:0.78rem;font-weight:700;cursor:pointer;">📖 Practice</button>
                               </div>`;
                } else {
                  const badgeBg = passed ? `rgba(${TOPSCORE_COLORS.STAR_RGB},0.15)` : `rgba(${TOPSCORE_COLORS.E_RGB},0.12)`;
                  const badgeClr= passed ? (gradeColor || TOPSCORE_COLORS.STAR) : TOPSCORE_COLORS.E;
                  const supHtml = isForgivenBest ? '<sup class="asm-forgiven-sup" style="color:#f59e0b;font-weight:900;font-size:0.65em;" title="Dimaafkan oleh Tutor">ᶠ</sup>'
                    : (isManualBest ? '<sup class="asm-manual-sup" style="color:#38bdf8;font-weight:900;font-size:0.65em;" title="Manual Score">ᴹ</sup>'
                    : (isRemedialBest ? '<sup class="test-rem-sup" style="font-size:0.7em;opacity:0.85;margin-left:2px;color:inherit;">R</sup>' : ''));

                  statusBadge = `<span style="background:${badgeBg};color:${badgeClr};border:1px solid ${badgeClr}44;padding:2px 8px;border-radius:4px;font-size:0.68rem;font-weight:700;text-transform:uppercase;">
                                  ${passed ? '&#10003; Passed' : '&#10007; Failed'} ${bestPct.toFixed(0)}%${supHtml}</span>`;

                  actionBtn = `<div style="display:flex; align-items:center;">
                                 <button onclick="location.href='result.html?attempt_id=${best.id}'"
                                  style="background:rgba(255,255,255,0.06);color:var(--clr-text-2);border:1px solid var(--clr-border);padding:6px 14px;border-radius:6px;font-size:0.78rem;font-weight:700;cursor:pointer;">View Result</button>
                               </div>`;
                }
              } else {
                statusBadge = `<span style="background:rgba(99,102,241,0.12);color:#a5b4fc;border:1px solid rgba(99,102,241,0.3);padding:2px 8px;border-radius:4px;font-size:0.68rem;font-weight:700;text-transform:uppercase;">Not Started</span>`;
                actionBtn   = `<button onclick="location.href='test.html?test_id=${Test.id}'"
                                style="background:var(--clr-accent-1);color:#fff;border:none;padding:6px 14px;border-radius:6px;font-size:0.78rem;font-weight:700;cursor:pointer;">Start Test ←</button>`;
              }

              const isTaskItem = !isExam(Test);
              const taskVisual = isTaskItem ? getTaskProgressVisual(passCountByTest[Test.id] || 0, targetReps) : null;
              const taskProgressBadge = taskVisual
                ? `<span class="task-progress-chip ${taskVisual.tierClass}" style="background:${taskVisual.bg};color:${taskVisual.color};border:1px solid ${taskVisual.border};">${taskVisual.text}</span>`
                : '';

              const gradeChip = !isTaskItem && grade ? `<span style="background:${gradeColor}22;color:${gradeColor};border:1px solid ${gradeColor}44;padding:2px 7px;border-radius:4px;font-size:0.72rem;font-weight:800;">${getGradeSymbol(grade)}</span>` : '';

              lvlHtml += `<div class="asm-modal-row" style="opacity:${cardOpacity}; filter:${cardFilter}; display:flex; justify-content:space-between; align-items:center; padding:10px 14px; margin-bottom:8px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:10px;">
                <div class="asm-modal-info">
                  <div style="font-size:0.85rem;font-weight:600;color:var(--clr-text-1);white-space:normal;line-height:1.3;" title="${Test.Test_title || Test.title || 'Test'}">
                    ${(Test.Test_title || Test.title || 'Test').replace(/^.*?-\s*\d+[a-z]{2}\s+Level\s*-\s*/i, '').replace(/Vocabulary Mastery /i, '')}
                  </div>
                  <div class="asm-modal-meta-group">
                    ${formatAnswerType(Test.answer_type) ? `<div style="font-size:0.72rem;color:var(--clr-text-3);">${formatAnswerType(Test.answer_type)}</div>` : ''}
                    ${(Test.time_limit_minutes && Number(Test.time_limit_minutes) > 0) ? `<div style="font-size:0.72rem;color:var(--clr-text-3);">⏱ ${Test.time_limit_minutes} min</div>` : ''}
                  </div>
                </div>
                <div class="asm-modal-actions">
                  ${isTaskItem ? taskProgressBadge : gradeChip}
                  ${statusBadge}
                  ${actionBtn}
                </div>
              </div>`;
            }
          }
          if (lvlHtml) {
            html += `<div style="margin-bottom:1.5rem;">
              <div style="font-size:0.75rem;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;
                          color:var(--clr-text-3);padding:0.4rem 0;border-bottom:1px solid var(--clr-border);
                          margin-bottom:0.75rem;">${lvl.name}</div>
              ${lvlHtml}
            </div>`;
          }
        }
        if (!html) {
          html = `<div style="padding:2.5rem 1.5rem;text-align:center;color:var(--clr-text-3);"><p>More tests will unlock as you progress!</p></div>`;
        }
        container.innerHTML = html;

      } catch(err) {
        container.innerHTML = `<div style="padding:2rem;text-align:center;color:var(--clr-text-3);">
          <div style="font-size:1.5rem;margin-bottom:0.5rem;">⚠️</div>
          <p style="font-size:0.85rem;">Could not load Tests: ${err.message}</p></div>`;
      }
    }

    function formatAnswerType(atype) {
      if (!atype) return '';  // T-1: hide label when type is unknown — never show "Written Test"
      if (atype === 'speech_to_text' || atype === 'spoken') return 'Speaking Test';
      if (atype === 'written') return 'Written Test';
      if (atype === 'multiple_choice' || atype === 'selection') return 'Selection';
      if (atype === 'dropdown') return 'Dropdown';
      return atype.replace('_', ' ');
    }



    // --- V1: Render Assigned Tests Section ---
    // (Existing tests logic)
    // --- Render Completed Tests Section (Bottom of Dashboard) ---
    // --- Profile Modal & History ---
    // --- Level Modal close ---
    // --- Gamification: Show Level Up Popup ---
    // --- Render Completed Tests Section (Bottom of Dashboard) ---
    // --- Profile Modal & History ---
    // --- Level Modal close ---
    // --- Gamification: Show Level Up Popup ---
    async function renderAssignedTests(tests, allAttempts) {
      // Find or create the assigned-tests section
      let section = document.getElementById('v1-tests-section');
      if (!section) {
        // Insert before the completed-Tests area
        const completedSection = document.getElementById('completed-Tests-container')?.closest('section') ||
          document.getElementById('completed-Tests-container')?.parentElement;
        section = document.createElement('section');
        section.id = 'v1-tests-section';
        section.style.cssText = 'margin: 0 0 2rem 0;';
        if (completedSection) {
          completedSection.parentElement.insertBefore(section, completedSection);
        } else {
          document.querySelector('.dashboard-content, main, .main-content')?.appendChild(section);
        }
      }

      // Build attempts map: test_id -> best attempt & pass count
      const bestByTest = {};
      const inProgressByTest = {};
      const passCountByTest = {};
      allAttempts.forEach(att => {
        const aid = att.test_id || att.Test_id;
        if (!aid) return;
        const pct = parseFloat(att.percentage ?? att.effective_score ?? 0);
        const st = (att.status || '').toUpperCase();
        if (st === 'IN_PROGRESS') {
          inProgressByTest[aid] = att;
        } else if (st === 'SUBMITTED' || st === 'AUTO_SUBMITTED' || st === 'EVALUATED') {
          if (pct >= 70) {
            passCountByTest[aid] = (passCountByTest[aid] || 0) + 1;
          }
        }
        // AGENTS.md §2.7: Report card stores strictly HIGHEST score across attempts
        if (!bestByTest[aid] || pct > parseFloat(bestByTest[aid].percentage || 0) || (pct === parseFloat(bestByTest[aid].percentage || 0) && new Date(att.submitted_at || 0) > new Date(bestByTest[aid].submitted_at || 0))) {
          bestByTest[aid] = att;
        }
      });

      // Grade colors resolved via canonical getGradeColorByScore() from grading.js

      let cards = '';
      for (const asm of tests) {
        const bestAtt = bestByTest[asm.id];
        const inProgAtt = inProgressByTest[asm.id];
        const bestPct = bestAtt ? parseFloat(bestAtt.percentage || 0) : null;
        const grade = bestPct !== null ? getGrade(bestPct) : null;
        const gradeColor = bestPct !== null ? getGradeColorByScore(bestPct) : 'var(--clr-text-1)';
        const passed = bestPct !== null && bestPct >= (asm.pass_threshold || 60);

        const isTaskItem = !isExam(asm);
        const taskVisual = isTaskItem ? getTaskProgressVisual(passCountByTest[asm.id] || 0) : null;
        const taskProgressBadge = taskVisual
          ? `<span class="task-progress-chip ${taskVisual.tierClass}" style="background:${taskVisual.bg};color:${taskVisual.color};border:1px solid ${taskVisual.border};">${taskVisual.text}</span>`
          : '';

        // Check dynamic prerequisites (0 to N parents + min score thresholds + aggregate average)
        let prereqMet = true;
        let prereqTitle = '';

        const isExamSubtype = asm.test_subtype === 'VOCAB_EXAM' || asm.test_subtype === 'PHRASE_EXAM' || asm.test_subtype === 'VOCAB_TEST' || asm.test_subtype === 'PHRASE_TEST';
        const isExamShell = (asm.shell_code || '').endsWith('-EXAM') || (asm.shell_code || '').endsWith('-TEST');
        const isExamTitle = ((asm.title || '').toLowerCase().includes('exam') || (asm.title || '').toLowerCase().includes('test')) && !(asm.title || '').toLowerCase().includes('quiz') && !(asm.title || '').toLowerCase().includes('task');
        const isThemeTest = ((asm.test_type || '').toLowerCase() === 'exam' || asm.category === 'EXAM' || isExamSubtype || isExamShell || isExamTitle) &&
                            !(asm.shell_code || '').includes('-QUIZ') &&
                            !(asm.shell_code || '').includes('-TASK') &&
                            !(asm.test_subtype || '').includes('QUIZ') &&
                            !(asm.test_subtype || '').includes('TASK') &&
                            !(asm.title || '').toLowerCase().includes('quiz') &&
                            !(asm.title || '').toLowerCase().includes('task') &&
                            (asm.test_type || '').toLowerCase() !== 'quiz';

        if (isThemeTest) {
          const themeCode = asm.payload?.theme_code;
          if (themeCode) {
            const siblingTasks = tests.filter(a =>
              (a.test_type === 'task' || a.test_type === 'quiz' || a.category === 'TASK' || a.category === 'QUIZ' || a.test_subtype === 'VOCAB_TASK' || a.test_subtype === 'PHRASE_TASK' || a.test_subtype === 'VOCAB_QUIZ' || a.test_subtype === 'PHRASE_QUIZ' || (a.shell_code || '').includes('-TASK') || (a.shell_code || '').includes('-QUIZ')) &&
              a.payload?.theme_code === themeCode &&
              a.level_id === asm.level_id &&
              a.class_id === asm.class_id
            );

            // 7×7 Repetitive Mastery Hard Gate: All sibling tasks must reach 7 passes (>= 70%)
            for (const task of siblingTasks) {
              const pCount = passCountByTest[task.id] || 0;
              if (pCount < 7) {
                prereqMet = false;
                prereqTitle = `All Theme Tasks Mastery (7/7 Passes Required)`;
                break;
              }
            }
          }

          // Sequential Intra-Theme & Inter-Theme Exam Prerequisite Gating
          const liveSess = (asm.payload?.test_session);
          const isSessLive = liveSess?.status === 'UNLOCKED' &&
            (!liveSess.auto_close_at || new Date(liveSess.auto_close_at) > new Date()) &&
            (!Array.isArray(liveSess.allowed_student_ids) || liveSess.allowed_student_ids.length === 0 || liveSess.allowed_student_ids.includes(session?.student_id || session?.id));

          const isRemedialSession = liveSess?.is_remedial === true ||
            (Array.isArray(liveSess?.remedial_student_ids) && liveSess.remedial_student_ids.includes(session?.student_id || session?.id));
          const isStudentRemedialUnlocked = Boolean(bestByTest[asm.id]?.is_remedial_unlocked || bestByTest[asm.id]?.is_remedial);

          // 1. Inter-Theme Gating: Theme B, C, D exams strictly require all prior theme's exams to be passed (>= 60%)
          const currentTheme = String(themeCode || asm.payload?.theme_code || (asm.shell_code ? asm.shell_code.replace(/^[0-9]+/, '').charAt(0) : '')).toUpperCase();
          const themeSequence = ['A', 'B', 'C', 'D'];
          const curThemeIdx = themeSequence.indexOf(currentTheme);

          if (curThemeIdx > 0 && !isRemedialSession && !isStudentRemedialUnlocked) {
            const priorTheme = themeSequence[curThemeIdx - 1];
            const priorExams = tests.filter(a => {
              if (!isExam(a)) return false;
              const tc = String(a.payload?.theme_code || (a.shell_code ? a.shell_code.replace(/^[0-9]+/, '').charAt(0) : '')).toUpperCase();
              return tc === priorTheme && a.level_id === asm.level_id && a.class_id === asm.class_id;
            });

            if (priorExams.length > 0) {
              for (const pe of priorExams) {
                const peBest = bestByTest[pe.id];
                const peRawPct = peBest ? parseFloat(peBest.percentage || 0) : null;
                const peRem = Boolean(peBest && (peBest.is_remedial_unlocked || peBest.is_remedial));
                const pePct = peRem && peRawPct !== null ? Math.min(peRawPct, 60.0) : peRawPct;
                const peMin = pe.minimum_required_score || pe.pass_threshold || 70;
                const pePassed = Boolean(peBest?.is_forgiven) || (pePct !== null && (pePct >= peMin || (peRem && pePct >= 60)));
                if (!pePassed) {
                  prereqMet = false;
                  prereqTitle = `Theme ${priorTheme} Exams (Passed ≥${peMin}% required)`;
                  break;
                }
              }
            }
          }

          const isPhrasesExam = isExam(asm) && Boolean(
            asm.category === 'phrases' || asm.test_subtype === 'PHRASE_EXAM' ||
            (asm.title || '').toLowerCase().includes('phrase') ||
            (asm.shell_code || '').toUpperCase().includes('PHRASE') ||
            (asm.payload?.subtype || '').toUpperCase().includes('PHRASE')
          );

          // 2. Intra-Theme Sequential Gating: Phrases Exam requires sibling Words Exam >= 70%
          if (prereqMet && isPhrasesExam && !isRemedialSession && !isStudentRemedialUnlocked) {
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
              const wMin = siblingWordsExam.minimum_required_score || siblingWordsExam.pass_threshold || 70;
              const wPassed = wPct !== null && (wPct >= wMin || (wRem && wPct >= 60));
              if (!wPassed) {
                prereqMet = false;
                prereqTitle = `${siblingWordsExam.display_name || siblingWordsExam.title || 'Words Exam'} (Score ≥${wMin}% required)`;
              }
            }
          }

          // Explicit Remedial Session bypass authorization
          if (isRemedialSession || isStudentRemedialUnlocked) {
            prereqMet = true;
          }
        } else if (asm.prerequisites && typeof asm.prerequisites === 'object') {
          const parents = Array.isArray(asm.prerequisites.parents) ? asm.prerequisites.parents : [];
          let totalScore = 0;
          let count = 0;
          for (const parent of parents) {
            const pid = parent.test_id;
            const minScore = parent.min_score || 60;
            const parentBest = bestByTest[pid];
            const parentPct = parentBest ? parseFloat(parentBest.percentage || 0) : null;
            if (parentPct === null || parentPct < minScore) {
              prereqMet = false;
              const pObj = tests.find(a => a.id === pid);
              prereqTitle = (pObj ? (pObj.title || pObj.name) : 'Prerequisite') + ` (Required: ≥${minScore}%)`;
              break;
            }
            totalScore += parentPct;
            count++;
          }
          if (prereqMet && asm.prerequisites.aggregate_avg_threshold && count > 0) {
            const avg = totalScore / count;
            if (avg < asm.prerequisites.aggregate_avg_threshold) {
              prereqMet = false;
              prereqTitle = `Aggregate Avg Required: ${asm.prerequisites.aggregate_avg_threshold}% (Current: ${Math.round(avg)}%)`;
            }
          }
        } else if (asm.prerequisite_id || asm.prerequisite_test_id || asm.prerequisite_Test_id) {
          const pid = asm.prerequisite_id || asm.prerequisite_test_id || asm.prerequisite_Test_id;
          const pObj = tests.find(a => a.id === pid);
          const isPrereqTask = pObj ? !isExam(pObj) : false;
          if (isPrereqTask) {
            const pCount = passCountByTest[pid] || 0;
            const isForgiven = Boolean(bestByTest[pid]?.is_forgiven);
            prereqMet = isForgiven || pCount >= 7;
            prereqTitle = pObj ? `${pObj.title || 'Prerequisite'} (7/7 Passes Required)` : 'Prerequisite Task (7/7 Passes Required)';
          } else {
            const prereqBest = bestByTest[pid];
            const prereqPct = prereqBest ? parseFloat(prereqBest.percentage || 0) : null;
            prereqMet = Boolean(prereqBest?.is_forgiven) || (prereqPct !== null && prereqPct >= (asm.prerequisite_min_score || 60));
            prereqTitle = pObj ? (pObj.title || pObj.Test_title || 'Prerequisite') : 'Prerequisite Test';
          }
        }

        // Live test session state
        const liveSession = asm.payload?.test_session;
        const isSessionUnlocked = liveSession?.status === 'UNLOCKED' && (!liveSession.auto_close_at || new Date(liveSession.auto_close_at) > new Date());
        const isWhitelisted = isSessionUnlocked && (!Array.isArray(liveSession?.allowed_student_ids) || liveSession.allowed_student_ids.length === 0 || liveSession.allowed_student_ids.includes(session?.student_id || session?.id));

        // Availability window
        const now = new Date();
        const availStart = asm.availability_start ? new Date(asm.availability_start) : null;
        const availEnd = asm.availability_end ? new Date(asm.availability_end) : null;
        const inWindow = (!availStart || now >= availStart) && (!availEnd || now <= availEnd);

        // Status
        let statusBadge = '';
        let actionBtn = '';
        const isCompleted = bestAtt && ['SUBMITTED', 'AUTO_SUBMITTED'].includes((bestAtt.status || '').toUpperCase());

        const isLocked = !prereqMet;

        if (isLocked) {
          statusBadge = `<span class="badge" style="background:rgba(255,255,255,0.1);color:#a1a1aa;border:1px solid rgba(255,255,255,0.2);">🔒 Locked</span>`;
          actionBtn = `<div style="text-align:right;">
                         <span style="font-size:0.7rem;color:var(--clr-text-3);">Complete <b>${escapeHtml(prereqTitle)}</b><br>to unlock.</span>
                       </div>`;
        } else if (!inWindow) {
          statusBadge = `<span class="badge" style="background:rgba(148,163,184,0.15);color:#94a3b8;border:1px solid rgba(148,163,184,0.3);">Not Yet Available</span>`;
          actionBtn = `<button class="btn btn-sm" disabled style="opacity:0.45;cursor:not-allowed;background:rgba(255,255,255,0.05);border:1px solid var(--clr-border);">Unavailable</button>`;
        } else if (inProgAtt) {
          statusBadge = `<span class="badge" style="background:rgba(${TOPSCORE_COLORS.D_RGB},0.15);color:${TOPSCORE_COLORS.D};border:1px solid rgba(${TOPSCORE_COLORS.D_RGB},0.3);">&#9658; In Progress</span>`;
          actionBtn = `<button class="btn btn-warning btn-sm" data-aid="${asm.id}">Resume</button>`;
        } else if (isCompleted) {
          const isAsmTest = ((asm.test_type || '').toLowerCase() === 'exam' ||
                            (asm.test_subtype || '').includes('TEST') ||
                            (asm.shell_code || '').endsWith('-TEST')) &&
                            !(asm.shell_code || '').includes('-TASK') &&
                            !(asm.test_subtype || '').includes('TASK') &&
                            !(asm.title || '').toLowerCase().includes('task') &&
                            (asm.test_type || '').toLowerCase() !== 'quiz';

          const session = asm.payload?.test_session;
          const isSessionUnlocked = session?.status === 'UNLOCKED' && (!session.auto_close_at || new Date(session.auto_close_at) > new Date());

          let retakesAllowed = asm.max_attempts == null || (asm.max_attempts > (allAttempts.filter(a => (a.test_id || a.Test_id) === asm.id && (a.status || '').toUpperCase() !== 'IN_PROGRESS').length));

          if (isAsmTest) {
            // For formal Tests: Retake allowed if session is unlocked by Tutor (or Normal session for score improvement)
            if (passed) {
              retakesAllowed = isSessionUnlocked && !session?.is_remedial;
            } else {
              retakesAllowed = retakesAllowed && isSessionUnlocked;
            }
          }

          statusBadge = passed
            ? `<span class="badge" style="background:rgba(${TOPSCORE_COLORS.STAR_RGB},0.15);color:${TOPSCORE_COLORS.STAR};border:1px solid rgba(${TOPSCORE_COLORS.STAR_RGB},0.3);">✓ Passed</span>`
            : `<span class="badge" style="background:rgba(${TOPSCORE_COLORS.D_RGB},0.15);color:${TOPSCORE_COLORS.D};border:1px solid rgba(${TOPSCORE_COLORS.D_RGB},0.3);">Needs Improvement</span>`;

          const canRetake = retakesAllowed && (!isAsmTest || !passed);

          if (canRetake) {
            actionBtn = `<div style="display:flex;gap:6px;"><button class="btn btn-sm" style="background:rgba(255,255,255,0.05);border:1px solid var(--clr-border);padding:4px 8px;" data-aid-result="${bestAtt?.id}">View</button><button class="btn btn-sm btn-primary" style="padding:4px 8px;" data-aid="${asm.id}">Retake</button></div>`;
          } else if (isAsmTest && !passed && !isSessionUnlocked) {
            actionBtn = `<div style="display:flex;gap:6px;align-items:center;"><button class="btn btn-sm" style="background:rgba(255,255,255,0.05);border:1px solid var(--clr-border);padding:4px 8px;" data-aid-result="${bestAtt?.id}">View</button><span style="font-size:0.7rem;color:${TOPSCORE_COLORS.D};font-weight:700;padding:3px 6px;border-radius:4px;background:rgba(${TOPSCORE_COLORS.D_RGB},0.1);border:1px solid rgba(${TOPSCORE_COLORS.D_RGB},0.25);">🔒 Locked</span></div>`;
          } else {
            actionBtn = `<button class="btn btn-sm" style="background:rgba(255,255,255,0.05);border:1px solid var(--clr-border);" data-aid-result="${bestAtt?.id}">View Result</button>`;
          }

          if (isTaskItem && !inProgAtt) {
            const drillLabel = (taskVisual && taskVisual.count >= 7) ? 'Retake Drill' : ((taskVisual && taskVisual.count > 0) ? 'Drill Again' : 'Start Drill');
            actionBtn = `<div style="display:flex;gap:6px;align-items:center;">
              <button class="btn btn-sm" style="background:rgba(255,255,255,0.05);border:1px solid var(--clr-border);padding:4px 8px;" data-aid-result="${bestAtt?.id}">View</button>
              <button class="btn btn-sm btn-primary" style="padding:4px 8px;" data-aid="${asm.id}">${drillLabel}</button>
            </div>`;
          }
        } else {
          statusBadge = `<span class="badge" style="background:rgba(56,189,248,0.15);color:#38bdf8;border:1px solid rgba(56,189,248,0.3);">Ready</span>`;
          const readyLabel = isTaskItem ? 'Start Drill' : 'Start';
          actionBtn = `<button class="btn btn-primary btn-sm" data-aid="${asm.id}">${readyLabel}</button>`;
        }

        const duration = asm.working_duration_minutes || asm.time_limit_minutes || 60;
        const qCount = asm.question_count || '—';
        const asmType = asm.test_type || asm.Test_type || 'Test';
        const asmTitle = asm.title || asm.Test_title || 'Test';
        const className = asm.classes?.name || '';

        cards += `
          <div class="v1-test-card" data-test-id="${asm.id}" ${isLocked ? 'data-locked="true"' : ''} style="
            background: var(--clr-card, rgba(30,41,59,0.8));
            border: 1px solid var(--clr-border, rgba(255,255,255,0.08));
            border-radius: 14px;
            padding: 1.25rem 1.5rem;
            margin-bottom: 0.75rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            flex-wrap: wrap;
            transition: border-color 0.2s;
            ${isLocked ? 'opacity: 0.65; filter: grayscale(100%); cursor: not-allowed;' : ''}
          ">
            <div style="flex:1;min-width:200px;">
              <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.4rem;">
                <span style="font-weight:700;font-size:0.95rem;color:var(--clr-text-1);">${escapeHtml(asmTitle)}</span>
                ${className ? `<span class="badge badge-neutral" style="font-size:0.7rem;">${escapeHtml(className)}</span>` : ''}
                <span class="badge" style="font-size:0.68rem;background:rgba(255,255,255,0.06);color:var(--clr-text-3);border:1px solid var(--clr-border);">${escapeHtml(asmType)}</span>
              </div>
              <div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;">
                ${isTaskItem && taskProgressBadge ? taskProgressBadge : ''}
                <span style="font-size:0.78rem;color:var(--clr-text-3);">&#9201; ${duration} min</span>
                ${qCount !== '—' ? `<span style="font-size:0.78rem;color:var(--clr-text-3);">&#128203; ${qCount} Questions</span>` : ''}
                ${statusBadge}
              </div>
              ${!prereqMet && prereqTitle ? `<div style="margin-top:0.5rem;"><span style="font-size:0.72rem;color:#f87171;">\uD83D\uDD12 Complete prerequisite first: <em>${escapeHtml(prereqTitle)}</em></span></div>` : ''}
            </div>
            <div style="display:flex;align-items:center;gap:0.75rem;flex-shrink:0;">
              ${bestPct !== null ? `
                <div style="text-align:center;">
                  <div style="font-size:1.1rem;font-weight:800;color:${gradeColor}${(grade === '★' || grade === 'S') ? `;text-shadow:0 0 10px rgba(${TOPSCORE_COLORS.STAR_RGB}, 0.45);` : ''}">${bestPct.toFixed(0)}%${Boolean(bestAtt?.is_remedial_unlocked || bestAtt?.is_remedial) ? '<sup class="test-rem-sup" style="font-size:0.7em;opacity:0.85;margin-left:2px;color:inherit;">R</sup>' : ''}</div>
                  <div style="font-size:0.7rem;color:var(--clr-text-3);">Best Score</div>
                </div>
                ${(grade === '★' || grade === 'S' || bestPct >= 100)
                  ? `<div class="grade-star" style="width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.1rem;box-shadow:0 0 12px rgba(${TOPSCORE_COLORS.STAR_RGB}, 0.45);color:${TOPSCORE_COLORS.STAR};border:1.5px solid ${TOPSCORE_COLORS.STAR};">★</div>`
                  : `<div style="width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:0.85rem;border:2px solid ${gradeColor};color:${gradeColor};">${getGradeSymbol(grade)}</div>`
                }
              ` : ''}
              ${actionBtn}
            </div>
          </div>
        `;
      }

      section.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
          <h3 style="font-size:1rem;font-weight:700;color:var(--clr-text-1);margin:0;">\uD83D\uDCCB Assigned Tests <span style="font-size:0.75rem;color:var(--clr-text-3);font-weight:400;margin-left:8px;">${tests.length} total</span></h3>
        </div>
        ${cards || '<div class="empty-state" style="padding:2rem;text-align:center;"><p class="text-muted">No tests assigned to you yet.</p></div>'}
      `;

      // Wire up buttons
      section.querySelectorAll('[data-aid]').forEach(btn => {
        btn.addEventListener('click', () => {
          sessionStorage.setItem('topscore_test_id', btn.dataset.aid);
          window.location.href = 'test.html';
        });
      });
      section.querySelectorAll('[data-aid-result]').forEach(btn => {
        btn.addEventListener('click', () => {
          window.location.href = `result.html?attempt_id=${btn.dataset.aidResult}`;
        });
      });
    }

    // ── Overall Stats Calculation (AGENTS.md §2.8 & §2.10) ──

    function populateUpNext(attempts, myTests) {
      renderNextAssignmentHero(myTests, attempts, window._loadedClasses);
    }

    async function computeOverallStats(attempts, tests = []) {
      // Rule 2.8 & Exam-Only Metric Rule:
      // Academic Score %, Grade, and Points are evaluated EXCLUSIVELY from Exams.
      // Tasks count strictly towards activity completion & badges, never inflating academic score.
      const activeAsmMap = new Map((tests || []).map(a => [a.id, a]));
      const allBestMap = {};
      const examBestMap = {};

      attempts.forEach(att => {
        if (att.tests && att.tests.deleted_at) return;
        const uniqueKey = att.test_instance_id || att.test_id || att.Test_id;
        if (!uniqueKey) return;
        const asm = activeAsmMap.get(uniqueKey) || att.tests;
        if (asm?.deleted_at) return;

        const rawPct = parseFloat(att.percentage || 0);
        const isRem = Boolean(att.is_remedial_unlocked || att.is_remedial);
        const effPct = isRem ? Math.min(rawPct, 60.0) : rawPct;
        const attTime = new Date(att.submitted_at || att.created_at || 0).getTime();

        if (allBestMap[uniqueKey] == null || effPct > allBestMap[uniqueKey]) {
          allBestMap[uniqueKey] = effPct;
        }

        if (isExam(asm)) {
          const totalQ = Number(att.total_questions || asm?.total_questions || asm?.payload?.total_questions || 50);
          const rawScore = Number(att.score ?? 0);
          const maxRemPts = totalQ * 0.6;
          const effPoints = isRem ? Math.min(rawScore, maxRemPts) : rawScore;
          const curPts = examBestMap[uniqueKey]?.effPoints ?? -1;
          const curPct = examBestMap[uniqueKey]?.effPct ?? -1;
          const curTime = examBestMap[uniqueKey]?.attTime || 0;
          if (examBestMap[uniqueKey] == null || effPoints > curPts || (effPoints === curPts && effPct > curPct) || (effPoints === curPts && attTime > curTime)) {
            examBestMap[uniqueKey] = { effPct, effPoints, totalQ, test: asm, testId: uniqueKey, attTime };
          }
        }
      });

      // Total completed activities (Tasks + Exams) for badges / progress
      const completedCount = Object.keys(allBestMap).filter(k => !k.endsWith('_locked')).length;
      const TestsCountEl = document.getElementById('stat-Tests-done');
      if (TestsCountEl) TestsCountEl.textContent = completedCount;
      const ovCountEl = document.getElementById('overview-Tests-count');
      if (ovCountEl) ovCountEl.textContent = completedCount;

      // Academic Score & Grade: Calculated EXCLUSIVELY from Exams via Milestone Progression Engine
      const examEntries = Object.entries(examBestMap)
        .filter(([k]) => !k.endsWith('_locked'))
        .map(([, v]) => v);

      const allClassExams = (Array.isArray(window._allTests) && window._allTests.length > 0)
        ? window._allTests.filter(isExam)
        : (Array.isArray(tests) ? tests.filter(isExam) : []);

      const mastery = (typeof computeMilestoneExamMastery === 'function')
        ? computeMilestoneExamMastery(examEntries, allClassExams)
        : {
            totalPoints: examEntries.reduce((acc, curr) => acc + (curr.effPoints || 0), 0),
            overallScore: 0,
            grade: '—',
            denominator: 0,
            completedExamCount: examEntries.length,
            completedWeeklyCount: examEntries.length
          };

      const hasExam = (mastery.completedExamCount ?? mastery.completedWeeklyCount ?? 0) > 0;

      // Rule 2.8: Use average of completed exam percentages as the academic score (not curriculum-wide denominator)
      const validExamEntriesForCard = examEntries.filter(e => {
        const isPureForgivenZero = Boolean(e.isForgiven) && !e.isManual && Number(e.effPoints ?? e.points ?? 0) === 0;
        return !isPureForgivenZero;
      });
      let avgPct = validExamEntriesForCard.length > 0
        ? Math.round(validExamEntriesForCard.reduce((sum, e) => sum + Number(e.effPct ?? e.pct ?? 0), 0) / validExamEntriesForCard.length)
        : (hasExam ? mastery.overallScore : 0);
      let overallGrade = validExamEntriesForCard.length > 0
        ? (typeof calculateGrade === 'function' ? calculateGrade(avgPct) : mastery.grade)
        : (hasExam ? mastery.grade : '—');
      let isGradeS = overallGrade === '★' || overallGrade === 'S' || avgPct >= 100;
      let targetColor = '#94a3b8';
      let rgbColor = '148, 163, 184';

      if (hasExam) {
        const theme = (GRADE_PALETTE && GRADE_PALETTE[overallGrade]) ? GRADE_PALETTE[overallGrade] : (GRADE_PALETTE['★'] || {
          color: TOPSCORE_COLORS.STAR, dark: '#006400', light: '#86efac', rgb: TOPSCORE_COLORS.STAR_RGB, glow: `rgba(${TOPSCORE_COLORS.STAR_RGB}, 0.45)`
        });
        targetColor = theme.color;
        rgbColor = theme.rgb || TOPSCORE_COLORS.STAR_RGB;
      }


      const scoreEl = document.getElementById('stat-overall-score');
      if (scoreEl) {
        scoreEl.textContent = hasExam ? `${avgPct}%` : '0%';
        scoreEl.className = hasExam ? `fw-800 banner-score-text text-grade-${overallGrade}` : 'fw-800 banner-score-text';
      }

      const gradeBadgeValue = document.getElementById('stat-overall-grade-value');
      if (gradeBadgeValue) {
        if (!hasExam) {
          gradeBadgeValue.textContent = '—';
        } else if (isGradeS) {
          gradeBadgeValue.innerHTML = `
            <svg class="pure-star-svg" width="46" height="46" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 0 14px rgba(${TOPSCORE_COLORS.STAR_RGB}, 0.95)) drop-shadow(0 0 24px rgba(134, 239, 172, 0.65)); display:inline-block; vertical-align:middle;">
              <defs>
                <linearGradient id="starGreenDashGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#86efac" />
                  <stop offset="50%" stop-color="${TOPSCORE_COLORS.STAR}" />
                  <stop offset="100%" stop-color="#006400" />
                </linearGradient>
              </defs>
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="url(#starGreenDashGrad)" />
            </svg>
          `;
        } else {
          gradeBadgeValue.textContent = overallGrade;
        }
      }

      const achievementTextEl = document.getElementById('dashboard-achievement-text');
      const isAlumni = session.level_number === 0 || (session.level_name || '').toLowerCase() === 'alumni';

      if (isAlumni) {
        overallGrade = 'X';
        targetColor = '#8B5CF6';
        rgbColor = '139, 92, 246';
        if (gradeBadgeValue) gradeBadgeValue.textContent = 'X';
        if (avgScoreDisplay) avgScoreDisplay.textContent = '—';
        if (achievementTextEl) {
          achievementTextEl.textContent = 'ALUMNI';
          achievementTextEl.style.color = targetColor;
          achievementTextEl.style.filter = `drop-shadow(0 0 10px rgba(${rgbColor}, 0.75))`;
        }
      } else if (!hasExam) {
        overallGrade = "LET'S GO";
        targetColor = '#94a3b8';
        rgbColor = '148, 163, 184';
        if (gradeBadgeValue) gradeBadgeValue.textContent = '—';
        if (avgScoreDisplay) avgScoreDisplay.textContent = '—';
        if (achievementTextEl) {
          achievementTextEl.textContent = "LET'S GO";
          achievementTextEl.style.color = targetColor;
          achievementTextEl.style.filter = `drop-shadow(0 0 10px rgba(${rgbColor}, 0.75))`;
        }
      } else {
        const statusWord = getAchievementStatus(overallGrade, avgPct);
        if (achievementTextEl) {
          achievementTextEl.textContent = statusWord;
          achievementTextEl.style.color = targetColor;
          if (isGradeS) {
            achievementTextEl.style.filter = `drop-shadow(0 0 10px rgba(${TOPSCORE_COLORS.STAR_RGB}, 0.85))`;
          } else {
            achievementTextEl.style.filter = `drop-shadow(0 0 8px rgba(${rgbColor}, 0.6))`;
          }
        }
      }

      // Set globally on documentElement and body so all components inherit seamlessly
      document.documentElement.style.setProperty('--tier-color', targetColor);
      document.documentElement.style.setProperty('--tier-rgb', rgbColor);
      document.body.style.setProperty('--tier-color', targetColor);
      document.body.style.setProperty('--tier-rgb', rgbColor);
      window._tierColor = targetColor;
      window._tierRgb = rgbColor;

      // Instant Pre-Paint Persistence: Store authentic student tier for zero-flash startup
      try {
        const tierPayload = JSON.stringify({
          color: targetColor,
          rgb: rgbColor,
          grade: overallGrade,
          updated_at: Date.now()
        });
        localStorage.setItem(`topscore_tier_${session.student_id}`, tierPayload);
        sessionStorage.setItem(`topscore_tier_${session.student_id}`, tierPayload);
      } catch (_) {}

      // 1. Ambient Hero Banner Aura & Modular CSS Variables across all Lobby Cards
      const tierElements = [
        document.getElementById('welcome-banner-section'),
        document.getElementById('dashboard-grade-legend'),
        document.getElementById('dashboard-achievement-card'),
        document.getElementById('bottom-dock-section'),
        document.getElementById('bottom-ad-banner'),
        document.querySelector('.next-test-card'),
        document.getElementById('dashboard-classes-section'),
        document.getElementById('dashboard-classes-bar'),
        document.getElementById('dashboard-classes-boxes')
      ];
      tierElements.forEach(el => {
        if (el) {
          el.dataset.tier = isAlumni ? 'X' : (!hasExam ? 'NEW' : (isGradeS ? 'S' : overallGrade));
          el.style.setProperty('--tier-color', targetColor);
          el.style.setProperty('--tier-rgb', rgbColor);
          if (hasExam && isGradeS) {
            el.style.borderColor = `rgba(${TOPSCORE_COLORS.STAR_RGB}, 0.65)`;
            el.style.boxShadow = `0 0 25px rgba(${TOPSCORE_COLORS.STAR_RGB}, 0.35), 0 8px 20px -6px rgba(0, 0, 0, 0.5)`;
            el.style.background = `radial-gradient(ellipse 90% 70% at 50% 0%, rgba(${TOPSCORE_COLORS.STAR_RGB}, 0.22), transparent 75%), #0f172a`;
          } else {
            // For all evaluated grades (A, B, C, D, E) and New Student / Alumni (Purple):
            // The border and background strictly follow the calculated score/grade!
            el.style.borderColor = `rgba(${rgbColor}, 0.55)`;
            el.style.boxShadow = `0 0 18px rgba(${rgbColor}, 0.25), 0 6px 18px -5px rgba(0, 0, 0, 0.35)`;
            el.style.background = `radial-gradient(ellipse 90% 70% at 50% 0%, rgba(${rgbColor}, 0.15), transparent 75%), #0f172a`;
          }
        }
      });


      // 2. Avatar Container Ring & Glow
      const avatarBox = document.getElementById('banner-avatar-container');
      if (avatarBox) {
        if (isGradeS) {
          avatarBox.style.background = `linear-gradient(135deg, #86efac 0%, ${TOPSCORE_COLORS.STAR} 45%, #006400 100%)`;
          avatarBox.style.boxShadow = `0 0 25px rgba(${TOPSCORE_COLORS.STAR_RGB}, 0.85), 0 0 45px rgba(${TOPSCORE_COLORS.STAR_RGB}, 0.45)`;
          avatarBox.style.border = `2.5px solid ${TOPSCORE_COLORS.STAR}`;
          avatarBox.classList.add('grade-star');
        } else {
          avatarBox.classList.remove('grade-star');
          avatarBox.style.background = 'rgba(15, 23, 42, 0.9)';
          avatarBox.style.boxShadow = `0 0 16px rgba(${rgbColor}, 0.45), 0 4px 14px rgba(0, 0, 0, 0.35)`;
          avatarBox.style.border = `2.5px solid ${targetColor}`;
        }
      }

      // 3. Score Value Display
      const scoreVal = document.getElementById('bottom-stat-avg-score');
      if (scoreVal) {
        scoreVal.textContent = hasExam ? `${avgPct}%` : '—';
        scoreVal.style.color = targetColor;
        if (isGradeS) {
          scoreVal.style.filter = `drop-shadow(0 0 14px rgba(${TOPSCORE_COLORS.STAR_RGB}, 0.95)) drop-shadow(0 0 24px rgba(${TOPSCORE_COLORS.STAR_RGB}, 0.45))`;
          scoreVal.classList.add('text-grade-star');
        } else {
          scoreVal.classList.remove('text-grade-star');
          scoreVal.style.filter = `drop-shadow(0 0 10px rgba(${rgbColor}, 0.55))`;
        }
      }

      // 4. Grade Value Display
      const gradeVal = document.getElementById('stat-overall-grade-value');
      if (gradeVal) {
        gradeVal.style.color = targetColor;
        if (isGradeS) {
          gradeVal.style.filter = `drop-shadow(0 0 14px rgba(${TOPSCORE_COLORS.STAR_RGB}, 0.95)) drop-shadow(0 0 24px rgba(${TOPSCORE_COLORS.STAR_RGB}, 0.45))`;
          gradeVal.classList.add('text-grade-star');
        } else {
          gradeVal.classList.remove('text-grade-star');
          gradeVal.style.filter = `drop-shadow(0 0 10px rgba(${rgbColor}, 0.55))`;
        }
      }

      // 5. Border Accent on Score & Grade Cards (Symmetrical Boxes)
      const scoreCard = document.getElementById('banner-score-box');
      if (scoreCard) {
        scoreCard.style.borderColor = isGradeS ? `rgba(${TOPSCORE_COLORS.STAR_RGB}, 0.6)` : `rgba(${rgbColor}, 0.35)`;
        scoreCard.style.boxShadow = isGradeS
          ? `0 0 20px rgba(${TOPSCORE_COLORS.STAR_RGB}, 0.45), 0 6px 16px rgba(0, 0, 0, 0.25)`
          : `0 0 12px rgba(${rgbColor}, 0.15), 0 4px 14px rgba(0, 0, 0, 0.2)`;
      }
      const gradeCard = document.getElementById('banner-grade-box');
      if (gradeCard) {
        gradeCard.style.borderColor = isGradeS ? `rgba(${TOPSCORE_COLORS.STAR_RGB}, 0.6)` : `rgba(${rgbColor}, 0.35)`;
        gradeCard.style.boxShadow = isGradeS
          ? `0 0 20px rgba(${TOPSCORE_COLORS.STAR_RGB}, 0.45), 0 6px 16px rgba(0, 0, 0, 0.25)`
          : `0 0 12px rgba(${rgbColor}, 0.15), 0 4px 14px rgba(0, 0, 0, 0.2)`;
      }

      renderCompletedTestsBottom(attempts, avgPct);
      populateUpNext(attempts, tests);
    }

    // --- Render Completed Tests Section (Bottom of Dashboard - Dual Panel) ---
    function renderCompletedTestsBottom(attempts = [], testsParam = null) {
      const container = document.getElementById('completed-Tests-container');
      const countBadge = document.getElementById('dock-completed-count-badge');
      if (!container) return;

      const activeClassId = window._selectedClassId || (window._loadedClasses && window._loadedClasses[0]?.id);
      const allClassTests = (Array.isArray(testsParam) && testsParam.length > 0)
        ? testsParam
        : (window._allTests || []);

      // Published tests belonging to this active class (excluding deleted/draft)
      const publishedClassTests = allClassTests.filter(t => {
        const cid = t.class_id || t.Class_id;
        const isClassMatch = !activeClassId || cid === activeClassId;
        const isPub = (t.status || '').toUpperCase() === 'PUBLISHED';
        return isClassMatch && isPub && !t.deleted_at;
      });

      // Sort publishedClassTests by curriculum display order
      publishedClassTests.sort((a, b) => {
        const ordA = a.display_order ?? 999;
        const ordB = b.display_order ?? 999;
        if (ordA !== ordB) return ordA - ordB;
        return (a.title || '').localeCompare(b.title || '');
      });

      // Filter valid submitted attempts for this student
      const validAttempts = (attempts || []).filter(att => {
        if (att.tests && att.tests.deleted_at) return false;
        const st = (att.status || '').toLowerCase();
        return st === 'submitted' || st === 'auto_submitted' || st === 'evaluated' || st === 'graded';
      });

      // Map best score & best grade per test
      const bestByTest = {};
      const passCountByTest = {};
      validAttempts.forEach(att => {
        const tid = att.test_id || att.tests?.id;
        if (!tid) return;
        const rawPct = parseFloat(att.percentage || 0);
        const isRem = Boolean(att.is_remedial_unlocked || att.is_remedial);
        const effPct = isRem ? Math.min(rawPct, 60.0) : rawPct;
        const grade = att.grade || (typeof calculateGrade === 'function' ? calculateGrade(effPct) : 'E');
        const prev = bestByTest[tid];
        if (!prev || effPct > prev.effPct) {
          bestByTest[tid] = { effPct, grade, isRem, rawPct, is_forgiven: Boolean(att.is_forgiven) };
        }
        if (att.is_forgiven || effPct >= 50.0) {
          passCountByTest[tid] = (passCountByTest[tid] || 0) + 1;
        }
      });

      // STRICT FILTER:
      // 1. Tests that have never been taken (!bestByTest[t.id], like C Words Exam with — —) MUST NOT appear.
      // 2. Already taken exams (like Exam A 74%, Exam B 99%) MUST appear.
      // 3. Tasks with 0% and 0 passes (like uncompleted C4) MUST NOT appear.
      const completedOnlyTests = publishedClassTests.filter(t => {
        const best = bestByTest[t.id];
        if (!best) return false; // Must have an actual completed attempt record

        const isEx = (t.test_type || '').toLowerCase() === 'exam' ||
                     (t.category || '').toUpperCase() === 'EXAM' ||
                     (t.title || '').toLowerCase().includes('exam');

        if (isEx) {
          // Exam that has been taken with a valid score or grade MUST appear
          return best.effPct > 0 || (best.grade && best.grade !== '—' && best.grade !== 'E');
        } else {
          // Task must have at least 1 attempt with a score > 0%
          const taskAttempts = validAttempts.filter(a => (a.test_id || a.tests?.id) === t.id);
          return taskAttempts.length >= 1 && best.effPct > 0;
        }
      });

      if (countBadge) {
        countBadge.textContent = completedOnlyTests.length;
      }

      if (!completedOnlyTests.length) {
        container.innerHTML = `
          <div class="empty-state p-4 text-center" style="padding: 24px 12px;">
            <p style="color:var(--clr-text-3); font-size:0.82rem; margin:0;">No completed tests yet.</p>
          </div>
        `;
        return;
      }

      // Order strictly from latest completed test down to earliest
      const sortedAccessible = [...completedOnlyTests].reverse();

      let html = '';
      sortedAccessible.forEach((t, idx) => {
        const num = idx + 1;
        const best = bestByTest[t.id];
        const hasTaken = Boolean(best);
        const testTitle = t.title || t.name || 'Test';

        // Distinguish Exam vs Task
        const isExamItem = (t.test_type || '').toLowerCase() === 'exam' ||
                           (t.category || '').toUpperCase() === 'EXAM' ||
                           (t.title || '').toLowerCase().includes('exam');

        let scoreHtml = '—';
        let gradeHtml = '—';
        let btnBorderColor = '#38bdf8';
        let btnRgb = '56, 189, 248';
        let btnFillColor = '#38bdf8';

        // Dynamic Title Font Color:
        // For Exams: Matches the earned Grade/Score color!
        // For Tasks: Clean White (#f8fafc)
        let titleColor = '#f8fafc';
        let titleFontWeight = '700';

        let numHtml = `${num}`;
        let rowClass = 'completed-row';
        let rowStyle = '';

        if (isExamItem && hasTaken) {
          const scoreColor = typeof getGradeColorByScore === 'function' ? getGradeColorByScore(best.effPct) : '#94a3b8';
          const scoreRgb = parseHexRgb(scoreColor);

          // Hybrid Premium Milestone:
          // Title font & number are pure white (#ffffff) for maximum readability
          // Score, Grade circle, and Retry button retain their vibrant earned grade color
          btnBorderColor = scoreColor;
          btnRgb = scoreRgb;
          btnFillColor = scoreColor;
          titleColor = '#ffffff';
          titleFontWeight = '800';

          const remSup = best.isRem ? '<sup class="asm-rem-sup" style="color:#eab308;font-size:0.65em;font-weight:800;margin-left:1px;">R</sup>' : '';
          scoreHtml = `<span style="color:${scoreColor} !important; font-weight:800;">${best.effPct.toFixed(0)}%${remSup}</span>`;

          const dispGrade = typeof getGradeSymbol === 'function' ? getGradeSymbol(best.grade, best.effPct, best.isRem) : best.grade;
          const isStar = dispGrade === '★' || dispGrade === 'S';
          const textColor = isStar ? TOPSCORE_COLORS.TEXT_STAR : TOPSCORE_COLORS.TEXT_DARK;
          gradeHtml = `<span class="grade-circle grade-circle-${String(dispGrade).toLowerCase()}" style="background:${scoreColor} !important; color:${textColor} !important; width:24px; height:24px; font-size:11px; display:inline-flex; align-items:center; justify-content:center; border-radius:50%; font-weight:800; box-shadow: 0 0 8px rgba(${scoreRgb}, 0.4) !important;">${dispGrade}</span>`;

          // Row: Smooth gradient from left to right + score-colored top & bottom dividers
          rowClass += ' is-exam-row';
          rowStyle = `background: linear-gradient(90deg, rgba(${scoreRgb}, 0.18) 0%, rgba(${scoreRgb}, 0.05) 75%, transparent 100%) !important; border-top: 1.5px solid ${scoreColor} !important; border-bottom: 1.5px solid ${scoreColor} !important; box-shadow: 0 1px 6px rgba(${scoreRgb}, 0.25) !important;`;
          numHtml = `<span style="color:#ffffff !important; font-weight:800;">${num}</span>`;
        }

        // Sub-Row 2 for Tasks: Top 7 Highest Scores sorted DESCENDING (Highest to Lowest)
        // Score & Grade are calculated as the AVERAGE of the top 7 attempts
        let taskSubRowHtml = '';
        if (!isExamItem) {
          const taskAttempts = validAttempts.filter(a => (a.test_id || a.tests?.id) === t.id);
          const mappedAttempts = taskAttempts.map(a => {
            const rawPct = parseFloat(a.percentage || 0);
            const isRem = Boolean(a.is_remedial_unlocked || a.is_remedial);
            const effPct = isRem ? Math.min(rawPct, 60.0) : rawPct;
            const gr = a.grade || (typeof calculateGrade === 'function' ? calculateGrade(effPct) : 'E');
            return { effPct, grade: gr, isRem };
          });
          // 1. Get Top 7 highest
          mappedAttempts.sort((a, b) => b.effPct - a.effPct);
          const top7 = mappedAttempts.slice(0, 7);

          // 2. SORT DESCENDING: Highest to Lowest (e.g. ★, ★, A, A, B, ...)
          top7.sort((a, b) => b.effPct - a.effPct);

          // 3. TASK AVERAGE SCORING: Calculate average score & grade from the top 7 attempts
          if (top7.length > 0) {
            const sumPct = top7.reduce((acc, curr) => acc + curr.effPct, 0);
            const taskAvgPct = Math.round(sumPct / top7.length);
            const taskAvgGrade = typeof calculateGrade === 'function' ? calculateGrade(taskAvgPct) : 'E';

            const scoreColor = typeof getGradeColorByScore === 'function' ? getGradeColorByScore(taskAvgPct) : '#94a3b8';
            btnBorderColor = scoreColor;
            btnRgb = parseHexRgb(scoreColor);
            btnFillColor = scoreColor;

            const remSup = best?.isRem ? '<sup class="asm-rem-sup" style="color:#eab308;font-size:0.65em;font-weight:800;margin-left:1px;">R</sup>' : '';
            scoreHtml = `<span style="color:${scoreColor}; font-weight:800;">${taskAvgPct}%${remSup}</span>`;

            const dispGrade = typeof getGradeSymbol === 'function' ? getGradeSymbol(taskAvgGrade, taskAvgPct, best?.isRem) : taskAvgGrade;
            const isStar = dispGrade === '★' || dispGrade === 'S';
            const textColor = isStar ? TOPSCORE_COLORS.TEXT_STAR : TOPSCORE_COLORS.TEXT_DARK;
            gradeHtml = `<span class="grade-circle grade-circle-${String(dispGrade).toLowerCase()}" style="background:${scoreColor}; color:${textColor}; width:24px; height:24px; font-size:11px; display:inline-flex; align-items:center; justify-content:center; border-radius:50%; font-weight:800;">${dispGrade}</span>`;
          }

          let chipsHtml = '';
          for (let i = 0; i < 7; i++) {
            const item = top7[i];
            if (item) {
              const c = typeof getGradeColorByScore === 'function' ? getGradeColorByScore(item.effPct) : '#94a3b8';
              const isSt = item.grade === '★' || item.grade === 'S';
              const txt = isSt ? TOPSCORE_COLORS.TEXT_STAR : TOPSCORE_COLORS.TEXT_DARK;
              chipsHtml += `<span class="task-mini-grade" style="background:${c}; color:${txt};">${item.grade}</span>`;
            } else {
              chipsHtml += `<span class="task-mini-grade is-empty">—</span>`;
            }
          }
          taskSubRowHtml = `<div class="task-grades-subrow">${chipsHtml}</div>`;
        }

        html += `
          <div class="${rowClass}" style="${rowStyle}" onclick="window.location.href='test.html?id=${t.id}'">
            <span class="completed-col-num">${numHtml}</span>
            <div class="completed-col-name-wrap">
              <span class="completed-col-name" style="color: ${titleColor} !important; font-weight: ${titleFontWeight} !important;" title="${escapeHtml(testTitle)}">
                ${escapeHtml(testTitle)}
              </span>
              ${taskSubRowHtml}
            </div>
            <span class="completed-col-score">${scoreHtml}</span>
            <span class="completed-col-grade">${gradeHtml}</span>
            <span class="completed-col-action">
              <button type="button" 
                      class="completed-retry-btn" 
                      style="border: 1.5px solid ${btnBorderColor} !important; background: rgba(${btnRgb}, 0.15) !important; box-shadow: 0 0 10px rgba(${btnRgb}, 0.35) !important;" 
                      title="Play / Retry ${escapeHtml(testTitle)}" 
                      onclick="event.stopPropagation(); window.location.href='test.html?id=${t.id}'">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="${btnFillColor}" stroke="none">
                  <polygon points="6 3 20 12 6 21 6 3"></polygon>
                </svg>
              </button>
            </span>
          </div>
        `;
      });

      container.innerHTML = html;
    }
    window.renderCompletedTestsBottom = renderCompletedTestsBottom;

    // ============================================================
    // BATCH LEADERBOARD & DOCK TABS MODULE
    // ============================================================
    function setupDockTabs() {
      const btnStandings = document.getElementById('btn-dock-standings');
      const btnCompleted = document.getElementById('btn-dock-completed');
      const paneStandings = document.getElementById('dock-pane-standings');
      const paneCompleted = document.getElementById('dock-pane-completed');

      if (!btnStandings || !btnCompleted || !paneStandings || !paneCompleted) return;

      const setTab = (tab) => {
        if (tab === 'completed') {
          btnCompleted.classList.add('active');
          btnCompleted.setAttribute('aria-selected', 'true');
          btnStandings.classList.remove('active');
          btnStandings.setAttribute('aria-selected', 'false');

          paneCompleted.classList.remove('hidden');
          paneCompleted.classList.add('active');
          paneStandings.classList.add('hidden');
          paneStandings.classList.remove('active');
          try { sessionStorage.setItem('topscore_dock_tab', 'completed'); } catch (_) {}
        } else {
          btnStandings.classList.add('active');
          btnStandings.setAttribute('aria-selected', 'true');
          btnCompleted.classList.remove('active');
          btnCompleted.setAttribute('aria-selected', 'false');

          paneStandings.classList.remove('hidden');
          paneStandings.classList.add('active');
          paneCompleted.classList.add('hidden');
          paneCompleted.classList.remove('active');
          try { sessionStorage.setItem('topscore_dock_tab', 'standings'); } catch (_) {}
        }
      };

      btnStandings.addEventListener('click', () => setTab('standings'));
      btnCompleted.addEventListener('click', () => setTab('completed'));

      try {
        const savedTab = sessionStorage.getItem('topscore_dock_tab');
        if (savedTab === 'completed') setTab('completed');
      } catch (_) {}
    }

    async function loadBatchLeaderboard() {
      const container = document.getElementById('batch-leaderboard-container');
      const myRankNumEl = document.getElementById('dock-my-rank-number');
      const myRankSummaryEl = document.getElementById('leaderboard-my-rank');
      const champNameEl = document.getElementById('leaderboard-champion-name');
      if (!container) return;

      const batchId = session.batch_id;
      if (!batchId) {
        container.innerHTML = `
          <div class="empty-state p-4 text-center">
            <p style="color:#94a3b8; font-size:0.85rem;">No batch assigned to this account.</p>
          </div>`;
        if (myRankNumEl) myRankNumEl.textContent = '—';
        if (myRankSummaryEl) myRankSummaryEl.textContent = 'Unassigned';
        if (champNameEl) champNameEl.textContent = '—';
        return;
      }

      try {
        const sb = await (await import('./supabase.js?v=20261106_v154')).getSupabase();

        // 1. Fetch active students in the same batch
        const { data: students, error: stuErr } = await sb
          .from('students')
          .select('id, name, gender, photo_url, is_active')
          .eq('batch_id', batchId)
          .eq('is_active', true)
          .is('deleted_at', null);

        const studentList = Array.isArray(students) ? students : (students && typeof students === 'object' && students.id ? [students] : []);

        if (stuErr || studentList.length === 0) {
          container.innerHTML = `
            <div class="empty-state p-4 text-center">
              <p style="color:#94a3b8; font-size:0.85rem;">No active students found in this batch.</p>
            </div>`;
          return;
        }

        const studentIds = studentList.map(s => s.id);

        // 2. Fetch all submitted attempts with complete test metadata
        const { data: attempts, error: attErr } = await sb
          .from('attempts')
          .select('id, student_id, test_id, score, total_questions, percentage, effective_score, is_remedial_unlocked, is_best_score, status, submitted_at, tests(id, title, test_type, category, test_subtype, shell_code, deleted_at, status, payload)')
          .in('student_id', studentIds)
          .in('status', ['submitted', 'auto_submitted', 'evaluated', 'graded']);

        // PROG % denominator: use fixed curriculum test count (same source as Admin Class Hub)
        // MUST NOT use dynamic PUBLISHED count — unpublishing a test would inflate PROG% in student view
        // window._batchTests is set by the main load cycle from the same class test fetch
        const totalClassTests = (Array.isArray(window._batchTests) && window._batchTests.length > 0)
          ? window._batchTests.length
          : 40; // Safe fallback — matches Class Hub classTests.length || 40 behaviour

        // 3. Compute best scores, points & overall averages per student (Exam-Only Rule)
        const studentStats = studentList.map(st => {
          const stAtts = (attempts || []).filter(a => a.student_id === st.id && a.tests && !a.tests.deleted_at);
          const bestMap = {};
          let lastSubmittedAt = null;

          stAtts.forEach(att => {
            const key = att.test_id;
            if (!key) return;
            const totalQ = Number(att.total_questions || 50);
            const rawPct = Math.min(100.0, Math.max(0.0, parseFloat(att.percentage || 0)));
            const isRemedial = Boolean(att.is_remedial_unlocked);

            // SAFE EFFECTIVE SCORE RESOLUTION:
            // effective_score represents percentage (0.0 to 100.0), NEVER raw question points!
            // If database contains raw points (> 100), fall back to rawPct.
            let effPct = rawPct;
            if (att.effective_score != null) {
              const parsedEff = parseFloat(att.effective_score);
              if (parsedEff <= 100.0 && parsedEff >= 0.0) {
                effPct = parsedEff;
              }
            }
            if (isRemedial) effPct = Math.min(effPct, 60.0);

            // Raw question points earned
            const rawScore = parseFloat(att.score != null ? att.score : (rawPct * totalQ / 100));
            // Remedial points capped at KKM 60% of total questions
            const maxRemedialPts = totalQ * 0.6;
            const effPoints = isRemedial ? Math.min(rawScore, maxRemedialPts) : rawScore;

            const isExamItem = isExam(att.tests);

            // Rule 2.7: Report card stores highest valid score
            let shouldReplace = false;
            const attTime = new Date(att.submitted_at || att.created_at || 0).getTime();
            if (!bestMap[key]) {
              shouldReplace = true;
            } else {
              const curPts = Number(bestMap[key].points ?? 0);
              const curPct = Number(bestMap[key].effPct ?? 0);
              const curTime = bestMap[key].attTime || 0;
              if (effPoints > curPts) {
                shouldReplace = true;
              } else if (effPoints === curPts && effPct > curPct) {
                shouldReplace = true;
              } else if (effPoints === curPts && Math.abs(effPct - curPct) <= 0.01 && attTime > curTime) {
                shouldReplace = true;
              }
            }

            if (shouldReplace) {
              bestMap[key] = {
                test: att.tests,
                isExam: isExamItem,
                effPct,
                rawPct,
                points: effPoints,
                rawPoints: rawScore,
                totalQ,
                isRemedial,
                attTime,
                is_best_score: Boolean(att.is_best_score)
              };
            }

            if (att.submitted_at) {
              if (!lastSubmittedAt || new Date(att.submitted_at) > new Date(lastSubmittedAt)) {
                lastSubmittedAt = att.submitted_at;
              }
            }
          });

          const bestItems = Object.entries(bestMap)
            .filter(([k]) => !k.endsWith('_locked'))
            .map(([, v]) => v);

          // Activity Completion & Progress % (counts both Tasks & Exams)
          const completedCount = bestItems.length;
          const progressPct = totalClassTests > 0 ? Math.round((completedCount / totalClassTests) * 100) : 0;

          // Exam-Only Items: Milestone exams only
          const examItems = bestItems.filter(item => item.isExam);
          const allBatchExams = (Array.isArray(window._batchTests) && window._batchTests.length > 0)
            ? window._batchTests.filter(isExam)
            : (Array.isArray(window._allTests) && window._allTests.length > 0)
              ? window._allTests.filter(isExam)
              : [];

          const mastery = (typeof computeMilestoneExamMastery === 'function')
            ? computeMilestoneExamMastery(examItems, allBatchExams)
            : {
                totalPoints: examItems.reduce((sum, v) => sum + (v.points || 0), 0),
                overallScore: 0,
                grade: '—',
                denominator: 0,
                completedExamCount: examItems.length,
                completedWeeklyCount: examItems.length
              };

          const totalPoints = mastery.totalPoints;
          const completedExamCount = mastery.completedExamCount ?? mastery.completedWeeklyCount ?? examItems.length;

          // Rule 2.8: overallScore = average percentage of COMPLETED valid exams (not curriculum denominator)
          const validExamItems = examItems.filter(e => {
            const isPureForgivenZero = Boolean(e.isForgiven) && !e.isManual && Number(e.effPoints ?? e.points ?? 0) === 0;
            return !isPureForgivenZero;
          });
          const overallScore = validExamItems.length > 0
            ? Math.min(100, Math.max(0, Math.round(validExamItems.reduce((sum, e) => sum + Number(e.effPct ?? e.pct ?? 0), 0) / validExamItems.length)))
            : 0;
          const grade = validExamItems.length > 0
            ? (typeof calculateGrade === 'function' ? calculateGrade(overallScore) : mastery.grade)
            : '—';

          const cleanName = cleanStudentName(st.name || '');

          return {
            id: st.id,
            rawName: st.name || '',
            cleanName: cleanName || st.name || 'Student',
            gender: st.gender || null,
            photo_url: st.photo_url || null,
            totalPoints,
            overallScore,
            completedCount,
            completedExamCount,
            completedWeeklyCount: completedExamCount,
            progressPct,
            lastSubmittedAt,
            grade
          };
        });

        // 4. Deterministic Multi-Tier Ranking (Points-First Standings Hierarchy):
        // Standings columns are NO | STUDENTS NAME | POINT | GRADE.
        // Higher points must always rank higher!
        // 1. Global PTS DESC (total points earned)
        // 2. Global SCORE % DESC (exam mastery percentage; unattempted exams sort after completed)
        // 3. PROG % DESC (overall curriculum progress)
        // 4. Earliest last submission timestamp
        // 5. Alphabetical clean name
        studentStats.sort((a, b) => {
          // 1. Primary: Global PTS DESC
          const ptsA = Number(a.totalPoints ?? 0);
          const ptsB = Number(b.totalPoints ?? 0);
          if (ptsA !== ptsB) return ptsB - ptsA;

          // 2. Secondary: Global SCORE % DESC (unattempted exams sort after completed)
          const examCountA = a.completedExamCount ?? a.completedWeeklyCount ?? 0;
          const examCountB = b.completedExamCount ?? b.completedWeeklyCount ?? 0;
          const scoreA = (examCountA > 0) ? Number(a.overallScore ?? 0) : -1;
          const scoreB = (examCountB > 0) ? Number(b.overallScore ?? 0) : -1;
          if (scoreA !== scoreB) return scoreB - scoreA;

          // 3. Tertiary: PROG % DESC (overall curriculum progress)
          const progA = Number(a.progressPct ?? 0);
          const progB = Number(b.progressPct ?? 0);
          if (progA !== progB) return progB - progA;

          // 4. Earliest last submission timestamp
          if (a.lastSubmittedAt && b.lastSubmittedAt) {
            const diff = new Date(a.lastSubmittedAt) - new Date(b.lastSubmittedAt);
            if (diff !== 0) return diff;
          }

          // 5. Alphabetical clean name
          return a.cleanName.localeCompare(b.cleanName, undefined, { sensitivity: 'base' });
        });


        // 5. Determine Ranks and Champion
        const totalStudents = studentStats.length;
        let myRank = null;
        let champion = null;

        studentStats.forEach((st, idx) => {
          st.rank = idx + 1;
          if (st.id === session.student_id) {
            myRank = st.rank;
          }
          const hasExamCompleted = (st.completedExamCount ?? st.completedWeeklyCount ?? 0) > 0;
          if (st.rank === 1 && (st.totalPoints > 0 || (hasExamCompleted && st.overallScore > 0))) {
            champion = st;
          }
        });

        // 6. Royal Title & Crown Mechanics for Active Student
        window._isBatchChampion = Boolean(champion && champion.id === session.student_id);
        applyStudentGenderUI(session.gender);

        // 7. Update Status Bars
        if (myRankNumEl) myRankNumEl.textContent = myRank ? `#${myRank}` : '—';
        if (myRankSummaryEl) {
          myRankSummaryEl.textContent = myRank ? `Rank #${myRank} of ${totalStudents}` : '—';
        }
        if (champNameEl) {
          if (champion) {
            const royalPrefix = champion.gender === 'male' ? 'King' : (champion.gender === 'female' ? 'Queen' : '');
            const titleStr = royalPrefix ? `${royalPrefix} ${champion.cleanName}` : champion.cleanName;
            champNameEl.textContent = `👑 ${titleStr} (${champion.totalPoints} PTS • ${champion.overallScore}%)`;
          } else {
            champNameEl.textContent = 'None yet (0 PTS)';
          }
        }

        // 8. Render Leaderboard List
        let html = '';
        studentStats.forEach(st => {
          const isMe = st.id === session.student_id;
          const hasExamCompleted = (st.completedExamCount ?? st.completedWeeklyCount ?? 0) > 0;
          const isRank1 = st.rank === 1 && (st.totalPoints > 0 || (hasExamCompleted && st.overallScore > 0));
          const rowClass = `standings-row ${isMe ? 'my-row' : ''} ${isRank1 ? 'rank-1-row' : ''}`;

          let rankBadgeClass = 'leaderboard-rank-badge';
          if (st.rank === 1) rankBadgeClass += ' rank-1';
          else if (st.rank === 2) rankBadgeClass += ' rank-2';
          else if (st.rank === 3) rankBadgeClass += ' rank-3';
          const rankContent = st.rank; // Clean numbers strictly: 1, 2, 3, 4, ...

          // Title & Name (no duplicate king/queen icon tag as title is already prefixed)
          const rawClean = st.cleanName.replace(/^(mr\.?|miss\.?|mrs\.?|ms\.?|king|queen)\s+/i, '').trim();
          let displayTitleName = rawClean;
          if (isRank1) {
            if (st.gender === 'male') {
              displayTitleName = `King ${rawClean}`;
            } else if (st.gender === 'female') {
              displayTitleName = `Queen ${rawClean}`;
            } else {
              displayTitleName = `Champion ${rawClean}`;
            }
          } else {
            if (st.gender === 'male') displayTitleName = `Mr. ${rawClean}`;
            else if (st.gender === 'female') displayTitleName = `Miss ${rawClean}`;
          }

          const hasExam = (st.completedExamCount ?? st.completedWeeklyCount ?? 0) > 0;
          const initChar = st.cleanName ? st.cleanName.charAt(0).toUpperCase() : 'S';
          const memberPhoto = st.avatar_url || st.photo_url;
          const theme = hasExam ? (GRADE_PALETTE[st.grade] || GRADE_PALETTE.E) : { color: '#94a3b8', rgb: '148, 163, 184' };
          const gradeSymbol = hasExam ? getGradeSymbol(st.grade, st.overallScore) : '—';

          const avatarHtml = memberPhoto
            ? `<img src="${escHtml(memberPhoto)}" class="leaderboard-avatar-mini" alt="${escHtml(st.cleanName)}" onerror="this.outerHTML='<div class=\\'leaderboard-avatar-init\\' style=\\'background:${theme.color};\\'>${initChar}</div>'" />`
            : `<div class="leaderboard-avatar-init" style="background:${theme.color};">${initChar}</div>`;

          html += `
            <div class="${rowClass}">
              <div class="th-col th-rank" style="display:flex; justify-content:center;">
                <div class="${rankBadgeClass}">${rankContent}</div>
              </div>
              <div class="th-col th-name" style="display:flex; align-items:center; gap:8px; min-width:0; overflow:hidden;">
                ${avatarHtml}
                <div style="min-width:0; overflow:hidden;">
                  <div class="leaderboard-name-wrap">
                    <span class="leaderboard-student-name ${isMe ? 'is-current-user' : ''}" style="${isMe ? `color:${hasExam && typeof getGradeColorByScore === 'function' ? getGradeColorByScore(st.overallScore) : (hasExam ? theme.color : '#38bdf8')} !important; font-weight:800 !important; text-shadow:0 0 10px rgba(${parseHexRgb(hasExam && typeof getGradeColorByScore === 'function' ? getGradeColorByScore(st.overallScore) : theme.color)},0.45);` : ''}">${escHtml(displayTitleName)}</span>
                  </div>
                  
                </div>
              </div>
              <div class="th-col th-point" style="display:flex; align-items:center; justify-content:flex-end;">
                <span style="color:${hasExam && typeof getGradeColorByScore === 'function' ? getGradeColorByScore(st.overallScore) : (hasExam ? theme.color : '#94a3b8')}; font-weight:800; font-size:0.95rem; font-variant-numeric:tabular-nums;">
                  ${st.totalPoints}
                </span>
              </div>
              <div class="th-col th-grade" style="display:flex; align-items:center; justify-content:center;">
                <div class="leaderboard-grade-chip" style="background:${hasExam ? theme.color : 'rgba(255,255,255,0.12)'}; width:22px; height:22px; border-radius:6px; font-size:0.72rem; font-weight:800; display:flex; align-items:center; justify-content:center; color:${hasExam && gradeSymbol === '★' ? TOPSCORE_COLORS.TEXT_STAR : (hasExam ? TOPSCORE_COLORS.TEXT_DARK : '#ffffff')};" title="${hasExam ? `Average: ${st.overallScore}%` : 'No exams completed yet'}">${gradeSymbol}</div>
              </div>
            </div>
          `;
        });

        container.innerHTML = html;

      } catch (err) {
        console.error('Error loading batch leaderboard:', err);
        container.innerHTML = `
          <div class="empty-state p-4 text-center">
            <p style="color:var(--clr-danger); font-size:0.85rem;">Failed to load batch standings.</p>
          </div>`;
      }
    }

    // --- Profile Modal & History ---
    let profileModalListenersInitialized = false;
    function setupProfileModal(attempts = []) {
      const modal = document.getElementById('profile-modal');
      const openBtn = document.getElementById('view-profile-btn');
      const closeBtn = document.getElementById('close-profile-modal');

      document.getElementById('prof-student-name').textContent = session.student_name || 'Student';
      const progEl = document.getElementById('prof-student-prog');
      if (progEl) {
        if (session.institution_name && session.institution_name !== 'undefined') {
          progEl.textContent = session.institution_name;
          progEl.classList.remove('hidden');
        } else {
          progEl.classList.add('hidden');
        }
      }
      const classEl = document.getElementById('prof-student-class');
      if (classEl) {
        classEl.textContent = session.program_name || 'Program';
      }
      const batchEl = document.getElementById('prof-student-batch');
      if (batchEl) {
        if (session.batch_name && session.batch_name !== 'undefined') {
          batchEl.textContent = session.batch_name;
          batchEl.classList.remove('hidden');
        } else {
          batchEl.classList.add('hidden');
        }
      }

      // Render Completed Tests History
      const tbody = document.getElementById('tbl-profile-history');
      if (tbody) {
        tbody.innerHTML = '';
        const validAttempts = (attempts || []).filter(a => !(a.tests && a.tests.deleted_at));
        if (!validAttempts || !validAttempts.length) {
          tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted p-4">No Completed Tests yet.</td></tr>';
        } else {
          validAttempts.forEach(a => {
            const tr = document.createElement('tr');
            const title = a.Tests ? `${a.Tests.Test_type || ''} — ${a.Tests.Test_title || 'Test'}` : 'Test';
            const isRem = Boolean(a.is_remedial_unlocked || a.is_remedial);
            const rawPct = parseFloat(a.percentage || 0);
            const effPct = isRem ? Math.min(rawPct, 60.0) : rawPct;
            const pct = effPct.toFixed(1);
            const grade = a.grade || getGrade(effPct);
            const displayGrade = getGradeSymbol(grade, effPct, isRem);

            tr.innerHTML = `
              <td class="fw-600">${title}</td>
              <td class="fw-700 text-grade-${grade}">${pct}%</td>
              <td><span class="grade-badge grade-${grade}" style="width:24px;height:24px;font-size:0.75rem;display:inline-flex;align-items:center;justify-content:center;line-height:1;">${displayGrade}</span></td>
              <td class="text-muted text-sm">${a.submitted_at ? new Date(a.submitted_at).toLocaleDateString() : '—'}</td>
            `;
            tbody.appendChild(tr);
          });
        }
      }

      if (profileModalListenersInitialized) return;
      profileModalListenersInitialized = true;

      // Profile Tab Navigation (Zero-scroll architecture)
      const tabBtnProfile = document.getElementById('tab-btn-profile');
      const tabBtnHistory = document.getElementById('tab-btn-history');
      const paneProfile = document.getElementById('tab-pane-profile');
      const paneHistory = document.getElementById('tab-pane-history');

      function switchProfileTab(tab, updateHash = true) {
        if (tab === 'history') {
          tabBtnHistory?.classList.add('active');
          tabBtnHistory?.setAttribute('aria-selected', 'true');
          tabBtnProfile?.classList.remove('active');
          tabBtnProfile?.setAttribute('aria-selected', 'false');
          paneHistory?.classList.remove('hidden');
          paneProfile?.classList.add('hidden');
          if (updateHash) {
            try { window.location.hash = '#profile-history'; } catch (_) {}
          }
        } else {
          tabBtnProfile?.classList.add('active');
          tabBtnProfile?.setAttribute('aria-selected', 'true');
          tabBtnHistory?.classList.remove('active');
          tabBtnHistory?.setAttribute('aria-selected', 'false');
          paneProfile?.classList.remove('hidden');
          paneHistory?.classList.add('hidden');
          if (updateHash) {
            try { window.location.hash = '#profile'; } catch (_) {}
          }
        }
      }
      window._switchProfileTab = switchProfileTab;

      tabBtnProfile?.addEventListener('click', () => switchProfileTab('profile'));
      tabBtnHistory?.addEventListener('click', () => switchProfileTab('history'));

      // Fetch and display existing student photo and personal data
      (async () => {
        try {
          const sb = await (await import('./supabase.js?v=20261106_v154')).getSupabase();
          const { data: st } = await sb.from('students').select('photo_url, birth_date, education').eq('id', session.student_id).maybeSingle();
          if (st?.photo_url) {
            applyPhotoEverywhere(st.photo_url);
          } else {
            clearPhotoEverywhere();
          }

          if (st?.birth_date) {
            document.getElementById('prof-dob').value = st.birth_date;
            calculateAge(st.birth_date);
          }
          if (st?.education) {
            document.getElementById('prof-education').value = st.education;
          }
        } catch {}
      })();

      // Helper function to calculate age
      function calculateAge(dobString) {
        const ageSpan = document.getElementById('prof-age');
        if (!dobString) {
          ageSpan.textContent = '--';
          return;
        }
        const today = new Date();
        const birthDate = new Date(dobString);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        ageSpan.textContent = age + ' years old';
      }

      // Update age on change
      document.getElementById('prof-dob')?.addEventListener('change', (e) => {
        calculateAge(e.target.value);
        window.isProfileDirty = true;
      });

      document.getElementById('prof-education')?.addEventListener('change', () => {
        window.isProfileDirty = true;
      });

      // Personal Data Form Handler
      const personalDataForm = document.getElementById('personal-data-form');
      if (personalDataForm) {
        personalDataForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const dob = document.getElementById('prof-dob').value;
          const edu = document.getElementById('prof-education').value;

          showLoading('Saving Personal Data...');
          try {
            const sb = await (await import('./supabase.js?v=20261106_v154')).getSupabase();
            const { error } = await sb.from('students').update({ birth_date: dob, education: edu }).eq('id', session.student_id);
            if (error) throw error;

            hideLoading();
            showToast('Personal Data updated successfully!', 'success');
            window.isProfileDirty = false;
          } catch(err) {
            hideLoading();
            showToast('Error saving data: ' + err.message, 'error');
          }
        });
      }

      // Photo upload click handlers
      const avatarContainer = document.getElementById('avatar-container');
      const bannerInput = document.getElementById('banner-photo-input');
      const modalInput = document.getElementById('profile-modal-photo-input');

      avatarContainer.addEventListener('click', () => modalInput.click());

      const handlePhotoChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 15 * 1024 * 1024) {
          showToast('Ukuran file foto maksimal 15MB.', 'warning');
          return;
        }

        // 1. LANGSUNG HAPUS FOTO LAMA (0ms delay):
        // Hapus dari localStorage cache dan bersihkan elemen <img> avatar seketika
        // agar foto lama tidak terlihat sekilas saat upload foto baru!
        clearPhotoEverywhere();

        showLoading('Mengompresi foto profil…');
        try {
          // Option 1: Strictly compress to lightweight 3:4 WebP Base64 (<30KB)
          const compressedDataUrl = await processAndCompressAvatar(file, 'student');
          // Langsung terapkan foto baru yang telah terkompresi ke UI dan localStorage
          applyPhotoEverywhere(compressedDataUrl);
          await uploadStudentPhoto(session.student_id, compressedDataUrl);
          hideLoading();
          showToast('Profile photo successfully updated and saved!', 'success');
        } catch(err) {
          hideLoading();
          showToast('Failed to process photo: ' + err.message, 'error');
        } finally {
          e.target.value = '';
        }
      };

      if (bannerInput) bannerInput.addEventListener('change', handlePhotoChange);
      if (modalInput) modalInput.addEventListener('change', handlePhotoChange);

      // Change PIN Form Handler
      const changePinForm = document.getElementById('change-pin-form');

      const pinInputs = changePinForm.querySelectorAll('input');
      pinInputs.forEach(input => {
        input.addEventListener('input', () => {
          window.isProfileDirty = true;
        });
      });

      changePinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const oldPin = document.getElementById('pin-old').value.trim();
        const newPin = document.getElementById('pin-new').value.trim();
        const confirmPin = document.getElementById('pin-confirm').value.trim();

        if (newPin !== confirmPin) {
          showToast('New PIN confirmation does not match.', 'warning');
          return;
        }
        if (newPin.length < 4) {
          showToast('PIN baru minimal 4 digit angka.', 'warning');
          return;
        }

        showLoading('Mengubah PIN…');
        try {
          await updateStudentPin(session.student_id, oldPin, newPin);
          hideLoading();
          showToast('PIN updated successfully!', 'success');
          changePinForm.reset();
          window.isProfileDirty = false;
        } catch(err) {
          hideLoading();
          showToast(err.message, 'error');
        }
      });

      // Gender & Title Buttons in Profile Modal
      document.getElementById('btn-prof-male')?.addEventListener('click', async () => {
        if (session.gender === 'male') return;
        showLoading('Updating title to Mr.…');
        try {
          await updateStudentGender(session.student_id, 'male');
          applyStudentGenderUI('male');
          hideLoading();
          showToast('Title updated to Mr.!', 'success');
        } catch(err) {
          hideLoading();
          showToast('Failed to update gender: ' + err.message, 'error');
        }
      });

      document.getElementById('btn-prof-female')?.addEventListener('click', async () => {
        if (session.gender === 'female') return;
        showLoading('Updating title to Miss.…');
        try {
          await updateStudentGender(session.student_id, 'female');
          applyStudentGenderUI('female');
          hideLoading();
          showToast('Title updated to Miss!', 'success');
        } catch(err) {
          hideLoading();
          showToast('Failed to update gender: ' + err.message, 'error');
        }
      });

      const openProfile = (tab = 'profile') => {
        applyStudentGenderUI(session.gender);
        switchProfileTab(tab, true);
        window.isProfileDirty = false;
        if(changePinForm) changePinForm.reset();
        modal.classList.remove('hidden');
      };

      openBtn.addEventListener('click', () => openProfile('profile'));

      const closeProfile = () => {
        if (window.isProfileDirty) {
          if (!confirm('You have unsaved changes. Are you sure you want to close?')) return;
        }
        window.isProfileDirty = false;
        if(changePinForm) changePinForm.reset();
        modal.classList.add('hidden');
        if (window.location.hash.startsWith('#profile') || window.location.hash === '#history') {
          try { history.replaceState(null, '', window.location.pathname + window.location.search); } catch (_) {}
        }
      };

      closeBtn.addEventListener('click', closeProfile);
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeProfile();
      });

      // Header avatar also opens profile modal
      document.getElementById('header-avatar')?.addEventListener('click', () => openProfile('profile'));
      const bannerAvatarTrigger = document.getElementById('banner-avatar-trigger');
      if (bannerAvatarTrigger && !bannerAvatarTrigger._hasClickListener) {
        bannerAvatarTrigger._hasClickListener = true;
        bannerAvatarTrigger.addEventListener('click', () => openProfile('profile'));
        bannerAvatarTrigger.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') openProfile('profile');
        });
      }
    }

    // --- Level Modal close ---
    const closeLevelModal = () => {
      document.getElementById('level-modal')?.classList.add('hidden');
      if (window.location.hash.startsWith('#levels')) {
        try { history.replaceState(null, '', window.location.pathname + window.location.search); } catch (_) {}
      }
    };
    document.getElementById('close-level-modal')?.addEventListener('click', closeLevelModal);
    document.getElementById('level-modal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeLevelModal();
    });

    // --- Gamification: Show Level Up Popup ---
    window.showLevelUpPopup = function(newLevel) {
      const overlay = document.getElementById('level-up-overlay');
      const badgeText = document.getElementById('lu-badge-text');
      badgeText.textContent = newLevel;

      // Make it visible
      overlay.classList.add('active');

      // Trigger Confetti (using Canvas Confetti library if included, otherwise skip or use a custom one)
      if (window.confetti) {
        window.confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          zIndex: 10000
        });
      }
    };

    // Close Gamification Popup
    document.getElementById('close-levelup-btn')?.addEventListener('click', () => {
      document.getElementById('level-up-overlay').classList.remove('active');
    });

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', () => {
      if (confirm('Are you sure you want to log out?')) {
        clearStudentSession();
        window.location.href = '/index.html';
      }
    });

    function restoreDashboardHashRoute() {
      const hash = window.location.hash || '';
      document.getElementById('profile-modal')?.classList.add('hidden');
      document.getElementById('classes-selector-modal')?.classList.add('hidden');
      document.getElementById('level-modal')?.classList.add('hidden');
      if (!hash) return;
      if (hash === '#profile') {
        const modal = document.getElementById('profile-modal');
        if (modal) {
          applyStudentGenderUI(session.gender);
          if (typeof window._switchProfileTab === 'function') window._switchProfileTab('profile', false);
          modal.classList.remove('hidden');
        }
      } else if (hash === '#profile-history' || hash === '#history') {
        const modal = document.getElementById('profile-modal');
        if (modal) {
          applyStudentGenderUI(session.gender);
          if (typeof window._switchProfileTab === 'function') window._switchProfileTab('history', false);
          modal.classList.remove('hidden');
        }
      } else if (hash === '#select-class') {
        populateClassesSelectorModal(window._activeClasses || []);
        document.getElementById('classes-selector-modal')?.classList.remove('hidden');
      } else if (hash.startsWith('#levels')) {
        const parts = hash.split('-');
        const targetCid = parts.length > 1 ? parts.slice(1).join('-') : window._selectedClassId;
        const cur = (window._activeClasses || []).find(c => c.id === targetCid) || (window._activeClasses || []).find(c => c.id === window._selectedClassId) || (window._activeClasses || [])[0];
        if (cur) {
          openClassModal(cur, window._classesProgress);
        }
      } else if (hash === '#practice' || hash === '#flashcards') {
        initLobbyFlashcardControls();
        openLobbyFlashcardModal();
      }
    }

    // ===== 🎯 STUDENT LOBBY FLASHCARD RECOVERY ENGINE =====
    let _lobbyActiveFlashcards = [];
    let _lobbyCurrentFcIndex = 0;
    let _isLobbyFcControlsBound = false;

    window.openLobbyFlashcardsForAttempt = async function(attemptId) {
      if (!attemptId) return;
      showLoading('Loading missed vocabulary flashcards…');
      try {
        const answers = await fetchAttemptAnswers(attemptId);
        hideLoading();
        startLobbyFlashcardsWithAnswers(answers);
      } catch (err) {
        hideLoading();
        console.warn('Failed to load flashcard answers:', err);
        showToast('Could not load flashcard vocabulary: ' + err.message, 'warning');
      }
    };

    function startLobbyFlashcardsWithAnswers(answers = []) {
      const missed = (answers || []).filter(a => {
        const isCorrect = a.is_correct === true || parseFloat(a.score || 0) >= 1.0;
        return !isCorrect;
      });
      if (missed.length === 0) {
        showToast('🎉 Excellent! No missed words found in this test.', 'info');
        return;
      }
      _lobbyActiveFlashcards = missed;
      initLobbyFlashcardControls();
      openLobbyFlashcardModal();
    }

    async function setupLobbyFlashcards(attempts = []) {
      const btn = document.getElementById('btn-lobby-flashcards');
      const badge = document.getElementById('lobby-fc-count-badge');
      if (!btn) return;

      // Find candidate attempts (submitted/auto_submitted) with score < 100%
      const candidateAttempts = (attempts || []).filter(a => {
        const st = (a.status || '').toLowerCase();
        return (st === 'submitted' || st === 'auto_submitted' || st === 'graded' || st === 'evaluated') && parseFloat(a.percentage || 0) < 100;
      });

      if (candidateAttempts.length === 0) {
        btn.classList.add('hidden');
        return;
      }

      // Sort newest attempt first
      candidateAttempts.sort((a, b) => new Date(b.created_at || b.started_at || 0) - new Date(a.created_at || a.started_at || 0));
      const latestAttempt = candidateAttempts[0];

      try {
        const answers = await fetchAttemptAnswers(latestAttempt.id);
        const missed = (answers || []).filter(a => {
          const isCorrect = a.is_correct === true || parseFloat(a.score || 0) >= 1.0;
          return !isCorrect;
        });

        if (missed.length > 0) {
          _lobbyActiveFlashcards = missed;
          btn.classList.remove('hidden');
          if (badge) badge.textContent = missed.length;
          btn.onclick = () => {
            initLobbyFlashcardControls();
            openLobbyFlashcardModal();
          };
          initLobbyFlashcardControls();
        } else {
          btn.classList.add('hidden');
        }
      } catch (err) {
        console.warn('Silent skip lobby flashcards:', err);
        btn.classList.add('hidden');
      }
    }

    function initLobbyFlashcardControls() {
      if (_isLobbyFcControlsBound) return;
      _isLobbyFcControlsBound = true;

      const modal = document.getElementById('flashcard-modal');
      const closeBtn = document.getElementById('close-flashcard-btn');
      if (closeBtn) closeBtn.onclick = closeLobbyFlashcardModal;
      if (modal) {
        modal.onclick = (e) => {
          if (e.target.id === 'flashcard-modal') closeLobbyFlashcardModal();
        };
      }

      const flipInner = document.getElementById('active-flip-inner');
      const flipCard = document.getElementById('active-flip-card');
      const toggleFlip = () => flipInner?.classList.toggle('flipped');

      if (flipCard) flipCard.onclick = toggleFlip;
      const flipBtn = document.getElementById('fc-btn-flip');
      if (flipBtn) {
        flipBtn.onclick = (e) => {
          e.stopPropagation();
          toggleFlip();
        };
      }

      const prevBtn = document.getElementById('fc-btn-prev');
      if (prevBtn) {
        prevBtn.onclick = (e) => {
          e.stopPropagation();
          if (_lobbyActiveFlashcards.length === 0) return;
          _lobbyCurrentFcIndex = (_lobbyCurrentFcIndex - 1 + _lobbyActiveFlashcards.length) % _lobbyActiveFlashcards.length;
          renderLobbyFlashcardItem();
        };
      }

      const nextBtn = document.getElementById('fc-btn-next');
      if (nextBtn) {
        nextBtn.onclick = (e) => {
          e.stopPropagation();
          if (_lobbyActiveFlashcards.length === 0) return;
          _lobbyCurrentFcIndex = (_lobbyCurrentFcIndex + 1) % _lobbyActiveFlashcards.length;
          renderLobbyFlashcardItem();
        };
      }

      const speakBtn = document.getElementById('fc-speak-btn');
      if (speakBtn) {
        speakBtn.onclick = (e) => {
          e.stopPropagation();
          const currentItem = _lobbyActiveFlashcards[_lobbyCurrentFcIndex];
          if (!currentItem) return;
          const snap = typeof currentItem.question_snapshot === 'string'
            ? (() => { try { return JSON.parse(currentItem.question_snapshot); } catch(_) { return {}; } })()
            : (currentItem.question_snapshot || {});
          const target = (snap.correct_answer || snap.answer || currentItem.correct_answer_snapshot || currentItem.correct_answer || '').split(/[;/,|]/)[0].trim();
          if (target && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(target);
            u.lang = 'en-US';
            u.rate = 0.9;
            window.speechSynthesis.speak(u);
          }
        };
      }
    }

    function openLobbyFlashcardModal() {
      const modal = document.getElementById('flashcard-modal');
      if (!modal || _lobbyActiveFlashcards.length === 0) return;
      _lobbyCurrentFcIndex = 0;
      renderLobbyFlashcardItem();
      modal.classList.remove('hidden');
      if (!window.location.hash || window.location.hash === '#') {
        window.history.replaceState(null, '', '#practice');
      }
    }

    function closeLobbyFlashcardModal() {
      const modal = document.getElementById('flashcard-modal');
      if (modal) modal.classList.add('hidden');
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      if (window.location.hash === '#practice' || window.location.hash === '#flashcards') {
        window.history.replaceState(null, '', 'dashboard.html');
      }
    }

    function renderLobbyFlashcardItem() {
      const item = _lobbyActiveFlashcards[_lobbyCurrentFcIndex];
      if (!item) return;

      const flipInner = document.getElementById('active-flip-inner');
      if (flipInner) flipInner.classList.remove('flipped');

      const snap = typeof item.question_snapshot === 'string'
        ? (() => { try { return JSON.parse(item.question_snapshot); } catch(_) { return {}; } })()
        : (item.question_snapshot || {});

      const prompt = snap.question_text || snap.question || snap.soal || snap.indonesia || '—';
      const pos = snap.word_type || snap.category || (snap.correct_answer?.includes(' ') ? 'Phrase' : 'Word');
      const target = (snap.correct_answer || snap.answer || item.correct_answer_snapshot || item.correct_answer || '—').split(/[;/,|]/)[0].trim();
      const studentAns = (item.student_answer || '').trim() || '(No answer / Blank)';

      const posEl = document.getElementById('fc-front-pos');
      if (posEl) posEl.textContent = pos;

      const promptEl = document.getElementById('fc-front-prompt');
      if (promptEl) promptEl.textContent = prompt;

      const studentAnsEl = document.getElementById('fc-front-student-ans');
      if (studentAnsEl) {
        studentAnsEl.innerHTML = `Your answer: <span style="color:var(--grade-e, #FF0000);">${escapeHtml(studentAns)}</span>`;
      }

      const backTargetEl = document.getElementById('fc-back-target');
      if (backTargetEl) backTargetEl.textContent = target;

      const counterEl = document.getElementById('fc-progress-counter');
      if (counterEl) counterEl.textContent = `Card ${_lobbyCurrentFcIndex + 1} of ${_lobbyActiveFlashcards.length}`;
    }

    window.addEventListener('hashchange', restoreDashboardHashRoute);

    setupDockTabs();
    setupProfileModal([]);
    loadDashboard().then(() => {
      restoreDashboardHashRoute();
    });
