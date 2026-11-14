/**
 * TopsCore — Student Dashboard Module
 * Extracted from dashboard.html
 */

import { fetchStudentClasses, fetchStudentProgress, fetchTestsForStudentClass, fetchStudentAttemptsForTest, fetchAllStudentAttempts, fetchAttemptAnswers, updateStudentPin, uploadStudentPhoto, updateStudentGender, updateStudentBirthday, updateStudentEducation, formatStudentName, cleanStudentName, fetchAssignments, fetchTests, toOrdinalLevel, fetchBatches, fetchStudentLevel, fetchActiveTestSession, fetchClassTestSettings } from './api.js?v=20261106_v160';
    import { requireStudentSession, clearStudentSession, updateStudentSessionGender, setStudentSession } from './session.js?v=20261106_v160';
    import { showToast, showLoading, hideLoading, getGrade, withTimeout, escapeHtml, escHtml } from './app.js?v=20261106_v160';
    import { testMicrophoneCapability } from './speech.js?v=20261106_v160';
    import { processAndCompressAvatar } from './utils/avatar-engine.js?v=20261106_v160';
    import { TOPSCORE_COLORS, GRADE_PALETTE, getGradeSymbol, getGradeColor, getScoreColor, getGradeColorByScore, getAchievementStatus, getTaskProgressVisual, isExam, isWeeklyExam, calculateGrade, computeMilestoneExamMastery, computeUnifiedScore, computeTopicPassLevel, getClassSvgIcon } from './grading.js?v=20261106_v160';
    import { INDONESIA_REGIONS, formatProvinceName, formatCityDistrict, formatDistrictName, formatVillageName, getDistrictsForCity, getVillagesForDistrict } from './indonesia-regions.js?v=20261115_v521';
    import { getSvgIcon } from './svg-icons.js?v=20261114_v487';

    if (typeof window !== 'undefined') {
      window.INDONESIA_REGIONS = INDONESIA_REGIONS;
    }

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
  if (elLvl) {
    const rawLvl = session.level_name || (session.level_number ? toOrdinalLevel(session.level_number) : null);
    elLvl.textContent = rawLvl ? (rawLvl.toLowerCase().includes('level') ? rawLvl : rawLvl + ' Level').toUpperCase() : '1ST LEVEL';
  }

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
          formattedName = cleanFullName;
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
          crownEl.innerHTML = getSvgIcon('graduation-cap', 16);
          crownEl.title = 'Alumni Graduate';
          crownEl.classList.remove('hidden');
        } else {
          crownEl.innerHTML = getSvgIcon('crown', 16);
          crownEl.title = 'Batch Champion';
          crownEl.classList.toggle('hidden', !isLeader);
        }
      }

      const hdrNameEl = document.getElementById('header-student-name');
      if (hdrNameEl) hdrNameEl.textContent = formattedName;

      const profTitleEl = document.getElementById('prof-title-text');
      if (profTitleEl) {
        profTitleEl.textContent = g === 'female' ? 'Miss' : 'Mr.';
      }
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

      if (!currentGender || !currentBirthDate || !currentEducation || !currentProvince || !currentCity) {
        try {
          const sb = await (await import('./supabase.js?v=20261106_v154')).getSupabase();
          const { data: st } = await withTimeout(
            sb.from('students').select('gender, birth_date, education, province, city, district, village').eq('id', session.student_id).maybeSingle(),
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
            sessionStorage.setItem('topscore_session', JSON.stringify(session));
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
      const nameEl = document.getElementById('intro-student-name');
      if (nameEl) {
        nameEl.textContent = cleanStudentName(session.student_name || 'Top');
      }
      const dayInp = document.getElementById('intro-birth-day');
      const monthSel = document.getElementById('intro-birth-month');
      const yearInp = document.getElementById('intro-birth-year');
      const provSel = document.getElementById('intro-province');
      const citySel = document.getElementById('intro-city');
      const distSel = document.getElementById('intro-district');
      const villSel = document.getElementById('intro-village');
      const eduSel = document.getElementById('intro-education-level');
      const confirmBtn = document.getElementById('btn-confirm-introduce');

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
          const highestEdu = eduSel.value;
          const timeline = calculateEducationTimeline(y, highestEdu);
          const selectedProv = provSel?.value || null;
          const selectedCity = citySel?.value || null;
          const selectedDist = distSel?.value || null;
          const selectedVill = villSel?.value || null;

          try {
            const sb = await (await import('./supabase.js?v=20261106_v154')).getSupabase();
            const updatePayload = {
              gender: selectedGender,
              birth_date: birthDate,
              education: highestEdu
            };
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
            if (selectedProv) session.province = selectedProv;
            if (selectedCity) session.city = selectedCity;
            if (selectedDist) session.district = selectedDist;
            if (selectedVill) session.village = selectedVill;
            sessionStorage.setItem('topscore_session', JSON.stringify(session));

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
        checkMicrophoneOnEntry();

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
        const sb = await (await import('./supabase.js?v=20261106_v154')).getSupabase();
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
        // Onboarding Step 1: Pop-up 01 ABOUT YOU (All-in-One: Gender + Birthday + Address + Education)
        await checkAndPromptIntroduce();
        // Onboarding Step 2: Pop-up 03 TAKE YOUR PHOTO (Webcam Snapshot Capture)
        await checkAndPromptPhoto();

        showLoading('Loading your dashboard…');

        const studentLvl = await fetchStudentLevel(session.student_id);
        if (studentLvl.level_id) {
          session.level_id = studentLvl.level_id;
          session.level_number = studentLvl.level_number;
          session.level_name = studentLvl.level_name;
          sessionStorage.setItem('topscore_session', JSON.stringify(session));

          // Explicitly update DOM header pill
          const elLvl = document.getElementById('meta-lvl');
          if (elLvl && studentLvl.level_name) {
            const formatted = studentLvl.level_name.toLowerCase().includes('level') ? studentLvl.level_name : studentLvl.level_name + ' Level';
            elLvl.textContent = formatted.toUpperCase();
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
            const isAlumni = session.level_number === 0 || (session.level_name || '').toLowerCase() === 'alumni';
            welcomeLevelEl.innerHTML = isAlumni ? `Alumni ${getSvgIcon('graduation-cap', 14)}` : (session.level_name.toLowerCase().includes('level') ? session.level_name : session.level_name + ' Level');
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
                title: 'Level Up!',
                text: `Congratulations! You have unlocked ${celebration}.`,
                icon: 'success',
                confirmButtonColor: '#6366f1'
              });
            } else {
              showToast(`Congratulations! You have unlocked ${celebration}.`, 'success');
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
            if (settings?.taskRepetitions) targetReps = Math.max(7, Number(settings.taskRepetitions) || 7);
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
          if (settings?.taskRepetitions) targetReps = Math.max(7, Number(settings.taskRepetitions) || 7);
          if (settings?.taskMinScore) minScore = Number(settings.taskMinScore) || 50;
        }
      } catch (_) {}

      const allTestsMap = Object.fromEntries((allTests || []).map(t => [t.id, t]));
      const bestMap = {};
      const passCountByTest = {};
      const isForgivenByTest = {};
      const isRemedialByTest = {};

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
        if (a.is_remedial_unlocked || a.is_remedial) {
          isRemedialByTest[aid] = true;
        }
        const st = (a.status || '').toLowerCase();
        if (st === 'submitted' || st === 'auto_submitted' || st === 'evaluated' || st === 'graded') {
          if (a.is_forgiven) {
            passCountByTest[aid] = Math.max(passCountByTest[aid] || 0, targetReps);
          } else {
            const tMin = Number(allTestsMap[aid]?.minimum_required_score) || Number(allTestsMap[aid]?.payload?.min_score) || minScore;
            if (pct >= tMin || (isRemedialByTest[aid] && pct >= 60)) {
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
          const req = Number(t.minimum_required_score) || Number(t.payload?.min_score) || 60;
          return score >= req || (isRemedialByTest[t.id] && score >= 60);
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
            <span class="next-test-icon next-asm-icon">${getSvgIcon('award', 16)}</span>
            <span class="next-test-title next-asm-title">All tests in this class completed!</span>
          </div>
          <span style="font-size:12px; font-weight:800; color:${TOPSCORE_COLORS.STAR}; padding:2px 8px; border-radius:4px; background:rgba(${TOPSCORE_COLORS.STAR_RGB},0.15);">✓ 100%</span>
        `;
        return;
      }

      const className = classMap[nextTest.class_id]?.name || 'Class Module';
      const isTest = isExam(nextTest);

      // Selected Icons: 1A (Solid Yellow Padlock), 2B (Red Rotate Undo), 3C (Green Circle Play), 4D (White Forward Arrow)
      const ICON_1A_YELLOW_LOCK = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M7 10V7a5 5 0 0 1 10 0v3" stroke="var(--grade-c)" stroke-width="2.6" stroke-linecap="round"/><rect x="4.5" y="10" width="15" height="11.5" rx="3" fill="var(--grade-c)" stroke="rgba(var(--grade-c-rgb),0.8)" stroke-width="1"/><circle cx="12" cy="14.8" r="1.5" fill="#713f12"/><path d="M12 15.5v2.2" stroke="#713f12" stroke-width="1.6" stroke-linecap="round"/></svg>';
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

      if (!rawClasses.length) {
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

          const isCompleted = dbCompleted || (classAssms.length > 0 && completedCount >= classAssms.length);
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

      let html = '';
      (activeClasses || []).forEach((c, idx) => {
        const isSelected = c.id === window._selectedClassId;
        const strokeColor = (isSelected && window._tierColor) ? window._tierColor : '#38bdf8';
        const iconSvg = getClassSvgIcon(c.name, 16, strokeColor);
        const pct = c._pct != null ? c._pct : 0;
        const activeStyle = (isSelected && window._tierColor)
          ? `style="border-color:${window._tierColor} !important; box-shadow:0 0 16px rgba(${window._tierRgb}, 0.45) !important;"`
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

      let html = '';
      (activeClasses || []).forEach(c => {
        const isSelected = c.id === (window._candidateClassId || window._selectedClassId);
        const iconSvg = getClassSvgIcon(c.name, 18, isSelected ? '#38bdf8' : '#94a3b8');
        const pct = c._pct != null ? c._pct : 0;
        const status = c._statusText || (pct > 0 ? `${pct}% Progress` : 'In Progress');
        const scoreColor = typeof getGradeColorByScore === 'function' ? getGradeColorByScore(pct) : '#38bdf8';
        const scoreText = pct === 100 ? '100% ★' : `${pct}%`;

        html += `
          <div class="classes-selector-item ${isSelected ? 'selected' : ''}" data-cid="${c.id}" role="button" tabindex="0">
            <div class="classes-selector-item-left">
              <div class="classes-selector-icon-wrap">
                ${iconSvg}
              </div>
              <div class="classes-selector-item-info">
                <div class="classes-selector-item-name">${escapeHtml(c.name)}</div>
                <div class="classes-selector-item-status">${escapeHtml(status)}</div>
              </div>
            </div>
            <div class="classes-selector-item-pct" style="color: ${scoreColor};">${scoreText}</div>
          </div>
        `;
      });
      listEl.innerHTML = html || '<div class="text-muted p-4 text-center">No active classes.</div>';

      const commitClassSelection = () => {
        const cid = window._candidateClassId || window._selectedClassId;
        if (cid) {
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
        }
        closeSelectorModal();
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
      const openSelectorModal = () => {
        window._candidateClassId = window._selectedClassId;
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

        if (badgeEl) badgeEl.textContent = data.badge || (data.isExam ? 'EXAM ASSESSMENT' : 'TOPIC ASSESSMENT');
        if (titleEl) titleEl.textContent = data.title || 'Topic Assessment';
        if (subtitleEl) subtitleEl.textContent = data.subtitle || 'Choose which part you want to work on:';

        const wordsCard = document.getElementById('component-opt-words');
        const wordsTitle = document.getElementById('component-words-title');
        const wordsBadge = document.getElementById('component-words-badge');
        const wordsStatus = document.getElementById('component-words-status');
        const wordsBestEl = document.getElementById('component-words-best');
        const wordsIconEl = document.getElementById('component-words-icon');

        const phrasesCard = document.getElementById('component-opt-phrases');
        const phrasesTitle = document.getElementById('component-phrases-title');
        const phrasesBadge = document.getElementById('component-phrases-badge');
        const phrasesStatus = document.getElementById('component-phrases-status');
        const phrasesBestEl = document.getElementById('component-phrases-best');
        const phrasesIconEl = document.getElementById('component-phrases-icon');

        const confirmBtn = document.getElementById('btn-confirm-component-selection');

        if (wordsIconEl) wordsIconEl.innerHTML = getSvgIcon('book-open', 18);
        if (phrasesIconEl) phrasesIconEl.innerHTML = getSvgIcon('message-square', 18);

        let selectedPart = data.wordsTestId ? 'words' : (data.phrasesTestId ? 'phrases' : null);

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
            if (selectedPart === 'words') {
              confirmBtn.innerHTML = `START ${data.isExam ? 'WORDS EXAM' : 'WORDS DRILL'} &rarr;`;
              confirmBtn.disabled = false;
            } else if (selectedPart === 'phrases') {
              confirmBtn.innerHTML = `START ${data.isExam ? 'PHRASES EXAM' : 'PHRASES DRILL'} &rarr;`;
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
            location.href = `test.html?test_id=${targetTestId}`;
          }
        };

        if (data.wordsTestId) {
          wordsCard.style.display = 'flex';
          if (wordsTitle) wordsTitle.textContent = data.isExam ? 'Words Exam' : 'Words Component';
          if (wordsBadge) {
            if (data.isExam) {
              wordsBadge.innerHTML = data.isRetake || !data.isLiveSession
                ? `${getSvgIcon('mic', 12)} Spoken Mode @ 15s`
                : '120 Questions (Written Mode)';
            } else {
              wordsBadge.textContent = '40 Questions (Speaking)';
            }
          }
          if (wordsStatus) {
            wordsStatus.textContent = data.isExam
              ? (data.wordsBest ? `Score: ${Number(data.wordsBest.percentage || 0).toFixed(0)}%` : 'Not Attempted')
              : `Progress: ${data.wordsPasses || 0}/7 Passes`;
          }
          if (wordsBestEl) {
            if (data.wordsBest) {
              const pct = Number(data.wordsBest.percentage || 0);
              const color = getGradeColorByScore(pct);
              const pts = Number(data.wordsBest.points_awarded ?? data.wordsBest.points ?? 0);
              wordsBestEl.innerHTML = `Best: <span style="color: ${color}; font-weight: 800;">${pct.toFixed(0)}% (${pts} PTS)</span>`;
            } else {
              wordsBestEl.innerHTML = 'Best: <span style="color: #64748b;">&mdash;</span>';
            }
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

        if (data.phrasesTestId) {
          phrasesCard.style.display = 'flex';
          if (phrasesTitle) phrasesTitle.textContent = data.isExam ? 'Phrases Exam' : 'Phrases Component';
          if (phrasesBadge) {
            if (data.isExam) {
              phrasesBadge.innerHTML = data.isRetake || !data.isLiveSession
                ? `${getSvgIcon('mic', 12)} Spoken Mode @ 20s`
                : '30 Questions (Selection Mode)';
            } else {
              phrasesBadge.textContent = '10 Questions (Speaking)';
            }
          }
          if (phrasesStatus) {
            phrasesStatus.textContent = data.isExam
              ? (data.phrasesBest ? `Score: ${Number(data.phrasesBest.percentage || 0).toFixed(0)}%` : 'Not Attempted')
              : `Progress: ${data.phrasesPasses || 0}/7 Passes`;
          }
          if (phrasesBestEl) {
            if (data.phrasesBest) {
              const pct = Number(data.phrasesBest.percentage || 0);
              const color = getGradeColorByScore(pct);
              const pts = Number(data.phrasesBest.points_awarded ?? data.phrasesBest.points ?? 0);
              phrasesBestEl.innerHTML = `Best: <span style="color: ${color}; font-weight: 800;">${pct.toFixed(0)}% (${pts} PTS)</span>`;
            } else {
              phrasesBestEl.innerHTML = 'Best: <span style="color: #64748b;">&mdash;</span>';
            }
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
      allAttempts.forEach(att => {
        const aid = att.test_id || att.Test_id;
        if (!aid) return;
        const pct = parseFloat(att.effective_score ?? att.percentage ?? 0);
        const st = (att.status || '').toUpperCase();
        const isRem = Boolean(att.is_remedial_unlocked || att.is_remedial);
        if (st === 'IN_PROGRESS') {
          inProgressByTest[aid] = att;
        } else if (st === 'SUBMITTED' || st === 'AUTO_SUBMITTED' || st === 'EVALUATED') {
          if (att.is_forgiven) {
            passCountByTest[aid] = Math.max(passCountByTest[aid] || 0, 7);
          } else {
            const asmMin = Number(tests.find(t => t.id === aid)?.minimum_required_score) || Number(tests.find(t => t.id === aid)?.payload?.min_score) || 70;
            if (pct >= asmMin || (isRem && pct >= 60)) {
              passCountByTest[aid] = (passCountByTest[aid] || 0) + 1;
            }
          }
        }
        // AGENTS.md §2.7: Report card stores strictly HIGHEST score across attempts
        const existingBestPct = bestByTest[aid] ? parseFloat(bestByTest[aid].effective_score ?? bestByTest[aid].percentage ?? 0) : -1;
        if (!bestByTest[aid] || pct > existingBestPct || (pct === existingBestPct && new Date(att.submitted_at || 0) > new Date(bestByTest[aid].submitted_at || 0)) || (att.is_forgiven && !bestByTest[aid])) {
          bestByTest[aid] = att;
        }
      });

      // Grade colors resolved via canonical getGradeColorByScore() from grading.js

      let cards = '';
      for (const asm of tests) {
        const bestAtt = bestByTest[asm.id];
        const inProgAtt = inProgressByTest[asm.id];
        const isRem = Boolean(bestAtt?.is_remedial_unlocked || bestAtt?.is_remedial);
        const isForgiven = Boolean(bestAtt?.is_forgiven);
        const rawBestPct = bestAtt ? parseFloat(bestAtt.percentage || 0) : null;
        const bestPct = isRem && rawBestPct !== null ? Math.min(rawBestPct, 60.0) : rawBestPct;
        const grade = bestPct !== null ? (isForgiven ? 'F' : (isRem ? 'R' : getGrade(bestPct))) : null;
        const gradeColor = bestPct !== null ? (isForgiven ? TOPSCORE_COLORS.E : (isRem ? TOPSCORE_COLORS.C : getGradeColorByScore(bestPct))) : 'var(--clr-text-1)';
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
                const peRawPct = peBest ? parseFloat(peBest.effective_score ?? peBest.percentage ?? 0) : null;
                const peRem = Boolean(peBest && (peBest.is_remedial_unlocked || peBest.is_remedial));
                const pePct = peRem && peRawPct !== null ? Math.min(peRawPct, 60.0) : peRawPct;
                const peMin = Number(pe.minimum_required_score) || Number(pe.pass_threshold) || Number(pe.payload?.min_score) || 60;
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
              const wRawPct = wBest ? parseFloat(wBest.effective_score ?? wBest.percentage ?? 0) : null;
              const wRem = Boolean(wBest && (wBest.is_remedial_unlocked || wBest.is_remedial));
              const wPct = wRem && wRawPct !== null ? Math.min(wRawPct, 60.0) : wRawPct;
              const wMin = Number(siblingWordsExam.minimum_required_score) || Number(siblingWordsExam.pass_threshold) || Number(siblingWordsExam.payload?.min_score) || 60;
              const wPassed = Boolean(wBest?.is_forgiven) || (wPct !== null && (wPct >= wMin || (wRem && wPct >= 60)));
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
            const prereqPct = prereqBest ? parseFloat(prereqBest.effective_score ?? prereqBest.percentage ?? 0) : null;
            const pMin = Number(asm.prerequisite_min_score) || Number(pObj?.minimum_required_score) || Number(pObj?.payload?.min_score) || 60;
            const isPrereqRem = Boolean(prereqBest && (prereqBest.is_remedial_unlocked || prereqBest.is_remedial));
            prereqMet = Boolean(prereqBest?.is_forgiven) || (prereqPct !== null && (prereqPct >= pMin || (isPrereqRem && prereqPct >= 60)));
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
          statusBadge = `<span class="badge" style="background:rgba(255,255,255,0.1);color:#a1a1aa;border:1px solid rgba(255,255,255,0.2);display:inline-flex;align-items:center;">${getSvgIcon('lock', 12)} Locked</span>`;
          actionBtn = `<div style="text-align:right;">
                         <span style="font-size:12px;color:var(--clr-text-3);">Complete <b>${escapeHtml(prereqTitle)}</b><br>to unlock.</span>
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

          const isEligibleForSelfPacedExam = Boolean(passed || bestAtt?.is_forgiven);

          if (isAsmTest) {
            // For formal Tests: Students who passed (>=60%) or are forgiven can retake 24/7 independently!
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
            const retakeBtnLabel = (bestAttPct === 100)
              ? 'Retake Drill'
              : (bestAtt?.is_forgiven)
                ? 'Retake Exam'
                : 'Retake';
            actionBtn = `<div style="display:flex;gap:6px;"><button class="btn btn-sm" style="background:rgba(255,255,255,0.05);border:1px solid var(--clr-border);padding:4px 8px;" data-aid-result="${bestAtt?.id}">View</button><button class="btn btn-sm btn-primary" style="padding:4px 8px;background:#0284c7;border-color:#0284c7;" data-aid="${asm.id}">${retakeBtnLabel}</button></div>`;
          } else if (isAsmTest && !passed && !isSessionUnlocked) {
            actionBtn = `<div style="display:flex;gap:6px;align-items:center;"><button class="btn btn-sm" style="background:rgba(255,255,255,0.05);border:1px solid var(--clr-border);padding:4px 8px;" data-aid-result="${bestAtt?.id}">View</button><span style="font-size:12px;color:${TOPSCORE_COLORS.D};font-weight:700;padding:3px 6px;border-radius:4px;background:rgba(${TOPSCORE_COLORS.D_RGB},0.1);border:1px solid rgba(${TOPSCORE_COLORS.D_RGB},0.25);display:inline-flex;align-items:center;">${getSvgIcon('lock', 12)} Locked</span></div>`;
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
                <span style="font-weight:700;font-size:16px;color:var(--clr-text-1);">${escapeHtml(asmTitle)}</span>
                ${className ? `<span class="badge badge-neutral" style="font-size:12px;">${escapeHtml(className)}</span>` : ''}
                <span class="badge" style="font-size:12px;background:rgba(255,255,255,0.06);color:var(--clr-text-3);border:1px solid var(--clr-border);">${escapeHtml(asmType)}</span>
              </div>
              <div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;">
                ${isTaskItem && taskProgressBadge ? taskProgressBadge : ''}
                <span style="font-size:12px;color:var(--clr-text-3);">&#9201; ${duration} min</span>
                ${qCount !== '—' ? `<span style="font-size:12px;color:var(--clr-text-3);">&#128203; ${qCount} Questions</span>` : ''}
                ${statusBadge}
              </div>
              ${!prereqMet && prereqTitle ? `<div style="margin-top:0.5rem;"><span style="font-size:12px;color:var(--grade-e);">\uD83D\uDD12 Complete prerequisite first: <em>${escapeHtml(prereqTitle)}</em></span></div>` : ''}
            </div>
            <div style="display:flex;align-items:center;gap:0.75rem;flex-shrink:0;">
              ${bestPct !== null ? `
                <div style="text-align:center;">
                  <div style="font-size:16px;font-weight:800;color:${gradeColor}${(grade === '★' || grade === 'S') ? `;text-shadow:0 0 10px rgba(${TOPSCORE_COLORS.STAR_RGB}, 0.45);` : ''}">${bestPct.toFixed(0)}%</div>
                  <div style="font-size:12px;color:var(--clr-text-3);">Best Score</div>
                </div>
                ${(grade === '★' || grade === 'S' || (bestPct >= 100 && !isRem && !isForgiven))
                  ? `<div class="grade-star" style="width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;box-shadow:0 0 12px rgba(${TOPSCORE_COLORS.STAR_RGB}, 0.45);color:${TOPSCORE_COLORS.STAR};border:1.5px solid ${TOPSCORE_COLORS.STAR};">★</div>`
                  : `<div style="width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;border:2px solid ${gradeColor};color:${gradeColor};">${getGradeSymbol(grade)}</div>`
                }
              ` : ''}
              ${actionBtn}
            </div>
          </div>
        `;
      }

      section.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
          <h3 style="font-size:16px;font-weight:700;color:var(--clr-text-1);margin:0;">\uD83D\uDCCB Assigned Tests <span style="font-size:12px;color:var(--clr-text-3);font-weight:400;margin-left:8px;">${tests.length} total</span></h3>
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

        const rawPct = parseFloat(att.effective_score != null ? att.effective_score : (att.percentage || 0));
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
          color: TOPSCORE_COLORS.STAR, dark: '#be185d', light: '#f472b6', rgb: TOPSCORE_COLORS.STAR_RGB, glow: `rgba(${TOPSCORE_COLORS.STAR_RGB}, 0.45)`
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
            <svg class="pure-star-svg" width="46" height="46" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 0 14px rgba(${TOPSCORE_COLORS.STAR_RGB}, 0.95)) drop-shadow(0 0 24px rgba(${TOPSCORE_COLORS.STAR_RGB}, 0.55)); display:inline-block; vertical-align:middle;">
              <defs>
                <linearGradient id="starDashGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="${TOPSCORE_COLORS.STAR}" />
                  <stop offset="100%" stop-color="#be185d" />
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
          avatarBox.style.background = `linear-gradient(135deg, ${TOPSCORE_COLORS.STAR} 0%, #be185d 100%)`;
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
        const rawPct = parseFloat(att.effective_score != null ? att.effective_score : (att.percentage || 0));
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
            <p style="color:var(--clr-text-3); font-size:12px; margin:0;">No completed tests yet.</p>
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

          const remSup = best.isRem ? '<sup class="asm-rem-sup" style="color:var(--grade-c);font-size:0.65em;font-weight:800;margin-left:1px;">R</sup>' : '';
          scoreHtml = `<span style="color:${scoreColor} !important; font-weight:800;">${best.effPct.toFixed(0)}%${remSup}</span>`;

          const dispGrade = typeof getGradeSymbol === 'function' ? getGradeSymbol(best.grade, best.effPct, best.isRem) : best.grade;
          const isStar = dispGrade === '★' || dispGrade === 'S';
          const textColor = isStar ? TOPSCORE_COLORS.TEXT_STAR : TOPSCORE_COLORS.TEXT_DARK;
          gradeHtml = `<span class="grade-circle grade-circle-${String(dispGrade).toLowerCase()}" style="background:${scoreColor} !important; color:${textColor} !important; width:24px; height:24px; font-size:12px; display:inline-flex; align-items:center; justify-content:center; border-radius:50%; font-weight:800; box-shadow: 0 0 8px rgba(${scoreRgb}, 0.4) !important;">${dispGrade}</span>`;

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

            scoreHtml = `<span style="color:${scoreColor}; font-weight:800;">${taskAvgPct}%</span>`;

            const dispGrade = typeof getGradeSymbol === 'function' ? getGradeSymbol(taskAvgGrade, taskAvgPct, best?.isRem) : taskAvgGrade;
            const isStar = dispGrade === '★' || dispGrade === 'S';
            const textColor = isStar ? TOPSCORE_COLORS.TEXT_STAR : TOPSCORE_COLORS.TEXT_DARK;
            gradeHtml = `<span class="grade-circle grade-circle-${String(dispGrade).toLowerCase()}" style="background:${scoreColor}; color:${textColor}; width:24px; height:24px; font-size:12px; display:inline-flex; align-items:center; justify-content:center; border-radius:50%; font-weight:800;">${dispGrade}</span>`;
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
            <p style="color:#94a3b8; font-size:12px;">No batch assigned to this account.</p>
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
              <p style="color:#94a3b8; font-size:12px;">No active students found in this batch.</p>
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
            champNameEl.innerHTML = `${getSvgIcon('crown', 14)} ${escapeHtml(titleStr)} (${champion.totalPoints} PTS • ${champion.overallScore}%)`;
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
                <span style="color:${hasExam && typeof getGradeColorByScore === 'function' ? getGradeColorByScore(st.overallScore) : (hasExam ? theme.color : '#94a3b8')}; font-weight:800; font-size:16px; font-variant-numeric:tabular-nums;">
                  ${st.totalPoints}
                </span>
              </div>
              <div class="th-col th-grade" style="display:flex; align-items:center; justify-content:center;">
                <div class="leaderboard-grade-chip" style="background:${hasExam ? theme.color : 'rgba(255,255,255,0.12)'}; width:22px; height:22px; border-radius:6px; font-size:12px; font-weight:800; display:flex; align-items:center; justify-content:center; color:${hasExam && (gradeSymbol === '★' || gradeSymbol === 'Star') ? TOPSCORE_COLORS.TEXT_STAR : (hasExam ? TOPSCORE_COLORS.TEXT_DARK : '#ffffff')} !important;" title="${hasExam ? `Average: ${st.overallScore}%` : 'No exams completed yet'}">${gradeSymbol}</div>
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
      const heroDobAgeEl = document.getElementById('prof-hero-dob-age');
      const eduTitleEl = document.getElementById('prof-edu-title');
      const age = calculateAgeFromDob(dobVal);
      if (ageDisplay) {
        ageDisplay.textContent = age !== null ? `(${age} yrs)` : '(—)';
      }
      if (heroDobAgeEl) {
        if (dobVal) {
          const parts = dobVal.split('-');
          if (parts.length === 3) {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const mIdx = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);
            const yr = parts[0];
            const mName = months[mIdx] || '';
            heroDobAgeEl.textContent = `${day} ${mName} ${yr} (${age} yo)`;
          } else {
            heroDobAgeEl.textContent = `${dobVal} (${age} yo)`;
          }
        } else {
          heroDobAgeEl.textContent = '—';
        }
      }
      const { recommended: autoEduTier } = typeof getEducationEligibility === 'function' ? getEducationEligibility(age) : { recommended: 'senior_high' };
      const tierObj = (typeof ALL_EDUCATION_LEVELS !== 'undefined' ? ALL_EDUCATION_LEVELS : []).find(e => e.value === autoEduTier);
      const formalEduLabel = tierObj ? tierObj.label : 'Senior High School (SMA/SMK)';
      if (eduTitleEl) {
        eduTitleEl.textContent = formalEduLabel;
      }
      return { age, autoEduTier, formalEduLabel };
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

      // Update Pure Info Table display (Village -> District -> Regency -> Province)
      const infoVill = document.getElementById('prof-info-village');
      if (infoVill) infoVill.textContent = (typeof formatVillageName === 'function' ? formatVillageName(vill) : vill) || '—';
      const infoDist = document.getElementById('prof-info-district');
      if (infoDist) infoDist.textContent = (typeof formatDistrictName === 'function' ? formatDistrictName(dist) : dist) || '—';
      const infoCity = document.getElementById('prof-info-city');
      if (infoCity) infoCity.textContent = (typeof formatCityDistrict === 'function' ? formatCityDistrict(city) : city) || '—';
      const infoProv = document.getElementById('prof-info-province');
      if (infoProv) infoProv.textContent = (typeof formatProvinceName === 'function' ? formatProvinceName(prov) : prov) || '—';

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
      const closeBtn = document.getElementById('close-profile-modal');

      const currentGender = session.gender || 'male';
      const cleanName = cleanStudentName(session.student_name || 'Student');
      const prefix = currentGender === 'female' ? 'Miss ' : 'Mr. ';

      const nameEl = document.getElementById('prof-student-name');
      if (nameEl) nameEl.textContent = `${prefix}${cleanName}`;

      // Synchronize Organization Metadata: Institution • Program • Batch
      const instName = (session.institution_name && session.institution_name !== 'undefined') ? session.institution_name : 'TopsCore Academy';
      const progName = (session.program_name && session.program_name !== 'undefined') ? session.program_name : 'Program';
      const batchName = (session.batch_name && session.batch_name !== 'undefined') ? session.batch_name : 'Batch';

      const orgMetaEl = document.getElementById('prof-org-meta');
      if (orgMetaEl) {
        orgMetaEl.textContent = `${instName} • ${progName} • ${batchName}`;
      }

      const progEl = document.getElementById('prof-student-prog');
      if (progEl) progEl.textContent = instName;
      const classEl = document.getElementById('prof-student-class');
      if (classEl) classEl.textContent = progName;
      const batchEl = document.getElementById('prof-student-batch');
      if (batchEl) batchEl.textContent = batchName;

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
        titleTextEl.textContent = currentGender === 'female' ? 'Miss' : 'Mr.';
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
          const sb = await (await import('./supabase.js?v=20261106_v154')).getSupabase();
          const { data: st } = await sb.from('students').select('photo_url, birth_date, education, gender, province, city, district, village, updated_at').eq('id', session.student_id).maybeSingle();
          if (st?.photo_url) {
            applyPhotoEverywhere(st.photo_url);
          } else {
            clearPhotoEverywhere();
          }

          // Read-only Gender / Title in CV
          const activeGender = st?.gender || session.gender || 'male';
          const titleTextEl = document.getElementById('prof-title-text');
          if (titleTextEl) {
            titleTextEl.textContent = activeGender === 'female' ? 'Miss' : 'Mr.';
          }
          const genderTextEl = document.getElementById('prof-gender-text');
          if (genderTextEl) {
            genderTextEl.textContent = activeGender === 'female' ? 'Female (Miss)' : 'Male (Mr.)';
          }
          const nameEl = document.getElementById('prof-student-name');
          if (nameEl) {
            const p = activeGender === 'female' ? 'Miss ' : 'Mr. ';
            nameEl.textContent = `${p}${cleanStudentName(session.student_name || 'Student')}`;
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
        if (changePinModal) changePinModal.classList.remove('hidden');
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
              const saveBtn = document.getElementById('save-pin-btn');
              if (saveBtn) saveBtn.click();
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

          if (newPin.length < 4) {
            showToast('PIN baru minimal 4 digit.', 'warning');
            return;
          }
          if (newPin !== confirmPin) {
            showToast('Konfirmasi PIN tidak cocok.', 'warning');
            return;
          }

          showLoading('Memperbarui PIN…');
          try {
            await changePin(session.student_id, oldPin, newPin);
            hideLoading();
            showToast('PIN berhasil diperbarui!', 'success');
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
            const sb = await (await import('./supabase.js?v=20261106_v154')).getSupabase();
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

        modal.classList.remove('hidden');
        try { window.location.hash = '#profile'; } catch (_) {}
      };

      openBtn.addEventListener('click', openProfile);

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

              modal.classList.add('hidden');
              if (window.location.hash.startsWith('#profile') || window.location.hash === '#history') {
                try { history.replaceState(null, '', window.location.pathname + window.location.search); } catch (_) {}
              }
            }
          });
          return;
        }
        window.isProfileDirty = false;
        if(changePinForm) changePinForm.reset();
        modal.classList.add('hidden');
        if (window.location.hash.startsWith('#profile') || window.location.hash === '#history') {
          try { history.replaceState(null, '', window.location.pathname + window.location.search); } catch (_) {}
        }
      };

      closeBtn.addEventListener('click', closeProfile);
      const footerCloseBtn = document.getElementById('btn-close-profile-modal-footer');
      if (footerCloseBtn && !footerCloseBtn._hasClickListener) {
        footerCloseBtn._hasClickListener = true;
        footerCloseBtn.addEventListener('click', closeProfile);
      }
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
      confirmText = 'Log Out',
      cancelText = 'Cancel',
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
        icon: getSvgIcon('arrow-right', 28),
        title: 'LOG OUT SESSION',
        message: 'Are you sure you want to sign out of your learning session?',
        confirmText: 'Log Out',
        cancelText: 'Stay Here',
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
