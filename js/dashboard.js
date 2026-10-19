/**
 * TopsCore — Student Dashboard Module
 * Extracted from dashboard.html
 */

import { fetchStudentClasses, fetchStudentProgress, fetchAssessmentsForStudentClass, fetchStudentAttemptsForAssessment, fetchAllStudentAttempts, updateStudentPin, uploadStudentPhoto, updateStudentGender, updateStudentBirthday, updateStudentEducation, formatStudentName, cleanStudentName, fetchAssignments, fetchAssessments, toOrdinalLevel, fetchBatches, fetchStudentLevel } from './api.js?v=5.2.2';
    import { requireStudentSession, clearStudentSession, updateStudentSessionGender, setStudentSession } from './session.js?v=5.2.2';
    import { showToast, showLoading, hideLoading, getGrade, withTimeout, escapeHtml, escHtml } from './app.js?v=5.2.2';
    import { testMicrophoneCapability } from './speech.js?v=5.2.2';
    import { processAndCompressAvatar } from './utils/avatar-engine.js?v=5.2.2';
    import { GRADE_PALETTE, getGradeSymbol } from './grading.js?v=5.2.2';

    window._isBatchChampion = false;


    // escapeHtml imported from app.js
    const session = requireStudentSession();
    if (!session) throw new Error('Not authenticated');

    // Populate header & Welcome Banner
    const headerStudentNameEl = document.getElementById('header-student-name');
    if (headerStudentNameEl) headerStudentNameEl.textContent = session.student_name;
    const welcomeNameEl = document.getElementById('welcome-name');
    if (welcomeNameEl) welcomeNameEl.textContent = session.student_name;
    const elInst = document.getElementById('meta-inst');
  const elProg = document.getElementById('meta-prog');
  const elBatch = document.getElementById('meta-batch');
  const elLvl = document.getElementById('meta-lvl');
  if (elInst) elInst.textContent = session.institution_name || 'CEC';
  
  // Title case for program
  const prgName = session.program_name ? session.program_name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : 'Camp';
  if (elProg) elProg.textContent = prgName.toUpperCase();
  
  if (elBatch) elBatch.textContent = session.batch_name ? String(session.batch_name).replace(/[^0-9]/g, '') || session.batch_name : '131';
  if (elLvl) elLvl.textContent = session.level_name ? (session.level_name.toLowerCase().includes('level') ? session.level_name : session.level_name + ' Level') : '3rd Level';
  
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
      const nameStr = (session.student_name || '').trim();
      let parts = nameStr.split(' ');
      
      const firstLower = (parts[0] || '').toLowerCase();
      if (['mr.', 'mr', 'miss', 'ms.', 'ms', 'mrs.', 'mrs', 'king', 'queen'].includes(firstLower)) {
         parts.shift();
      }
      
      const cleanFullName = parts.join(' ') || nameStr;
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

      const crownEl = document.getElementById('banner-avatar-crown');
      if (crownEl) {
        crownEl.classList.toggle('hidden', !isLeader);
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
          const sb = await (await import('./supabase.js?v=5.2.2')).getSupabase();
          const { data: st } = await sb.from('students').select('gender, name').eq('id', session.student_id).single();
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
        document.getElementById('photo-setup-modal').classList.add('hidden');
      }
    });

    // Skip photo setup fallback
    document.getElementById('btn-skip-photo-setup')?.addEventListener('click', () => {
      stopOnboardWebcam();
      document.getElementById('photo-setup-modal').classList.add('hidden');
    });

    async function checkAndPromptPhoto() {
      let photoUrl = localStorage.getItem(`stu_photo_${session.student_id}`);
      if (!photoUrl) {
        try {
          const sb = await (await import('./supabase.js?v=5.2.2')).getSupabase();
          const { data: st } = await sb.from('students').select('photo_url, photo_status').eq('id', session.student_id).single();
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
        // Test mic upfront on entry so browser permission is established before Assessments
        checkMicrophoneOnEntry();

        // Background sync: memastikan localStorage selalu sinkron dengan database terbaru
        (async () => {
          try {
            const sb = await (await import('./supabase.js?v=5.2.2')).getSupabase();
            const { data: st } = await sb.from('students').select('photo_url').eq('id', session.student_id).single();
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

      // No photo registered! Show Photo & Mic Setup Modal
      hideLoading();
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
          const sb = await (await import('./supabase.js?v=5.2.2')).getSupabase();
          const { data: st } = await sb.from('students').select('birth_date').eq('id', session.student_id).single();
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
        const sb = await (await import('./supabase.js?v=5.2.2')).getSupabase();
        const { data: st } = await sb.from('students').select('education').eq('id', session.student_id).single();
        if (st && st.education) {
          if (Array.isArray(st.education) && st.education.length > 0) {
            hasEducation = true;
          } else if (typeof st.education === 'string' && st.education.trim().length > 0) {
            hasEducation = true;
          }
          if (hasEducation && !session.education) {
             session.education = st.education;
             const { setStudentSession } = await import('./session.js?v=5.2.2');
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
            const { setStudentSession } = await import('./session.js?v=5.2.2');
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
              session.batch_name ? 'Batch ' + session.batch_name : null
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
            welcomeLevelEl.textContent = session.level_name.toLowerCase().includes('level') ? session.level_name : session.level_name + ' Level';
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

        const [Classes, progress, attempts, assignmentsRaw, assessmentsRaw] = await withTimeout(
          Promise.all([
            fetchStudentClasses(session.program_id, session.institution_id, session.level_id),
            fetchStudentProgress(session.student_id),
            fetchAllStudentAttempts(session.student_id),
            Promise.resolve([]),
            fetchAssessments({ class_id: null }).catch(() => [])
          ]),
          20000,
          'Fetching dashboard data'
        );

        hideLoading();
        renderClasses(Classes, progress, assessmentsRaw, attempts);

        const myClassIds = Classes.map(c => c.id);
        const myAssessments = assessmentsRaw.filter(a => myClassIds.includes(a.class_id) || myClassIds.includes(a.Class_id));
        await computeOverallStats(attempts, myAssessments);
        await loadBatchLeaderboard();
        setupProfileModal(attempts);
      } catch(e) {
        hideLoading();
        showToast('Failed to load dashboard: ' + e.message, 'error');
        // Clear loading placeholders if there's an error
        renderClasses([], [], [], []);
        renderCompletedAssessmentsBottom([], 0);
        await loadBatchLeaderboard().catch(() => {});
        setupProfileModal([]);
      }
    }

    function renderClasses(rawClasses, progress, allAssessments = [], allAttempts = []) {
        window._loadedClasses = rawClasses;
      const subjCountEl = document.getElementById('overview-classes-count');
      if (subjCountEl) subjCountEl.textContent = rawClasses.length;

      const grid = document.getElementById('classes-grid');
      grid.innerHTML = '';

      if (!rawClasses.length) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
          <div class="empty-state__icon">📚</div>
          <h3>No Classes assigned</h3>
          <p>Your class doesn't have any Classes assigned yet. Please contact your teacher.</p>
        </div>`;
        return;
      }

      const activeClasses = [];
      const completedClasses = [];
      const studentLevelNum = session.level_number || 1;
      const studentLevelId = session.level_id;

      rawClasses.forEach(c => {
        const cLvlNum = c.levels?.level_number;
        const isCurrentLevel = (studentLevelId && c.level_id === studentLevelId) || (studentLevelNum && cLvlNum === studentLevelNum);
        
        // A class is active if it's explicitly unleveled (0) OR if it matches the student's valid level
        if (cLvlNum == null || cLvlNum === 0 || isCurrentLevel) {
          activeClasses.push(c);
        } else if (studentLevelNum && cLvlNum < studentLevelNum) {
          completedClasses.push(c);
        }
      });

      // Strict alphabetical sorting (A to Z)
      activeClasses.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      completedClasses.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      const classIcons = ['&#128218;', '&#9999;&#65039;', '&#128483;&#65039;', '&#127911;', '&#128200;', '&#127757;', '&#128214;', '&#128172;'];
      
      if (activeClasses.length === 0) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
          <div class="empty-state__icon">📚</div>
          <h3>No Active Classes</h3>
          <p>You don't have any active classes for your current level.</p>
        </div>`;
      } else {
        activeClasses.forEach((subj, idx) => {
          const subjProgress = (progress || []).filter(p => (p.class_id || p.Class_id) === subj.id);
          const dbCompleted = subjProgress.some(p => p.is_completed || p.level_status === 'Level Completed');

          const classAssms = (allAssessments || []).filter(a => {
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
                .map(att => att.assessment_id || att.Assessment_id)
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
                <div class="score-bar" style="width:${pct}%; background: ${isCompleted ? 'var(--clr-success, #10b981)' : 'var(--clr-primary, #6366f1)'};"></div>
              </div>
            </div>
          `;
          card.addEventListener('click', () => openClassModal(subj, progress));
          card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openClassModal(subj, progress); });
          grid.appendChild(card);
        });
      }

    }

    // ── openClassModal: Opens the Level Modal for a Class ──
    // Called when a student clicks a Class card on the dashboard.
    async function openClassModal(subj, progress) {
      const modal       = document.getElementById('level-modal');
      const titleEl     = document.getElementById('level-modal-title');
      const classEl   = document.getElementById('level-modal-class');
      const container   = document.getElementById('levels-container');
      if (!modal || !container) return;

      // Open modal immediately with a loading state
      titleEl.textContent  = (subj.name || 'Class') + ' Assessments';
      classEl.textContent = 'Pilih assessment yang tersedia di bawah ini.';
      container.innerHTML  = `<div style="padding:2rem;text-align:center;color:var(--clr-text-3);">
        <div class="spinner" style="margin:0 auto 1rem;"></div>
        <p>Loading Assessments…</p></div>`;
      modal.classList.remove('hidden');

      try {
        const Assessments = await fetchAssessmentsForStudentClass(
          session.program_id, subj.id, session.institution_id, session.level_id
        );

        if (!Assessments || Assessments.length === 0) {
          container.innerHTML = `<div style="padding:2.5rem 1.5rem;text-align:center;color:var(--clr-text-3);">
            <div style="font-size:2.5rem;margin-bottom:0.75rem;">📈</div>
            <p style="font-size:0.9rem;">No published Assessments available in this Class yet.</p></div>`;
          return;
        }

        // Group Assessments by level (level_id or level name)
        const levelMap = new Map();
        for (const Assessment of Assessments) {
          const lvlId   = Assessment.level_id || '_default';
          const lvlNum  = Assessment.levels?.level_number ?? null;
          // Use toOrdinalLevel for proper "1st Level", "2nd Level", etc.
          // Fall back to existing name, then derive from level_number, then 'Unleveled'
          const lvlName = lvlNum != null
            ? toOrdinalLevel(lvlNum)
            : (Assessment.levels?.name || Assessment.level_name || (lvlId === '_default' ? 'Unleveled' : `Level ${lvlId}`));
          const lvlOrder = Assessment.levels?.level_number ?? Assessment.level_order ?? 99;
          if (!levelMap.has(lvlId)) levelMap.set(lvlId, { name: lvlName, order: lvlOrder, Assessments: [] });
          levelMap.get(lvlId).Assessments.push(Assessment);
        }

        // Sort levels by order
        const sortedLevels = [...levelMap.values()].sort((a, b) => a.order - b.order);

        // Build attempts quick-lookup for this student
        const attemptsRaw = await fetchAllStudentAttempts(session.student_id).catch(() => []);
        const bestByAssessment = {};
        const inProgByAssessment = {};
        for (const att of attemptsRaw) {
          const eid = att.assessment_id || att.Assessment_id;
          if (!eid) continue;
          const pct = parseFloat(att.percentage || 0);
          const st  = (att.status || '').toLowerCase();
          if (st === 'in_progress') { inProgByAssessment[eid] = att; continue; }
          if (!bestByAssessment[eid] || pct > parseFloat(bestByAssessment[eid].percentage || 0) || (pct === parseFloat(bestByAssessment[eid].percentage || 0) && new Date(att.submitted_at || 0) > new Date(bestByAssessment[eid].submitted_at || 0))) {
            bestByAssessment[eid] = att;
          }
        }

        // Render
        let html = '';
        for (const lvl of sortedLevels) {
          let lvlHtml = '';
          for (const Assessment of lvl.Assessments) {
            const best      = bestByAssessment[Assessment.id];
            const inProg    = inProgByAssessment[Assessment.id];
            const bestPct   = best ? parseFloat(best.percentage || 0) : null;
            const passed    = bestPct !== null && bestPct >= (Assessment.minimum_required_score || Assessment.pass_threshold || 60);
            const grade     = bestPct !== null ? getGrade(bestPct) : null;
            const gradeColors = { S: '#fbbf24', A: '#10b981', B: '#0ea5e9', C: '#c7c18c', D: '#f97316', E: '#f43f5e', F: '#ef4444' };
            const gradeColor  = grade ? (gradeColors[grade] || '#94a3b8') : null;

            // Prerequisite Gating Logic
            let prereqMet = true;
            let prereqTitle = '';
            const prereqId = Assessment.prerequisite_assessment_id || Assessment.prerequisite_id;
            if (prereqId) {
               const prereqBest = bestByAssessment[prereqId];
               const prereqPct = prereqBest ? parseFloat(prereqBest.percentage || 0) : null;
               const pObj = Assessments.find(a => a.id === prereqId);
               const pMinScore = pObj ? (pObj.minimum_required_score || pObj.pass_threshold || 60) : 60;
               prereqMet = prereqPct !== null && prereqPct >= pMinScore;
               prereqTitle = pObj ? (pObj.display_name || pObj.title || pObj.name || 'Prerequisite') : 'Prerequisite Assessment';
            }

            let statusBadge = '';
            let actionBtn   = '';
            let cardOpacity = '1';
            let cardFilter = 'none';

            if (!prereqMet) {
              cardOpacity = '0.5';
              cardFilter = 'grayscale(100%)';
              statusBadge = `<span style="background:rgba(255,255,255,0.1);color:#a1a1aa;border:1px solid rgba(255,255,255,0.2);
                              padding:2px 8px;border-radius:4px;font-size:0.68rem;font-weight:700;text-transform:uppercase;">🔒 Locked</span>`;
              actionBtn = `<div style="text-align:right;">
                             <span style="font-size:0.7rem;color:var(--clr-text-3);">Complete <b>${prereqTitle}</b><br>to unlock this assessment.</span>
                           </div>`;
            } else if (inProg) {
              statusBadge = `<span style="background:rgba(245,158,11,0.15);color:#fbbf24;border:1px solid rgba(245,158,11,0.35);
                              padding:2px 8px;border-radius:4px;font-size:0.68rem;font-weight:700;text-transform:uppercase;">&#9203; In Progress</span>`;
              actionBtn   = `<button onclick="location.href='assessment.html?attempt_id=${inProg.id}&assessment_id=${inProg.assessment_id || ''}'"
                              style="background:var(--clr-accent-1);color:#fff;border:none;padding:6px 14px;border-radius:6px;
                              font-size:0.78rem;font-weight:700;cursor:pointer;">Resume ←’</button>`;
            } else if (best) {
              const badgeBg = passed ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.12)';
              const badgeClr= passed ? '#10b981' : '#f87171';
              statusBadge = `<span style="background:${badgeBg};color:${badgeClr};border:1px solid ${badgeClr}33;
                              padding:2px 8px;border-radius:4px;font-size:0.68rem;font-weight:700;text-transform:uppercase;">
                              ${passed ? '&#10003; Passed' : '&#10007; Failed'} ${bestPct.toFixed(0)}%</span>`;

              if (Assessment.assessment_type === 'EXAM' && !passed) {
                if (best.is_remedial_unlocked) {
                  actionBtn = `<button onclick="location.href='assessment.html?assessment_id=${Assessment.id}'"
                                style="background:var(--clr-accent-1);color:#fff;border:none;padding:6px 14px;border-radius:6px;
                                font-size:0.78rem;font-weight:700;cursor:pointer;">🔓 Remedial Attempt Authorized — Start Retake</button>`;
                } else {
                  actionBtn = `<div style="display:flex; flex-direction:column; align-items:flex-end; text-align:right;">
                                 <span style="background:rgba(239,68,68,0.15);color:#f87171;padding:4px 8px;border-radius:4px;font-size:0.7rem;font-weight:700; border: 1px solid rgba(239,68,68,0.3); margin-bottom:4px;">🔒 Locked (Remediation Required)</span>
                                 <span style="font-size:0.65rem;color:var(--clr-text-3);">Official Exam score is below passing threshold.<br>Contact your tutor for remedial authorization.</span>
                               </div>`;
                }
              } else {
                let extraAction = '';
                if (
                  Assessment.assessment_category === 'TRYOUT' ||
                  Assessment.assessment_category === 'TASK' ||
                  (Assessment.assessment_type && Assessment.assessment_type.includes('TASK')) ||
                  (Assessment.title && Assessment.title.includes('Task')) ||
                  Assessment.payload?.is_standalone_tryout === true ||
                  !passed
                ) {
                  extraAction = `<button onclick="location.href='assessment.html?assessment_id=${Assessment.id}'"
                                style="background:var(--clr-accent-1);color:#fff;border:none;padding:6px 14px;border-radius:6px;
                                font-size:0.78rem;font-weight:700;cursor:pointer;margin-left:8px;">Retake</button>`;
                }
                actionBtn = `<div style="display:flex; align-items:center;">
                               <button onclick="location.href='result.html?attempt_id=${best.id}'"
                                style="background:rgba(255,255,255,0.06);color:var(--clr-text-2);border:1px solid var(--clr-border);
                                padding:6px 14px;border-radius:6px;font-size:0.78rem;font-weight:700;cursor:pointer;">View Result</button>
                               ${extraAction}
                             </div>`;
              }
            } else {
              statusBadge = `<span style="background:rgba(99,102,241,0.12);color:#a5b4fc;border:1px solid rgba(99,102,241,0.3);
                              padding:2px 8px;border-radius:4px;font-size:0.68rem;font-weight:700;text-transform:uppercase;">Not Started</span>`;
              actionBtn   = `<button onclick="location.href='assessment.html?assessment_id=${Assessment.id}'"
                              style="background:var(--clr-accent-1);color:#fff;border:none;padding:6px 14px;border-radius:6px;
                              font-size:0.78rem;font-weight:700;cursor:pointer;">Start Assessment ←’</button>`;
            }

            const gradeChip = grade ? `<span style="background:${gradeColor}22;color:${gradeColor};border:1px solid ${gradeColor}44;
              padding:2px 7px;border-radius:4px;font-size:0.72rem;font-weight:800;">${grade}</span>` : '';

            lvlHtml += `<div class="asm-modal-row" style="opacity:${cardOpacity}; filter:${cardFilter};" >






              <div class="asm-modal-info">
                <div style="font-size:0.85rem;font-weight:600;color:var(--clr-text-1);white-space:normal;line-height:1.3;" title="${Assessment.Assessment_title || Assessment.title || 'Assessment'}">
                  ${(Assessment.Assessment_title || Assessment.title || 'Assessment').replace(/^.*?-\s*\d+[a-z]{2}\s+Level\s*-\s*/i, '').replace(/Vocabulary Mastery /i, '')}
                </div>
                <div class="asm-modal-meta-group">
                  <div style="font-size:0.72rem;color:var(--clr-text-3);">
                  ${formatAnswerType(Assessment.answer_type)}
                </div>
                <div style="font-size:0.72rem;color:var(--clr-text-3);">
                  ⏱️ ${Assessment.time_limit_minutes || 0} min
                  </div>
                </div>
              </div>
              <div class="asm-modal-actions">
                ${gradeChip}
                ${statusBadge}
                ${actionBtn}
              </div>
            </div>`;
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
          html = `<div style="padding:2.5rem 1.5rem;text-align:center;color:var(--clr-text-3);"><p>More assessments will unlock as you progress!</p></div>`;
        }
        container.innerHTML = html;

      } catch(err) {
        container.innerHTML = `<div style="padding:2rem;text-align:center;color:var(--clr-text-3);">
          <div style="font-size:1.5rem;margin-bottom:0.5rem;">⚠️</div>
          <p style="font-size:0.85rem;">Could not load Assessments: ${err.message}</p></div>`;
      }
    }

    function formatAnswerType(atype) {
      if (!atype) return 'Written Test';
      if (atype === 'speech_to_text' || atype === 'spoken') return 'Speaking Test';
      if (atype === 'written') return 'Written Test';
      if (atype === 'multiple_choice' || atype === 'selection') return 'Selection';
      if (atype === 'dropdown') return 'Dropdown';
      return atype.replace('_', ' ');
    }



    // --- V1: Render Assigned Assessments Section ---
    // (Existing assessments logic)
    // --- Render Completed Assessments Section (Bottom of Dashboard) ---
    // --- Profile Modal & History ---
    // --- Level Modal close ---
    // --- Gamification: Show Level Up Popup ---
    // --- Render Completed Assessments Section (Bottom of Dashboard) ---
    // --- Profile Modal & History ---
    // --- Level Modal close ---
    // --- Gamification: Show Level Up Popup ---
    async function renderAssignedAssessments(assessments, allAttempts) {
      // Find or create the assigned-assessments section
      let section = document.getElementById('v1-assessments-section');
      if (!section) {
        // Insert before the completed-Assessments area
        const completedSection = document.getElementById('completed-Assessments-container')?.closest('section') ||
          document.getElementById('completed-Assessments-container')?.parentElement;
        section = document.createElement('section');
        section.id = 'v1-assessments-section';
        section.style.cssText = 'margin: 0 0 2rem 0;';
        if (completedSection) {
          completedSection.parentElement.insertBefore(section, completedSection);
        } else {
          document.querySelector('.dashboard-content, main, .main-content')?.appendChild(section);
        }
      }

      // Build attempts map: assessment_id -> best attempt
      const bestByAssessment = {};
      const inProgressByAssessment = {};
      allAttempts.forEach(att => {
        const aid = att.assessment_id || att.Assessment_id;
        if (!aid) return;
        const pct = parseFloat(att.percentage || 0);
        if ((att.status || '').toUpperCase() === 'IN_PROGRESS') {
          inProgressByAssessment[aid] = att;
        }
        // AGENTS.md §2.7: Report card stores strictly HIGHEST score across attempts
        if (!bestByAssessment[aid] || pct > parseFloat(bestByAssessment[aid].percentage || 0) || (pct === parseFloat(bestByAssessment[aid].percentage || 0) && new Date(att.submitted_at || 0) > new Date(bestByAssessment[aid].submitted_at || 0))) {
          bestByAssessment[aid] = att;
        }
      });

      const gradeColors = { S: '#fbbf24', A: '#10b981', B: '#0ea5e9', C: '#c7c18c', D: '#f97316', E: '#f43f5e', F: '#ef4444' };

      let cards = '';
      for (const asm of assessments) {
        const bestAtt = bestByAssessment[asm.id];
        const inProgAtt = inProgressByAssessment[asm.id];
        const bestPct = bestAtt ? parseFloat(bestAtt.percentage || 0) : null;
        const grade = bestPct !== null ? getGrade(bestPct) : null;
        const passed = bestPct !== null && bestPct >= (asm.pass_threshold || 60);

        // Check dynamic prerequisites (0 to N parents + min score thresholds + aggregate average)
        let prereqMet = true;
        let prereqTitle = '';

        if (asm.assessment_category === 'TEST' || asm.assessment_type === 'VOCAB_TEST' || asm.assessment_type === 'PHRASE_TEST') {
          const themeCode = asm.payload?.theme_code;
          if (themeCode) {
            const siblingTasks = assessments.filter(a => 
              (a.assessment_category === 'TASK' || a.assessment_type === 'VOCAB_TASK' || a.assessment_type === 'PHRASE_TASK') && 
              a.payload?.theme_code === themeCode && 
              a.level_id === asm.level_id &&
              a.class_id === asm.class_id
            );
            
            const reqScore = asm.prerequisite_min_score || 60;
            for (const task of siblingTasks) {
              const taskBest = bestByAssessment[task.id];
              const taskPct = taskBest ? parseFloat(taskBest.percentage || 0) : null;
              if (taskPct === null || taskPct < reqScore) {
                prereqMet = false;
                prereqTitle = `All Theme Tasks (Required: ≥${reqScore}%)`;
                break;
              }
            }
          }
        } else if (asm.prerequisites && typeof asm.prerequisites === 'object') {
          const parents = Array.isArray(asm.prerequisites.parents) ? asm.prerequisites.parents : [];
          let totalScore = 0;
          let count = 0;
          for (const parent of parents) {
            const pid = parent.assessment_id;
            const minScore = parent.min_score || 60;
            const parentBest = bestByAssessment[pid];
            const parentPct = parentBest ? parseFloat(parentBest.percentage || 0) : null;
            if (parentPct === null || parentPct < minScore) {
              prereqMet = false;
              const pObj = assessments.find(a => a.id === pid);
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
        } else if (asm.prerequisite_id || asm.prerequisite_assessment_id || asm.prerequisite_Assessment_id) {
          const pid = asm.prerequisite_id || asm.prerequisite_assessment_id || asm.prerequisite_Assessment_id;
          const prereqBest = bestByAssessment[pid];
          const prereqPct = prereqBest ? parseFloat(prereqBest.percentage || 0) : null;
          prereqMet = prereqPct !== null && prereqPct >= (asm.prerequisite_min_score || 60);
          
          const pObj = assessments.find(a => a.id === pid);
          prereqTitle = pObj ? (pObj.title || pObj.Assessment_title || 'Prerequisite') : 'Prerequisite Assessment';
        }

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
          statusBadge = `<span class="badge" style="background:rgba(251,191,36,0.15);color:#fbbf24;border:1px solid rgba(251,191,36,0.3);">\u25BA In Progress</span>`;
          actionBtn = `<button class="btn btn-warning btn-sm" data-aid="${asm.id}">Resume</button>`;
        } else if (isCompleted) {
          const asmTypeCheck = asm.assessment_type || asm.Assessment_type || 'Assessment';
          let retakesAllowed = asm.max_attempts == null || (asm.max_attempts > (allAttempts.filter(a => (a.assessment_id || a.Assessment_id) === asm.id && (a.status || '').toUpperCase() !== 'IN_PROGRESS').length));
          
          if (asmTypeCheck === 'EXAM' && !passed) {
             const remedialUnlocked = allAttempts.some(a => (a.assessment_id || a.Assessment_id) === asm.id && a.is_remedial_unlocked === true);
             if (!remedialUnlocked) retakesAllowed = false;
          }

          statusBadge = passed
            ? `<span class="badge" style="background:rgba(16,185,129,0.15);color:#10b981;border:1px solid rgba(16,185,129,0.3);">\u2713 Passed</span>`
            : `<span class="badge" style="background:rgba(245,158,11,0.15);color:#f59e0b;border:1px solid rgba(245,158,11,0.3);">Needs Improvement</span>`;
          const canRetake = retakesAllowed && (!passed || asm.assessment_category === 'TASK' || asm.assessment_category === 'TRYOUT' || asm.payload?.is_standalone_tryout === true);
          actionBtn = canRetake
            ? `<div style="display:flex;gap:6px;"><button class="btn btn-sm" style="background:rgba(255,255,255,0.05);border:1px solid var(--clr-border);padding:4px 8px;" data-aid-result="${bestAtt?.id}">View</button><button class="btn btn-sm btn-primary" style="padding:4px 8px;" data-aid="${asm.id}">Retake</button></div>`
            : `<button class="btn btn-sm" style="background:rgba(255,255,255,0.05);border:1px solid var(--clr-border);" data-aid-result="${bestAtt?.id}">View Result</button>`;
        } else {
          statusBadge = `<span class="badge" style="background:rgba(56,189,248,0.15);color:#38bdf8;border:1px solid rgba(56,189,248,0.3);">Ready</span>`;
          actionBtn = `<button class="btn btn-primary btn-sm" data-aid="${asm.id}">Start</button>`;
        }

        const duration = asm.working_duration_minutes || asm.time_limit_minutes || 60;
        const qCount = asm.question_count || '—';
        const asmType = asm.assessment_type || asm.Assessment_type || 'Assessment';
        const asmTitle = asm.title || asm.Assessment_title || 'Assessment';
        const className = asm.classes?.name || '';

        cards += `
          <div class="v1-assessment-card" data-assessment-id="${asm.id}" ${isLocked ? 'data-locked="true"' : ''} style="
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
              <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">
                <span style="font-size:0.78rem;color:var(--clr-text-3);">\u23F1 ${duration} min</span>
                ${qCount !== '—' ? `<span style="font-size:0.78rem;color:var(--clr-text-3);">\uD83D\uDCCB ${qCount} Questions</span>` : ''}
                ${statusBadge}
              </div>
              ${!prereqMet && prereqTitle ? `<div style="margin-top:0.5rem;"><span style="font-size:0.72rem;color:#f87171;">\uD83D\uDD12 Complete prerequisite first: <em>${escapeHtml(prereqTitle)}</em></span></div>` : ''}
            </div>
            <div style="display:flex;align-items:center;gap:0.75rem;flex-shrink:0;">
              ${bestPct !== null ? `
                <div style="text-align:center;">
                  <div style="font-size:1.1rem;font-weight:800;color:${gradeColors[grade] || 'var(--clr-text-1)'}${grade === 'S' ? ';text-shadow:0 0 10px rgba(251,191,36,0.6);' : ''}">${bestPct.toFixed(0)}%</div>
                  <div style="font-size:0.7rem;color:var(--clr-text-3);">Best Score</div>
                </div>
                ${grade === 'S'
                  ? `<div class="grade-S" style="width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:0.85rem;box-shadow:0 0 12px rgba(245,158,11,0.7);">S</div>`
                  : `<div style="width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:0.85rem;border:2px solid ${gradeColors[grade] || '#64748b'};color:${gradeColors[grade] || '#64748b'};">${grade}</div>`
                }
              ` : ''}
              ${actionBtn}
            </div>
          </div>
        `;
      }

      section.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
          <h3 style="font-size:1rem;font-weight:700;color:var(--clr-text-1);margin:0;">\uD83D\uDCCB Assigned Assessments <span style="font-size:0.75rem;color:var(--clr-text-3);font-weight:400;margin-left:8px;">${assessments.length} total</span></h3>
        </div>
        ${cards || '<div class="empty-state" style="padding:2rem;text-align:center;"><p class="text-muted">No assessments assigned to you yet.</p></div>'}
      `;

      // Wire up buttons
      section.querySelectorAll('[data-aid]').forEach(btn => {
        btn.addEventListener('click', () => {
          sessionStorage.setItem('topscore_assessment_id', btn.dataset.aid);
          window.location.href = 'assessment.html';
        });
      });
      section.querySelectorAll('[data-aid-result]').forEach(btn => {
        btn.addEventListener('click', () => {
          window.location.href = `result.html?attempt_id=${btn.dataset.aidResult}`;
        });
      });
    }

    // ── Overall Stats Calculation (AGENTS.md §2.8 & §2.10) ──
    
    function populateUpNext(attempts, myAssessments) {
      const upNextSection = document.getElementById('up-next-section');
      const upNextContainer = document.getElementById('up-next-container');
      if (!upNextSection || !upNextContainer) return;

      // Build best attempt & in-progress attempt maps per assessment
      const bestMap = {};
      const inProgMap = {};
      (attempts || []).forEach(a => {
        const aid = a.assessment_id || a.Assessment_id || (a.assessments && a.assessments.id) || a.id;
        if (!aid) return;
        const st = (a.status || '').toLowerCase();
        if (st === 'in_progress') {
          inProgMap[aid] = a;
        } else {
          const pct = parseFloat(a.percentage || 0);
          if (bestMap[aid] == null || pct > bestMap[aid]) {
            bestMap[aid] = pct;
          }
        }
      });

      // Helper to check if an assessment has been passed (>= passing threshold, default 60%)
      const isAssessmentPassed = (asm) => {
        const bestPct = bestMap[asm.id];
        if (bestPct == null) return false;
        const minPassing = (asm.minimum_required_score && parseFloat(asm.minimum_required_score) > 0)
          ? parseFloat(asm.minimum_required_score)
          : 60;
        return bestPct >= minPassing;
      };

      // Filter eligible assessments by status and student level
      const sessionLvlNum = parseInt(session.level_number) || 999;
      let candidateAssessments = (myAssessments || []).filter(a => {
        if (a.status !== 'PUBLISHED') return false;
        const aLvlNum = a.levels?.level_number || 999;
        return aLvlNum <= sessionLvlNum;
      });

      // Sort candidate assessments sequentially: level_number ascending, then display_order ascending
      candidateAssessments.sort((a, b) => {
        const aLvl = a.levels?.level_number || 999;
        const bLvl = b.levels?.level_number || 999;
        if (aLvl !== bLvl) return aLvl - bLvl;
        return (a.display_order || 99) - (b.display_order || 99);
      });

      // Find the first unpassed assessment in the sequential learning path whose prerequisites are met
      let nextAssessment = null;
      let nextAssessmentState = 'start'; // 'start', 'resume', 'retake'
      let nextAssessmentScore = null;

      for (const asm of candidateAssessments) {
        // If this assessment is already passed, student can proceed to the next one
        if (isAssessmentPassed(asm)) {
          continue;
        }

        // Student has NOT passed this assessment yet!
        // Check if its prerequisite is met:
        const prereqId = asm.prerequisite_assessment_id || asm.prerequisite_id;
        if (prereqId) {
          const prereqObj = candidateAssessments.find(a => a.id === prereqId) || (myAssessments || []).find(a => a.id === prereqId);
          const prereqMinScore = prereqObj ? (prereqObj.minimum_required_score || 60) : 60;
          const prereqScore = bestMap[prereqId];
          const prereqPassed = prereqScore != null && prereqScore >= prereqMinScore;
          
          if (!prereqPassed) {
            // Prerequisite is NOT passed! This assessment is strictly locked and cannot be Up Next.
            continue;
          }
        }

        // Prerequisites are met (or none)! This is the active assessment to take.
        nextAssessment = asm;
        if (inProgMap[asm.id]) {
          nextAssessmentState = 'resume';
        } else if (bestMap[asm.id] != null) {
          nextAssessmentState = 'retake';
          nextAssessmentScore = bestMap[asm.id];
        } else {
          nextAssessmentState = 'start';
        }
        break;
      }

      if (nextAssessment) {
        upNextSection.classList.remove('hidden');
        
        // Build card HTML
        const classObj = window._loadedClasses?.find(c => c.id === nextAssessment.class_id) || {};
        const className = classObj.name || nextAssessment.classes?.name || 'Class';
        const rawType = nextAssessment.assessment_type || 'TEST';
          const cleanType = rawType.includes('_') ? rawType.split('_').pop() : rawType;
          const typeStr = cleanType.charAt(0).toUpperCase() + cleanType.slice(1).toLowerCase();
        const title = nextAssessment.title || 'Untitled Assessment';
        
        const navLink = `sessionStorage.setItem('topscore_assessment_id','${nextAssessment.id}');window.location.href='assessment.html?assessment_id=${nextAssessment.id}&id=${nextAssessment.id}&program_id=${session.program_id}&institution_id=${session.institution_id}&class_id=${nextAssessment.class_id}'`;

        let buttonLabel = 'Start Now';
        let statusBadgeHtml = '';
        if (nextAssessmentState === 'retake') {
          buttonLabel = 'Retake Now';
          statusBadgeHtml = `<span style="background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 700;">Needs Improvement (${nextAssessmentScore != null ? nextAssessmentScore.toFixed(1) : '0'}%)</span>`;
        } else if (nextAssessmentState === 'resume') {
          buttonLabel = 'Resume';
          statusBadgeHtml = `<span style="background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 700;">In Progress</span>`;
        }

        upNextContainer.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <div>
              <div style="font-size: 1.1rem; font-weight: 800; color: #fff; margin-bottom: 4px;">${escapeHtml(title)}</div>
              <div style="font-size: 0.8rem; color: #94a3b8; display: flex; gap: 8px; align-items: center;">
                <span class="badge badge-primary" style="font-size: 0.65rem; padding: 2px 6px;">${escapeHtml(typeStr)}</span>
                ${statusBadgeHtml}
              </div>
            </div>
            <button onclick="${navLink}" class="btn btn-primary" style="padding: 6px 14px; font-size: 0.8rem; border-radius: 8px; font-weight: 700; white-space: nowrap;">${buttonLabel}</button>
          </div>
        `;
      } else {
        upNextSection.classList.add('hidden');
      }
    }

    async function computeOverallStats(attempts, assessments = []) {
      // Rule 2.8: Overall score is average of all takeable Assessments for student.
      // Rule 2.7: Global average strictly counts unopened/unattempted available modules as 0.
      // Best score per assessment is preserved across attempts.
      const bestMap = {};
      attempts.forEach(att => {
        const uniqueKey = att.assessment_instance_id || att.assessment_id || att.Assessment_id;
        if (!uniqueKey) return;
        const pct = parseFloat(att.percentage || 0);
        if (bestMap[uniqueKey] == null || pct > bestMap[uniqueKey]) {
          bestMap[uniqueKey] = pct;
        }
      });

      // Filter assessments that are currently within their availability window
      const now = new Date();
      const availableAssms = (assessments || []).filter(a => {
        const start = a.availability_start ? new Date(a.availability_start) : null;
        const end = a.availability_end ? new Date(a.availability_end) : null;
        return (!start || now >= start) && (!end || now <= end);
      });

      let scores = [];
      /* User requested strictly counting taken assessments */
      scores = Object.entries(bestMap)
        .filter(([k]) => !k.endsWith('_locked'))
        .map(([, v]) => parseFloat(v) || 0);

      const completedCount = Object.keys(bestMap).filter(k => !k.endsWith('_locked')).length;
      const AssessmentsCountEl = document.getElementById('stat-Assessments-done');
      if (AssessmentsCountEl) AssessmentsCountEl.textContent = completedCount;
      const ovCountEl = document.getElementById('overview-Assessments-count');
      if (ovCountEl) ovCountEl.textContent = completedCount;

      if (!scores.length) {
        document.getElementById('stat-overall-score').textContent = '0%';
        const gradeBadgeVal = document.getElementById('stat-overall-grade-value');
        if (gradeBadgeVal) gradeBadgeVal.textContent = '—';
        const gb = document.getElementById('stat-overall-grade-badge'); if (gb) gb.className = 'result-grade-display grade-none';
        renderCompletedAssessmentsBottom(attempts, 0);
        populateUpNext(attempts, assessments);
        return;
      }

      const totalPct = scores.reduce((acc, curr) => acc + curr, 0);
      const avgPct = Math.round(totalPct / scores.length);
      const overallGrade = getGrade(avgPct);

      const scoreEl = document.getElementById('stat-overall-score');
      scoreEl.textContent = `${avgPct}%`;
      scoreEl.className = `fw-800 banner-score-text text-grade-${overallGrade}`;

      const isGradeS = overallGrade === 'S' || avgPct >= 100;
      const gradeSymbol = isGradeS ? '⭐' : overallGrade;

      const gradeBadgeValue = document.getElementById('stat-overall-grade-value');
      if (gradeBadgeValue) gradeBadgeValue.textContent = gradeSymbol;
      
      const theme = (GRADE_PALETTE && GRADE_PALETTE[overallGrade]) ? GRADE_PALETTE[overallGrade] : {
        color: '#fbbf24', dark: '#d97706', light: '#fef08a', rgb: '251, 191, 36', glow: 'rgba(245, 158, 11, 0.85)'
      };
      const targetColor = theme.color;
      const rgbColor = theme.rgb || '251, 191, 36';

      // 1. Ambient Hero Banner Aura & Modular CSS Variables
      const welcomeSection = document.getElementById('welcome-banner-section');
      if (welcomeSection) {
        welcomeSection.dataset.tier = overallGrade;
        welcomeSection.style.setProperty('--tier-color', targetColor);
        welcomeSection.style.setProperty('--tier-rgb', rgbColor);
        if (isGradeS) {
          welcomeSection.style.borderColor = 'rgba(251, 191, 36, 0.5)';
          welcomeSection.style.boxShadow = '0 0 35px rgba(245, 158, 11, 0.35), 0 15px 35px -8px rgba(0, 0, 0, 0.5)';
          welcomeSection.style.background = 'radial-gradient(ellipse 90% 70% at 50% 0%, rgba(245, 158, 11, 0.22), transparent 75%), #0f172a';
        } else {
          welcomeSection.style.borderColor = `rgba(${rgbColor}, 0.35)`;
          welcomeSection.style.boxShadow = `0 0 20px rgba(${rgbColor}, 0.25), 0 10px 25px -5px rgba(0, 0, 0, 0.35)`;
          welcomeSection.style.background = `radial-gradient(ellipse 90% 70% at 50% 0%, rgba(${rgbColor}, 0.14), transparent 75%), #0f172a`;
        }
      }

      // 2. Avatar Container Ring & Glow
      const avatarBox = document.getElementById('banner-avatar-container');
      if (avatarBox) {
        if (isGradeS) {
          avatarBox.style.background = 'linear-gradient(135deg, #fef08a 0%, #fbbf24 45%, #d97706 100%)';
          avatarBox.style.boxShadow = '0 0 25px rgba(245, 158, 11, 0.85), 0 0 45px rgba(251, 191, 36, 0.45)';
          avatarBox.style.border = '2.5px solid #fde68a';
          avatarBox.classList.add('grade-S');
        } else {
          avatarBox.classList.remove('grade-S');
          avatarBox.style.background = 'rgba(15, 23, 42, 0.9)';
          avatarBox.style.boxShadow = `0 0 16px rgba(${rgbColor}, 0.45), 0 4px 14px rgba(0, 0, 0, 0.35)`;
          avatarBox.style.border = `2.5px solid ${targetColor}`;
        }
      }

      // 3. Score Value Display
      const scoreVal = document.getElementById('bottom-stat-avg-score');
      if (scoreVal) {
        scoreVal.style.color = targetColor;
        if (isGradeS) {
          scoreVal.style.filter = 'drop-shadow(0 0 14px rgba(251, 191, 36, 0.95)) drop-shadow(0 0 24px rgba(245, 158, 11, 0.7))';
          scoreVal.classList.add('text-grade-S');
        } else {
          scoreVal.classList.remove('text-grade-S');
          scoreVal.style.filter = `drop-shadow(0 0 10px rgba(${rgbColor}, 0.55))`;
        }
      }

      // 4. Grade Value Display
      const gradeVal = document.getElementById('stat-overall-grade-value');
      if (gradeVal) {
        gradeVal.style.color = targetColor;
        if (isGradeS) {
          gradeVal.style.filter = 'drop-shadow(0 0 14px rgba(251, 191, 36, 0.95)) drop-shadow(0 0 24px rgba(245, 158, 11, 0.7))';
          gradeVal.classList.add('text-grade-S');
        } else {
          gradeVal.classList.remove('text-grade-S');
          gradeVal.style.filter = `drop-shadow(0 0 10px rgba(${rgbColor}, 0.55))`;
        }
      }

      // 5. Border Accent on Score & Grade Cards
      const scoreCard = document.getElementById('banner-score-box');
      if (scoreCard) {
        scoreCard.style.borderColor = isGradeS ? 'rgba(251, 191, 36, 0.5)' : `rgba(${rgbColor}, 0.3)`;
        scoreCard.style.boxShadow = isGradeS
          ? '0 0 18px rgba(245, 158, 11, 0.25), 0 6px 16px rgba(0, 0, 0, 0.25)'
          : `0 0 12px rgba(${rgbColor}, 0.15), 0 4px 14px rgba(0, 0, 0, 0.2)`;
      }
      const gradeCard = document.getElementById('banner-grade-box');
      if (gradeCard) {
        gradeCard.style.borderColor = isGradeS ? 'rgba(251, 191, 36, 0.5)' : `rgba(${rgbColor}, 0.3)`;
        gradeCard.style.boxShadow = isGradeS
          ? '0 0 18px rgba(245, 158, 11, 0.25), 0 6px 16px rgba(0, 0, 0, 0.25)'
          : `0 0 12px rgba(${rgbColor}, 0.15), 0 4px 14px rgba(0, 0, 0, 0.2)`;
      }

      renderCompletedAssessmentsBottom(attempts, avgPct);
      populateUpNext(attempts, assessments);
    }

    // --- Render Completed Assessments Section (Bottom of Dashboard) ---
    function renderCompletedAssessmentsBottom(attempts, avgPct = 0) {
      const container = document.getElementById('completed-Assessments-container');
      const badgeEl = document.getElementById('bottom-completed-badge');
      const statTotalEl = document.getElementById('bottom-stat-total-Assessments');
      const statAvgEl = document.getElementById('bottom-stat-avg-score');
      const statBestEl = document.getElementById('bottom-stat-best-score');

      if (!attempts || !attempts.length) {
        if (badgeEl) badgeEl.textContent = '0 Assessments Completed';
        if (statTotalEl) statTotalEl.textContent = '0';
        if (statAvgEl) statAvgEl.textContent = '0%';
        if (statBestEl) statBestEl.textContent = '0%';
        if (container) {
          container.innerHTML = `
            <div class="empty-state p-8 text-center" style="padding: 40px 20px;">
              <div class="empty-state__icon" style="font-size:2.5rem;margin-bottom:12px;">📈</div>
              <h3 class="fw-700 text-base mb-1" style="color:var(--clr-text-1);">No Completed Assessments yet</h3>
              <p class="text-sm text-muted" style="max-width:440px;margin:0 auto;">
                Pick a Class above to start taking your assigned English assessments. Your scores, grades, and completion records will appear here.
              </p>
            </div>
          `;
        }
        return;
      }

      // Calculate summary statistics
      const bestAttemptsMap = {};
      let highestPct = 0;

      attempts.forEach(att => {
        const pct = parseFloat(att.percentage || 0);
        if (pct > highestPct) highestPct = pct;
        const aid = att.assessment_id || att.Assessment_id;
        if (!bestAttemptsMap[aid] || pct > bestAttemptsMap[aid]) {
          bestAttemptsMap[aid] = pct;
        }
      });

      const uniqueAssessmentsCount = Object.keys(bestAttemptsMap).length;
      let totalPctSum = 0;
      Object.values(bestAttemptsMap).forEach(pct => totalPctSum += pct);
      const avgScore = avgPct;

      if (badgeEl) badgeEl.textContent = `${uniqueAssessmentsCount} Assessment${uniqueAssessmentsCount === 1 ? '' : 's'} Completed`;
      if (statTotalEl) statTotalEl.textContent = uniqueAssessmentsCount;
      if (statAvgEl) statAvgEl.textContent = `${avgScore}%`;
      if (statBestEl) statBestEl.textContent = `${highestPct.toFixed(1)}%`;

      // Deduplicate attempts: keep the one with the highest score (or latest if tied) for each assessment
      const uniqueAttemptsMap = new Map();
      attempts.forEach(a => {
        const assessmentId = a.assessment_id || a.Assessment_id || (a.assessments && a.assessments.id) || a.id;
        const currentPct = parseFloat(a.percentage || 0);
        if (!uniqueAttemptsMap.has(assessmentId)) {
          uniqueAttemptsMap.set(assessmentId, a);
        } else {
          const existing = uniqueAttemptsMap.get(assessmentId);
          const existingPct = parseFloat(existing.percentage || 0);
          if (currentPct > existingPct) {
            uniqueAttemptsMap.set(assessmentId, a);
          } else if (currentPct === existingPct) {
             const existingDate = existing.submitted_at ? new Date(existing.submitted_at).getTime() : 0;
             const currentDate = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
             if (currentDate > existingDate) {
                 uniqueAttemptsMap.set(assessmentId, a);
             }
          }
        }
      });
      
      // Sort the deduplicated attempts by submitted_at desc
      const sortedAttempts = Array.from(uniqueAttemptsMap.values()).sort((a, b) => {
        const dateA = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
        const dateB = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;
        return dateB - dateA;
      });
      const gradeColors = { S: '#fbbf24', A: '#10b981', B: '#0ea5e9', C: '#c7c18c', D: '#f97316', E: '#f43f5e', F: '#ef4444' };

      // Desktop Table
      let tableHtml = `
        <div class="table-responsive">
          <table class="completed-Assessments-table">
            <thead>
              <tr>
                <th>Assessment Title</th>
                <th>Type</th>
                <th>Class</th>
                <th>Score</th>
                <th>Grade</th>
                <th>Date Completed</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
      `;

      // Mobile List
      let mobileListHtml = `
        <div class="completed-Assessments-mobile-list">
      `;

      sortedAttempts.forEach(a => {
        const AssessmentObj = a.assessments || a.Assessments || {};
        const AssessmentTitle = AssessmentObj.title || AssessmentObj.name || AssessmentObj.Assessment_title || 'English Assessment';
        const AssessmentType = AssessmentObj.assessment_type || AssessmentObj.Assessment_type || '';
        const className = AssessmentObj.classes?.name || 'General English';
        const pct = parseFloat(a.percentage || 0).toFixed(1);
        const grade = a.grade || getGrade(pct);
        const gradeColor = gradeColors[grade] || 'var(--clr-text-1)';
        const dateStr = a.submitted_at ? new Date(a.submitted_at).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }) : '—';
        const isPassed = parseFloat(pct) >= 60;
        const statusBadgeDesktop = isPassed
          ? `<span class="badge badge-success" style="font-size:0.75rem;padding:3px 8px;">✓ Passed</span>`
          : `<span class="badge badge-warning" style="font-size:0.75rem;padding:3px 8px;">⚠️ Retake Needed</span>`;
        const statusBadgeMobile = isPassed
          ? `<span style="color:#10b981;font-weight:700;">✓ Passed</span>`
          : `<span style="color:#f59e0b;font-weight:700;">⚠️ Retake</span>`;

        const attemptId = escapeHtml(a.id);
        const navLink = `window.location.href='result.html?attempt_id=${attemptId}'`;

        // Desktop Row
        tableHtml += `
          <tr onclick="${navLink}">
            <td>
              <div class="fw-700" style="color:var(--clr-text-1);">${escapeHtml(AssessmentTitle)}</div>
            </td>
            <td>
              ${AssessmentType ? `<span class="badge badge-neutral" style="font-size:0.7rem;">${escapeHtml(AssessmentType)}</span>` : '<span class="text-muted text-xs">—</span>'}
            </td>
            <td>
              <span class="badge badge-neutral" style="font-size:0.75rem;">${escapeHtml(className)}</span>
            </td>
            <td>
              <span class="fw-700 text-grade-${grade}" style="font-size:1rem; ${grade === 'S' ? 'filter:drop-shadow(0 0 6px rgba(251,191,36,0.6)); font-weight:900;' : ''}">${pct}%</span>
            </td>
            <td>
              <span class="grade-badge grade-${grade}" style="width:28px;height:28px;font-size:0.82rem;display:inline-flex;border-radius:8px;box-shadow:0 2px 6px rgba(0,0,0,0.2); ${grade === 'S' ? '' : `color:#fff;border:1.5px solid ${gradeColor};`}">${grade}</span>
            </td>
            <td class="text-muted text-sm">
              ${escapeHtml(dateStr)}
            </td>
            <td>
              ${statusBadgeDesktop}
            </td>
          </tr>
        `;

        // Mobile Card
        mobileListHtml += `
          <div class="completed-Assessment-mobile-card" onclick="${navLink}" style="padding: 8px 12px; gap: 4px; margin-bottom: 6px;">
            <div class="Assessment-card-header" style="margin-bottom: 2px;">
              <div class="Assessment-card-title" style="font-size: 0.9rem; line-height: 1.3;">${escapeHtml(AssessmentTitle)}</div>
              <span class="grade-badge grade-${grade}" style="width:24px;height:24px;font-size:0.75rem;display:inline-flex;border-radius:6px;box-shadow:0 2px 6px rgba(0,0,0,0.2); ${grade === 'S' ? '' : `color:#fff;border:1px solid ${gradeColor};`} flex-shrink:0;">${grade}</span>
            </div>
            
            <div class="Assessment-card-footer" style="margin-top: 0;">
              <div style="display:flex;align-items:center;gap:8px; font-size: 0.75rem;">
                <span style="color:var(--clr-text-3);">Score: <strong style="color:${gradeColor}; ${grade === 'S' ? 'filter:drop-shadow(0 0 4px rgba(251,191,36,0.6)); font-weight:900;' : ''}">${pct}%</strong></span>
                <span style="color:var(--clr-text-3);">&bull;</span>
                <span>${statusBadgeMobile}</span>
              </div>
              <div style="color:var(--clr-text-4); font-size: 0.7rem;">${escapeHtml(dateStr)}</div>
            </div>
          </div>
        `;
      });

      tableHtml += `
            </tbody>
          </table>
        </div>
      `;

      mobileListHtml += `
        </div>
      `;

      if (container) {
        container.innerHTML = tableHtml + mobileListHtml;
      }
    }

    // ============================================================
    // BATCH LEADERBOARD & DOCK TABS MODULE
    // ============================================================
    function setupDockTabs() {
      const btnStandings = document.getElementById('btn-dock-standings');
      const btnCompleted = document.getElementById('btn-dock-completed');
      const paneStandings = document.getElementById('dock-pane-standings');
      const paneCompleted = document.getElementById('dock-pane-completed');

      if (!btnStandings || !btnCompleted || !paneStandings || !paneCompleted) return;

      btnStandings.addEventListener('click', () => {
        btnStandings.classList.add('active');
        btnStandings.setAttribute('aria-selected', 'true');
        btnCompleted.classList.remove('active');
        btnCompleted.setAttribute('aria-selected', 'false');

        paneStandings.classList.remove('hidden');
        paneStandings.classList.add('active');
        paneCompleted.classList.add('hidden');
        paneCompleted.classList.remove('active');
      });

      btnCompleted.addEventListener('click', () => {
        btnCompleted.classList.add('active');
        btnCompleted.setAttribute('aria-selected', 'true');
        btnStandings.classList.remove('active');
        btnStandings.setAttribute('aria-selected', 'false');

        paneCompleted.classList.remove('hidden');
        paneCompleted.classList.add('active');
        paneStandings.classList.add('hidden');
        paneStandings.classList.remove('active');
      });
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
        const sb = await (await import('./supabase.js?v=5.2.2')).getSupabase();
        
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

        // 2. Fetch all submitted attempts for batch students
        const { data: attempts, error: attErr } = await sb
          .from('attempts')
          .select('id, student_id, assessment_id, percentage, is_best_score, status, submitted_at')
          .in('student_id', studentIds)
          .in('status', ['submitted', 'auto_submitted']);

        // 3. Compute best scores & overall averages per student
        const studentStats = studentList.map(st => {
          const stAtts = (attempts || []).filter(a => a.student_id === st.id);
          const bestMap = {};
          let lastSubmittedAt = null;

          stAtts.forEach(att => {
            const key = att.assessment_id;
            if (!key) return;
            const pct = parseFloat(att.percentage || 0);
            if (bestMap[key] == null || pct > bestMap[key]) {
              bestMap[key] = pct;
            }

            if (att.submitted_at) {
              if (!lastSubmittedAt || new Date(att.submitted_at) > new Date(lastSubmittedAt)) {
                lastSubmittedAt = att.submitted_at;
              }
            }
          });

          const scores = Object.entries(bestMap)
            .filter(([k]) => !k.endsWith('_locked'))
            .map(([, v]) => parseFloat(v) || 0);

          const completedCount = scores.length;
          const totalPct = scores.reduce((sum, v) => sum + v, 0);
          const overallScore = completedCount > 0 ? Math.round(totalPct / completedCount) : 0;
          const grade = getGrade(overallScore);
          const cleanName = cleanStudentName(st.name || '');

          return {
            id: st.id,
            rawName: st.name || '',
            cleanName: cleanName || st.name || 'Student',
            gender: st.gender || null,
            photo_url: st.photo_url || null,
            overallScore,
            completedCount,
            lastSubmittedAt,
            grade
          };
        });

        // 4. Deterministic Sort with 4-Level Tie-Breakers
        studentStats.sort((a, b) => {
          // Level 1: Overall Average Score (descending)
          if (b.overallScore !== a.overallScore) {
            return b.overallScore - a.overallScore;
          }
          // Level 2: Total completed assessments (descending)
          if (b.completedCount !== a.completedCount) {
            return b.completedCount - a.completedCount;
          }
          // Level 3: Earliest last submission timestamp (ascending)
          if (a.lastSubmittedAt && b.lastSubmittedAt) {
            const diff = new Date(a.lastSubmittedAt) - new Date(b.lastSubmittedAt);
            if (diff !== 0) return diff;
          }
          // Level 4: Alphabetical clean name (ascending)
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
          if (st.rank === 1 && st.overallScore > 0) {
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
            champNameEl.textContent = `👑 ${titleStr} (${champion.overallScore}%)`;
          } else {
            champNameEl.textContent = 'None yet (0%)';
          }
        }

        // 8. Render Leaderboard List
        let html = `<div class="leaderboard-table">`;
        studentStats.forEach(st => {
          const isMe = st.id === session.student_id;
          const isRank1 = st.rank === 1 && st.overallScore > 0;
          const rowClass = `leaderboard-row ${isMe ? 'my-row' : ''} ${isRank1 ? 'rank-1-row' : ''}`;
          
          let rankBadgeClass = 'leaderboard-rank-badge';
          let rankContent = st.rank;
          if (st.rank === 1) {
            rankBadgeClass += ' rank-1';
            rankContent = isRank1 ? '👑' : '1';
          } else if (st.rank === 2) {
            rankBadgeClass += ' rank-2';
            rankContent = '🥈';
          } else if (st.rank === 3) {
            rankBadgeClass += ' rank-3';
            rankContent = '🥉';
          }

          // Title & Tag
          let royalTag = '';
          let displayTitleName = st.cleanName;
          if (isRank1) {
            if (st.gender === 'male') {
              royalTag = `<span class="leaderboard-royal-tag">👑 KING</span>`;
              displayTitleName = `King ${st.cleanName}`;
            } else if (st.gender === 'female') {
              royalTag = `<span class="leaderboard-royal-tag">👑 QUEEN</span>`;
              displayTitleName = `Queen ${st.cleanName}`;
            } else {
              royalTag = `<span class="leaderboard-royal-tag">👑 TOP</span>`;
            }
          } else {
            if (st.gender === 'male') displayTitleName = `Mr. ${st.cleanName}`;
            else if (st.gender === 'female') displayTitleName = `Miss ${st.cleanName}`;
          }

          const initChar = st.cleanName ? st.cleanName.charAt(0).toUpperCase() : 'S';
          const avatarHtml = st.photo_url
            ? `<img src="${escHtml(st.photo_url)}" class="leaderboard-avatar-mini" alt="${escHtml(st.cleanName)}" onerror="this.outerHTML='<div class=\\'leaderboard-avatar-init\\'>${initChar}</div>'" />`
            : `<div class="leaderboard-avatar-init">${initChar}</div>`;

          const theme = GRADE_PALETTE[st.grade] || GRADE_PALETTE.F;
          const gradeSymbol = getGradeSymbol(st.grade, st.overallScore);

          html += `
            <div class="${rowClass}">
              <div class="leaderboard-col-left">
                <div class="${rankBadgeClass}">${rankContent}</div>
                ${avatarHtml}
                <div class="leaderboard-student-info">
                  <div class="leaderboard-name-wrap">
                    <span class="leaderboard-student-name">${escHtml(displayTitleName)}</span>
                    ${isMe ? '<span style="color:#38bdf8; font-size:0.7rem; font-weight:700;">(You)</span>' : ''}
                    ${royalTag}
                  </div>
                  <span class="leaderboard-sub-info">${st.completedCount} completed</span>
                </div>
              </div>
              <div class="leaderboard-col-right">
                <span class="leaderboard-score-val" style="color:${theme.color};">${st.overallScore}%</span>
                <div class="leaderboard-grade-chip" style="background:${theme.color};">${gradeSymbol}</div>
              </div>
            </div>
          `;
        });
        html += `</div>`;

        container.innerHTML = html;

      } catch (err) {
        console.error('Error loading batch leaderboard:', err);
        container.innerHTML = `
          <div class="empty-state p-4 text-center">
            <p style="color:#f87171; font-size:0.85rem;">Failed to load batch standings.</p>
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

      // Render Completed Assessments History
      const tbody = document.getElementById('tbl-profile-history');
      if (tbody) {
        tbody.innerHTML = '';
        if (!attempts || !attempts.length) {
          tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted p-4">No Completed Assessments yet.</td></tr>';
        } else {
          attempts.forEach(a => {
            const tr = document.createElement('tr');
            const title = a.Assessments ? `${a.Assessments.Assessment_type || ''} — ${a.Assessments.Assessment_title || 'Assessment'}` : 'Assessment';
            const pct = parseFloat(a.percentage || 0).toFixed(1);
            const grade = a.grade || getGrade(pct);

            tr.innerHTML = `
              <td class="fw-600">${title}</td>
              <td class="fw-700 text-grade-${grade}">${pct}%</td>
              <td><span class="grade-badge grade-${grade}" style="width:24px;height:24px;font-size:0.75rem;display:inline-flex;">${grade}</span></td>
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

      function switchProfileTab(tab) {
        if (tab === 'history') {
          tabBtnHistory?.classList.add('active');
          tabBtnHistory?.setAttribute('aria-selected', 'true');
          tabBtnProfile?.classList.remove('active');
          tabBtnProfile?.setAttribute('aria-selected', 'false');
          paneHistory?.classList.remove('hidden');
          paneProfile?.classList.add('hidden');
        } else {
          tabBtnProfile?.classList.add('active');
          tabBtnProfile?.setAttribute('aria-selected', 'true');
          tabBtnHistory?.classList.remove('active');
          tabBtnHistory?.setAttribute('aria-selected', 'false');
          paneProfile?.classList.remove('hidden');
          paneHistory?.classList.add('hidden');
        }
      }

      tabBtnProfile?.addEventListener('click', () => switchProfileTab('profile'));
      tabBtnHistory?.addEventListener('click', () => switchProfileTab('history'));

      // Fetch and display existing student photo and personal data
      (async () => {
        try {
          const sb = await (await import('./supabase.js?v=5.2.2')).getSupabase();
          const { data: st } = await sb.from('students').select('photo_url, birth_date, education').eq('id', session.student_id).single();
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
            const sb = await (await import('./supabase.js?v=5.2.2')).getSupabase();
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
          showToast('Foto profil baru berhasil diperbarui & disimpan!', 'success');
        } catch(err) {
          hideLoading();
          showToast('Gagal memproses foto: ' + err.message, 'error');
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

      openBtn.addEventListener('click', () => {
        applyStudentGenderUI(session.gender);
        switchProfileTab('profile');
        window.isProfileDirty = false;
        if(changePinForm) changePinForm.reset();
        modal.classList.remove('hidden');
      });
      closeBtn.addEventListener('click', () => {
        if (window.isProfileDirty) {
          if (!confirm('You have unsaved changes. Are you sure you want to close?')) return;
        }
        window.isProfileDirty = false;
        if(changePinForm) changePinForm.reset();
        modal.classList.add('hidden');
      });
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          if (window.isProfileDirty) {
            if (!confirm('You have unsaved changes. Are you sure you want to close?')) return;
          }
          window.isProfileDirty = false;
          if(changePinForm) changePinForm.reset();
          modal.classList.add('hidden');
        }
      });

      // Header avatar also opens profile modal
      document.getElementById('header-avatar')?.addEventListener('click', () => {
        applyStudentGenderUI(session.gender);
        switchProfileTab('profile');
        window.isProfileDirty = false;
        if(changePinForm) changePinForm.reset();
        modal.classList.remove('hidden');
      });
    }

    // --- Level Modal close ---
    document.getElementById('close-level-modal')?.addEventListener('click', () => {
      document.getElementById('level-modal').classList.add('hidden');
    });
    document.getElementById('level-modal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden');
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

    setupDockTabs();
    setupProfileModal([]);
    loadDashboard();
