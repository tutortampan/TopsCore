/**
 * TopsCore — Student Dashboard Module
 * Extracted from dashboard.html
 */

import { fetchStudentClasses, fetchStudentProgress, fetchTestsForStudentClass, fetchStudentAttemptsForTest, fetchAllStudentAttempts, fetchAttemptAnswers, updateStudentPin, changePin, uploadStudentPhoto, updateStudentGender, updateStudentBirthday, updateStudentEducation, formatStudentName, cleanStudentName, formatMatrixStudentName, fetchAssignments, fetchTests, toOrdinalLevel, toShortLevel, isCampContext, formatAcademicTier, resolveContextYear, fetchBatches, fetchStudentLevel, fetchFullStudentProfile, fetchActiveTestSession, fetchClassTestSettings } from './api.js?v=20261125_v681';
    import { requireStudentSession, clearStudentSession, updateStudentSessionGender, setStudentSession } from './session.js?v=20261106_v160';
    import { showToast, showLoading, hideLoading, getGrade, withTimeout, escapeHtml, escHtml } from './app.js?v=20261106_v160';
    import { testMicrophoneCapability } from './speech.js?v=20261106_v160';
    import { processAndCompressAvatar } from './utils/avatar-engine.js?v=20261106_v160';
    import { TOPSCORE_COLORS, GRADE_PALETTE, getGradeSymbol, getGradeColor, getScoreColor, getGradeColorByScore, getAchievementStatus, getTaskProgressVisual, isExam, isWeeklyExam, calculateGrade, computeMilestoneExamMastery, computeUnifiedScore, computeTopicPassLevel, getClassSvgIcon, formatTestDisplay, formatTestTitleHtml, detectClassDiscipline, isVocabularyClass, formatGradeBadgeHtml, isManualEvaluationClass, isCbtEvaluationClass } from './grading.js?v=20261106_v160';
    import { INDONESIA_REGIONS, formatProvinceName, formatCityDistrict, formatDistrictName, formatVillageName, getDistrictsForCity, getVillagesForDistrict } from './indonesia-regions.js?v=20261117_v547';
    import { getSvgIcon } from './svg-icons.js?v=20261114_v487';
    import { getSupabase } from './supabase.js?v=20261121_v161';

    if (typeof window !== 'undefined') {
      window.INDONESIA_REGIONS = INDONESIA_REGIONS;
    }

    if (typeof window !== 'undefined') {
      window._isBatchChampion = false;
      window._isKing = false;
      window._isQueen = false;
    }

    function parseHexRgb(hex) {
      if (!hex) return '56, 189, 248';
      let clean = String(hex).replace('#', '').trim();
      if (clean.length === 8) clean = clean.slice(0, 6);
      if (clean.length === 3) clean = clean.split('').map(c => c + c).join('');
      if (clean.length !== 6) return '56, 189, 248';
      const num = parseInt(clean, 16);
      return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
    }

    /**
     * Module M7 Dialogue Detection & URL Resolver
     */
    export function isDialogueTest(test) {
      if (!test) return false;
      const modId = String(test.module_id || '').toLowerCase();
      const modCode = String(test.module_code || test.payload?.module_code || '').toLowerCase();
      const modType = String(test.payload?.module_type || '').toUpperCase();
      const shell = String(test.shell_code || '').toUpperCase();
      const subType = String(test.test_subtype || '').toUpperCase();
      const cat = String(test.category || '').toLowerCase();
      const title = String(test.title || '').toLowerCase();
      const ansType = String(test.answer_type || test.payload?.answer_type || '').toLowerCase();

      return modId === 'c590c69f-44dc-4d26-9c19-263c6e7cbbec' ||
             modCode === 'm7' ||
             modCode === '7' ||
             modType === 'TURN_BASED_ROLEPLAY' ||
             shell.endsWith('-DIAL') ||
             shell.includes('-DIAL-') ||
             shell.includes('-M7-') ||
             subType.includes('DIALOGUE') ||
             subType.includes('ROLEPLAY') ||
             cat === 'dialogue' ||
             ansType === 'dialogue' ||
             title.includes('dialogue room') ||
             title.includes('p2p dialogue');
    }

    export function getTestLaunchUrl(test, activeSession = null) {
      if (!test) return 'test.html';
      const testId = test.id || test.test_id;
      if (isDialogueTest(test)) {
        const classId = test.class_id || '';
        const title = encodeURIComponent(test.title || 'Live Dialogue');
        const roomCode = activeSession?.dialogue_room_code ? `&room=${encodeURIComponent(activeSession.dialogue_room_code)}` : '';
        return `conversation.html?test_id=${testId}&class_id=${classId}&title=${title}${roomCode}`;
      }
      return `test.html?id=${testId}`;
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
  if (elLvl) {
    const isCamp = typeof isCampContext === 'function' ? isCampContext(session) : Boolean(/camp/i.test(session.program_name || '') || /cec|cake/i.test(session.institution_name || ''));
    const rawLvl = session.level_number != null ? session.level_number : (session.level_name || 1);
    const tierText = typeof formatAcademicTier === 'function' ? formatAcademicTier(rawLvl, isCamp, session) : (isCamp ? `${toShortLevel(rawLvl)} Step` : `${toShortLevel(rawLvl)} Level`);
    elLvl.textContent = tierText.toUpperCase();
  }

  // Suppress old welcome-meta logic
  const welcomeMetaEl = document.getElementById('welcome-meta');
  if(welcomeMetaEl) welcomeMetaEl.innerHTML = '';

  // Render Hero Profile Demographic & Address Details
  function renderHeroProfileDetails(s) {
    if (!s) return;
    const genderEl = document.getElementById('hero-demographics-gender');
    const ageEl = document.getElementById('hero-demographics-age');
    const dobEl = document.getElementById('hero-demographics-dob');
    const addrEl = document.getElementById('hero-address-text');

    const gRaw = (s.gender || '').toLowerCase();
    const gText = gRaw === 'female' ? 'Female' : (gRaw === 'male' ? 'Male' : '—');
    if (genderEl) {
      genderEl.textContent = gText;
      if (gRaw === 'female') {
        genderEl.style.color = 'var(--quad-a, #ff2d87)';
      } else if (gRaw === 'male') {
        genderEl.style.color = 'var(--primary-tactical, #38bdf8)';
      } else {
        genderEl.style.color = '#f8fafc';
      }
    }

    const rawDob = s.birth_date || s.dob;
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
    if (ageEl) ageEl.textContent = ageText;
    if (dobEl) dobEl.textContent = dobText;

    if (addrEl) {
      const fVill = s.village ? (typeof formatVillageName === 'function' ? formatVillageName(s.village) : s.village) : '';
      const fDist = s.district ? (typeof formatDistrictName === 'function' ? formatDistrictName(s.district) : s.district) : '';
      const fCity = s.city ? (typeof formatCityDistrict === 'function' ? formatCityDistrict(s.city) : s.city) : '';
      let fProv = s.province || '';
      if (fProv === 'Nusa Tenggara Barat' || fProv === 'West Nusa Tenggara') {
        fProv = 'NTB';
      } else if (typeof formatProvinceName === 'function') {
        fProv = formatProvinceName(fProv);
      }

      const parts = [fVill, fDist, fCity, fProv].map(x => (x || '').trim()).filter(x => x && x !== '—');
      addrEl.textContent = parts.length > 0 ? parts.join(', ') : 'Mataram City, NTB';
    }

    // Dynamic Hero Photo Height Sync: Photo follows biodata height (3:4 ratio)
    const syncPhotoHeightWithBio = () => {
      const bioTable = document.querySelector('.hero-bio-table');
      const avatarBox = document.getElementById('banner-avatar-container');
      const avatarWrap = document.querySelector('.banner-avatar-wrapper');
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
    requestAnimationFrame(syncPhotoHeightWithBio);

    if (typeof ResizeObserver !== 'undefined' && !window.__heroBioObserverBound) {
      window.__heroBioObserverBound = true;
      const bioTable = document.querySelector('.hero-bio-table');
      if (bioTable) {
        new ResizeObserver(syncPhotoHeightWithBio).observe(bioTable);
      }
    }
  }

  window.renderHeroProfileDetails = renderHeroProfileDetails;
  renderHeroProfileDetails(session);

  // Auto-fetch missing demographic/address fields for instant sync
  if ((!session.district || !session.village || !session.birth_date || !session.province) && session.student_id) {
    (async () => {
      try {
        const sb = await getSupabase();
        const { data: st } = await sb.from('students').select('gender, birth_date, education, province, city, district, village').eq('id', session.student_id).maybeSingle();
        if (st) {
          if (st.gender) session.gender = st.gender;
          if (st.birth_date) { session.birth_date = st.birth_date; session.dob = st.birth_date; }
          if (st.education) { session.education = st.education; session.education_level = st.education; }
          if (st.province) session.province = st.province;
          if (st.city) session.city = st.city;
          if (st.district) session.district = st.district;
          if (st.village) session.village = st.village;
          sessionStorage.setItem('topscore_session', JSON.stringify(session));
          renderHeroProfileDetails(session);
        }
      } catch (_) {}
    })();
  }



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

    function formatProfileStudentName(rawName, prefix = '') {
      const clean = cleanStudentName(rawName || 'Student');
      const fullWithTitle = `${prefix}${clean}`.trim();
      // Only abbreviate if really needed (longer than 32 characters in single line)
      if (fullWithTitle.length <= 32) {
        return fullWithTitle;
      }
      const targetNameLength = Math.max(16, 32 - prefix.length);
      const shortened = (typeof formatMatrixStudentName === 'function')
        ? formatMatrixStudentName(clean, targetNameLength)
        : clean;
      return `${prefix}${shortened}`.trim();
    }

    function applyStudentGenderUI(g) {
      const nameStr = (session.student_name || session.name || session.full_name || '').trim();
      let parts = nameStr.split(/\s+/).filter(Boolean);

      const firstLower = (parts[0] || '').toLowerCase();
      if (['mr.', 'mr', 'miss', 'ms.', 'ms', 'mrs.', 'mrs', 'king', 'queen'].includes(firstLower)) {
         parts.shift();
      }

      const cleanFullName = parts.join(' ').trim() || nameStr;
      const isLaluName = /^lalu\s+/i.test(cleanFullName);
      const isBaiqName = /^baiq\s+/i.test(cleanFullName);
      const effG = isLaluName ? 'male' : (isBaiqName ? 'female' : g);

      let formattedName = cleanFullName;

      const isKing = Boolean(window._isKing || session.is_king);
      const isQueen = Boolean(window._isQueen || session.is_queen);
      const isLeader = isKing || isQueen || Boolean(window._isBatchChampion);

      if (isKing || (isLeader && effG === 'male')) {
        formattedName = `King ${cleanFullName}`;
      } else if (isQueen || (isLeader && effG === 'female')) {
        formattedName = `Queen ${cleanFullName}`;
      } else {
        if (effG === 'male') {
          formattedName = `Mr. ${cleanFullName}`;
        } else if (effG === 'female') {
          formattedName = `Miss ${cleanFullName}`;
        }
      }

      const isAlumni = session.level_number === 99 || (session.program_status || '').toUpperCase() === 'ALUMNI' || (session.level_name || '').toLowerCase() === 'alumni' || (session.level_name || '').toUpperCase() === 'X';
      const crownEl = document.getElementById('banner-avatar-crown');
      const profCrownEl = document.getElementById('prof-avatar-crown');
      const updateCrown = (el) => {
        if (!el) return;
        if (isAlumni) {
          el.innerHTML = getSvgIcon('graduation-cap', 18);
          el.title = 'Alumni Graduate';
          el.classList.remove('hidden');
        } else if (isKing || isQueen || isLeader) {
          el.innerHTML = getSvgIcon('crown', 20);
          el.title = isKing ? 'King — Highest Male Score in Batch' : (isQueen ? 'Queen — Highest Female Score in Batch' : 'Batch Champion');
          el.classList.remove('hidden');
        } else {
          el.classList.add('hidden');
        }
      };
      updateCrown(crownEl);
      updateCrown(profCrownEl);

      const hdrNameEl = document.getElementById('header-student-name');
      if (hdrNameEl) hdrNameEl.textContent = formattedName;

      const profTitleEl = document.getElementById('prof-title-text');
      if (profTitleEl) {
        profTitleEl.textContent = isKing ? 'King' : (isQueen ? 'Queen' : (g === 'female' ? 'Miss' : 'Mr.'));
      }
      const welcNameEl = document.getElementById('welcome-name');
      if (welcNameEl) welcNameEl.textContent = formattedName;
      const profName = document.getElementById('prof-student-name');
      if (profName) {
        const titlePrefix = isKing ? 'King ' : (isQueen ? 'Queen ' : (g === 'female' ? 'Miss ' : 'Mr. '));
        profName.textContent = formatProfileStudentName(cleanFullName, titlePrefix);
      }

      session.gender = g;
      session.student_name = formattedName;
      session.is_king = isKing;
      session.is_queen = isQueen;
      setStudentSession(session);
      renderHeroProfileDetails(session);

      // Update initials
      const initChar = cleanFullName ? cleanFullName.charAt(0).toUpperCase() : 'S';
      const bInit = document.getElementById('banner-avatar-initial');
      const hInit = document.getElementById('header-avatar-initial');
      if (bInit) bInit.textContent = initChar;
      if (hInit) hInit.textContent = initChar;

      const badge = document.getElementById('prof-gender-badge');
      if (badge) {
        badge.style.display = 'none';
        badge.classList.add('hidden');
      }
      const genderTextEl = document.getElementById('prof-gender-text');
      if (genderTextEl) {
        genderTextEl.textContent = g === 'female' ? 'Female (Miss)' : 'Male (Mr.)';
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

    // SSOT Educational Levels & Smart Age-Based Eligibility (Shared Across Dashboard Modals)
    export const ALL_EDUCATION_LEVELS = [
      { value: 'kindergarten', label: 'Kindergarten (TK)' },
      { value: 'elementary', label: 'Elementary School (SD)' },
      { value: 'junior_high', label: 'Junior High School (SMP)' },
      { value: 'senior_high', label: 'Senior High School (SMA/SMK)' },
      { value: 'diploma', label: 'Diploma Degree (D1–D3)' },
      { value: 'bachelor', label: "Bachelor's Degree (S1/D4)" },
      { value: 'master', label: "Master's Degree (S2)" },
      { value: 'doctorate', label: 'Doctorate Degree (S3)' }
    ];

    export function getEducationEligibility(age) {
      if (age === null || isNaN(age)) {
        return {
          recommended: null,
          allowed: ALL_EDUCATION_LEVELS.map(e => e.value)
        };
      }
      if (age <= 6) {
        return { recommended: 'kindergarten', allowed: ['kindergarten'] };
      }
      if (age >= 7 && age <= 12) {
        return { recommended: 'elementary', allowed: ['kindergarten', 'elementary'] };
      }
      if (age >= 13 && age <= 15) {
        return { recommended: 'junior_high', allowed: ['elementary', 'junior_high'] };
      }
      if (age >= 16 && age <= 18) {
        return { recommended: 'senior_high', allowed: ['junior_high', 'senior_high'] };
      }
      if (age >= 19 && age <= 20) {
        // Age 19-20: Fresh high school graduate or college student. S1 not yet graduated!
        return { recommended: 'senior_high', allowed: ['senior_high', 'diploma'] };
      }
      if (age === 21) {
        return { recommended: 'senior_high', allowed: ['senior_high', 'diploma', 'bachelor'] };
      }
      if (age >= 22 && age <= 24) {
        return { recommended: 'bachelor', allowed: ['senior_high', 'diploma', 'bachelor'] };
      }
      // Age 25+
      return { recommended: 'bachelor', allowed: ['senior_high', 'diploma', 'bachelor', 'master', 'doctorate'] };
    }

    // ── Onboarding Pop-up: ABOUT YOU (All-in-One: Gender + Birthday + Address + Education) ──
    async function checkAndPromptWelcome() {
      let currentGender = session.gender || null;
      let currentBirthDate = session.birth_date || session.dob || null;
      let currentEducation = session.education || session.education_level || null;
      let currentProvince = session.province || null;
      let currentCity = session.city || null;
      let currentDistrict = session.district || null;
      let currentVillage = session.village || null;
      let currentBirthplace = session.birthplace || null;
      let currentPhone = session.phone || null;
      let currentGuardianName = session.guardian_name || null;
      let currentGuardianPhone = session.guardian_phone || null;

      if (!currentGender || !currentBirthDate || !currentEducation || !currentProvince || !currentCity) {
        try {
          const sb = await getSupabase();
          const { data: st } = await withTimeout(
            sb.from('students').select('gender, birth_date, education, province, city, district, village, birthplace, phone, guardian_name, guardian_phone').eq('id', session.student_id).maybeSingle(),
            1500
          );
          if (st) {
            if (st.gender) { currentGender = st.gender; session.gender = st.gender; }
            if (st.birth_date) { currentBirthDate = st.birth_date; session.birth_date = st.birth_date; session.dob = st.birth_date; }
            if (st.education) { currentEducation = st.education; session.education = st.education; session.education_level = st.education; }
            if (st.province) { currentProvince = st.province; session.province = st.province; }
            if (st.city) { currentCity = st.city; session.city = st.city; }
            if (st.district) { currentDistrict = st.district; session.district = st.district; }
            if (st.village) { currentVillage = st.village; session.village = st.village; }
            if (st.birthplace) { currentBirthplace = st.birthplace; session.birthplace = st.birthplace; }
            if (st.phone) { currentPhone = st.phone; session.phone = st.phone; }
            if (st.guardian_name) { currentGuardianName = st.guardian_name; session.guardian_name = st.guardian_name; }
            if (st.guardian_phone) { currentGuardianPhone = st.guardian_phone; session.guardian_phone = st.guardian_phone; }
            sessionStorage.setItem('topscore_session', JSON.stringify(session));
            renderHeroProfileDetails(session);
          }
        } catch (_) {}
      }

      if (currentGender && currentBirthDate && currentEducation && currentProvince && currentCity) {
        applyStudentGenderUI(currentGender);
        return;
      }

      hideLoading();
      const modal = document.getElementById('introduce-setup-modal');
      if (!modal) return;

      const optMale = document.getElementById('opt-gender-male');
      const optFemale = document.getElementById('opt-gender-female');
      const titleEl = document.getElementById('intro-setup-title');
      const nameEl = document.getElementById('intro-student-name');
      const rawStudentName = cleanStudentName(session.student_name || 'Top');
      const headerBrandEl = document.getElementById('dashboard-header-class-name');
      if (headerBrandEl) {
        headerBrandEl.textContent = rawStudentName.toUpperCase();
      }
      if (titleEl) {
        titleEl.textContent = 'GENDER';
      }
      if (nameEl) {
        nameEl.textContent = rawStudentName;
      }
      const dayInp = document.getElementById('intro-birth-day');
      const monthSel = document.getElementById('intro-birth-month');
      const yearInp = document.getElementById('intro-birth-year');
      const birthPlaceInp = document.getElementById('intro-birth-place');
      const phoneInp = document.getElementById('intro-phone');
      const guardianNameInp = document.getElementById('intro-guardian-name');
      const guardianPhoneInp = document.getElementById('intro-guardian-phone');
      const provSel = document.getElementById('intro-province');
      const citySel = document.getElementById('intro-city');
      const distSel = document.getElementById('intro-district');
      const villSel = document.getElementById('intro-village');
      const eduSel = document.getElementById('intro-education-level');
      const confirmBtn = document.getElementById('btn-confirm-introduce');

      if (birthPlaceInp && currentBirthplace) birthPlaceInp.value = currentBirthplace;
      if (phoneInp && currentPhone) phoneInp.value = currentPhone;
      if (guardianNameInp && currentGuardianName) guardianNameInp.value = currentGuardianName;
      if (guardianPhoneInp && currentGuardianPhone) guardianPhoneInp.value = currentGuardianPhone;

      let selectedGender = currentGender || null;

      if (currentGender) {
        const active = currentGender === 'male' ? optMale : optFemale;
        if (active) {
          active.classList.add('selected', 'active');
          active.setAttribute('aria-pressed', 'true');
        }
      }

      if (currentBirthDate) {
        const parts = currentBirthDate.split('-');
        if (parts.length === 3) {
          if (yearInp) yearInp.value = parseInt(parts[0], 10);
          if (monthSel) monthSel.value = parseInt(parts[1], 10);
          if (dayInp) dayInp.value = parseInt(parts[2], 10);
        }
      }

      function updateEducationDropdown() {
        if (!eduSel) return;
        const y = parseInt(yearInp?.value, 10);
        const m = parseInt(monthSel?.value, 10);
        const d = parseInt(dayInp?.value, 10);
        let age = null;
        if (!isNaN(y) && y >= 1940 && y <= new Date().getFullYear()) {
          const today = new Date();
          age = today.getFullYear() - y;
          const mDiff = (m ? m - 1 : 0) - today.getMonth();
          if (mDiff > 0 || (mDiff === 0 && (d || 1) > today.getDate())) {
            age--;
          }
        }

        const { recommended, allowed } = getEducationEligibility(age);
        let activeVal = eduSel.value || currentEducation;

        if (activeVal && !allowed.includes(activeVal)) {
          activeVal = recommended;
        } else if (!activeVal && recommended) {
          activeVal = recommended;
        }

        let html = '<option value="" disabled' + (!activeVal ? ' selected' : '') + '>Select highest education…</option>';

        if (recommended && age !== null) {
          const recObj = ALL_EDUCATION_LEVELS.find(e => e.value === recommended);
          if (recObj) {
            html += `<option value="${recObj.value}" ${activeVal === recObj.value ? 'selected' : ''}>${recObj.label}</option>`;
            html += `<option disabled class="select-divider">──────────</option>`;
          }
          const otherLevels = ALL_EDUCATION_LEVELS.filter(e => e.value !== recommended);
          html += otherLevels.map(e => `<option value="${e.value}" ${activeVal === e.value ? 'selected' : ''}>${e.label}</option>`).join('');
        } else {
          html += ALL_EDUCATION_LEVELS.map(e => `<option value="${e.value}" ${activeVal === e.value ? 'selected' : ''}>${e.label}</option>`).join('');
        }

        eduSel.innerHTML = html;
        if (activeVal) {
          eduSel.value = activeVal;
        }
      }

      function populateVillages(cityName, districtName, preselectVill = null) {
        if (!villSel) return;
        const villages = (typeof getVillagesForDistrict === 'function') ? getVillagesForDistrict(cityName, districtName) : [];
        if (villages && villages.length > 0) {
          villSel.disabled = false;
          let html = '<option value="" disabled' + (!preselectVill ? ' selected' : '') + '>Select village…</option>';
          html += villages.map(v => `<option value="${escapeHtml(v)}" ${preselectVill === v ? 'selected' : ''}>${escapeHtml(typeof formatVillageName === 'function' ? formatVillageName(v) : v)}</option>`).join('');
          villSel.innerHTML = html;
          if (preselectVill) villSel.value = preselectVill;
        } else {
          villSel.disabled = false;
          villSel.innerHTML = '<option value="Other" selected>Other / Manual</option>';
        }
      }

      function populateDistricts(cityName, preselectDist = null) {
        if (!distSel) return;
        const districts = (typeof getDistrictsForCity === 'function') ? getDistrictsForCity(cityName) : [];
        if (districts && districts.length > 0) {
          distSel.disabled = false;
          let html = '<option value="" disabled' + (!preselectDist ? ' selected' : '') + '>Select district…</option>';
          html += districts.map(d => `<option value="${escapeHtml(d)}" ${preselectDist === d ? 'selected' : ''}>${escapeHtml(typeof formatDistrictName === 'function' ? formatDistrictName(d) : d)}</option>`).join('');
          distSel.innerHTML = html;
          if (preselectDist) {
            distSel.value = preselectDist;
            populateVillages(cityName, preselectDist, currentVillage);
          } else {
            if (villSel) {
              villSel.disabled = true;
              villSel.innerHTML = '<option value="" disabled selected>Select village…</option>';
            }
          }
        } else {
          distSel.disabled = false;
          distSel.innerHTML = '<option value="Other" selected>Other / Manual</option>';
          if (villSel) {
            villSel.disabled = false;
            villSel.innerHTML = '<option value="Other" selected>Other / Manual</option>';
          }
        }
      }

      function populateCityDropdown(selectedProv, preselectCity = null) {
        if (!citySel) return;
        const rawCities = (typeof INDONESIA_REGIONS !== 'undefined' && INDONESIA_REGIONS[selectedProv]) ? INDONESIA_REGIONS[selectedProv] : [];
        if (rawCities.length > 0) {
          citySel.disabled = false;
          const sortedCities = [...rawCities].sort((a, b) => a.localeCompare(b, 'id'));
          let cityHtml = '<option value="" disabled' + (!preselectCity ? ' selected' : '') + '>Select regency…</option>';

          if (selectedProv === 'West Nusa Tenggara' || selectedProv === 'Nusa Tenggara Barat') {
            const SUGGESTED_CITY = "Kota Mataram";
            const otherCities = sortedCities.filter(c => c !== SUGGESTED_CITY);
            cityHtml += `<option value="${SUGGESTED_CITY}" ${preselectCity === SUGGESTED_CITY ? 'selected' : ''}>Mataram City</option>`;
            cityHtml += `<option disabled class="select-divider">──────────</option>`;
            cityHtml += otherCities.map(c => `<option value="${escapeHtml(c)}" ${preselectCity === c ? 'selected' : ''}>${escapeHtml(typeof formatCityDistrict === 'function' ? formatCityDistrict(c) : c)}</option>`).join('');
          } else {
            cityHtml += sortedCities.map(c => `<option value="${escapeHtml(c)}" ${preselectCity === c ? 'selected' : ''}>${escapeHtml(typeof formatCityDistrict === 'function' ? formatCityDistrict(c) : c)}</option>`).join('');
          }
          citySel.innerHTML = cityHtml;
          if (preselectCity) {
            citySel.value = preselectCity;
            populateDistricts(preselectCity, currentDistrict);
          } else {
            if (distSel) {
              distSel.disabled = true;
              distSel.innerHTML = '<option value="" disabled selected>Select district…</option>';
            }
            if (villSel) {
              villSel.disabled = true;
              villSel.innerHTML = '<option value="" disabled selected>Select village…</option>';
            }
          }
        } else {
          citySel.disabled = true;
          citySel.innerHTML = '<option value="" disabled selected>Select regency…</option>';
        }
      }

      // Populate 38 Provinces (Suggested West Nusa Tenggara at top, separated by divider, then A-Z)
      if (provSel && typeof INDONESIA_REGIONS !== 'undefined') {
        const SUGGESTED_PROV = "West Nusa Tenggara";
        const otherProvinces = Object.keys(INDONESIA_REGIONS)
          .filter(p => p !== 'Nusa Tenggara Barat' && p !== SUGGESTED_PROV)
          .sort((a, b) => a.localeCompare(b, 'id'));

        let provHtml = '<option value="" disabled' + (!currentProvince ? ' selected' : '') + '>Select province…</option>';
        provHtml += `<option value="${SUGGESTED_PROV}" ${currentProvince === SUGGESTED_PROV ? 'selected' : ''}>${SUGGESTED_PROV}</option>`;
        provHtml += `<option disabled class="select-divider">──────────</option>`;
        provHtml += otherProvinces.map(p => `<option value="${escapeHtml(p)}" ${currentProvince === p ? 'selected' : ''}>${escapeHtml(p)}</option>`).join('');

        provSel.innerHTML = provHtml;

        if (currentProvince && INDONESIA_REGIONS[currentProvince]) {
          provSel.value = currentProvince;
          populateCityDropdown(currentProvince, currentCity);
        } else {
          provSel.value = "";
          if (citySel) {
            citySel.disabled = true;
            citySel.innerHTML = '<option value="" disabled selected>Select regency…</option>';
          }
          if (distSel) {
            distSel.disabled = true;
            distSel.innerHTML = '<option value="" disabled selected>Select district…</option>';
          }
          if (villSel) {
            villSel.disabled = true;
            villSel.innerHTML = '<option value="" disabled selected>Select village…</option>';
          }
        }
      }

      updateEducationDropdown();

      function validateIntroForm() {
        const d = parseInt(dayInp?.value, 10);
        const m = parseInt(monthSel?.value, 10);
        const y = parseInt(yearInp?.value, 10);
        const edu = eduSel?.value;
        const prov = provSel?.value;
        const city = citySel?.value;
        const dist = distSel?.value;
        const vill = villSel?.value;

        const isGenderValid = !!selectedGender;
        const isDayValid = !isNaN(d) && d >= 1 && d <= 31;
        const isMonthValid = !isNaN(m) && m >= 1 && m <= 12;
        const isYearValid = !isNaN(y) && y >= 1940 && y <= new Date().getFullYear();
        const isEduValid = !!edu && edu.length > 0;
        const isProvValid = !!prov && prov.length > 0;
        const isCityValid = !!city && city.length > 0;
        const isDistValid = !!dist && dist.length > 0;
        const isVillValid = !!vill && vill.length > 0;

        const allValid = isGenderValid && isDayValid && isMonthValid && isYearValid && isEduValid && isProvValid && isCityValid && isDistValid && isVillValid;
        if (confirmBtn) {
          confirmBtn.disabled = !allValid;
        }
        return allValid;
      }

      const selectGender = (gender) => {
        selectedGender = gender;
        [optMale, optFemale].forEach(card => {
          if (card) {
            card.classList.remove('selected', 'active');
            card.setAttribute('aria-pressed', 'false');
          }
        });
        const activeCard = gender === 'male' ? optMale : optFemale;
        if (activeCard) {
          activeCard.classList.add('selected', 'active');
          activeCard.setAttribute('aria-pressed', 'true');
        }
        validateIntroForm();
      };

      if (optMale) optMale.onclick = () => selectGender('male');
      if (optFemale) optFemale.onclick = () => selectGender('female');

      if (dayInp) {
        dayInp.oninput = () => {
          updateEducationDropdown();
          validateIntroForm();
        };
      }
      if (monthSel) {
        monthSel.onchange = () => {
          updateEducationDropdown();
          validateIntroForm();
        };
      }
      if (yearInp) {
        yearInp.oninput = () => {
          updateEducationDropdown();
          validateIntroForm();
        };
      }
      if (provSel) {
        provSel.onchange = () => {
          populateCityDropdown(provSel.value);
          validateIntroForm();
        };
      }
      if (citySel) {
        citySel.onchange = () => {
          populateDistricts(citySel.value);
          validateIntroForm();
        };
      }
      if (distSel) {
        distSel.onchange = () => {
          populateVillages(citySel?.value, distSel.value);
          validateIntroForm();
        };
      }
      if (villSel) {
        villSel.onchange = validateIntroForm;
      }
      if (eduSel) {
        eduSel.onchange = validateIntroForm;
      }

      validateIntroForm();
      modal.classList.remove('hidden');

      return new Promise((resolve) => {
        let isResolved = false;
        const doResolve = () => {
          if (!isResolved) {
            isResolved = true;
            modal.classList.add('hidden');
            if (headerBrandEl) {
              const currentClass = window._dashboardActiveClasses?.[0];
              headerBrandEl.textContent = currentClass ? String(currentClass.name || '').toUpperCase() : 'TopsCore';
            }
            resolve();
          }
        };

        confirmBtn.onclick = async () => {
          if (!validateIntroForm()) return;
          confirmBtn.disabled = true;
          confirmBtn.textContent = 'Saving…';

          const d = parseInt(dayInp.value, 10);
          const m = parseInt(monthSel.value, 10);
          const y = parseInt(yearInp.value, 10);
          const birthDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const selectedBirthPlace = birthPlaceInp?.value?.trim() || null;
          const selectedPhone = phoneInp?.value?.trim() || null;
          const selectedGuardianName = guardianNameInp?.value?.trim() || null;
          const selectedGuardianPhone = guardianPhoneInp?.value?.trim() || null;
          const highestEdu = eduSel.value;
          const timeline = calculateEducationTimeline(y, highestEdu);
          const selectedProv = provSel?.value || null;
          const selectedCity = citySel?.value || null;
          const selectedDist = distSel?.value || null;
          const selectedVill = villSel?.value || null;

          try {
            const sb = await getSupabase();
            const updatePayload = {
              gender: selectedGender,
              birth_date: birthDate,
              education: highestEdu
            };
            if (selectedBirthPlace) updatePayload.birthplace = selectedBirthPlace;
            if (selectedPhone) updatePayload.phone = selectedPhone;
            if (selectedGuardianName) updatePayload.guardian_name = selectedGuardianName;
            if (selectedGuardianPhone) updatePayload.guardian_phone = selectedGuardianPhone;
            if (selectedProv) updatePayload.province = selectedProv;
            if (selectedCity) updatePayload.city = selectedCity;
            if (selectedDist) updatePayload.district = selectedDist;
            if (selectedVill) updatePayload.village = selectedVill;

            await sb.from('students').update(updatePayload).eq('id', session.student_id);

            session.gender = selectedGender;
            session.title = selectedGender === 'male' ? 'Mr.' : 'Miss';
            session.birth_date = birthDate;
            session.education = highestEdu;
            session.education_level = highestEdu;
            session.academic_history = timeline;
            if (selectedBirthPlace) session.birthplace = selectedBirthPlace;
            if (selectedPhone) session.phone = selectedPhone;
            if (selectedGuardianName) session.guardian_name = selectedGuardianName;
            if (selectedGuardianPhone) session.guardian_phone = selectedGuardianPhone;
            if (selectedProv) session.province = selectedProv;
            if (selectedCity) session.city = selectedCity;
            if (selectedDist) session.district = selectedDist;
            if (selectedVill) session.village = selectedVill;
            sessionStorage.setItem('topscore_session', JSON.stringify(session));
            renderHeroProfileDetails(session);

            applyStudentGenderUI(selectedGender);
          } catch (err) {
            console.warn('Failed to save student welcome profile in DB:', err);
          } finally {
            doResolve();
          }
        };
      });
    }

    // ── Onboarding Pop-up 02: WHERE DO YOU LIVE (Merged into Pop-up 01 ABOUT YOU) ──
    async function checkAndPromptAddress() {
      // Intentionally consolidated into checkAndPromptWelcome
      return;
    }

    // Unified wrapper for backward compatibility
    async function checkAndPromptIntroduce() {
      await checkAndPromptWelcome();
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
            updatePhotoGateState();
          }
        } else {
          throw new Error('Webcam not supported.');
        }
      } catch (err) {
        console.warn('Webcam initialization notice:', err.message);
        if (overlay) {
          overlay.innerHTML = `<span style="text-align:center;padding:10px;">${getSvgIcon('camera', 16)} Camera preview unavailable.<br><span class="text-xs text-muted">Please allow camera permission.</span></span>`;
        }
        if (confirmBtn) {
          updatePhotoGateState();
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

    let micReady = false;

    function updatePhotoGateState() {
      const confirmBtn = document.getElementById('btn-confirm-photo-setup');
      const photoCard = document.getElementById('card-status-photo');
      const photoBadge = document.getElementById('badge-status-photo');
      const micCard = document.getElementById('card-status-mic');
      const micBadge = document.getElementById('badge-status-mic');

      // Update Photo card & badge (Green ✓ or Red ✕)
      if (photoCard && photoBadge) {
        const hasPhoto = !!onboardPhotoData;
        photoCard.classList.toggle('card-success', hasPhoto);
        photoCard.classList.toggle('card-fail', !hasPhoto);
        photoBadge.classList.toggle('status-success', hasPhoto);
        photoBadge.classList.toggle('status-fail', !hasPhoto);
        photoBadge.innerHTML = hasPhoto ? '<span class="status-symbol">✓</span>' : '<span class="status-symbol">✕</span>';
      }

      // Update Mic card & badge (Green ✓ or Red ✕)
      if (micCard && micBadge) {
        micCard.classList.toggle('card-success', micReady);
        micCard.classList.toggle('card-fail', !micReady);
        micBadge.classList.toggle('status-success', micReady);
        micBadge.classList.toggle('status-fail', !micReady);
        micBadge.innerHTML = micReady ? '<span class="status-symbol">✓</span>' : '<span class="status-symbol">✕</span>';
      }

      if (confirmBtn) {
        const ready = !!(onboardPhotoData && micReady);
        confirmBtn.disabled = !ready;
      }
    }

    function updateHeaderMicStatus(res) {
      const headerMic = document.getElementById('header-mic-status') || document.querySelector('.header-mic-badge');
      if (!headerMic) return;
      headerMic.innerHTML = res?.ok ? `${getSvgIcon('mic', 12)} Ready` : `${getSvgIcon('mic', 12)} Check`;
      headerMic.className = res?.ok ? 'header-mic-badge active' : 'header-mic-badge warning';
    }

    async function checkMicrophoneOnEntry() {
      try {
        const res = await testMicrophoneCapability();
        updateHeaderMicStatus(res);
        micReady = !!res?.ok;
        updatePhotoGateState();
        return res;
      } catch (err) {
        console.warn('Microphone entry test error:', err);
        micReady = false;
        updatePhotoGateState();
      }
    }

    document.getElementById('card-status-mic')?.addEventListener('click', checkMicrophoneOnEntry);
    document.getElementById('btn-retry-mic')?.addEventListener('click', checkMicrophoneOnEntry);

    // Single Camera Action Button (Toggles Snap / Retake)
    document.getElementById('btn-camera-action')?.addEventListener('click', async () => {
      const video = document.getElementById('webcam-stream');
      const canvas = document.getElementById('webcam-canvas');
      const img = document.getElementById('webcam-snapshot');

      if (!onboardPhotoData) {
        // --- SNAP PHOTO ACTION ---
        if (!video || !canvas || !img) return;

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
        img.src = onboardPhotoData;
        img.classList.remove('hidden');
        video.classList.add('hidden');
        stopOnboardWebcam();
      } else {
        // --- RETAKE PHOTO ACTION ---
        onboardPhotoData = null;
        if (img) {
          img.src = '';
          img.removeAttribute('src');
          img.classList.add('hidden');
        }
        if (video) {
          video.classList.remove('hidden');
        }
        await startOnboardWebcam();
      }
      updatePhotoGateState();
    });

    // Save and enter dashboard
    document.getElementById('btn-confirm-photo-setup')?.addEventListener('click', async () => {
      if (!onboardPhotoData || !micReady) {
        showToast('Please capture your photo and allow microphone access to continue.', 'warning');
        return;
      }

      const btn = document.getElementById('btn-confirm-photo-setup');
      btn.disabled = true;
      btn.textContent = 'Saving photo…';

      try {
        if (onboardPhotoData) {
          let finalPhotoUrl = onboardPhotoData;
          try {
            finalPhotoUrl = await processAndCompressAvatar(onboardPhotoData, 'student');
          } catch (compErr) {
            console.warn('Avatar compression notice:', compErr);
            finalPhotoUrl = onboardPhotoData;
          }

          try {
            await uploadStudentPhoto(session.student_id, finalPhotoUrl);
            applyPhotoEverywhere(finalPhotoUrl);
            localStorage.removeItem(`stu_photo_retake_eligible_${session.student_id}`);
            session.photo_retake_eligible = false;
            localStorage.setItem(`stu_last_photo_updated_${session.student_id}`, new Date().toISOString());
            try {
              const { setStudentSession } = await import('./session.js?v=20261106_v154');
              setStudentSession(session);
            } catch (_) {}
            showToast('Profile photo registered successfully! Continuing setup…', 'success');
          } catch (uploadErr) {
            console.warn('Photo upload warning:', uploadErr);
            applyPhotoEverywhere(finalPhotoUrl);
            showToast('Photo captured! Continuing setup.', 'info');
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

    async function checkAndPromptPhoto() {
      let photoUrl = localStorage.getItem(`stu_photo_${session.student_id}`);
      if (!photoUrl) {
        try {
          const sb = await getSupabase();
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
        checkMicrophoneOnEntry();
        return;
      }

      // No photo registered! Clean state and show Photo & Mic Setup Modal
      hideLoading();
      onboardPhotoData = null;
      micReady = false;

      const nameEl = document.getElementById('photo-student-name');
      if (nameEl) nameEl.textContent = session.student_name || 'Student';

      const fileInp = document.getElementById('onboard-photo-file');
      if (fileInp) fileInp.value = '';
      const snapshotImg = document.getElementById('webcam-snapshot');
      if (snapshotImg) {
        snapshotImg.src = '';
        snapshotImg.removeAttribute('src');
        snapshotImg.classList.add('hidden');
      }
      const confirmBtn = document.getElementById('btn-confirm-photo-setup');
      if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = 'SAVE &amp; CONTINUE &rarr;';
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
          const sb = await getSupabase();
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
            if (headerBrandEl) {
              const currentClass = window._dashboardActiveClasses?.[0];
              headerBrandEl.textContent = currentClass ? String(currentClass.name || '').toUpperCase() : 'TopsCore';
            }
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


    // ===== AUTHORITATIVE EDUCATION TIMELINE ENGINE =====
    export const EDUCATION_TIERS = [
      { id: 'kindergarten', label: 'Kindergarten (TK)', short: 'TK', offset: 6 },
      { id: 'elementary', label: 'Elementary School (SD)', short: 'SD', offset: 12 },
      { id: 'junior_high', label: 'Junior High School (SMP)', short: 'SMP', offset: 15 },
      { id: 'senior_high', label: 'Senior High School (SMA/SMK)', short: 'SMA/SMK', offset: 18 },
      { id: 'diploma', label: 'Diploma Degree (D1–D3)', short: 'Diploma', offset: 21 },
      { id: 'bachelor', label: "Bachelor's Degree (S1/D4)", short: 'S1/D4', offset: 22 },
      { id: 'master', label: "Master's Degree (S2)", short: 'S2', offset: 24 },
      { id: 'doctorate', label: 'Doctoral Degree (S3)', short: 'S3', offset: 28 }
    ];

    export function calculateEducationTimeline(birthYear, highestLevelId) {
      const by = parseInt(birthYear, 10);
      if (!by || isNaN(by)) return [];

      const baseTiers = ['kindergarten', 'elementary', 'junior_high', 'senior_high'];
      let path = [];

      if (baseTiers.includes(highestLevelId)) {
        const idx = baseTiers.indexOf(highestLevelId);
        path = baseTiers.slice(0, idx + 1);
      } else if (highestLevelId === 'diploma') {
        path = [...baseTiers, 'diploma'];
      } else if (highestLevelId === 'bachelor') {
        path = [...baseTiers, 'bachelor'];
      } else if (highestLevelId === 'master') {
        path = [...baseTiers, 'bachelor', 'master'];
      } else if (highestLevelId === 'doctorate') {
        path = [...baseTiers, 'bachelor', 'master', 'doctorate'];
      } else {
        path = [...baseTiers];
      }

      return path.map(id => {
        const tier = EDUCATION_TIERS.find(t => t.id === id);
        const gradYear = by + tier.offset;
        return {
          id: tier.id,
          level: tier.short,
          name: tier.label,
          institution: tier.label,
          year: gradYear
        };
      });
    }

    let _eduModalInitialized = false;
    let _eduResolve = null;

    export function initEducationModalControls(birthYear = 2002) {
      const modal = document.getElementById('education-setup-modal');
      if (!modal) return;

      const byDisplay = document.getElementById('edu-birth-year-display');
      if (byDisplay) byDisplay.textContent = birthYear;

      let selectedLevel = null;
      let currentTimeline = [];

      const levelButtons = modal.querySelectorAll('.edu-level-btn');
      const confirmBtn = document.getElementById('btn-confirm-education-setup');
      const previewWrap = document.getElementById('edu-timeline-preview-wrap');
      const previewList = document.getElementById('edu-timeline-preview');
      const countBadge = document.getElementById('edu-timeline-count');

      levelButtons.forEach(btn => {
        btn.onclick = () => {
          levelButtons.forEach(b => {
            b.classList.remove('selected');
            b.setAttribute('aria-checked', 'false');
          });
          btn.classList.add('selected');
          btn.setAttribute('aria-checked', 'true');
          selectedLevel = btn.dataset.level;

          currentTimeline = calculateEducationTimeline(birthYear, selectedLevel);

          if (previewList) {
            previewList.innerHTML = currentTimeline.map(item => `
              <div class="edu-timeline-item">
                <div class="edu-item-info">
                  <span class="edu-item-dot"></span>
                  <span class="fw-600">${escapeHtml(item.name)}</span>
                </div>
                <span class="edu-item-year">Graduated ${item.year}</span>
              </div>
            `).join('');
          }

          if (countBadge) countBadge.textContent = `${currentTimeline.length} Milestones`;
          if (previewWrap) previewWrap.classList.remove('hidden');
          if (confirmBtn) confirmBtn.disabled = false;
        };
      });

      if (!_eduModalInitialized) {
        _eduModalInitialized = true;
        confirmBtn?.addEventListener('click', async () => {
          if (!selectedLevel || currentTimeline.length === 0) {
            showToast('Please select your highest education level.', 'warning');
            return;
          }

          confirmBtn.disabled = true;
          confirmBtn.textContent = 'Saving Academic Timeline…';

          try {
            await updateStudentEducation(session.student_id, currentTimeline);
            session.education = currentTimeline;
            const { setStudentSession } = await import('./session.js?v=20261106_v154');
            setStudentSession(session);
            showToast('Academic timeline verified!', 'success');
            modal.classList.add('hidden');
            if (typeof _eduResolve === 'function') {
              _eduResolve();
              _eduResolve = null;
            }
          } catch (err) {
            console.warn('Error saving education level:', err);
            showToast('Could not save education: ' + err.message, 'error');
            confirmBtn.disabled = false;
            confirmBtn.textContent = '✓ Confirm Academic Timeline & Continue';
          }
        });
      }
    }
    window.initEducationModalControls = initEducationModalControls;

    async function checkAndPromptEducation() {
      let hasEducation = false;
      let birthYear = 2002;

      try {
        const sb = await getSupabase();
        const { data: st } = await sb.from('students').select('education, birth_date').eq('id', session.student_id).maybeSingle();
        if (st && st.education) {
          if (Array.isArray(st.education) && st.education.length > 0) {
            hasEducation = true;
          } else if (typeof st.education === 'string' && st.education.trim().length > 0) {
            try {
              const parsed = JSON.parse(st.education);
              if (Array.isArray(parsed) && parsed.length > 0) hasEducation = true;
              else hasEducation = true;
            } catch (_) {
              hasEducation = true;
            }
          }
          if (hasEducation && !session.education) {
             session.education = st.education;
             const { setStudentSession } = await import('./session.js?v=20261106_v154');
             setStudentSession(session);
          }
        }
        if (st?.birth_date) {
          const d = new Date(st.birth_date);
          if (!isNaN(d.getFullYear())) birthYear = d.getFullYear();
        } else if (session.dob || session.birth_date) {
          const d = new Date(session.dob || session.birth_date);
          if (!isNaN(d.getFullYear())) birthYear = d.getFullYear();
        }
      } catch (err) {
        console.warn('Could not check education status from DB:', err);
      }

      initEducationModalControls(birthYear);

      if (hasEducation) return;

      hideLoading();
      const modal = document.getElementById('education-setup-modal');
      if (!modal) return;
      modal.classList.remove('hidden');

      return new Promise((resolve) => {
        _eduResolve = resolve;
      });
    }

    // ── Load Classes & Dashboard ──
    async function loadDashboard() {
      try {
        hideLoading();
        // Consolidate full student profile in ONE single query (demographics + photo + level)
        let fullProf = null;
        try {
          fullProf = await fetchFullStudentProfile(session.student_id);
          if (fullProf) {
            if (fullProf.gender) session.gender = fullProf.gender;
            if (fullProf.birth_date) { session.birth_date = fullProf.birth_date; session.dob = fullProf.birth_date; }
            if (fullProf.education) { session.education = fullProf.education; session.education_level = fullProf.education; }
            if (fullProf.province) session.province = fullProf.province;
            if (fullProf.city) session.city = fullProf.city;
            if (fullProf.district) session.district = fullProf.district;
            if (fullProf.village) session.village = fullProf.village;
            if (fullProf.photo_url) {
              session.photo_url = fullProf.photo_url;
              localStorage.setItem(`stu_photo_${session.student_id}`, fullProf.photo_url);
            }
            if (fullProf.batches?.name) {
              session.batch_name = fullProf.batches.name;
              if (fullProf.batches.enrollment_date) session.enrollment_date = fullProf.batches.enrollment_date;
            }
            if (fullProf.programs?.name) {
              session.program_name = fullProf.programs.name;
            }
            if (fullProf.programs?.institutions?.name) {
              session.institution_name = fullProf.programs.institutions.name;
            }
            if (fullProf.resolved_level?.level_id) {
              session.level_id = fullProf.resolved_level.level_id;
              session.level_number = fullProf.resolved_level.level_number;
              session.level_name = fullProf.resolved_level.level_name;
            }
            sessionStorage.setItem('topscore_session', JSON.stringify(session));
            renderHeroProfileDetails(session);

            // Live-sync header metadata pill
            const elBatch = document.getElementById('meta-batch');
            if (elBatch && session.batch_name) {
              const rawB = session.batch_name || '';
              elBatch.textContent = rawB.replace(/^batch\s*/i, '') || rawB || '—';
            }
            const elLvl = document.getElementById('meta-lvl');
            if (elLvl) {
              const isCamp = typeof isCampContext === 'function' ? isCampContext(session) : Boolean(/camp/i.test(session.program_name || '') || /cec|cake/i.test(session.institution_name || ''));
              const rawLvl = session.level_number != null ? session.level_number : (session.level_name || 1);
              const tierText = typeof formatAcademicTier === 'function' ? formatAcademicTier(rawLvl, isCamp, session) : (isCamp ? `${toShortLevel(rawLvl)} Step` : `${toShortLevel(rawLvl)} Level`);
              elLvl.textContent = tierText.toUpperCase();
            }
            if (typeof updateDockTabsVisibility === 'function') {
              updateDockTabsVisibility();
            }
          }
        } catch (_) {}

        // Onboarding Step 1: Pop-up 01 ABOUT YOU (All-in-One: Gender + Birthday + Address + Education)
        await checkAndPromptIntroduce();
        // Onboarding Step 2: Pop-up 03 TAKE YOUR PHOTO (Webcam Snapshot Capture)
        await checkAndPromptPhoto();

        showLoading('Loading your dashboard…');

        const studentLvl = fullProf?.resolved_level || await fetchStudentLevel(session.student_id);
        if (studentLvl.level_id) {
          session.level_id = studentLvl.level_id;
          session.level_number = studentLvl.level_number;
          session.level_name = studentLvl.level_name;
          sessionStorage.setItem('topscore_session', JSON.stringify(session));

          // Explicitly update DOM header pill
          const elLvl = document.getElementById('meta-lvl');
          if (elLvl && (studentLvl.level_name || studentLvl.level_number != null)) {
            const isCamp = typeof isCampContext === 'function' ? isCampContext(session) : Boolean(/camp/i.test(session.program_name || '') || /cec|cake/i.test(session.institution_name || ''));
            const rawLvl = studentLvl.level_number != null ? studentLvl.level_number : studentLvl.level_name;
            const tierText = typeof formatAcademicTier === 'function' ? formatAcademicTier(rawLvl, isCamp, session) : (isCamp ? `${toShortLevel(rawLvl)} Step` : `${toShortLevel(rawLvl)} Level`);
            elLvl.textContent = tierText.toUpperCase();
          }

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
                span.style.cssText = "font-size: 12px; font-weight: 700; color: #e2e8f0; letter-spacing: 0.025em;";
              } else {
                span.className = "text-xs font-semibold text-slate-400 tracking-wide";
                span.style.cssText = "font-size: 12px; font-weight: 600; color: #94a3b8; letter-spacing: 0.025em;";
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
            const isAlumni = session.level_number === 99 || (session.program_status || '').toUpperCase() === 'ALUMNI' || (session.level_name || '').toLowerCase() === 'alumni' || (session.level_name || '').toUpperCase() === 'X';
            const isNonLevel = session.level_number === 0 || (session.level_name || '').toLowerCase() === 'non-level' || (session.level_name || '').toLowerCase() === 'general' || session.level_name === '—' || session.level_name === '-';
            if (isAlumni) {
              welcomeLevelEl.innerHTML = `Alumni ${getSvgIcon('graduation-cap', 14)}`;
              welcomeLevelPanelEl.classList.remove('hidden');
            } else if (isNonLevel) {
              welcomeLevelEl.textContent = typeof resolveContextYear === 'function' ? resolveContextYear(session) : String(new Date().getFullYear());
              welcomeLevelPanelEl.classList.remove('hidden');
            } else {
              const isCamp = typeof isCampContext === 'function' ? isCampContext(session) : Boolean(/camp/i.test(session.program_name || '') || /cec|cake/i.test(session.institution_name || ''));
              const rawLvl = session.level_number != null ? session.level_number : (session.level_name || 1);
              welcomeLevelEl.innerHTML = typeof formatAcademicTier === 'function' ? formatAcademicTier(rawLvl, isCamp, session) : session.level_name;
              welcomeLevelPanelEl.classList.remove('hidden');
            }
          }
        }

        // Check for Level-Up Celebration
        const celebration = sessionStorage.getItem('topscore_pending_levelup_celebration');
        if (celebration) {
          sessionStorage.removeItem('topscore_pending_levelup_celebration');
          setTimeout(() => {
            if (typeof window.Swal !== 'undefined') {
              Swal.fire({
                title: 'Level Up!',
                text: `Congratulations! You have unlocked ${celebration}.`,
                icon: 'success',
                confirmButtonColor: '#38bdf8'
              });
            } else {
              showToast(`Congratulations! You have unlocked ${celebration}.`, 'success');
            }
          }, 1000);
        }

        const [Classes, progress, attempts, assignmentsRaw] = await withTimeout(
          Promise.all([
            fetchStudentClasses(session.program_id, session.institution_id, session.level_id),
            fetchStudentProgress(session.student_id),
            fetchAllStudentAttempts(session.student_id),
            Promise.resolve([])
          ]),
          20000,
          'Fetching dashboard data'
        );

        const classIds = (Classes || []).map(c => c.id).filter(Boolean);
        const testsRaw = classIds.length > 0
          ? await fetchTests({ class_ids: classIds }).catch(() => [])
          : await fetchTests({ class_id: null }).catch(() => []);

        hideLoading();
        window._cachedBatchStudents = null;
        window._cachedBatchAttempts = null;
        renderClasses(Classes, progress, testsRaw, attempts);
        await renderSelectedClassDashboard();
        setupProfileModal(attempts);
      } catch(e) {
        hideLoading();
        showToast('Failed to load dashboard: ' + e.message, 'error');
        // Clear loading placeholders if there's an error
        renderClasses([], [], [], []);
        renderCompletedTestsBottom([], 0);
        await loadBatchLeaderboard().catch(() => {});
        setupProfileModal([]);
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
            if (settings?.taskRepetitions) targetReps = Math.max(1, Number(settings.taskRepetitions) || 7);
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
          const title = t?.title || 'Last Test';
          const pct = parseFloat(lastAttempt.percentage || 0).toFixed(0);
          leftEl.innerHTML = `<span class="last-asm-title" title="${escapeHtml(title)}">Last: ${escapeHtml(title)}</span>`;
          rightEl.innerHTML = `<span class="last-asm-score">${pct}%</span>`;
        } else {
          leftEl.innerHTML = `<span class="last-asm-title text-muted">No tests taken yet</span>`;
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
      const validClass = (classes || []).find(c => c.id === window._selectedClassId) || (classes && classes[0]);
      const activeClassId = validClass ? validClass.id : null;
      if (validClass && window._selectedClassId !== validClass.id) {
        window._selectedClassId = validClass.id;
      }
      const myClassIds = new Set((classes || []).map(c => c.id));

      const discipline = validClass ? detectClassDiscipline(validClass) : 'GENERAL';
      const isManualClass = validClass ? isManualEvaluationClass(validClass) : false;

      if (isManualClass) {
        const repRow = document.getElementById('repetition-mastery-section');
        if (repRow) repRow.style.display = 'none';

        container.innerHTML = `
          <div class="next-test-header-bar">
            <div class="next-test-title-wrap">
              <span class="next-test-primary-name" style="color:var(--primary-tactical); font-weight:800; text-transform:uppercase; font-size:11px; letter-spacing:0.5px;">TUTOR EVALUATED CLASS</span>
              <span class="next-test-title-sep">•</span>
              <span class="next-test-topic-name" style="font-size:13px; font-weight:700; color:#fff;">${escapeHtml(validClass.name)}</span>
            </div>
          </div>
          <div class="next-test-body-row">
            <div class="next-test-col-left" style="flex:1;">
              <div class="next-test-sub" style="font-size:12px; font-weight:500; color:var(--clr-text-2);">
                Direct classroom evaluations, weekly assessments & periodical examinations.
              </div>
            </div>
            <div class="next-test-col-right" title="Review Academic Record">
              <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('completed-Tests-container')?.scrollIntoView({ behavior:'smooth' })" style="height:32px; font-size:11px; font-weight:700; padding:0 12px; border-radius:6px; background:rgba(56,189,248,0.15); border:1px solid rgba(56,189,248,0.4); color:#38bdf8;">
                Review Scores
              </button>
            </div>
          </div>
        `;
        return;
      }

      // Target repetitions & minimum score threshold
      let targetReps = 7;
      let minScore = 50;
      try {
        if (typeof fetchClassTestSettings === 'function' && activeClassId) {
          const settings = await fetchClassTestSettings(activeClassId).catch(() => null);
          if (settings?.taskRepetitions) targetReps = Math.max(1, Number(settings.taskRepetitions) || 7);
          if (settings?.taskMinScore) minScore = Number(settings.taskMinScore) || 50;
        }
      } catch (_) {}

      const allTestsMap = Object.fromEntries((allTests || []).map(t => [t.id, t]));
      const bestMap = {};
      const passCountByTest = {};
      const isForgivenByTest = {};
      const isRemedialByTest = {};
      const wordsPassCountByTest = {};
      const phrasesPassCountByTest = {};
      const wordsBestByTest = {};
      const phrasesBestByTest = {};
      const manualRepsWByTest = {};
      const manualRepsPByTest = {};

      const getAttemptSection = (att) => {
        if (!att) return 'words';
        const rawSec = att?.payload?.section || att?.payload?.subtype || att?.payload?.component || att?.test_section || att?.section;
        if (rawSec) {
          const s = String(rawSec).toLowerCase();
          if (s.includes('phrase') || s === 'phr') return 'phrases';
          if (s.includes('word') || s === 'wrd') return 'words';
        }
        const fr = String(att?.forgiven_reason || '');
        if (/\b(phrases?|phr)\b/i.test(fr)) return 'phrases';
        if (/\b(words?|wrd)\b/i.test(fr)) return 'words';
        const aid = att.test_id || att.Test_id || att.tests?.id;
        const tObj = (typeof allTestsMap !== 'undefined' && allTestsMap ? allTestsMap[aid] : null) || att.tests;
        const isEx = tObj ? isExam(tObj) : /exam/i.test(att?.test_title || att?.title || '');
        const totalQ = Number(att?.total_questions || 0);
        const correctCount = Number(att?.correct_count || att?.score || 0);
        if (isEx) {
          if (totalQ > 0 && totalQ <= 50) return 'phrases';
          if (totalQ > 50) return 'words';
          if (correctCount > 0 && correctCount <= 40) return 'phrases';
          return 'words';
        }
        if (totalQ > 0 && totalQ <= 20) return 'phrases';
        if (totalQ > 20) return 'words';
        if (correctCount > 15) return 'words';
        if (correctCount > 0 && correctCount <= 10) return 'phrases';
        return 'words';
      };

      (attempts || []).forEach(a => {
        const aid = a.test_id || a.Test_id;
        if (!aid) return;
        const pct = parseFloat(a.effective_score ?? a.percentage ?? 0);
        if (bestMap[aid] == null || pct > bestMap[aid]) {
          bestMap[aid] = pct;
        }

        const fr = String(a.forgiven_reason || '');
        const mMatch = fr.match(/MANUAL_REPS:?\s*(\d+)(?:\/(\d+))?(?:\s*(WORDS|PHRASES))?/i);
        if (mMatch) {
          const reps = Math.min(targetReps, parseInt(mMatch[1], 10));
          const comp = (mMatch[3] || '').toUpperCase();
          if (comp === 'PHRASES') {
            manualRepsPByTest[aid] = Math.max(manualRepsPByTest[aid] || 0, reps);
          } else if (comp === 'WORDS') {
            manualRepsWByTest[aid] = Math.max(manualRepsWByTest[aid] || 0, reps);
          } else {
            manualRepsWByTest[aid] = Math.max(manualRepsWByTest[aid] || 0, reps);
            manualRepsPByTest[aid] = Math.max(manualRepsPByTest[aid] || 0, reps);
          }
        }

        if (a.is_forgiven) {
          isForgivenByTest[aid] = true;
          wordsPassCountByTest[aid] = Math.max(wordsPassCountByTest[aid] || 0, targetReps);
          phrasesPassCountByTest[aid] = Math.max(phrasesPassCountByTest[aid] || 0, targetReps);
        }
        if (a.is_remedial_unlocked || a.is_remedial) {
          isRemedialByTest[aid] = true;
        }
        const st = (a.status || '').toLowerCase();
        if (st === 'submitted' || st === 'auto_submitted' || st === 'evaluated' || st === 'graded') {
          const tObj = allTestsMap[aid];
          const isUni = tObj?.payload?.is_unified === true || tObj?.category === 'unified' || (tObj?.test_subtype && tObj.test_subtype.startsWith('UNIFIED'));
          const tMin = Number(tObj?.minimum_required_score) || Number(tObj?.payload?.min_score) || minScore;
          const isPassing = a.is_forgiven || pct >= tMin || (isRemedialByTest[aid] && pct >= 60);

          if (isUni) {
            const sec = getAttemptSection(a);
            if (sec === 'phrases') {
              if (phrasesBestByTest[aid] == null || pct > phrasesBestByTest[aid]) phrasesBestByTest[aid] = pct;
              if (isPassing) phrasesPassCountByTest[aid] = (phrasesPassCountByTest[aid] || 0) + 1;
            } else {
              if (wordsBestByTest[aid] == null || pct > wordsBestByTest[aid]) wordsBestByTest[aid] = pct;
              if (isPassing) wordsPassCountByTest[aid] = (wordsPassCountByTest[aid] || 0) + 1;
            }
            passCountByTest[aid] = Math.min(wordsPassCountByTest[aid] || 0, phrasesPassCountByTest[aid] || 0);
          } else {
            if (a.is_forgiven) {
              passCountByTest[aid] = Math.max(passCountByTest[aid] || 0, targetReps);
            } else if (isPassing) {
              passCountByTest[aid] = (passCountByTest[aid] || 0) + 1;
            }
          }
        }
      });

      // Synchronize manual repetition overrides into pass count tracking across all class tests
      Object.keys(allTestsMap).forEach(tid => {
        if (manualRepsWByTest[tid] != null) {
          wordsPassCountByTest[tid] = Math.max(wordsPassCountByTest[tid] || 0, manualRepsWByTest[tid]);
          if (wordsBestByTest[tid] == null) wordsBestByTest[tid] = 70.0;
        }
        if (manualRepsPByTest[tid] != null) {
          phrasesPassCountByTest[tid] = Math.max(phrasesPassCountByTest[tid] || 0, manualRepsPByTest[tid]);
          if (phrasesBestByTest[tid] == null) phrasesBestByTest[tid] = 70.0;
        }
        const tObj = allTestsMap[tid];
        const isUni = tObj?.payload?.is_unified === true || tObj?.category === 'unified' || (tObj?.test_subtype && tObj.test_subtype.startsWith('UNIFIED'));
        if (isUni) {
          // Self-Healing Fail-Safe: If a unified task has words passes >= 14 while phrases is 0,
          // auto-balance so untagged bulk reps never starve phrases or block exam progression!
          if ((phrasesPassCountByTest[tid] || 0) === 0 && (wordsPassCountByTest[tid] || 0) >= 14) {
            const halfPasses = Math.floor(wordsPassCountByTest[tid] / 2);
            wordsPassCountByTest[tid] = halfPasses;
            phrasesPassCountByTest[tid] = halfPasses;
            if (phrasesBestByTest[tid] == null) phrasesBestByTest[tid] = wordsBestByTest[tid] || 70.0;
          }
          passCountByTest[tid] = Math.min(wordsPassCountByTest[tid] || 0, phrasesPassCountByTest[tid] || 0);
        } else if (manualRepsWByTest[tid] != null) {
          passCountByTest[tid] = Math.max(passCountByTest[tid] || 0, manualRepsWByTest[tid]);
        }
        if (passCountByTest[tid] >= targetReps && bestMap[tid] == null) {
          bestMap[tid] = 70.0;
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

      const isTestPassed = (t) => {
        if (!t) return true;
        if (isForgivenByTest[t.id]) return true;
        const isUni = t.payload?.is_unified === true || t.category === 'unified' || (t.test_subtype && t.test_subtype.startsWith('UNIFIED'));
        if (isExam(t)) {
          const req = Number(t.minimum_required_score) || Number(t.payload?.min_score) || 60;
          if (isUni) {
            const wScore = wordsBestByTest[t.id];
            const pScore = phrasesBestByTest[t.id];
            if (wScore == null || pScore == null) return false;
            return (wScore >= req && pScore >= req) || (isRemedialByTest[t.id] && wScore >= 60 && pScore >= 60);
          }
          const score = bestMap[t.id];
          if (score == null) return false;
          return score >= req || (isRemedialByTest[t.id] && score >= 60);
        } else {
          // Task: Strictly requires targetReps (7 passes >= minScore)
          if (isUni) {
            const compTarget = (targetReps >= 14) ? Math.round(targetReps / 2) : (targetReps || 7);
            return (wordsPassCountByTest[t.id] || 0) >= compTarget && (phrasesPassCountByTest[t.id] || 0) >= compTarget;
          }
          return (passCountByTest[t.id] || 0) >= targetReps;
        }
      };

      // Helper to pair tests into unified Topic Packages or Theme Exam Packages
      function getTestPairInfo(test, testList) {
        if (!test) return null;
        const isEx = isExam(test);
        const theme = test.payload?.theme_code || (test.shell_code ? test.shell_code.replace(/^[0-9]+/, '').charAt(0) : '');
        const topic = test.payload?.topic_code || (isEx ? null : (test.shell_code ? test.shell_code.split('-')[0].replace(/^[0-9]+/, '') : null));

        const isUnifiedShell = test.payload?.is_unified === true || test.payload?.category === 'unified' || test.category === 'unified' || (test.test_subtype && test.test_subtype.startsWith('UNIFIED'));
        if (isUnifiedShell) {
          return {
            isPair: true,
            isUnified: true,
            wordsTest: test,
            phrasesTest: test,
            isExam: isEx,
            theme,
            topic
          };
        }

        const isWords = (test.payload?.category === 'words') || /words/i.test(test.title || '') || /words/i.test(test.shell_code || '');
        const isPhrases = (test.payload?.category === 'phrases') || /phrase/i.test(test.title || '') || /phrase/i.test(test.shell_code || '');

        const sibling = testList.find(other => {
          if (other.id === test.id) return false;
          if (isExam(other) !== isEx) return false;
          const oTheme = other.payload?.theme_code || (other.shell_code ? other.shell_code.replace(/^[0-9]+/, '').charAt(0) : '');
          if (oTheme && theme && oTheme.toUpperCase() !== theme.toUpperCase()) return false;
          if (!isEx) {
            const oTopic = other.payload?.topic_code || (other.shell_code ? other.shell_code.split('-')[0].replace(/^[0-9]+/, '') : null);
            if (oTopic && topic && oTopic.toUpperCase() !== topic.toUpperCase()) return false;
          }
          const oWords = (other.payload?.category === 'words') || /words/i.test(other.title || '') || /words/i.test(other.shell_code || '');
          const oPhrases = (other.payload?.category === 'phrases') || /phrase/i.test(other.title || '') || /phrase/i.test(other.shell_code || '');
          return (isWords && oPhrases) || (isPhrases && oWords);
        });

        const wordsTest = isWords ? test : (sibling && ((sibling.payload?.category === 'words') || /words/i.test(sibling.title || '')) ? sibling : null);
        const phrasesTest = isPhrases ? test : (sibling && ((sibling.payload?.category === 'phrases') || /phrase/i.test(sibling.title || '')) ? sibling : null);

        return {
          isPair: Boolean(wordsTest && phrasesTest),
          wordsTest,
          phrasesTest,
          isExam: isEx,
          theme,
          topic
        };
      }

      // Find the next incomplete assignment
      let nextAssignment = null;
      const visitedPairIds = new Set();

      for (const t of published) {
        if (visitedPairIds.has(t.id)) continue;
        const pair = getTestPairInfo(t, published);
        if (pair && pair.isPair) {
          visitedPairIds.add(pair.wordsTest.id);
          if (pair.phrasesTest) visitedPairIds.add(pair.phrasesTest.id);
          const compTarget = (targetReps >= 14) ? Math.round(targetReps / 2) : (targetReps || 7);
          const wordsPassed = pair.isUnified
            ? (pair.isExam ? ((wordsBestByTest[pair.wordsTest.id] ?? 0) >= minScore || Boolean(isForgivenByTest[pair.wordsTest.id])) : ((wordsPassCountByTest[pair.wordsTest.id] || 0) >= compTarget || Boolean(isForgivenByTest[pair.wordsTest.id])))
            : isTestPassed(pair.wordsTest);
          const phrasesPassed = pair.isUnified
            ? (pair.isExam ? ((phrasesBestByTest[pair.phrasesTest.id] ?? 0) >= minScore || Boolean(isForgivenByTest[pair.phrasesTest.id])) : ((phrasesPassCountByTest[pair.phrasesTest.id] || 0) >= compTarget || Boolean(isForgivenByTest[pair.phrasesTest.id])))
            : isTestPassed(pair.phrasesTest);
          if (!wordsPassed || !phrasesPassed) {
            nextAssignment = {
              isPair: true,
              isUnified: Boolean(pair.isUnified),
              isExam: pair.isExam,
              wordsTest: pair.wordsTest,
              phrasesTest: pair.phrasesTest,
              wordsPassed,
              phrasesPassed,
              primaryTest: pair.wordsTest
            };
            break;
          }
        } else {
          visitedPairIds.add(t.id);
          if (!isTestPassed(t)) {
            nextAssignment = {
              isPair: false,
              isExam: isExam(t),
              primaryTest: t
            };
            break;
          }
        }
      }

      if (!published || published.length === 0) {
        container.onclick = null;
        container.style.cursor = 'default';
        container.classList.add('is-banner-card');
        container.innerHTML = `
          <div class="next-test-left next-asm-left">
            <span class="next-test-icon next-asm-icon">${getSvgIcon('alert-circle', 18)}</span>
            <span class="next-test-title next-asm-title">No active tests scheduled in this class.</span>
          </div>
        `;
        return;
      }

      if (!nextAssignment) {
        container.onclick = null;
        container.style.cursor = 'default';
        container.classList.add('is-banner-card');
        container.innerHTML = `
          <div class="next-test-left next-asm-left">
            <span class="next-test-icon next-asm-icon">${getSvgIcon('award', 18)}</span>
            <span class="next-test-title next-asm-title">All tests in this class completed!</span>
          </div>
          <span class="next-test-completed-badge">✓ 100%</span>
        `;
        return;
      }

      container.classList.remove('is-banner-card');
      container.style.cursor = '';

      const activeTestItem = nextAssignment.primaryTest;
      const isTest = nextAssignment.isExam;

      // Selected Icons: 1A (Solid Yellow Padlock), 2B (Red Rotate Undo), 3C (Green Circle Play), 4D (White Forward Arrow)
      const ICON_1A_YELLOW_LOCK = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M7 10V7a5 5 0 0 1 10 0v3" stroke="var(--grade-c)" stroke-width="2.6" stroke-linecap="round"/><rect x="4.5" y="10" width="15" height="11.5" rx="3" fill="var(--grade-c)" stroke="rgba(var(--grade-c-rgb),0.8)" stroke-width="1"/><circle cx="12" cy="14.8" r="1.5" fill="#713f12"/><path d="M12 15.5v2.2" stroke="#713f12" stroke-width="1.6" stroke-linecap="round"/></svg>';
      const ICON_2B_RED_RETAKE  = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>';
      const ICON_3C_GREEN_PLAY  = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8" fill="#ffffff"/></svg>';
      const ICON_4D_WHITE_ARROW_RIGHT = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>';

      // Resolve authentic test title per SSOT (AGENTS.md § 2.6 / DECISION-056)
      const displayItem = nextAssignment.isPair ? nextAssignment.wordsTest : activeTestItem;
      const rawTestTitle = (displayItem?.title || displayItem?.name || '').replace(/\s+(?:Words|Phrases)\s+/i, ' ').trim();
      const displayTitle = rawTestTitle || formatTestDisplay(displayItem).fullTitle;

      function formatNextTestTitleHtml(target) {
        const item = (target && typeof target === 'object') ? target : displayItem;
        const fullTitle = (item?.title || item?.name || (typeof target === 'string' ? target : '') || displayTitle || '').replace(/\s+(?:Words|Phrases)\s+/i, ' ').trim();
        const parts = fullTitle.split(/\s+[-–:]\s+/);
        if (parts.length > 1) {
          const line1 = parts[0].trim();
          const line2 = parts.slice(1).join(' - ').trim();
          return `
            <div class="next-test-title-wrap">
              <span class="next-test-primary-name" title="${escapeHtml(line1)}">${escapeHtml(line1)}</span>
              <span class="next-test-topic-name" title="${escapeHtml(line2)}">${escapeHtml(line2)}</span>
            </div>
          `;
        }
        return `
          <div class="next-test-title-wrap">
            <span class="next-test-primary-name" title="${escapeHtml(fullTitle)}">${escapeHtml(fullTitle)}</span>
          </div>
        `;
      }

      const isVocabClass = isVocabularyClass(validClass || activeTestItem);

      if (!isTest) {
        let subIndicatorHtml = '';
        if (isVocabClass) {
          // Words-Only classes (SHRT, EVNK, TPTC) must NEVER show PHR row regardless of DB data
          const _classCode = ((validClass || activeTestItem)?.code || (validClass || activeTestItem)?.shell_code || '').toUpperCase();
          const _isWordsOnlyVocab = /^(SHRT|EVNK|TPTC)-VOCAB/.test(_classCode);

          const hasPhrasesComp = !_isWordsOnlyVocab && Boolean(
            (nextAssignment.isPair && nextAssignment.phrasesTest) ||
            nextAssignment.primaryTest?.payload?.is_unified === true ||
            nextAssignment.primaryTest?.payload?.category === 'phrases' ||
            nextAssignment.primaryTest?.payload?.category === 'unified' ||
            /PHRASE/i.test(nextAssignment.primaryTest?.shell_code || nextAssignment.primaryTest?.title || '')
          );

          const rawReps = Math.max(1, Number(activeTestItem.payload?.task_repetitions || targetReps || 7));
          const maxBoxes = (hasPhrasesComp && rawReps >= 14) ? Math.round(rawReps / 2) : Math.min(rawReps, 7);

          const wordsP = nextAssignment.isPair
            ? (nextAssignment.isUnified ? (wordsPassCountByTest[nextAssignment.wordsTest.id] || 0) : (passCountByTest[nextAssignment.wordsTest.id] || 0))
            : (wordsPassCountByTest[activeTestItem.id] != null ? wordsPassCountByTest[activeTestItem.id] : (passCountByTest[activeTestItem.id] || 0));
          const phrasesP = nextAssignment.isPair
            ? (nextAssignment.isUnified ? (phrasesPassCountByTest[nextAssignment.phrasesTest.id] || 0) : (passCountByTest[nextAssignment.phrasesTest.id] || 0))
            : (phrasesPassCountByTest[activeTestItem.id] != null ? phrasesPassCountByTest[activeTestItem.id] : (passCountByTest[activeTestItem.id] || 0));

          let wordsBoxesHtml = '';
          let phrasesBoxesHtml = '';
          for (let s = 1; s <= maxBoxes; s++) {
            wordsBoxesHtml += `<span class="rainbow-box ${s <= wordsP ? 'is-lit' : 'is-dim'}" data-step="${s}">${s}</span>`;
            if (hasPhrasesComp) {
              phrasesBoxesHtml += `<span class="rainbow-box ${s <= phrasesP ? 'is-lit' : 'is-dim'}" data-step="${s}">${s}</span>`;
            }
          }

          if (hasPhrasesComp) {
            subIndicatorHtml = `
              <div class="rainbow-pass-double-deck" style="display:flex; flex-direction:column; gap:4px; margin:0;">
                <div class="rainbow-pass-row" style="display:flex; align-items:center; gap:6px;">
                  <span class="rainbow-pass-label" style="display:inline-block; width:26px; min-width:26px; max-width:26px; font-size:11px; font-weight:800; color:var(--quad-c); letter-spacing:0.04em; text-transform:uppercase;">WRD</span>
                  <div class="rainbow-pass-bar">
                    ${wordsBoxesHtml}
                  </div>
                </div>
                <div class="rainbow-pass-row" style="display:flex; align-items:center; gap:6px;">
                  <span class="rainbow-pass-label" style="display:inline-block; width:26px; min-width:26px; max-width:26px; font-size:11px; font-weight:800; color:var(--quad-b); letter-spacing:0.04em; text-transform:uppercase;">PHR</span>
                  <div class="rainbow-pass-bar">
                    ${phrasesBoxesHtml}
                  </div>
                </div>
              </div>
            `;
          } else {
            subIndicatorHtml = `
              <div class="rainbow-pass-single-deck" style="display:flex; flex-direction:column; gap:4px; margin:0;">
                <div class="rainbow-pass-row" style="display:flex; align-items:center; gap:6px;">
                  <span class="rainbow-pass-label" style="display:inline-block; width:26px; min-width:26px; max-width:26px; font-size:11px; font-weight:800; color:var(--quad-c); letter-spacing:0.04em; text-transform:uppercase;">WRD</span>
                  <div class="rainbow-pass-bar">
                    ${wordsBoxesHtml}
                  </div>
                </div>
              </div>
            `;
          }
        } else {
          const reqMin = Number(activeTestItem.minimum_required_score) || Number(activeTestItem.payload?.min_score) || 50;
          subIndicatorHtml = `<div class="next-test-sub" style="font-size:12px; font-weight:700; color:#38bdf8; letter-spacing:0.04em; margin:0;">Passing: ${reqMin}%</div>`;
        }

        container.innerHTML = `
          <div class="next-test-header-bar">
            ${formatNextTestTitleHtml(displayTitle)}
          </div>
          <div class="next-test-body-row">
            <div class="next-test-col-left">
              ${subIndicatorHtml}
            </div>
            <div class="next-test-col-right" title="Start Task - Click to practice">
              <button type="button" class="next-test-go-btn next-asm-go-btn is-start" aria-label="Start Task">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="8 5 19 12 8 19 8 5"></polygon></svg>
              </button>
            </div>
          </div>
        `;

        if (nextAssignment.isPair) {
          const wordsP = nextAssignment.isUnified
            ? (wordsPassCountByTest[nextAssignment.wordsTest.id] || 0)
            : (passCountByTest[nextAssignment.wordsTest.id] || 0);
          const phrasesP = nextAssignment.isUnified
            ? (phrasesPassCountByTest[nextAssignment.phrasesTest.id] || 0)
            : (passCountByTest[nextAssignment.phrasesTest.id] || 0);
          const compTargetReps = (targetReps >= 14) ? Math.round(targetReps / 2) : (targetReps || 7);
          const encoded = encodeURIComponent(JSON.stringify({
            badge: 'TOPIC TASK',
            title: displayTitle,
            subtitle: 'Choose which part you want to work on:',
            isExam: false,
            isUnified: Boolean(nextAssignment.isUnified),
            wordsTestId: nextAssignment.wordsTest.id,
            phrasesTestId: nextAssignment.phrasesTest.id,
            wordsPasses: wordsP,
            phrasesPasses: phrasesP,
            targetReps: compTargetReps
          }));
          container.onclick = () => {
            if (typeof window.triggerComponentChoiceModal === 'function') {
              window.triggerComponentChoiceModal(encoded);
            }
          };
        } else {
          container.onclick = () => { window.location.href = getTestLaunchUrl(activeTestItem); };
        }
      } else {
        const isAlumni = session.level_number === 99 || (session.program_status || '').toUpperCase() === 'ALUMNI';
        const testIdToCheck = nextAssignment.isPair ? nextAssignment.wordsTest.id : activeTestItem.id;
        let activeSession = await fetchActiveTestSession(testIdToCheck, session.batch_id).catch(() => null);
        if (!activeSession && nextAssignment.isPair) {
          activeSession = await fetchActiveTestSession(nextAssignment.phrasesTest.id, session.batch_id).catch(() => null);
        }

        const isFlexible = (activeTestItem.schedule_mode || activeTestItem.payload?.schedule_mode) === 'flexible';
        const isUnlocked = isAlumni || isFlexible || activeSession?.is_unlocked === true;
        const isWhitelisted = isAlumni ||
                              isFlexible ||
                              !activeSession?.allowed_student_ids ||
                              activeSession.allowed_student_ids.length === 0 ||
                              activeSession.allowed_student_ids.includes(session.student_id);

        let subIndicatorHtml = '';
        if (isVocabClass) {
          // Words-Only classes (SHRT, EVNK, TPTC) must NEVER show PHR row regardless of DB data
          const _classCode2 = ((validClass || activeTestItem)?.code || (validClass || activeTestItem)?.shell_code || '').toUpperCase();
          const _isWordsOnlyVocab2 = /^(SHRT|EVNK|TPTC)-VOCAB/.test(_classCode2);

          const hasExamPhrasesComp = !_isWordsOnlyVocab2 && Boolean(
            (nextAssignment.isPair && nextAssignment.phrasesTest) ||
            nextAssignment.primaryTest?.payload?.is_unified === true ||
            nextAssignment.primaryTest?.payload?.category === 'phrases' ||
            nextAssignment.primaryTest?.payload?.category === 'unified' ||
            /PHRASE/i.test(nextAssignment.primaryTest?.shell_code || nextAssignment.primaryTest?.title || '')
          );

          const wBestPct = nextAssignment.isUnified
            ? (wordsBestByTest[nextAssignment.wordsTest?.id] ?? bestMap[nextAssignment.wordsTest?.id] ?? 0)
            : (bestMap[nextAssignment.wordsTest?.id] ?? 0);
          const pBestPct = nextAssignment.isUnified
            ? (phrasesBestByTest[nextAssignment.phrasesTest?.id] ?? bestMap[nextAssignment.phrasesTest?.id] ?? 0)
            : (bestMap[nextAssignment.phrasesTest?.id] ?? 0);
          const reqMin = Number(activeTestItem.minimum_required_score) || Number(activeTestItem.payload?.min_score) || 60;

          const renderExamCompStatus = (pct) => {
            if (pct > 0) {
              const clr = typeof getGradeColorByScore === 'function' ? getGradeColorByScore(pct) : (pct >= reqMin ? 'var(--grade-a)' : 'var(--grade-d)');
              const isPassed = pct >= reqMin;
              return `<span style="display:inline-flex; align-items:center; gap:4px; font-size:12px; font-weight:700; color:${clr};">Best: ${Math.round(pct)}% ${isPassed ? '✓' : ''}</span>`;
            }
            return `<span style="display:inline-flex; align-items:center; gap:4px; font-size:12px; font-weight:600; color:#94a3b8;">Not Taken Yet <span style="color:#64748b; font-size:12px;">(Passing: ${reqMin}%)</span></span>`;
          };

          if (hasExamPhrasesComp) {
            subIndicatorHtml = `
              <div class="exam-status-double-deck" style="display:flex; flex-direction:column; gap:4px; margin:0;">
                <div class="exam-status-row" style="display:flex; align-items:center; gap:8px;">
                  <span class="rainbow-pass-label" style="display:inline-block; width:26px; min-width:26px; max-width:26px; font-size:11px; font-weight:800; color:var(--quad-c); letter-spacing:0.04em; text-transform:uppercase;">WRD</span>
                  ${renderExamCompStatus(wBestPct)}
                </div>
                <div class="exam-status-row" style="display:flex; align-items:center; gap:8px;">
                  <span class="rainbow-pass-label" style="display:inline-block; width:26px; min-width:26px; max-width:26px; font-size:11px; font-weight:800; color:var(--quad-b); letter-spacing:0.04em; text-transform:uppercase;">PHR</span>
                  ${renderExamCompStatus(pBestPct)}
                </div>
              </div>
            `;
          } else {
            subIndicatorHtml = `
              <div class="exam-status-single-deck" style="display:flex; flex-direction:column; gap:4px; margin:0;">
                <div class="exam-status-row" style="display:flex; align-items:center; gap:8px;">
                  <span class="rainbow-pass-label" style="display:inline-block; width:26px; min-width:26px; max-width:26px; font-size:11px; font-weight:800; color:var(--quad-c); letter-spacing:0.04em; text-transform:uppercase;">WRD</span>
                  ${renderExamCompStatus(wBestPct)}
                </div>
              </div>
            `;
          }
        } else {
          const reqMin = Number(activeTestItem.minimum_required_score) || Number(activeTestItem.payload?.min_score) || 60;
          const bestScore = bestMap[activeTestItem.id] ?? 0;
          let examStatusText = `Official Exam • Passing: ${reqMin}%`;
          if (bestScore > 0) {
            const clr = typeof getGradeColorByScore === 'function' ? getGradeColorByScore(bestScore) : (bestScore >= reqMin ? 'var(--grade-a)' : 'var(--grade-d)');
            examStatusText = `Official Exam • Best: <span style="color:${clr};font-weight:800;">${Math.round(bestScore)}% ${bestScore >= reqMin ? '✓' : ''}</span> • Passing: ${reqMin}%`;
          }
          subIndicatorHtml = `<div class="next-test-sub" style="font-size:12px; font-weight:700; color:var(--quad-a); letter-spacing:0.04em; margin:0;">${examStatusText}</div>`;
        }

        if (isUnlocked && isWhitelisted) {
          const remMin = activeSession?.remaining_minutes || 40;
          const playTitle = isAlumni ? 'Start Exam (Alumni Universal Access)' : (isFlexible ? 'Start Exam' : `Start Exam (${remMin}m left)`);
          container.innerHTML = `
            <div class="next-test-header-bar">
              ${formatNextTestTitleHtml(displayTitle)}
            </div>
            <div class="next-test-body-row">
              <div class="next-test-col-left">
                ${subIndicatorHtml}
              </div>
              <div class="next-test-col-right" title="${playTitle}">
                <button type="button" class="next-test-go-btn next-asm-go-btn is-exam-play">
                  ${ICON_3C_GREEN_PLAY}
                </button>
              </div>
            </div>
          `;

          if (nextAssignment.isPair) {
            const wBest = nextAssignment.isUnified
              ? (wordsBestByTest[nextAssignment.wordsTest.id] != null ? { percentage: wordsBestByTest[nextAssignment.wordsTest.id] } : null)
              : (bestMap[nextAssignment.wordsTest.id] != null ? { percentage: bestMap[nextAssignment.wordsTest.id] } : null);
            const pBest = nextAssignment.isUnified
              ? (phrasesBestByTest[nextAssignment.phrasesTest.id] != null ? { percentage: phrasesBestByTest[nextAssignment.phrasesTest.id] } : null)
              : (bestMap[nextAssignment.phrasesTest.id] != null ? { percentage: bestMap[nextAssignment.phrasesTest.id] } : null);
            const encoded = encodeURIComponent(JSON.stringify({
              badge: 'OFFICIAL EXAM',
              title: displayTitle,
              subtitle: 'Choose which exam component you want to take:',
              isExam: true,
              isUnified: Boolean(nextAssignment.isUnified),
              wordsTestId: nextAssignment.wordsTest.id,
              phrasesTestId: nextAssignment.phrasesTest.id,
              wordsBest: wBest,
              phrasesBest: pBest
            }));
            container.onclick = () => {
              if (typeof window.triggerComponentChoiceModal === 'function') {
                window.triggerComponentChoiceModal(encoded);
              }
            };
          } else {
            container.onclick = () => { window.location.href = getTestLaunchUrl(activeTestItem, activeSession); };
          }
        } else {
          container.innerHTML = `
            <div class="next-test-header-bar">
              ${formatNextTestTitleHtml(displayTitle)}
            </div>
            <div class="next-test-body-row">
              <div class="next-test-col-left">
                ${subIndicatorHtml}
              </div>
              <div class="next-test-col-right" title="Waiting for Tutor to unlock Exam">
                <span class="next-test-status-icon next-asm-status-icon is-exam-lock">
                  ${ICON_1A_YELLOW_LOCK}
                </span>
              </div>
            </div>
          `;
          container.onclick = null;
        }
      }
    }
    window.renderNextAssignmentHero = renderNextAssignmentHero;
    function renderClasses(rawClasses, progress, allTests = [], allAttempts = []) {
      window._loadedClasses = rawClasses;
      window._classesProgress = progress;
      window._allTests = allTests;
      window._allAttempts = allAttempts;

      const subjCountEl = document.getElementById('overview-classes-count');
      if (subjCountEl) subjCountEl.textContent = rawClasses.length;

      if (!rawClasses.length) {
        updateClassesBarUI();
        populateClassesSelectorModal([]);
        return;
      }

      const activeClasses = [];
      const completedClasses = [];
      const studentLevelNum = session.level_number != null ? session.level_number : 1;
      const studentLevelId = session.level_id;
      const isAlumni = studentLevelNum === 99 || (session.program_status || '').toUpperCase() === 'ALUMNI' || (session.level_name || '').toLowerCase() === 'alumni' || (session.level_name || '').toUpperCase() === 'X';
      const isNonLevel = studentLevelNum === 0 || (session.level_name || '').toLowerCase() === 'non-level';

      rawClasses.forEach(c => {
        const cLvlNum = c.levels?.level_number;
        const isCurrentLevel = (studentLevelId && c.level_id === studentLevelId) || (studentLevelNum != null && cLvlNum === studentLevelNum);

        // Alumni & Non-Level receive universal access to all program classes
        if (isAlumni || isNonLevel) {
          activeClasses.push(c);
        } else if (isCurrentLevel || (cLvlNum == null)) {
          activeClasses.push(c);
        } else if (studentLevelNum != null && cLvlNum != null && cLvlNum < studentLevelNum) {
          // Previous level classes remain accessible in Class Lobby for review/drill
          c._isRetroactive = true;
          activeClasses.push(c);
          completedClasses.push(c);
        }
      });

      // Sort classes: highest level first (descending), then alphabetical
      activeClasses.sort((a, b) => {
        const lvlA = a.levels?.level_number != null ? a.levels.level_number : 0;
        const lvlB = b.levels?.level_number != null ? b.levels.level_number : 0;
        if (lvlB !== lvlA) return lvlB - lvlA;
        return (a.name || '').localeCompare(b.name || '');
      });
      completedClasses.sort((a, b) => {
        const lvlA = a.levels?.level_number != null ? a.levels.level_number : 0;
        const lvlB = b.levels?.level_number != null ? b.levels.level_number : 0;
        if (lvlB !== lvlA) return lvlB - lvlA;
        return (a.name || '').localeCompare(b.name || '');
      });

      if (activeClasses.length > 0) {
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

          let isCompleted = dbCompleted || (classAssms.length > 0 && completedCount >= classAssms.length);
          if (subj._isRetroactive && (pct === 0 || isCompleted)) {
            // Retroactive class from passed level: mark completed
            pct = 100;
            isCompleted = true;
          }
          if (isCompleted) pct = 100;

          const statusText = isCompleted ? "Completed" : (pct > 0 ? `${pct}%` : "In Progress");

          subj._pct = pct;
          subj._isCompleted = isCompleted;
          subj._statusText = statusText;
        });
      }

      window._activeClasses = activeClasses;
      const isValidSelected = activeClasses.some(c => c.id === window._selectedClassId);
      if (!isValidSelected && activeClasses.length > 0) {
        const savedCid = localStorage.getItem('topscore_student_last_class_id');
        const found = savedCid && activeClasses.find(c => c.id === savedCid);
        const currentLvlClass = activeClasses.find(c =>
          (studentLevelId && c.level_id === studentLevelId) ||
          (studentLevelNum != null && c.levels?.level_number === studentLevelNum)
        );
        window._selectedClassId = found ? found.id : (currentLvlClass ? currentLvlClass.id : activeClasses[0].id);
      }

      updateClassesBarUI();
      renderClassesBoxes(activeClasses);
      if (typeof updateDockTabsVisibility === 'function') {
        updateDockTabsVisibility();
      }
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

      let html = '';
      (activeClasses || []).forEach((c, idx) => {
        const isSelected = c.id === window._selectedClassId;
        const strokeColor = (isSelected && window._tierColor) ? window._tierColor : '#38bdf8';
        const iconSvg = getClassSvgIcon(c.name, 16, strokeColor);
        const pct = c._pct != null ? c._pct : 0;
        const activeStyle = (isSelected && window._tierColor)
          ? `style="border-color:${window._tierColor} !important;"`
          : '';
        html += `
          <div class="class-deck-box ${isSelected ? 'active' : ''}" data-cid="${c.id}" role="button" tabindex="0" ${activeStyle}>
            <div class="class-deck-title">${iconSvg} <span class="class-deck-name">${escapeHtml(c.name)}</span></div>
            <div class="class-deck-progress">${pct}%</div>
          </div>
        `;
      });
      container.innerHTML = html || `<div class="class-deck-box active"><div class="class-deck-title">${getClassSvgIcon('', 16, '#94a3b8')} <span class="class-deck-name">No Class Assigned</span></div><div class="class-deck-progress">0%</div></div>`;

      container.querySelectorAll('.class-deck-box').forEach(box => {
        box.addEventListener('click', async () => {
          const cid = box.dataset.cid;
          if (!cid) return;
          window._selectedClassId = cid;
          try { localStorage.setItem('topscore_student_last_class_id', cid); } catch (_) {}
          await renderSelectedClassDashboard();
        });
      });
    }

    async function renderSelectedClassDashboard() {
      updateClassesBarUI();
      renderClassesBoxes(window._activeClasses);
      if (typeof updateDockTabsVisibility === 'function') {
        updateDockTabsVisibility();
      }
      await renderNextAssignmentHero(window._allTests, window._allAttempts, window._activeClasses || window._loadedClasses);
      await computeOverallStats(window._allAttempts, window._allTests);
      await loadBatchLeaderboard();
      if (typeof renderStudentAttendanceMatrix === 'function') {
        renderStudentAttendanceMatrix(true);
      }
    }
    window.renderSelectedClassDashboard = renderSelectedClassDashboard;

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
        if (headerClassNameEl) headerClassNameEl.textContent = 'TopsCore';
        if (pctEl) pctEl.textContent = '0%';
      }
    }

    function populateClassesSelectorModal(activeClasses = []) {
      const listEl = document.getElementById('classes-selector-modal-list');
      if (!listEl) return;
      if (!window._candidateClassId) {
        window._candidateClassId = window._selectedClassId;
      }

      // Sort classes in modal: highest level first (descending), then alphabetical
      const sortedClasses = [...(activeClasses || [])].sort((a, b) => {
        const lvlA = a.levels?.level_number != null ? a.levels.level_number : 0;
        const lvlB = b.levels?.level_number != null ? b.levels.level_number : 0;
        if (lvlB !== lvlA) return lvlB - lvlA;
        return (a.name || '').localeCompare(b.name || '');
      });

      const CHECKMARK_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle;"><polyline points="20 6 9 17 4 12"/></svg>';

      let html = '';
      sortedClasses.forEach(c => {
        const isSelected = c.id === (window._candidateClassId || window._selectedClassId);
        const iconSvg = getClassSvgIcon(c.name, 20, isSelected ? '#38bdf8' : '#94a3b8');
        const pct = c._pct != null ? c._pct : 0;
        const isCompletedClass = Boolean(c._isCompleted || pct === 100);
        const scoreColor = isCompletedClass ? '#94a3b8' : (typeof getGradeColorByScore === 'function' ? getGradeColorByScore(pct) : '#38bdf8');
        const scoreText = isCompletedClass ? CHECKMARK_ICON : `${pct}%`;

        html += `
          <div class="classes-selector-item ${isSelected ? 'selected' : ''}" data-cid="${c.id}" role="button" tabindex="0">
            <div class="classes-selector-item-left">
              <div class="classes-selector-icon-wrap">
                ${iconSvg}
              </div>
              <div class="classes-selector-item-info">
                <div class="classes-selector-item-name">${escapeHtml(c.name)}</div>
              </div>
            </div>
            <div class="classes-selector-item-pct" style="color: ${scoreColor};">${scoreText}</div>
          </div>
        `;
      });
      listEl.innerHTML = html || '<div class="text-muted p-4 text-center">No active classes.</div>';

      const closeSelectorModal = () => {
        const modal = document.getElementById('classes-selector-modal');
        if (modal) modal.classList.add('hidden');
        if (window.location.hash === '#select-class') {
          try { history.replaceState(null, '', window.location.pathname + window.location.search); } catch (_) {}
        }
      };

      const openSelectorModal = () => {
        window._candidateClassId = window._selectedClassId;
        populateClassesSelectorModal(window._activeClasses);
        document.getElementById('classes-selector-modal')?.classList.remove('hidden');
        try { window.location.hash = '#select-class'; } catch (_) {}
      };

      const commitClassSelection = async () => {
        const cid = window._candidateClassId || window._selectedClassId;
        closeSelectorModal();
        if (cid) {
          window._selectedClassId = cid;
          try { localStorage.setItem('topscore_student_last_class_id', cid); } catch (_) {}
          updateClassesBarUI();
          populateClassesSelectorModal(window._activeClasses);
          try {
            await renderSelectedClassDashboard();
          } catch (err) {
            console.warn('[DASHBOARD] renderSelectedClassDashboard non-fatal error:', err);
          }
        }
      };

      listEl.querySelectorAll('.classes-selector-item').forEach(item => {
        item.addEventListener('click', () => {
          const cid = item.dataset.cid;
          if (window._candidateClassId === cid) {
            // Second click on same item confirms selection
            commitClassSelection();
            return;
          }
          window._candidateClassId = cid;
          listEl.querySelectorAll('.classes-selector-item').forEach(el => {
            el.classList.toggle('selected', el.dataset.cid === cid);
          });
        });
        item.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            window._candidateClassId = item.dataset.cid;
            commitClassSelection();
          }
        });
      });

      // Wire modal events once
      const confirmBtn = document.getElementById('btn-confirm-class-selection');
      if (confirmBtn && !confirmBtn._hasClickListener) {
        confirmBtn._hasClickListener = true;
        confirmBtn.addEventListener('click', () => {
          commitClassSelection();
        });
      }

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
      const footerCloseBtn = document.getElementById('btn-close-classes-selector');
      if (footerCloseBtn && !footerCloseBtn._hasClickListener) {
        footerCloseBtn._hasClickListener = true;
        footerCloseBtn.addEventListener('click', closeSelectorModal);
      }
      const selectorModal = document.getElementById('classes-selector-modal');
      if (selectorModal && !selectorModal._hasBackdropListener) {
        selectorModal._hasBackdropListener = true;
        selectorModal.addEventListener('click', (e) => {
          if (e.target === selectorModal) closeSelectorModal();
        });
      }
    }

    // Phase 298 & Phase 492: Component Selector Modal Trigger (Pop-up 04 Golden Standard)
    window.triggerComponentChoiceModal = function(encodedData) {
      try {
        const data = JSON.parse(decodeURIComponent(encodedData));
        const modal = document.getElementById('component-selector-modal');
        if (!modal) return;

        const badgeEl = document.getElementById('component-modal-badge');
        const titleEl = document.getElementById('component-modal-title');
        const subtitleEl = document.getElementById('component-modal-subtitle');

        if (badgeEl) badgeEl.textContent = data.badge || (data.isExam ? 'EXAM' : 'TOPIC TASK');
        if (titleEl) {
          const rawMTitle = String(data.title || 'Topic Test').replace(/\s+(?:Words|Phrases)\s+/i, ' ').trim();
          const mParts = rawMTitle.split(/\s+[-–:]\s+/);
          if (mParts.length > 1) {
            const mLine1 = mParts[0].trim();
            const mLine2 = mParts.slice(1).join(' - ').trim();
            titleEl.innerHTML = `<span style="display:block;font-size:16px;font-weight:800;color:#fff;line-height:1.2;">${escHtml(mLine1)}</span><span style="display:block;font-size:12px;font-weight:700;color:#38bdf8;line-height:1.2;margin-top:2px;">${escHtml(mLine2)}</span>`;
          } else {
            titleEl.textContent = rawMTitle;
          }
        }
        if (subtitleEl) subtitleEl.textContent = data.subtitle || 'Choose which part you want to work on:';

        const wordsCard = document.getElementById('component-opt-words');
        const wordsTitle = document.getElementById('component-words-title');
        const wordsStatus = document.getElementById('component-words-status');
        const wordsIconEl = document.getElementById('component-words-icon');
        const wordsPips = document.getElementById('component-words-pips');
        const wordsExamView = document.getElementById('component-words-exam-view');

        const phrasesCard = document.getElementById('component-opt-phrases');
        const phrasesTitle = document.getElementById('component-phrases-title');
        const phrasesStatus = document.getElementById('component-phrases-status');
        const phrasesIconEl = document.getElementById('component-phrases-icon');
        const phrasesPips = document.getElementById('component-phrases-pips');
        const phrasesExamView = document.getElementById('component-phrases-exam-view');

        const confirmBtn = document.getElementById('btn-confirm-component-selection');

        function renderComponentPips(containerId, count, targetReps = 7) {
          const container = document.getElementById(containerId);
          if (!container) return;
          const safeTarget = Math.max(1, parseInt(targetReps, 10) || 7);
          let html = '';
          for (let i = 1; i <= safeTarget; i++) {
            const isPassed = i <= count;
            html += `<div class="pip-box ${isPassed ? 'active' : ''}" data-pip="${i}">${isPassed ? '✓' : i}</div>`;
          }
          container.innerHTML = html;
        }

        const compTargetReps = (Number(data.targetReps) >= 14) ? Math.round(Number(data.targetReps) / 2) : (Number(data.targetReps) || 7);

        if (wordsIconEl) wordsIconEl.innerHTML = getSvgIcon('book-open', 18, '#38bdf8');
        if (phrasesIconEl) phrasesIconEl.innerHTML = getSvgIcon('book-open', 18, '#38bdf8');

        // Smart default selection: choose incomplete component first
        let selectedPart = null;
        if (data.isExam) {
          const wordsPct = data.wordsBest ? Number(data.wordsBest.percentage ?? data.wordsBest.effective_score ?? 0) : null;
          const phrasesPct = data.phrasesBest ? Number(data.phrasesBest.percentage ?? data.phrasesBest.effective_score ?? 0) : null;
          const wordsDone = wordsPct !== null && wordsPct >= 60;
          const phrasesDone = phrasesPct !== null && phrasesPct >= 60;
          if (wordsDone && !phrasesDone && data.phrasesTestId) {
            selectedPart = 'phrases';
          } else if (data.wordsTestId) {
            selectedPart = 'words';
          } else {
            selectedPart = data.phrasesTestId ? 'phrases' : null;
          }
        } else {
          const wordsDone = (Number(data.wordsPasses) || 0) >= compTargetReps;
          const phrasesDone = (Number(data.phrasesPasses) || 0) >= compTargetReps;
          if (wordsDone && !phrasesDone && data.phrasesTestId) {
            selectedPart = 'phrases';
          } else if (data.wordsTestId) {
            selectedPart = 'words';
          } else {
            selectedPart = data.phrasesTestId ? 'phrases' : null;
          }
        }

        const updateSelectionUI = () => {
          if (wordsCard) {
            wordsCard.classList.toggle('selected', selectedPart === 'words');
            wordsCard.setAttribute('aria-pressed', selectedPart === 'words' ? 'true' : 'false');
          }
          if (phrasesCard) {
            phrasesCard.classList.toggle('selected', selectedPart === 'phrases');
            phrasesCard.setAttribute('aria-pressed', selectedPart === 'phrases' ? 'true' : 'false');
          }
          if (confirmBtn) {
            confirmBtn.classList.remove('btn-words', 'btn-phrases');
            if (selectedPart === 'words') {
              confirmBtn.innerHTML = `START ${data.isExam ? 'WRD EXAM' : 'WRD'} &rarr;`;
              confirmBtn.disabled = false;
            } else if (selectedPart === 'phrases') {
              confirmBtn.innerHTML = `START ${data.isExam ? 'PHR EXAM' : 'PHR'} &rarr;`;
              confirmBtn.disabled = false;
            } else {
              confirmBtn.textContent = 'SELECT COMPONENT';
              confirmBtn.disabled = true;
            }
          }
        };

        const executeStart = () => {
          const targetTestId = selectedPart === 'words' ? data.wordsTestId : (selectedPart === 'phrases' ? data.phrasesTestId : null);
          if (targetTestId) {
            modal.classList.add('hidden');
            if (data.isUnified) {
              location.href = `test.html?test_id=${targetTestId}&section=${selectedPart}`;
            } else {
              location.href = `test.html?test_id=${targetTestId}`;
            }
          }
        };

        // Populate Words Card
        if (data.wordsTestId) {
          wordsCard.style.display = 'flex';
          if (wordsTitle) wordsTitle.textContent = data.isExam ? 'WRD EXAM' : 'WRD';
          if (data.isExam) {
            if (wordsPips) wordsPips.classList.add('hidden');
            if (wordsExamView) {
              wordsExamView.classList.remove('hidden');
              wordsExamView.style.display = 'flex';
              if (data.wordsBest) {
                const pct = Number(data.wordsBest.percentage ?? data.wordsBest.effective_score ?? 0);
                const clr = typeof getGradeColorByScore === 'function' ? getGradeColorByScore(pct) : (pct >= 60 ? 'var(--grade-a)' : 'var(--grade-d)');
                wordsExamView.innerHTML = `<span style="color:${clr};font-size:14px;font-weight:800;">Best: ${pct.toFixed(0)}% ${pct >= 60 ? '✓' : ''}</span>`;
              } else {
                wordsExamView.innerHTML = `<span style="color:var(--clr-text-3);font-size:12px;font-weight:600;">Not Taken Yet</span>`;
              }
            }
            if (wordsStatus) wordsStatus.textContent = '';
          } else {
            if (wordsPips) wordsPips.classList.remove('hidden');
            if (wordsExamView) wordsExamView.classList.add('hidden');
            const wordsPasses = Number(data.wordsPasses || 0);
            renderComponentPips('component-words-pips', Math.min(compTargetReps, wordsPasses), compTargetReps);
            if (wordsStatus) wordsStatus.textContent = `${Math.min(compTargetReps, wordsPasses)}/${compTargetReps}`;
          }
          wordsCard.onclick = () => {
            if (selectedPart === 'words') {
              executeStart();
            } else {
              selectedPart = 'words';
              updateSelectionUI();
            }
          };
        } else {
          wordsCard.style.display = 'none';
        }

        // Populate Phrases Card
        if (data.phrasesTestId) {
          phrasesCard.style.display = 'flex';
          if (phrasesTitle) phrasesTitle.textContent = data.isExam ? 'PHR EXAM' : 'PHR';
          if (data.isExam) {
            if (phrasesPips) phrasesPips.classList.add('hidden');
            if (phrasesExamView) {
              phrasesExamView.classList.remove('hidden');
              phrasesExamView.style.display = 'flex';
              if (data.phrasesBest) {
                const pct = Number(data.phrasesBest.percentage ?? data.phrasesBest.effective_score ?? 0);
                const clr = typeof getGradeColorByScore === 'function' ? getGradeColorByScore(pct) : (pct >= 60 ? 'var(--grade-a)' : 'var(--grade-d)');
                phrasesExamView.innerHTML = `<span style="color:${clr};font-size:14px;font-weight:800;">Best: ${pct.toFixed(0)}% ${pct >= 60 ? '✓' : ''}</span>`;
              } else {
                phrasesExamView.innerHTML = `<span style="color:var(--clr-text-3);font-size:12px;font-weight:600;">Not Taken Yet</span>`;
              }
            }
            if (phrasesStatus) phrasesStatus.textContent = '';
          } else {
            if (phrasesPips) phrasesPips.classList.remove('hidden');
            if (phrasesExamView) phrasesExamView.classList.add('hidden');
            const phrasesPasses = Number(data.phrasesPasses || 0);
            renderComponentPips('component-phrases-pips', Math.min(compTargetReps, phrasesPasses), compTargetReps);
            if (phrasesStatus) phrasesStatus.textContent = `${Math.min(compTargetReps, phrasesPasses)}/${compTargetReps}`;
          }
          phrasesCard.onclick = () => {
            if (selectedPart === 'phrases') {
              executeStart();
            } else {
              selectedPart = 'phrases';
              updateSelectionUI();
            }
          };
        } else {
          phrasesCard.style.display = 'none';
        }

        updateSelectionUI();

        if (confirmBtn) {
          confirmBtn.onclick = () => {
            executeStart();
          };
        }

        modal.classList.remove('hidden');

        const closeBtn = document.getElementById('close-component-modal');
        if (closeBtn && !closeBtn._hasListener) {
          closeBtn._hasListener = true;
          closeBtn.onclick = () => modal.classList.add('hidden');
        }
        const footerCloseBtn = document.getElementById('btn-close-component-selector');
        if (footerCloseBtn && !footerCloseBtn._hasListener) {
          footerCloseBtn._hasListener = true;
          footerCloseBtn.onclick = () => modal.classList.add('hidden');
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
      const hasForgivenByTest = {};
      const hasRemedialByTest = {};
      const wordsPassCountByTest = {};
      const phrasesPassCountByTest = {};
      const wordsBestByTest = {};
      const phrasesBestByTest = {};
      const manualRepsWByTest = {};
      const manualRepsPByTest = {};

      const getAttemptSection = (att) => {
        if (!att) return 'words';
        const rawSec = att?.payload?.section || att?.payload?.subtype || att?.payload?.component || att?.test_section || att?.section;
        if (rawSec) {
          const s = String(rawSec).toLowerCase();
          if (s.includes('phrase') || s === 'phr') return 'phrases';
          if (s.includes('word') || s === 'wrd') return 'words';
        }
        const fr = String(att?.forgiven_reason || '');
        if (/\b(phrases?|phr)\b/i.test(fr)) return 'phrases';
        if (/\b(words?|wrd)\b/i.test(fr)) return 'words';
        const aid = att.test_id || att.Test_id || att.tests?.id;
        const tObj = (typeof allTestsMap !== 'undefined' && allTestsMap ? allTestsMap[aid] : null) || att.tests;
        const isEx = tObj ? isExam(tObj) : /exam/i.test(att?.test_title || att?.title || '');
        const totalQ = Number(att?.total_questions || 0);
        const correctCount = Number(att?.correct_count || att?.score || 0);
        if (isEx) {
          if (totalQ > 0 && totalQ <= 50) return 'phrases';
          if (totalQ > 50) return 'words';
          if (correctCount > 0 && correctCount <= 40) return 'phrases';
          return 'words';
        }
        if (totalQ > 0 && totalQ <= 20) return 'phrases';
        if (totalQ > 20) return 'words';
        if (correctCount > 15) return 'words';
        if (correctCount > 0 && correctCount <= 10) return 'phrases';
        return 'words';
      };

      allAttempts.forEach(att => {
        const aid = att.test_id || att.Test_id;
        if (!aid) return;
        const pct = parseFloat(att.effective_score ?? att.percentage ?? 0);
        const st = (att.status || '').toUpperCase();
        const isRem = Boolean(att.is_remedial_unlocked || att.is_remedial);

        const fr = String(att.forgiven_reason || '');
        const mMatch = fr.match(/MANUAL_REPS:?\s*(\d+)(?:\/(\d+))?(?:\s*(WORDS|PHRASES))?/i);
        if (mMatch) {
          const reps = Math.min(7, parseInt(mMatch[1], 10));
          const comp = (mMatch[3] || '').toUpperCase();
          if (comp === 'PHRASES') {
            manualRepsPByTest[aid] = Math.max(manualRepsPByTest[aid] || 0, reps);
          } else if (comp === 'WORDS') {
            manualRepsWByTest[aid] = Math.max(manualRepsWByTest[aid] || 0, reps);
          } else {
            manualRepsWByTest[aid] = Math.max(manualRepsWByTest[aid] || 0, reps);
            manualRepsPByTest[aid] = Math.max(manualRepsPByTest[aid] || 0, reps);
          }
        }

        if (att.is_forgiven) {
          hasForgivenByTest[aid] = true;
          wordsPassCountByTest[aid] = Math.max(wordsPassCountByTest[aid] || 0, 7);
          phrasesPassCountByTest[aid] = Math.max(phrasesPassCountByTest[aid] || 0, 7);
        }
        if (isRem) hasRemedialByTest[aid] = true;

        if (st === 'IN_PROGRESS') {
          inProgressByTest[aid] = att;
        } else if (st === 'SUBMITTED' || st === 'AUTO_SUBMITTED' || st === 'EVALUATED') {
          const tObj = tests.find(t => t.id === aid);
          const isUni = tObj?.payload?.is_unified === true || tObj?.category === 'unified' || (tObj?.test_subtype && tObj.test_subtype.startsWith('UNIFIED'));
          const asmMin = Number(tObj?.minimum_required_score) || Number(tObj?.payload?.min_score) || 60;
          const isPassing = att.is_forgiven || pct >= asmMin || (isRem && pct >= 60);

          if (isUni) {
            const sec = getAttemptSection(att);
            if (sec === 'phrases') {
              if (phrasesBestByTest[aid] == null || pct > phrasesBestByTest[aid]) phrasesBestByTest[aid] = pct;
              if (isPassing) phrasesPassCountByTest[aid] = (phrasesPassCountByTest[aid] || 0) + 1;
            } else {
              if (wordsBestByTest[aid] == null || pct > wordsBestByTest[aid]) wordsBestByTest[aid] = pct;
              if (isPassing) wordsPassCountByTest[aid] = (wordsPassCountByTest[aid] || 0) + 1;
            }
            passCountByTest[aid] = Math.min(wordsPassCountByTest[aid] || 0, phrasesPassCountByTest[aid] || 0);
          } else {
            if (att.is_forgiven) {
              passCountByTest[aid] = Math.max(passCountByTest[aid] || 0, 7);
            } else if (isPassing) {
              passCountByTest[aid] = (passCountByTest[aid] || 0) + 1;
            }
          }
        }

        // AGENTS.md §2.7: Report card stores strictly HIGHEST score across attempts
        // Forgiven waiver qualifies the module; authentic passing attempts (>=60%) can still outrank it.
        const currentBest = bestByTest[aid];
        if (!currentBest) {
          bestByTest[aid] = att;
        } else {
          const curPct = parseFloat(currentBest.effective_score ?? currentBest.percentage ?? 0);
          const curQualifies = Boolean(currentBest.is_forgiven) || curPct >= 60;
          const newQualifies = Boolean(att.is_forgiven) || pct >= 60;

          if (newQualifies && !curQualifies) {
            bestByTest[aid] = att;
          } else if (!newQualifies && curQualifies) {
            // Keep the qualified attempt
          } else if (pct > curPct) {
            bestByTest[aid] = att;
          } else if (pct === curPct && new Date(att.submitted_at || att.created_at || 0) > new Date(currentBest.submitted_at || currentBest.created_at || 0)) {
            bestByTest[aid] = att;
          }
        }
      });

      // Synchronize manual repetition overrides into repetition mastery tracking
      tests.forEach(asm => {
        const tid = asm.id;
        if (manualRepsWByTest[tid] != null) {
          wordsPassCountByTest[tid] = Math.max(wordsPassCountByTest[tid] || 0, manualRepsWByTest[tid]);
        }
        if (manualRepsPByTest[tid] != null) {
          phrasesPassCountByTest[tid] = Math.max(phrasesPassCountByTest[tid] || 0, manualRepsPByTest[tid]);
        }
        const isUni = asm?.payload?.is_unified === true || asm?.category === 'unified' || (asm?.test_subtype && asm.test_subtype.startsWith('UNIFIED'));
        if (isUni) {
          // Self-Healing Fail-Safe: If a unified task has words passes >= 14 while phrases is 0,
          // auto-balance so untagged bulk reps never starve phrases
          if ((phrasesPassCountByTest[tid] || 0) === 0 && (wordsPassCountByTest[tid] || 0) >= 14) {
            const halfPasses = Math.floor(wordsPassCountByTest[tid] / 2);
            wordsPassCountByTest[tid] = halfPasses;
            phrasesPassCountByTest[tid] = halfPasses;
          }
          passCountByTest[tid] = Math.min(wordsPassCountByTest[tid] || 0, phrasesPassCountByTest[tid] || 0);
        } else if (manualRepsWByTest[tid] != null) {
          passCountByTest[tid] = Math.max(passCountByTest[tid] || 0, manualRepsWByTest[tid]);
        }
      });

      // Grade colors resolved via canonical getGradeColorByScore() from grading.js

      let cards = '';
      for (const asm of tests) {
        const bestAtt = bestByTest[asm.id];
        const inProgAtt = inProgressByTest[asm.id];
        const isRem = Boolean(bestAtt?.is_remedial_unlocked || bestAtt?.is_remedial || hasRemedialByTest[asm.id]);
        const isForgiven = Boolean(bestAtt?.is_forgiven || hasForgivenByTest[asm.id]);
        const rawBestPct = bestAtt ? parseFloat(bestAtt.percentage || 0) : null;
        const bestPct = isRem && rawBestPct !== null ? Math.min(rawBestPct, 60.0) : rawBestPct;
        const grade = bestPct !== null ? (typeof calculateGrade === 'function' ? calculateGrade(bestPct) : getGrade(bestPct)) : null;
        const gradeColor = bestPct !== null ? getGradeColorByScore(bestPct) : 'var(--clr-text-1)';
        const passed = bestPct !== null && (bestPct >= (asm.pass_threshold || 60) || isForgiven || (isRem && bestPct >= 60));

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

            // Dynamic Repetitive Mastery Hard Gate: All sibling tasks must reach N passes (>= passing threshold)
            const _themeGateTarget = Math.max(1, Number(window._classTestSettings?.taskRepetitions || 7));
            for (const task of siblingTasks) {
              const pCount = passCountByTest[task.id] || 0;
              if (pCount < _themeGateTarget) {
                prereqMet = false;
                prereqTitle = `All Theme Tasks Mastery (${_themeGateTarget}/${_themeGateTarget} Passes Required)`;
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
          const isStudentRemedialUnlocked = Boolean(isRem || hasRemedialByTest[asm.id]);

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
                const peRawPct = peBest ? parseFloat(peBest.effective_score ?? peBest.percentage ?? 0) : null;
                const peRem = Boolean(peBest && (peBest.is_remedial_unlocked || peBest.is_remedial || hasRemedialByTest[pe.id]));
                const pePct = peRem && peRawPct !== null ? Math.min(peRawPct, 60.0) : peRawPct;
                const peMin = Number(pe.minimum_required_score) || Number(pe.pass_threshold) || Number(pe.payload?.min_score) || 60;
                const pePassed = Boolean(peBest?.is_forgiven || hasForgivenByTest[pe.id]) || (pePct !== null && (pePct >= peMin || (peRem && pePct >= 60)));
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
              const wRawPct = wBest ? parseFloat(wBest.effective_score ?? wBest.percentage ?? 0) : null;
              const wRem = Boolean(wBest && (wBest.is_remedial_unlocked || wBest.is_remedial || hasRemedialByTest[siblingWordsExam.id]));
              const wPct = wRem && wRawPct !== null ? Math.min(wRawPct, 60.0) : wRawPct;
              const wMin = Number(siblingWordsExam.minimum_required_score) || Number(siblingWordsExam.pass_threshold) || Number(siblingWordsExam.payload?.min_score) || 60;
              const wPassed = Boolean(wBest?.is_forgiven || hasForgivenByTest[siblingWordsExam.id]) || (wPct !== null && (wPct >= wMin || (wRem && wPct >= 60)));
              if (!wPassed) {
                prereqMet = false;
                prereqTitle = `${siblingWordsExam.display_name || siblingWordsExam.title || 'Words Exam'} (Rate ≥${wMin}% required)`;
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
            const _prereqGateTarget = Math.max(1, Number(pObj?.payload?.task_repetitions || window._classTestSettings?.taskRepetitions || 7));
            prereqMet = isForgiven || pCount >= _prereqGateTarget;
            prereqTitle = pObj ? `${pObj.title || 'Prerequisite'} (${_prereqGateTarget}/${_prereqGateTarget} Passes Required)` : `Prerequisite Task (${_prereqGateTarget}/${_prereqGateTarget} Passes Required)`;
          } else {
            const prereqBest = bestByTest[pid];
            const prereqPct = prereqBest ? parseFloat(prereqBest.effective_score ?? prereqBest.percentage ?? 0) : null;
            const pMin = Number(asm.prerequisite_min_score) || Number(pObj?.minimum_required_score) || Number(pObj?.payload?.min_score) || 60;
            const isPrereqRem = Boolean(prereqBest && (prereqBest.is_remedial_unlocked || prereqBest.is_remedial));
            prereqMet = Boolean(prereqBest?.is_forgiven) || (prereqPct !== null && (prereqPct >= pMin || (isPrereqRem && prereqPct >= 60)));
            prereqTitle = pObj ? (pObj.title || pObj.Test_title || 'Prerequisite') : 'Prerequisite Test';
          }
        }

        // Live test session state
        const isAlumni = studentLevelNum === 99 || (session?.program_status || '').toUpperCase() === 'ALUMNI';
        const liveSession = asm.payload?.test_session;
        const isSessionUnlocked = isAlumni || (liveSession?.status === 'UNLOCKED' && (!liveSession.auto_close_at || new Date(liveSession.auto_close_at) > new Date()));
        const isWhitelisted = isAlumni || (isSessionUnlocked && (!Array.isArray(liveSession?.allowed_student_ids) || liveSession.allowed_student_ids.length === 0 || liveSession.allowed_student_ids.includes(session?.student_id || session?.id)));
        const isAsmTest = isThemeTest;
        const isFlexible = (asm.schedule_mode || asm.payload?.schedule_mode) === 'flexible';

        // Availability window
        const now = new Date();
        const availStart = asm.availability_start ? new Date(asm.availability_start) : null;
        const availEnd = asm.availability_end ? new Date(asm.availability_end) : null;
        const inWindow = (!availStart || now >= availStart) && (!availEnd || now <= availEnd);

        // Status
        let statusBadge = '';
        let actionBtn = '';
        const isCompleted = bestAtt && ['SUBMITTED', 'AUTO_SUBMITTED'].includes((bestAtt.status || '').toUpperCase());

        const isLocked = !isAlumni && !prereqMet;

        if (isLocked) {
          statusBadge = `<span class="badge" style="background:rgba(255,255,255,0.1);color:#a1a1aa;border:1px solid rgba(255,255,255,0.2);display:inline-flex;align-items:center;">${getSvgIcon('lock', 12)} Locked</span>`;
          actionBtn = `<div style="text-align:right;">
                         <span style="font-size:12px;color:var(--clr-text-3);">Complete <b>${escapeHtml(prereqTitle)}</b><br>to unlock.</span>
                       </div>`;
        } else if (!inWindow) {
          statusBadge = `<span class="badge" style="background:rgba(148,163,184,0.15);color:#94a3b8;border:1px solid rgba(148,163,184,0.3);">Not Yet Available</span>`;
          actionBtn = `<button class="btn btn-sm" disabled style="opacity:0.45;cursor:not-allowed;background:rgba(255,255,255,0.05);border:1px solid var(--clr-border);">Unavailable</button>`;
        } else if (isAsmTest && !isAlumni && !isFlexible && !isSessionUnlocked) {
          statusBadge = `<span class="badge" style="background:rgba(239,68,68,0.15);color:var(--grade-e);border:1px solid rgba(239,68,68,0.3);display:inline-flex;align-items:center;">${getSvgIcon('lock', 12)} Session Closed</span>`;
          actionBtn = `<button class="btn btn-sm" disabled style="opacity:0.45;cursor:not-allowed;background:rgba(255,255,255,0.05);border:1px solid var(--clr-border);">${getSvgIcon('lock', 12)} Closed</button>`;
        } else if (inProgAtt) {
          statusBadge = `<span class="badge" style="background:rgba(${TOPSCORE_COLORS.D_RGB},0.15);color:${TOPSCORE_COLORS.D};border:1px solid rgba(${TOPSCORE_COLORS.D_RGB},0.3);">In Progress</span>`;
          actionBtn = `<button class="btn btn-warning btn-sm" data-aid="${asm.id}">Resume</button>`;
        } else if (isCompleted) {
          const session = asm.payload?.test_session;
          const isSessionUnlocked = isAlumni || (session?.status === 'UNLOCKED' && (!session.auto_close_at || new Date(session.auto_close_at) > new Date()));

          let retakesAllowed = isAlumni || asm.max_attempts == null || (asm.max_attempts > (allAttempts.filter(a => (a.test_id || a.Test_id) === asm.id && (a.status || '').toUpperCase() !== 'IN_PROGRESS').length));

          const isEligibleForSelfPacedExam = Boolean(isAlumni || passed || bestAtt?.is_forgiven || hasForgivenByTest[asm.id] || isStudentRemedialUnlocked || isRemedialSession);

          if (isAsmTest) {
            // For formal Tests: Students who passed (>=60%), are forgiven, OR have remedial unlocked can take 24/7 independently!
            if (isEligibleForSelfPacedExam) {
              retakesAllowed = true;
            } else {
              retakesAllowed = retakesAllowed && isSessionUnlocked;
            }
          }

          statusBadge = passed
            ? `<span class="badge" style="background:rgba(${TOPSCORE_COLORS.STAR_RGB},0.15);color:${TOPSCORE_COLORS.STAR};border:1px solid rgba(${TOPSCORE_COLORS.STAR_RGB},0.3);">✓ Passed</span>`
            : `<span class="badge" style="background:rgba(${TOPSCORE_COLORS.D_RGB},0.15);color:${TOPSCORE_COLORS.D};border:1px solid rgba(${TOPSCORE_COLORS.D_RGB},0.3);">Needs Improvement</span>`;

          const canRetake = isAsmTest ? (isEligibleForSelfPacedExam || (retakesAllowed && !passed)) : retakesAllowed;

          if (canRetake) {
            const isRemedialAction = !passed && (isStudentRemedialUnlocked || isRemedialSession);
            const retakeBtnLabel = (bestAttPct === 100)
              ? 'Retake Drill'
              : (bestAtt?.is_forgiven || hasForgivenByTest[asm.id])
                ? 'Retake Exam'
                : (isRemedialAction)
                  ? 'Take Remedial'
                  : 'Retake';
            const retakeBtnBg = isRemedialAction ? 'var(--grade-c)' : 'var(--primary-tactical, #38bdf8)';
            const retakeBtnBorder = isRemedialAction ? 'var(--grade-c)' : 'var(--primary-tactical, #38bdf8)';
            const retakeTextColor = isRemedialAction ? '#0F172A' : '#090d16';
            const hasResultId = Boolean(bestAtt?.id);
            const viewBtn = hasResultId
              ? `<button class="btn btn-sm" style="background:rgba(255,255,255,0.05);border:1px solid var(--clr-border);padding:4px 8px;" data-aid-result="${bestAtt.id}">View</button>`
              : '';
            actionBtn = `<div style="display:flex;gap:6px;">${viewBtn}<button class="btn btn-sm btn-primary" style="padding:4px 8px;background:${retakeBtnBg};border-color:${retakeBtnBorder};color:${retakeTextColor};font-weight:700;" data-aid="${asm.id}">${retakeBtnLabel}</button></div>`;
          } else if (isAsmTest && !passed && !isSessionUnlocked && !isAlumni) {
            const hasResultId = Boolean(bestAtt?.id);
            const viewBtn = hasResultId
              ? `<button class="btn btn-sm" style="background:rgba(255,255,255,0.05);border:1px solid var(--clr-border);padding:4px 8px;" data-aid-result="${bestAtt.id}">View</button>`
              : '';
            actionBtn = `<div style="display:flex;gap:6px;align-items:center;">${viewBtn}<span style="font-size:12px;color:${TOPSCORE_COLORS.D};font-weight:700;padding:3px 6px;border-radius:4px;background:rgba(${TOPSCORE_COLORS.D_RGB},0.1);border:1px solid rgba(${TOPSCORE_COLORS.D_RGB},0.25);display:inline-flex;align-items:center;">${getSvgIcon('lock', 12)} Locked</span></div>`;
          } else {
            actionBtn = bestAtt?.id
              ? `<button class="btn btn-sm" style="background:rgba(255,255,255,0.05);border:1px solid var(--clr-border);" data-aid-result="${bestAtt.id}">View Result</button>`
              : `<button class="btn btn-sm" style="background:rgba(255,255,255,0.05);border:1px solid var(--clr-border);" data-aid="${asm.id}">Start</button>`;
          }

          if (isTaskItem && !inProgAtt) {
            const drillLabel = (taskVisual && taskVisual.count >= 7) ? 'Retake Drill' : ((taskVisual && taskVisual.count > 0) ? 'Drill Again' : 'Start Drill');
            const hasResultId = Boolean(bestAtt?.id);
            const viewBtn = hasResultId
              ? `<button class="btn btn-sm" style="background:rgba(255,255,255,0.05);border:1px solid var(--clr-border);padding:4px 8px;" data-aid-result="${bestAtt.id}">View</button>`
              : '';
            actionBtn = `<div style="display:flex;gap:6px;align-items:center;">
              ${viewBtn}
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
                <span style="font-weight:700;font-size:16px;color:var(--clr-text-1);">${escapeHtml(asmTitle)}</span>
                ${className ? `<span class="badge badge-neutral" style="font-size:12px;">${escapeHtml(className)}</span>` : ''}
                <span class="badge" style="font-size:12px;background:rgba(255,255,255,0.06);color:var(--clr-text-3);border:1px solid var(--clr-border);">${escapeHtml(asmType)}</span>
              </div>
              <div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;">
                ${isTaskItem && taskProgressBadge ? taskProgressBadge : ''}
                <span style="font-size:12px;color:var(--clr-text-3);">${duration} min</span>
                ${qCount !== '—' ? `<span style="font-size:12px;color:var(--clr-text-3);">${qCount} Questions</span>` : ''}
                ${statusBadge}
              </div>
              ${!prereqMet && prereqTitle ? `<div style="margin-top:0.5rem;"><span style="font-size:12px;color:var(--grade-e);">Complete prerequisite first: <em>${escapeHtml(prereqTitle)}</em></span></div>` : ''}
            </div>
            <div style="display:flex;align-items:center;gap:0.75rem;flex-shrink:0;">
              ${bestPct !== null ? `
                <div style="text-align:center;">
                  <div style="font-size:16px;font-weight:800;color:${gradeColor}${(grade === '★' || grade === 'S') ? `;text-shadow: none !important;` : ''}">${bestPct.toFixed(0)}%</div>
                  <div style="font-size:12px;color:var(--clr-text-3);">Best Rate</div>
                </div>
                ${(grade === '★' || grade === 'S' || bestPct >= 100)
                  ? `<div class="grade-star" style="width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;box-shadow: 0 2px 8px rgba(0,0,0,0.35);color:${TOPSCORE_COLORS.STAR};border:1.5px solid ${TOPSCORE_COLORS.STAR};">★</div>`
                  : `<div style="width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;border:2px solid ${gradeColor};color:${gradeColor};">${grade}</div>`
                }
              ` : ''}
              ${actionBtn}
            </div>
          </div>
        `;
      }

      section.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
          <h3 style="font-size:16px;font-weight:700;color:var(--clr-text-1);margin:0;">Assigned Tests <span style="font-size:12px;color:var(--clr-text-3);font-weight:400;margin-left:8px;">${tests.length} total</span></h3>
        </div>
        ${cards || '<div class="empty-state" style="padding:2rem;text-align:center;"><p class="text-muted">No tests assigned to you yet.</p></div>'}
      `;

      // Wire up buttons
      section.querySelectorAll('[data-aid]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const testId = btn.dataset.aid;
          sessionStorage.setItem('topscore_test_id', testId);
          const matchedTest = (tests || []).find(t => t.id === testId);

          const isAlumniUser = studentLevelNum === 99 || (session?.program_status || '').toUpperCase() === 'ALUMNI';
          if (matchedTest && !isAlumniUser) {
            const isEx = isExam(matchedTest);
            const liveSess = matchedTest.payload?.test_session;
            const isFlex = (matchedTest.schedule_mode || matchedTest.payload?.schedule_mode) === 'flexible';
            if (isEx && !isFlex && liveSess) {
              const isClosed = liveSess.status === 'LOCKED' || (liveSess.auto_close_at && new Date(liveSess.auto_close_at) <= new Date());
              if (isClosed) {
                if (typeof showToast === 'function') {
                  showToast('This test session has been closed by the Tutor.', 'warning');
                } else {
                  alert('This test session has been closed by the Tutor.');
                }
                return;
              }
            }
          }

          if (matchedTest && isDialogueTest(matchedTest)) {
            const activeSession = await fetchActiveTestSession(testId, session?.batch_id).catch(() => null);
            window.location.href = getTestLaunchUrl(matchedTest, activeSession);
            return;
          }

          const isUnified = matchedTest?.payload?.is_unified === true ||
                            matchedTest?.payload?.category === 'unified' ||
                            matchedTest?.category === 'unified' ||
                            (matchedTest?.test_subtype && matchedTest.test_subtype.startsWith('UNIFIED'));

          if (isUnified && typeof window.triggerComponentChoiceModal === 'function') {
            const isEx = isExam(matchedTest);
            const formatted = formatTestDisplay(matchedTest);
            const encoded = encodeURIComponent(JSON.stringify({
              badge: isEx ? 'OFFICIAL EXAM' : 'TOPIC TASK',
              title: formatted.fullTitle || matchedTest.title,
              subtitle: 'Choose which part you want to work on:',
              isExam: isEx,
              isUnified: true,
              wordsTestId: matchedTest.id,
              phrasesTestId: matchedTest.id,
              wordsPasses: wordsPassCountByTest[matchedTest.id] || 0,
              phrasesPasses: phrasesPassCountByTest[matchedTest.id] || 0,
              targetReps: Number(window._classTestSettings?.taskRepetitions) || 7,
              wordsBest: wordsBestByTest[matchedTest.id] != null ? { percentage: wordsBestByTest[matchedTest.id] } : (bestByTest[matchedTest.id] != null ? { percentage: bestByTest[matchedTest.id].effective_score ?? bestByTest[matchedTest.id].percentage } : null),
              phrasesBest: phrasesBestByTest[matchedTest.id] != null ? { percentage: phrasesBestByTest[matchedTest.id] } : null
            }));
            window.triggerComponentChoiceModal(encoded);
            return;
          }

          window.location.href = 'test.html';
        });
      });
      section.querySelectorAll('[data-aid-result]').forEach(btn => {
        btn.addEventListener('click', () => {
          const aid = btn.dataset.aidResult;
          if (aid && aid !== 'undefined' && aid !== 'null') {
            window.location.href = `result.html?attempt_id=${encodeURIComponent(aid)}`;
          }
        });
      });
    }

    // ── Overall Stats Calculation (AGENTS.md §2.8 & §2.10) ──

    function populateUpNext(attempts, myTests) {
      renderNextAssignmentHero(myTests, attempts, window._loadedClasses);
    }

    async function computeOverallStats(attempts = [], testsParam = null) {
      // Scoped Strictly to the Selected Class (User Rule: Dashboard represents active class only)
      const activeClassId = window._selectedClassId || (window._loadedClasses && window._loadedClasses[0]?.id);
      const activeClass = (window._loadedClasses || []).find(c => c.id === activeClassId);
      const discipline = activeClass ? detectClassDiscipline(activeClass) : 'GENERAL';
      const isManualClass = activeClass ? isManualEvaluationClass(activeClass) : false;

      if (isManualClass) {
        const supabase = typeof getSupabase === 'function' ? await getSupabase() : window.supabase;
        const currentStudent = window._currentStudent || (typeof getCurrentStudent === 'function' ? getCurrentStudent() : null);
        const studentId = currentStudent?.id || window._studentId;

        let manualAssessments = [];
        if (supabase && studentId) {
          const subCode = discipline === 'BASIC_ENGLISH' ? 'BASIC' : discipline;
          const { data } = await supabase
            .from('student_academic_assessments')
            .select('*')
            .eq('student_id', studentId)
            .eq('subject_code', subCode);
          if (data) manualAssessments = data;
        }

        const countEl = document.getElementById('stat-Tests-done');
        if (countEl) countEl.textContent = manualAssessments.length;
        const ovCountEl = document.getElementById('overview-Tests-count');
        if (ovCountEl) ovCountEl.textContent = manualAssessments.length;

        const examScores = manualAssessments
          .filter(a => a.assessment_type === 'PERIODIC_EXAM' && a.percentage != null)
          .map(a => Number(a.percentage));
        const allScored = manualAssessments
          .filter(a => a.percentage != null)
          .map(a => Number(a.percentage));

        const targetPcts = examScores.length > 0 ? examScores : allScored;
        const hasExam = targetPcts.length > 0;
        const avgPct = hasExam ? Math.round(targetPcts.reduce((a, b) => a + b, 0) / targetPcts.length) : 0;
        const overallGrade = hasExam ? calculateGrade(avgPct) : 'NEW';
        const targetColor = hasExam ? getGradeColorByScore(avgPct) : 'var(--clr-primary)';

        const scoreVal = document.getElementById('bottom-stat-avg-score');
        if (scoreVal) {
          scoreVal.textContent = hasExam ? `${avgPct}%` : '—';
          scoreVal.style.setProperty('color', targetColor, 'important');
        }

        const ovGradeEl = document.getElementById('overview-grade-badge');
        if (ovGradeEl) {
          ovGradeEl.textContent = hasExam ? overallGrade : '—';
          ovGradeEl.style.setProperty('color', targetColor, 'important');
        }

        const gradeCardEl = document.getElementById('dashboard-grade-legend') || document.querySelector('.grade-card');
        if (gradeCardEl) {
          gradeCardEl.dataset.tier = hasExam ? overallGrade : 'NEW';
          gradeCardEl.style.setProperty('--tier-color', targetColor, 'important');
        }
        return;
      }

      const allTests = (Array.isArray(testsParam) && testsParam.length > 0)
        ? testsParam
        : (window._allTests || []);

      const classTests = allTests.filter(t => {
        const cid = t.class_id || t.Class_id;
        return (!activeClassId || cid === activeClassId) && !t.deleted_at && (t.status || '').toUpperCase() === 'PUBLISHED';
      });
      const classTestIds = new Set(classTests.map(t => t.id));
      const activeAsmMap = new Map(classTests.map(a => [a.id, a]));
      const allBestMap = {};
      const examBestMap = {};

      (attempts || []).forEach(att => {
        if (att.tests && att.tests.deleted_at) return;
        const uniqueKey = att.test_instance_id || att.test_id || att.Test_id;
        if (!uniqueKey) return;
        if (!classTestIds.has(uniqueKey) && (!att.tests || !classTestIds.has(att.tests.id))) return;

        const asm = activeAsmMap.get(uniqueKey) || att.tests;
        if (asm?.deleted_at) return;

        const rawPct = parseFloat(att.effective_score != null ? att.effective_score : (att.percentage || 0));
        const isRem = Boolean(att.is_remedial_unlocked || att.is_remedial);
        const effPct = isRem ? Math.min(rawPct, 60.0) : rawPct;
        const attTime = new Date(att.submitted_at || att.created_at || 0).getTime();

        if (allBestMap[uniqueKey] == null || effPct > allBestMap[uniqueKey]) {
          allBestMap[uniqueKey] = effPct;
        }

        if (isExam(asm)) {
          const isUnified = asm?.payload?.is_unified || asm?.payload?.category === 'unified' || Number(asm?.payload?.total_questions || 0) === 200;
          const fr = String(att.forgiven_reason || '');
          const tQ = Number(att.total_questions || asm?.total_questions || asm?.payload?.total_questions || 50);
          const rawScore = Number(att.score ?? 0);
          const maxRemPts = tQ * 0.6;
          const effPoints = isRem ? Math.min(rawScore, maxRemPts) : rawScore;

          if (isUnified) {
            let sectionKey = uniqueKey;
            let sectionTQ = tQ;
            let sectionPts = effPoints;
            let sectionPct = effPct;

            if (fr.includes('[SECTION: WORDS]') || (tQ > 40 && tQ <= 160)) {
              sectionKey = `${uniqueKey}_words`;
              sectionTQ = 160;
              sectionPts = tQ === 160 ? Math.round(effPoints) : Math.round(160 * (effPct / 100));
            } else if (fr.includes('[SECTION: PHRASES]') || (tQ > 0 && tQ <= 40)) {
              sectionKey = `${uniqueKey}_phrases`;
              sectionTQ = 40;
              sectionPts = tQ === 40 ? Math.round(effPoints) : Math.round(40 * (effPct / 100));
            } else if (tQ > 160) {
              // Full 200Q attempt: decompose into words (160) and phrases (40)
              const wPts = Math.min(160, Math.round(effPoints));
              const wPct = (wPts / 160) * 100;
              const curWPts = examBestMap[`${uniqueKey}_words`]?.effPoints ?? -1;
              if (examBestMap[`${uniqueKey}_words`] == null || wPts > curWPts) {
                examBestMap[`${uniqueKey}_words`] = {
                  effPct: wPct,
                  effPoints: wPts,
                  totalQ: 160,
                  test: asm,
                  testId: `${uniqueKey}_words`,
                  attTime,
                  isForgiven: Boolean(att.is_forgiven)
                };
              }
              if (rawScore > 160) {
                const pPts = Math.min(40, Math.round(effPoints - 160));
                const pPct = (pPts / 40) * 100;
                const curPPts = examBestMap[`${uniqueKey}_phrases`]?.effPoints ?? -1;
                if (examBestMap[`${uniqueKey}_phrases`] == null || pPts > curPPts) {
                  examBestMap[`${uniqueKey}_phrases`] = {
                    effPct: pPct,
                    effPoints: pPts,
                    totalQ: 40,
                    test: asm,
                    testId: `${uniqueKey}_phrases`,
                    attTime,
                    isForgiven: Boolean(att.is_forgiven)
                  };
                }
              }
              return;
            }

            const curPts = examBestMap[sectionKey]?.effPoints ?? -1;
            const curPct = examBestMap[sectionKey]?.effPct ?? -1;
            const curTime = examBestMap[sectionKey]?.attTime || 0;
            if (examBestMap[sectionKey] == null || sectionPts > curPts || (sectionPts === curPts && sectionPct > curPct) || (sectionPts === curPts && attTime > curTime)) {
              examBestMap[sectionKey] = {
                effPct: sectionPct,
                effPoints: sectionPts,
                totalQ: sectionTQ,
                test: asm,
                testId: sectionKey,
                attTime,
                isForgiven: Boolean(att.is_forgiven)
              };
            }
          } else {
            const curPts = examBestMap[uniqueKey]?.effPoints ?? -1;
            const curPct = examBestMap[uniqueKey]?.effPct ?? -1;
            const curTime = examBestMap[uniqueKey]?.attTime || 0;
            if (examBestMap[uniqueKey] == null || effPoints > curPts || (effPoints === curPts && effPct > curPct) || (effPoints === curPts && attTime > curTime)) {
              examBestMap[uniqueKey] = {
                effPct,
                effPoints,
                totalQ: tQ,
                test: asm,
                testId: uniqueKey,
                attTime,
                isForgiven: Boolean(att.is_forgiven)
              };
            }
          }
        }
      });

      // Total completed activities (Tasks + Exams) for badges / progress in selected class
      const completedCount = Object.keys(allBestMap).filter(k => !k.endsWith('_locked')).length;
      const TestsCountEl = document.getElementById('stat-Tests-done');
      if (TestsCountEl) TestsCountEl.textContent = completedCount;
      const ovCountEl = document.getElementById('overview-Tests-count');
      if (ovCountEl) ovCountEl.textContent = completedCount;

      // Academic Score & Grade: Calculated EXCLUSIVELY from Exams of the selected class
      const examEntries = Object.entries(examBestMap)
        .filter(([k]) => !k.endsWith('_locked'))
        .map(([, v]) => v);

      const allClassExams = classTests.filter(isExam);

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

      // Rule 2.8: Use weighted average of completed exam points / questions as academic score
      const validExamEntriesForCard = examEntries.filter(e => {
        const isPureForgivenZero = Boolean(e.isForgiven) && Number(e.effPoints ?? e.points ?? 0) === 0;
        return !isPureForgivenZero;
      });
      const validCardPts = validExamEntriesForCard.reduce((sum, e) => sum + Number(e.effPoints ?? e.points ?? 0), 0);
      const validCardQ = validExamEntriesForCard.reduce((sum, e) => sum + Number(e.totalQ || 0), 0);
      let avgPct = validCardQ > 0
        ? Math.min(100, Math.max(0, Math.round((validCardPts / validCardQ) * 100)))
        : (validExamEntriesForCard.length > 0
            ? Math.round(validExamEntriesForCard.reduce((sum, e) => sum + Number(e.effPct ?? e.pct ?? 0), 0) / validExamEntriesForCard.length)
            : (hasExam ? mastery.overallScore : 0));
      let overallGrade = validCardQ > 0
        ? (typeof calculateGrade === 'function' ? calculateGrade(avgPct) : mastery.grade)
        : (hasExam ? mastery.grade : '-');
      let isGradeS = overallGrade === '★' || overallGrade === 'S' || avgPct >= 100;
      let targetColor = '#94a3b8';
      let rgbColor = '148, 163, 184';

      if (hasExam) {
        const theme = (GRADE_PALETTE && GRADE_PALETTE[overallGrade]) ? GRADE_PALETTE[overallGrade] : (GRADE_PALETTE['★'] || {
          color: TOPSCORE_COLORS.STAR, dark: '#7e22ce', light: '#d8b4fe', rgb: TOPSCORE_COLORS.STAR_RGB, glow: `rgba(${TOPSCORE_COLORS.STAR_RGB}, 0.45)`
        });
        targetColor = theme.color;
        rgbColor = theme.rgb || TOPSCORE_COLORS.STAR_RGB;
      }

      window._studentGradeColor = targetColor;
      window._studentGradeRgb = rgbColor;
      applyProfileGradeTheme(targetColor, rgbColor);


      const scoreEl = document.getElementById('stat-overall-score');
      if (scoreEl) {
        scoreEl.textContent = hasExam ? `${avgPct}%` : '0%';
        scoreEl.className = hasExam ? `fw-800 banner-score-text text-grade-${overallGrade}` : 'fw-800 banner-score-text';
      }

      const gradeBadgeValue = document.getElementById('stat-overall-grade-value');
      if (gradeBadgeValue) {
        if (!hasExam) {
          gradeBadgeValue.textContent = '-';
        } else if (isGradeS) {
          gradeBadgeValue.innerHTML = `
            <svg class="pure-star-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: none); display:inline-block; vertical-align:middle;">
              <defs>
                <linearGradient id="starDashGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="${TOPSCORE_COLORS.STAR}" />
                  <stop offset="100%" stop-color="#7e22ce" />
                </linearGradient>
              </defs>
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="url(#starDashGrad)" />
            </svg>
          `;
        } else {
          gradeBadgeValue.textContent = overallGrade;
        }
      }

      const achievementTextEl = document.getElementById('dashboard-achievement-text');
      const avgScoreDisplay = document.getElementById('bottom-stat-avg-score');
      const isAlumni = session.level_number === 99 || (session.program_status || '').toUpperCase() === 'ALUMNI' || (session.level_name || '').toLowerCase() === 'alumni' || (session.level_name || '').toUpperCase() === 'X';

      if (isAlumni) {
        if (hasExam) {
          const statusWord = getAchievementStatus(overallGrade, avgPct);
          if (achievementTextEl) {
            achievementTextEl.textContent = statusWord || 'ALUMNI';
          }
          if (avgScoreDisplay) avgScoreDisplay.textContent = `${avgPct}%`;
        } else {
          overallGrade = 'X';
          targetColor = 'var(--grade-c, #ffff00)';
          rgbColor = '245, 158, 11';
          if (gradeBadgeValue) gradeBadgeValue.textContent = 'X';
          if (avgScoreDisplay) avgScoreDisplay.textContent = '—';
          if (achievementTextEl) {
            achievementTextEl.textContent = 'ALUMNI';
          }
        }
      } else if (!hasExam) {
        overallGrade = '-';
        targetColor = '#94a3b8';
        rgbColor = '148, 163, 184';
        if (gradeBadgeValue) gradeBadgeValue.textContent = '-';
        if (avgScoreDisplay) avgScoreDisplay.textContent = '-';
        if (achievementTextEl) {
          achievementTextEl.textContent = 'START';
        }
      } else {
        const statusWord = getAchievementStatus(overallGrade, avgPct);
        if (achievementTextEl) {
          achievementTextEl.textContent = statusWord;
        }
      }

      if (achievementTextEl) {
        achievementTextEl.style.setProperty('font-size', '20px', 'important');
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

      // 1. Ambient Hero Banner Aura & Modular CSS Variables across all Lobby Cards (excluding Grade Card)
      const tierElements = [
        document.getElementById('welcome-banner-section'),
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
            el.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
            el.style.background = `radial-gradient(ellipse 90% 70% at 50% 0%, rgba(${TOPSCORE_COLORS.STAR_RGB}, 0.15), transparent 75%), #0f172a`;
          } else {
            // For all evaluated grades (A, B, C, D, E) and New Student / Alumni (Purple):
            // The border line keeps pure color without box glow!
            el.style.borderColor = `rgba(${rgbColor}, 0.55)`;
            el.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.35)';
            el.style.background = `radial-gradient(ellipse 90% 70% at 50% 0%, rgba(${rgbColor}, 0.12), transparent 75%), #0f172a`;
          }
        }
      });

      // 1b. Grade Card (Bento 3-Box Architecture: Transparent Container, Inner Boxes Styled via CSS)
      const gradeCardEl = document.getElementById('dashboard-grade-legend') || document.querySelector('.grade-card');
      if (gradeCardEl) {
        gradeCardEl.dataset.tier = isAlumni ? 'X' : (!hasExam ? 'NEW' : (isGradeS ? 'S' : overallGrade));
        gradeCardEl.style.setProperty('--tier-color', targetColor, 'important');
        gradeCardEl.style.setProperty('--tier-rgb', rgbColor, 'important');
        gradeCardEl.style.setProperty('background', 'transparent', 'important');
        gradeCardEl.style.setProperty('border', 'none', 'important');
        gradeCardEl.style.setProperty('box-shadow', 'none', 'important');
      }

      // 2. Avatar Container Ring (Color only, no outer box glow)
      const avatarBox = document.getElementById('banner-avatar-container');
      if (avatarBox) {
        if (isGradeS) {
          avatarBox.style.background = `linear-gradient(135deg, ${TOPSCORE_COLORS.STAR} 0%, #7e22ce 100%)`;
          avatarBox.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
          avatarBox.style.border = `2.5px solid ${TOPSCORE_COLORS.STAR}`;
          avatarBox.classList.add('grade-star');
        } else {
          avatarBox.classList.remove('grade-star');
          avatarBox.style.background = 'rgba(15, 23, 42, 0.9)';
          avatarBox.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.35)';
          avatarBox.style.border = `2.5px solid ${targetColor}`;
        }
      }

      // 3. Score Value Display (Inside Grade Card)
      const scoreVal = document.getElementById('bottom-stat-avg-score');
      if (scoreVal) {
        scoreVal.textContent = hasExam ? `${avgPct}%` : '-';
        scoreVal.style.setProperty('color', targetColor, 'important');
        scoreVal.style.setProperty('filter', 'none', 'important');
        scoreVal.classList.remove('text-grade-star');
      }

      // 4. Grade Value Display (Inside Grade Card)
      const gradeVal = document.getElementById('stat-overall-grade-value');
      if (gradeVal) {
        gradeVal.textContent = hasExam ? overallGrade : '-';
        gradeVal.style.setProperty('color', targetColor, 'important');
        gradeVal.style.setProperty('filter', 'none', 'important');
        gradeVal.classList.remove('text-grade-star');
      }

      // 4b. Achievement Description Display (Inside Grade Card)
      if (achievementTextEl) {
        achievementTextEl.style.setProperty('color', targetColor, 'important');
        achievementTextEl.style.setProperty('filter', 'none', 'important');
      }

      // 5. Border Accent on Score & Grade Cards (Symmetrical Boxes - Color only, no box glow)
      const scoreCard = document.getElementById('banner-score-box');
      if (scoreCard) {
        scoreCard.style.borderColor = isGradeS ? `rgba(${TOPSCORE_COLORS.STAR_RGB}, 0.6)` : `rgba(${rgbColor}, 0.35)`;
        scoreCard.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
      }
      const gradeCard = document.getElementById('banner-grade-box');
      if (gradeCard) {
        gradeCard.style.borderColor = isGradeS ? `rgba(${TOPSCORE_COLORS.STAR_RGB}, 0.6)` : `rgba(${rgbColor}, 0.35)`;
        gradeCard.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
      }

      renderCompletedTestsBottom(attempts, allTests);
      populateUpNext(attempts, allTests);


    }

    // --- Render Completed Tests Section (Bottom of Dashboard - Dual Panel) ---
    async function renderCompletedTestsBottom(attempts = [], testsParam = null) {
      const container = document.getElementById('completed-Tests-container');
      const countBadge = document.getElementById('dock-completed-count-badge');
      if (!container) return;

      const activeClassId = window._selectedClassId || (window._loadedClasses && window._loadedClasses[0]?.id);
      const activeClass = (window._activeClasses || window._loadedClasses || []).find(c => c.id === activeClassId);
      const discipline = activeClass ? detectClassDiscipline(activeClass) : 'GENERAL';
      const isManualClass = activeClass ? isManualEvaluationClass(activeClass) : false;

      if (isManualClass) {
        const supabase = typeof getSupabase === 'function' ? await getSupabase() : window.supabase;
        const currentStudent = window._currentStudent || (typeof getCurrentStudent === 'function' ? getCurrentStudent() : null);
        const studentId = currentStudent?.id || window._studentId;

        let studentAssessments = [];
        if (supabase && studentId) {
          const subCode = discipline === 'BASIC_ENGLISH' ? 'BASIC' : discipline;
          const { data } = await supabase
            .from('student_academic_assessments')
            .select('*')
            .eq('student_id', studentId)
            .eq('subject_code', subCode);
          if (data) studentAssessments = data;
        }

        if (countBadge) {
          countBadge.textContent = studentAssessments.length;
        }

        if (!studentAssessments.length) {
          container.innerHTML = `
            <div class="empty-state p-4 text-center" style="padding: 24px 12px;">
              <p style="color:var(--clr-text-3); font-size:12px; margin:0;">No evaluation records registered yet for this class.</p>
            </div>
          `;
          return;
        }

        container.innerHTML = `
          <div class="table-wrap" style="width:100%; overflow-x:auto;">
            <table class="topscore-table" style="width:100%; border-collapse:collapse; font-size:12px; text-align:left;">
              <thead>
                <tr style="background:var(--clr-surface-elevated); height:30px;">
                  <th style="padding:6px 10px; color:var(--clr-text-3); width:40px; text-align:center;">NO</th>
                  <th style="padding:6px 10px; color:var(--clr-text-1);">ASSESSMENT INSTRUMENT</th>
                  <th style="padding:6px 10px; color:var(--clr-text-2); text-align:center; width:90px;">TYPE</th>
                  <th style="padding:6px 10px; color:var(--clr-text-2); text-align:center; width:90px;">SCORE</th>
                  <th style="padding:6px 10px; color:var(--clr-text-2); text-align:center; width:80px;">RATE</th>
                  <th style="padding:6px 10px; color:var(--clr-text-2); text-align:center; width:70px;">GRADE</th>
                  <th style="padding:6px 10px; color:var(--clr-text-3); text-align:right;">NOTES</th>
                </tr>
              </thead>
              <tbody>
                ${studentAssessments.map((a, idx) => {
                  const keyLabel = a.assessment_key === 'PT' ? 'Placement Test (Diagnostic)'
                    : a.assessment_key === 'U1' ? 'Periodical Exam U1 (Mid-Term)'
                    : a.assessment_key === 'U2' ? 'Periodical Exam U2 (Final-Term)'
                    : a.assessment_key === 'PRACTICE' ? 'Practical Speaking Evaluation'
                    : `Weekly Evaluation ${a.assessment_key}`;
                  const scoreDisplay = a.raw_score != null ? `${a.raw_score}${a.target_score ? ` / ${a.target_score}` : ''}` : '—';
                  const pct = a.percentage != null ? Math.round(a.percentage) : 0;
                  const gColor = typeof getGradeColorByScore === 'function' ? getGradeColorByScore(pct) : 'inherit';
                  return `
                    <tr style="border-bottom:1px solid var(--clr-border-muted);">
                      <td style="padding:8px 10px; text-align:center; color:var(--clr-text-3);">${idx + 1}</td>
                      <td style="padding:8px 10px; font-weight:600; color:var(--clr-text-1);">${escapeHtml(keyLabel)}</td>
                      <td style="padding:8px 10px; text-align:center;"><span style="color:var(--clr-text-2); font-size:12px; font-weight:600;">${escapeHtml(a.assessment_type)}</span></td>
                      <td style="padding:8px 10px; text-align:center; font-weight:700; color:var(--clr-text-1);">${escapeHtml(scoreDisplay)}</td>
                      <td style="padding:8px 10px; text-align:center; font-weight:700; color:${gColor};">${pct}%</td>
                      <td style="padding:8px 10px; text-align:center;">${typeof formatGradeBadgeHtml === 'function' ? formatGradeBadgeHtml(a.grade || 'C', pct) : (a.grade || '—')}</td>
                      <td style="padding:8px 10px; text-align:right; color:var(--clr-text-3); font-size:11px;">${escapeHtml(a.notes || 'Tutor Evaluation')}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `;
        return;
      }

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
      const wordsPassCountByTest = {};
      const phrasesPassCountByTest = {};
      const wordsBestByTest = {};
      const phrasesBestByTest = {};
      const manualRepsWByTest = {};
      const manualRepsPByTest = {};

      const getAttemptSection = (att) => {
        if (!att) return 'words';
        const rawSec = att?.payload?.section || att?.payload?.subtype || att?.payload?.component || att?.test_section || att?.section;
        if (rawSec) {
          const s = String(rawSec).toLowerCase();
          if (s.includes('phrase') || s === 'phr') return 'phrases';
          if (s.includes('word') || s === 'wrd') return 'words';
        }
        const fr = String(att?.forgiven_reason || '');
        if (/\b(phrases?|phr)\b/i.test(fr)) return 'phrases';
        if (/\b(words?|wrd)\b/i.test(fr)) return 'words';
        const aid = att.test_id || att.Test_id || att.tests?.id;
        const tObj = (typeof allTestsMap !== 'undefined' && allTestsMap ? allTestsMap[aid] : null) || att.tests;
        const isEx = tObj ? isExam(tObj) : /exam/i.test(att?.test_title || att?.title || '');
        const totalQ = Number(att?.total_questions || 0);
        const correctCount = Number(att?.correct_count || att?.score || 0);
        if (isEx) {
          if (totalQ > 0 && totalQ <= 50) return 'phrases';
          if (totalQ > 50) return 'words';
          if (correctCount > 0 && correctCount <= 40) return 'phrases';
          return 'words';
        }
        if (totalQ > 0 && totalQ <= 20) return 'phrases';
        if (totalQ > 20) return 'words';
        if (correctCount > 15) return 'words';
        if (correctCount > 0 && correctCount <= 10) return 'phrases';
        return 'words';
      };

      validAttempts.forEach(att => {
        const tid = att.test_id || att.tests?.id;
        if (!tid) return;
        const rawPct = parseFloat(att.effective_score != null ? att.effective_score : (att.percentage || 0));
        const isRem = Boolean(att.is_remedial_unlocked || att.is_remedial);
        const effPct = isRem ? Math.min(rawPct, 60.0) : rawPct;
        const grade = typeof calculateGrade === 'function' ? calculateGrade(effPct) : (typeof getGrade === 'function' ? getGrade(effPct) : 'E');
        const prev = bestByTest[tid];
        if (!prev || effPct > prev.effPct) {
          bestByTest[tid] = { effPct, grade, isRem, rawPct, is_forgiven: Boolean(att.is_forgiven), forgiven_reason: att.forgiven_reason };
        }

        const fr = String(att.forgiven_reason || '');
        const mMatch = fr.match(/MANUAL_REPS:?\s*(\d+)(?:\/(\d+))?(?:\s*(WORDS|PHRASES))?/i);
        if (mMatch) {
          const reps = Math.min(7, parseInt(mMatch[1], 10));
          const comp = (mMatch[3] || '').toUpperCase();
          if (comp === 'PHRASES') {
            manualRepsPByTest[tid] = Math.max(manualRepsPByTest[tid] || 0, reps);
          } else if (comp === 'WORDS') {
            manualRepsWByTest[tid] = Math.max(manualRepsWByTest[tid] || 0, reps);
          } else {
            manualRepsWByTest[tid] = Math.max(manualRepsWByTest[tid] || 0, reps);
            manualRepsPByTest[tid] = Math.max(manualRepsPByTest[tid] || 0, reps);
          }
        }

        const tObj = (allClassTests || []).find(x => x.id === tid);
        const isUni = tObj?.payload?.is_unified === true || tObj?.category === 'unified' || (tObj?.test_subtype && tObj.test_subtype.startsWith('UNIFIED'));
        const isPassing = att.is_forgiven || effPct >= 50.0;

        if (isUni) {
          const sec = getAttemptSection(att);
          if (sec === 'phrases') {
            if (phrasesBestByTest[tid] == null || effPct > (phrasesBestByTest[tid]?.effPct ?? 0)) phrasesBestByTest[tid] = { effPct, grade };
            if (isPassing) phrasesPassCountByTest[tid] = (phrasesPassCountByTest[tid] || 0) + 1;
          } else {
            if (wordsBestByTest[tid] == null || effPct > (wordsBestByTest[tid]?.effPct ?? 0)) wordsBestByTest[tid] = { effPct, grade };
            if (isPassing) wordsPassCountByTest[tid] = (wordsPassCountByTest[tid] || 0) + 1;
          }
          passCountByTest[tid] = Math.min(wordsPassCountByTest[tid] || 0, phrasesPassCountByTest[tid] || 0);
        } else {
          if (isPassing) {
            passCountByTest[tid] = (passCountByTest[tid] || 0) + 1;
          }
        }
      });

      // Synchronize manual repetition overrides into completed tests mapping
      publishedClassTests.forEach(t => {
        const tid = t.id;
        if (manualRepsWByTest[tid] != null) {
          wordsPassCountByTest[tid] = Math.max(wordsPassCountByTest[tid] || 0, manualRepsWByTest[tid]);
          if (!wordsBestByTest[tid]) wordsBestByTest[tid] = { effPct: 70.0, grade: 'C' };
        }
        if (manualRepsPByTest[tid] != null) {
          phrasesPassCountByTest[tid] = Math.max(phrasesPassCountByTest[tid] || 0, manualRepsPByTest[tid]);
          if (!phrasesBestByTest[tid]) phrasesBestByTest[tid] = { effPct: 70.0, grade: 'C' };
        }
        if (manualRepsWByTest[tid] != null || manualRepsPByTest[tid] != null) {
          const isUni = t.payload?.is_unified === true || t.category === 'unified' || (t.test_subtype && t.test_subtype.startsWith('UNIFIED'));
          if (isUni) {
            // Self-Healing Fail-Safe: If a unified task has words passes >= 14 while phrases is 0,
            // auto-balance so untagged bulk reps never starve phrases
            if ((phrasesPassCountByTest[tid] || 0) === 0 && (wordsPassCountByTest[tid] || 0) >= 14) {
              const halfPasses = Math.floor(wordsPassCountByTest[tid] / 2);
              wordsPassCountByTest[tid] = halfPasses;
              phrasesPassCountByTest[tid] = halfPasses;
              if (!phrasesBestByTest[tid]) phrasesBestByTest[tid] = wordsBestByTest[tid] || { effPct: 70.0, grade: 'C' };
            }
            passCountByTest[tid] = Math.min(wordsPassCountByTest[tid] || 0, phrasesPassCountByTest[tid] || 0);
          } else {
            passCountByTest[tid] = Math.max(passCountByTest[tid] || 0, manualRepsWByTest[tid] || 0);
          }
          if (!bestByTest[tid]) {
            bestByTest[tid] = { effPct: 70.0, grade: 'C', isRem: false, rawPct: 70.0, is_forgiven: false, forgiven_reason: '[Mr. Top] MANUAL_REPS: 7/7' };
          }
        }
      });

      const targetReps = Number(window._classTestSettings?.taskRepetitions) || 7;
      const isExamItem = (t) => (t.test_type || '').toLowerCase() === 'exam' || /exam/i.test(t.title || '') || /exam/i.test(t.shell_code || '');

      // Display ALL completed tests OR tests currently in progress / attempted for this active class (keeps display 100% in sync)
      const completedOnlyTests = publishedClassTests.filter(t => {
        const hasAttempts = bestByTest[t.id] != null ||
          (wordsPassCountByTest[t.id] || 0) > 0 ||
          (phrasesPassCountByTest[t.id] || 0) > 0 ||
          (passCountByTest[t.id] || 0) > 0 ||
          (attempts || []).some(a => (a.test_id || a.tests?.id) === t.id);

        if (!hasAttempts) return false;

        // Ensure bestByTest entry exists even if only in-progress
        if (!bestByTest[t.id]) {
          bestByTest[t.id] = { effPct: 0, grade: 'E', isRem: false, rawPct: 0, is_forgiven: false };
        }

        return true;
      });

      if (countBadge) {
        countBadge.textContent = completedOnlyTests.length;
      }

      if (!completedOnlyTests.length) {
        container.innerHTML = `
          <div class="empty-state p-4 text-center" style="padding: 24px 12px;">
            <p style="color:var(--clr-text-3); font-size:12px; margin:0;">No completed tests yet.</p>
          </div>
        `;
        return;
      }

      // Order strictly from latest completed test down to earliest
      const sortedAccessible = [...completedOnlyTests].reverse();

      window.handleCompletedExamComponentClick = function(tId, compKey) {
        window.location.href = `test.html?id=${tId}&section=${compKey}`;
      };

      window.handleCompletedExamClick = function(tId) {
        const tObj = (completedOnlyTests || []).find(item => item.id === tId);
        if (tObj) {
          const isUnified = tObj.payload?.is_unified === true ||
                            tObj.payload?.category === 'unified' ||
                            tObj.category === 'unified' ||
                            (tObj.test_subtype && tObj.test_subtype.startsWith('UNIFIED'));
          if (isUnified && typeof window.triggerComponentChoiceModal === 'function') {
            const formatted = formatTestDisplay(tObj);
            const bObj = bestByTest[tId];
            const isEx = (tObj.test_type || '').toLowerCase() === 'exam' ||
                         (tObj.category || '').toUpperCase() === 'EXAM' ||
                         (tObj.title || '').toLowerCase().includes('exam');
            const badgeLabel = isEx ? 'OFFICIAL EXAM' : 'TASK DRILL';
            const encoded = encodeURIComponent(JSON.stringify({
              badge: badgeLabel,
              title: formatted.fullTitle || tObj.title,
              subtitle: 'Choose which part you want to work on:',
              isExam: isEx,
              isUnified: true,
              wordsTestId: tObj.id,
              phrasesTestId: tObj.id,
              wordsPasses: wordsPassCountByTest[tObj.id] || 0,
              phrasesPasses: phrasesPassCountByTest[tObj.id] || 0,
              targetReps: Number(window._classTestSettings?.taskRepetitions) || 7,
              wordsBest: wordsBestByTest[tObj.id] != null ? { percentage: wordsBestByTest[tObj.id].effPct } : (bObj != null ? { percentage: bObj.effPct } : null),
              phrasesBest: phrasesBestByTest[tObj.id] != null ? { percentage: phrasesBestByTest[tObj.id].effPct } : null
            }));
            window.triggerComponentChoiceModal(encoded);
            return;
          }
        }
        window.location.href = `test.html?id=${tId}`;
      };

      let html = '';
      let rowNum = 1;
      sortedAccessible.forEach((t) => {
        // Format test title per SSOT standard (AGENTS.md § 2.6.2)
        const formatted = typeof formatTestDisplay === 'function' ? formatTestDisplay(t) : null;
        const testTitle = formatted?.fullTitle || t.title || t.name || 'Test';

        // Distinguish Exam vs Task
        const isEx = typeof isExam === 'function' ? isExam(t) : (
          (t.test_type || '').toLowerCase() === 'exam' ||
          (t.category || '').toUpperCase() === 'EXAM' ||
          (t.title || '').toLowerCase().includes('exam') ||
          (t.shell_code || '').toUpperCase().endsWith('-EXAM')
        );

        const isUni = Boolean(
          t.payload?.is_unified === true ||
          t.payload?.category === 'unified' ||
          t.category === 'unified' ||
          (t.test_subtype && t.test_subtype.startsWith('UNIFIED'))
        );

        // Unified Exam: Render 2 distinct rows (Words and Phrase) per user requirement
        if (isEx && isUni) {
          const examAttempts = validAttempts.filter(a => (a.test_id || a.tests?.id) === t.id);
          const wordsAtts = examAttempts.filter(a => getAttemptSection(a) !== 'phrases');
          const phrasesAtts = examAttempts.filter(a => getAttemptSection(a) === 'phrases');

          const getBestComp = (attsList) => {
            let bestComp = null;
            attsList.forEach(a => {
              const rawPct = parseFloat(a.effective_score != null ? a.effective_score : (a.percentage || 0));
              const isRem = Boolean(a.is_remedial_unlocked || a.is_remedial);
              const effPct = isRem ? Math.min(rawPct, 60.0) : rawPct;
              const gr = typeof calculateGrade === 'function' ? calculateGrade(effPct) : (typeof getGrade === 'function' ? getGrade(effPct) : 'E');
              if (!bestComp || effPct > bestComp.effPct) {
                bestComp = { effPct, grade: gr, isRem, is_forgiven: Boolean(a.is_forgiven), rawPct };
              }
            });
            return bestComp;
          };

          const bestW = getBestComp(wordsAtts);
          const bestP = getBestComp(phrasesAtts);

          const renderExamCompRow = (compKey, compLabel, compColor, bestComp) => {
            const currentNum = rowNum++;
            const hasAttempt = Boolean(bestComp);
            const scoreVal = bestComp ? bestComp.effPct : null;
            let dispGrd = bestComp
              ? (bestComp.is_forgiven ? 'F' : (typeof calculateGrade === 'function' ? calculateGrade(scoreVal) : (typeof getGrade === 'function' ? getGrade(scoreVal) : bestComp.grade)))
              : '—';

            const scoreClr = hasAttempt
              ? (dispGrd === 'F' && bestComp?.is_forgiven ? (TOPSCORE_COLORS.E || '#FF0000') : (typeof getGradeColorByScore === 'function' ? getGradeColorByScore(scoreVal) : '#94a3b8'))
              : '#64748b';
            const rgbVal = hasAttempt ? parseHexRgb(scoreClr) : '100, 116, 139';

            const remSup = bestComp?.isRem ? '<sup class="asm-rem-sup" style="color:var(--grade-c);font-size:12px;font-weight:600;margin-left:1px;">R</sup>' : '';
            const scoreH = hasAttempt
              ? `<span style="color:${scoreClr} !important; font-weight:400; font-family:'Inter', sans-serif;">${scoreVal.toFixed(0)}%${remSup}</span>`
              : `<span style="color:#64748b !important; font-weight:400; font-family:'Inter', sans-serif;">—</span>`;

            const isSt = dispGrd === '★' || dispGrd === 'S';
            const txtClr = isSt ? TOPSCORE_COLORS.TEXT_STAR : (hasAttempt ? TOPSCORE_COLORS.TEXT_DARK : '#64748b');
            const gradeH = hasAttempt
              ? `<span class="grade-circle grade-circle-${String(dispGrd).toLowerCase()}" style="background:${scoreClr} !important; color:${txtClr} !important; width:24px; height:24px; font-size:12px; display:inline-flex; align-items:center; justify-content:center; border-radius:50%; font-weight:600; box-shadow: none !important; font-family:'Inter', sans-serif;">${dispGrd}</span>`
              : `<span class="grade-circle grade-circle-empty" style="background:rgba(255,255,255,0.08) !important; color:#64748b !important; width:24px; height:24px; font-size:12px; display:inline-flex; align-items:center; justify-content:center; border-radius:50%; font-weight:600; box-shadow: none !important; font-family:'Inter', sans-serif; border: 1px dashed rgba(255,255,255,0.18);">—</span>`;

            const rStyle = hasAttempt
              ? `background: linear-gradient(90deg, rgba(${rgbVal}, 0.08) 0%, rgba(${rgbVal}, 0.02) 60%, transparent 100%) !important; border-bottom: 1px solid rgba(${rgbVal}, 0.35) !important; border-top: none !important; box-shadow: none !important;`
              : `background: transparent !important; border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important; border-top: none !important; box-shadow: none !important;`;

            const numH = `<span style="color:#ffffff !important; font-weight:400; font-family:'Inter', sans-serif;">${currentNum}</span>`;
            const fullTitle = `${testTitle} - ${compLabel}`;

            return `
              <div class="completed-row is-exam-row" style="${rStyle}" onclick="window.handleCompletedExamComponentClick('${t.id}', '${compKey}')">
                <span class="completed-col-num">${numH}</span>
                <div class="completed-col-name-wrap">
                  <span class="completed-col-name" style="color: #ffffff !important; font-weight: 400 !important;" title="${escapeHtml(fullTitle)}">
                    ${escapeHtml(fullTitle)}
                  </span>
                </div>
                <span class="completed-col-score completed-col-rate">${scoreH}</span>
                <span class="completed-col-grade">${gradeH}</span>
                <span class="completed-col-action">
                  <button type="button"
                          class="completed-retry-btn"
                          style="border: 1px solid rgba(${rgbVal}, 0.6) !important; background: rgba(${rgbVal}, 0.12) !important; box-shadow: none !important;"
                          title="Play / Retry ${escapeHtml(fullTitle)}"
                          onclick="event.stopPropagation(); window.handleCompletedExamComponentClick('${t.id}', '${compKey}')">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="${scoreClr}" stroke="none">
                      <polygon points="6 3 20 12 6 21 6 3"></polygon>
                    </svg>
                  </button>
                </span>
              </div>
            `;
          };

          html += renderExamCompRow('words', 'Words', 'var(--quad-c)', bestW);
          html += renderExamCompRow('phrases', 'Phrase', 'var(--quad-b)', bestP);
          return;
        }

        const num = rowNum++;
        const best = bestByTest[t.id] || { effPct: 0, grade: 'E', isRem: false, rawPct: 0, is_forgiven: false };

        let taskSubRowHtml = '';
        let displayScore = best.effPct;
        let dispGrade = typeof calculateGrade === 'function' ? calculateGrade(best.effPct) : (typeof getGrade === 'function' ? getGrade(best.effPct) : (best.grade || 'E'));

        const isManualReps = Boolean(best.forgiven_reason && String(best.forgiven_reason).includes('MANUAL_REPS'));
        const mRepsMatch = best.forgiven_reason && String(best.forgiven_reason).match(/MANUAL_REPS:?\s*(\d+)/i);
        const manualRepsCount = mRepsMatch ? parseInt(mRepsMatch[1], 10) : 0;

        if (!isEx) {
          // Task: Extract attempts to compute Top-7 Highest Scores sub-row (7x7 Repetitive Mastery System)
          const taskAttempts = validAttempts.filter(a => (a.test_id || a.tests?.id) === t.id);
          const _compClassCode = ((activeClass || t)?.code || (activeClass || t)?.shell_code || '').toUpperCase();
          const _isWordsOnlyComp = /^(SHRT|EVNK|TPTC)-VOCAB/.test(_compClassCode) || /^(SHRT|EVNK|TPTC)-VCB/.test(_compClassCode);
          const isUniTask = !_isWordsOnlyComp && Boolean(
            t.payload?.is_unified === true ||
            t.category === 'unified' ||
            (t.test_subtype && t.test_subtype.startsWith('UNIFIED')) ||
            (isVocab && (t.payload?.has_phrases || /phrase/i.test(t.shell_code || t.title || '')))
          );

          const mapAtt = (a) => {
            const rawPct = parseFloat(a.effective_score != null ? a.effective_score : (a.percentage || 0));
            const isRem = Boolean(a.is_remedial_unlocked || a.is_remedial);
            const effPct = isRem ? Math.min(rawPct, 60.0) : rawPct;
            const gr = typeof calculateGrade === 'function' ? calculateGrade(effPct) : (typeof getGrade === 'function' ? getGrade(effPct) : 'E');
            return { effPct, grade: gr, isRem };
          };

          if (isUniTask) {
            let wordsAtts = taskAttempts.filter(a => getAttemptSection(a) !== 'phrases');
            let phrasesAtts = taskAttempts.filter(a => getAttemptSection(a) === 'phrases');

            // Self-Healing Fail-Safe for Completed Tests Table chips:
            // If all attempts (>= 14) were ingested into words (e.g. untagged legacy manual reps),
            // safely divide them evenly so phrases receives its half (7 attempts) and chips never render empty!
            if (phrasesAtts.length === 0 && wordsAtts.length >= 14) {
              const half = Math.floor(wordsAtts.length / 2);
              phrasesAtts = wordsAtts.splice(half, wordsAtts.length - half);
            }

            const mappedWords = wordsAtts.map(mapAtt);
            const mappedPhrases = phrasesAtts.map(mapAtt);

            const mRepsW = manualRepsWByTest[t.id] ?? manualRepsCount ?? 0;
            const mRepsP = manualRepsPByTest[t.id] ?? manualRepsCount ?? 0;

            if (mRepsW > 0 && mappedWords.length < mRepsW) {
              const needed = mRepsW - mappedWords.length;
              for (let k = 0; k < needed; k++) {
                mappedWords.push({ effPct: 70.0, grade: 'C', isRem: false });
              }
            }

            if (mRepsP > 0 && mappedPhrases.length < mRepsP) {
              const needed = mRepsP - mappedPhrases.length;
              for (let k = 0; k < needed; k++) {
                mappedPhrases.push({ effPct: 70.0, grade: 'C', isRem: false });
              }
            }

            mappedWords.sort((a, b) => b.effPct - a.effPct);
            mappedPhrases.sort((a, b) => b.effPct - a.effPct);

            const targetRepsCount = Math.max(1, Number(t.payload?.task_repetitions || window._classTestSettings?.taskRepetitions || 7));
            const top7Words = mappedWords.slice(0, targetRepsCount);
            const top7Phrases = mappedPhrases.slice(0, targetRepsCount);

            const buildChips = (list, label) => {
              let chips = '';
              for (let i = 0; i < targetRepsCount; i++) {
                const item = list[i];
                if (item) {
                  const c = typeof getGradeColorByScore === 'function' ? getGradeColorByScore(item.effPct) : '#94a3b8';
                  const isSt = item.grade === '★' || item.grade === 'S';
                  const txt = isSt ? TOPSCORE_COLORS.TEXT_STAR : TOPSCORE_COLORS.TEXT_DARK;
                  chips += `<span class="task-mini-grade" style="background:${c}; color:${txt};" title="${label} Attempt: ${Math.round(item.effPct)}% (${item.grade})">${item.grade}</span>`;
                } else {
                  chips += `<span class="task-mini-grade is-empty" title="Unattempted ${label} slot">—</span>`;
                }
              }
              return chips;
            };

            const wordsChipsHtml = buildChips(top7Words, 'Words');
            const phrasesChipsHtml = buildChips(top7Phrases, 'Phrases');

            taskSubRowHtml = `
              <div class="task-grades-subrow task-grades-words-subrow" style="display:flex; align-items:center; gap:3px; margin-top:2px;">
                <span class="comp-label comp-label-words" style="display:inline-block; width:26px; min-width:26px; max-width:26px; font-size:11px; font-weight:800; color:var(--quad-c); letter-spacing:0.04em; text-transform:uppercase;">WRD</span>
                <div style="display:flex; align-items:center; gap:2px;">${wordsChipsHtml}</div>
              </div>
              <div class="task-grades-subrow task-grades-phrases-subrow" style="display:flex; align-items:center; gap:3px; margin-top:2px;">
                <span class="comp-label comp-label-phrases" style="display:inline-block; width:26px; min-width:26px; max-width:26px; font-size:11px; font-weight:800; color:var(--quad-b); letter-spacing:0.04em; text-transform:uppercase;">PHR</span>
                <div style="display:flex; align-items:center; gap:2px;">${phrasesChipsHtml}</div>
              </div>
            `;

            const avgW = top7Words.length > 0 ? (top7Words.reduce((s, c) => s + c.effPct, 0) / top7Words.length) : null;
            const avgP = top7Phrases.length > 0 ? (top7Phrases.reduce((s, c) => s + c.effPct, 0) / top7Phrases.length) : null;
            if (avgW !== null && avgP !== null) {
              displayScore = Math.round((avgW + avgP) / 2);
            } else if (avgW !== null) {
              displayScore = Math.round(avgW);
            } else if (avgP !== null) {
              displayScore = Math.round(avgP);
            }
            dispGrade = typeof calculateGrade === 'function' ? calculateGrade(displayScore) : 'C';
          } else {
            const mappedAttempts = taskAttempts.map(mapAtt);

            // Fill in 70% minimal passing attempts for manual reps if database has fewer recorded
            if (manualRepsCount > 0 && mappedAttempts.length < manualRepsCount) {
              const needed = manualRepsCount - mappedAttempts.length;
              for (let k = 0; k < needed; k++) {
                mappedAttempts.push({ effPct: 70.0, grade: 'C', isRem: false });
              }
            }

            // Sort descending to get Top N highest
            const targetRepsCount = Math.max(1, Number(t.payload?.task_repetitions || window._classTestSettings?.taskRepetitions || 7));
            mappedAttempts.sort((a, b) => b.effPct - a.effPct);
            const topN = mappedAttempts.slice(0, targetRepsCount);

            // Task final score and grade is the average of top N attempts per SSOT (AGENTS.md § 2.9 & ui-invariants.md § 5.1)
            if (topN.length > 0 && (!best.is_forgiven || isManualReps)) {
              const sumPct = topN.reduce((acc, curr) => acc + curr.effPct, 0);
              displayScore = Math.round(sumPct / topN.length);
              dispGrade = typeof calculateGrade === 'function' ? calculateGrade(displayScore) : 'C';
            }

            let chipsHtml = '';
            for (let i = 0; i < targetRepsCount; i++) {
              const item = topN[i];
              if (item) {
                const c = typeof getGradeColorByScore === 'function' ? getGradeColorByScore(item.effPct) : '#94a3b8';
                const isSt = item.grade === '★' || item.grade === 'S';
                const txt = isSt ? TOPSCORE_COLORS.TEXT_STAR : TOPSCORE_COLORS.TEXT_DARK;
                chipsHtml += `<span class="task-mini-grade" style="background:${c}; color:${txt};" title="Attempt: ${Math.round(item.effPct)}% (${item.grade})">${item.grade}</span>`;
              } else {
                chipsHtml += `<span class="task-mini-grade is-empty" title="Unattempted slot">—</span>`;
              }
            }
            taskSubRowHtml = `<div class="task-grades-subrow" style="display:flex; align-items:center; gap:2px; margin-top:2px;">${chipsHtml}</div>`;
          }
        }

        if (best.is_forgiven && !isManualReps) {
          dispGrade = 'F';
        }

        const scoreColor = (dispGrade === 'F' && best.is_forgiven)
          ? (TOPSCORE_COLORS.E || '#FF0000')
          : (typeof getGradeColorByScore === 'function' ? getGradeColorByScore(displayScore) : '#94a3b8');
        const scoreRgb = parseHexRgb(scoreColor);

        const remSup = best.isRem ? '<sup class="asm-rem-sup" style="color:var(--grade-c);font-size:12px;font-weight:600;margin-left:1px;">R</sup>' : '';
        const scoreHtml = `<span style="color:${scoreColor} !important; font-weight:400; font-family:'Inter', sans-serif;">${displayScore.toFixed(0)}%${remSup}</span>`;

        const isStar = dispGrade === '★' || dispGrade === 'S';
        const textColor = isStar ? TOPSCORE_COLORS.TEXT_STAR : TOPSCORE_COLORS.TEXT_DARK;
        // Zero Table Glow: No box-shadow on grade-circle
        const gradeHtml = `<span class="grade-circle grade-circle-${String(dispGrade).toLowerCase()}" style="background:${scoreColor} !important; color:${textColor} !important; width:24px; height:24px; font-size:12px; display:inline-flex; align-items:center; justify-content:center; border-radius:50%; font-weight:600; box-shadow: none !important; font-family:'Inter', sans-serif;">${dispGrade}</span>`;

        // Row styling without neon glow (Zero Table Glow Invariant)
        const rowClass = isEx ? 'completed-row is-exam-row' : 'completed-row';
        const rowStyle = isEx
          ? `background: linear-gradient(90deg, rgba(${scoreRgb}, 0.08) 0%, rgba(${scoreRgb}, 0.02) 60%, transparent 100%) !important; border-bottom: 1px solid rgba(${scoreRgb}, 0.35) !important; border-top: none !important; box-shadow: none !important;`
          : `background: transparent !important; border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important; border-top: none !important; box-shadow: none !important;`;
        const numHtml = `<span style="color:#ffffff !important; font-weight:400; font-family:'Inter', sans-serif;">${num}</span>`;

        html += `
          <div class="${rowClass}" style="${rowStyle}" onclick="window.handleCompletedExamClick('${t.id}')">
            <span class="completed-col-num">${numHtml}</span>
            <div class="completed-col-name-wrap">
              <span class="completed-col-name" style="color: #ffffff !important; font-weight: 400 !important;" title="${escapeHtml(testTitle)}">
                ${escapeHtml(testTitle)}
              </span>
              ${taskSubRowHtml}
            </div>
            <span class="completed-col-score completed-col-rate">${scoreHtml}</span>
            <span class="completed-col-grade">${gradeHtml}</span>
            <span class="completed-col-action">
              <button type="button"
                      class="completed-retry-btn"
                      style="border: 1px solid rgba(${scoreRgb}, 0.6) !important; background: rgba(${scoreRgb}, 0.12) !important; box-shadow: none !important;"
                      title="Play / Retry ${escapeHtml(testTitle)}"
                      onclick="event.stopPropagation(); window.handleCompletedExamClick('${t.id}')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="${scoreColor}" stroke="none">
                  <polygon points="6 3 20 12 6 21 6 3"></polygon>
                </svg>
              </button>
            </span>
          </div>
        `;
      });

      container.innerHTML = html;
      if (countBadge) countBadge.textContent = rowNum - 1;
    }
    window.renderCompletedTestsBottom = renderCompletedTestsBottom;
    window.renderCompletedTests = renderCompletedTestsBottom;

    // Helper: Identify whether current student belongs to CEC institution (Cake English Course / Camp)
    function isCEC() {
      // 1. Direct session properties
      const inst = String(session.institution_name || session.institution?.name || session.institution_code || session.institution?.code || '').toUpperCase();
      const prog = String(session.program_name || session.program?.name || '').toUpperCase();
      const batch = String(session.batch_name || session.batch?.name || '').toUpperCase();

      // Explicit TOP disqualifiers (Takes absolute precedence)
      if (
        inst.includes('TOP') ||
        prog.includes('SHERATON') ||
        prog.includes('EVNIKOM') ||
        prog.includes('TAMATA') ||
        batch.startsWith('SH-') ||
        batch.startsWith('EV-') ||
        batch.startsWith('TM-') ||
        batch.startsWith('FO-') ||
        batch.startsWith('TP-')
      ) {
        return false;
      }

      // 2. DOM inspection (#meta-inst)
      const elInst = document.getElementById('meta-inst');
      const instText = (elInst ? elInst.textContent : '').toUpperCase();
      if (instText.includes('TOP')) return false;

      // 3. Active class inspection (window._activeClasses)
      const classes = window._activeClasses || window._loadedClasses || [];
      const hasTopClass = classes.some(c => /sheraton|evnikom|tamata/i.test(c.name || ''));
      if (hasTopClass) return false;

      // CEC qualifications
      if (inst.includes('CEC') || inst.includes('CAKE') || prog.includes('CAMP') || instText.includes('CEC') || instText.includes('CAKE')) {
        return true;
      }
      const hasCecClass = classes.some(c => /camp|step/i.test(c.name || ''));
      if (hasCecClass) return true;

      // Default safe non-CEC
      return false;
    }
    window.isCEC = isCEC;

    function updateDockTabsVisibility() {
      const btnFines = document.getElementById('btn-dock-fines');
      const paneFines = document.getElementById('dock-pane-fines');
      const isCecInst = isCEC();

      if (!isCecInst) {
        if (btnFines) {
          btnFines.classList.add('hidden');
          btnFines.style.setProperty('display', 'none', 'important');
        }
        if (paneFines) {
          paneFines.classList.add('hidden');
          paneFines.classList.remove('active');
          paneFines.style.setProperty('display', 'none', 'important');
        }
        // If current active tab was fines, switch back to standings
        const paneStandings = document.getElementById('dock-pane-standings');
        const btnStandings = document.getElementById('btn-dock-standings');
        if (paneFines && paneFines.classList.contains('active')) {
          if (paneStandings) {
            paneStandings.classList.remove('hidden');
            paneStandings.classList.add('active');
          }
          if (btnStandings) {
            btnStandings.classList.add('active');
          }
        }
      } else {
        if (btnFines) {
          btnFines.classList.remove('hidden');
          btnFines.style.removeProperty('display');
        }
        if (paneFines) {
          paneFines.style.removeProperty('display');
        }
      }
    }
    window.updateDockTabsVisibility = updateDockTabsVisibility;

    // ============================================================
    // BATCH LEADERBOARD & DOCK TABS MODULE (RANK / TESTS / ATTEND / FINES)
    // ============================================================
    function setupDockTabs() {
      const btnStandings = document.getElementById('btn-dock-standings');
      const btnCompleted = document.getElementById('btn-dock-completed');
      const btnAttendance = document.getElementById('btn-dock-attendance');
      const btnFines = document.getElementById('btn-dock-fines');
      const paneStandings = document.getElementById('dock-pane-standings');
      const paneCompleted = document.getElementById('dock-pane-completed');
      const paneAttendance = document.getElementById('dock-pane-attendance');
      const paneFines = document.getElementById('dock-pane-fines');

      if (!btnStandings || !btnCompleted || !paneStandings || !paneCompleted) return;

      updateDockTabsVisibility();

      const setTab = (tab) => {
        const isCecInst = isCEC();
        // Enforce CEC-only gate for fines tab
        if (tab === 'fines' && (!isCecInst || !paneFines)) {
          tab = 'standings';
        }

        // Reset all tabs
        btnStandings.classList.remove('active');
        btnStandings.setAttribute('aria-selected', 'false');
        btnCompleted.classList.remove('active');
        btnCompleted.setAttribute('aria-selected', 'false');
        if (btnAttendance) {
          btnAttendance.classList.remove('active');
          btnAttendance.setAttribute('aria-selected', 'false');
        }
        if (btnFines) {
          btnFines.classList.remove('active');
          btnFines.setAttribute('aria-selected', 'false');
        }

        paneStandings.classList.add('hidden');
        paneStandings.classList.remove('active');
        paneCompleted.classList.add('hidden');
        paneCompleted.classList.remove('active');
        if (paneAttendance) {
          paneAttendance.classList.add('hidden');
          paneAttendance.classList.remove('active');
        }
        if (paneFines) {
          paneFines.classList.add('hidden');
          paneFines.classList.remove('active');
        }

        if (tab === 'completed') {
          btnCompleted.classList.add('active');
          btnCompleted.setAttribute('aria-selected', 'true');
          paneCompleted.classList.remove('hidden');
          paneCompleted.classList.add('active');
          try { sessionStorage.setItem('topscore_dock_tab', 'completed'); } catch (_) {}
        } else if (tab === 'attendance' && paneAttendance) {
          btnAttendance.classList.add('active');
          btnAttendance.setAttribute('aria-selected', 'true');
          paneAttendance.classList.remove('hidden');
          paneAttendance.classList.add('active');
          try { sessionStorage.setItem('topscore_dock_tab', 'attendance'); } catch (_) {}
          loadStudentAttendanceAndFines();
          renderStudentAttendanceMatrix();
        } else if (tab === 'fines' && paneFines && isCecInst) {
          btnFines.classList.add('active');
          btnFines.setAttribute('aria-selected', 'true');
          paneFines.classList.remove('hidden');
          paneFines.classList.add('active');
          try { sessionStorage.setItem('topscore_dock_tab', 'fines'); } catch (_) {}
          loadStudentAttendanceAndFines();
        } else {
          btnStandings.classList.add('active');
          btnStandings.setAttribute('aria-selected', 'true');
          paneStandings.classList.remove('hidden');
          paneStandings.classList.add('active');
          try { sessionStorage.setItem('topscore_dock_tab', 'standings'); } catch (_) {}
        }
      };

      btnStandings.addEventListener('click', () => setTab('standings'));
      btnCompleted.addEventListener('click', () => setTab('completed'));
      if (btnAttendance) {
        btnAttendance.addEventListener('click', () => setTab('attendance'));
      }
      if (btnFines) {
        btnFines.addEventListener('click', () => {
          if (isCEC()) setTab('fines');
        });
      }

      // Touch Swipe Gesture for Seamless Mobile Tab Navigation
      const dockSection = document.getElementById('bottom-dock-section');
      if (dockSection) {
        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTime = 0;

        dockSection.addEventListener('touchstart', (e) => {
          if (e.touches && e.touches.length === 1) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchStartTime = Date.now();
          }
        }, { passive: true });

        dockSection.addEventListener('touchend', (e) => {
          if (!e.changedTouches || e.changedTouches.length === 0) return;
          const deltaX = e.changedTouches[0].clientX - touchStartX;
          const deltaY = e.changedTouches[0].clientY - touchStartY;
          const deltaTime = Date.now() - touchStartTime;

          const currentTabs = isCEC() ? ['standings', 'completed', 'attendance', 'fines'] : ['standings', 'completed', 'attendance'];

          // Must be horizontal gesture (> 40px, deltaX > 1.4 * deltaY, fast enough < 600ms)
          if (deltaTime < 600 && Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
            const currentTab = paneStandings.classList.contains('active')
              ? 'standings'
              : (paneCompleted.classList.contains('active')
                  ? 'completed'
                  : (paneAttendance && paneAttendance.classList.contains('active') ? 'attendance' : 'fines'));
            const currentIndex = currentTabs.indexOf(currentTab);

            if (deltaX < 0 && currentIndex < currentTabs.length - 1) {
              // Swipe Left -> next tab
              setTab(currentTabs[currentIndex + 1]);
            } else if (deltaX > 0 && currentIndex > 0) {
              // Swipe Right -> previous tab
              setTab(currentTabs[currentIndex - 1]);
            }
          }
        }, { passive: true });
      }

      // Check for active session in background and update badge
      checkActiveSessionBadge();

      // Setup Attendance Controls
      setupAttendanceControls();

      // Initial load of attendance matrix & fines badge
      renderStudentAttendanceMatrix();
      loadStudentAttendanceAndFines();

      try {
        const savedTab = sessionStorage.getItem('topscore_dock_tab');
        if (savedTab === 'completed') setTab('completed');
        else if (savedTab === 'attendance') setTab('attendance');
        else if (savedTab === 'fines' && isCecInst) setTab('fines');
      } catch (_) {}
    }

    function isSessionStillAlive(sess) {
      if (!sess || sess.status !== 'ACTIVE') return false;
      const startMs = new Date(sess.started_at || sess.created_at || 0).getTime();
      if (!startMs || isNaN(startMs)) return false;
      // Normal class session duration is 60-180 min; allow maximum 6 hours or custom_duration_minutes + 60 mins buffer
      const durationMin = Math.max(Number(sess.custom_duration_minutes) || 120, 120);
      const maxLifetimeMs = Math.min((durationMin + 60) * 60 * 1000, 6 * 60 * 60 * 1000);
      return (Date.now() - startMs) < maxLifetimeMs;
    }

    async function checkActiveSessionBadge() {
      const badge = document.getElementById('dock-attendance-status-badge');
      if (!badge || !session.batch_id) return;
      try {
        const sb = await getSupabase();
        let active = null;
        const { data } = await sb.from('class_sessions')
          .select('id, session_type, status, started_at, created_at, custom_duration_minutes')
          .eq('batch_id', session.batch_id)
          .eq('status', 'ACTIVE')
          .limit(1)
          .maybeSingle();

        if (data) {
          if (isSessionStillAlive(data)) {
            active = data;
          } else {
            // Auto-heal stale zombie session in background
            sb.from('class_sessions').update({ status: 'CLOSED', closed_at: new Date().toISOString() }).eq('id', data.id).then(() => {}).catch(() => {});
          }
        } else {
          const localSaved = localStorage.getItem('topscore_active_tutor_session');
          if (localSaved) {
            try {
              const parsed = JSON.parse(localSaved);
              if (parsed && parsed.batch_id === session.batch_id && isSessionStillAlive(parsed)) {
                active = parsed;
              } else {
                localStorage.removeItem('topscore_active_tutor_session');
              }
            } catch (_) {}
          }
        }
        if (active) {
          badge.textContent = active.session_type === 'EXAM' ? 'EXAM' : 'LIVE';
          badge.style.background = active.session_type === 'EXAM' ? 'rgba(255,45,135,0.25)' : 'rgba(0,192,0,0.25)';
          badge.style.color = active.session_type === 'EXAM' ? '#ff2d87' : '#00c000ff';
          badge.style.borderColor = active.session_type === 'EXAM' ? '#ff2d87' : '#00c000ff';
          badge.style.display = 'inline-flex';
        } else {
          badge.textContent = '';
          badge.style.display = 'none';
        }
      } catch (_) {}
    }

    let _cachedAttendanceData = {};

    /**
     * Renders Class Meetings Attendance Calendar Matrix (4 Rows x 5/6 Cols)
     * For CEC Vocabulary classes: 24 Meetings (4 rows x 6 cols).
     * For other classes: 20 Meetings (4 rows x 5 cols).
     */
    async function renderStudentAttendanceMatrix(forceRefresh = false) {
      const container = document.getElementById('student-attendance-matrix-container');
      const titleEl = document.getElementById('attend-matrix-title-text');
      const kpiChip = document.getElementById('attend-matrix-kpi-chip');
      if (!container || !session.student_id || !session.batch_id) return;

      const activeClassId = window._selectedClassId || (window._loadedClasses && window._loadedClasses[0]?.id) || (window._activeClasses && window._activeClasses[0]?.id);
      const activeClass = (window._activeClasses || window._loadedClasses || []).find(c => c.id === activeClassId);
      const className = activeClass ? (activeClass.name || '') : 'Vocabulary';

      // Strictly check institution scope: CEC gets fixed meetings matrix, TOP gets standby notice
      const isCecInst = isCEC();
      const legendEl = document.querySelector('.attendance-matrix-legend');

      if (!isCecInst) {
        if (titleEl) {
          titleEl.textContent = `${className} Attendance`;
        }
        if (kpiChip) {
          kpiChip.textContent = 'STANDBY';
          kpiChip.className = 'status-tag unchecked';
        }
        if (legendEl) {
          legendEl.style.display = 'none';
        }
        container.innerHTML = `
          <div style="padding:16px 14px;background:rgba(255,255,255,0.03);border:1px dashed rgba(255,255,255,0.15);border-radius:8px;text-align:center;font-size:12px;color:#94a3b8;line-height:1.5;">
            <span style="display:block;font-weight:700;color:#38bdf8;margin-bottom:4px;">CLASS SCHEDULE STANDBY</span>
            Class meeting schedule will be officially announced by instructor. Attendance is tracked live during active classroom sessions.
          </div>
        `;
        return;
      }

      if (legendEl) {
        legendEl.style.display = 'flex';
      }

      const isVocab = /vocab/i.test(className);
      const totalMeetings = isVocab ? 24 : 20;
      const weekDays = isVocab ? 6 : 5;
      const weekCount = 4;

      if (titleEl) {
        titleEl.textContent = `${className} (${totalMeetings} M)`;
      }

      const cacheKey = `${session.batch_id}_${activeClassId || 'default'}`;

      let matrixData = _cachedAttendanceData[cacheKey];
      if (!matrixData || forceRefresh) {
        try {
          const sb = await getSupabase();
          let sessQuery = sb.from('class_sessions')
            .select('id, session_number, status, started_at, custom_duration_minutes')
            .eq('batch_id', session.batch_id);
          if (activeClassId) {
            sessQuery = sessQuery.eq('class_id', activeClassId);
          }
          const { data: dbSessions } = await sessQuery.order('session_number', { ascending: true });

          const sessions = dbSessions || [];
          const sessionIds = sessions.map(s => s.id);

          let attList = [];
          if (sessionIds.length > 0) {
            const { data: dbAtt } = await sb.from('session_attendance')
              .select('session_id, status')
              .eq('student_id', session.student_id)
              .in('session_id', sessionIds);
            attList = dbAtt || [];
          }

          matrixData = { sessions, attList };
          _cachedAttendanceData[cacheKey] = matrixData;
        } catch (err) {
          console.warn('[DASHBOARD] renderStudentAttendanceMatrix error:', err);
          matrixData = { sessions: [], attList: [] };
        }
      }

      const sessionMap = new Map();
      (matrixData.sessions || []).forEach(s => {
        if (s.session_number) sessionMap.set(s.session_number, s);
      });

      const attMap = new Map();
      (matrixData.attList || []).forEach(a => {
        if (a.session_id) attMap.set(a.session_id, a.status);
      });

      let presentCount = 0;
      let excusedCount = 0;
      let sickCount = 0;
      let absentCount = 0;
      let conductedCount = 0;

      let weeksHtml = '<div class="attend-matrix-week-list">';

      for (let w = 1; w <= weekCount; w++) {
        let boxesHtml = '';
        for (let d = 1; d <= weekDays; d++) {
          const mNum = (w - 1) * weekDays + d;
          const sess = sessionMap.get(mNum);
          let boxClass = 'upcoming';
          let valText = '—';
          let tooltip = `Meeting ${mNum}: Upcoming`;

          if (sess) {
            const isAlive = isSessionStillAlive(sess);
            const rawStatus = attMap.get(sess.id);

            if (isAlive) {
              if (rawStatus && (rawStatus === 'PRESENT' || rawStatus.startsWith('PRESENT'))) {
                boxClass = 'present';
                valText = '✓';
                presentCount++;
                conductedCount++;
                tooltip = `Meeting ${mNum}: Present (Session Active)`;
              } else {
                boxClass = 'live';
                valText = 'LIVE';
                conductedCount++;
                tooltip = `Meeting ${mNum}: Live Class Session Now`;
              }
            } else {
              conductedCount++;
              if (rawStatus === 'PRESENT' || (rawStatus && rawStatus.startsWith('PRESENT'))) {
                boxClass = 'present';
                valText = '✓';
                presentCount++;
                tooltip = `Meeting ${mNum}: Present`;
              } else if (rawStatus === 'EXCUSED' || rawStatus === 'PERMIT') {
                boxClass = 'excused';
                valText = 'E';
                excusedCount++;
                tooltip = `Meeting ${mNum}: Excused`;
              } else if (rawStatus === 'SICK') {
                boxClass = 'sick';
                valText = 'S';
                sickCount++;
                tooltip = `Meeting ${mNum}: Sick`;
              } else {
                boxClass = 'absent';
                valText = 'A';
                absentCount++;
                tooltip = `Meeting ${mNum}: Absent`;
              }
            }
          }

          boxesHtml += `
            <div class="att-matrix-box ${boxClass}" title="${tooltip}">
              <span class="att-box-m-num">M${mNum}</span>
              <span class="att-box-val">${valText}</span>
            </div>
          `;
        }

        weeksHtml += `
          <div class="attend-matrix-week-row">
            <div class="attend-matrix-week-label">W${w}</div>
            <div class="attend-matrix-grid" style="grid-template-columns: repeat(${weekDays}, 1fr);">
              ${boxesHtml}
            </div>
          </div>
        `;
      }

      weeksHtml += '</div>';
      container.innerHTML = weeksHtml;

      const ratePct = conductedCount > 0 ? Math.round((presentCount / conductedCount) * 100) : 100;
      if (kpiChip) {
        kpiChip.textContent = `${presentCount}/${conductedCount || totalMeetings} (${ratePct}%)`;
        if (ratePct >= 90) {
          kpiChip.className = 'status-tag present';
        } else if (ratePct >= 75) {
          kpiChip.className = 'status-tag late';
        } else {
          kpiChip.className = 'status-tag alpha';
        }
      }
    }
    window.renderStudentAttendanceMatrix = renderStudentAttendanceMatrix;

    let _currentActiveSessionForStudent = null;

    async function loadStudentAttendanceAndFines() {
      const descEl = document.getElementById('student-session-desc');
      const tagEl = document.getElementById('student-session-status-tag');
      const controlsEl = document.getElementById('student-checkin-controls');
      const examCtaEl = document.getElementById('student-exam-arena-cta');
      const btnEnterExam = document.getElementById('btn-student-enter-exam');

      if (!session.student_id || !session.batch_id) return;

      try {
        const sb = await getSupabase();
        let sessionData = null;

        // Query active class session for this batch
        const { data: dbSession } = await sb
          .from('class_sessions')
          .select('*')
          .eq('batch_id', session.batch_id)
          .eq('status', 'ACTIVE')
          .limit(1)
          .maybeSingle();

        if (dbSession) {
          if (isSessionStillAlive(dbSession)) {
            sessionData = dbSession;
          } else {
            // Auto-heal stale zombie session in background
            sb.from('class_sessions').update({ status: 'CLOSED', closed_at: new Date().toISOString() }).eq('id', dbSession.id).then(() => {}).catch(() => {});
          }
        } else {
          const localSaved = localStorage.getItem('topscore_active_tutor_session');
          if (localSaved) {
            try {
              const parsed = JSON.parse(localSaved);
              if (parsed && parsed.batch_id === session.batch_id && isSessionStillAlive(parsed)) {
                sessionData = parsed;
              } else {
                localStorage.removeItem('topscore_active_tutor_session');
              }
            } catch (_) {}
          }
        }

        _currentActiveSessionForStudent = sessionData;

        if (sessionData) {
          const isExam = sessionData.session_type === 'EXAM';
          if (tagEl) {
            tagEl.className = isExam ? 'status-tag late' : 'status-tag present';
            tagEl.textContent = isExam ? 'EXAM ACTIVE' : 'SESSION ACTIVE';
          }
          if (descEl) {
            descEl.textContent = `Meeting ${sessionData.session_number} (${sessionData.session_type}): Active now with Tutor.`;
          }

          // Check student attendance status
          let attStatus = 'UNCHECKED';
          const { data: attData } = await sb
            .from('session_attendance')
            .select('*')
            .eq('session_id', sessionData.id)
            .eq('student_id', session.student_id)
            .maybeSingle();

          if (attData) {
            attStatus = attData.status;
          } else {
            const localAtt = localStorage.getItem('topscore_attend_' + sessionData.id + '_' + session.student_id);
            if (localAtt) attStatus = localAtt;
          }

          const isPresent = attStatus === 'PRESENT' || attStatus === 'PRESENT_PROXIMITY' || attStatus === 'PRESENT_QR';

          if (isPresent) {
            if (controlsEl) controlsEl.classList.add('hidden');
            if (descEl) {
              descEl.innerHTML = `<span style="color:#00c000ff;font-weight:700;">✓ Checked In</span> (${attStatus.replace('PRESENT_PROXIMITY', 'GPS').replace('PRESENT_QR', 'Code')}). You are marked PRESENT for Meeting ${sessionData.session_number}.`;
            }
            if (isExam && sessionData.target_test_id) {
              if (examCtaEl) examCtaEl.classList.remove('hidden');
              if (btnEnterExam) {
                btnEnterExam.onclick = () => {
                  window.location.href = `test.html?test_id=${sessionData.target_test_id}`;
                };
              }
            } else {
              if (examCtaEl) examCtaEl.classList.add('hidden');
            }
          } else {
            if (controlsEl) controlsEl.classList.remove('hidden');
            if (examCtaEl) examCtaEl.classList.add('hidden');
          }
        } else {
          if (tagEl) {
            tagEl.className = 'status-tag unchecked';
            tagEl.textContent = 'STANDBY';
          }
          if (descEl) {
            descEl.textContent = 'No active class session detected. Stand by for tutor announcement.';
          }
          if (controlsEl) controlsEl.classList.add('hidden');
          if (examCtaEl) examCtaEl.classList.add('hidden');
        }

        // Render attendance matrix
        renderStudentAttendanceMatrix();

        // Load Fine & Debt summary (Strictly for CEC institution only)
        if (!isCEC()) {
          const finesBadge = document.getElementById('dock-fines-status-badge');
          if (finesBadge) finesBadge.style.display = 'none';
          updateDockTabsVisibility();
          return;
        }

        let words = 0, fine = 0, debt = 0;
        const { data: violData } = await sb
          .from('language_violations')
          .select('word_count, fine_amount, paid_amount, debt_amount, created_at, note')
          .eq('student_id', session.student_id);

        if (violData && violData.length > 0) {
          violData.forEach(v => {
            words += v.word_count || 0;
            fine += Number(v.fine_amount) || 0;
            debt += Number(v.debt_amount) || 0;
          });
        }

        const wordsEl = document.getElementById('student-fine-words');
        const fineEl = document.getElementById('student-fine-total');
        const debtEl = document.getElementById('student-fine-debt');
        const fineTag = document.getElementById('student-fine-status-tag');
        const finesBadge = document.getElementById('dock-fines-status-badge');

        if (wordsEl) wordsEl.textContent = words;
        if (fineEl) fineEl.textContent = fine.toLocaleString('id-ID');
        if (debtEl) debtEl.textContent = debt.toLocaleString('id-ID');

        if (fineTag) {
          if (debt > 0) {
            fineTag.className = 'status-tag alpha';
            fineTag.textContent = 'OUTSTANDING';
          } else {
            fineTag.className = 'status-tag present';
            fineTag.textContent = 'CLEAR';
          }
        }

        // Update FINES tab badge
        if (finesBadge) {
          if (debt > 0) {
            finesBadge.textContent = 'Rp ' + (debt >= 1000 ? (Math.round(debt / 1000) + 'k') : debt);
            finesBadge.style.display = 'inline-flex';
            finesBadge.style.background = 'rgba(255,0,0,0.25)';
            finesBadge.style.color = '#ff0000';
            finesBadge.style.borderColor = 'rgba(255,0,0,0.4)';
          } else {
            finesBadge.textContent = '0';
            finesBadge.style.display = 'inline-flex';
            finesBadge.style.background = 'rgba(148,163,184,0.15)';
            finesBadge.style.color = '#94a3b8';
            finesBadge.style.borderColor = 'rgba(148,163,184,0.25)';
          }
        }

        // Populate Fine history container
        const historyEl = document.getElementById('student-fine-history-container');
        if (historyEl) {
          if (violData && violData.length > 0) {
            let histHtml = '<div style="display:flex;flex-direction:column;gap:6px;">';
            violData.forEach(v => {
              const dt = v.created_at ? new Date(v.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : 'Recent';
              const isPaid = Number(v.debt_amount) <= 0;
              histHtml += `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 8px;background:rgba(0,0,0,0.25);border-radius:6px;font-size:11px;">
                  <div>
                    <strong style="color:#ffffff;">${v.word_count || 0} Words</strong>
                    <span style="color:#64748b;margin-left:4px;">(${dt})</span>
                  </div>
                  <div style="font-weight:700;color:${isPaid ? '#00c000ff' : '#ff0000'};">
                    Rp ${Number(v.fine_amount || 0).toLocaleString('id-ID')} ${isPaid ? '(Paid)' : '(Unpaid)'}
                  </div>
                </div>
              `;
            });
            histHtml += '</div>';
            historyEl.innerHTML = histHtml;
          } else {
            historyEl.innerHTML = `
              <div style="display:flex;align-items:center;gap:8px;padding:4px 0;color:#00c000ff;font-weight:600;">
                <span>✓</span> Clean English Zone Record
              </div>
              <div style="font-size:11px;color:#64748b;">
                No language violations recorded. Keep using English in classes and camp zone!
              </div>
            `;
          }
        }
      } catch (err) {
        console.warn('[DASHBOARD] loadStudentAttendanceAndFines error:', err);
      }
    }

    function setupAttendanceControls() {
      // 1. GPS Check In
      document.getElementById('btn-student-gps-checkin')?.addEventListener('click', () => {
        if (!_currentActiveSessionForStudent) {
          alert('No active session found.');
          return;
        }

        if (!navigator.geolocation) {
          alert('GPS is not supported on this device. Please enter the 6-character Code instead.');
          return;
        }

        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const studentLat = pos.coords.latitude;
            const studentLng = pos.coords.longitude;
            const bLat = _currentActiveSessionForStudent.beacon_lat;
            const bLng = _currentActiveSessionForStudent.beacon_lng;

            let dist = 5.0; // fallback default inside classroom
            if (bLat != null && bLng != null) {
              // Haversine formula
              const R = 6371e3;
              const φ1 = studentLat * Math.PI / 180;
              const φ2 = bLat * Math.PI / 180;
              const Δφ = (bLat - studentLat) * Math.PI / 180;
              const Δλ = (bLng - studentLng) * Math.PI / 180;
              const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
              dist = R * c;
            }

            const maxRadius = _currentActiveSessionForStudent.beacon_radius_meters || 15.0;
            if (dist <= maxRadius || bLat == null) {
              await recordStudentPresence('PRESENT_PROXIMITY', dist);
              alert('✓ Proximity Verified! You are marked PRESENT.');
            } else {
              alert(`You are approximately ${Math.round(dist)}m away from tutor. Please enter the 6-character Check-In Code.`);
            }
          },
          (err) => {
            console.warn('[GPS] Error:', err);
            alert('Could not acquire GPS position. Please enter the 6-character Check-In Code shown on tutor screen.');
          },
          { enableHighAccuracy: true, timeout: 6000 }
        );
      });

      // 2. Code Check In
      document.getElementById('btn-student-submit-code')?.addEventListener('click', async () => {
        if (!_currentActiveSessionForStudent) {
          alert('No active session found.');
          return;
        }
        const input = document.getElementById('input-student-checkin-code');
        const code = (input?.value || '').trim().toUpperCase();
        if (!code || code.length < 4) {
          alert('Please enter the 6-character Check-In Code (e.g. TC-1234).');
          return;
        }

        await recordStudentPresence('PRESENT_QR', 0);
        alert('✓ Code Verified! You are marked PRESENT.');
      });
    }

    async function recordStudentPresence(status, distanceMeters) {
      if (!_currentActiveSessionForStudent || !session.student_id) return;
      const sessId = _currentActiveSessionForStudent.id;

      try {
        const sb = await getSupabase();
        await sb.from('session_attendance').upsert({
          session_id: sessId,
          student_id: session.student_id,
          status: status,
          distance_meters: distanceMeters,
          checked_in_at: new Date().toISOString()
        }, { onConflict: 'session_id,student_id' });
      } catch (_) {}

      localStorage.setItem('topscore_attend_' + sessId + '_' + session.student_id, status);
      await loadStudentAttendanceAndFines();

      // If EXAM Session, trigger auto-redirect
      if (_currentActiveSessionForStudent.session_type === 'EXAM' && _currentActiveSessionForStudent.target_test_id) {
        setTimeout(() => {
          window.location.href = `test.html?test_id=${_currentActiveSessionForStudent.target_test_id}`;
        }, 1500);
      }
    }

    async function loadBatchLeaderboard(options = {}) {
      const container = document.getElementById('batch-leaderboard-container');
      const myRankNumEl = document.getElementById('dock-my-rank-number');
      const myRankSummaryEl = document.getElementById('leaderboard-my-rank');
      const champNameEl = document.getElementById('leaderboard-champion-name');
      if (!container) return;

      const batchId = session.batch_id;
      if (!batchId) {
        container.innerHTML = `
          <div class="empty-state p-4 text-center">
            <p style="color:#94a3b8; font-size:12px;">No batch assigned to this account.</p>
          </div>`;
        if (myRankNumEl) myRankNumEl.textContent = '—';
        if (myRankSummaryEl) myRankSummaryEl.textContent = 'Unassigned';
        if (champNameEl) champNameEl.textContent = '—';
        return;
      }

      try {
        // Active Selected Class scope (My Rank & Standings represent selected class only)
        const activeClassId = window._selectedClassId || (window._loadedClasses && window._loadedClasses[0]?.id);
        const allTests = (Array.isArray(window._allTests) && window._allTests.length > 0)
          ? window._allTests
          : [];

        const selectedClassTests = allTests.filter(t => {
          const cid = t.class_id || t.Class_id;
          return (!activeClassId || cid === activeClassId) && !t.deleted_at && (t.status || '').toUpperCase() === 'PUBLISHED';
        });
        const selectedClassTestIds = new Set(selectedClassTests.map(t => t.id));
        const totalClassTests = selectedClassTests.length > 0 ? selectedClassTests.length : 40;

        window._cachedBatchAttemptsByClass = window._cachedBatchAttemptsByClass || {};
        const cacheKey = `${batchId}_${activeClassId || 'all'}`;
        const forceRefresh = options === true || Boolean(options?.forceRefresh);
        if (forceRefresh) {
          delete window._cachedBatchAttemptsByClass[cacheKey];
          window._cachedBatchAttempts = null;
        }
        let studentList = window._cachedBatchStudents;
        let attempts = window._cachedBatchAttemptsByClass[cacheKey];

        if (!studentList || !attempts) {
          const sb = await getSupabase();

          // 1. Fetch active students in the same batch
          if (!studentList || studentList.length === 0) {
            const { data: students, error: stuErr } = await sb
              .from('students')
              .select('id, name, gender, photo_url, is_active, program_status')
              .eq('batch_id', batchId)
              .eq('is_active', true)
              .neq('program_status', 'INACTIVE')
              .is('deleted_at', null);

            const rawList = Array.isArray(students) ? students : (students && typeof students === 'object' && students.id ? [students] : []);
            studentList = rawList.filter(s => s && s.id && s.is_active === true && (s.program_status || '').toUpperCase() !== 'INACTIVE');

            if (stuErr || studentList.length === 0) {
              container.innerHTML = `
                <div class="empty-state p-4 text-center">
                  <p style="color:#94a3b8; font-size:12px;">No active students found in this batch.</p>
                </div>`;
              return;
            }
            window._cachedBatchStudents = studentList;
          }

          const studentIds = studentList.map(s => s.id);

          // If selectedClassTestIds is empty but we have an activeClassId, fetch test IDs first
          if (selectedClassTestIds.size === 0 && activeClassId) {
            const { data: cTests } = await sb
              .from('tests')
              .select('id, title, test_type, category, test_subtype, shell_code, class_id, deleted_at, status, payload')
              .eq('class_id', activeClassId)
              .is('deleted_at', null);
            (cTests || []).forEach(t => {
              selectedClassTestIds.add(t.id);
              selectedClassTests.push(t);
            });
          }

          // 2. Fetch submitted attempts scoped by studentIds and class test_ids using pagination to prevent 1000-row cutoff
          let allAttempts = [];
          let from = 0;
          const PAGE_SIZE = 1000;
          let hasMore = true;

          while (hasMore) {
            let attQuery = sb
              .from('attempts')
              .select('id, student_id, test_id, score, total_questions, percentage, effective_score, is_remedial_unlocked, is_best_score, is_forgiven, is_manual_override, status, submitted_at, forgiven_reason, tests(id, title, test_type, category, test_subtype, shell_code, class_id, deleted_at, status, payload)')
              .in('student_id', studentIds)
              .in('status', ['submitted', 'auto_submitted', 'evaluated', 'graded'])
              .order('submitted_at', { ascending: false })
              .range(from, from + PAGE_SIZE - 1);

            if (selectedClassTestIds.size > 0) {
              attQuery = attQuery.in('test_id', Array.from(selectedClassTestIds));
            }

            const { data: chunk, error: attErr } = await attQuery;
            if (attErr) {
              console.error('[Dashboard] Error fetching attempts for leaderboard:', attErr);
              break;
            }
            if (chunk && chunk.length > 0) {
              allAttempts.push(...chunk);
              if (chunk.length < PAGE_SIZE) hasMore = false;
              else from += PAGE_SIZE;
            } else {
              hasMore = false;
            }
          }

          attempts = allAttempts;
          window._cachedBatchAttemptsByClass[cacheKey] = attempts;
          window._cachedBatchAttempts = attempts;
        }

        // 3. Compute best scores, points & overall averages per student for THIS SELECTED CLASS
        const studentStats = studentList.map(st => {
          const stAtts = (attempts || []).filter(a => {
            if (a.student_id !== st.id) return false;
            if (a.tests?.deleted_at) return false;
            const tid = a.test_id || a.tests?.id;
            return selectedClassTestIds.has(tid) || (a.tests?.class_id && a.tests.class_id === activeClassId);
          });
          const bestMap = {};
          let lastSubmittedAt = null;

          // Separate exams from tasks for section-aware resolution
          const examAttsByTest = {};
          const taskAtts = [];

          stAtts.forEach(att => {
            if (att.submitted_at) {
              if (!lastSubmittedAt || new Date(att.submitted_at) > new Date(lastSubmittedAt)) {
                lastSubmittedAt = att.submitted_at;
              }
            }
            if (isExam(att.tests)) {
              const tid = att.test_id || att.tests?.id;
              if (tid) {
                if (!examAttsByTest[tid]) examAttsByTest[tid] = [];
                examAttsByTest[tid].push(att);
              }
            } else {
              taskAtts.push(att);
            }
          });

          // A. Formative Tasks
          taskAtts.forEach(att => {
            const key = att.test_id || att.tests?.id;
            if (!key) return;
            const totalQ = Number(att.total_questions || 50);
            const rawPct = Math.min(100.0, Math.max(0.0, parseFloat(att.percentage || 0)));
            const isRemedial = Boolean(att.is_remedial_unlocked);

            let effPct = rawPct;
            if (att.effective_score != null) {
              const parsedEff = parseFloat(att.effective_score);
              if (parsedEff <= 100.0 && parsedEff >= 0.0) {
                effPct = parsedEff;
              }
            }
            if (isRemedial) effPct = Math.min(effPct, 60.0);

            const rawScore = parseFloat(att.score != null ? att.score : (rawPct * totalQ / 100));
            const maxRemedialPts = totalQ * 0.6;
            const effPoints = isRemedial ? Math.min(rawScore, maxRemedialPts) : rawScore;
            const attTime = new Date(att.submitted_at || att.created_at || 0).getTime();

            if (!bestMap[key] || effPoints > (bestMap[key].points ?? 0)) {
              bestMap[key] = {
                test: att.tests,
                isExam: false,
                effPct,
                rawPct,
                points: effPoints,
                rawPoints: rawScore,
                totalQ,
                isRemedial,
                attTime,
                is_best_score: Boolean(att.is_best_score),
                isForgiven: Boolean(att.is_forgiven)
              };
            }
          });

          // B. Milestone Exams (Section-Aware: Words & Phrases for Unified Exams)
          Object.entries(examAttsByTest).forEach(([testId, atts]) => {
            const testMeta = atts[0].tests;
            const isUnified = testMeta?.payload?.is_unified || testMeta?.payload?.category === 'unified' || Number(testMeta?.payload?.total_questions || 0) === 200;

            if (isUnified) {
              const wordsAtts = atts.filter(a => {
                const fr = String(a.forgiven_reason || '');
                const tQ = Number(a.total_questions || 0);
                return fr.includes('[SECTION: WORDS]') || (tQ > 40 && tQ <= 160);
              });
              const phrasesAtts = atts.filter(a => {
                const fr = String(a.forgiven_reason || '');
                const tQ = Number(a.total_questions || 0);
                return fr.includes('[SECTION: PHRASES]') || (tQ > 0 && tQ <= 40);
              });
              const fullAtts = atts.filter(a => Number(a.total_questions || 0) > 160);

              let bestWords = null;
              wordsAtts.forEach(a => {
                const tQ = Number(a.total_questions || 160);
                const rawPct = Number(a.percentage != null ? a.percentage : (a.score / tQ) * 100);
                const isRem = Boolean(a.is_remedial_unlocked);
                const effPct = isRem ? Math.min(rawPct, 60.0) : rawPct;
                const pts = tQ === 160 ? Math.round(Number(a.score || 0)) : Math.round(160 * (effPct / 100));
                const attTime = new Date(a.submitted_at || a.created_at || 0).getTime();
                if (!bestWords || pts > bestWords.points || (pts === bestWords.points && effPct > bestWords.effPct)) {
                  bestWords = { test: testMeta, isExam: true, effPct, points: pts, totalQ: 160, attTime, isForgiven: Boolean(a.is_forgiven) };
                }
              });
              fullAtts.forEach(a => {
                const wSc = Math.min(160, Number(a.score || 0));
                const wPct = (wSc / 160) * 100;
                const pts = Math.round(wSc);
                const attTime = new Date(a.submitted_at || a.created_at || 0).getTime();
                if (!bestWords || pts > bestWords.points || (pts === bestWords.points && wPct > bestWords.effPct)) {
                  bestWords = { test: testMeta, isExam: true, effPct: wPct, points: pts, totalQ: 160, attTime, isForgiven: Boolean(a.is_forgiven) };
                }
              });

              let bestPhrases = null;
              phrasesAtts.forEach(a => {
                const tQ = Number(a.total_questions || 40);
                const rawPct = Number(a.percentage != null ? a.percentage : (a.score / tQ) * 100);
                const isRem = Boolean(a.is_remedial_unlocked);
                const effPct = isRem ? Math.min(rawPct, 60.0) : rawPct;
                const pts = tQ === 40 ? Math.round(Number(a.score || 0)) : Math.round(40 * (effPct / 100));
                const attTime = new Date(a.submitted_at || a.created_at || 0).getTime();
                if (!bestPhrases || pts > bestPhrases.points || (pts === bestPhrases.points && effPct > bestPhrases.effPct)) {
                  bestPhrases = { test: testMeta, isExam: true, effPct, points: pts, totalQ: 40, attTime, isForgiven: Boolean(a.is_forgiven) };
                }
              });
              fullAtts.forEach(a => {
                if (Number(a.score || 0) > 160) {
                  const pSc = Math.min(40, Number(a.score || 0) - 160);
                  const pPct = (pSc / 40) * 100;
                  const pts = Math.round(pSc);
                  const attTime = new Date(a.submitted_at || a.created_at || 0).getTime();
                  if (!bestPhrases || pts > bestPhrases.points || (pts === bestPhrases.points && pPct > bestPhrases.effPct)) {
                    bestPhrases = { test: testMeta, isExam: true, effPct: pPct, points: pts, totalQ: 40, attTime, isForgiven: Boolean(a.is_forgiven) };
                  }
                }
              });

              if (bestWords) bestMap[`${testId}_words`] = bestWords;
              if (bestPhrases) bestMap[`${testId}_phrases`] = bestPhrases;
            } else {
              // Standard single exam
              let bestSingle = null;
              atts.forEach(a => {
                const tQ = Number(a.total_questions || testMeta?.total_questions || 100);
                const rawPct = Math.min(100.0, Math.max(0.0, parseFloat(a.percentage || 0)));
                const isRem = Boolean(a.is_remedial_unlocked);
                let effPct = rawPct;
                if (a.effective_score != null) {
                  const parsedEff = parseFloat(a.effective_score);
                  if (parsedEff <= 100.0 && parsedEff >= 0.0) effPct = parsedEff;
                }
                if (isRem) effPct = Math.min(effPct, 60.0);
                const rawScore = parseFloat(a.score != null ? a.score : (rawPct * tQ / 100));
                const maxRem = tQ * 0.6;
                const effPoints = isRem ? Math.min(rawScore, maxRem) : rawScore;
                const attTime = new Date(a.submitted_at || a.created_at || 0).getTime();
                if (!bestSingle || effPoints > bestSingle.points || (effPoints === bestSingle.points && effPct > bestSingle.effPct)) {
                  bestSingle = { test: testMeta, isExam: true, effPct, points: effPoints, totalQ: tQ, attTime, isForgiven: Boolean(a.is_forgiven) };
                }
              });
              if (bestSingle) bestMap[testId] = bestSingle;
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
          const allBatchExams = selectedClassTests.filter(isExam);

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

          const totalPoints = Math.round(mastery.totalPoints || examItems.reduce((sum, v) => sum + (v.points || 0), 0));
          const completedExamCount = mastery.completedExamCount ?? mastery.completedWeeklyCount ?? examItems.length;

          // Rule 2.8: overallScore = weighted percentage of COMPLETED valid exams (not curriculum denominator)
          const validExamItems = examItems.filter(e => {
            const isPureForgivenZero = Boolean(e.isForgiven) && Number(e.points ?? e.effPoints ?? 0) === 0;
            return !isPureForgivenZero;
          });
          const validExamPts = validExamItems.reduce((sum, e) => sum + Number(e.points ?? e.effPoints ?? 0), 0);
          const validExamQ = validExamItems.reduce((sum, e) => sum + Number(e.totalQ || 0), 0);
          const overallScore = validExamQ > 0
            ? Math.min(100, Math.max(0, Math.round((validExamPts / validExamQ) * 100)))
            : (validExamItems.length > 0 ? Math.round(validExamItems.reduce((sum, e) => sum + Number(e.effPct ?? 0), 0) / validExamItems.length) : 0);
          const grade = validExamQ > 0
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


        // 5. Determine Ranks and Champions (King for top male, Queen for top female in batch)
        const totalStudents = studentStats.length;
        let myRank = null;
        let topMale = null;
        let topFemale = null;

        studentStats.forEach((st, idx) => {
          st.rank = idx + 1;
          if (st.id === session.student_id) {
            myRank = st.rank;
          }
          const hasExamCompleted = (st.completedExamCount ?? st.completedWeeklyCount ?? 0) > 0;
          const hasAchieved = st.totalPoints > 0 || (hasExamCompleted && st.overallScore > 0) || st.overallScore > 0 || (st.completedCount > 0);

          if (hasAchieved) {
            const rawClean = st.cleanName.replace(/^(mr\.?|miss\.?|mrs\.?|ms\.?|king|queen)\s+/i, '').trim();
            const isLaluName = /^lalu\s+/i.test(rawClean);
            const isBaiqName = /^baiq\s+/i.test(rawClean);
            const effG = isLaluName ? 'male' : (isBaiqName ? 'female' : (st.gender || '').toLowerCase());

            if (effG === 'male' && !topMale) {
              topMale = st;
            } else if (effG === 'female' && !topFemale) {
              topFemale = st;
            }
          }
        });

        // 6. Royal Title & Crown Mechanics for Active Student
        window._batchKingId = topMale ? topMale.id : null;
        window._batchQueenId = topFemale ? topFemale.id : null;
        window._isKing = Boolean(topMale && session.student_id === topMale.id);
        window._isQueen = Boolean(topFemale && session.student_id === topFemale.id);
        window._isBatchChampion = window._isKing || window._isQueen;
        session.is_king = window._isKing;
        session.is_queen = window._isQueen;
        applyStudentGenderUI(session.gender);

        // 7. Update Status Bars
        if (myRankNumEl) myRankNumEl.textContent = myRank ? `#${myRank}` : '—';
        if (myRankSummaryEl) {
          myRankSummaryEl.textContent = myRank ? `Rank #${myRank} of ${totalStudents}` : '—';
        }
        if (champNameEl) {
          const champs = [];
          if (topMale) champs.push(`King ${topMale.cleanName.replace(/^(mr\.?|miss\.?|king|queen)\s+/i, '')} (${topMale.totalPoints} PTS)`);
          if (topFemale) champs.push(`Queen ${topFemale.cleanName.replace(/^(mr\.?|miss\.?|king|queen)\s+/i, '')} (${topFemale.totalPoints} PTS)`);
          if (champs.length > 0) {
            champNameEl.innerHTML = `${getSvgIcon('crown', 14)} ${escapeHtml(champs.join(' • '))}`;
          } else {
            champNameEl.textContent = 'None yet (0 PTS)';
          }
        }

        // 8. Render Leaderboard List
        let html = '';
        studentStats.forEach(st => {
          const isMe = st.id === session.student_id;
          const isKing = Boolean(topMale && st.id === topMale.id);
          const isQueen = Boolean(topFemale && st.id === topFemale.id);
          const isRoyal = isKing || isQueen;
          const rowClass = `standings-row ${isMe ? 'my-row' : ''} ${isRoyal ? 'rank-1-row' : ''}`;

          let rankBadgeClass = 'leaderboard-rank-badge';
          if (st.rank === 1) rankBadgeClass += ' rank-1';
          else if (st.rank === 2) rankBadgeClass += ' rank-2';
          else if (st.rank === 3) rankBadgeClass += ' rank-3';
          const rankContent = st.rank; // Clean numbers strictly: 1, 2, 3, 4, ...

          // Title & Name (no duplicate king/queen icon tag as title is already prefixed)
          const rawClean = st.cleanName.replace(/^(mr\.?|miss\.?|mrs\.?|ms\.?|king|queen)\s+/i, '').trim();
          const isLaluName = /^lalu\s+/i.test(rawClean);
          const isBaiqName = /^baiq\s+/i.test(rawClean);
          const effectiveGender = isLaluName ? 'male' : (isBaiqName ? 'female' : st.gender);

          let displayTitleName = rawClean;
          if (isKing) {
            displayTitleName = `King ${rawClean}`;
          } else if (isQueen) {
            displayTitleName = `Queen ${rawClean}`;
          } else {
            if (effectiveGender === 'male') displayTitleName = `Mr. ${rawClean}`;
            else if (effectiveGender === 'female') displayTitleName = `Miss ${rawClean}`;
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
                    <span class="leaderboard-student-name ${isMe ? 'is-current-user' : ''}" style="${isMe ? `color:${hasExam && typeof getGradeColorByScore === 'function' ? getGradeColorByScore(st.overallScore) : (hasExam ? theme.color : '#38bdf8')} !important; text-shadow: none !important;` : ''}">${(isKing || isQueen) ? `<span class="leaderboard-avatar-crown" title="${isKing ? 'Batch King' : 'Batch Queen'}">${getSvgIcon('crown', 12)}</span>` : ''}${escHtml(displayTitleName)}</span>
                  </div>

                </div>
              </div>
              <div class="th-col th-point" style="display:flex; align-items:center; justify-content:center;">
                <span class="leaderboard-score-val" style="color:${hasExam ? theme.color : '#94a3b8'}; font-weight:400; font-size:14px; font-variant-numeric:tabular-nums; font-family:'Inter', sans-serif;">
                  ${st.totalPoints}
                </span>
              </div>
              <div class="th-col th-grade" style="display:flex; align-items:center; justify-content:center;">
                <div class="leaderboard-grade-chip" style="background:${hasExam ? theme.color : 'rgba(255,255,255,0.12)'}; width:22px; height:22px; border-radius:6px; font-size:12px; font-weight:600; display:flex; align-items:center; justify-content:center; color:${hasExam && (gradeSymbol === '★' || gradeSymbol === 'Star') ? TOPSCORE_COLORS.TEXT_STAR : (hasExam ? TOPSCORE_COLORS.TEXT_DARK : '#ffffff')} !important; font-family:'Inter', sans-serif;" title="${hasExam ? `Average: ${st.overallScore}%` : 'No exams completed yet'}">${gradeSymbol}</div>
              </div>
            </div>
          `;
        });

        container.innerHTML = html;

      } catch (err) {
        console.error('Error loading batch leaderboard:', err);
        container.innerHTML = `
          <div class="empty-state p-4 text-center">
            <p style="color:var(--clr-danger); font-size:12px;">Failed to load batch standings.</p>
          </div>`;
      }
    }
    window.loadBatchLeaderboard = loadBatchLeaderboard;
    window.renderLeaderboard = loadBatchLeaderboard;

    // --- Profile Modal (Student Academic CV Architecture) ---
    let profileModalListenersInitialized = false;

    // Helper functions for Profile Modal DOB & Address
    function toDateInputValue(dobStr) {
      if (!dobStr) return '';
      const d = new Date(dobStr);
      if (isNaN(d.getTime())) return '';
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    function calculateAgeFromDob(dobStr) {
      if (!dobStr) return null;
      const d = new Date(dobStr);
      if (isNaN(d.getTime())) return null;
      const today = new Date();
      let age = today.getFullYear() - d.getFullYear();
      const m = today.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
      return (age >= 0 && age <= 120) ? age : null;
    }

    function updateAgeAndEduUI(dobVal) {
      const ageDisplay = document.getElementById('prof-age-display');
      const heroDobEl = document.getElementById('prof-hero-dob');
      const heroAgeEl = document.getElementById('prof-hero-age');
      const heroDobAgeEl = document.getElementById('prof-hero-dob-age');
      const eduTitleEl = document.getElementById('prof-edu-title');
      const age = calculateAgeFromDob(dobVal);
      if (ageDisplay) {
        ageDisplay.textContent = age !== null ? `(${age} yrs)` : '(—)';
      }
      if (dobVal) {
        const parts = dobVal.split('-');
        let formattedDob = dobVal;
        if (parts.length === 3) {
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const mIdx = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          const yr = parts[0];
          const mName = months[mIdx] || '';
          formattedDob = `${day} ${mName} ${yr}`;
        }
        if (heroDobEl) heroDobEl.textContent = formattedDob;
        if (heroAgeEl) heroAgeEl.textContent = age !== null ? `${age} Years Old` : '—';
        if (heroDobAgeEl) heroDobAgeEl.textContent = `${formattedDob} (${age} yo)`;
      } else {
        if (heroDobEl) heroDobEl.textContent = '—';
        if (heroAgeEl) heroAgeEl.textContent = '—';
        if (heroDobAgeEl) heroDobAgeEl.textContent = '—';
      }
      const { recommended: autoEduTier } = typeof getEducationEligibility === 'function' ? getEducationEligibility(age) : { recommended: 'senior_high' };
      const tierObj = (typeof ALL_EDUCATION_LEVELS !== 'undefined' ? ALL_EDUCATION_LEVELS : []).find(e => e.value === autoEduTier);
      const formalEduLabel = tierObj ? tierObj.label : 'Senior High School (SMA/SMK)';
      if (eduTitleEl) {
        eduTitleEl.textContent = formalEduLabel;
      }
      return { age, autoEduTier, formalEduLabel };
    }

    function applyProfileGradeTheme(gradeOrColor, rgbColor = null) {
      // User requirement: cancel all glow, PIN box/icon must not be pink, clean tactical styling preserved
      const secCard = document.getElementById('profile-security-card');
      if (secCard) {
        secCard.style.removeProperty('--prof-grade-color');
        secCard.style.removeProperty('--prof-grade-bg');
        secCard.style.removeProperty('--prof-grade-icon-bg');
        secCard.style.removeProperty('--prof-grade-border');
        secCard.style.removeProperty('--prof-grade-glow');
      }
    }

    function renderProfileClassesList(classes = [], attempts = []) {
      const tbody = document.getElementById('prof-classes-list-body');
      if (!tbody) return;

      const activeClassesList = (Array.isArray(classes) && classes.length > 0)
        ? classes
        : (Array.isArray(window._activeClasses) && window._activeClasses.length > 0)
          ? window._activeClasses
          : [];

      if (activeClassesList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2" class="text-muted" style="text-align: center; padding: 6px 0; font-size: 12px;">No active classes assigned</td></tr>`;
        return;
      }

      const rowsHtml = activeClassesList.map(c => {
        const className = c.name || c.title || 'Class';
        const classTests = (window._batchTests || []).filter(t => {
          const cid = t.class_id || t.Class_id;
          return cid === c.id;
        });
        const classTestIds = new Set(classTests.map(t => t.id));

        const classAttempts = (attempts || []).filter(a => {
          const tid = a.test_id || a.Test_id;
          const isMatch = classTestIds.has(tid) || (a.class_id || a.Class_id) === c.id;
          return isMatch && a.percentage != null && a.percentage !== undefined;
        });

        let gradeSymbol = '—';
        let gradeText = '—';
        let gradeColor = '#94a3b8';

        if (classAttempts.length > 0) {
          const avgScore = classAttempts.reduce((sum, a) => sum + Number(a.percentage || 0), 0) / classAttempts.length;
          gradeSymbol = typeof calculateGrade === 'function' ? calculateGrade(avgScore) : 'A';
          const pal = (typeof GRADE_PALETTE !== 'undefined' && GRADE_PALETTE[gradeSymbol])
            ? GRADE_PALETTE[gradeSymbol]
            : { color: '#00c000', predicate: 'Very Good' };
          gradeColor = pal.color || '#00c000';
          // User requirement: Display ONLY grade description (predicate/label), symbol omitted
          gradeText = pal.predicate || pal.label || gradeSymbol;
        } else if (c.overall_grade) {
          gradeSymbol = c.overall_grade;
          const pal = (typeof GRADE_PALETTE !== 'undefined' && GRADE_PALETTE[gradeSymbol])
            ? GRADE_PALETTE[gradeSymbol]
            : { color: '#00c000', predicate: 'Very Good' };
          gradeColor = pal.color || '#00c000';
          // User requirement: Display ONLY grade description (predicate/label), symbol omitted
          gradeText = pal.predicate || pal.label || gradeSymbol;
        } else if (c._statusText && c._statusText !== 'In Progress') {
          gradeText = c._statusText;
          gradeColor = '#38bdf8';
        }

        return `
          <tr>
            <td class="class-name-cell" title="${escapeHtml(className)}">${escapeHtml(className)}</td>
            <td class="class-grade-cell" style="color: ${gradeColor};">${escapeHtml(gradeText)}</td>
          </tr>
        `;
      }).join('');

      tbody.innerHTML = rowsHtml;
    }

    function populateProfileCities(selectedProv, preselectCity = null) {
      const citySel = document.getElementById('prof-sel-city');
      if (!citySel) return;
      const rawCities = (typeof INDONESIA_REGIONS !== 'undefined' && INDONESIA_REGIONS[selectedProv]) ? INDONESIA_REGIONS[selectedProv] : [];
      if (rawCities.length > 0) {
        citySel.innerHTML = rawCities.map(c => `<option value="${escapeHtml(c)}" ${preselectCity === c ? 'selected' : ''}>${escapeHtml(typeof formatCityDistrict === 'function' ? formatCityDistrict(c) : c)}</option>`).join('');
        if (preselectCity) citySel.value = preselectCity;
      }
    }

    function populateProfileAddress(prov, city, dist, vill) {
      const provSel = document.getElementById('prof-sel-province');
      const distInp = document.getElementById('prof-inp-district');
      const villInp = document.getElementById('prof-inp-village');

      // Format address components from village -> district -> regency -> province separated by commas
      const fVill = (typeof formatVillageName === 'function' ? formatVillageName(vill) : vill) || '';
      const fDist = (typeof formatDistrictName === 'function' ? formatDistrictName(dist) : dist) || '';
      const fCity = (typeof formatCityDistrict === 'function' ? formatCityDistrict(city) : city) || '';
      const fProv = (typeof formatProvinceName === 'function' ? formatProvinceName(prov) : prov) || '';

      const adrParts = [fVill, fDist, fCity, fProv].map(s => (s || '').trim()).filter(s => s && s !== '—');
      const fullAdrStr = adrParts.length > 0 ? adrParts.join(', ') : '—';
      const heroAdrEl = document.getElementById('prof-hero-adr');
      if (heroAdrEl) {
        heroAdrEl.textContent = fullAdrStr;
        heroAdrEl.title = fullAdrStr;
      }

      // Update Pure Info Table display (Village -> District -> Regency -> Province)
      const infoVill = document.getElementById('prof-info-village');
      if (infoVill) infoVill.textContent = fVill || '—';
      const infoDist = document.getElementById('prof-info-district');
      if (infoDist) infoDist.textContent = fDist || '—';
      const infoCity = document.getElementById('prof-info-city');
      if (infoCity) infoCity.textContent = fCity || '—';
      const infoProv = document.getElementById('prof-info-province');
      if (infoProv) infoProv.textContent = fProv || '—';

      if (provSel && typeof INDONESIA_REGIONS !== 'undefined') {
        const SUGGESTED_PROV = "Nusa Tenggara Barat";
        const allProvinces = Object.keys(INDONESIA_REGIONS).sort((a, b) => a.localeCompare(b, 'id'));
        let provHtml = '<option value="" disabled' + (!prov ? ' selected' : '') + '>Select province…</option>';
        provHtml += `<optgroup label="SUGGESTED LOCATION">
          <option value="${SUGGESTED_PROV}" ${prov === SUGGESTED_PROV ? 'selected' : ''}>★ ${SUGGESTED_PROV} (Suggested)</option>
        </optgroup>`;
        provHtml += `<optgroup label="ALL PROVINCES (A–Z)">` +
          allProvinces.map(p => `<option value="${escapeHtml(p)}" ${prov === p ? 'selected' : ''}>${escapeHtml(p)}</option>`).join('') +
          `</optgroup>`;
        provSel.innerHTML = provHtml;
        if (prov) {
          provSel.value = prov;
          populateProfileCities(prov, city);
        } else {
          populateProfileCities(SUGGESTED_PROV, null);
        }
      }

      if (distInp && dist !== undefined) distInp.value = dist || '';
      if (villInp && vill !== undefined) villInp.value = vill || '';
    }

    function setupProfileModal(attempts = []) {
      const modal = document.getElementById('profile-modal');
      const openBtn = document.getElementById('view-profile-btn');
      const closeBtn = document.getElementById('close-profile-modal') || document.getElementById('btn-close-profile-modal-footer');

      const currentGender = session.gender || 'male';
      const cleanName = cleanStudentName(session.student_name || 'Student');
      const isKing = Boolean(window._isKing || session.is_king);
      const isQueen = Boolean(window._isQueen || session.is_queen);
      let prefix = currentGender === 'female' ? 'Miss ' : 'Mr. ';
      if (isKing) {
        prefix = 'King ';
      } else if (isQueen) {
        prefix = 'Queen ';
      }

      const nameEl = document.getElementById('prof-student-name');
      if (nameEl) nameEl.textContent = formatProfileStudentName(cleanName, prefix);

      // Synchronize Organization Metadata: Institution • Program • Batch • Level (Single-Line Sentence SSOT)
      const instName = (session.institution_name && session.institution_name !== 'undefined') ? session.institution_name : 'TopsCore Academy';
      const progName = (session.program_name && session.program_name !== 'undefined') ? session.program_name : 'Program';
      const rawBatch = (session.batch_name && session.batch_name !== 'undefined') ? session.batch_name : 'Batch';
      const batchLabel = /batch/i.test(rawBatch) ? rawBatch : `Batch ${rawBatch}`;
      const isCamp = typeof isCampContext === 'function' ? isCampContext(session) : Boolean(/camp/i.test(session.program_name || '') || /cec|cake/i.test(session.institution_name || ''));
      const rawLvl = session.level_number != null ? session.level_number : (session.level_name || 1);
      const levelLabel = typeof formatAcademicTier === 'function' ? formatAcademicTier(rawLvl, isCamp, session) : (isCamp ? `${toShortLevel(rawLvl)} Step` : `${toShortLevel(rawLvl)} Level`);

      const metaSentence = `${instName} • ${progName} • ${batchLabel} • ${levelLabel}`;

      const sentenceEl = document.getElementById('prof-metadata-sentence');
      if (sentenceEl) sentenceEl.textContent = metaSentence;

      const orgMetaEl = document.getElementById('prof-org-meta');
      if (orgMetaEl) {
        orgMetaEl.textContent = metaSentence;
      }

      const campusEl = document.getElementById('prof-meta-campus');
      if (campusEl) campusEl.textContent = instName;
      const metaProgEl = document.getElementById('prof-meta-program');
      if (metaProgEl) metaProgEl.textContent = progName;
      const metaBatchEl = document.getElementById('prof-meta-batch');
      if (metaBatchEl) metaBatchEl.textContent = batchLabel;

      const progEl = document.getElementById('prof-student-prog');
      if (progEl) progEl.textContent = instName;
      const classEl = document.getElementById('prof-student-class');
      if (classEl) classEl.textContent = progName;
      const batchEl = document.getElementById('prof-student-batch');
      if (batchEl) batchEl.textContent = batchLabel;

      // Synchronize Gender & Title in CV
      const heroGenderEl = document.getElementById('prof-hero-gender');
      if (heroGenderEl) {
        heroGenderEl.textContent = currentGender === 'female' ? 'Female' : 'Male';
      }
      const genderTextEl = document.getElementById('prof-gender-text');
      if (genderTextEl) {
        genderTextEl.textContent = currentGender === 'female' ? 'Female (Miss)' : 'Male (Mr.)';
      }
      const titleTextEl = document.getElementById('prof-title-text');
      if (titleTextEl) {
        titleTextEl.textContent = isKing ? 'King' : (isQueen ? 'Queen' : (currentGender === 'female' ? 'Miss' : 'Mr.'));
      }

      // Synchronize Domicile
      const domicileEl = document.getElementById('prof-domicile-display');
      if (domicileEl) {
        const city = session.city;
        const prov = session.province;
        if (city && prov) domicileEl.textContent = `${city}, ${prov}`;
        else if (city) domicileEl.textContent = city;
        else if (prov) domicileEl.textContent = prov;
        else domicileEl.textContent = '—';
      }

      // Synchronize Birth Date & Age
      const initialDob = session.dob || session.birth_date;
      const dobInputVal = toDateInputValue(initialDob);
      const dobInp = document.getElementById('prof-inp-dob');
      if (dobInp && dobInputVal) {
        dobInp.value = dobInputVal;
      }
      updateAgeAndEduUI(dobInputVal);

      // Populate Initial Address from session
      populateProfileAddress(session.province, session.city, session.district, session.village);

      // Render Classes with overall grade in Section 2
      renderProfileClassesList(window._activeClasses, attempts);

      // Populate PIN (Tactical clean styling, no glow & no pink)
      const pinVal = session.login_pin || session.pin || '1234';
      const pinDisplayEl = document.getElementById('prof-pin-display');
      if (pinDisplayEl) pinDisplayEl.textContent = pinVal;

      let resolvedGrade = window._studentGrade || session.overall_grade || null;
      if (!resolvedGrade && Array.isArray(attempts) && attempts.length > 0) {
        const validAttempts = attempts.filter(a => a.percentage !== null && a.percentage !== undefined);
        if (validAttempts.length > 0) {
          const maxPct = Math.max(...validAttempts.map(a => Number(a.percentage) || 0));
          resolvedGrade = typeof calculateGrade === 'function' ? calculateGrade(maxPct) : 'A';
        }
      }
      if (resolvedGrade) {
        applyProfileGradeTheme(resolvedGrade);
      } else {
        applyProfileGradeTheme(window._studentGradeColor || TOPSCORE_COLORS.A, window._studentGradeRgb || '0, 192, 0');
      }

      // Synchronize Education Timeline immediately from session
      const timelineEl = document.getElementById('prof-education-timeline');
      if (timelineEl && session.education) {
        let eduData = session.education;
        if (typeof eduData === 'string') {
          try { eduData = JSON.parse(eduData); } catch (_) {}
        }
        if (Array.isArray(eduData) && eduData.length > 0) {
          timelineEl.innerHTML = eduData.map((item, idx) => {
            const isHighest = idx === eduData.length - 1;
            const rawLabel = item.name || item.institution || item.level || 'Education Level';
            const tier = (typeof EDUCATION_TIERS !== 'undefined' ? EDUCATION_TIERS : []).find(t => t.id === rawLabel);
            const label = tier ? tier.label : rawLabel;
            const year = item.year || '—';
            return `
              <div class="profile-timeline-node ${isHighest ? 'active-highest' : ''}">
                <div class="profile-timeline-left">
                  <span class="profile-timeline-dot"></span>
                  <span class="fw-600">${escapeHtml(label)}</span>
                </div>
                <span class="profile-timeline-badge">${year}</span>
              </div>
            `;
          }).join('');
        } else if (typeof eduData === 'string' && eduData.trim().length > 0) {
          const tier = (typeof EDUCATION_TIERS !== 'undefined' ? EDUCATION_TIERS : []).find(t => t.id === eduData.trim());
          const label = tier ? tier.label : eduData;
          timelineEl.innerHTML = `
            <div class="profile-timeline-node active-highest">
              <div class="profile-timeline-left">
                <span class="profile-timeline-dot"></span>
                <span class="fw-600">${escapeHtml(label)}</span>
              </div>
              <span class="profile-timeline-badge">Verified</span>
            </div>
          `;
        }
      }

      if (profileModalListenersInitialized) return;
      profileModalListenersInitialized = true;

      // Fetch and display existing student photo and personal metadata
      (async () => {
        try {
          const sb = await getSupabase();
          const { data: st } = await sb.from('students').select('photo_url, birth_date, education, gender, province, city, district, village, updated_at').eq('id', session.student_id).maybeSingle();
          if (st?.photo_url) {
            applyPhotoEverywhere(st.photo_url);
          } else {
            clearPhotoEverywhere();
          }

          // Read-only Gender / Title in CV
          const activeGender = st?.gender || session.gender || 'male';
          const isK = Boolean(window._isKing || session.is_king);
          const isQ = Boolean(window._isQueen || session.is_queen);
          const titleTextEl = document.getElementById('prof-title-text');
          if (titleTextEl) {
            titleTextEl.textContent = isK ? 'King' : (isQ ? 'Queen' : (activeGender === 'female' ? 'Miss' : 'Mr.'));
          }
          const genderTextEl = document.getElementById('prof-gender-text');
          if (genderTextEl) {
            genderTextEl.textContent = activeGender === 'female' ? 'Female (Miss)' : 'Male (Mr.)';
          }
          const nameEl = document.getElementById('prof-student-name');
          if (nameEl) {
            const p = isK ? 'King ' : (isQ ? 'Queen ' : (activeGender === 'female' ? 'Miss ' : 'Mr. '));
            nameEl.textContent = formatProfileStudentName(session.student_name || 'Student', p);
          }

          // Interactive Birth Date & Age synchronization
          const dob = st?.birth_date || session.dob || session.birth_date;
          const dobVal = toDateInputValue(dob);
          const dobInpEl = document.getElementById('prof-inp-dob');
          if (dobInpEl && dobVal) {
            dobInpEl.value = dobVal;
          }
          const { formalEduLabel } = updateAgeAndEduUI(dobVal);

          // 4-Tier Residential Address synchronization (Province -> City -> District -> Village)
          const activeProv = st?.province || session.province || 'Nusa Tenggara Barat';
          const activeCity = st?.city || session.city || 'Kota Mataram';
          const activeDistrict = st?.district || session.district || '';
          const activeVillage = st?.village || session.village || '';

          populateProfileAddress(activeProv, activeCity, activeDistrict, activeVillage);

          const provEl = document.getElementById('prof-addr-province');
          if (provEl) provEl.textContent = activeProv;
          const cityEl = document.getElementById('prof-addr-city');
          if (cityEl) cityEl.textContent = activeCity;
          const distEl = document.getElementById('prof-addr-district');
          if (distEl) distEl.textContent = activeDistrict;
          const villEl = document.getElementById('prof-addr-village');
          if (villEl) villEl.textContent = activeVillage;

          const domicileEl = document.getElementById('prof-domicile-display');
          if (domicileEl) domicileEl.textContent = `${activeCity}, ${activeProv}`;

          // Educational History Timeline Fallback for compatibility
          const timelineEl = document.getElementById('prof-education-timeline');
          if (timelineEl) {
            timelineEl.innerHTML = `
              <div class="profile-timeline-node active-highest">
                <div class="profile-timeline-left">
                  <span class="profile-timeline-dot"></span>
                  <span class="fw-600">${escapeHtml(formalEduLabel)}</span>
                </div>
                <span class="profile-timeline-badge">Verified</span>
              </div>
            `;
          }

          // Photo Retake Gating: Exam Completion + 7-Day Cooldown
          const cameraBadge = document.getElementById('prof-camera-badge');
          const isEligible = localStorage.getItem(`stu_photo_retake_eligible_${session.student_id}`) === 'true' || Boolean(session.photo_retake_eligible);
          const lastUpdatedStr = localStorage.getItem(`stu_last_photo_updated_${session.student_id}`) || st?.updated_at;
          let isOnCooldown = false;
          let daysRemaining = 0;
          if (lastUpdatedStr) {
            const elapsedMs = Date.now() - new Date(lastUpdatedStr).getTime();
            const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
            if (elapsedMs < sevenDaysMs) {
              isOnCooldown = true;
              daysRemaining = Math.ceil((sevenDaysMs - elapsedMs) / (24 * 60 * 60 * 1000));
            }
          }

          if (cameraBadge) {
            if (isEligible && !isOnCooldown) {
              cameraBadge.classList.remove('locked');
              cameraBadge.classList.add('eligible');
              cameraBadge.title = 'Take new photo with camera (Exam Passed)';
            } else {
              cameraBadge.classList.add('locked');
              cameraBadge.classList.remove('eligible');
              if (!isEligible) {
                cameraBadge.title = 'Locked: Pass an Exam to earn 1 photo retake credit';
              } else {
                cameraBadge.title = `Locked: Weekly cooldown (${daysRemaining}d remaining)`;
              }
            }
          }
        } catch (err) {
          console.warn('Error loading profile drawer metadata:', err);
        }
      })();

      // Photo retake click handler (Camera Only, Gated by Exam Pass & Cooldown)
      const avatarContainer = document.getElementById('avatar-container');
      if (avatarContainer) {
        avatarContainer.onclick = async () => {
          const isEligible = localStorage.getItem(`stu_photo_retake_eligible_${session.student_id}`) === 'true' || Boolean(session.photo_retake_eligible);
          const lastUpdatedStr = localStorage.getItem(`stu_last_photo_updated_${session.student_id}`);
          let isOnCooldown = false;
          let daysRemaining = 0;
          if (lastUpdatedStr) {
            const elapsedMs = Date.now() - new Date(lastUpdatedStr).getTime();
            const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
            if (elapsedMs < sevenDaysMs) {
              isOnCooldown = true;
              daysRemaining = Math.ceil((sevenDaysMs - elapsedMs) / (24 * 60 * 60 * 1000));
            }
          }

          if (!isEligible) {
            showToast('Photo retake locked: Pass an Exam to earn 1 photo retake credit.', 'warning');
            return;
          }
          if (isOnCooldown) {
            showToast(`Photo retake cooldown active: Available in ${daysRemaining} day(s).`, 'warning');
            return;
          }

          const photoModal = document.getElementById('photo-setup-modal');
          if (photoModal) {
            photoModal.classList.remove('hidden');
            await startOnboardWebcam();
          }
        };
      }

      // Change PIN Modal Controller & Form Handler
      const changePinModal = document.getElementById('change-pin-modal');
      const openChangePinBtn = document.getElementById('btn-open-change-pin');
      const closeChangePinBtn = document.getElementById('close-change-pin-modal');
      const cancelChangePinBtn = document.getElementById('btn-cancel-change-pin');
      const submitChangePinFooterBtn = document.getElementById('btn-submit-change-pin-footer');
      const changePinForm = document.getElementById('change-pin-form');

      const openChangePinModal = () => {
        if (changePinForm) changePinForm.reset();
        if (changePinModal) {
          changePinModal.classList.remove('hidden');
          const oldPinEl = document.getElementById('pin-old');
          if (oldPinEl) setTimeout(() => oldPinEl.focus(), 60);
        }
      };

      const closeChangePinModal = () => {
        if (changePinForm) changePinForm.reset();
        if (changePinModal) changePinModal.classList.add('hidden');
      };

      if (openChangePinBtn) openChangePinBtn.addEventListener('click', openChangePinModal);
      if (closeChangePinBtn) closeChangePinBtn.addEventListener('click', closeChangePinModal);
      if (cancelChangePinBtn) cancelChangePinBtn.addEventListener('click', closeChangePinModal);

      if (submitChangePinFooterBtn) {
        submitChangePinFooterBtn.addEventListener('click', () => {
          if (changePinForm) {
            if (typeof changePinForm.requestSubmit === 'function') {
              changePinForm.requestSubmit();
            } else {
              changePinForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            }
          }
        });
      }

      if (changePinForm) {
        changePinForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const oldPin = document.getElementById('pin-old').value.trim();
          const newPin = document.getElementById('pin-new').value.trim();
          const confirmPin = document.getElementById('pin-confirm').value.trim();

          if (!oldPin) {
            showToast('Please enter your current PIN.', 'warning');
            const el = document.getElementById('pin-old');
            if (el) el.focus();
            return;
          }
          if (!newPin) {
            showToast('Please enter your new PIN.', 'warning');
            const el = document.getElementById('pin-new');
            if (el) el.focus();
            return;
          }
          if (newPin.length !== 4) {
            showToast('New PIN must be exactly 4 digits.', 'warning');
            const el = document.getElementById('pin-new');
            if (el) el.focus();
            return;
          }
          if (!/^\d+$/.test(newPin)) {
            showToast('PIN must contain only numbers.', 'warning');
            const el = document.getElementById('pin-new');
            if (el) el.focus();
            return;
          }
          if (!confirmPin) {
            showToast('Please confirm your new PIN.', 'warning');
            const el = document.getElementById('pin-confirm');
            if (el) el.focus();
            return;
          }
          if (newPin !== confirmPin) {
            showToast('PIN confirmation does not match.', 'warning');
            const el = document.getElementById('pin-confirm');
            if (el) el.focus();
            return;
          }

          showLoading('Updating PIN...');
          try {
            await updateStudentPin(session.student_id, oldPin, newPin);
            session.login_pin = newPin;
            session.pin = newPin;
            setStudentSession(session);
            const pinDisplayEl = document.getElementById('prof-pin-display');
            if (pinDisplayEl) pinDisplayEl.textContent = newPin;
            hideLoading();
            showToast('PIN successfully updated!', 'success');
            changePinForm.reset();
            closeChangePinModal();
            window.isProfileDirty = false;
          } catch(err) {
            hideLoading();
            showToast(err.message, 'error');
          }
        });
      }

      // Wire Profile Form Inputs (DOB & Address) to track changes
      const profDobInp = document.getElementById('prof-inp-dob');
      const profProvSel = document.getElementById('prof-sel-province');
      const profCitySel = document.getElementById('prof-sel-city');
      const profDistInp = document.getElementById('prof-inp-district');
      const profVillInp = document.getElementById('prof-inp-village');

      if (profDobInp && !profDobInp._hasChangeListener) {
        profDobInp._hasChangeListener = true;
        const handleDobChange = () => {
          window.isProfileDirty = true;
          updateAgeAndEduUI(profDobInp.value);
        };
        profDobInp.addEventListener('change', handleDobChange);
        profDobInp.addEventListener('input', handleDobChange);
      }

      if (profProvSel && !profProvSel._hasChangeListener) {
        profProvSel._hasChangeListener = true;
        profProvSel.addEventListener('change', () => {
          window.isProfileDirty = true;
          populateProfileCities(profProvSel.value);
        });
      }

      if (profCitySel && !profCitySel._hasChangeListener) {
        profCitySel._hasChangeListener = true;
        profCitySel.addEventListener('change', () => {
          window.isProfileDirty = true;
        });
      }

      if (profDistInp && !profDistInp._hasChangeListener) {
        profDistInp._hasChangeListener = true;
        profDistInp.addEventListener('input', () => {
          window.isProfileDirty = true;
        });
      }

      if (profVillInp && !profVillInp._hasChangeListener) {
        profVillInp._hasChangeListener = true;
        profVillInp.addEventListener('input', () => {
          window.isProfileDirty = true;
        });
      }

      // Save Profile Changes Handler (DOB, Address & Recalculated Education)
      const saveProfileBtn = document.getElementById('btn-save-profile-modal-footer');
      if (saveProfileBtn && !saveProfileBtn._hasClickListener) {
        saveProfileBtn._hasClickListener = true;
        saveProfileBtn.addEventListener('click', async () => {
          const dobVal = profDobInp?.value || '';
          const provVal = profProvSel?.value || '';
          const cityVal = profCitySel?.value || '';
          const distVal = profDistInp?.value?.trim() || '';
          const villVal = profVillInp?.value?.trim() || '';

          const { autoEduTier } = updateAgeAndEduUI(dobVal);

          showLoading('Saving profile changes…');
          try {
            const sb = await getSupabase();
            const updatePayload = {
              updated_at: new Date().toISOString()
            };
            if (dobVal) updatePayload.birth_date = dobVal;
            if (autoEduTier) updatePayload.education = autoEduTier;
            if (provVal) updatePayload.province = provVal;
            if (cityVal) updatePayload.city = cityVal;
            updatePayload.district = distVal;
            updatePayload.village = villVal;

            const { error } = await sb.from('students').update(updatePayload).eq('id', session.student_id);
            if (error) {
              console.warn('Database profile update note:', error.message);
            }

            // Synchronize in-memory session and session storage
            if (dobVal) {
              session.birth_date = dobVal;
              session.dob = dobVal;
            }
            if (autoEduTier) session.education = autoEduTier;
            if (provVal) session.province = provVal;
            if (cityVal) session.city = cityVal;
            session.district = distVal;
            session.village = villVal;

            setStudentSession(session);

            // Update domicile display
            const domicileEl = document.getElementById('prof-domicile-display');
            if (domicileEl) {
              if (cityVal && provVal) domicileEl.textContent = `${cityVal}, ${provVal}`;
              else if (cityVal) domicileEl.textContent = cityVal;
              else if (provVal) domicileEl.textContent = provVal;
              else domicileEl.textContent = '—';
            }

            window.isProfileDirty = false;
            hideLoading();
            showToast('Profile updated successfully!', 'success');
            modal.classList.add('hidden');
            if (window.location.hash.startsWith('#profile') || window.location.hash === '#history') {
              try { history.replaceState(null, '', window.location.pathname + window.location.search); } catch (_) {}
            }
          } catch (err) {
            hideLoading();
            showToast(err.message || 'Failed to save profile changes.', 'error');
          }
        });
      }

      const openProfile = () => {
        applyStudentGenderUI(session.gender);
        window.isProfileDirty = false;
        if(changePinForm) changePinForm.reset();

        // Refresh latest address and DOB inputs from active session
        const currentDob = session.dob || session.birth_date;
        const curDobVal = toDateInputValue(currentDob);
        if (profDobInp && curDobVal) {
          profDobInp.value = curDobVal;
        }
        updateAgeAndEduUI(curDobVal);
        populateProfileAddress(session.province, session.city, session.district, session.village);

        modal?.classList.remove('hidden');
        try { window.location.hash = '#profile'; } catch (_) {}
      };

      if (openBtn && !openBtn._hasClickListener) {
        openBtn._hasClickListener = true;
        openBtn.addEventListener('click', openProfile);
      }

      const closeProfile = () => {
        if (window.isProfileDirty) {
          window.showConfirmDialog({
            icon: getSvgIcon('alert-triangle', 28),
            title: 'UNSAVED CHANGES',
            message: 'You have unsaved profile changes. Are you sure you want to discard them and close?',
            confirmText: 'Discard & Close',
            cancelText: 'Keep Editing',
            type: 'warning',
            onConfirm: () => {
              window.isProfileDirty = false;
              if (changePinForm) changePinForm.reset();
              // Reset fields to current session
              const resetDob = toDateInputValue(session.dob || session.birth_date);
              if (profDobInp) profDobInp.value = resetDob;
              updateAgeAndEduUI(resetDob);
              populateProfileAddress(session.province, session.city, session.district, session.village);

              modal?.classList.add('hidden');
              if (window.location.hash.startsWith('#profile') || window.location.hash === '#history') {
                try { history.replaceState(null, '', window.location.pathname + window.location.search); } catch (_) {}
              }
            }
          });
          return;
        }
        window.isProfileDirty = false;
        if(changePinForm) changePinForm.reset();
        modal?.classList.add('hidden');
        if (window.location.hash.startsWith('#profile') || window.location.hash === '#history') {
          try { history.replaceState(null, '', window.location.pathname + window.location.search); } catch (_) {}
        }
      };

      if (closeBtn && !closeBtn._hasClickListener) {
        closeBtn._hasClickListener = true;
        closeBtn.addEventListener('click', closeProfile);
      }
      const footerCloseBtn = document.getElementById('btn-close-profile-modal-footer');
      if (footerCloseBtn && !footerCloseBtn._hasClickListener) {
        footerCloseBtn._hasClickListener = true;
        footerCloseBtn.addEventListener('click', closeProfile);
      }
      if (modal && !modal._hasBackdropListener) {
        modal._hasBackdropListener = true;
        modal.addEventListener('click', (e) => {
          if (e.target === modal) closeProfile();
        });
      }

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

    // ── Universal Custom Confirmation Modal (Phase 3) ──
    window.showConfirmDialog = function({
      icon = '',
      title = 'LOG OUT SESSION',
      message = 'Are you sure you want to sign out?',
      confirmText = 'LOG OUT',
      cancelText = 'STAY HERE',
      type = 'danger',
      onConfirm = null
    } = {}) {
      const modal = document.getElementById('custom-confirm-modal');
      if (!modal) {
        if (confirm(message)) onConfirm?.();
        return;
      }
      const box = modal.querySelector('.custom-confirm-box');
      const iconEl = document.getElementById('custom-confirm-icon');
      const titleEl = document.getElementById('custom-confirm-title');
      const msgEl = document.getElementById('custom-confirm-msg');
      const cancelBtn = document.getElementById('custom-confirm-btn-cancel');
      const actionBtn = document.getElementById('custom-confirm-btn-action');

      if (iconEl) iconEl.innerHTML = icon;
      if (titleEl) titleEl.textContent = title;
      if (msgEl) msgEl.textContent = message;
      if (cancelBtn) cancelBtn.textContent = cancelText;
      if (actionBtn) actionBtn.textContent = confirmText;

      box?.classList.toggle('danger', type === 'danger');

      modal.classList.remove('hidden');

      const cleanup = () => {
        modal.classList.add('hidden');
        cancelBtn?.removeEventListener('click', onCancel);
        actionBtn?.removeEventListener('click', onAction);
        modal.removeEventListener('click', onBackdrop);
      };

      const onCancel = () => cleanup();
      const onAction = () => {
        cleanup();
        onConfirm?.();
      };
      const onBackdrop = (e) => {
        if (e.target === modal) cleanup();
      };

      cancelBtn?.addEventListener('click', onCancel, { once: true });
      actionBtn?.addEventListener('click', onAction, { once: true });
      modal.addEventListener('click', onBackdrop, { once: true });
    };

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', () => {
      window.showConfirmDialog({
        icon: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="tc-icon"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>',
        title: 'LOG OUT SESSION',
        message: 'Are you sure you want to sign out of your learning session?',
        confirmText: 'LOG OUT',
        cancelText: 'STAY HERE',
        type: 'danger',
        onConfirm: () => {
          clearStudentSession();
          window.location.href = '/index.html';
        }
      });
    });

    function restoreDashboardHashRoute() {
      const hash = window.location.hash || '';
      document.getElementById('profile-modal')?.classList.add('hidden');
      document.getElementById('classes-selector-modal')?.classList.add('hidden');
      if (!hash) return;
      if (hash === '#profile' || hash === '#profile-history' || hash === '#history') {
        const modal = document.getElementById('profile-modal');
        if (modal) {
          applyStudentGenderUI(session.gender);
          modal.classList.remove('hidden');
        }
      } else if (hash === '#select-class') {
        populateClassesSelectorModal(window._activeClasses || []);
        document.getElementById('classes-selector-modal')?.classList.remove('hidden');
      }
    }

    window.addEventListener('hashchange', restoreDashboardHashRoute);

    setupDockTabs();
    setupProfileModal([]);
    loadDashboard().then(() => {
      restoreDashboardHashRoute();
    });
